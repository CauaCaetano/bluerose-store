/* VETRAX Engenharia · comportamento do site (demonstração, sem envio real de dados ou arquivos). */
(function () {
  'use strict';
  var doc = document, VX = window.VX || { obras: [], etapas: [], categorias: [] };
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || doc).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var num = function (n) { return Number(n).toLocaleString('pt-BR'); };
  var EMAIL = 'comercial@vetrax.exemplo';
  var seta = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13M11 5l5 5-5 5"/></svg>';

  function enviarWA(msg) { if (window.BR_WA) window.BR_WA(msg); }
  function mailto(assunto, corpo) { return 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(assunto) + '&body=' + encodeURIComponent(corpo.slice(0, 1800)); }
  function copiar(txt, bt) {
    var ok = function () { var t = bt.textContent; bt.textContent = 'Mensagem copiada'; setTimeout(function () { bt.textContent = t; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, function () { fallback(); });
    else fallback();
    function fallback() { var a = doc.createElement('textarea'); a.value = txt; doc.body.appendChild(a); a.select(); try { doc.execCommand('copy'); ok(); } catch (e) {} a.remove(); }
  }

  // ---------- menu ----------
  var bm = $('.bt-menu'), menu = $('#menu'), topo = $('.topo');
  function alturaTopo() { if (topo) doc.documentElement.style.setProperty('--topo-h', Math.max(0, topo.getBoundingClientRect().bottom) + 'px'); }
  if (bm && menu) {
    bm.addEventListener('click', function () {
      alturaTopo();
      var ab = bm.getAttribute('aria-expanded') !== 'true';
      bm.setAttribute('aria-expanded', ab); bm.setAttribute('aria-label', ab ? 'Fechar menu' : 'Abrir menu');
      menu.classList.toggle('aberto', ab); doc.body.style.overflow = ab ? 'hidden' : '';
    });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('aberto')) bm.click(); });
    addEventListener('resize', function () { if (innerWidth > 1080 && menu.classList.contains('aberto')) bm.click(); });
  }

  // ---------- revelar e contadores ----------
  function contar(el) {
    var alvo = parseFloat(el.getAttribute('data-conta')), dur = 1600, t0 = null, suf = el.getAttribute('data-suf') || '';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.firstChild.nodeValue = num(alvo); return; }
    function passo(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.firstChild.nodeValue = num(Math.round(alvo * e)) + suf;
      if (p < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (ents) {
    ents.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('vis');
      if (en.target.hasAttribute('data-conta')) contar(en.target);
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  function observar(els) { els.forEach(function (el) { if (io) io.observe(el); else { el.classList.add('vis'); if (el.hasAttribute('data-conta')) el.firstChild.nodeValue = num(el.getAttribute('data-conta')); } }); }

  // ---------- etapas do modelo de execução ----------
  var et = $('#etapas');
  if (et && VX.etapas.length) {
    var bts = VX.etapas.map(function (e, i) { return '<button type="button" class="etapa-bt" role="tab" id="et-' + i + '" aria-controls="et-painel" aria-selected="' + (i === 0) + '"><span class="no">' + String(i + 1).padStart(2, '0') + '</span><span class="nm">' + esc(e[0]) + '</span></button>'; }).join('');
    et.innerHTML = '<i class="barra" aria-hidden="true"></i>' + bts;
    et.setAttribute('role', 'tablist'); et.setAttribute('aria-label', 'Etapas do modelo de execução');
    var painel = $('#et-painel');
    var mostrar = function (i) {
      var e = VX.etapas[i];
      $$('.etapa-bt', et).forEach(function (b, k) { b.setAttribute('aria-selected', k === i); b.tabIndex = k === i ? 0 : -1; });
      $('.barra', et).style.width = (i / (VX.etapas.length - 1) * (100 - 100 / VX.etapas.length)) + '%';
      painel.setAttribute('aria-labelledby', 'et-' + i);
      painel.innerHTML = '<div><p class="cod claro"><b>' + String(i + 1).padStart(2, '0') + '/07</b> Etapa</p><h3>' + esc(e[0]) + '</h3><p>' + esc(e[1]) + '</p><p class="entrega">Entrega da etapa: ' + esc(e[3]) + '</p></div><ul>' + e[2].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    };
    et.addEventListener('click', function (ev) { var b = ev.target.closest('.etapa-bt'); if (b) mostrar($$('.etapa-bt', et).indexOf(b)); });
    et.addEventListener('keydown', function (ev) {
      var bs = $$('.etapa-bt', et), i = bs.indexOf(doc.activeElement); if (i < 0) return;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') { ev.preventDefault(); var n = (i + (ev.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length; mostrar(n); bs[n].focus(); }
    });
    mostrar(0);
    var mob = $('#etapas-mob');
    if (mob) mob.innerHTML = VX.etapas.map(function (e, i) { return '<details' + (i === 0 ? ' open' : '') + '><summary><b>' + String(i + 1).padStart(2, '0') + '</b>' + esc(e[0]) + '</summary><div class="det">' + esc(e[1]) + '<ul>' + e[2].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div></details>'; }).join('');
  }

  // ---------- cartões de obras ----------
  function cartao(o) {
    return '<a class="obra-card rev" href="obra.html?id=' + o.id + '"><figure><img src="img/' + o.fotos[0][0] + '.webp" alt="' + esc(o.fotos[0][1]) + ' (foto ilustrativa)" width="800" height="600" loading="lazy"><span class="tag">' + esc(o.tag) + '</span><span class="cod-o">' + o.cod + '</span></figure>' +
      '<div class="obra-card-tx"><h3>' + esc(o.nome) + '</h3><p class="local">' + esc(o.local) + '</p><dl class="ficha-mini"><div><dt>Área</dt><dd>' + num(o.area) + ' m²</dd></div><div><dt>Aço</dt><dd>' + num(o.aco) + ' t</dd></div><div><dt>Prazo</dt><dd>' + o.prazo + ' meses</dd></div></dl></div></a>';
  }
  var lista = $('#obras-lista');
  if (lista) {
    var lim = parseInt(lista.getAttribute('data-limite') || '0', 10), filtros = $('#filtros'), res = $('#filtros-res');
    var desenhar = function (cat) {
      var os = VX.obras.filter(function (o) { return !cat || cat === 'todas' || o.cats.indexOf(cat) >= 0; });
      if (lim) os = os.slice(0, lim);
      lista.innerHTML = os.length ? os.map(cartao).join('') : '<p class="vazio-msg">Nenhuma obra de exemplo nesta categoria.</p>';
      if (res) res.textContent = os.length + (os.length === 1 ? ' obra ilustrativa' : ' obras ilustrativas') + (cat && cat !== 'todas' ? ' em ' + (VX.categorias.filter(function (c) { return c.id === cat; })[0] || {}).nome : '');
      observar($$('.rev', lista));
    };
    if (filtros) {
      filtros.innerHTML = '<button type="button" class="filtro" data-cat="todas" aria-pressed="true">Todas <span>' + VX.obras.length + '</span></button>' + VX.categorias.map(function (c) {
        return '<button type="button" class="filtro" data-cat="' + c.id + '" aria-pressed="false">' + esc(c.nome) + ' <span>' + VX.obras.filter(function (o) { return o.cats.indexOf(c.id) >= 0; }).length + '</span></button>';
      }).join('');
      var aplicar = function (cat) {
        $$('.filtro', filtros).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-cat') === cat); });
        desenhar(cat);
      };
      filtros.addEventListener('click', function (e) {
        var b = e.target.closest('.filtro'); if (!b) return;
        var c = b.getAttribute('data-cat'); aplicar(c);
        try { history.replaceState(null, '', c === 'todas' ? 'obras.html' : 'obras.html?cat=' + c); } catch (er) {}
      });
      var q = new URLSearchParams(location.search).get('cat');
      aplicar(VX.categorias.some(function (c) { return c.id === q; }) ? q : 'todas');
    } else desenhar();
  }

  // ---------- planta ilustrativa (SVG gerado a partir dos dados) ----------
  function planta(o) {
    var p = o.planta, W = p.larg, L = p.comp;
    var VW = 1000, VH = 560, mx = 90, my = 90, aw = VW - 2 * mx, ah = VH - 2 * my, k = Math.min(aw / L, ah / W);
    var bw = L * k, bh = W * k, x0 = (VW - bw) / 2, y0 = (VH - bh) / 2, s = [];
    s.push('<svg viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="Planta ilustrativa do ' + esc(o.nome) + ': ' + num(L) + ' por ' + num(W) + ' metros, ' + p.docas + ' docas"><defs><pattern id="hach" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#DCE2E3" stroke-width="3"/></pattern><pattern id="hach2" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#E77B36" stroke-width="1.4"/></pattern></defs>');
    s.push('<rect x="' + (x0 - 40) + '" y="' + (y0 - 40) + '" width="' + (bw + 80) + '" height="' + (bh + 80) + '" fill="url(#hach)"/>');
    s.push('<rect x="' + x0 + '" y="' + y0 + '" width="' + bw + '" height="' + bh + '" fill="#fff" stroke="#153746" stroke-width="3"/>');
    var i, x, y;
    for (i = 0; i <= p.modulos; i++) {
      x = x0 + bw * i / p.modulos;
      s.push('<line x1="' + x + '" y1="' + (y0 - 52) + '" x2="' + x + '" y2="' + (y0 + bh + 10) + '" stroke="#738188" stroke-width=".8" stroke-dasharray="10 4 2 4"/>');
      s.push('<circle cx="' + x + '" cy="' + (y0 - 62) + '" r="10" fill="#fff" stroke="#738188"/><text x="' + x + '" y="' + (y0 - 58) + '" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="#29343A">' + (i + 1) + '</text>');
    }
    for (i = 0; i <= p.vaos; i++) {
      y = y0 + bh * i / p.vaos;
      s.push('<line x1="' + (x0 - 52) + '" y1="' + y + '" x2="' + (x0 + bw + 10) + '" y2="' + y + '" stroke="#738188" stroke-width=".8" stroke-dasharray="10 4 2 4"/>');
      s.push('<circle cx="' + (x0 - 62) + '" cy="' + y + '" r="10" fill="#fff" stroke="#738188"/><text x="' + (x0 - 62) + '" y="' + (y + 4) + '" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="#29343A">' + String.fromCharCode(65 + i) + '</text>');
      for (var j = 0; j <= p.modulos; j++) s.push('<rect x="' + (x0 + bw * j / p.modulos - 3) + '" y="' + (y - 3) + '" width="6" height="6" fill="#153746"/>');
    }
    if (p.mezanino) s.push('<rect x="' + (x0 + 6) + '" y="' + (y0 + 6) + '" width="' + (bw / p.modulos * 2 - 12) + '" height="' + (bh / p.vaos * 2 - 12) + '" fill="url(#hach2)" stroke="#E77B36"/>');
    var porLado = Math.ceil(p.docas / p.docasLados), dw = Math.min(16, bw / porLado * .6);
    for (var l = 0; l < p.docasLados; l++) {
      var yy = l === 0 ? y0 + bh : y0 - 14, n = l === 0 ? porLado : p.docas - porLado;
      for (i = 0; i < n; i++) { x = x0 + bw * (i + .5) / porLado - dw / 2; s.push('<rect x="' + x + '" y="' + yy + '" width="' + dw + '" height="14" fill="#E77B36"/>'); }
    }
    s.push('<line x1="' + x0 + '" y1="' + (y0 + bh + 58) + '" x2="' + (x0 + bw) + '" y2="' + (y0 + bh + 58) + '" stroke="#29343A"/><line x1="' + x0 + '" y1="' + (y0 + bh + 50) + '" x2="' + x0 + '" y2="' + (y0 + bh + 66) + '" stroke="#29343A"/><line x1="' + (x0 + bw) + '" y1="' + (y0 + bh + 50) + '" x2="' + (x0 + bw) + '" y2="' + (y0 + bh + 66) + '" stroke="#29343A"/>');
    s.push('<text x="' + (x0 + bw / 2) + '" y="' + (y0 + bh + 76) + '" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="12" fill="#29343A">' + num(L) + ' m</text>');
    s.push('<line x1="' + (x0 + bw + 40) + '" y1="' + y0 + '" x2="' + (x0 + bw + 40) + '" y2="' + (y0 + bh) + '" stroke="#29343A"/><text x="' + (x0 + bw + 52) + '" y="' + (y0 + bh / 2) + '" font-family="IBM Plex Mono, monospace" font-size="12" fill="#29343A" transform="rotate(90 ' + (x0 + bw + 52) + ' ' + (y0 + bh / 2) + ')" text-anchor="middle">' + num(W) + ' m</text>');
    s.push('<rect x="' + (x0 + bw / 2 - 190) + '" y="' + (y0 + bh / 2 - 22) + '" width="380" height="50" fill="#fff" stroke="#DCE2E3"/>');
    s.push('<text x="' + (x0 + bw / 2) + '" y="' + (y0 + bh / 2) + '" text-anchor="middle" font-family="Sora, sans-serif" font-size="16" font-weight="600" fill="#153746">' + esc(o.nome.toUpperCase()) + '</text>');
    s.push('<text x="' + (x0 + bw / 2) + '" y="' + (y0 + bh / 2 + 20) + '" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11" fill="#56636a">' + num(o.area) + ' m² · ' + p.vaos + ' vãos · ' + p.docas + ' docas</text>');
    s.push('</svg>');
    return s.join('');
  }

  // ---------- página da obra ----------
  var raizObra = $('#obra');
  if (raizObra) {
    var id = new URLSearchParams(location.search).get('id');
    var o = VX.obras.filter(function (x) { return x.id === id; })[0];
    if (!o) {
      raizObra.innerHTML = '<section class="sec"><div class="caixa"><p class="cod"><b>404</b> Obra não encontrada</p><h1>Esta obra não está na lista</h1><p class="lead">Escolha uma das obras ilustrativas abaixo.</p><div class="obras-grade">' + VX.obras.map(cartao).join('') + '</div></div></section>';
      observar($$('.rev', raizObra));
    } else {
      doc.title = o.nome + ' · Obra ilustrativa · VETRAX Engenharia';
      var md = $('meta[name="description"]'); if (md) md.setAttribute('content', o.resumo + ' Obra ilustrativa com dados fictícios.');
      var outras = VX.obras.filter(function (x) { return x.id !== o.id; });
      var wa = 'Olá, VETRAX Engenharia! Vi no site a obra ' + o.nome + ' (' + o.cod + ', ' + num(o.area) + ' m², ' + o.modelo + ') e quero conversar sobre um projeto parecido.';
      raizObra.innerHTML =
        '<section class="pag-topo"><div class="pag-topo-in"><div class="pag-topo-tx"><p class="trilha"><a href="index.html">Início</a> / <a href="obras.html">Obras</a> / ' + o.cod + '</p><p class="cod claro"><b>' + o.cod + '</b> ' + esc(o.tag) + '</p><h1>' + esc(o.nome) + '</h1><p>' + esc(o.resumo) + '</p><p><span class="selo-il">Obra ilustrativa · dados fictícios</span></p><div class="bts"><a class="bt bt-laranja" href="proposta.html?ref=' + o.id + '">Solicitar proposta parecida' + seta + '</a><a class="bt bt-claro" href="contato.html" data-wa="' + esc(wa) + '">Falar com um engenheiro</a></div></div>' +
        '<figure class="pag-topo-foto" style="margin:0"><img src="img/' + o.fotos[0][0] + '.webp" alt="' + esc(o.fotos[0][1]) + '" width="1600" height="1067" fetchpriority="high"><figcaption>Foto de banco livre, ilustrativa</figcaption></figure></div></section>' +
        '<div class="caixa"><dl class="obra-ficha"><div><dt>Área construída</dt><dd>' + num(o.area) + ' m²</dd></div><div><dt>Aço estrutural</dt><dd>' + num(o.aco) + ' t</dd></div><div><dt>Prazo de obra</dt><dd>' + o.prazo + ' meses</dd></div><div><dt>Contratação</dt><dd>' + esc(o.modelo) + '</dd></div><div><dt>Sistema</dt><dd>' + esc(o.sistema) + '</dd></div><div><dt>Local</dt><dd>' + esc(o.local) + '</dd></div><div><dt>Cliente</dt><dd>' + esc(o.cliente) + '</dd></div><div><dt>Código</dt><dd>' + o.cod + '</dd></div></dl></div>' +
        '<section class="sec"><div class="caixa duas"><div><p class="cod"><b>01</b> Escopo executado</p><h2>O que a VETRAX entregou</h2><ul class="lista-tec">' + o.escopo.map(function (x) { return '<li><span>' + esc(x) + '</span></li>'; }).join('') + '</ul></div>' +
        '<div><p class="cod"><b>02</b> Desafios e soluções</p><h2>Onde a engenharia fez diferença</h2>' + o.desafios.map(function (d) { return '<div class="cartao" style="margin-bottom:16px"><h3>' + esc(d[0]) + '</h3><p>' + esc(d[1]) + '</p></div>'; }).join('') + '</div></div></section>' +
        '<section class="sec sec-branco"><div class="caixa"><div class="cab"><div><p class="cod"><b>03</b> Galeria</p><h2>Imagens de referência</h2></div><p class="lead">Fotos de banco livre usadas para ilustrar o tipo de obra. No site real, entram as fotos das obras da empresa.</p></div><div class="galeria">' +
        o.fotos.map(function (f, i) { return '<button type="button" data-i="' + i + '" aria-label="Ampliar foto: ' + esc(f[1]) + '"><img src="img/' + f[0] + '.webp" alt="' + esc(f[1]) + '" width="800" height="600" loading="lazy"></button>'; }).join('') + '</div></div></section>' +
        '<section class="sec sec-malha"><div class="caixa"><div class="cab"><div><p class="cod"><b>04</b> Planta ilustrativa</p><h2>Implantação esquemática</h2></div><p class="lead">Desenho gerado a partir dos dados de exemplo: eixos, pilares, docas e dimensões aproximadas. Sem escala e sem valor de projeto.</p></div><div class="planta-caixa"><p class="planta-dica">Arraste para o lado para ver a planta inteira</p><div class="planta-rolar">' + planta(o) + '</div><div class="planta-leg"><span><i style="background:#153746"></i>Pilares</span><span><i style="background:#E77B36"></i>Docas</span>' + (o.planta.mezanino ? '<span><i style="background:repeating-linear-gradient(-45deg,#E77B36 0 2px,#fff 2px 5px)"></i>Mezanino</span>' : '') + '<span><i style="background:#DCE2E3"></i>Pátio e acessos</span></div></div>' +
        '<div class="cta-faixa"><div><h3>Tem uma operação parecida?</h3><p>Envie as premissas e receba um estudo de prazo e investimento.</p></div><a class="bt bt-laranja" href="proposta.html?ref=' + o.id + '">Solicitar proposta' + seta + '</a></div></div></section>' +
        '<section class="sec"><div class="caixa"><p class="cod"><b>05</b> Outras obras</p><h2>Mais obras ilustrativas</h2><div class="obras-grade">' + outras.slice(0, 3).map(cartao).join('') + '</div><p style="margin-top:24px"><a class="bt bt-linha" href="obras.html">Ver todas as obras' + seta + '</a></p></div></section>';
      observar($$('.rev', raizObra));
      var gal = $('.galeria', raizObra); gal.classList.add('g' + o.fotos.length); galeria(gal, o.fotos);
    }
  }

  // ---------- lightbox ----------
  function galeria(g, fotos) {
    if (!g) return;
    var luz = doc.createElement('div'), i = 0, antes = null;
    luz.className = 'luz'; luz.hidden = true; luz.setAttribute('role', 'dialog'); luz.setAttribute('aria-modal', 'true'); luz.setAttribute('aria-label', 'Foto ampliada');
    luz.innerHTML = '<figure style="margin:0"><img alt=""><figcaption></figcaption></figure><button type="button" class="l-x" aria-label="Fechar">×</button><button type="button" class="l-ant" aria-label="Foto anterior">‹</button><button type="button" class="l-prox" aria-label="Próxima foto">›</button>';
    doc.body.appendChild(luz);
    var ver = function (n) { i = (n + fotos.length) % fotos.length; $('img', luz).src = 'img/' + fotos[i][0] + '.webp'; $('img', luz).alt = fotos[i][1]; $('figcaption', luz).textContent = (i + 1) + '/' + fotos.length + ' · ' + fotos[i][1] + ' · foto ilustrativa (Pexels)'; };
    var fechar = function () { luz.hidden = true; doc.body.style.overflow = ''; if (antes) antes.focus(); };
    g.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; antes = b; ver(+b.getAttribute('data-i')); luz.hidden = false; doc.body.style.overflow = 'hidden'; $('.l-x', luz).focus(); });
    luz.addEventListener('click', function (e) { if (e.target === luz || e.target.closest('.l-x')) fechar(); else if (e.target.closest('.l-ant')) ver(i - 1); else if (e.target.closest('.l-prox')) ver(i + 1); });
    doc.addEventListener('keydown', function (e) { if (luz.hidden) return; if (e.key === 'Escape') fechar(); if (e.key === 'ArrowLeft') ver(i - 1); if (e.key === 'ArrowRight') ver(i + 1); });
    var x0 = null;
    luz.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    luz.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) ver(i + (dx < 0 ? 1 : -1)); x0 = null; });
  }
  $$('.galeria[data-fotos]').forEach(function (g) {
    var fotos = $$('img', g).map(function (im) { return [im.getAttribute('src').replace(/^img\/|\.webp$/g, ''), im.alt]; });
    $$('button', g).forEach(function (b, k) { b.setAttribute('data-i', k); });
    galeria(g, fotos);
  });

  // ---------- validação comum ----------
  function validar(campos) {
    var ok = true, primeiro = null;
    campos.forEach(function (el) {
      var c = el.closest('.campo'), msg = '', v = (el.value || '').trim();
      if (el.type === 'checkbox') { if (el.required && !el.checked) msg = 'Marque para continuar.'; }
      else if (el.required && !v) msg = 'Preencha este campo.';
      else if (v && el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = 'Confira o e-mail.';
      else if (v && el.getAttribute('data-tipo') === 'fone' && v.replace(/\D/g, '').length < 10) msg = 'Informe DDD e número.';
      else if (v && el.getAttribute('data-tipo') === 'cnpj' && v.replace(/\D/g, '').length !== 14) msg = 'O CNPJ tem 14 números.';
      else if (v && el.type === 'number' && el.min && +v < +el.min) msg = 'Valor mínimo: ' + el.min + '.';
      if (c) { c.classList.toggle('invalido', !!msg); var e = $('.erro', c); if (e) e.textContent = msg; }
      else if (msg) { el.setAttribute('aria-invalid', 'true'); }
      if (msg) { ok = false; el.setAttribute('aria-invalid', 'true'); if (!primeiro) primeiro = el; } else el.removeAttribute('aria-invalid');
    });
    if (primeiro) primeiro.focus();
    return ok;
  }
  function mascaraFone(el) { el.addEventListener('input', function () { var d = el.value.replace(/\D/g, '').slice(0, 11); el.value = d.length > 6 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4) : d.length > 2 ? '(' + d.slice(0, 2) + ') ' + d.slice(2) : d; }); }
  function mascaraCnpj(el) { el.addEventListener('input', function () { var d = el.value.replace(/\D/g, '').slice(0, 14), r = d; if (d.length > 12) r = d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5'); else if (d.length > 8) r = d.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4'); else if (d.length > 5) r = d.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3'); else if (d.length > 2) r = d.replace(/^(\d{2})(\d{0,3})/, '$1.$2'); el.value = r; }); }
  $$('[data-tipo="fone"]').forEach(mascaraFone);
  $$('[data-tipo="cnpj"]').forEach(mascaraCnpj);
  function rotulo(el) { var c = el.closest('.campo'), l = c && $('label, .rot', c); return l ? l.childNodes[0].nodeValue.trim().replace(/\s*\*$/, '') : el.name; }
  function valor(el) { if (el.tagName === 'SELECT') return el.value ? el.options[el.selectedIndex].text : ''; return (el.value || '').trim(); }
  function painelResumo(alvo, titulo, pares, msg, assunto) {
    alvo.innerHTML = '<div class="resumo" tabindex="-1"><p class="cod"><b>OK</b> Resumo conferido</p><h3>' + esc(titulo) + '</h3><dl>' + pares.map(function (p) { return '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]).replace(/\n/g, '<br>') + '</dd>'; }).join('') + '</dl><pre>' + esc(msg) + '</pre>' +
      '<div class="bts" style="margin-top:16px"><button type="button" class="bt bt-laranja r-wa">Enviar pelo WhatsApp' + seta + '</button><a class="bt bt-azul r-mail" href="' + mailto(assunto, msg) + '">Enviar por e-mail</a><button type="button" class="bt bt-linha r-cop">Copiar mensagem</button></div>' +
      '<p class="aviso" style="margin-bottom:0"><b>Demonstração.</b> Nada foi enviado nem gravado. O WhatsApp é simulado e o e-mail abre no seu programa de e-mail com um endereço de exemplo. No site real, a mensagem chega no WhatsApp e no e-mail comercial da construtora.</p></div>';
    alvo.hidden = false;
    $('.r-wa', alvo).addEventListener('click', function () { enviarWA(msg); });
    $('.r-cop', alvo).addEventListener('click', function () { copiar(msg, this); });
    $('.resumo', alvo).focus();
  }

  // ---------- contato ----------
  var fc = $('form[data-form="contato"]');
  if (fc) {
    fc.addEventListener('submit', function (e) {
      e.preventDefault();
      var cs = $$('input, select, textarea', fc).filter(function (x) { return x.name; });
      if (!validar(cs)) return;
      var pares = cs.filter(function (x) { return x.type !== 'checkbox' && valor(x); }).map(function (x) { return [rotulo(x), valor(x)]; });
      var msg = 'Olá, VETRAX Engenharia! Vim pelo site.\n' + pares.map(function (p) { return '• ' + p[0] + ': ' + p[1]; }).join('\n');
      painelResumo($('#contato-res'), 'Sua mensagem está pronta', pares, msg, 'Contato pelo site · ' + valor(fc.elements.empresa));
    });
  }

  // ---------- assistente: modelo de contratação ----------
  var qz = $('#quiz');
  if (qz) {
    var MODELOS = {
      turnkey: ['Turnkey (chave na mão)', 'Você já tem o terreno e quer um único responsável por projeto, aprovações, obra e entrega, com preço e prazo fechados.', 'turnkey.html'],
      bts: ['Build to suit', 'Você prefere não imobilizar capital: um investidor compra o terreno e paga a obra, e sua empresa aluga o prédio feito sob medida por contrato longo.', 'build-to-suit.html'],
      estrutura: ['Estrutura metálica ou pré-moldada', 'Você já tem projeto e construtora ou quer contratar por pacote: fornecemos e montamos a estrutura com engenharia própria.', 'estruturas-metalicas.html'],
      pav: ['Pavimentação e infraestrutura', 'O prédio existe; o gargalo está no pátio, nas vias internas ou na drenagem.', 'pavimentacao.html']
    };
    qz.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = qz.elements, t = f.terreno.value, c = f.capital.value, s = f.escopo.value, out = $('#quiz-res');
      if (!t || !c || !s) { out.hidden = false; out.innerHTML = '<p style="margin:0">Responda as três perguntas para ver a indicação.</p>'; return; }
      var k = s === 'pav' ? 'pav' : s === 'estrutura' ? 'estrutura' : (c === 'nao' || t === 'nao') ? 'bts' : 'turnkey';
      var m = MODELOS[k];
      out.hidden = false;
      out.innerHTML = '<p class="cod claro"><b>Indicação</b> Modelo sugerido</p><h3>' + m[0] + '</h3><p>' + m[1] + '</p><div class="bts"><a class="bt bt-laranja" href="' + m[2] + '">Entender o modelo' + seta + '</a><a class="bt bt-claro" href="proposta.html?modelo=' + k + '">Solicitar proposta</a></div><p style="margin:14px 0 0;font-size:14px;color:#a9bcc3">Indicação automática com base nas suas respostas. A definição final sai do diagnóstico com o engenheiro.</p>';
    });
  }

  // ---------- proposta (RFP) ----------
  var rfp = $('#rfp');
  if (rfp) {
    var passo = 0, etapasR = $$('.rfp-etapa', rfp), lis = $$('.rfp-passos li'), barra = $('.rfp-barra i'), arquivos = [];
    var EXT = ['pdf', 'xlsx', 'xls', 'docx', 'dwg', 'zip'], MAX = 25 * 1024 * 1024, MAXT = 100 * 1024 * 1024, MAXN = 10;
    var q = new URLSearchParams(location.search), ref = q.get('ref'), mod = q.get('modelo');
    if (ref) { var ob = VX.obras.filter(function (x) { return x.id === ref; })[0]; if (ob && rfp.elements.descricao) rfp.elements.descricao.value = 'Referência: obra ilustrativa ' + ob.nome + ' (' + ob.cod + ').\n'; }
    if (mod && rfp.elements.modelo) { var mp = { turnkey: 'Turnkey', bts: 'Build to suit', estrutura: 'Somente estrutura (metálica ou pré-moldada)', pav: 'Pavimentação e infraestrutura' }[mod]; if (mp) rfp.elements.modelo.value = mp; }
    var ir = function (n, inicial) {
      passo = n;
      etapasR.forEach(function (s, i) { s.hidden = i !== n; });
      lis.forEach(function (li, i) { li.classList.toggle('ativo', i === n); li.classList.toggle('feito', i < n); if (i === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
      barra.style.width = ((n + 1) / etapasR.length * 100) + '%';
      $('.rfp-prog').setAttribute('aria-label', 'Etapa ' + (n + 1) + ' de ' + etapasR.length);
      if (n === etapasR.length - 1) montarResumo();
      if (inicial) return;
      var h = $('h2', etapasR[n]); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
      rfp.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    };
    rfp.addEventListener('click', function (e) {
      if (e.target.closest('.r-prox')) {
        var cs = $$('input, select, textarea', etapasR[passo]).filter(function (x) { return x.name && x.type !== 'file'; });
        if (passo === 2 && !$$('input[name="escopo"]:checked', rfp).length) { var er = $('#escopo-erro'); er.textContent = 'Marque pelo menos um item do escopo.'; er.scrollIntoView({ block: 'center' }); return; }
        if (validar(cs)) ir(passo + 1);
      }
      if (e.target.closest('.r-volta')) ir(passo - 1);
    });
    rfp.addEventListener('change', function (e) { if (e.target.name === 'escopo') $('#escopo-erro').textContent = ''; });
    rfp.addEventListener('submit', function (e) { e.preventDefault(); });

    // anexos: só seleção local, nada é enviado
    var zona = $('#solta'), inp = $('#anexos'), ul = $('#arquivos'), errs = $('#arq-erros'), tot = $('#arq-total');
    var tam = function (b) { return b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; };
    var listar = function () {
      ul.innerHTML = arquivos.map(function (f, i) { var x = f.name.split('.').pop().toUpperCase(); return '<li><span class="ext">' + esc(x) + '</span><span class="nome">' + esc(f.name) + '</span><span class="tam">' + tam(f.size) + '</span><button type="button" data-rm="' + i + '" aria-label="Remover ' + esc(f.name) + '">Remover</button></li>'; }).join('');
      var t = arquivos.reduce(function (a, f) { return a + f.size; }, 0);
      tot.textContent = arquivos.length ? arquivos.length + ' arquivo(s) · ' + tam(t) + ' de 100 MB' : 'Nenhum arquivo selecionado (opcional).';
    };
    var somar = function (lista) {
      var msgs = [];
      [].forEach.call(lista, function (f) {
        var x = (f.name.split('.').pop() || '').toLowerCase(), t = arquivos.reduce(function (a, g) { return a + g.size; }, 0);
        if (EXT.indexOf(x) < 0) msgs.push(f.name + ': formato não aceito (use PDF, XLSX, XLS, DOCX, DWG ou ZIP).');
        else if (f.size > MAX) msgs.push(f.name + ': ' + tam(f.size) + ' passa do limite de 25 MB por arquivo.');
        else if (t + f.size > MAXT) msgs.push(f.name + ': o total passaria de 100 MB.');
        else if (arquivos.length >= MAXN) msgs.push(f.name + ': limite de 10 arquivos.');
        else if (arquivos.some(function (g) { return g.name === f.name && g.size === f.size; })) msgs.push(f.name + ': já está na lista.');
        else arquivos.push(f);
      });
      errs.innerHTML = msgs.map(esc).join('<br>');
      listar();
    };
    zona.addEventListener('click', function (e) { if (!e.target.closest('label')) inp.click(); });
    zona.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
    inp.addEventListener('change', function () { somar(inp.files); inp.value = ''; });
    ['dragenter', 'dragover'].forEach(function (t) { zona.addEventListener(t, function (e) { e.preventDefault(); zona.classList.add('sobre'); }); });
    ['dragleave', 'drop'].forEach(function (t) { zona.addEventListener(t, function (e) { e.preventDefault(); zona.classList.remove('sobre'); }); });
    zona.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files) somar(e.dataTransfer.files); });
    ul.addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (!b) return; arquivos.splice(+b.getAttribute('data-rm'), 1); listar(); });
    listar();
    window.VX_RFP_ADD = somar; // usado nos testes automáticos

    var montarResumo = function () {
      var grupos = etapasR.slice(0, 3).map(function (s) {
        return [($('h2', s) || {}).textContent, $$('input, select, textarea', s).filter(function (x) { return x.name && x.type !== 'file' && x.type !== 'checkbox' && valor(x); }).map(function (x) { return [rotulo(x), valor(x)]; })];
      });
      var esc2 = $$('input[name="escopo"]:checked', rfp).map(function (x) { return x.value; });
      var pares = [];
      grupos.forEach(function (g) { pares = pares.concat(g[1]); });
      pares.push(['Escopo', esc2.join(', ')]);
      pares.push(['Anexos', arquivos.length ? arquivos.map(function (f) { return f.name + ' (' + tam(f.size) + ')'; }).join('\n') : 'Nenhum']);
      var msg = 'Olá, VETRAX Engenharia! Solicito proposta pelo site.\n' + pares.map(function (p) { return '• ' + p[0] + ': ' + p[1].replace(/\n/g, '; '); }).join('\n') + (arquivos.length ? '\n\nTenho ' + arquivos.length + ' arquivo(s) de projeto/caderno de encargos para enviar.' : '');
      var alvo = $('#rfp-resumo');
      painelResumo(alvo, 'Confira a solicitação antes de enviar', pares, msg, 'Solicitação de proposta · ' + valor(rfp.elements.empresa));
      var av = doc.createElement('p'); av.className = 'aviso';
      av.innerHTML = '<b>Sobre os anexos:</b> nesta demonstração os arquivos ficam só no seu navegador e não são transmitidos. No site real, eles vão para um armazenamento seguro da construtora e o engenheiro recebe o link junto com a solicitação.';
      $('.resumo', alvo).appendChild(av);
    };
    ir(0, true);
  }

  observar($$('.rev, [data-conta]'));
})();
