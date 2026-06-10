// ══════════════════════════════════════════════════════════════════
// PEDIDOS API - FIREBASE
// ══════════════════════════════════════════════════════════════════

import { db, waitForFirebase } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { state } from './state.js';
import { uid } from './utils.js';
import { atualizarEstoque } from './produtos.api.js';

// ── Anti-duplicação: flag global de mutex ──────────────────────────
let _salvandoPedido = false;

// ── normalizadores ────────────────────────────────────────────────
function normPedido(p) {
  if (!p) return null;

  let ts = Date.now();
  try {
    if (p.criado) {
      if (typeof p.criado.toDate === 'function') {
        ts = new Date(p.criado.toDate()).getTime();
      } else if (p.criado instanceof Date) {
        ts = p.criado.getTime();
      } else if (typeof p.criado === 'number') {
        ts = p.criado;
      }
    }
  } catch (err) {
    console.warn('[PedAPI] Erro ao converter data:', err);
  }

  return {
    id:              p.id || '',
    cliente:         p.cliente || '',
    obs:             p.obs || '',
    status:          p.status || 'pendente',
    pagamentoStatus: p.pagamentoStatus || 'em_aberto',
    numeroPedido:    p.numeroPedido || null,
    total:           parseFloat(p.total) || 0,
    lucro:           parseFloat(p.lucro) || 0,
    ts:              ts,
    itens:           (p.itens || []).map(i => ({
      prodId: i.prodId || '',
      nome:   i.nome || '',
      sabor:  i.sabor || '',
      qtd:    parseInt(i.qtd) || 0,
      venda:  parseFloat(i.venda) || 0,
    })),
  };
}

