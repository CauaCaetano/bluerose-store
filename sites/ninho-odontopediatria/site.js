/* Ninho Odontopediatria (site de exemplo). Cada bloco só roda se a página tiver o elemento dele.
   WhatsApp: os botões [data-wa] são tratados pela moldura (simulação, nada é enviado);
   o formulário de agendamento monta a mensagem e chama window.BR_WA. */
(function () {
  'use strict';
  var doc = document;
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || doc).querySelectorAll(s)); };
  var calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- menu ----------
  var bt = $('.menu-bt'), menu = $('#menu');
  if (bt && menu) {
    var fechar = function () { menu.classList.remove('aberto'); bt.setAttribute('aria-expanded', 'false'); bt.setAttribute('aria-label', 'Abrir menu'); };
    bt.addEventListener('click', function () {
      var abrir = !menu.classList.contains('aberto');
      menu.classList.toggle('aberto', abrir);
      bt.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      bt.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) fechar(); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });
    addEventListener('resize', function () { if (innerWidth > 1220) fechar(); });
  }

  // ---------- entrada suave ----------
  var surgem = $$('.surge');
  if (!('IntersectionObserver' in window) || calmo) surgem.forEach(function (el) { el.classList.add('visto'); });
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    surgem.forEach(function (el) { io.observe(el); });
    // garantia: nada fica invisível se o observador falhar (impressão, captura de tela inteira)
    setTimeout(function () { surgem.forEach(function (el) { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('visto'); }); }, 1200);
    addEventListener('beforeprint', function () { surgem.forEach(function (el) { el.classList.add('visto'); }); });
  }

  // ---------- creme dental por idade ----------
  var pasta = $('#pasta');
  if (pasta) {
    var DADOS = [
      { t: 'Gaze ou dedeira, sem creme dental', d: 'Antes dos dentes, limpe a gengiva com gaze ou fralda limpa umedecida em água, uma vez ao dia, de preferência à noite.', r: 0 },
      { t: 'Um grão de arroz', d: 'Do primeiro dente até os 3 anos: uma camada fina, do tamanho de um grão de arroz cru. O adulto escova, duas vezes ao dia.', r: 4 },
      { t: 'Um grão de ervilha', d: 'Dos 3 aos 6 anos: quantidade de um grão de ervilha. A criança cospe o excesso, sem enxaguar demais. O adulto completa a escovação.', r: 7.5 },
      { t: 'Ervilha, com mais autonomia', d: 'Acima de 6 anos: mantém a quantidade de uma ervilha. A criança escova sozinha e o adulto confere à noite, até ela ter firmeza nos movimentos.', r: 8.5 }
    ];
    var gota = $('.gota', pasta);
    var mostrar = function (i) {
      var d = DADOS[i];
      $('[data-pasta="t"]', pasta).textContent = d.t;
      $('[data-pasta="d"]', pasta).textContent = d.d;
      if (gota) { gota.setAttribute('rx', d.r * 1.15); gota.setAttribute('ry', d.r); gota.setAttribute('cy', 52 - d.r); }
    };
    $$('input[name="pasta"]', pasta).forEach(function (r) { r.addEventListener('change', function () { mostrar(+r.value); }); });
    var marcado = $('input[name="pasta"]:checked', pasta);
    mostrar(marcado ? +marcado.value : 0);
  }

  // ---------- linha do tempo dos dentes ----------
  var dentes = $('#dentes');
  if (dentes) {
    var botoes = $$('[data-etapa]', dentes), todos = $$('.dente', dentes), atual = 0;
    var casa = function (k, d) { var p = k.split('-'); return p.length > 1 ? d === k : d.indexOf(k + '-') === 0; };
    var ir = function (n) {
      atual = Math.max(0, Math.min(botoes.length - 1, n));
      var chaves = botoes.map(function (b) { return b.getAttribute('data-etapa'); });
      todos.forEach(function (el) {
        var d = el.getAttribute('data-d'), est = '';
        for (var i = 0; i < chaves.length; i++) if (casa(chaves[i], d)) { est = i < atual ? 'ja' : i === atual ? 'agora' : ''; break; }
        el.classList.toggle('ja', est === 'ja'); el.classList.toggle('agora', est === 'agora');
      });
      botoes.forEach(function (b, i) { b.setAttribute('aria-pressed', i === atual ? 'true' : 'false'); });
    };
    botoes.forEach(function (b, i) { b.addEventListener('click', function () { ir(i); }); });
    $$('[data-ir]', dentes).forEach(function (b) { b.addEventListener('click', function () { ir(atual + (+b.getAttribute('data-ir'))); }); });
    ir(0);
  }

  // ---------- espaço: planta e abas ----------
  var salas = $('#salas');
  if (salas) {
    var painel = $('.sala-painel', salas);
    var abrirSala = function (k) {
      var tpl = $('template[data-sala="' + k + '"]', salas);
      if (!tpl) return;
      painel.innerHTML = '';
      painel.appendChild(tpl.content.cloneNode(true));
      $$('.sala', salas).forEach(function (g) { g.classList.toggle('ativa', g.getAttribute('data-sala') === k); });
      $$('.sala-tabs button', salas).forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-sala') === k ? 'true' : 'false'); });
    };
    $$('[data-sala]', salas).forEach(function (el) {
      if (el.tagName === 'TEMPLATE') return;
      el.addEventListener('click', function () { abrirSala(el.getAttribute('data-sala')); });
      el.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && el.tagName !== 'BUTTON') { e.preventDefault(); abrirSala(el.getAttribute('data-sala')); } });
    });
  }

  // ---------- tratamentos: índice acompanha a leitura ----------
  var indice = $('.trat-indice');
  if (indice && 'IntersectionObserver' in window) {
    var links = $$('a', indice);
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('ativo', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    $$('.trat-item').forEach(function (s) { obs.observe(s); });
  }

  // ---------- agendamento ----------
  var form = $('#form-agendar');
  if (form) {
    var q = new URLSearchParams(location.search);
    var idade = $('#f-idade'), motivo = $('#f-mot'), tel = $('#f-tel');
    if (q.get('idade') && $('option[value="' + CSS.escape(q.get('idade')) + '"]', idade)) idade.value = q.get('idade');
    if (q.get('motivo') && $('option[value="' + CSS.escape(q.get('motivo')) + '"]', motivo)) motivo.value = q.get('motivo');
    var nota12 = $('.nota-12', form);
    var ver12 = function () { if (nota12) nota12.hidden = idade.value !== '12+'; };
    idade.addEventListener('change', ver12); ver12();

    tel.addEventListener('input', function () {
      var d = tel.value.replace(/\D/g, '').slice(0, 11), s = d;
      if (d.length > 2) s = '(' + d.slice(0, 2) + ') ' + d.slice(2);
      if (d.length > 7) s = '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(d.length - 4);
      tel.value = s;
    });

    var regras = [
      ['#f-resp', function (v) { return v.trim().length >= 3; }],
      ['#f-tel', function (v) { var n = v.replace(/\D/g, ''); return n.length === 10 || n.length === 11; }],
      ['#f-cri', function (v) { return v.trim().length >= 2; }],
      ['#f-idade', function (v) { return !!v; }],
      ['#f-mot', function (v) { return !!v; }]
    ];
    regras.forEach(function (r) {
      var el = $(r[0]);
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', function () { if (el.closest('.campo').classList.contains('invalido') && r[1](el.value)) el.closest('.campo').classList.remove('invalido'); });
    });

    var resumo = $('#resumo'), lista = $('#resumo-lista'), msg = '';
    var txt = function (sel) { var el = $(sel); return el.tagName === 'SELECT' ? el.options[el.selectedIndex].text : el.value.trim(); };
    var radio = function (n) { var r = $('input[name="' + n + '"]:checked', form); return r ? r.value : ''; };
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var primeiro = null;
      regras.forEach(function (r) {
        var el = $(r[0]), ok = r[1](el.value);
        el.closest('.campo').classList.toggle('invalido', !ok);
        el.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok && !primeiro) primeiro = el;
      });
      var ck = $('#f-ok');
      ck.closest('.consent').style.color = ck.checked ? '' : '#9B3B2A';
      if (!ck.checked && !primeiro) primeiro = ck;
      $('.erro-geral', form).hidden = !primeiro;
      if (primeiro) { primeiro.focus(); return; }

      var itens = [
        ['Responsável', txt('#f-resp')], ['WhatsApp', txt('#f-tel')], ['Criança', txt('#f-cri')], ['Idade', txt('#f-idade')],
        ['Primeira consulta', radio('primeira')], ['Motivo', txt('#f-mot')], ['Período', radio('periodo')]
      ];
      var obs = txt('#f-obs');
      if (obs) itens.push(['Observação', obs]);
      lista.innerHTML = itens.map(function (i) { return '<dt>' + esc(i[0]) + '</dt><dd>' + esc(i[1]) + '</dd>'; }).join('');
      msg = 'Olá, Ninho Odontopediatria! Quero agendar uma consulta.\n' +
        '• Nome: ' + txt('#f-resp') + '\n• Criança: ' + txt('#f-cri') + ' (' + txt('#f-idade') + ')\n' +
        '• Primeira consulta: ' + radio('primeira') + '\n• Motivo: ' + txt('#f-mot') + '\n• Período: ' + radio('periodo') +
        '\n• WhatsApp: ' + txt('#f-tel') + (obs ? '\n• Observação: ' + obs : '') + '\nAguardo a confirmação do horário.';
      form.hidden = true;
      resumo.classList.add('mostra');
      resumo.focus();
      resumo.scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'start' });
    });
    $('#editar').addEventListener('click', function () { resumo.classList.remove('mostra'); form.hidden = false; $('#f-resp').focus(); });
    $('#enviar-wa').addEventListener('click', function () {
      if (window.BR_WA) window.BR_WA(msg);
    });
  }

  // ---------- contato ----------
  var rota = $('[data-rota]');
  if (rota) rota.addEventListener('click', function (e) { e.preventDefault(); var a = $('.rota-aviso'); if (a) a.hidden = false; });
  var agora = $('.h-agora');
  if (agora) {
    // horário de Recife (UTC−3, sem horário de verão)
    var d = new Date(Date.now() - 3 * 3600 * 1000), dia = d.getUTCDay(), h = d.getUTCHours() + d.getUTCMinutes() / 60;
    var aberto = (dia >= 1 && dia <= 5 && h >= 8 && h < 18) || (dia === 6 && h >= 8 && h < 12);
    agora.textContent = aberto ? 'Agora a clínica está aberta (horário de Recife). Resposta pelo WhatsApp em instantes.' : 'Agora a clínica está fechada. Deixe sua mensagem no WhatsApp: respondemos no próximo horário de atendimento.';
  }
})();

