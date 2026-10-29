// Kit de venda por ramo: ?para=Nome da Loja personaliza o título e a mensagem do WhatsApp; a conta mostra
// quantos clientes novos (que voltam) pagam o plano de 8 vídeos (R$ 790).
(function () {
  'use strict';
  var PLANO = 790;
  var loja = (new URLSearchParams(location.search).get('para') || '').replace(/[<>]/g, '').trim().slice(0, 60);
  if (loja) {
    document.querySelector('[data-loja]').textContent = loja;
    document.querySelector('[data-para]').hidden = false;
    document.title = 'Proposta para ' + loja + ' · Blue Rose';
  }
  // contato.js (carregado antes) troca WHATSAPP pelo número; aqui só acrescentamos o nome da loja ao texto
  function ajustarWa() {
    if (!loja) return;
    document.querySelectorAll('[data-wa]').forEach(function (a) {
      var u = new URL(a.href);
      u.searchParams.set('text', u.searchParams.get('text') + ' Sou do ' + loja + '.');
      a.href = u.toString();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ajustarWa); else ajustarWa();

  var t = document.querySelector('[data-ticket]'), f = document.querySelector('[data-freq]'), m = document.querySelector('[data-margem]'), res = document.querySelector('[data-res]');
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  function conta() {
    var ticket = Math.max(0, Number(t.value) || 0), margem = Math.min(90, Math.max(0, Number(m.value) || 0)) / 100, vezes = Math.max(1, Number(f.value) || 1), lucro = ticket * margem * vezes;
    if (!lucro) { res.innerHTML = '<b>—</b><span>Preencha os campos.</span>'; return; }
    var n = Math.ceil(PLANO / lucro), sem = Math.max(1, Math.ceil(n / 4.3));
    res.innerHTML = '<b>' + n + ' cliente' + (n > 1 ? 's' : '') + ' novo' + (n > 1 ? 's' : '') + ' por mês</b><span>pagam os 8 vídeos. É cerca de ' + sem + ' por semana; cada cliente que volta deixa ' + real(lucro) + ' por mês para você.</span>';
  }
  [t, f, m].forEach(function (i) { i.addEventListener('input', conta); });
  conta();
})();
