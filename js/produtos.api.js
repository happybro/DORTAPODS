import { sb } from './supabase.js';
import { state } from './state.js';
import { uid, sanitize } from './utils.js';

// ── normalização: row do banco → objeto usado no app ────────────
function norm(p) {
  return {
    id:      p.id,
    nome:    p.nome,
    sabor:   p.sabor,
    compra:  parseFloat(p.compra)  || 0,
    venda:   parseFloat(p.venda)   || 0,
    estoque: parseInt(p.estoque)   || 0,
    criado:  new Date(p.criado_em).getTime(),
  };
}

export async function carregarProdutos() {
  const { data, error } = await sb
    .from('produtos')
    .select('*')
    .order('nome')
    .order('sabor');
  if (error) throw error;
  state.prods = {};
  data.forEach(p => { state.prods[p.id] = norm(p); });
  return state.prods;
}

export async function salvarProduto({ id, nome, sabor, compra, venda }) {
  const isNovo = !id || !state.prods[id];
  const prodId = isNovo ? uid() : id;

  const row = {
    id:     prodId,
    nome:   sanitize(nome),
    sabor:  sanitize(sabor),
    compra: parseFloat(compra) || 0,
    venda:  parseFloat(venda)  || 0,
    ...(isNovo && {
      estoque:   0,
      criado_em: new Date().toISOString(),
    }),
  };

  const { data, error } = await sb.from('produtos').upsert(row).select().single();
  if (error) throw error;
  state.prods[data.id] = norm(data);
  return state.prods[data.id];
}

export async function excluirProduto(id) {
  const { error } = await sb.from('produtos').delete().eq('id', id);
  if (error) throw error;
  delete state.prods[id];
}

// Usa RPC atômica para evitar estoque negativo via race condition
export async function atualizarEstoque(id, delta) {
  const { data, error } = await sb.rpc('rpc_atualizar_estoque', { p_id: id, delta });
  if (error) throw error;
  state.prods[id] = norm(data);
  return state.prods[id];
}
