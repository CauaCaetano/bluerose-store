/*
 * Veltria · folga para os botões flutuantes e barras fixas dos sistemas (demos/sistemas/...).
 *  - O globo de idioma (canto de baixo, à esquerda) sobe acima da barra de navegação do sistema, se houver uma ali.
 *  - A página ganha espaço no fim, do tamanho das barras e botões fixos de baixo: o último botão da tela
 *    sempre dá para rolar até ficar acima deles, em vez de ficar escondido embaixo.
 * Recalcula ao abrir, ao mudar de tela (hash), ao clicar e ao redimensionar.
 */
(function () {
  'use strict';
  if (window.__veltriaFolga || !/\/demos\/sistemas\//.test(location.pathname)) return;
  window.__veltriaFolga = 1;
  var NOSSOS = '.br-idi,.vk-mais,.vk-menu,.vk-toast,.vk-lado,.vc-veu,.ved,dialog,[role=dialog],[role=alertdialog],.veu,.veu-a,.sombra,.toast,#toasts,#avisos,#recados,.aviso,.recado,.vk-ia';
  var orig = new WeakMap();

  function fixosEmBaixo() {
    var H = innerHeight, l = [];
    document.querySelectorAll('body *').forEach(function (el) {
      var cs = getComputedStyle(el);
      if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return;
      if (el.matches(NOSSOS) || el.closest(NOSSOS)) return;
      var b = el.getBoundingClientRect();
      if (b.width < 8 || b.height < 8 || b.top < H * 0.5 || b.bottom < H - 220) return;
      l.push(b);
    });
    return l;
  }

  function folgaEm(el, px) {
    if (!orig.has(el)) orig.set(el, parseFloat(getComputedStyle(el).paddingBottom) || 0);
    var v = Math.max(orig.get(el), px);
    if (Math.abs((parseFloat(el.style.paddingBottom) || 0) - v) > 1) el.style.paddingBottom = v + 'px';
  }

  function ajustar() {
    var H = innerHeight, W = innerWidth;
    // globo na barra de demonstração que sumiu (modo conta troca a barra): volta a flutuar
    var gb = document.querySelector('.br-idi.na-barra');
    if (gb && !gb.offsetParent) { gb.classList.remove('na-barra'); gb.classList.add('solto'); document.body.appendChild(gb); }
    // globo solto e a barra de demonstração apareceu depois (sistemas que desenham a tela inteira): vai para a barra
    var gs = document.querySelector('.br-idi.solto'), rc = document.querySelector('#recomecar, [data-acao="recomecar"], [data-recomecar]');
    if (gs && rc && rc.parentElement && rc.offsetParent) { gs.classList.remove('solto'); gs.classList.add('na-barra'); gs.style.bottom = ''; rc.parentElement.appendChild(gs); if (getComputedStyle(rc.parentElement).display.indexOf('flex') >= 0) rc.parentElement.style.flexWrap = 'wrap'; }
    var barras = fixosEmBaixo();
    // 1) globo de idioma: sobe acima do que estiver fixo embaixo, na mesma coluna
    var g = document.querySelector('.br-idi.solto');
    if (g) {
      var base = document.querySelector('.site-de-teste') ? 46 : 12, alto = base, gl = 12, gr = 12 + (g.offsetWidth || 80);
      barras.forEach(function (b) { if (b.left < gr && b.right > gl) alto = Math.max(alto, H - b.top + 10); });
      g.style.bottom = alto + 'px';
    }
    // 2) espaço no fim da página: altura de tudo que é fixo embaixo (barras, globo, botão +)
    var topo = H;
    barras.forEach(function (b) { topo = Math.min(topo, b.top); });
    document.querySelectorAll('.br-idi.solto, .vk-mais').forEach(function (e) { var b = e.getBoundingClientRect(); if (b.height && getComputedStyle(e).display !== 'none') topo = Math.min(topo, b.top); });
    var px = Math.round(H - topo + 16);
    if (px <= 16) return;
    var doc = document.scrollingElement || document.documentElement;
    if (doc.scrollHeight > H + 4) folgaEm(document.body, px);
    // sistemas que rolam por dentro (painel com rolagem própria): a folga vai no painel
    document.querySelectorAll('main, [role=main], #tela, #palco, #miolo, #app, .conteudo, .principal, section, div').forEach(function (el) {
      if (el === document.body || el.closest(NOSSOS)) return;
      var cs = getComputedStyle(el);
      if (!/(auto|scroll)/.test(cs.overflowY) || el.clientHeight < H * 0.45 || el.scrollHeight <= el.clientHeight + 4) return;
      var b = el.getBoundingClientRect(); if (b.bottom < topo - 4) return; // termina antes das barras: não precisa
      folgaEm(el, px);
    });
  }

  var t = 0;
  function depois(ms) { clearTimeout(t); t = setTimeout(ajustar, ms || 120); }
  function iniciar() { ajustar(); setTimeout(ajustar, 900); setTimeout(ajustar, 2500); }
  if (document.readyState === 'complete') iniciar(); else addEventListener('load', iniciar);
  addEventListener('resize', function () { depois(150); });
  addEventListener('hashchange', function () { depois(150); });
  document.addEventListener('click', function () { depois(350); }, true);
})();
