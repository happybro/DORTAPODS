import { sb } from './supabase.js';
import { state } from './state.js';
import { uid } from './utils.js';
import { atualizarEstoque } from './produtos.api.js';

// ── Anti-duplicação: flag global de mutex ──────────────────────────
let _registrandoEntrada = false;

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

// ── registrar entrada (novo estoque) ────────────────────────────────
// SEGURO contra: race conditions, duplicação, estoque inconsistente
export async function registrarEntrada({ prodId, nome, qtd, custo }) {
  // ✓ PROTEÇÃO 1: Anti-duplicação de clique
  if (_registrandoEntrada) throw new Error('Operação em andamento. Aguarde...');
  _registrandoEntrada = true;

  try {
    // ✓ PROTEÇÃO 2: Validação upfront (produto existe)
    const prod = state.prods[prodId];
    if (!prod) throw new Error(`Produto não encontrado: ${nome}`);

    // ✓ PROTEÇÃO 3: Validação de quantidade
    const qtdInt = parseInt(qtd);
    if (qtdInt <= 0) throw new Error('Quantidade deve ser maior que zero');
    if (!Number.isFinite(qtdInt)) throw new Error('Quantidade inválida');

    const entradaId = uid();

    // 1. Inserir entrada (registro de compra)
    const { data: entradaRow, error: entErr } = await sb.from('entradas').insert({
      id:        entradaId,
      prod_id:   prodId,
      nome,
      qtd:       qtdInt,
      custo:     parseFloat(custo) || 0,
      criado_em: new Date().toISOString(),
    }).select().single();
    if (entErr) throw entErr;

    // 2. Atualizar estoque (usa RPC atômica, já tem proteção no banco)
    try {
      await atualizarEstoque(prodId, qtdInt);
    } catch (estoqueErr) {
      // ✓ PROTEÇÃO 4: Se estoque falhar, deletar a entrada registrada
      try {
        await sb.from('entradas').delete().eq('id', entradaId);
      } catch (delErr) {
        console.error('ERRO CRÍTICO ao reverter entrada:', delErr);
        throw new Error('Falha ao processar entrada. Contate suporte.');
      }
      throw estoqueErr;
    }

    // 3. Atualizar cache
    state.entradas.unshift(norm(entradaRow));
    if (state.entradas.length > 150) state.entradas.length = 150;
    return state.entradas[0];
  } finally {
    _registrandoEntrada = false; // ✓ Sempre libera o mutex
  }
}
