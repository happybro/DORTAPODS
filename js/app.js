// Firebase (inicializa ao carregar)
import './firebase-config.js';

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
// HELPERS DE DISPLAY
// ══════════════════════════════════════════════════════════════════

// Retorna nome de exibição limpo, removendo "Importado" de registros antigos
function nomeExibicao(nome, sabor) {
  const n = (nome && nome.trim() !== 'Importado') ? nome.trim() : '';
  const s = sabor ? sabor.trim() : '';
  return [n, s].filter(Boolean).join(' ') || 'Sem nome';
}

// Formata número de pedido como #0001
function fmtNumPed(n) {
  return n ? '#' + String(n).padStart(4, '0') : '#----';
}

// Retorna badge HTML para situação de pagamento
function badgePagamento(status) {
  return status === 'pago'
    ? '<span class="pay-badge pay-pago">✓ Pago</span>'
    : '<span class="pay-badge pay-aberto">Em aberto</span>';
}

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
    ${crit.slice(0, 5).map(p => `<div class="low-item"><span>${nomeExibicao(p.nome, p.sabor)}</span>
      <span class="low-qty">${p.estoque} un.</span></div>`).join('')}
  </div>` : '';

  // ── Últimos pedidos finalizados (substitui movimentações) ──────
  const histEl = document.getElementById('dash-hist');
  const ultFinalizados = finalizados
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 8);

  if (!ultFinalizados.length) {
    histEl.innerHTML = '<div class="empty"><div class="empty-icon">🛒</div><div class="empty-text">Nenhum pedido finalizado ainda</div></div>';
    return;
  }
  histEl.innerHTML = ultFinalizados.map(p => `
    <div class="hist-item">
      <div class="hist-icon pedido">🛒</div>
      <div class="hist-body">
        <div class="hist-title">${fmtNumPed(p.numeroPedido)} · ${p.cliente}</div>
        <div class="hist-sub">${fmtDt(p.ts)}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="hist-val hv-gr">${R(p.total)}</div>
        <div style="margin-top:3px">${badgePagamento(p.pagamentoStatus)}</div>
      </div>
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
  lista.sort((a, b) => nomeExibicao(a.nome, a.sabor).localeCompare(nomeExibicao(b.nome, b.sabor)));

  document.getElementById('prod-count').textContent = Object.keys(state.prods).length + ' produto(s)';
  const el = document.getElementById('prod-list');
  if (!lista.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">Nenhum produto</div></div>';
    return;
  }
  el.innerHTML = lista.map(p => {
    const qcls   = p.estoque <= 0 ? 'zero' : p.estoque < 5 ? 'low' : 'ok';
    const margem = p.compra > 0 ? (((p.venda - p.compra) / p.compra) * 100).toFixed(0) : 0;
    // Compatibilidade com produtos antigos gravados com nome="Importado"
    const isOldImportado = p.nome === 'Importado';
    const displayNome  = isOldImportado ? p.sabor : p.nome;
    const displaySabor = isOldImportado ? '' : p.sabor;
    return `<div class="prod-card ${p.estoque < 5 ? 'low' : ''}">
      <div class="prod-card-top">
        <div><div class="prod-name">${displayNome}</div>
          <div class="prod-flavor">${displaySabor}</div></div>
        <div><div class="prod-qty ${qcls}">${p.estoque}</div>
          <div class="prod-qty-lbl">unidades</div></div>
      </div>
      <div class="prod-prices">
        <div class="price-tag"><span>Compra</span>${R(p.compra)}</div>
        <div class="price-tag"><span>Venda</span>${R(p.venda)}</div>
        <div class="price-tag"><span>Margem</span>${margem}%</div>
      </div>
      <div class="prod-actions">
        <button class="btn btn-ac btn-xs" style="flex:1" onclick="entradaRapida('${p.id}')">+ Estoque</button>
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
    // Compatibilidade: se nome="Importado", editar mostra sabor no campo nome
    const isOldImportado = p.nome === 'Importado';
    document.getElementById('mprod-nome').value   = isOldImportado ? p.sabor : p.nome;
    document.getElementById('mprod-sabor').value  = isOldImportado ? '' : p.sabor;
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
  if (_salvandoProduto) { toast('Salvando... aguarde', 're'); return; }
  _salvandoProduto = true;

  try {
    const id     = document.getElementById('mprod-id').value || undefined;
    const nome   = sanitize(document.getElementById('mprod-nome').value);
    const sabor  = sanitize(document.getElementById('mprod-sabor').value);
    const compra = parseFloat(document.getElementById('mprod-compra').value) || 0;
    const venda  = parseFloat(document.getElementById('mprod-venda').value)  || 0;

    if (!nome) { toast('Preencha o nome do produto', 're'); return; }

    const existe = !!id && !!state.prods[id];
    await ProdAPI.salvarProduto({ id, nome, sabor, compra, venda });
    fecharModal('modal-prod');
    toast(existe ? '✓ Produto atualizado' : '✓ Produto cadastrado');
    renderProds();
  } catch (e) { erroToast(e); }
  finally {
    _salvandoProduto = false;
  }
}

async function excluirProd(id) {
  const p = state.prods[id];
  if (!p) return;
  confirmar(`Excluir "${nomeExibicao(p.nome, p.sabor)}"?`, 'Esta ação não pode ser desfeita.', async () => {
    try {
      await ProdAPI.excluirProduto(id);
      renderProds();
      toast('Produto removido', 'ye');
    } catch (e) { erroToast(e); }
  });
}

// ══════════════════════════════════════════════════════════════════
// ENTRADA RÁPIDA (botão + na aba Produtos)
// ══════════════════════════════════════════════════════════════════
let _entradaRapida = false;

function entradaRapida(id) {
  const p = state.prods[id];
  if (!p) { toast('Produto não encontrado', 're'); return; }
  document.getElementById('er-prod-id').value = id;
  document.getElementById('er-prod-nome').textContent =
    `${nomeExibicao(p.nome, p.sabor)} · estoque atual: ${p.estoque} un.`;
  document.getElementById('er-qtd').value = '';
  document.getElementById('modal-entrada-rapida').classList.add('on');
  setTimeout(() => document.getElementById('er-qtd').focus(), 300);
}

function erAddQtd(n) {
  const el = document.getElementById('er-qtd');
  el.value = Math.max(0, (parseInt(el.value) || 0) + n);
}

async function confirmarEntradaRapida() {
  if (_entradaRapida) { toast('Processando... aguarde', 'ye'); return; }

  const id  = document.getElementById('er-prod-id').value;
  const qtd = parseInt(document.getElementById('er-qtd').value) || 0;
  const p   = state.prods[id];

  if (!p) { toast('Produto não encontrado', 're'); return; }
  if (qtd <= 0) { toast('Informe uma quantidade válida', 're'); return; }

  _entradaRapida = true;
  try {
    const nomeProd = nomeExibicao(p.nome, p.sabor);
    await EntradasAPI.registrarEntrada({ prodId: id, nome: nomeProd, qtd, custo: p.compra });
    await MovsAPI.registrarMov({
      tipo: 'entrada',
      desc: `+${qtd}x ${nomeProd}`,
      val:  `+${qtd} un.`
    }).catch(() => {});

    fecharModal('modal-entrada-rapida');
    toast(`✓ +${qtd} un. de ${nomeProd}`, 'ac');
    renderProds();
    renderDash();
  } catch (e) {
    erroToast(e);
  } finally {
    _entradaRapida = false;
  }
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
    .filter(p => nomeExibicao(p.nome, p.sabor).toLowerCase().includes(q)).slice(0, 6);
  if (!matches.length) { drop.style.display = 'none'; return; }
  drop.style.display = 'block';
  drop.innerHTML = matches.map(p => `<div class="ac-item" onpointerdown="selecionarLote(${id},'${p.id}')">
    <div><div class="ac-item-name">${nomeExibicao(p.nome, p.sabor)}</div>
    <div class="ac-item-sub">estoque: ${p.estoque} un.</div></div></div>`).join('');
}

function selecionarLote(rowId, prodId) {
  const p = state.prods[prodId];
  if (!p) return;
  document.getElementById('lnome-' + rowId).value           = nomeExibicao(p.nome, p.sabor);
  document.getElementById('lnome-' + rowId).dataset.prodId  = prodId;
  document.getElementById('lac-'  + rowId).style.display    = 'none';
  document.getElementById('lqtd-' + rowId).focus();
}

function fechaLoteAC(id) { document.getElementById('lac-' + id)?.style && (document.getElementById('lac-' + id).style.display = 'none'); }

async function confirmarEntrada() {
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
      ops.push({ prodId, nome: nomeExibicao(p.nome, p.sabor), qtd, custo: p.compra });
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
    _confirmarEntrada = false;
  }
}

function switchEntrada(btn, modo) {
  document.querySelectorAll('#sc-entrada .tab').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('entrada-manual').style.display = modo === 'manual' ? 'block' : 'none';
  document.getElementById('entrada-lista').style.display  = modo === 'lista'  ? 'block' : 'none';

  if (modo === 'lista') {
    setTimeout(() => document.getElementById('lista-input')?.focus(), 100);
  }
}

// ── Parser de lista colada ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const listaInput = document.getElementById('lista-input');
  if (listaInput) {
    listaInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        processarLista();
      }
    });
  }
  const erQtd = document.getElementById('er-qtd');
  if (erQtd) {
    erQtd.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); confirmarEntradaRapida(); }
    });
  }
}, { once: true });

function processarLista() {
  const raw = document.getElementById('lista-input').value.trim();
  if (!raw) { toast('Cole uma lista primeiro', 're'); return; }

  listaParseada = [];
  let marcaAtual = '';
  const linhasComErro = [];

  raw.split('\n').forEach((linha, lineNum) => {
    linha = linha.trim();
    if (!linha) return;

    let qtd = 0;
    let nome = '';

    const m1 = linha.match(/^(\d+)x?\s+(.+)$/i);
    if (m1) {
      qtd = parseInt(m1[1]);
      nome = m1[2].trim();
    }

    const m2 = linha.match(/^(.+?)[:\s]\(?\d+\)?\s*$/) || linha.match(/^(.+?)[:\s]+(\d+)\s*$/);
    if (!qtd && m2) {
      const match = linha.match(/(\d+)$/);
      if (match) {
        qtd = parseInt(match[1]);
        nome = linha.replace(/\d+\s*$/, '').trim().replace(/[():]/, '');
      }
    }

    // Se não é número, é marca/categoria
    if (!qtd && isNaN(parseInt(linha.charAt(0)))) {
      marcaAtual = linha;
      return;
    }

    if (!nome || qtd <= 0) {
      linhasComErro.push(lineNum + 1);
      return;
    }

    listaParseada.push({
      marca: marcaAtual,
      nome: nome.replace(/[()]/g, '').trim(),
      qtd,
      linha: lineNum + 1
    });
  });

  if (!listaParseada.length) {
    toast(linhasComErro.length > 0
      ? `❌ Linhas inválidas: ${linhasComErro.join(', ')}`
      : '❌ Nenhum produto válido encontrado', 're');
    return;
  }

  document.getElementById('lista-preview-title').textContent =
    `${listaParseada.length} produto(s) ${linhasComErro.length > 0 ? `(${linhasComErro.length} ignoradas)` : ''}`;

  document.getElementById('lista-preview-items').innerHTML = listaParseada.map((item, idx) => {
    // nomeCompleto: se tem marca, "Marca Sabor"; se não tem, apenas o nome do item
    const nomeCompleto = item.marca ? `${item.marca} ${item.nome}` : item.nome;
    const encontrado = Object.values(state.prods).find(p => {
      const fullName = nomeExibicao(p.nome, p.sabor).toLowerCase();
      const itemName = nomeCompleto.toLowerCase();
      return fullName === itemName || p.sabor.toLowerCase() === item.nome.toLowerCase() ||
             fullName.includes(itemName) || itemName.includes(fullName);
    });
    const tag = encontrado ? '✓' : 'novo';
    return `<div style="font-size:13px;padding:6px 0;display:flex;justify-content:space-between">
      <span>${nomeCompleto} <span style="color:var(--tx3)">(${tag})</span></span>
      <strong style="font-family:var(--mono);color:var(--ac)">${item.qtd} un.</strong>
    </div>`;
  }).join('');

  document.getElementById('lista-preview').style.display = 'block';
  toast(`✓ Pronto! ${listaParseada.length} item(ns)`, 'ac');

  setTimeout(() => {
    const btn = document.getElementById('btn-confirmar-lista');
    if (btn) btn.focus();
  }, 100);
}

async function confirmarEntradaLista() {
  if (_confirmarListaEntrada) { toast('Processando...', 'ye'); return; }
  _confirmarListaEntrada = true;

  try {
    if (!listaParseada.length) return;

    let adicionados = 0, criados = 0;
    const btn = document.getElementById('btn-confirmar-lista');
    if (btn) btn.disabled = true;

    for (const [idx, item] of listaParseada.entries()) {
      try {
        const qtdEl = document.getElementById('lp-qty-' + idx);
        let qtd = parseInt(qtdEl ? qtdEl.value : item.qtd) || 0;
        if (!qtd || qtd <= 0) continue;
        qtd = Math.min(qtd, 999999);

        // nomeCompleto para busca: com marca ou sem
        const nomeCompleto = item.marca ? `${item.marca} ${item.nome}` : item.nome;

        // Busca inteligente — usa nomeExibicao para ignorar "Importado" em registros antigos
        let prod = Object.values(state.prods).find(p => {
          const fullName = nomeExibicao(p.nome, p.sabor).toLowerCase();
          const itemName = nomeCompleto.toLowerCase();
          return fullName === itemName || p.sabor.toLowerCase() === item.nome.toLowerCase() ||
                 fullName.includes(itemName) || itemName.includes(fullName);
        });

        // ✅ CORREÇÃO: nunca usar 'Importado' como nome
        // Com marca: nome=marca, sabor=item.nome → exibe "Marca Sabor"
        // Sem marca:  nome=item.nome, sabor=''   → exibe apenas o nome do produto
        if (!prod) {
          try {
            prod = await ProdAPI.salvarProduto({
              nome:   item.marca || item.nome,
              sabor:  item.marca ? item.nome : '',
              compra: 0,
              venda:  0
            });
            criados++;
          } catch (err) { continue; }
        }

        try {
          const nomeProd = nomeExibicao(prod.nome, prod.sabor);
          await EntradasAPI.registrarEntrada({ prodId: prod.id, nome: nomeProd, qtd, custo: prod.compra });
          await MovsAPI.registrarMov({ tipo: 'entrada', desc: `+${qtd}x ${nomeProd}`, val: `+${qtd} un.` }).catch(() => {});
          adicionados++;
        } catch (err) { continue; }

        if (adicionados % 3 === 0) {
          document.getElementById('lista-preview-title').textContent = `✓ ${adicionados}/${listaParseada.length}...`;
        }
      } catch (e) { /* silencioso */ }
    }

    if (!adicionados) {
      toast('❌ Nenhum item foi adicionado', 're');
      return;
    }

    document.getElementById('lista-input').value = '';
    document.getElementById('lista-preview').style.display = 'none';
    listaParseada = [];

    const msg = criados > 0 ? `✓ ${adicionados} adicionado(s) • ${criados} novo(s)` : `✓ ${adicionados} un. registradas!`;
    toast(msg, 'ac');
    renderHistEntradas();

    setTimeout(() => {
      document.getElementById('lista-input').focus();
    }, 200);
  } catch (e) {
    console.error('[Lista]', e);
    toast('❌ ' + e.message, 're');
  } finally {
    _confirmarListaEntrada = false;
    const btn = document.getElementById('btn-confirmar-lista');
    if (btn) btn.disabled = false;
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
  pedAtual = {
    id: uid(),
    cliente: '',
    obs: '',
    status: 'pendente',
    pagamentoStatus: 'em_aberto',
    numeroPedido: null,
    itens: [],
    total: 0,
    lucro: 0,
    ts: Date.now()
  };
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
  document.getElementById('ped-screen-sub').textContent   = pedAtual._editando
    ? `${fmtNumPed(pedAtual.numeroPedido)} · ${pedAtual.cliente || ''}`
    : 'Rápido e fácil';
  document.getElementById('ped-cliente').value = pedAtual.cliente || '';
  document.getElementById('ped-obs').value     = pedAtual.obs    || '';
  document.getElementById('ped-filtro').value  = '';

  const sw = document.getElementById('ped-status-wrap');
  sw.innerHTML = pedAtual._editando
    ? `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <span class="status-badge status-${pedAtual.status}">${pedAtual.status === 'pendente' ? '⏳ PENDENTE' : '✓ FINALIZADO'}</span>
        ${badgePagamento(pedAtual.pagamentoStatus || 'em_aberto')}
       </div>`
    : '';

  try {
    renderProdutosParaPedido();
  } catch(e) {
    console.error('Erro ao renderizar produtos:', e);
  }
  atualizarPedItens();
}

// LISTA DE PRODUTOS PARA PEDIDO
function renderProdutosParaPedido() {
  const filtro = document.getElementById('ped-filtro').value.trim().toLowerCase();
  let produtos = Object.values(state.prods)
    .filter(p => p.estoque > 0)
    .sort((a, b) => nomeExibicao(a.nome, a.sabor).localeCompare(nomeExibicao(b.nome, b.sabor)));

  if (filtro) {
    produtos = produtos.filter(p => nomeExibicao(p.nome, p.sabor).toLowerCase().includes(filtro));
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
          <div style="font-size:14px;font-weight:700">${nomeExibicao(p.nome, p.sabor)}</div>
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
  toast(`✓ ${nomeExibicao(p.nome, p.sabor)} adicionado`, 'ac');
}

function pedBusca() {
  const q    = document.getElementById('ped-busca').value.trim().toLowerCase();
  const drop = document.getElementById('ped-ac');
  if (!q) { drop.style.display = 'none'; pedProdSelecionado = null; return; }
  const matches = Object.values(state.prods)
    .filter(p => nomeExibicao(p.nome, p.sabor).toLowerCase().includes(q) && p.estoque > 0).slice(0, 6);
  if (!matches.length) { drop.style.display = 'none'; return; }
  drop.style.display = 'block';
  drop.innerHTML = matches.map(p => `<div class="ac-item" onpointerdown="selecionarPedProd('${p.id}')">
    <div><div class="ac-item-name">${nomeExibicao(p.nome, p.sabor)}</div>
    <div class="ac-item-sub">${p.estoque} un. · ${R(p.venda)}</div></div></div>`).join('');
}

function selecionarPedProd(prodId) {
  pedProdSelecionado = prodId;
  const p = state.prods[prodId];
  document.getElementById('ped-busca').value     = nomeExibicao(p.nome, p.sabor);
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
  toast(`✓ ${qtd}x ${nomeExibicao(p.nome, p.sabor)} adicionado`);
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
          <div class="ped-item-name">${nomeExibicao(item.nome, item.sabor)}</div>
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

  // Botão de toggle de pagamento (apenas quando editando)
  const pagBtn = pedAtual._editando ? `
    <button class="btn btn-ghost" onclick="togglePagamentoLocal()" style="margin-bottom:8px">
      ${(pedAtual.pagamentoStatus || 'em_aberto') === 'pago'
        ? '↩ Marcar como Em aberto'
        : '✓ Marcar como Pago'}
    </button>` : '';

  el.innerHTML = pagBtn + (pedAtual.status === 'pendente' ? `
    <div class="btn-row">
      <button class="btn btn-ghost" onclick="salvarPedido('pendente')">💾 Salvar pendente</button>
      <button class="btn btn-ac"    onclick="salvarPedido('finalizado')">✓ Finalizar</button>
    </div>` : `
    <div class="btn-row">
      <button class="btn btn-re" onclick="cancelarFinalizacao()">↩ Cancelar venda</button>
      <button class="btn btn-ac" onclick="salvarPedido('finalizado')">💾 Salvar edição</button>
    </div>`);
}

function togglePagamentoLocal() {
  if (!pedAtual) return;
  pedAtual.pagamentoStatus = (pedAtual.pagamentoStatus || 'em_aberto') === 'pago' ? 'em_aberto' : 'pago';
  // Atualiza badge no header
  const sw = document.getElementById('ped-status-wrap');
  sw.innerHTML = `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
    <span class="status-badge status-${pedAtual.status}">${pedAtual.status === 'pendente' ? '⏳ PENDENTE' : '✓ FINALIZADO'}</span>
    ${badgePagamento(pedAtual.pagamentoStatus)}
  </div>`;
  renderBotoesPedido();
}

async function salvarPedido(novoStatus) {
  if (!pedAtual || !pedAtual.itens.length) { toast('Adicione produtos ao pedido', 're'); return; }
  pedAtual.cliente = sanitize(document.getElementById('ped-cliente').value) || 'Cliente';
  pedAtual.obs     = sanitize(document.getElementById('ped-obs').value);
  calcTotalPedido();

  try {
    const pedSalvo = await PedidosAPI.salvarPedido(pedAtual, novoStatus);
    await MovsAPI.registrarMov({
      tipo: 'pedido',
      desc: novoStatus === 'finalizado'
        ? `Pedido finalizado — ${pedAtual.cliente}`
        : `Pedido salvo (pendente) — ${pedAtual.cliente}`,
      val: R(pedAtual.total),
    });

    toast(novoStatus === 'finalizado'
      ? `✓ Pedido ${fmtNumPed(pedSalvo.numeroPedido)} finalizado! Lucro: ${R(pedAtual.lucro)}`
      : '💾 Pedido salvo como pendente');

    if (novoStatus === 'finalizado') gerarMsgPedido({ ...pedSalvo, status: novoStatus });

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

// ── Toggle de pagamento a partir do histórico ──────────────────────
async function togglePagamento(pedId) {
  try {
    const novoStatus = await PedidosAPI.togglePagamento(pedId);
    const label = novoStatus === 'pago' ? '✓ Pago' : 'Em aberto';
    toast(`Pagamento: ${label}`, 'ac');
    renderHistorico();
    renderDash();
  } catch (e) { erroToast(e); }
}

// ── Excluir pedido ─────────────────────────────────────────────────
function confirmarExcluirPedido(pedId) {
  const p = state.pedidos.find(x => x.id === pedId);
  if (!p) return;
  const aviso = p.status === 'finalizado'
    ? 'O estoque será devolvido automaticamente.'
    : 'Pedido pendente será removido.';
  confirmar(`Excluir ${fmtNumPed(p.numeroPedido)}?`, aviso, async () => {
    try {
      await PedidosAPI.excluirPedido(pedId);
      toast('Pedido excluído', 'ye');
      renderHistorico();
      renderDash();
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
          <div class="ped-card-client">${fmtNumPed(p.numeroPedido)} · ${p.cliente}</div>
          <div class="ped-card-date">${fmtDt(p.ts)}</div>
        </div>
        <div class="ped-card-right">
          <div class="ped-card-total">${R(p.total)}</div>
          <div class="ped-card-lucro">${p.status === 'finalizado' ? 'Lucro ' + R(p.lucro) : ''}</div>
        </div>
      </div>
      <div style="margin-bottom:8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <span class="status-badge status-${p.status}">${p.status === 'pendente' ? '⏳ PENDENTE' : '✓ FINALIZADO'}</span>
        ${badgePagamento(p.pagamentoStatus)}
      </div>
      <div class="ped-card-items">${p.itens.map(i => `${i.qtd}x ${nomeExibicao(i.nome, i.sabor)} — ${R(i.qtd * i.venda)}`).join('<br>')}</div>
      ${p.obs ? `<div style="font-size:11px;color:var(--tx3);font-family:var(--mono);margin-bottom:8px">${p.obs}</div>` : ''}
      <div class="btn-row" style="flex-wrap:wrap">
        <button class="btn btn-ghost btn-xs" onclick="editarPedido('${p.id}')">✏️ Editar</button>
        <button class="btn btn-ghost btn-xs" onclick="verMsgPedido('${p.id}')">📋 WhatsApp</button>
        <button class="btn btn-ghost btn-xs" onclick="togglePagamento('${p.id}')">${(p.pagamentoStatus || 'em_aberto') === 'pago' ? '↩ Em aberto' : '✓ Marcar pago'}</button>
        <button class="btn btn-re btn-xs" onclick="confirmarExcluirPedido('${p.id}')">🗑</button>
      </div>
    </div>`).join('');
}

