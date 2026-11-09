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

  /* servicos.html (rodada 3): a simulação de automação (montada pelo js/site.js) ganha
     um estado vazio que diz o que fazer e, no fim, o cartão do RESULTADO entregue em destaque.
     Só lê o que o site.js escreve no chat; não muda a lógica da simulação. */
  var demo = document.querySelector('[data-demo]');
  var entrega = document.querySelector('[data-entrega]');
  var log = demo && demo.querySelector('.chat-log');
  if (demo && entrega && log && 'MutationObserver' in window) {
    var QUEM = {
      lead: ['Resultado entregue ao corretor', 'Chega pronto no WhatsApp do corretor, sem ele ler a conversa inteira.'],
      pix: ['Resultado para o dono', 'O dono vê o que aconteceu com o pedido sem abrir a conversa.'],
      agenda: ['Resultado na agenda do negócio', 'O horário entra na agenda e o lembrete fica programado.']
    };
    var cenario = function () {
      var aba = demo.querySelector('[role="tab"][aria-selected="true"]');
      return (aba && aba.getAttribute('data-cenario')) || 'lead';
    };
    var vazio = function (el) {
      if (el.getAttribute('data-p2')) return;
      el.setAttribute('data-p2', '1');
      el.textContent = '';
      // rodada 4: esqueleto apagado de uma conversa, para o espaço vazio já parecer um chat
      var esq = document.createElement('span'); esq.className = 'sv-esqueleto'; esq.setAttribute('aria-hidden', 'true');
      ['c', 'b', 'c', 'b'].forEach(function (q) { var m = document.createElement('i'); m.className = 'sv-esq-' + q; esq.appendChild(m); });
      el.appendChild(esq);
      var t = document.createElement('b'); t.textContent = 'Escolha um cenário e clique em Rodar automação.';
      var d = document.createElement('span'); d.textContent = 'A conversa aparece aqui, passo a passo. No fim, o resumo entregue fica em destaque logo abaixo.';
      el.appendChild(t); el.appendChild(d);
    };
    var mostrar = function (msg) {
      var linhas = (msg.textContent || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      var q = QUEM[cenario()] || QUEM.lead;
      entrega.textContent = '';
      var topo = document.createElement('p'); topo.className = 'sv-entrega-tag'; topo.textContent = q[0];
      var tit = document.createElement('h3'); tit.textContent = linhas.shift() || 'Resultado';
      var dl = document.createElement('dl');
      linhas.forEach(function (l) {
        var i = l.indexOf(': ');
        var linha = document.createElement('div');
        var dt = document.createElement('dt'), dd = document.createElement('dd');
        if (i > 0) { dt.textContent = l.slice(0, i).trim(); dd.textContent = l.slice(i + 2).trim(); }
        else { dd.textContent = l; linha.className = 'sv-entrega-livre'; }
        if (i > 0) linha.appendChild(dt);
        linha.appendChild(dd); dl.appendChild(linha);
      });
      var pe = document.createElement('p'); pe.className = 'sv-entrega-pe'; pe.textContent = q[1] + ' Simulação: nenhuma mensagem real foi enviada.';
      entrega.appendChild(topo); entrega.appendChild(tit); entrega.appendChild(dl); entrega.appendChild(pe);
      entrega.hidden = false;
      msg.classList.add('sv-final');
    };
    var olhar = function () {
      var v = log.querySelector('.chat-vazio');
      if (v) { vazio(v); entrega.hidden = true; entrega.textContent = ''; return; }
      var r = log.querySelector('.msg.resultado');
      if (r && !r.classList.contains('sv-final')) mostrar(r);
      else if (!r) entrega.hidden = true;
    };
    new MutationObserver(olhar).observe(log, { childList: true });
    olhar();
  }
})();
