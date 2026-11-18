/* 18/11: vídeo em motion das páginas dos sistemas (Peplo, Annona, Arca), no mesmo esquema do comercial da home.
   O HTML não tem endereço de vídeo nem de capa: este script escolhe a versão em pé no celular (até 640 px)
   e a deitada no computador. O endereço do vídeo só entra quando ele chega perto da tela
   (o Chrome baixava o arquivo inteiro mesmo com preload="none"). Toca só quando aparece na tela, pausa ao sair
   e não toca sozinho com "reduzir movimento" ligado. */
(function () {
  var figs = document.querySelectorAll('.sv-quadro');
  if (!figs.length) return;
  var calmo = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var celular = window.matchMedia ? window.matchMedia('(max-width: 640px)') : null;

  Array.prototype.forEach.call(figs, function (q) {
    var video = q.querySelector('video');
    var botao = q.querySelector('.sv-pausa');
    if (!video || !botao) return;
    var pausadoPeloUsuario = calmo;
    var perto = !('IntersectionObserver' in window);
    var FONTES = {
      deitado: { src: q.getAttribute('data-deitado'), poster: q.getAttribute('data-capa-deitado'), w: 1920, h: 1080 },
      empe: { src: q.getAttribute('data-empe'), poster: q.getAttribute('data-capa-empe'), w: 1080, h: 1920 }
    };

    function marcar() {
      var tocando = !video.paused;
      botao.textContent = tocando ? 'Pausar' : (video.currentTime > 0 ? 'Continuar' : 'Ver o vídeo');
      botao.setAttribute('aria-pressed', tocando ? 'false' : 'true');
    }
    function tocar() {
      var p = video.play();
      if (p && p.catch) p.catch(function () { marcar(); });
    }
    function escolher() {
      var empe = celular && celular.matches;
      var f = empe ? FONTES.empe : FONTES.deitado;
      q.classList.toggle('sv-empe', !!empe);
      if (video.getAttribute('poster') !== f.poster) {
        video.setAttribute('poster', f.poster);
        video.setAttribute('width', f.w);
        video.setAttribute('height', f.h);
      }
      if (!perto || video.getAttribute('src') === f.src) return;
      var tocava = !video.paused;
      video.setAttribute('src', f.src);
      video.load();
      if (tocava && !pausadoPeloUsuario) tocar();
      marcar();
    }
    escolher();
    if (celular) {
      if (celular.addEventListener) celular.addEventListener('change', escolher);
      else if (celular.addListener) celular.addListener(escolher);
    }

    botao.hidden = false;
    video.addEventListener('play', marcar);
    video.addEventListener('pause', marcar);
    botao.addEventListener('click', function () {
      if (video.paused) { pausadoPeloUsuario = false; if (!perto) { perto = true; escolher(); } tocar(); }
      else { pausadoPeloUsuario = true; video.pause(); }
    });
    marcar();

    if (!('IntersectionObserver' in window)) {
      if (!pausadoPeloUsuario) tocar();
      return;
    }
    var aviso = new IntersectionObserver(function (entradas) {
      if (!entradas.some(function (e) { return e.isIntersecting; })) return;
      aviso.disconnect();
      if (perto) return;
      perto = true; escolher();
      var r = video.getBoundingClientRect(), alto = r.height || 1;
      var vis = (Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)) / alto;
      if (vis >= 0.35 && !pausadoPeloUsuario) tocar();
    }, { rootMargin: '400px 0px' });
    aviso.observe(q);
    new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!perto && e.isIntersecting) { perto = true; escolher(); }
        if (!perto) return;
        var visivel = e.isIntersecting && e.intersectionRatio >= 0.35;
        if (visivel && !pausadoPeloUsuario) tocar();
        else if (!visivel && !video.paused) video.pause();
      });
    }, { threshold: [0, 0.35, 0.6] }).observe(video);
  });
})();
