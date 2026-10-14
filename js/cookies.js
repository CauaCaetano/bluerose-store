/*
 * Cookies e privacidade (LGPD) do site da Blue Rose.
 *
 * Categorias:
 *   necessários  sempre ligados: lembrar a escolha de cookies, idioma, login e o link de indicação.
 *   estatística  só com aceite: medição própria das visitas (páginas e cliques), gravada no nosso banco.
 *                Sem Google Analytics, sem terceiros e sem IP: um identificador aleatório do navegador.
 *   marketing    só com aceite: de onde a pessoa veio (Instagram, Google, campanha), por 90 dias,
 *                para saber quais divulgações trazem clientes.
 *
 * Cada escolha é registrada (data, versão e categorias) como prova do consentimento.
 * O sinal "Global Privacy Control" do navegador é respeitado: nesse caso as opções vêm desligadas.
 * A escolha pode ser mudada a qualquer momento pelo link "Preferências de cookies" do rodapé.
 */
(function () {
  'use strict';
  if (window.__brCookies) return;
  window.__brCookies = true;

  var VERSAO = '2026-10-14';
  var BANCO = { url: 'https://yihnfzwtkqdfnwziutqa.supabase.co', chave: (window.BR_LEADS && window.BR_LEADS.chave) || 'sb_publishable_nrMgwLCtiojWE-yWMeZK7g_iinpfY_5' };
  var EN = (document.documentElement.lang || '').indexOf('en') === 0;
  var raiz = /\/sites\/[^/]+\//.test(location.pathname) ? '../../' : '';
  var T = EN ? {
    titulo: 'Cookies and privacy', texto: 'We use necessary cookies to run the site. With your permission, we also measure visits (in our own database, no third parties) and which campaigns bring visitors.',
    aceitar: 'Accept all', so: 'Only necessary', pers: 'Customize', salvar: 'Save choices', fechar: 'Close', mais: 'Privacy policy',
    nec: ['Necessary', 'Always on. Your cookie choice, language, login and the referral link you used.'],
    est: ['Statistics', 'Pages visited and clicks, with a random browser ID. No IP, no third parties. Kept for up to 13 months.'],
    mkt: ['Marketing', 'Where you came from (Instagram, Google, campaign), kept for 90 days to measure our campaigns.'],
    pref: 'Cookie preferences', ok: 'Preferences saved',
  } : {
    titulo: 'Cookies e privacidade', texto: 'Usamos cookies necessários para o site funcionar. Com a sua permissão, também medimos as visitas (no nosso próprio banco, sem terceiros) e quais divulgações trazem visitantes.',
    aceitar: 'Aceitar todos', so: 'Só necessários', pers: 'Personalizar', salvar: 'Salvar escolhas', fechar: 'Fechar', mais: 'Política de privacidade',
    nec: ['Necessários', 'Sempre ligados. Sua escolha de cookies, o idioma, o login e o link de indicação que você usou.'],
    est: ['Estatística', 'Páginas visitadas e cliques, com um identificador aleatório do navegador. Sem IP e sem terceiros. Guardado por até 13 meses.'],
    mkt: ['Marketing', 'De onde você veio (Instagram, Google, campanha), guardado por 90 dias para medir as nossas divulgações.'],
    pref: 'Preferências de cookies', ok: 'Preferências salvas',
  };

  // ---------------------------------------------------------------- cookies
  var lerCookie = function (n) { var m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; };
  var gravarCookie = function (n, v, dias) {
    var x = n + '=' + encodeURIComponent(v) + '; path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    if (dias) x += '; max-age=' + Math.round(dias * 86400);
    document.cookie = x;
  };
  var apagarCookie = function (n) { document.cookie = n + '=; path=/; max-age=0; SameSite=Lax'; };
  var aleatorio = function () { var a = new Uint8Array(16); (window.crypto || window.msCrypto).getRandomValues(a); return Array.prototype.map.call(a, function (b) { return 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]; }).join(''); };

  var consent = (function () { try { var c = JSON.parse(lerCookie('br_consent') || 'null'); return c && c.v === VERSAO ? c : null; } catch (e) { return null; } })();
  // compatível com o restante do site
  window.brConsentimento = function (tipo) { return tipo === 'essencial' || tipo === 'necessario' || !!(consent && consent[tipo === 'publicidade' ? 'marketing' : tipo]); };

  // ---------------------------------------------------------------- envio ao banco (só insere; não lê nada)
  var enviar = function (tabela, dados) {
    try {
      fetch(BANCO.url + '/rest/v1/' + tabela, {
        method: 'POST', keepalive: true,
        headers: { apikey: BANCO.chave, Authorization: 'Bearer ' + BANCO.chave, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(dados),
      }).catch(function () {});
    } catch (e) { /* sem rede: segue sem medir */ }
  };
  var vid = function () { var v = lerCookie('br_vid'); if (!v) { v = aleatorio(); } gravarCookie('br_vid', v, 395); return v; };   // 13 meses
  var sessao = function () { var s = lerCookie('br_sessao'); if (!s) s = aleatorio(); gravarCookie('br_sessao', s, 1 / 48); return s; };   // 30 min, renovada a cada página

  // ---------------------------------------------------------------- origem da visita (marketing) e indicação (necessário)
  var params = new URLSearchParams(location.search);
  var indica = params.get('indica') || params.get('ref');
  if (indica && /^[A-Za-z0-9]{6,16}$/.test(indica)) gravarCookie('br_indica', indica.toUpperCase(), 90);   // o programa de indicação depende dele
  var origemNova = (function () {
    var ref = '';
    try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) { ref = ''; }
    if (ref && ref.replace(/^www\./, '') === location.hostname.replace(/^www\./, '')) ref = '';
    var s = params.get('utm_source'), m = params.get('utm_medium'), c = params.get('utm_campaign');
    if (!s && !ref) return null;
    var limpa = function (x, n) { return String(x || '').replace(/[^\w .:/-]/g, '').slice(0, n); };
    return { s: limpa(s || ref, 60), m: limpa(m || (s ? '' : 'referencia'), 60), c: limpa(c, 80), ref: limpa(ref, 80) };
  })();
  var origemGuardada = function () { try { return JSON.parse(lerCookie('br_origem') || 'null'); } catch (e) { return null; } };

  // ---------------------------------------------------------------- medição (estatística)
  function medir(evento) {
    if (!window.brConsentimento('estatistica')) return;
    var o = window.brConsentimento('marketing') ? (origemGuardada() || origemNova) : null;
    enviar('site_metricas', {
      vid: vid(), sessao: sessao(), evento: evento, pagina: (location.pathname + (location.hash && location.hash.length < 30 ? location.hash : '')).slice(0, 160),
      origem: o ? (o.ref || null) : null, utm_source: o ? (o.s || null) : null, utm_medium: o ? (o.m || null) : null, utm_campaign: o ? (o.c || null) : null,
      idioma: EN ? 'en' : 'pt-BR', tela: innerWidth < 640 ? 'celular' : innerWidth < 1100 ? 'tablet' : 'computador',
    });
  }
  window.brMedir = medir;
  function aplicar() {
    if (window.brConsentimento('marketing')) { if (origemNova) gravarCookie('br_origem', JSON.stringify(origemNova), 90); }
    else apagarCookie('br_origem');
    if (!window.brConsentimento('estatistica')) { apagarCookie('br_vid'); apagarCookie('br_sessao'); }
  }
  // cliques que importam: teste grátis, demonstração, WhatsApp, e-mail, contratar
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a, button'); if (!a) return;
    var h = a.getAttribute('href') || '';
    var ev = a.hasAttribute('data-contratar') ? 'contratar' : /(^|\/)app\/[a-z]+\/?$/.test(h) || a.hasAttribute('data-teste') ? 'teste' : /demos\/sistemas\/|sites\//.test(h) ? 'demo' : /wa\.me/.test(h) ? 'whatsapp' : /^mailto:/.test(h) ? 'email' : a.classList.contains('va-alvo') ? 'assistente' : '';
    if (ev) medir(ev);
  }, true);
  document.addEventListener('submit', function (e) { if (e.target.matches && e.target.matches('[data-form-contato]')) medir('contato'); }, true);

  // ---------------------------------------------------------------- aviso e preferências
  function salvar(est, mkt) {
    consent = { v: VERSAO, estatistica: !!est, marketing: !!mkt, em: new Date().toISOString().slice(0, 10) };
    gravarCookie('br_consent', JSON.stringify(consent), 365);
    try { localStorage.setItem('br-aviso-cookies', JSON.stringify({ essencial: true, estatistica: !!est, publicidade: !!mkt, em: consent.em })); } catch (e) { /* ok */ }
    enviar('site_consentimentos', { vid: lerCookie('br_vid') || (est ? vid() : aleatorio()), versao: VERSAO, estatistica: !!est, marketing: !!mkt, pagina: location.pathname.slice(0, 160) });
    aplicar();
    if (est) medir('pagina');
  }
  function el(tag, attrs, html) { var x = document.createElement(tag); for (var k in attrs) x.setAttribute(k, attrs[k]); if (html != null) x.innerHTML = html; return x; }
  function opcao(id, txt, ligado, travado) {
    return '<label class="ck-op"><span><b>' + txt[0] + '</b><small>' + txt[1] + '</small></span><input type="checkbox" data-ck="' + id + '"' + (ligado ? ' checked' : '') + (travado ? ' disabled' : '') + ' role="switch"></label>';
  }
  function abrirPreferencias() {
    fecharAviso();
    var gpc = !!navigator.globalPrivacyControl;
    var d = el('dialog', { class: 'ck-dialogo', 'aria-labelledby': 'ck-t' },
      '<h2 id="ck-t">' + T.pref + '</h2>' + opcao('nec', T.nec, true, true) + opcao('est', T.est, consent ? consent.estatistica : !gpc) + opcao('mkt', T.mkt, consent ? consent.marketing : false) +
      '<div class="ck-acoes"><button type="button" class="btn btn-ghost" data-ck-acao="so">' + T.so + '</button><button type="button" class="btn btn-primary" data-ck-acao="salvar">' + T.salvar + '</button></div>' +
      '<a class="ck-link" href="' + raiz + (EN ? 'privacy-en.html' : 'privacidade.html') + '#cookies">' + T.mais + '</a>');
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ck-acao]');
      if (e.target === d) { d.close(); return; }
      if (!b) return;
      if (b.getAttribute('data-ck-acao') === 'so') salvar(false, false);
      else salvar(d.querySelector('[data-ck=est]').checked, d.querySelector('[data-ck=mkt]').checked);
      d.close();
    });
    d.addEventListener('close', function () { d.remove(); });
    document.body.appendChild(d);
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }
  window.brAbrirCookies = abrirPreferencias;
  var aviso = null;
  function fecharAviso() { if (aviso) { aviso.remove(); aviso = null; } }
  function mostrarAviso() {
    aviso = el('div', { class: 'aviso-cookies', role: 'region', 'aria-label': T.titulo },
      '<p><b>' + T.titulo + '.</b> ' + T.texto + ' <a href="' + raiz + (EN ? 'privacy-en.html' : 'privacidade.html') + '#cookies">' + T.mais + '</a></p>' +
      '<div class="ck-botoes"><button type="button" class="btn btn-ghost" data-ck-acao="pers">' + T.pers + '</button><button type="button" class="btn btn-ghost" data-ck-acao="so">' + T.so + '</button><button type="button" class="btn btn-primary" data-ck-acao="todos">' + T.aceitar + '</button></div>');
    aviso.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ck-acao]'); if (!b) return;
      var a = b.getAttribute('data-ck-acao');
      if (a === 'todos') { salvar(true, true); fecharAviso(); }
      else if (a === 'so') { salvar(false, false); fecharAviso(); }
      else abrirPreferencias();
    });
    document.body.appendChild(aviso);
  }
  // link "Preferências de cookies" no rodapé de todas as páginas
  function linkRodape() {
    var alvo = document.querySelector('footer nav') || document.querySelector('footer');
    if (!alvo || alvo.querySelector('[data-ck-pref]')) return;
    var b = el('button', { type: 'button', class: 'ck-rodape', 'data-ck-pref': '' }); b.textContent = T.pref;
    b.addEventListener('click', abrirPreferencias);
    alvo.appendChild(b);
  }

  function iniciar() {
    linkRodape();
    if (/\/(app|c|demos)\//.test(location.pathname)) return;   // dentro dos sistemas e das demonstrações não aparece aviso
    if (!consent) mostrarAviso();
    else { aplicar(); medir('pagina'); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
