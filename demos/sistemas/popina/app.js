// Popina · liga tudo: as 5 abas, a cor do restaurante, a marca (plano com a sua marca), a faixa da demonstração,
// o aviso de pedido novo e o primeiro uso.
import './salao.js?v=48';
import './pedidos.js?v=48';
import './cozinha.js?v=48';
import './caixa.js?v=48';
import './gestao.js?v=48';
import './cadastro.js?v=48';
import './relatorios.js?v=48';
import { esquema, comoUsar } from './configuracoes.js?v=48';
import { talvezAbrirInicio } from './inicio.js?v=48';
import { talvezPrimeiroAcesso } from './primeiro-acesso.js?v=48';
import { db, ouvir, CONTA, lojaCfg, corLoja, linkCardapio, recomecar, fila, t } from './loja.js?v=48';
import { iniciarRotas, ir } from './nucleo.js?v=48';
import { ico, toast, bip, confirma, $ } from './ui.js?v=48';
import { conferirNovos } from './cozinha.js?v=48';
import { montarMenu } from './menu.js?v=48';

const real = !!CONTA;
// ------------------------------------------------------------------ as 5 abas (links #: as permissões da equipe usam estes)
const ABAS = [['salao', 'Salão', 'mesa'], ['pedidos', 'Pedidos', 'sacola'], ['cozinha', 'Cozinha', 'chef'], ['caixa', 'Caixa', 'dinheiro'], ['mais', 'Gestão', 'grafico']];
// topo: Como usar esta tela (?) e Configurações (engrenagem), para todos (botões, não links: as permissões da equipe não escondem)
$('#topo-bts').innerHTML = `<button type="button" class="topo-bt topo-link so-cel" data-acao="link-delivery" aria-label="Meu link de delivery" title="Meu link de delivery">${ico('link')}<span>Meu link</span></button><button type="button" class="topo-bt" data-como-agora aria-label="Como usar esta tela" title="Como usar esta tela"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6"/><path d="M12 16.8v.2"/></svg><span>Como usar</span></button><button type="button" class="topo-bt" data-ir="mais/config" aria-label="Configurações" title="Configurações">${ico('ajustes')}<span>Configurações</span></button>`;
// no celular, a 5ª aba mostra "Menu" e abre a gaveta com as categorias (o nome da tela continua Gestão para as permissões)
$('#nav').innerHTML = ABAS.map(([h, n, i]) => (h === 'mais'
  ? `<a href="#${h}" data-aba="${h}"><span class="so-pc-i">${ico(i)}</span><span class="so-cel-i">${ico('menu')}</span><span data-cel="Menu">${n}</span><em data-cont="${h}"></em></a>`
  : `<a href="#${h}" data-aba="${h}">${ico(i)}<span>${n}</span><em data-cont="${h}"></em></a>`)).join('');
montarMenu();

