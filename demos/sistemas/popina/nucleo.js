// Popina · registro das telas e das ações, rota pelo endereço (#salao, #mesa/5...) e redesenho quando os dados mudam.
// Só as 5 abas de baixo são links (#salao, #pedidos, #cozinha, #caixa, #mais): as permissões da equipe escondem por elas.
// Dentro das telas, tudo é botão com data-ir (nunca link com #), para nenhum botão sumir para quem tem acesso limitado.
import { ouvir } from './loja.js?v=41';

export const TELAS = {};
export const ACOES = {};
export const registrar = (nome, tela) => { TELAS[nome] = tela; };
export const acao = (nome, f) => { ACOES[nome] = f; };
export const ABAS = ['salao', 'pedidos', 'cozinha', 'caixa', 'mais'];
export const ir = (h) => { if (location.hash.slice(1) === h) desenhar(); else location.hash = h; };
// este aparelho abre na última aba usada (o celular do garçom no Salão, o computador do caixa no Caixa, a TV na Cozinha)
export function inicio() { try { const a = localStorage.getItem('popina-aba'); return ABAS.includes(a) ? a : 'salao'; } catch { return 'salao'; } }
export function rota() {
  const h = decodeURIComponent(location.hash.slice(1)) || inicio(); const [nome, ...args] = h.split('/');
  return { nome: TELAS[nome] ? nome : inicio(), args };
}

let ultimo = '', y = 0;
export function desenhar(forcar = true) {
  const { nome, args } = rota(); const el = document.getElementById('tela'); const tela = TELAS[nome]; if (!tela) return;
  const chave = location.hash, trocou = chave !== ultimo;
  if (trocou) { y = 0; ultimo = chave; } else y = scrollY;
  // não redesenha enquanto a pessoa digita (outro aparelho mudou algo)
  const ativo = document.activeElement;
  if (!forcar && ativo && el.contains(ativo) && /INPUT|TEXTAREA|SELECT/.test(ativo.tagName)) return;
  el.innerHTML = tela.html(...args); el.dataset.tela = nome;
  const aba = tela.aba || nome;
  document.querySelectorAll('[data-aba]').forEach((a) => { const on = a.dataset.aba === aba; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (ABAS.includes(aba)) try { localStorage.setItem('popina-aba', aba); } catch { /* nada */ }
  tela.montar?.(el, ...args);
  if (trocou) { el.classList.remove('tela-entra'); void el.offsetWidth; el.classList.add('tela-entra'); }
  if (y) scrollTo(0, y); else if (trocou) scrollTo(0, 0);
  document.title = `${tela.titulo ? (typeof tela.titulo === 'function' ? tela.titulo(...args) : tela.titulo) + ' · ' : ''}${window.popinaPlano === 'marca' ? (window.popinaNome || 'Sistema') : 'Popina'}`;
  document.dispatchEvent(new CustomEvent('popina-tela', { detail: { nome, args } }));
}
export function iniciarRotas() {
  addEventListener('hashchange', () => desenhar(true));
  ouvir(() => desenhar(false));
  // relógio: os tempos de mesa e da cozinha andam sozinhos
  setInterval(() => { if (!document.querySelector('.folha-fundo')) desenhar(false); }, 20000);
  document.addEventListener('click', (e) => {
    const n = e.target.closest('[data-ir]'); if (n) { e.preventDefault(); ir(n.dataset.ir); return; }
    const b = e.target.closest('[data-acao]'); if (!b) return;
    const f = ACOES[b.dataset.acao]; if (!f) return; e.preventDefault(); f(b, e);
  });
  desenhar(true);
}
