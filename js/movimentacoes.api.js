import { sb } from './supabase.js';
import { state } from './state.js';
import { uid } from './utils.js';

function norm(m) {
  return {
    id:   m.id,
    tipo: m.tipo,
    desc: m.descricao,
    val:  m.valor || '',
    ts:   new Date(m.criado_em).getTime(),
  };
}

export async function carregarMovs() {
  const { data, error } = await sb
    .from('movimentacoes')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(100);
  if (error) throw error;
  state.movs = data.map(norm);
  return state.movs;
}

export async function registrarMov({ tipo, desc, val }) {
  const { data, error } = await sb.from('movimentacoes').insert({
    id:        uid(),
    tipo,
    descricao: desc,
    valor:     val || null,
    criado_em: new Date().toISOString(),
  }).select().single();
  if (error) throw error;
  state.movs.unshift(norm(data));
  if (state.movs.length > 100) state.movs.length = 100;
  return state.movs[0];
}
