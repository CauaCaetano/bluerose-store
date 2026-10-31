// Dr. Henrique Sato · menu que vira pílula (e abre no celular), contador de implantes, teste de 60 segundos,
// simulador de parcela, galeria com filtro, horário ao vivo e pedidos pelo WhatsApp.
// Cada bloco só roda se a página tiver o elemento dele (o mesmo arquivo serve a home e as páginas internas).
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wa = function (m) { if (window.BR_WA) window.BR_WA(m); };

  // menu: some na abertura e volta como pílula flutuante
  var topo = $('.topo'), heroi = $('.heroi');
  function menu() { topo.classList.toggle('pilula', !heroi || scrollY > heroi.offsetHeight - 120); }
  addEventListener('scroll', menu, { passive: true }); menu();

  // menu do celular
  var mb = $('.menu-bt');
  if (mb) {
    var fecha = function () { topo.classList.remove('aberto'); mb.setAttribute('aria-expanded', 'false'); mb.setAttribute('aria-label', 'Abrir menu'); };
    mb.addEventListener('click', function () { var ab = topo.classList.toggle('aberto'); mb.setAttribute('aria-expanded', String(ab)); mb.setAttribute('aria-label', ab ? 'Fechar menu' : 'Abrir menu'); });
    $$('.menu a').forEach(function (a) { a.addEventListener('click', fecha); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && topo.classList.contains('aberto')) { fecha(); mb.focus(); } });
    addEventListener('resize', function () { if (innerWidth > 1080) fecha(); });
  }

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

  // teste de 60 segundos: situação + tempo → sugestão com preço de partida e a página do tratamento
  var caixa = $('.qz-caixa');
  if (caixa) {
    var Q1 = [['um', 'Falta um dente'], ['varios', 'Faltam vários ou quase todos os dentes'], ['dentadura', 'A dentadura ou a ponte móvel incomoda'], ['osso', 'Disseram que não tenho osso para implante'], ['quebrado', 'Tenho um dente quebrado, mole ou doendo'], ['falhou', 'Um implante feito em outro lugar deu problema'], ['estetica', 'Quero um sorriso mais bonito'], ['revisao', 'Só quero uma revisão, ou não sei']];
    var Q2 = [['ja', 'Quero resolver o quanto antes'], ['mes', 'Nos próximos meses'], ['pesquisa', 'Ainda estou pesquisando']];
    var RES = {
      um: ['Implante unitário', 'Um implante com coroa de porcelana, colocado com guia. Em muitos casos o dente provisório sai no mesmo dia.', 'a partir de R$ 2.290 · até 24x de R$ 96', 'tratamento-implante.html'],
      varios: ['Protocolo fixo', 'Uma arcada inteira presa em 4 a 6 implantes, com dentes fixos provisórios em até 72 horas quando o osso permite.', 'a partir de R$ 14.900 por arcada · até 24x de R$ 621', 'tratamento-protocolo.html'],
      dentadura: ['Dentadura fixa sobre implante', 'A dentadura fica presa em implantes e você não tira para comer nem para dormir.', 'a partir de R$ 14.900 por arcada · até 24x', 'tratamento-protocolo.html'],
      osso: ['Enxerto ou implante zigomático', 'Em muitos casos dá para refazer o osso ou usar o implante que se apoia no osso da face. A tomografia mostra o que é possível.', 'o valor depende da tomografia, feita na avaliação', 'tratamento-enxerto.html'],
      quebrado: ['Avaliação de urgência', 'Vemos o dente no mesmo dia. Se não der para salvar, a extração e o implante podem ser planejados juntos.', 'consulta com tomografia', 'tratamento-urgencia.html'],
      falhou: ['Resgate de implante', 'Avaliamos o implante antigo e, se for preciso, ele é retirado com cuidado e refeito com material de marca.', 'o valor sai por escrito na avaliação', 'tratamento-implante.html'],
      estetica: ['Coroas e facetas', 'Porcelana ou zircônia, com o sorriso planejado na tela antes de começar.', 'a partir de R$ 1.290 por dente · até 24x', 'tratamento-coroas.html'],
      revisao: ['Avaliação completa', 'Exame, tomografia e uma conversa honesta sobre o que precisa e o que pode esperar.', 'sem compromisso', 'tratamento-manutencao.html']
    };
    var esc1 = null;
    var botoes = function (lista, cb) {
      $('.qz-ops', caixa).innerHTML = lista.map(function (o, i) { return '<button type="button" data-v="' + o[0] + '"><span>' + String.fromCharCode(65 + i) + '</span>' + o[1] + '</button>'; }).join('');
      $('.qz-ops', caixa).onclick = function (e) { var b = e.target.closest('[data-v]'); if (b) cb(b.dataset.v, b.textContent.slice(1)); };
    };
    var pergunta1 = function () {
      caixa.innerHTML = '<p class="qz-passo">Pergunta <b>1</b> de 2</p><h3 class="qz-q">O que trouxe você até aqui?</h3><div class="qz-ops"></div>';
      botoes(Q1, function (v) { esc1 = v; pergunta2(); });
    };
    var pergunta2 = function () {
      caixa.innerHTML = '<p class="qz-passo">Pergunta <b>2</b> de 2</p><h3 class="qz-q">Para quando você quer resolver?</h3><div class="qz-ops"></div>';
      botoes(Q2, function (v, txt) { resultado(txt); });
    };
    var resultado = function (quando) {
      var r = RES[esc1];
      caixa.innerHTML = '<p class="qz-passo">Sua sugestão</p><div class="qz-res"><p class="rotulo">O que pode combinar com você</p><h4>' + r[0] + '</h4><p>' + r[1] + '</p><p class="qz-preco">' + r[2] + '</p><p>O plano exato sai na avaliação com tomografia. <a href="' + r[3] + '" style="color:var(--ouro-claro);text-decoration:underline">Ler sobre o tratamento</a></p><div class="acoes"><a class="bt bt-ouro" href="#" data-quiz>Agendar minha avaliação <i aria-hidden="true">→</i></a><button type="button" class="refaz">Refazer o teste</button></div></div>';
      $('[data-quiz]', caixa).onclick = function (e) { e.preventDefault(); wa('Olá, Dr. Henrique! Fiz o teste no site: ' + r[0] + '. Quero resolver: ' + quando.trim().toLowerCase() + '. Posso agendar a avaliação?'); };
      $('.refaz', caixa).onclick = pergunta1;
    };
    pergunta1();
  }

  // simulador de parcela
  var sm = $('.simula');
  if (sm) {
    var rg = $('.sm-range', sm), n = 24;
    var parcela = function () { var v = +rg.value; $('.sm-total', sm).textContent = real(v); $('.sm-mes', sm).innerHTML = real(Math.ceil(v / n)) + '<span>/mês</span>'; };
    rg.addEventListener('input', parcela);
    $('.sm-meses', sm).addEventListener('click', function (e) { var b = e.target.closest('[data-n]'); if (!b) return; n = +b.dataset.n; $$('[data-n]', sm).forEach(function (x) { x.classList.toggle('on', x === b); }); parcela(); });
    parcela();
  }

  // galeria com filtro
  var chips = $('.chips[data-filtro]');
  if (chips) chips.addEventListener('click', function (e) {
    var b = e.target.closest('[data-f]'); if (!b) return;
    $$('button', chips).forEach(function (x) { x.classList.toggle('on', x === b); });
    var vis = 0; $$('.gl-grade figure').forEach(function (f) { var ok = b.dataset.f === 'todas' || f.dataset.c === b.dataset.f; f.hidden = !ok; vis += ok; });
    var c = $('.gl-conta span'); if (c) c.textContent = vis;
  });

  // horário ao vivo
  var ag = $('.agora');
  if (ag) {
    var H = [null, [8, 19], [8, 19], [8, 19], [8, 19], [8, 17], [8, 12]];
    var d = new Date(), h = d.getHours() + d.getMinutes() / 60, hoje = H[d.getDay()], aberto = hoje && h >= hoje[0] && h < hoje[1];
    ag.innerHTML = aberto ? '<b>Aberto agora</b> · até as ' + hoje[1] + 'h' : '<b class="fechado">Fechado agora</b> · ' + (hoje && h < hoje[0] ? 'abre hoje às ' + hoje[0] + 'h' : 'abre ' + (d.getDay() === 6 || d.getDay() === 0 ? 'segunda' : 'amanhã') + ' às 8h');
  }

  // formulário "prefere que a gente ligue?" → WhatsApp
  var telOk = function (v) { return v.replace(/\D/g, '').length >= 10; };
  var lg = $('#liga');
  if (lg) lg.addEventListener('submit', function (e) {
    e.preventDefault(); var er = $('.erro', lg), nome = lg.nome.value.trim();
    er.textContent = nome.length < 2 ? 'Escreva o seu nome.' : !telOk(lg.tel.value) ? 'Confira o telefone com DDD.' : '';
    if (er.textContent) return;
    wa('Olá, Dr. Henrique! Sou ' + nome + ' e prefiro que me liguem para agendar a avaliação.');
    lg.innerHTML = '<h3>Combinado, ' + nome.split(' ')[0].replace(/[<>&"]/g, '') + '.</h3><p style="color:var(--areia-2)">A secretária liga em até 1 hora útil.</p>';
  });
})();
