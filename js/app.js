import { state }                              from './state.js';
import { uid, R, fmtDt, toast, erroToast, sanitize } from './utils.js';
import * as ProdAPI                           from './produtos.api.js';
import * as EntradasAPI                       from './entradas.api.js';
import * as PedidosAPI                        from './pedidos.api.js';
import * as MovsAPI                           from './movimentacoes.api.js';
import { migrarLocalStorage }                 from './migrar.js';

// ══════════════════════════════════════════════════════════════════
// ESTADO LOCAL DA UI
// ══════════════════════════════════════════════════════════════════
let pedAtual          = null;
let pedProdSelecionado = null;
let prodFiltro        = 'todos';
let pedFiltro         = 'todos';
let loteRowId         = 0;
let listaParseada     = [];

// ── Mutex flags para evitar duplicação de cliques ──────────────────
let _salvandoProduto     = false;
let _confirmarEntrada    = false;
let _confirmarListaEntrada = false;

// ══════════════════════════════════════════════════════════════════
// LOADING OVERLAY
// ══════════════════════════════════════════════════════════════════
function setLoading(show, msg = 'Carregando...') {
  const el = document.getElementById('loading-overlay');
  const msgEl = document.getElementById('loading-msg');
  el.style.display = show ? 'flex' : 'none';
  if (msgEl) msgEl.textContent = msg;
}

// ══════════════════════════════════════════════════════════════════
// RELÓGIO
// ══════════════════════════════════════════════════════════════════
function updateTime() {
  const now = new Date();
  document.getElementById('htime').textContent =
    now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' · ' +
    now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).toUpperCase();
}

// ══════════════════════════════════════════════════════════════════
// NAVEGAÇÃO
// ══════════════════════════════════════════════════════════════════
function goTo(tab, btn) {
  document.querySelectorAll('.sc').forEach(s => s.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('on'));
  document.getElementById('sc-' + tab).classList.add('on');
  if (btn) btn.classList.add('on');
  document.getElementById('app').scrollTo(0, 0);
  ({ dash: renderDash, produtos: renderProds, entrada: renderEntrada, pedido: () => {}, historico: renderHistorico })[tab]?.();
}

// ══════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════
function renderDash() {
  const ap         = Object.values(state.prods);
  const totalEst   = ap.reduce((s, p) => s + p.estoque, 0);
  const pendentes  = state.pedidos.filter(p => p.status === 'pendente').length;
  const finalizados = state.pedidos.filter(p => p.status === 'finalizado');
  const totalVend  = finalizados.reduce((s, p) => s + p.total, 0);
  const totalLucro = finalizados.reduce((s, p) => s + p.lucro, 0);

  document.getElementById('kpi-estoque').textContent   = totalEst;
  document.getElementById('kpi-pedidos').textContent   = state.pedidos.length;
  document.getElementById('kpi-pendentes').textContent = pendentes;
  document.getElementById('kpi-vendido').textContent   = R(totalVend);
  document.getElementById('kpi-lucro').textContent     = R(totalLucro);

  const crit = ap.filter(p => p.estoque < 5);
  const alertEl = document.getElementById('low-alert-wrap');
  alertEl.innerHTML = crit.length ? `<div class="low-alert">
    <div class="low-alert-title">⚠️ Estoque crítico (${crit.length})</div>
    ${crit.slice(0, 5).map(p => `<div class="low-item"><span>${p.nome} ${p.sabor}</span>
      <span class="low-qty">${p.estoque} un.</span></div>`).join('')}
  </div>` : '';

  const histEl = document.getElementById('dash-hist');
  const recent = state.movs.slice(0, 8);
  if (!recent.length) {
    histEl.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Sem movimentações</div></div>';
    return;
  }
  const icons = { entrada: '📥', saida: '📤', pedido: '🛒' };
  histEl.innerHTML = recent.map(m => `
    <div class="hist-item">
      <div class="hist-icon ${m.tipo}">${icons[m.tipo] || '📌'}</div>
      <div class="hist-body">
        <div class="hist-title">${m.desc}</div>
        <div class="hist-sub">${fmtDt(m.ts)}</div>
      </div>
      <div class="hist-val ${m.tipo === 'entrada' ? 'hv-gr' : m.tipo === 'pedido' ? 'hv-bl' : 'hv-re'}">${m.val || ''}</div>
    </div>`).join('');
}

// ══════════════════════════════════════════════════════════════════
// PRODUTOS
// ══════════════════════════════════════════════════════════════════
function filtrarProds(btn, f) {
  prodFiltro = f;
  document.querySelectorAll('#sc-produtos .tab').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderProds();
}

