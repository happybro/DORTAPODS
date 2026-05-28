export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const R = v =>
  'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDt = ts => {
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
         d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const EMOJIS = {
  melancia:'🍉', morango:'🍓', manga:'🥭', uva:'🍇', limao:'🍋', menta:'🌿',
  abacaxi:'🍍', cereja:'🍒', kiwi:'🥝', coco:'🌴', tutti:'🍬', pessego:'🍑',
  mirtilo:'🫐', ice:'❄️', tangerina:'🍊', melao:'🍈', maracuja:'🌺',
  maca:'🍎', baunilha:'🍦', caramelo:'🍮', hortela:'🌿',
};

export function emojiSabor(sabor) {
  const s = sabor.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [k, e] of Object.entries(EMOJIS)) if (s.includes(k)) return e;
  return '🔮';
}

let _toastTimer;
export function toast(msg, tipo = 'ac') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 't-' + tipo + ' on';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('on'), 2800);
}

export function erroToast(err) {
  console.error('[PodManager]', err);
  const msg = String(err?.message || err || 'Erro desconhecido');
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network')) {
    toast('Sem conexão. Verifique a internet.', 're');
  } else if (msg.includes('JWT') || msg.includes('anon key')) {
    toast('Erro de autenticação — revise config.js', 're');
  } else if (msg.includes('timeout')) {
    toast('Tempo esgotado — tente novamente', 're');
  } else if (msg.includes('Estoque insuficiente')) {
    toast(msg, 're');
  } else {
    toast('Erro: ' + msg.slice(0, 70), 're');
  }
}

export function sanitize(str) {
  return String(str || '').trim().slice(0, 200);
}
