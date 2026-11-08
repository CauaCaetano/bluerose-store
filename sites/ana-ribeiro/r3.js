// Ana Ribeiro · rodada 3 de design. Transição entre páginas sem tela branca, foto do destaque que leva ao imóvel
// e o botão de concierge no WhatsApp. (Cursor personalizado e revelação de títulos foram retirados a pedido do dono.)
// A galeria horizontal do imóvel fica em site.js (bloco data-cine). Tudo respeita prefers-reduced-motion.
(function () {
  'use strict';
  var d = document.documentElement, body = document.body;
  var calmo = window.matchMedia('(prefers-reduced-motion: reduce)');
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var pasta = location.pathname.replace(/[^\/]*$/, '');

  // ---------- 1. transição entre páginas ----------
  if (d.classList.contains('r3-entra')) setTimeout(function () { d.classList.remove('r3-entra'); }, 900);
  window.addEventListener('pageshow', function (e) { if (e.persisted) d.classList.remove('r3-sai', 'r3-entra'); });
  function paginaDoSite(a) {
    if (!a || a.hasAttribute('download') || a.hasAttribute('data-wa')) return null;
    if (a.target && a.target !== '_self') return null;
    var h = a.getAttribute('href'); if (!h || h.charAt(0) === '#') return null;
    var u; try { u = new URL(a.href, location.href); } catch (e) { return null; }
    if (u.origin !== location.origin || u.pathname.indexOf(pasta) !== 0) return null;
    if (!/(\.html|\/)$/.test(u.pathname)) return null;
    if (u.pathname === location.pathname && u.search === location.search) return null; // âncora na mesma página
    return u.href;
  }
  function vaiPara(url) {
    if (calmo.matches) { location.href = url; return; }
    try { sessionStorage.setItem('ana-troca', '1'); } catch (e) {}
    d.classList.remove('r3-entra'); d.classList.add('r3-sai');
    setTimeout(function () { location.href = url; }, 520);
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var url = paginaDoSite(e.target.closest('a[href]'));
    if (!url || calmo.matches) return;
    e.preventDefault(); vaiPara(url);
  });

  // ---------- 2. foto do destaque (home) leva ao imóvel ----------
  var legs = $$('#destaques .g-leg');
  $$('#destaques .g-q').forEach(function (q, k) {
    var a = legs[k] && $('a[href^="imovel-"]', legs[k]); if (!a) return;
    q.classList.add('r3-link');
    q.addEventListener('click', function (e) { if (e.target.closest('button, a')) return; vaiPara(a.href); });
  });

  // ---------- 5. parallax: agora em camadas, em r5.js ----------

  // ---------- 6. concierge no WhatsApp (discreto; aparece depois da primeira tela) ----------
  var waImovel = $('.wa-fixo');
  var msg = waImovel ? waImovel.getAttribute('data-wa') : 'Olá, Ana! Estou no seu site e queria ajuda para encontrar um imóvel em Florianópolis.';
  var conc = document.createElement('a');
  conc.className = 'r3-conc'; conc.href = 'contato.html'; conc.setAttribute('data-wa', msg);
  conc.setAttribute('aria-label', 'Concierge: falar com a Ana no WhatsApp');
  conc.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2.5a9.4 9.4 0 0 0-8.1 14.2L2.6 21.5l4.9-1.3A9.4 9.4 0 1 0 12 2.5zm0 17.1a7.7 7.7 0 0 1-3.9-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A7.7 7.7 0 1 1 12 19.6zm4.3-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.3 6.3 0 0 1-3.1-2.7c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z"/></svg><span><small>Concierge</small>Falar com a Ana</span>';
  body.appendChild(conc);
  // no celular ele só aparece quando a pessoa sobe a página (ou chega ao fim), para não ficar por cima do texto durante a leitura
  var celular = window.matchMedia('(max-width: 900px)'), ultimoY = window.scrollY, subindo = false;
  var mostraConc = function () {
    var y = window.scrollY, fim = y + window.innerHeight >= document.documentElement.scrollHeight - 80;
    if (Math.abs(y - ultimoY) > 6) { subindo = y < ultimoY; ultimoY = y; }
    conc.classList.toggle('ver', y > window.innerHeight * .5 && (!celular.matches || subindo || fim));
  };
  window.addEventListener('scroll', mostraConc, { passive: true }); mostraConc();
})();