// ══════════════════════════════════════════════════════════════════
// WHATSAPP
// ══════════════════════════════════════════════════════════════════
function gerarMsgPedido(pedido) {
  const numStr = pedido.numeroPedido ? fmtNumPed(pedido.numeroPedido) : '';
  const pagStr = (pedido.pagamentoStatus || 'em_aberto') === 'pago' ? 'Pago ✅' : 'Em aberto';
  const linhas = pedido.itens.map(i => `${i.qtd}x ${nomeExibicao(i.nome, i.sabor)} — ${R(i.qtd * i.venda)}`).join('\n');
  const obsStr = pedido.obs ? `\n\n_${pedido.obs}_` : '';
  const msg =
`Olá ${pedido.cliente}! 👋

Seu pedido ${numStr} foi registrado:

${linhas}

*Total: ${R(pedido.total)}*

Pagamento: ${pagStr}

Pix para pagamento:
Chave Pix: 44998207171
Nome: Thyago Monteiro Dorta de Souza${obsStr}

Obrigado pela preferência! 🙏`;
  abrirModalWA('Mensagem do pedido', pedido.cliente, msg);
}

function verMsgPedido(pedId) {
  const p = state.pedidos.find(x => x.id === pedId);
  if (p) gerarMsgPedido(p);
}

