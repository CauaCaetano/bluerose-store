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
