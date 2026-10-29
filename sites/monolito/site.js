// Monolito · catálogo de plantas (desenho simples em SVG de cada uma), configurador com preço e painel do cliente.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var mil = function (v) { return 'R$ ' + (Math.round(v / 1000) * 1000).toLocaleString('pt-BR'); };

  // nome, área, suítes, terreno mínimo, preço base (essencial), meses, cômodos para o desenho [x,y,l,a,nome]
  var PL = [
    ['Casa Vale', 280, 3, '15×30', 1690000, 10, [[0, 0, 40, 45, 'estar'], [40, 0, 30, 45, 'cozinha'], [70, 0, 30, 45, 'gourmet'], [0, 45, 33, 55, 'suíte 1'], [33, 45, 33, 55, 'suíte 2'], [66, 45, 34, 55, 'suíte 3']]],
    ['Casa Lago', 340, 4, '20×30', 2140000, 11, [[0, 0, 50, 50, 'estar e jantar'], [50, 0, 25, 50, 'cozinha'], [75, 0, 25, 50, 'escritório'], [0, 50, 25, 50, 'suíte 1'], [25, 50, 25, 50, 'suíte 2'], [50, 50, 25, 50, 'suíte 3'], [75, 50, 25, 50, 'master']]],
    ['Casa Pátio', 310, 4, '18×32', 1940000, 11, [[0, 0, 100, 28, 'estar · cozinha · gourmet'], [0, 28, 28, 44, 'suíte 1'], [28, 28, 44, 44, 'pátio'], [72, 28, 28, 44, 'suíte 2'], [0, 72, 50, 28, 'suíte 3'], [50, 72, 50, 28, 'master']]],
    ['Casa Mirante', 420, 5, '25×35', 2790000, 13, [[0, 0, 60, 40, 'estar duplo'], [60, 0, 40, 40, 'cozinha'], [0, 40, 25, 30, 'suíte 1'], [25, 40, 25, 30, 'suíte 2'], [50, 40, 25, 30, 'suíte 3'], [75, 40, 25, 30, 'suíte 4'], [0, 70, 100, 30, 'master com closet']]],
    ['Casa Térrea Prime', 240, 3, '12×30', 1390000, 9, [[0, 0, 55, 40, 'estar integrado'], [55, 0, 45, 40, 'cozinha e gourmet'], [0, 40, 34, 60, 'suíte 1'], [34, 40, 33, 60, 'suíte 2'], [67, 40, 33, 60, 'master']]],
    ['Casa Jardim', 500, 6, '30×40', 3380000, 14, [[0, 0, 50, 35, 'estar'], [50, 0, 50, 35, 'jantar e cozinha'], [0, 35, 33, 32, 'suíte 1'], [33, 35, 34, 32, 'home theater'], [67, 35, 33, 32, 'suíte 2'], [0, 67, 25, 33, 'suíte 3'], [25, 67, 25, 33, 'suíte 4'], [50, 67, 25, 33, 'suíte 5'], [75, 67, 25, 33, 'master']]]
  ];
  var desenho = function (p) {
    return '<svg viewBox="-2 -2 104 104" aria-hidden="true">' + p[6].map(function (c) { return '<rect x="' + c[0] + '" y="' + c[1] + '" width="' + c[2] + '" height="' + c[3] + '" fill="none" stroke="#1f2933" stroke-width="1.2"/><text x="' + (c[0] + c[2] / 2) + '" y="' + (c[1] + c[3] / 2 + 1.5) + '" font-size="4" text-anchor="middle" fill="#6c7280" font-family="sans-serif">' + c[4] + '</text>'; }).join('') + '</svg>';
  };
  var filtro = 0;
  function listar() {
    $('.pl-grade').innerHTML = PL.map(function (p, i) { return [p, i]; }).filter(function (x) { return !filtro || (filtro === 5 ? x[0][2] >= 5 : x[0][2] === filtro); }).map(function (x) {
      var p = x[0];
      return '<article class="planta">' + desenho(p) + '<h3>' + p[0] + '</h3><dl><dt>área</dt><dd>' + p[1] + ' m²</dd><dt>suítes</dt><dd>' + p[2] + '</dd><dt>terreno</dt><dd>' + p[3] + ' m</dd></dl><p class="pr">a partir de ' + mil(p[4]) + '</p><a class="botao botao-l" href="#monte" data-pl="' + x[1] + '">Personalizar esta planta</a></article>';
    }).join('');
  }
  $('.filtros').addEventListener('click', function (e) { var b = e.target.closest('[data-q]'); if (!b) return; filtro = +b.dataset.q; $$('[data-q]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); listar(); });
  listar();

  var m = $('#monta');
  m.pl.innerHTML = PL.map(function (p, i) { return '<option value="' + i + '">' + p[0] + ' · ' + p[1] + ' m² · ' + p[2] + ' suítes</option>'; }).join('');
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-pl]'); if (b) { m.pl.value = b.dataset.pl; conta(); } });
  function conta() {
    var p = PL[+m.pl.value], ac = +m.querySelector('[name=ac]:checked').value, base = p[4] * (1 + ac), adds = $$('[name=o]:checked', m);
    var extra = adds.reduce(function (s, x) { return s + +x.value; }, 0), total = base + extra, nivel = m.querySelector('[name=ac]:checked + span b').textContent;
    $('.ficha').innerHTML = '<p style="margin:0;color:#b9bec7">' + p[0] + ' · ' + p[1] + ' m² · ' + nivel + '</p><p class="tot">' + mil(total) + '</p><p style="color:#b9bec7;margin:0">' + mil(total / p[1]) + ' por m² · obra de ' + (p[5] + (adds.length > 2 ? 1 : 0)) + ' meses</p>' +
      '<ul><li><span>Projeto, aprovação e obra</span><span>' + mil(base) + '</span></li>' + adds.map(function (x) { return '<li><span>' + x.dataset.n + '</span><span>' + mil(+x.value) + '</span></li>'; }).join('') + '<li><span>Teto contratual de variação</span><span>0%</span></li></ul>' +
      '<a class="botao" href="#" data-wa="Olá, Monolito! Configurei a ' + p[0] + ' (' + nivel + (adds.length ? ', com ' + adds.map(function (x) { return x.dataset.n.toLowerCase(); }).join(', ') : '') + ') por ' + mil(total) + '. Quero agendar a reunião.">Agendar reunião com este projeto</a>';
  }
  m.addEventListener('change', conta); conta();

  // painel do cliente (exemplo)
  var ETAPAS = [['Fundação', 0, 8, 100], ['Estrutura', 6, 10, 100], ['Alvenaria', 12, 8, 100], ['Cobertura', 18, 6, 85], ['Instalações', 16, 14, 60], ['Revestimentos', 24, 12, 20], ['Esquadrias', 30, 6, 0], ['Acabamento', 34, 10, 0]];
  var ABAS = {
    crono: function () { return '<p style="margin-top:0">Semana 27 de 44 · <b>no prazo</b> · previsão de entrega: 14/06/2027</p><div class="gantt">' + ETAPAS.map(function (e) { var l = e[1] / 44 * 100, w = e[2] / 44 * 100; return '<div><span>' + e[0] + '</span><span class="tr"><i style="left:' + l + '%;width:' + w * e[3] / 100 + '%"></i><i class="f" style="left:' + (l + w * e[3] / 100) + '%;width:' + w * (1 - e[3] / 100) + '%"></i></span><em>' + e[3] + '%</em></div>'; }).join('') + '</div>'; },
    fin: function () { return '<div class="fin"><p><b>R$ 1.690.000</b>contrato</p><p><b>R$ 1.012.400</b>pago até hoje (60%)</p><p><b>−0,4%</b>gasto real × orçado</p></div><table class="tab"><thead><tr><th>Item</th><th>Orçado</th><th>Realizado</th></tr></thead><tbody><tr><td>Concreto e aço</td><td>R$ 218.000</td><td>R$ 214.300</td></tr><tr><td>Alvenaria e cobertura</td><td>R$ 196.000</td><td>R$ 197.900</td></tr><tr><td>Elétrica e hidráulica</td><td>R$ 162.000</td><td>R$ 96.800 (60%)</td></tr><tr><td>Porcelanato 120×120</td><td>R$ 88.400</td><td>R$ 87.100 (comprado)</td></tr></tbody></table>'; },
    fotos: function () { return '<div class="diario"><figure style="margin:0"><img src="img/marceneiro.webp" alt="Marceneiro trabalhando na obra"><p>Hoje · marcenaria da cozinha medida</p></figure><figure style="margin:0"><img src="img/cozinha.webp" alt="Cozinha em fase de acabamento"><p>Ontem · bancada de quartzo instalada</p></figure><figure style="margin:0"><img src="img/banho.webp" alt="Banheiro da suíte master"><p>23/10 · revestimento da suíte master</p></figure></div>'; },
    dec: function () { return '<div class="dec"><div class="pend"><span><b>Escolher a cuba da suíte master</b><br><small>3 opções enviadas pelo arquiteto · até sexta</small></span><button type="button" data-ok>Aprovar</button></div><div class="pend"><span><b>Cor da esquadria</b><br><small>preto fosco ou bronze · até 05/11</small></span><button type="button" data-ok>Aprovar</button></div><div><span><b>Porcelanato da área social</b><br><small>aprovado por você em 12/10</small></span><span>✓</span></div></div>'; }
  };
  function aba(k) { $$('[data-t]').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.t === k)); }); $('.tela-corpo').innerHTML = ABAS[k](); }
  $('.tela-abas').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) aba(b.dataset.t); });
  $('.tela-corpo').addEventListener('click', function (e) { var b = e.target.closest('[data-ok]'); if (b) { b.parentNode.classList.remove('pend'); b.outerHTML = '<span>✓ aprovado agora</span>'; } });
  aba('crono');

  var ct = $('#ct');
  ct.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = ct.nome.value.trim(), t = ct.tel.value.replace(/\D/g, ''), er = $('.erro', ct);
    er.textContent = n.length < 2 ? 'Escreva seu nome.' : t.length < 10 ? 'Confira o WhatsApp com DDD.' : '';
    if (er.textContent) return;
    window.BR_WA && window.BR_WA('Olá, Monolito! Sou ' + n + '. ' + ct.ter.value + ' e quero agendar a reunião com arquiteto e engenheiro.');
    ct.innerHTML = '<p style="font-weight:700;font-size:1.2rem">Pedido recebido, ' + n.split(' ')[0] + '. Ligamos hoje para marcar o dia.</p>';
  });
})();