// Retorna o próximo número de pedido (max existente + 1)
function proximoNumeroPedido() {
  const max = state.pedidos.reduce((m, p) => Math.max(m, p.numeroPedido || 0), 0);
  return max + 1;
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
export async function salvarPedido(pedAtual, novoStatus) {
  if (_salvandoPedido) throw new Error('Operação em andamento. Aguarde...');
  _salvandoPedido = true;

  try {
    await waitForFirebase();
    const pedOriginal = state.pedidos.find(p => p.id === pedAtual.id) || null;
    const eraFinalizado = pedOriginal?.status === 'finalizado';
    const vaiFinalizar  = novoStatus === 'finalizado';
    const mudandoParaFinalizado = !eraFinalizado && vaiFinalizar;

    // Validação de estoque ANTES de qualquer operação
    if (vaiFinalizar) {
      for (const item of pedAtual.itens) {
        const prod = state.prods[item.prodId];
        if (!prod) throw new Error(`Produto não encontrado: ${item.nome}`);

        const qtdJaNoCarrinho = pedOriginal?.itens
          .filter(i => i.prodId === item.prodId)
          .reduce((s, i) => s + i.qtd, 0) || 0;

        if (item.qtd > qtdJaNoCarrinho) {
          const aumentoQtd = item.qtd - qtdJaNoCarrinho;
          if (aumentoQtd > prod.estoque) {
            throw new Error(`Estoque insuficiente: ${item.nome} ${item.sabor} (precisa +${aumentoQtd}, tem ${prod.estoque})`);
          }
        }
      }
    }

    // Ajuste de estoque com rollback
    const estoqueRevertido = [];
    try {
      if (eraFinalizado && pedOriginal) {
        for (const item of pedOriginal.itens) {
          await atualizarEstoque(item.prodId, item.qtd);
          estoqueRevertido.push({ prodId: item.prodId, qtd: item.qtd });
        }
      }
      if (vaiFinalizar && mudandoParaFinalizado) {
        for (const item of pedAtual.itens) {
          await atualizarEstoque(item.prodId, -item.qtd);
        }
      }
    } catch (estErr) {
      for (const rev of estoqueRevertido) {
        try { await atualizarEstoque(rev.prodId, -rev.qtd); } catch (rollErr) {
          console.error('ERRO CRÍTICO em rollback:', rollErr);
          throw new Error('Falha ao reverter estoque. Contate suporte.');
        }
      }
      throw estErr;
    }

    // Número do pedido: usa existente ou gera novo
    const numeroPedido = pedAtual.numeroPedido
      || pedOriginal?.numeroPedido
      || proximoNumeroPedido();

    const pedDocRef = doc(db, 'pedidos', pedAtual.id);
    const pedData = {
      cliente:         pedAtual.cliente,
      obs:             pedAtual.obs || '',
      status:          novoStatus,
      pagamentoStatus: pedAtual.pagamentoStatus || 'em_aberto',
      numeroPedido:    numeroPedido,
      total:           pedAtual.total,
      lucro:           pedAtual.lucro,
      itens:           pedAtual.itens,
      ...(pedOriginal ? { atualizado: new Date() } : { criado: new Date() }),
    };

    if (pedOriginal) {
      await updateDoc(pedDocRef, pedData);
    } else {
      const docRef = await addDoc(collection(db, 'pedidos'), pedData);
      pedAtual.id = docRef.id;
    }

    const pedSalvo = { ...pedAtual, status: novoStatus, numeroPedido };
    const idx = state.pedidos.findIndex(p => p.id === pedAtual.id);
    if (idx >= 0) state.pedidos[idx] = pedSalvo;
    else state.pedidos.unshift(pedSalvo);

    console.log('[PedAPI] ✓ Pedido salvo:', pedAtual.id, 'num:', numeroPedido);
    return pedSalvo;
  } finally {
    _salvandoPedido = false;
  }
}

// ── cancelar finalização → volta para pendente ────────────────────
export async function cancelarPedido(pedId) {
  if (_salvandoPedido) throw new Error('Operação em andamento. Aguarde...');
  _salvandoPedido = true;

  try {
    const ped = state.pedidos.find(p => p.id === pedId);
    if (!ped || ped.status !== 'finalizado') return;

    for (const item of ped.itens) {
      await atualizarEstoque(item.prodId, item.qtd);
    }

    await updateDoc(doc(db, 'pedidos', pedId), {
      status: 'pendente',
      atualizado: new Date()
    });

    const idx = state.pedidos.findIndex(p => p.id === pedId);
    if (idx >= 0) state.pedidos[idx] = { ...state.pedidos[idx], status: 'pendente' };
  } finally {
    _salvandoPedido = false;
  }
}

// ── toggle de pagamento (em_aberto ↔ pago) ────────────────────────
export async function togglePagamento(pedId) {
  await waitForFirebase();
  const ped = state.pedidos.find(p => p.id === pedId);
  if (!ped) throw new Error('Pedido não encontrado');

  const novoStatus = (ped.pagamentoStatus || 'em_aberto') === 'pago' ? 'em_aberto' : 'pago';
  await updateDoc(doc(db, 'pedidos', pedId), {
    pagamentoStatus: novoStatus,
    atualizado: new Date()
  });

  const idx = state.pedidos.findIndex(p => p.id === pedId);
  if (idx >= 0) state.pedidos[idx] = { ...state.pedidos[idx], pagamentoStatus: novoStatus };

  console.log('[PedAPI] ✓ Pagamento atualizado:', pedId, novoStatus);
  return novoStatus;
}

// ── excluir pedido (devolve estoque se finalizado) ────────────────
export async function excluirPedido(pedId) {
  await waitForFirebase();
  const ped = state.pedidos.find(p => p.id === pedId);
  if (!ped) return;

  // Se finalizado, devolve estoque antes de apagar
  if (ped.status === 'finalizado') {
    for (const item of ped.itens) {
      try { await atualizarEstoque(item.prodId, item.qtd); } catch (e) {
        console.warn('[PedAPI] Erro ao devolver estoque em excluirPedido:', e);
      }
    }
  }

  await deleteDoc(doc(db, 'pedidos', pedId));
  state.pedidos = state.pedidos.filter(p => p.id !== pedId);
  console.log('[PedAPI] ✓ Pedido excluído:', pedId);
}
