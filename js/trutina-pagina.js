// Trutina: monta o "Exemplo de conferência" da página com o mesmo motor da conferência real (js/safra-motor.js).
// Safra FICTÍCIA de soja (8 cargas): nada aqui é de cliente.
(function () {
  'use strict';
  var alvo = document.getElementById('tr-exemplo');
  if (!alvo || !window.SAFRA) return;
  var S = window.SAFRA;
  var contrato = { produto: 'soja', preco: 120, regime: 'pf', tabelaUmidade: [[14.5, 0.8], [15.5, 2.1], [16.5, 3.4], [17.5, 4.7], [18.5, 6]] };
  var cargas = [
    { data: '2026-03-02', ticket: '0411', bruto: 44860, tara: 15020, umidade: 13.8, impureza: 0.9, final: 29840, preco: 120, valor: 59680 },
    { data: '2026-03-02', ticket: '0412', bruto: 45210, tara: 15100, umidade: 14.9, impureza: 1.0, descontoKg: 632, preco: 120, valor: 58956 },
    { data: '2026-03-03', ticket: '0418', bruto: 45020, tara: 15020, umidade: 15.2, impureza: 1.8, descontoKg: 1200, preco: 120, valor: 57600 },
    { data: '2026-03-03', ticket: '0419', bruto: 44380, tara: 14960, umidade: 14.2, impureza: 1.0, descontoKg: 235, preco: 120, valor: 58370 },
    { data: '2026-03-04', ticket: '0425', bruto: 45540, tara: 15200, umidade: 16.1, impureza: 1.3, descontoKg: 1123, preco: 118, valor: 57460.10 },
    { data: '2026-03-04', ticket: '0425', bruto: 44900, tara: 15000, umidade: 14.0, impureza: 1.0, final: 29900, preco: 120, valor: 59800 },
    { data: '2026-03-05', ticket: '0431', bruto: 45100, tara: 15050, liquido: 29950, umidade: 14.4, impureza: 1.0, descontoKg: 240, preco: 120, valor: 59420 },
    { data: '2026-03-05', ticket: '0432', bruto: 44700, tara: 14900, umidade: 15.0, impureza: 1.0, descontoKg: 626, preco: 120, valor: 58348 }
  ];
  var r = S.conferirGraos(cargas, contrato);
  var real = function (v) { return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var kg = function (v) { return Number(v).toLocaleString('pt-BR') + ' kg'; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var linhas = r.linhas.map(function (l) {
    var g = l.carga, liq = g.bruto - g.tara;
    return '<tr' + (l.achados.length ? ' class="tem"' : '') + '><td>' + l.n + '</td><td data-rot="Ticket">' + esc(g.ticket) + '</td><td class="n" data-rot="Peso líquido">' + kg(liq) + '</td><td class="n" data-rot="Umidade">' + String(g.umidade).replace('.', ',') + '%</td><td>' +
      (l.achados.length ? l.achados.map(function (a) { return '<span class="tr-achado">' + esc(a.texto) + (a.reais ? ' <b>' + real(a.reais) + '</b>' : '') + '</span>'; }).join('') : '<span class="ok">Confere</span>') + '</td></tr>';
  }).join('');
  alvo.innerHTML =
    '<div class="tr-res-topo"><div><span>Cargas conferidas</span><b>' + r.totais.cargas + '</b></div><div><span>Cargas com diferença</span><b>' + r.comAchado + '</b></div>' +
    '<div class="tr-favor"><span>Diferença a favor do produtor</span><b>' + real(r.totais.aFavor) + '</b></div></div>' +
    '<div class="tr-tabela-wrap"><table class="tr-tabela"><thead><tr><th>#</th><th>Ticket</th><th>Peso líquido</th><th>Umidade</th><th>O que encontramos</th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
    (r.gerais.length ? '<p class="tr-nota">' + r.gerais.map(function (a) { return esc(a.texto); }).join(' ') + '</p>' : '') +
    '<p class="tr-msg-rot">Mensagem pronta para o armazém</p><pre class="tr-msg">' + esc(S.mensagemContestacao(r, 'Armazém Exemplo')) + '</pre>';
})();
