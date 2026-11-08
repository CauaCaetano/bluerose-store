// Ana Ribeiro · rodada 6. Player de vídeo próprio (tocar/pausar, som, progresso, tela cheia) no lugar dos controles do
// navegador, e a barra de WhatsApp do imóvel no celular que some ao descer e volta ao subir (não cobre os títulos).
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var IC = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
    pausa: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>',
    som: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9.5h4l5-4v13l-5-4H4z" fill="currentColor" stroke="none"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
    mudo: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9.5h4l5-4v13l-5-4H4z" fill="currentColor" stroke="none"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/></svg>',
    cheia: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>'
  };
  var tempo = function (s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); };

  // ---------- player próprio ----------
  $$('video.md-video').forEach(function (v) {
    v.removeAttribute('controls'); v.controls = false; v.setAttribute('playsinline', ''); v.preload = 'metadata';
    var caixa = document.createElement('div'); caixa.className = 'vp';
    v.parentNode.insertBefore(caixa, v); caixa.appendChild(v);
    caixa.insertAdjacentHTML('beforeend',
      '<button type="button" class="vp-grande" aria-label="Tocar o vídeo">' + IC.play + '</button>' +
      '<div class="vp-barra">' +
        '<button type="button" class="vp-bt vp-tocar" aria-label="Tocar">' + IC.play + '</button>' +
        '<div class="vp-prog" role="slider" tabindex="0" aria-label="Posição do vídeo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0:00"><span></span><i></i></div>' +
        '<span class="vp-tempo">0:00</span>' +
        '<button type="button" class="vp-bt vp-som" aria-label="Tirar o som" aria-pressed="false">' + IC.som + '</button>' +
        '<button type="button" class="vp-bt vp-cheia" aria-label="Ver o vídeo em tela cheia">' + IC.cheia + '</button>' +
      '</div>');
    var grande = $('.vp-grande', caixa), tocar = $('.vp-tocar', caixa), prog = $('.vp-prog', caixa), barra = $('span', prog), bola = $('i', prog), rot = $('.vp-tempo', caixa), som = $('.vp-som', caixa), cheia = $('.vp-cheia', caixa);
    function alterna() { if (v.paused || v.ended) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); }
    function pinta() {
      var d = v.duration || 0, t = v.currentTime || 0, k = d ? t / d : 0;
      barra.style.transform = 'scaleX(' + k + ')'; bola.style.left = (k * 100) + '%';
      rot.textContent = tempo(t) + (d ? ' / ' + tempo(d) : '');
      prog.setAttribute('aria-valuenow', String(Math.round(k * 100))); prog.setAttribute('aria-valuetext', tempo(t) + (d ? ' de ' + tempo(d) : ''));
    }
    function estado() {
      var on = !v.paused && !v.ended;
      caixa.classList.toggle('tocando', on);
      tocar.innerHTML = on ? IC.pausa : IC.play; tocar.setAttribute('aria-label', on ? 'Pausar' : 'Tocar');
    }
    grande.addEventListener('click', alterna); tocar.addEventListener('click', alterna); v.addEventListener('click', alterna);
    ['play', 'pause', 'ended'].forEach(function (ev) { v.addEventListener(ev, estado); });
    ['timeupdate', 'loadedmetadata', 'durationchange', 'seeked'].forEach(function (ev) { v.addEventListener(ev, pinta); });
    som.addEventListener('click', function () { v.muted = !v.muted; som.innerHTML = v.muted ? IC.mudo : IC.som; som.setAttribute('aria-pressed', String(v.muted)); som.setAttribute('aria-label', v.muted ? 'Ligar o som' : 'Tirar o som'); });
    cheia.addEventListener('click', function () { var alvo = caixa.requestFullscreen ? caixa : v; if (document.fullscreenElement) document.exitFullscreen(); else if (alvo.requestFullscreen) alvo.requestFullscreen().catch(function () {}); else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen(); });
    function vaiPara(x) {
      var r = prog.getBoundingClientRect(), k = Math.max(0, Math.min(1, (x - r.left) / r.width));
      var ir = function () { if (v.duration) { v.currentTime = k * v.duration; pinta(); } };
      if (v.readyState >= 1) ir(); else { v.preload = 'metadata'; v.addEventListener('loadedmetadata', ir, { once: true }); v.load(); }
    }
    var arrasta = false;
    prog.addEventListener('pointerdown', function (e) { arrasta = true; try { prog.setPointerCapture(e.pointerId); } catch (er) {} vaiPara(e.clientX); });
    prog.addEventListener('pointermove', function (e) { if (arrasta) vaiPara(e.clientX); });
    prog.addEventListener('pointerup', function () { arrasta = false; }); prog.addEventListener('pointercancel', function () { arrasta = false; });
    prog.addEventListener('keydown', function (e) {
      if (!v.duration) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + (e.key === 'ArrowRight' ? 2 : -2))); }
      else if (e.key === 'Home') { e.preventDefault(); v.currentTime = 0; } else if (e.key === 'End') { e.preventDefault(); v.currentTime = v.duration; }
    });
    caixa.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'k') && e.target === prog) { e.preventDefault(); alterna(); } });
    pinta(); estado();
  });

  // ---------- celular: a barra de WhatsApp do imóvel some ao descer e volta ao subir ----------
  var wa = $('.wa-fixo');
  if (wa) {
    var ultimo = window.scrollY, pedido = false;
    window.addEventListener('scroll', function () {
      if (pedido) return; pedido = true;
      requestAnimationFrame(function () {
        pedido = false;
        var y = window.scrollY, fim = y + window.innerHeight >= document.documentElement.scrollHeight - 120;
        if (Math.abs(y - ultimo) < 8) return;
        wa.classList.toggle('desce', y > ultimo && !fim);
        ultimo = y;
      });
    }, { passive: true });
  }
})();
