/* Notebook real com o vídeo dos sistemas na tela (09/11/2026).
   O vídeo só baixa depois do load (nunca vira o LCP), só roda enquanto está visível
   e, com "reduzir movimento" ou economia de dados, fica parado na capa (poster). */
(function () {
  var videos = document.querySelectorAll('.nb-tela-video');
  if (!videos.length) return;
  var economia = navigator.connection && navigator.connection.saveData;
  if (economia || !window.matchMedia || !matchMedia('(prefers-reduced-motion: no-preference)').matches || !('IntersectionObserver' in window)) return;
  var ligar = function () {
    var olho = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { var t = e.target.play(); if (t && t.catch) t.catch(function () {}); }
        else e.target.pause();
      });
    }, { threshold: 0.15 });
    [].forEach.call(videos, function (v) { v.muted = true; olho.observe(v); });
  };
  var depois = function () { if ('requestIdleCallback' in window) requestIdleCallback(ligar, { timeout: 2500 }); else setTimeout(ligar, 600); };
  if (document.readyState === 'complete') depois(); else addEventListener('load', depois);
})();
