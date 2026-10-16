/* Blue Rose Ofixl é só app de celular: o sistema abre dentro do app do Google Play (ou no computador de desenvolvimento).
   No navegador comum aparece a tela para baixar o app. */
(function () {
  var eu = document.currentScript, modulo = eu.getAttribute('data-app');
  var noApp = false;
  try {
    if (new URLSearchParams(location.search).get('origem') === 'play') localStorage.setItem('nexo-play', '1');
    noApp = localStorage.getItem('nexo-play') === '1';
  } catch (e) {}
  if (document.referrer.indexOf('android-app://com.bluerosestore.ofixl') === 0) noApp = true;
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) noApp = true;
  if (noApp) { import(modulo); return; }

  var raiz = eu.getAttribute('data-raiz') || '../../';
  document.title = 'Blue Rose Ofixl · em breve';
  var ok = function () {
    document.body.innerHTML =
      '<main class="of-soapp">' +
      '<img src="' + raiz + 'img/ofixl-logo.png" alt="Blue Rose Ofixl" width="120" height="120">' +
      '<h1>Blue Rose Ofixl: em breve no Google Play</h1>' +
      '<p>Ordem de serviço, agenda do técnico, preventivas automáticas e cobrança com PIX, tudo no app de celular. Estamos na fase final de testes: em breve ele chega ao Google Play.</p>' +
      '<span class="of-play">Em breve no Google Play</span>' +
      '<a class="of-volta" href="' + raiz + 'ofixl.html">Conhecer o app e os planos</a>' +
      '</main>';
  };
  if (document.body) ok(); else document.addEventListener('DOMContentLoaded', ok);
})();
