// Monolito · carregamento, menu, revelações por rolagem, apresentação presa em 3 passos, mapa em perspectiva,
// catálogo de plantas com slider, configurador com preço, painel do cliente e vista de cima em rolagem lateral.
// Páginas internas: catálogo de residências com filtro e ficha e espaços comerciais com filtro.
// Cada bloco só roda se a página tiver os elementos dele.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var raiz = document.documentElement;
  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mil = function (v) { return 'R$ ' + (Math.round(v / 1000) * 1000).toLocaleString('pt-BR'); };
  var NS = 'http://www.w3.org/2000/svg';

  // ---------- carregamento ----------
  (function () {
    var n = $('.carrega-num'), l = $('.carrega-linha i'), ini = performance.now(), dur = reduz ? 1 : 1300, feito = false;
    function passo(t) {
      var k = Math.min(1, (t - ini) / dur), v = Math.round(k * 100);
      if (n) n.textContent = v + '%'; if (l) l.style.width = v + '%';
      if (k < 1) requestAnimationFrame(passo); else fim();
    }
    function fim() { if (feito) return; feito = true; raiz.classList.add('pronto'); window.dispatchEvent(new Event('monolito:pronto')); }
    requestAnimationFrame(passo); setTimeout(fim, 3500);
  })();

  // ---------- menu ----------
  var bm = $('.pl-menu'), painelMenu = $('#menu-painel');
  function menu(abre) { bm.setAttribute('aria-expanded', String(abre)); painelMenu.hidden = !abre; }
  bm.addEventListener('click', function () { menu(painelMenu.hidden); });
  painelMenu.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !painelMenu.hidden) { menu(false); bm.focus(); } });
  document.addEventListener('click', function (e) { if (!painelMenu.hidden && !e.target.closest('.pilula')) menu(false); });
  document.addEventListener('click', function (e) { if (e.target.closest('[data-explorar]')) window.dispatchEvent(new Event('monolito:explorar')); });

  // ---------- texto quebrado em palavras e letras ----------
  $$('[data-palavras]').forEach(function (el) {
    var i = 0;
    el.innerHTML = el.textContent.trim().split(/\s+/).map(function (w) { return '<span class="pv" style="--i:' + (i++) + '">' + w + '</span>'; }).join(' ');
  });
  $$('[data-letras]').forEach(function (el) {
    var i = 0;
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = el.textContent.trim().split(' ').map(function (w) {
      return '<span class="lt-linha" aria-hidden="true">' + w.split('').map(function (c) { return '<span class="lt" style="--i:' + (i++) + '">' + c + '</span>'; }).join('') + '</span>';
    }).join('<span class="lt-esp" aria-hidden="true"> </span>');
  });
  $$('[data-espalha]').forEach(function (el) {
    var t = el.textContent.trim().split(''), meio = (t.length - 1) / 2;
    el.innerHTML = t.map(function (c, i) { return c === ' ' ? '<span class="le le-esp" aria-hidden="true" style="--d:0"></span>' : '<span class="le" aria-hidden="true" style="--d:' + ((i - meio) * 5).toFixed(1) + '">' + c + '</span>'; }).join('');
  });

  var largo = function () { return window.innerWidth > 900; };
  var obs = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      if (el.closest('.passo') && largo()) return;
      el.classList.add('visto'); obs.unobserve(el);
      if (el.hasAttribute('data-conta')) conta(el);
    });
  }, { threshold: .25 }) : null;
  $$('[data-palavras], [data-letras], [data-conta]').forEach(function (el) { if (obs) obs.observe(el); else el.classList.add('visto'); });
  function conta(el) {
    var alvo = +el.dataset.conta, suf = el.dataset.suf || '', ini = performance.now();
    if (reduz) return;
    (function f(t) { var k = Math.min(1, (t - ini) / 1400); el.textContent = Math.round(alvo * (1 - Math.pow(1 - k, 3))) + suf; if (k < 1) requestAnimationFrame(f); })(ini);
  }

  // ---------- rolagem: progresso de cada seção ----------
  var progs = $$('[data-prog]'), intro = $('.intro'), passos = $$('.passo'), passoAtual = 0, jeito = $('.jeito');
  var prog = $('.in-prog'), progNum = $('.in-prog b');
  function rolar() {
    var vh = window.innerHeight;
    progs.forEach(function (el) {
      var r = el.getBoundingClientRect(), p;
      if (r.bottom < -vh || r.top > vh * 2) return;
      if (el.offsetHeight > vh * 1.4) p = Math.min(1, Math.max(0, -r.top / (r.height - vh)));
      else p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      el.style.setProperty('--p', p.toFixed(4));
      if (el === intro && passos.length && largo()) {
        var idx = Math.min(2, Math.floor(p * 3 * 0.999)), sp = p * 3 - idx;
        if (idx !== passoAtual) {
          passos[passoAtual].classList.remove('ativo'); passos[idx].classList.add('ativo'); passoAtual = idx;
          progNum.textContent = '0' + (idx + 1);
          if (idx === 2) $$('[data-conta]', passos[2]).forEach(function (b) { if (!b.dataset.ok) { b.dataset.ok = 1; conta(b); } });
        }
        passos[idx].style.setProperty('--sp', sp.toFixed(3));
        prog.style.setProperty('--p', p.toFixed(3));
      }
      if (el === jeito) el.style.setProperty('--p2', Math.min(1, Math.max(0, (vh - r.top) / (vh * .95))).toFixed(3));
    });
  }
  var pedido = false;
  window.addEventListener('scroll', function () { if (!pedido) { pedido = true; requestAnimationFrame(function () { pedido = false; rolar(); }); } }, { passive: true });
  window.addEventListener('resize', rolar);
  rolar();
  if (!largo()) passos.forEach(function (p) { p.classList.add('ativo'); });

  // ---------- onde já construímos: lista e mapa em perspectiva ----------
  var LUG = [
    ['Alphaville Ribeirão', 14, 9, 600, 150], ['Vila do Golfe', 12, 7, 220, 140], ['Quinta da Alvorada', 11, 12, 640, 430],
    ['Jardim Olhos d’Água', 9, 6, 170, 420], ['Bonfim Paulista', 10, 15, 470, 540], ['Nova Aliança Sul', 8, 5, 300, 300]
  ];
  var mapa = $('.ar-plano svg');
  if (mapa) (function () {
    var s = '<g stroke="#cbc3ad" stroke-width="2" fill="none">';
    var ruas = [[0, 90, 800, 60], [0, 230, 800, 260], [0, 380, 800, 350], [0, 520, 800, 560], [120, 0, 90, 600], [270, 0, 330, 600], [520, 0, 480, 600], [690, 0, 720, 600], [0, 600, 420, 0], [380, 600, 800, 160]];
    ruas.forEach(function (r) { s += '<line x1="' + r[0] + '" y1="' + r[1] + '" x2="' + r[2] + '" y2="' + r[3] + '"/>'; });
    s += '</g><g stroke="#e2dccb" stroke-width="1" fill="none">';
    for (var i = 0; i < 16; i++) s += '<line x1="' + (i * 55) + '" y1="0" x2="' + (i * 55 - 80) + '" y2="600"/>';
    for (var j = 0; j < 12; j++) s += '<line x1="0" y1="' + (j * 55) + '" x2="800" y2="' + (j * 55 + 30) + '"/>';
    s += '</g><path d="M60 470 C 200 380, 330 330, 420 300 S 650 190, 760 120" stroke="#d9cfb6" stroke-width="14" fill="none" stroke-linecap="round"/>';
    s += '<g class="sede"><rect x="388" y="270" width="40" height="40" rx="4" fill="#a8814c"/><rect x="403" y="276" width="10" height="28" fill="#fdfbef"/><text x="408" y="335" text-anchor="middle" font-size="14" fill="#2e3a26" font-family="Work Sans, sans-serif">escritório</text></g>';
    LUG.forEach(function (l, k) {
      s += '<line x1="408" y1="290" x2="' + l[3] + '" y2="' + l[4] + '" stroke="#a8814c" stroke-width="1.4" stroke-dasharray="4 6" opacity=".55"/>';
      s += '<g class="pino" data-k="' + k + '"><circle class="anel" cx="' + l[3] + '" cy="' + l[4] + '" r="12" fill="none" stroke="#a8814c" stroke-width="2"/><circle class="c" cx="' + l[3] + '" cy="' + l[4] + '" r="10" fill="#a8814c"/><text x="' + l[3] + '" y="' + (l[4] + 32) + '" text-anchor="middle">' + l[0] + '</text></g>';
    });
    mapa.innerHTML = s;
  })();
  var lista = $('.ar-itens');
  if (lista) {
  lista.innerHTML = LUG.map(function (l, k) { return '<li><button type="button" data-k="' + k + '" aria-pressed="' + (k === 0) + '">' + l[0] + '<small>' + l[1] + ' casas · ' + l[2] + ' km</small></button></li>'; }).join('');
  function lugar(k) {
    $$('button', lista).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.k === k)); });
    $$('.pino', mapa).forEach(function (p) { p.classList.toggle('ativo', +p.dataset.k === k); });
  }
  lista.addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (b) lugar(+b.dataset.k); });
  lista.addEventListener('mouseover', function (e) { var b = e.target.closest('[data-k]'); if (b) lugar(+b.dataset.k); });
  lugar(0);
  }

  // ---------- plantas ----------
  // nome, área, suítes, terreno mínimo, preço base (essencial), meses, foto, cômodos [x,y,l,a,nome]
  var PL = [
    ['Casa Vale', 280, 3, '15×30', 1690000, 10, 'casa-branca', [[0, 0, 40, 45, 'estar'], [40, 0, 30, 45, 'cozinha'], [70, 0, 30, 45, 'gourmet'], [0, 45, 33, 55, 'suíte 1'], [33, 45, 33, 55, 'suíte 2'], [66, 45, 34, 55, 'suíte 3']]],
    ['Casa Lago', 340, 4, '20×30', 2140000, 11, 'hero', [[0, 0, 50, 50, 'estar e jantar'], [50, 0, 25, 50, 'cozinha'], [75, 0, 25, 50, 'escritório'], [0, 50, 25, 50, 'suíte 1'], [25, 50, 25, 50, 'suíte 2'], [50, 50, 25, 50, 'suíte 3'], [75, 50, 25, 50, 'master']]],
    ['Casa Pátio', 310, 4, '18×32', 1940000, 11, 'casa-piscina-2', [[0, 0, 100, 28, 'estar · cozinha · gourmet'], [0, 28, 28, 44, 'suíte 1'], [28, 28, 44, 44, 'pátio'], [72, 28, 28, 44, 'suíte 2'], [0, 72, 50, 28, 'suíte 3'], [50, 72, 50, 28, 'master']]],
    ['Casa Mirante', 420, 5, '25×35', 2790000, 13, 'casa2', [[0, 0, 60, 40, 'estar duplo'], [60, 0, 40, 40, 'cozinha'], [0, 40, 25, 30, 'suíte 1'], [25, 40, 25, 30, 'suíte 2'], [50, 40, 25, 30, 'suíte 3'], [75, 40, 25, 30, 'suíte 4'], [0, 70, 100, 30, 'master com closet']]],
    ['Casa Térrea Prime', 240, 3, '12×30', 1390000, 9, 'casa-rodape', [[0, 0, 55, 40, 'estar integrado'], [55, 0, 45, 40, 'cozinha e gourmet'], [0, 40, 34, 60, 'suíte 1'], [34, 40, 33, 60, 'suíte 2'], [67, 40, 33, 60, 'master']]],
    ['Casa Jardim', 500, 6, '30×40', 3380000, 14, 'casa-palmeiras', [[0, 0, 50, 35, 'estar'], [50, 0, 50, 35, 'jantar e cozinha'], [0, 35, 33, 32, 'suíte 1'], [33, 35, 34, 32, 'home theater'], [67, 35, 33, 32, 'suíte 2'], [0, 67, 25, 33, 'suíte 3'], [25, 67, 25, 33, 'suíte 4'], [50, 67, 25, 33, 'suíte 5'], [75, 67, 25, 33, 'master']]]
  ];
  var desenho = function (p) {
    return '<svg viewBox="-3 -3 106 106" role="img" aria-label="Planta baixa simplificada da ' + p[0] + '">' + p[7].map(function (c) {
      return '<rect x="' + c[0] + '" y="' + c[1] + '" width="' + c[2] + '" height="' + c[3] + '" fill="none" stroke="#2e3a26" stroke-width=".7"/><text x="' + (c[0] + c[2] / 2) + '" y="' + (c[1] + c[3] / 2 + 1.4) + '" font-size="3.6" text-anchor="middle" fill="#8c6a3b" font-family="Work Sans, sans-serif">' + c[4] + '</text>';
    }).join('') + '</svg>';
  };
  var filtro = 0, plAtual = 0, slide = 0, plTimer;
  var nomes = $('.pl-nomes'), slides = $('.pl-slides'), ficha = $('.pl-ficha');
  if (nomes) {
  function listar() {
    var vis = PL.map(function (p, i) { return i; }).filter(function (i) { var q = PL[i][2]; return !filtro || (filtro === 5 ? q >= 5 : q === filtro); });
    if (vis.indexOf(plAtual) < 0) plAtual = vis[0];
    nomes.innerHTML = vis.map(function (i) { return '<li><button type="button" data-i="' + i + '" aria-pressed="' + (i === plAtual) + '">' + PL[i][0] + '<small>' + PL[i][1] + ' m²</small></button></li>'; }).join('');
    $('.pl-conta b').textContent = vis.length;
    mostrar(plAtual);
  }
  function mostrar(i) {
    plAtual = i; slide = 0;
    var p = PL[i];
    $$('button', nomes).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.i === i)); });
    slides.innerHTML = '<div class="pl-slide on"><img src="img/' + p[6] + '.webp" alt="Casa de alto padrão no estilo da ' + p[0] + '"></div><div class="pl-slide desenho">' + desenho(p) + '</div>';
    ficha.innerHTML = '<div><h3>' + p[0] + '</h3><dl><dt>área</dt><dd>' + p[1] + ' m²</dd><dt>suítes</dt><dd>' + p[2] + ' suítes</dd><dt>terreno</dt><dd>terreno a partir de ' + p[3] + ' m</dd><dt>obra</dt><dd>obra de ' + p[5] + ' meses</dd></dl></div><p class="pr"><small>a partir de</small>' + mil(p[4]) + '</p><a href="#monte" data-pl="' + i + '">Personalizar esta planta</a>';
    agenda();
  }
  function vai(d) { var s = $$('.pl-slide', slides); s[slide].classList.remove('on'); slide = (slide + d + s.length) % s.length; s[slide].classList.add('on'); agenda(); }
  function agenda() { clearTimeout(plTimer); if (!reduz) plTimer = setTimeout(function () { vai(1); }, 5200); }
  $('.seta-e').addEventListener('click', function () { vai(-1); });
  $('.seta-d').addEventListener('click', function () { vai(1); });
  nomes.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) mostrar(+b.dataset.i); });
  $('.filtros').addEventListener('click', function (e) { var b = e.target.closest('[data-q]'); if (!b) return; filtro = +b.dataset.q; $$('[data-q]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); listar(); });
  listar();
  }

  // ---------- configurador ----------
  var m = $('#monta');
  if (m) {
  m.pl.innerHTML = PL.map(function (p, i) { return '<option value="' + i + '">' + p[0] + ' · ' + p[1] + ' m² · ' + p[2] + ' suítes</option>'; }).join('');
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-pl]'); if (b) { m.pl.value = b.dataset.pl; calc(); } });
  function calc() {
    var p = PL[+m.pl.value], ac = +m.querySelector('[name=ac]:checked').value, base = p[4] * (1 + ac), adds = $$('[name=o]:checked', m);
    var extra = adds.reduce(function (s, x) { return s + +x.value; }, 0), total = base + extra, nivel = m.querySelector('[name=ac]:checked + span b').textContent;
    $('.ficha').innerHTML = '<p class="tit">' + p[0] + ' · ' + p[1] + ' m² · ' + nivel + '</p><p class="tot">' + mil(total) + '</p><p class="sub">' + mil(total / p[1]) + ' por m² · obra de ' + (p[5] + (adds.length > 2 ? 1 : 0)) + ' meses</p>' +
      '<ul><li><span>Projeto, aprovação e obra</span><span>' + mil(base) + '</span></li>' + adds.map(function (x) { return '<li><span>' + x.dataset.n + '</span><span>' + mil(+x.value) + '</span></li>'; }).join('') + '<li><span>Teto contratual de variação</span><span>0%</span></li></ul>' +
      '<a class="bt-borda claro" href="#" data-wa="Olá, Monolito! Configurei a ' + p[0] + ' (' + nivel + (adds.length ? ', com ' + adds.map(function (x) { return x.dataset.n.toLowerCase(); }).join(', ') : '') + ') por ' + mil(total) + '. Quero agendar a reunião.">Agendar reunião com este projeto <span aria-hidden="true">⟶</span></a>';
  }
  m.addEventListener('change', calc); calc();
  }

  // ---------- painel do cliente (exemplo) ----------
  var ETAPAS = [['Fundação', 0, 8, 100], ['Estrutura', 6, 10, 100], ['Alvenaria', 12, 8, 100], ['Cobertura', 18, 6, 85], ['Instalações', 16, 14, 60], ['Revestimentos', 24, 12, 20], ['Esquadrias', 30, 6, 0], ['Acabamento', 34, 10, 0]];
  var DESC = {
    crono: ['Cronograma', 'Cada etapa com início, duração e quanto já foi feito, atualizado pelo engenheiro toda sexta. Se algo atrasa, o motivo aparece aqui antes de você perguntar.'],
    fin: ['Financeiro', 'O orçado e o realizado de cada item, com nota fiscal anexada. Você vê o que já pagou e o que falta, sem planilha paralela.'],
    fotos: ['Diário de obra', 'Fotos do dia com legenda: o que foi feito, quem estava na obra e o que vem na semana seguinte.'],
    dec: ['Decisões', 'Tudo o que depende de você, com prazo e opções enviadas pelo arquiteto. Aprovou aqui, está registrado no contrato.']
  };
  var ABAS = {
    crono: function () { return '<p>Semana 27 de 44 · <b>no prazo</b> · previsão de entrega: 26/02/2027</p><div class="gantt">' + ETAPAS.map(function (e) { var l = e[1] / 44 * 100, w = e[2] / 44 * 100; return '<div><span>' + e[0] + '</span><span class="tr"><i style="left:' + l + '%;width:' + w * e[3] / 100 + '%"></i><i class="f" style="left:' + (l + w * e[3] / 100) + '%;width:' + w * (1 - e[3] / 100) + '%"></i></span><em>' + e[3] + '%</em></div>'; }).join('') + '</div>'; },
    fin: function () { return '<div class="fin"><p><b>R$ 1.690.000</b>contrato</p><p><b>R$ 1.012.400</b>pago até hoje (60%)</p><p><b>−0,4%</b>gasto real × orçado</p></div><table class="tab"><thead><tr><th>Item</th><th>Orçado</th><th>Realizado</th></tr></thead><tbody><tr><td>Concreto e aço</td><td>R$ 218.000</td><td>R$ 214.300</td></tr><tr><td>Alvenaria e cobertura</td><td>R$ 196.000</td><td>R$ 197.900</td></tr><tr><td>Elétrica e hidráulica</td><td>R$ 162.000</td><td>R$ 96.800 (60%)</td></tr><tr><td>Porcelanato 120×120</td><td>R$ 88.400</td><td>R$ 87.100 (comprado)</td></tr></tbody></table>'; },
    fotos: function () { return '<div class="diario"><figure style="margin:0"><img src="img/marceneiro.webp" alt="Marceneiro trabalhando na obra"><p>Hoje · marcenaria da cozinha medida</p></figure><figure style="margin:0"><img src="img/cozinha.webp" alt="Cozinha em fase de acabamento"><p>Ontem · bancada de quartzo instalada</p></figure><figure style="margin:0"><img src="img/banho.webp" alt="Banheiro da suíte master"><p>23/10 · revestimento da suíte master</p></figure></div>'; },
    dec: function () { return '<div class="dec"><div class="pend"><span><b>Escolher a cuba da suíte master</b><br><small>3 opções enviadas pelo arquiteto · até sexta</small></span><button type="button" data-ok>Aprovar</button></div><div class="pend"><span><b>Cor da esquadria</b><br><small>preto fosco ou bronze · até 05/11</small></span><button type="button" data-ok>Aprovar</button></div><div><span><b>Porcelanato da área social</b><br><small>aprovado por você em 12/10</small></span><span>✓</span></div></div>'; }
  };
  function aba(k) {
    $$('[data-t]').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.t === k)); });
    $('.tela-corpo').innerHTML = ABAS[k]();
    $('.pn-desc .olho').textContent = DESC[k][0]; $('.pn-d').textContent = DESC[k][1];
  }
  if ($('.pn-abas')) {
  $('.pn-abas').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) aba(b.dataset.t); });
  $('.tela-corpo').addEventListener('click', function (e) { var b = e.target.closest('[data-ok]'); if (b) { b.parentNode.classList.remove('pend'); b.outerHTML = '<span>✓ aprovado agora</span>'; } });
  aba('crono');
  }

  // ---------- vista de cima (ilustração aérea) ----------
  (function () {
    var svg = $('.cm-mapa'); if (!svg) return;
    var s = '<defs>' +
      '<linearGradient id="g-grama" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#557a37"/><stop offset=".5" stop-color="#4a6c30"/><stop offset="1" stop-color="#3f5c29"/></linearGradient>' +
      '<pattern id="p-grama" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="url(#g-grama)"/><circle cx="3" cy="4" r="1.2" fill="#2f4a1f" opacity=".35"/><circle cx="10" cy="11" r="1" fill="#6a8f45" opacity=".4"/></pattern>' +
      '<pattern id="p-calcada" width="46" height="30" patternUnits="userSpaceOnUse"><rect width="46" height="30" fill="#b9b4a8"/><path d="M0 0H46M0 15H46M0 0V15M23 15V30" stroke="#9c978b" stroke-width="2"/></pattern>' +
      '<pattern id="p-telha" width="18" height="10" patternUnits="userSpaceOnUse"><rect width="18" height="10" fill="#2a2e2b"/><path d="M0 0V10" stroke="#454b47" stroke-width="3"/></pattern>' +
      '<pattern id="p-deck" width="400" height="16" patternUnits="userSpaceOnUse"><rect width="400" height="16" fill="#a57b51"/><path d="M0 15.5H400" stroke="#7d5a37" stroke-width="2"/></pattern>' +
      '<pattern id="p-solar" width="36" height="22" patternUnits="userSpaceOnUse"><rect width="36" height="22" fill="#27415e"/><path d="M0 0H36V22" stroke="#7d93ad" stroke-width="1.6" fill="none"/></pattern>' +
      '<linearGradient id="g-agua" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8ad7e6"/><stop offset="1" stop-color="#2f8faf"/></linearGradient>' +
      '<radialGradient id="g-copa" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#7aa648"/><stop offset=".6" stop-color="#4f7a2e"/><stop offset="1" stop-color="#2e4d1c"/></radialGradient>' +
      '<filter id="f-sombra" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="22" dy="26" stdDeviation="14" flood-color="#0d1508" flood-opacity=".55"/></filter>' +
      '<filter id="f-arv" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="16" dy="20" stdDeviation="10" flood-color="#0d1508" flood-opacity=".5"/></filter>' +
      '</defs>';
    s += '<rect width="3000" height="1000" fill="url(#p-grama)"/>';
    s += '<rect y="0" width="3000" height="60" fill="url(#p-calcada)"/>';
    s += '<rect y="760" width="3000" height="60" fill="url(#p-calcada)"/><rect y="820" width="3000" height="180" fill="#3a3c39"/><path d="M0 912H3000" stroke="#e8e4d8" stroke-width="5" stroke-dasharray="46 40"/><path d="M0 826H3000" stroke="#55574f" stroke-width="6"/>';
    var CASAS = [['A', 'Casa Lago · 340 m² · entregue em 11 meses'], ['B', 'Casa Mirante · 420 m² · 13 meses do projeto à chave'], ['C', 'Casa Pátio · 310 m² · 0,8% abaixo do orçado']];
    CASAS.forEach(function (c, k) {
      var x = 160 + k * 960, inv = k === 1;
      s += '<g>';
      s += '<rect x="' + x + '" y="110" width="820" height="620" fill="#5d8240" opacity=".45"/>';
      s += '<rect x="' + (x + 380) + '" y="560" width="110" height="200" fill="url(#p-calcada)"/>';
      var rx = inv ? x + 420 : x + 60, sx = inv ? x + 60 : x + 470;
      s += '<g filter="url(#f-sombra)"><rect x="' + rx + '" y="150" width="340" height="300" fill="url(#p-telha)"/><rect x="' + sx + '" y="190" width="290" height="230" fill="#ebe6db"/><rect x="' + (sx + 30) + '" y="215" width="150" height="90" fill="url(#p-solar)"/></g>';
      s += '<text class="rotulo" x="' + (rx + 170) + '" y="350" text-anchor="middle">' + c[0] + '</text>';
      var px = inv ? x + 90 : x + 450;
      s += '<rect x="' + (px - 20) + '" y="470" width="320" height="120" fill="url(#p-deck)"/><rect x="' + px + '" y="488" width="250" height="84" rx="6" fill="url(#g-agua)" stroke="#f3f0e8" stroke-width="9"/>';
      s += '<text class="nome" x="' + (x + 20) + '" y="712">' + c[1] + '</text>';
      [[x + 40, 520, 52], [x + 770, 600, 64], [x + 760, 160, 46], [x + (inv ? 760 : 380), 470, 40]].forEach(function (a) {
        s += '<g filter="url(#f-arv)"><circle cx="' + a[0] + '" cy="' + a[1] + '" r="' + a[2] + '" fill="url(#g-copa)"/><circle cx="' + (a[0] - a[2] * .35) + '" cy="' + (a[1] - a[2] * .3) + '" r="' + a[2] * .5 + '" fill="#86b153" opacity=".35"/></g>';
      });
      s += '</g>';
    });
    [[60, 900, 40], [1060, 930, 46], [2050, 905, 38], [2920, 930, 50]].forEach(function (a) { s += '<circle cx="' + a[0] + '" cy="' + (a[1] - 160) + '" r="' + a[2] + '" fill="url(#g-copa)" filter="url(#f-arv)"/>'; });
    svg.innerHTML = s;
  })();

  // ---------- residências (residencias.html): filtro por suítes, área e terreno; ficha numa janela ----------
  var rs = $('.rs-lista'), rf = $('#rs-filtros');
  if (rs && rf) {
    var rsLista = function () {
      var q = +rf.su.value, ar = +rf.ar.value, tr = rf.tr.value;
      rf.ar.previousElementSibling.textContent = 'até ' + ar + ' m²';
      var vis = PL.map(function (p, i) { return i; }).filter(function (i) {
        var p = PL[i], lado = +p[3].split('×')[0];
        return (!q || (q === 5 ? p[2] >= 5 : p[2] === q)) && p[1] <= ar && (!tr || (tr === 'p' ? lado <= 15 : tr === 'm' ? lado > 15 && lado <= 20 : lado > 20));
      });
      $('.rs-total').textContent = vis.length + (vis.length === 1 ? ' residência' : ' residências');
      rs.innerHTML = vis.length ? vis.map(function (i) {
        var p = PL[i];
        return '<li class="rs-card"><button type="button" data-rs="' + i + '"><span class="rs-des">' + desenho(p) + '</span><b>' + p[0] + '</b><span class="rs-dados">' + p[1] + ' m²<br>' + p[2] + ' suítes<br>terreno a partir de ' + p[3] + ' m</span><span class="rs-pe"><em>a partir de ' + mil(p[4]) + '</em><span>Ver ficha ⟶</span></span></button></li>';
      }).join('') : '<li class="rs-vazio">Nenhuma planta com esses filtros. A gente adapta uma planta ao seu terreno: fale com o arquiteto.</li>';
    };
    rf.addEventListener('input', rsLista); rf.addEventListener('reset', function () { setTimeout(rsLista, 0); }); rsLista();
    var rd = $('.rs-dlg');
    rs.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rs]'); if (!b) return; var p = PL[+b.dataset.rs];
      $('.rs-dlg-corpo', rd).innerHTML = '<img src="img/' + p[6] + '.webp" alt="Casa de alto padrão no estilo da ' + p[0] + '"><div class="rs-dlg-txt"><p class="olho ouro">Residência</p><h2>' + p[0] + '</h2>' +
        '<dl><dt>Área construída</dt><dd>' + p[1] + ' m²</dd><dt>Suítes</dt><dd>' + p[2] + '</dd><dt>Terreno mínimo</dt><dd>' + p[3] + ' m</dd><dt>Obra</dt><dd>' + p[5] + ' meses</dd><dt>A partir de</dt><dd>' + mil(p[4]) + '</dd><dt>Por m²</dt><dd>' + mil(p[4] / p[1]) + '</dd></dl>' +
        '<div class="rs-dlg-planta">' + desenho(p) + '</div>' +
        '<p class="rs-dlg-acoes"><a class="bt-borda" href="#" data-wa="Olá, Monolito! Quero a ficha completa da ' + p[0] + ' (' + p[1] + ' m²).">Pedir a ficha completa <span aria-hidden="true">⟶</span></a><a class="bt-borda" href="index.html#monte">Configurar no site <span aria-hidden="true">⟶</span></a></p></div>';
      rd.showModal();
    });
    $('.rs-x', rd).addEventListener('click', function () { rd.close(); });
    rd.addEventListener('click', function (e) { if (e.target === rd) rd.close(); });
  }

  // ---------- espaços comerciais (lojas.html): filtro por tipo e situação ----------
  var lj = $('.lj-tab');
  if (lj) {
    var ljF = $('#lj-filtros');
    var ljFiltra = function () {
      var tp = ljF.tp.value, st = ljF.st.value, n = 0;
      $$('tbody tr', lj).forEach(function (tr) { var ok = (!tp || tr.dataset.tp === tp) && (!st || tr.dataset.st === st); tr.hidden = !ok; if (ok) n++; });
      $('.lj-total').textContent = n + (n === 1 ? ' espaço' : ' espaços');
    };
    ljF.addEventListener('change', ljFiltra); ljFiltra();
  }

  // ---------- contato ----------
  var ct = $('#ct');
  if (ct) ct.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = ct.nome.value.trim(), t = ct.tel.value.replace(/\D/g, ''), er = $('.erro', ct);
    er.textContent = n.length < 2 ? 'Escreva seu nome.' : t.length < 10 ? 'Confira o WhatsApp com DDD.' : !ct.ok.checked ? 'Marque a autorização de contato.' : '';
    if (er.textContent) return;
    if (window.BR_WA) window.BR_WA('Olá, Monolito! Sou ' + n + '. ' + ct.ter.value + ' e quero agendar a reunião com arquiteto e engenheiro.');
    ct.innerHTML = '<p style="grid-column:1/-1;font:400 28px/1.15 var(--serif)">Pedido recebido, ' + n.split(' ')[0] + '. Ligamos hoje para marcar o dia.</p>';
  });
})();
