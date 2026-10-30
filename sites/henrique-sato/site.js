// Dr. Henrique Sato · menu que vira pílula, contador de implantes, teste de 60 segundos, antes/depois arrastável,
// simulador de parcela, galeria com filtro, histórias de pacientes, avaliações em trilho, horário ao vivo e pedidos pelo WhatsApp.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wa = function (m) { if (window.BR_WA) window.BR_WA(m); };

  // menu: some na abertura e volta como pílula flutuante
  var topo = $('.topo'), heroi = $('.heroi');
  function menu() { topo.classList.toggle('pilula', scrollY > heroi.offsetHeight - 120); }
  addEventListener('scroll', menu, { passive: true }); menu();

  // contadores sobem quando aparecem
  var contaObs = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return; contaObs.unobserve(e.target);
      var el = e.target, fim = +el.dataset.ate, t0 = performance.now();
      if (calmo) return;
      (function passo(t) { var p = Math.min(1, (t - t0) / 1600), v = Math.round(fim * (1 - Math.pow(1 - p, 3))); el.textContent = v.toLocaleString('pt-BR'); if (p < 1) requestAnimationFrame(passo); })(t0);
    });
  }, { threshold: .6 });
  $$('.conta').forEach(function (c) { contaObs.observe(c); });

  // teste de 60 segundos: situação + tempo → sugestão com preço de partida
  var Q1 = [['um', 'Falta um dente'], ['varios', 'Faltam vários ou quase todos os dentes'], ['dentadura', 'A dentadura ou a ponte móvel incomoda'], ['osso', 'Disseram que não tenho osso para implante'], ['quebrado', 'Tenho um dente quebrado, mole ou doendo'], ['falhou', 'Um implante feito em outro lugar deu problema'], ['estetica', 'Quero um sorriso mais bonito'], ['revisao', 'Só quero uma revisão, ou não sei']];
  var Q2 = [['ja', 'Quero resolver o quanto antes'], ['mes', 'Nos próximos meses'], ['pesquisa', 'Ainda estou pesquisando']];
  var RES = {
    um: ['Implante unitário', 'Um implante com coroa de porcelana, colocado com guia. Em muitos casos o dente provisório sai no mesmo dia.', 'a partir de R$ 2.290 · até 24x de R$ 96'],
    varios: ['Protocolo fixo', 'Uma arcada inteira presa em 4 a 6 implantes, com dentes fixos provisórios em até 72 horas.', 'a partir de R$ 14.900 por arcada · até 24x de R$ 621'],
    dentadura: ['Dentadura fixa sobre implante', 'A dentadura deixa de soltar: fica presa em implantes e você não tira para comer nem para dormir.', 'a partir de R$ 14.900 por arcada · até 24x'],
    osso: ['Enxerto ou implante zigomático', 'Na maioria dos casos dá para refazer o osso no mesmo dia ou usar o implante que se apoia no osso da face.', 'o valor depende da tomografia, que é grátis na avaliação'],
    quebrado: ['Avaliação de urgência', 'Vemos o dente no mesmo dia. Se não der para salvar, a extração e o implante podem ser feitos juntos.', 'consulta e tomografia grátis'],
    falhou: ['Resgate de implante', 'Avaliamos o implante antigo, tiramos com cuidado e refazemos com material de marca e garantia de 10 anos.', 'o valor sai por escrito na avaliação grátis'],
    estetica: ['Coroas e facetas', 'Porcelana ou zircônia, com o sorriso planejado na tela antes de começar.', 'a partir de R$ 1.290 por dente · até 24x'],
    revisao: ['Avaliação completa', 'Exame, tomografia e uma conversa honesta sobre o que precisa e o que pode esperar.', 'grátis e sem compromisso']
  };
  var caixa = $('.qz-caixa'), esc1 = null;
  function botoes(lista, cb) {
    $('.qz-ops', caixa).innerHTML = lista.map(function (o, i) { return '<button type="button" data-v="' + o[0] + '"><span>' + String.fromCharCode(65 + i) + '</span>' + o[1] + '</button>'; }).join('');
    $('.qz-ops', caixa).onclick = function (e) { var b = e.target.closest('[data-v]'); if (b) cb(b.dataset.v, b.textContent.slice(1)); };
  }
  function pergunta1() {
    caixa.innerHTML = '<p class="qz-passo">Pergunta <b>1</b> de 2</p><h3 class="qz-q">O que trouxe você até aqui?</h3><div class="qz-ops"></div>';
    botoes(Q1, function (v) { esc1 = v; pergunta2(); });
  }
  function pergunta2() {
    caixa.innerHTML = '<p class="qz-passo">Pergunta <b>2</b> de 2</p><h3 class="qz-q">Para quando você quer resolver?</h3><div class="qz-ops"></div>';
    botoes(Q2, function (v, txt) { resultado(txt); });
  }
  function resultado(quando) {
    var r = RES[esc1];
    caixa.innerHTML = '<p class="qz-passo">Seu resultado</p><div class="qz-res"><p class="rotulo">O que provavelmente combina com você</p><h4>' + r[0] + '</h4><p>' + r[1] + '</p><p class="qz-preco">' + r[2] + '</p><p>O plano exato sai na avaliação com tomografia, que é grátis.</p><div class="acoes"><a class="bt bt-ouro" href="#" data-quiz>Agendar minha avaliação <i aria-hidden="true">→</i></a><button type="button" class="refaz">Refazer o teste</button></div></div>';
    $('[data-quiz]', caixa).onclick = function (e) { e.preventDefault(); wa('Olá, Dr. Henrique! Fiz o teste no site: ' + r[0] + '. Quero resolver: ' + quando.trim().toLowerCase() + '. Posso agendar a avaliação grátis?'); };
    $('.refaz', caixa).onclick = pergunta1;
  }
  pergunta1();

  // antes e depois: arrastar
  $$('[data-comparar]').forEach(function (c) {
    var r = $('input', c); r.addEventListener('input', function () { c.style.setProperty('--x', r.value + '%'); });
  });

  // simulador de parcela
  var sm = $('.simula'), rg = $('.sm-range', sm), n = 24;
  function parcela() { var v = +rg.value; $('.sm-total', sm).textContent = real(v); $('.sm-mes', sm).innerHTML = real(Math.ceil(v / n)) + '<span>/mês</span>'; }
  rg.addEventListener('input', parcela);
  $('.sm-meses', sm).addEventListener('click', function (e) { var b = e.target.closest('[data-n]'); if (!b) return; n = +b.dataset.n; $$('[data-n]', sm).forEach(function (x) { x.classList.toggle('on', x === b); }); parcela(); });
  parcela();

  // galeria com filtro
  $('.chips').addEventListener('click', function (e) {
    var b = e.target.closest('[data-f]'); if (!b) return;
    $$('.chips button').forEach(function (x) { x.classList.toggle('on', x === b); });
    var vis = 0; $$('.gl-grade figure').forEach(function (f) { var ok = b.dataset.f === 'todas' || f.dataset.c === b.dataset.f; f.hidden = !ok; vis += ok; });
    $('.gl-conta span').textContent = vis;
  });

  // histórias de pacientes
  var CASOS = [['O sorriso que ela adiou por anos', 'Por anos ela quis arrumar o sorriso e sempre desistia na hora. Refizemos as duas arcadas com protocolo. Hoje ela só lamenta não ter vindo antes.', 'antes.webp', 'depois.webp'],
               ['Da dentadura para o dente fixo', 'Doze anos de dentadura que soltava no almoço. Quatro implantes por arcada e, na mesma semana, pipoca no cinema.', 'dentadura.webp', 'sorriso-3.webp'],
               ['Um dente da frente, sem ninguém notar', 'Perdeu o incisivo num acidente de bicicleta. Implante com provisório no mesmo dia: voltou ao trabalho na segunda.', 'um-dente.webp', 'sorriso-1.webp'],
               ['Disseram que não tinha osso', 'Ouviu "não" em duas clínicas. Com enxerto e implante zigomático, saiu com dentes fixos em 72 horas.', 'negatoscopio.webp', 'sorriso-4.webp'],
               ['Coroas novas, cor natural', 'Coroas antigas escuras na frente trocadas por porcelana. Planejado na tela, aprovado antes de começar.', 'coroa-escura.webp', 'definitivos.webp']];
  var re = $('.reel'), ci = 0;
  $('.re-mini', re).innerHTML = CASOS.map(function (c, i) { return '<button type="button" aria-label="' + c[0] + '"><img src="img/' + c[3] + '" alt="" loading="lazy"></button>'; }).join('');
  function caso(i) {
    ci = (i + CASOS.length) % CASOS.length; var c = CASOS[ci];
    $('.re-tit', re).textContent = c[0]; $('.re-desc', re).textContent = c[1];
    $('.re-antes', re).src = 'img/' + c[2]; $('.re-depois', re).src = 'img/' + c[3];
    $('.re-n', re).innerHTML = String(ci + 1).padStart(2, '0') + ' <small>/ ' + String(CASOS.length).padStart(2, '0') + '</small>';
    $$('.re-mini button', re).forEach(function (b, k) { b.classList.toggle('on', k === ci); });
  }
  $('.re-mini', re).addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) caso($$('.re-mini button', re).indexOf(b)); });
  $('.re-ant', re).onclick = function () { caso(ci - 1); }; $('.re-prox', re).onclick = function () { caso(ci + 1); };
  caso(0);

  // avaliações
  var AV = [['Marlene S.', 'há 3 semanas', 'O Dr. Henrique foi calmo, atencioso e cuidadoso. Explicou tudo na tela antes de começar e fez um trabalho lindo nos meus dentes. A equipe é muito acolhedora.'],
            ['Paulo R.', 'há 2 meses', 'Tinha pavor de dentista. Fiz o protocolo com sedação e não senti nada. Três dias depois estava comendo com dente fixo. Recomendo de olhos fechados.'],
            ['Juliana T.', 'há 1 mês', 'Duas clínicas disseram que eu não tinha osso. Aqui fizeram enxerto e implante no mesmo dia. O preço da avaliação foi o preço do fim.'],
            ['Sérgio M.', 'há 5 meses', 'Tirei a dentadura depois de 12 anos. O atendimento é sempre com o mesmo doutor e no horário marcado. Valeu cada centavo.'],
            ['Cláudia B.', 'há 4 meses', 'Fui pela indicação de uma amiga e entendi por que ela falava tanto. Muito profissional, sem empurrar tratamento. Já indiquei minha mãe.']];
  var tr = $('.av-trilho');
  tr.innerHTML = AV.map(function (a) { return '<article><q>' + a[2] + '</q><p class="av-pe"><i>' + a[0].charAt(0) + '</i><span><b>' + a[0] + '</b><small>' + a[1] + '</small></span><span class="est" aria-label="5 estrelas">★★★★★</span></p></article>'; }).join('');
  $('.av-prox').onclick = function () { tr.scrollBy({ left: tr.clientWidth * .7, behavior: 'smooth' }); };
  $('.av-ant').onclick = function () { tr.scrollBy({ left: -tr.clientWidth * .7, behavior: 'smooth' }); };

  // horário ao vivo
  var H = [null, [8, 19], [8, 19], [8, 19], [8, 19], [8, 17], [8, 12]];
  var d = new Date(), h = d.getHours() + d.getMinutes() / 60, hoje = H[d.getDay()], aberto = hoje && h >= hoje[0] && h < hoje[1];
  $('.agora').innerHTML = aberto ? '<b>Aberto agora</b> · até as ' + hoje[1] + 'h' : '<b class="fechado">Fechado agora</b> · ' + (hoje && h < hoje[0] ? 'abre hoje às ' + hoje[0] + 'h' : 'abre ' + (d.getDay() === 6 || d.getDay() === 0 ? 'segunda' : 'amanhã') + ' às 8h');

  // formulários → WhatsApp
  function telOk(v) { return v.replace(/\D/g, '').length >= 10; }
  var pv = $('#privada');
  pv.addEventListener('submit', function (e) {
    e.preventDefault(); var er = $('.erro', pv);
    if (!telOk(pv.tel.value)) { er.textContent = 'Confira o WhatsApp com DDD.'; return; } er.textContent = '';
    wa('Olá, Dr. Henrique! Quero ver a galeria particular de casos parecidos com o meu.');
    $('.pv-linha', pv).outerHTML = '<p style="color:var(--ouro-claro);font-size:15px">Pedido recebido. A galeria chega no seu WhatsApp hoje.</p>';
  });
  var lg = $('#liga');
  lg.addEventListener('submit', function (e) {
    e.preventDefault(); var er = $('.erro', lg), nome = lg.nome.value.trim();
    er.textContent = nome.length < 2 ? 'Escreva o seu nome.' : !telOk(lg.tel.value) ? 'Confira o telefone com DDD.' : '';
    if (er.textContent) return;
    wa('Olá, Dr. Henrique! Sou ' + nome + ' e prefiro que me liguem para agendar a avaliação.');
    lg.innerHTML = '<h3>Combinado, ' + nome.split(' ')[0].replace(/[<>&"]/g, '') + '.</h3><p style="color:var(--areia-2)">A secretária liga em até 1 hora útil.</p>';
  });
})();
