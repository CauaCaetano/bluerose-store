// Vértice · abertura (fecha a cena 3D), topo que some ao descer, menu, títulos que ocupam a largura, efeitos de rolagem
// (foto que cresce, torre que sobe, arco que se abre, foto que gira, faixa que anda), carrossel de números, mapa,
// botão que segue o cursor, espelho de vendas (18 andares × 4 finais) com escolha visual ou por critério, ficha da unidade,
// fluxo de pagamento na obra (entrada, 24 mensais, 3 anuais e saldo nas chaves) e prazo da tabela de lançamento.
// Páginas internas: lista de apartamentos com filtro, página da unidade (?u=1202), galeria com ampliação,
// simulador de financiamento e formulário de contato. Cada bloco só roda se a página tiver os elementos dele.
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var mi = function (v) { return 'R$ ' + (v / 1e6).toFixed(2).replace('.', ',') + ' mi'; };
  var lim = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var progresso = function (el) { var r = el.getBoundingClientRect(); return lim(-r.top / Math.max(1, r.height - innerHeight), 0, 1); };

  // ── abertura 3D (só no index): some sozinha em 3,8 s, no botão Pular ou de cara com movimento reduzido / visita repetida
  var intro = $('.intro'), visto = false;
  try { visto = sessionStorage.getItem('vt-intro') === '1'; sessionStorage.setItem('vt-intro', '1'); } catch (e) {}
  function fechaIntro() {
    if (!intro || intro.classList.contains('fora')) return;
    intro.classList.add('fora'); document.documentElement.dataset.intro = 'fim'; document.dispatchEvent(new Event('vt-intro-fim'));
    setTimeout(function () { intro.hidden = true; }, 1000);
  }
  if (!intro) document.documentElement.dataset.intro = 'fim';
  else if (calmo || visto) { intro.classList.add('fora'); intro.hidden = true; document.documentElement.dataset.intro = 'fim'; }
  else { setTimeout(fechaIntro, 3800); $('.intro-pular').addEventListener('click', fechaIntro); addEventListener('keydown', fechaIntro, { once: true }); addEventListener('wheel', function () { setTimeout(fechaIntro, 400); }, { once: true, passive: true }); }

  // ── menu
  var btMenu = $('.bt-menu'), menu = $('#menu');
  function abreMenu(on) { menu.hidden = !on; btMenu.setAttribute('aria-expanded', String(on)); document.body.classList.toggle('menu-aberto', on); btMenu.lastChild.textContent = on ? 'Fechar' : 'Menu'; }
  btMenu.addEventListener('click', function () { abreMenu(menu.hidden); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) abreMenu(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { abreMenu(false); btMenu.focus(); } });

  // ── títulos gigantes ocupam a largura toda
  function encaixa() {
    $$('.encaixe').forEach(function (el) {
      el.style.fontSize = '100px'; el.style.display = 'inline-block'; var tw = el.offsetWidth; el.style.display = '';
      var disp = el.clientWidth; if (tw > 0 && disp > 0) el.style.fontSize = (100 * disp / tw * .995) + 'px';
    });
  }
  encaixa(); if (document.fonts) document.fonts.ready.then(encaixa);
  var rz; addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(encaixa, 120); });

  // ── revelar ao entrar
  if ('IntersectionObserver' in window && !calmo) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vista'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -10% 0px' });
    $$('.revela').forEach(function (el) { io.observe(el); });
  } else $$('.revela').forEach(function (el) { el.classList.add('vista'); });

  // ── efeitos de rolagem
  var topo = $('.topo'), abP = $('.ab-presa'), ab = $('.abertura'), torre = $('.arq-torre'), arco = $('.arco'),
    arcoC = $('.arco-creme'), arcoF = $('.arco-foto'), voo = $('.vd-voo'), larga = $('.lz-larga'),
    faixa = $('.in-faixa'), trilho = $('.in-trilho'), inArco = $('.in-arco-foto'), claros = $$('.manifesto, .interiores, .sec-clara'), ultY = scrollY;
  var visivel = function (el) { if (!el) return null; var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight ? r : null; };
  function quadro() {
    var y = scrollY, H = innerHeight, W = innerWidth, cel = W < 700, r;
    // topo some ao descer e volta ao subir; fica escuro sobre as seções claras
    if (y > 160 && y > ultY + 4) topo.classList.add('some'); else if (y < ultY - 4 || y < 160) topo.classList.remove('some');
    ultY = y;
    topo.classList.toggle('claro', claros.some(function (s) { var q = s.getBoundingClientRect(); return q.top < 50 && q.bottom > 50; }));
    if (calmo) { if (abP) abP.style.setProperty('--p', '0'); return; }
    if (abP) abP.style.setProperty('--p', lim(progresso(ab) * 1.3, 0, 1).toFixed(4));
    if ((r = visivel(torre))) torre.style.setProperty('--sobe', ((r.top + r.height / 2 - H / 2) * .32).toFixed(1) + 'px');
    if (visivel(arco)) {
      var q = progresso(arco), w0 = cel ? .78 : .46, w = (w0 + (1 - w0) * q) * W, h = ((cel ? .62 : .7) + (cel ? .38 : .3) * q) * H, raio = (1 - q) * w / 2;
      arcoF.style.cssText = 'width:' + w + 'px;height:' + h + 'px;border-radius:' + raio + 'px ' + raio + 'px 0 0';
      var wc = w + (1 - q) * W * .16, hc = h + (1 - q) * H * .12, rc = (1 - q) * wc / 2;
      arcoC.style.cssText = 'width:' + wc + 'px;height:' + hc + 'px;border-radius:' + rc + 'px ' + rc + 'px 0 0;opacity:' + (1 - q * .9);
    }
    if ((r = visivel(voo))) voo.style.setProperty('--gira', (-16 + 22 * lim(1 - (r.top + r.height) / (H + r.height), 0, 1)).toFixed(2) + 'deg');
    if ((r = visivel(larga))) larga.style.setProperty('--zoom', (1 + .18 * lim(r.top / H, 0, 1)).toFixed(4));
    if ((r = visivel(faixa))) { var k = lim(1 - r.bottom / (H + r.height), 0, 1); trilho.style.setProperty('--anda', (-(trilho.scrollWidth - W) * k).toFixed(1) + 'px'); }
    if ((r = visivel(inArco))) inArco.style.setProperty('--raio', (50 * lim((r.top - H * .1) / (H * .7), 0, 1)).toFixed(2) + '%');
  }
  var pedido = false;
  addEventListener('scroll', function () { if (!pedido) { pedido = true; requestAnimationFrame(function () { pedido = false; quadro(); }); } }, { passive: true });
  addEventListener('resize', quadro); quadro();

  // ── carrossel de números do entorno
  var tr = $('.vd-trilho');
  if (tr) {
    var SL = [
      ['300', 'metros', 'da areia da praia central', 'praia-predio', 'Prédio de frente para a praia'],
      ['4', 'minutos', 'a pé até o Atlântico Shopping', 'palmeiras', 'Prédio entre palmeiras sob o céu azul'],
      ['2.400', 'reais', 'de diária média na temporada para 3 suítes', 'varanda-mar', 'Varanda com vista para o oceano'],
      ['600', 'metros', 'raio com escolas, mercado e farmácia', 'parque', 'Prédios diante de um parque arborizado'],
      ['24', 'meses', 'para pagar durante a obra', 'baia', 'Cidade à beira da baía']
    ];
    var num = $('.vd-num'), atual = 0;
    tr.innerHTML = SL.map(function (s, i) { return '<img src="img/' + s[3] + '.webp" alt="' + s[4] + '" loading="lazy" draggable="false" data-i="' + i + '">'; }).join('');
    var fotos = $$('img', tr);
    var slide = function (i) {
      atual = (i + SL.length) % SL.length; var s = SL[atual], passo = fotos[0].offsetWidth + 20;
      fotos.forEach(function (f, k) { f.style.transform = 'translateX(' + (-atual * passo) + 'px)'; f.classList.toggle('on', k === atual); });
      $('.vd-n b', num).textContent = s[0]; $('.vd-n span', num).textContent = s[1]; $('.vd-d', num).textContent = s[2];
      $('.vd-cont').textContent = (atual + 1) + ' / ' + SL.length;
      num.classList.remove('troca'); void num.offsetWidth; num.classList.add('troca');
    };
    $('.vd-ant').addEventListener('click', function () { slide(atual - 1); });
    $('.vd-prox').addEventListener('click', function () { slide(atual + 1); });
    tr.addEventListener('click', function (e) { var f = e.target.closest('img'); if (f && +f.dataset.i !== atual) slide(+f.dataset.i); });
    var x0 = null; tr.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    tr.addEventListener('pointerup', function (e) { if (x0 === null) return; var d = e.clientX - x0; x0 = null; if (Math.abs(d) > 40) slide(atual + (d < 0 ? 1 : -1)); });
    slide(0); addEventListener('resize', function () { slide(atual); });
  }

  // ── mapa: leve deslocamento com o mouse e dicas por toque
  var tela = $('.mp-tela');
  if (tela) {
    if (!calmo && matchMedia('(pointer: fine)').matches) tela.addEventListener('pointermove', function (e) {
      var r = tela.getBoundingClientRect(); tela.style.setProperty('--mx', ((e.clientX - r.left) / r.width - .5) * -24 + 'px'); tela.style.setProperty('--my', ((e.clientY - r.top) / r.height - .5) * -18 + 'px');
    });
    $$('.mp-pino').forEach(function (p) { p.addEventListener('click', function () { $$('.mp-pino').forEach(function (o) { if (o !== p) o.classList.remove('on'); }); p.classList.toggle('on'); }); });
  }

  // ── botão redondo segue o cursor sobre a foto final
  var nf = $('.nv-foto'), lig = $('.nv-ligar');
  if (nf && lig && !calmo && matchMedia('(pointer: fine)').matches) {
    nf.addEventListener('pointermove', function (e) { var r = nf.getBoundingClientRect(); lig.style.setProperty('--cx', (e.clientX - r.left - r.width / 2) + 'px'); lig.style.setProperty('--cy', (e.clientY - r.top - r.height * .55) + 'px'); });
    nf.addEventListener('pointerleave', function () { lig.style.setProperty('--cx', '0px'); lig.style.setProperty('--cy', '0px'); });
  }

  // ── dados das unidades: finais com tipo, m², suítes, vista e preço base no 1º andar (os mesmos em todas as páginas)
  var FIN = { 1: ['3 suítes', 128, 3, 'mar frontal', 1690000], 2: ['2 suítes', 92, 2, 'mar lateral', 1290000], 3: ['2 suítes', 92, 2, 'cidade', 1260000], 4: ['3 suítes', 128, 3, 'mar lateral', 1640000] };
  var ANDARES = 18, sel = null, ST = { d: 'disponível', r: 'reservada', v: 'vendida' };
  var sit = function (a, f) { var h = (a * 37 + f * 11) % 10; return a < 6 ? (h < 7 ? 'v' : h < 8 ? 'r' : 'd') : (h < 4 ? 'v' : h < 5 ? 'r' : 'd'); };
  var preco = function (a, f) { return FIN[f][4] * (1 + (a - 1) * 0.012); };
  var cod = function (a, f) { return a + '0' + f; };
  var vendidas = 0; for (var a0 = 1; a0 <= ANDARES; a0++) for (var f0 = 1; f0 <= 4; f0++) if (sit(a0, f0) === 'v') vendidas++;
  $$('[data-vend]').forEach(function (el) { el.textContent = vendidas + ' de 72'; });

  // planta simplificada de cada final (desenho em traço, cômodos com nome e m²)
  var PLANTA = {
    3: [[0, 0, 46, 40, 'living', 30], [46, 0, 26, 40, 'varanda', 10], [72, 0, 28, 22, 'cozinha', 9], [72, 22, 28, 18, 'serviço', 4], [0, 40, 40, 60, 'suíte master', 18], [40, 40, 24, 26, 'banho', 4], [40, 66, 24, 34, 'lavabo e hall', 3], [64, 40, 36, 60, 'suíte 2', 13]],
    4: [[0, 0, 44, 36, 'living', 38], [44, 0, 30, 36, 'varanda gourmet', 14], [74, 0, 26, 22, 'cozinha', 11], [74, 22, 26, 14, 'serviço', 4], [0, 36, 38, 64, 'suíte master', 24], [38, 36, 24, 30, 'suíte 2', 12], [38, 66, 24, 34, 'lavabo e hall', 4], [62, 36, 38, 64, 'suíte 3', 13]]
  };
  function planta(f, rotulo) {
    var p = PLANTA[FIN[f][2] + 1], esp = f === 2 || f === 4; // finais 2 e 4 são espelhados
    return '<svg class="planta" viewBox="-4 -4 108 108" role="img" aria-label="' + (rotulo || 'Planta do final ' + f) + '">' + p.map(function (c) {
      var x = esp ? 100 - c[0] - c[2] : c[0];
      return '<rect x="' + x + '" y="' + c[1] + '" width="' + c[2] + '" height="' + c[3] + '"/><text x="' + (x + c[2] / 2) + '" y="' + (c[1] + c[3] / 2) + '">' + c[4] + '</text><text class="m2" x="' + (x + c[2] / 2) + '" y="' + (c[1] + c[3] / 2 + 5) + '">' + c[5] + ' m²</text>';
    }).join('') + '<path class="vista" d="' + (FIN[f][3] === 'cidade' ? 'M30 106h40' : 'M30 -2h40') + '"/></svg>';
  }

  // ── espelho de vendas (index)
  var predio = $('.predio');
  if (predio) {
    var html = '<span></span>' + [1, 2, 3, 4].map(function (f) { return '<span class="fin">final ' + f + '</span>'; }).join('');
    for (var a = ANDARES; a >= 1; a--) {
      html += '<span class="and">' + a + 'º</span>';
      for (var f = 1; f <= 4; f++) {
        var s = sit(a, f);
        html += '<button type="button" class="' + s + '" data-a="' + a + '" data-f="' + f + '" aria-pressed="false" aria-label="Unidade ' + cod(a, f) + ', ' + ST[s] + '"' + (s !== 'd' ? ' aria-disabled="true"' : '') + '>' + cod(a, f) + '</button>';
      }
    }
    predio.innerHTML = html;
    predio.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b || b.getAttribute('aria-disabled')) return; ficha(+b.dataset.a, +b.dataset.f); });
  }
  function ficha(a, f) {
    sel = [a, f]; var t = FIN[f], p = preco(a, f);
    $$('.predio button, .fl-lista button').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.a === a && +b.dataset.f === f)); });
    $('.unid').innerHTML = '<img src="img/' + (t[2] === 3 ? 'sala' : 'planta') + '.webp" alt="' + (t[2] === 3 ? 'Living do decorado' : 'Planta da unidade') + '"><h4>Unidade ' + cod(a, f) + '</h4><p class="preco">' + mi(p) + '</p>' +
      '<dl><dt>Tipo</dt><dd>' + t[0] + '</dd><dt>Área privativa</dt><dd>' + t[1] + ' m²</dd><dt>Vista</dt><dd>' + t[3] + '</dd><dt>Andar</dt><dd>' + a + 'º de 18</dd><dt>Vagas</dt><dd>' + (t[2] === 3 ? 2 : 1) + '</dd><dt>Preço por m²</dt><dd>' + real(p / t[1]) + '</dd></dl>' +
      '<a class="pilula pilula-cobre" href="#pagamento">Montar pagamento desta unidade</a><a class="u-link" href="apartamento.html?u=' + cod(a, f) + '">Ver planta e ficha completa ↗</a>';
    fluxo();
  }

  // abas: seleção visual ou por critério
  $$('.un-cartao').forEach(function (c) {
    c.addEventListener('click', function () {
      $$('.un-cartao').forEach(function (o) { o.setAttribute('aria-selected', String(o === c)); $('#' + o.getAttribute('aria-controls')).hidden = o !== c; });
      $('#espelho').scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'start' });
    });
  });
  // escolha por critério
  var fi = $('#filtros');
  if (fi) {
    var filtra = function () {
      var su = +fi.su.value, vi = fi.vi.value, an = +fi.an.value, pr = +fi.pr.value, l = [];
      fi.an.previousElementSibling.textContent = an + 'º andar'; fi.pr.previousElementSibling.textContent = mi(pr);
      for (var a = ANDARES; a >= an; a--) for (var f = 1; f <= 4; f++) {
        var t = FIN[f], p = preco(a, f);
        if (sit(a, f) !== 'd' || (su && t[2] !== su) || (vi && (vi === 'mar') !== /mar/.test(t[3])) || p > pr) continue;
        l.push('<button type="button" role="listitem" data-a="' + a + '" data-f="' + f + '" aria-pressed="' + String(!!sel && sel[0] === a && sel[1] === f) + '"><b>' + cod(a, f) + '</b><span>' + t[0] + ' · ' + t[1] + ' m² · ' + t[3] + '</span><em>' + mi(p) + '</em></button>');
      }
      $('.fl-total').textContent = l.length ? l.length + (l.length === 1 ? ' unidade disponível' : ' unidades disponíveis') + ' com esses critérios' : 'Nenhuma unidade com esses critérios. Tente subir o preço ou baixar o andar.';
      $('.fl-lista').innerHTML = l.join('');
    };
    fi.addEventListener('input', filtra); fi.addEventListener('change', filtra); filtra();
    $('.fl-lista').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) ficha(+b.dataset.a, +b.dataset.f); });
  }

  // ── fluxo de pagamento (index, página da unidade e como comprar)
  var fl = $('#fluxo');
  function fluxo() {
    if (!fl) return;
    var a = sel ? sel[0] : 12, f = sel ? sel[1] : 2, p = preco(a, f), e = +fl.ent.value, m = +fl.men.value, an = +fl.anu.value;
    if (e + m + an > 85) { an = 85 - e - m; if (an < 0) { m += an; an = 0; } fl.anu.value = an; fl.men.value = m; }
    var ch = 100 - e - m - an;
    fl.ent.previousElementSibling.textContent = e + '% · ' + real(p * e / 100);
    fl.men.previousElementSibling.textContent = m + '% · 24x de ' + real(p * m / 100 / 24);
    fl.anu.previousElementSibling.textContent = an + '% · 3x de ' + real(p * an / 100 / 3);
    $('.pg-u').textContent = (sel ? 'Unidade ' + cod(a, f) : 'Exemplo: unidade 1202') + ' · ' + mi(p);
    $('.pg-chave').innerHTML = 'Saldo nas chaves: <b style="color:var(--tx)">' + ch + '% · ' + real(p * ch / 100) + '</b>, à vista ou financiado no banco.';
    $('.pg-res').innerHTML = '<p style="color:var(--tx-2)">Durante 24 meses de obra você paga</p><p class="grande">' + real(p * m / 100 / 24) + '<small> /mês</small></p>' +
      '<div class="barra" aria-hidden="true"><i style="width:' + e + '%;background:#f1c7b4"></i><i style="width:' + m + '%;background:#cf8f7d"></i><i style="width:' + an + '%;background:#8a4f42"></i><i style="width:' + ch + '%;background:#2a4670"></i></div>' +
      '<table><tr><td>Entrada (no contrato)</td><td>' + real(p * e / 100) + '</td></tr><tr><td>24 mensais</td><td>' + real(p * m / 100) + '</td></tr><tr><td>3 anuais</td><td>' + real(p * an / 100) + '</td></tr><tr><td>Chaves (dez/2028)</td><td>' + real(p * ch / 100) + '</td></tr></table>' +
      '<p style="font-size:.8rem;color:var(--tx-2);margin-top:10px">Parcelas corrigidas pelo INCC durante a obra.</p><a class="pilula pilula-cobre" href="#" data-wa="Olá, Vértice! Quero reservar a unidade ' + cod(a, f) + ' (' + mi(p) + ') com ' + e + '% de entrada e 24 mensais de ' + real(p * m / 100 / 24) + '.">Reservar a unidade ' + cod(a, f) + ' por 48 h</a>';
  }
  if (fl) fl.addEventListener('input', fluxo);

  // ── lista de apartamentos (apartamentos.html): cartões com planta, filtros e "mostrar mais"
  var apL = $('.ap-lista'), apF = $('#ap-filtros');
  if (apL && apF) {
    var mostra = 12;
    var lista = function () {
      var su = +apF.su.value, vi = apF.vi.value, st = apF.st.value, an = +apF.an.value, pr = +apF.pr.value, ord = apF.ord.value, l = [];
      apF.an.previousElementSibling.textContent = 'a partir do ' + an + 'º';
      apF.pr.previousElementSibling.textContent = 'até ' + mi(pr);
      for (var a = ANDARES; a >= an; a--) for (var f = 1; f <= 4; f++) {
        var t = FIN[f], p = preco(a, f), s = sit(a, f);
        if ((st === 'd' && s !== 'd') || (st === 'dr' && s === 'v') || (su && t[2] !== su) || (vi && (vi === 'mar') !== /mar/.test(t[3])) || p > pr) continue;
        l.push([a, f, p, s]);
      }
      l.sort(ord === 'm2' ? function (x, y) { return preco(x[0], x[1]) / FIN[x[1]][1] - preco(y[0], y[1]) / FIN[y[1]][1]; } : ord === 'andar' ? function (x, y) { return y[0] - x[0]; } : function (x, y) { return x[2] - y[2]; });
      $('.ap-total').textContent = l.length + (l.length === 1 ? ' unidade encontrada' : ' unidades encontradas');
      apL.innerHTML = l.length ? l.slice(0, mostra).map(function (u) {
        var a = u[0], f = u[1], t = FIN[f];
        return '<li class="ap-card st-' + u[3] + '"><a href="apartamento.html?u=' + cod(a, f) + '"><span class="ap-cab"><b>' + cod(a, f) + '</b><em>' + ST[u[3]] + '</em></span>' +
          '<span class="ap-dados">' + t[1] + ' m²<br>' + t[0] + '<br>andar ' + a + ' · vista ' + t[3] + '</span>' + planta(f, 'Planta da unidade ' + cod(a, f)) +
          '<span class="ap-pe"><span>' + (u[3] === 'v' ? 'vendida' : mi(u[2])) + '</span><i class="redondo" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M5 10h10m-4-4l4 4-4 4"/></svg></i></span></a></li>';
      }).join('') : '<li class="ap-vazio">Nenhuma unidade com esses filtros. Tente subir o preço ou incluir as reservadas.</li>';
      $('.ap-mais').hidden = l.length <= mostra;
    };
    apF.addEventListener('input', function () { mostra = 12; lista(); });
    apF.addEventListener('reset', function () { setTimeout(function () { mostra = 12; lista(); }, 0); });
    $('.ap-mais').addEventListener('click', function () { mostra += 12; lista(); });
    lista();
  }

  // ── página da unidade (apartamento.html?u=1202)
  var det = $('.ap-det');
  if (det) {
    var m = /^(\d{1,2})0([1-4])$/.exec(new URLSearchParams(location.search).get('u') || ''), ua = m ? +m[1] : 12, uf = m ? +m[2] : 2;
    if (ua < 1 || ua > ANDARES) { ua = 12; uf = 2; }
    var t = FIN[uf], p = preco(ua, uf), s = sit(ua, uf), c = cod(ua, uf);
    sel = [ua, uf];
    document.title = 'Unidade ' + c + ' · ' + t[0] + ', ' + t[1] + ' m² · Vértice Residence';
    $$('[data-u]').forEach(function (el) { el.textContent = c; });
    $('.ad-planta').innerHTML = planta(uf, 'Planta da unidade ' + c + ' com os cômodos e as áreas');
    $('.ad-status').textContent = ST[s]; $('.ad-status').className = 'ad-status st-' + s;
    $('.ad-preco').textContent = s === 'v' ? 'Unidade vendida' : mi(p);
    $('.ad-ficha').innerHTML = '<dt>Tipo</dt><dd>' + t[0] + '</dd><dt>Área privativa</dt><dd>' + t[1] + ' m²</dd><dt>Andar</dt><dd>' + ua + 'º de 18</dd><dt>Final</dt><dd>' + uf + '</dd><dt>Vista</dt><dd>' + t[3] + '</dd><dt>Vagas</dt><dd>' + (t[2] === 3 ? 2 : 1) + ' + depósito</dd><dt>Preço por m²</dt><dd>' + real(p / t[1]) + '</dd><dt>Entrega</dt><dd>dez/2028</dd>';
    $('.ad-foto').src = 'img/' + (t[3] === 'cidade' ? 'baia' : t[2] === 3 ? 'vista-sala' : 'varanda-mar') + '.webp';
    $('.ad-acao').innerHTML = s === 'd' ? '<a class="pilula pilula-cobre" href="#" data-wa="Olá, Vértice! Quero reservar a unidade ' + c + ' (' + mi(p) + ') por 48 h.">Reservar por 48 h</a>' :
      '<a class="pilula pilula-cobre" href="#" data-wa="Olá, Vértice! A unidade ' + c + ' está ' + ST[s] + '. Quero entrar na lista de espera dela.">Entrar na lista de espera</a>';
    // vizinhas: o mesmo final em outros andares, disponíveis
    var viz = []; for (var a2 = ANDARES; a2 >= 1 && viz.length < 4; a2--) if (a2 !== ua && sit(a2, uf) === 'd') viz.push(a2);
    $('.ad-viz').innerHTML = viz.map(function (a3) { return '<li><a href="apartamento.html?u=' + cod(a3, uf) + '"><b>' + cod(a3, uf) + '</b><span>' + a3 + 'º andar</span><em>' + mi(preco(a3, uf)) + '</em></a></li>'; }).join('');
    $('.ad-sem-fluxo').hidden = s === 'd';
    if (fl) fl.hidden = s !== 'd';
    if (s !== 'd') { var pr0 = $('.pg-res'); if (pr0) pr0.hidden = true; }
  }
  fluxo();

  // ── galeria: filtro por tema e ampliação
  var gal = $('.gal-grade');
  if (gal) {
    $$('.gal-filtro button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.gal-filtro button').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        $$('figure', gal).forEach(function (g) { g.hidden = b.dataset.g !== 'todas' && g.dataset.g !== b.dataset.g; });
      });
    });
    var dlg = $('.gal-dlg'), itens = function () { return $$('figure:not([hidden]) button', gal); }, idx = 0;
    var abre = function (i) { var l = itens(); idx = (i + l.length) % l.length; var img = $('img', l[idx]); $('img', dlg).src = img.src; $('img', dlg).alt = img.alt; $('figcaption', dlg).textContent = l[idx].parentNode.querySelector('figcaption').textContent; if (!dlg.open) dlg.showModal(); };
    gal.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) abre(itens().indexOf(b)); });
    $('.gal-ant', dlg).addEventListener('click', function () { abre(idx - 1); });
    $('.gal-prox', dlg).addEventListener('click', function () { abre(idx + 1); });
    $('.gal-x', dlg).addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') abre(idx - 1); if (e.key === 'ArrowRight') abre(idx + 1); });
  }

  // ── simulador de financiamento bancário do saldo nas chaves (como comprar)
  var fin = $('#financ');
  if (fin) {
    var simula = function () {
      var v = +fin.val.value, e = +fin.ent.value, n = +fin.prazo.value * 12, j = Math.pow(1 + .115, 1 / 12) - 1, sal = v * (1 - e / 100);
      fin.val.previousElementSibling.textContent = mi(v); fin.ent.previousElementSibling.textContent = e + '% · ' + real(v * e / 100);
      fin.prazo.previousElementSibling.textContent = fin.prazo.value + ' anos';
      var amort = sal / n, p1 = amort + sal * j, pn = amort + amort * j;
      $('.fn-res').innerHTML = '<p style="color:var(--tx-2)">Primeira parcela (SAC)</p><p class="grande">' + real(p1) + '<small> /mês</small></p>' +
        '<table><tr><td>Valor financiado</td><td>' + real(sal) + '</td></tr><tr><td>Última parcela</td><td>' + real(pn) + '</td></tr><tr><td>Renda familiar sugerida</td><td>' + real(p1 / .3) + '</td></tr></table>' +
        '<p style="font-size:.8rem;color:var(--tx-2);margin-top:10px">Simulação com juros de 11,5% ao ano + TR, tabela SAC. A taxa final depende do banco e da sua análise de crédito.</p>';
    };
    fin.addEventListener('input', simula); simula();
  }

  // ── formulário de contato: abre a conversa no WhatsApp com o pedido montado
  var ct = $('#ct');
  if (ct) ct.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = ct.nome.value.trim(), t = ct.tel.value.replace(/\D/g, ''), er = $('.erro', ct);
    er.textContent = n.length < 2 ? 'Escreva seu nome.' : t.length < 10 ? 'Confira o WhatsApp com DDD.' : !ct.ok.checked ? 'Marque a autorização de contato.' : '';
    if (er.textContent) return;
    var msg = 'Olá, Vértice! Sou ' + n + '. Quero ' + ct.qr.value.toLowerCase() + (ct.msg.value.trim() ? '. ' + ct.msg.value.trim() : '.');
    if (window.BR_WA) window.BR_WA(msg);
    ct.innerHTML = '<p class="ct-ok">Pedido recebido, ' + n.split(' ')[0] + '. Um corretor responde hoje, das 9h às 20h.</p>';
  });

  // ── tabela de lançamento vale até o último dia do mês
  var ate = $('[data-ate]');
  if (ate) {
    var fim = new Date(); fim = new Date(fim.getFullYear(), fim.getMonth() + 1, 0, 23, 59, 59);
    ate.textContent = fim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    var cont = function () { var s = Math.max(0, (fim - new Date()) / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600); $('[data-conta]').textContent = 'Faltam ' + d + (d === 1 ? ' dia e ' : ' dias e ') + h + (h === 1 ? ' hora.' : ' horas.'); };
    cont(); setInterval(cont, 60000);
  }
})();
