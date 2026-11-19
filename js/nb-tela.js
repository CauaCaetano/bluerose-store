/* Vídeos dentro da tela dos notebooks (09/11/2026; 19/11/2026: vídeos motion dos sistemas).
   Vale para .nb-tela-video (sistemas.html) e .tela-motion (início, Peplo, Annona, Anshur).
   O endereço fica em data-src e só entra quando o notebook chega perto da tela (o Chrome baixava o arquivo
   inteiro mesmo com preload="none"); toca só enquanto aparece e pausa ao sair. Com "reduzir movimento"
   ou economia de dados, fica parado na capa (poster). Nada disso roda antes do load (nunca vira o LCP). */
(function () {
  var videos = document.querySelectorAll('.nb-tela-video, .tela-motion');
  if (!videos.length) return;
  var economia = navigator.connection && navigator.connection.saveData;
  if (economia || !window.matchMedia || !matchMedia('(prefers-reduced-motion: no-preference)').matches || !('IntersectionObserver' in window)) return;
  var poeSrc = function (v) {
    var s = v.getAttribute('data-src');
    if (s && !v.getAttribute('src')) { v.setAttribute('src', s); v.load(); }
  };
  var ligar = function () {
    var perto = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { poeSrc(e.target); perto.unobserve(e.target); } });
    }, { rootMargin: '300px 0px' });
    var olho = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { poeSrc(v); v.muted = true; var t = v.play(); if (t && t.catch) t.catch(function () {}); }
        else if (!v.paused) v.pause();
      });
    }, { threshold: 0.15 });
    [].forEach.call(videos, function (v) { v.muted = true; v.setAttribute('muted', ''); perto.observe(v); olho.observe(v); });
  };
  var depois = function () { if ('requestIdleCallback' in window) requestIdleCallback(ligar, { timeout: 2500 }); else setTimeout(ligar, 600); };
  if (document.readyState === 'complete') depois(); else addEventListener('load', depois);
})();
