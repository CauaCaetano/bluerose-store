/* Carrossel da home (09/11): [data-carrossel] vira trilha com rolagem e encaixe, setas, pontos e avanço automático.
   Para sozinho ao passar o mouse, ao focar, ao tocar ou com o botão de pausa; sem avanço com movimento reduzido. */
(function () {
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-carrossel]').forEach(function (trilha, n) {
    var itens = Array.prototype.slice.call(trilha.children);
    if (itens.length < 2) return;
    trilha.id = trilha.id || 'carrossel-' + n;
    trilha.setAttribute('tabindex', '0');
    var nome = trilha.getAttribute('data-carrossel') || 'Itens';
    var ctl = document.createElement('div');
    ctl.className = 'car-ctl';
    ctl.innerHTML =
      '<button type="button" class="car-bt" data-d="-1" aria-controls="' + trilha.id + '" aria-label="' + nome + ': anterior"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<div class="car-pontos" role="group" aria-label="' + nome + '"></div>' +
      '<button type="button" class="car-bt" data-d="1" aria-controls="' + trilha.id + '" aria-label="' + nome + ': próximo"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<button type="button" class="car-bt car-pausa" aria-pressed="false" aria-label="Pausar a passagem automática"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path class="car-i-pausa" d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path class="car-i-play" d="M8 5.5v13l10-6.5z" fill="currentColor"/></svg></button>';
    trilha.parentNode.insertBefore(ctl, trilha.nextSibling);
    var pontos = ctl.querySelector('.car-pontos');
    itens.forEach(function (it, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'car-ponto';
      var t = it.querySelector('h3, b');
      b.setAttribute('aria-label', 'Ir para ' + (t ? t.textContent.trim() : 'item ' + (i + 1)));
      b.addEventListener('click', function () { ir(i); parar(true); });
      pontos.appendChild(b);
    });
    function passo() { return itens.length > 1 ? itens[1].offsetLeft - itens[0].offsetLeft : trilha.clientWidth; }
    function atual() { return Math.round(trilha.scrollLeft / passo()); }
    function ultimo() { return Math.max(0, Math.round((trilha.scrollWidth - trilha.clientWidth) / passo())); }
    function ir(i) {
      var max = ultimo();
      if (i > max) i = 0; if (i < 0) i = max;
      trilha.scrollTo({ left: i * passo(), behavior: reduz ? 'auto' : 'smooth' });
    }
    function marcar() {
      var a = atual(), max = ultimo();
      Array.prototype.forEach.call(pontos.children, function (p, i) {
        p.hidden = i > max;
        p.setAttribute('aria-current', i === a ? 'true' : 'false');
      });
    }
    trilha.addEventListener('scroll', function () { window.requestAnimationFrame(marcar); }, { passive: true });
    window.addEventListener('resize', marcar);
    ctl.querySelectorAll('[data-d]').forEach(function (b) {
      b.addEventListener('click', function () { ir(atual() + Number(b.getAttribute('data-d'))); parar(true); });
    });
    var timer = null, travado = reduz, emCima = false;
    var pausa = ctl.querySelector('.car-pausa');
    function rodar() {
      clearInterval(timer);
      if (travado) return;
      timer = setInterval(function () { if (!emCima && !document.hidden) ir(atual() + 1); }, 4500);
    }
    function parar(fixo) {
      if (fixo) { travado = true; pausa.setAttribute('aria-pressed', 'true'); pausa.setAttribute('aria-label', 'Retomar a passagem automática'); }
      clearInterval(timer);
    }
    pausa.addEventListener('click', function () {
      if (travado) { travado = false; pausa.setAttribute('aria-pressed', 'false'); pausa.setAttribute('aria-label', 'Pausar a passagem automática'); rodar(); }
      else parar(true);
    });
    if (reduz) { pausa.setAttribute('aria-pressed', 'true'); pausa.setAttribute('aria-label', 'Retomar a passagem automática'); }
    trilha.addEventListener('mouseenter', function () { emCima = true; });
    trilha.addEventListener('mouseleave', function () { emCima = false; });
    trilha.addEventListener('focusin', function () { emCima = true; });
    trilha.addEventListener('focusout', function () { emCima = false; });
    trilha.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') parar(true); });
    trilha.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); ir(atual() + 1); parar(true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); ir(atual() - 1); parar(true); }
    });
    // só começa a passar quando o carrossel aparece na tela
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) rodar(); else clearInterval(timer); }); }, { threshold: .3 }).observe(trilha);
    } else rodar();
    marcar();
  });
})();
