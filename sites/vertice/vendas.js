// Vértice · ferramentas de venda do lançamento (todas DEMONSTRAÇÕES com dados de exemplo, rodando só no navegador):
//  1. tabela das 72 unidades (18 andares × 4 finais), com planta, área, vagas, vista, preço e situação;
//  2. espelho de vendas por andar e por unidade, com legenda, filtros, lista e painel da unidade (interesse pelo WhatsApp);
//  3. plantas desenhadas em vetor, com zoom, arrastar, pinça no celular e tela cheia (o mesmo zoom serve à galeria);
//  4. simulador de pagamento na planta (entrada, mensais, intermediárias, chaves e correção pelo INCC como hipótese);
//  5. captação de contatos para mídia paga (apresentação e tabela em troca dos dados) e a apresentação liberada;
//  6. obras entregues da incorporadora (credibilidade) e números da obra.
// No site real, o espelho e a tabela vêm do sistema de vendas da incorporadora (CV CRM, Anapro, Construtor de Vendas… por API)
// e os contatos vão para o CRM e para o WhatsApp do corretor de plantão.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var brl = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var mi = function (v) { return 'R$ ' + (v / 1e6).toFixed(2).replace('.', ',') + ' mi'; };
  var lim = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var largo = matchMedia('(min-width: 1001px)');
  var lerLS = function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  var gravarLS = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  var params = new URLSearchParams(location.search);
  var DEMO = 'Demonstração com dados de exemplo. No site real, liga no sistema de vendas da incorporadora (CV CRM, Anapro, Construtor de Vendas… por API).';

  // ───────────────────────── 1 · dados das unidades ─────────────────────────
  var ST = { d: 'disponível', r: 'reservada', v: 'vendida' };
  // situação de cada andar, do 1º ao 18º, finais 1 a 4 (v vendida, r reservada, d disponível)
  var MAPA = 'vvvv vvvd vvrv vdvv vvvr dvvv vrdv dvvd vddv rvdd dvrd vddd drdv ddvd vddr ddvd rddv vdrd'.split(' ');
  var PLANTAS = {
    A: { nome: 'Planta A', area: 128, suites: 3, vagas: 2, finais: 'final 1', resumo: '3 suítes, living de 41 m² e varanda gourmet na quina de vidro, de frente para o mar' },
    B: { nome: 'Planta B', area: 92, suites: 2, vagas: 1, finais: 'finais 2 e 3', resumo: '2 suítes, living integrado à varanda gourmet e cozinha fechada com área de serviço' },
    C: { nome: 'Planta C', area: 128, suites: 3, vagas: 2, finais: 'final 4', resumo: 'a planta A espelhada, com vista lateral do mar e a suíte master voltada para o nascente' }
  };
  var FINAL = {
    1: { planta: 'A', vista: 'mar frontal', base: 1690000, esp: false },
    2: { planta: 'B', vista: 'mar lateral', base: 1290000, esp: false },
    3: { planta: 'B', vista: 'cidade e morros', base: 1250000, esp: true },
    4: { planta: 'C', vista: 'mar lateral', base: 1640000, esp: true }
  };
  var UN = [];
  for (var a = 1; a <= 18; a++) for (var f = 1; f <= 4; f++) {
    var F = FINAL[f], P = PLANTAS[F.planta], ter = a >= 15 && P.suites === 3, area = P.area + (ter ? 18 : 0);
    var preco = Math.round(F.base * (1 + 0.012 * (a - 1)) * (ter ? 1.08 : 1) / 1000) * 1000;
    UN.push({ cod: String(a * 100 + f), andar: a, final: f, planta: F.planta, area: area, suites: P.suites, vagas: P.vagas, vista: F.vista, esp: F.esp,
      terraco: ter, preco: preco, m2: preco / area, st: MAPA[a - 1].charAt(f - 1), cond: Math.round(area * 14 / 10) * 10 });
  }
  var porCod = function (c) { for (var i = 0; i < UN.length; i++) if (UN[i].cod === String(c)) return UN[i]; return null; };
  var conta = { d: 0, r: 0, v: 0 }; UN.forEach(function (u) { conta[u.st]++; });
  var disp = UN.filter(function (u) { return u.st === 'd'; });
  var aPartir = Math.min.apply(null, disp.map(function (u) { return u.preco; }));
  var vendido = Math.round(conta.v / 72 * 100);
  var nomeUn = function (u) { return 'unidade ' + u.cod + ' (' + u.andar + 'º andar, ' + PLANTAS[u.planta].nome + ', ' + u.area + ' m², ' + u.suites + ' suítes, ' + mi(u.preco) + ')'; };
  var parecidas = function (u, n) {
    return disp.filter(function (o) { return o.cod !== u.cod && o.suites === u.suites; })
      .sort(function (x, y) { return Math.abs(x.andar - u.andar) - Math.abs(y.andar - u.andar); }).slice(0, n || 3);
  };

  // números em qualquer página: [data-n="disp|res|vend|vendido|apartir|vendidas"]
  var NUM = { disp: conta.d, res: conta.r, vend: conta.v, vendido: vendido + '%', apartir: mi(aPartir), vendidas: conta.v + ' de 72', mensal: brl(aPartir * 0.24 / 24) };
  $$('[data-n]').forEach(function (el) { if (NUM[el.dataset.n] != null) el.textContent = NUM[el.dataset.n]; });
  $$('[data-vend]').forEach(function (el) { el.textContent = conta.v + ' de 72'; });
  $$('[data-barra-vendas]').forEach(function (el) {
    el.innerHTML = '<i class="bv-v" style="width:' + (conta.v / 72 * 100) + '%"></i><i class="bv-r" style="width:' + (conta.r / 72 * 100) + '%"></i><i class="bv-d" style="width:' + (conta.d / 72 * 100) + '%"></i>';
  });

  // cômodos em metros: [x, y, largura, profundidade, nome, tipo]; y = 0 é a fachada da vista
  var GEO = {
    A: { w: 14, h: 11.6, c: [
      [0, 0, 9, 2.2, 'varanda gourmet', 'ext'], [9, 0, 5, 2.2, 'varanda', 'ext'],
      [0, 2.2, 9, 4.6, 'living e jantar', 'living'], [9, 2.2, 5, 4.6, 'suíte master', 'cama2'],
      [9, 6.8, 2.4, 2.4, 'closet', 'closet'], [11.4, 6.8, 2.6, 2.4, 'banho master', 'banho'],
      [0, 6.8, 3.6, 3.2, 'cozinha', 'cozinha'], [0, 10, 2.2, 1.6, 'serviço', 'servico'], [2.2, 10, 1.4, 1.6, 'lavabo', 'lavabo'],
      [3.6, 6.8, 5.4, 1.2, 'circulação', 'circ'], [3.6, 8, 3.2, 3.6, 'suíte 2', 'cama'], [6.8, 8, 2.2, 1.6, 'banho 2', 'banho'],
      [6.8, 9.6, 2.2, 2, 'banho 3', 'banho'], [9, 9.2, 5, 2.4, 'suíte 3', 'cama']
    ] },
    B: { w: 10, h: 10.4, c: [
      [0, 0, 6.2, 2, 'varanda gourmet', 'ext'], [6.2, 0, 3.8, 2, 'varanda', 'ext'],
      [0, 2, 6.2, 4.4, 'living e jantar', 'living'], [6.2, 2, 3.8, 4.4, 'suíte master', 'cama2'],
      [8, 6.4, 2, 2.2, 'banho master', 'banho'], [0, 6.4, 3.2, 2.6, 'cozinha', 'cozinha'],
      [0, 9, 1.8, 1.4, 'serviço', 'servico'], [1.8, 9, 1.4, 1.4, 'lavabo', 'lavabo'],
      [3.2, 6.4, 4.8, 1, 'circulação', 'circ'], [3.2, 7.4, 3.4, 3, 'suíte 2', 'cama'],
      [6.6, 8.6, 3.4, 1.8, 'banho 2', 'banho'], [6.6, 7.4, 1.4, 1.2, 'rouparia', 'closet']
    ] }
  };
  GEO.C = GEO.A;
  var S = 50, M = 46; // escala (px por metro) e margem

  // ───────────────────────── 2 · plantas desenhadas (vetor) ─────────────────────────
  // op: esp (espelhada), terraco, vista, rotulo, mat (piso: carvalho|pedra|marmore|escura), sol (manha|tarde|''), pinos (true), id
  var MAT = {
    carvalho: { nome: 'Carvalho natural', img: 'img/r3-mat-carvalho.webp', onde: 'piso de madeira no living, na circulação e nas suítes' },
    pedra: { nome: 'Pedra clara', img: 'img/r3-mat-pedra.webp', onde: 'travertino claro em toda a área social e nas suítes' },
    marmore: { nome: 'Mármore branco', img: 'img/r3-mat-marmore.webp', onde: 'mármore de veio fino no living, no hall e nas suítes' },
    escura: { nome: 'Madeira escura', img: 'img/r3-mat-escura.webp', onde: 'madeira escura no living, na circulação e nas suítes' }
  };
  var PINOS = {
    ext: ['Varanda gourmet', 'img/r3-int-varanda.webp', 'Varanda com guarda-corpo de vidro diante do mar'],
    living: ['Living e jantar', 'img/r3-int-living-mar.webp', 'Living com piso de madeira e janelas para o mar'],
    cama2: ['Suíte master', 'img/r3-int-suite.webp', 'Suíte clara com porta-janela para a varanda'],
    cozinha: ['Cozinha', 'img/r3-int-cozinha.webp', 'Cozinha com armários claros e mesa de apoio'],
    banho: ['Banho master', 'img/r3-int-banho.webp', 'Banheiro com banheira e janela de canto']
  };
  var nPlanta = 0;
  function plantaSVG(pl, op) {
    op = op || {};
    var g = GEO[pl], esp = !!op.esp, ter = !!op.terraco, topo = ter ? 2.6 : 0, W = g.w * S, H = (g.h + topo) * S, id = op.id || ('p' + (++nPlanta));
    var X = function (x, w) { return M + (esp ? g.w - x - w : x) * S; }, Y = function (y) { return M + (y + topo) * S; };
    var out = [], mov = [], pisos = [], pins = [], visto = {}, np = 0;
    var r = function (x, y, w, h, cls, rx) { return '<rect class="' + cls + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '"' + (rx ? ' rx="' + rx + '"' : '') + '/>'; };
    if (ter) {
      out.push(r(X(0, g.w * .62), M, g.w * .62 * S, topo * S, 'pl-ext'));
      out.push('<text class="pl-txt" x="' + (X(0, g.w * .62) + g.w * .31 * S) + '" y="' + (M + topo * S / 2) + '">terraço descoberto</text><text class="pl-m2" x="' + (X(0, g.w * .62) + g.w * .31 * S) + '" y="' + (M + topo * S / 2 + 20) + '">18 m²</text>');
    }
    g.c.forEach(function (c, ci) {
      var x = X(c[0], c[2]), y = Y(c[1]), w = c[2] * S, h = c[3] * S, t = c[5], cx = x + w / 2, cy = y + h / 2;
      out.push(r(x, y, w, h, t === 'ext' ? 'pl-ext' : 'pl-comodo'));
      if (/^(living|cama|cama2|circ|closet)$/.test(t)) pisos.push('<rect class="pl-piso" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="url(#' + id + '-mat)"/>');
      if (t === 'cama' || t === 'cama2') { var bw = (t === 'cama2' ? 1.9 : 1.5) * S, bh = 2 * S, bx = cx - bw / 2, by = y + h - bh - 12; mov.push(r(bx, by, bw, bh, 'pl-movel', 4), r(bx + 8, by + bh - 34, bw / 2 - 12, 24, 'pl-movel', 6), r(bx + bw / 2 + 4, by + bh - 34, bw / 2 - 12, 24, 'pl-movel', 6)); }
      if (t === 'living') { mov.push(r(x + 18, y + h - 70, w * .45, 52, 'pl-movel', 8), r(x + 18, y + h - 70 - 80, 52, 80, 'pl-movel', 8), r(x + w * .62, y + 40, 150, 80, 'pl-movel', 6));
        for (var i = 0; i < 3; i++) mov.push('<circle class="pl-movel" cx="' + (x + w * .62 + 25 + i * 50) + '" cy="' + (y + 28) + '" r="11"/><circle class="pl-movel" cx="' + (x + w * .62 + 25 + i * 50) + '" cy="' + (y + 132) + '" r="11"/>'); }
      if (t === 'cozinha') mov.push(r(x + 6, y + 6, w - 12, 34, 'pl-movel'), r(x + 6, y + 40, 34, h - 52, 'pl-movel'), '<circle class="pl-movel" cx="' + (x + 40) + '" cy="' + (y + 23) + '" r="9"/><circle class="pl-movel" cx="' + (x + 66) + '" cy="' + (y + 23) + '" r="9"/>');
      if (t === 'banho' || t === 'lavabo') mov.push('<ellipse class="pl-movel" cx="' + (x + w - 22) + '" cy="' + (y + h - 26) + '" rx="12" ry="16"/>', r(x + 6, y + 6, Math.min(56, w - 12), 26, 'pl-movel', 4));
      if (t === 'banho' && w > 100) mov.push(r(x + 6, y + h - 66, 60, 60, 'pl-movel'));
      if (t === 'ext' && w > 200) { mov.push('<circle class="pl-movel" cx="' + cx + '" cy="' + cy + '" r="24"/>'); [-46, 46].forEach(function (d) { mov.push('<circle class="pl-movel" cx="' + (cx + d) + '" cy="' + cy + '" r="12"/>'); }); }
      if (t === 'closet') mov.push(r(x + 6, y + 6, w - 12, 18, 'pl-movel'));
      if (t === 'servico') mov.push(r(x + 6, y + 6, 30, 30, 'pl-movel'), r(x + 40, y + 6, 30, 30, 'pl-movel'));
      if (t !== 'circ') out.push('<text class="pl-txt" x="' + cx.toFixed(1) + '" y="' + (cy - (h > 90 ? 4 : 2)).toFixed(1) + '">' + c[4] + '</text><text class="pl-m2" x="' + cx.toFixed(1) + '" y="' + (cy + 16).toFixed(1) + '">' + (c[2] * c[3]).toFixed(1).replace('.', ',') + ' m²</text>');
      if (op.pinos && PINOS[t] && !visto[t]) {
        visto[t] = 1; np++;
        var px = x + Math.min(34, w * .2), py = y + Math.min(32, h * .3);
        pins.push('<g class="pl-pino" tabindex="0" role="button" data-c="' + ci + '" data-t="' + t + '" aria-label="' + esc(PINOS[t][0]) + ', ' + (c[2] * c[3]).toFixed(1).replace('.', ',') + ' metros quadrados: ver foto de referência">' +
          '<circle class="pl-pino-h" cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="27"/><circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="16"/><text x="' + px.toFixed(1) + '" y="' + py.toFixed(1) + '">' + np + '</text></g>');
      }
    });
    var vista = op.vista || (pl === 'B' ? 'mar lateral' : 'mar');
    var mar = /mar/.test(vista), m = MAT[op.mat] || MAT.carvalho, tarde = op.sol === 'tarde';
    var defs = '<defs><pattern id="' + id + '-mat" patternUnits="userSpaceOnUse" width="320" height="320"><image class="pl-mat-img" href="' + m.img + '" width="320" height="320" preserveAspectRatio="xMidYMid slice"/></pattern>' +
      '<linearGradient id="' + id + '-sol" class="pl-sol-g" x1="0" y1="' + (tarde ? 1 : 0) + '" x2="0" y2="' + (tarde ? 0 : 1) + '"><stop offset="0" stop-color="#E2B66C" stop-opacity=".62"/><stop offset=".55" stop-color="#E2B66C" stop-opacity=".14"/><stop offset="1" stop-color="#E2B66C" stop-opacity="0"/></linearGradient></defs>';
    return '<svg class="planta-svg' + (op.mat ? ' com-piso' : '') + '" viewBox="0 0 ' + (W + 2 * M) + ' ' + (H + 2 * M + 30) + '" role="img" aria-label="' + esc(op.rotulo || PLANTAS[pl].nome + ', ' + PLANTAS[pl].area + ' m²') + '" data-id="' + id + '">' + defs +
      out.join('') + '<g class="pl-pisos">' + pisos.join('') + '</g><g class="pl-mob">' + mov.join('') + '</g>' +
      '<rect class="pl-sol" x="' + M + '" y="' + Y(0) + '" width="' + W + '" height="' + (g.h * S) + '" fill="url(#' + id + '-sol)" style="opacity:' + (op.sol ? 1 : 0) + '"/>' +
      '<rect class="pl-borda" x="' + M + '" y="' + Y(0) + '" width="' + W + '" height="' + (g.h * S) + '"/>' +
      '<path class="pl-vista' + (mar ? '' : ' cidade') + '" d="M' + (M + 10) + ' ' + (M - 18) + 'H' + (M + W - 10) + '"/><text class="pl-cota" x="' + (M + W / 2) + '" y="' + (M - 26) + '">vista: ' + esc(vista) + ' · ' + g.w.toFixed(2).replace('.', ',') + ' m</text>' +
      '<text class="pl-cota" x="' + (M + W / 2) + '" y="' + (H + 2 * M + 14) + '">hall dos elevadores e entrada social</text>' +
      '<g transform="translate(' + (M + W - 10) + ' ' + (H + 2 * M + 4) + ')"><path class="pl-norte" d="M0 -26 L8 0 L0 -6 L-8 0Z"/><text class="pl-cota" x="0" y="16">N</text></g>' + pins.join('') + '</svg>';
  }

  // ───────────────────────── 3 · zoom com arrastar e pinça ─────────────────────────
  function Zoom(palco, alvo) {
    var s = 1, x = 0, y = 0, pts = new Map(), g0 = null, ultToque = 0;
    var r0 = function () { return palco.getBoundingClientRect(); };
    var aplica = function (anim) {
      alvo.style.transition = anim && !calmo ? 'transform .25s ease' : 'none';
      alvo.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + s.toFixed(3) + ')';
      palco.classList.toggle('ampliado', s > 1.01);
      palco.style.touchAction = s > 1.01 ? 'none' : 'pan-y';
      var n = palco.closest('.zoom') && $('.zoom-nivel', palco.closest('.zoom')); if (n) n.textContent = Math.round(s * 100) + '%';
    };
    var limita = function () { var r = r0(); s = lim(s, 1, 5); var mx = r.width * (s - 1) / 2, my = r.height * (s - 1) / 2; x = lim(x, -mx, mx); y = lim(y, -my, my); };
    var zoomEm = function (ns, px, py) { ns = lim(ns, 1, 5); x = px - (px - x) * ns / s; y = py - (py - y) * ns / s; s = ns; limita(); };
    var rel = function (e) { var r = r0(); return [e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2]; };
    palco.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button,a')) return;
      palco.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { var v = [].concat.apply([], Array.from(pts.values())); g0 = { d: Math.hypot(v[0] - v[2], v[1] - v[3]), s: s, mx: (v[0] + v[2]) / 2, my: (v[1] + v[3]) / 2, x: x, y: y }; }
      if (e.pointerType !== 'mouse' && pts.size === 1) { var t = Date.now(); if (t - ultToque < 300) { var p = rel(e); zoomEm(s > 1.4 ? 1 : 2.5, p[0], p[1]); aplica(true); } ultToque = t; }
    });
    palco.addEventListener('pointermove', function (e) {
      if (!pts.has(e.pointerId)) return;
      var ant = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2 && g0) {
        var v = [].concat.apply([], Array.from(pts.values())), d = Math.hypot(v[0] - v[2], v[1] - v[3]), mx = (v[0] + v[2]) / 2, my = (v[1] + v[3]) / 2, r = r0();
        s = g0.s; x = g0.x; y = g0.y; zoomEm(g0.s * d / g0.d, g0.mx - r.left - r.width / 2, g0.my - r.top - r.height / 2);
        x += mx - g0.mx; y += my - g0.my; limita(); aplica();
      } else if (pts.size === 1 && s > 1.01) { x += e.clientX - ant[0]; y += e.clientY - ant[1]; limita(); aplica(); }
    });
    var solta = function (e) { pts.delete(e.pointerId); if (pts.size < 2) g0 = null; };
    palco.addEventListener('pointerup', solta); palco.addEventListener('pointercancel', solta);
    palco.addEventListener('dblclick', function (e) { var p = rel(e); zoomEm(s > 1.4 ? 1 : 2.5, p[0], p[1]); aplica(true); });
    palco.addEventListener('wheel', function (e) {
      if (!(e.ctrlKey || e.metaKey || s > 1.01)) return;
      e.preventDefault(); var p = rel(e); zoomEm(s * Math.exp(-e.deltaY * 0.0018), p[0], p[1]); aplica();
    }, { passive: false });
    palco.addEventListener('keydown', function (e) {
      var k = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] }[e.key];
      if (e.key === '+' || e.key === '=') { zoomEm(s * 1.4, 0, 0); aplica(true); e.preventDefault(); }
      else if (e.key === '-') { zoomEm(s / 1.4, 0, 0); aplica(true); e.preventDefault(); }
      else if (k && s > 1.01) { x += k[0]; y += k[1]; limita(); aplica(true); e.preventDefault(); }
    });
    var api = {
      mais: function () { zoomEm(s * 1.5, 0, 0); aplica(true); },
      menos: function () { zoomEm(s / 1.5, 0, 0); aplica(true); },
      zera: function () { s = 1; x = 0; y = 0; aplica(true); }
    };
    aplica(); return api;
  }
  // monta um visualizador: botões de zoom e tela cheia em volta de um palco
  function visualizador(cx, conteudo, legenda) {
    cx.classList.add('zoom');
    cx.innerHTML = '<div class="zoom-palco" tabindex="0" aria-label="Planta ampliável. Use mais e menos, ou pinça no celular."><div class="zoom-alvo">' + conteudo + '</div></div>' +
      '<div class="zoom-ctrl"><button type="button" class="redondo z-menos" aria-label="Diminuir">−</button><span class="zoom-nivel" aria-live="polite">100%</span><button type="button" class="redondo z-mais" aria-label="Ampliar">+</button>' +
      '<button type="button" class="pilula z-zera">Ajustar</button><button type="button" class="pilula z-cheia" aria-pressed="false">Tela cheia</button></div>' +
      '<p class="zoom-dica">' + (legenda || 'No celular, faça pinça para ampliar e arraste para mover. No computador, use os botões, dois cliques ou Ctrl + rolar.') + '</p>';
    var z = Zoom($('.zoom-palco', cx), $('.zoom-alvo', cx)), bt = $('.z-cheia', cx);
    $('.z-mais', cx).addEventListener('click', z.mais); $('.z-menos', cx).addEventListener('click', z.menos); $('.z-zera', cx).addEventListener('click', z.zera);
    var cheia = function (on) {
      cx.classList.toggle('zoom-cheia', on); document.body.classList.toggle('sem-rolar', on);
      bt.textContent = on ? 'Fechar tela cheia' : 'Tela cheia'; bt.setAttribute('aria-pressed', String(on)); z.zera();
      if (on) $('.zoom-palco', cx).focus();
    };
    bt.addEventListener('click', function () { cheia(!cx.classList.contains('zoom-cheia')); });
    cx.onkeydown = function (e) { if (e.key === 'Escape' && cx.classList.contains('zoom-cheia')) { cheia(false); bt.focus(); } };
    return z;
  }
  // miniaturas das plantas (sem zoom) e visualizadores [data-planta="A"] em qualquer página
  $$('[data-mini]').forEach(function (el) { var pl = el.dataset.mini; el.innerHTML = plantaSVG(pl, { esp: pl === 'C', vista: pl === 'A' ? 'mar frontal' : pl === 'C' ? 'mar lateral' : 'mar lateral ou cidade' }); });
  $$('[data-planta]').forEach(function (cx) {
    var pl = cx.dataset.planta; visualizador(cx, plantaSVG(pl, { esp: pl === 'C', vista: pl === 'A' ? 'mar frontal' : pl === 'C' ? 'mar lateral' : 'mar lateral (final 2) ou cidade (final 3)' }));
  });
  // galeria: a foto ampliada também aceita pinça e arrastar
  var gdlg = $('.gal-dlg');
  if (gdlg) {
    var gimg = $('img', gdlg), gpalco = document.createElement('div'); gpalco.className = 'zoom-palco gal-palco';
    gimg.parentNode.insertBefore(gpalco, gimg); var galvo = document.createElement('div'); galvo.className = 'zoom-alvo'; gpalco.appendChild(galvo); galvo.appendChild(gimg);
    var gz = Zoom(gpalco, galvo); gimg.addEventListener('load', gz.zera); gdlg.addEventListener('close', gz.zera);
  }

  // ───────────────────────── 4 · espelho de vendas = corte da fachada ─────────────────────────
  // a fachada é desenhada em linhas finas; cada pavimento é um <g> clicável com as 4 unidades (finais 1 a 4).
  // passar o mouse ilumina o andar em bronze (180 ms) e liga uma linha ao cartão do andar; clicar fixa (250 ms);
  // escolher a unidade abre a gaveta com planta, ficha e as ações (interesse, simulação, fila ou aviso).
  var SETA = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
  var ST_CURTO = { d: 'disponível', r: 'reservada', v: 'vendida' };
  function fachadaSVG() {
    var VW = 440, BX0 = 92, BX1 = 392, FH = 26, Y0 = 70, pad = 10, o = [];
    var yA = function (a) { return Y0 + (18 - a) * FH; };
    var yBase = yA(1) + FH, yChao = yBase + 58;
    // céu, coroamento e pérgola do rooftop
    o.push('<line class="f-fina" x1="' + (BX0 + 26) + '" y1="22" x2="' + (BX1 - 26) + '" y2="22"/>');
    for (var k = 0; k <= 12; k++) { var xp = BX0 + 26 + k * (BX1 - BX0 - 52) / 12; o.push('<line class="f-fina" x1="' + xp.toFixed(1) + '" y1="22" x2="' + xp.toFixed(1) + '" y2="34"/>'); }
    o.push('<path class="f-linha" d="M' + (BX0 + 14) + ' ' + Y0 + 'V34H' + (BX1 - 14) + 'V' + Y0 + '"/>');
    o.push('<line class="f-fina" x1="' + (BX0 + 14) + '" y1="50" x2="' + (BX1 - 14) + '" y2="50"/>');
    o.push('<text x="' + ((BX0 + BX1) / 2) + '" y="14" text-anchor="middle">rooftop · piscina e espaço gourmet</text>');
    // corpo da torre: do 15º ao 18º recua (terraços), abaixo a fachada cheia
    o.push('<path class="f-linha" d="M' + (BX0 + 14) + ' ' + Y0 + 'V' + yA(14) + 'H' + BX0 + 'V' + yBase + 'M' + (BX1 - 14) + ' ' + Y0 + 'V' + yA(14) + 'H' + BX1 + 'V' + yBase + '"/>');
    // térreo de pé-direito duplo com vidro e marquise
    o.push('<path class="f-linha" d="M' + BX0 + ' ' + yBase + 'V' + yChao + 'M' + BX1 + ' ' + yBase + 'V' + yChao + '"/>');
    o.push('<line class="f-linha" x1="' + (BX0 - 18) + '" y1="' + (yBase + 8) + '" x2="' + (BX1 + 18) + '" y2="' + (yBase + 8) + '"/>');
    for (k = 0; k <= 10; k++) { var xv = BX0 + 16 + k * (BX1 - BX0 - 32) / 10; o.push('<line class="f-fina" x1="' + xv.toFixed(1) + '" y1="' + (yBase + 14) + '" x2="' + xv.toFixed(1) + '" y2="' + yChao + '"/>'); }
    o.push('<line class="f-chao" x1="0" y1="' + yChao + '" x2="' + VW + '" y2="' + yChao + '"/>');
    o.push('<text x="' + ((BX0 + BX1) / 2) + '" y="' + (yChao + 18) + '" text-anchor="middle">térreo · hall de pé-direito duplo</text>');
    // pavimentos
    for (var a = 18; a >= 1; a--) {
      var y = yA(a), rec = a >= 15 ? 14 : 0, x0 = BX0 + rec, x1 = BX1 - rec, bw = (x1 - x0 - 2 * pad) / 4, g = [];
      g.push('<rect class="f-hit" x="0" y="' + y + '" width="' + VW + '" height="' + FH + '"/>');
      g.push('<rect class="f-faixa" x="' + (x0 - 6) + '" y="' + y + '" width="' + (x1 - x0 + 12) + '" height="' + FH + '"/>');
      g.push('<line class="f-fina" x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '"/>');
      g.push('<text class="f-num" x="' + (BX0 - 26) + '" y="' + (y + FH / 2 + 4) + '" text-anchor="end">' + (a < 10 ? '0' + a : a) + '</text>');
      for (var f = 1; f <= 4; f++) {
        var u = porCod(a * 100 + f), ux = x0 + pad + (f - 1) * bw;
        g.push('<rect class="f-un st-' + u.st + '" data-cod="' + u.cod + '" x="' + (ux + 3).toFixed(1) + '" y="' + (y + 6) + '" width="' + (bw - 6).toFixed(1) + '" height="' + (FH - 11) + '"/>');
        if (f > 1) g.push('<line class="f-fina" x1="' + ux.toFixed(1) + '" y1="' + (y + 3) + '" x2="' + ux.toFixed(1) + '" y2="' + (y + FH - 3) + '"/>');
      }
      if (rec) g.push('<path class="f-fina" d="M' + BX0 + ' ' + (y + FH) + 'v-9h' + rec + 'M' + BX1 + ' ' + (y + FH) + 'v-9h-' + rec + '"/>');
      o.push('<g class="f-andar" data-andar="' + a + '" tabindex="0" role="button" aria-label="' + a + 'º andar: ver as 4 unidades" data-y="' + (y + FH / 2) + '">' + g.join('') + '</g>');
    }
    // finais em cima, para ler as colunas
    var fx0 = BX0 + pad, fbw = (BX1 - BX0 - 2 * pad) / 4;
    for (f = 1; f <= 4; f++) o.push('<text x="' + (fx0 + (f - .5) * fbw).toFixed(1) + '" y="' + (Y0 - 6) + '" text-anchor="middle">final ' + f + '</text>');
    return { X0: 44, VWv: VW - 68, svg: '<svg class="fachada" viewBox="44 0 ' + (VW - 68) + ' ' + (yChao + 26) + '" role="group" aria-label="Corte da fachada do Vértice: 18 andares com 4 unidades cada. Escolha um andar.">' + o.join('') + '</svg>', VW: VW, BX1: BX1, H: yChao + 26 };
  }

  $$('[data-espelho]').forEach(function (raiz) {
    var completo = raiz.getAttribute('data-espelho') === 'completo';
    var fx = fachadaSVG(), fixo = null, mostrado = null;
    var chips = function (nome, ops) { return '<fieldset><legend>' + ops[0] + '</legend>' + ops.slice(1).map(function (o, i) { return '<label class="chip"><input type="radio" name="' + nome + '" value="' + o[0] + '"' + (i === 0 ? ' checked' : '') + '><span>' + o[1] + '</span></label>'; }).join('') + '</fieldset>'; };
    raiz.classList.add('esp');
    raiz.innerHTML =
      '<form class="esp-filtros" aria-label="Filtrar unidades">' +
      chips('su', ['Suítes', ['', 'Todas'], ['2', '2 suítes'], ['3', '3 suítes']]) +
      chips('st', ['Situação', ['', 'Todas'], ['d', 'Disponíveis'], ['r', 'Reservadas'], ['v', 'Vendidas']]) +
      (completo ? '<div class="esp-modo" role="group" aria-label="Forma de ver"><button type="button" data-m="fachada" aria-pressed="true">Fachada</button><button type="button" data-m="lista" aria-pressed="false">Lista</button></div>' : '') +
      '<p class="esp-cont" aria-live="polite"><span class="leg-ponto st-d"><b>' + conta.d + '</b>disponíveis</span><span class="leg-ponto st-r"><b>' + conta.r + '</b>reservadas</span><span class="leg-ponto st-v"><b>' + conta.v + '</b>vendidas</span></p></form>' +
      '<div class="esp-palco">' +
      '<div class="fachada-cx">' + fx.svg + '</div>' +
      '<div class="esp-lado"><div class="andar-cartao" aria-live="polite"></div></div>' +
      '<span class="f-dica" aria-hidden="true"></span></div>' +
      (completo ? '<div class="esp-lista" hidden><p class="mut" style="font-size:14px">Ordenar <select name="ord" class="campo" style="width:auto;min-height:40px;display:inline-block"><option value="andar">andar mais alto</option><option value="preco">menor preço</option><option value="area">maior área</option><option value="m2">menor preço por m²</option></select></p><table><thead><tr><th>Unidade</th><th>Andar</th><th>Planta</th><th>Área</th><th>Suítes</th><th>Preço</th><th>Situação</th></tr></thead><tbody></tbody></table></div>' : '') +
      '<p class="demo">' + DEMO + ' Quando uma unidade é reservada ou vendida, a cor muda sozinha para todos os corretores e para o site. Atualizado hoje às <span data-hora></span>.</p>';
    var dlg = document.querySelector('.un-dlg');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.className = 'un-dlg'; dlg.setAttribute('aria-label', 'Unidade escolhida');
      dlg.innerHTML = '<button type="button" class="redondo un-dlg-x" aria-label="Fechar">×</button><div class="un-dlg-corpo"></div>';
      document.body.appendChild(dlg);
      $('.un-dlg-x', dlg).addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener('close', function () { document.body.classList.remove('sem-rolar'); });
    }
    var fo = $('.esp-filtros', raiz), palco = $('.esp-palco', raiz), svg = $('.fachada', raiz), cartao = $('.andar-cartao', raiz), dica = $('.f-dica', raiz), lado = $('.esp-lado', raiz);
    var hora = new Date(); $('[data-hora]', raiz).textContent = String(hora.getHours()).padStart(2, '0') + ':' + String(hora.getMinutes()).padStart(2, '0');
    var pp = params.get('planta'); if (pp && /^[ABC]$/.test(pp)) fo.su.value = String(PLANTAS[pp].suites);
    var passa = function (u) { return (!fo.su.value || u.suites === +fo.su.value) && (!fo.st.value || u.st === fo.st.value); };
    var desenhaCartao = function (a) {
      mostrado = a;
      var uns = [1, 2, 3, 4].map(function (f) { return porCod(a * 100 + f); }), nd = uns.filter(function (u) { return u.st === 'd'; }).length;
      cartao.innerHTML = '<div class="ac-topo"><h3>' + a + 'º <em>andar</em></h3><span>' + nd + (nd === 1 ? ' disponível' : ' disponíveis') + ' de 4</span></div>' +
        '<ul class="ac-uns">' + uns.map(function (u) {
          return '<li><button type="button" class="st-' + u.st + (passa(u) ? '' : ' fora') + '" data-u="' + u.cod + '" data-cursor="Ver unidade"><i aria-hidden="true"></i><b>' + u.cod + '</b><span>Planta ' + u.planta + (u.terraco ? ' + terraço' : '') + ' · ' + u.area + ' m² · ' + u.suites + ' suítes<br>vista ' + u.vista + '</span><em>' + (u.st === 'v' ? 'vendida' : u.st === 'r' ? 'reservada' : mi(u.preco).replace('R$ ', 'R$ ')) + '</em><span class="seta-so" aria-hidden="true">' + SETA + '</span></button></li>';
        }).join('') + '</ul>' +
        '<div class="ac-pe"><span>' + (fixo === a ? 'Andar fixado · escolha a unidade' : 'Clique para fixar o andar') + '</span><span class="ac-nav"><button type="button" class="redondo" data-nav="1" aria-label="Andar de cima"' + (a === 18 ? ' disabled' : '') + '>↑</button><button type="button" class="redondo" data-nav="-1" aria-label="Andar de baixo"' + (a === 1 ? ' disabled' : '') + '>↓</button></span></div>';
      posiciona(a);
    };
    var posiciona = function (a) {
      var g = svg.querySelector('[data-andar="' + a + '"]'); if (!g) return;
      var rs = svg.getBoundingClientRect(), rp = palco.getBoundingClientRect(), k = rs.width / fx.VWv, yF = rs.top - rp.top + (+g.getAttribute('data-y')) * k;
      if (getComputedStyle(lado).position !== 'sticky') {
        var hC = cartao.offsetHeight, max = Math.max(0, rs.height - hC);
        var t = lim(yF - (rs.top - rp.top) - 46, 0, max);
        lado.style.transform = 'translateY(' + t.toFixed(0) + 'px)';
        var rl = lado.getBoundingClientRect(), x0 = rs.left - rp.left + (fx.BX1 - fx.X0) * k + 10, x1 = rl.left - rp.left - (rs.top - rp.top) * 0;
        dica.style.left = x0 + 'px'; dica.style.width = Math.max(0, rl.left - rp.left - x0) + 'px'; dica.style.top = yF + 'px';
      }
      palco.classList.add('ativo');
    };
    var marca = function () { $$('.f-andar', svg).forEach(function (g) { g.classList.toggle('on', +g.dataset.andar === (mostrado || fixo)); }); };
    var mostra = function (a) { if (a === mostrado) return; desenhaCartao(a); marca(); };
    var fixa = function (a) { fixo = a; desenhaCartao(a); marca(); };
    var filtra = function () {
      $$('.f-un', svg).forEach(function (r) { r.classList.toggle('fora', !passa(porCod(r.dataset.cod))); });
      if (mostrado) desenhaCartao(mostrado);
      if (completo) lista();
    };
    // andar inicial: o mais alto com unidade disponível
    var ini = 18; while (ini > 1 && ![1, 2, 3, 4].some(function (f) { return porCod(ini * 100 + f).st === 'd'; })) ini--;
    svg.addEventListener('pointerover', function (e) { var g = e.target.closest('.f-andar'); if (g && e.pointerType === 'mouse') mostra(+g.dataset.andar); });
    svg.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && fixo) mostra(fixo); });
    svg.addEventListener('click', function (e) { var g = e.target.closest('.f-andar'); if (g) fixa(+g.dataset.andar); });
    svg.addEventListener('keydown', function (e) {
      var g = e.target.closest('.f-andar'); if (!g) return; var a = +g.dataset.andar;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fixa(a); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); var n = lim(a + (e.key === 'ArrowUp' ? 1 : -1), 1, 18); fixa(n); svg.querySelector('[data-andar="' + n + '"]').focus(); }
    });
    svg.addEventListener('focusin', function (e) { var g = e.target.closest('.f-andar'); if (g) mostra(+g.dataset.andar); });
    var abre = function (cod) {
      var u = porCod(cod); if (!u) return;
      $('.un-dlg-corpo', dlg).innerHTML = painel(u);
      if (!dlg.open) dlg.showModal(); $('.un-dlg-corpo', dlg).scrollTop = 0;
      raiz.dispatchEvent(new CustomEvent('vt-unidade', { bubbles: true, detail: u.cod }));
    };
    raiz.addEventListener('click', function (e) { var n = e.target.closest('[data-nav]'); if (n) { fixa(lim((mostrado || fixo) + +n.dataset.nav, 1, 18)); var bn = $('[data-nav="' + n.dataset.nav + '"]', cartao); if (bn && !bn.disabled) bn.focus(); return; } var b = e.target.closest('[data-u]'); if (b) abre(b.dataset.u); });
    if (!dlg.dataset.ligado) {
      dlg.dataset.ligado = '1';
      dlg.addEventListener('click', function (e) {
        var b = e.target.closest('.pn-par [data-u]'); if (b) { $('.un-dlg-corpo', dlg).innerHTML = painel(porCod(b.dataset.u)); return; }
        var s = e.target.closest('[data-sim-u]');
        if (s && s.getAttribute('href') === '#simulador') { e.preventDefault(); dlg.close(); VT.simular(s.dataset.simU); }
      });
    }
    fo.addEventListener('change', filtra);
    // lista (só no espelho completo)
    var tb = completo && $('tbody', raiz), ord = completo && $('[name=ord]', raiz);
    function lista() {
      var l = UN.filter(passa), o = ord.value;
      l.sort(o === 'preco' ? function (x, y) { return x.preco - y.preco; } : o === 'area' ? function (x, y) { return y.area - x.area || x.preco - y.preco; } : o === 'm2' ? function (x, y) { return x.m2 - y.m2; } : function (x, y) { return y.andar - x.andar || x.final - y.final; });
      tb.innerHTML = l.map(function (u) {
        return '<tr data-u="' + u.cod + '" tabindex="0"><td><b>' + u.cod + '</b></td><td>' + u.andar + 'º</td><td>' + u.planta + (u.terraco ? ' + terraço' : '') + '</td><td>' + u.area + ' m²</td><td>' + u.suites + '</td><td>' + (u.st === 'v' ? '—' : mi(u.preco)) + '</td><td><span class="pn-st st-' + u.st + '">' + ST_CURTO[u.st] + '</span></td></tr>';
      }).join('') || '<tr><td colspan="7">Nenhuma unidade com esses filtros.</td></tr>';
    }
    if (completo) {
      ord.addEventListener('change', lista);
      tb.addEventListener('keydown', function (e) { var t = e.target.closest('tr[data-u]'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); abre(t.dataset.u); } });
      $$('.esp-modo button', raiz).forEach(function (b) {
        b.addEventListener('click', function () {
          $$('.esp-modo button', raiz).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
          palco.hidden = b.dataset.m !== 'fachada'; $('.esp-lista', raiz).hidden = b.dataset.m !== 'lista';
        });
      });
    }
    filtra(); fixa(ini);
    addEventListener('resize', function () { if (mostrado) posiciona(mostrado); });
    if (document.fonts) document.fonts.ready.then(function () { if (mostrado) posiciona(mostrado); });
    var pu = params.get('u'); if (pu && porCod(pu) && raiz.hasAttribute('data-abrir-url')) { fixa(porCod(pu).andar); setTimeout(function () { abre(pu); }, 300); }
  });

  function painel(u) {
    var P = PLANTAS[u.planta], par = u.st !== 'd' ? parecidas(u, 3) : [];
    var acao = u.st === 'd'
      ? '<a class="pilula pilula-verde" href="#" data-wa="Olá, Vértice Residence! Tenho interesse na ' + esc(nomeUn(u)) + '. Pode me enviar a proposta e os horários para visitar o decorado?">Tenho interesse</a>' +
        '<a class="pilula pilula-linha" href="' + (document.querySelector('[data-simulador]') ? '#simulador' : 'como-comprar.html?u=' + u.cod + '#simulador') + '" data-sim-u="' + u.cod + '">Simular pagamento</a>'
      : u.st === 'r'
        ? '<a class="pilula pilula-cobre" href="#" data-wa="Olá, Vértice Residence! A unidade ' + u.cod + ' está reservada. Quero entrar na fila dela caso a reserva caia.">Entrar na fila desta unidade</a>'
        : '<a class="pilula pilula-cobre" href="#" data-wa="Olá, Vértice Residence! A unidade ' + u.cod + ' foi vendida. Quero ser avisado se aparecer uma parecida (' + P.nome + ', ' + u.suites + ' suítes, perto do ' + u.andar + 'º andar).">Avise-me se surgir parecida</a>';
    return '<div class="pn-cab"><span class="pn-st st-' + u.st + '">' + ST[u.st] + (u.st === 'r' ? ' até amanhã, 18h' : '') + '</span><h3>Unidade ' + u.cod + '</h3>' +
      '<p class="pn-preco">' + (u.st === 'v' ? 'Vendida' : mi(u.preco)) + '</p></div>' +
      '<div class="pn-acoes">' + acao + '</div>' +
      '<a class="pn-planta" href="apartamento.html?u=' + u.cod + '" aria-label="Abrir a planta da unidade ' + u.cod + ' com zoom">' + plantaSVG(u.planta, { esp: u.esp, terraco: u.terraco, vista: u.vista, rotulo: 'Planta da unidade ' + u.cod }) + '<span>Abrir planta com zoom ↗</span></a>' +
      '<dl class="pn-ficha"><dt>Andar</dt><dd>' + u.andar + 'º de 18</dd><dt>Final</dt><dd>' + u.final + '</dd><dt>Planta</dt><dd>' + P.nome.replace('Planta ', '') + (u.terraco ? ' com terraço' : '') + '</dd>' +
      '<dt>Área privativa</dt><dd>' + u.area + ' m²</dd><dt>Suítes</dt><dd>' + u.suites + '</dd><dt>Vagas</dt><dd>' + u.vagas + ' + depósito</dd><dt>Vista</dt><dd>' + u.vista + '</dd>' +
      (u.st !== 'v' ? '<dt>Preço por m²</dt><dd>' + brl(u.m2) + '</dd><dt>Entrada de 20%</dt><dd>' + brl(u.preco * .2) + '</dd>' : '') + '<dt>Condomínio estimado</dt><dd>' + brl(u.cond) + '/mês</dd></dl>' +
      '<a class="u-link pn-ficha-link" href="apartamento.html?u=' + u.cod + '">Ficha completa e planta com zoom ↗</a>' +
      (par.length ? '<div class="pn-par"><p>Parecidas e disponíveis</p>' + par.map(function (o) { return '<button type="button" data-u="' + o.cod + '"><b>' + o.cod + '</b><span>' + o.andar + 'º · ' + o.area + ' m²</span><em>' + mi(o.preco) + '</em></button>'; }).join('') + '</div>' : '');
  }

  // ───────────────────────── 5 · simulador de pagamento na planta ─────────────────────────
  var VT = window.VT = { UN: UN, porCod: porCod, PLANTAS: PLANTAS, plantaSVG: plantaSVG, conta: conta, simular: function () {} };
  $$('[data-simulador]').forEach(function (raiz) {
    var ini = porCod(params.get('u') || raiz.dataset.u || '') || porCod('1202');
    if (ini.st !== 'd') ini = parecidas(ini, 1)[0] || disp[0];
    var grupos = ['A', 'B', 'C'].map(function (p) {
      return '<optgroup label="' + PLANTAS[p].nome + ' · ' + PLANTAS[p].suites + ' suítes">' + disp.filter(function (u) { return u.planta === p; }).sort(function (x, y) { return x.andar - y.andar; })
        .map(function (u) { return '<option value="' + u.cod + '">' + u.cod + ' · ' + u.andar + 'º andar · ' + u.area + ' m² · ' + mi(u.preco) + '</option>'; }).join('') + '</optgroup>';
    }).join('');
    raiz.innerHTML = '<div class="sim">' +
      '<form class="sim-form" aria-label="Monte o pagamento">' +
      '<label class="sim-un">Unidade disponível<select name="u">' + grupos + '</select></label>' +
      '<p class="sim-info"></p>' +
      '<label class="faixa">Entrada, na assinatura <output></output><input type="range" name="ent" min="10" max="30" step="1" value="20"></label>' +
      '<label class="faixa">24 mensais durante a obra (dez/2026 a nov/2028) <output></output><input type="range" name="men" min="10" max="40" step="1" value="24"></label>' +
      '<label class="faixa">2 intermediárias (dez/2027 e jun/2028) <output></output><input type="range" name="int" min="0" max="20" step="1" value="10"></label>' +
      '<p class="sim-chave"></p>' +
      '<label class="faixa">Correção pelo INCC, hipótese <output></output><input type="range" name="incc" min="0" max="12" step="0.5" value="6"></label>' +
      '<p class="sim-obs">O INCC mede o custo da construção e corrige as parcelas até as chaves. O valor futuro é desconhecido: use a hipótese para ver cenários.</p>' +
      '</form><div class="sim-res" aria-live="polite"></div></div>';
    var fo = $('.sim-form', raiz), res = $('.sim-res', raiz);
    fo.u.value = ini.cod;
    var ultimo = 'men';
    var calc = function () {
      var u = porCod(fo.u.value), p = u.preco, e = +fo.ent.value, m = +fo.men.value, it = +fo.int.value, i = +fo.incc.value / 100;
      // o saldo nas chaves fica em pelo menos 30%
      if (e + m + it > 70) { var sobra = e + m + it - 70; if (ultimo !== 'int') { var c = Math.min(sobra, it); it -= c; sobra -= c; } if (sobra > 0 && ultimo !== 'men') { c = Math.min(sobra, m - 10); m -= c; sobra -= c; } if (sobra > 0) { e -= sobra; } fo.ent.value = e; fo.men.value = m; fo.int.value = it; }
      var ch = 100 - e - m - it, r = Math.pow(1 + i, 1 / 12) - 1, vm = p * m / 100 / 24, vi = p * it / 100 / 2, vc = p * ch / 100;
      var fat = function (k) { return Math.pow(1 + r, k); };
      var somaM = 0; for (var k = 1; k <= 24; k++) somaM += vm * fat(k);
      var somaI = it ? vi * fat(13) + vi * fat(19) : 0, chC = vc * fat(25), total = p * e / 100 + somaM + somaI + chC;
      var ano = { 2026: p * e / 100 + vm * fat(1), 2027: 0, 2028: 0 };
      for (k = 2; k <= 13; k++) ano[2027] += vm * fat(k); ano[2027] += it ? vi * fat(13) : 0;
      for (k = 14; k <= 24; k++) ano[2028] += vm * fat(k); ano[2028] += it ? vi * fat(19) : 0;
      var maxA = Math.max(ano[2026], ano[2027], ano[2028], chC);
      $('output', fo.ent.parentNode).textContent = e + '% · ' + brl(p * e / 100);
      $('output', fo.men.parentNode).textContent = m + '% · 24x de ' + brl(vm);
      $('output', fo.int.parentNode).textContent = it ? it + '% · 2x de ' + brl(vi) : 'sem intermediárias';
      $('output', fo.incc.parentNode).textContent = String(fo.incc.value).replace('.', ',') + '% ao ano';
      $('.sim-info', fo).innerHTML = '<b>' + mi(p) + '</b> · ' + PLANTAS[u.planta].nome + (u.terraco ? ' com terraço' : '') + ' · ' + u.area + ' m² · ' + u.suites + ' suítes · ' + u.andar + 'º andar · vista ' + u.vista;
      $('.sim-chave', fo).innerHTML = 'Saldo na entrega das chaves (dez/2028): <b>' + ch + '% · ' + brl(vc) + '</b>, à vista ou financiado no banco. Mínimo de 30%.';
      var barra = function (rot, v) { return '<li><span>' + rot + '</span><i style="--w:' + (v / maxA * 100).toFixed(1) + '%"></i><b>' + brl(v) + '</b></li>'; };
      res.innerHTML = '<p class="sim-rot">Durante a obra, a parcela mensal começa em</p><p class="grande">' + brl(vm) + '<small> /mês</small></p>' +
        '<p class="sim-sub">Com o INCC de ' + String(fo.incc.value).replace('.', ',') + '% ao ano como hipótese, a 24ª parcela fica perto de <b>' + brl(vm * fat(24)) + '</b>.</p>' +
        '<div class="barra" aria-hidden="true"><i style="width:' + e + '%;background:#D8C6A3"></i><i style="width:' + m + '%;background:#A88D63"></i><i style="width:' + it + '%;background:#535A4C"></i><i style="width:' + ch + '%;background:#292A27"></i></div>' +
        '<p class="sim-leg" aria-hidden="true"><span style="--c:#D8C6A3">entrada ' + e + '%</span><span style="--c:#A88D63">mensais ' + m + '%</span><span style="--c:#535A4C">intermediárias ' + it + '%</span><span style="--c:#292A27">chaves ' + ch + '%</span></p>' +
        '<p class="sim-rot">Quanto você desembolsa por ano (com a correção hipotética)</p><ul class="sim-anos">' + barra('2026', ano[2026]) + barra('2027', ano[2027]) + barra('2028', ano[2028]) + barra('Chaves', chC) + '</ul>' +
        '<table><tr><td>Entrada (nov/2026)</td><td>' + brl(p * e / 100) + '</td></tr><tr><td>24 mensais, somadas e corrigidas</td><td>' + brl(somaM) + '</td></tr><tr><td>2 intermediárias corrigidas</td><td>' + brl(somaI) + '</td></tr><tr><td>Saldo nas chaves corrigido</td><td>' + brl(chC) + '</td></tr><tr><td>Correção estimada no período</td><td>' + brl(total - p) + '</td></tr><tr class="tot"><td>Total estimado</td><td>' + brl(total) + '</td></tr></table>' +
        '<p class="aviso-sim"><b>Simulação ilustrativa, não é proposta nem reserva.</b> Preço da tabela de lançamento de exemplo; o INCC real pode ser maior ou menor. Condições finais só no contrato, depois da análise de cadastro.</p>' +
        '<div class="sim-acoes"><a class="pilula pilula-verde" href="#" data-wa="Olá, Vértice Residence! Simulei a ' + esc(nomeUn(u)) + ': entrada de ' + e + '% (' + brl(p * e / 100) + '), 24 mensais de ' + brl(vm) + ', ' + (it ? '2 intermediárias de ' + brl(vi) + ', ' : '') + 'saldo de ' + ch + '% nas chaves (' + brl(vc) + '). Quero receber a proposta oficial.">Quero esta proposta</a>' +
        '<a class="pilula pilula-linha" href="como-comprar.html#financ">Simular o financiamento do saldo</a></div>';
    };
    fo.addEventListener('input', function (ev) { if (ev.target.name) ultimo = ev.target.name; calc(); });
    calc();
    VT.simular = function (cod) {
      var u = porCod(cod); if (!u || u.st !== 'd') return;
      fo.u.value = cod; calc(); raiz.scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'start' });
      raiz.classList.remove('pisca'); void raiz.offsetWidth; raiz.classList.add('pisca');
    };
  });
  // links "simular" fora do espelho que apontam para o simulador da mesma página
  document.addEventListener('click', function (e) {
    var s = e.target.closest('[data-sim-u]'); if (!s || s.closest('[data-espelho]')) return;
    if (s.getAttribute('href') === '#simulador' && document.querySelector('[data-simulador]')) { e.preventDefault(); VT.simular(s.dataset.simU); }
  });

  // ───────────────────────── 6 · captação (apresentação e tabela em troca dos dados) ─────────────────────────
  var CORRETORES = ['Marina Kloss', 'Diego Fontana', 'Paula Werner'];
  var origem = function () {
    var us = params.get('utm_source'), uc = params.get('utm_campaign');
    if (us) return { fonte: us, campanha: uc || '(sem campanha)' };
    var ref = document.referrer && !/bluerose|localhost|127\.0\.0\.1/.test(document.referrer) ? document.referrer.split('/')[2] : '';
    return { fonte: ref || 'site (acesso direto)', campanha: '(orgânico)' };
  };
  var cartaoLead = function (L) {
    return '<div class="lead-card"><p class="lead-tag">Demonstração · é assim que o contato chega para a incorporadora</p>' +
      '<dl><dt>Nome</dt><dd>' + esc(L.nome) + '</dd><dt>WhatsApp</dt><dd>' + esc(L.tel) + '</dd><dt>E-mail</dt><dd>' + esc(L.email) + '</dd><dt>Interesse</dt><dd>' + esc(L.tipo) + '</dd><dt>Investimento</dt><dd>' + esc(L.faixa) + '</dd>' +
      '<dt>Origem</dt><dd>' + esc(L.fonte) + ' · ' + esc(L.campanha) + '</dd><dt>Página</dt><dd>' + esc(L.pagina) + '</dd><dt>Corretor da vez</dt><dd>' + esc(L.corretor) + ' (rodízio)</dd><dt>Recebido</dt><dd>' + esc(L.quando) + '</dd></dl>' +
      '<p class="lead-obs">No site real, o contato entra no CRM da incorporadora (CV CRM, Anapro, RD Station, HubSpot… por API), o corretor da vez recebe no WhatsApp e o Pixel da Meta e o Google Ads registram a conversão da campanha. Nesta demonstração, nada foi enviado: os dados ficam só neste navegador.</p></div>';
  };
  $$('form[data-captacao]').forEach(function (fo) {
    var tel = fo.tel;
    tel.addEventListener('input', function () {
      var d = tel.value.replace(/\D/g, '').slice(0, 11);
      tel.value = d.length > 6 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4) : d.length > 2 ? '(' + d.slice(0, 2) + ') ' + d.slice(2) : d;
    });
    fo.addEventListener('submit', function (e) {
      e.preventDefault();
      var er = $('.erro', fo), n = fo.nome.value.trim(), em = fo.email.value.trim(), t = tel.value.replace(/\D/g, '');
      $$('[aria-invalid]', fo).forEach(function (i) { i.removeAttribute('aria-invalid'); });
      var falha = function (campo, msg) { campo.setAttribute('aria-invalid', 'true'); campo.focus(); er.textContent = msg; };
      if (n.length < 2) return falha(fo.nome, 'Escreva seu nome.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return falha(fo.email, 'Confira o e-mail: a apresentação também vai para ele.');
      if (t.length < 10) return falha(tel, 'Confira o WhatsApp com DDD.');
      if (!fo.ok.checked) return falha(fo.ok, 'Marque a autorização para receber a apresentação.');
      er.textContent = '';
      var lista = lerLS('vt-leads') || [], o = origem(), agora = new Date();
      var L = { nome: n, email: em, tel: tel.value, tipo: fo.tipo.value, faixa: fo.faixa.value, fonte: o.fonte, campanha: o.campanha,
        pagina: (location.pathname.split('/').pop() || 'index.html'), corretor: CORRETORES[lista.length % CORRETORES.length],
        quando: agora.toLocaleDateString('pt-BR') + ' às ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
      lista.push(L); gravarLS('vt-leads', lista); gravarLS('vt-lead', L);
      var noMaterial = document.getElementById('material');
      var caixa = document.createElement('div'); caixa.className = 'cap-ok'; caixa.setAttribute('tabindex', '-1');
      caixa.innerHTML = '<p class="cap-ok-t">Pronto, ' + esc(n.split(' ')[0]) + '. A apresentação e a tabela de preços estão liberadas.</p>' +
        '<p>' + (noMaterial ? 'Role a página: o material completo já está logo abaixo.' : 'Abra agora ou guarde o link: a mesma apresentação vai para ' + esc(em) + ' (demonstração: nenhum e-mail foi enviado).') + '</p>' +
        '<div class="cap-ok-acoes">' + (noMaterial ? '<a class="pilula pilula-cobre" href="#material">Ver a apresentação</a>' : '<a class="pilula pilula-cobre" href="apresentacao.html#material">Abrir apresentação e tabela</a>') +
        '<a class="pilula pilula-linha" href="#" data-wa="Olá, Vértice Residence! Sou ' + esc(n) + ', acabei de receber a apresentação. Tenho interesse em ' + esc(fo.tipo.value) + ', investimento ' + esc(fo.faixa.value) + '. Quero falar com um corretor.">Falar com um corretor agora</a></div>' + cartaoLead(L);
      fo.replaceWith(caixa); caixa.focus();
      if (noMaterial) libera(L);
    });
  });

  // ───────────────────────── 7 · apresentação liberada (apresentacao.html) ─────────────────────────
  var mat = document.getElementById('material');
  function libera(L) {
    if (!mat) return;
    mat.hidden = false; var tr = $('.material-trava'); if (tr) tr.hidden = true;
    $$('[data-lead-nome]').forEach(function (el) { el.textContent = L.nome.split(' ')[0]; });
    var tab = $('.tab-precos tbody', mat), filtro = $('.tab-filtro', mat);
    var pref = /92/.test(L.tipo) ? 'B' : /146/.test(L.tipo) ? 'T' : /128/.test(L.tipo) ? 'AC' : '';
    var desenha = function (q) {
      tab.innerHTML = UN.filter(function (u) { return !q || (q === 'T' ? u.terraco : q.indexOf(u.planta) >= 0); }).sort(function (x, y) { return y.andar - x.andar || x.final - y.final; }).map(function (u) {
        var p = u.preco;
        return '<tr class="st-' + u.st + '"><td><b>' + u.cod + '</b></td><td>' + u.andar + 'º</td><td>' + u.planta + (u.terraco ? '+T' : '') + '</td><td>' + u.area + ' m²</td><td>' + (u.st === 'v' ? '—' : mi(p)) + '</td><td class="tc-x">' + (u.st === 'v' ? '—' : brl(p * .2)) + '</td><td class="tc-x">' + (u.st === 'v' ? '—' : brl(p * .24 / 24)) + '</td><td class="tc-x">' + (u.st === 'v' ? '—' : brl(p * .1 / 2)) + '</td><td class="tc-x">' + (u.st === 'v' ? '—' : brl(p * .46)) + '</td><td><span class="pn-st st-' + u.st + '">' + ST[u.st] + '</span></td></tr>';
      }).join('');
    };
    if (filtro) {
      $$('button', filtro).forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.q === pref));
        b.addEventListener('click', function () { $$('button', filtro).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); }); desenha(b.dataset.q); });
      });
    }
    desenha(pref);
    var lc = $('.lead-aqui', mat); if (lc) lc.innerHTML = cartaoLead(L);
  }
  if (mat) {
    var L0 = lerLS('vt-lead');
    if (L0) {
      libera(L0);
      var fo0 = $('.captar-topo form[data-captacao]');
      if (fo0) { var ja = document.createElement('div'); ja.className = 'cap-ok';
        ja.innerHTML = '<p class="cap-ok-t">Apresentação liberada para ' + esc(L0.nome.split(' ')[0]) + '</p><p>A tabela de preços, as plantas e a ficha técnica estão logo abaixo, prontas para imprimir.</p><div class="cap-ok-acoes"><a class="pilula pilula-cobre" href="#material">Ver a apresentação</a></div>';
        fo0.replaceWith(ja); }
    } else mat.hidden = true;
    var imp = $('.bt-imprimir'); if (imp) imp.addEventListener('click', function () { print(); });
    var sair = $('.bt-esquecer'); if (sair) sair.addEventListener('click', function () { try { localStorage.removeItem('vt-lead'); } catch (e) {} location.href = location.pathname; });
  }

  // ───────────────────────── 8 · obras entregues (credibilidade) ─────────────────────────
  var OBRAS = [
    ['entregue-solar', 'Solar das Palmeiras', 'Itajaí', 2016, 64, 'entregue 2 meses antes', 27, 'Prédio residencial de tijolo e varandas entre palmeiras'],
    ['entregue-alto-bairro', 'Alto do Bairro', 'Balneário Camboriú', 2018, 88, 'entregue no prazo', 34, 'Torres residenciais altas entre casas e árvores'],
    ['entregue-torre-norte', 'Torre Norte', 'Itapema', 2019, 96, 'entregue 3 meses antes', 29, 'Torre residencial de concreto aparente e janelas em faixa'],
    ['entregue-curvas', 'Ondas Residence', 'Balneário Camboriú', 2021, 72, 'entregue no prazo', 36, 'Fachada branca com varandas curvas e guarda-corpo de vidro'],
    ['entregue-varandas', 'Varandas do Atlântico', 'Itapema', 2023, 80, 'entregue 1 mês antes', 30, 'Edifício escuro com varandas em balanço vistas de baixo'],
    ['entregue-redonda', 'Edifício Rotunda', 'Balneário Camboriú', 2025, 110, 'entregue no prazo', 30, 'Torre arredondada com varandas contínuas sob o céu azul']
  ];
  $$('[data-obras]').forEach(function (cx) {
    var n = +cx.dataset.obras || OBRAS.length;
    cx.innerHTML = OBRAS.slice(-n).reverse().map(function (o) {
      return '<li><img src="img/' + o[0] + '.webp" alt="' + o[7] + '" width="933" height="1400" loading="lazy"><div><small>' + o[2] + ' · ' + o[3] + '</small><b>' + o[1] + '</b><span>' + o[4] + ' apartamentos · ' + o[5] + '</span><em>+' + o[6] + '% do lançamento às chaves*</em></div></li>';
    }).join('');
  });

  // ───────────────────────── 9 · plantas + personalização (home e apartamentos.html) ─────────────────────────
  // planta técnica (60%) com zoom e pinos por cômodo + painel (40%): tipologia, acabamento do piso (troca a amostra e o piso
  // desenhado em 300 ms), insolação por orientação (demonstração) e lista de cômodos ligada aos pinos.
  var SOL = {
    '': 'Sem sobreposição de luz.',
    manha: 'Manhã: o sol do nascente entra pela fachada do mar, na varanda, no living e na suíte master. Demonstração aproximada.',
    tarde: 'Tarde: o sol do poente bate na fachada dos fundos, na cozinha e nas suítes 2 e 3, filtrado pelos brises. Demonstração aproximada.'
  };
  $$('[data-plantas]').forEach(function (pv, ix) {
    var est = { pl: 'A', mat: 'carvalho', sol: '' }, zv = null;
    var h = /planta-([abc])/.exec(location.hash); if (h) est.pl = h[1].toUpperCase();
    pv.classList.add('pv');
    pv.innerHTML =
      '<div class="pv-esq"><div class="pv-tipos" role="tablist" aria-label="Escolha a tipologia">' + ['A', 'B', 'C'].map(function (p) {
        var P = PLANTAS[p]; return '<button type="button" role="tab" data-pl="' + p + '" aria-selected="false"><b>Planta ' + p + '</b><span>' + P.area + ' m² · ' + P.suites + ' suítes · ' + (p === 'A' ? 'mar de frente' : p === 'B' ? 'finais 2 e 3' : 'mar lateral') + '</span></button>';
      }).join('') + '</div><div class="pv-planta-cx"><div class="pv-zoom"></div></div></div>' +
      '<div class="pv-painel">' +
      '<div><h3 class="pv-t"></h3><p class="pv-r mut" style="margin:10px 0 0"></p></div>' +
      '<dl class="pv-ficha"></dl>' +
      '<div class="pv-bloco"><p class="rot">Acabamento do piso</p><div class="pv-mats" role="group" aria-label="Acabamento">' + Object.keys(MAT).map(function (k) {
        return '<button type="button" data-mat="' + k + '" aria-pressed="false"><img src="' + MAT[k].img + '" alt="" width="120" height="120" loading="lazy">' + MAT[k].nome + '</button>';
      }).join('') + '</div></div>' +
      '<figure class="pv-amostra"><img class="pv-a1" src="' + MAT.carvalho.img + '" alt="" width="900" height="600" loading="lazy"><img class="pv-a2" src="' + MAT.carvalho.img + '" alt="" width="900" height="600" loading="lazy" style="opacity:0"><figcaption></figcaption></figure>' +
      '<div class="pv-bloco"><p class="rot">Insolação · demonstração</p><div class="pv-sol" role="group" aria-label="Luz do sol"><button type="button" data-sol="" aria-pressed="true">Sem luz</button><button type="button" data-sol="manha" aria-pressed="false">Manhã</button><button type="button" data-sol="tarde" aria-pressed="false">Tarde</button></div><p class="pv-sol-txt">' + SOL[''] + '</p></div>' +
      '<details class="pv-bloco pv-lista"><summary>Área de cada cômodo</summary><ul class="cap-lista pv-comodos" style="margin-top:14px"></ul></details>' +
      '<div class="acoes" style="margin-top:0"><a class="bt pv-espelho" href="espelho.html" data-cursor="Explorar">Ver unidades desta planta<span class="seta">' + SETA + '</span></a><a class="bt pv-wa" href="#" data-wa="">Planta em PDF</a></div>' +
      '</div>';
    var cx = $('.pv-planta-cx', pv), pop = null;
    var fechaPop = function () { if (pop) { pop.remove(); pop = null; } $$('.pl-pino', cx).forEach(function (p) { p.classList.remove('on'); }); };
    var abrePino = function (pino) {
      fechaPop(); var t = pino.dataset.t, c = GEO[est.pl].c[+pino.dataset.c], info = PINOS[t];
      pino.classList.add('on');
      pop = document.createElement('div'); pop.className = 'pv-comodo'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', info[0]);
      pop.innerHTML = '<img src="' + info[1] + '" alt="' + esc(info[2]) + '" width="520" height="390"><div><b>' + info[0] + '</b><span>' + (c[2] * c[3]).toFixed(1).replace('.', ',') + ' m² · ' + c[2].toFixed(1).replace('.', ',') + ' × ' + c[3].toFixed(1).replace('.', ',') + ' m</span><small>Foto real de referência · banco de imagens, não é o decorado</small></div><button type="button" class="redondo" aria-label="Fechar">×</button>';
      cx.appendChild(pop);
      var rp = pino.getBoundingClientRect(), rc = cx.getBoundingClientRect(), w = pop.offsetWidth, hh = pop.offsetHeight;
      var x = lim(rp.left - rc.left + rp.width + 10, 0, rc.width - w), y = rp.top - rc.top - 10; if (y + hh > rc.height) y = Math.max(0, rc.height - hh);
      if (rp.left - rc.left + rp.width + 10 + w > rc.width && rp.left - rc.left - w - 10 > 0) x = rp.left - rc.left - w - 10;
      pop.style.left = x + 'px'; pop.style.top = y + 'px';
      $('button', pop).addEventListener('click', function () { var p = pino; fechaPop(); p.focus(); });
      $('button', pop).focus({ preventScroll: true });
    };
    var aplicaMat = function (anim) {
      var m = MAT[est.mat], svg = $('.planta-svg', cx);
      if (svg) { var im = $('.pl-mat-img', svg); im.setAttribute('href', m.img); svg.classList.add('com-piso'); }
      var a1 = $('.pv-a1', pv), a2 = $('.pv-a2', pv), vis = a1.style.opacity === '0' ? a2 : a1, nov = vis === a1 ? a2 : a1;
      if (vis.getAttribute('src') !== m.img) { nov.src = m.img; nov.style.opacity = '1'; vis.style.opacity = '0'; }
      $('.pv-amostra figcaption', pv).textContent = m.nome + ' · ' + m.onde + ' · foto da textura';
      $$('[data-mat]', pv).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mat === est.mat)); });
    };
    var aplicaSol = function () {
      var svg = $('.planta-svg', cx); if (svg) {
        var gr = $('.pl-sol-g', svg), t = est.sol === 'tarde';
        gr.setAttribute('y1', t ? 1 : 0); gr.setAttribute('y2', t ? 0 : 1); $('.pl-sol', svg).style.opacity = est.sol ? 1 : 0;
      }
      $$('[data-sol]', pv).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.sol === est.sol)); });
      $('.pv-sol-txt', pv).textContent = SOL[est.sol];
    };
    var tipo = function (pl) {
      est.pl = pl; fechaPop();
      var P = PLANTAS[pl], us = UN.filter(function (u) { return u.planta === pl; }), ds = us.filter(function (u) { return u.st === 'd'; });
      var menor = ds.length ? Math.min.apply(null, ds.map(function (u) { return u.preco; })) : 0;
      $('.pv-t', pv).innerHTML = 'Planta ' + pl + ' · <em>' + P.area + ' m²</em>';
      $('.pv-r', pv).textContent = P.resumo.charAt(0).toUpperCase() + P.resumo.slice(1) + '.';
      $('.pv-ficha', pv).innerHTML = '<div><dt>Suítes</dt><dd>' + P.suites + '</dd></div><div><dt>Vagas</dt><dd>' + P.vagas + ' + dep.</dd></div><div><dt>Disponíveis</dt><dd>' + ds.length + ' de ' + us.length + '</dd></div>' +
        '<div><dt>Finais</dt><dd>' + P.finais.replace('finais ', '').replace('final ', '') + '</dd></div><div><dt>Pé-direito</dt><dd>2,70 m</dd></div><div><dt>A partir de</dt><dd>' + (menor ? mi(menor).replace('R$ ', '') : '—') + '</dd></div>';
      $('.pv-comodos', pv).innerHTML = GEO[pl].c.filter(function (c) { return c[5] !== 'circ'; }).map(function (c) { return '<li style="display:flex;justify-content:space-between;gap:10px"><span>' + c[4] + '</span><b style="font-weight:500;color:var(--graf)">' + (c[2] * c[3]).toFixed(1).replace('.', ',') + ' m²</b></li>'; }).join('');
      $('.pv-espelho', pv).href = 'espelho.html?planta=' + pl;
      $('.pv-wa', pv).setAttribute('data-wa', 'Olá, Vértice Residence! Gostei da ' + P.nome + ' (' + P.area + ' m², ' + P.suites + ' suítes) com acabamento ' + MAT[est.mat].nome.toLowerCase() + '. Quero receber a planta em PDF e saber das unidades disponíveis.');
      zv = visualizador($('.pv-zoom', pv), plantaSVG(pl, { id: 'pv' + ix + pl, esp: pl === 'C', vista: pl === 'A' ? 'mar frontal' : pl === 'C' ? 'mar lateral' : 'mar lateral (final 2) ou cidade (final 3)', mat: est.mat, sol: est.sol, pinos: true }),
        'Toque nos números para ver cada cômodo. No celular, faça pinça para ampliar e arraste para mover; no computador, use os botões ou dois cliques.');
      $$('[data-pl]', pv).forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.pl === pl)); });
      aplicaSol();
    };
    pv.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-pl]'))) { tipo(b.dataset.pl); if (pv.hasAttribute('data-hash')) history.replaceState(null, '', '#planta-' + b.dataset.pl.toLowerCase()); }
      else if ((b = e.target.closest('[data-mat]'))) { est.mat = b.dataset.mat; aplicaMat(true); $('.pv-wa', pv).setAttribute('data-wa', 'Olá, Vértice Residence! Gostei da ' + PLANTAS[est.pl].nome + ' com acabamento ' + MAT[est.mat].nome.toLowerCase() + '. Quero receber a planta em PDF e saber das unidades disponíveis.'); }
      else if ((b = e.target.closest('[data-sol]'))) { est.sol = b.dataset.sol; aplicaSol(); }
      else if ((b = e.target.closest('.pl-pino'))) abrePino(b);
    });
    pv.addEventListener('keydown', function (e) { var p = e.target.closest('.pl-pino'); if (p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); abrePino(p); } if (e.key === 'Escape' && pop) fechaPop(); });
    // os pinos não iniciam o arrastar do zoom
    cx.addEventListener('pointerdown', function (e) { if (e.target.closest('.pl-pino')) e.stopPropagation(); }, true);
    tipo(est.pl); aplicaMat(false);
  });

  // ───────────────────────── 10 · página da unidade (apartamento.html?u=1204) ─────────────────────────
  var ud = $('[data-unidade]');
  if (ud) {
    var u = porCod(params.get('u')) || porCod('1204'), P = PLANTAS[u.planta];
    document.title = 'Unidade ' + u.cod + ' · ' + P.nome + ', ' + u.area + ' m², ' + u.suites + ' suítes · Vértice Residence';
    $$('[data-ucod]').forEach(function (el) { el.textContent = u.cod; });
    visualizador($('.ad-zoom', ud), plantaSVG(u.planta, { esp: u.esp, terraco: u.terraco, vista: u.vista, rotulo: 'Planta da unidade ' + u.cod + ' com os cômodos e as áreas' }));
    $('.ad-info', ud).innerHTML = painel(u);
    var viz = UN.filter(function (o) { return o.final === u.final && o.cod !== u.cod && o.st === 'd'; }).sort(function (x, y) { return Math.abs(x.andar - u.andar) - Math.abs(y.andar - u.andar); }).slice(0, 4);
    var vl = $('.ad-viz'); if (vl) vl.innerHTML = viz.map(function (o) { return '<li><a href="apartamento.html?u=' + o.cod + '"><b>' + o.cod + '</b><span>' + o.andar + 'º andar · ' + o.area + ' m²</span><em>' + mi(o.preco) + '</em></a></li>'; }).join('') || '<li class="ad-viz-vazio">Nenhuma outra unidade deste final disponível agora.</li>';
    var aviso = $('.ad-sem-fluxo'); if (aviso) aviso.hidden = u.st === 'd';
    $('.ad-info', ud).addEventListener('click', function (e) { var b = e.target.closest('[data-u]'); if (b) location.href = 'apartamento.html?u=' + b.dataset.u; });
  }

  // ───────────────────────── 11 · unidade em destaque (cartão do hero) ─────────────────────────
  $$('[data-destaque]').forEach(function (el) {
    var u = porCod(el.dataset.destaque); if (!u || u.st !== 'd') u = disp.slice().sort(function (x, y) { return y.andar - x.andar || y.area - x.area; })[0];
    el.href = 'apartamento.html?u=' + u.cod;
    var q = function (s) { return el.querySelector(s); };
    q('.hc-t').textContent = 'Pavimento ' + u.andar + ' · Final 0' + u.final;
    q('.hc-d').textContent = u.suites + ' suítes · ' + u.area + ' m²' + (u.terraco ? ' com terraço' : '') + ' · vista ' + u.vista;
    q('.hc-p b').textContent = 'a partir de ' + mi(u.preco);
  });
})();
