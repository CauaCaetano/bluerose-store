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
  function menu() { topo.classList.toggle('pilula', !heroi || scrollY > 60); }
  addEventListener('scroll', menu, { passive: true }); menu();

  // barra do celular: só aparece depois que os botões da abertura saem da tela
  var barra = $('.barra-cel'), acoesHeroi = $('.heroi-acoes');
  if (barra && acoesHeroi && 'IntersectionObserver' in window) {
    barra.classList.add('escondida');
    new IntersectionObserver(function (es) { barra.classList.toggle('escondida', es[0].isIntersecting || es[0].boundingClientRect.top > 0); }).observe(acoesHeroi);
  }

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
      um: ['Implante unitário', 'Um implante com coroa de porcelana, colocado com guia. Em muitos casos o dente provisório sai no mesmo dia.', 'valor informado na avaliação · até 24x', 'tratamento-implante.html'],
      varios: ['Protocolo fixo', 'Uma arcada inteira presa em 4 a 6 implantes, com dentes fixos provisórios em até 72 horas quando o osso permite.', 'valor informado na avaliação · até 24x', 'tratamento-protocolo.html'],
      dentadura: ['Dentadura fixa sobre implante', 'A dentadura fica presa em implantes e você não tira para comer nem para dormir.', 'valor informado na avaliação · até 24x', 'tratamento-protocolo.html'],
      osso: ['Enxerto ou implante zigomático', 'Em muitos casos dá para refazer o osso ou usar o implante que se apoia no osso da face. A tomografia mostra o que é possível.', 'o valor depende da tomografia, feita na avaliação', 'tratamento-enxerto.html'],
      quebrado: ['Avaliação de urgência', 'Vemos o dente no mesmo dia. Se não der para salvar, a extração e o implante podem ser planejados juntos.', 'consulta com tomografia', 'tratamento-urgencia.html'],
      falhou: ['Resgate de implante', 'Avaliamos o implante antigo e, se for preciso, ele é retirado com cuidado e refeito com material de marca.', 'o valor sai por escrito na avaliação', 'tratamento-implante.html'],
      estetica: ['Coroas e facetas', 'Porcelana ou zircônia, com o sorriso planejado na tela antes de começar.', 'valor informado na avaliação · até 24x', 'tratamento-coroas.html'],
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
      caixa.innerHTML = '<p class="qz-passo">Sua sugestão</p><div class="qz-res"><p class="rotulo">O que pode combinar com você</p><h4>' + r[0] + '</h4><p>' + r[1] + '</p><p class="qz-preco">' + r[2] + '</p><p>O plano exato sai na avaliação com tomografia. </p><div class="acoes"><a class="bt bt-ouro" href="#" data-quiz>Agendar minha avaliação <i aria-hidden="true">→</i></a><a class="bt bt-contorno" href="' + r[3] + '">Ler sobre o tratamento</a><button type="button" class="bt bt-contorno refazer">Refazer o teste</button></div></div>';
      $('[data-quiz]', caixa).onclick = function (e) { e.preventDefault(); wa('Olá, Dr. Henrique! Fiz o teste no site: ' + r[0] + '. Quero resolver: ' + quando.trim().toLowerCase() + '. Posso agendar a avaliação?'); };
      $('.refazer', caixa).onclick = pergunta1;
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

// ---------- processo contado na rolagem: a foto acompanha a etapa lida ----------
(function () {
  var hist = document.querySelector('.cm-historia'); if (!hist || !('IntersectionObserver' in window)) return;
  var fotos = hist.querySelectorAll('.cm-palco img'), etapas = hist.querySelectorAll('.cm-etapas li');
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (!e.isIntersecting) return; var k = e.target.getAttribute('data-p');
      [].forEach.call(etapas, function (li) { li.classList.toggle('on', li === e.target); });
      [].forEach.call(fotos, function (im) { im.classList.toggle('on', im.getAttribute('data-p') === k); }); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  [].forEach.call(etapas, function (li) { io.observe(li); });
})();

