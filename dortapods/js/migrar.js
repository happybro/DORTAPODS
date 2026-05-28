// Migração única: detecta dados em localStorage e importa para Supabase
import { sb } from './supabase.js';
import { uid } from './utils.js';

const LS_KEYS = ['pm_prods', 'pm_entradas', 'pm_pedidos', 'pm_movs'];

function temDadosLocais() {
  const prods = JSON.parse(localStorage.getItem('pm_prods') || 'null');
  return prods && Object.keys(prods).length > 0;
}

async function bancoPossuiDados() {
  const { count } = await sb
    .from('produtos')
    .select('id', { count: 'exact', head: true });
  return (count || 0) > 0;
}

export async function migrarLocalStorage() {
  if (!temDadosLocais()) return false;
  if (await bancoPossuiDados()) {
    // Banco já tem dados — apenas limpa localStorage para não migrar de novo
    LS_KEYS.forEach(k => localStorage.removeItem(k));
    return false;
  }

  const prods    = JSON.parse(localStorage.getItem('pm_prods')    || '{}');
  const entradas = JSON.parse(localStorage.getItem('pm_entradas') || '[]');
  const pedidos  = JSON.parse(localStorage.getItem('pm_pedidos')  || '[]');
  const movs     = JSON.parse(localStorage.getItem('pm_movs')     || '[]');

  // ── produtos ──────────────────────────────────────────────────
  const prodsArr = Object.values(prods);
  if (prodsArr.length) {
    const rows = prodsArr.map(p => ({
      id:        p.id,
      nome:      p.nome,
      sabor:     p.sabor,
      compra:    p.compra   || 0,
      venda:     p.venda    || 0,
      estoque:   p.estoque  || 0,
      criado_em: p.criado   ? new Date(p.criado).toISOString() : new Date().toISOString(),
    }));
    const { error } = await sb.from('produtos').insert(rows);
    if (error) throw new Error('Migração produtos: ' + error.message);
  }

  // ── entradas ──────────────────────────────────────────────────
  const entradasValidas = entradas.filter(e => prods[e.prodId]);
  if (entradasValidas.length) {
    const rows = entradasValidas.map(e => ({
      id:        e.id,
      prod_id:   e.prodId,
      nome:      e.nome,
      qtd:       e.qtd,
      custo:     e.custo    || 0,
      criado_em: e.ts       ? new Date(e.ts).toISOString() : new Date().toISOString(),
    }));
    const { error } = await sb.from('entradas').insert(rows);
    if (error) throw new Error('Migração entradas: ' + error.message);
  }

  // ── pedidos + itens ───────────────────────────────────────────
  for (const p of pedidos) {
    const { error: pedErr } = await sb.from('pedidos').insert({
      id:        p.id,
      cliente:   p.cliente  || 'Cliente',
      obs:       p.obs      || null,
      status:    p.status   || 'pendente',
      total:     p.total    || 0,
      lucro:     p.lucro    || 0,
      criado_em: p.ts       ? new Date(p.ts).toISOString() : new Date().toISOString(),
    });
    if (pedErr) continue; // pula se falhar (ex: FK inválida)

    if (p.itens?.length) {
      const itensRows = p.itens
        .filter(i => prods[i.prodId]) // só itens de produtos existentes
        .map(i => ({
          id:        uid(),
          pedido_id: p.id,
          prod_id:   i.prodId,
          nome:      i.nome,
          sabor:     i.sabor,
          qtd:       i.qtd,
          venda:     i.venda,
        }));
      if (itensRows.length) {
        await sb.from('pedido_itens').insert(itensRows);
      }
    }
  }

  // ── movimentações ─────────────────────────────────────────────
  if (movs.length) {
    const rows = movs.map(m => ({
      id:        uid(),
      tipo:      m.tipo,
      descricao: m.desc,
      valor:     m.val      || null,
      criado_em: m.ts       ? new Date(m.ts).toISOString() : new Date().toISOString(),
    }));
    const { error } = await sb.from('movimentacoes').insert(rows);
    if (error) throw new Error('Migração movimentações: ' + error.message);
  }

  // ── limpar localStorage ───────────────────────────────────────
  LS_KEYS.forEach(k => localStorage.removeItem(k));
  return true;
}
