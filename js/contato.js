/*
 * Contato da BLUE ROSE (WhatsApp e e-mail).
 * Os dados ficam codificados aqui e só são montados no navegador,
 * para não aparecerem em texto puro no código-fonte do site.
 *
 * Para trocar o número ou o e-mail, gere os códigos no console do navegador:
 *   [...'SEU-DADO'].map(c => c.charCodeAt(0) + 11)
 */
(function () {
  var decodificar = function (codigos) {
    return codigos.map(function (c) { return String.fromCharCode(c - 11); }).join('');
  };
  var WA = decodificar([64, 64, 60, 65, 68, 68, 60, 61, 59, 62, 66, 59, 59]);
  var EMAIL = decodificar([110, 108, 128, 108, 110, 63, 112, 127, 108, 121, 122, 75, 114, 120, 108, 116, 119, 57, 110, 122, 120]);

  // Disponível para os scripts das páginas (ex.: calculadora de orçamento)
  window.BR_WA = WA;
  window.BR_EMAIL = EMAIL;

  function formatar(n) {
    var d = n.replace(/^55/, '');
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  function aplicar() {
    document.querySelectorAll('a[href*="wa.me/WHATSAPP"]').forEach(function (a) {
      a.href = a.getAttribute('href').replace('WHATSAPP', WA);
    });
    document.querySelectorAll('a[href^="mailto:EMAIL"]').forEach(function (a) {
      a.href = a.getAttribute('href').replace('EMAIL', EMAIL);
    });
    document.querySelectorAll('[data-contato="whatsapp"]').forEach(function (el) {
      el.textContent = formatar(WA);
    });
    document.querySelectorAll('[data-contato="email"]').forEach(function (el) {
      el.textContent = EMAIL;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicar);
  else aplicar();
})();
