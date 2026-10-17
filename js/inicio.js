/* Página inicial: topo que muda com o ramo, cena "da bagunça ao sistema" e calculadora do prejuízo. */
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
    var h1 = hero.querySelector('h1'), sub = hero.querySelector('[data-ramo-sub]'), tela = hero.querySelector('.ini-tela');
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
    if (window.BR_RAMO) window.BR_RAMO(id, r);
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

  /* ---------- da bagunça ao sistema ---------- */
  var bag = document.querySelector('.ini-bag');
  if (bag && !calmo) {
    var papeis = bag.querySelectorAll('.pp'), app = bag.querySelector('.ini-bag-app'), passos = bag.querySelectorAll('.ini-bag-passos li');
    var ini = [];
    papeis.forEach(function (p, k) { ini.push({ r: [-8, 7, -5, 4][k] || 0 }); });
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var faixa = function (p, a, b) { return Math.min(1, Math.max(0, (p - a) / (b - a))); };
    var suave = function (t) { return t * t * (3 - 2 * t); };
    var pedido = false;
    function quadro() {
      pedido = false;
      var r = bag.getBoundingClientRect(), total = r.height - innerHeight;
      var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      var palco = app.parentElement;
      papeis.forEach(function (el, k) {
        // cada papel entra numa fase, depois todos voam para o centro do sistema (posição de layout, sem o transform)
        var entra = suave(faixa(p, 0.02 + k * 0.08, 0.14 + k * 0.08));
        var some = suave(faixa(p, 0.5 + k * 0.03, 0.72 + k * 0.03));
        var dx = palco.offsetWidth / 2 - (el.offsetLeft + el.offsetWidth / 2);
        var dy = palco.offsetHeight / 2 - (el.offsetTop + el.offsetHeight / 2);
        var tx = lerp(0, dx, some), ty = lerp(lerp(-40, 0, entra), dy, some);
        el.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) rotate(' + lerp(ini[k].r * 2.4, ini[k].r, entra) * (1 - some) + 'deg) scale(' + lerp(1, 0.25, some) + ')';
        el.style.opacity = String(Math.min(entra, 1 - some));
      });
      var mostra = suave(faixa(p, 0.6, 0.86));
      app.style.setProperty('--app-op', String(lerp(0.18, 1, mostra)));
      app.style.setProperty('--app-esc', String(lerp(0.86, 1, mostra)));
      app.style.setProperty('--app-blur', lerp(3, 0, mostra).toFixed(2) + 'px');
      var ativo = p < 0.12 ? 0 : p < 0.24 ? 1 : p < 0.5 ? 2 : 3;
      passos.forEach(function (li, k) { li.classList.toggle('on', k === ativo); });
    }
    var pedir = function () { if (!pedido) { pedido = true; requestAnimationFrame(quadro); } };
    addEventListener('scroll', pedir, { passive: true });
    addEventListener('resize', pedir);
    quadro();
  }

  /* ---------- quanto a bagunça custa ---------- */
  var calc = document.querySelector('[data-calc]');
  if (calc) {
    var campo = function (n) { return calc.querySelector('[name="' + n + '"]'); };
    var mensal = 109, nome = 'o sistema';
    window.BR_RAMO = function (id, r) { mensal = r.mensal; nome = 'o ' + r.nome; conta(); };
    function conta() {
      var horas = +campo('horas').value || 0, hora = Math.max(0, +campo('hora').value || 0);
      var perdidos = +campo('perdidos').value || 0, ticket = Math.max(0, +campo('ticket').value || 0);
      calc.querySelector('output[for="c-horas"]').textContent = horas + (horas === 1 ? ' hora' : ' horas');
      calc.querySelector('output[for="c-perdidos"]').textContent = perdidos + (perdidos === 1 ? ' por mês' : ' por mês');
      var perde = horas * 4.33 * hora + perdidos * ticket;
      calc.querySelector('[data-perde]').textContent = reais(perde) + ' por mês';
      var dias = perde > 0 ? Math.max(1, Math.ceil(mensal / (perde / 30))) : null;
      calc.querySelector('[data-paga]').innerHTML = dias
        ? 'Com ' + nome + ' a ' + reais(mensal) + '/mês, o sistema <b>se paga em ' + dias + (dias === 1 ? ' dia' : ' dias') + '</b> e o resto vira lucro.'
        : 'Ajuste os números acima para ver em quantos dias o sistema se paga.';
    }
    calc.addEventListener('input', conta);
    calc.addEventListener('submit', function (e) { e.preventDefault(); });
    if (atual) window.BR_RAMO(atual, RAMOS[atual]); else conta();
  }
})();
