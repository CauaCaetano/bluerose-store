/* Página inicial: topo que muda com o ramo, a animação "tudo num lugar só" e a oferta de lançamento. */
(function () {
  var calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reais = function (n) { return 'R$ ' + Math.round(n).toLocaleString('pt-BR'); };

  /* ---------- topo por ramo ---------- */
  var RAMOS = {
    obras: { l1: 'Sua obra no prazo,', l2: 'sem gasto escondido.', sub: 'O RoseConstruct junta cronograma, gastos, equipe e o que falta receber de cada obra. Do escritório ou do canteiro, pelo celular.',
      nome: 'RoseConstruct', mensal: 119, pagina: 'roseconstruct.html', url: 'roseconstruct · painel',
      a1: ['i-check', 'Etapa concluída', 'Reforma do banheiro · cliente avisado'], a2: ['i-receipt', 'R$ 8.590 a receber', 'nesta semana, em 3 obras'] },
    juridico: { l1: 'Seu escritório em dia,', l2: 'sem prazo perdido.', sub: 'O Nexo Jurídico busca as intimações do DJEN sozinho, conta os prazos e põe tudo na agenda de cada advogado.',
      nome: 'Nexo Jurídico', mensal: 149, pagina: 'nexo-juridico.html', url: 'nexo jurídico · painel',
      a1: ['i-lightning', 'Intimação nova', 'TRT 2ª Região · prazo de 15 dias'], a2: ['i-lightning', 'Prazo em 2 dias', 'Contestação · já na agenda'] },
    agenda: { l1: 'Seu salão cheio,', l2: 'sem cliente esquecida.', sub: 'O Nexo Agenda organiza os horários de cada profissional, confirma pelo WhatsApp e deixa a cliente marcar sozinha pelo link.',
      nome: 'Nexo Agenda', mensal: 79, pagina: 'nexo-agenda.html', url: 'nexo agenda · hoje',
      a1: ['i-lightning', 'Novo horário pelo link', 'Hidratação · hoje às 14h'], a2: ['i-check', 'Caixa do dia fechado', 'R$ 949 · conferido'] },
    financeiro: { l1: 'Seu caixa no azul,', l2: 'sem conta esquecida.', sub: 'O Nexo Financeiro mostra o saldo, o que entra e o que sai, cobra quem atrasou e prevê o caixa dos próximos meses.',
      nome: 'Nexo Financeiro', mensal: 109, pagina: 'nexo-financeiro.html', url: 'nexo financeiro · painel',
      a1: ['i-check', 'PIX recebido', 'R$ 722,00 · Hotel Bela Vista'], a2: ['i-lightning', '3 contas esta semana', 'lembrete enviado no WhatsApp'] },
  };
  var ORDEM = ['obras', 'juridico', 'agenda', 'financeiro'];
  var hero = document.querySelector('.ini-hero');
  var grupo = hero && hero.querySelector('.ini-ramos');
  var atual = null;

  function aviso(el, d) {
    if (!el || !d) return;
    el.querySelector('use').setAttribute('href', 'img/icones.svg#' + d[0]);
    el.querySelector('b').textContent = d[1];
    el.querySelector('small').textContent = d[2];
  }

  function escolher(id) {
    var r = RAMOS[id]; if (!r || id === atual) return;
    atual = id;
    var h1 = hero.querySelector('[data-ramo-titulo]'), sub = hero.querySelector('[data-ramo-sub]'), tela = hero.querySelector('.ini-tela');
    grupo.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.ramo === id)); });
    hero.querySelectorAll('.ini-note-img img').forEach(function (img) { img.classList.toggle('on', img.dataset.ramo === id); });
    h1.classList.add('trocando'); sub.classList.add('trocando'); tela.classList.add('trocando');
    setTimeout(function () {
      h1.querySelector('[data-ramo-l1]').textContent = r.l1;
      h1.querySelector('[data-ramo-l2]').textContent = r.l2;
      sub.textContent = r.sub;
      hero.querySelector('[data-ramo-url]').textContent = r.url;
      aviso(hero.querySelector('.ini-aviso.a1'), r.a1);
      aviso(hero.querySelector('.ini-aviso.a2'), r.a2);
      var preco = hero.querySelector('[data-ramo-preco]');
      preco.innerHTML = '<b>' + r.nome + '</b> · ' + reais(r.mensal) + '/mês · 7 dias grátis · sem fidelidade';
      var teste = hero.querySelector('[data-ramo-teste]');
      teste.setAttribute('href', 'app/' + id + '/');
      teste.setAttribute('data-teste', id);
      teste.setAttribute('data-teste-nome', r.nome);
      teste.setAttribute('data-teste-mensal', String(r.mensal));
      hero.querySelector('[data-ramo-demo]').setAttribute('href', r.pagina);
      h1.classList.remove('trocando'); sub.classList.remove('trocando'); tela.classList.remove('trocando');
    }, calmo ? 0 : 280);
  }

  if (hero && grupo) {
    var CICLO = 4500, relogio = null, i = 0;
    var parar = function () { clearInterval(relogio); relogio = null; grupo.classList.remove('auto'); };
    grupo.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-ramo]'); if (!b) return;
      parar(); atual = null; escolher(b.dataset.ramo);
      try { localStorage.setItem('br-ramo', b.dataset.ramo); } catch (x) {}
    });
    var salvo = null; try { salvo = localStorage.getItem('br-ramo'); } catch (x) {}
    if (salvo && RAMOS[salvo]) { escolher(salvo); }
    else if (!calmo) {
      // passa sozinho pelos ramos até a pessoa escolher, tocar ou passar o mouse
      grupo.style.setProperty('--ciclo', CICLO + 'ms');
      setTimeout(function () {
        if (atual || relogio === false) return;
        grupo.classList.add('auto'); escolher(ORDEM[0]);
        relogio = setInterval(function () { i = (i + 1) % ORDEM.length; atual = null; escolher(ORDEM[i]); }, CICLO);
      }, 2200);
      ['pointerenter', 'focusin', 'touchstart'].forEach(function (ev) { hero.addEventListener(ev, function () { if (relogio) parar(); else relogio = false; }, { passive: true }); });
    }
  }

  /* ---------- tudo num lugar só: a animação roda em loop pelo CSS; aqui só mede para onde cada papel voa ---------- */
  var palco = document.querySelector('.ini-bag-palco');
  if (palco) {
    var medir = function () {
      palco.querySelectorAll('.pp').forEach(function (el) {
        el.style.setProperty('--dx', (palco.offsetWidth / 2 - (el.offsetLeft + el.offsetWidth / 2)).toFixed(0) + 'px');
        el.style.setProperty('--dy', (palco.offsetHeight / 2 - (el.offsetTop + el.offsetHeight / 2)).toFixed(0) + 'px');
      });
    };
    medir(); addEventListener('resize', medir);
  }

  /* ---------- oferta de lançamento: só aparece enquanto houver vaga (número real do servidor) ---------- */
  fetch('https://yihnfzwtkqdfnwziutqa.supabase.co/functions/v1/nexo-pagamentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"acao":"vagas"}' })
    .then(function (r) { return r.json(); }).then(function (j) {
      var n = Number(j.vagas) || 0; if (!n) return;
      var txt = 'Lançamento: 50% nos 3 primeiros meses · restam ' + n + (n === 1 ? ' vaga' : ' vagas');
      var h1 = document.querySelector('.lx-hero h1');
      if (h1) { var a = document.createElement('a'); a.className = 'ini-selo'; a.href = '#precos'; a.innerHTML = '<i aria-hidden="true"></i>' + txt; h1.parentNode.insertBefore(a, h1); }
      var lede = document.querySelector('#precos .sec-lede');
      if (lede) { var o = document.createElement('p'); o.className = 'ini-oferta'; o.innerHTML = '<b>Oferta de lançamento:</b> os 30 primeiros assinantes pagam metade nos 3 primeiros meses de qualquer sistema. Restam <b>' + n + '</b> de 30 vagas.'; lede.after(o); }
    }).catch(function () {});

})();