function renderProds() {
  let lista = Object.values(state.prods);
  if (prodFiltro === 'baixo') lista = lista.filter(p => p.estoque > 0 && p.estoque < 5);
  if (prodFiltro === 'zero')  lista = lista.filter(p => p.estoque <= 0);
  lista.sort((a, b) => a.nome.localeCompare(b.nome) || a.sabor.localeCompare(b.sabor));

  document.getElementById('prod-count').textContent = Object.keys(state.prods).length + ' produto(s)';
  const el = document.getElementById('prod-list');
  if (!lista.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">Nenhum produto</div></div>';
    return;
  }
  el.innerHTML = lista.map(p => {
    const qcls   = p.estoque <= 0 ? 'zero' : p.estoque < 5 ? 'low' : 'ok';
    const margem = p.compra > 0 ? (((p.venda - p.compra) / p.compra) * 100).toFixed(0) : 0;
    return `<div class="prod-card ${p.estoque < 5 ? 'low' : ''}">
      <div class="prod-card-top">
        <div><div class="prod-name">${p.nome}</div>
          <div class="prod-flavor">${p.sabor}</div></div>
        <div><div class="prod-qty ${qcls}">${p.estoque}</div>
          <div class="prod-qty-lbl">unidades</div></div>
      </div>
      <div class="prod-prices">
        <div class="price-tag"><span>Compra</span>${R(p.compra)}</div>
        <div class="price-tag"><span>Venda</span>${R(p.venda)}</div>
        <div class="price-tag"><span>Margem</span>${margem}%</div>
      </div>
      <div class="prod-actions">
        <button class="btn btn-ghost btn-xs" onclick="editarProd('${p.id}')">✏️ Editar</button>
        <button class="btn btn-re btn-xs" onclick="excluirProd('${p.id}')">Excluir</button>
      </div>
    </div>`;
  }).join('');
}

function abrirModalProd(id) {
  document.getElementById('mprod-id').value = id || '';
  document.getElementById('mprod-title').textContent = id ? 'Editar Produto' : 'Novo Produto';
  if (id && state.prods[id]) {
    const p = state.prods[id];
    document.getElementById('mprod-nome').value   = p.nome;
    document.getElementById('mprod-sabor').value  = p.sabor;
    document.getElementById('mprod-compra').value = p.compra;
    document.getElementById('mprod-venda').value  = p.venda;
  } else {
    ['mprod-nome', 'mprod-sabor', 'mprod-compra', 'mprod-venda'].forEach(i => document.getElementById(i).value = '');
  }
  document.getElementById('modal-prod').classList.add('on');
  setTimeout(() => document.getElementById('mprod-nome').focus(), 300);
}

function editarProd(id) { abrirModalProd(id); }

async function salvarProduto() {
  // ✓ PROTEÇÃO: Anti-duplicação de clique
  if (_salvandoProduto) { toast('Salvando... aguarde', 're'); return; }
  _salvandoProduto = true;

  try {
    const id     = document.getElementById('mprod-id').value || undefined;
    const nome   = sanitize(document.getElementById('mprod-nome').value);
    const sabor  = sanitize(document.getElementById('mprod-sabor').value);
    const compra = parseFloat(document.getElementById('mprod-compra').value) || 0;
    const venda  = parseFloat(document.getElementById('mprod-venda').value)  || 0;

    if (!nome || !sabor) { toast('Preencha nome e sabor', 're'); return; }

    const existe = !!id && !!state.prods[id];
    await ProdAPI.salvarProduto({ id, nome, sabor, compra, venda });
    fecharModal('modal-prod');
    toast(existe ? '✓ Produto atualizado' : '✓ Produto cadastrado');
    renderProds();
  } catch (e) { erroToast(e); }
  finally {
    _salvandoProduto = false; // ✓ Sempre libera o mutex
  }
}

async function excluirProd(id) {
  const p = state.prods[id];
  if (!p) return;
  confirmar(`Excluir "${p.nome} ${p.sabor}"?`, 'Esta ação não pode ser desfeita.', async () => {
    try {
      await ProdAPI.excluirProduto(id);
      renderProds();
      toast('Produto removido', 'ye');
    } catch (e) { erroToast(e); }
  });
}

// ══════════════════════════════════════════════════════════════════
// ENTRADA DE ESTOQUE
// ══════════════════════════════════════════════════════════════════
function renderEntrada() {
  if (!document.querySelectorAll('.lote-row').length) addLoteRow();
  renderHistEntradas();
}

function addLoteRow() {
  const id  = ++loteRowId;
  const div = document.createElement('div');
  div.className = 'lote-row ac-wrap';
  div.id = 'lr-' + id;
  div.style.cssText = 'display:grid;grid-template-columns:1fr 80px auto;gap:8px;align-items:end;margin-bottom:10px';
  div.innerHTML = `
    <div class="field ac-wrap" style="margin:0;position:relative">
      <label style="display:block;font-size:11px;font-weight:600;color:var(--tx3);letter-spacing:.8px;text-transform:uppercase;margin-bottom:6px;font-family:var(--mono)">Produto</label>
      <input class="fi" type="text" placeholder="Buscar..." autocomplete="off"
        id="lnome-${id}" oninput="loteAC(${id})" onblur="setTimeout(()=>fechaLoteAC(${id}),180)">
      <div class="ac-drop" id="lac-${id}" style="display:none"></div>
    </div>
    <div class="field" style="margin:0">
      <label style="display:block;font-size:11px;font-weight:600;color:var(--tx3);letter-spacing:.8px;text-transform:uppercase;margin-bottom:6px;font-family:var(--mono)">Qtd</label>
      <input class="fi" type="number" min="1" placeholder="0" inputmode="numeric"
        id="lqtd-${id}" style="text-align:center;font-family:var(--mono);font-weight:600">
    </div>
    <button onclick="remLoteRow(${id})" style="background:none;border:none;color:var(--tx3);font-size:20px;cursor:pointer;padding:8px;margin-bottom:2px;line-height:1">✕</button>`;
  document.getElementById('lote-rows').appendChild(div);
  document.getElementById('lnome-' + id).focus();
}

