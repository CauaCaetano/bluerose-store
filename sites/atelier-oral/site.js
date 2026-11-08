/*
 * Atelier Oral · comportamento do site (demonstração da Blue Rose)
 * Cada bloco só roda se a página tiver o elemento dele.
 * Agendamento: o formulário monta a mensagem e abre a simulação do WhatsApp da moldura (window.BR_WA);
 * nada é enviado nesta demonstração.
 */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement;
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || doc).querySelectorAll(s)); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SVGNS = 'http://www.w3.org/2000/svg';
  html.classList.remove('no-js');
  html.classList.add('js-pronto');

  /* ---------- aviso curto ---------- */
  var avisoEl = null, avisoT = 0;
  function aviso(txt) {
    if (!avisoEl) { avisoEl = doc.createElement('div'); avisoEl.className = 'aviso-t'; avisoEl.setAttribute('role', 'status'); doc.body.appendChild(avisoEl); }
    avisoEl.textContent = txt; avisoEl.classList.add('ver');
    clearTimeout(avisoT); avisoT = setTimeout(function () { avisoEl.classList.remove('ver'); }, 4200);
  }
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('[data-aviso]'); if (!a) return;
    e.preventDefault(); aviso(a.getAttribute('data-aviso'));
  });

  /* ---------- whatsapp (simulação da moldura) ---------- */
  function whats(msg) {
    if (typeof window.BR_WA === 'function') window.BR_WA(msg);
    else aviso('Demonstração: no site real, esta mensagem abre o WhatsApp da clínica.');
  }

  /* ---------- topo ---------- */
  var topo = $('.topo');
  if (topo) {
    var marcarTopo = function () { topo.classList.toggle('rolou', scrollY > 12); };
    addEventListener('scroll', marcarTopo, { passive: true }); marcarTopo();
  }
  var menuBt = $('.menu-bt'), menu = $('#menu');
  if (menuBt && menu) {
    var fecharMenu = function () { menu.classList.remove('aberto'); menuBt.setAttribute('aria-expanded', 'false'); menuBt.setAttribute('aria-label', 'Abrir menu'); doc.body.classList.remove('menu-on'); };
    menuBt.addEventListener('click', function () {
      var abrir = !menu.classList.contains('aberto');
      menu.classList.toggle('aberto', abrir); menuBt.setAttribute('aria-expanded', String(abrir));
      menuBt.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu'); doc.body.classList.toggle('menu-on', abrir);
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) fecharMenu(); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('aberto')) { fecharMenu(); menuBt.focus(); } });
    addEventListener('resize', function () { if (innerWidth > 960) fecharMenu(); });
  }

  /* ---------- aparecer ao rolar ---------- */
  var alvos = $$('.rev, .cortina, .abre h1');
  if (calmo || !('IntersectionObserver' in window)) alvos.forEach(function (el) { el.classList.add('visto'); });
  else {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { (en.target.__alvo || en.target).classList.add('visto'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    // a cortina começa recortada por inteiro (clip-path); por isso observamos o elemento de fora dela
    alvos.forEach(function (el) { var o = el.classList.contains('cortina') && el.parentElement ? el.parentElement : el; o.__alvo = el; io.observe(o); });
    // segurança: nada fica escondido se o observador falhar (ex.: impressão, captura de tela)
    setTimeout(function () { alvos.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight) el.classList.add('visto'); }); }, 1600);
  }

  /* ---------- método em 5 etapas ---------- */
  var trilho = $('.metodo-trilho');
  if (trilho) {
    var abas = $$('[role="tab"]', trilho);
    var ativar = function (bt, foco) {
      abas.forEach(function (b) {
        var on = b === bt; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
        var p = doc.getElementById(b.getAttribute('aria-controls')); if (p) p.hidden = !on;
      });
      if (foco) bt.focus();
    };
    abas.forEach(function (b, i) {
      b.addEventListener('click', function () { ativar(b); });
      b.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') n = abas[(i + 1) % abas.length];
        if (k === 'ArrowLeft' || k === 'ArrowUp') n = abas[(i - 1 + abas.length) % abas.length];
        if (n) { e.preventDefault(); ativar(n, true); }
      });
    });
    $$('[data-proxima]').forEach(function (b) {
      b.addEventListener('click', function () { var i = +b.getAttribute('data-proxima'); if (abas[i]) ativar(abas[i], true); });
    });
  }

  /* ---------- entenda as possibilidades (modal) ---------- */
  var POSS = {
    apinhamento: { t: 'Dentes apinhados', o: 'Quando falta espaço na arcada, os dentes se sobrepõem ou giram. Além da aparência, isso pode dificultar a higiene entre os dentes.', c: 'Costuma ser tratado com aparelho fixo ou alinhadores. Em alguns casos é preciso criar espaço com pequenos desgastes entre os dentes, expansão da arcada ou, mais raramente, extrações.', l: 'O tempo e o resultado dependem da quantidade de espaço que falta, da saúde da gengiva e do osso e da colaboração com o uso do aparelho. Casos com apinhamento severo podem não ser indicados para alinhadores.', a: 'Só uma avaliação com exame clínico, fotos e escaneamento (ou radiografias, quando indicadas) mostra qual caminho faz sentido.' },
    diastema: { t: 'Espaços entre os dentes', o: 'Diastema é o espaço entre dois dentes, mais comum entre os dois incisivos centrais superiores.', c: 'Pode ser fechado com ortodontia (movendo os dentes), com restaurações em resina ou com cerâmica, ou com uma combinação das duas coisas. Às vezes há um freio labial que também precisa ser avaliado.', l: 'Fechar só com resina ou cerâmica pode deixar dentes largos demais. Se a causa não for tratada, o espaço pode voltar. Nem todo diastema precisa ser fechado.', a: 'A escolha depende do tamanho do espaço, da proporção dos dentes e da causa. É definida na consulta, com você.' },
    mordida: { t: 'Como os dentes se encontram', o: 'Mordida profunda, aberta ou cruzada são formas diferentes de os dentes de cima e de baixo se encaixarem. Elas influenciam a mastigação, o desgaste dos dentes e, às vezes, a articulação.', c: 'O tratamento é ortodôntico (aparelho fixo ou alinhadores com recursos auxiliares). Em adultos com alterações ósseas importantes, pode haver indicação de cirurgia, avaliada com outros especialistas.', l: 'Alguns problemas de mordida têm origem no crescimento dos ossos e não só na posição dos dentes. Nesses casos, a ortodontia sozinha pode ter limites.', a: 'O estudo da mordida usa exame clínico, modelos digitais e, quando indicado, radiografias. A conversa sobre opções vem depois desse estudo.' },
    lentes: { t: 'Lentes de contato dental', o: 'São lâminas finas de cerâmica coladas na frente dos dentes para mudar forma, cor ou pequenas imperfeições.', c: 'O planejamento começa com fotos, escaneamento e um ensaio provisório na boca. Dependendo do caso, pode ser necessário um preparo mínimo do dente. Muitas vezes vale alinhar os dentes antes, com ortodontia.', l: 'Não são indicadas para todos: bruxismo intenso, dentes muito desalinhados, gengiva inflamada ou pouco esmalte podem contraindicar. A cerâmica pode trincar ou descolar e exige manutenção e consultas de controle.', a: 'A indicação é sempre individual. Na avaliação, conversamos sobre o que você espera e sobre o que é possível e seguro no seu caso.' },
    clareamento: { t: 'Clareamento dental', o: 'É um procedimento que deixa os dentes mais claros usando géis à base de peróxido, em consultório, em casa com moldeira ou combinando as duas formas.', c: 'Começa com avaliação e limpeza. O protocolo é escolhido conforme a sensibilidade, a cor de partida e a rotina de cada pessoa.', l: 'A resposta varia de pessoa para pessoa e não é possível prever o tom final. Restaurações, coroas e lentes não clareiam. Pode haver sensibilidade passageira. Dentes com algumas manchas internas respondem menos.', a: 'Antes de clarear, é preciso tratar cáries e problemas de gengiva. Por isso o clareamento sempre começa com uma consulta.' },
    planejamento: { t: 'Planejamento estético', o: 'É o estudo do sorriso como um todo: dentes, gengiva, lábios e rosto. Ele vem antes de qualquer procedimento estético.', c: 'Usamos fotos, vídeos curtos, escaneamento e, quando faz sentido, uma simulação digital e um ensaio provisório para você ver uma proposta antes de decidir.', l: 'A simulação é uma representação para conversar e não garante o resultado final, que depende da biologia de cada pessoa e da execução clínica.', a: 'O planejamento é feito depois da avaliação e apresentado em uma consulta própria, com tempo para perguntas.' }
  };
  var modal = $('#modal-poss');
  if (modal && typeof modal.showModal === 'function') {
    var cbt = null;
    doc.addEventListener('click', function (e) {
      var b = e.target.closest('[data-poss]'); if (!b) return;
      var d = POSS[b.getAttribute('data-poss')]; if (!d) return;
      cbt = b;
      var fig = $('.modal-fig-svg', modal); fig.innerHTML = ''; var s = $('svg', b); if (s) fig.appendChild(s.cloneNode(true));
      $('#modal-t', modal).textContent = d.t;
      $('[data-c="o"]', modal).textContent = d.o; $('[data-c="c"]', modal).textContent = d.c;
      $('[data-c="l"]', modal).textContent = d.l; $('[data-c="a"]', modal).textContent = d.a;
      $('[data-c="wa"]', modal).setAttribute('data-wa', 'Olá, Atelier Oral! Li sobre "' + d.t.toLowerCase() + '" no site e gostaria de marcar uma avaliação para entender o meu caso.');
      modal.showModal();
    });
    modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('.modal-x')) modal.close(); });
    modal.addEventListener('close', function () { if (cbt) cbt.focus(); });
    $('[data-c="wa"]', modal).addEventListener('click', function () { modal.close(); });
  }

  /* ---------- formulário de agendamento ---------- */
  $$('form.form-agendar').forEach(function (f) {
    var tel = $('[name="telefone"]', f), resumo = $('.resumo', f), msgAtual = '';
    if (tel) tel.addEventListener('input', function () {
      var d = tel.value.replace(/\D/g, '').slice(0, 11), r = d;
      if (d.length > 2) r = '(' + d.slice(0, 2) + ') ' + d.slice(2);
      if (d.length > 7) r = '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4);
      tel.value = r;
    });
    var marcar = function (nome, txt) {
      var el = f.elements[nome]; if (!el) return;
      var c = (el.length && !el.tagName ? el[0] : el).closest('.campo'); if (!c) return;
      c.classList.toggle('invalido', !!txt);
      var e = $('.erro', c); if (e) e.textContent = txt || '';
    };
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var nome = f.elements.nome.value.trim(), fone = f.elements.telefone.value.replace(/\D/g, ''), int = f.elements.interesse.value;
      var per = (f.querySelector('[name="periodo"]:checked') || {}).value || '', msg = f.elements.mensagem.value.trim();
      var ok = true;
      marcar('nome', nome.length < 3 ? 'Escreva seu nome.' : ''); if (nome.length < 3) ok = false;
      marcar('telefone', fone.length < 10 ? 'Informe um telefone com DDD.' : ''); if (fone.length < 10) ok = false;
      marcar('interesse', !int ? 'Escolha um assunto.' : ''); if (!int) ok = false;
      marcar('periodo', !per ? 'Escolha um período.' : ''); if (!per) ok = false;
      if (!ok) { var inv = $('.invalido input, .invalido select', f); if (inv) inv.focus(); return; }
      msgAtual = 'Olá, Atelier Oral! Gostaria de agendar uma conversa.\n• Nome: ' + nome + '\n• Telefone: ' + f.elements.telefone.value + '\n• Interesse: ' + int + '\n• Período preferido: ' + per + (msg ? '\n• Mensagem: ' + msg : '');
      var dl = $('dl', resumo);
      dl.innerHTML = '';
      [['Nome', nome], ['Telefone', f.elements.telefone.value], ['Interesse', int], ['Período', per], ['Mensagem', msg || '(sem mensagem)']].forEach(function (p) {
        var dt = doc.createElement('dt'), dd = doc.createElement('dd'); dt.textContent = p[0]; dd.textContent = p[1]; dl.appendChild(dt); dl.appendChild(dd);
      });
      resumo.hidden = false; $('.bt-enviar', f).hidden = true;
      $('h4', resumo).focus();
    });
    $('.resumo-wa', f).addEventListener('click', function () { whats(msgAtual); });
    $('.resumo-corrigir', f).addEventListener('click', function () { resumo.hidden = true; $('.bt-enviar', f).hidden = false; f.elements.nome.focus(); });
    // assunto vindo do link (?interesse=)
    try {
      var q = new URLSearchParams(location.search).get('interesse');
      if (q) [].forEach.call(f.elements.interesse.options, function (o) { if (o.value.toLowerCase().indexOf(q.toLowerCase()) === 0) f.elements.interesse.value = o.value; });
    } catch (e) {}
  });

  /* ---------- arcada (usada no escaneamento e nos alinhadores) ---------- */
  // dentes da arcada superior vista de cima: ângulo ao longo do arco e tamanho (largura x profundidade)
  var DENTES = [[-88, 46, 50], [-72, 44, 48], [-56, 34, 40], [-42, 30, 36], [-29, 26, 34], [-17, 24, 28], [-5.6, 30, 24], [5.6, 30, 24], [17, 24, 28], [29, 26, 34], [42, 30, 36], [56, 34, 40], [72, 44, 48], [88, 46, 50]];
  function noArco(graus, cx, cy, rx, ry) {
    var r = graus * Math.PI / 180;
    return { x: cx + rx * Math.sin(r), y: cy - ry * Math.cos(r), ang: Math.atan2(ry * Math.sin(r), rx * Math.cos(r)) * 180 / Math.PI };
  }
  // distribui os dentes lado a lado ao longo do arco (pelo comprimento do arco, sem sobrepor)
  function distribuir(larguras, cx, cy, rx, ry, folga) {
    var tab = [], s = 0, ant = noArco(-120, cx, cy, rx, ry), sc = 0;
    for (var a = -120; a <= 120; a += .25) { var q = noArco(a, cx, cy, rx, ry); s += Math.hypot(q.x - ant.x, q.y - ant.y); tab.push([a, s]); ant = q; if (Math.abs(a) < .01) sc = s; }
    var total = larguras.reduce(function (t, w) { return t + w + folga; }, -folga), pos = sc - total / 2, out = [];
    larguras.forEach(function (w) {
      var alvo = pos + w / 2, k = 0; while (k < tab.length - 1 && tab[k][1] < alvo) k++;
      out.push(noArco(tab[k][0], cx, cy, rx, ry)); pos += w + folga;
    });
    return out;
  }
  function el(tag, at, pai) { var e = doc.createElementNS(SVGNS, tag); for (var k in at) e.setAttribute(k, at[k]); if (pai) pai.appendChild(e); return e; }

  /* escaneamento: modelo ilustrativo de gesso -> modelo digital */
  var scan = $('#scan');
  if (scan) {
    var svg = $('svg', scan), W = 560, H = 420, cx = 280, cy = 372, rx = 205, ry = 300, ESC = 1.62;
    var defs = el('defs', {}, svg);
    var lg = el('linearGradient', { id: 'feixe-grad', x1: '0', x2: '1' }, defs);
    el('stop', { offset: '0', 'stop-color': '#2F5D5A', 'stop-opacity': '0' }, lg);
    el('stop', { offset: '1', 'stop-color': '#2F5D5A', 'stop-opacity': '.28' }, lg);
    var c1 = el('clipPath', { id: 'clip-gesso' }, defs), r1 = el('rect', { x: 0, y: 0, width: W, height: H }, c1);
    var c2 = el('clipPath', { id: 'clip-malha' }, defs), r2 = el('rect', { x: 0, y: 0, width: 0, height: H }, c2);
    var gesso = el('g', { 'class': 'gesso', 'clip-path': 'url(#clip-gesso)' }, svg);
    var malha = el('g', { 'class': 'malha', 'clip-path': 'url(#clip-malha)' }, svg);
    // base em ferradura
    var base = '';
    for (var a = -96; a <= 96; a += 4) { var q = noArco(a, cx, cy, rx, ry); base += (base ? ' L ' : 'M ') + q.x.toFixed(1) + ' ' + q.y.toFixed(1); }
    el('path', { d: base, 'class': 'base', fill: 'none', stroke: '#E4D8C6', 'stroke-width': 92, 'stroke-linecap': 'round' }, gesso).setAttribute('style', 'fill:none');
    el('path', { d: base, fill: 'none', stroke: '#2F5D5A', 'stroke-width': .8, 'stroke-dasharray': '3 5' }, malha);
    var pontos = [], lugares = distribuir(DENTES.map(function (d) { return d[1] * ESC; }), cx, cy, rx, ry, 3);
    DENTES.forEach(function (d, k) {
      var p = lugares[k], w = d[1] * ESC, h = d[2] * ESC;
      var tr = 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' + p.ang.toFixed(1) + ')';
      var forma = 'M ' + (-w / 2) + ' 0 C ' + (-w / 2) + ' ' + (-h * .62) + ', ' + (w / 2) + ' ' + (-h * .62) + ', ' + (w / 2) + ' 0 C ' + (w / 2) + ' ' + (h * .62) + ', ' + (-w / 2) + ' ' + (h * .62) + ', ' + (-w / 2) + ' 0 Z';
      el('path', { d: forma, transform: tr }, gesso);
      var g = el('g', { transform: tr }, malha);
      el('path', { d: forma }, g);
      el('path', { d: forma, transform: 'scale(.62)' }, g);
      el('path', { d: forma, transform: 'scale(.28)' }, g);
      el('line', { x1: -w / 2, y1: 0, x2: w / 2, y2: 0 }, g);
      el('line', { x1: 0, y1: -h * .47, x2: 0, y2: h * .47 }, g);
      [[-w / 2, 0], [w / 2, 0], [0, -h * .47], [0, h * .47]].forEach(function (q) { el('circle', { cx: q[0], cy: q[1], r: 1.6, 'class': 'pt' }, g); });
      pontos.push(p);
    });
    for (var i = 0; i < pontos.length - 1; i++) el('line', { x1: pontos[i].x, y1: pontos[i].y, x2: pontos[i + 1].x, y2: pontos[i + 1].y, 'stroke-dasharray': '2 3' }, malha);
    var feixe = el('g', {}, svg);
    el('rect', { x: -60, y: 0, width: 60, height: H, 'class': 'feixe' }, feixe);
    el('line', { x1: 0, y1: 0, x2: 0, y2: H, 'class': 'feixe-linha' }, feixe);
    var rng = $('input[type="range"]', scan), etapa = $('.scan-etapa', scan), bt = $('.scan-play', scan), anim = 0;
    var desenhar = function (v) {
      var x = v / 100 * W;
      r1.setAttribute('x', x); r1.setAttribute('width', Math.max(0, W - x)); r2.setAttribute('width', x);
      feixe.setAttribute('transform', 'translate(' + x + ' 0)'); feixe.style.opacity = v <= 0 || v >= 100 ? 0 : 1;
      etapa.textContent = v < 5 ? 'Modelo ilustrativo, como um molde de gesso' : v < 96 ? 'Escaneando: a ponteira registra a superfície em pontos e linhas' : 'Modelo digital pronto para o estudo do caso';
      rng.setAttribute('aria-valuetext', Math.round(v) + '% escaneado');
    };
    rng.addEventListener('input', function () { cancelAnimationFrame(anim); desenhar(+rng.value); });
    bt.addEventListener('click', function () {
      cancelAnimationFrame(anim);
      if (calmo) { rng.value = 100; desenhar(100); return; }
      var t0 = null, de = +rng.value >= 100 ? 0 : +rng.value;
      var passo = function (t) { if (!t0) t0 = t; var v = Math.min(100, de + (t - t0) / 38); rng.value = v; desenhar(v); if (v < 100) anim = requestAnimationFrame(passo); };
      anim = requestAnimationFrame(passo);
    });
    desenhar(+rng.value);
    // toca sozinho uma vez quando aparece na tela
    if (!calmo && 'IntersectionObserver' in window) {
      var io2 = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io2.disconnect(); if (+rng.value === 0) bt.click(); } }, { threshold: .5 });
      io2.observe(scan);
    }
  }

  /* sequência de alinhadores: posição ilustrativa dos dentes da frente, placa a placa */
  var seq = $('#seq');
  if (seq) {
    var s2 = $('svg', seq), cx2 = 280, cy2 = 430, rx2 = 230, ry2 = 360;
    var ANT = DENTES.slice(3, 11);
    var DESV = [[4, 8, 12], [8, 18, -20], [-10, 30, 26], [12, -20, -28], [-8, 24, 22], [10, 26, -24], [-6, 12, 16], [0, 6, -10]]; // dx, dy, rotação na placa 1
    var guia = ''; for (var a2 = -62; a2 <= 62; a2 += 4) { var q2 = noArco(a2, cx2, cy2, rx2, ry2); guia += (guia ? ' L ' : 'M ') + q2.x.toFixed(1) + ' ' + q2.y.toFixed(1); }
    el('path', { d: guia, fill: 'none', stroke: '#2F5D5A', 'stroke-dasharray': '4 5', 'stroke-width': 1.2 }, s2);
    var lug2 = distribuir(ANT.map(function (d) { return d[1] * 1.9; }), cx2, cy2, rx2, ry2, 4);
    var gd = ANT.map(function (d, i) {
      var p = lug2[i], w = d[1] * 1.9, h = d[2] * 1.8;
      var forma = 'M ' + (-w / 2) + ' 0 C ' + (-w / 2) + ' ' + (-h * .62) + ', ' + (w / 2) + ' ' + (-h * .62) + ', ' + (w / 2) + ' 0 C ' + (w / 2) + ' ' + (h * .62) + ', ' + (-w / 2) + ' ' + (h * .62) + ', ' + (-w / 2) + ' 0 Z';
      var g = el('g', {}, s2);
      el('path', { d: forma, fill: '#FFFFFF', stroke: '#9C8466', 'stroke-width': 1.4 }, g);
      el('path', { d: forma, transform: 'scale(.45)', fill: 'none', stroke: '#D9CDBE', 'stroke-width': 1.2 }, g);
      return { g: g, p: p, d: DESV[i] };
    });
    var r3 = $('input[type="range"]', seq), nEl = $('.seq-n b', seq), txt = $('.seq-txt', seq);
    var pos = function (n) {
      var t = (n - 1) / 19, e = 1 - Math.pow(1 - t, 1.6);
      gd.forEach(function (o) {
        var k = 1 - e;
        o.g.setAttribute('transform', 'translate(' + (o.p.x + o.d[0] * k).toFixed(1) + ' ' + (o.p.y + o.d[1] * k).toFixed(1) + ') rotate(' + (o.p.ang + o.d[2] * k).toFixed(1) + ')');
      });
      nEl.textContent = n;
      txt.textContent = n === 1 ? 'Primeira placa: começa o movimento planejado. As trocas costumam acontecer a cada uma ou duas semanas, conforme orientação.' : n < 20 ? 'Cada placa faz um movimento pequeno. As consultas de acompanhamento conferem se os dentes estão seguindo o planejado.' : 'Última placa desta sequência ilustrativa. Depois vem a contenção, para manter os dentes na nova posição.';
      r3.setAttribute('aria-valuetext', 'Placa ' + n + ' de 20');
    };
    r3.addEventListener('input', function () { pos(+r3.value); });
    pos(+r3.value);
  }

  /* ---------- escala de cor (estética) ---------- */
  var esc = $('.escala');
  if (esc) {
    var et = $('.escala-txt');
    $$('button', esc).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('button', esc).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        et.textContent = b.getAttribute('data-txt');
      });
    });
  }

  /* ---------- horário de hoje ---------- */
  var tab = $('.horario');
  if (tab) { var dia = new Date().getDay(), lin = $('tr[data-dia="' + dia + '"]', tab); if (lin) lin.classList.add('hoje'); }
})();
