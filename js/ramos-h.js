/* Sistemas da home (09/11): abas na horizontal com barra de tempo; o palco desliza para o lado.
   Avança sozinho a cada 6 s quando está na tela; para com mouse em cima, foco, toque ou o botão Pausar.
   Com movimento reduzido não avança sozinho. Abas com setas do teclado (padrão de abas do WAI). */
(function () {
  var raiz = document.querySelector('[data-ramos-h]');
  if (!raiz) return;
  var abas = Array.prototype.slice.call(raiz.querySelectorAll('[role="tab"]'));
  var slides = abas.map(function (a) { return document.getElementById(a.getAttribute('aria-controls')); });
  var pausa = raiz.querySelector('.hr-pausa');
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TEMPO = 6000, i = 0, t0 = 0, raf = 0, visivel = false, emCima = false, travado = reduz, gasto = 0;

  function mostrar(n, foco) {
    n = (n + abas.length) % abas.length;
    if (n === i) { if (foco) abas[n].focus(); return; }
    var volta = n < i;
    abas[i].setAttribute('aria-selected', 'false'); abas[i].tabIndex = -1; abas[i].style.removeProperty('--hr-p');
    slides[i].hidden = true; slides[i].classList.remove('hr-entra', 'hr-entra-volta');
    i = n;
    abas[i].setAttribute('aria-selected', 'true'); abas[i].tabIndex = 0;
    slides[i].hidden = false;
    if (!reduz) { void slides[i].offsetWidth; slides[i].classList.add(volta ? 'hr-entra-volta' : 'hr-entra'); }
    if (foco) abas[i].focus();
    // aba ativa visível quando as abas rolam (celular)
    var faixa = abas[i].parentNode;
    if (faixa.scrollWidth > faixa.clientWidth) faixa.scrollTo({ left: Math.max(0, abas[i].offsetLeft - 16), behavior: reduz ? 'auto' : 'smooth' });
    gasto = 0; t0 = performance.now();
  }

  function quadro(agora) {
    raf = requestAnimationFrame(quadro);
    var rodando = visivel && !emCima && !travado && !document.hidden;
    if (!rodando) { t0 = agora - gasto; return; }
    gasto = agora - t0;
    abas[i].style.setProperty('--hr-p', Math.min(1, gasto / TEMPO).toFixed(3));
    if (gasto >= TEMPO) mostrar(i + 1, false);
  }

  function travar() {
    travado = true;
    pausa.setAttribute('aria-pressed', 'true'); pausa.textContent = 'Continuar';
    abas[i].style.removeProperty('--hr-p');
  }

  abas.forEach(function (a, n) {
    a.addEventListener('click', function () { mostrar(n, false); travar(); });
    a.addEventListener('keydown', function (e) {
      var k = e.key, d = k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : 0;
      if (k === 'Home') { e.preventDefault(); mostrar(0, true); travar(); }
      else if (k === 'End') { e.preventDefault(); mostrar(abas.length - 1, true); travar(); }
      else if (d) { e.preventDefault(); mostrar(i + d, true); travar(); }
    });
  });
  pausa.addEventListener('click', function () {
    if (travado) { travado = false; pausa.setAttribute('aria-pressed', 'false'); pausa.textContent = 'Pausar'; gasto = 0; t0 = performance.now(); }
    else travar();
  });
  if (reduz) { pausa.setAttribute('aria-pressed', 'true'); pausa.textContent = 'Continuar'; }
  raiz.addEventListener('mouseenter', function () { emCima = true; });
  raiz.addEventListener('mouseleave', function () { emCima = false; });
  raiz.addEventListener('focusin', function () { emCima = true; });
  raiz.addEventListener('focusout', function (e) { if (!raiz.contains(e.relatedTarget)) emCima = false; });

  // arrastar o palco para o lado (celular) troca de sistema
  var x0 = null, trilho = raiz.querySelector('.hr-trilho');
  trilho.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') x0 = e.clientX; }, { passive: true });
  trilho.addEventListener('pointerup', function (e) {
    if (x0 === null) return;
    var dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) { mostrar(i + (dx < 0 ? 1 : -1), false); travar(); }
  });
  trilho.addEventListener('pointercancel', function () { x0 = null; });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visivel = es[0].isIntersecting; }, { threshold: .35 }).observe(raiz);
  } else visivel = true;
  t0 = performance.now();
  raf = requestAnimationFrame(quadro);
})();
