// Dra. Bianca Moraes · topo que encolhe, menus suspensos, fotos da abertura em fusão, ondas, carrosséis, rosto com pontos,
// vaso que se desenha, contadores, pétalas, dicas em vídeo e janela de agendamento que chama o WhatsApp.
(function () {
  'use strict';
  var d = document, $ = function (s, el) { return (el || d).querySelector(s); }, $$ = function (s, el) { return [].slice.call((el || d).querySelectorAll(s)); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- topo e coluna lateral ----------
  var topo = $('#topo'), lateral = $('.lateral');
  function rolar() {
    var y = scrollY;
    topo.classList.toggle('rolou', y > 40);
    d.documentElement.style.setProperty('--topo-a', topo.offsetHeight + 'px');
    lateral.classList.toggle('ver', y > innerHeight * .8);
  }
  addEventListener('scroll', rolar, { passive: true }); addEventListener('resize', rolar); rolar();

  // ---------- menus suspensos ----------
  var dds = $$('.dd');
  function fechaDd(ex) { dds.forEach(function (x) { if (x !== ex) { x.classList.remove('aberto'); $('.dd-bt', x).setAttribute('aria-expanded', 'false'); } }); }
  dds.forEach(function (dd) {
    var bt = $('.dd-bt', dd), t;
    function abre(v) { fechaDd(dd); dd.classList.toggle('aberto', v); bt.setAttribute('aria-expanded', String(v)); }
    bt.addEventListener('click', function () { abre(!dd.classList.contains('aberto')); });
    dd.addEventListener('mouseenter', function () { if (matchMedia('(hover: hover)').matches) { clearTimeout(t); abre(true); } });
    dd.addEventListener('mouseleave', function () { t = setTimeout(function () { abre(false); }, 180); });
    $$('a', dd).forEach(function (a) { a.addEventListener('click', function () { abre(false); }); });
  });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechaDd(null); });
  d.addEventListener('click', function (e) { if (!e.target.closest('.dd')) fechaDd(null); });

  // menu do celular
  var hamb = $('.hamb'), mc = $('#menu-cel');
  hamb.addEventListener('click', function () { var v = mc.hidden; mc.hidden = !v; hamb.setAttribute('aria-expanded', String(v)); hamb.setAttribute('aria-label', v ? 'Fechar menu' : 'Abrir menu'); });
  $$('a, button', mc).forEach(function (a) { a.addEventListener('click', function () { mc.hidden = true; hamb.setAttribute('aria-expanded', 'false'); }); });

  // ---------- abertura: fotos em fusão e ondas ----------
  var fotos = $$('.heroi-fotos img'), fi = 0;
  if (!calmo && fotos.length > 1) setInterval(function () { fotos[fi].classList.remove('ativa'); fi = (fi + 1) % fotos.length; fotos[fi].classList.add('ativa'); }, 5200);
  var ondas = $('.ondas'), NS = 'http://www.w3.org/2000/svg', linhas = [];
  for (var i = 0; i < 16; i++) { var p = d.createElementNS(NS, 'path'); ondas.appendChild(p); linhas.push(p); }
  var fase = 0;
  function desenhaOndas() {
    linhas.forEach(function (p, k) {
      var y0 = 30 + k * 31, a = 10 + (k % 4) * 3, s = '';
      for (var x = 0; x <= 1440; x += 40) {
        var y = y0 + Math.sin(x / 210 + k * .7 + fase) * a + Math.sin(x / 90 + k) * 3;
        s += (x ? 'L' : 'M') + x + ' ' + y.toFixed(1);
      }
      p.setAttribute('d', s);
    });
  }
  desenhaOndas();
  if (!calmo) { var vivo = true; new IntersectionObserver(function (e) { vivo = e[0].isIntersecting; }).observe(ondas); (function anda() { if (vivo) { fase += .006; desenhaOndas(); } requestAnimationFrame(anda); })(); }

  // ---------- flores do vaso: cada círculo do desenho vira uma coroa de pétalas ----------
  $$('.v-flor').forEach(function (g, gi) {
    var rs = $$('circle', g).map(function (c) { return +c.getAttribute('r'); }), cores = gi % 2 ? ['#fff', '#f3c3b2', '#e39d86'] : ['#f6cdbf', '#e9a48d', '#fff4ef'];
    g.innerHTML = '';
    rs.forEach(function (r, k) {
      if (k === rs.length - 1) { var c = d.createElementNS(NS, 'circle'); c.setAttribute('r', r * .8); c.setAttribute('fill', cores[2]); c.setAttribute('stroke', '#e2a08a'); c.setAttribute('stroke-width', '1'); g.appendChild(c); return; }
      var n = k === 0 ? 14 : 10;
      for (var q = 0; q < n; q++) {
        var e = d.createElementNS(NS, 'ellipse');
        e.setAttribute('cx', 0); e.setAttribute('cy', -r * .55); e.setAttribute('rx', r * (k === 0 ? .26 : .3)); e.setAttribute('ry', r * .5);
        e.setAttribute('transform', 'rotate(' + (q * 360 / n + k * 12) + ')');
        e.setAttribute('fill', cores[k]); e.setAttribute('stroke', k === 0 ? '#efc0b0' : '#fff'); e.setAttribute('stroke-width', '1');
        g.appendChild(e);
      }
    });
  });

  // ---------- aparecer ao rolar ----------
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('ver'); io.unobserve(e.target); } }); }, { threshold: .18 });
  $$('.anima, .ajuda, .numeros').forEach(function (el) { io.observe(el); });

  // ---------- carrossel de casos ----------
  var car = $('[data-car]'), trilho = $('.car-trilho', car), casos = $$('.caso', car), ci = 1;
  function posCar() {
    var c = casos[ci], larg = car.clientWidth;
    trilho.style.transform = 'translateX(' + (larg / 2 - (c.offsetLeft + c.offsetWidth / 2)) + 'px)';
    casos.forEach(function (x, k) { x.classList.toggle('ativo', k === ci); x.setAttribute('aria-hidden', String(k !== ci)); });
  }
  function vaiCar(n) { ci = (n + casos.length) % casos.length; posCar(); }
  $('.car-ant').addEventListener('click', function () { vaiCar(ci - 1); });
  $('.car-prox').addEventListener('click', function () { vaiCar(ci + 1); });
  casos.forEach(function (c, k) { c.addEventListener('click', function () { if (k !== ci) vaiCar(k); }); });
  var x0 = null;
  trilho.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
  addEventListener('pointerup', function (e) { if (x0 === null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 50) vaiCar(ci + (dx < 0 ? 1 : -1)); });
  addEventListener('resize', posCar); addEventListener('load', posCar); posCar();

  // ---------- avaliações: pontos e avanço sozinho ----------
  var lista = $('[data-av]'), cards = $$('.av', lista), pts = $('.pontos'), porPag = 1, pags = 1, pag = 0, para = false;
  function montaPontos() {
    porPag = Math.max(1, Math.round(lista.clientWidth / (cards[0].offsetWidth + 22)) - 0);
    pags = Math.max(1, Math.ceil(cards.length / porPag)); pts.innerHTML = '';
    for (var k = 0; k < pags; k++) { var b = d.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', 'Avaliações ' + (k + 1) + ' de ' + pags); b.dataset.p = k; pts.appendChild(b); }
    marca();
  }
  function marca() { $$('button', pts).forEach(function (b, k) { b.setAttribute('aria-selected', String(k === pag)); }); }
  function vaiPag(k) { pag = (k + pags) % pags; var alvo = cards[Math.min(cards.length - 1, pag * porPag)]; lista.scrollTo({ left: alvo.offsetLeft - lista.firstElementChild.offsetLeft, behavior: calmo ? 'auto' : 'smooth' }); marca(); }
  pts.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) vaiPag(+b.dataset.p); });
  lista.addEventListener('scroll', function () { var k = Math.round((lista.scrollLeft) / ((cards[0].offsetWidth + 22) * porPag)); if (k !== pag) { pag = Math.min(pags - 1, k); marca(); } }, { passive: true });
  ['mouseenter', 'focusin', 'touchstart'].forEach(function (ev) { lista.addEventListener(ev, function () { para = true; }, { passive: true }); });
  lista.addEventListener('mouseleave', function () { para = false; });
  montaPontos(); addEventListener('resize', montaPontos);
  if (!calmo) setInterval(function () { if (!para && !d.hidden) vaiPag(pag + 1); }, 6500);

  // ---------- como podemos ajudar: rosto com pontos ----------
  var Z = {
    testa: { n: 'Testa e pés de galinha', p: 'Botox na testa e pés de galinha', x: 300, y: 196, t: 'A ruga de expressão marca porque o músculo puxa a pele o dia inteiro. Relaxar só esse músculo resolve sem travar o rosto.', l: ['Suaviza a testa e as linhas ao redor dos olhos.', 'Você continua franzindo, só que sem marcar.', 'Também trata bruxismo e suor em excesso.'], v: ['R$ 1.190', '4 a 6 meses', 'nenhuma'] },
    olheira: { n: 'Olheiras', p: 'Preenchimento de olheiras', x: 336, y: 304, t: 'Muitas vezes a olheira é sombra de um sulco fundo, não pigmento. Pouca quantidade no lugar certo tira o ar de cansaço.', l: ['Disfarça o sulco abaixo do olho.', 'Ilumina o olhar sem deixar “bolsa”.', 'Avaliamos antes se a sua olheira é de sulco.'], v: ['R$ 1.590', '12 a 18 meses', '1 a 2 dias de leve inchaço'] },
    malar: { n: 'Maçã do rosto', p: 'Maçã do rosto', x: 246, y: 336, t: 'Com o tempo, o rosto perde volume no terço médio e tudo parece descer. Repor esse apoio levanta sem inflar.', l: ['Levanta o terço médio do rosto.', 'Suaviza o bigode chinês de forma indireta.', 'Sem efeito de bochecha cheia.'], v: ['R$ 1.890', '18 meses', '1 dia'] },
    labios: { n: 'Lábios', p: 'Preenchimento labial', x: 300, y: 392, t: 'Cada boca é única, como uma digital. Vamos desenhar juntas o formato antes da primeira gota.', l: ['Contorno e hidratação com 0,5 a 1 ml.', 'Corrige assimetrias naturais dos lábios.', 'Nada de volume exagerado.'], v: ['R$ 1.390', '9 a 12 meses', '2 dias de inchaço'] },
    mandibula: { n: 'Mandíbula e queixo', p: 'Contorno de mandíbula e queixo', x: 352, y: 424, t: 'O ângulo da mandíbula e a projeção do queixo dão estrutura ao rosto. É o que mais muda a foto de perfil.', l: ['Marca o ângulo da mandíbula.', 'Equilibra o perfil e o queixo.', 'Disfarça o início de papada.'], v: ['R$ 2.990', '18 a 24 meses', '2 a 3 dias'] },
    pele: { n: 'Pele e flacidez', p: 'Bioestimulador de colágeno', x: 300, y: 498, t: 'O bioestimulador faz o seu próprio corpo produzir colágeno. A firmeza aparece aos poucos e dura muito mais.', l: ['Firma rosto e pescoço.', 'Melhora textura e viço da pele.', 'Resultado gradual, em cerca de 60 dias.'], v: ['R$ 2.490 por sessão', 'até 2 anos', 'nenhuma'] }
  };
  var CHAVES = Object.keys(Z), atual = 'labios', camada = $('.pontos-rosto'), info = $('.aj-info'), nome = $('.aj-nome'), selBt = $('.aj-atual'), selLista = $('#aj-lista');
  CHAVES.forEach(function (k) {
    var z = Z[k], b = d.createElement('button');
    b.type = 'button'; b.className = 'ponto' + (z.x > 310 ? ' esq' : ''); b.dataset.z = k; b.setAttribute('aria-label', z.n);
    b.style.left = (z.x / 600 * 100) + '%'; b.style.top = (z.y / 640 * 100) + '%';
    b.innerHTML = '<span>' + z.n + '</span>'; camada.appendChild(b);
    var li = d.createElement('li'); li.innerHTML = '<button type="button" data-z="' + k + '">' + z.n + '</button>'; selLista.appendChild(li);
  });
  var CHECK = '<svg viewBox="0 0 30 30" aria-hidden="true"><use href="#i-check"/></svg>';
  function mostra(k, foco) {
    atual = k; var z = Z[k];
    nome.textContent = z.n;
    info.innerHTML = '<p>' + z.t + '</p><ul>' + z.l.map(function (x) { return '<li>' + CHECK + '<span>' + x + '</span></li>'; }).join('') + '</ul>' +
      '<dl><div><dt>a partir de</dt><dd>' + z.v[0] + '</dd></div><div><dt>dura</dt><dd>' + z.v[1] + '</dd></div><div><dt>recuperação</dt><dd>' + z.v[2] + '</dd></div></dl>' +
      '<button type="button" class="pilula" data-abrir-agenda data-int="' + z.p + '">Avaliar ' + z.n.toLowerCase() + '</button>';
    info.classList.remove('troca'); void info.offsetWidth; info.classList.add('troca');
    $$('.ponto').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.z === k)); });
    abreLista(false); faq(false);
    if (foco) selBt.focus();
  }
  function abreLista(v) { selLista.hidden = !v; selBt.setAttribute('aria-expanded', String(v)); }
  selBt.addEventListener('click', function () { abreLista(selLista.hidden); });
  selLista.addEventListener('click', function (e) { var b = e.target.closest('[data-z]'); if (b) mostra(b.dataset.z, true); });
  camada.addEventListener('click', function (e) { var b = e.target.closest('[data-z]'); if (b) mostra(b.dataset.z); });
  var faqBt = $('.aj-faq-bt'), faqEl = $('#aj-faq'), area = $('.aj-area');
  function faq(v) { faqEl.hidden = !v; area.hidden = v; faqBt.setAttribute('aria-expanded', String(v)); faqBt.textContent = v ? 'Áreas do rosto' : 'Dúvidas'; }
  faqBt.addEventListener('click', function () { faq(faqEl.hidden); });
  $$('[data-ir-z]').forEach(function (a) { a.addEventListener('click', function () { mostra(a.dataset.irZ); }); });
  $$('[data-duvidas]').forEach(function (a) { a.addEventListener('click', function () { faq(true); }); });
  mostra('labios');

  // ---------- contadores ----------
  var ioN = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return; ioN.unobserve(e.target);
      var el = e.target, fim = parseFloat(el.dataset.conta), dec = 'dec' in el.dataset, mil = 'mil' in el.dataset, t0 = performance.now(), dur = calmo ? 1 : 1600;
      function fmt(v) { return dec ? v.toFixed(1).replace('.', ',') : mil ? Math.round(v).toLocaleString('pt-BR') : String(Math.round(v)); }
      (function passo(t) { var q = Math.min(1, (t - t0) / dur); el.textContent = fmt(fim * (1 - Math.pow(1 - q, 3))); if (q < 1) requestAnimationFrame(passo); })(t0);
    });
  }, { threshold: .6 });
  $$('[data-conta]').forEach(function (el) { ioN.observe(el); });

  // ---------- pétalas caindo na faixa escura ----------
  var pet = $('.petalas');
  if (!calmo) for (var j = 0; j < 14; j++) {
    var s = d.createElement('span'); s.className = 'petala';
    s.style.left = (Math.random() * 100) + '%';
    s.style.animationDuration = (9 + Math.random() * 9) + 's'; s.style.animationDelay = (-Math.random() * 16) + 's';
    s.style.setProperty('--dx', (Math.random() * 160 - 60) + 'px'); s.style.setProperty('--r', (180 + Math.random() * 360) + 'deg');
    s.style.transform = 'scale(' + (.6 + Math.random() * .7) + ')'; s.style.opacity = (.4 + Math.random() * .5).toFixed(2);
    pet.appendChild(s);
  }

  // ---------- dicas (cartões com “play”) ----------
  $$('.reel').forEach(function (r) { r.addEventListener('click', function () { var v = r.getAttribute('aria-pressed') !== 'true'; $$('.reel').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); r.setAttribute('aria-pressed', String(v)); }); });

  // ---------- janela de agendamento ----------
  var dlg = $('#agenda'), f = $('#ag'), sel = $('#ag-int');
  function abreAgenda(int) {
    if (int) { [].some.call(sel.options, function (o) { if (o.text === int) { sel.value = o.text; return true; } }); }
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    setTimeout(function () { $('#ag-nome').focus(); }, 60);
  }
  d.addEventListener('click', function (e) { var b = e.target.closest('[data-abrir-agenda]'); if (!b) return; e.preventDefault(); fechaDd(null); abreAgenda(b.dataset.int || (Z[atual] && b.closest('.aj-info') ? Z[atual].p : '')); });
  $('.ag-fechar').addEventListener('click', function () { dlg.close ? dlg.close() : dlg.removeAttribute('open'); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = f.nome.value.trim(), t = f.tel.value.replace(/\D/g, ''), er = $('.erro', f);
    er.textContent = n.length < 2 ? 'Escreva seu nome.' : t.length < 10 ? 'Confira o WhatsApp com DDD.' : '';
    if (er.textContent) return;
    if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); // a janela fica na camada do topo; fecha para a prévia do WhatsApp aparecer
    if (window.BR_WA) window.BR_WA('Olá, Dra. Bianca Moraes! Sou ' + n + ' e quero agendar a avaliação sem custo. Interesse: ' + sel.value.toLowerCase() + '. WhatsApp: ' + t + '.');
    f.innerHTML = '<p class="ag-ok">Obrigada, ' + n.split(' ')[0].replace(/[<>&"]/g, '') + '. A Dra. Bianca te chama no WhatsApp ainda hoje.</p>';
  });
})();
