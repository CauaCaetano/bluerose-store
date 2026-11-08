/* Prisma · painel da equipe (demonstração com dados de exemplo). */
(function () {
  'use strict';
  var P = window.PRISMA, U = window.PR, $ = U.$, $$ = U.$$, esc = U.esc, brl = U.brl;
  var D = P.painel(), MES = ['dez', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov'];

  $('#kpis').innerHTML = [
    ['Contratos ativos', D.contratos, 'residenciais e comerciais'], ['Vencendo em 60 dias', D.vencendo60, '6 listados abaixo'],
    ['Repasses pendentes', D.repassesPend, 'R$ 118,4 mil a transferir'], ['Chamados abertos', D.nChamados, '4 com urgência alta'],
    ['Interessados na esteira', D.nInteressados, '9 em análise cadastral'], ['Ocupação', D.ocupacao.toLocaleString('pt-BR') + '%', '50 imóveis vagos'],
    ['Inadimplência > 30 dias', D.inad.toLocaleString('pt-BR') + '%', '23 contratos'], ['Repasse médio', '1,6 dia útil', 'meta: até 2 dias úteis']
  ].map(function (k) { return '<div><span>' + k[0] + '</span><strong>' + k[1] + '</strong><small>' + k[2] + '</small></div>'; }).join('');

  function linha(serie, min, max, suf, cor, largura) {
    var W = Math.max(300, Math.min(640, Math.round(largura || 560))), H = W < 420 ? 190 : 200, m = { t: 14, r: 12, b: 28, l: 44 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    var x = function (i) { return m.l + iw * i / (serie.length - 1); }, y = function (v) { return m.t + ih - ih * (v - min) / (max - min); };
    var s = '<svg class="grafico" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gráfico de linha, de ' + serie[0].toLocaleString('pt-BR') + suf + ' a ' + serie[serie.length - 1].toLocaleString('pt-BR') + suf + '">';
    for (var k = 0; k <= 4; k++) { var v = min + (max - min) * k / 4; s += '<line class="ref" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (m.l - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + suf + '</text>'; }
    var pts = serie.map(function (v, i) { return x(i) + ',' + y(v); }).join(' ');
    s += '<polygon points="' + m.l + ',' + (m.t + ih) + ' ' + pts + ' ' + x(serie.length - 1) + ',' + (m.t + ih) + '" fill="' + cor + '" opacity=".08"/><polyline points="' + pts + '" fill="none" stroke="' + cor + '" stroke-width="2.5"/>';
    serie.forEach(function (v, i) { s += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="3.5" fill="#fff" stroke="' + cor + '" stroke-width="2"><title>' + MES[i] + ': ' + v.toLocaleString('pt-BR') + suf + '</title></circle>' + (W < 420 && i % 2 ? '' : '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + MES[i] + '</text>'); });
    return s + '</svg>';
  }
  $('#graf-inad').innerHTML = linha(D.inadSerie, 2, 4.5, '%', '#9a3a2c', $('#graf-inad').clientWidth);
  $('#graf-ocup').innerHTML = linha(D.ocupSerie, 90, 95, '%', '#0f4c5c', $('#graf-ocup').clientWidth);

  // repasses
  var tr = $('#t-repasses');
  tr.innerHTML = '<thead><tr><th scope="col"><span class="sr">Selecionar</span></th><th scope="col">Contrato</th><th scope="col">Proprietário</th><th scope="col" class="dir">Líquido</th><th scope="col">Data</th><th scope="col">Situação</th></tr></thead><tbody>' +
    D.repasses.map(function (r, i) {
      var feito = r[0] === 'PR-0412';
      return '<tr' + (feito ? ' class="feito"' : '') + '><td><input type="checkbox" aria-label="Selecionar repasse ' + r[0] + '" data-rep="' + i + '"' + (feito ? ' disabled' : ' checked') + ' style="width:20px;height:20px;accent-color:var(--acc)"></td><td data-rot="Contrato"><b>' + r[0] + '</b></td><td data-rot="Proprietário">' + esc(r[1]) + '</td><td class="dir num" data-rot="Líquido">' + brl(r[2]) + '</td><td data-rot="Data">' + r[3] + '</td><td><span class="selo ' + (feito ? 'selo-ok">Repassado' : 'selo-pend">Pendente') + '</span></td></tr>';
    }).join('') + '</tbody>';
  $('#aprovar-lote').addEventListener('click', function () {
    var sel = $$('input[data-rep]:checked', tr);
    if (!sel.length) { U.aviso('Selecione ao menos um repasse.', 'ruim'); return; }
    var tot = 0;
    sel.forEach(function (c) { var r = D.repasses[+c.dataset.rep]; tot += r[2]; var linhaT = c.closest('tr'); linhaT.className = 'feito'; c.checked = false; c.disabled = true; $('.selo', linhaT).className = 'selo selo-ok'; $('.selo', linhaT).textContent = 'Enviado ao banco'; });
    U.aviso(sel.length + ' repasse(s) aprovados, ' + brl(tot) + ' em lote de Pix (demonstração). Os proprietários veem no extrato.');
  });

  // chamados
  var tc = $('#t-chamados');
  function chamados() {
    var f = $('#f-cham').value;
    tc.innerHTML = '<thead><tr><th scope="col">Chamado</th><th scope="col">Contrato</th><th scope="col">Categoria</th><th scope="col">Urgência</th><th scope="col">Status</th><th scope="col"><span class="sr">Ação</span></th></tr></thead><tbody>' +
      D.chamados.filter(function (c) { return !f || c[4] === f; }).map(function (c) {
        var cls = c[4] === 'Concluído' ? 'selo-ok' : c[4] === 'Aberto' ? 'selo-ruim' : 'selo-pend';
        return '<tr><td data-rot="Chamado"><b>' + c[0] + '</b><br><small>' + esc(c[5]) + '</small></td><td data-rot="Contrato">' + c[1] + '</td><td data-rot="Categoria">' + c[2] + '</td><td data-rot="Urgência">' + c[3] + '</td><td><span class="selo ' + cls + '">' + c[4] + '</span></td><td>' + (c[4] === 'Concluído' ? '' : '<button type="button" class="bt bt-link" data-cham="' + c[0] + '">Avançar</button>') + '</td></tr>';
      }).join('') + '</tbody>';
  }
  $('#f-cham').addEventListener('change', chamados); chamados();
  var FLUXO = ['Aberto', 'Técnico agendado', 'Concluído'];
  tc.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cham]'); if (!b) return;
    D.chamados.forEach(function (c) { if (c[0] === b.dataset.cham) { var i = FLUXO.indexOf(c[4]); c[4] = c[4] === 'Orçamento com proprietário' ? 'Técnico agendado' : FLUXO[Math.min(FLUXO.length - 1, i + 1)]; U.aviso(c[0] + ': ' + c[4].toLowerCase() + '. O inquilino é avisado no portal (demonstração).'); } });
    chamados();
  });

  // vencendo
  $('#t-vencendo').innerHTML = '<thead><tr><th scope="col">Contrato</th><th scope="col">Locatário</th><th scope="col">Vence em</th><th scope="col">Situação</th><th scope="col"><span class="sr">Ação</span></th></tr></thead><tbody>' +
    D.vencendo.map(function (v) {
      var cls = v[4] === 'Vai desocupar' ? 'selo-ruim' : v[4] === 'Sem contato' ? 'selo-pend' : 'selo-neutro';
      var msg = 'Olá! Aqui é a Prisma Administração. O contrato ' + v[0] + ' (' + v[1] + ') vence em ' + v[3] + '. Podemos conversar sobre a renovação?';
      return '<tr><td data-rot="Contrato"><b>' + v[0] + '</b><br><small>' + esc(v[1]) + '</small></td><td data-rot="Locatário">' + esc(v[2]) + '</td><td data-rot="Vence em">' + v[3] + '</td><td><span class="selo ' + cls + '">' + v[4] + '</span></td><td><a href="#" class="bt bt-link" data-wa="' + esc(msg) + '">Chamar no WhatsApp</a></td></tr>';
    }).join('') + '</tbody>';

  // funil e interessados
  var etapas = [['Cadastro', 21], ['Documentos', 14], ['Análise', 9], ['Garantia', 6], ['Assinatura', 5], ['Chaves', 3]];
  $('#funil').innerHTML = etapas.map(function (e) { return '<li><span>' + e[0] + '</span><i style="width:' + Math.round(e[1] / 21 * 100) + '%"></i><b>' + e[1] + '</b></li>'; }).join('');
  $('#interessados').innerHTML = D.interessados.map(function (i) { return '<li><div><b>' + esc(i[0]) + ' · ' + i[1] + '</b><small>origem: ' + i[3] + '</small></div><span class="selo selo-neutro">' + i[2] + '</span></li>'; }).join('');
  $('#inadimplentes').innerHTML = D.inadimplentes.map(function (i) {
    var msg = 'Olá! Aqui é a Prisma Administração. Consta em aberto o aluguel do contrato ' + i[0] + ', no valor de ' + brl(i[2]) + ', vencido há ' + i[3] + ' dias. Podemos ajudar com a 2ª via ou um acordo?';
    return '<li><div><b>' + i[0] + ' · ' + brl(i[2]) + '</b><small>' + esc(i[1]) + ' · ' + i[3] + ' dias de atraso' + (i[3] > 10 ? ' · garantia acionada' : '') + '</small></div><a href="#" class="bt bt-cla bt-peq" data-wa="' + esc(msg) + '">Cobrar</a></li>';
  }).join('');

  // sincronização de demonstração
  $('#sincronizar').addEventListener('click', function () {
    var b = this; b.disabled = true; b.textContent = 'Sincronizando…'; $('#sinc-hora').textContent = 'agora';
    setTimeout(function () {
      b.disabled = false; b.textContent = 'Sincronizar agora';
      $('#sinc-hora').textContent = 'às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); $('#sinc-n').textContent = '813';
      U.aviso('Sincronizado: 1 contrato novo, 6 boletos pagos, 2 chamados novos (demonstração).');
    }, 1300);
  });
})();
