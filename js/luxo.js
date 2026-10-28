/* Animações do visual de luxo, em todas as páginas.
   - Títulos (h1 e .sec-title) se montam palavra por palavra quando aparecem na tela.
   - Números com data-conta contam até o valor quando aparecem.
   - A redoma do topo acompanha de leve o mouse (só no computador).
   Tudo dispara uma vez por elemento (IntersectionObserver), sem trabalho contínuo durante a rolagem. */
(function () {
  var calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calmo || !('IntersectionObserver' in window)) return;

  // quebra só os nós de texto em palavras, preservando spans internos (como o destaque em itálico)
  function quebrar(el) {
    var n = 0;
    (function andar(no) {
      Array.prototype.slice.call(no.childNodes).forEach(function (f) {
        if (f.nodeType === 3) {
          var partes = f.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
          partes.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var o = document.createElement('span'); o.className = 'lx-p';
            var i = document.createElement('span'); i.textContent = p; i.style.setProperty('--w', n++);
            o.appendChild(i); frag.appendChild(o);
          });
          f.parentNode.replaceChild(frag, f);
        } else if (f.nodeType === 1 && !f.matches('svg, img, .lx-p')) andar(f);
      });
    })(el);
  }

  var obsT = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('lx-on'); obsT.unobserve(e.target); } });
  }, { threshold: 0.2 });
  // espera o pacote de idiomas traduzir o título inteiro antes de quebrar em palavras
  (window.__brIdioma ? window.__brIdioma.pronto : Promise.resolve()).then(function () {
    document.querySelectorAll('main h1, .sec-title, .lx-titulo').forEach(function (t) {
      if (t.hasAttribute('data-ramo-titulo')) return; // esse muda de texto sozinho; não quebra
      quebrar(t); obsT.observe(t);
    });
  });

  // contadores: <b data-conta="13">13</b>
  var obsN = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      obsN.unobserve(e.target);
      var el = e.target, alvo = Number(el.getAttribute('data-conta')) || 0, ini = performance.now(), dur = 1400;
      (function passo(t) {
        var p = Math.min(1, (t - ini) / dur), v = Math.round(alvo * (1 - Math.pow(1 - p, 3)));
        el.textContent = v.toLocaleString('pt-BR');
        if (p < 1) requestAnimationFrame(passo);
      })(ini);
    });
  }, { threshold: 0.6 });
  // espera o pacote de idiomas converter os preços (R$ → € ou $) antes de zerar e contar
  (window.__brIdioma ? window.__brIdioma.pronto : Promise.resolve()).then(function () {
    document.querySelectorAll('[data-conta]').forEach(function (el) { el.textContent = '0'; obsN.observe(el); });
  });

  // a redoma inclina de leve na direção do mouse
  var redoma = document.querySelector('.lx-redoma');
  if (redoma && matchMedia('(pointer: fine)').matches) {
    var alvoX = 0, alvoY = 0, x = 0, y = 0, rodando = false;
    var mover = function () {
      x += (alvoX - x) * 0.08; y += (alvoY - y) * 0.08;
      redoma.style.transform = 'perspective(1200px) rotateY(' + (x * 7).toFixed(2) + 'deg) rotateX(' + (-y * 5).toFixed(2) + 'deg)';
      if (Math.abs(alvoX - x) + Math.abs(alvoY - y) > 0.002) requestAnimationFrame(mover); else rodando = false;
    };
    addEventListener('pointermove', function (e) {
      alvoX = e.clientX / innerWidth - 0.5; alvoY = e.clientY / innerHeight - 0.5;
      if (!rodando) { rodando = true; requestAnimationFrame(mover); }
    }, { passive: true });
  }
})();
