/*
 * Veltria · envio simulado na demonstração.
 * Nos sistemas (demos/sistemas/...), WhatsApp, e-mail, SMS e ligação para clientes não saem de verdade: abre uma
 * simulação mostrando a mensagem que iria. Envio real só no modo conta (?conta=...) com assinatura ativa
 * (conta-nuvem.js põe window.veltriaEnvioReal = true). Contato com a própria Blue Rose (vendas e suporte) passa direto.
 */
(function () {
  'use strict';
  if (window.__veltriaEnvioDemo || !/\/demos\/sistemas\//.test(location.pathname)) return;
  window.__veltriaEnvioDemo = 1;
  var dec = function (l) { return l.map(function (c) { return String.fromCharCode(c - 11); }).join(''); };
  var NOSSO_WA = dec([64, 64, 60, 65, 68, 68, 60, 64, 59, 59, 66, 63, 65]);
  var NOSSO_EMAIL = /blueroseexpressoficial@gmail\.com|bluerose-store\.com/i;
  var ENVIO = /^(https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\/|whatsapp:|mailto:|sms:|tel:)/i;

  function real() { return window.veltriaEnvioReal === true && /[?&]conta=/.test(location.search); }
  function nosso(u) { var d = u.replace(/\D/g, ''); return (NOSSO_WA && d.indexOf(NOSSO_WA) >= 0) || NOSSO_EMAIL.test(decodeURIComponent(u)); }
  function simula(u) { return typeof u === 'string' && ENVIO.test(u) && !nosso(u) && !real(); }

  function ler(u) {
    var q = {}; try { new URLSearchParams(u.split('?').slice(1).join('?')).forEach(function (v, k) { q[k] = v; }); } catch (e) { /* fica sem detalhes */ }
    var canal, para = '', texto = '', assunto = '';
    if (/^mailto:/i.test(u)) { canal = 'E-mail'; para = decodeURIComponent(u.slice(7).split('?')[0]); assunto = q.subject || ''; texto = q.body || ''; }
    else if (/^sms:/i.test(u)) { canal = 'SMS'; para = u.slice(4).split('?')[0]; texto = q.body || ''; }
    else if (/^tel:/i.test(u)) { canal = 'Ligação'; para = u.slice(4); }
    else { canal = 'WhatsApp'; var m = u.match(/wa\.me\/(\d+)/) || u.match(/[?&]phone=(\d+)/); para = m ? m[1] : ''; texto = q.text || ''; }
    para = para.replace(/^55(?=\d{10,11}$)/, '');
    if (/^\d{10,11}$/.test(para)) para = '(' + para.slice(0, 2) + ') ' + para.slice(2, para.length - 4) + '-' + para.slice(-4);
    return { canal: canal, para: para || (canal === 'WhatsApp' ? 'você escolhe o contato no WhatsApp' : 'sem destinatário'), texto: texto, assunto: assunto };
  }

  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function mostra(u) {
    var d = ler(u), conta = /[?&]conta=/.test(location.search);
    if (!document.getElementById('ved-css')) {
      var st = document.createElement('style'); st.id = 'ved-css';
      st.textContent = '.ved{position:fixed;inset:0;z-index:2147483000;background:rgba(15,18,28,.55);display:grid;place-items:center;padding:16px;font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}' +
        '.ved-c{background:#fff;color:#1d2230;border-radius:18px;max-width:400px;width:100%;overflow:hidden;box-shadow:0 20px 60px rgba(10,14,30,.35)}' +
        '.ved-t{display:flex;gap:10px;align-items:center;padding:14px 16px;background:#075e54;color:#fff}.ved-t.mail{background:#2d3a5c}.ved-t b{display:block}.ved-t small{opacity:.85}' +
        '.ved-f{background:#ece5dd;padding:16px;min-height:90px}.ved-f.mail{background:#f4f5f8}' +
        '.ved-b{background:#dcf8c6;border-radius:12px 2px 12px 12px;padding:10px 12px;margin-left:auto;max-width:92%;white-space:pre-wrap;word-break:break-word}.ved-f.mail .ved-b{background:#fff;border-radius:10px;margin:0;max-width:none;border:1px solid #e1e4ea}' +
        '.ved-ok{display:block;text-align:right;font-size:.78rem;color:#667;margin-top:6px}.ved-ok i{font-style:normal;color:#34b7f1}' +
        '.ved-p{padding:14px 16px 4px;margin:0;font-size:.9rem;color:#3d4357}.ved-p b{color:#1d2230}' +
        '.ved-x{display:block;margin:12px 16px 16px auto;border:0;border-radius:999px;padding:10px 20px;background:#1d2230;color:#fff;font:600 .95rem inherit;cursor:pointer}';
      document.head.appendChild(st);
    }
    var v = document.createElement('div'); v.className = 'ved'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', 'Envio simulado');
    var mail = d.canal === 'E-mail', corpo = d.canal === 'Ligação' ? 'Ligando para ' + esc(d.para) + '…' : (d.assunto ? '<b>' + esc(d.assunto) + '</b>\n\n' : '') + esc(d.texto || '(mensagem em branco)');
    v.innerHTML = '<div class="ved-c"><div class="ved-t' + (mail ? ' mail' : '') + '"><span><b>' + esc(d.canal) + ' · simulação</b><small>Para: ' + esc(d.para) + '</small></span></div>' +
      '<div class="ved-f' + (mail ? ' mail' : '') + '"><div class="ved-b">' + corpo + '</div><span class="ved-ok" data-st>enviando…</span></div>' +
      '<p class="ved-p">' + (conta ? 'Durante o teste grátis as mensagens são simuladas: <b>ninguém recebe nada</b>. Com a assinatura ativa, elas saem de verdade.' : 'Isto é a demonstração: <b>nenhuma mensagem foi enviada</b> a pessoas reais. Com a assinatura, ela sai de verdade pelo seu ' + (mail ? 'e-mail' : d.canal === 'Ligação' ? 'celular' : 'WhatsApp') + '.') + '</p>' +
      '<button type="button" class="ved-x">Entendi</button></div>';
    var antes = document.activeElement, fecha = function () { v.remove(); if (antes && antes.focus) antes.focus(); };
    v.addEventListener('click', function (e) { if (e.target === v || e.target.closest('.ved-x')) fecha(); });
    v.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecha(); });
    document.body.appendChild(v); v.querySelector('.ved-x').focus();
    setTimeout(function () { var s = v.querySelector('[data-st]'); if (s) s.innerHTML = d.canal === 'Ligação' ? 'chamada simulada' : 'entregue (simulação) <i>✓✓</i>'; }, 900);
  }
  window.veltriaSimularEnvio = mostra;

  // links: só impede a navegação; o resto do clique (marcar "confirmou", etc.) continua no sistema
  addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var h = a.getAttribute('href') || ''; if (!simula(h)) return;
    e.preventDefault(); a.dataset.vkPix = '1'; // a camada não reabre o link do PIX
    mostra(a.href || h);
  }, true);
  // window.open e location.assign/replace com link de envio
  function embrulha() {
    if (window.open && window.open.__ved) return;
    var abrir = window.open;
    var f = function (u) { if (simula(String(u || ''))) { mostra(String(u)); return null; } return abrir.apply(window, arguments); };
    f.__ved = 1; window.open = f;
  }
  embrulha(); addEventListener('DOMContentLoaded', embrulha); addEventListener('load', embrulha);
  ['assign', 'replace'].forEach(function (k) { try { var o = location[k].bind(location); location[k] = function (u) { if (simula(String(u))) { mostra(String(u)); return; } o(u); }; } catch (e) { /* navegador não deixa trocar */ } });
})();
