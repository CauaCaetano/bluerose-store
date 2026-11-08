// Vértice · abertura (fecha a cena 3D), topo que some ao descer, menu, títulos que ocupam a largura, efeitos de rolagem
// (foto que cresce, torre que sobe, arco que se abre, foto que gira, faixa que anda), carrossel de números, mapa,
// botão que segue o cursor e prazo da tabela de lançamento. Páginas internas: galeria com ampliação, simulador de
// financiamento do saldo e formulário de contato. As ferramentas de venda (espelho, plantas, simulador da obra,
// captação) estão em vendas.js. Cada bloco só roda se a página tiver os elementos dele.
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
      el.style.fontSize = '100px'; var rg = document.createRange(); rg.selectNodeContents(el); var tw = rg.getBoundingClientRect().width;
      var disp = el.clientWidth; if (tw > 0 && disp > 0) el.style.fontSize = (100 * disp / tw * .98) + 'px';
    });
  }
  encaixa(); if (document.fonts) { document.fonts.ready.then(encaixa); document.fonts.load('300 100px Jost').then(encaixa, function () {}); }
  addEventListener('load', encaixa);
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
      ['4', 'minutos', 'a pé até o Shopping de Exemplo', 'palmeiras', 'Prédio entre palmeiras sob o céu azul'],
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

  // espelho de vendas, plantas, simulador, captação e página da unidade ficam em vendas.js

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
