// Ferreira Reformas · abertura presa (foto vira traço), topo que some e volta, fotos reveladas, títulos que sobem por linha,
// miniaturas em paralaxe, abas que abrem, contadores, trilho de obras com fundo desfocado, faixas corridas, pilha de cartas e orçamento em 4 passos.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var real = function (v) { return 'R$ ' + (Math.round(v / 100) * 100).toLocaleString('pt-BR'); };

  // ---------- rolagem: topo, abertura e paralaxe ----------
  var topo = $('.topo'), abre = $('.abre'), cena = $('.abre-cena'), cab = $('.cb-foto'), ultimoY = scrollY;
  var minis = $$('.es-mini'), fotosEs = $$('.es-foto img');
  function rolar() {
    var y = scrollY, vh = innerHeight;
    // abertura: no primeiro trecho a foto sobe (corte de baixo para cima) e o texto some
    var p = Math.min(1, Math.max(0, y / (abre.offsetHeight - vh)));
    cena.style.setProperty('--corte', (p * 100).toFixed(2) + '%');
    cena.style.setProperty('--tx', Math.max(0, 1 - p * 2.2).toFixed(3));
    // topo: transparente na abertura; depois some ao descer e volta em creme ao subir
    var passou = y > vh * .6;
    topo.classList.toggle('solido', passou);
    topo.classList.toggle('escondido', passou && y > ultimoY + 2 && !topo.contains(document.activeElement));
    if (y < ultimoY - 2 || !passou) topo.classList.remove('escondido');
    ultimoY = y;
    if (calmo) return;
    if (cab) { var r = cab.parentNode.getBoundingClientRect(); if (r.bottom > 0 && r.top < vh) cab.style.setProperty('--px', ((r.top + r.height / 2 - vh / 2) * -0.12).toFixed(1) + 'px'); }
    minis.forEach(function (m, i) {
      var r = m.parentNode.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) return;
      var k = m.classList.contains('es-mini-a') ? 0.22 : -0.18;
      m.style.setProperty('--py', ((r.top + r.height / 2 - vh / 2) * k).toFixed(1) + 'px');
    });
    fotosEs.forEach(function (im) {
      var r = im.parentNode.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
      var t = Math.min(1, Math.max(0, 1 - r.top / vh)); im.style.setProperty('--zm', (1.14 - t * 0.14).toFixed(3));
    });
  }
  var pedido = false;
  addEventListener('scroll', function () { if (!pedido) { pedido = true; requestAnimationFrame(function () { pedido = false; rolar(); }); } }, { passive: true });
  addEventListener('resize', rolar); rolar();
  topo.addEventListener('focusin', function () { topo.classList.remove('escondido'); });

  // ---------- revelações ao aparecer ----------
  var vistos = $$('.revela, .linhas');
  if (calmo || !('IntersectionObserver' in window)) vistos.forEach(function (el) { el.classList.add('visto'); });
  else {
    var obs = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); obs.unobserve(e.target); } }); }, { threshold: .25 });
    vistos.forEach(function (el) { obs.observe(el); });
  }

  // ---------- contadores ----------
  var contaObs = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return; contaObs.unobserve(e.target);
      var el = e.target, fim = +el.dataset.ate, ini = el.hasAttribute('data-sem-ponto') ? fim - 11 : 0, t0 = performance.now();
      var fmt = function (v) { return el.hasAttribute('data-sem-ponto') ? String(v) : v.toLocaleString('pt-BR'); };
      if (calmo) return;
      (function passo(t) { var q = Math.min(1, (t - t0) / 1800); el.textContent = fmt(Math.round(ini + (fim - ini) * (1 - Math.pow(1 - q, 3)))); if (q < 1) requestAnimationFrame(passo); })(t0);
    });
  }, { threshold: .6 });
  $$('.conta').forEach(function (c) { c.textContent = c.hasAttribute('data-sem-ponto') ? String(+c.dataset.ate - 11) : '0'; contaObs.observe(c); });

  // ---------- abas das promessas ----------
  $$('.aba button').forEach(function (b) {
    b.addEventListener('click', function () {
      var abrir = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', abrir); document.getElementById(b.getAttribute('aria-controls')).hidden = !abrir;
    });
  });

  // ---------- faixas corridas: duplica o conteúdo para o laço não ter emenda ----------
  $$('.faixa-trilho, .vz-trilho').forEach(function (ul) {
    $$('li', ul).forEach(function (li) { var c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); ul.appendChild(c); });
  });

  // ---------- trilho de obras ----------
  var trilho = $('.ob-trilho'), cards = $$('.ob-card'), fundo = $('.ob-fundo img'), conta = $('.ob-conta span'), atual = 0;
  function largura() { return cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : trilho.clientWidth; }
  function marcar() {
    var i = Math.max(0, Math.min(cards.length - 1, Math.round(trilho.scrollLeft / largura())));
    if (trilho.scrollLeft + trilho.clientWidth >= trilho.scrollWidth - 4) i = cards.length - 1;
    if (i === atual) return; atual = i;
    conta.textContent = String(i + 1).padStart(2, '0');
    fundo.style.opacity = 0;
    setTimeout(function () { fundo.src = cards[i].dataset.img; fundo.style.opacity = 1; }, calmo ? 0 : 250);
  }
  trilho.addEventListener('scroll', function () { requestAnimationFrame(marcar); }, { passive: true });
  $$('.seta').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = Math.max(0, Math.min(cards.length - 1, atual + +b.dataset.dir));
      trilho.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: calmo ? 'auto' : 'smooth' });
    });
  });

  // ---------- pilha de cartas da equipe ----------
  var cartas = $$('.carta'), frente = 0, giro;
  function arrumar() { cartas.forEach(function (c, i) { c.dataset.pos = (i - frente + cartas.length) % cartas.length; c.setAttribute('aria-hidden', c.dataset.pos !== '0'); }); }
  function proxima() {
    var c = cartas[frente]; c.classList.add('sai');
    setTimeout(function () { c.classList.remove('sai'); frente = (frente + 1) % cartas.length; arrumar(); }, calmo ? 0 : 380);
  }
  arrumar();
  $('.pilha-bt').addEventListener('click', function () { clearInterval(giro); proxima(); });
  if (!calmo) {
    var pilhaObs = new IntersectionObserver(function (es) { es.forEach(function (e) { clearInterval(giro); if (e.isIntersecting) giro = setInterval(proxima, 4200); }); }, { threshold: .4 });
    pilhaObs.observe($('.pilha'));
  }

  // ---------- orçamento em 4 passos: cada resposta avança sozinha; no fim, faixa de preço e prazo ----------
  // preço por m² no padrão, dias base e dias por m², dica de tamanho, tamanho inicial, mínimo, máximo
  var T = {
    banheiro: ['banheiro', 2150, 6, 0.4, 'Banheiro social costuma ter de 3 a 6 m².', 6, 2, 20],
    cozinha: ['cozinha', 1650, 12, 0.5, 'Cozinha de apartamento fica entre 6 e 12 m².', 10, 4, 40],
    piso: ['piso', 190, 3, 0.12, 'Some a área dos cômodos. Apartamento de 2 quartos tem uns 60 m².', 60, 10, 120],
    pintura: ['pintura', 48, 2, 0.06, 'Use a área do piso: calculamos paredes e teto a partir dela.', 70, 10, 120]
  };
  var q = $('#orcamento'), passo = 0;
  function ir(p) {
    passo = p;
    $$('.q-passo', q).forEach(function (f) { f.hidden = +f.dataset.p !== p; });
    $('.q-res', q).hidden = p < 4;
    $('.q-barra i', q).style.width = Math.min(100, (p + 1) * 25) + '%';
    $('.q-volta', q).hidden = p === 0;
    if (p === 1) { var t = T[q.tipo.value]; q.m2.min = t[6]; q.m2.max = t[7]; q.m2.value = t[5]; $('.q-dica', q).textContent = t[4]; m2(); }
    if (p === 4) resultado();
    var f = $('.q-passo:not([hidden]) input, .q-res .botao', q); if (f && p > 0) f.focus({ preventScroll: true });
  }
  function m2() { q.m2.previousElementSibling.textContent = q.m2.value + ' m²'; }
  q.m2.addEventListener('input', m2);
  q.m2.addEventListener('change', function () { setTimeout(function () { ir(2); }, 350); });
  q.addEventListener('change', function (e) {
    if (e.target.name === 'tipo') ir(1); else if (e.target.name === 'ac') ir(3); else if (e.target.name === 'qd') ir(4);
  });
  q.addEventListener('submit', function (e) { e.preventDefault(); });
  // no teclado ou no celular o controle deslizante não dispara "change" sozinho: um botão também avança
  var seg = document.createElement('button'); seg.type = 'button'; seg.className = 'botao'; seg.textContent = 'Continuar'; seg.style.marginTop = '18px';
  seg.addEventListener('click', function () { ir(2); }); $('[data-p="1"]', q).appendChild(seg);
  $('.q-volta', q).addEventListener('click', function () { ir(passo === 4 ? 3 : passo - 1); });

  function resultado() {
    var t = T[q.tipo.value], m = +q.m2.value, ac = +q.ac.value, base = t[1] * m * ac;
    var dias = Math.round(t[2] + t[3] * m), nivel = $('[name=ac]:checked + span b', q).textContent.toLowerCase();
    $('.q-res', q).innerHTML = '<p style="margin:0;font-weight:700">Reforma de ' + t[0] + ', ' + m + ' m², ' + nivel + '</p><p class="q-faixa">' + real(base * 0.9) + ' <small style="font-size:.5em">a ' + real(base * 1.12) + '</small></p>' +
      '<ul><li>Prazo de ' + dias + ' a ' + (dias + 3) + ' dias úteis, com multa por atraso</li><li>Material e mão de obra inclusos</li><li>Em até 12x no cartão, ou 6% de desconto à vista</li></ul>' +
      '<a class="botao" href="#" data-wa="Olá, Ferreira! Fiz o orçamento no site: reforma de ' + t[0] + ', ' + m + ' m², acabamento ' + nivel + ', ' + q.qd.value + '. Estimativa ' + real(base * 0.9) + ' a ' + real(base * 1.12) + '. Posso mandar fotos?">Mandar fotos e fechar o valor</a>';
  }
  ir(0);
})();
