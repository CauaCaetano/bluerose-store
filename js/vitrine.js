/* Apresentação do play da home: uma cena por trabalho, com avanço automático e controle total de quem assiste.
   Sem JavaScript as cenas ficam empilhadas e continuam legíveis. */
(function () {
  var cenas = [].slice.call(document.querySelectorAll('.vt-cena'));
  if (!cenas.length) return;
  var calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TEMPO = 7000;
  var atual = -1, tocando = !calmo, timer = 0, inicioCena = 0, restante = 0, barraAnim = null, ocupado = false;
  var corpo = document.body, trilha = document.getElementById('trilha'), ctrl = document.getElementById('ctrl');
  var pausa = document.getElementById('pausa');

  corpo.classList.add('vt-js');
  trilha.hidden = ctrl.hidden = false;

  // fundo que troca de cor: um círculo cresce a partir de onde a pessoa clicou
  var fundo = document.createElement('div'); fundo.className = 'vt-fundo';
  var onda = document.createElement('div'); onda.className = 'vt-onda';
  corpo.insertBefore(fundo, corpo.firstChild); corpo.insertBefore(onda, fundo.nextSibling);

  var botoes = cenas.map(function (c, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.innerHTML = '<span></span><i></i>';
    b.querySelector('span').textContent = c.dataset.nome;
    b.addEventListener('click', function (e) { pararAuto(); ir(i, e); });
    trilha.appendChild(b);
    return b;
  });

  function tempoDe(c) { return c.dataset.tempo !== undefined ? +c.dataset.tempo : TEMPO; }

  function preparar(i) {
    // a próxima cena já vem carregada para a troca não mostrar tela vazia
    var c = cenas[i]; if (!c) return;
    c.querySelectorAll('img[loading]').forEach(function (m) { m.removeAttribute('loading'); });
  }

  function trocarFundo(cor, e) {
    if (calmo) { fundo.style.background = cor; return; }
    var x = e && e.clientX ? e.clientX : innerWidth * .78, y = e && e.clientY ? e.clientY : innerHeight * .5;
    var r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 20;
    onda.style.background = cor;
    var a = onda.animate([{ clipPath: 'circle(0px at ' + x + 'px ' + y + 'px)' }, { clipPath: 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)' }],
      { duration: 720, easing: 'cubic-bezier(.65,0,.2,1)' });
    a.onfinish = function () { fundo.style.background = cor; onda.style.background = 'transparent'; };
  }

  function barra(i, ms) {
    if (barraAnim) { barraAnim.cancel(); barraAnim = null; }
    botoes.forEach(function (b, k) {
      var f = b.querySelector('i');
      f.style.transform = k < i ? 'scaleX(1)' : 'scaleX(0)';
    });
    var f = botoes[i].querySelector('i');
    if (!ms || calmo) { f.style.transform = 'scaleX(1)'; return; }
    barraAnim = f.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: ms, easing: 'linear', fill: 'forwards' });
    if (!tocando) barraAnim.pause();
  }

  function agenda() {
    clearTimeout(timer);
    if (!tocando || !restante) return;
    inicioCena = performance.now();
    timer = setTimeout(function () { ir(atual + 1); }, restante);
  }

  function ir(i, e) {
    if (i < 0 || i >= cenas.length || i === atual) return;
    var velha = cenas[atual], nova = cenas[i];
    if (velha) {
      velha.classList.remove('ativa'); velha.classList.add('saindo');
      velha.setAttribute('aria-hidden', 'true'); velha.inert = true;
      (function (v) { setTimeout(function () { v.classList.remove('saindo'); }, 640); })(velha);
    }
    atual = i;
    nova.removeAttribute('aria-hidden'); nova.inert = false;
    preparar(i); preparar(i + 1);
    trocarFundo(nova.dataset.cor, e);
    nova.classList.add('ativa');
    botoes.forEach(function (b, k) {
      if (k === i) { b.setAttribute('aria-current', 'step'); b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: calmo ? 'auto' : 'smooth' }); }
      else b.removeAttribute('aria-current');
    });
    restante = tempoDe(nova);
    barra(i, restante);
    agenda();
    if (nova.classList.contains('vt-arq')) trocaAuto(nova);
    history.replaceState(null, '', '#' + i);
  }

  function pintarPausa() {
    corpo.classList.toggle('vt-parado', !tocando);
    pausa.setAttribute('aria-label', tocando ? 'Pausar' : 'Continuar');
  }

  function pararAuto() {
    if (!tocando) return;
    tocando = false; clearTimeout(timer);
    if (barraAnim) barraAnim.pause();
    pintarPausa();
  }

  function continuar() {
    tocando = true;
    if (atual === cenas.length - 1) { ir(0); pintarPausa(); return; }
    if (!restante) restante = tempoDe(cenas[atual]);
    if (barraAnim) barraAnim.play(); else barra(atual, restante);
    pintarPausa(); agenda();
  }

  pausa.addEventListener('click', function () {
    if (tocando) {
      restante = Math.max(600, restante - (performance.now() - inicioCena));
      pararAuto();
    } else continuar();
  });
  document.getElementById('ant').addEventListener('click', function () { pararAuto(); ir(atual - 1); });
  document.getElementById('prox').addEventListener('click', function () { pararAuto(); ir(atual + 1); });

  addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { pararAuto(); ir(atual + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { pararAuto(); ir(atual - 1); }
    else if (e.key === ' ' && e.target === document.body) { e.preventDefault(); pausa.click(); }
  });

  // roda do mouse e dedo também passam de cena
  var ultimoGiro = 0;
  addEventListener('wheel', function (e) {
    var agora = performance.now();
    if (Math.abs(e.deltaY) < 12 || agora - ultimoGiro < 850) return;
    ultimoGiro = agora; pararAuto(); ir(atual + (e.deltaY > 0 ? 1 : -1));
  }, { passive: true });
  var tx = 0, ty = 0;
  addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', function (e) {
    if (e.target.closest && e.target.closest('.vt-trilha')) return;
    var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    pararAuto(); ir(atual + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // aba escondida não gasta nem perde a cena
  document.addEventListener('visibilitychange', function () {
    if (!tocando) return;
    if (document.hidden) { restante = Math.max(600, restante - (performance.now() - inicioCena)); clearTimeout(timer); if (barraAnim) barraAnim.pause(); }
    else { if (barraAnim) barraAnim.play(); agenda(); }
  });

  // a tela acompanha o mouse: só escreve quando ele se mexe
  if (!calmo && matchMedia('(hover: hover) and (min-width: 901px)').matches) {
    var alvoX = 0, alvoY = 0, x = 0, y = 0, rodando = false;
    var passo = function () {
      x += (alvoX - x) * .09; y += (alvoY - y) * .09;
      corpo.style.setProperty('--mx', x.toFixed(3)); corpo.style.setProperty('--my', y.toFixed(3));
      if (Math.abs(alvoX - x) > .002 || Math.abs(alvoY - y) > .002) requestAnimationFrame(passo); else rodando = false;
    };
    addEventListener('pointermove', function (e) {
      alvoX = e.clientX / innerWidth * 2 - 1; alvoY = e.clientY / innerHeight * 2 - 1;
      if (!rodando) { rodando = true; requestAnimationFrame(passo); }
    }, { passive: true });
  }

  // Planta, 3D e Painel da plataforma de arquitetura
  var trocaTimer = 0;
  function mostrarTroca(c, n) {
    c.querySelectorAll('[data-troca]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.troca === n)); });
    c.querySelectorAll('.vt-camadas img').forEach(function (m, k) { m.classList.toggle('on', k === n); });
  }
  function trocaAuto(c) {
    clearInterval(trocaTimer);
    if (!tocando) return;
    var n = 0; mostrarTroca(c, 0);
    trocaTimer = setInterval(function () {
      if (!tocando || !c.classList.contains('ativa') || document.hidden) return clearInterval(trocaTimer);
      n = (n + 1) % 3; mostrarTroca(c, n);
    }, 3600);
  }
  document.querySelectorAll('[data-troca]').forEach(function (b) {
    b.addEventListener('click', function () {
      clearInterval(trocaTimer); pararAuto();
      mostrarTroca(b.closest('.vt-cena'), +b.dataset.troca);
    });
  });

  cenas.forEach(function (c) { c.setAttribute('aria-hidden', 'true'); c.inert = true; });
  pintarPausa();
  var pedido = parseInt(location.hash.slice(1), 10);
  fundo.style.background = cenas[pedido > 0 && pedido < cenas.length ? pedido : 0].dataset.cor;
  ir(pedido > 0 && pedido < cenas.length ? pedido : 0);
})();
