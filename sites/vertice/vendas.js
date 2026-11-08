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

  // ───────────────────────── 2 · plantas desenhadas (vetor) ─────────────────────────
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
  function plantaSVG(pl, op) {
    op = op || {};
    var g = GEO[pl], esp = !!op.esp, ter = !!op.terraco, topo = ter ? 2.6 : 0, W = g.w * S, H = (g.h + topo) * S;
    var X = function (x, w) { return M + (esp ? g.w - x - w : x) * S; }, Y = function (y) { return M + (y + topo) * S; };
    var out = [], mov = [];
    var r = function (x, y, w, h, cls, rx) { return '<rect class="' + cls + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '"' + (rx ? ' rx="' + rx + '"' : '') + '/>'; };
    if (ter) {
      out.push(r(X(0, g.w * .62), M, g.w * .62 * S, topo * S, 'pl-ext'));
      out.push('<text class="pl-txt" x="' + (X(0, g.w * .62) + g.w * .31 * S) + '" y="' + (M + topo * S / 2) + '">terraço descoberto</text><text class="pl-m2" x="' + (X(0, g.w * .62) + g.w * .31 * S) + '" y="' + (M + topo * S / 2 + 20) + '">18 m²</text>');
    }
    g.c.forEach(function (c) {
      var x = X(c[0], c[2]), y = Y(c[1]), w = c[2] * S, h = c[3] * S, t = c[5], cx = x + w / 2, cy = y + h / 2;
      out.push(r(x, y, w, h, t === 'ext' ? 'pl-ext' : 'pl-comodo'));
      // mobiliário simples, só para dar escala
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
    });
    var vista = op.vista || (pl === 'B' ? 'mar lateral' : 'mar');
    var mar = /mar/.test(vista);
    return '<svg class="planta-svg" viewBox="0 0 ' + (W + 2 * M) + ' ' + (H + 2 * M + 30) + '" role="img" aria-label="' + esc(op.rotulo || PLANTAS[pl].nome + ', ' + PLANTAS[pl].area + ' m²') + '">' +
      '<g class="pl-mob">' + mov.join('') + '</g>' + out.join('') +
      '<rect class="pl-borda" x="' + M + '" y="' + Y(0) + '" width="' + W + '" height="' + (g.h * S) + '"/>' +
      '<path class="pl-vista' + (mar ? '' : ' cidade') + '" d="M' + (M + 10) + ' ' + (M - 18) + 'H' + (M + W - 10) + '"/><text class="pl-cota" x="' + (M + W / 2) + '" y="' + (M - 26) + '">vista: ' + esc(vista) + ' · ' + g.w.toFixed(2).replace('.', ',') + ' m</text>' +
      '<text class="pl-cota" x="' + (M + W / 2) + '" y="' + (H + 2 * M + 14) + '">hall dos elevadores e entrada social</text>' +
      '<g transform="translate(' + (M + W - 10) + ' ' + (H + 2 * M + 4) + ')"><path class="pl-norte" d="M0 -26 L8 0 L0 -6 L-8 0Z"/><text class="pl-cota" x="0" y="16">N</text></g></svg>';
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

  // ───────────────────────── 4 · espelho de vendas ─────────────────────────
  var VAZIO = '<p class="pn-vazio">Toque numa unidade do prédio para ver andar, planta, área, vagas, preço e situação.</p><p class="pn-dica">Verde está à venda. Amarelo está reservada por 48 horas. Cinza já foi vendida.</p>';
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

  $$('[data-espelho]').forEach(function (raiz, ix) {
    raiz.classList.add('es'); var sel = null;
    var chips = function (nome, ops) { return ops.map(function (o, i) { return '<label><input type="radio" name="' + nome + '" value="' + o[0] + '"' + (i === 0 ? ' checked' : '') + '><span>' + o[1] + '</span></label>'; }).join(''); };
    var andares = ''; for (var a = 1; a <= 18; a++) andares += '<option value="' + a + '">' + a + 'º</option>';
    raiz.innerHTML =
      '<div class="es-topo"><ul class="es-cont" aria-label="Situação das 72 unidades"><li class="st-d"><b>' + conta.d + '</b> disponíveis</li><li class="st-r"><b>' + conta.r + '</b> reservadas</li><li class="st-v"><b>' + conta.v + '</b> vendidas</li><li class="es-pct"><b>' + vendido + '%</b> vendido</li></ul>' +
      '<p class="es-at">Atualizado hoje às <span data-hora></span> · demonstração</p></div>' +
      '<details class="es-dobra"' + (largo.matches ? ' open' : '') + '><summary><span>Filtrar unidades</span><em class="es-ativos"></em></summary>' +
      '<form class="es-filtros" aria-label="Filtros do espelho">' +
      '<fieldset><legend>Situação</legend><div class="chips">' + chips('st', [['', 'Todas'], ['d', 'Disponíveis'], ['r', 'Reservadas'], ['v', 'Vendidas']]) + '</div></fieldset>' +
      '<fieldset><legend>Planta</legend><div class="chips">' + chips('pl', [['', 'Todas'], ['A', 'A · 128 m²'], ['B', 'B · 92 m²'], ['C', 'C · 128 m²']]) + '</div></fieldset>' +
      '<fieldset class="es-and"><legend>Andar</legend><label>do <select name="de">' + andares + '</select></label><label>ao <select name="ate">' + andares.replace('value="18"', 'value="18" selected') + '</select></label></fieldset>' +
      '<label class="es-campo">Área mínima<select name="ar"><option value="0">qualquer área</option><option value="92">a partir de 92 m²</option><option value="128">a partir de 128 m²</option><option value="146">146 m² com terraço</option></select></label>' +
      '<label class="es-campo es-preco">Preço até <output></output><input type="range" name="pr" min="1300000" max="2500000" step="10000" value="2500000"></label>' +
      '<fieldset><legend>Vista</legend><div class="chips">' + chips('vi', [['', 'Todas'], ['mar', 'Mar'], ['cidade', 'Cidade']]) + '</div></fieldset>' +
      '<button type="reset" class="pilula pilula-linha es-limpa">Limpar filtros</button></form></details>' +
      '<div class="es-barra"><p class="es-total" aria-live="polite"></p><div class="es-modo" role="group" aria-label="Forma de ver"><button type="button" data-m="predio" aria-pressed="true">Prédio</button><button type="button" data-m="lista" aria-pressed="false">Lista</button></div>' +
      '<p class="es-leg" aria-hidden="true"><span class="st-d">disponível</span><span class="st-r">reservada</span><span class="st-v">vendida</span></p></div>' +
      '<div class="es-grade"><div class="es-area"><div class="es-predio" role="grid" aria-label="Espelho de vendas: 18 andares, 4 unidades por andar"></div>' +
      '<div class="es-lista" hidden><label class="es-ord">Ordenar <select name="ord"><option value="andar">andar mais alto</option><option value="preco">menor preço</option><option value="area">maior área</option><option value="m2">menor preço por m²</option></select></label><table><thead><tr><th>Unidade</th><th>Andar</th><th>Planta</th><th>Área</th><th>Suítes</th><th>Vagas</th><th>Preço</th><th>Situação</th></tr></thead><tbody></tbody></table></div></div>' +
      '<aside class="es-painel" aria-live="polite" aria-label="Unidade escolhida">' + VAZIO + '</aside></div>' +
      '<p class="demo">' + DEMO + ' Quando uma unidade é reservada ou vendida, a cor muda sozinha para todos os corretores e para o site.</p>' +
      '<dialog class="es-dlg" aria-label="Unidade escolhida"><button type="button" class="redondo es-dlg-x" aria-label="Fechar">×</button><div class="es-dlg-corpo"></div></dialog>';
    var fo = $('.es-filtros', raiz), predio = $('.es-predio', raiz), aside = $('.es-painel', raiz), dlg = $('.es-dlg', raiz), tb = $('tbody', raiz), ord = $('[name=ord]', raiz);
    var hora = new Date(); $('[data-hora]', raiz).textContent = String(hora.getHours()).padStart(2, '0') + ':' + String(hora.getMinutes()).padStart(2, '0');
    if (params.get('planta') && /^[ABC]$/.test(params.get('planta'))) fo.pl.value = params.get('planta');
    var passa = function (u) {
      var de = +fo.de.value, ate = +fo.ate.value; if (de > ate) { var t = de; de = ate; ate = t; }
      return (!fo.st.value || u.st === fo.st.value) && (!fo.pl.value || u.planta === fo.pl.value) && u.andar >= de && u.andar <= ate &&
        u.area >= +fo.ar.value && u.preco <= +fo.pr.value && (!fo.vi.value || (fo.vi.value === 'mar') === /mar/.test(u.vista));
    };
    var cel = function (u) {
      return '<button type="button" role="gridcell" class="un st-' + u.st + '" data-u="' + u.cod + '" aria-pressed="false" aria-label="Unidade ' + u.cod + ', ' + u.andar + 'º andar, ' + PLANTAS[u.planta].nome + ', ' + u.area + ' metros, ' + ST[u.st] + (u.st !== 'v' ? ', ' + mi(u.preco) : '') + '">' +
        '<b>' + u.cod + '</b><small>' + (u.st === 'v' ? 'vendida' : mi(u.preco).replace('R$ ', '')) + '</small></button>';
    };
    var html = '<div class="es-teto" aria-hidden="true">Rooftop · piscina e espaço gourmet no 19º andar</div><span class="es-h es-h-and" aria-hidden="true">andar</span>' +
      [1, 2, 3, 4].map(function (f) { return '<span class="es-h" role="columnheader">Final ' + f + '<small>' + FINAL[f].planta + ' · ' + FINAL[f].vista.replace(' e morros', '') + '</small></span>'; }).join('');
    for (var an = 18; an >= 1; an--) {
      html += '<span class="es-and" role="rowheader" aria-label="' + an + 'º andar">' + an + '</span>';
      for (var fi = 1; fi <= 4; fi++) html += cel(porCod(an * 100 + fi));
    }
    html += '<div class="es-base" aria-hidden="true">Térreo · hall de pé-direito duplo, academia e coworking</div>';
    predio.innerHTML = html;
    var lista = function (l) {
      var o = ord.value;
      l = l.slice().sort(o === 'preco' ? function (x, y) { return x.preco - y.preco; } : o === 'area' ? function (x, y) { return y.area - x.area || x.preco - y.preco; } : o === 'm2' ? function (x, y) { return x.m2 - y.m2; } : function (x, y) { return y.andar - x.andar || x.final - y.final; });
      tb.innerHTML = l.map(function (u) {
        return '<tr class="st-' + u.st + '" data-u="' + u.cod + '" tabindex="0"><td data-r="Unidade"><b>' + u.cod + '</b></td><td data-r="Andar">' + u.andar + 'º</td><td data-r="Planta">' + u.planta + (u.terraco ? ' + terraço' : '') + '</td><td data-r="Área">' + u.area + ' m²</td><td data-r="Suítes">' + u.suites + '</td><td data-r="Vagas">' + u.vagas + '</td><td data-r="Preço">' + (u.st === 'v' ? '—' : mi(u.preco)) + '</td><td data-r="Situação"><span class="pn-st st-' + u.st + '">' + ST[u.st] + '</span></td></tr>';
      }).join('') || '<tr><td colspan="8">Nenhuma unidade com esses filtros.</td></tr>';
    };
    var filtra = function () {
      var out = $('output', fo); out.textContent = +fo.pr.value >= 2500000 ? 'qualquer valor' : mi(+fo.pr.value);
      var ok = UN.filter(passa), nd = ok.filter(function (u) { return u.st === 'd'; }).length;
      $$('.un', predio).forEach(function (b) { b.classList.toggle('fora', !passa(porCod(b.dataset.u))); });
      var ativos = 0; ['st', 'pl', 'vi'].forEach(function (n) { if (fo[n].value) ativos++; }); if (+fo.de.value !== 1 || +fo.ate.value !== 18) ativos++; if (+fo.ar.value) ativos++; if (+fo.pr.value < 2500000) ativos++;
      $('.es-ativos', raiz).textContent = ativos ? ativos + (ativos === 1 ? ' filtro ativo' : ' filtros ativos') : '';
      $('.es-total', raiz).textContent = ok.length === 72 ? 'Mostrando as 72 unidades · ' + nd + ' disponíveis' : ok.length ? ok.length + (ok.length === 1 ? ' unidade' : ' unidades') + ' com esses filtros · ' + nd + (nd === 1 ? ' disponível' : ' disponíveis') : 'Nenhuma unidade com esses filtros. Tente subir o preço ou abrir os andares.';
      lista(ok);
    };
    fo.addEventListener('input', filtra); fo.addEventListener('change', filtra);
    fo.addEventListener('reset', function () { setTimeout(filtra, 0); });
    ord.addEventListener('change', filtra);
    $$('.es-modo button', raiz).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.es-modo button', raiz).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        predio.hidden = b.dataset.m !== 'predio'; $('.es-lista', raiz).hidden = b.dataset.m !== 'lista';
      });
    });
    var mostra = function (cod, rolar) {
      var u = porCod(cod); if (!u) return; sel = u;
      $$('[data-u]', predio).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.u === u.cod)); });
      $$('tr[data-u]', tb).forEach(function (t) { t.classList.toggle('on', t.dataset.u === u.cod); });
      if (largo.matches) { aside.innerHTML = painel(u); if (rolar) { var r = aside.getBoundingClientRect(); if (r.top < 0 || r.top > innerHeight - 120) aside.scrollIntoView({ block: 'nearest', behavior: calmo ? 'auto' : 'smooth' }); } }
      else { $('.es-dlg-corpo', dlg).innerHTML = painel(u); if (!dlg.open) dlg.showModal(); $('.es-dlg-corpo', dlg).scrollTop = 0; }
      raiz.dispatchEvent(new CustomEvent('vt-unidade', { bubbles: true, detail: u.cod }));
    };
    raiz.addEventListener('click', function (e) {
      var b = e.target.closest('[data-u]');
      if (b && !b.closest('.pn-acoes')) { mostra(b.dataset.u, true); return; }
      var s = e.target.closest('[data-sim-u]');
      if (s && s.getAttribute('href') === '#simulador') { e.preventDefault(); if (dlg.open) dlg.close(); VT.simular(s.dataset.simU); }
    });
    tb.addEventListener('keydown', function (e) { var t = e.target.closest('tr[data-u]'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); mostra(t.dataset.u, true); } });
    $('.es-dlg-x', dlg).addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    filtra();
    var pu = params.get('u'); if (pu && porCod(pu) && raiz.hasAttribute('data-abrir-url')) setTimeout(function () { mostra(pu, false); }, 300);
  });

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
        '<div class="barra" aria-hidden="true"><i style="width:' + e + '%;background:#f1c7b4"></i><i style="width:' + m + '%;background:#cf8f7d"></i><i style="width:' + it + '%;background:#8a4f42"></i><i style="width:' + ch + '%;background:#2a4670"></i></div>' +
        '<p class="sim-leg" aria-hidden="true"><span style="--c:#f1c7b4">entrada ' + e + '%</span><span style="--c:#cf8f7d">mensais ' + m + '%</span><span style="--c:#8a4f42">intermediárias ' + it + '%</span><span style="--c:#2a4670">chaves ' + ch + '%</span></p>' +
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

  // ───────────────────────── 9 · página das plantas (apartamentos.html) ─────────────────────────
  var pv = $('[data-plantas]');
  if (pv) {
    var zv = null, abas = $$('[data-tab-planta]');
    var ficha = function (pl) {
      var P = PLANTAS[pl], us = UN.filter(function (u) { return u.planta === pl; }), ds = us.filter(function (u) { return u.st === 'd'; });
      var menor = ds.length ? Math.min.apply(null, ds.map(function (u) { return u.preco; })) : 0;
      $('.pf-t', pv).textContent = P.nome + ' · ' + P.area + ' m²';
      $('.pf-r', pv).textContent = P.resumo + '.';
      $('.pf-ficha', pv).innerHTML = '<dt>Área privativa</dt><dd>' + P.area + ' m²' + (P.suites === 3 ? ' (146 m² do 15º ao 18º, com terraço)' : '') + '</dd>' +
        '<dt>Suítes</dt><dd>' + P.suites + '</dd><dt>Vagas</dt><dd>' + P.vagas + ' + depósito privativo</dd><dt>Finais</dt><dd>' + P.finais + '</dd><dt>Pé-direito</dt><dd>2,70 m (living 2,90 m)</dd><dt>Varanda</dt><dd>gourmet com churrasqueira elétrica e ponto de pia</dd>' +
        '<dt>Ar-condicionado</dt><dd>infraestrutura em todos os ambientes</dd><dt>Disponíveis</dt><dd>' + ds.length + ' de ' + us.length + (ds.length ? ' · a partir de ' + mi(menor) : '') + '</dd>';
      $('.pf-comodos', pv).innerHTML = GEO[pl].c.filter(function (c) { return c[5] !== 'circ'; }).map(function (c) { return '<li><span>' + c[4] + '</span><b>' + (c[2] * c[3]).toFixed(1).replace('.', ',') + ' m²</b></li>'; }).join('');
      $('.pf-espelho', pv).href = 'espelho.html?planta=' + pl;
      $('.pf-wa', pv).setAttribute('data-wa', 'Olá, Vértice Residence! Gostei da ' + P.nome + ' (' + P.area + ' m², ' + P.suites + ' suítes). Quero saber das unidades disponíveis e receber a planta em PDF.');
      zv = visualizador($('.pf-zoom', pv), plantaSVG(pl, { esp: pl === 'C', vista: pl === 'A' ? 'mar frontal' : pl === 'C' ? 'mar lateral' : 'mar lateral (final 2) ou cidade (final 3)' }));
      abas.forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tabPlanta === pl)); });
    };
    abas.forEach(function (b) { b.addEventListener('click', function () { ficha(b.dataset.tabPlanta); history.replaceState(null, '', '#planta-' + b.dataset.tabPlanta.toLowerCase()); }); });
    var h = /planta-([abc])/.exec(location.hash);
    ficha(h ? h[1].toUpperCase() : 'A');
  }

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
})();
