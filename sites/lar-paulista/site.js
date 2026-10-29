// Lar Paulista · busca com filtros, custo mensal real (aluguel + condomínio + IPTU + seguro), favoritos,
// ficha com simulação de financiamento ou de entrada no aluguel, e visita agendada.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var mil = function (v) { return 'R$ ' + (Math.round(v / 1000) * 1000).toLocaleString('pt-BR'); };
  // foto, título, bairro, modo, valor (venda) ou aluguel, condomínio, IPTU/mês, m², quartos, vagas, pet, dias no ar
  var IM = [
    ['i0', 'Casa com piscina', 'Nova Campinas', 'venda', 2450000, 0, 690, 310, 4, 3, 1, 4],
    ['i1', 'Apartamento 3 quartos', 'Cambuí', 'aluguel', 4200, 1180, 260, 118, 3, 2, 1, 2],
    ['i2', 'Studio mobiliado', 'Centro', 'aluguel', 1950, 520, 85, 38, 1, 0, 0, 1],
    ['i3', 'Apartamento 2 quartos', 'Taquaral', 'aluguel', 2600, 690, 140, 72, 2, 1, 1, 6],
    ['i4', 'Apartamento 2 quartos', 'Barão Geraldo', 'venda', 520000, 480, 150, 68, 2, 1, 1, 9],
    ['i5', 'Cobertura duplex', 'Cambuí', 'venda', 1680000, 1650, 520, 196, 3, 3, 1, 12],
    ['i6', 'Casa térrea', 'Barão Geraldo', 'aluguel', 5800, 0, 420, 210, 3, 4, 1, 3],
    ['i7', 'Casa em condomínio', 'Mansões Santo Antônio', 'venda', 1890000, 980, 610, 280, 4, 4, 1, 5],
    ['i8', 'Sobrado moderno', 'Nova Campinas', 'aluguel', 8900, 0, 780, 260, 4, 3, 1, 8],
    ['i9', 'Casa de alto padrão', 'Mansões Santo Antônio', 'venda', 3900000, 1300, 1100, 520, 5, 6, 1, 15],
    ['i10', 'Apartamento 1 quarto', 'Centro', 'aluguel', 1600, 430, 70, 45, 1, 1, 0, 11],
    ['i11', 'Apartamento 3 quartos', 'Taquaral', 'venda', 780000, 820, 230, 104, 3, 2, 0, 7]
  ];
  var custo = function (x) { return x[3] === 'aluguel' ? x[4] + x[5] + x[6] + 45 : x[4]; };
  var favs = [];
  try { favs = JSON.parse(localStorage.getItem('lp-fav') || '[]'); } catch (e) {}
  var f = $('#filtros');
  function teto() { var modo = f.modo.value, max = modo === 'venda' ? 4000000 : 10000; return Math.round(+f.preco.value / 100 * max / (modo === 'venda' ? 10000 : 100)) * (modo === 'venda' ? 10000 : 100); }
  function listar() {
    var modo = f.modo.value, t = teto(), q = +f.q.value, ord = $('#ordem').value;
    f.mx.value = +f.preco.value === 100 ? 'sem limite' : (modo === 'venda' ? mil(t) : real(t) + '/mês');
    var lista = IM.map(function (x, i) { return [x, i]; }).filter(function (p) {
      var x = p[0]; return x[3] === modo && (!f.bairro.value || x[2] === f.bairro.value) && x[8] >= q && (+f.preco.value === 100 || custo(x) <= t) && (!f.pet.checked || x[10]) && (!f.vaga.checked || x[9] > 0);
    }).sort(function (a, b) { return ord === 'm2' ? b[0][7] - a[0][7] : ord === 'novo' ? a[0][11] - b[0][11] : custo(a[0]) - custo(b[0]); });
    $('.conta').textContent = lista.length + (lista.length === 1 ? ' imóvel' : ' imóveis') + (modo === 'aluguel' ? ' para alugar' : ' à venda');
    $('.cards').innerHTML = lista.length ? lista.map(function (p) {
      var x = p[0], i = p[1], fav = favs.indexOf(i) > -1;
      var preco = x[3] === 'aluguel' ? '<p class="total">' + real(custo(x)) + ' <small>por mês, tudo incluso</small></p><p class="quebra">aluguel ' + real(x[4]) + ' + cond. ' + real(x[5]) + ' + IPTU ' + real(x[6]) + ' + seguro R$ 45</p>' : '<p class="total">' + mil(x[4]) + '</p><p class="quebra">cond. ' + real(x[5]) + ' · IPTU ' + real(x[6]) + '/mês</p>';
      return '<article class="card">' + (x[11] <= 3 ? '<span class="selo">novo</span>' : '') + '<img src="img/' + x[0] + '.webp" alt="' + x[1] + ' em ' + x[2] + '" loading="lazy"><button type="button" class="fav" data-fav="' + i + '" aria-pressed="' + fav + '" aria-label="Salvar imóvel">' + (fav ? '♥' : '♡') + '</button><div class="dentro">' + preco + '<p class="tit">' + x[1] + '</p><p class="ond">' + x[2] + ', Campinas</p><p class="tags"><span>' + x[7] + ' m²</span><span>' + x[8] + ' quarto' + (x[8] > 1 ? 's' : '') + '</span><span>' + x[9] + ' vaga' + (x[9] === 1 ? '' : 's') + '</span>' + (x[10] ? '<span>aceita pet</span>' : '') + '</p><button type="button" class="abrir" data-ver="' + i + '">Ver detalhes e agendar visita →</button></div></article>';
    }).join('') : '<p class="vazio">Nada com esses filtros agora. <a href="#" data-wa="Olá, Lar Paulista! Procuro imóvel em ' + (f.bairro.value || 'Campinas') + ' e não achei no site. Podem me avisar quando entrar?">Avisar quando entrar um assim</a></p>';
    $('.fav-cont b').textContent = favs.length;
  }
  f.addEventListener('input', listar); f.addEventListener('change', listar); $('#ordem').addEventListener('change', listar);
  f.addEventListener('submit', function (e) { e.preventDefault(); });

  var d = $('#ficha');
  function ficha(i) {
    var x = IM[i], venda = x[3] === 'venda', dias = [];
    for (var k = 1; dias.length < 4; k++) { var dt = new Date(); dt.setDate(dt.getDate() + k); if (dt.getDay()) dias.push(dt); }
    var conta;
    if (venda) {
      var ent = x[4] * 0.2, fin = x[4] - ent, n = 360, j = Math.pow(1.1149, 1 / 12) - 1, p1 = fin / n + fin * j;
      conta = '<dl><dt>Valor</dt><dd>' + mil(x[4]) + '</dd><dt>Entrada (20%)</dt><dd>' + mil(ent) + '</dd><dt>Financiamento 30 anos</dt><dd>' + mil(fin) + '</dd><dt class="soma">Primeira parcela (SAC)</dt><dd class="soma">' + real(p1) + '</dd><dt>Renda mínima sugerida</dt><dd>' + real(p1 / 0.3) + '</dd></dl>';
    } else {
      conta = '<dl><dt>Aluguel</dt><dd>' + real(x[4]) + '</dd><dt>Condomínio</dt><dd>' + real(x[5]) + '</dd><dt>IPTU</dt><dd>' + real(x[6]) + '</dd><dt>Seguro incêndio</dt><dd>R$ 45</dd><dt class="soma">Total por mês</dt><dd class="soma">' + real(custo(x)) + '</dd><dt>Sem fiador</dt><dd>seguro-fiança ou caução</dd></dl>';
    }
    $('.fc-corpo', d).innerHTML = '<img src="img/' + x[0] + '.webp" alt="' + x[1] + ' em ' + x[2] + '"><div class="fc-txt"><h3 id="fc-t" style="font-size:1.6rem;margin:0">' + x[1] + '</h3><p style="margin:0;color:var(--tx-2)">' + x[2] + ' · ' + x[7] + ' m² · ' + x[8] + ' quartos · ' + x[9] + (x[9] === 1 ? ' vaga' : ' vagas') + '</p>' + conta +
      '<p style="margin:6px 0 0;font-weight:700">Visitar</p><div class="slots">' + dias.map(function (dt) { return ['10:00', '15:00', '18:30'].map(function (h) { var t = dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }) + ' ' + h; return '<button type="button" data-slot="' + t + '" aria-pressed="false">' + t + '</button>'; }).join(''); }).slice(0, 2).join('') + '</div>' +
      '<a class="botao" href="#" data-wa-visita data-wa="Olá, Lar Paulista! Quero visitar: ' + x[1] + ' em ' + x[2] + ' (' + (venda ? mil(x[4]) : real(custo(x)) + '/mês') + ').">Agendar visita</a></div><button type="button" class="fc-fecha" aria-label="Fechar">×</button>';
    d.showModal();
  }
  document.addEventListener('click', function (e) {
    var fv = e.target.closest('[data-fav]');
    if (fv) { var i = +fv.dataset.fav, k = favs.indexOf(i); if (k > -1) favs.splice(k, 1); else favs.push(i); try { localStorage.setItem('lp-fav', JSON.stringify(favs)); } catch (er) {} listar(); return; }
    var v = e.target.closest('[data-ver]'); if (v) { ficha(+v.dataset.ver); return; }
    if (e.target.closest('.fc-fecha') || e.target === d) { d.close(); return; }
    var s = e.target.closest('[data-slot]');
    if (s) { $$('[data-slot]', d).forEach(function (b) { b.setAttribute('aria-pressed', String(b === s)); }); var a = $('[data-wa-visita]', d); a.setAttribute('data-wa', a.getAttribute('data-wa').replace(/( Horário: .*)?$/, ' Horário: ' + s.dataset.slot + '.')); a.textContent = 'Agendar visita · ' + s.dataset.slot; }
  });
  listar();
})();