function remLoteRow(id) { document.getElementById('lr-' + id)?.remove(); }

function loteAC(id) {
  const q    = document.getElementById('lnome-' + id).value.trim().toLowerCase();
  const drop = document.getElementById('lac-' + id);
  if (!q) { drop.style.display = 'none'; return; }
  const matches = Object.values(state.prods)
    .filter(p => (p.nome + ' ' + p.sabor).toLowerCase().includes(q)).slice(0, 6);
  if (!matches.length) { drop.style.display = 'none'; return; }
  drop.style.display = 'block';
  drop.innerHTML = matches.map(p => `<div class="ac-item" onpointerdown="selecionarLote(${id},'${p.id}')">
    <div><div class="ac-item-name">${p.nome} ${p.sabor}</div>
    <div class="ac-item-sub">estoque: ${p.estoque} un.</div></div></div>`).join('');
}

function selecionarLote(rowId, prodId) {
  const p = state.prods[prodId];
  if (!p) return;
  document.getElementById('lnome-' + rowId).value           = p.nome + ' ' + p.sabor;
  document.getElementById('lnome-' + rowId).dataset.prodId  = prodId;
  document.getElementById('lac-'  + rowId).style.display    = 'none';
  document.getElementById('lqtd-' + rowId).focus();
}

function fechaLoteAC(id) { document.getElementById('lac-' + id)?.style && (document.getElementById('lac-' + id).style.display = 'none'); }

async function confirmarEntrada() {
  // ✓ PROTEÇÃO: Anti-duplicação de clique
  if (_confirmarEntrada) { toast('Processando... aguarde', 're'); return; }
  _confirmarEntrada = true;

  try {
    const rows = document.querySelectorAll('.lote-row');
    if (!rows.length) { toast('Adicione pelo menos um item', 're'); return; }

    const ops = [];
    rows.forEach(row => {
      const id     = row.id.replace('lr-', '');
      const nomeEl = document.getElementById('lnome-' + id);
      const qtd    = parseInt(document.getElementById('lqtd-' + id).value) || 0;
      const prodId = nomeEl?.dataset.prodId;
      if (!prodId || !state.prods[prodId] || qtd <= 0) return;
      const p = state.prods[prodId];
      ops.push({ prodId, nome: p.nome + ' ' + p.sabor, qtd, custo: p.compra });
    });

    if (!ops.length) { toast('Nenhum produto válido', 're'); return; }

    for (const op of ops) {
      await EntradasAPI.registrarEntrada(op);
      await MovsAPI.registrarMov({ tipo: 'entrada', desc: `+${op.qtd}x ${op.nome}`, val: `+${R(op.qtd * op.custo)}` });
    }
    document.getElementById('lote-rows').innerHTML = '';
    loteRowId = 0;
    addLoteRow();
    toast(`✓ ${ops.length} produto(s) adicionado(s) ao estoque`);
    renderHistEntradas();
  } catch (e) { erroToast(e); }
  finally {
    _confirmarEntrada = false; // ✓ Sempre libera o mutex
  }
}

function switchEntrada(btn, modo) {
  document.querySelectorAll('#sc-entrada .tab').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('entrada-manual').style.display = modo === 'manual' ? 'block' : 'none';
  document.getElementById('entrada-lista').style.display  = modo === 'lista'  ? 'block' : 'none';
}

