// Popina · sons do sistema (22/11/2026), feitos na hora pelo navegador (Web Audio): nenhum arquivo, nada de fora.
// Curtos e baixos. Liga/desliga e volume valem só neste aparelho (localStorage 'popina-som' e 'popina-som-vol').
// O navegador só deixa tocar depois do primeiro toque na tela: o AudioContext nasce nesse toque.
// Usado pelo sistema (app.html) e pelo cardápio do cliente (cardapio.html, chave própria 'popina-som-cli').
const ler = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } };
const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem espaço: fica só nesta visita */ } };

let CH = 'popina-som', avisos = true;
// cardápio do cliente: chave própria e só os sons escolhidos (os avisos de texto não tocam)
export function chaveSom(k, comAvisos = true) { CH = k; avisos = comAvisos; }
export const avisosComSom = () => avisos;
export const somLigado = () => ler(CH, '1') !== '0';
export const volume = () => { const v = Number(ler(CH + '-vol', '0.6')); return Number.isFinite(v) ? Math.max(0.1, Math.min(1, v)) : 0.6; };
export function setSom(on) { gravar(CH, on ? '1' : '0'); dispatchEvent(new CustomEvent('popina-som', { detail: on })); if (on) toque(); }
export function setVolume(v) { gravar(CH + '-vol', String(Math.max(0.1, Math.min(1, Number(v) || 0.6)))); }

let ac = null, liberado = false;
function contexto() {
  if (!liberado) return null;
  try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; } catch { return null; }
}
const libera = () => { liberado = true; contexto(); removeEventListener('pointerdown', libera, true); removeEventListener('keydown', libera, true); };
addEventListener('pointerdown', libera, true); addEventListener('keydown', libera, true);

// uma nota: frequência, início (s), duração (s), força (0–1), forma da onda
function nota(c, f, ini, dur, forca = 1, tipo = 'sine') {
  const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + ini, pico = 0.16 * volume() * forca;
  o.type = tipo; o.frequency.setValueAtTime(f, t0); o.connect(g); g.connect(c.destination);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, pico), t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function tocar(notas) {
  if (!somLigado()) return;
  const c = contexto(); if (!c) return;
  try { notas.forEach((n) => nota(c, ...n)); } catch { /* sem som */ }
}
let ultimoNovo = 0;
// toque leve: confirmar, adicionar item
export const toque = () => tocar([[1320, 0, 0.07, 0.45, 'triangle']]);
// enviado para a cozinha: duas notas subindo
export const enviado = () => tocar([[660, 0, 0.12, 0.7, 'triangle'], [990, 0.08, 0.18, 0.7, 'triangle']]);
// sino de pedido novo (cozinha, pedidos online): ding-dong; não repete em menos de 1,5 s
export function novo() { const a = Date.now(); if (a - ultimoNovo < 1500) return; ultimoNovo = a; tocar([[988, 0, 0.5, 1], [1976, 0, 0.25, 0.25], [784, 0.22, 0.6, 1], [1568, 0.22, 0.3, 0.2]]); }
// prato pronto (salão/garçom): três notas claras
export const pronto = () => tocar([[784, 0, 0.16, 0.8], [988, 0.1, 0.16, 0.8], [1319, 0.2, 0.35, 0.8]]);
// pagamento recebido / caixa fechado: acorde curto
export const caixa = () => tocar([[1047, 0, 0.4, 0.6], [1319, 0.05, 0.4, 0.5], [1568, 0.1, 0.5, 0.5]]);
// erro discreto: nota grave e curta
export const erro = () => tocar([[220, 0, 0.16, 0.7, 'triangle'], [185, 0.09, 0.18, 0.6, 'triangle']]);
// compatível com o bip antigo (um tom solto)
export const tom = (f = 880) => tocar([[f, 0, 0.35, 1]]);

// botão de alto-falante (topo do sistema, cardápio do cliente)
const ICO_ON = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
const ICO_OFF = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
export function pintarBotao(b) {
  const on = somLigado();
  b.querySelector('[data-som-ico]').innerHTML = on ? ICO_ON : ICO_OFF;
  b.setAttribute('aria-pressed', String(!on));
  b.setAttribute('aria-label', on ? 'Sons ligados: tocar para silenciar' : 'Sons desligados: tocar para ligar');
  b.title = on ? 'Silenciar os sons' : 'Ligar os sons';
  const s = b.querySelector('[data-som-txt]'); if (s) s.textContent = on ? 'Som' : 'Mudo';
}
export function ligarBotao(b) {
  pintarBotao(b);
  b.addEventListener('click', (e) => { e.preventDefault(); setSom(!somLigado()); });
  addEventListener('popina-som', () => pintarBotao(b));
}
