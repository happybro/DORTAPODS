// ══════════════════════════════════════════════════════════════════
// PRODUTOS API - FIREBASE
// ══════════════════════════════════════════════════════════════════

import { db, waitForFirebase } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { state } from './state.js';
import { uid, sanitize } from './utils.js';

// ── normalização: doc do banco → objeto usado no app ────────────
function norm(p) {
  if (!p) {
    console.warn('[ProdAPI] Tentativa de normalizar documento null/undefined');
    return null;
  }

  // Converter criado para timestamp (pode ser Firestore Timestamp ou Date)
  let criado = Date.now();
  try {
    if (p.criado) {
      if (typeof p.criado.toDate === 'function') {
        criado = new Date(p.criado.toDate()).getTime();
      } else if (p.criado instanceof Date) {
        criado = p.criado.getTime();
      } else if (typeof p.criado === 'number') {
        criado = p.criado;
      }
    }
  } catch (dateErr) {
    console.warn('[ProdAPI] Erro ao converter data:', dateErr);
    // Mantém Date.now() como fallback
  }

  return {
    id:      p.id || '',
    nome:    p.nome || 'Sem nome',
    sabor:   p.sabor || 'Sem sabor',
    compra:  parseFloat(p.compra) || 0,
    venda:   parseFloat(p.venda) || 0,
    estoque: parseInt(p.estoque) || 0,
    criado:  criado,
  };
}

export async function carregarProdutos() {
  try {
    await waitForFirebase();
    // Sem orderBy composto = sem necessidade de índice no Firestore
    const snapshot = await getDocs(collection(db, 'produtos'));
    const lista = [];
    snapshot.forEach(docSnap => {
      try {
        const p = norm({ id: docSnap.id, ...docSnap.data() });
        if (p) lista.push(p);
      } catch (normErr) {
        console.error('[ProdAPI] Erro ao normalizar:', docSnap.id, normErr);
      }
    });
    // Ordenar no JS (sem índice composto necessário)
    lista.sort((a, b) => a.nome.localeCompare(b.nome) || a.sabor.localeCompare(b.sabor));
    state.prods = {};
    lista.forEach(p => { state.prods[p.id] = p; });
    console.log('[ProdAPI] ✓ Carregados', Object.keys(state.prods).length, 'produtos');
    return state.prods;
  } catch (error) {
    console.error('[ProdAPI] ERRO ao carregar:', error);
    throw error;
  }
}

export async function salvarProduto({ id, nome, sabor, compra, venda }) {
  try {
    await waitForFirebase();
    const isNovo = !id || !state.prods[id];
    const prodId = isNovo ? uid() : id;

    const dados = {
      nome:   sanitize(nome),
      sabor:  sanitize(sabor),
      compra: parseFloat(compra) || 0,
      venda:  parseFloat(venda)  || 0,
      ...(isNovo && {
        estoque:   0,
        criado: new Date(),
      }),
      atualizado: new Date()
    };

    if (isNovo) {
      const docRef = await addDoc(collection(db, 'produtos'), dados);
      state.prods[docRef.id] = norm({ id: docRef.id, ...dados });
      console.log('[ProdAPI] ✓ Produto criado:', docRef.id);
      return state.prods[docRef.id];
    } else {
      await updateDoc(doc(db, 'produtos', prodId), dados);
      state.prods[prodId] = norm({ id: prodId, ...state.prods[prodId], ...dados });
      console.log('[ProdAPI] ✓ Produto atualizado:', prodId);
      return state.prods[prodId];
    }
  } catch (error) {
    console.error('[ProdAPI] Erro ao salvar:', error);
    throw error;
  }
}

export async function excluirProduto(id) {
  try {
    await waitForFirebase();
    await deleteDoc(doc(db, 'produtos', id));
    delete state.prods[id];
    console.log('[ProdAPI] ✓ Produto deletado:', id);
  } catch (error) {
    console.error('[ProdAPI] Erro ao excluir:', error);
    throw error;
  }
}

// Atualizar estoque com proteção contra race conditions
export async function atualizarEstoque(id, delta) {
  try {
    const docRef = doc(db, 'produtos', id);

    // Verificar estoque suficiente antes de atualizar
    const currentProd = state.prods[id];
    if (!currentProd) throw new Error('Produto não encontrado');

    const novoEstoque = currentProd.estoque + delta;
    if (novoEstoque < 0) {
      throw new Error(`Estoque insuficiente. Disponível: ${currentProd.estoque}`);
    }

    // Atualizar estoque e data
    await updateDoc(docRef, {
      estoque: novoEstoque,
      atualizado: new Date()
    });

    // Atualizar state local
    state.prods[id].estoque = novoEstoque;
    console.log(`[ProdAPI] ✓ Estoque atualizado: ${id} (${delta > 0 ? '+' : ''}${delta})`);

    return state.prods[id];
  } catch (error) {
    console.error('[ProdAPI] Erro ao atualizar estoque:', error);
    throw error;
  }
}
