/*
 * Moldura dos sites de exemplo (28/10/2026). O visual de cada site é dele; aqui fica só o que é de demonstração:
 *  - pílula "Quero um site assim", "ver outros modelos" e o preço de um site como este (plano Completo, o mesmo do catálogo);
 *  - [data-wa="mensagem"]: em vez de abrir o WhatsApp, mostra como o pedido chega (nada é enviado);
 *  - prévia para o cliente: ?nome=&cor= trocam a marca e a cor de destaque (--acc) só nesta aba;
 *    as cenas 3D escutam o evento "br-cor" para trocar a cor junto;
 *  - contagem de visitas (tabela visitas do Supabase, sem cookies).
 * O <body> traz data-slug, data-marca e data-cat.
 */
(function () {
  'use strict';
  var doc = document, body = doc.body, raiz = '../../';
  var SLUG = body.dataset.slug || '', MARCA0 = body.dataset.marca || 'site', MARCA = MARCA0, CAT = body.dataset.cat || '';
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };

  function contar(tipo, extra) {
    var cfg = window.BR_LEADS;
    if (!cfg || !cfg.url || !cfg.chave || cfg.contar === false) return;
    try {
      fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/visitas', { method: 'POST', keepalive: true,
        headers: { apikey: cfg.chave, Authorization: 'Bearer ' + cfg.chave, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ tipo: tipo, site: SLUG, pagina: location.pathname.split('/').pop() || 'index.html', idioma: 'pt', detalhe: extra || null }) }).catch(function () {});
    } catch (e) {}
  }
  addEventListener('load', function () { setTimeout(function () { contar('visita'); }, 400); });

  // ---------- prévia para o cliente (validado: nome sem caracteres de controle, cor só em hexadecimal) ----------
  var perso = null, HEX = /^#?[0-9a-f]{6}$/i;
  try {
    var q = new URLSearchParams(location.search);
    var limpa = function (v) { return String(v || '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 40); };
    if (q.has('limpar')) sessionStorage.removeItem('br-perso');
    var g = JSON.parse(sessionStorage.getItem('br-perso') || 'null') || {};
    var nome = limpa(q.get('nome')) || limpa(g.nome), cor = (q.get('cor') || g.cor || '').replace('#', '');
    if (!HEX.test(cor)) cor = '';
    if (nome || cor) { perso = { nome: nome, cor: cor }; sessionStorage.setItem('br-perso', JSON.stringify(perso)); }
  } catch (e) {}
  if (perso && perso.nome) trocarNome(perso.nome);
  if (perso && perso.cor) {
    doc.documentElement.style.setProperty('--acc', '#' + perso.cor);
    window.BR_COR = '#' + perso.cor;
    dispatchEvent(new CustomEvent('br-cor', { detail: '#' + perso.cor }));
  }
  function trocarNome(nome) {
    var re = new RegExp(MARCA0.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    var w = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { return /SCRIPT|STYLE/.test(n.parentNode.nodeName) ? 2 : 1; } });
    var nos = []; while (w.nextNode()) nos.push(w.currentNode);
    nos.forEach(function (n) { if (re.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(re, nome); re.lastIndex = 0; });
    [].forEach.call(doc.querySelectorAll('[data-wa],[aria-label],[alt]'), function (el) {
      ['data-wa', 'aria-label', 'alt'].forEach(function (a) { var v = el.getAttribute(a); if (v && v.indexOf(MARCA0) >= 0) el.setAttribute(a, v.split(MARCA0).join(nome)); });
    });
    doc.title = doc.title.split(MARCA0).join(nome);
    MARCA = nome;
  }

  function urlQuero() {
    return raiz + 'index.html?modelo=' + encodeURIComponent(MARCA0) + (perso && perso.nome ? '&nome=' + encodeURIComponent(perso.nome) : '') + '#contato';
  }

  // ---------- pílula ----------
  var pill = doc.createElement('div');
  pill.className = 'br-pill';
  pill.innerHTML = '<a class="br-pill-marca" href="' + raiz + 'exemplos.html' + (CAT ? '?c=' + CAT : '') + '"><b>BLUE ROSE</b><span>ver outros modelos</span></a>' +
    (perso && perso.nome ? '<span class="br-pill-perso">Prévia para <b>' + esc(perso.nome) + '</b> · <button type="button">desfazer</button></span>' : '') +
    (CAT !== 'midia-kit' ? '<a class="br-pill-preco" href="' + urlQuero() + '"><b>R$ 1.490</b><span>site como este, pronto em 7 dias úteis</span></a>' : '') +
    '<a class="br-pill-cta" href="' + urlQuero() + '">Quero um site assim</a>';
  body.appendChild(pill);
  pill.querySelector('.br-pill-cta').addEventListener('click', function () { contar('quero', 'pilula'); });
  var desf = pill.querySelector('.br-pill-perso button');
  if (desf) desf.addEventListener('click', function () { try { sessionStorage.removeItem('br-perso'); } catch (e) {} location.href = location.pathname; });

  // ---------- simulação do WhatsApp ----------
  var sim = null, timers = [], focoAntes = null;
  function linha(msg, k) { var x = msg.match(new RegExp('•\\s*' + k + ':\\s*(.+)', 'i')); return x ? x[1].trim() : ''; }
  function resposta(msg) {
    var nome = linha(msg, 'Nome').split(' ')[0], dia = linha(msg, 'Dia'), serv = linha(msg, 'Serviço') || linha(msg, 'Tratamento');
    var total = (msg.match(/(?:Total|Estimativa|Mensalidade estimada)[^:\n]*:\s*([^\n]+)/i) || [])[1];
    if (dia) return 'Oi' + (nome ? ', ' + nome : '') + '! ' + (serv ? 'Seu horário de ' + serv.toLowerCase() : 'Seu horário') + ' ficou pré-reservado para ' + dia + '. Responda 1 para confirmar ou 2 para trocar.';
    if (total) return 'Recebemos sua simulação (' + total.trim() + '). Temos horários amanhã às 10h e às 15h. Qual fica melhor?';
    return 'Olá! Aqui é a assistente virtual da ' + MARCA + '. Como posso ajudar?\n1. Agendar horário\n2. Valores\n3. Falar com a equipe';
  }
  function hora() { var d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function montar() {
    sim = doc.createElement('div');
    sim.className = 'br-sim'; sim.hidden = true;
    sim.setAttribute('role', 'dialog'); sim.setAttribute('aria-modal', 'true'); sim.setAttribute('aria-labelledby', 'br-sim-t');
    sim.innerHTML = '<div class="br-sim-caixa"><button type="button" class="br-sim-x" aria-label="Fechar">×</button>' +
      '<div class="br-sim-fone"><div class="br-sim-topo"><span class="br-sim-av"></span><div><strong class="br-sim-marca"></strong><small class="br-sim-st">online</small></div></div><div class="br-sim-chat" aria-live="polite"></div><div class="br-sim-aviso">Demonstração: nenhuma mensagem foi enviada</div></div>' +
      '<div class="br-sim-txt"><p class="br-sim-tag">Simulação</p><h3 id="br-sim-t">É assim que o pedido chega no WhatsApp da empresa</h3><p>Nesta demonstração nada foi enviado. Num site de verdade, o pedido chega no WhatsApp do negócio e a resposta automática atende na hora, a qualquer hora do dia.</p><a class="br-sim-cta" href="#">Quero isso no meu negócio</a><button type="button" class="br-sim-volta">Continuar navegando</button></div></div>';
    body.appendChild(sim);
    sim.addEventListener('click', function (e) { if (e.target === sim || e.target.closest('.br-sim-x,.br-sim-volta')) fechar(); });
    sim.querySelector('.br-sim-cta').addEventListener('click', function () { contar('quero', 'simulacao'); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });
  }
  function fechar() { if (!sim || sim.hidden) return; timers.forEach(clearTimeout); sim.hidden = true; if (focoAntes) focoAntes.focus(); }
  function abrir(msg) {
    if (!sim) montar();
    timers.forEach(clearTimeout); timers = []; focoAntes = doc.activeElement;
    $('.br-sim-av', sim).textContent = MARCA.charAt(0).toUpperCase();
    $('.br-sim-marca', sim).textContent = MARCA;
    $('.br-sim-cta', sim).href = urlQuero();
    var chat = $('.br-sim-chat', sim); chat.innerHTML = '';
    var bolha = function (txt, lado, dig) {
      var b = doc.createElement('div'); b.className = 'br-sim-msg ' + lado;
      b.innerHTML = dig ? '<i></i><i></i><i></i>' : esc(txt).replace(/\n/g, '<br>') + '<span>' + hora() + (lado === 'eu' ? ' ✓✓' : '') + '</span>';
      chat.appendChild(b); chat.scrollTop = chat.scrollHeight; return b;
    };
    sim.hidden = false; $('.br-sim-x', sim).focus();
    contar('simulacao');
    bolha(msg, 'eu');
    timers.push(setTimeout(function () { var d = bolha('', 'ela', true); $('.br-sim-st', sim).textContent = 'digitando…'; timers.push(setTimeout(function () { d.remove(); $('.br-sim-st', sim).textContent = 'online'; bolha(resposta(msg), 'ela'); }, 1400)); }, 800));
  }
  window.BR_WA = abrir;
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('[data-wa]'); if (!a) return;
    e.preventDefault(); abrir(a.getAttribute('data-wa').split(MARCA0).join(MARCA));
  });
})();
