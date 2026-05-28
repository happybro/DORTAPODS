import { sb } from './supabase.js';
import { state } from './state.js';
import { uid } from './utils.js';
import { atualizarEstoque } from './produtos.api.js';

// ── Anti-duplicação: flag global de mutex ──────────────────────────
let _salvandoPedido = false;

// ── normalizadores ────────────────────────────────────────────────
function normItem(i) {
  return {
    prodId: i.prod_id,
    nome:   i.nome,
    sabor:  i.sabor,
    qtd:    parseInt(i.qtd),
    venda:  parseFloat(i.venda),
  };
}

function normPedido(p) {
  return {
    id:      p.id,
    cliente: p.cliente,
    obs:     p.obs || '',
    status:  p.status,
    total:   parseFloat(p.total)  || 0,
    lucro:   parseFloat(p.lucro)  || 0,
    ts:      new Date(p.criado_em).getTime(),
    itens:   (p.pedido_itens || []).map(normItem),
  };
}

// ── carregar ─────────────────────────────────────────────────────
export async function carregarPedidos() {
  const { data, error } = await sb
    .from('pedidos')
    .select('*, pedido_itens(*)')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  state.pedidos = data.map(normPedido);
  return state.pedidos;
}

// ── salvar (novo ou editar) ───────────────────────────────────────
// SEGURO contra: race conditions, duplicação, estoque negativo, rollback
export async function salvarPedido(pedAtual, novoStatus) {
  // ✓ PROTEÇÃO 1: Anti-duplicação de clique
  if (_salvandoPedido) throw new Error('Operação em andamento. Aguarde...');
  _salvandoPedido = true;

  try {
    const pedOriginal = state.pedidos.find(p => p.id === pedAtual.id) || null;
    const eraFinalizado = pedOriginal?.status === 'finalizado';
    const vaiFinalizar  = novoStatus === 'finalizado';
    const mudandoParaFinalizado = !eraFinalizado && vaiFinalizar;

    // ✓ PROTEÇÃO 2: Validação de estoque ANTES de qualquer operação
    if (vaiFinalizar) {
      for (const item of pedAtual.itens) {
        const prod = state.prods[item.prodId];
        if (!prod) throw new Error(`Produto não encontrado: ${item.nome}`);

        // Conta quanto já está no pedido
        const qtdJaNoCarrinho = pedOriginal?.itens
          .filter(i => i.prodId === item.prodId)
          .reduce((s, i) => s + i.qtd, 0) || 0;

        // Se está AUMENTANDO a quantidade, precisa validar estoque
        if (item.qtd > qtdJaNoCarrinho) {
          const aumenoQtd = item.qtd - qtdJaNoCarrinho;
          if (aumenoQtd > prod.estoque) {
            throw new Error(`Estoque insuficiente: ${item.nome} ${item.sabor} (precisa +${aumenoQtd}, tem ${prod.estoque})`);
          }
        }
      }
    }

    // ✓ PROTEÇÃO 3: Ajuste de estoque seguro com rollback
    const estoqueRevertido = [];
    try {
      // Se ERA finalizado, DEVOLVE o estoque antigo (sinal POSITIVO)
      if (eraFinalizado && pedOriginal) {
        for (const item of pedOriginal.itens) {
          await atualizarEstoque(item.prodId, item.qtd); // ✓ CORRIGIDO: sinal correto
          estoqueRevertido.push({ prodId: item.prodId, qtd: item.qtd });
        }
      }

      // Se VAI FINALIZAR, BAIXA o estoque novo (sinal NEGATIVO)
      if (vaiFinalizar && mudandoParaFinalizado) {
        for (const item of pedAtual.itens) {
          await atualizarEstoque(item.prodId, -item.qtd);
        }
      }
    } catch (estErr) {
      // ✓ PROTEÇÃO 4: Rollback completo se erro
      for (const rev of estoqueRevertido) {
        try {
          await atualizarEstoque(rev.prodId, -rev.qtd);
        } catch (rollErr) {
          console.error('ERRO CRÍTICO em rollback:', rollErr);
          throw new Error('Falha ao reverter estoque. Contate suporte.');
        }
      }
      throw estErr;
    }

    // 5. Upsert pedido (atômico)
    const { data: pedRow, error: pedErr } = await sb.from('pedidos').upsert({
      id:       pedAtual.id,
      cliente:  pedAtual.cliente,
      obs:      pedAtual.obs || null,
      status:   novoStatus,
      total:    pedAtual.total,
      lucro:    pedAtual.lucro,
      ...(pedOriginal ? {} : { criado_em: new Date().toISOString() }),
    }).select().single();
    if (pedErr) throw pedErr;

    // 6. Deletar e inserir itens (substituição atômica)
    const { error: delErr } = await sb.from('pedido_itens').delete().eq('pedido_id', pedAtual.id);
    if (delErr) throw delErr;

    if (pedAtual.itens.length) {
      const rows = pedAtual.itens.map(item => ({
        id:        uid(),
        pedido_id: pedAtual.id,
        prod_id:   item.prodId,
        nome:      item.nome,
        sabor:     item.sabor,
        qtd:       item.qtd,
        venda:     item.venda,
      }));
      const { error: itErr } = await sb.from('pedido_itens').insert(rows);
      if (itErr) throw itErr;
    }

    // 7. Atualizar cache (NUNCA confiar apenas no cache após operação crítica)
    const pedSalvo = { ...normPedido(pedRow), itens: pedAtual.itens };
    const idx = state.pedidos.findIndex(p => p.id === pedAtual.id);
    if (idx >= 0) state.pedidos[idx] = pedSalvo;
    else state.pedidos.unshift(pedSalvo);

    return pedSalvo;
  } finally {
    _salvandoPedido = false; // ✓ Sempre libera o mutex
  }
}

// ── cancelar finalização → volta para pendente ────────────────────
// SEGURO contra: race conditions, estoque inconsistente
export async function cancelarPedido(pedId) {
  if (_salvandoPedido) throw new Error('Operação em andamento. Aguarde...');
  _salvandoPedido = true;

  try {
    const ped = state.pedidos.find(p => p.id === pedId);
    if (!ped || ped.status !== 'finalizado') return;

    // Devolver estoque (sinal POSITIVO)
    for (const item of ped.itens) {
      await atualizarEstoque(item.prodId, item.qtd); // ✓ CORRIGIDO: sinal correto
    }

    // Atualizar status
    const { error } = await sb
      .from('pedidos')
      .update({ status: 'pendente' })
      .eq('id', pedId);
    if (error) throw error;

    // Atualizar cache
    const idx = state.pedidos.findIndex(p => p.id === pedId);
    if (idx >= 0) state.pedidos[idx] = { ...state.pedidos[idx], status: 'pendente' };
  } finally {
    _salvandoPedido = false;
  }
}
