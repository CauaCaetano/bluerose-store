/* Animações do visual de luxo, em todas as páginas.
   - Títulos (h1 e .sec-title) se montam palavra por palavra quando aparecem na tela.
   - Números com data-conta contam até o valor quando aparecem.
   - A redoma do topo acompanha de leve o mouse (só no computador).
   Tudo dispara uma vez por elemento (IntersectionObserver), sem trabalho contínuo durante a rolagem. */
// Desempenho (31/10/2026): modo leve em PC fraco e animações infinitas paradas fora da tela (regras no fim do site.css)
(function () {
  var html = document.documentElement;
  function leve() { html.classList.add('leve'); }
  // máquina fraca de saída: poucos núcleos ou pouca memória (deviceMemory só existe no Chrome/Edge)
  if ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4)) leve();
  // senão, mede os primeiros quadros: se a página roda abaixo de ~45 quadros/s, liga o modo leve
  else if (window.requestAnimationFrame) {
    var q = [], ult = 0, fim = 0;
    var medir = function (t) {
      if (document.hidden) return;
      if (!fim) fim = t + 2500;
      if (ult) q.push(t - ult);
      ult = t;
      if (t < fim) requestAnimationFrame(medir);
      else if (q.length > 20) { q.sort(function (x, y) { return x - y; }); if (q[q.length >> 1] > 22) leve(); }
    };
    addEventListener('load', function () { setTimeout(function () { requestAnimationFrame(medir); }, 600); });
  }
  // animações infinitas só rodam quando estão na tela
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('fora-tela', !e.isIntersecting); });
    }, { rootMargin: '120px 0px' });
    var ver = function () {
      document.querySelectorAll('.rolo-linha, .ini-rosa, .ini-aviso, .ini-note, .ini-selo, .nb, .ini-bag-passos, .perso-tag').forEach(function (el) {
        if (!el.__obsDes) { el.__obsDes = true; obs.observe(el); }
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ver); else ver();
  }
})();

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