function gerarListaEstoque() {
  const disp = Object.values(state.prods).filter(p => p.estoque > 0)
    .sort((a, b) => nomeExibicao(a.nome, a.sabor).localeCompare(nomeExibicao(b.nome, b.sabor)));
  if (!disp.length) { toast('Estoque vazio', 're'); return; }
  const totalUn = disp.reduce((s, p) => s + p.estoque, 0);
  const hoje    = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Agrupa pela parte "nome" do produto (ignorando Importado)
  const grupos = {};
  disp.forEach(p => {
    const chave = p.nome === 'Importado' ? '—' : p.nome;
    (grupos[chave] ||= []).push(p);
  });

  let txt = `🔥 *PODS DISPONÍVEIS* 🔥\n_${hoje}_\n\n`;
  Object.keys(grupos).sort().forEach(nome => {
    txt += `*${nome}*\n`;
    grupos[nome].forEach(p => { txt += `${nomeExibicao(p.nome, p.sabor)} — ${p.estoque} un.\n`; });
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

function enviarWA() {
  const txt = document.getElementById('wa-text').textContent;
  if (!txt) { toast('Nada para enviar', 're'); return; }
  const url = 'https://wa.me/?text=' + encodeURIComponent(txt);
  window.open(url, '_blank');
  toast('Abrindo WhatsApp...', 'wa');
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
// PIN DE ACESSO
// ══════════════════════════════════════════════════════════════════
const APP_PIN = '5544';
let pinBuffer = '';

function estaAutenticado() {
  return sessionStorage.getItem('dortapods_auth') === '1';
}

function renderPinDots() {
  document.querySelectorAll('#pin-dots .pin-dot').forEach((d, i) => {
    d.classList.toggle('filled', i < pinBuffer.length);
  });
}

function pinPress(n) {
  if (estaAutenticado()) return;
  if (pinBuffer.length >= 4) return;
  pinBuffer += n;
  document.getElementById('pin-err').textContent = '';
  renderPinDots();
  if (pinBuffer.length === 4) setTimeout(validarPin, 140);
}

function pinBack() {
  pinBuffer = pinBuffer.slice(0, -1);
  renderPinDots();
}

function validarPin() {
  const screen = document.getElementById('pin-screen');
  if (pinBuffer === APP_PIN) {
    sessionStorage.setItem('dortapods_auth', '1');
    screen.classList.add('hide');
    document.getElementById('pin-err').textContent = '';
    pinBuffer = '';
  } else {
    document.getElementById('pin-err').textContent = 'PIN incorreto';
    const dots = document.getElementById('pin-dots');
    dots.classList.add('shake');
    setTimeout(() => {
      pinBuffer = '';
      renderPinDots();
      dots.classList.remove('shake');
    }, 380);
  }
}

document.addEventListener('keydown', (e) => {
  const screen = document.getElementById('pin-screen');
  if (!screen || screen.classList.contains('hide') || screen.style.display === 'none') return;
  if (e.key >= '0' && e.key <= '9') { pinPress(e.key); }
  else if (e.key === 'Backspace') { e.preventDefault(); pinBack(); }
});

// ══════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════
async function init() {
  updateTime();
  setInterval(updateTime, 30000);
  setLoading(true, 'Iniciando DortaPods...');

  state.prods = {};
  state.pedidos = [];
  state.entradas = [];
  state.movs = [];

  (async () => {
    try {
      await migrarLocalStorage().catch(() => {});
      await ProdAPI.carregarProdutos();
      await PedidosAPI.carregarPedidos().catch(() => {});
      await MovsAPI.carregarMovs().catch(() => {});
      await EntradasAPI.carregarEntradas().catch(() => {});

      renderDash();
      console.log('[Init] ✓ Dados carregados');
    } catch (e) {
      console.error('[Init] ERRO CRÍTICO:', e);
    }
  })();

  setTimeout(() => {
    setLoading(false);
    pedAtual = {
      id: uid(),
      cliente: '',
      obs: '',
      status: 'pendente',
      pagamentoStatus: 'em_aberto',
      numeroPedido: null,
      itens: [],
      total: 0,
      lucro: 0,
      ts: Date.now()
    };

    renderDash();
    renderEntrada();
    console.log('[Init] ✓ App pronto!');
  }, 500);
}

// ══════════════════════════════════════════════════════════════════
// EXPOR FUNÇÕES GLOBAIS (chamadas pelos onclick do HTML)
// ══════════════════════════════════════════════════════════════════
Object.assign(window, {
  // pin
  pinPress, pinBack,
  // nav
  goTo, novoPedido, editarPedido,
  // produtos
  filtrarProds, abrirModalProd, editarProd, salvarProduto, excluirProd,
  // entrada rápida
  entradaRapida, erAddQtd, confirmarEntradaRapida,
  // entrada
  renderEntrada, addLoteRow, remLoteRow,
  loteAC, selecionarLote, fechaLoteAC,
  confirmarEntrada, switchEntrada,
  processarLista, confirmarEntradaLista,
  // pedido
  renderProdutosParaPedido, adicionarProdutoRapido,
  pedBusca, selecionarPedProd, fechaAcPed, ajustarPedQtd, addItemPedido,
  editarPreco, pedQtd, remItemPed, salvarPedido, cancelarFinalizacao,
  togglePagamentoLocal,
  // histórico
  filtrarPedidos,
  // pagamento / exclusão
  togglePagamento, confirmarExcluirPedido,
  // whatsapp
  gerarMsgPedido, verMsgPedido, gerarListaEstoque, copiarWA, enviarWA,
  // modais
  fecharModal, fecharOverlay, confirmar,
});

init();
