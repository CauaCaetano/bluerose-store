/* Vídeos de banco (Pexels): tocam sem som só quando aparecem na tela, pausam fora dela,
   respeitam "reduzir movimento" (fica o pôster) e têm botão de tocar/pausar. */
(function () {
  var vids = [].slice.call(document.querySelectorAll('video[data-vid]'));
  if (!vids.length) return;
  var reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function tocar(v) {
    v.muted = true;
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }

  vids.forEach(function (v) {
    v.muted = true;
    var pai = v.parentNode;
    if (window.getComputedStyle(pai).position === 'static') pai.style.position = 'relative';
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'vid-bt';
    function marca() {
      var parado = v.paused;
      b.setAttribute('aria-label', parado ? 'Tocar vídeo' : 'Pausar vídeo');
      b.classList.toggle('parado', parado);
    }
    v.addEventListener('play', marca);
    v.addEventListener('pause', marca);
    marca();
    b.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (v.paused) { v._pausadoPelaPessoa = false; tocar(v); }
      else { v._pausadoPelaPessoa = true; v.pause(); }
    });
    v.addEventListener('click', function () { b.click(); });
    pai.insertBefore(b, v.nextSibling);
  });

  if (reduz) return;
  if (!('IntersectionObserver' in window)) { vids.forEach(tocar); return; }
  var io = new IntersectionObserver(function (itens) {
    itens.forEach(function (it) {
      var v = it.target;
      if (it.isIntersecting) { if (!v._pausadoPelaPessoa) tocar(v); }
      else if (!v.paused) v.pause();
    });
  }, { threshold: 0.35 });
  vids.forEach(function (v) { io.observe(v); });
})();
