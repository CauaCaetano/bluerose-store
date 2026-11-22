// Popina · peças da interface: ícones, folha que sobe de baixo, aviso rápido, confirmação.
const t = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const P = {
  salao: '<path d="M4 20V10l8-6 8 6v10"/><path d="M9 20v-6h6v6"/>',
  pedidos: '<path d="M6 3h12l-1 18H7L6 3z"/><path d="M9 7h6M9 11h6"/>',
  cozinha: '<path d="M5 11h14v3a7 7 0 0 1-14 0v-3z"/><path d="M9 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4"/>',
  caixa: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M3 11h18M7 15h3"/>',
  mais: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  mais2: '<path d="M12 5v14M5 12h14"/>', fechar: '<path d="M6 6l12 12M18 6L6 18"/>', voltar: '<path d="M15 5l-7 7 7 7"/>',
  dir: '<path d="M9 5l7 7-7 7"/>', check: '<path d="M5 12.5l4.5 4.5L19 7"/>', sino: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  conta: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 8h6M9 12h6M9 16h3"/>', prato: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  qr: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',
  moto: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M9 17h6l-2-7h3l2 3M6 14l3-5h3"/>', sacola: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  estoque: '<path d="M4 8l8-4 8 4-8 4-8-4z"/><path d="M4 8v8l8 4 8-4V8"/><path d="M12 12v8"/>', grafico: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  cardapio: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M9 9h5M9 13h5"/>', ajustes: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3.9a7.7 7.7 0 0 0-2.6-1.5L14.2 2.5h-4l-.4 2.5a7.7 7.7 0 0 0-2.6 1.5l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-.9a7.7 7.7 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.7 7.7 0 0 0 2.6-1.5l2.3.9 2-3.4z"/>',
  pix: '<path d="M12 3l9 9-9 9-9-9 9-9z"/><path d="M8 12h8"/>', dinheiro: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  cartao: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>', zap: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20z"/>',
  lixo: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>', relogio: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>', busca: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  troca: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>', pessoas: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 20c0-2.6 1.6-4.6 4-4.6"/>',
  impressora: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/>', planta: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><circle cx="16" cy="8" r="2"/><rect x="6" y="14" width="4" height="4"/><circle cx="16" cy="16" r="2"/>',
  ao_vivo: '<circle cx="12" cy="12" r="3"/><path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4"/>', divide: '<path d="M12 3v18M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
  // ícones do conceito do salão (GPT)
  mesa: '<path d="M3 9.5h18M6 9.5V20M18 9.5V20M9 9.5v5.5M15 9.5v5.5M4.5 9.5L6 6h12l1.5 3.5"/>',
  cloche: '<path d="M3 18h18M5 18a7 7 0 0 1 14 0"/><path d="M12 11v-1.5M10.5 9.5h3"/><path d="M10 3.5c-.5.7.5 1.2 0 2M14 3.5c-.5.7.5 1.2 0 2"/>',
  moedas: '<ellipse cx="10" cy="6" rx="5.5" ry="2.2"/><path d="M4.5 6v3c0 1.2 2.5 2.2 5.5 2.2s5.5-1 5.5-2.2V6M4.5 9v3c0 1.2 2.5 2.2 5.5 2.2"/><ellipse cx="14" cy="14" rx="5.5" ry="2.2"/><path d="M8.5 14v3c0 1.2 2.5 2.2 5.5 2.2s5.5-1 5.5-2.2v-3"/>',
  etiqueta: '<path d="M3.5 12.5V4.5h8l9 9-8 8-9-9z"/><circle cx="8" cy="9" r="1.5"/>',
  calendario: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  louro: '<path d="M12 21c-4-1.5-6.8-5-7.4-10M12 21c4-1.5 6.8-5 7.4-10"/><path d="M5 14c-1.6-.4-2.4-1.6-2.4-3 1.5 0 2.5 1 2.4 3zM4.6 10.6c-1.4-.8-1.8-2.1-1.4-3.4 1.4.4 2 1.6 1.4 3.4zM5.4 7.4C4.4 6.3 4.4 5 5.1 3.9c1.1.8 1.2 2.1.3 3.5zM7.6 17.6c-1.7.1-2.8-.8-3.2-2.1 1.5-.4 2.7.4 3.2 2.1zM19 14c1.6-.4 2.4-1.6 2.4-3-1.5 0-2.5 1-2.4 3zM19.4 10.6c1.4-.8 1.8-2.1 1.4-3.4-1.4.4-2 1.6-1.4 3.4zM18.6 7.4c1-1.1 1-2.4.3-3.5-1.1.8-1.2 2.1-.3 3.5zM16.4 17.6c1.7.1 2.8-.8 3.2-2.1-1.5-.4-2.7.4-3.2 2.1z"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  // ícones do conceito da cozinha e do cardápio (GPT)
  chef: '<path d="M7 14.5A4 4 0 0 1 6.5 6.6 5 5 0 0 1 16 5.5a4 4 0 0 1 1 9"/><path d="M7 14.5h10V19H7z"/>',
  taca: '<path d="M7 3h10l-.5 5a4.5 4.5 0 0 1-9 0L7 3z"/><path d="M12 12.5V20M8.5 20h7M7.3 7h9.4"/>',
  telacheia: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  alerta: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.5M12 16.2v.3"/>',
  fala: '<path d="M5 18.5l1.2-3.4A7 7 0 1 1 9 18l-4 .5z"/>',
  okcirc: '<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><path d="M7.8 12.3l2.8 2.8 5.6-5.8" stroke="#fff" stroke-width="2.2"/>',
  coroa: '<path d="M4 17l-1-9 5 4 4-6 4 6 5-4-1 9H4z"/><path d="M4 20h16"/>',
  folha: '<path d="M5 19C5 10 10 5 20 4c-1 10-6 15-15 15z"/><path d="M5 19L13 11"/>',
  carrinho: '<path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H7"/><circle cx="9.5" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
  pino: '<path d="M12 21s-6.5-5.8-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.2 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.3"/>',
  loja: '<path d="M4 10h16M5 10V20h14V10M4 10l1.5-5h13L20 10"/><path d="M10 20v-5h4v5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  cofre: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 11h18M10 14h4"/>',
};
export const ico = (n, extra = '') => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" ${extra}>${P[n] || ''}</svg>`;

