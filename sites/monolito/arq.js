// Monólito · menu, revelação ao rolar, antes e depois, filtros do portfólio com lightbox, linha do tempo do processo,
// explorador de acabamentos e pedido de orçamento (valida, mostra o resumo e abre o WhatsApp ou o e-mail).
// Cada bloco só roda se a página tiver os elementos dele. Nada é enviado a servidor: é uma demonstração.
(function () {
  'use strict';
  var doc = document, raiz = doc.documentElement;
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || doc).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var PJ = window.MONO_PJ || {};
  function whats(msg) { if (window.BR_WA) window.BR_WA(msg); else window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener'); }

  // ---------- revelação ao rolar ----------
  raiz.classList.add('js');
  var rvs = $$('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    rvs.forEach(function (el) { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('visto'); else io.observe(el); });
  } else rvs.forEach(function (el) { el.classList.add('visto'); });

  // ---------- menu (celular e tablet) ----------
  var bm = $('.bt-menu'), menu = $('#menu');
  if (bm && menu) {
    var abre = function (v) { bm.setAttribute('aria-expanded', String(v)); menu.classList.toggle('aberto', v); bm.textContent = v ? 'Fechar' : 'Menu'; };
    bm.addEventListener('click', function () { abre(!menu.classList.contains('aberto')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) abre(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('aberto')) { abre(false); bm.focus(); } });
  }

  // ---------- tour 3D (cena.js espera estes sinais) ----------
  raiz.classList.add('pronto');
  window.dispatchEvent(new Event('monolito:pronto'));
  doc.addEventListener('click', function (e) { if (e.target.closest('[data-explorar]')) window.dispatchEvent(new Event('monolito:explorar')); });

  // ---------- antes e depois ----------
  function compara(el) {
    var r = $('input', el); if (!r) return;
    var f = function () { el.style.setProperty('--pos', r.value + '%'); };
    r.addEventListener('input', f); f();
  }
  $$('[data-compara]').forEach(compara);

  // ---------- portfólio: filtros ----------
  var filtros = $('.filtros');
  if (filtros) {
    var itens = $$('.mz'), conta = $('.conta', filtros);
    var aplica = function (f, url) {
      var n = 0;
      $$('button', filtros).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.f === f)); });
      itens.forEach(function (it) { var ok = f === 'todos' || it.dataset.cats.split(' ').indexOf(f) >= 0; it.hidden = !ok; if (ok) { n++; it.classList.add('visto'); } });
      if (conta) conta.textContent = n + (n === 1 ? ' projeto' : ' projetos');
      if (url) try { history.replaceState(null, '', f === 'todos' ? location.pathname : '?f=' + f); } catch (e) {}
    };
    filtros.addEventListener('click', function (e) { var b = e.target.closest('button[data-f]'); if (b) aplica(b.dataset.f, true); });
    var q = new URLSearchParams(location.search).get('f');
    if (q && $('button[data-f="' + q.replace(/[^a-z-]/g, '') + '"]', filtros)) aplica(q, false);
  }

  // ---------- lightbox ----------
  var lb = null, lbSlides = [], lbI = 0, lbPj = null, lbVolta = null;
  function lbMonta() {
    lb = doc.createElement('div'); lb.className = 'lb'; lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-labelledby', 'lb-t');
    lb.innerHTML = '<div class="lb-topo"><span class="mono" id="lb-n"></span><button type="button" class="lb-x" aria-label="Fechar">×</button></div>' +
      '<div class="lb-img" id="lb-img"></div>' +
      '<div class="lb-pe"><div><h3 id="lb-t"></h3><p class="leg" id="lb-leg"></p></div><div class="lb-nav"><button type="button" data-d="-1" aria-label="Foto anterior">←</button><button type="button" data-d="1" aria-label="Próxima foto">→</button><a class="lk" id="lb-link" href="#">Ver projeto</a></div></div>';
    doc.body.appendChild(lb);
    lb.addEventListener('click', function (e) {
      if (e.target.closest('.lb-x') || e.target === lb) return lbFecha();
      var d = e.target.closest('[data-d]'); if (d) lbVai(lbI + +d.dataset.d);
    });
    doc.addEventListener('keydown', function (e) {
      if (!lb || lb.hidden) return;
      if (e.key === 'Escape') lbFecha();
      else if (e.key === 'ArrowRight' && !e.target.matches('input')) lbVai(lbI + 1);
      else if (e.key === 'ArrowLeft' && !e.target.matches('input')) lbVai(lbI - 1);
      else if (e.key === 'Tab') { // mantém o foco dentro do lightbox
        var f = $$('button, a[href], input', lb).filter(function (x) { return x.offsetParent !== null; });
        if (!f.length) return;
        if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    var x0 = null;
    $('#lb-img', lb).addEventListener('pointerdown', function (e) { if (!e.target.matches('input')) x0 = e.clientX; });
    $('#lb-img', lb).addEventListener('pointerup', function (e) { if (x0 === null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 50) lbVai(lbI + (dx < 0 ? 1 : -1)); });
  }
  function lbVai(i) {
    var n = lbSlides.length; lbI = (i + n) % n;
    var s = lbSlides[lbI], box = $('#lb-img', lb);
    if (s.tipo === 'compara') {
      box.innerHTML = '<div class="compara" data-compara><img src="img/' + s.a[0] + '.webp" alt="' + esc(s.a[1]) + '" width="' + s.a[2] + '" height="' + s.a[3] + '"><img class="depois" src="img/' + s.d[0] + '.webp" alt="' + esc(s.d[1]) + '"><span class="barra"></span><span class="rot e">Antes</span><span class="rot d">Depois</span><input type="range" min="0" max="100" value="50" aria-label="Arraste para comparar antes e depois"></div>';
      compara($('.compara', box));
      $('#lb-leg', lb).textContent = 'Antes e depois: arraste a barra para comparar · ' + lbPj.local + ' · ' + lbPj.ano;
    } else {
      box.innerHTML = '<img src="img/' + s[0] + '.webp" alt="' + esc(s[1]) + '" width="' + s[2] + '" height="' + s[3] + '">';
      $('#lb-leg', lb).textContent = s[1] + ' · ' + lbPj.local + ' · ' + lbPj.ano + ' · foto ilustrativa';
    }
    $('#lb-n', lb).textContent = String(lbI + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
    $$('[data-d]', lb).forEach(function (b) { b.hidden = n < 2; });
  }
  function lbAbre(slug, i, origem) {
    var p = PJ[slug]; if (!p) return;
    if (!lb) lbMonta();
    lbPj = p; lbVolta = origem;
    lbSlides = (p.antes ? [{ tipo: 'compara', a: p.antes, d: p.depois }] : []).concat(p.fotos);
    $('#lb-t', lb).textContent = p.nome;
    var link = $('#lb-link', lb); link.href = p.url; link.hidden = location.pathname.split('/').pop() === p.url;
    lb.hidden = false; doc.body.style.overflow = 'hidden';
    lbVai(i);
    $('.lb-x', lb).focus();
  }
  function lbFecha() { lb.hidden = true; doc.body.style.overflow = ''; $('#lb-img', lb).innerHTML = ''; if (lbVolta) lbVolta.focus(); }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest('[data-lb]'); if (!b) return;
    var p = PJ[b.dataset.lb]; if (!p) return;
    var i = b.hasAttribute('data-i') ? +b.dataset.i + (p.antes ? 1 : 0) : 0;
    lbAbre(b.dataset.lb, i, b);
  });

  // ---------- processo: linha do tempo ----------
  var abas = $$('.lt-lista [role="tab"]');
  if (abas.length) {
    var prog = $('.lt-prog i'), atual = 0;
    var mostra = function (k, foco) {
      atual = (k + abas.length) % abas.length;
      abas.forEach(function (a, j) {
        var on = j === atual; a.setAttribute('aria-selected', String(on)); a.tabIndex = on ? 0 : -1;
        $('#' + a.getAttribute('aria-controls')).hidden = !on;
      });
      if (prog) prog.style.width = ((atual + 1) / abas.length * 100) + '%';
      if (foco) abas[atual].focus();
      var ant = $('[data-et="-1"]'), prox = $('[data-et="1"]');
      if (ant) ant.disabled = atual === 0;
      if (prox) prox.textContent = atual === abas.length - 1 ? 'Inicie seu projeto →' : 'Próxima etapa →';
    };
    abas.forEach(function (a, j) {
      a.addEventListener('click', function () { mostra(j); });
      a.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); mostra(atual + 1, true); }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); mostra(atual - 1, true); }
      });
    });
    $$('[data-et]').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = +b.dataset.et;
        if (d > 0 && atual === abas.length - 1) { location.href = 'contato.html'; return; }
        mostra(atual + d);
        var topo = $('.linha-t'); if (topo && topo.getBoundingClientRect().top < 0) topo.scrollIntoView({ block: 'start' });
      });
    });
    mostra(0);
  }

  // ---------- explorador de acabamentos ----------
  var svg = $('#ex-svg');
  if (svg) {
    // [id, nome, cor, textura, nível 1 a 3]
    var M = {
      piso: [['porcelanato', 'Porcelanato 120×120 cinza claro', '#d3cfc6', 'ladrilho', 2], ['carvalho', 'Assoalho de carvalho', '#b89a72', 'tabua', 3], ['cimento', 'Cimento queimado', '#a9a69d', 'liso', 1], ['travertino', 'Travertino romano', '#d9cdb6', 'pedra', 3], ['terracota', 'Ladrilho de terracota', '#b9704e', 'ladrilho', 2]],
      parede: [['cal', 'Pintura à base de cal', '#ece7dc', 'liso', 1], ['argila', 'Massa de argila', '#cdb99c', 'liso', 2], ['pedra', 'Pintura pedra clara', '#D5D1C7', 'liso', 1], ['concreto', 'Concreto aparente', '#b9b5ab', 'concreto', 2], ['grafite', 'Pintura grafite', '#55574f', 'liso', 1]],
      marc: [['freijo', 'Freijó', '#a07d58', 'veio', 3], ['carvalho', 'Carvalho natural', '#b89a72', 'veio', 3], ['offwhite', 'Laca off-white', '#ebe6db', 'liso', 2], ['grafite', 'Laca grafite fosca', '#3d3f39', 'liso', 2], ['nogueira', 'Nogueira', '#6b4a33', 'veio', 3]],
      banc: [['quartzito', 'Quartzito Taj Mahal', '#e4dccb', 'pedra', 3], ['marmore', 'Mármore branco', '#eceae5', 'pedra', 3], ['granito', 'Granito preto absoluto', '#2b2b29', 'pedra', 2], ['travertino', 'Travertino', '#d9cdb6', 'pedra', 2], ['micro', 'Microcimento', '#b5b1a7', 'liso', 1]],
      estof: [['linho', 'Linho cru', '#ddd4c2', 'liso', 2], ['boucle', 'Bouclê off-white', '#efe9dd', 'liso', 3], ['terracota', 'Veludo terracota', '#9f5a3e', 'liso', 3], ['couro', 'Couro conhaque', '#8a5a3a', 'liso', 3]],
      metal: [['latao', 'Latão escovado', '#b39a64', 'liso', 3], ['inox', 'Inox escovado', '#a7a9a6', 'liso', 2], ['preto', 'Preto fosco', '#232321', 'liso', 2], ['cobre', 'Cobre', '#a86a45', 'liso', 3]],
      luz: [['2700', '2700 K · quente', 'rgba(255,170,90,.16)', 'luz', 0], ['3000', '3000 K · neutra quente', 'rgba(255,205,150,.08)', 'luz', 0], ['4000', '4000 K · neutra', 'rgba(200,225,255,.08)', 'luz', 0]]
    };
    var NOMES = { piso: 'Piso', parede: 'Paredes', marc: 'Marcenaria', banc: 'Bancada', estof: 'Estofado', metal: 'Metais', luz: 'Temperatura da luz' };
    var AMB = {
      cozinha: { nome: 'Cozinha', grupos: ['piso', 'parede', 'marc', 'banc', 'metal', 'luz'], padrao: { piso: 'porcelanato', parede: 'cal', marc: 'freijo', banc: 'quartzito', metal: 'latao', luz: '3000' } },
      estar: { nome: 'Estar', grupos: ['piso', 'parede', 'marc', 'estof', 'metal', 'luz'], padrao: { piso: 'carvalho', parede: 'pedra', marc: 'carvalho', estof: 'linho', metal: 'latao', luz: '2700' } },
      banho: { nome: 'Banho', grupos: ['piso', 'parede', 'marc', 'banc', 'metal', 'luz'], padrao: { piso: 'travertino', parede: 'concreto', marc: 'nogueira', banc: 'marmore', metal: 'preto', luz: '3000' } }
    };
    var amb = 'cozinha', esc2 = {};
    var NS = 'http://www.w3.org/2000/svg';
    var busca = function (g, id) { return M[g].filter(function (x) { return x[0] === id; })[0] || M[g][0]; };
    var escurece = function (hex, k) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return 'rgb(' + Math.round(r * k) + ',' + Math.round(g * k) + ',' + Math.round(b * k) + ')'; };
    function padrao(id, m, w, h) {
      var cor = m[2], t = m[3], l = escurece(cor, .8), s = '<pattern id="' + id + '" patternUnits="userSpaceOnUse" width="' + w + '" height="' + h + '"><rect width="' + w + '" height="' + h + '" fill="' + cor + '"/>';
      if (t === 'ladrilho') s += '<path d="M0 .5H' + w + 'M.5 0V' + h + '" stroke="' + escurece(cor, .86) + '" stroke-width="1.2"/>';
      if (t === 'tabua') s += '<path d="M0 .5H' + w + 'M0 ' + h / 2 + 'H' + w + 'M' + w * .3 + ' 0V' + h / 2 + 'M' + w * .75 + ' ' + h / 2 + 'V' + h + '" stroke="' + l + '" stroke-width="1.2"/><path d="M10 ' + h * .22 + 'C' + w * .3 + ' ' + h * .18 + ' ' + w * .6 + ' ' + h * .3 + ' ' + (w - 10) + ' ' + h * .24 + 'M14 ' + h * .74 + 'C' + w * .4 + ' ' + h * .7 + ' ' + w * .7 + ' ' + h * .8 + ' ' + (w - 8) + ' ' + h * .72 + '" stroke="' + l + '" stroke-opacity=".35" fill="none"/>';
      if (t === 'veio') s += '<path d="M' + w * .2 + ' 0C' + w * .26 + ' ' + h * .3 + ' ' + w * .14 + ' ' + h * .6 + ' ' + w * .22 + ' ' + h + 'M' + w * .55 + ' 0C' + w * .5 + ' ' + h * .4 + ' ' + w * .62 + ' ' + h * .7 + ' ' + w * .56 + ' ' + h + 'M' + w * .85 + ' 0C' + w * .9 + ' ' + h * .5 + ' ' + w * .8 + ' ' + h * .8 + ' ' + w * .86 + ' ' + h + '" stroke="' + l + '" stroke-opacity=".45" fill="none"/>';
      if (t === 'pedra') s += '<path d="M0 ' + h * .3 + 'C' + w * .3 + ' ' + h * .1 + ' ' + w * .5 + ' ' + h * .6 + ' ' + w + ' ' + h * .35 + 'M' + w * .1 + ' ' + h + 'C' + w * .3 + ' ' + h * .7 + ' ' + w * .6 + ' ' + h * .9 + ' ' + w * .9 + ' ' + h * .55 + '" stroke="' + escurece(cor, .72) + '" stroke-opacity=".45" fill="none" stroke-width="1.3"/>';
      if (t === 'concreto') s += '<path d="M0 .5H' + w + 'M.5 0V' + h + '" stroke="' + l + '" stroke-opacity=".5"/><circle cx="' + w * .25 + '" cy="' + h * .3 + '" r="2.2" fill="' + l + '"/><circle cx="' + w * .75 + '" cy="' + h * .3 + '" r="2.2" fill="' + l + '"/><circle cx="' + w * .25 + '" cy="' + h * .75 + '" r="2.2" fill="' + l + '"/><circle cx="' + w * .75 + '" cy="' + h * .75 + '" r="2.2" fill="' + l + '"/>';
      return s + '</pattern>';
    }
    function desenha() {
      var g = function (k) { return busca(k, esc2[k]); };
      var met = g('metal')[2], defs = '<defs>' + padrao('p-piso', g('piso'), 160, 60) + padrao('p-parede', g('parede'), 200, 110) + padrao('p-marc', g('marc'), 90, 140) +
        (esc2.banc ? padrao('p-banc', g('banc'), 220, 90) : '') + '</defs>';
      var s = defs + '<rect width="800" height="400" fill="url(#p-parede)"/><polygon points="0,400 800,400 800,520 0,520" fill="url(#p-piso)"/><path d="M0 400H800" stroke="#252722" stroke-opacity=".35"/>';
      if (amb === 'cozinha') {
        s += '<rect x="90" y="70" width="430" height="120" fill="url(#p-marc)" stroke="#252722" stroke-opacity=".25"/>' +
          '<path d="M233 70V190M376 70V190" stroke="#252722" stroke-opacity=".25"/>' +
          '<rect x="90" y="190" width="430" height="100" fill="url(#p-banc)" opacity=".92"/>' +
          '<rect x="80" y="288" width="580" height="12" fill="url(#p-banc)" stroke="#252722" stroke-opacity=".3"/>' +
          '<rect x="90" y="300" width="560" height="100" fill="url(#p-marc)" stroke="#252722" stroke-opacity=".25"/>' +
          '<path d="M230 300V400M370 300V400M510 300V400" stroke="#252722" stroke-opacity=".25"/>' +
          '<rect x="530" y="70" width="130" height="218" fill="url(#p-marc)" stroke="#252722" stroke-opacity=".25"/><rect x="552" y="150" width="86" height="60" fill="#2d2e2a" opacity=".85"/>' +
          '<path d="M300 288V258Q300 244 316 244H330" stroke="' + met + '" stroke-width="5" fill="none" stroke-linecap="round"/>' +
          '<rect x="150" y="318" width="40" height="4" fill="' + met + '"/><rect x="290" y="318" width="40" height="4" fill="' + met + '"/><rect x="430" y="318" width="40" height="4" fill="' + met + '"/><rect x="570" y="318" width="40" height="4" fill="' + met + '"/>' +
          '<g><path d="M700 0V120" stroke="' + met + '"/><path d="M684 120h32l-6 22h-20z" fill="' + met + '"/><path d="M750 0V100" stroke="' + met + '"/><path d="M734 100h32l-6 22h-20z" fill="' + met + '"/></g>';
      } else if (amb === 'estar') {
        s += '<rect x="70" y="70" width="270" height="200" fill="#e9eef0" stroke="#252722" stroke-opacity=".3"/><path d="M205 70V270" stroke="#252722" stroke-opacity=".3"/><rect x="70" y="270" width="270" height="6" fill="#252722" opacity=".2"/>' +
          '<rect x="430" y="40" width="300" height="360" fill="url(#p-marc)"/>' + (function () { var r = ''; for (var x = 445; x < 730; x += 15) r += '<path d="M' + x + ' 40V400" stroke="#252722" stroke-opacity=".18"/>'; return r; })() +
          '<rect x="480" y="150" width="200" height="112" fill="#1f201d"/><rect x="460" y="330" width="240" height="30" fill="url(#p-marc)" stroke="#252722" stroke-opacity=".3"/>' +
          '<ellipse cx="260" cy="470" rx="230" ry="34" fill="#d8cfbd" opacity=".85"/>' +
          '<rect x="90" y="330" width="330" height="70" rx="10" fill="' + g('estof')[2] + '"/><rect x="100" y="300" width="310" height="44" rx="12" fill="' + escurece(g('estof')[2], .94) + '"/><rect x="82" y="318" width="26" height="82" rx="10" fill="' + escurece(g('estof')[2], .9) + '"/><rect x="402" y="318" width="26" height="82" rx="10" fill="' + escurece(g('estof')[2], .9) + '"/>' +
          '<path d="M30 400V190Q30 170 50 170H80" stroke="' + met + '" stroke-width="4" fill="none"/><path d="M70 160h30l-4 22H74z" fill="' + met + '"/>' +
          '<rect x="230" y="430" width="120" height="10" fill="' + met + '"/><path d="M240 440v24M340 440v24" stroke="' + met + '" stroke-width="3"/>';
      } else {
        s += '<rect x="250" y="50" width="300" height="170" rx="4" fill="#dfe6e8" stroke="' + met + '" stroke-width="6"/><path d="M290 70l60 60M330 70l80 80" stroke="#fff" stroke-opacity=".6" stroke-width="6"/>' +
          '<rect x="170" y="256" width="460" height="24" fill="url(#p-banc)" stroke="#252722" stroke-opacity=".3"/><ellipse cx="400" cy="254" rx="70" ry="10" fill="#f5f3ee" stroke="#252722" stroke-opacity=".25"/>' +
          '<rect x="190" y="280" width="420" height="70" fill="url(#p-marc)" stroke="#252722" stroke-opacity=".25"/><path d="M400 280V350" stroke="#252722" stroke-opacity=".25"/><rect x="370" y="308" width="20" height="3" fill="' + met + '"/><rect x="410" y="308" width="20" height="3" fill="' + met + '"/>' +
          '<path d="M400 244V226Q400 216 410 216H422" stroke="' + met + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
          '<rect x="650" y="120" width="90" height="70" fill="url(#p-banc)" stroke="#252722" stroke-opacity=".25"/><path d="M60 0V400" stroke="#252722" stroke-opacity=".2"/><path d="M110 60h-40v6h40z" fill="' + met + '"/><circle cx="90" cy="96" r="18" fill="none" stroke="' + met + '" stroke-width="3"/>';
      }
      s += '<rect width="800" height="520" fill="' + g('luz')[2] + '" style="mix-blend-mode:multiply"/>';
      svg.innerHTML = '<title id="ex-desc">Vista frontal ilustrativa: ' + AMB[amb].nome.toLowerCase() + ' com os acabamentos escolhidos</title>' + s;
      // resumo
      var lista = $('#ex-lista'), soma = 0, n = 0;
      lista.innerHTML = AMB[amb].grupos.map(function (k) { var m = g(k); if (m[4]) { soma += m[4]; n++; } return '<li><span>' + NOMES[k] + '</span><b>' + esc(m[1]) + '</b></li>'; }).join('');
      var med = soma / n, nivel = med < 1.8 ? 'Essencial' : med < 2.5 ? 'Intermediário' : 'Alto padrão';
      $('#ex-nivel').textContent = 'Padrão de acabamento desta combinação: ' + nivel + '. Referência ilustrativa; o custo real sai do projeto executivo e das cotações.';
    }
    function grupos() {
      var box = $('#ex-grupos');
      box.innerHTML = AMB[amb].grupos.map(function (k) {
        return '<fieldset><legend>' + NOMES[k] + '</legend><div class="amostras">' + M[k].map(function (m) {
          var fundo = k === 'luz' ? (m[0] === '2700' ? '#f4cf9c' : m[0] === '3000' ? '#f7e3c4' : '#eef2f5') : m[2];
          return '<label><input type="radio" name="ex-' + k + '" value="' + m[0] + '"' + (esc2[k] === m[0] ? ' checked' : '') + '><i style="background:' + fundo + '"></i>' + esc(m[1]) + '</label>';
        }).join('') + '</div></fieldset>';
      }).join('');
    }
    function trocaAmb(a) {
      amb = a; esc2 = JSON.parse(JSON.stringify(AMB[a].padrao));
      $$('.expl-abas [role="tab"]').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.amb === a)); });
      grupos(); desenha();
    }
    $('.expl-abas').addEventListener('click', function (e) { var b = e.target.closest('[data-amb]'); if (b) trocaAmb(b.dataset.amb); });
    $('#ex-grupos').addEventListener('change', function (e) { var k = e.target.name.replace('ex-', ''); esc2[k] = e.target.value; desenha(); });
    $('#ex-limpar').addEventListener('click', function () { trocaAmb(amb); });
    $('#ex-enviar').addEventListener('click', function () {
      var linhas = AMB[amb].grupos.map(function (k) { return '• ' + NOMES[k] + ': ' + busca(k, esc2[k])[1]; });
      whats('Olá, Monólito! Montei uma prancha no explorador de acabamentos do site.\n• Ambiente: ' + AMB[amb].nome + '\n' + linhas.join('\n') + '\nQuero conversar com a arquiteta sobre essa combinação.');
    });
    trocaAmb('cozinha');
  }

  // ---------- pedido de orçamento ----------
  var form = $('#orc');
  if (form) {
    var resumo = $('#orc-resumo'), msgBox = $('.form-msg', form), texto = '';
    var erro = function (el, m) {
      var c = el.closest('.campo, fieldset'), sp = c && $('.erro-c', c);
      if (el.setAttribute && el.tagName !== 'FIELDSET') el.setAttribute('aria-invalid', m ? 'true' : 'false');
      if (sp) sp.textContent = m || '';
      return !m;
    };
    var val = function (n) { var el = form.elements[n]; return el ? String(el.value || '').trim() : ''; };
    function valida() {
      var ok = true, primeiro = null;
      var chk = function (el, m) { var r = erro(el, m); if (!r && !primeiro) primeiro = el; ok = ok && r; };
      chk(form.elements.nome, val('nome').length < 2 ? 'Escreva seu nome.' : '');
      chk(form.elements.email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val('email')) ? '' : 'Confira o e-mail (ex.: nome@email.com).');
      var dig = val('tel').replace(/\D/g, '');
      chk(form.elements.tel, dig.length >= 10 && dig.length <= 13 ? '' : 'Informe o WhatsApp com DDD.');
      chk(form.elements.cidade, val('cidade').length < 2 ? 'Informe a cidade do projeto.' : '');
      var tipo = $('input[name="tipo"]:checked', form), fsT = $('input[name="tipo"]', form).closest('fieldset');
      var rT = erro(fsT, tipo ? '' : 'Escolha o tipo de projeto.'); if (!rT && !primeiro) primeiro = $('input[name="tipo"]', form); ok = ok && rT;
      var area = val('area');
      if (area) chk(form.elements.area, +area >= 10 && +area <= 20000 ? '' : 'Informe uma área entre 10 e 20.000 m².'); else erro(form.elements.area, '');
      if (!form.elements.ok.checked) { ok = false; if (!primeiro) primeiro = form.elements.ok; }
      msgBox.className = 'form-msg' + (ok ? '' : ' erro');
      msgBox.textContent = ok ? '' : (form.elements.ok.checked ? 'Confira os campos marcados.' : 'Confira os campos marcados e aceite a política de privacidade para continuar.');
      if (primeiro) primeiro.focus();
      return ok;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!valida()) { resumo.hidden = true; return; }
      var nec = $$('input[name="nec"]:checked', form).map(function (x) { return x.value; });
      var dados = [['Nome', val('nome')], ['E-mail', val('email')], ['WhatsApp', val('tel')], ['Cidade', val('cidade')], ['Tipo de projeto', $('input[name="tipo"]:checked', form).value],
        ['Área aproximada', val('area') ? val('area') + ' m²' : 'não informada'], ['Etapa atual', val('etapa') || 'não informada'], ['Investimento previsto', val('faixa') || 'prefere conversar antes'],
        ['Precisa de', nec.length ? nec.join(', ') : 'a definir'], ['Mais detalhes', val('msg') || '—']];
      $('#orc-dl').innerHTML = dados.map(function (d) { return '<dt>' + d[0] + '</dt><dd>' + esc(d[1]) + '</dd>'; }).join('');
      texto = 'Olá, Monólito! Quero solicitar uma conversa sobre meu projeto.\n' + dados.map(function (d) { return '• ' + d[0] + ': ' + d[1]; }).join('\n');
      $('#orc-mail').href = 'mailto:contato@monolito.exemplo?subject=' + encodeURIComponent('Pedido de projeto: ' + dados[4][1] + ' em ' + dados[3][1]) + '&body=' + encodeURIComponent(texto);
      resumo.hidden = false; resumo.focus();
      resumo.scrollIntoView({ block: 'nearest' });
    });
    form.addEventListener('input', function (e) { if (e.target.getAttribute('aria-invalid') === 'true') erro(e.target, ''); });
    form.addEventListener('change', function (e) { if (e.target.name === 'tipo') erro(e.target.closest('fieldset'), ''); });
    $('#orc-wa').addEventListener('click', function () { whats(texto); });
    $('#orc-editar').addEventListener('click', function () { resumo.hidden = true; form.elements.nome.focus(); });
  }
})();
