// ══════════════════════════════════════════════════════════════════
// ENTRADAS API - FIREBASE
// ══════════════════════════════════════════════════════════════════

import { db, waitForFirebase } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, deleteDoc, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { state } from './state.js';
import { uid } from './utils.js';
import { atualizarEstoque } from './produtos.api.js';

// ── Anti-duplicação: flag global de mutex ──────────────────────────
let _registrandoEntrada = false;

function norm(e) {
  // Converter criado para timestamp (pode ser Firestore Timestamp ou Date)
  let ts = Date.now();
  if (e.criado) {
    if (typeof e.criado.toDate === 'function') {
      ts = new Date(e.criado.toDate()).getTime();
    } else if (e.criado instanceof Date) {
      ts = e.criado.getTime();
    } else if (typeof e.criado === 'number') {
      ts = e.criado;
    }
  }

  return {
    id:     e.id,
    prodId: e.prodId,
    nome:   e.nome,
    qtd:    parseInt(e.qtd),
    custo:  parseFloat(e.valor_compra) || 0,
    ts:     ts,
  };
}

export async function carregarEntradas() {
  await waitForFirebase();
  const q = query(collection(db, 'entradas'), orderBy('criado', 'desc'), limit(150));
  const snapshot = await getDocs(q);
  state.entradas = [];
  snapshot.forEach(docSnap => {
    state.entradas.push(norm({ id: docSnap.id, ...docSnap.data() }));
  });
  console.log('[EntAPI] ✓ Carregadas', state.entradas.length, 'entradas');
  return state.entradas;
}

// ── registrar entrada (novo estoque) ────────────────────────────────
// SEGURO contra: race conditions, duplicação, estoque inconsistente
export async function registrarEntrada({ prodId, nome, qtd, custo }) {
  // ✓ PROTEÇÃO 1: Anti-duplicação de clique
  if (_registrandoEntrada) throw new Error('Operação em andamento. Aguarde...');
  _registrandoEntrada = true;

  try {
    await waitForFirebase();
    // ✓ PROTEÇÃO 2: Validação upfront (produto existe)
    const prod = state.prods[prodId];
    if (!prod) throw new Error(`Produto não encontrado: ${nome}`);

    // ✓ PROTEÇÃO 3: Validação de quantidade
    const qtdInt = parseInt(qtd);
    if (qtdInt <= 0) throw new Error('Quantidade deve ser maior que zero');
    if (!Number.isFinite(qtdInt)) throw new Error('Quantidade inválida');

    const entradaId = uid();

    // 1. Inserir entrada (registro de compra)
    const entradaDocRef = await addDoc(collection(db, 'entradas'), {
      prodId:       prodId,
      nome:         nome,
      qtd:          qtdInt,
      valor_compra: parseFloat(custo) || 0,
      criado:       new Date()
    });

    const entradaRow = { id: entradaDocRef.id, prodId, nome, qtd: qtdInt, valor_compra: parseFloat(custo) || 0 };

    // 2. Atualizar estoque (com proteção no codigo)
    try {
      await atualizarEstoque(prodId, qtdInt);
    } catch (estoqueErr) {
      // ✓ PROTEÇÃO 4: Se estoque falhar, deletar a entrada registrada
      try {
        await deleteDoc(doc(db, 'entradas', entradaDocRef.id));
      } catch (delErr) {
        console.error('ERRO CRÍTICO ao reverter entrada:', delErr);
        throw new Error('Falha ao processar entrada. Contate suporte.');
      }
      throw estoqueErr;
    }

    // 3. Atualizar cache
    const novaEntrada = norm(entradaRow);
    state.entradas.unshift(novaEntrada);
    if (state.entradas.length > 150) state.entradas.length = 150;
    console.log('[EntAPI] ✓ Entrada registrada:', entradaDocRef.id);
    return state.entradas[0];
  } finally {
    _registrandoEntrada = false; // ✓ Sempre libera o mutex
  }
}
