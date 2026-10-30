// Base Forte · topo que vira cartão, títulos que sobem linha a linha, linhas de relevo desenhadas na rolagem,
// fotos com paralaxe e sombra, cursor próprio, etapas e calculadora de custo por m², casas entregues com ficha,
// depoimentos em carrossel, filme da obra em fotos e pedido de reunião pelo WhatsApp.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + (Math.round(v / 100) * 100).toLocaleString('pt-BR'); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lim = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  document.documentElement.classList.add('js');

  // ---------- topo ----------
  var topo = $('#topo'), btMenu = $('.bt-menu');
  function topoRola() { topo.classList.toggle('cheio', scrollY > 40); }
  addEventListener('scroll', topoRola, { passive: true }); topoRola();
  btMenu.addEventListener('click', function () {
    var ab = !topo.classList.contains('aberto'); topo.classList.toggle('aberto', ab);
    btMenu.setAttribute('aria-expanded', ab); btMenu.setAttribute('aria-label', ab ? 'Fechar menu' : 'Abrir menu');
    document.body.style.overflow = ab ? 'hidden' : '';
  });
  $$('#menu a').forEach(function (a) { a.addEventListener('click', function () { if (topo.classList.contains('aberto')) btMenu.click(); }); });

  // ---------- títulos que sobem linha a linha ----------
  var titulos = $$('.linhas').map(function (el) { return { el: el, txt: el.textContent.trim() }; });
  function quebra(t) {
    var el = t.el;
    el.innerHTML = t.txt.split(/\s+/).map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    var linhas = [], topoAt = null;
    $$('.w', el).forEach(function (w) { var y = w.offsetTop; if (topoAt === null || Math.abs(y - topoAt) > 4) { linhas.push([]); topoAt = y; } linhas[linhas.length - 1].push(w.textContent); });
    el.innerHTML = linhas.map(function (l, i) { return '<span class="l"><span style="transition-delay:' + (i * 0.09).toFixed(2) + 's">' + l.join(' ') + '</span></span>'; }).join('');
    el.setAttribute('aria-label', t.txt);
  }
  function quebraTodos() { titulos.forEach(quebra); }
  if (!calmo) { quebraTodos(); var largAnt = innerWidth, tq; addEventListener('resize', function () { if (innerWidth === largAnt) return; largAnt = innerWidth; clearTimeout(tq); tq = setTimeout(quebraTodos, 200); }); }

  // revelar ao aparecer
  $$('.sobre-baixo > *, .etapas-txt, .casa, .casas-intro, .faixa .grade > *:not(.faixa-tit), .calc-cab, .calc, .cl-res, .ac-cab, .ac-cima .bt, .ac-fotos > *, .final-pe, .final-img').forEach(function (el) { el.classList.add('sobe'); });
  var vistos = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vis'); vistos.unobserve(e.target); } });
  }, { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  $$('.linhas, .sobe, .app').forEach(function (el) { vistos.observe(el); });

  // contadores
  var conta = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return; conta.unobserve(e.target);
      var el = e.target, fim = +el.dataset.ate, t0 = performance.now();
      if (calmo || !fim) return;
      (function passo(t) { var p = Math.min(1, (t - t0) / 1500); el.textContent = Math.round(fim * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(passo); })(t0);
    });
  }, { threshold: .6 });
  $$('.conta').forEach(function (c) { conta.observe(c); });

  // ---------- linhas de relevo (desenhadas pela rolagem) ----------
  function relevo(n) {
    var ps = [];
    for (var i = 0; i < n; i++) {
      var base = 474 - i * 11.5, d = 'M0 ' + base.toFixed(1), k = i / n;
      for (var x = 20; x <= 1600; x += 20) {
        var vale = -Math.exp(-Math.pow((x - 690) / 150, 2)) * (28 + 40 * k);
        var morro = Math.exp(-Math.pow((x - 1120) / 190, 2)) * (60 + 170 * k);
        var leve = Math.sin(x / 160 + i * .35) * 3 * k;
        d += ' L' + x + ' ' + (base - morro - vale + leve).toFixed(1);
      }
      ps.push('<path pathLength="1" d="' + d + '"/>');
    }
    return '<svg viewBox="0 0 1600 480" preserveAspectRatio="none">' + ps.join('') + '</svg>';
  }
  var ondas = $$('.ondas').map(function (o) { o.innerHTML = relevo(+o.dataset.ondas || 16); return { el: o, ps: $$('path', o) }; });

  // ---------- rolagem: paralaxe, sombra, relevo e círculo dos rótulos ----------
  var imgsPar = $$('.casa-img img, .depo-fundo img').filter(function (i) { return !i.closest('.final-img'); });
  var sombras = $$('.sombra[data-escurece]');
  var pontos = $$('section .ponto').map(function (p) { return { el: p, sec: p.closest('section') }; });
  var heroi = $('.heroi'), pedido = false;
  function quadro() {
    pedido = false; var vh = innerHeight; revela(vh);
    if (!calmo) imgsPar.forEach(function (img) {
      var r = img.parentNode.getBoundingClientRect(); if (r.bottom < -100 || r.top > vh + 100) return;
      var t = (r.top + r.height / 2 - vh / 2) / vh; img.style.transform = 'translate3d(0,' + (-t * 7).toFixed(2) + '%,0)';
    });
    sombras.forEach(function (s) {
      var max = +s.dataset.escurece, r = s.parentNode.getBoundingClientRect(), p;
      if (s.closest('.heroi')) p = lim(scrollY / (heroi.offsetHeight * .9), 0, 1);
      else p = lim(-r.top / r.height, 0, 1);
      s.style.opacity = (p * max).toFixed(3);
    });
    ondas.forEach(function (o) {
      var r = o.el.getBoundingClientRect(), p = calmo ? 1 : lim((vh - r.top) / (vh * .9 + r.height * .3), 0, 1);
      o.ps.forEach(function (path, i) { var q = lim(p * 1.5 - i * 0.025, 0, 1); path.style.strokeDasharray = q.toFixed(3) + ' 1'; });
    });
    pontos.forEach(function (o) {
      var r = o.sec.getBoundingClientRect(); o.el.style.setProperty('--p', lim((vh - r.top) / (vh + r.height * .6), .12, 1).toFixed(3));
    });
  }
  // rede de segurança: o que já passou pela tela aparece mesmo se o observador perder o momento
  function revela(vh) { $$('.sobe:not(.vis), .linhas:not(.vis), .app:not(.vis)').forEach(function (el) { if (el.getBoundingClientRect().top < vh * .95) el.classList.add('vis'); }); }
  function pede() { if (!pedido) { pedido = true; requestAnimationFrame(quadro); } }
  addEventListener('scroll', pede, { passive: true }); addEventListener('resize', pede); quadro();

  // âncoras com rolagem suave
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a || a.getAttribute('href').length < 2 || a.hasAttribute('data-wa')) return;
    var alvo = document.getElementById(a.getAttribute('href').slice(1)); if (!alvo) return;
    e.preventDefault(); alvo.scrollIntoView({ behavior: calmo ? 'auto' : 'smooth' }); history.replaceState(null, '', a.getAttribute('href'));
  });

  // ---------- cursor próprio ----------
  var cur = $('.cursor'), curTx = $('span', cur), mx = -200, my = -200, cx = -200, cy = -200, curVivo = false;
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; if (!curVivo) { curVivo = true; cx = mx; cy = my; requestAnimationFrame(segue); } }, { passive: true });
    document.addEventListener('mouseover', function (e) {
      var alvo = e.target.closest('[data-cursor]'), botao = e.target.closest('a:not([data-cursor]), button, input, label, .depo-cartao');
      if (alvo && !botao) { curTx.textContent = alvo.dataset.cursor; cur.classList.add('ativo'); } else cur.classList.remove('ativo');
    });
    document.addEventListener('mouseleave', function () { cur.classList.remove('ativo'); });
  }
  function segue() { cx += (mx - cx) * .2; cy += (my - cy) * .2; cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)'; requestAnimationFrame(segue); }

  // ---------- etapas + calculadora ----------
  // etapa, parte do custo, meses (para 120 m²), o que entrega
  var ET = [['Fundação', .12, 1, 'sapatas, baldrame e impermeabilização'], ['Estrutura', .18, 1.5, 'pilares, vigas e lajes'], ['Alvenaria e telhado', .17, 1.5, 'paredes, cobertura e calhas'],
            ['Instalações', .15, 1.2, 'elétrica, água e esgoto'], ['Revestimentos', .23, 1.8, 'reboco, piso, azulejo e forro'], ['Acabamento e chave', .15, 1, 'pintura, louças, metais e limpeza']];
  var c = $('#calc'), saida = $('output', c), res = $('.cl-res-in'), lista = $('.etapas-lista');
  function mesesDe(m2, pv) { return Math.max(4, Math.round((6 + (m2 - 120) / 40 + (pv > 1 ? 1 : 0)) * 10) / 10); }
  function conta2() {
    var m2 = +c.m2.value, pd = +c.pd.value, pv = +c.pv.value, obra = m2 * pd * pv, proj = c.proj.checked ? Math.max(9800, m2 * 62) : 0, total = obra + proj;
    var meses = mesesDe(m2, pv), mStr = String(meses).replace('.', ',');
    saida.textContent = m2 + ' m²';
    c.m2.style.setProperty('--v', ((m2 - 45) / (400 - 45) * 100).toFixed(1) + '%');
    var padrao = c.querySelector('[name=pd]:checked + span b').textContent.toLowerCase();
    var pag = c.fin.checked ? 'Financiando, a Caixa libera o dinheiro por medição de etapa, o mesmo jeito que cobramos. Nós cuidamos da documentação.' : 'Pagamento em 6 parcelas, uma por etapa concluída. Sem entrada antes da obra começar.';
    res.innerHTML = '<p class="rotulo"><span class="ponto" aria-hidden="true" style="--p:1"></span>Casa de ' + m2 + ' m², ' + padrao + (pv > 1 ? ', sobrado' : ', térrea') + '</p>' +
      '<p class="total">' + real(total) + '</p>' +
      '<p class="r-m2">' + real(total / m2) + ' por m² · obra pronta em cerca de ' + mStr + ' meses' + (proj ? ' (mais 2 de projeto e aprovação)' : '') + '</p>' +
      '<div class="barras">' + ET.map(function (e) { return '<div><span>' + e[0] + '</span><span class="bx"><i style="width:' + (e[1] * 400) + '%"></i></span><span>' + real(obra * e[1]) + '</span></div>'; }).join('') +
      (proj ? '<div><span>Projetos</span><span class="bx"><i class="proj" style="width:' + Math.min(100, proj / obra * 400).toFixed(1) + '%"></i></span><span>' + real(proj) + '</span></div>' : '') + '</div>' +
      '<p class="r-pag">' + pag + '</p>' +
      '<a class="bt bt-grad" href="#" data-wa="Olá, Base Forte! Calculei no site uma casa de ' + m2 + ' m² (' + padrao + (pv > 1 ? ', sobrado' : ', térrea') + ') por ' + real(total) + '. Quero marcar a reunião grátis com o engenheiro."><span class="bt-tx">Quero o orçamento real</span><span class="bt-seta" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M3 10h13M11 5l5 5-5 5"/></svg><svg viewBox="0 0 20 20"><path d="M3 10h13M11 5l5 5-5 5"/></svg></span></a>';
    var mes = 0;
    lista.innerHTML = ET.map(function (e, i) {
      mes += e[2] * meses / 8;
      return '<li><span class="et-nome">' + e[0] + '</span><span class="et-num">0' + (i + 1) + '</span><span class="et-det">' + e[3] + '<br><b>' + Math.round(e[1] * 100) + '%</b> · <b>' + real(obra * e[1]) + '</b> · até o ' + Math.max(1, Math.round(mes)) + 'º mês</span></li>';
    }).join('');
  }
  c.addEventListener('input', conta2); c.addEventListener('change', conta2); conta2();
  var nota = document.createElement('p'); nota.className = 'et-nota'; nota.style.cssText = 'grid-column:3/5;margin-top:14px;font-size:12px;color:var(--tx-3)';
  nota.textContent = 'Valores para a casa da calculadora abaixo (120 m², padrão médio, térrea). Mude a área e o padrão e eles acompanham.';
  lista.parentNode.appendChild(nota);
  c.addEventListener('input', function () { nota.textContent = 'Valores para a casa da calculadora: ' + c.m2.value + ' m², padrão ' + c.querySelector('[name=pd]:checked + span b').textContent.toLowerCase() + ', ' + (+c.pv.value > 1 ? 'sobrado' : 'térrea') + '.'; });
  c.addEventListener('change', function () { c.dispatchEvent(new Event('input')); });

  // ---------- casas entregues: ficha ----------
  var CASAS = [
    ['Casa Royal Golf', 'Sobrado', 186, 3690, 7, 'Royal Golf', 'casa-piscina', 'Fachada em porcelanato e madeira, piscina de 18 m² e laje pronta para o terraço. A chave saiu uma semana antes do prazo.'],
    ['Casa Bela Suíça', 'Sobrado', 240, 3690, 9, 'Bela Suíça', 'casa', 'Volumes brancos sobrepostos, quatro suítes e esquadrias de alumínio com vidro duplo. Projeto aprovado na prefeitura em 52 dias.'],
    ['Casa Vivendas do Arvoredo', 'Térrea', 120, 2780, 6, 'Vivendas do Arvoredo', 'casa-branca', 'Três quartos, um deles suíte, e quintal gramado. Financiada pela Caixa, com cada liberação do banco casada a uma etapa pronta.'],
    ['Casa Higienópolis', 'Térrea', 145, 2780, 6.5, 'Higienópolis', 'casa-varanda', 'Varanda de entrada coberta, porta pivotante de madeira e garagem para dois carros. Obra feita com os donos morando fora.'],
    ['Casa Gleba Palhano', 'Sobrado', 210, 3690, 8, 'Gleba Palhano', 'casa-quina', 'Cozinha integrada à sala, suíte master com banheira e piscina com deque. Diário de obra enviado em todas as 34 sextas.'],
    ['Casa Terras de Santana', 'Sobrado', 260, 3690, 10, 'Terras de Santana', 'casa-tres-andares', 'Três pavimentos com terraço, elevador previsto na estrutura e piscina de borda. A maior laje que concretamos em 2025.'],
    ['Casa Alphaville', 'Térrea', 320, 3690, 11, 'Alphaville Londrina', 'casa-patio', 'Planta em U ao redor do pátio, com piscina central e beiral de 2 m. Uma das 12 casas que temos no condomínio.']
  ];
  var ficha = $('#ficha'), fichaVolta = null;
  function abreFicha(i) {
    var k = CASAS[i], sob = k[1] === 'Sobrado', obra = k[2] * k[3] * (sob ? 1.08 : 1), pd = k[3] === 3690 ? 'alto' : k[3] === 2780 ? 'médio' : 'popular';
    var img = $('.ficha-img img', ficha); img.src = 'img/' + k[6] + '.webp'; img.alt = k[0] + ', ' + k[1].toLowerCase() + ' de ' + k[2] + ' m² em Londrina';
    $('.ficha-tx', ficha).innerHTML = '<p class="rotulo"><span class="ponto" aria-hidden="true" style="--p:1"></span>' + k[5] + ' · Londrina</p><h3 id="fi-t">' + k[0] + '</h3><p>' + k[7] + '</p>' +
      '<dl><div><dt>Tipo</dt><dd>' + k[1] + '</dd></div><div><dt>Área construída</dt><dd>' + k[2] + ' m²</dd></div><div><dt>Padrão</dt><dd>' + pd + ', R$ ' + k[3].toLocaleString('pt-BR') + '/m²' + (sob ? ' + 8%' : '') + '</dd></div><div><dt>Valor da obra no contrato</dt><dd>' + real(obra) + '</dd></div><div><dt>Prazo da obra</dt><dd>' + String(k[4]).replace('.', ',') + ' meses</dd></div><div><dt>Pagamento</dt><dd>6 parcelas, por etapa pronta</dd></div></dl>' +
      '<a class="bt bt-grad" href="#" data-wa="Olá, Base Forte! Vi a ' + k[0] + ' (' + k[2] + ' m²) no site e quero uma casa parecida."><span class="bt-tx">Quero uma casa assim</span><span class="bt-seta" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M3 10h13M11 5l5 5-5 5"/></svg><svg viewBox="0 0 20 20"><path d="M3 10h13M11 5l5 5-5 5"/></svg></span></a>' +
      '<button type="button" class="bt bt-linha ficha-calc" data-i="' + i + '"><span class="bt-tx">Calcular uma parecida</span><span class="bt-seta" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M3 10h13M11 5l5 5-5 5"/></svg><svg viewBox="0 0 20 20"><path d="M3 10h13M11 5l5 5-5 5"/></svg></span></button>';
    fichaVolta = document.activeElement; ficha.hidden = false; document.body.style.overflow = 'hidden'; $('.ficha-fechar', ficha).focus();
  }
  function fechaFicha() { ficha.hidden = true; document.body.style.overflow = ''; if (fichaVolta) fichaVolta.focus(); }
  $$('.casa').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); abreFicha(+a.dataset.casa); }); });
  ficha.addEventListener('click', function (e) {
    if (e.target === ficha || e.target.closest('.ficha-fechar')) return fechaFicha();
    var b = e.target.closest('.ficha-calc'); if (!b) return;
    var k = CASAS[+b.dataset.i]; c.m2.value = k[2]; c.querySelector('[name=pd][value="' + k[3] + '"]').checked = true; c.querySelector('[name=pv][value="' + (k[1] === 'Sobrado' ? '1.08' : '1') + '"]').checked = true;
    c.dispatchEvent(new Event('input')); fichaVolta = null; fechaFicha(); $('#calculo').scrollIntoView({ behavior: calmo ? 'auto' : 'smooth' });
  });

  // ---------- depoimentos ----------
  var itens = $$('.depo-item'), cont = $('.depo-cont'), atual = 0, auto;
  function vai(n) {
    atual = (n + itens.length) % itens.length;
    itens.forEach(function (it, i) { it.classList.toggle('ativo', i === atual); it.setAttribute('aria-hidden', i !== atual); });
    cont.textContent = '0' + (atual + 1) + ' | 0' + itens.length;
  }
  function roda() { clearInterval(auto); if (!calmo) auto = setInterval(function () { vai(atual + 1); }, 7000); }
  $('.depo-setas .ant').addEventListener('click', function () { vai(atual - 1); roda(); });
  $('.depo-setas .prox').addEventListener('click', function () { vai(atual + 1); roda(); });
  var cartao = $('.depo-cartao'), x0 = null;
  cartao.addEventListener('mouseenter', function () { clearInterval(auto); }); cartao.addEventListener('mouseleave', roda);
  cartao.addEventListener('focusin', function () { clearInterval(auto); });
  $('.depo-trilho').addEventListener('pointerdown', function (e) { x0 = e.clientX; });
  addEventListener('pointerup', function (e) { if (x0 === null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 50) { vai(atual + (dx < 0 ? 1 : -1)); roda(); } });
  vai(0); roda();

  // ---------- filme da obra: 8 fotos, 7 segundos cada ----------
  var CENAS = [
    ['planta', 'Planta de casa sobre a mesa do engenheiro', 'Meses 1 e 2 · Projeto', 'Planta, projeto estrutural e alvará na prefeitura. Você aprova cada prancha antes de começar.'],
    ['obra', 'Canteiro com as fundações sendo executadas', 'Etapa 1 · Fundação · 12%', 'Sapatas, baldrame e impermeabilização. A primeira parcela só vence depois das fotos.'],
    ['ferragem', 'Armação de ferro da laje', 'Etapa 2 · Estrutura · 18%', 'Pilares, vigas e lajes. O engenheiro confere a ferragem antes de cada concretagem.'],
    ['obra-blocos', 'Paredes de blocos e andaime', 'Etapa 3 · Alvenaria e telhado · 17%', 'Paredes, cobertura e calhas. A casa fecha e já dá para andar pelos cômodos.'],
    ['equipe', 'Equipe de engenharia vistoriando a laje', 'Etapa 4 · Instalações · 15%', 'Elétrica, água e esgoto, testados com pressão antes de fechar as paredes.'],
    ['banho', 'Banheiro revestido e pronto', 'Etapa 5 · Revestimentos · 23%', 'Reboco, piso, azulejo e forro. A etapa mais cara, sempre com nota fiscal do material.'],
    ['cozinha', 'Cozinha com bancada e armários instalados', 'Etapa 6 · Acabamento e chave · 15%', 'Pintura, louças, metais e limpeza fina. Vistoria final junto com você.'],
    ['casa-piscina', 'Sobrado pronto com piscina', 'Chave na mão', '186 casas entregues assim em Londrina. Nenhuma obra parada no meio.']
  ];
  var filme = $('#filme'), palco = $('.filme-palco', filme), barras = $('.filme-barras', filme), leg = $('.filme-leg', filme), btPausa = $('.f-pausa', filme);
  palco.innerHTML = CENAS.map(function (s) { return '<figure><img src="img/' + s[0] + '.webp" alt="' + s[1] + '" loading="lazy"></figure>'; }).join('');
  barras.innerHTML = CENAS.map(function () { return '<span><i></i></span>'; }).join('');
  var cenas = $$('figure', palco), bs = $$('span', barras), ci = 0, t0 = 0, parado = false, gasto = 0, rafF = 0, DUR = 7000, filmeVolta = null;
  function cena(n) {
    ci = (n + CENAS.length) % CENAS.length; gasto = 0; t0 = performance.now();
    cenas.forEach(function (f, i) { f.classList.toggle('ativo', i === ci); });
    bs.forEach(function (b, i) { b.classList.toggle('feito', i < ci); $('i', b).style.width = i < ci ? '100%' : '0'; });
    leg.innerHTML = '<small><span class="ponto" aria-hidden="true" style="--p:' + ((ci + 1) / CENAS.length).toFixed(2) + '"></span>' + CENAS[ci][2] + '</small>' + CENAS[ci][3];
  }
  function tique(t) {
    if (filme.hidden) return;
    if (!parado) { var p = (gasto + t - t0) / DUR; $('i', bs[ci]).style.width = Math.min(100, p * 100) + '%'; if (p >= 1) { if (ci === CENAS.length - 1) { pausa(true); } else cena(ci + 1); } }
    rafF = requestAnimationFrame(tique);
  }
  function pausa(sim) {
    if (sim && !parado) gasto += performance.now() - t0; if (!sim) t0 = performance.now();
    parado = sim; btPausa.setAttribute('aria-label', sim ? 'Continuar' : 'Pausar');
    btPausa.innerHTML = sim ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4l10 6-10 6z"/></svg>' : '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4v12M14 4v12"/></svg>';
  }
  function abreFilme() { filmeVolta = document.activeElement; filme.hidden = false; document.body.style.overflow = 'hidden'; parado = false; pausa(calmo); cena(0); cancelAnimationFrame(rafF); rafF = requestAnimationFrame(tique); $('.filme-fechar', filme).focus(); }
  function fechaFilme() { filme.hidden = true; document.body.style.overflow = ''; cancelAnimationFrame(rafF); if (filmeVolta) filmeVolta.focus(); }
  $('.abre-filme').addEventListener('click', abreFilme);
  heroi.addEventListener('click', function (e) { if (!e.target.closest('a, button') && matchMedia('(hover: hover)').matches && e.target.closest('.heroi-fundo, .heroi-cola')) abreFilme(); });
  $('.filme-fechar', filme).addEventListener('click', fechaFilme);
  $('.f-ant', filme).addEventListener('click', function () { cena(ci - 1); if (parado) pausa(false); });
  $('.f-prox', filme).addEventListener('click', function () { cena(ci + 1); if (parado) pausa(false); });
  btPausa.addEventListener('click', function () { pausa(!parado); });
  document.addEventListener('keydown', function (e) {
    if (!filme.hidden) { if (e.key === 'Escape') fechaFilme(); else if (e.key === 'ArrowRight') cena(ci + 1); else if (e.key === 'ArrowLeft') cena(ci - 1); }
    else if (!ficha.hidden && e.key === 'Escape') fechaFicha();
    else if (e.key === 'Escape' && topo.classList.contains('aberto')) btMenu.click();
  });

  // ---------- reunião com o engenheiro ----------
  var r = $('#reuniao');
  r.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = r.nome.value.trim(), t = r.tel.value.replace(/\D/g, ''), er = $('.erro', r);
    er.textContent = n.length < 2 ? 'Escreva seu nome.' : t.length < 10 ? 'Confira o WhatsApp com DDD.' : '';
    if (er.textContent) return;
    window.BR_WA && window.BR_WA('Olá, Base Forte! Sou ' + n + ' e quero marcar a reunião grátis com o engenheiro. Minha casa: ' + c.m2.value + ' m².');
    r.innerHTML = '<p style="font-weight:600;font-size:1.35rem;line-height:1.3">Reunião pedida, ' + n.split(' ')[0] + '. O engenheiro chama você no WhatsApp hoje.</p>';
  });
})();
