// Ana Ribeiro · rodada 3 de design. Transição entre páginas sem tela branca, cursor "Ver imóvel" (só mouse),
// títulos revelados por máscara, parallax de no máximo 30 px nas fotos grandes e o botão de concierge no WhatsApp.
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
    q.dataset.cursor = 'Ver imóvel';
    q.addEventListener('click', function (e) { if (e.target.closest('button, a')) return; vaiPara(a.href); });
  });

  // ---------- 3. cursor "Ver imóvel" (só com mouse, telas a partir de 1024 px) ----------
  $$('a[href*="imovel-"]').forEach(function (a) { if ($('img', a)) a.dataset.cursor = 'Ver imóvel'; });
  $$('.cn-trilho').forEach(function (t) { t.dataset.cursor = 'Arraste'; });
  var fino = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)');
  if (fino.matches) {
    var cur = document.createElement('div'); cur.className = 'r3-cursor'; cur.setAttribute('aria-hidden', 'true'); cur.innerHTML = '<span></span>';
    body.appendChild(cur); body.classList.add('r3-mouse');
    var txt = $('span', cur), x = -200, y = -200, cx = -200, cy = -200, laco = 0, ativo = false;
    var passo = function () {
      cx += (x - cx) * .22; cy += (y - cy) * .22;
      if (calmo.matches || (Math.abs(x - cx) < .3 && Math.abs(y - cy) < .3)) { cx = x; cy = y; laco = 0; }
      cur.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      if (laco) laco = requestAnimationFrame(passo);
    };
    document.addEventListener('mousemove', function (e) {
      x = e.clientX; y = e.clientY;
      var alvo = e.target.closest && e.target.closest('[data-cursor]');
      var botao = e.target.closest && e.target.closest('button, a, input, select, textarea, label');
      var ok = !!alvo && (!botao || botao === alvo || !alvo.contains(botao));
      if (ok) { if (txt.textContent !== alvo.dataset.cursor) txt.textContent = alvo.dataset.cursor; if (!ativo) { cx = x; cy = y; } }
      if (ok !== ativo) { ativo = ok; cur.classList.toggle('on', ok); }
      if (!laco) laco = requestAnimationFrame(passo);
    }, { passive: true });
    document.addEventListener('mouseleave', function () { ativo = false; cur.classList.remove('on'); });
  }

  // ---------- 4. títulos revelados por máscara (700 ms, uma vez) ----------
  function presoOuFixo(el) {
    for (var p = el.parentElement; p && p !== body; p = p.parentElement) { var ps = getComputedStyle(p).position; if (ps === 'sticky' || ps === 'fixed') return true; }
    return false;
  }
  // (conferido pela posição na tela: o IntersectionObserver do Chrome conta o clip-path e nunca dispara num título todo mascarado)
  if (!calmo.matches) {
    var pendentes = $$('main h1, main h2').filter(function (h) {
      return !h.classList.contains('olho-h') && h.offsetParent && !h.closest('.cine, [data-galeria], [role=dialog], [hidden]') && !presoOuFixo(h) && getComputedStyle(h).transform === 'none';
    });
    pendentes.forEach(function (h) { h.classList.add('r3-t'); });
    var confere = function () {
      if (!pendentes.length) return;
      var vh = window.innerHeight, lote = 0, extra = d.classList.contains('r3-entra') ? .32 : 0;
      pendentes = pendentes.filter(function (h) {
        var r = h.getBoundingClientRect();
        if (r.top < vh * .94 && r.bottom > 0) {
          // os que chegam juntos entram em sequência curta; depois do véu, esperam o véu subir
          h.style.setProperty('--atraso', (lote++ * .09 + extra) + 's');
          h.classList.add('r3-v');
          return false;
        }
        return true;
      });
    };
    var pedeT = false;
    var agendaT = function () { if (!pedeT) { pedeT = true; requestAnimationFrame(function () { pedeT = false; confere(); }); } };
    window.addEventListener('scroll', agendaT, { passive: true }); window.addEventListener('resize', agendaT);
    requestAnimationFrame(confere);
  }

  // ---------- 5. parallax curto (no máximo 30 px de curso) nas fotos grandes ----------
  var fotos = [];
  function escolheFotos() {
    if (calmo.matches) return [];
    return $$('main img').filter(function (im) {
      var r = im.getBoundingClientRect(), pai = im.parentElement, ov = getComputedStyle(pai).overflow;
      return r.width >= window.innerWidth * .4 && r.height >= 260 && (ov === 'hidden' || ov === 'clip') &&
        !im.closest('.cine, .card, [data-galeria], [role=dialog], .t360, .plantas, .md-painel, a, button, .mp-svg') &&
        !presoOuFixo(im) && getComputedStyle(im).transform === 'none' && getComputedStyle(im).animationName === 'none';
    });
  }
  function parallax() {
    var vh = window.innerHeight, parado = body.classList.contains('parado');
    fotos.forEach(function (im) {
      var r = im.parentElement.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      var h = r.height || 1, k = (r.top + h / 2 - vh / 2) / (vh / 2 + h / 2);
      k = Math.max(-1, Math.min(1, k));
      im.style.transform = parado ? '' : 'translate3d(0,' + (-k * 15).toFixed(1) + 'px,0) scale(' + (1 + 34 / h).toFixed(3) + ')';
    });
  }
  window.addEventListener('load', function () {
    fotos = escolheFotos();
    fotos.forEach(function (im) { im.classList.add('r3-px'); });
    if (!fotos.length) return;
    var pedido = false;
    var agenda = function () { if (!pedido) { pedido = true; requestAnimationFrame(function () { pedido = false; parallax(); }); } };
    window.addEventListener('scroll', agenda, { passive: true }); window.addEventListener('resize', agenda);
    parallax();
  });

  // ---------- 6. concierge no WhatsApp (discreto; aparece depois da primeira tela) ----------
  var waImovel = $('.wa-fixo');
  var msg = waImovel ? waImovel.getAttribute('data-wa') : 'Olá, Ana! Estou no seu site e queria ajuda para encontrar um imóvel em Florianópolis.';
  var conc = document.createElement('a');
  conc.className = 'r3-conc'; conc.href = 'contato.html'; conc.setAttribute('data-wa', msg);
  conc.setAttribute('aria-label', 'Concierge: falar com a Ana no WhatsApp');
  conc.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2.5a9.4 9.4 0 0 0-8.1 14.2L2.6 21.5l4.9-1.3A9.4 9.4 0 1 0 12 2.5zm0 17.1a7.7 7.7 0 0 1-3.9-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A7.7 7.7 0 1 1 12 19.6zm4.3-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.3 6.3 0 0 1-3.1-2.7c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z"/></svg><span><small>Concierge</small>Falar com a Ana</span>';
  body.appendChild(conc);
  var mostraConc = function () { conc.classList.toggle('ver', window.scrollY > window.innerHeight * .5); };
  window.addEventListener('scroll', mostraConc, { passive: true }); mostraConc();
})();