// ── Parser de lista colada ─────────────────────────────────────────
function processarLista() {
  const raw = document.getElementById('lista-input').value.trim();
  if (!raw) { toast('Cole uma lista primeiro', 're'); return; }

  listaParseada = [];
  let marcaAtual = '';

  raw.split('\n').forEach(linha => {
    linha = linha.trim();
    if (!linha) return;
    const m = linha.match(/^(\d+)\s+(.+)$/);
    if (m) {
      listaParseada.push({ marca: marcaAtual, nome: m[2].trim(), qtd: parseInt(m[1]) });
    } else {
      marcaAtual = linha;
    }
  });

  if (!listaParseada.length) { toast('Não encontrei produtos. Verifique o formato.', 're'); return; }

  document.getElementById('lista-preview-title').textContent = `${listaParseada.length} produto(s) identificado(s)`;
  document.getElementById('lista-preview-items').innerHTML = listaParseada.map((item, idx) => {
    const nomeCompleto = (item.marca ? item.marca + ' ' : '') + item.nome;
    const encontrado = Object.values(state.prods).find(p =>
      (p.nome + ' ' + p.sabor).toLowerCase() === nomeCompleto.toLowerCase() ||
      p.sabor.toLowerCase() === item.nome.toLowerCase()
    );
    const tag = encontrado
      ? `<span class="status-badge status-finalizado">✓ cadastrado</span>`
      : `<span class="status-badge status-pendente">novo</span>`;
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--br)">
        <div>
          <div style="font-size:13px;font-weight:700">${nomeCompleto}</div>
          <div style="font-size:11px;color:var(--tx3);font-family:var(--mono);margin-top:2px">${tag}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <input type="number" value="${item.qtd}" min="1" inputmode="numeric"
            id="lp-qty-${idx}"
            style="width:56px;background:var(--s2);border:1px solid var(--br);border-radius:6px;
              color:var(--tx);font-family:var(--mono);font-size:15px;font-weight:700;
              text-align:center;padding:6px 4px;outline:none">
          <span style="font-size:11px;color:var(--tx3)">un.</span>
        </div>
      </div>`;
  }).join('');

  document.getElementById('lista-preview').style.display = 'block';
  document.getElementById('lista-preview').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function confirmarEntradaLista() {
  // ✓ PROTEÇÃO: Anti-duplicação de clique
  if (_confirmarListaEntrada) { toast('Processando lista... aguarde', 're'); return; }
  _confirmarListaEntrada = true;

  try {
    if (!listaParseada.length) return;
    let adicionados = 0, criados = 0;

    for (const [idx, item] of listaParseada.entries()) {
      const qtdEl = document.getElementById('lp-qty-' + idx);
      const qtd   = parseInt(qtdEl ? qtdEl.value : item.qtd) || 0;
      if (qtd <= 0) continue;

      const nomeCompleto = (item.marca ? item.marca + ' ' : '') + item.nome;
      let prod = Object.values(state.prods).find(p =>
        (p.nome + ' ' + p.sabor).toLowerCase() === nomeCompleto.toLowerCase() ||
        p.sabor.toLowerCase() === item.nome.toLowerCase()
      );

      if (!prod) {
        prod = await ProdAPI.salvarProduto({ nome: item.marca || 'Sem marca', sabor: item.nome, compra: 0, venda: 0 });
        criados++;
      }

      await EntradasAPI.registrarEntrada({ prodId: prod.id, nome: prod.nome + ' ' + prod.sabor, qtd, custo: prod.compra });
      await MovsAPI.registrarMov({ tipo: 'entrada', desc: `+${qtd}x ${prod.nome} ${prod.sabor}`, val: `+${qtd} un.` });
      adicionados++;
    }

    if (!adicionados) { toast('Nenhum item válido', 're'); return; }
    document.getElementById('lista-input').value         = '';
    document.getElementById('lista-preview').style.display = 'none';
    listaParseada = [];
    toast(criados > 0
      ? `✓ ${adicionados} adicionados (${criados} novos cadastrados)`
      : `✓ ${adicionados} produto(s) adicionados ao estoque`);
  } catch (e) { erroToast(e); }
  finally {
    _confirmarListaEntrada = false; // ✓ Sempre libera o mutex
  }
}

function renderHistEntradas() {
  const el = document.getElementById('hist-entradas');
  el.style.display = 'block';
  el.innerHTML = state.entradas.length
    ? state.entradas.slice(0, 15).map(e => `
        <div class="hist-item">
          <div class="hist-icon entrada">📥</div>
          <div class="hist-body"><div class="hist-title">${e.nome}</div>
            <div class="hist-sub">${fmtDt(e.ts)}</div></div>
          <div class="hist-val hv-gr">+${e.qtd} un.</div>
        </div>`).join('')
    : '<div class="empty"><div class="empty-icon">📥</div><div class="empty-text">Nenhuma entrada ainda</div></div>';
}

// ══════════════════════════════════════════════════════════════════
// PEDIDO
// ══════════════════════════════════════════════════════════════════
function novoPedido() {
  pedAtual = { id: uid(), cliente: '', obs: '', status: 'pendente', itens: [], total: 0, lucro: 0, ts: Date.now() };
  abrirTelaPedido();
  goTo('pedido', document.getElementById('nb-pedido'));
}

function editarPedido(pedId) {
  const p = state.pedidos.find(x => x.id === pedId);
  if (!p) return;
  pedAtual = JSON.parse(JSON.stringify(p));
  pedAtual._editando       = true;
  pedAtual._statusAnterior = p.status;
  abrirTelaPedido();
  goTo('pedido', document.getElementById('nb-pedido'));
}

function abrirTelaPedido() {
  document.getElementById('ped-screen-title').textContent = pedAtual._editando ? 'Editar Pedido' : 'Novo Pedido';
  document.getElementById('ped-screen-sub').textContent   = pedAtual._editando ? `ID: ${pedAtual.id}` : 'Rápido e fácil';
  document.getElementById('ped-cliente').value = pedAtual.cliente || '';
  document.getElementById('ped-obs').value     = pedAtual.obs    || '';
  document.getElementById('ped-filtro').value  = '';

  const sw = document.getElementById('ped-status-wrap');
  sw.innerHTML = pedAtual._editando
    ? `<span class="status-badge status-${pedAtual.status}">${pedAtual.status === 'pendente' ? '⏳ PENDENTE' : '✓ FINALIZADO'}</span>`
    : '';

  try {
    renderProdutosParaPedido();
  } catch(e) {
    console.error('Erro ao renderizar produtos:', e);
  }
  atualizarPedItens();
}

// NOVA INTERFACE: LISTA DE PRODUTOS PARA PEDIDO
function renderProdutosParaPedido() {
  const filtro = document.getElementById('ped-filtro').value.trim().toLowerCase();
  let produtos = Object.values(state.prods)
    .filter(p => p.estoque > 0)
    .sort((a, b) => a.nome.localeCompare(b.nome) || a.sabor.localeCompare(b.sabor));

  if (filtro) {
    produtos = produtos.filter(p => (p.nome + ' ' + p.sabor).toLowerCase().includes(filtro));
  }

  const listEl = document.getElementById('ped-prods-list');
  if (!produtos.length) {
    listEl.innerHTML = '<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">Nenhum produto disponível</div></div>';
    return;
  }

  listEl.innerHTML = produtos.map(p => {
    const noCarrinho = pedAtual.itens.find(i => i.prodId === p.id);
    const qtdNoCarrinho = noCarrinho ? noCarrinho.qtd : 0;
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid var(--br);margin-bottom:4px">
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700">${p.nome} ${p.sabor}</div>
          <div style="font-size:11px;color:var(--tx3);font-family:var(--mono);margin-top:3px">
            ${p.estoque} un. disponível · ${R(p.venda)}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${qtdNoCarrinho ? `<span style="font-family:var(--mono);font-weight:700;color:var(--ac)">x${qtdNoCarrinho}</span>` : ''}
          <button class="qbtn qbtn-p" onclick="adicionarProdutoRapido('${p.id}')" style="width:40px;height:40px;font-size:20px;margin:0">+</button>
        </div>
      </div>`;
  }).join('');
}

