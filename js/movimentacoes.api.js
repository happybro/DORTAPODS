// ══════════════════════════════════════════════════════════════════
// MOVIMENTAÇÕES API - FIREBASE
// ══════════════════════════════════════════════════════════════════

import { db, waitForFirebase } from './firebase-config.js';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { state } from './state.js';
import { uid } from './utils.js';

function norm(m) {
  return {
    id:   m.id,
    tipo: m.tipo,
    desc: m.descricao,
    val:  m.valor || '',
    ts:   m.criado ? new Date(m.criado.toDate()).getTime() : Date.now(),
  };
}

export async function carregarMovs() {
  await waitForFirebase();
  const q = query(collection(db, 'movimentacoes'), orderBy('criado', 'desc'), limit(100));
  const snapshot = await getDocs(q);
  state.movs = [];
  snapshot.forEach(docSnap => {
    state.movs.push(norm({ id: docSnap.id, ...docSnap.data() }));
  });
  console.log('[MovAPI] ✓ Carregadas', state.movs.length, 'movimentações');
  return state.movs;
}

export async function registrarMov({ tipo, desc, val }) {
  try {
    await waitForFirebase();
    const docRef = await addDoc(collection(db, 'movimentacoes'), {
      tipo:       tipo,
      descricao:  desc,
      valor:      val || null,
      criado:     new Date()
    });

    const mov = norm({ id: docRef.id, tipo, descricao: desc, valor: val });
    state.movs.unshift(mov);
    if (state.movs.length > 100) state.movs.length = 100;
    console.log('[MovAPI] ✓ Movimentação registrada:', docRef.id);
    return state.movs[0];
  } catch (error) {
    console.error('[MovAPI] Erro ao registrar:', error);
    throw error;
  }
}
