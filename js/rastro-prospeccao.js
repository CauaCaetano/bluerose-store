// Link próprio da revenda na prospecção do Anshur (anshur.html?p=CODIGO).
// Guarda o código só nesta aba (sessionStorage), conta "abriu o link" uma vez e os cliques em
// demonstração, teste às cegas e assinar. Nada pessoal é guardado nem enviado: só o código e o tipo do clique.
(function () {
  'use strict';
  var CH = 'br-prosp-codigo', RE = /^[A-HJ-NP-Z2-9]{6}$/;
  var oficial = /(^|\.)bluerose-store\.com$/.test(location.hostname);
  var URL_RPC = (oficial ? 'https://yihnfzwtkqdfnwziutqa.supabase.co' : 'https://banco-desligado-no-teste.invalid') + '/rest/v1/rpc/anshur_prosp_evento';
  var CHAVE = 'sb_publishable_nrMgwLCtiojWE-yWMeZK7g_iinpfY_5'; // chave pública: a função só aceita registrar um evento por código
  var codigo = null;
  function ler(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function gravar(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* aba sem armazenamento: segue só nesta página */ } }
  try {
    var q = new URLSearchParams(location.search), p = (q.get('p') || '').toUpperCase();
    if (RE.test(p)) {
      codigo = p; gravar(CH, p);
      // tira o código do endereço: se a pessoa repassar o link, não conta como a revenda
      q.delete('p');
      var limpo = location.pathname + (q.toString() ? '?' + q.toString() : '') + location.hash;
      if (history.replaceState) history.replaceState(history.state, '', limpo);
    } else if (RE.test(ler(CH) || '')) {
      codigo = ler(CH);
    }
  } catch (e) { return; }
  if (!codigo) return;
  function enviar(tipo) {
    var chave = 'br-prosp-' + tipo;
    if (ler(chave)) return; // uma vez por aba para cada tipo
    gravar(chave, '1');
    try {
      fetch(URL_RPC, {
        method: 'POST', keepalive: true, credentials: 'omit', referrerPolicy: 'no-referrer',
        headers: { 'Content-Type': 'application/json', apikey: CHAVE, Authorization: 'Bearer ' + CHAVE },
        body: JSON.stringify({ p_codigo: codigo, p_tipo: tipo })
      }).catch(function () {});
    } catch (e) { /* sem rede: não atrapalha a página */ }
  }
  enviar('abriu_link');
  // link da prospecção que leva direto ao teste às cegas (anshur/teste-as-cegas.html?p=CODIGO): abrir já conta como teste
  if (/teste-as-cegas/.test(location.pathname)) enviar('teste_cegas');
  function tipoDoClique(el) {
    var href = (el.getAttribute('href') || '').toLowerCase(), txt = (el.textContent || '').toLowerCase();
    if (el.hasAttribute('data-contratar') || /^\s*assinar/.test(txt)) return 'assinar';
    if (href.indexOf('teste-as-cegas') >= 0 || el.classList.contains('an-btn-cegas') || txt.indexOf('teste às cegas') >= 0) return 'teste_cegas';
    if (/(^|\/)anshur\/?(index\.html)?$/.test(href) || txt.indexOf('demonstração') >= 0) return 'demonstracao';
    return null;
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a, button');
    if (!el) return;
    var t = tipoDoClique(el);
    if (t) enviar(t);
  }, true);
})();