function adicionarProdutoRapido(prodId) {
  const p = state.prods[prodId];
  if (!p) return;

  const existe = pedAtual.itens.find(i => i.prodId === prodId);
  const qtdNoCarrinho = existe ? existe.qtd : 0;

  if (qtdNoCarrinho >= p.estoque) {
    toast('Sem estoque suficiente', 're');
    return;
  }

  if (existe) {
    existe.qtd += 1;
  } else {
    pedAtual.itens.push({ prodId, nome: p.nome, sabor: p.sabor, qtd: 1, venda: p.venda });
  }

  atualizarPedItens();
  renderProdutosParaPedido();
  toast(`✓ ${p.nome} ${p.sabor} adicionado`, 'ac');
}

function pedBusca() {
  const q    = document.getElementById('ped-busca').value.trim().toLowerCase();
  const drop = document.getElementById('ped-ac');
  if (!q) { drop.style.display = 'none'; pedProdSelecionado = null; return; }
  const matches = Object.values(state.prods)
    .filter(p => (p.nome + ' ' + p.sabor).toLowerCase().includes(q) && p.estoque > 0).slice(0, 6);
  if (!matches.length) { drop.style.display = 'none'; return; }
  drop.style.display = 'block';
  drop.innerHTML = matches.map(p => `<div class="ac-item" onpointerdown="selecionarPedProd('${p.id}')">
    <div><div class="ac-item-name">${p.nome} ${p.sabor}</div>
    <div class="ac-item-sub">${p.estoque} un. · ${R(p.venda)}</div></div></div>`).join('');
}

function selecionarPedProd(prodId) {
  pedProdSelecionado = prodId;
  const p = state.prods[prodId];
  document.getElementById('ped-busca').value     = p.nome + ' ' + p.sabor;
  document.getElementById('ped-ac').style.display = 'none';
  document.getElementById('ped-qtd-input').value  = 1;
  document.getElementById('ped-qtd-input').focus();
}

function fechaAcPed() { document.getElementById('ped-ac').style.display = 'none'; }

function ajustarPedQtd(d) {
  const el = document.getElementById('ped-qtd-input');
  el.value = Math.max(1, (parseInt(el.value) || 0) + d);
}

