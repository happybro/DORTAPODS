// ══════════════════════════════════════════════════════════════════
// MIGRAÇÃO: localStorage → Firebase
// ══════════════════════════════════════════════════════════════════
// Se há dados antigos em localStorage, migra para Firebase automaticamente

import { db } from './firebase-config.js';
import { collection, addDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { uid } from './utils.js';

const LS_KEYS = ['pm_prods', 'pm_entradas', 'pm_pedidos', 'pm_movs'];

function temDadosLocais() {
  const prods = JSON.parse(localStorage.getItem('pm_prods') || 'null');
  return prods && Object.keys(prods).length > 0;
}

async function bancoPossuiDados() {
  try {
    const docs = await getDocs(collection(db, 'produtos'));
    return docs.size > 0;
  } catch (e) {
    return false;
  }
}

export async function migrarLocalStorage() {
  try {
    // Não tem dados locais? Sai fora
    if (!temDadosLocais()) return false;

    // Banco já tem dados? Limpa localStorage e retorna
    if (await bancoPossuiDados()) {
      LS_KEYS.forEach(k => localStorage.removeItem(k));
      return false;
    }

    // Tem dados locais e banco vazio? Migra!
    console.log('[Migração] Iniciando migração localStorage → Firebase...');

    const prods    = JSON.parse(localStorage.getItem('pm_prods')    || '{}');
    const entradas = JSON.parse(localStorage.getItem('pm_entradas') || '[]');
    const pedidos  = JSON.parse(localStorage.getItem('pm_pedidos')  || '[]');
    const movs     = JSON.parse(localStorage.getItem('pm_movs')     || '[]');

    // ── produtos ──────────────────────────────────────────────────
    const prodsArr = Object.values(prods);
    if (prodsArr.length) {
      for (const p of prodsArr) {
        await addDoc(collection(db, 'produtos'), {
          id: p.id,
          nome:    p.nome,
          sabor:   p.sabor,
          compra:  p.compra   || 0,
          venda:   p.venda    || 0,
          estoque: p.estoque  || 0,
          criado:  new Date(p.criado || Date.now()),
        });
      }
      console.log('[Migração] ✓', prodsArr.length, 'produtos migrados');
    }

    // ── entradas ──────────────────────────────────────────────────
    const entradasValidas = entradas.filter(e => prods[e.prodId]);
    if (entradasValidas.length) {
      for (const e of entradasValidas) {
        await addDoc(collection(db, 'entradas'), {
          prodId:       e.prodId,
          nome:         e.nome,
          qtd:          e.qtd,
          valor_compra: e.custo || 0,
          criado:       new Date(e.ts || Date.now()),
        });
      }
      console.log('[Migração] ✓', entradasValidas.length, 'entradas migradas');
    }

    // ── pedidos ───────────────────────────────────────────────────
    if (pedidos.length) {
      for (const p of pedidos) {
        await addDoc(collection(db, 'pedidos'), {
          id:      p.id,
          cliente: p.cliente || 'Cliente',
          obs:     p.obs     || '',
          status:  p.status  || 'pendente',
          total:   p.total   || 0,
          lucro:   p.lucro   || 0,
          itens:   p.itens?.filter(i => prods[i.prodId]) || [],
          criado:  new Date(p.ts || Date.now()),
        });
      }
      console.log('[Migração] ✓', pedidos.length, 'pedidos migrados');
    }

    // ── movimentações ─────────────────────────────────────────────
    if (movs.length) {
      for (const m of movs) {
        await addDoc(collection(db, 'movimentacoes'), {
          tipo:      m.tipo,
          descricao: m.desc,
          valor:     m.val || null,
          criado:    new Date(m.ts || Date.now()),
        });
      }
      console.log('[Migração] ✓', movs.length, 'movimentações migradas');
    }

    // ── limpar localStorage ───────────────────────────────────────
    LS_KEYS.forEach(k => localStorage.removeItem(k));
    console.log('[Migração] ✓ Dados antigos removidos do localStorage');
    return true;
  } catch (error) {
    console.error('[Migração] Erro:', error);
    // Não falha o app se migração falhar
    return false;
  }
}
