/* 09/11: comercial dos sistemas na página inicial. Toca só quando está visível,
   pausa ao sair da tela e nunca toca sozinho com "reduzir movimento" ligado. */
(function () {
  var fig = document.querySelector('.hv');
  if (!fig) return;
  var video = fig.querySelector('.hv-video');
  var botao = fig.querySelector('.hv-pausa');
  if (!video || !botao) return;
  var calmo = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pausadoPeloUsuario = calmo;

  function marcar() {
    var tocando = !video.paused;
    botao.textContent = tocando ? 'Pausar' : 'Continuar';
    botao.setAttribute('aria-pressed', tocando ? 'false' : 'true');
  }
  function tocar() {
    var p = video.play();
    if (p && p.catch) p.catch(function () { marcar(); });
  }

  /* 09/11: celular (até 640 px) usa o comercial em pé (1080x1920); computador, o horizontal.
     <video> não aceita <source media> de forma confiável, então o src e o pôster trocam aqui. */
  var FONTES = {
    deitado: { src: 'video/home/comercial.mp4?v=2', poster: 'img/home/comercial-capa.webp', w: 1600, h: 900 },
    empe: { src: 'video/home/comercial-vertical.mp4?v=1', poster: 'img/home/comercial-vertical-capa.webp', w: 1080, h: 1920 }
  };
  var celular = window.matchMedia ? window.matchMedia('(max-width: 640px)') : null;
  function escolher() {
    var f = celular && celular.matches ? FONTES.empe : FONTES.deitado;
    if (video.getAttribute('src') === f.src) return;
    var tocava = !video.paused;
    video.setAttribute('poster', f.poster);
    video.setAttribute('width', f.w);
    video.setAttribute('height', f.h);
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
    if (video.paused) { pausadoPeloUsuario = false; tocar(); }
    else { pausadoPeloUsuario = true; video.pause(); }
  });
  marcar();

  if (!('IntersectionObserver' in window)) {
    if (!pausadoPeloUsuario) tocar();
    return;
  }
  new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      var visivel = e.isIntersecting && e.intersectionRatio >= 0.35;
      if (visivel && !pausadoPeloUsuario) tocar();
      else if (!visivel && !video.paused) video.pause();
    });
  }, { threshold: [0, 0.35, 0.6] }).observe(video);
})();
