/* Retorno do Mercado Pago: mostra a mensagem certa para cada resultado (?r=ok|pendente|erro|assinatura). */
(function () {
  var r = new URLSearchParams(location.search).get('r') || 'ok';
  var $ = function (id) { return document.getElementById(id); };
  var T = {
    assinatura: ['✓', 'Assinatura confirmada.', 'Obrigado pela confiança. A primeira mensalidade foi autorizada no seu cartão e o projeto já está na fila.'],
    pendente: ['…', 'Pagamento em processamento.', 'Boleto e alguns pagamentos levam até 3 dias úteis para compensar. Assim que o Mercado Pago confirmar, você recebe o e-mail para começarmos.'],
    erro: ['!', 'O pagamento não foi concluído.', 'Nada foi cobrado. Você pode tentar de novo com outra forma de pagamento, ou falar comigo antes.'],
  };
  if (!Object.prototype.hasOwnProperty.call(T, r)) return; T = T[r];
  $('pg-selo').textContent = T[0];
  $('pg-titulo').textContent = T[1];
  $('pg-texto').textContent = T[2];
  if (r === 'erro') {
    $('pg-passos').hidden = true;
    var b = document.querySelector('.ctas .btn-primary');
    b.textContent = 'Tentar de novo'; b.href = '/#precos';
  }
})();
