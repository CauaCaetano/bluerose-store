/* Se alguém embutir esta página num site de outro domínio, ela sai do quadro (proteção contra clickjacking) */
(function () {
  if (window.top === window.self) return;
  try { if (window.top.location.hostname === location.hostname) return; } catch (e) { /* domínio diferente */ }
  document.documentElement.style.display = 'none';
  try { window.top.location = window.self.location.href; } catch (e) {}
})();
/* =============================================================
   Sites demonstrativos BLUE ROSE — comportamento
   Menu, carrosséis, calculadoras, agenda, quiz, personalização
   e a simulação de WhatsApp (nada é enviado de verdade).
   ============================================================= */
(function () {
  'use strict';
  var doc = document, body = doc.body;
  doc.documentElement.classList.add('js');
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); };
  var EN = body.getAttribute('data-lang') === 'en';
  var LOC = EN ? 'en-US' : 'pt-BR';
  var RAIZ = body.getAttribute('data-raiz') || '../../';
  var SLUG = body.getAttribute('data-slug') || '';
  var MARCA_ORIGINAL = body.getAttribute('data-marca') || 'site';
  var MARCA = MARCA_ORIGINAL;

  // ---------- textos ----------
  var TX = {
    fecharMenu: ['Fechar menu', 'Close menu'], abrirMenu: ['Abrir menu', 'Open menu'],
    emailRuim: ['Confira o e-mail digitado.', 'Please check the email address.'],
    emailOk: ['Pronto! Nesta demonstração o cadastro não é enviado, mas num site real ele entraria na sua lista.', 'Done. In this demo nothing is stored, but on a real site this would join your list.'],
    nada: ['Nada selecionado ainda.', 'Nothing selected yet.'],
    hoje: ['hoje', 'today'], semHorario: ['Sem horários livres neste dia. Escolha outra data.', 'No free times on this day. Pick another date.'],
    errNome: ['Digite seu nome.', 'Please enter your name.'], errTel: ['Digite um WhatsApp com DDD.', 'Please enter a phone number with area code.'],
    errServ: ['Escolha o serviço.', 'Please choose a service.'], errDia: ['Escolha o dia.', 'Please choose a day.'], errHora: ['Escolha um horário.', 'Please choose a time.'],
    abrindo: ['Pronto! Veja abaixo como o pedido chega.', 'Done. See below how the request arrives.'],
    preencha: ['Preencha: ', 'Please fill in: '], confEmail: ['Confira o e-mail.', 'Please check the email.'], confTel: ['Digite o telefone com DDD.', 'Please enter a phone with area code.'],
    lgpd: ['Confirme o uso dos dados para retorno.', 'Please confirm the use of your data.'],
    pergunta: ['Pergunta', 'Question'], de: ['de', 'of'], voltar: ['Voltar', 'Back'], resultado: ['Resultado', 'Result'], refazer: ['Refazer', 'Start over'], falarEquipe: ['Falar com a equipe', 'Talk to the team'],
    cobOk: ['Atendemos', 'We cover'], cobNao: ['Ainda não chegamos aí. Chame no WhatsApp que avisamos quando abrir sua região.', "We're not there yet. Message us and we'll let you know when we arrive."],
    gratis: ['deslocamento grátis', 'free travel'], deslocDe: ['deslocamento de', 'travel fee'], grátis: ['Grátis', 'Free'],
    para: ['Para', 'To'], deCard: ['De', 'From'],
    sim: {
      tag: ['Simulação', 'Simulation'], titulo: ['É assim que o pedido chega no WhatsApp da empresa', "This is how the request reaches the business's WhatsApp"],
      texto: ['Nesta demonstração nenhuma mensagem foi enviada. Num site de verdade, o pedido chega no WhatsApp do negócio e a resposta automática atende na hora, a qualquer hora do dia.', 'No message was sent in this demo. On a real website, the request lands on the business WhatsApp and an automatic reply answers right away, any time of day.'],
      cta: ['Quero isso no meu negócio', 'I want this for my business'], fechar: ['Continuar navegando', 'Keep browsing'],
      online: ['online', 'online'], digitando: ['digitando…', 'typing…'], aviso: ['Demonstração: nenhuma mensagem foi enviada', 'Demo: no message was sent'],
    },
  };
  var T = function (k) { var v = TX[k]; return v ? v[EN ? 1 : 0] : k; };
  var TS = function (k) { return TX.sim[k][EN ? 1 : 0]; };
  var dinheiro = function (n) {
    var r = Math.round(n * 100) / 100, fr = Number.isInteger(r) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    return (EN ? '$' : 'R$ ') + r.toLocaleString(LOC, fr);
  };
  var dinheiroC = function (n) { return (EN ? '$' : 'R$ ') + n.toLocaleString(LOC, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };

  // ---------- contagem de visitas (sem cookies; só funciona com o Supabase configurado) ----------
  function contar(tipo, extra) {
    var cfg = window.BR_LEADS;
    if (!cfg || !cfg.url || !cfg.chave || cfg.contar === false) return;
    try {
      fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/visitas', {
        method: 'POST', keepalive: true,
        headers: { apikey: cfg.chave, Authorization: 'Bearer ' + cfg.chave, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ tipo: tipo, site: SLUG, pagina: location.pathname.split('/').pop() || 'index.html', idioma: EN ? 'en' : 'pt', detalhe: extra || null }),
      }).catch(function () {});
    } catch (e) {}
  }
  window.addEventListener('load', function () { setTimeout(function () { contar('visita'); }, 400); });

  // =============================================================
  // PERSONALIZAÇÃO AO VIVO (?nome=&cor=, guardada só nesta aba)
  // =============================================================
  // ?nome=&cor=&cor2= chegam pela URL; a logo (imagem) fica só no navegador, salva pela página de exemplos
  var perso = null, HEX = /^#?[0-9a-f]{6}$/i;
  (function () {
    var q = new URLSearchParams(location.search);
    // tudo que vem da URL ou do armazenamento é validado: nome sem caracteres de controle, cores só em hexadecimal
    var limpaNome = function (v) { return String(v || '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 40); };
    var limpaCor = function (v) { v = String(v || '').trim(); return HEX.test(v) ? v.replace('#', '') : ''; };
    var url = { nome: limpaNome(q.get('nome')), cor: limpaCor(q.get('cor')), cor2: limpaCor(q.get('cor2')) };
    try {
      if (q.has('limpar')) { sessionStorage.removeItem('br-perso'); localStorage.removeItem('br-perso-logo'); }
      var bruto = JSON.parse(sessionStorage.getItem('br-perso') || 'null') || {};
      var guardado = { nome: limpaNome(bruto.nome), cor: limpaCor(bruto.cor), cor2: limpaCor(bruto.cor2), logo: bruto.logo === true, soLogo: bruto.soLogo === true };
      if (url.nome || url.cor || url.cor2) {
        ['nome', 'cor', 'cor2'].forEach(function (k) { if (url[k]) guardado[k] = url[k]; });
        sessionStorage.setItem('br-perso', JSON.stringify(guardado));
      }
      perso = guardado;
      if (perso.logo) perso.logoImg = localStorage.getItem('br-perso-logo') || '';
    } catch (e) { perso = url; }
    if (!perso || (!perso.nome && !perso.cor && !perso.cor2 && !perso.logoImg)) { perso = null; return; }
    if (perso.nome) aplicarNome(perso.nome);
    if (HEX.test(perso.cor || '')) aplicarCor(perso.cor.charAt(0) === '#' ? perso.cor : '#' + perso.cor);
    if (HEX.test(perso.cor2 || '')) doc.documentElement.style.setProperty('--acc2', perso.cor2.charAt(0) === '#' ? perso.cor2 : '#' + perso.cor2);
    if (/^data:image\/(png|jpeg|webp);base64,[a-z0-9+\/=]+$/i.test(perso.logoImg || '')) aplicarLogo(perso.logoImg, !!perso.soLogo);
    ajustarCabecalho();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(ajustarCabecalho);
    var tAj; window.addEventListener('resize', function () { clearTimeout(tAj); tAj = setTimeout(ajustarCabecalho, 150); });
  })();

  // com nome ou logo maiores, o menu pode quebrar de linha: aperta o espaçamento e, se preciso, deixa só a logo
  function ajustarCabecalho() {
    var nav = $('.hd-nav');
    if (!nav || !nav.offsetParent) return;
    var quebra = function () {
      return $$('a', nav).some(function (a) { var r = doc.createRange(); r.selectNodeContents(a); var t = {}; [].forEach.call(r.getClientRects(), function (x) { t[Math.round(x.top)] = 1; }); return Object.keys(t).length > 1; });
    };
    var ruim = function () { return quebra() || doc.documentElement.scrollWidth > window.innerWidth + 1; };
    body.classList.remove('nav-aperta', 'nav-so-logo');
    if (!ruim()) return;
    body.classList.add('nav-aperta');
    if (ruim() && $('.logo.com-logo')) body.classList.add('nav-so-logo');
  }

  function aplicarLogo(src, soLogo) {
    $$('.logo').forEach(function (a) {
      var img = doc.createElement('img');
      img.className = 'logo-img'; img.src = src; img.alt = soLogo ? (MARCA || '') : '';
      var mark = $('.logo-mark', a);
      if (mark) mark.replaceWith(img); else a.insertBefore(img, a.firstChild);
      a.classList.add('com-logo');
      if (soLogo) a.classList.add('so-logo');
    });
    var fav = $('link[rel="icon"]');
    if (fav) fav.href = src;
    body.classList.add('tem-logo');
    analisarLogo(src);
  }

  // logo sem fundo aparece solta; escura sobre fundo escuro vira a versão branca (e clara sobre claro, a preta);
  // só ganha plaquinha quando a imagem ainda tem fundo próprio (foto, fundo variado)
  var infoLogo = null;
  function analisarLogo(src) {
    var im = new Image();
    im.onload = function () {
      try {
        var W = Math.min(160, im.naturalWidth || 160), H = Math.max(1, Math.round(W * (im.naturalHeight || 1) / (im.naturalWidth || 1)));
        var c = doc.createElement('canvas'); c.width = W; c.height = H;
        var ctx = c.getContext('2d'); ctx.drawImage(im, 0, 0, W, H);
        var p = ctx.getImageData(0, 0, W, H).data, borda = 0, transp = 0, soma = 0, peso = 0, x, y, i;
        for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
          i = (y * W + x) * 4;
          if (x === 0 || y === 0 || x === W - 1 || y === H - 1) { borda++; if (p[i + 3] < 24) transp++; }
          if (p[i + 3] > 24) { var a = p[i + 3] / 255; soma += a * (0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]) / 255; peso += a; }
        }
        infoLogo = { solta: transp >= borda * 0.6, luz: peso ? soma / peso : 0.5, orig: src };
        // versões de uma cor só: o escuro vira a cor e o claro fica vazado (como a marca faz em fundo invertido)
        var mono = function (r, g, bl, claroVira) {
          var k = doc.createElement('canvas'); k.width = im.naturalWidth; k.height = im.naturalHeight;
          var kx = k.getContext('2d'); kx.drawImage(im, 0, 0);
          var dd = kx.getImageData(0, 0, k.width, k.height), q = dd.data;
          for (var j = 0; j < q.length; j += 4) {
            var l = (0.2126 * q[j] + 0.7152 * q[j + 1] + 0.0722 * q[j + 2]) / 255;
            var f = claroVira ? l : 1 - l;
            q[j + 3] = Math.round(q[j + 3] * Math.min(1, Math.max(0, (f - 0.12) / 0.6)));
            q[j] = r; q[j + 1] = g; q[j + 2] = bl;
          }
          kx.putImageData(dd, 0, 0);
          return k.toDataURL('image/png');
        };
        if (infoLogo.solta) { infoLogo.branca = mono(255, 255, 255, false); infoLogo.preta = mono(17, 20, 28, true); }
      } catch (e) { infoLogo = { solta: false, luz: 0.5 }; }
      tomLogo();
    };
    im.src = src;
  }
  function luzCor(cor) {
    var m = String(cor).match(/[\d.]+/g); if (!m || m.length < 3) return 0;
    return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
  }
  function tomLogo() {
    if (!infoLogo) return;
    $$('.logo-img').forEach(function (img) {
      var fundoEscuro = luzCor(getComputedStyle(img.parentNode).color) > 0.6;
      var tom = !infoLogo.solta ? 'caixa' : (fundoEscuro && infoLogo.luz < 0.36 ? 'branca' : (!fundoEscuro && infoLogo.luz > 0.86 ? 'preta' : ''));
      ['caixa', 'branca', 'preta'].forEach(function (k) { img.classList.toggle(k, tom === k); });
      var alvo = tom === 'branca' ? infoLogo.branca : (tom === 'preta' ? infoLogo.preta : infoLogo.orig);
      if (alvo && img.getAttribute('src') !== alvo) img.src = alvo;
      img.classList.toggle('sobre-escuro', fundoEscuro);
    });
  }
  (function () {
    var hd = $('.hd'), espera;
    if (hd && 'MutationObserver' in window) new MutationObserver(function () { clearTimeout(espera); espera = setTimeout(tomLogo, 320); }).observe(hd, { attributes: true, attributeFilter: ['class'] });
  })();

  function aplicarNome(nome) {
    var apelidos = [];
    try { apelidos = JSON.parse(body.getAttribute('data-apelidos') || '[]'); } catch (e) {}
    if (apelidos.indexOf(MARCA_ORIGINAL) < 0) apelidos.push(MARCA_ORIGINAL);
    apelidos.sort(function (a, b) { return b.length - a.length; });
    var re = new RegExp(apelidos.map(function (a) { return a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|'), 'g');
    var troca = function (s) { return s.replace(re, nome); };
    var w = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { var p = n.parentNode; return p && /SCRIPT|STYLE/.test(p.nodeName) || (p.closest && p.closest('[data-br-pill]')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
    var nos = []; while (w.nextNode()) nos.push(w.currentNode);
    nos.forEach(function (n) { if (re.test(n.nodeValue)) { re.lastIndex = 0; n.nodeValue = troca(n.nodeValue); } re.lastIndex = 0; });
    $$('[alt],[aria-label],[title],[placeholder],[data-wa],[data-quiz]').forEach(function (el) {
      ['alt', 'aria-label', 'title', 'placeholder', 'data-wa', 'data-quiz'].forEach(function (a) { var v = el.getAttribute(a); if (v && re.test(v)) { re.lastIndex = 0; el.setAttribute(a, a === 'data-quiz' ? v.replace(re, JSON.stringify(nome).slice(1, -1)) : troca(v)); } re.lastIndex = 0; });
    });
    doc.title = troca(doc.title);
    MARCA = nome;
    body.setAttribute('data-marca', nome);
    // iniciais no ícone da aba
    var fav = $('link[rel="icon"]');
    if (fav) fav.href = fav.href.replace(/%3E[^%]%3C%2Ftext%3E/, '%3E' + encodeURIComponent(nome.charAt(0).toUpperCase()) + '%3C%2Ftext%3E');
  }
  function aplicarCor(hex) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    var mix = function (c, alvo, p) { return Math.round(c + (alvo - c) * p); };
    var claro = 'rgb(' + mix(r, 255, 0.45) + ',' + mix(g, 255, 0.45) + ',' + mix(b, 255, 0.45) + ')';
    var st = doc.documentElement.style;
    st.setProperty('--acc', hex); st.setProperty('--acc2', claro); st.setProperty('--acc-ink', lum > 0.62 ? '#141414' : '#ffffff');
  }

  // =============================================================
  // SIMULAÇÃO DO WHATSAPP (substitui o envio real)
  // =============================================================
  var sim = null;
  function linhaDe(msg, chaves) {
    var m = null;
    chaves.some(function (k) { var re = new RegExp('•\\s*' + k + ':\\s*(.+)', 'i'); var x = msg.match(re); if (x) { m = x[1].trim(); return true; } return false; });
    return m;
  }
  function respostaPara(msg) {
    var nome = linhaDe(msg, ['Nome', 'Name']), primeiro = nome ? nome.split(' ')[0] : '';
    var dia = linhaDe(msg, ['Dia', 'Day']), serv = linhaDe(msg, ['Serviço', 'Service', 'Treatment', 'Tratamento']);
    var total = (msg.match(/(?:Total[^:\n]*|Estimativa|Mensalidade estimada|Monthly estimate|Estimated[^:\n]*):\s*([^\n]+)/i) || [])[1];
    if (dia) {
      return EN
        ? 'Hi' + (primeiro ? ' ' + primeiro : '') + '! ' + (serv ? serv + ' is' : "You're") + ' pre-booked for ' + dia + '. Reply 1 to confirm or 2 to pick another time.'
        : 'Oi' + (primeiro ? ', ' + primeiro : '') + '! ' + (serv ? 'Seu horário de ' + serv.toLowerCase() : 'Seu horário') + ' ficou pré-reservado para ' + dia + '. Responda 1 para confirmar ou 2 para trocar o horário.';
    }
    if (total) {
      return EN
        ? 'Got your estimate (' + total.trim() + '). We have openings tomorrow at 10 am and 3 pm. Which works for you?'
        : 'Recebemos sua simulação (' + total.trim() + '). Temos horários amanhã às 10h e às 15h. Qual fica melhor?';
    }
    return EN
      ? 'Hi! This is the ' + MARCA + ' virtual assistant. How can I help?\n1. Book an appointment\n2. Prices\n3. Talk to the team'
      : 'Olá! Aqui é a assistente virtual da ' + MARCA + '. Como posso ajudar?\n1. Agendar horário\n2. Preços\n3. Falar com a equipe';
  }
  function hora() { var d = new Date(), h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0'); return EN ? ((h % 12) || 12) + ':' + m + (h < 12 ? ' am' : ' pm') : String(h).padStart(2, '0') + ':' + m; }
  function urlQuero() {
    var dest = RAIZ + (EN ? 'clinicas-en.html' : 'index.html') + '?modelo=' + encodeURIComponent(MARCA_ORIGINAL);
    if (perso && perso.nome) dest += '&nome=' + encodeURIComponent(perso.nome);
    return dest + (EN ? '#contact' : '#contato');
  }
  function montarSim() {
    sim = doc.createElement('div');
    sim.className = 'sim'; sim.hidden = true;
    sim.setAttribute('role', 'dialog'); sim.setAttribute('aria-modal', 'true'); sim.setAttribute('aria-labelledby', 'sim-titulo');
    sim.innerHTML = '<div class="sim-caixa"><button type="button" class="sim-x" aria-label="' + TS('fechar') + '"><svg class="ic" aria-hidden="true"><use href="' + RAIZ + 'sites/assets/icones.svg#i-x"/></svg></button>' +
      '<div class="sim-fone"><div class="sim-topo"><span class="sim-av"></span><div><strong class="sim-marca"></strong><small class="sim-status"></small></div></div><div class="sim-chat" aria-live="polite"></div><div class="sim-aviso">' + TS('aviso') + '</div></div>' +
      '<div class="sim-txt"><p class="sim-tag">' + TS('tag') + '</p><h3 id="sim-titulo">' + TS('titulo') + '</h3><p>' + TS('texto') + '</p><a class="btn btn-pri sim-cta" href="#">' + TS('cta') + '</a><button type="button" class="sim-volta">' + TS('fechar') + '</button></div></div>';
    body.appendChild(sim);
    sim.addEventListener('click', function (e) { if (e.target === sim || e.target.closest('.sim-x,.sim-volta')) fecharSim(); });
    $('.sim-cta', sim).addEventListener('click', function () { contar('quero', 'simulacao'); });
  }
  var timers = [], focoAntes = null;
  function fecharSim() { if (!sim || sim.hidden) return; timers.forEach(clearTimeout); sim.hidden = true; body.classList.remove('sim-aberta'); if (focoAntes) focoAntes.focus(); }
  function abrirSim(msg) {
    if (!sim) montarSim();
    timers.forEach(clearTimeout); timers = [];
    focoAntes = doc.activeElement;
    var av = $('.sim-av', sim);
    if (perso && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+\/=]+$/i.test(perso.logoImg || '')) { av.textContent = ''; av.style.backgroundImage = 'url("' + perso.logoImg + '")'; av.classList.add('com-logo'); } else av.textContent = MARCA.charAt(0).toUpperCase();
    $('.sim-marca', sim).textContent = MARCA;
    $('.sim-status', sim).textContent = TS('online');
    $('.sim-cta', sim).href = urlQuero();
    var chat = $('.sim-chat', sim); chat.innerHTML = '';
    var bolha = function (txt, lado, cls) {
      var b = doc.createElement('div'); b.className = 'sim-msg ' + lado + (cls ? ' ' + cls : '');
      b.innerHTML = cls === 'dig' ? '<i></i><i></i><i></i>' : esc(txt).replace(/\n/g, '<br>') + '<span class="sim-h">' + hora() + (lado === 'eu' ? ' <b>✓✓</b>' : '') + '</span>';
      chat.appendChild(b); chat.scrollTop = chat.scrollHeight; return b;
    };
    sim.hidden = false; body.classList.add('sim-aberta');
    $('.sim-x', sim).focus();
    contar('simulacao');
    bolha(msg, 'eu');
    timers.push(setTimeout(function () { $('.sim-status', sim).textContent = TS('digitando'); var d = bolha('', 'ela', 'dig'); timers.push(setTimeout(function () { d.remove(); $('.sim-status', sim).textContent = TS('online'); bolha(respostaPara(msg), 'ela'); }, 1500)); }, 900));
  }
  window.BR_SIM = abrirSim;
  $$('[data-wa]').forEach(function (a) {
    a.removeAttribute('target');
    a.addEventListener('click', function (e) { e.preventDefault(); abrirSim(a.getAttribute('data-wa')); });
  });

  // pílula "Quero um site assim": leva a personalização junto
  var pill = $('[data-br-pill]');
  if (pill) {
    var q = $('[data-quero]', pill);
    if (q) { q.href = urlQuero(); q.addEventListener('click', function () { contar('quero', 'pilula'); }); }
    if (perso) {
      var s = doc.createElement('span'); s.className = 'br-pill-perso';
      s.innerHTML = (EN ? 'Preview for ' : 'Prévia para ') + '<b>' + esc(perso.nome || (EN ? 'your brand' : 'sua marca')) + '</b> · <button type="button">' + (EN ? 'undo' : 'desfazer') + '</button>';
      pill.insertBefore(s, pill.firstChild);
      $('button', s).addEventListener('click', function () { try { sessionStorage.removeItem('br-perso'); localStorage.removeItem('br-perso-logo'); } catch (e) {} location.href = location.pathname; });
    }
  }

  // ---------- idioma ----------
  $$('[data-idioma]').forEach(function (box) {
    var b = $('.idioma-btn', box);
    b.addEventListener('click', function (e) { e.stopPropagation(); var a = box.classList.toggle('aberto'); b.setAttribute('aria-expanded', a); });
    $$('a[data-lang]', box).forEach(function (a) { a.addEventListener('click', function () { try { localStorage.setItem('br-lang', a.getAttribute('data-lang')); } catch (e) {} }); });
  });
  doc.addEventListener('click', function () { $$('[data-idioma].aberto').forEach(function (b) { b.classList.remove('aberto'); $('.idioma-btn', b).setAttribute('aria-expanded', 'false'); }); });

  // ---------- cabeçalho ----------
  var hd = $('[data-hd]');
  function medir() { if (hd) doc.documentElement.style.setProperty('--hd-h', hd.offsetHeight + 'px'); }
  medir(); window.addEventListener('resize', medir);
  function rolar() { if (hd) hd.classList.toggle('rolou', window.scrollY > 40); }
  rolar(); window.addEventListener('scroll', rolar, { passive: true });

  var burger = $('[data-burger]'), gaveta = $('[data-gaveta]');
  function menu(abrir) {
    body.classList.toggle('menu-aberto', abrir);
    if (burger) { burger.setAttribute('aria-expanded', abrir); burger.setAttribute('aria-label', abrir ? T('fecharMenu') : T('abrirMenu')); }
    if (gaveta) gaveta.setAttribute('aria-hidden', !abrir);
  }
  if (burger) burger.addEventListener('click', function () { menu(!body.classList.contains('menu-aberto')); });
  if (gaveta) $$('a', gaveta).forEach(function (a) { a.addEventListener('click', function () { menu(false); }); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') { menu(false); fecharLb(); fecharSim(); } });

  // ---------- entrada ao rolar ----------
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    $$('.rv').forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });
  } else { $$('.rv').forEach(function (el) { el.classList.add('vis'); }); }

  // ---------- contadores ----------
  var animarNumero = function (el) {
    var bruto = String(el.getAttribute('data-count'));
    var alvo = parseFloat(EN ? bruto.replace(/,/g, '') : bruto.replace(/\./g, '').replace(',', '.'));
    if (isNaN(alvo)) return;
    var suf = el.getAttribute('data-suf') || '', ini = performance.now(), dur = 1400;
    var casas = EN ? (bruto.split('.')[1] || '').length : (bruto.split(',')[1] || '').length;
    (function passo(t) {
      var p = Math.min(1, (t - ini) / dur), v = alvo * (1 - Math.pow(1 - p, 3));
      el.textContent = (casas ? v.toLocaleString(LOC, { minimumFractionDigits: casas, maximumFractionDigits: casas }) : Math.round(v).toLocaleString(LOC)) + suf;
      if (p < 1) requestAnimationFrame(passo);
    })(ini);
  };
  if ('IntersectionObserver' in window) {
    var ioc = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { animarNumero(e.target); ioc.unobserve(e.target); } }); }, { threshold: 0.5 });
    $$('[data-count]').forEach(function (el) { ioc.observe(el); });
  }

  // ---------- slider do topo ----------
  $$('[data-slider]').forEach(function (sl) {
    var slides = $$('.slide', sl), dots = $$('.sl-dots button', sl), i = 0, timer;
    function ir(n) {
      slides[i].classList.remove('ativo'); slides[i].setAttribute('aria-hidden', 'true'); dots[i].classList.remove('ativo');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('ativo'); slides[i].setAttribute('aria-hidden', 'false'); dots[i].classList.add('ativo');
    }
    function auto() { clearInterval(timer); timer = setInterval(function () { ir(i + 1); }, 6500); }
    dots.forEach(function (d, n) { d.addEventListener('click', function () { ir(n); auto(); }); });
    var p = $('.sl-prev', sl), nx = $('.sl-next', sl);
    if (p) p.addEventListener('click', function () { ir(i - 1); auto(); });
    if (nx) nx.addEventListener('click', function () { ir(i + 1); auto(); });
    var x0 = null;
    sl.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    sl.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) { ir(i + (dx < 0 ? 1 : -1)); auto(); } x0 = null; });
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) auto();
  });

  // ---------- carrossel ----------
  $$('[data-carrossel]').forEach(function (c) {
    var t = $('.car-trilho', c);
    var passo = function () { var f = t.firstElementChild; return f ? f.getBoundingClientRect().width + 22 : 300; };
    $('.car-prev', c).addEventListener('click', function () { t.scrollBy({ left: -passo(), behavior: 'smooth' }); });
    $('.car-next', c).addEventListener('click', function () {
      if (t.scrollLeft + t.clientWidth >= t.scrollWidth - 8) t.scrollTo({ left: 0, behavior: 'smooth' });
      else t.scrollBy({ left: passo(), behavior: 'smooth' });
    });
  });

  // ---------- lightbox ----------
  var lb = $('[data-lb-box]');
  function fecharLb() { if (lb && !lb.hidden) { lb.hidden = true; body.style.overflow = ''; } }
  $$('[data-lb]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!lb) return;
      var im = $('img', lb); im.src = b.getAttribute('data-lb'); im.alt = ($('img', b) || {}).alt || '';
      lb.hidden = false; body.style.overflow = 'hidden'; $('.lb-x', lb).focus();
    });
  });
  if (lb) lb.addEventListener('click', function (e) { if (e.target === lb || e.target.closest('.lb-x')) fecharLb(); });

  // ---------- abas ----------
  function abas(botoes, paineis) {
    botoes.forEach(function (b, n) {
      b.addEventListener('click', function () {
        botoes.forEach(function (x, k) { x.classList.toggle('ativo', k === n); x.setAttribute('aria-selected', k === n); });
        paineis.forEach(function (p, k) { p.classList.toggle('ativo', k === n); });
      });
    });
  }
  $$('[data-abas]').forEach(function (r) { abas($$('.abas-lista button', r), $$('.aba-painel', r)); });
  $$('[data-corpo]').forEach(function (r) { abas($$('.corpo-regioes button', r), $$('.corpo-painel', r)); });

  // ---------- preço mensal x anual ----------
  $$('[data-periodo]').forEach(function (t) {
    var sec = t.closest('section');
    $$('button', t).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('button', t).forEach(function (x) { x.classList.toggle('ativo', x === b); });
        var k = b.getAttribute('data-p');
        $$('[data-a]', sec).forEach(function (el) { el.textContent = el.getAttribute('data-' + k); });
      });
    });
  });

  // ---------- filtro de unidades ----------
  var semAcento = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); };
  $$('[data-filtro]').forEach(function (f) {
    var sec = f.closest('section'), cards = $$('[data-lista-filtro] > *', sec), vazio = $('.filtro-vazio', sec);
    var atual = '*', termo = '';
    function aplicar() {
      var n = 0;
      cards.forEach(function (c) {
        var ok = (atual === '*' || c.getAttribute('data-f') === atual) && (!termo || semAcento(c.getAttribute('data-txt')).indexOf(termo) > -1);
        c.hidden = !ok; if (ok) n++;
      });
      if (vazio) vazio.hidden = n > 0;
    }
    $$('.filtro-chips button', f).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.filtro-chips button', f).forEach(function (x) { x.classList.toggle('ativo', x === b); });
        atual = b.getAttribute('data-f'); aplicar();
      });
    });
    var busca = $('[data-busca]', f);
    if (busca) busca.addEventListener('input', function () { termo = semAcento(busca.value); aplicar(); });
  });

  // ---------- newsletter ----------
  $$('[data-news]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var inp = $('input', f), msg = $('.form-msg', f);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inp.value.trim())) { msg.className = 'form-msg'; msg.textContent = T('emailRuim'); inp.focus(); return; }
      msg.className = 'form-msg ok'; msg.textContent = T('emailOk'); inp.value = '';
    });
  });

  // ---------- cookies ----------
  var ck = $('[data-cookies]');
  if (ck) {
    var visto = null; try { visto = localStorage.getItem('br-cookies-' + SLUG); } catch (e) {}
    if (!visto) setTimeout(function () { ck.hidden = false; }, 900);
    $$('[data-ck]', ck).forEach(function (b) { b.addEventListener('click', function () { try { localStorage.setItem('br-cookies-' + SLUG, b.getAttribute('data-ck')); } catch (e) {} ck.hidden = true; }); });
  }

  // =============================================================
  // CALCULADORAS
  // =============================================================
  function resumo(r, linhas, total, nota) {
    var box = $('[data-itens]', r);
    if (box) box.innerHTML = linhas.length ? linhas.map(function (l) { return '<div class="ri' + (l[2] ? ' desc' : '') + '"><span>' + esc(l[0]) + '</span><span>' + l[1] + '</span></div>'; }).join('') : '<p class="vazio">' + T('nada') + '</p>';
    var t = $('[data-total]', r); if (t) t.textContent = dinheiro(total);
    var n = $('[data-nota]', r); if (n) n.textContent = nota || '';
  }
  function enviar(r, fnMsg) {
    var b = $('[data-enviar]', r);
    if (!b) return;
    b.removeAttribute('target');
    b.addEventListener('click', function (e) {
      e.preventDefault();
      var m = fnMsg();
      if (!m) { b.classList.add('tremer'); setTimeout(function () { b.classList.remove('tremer'); }, 500); return; }
      abrirSim(m);
    });
  }
  var duracao = function (m) { var h = Math.floor(m / 60), r = m % 60; return h ? (EN ? h + 'h' + (r ? ' ' + r + 'm' : '') : h + 'h' + (r ? String(r).padStart(2, '0') : '')) : r + ' min'; };
  var L2 = function (pt, en) { return EN ? en : pt; };

  var CALC = {
    servicos: function (r) {
      var caixas = $$('input[type=checkbox]', r), dur = $('[data-dur]', r);
      function calc() {
        var sel = caixas.filter(function (c) { return c.checked; }), tot = 0, d = 0;
        var linhas = sel.map(function (c) { tot += +c.dataset.p; d += +c.dataset.d || 0; return [c.dataset.n, dinheiro(+c.dataset.p)]; });
        resumo(r, linhas, tot);
        if (dur) { dur.hidden = !d; dur.textContent = L2('Tempo estimado no atendimento: ', 'Estimated time: ') + duracao(d); }
        return { sel: sel, tot: tot, d: d };
      }
      caixas.forEach(function (c) { c.addEventListener('change', calc); }); calc();
      enviar(r, function () {
        var x = calc(); if (!x.sel.length) return '';
        return L2('Olá! Montei meu orçamento no site:', 'Hi! I put together a quote on your website:') + '\n' + x.sel.map(function (c) { return '• ' + c.dataset.n + ' (' + dinheiro(+c.dataset.p) + ')'; }).join('\n') + '\n' + L2('Total estimado: ', 'Estimated total: ') + dinheiro(x.tot) + (x.d ? '\n' + L2('Tempo estimado: ', 'Estimated time: ') + duracao(x.d) : '') + '\n' + L2('Qual o próximo horário disponível?', "What's the next available time?");
      });
    },
    sessoes: function (r) {
      var sel = $('[data-trat]', r), rg = $('[data-sess]', r), v = $('[data-sess-v]', r), sug = $('[data-sugestao]', r), faixas = $$('.faixas span', r), extras = $$('input[data-x]', r);
      function calc() {
        var op = sel.options[sel.selectedIndex], p = +sel.value, n = +rg.value, desc = 0;
        v.textContent = n;
        faixas.forEach(function (f) { if (n >= +f.dataset.min) desc = +f.dataset.desc; });
        faixas.forEach(function (f) { f.classList.toggle('ativo', +f.dataset.desc === desc && desc > 0); });
        var bruto = p * n, off = bruto * desc / 100, ex = 0, linhas = [[op.dataset.n + ' × ' + n, dinheiro(bruto)]];
        if (off) linhas.push([L2('Desconto do pacote (', 'Package discount (') + desc + '%)', '− ' + dinheiro(off), 1]);
        extras.forEach(function (e) { if (e.checked) { ex += +e.dataset.x; linhas.push([e.dataset.n, dinheiro(+e.dataset.x)]); } });
        var tot = bruto - off + ex;
        resumo(r, linhas, tot, L2('Equivale a ', 'That is ') + dinheiro((bruto - off) / n) + L2(' por sessão', ' per session'));
        sug.textContent = EN ? 'Usual protocol for ' + op.dataset.n.toLowerCase() + ': ' + op.dataset.s + ' sessions (set at your assessment).' : 'Protocolo mais indicado para ' + op.dataset.n.toLowerCase() + ': ' + op.dataset.s + ' sessões (definido na avaliação).';
        return { op: op, n: n, tot: tot, desc: desc };
      }
      sel.addEventListener('change', function () { rg.value = sel.options[sel.selectedIndex].dataset.s; calc(); });
      rg.addEventListener('input', calc); extras.forEach(function (e) { e.addEventListener('change', calc); });
      rg.value = sel.options[0].dataset.s; calc();
      enviar(r, function () { var x = calc(); return EN ? 'Hi! I simulated a package on your website:\n• ' + x.op.dataset.n + ' — ' + x.n + ' sessions' + (x.desc ? ' (' + x.desc + '% off)' : '') + '\nEstimated total: ' + dinheiro(x.tot) + '\nI would like to book the assessment.' : 'Olá! Simulei um pacote no site:\n• ' + x.op.dataset.n + ' — ' + x.n + ' sessões' + (x.desc ? ' (' + x.desc + '% de desconto)' : '') + '\nTotal estimado: ' + dinheiro(x.tot) + '\nQuero agendar a avaliação.'; });
    },
    plano: function (r) {
      var planos = $$('input[name^="plano"]', r), pers = $$('input[name^="per"]', r), extras = $$('input[data-x]', r);
      function calc() {
        var p = planos.filter(function (x) { return x.checked; })[0], per = pers.filter(function (x) { return x.checked; })[0];
        var meses = +per.value, desc = +per.dataset.desc, base = +p.value, ex = 0, mes = L2('/mês', '/mo'), linhas = [[p.dataset.n, dinheiro(base) + mes]];
        extras.forEach(function (e) { if (e.checked) { ex += +e.dataset.x; linhas.push([e.dataset.n, '+ ' + dinheiro(+e.dataset.x) + mes]); } });
        var mensal = (base + ex) * (1 - desc / 100);
        if (desc) linhas.push([L2('Desconto ', 'Discount ') + per.dataset.n.toLowerCase() + ' (' + desc + '%)', '− ' + dinheiro((base + ex) * desc / 100) + mes, 1]);
        resumo(r, linhas, mensal * meses, meses > 1 ? L2('Total em ' + meses + ' meses', 'Total over ' + meses + ' months') : L2('Valor do primeiro mês', 'First month'));
        var m = $('[data-mensal]', r); if (m) m.textContent = dinheiro(mensal);
        return { p: p, per: per, mensal: mensal, ex: extras.filter(function (e) { return e.checked; }) };
      }
      $$('input', r).forEach(function (i) { i.addEventListener('change', calc); }); calc();
      enviar(r, function () { var x = calc(); var ad = x.ex.map(function (e) { return e.dataset.n; }).join(', '); return EN ? 'Hi! I simulated my plan on your website:\n• Plan: ' + x.p.dataset.n + '\n• Commitment: ' + x.per.dataset.n + (ad ? '\n• Add-ons: ' + ad : '') + '\nMonthly estimate: ' + dinheiro(x.mensal) + '\nI want to get started.' : 'Olá! Simulei meu plano no site:\n• Plano: ' + x.p.dataset.n + '\n• Fidelidade: ' + x.per.dataset.n + (ad ? '\n• Adicionais: ' + ad : '') + '\nMensalidade estimada: ' + dinheiro(x.mensal) + '\nQuero começar.'; });
    },
    rescisao: function (r) {
      var fim = $('[data-fim]', r); if (!fim.value) fim.value = new Date().toISOString().slice(0, 10);
      function calc() {
        var sal = +$('[data-sal]', r).value || 0, mot = $('[data-motivo]', r).value, ini = new Date($('[data-ini]', r).value), f = new Date(fim.value);
        var aviso = $('[data-aviso]', r).checked, venc = $('[data-venc]', r).checked;
        if (!(ini < f)) { resumo(r, [], 0, 'Confira as datas de admissão e saída.'); return null; }
        var meses = (f.getFullYear() - ini.getFullYear()) * 12 + (f.getMonth() - ini.getMonth()) + (f.getDate() >= ini.getDate() ? 0 : -1);
        var anos = Math.floor(meses / 12), dia = f.getDate();
        var saldo = sal / 30 * dia, linhas = [['Saldo de salário (' + dia + ' dias)', dinheiroC(saldo)]], tot = saldo;
        var avisoDias = Math.min(90, 30 + 3 * anos), mesesAno = (f.getMonth() + 1) - (f.getDate() < 15 ? 1 : 0);
        var mesesFerias = (meses % 12) + (f.getDate() >= 15 ? 1 : 0);
        if (mot !== 'justa') {
          var dec = sal / 12 * Math.max(0, mesesAno); linhas.push(['13º proporcional (' + Math.max(0, mesesAno) + '/12)', dinheiroC(dec)]); tot += dec;
          var fer = sal / 12 * Math.min(12, mesesFerias) * 4 / 3; linhas.push(['Férias proporcionais + 1/3', dinheiroC(fer)]); tot += fer;
        }
        if (venc) { var fv = sal * 4 / 3; linhas.push(['Férias vencidas + 1/3', dinheiroC(fv)]); tot += fv; }
        if ((mot === 'sem' || mot === 'acordo') && aviso) { var av = sal / 30 * avisoDias * (mot === 'acordo' ? 0.5 : 1); linhas.push(['Aviso prévio indenizado (' + avisoDias + ' dias' + (mot === 'acordo' ? ', 50%' : '') + ')', dinheiroC(av)]); tot += av; }
        var fgts = sal * 0.08 * meses;
        if (mot === 'sem') { linhas.push(['Multa de 40% do FGTS (estimada)', dinheiroC(fgts * 0.4)]); tot += fgts * 0.4; }
        if (mot === 'acordo') { linhas.push(['Multa de 20% do FGTS (estimada)', dinheiroC(fgts * 0.2)]); tot += fgts * 0.2; }
        var nota = mot === 'sem' ? 'Saque do FGTS: cerca de ' + dinheiro(fgts) + ' depositados + seguro-desemprego, se cumprir os requisitos.' : mot === 'acordo' ? 'No acordo, é possível sacar até 80% do FGTS (sem seguro-desemprego).' : mot === 'pedido' ? 'No pedido de demissão não há multa nem saque do FGTS.' : 'Na justa causa ficam só saldo de salário e férias vencidas.';
        resumo(r, linhas, tot, nota);
        return { tot: tot, mot: $('[data-motivo]', r).selectedOptions[0].textContent, meses: meses };
      }
      $$('input,select', r).forEach(function (i) { i.addEventListener('input', calc); i.addEventListener('change', calc); }); calc();
      enviar(r, function () { var x = calc(); if (!x) return ''; return 'Olá! Fiz a simulação de rescisão no site:\n• Motivo: ' + x.mot + '\n• Tempo de casa: ' + x.meses + ' meses\n• Estimativa: ' + dinheiro(x.tot) + '\nQuero que um advogado confira meus direitos.'; });
    },
    pensao: function (r) {
      function calc() {
        var renda = +$('[data-renda]', r).value || 0, filhos = +$('[data-filhos]', r).value, gastos = +$('[data-gastos]', r).value || 0, outros = +$('[data-outros]', r).value;
        var minP = Math.max(0.1, 0.15 + (filhos - 1) * 0.07 - outros * 0.03), maxP = Math.min(0.5, 0.3 + (filhos - 1) * 0.08 - outros * 0.04);
        var a = renda * minP, b = renda * maxP;
        resumo(r, [['Faixa usual sobre a renda', Math.round(minP * 100) + '% a ' + Math.round(maxP * 100) + '%'], ['Valor mínimo de referência', dinheiro(a)], ['Valor máximo de referência', dinheiro(b)], ['Metade dos gastos informados', dinheiro(gastos * filhos / 2)]], (a + b) / 2, 'O juiz equilibra a necessidade de quem recebe e a possibilidade de quem paga. Não existe percentual fixo em lei.');
        return { a: a, b: b, filhos: filhos };
      }
      $$('input,select', r).forEach(function (i) { i.addEventListener('input', calc); }); calc();
      enviar(r, function () { var x = calc(); return 'Olá! Fiz a simulação de pensão no site (' + x.filhos + ' filho(s)). A faixa ficou entre ' + dinheiro(x.a) + ' e ' + dinheiro(x.b) + '. Quero orientação sobre o meu caso.'; });
    },
    horas: function (r) {
      function calc() {
        var taxa = +$('[data-taxa-h]', r).value || 0, sem = +$('[data-semana]', r).value || 0, semanas = +$('[data-semanas]', r).value || 0, sp = +$('[data-sem-pago]', r).value || 0, dobro = $('[data-dobro]', r).checked;
        var extra = Math.max(0, sem - 40), ot = extra * taxa * 1.5 * semanas, base = sp * taxa, linhas = [];
        linhas.push(['Overtime: ' + extra + ' h/week × ' + semanas + ' weeks × 1.5', dinheiroC(ot)]);
        if (base) linhas.push(['Unpaid regular hours (' + sp + ' h)', dinheiroC(base)]);
        var tot = ot + base;
        if (dobro && tot) { linhas.push(['Liquidated damages (equal amount)', dinheiroC(tot)]); tot *= 2; }
        resumo(r, linhas, tot, 'Federal law requires 1.5× pay for hours over 40 a week for most hourly workers. State rules may add more.');
        return { tot: tot, extra: extra, semanas: semanas };
      }
      $$('input', r).forEach(function (i) { i.addEventListener('input', calc); i.addEventListener('change', calc); }); calc();
      enviar(r, function () { var x = calc(); return 'Hi! I used the back pay calculator on your website:\n• ' + x.extra + ' overtime hours a week for ' + x.semanas + ' weeks\n• Estimated total: ' + dinheiro(x.tot) + '\nI would like a free case review.'; });
    },
    childsupport: function (r) {
      var PCT = [0, 0.2, 0.25, 0.29, 0.31];
      function calc() {
        var a = +$('[data-renda-a]', r).value || 0, b = +$('[data-renda-b]', r).value || 0, f = +$('[data-filhos]', r).value, noites = +$('[data-noites]', r).value || 0;
        var comb = a + b, basic = comb * PCT[f], partA = comb ? a / comb : 0, oblig = basic * partA;
        var ajuste = noites >= 110 ? 1 - Math.min(0.5, (noites - 110) / 255 * 0.5) : 1, pag = oblig * ajuste;
        resumo(r, [['Combined net income', dinheiro(comb)], ['Basic obligation (' + Math.round(PCT[f] * 100) + '%)', dinheiro(basic)], ['Your share of income', Math.round(partA * 100) + '%'], ['Parenting-time adjustment', Math.round((1 - ajuste) * 100) + '% off']], pag, 'Every state uses its own guideline. This is an income-shares estimate to prepare for a consultation.');
        return { pag: pag, f: f };
      }
      $$('input,select', r).forEach(function (i) { i.addEventListener('input', calc); i.addEventListener('change', calc); }); calc();
      enviar(r, function () { var x = calc(); return 'Hi! I used the child support estimator on your website (' + x.f + ' child' + (x.f > 1 ? 'ren' : '') + '). The estimate was ' + dinheiro(x.pag) + ' per month. I would like advice on my case.'; });
    },
    imc: function (r) {
      function calc() {
        var p = +$('[data-peso]', r).value, a = +$('[data-alt]', r).value, id = +$('[data-idade]', r).value, sx = $('[data-sexo]', r).value, at = +$('[data-ativ]', r).value, ob = +$('[data-obj]', r).value;
        if (!p || !a) return null;
        var kg = EN ? p * 0.4536 : p, cm = EN ? a * 2.54 : a;
        var imc = kg / Math.pow(cm / 100, 2);
        var cat = imc < 18.5 ? L2('Abaixo do peso', 'Underweight') : imc < 25 ? L2('Peso adequado', 'Healthy weight') : imc < 30 ? L2('Sobrepeso', 'Overweight') : L2('Obesidade', 'Obesity');
        var tdee = (10 * kg + 6.25 * cm - 5 * id + (sx === 'm' ? 5 : -161)) * at, meta = tdee + ob;
        $('[data-imc]', r).textContent = imc.toLocaleString(LOC, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
        $('[data-imc-cat]', r).textContent = cat;
        $('[data-tdee]', r).textContent = Math.round(tdee).toLocaleString(LOC);
        $('[data-meta]', r).textContent = Math.round(meta).toLocaleString(LOC);
        $('[data-meta-cat]', r).textContent = ob < 0 ? L2('para emagrecer com segurança', 'to lose fat safely') : ob > 0 ? L2('para ganhar massa', 'to build muscle') : L2('para manter o peso', 'to maintain weight');
        return { imc: imc, cat: cat, meta: meta, obj: $('[data-obj]', r).selectedOptions[0].textContent };
      }
      $$('input,select', r).forEach(function (i) { i.addEventListener('input', calc); }); calc();
      enviar(r, function () { var x = calc(); if (!x) return ''; var v = x.imc.toLocaleString(LOC, { maximumFractionDigits: 1 }); return EN ? 'Hi! I used the calculator on your website: BMI ' + v + ' (' + x.cat + '), target of ' + Math.round(x.meta) + ' kcal/day. Goal: ' + x.obj.toLowerCase() + '. I want a training plan.' : 'Olá! Calculei no site: IMC ' + v + ' (' + x.cat + '), meta de ' + Math.round(x.meta) + ' kcal/dia. Objetivo: ' + x.obj.toLowerCase() + '. Quero um plano de treino.'; });
    },
    roi: function (r) {
      function calc() {
        var tk = +$('[data-ticket]', r).value || 0, at = +$('[data-atend]', r).value || 0, c = +$('[data-cad]', r).value || 1, o = +$('[data-ocup]', r).value;
        var atual = tk * at, pot = tk * (at / o) * 0.8, gap = Math.max(0, pot - atual);
        $('[data-atual]', r).textContent = dinheiro(atual); $('[data-pot]', r).textContent = dinheiro(pot); $('[data-gap]', r).textContent = dinheiro(gap);
        return { atual: atual, gap: gap, c: c };
      }
      $$('input,select', r).forEach(function (i) { i.addEventListener('input', calc); }); calc();
      enviar(r, function () { var x = calc(); return EN ? 'Hi! I ran the simulation: my salon makes about ' + dinheiro(x.atual) + '/month with ' + x.c + ' chairs and has ' + dinheiro(x.gap) + ' of idle revenue. I want the diagnosis.' : 'Olá! Simulei no site: meu salão fatura cerca de ' + dinheiro(x.atual) + '/mês com ' + x.c + ' cadeiras e tem ' + dinheiro(x.gap) + ' de receita parada. Quero o diagnóstico.'; });
    },
    franquia: function (r) {
      var mods = JSON.parse($('[data-modelos]', r).getAttribute('data-modelos'));
      function calc() {
        var m = mods[+$('input[name=modelo]:checked', r).value];
        $('[data-inv]', r).textContent = m.inv; $('[data-eq]', r).textContent = m.eq; $('[data-prazo]', r).textContent = m.prazo;
        return { m: m, cidade: $('[data-cidade]', r).value.trim(), cap: $('[data-capital]', r).value };
      }
      $$('input,select', r).forEach(function (i) { i.addEventListener('input', calc); i.addEventListener('change', calc); }); calc();
      enviar(r, function () { var x = calc(); return EN ? 'Hi! I am interested in the ' + x.m.n + ' model' + (x.cidade ? ' in ' + x.cidade : '') + '. Available capital: ' + x.cap + '. I want to talk to the expansion team.' : 'Olá! Tenho interesse no modelo ' + x.m.n + (x.cidade ? ' em ' + x.cidade : '') + '. Capital disponível: ' + x.cap + '. Quero falar com a expansão.'; });
    },
    empresa: function (r) {
      function calc() {
        var p = +$('[data-pessoas]', r).value || 0, f = +$('[data-freq]', r).value, linhas = [], tot = 0;
        $$('input[data-x]', r).forEach(function (e) { if (e.checked) { var v = +e.dataset.x * p; tot += v; linhas.push([e.dataset.n + ' × ' + p, dinheiro(v)]); } });
        var desc = p >= 80 ? 12 : p >= 40 ? 8 : 0;
        if (desc && tot) { linhas.push([L2('Desconto por volume (', 'Volume discount (') + desc + '%)', '− ' + dinheiro(tot * desc / 100), 1]); tot *= 1 - desc / 100; }
        resumo(r, linhas, tot * f, f > 1 ? L2('Por mês, com ' + f + ' ações (' + dinheiro(tot) + ' cada)', 'Per month, ' + f + ' events (' + dinheiro(tot) + ' each)') : L2('Valor da ação', 'Event total'));
        return { p: p, tot: tot * f, f: $('[data-freq]', r).selectedOptions[0].textContent, s: $$('input[data-x]:checked', r).map(function (e) { return e.dataset.n; }) };
      }
      $$('input,select', r).forEach(function (i) { i.addEventListener('input', calc); i.addEventListener('change', calc); }); calc();
      enviar(r, function () { var x = calc(); if (!x.s.length) return ''; return EN ? 'Hi! I want a corporate proposal:\n• ' + x.p + ' employees\n• Services: ' + x.s.join(', ') + '\n• Frequency: ' + x.f + '\nEstimate: ' + dinheiro(x.tot) : 'Olá! Quero uma proposta corporativa:\n• ' + x.p + ' colaboradores\n• Serviços: ' + x.s.join(', ') + '\n• Frequência: ' + x.f + '\nEstimativa: ' + dinheiro(x.tot); });
    },
    deslocamento: function (r) {
      var zona = $('[data-zona]', r);
      function calc() {
        var taxa = +zona.value, tot = taxa, d = 0, linhas = [];
        var sel = $$('input[type=checkbox]', r).filter(function (c) { return c.checked; });
        sel.forEach(function (c) { tot += +c.dataset.p; d += +c.dataset.d || 0; linhas.push([c.dataset.n, dinheiro(+c.dataset.p)]); });
        $('[data-taxa]', r).textContent = taxa ? dinheiro(taxa) : T('grátis');
        resumo(r, linhas, sel.length ? tot : 0, d ? L2('Duração estimada: ', 'Estimated duration: ') + duracao(d) : '');
        return { sel: sel, tot: tot, b: zona.selectedOptions[0].textContent };
      }
      $$('input,select', r).forEach(function (i) { i.addEventListener('change', calc); }); calc();
      enviar(r, function () { var x = calc(); if (!x.sel.length) return ''; return L2('Olá! Quero atendimento em casa:\n• Bairro: ', 'Hi! I want an at-home appointment:\n• Neighborhood: ') + x.b + '\n' + x.sel.map(function (c) { return '• ' + c.dataset.n; }).join('\n') + '\n' + L2('Total com deslocamento: ', 'Total with travel: ') + dinheiro(x.tot); });
    },
    gift: function (r) {
      var outro = $('[data-outro]', r);
      function calc() {
        $('[data-marca]', r).textContent = MARCA;
        var v = $('input[name=vale]:checked', r).value; outro.hidden = v !== 'outro';
        var val = v === 'outro' ? (+$('[data-outro-v]', r).value || 0) : +v;
        var para = $('[data-para]', r).value.trim(), de = $('[data-de]', r).value.trim(), msg = $('[data-msg]', r).value.trim();
        $('[data-total]', r).textContent = dinheiro(val);
        $('[data-gc-para]', r).textContent = T('para') + ': ' + (para || '—') + (de ? ' · ' + T('deCard') + ': ' + de : '');
        $('[data-gc-msg]', r).textContent = msg ? '“' + msg + '”' : '';
        return { val: val, para: para, de: de, msg: msg };
      }
      $$('input,textarea', r).forEach(function (i) { i.addEventListener('input', calc); i.addEventListener('change', calc); }); calc();
      enviar(r, function () { var x = calc(); if (!x.para) { $('[data-para]', r).focus(); return ''; } return L2('Olá! Quero um vale-presente de ', "Hi! I'd like a gift card of ") + dinheiro(x.val) + '\n• ' + T('para') + ': ' + x.para + (x.de ? '\n• ' + T('deCard') + ': ' + x.de : '') + (x.msg ? '\n• ' + L2('Mensagem', 'Message') + ': ' + x.msg : ''); });
    },
    laser: function (r) {
      var pac = 1, botoes = $$('[data-pacote] button', r), desc = { 1: 0, 5: 15, 10: 25 };
      function calc() {
        var sel = $$('input[type=checkbox]', r).filter(function (c) { return c.checked; }), soma = 0, linhas = [];
        sel.forEach(function (c) { soma += +c.dataset.p; linhas.push([c.dataset.n, dinheiro(+c.dataset.p) + L2('/sessão', '/session')]); });
        var bruto = soma * pac, off = bruto * desc[pac] / 100;
        if (pac > 1 && soma) { linhas.push([pac + L2(' sessões', ' sessions'), dinheiro(bruto)]); linhas.push([L2('Desconto do pacote (', 'Package discount (') + desc[pac] + '%)', '− ' + dinheiro(off), 1]); }
        resumo(r, linhas, bruto - off, sel.length > 2 ? L2('Combinar áreas no mesmo dia reduz o tempo de cada sessão.', 'Combining areas on the same day shortens each session.') : '');
        return { sel: sel, tot: bruto - off };
      }
      botoes.forEach(function (b) { b.addEventListener('click', function () { botoes.forEach(function (x) { x.classList.toggle('ativo', x === b); }); pac = +b.dataset.s; calc(); }); });
      $$('input', r).forEach(function (i) { i.addEventListener('change', calc); }); calc();
      enviar(r, function () { var x = calc(); if (!x.sel.length) return ''; var areas = x.sel.map(function (c) { return c.dataset.n; }).join(', '); return EN ? 'Hi! I simulated laser hair removal on your website:\n• Areas: ' + areas + '\n• ' + (pac > 1 ? pac + '-session package' : 'Single session') + '\nEstimated total: ' + dinheiro(x.tot) + '\nI would like to book the assessment.' : 'Olá! Simulei depilação a laser no site:\n• Áreas: ' + areas + '\n• ' + (pac > 1 ? 'Pacote de ' + pac + ' sessões' : 'Sessão avulsa') + '\nTotal estimado: ' + dinheiro(x.tot) + '\nQuero agendar a avaliação.'; });
    },
  };
  $$('[data-calc]').forEach(function (r) { var f = CALC[r.getAttribute('data-calc')]; if (f) f(r); });

  // =============================================================
  // AGENDA
  // =============================================================
  var DIAS = EN ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  var horaTxt = function (h) { if (!EN) return h; var hh = +h.slice(0, 2), mm = h.slice(3); return (hh % 12 || 12) + ':' + mm + (hh < 12 ? ' am' : ' pm'); };
  $$('[data-agenda]').forEach(function (f) {
    var fechado = (f.getAttribute('data-fechado') || '').split(',').filter(Boolean).map(Number);
    var slots = f.getAttribute('data-slots').split(','), boxD = $('[data-dias]', f), boxH = $('[data-horas]', f), msg = $('.form-msg', f);
    var diaSel = null, horaSel = null, hoje = new Date();
    // ocupação simulada e estável por data, para a agenda parecer viva sem inventar reservas reais
    function ocupado(d, h) { var s = d.getDate() * 31 + d.getMonth() * 7 + h.charCodeAt(0) + h.charCodeAt(1) * 3 + h.charCodeAt(3); return s % 5 === 0; }
    for (var i = 0; i < 14; i++) {
      var d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i);
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'dia';
      b.innerHTML = '<span>' + (i === 0 ? T('hoje') : DIAS[d.getDay()]) + '</span><strong>' + d.getDate() + '</strong><span>' + d.toLocaleDateString(LOC, { month: 'short' }).replace('.', '') + '</span>';
      b.disabled = fechado.indexOf(d.getDay()) > -1; b._d = d;
      b.addEventListener('click', function () {
        $$('.dia', boxD).forEach(function (x) { x.classList.remove('ativo'); }); this.classList.add('ativo'); diaSel = this._d; horaSel = null;
        var agora = new Date(), dd = this._d;
        boxH.innerHTML = '';
        slots.forEach(function (h) {
          var hb = doc.createElement('button'); hb.type = 'button'; hb.className = 'hora'; hb.textContent = horaTxt(h);
          var hh = +h.slice(0, 2), mm = +h.slice(3);
          var passou = dd.toDateString() === agora.toDateString() && (hh < agora.getHours() + 1 || (hh === agora.getHours() + 1 && mm < agora.getMinutes()));
          hb.disabled = passou || ocupado(dd, h);
          hb.addEventListener('click', function () { $$('.hora', boxH).forEach(function (x) { x.classList.remove('ativo'); }); hb.classList.add('ativo'); horaSel = horaTxt(h); });
          boxH.appendChild(hb);
        });
        if (!$$('.hora:not(:disabled)', boxH).length) boxH.innerHTML = '<p class="dica">' + T('semHorario') + '</p>';
      });
      boxD.appendChild(b);
    }
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = f.nome.value.trim(), tel = f.tel.value.replace(/\D/g, ''), serv = f.servico.value;
      $$('.invalido', f).forEach(function (x) { x.classList.remove('invalido'); });
      var erro = !nome ? [f.nome, T('errNome')] : tel.length < 10 ? [f.tel, T('errTel')] : !serv ? [f.servico, T('errServ')] : !diaSel ? [boxD, T('errDia')] : !horaSel ? [boxH, T('errHora')] : null;
      if (erro) { msg.className = 'form-msg'; msg.textContent = erro[1]; if (erro[0].classList) erro[0].classList.add('invalido'); if (erro[0].focus) erro[0].focus(); return; }
      msg.className = 'form-msg ok'; msg.textContent = T('abrindo');
      var semPref = EN ? 'No preference' : 'Sem preferência';
      var extra = (f.prof && f.prof.value !== semPref ? '\n• ' + L2('Profissional', 'Professional') + ': ' + f.prof.value : '') + (f.unidade ? '\n• ' + L2('Unidade', 'Location') + ': ' + f.unidade.value : '') + (f.obs.value.trim() ? '\n• ' + L2('Observação', 'Note') + ': ' + f.obs.value.trim() : '');
      var diaTxt = diaSel.toLocaleDateString(LOC, { weekday: 'long', day: '2-digit', month: EN ? 'short' : '2-digit' });
      abrirSim(L2('Olá! Quero agendar:', 'Hi! I want to book:') + '\n• ' + L2('Nome', 'Name') + ': ' + nome + '\n• ' + L2('Serviço', 'Service') + ': ' + serv + '\n• ' + L2('Dia', 'Day') + ': ' + diaTxt + L2(' às ', ' at ') + horaSel + extra);
    });
  });

  // ---------- formulário genérico ----------
  $$('[data-form-wa]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('.form-msg', f), linhas = [], falta = null;
      $$('input,select,textarea', f).forEach(function (c) {
        c.classList.remove('invalido');
        if (c.type === 'radio' && !c.checked) return;
        if (c.hasAttribute('data-lgpd')) { if (!c.checked && !falta) falta = [c, T('lgpd')]; return; }
        var v = (c.value || '').trim();
        if (c.required && !v && !falta) falta = [c, T('preencha') + c.name];
        if (c.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && !falta) falta = [c, T('confEmail')];
        if (c.type === 'tel' && v && v.replace(/\D/g, '').length < 10 && !falta) falta = [c, T('confTel')];
        if (v) linhas.push('• ' + c.name + ': ' + v);
      });
      if (falta) { msg.className = 'form-msg'; msg.textContent = falta[1]; falta[0].classList.add('invalido'); falta[0].focus(); return; }
      msg.className = 'form-msg ok'; msg.textContent = T('abrindo');
      abrirSim(L2('Olá! ', 'Hi! ') + f.getAttribute('data-form-wa') + ':\n' + linhas.join('\n'));
    });
  });

  // ---------- quiz ----------
  $$('[data-quiz]').forEach(function (q) {
    var dados = JSON.parse(q.getAttribute('data-quiz')), corpo = $('.quiz-corpo', q), barra = $('.quiz-barra span', q), passo = 0, votos = {}, resp = [];
    var seta = '<svg class="ic" aria-hidden="true"><use href="' + RAIZ + 'sites/assets/icones.svg#i-arrow-right"/></svg>';
    function render() {
      barra.style.width = (passo / dados.q.length * 100) + '%';
      if (passo >= dados.q.length) return fim();
      var p = dados.q[passo];
      corpo.innerHTML = '<p class="qn">' + T('pergunta') + ' ' + (passo + 1) + ' ' + T('de') + ' ' + dados.q.length + '</p><h3>' + p.q + '</h3>' + p.o.map(function (o, i) { return '<button type="button" class="quiz-op" data-i="' + i + '"><span>' + o[0] + '</span>' + seta + '</button>'; }).join('') + (passo ? '<button type="button" class="quiz-voltar">' + T('voltar') + '</button>' : '');
      $$('.quiz-op', corpo).forEach(function (b) {
        b.addEventListener('click', function () {
          var o = p.o[+b.dataset.i]; (o[1] || '').split(' ').forEach(function (t) { if (t) votos[t] = (votos[t] || 0) + 1; });
          resp[passo] = o; passo++; render();
        });
      });
      var v = $('.quiz-voltar', corpo);
      if (v) v.addEventListener('click', function () { passo--; var o = resp[passo]; (o[1] || '').split(' ').forEach(function (t) { if (t) votos[t]--; }); render(); });
      var pri = $('.quiz-op', corpo); if (pri && passo) pri.focus();
    }
    function fim() {
      var top = Object.keys(votos).sort(function (a, b) { return votos[b] - votos[a]; })[0] || Object.keys(dados.r)[0];
      var r = dados.r[top] || dados.r[Object.keys(dados.r)[0]];
      var resumoTxt = dados.q.map(function (p, i) { return '• ' + p.q.replace(/<[^>]+>/g, '') + ' ' + resp[i][0]; }).join('\n');
      corpo.innerHTML = '<div class="quiz-res"><p class="tag">' + T('resultado') + '</p><h3>' + r.h + '</h3><p>' + r.p + '</p><div class="acoes"><a class="btn btn-wa" href="#" data-res><svg class="ic" aria-hidden="true"><use href="' + RAIZ + 'sites/assets/icones.svg#i-whatsapp-logo"/></svg><span>' + (r.btn || T('falarEquipe')) + '</span></a><button type="button" class="btn btn-ghost" data-refazer>' + T('refazer') + '</button></div></div>';
      $('[data-res]', corpo).addEventListener('click', function (e) { e.preventDefault(); abrirSim(L2('Olá! Fiz o diagnóstico no site e o resultado foi: ', 'Hi! I took the quiz on your website and got: ') + r.h.replace(/<[^>]+>/g, '') + '\n' + L2('Minhas respostas:', 'My answers:') + '\n' + resumoTxt); });
      $('[data-refazer]', corpo).addEventListener('click', function () { passo = 0; votos = {}; resp = []; render(); });
    }
    render();
  });

  // ---------- cobertura por bairro ----------
  $$('[data-cobertura]').forEach(function (c) {
    var regs = JSON.parse(c.getAttribute('data-cobertura')), inp = $('[data-cob-busca]', c), res = $('.cob-res', c), lis = $$('.cob-regioes li', c);
    inp.addEventListener('input', function () {
      var t = semAcento(inp.value); lis.forEach(function (l) { l.classList.toggle('achou', !!t && semAcento(l.textContent).indexOf(t) > -1); });
      if (t.length < 3) { res.innerHTML = ''; return; }
      var achou = null; regs.forEach(function (r) { r.b.forEach(function (b) { if (!achou && semAcento(b).indexOf(t) > -1) achou = [b, r]; }); });
      res.innerHTML = achou ? '<span class="ok">' + T('cobOk') + ' ' + esc(achou[0]) + ' (' + esc(achou[1].n) + ') · ' + (achou[1].taxa ? T('deslocDe') + ' ' + dinheiro(achou[1].taxa) : T('gratis')) + '</span>' : '<span class="nao">' + T('cobNao') + '</span>';
    });
  });
  // ---------- simulação de baixar e usar o app (App Store / Google Play) ----------
  // Nada é baixado: mostra o caminho do cliente — loja, download, abrir, agendar e o lembrete.
  (function () {
    var lojas = $$('[data-app-sim]');
    if (!lojas.length) return;
    var A = function (pt, en) { return EN ? en : pt; };
    var ACADEMIA = /treino|pulso|atlas|academia|rafa|caio/.test(SLUG);
    var SERV = ACADEMIA
      ? [[A('Treino do dia', 'Daily workout'), A('Pernas e glúteos · 45 min', 'Legs and glutes · 45 min')], [A('Aula coletiva', 'Group class'), A('Funcional · 50 min', 'HIIT · 50 min')], [A('Avaliação física', 'Fitness assessment'), A('Com o seu professor', 'With your coach')]]
      : [[A('Manicure', 'Manicure'), A('Em casa · 50 min', 'At home · 50 min')], [A('Mão e pé', 'Mani + pedi'), A('Em casa · 1h30', 'At home · 1h30')], [A('Esmaltação em gel', 'Gel polish'), A('Dura até 3 semanas', 'Lasts up to 3 weeks')]];
    var DIAS = [A('Hoje', 'Today'), A('Amanhã', 'Tomorrow'), A('Sábado', 'Saturday')];
    var HORAS = EN ? ['9:00 am', '10:30 am', '2:00 pm', '4:30 pm'] : ['09:00', '10:30', '14:00', '16:30'];
    var caixa, tela, timers = [], focoAntes = null, plat = 'ios', escolha = {};
    function limpa() { timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = []; }
    function icone(tam) {
      var logo = perso && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+\/=]+$/i.test(perso.logoImg || '') ? perso.logoImg : '';
      return '<span class="as-ic" style="width:' + tam + 'px;height:' + tam + 'px' + (logo ? ';background-image:url(&quot;' + logo + '&quot;)' : '') + '">' + (logo ? '' : esc(MARCA.charAt(0).toUpperCase())) + '</span>';
    }
    function montar() {
      caixa = doc.createElement('div');
      caixa.className = 'sim app-sim'; caixa.hidden = true;
      caixa.setAttribute('role', 'dialog'); caixa.setAttribute('aria-modal', 'true'); caixa.setAttribute('aria-labelledby', 'as-titulo');
      caixa.innerHTML = '<div class="sim-caixa"><button type="button" class="sim-x" aria-label="' + A('Fechar', 'Close') + '"><svg class="ic" aria-hidden="true"><use href="' + RAIZ + 'sites/assets/icones.svg#i-x"/></svg></button>' +
        '<div class="as-fone"><div class="as-status"><span>9:41</span><i></i></div><div class="as-tela" aria-live="polite"></div><div class="as-notif" hidden></div></div>' +
        '<div class="sim-txt"><p class="sim-tag">' + A('Simulação', 'Simulation') + '</p><h3 id="as-titulo"></h3><p>' +
        A('No site real, estes botões levam para o app na App Store e no Google Play. Aqui você vê o caminho do cliente: baixar, abrir, agendar e receber o lembrete. Nada é baixado nem instalado.',
          'On a real site, these buttons open the app on the App Store and Google Play. Here you can see the customer journey: download, open, book and get the reminder. Nothing is downloaded or installed.') +
        '</p><a class="btn btn-pri sim-cta" href="#">' + A('Quero um app assim', 'I want an app like this') + '</a><button type="button" class="sim-volta">' + A('Fechar', 'Close') + '</button></div></div>';
      body.appendChild(caixa);
      tela = $('.as-tela', caixa);
      caixa.addEventListener('click', function (e) { if (e.target === caixa || e.target.closest('.sim-x,.sim-volta')) fechar(); });
      $('.sim-cta', caixa).addEventListener('click', function () { contar('quero', 'app'); });
      tela.addEventListener('click', function (e) {
        var b = e.target.closest('[data-as]');
        if (b) passo(b.getAttribute('data-as'), b);
      });
      doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !caixa.hidden) fechar(); });
    }
    function fechar() { if (!caixa || caixa.hidden) return; limpa(); caixa.hidden = true; body.classList.remove('sim-aberta'); if (focoAntes) focoAntes.focus(); }
    function abrir(p) {
      if (!caixa) montar();
      limpa(); plat = p; escolha = {};
      focoAntes = doc.activeElement;
      caixa.classList.toggle('as-android', plat === 'android');
      $('#as-titulo', caixa).textContent = A('Como seria baixar o app da ', 'What downloading the ') + MARCA + A('', ' app would look like');
      $('.sim-cta', caixa).href = urlQuero();
      $('.as-notif', caixa).hidden = true;
      caixa.hidden = false; body.classList.add('sim-aberta');
      contar('simulacao', 'app');
      loja();
      $('.sim-x', caixa).focus();
    }
    function loja() {
      var ios = plat === 'ios';
      var sub = ACADEMIA ? A('Treinos, aulas e check-in', 'Workouts, classes and check-in') : A('Beleza em casa, sem fila', 'Beauty at home, no waiting');
      tela.className = 'as-tela as-loja';
      tela.innerHTML = (ios ? '<p class="as-volta">‹ ' + A('Buscar', 'Search') + '</p>' : '<p class="as-volta">← Google Play</p>') +
        '<div class="as-app">' + icone(78) + '<div><strong>' + esc(MARCA) + '</strong><small>' + sub + '</small>' +
        (ios ? '<button type="button" class="as-obter" data-as="baixar">' + A('Obter', 'Get') + '</button>' : '') + '</div></div>' +
        (ios ? '' : '<button type="button" class="as-instalar" data-as="baixar">' + A('Instalar', 'Install') + '</button>') +
        '<div class="as-info"><span><b>' + A('Grátis', 'Free') + '</b>' + A('preço', 'price') + '</span><span><b>' + A('Livre', 'All ages') + '</b>' + A('idade', 'age') + '</span><span><b>' + (ios ? 'iPhone' : 'Android') + '</b>' + A('aparelho', 'device') + '</span></div>' +
        '<div class="as-prints"><i></i><i></i><i></i></div>';
    }
    function passo(acao, b) {
      if (acao === 'baixar') {
        var ios = plat === 'ios', pct = 0;
        b.disabled = true;
        b.classList.add('baixando');
        b.innerHTML = ios ? '<span class="as-anel" style="--p:0"></span>' : '<span class="as-barra"><i style="width:0"></i></span><small>' + A('Baixando… ', 'Downloading… ') + '0%</small>';
        var t = setInterval(function () {
          pct = Math.min(100, pct + 4 + Math.round(Math.random() * 6));
          if (ios) $('.as-anel', b).style.setProperty('--p', pct);
          else { $('.as-barra i', b).style.width = pct + '%'; $('small', b).textContent = (pct < 100 ? A('Baixando… ', 'Downloading… ') : A('Instalando…', 'Installing…')) + (pct < 100 ? pct + '%' : ''); }
          if (pct >= 100) {
            clearInterval(t);
            timers.push(setTimeout(function () { b.disabled = false; b.classList.remove('baixando'); b.setAttribute('data-as', 'abrir'); b.textContent = A('Abrir', 'Open'); b.focus(); }, ios ? 300 : 700));
          }
        }, 110);
        timers.push(t);
      } else if (acao === 'abrir') {
        tela.className = 'as-tela as-splash';
        tela.innerHTML = icone(96) + '<strong>' + esc(MARCA) + '</strong>';
        timers.push(setTimeout(inicio, 1300));
      } else if (acao === 'servico') {
        escolha.s = b.getAttribute('data-i'); horario();
      } else if (acao === 'dia' || acao === 'hora') {
        $$('[data-as="' + acao + '"]', tela).forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        escolha[acao] = b.textContent;
        $('.as-confirmar', tela).disabled = !(escolha.dia && escolha.hora);
      } else if (acao === 'confirmar') {
        pronto();
      } else if (acao === 'voltar') {
        inicio();
      } else if (acao === 'denovo') {
        $('.as-notif', caixa).hidden = true; limpa(); escolha = {}; loja();
      }
    }
    function inicio() {
      tela.className = 'as-tela as-app-tela';
      tela.innerHTML = '<div class="as-cab">' + icone(34) + '<span>' + esc(MARCA) + '</span></div>' +
        '<p class="as-ola">' + A('Olá! Que bom ter você aqui.', 'Hi! Great to have you here.') + '</p><h4>' + (ACADEMIA ? A('O que vai ser hoje?', 'What’s it going to be today?') : A('O que vamos agendar?', 'What should we book?')) + '</h4>' +
        '<ul class="as-lista">' + SERV.map(function (s, i) { return '<li><button type="button" data-as="servico" data-i="' + i + '"><strong>' + esc(s[0]) + '</strong><small>' + esc(s[1]) + '</small><span>›</span></button></li>'; }).join('') + '</ul>';
    }
    function horario() {
      var s = SERV[escolha.s];
      tela.className = 'as-tela as-app-tela';
      tela.innerHTML = '<button type="button" class="as-volta-app" data-as="voltar">‹ ' + A('Voltar', 'Back') + '</button><h4>' + esc(s[0]) + '</h4><p class="as-ola">' + esc(s[1]) + '</p>' +
        '<p class="as-rot">' + A('Dia', 'Day') + '</p><div class="as-chips">' + DIAS.map(function (d) { return '<button type="button" data-as="dia" aria-pressed="false">' + d + '</button>'; }).join('') + '</div>' +
        '<p class="as-rot">' + A('Horário', 'Time') + '</p><div class="as-chips">' + HORAS.map(function (h) { return '<button type="button" data-as="hora" aria-pressed="false">' + h + '</button>'; }).join('') + '</div>' +
        '<button type="button" class="as-confirmar" data-as="confirmar" disabled>' + A('Confirmar', 'Confirm') + '</button>';
    }
    function pronto() {
      var s = SERV[escolha.s];
      tela.className = 'as-tela as-app-tela as-ok';
      tela.innerHTML = '<span class="as-check">✓</span><h4>' + (ACADEMIA ? A('Reservado!', 'Booked!') : A('Agendado!', 'Booked!')) + '</h4><p>' + esc(s[0]) + ' · ' + esc(escolha.dia) + ', ' + esc(escolha.hora) + '</p>' +
        '<p class="as-ola">' + A('Você recebe um lembrete 1 hora antes.', 'You’ll get a reminder 1 hour before.') + '</p><button type="button" class="as-confirmar" data-as="denovo">' + A('Ver de novo', 'Watch again') + '</button>';
      timers.push(setTimeout(function () {
        var n = $('.as-notif', caixa);
        n.innerHTML = icone(28) + '<div><b>' + esc(MARCA) + ' <small>' + A('agora', 'now') + '</small></b><span>' + A('Lembrete: ', 'Reminder: ') + esc(s[0]) + ' · ' + esc(escolha.dia) + ', ' + esc(escolha.hora) + '.</span></div>';
        n.hidden = false;
      }, 1800));
    }
    lojas.forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); abrir(a.getAttribute('data-app-sim')); });
    });
  })();
})();
