import { sb } from './supabase.js';
import { state } from './state.js';
import { uid } from './utils.js';
import { atualizarEstoque } from './produtos.api.js';

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
export async function salvarPedido(pedAtual, novoStatus) {
  const pedOriginal = state.pedidos.find(p => p.id === pedAtual.id) || null;
  const eraFinalizado = pedOriginal?.status === 'finalizado';
  const vaiFinalizar  = novoStatus === 'finalizado';

  // 1. Era finalizado → devolver estoque dos itens originais
  if (eraFinalizado && pedOriginal) {
    for (const item of pedOriginal.itens) {
      await atualizarEstoque(item.prodId, +item.qtd);
    }
  }

  // 2. Vai finalizar → verificar e baixar estoque dos novos itens
  if (vaiFinalizar) {
    for (const item of pedAtual.itens) {
      const prod = state.prods[item.prodId];
      if (!prod || item.qtd > prod.estoque) {
        // reverter passo 1 se der erro
        if (eraFinalizado && pedOriginal) {
          for (const it of pedOriginal.itens) {
            await atualizarEstoque(it.prodId, -it.qtd).catch(() => {});
          }
        }
        throw new Error(`Estoque insuficiente: ${item.nome} ${item.sabor}`);
      }
    }
    for (const item of pedAtual.itens) {
      await atualizarEstoque(item.prodId, -item.qtd);
    }
  }

  // 3. Upsert pedido
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

  // 4. Substituir itens (delete + insert)
  await sb.from('pedido_itens').delete().eq('pedido_id', pedAtual.id);
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

  // 5. Atualizar cache local
  const pedSalvo = { ...normPedido(pedRow), itens: pedAtual.itens };
  const idx = state.pedidos.findIndex(p => p.id === pedAtual.id);
  if (idx >= 0) state.pedidos[idx] = pedSalvo;
  else state.pedidos.unshift(pedSalvo);

  return pedSalvo;
}

// ── cancelar finalização → volta para pendente ────────────────────
export async function cancelarPedido(pedId) {
  const ped = state.pedidos.find(p => p.id === pedId);
  if (!ped || ped.status !== 'finalizado') return;

  for (const item of ped.itens) {
    await atualizarEstoque(item.prodId, +item.qtd);
  }

  const { error } = await sb
    .from('pedidos')
    .update({ status: 'pendente' })
    .eq('id', pedId);
  if (error) throw error;

  const idx = state.pedidos.findIndex(p => p.id === pedId);
  if (idx >= 0) state.pedidos[idx] = { ...state.pedidos[idx], status: 'pendente' };
}
