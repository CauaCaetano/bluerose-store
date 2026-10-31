// Ana Ribeiro · comportamento do site no molde do Azimute: abertura presa, galerias que trocam a foto com a rolagem,
// a Ilha (o 3D fica em cena.js), o retrato com três capítulos, contadores, simulador de financiamento (SAC, 11,49% a.a.,
// parcela até 30% da renda), prévia de avaliação, mostra com filtro e o botão que pausa as animações.
// Páginas internas: filtro da lista de imóveis, galeria do imóvel, simulador e avaliação completos e o formulário de contato.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
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
        chips[k].textContent = ok ? '✓ cabe no seu financiamento' : 'faltam ' + mil(p - total);
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
    bairros.forEach(function (li) { itens.push({ src: li.dataset.img, alt: 'Vista do bairro ' + $('b', li).textContent + ', em Florianópolis', tit: $('b', li).textContent + ' · ' + $('i', li).textContent, c: 'bairros' }); });
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
      $('.sim-cabem').textContent = cabem + ' de 6 imóveis da lista cabem nesta simulação';
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
})();
