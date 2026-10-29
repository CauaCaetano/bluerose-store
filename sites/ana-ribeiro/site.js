// Ana Ribeiro · quanto dá para financiar (30% da renda, tabela SAC, juros de 11,49% a.a.), imóveis que cabem
// e prévia de avaliação para quem quer vender.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var mil = function (v) { return 'R$ ' + (Math.round(v / 1000) * 1000).toLocaleString('pt-BR'); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var IM = [
    ['i1', 'Apartamento 2 quartos', 'Itacorubi · 78 m² · 1 vaga', 480000], ['i2', 'Apartamento 3 quartos', 'Trindade · 96 m² · 2 vagas', 690000],
    ['i3', 'Apartamento garden', 'Campeche · 102 m² · quintal', 920000], ['i4', 'Casa 3 suítes', 'Ingleses · 180 m² · condomínio', 1380000]
  ];
  var f = $('#fin');
  function conta() {
    var renda = +f.renda.value, ent = +f.ent.value, n = +f.anos.value * 12, i = Math.pow(1.1149, 1 / 12) - 1;
    // SAC: primeira parcela = amortização + juros; limite de 30% da renda
    var parcela = renda * 0.3, fin = parcela / (1 / n + i), total = fin + ent;
    f.renda.previousElementSibling.textContent = real(renda); f.ent.previousElementSibling.textContent = mil(ent); f.anos.previousElementSibling.textContent = f.anos.value + ' anos';
    $('.fin-res').innerHTML = '<p>Você consegue comprar um imóvel de até</p><p class="grande">' + mil(total) + '</p><p>Financiamento de ' + mil(fin) + ' + ' + mil(ent) + ' de entrada</p><p>Primeira parcela de ' + real(parcela) + ', caindo todo mês</p><a class="botao" style="background:var(--fundo);color:var(--tx);margin-top:10px" href="#" data-wa="Olá, Ana! Fiz a simulação: consigo imóvel de até ' + mil(total) + '. Pode me mostrar opções?">Me mostre imóveis até ' + mil(total) + '</a>';
    var cabem = IM.filter(function (x) { return x[3] <= total; }).length;
    $('.cp-tit').textContent = cabem ? cabem + (cabem > 1 ? ' destes imóveis cabem' : ' destes imóveis cabe') + ' no seu bolso' : 'Nenhum dos destaques cabe ainda, mas tenho outros: me chame';
    $('.imoveis').innerHTML = IM.map(function (x) {
      var ok = x[3] <= total;
      return '<article class="imovel' + (ok ? '' : ' fora') + '"><img src="img/' + x[0] + '.webp" alt="' + x[1] + ' em ' + x[2].split(' · ')[0] + '" loading="lazy"><div><b>' + mil(x[3]) + '</b><span>' + x[1] + ' · ' + x[2] + '</span><span class="' + (ok ? 'cabe">✓ cabe no seu financiamento' : 'cabe nao">faltam ' + mil(x[3] - total)) + '</span>' + (ok ? '<a href="#" data-wa="Olá, Ana! Quero visitar o ' + x[1].toLowerCase() + ' de ' + mil(x[3]) + ' (' + x[2] + ').">Agendar visita</a>' : '') + '</div></article>';
    }).join('');
  }
  f.addEventListener('input', conta); conta();

  var a = $('#aval');
  function av() {
    var m2 = Math.max(20, +a.m2.value || 20), v = +a.b.value * m2 * +a.q.value * (a.vaga.checked ? 1 : 0.92), bairro = a.b.options[a.b.selectedIndex].text;
    $('.aval-res').innerHTML = 'Valor estimado de venda<b>' + mil(v * 0.94) + ' a ' + mil(v * 1.05) + '</b><span style="color:var(--tx-2);font-size:.88rem"><span>Imóveis assim vendem em 41 dias, em média, com a Ana.</span> (' + bairro + ')</span>';
    $('[data-wa-aval]').setAttribute('data-wa', 'Olá, Ana! Quero a avaliação grátis do meu imóvel: ' + m2 + ' m², ' + a.q.options[a.q.selectedIndex].text + ' quarto(s), ' + bairro + '.');
  }
  a.addEventListener('input', av); a.addEventListener('change', av); a.addEventListener('submit', function (e) { e.preventDefault(); }); av();
})();
