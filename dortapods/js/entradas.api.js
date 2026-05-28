import { sb } from './supabase.js';
import { state } from './state.js';
import { uid } from './utils.js';
import { atualizarEstoque } from './produtos.api.js';

function norm(e) {
  return {
    id:     e.id,
    prodId: e.prod_id,
    nome:   e.nome,
    qtd:    parseInt(e.qtd),
    custo:  parseFloat(e.custo) || 0,
    ts:     new Date(e.criado_em).getTime(),
  };
}

export async function carregarEntradas() {
  const { data, error } = await sb
    .from('entradas')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(150);
  if (error) throw error;
  state.entradas = data.map(norm);
  return state.entradas;
}

export async function registrarEntrada({ prodId, nome, qtd, custo }) {
  const { data, error } = await sb.from('entradas').insert({
    id:        uid(),
    prod_id:   prodId,
    nome,
    qtd,
    custo:     custo || 0,
    criado_em: new Date().toISOString(),
  }).select().single();
  if (error) throw error;

  await atualizarEstoque(prodId, qtd);

  state.entradas.unshift(norm(data));
  if (state.entradas.length > 150) state.entradas.length = 150;
  return state.entradas[0];
}
