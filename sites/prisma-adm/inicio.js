/* Prisma · início: miniextrato, minigráfico e imóveis em destaque. */
(function () {
  'use strict';
  var P = window.PRISMA, C = window.PRC, $ = window.PR.$;
  var cs = P.competencias();
  var out = cs.filter(function (c) { return c.ano === 2026 && c.mes === 10; })[0];
  var me = $('#mini-extrato'); if (me && out) me.innerHTML = C.tabelaExtrato(out, false);
  var mg = $('#mini-grafico');
  if (mg) {
    var ult = cs.slice(-13, -1), MB = 30; // MB = margem de baixo do gráfico (rótulos dos meses), igual a componentes.js
    var desenha = function () {
      var alto = 0;
      if (innerWidth > 860 && me) {
        // a linha do zero do gráfico fica na mesma altura da linha de total do extrato
        mg.innerHTML = C.grafico(ult, mg.clientWidth, 240);
        var svg = mg.querySelector('svg'), tot = me.querySelector('tfoot tr') || me.querySelector('tr:last-child');
        if (svg && tot) {
          var esc = svg.getBoundingClientRect().width / +svg.getAttribute('viewBox').split(' ')[2];
          var zero = tot.getBoundingClientRect().bottom - svg.getBoundingClientRect().top;
          alto = Math.round(Math.max(200, Math.min(460, zero / esc + MB)));
        }
      }
      mg.innerHTML = C.grafico(ult, mg.clientWidth, alto);
    };
    desenha();
    var mostra = function (e) { var r = e.target.closest('.barra-l'), dica = mg.querySelector('.dica-grafico'); if (!r || !dica) return; var c = ult[+r.dataset.i], brl = window.PR.brl; dica.textContent = c.rotulo.charAt(0).toUpperCase() + c.rotulo.slice(1) + ': bruto ' + brl(c.bruto) + ' · líquido ' + brl(c.liquido); };
    mg.addEventListener('mouseover', mostra); mg.addEventListener('focusin', mostra);
    var t = 0; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(desenha, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(desenha);
  }
  var d = $('#destaques');
  if (d) d.innerHTML = ['PR-1021', 'PR-1047', 'PR-1073', 'PR-1105'].map(function (c) { return C.cartao(P.obterImovel(c), true); }).join('');
})();