// ------------------------------------------------------------------ cor do restaurante com leitura garantida (contraste AA)
const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const paraHex = (rgb) => '#' + rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('');
const escurece = (rgb, alvo, fundo) => { let c = [...rgb]; for (let k = 0; k < 40 && contraste(c, fundo) < alvo; k++) c = c.map((v) => v * 0.93); return c; };
function aplicarCor() {
  const base = hex(corLoja()), branco = [255, 255, 255], creme = [247, 246, 242];
  const bt = escurece(base, 4.6, branco), tinta = escurece(base, 5.2, creme);
  const r = document.documentElement.style, E = esquema();
  r.setProperty('--marrom', E.escuro); r.setProperty('--marrom2', E.escuro2);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', E.escuro);
  r.setProperty('--loja', paraHex(bt)); r.setProperty('--loja-txt', '#fff'); r.setProperty('--loja-tinta', paraHex(tinta));
  r.setProperty('--loja-suave', paraHex(base.map((v) => v * 0.16 + 255 * 0.84)));
}
// ------------------------------------------------------------------ topo: Popina, ou o logo e o nome do restaurante no plano com a sua marca
function marcaTopo() {
  const m = window.popinaPlano === 'marca', L = lojaCfg(), img = $('#topo-logo');
  window.popinaNome = db.config.nome;
  $('#topo-titulo').textContent = m ? db.config.nome || 'Restaurante' : 'Popina';
  $('#topo-nome').textContent = m ? db.config.cidade || '' : db.config.nome || '';
  const src = m && L.logo ? L.logo : 'simbolo.png?v=1';
  if (img.getAttribute('src') !== src) img.src = src;
  img.hidden = m && !L.logo;
  document.body.classList.toggle('marca-propria', m);
  // logo, capa e nome do restaurante (primeiro acesso / Configurações › Sua marca): no topo do sistema
  const id = $('#loja-id'), nome = db.config.nome || '';
  const html = (L.capa || L.logo) ? `${L.capa ? `<span class="loja-capa" style="background-image:url('${t(L.capa)}')"></span>` : ''}<span class="loja-lin">${L.logo ? `<span class="loja-logo" style="background-image:url('${t(L.logo)}')"></span>` : ''}${m ? '' : `<b>${t(nome)}</b>`}</span>` : '';
  if (id.dataset.h !== html) { id.innerHTML = html; id.dataset.h = html; }
  id.hidden = !html;
  document.body.classList.toggle('tem-loja-id', !!html);
}
addEventListener('popina-plano', () => { marcaTopo(); dispatchEvent(new HashChangeEvent('hashchange')); });
function contadores() {
  const coz = db.comandas.reduce((s, c) => s + c.itens.filter((i) => i.status === 'novo' && !i.cancelado).length, 0);
  const ped = db.comandas.filter((c) => c.tipo !== 'mesa').length;
  const cx = db.comandas.filter((c) => c.pediuConta).length;
  [['salao', fila().length], ['cozinha', coz], ['pedidos', ped], ['caixa', cx]].forEach(([k, n]) => { const e = $(`[data-cont="${k}"]`); if (e) e.textContent = n ? (n > 99 ? '99+' : n) : ''; });
  aplicarCor(); marcaTopo(); conferirNovos();
}
ouvir(contadores);
// pedido, chamado ou conta que chegou pelo cardápio online
addEventListener('popina-chegou', (e) => { bip(); toast(e.detail === 1 ? 'Chegou um pedido pelo cardápio online' : `Chegaram ${e.detail} pedidos pelo cardápio online`); });
// sem internet: guarda neste aparelho e sobe quando voltar
function conexao() {
  const on = navigator.onLine, el = $('#ao-vivo'); if (!el) return;
  el.classList.toggle('off', !on); el.innerHTML = on ? '<i></i>Ao vivo' : '<i></i>Sem internet';
  el.title = on ? 'Os aparelhos do restaurante se atualizam sozinhos' : 'O que você fizer fica guardado aqui e vai para os outros aparelhos quando a internet voltar';
}
addEventListener('online', conexao); addEventListener('offline', () => { conexao(); toast('Sem internet: o que você fizer fica guardado aqui'); }); conexao();

// ------------------------------------------------------------------ faixa da demonstração (some na conta real)
if (!real) {
  document.body.classList.add('demo');
  const f = document.createElement('div'); f.className = 'demo-faixa';
  f.innerHTML = `<a target="_top" href="../../../popina.html">← Voltar ao site</a><span class="sep">·</span><button type="button" data-recomecar>Recomeçar</button><span class="sep">·</span>
    <a href="${linkCardapio('mesa=4')}">Cardápio do cliente</a><span class="demo-rot"><b>Demonstração</b> · lanchonete de exemplo</span>`;
  document.body.prepend(f);
  f.querySelector('[data-recomecar]').onclick = async () => { if (!(await confirma('Recomeçar a demonstração? Tudo o que você fez volta ao exemplo do início.', 'Recomeçar', true))) return; recomecar(); ir('salao'); toast('Demonstração recomeçada'); };
}
aplicarCor(); marcaTopo();
iniciarRotas(); contadores();
// primeiro acesso do dono: nome, logo e capa (antes de qualquer tela); depois, os primeiros passos
talvezPrimeiroAcesso(() => talvezAbrirInicio());
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
