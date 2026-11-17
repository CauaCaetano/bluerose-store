// Oferta de fundador do Anshur: mostra as vagas restantes (só um número, pela função pública anshur_vagas_fundador).
// Sem vagas, o bloco some. Sem internet ou fora do site oficial, o bloco fica sem o contador.
(function () {
  'use strict';
  var bloco = document.getElementById('an-fundador'), txt = document.getElementById('an-fund-vagas');
  if (!bloco || !txt) return;
  if (!/(^|\.)bluerose-store\.com$/.test(location.hostname)) return;
  var URL = 'https://yihnfzwtkqdfnwziutqa.supabase.co/rest/v1/rpc/anshur_vagas_fundador';
  var CHAVE = 'sb_publishable_nrMgwLCtiojWE-yWMeZK7g_iinpfY_5'; // chave pública: a função só devolve um número
  fetch(URL, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json', apikey: CHAVE, Authorization: 'Bearer ' + CHAVE }, body: '{}' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (n) {
      if (typeof n !== 'number') return;
      if (n <= 0) { bloco.hidden = true; return; }
      txt.textContent = n === 1 ? 'Resta 1 vaga.' : 'Restam ' + n + ' vagas.';
    })
    .catch(function () {});
})();