// folha (bottom sheet no celular, painel lateral no computador)
export function folha({ titulo, corpo, pe = '', larga = false, aoAbrir, aoFechar }) {
  const f = document.createElement('div'); f.className = 'folha-fundo';
  f.innerHTML = `<section class="folha ${larga ? 'larga' : ''}" role="dialog" aria-modal="true" aria-label="${titulo.replace(/"/g, '&quot;')}">
    <header class="folha-cab"><h2>${titulo}</h2><button type="button" class="bt-ico" data-fechar aria-label="Fechar">${ico('fechar')}</button></header>
    <div class="folha-corpo">${corpo}</div>${pe ? `<footer class="folha-pe">${pe}</footer>` : ''}</section>`;
  document.body.appendChild(f); requestAnimationFrame(() => f.classList.add('aberta'));
  const fechar = () => { f.classList.remove('aberta'); setTimeout(() => f.remove(), 220); aoFechar?.(); document.removeEventListener('keydown', esc); };
  const esc = (e) => { if (e.key === 'Escape') fechar(); };
  document.addEventListener('keydown', esc);
  f.addEventListener('click', (e) => { if (e.target === f || e.target.closest('[data-fechar]')) fechar(); });
  aoAbrir?.(f, fechar);
  setTimeout(() => f.querySelector('input:not([type=hidden]), button:not([data-fechar])')?.focus?.({ preventScroll: true }), 60);
  return { el: f, fechar };
}
let tt = 0;
export function toast(msg) {
  let el = $('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('on'), 2600);
}
export function confirma(msg, sim = 'Confirmar', perigo = false) {
  return new Promise((ok) => {
    folha({ titulo: msg, corpo: '', pe: `<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt ${perigo ? 'perigo' : 'cheio'}" data-sim>${sim}</button>`,
      aoAbrir: (f, fechar) => { $('[data-sim]', f).onclick = () => { ok(true); fechar(); }; }, aoFechar: () => ok(false) });
  });
}
// motivo (sugestões + texto livre) e Senha do gerente numa folha só; devolve { motivo, el } ou null se a pessoa voltou
export function autorizar({ titulo, texto = '', motivos = null, pedirPin = false, sim = 'Confirmar', perigo = false, extra = '' }) {
  return new Promise((ok) => {
    let feito = false;
    folha({ titulo, corpo: `${texto ? `<p class="mudo">${texto}</p>` : ''}${extra}
      ${motivos ? `<div class="campo"><span>Motivo</span><div class="chips quebra">${motivos.map((m) => `<button type="button" class="chip" data-mot="${t(m)}">${t(m)}</button>`).join('')}</div>
        <input data-motivo maxlength="140" placeholder="Ou escreva o motivo" aria-label="Motivo"></div>` : ''}
      ${pedirPin ? `<label class="campo"><span>Senha do gerente</span><input data-pin type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="4 números"></label>` : ''}`,
    pe: `<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt ${perigo ? 'perigo' : 'cheio'}" data-sim>${sim}</button>`,
    aoFechar: () => { if (!feito) ok(null); },
    aoAbrir: (f, fechar) => {
      const mot = $('[data-motivo]', f);
      $$('[data-mot]', f).forEach((b) => { b.onclick = () => { $$('[data-mot]', f).forEach((x) => x.classList.toggle('on', x === b)); mot.value = b.dataset.mot; }; });
      $('[data-sim]', f).onclick = async () => {
        const { pinConfere } = await import('./loja.js?v=50');
        const motivo = mot ? mot.value.trim() : '';
        if (mot && motivo.length < 3) { toast('Escolha ou escreva o motivo'); return mot.focus(); }
        const pin = $('[data-pin]', f);
        // vale a senha do gerente ou o PIN pessoal de quem é Gerente na Equipe
        const { pinDeGerente } = await import('./equipe.js?v=50');
        if (pin && !pinConfere(pin.value) && !pinDeGerente(pin.value)) { toast('Senha errada'); pin.value = ''; return pin.focus(); }
        feito = true; ok({ motivo, pin: !!pin, el: f }); fechar();
      };
    } });
  });
}
// som curto (pedido novo na cozinha, prato pronto no garçom), só depois de algum toque na tela
let ac = null;
export function bip(tom = 880) {
  try { ac ||= new AudioContext(); const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = tom; o.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.35);
    o.start(); o.stop(ac.currentTime + 0.4); } catch { /* sem som */ }
}
