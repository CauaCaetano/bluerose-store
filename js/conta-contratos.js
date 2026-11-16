// Minha conta: Anshur · Termo de Assinatura. Lista os aceites desta conta com o link do comprovante (aparece só para quem aceitou).
(function () {
  'use strict';
  var C = window.BR_CONTA, K = window.BR_CONTRATO, bloco = document.getElementById('anshur-contratos');
  if (!C || !K || !bloco) return;
  var esc = K.esc;
  var SIT = { ativa: 'Ativa', pendente: 'Aguardando pagamento', cancelada: 'Cancelada', recusada: 'Pagamento recusado', expirada: 'Expirada', teste: 'Em teste' };
  function desenhar(l) {
    if (!l || !l.length) { bloco.hidden = true; return; }
    bloco.hidden = false;
    bloco.innerHTML = '<h2>Anshur · Termo de Assinatura</h2>' +
      '<p class="ind-regras">Os aceites eletrônicos feitos por esta conta. Abra o comprovante para conferir, imprimir ou baixar. Leia o <a href="' + esc(K.pagina) + '">Termo em vigor</a>.</p>' +
      '<div class="af-tabela ctr-tabela"><table><thead><tr><th>Data</th><th>Revenda</th><th>CNPJ</th><th>Aceito por</th><th>Versão</th><th>Assinatura</th><th>Comprovante</th></tr></thead><tbody>' +
      l.map(function (a) {
        return '<tr><td>' + esc(K.dataHora(a.aceito_em).replace(' (horário de Brasília)', '')) + '</td><td>' + esc(a.razao_social) + '</td><td>' + esc(K.cnpjFormatado(a.cnpj)) + '</td>' +
          '<td>' + esc(a.nome) + ' (' + esc(a.cargo) + ')</td><td>' + esc(a.versao) + '</td><td>' + esc(a.assinatura ? (SIT[a.assinatura_status] || a.assinatura_status) : '—') + '</td>' +
          '<td><a class="btn btn-ghost" href="contrato-anshur-comprovante.html?id=' + encodeURIComponent(a.id) + '">Ver o comprovante</a></td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  if (!C.sessao()) return;
  C.sb().then(function (c) { return c.rpc('anshur_contratos_meus'); }).then(function (r) { if (!r.error) desenhar(r.data); }).catch(function () {});
})();
