// Comprovante do aceite do Termo de Assinatura do Anshur: só a conta que aceitou (ou o dono da Blue Rose, com 2 etapas) vê.
// Mostra os dados registrados no servidor, o texto exato da versão aceita e confere o hash aqui no navegador.
(function () {
  'use strict';
  var C = window.BR_CONTA, K = window.BR_CONTRATO, alvo = document.getElementById('comprovante');
  if (!C || !K || !alvo) return;
  var esc = K.esc;
  var id = new URLSearchParams(location.search).get('id') || '';
  function msg(t) { alvo.innerHTML = '<p class="sec-lede">' + esc(t) + '</p><p><a class="btn btn-ghost" href="conta.html">Ir para Minha conta</a></p>'; }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) { msg('Comprovante não encontrado. Abra pelo link em Minha conta.'); return; }
  var SIT = { ativa: 'ativa', pendente: 'aguardando o pagamento', cancelada: 'cancelada', recusada: 'pagamento recusado', expirada: 'expirada', teste: 'em teste' };

  C.exigirLogin('Para ver o comprovante, entre com a conta que aceitou o Termo.').then(function () { return C.sb(); }).then(function (c) {
    return c.rpc('anshur_contrato_comprovante', { p_id: id });
  }).then(function (r) {
    if (r.error) throw new Error(r.error.message);
    var d = r.data;
    if (!d) { msg('Comprovante não encontrado nesta conta.'); return; }
    return K.sha256(d.texto).then(function (h) { desenhar(d, h === d.hash && h === d.hash_versao); });
  }).catch(function () { msg('Não foi possível abrir o comprovante agora. Tente de novo em instantes.'); });

  function linhas(d, ok) {
    return [
      ['Contrato', d.titulo + ' · versão ' + d.versao],
      ['Contratante (revenda)', d.razao_social],
      ['CNPJ', K.cnpjFormatado(d.cnpj)],
      ['Aceito por', d.nome + ' (' + d.cargo + ')'],
      ['Conta e e-mail', d.email],
      ['Data e hora do aceite (servidor)', K.dataHora(d.aceito_em)],
      ['Produto', d.produto === 'a-sis-anshur' ? 'Assinatura Anshur (R$ 2.000 por mês por revenda)' : d.produto],
      ['Assinatura vinculada', d.assinatura ? (SIT[d.assinatura_status] || d.assinatura_status || '—') + (d.assinatura_forma === 'pix' ? ' (Pix)' : '') : 'ainda não criada (é ligada quando o pagamento começa)'],
      ['Navegador', d.user_agent || 'não informado'],
      ['Código do aceite', d.id],
      ['Código de conferência (SHA-256 do texto)', d.hash],
      ['Conferência do texto', ok ? 'o texto abaixo é o mesmo da versão aceita' : 'o texto não confere com o código']
    ];
  }
  function desenhar(d, ok) {
    var l = linhas(d, ok);
    alvo.innerHTML = '<p class="legal-data">Comprovante de aceite eletrônico · MP 2.200-2/2001, art. 10, § 2º</p>' +
      '<h1 class="sec-title">Comprovante do Termo de Assinatura do Anshur</h1>' +
      '<p><span class="ctr-selo ' + (ok ? 'ok' : 'erro') + '">' + (ok ? 'Texto conferido' : 'Texto não confere') + '</span></p>' +
      '<dl>' + l.map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + (x[0].indexOf('SHA-256') >= 0 ? '<code class="ctr-hash">' + esc(x[1]) + '</code>' : esc(x[1])) + '</dd>'; }).join('') + '</dl>' +
      '<div class="ctr-acoes"><button type="button" class="btn btn-primary" data-imprimir>Imprimir ou salvar em PDF</button>' +
      '<button type="button" class="btn btn-ghost" data-baixar>Baixar o comprovante (.txt)</button><a class="btn btn-ghost" href="conta.html">Voltar para Minha conta</a></div>' +
      '<div class="ctr-texto"><h2>Texto aceito (versão ' + esc(d.versao) + ')</h2>' + K.html(d.texto) + '</div>';
    alvo.querySelector('[data-imprimir]').onclick = function () { window.print(); };
    alvo.querySelector('[data-baixar]').onclick = function () {
      var txt = 'COMPROVANTE DE ACEITE ELETRÔNICO\n\n' + l.map(function (x) { return x[0] + ': ' + x[1]; }).join('\n') +
        '\n\n----- TEXTO ACEITO (versão ' + d.versao + ') -----\n\n' + d.texto;
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
      a.download = 'comprovante-termo-anshur-v' + d.versao + '-' + K.cnpjLimpo(d.cnpj) + '.txt';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    };
  }
})();