// ---------- agendamento em painel lateral (08/11/2026): em passos, sem sair da página, envio simulado ----------
(function () {
  'use strict';
  var PASSOS = [
    { chave: 'motivo', titulo: 'O que trouxe você?', ops: ['Falta um dente', 'Faltam vários dentes ou uso dentadura', 'Disseram que não tenho osso', 'Dente quebrado, mole ou com dor', 'Revisão, ou ainda não sei'] },
    { chave: 'quando', titulo: 'Para quando?', ops: ['Esta semana', 'Próxima semana', 'Ainda estou pesquisando'] },
    { chave: 'periodo', titulo: 'Qual período?', ops: ['Manhã', 'Tarde', 'Sábado de manhã'] }
  ];
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var painel, fundo, corpo, barra, voltar, ultimoFoco, passo = 0, resp = {};
  function monta() {
    fundo = document.createElement('div'); fundo.className = 'ag-fundo'; fundo.hidden = true;
    painel = document.createElement('aside'); painel.className = 'ag-painel'; painel.hidden = true;
    painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-modal', 'true'); painel.setAttribute('aria-labelledby', 'ag-tit');
    painel.innerHTML = '<div class="ag-cab"><button type="button" class="ag-voltar" aria-label="Voltar">←</button><p class="ag-marca">Agendar avaliação</p><button type="button" class="ag-x" aria-label="Fechar">×</button></div>' +
      '<div class="ag-barra" aria-hidden="true"><span></span></div><div class="ag-corpo" aria-live="polite"></div>';
    document.body.appendChild(fundo); document.body.appendChild(painel);
    corpo = painel.querySelector('.ag-corpo'); barra = painel.querySelector('.ag-barra span'); voltar = painel.querySelector('.ag-voltar');
    fundo.addEventListener('click', fecha);
    painel.querySelector('.ag-x').addEventListener('click', fecha);
    voltar.addEventListener('click', function () { if (passo > 0) { passo--; mostra(); } });
    painel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') fecha();
      if (e.key === 'Tab') { var f = painel.querySelectorAll('button:not([hidden]), input, a[href]'); f = [].filter.call(f, function (x) { return x.offsetParent; }); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    });
  }
  function mostra() {
    var total = PASSOS.length + 1;
    barra.style.width = Math.min(100, (passo + 1) / (total + 1) * 100) + '%';
    voltar.style.visibility = passo > 0 && passo <= PASSOS.length ? 'visible' : 'hidden';
    if (passo < PASSOS.length) {
      var p = PASSOS[passo];
      corpo.innerHTML = '<p class="ag-passo">Passo ' + (passo + 1) + ' de ' + total + '</p><h2 id="ag-tit">' + p.titulo + '</h2><div class="ag-ops">' +
        p.ops.map(function (o) { return '<button type="button" class="ag-op' + (resp[p.chave] === o ? ' on' : '') + '">' + esc(o) + '</button>'; }).join('') + '</div>';
      [].forEach.call(corpo.querySelectorAll('.ag-op'), function (b) { b.addEventListener('click', function () { resp[p.chave] = b.textContent; passo++; mostra(); }); });
      var foco = corpo.querySelector('.ag-op.on') || corpo.querySelector('.ag-op'); if (foco) foco.focus();
    } else if (passo === PASSOS.length) {
      corpo.innerHTML = '<p class="ag-passo">Passo ' + total + ' de ' + total + '</p><h2 id="ag-tit">Seus dados</h2>' +
        '<form class="ag-form" novalidate><label>Nome<input name="nome" autocomplete="name" value="' + esc(resp.nome || '') + '"></label>' +
        '<label>Telefone com DDD<input name="tel" inputmode="tel" autocomplete="tel" value="' + esc(resp.tel || '') + '"></label>' +
        '<fieldset><legend>Como prefere o contato?</legend><div class="ag-ops ag-ops-linha"><button type="button" class="ag-op' + (resp.contato !== 'Ligação' ? ' on' : '') + '" data-c="WhatsApp">WhatsApp</button><button type="button" class="ag-op' + (resp.contato === 'Ligação' ? ' on' : '') + '" data-c="Ligação">Ligação</button></div></fieldset>' +
        '<p class="ag-erro" aria-live="polite"></p><button class="bt bt-ouro ag-enviar" type="submit">Pedir horário <i aria-hidden="true">→</i></button>' +
        '<p class="ag-nota">Demonstração: nada é enviado. No site real, a secretária confirma o horário em até 1 hora útil.</p></form>';
      var form = corpo.querySelector('form'); resp.contato = resp.contato || 'WhatsApp';
      [].forEach.call(form.querySelectorAll('[data-c]'), function (b) { b.addEventListener('click', function () { resp.contato = b.dataset.c; [].forEach.call(form.querySelectorAll('[data-c]'), function (x) { x.classList.toggle('on', x === b); }); }); });
      form.addEventListener('submit', function (e) {
        e.preventDefault(); var nome = form.nome.value.trim(), tel = form.tel.value.replace(/\D/g, '');
        var er = nome.length < 2 ? 'Escreva o seu nome.' : tel.length < 10 ? 'Confira o telefone com DDD.' : '';
        form.querySelector('.ag-erro').textContent = er; if (er) { (nome.length < 2 ? form.nome : form.tel).focus(); return; }
        resp.nome = nome; resp.tel = form.tel.value.trim(); passo++; mostra();
      });
      form.nome.focus();
    } else {
      barra.style.width = '100%';
      corpo.innerHTML = '<div class="ag-ok"><span class="ag-selo" aria-hidden="true">✓</span><h2 id="ag-tit">Pedido recebido.</h2><p>Obrigado, ' + esc(resp.nome.split(' ')[0]) + '. Veja o resumo:</p>' +
        '<dl><div><dt>Motivo</dt><dd>' + esc(resp.motivo) + '</dd></div><div><dt>Quando</dt><dd>' + esc(resp.quando) + ' · ' + esc(resp.periodo) + '</dd></div><div><dt>Contato</dt><dd>' + esc(resp.contato) + ' · <span class="ag-tel">' + esc(resp.tel) + '</span></dd></div></dl>' +
        '<p class="ag-nota">Demonstração: nada foi enviado. No site real, a secretária confirma o horário por ' + esc(resp.contato) + ' em até 1 hora útil.</p><button type="button" class="bt bt-contorno-e ag-fim">Fechar</button></div>';
      corpo.querySelector('.ag-fim').addEventListener('click', fecha); corpo.querySelector('.ag-fim').focus();
    }
  }
  function abre(e) {
    if (e) e.preventDefault();
    if (!painel) monta();
    ultimoFoco = document.activeElement;
    if (passo > PASSOS.length) { passo = 0; resp = {}; }
    fundo.hidden = false; painel.hidden = false; document.documentElement.classList.add('ag-aberto');
    requestAnimationFrame(function () { fundo.classList.add('on'); painel.classList.add('on'); });
    mostra();
  }
  function fecha() {
    if (!painel || painel.hidden) return;
    fundo.classList.remove('on'); painel.classList.remove('on'); document.documentElement.classList.remove('ag-aberto');
    setTimeout(function () { painel.hidden = true; fundo.hidden = true; }, 320);
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href="#final"], [data-agendar]');
    if (a) abre(e);
  });
})();