function addItemPedido() {
  if (!pedProdSelecionado) { toast('Selecione um produto', 're'); return; }
  const p   = state.prods[pedProdSelecionado];
  const qtd = parseInt(document.getElementById('ped-qtd-input').value) || 0;
  if (qtd <= 0) { toast('Quantidade inválida', 're'); return; }
  const jaNoP = pedAtual.itens.filter(i => i.prodId === pedProdSelecionado).reduce((s, i) => s + i.qtd, 0);
  if (qtd + jaNoP > p.estoque) { toast(`Estoque insuficiente! Disponível: ${p.estoque - jaNoP}`, 're'); return; }
  const existe = pedAtual.itens.find(i => i.prodId === pedProdSelecionado);
  if (existe) { existe.qtd += qtd; }
  else { pedAtual.itens.push({ prodId: pedProdSelecionado, nome: p.nome, sabor: p.sabor, qtd, venda: p.venda }); }
  document.getElementById('ped-busca').value    = '';
  document.getElementById('ped-qtd-input').value = 1;
  pedProdSelecionado = null;
  atualizarPedItens();
  toast(`✓ ${qtd}x ${p.nome} ${p.sabor} adicionado`);
}

function atualizarPedItens() {
  const wrap = document.getElementById('ped-itens-wrap');
  const list = document.getElementById('ped-itens-list');
  if (!pedAtual || !pedAtual.itens.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';

  list.innerHTML = pedAtual.itens.map((item, idx) => `
    <div class="ped-item">
      <div class="ped-item-row">
        <div class="ped-item-info">
          <div class="ped-item-name">${item.nome} ${item.sabor}</div>
          <div class="ped-item-sub">Preço unitário:</div>
        </div>
        <div class="qty-ctrl">
          <button class="qbtn qbtn-m" onclick="pedQtd(${idx},-1)">−</button>
          <span class="qnum">${item.qtd}</span>
          <button class="qbtn qbtn-p" onclick="pedQtd(${idx},1)">+</button>
        </div>
        <div class="ped-item-total">${R(item.qtd * item.venda)}</div>
        <button class="rmv-btn" onclick="remItemPed(${idx})">✕</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
        <span style="font-size:11px;color:var(--tx3);font-family:var(--mono)">R$</span>
        <input class="ped-preco-edit" type="number" step="0.01" inputmode="decimal"
          value="${item.venda}" onchange="editarPreco(${idx},this.value)" title="Editar preço">
        <span style="font-size:11px;color:var(--tx3)">por unidade</span>
      </div>
    </div>`).join('');

  calcTotalPedido();
  renderBotoesPedido();
}

function calcTotalPedido() {
  if (!pedAtual) return;
  pedAtual.total = pedAtual.itens.reduce((s, i) => s + i.qtd * i.venda, 0);
  pedAtual.lucro = pedAtual.itens.reduce((s, i) => {
    const p = state.prods[i.prodId];
    return s + (i.venda - (p ? p.compra : 0)) * i.qtd;
  }, 0);
  document.getElementById('ped-total').textContent = R(pedAtual.total);
  const lucrEl = document.getElementById('ped-lucro-val');
  if (lucrEl) lucrEl.textContent = R(pedAtual.lucro);
}

function editarPreco(idx, val) {
  const novoPreco = parseFloat(val) || 0;
  if (novoPreco < 0) return;
  pedAtual.itens[idx].venda = novoPreco;
  atualizarPedItens();
}

function pedQtd(idx, d) {
  const p       = state.prods[pedAtual.itens[idx].prodId];
  const novaQtd = pedAtual.itens[idx].qtd + d;
  if (novaQtd <= 0) { remItemPed(idx); return; }
  const outros = pedAtual.itens
    .filter((_, i) => i !== idx && _.prodId === pedAtual.itens[idx].prodId)
    .reduce((s, i) => s + i.qtd, 0);
  if (p && novaQtd + outros > p.estoque) { toast('Sem estoque suficiente', 're'); return; }
  pedAtual.itens[idx].qtd = novaQtd;
  atualizarPedItens();
}

function remItemPed(idx) { pedAtual.itens.splice(idx, 1); atualizarPedItens(); }

function renderBotoesPedido() {
  const el = document.getElementById('ped-action-buttons');
  if (!pedAtual) { el.innerHTML = ''; return; }
  el.innerHTML = pedAtual.status === 'pendente' ? `
    <div class="btn-row">
      <button class="btn btn-ghost" onclick="salvarPedido('pendente')">💾 Salvar pendente</button>
      <button class="btn btn-ac"    onclick="salvarPedido('finalizado')">✓ Finalizar</button>
    </div>` : `
    <div class="btn-row">
      <button class="btn btn-re" onclick="cancelarFinalizacao()">↩ Cancelar venda</button>
      <button class="btn btn-ac" onclick="salvarPedido('finalizado')">💾 Salvar edição</button>
    </div>`;
}

async function salvarPedido(novoStatus) {
  if (!pedAtual || !pedAtual.itens.length) { toast('Adicione produtos ao pedido', 're'); return; }
  pedAtual.cliente = sanitize(document.getElementById('ped-cliente').value) || 'Cliente';
  pedAtual.obs     = sanitize(document.getElementById('ped-obs').value);
  calcTotalPedido();

  try {
    await PedidosAPI.salvarPedido(pedAtual, novoStatus);
    await MovsAPI.registrarMov({
      tipo: 'pedido',
      desc: novoStatus === 'finalizado'
        ? `Pedido finalizado — ${pedAtual.cliente}`
        : `Pedido salvo (pendente) — ${pedAtual.cliente}`,
      val: R(pedAtual.total),
    });

    toast(novoStatus === 'finalizado'
      ? `✓ Pedido finalizado! Lucro: ${R(pedAtual.lucro)}`
      : '💾 Pedido salvo como pendente');

    if (novoStatus === 'finalizado') gerarMsgPedido({ ...pedAtual, status: novoStatus });

    pedAtual = null;
    document.getElementById('ped-itens-wrap').style.display  = 'none';
    document.getElementById('ped-cliente').value             = '';
    document.getElementById('ped-obs').value                 = '';
    document.getElementById('ped-status-wrap').innerHTML     = '';
    document.getElementById('ped-action-buttons').innerHTML  = '';
  } catch (e) { erroToast(e); }
}

async function cancelarFinalizacao() {
  if (!pedAtual) return;
  confirmar('Cancelar esta venda?', 'O estoque será devolvido e o pedido volta para pendente.', async () => {
    try {
      await PedidosAPI.cancelarPedido(pedAtual.id);
      pedAtual.status          = 'pendente';
      pedAtual._statusAnterior = 'pendente';
      renderBotoesPedido();
      document.getElementById('ped-status-wrap').innerHTML =
        `<span class="status-badge status-pendente">⏳ PENDENTE</span>`;
      toast('↩ Pedido voltou para pendente — estoque devolvido', 'ye');
    } catch (e) { erroToast(e); }
  });
}

// ══════════════════════════════════════════════════════════════════
// HISTÓRICO DE PEDIDOS
// ══════════════════════════════════════════════════════════════════
function filtrarPedidos(btn, f) {
  pedFiltro = f;
  document.querySelectorAll('#sc-historico .tab').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderHistorico();
}

function renderHistorico() {
  let lista = [...state.pedidos];
  if (pedFiltro === 'pendente')   lista = lista.filter(p => p.status === 'pendente');
  if (pedFiltro === 'finalizado') lista = lista.filter(p => p.status === 'finalizado');
  document.getElementById('hist-count').textContent = state.pedidos.length + ' pedido(s)';
  const el = document.getElementById('ped-hist-list');
  if (!lista.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">🛒</div><div class="empty-text">Nenhum pedido aqui</div></div>';
    return;
  }
  el.innerHTML = lista.map(p => `
    <div class="ped-card ${p.status}">
      <div class="ped-card-top">
        <div>
          <div class="ped-card-client">👤 ${p.cliente}</div>
          <div class="ped-card-date">${fmtDt(p.ts)}</div>
        </div>
        <div class="ped-card-right">
          <div class="ped-card-total">${R(p.total)}</div>
          <div class="ped-card-lucro">${p.status === 'finalizado' ? 'Lucro ' + R(p.lucro) : ''}</div>
        </div>
      </div>
      <div style="margin-bottom:8px">
        <span class="status-badge status-${p.status}">${p.status === 'pendente' ? '⏳ PENDENTE' : '✓ FINALIZADO'}</span>
      </div>
      <div class="ped-card-items">${p.itens.map(i => `${i.qtd}x ${i.nome} ${i.sabor} — ${R(i.qtd * i.venda)}`).join('<br>')}</div>
      ${p.obs ? `<div style="font-size:11px;color:var(--tx3);font-family:var(--mono);margin-bottom:8px">${p.obs}</div>` : ''}
      <div class="btn-row">
        <button class="btn btn-ghost btn-xs" onclick="editarPedido('${p.id}')">✏️ Editar</button>
        <button class="btn btn-ghost btn-xs" onclick="verMsgPedido('${p.id}')">📋 WhatsApp</button>
      </div>
    </div>`).join('');
}

// ══════════════════════════════════════════════════════════════════
// WHATSAPP
// ══════════════════════════════════════════════════════════════════
function gerarMsgPedido(pedido) {
  const linhas = pedido.itens.map(i => `${i.qtd}x ${i.nome} ${i.sabor} — ${R(i.qtd * i.venda)}`).join('\n');
  const msg = `Olá ${pedido.cliente}! 👋\n\nSeu pedido foi registrado:\n\n${linhas}\n\n*Total: ${R(pedido.total)}*\n${pedido.obs ? '\n_' + pedido.obs + '_\n' : ''}\nObrigado pela preferência! 🙏`;
  abrirModalWA('Mensagem do pedido', pedido.cliente, msg);
}

function verMsgPedido(pedId) {
  const p = state.pedidos.find(x => x.id === pedId);
  if (p) gerarMsgPedido(p);
}

function gerarListaEstoque() {
  const disp = Object.values(state.prods).filter(p => p.estoque > 0)
    .sort((a, b) => a.nome.localeCompare(b.nome) || a.sabor.localeCompare(b.sabor));
  if (!disp.length) { toast('Estoque vazio', 're'); return; }
  const totalUn = disp.reduce((s, p) => s + p.estoque, 0);
  const hoje    = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const grupos  = {};
  disp.forEach(p => { (grupos[p.nome] ||= []).push(p); });
  let txt = `🔥 *PODS DISPONÍVEIS* 🔥\n_${hoje}_\n\n`;
  Object.keys(grupos).sort().forEach(nome => {
    txt += `*${nome}*\n`;
    grupos[nome].forEach(p => { txt += `${p.nome} ${p.sabor} — ${p.estoque} un.\n`; });
    txt += '\n';
  });
  txt += `📦 *Total: ${totalUn} unidades · ${disp.length} sabores*\n📲 _Pedidos pelo WhatsApp_`;
  abrirModalWA('Lista de estoque', `${disp.length} sabores · ${totalUn} un.`, txt);
}

function abrirModalWA(title, sub, txt) {
  document.getElementById('wa-title').textContent = title;
  document.getElementById('wa-sub').textContent   = sub;
  document.getElementById('wa-text').textContent  = txt;
  document.getElementById('modal-wa').classList.add('on');
}

function copiarWA() {
  const txt      = document.getElementById('wa-text').textContent;
  const fallback = t => {
    const ta = document.createElement('textarea');
    ta.value = t; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
  };
  navigator.clipboard?.writeText(txt)
    .then(() => { toast('✓ Copiado! Cola no WhatsApp', 'wa'); fecharModal('modal-wa'); })
    .catch(() => { fallback(txt); toast('✓ Copiado!', 'wa'); fecharModal('modal-wa'); })
    ?? (fallback(txt), toast('✓ Copiado!', 'wa'), fecharModal('modal-wa'));
}

// ══════════════════════════════════════════════════════════════════
// MODAIS / OVERLAYS
// ══════════════════════════════════════════════════════════════════
let _confirmCb = null;
function confirmar(titulo, sub, cb) {
  _confirmCb = cb;
  document.getElementById('confirm-title').textContent = titulo;
  document.getElementById('confirm-sub').textContent   = sub || '';
  document.getElementById('confirm-ok').onclick = () => { fecharModal('modal-confirm'); _confirmCb?.(); };
  document.getElementById('modal-confirm').classList.add('on');
}

function fecharModal(id)        { document.getElementById(id).classList.remove('on'); }
function fecharOverlay(e, id)   { if (e.target === document.getElementById(id)) fecharModal(id); }

// ══════════════════════════════════════════════════════════════════
// OFFLINE DETECTOR
// ══════════════════════════════════════════════════════════════════
window.addEventListener('online',  () => toast('✓ Conexão restaurada', 'ac'));
window.addEventListener('offline', () => toast('Sem conexão com internet', 're'));

// ══════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════
async function init() {
  updateTime();
  setInterval(updateTime, 30000);
  setLoading(true, 'Iniciando PodManager...');

  try {
    setLoading(true, 'Verificando dados locais...');
    const migrou = await migrarLocalStorage();
    if (migrou) toast('✓ Dados migrados do localStorage para Supabase!');

    setLoading(true, 'Carregando produtos...');
    await ProdAPI.carregarProdutos();

    setLoading(true, 'Carregando pedidos...');
    await PedidosAPI.carregarPedidos();

    setLoading(true, 'Carregando movimentações...');
    await MovsAPI.carregarMovs();
    await EntradasAPI.carregarEntradas();

  } catch (e) {
    console.error('[PodManager] Falha no init:', e);
    setLoading(false);
    toast('Erro ao conectar ao banco. Verifique config.js', 're');
    return;
  }

  setLoading(false);

  pedAtual = { id: uid(), cliente: '', obs: '', status: 'pendente', itens: [], total: 0, lucro: 0, ts: Date.now() };
  renderDash();
  renderEntrada();
}

// ══════════════════════════════════════════════════════════════════
// EXPOR FUNÇÕES GLOBAIS (chamadas pelos onclick do HTML)
// ══════════════════════════════════════════════════════════════════
Object.assign(window, {
  // nav
  goTo, novoPedido, editarPedido,
  // produtos
  filtrarProds, abrirModalProd, editarProd, salvarProduto, excluirProd,
  // entrada
  renderEntrada, addLoteRow, remLoteRow,
  loteAC, selecionarLote, fechaLoteAC,
  confirmarEntrada, switchEntrada,
  processarLista, confirmarEntradaLista,
  // pedido
  pedBusca, selecionarPedProd, fechaAcPed, ajustarPedQtd, addItemPedido,
  editarPreco, pedQtd, remItemPed, salvarPedido, cancelarFinalizacao,
  // histórico
  filtrarPedidos,
  // whatsapp
  gerarMsgPedido, verMsgPedido, gerarListaEstoque, copiarWA,
  // modais
  fecharModal, fecharOverlay, confirmar,
});

init();
