/* Prisma · painel da equipe (demonstração com dados de exemplo). */
(function () {
  'use strict';
  var P = window.PRISMA, U = window.PR, $ = U.$, $$ = U.$$, esc = U.esc, brl = U.brl;
  var D = P.painel();

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
