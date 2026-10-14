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
  var WA = decodificar([64, 64, 60, 65, 68, 68, 60, 64, 59, 59, 66, 63, 65]);
  var EMAIL = decodificar([109, 119, 128, 112, 125, 122, 126, 112, 112, 131, 123, 125, 112, 126, 126, 122, 113, 116, 110, 116, 108, 119, 75, 114, 120, 108, 116, 119, 57, 110, 122, 120]);

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

  /*
   * "Mandar um e-mail": muita gente não tem um programa de e-mail configurado no computador, e aí o
   * link mailto: só abre uma aba vazia. Em vez dele, abrimos uma janela com três caminhos que sempre
   * funcionam: escrever no Gmail (já com assunto e texto), copiar o endereço ou usar o app de e-mail.
   */
  var en = (document.documentElement.lang || '').indexOf('en') === 0;
  var T = en
    ? { titulo: 'Send an email', sub: 'Choose how you prefer to write to Blue Rose:', gmail: 'Write in Gmail', copiar: 'Copy', copiado: 'Copied', app: 'Use my email app', fechar: 'Close' }
    : { titulo: 'Mandar um e-mail', sub: 'Escolha como prefere escrever para a Blue Rose:', gmail: 'Escrever no Gmail', copiar: 'Copiar', copiado: 'Copiado', app: 'Usar o app de e-mail do computador', fechar: 'Fechar' };

  function abrirEmail(assunto, corpo) {
    var antigo = document.querySelector('.br-email'); if (antigo) antigo.remove();
    var q = function (k, v) { return v ? k + '=' + encodeURIComponent(v) : ''; };
    var gmail = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(EMAIL) + (assunto ? '&' + q('su', assunto) : '') + (corpo ? '&' + q('body', corpo) : '');
    var mailto = 'mailto:' + EMAIL + '?' + [q('subject', assunto), q('body', corpo)].filter(Boolean).join('&');
    var d = document.createElement('dialog');
    d.className = 'br-email';
    d.setAttribute('aria-labelledby', 'br-email-t');
    d.innerHTML =
      '<h2 id="br-email-t"></h2><p class="br-email-sub"></p>' +
      '<div class="br-email-end"><span class="br-email-addr"></span><button type="button" class="br-email-copiar"></button></div>' +
      '<a class="br-email-gmail" target="_blank" rel="noopener"></a>' +
      '<a class="br-email-app" data-direto></a>' +
      '<button type="button" class="br-email-fechar"></button>';
    d.querySelector('h2').textContent = T.titulo;
    d.querySelector('.br-email-sub').textContent = T.sub;
    d.querySelector('.br-email-addr').textContent = EMAIL;
    var copiar = d.querySelector('.br-email-copiar'); copiar.textContent = T.copiar;
    var g = d.querySelector('.br-email-gmail'); g.href = gmail; g.textContent = T.gmail;
    var app = d.querySelector('.br-email-app'); app.href = mailto; app.textContent = T.app;
    var fechar = d.querySelector('.br-email-fechar'); fechar.textContent = T.fechar;
    copiar.addEventListener('click', function () {
      var ok = function () { copiar.textContent = T.copiado; setTimeout(function () { copiar.textContent = T.copiar; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(EMAIL).then(ok, function () {});
      else {
        var r = document.createRange(); r.selectNodeContents(d.querySelector('.br-email-addr'));
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
        try { document.execCommand('copy'); ok(); } catch (e) { /* o endereço fica selecionado para copiar à mão */ }
      }
    });
    fechar.addEventListener('click', function () { d.close(); });
    g.addEventListener('click', function () { setTimeout(function () { d.close(); }, 300); });
    d.addEventListener('close', function () { d.remove(); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });   // clique fora fecha
    document.body.appendChild(d);
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    g.focus();
  }
  window.BR_abrirEmail = abrirEmail;

  // qualquer link de e-mail do site (contato, rodapé, assistente) usa a janela
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="mailto:"]');
    if (!a || a.hasAttribute('data-direto') || a.hasAttribute('data-email-form') || !EMAIL) return;
    var url = a.getAttribute('href'), params = {};
    (url.split('?')[1] || '').split('&').forEach(function (par) {
      var kv = par.split('='); if (kv[0]) params[kv[0].toLowerCase()] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' '));
    });
    e.preventDefault();
    abrirEmail(params.subject, params.body);
  }, true);
})();
