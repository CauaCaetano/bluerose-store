// Início: roteiro do filme do notebook. Cada cena: frase de abertura, a tela sobe, o cursor clica, o sistema responde, a câmera aproxima e passa para a próxima.
// Só roda com o notebook visível; com movimento reduzido fica a primeira cena parada (o HTML já é o estado final).
(function () {
  var raiz = document.querySelector('.nb-telas.mx');
  if (!raiz || !raiz.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var cenas = [].slice.call(raiz.querySelectorAll('.mx-cena'));
  var url = document.querySelector('.mx-url');
  var cursor = raiz.querySelector('.mx-cursor'), toque = raiz.querySelector('.mx-toque'), luz = raiz.querySelector('.mx-luz');
  var EXPO = 'cubic-bezier(.16,1,.3,1)', SUAVE = 'cubic-bezier(.65,0,.35,1)', SAI = 'cubic-bezier(.7,0,.84,0)';
  var geracao = 0, cx = 0, cy = 0;

  function Parou() {}
  function checa(g) { if (g !== geracao) throw new Parou(); }
  function espera(ms, g) { return new Promise(function (ok) { setTimeout(ok, ms); }).then(function () { checa(g); }); }
  function anima(el, kf, o) { var op = { fill: 'both', easing: EXPO, duration: 800 }; for (var k in o) op[k] = o[k]; return el.animate(kf, op); }
  function q(c, s) { return c.querySelector(s); }
  function fmt(v, moeda) { v = Math.round(v); return moeda ? 'R$ ' + v.toLocaleString('pt-BR') : String(v); }
  function conta(el, ms) {
    var p = el.getAttribute('data-mx-conta').split('|').map(Number), moeda = el.hasAttribute('data-moeda'), t0 = performance.now();
    return new Promise(function (ok) {
      (function passo(t) { var x = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - x, 3); el.textContent = fmt(p[0] + (p[1] - p[0]) * e, moeda); x < 1 ? requestAnimationFrame(passo) : ok(); })(t0);
    });
  }
  function zera(c) { [].forEach.call(c.querySelectorAll('[data-mx-conta]'), function (el) { el.textContent = fmt(+el.getAttribute('data-mx-conta').split('|')[0], el.hasAttribute('data-moeda')); }); }

  // cursor: anda até o elemento e clica
  function centro(el) { var r = raiz.getBoundingClientRect(), b = el.getBoundingClientRect(); return [b.left - r.left + b.width * 0.5, b.top - r.top + b.height * 0.55]; }
  function poe(x, y) { cursor.getAnimations().forEach(function (a) { a.cancel(); }); cursor.style.transform = 'translate(' + x + 'px,' + y + 'px)'; cx = x; cy = y; }
  function mostraCursor() { var r = raiz.getBoundingClientRect(); poe(r.width * 0.94, r.height * 1.04); cursor.style.opacity = 1; }
  function anda(el, ms, g) {
    var d = centro(el), de = 'translate(' + cx + 'px,' + cy + 'px)', ate = 'translate(' + d[0] + 'px,' + d[1] + 'px)';
    // leve curva no caminho, como uma mão de verdade
    var meio = 'translate(' + ((cx + d[0]) / 2 + 18) + 'px,' + ((cy + d[1]) / 2 + 22) + 'px)';
    return cursor.animate([{ transform: de }, { transform: meio, offset: 0.55 }, { transform: ate }], { duration: ms, easing: SUAVE, fill: 'forwards' }).finished
      .then(function () { poe(d[0], d[1]); checa(g); });
  }
  function clica(g) {
    var t = 'translate(' + cx + 'px,' + cy + 'px)';
    cursor.animate([{ transform: t }, { transform: t + ' scale(.8)' }, { transform: t }], { duration: 240 });
    toque.animate([{ transform: t + ' scale(.2)', opacity: 0.9 }, { transform: t + ' scale(1.5)', opacity: 0 }], { duration: 650, easing: 'ease-out' });
    return espera(160, g);
  }
  function some() { cursor.style.opacity = 0; }

  function frase(c, g) {
    var f = q(c, '.mx-frase'), ws = [].slice.call(f.querySelectorAll('.w'));
    f.style.opacity = 1;
    ws.forEach(function (w, i) { anima(w, [{ opacity: 0, transform: 'translateY(50%)', filter: 'blur(14px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1000, delay: i * 110 }); });
    return espera(1000 + ws.length * 110 + 650, g).then(function () {
      anima(f, [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'translateY(-14%) scale(.94)', filter: 'blur(10px)' }], { duration: 650, easing: SAI });
      return espera(420, g);
    });
  }
  function sobe(c, g) {
    var app = q(c, '.mx-app');
    anima(app, [{ opacity: 0, transform: 'translateY(16%) scale(.9) rotateX(10deg)' }, { opacity: 1, transform: 'none' }], { duration: 1300 });
    [].forEach.call(app.querySelectorAll('.mx-topo > *, .mx-corpo > *, .mx-h, .mx-int'), function (el, i) {
      anima(el, [{ opacity: 0, transform: 'translateY(30%)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: 180 + i * 55 });
    });
    return espera(1100, g);
  }
  function camera(c, el, s) {
    var app = q(c, '.mx-app'), a = app.getBoundingClientRect(), b = el.getBoundingClientRect();
    app.style.transformOrigin = (b.left - a.left + b.width / 2) + 'px ' + (b.top - a.top + b.height / 2) + 'px';
    anima(app, [{ transform: 'none' }, { transform: 'scale(' + s + ')' }], { duration: 3200, easing: SUAVE });
  }
  function aparece(el, de) { return anima(el, [{ opacity: 0, transform: de || 'translateY(40%) scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: 850 }); }

  var roteiro = {
    agenda: function (c, g) {
      return frase(c, g).then(function () { return sobe(c, g); }).then(function () {
        mostraCursor(); return espera(150, g);
      }).then(function () { return anda(q(c, '.mx-livre'), 1100, g); }).then(function () { return clica(g); }).then(function () {
        anima(q(c, '.mx-livre'), [{ opacity: 1 }, { opacity: 0 }], { duration: 250 });
        var novo = q(c, '.mx-novo'); novo.style.transformOrigin = 'left center';
        anima(novo, [{ opacity: 0, transform: 'scaleX(.15)' }, { opacity: 1, transform: 'none' }], { duration: 900 });
        conta(q(c, '.mx-pilula [data-mx-conta]'), 500); conta(q(c, '.mx-lado [data-mx-conta]'), 1400);
        anima(q(c, '.mx-lado'), [{ boxShadow: '0 0 0 0 rgba(185,211,168,0)' }, { boxShadow: '0 0 0 .4cqw rgba(185,211,168,.35)' }, { boxShadow: '0 0 0 0 rgba(185,211,168,0)' }], { duration: 1400, easing: 'ease-out' });
        return espera(500, g);
      }).then(function () { some(); camera(c, q(c, '.mx-novo'), 1.05); return espera(500, g); })
        .then(function () { aparece(q(c, '.mx-zap'), 'translate(20%,30%) scale(.85)'); return espera(2600, g); });
    },
    juridico: function (c, g) {
      return frase(c, g).then(function () { return sobe(c, g); }).then(function () { mostraCursor(); return espera(150, g); })
        .then(function () { return anda(q(c, '.mx-int-ok button'), 1100, g); }).then(function () { return clica(g); }).then(function () {
          q(c, '.mx-int-ok').classList.add('on');
          aparece(q(c, '.mx-prazo'), 'translateY(60%) scale(.7)');
          conta(q(c, '.mx-pilula [data-mx-conta]'), 400);
          return espera(650, g);
        }).then(function () {
          some();
          var dia = q(c, '.mx-dia'); dia.classList.add('on');
          anima(dia, [{ transform: 'scale(1)' }, { transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: 800, easing: 'ease-out', fill: 'none' });
          camera(c, q(c, '.mx-cal'), 1.06);
          return espera(3000, g);
        });
    },
    financeiro: function (c, g) {
      var linha = q(c, '.mx-linha'), imp = q(c, '.mx-pote-imp i'), len = linha.getTotalLength();
      linha.style.strokeDasharray = len;
      anima(linha, [{ strokeDashoffset: len }, { strokeDashoffset: len }], { duration: 1 });
      anima(imp, [{ height: '22%' }, { height: '22%' }], { duration: 1, pseudoElement: '::after' });
      return frase(c, g).then(function () { return sobe(c, g); }).then(function () {
        anima(linha, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 2200, easing: SUAVE });
        conta(q(c, '.mx-caixa [data-mx-conta]'), 2200);
        mostraCursor(); return espera(500, g);
      }).then(function () { return anda(q(c, '.mx-bt'), 1100, g); }).then(function () { return clica(g); }).then(function () {
        anima(q(c, '.mx-bt'), [{ transform: 'scale(1)' }, { transform: 'scale(.96)' }, { transform: 'scale(1)' }], { duration: 300, fill: 'none' });
        anima(imp, [{ height: '22%' }, { height: '100%' }], { duration: 1500, easing: SUAVE, pseudoElement: '::after' });
        some(); camera(c, q(c, '.mx-potes'), 1.06);
        return espera(1100, g);
      }).then(function () { aparece(q(c, '.mx-toast')); return espera(2400, g); });
    },
    obras: function (c, g) {
      var tij = [].slice.call(c.querySelectorAll('.mx-parede i')), ja = 15;
      tij.slice(ja).forEach(function (t) { anima(t, [{ opacity: 0 }, { opacity: 0 }], { duration: 1 }); });
      return frase(c, g).then(function () { return sobe(c, g); }).then(function () {
        tij.slice(ja).forEach(function (t, i) { anima(t, [{ opacity: 0, transform: 'translateY(-160%)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: i * 75, easing: 'cubic-bezier(.34,1.56,.64,1)' }); });
        conta(q(c, '.mx-obra [data-mx-conta]'), (tij.length - ja) * 75 + 400);
        return espera((tij.length - ja) * 75 + 300, g);
      }).then(function () { mostraCursor(); return espera(100, g); })
        .then(function () { return anda(q(c, '.mx-cobrar'), 1000, g); }).then(function () { return clica(g); }).then(function () {
          aparece(q(c, '.mx-pago'), 'translateY(100%)');
          some(); camera(c, q(c, '.mx-cobrar'), 1.05);
          return espera(900, g);
        }).then(function () { aparece(q(c, '.mx-toast')); return espera(2500, g); });
    },
    fim: function (c, g) {
      [].forEach.call(c.querySelectorAll('.mx-selos img'), function (im, i) { anima(im, [{ opacity: 0, transform: 'translateY(40%) scale(.6)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1000, delay: i * 140 }); });
      anima(q(c, '.mx-marca'), [{ opacity: 0, letterSpacing: '.18em', filter: 'blur(10px)' }, { opacity: 1, letterSpacing: '-.02em', filter: 'blur(0)' }], { duration: 1600, delay: 500 });
      anima(q(c, '.mx-assina'), [{ opacity: 0, transform: 'translateY(40%)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: 1200 });
      return espera(4200, g);
    }
  };

  function limpa(c) {
    c.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); });
    [].forEach.call(c.querySelectorAll('.on'), function (e) { e.classList.remove('on'); });
    var f = q(c, '.mx-frase'); if (f) f.style.opacity = '';
    var app = q(c, '.mx-app'); if (app) app.style.transformOrigin = '';
    c.classList.remove('ativa');
  }
  function cena(c, g) {
    raiz.style.backgroundColor = c.style.getPropertyValue('--fundo');
    raiz.style.setProperty('--luz', c.style.getPropertyValue('--acento'));
    if (url) { url.style.opacity = 0; setTimeout(function () { url.textContent = c.getAttribute('data-url'); url.style.opacity = 1; }, 300); }
    zera(c); c.classList.add('ativa');
    anima(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 500 });
    return roteiro[c.getAttribute('data-cena')](c, g).then(function () {
      some();
      anima(c, [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(1.07)', filter: 'blur(12px)' }], { duration: 750, easing: SAI });
      return espera(760, g);
    }).then(function () { limpa(c); });
  }
  function filme() {
    var g = ++geracao, i = 0;
    raiz.classList.add('mx-vivo');
    luz.animate([{ transform: 'translate(-4%,-3%)' }, { transform: 'translate(6%,5%)' }], { duration: 9000, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
    (function proxima() { cena(cenas[i], g).then(function () { i = (i + 1) % cenas.length; proxima(); }, function (e) { if (!(e instanceof Parou)) console.error(e); }); })();
  }
  function para() {
    geracao++; some();
    cenas.forEach(limpa); luz.getAnimations().forEach(function (a) { a.cancel(); });
    raiz.classList.remove('mx-vivo'); raiz.style.backgroundColor = '';
    if (url) url.textContent = cenas[0].getAttribute('data-url');
  }

  var visivel = false, tocando = false;
  function decide() {
    var deve = visivel && !document.hidden;
    if (deve && !tocando) { tocando = true; filme(); }
    else if (!deve && tocando) { tocando = false; para(); }
  }
  new IntersectionObserver(function (es) { visivel = es[0].isIntersecting; decide(); }, { threshold: 0.25 }).observe(raiz);
  document.addEventListener('visibilitychange', decide);
})();
