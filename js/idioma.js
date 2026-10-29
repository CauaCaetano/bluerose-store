/*
 * BLUE ROSE · pacote de idiomas
 *  O site e os sistemas são escritos em português do Brasil. Este script troca, no navegador,
 *  os textos, as fotos e os preços para o idioma escolhido, inclusive o que os sistemas
 *  desenham depois (MutationObserver). A escolha fica salva e vale para o site e os sistemas.
 *
 *  Dicionários: i18n/<idioma>/<pacote>.json  →  { "texto em pt-BR": "tradução" }
 *    números viram {0}, {1}... na chave: "{0} clientes" serve para "3 clientes" e "120 clientes".
 *  Fotos: i18n/imagens.json  →  { "img/sistemas/agenda.webp": ["en", "es"] }
 *    a foto traduzida fica em i18n/<idioma>/img/... com o mesmo caminho.
 *  ?coletar=1 guarda em window.__brTextos todos os textos vistos (para montar os dicionários).
 */
(function () {
  'use strict';
  if (window.__brIdioma) return;

  var IDIOMAS = [
    { id: 'pt-BR', nome: 'Português (Brasil)', curto: 'BR', moeda: 'BRL' },
    { id: 'pt-PT', nome: 'Português (Portugal)', curto: 'PT', moeda: 'EUR' },
    { id: 'es', nome: 'Español', curto: 'ES', moeda: 'USD' },
    { id: 'en', nome: 'English', curto: 'EN', moeda: 'USD' },
    { id: 'it', nome: 'Italiano', curto: 'IT', moeda: 'EUR' },
    { id: 'fr', nome: 'Français', curto: 'FR', moeda: 'EUR' }
  ];
  var ORIGEM = 'pt-BR';

  var esteScript = document.currentScript;
  var RAIZ = esteScript ? esteScript.src.replace(/js\/idioma\.js.*$/, '') : '/';
  // nos sistemas, WhatsApp/e-mail para clientes viram simulação na demonstração (js/envio-demo.js)
  if (/\/demos\/sistemas\//.test(location.pathname)) { var ved = document.createElement('script'); ved.src = RAIZ + 'js/envio-demo.js?v=1'; document.head.appendChild(ved); }
  var params = new URLSearchParams(location.search);
  var COLETAR = params.get('coletar') === '1';

  function achar(id) { for (var i = 0; i < IDIOMAS.length; i++) if (IDIOMAS[i].id === id) return IDIOMAS[i]; return null; }
  var pedido = params.get('lang');
  var salvo = null;
  try { salvo = localStorage.getItem('br-idioma'); } catch (e) {}
  if (pedido && achar(pedido)) { salvo = pedido; try { localStorage.setItem('br-idioma', pedido); } catch (e) {} }
  var atual = achar(salvo) || achar(ORIGEM);
  var avisarPronto;
  var api = window.__brIdioma = { idiomas: IDIOMAS, atual: atual.id, trocar: trocar, traduzir: function (t) { return t; },
    pronto: new Promise(function (r) { avisarPronto = r; }) }; // outros scripts esperam a tradução antes de mexer no texto

  // Preço de cada país = R$ × FATOR, pelo poder de compra de quem lê cada idioma:
  //   pt-PT 0,40 (R$ 49 → 20 €) · it 0,45 (→ 22 €) · fr 0,50 (→ 25 €)
  //   en  0,55 (EUA, → $27) · es 0,40 (América Latina, cobrado em dólar, → $20)
  var FATOR = { 'pt-PT': 0.4, it: 0.45, fr: 0.5, en: 0.55, es: 0.4 };
  api.moeda = atual.moeda;
  // valor em reais → valor na moeda do idioma (o mesmo que aparece na tela e o que o PayPal cobra)
  api.converter = function (brl) {
    if (atual.moeda === 'BRL') return brl;
    var v = brl * FATOR[atual.id];
    return brl % 1 ? Math.round(v * 100) / 100 : Math.round(v);
  };

  // paleta do país: o site usa css/paletas.css; cada sistema e cada site de exemplo tem o paletas.css dele, ao lado
  // do próprio CSS (estilo.css, tema.css ou base/nexo.css; gerado por tools/gerar_paletas_sistemas.py)
  if (atual.id !== ORIGEM) {
    document.documentElement.setAttribute('data-paleta', atual.id);
    var paleta = function (href, depois) {
      var pal = document.createElement('link');
      pal.rel = 'stylesheet'; pal.href = href;
      if (depois) depois.parentNode.insertBefore(pal, depois.nextSibling); else document.head.appendChild(pal);
    };
    if (/\/demos\/sistemas\/|\/sites\//.test(location.pathname)) {
      // este script vem antes dos <link> do sistema: cada CSS de cor que o navegador ler ganha o paletas.css logo depois,
      // antes da primeira pintura (sem piscar a cor antiga)
      var ver = function (l) { if (l.tagName === 'LINK' && !l.__pal && /\/(estilo|tema|nexo)\.css/.test(l.href)) { l.__pal = true; paleta(l.href.replace(/(estilo|tema|nexo)\.css.*$/, 'paletas.css?v=1'), l); } };
      [].forEach.call(document.querySelectorAll('link[rel="stylesheet"]'), ver);
      var obs = new MutationObserver(function (ms) { ms.forEach(function (m) { [].forEach.call(m.addedNodes, ver); }); });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      document.addEventListener('DOMContentLoaded', function () { obs.disconnect(); });
    } else paleta(RAIZ + 'css/paletas.css?v=1');
  }

  // pergunta para a IA (assistente do site e dos sistemas): pede a resposta no idioma escolhido
  api.comIdioma = function (texto) {
    return atual.id === ORIGEM ? texto : texto + ' (Responda em ' + atual.nome + ', o idioma de quem está perguntando.)';
  };

  function trocar(id) {
    try { localStorage.setItem('br-idioma', id); } catch (e) {}
    // sem a âncora (#precos etc.): com ela o navegador só rolava a página e não recarregava no idioma novo
    var u = new URL(location.href); u.searchParams.delete('lang'); u.hash = '';
    if (!location.hash && u.toString() === location.href) location.reload(); else location.replace(u.toString());
  }

  /* ---------- seletor (globo) ---------- */
  var ESTILO = '.br-idi{position:relative;display:inline-flex;font:600 13px/1 system-ui,sans-serif;z-index:2147483000}' +
    '.br-idi>button{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:999px;border:1px solid rgba(127,127,127,.45);background:transparent;color:inherit;font:inherit;cursor:pointer}' +
    '.br-idi>button svg{width:15px;height:15px}' +
    '.br-idi ul{position:absolute;right:0;top:calc(100% + 8px);margin:0;padding:6px;list-style:none;min-width:190px;background:#fff;color:#1b1d24;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.22);display:none}' +
    '.br-idi.aberto ul{display:block}' +
    '.br-idi li button{all:unset;box-sizing:border-box;display:flex;justify-content:space-between;gap:12px;width:100%;padding:10px 12px;border-radius:8px;cursor:pointer;font:500 14px/1.2 system-ui,sans-serif}' +
    '.br-idi li button:hover,.br-idi li button:focus-visible{background:#eef1f7}' +
    '.br-idi li button[aria-current="true"]{font-weight:700}' +
    '.br-idi li small{opacity:.55}' +
    '.br-idi.solto{position:fixed;left:12px;bottom:12px;background:rgba(20,22,30,.82);color:#fff;border-radius:999px;backdrop-filter:blur(6px)}' +
    '.br-idi.solto ul{top:auto;bottom:calc(100% + 8px);left:0;right:auto}' +
    '.br-idi.na-barra>button{padding:4px 9px;font-size:12px}' +
    'body:has(.site-de-teste) .br-idi.solto{bottom:46px}' +
    '@media (max-width:900px){.nav-links .br-idi{flex-direction:column;align-items:flex-start}.nav-links .br-idi ul{position:static;margin-top:6px;box-shadow:none}}' +
    '@media print{.br-idi{display:none}}' +
    // textos traduzidos costumam ser mais longos: o menu não quebra linha
    'html:not([lang="pt-BR"]) .nav-links{gap:16px;font-size:13.5px;margin-left:24px}html:not([lang="pt-BR"]) .nav-links a,html:not([lang="pt-BR"]) .brand{white-space:nowrap}';

  function montarSeletor() {
    if (document.querySelector('.br-idi')) return;
    var st = document.createElement('style'); st.textContent = ESTILO; document.head.appendChild(st);
    var box = document.createElement('div');
    box.className = 'br-idi'; box.setAttribute('translate', 'no');
    box.innerHTML = '<button type="button" aria-haspopup="true" aria-expanded="false" aria-label="Idioma · Language">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>' +
      '<span>' + atual.curto + '</span></button><ul></ul>';
    var ul = box.querySelector('ul');
    IDIOMAS.forEach(function (l) {
      var li = document.createElement('li');
      li.innerHTML = '<button type="button" lang="' + l.id + '"' + (l.id === atual.id ? ' aria-current="true"' : '') + '>' + l.nome + '<small>' + l.curto + '</small></button>';
      li.firstChild.addEventListener('click', function () { if (l.id !== atual.id) trocar(l.id); else fechar(); });
      ul.appendChild(li);
    });
    var bt = box.firstChild;
    function fechar() { box.classList.remove('aberto'); bt.setAttribute('aria-expanded', 'false'); }
    bt.addEventListener('click', function (e) {
      e.stopPropagation();
      var abrir = !box.classList.contains('aberto');
      box.classList.toggle('aberto', abrir); bt.setAttribute('aria-expanded', String(abrir));
    });
    document.addEventListener('click', function (e) { if (!box.contains(e.target)) fechar(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });
    var nav = document.querySelector('.nav-links');
    var barra = document.querySelector('.barra-demo, [data-barra-demo]');
    if (nav) { var cta = nav.querySelector('.btn-primary'); nav.insertBefore(box, cta || null); }
    else if (barra) { box.classList.add('na-barra'); barra.appendChild(box); }
    else { box.classList.add('solto'); document.body.appendChild(box); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarSeletor); else montarSeletor();

  if (atual.id === ORIGEM && !COLETAR) { avisarPronto(); return; }

  /* ---------- dicionário ---------- */
  var caminho = location.pathname;
  var sis = caminho.match(/\/demos\/sistemas\/([^/]+)\//);
  var pacotes = sis ? ['sistemas', 'sis-' + sis[1]] : /\/sites\//.test(caminho) ? ['sites'] : ['site'];
  var DIC = {};
  var NUM = /\d+(?:[.,]\d+)*/g;

  function normal(t) { return t.replace(/\s+/g, ' ').trim(); }
  var textos = window.__brTextos = COLETAR ? {} : null;

  function buscar(t) {
    var n = normal(t);
    if (!n || !/[A-Za-zÀ-ÿ]/.test(n)) return null;
    if (textos) { var chaveC = n.replace(NUM, '{#}'); textos[chaveC] = (textos[chaveC] || 0) + 1; }
    if (DIC[n] != null) return DIC[n];
    var nums = n.match(NUM);
    if (!nums) return null;
    var i = 0;
    var chave = n.replace(NUM, function () { return '{' + (i++) + '}'; });
    var tr = DIC[chave];
    if (tr == null) return null;
    return tr.replace(/\{(\d+)\}/g, function (_, k) { return nums[+k] != null ? nums[+k] : ''; });
  }

  /* R$ 1.234,56 → 370,37 € (Europa) ou $432.10 (dólar), com o FATOR lá de cima */
  function moeda(t) {
    if (atual.moeda === 'BRL' || t.indexOf('R$') < 0) return t;
    return t.replace(/R\$\s?(-?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|-?\d+(?:,\d{1,2})?)/g, function (_, v) {
      var centavos = v.indexOf(',') >= 0;
      var n = api.converter(parseFloat(v.replace(/\./g, '').replace(',', '.')));
      var fmt = n.toLocaleString(atual.moeda === 'EUR' ? (atual.id === 'pt-PT' ? 'pt-PT' : atual.id) : 'en-US',
        { minimumFractionDigits: centavos ? 2 : 0, maximumFractionDigits: centavos ? 2 : 0 });
      return atual.moeda === 'EUR' ? fmt + ' €' : '$' + fmt;
    });
  }

  function traduzirTexto(t) {
    var lead = t.match(/^\s*/)[0], trail = t.match(/\s*$/)[0];
    var tr = buscar(t);
    if (tr == null && api.faltando && /[A-Za-zÀ-ÿ]{2}/.test(t)) api.faltando[normal(t).replace(NUM, '{#}')] = 1;
    var saida = tr != null ? lead + tr + trail : t;
    return moeda(saida);
  }
  api.faltando = params.get('faltando') === '1' ? {} : null; // ?faltando=1: guarda o que ficou sem tradução
  api.traduzir = function (t) { return atual.id === ORIGEM ? t : traduzirTexto(t); };

  /* ---------- aplicar na página ---------- */
  var PULAR = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, CODE: 1, PRE: 1, TEXTAREA: 1, svg: 1, SVG: 1 };
  var ATRS = ['placeholder', 'title', 'aria-label', 'alt', 'data-tip'];
  var feito = new WeakMap(); // nó → texto que nós escrevemos (para não traduzir de novo)

  function pular(el) {
    for (var e = el; e && e.nodeType === 1; e = e.parentNode) {
      if (PULAR[e.nodeName] || e.getAttribute('translate') === 'no' || e.isContentEditable || (e.classList && e.classList.contains('lx-p'))) return true;
    }
    return false;
  }

  function noTexto(n) {
    var v = n.nodeValue;
    if (!v || feito.get(n) === v) return;
    if (n.parentNode && pular(n.parentNode)) return;
    var t = traduzirTexto(v);
    if (/R\$\s*$/.test(t)) t = moedaSeparada(n, t);
    if (t !== v) n.nodeValue = t;
    feito.set(n, n.nodeValue);
  }

  // "R$ <b data-conta="49">49</b>": o número está no elemento seguinte
  function moedaSeparada(n, t) {
    var el = n.nextSibling;
    if (atual.moeda === 'BRL' || !el || el.nodeType !== 1 || el.brMoeda) return t;
    var num = (el.getAttribute('data-conta') || el.textContent || '').trim();
    if (!/^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$|^\d+(?:,\d{1,2})?$/.test(num)) return t;
    var conv = moeda('R$ ' + num), valor = conv.replace(/[^\d.,]/g, '');
    el.brMoeda = true;
    el.textContent = valor;
    if (el.hasAttribute('data-conta')) el.setAttribute('data-conta', String(Math.round(parseFloat(valor.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')))));
    if (atual.moeda === 'EUR') { el.parentNode.insertBefore(document.createTextNode(' €'), el.nextSibling); return t.replace(/R\$\s*$/, ''); }
    return t.replace(/R\$\s*$/, '$');
  }

  function atributos(el) {
    if (pular(el)) return;
    for (var i = 0; i < ATRS.length; i++) {
      var a = ATRS[i], v = el.getAttribute(a);
      if (!v) continue;
      var marca = 'br' + a;
      if (el[marca] === v) continue;
      var t = traduzirTexto(v);
      if (t !== v) el.setAttribute(a, t);
      el[marca] = el.getAttribute(a);
    }
    if (el.nodeName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type) && el.value && el.brValor !== el.value) {
      el.value = traduzirTexto(el.value); el.brValor = el.value;
    }
    if (el.nodeName === 'IMG' || el.nodeName === 'SOURCE') foto(el);
  }

  var FOTOS = null;
  function foto(el) {
    if (!FOTOS) return;
    ['src', 'srcset'].forEach(function (a) {
      var v = el.getAttribute(a);
      if (!v || v.indexOf('/i18n/') >= 0) return;
      var nova = v.replace(/[^\s,]+/g, function (u) {
        var abs; try { abs = new URL(u, location.href).href; } catch (e) { return u; }
        if (abs.indexOf(RAIZ) !== 0) return u;
        var rel = abs.slice(RAIZ.length).split(/[?#]/)[0];
        var lista = FOTOS[rel];
        return lista && lista.indexOf(atual.id) >= 0 ? RAIZ + 'i18n/' + atual.id + '/' + rel : u;
      });
      if (nova !== v) el.setAttribute(a, nova);
    });
  }

  /* Frase quebrada em pedaços ("Teste <b>7 dias</b> grátis", ou uma palavra por <span>):
     traduz a frase inteira e reparte as palavras traduzidas pelos mesmos pedaços, na proporção do original. */
  var EM_LINHA = { SPAN: 1, EM: 1, B: 1, STRONG: 1, I: 1, SMALL: 1, A: 1, MARK: 1, U: 1, SUP: 1, SUB: 1, ABBR: 1, BR: 1, S: 1, Q: 1 };
  function folhas(el) {
    var out = [];
    for (var c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) out.push(c);
      else if (c.nodeType === 1) {
        if (!EM_LINHA[c.nodeName] || c.getAttribute('translate') === 'no') return null;
        var sub = folhas(c); if (!sub) return null;
        out.push.apply(out, sub);
      }
    }
    return out;
  }
  function frase(el) {
    if (el.brFrase || !el.firstElementChild || EM_LINHA[el.nodeName] && EM_LINHA[el.parentNode && el.parentNode.nodeName]) return false;
    // menu ou lista de links não é frase: cada link se traduz sozinho
    if (el.nodeName === 'NAV' || el.querySelectorAll('a, button').length > 0) return false;
    var fs = folhas(el);
    if (!fs) return false;
    var comTexto = fs.filter(function (f) { return /[A-Za-zÀ-ÿ]/.test(f.nodeValue); });
    if (comTexto.length < 2) return false;
    // número solto num pedaço (preço, contador) é dado: não reparte, traduz pedaço por pedaço
    if (fs.some(function (f) { return /\d/.test(f.nodeValue) && !/[A-Za-zÀ-ÿ]/.test(f.nodeValue.replace(/R\$/g, '')); }) || el.querySelector('[data-conta]')) return false;
    var orig = normal(el.textContent);
    if (orig.length > 500) return false;
    var tr = buscar(orig);
    if (tr == null) return false;
    var palavras = moeda(tr).split(' ');
    var pesos = fs.map(function (f) { var p = normal(f.nodeValue); return p ? p.split(' ').length : 0; });
    var total = pesos.reduce(function (a, b) { return a + b; }, 0) || 1, acum = 0, pos = 0;
    fs.forEach(function (f, i) {
      var ini = pos;
      acum += pesos[i];
      var fim = i === fs.length - 1 ? palavras.length : Math.round(acum / total * palavras.length);
      if (!pesos[i]) { feito.set(f, f.nodeValue); return; }
      // pedaço que termina em pontuação: corta a tradução na pontuação igual mais próxima
      var pont = normal(f.nodeValue).slice(-1);
      if (i < fs.length - 1 && /[.!?:;,]/.test(pont)) {
        var melhor = -1;
        for (var j = ini + 1; j <= palavras.length; j++) if (palavras[j - 1].slice(-1) === pont && (melhor < 0 || Math.abs(j - fim) < Math.abs(melhor - fim))) melhor = j;
        if (melhor > 0) fim = melhor;
      }
      fim = Math.max(fim, ini); pos = fim;
      var v = f.nodeValue, lead = v.match(/^\s*/)[0], trail = v.match(/\s*$/)[0];
      f.nodeValue = fim > ini ? lead + palavras.slice(ini, fim).join(' ') + trail : (lead || trail ? ' ' : '');
      feito.set(f, f.nodeValue);
    });
    el.brFrase = true;
    return true;
  }

  function varrer(raiz) {
    if (raiz.nodeType === 3) { noTexto(raiz); return; }
    if (raiz.nodeType !== 1 && raiz.nodeType !== 9 && raiz.nodeType !== 11) return;
    if (raiz.nodeType === 1) { if (pular(raiz)) return; atributos(raiz); if (frase(raiz)) return; }
    var w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (n) {
        if (n.nodeType === 1) {
          if (PULAR[n.nodeName] || n.getAttribute('translate') === 'no') return NodeFilter.FILTER_REJECT;
          if (frase(n)) { atributos(n); return NodeFilter.FILTER_REJECT; }
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) noTexto(n); else atributos(n); }
  }

  function cabecalho() {
    document.documentElement.lang = atual.id;
    if (document.title) { var t = traduzirTexto(document.title); if (t !== document.title) document.title = t; }
    document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]').forEach(function (m) {
      var c = m.getAttribute('content'); if (c) m.setAttribute('content', traduzirTexto(c));
    });
  }

  var fila = [], agendado = false;
  function processar() {
    agendado = false;
    var lote = fila; fila = [];
    for (var i = 0; i < lote.length; i++) if (lote[i].isConnected) varrer(lote[i]);
  }
  function enfileirar(n) { fila.push(n); if (!agendado) { agendado = true; setTimeout(processar, 16); } }

  function iniciar() {
    cabecalho();
    varrer(document.body);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.type === 'childList') m.addedNodes.forEach(enfileirar);
        else if (m.type === 'characterData') enfileirar(m.target);
        else if (m.type === 'attributes') enfileirar(m.target);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATRS.concat(['src', 'srcset', 'value']) });
    new MutationObserver(function () { if (document.title && feito.get(document) !== document.title) { document.title = traduzirTexto(document.title); feito.set(document, document.title); } })
      .observe(document.querySelector('title') || document.head, { childList: true, characterData: true, subtree: true });
    document.documentElement.classList.remove('br-traduzindo');
    avisarPronto();
  }

  // esconde o texto em português até o dicionário chegar (no máximo 1,5 s)
  if (!COLETAR) {
    var esc = document.createElement('style');
    esc.textContent = 'html.br-traduzindo body{visibility:hidden}';
    document.head.appendChild(esc);
    document.documentElement.classList.add('br-traduzindo');
    setTimeout(function () { document.documentElement.classList.remove('br-traduzindo'); }, 1500);
  }

  function carregar(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
  }
  var pedidos = COLETAR && atual.id === ORIGEM ? [] : pacotes.map(function (p) { return carregar(RAIZ + 'i18n/' + atual.id + '/' + p + '.json'); });
  pedidos.push(carregar(RAIZ + 'i18n/imagens.json'));
  Promise.all(pedidos).then(function (rs) {
    FOTOS = rs.pop() || {};
    rs.forEach(function (d) { for (var k in d) if (d[k]) DIC[normal(k)] = d[k]; });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  });
})();
