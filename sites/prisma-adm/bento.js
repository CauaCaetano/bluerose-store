/* Prisma · painel demonstrativo em bento (dados fictícios de exemplo).
   Período (mês, trimestre, ano) e cenários (comerciais, reajuste projetado, metas) mudam todos os módulos.
   Gráficos em SVG com transição de 350 ms, números contam em 800 ms, dicas ao passar o mouse, tocar ou focar.
   Brilho de borda que segue o mouse só em ponteiro fino. Respeita prefers-reduced-motion. */
(function () {
  'use strict';
  var alvos = document.querySelectorAll('[data-bento]');
  if (!alvos.length) return;
  var reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- dados de exemplo (R$ mil por mês, nov/2025 a out/2026) ----------
  var MES = ['nov', 'dez', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out'];
  var MES_L = ['novembro de 2025', 'dezembro de 2025', 'janeiro de 2026', 'fevereiro de 2026', 'março de 2026', 'abril de 2026', 'maio de 2026', 'junho de 2026', 'julho de 2026', 'agosto de 2026', 'setembro de 2026', 'outubro de 2026'];
  var RES = [1412, 1420, 1431, 1426, 1440, 1447, 1452, 1449, 1461, 1470, 1468, 1481];
  var COM = [528, 531, 529, 536, 540, 538, 545, 549, 547, 552, 556, 559];
  var INR = [3.7, 3.9, 3.6, 3.8, 3.4, 3.1, 3.3, 3.0, 2.9, 3.2, 2.7, 2.6];
  var INC = [4.6, 4.4, 4.8, 4.5, 4.1, 4.0, 3.9, 3.7, 3.8, 3.5, 3.4, 3.4];
  var OCR = [91.6, 92.0, 92.6, 93.0, 92.8, 93.5, 93.9, 93.6, 94.2, 94.5, 94.4, 94.6];
  var OCC = [86.6, 86.6, 87.5, 87.5, 88.4, 88.4, 89.3, 89.3, 90.2, 91.1, 91.1, 92.0];
  var N_RES = 700, N_COM = 112;
  var SEM5 = [0.31, 0.36, 0.19, 0.10, 0.04];   // repartição dos pagamentos nas semanas do mês
  var SEM4 = [0.40, 0.35, 0.17, 0.08];
  var CAT = ['Hidráulica', 'Elétrica', 'Infiltração', 'Portão e fechadura', 'Pintura', 'Ar-condicionado'];
  var CAT_R = [34, 27, 15, 11, 9, 5], CAT_C = [4, 9, 2, 3, 2, 12];
  var ETAPAS = ['Cadastro', 'Documentos', 'Análise', 'Garantia', 'Assinatura', 'Chaves'];
  var FUN_R = [18, 12, 8, 5, 4, 3], FUN_C = [3, 2, 1, 1, 1, 1];
  var JANELA = { mes: [11], tri: [9, 10, 11], ano: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
  var ANTES = { mes: [10], tri: [6, 7, 8] };
  var REAJ = 0.044, TAXA = 0.08, DESP = 0.012;

  function soma(a) { return a.reduce(function (s, v) { return s + v; }, 0); }
  function bruto(m, com) { return RES[m] + (com ? COM[m] : 0); }

  function calcular(st) {
    var j = JANELA[st.per], com = st.com, pts = [];
    if (st.per === 'mes') {
      SEM5.forEach(function (p, i) { var v = bruto(11, com) * p; pts.push({ r: (i + 1) + 'ª sem.', l: (i + 1) + 'ª semana de outubro de 2026', v: v }); });
    } else if (st.per === 'tri') {
      j.forEach(function (m) { SEM4.forEach(function (p, i) { pts.push({ r: i ? (i + 1) + 'ª' : MES[m], l: (i + 1) + 'ª semana de ' + MES_L[m], v: bruto(m, com) * p }); }); });
    } else {
      j.forEach(function (m) { pts.push({ r: MES[m], l: MES_L[m], v: bruto(m, com) }); });
    }
    var rec = soma(j.map(function (m) { return bruto(m, com); }));
    var ant = st.per === 'ano' ? rec / 1.053 : soma(ANTES[st.per].map(function (m) { return bruto(m, com); }));
    var inadS = MES.map(function (_, m) { return com ? (RES[m] * INR[m] + COM[m] * INC[m]) / (RES[m] + COM[m]) : INR[m]; });
    var ocupS = MES.map(function (_, m) { return com ? (OCR[m] * N_RES + OCC[m] * N_COM) / (N_RES + N_COM) : OCR[m]; });
    var nm = j.length, fat = st.per === 'ano' ? 11.4 : nm;
    return {
      pts: pts,
      barras: pts.map(function (p) { return p.v; }),
      linha: pts.map(function (p) { return p.v * (1 - TAXA - DESP); }),
      proj: st.reaj ? pts.map(function (p) { return p.v * (1 + REAJ); }) : null,
      recebido: rec * 1000, anterior: ant * 1000, repassado: rec * (1 - TAXA - DESP) * 1000, taxa: rec * TAXA * 1000,
      ganhoReaj: rec * REAJ * 1000,
      prazo: { mes: 1.5, tri: 1.6, ano: 1.7 }[st.per] + (com ? 0.1 : 0),
      inadS: inadS, inad: soma(j.map(function (m) { return inadS[m]; })) / nm,
      ocupS: ocupS, ocup: soma(j.map(function (m) { return ocupS[m]; })) / nm,
      contratos: N_RES + (com ? N_COM : 0), vagos: Math.round(N_RES * (1 - OCR[11] / 100) + (com ? N_COM * (1 - OCC[11] / 100) : 0)),
      cham: CAT.map(function (_, i) { return Math.round((CAT_R[i] + (com ? CAT_C[i] : 0)) * fat); }),
      funil: ETAPAS.map(function (_, i) { return Math.round((FUN_R[i] + (com ? FUN_C[i] : 0)) * fat); })
    };
  }

  // ---------- formatação ----------
  function fmt(v, c) { return v.toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c }); }
  function mi(v) { return v >= 1e6 ? 'R$ ' + fmt(v / 1e6, 2) + ' mi' : 'R$ ' + fmt(v / 1e3, 0) + ' mil'; }
  function mil(v) { return 'R$ ' + fmt(v, 0) + ' mil'; }
  var FORMATOS = {
    recebido: mi, repassado: mi, taxa: mi,
    prazo: function (v) { return fmt(v, 1); }, inad: function (v) { return fmt(v, 1) + '%'; },
    ocup: function (v) { return fmt(v, 1) + '%'; }, contratos: function (v) { return fmt(Math.round(v), 0); }
  };

  // ---------- escala ----------
  function teto(v) {
    var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    var passos = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10]; for (var i = 0; i < passos.length; i++) if (n <= passos[i]) return passos[i] * p; return 10 * p;
  }

  // ---------- desenho ----------
  function grafPrincipal(d, st, ativo) {
    var W = 720, H = 300, m = { t: 18, r: 14, b: 34, l: 64 }, iw = W - m.l - m.r, ih = H - m.t - m.b, n = d.barras.length;
    var max = teto(Math.max.apply(null, d.barras.concat(d.proj || [])) * 1.06 || 1);
    var y = function (v) { return m.t + ih - ih * Math.max(0, v) / max; }, passo = iw / n, bw = Math.min(46, passo * 0.56);
    var cx = function (i) { return m.l + passo * i + passo / 2; };
    var s = '<svg class="bg-svg" viewBox="0 0 ' + W + ' ' + H + '" tabindex="0" role="img" aria-label="Recebido e repassado por ' + (st.per === 'ano' ? 'mês' : 'semana') + '. Use as setas para percorrer.">';
    for (var k = 0; k <= 4; k++) { var v = max * k / 4; s += '<line class="ref" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (m.l - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + (v ? (v >= 1000 ? fmt(v / 1000, 1) + ' mi' : fmt(v, v < 100 ? 1 : 0) + ' mil') : '0') + '</text>'; }
    d.barras.forEach(function (v, i) {
      s += '<rect class="b-rec' + (i === ativo ? ' ativo' : '') + '" x="' + (cx(i) - bw / 2) + '" y="' + y(v) + '" width="' + bw + '" height="' + (m.t + ih - y(v)) + '" rx="1.5"/>';
      s += '<text class="rx' + (i === ativo ? ' t-ativo' : '') + '" x="' + cx(i) + '" y="' + (H - 12) + '" text-anchor="middle">' + d.pts[i].r + '</text>';
    });
    var lp = d.linha.map(function (v, i) { return cx(i) + ',' + y(v); }).join(' ');
    s += '<polyline class="l-rep" points="' + lp + '"/>';
    d.linha.forEach(function (v, i) { s += '<circle class="p-rep' + (i === ativo ? ' ativo' : '') + '" cx="' + cx(i) + '" cy="' + y(v) + '" r="3.5"/>'; });
    if (d.proj) s += '<polyline class="l-proj" points="' + d.proj.map(function (v, i) { return cx(i) + ',' + y(v); }).join(' ') + '"/>';
    var gx = ativo != null && ativo < n ? cx(ativo) : -50;
    s += '<line class="guia" x1="' + gx + '" x2="' + gx + '" y1="' + m.t + '" y2="' + (m.t + ih) + '"' + (gx < 0 ? ' style="display:none"' : '') + '/>';
    d.barras.forEach(function (v, i) {
      var tip = '<b>' + d.pts[i].l + '</b>Recebido: ' + mil(v) + '<br>Repassado: ' + mil(d.linha[i]) + (d.proj ? '<br>Com reajuste: ' + mil(d.proj[i]) : '');
      s += '<rect class="alvo" data-i="' + i + '" data-tip="' + tip.replace(/"/g, '&quot;') + '" x="' + (m.l + passo * i) + '" y="' + m.t + '" width="' + passo + '" height="' + ih + '"/>';
    });
    return s + '</svg>';
  }

  function grafInad(d, st, estreito) {
    var W = estreito ? 320 : 360, H = estreito ? 176 : 132, m = { t: 12, r: 10, b: 34, l: 10 }, iw = W - m.l - m.r, ih = H - m.t - m.b, min = 2, max = 4.6;
    var x = function (i) { return m.l + iw * i / 11; }, y = function (v) { return m.t + ih - ih * (v - min) / (max - min); };
    var j = JANELA[st.per], s = '<svg class="bg-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Inadimplência acima de 30 dias, 12 meses">';
    s += '<rect class="faixa" x="' + (x(j[0]) - (j.length === 12 ? 0 : 12)) + '" y="' + m.t + '" width="' + Math.max(24, x(j[j.length - 1]) - x(j[0]) + (j.length === 12 ? 0 : 24)) + '" height="' + ih + '"/>';
    if (st.meta) s += '<line class="meta" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(2.5) + '" y2="' + y(2.5) + '"/><text class="t-meta" x="' + (m.l + 2) + '" y="' + (y(2.5) + 14) + '">meta 2,5%</text>';
    var pts = d.inadS.map(function (v, i) { return x(i) + ',' + y(v); }).join(' ');
    s += '<polygon class="a-inad" points="' + x(0) + ',' + (m.t + ih) + ' ' + pts + ' ' + x(11) + ',' + (m.t + ih) + '"/><polyline class="l-inad" points="' + pts + '"/>';
    d.inadS.forEach(function (v, i) {
      var dentro = j.indexOf(i) > -1;
      if (estreito ? (i % 3 === 2 || i === 11) : true) s += '<circle class="p-inad' + (dentro ? ' dentro' : '') + '" cx="' + x(i) + '" cy="' + y(v) + '" r="' + (estreito ? (dentro ? 3.4 : 2.4) : (dentro ? 4 : 2.6)) + '"/>';
      s += '<rect class="alvo" data-tip="<b>' + MES_L[i] + '</b>Inadimplência: ' + fmt(v, 1) + '%" x="' + (x(i) - iw / 24) + '" y="' + m.t + '" width="' + iw / 12 + '" height="' + ih + '"/>';
      if (estreito ? i % 3 === 2 : (i % 2 === 1 || i === 11)) s += '<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="' + (i === 11 ? 'end' : 'middle') + '">' + MES[i] + '</text>';
    });
    return s + '</svg>';
  }

  function anel(d, st) {
    var r = 46, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, d.ocup)) / 100;
    var s = '<svg class="bg-svg anel" viewBox="0 0 120 120" role="img" aria-label="Ocupação ' + fmt(d.ocup, 1) + '%">';
    s += '<circle class="anel-f" cx="60" cy="60" r="' + r + '"/>';
    s += '<circle class="anel-v" cx="60" cy="60" r="' + r + '" stroke-dasharray="' + (c * p) + ' ' + c + '" transform="rotate(-90 60 60)" data-tip="<b>Ocupação média</b>' + fmt(d.ocup, 1) + '% dos imóveis alugados"/>';
    if (st.meta) { var a = (0.95 * 360 - 90) * Math.PI / 180; s += '<line class="meta-anel" x1="' + (60 + 38 * Math.cos(a)) + '" y1="' + (60 + 38 * Math.sin(a)) + '" x2="' + (60 + 55 * Math.cos(a)) + '" y2="' + (60 + 55 * Math.sin(a)) + '" data-tip="<b>Meta</b>95% de ocupação"/>'; }
    return s + '</svg>';
  }

  function barrasH(valores, rotulos, classe, sufixo) {
    var max = Math.max.apply(null, valores.concat([1]));
    return valores.map(function (v, i) {
      return '<li data-tip="<b>' + rotulos[i] + '</b>' + fmt(Math.round(v), 0) + ' ' + sufixo + '"><span>' + rotulos[i] + '</span><i class="' + classe + '"><em style="width:' + (100 * v / max).toFixed(2) + '%"></em></i><b>' + fmt(Math.round(v), 0) + '</b></li>';
    }).join('');
  }

  // ---------- tween ----------
  function mistura(a, b, k) {
    if (b == null) return null;
    if (Array.isArray(b)) { var base = Array.isArray(a) && a.length === b.length ? a : b.map(function () { return 0; }); return b.map(function (v, i) { return base[i] + (v - base[i]) * k; }); }
    if (typeof b === 'number') return (typeof a === 'number' ? a : 0) + (b - (typeof a === 'number' ? a : 0)) * k;
    return b;
  }

  function montar(el) {
    var equipe = el.dataset.bento === 'equipe';
    var st = { per: 'ano', com: true, reaj: false, meta: false };
    el.innerHTML =
      '<div class="bento-ctl">' +
        '<div class="seg" role="group" aria-label="Período"><button type="button" data-per="mes" aria-pressed="false">Mês</button><button type="button" data-per="tri" aria-pressed="false">Trimestre</button><button type="button" data-per="ano" aria-pressed="true">12 meses</button></div>' +
        '<div class="chaves">' +
          '<button type="button" role="switch" aria-checked="true" data-chave="com"><i aria-hidden="true"></i>Incluir comerciais</button>' +
          '<button type="button" role="switch" aria-checked="false" data-chave="reaj"><i aria-hidden="true"></i>Projetar reajuste (IPCA 4,4%)</button>' +
          '<button type="button" role="switch" aria-checked="false" data-chave="meta"><i aria-hidden="true"></i>Mostrar metas</button>' +
        '</div>' +
        '<button type="button" class="bt bt-lin bt-peq bt-rel" data-relatorio><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2h7l4 4v12H5Z M12 2v4h4 M8 11h6M8 14h6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>Gerar relatório</button>' +
        '<p class="bento-per" aria-live="polite"></p>' +
      '</div>' +
      '<div class="bento">' +
        '<article class="cel c-rec"><h3>Aluguel recebido</h3><strong class="kpi" data-k="recebido">R$ 0</strong><p class="delta"></p><p class="extra" data-x="reaj"></p></article>' +
        '<article class="cel c-graf"><div class="cel-cab"><h3>Recebido e repassado</h3><ul class="leg"><li><i class="lg-rec"></i>Recebido dos inquilinos</li><li><i class="lg-rep"></i>Repassado aos proprietários</li><li class="lg-p"><i class="lg-proj"></i>Com reajuste</li></ul></div><div class="rola-x"><div class="g-principal"></div></div><p class="dica-rola" aria-hidden="true">Deslize o gráfico para ver todos os períodos →</p></article>' +
        '<article class="cel c-rep"><h3>Repassado</h3><strong class="kpi kpi-m" data-k="repassado">R$ 0</strong><p class="mini">líquido, após taxa de 8% e despesas</p></article>' +
        '<article class="cel c-prazo"><h3>Prazo do repasse</h3><strong class="kpi kpi-m"><span data-k="prazo">0</span> <small>dias úteis</small></strong><p class="mini" data-x="prazo"></p></article>' +
        '<article class="cel c-inad"><div class="cel-cab"><h3>Inadimplência &gt; 30 dias</h3><strong class="kpi kpi-p" data-k="inad">0%</strong></div><div class="g-inad"></div><p class="mini" data-x="inad"></p></article>' +
        '<article class="cel c-ocup"><div class="cel-cab"><h3>Ocupação</h3></div><div class="anel-caixa"><div class="g-anel"></div><strong class="kpi kpi-p anel-n" data-k="ocup">0%</strong></div><p class="mini" data-x="ocup"></p></article>' +
        '<article class="cel c-cham"><div class="cel-cab"><h3>Chamados por tipo</h3><span class="mini" data-x="cham"></span></div><ul class="barras-h g-cham"></ul></article>' +
        '<article class="cel c-funil"><div class="cel-cab"><h3>Esteira de locação online</h3><span class="mini" data-x="funil"></span></div><ul class="barras-h g-funil"></ul></article>' +
        '<article class="cel c-cart"><h3>Carteira administrada</h3><strong class="kpi kpi-m" data-k="contratos">0</strong><p class="mini">contratos ativos</p><div class="pilha" aria-hidden="true"><i class="p-res"></i><i class="p-com"></i></div><p class="mini" data-x="cart"></p>' +
          (equipe ? '<dl class="mini-dl"><div><dt>Novos contratos no período</dt><dd data-x="novos"></dd></div><div><dt>Imóveis vagos hoje</dt><dd data-x="vagos"></dd></div></dl>' : '<a class="bt bt-lin bt-peq seta" href="painel.html">Abrir o painel da equipe <span aria-hidden="true">→</span></a>') + '</article>' +
      '</div>' +
      '<div class="bento-tip" role="tooltip" hidden></div>' +
      '<p class="nota">Demonstração com dados fictícios. No site real, estes números vêm do sistema da administradora (Superlógica, Jetimob, Vista… por API), atualizados sozinhos.</p>';

    var $ = function (s) { return el.querySelector(s); }, $$ = function (s) { return Array.prototype.slice.call(el.querySelectorAll(s)); };
    var vis = null, alvo = null, ativo = null, rafG = 0, visto = false;

    function textos(d) {
      var nomes = { mes: 'Outubro de 2026, comparado a setembro', tri: 'Agosto a outubro de 2026, comparado a maio a julho', ano: 'Novembro de 2025 a outubro de 2026, comparado aos 12 meses anteriores' };
      $('.bento-per').textContent = nomes[st.per] + (st.com ? ' · residenciais e comerciais' : ' · só residenciais') + ' · exemplo';
      var dv = (d.recebido / d.anterior - 1) * 100;
      $('.delta').innerHTML = '<span class="' + (dv >= 0 ? 'sobe' : 'desce') + '">' + (dv >= 0 ? '▲ ' : '▼ ') + fmt(Math.abs(dv), 1) + '%</span> sobre o período anterior';
      $('[data-x="reaj"]').innerHTML = st.reaj ? 'Com o reajuste projetado: <b>+ ' + mi(d.ganhoReaj) + '</b> no mesmo período' : 'Taxa de administração no período: <b>' + mi(d.taxa) + '</b>';
      $('[data-x="prazo"]').innerHTML = st.meta ? 'meta: até 2 dias úteis · <span class="sobe">dentro da meta</span>' : 'do pagamento do inquilino ao Pix do proprietário';
      $('[data-x="inad"]').innerHTML = 'média do período' + (st.meta ? ' · meta 2,5% · <span class="' + (d.inad <= 2.5 ? 'sobe">dentro' : 'desce">acima') + ' da meta</span>' : ' · faixa destacada no gráfico');
      $('[data-x="ocup"]').innerHTML = d.vagos + ' imóveis vagos hoje' + (st.meta ? ' · meta 95%' : '');
      $('[data-x="cham"]').textContent = soma(d.cham) + ' no período';
      $('[data-x="funil"]').textContent = d.funil[0] + ' cadastros, ' + d.funil[5] + ' chaves entregues';
      $('[data-x="cart"]').textContent = N_RES + ' residenciais' + (st.com ? ' · ' + N_COM + ' comerciais' : ' · comerciais fora do filtro');
      $('.c-cart .p-com').style.flexGrow = st.com ? N_COM : 0.0001;
      $('.c-cart .p-res').style.flexGrow = N_RES;
      if ($('[data-x="novos"]')) { $('[data-x="novos"]').textContent = d.funil[5] + ' (exemplo)'; $('[data-x="vagos"]').textContent = d.vagos; }
      el.classList.toggle('com-proj', st.reaj);
    }

    function desenhar(v) {
      $('.g-principal').innerHTML = grafPrincipal(v, st, ativo);
      $('.g-inad').innerHTML = grafInad(v, st, el.clientWidth < 560);
      $('.g-anel').innerHTML = anel(v, st);
      $('.g-cham').innerHTML = barrasH(v.cham, CAT, 'bh-pet', 'chamados');
      $('.g-funil').innerHTML = barrasH(v.funil, ETAPAS, 'bh-oli', 'interessados');
    }

    function contar(d, rapido) {
      Object.keys(FORMATOS).forEach(function (k) {
        var n = el.querySelector('[data-k="' + k + '"]'); if (!n) return;
        var de = n._v || 0, para = d[k], f = FORMATOS[k];
        n._v = para;
        if (reduz || rapido) { n.textContent = f(para); return; }
        var t0 = performance.now(), dur = 800;
        cancelAnimationFrame(n._raf);
        (function passo(t) { var q = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - q, 3); n.textContent = f(de + (para - de) * e); if (q < 1) n._raf = requestAnimationFrame(passo); })(t0);
      });
    }

    function animarPara(d) {
      alvo = d;
      if (reduz || !vis) { vis = d; desenhar(d); return; }
      var de = vis, t0 = performance.now(), dur = 350;
      if (de.proj == null && d.proj) de = Object.assign({}, de, { proj: de.barras && de.barras.length === d.barras.length ? de.barras : null });
      cancelAnimationFrame(rafG);
      (function passo(t) {
        var q = Math.min(1, (t - t0) / dur), e = q < .5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2, cur = {};
        Object.keys(d).forEach(function (k) { cur[k] = mistura(de[k], d[k], e); });
        cur.pts = d.pts; vis = cur; desenhar(cur);
        if (q < 1) rafG = requestAnimationFrame(passo); else { vis = d; desenhar(d); }
      })(t0);
    }

    function atualizar() {
      var d = calcular(st);
      if (ativo != null && ativo >= d.barras.length) ativo = null;
      textos(d);
      if (!visto) { alvo = d; return; }
      contar(d); animarPara(d);
    }

    // relatório de prestação de contas (prévia na tela + impressão/PDF com CSS próprio)
    var MARCA = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 5 35 32H5Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M1 22.5 14.5 20.5" stroke="#636a3c" stroke-width="2"/><path d="M24.5 19 39 12.5M25.3 21.2 39 19.6M26 23.4 39 27" stroke="#0f4c5c" stroke-width="2"/></svg>';
    function relatorio(origem) {
      var d = calcular(st), R = function (v) { return 'R$ ' + fmt(v, 2); };
      var nomes = { mes: 'Outubro de 2026', tri: 'Agosto a outubro de 2026', ano: 'Novembro de 2025 a outubro de 2026' };
      var unid = st.per === 'ano' ? 'Mês' : 'Semana';
      var linhas = d.pts.map(function (p, i) {
        var v = d.barras[i] * 1000;
        return '<tr><th scope="row">' + p.l.charAt(0).toUpperCase() + p.l.slice(1) + '</th><td>' + R(v) + '</td><td>− ' + R(v * TAXA) + '</td><td>− ' + R(v * DESP) + '</td><td><b>' + R(v * (1 - TAXA - DESP)) + '</b></td></tr>';
      }).join('');
      var tot = d.recebido;
      var kp = [['Aluguel recebido', mi(d.recebido)], ['Repassado aos proprietários', mi(d.repassado)], ['Taxa de administração', mi(d.taxa)], ['Prazo médio do repasse', fmt(d.prazo, 1) + ' dia útil'], ['Inadimplência > 30 dias', fmt(d.inad, 1) + '%'], ['Ocupação média', fmt(d.ocup, 1) + '%']];
      var h = '<div class="rel-barra" data-so-tela><p><b>Prévia do relatório</b> · ' + nomes[st.per] + '</p><div><button type="button" class="bt bt-pri bt-peq" data-rel-imprimir>Imprimir ou salvar em PDF</button><button type="button" class="bt bt-cla bt-peq" data-rel-fechar>Fechar</button></div></div>' +
        '<article class="rel-folha">' +
          '<header class="rel-cab"><div class="rel-marca">' + MARCA + '<span><b>Prisma</b>Administração Imobiliária</span></div><div class="rel-meta"><p>Relatório nº PR-REL-' + (st.per === 'mes' ? '2610' : st.per === 'tri' ? '26T3' : '2612M') + ' (exemplo)</p><p>Emitido em 08/11/2026</p></div></header>' +
          '<h1 id="rel-t">Prestação de contas da carteira</h1>' +
          '<p class="rel-sub">' + nomes[st.per] + ' · ' + (st.com ? d.contratos + ' contratos residenciais e comerciais' : d.contratos + ' contratos residenciais') + (st.reaj ? ' · inclui projeção de reajuste de 4,4% (IPCA estimado)' : '') + '</p>' +
          '<div class="rel-kpis">' + kp.map(function (k) { return '<div><span>' + k[0] + '</span><strong>' + k[1] + '</strong></div>'; }).join('') + '</div>' +
          '<section class="rel-sec"><h2>Recebido e repassado por ' + unid.toLowerCase() + '</h2><div class="rel-graf">' + grafPrincipal(d, st, null).replace(' tabindex="0"', '') + '</div>' +
            '<p class="rel-leg"><i class="lg-rec"></i>Recebido dos inquilinos <i class="lg-rep"></i>Repassado aos proprietários' + (st.reaj ? ' <i class="lg-proj"></i>Com reajuste' : '') + '</p></section>' +
          '<section class="rel-sec"><h2>Demonstrativo</h2><table class="rel-tab"><thead><tr><th scope="col">' + unid + '</th><th scope="col">Aluguel recebido</th><th scope="col">Taxa (8%)</th><th scope="col">Despesas</th><th scope="col">Líquido repassado</th></tr></thead><tbody>' + linhas + '</tbody>' +
            '<tfoot><tr><th scope="row">Total do período</th><td>' + R(tot) + '</td><td>− ' + R(tot * TAXA) + '</td><td>− ' + R(tot * DESP) + '</td><td><b class="duplo">' + R(tot * (1 - TAXA - DESP)) + '</b></td></tr></tfoot></table></section>' +
          '<div class="rel-duas"><section class="rel-sec"><h2>Inadimplência acima de 30 dias</h2>' + grafInad(d, st) + '<p class="rel-nota">Média do período: ' + fmt(d.inad, 1) + '%' + (st.meta ? ' · meta 2,5%' : '') + '. Atrasos cobertos pela garantia de cada contrato.</p></section>' +
            '<section class="rel-sec"><h2>Chamados de manutenção</h2><table class="rel-tab rel-tab-p"><tbody>' + d.cham.map(function (c, i) { return '<tr><th scope="row">' + CAT[i] + '</th><td>' + c + '</td></tr>'; }).join('') + '</tbody><tfoot><tr><th scope="row">Total</th><td><b>' + soma(d.cham) + '</b></td></tr></tfoot></table></section></div>' +
          '<footer class="rel-pe"><div><span class="rel-ass"></span><p>Gestor de contratos responsável (exemplo)</p></div><p>Documento de demonstração com dados fictícios. No site real, o relatório sai do sistema da administradora (Superlógica, Jetimob, Vista… por API) com os comprovantes de cada lançamento.</p></footer>' +
        '</article>';
      var box = document.createElement('div');
      box.className = 'relatorio'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'rel-t');
      box.innerHTML = h; document.body.appendChild(box); document.body.classList.add('com-relatorio');
      var fechar = function () { box.remove(); document.body.classList.remove('com-relatorio'); removeEventListener('keydown', tecla); if (origem) origem.focus(); };
      var tecla = function (e) {
        if (e.key === 'Escape') fechar();
        if (e.key === 'Tab') { var fs = box.querySelectorAll('button'), pri = fs[0], ult = fs[fs.length - 1]; if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); } else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); } }
      };
      addEventListener('keydown', tecla);
      box.addEventListener('click', function (e) {
        if (e.target.closest('[data-rel-fechar]') || e.target === box) fechar();
        if (e.target.closest('[data-rel-imprimir]')) window.print();
      });
      box.querySelector('[data-rel-imprimir]').focus();
    }

    // controles
    el.addEventListener('click', function (e) {
      var p = e.target.closest('[data-per]'), c = e.target.closest('[data-chave]');
      var rb = e.target.closest('[data-relatorio]'); if (rb) { esconder(); relatorio(rb); return; }
      if (p) { st.per = p.dataset.per; $$('[data-per]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === p)); }); ativo = null; esconder(); atualizar(); }
      if (c) { var k = c.dataset.chave; st[k] = !st[k]; c.setAttribute('aria-checked', String(st[k])); esconder(); atualizar(); }
    });

    // dicas
    var tip = $('.bento-tip');
    function mostrar(alvoEl, x, y) {
      tip.innerHTML = alvoEl.getAttribute('data-tip'); tip.hidden = false;
      var r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
      var lx = Math.min(Math.max(8, x - r.left - tw / 2), r.width - tw - 8), ly = y - r.top - th - 14;
      if (ly < 0) ly = y - r.top + 18;
      tip.style.transform = 'translate(' + lx + 'px,' + ly + 'px)';
    }
    function esconder() { tip.hidden = true; }
    function marcar(i) {
      if (ativo === i) return; ativo = i;
      var g = $('.g-principal'), barras = g.querySelectorAll('.b-rec'), rot = g.querySelectorAll('.rx'), pts = g.querySelectorAll('.p-rep'), guia = g.querySelector('.guia');
      for (var k = 0; k < barras.length; k++) { var on = k === i; barras[k].classList.toggle('ativo', on); if (rot[k]) rot[k].classList.toggle('t-ativo', on); if (pts[k]) pts[k].classList.toggle('ativo', on); }
      if (guia) {
        if (i == null || !barras[i]) guia.style.display = 'none';
        else { var gx = +barras[i].getAttribute('x') + barras[i].getAttribute('width') / 2; guia.setAttribute('x1', gx); guia.setAttribute('x2', gx); guia.style.display = ''; }
      }
    }
    el.addEventListener('pointerdown', function (e) {
      var t = e.target.closest('[data-tip]'); if (!t || !el.contains(t)) { esconder(); return; }
      if (t.dataset.i != null) marcar(+t.dataset.i);
      mostrar(t, e.clientX, e.clientY);
    });
    el.addEventListener('pointermove', function (e) {
      var t = e.target.closest('[data-tip]');
      if (!t || !el.contains(t)) { esconder(); if (ativo != null && !e.target.closest('.g-principal')) marcar(null); return; }
      if (t.dataset.i != null) { marcar(+t.dataset.i); t = $('.g-principal .alvo[data-i="' + t.dataset.i + '"]') || t; }
      mostrar(t, e.clientX, e.clientY);
    });
    el.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { esconder(); marcar(null); } });
    el.addEventListener('keydown', function (e) {
      if (!e.target.classList || !e.target.classList.contains('bg-svg') || !alvo) return;
      if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].indexOf(e.key) < 0) return;
      e.preventDefault();
      var n = alvo.barras.length, i = ativo == null ? 0 : ativo;
      i = e.key === 'ArrowRight' ? Math.min(n - 1, i + 1) : e.key === 'ArrowLeft' ? Math.max(0, i - 1) : e.key === 'Home' ? 0 : n - 1;
      marcar(i);
      var a = $('.g-principal .alvo[data-i="' + i + '"]'), b = a.getBoundingClientRect();
      $('.g-principal .bg-svg').focus();
      mostrar(a, b.left + b.width / 2, b.top + 30);
    });
    el.addEventListener('focusout', function (e) { if (!el.contains(e.relatedTarget)) { esconder(); marcar(null); } });

    // brilho de borda seguindo o mouse (só ponteiro fino)
    if (!reduz && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var cels = $$('.cel'), raf = 0, ult = null;
      $('.bento').addEventListener('pointermove', function (e) {
        ult = e; if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          cels.forEach(function (c) { var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (ult.clientX - r.left) + 'px'); c.style.setProperty('--my', (ult.clientY - r.top) + 'px'); });
        });
      });
      el.classList.add('com-brilho');
    }

    // primeira entrada só quando aparece (uma vez)
    atualizar();
    var zero = calcular(st);
    var vazio = {}; Object.keys(zero).forEach(function (k) { vazio[k] = Array.isArray(zero[k]) ? zero[k].map(function () { return 0; }) : typeof zero[k] === 'number' ? 0 : zero[k]; });
    vazio.inadS = zero.inadS.map(function () { return 2; }); vazio.ocupS = zero.ocupS; vazio.proj = null;
    vis = reduz ? zero : vazio; desenhar(vis);
    function entrar() { if (visto) return; visto = true; contar(alvo); animarPara(alvo); }
    if (reduz || !('IntersectionObserver' in window)) { visto = true; contar(alvo, true); vis = null; animarPara(alvo); }
    else { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); entrar(); } }, { rootMargin: '0px 0px -10% 0px' }); io.observe(el); }

    // redimensionar: SVG usa viewBox, nada a refazer
  }

  Array.prototype.forEach.call(alvos, montar);
})();
