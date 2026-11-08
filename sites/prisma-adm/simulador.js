/* Prisma · simulador da carteira: arraste imóveis para "Com a Prisma" e arraste vacância e taxa no gráfico.
   Mouse, toque (pointer events) e teclado (Enter move o imóvel; setas movem os controles). Dados de exemplo. */
(function () {
  'use strict';
  var raiz = document.getElementById('simulador');
  if (!raiz) return;
  var reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IMOVEIS = [
    { id: 'a', nome: 'Apartamento 2 quartos', onde: 'Nova Aliança', aluguel: 2300, valor: 480000 },
    { id: 'b', nome: 'Studio mobiliado', onde: 'Vila Amélia', aluguel: 1450, valor: 260000 },
    { id: 'c', nome: 'Casa térrea 3 quartos', onde: 'Jardim Califórnia', aluguel: 4200, valor: 820000 },
    { id: 'd', nome: 'Sala comercial 60 m²', onde: 'Jardim Irajá', aluguel: 3100, valor: 560000 },
    { id: 'e', nome: 'Apartamento 3 quartos', onde: 'Jardim Botânico', aluguel: 3800, valor: 750000 }
  ];
  var VAC_PRISMA = 0.8, INAD_PROPRIA = 0.035;
  var st = { prisma: { a: true, c: true }, vac: 2.5, taxa: 8 };
  var brl = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var pct = function (v) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'; };

  raiz.innerHTML =
    '<p class="sim-instr" id="sim-instr">Arraste os imóveis para a coluna da Prisma (ou toque e use Enter). No gráfico, arraste os marcadores de vacância e de taxa; com o teclado, use as setas.</p>' +
    '<div class="sim">' +
      '<div class="sim-zonas"><div class="sim-zona" data-zona="proprio" aria-labelledby="z1"><h3 id="z1">Por conta própria</h3><p class="mini">Você anuncia, cobra e resolve</p><ul class="sim-lista"></ul></div>' +
      '<div class="sim-zona zona-prisma" data-zona="prisma" aria-labelledby="z2"><h3 id="z2">Administrar com a Prisma</h3><p class="mini">Cobrança, garantia, repasse e manutenção</p><ul class="sim-lista"></ul></div></div>' +
      '<div class="sim-res">' +
        '<div class="sim-ctl"><svg class="sim-svg" viewBox="0 0 480 196" aria-hidden="false"></svg></div>' +
        '<div class="sim-num">' +
          '<div><span>Repasse por mês</span><strong data-s="mes">R$ 0</strong></div>' +
          '<div><span>Rendimento ao ano</span><strong data-s="rend">0%</strong></div>' +
          '<div><span>Líquido no ano</span><strong data-s="ano">R$ 0</strong></div>' +
        '</div>' +
        '<div class="sim-comp" aria-live="polite">' +
          '<div class="sc-l"><span>Por conta própria</span><i><em class="sc-b sc-prop"></em></i><b data-s="prop">R$ 0</b></div>' +
          '<div class="sc-l"><span>Com a Prisma</span><i><em class="sc-b sc-pri"></em></i><b data-s="pri">R$ 0</b></div>' +
          '<p class="sc-dif" data-s="dif"></p>' +
        '</div>' +
        '<a href="#" class="bt bt-pri" id="sim-cta">Quero a Prisma nestes imóveis</a>' +
        '<p class="nota">Simulação de exemplo: vacância com a Prisma de 0,8 mês por ano e garantia cobrindo atrasos; por conta própria, perda média de 3,5% por atraso. Não é promessa de resultado.</p>' +
      '</div>' +
    '</div>';

  var $ = function (s) { return raiz.querySelector(s); };
  var listas = { proprio: raiz.querySelector('[data-zona="proprio"] .sim-lista'), prisma: raiz.querySelector('[data-zona="prisma"] .sim-lista') };

  function cartoes() {
    ['proprio', 'prisma'].forEach(function (z) {
      var itens = IMOVEIS.filter(function (i) { return !!st.prisma[i.id] === (z === 'prisma'); });
      listas[z].innerHTML = itens.map(function (i) {
        return '<li><button type="button" class="sim-card" data-id="' + i.id + '" aria-describedby="sim-instr" aria-label="' + i.nome + ', ' + i.onde + ', aluguel ' + brl(i.aluguel) + '. Enter para mover para ' + (z === 'prisma' ? 'por conta própria' : 'administrar com a Prisma') + '">' +
          '<span class="pega" aria-hidden="true">⠿</span><span class="sc-t"><b>' + i.nome + '</b><small>' + i.onde + ' · ' + brl(i.aluguel) + '/mês</small></span><span class="seta-c" aria-hidden="true">' + (z === 'prisma' ? '←' : '→') + '</span></button></li>';
      }).join('') || '<li class="vazio">' + (z === 'prisma' ? 'Arraste um imóvel para cá' : 'Todos os imóveis estão com a Prisma') + '</li>';
    });
  }

  // ---------- gráfico de controle (vacância e taxa) ----------
  var G = { l: 16, r: 464, y1: 62, y2: 154 };
  var VAC = { min: 0, max: 6, passo: 0.5 }, TAX = { min: 5, max: 12, passo: 0.5 };
  function xDe(v, f) { return G.l + (G.r - G.l) * (v - f.min) / (f.max - f.min); }
  function svgCtl() {
    var sv = $('.sim-svg'), larg = sv.getBoundingClientRect().width || 480, W = larg < 460 ? 380 : 480;
    sv.setAttribute('viewBox', '0 0 ' + W + ' 196'); G.r = W - 16;
    var s = '', mesW = (G.r - G.l) / 12;
    s += '<text class="s-rot" x="' + G.l + '" y="22">Vazio por conta própria: <tspan class="s-val">' + st.vac.toLocaleString('pt-BR') + (st.vac === 1 ? ' mês' : ' meses') + ' por ano</tspan></text>';
    for (var m = 0; m < 12; m++) {
      var vazio = Math.max(0, Math.min(1, st.vac - m));
      s += '<rect class="s-mes" x="' + (G.l + m * mesW + 1) + '" y="34" width="' + (mesW - 2) + '" height="26" rx="2"/>';
      if (vazio > 0) s += '<rect class="s-vazio" x="' + (G.l + m * mesW + 1) + '" y="34" width="' + ((mesW - 2) * vazio) + '" height="26" rx="2"/>';
    }
    var xv = G.l + mesW * st.vac;
    s += '<g class="s-pega" role="slider" tabindex="0" data-c="vac" aria-label="Meses vazios por ano, por conta própria" aria-valuemin="0" aria-valuemax="6" aria-valuenow="' + st.vac + '" aria-valuetext="' + st.vac.toLocaleString('pt-BR') + ' meses"><rect class="s-hit" x="' + (xv - 22) + '" y="26" width="44" height="42"/><line x1="' + xv + '" x2="' + xv + '" y1="30" y2="64"/><circle cx="' + xv + '" cy="47" r="11"/><path d="M' + (xv - 4) + ' 43v8M' + (xv + 4) + ' 43v8"/></g>';
    var xt = xDe(st.taxa, TAX);
    s += '<text class="s-rot" x="' + G.l + '" y="112">Taxa de administração: <tspan class="s-val">' + st.taxa.toLocaleString('pt-BR') + '%</tspan><tspan class="s-ref">' + (st.taxa === 8 ? '  · a da Prisma' : '  · Prisma: 8%') + '</tspan></text>';
    s += '<line class="s-trilho" x1="' + G.l + '" x2="' + G.r + '" y1="' + G.y2 + '" y2="' + G.y2 + '"/><line class="s-trilho-on" x1="' + G.l + '" x2="' + xt + '" y1="' + G.y2 + '" y2="' + G.y2 + '"/>';
    for (var t = TAX.min; t <= TAX.max; t++) s += '<line class="s-tick" x1="' + xDe(t, TAX) + '" x2="' + xDe(t, TAX) + '" y1="' + (G.y2 + 9) + '" y2="' + (G.y2 + 14) + '"/><text class="s-tx" x="' + xDe(t, TAX) + '" y="' + (G.y2 + 30) + '" text-anchor="middle">' + t + '%</text>';
    s += '<line class="s-marco" x1="' + xDe(8, TAX) + '" x2="' + xDe(8, TAX) + '" y1="' + (G.y2 - 12) + '" y2="' + (G.y2 + 12) + '"/>';
    s += '<g class="s-pega" role="slider" tabindex="0" data-c="taxa" aria-label="Taxa de administração" aria-valuemin="5" aria-valuemax="12" aria-valuenow="' + st.taxa + '" aria-valuetext="' + st.taxa.toLocaleString('pt-BR') + '%"><rect class="s-hit" x="' + (xt - 22) + '" y="' + (G.y2 - 22) + '" width="44" height="44"/><circle cx="' + xt + '" cy="' + G.y2 + '" r="11"/><path d="M' + (xt - 4) + ' ' + (G.y2 - 4) + 'v8M' + (xt + 4) + ' ' + (G.y2 - 4) + 'v8"/></g>';
    var svg = $('.sim-svg'), foco = document.activeElement && document.activeElement.closest && document.activeElement.closest('.s-pega');
    var qual = foco ? foco.getAttribute('data-c') : null;
    svg.innerHTML = s;
    if (qual) { var n = svg.querySelector('[data-c="' + qual + '"]'); if (n) n.focus(); }
  }

  // ---------- números ----------
  function contar(el, para, f) {
    var de = el._v || 0; el._v = para;
    if (reduz) { el.textContent = f(para); return; }
    cancelAnimationFrame(el._r); var t0 = performance.now();
    (function p(t) { var q = Math.min(1, (t - t0) / 650), e = 1 - Math.pow(1 - q, 3); el.textContent = f(de + (para - de) * e); if (q < 1) el._r = requestAnimationFrame(p); })(t0);
  }
  function calcular() {
    var sel = IMOVEIS.filter(function (i) { return st.prisma[i.id]; });
    var alug = sel.reduce(function (a, i) { return a + i.aluguel; }, 0), valor = sel.reduce(function (a, i) { return a + i.valor; }, 0);
    var prop = alug * (12 - st.vac) - alug * 12 * INAD_PROPRIA;
    var pri = alug * (12 - VAC_PRISMA) * (1 - st.taxa / 100);
    contar($('[data-s="mes"]'), pri / 12, brl);
    contar($('[data-s="ano"]'), pri, brl);
    contar($('[data-s="rend"]'), valor ? pri / valor * 100 : 0, pct);
    contar($('[data-s="prop"]'), Math.max(0, prop), brl);
    contar($('[data-s="pri"]'), pri, brl);
    var mx = Math.max(prop, pri, 1);
    $('.sc-prop').style.width = (sel.length ? 100 * Math.max(0, prop) / mx : 0) + '%';
    $('.sc-pri').style.width = (sel.length ? 100 * pri / mx : 0) + '%';
    var dif = pri - prop;
    $('[data-s="dif"]').innerHTML = !sel.length ? 'Arraste ao menos um imóvel para a coluna da Prisma.' :
      (dif >= 0 ? 'Com a Prisma, <b class="sobe">' + brl(dif) + ' a mais</b> por ano nestes ' + sel.length + ' imóve' + (sel.length > 1 ? 'is' : 'l') + ', sem anunciar nem cobrar.' :
        'Por conta própria rende <b class="desce">' + brl(-dif) + ' a mais</b>, se a vacância ficar em ' + st.vac.toLocaleString('pt-BR') + ' mês(es) e você cuidar de tudo.');
    var msg = 'Olá, Prisma! Simulei no site e quero a administração de: ' + (sel.map(function (i) { return i.nome + ' (' + i.onde + ')'; }).join('; ') || 'meus imóveis') + '. Repasse estimado: ' + brl(pri / 12) + ' por mês.';
    $('#sim-cta').setAttribute('data-wa', msg);
  }
  function tudo() { cartoes(); svgCtl(); calcular(); }

  // ---------- arrastar imóveis ----------
  function mover(id, paraPrisma, focar) {
    if (!!st.prisma[id] === paraPrisma) return;
    if (paraPrisma) st.prisma[id] = true; else delete st.prisma[id];
    cartoes(); calcular();
    var b = raiz.querySelector('.sim-card[data-id="' + id + '"]');
    if (b) { b.classList.add('chegou'); setTimeout(function () { b.classList.remove('chegou'); }, 400); if (focar) b.focus(); }
    var i = IMOVEIS.filter(function (x) { return x.id === id; })[0];
    if (window.PR) window.PR.aviso(i.nome + (paraPrisma ? ' agora com a Prisma.' : ' de volta para conta própria.'));
  }
  var arr = null, ignorar = false;
  raiz.addEventListener('pointerdown', function (e) {
    var c = e.target.closest('.sim-card'); if (!c || e.button > 0) return;
    arr = { id: c.dataset.id, el: c, x0: e.clientX, y0: e.clientY, ativo: false, fant: null, pid: e.pointerId };
  });
  addEventListener('pointermove', function (e) {
    if (!arr || e.pointerId !== arr.pid) return;
    var dx = e.clientX - arr.x0, dy = e.clientY - arr.y0;
    if (!arr.ativo) {
      if (Math.hypot(dx, dy) < 6) return;
      arr.ativo = true; var r = arr.el.getBoundingClientRect();
      arr.fant = arr.el.cloneNode(true); arr.fant.className = 'sim-card fantasma'; arr.fant.removeAttribute('data-id');
      arr.fant.style.width = r.width + 'px'; arr.fant.style.left = r.left + 'px'; arr.fant.style.top = r.top + 'px';
      document.body.appendChild(arr.fant); arr.el.classList.add('saiu'); raiz.classList.add('arrastando');
      var a0 = arr; a0.rolar = setInterval(function () { if (a0.y == null) return; var v = a0.y > innerHeight - 90 ? 14 : a0.y < 90 ? -14 : 0; if (v) { scrollBy(0, v); marcarZona(a0.x, a0.y); } }, 16);
    }
    e.preventDefault();
    arr.fant.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(1.5deg)';
    arr.x = e.clientX; arr.y = e.clientY; marcarZona(e.clientX, e.clientY);
  }, { passive: false });
  function marcarZona(x, y) { var z = zonaEm(x, y); raiz.querySelectorAll('.sim-zona').forEach(function (n) { n.classList.toggle('sobre', n === z); }); }
  function zonaEm(x, y) {
    var zs = raiz.querySelectorAll('.sim-zona');
    for (var i = 0; i < zs.length; i++) { var r = zs[i].getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return zs[i]; }
    return null;
  }
  function soltar(e) {
    if (!arr || e.pointerId !== arr.pid) return;
    var a = arr; arr = null;
    if (!a.ativo) return;
    clearInterval(a.rolar);
    var z = zonaEm(e.clientX, e.clientY);
    a.fant.remove(); a.el.classList.remove('saiu'); raiz.classList.remove('arrastando');
    raiz.querySelectorAll('.sim-zona').forEach(function (n) { n.classList.remove('sobre'); });
    ignorar = true; setTimeout(function () { ignorar = false; }, 60);
    if (z) mover(a.id, z.dataset.zona === 'prisma', false);
  }
  addEventListener('pointerup', soltar); addEventListener('pointercancel', soltar);
  raiz.addEventListener('click', function (e) {
    var c = e.target.closest('.sim-card'); if (!c) return;
    if (ignorar) return;
    mover(c.dataset.id, !st.prisma[c.dataset.id], true);
  });
  // evita rolagem da página no toque enquanto arrasta o cartão
  raiz.addEventListener('touchmove', function (e) { if (arr && arr.ativo) e.preventDefault(); }, { passive: false });

  // ---------- arrastar controles no gráfico ----------
  var svg = $('.sim-svg'), ctl = null;
  function valorDe(e, c) {
    var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    var p = pt.matrixTransform(svg.getScreenCTM().inverse());
    if (c === 'vac') { var v = (p.x - G.l) / ((G.r - G.l) / 12); return Math.max(VAC.min, Math.min(VAC.max, Math.round(v / VAC.passo) * VAC.passo)); }
    var t = TAX.min + (p.x - G.l) / (G.r - G.l) * (TAX.max - TAX.min); return Math.max(TAX.min, Math.min(TAX.max, Math.round(t / TAX.passo) * TAX.passo));
  }
  function ajustar(c, v) { if (st[c] === v) return; st[c] = v; svgCtl(); calcular(); }
  svg.addEventListener('pointerdown', function (e) {
    var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; var y = p.matrixTransform(svg.getScreenCTM().inverse()).y;
    var g = e.target.closest('.s-pega'); ctl = g ? g.getAttribute('data-c') : (y < 90 ? 'vac' : 'taxa');
    svg.setPointerCapture(e.pointerId); svg.classList.add('pegando'); ajustar(ctl, valorDe(e, ctl)); e.preventDefault();
  });
  svg.addEventListener('pointermove', function (e) { if (ctl) ajustar(ctl, valorDe(e, ctl)); });
  function fim() { ctl = null; svg.classList.remove('pegando'); }
  svg.addEventListener('pointerup', fim); svg.addEventListener('pointercancel', fim);
  svg.addEventListener('keydown', function (e) {
    var g = e.target.closest('.s-pega'); if (!g) return;
    var c = g.getAttribute('data-c'), f = c === 'vac' ? VAC : TAX, v = st[c];
    var mapa = { ArrowRight: f.passo, ArrowUp: f.passo, ArrowLeft: -f.passo, ArrowDown: -f.passo, PageUp: 1, PageDown: -1 };
    if (e.key === 'Home') v = f.min; else if (e.key === 'End') v = f.max; else if (mapa[e.key] != null) v += mapa[e.key]; else return;
    e.preventDefault(); ajustar(c, Math.max(f.min, Math.min(f.max, v)));
  });

  tudo();
})();
