/*
 * Termo de Assinatura do Anshur: texto versionado (docs/contrato-anshur-v1.txt), hash SHA-256 e desenho do texto.
 * O banco (anshur_contratos_versoes) guarda o mesmo texto e o mesmo hash; o aceite só é gravado se o hash bater.
 * Versão nova = arquivo novo (contrato-anshur-v2.txt) + linha nova no banco; a versão 1 nunca é editada.
 */
(function () {
  'use strict';
  var VERSAO = 1;
  var s = document.querySelector('script[src*="js/contrato-anshur.js"]');
  var raiz = s ? s.getAttribute('src').split('js/contrato-anshur.js')[0] : '';
  var ARQUIVO = raiz + 'docs/contrato-anshur-v' + VERSAO + '.txt?v=1';
  var PAGINA = raiz + 'contrato-anshur.html';
  var cache = null;

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function normal(t) { return String(t).replace(/\r\n/g, '\n'); }
  function sha256(t) {
    if (!window.crypto || !crypto.subtle) return Promise.reject(new Error('Este navegador não confere o texto do Termo. Atualize o navegador.'));
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(normal(t))).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  // texto da versão vigente, como está publicado, com o hash calculado aqui
  function carregar() {
    if (cache) return cache;
    cache = fetch(ARQUIVO, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('Não foi possível abrir o Termo agora. Tente de novo.');
      return r.text();
    }).then(function (t) { t = normal(t); return sha256(t).then(function (h) { return { versao: VERSAO, texto: t, hash: h }; }); })
      .catch(function (e) { cache = null; throw e; });
    return cache;
  }
  // desenha o texto (títulos "## ", negrito **x**, parágrafos), sempre escapado
  function html(t, nivel) {
    var h = nivel || 'h4';
    return normal(t).split('\n').filter(function (l) { return l.trim(); }).map(function (l) {
      var forte = function (x) { return esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); };
      if (/^# /.test(l)) return '';
      if (/^## /.test(l)) return '<' + h + '>' + forte(l.slice(3)) + '</' + h + '>';
      return '<p>' + forte(l) + '</p>';
    }).join('');
  }
  function cnpjLimpo(v) { return String(v || '').toUpperCase().replace(/[^0-9A-Z]/g, ''); }
  // CNPJ numérico ou alfanumérico (Receita, desde julho de 2026): 12 caracteres + 2 dígitos verificadores
  function cnpjValido(v) {
    var c = cnpjLimpo(v);
    if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(c) || /^(.)\1{13}$/.test(c)) return false;
    function dv(n) {
      var p = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], s = 0;
      for (var i = 0; i < n; i++) s += (c.charCodeAt(i) - 48) * p[i];
      var r = s % 11; return r < 2 ? 0 : 11 - r;
    }
    return dv(12) === Number(c[12]) && dv(13) === Number(c[13]);
  }
  function cnpjFormatado(v) {
    var c = cnpjLimpo(v);
    return c.length === 14 ? c.slice(0, 2) + '.' + c.slice(2, 5) + '.' + c.slice(5, 8) + '/' + c.slice(8, 12) + '-' + c.slice(12) : c;
  }
  function dataHora(iso) {
    var d = new Date(iso); if (isNaN(d)) return '—';
    return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' (horário de Brasília)';
  }
  window.BR_CONTRATO = { versao: VERSAO, pagina: PAGINA, arquivo: ARQUIVO, raiz: raiz, carregar: carregar, sha256: sha256, html: html, esc: esc,
    cnpjValido: cnpjValido, cnpjLimpo: cnpjLimpo, cnpjFormatado: cnpjFormatado, dataHora: dataHora };
})();
