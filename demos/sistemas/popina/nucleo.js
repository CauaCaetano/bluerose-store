// Popina · registro das telas e das ações, rota pelo endereço (#salao, #mesa/5...) e redesenho quando os dados mudam.
import { ouvir } from './loja.js?v=18';

export const TELAS = {};
export const ACOES = {};
export const registrar = (nome, tela) => { TELAS[nome] = tela; };
export const acao = (nome, f) => { ACOES[nome] = f; };
export const ir = (h) => { if (location.hash.slice(1) === h) desenhar(); else location.hash = h; };
export function rota() {
  const h = decodeURIComponent(location.hash.slice(1)) || inicio(); const [nome, ...args] = h.split('/');
  return { nome: TELAS[nome] ? nome : inicio(), args };
}
// o papel deste aparelho (garçom, cozinha, caixa, dono) decide a tela inicial; guardado no aparelho
export const PAPEIS = { garcom: ['Garçom', 'salao'], cozinha: ['Cozinha', 'cozinha'], caixa: ['Caixa', 'caixa'], dono: ['Dono', 'salao'] };
// a aba pode ter papel próprio (?papel=cozinha), para a demonstração mostrar dois aparelhos lado a lado
export function papel() { try { return sessionStorage.getItem('popina-papel') || localStorage.getItem('popina-papel') || ''; } catch { return ''; } }
export function setPapel(p, soEstaAba = false) { try { sessionStorage.setItem('popina-papel', p); if (!soEstaAba) localStorage.setItem('popina-papel', p); } catch { /* nada */ } }
export const inicio = () => (PAPEIS[papel()] || PAPEIS.garcom)[1];

let ultimo = '', y = 0;
export function desenhar(forcar = true) {
  const { nome, args } = rota(); const el = document.getElementById('tela'); const tela = TELAS[nome];
  const chave = location.hash;
  if (chave !== ultimo) { y = 0; ultimo = chave; } else y = scrollY;
  // não redesenhar enquanto a pessoa digita (outra aba mudou algo): só o que não for campo
  const ativo = document.activeElement;
  if (!forcar && ativo && el.contains(ativo) && /INPUT|TEXTAREA|SELECT/.test(ativo.tagName)) return;
  el.innerHTML = tela.html(...args); el.dataset.tela = nome;
  document.querySelectorAll('[data-aba]').forEach((a) => a.classList.toggle('on', a.dataset.aba === (tela.aba || nome)));
  tela.montar?.(el, ...args);
  if (y) scrollTo(0, y);
  document.title = `${tela.titulo ? tela.titulo + ' · ' : ''}${window.popinaPlano === 'marca' ? (window.popinaNome || 'Sistema') : 'Popina'}`;
}
export function iniciarRotas() {
  addEventListener('hashchange', () => desenhar(true));
  ouvir(() => desenhar(false));
  // relógio: tempos de mesa e da cozinha andam sozinhos
  setInterval(() => { if (!document.querySelector('.folha-fundo')) desenhar(false); }, 20000);
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-acao]'); if (!b) return;
    const f = ACOES[b.dataset.acao]; if (!f) return; e.preventDefault(); f(b, e);
  });
  desenhar(true);
}
