/* Página inicial (03/11/2026): só enfeites que não podem pesar no primeiro carregamento.
   - Cantos pintados do topo e estampas das laterais: entram depois do load, só em tela de computador (html.hn-cantos).
   - Cantos do rodapé: baixam quando o rodapé chega perto da tela (.rodape-site.cantos-ok).
   Nenhuma animação contínua; nada roda enquanto a página está parada. */
(function () {
  var html = document.documentElement;

  // topo: depois do load e com o navegador livre, para nunca virar o elemento do LCP
  var cantosTopo = function () {
    if (!window.matchMedia || !matchMedia('(min-width: 1100px)').matches) return;
    var ir = function () { html.classList.add('hn-cantos'); };
    if ('requestIdleCallback' in window) requestIdleCallback(ir, { timeout: 3000 }); else setTimeout(ir, 1200);
  };
  if (document.readyState === 'complete') cantosTopo(); else addEventListener('load', cantosTopo);

  // a tela do notebook só baixa depois do load, e só roda enquanto está visível; sem movimento fica na capa
  var tela = document.querySelector('.hn-note-tela');
  var economia = navigator.connection && navigator.connection.saveData;
  if (tela && !economia && window.matchMedia && matchMedia('(prefers-reduced-motion: no-preference)').matches && 'IntersectionObserver' in window) {
    var ligaTela = function () {
      new IntersectionObserver(function (es) {
        if (es[es.length - 1].isIntersecting) { var t = tela.play(); if (t && t.catch) t.catch(function () {}); }
        else tela.pause();
      }).observe(tela);
    };
    if (document.readyState === 'complete') ligaTela(); else addEventListener('load', ligaTela);
  }

  // escolha o ramo: passar o mouse ou focar troca a tela; sozinho, gira só enquanto a seção está na tela
  var ramos = document.querySelector('.hq-ramos');
  if (ramos) {
    var itens = [].slice.call(ramos.querySelectorAll('.hq-ramo'));
    var telas = [].slice.call(ramos.querySelectorAll('.hq-ramos-palco img'));
    var calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var largo = window.matchMedia && matchMedia('(min-width: 901px)');
    var atual = 0, giro = 0, mexeu = false;
    var mostra = function (i) {
      atual = i;
      itens.forEach(function (e, k) { e.classList.toggle('on', k === i); });
      telas.forEach(function (e, k) { e.classList.toggle('on', k === i); });
    };
    var para = function () { mexeu = true; clearInterval(giro); giro = 0; };
    itens.forEach(function (e, i) {
      e.addEventListener('pointerenter', function (ev) { if (ev.pointerType === 'mouse') { para(); mostra(i); } });
      e.addEventListener('focusin', function () { para(); mostra(i); });
    });
    if (!calmo && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        var dentro = es[es.length - 1].isIntersecting;
        if (dentro && !mexeu && !giro && largo.matches) giro = setInterval(function () { if (!document.hidden) mostra((atual + 1) % itens.length); }, 4500);
        else if (!dentro && giro) { clearInterval(giro); giro = 0; }
      }, { threshold: .35 }).observe(ramos);
    }
  }

  // os celulares de "Como é testar" abrem em leque quando chegam na tela
  var leque = document.querySelector('.hq-celulares');
  if (leque && 'IntersectionObserver' in window) {
    html.classList.add('hq-anima');
    var olho = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { leque.classList.add('aberto'); olho.disconnect(); }
    }, { threshold: .3 });
    olho.observe(leque);
  }

  // rodapé: quando estiver a até 600 px de aparecer
  var rodape = document.querySelector('.rodape-site');
  if (rodape) {
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { rodape.classList.add('cantos-ok'); obs.disconnect(); }
      }, { rootMargin: '600px 0px' });
      obs.observe(rodape);
    } else rodape.classList.add('cantos-ok');
  }
})();
