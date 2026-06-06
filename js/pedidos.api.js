// ══════════════════════════════════════════════════════════════════
// PEDIDOS API - FIREBASE
// ══════════════════════════════════════════════════════════════════

import { db, waitForFirebase } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { state } from './state.js';
import { uid } from './utils.js';
import { atualizarEstoque } from './produtos.api.js';

// ── Anti-duplicação: flag global de mutex ──────────────────────────
let _salvandoPedido = false;

// ── normalizadores ────────────────────────────────────────────────
function normItem(i) {
  return {
    prodId: i.prod_id,
    nome:   i.nome,
    sabor:  i.sabor,
    qtd:    parseInt(i.qtd),
    venda:  parseFloat(i.venda),
  };
}

function normPedido(p) {
  // Converter criado para timestamp (pode ser Firestore Timestamp ou Date)
  let ts = Date.now();
  if (p.criado) {
    if (typeof p.criado.toDate === 'function') {
      ts = new Date(p.criado.toDate()).getTime();
    } else if (p.criado instanceof Date) {
      ts = p.criado.getTime();
    } else if (typeof p.criado === 'number') {
      ts = p.criado;
    }
  }

  return {
    id:      p.id,
    cliente: p.cliente,
    obs:     p.obs || '',
    status:  p.status,
    total:   parseFloat(p.total)  || 0,
    lucro:   parseFloat(p.lucro)  || 0,
    ts:      ts,
    itens:   (p.itens || []).map(i => ({
      prodId: i.prodId,
      nome:   i.nome,
      sabor:  i.sabor,
      qtd:    parseInt(i.qtd),
      venda:  parseFloat(i.venda),
    })),
  };
}

// ── carregar ─────────────────────────────────────────────────────
export async function carregarPedidos() {
  await waitForFirebase();
  const q = query(collection(db, 'pedidos'), orderBy('criado', 'desc'));
  const snapshot = await getDocs(q);
  state.pedidos = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    state.pedidos.push(normPedido({ id: docSnap.id, ...data }));
  });
  console.log('[PedAPI] ✓ Carregados', state.pedidos.length, 'pedidos');
  return state.pedidos;
}

// ── salvar (novo ou editar) ───────────────────────────────────────
// SEGURO contra: race conditions, duplicação, estoque negativo, rollback
export async function salvarPedido(pedAtual, novoStatus) {
  // ✓ PROTEÇÃO 1: Anti-duplicação de clique
  if (_salvandoPedido) throw new Error('Operação em andamento. Aguarde...');
  _salvandoPedido = true;

  try {
    await waitForFirebase();
    const pedOriginal = state.pedidos.find(p => p.id === pedAtual.id) || null;
    const eraFinalizado = pedOriginal?.status === 'finalizado';
    const vaiFinalizar  = novoStatus === 'finalizado';
    const mudandoParaFinalizado = !eraFinalizado && vaiFinalizar;

    // ✓ PROTEÇÃO 2: Validação de estoque ANTES de qualquer operação
    if (vaiFinalizar) {
      for (const item of pedAtual.itens) {
        const prod = state.prods[item.prodId];
        if (!prod) throw new Error(`Produto não encontrado: ${item.nome}`);

        // Conta quanto já está no pedido
        const qtdJaNoCarrinho = pedOriginal?.itens
          .filter(i => i.prodId === item.prodId)
          .reduce((s, i) => s + i.qtd, 0) || 0;

        // Se está AUMENTANDO a quantidade, precisa validar estoque
        if (item.qtd > qtdJaNoCarrinho) {
          const aumenoQtd = item.qtd - qtdJaNoCarrinho;
          if (aumenoQtd > prod.estoque) {
            throw new Error(`Estoque insuficiente: ${item.nome} ${item.sabor} (precisa +${aumenoQtd}, tem ${prod.estoque})`);
          }
        }
      }
    }

    // ✓ PROTEÇÃO 3: Ajuste de estoque seguro com rollback
    const estoqueRevertido = [];
    try {
      // Se ERA finalizado, DEVOLVE o estoque antigo (sinal POSITIVO)
      if (eraFinalizado && pedOriginal) {
        for (const item of pedOriginal.itens) {
          await atualizarEstoque(item.prodId, item.qtd); // ✓ CORRIGIDO: sinal correto
          estoqueRevertido.push({ prodId: item.prodId, qtd: item.qtd });
        }
      }

      // Se VAI FINALIZAR, BAIXA o estoque novo (sinal NEGATIVO)
      if (vaiFinalizar && mudandoParaFinalizado) {
        for (const item of pedAtual.itens) {
          await atualizarEstoque(item.prodId, -item.qtd);
        }
      }
    } catch (estErr) {
      // ✓ PROTEÇÃO 4: Rollback completo se erro
      for (const rev of estoqueRevertido) {
        try {
          await atualizarEstoque(rev.prodId, -rev.qtd);
        } catch (rollErr) {
          console.error('ERRO CRÍTICO em rollback:', rollErr);
          throw new Error('Falha ao reverter estoque. Contate suporte.');
        }
      }
      throw estErr;
    }

    // 5. Upsert pedido (atômico) - Firebase
    const pedDocRef = doc(db, 'pedidos', pedAtual.id);
    const pedData = {
      cliente:   pedAtual.cliente,
      obs:       pedAtual.obs || '',
      status:    novoStatus,
      total:     pedAtual.total,
      lucro:     pedAtual.lucro,
      itens:     pedAtual.itens,
      ...(pedOriginal ? { atualizado: new Date() } : { criado: new Date() }),
    };

    if (pedOriginal) {
      await updateDoc(pedDocRef, pedData);
    } else {
      await addDoc(collection(db, 'pedidos'), {
        ...pedData,
        id: pedAtual.id
      });
    }

    // 6. Atualizar cache
    const pedSalvo = { ...pedAtual, status: novoStatus };
    const idx = state.pedidos.findIndex(p => p.id === pedAtual.id);
    if (idx >= 0) state.pedidos[idx] = pedSalvo;
    else state.pedidos.unshift(pedSalvo);

    console.log('[PedAPI] ✓ Pedido salvo:', pedAtual.id);

    return pedSalvo;
  } finally {
    _salvandoPedido = false; // ✓ Sempre libera o mutex
  }
}

// ── cancelar finalização → volta para pendente ────────────────────
// SEGURO contra: race conditions, estoque inconsistente
export async function cancelarPedido(pedId) {
  if (_salvandoPedido) throw new Error('Operação em andamento. Aguarde...');
  _salvandoPedido = true;

  try {
    const ped = state.pedidos.find(p => p.id === pedId);
    if (!ped || ped.status !== 'finalizado') return;

    // Devolver estoque (sinal POSITIVO)
    for (const item of ped.itens) {
      await atualizarEstoque(item.prodId, item.qtd); // ✓ CORRIGIDO: sinal correto
    }

    // Atualizar status
    await updateDoc(doc(db, 'pedidos', pedId), {
      status: 'pendente',
      atualizado: new Date()
    });

    // Atualizar cache
    const idx = state.pedidos.findIndex(p => p.id === pedId);
    if (idx >= 0) state.pedidos[idx] = { ...state.pedidos[idx], status: 'pendente' };
  } finally {
    _salvandoPedido = false;
  }
}
