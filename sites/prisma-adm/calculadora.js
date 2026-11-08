/* Prisma · calculadora "Quanto seu imóvel pode render?" (estimativa de exemplo, roda no navegador). */
(function () {
  'use strict';
  var P = window.PRISMA, U = window.PR, $ = U.$, brl0 = U.brl0;
  var B = P.bairros(), f = $('#form-calc');
  var TIPO = { ap: [1, 'apartamento'], casa: [0.9, 'casa'], cond: [1.05, 'casa em condomínio'], studio: [1.25, 'studio'], sala: [1.05, 'sala comercial'] };
  var minM2 = Math.min.apply(null, B.map(function (b) { return b[1]; })), maxM2 = Math.max.apply(null, B.map(function (b) { return b[1]; }));
  $('#c-bairro').innerHTML = B.map(function (b) { return '<option value="' + b[1] + '"' + (b[0] === 'Jardim Botânico' ? ' selected' : '') + '>' + b[0] + '</option>'; }).join('');
  // valores vindos de outra página (?bairro=&area=&tipo=)
  try {
    var q = new URLSearchParams(location.search);
    if (q.get('area')) f.area.value = Math.min(1000, Math.max(15, parseInt(q.get('area'), 10) || 70));
    if (q.get('tipo') && TIPO[q.get('tipo')]) f.tipo.value = q.get('tipo');
    if (q.get('bairro')) [].forEach.call(f.bairro.options, function (o) { if (o.text === q.get('bairro')) f.bairro.value = o.value; });
  } catch (e) {}

  function calcular() {
    var area = Math.min(1000, Math.max(15, +f.area.value || 0));
    var m2 = +f.bairro.value, tipo = TIPO[f.tipo.value], quartos = +f.quartos.value, vagas = +f.vagas.value;
    var cons = +(f.querySelector('input[name="cons"]:checked') || { value: 1 }).value;
    var extra = ['mob', 'lazer', 'pet'].reduce(function (a, n) { return a * (f[n].checked ? +f[n].value : 1); }, 1);
    var tam = Math.pow(70 / area, 0.18); // imóveis menores rendem mais por m²
    var qAj = f.tipo.value === 'sala' ? 1 : 1 + Math.max(-0.04, Math.min(0.06, (quartos - Math.round(area / 35)) * 0.03));
    var vAj = 1 + Math.min(vagas, 3) * 0.035 - (vagas === 0 && f.tipo.value !== 'studio' ? 0.04 : 0);
    var medio = area * m2 * tipo[0] * tam * qAj * vAj * cons * extra;
    medio = Math.round(medio / 10) * 10;
    var min = Math.round(medio * 0.93 / 10) * 10, max = Math.round(medio * 1.07 / 10) * 10;
    var valorInf = U.num(f.valor.value), valor = valorInf > 0 ? valorInf : medio / 0.0045;
    var liq = medio * (1 - P.TAXA_ADM), rend = liq * 12 / valor * 100;
    $('#r-faixa').innerHTML = brl0(min) + ' a ' + brl0(max) + '<small>por mês, sem condomínio e IPTU</small>';
    $('#r-medio').textContent = brl0(medio); $('#r-ano').textContent = brl0(medio * 12);
    $('#r-liq').textContent = brl0(liq); $('#r-rend').textContent = rend.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
    var pos = (m2 - minM2) / (maxM2 - minM2); var r = $('#r-regua'); r.style.left = Math.max(0, pos * 85) + '%'; r.style.width = '15%';
    var bairro = f.bairro.options[f.bairro.selectedIndex].text;
    $('#r-texto').textContent = 'Para ' + (tipo[1] === 'apartamento' || tipo[1] === 'studio' ? 'um ' : 'uma ') + tipo[1] + ' de ' + area + ' m² no ' + bairro + '. Rendimento líquido ao ano ' + (valorInf > 0 ? 'sobre o valor informado' : 'sobre um valor de imóvel estimado em ' + brl0(valor)) + '.';
    var msg = 'Olá, Prisma! Quero uma avaliação gratuita de aluguel.\n• Tipo: ' + f.tipo.options[f.tipo.selectedIndex].text + '\n• Bairro: ' + bairro + '\n• Área: ' + area + ' m²\n• Quartos: ' + f.quartos.options[f.quartos.selectedIndex].text + ' · Vagas: ' + f.vagas.options[f.vagas.selectedIndex].text + '\n• Estimativa do site: ' + brl0(min) + ' a ' + brl0(max) + ' por mês';
    $('#r-cta').setAttribute('data-wa', msg);
  }
  f.addEventListener('input', function (e) { if (e.target.name !== 'area' || f.area.value.length >= 2) calcular(); });
  f.addEventListener('change', calcular);
  f.addEventListener('submit', function (e) { e.preventDefault(); if (!U.validar(f)) return; calcular(); U.aviso('Estimativa atualizada.'); if (innerWidth < 860) $('#calc-res').scrollIntoView({ behavior: 'smooth' }); });
  calcular();

  var t = $('#tabela-bairros');
  t.innerHTML += '<thead><tr><th scope="col">Bairro</th><th scope="col">R$/m² ao mês</th><th scope="col">Apartamento de 70 m²</th><th scope="col">Casa de 140 m²</th></tr></thead><tbody>' +
    B.map(function (b) { return '<tr><th scope="row">' + b[0] + '</th><td class="num" data-rot="R$/m² ao mês">R$ ' + b[1].toLocaleString('pt-BR') + ',00</td><td class="num" data-rot="Apartamento de 70 m²">' + brl0(Math.round(70 * b[1] / 10) * 10) + '</td><td class="num" data-rot="Casa de 140 m²">' + brl0(Math.round(140 * b[1] * 0.9 * Math.pow(0.5, 0.18) / 10) * 10) + '</td></tr>'; }).join('') + '</tbody>';
})();
