// Ana Ribeiro · comportamento do site no molde do Azimute: abertura presa, galerias que trocam a foto com a rolagem,
// a Ilha (o 3D fica em cena.js), o retrato com três capítulos, contadores, simulador de financiamento (SAC, 11,49% a.a.,
// parcela até 30% da renda), prévia de avaliação, mostra com filtro e o botão que pausa as animações.
// Páginas internas: filtro da lista de imóveis, galeria do imóvel, simulador e avaliação completos e o formulário de contato.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  // celular: botão de WhatsApp fixo no rodapé das páginas de imóvel, aparece depois que os botões do topo saem da tela
  (function () {
    var wa = $('.wa-fixo'), topo = $('.im-topo-bts');
    if (!wa) return;
    document.body.classList.add('com-wa-fixo');
    if (!topo || !('IntersectionObserver' in window)) { wa.classList.add('ver'); return; }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { wa.classList.toggle('ver', !e.isIntersecting && e.boundingClientRect.top < 0); });
    }).observe(topo);
  })();
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var mil = function (v) { return 'R$ ' + (Math.round(v / 1000) * 1000).toLocaleString('pt-BR'); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var dois = function (n) { return (n < 10 ? '0' : '') + n; };
  var limita = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var calmo = window.matchMedia('(prefers-reduced-motion: reduce)');
  var vh = function () { return window.innerHeight; };
  var progresso = function (el) { var r = el.getBoundingClientRect(), curso = el.offsetHeight - vh(); return curso > 0 ? limita(-r.top / curso, 0, 1) : 0; };
  var rolaPara = function (el, p) { var topo = el.getBoundingClientRect().top + window.scrollY; window.scrollTo({ top: topo + p * (el.offsetHeight - vh()) + 2, behavior: calmo.matches ? 'auto' : 'smooth' }); };
  var wa = function (msg) { if (window.BR_WA) window.BR_WA(msg); };

  // ---------- caixa da imagem ampliada ----------
  var caixa = $('.caixa');
  function amplia(src, legenda, alt) {
    if (window.ANA_TELA) { window.ANA_TELA.abre([{ src: src, alt: alt, leg: legenda }], 0); return; }
    if (!caixa || !caixa.showModal) { window.open(src, '_blank', 'noopener'); return; }
    $('img', caixa).src = src; $('img', caixa).alt = alt || ''; $('.caixa-leg', caixa).textContent = legenda || '';
    caixa.showModal();
  }
  if (caixa) {
    $('.caixa-fecha', caixa).addEventListener('click', function () { caixa.close(); });
    caixa.addEventListener('click', function (e) { if (e.target === caixa) caixa.close(); });
  }

  // ---------- menu do celular ----------
  var bMenu = $('.cab-menu'), menuCel = $('#menu-cel');
  bMenu.addEventListener('click', function () { var abre = menuCel.hidden; menuCel.hidden = !abre; bMenu.setAttribute('aria-expanded', String(abre)); bMenu.textContent = abre ? 'Fechar' : 'Menu'; });
  menuCel.addEventListener('click', function (e) { if (e.target.closest('a')) { menuCel.hidden = true; bMenu.setAttribute('aria-expanded', 'false'); bMenu.textContent = 'Menu'; } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menuCel.hidden) bMenu.click(); });
  // no celular o botão de pausar as animações mora dentro do menu (nada de botão solto por cima do cabeçalho)
  var bAnimTopo = $('.anim');
  if (bAnimTopo) {
    var bAnimMenu = document.createElement('button');
    bAnimMenu.type = 'button'; bAnimMenu.className = 'menu-anim'; bAnimMenu.textContent = 'Pausar as animações';
    bAnimMenu.addEventListener('click', function () { bAnimTopo.click(); bAnimMenu.textContent = document.body.classList.contains('parado') ? 'Retomar as animações' : 'Pausar as animações'; });
    menuCel.appendChild(bAnimMenu);
  }

  // ---------- cabeçalho: tom conforme o bloco que está embaixo dele ----------
  var cab = $('.cab'), tons = $$('[data-tom]').filter(function (el) { return el !== cab; }), tomInicial = cab.dataset.tom;
  function tomDoCabecalho() {
    var y = 40, tom = tomInicial;
    tons.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top <= y && r.bottom > y) tom = el.dataset.tom; });
    return tom;
  }

  var abertura = $('#inicio'), ilha = $('#ilha');
  if (abertura && ilha) home(); else interna();

  function interna() {
    var pedido = false;
    function rola() { pedido = false; cab.dataset.tom = tomDoCabecalho(); }
    window.addEventListener('scroll', function () { if (!pedido) { pedido = true; requestAnimationFrame(rola); } }, { passive: true });
    rola();
  }

  // =====================================================================================
  // HOME
  // =====================================================================================
  function home() {
    // ---------- galerias presas ----------
    var galerias = $$('[data-galeria]').map(function (sec) {
      var qs = $$('.g-q', sec), legs = $$('.g-leg', sec), barras = $('.g-barras', sec), n = qs.length, g = { sec: sec, qs: qs, legs: legs, n: n, i: -1 };
      sec.style.setProperty('--n', n);
      barras.innerHTML = qs.map(function () { return '<span></span>'; }).join('');
      g.spans = $$('span', barras); g.ant = $('.g-ant', sec); g.prox = $('.g-prox', sec);
      g.ant.addEventListener('click', function () { rolaPara(sec, (Math.max(0, g.i - 1) + .5) / n); });
      g.prox.addEventListener('click', function () { rolaPara(sec, (Math.min(n - 1, g.i + 1) + .5) / n); });
      $('.g-ampliar', sec).addEventListener('click', function () { var im = $('img', qs[g.i]); amplia(im.currentSrc || im.src, $('h3', legs[g.i]).textContent, im.alt); });
      g.mostra = function (i) {
        if (i === g.i) return; g.i = i;
        qs.forEach(function (q, k) { q.classList.toggle('visto', k <= i); });
        legs.forEach(function (l, k) { l.classList.toggle('on', k === i); });
        g.spans.forEach(function (s, k) { s.classList.toggle('on', k <= i); });
        g.ant.disabled = i === 0; g.prox.disabled = i === n - 1;
      };
      return g;
    });

    // ---------- a Ilha: legenda, contador e reserva sem WebGL ----------
    var bairros = $$('.il-lista li'), nB = bairros.length, ilI = -1;
    ilha.style.setProperty('--n', nB);
    var plano = $('.il-plano img');
    function ilhaMostra(i) {
      if (i === ilI) return; ilI = i; var li = bairros[i];
      $('.il-cont').innerHTML = '<b>' + dois(i + 1) + '</b> / ' + dois(nB);
      $('.il-nome').textContent = $('b', li).textContent;
      $('.il-info').innerHTML = $('span', li).textContent + ' · <b>' + $('i', li).textContent + '</b>';
      $('.il-ant').disabled = i === 0; $('.il-prox').disabled = i === nB - 1;
      plano.style.opacity = 0; setTimeout(function () { plano.src = li.dataset.img; plano.style.opacity = 1; }, 220);
    }
    $('.il-ant').addEventListener('click', function () { rolaPara(ilha, Math.max(0, ilI - 1) / (nB - 1)); });
    $('.il-prox').addEventListener('click', function () { rolaPara(ilha, Math.min(nB - 1, ilI + 1) / (nB - 1)); });
    $('.il-ampliar').addEventListener('click', function () { var li = bairros[ilI]; amplia(li.dataset.img, $('b', li).textContent + ' · ' + $('i', li).textContent, 'Vista do bairro ' + $('b', li).textContent); });

    // ---------- o jeito da Ana ----------
    var jeito = $('#jeito'), jFotos = $$('.jt-foto'), jFrases = $$('.jt-frase'), jAbas = $$('.jt-abas button'), jI = 0;
    function jeitoMostra(i) {
      if (i === jI) return; jI = i;
      jFotos.forEach(function (f, k) { f.classList.toggle('on', k === i); });
      jFrases.forEach(function (f, k) { f.classList.toggle('on', k === i); });
      jAbas.forEach(function (b, k) { b.setAttribute('aria-selected', String(k === i)); });
    }
    jAbas.forEach(function (b, k) { b.addEventListener('click', function () { rolaPara(jeito, (k + .5) / 3); }); });

    var palco = $('.ab-palco');
    function rolou() {
      var tom = tomDoCabecalho();
      if (abertura.getBoundingClientRect().bottom > 40) tom = progresso(abertura) > .45 ? 'escuro' : 'foto';
      cab.dataset.tom = tom;
      palco.style.setProperty('--p', progresso(abertura).toFixed(3));
      galerias.forEach(function (g) { g.mostra(Math.min(g.n - 1, Math.floor(progresso(g.sec) * g.n))); });
      var t = progresso(ilha) * (nB - 1);
      ilhaMostra(Math.round(t));
      ilha.style.setProperty('--prog', ((t + 1) / nB).toFixed(3));
      $('.il-intro').classList.toggle('sai', t > .35);
      var pj = progresso(jeito);
      jeito.style.setProperty('--jp', pj.toFixed(3));
      jeitoMostra(Math.min(2, Math.floor(pj * 3)));
    }
    var pedido = false;
    function agenda() { if (!pedido) { pedido = true; requestAnimationFrame(function () { pedido = false; rolou(); }); } }
    window.addEventListener('scroll', agenda, { passive: true });
    window.addEventListener('resize', agenda);
    rolou();

    // ---------- contadores dos números ----------
    var contas = $$('[data-conta]');
    function conta(el) {
      var alvo = +el.dataset.conta, t0 = null;
      if (calmo.matches) return;
      function passo(ts) { if (!t0) t0 = ts; var k = limita((ts - t0) / 1600, 0, 1), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(alvo * e).toLocaleString('pt-BR'); if (k < 1) requestAnimationFrame(passo); }
      el.textContent = '0'; requestAnimationFrame(passo);
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { conta(e.target); io.unobserve(e.target); } }); }, { threshold: .6 });
      contas.forEach(function (c) { io.observe(c); });
    }

    // ---------- simulador de financiamento ----------
    var precos = $$('#destaques .g-q').map(function (q) { return +q.dataset.preco; });
    var chips = $$('#destaques .cabe');
    var fnBarras = $('.fn-barras');
    fnBarras.innerHTML = precos.map(function () { return '<span></span>'; }).join('');
    var f = $('#fin');
    function financia() {
      var renda = +f.renda.value, ent = +f.ent.value, n = +f.anos.value * 12, i = Math.pow(1.1149, 1 / 12) - 1;
      // SAC: primeira parcela = amortização + juros, limitada a 30% da renda
      var parcela = renda * .3, fin = parcela / (1 / n + i), total = fin + ent;
      f.renda.previousElementSibling.textContent = real(renda); f.ent.previousElementSibling.textContent = mil(ent); f.anos.previousElementSibling.textContent = f.anos.value + ' anos';
      $('.fn-total').textContent = 'Você compra até ' + mil(total);
      $('.fn-det').textContent = 'Financiamento de ' + mil(fin) + ' + ' + mil(ent) + ' de entrada · primeira parcela de ' + real(parcela) + ', caindo todo mês';
      var cabem = 0;
      precos.forEach(function (p, k) {
        var ok = p <= total; if (ok) cabem++;
        chips[k].className = 'cabe' + (ok ? '' : ' nao');
        // em alto padrão, "faltam R$ 5 milhões" só atrapalha: o selo aparece só quando o imóvel cabe na simulação
        chips[k].textContent = ok ? '✓ cabe na sua simulação' : '';
      });
      $$('span', fnBarras).forEach(function (s, k) { s.classList.toggle('on', precos[k] <= total); });
      $('.fn-cabem').textContent = cabem ? cabem + ' DE ' + precos.length + ' DESTAQUES CABEM NO SEU BOLSO' : 'NENHUM DESTAQUE CABE AINDA, MAS TENHO OUTROS: ME CHAME';
      var bw = $('.fn-wa'); bw.textContent = 'Me mostre imóveis até ' + mil(total) + ' ↗';
      bw.setAttribute('data-wa', 'Olá, Ana! Fiz a simulação no site: consigo imóvel de até ' + mil(total) + '. Pode me mostrar opções?');
    }
    f.addEventListener('input', financia); f.addEventListener('submit', function (e) { e.preventDefault(); }); financia();

    // ---------- prévia de avaliação ----------
    var a = $('#aval');
    function avalia() {
      var m2 = limita(+a.m2.value || 20, 20, 900), v = +a.b.value * m2 * +a.q.value * (a.vaga.checked ? 1 : .92), bairro = a.b.options[a.b.selectedIndex].text;
      $('.aval-saida').innerHTML = '<small>' + bairro + ' · ' + m2 + ' m²</small><b>' + mil(v * .94) + '<br>a ' + mil(v * 1.05) + '</b><span>Imóveis assim vendem em 41 dias, em média, com a Ana.</span>';
      $('[data-wa-aval]').setAttribute('data-wa', 'Olá, Ana! Quero a avaliação grátis do meu imóvel: ' + m2 + ' m², ' + a.q.options[a.q.selectedIndex].text + ' quarto(s), ' + bairro + '.');
    }
    a.addEventListener('input', avalia); a.addEventListener('change', avalia); a.addEventListener('submit', function (e) { e.preventDefault(); }); avalia();

    // ---------- todas as imagens: filtro, setas e troca automática ----------
    var itens = [];
    $$('#destaques .g-q').forEach(function (q, k) { var im = $('img', q), leg = $$('#destaques .g-leg')[k]; itens.push({ src: im.getAttribute('src'), alt: im.alt, tit: $('h3', leg).textContent + ' · ' + $('p', leg).textContent.replace(/^\d+ \/ \d+\s*/, '').split(' · ')[0], c: 'imoveis' }); });
    bairros.forEach(function (li) { itens.push({ src: li.dataset.img, alt: 'Vista do bairro ' + $('b', li).textContent + ', em Cidade Exemplo', tit: $('b', li).textContent + ' · ' + $('i', li).textContent, c: 'bairros' }); });
    $$('#como .g-q').forEach(function (q, k) { var im = $('img', q); itens.push({ src: im.getAttribute('src'), alt: im.alt, tit: $('h3', $$('#como .g-leg')[k]).textContent, c: 'venda' }); });
    var lista = itens, mI = 0, tocando = !calmo.matches, relogio = null, visivel = false;
    var mImg = $('.ms-img'), bPlay = $('.ms-play');
    function msMostra(i, anima) {
      mI = (i + lista.length) % lista.length; var it = lista[mI];
      $('.ms-cont').textContent = dois(mI + 1) + ' / ' + dois(lista.length);
      $('.ms-tit').textContent = it.tit;
      var troca = function () { mImg.src = it.src; mImg.alt = it.alt; mImg.classList.remove('troca'); };
      if (anima && !calmo.matches) { mImg.classList.add('troca'); setTimeout(troca, 260); } else troca();
    }
    function msRelogio() {
      clearInterval(relogio);
      var ok = tocando && visivel && !document.body.classList.contains('parado');
      bPlay.textContent = tocando ? '❚❚' : '▶'; bPlay.setAttribute('aria-label', tocando ? 'Pausar a troca automática' : 'Tocar a troca automática');
      if (ok) relogio = setInterval(function () { msMostra(mI + 1, true); }, 4500);
    }
    $$('.ms-filtros button').forEach(function (b) {
      b.addEventListener('click', function () {
        var filtro = b.dataset.f; lista = filtro === 'todas' ? itens : itens.filter(function (x) { return x.c === filtro; });
        $$('.ms-filtros button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        msMostra(0, true); msRelogio();
      });
    });
    $('.ms-ant').addEventListener('click', function () { msMostra(mI - 1, true); msRelogio(); });
    $('.ms-prox').addEventListener('click', function () { msMostra(mI + 1, true); msRelogio(); });
    bPlay.addEventListener('click', function () { tocando = !tocando; msRelogio(); });
    $('.ms-ampliar').addEventListener('click', function () { amplia(lista[mI].src, lista[mI].tit, lista[mI].alt); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visivel = es[0].isIntersecting; msRelogio(); }, { threshold: .3 }).observe($('.ms-palco'));
    msMostra(0, false);

    // ---------- botão Animações: pausa o 3D, a troca automática e os movimentos de CSS ----------
    var bAnim = $('.anim');
    bAnim.addEventListener('click', function () {
      var parar = !document.body.classList.contains('parado');
      document.body.classList.toggle('parado', parar); bAnim.setAttribute('aria-pressed', String(parar));
      msRelogio();
    });
  }

  // =====================================================================================
  // PÁGINAS INTERNAS
  // =====================================================================================

  // ---------- imoveis.html: filtro da lista ----------
  var fl = $('#filtro');
  if (fl) {
    var cards = $$('.cards .card'), grade = $('.cards'), cont = $('.lista-cont b'), vazio = $('.vazio');
    var aplica = function () {
      var tipo = fl.tipo.value, bairro = fl.bairro.value, teto = +fl.preco.value, qt = +fl.quartos.value, n = 0;
      cards.forEach(function (c) {
        var ok = (!tipo || c.dataset.tipo === tipo) && (!bairro || c.dataset.bairro === bairro) && (!teto || +c.dataset.preco <= teto) && (+c.dataset.quartos >= qt);
        c.hidden = !ok; if (ok) n++;
      });
      var ord = fl.ordem.value, chave = ord === 'area' ? 'area' : 'preco';
      cards.slice().sort(function (x, y) { var d = +x.dataset[chave] - +y.dataset[chave]; return ord === 'maior' || ord === 'area' ? -d : d; }).forEach(function (c) { grade.appendChild(c); });
      cont.textContent = n === 1 ? '1 imóvel' : n + ' imóveis';
      vazio.hidden = n > 0;
      var q = []; ['tipo', 'bairro', 'preco', 'quartos'].forEach(function (k) { if (fl[k].value && fl[k].value !== '0') q.push(k + '=' + encodeURIComponent(fl[k].value)); });
      try { history.replaceState(null, '', q.length ? '?' + q.join('&') : location.pathname); } catch (e) {}
    };
    try { var qs = new URLSearchParams(location.search); ['tipo', 'bairro', 'preco', 'quartos'].forEach(function (k) { if (qs.get(k) && fl[k].querySelector('option[value="' + qs.get(k).replace(/"/g, '') + '"]')) fl[k].value = qs.get(k); }); } catch (e) {}
    fl.addEventListener('change', aplica); fl.addEventListener('submit', function (e) { e.preventDefault(); });
    $('.filtro-limpa').addEventListener('click', function () { fl.reset(); aplica(); });
    $$('[data-limpa]').forEach(function (b) { b.addEventListener('click', function () { fl.reset(); aplica(); }); });
    aplica();
  }

  // ---------- imovel-*.html: galeria que amplia ----------
  $$('.im-galeria button').forEach(function (b) {
    b.addEventListener('click', function () { var im = $('img', b); amplia(im.currentSrc || im.src, $('.lg', b).textContent, im.alt); });
  });

  // ---------- simulador.html: simulador completo (SAC ou Price, taxa, prazo e entrada mínima de 20%) ----------
  var sim = $('#sim');
  if (sim) {
    var simula = function () {
      var renda = +sim.renda.value, ent = +sim.ent.value, anos = +sim.anos.value, n = anos * 12, taxa = +sim.taxa.value, i = Math.pow(1 + taxa / 100, 1 / 12) - 1, price = sim.sist.value === 'price';
      var parcela = renda * .3, fin = price ? parcela * (1 - Math.pow(1 + i, -n)) / i : parcela / (1 / n + i);
      var porEntrada = ent / .2, total = Math.min(fin + ent, porEntrada), limitou = fin + ent > porEntrada;
      fin = Math.max(0, total - ent);
      var p1 = price ? fin * i / (1 - Math.pow(1 + i, -n)) : fin / n + fin * i, pN = price ? p1 : fin / n * (1 + i);
      var juros = price ? p1 * n - fin : fin * i * (n + 1) / 2;
      sim.renda.previousElementSibling.lastElementChild.textContent = real(renda);
      sim.ent.previousElementSibling.lastElementChild.textContent = mil(ent);
      sim.anos.previousElementSibling.lastElementChild.textContent = anos + ' anos';
      sim.taxa.previousElementSibling.lastElementChild.textContent = taxa.toFixed(2).replace('.', ',') + '% a.a.';
      $('.sim-total').textContent = mil(total);
      $('.sim-det').textContent = limitou ? 'O limite aqui é a entrada: o banco financia até 80% do imóvel. Com mais entrada (ou FGTS), o valor sobe.' : 'O limite aqui é a renda: a primeira parcela fica em até 30% de ' + real(renda) + '.';
      $('.sim-tab').innerHTML = '<tr><td>Financiamento</td><td>' + mil(fin) + '</td></tr><tr><td>Entrada com FGTS</td><td>' + mil(ent) + '</td></tr><tr><td>Primeira parcela</td><td>' + real(p1) + '</td></tr><tr><td>Última parcela</td><td>' + real(pN) + '</td></tr><tr><td>Juros no contrato todo</td><td>' + mil(juros) + '</td></tr><tr><td>Sistema</td><td>' + (price ? 'Price, parcela fixa' : 'SAC, parcela que cai') + '</td></tr>';
      var cabem = 0;
      $$('.cabem a').forEach(function (l) { var p = +l.dataset.preco, ok = p <= total; if (ok) cabem++; l.classList.toggle('nao', !ok); l.lastElementChild.textContent = ok ? '✓ cabe' : 'faltam ' + mil(p - total); });
      $('.sim-cabem').textContent = cabem + ' de ' + $$('.cabem a').length + ' imóveis da lista cabem nesta simulação';
      $('.sim-wa').setAttribute('data-wa', 'Olá, Ana! Fiz a simulação completa no site: ' + (price ? 'Price' : 'SAC') + ', ' + anos + ' anos, renda de ' + real(renda) + ' e ' + mil(ent) + ' de entrada. Consigo imóvel de até ' + mil(total) + '. Pode me mostrar opções?');
    };
    sim.addEventListener('input', simula); sim.addEventListener('change', simula); sim.addEventListener('submit', function (e) { e.preventDefault(); }); simula();
  }

  // ---------- avaliacao.html: avaliação completa ----------
  var av = $('#aval2');
  if (av) {
    var avalia2 = function () {
      var m2 = limita(+av.m2.value || 20, 20, 900), m2b = +av.b.value, bairro = av.b.options[av.b.selectedIndex].text, tipo = av.tipo.options[av.tipo.selectedIndex].text.toLowerCase();
      var f = +av.tipo.value * +av.q.value * +av.vagas.value * +av.idade.value * +av.estado.value * (av.mar.checked ? 1.08 : 1) * (av.lazer.checked ? 1.03 : 1);
      var v = m2b * m2 * f, dias = Math.round(41 * (f >= 1.05 ? .85 : f < .9 ? 1.25 : 1));
      $('.av2-faixa').innerHTML = mil(v * .94) + '<br>a ' + mil(v * 1.05);
      $('.av2-det').textContent = tipo.charAt(0).toUpperCase() + tipo.slice(1) + ' de ' + m2 + ' m² em ' + bairro + ' · R$ ' + (Math.round(v / m2 / 10) * 10).toLocaleString('pt-BR') + '/m² · média do bairro R$ ' + m2b.toLocaleString('pt-BR') + '/m²';
      $('.av2-dias').textContent = 'Tempo estimado de venda: ' + dias + ' dias';
      var comp = [[.92, -6, 2], [1.04, 9, 1], [1.0, -2, 3]];
      $('.av2-comp').innerHTML = comp.map(function (c, k) { var a = Math.round(m2 * c[0]), pr = m2b * a * f * (1 + c[1] / 100); return '<tr><td>' + bairro + ', ' + a + ' m²</td><td>' + mil(pr) + '</td><td>há ' + (c[2] * 2 + k) + ' meses</td></tr>'; }).join('');
      $('.av2-wa').setAttribute('data-wa', 'Olá, Ana! Fiz a avaliação no site: ' + tipo + ' de ' + m2 + ' m² em ' + bairro + ', ' + av.q.options[av.q.selectedIndex].text + ' quarto(s), estimativa de ' + mil(v * .94) + ' a ' + mil(v * 1.05) + '. Quero a avaliação completa com visita.');
    };
    av.addEventListener('input', avalia2); av.addEventListener('change', avalia2); av.addEventListener('submit', function (e) { e.preventDefault(); }); avalia2();
  }

  // ---------- contato.html: formulário que vira mensagem ----------
  var ct = $('#ct-form');
  if (ct) {
    ct.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = ct.nome.value.trim(), tel = ct.tel.value.replace(/\D/g, ''), aviso = $('.aviso', ct);
      aviso.textContent = nome.length < 2 ? 'Escreva seu nome.' : tel.length < 10 ? 'Confira o WhatsApp com DDD.' : !ct.aceite.checked ? 'Marque que leu a política de privacidade.' : '';
      if (aviso.textContent) return;
      wa('Olá, Ana! Sou ' + nome + ' (' + ct.tel.value.trim() + '). Assunto: ' + ct.assunto.value + '.' + (ct.msg.value.trim() ? ' ' + ct.msg.value.trim() : ''));
      ct.innerHTML = '<p class="ct-ok">Recebido, ' + nome.split(' ')[0].replace(/[<>&"]/g, '') + '. Respondo no seu WhatsApp ainda hoje, de segunda a sábado.</p>';
    });
  }

  // =====================================================================================
  // COMPONENTES NOVOS: tela cheia com gesto, galeria cinematográfica, abas de vídeo/tour/planta,
  // tour 360°, plantas, agendamento que monta a mensagem e mapa interativo dos bairros.
  // =====================================================================================
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var DADOS = window.ANA || { imoveis: [], bairros: [] };

  // ---------- tela cheia: deslizar troca, dois dedos ou dois toques aproximam, arrastar move a foto aproximada ----------
  var tela = (function () {
    var el = null, lista = [], i = 0, focoAntes = null, zoom = 1, px = 0, py = 0, img, leg, cont;
    function monta() {
      el = document.createElement('div');
      el.className = 'tela'; el.hidden = true;
      el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Imagem em tela cheia');
      el.innerHTML = '<div class="tl-palco"><img class="tl-img" alt=""></div>' +
        '<div class="tl-topo"><p class="tl-cont"></p><button type="button" class="tl-fecha" aria-label="Fechar a tela cheia">Fechar <i aria-hidden="true">✕</i></button></div>' +
        '<button type="button" class="tl-ant" aria-label="Imagem anterior">←</button><button type="button" class="tl-prox" aria-label="Próxima imagem">→</button>' +
        '<p class="tl-leg"></p><p class="tl-dica">Deslize para trocar · dois toques para aproximar</p>';
      document.body.appendChild(el);
      img = $('.tl-img', el); leg = $('.tl-leg', el); cont = $('.tl-cont', el);
      $('.tl-fecha', el).addEventListener('click', fecha);
      $('.tl-ant', el).addEventListener('click', function () { vai(i - 1); });
      $('.tl-prox', el).addEventListener('click', function () { vai(i + 1); });
      document.addEventListener('keydown', function (e) {
        if (el.hidden) return;
        if (e.key === 'Escape') fecha();
        else if (e.key === 'ArrowLeft') vai(i - 1);
        else if (e.key === 'ArrowRight') vai(i + 1);
        else if (e.key === 'Tab') { var f = $$('button', el).filter(function (b) { return !b.hidden && b.offsetParent; }); if (!f.length) return; var a = f.indexOf(document.activeElement); if (e.shiftKey && a <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && a === f.length - 1) { e.preventDefault(); f[0].focus(); } }
      });
      // gestos
      var palco = $('.tl-palco', el), toques = new Map(), d0 = 0, z0 = 1, x0 = 0, y0 = 0, inicio = null, ultimoTap = 0;
      palco.addEventListener('pointerdown', function (e) {
        palco.setPointerCapture(e.pointerId); toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (toques.size === 2) { var t = [].concat(Array.from(toques.values())); d0 = Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y); z0 = zoom; inicio = null; }
        else { inicio = { x: e.clientX, y: e.clientY, t: Date.now() }; x0 = px; y0 = py; }
      });
      palco.addEventListener('pointermove', function (e) {
        if (!toques.has(e.pointerId)) return;
        toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (toques.size === 2) { var t = Array.from(toques.values()); zoom = limita(z0 * Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y) / (d0 || 1), 1, 4); aplica(); }
        else if (inicio && zoom > 1) { px = x0 + e.clientX - inicio.x; py = y0 + e.clientY - inicio.y; aplica(); }
        else if (inicio) { img.style.transform = 'translateX(' + (e.clientX - inicio.x) * .6 + 'px)'; }
      });
      function solta(e) {
        if (!toques.has(e.pointerId)) return;
        toques.delete(e.pointerId);
        if (inicio && toques.size === 0) {
          var dx = e.clientX - inicio.x, dy = e.clientY - inicio.y, dt = Date.now() - inicio.t;
          if (zoom === 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) vai(i + (dx < 0 ? 1 : -1));
          else if (zoom === 1 && dy > 90 && Math.abs(dy) > Math.abs(dx)) fecha();
          else if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 300) {
            if (Date.now() - ultimoTap < 320) { zoom = zoom > 1 ? 1 : 2.4; if (zoom === 1) { px = py = 0; } else { var r = img.getBoundingClientRect(); px = (r.left + r.width / 2 - e.clientX) * 1.4; py = (r.top + r.height / 2 - e.clientY) * 1.4; } aplica(); ultimoTap = 0; }
            else ultimoTap = Date.now();
          }
          if (zoom === 1) aplica();
        }
        if (toques.size === 0 && zoom <= 1.02) { zoom = 1; px = py = 0; aplica(); }
        inicio = null;
      }
      palco.addEventListener('pointerup', solta); palco.addEventListener('pointercancel', solta);
      palco.addEventListener('wheel', function (e) { e.preventDefault(); zoom = limita(zoom - e.deltaY * .002, 1, 4); if (zoom === 1) px = py = 0; aplica(); }, { passive: false });
    }
    function aplica() { img.style.transform = 'translate(' + px + 'px,' + py + 'px) scale(' + zoom + ')'; el.classList.toggle('zoom', zoom > 1); }
    function vai(k) {
      if (!lista.length) return;
      i = (k + lista.length) % lista.length; zoom = 1; px = py = 0;
      var it = lista[i];
      img.classList.add('troca');
      var nova = new Image(); nova.src = it.src;
      var mostra = function () { img.src = it.src; img.alt = it.alt || ''; img.classList.remove('troca'); aplica(); };
      if (nova.complete) mostra(); else { nova.onload = mostra; nova.onerror = mostra; }
      leg.textContent = it.leg || '';
      cont.textContent = lista.length > 1 ? dois(i + 1) + ' / ' + dois(lista.length) : '';
      $('.tl-ant', el).hidden = $('.tl-prox', el).hidden = lista.length < 2;
      if (lista[i + 1]) { var pre = new Image(); pre.src = lista[(i + 1) % lista.length].src; }
    }
    function abre(l, k) {
      if (!el) monta();
      lista = l; focoAntes = document.activeElement;
      el.hidden = false; document.documentElement.classList.add('sem-rolar');
      vai(k || 0);
      $('.tl-fecha', el).focus();
      if (el.requestFullscreen && matchMedia('(pointer: coarse)').matches) el.requestFullscreen().catch(function () {});
    }
    function fecha() {
      if (!el || el.hidden) return;
      el.hidden = true; document.documentElement.classList.remove('sem-rolar');
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
      if (focoAntes) focoAntes.focus();
    }
    return { abre: abre };
  })();
  window.ANA_TELA = tela;

  // ---------- galeria cinematográfica da página do imóvel ----------
  $$('[data-cine]').forEach(function (sec) {
    var palco = $('.cn-palco', sec), slides = $$('.cn-slide', sec), minis = $$('.cn-mini', sec), n = slides.length, i = 0, relogio = null, pausa = false, visivel = false;
    var lista = slides.map(function (s) { var im = $('img', s); return { src: im.getAttribute('src'), alt: im.alt, leg: s.dataset.leg }; });
    var barra = $('.cn-progresso span', sec);
    function mostra(k, auto) {
      i = (k + n) % n;
      slides.forEach(function (s, j) { s.classList.toggle('on', j === i); if (j === i) { var im = $('img', s); if (im.loading === 'lazy') im.loading = 'eager'; } });
      minis.forEach(function (m, j) { m.classList.toggle('on', j === i); if (j === i) m.setAttribute('aria-current', 'true'); else m.removeAttribute('aria-current'); });
      $('.cn-cont', sec).textContent = dois(i + 1) + ' / ' + dois(n);
      $('.cn-txt', sec).textContent = slides[i].dataset.leg;
      var m = minis[i], fila = m && m.parentNode;
      if (fila && fila.scrollWidth > fila.clientWidth) fila.scrollTo({ left: m.offsetLeft - fila.clientWidth / 2 + m.offsetWidth / 2, behavior: calmo.matches ? 'auto' : 'smooth' });
      var prox = slides[(i + 1) % n] && $('img', slides[(i + 1) % n]); if (prox && prox.loading === 'lazy') prox.loading = 'eager';
      if (!auto) reinicia();
    }
    function reinicia() {
      clearInterval(relogio);
      if (barra) { barra.style.animation = 'none'; void barra.offsetWidth; barra.style.animation = ''; }
      var ok = !pausa && visivel && !calmo.matches && !document.body.classList.contains('parado');
      sec.classList.toggle('tocando', ok);
      if (ok) relogio = setInterval(function () { mostra(i + 1, true); if (barra) { barra.style.animation = 'none'; void barra.offsetWidth; barra.style.animation = ''; } }, 6000);
    }
    $('.cn-ant', sec).addEventListener('click', function () { mostra(i - 1); });
    $('.cn-prox', sec).addEventListener('click', function () { mostra(i + 1); });
    $('.cn-cheia', sec).addEventListener('click', function () { pausa = true; reinicia(); tela.abre(lista, i); });
    minis.forEach(function (m, j) { m.addEventListener('click', function () { mostra(j); }); });
    palco.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') { e.preventDefault(); mostra(i - 1); } else if (e.key === 'ArrowRight') { e.preventDefault(); mostra(i + 1); } else if (e.key === 'Enter') tela.abre(lista, i); });
    palco.addEventListener('mouseenter', function () { pausa = true; reinicia(); });
    palco.addEventListener('mouseleave', function () { pausa = false; reinicia(); });
    // deslizar no celular; toque simples abre em tela cheia
    var ini = null;
    palco.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; ini = { x: e.clientX, y: e.clientY, t: Date.now() }; });
    palco.addEventListener('pointerup', function (e) {
      if (!ini) return;
      var dx = e.clientX - ini.x, dy = e.clientY - ini.y; ini = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { pausa = true; mostra(i + (dx < 0 ? 1 : -1)); }
      else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) { pausa = true; reinicia(); tela.abre(lista, i); }
    });
    palco.addEventListener('pointercancel', function () { ini = null; });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visivel = es[0].isIntersecting; reinicia(); }, { threshold: .4 }).observe(palco);
    new MutationObserver(reinicia).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    mostra(0, true);
  });

  // ---------- abas: vídeo, tour 360° e planta ----------
  $$('[role=tablist]').forEach(function (lista) {
    var abas = $$('[role=tab]', lista);
    function ativa(aba, foco) {
      abas.forEach(function (a) {
        var on = a === aba, painel = document.getElementById(a.getAttribute('aria-controls'));
        a.setAttribute('aria-selected', String(on)); a.tabIndex = on ? 0 : -1;
        if (painel) { painel.hidden = !on; if (!on) $$('video', painel).forEach(function (v) { v.pause(); }); }
      });
      if (foco) aba.focus();
    }
    abas.forEach(function (a, k) {
      a.tabIndex = a.getAttribute('aria-selected') === 'true' ? 0 : -1;
      a.addEventListener('click', function () { ativa(a); });
      a.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
        e.preventDefault(); ativa(abas[(k + d + abas.length) % abas.length], true);
      });
    });
  });

  // ---------- tour 360° (three.js só quando a pessoa pede) ----------
  $$('[data-360]').forEach(function (caixa) {
    var bt = $('.t360-abrir', caixa), cheia = $('.t360-cheia', caixa);
    function plano() {
      // reserva sem WebGL: a panorâmica corre de lado ao arrastar
      caixa.classList.add('t360-plano');
      var capa = $('.t360-capa', caixa), x = 0, ini = null;
      capa.addEventListener('pointerdown', function (e) { capa.setPointerCapture(e.pointerId); ini = e.clientX; });
      capa.addEventListener('pointermove', function (e) { if (ini === null) return; x += e.clientX - ini; ini = e.clientX; capa.style.backgroundPositionX = x + 'px'; });
      capa.addEventListener('pointerup', function () { ini = null; });
    }
    bt.addEventListener('click', function () {
      bt.disabled = true; bt.textContent = 'Carregando o tour…';
      import('./tour360.js').then(function (m) { return m.inicia(caixa); }).then(function () {
        caixa.classList.add('t360-on'); bt.hidden = true; cheia.hidden = false; caixa.tabIndex = 0; caixa.focus();
      }).catch(function () { bt.hidden = true; cheia.hidden = false; plano(); });
    });
    cheia.addEventListener('click', function () {
      var on = !caixa.classList.contains('t360-cheio');
      if (on && caixa.requestFullscreen) caixa.requestFullscreen().catch(function () { caixa.classList.add('t360-cheio'); });
      else if (!on || document.fullscreenElement) { if (document.fullscreenElement) document.exitFullscreen(); caixa.classList.remove('t360-cheio'); }
      else caixa.classList.add('t360-cheio');
      cheia.innerHTML = on ? 'Sair da tela cheia <i aria-hidden="true">✕</i>' : 'Tela cheia <i aria-hidden="true">⤢</i>';
    });
    document.addEventListener('fullscreenchange', function () {
      var on = document.fullscreenElement === caixa;
      caixa.classList.toggle('t360-cheio', on);
      cheia.innerHTML = on ? 'Sair da tela cheia <i aria-hidden="true">✕</i>' : 'Tela cheia <i aria-hidden="true">⤢</i>';
    });
  });

  // ---------- plantas: troca de andar e tela cheia com zoom ----------
  $$('[data-plantas]').forEach(function (bloco) {
    var figs = $$('.pl-fig', bloco), abas = $$('.pl-aba', bloco);
    var lista = figs.map(function (f) { var im = $('img', f); return { src: im.getAttribute('src'), alt: im.alt, leg: 'Planta ilustrativa · ' + (abas[+f.dataset.i] ? abas[+f.dataset.i].textContent : 'medidas aproximadas') }; });
    abas.forEach(function (a, k) { a.addEventListener('click', function () { abas.forEach(function (b, j) { b.setAttribute('aria-pressed', String(j === k)); }); figs.forEach(function (f, j) { f.classList.toggle('on', j === k); }); }); });
    figs.forEach(function (f, k) { f.addEventListener('click', function () { tela.abre(lista, k); }); });
  });

  // ---------- agendamento: monta a mensagem de WhatsApp com o imóvel, o dia e o horário ----------
  var SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  function isoDe(d) { return d.getFullYear() + '-' + dois(d.getMonth() + 1) + '-' + dois(d.getDate()); }
  $$('[data-agenda]').forEach(function (form) {
    var dia = form.dia, horas = $('.ag-horas', form), aviso = $('.ag-aviso', form), sel = form.imovel;
    var amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
    var limite = new Date(); limite.setDate(limite.getDate() + 60);
    dia.min = isoDe(amanha); dia.max = isoDe(limite);
    // primeiro dia útil a partir de amanhã
    var d0 = new Date(amanha); if (d0.getDay() === 0) d0.setDate(d0.getDate() + 1);
    dia.value = isoDe(d0);
    try { var q = new URLSearchParams(location.search).get('imovel'); if (q && sel.querySelector('option[value="' + q.replace(/[^\w-]/g, '') + '"]')) sel.value = q; } catch (e) {}
    function montaHoras() {
      var v = dia.value, html = '';
      if (!v) { horas.innerHTML = '<p class="ag-sem">Escolha o dia para ver os horários.</p>'; return; }
      var d = new Date(v + 'T12:00:00'), sem = d.getDay();
      if (sem === 0) { horas.innerHTML = '<p class="ag-sem">Domingo só com hora combinada por mensagem. Escolha outro dia ou fale com a Ana.</p>'; return; }
      var lista = sem === 6 ? ['9h', '10h', '11h', '12h'] : ['9h', '10h', '11h', '14h', '15h', '16h', '17h', '18h'];
      var semente = d.getDate() * 7 + d.getMonth() * 3;
      lista.forEach(function (h, k) {
        var ocupado = (semente + k * 5) % 7 === 0;
        html += '<label class="ag-h' + (ocupado ? ' ocupado' : '') + '"><input type="radio" name="hora" value="' + h + '"' + (ocupado ? ' disabled' : '') + '><span>' + h + (ocupado ? '<small> ocupado</small>' : '') + '</span></label>';
      });
      horas.innerHTML = html;
    }
    dia.addEventListener('change', montaHoras);
    montaHoras();
    $$('[data-video-call]').forEach(function (a) { a.addEventListener('click', function () { var r = form.querySelector('input[value="video"]'); if (r) r.checked = true; }); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = form.nome.value.trim(), tel = form.tel.value.replace(/\D/g, ''), hora = form.querySelector('input[name=hora]:checked');
      var d = dia.value ? new Date(dia.value + 'T12:00:00') : null;
      var erro = nome.length < 2 ? ['nome', 'Escreva seu nome.'] : tel.length < 10 ? ['tel', 'Confira o WhatsApp com DDD.'] : !sel.value ? ['imovel', 'Escolha o imóvel (ou peça ajuda para escolher).'] :
        !d || dia.value < dia.min || dia.value > dia.max ? ['dia', 'Escolha um dia a partir de amanhã, nos próximos 60 dias.'] : d.getDay() === 0 ? ['dia', 'Domingo só com hora combinada. Escolha outro dia.'] :
        !hora ? [null, 'Escolha um horário livre.'] : !form.aceite.checked ? ['aceite', 'Marque que leu a política de privacidade.'] : null;
      $$('.erro', form).forEach(function (x) { x.classList.remove('erro'); x.removeAttribute('aria-invalid'); });
      if (erro) { aviso.textContent = erro[1]; if (erro[0]) { var c = form[erro[0]]; c.classList.add('erro'); c.setAttribute('aria-invalid', 'true'); c.focus(); } else { var p = $('input[name=hora]:not(:disabled)', form); if (p) p.focus(); } return; }
      aviso.textContent = '';
      var imv = sel.options[sel.selectedIndex].text, video = form.tipo.value === 'video';
      var quando = SEMANA[d.getDay()] + ', ' + dois(d.getDate()) + '/' + dois(d.getMonth() + 1) + ', às ' + hora.value;
      var msg = 'Olá, Ana! Quero agendar uma visita pelo site.\n• Nome: ' + nome + '\n• WhatsApp: ' + form.tel.value.trim() + '\n• Imóvel: ' + (sel.value === 'outro' ? 'ainda não escolhi, quero ajuda' : imv) + '\n• Visita: ' + (video ? 'por chamada de vídeo' : 'presencial') + '\n• Dia: ' + quando;
      wa(msg);
      var ok = document.createElement('div');
      ok.className = 'ag-ok'; ok.setAttribute('role', 'status'); ok.tabIndex = -1;
      ok.innerHTML = '<p class="olho-h">PEDIDO MONTADO</p><p class="ag-ok-t">' + esc(nome.split(' ')[0]) + ', sua visita ficou pré-reservada para ' + esc(quando) + '.</p><dl><div><dt>Imóvel</dt><dd>' + esc(sel.value === 'outro' ? 'A Ana ajuda a escolher' : imv) + '</dd></div><div><dt>Visita</dt><dd>' + (video ? 'Por chamada de vídeo' : 'Presencial') + '</dd></div></dl><p>A Ana confirma pelo WhatsApp em até duas horas. Demonstração: nada foi enviado.</p><button type="button" class="bt bt-bege">Agendar outro horário ↗</button>';
      form.hidden = true; form.parentNode.insertBefore(ok, form.nextSibling); ok.focus();
      $('button', ok).addEventListener('click', function () { ok.remove(); form.hidden = false; form.nome.focus(); });
    });
  });

  // ---------- mapa interativo dos bairros ----------
  $$('[data-mapa]').forEach(function (mapa) {
    var painel = $('.mp-painel', mapa), botoes = $$('.mp-botoes button', mapa), pinos = $$('.mp-pino', mapa), atual = null;
    function imoveisDe(nome) { return DADOS.imoveis.filter(function (p) { return p.bairro === nome || (nome === 'Beira-Mar Norte' && p.bairro === 'Beira-Mar Norte'); }); }
    function mostra(id, rolar) {
      var b = DADOS.bairros.filter(function (x) { return x.id === id; })[0]; if (!b) return; atual = id;
      botoes.forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.b === id)); });
      pinos.forEach(function (p) { p.classList.toggle('on', p.dataset.b === id); p.setAttribute('aria-pressed', String(p.dataset.b === id)); });
      var imv = imoveisDe(b.nome);
      var cards = imv.length ? imv.map(function (p) { return '<a class="mp-imv" href="imovel-' + p.slug + '.html"><img src="img/' + p.foto + '.webp" alt="" width="120" height="80" loading="lazy"><span><b>' + esc(p.titulo) + '</b>' + p.area + ' m² · ' + p.suites + ' suíte' + (p.suites > 1 ? 's' : '') + (p.tour ? ' · tour 360°' : '') + '<i>' + real(p.preco) + '</i></span></a>'; }).join('') :
        '<p class="mp-off">Sem anúncio aberto agora. Tenho imóveis apresentados só sob consulta neste bairro.</p>';
      var vendas = b.vendas.length ? '<p class="mp-vend">' + b.vendas.map(function (v) { return 'Vendido: ' + esc(v[0].toLowerCase()) + ', ' + esc(v[2]) + ' em ' + esc(v[3]) + ' (exemplo)'; }).join('<br>') + '</p>' : '';
      painel.innerHTML = '<figure class="mp-foto"><img src="img/' + b.foto + '.webp" alt="Vista de ' + esc(b.nome) + '" width="800" height="533"><figcaption>' + esc(b.regiao) + '</figcaption></figure>' +
        '<div class="mp-txt"><h3>' + esc(b.nome) + '</h3><p class="mp-res">' + esc(b.resumo) + '</p>' +
        '<dl class="mp-dl"><div><dt>Para quem</dt><dd>' + esc(b.perfil) + '</dd></div><div><dt>Estilo de vida</dt><dd>' + esc(b.vida) + '</dd></div><div><dt>Distâncias</dt><dd>' + esc(b.tempo) + '</dd></div><div><dt>Metro quadrado</dt><dd>' + real(b.m2) + ' em média (exemplo) · ' + esc(b.faixa) + '</dd></div></dl>' +
        '<p class="mp-sub">Imóveis no bairro</p><div class="mp-imvs">' + cards + '</div>' + vendas +
        '<div class="mp-bts"><a class="bt bt-escuro" href="contato.html" data-wa="' + esc('Olá, Ana! Quero ver imóveis em ' + b.nome + ', inclusive os que não estão anunciados.') + '">Quero imóveis em ' + esc(b.nome) + ' ↗</a><a class="ver-mais" href="' + b.artigo + '">Ler o artigo sobre a região ↗</a></div></div>';
      if (rolar && painel.getBoundingClientRect().top > innerHeight * .7) painel.scrollIntoView({ behavior: calmo.matches ? 'auto' : 'smooth', block: 'start' });
    }
    botoes.forEach(function (x) { x.addEventListener('click', function () { mostra(x.dataset.b, matchMedia('(max-width: 900px)').matches); }); });
    pinos.forEach(function (p) {
      var nome = $('text', p).textContent;
      p.setAttribute('tabindex', '0'); p.setAttribute('role', 'button'); p.setAttribute('aria-label', 'Ver ' + nome);
      p.addEventListener('click', function () { mostra(p.dataset.b, matchMedia('(max-width: 900px)').matches); });
      p.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mostra(p.dataset.b, true); } });
    });
    var h = (location.hash || '').slice(1);
    var inicial = DADOS.bairros.some(function (b) { return b.id === h; }) ? h : (DADOS.bairros[0] || {}).id;
    mostra(inicial, false);
    if (h === inicial && h) setTimeout(function () { mapa.scrollIntoView({ block: 'start' }); }, 60);
  });
})();