// ---------- agendamento em painel lateral (08/11/2026): em passos, sem sair da página, envio simulado ----------
(function () {
  'use strict';
  var PASSOS = [
    { chave: 'idade', titulo: 'Qual a idade da criança?', ops: ['Até 6 meses', '7 a 12 meses', '1 a 2 anos', '3 a 5 anos', '6 a 9 anos', '10 a 12 anos'] },
    { chave: 'motivo', titulo: 'Qual o motivo da visita?', ops: ['Primeira consulta', 'Revisão e limpeza', 'Dor ou dente machucado', 'Chupeta, dedo ou mamadeira', 'Outro motivo'] },
    { chave: 'periodo', titulo: 'Melhor período?', ops: ['Manhã', 'Tarde', 'Sábado de manhã'] }
  ];
  var IDADES = { 'ate-6m': 'Até 6 meses', '7-12m': '7 a 12 meses', '1-2': '1 a 2 anos', '3-5': '3 a 5 anos', '6-9': '6 a 9 anos', '10-12': '10 a 12 anos' };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var painel, fundo, corpo, barra, voltar, ultimoFoco, passo = 0, resp = {};
  function monta() {
    fundo = document.createElement('div'); fundo.className = 'ag-fundo'; fundo.hidden = true;
    painel = document.createElement('aside'); painel.className = 'ag-painel'; painel.hidden = true;
    painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-modal', 'true'); painel.setAttribute('aria-labelledby', 'ag-tit');
    painel.innerHTML = '<div class="ag-cab"><button type="button" class="ag-voltar" aria-label="Voltar">←</button><p class="ag-marca">Agendar no <b>ninho</b></p><button type="button" class="ag-x" aria-label="Fechar">×</button></div>' +
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
        '<form class="ag-form" novalidate><label>Seu nome (responsável)<input name="nome" autocomplete="name" value="' + esc(resp.nome || '') + '"></label>' +
        '<label>Telefone com DDD<input name="tel" inputmode="tel" autocomplete="tel" value="' + esc(resp.tel || '') + '"></label>' +
        '<fieldset><legend>Como prefere o contato?</legend><div class="ag-ops ag-ops-linha"><button type="button" class="ag-op' + (resp.contato !== 'Ligação' ? ' on' : '') + '" data-c="WhatsApp">WhatsApp</button><button type="button" class="ag-op' + (resp.contato === 'Ligação' ? ' on' : '') + '" data-c="Ligação">Ligação</button></div></fieldset>' +
        '<p class="ag-erro" aria-live="polite"></p><button class="bt ag-enviar" type="submit">Pedir horário</button>' +
        '<p class="ag-nota">Demonstração: nada é enviado. No site real, a equipe responde pelo WhatsApp e confirma o horário.</p></form>';
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
      corpo.innerHTML = '<div class="ag-ok"><span class="ag-selo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><h2 id="ag-tit">Pedido recebido!</h2><p>Obrigado, ' + esc(resp.nome.split(' ')[0]) + '. Veja o resumo:</p>' +
        '<dl><div><dt>Idade</dt><dd>' + esc(resp.idade) + '</dd></div><div><dt>Motivo</dt><dd>' + esc(resp.motivo) + '</dd></div><div><dt>Período</dt><dd>' + esc(resp.periodo) + '</dd></div><div><dt>Contato</dt><dd>' + esc(resp.contato) + ' · <span class="ag-tel">' + esc(resp.tel) + '</span></dd></div></dl>' +
        '<p class="ag-nota">Demonstração: nada foi enviado. No site real, a equipe confirma o horário por ' + esc(resp.contato) + '.</p><button type="button" class="bt bt-claro ag-fim">Fechar</button></div>';
      corpo.querySelector('.ag-fim').addEventListener('click', fecha); corpo.querySelector('.ag-fim').focus();
    }
  }
  function abre(e, a) {
    if (e) e.preventDefault();
    var m = a && /idade=([\w-]+)/.exec(a.getAttribute('href') || '');
    if (!painel) monta();
    ultimoFoco = document.activeElement;
    if (passo > PASSOS.length) { passo = 0; resp = {}; }
    if (m && IDADES[m[1]]) { resp.idade = IDADES[m[1]]; passo = 1; }
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
    if (document.getElementById('form-agendar')) return;
    var a = e.target.closest('a[href="agendar.html"], a[href^="agendar.html?"], [data-agendar]');
    if (a) abre(e, a);
  });
})();

// ---------- "como funciona" contado na rolagem: a foto acompanha o passo lido ----------
(function () {
  var hist = document.querySelector('.ph-historia'); if (!hist || !('IntersectionObserver' in window)) return;
  var fotos = hist.querySelectorAll('.ph-palco img'), etapas = hist.querySelectorAll('.ph-passos li');
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (!e.isIntersecting) return; var k = e.target.getAttribute('data-p');
      [].forEach.call(etapas, function (li) { li.classList.toggle('on', li === e.target); });
      [].forEach.call(fotos, function (im) { im.classList.toggle('on', im.getAttribute('data-p') === k); }); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  [].forEach.call(etapas, function (li) { io.observe(li); });
})();
