// Glow · menu em tela cheia, seções presas guiadas pela rolagem (abertura, cartões que correm de lado, fotos por trás da frase,
// foto que cresce), rosto com pontos por objetivo, planos do clube com economia, unidades por bairro/CEP e link de indicação.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raiz = document.documentElement;
  raiz.classList.add('js');
  if (!calmo) raiz.classList.add('mov');

  /* ---------- menu em tela cheia ---------- */
  var menu = $('#menu'), abre = $('.abre-menu');
  function menuAbrir(sim) {
    abre.setAttribute('aria-expanded', String(sim));
    if (sim) {
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add('aberto'); });
      document.body.style.overflow = 'hidden';
      setTimeout(function () { $('nav a', menu).focus(); }, 60);
    } else {
      menu.classList.remove('aberto');
      document.body.style.overflow = '';
      setTimeout(function () { menu.hidden = true; }, calmo ? 0 : 650);
      abre.focus();
    }
  }
  abre.addEventListener('click', function () { menuAbrir(true); });
  $('.fecha-menu').addEventListener('click', function () { menuAbrir(false); });
  menu.addEventListener('click', function (e) { if (e.target.closest('nav a')) menuAbrir(false); });
  document.addEventListener('keydown', function (e) {
    if (menu.hidden) return;
    if (e.key === 'Escape') menuAbrir(false);
    if (e.key === 'Tab') {
      var f = $$('a, button', menu), ult = f[f.length - 1];
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); ult.focus(); }
      else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ---------- tratamentos por objetivo (pontos no rosto) ---------- */
  // [nome, foto, texto, preço, pontos x/y na foto]
  var OBJ = [
    ['Manchas e melasma', 'Clareia manchas de sol, melasma e marcas de espinha, com protocolo para casa.', .7, .47, [['Laser lavieen', 'Clareia manchas de sol e melasma em 3 a 5 sessões.', 590], ['Peeling de ácidos', 'Renova a camada de cima da pele, 7 dias de descamação leve.', 320], ['Clareador home care', 'Protocolo para casa, prescrito pela médica.', 189]]],
    ['Rugas e linhas', 'Suaviza linhas de expressão e devolve firmeza, sem mudar o seu rosto.', .52, .29, [['Toxina botulínica', 'Testa, glabela e pés de galinha, com retorno em 15 dias.', 1090], ['Bioestimulador', 'Firmeza que aparece em 60 dias e dura até 2 anos.', 2290], ['Ultraformer', 'Ultrassom microfocado: efeito lifting sem cortes.', 1890]]],
    ['Acne e poros', 'Controla a oleosidade, trata espinhas ativas e suaviza cicatrizes.', .56, .66, [['Limpeza de pele profunda', 'Extração, alta frequência e máscara calmante.', 189], ['Laser de CO2 fracionado', 'Suaviza cicatrizes de acne em 3 sessões.', 990], ['Peeling de ácido salicílico', 'Controla oleosidade e espinhas ativas.', 260]]],
    ['Viço e hidratação', 'Pele com brilho de quem dormiu bem, por dentro e por fora.', .38, .5, [['Skinbooster', 'Hidratação injetável que dá brilho de dentro para fora.', 1290], ['Hydrafacial', 'Limpeza, esfoliação e sérum em 45 minutos.', 450], ['Drenagem facial', 'Desincha e relaxa: ideal antes de eventos.', 160]]],
    ['Corpo', 'Gordura localizada, flacidez e celulite, com sessões que cabem no almoço.', .8, .83, [['Criolipólise', 'Congela gordura localizada: −20% a −25% na área por sessão.', 790], ['Massagem modeladora', 'Pacote de 10 sessões, com drenagem.', 140], ['Radiofrequência corporal', 'Melhora flacidez e celulite.', 220]]]
  ];
  var PL = [['Glow 1', 199, 230, ['R$ 230 em créditos por mês', '20% off no que passar', 'Agenda prioritária']], ['Glow 2', 389, 460, ['R$ 460 em créditos por mês', '20% off no que passar', '1 drenagem de presente por mês', 'Agenda prioritária']], ['Glow Black', 790, 950, ['R$ 950 em créditos por mês', '25% off no que passar', 'Consulta médica trimestral', 'Créditos acumulam por 3 meses']]];
  var CLUBE_PONTO = [.25, .44];
  var n2 = function (i) { return (i < 9 ? '0' : '') + (i + 1); };

  var cartoes = OBJ.map(function (o, i) {
    return '<article class="cartao" id="obj-' + i + '" role="tabpanel"><h3><small>' + n2(i) + '</small>' + o[0] + '</h3><p>' + o[1] + '</p><p class="rot">Tratamentos · fora e dentro do clube</p><ul>' +
      o[4].map(function (t) { return '<li><span>' + t[0] + '<em>' + t[1] + '</em></span><b>' + real(t[2]) + '<small>' + real(t[2] * 0.8) + ' no clube</small></b></li>'; }).join('') +
      '</ul><a class="botao" href="#unidades" data-t="' + o[0] + '">Reservar avaliação</a></article>';
  });
  cartoes.push('<article class="cartao" id="obj-5" role="tabpanel"><h3><small>06</small>Clube <span translate="no">Glow</span></h3><p>Créditos todo mês para usar em qualquer tratamento acima, em qualquer unidade. Sem fidelidade.</p><p class="rot">Planos</p><ul>' +
    PL.map(function (p) { return '<li><span translate="no">' + p[0] + '<em>' + real(p[2]) + ' em créditos</em></span><b>' + real(p[1]) + '<small>por mês</small></b></li>'; }).join('') +
    '</ul><a class="botao" href="#clube">Comparar os planos</a></article>');
  $('.dt-cartoes').innerHTML = cartoes.join('');
  var pontosDados = OBJ.map(function (o) { return [o[2], o[3], o[0]]; }).concat([[CLUBE_PONTO[0], CLUBE_PONTO[1], 'Clube Glow']]);
  $('.dt-pontos').innerHTML = pontosDados.map(function (p, i) { return '<button class="dt-ponto" type="button" role="tab" aria-controls="obj-' + i + '" aria-selected="false" aria-label="' + n2(i) + ': ' + p[2] + '" data-o="' + i + '">' + n2(i) + '</button>'; }).join('');
  var obj = -1, largo = matchMedia('(min-width: 900px)');
  function escolher(i, rolar) {
    obj = i;
    $$('.dt-ponto').forEach(function (b) { b.setAttribute('aria-selected', String(+b.dataset.o === i)); });
    $$('.cartao').forEach(function (c, k) { c.classList.toggle('ativo', k === i); });
    if (rolar && !largo.matches) $('#obj-' + i).scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'center' });
  }
  $('.dt-pontos').addEventListener('click', function (e) { var b = e.target.closest('[data-o]'); if (b) escolher(+b.dataset.o, true); });
  $$('[data-ir]').forEach(function (a) { a.addEventListener('click', function () { escolher(+a.dataset.ir, false); }); });
  escolher(0, false);

  // posiciona os pontos e a faixa de texto sobre a foto (object-fit: cover)
  var palco = $('.dt-palco'), fundo = $('.dt-fundo');
  function posPontos() {
    var cw = palco.clientWidth, ch = palco.clientHeight, iw = 1400, ih = 2059;
    var op = getComputedStyle(fundo).objectPosition.split(' ').map(function (v) { return parseFloat(v) / 100; });
    var s = Math.max(cw / iw, ch / ih), w = iw * s, h = ih * s, ox = (cw - w) * op[0], oy = (ch - h) * (op[1] || .5);
    $$('.dt-ponto').forEach(function (b, i) { var p = pontosDados[i]; b.style.left = (ox + p[0] * w) + 'px'; b.style.top = (oy + p[1] * h) + 'px'; });
    palco.style.setProperty('--olho', (oy + .4 * h) + 'px');
  }
  posPontos();
  addEventListener('resize', posPontos);

  /* ---------- clube: planos e economia ---------- */
  $('.planos').innerHTML = PL.map(function (p, i) {
    return '<article class="plano rv' + (i === 1 ? ' dest' : '') + '">' + (i === 1 ? '<p class="tag">o mais escolhido</p>' : '') + '<h3><small>' + n2(i) + '</small><span translate="no">' + p[0] + '</span></h3><p class="p">' + real(p[1]) + '<small>/mês</small></p><p class="cred">' + real(p[2]) + ' em créditos todo mês</p><ul>' +
      p[3].map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul><a class="botao" href="#" data-wa="Olá, Glow! Quero assinar o ' + p[0] + ' (' + real(p[1]) + '/mês).">Assinar o ' + p[0] + '</a></article>';
  }).join('');
  var g = $('#gasto'), out = $('.econ output');
  function econ() {
    var v = +g.value; out.textContent = real(v);
    var melhor = PL.filter(function (p) { return p[2] <= v * 1.05; }).pop() || PL[0];
    var resto = Math.max(0, v - melhor[2]), novo = melhor[1] + resto * 0.8, eco = v - novo;
    $('.econ-res').innerHTML = eco > 0 ? 'Com o <b translate="no">' + melhor[0] + '</b> você pagaria ' + real(novo) + ' pelo mesmo tanto: <b>' + real(eco * 12) + ' a menos por ano</b>.' : 'Gastando ' + real(v) + ' por mês, o clube ainda não compensa. Compensa a partir de ' + real(PL[0][1] * 1.05) + '.';
  }
  g.addEventListener('input', econ); econ();

  /* ---------- unidades ---------- */
  var UN = [['Moema', 'Av. Ibirapuera, 2.120', '040'], ['Pinheiros', 'Rua dos Pinheiros, 870', '054'], ['Jardins', 'Rua Oscar Freire, 1.340', '014'], ['Vila Mariana', 'Rua Domingos de Morais, 2.780', '041'], ['Tatuapé', 'Rua Tuiuti, 2.010', '033'], ['Santana', 'Rua Voluntários da Pátria, 3.120', '020'], ['Morumbi', 'Av. Giovanni Gronchi, 5.600', '056'], ['Brooklin', 'Rua Joaquim Nabuco, 380', '045'], ['Perdizes', 'Rua Cardoso de Almeida, 1.150', '050'], ['Santo André', 'Av. Industrial, 600', '090'], ['Alphaville', 'Al. Rio Negro, 1.030', '064']];
  var trat = '';
  var sem = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  function un() {
    var q = sem($('#un-q').value.trim()), d = q.replace(/\D/g, '');
    var l = UN.filter(function (u) { return !q || (d.length >= 2 ? u[2].indexOf(d.slice(0, 3)) === 0 || u[2].slice(0, 2) === d.slice(0, 2) : sem(u[0]).indexOf(q) > -1); });
    if (!l.length) l = UN.slice(0, 3);
    $('.un-lista').innerHTML = l.slice(0, 4).map(function (u) { return '<li><span><b>' + u[0] + '</b><small>' + u[1] + ' · seg a sáb, 8h às 21h</small></span><a href="#" data-wa="Olá, Glow! Quero reservar ' + (trat ? trat.toLowerCase() : 'uma avaliação') + ' na unidade ' + u[0] + '.">Reservar</a></li>'; }).join('');
  }
  $('#un-q').addEventListener('input', un);
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) { trat = b.dataset.t; un(); } });
  un();

  /* ---------- perguntas: indique e ganhe ---------- */
  function abrirIndique() { if (location.hash === '#indique') $('#indique').open = true; }
  addEventListener('hashchange', abrirIndique); abrirIndique();
  document.addEventListener('click', function (e) { if (e.target.closest('a[href="#indique"]')) $('#indique').open = true; });
  var ind = $('#ind');
  ind.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = ind.nome.value.trim().split(' ')[0]; if (n.length < 2) { $('.ind-res').textContent = 'Escreva seu primeiro nome.'; return; }
    var cod = sem(n).replace(/[^a-z]/g, '').toUpperCase().slice(0, 8) + (Date.now() % 900 + 100);
    $('.ind-res').innerHTML = 'Seu código: <code>' + cod + '</code> · mande para as amigas: <a href="#" data-wa="Oi! Use meu código ' + cod + ' na Glow e ganhe R$ 100 no primeiro tratamento.">compartilhar no WhatsApp</a>';
  });

  /* ---------- linhas de mapeamento: pausar ---------- */
  var pausa = $('.sb-pausa');
  pausa.addEventListener('click', function () {
    var p = pausa.getAttribute('aria-pressed') !== 'true';
    pausa.setAttribute('aria-pressed', String(p)); pausa.setAttribute('aria-label', p ? 'Retomar a animação das linhas' : 'Pausar a animação das linhas');
    $('.sob').classList.toggle('parado', p);
  });
  if (calmo) { pausa.setAttribute('aria-pressed', 'true'); $('.sob').classList.add('parado'); }

  /* ---------- topo ---------- */
  var topo = $('.topo');
  function topoRolou() { topo.classList.toggle('rolou', scrollY > innerHeight * .6); }

  /* ---------- entrada suave ---------- */
  if (!calmo && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    $$('.rv').forEach(function (el) { io.observe(el); });
  }

  /* ---------- seções presas guiadas pela rolagem ---------- */
  var heroi = $('.heroi'), h1 = $('.heroi h1'), rola = $('.h-rola'), frase = $('.h-frase'), hFoto = $('.h-foto');
  var linhas = $('.linhas'), trilho = $('.li-trilho');
  var arte = $('.arte'), fotos = $$('.ar-fotos img');
  var semfim = $('.semfim'), sfFixo = $('.sf-fixo');
  function prog(el) { var r = el.getBoundingClientRect(), t = r.height - innerHeight; return t > 0 ? Math.min(1, Math.max(0, -r.top / t)) : 0; }
  var suave = function (x) { return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
  function quadro() {
    topoRolou();
    if (calmo) return;
    var vh = innerHeight;
    // abertura
    var p = prog(heroi);
    if (p < 1) {
      var a = Math.min(1, p / .45);
      h1.style.transform = 'translateY(' + (-a * vh * .32) + 'px)';
      h1.style.filter = 'blur(' + (a * 16) + 'px)';
      h1.style.opacity = String(1 - a);
      rola.style.transform = 'translateY(' + (-p * vh * .2) + 'px)'; rola.style.opacity = String(1 - Math.min(1, a * 1.6));
      var b = Math.min(1, Math.max(0, (p - .25) / .4));
      frase.style.opacity = String(b);
      frase.style.transform = 'translateY(' + ((1 - b) * 60 - p * 40) + 'px)';
      hFoto.style.transform = 'scale(' + (1 + p * .08) + ')';
    }
    // cartões correndo de lado
    var r = linhas.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0) {
      var q = prog(linhas), falta = trilho.scrollWidth - innerWidth;
      trilho.style.transform = 'translateX(' + (-suave(q) * Math.max(0, falta)) + 'px)';
    }
    // fotos passando por trás da frase
    r = arte.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0) {
      var off = -r.top;
      fotos.forEach(function (f) { f.style.transform = 'translateY(' + (-off * (+f.dataset.v)) + 'px)'; });
    }
    // foto que cresce
    r = semfim.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0) {
      var s = prog(semfim), c = suave(Math.min(1, s / .7)), w = innerWidth, h = sfFixo.clientHeight;
      var bw = Math.min(150, w * .36), bh = bw * 1.25;
      sfFixo.style.setProperty('--ci', ((h - bh) / 2 * (1 - c)).toFixed(1) + 'px');
      sfFixo.style.setProperty('--cl', ((w - bw) / 2 * (1 - c)).toFixed(1) + 'px');
      sfFixo.style.setProperty('--to', Math.min(1, Math.max(0, (s - .62) / .2)).toFixed(3));
    }
  }
  var pedido = false;
  addEventListener('scroll', function () { if (!pedido) { pedido = true; requestAnimationFrame(function () { pedido = false; quadro(); }); } }, { passive: true });
  addEventListener('resize', quadro);
  quadro();
})();
