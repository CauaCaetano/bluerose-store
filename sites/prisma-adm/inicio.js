/* Prisma · início: miniextrato, minigráfico e imóveis em destaque. */
(function () {
  'use strict';
  var P = window.PRISMA, C = window.PRC, $ = window.PR.$;
  var cs = P.competencias();
  var out = cs.filter(function (c) { return c.ano === 2026 && c.mes === 10; })[0];
  var me = $('#mini-extrato'); if (me && out) me.innerHTML = C.tabelaExtrato(out, false);
  var mg = $('#mini-grafico'); if (mg) { var ult = cs.slice(-13, -1); mg.innerHTML = C.grafico(ult, mg.clientWidth); C.ligarGrafico(mg, ult); }
  var d = $('#destaques');
  if (d) d.innerHTML = ['PR-1021', 'PR-1047', 'PR-1073', 'PR-1105'].map(function (c) { return C.cartao(P.obterImovel(c), true); }).join('');
})();
