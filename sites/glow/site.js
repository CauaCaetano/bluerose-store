// Glow · menu em tela cheia, seções presas guiadas pela rolagem (abertura, cartões que correm de lado, fotos por trás da frase,
// foto que cresce), rosto com pontos por objetivo, planos do clube com economia, unidades por bairro/CEP, link de indicação,
// filtro do blog e formulários que viram mensagem no WhatsApp. Cada bloco só roda se a seção existir na página.
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
  if (menu && abre) {
    var menuAbrir = function (sim) {
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
    };
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
  }

  /* ---------- tratamentos por objetivo (pontos no rosto) ---------- */
  // [nome, texto, ponto x, ponto y, tratamentos, página]
  var OBJ = [
    ['Manchas e melasma', 'Manchas de sol, melasma e marcas de espinha, com protocolo para casa.', .7, .47, [['Laser LaVieen', 'Laser para manchas de sol e melasma; sessões definidas na avaliação.', 590], ['Peeling de ácidos', 'Renova a camada de cima da pele, com descamação leve por alguns dias.', 320], ['Clareador home care', 'Protocolo para casa, prescrito pela médica.', 189]], 'tratamento-manchas.html'],
    ['Rugas e linhas', 'Linhas de expressão e flacidez, tratadas com naturalidade e plano por escrito.', .52, .29, [['Toxina botulínica', 'Testa, glabela e pés de galinha, com retorno em 15 dias.', 1090], ['Bioestimulador', 'Estimula o colágeno da própria pele, com efeito gradual.', 2290], ['Ultraformer', 'Ultrassom microfocado para firmeza, sem cortes.', 1890]], 'tratamento-linhas.html'],
    ['Acne e poros', 'Oleosidade, espinhas ativas e cicatrizes, com acompanhamento a cada sessão.', .56, .66, [['Limpeza de pele profunda', 'Extração, alta frequência e máscara calmante.', 189], ['Laser de CO2 fracionado', 'Indicado para cicatrizes de acne; número de sessões definido na avaliação.', 990], ['Peeling de ácido salicílico', 'Para oleosidade e espinhas ativas.', 260]], 'tratamento-poros.html'],
    ['Viço e hidratação', 'Hidratação e cuidado com a barreira da pele, por dentro e por fora.', .38, .5, [['Skinbooster', 'Hidratação injetável aplicada pela médica.', 1290], ['Hydrafacial', 'Limpeza, esfoliação e sérum em 45 minutos.', 450], ['Drenagem facial', 'Massagem que desincha e relaxa, boa antes de eventos.', 160]], 'tratamento-vico.html'],
    ['Corpo', 'Gordura localizada, flacidez e celulite, com sessões que cabem no almoço.', .8, .83, [['Criolipólise', 'Resfriamento controlado para gordura localizada, com avaliação antes.', 790], ['Massagem modeladora', 'Pacote de 10 sessões, com drenagem.', 140], ['Radiofrequência corporal', 'Aquecimento da pele para flacidez e celulite.', 220]], 'tratamento-corpo.html']
  ];
  var PL = [['Glow 1', 199, 230, ['R$ 230 em créditos por mês', '20% de desconto no que passar', 'Agenda prioritária']], ['Glow 2', 389, 460, ['R$ 460 em créditos por mês', '20% de desconto no que passar', '1 drenagem de presente por mês', 'Agenda prioritária']], ['Glow Black', 790, 950, ['R$ 950 em créditos por mês', '25% de desconto no que passar', 'Consulta médica trimestral', 'Créditos acumulam por 3 meses']]];
  var CLUBE_PONTO = [.25, .44];
  var n2 = function (i) { return (i < 9 ? '0' : '') + (i + 1); };

  var dtCartoes = $('.dt-cartoes');
  if (dtCartoes) {
    var cartoes = OBJ.map(function (o, i) {
      return '<article class="cartao" id="obj-' + i + '" role="tabpanel"><h3><small>' + n2(i) + '</small>' + o[0] + '</h3><p>' + o[1] + '</p><p class="rot">Tratamentos · fora e dentro do clube</p><ul>' +
        o[4].map(function (t) { return '<li><span>' + t[0] + '<em>' + t[1] + '</em></span><b>' + real(t[2]) + '<small>' + real(t[2] * 0.8) + ' no clube</small></b></li>'; }).join('') +
        '</ul><a class="botao" href="' + o[5] + '">Ver o tratamento</a><a class="cartao-link" href="unidade.html" data-t="' + o[0] + '">Reservar avaliação</a></article>';
    });
    cartoes.push('<article class="cartao" id="obj-5" role="tabpanel"><h3><small>06</small>Clube <span translate="no">Glow</span></h3><p>Créditos todo mês para usar em qualquer tratamento acima, em qualquer unidade. Sem fidelidade.</p><p class="rot">Planos</p><ul>' +
      PL.map(function (p) { return '<li><span translate="no">' + p[0] + '<em>' + real(p[2]) + ' em créditos</em></span><b>' + real(p[1]) + '<small>por mês</small></b></li>'; }).join('') +
      '</ul><a class="botao" href="#clube">Comparar os planos</a></article>');
    dtCartoes.innerHTML = cartoes.join('');
    var pontosDados = OBJ.map(function (o) { return [o[2], o[3], o[0]]; }).concat([[CLUBE_PONTO[0], CLUBE_PONTO[1], 'Clube Glow']]);
    $('.dt-pontos').innerHTML = pontosDados.map(function (p, i) { return '<button class="dt-ponto" type="button" role="tab" aria-controls="obj-' + i + '" aria-selected="false" aria-label="' + n2(i) + ': ' + p[2] + '" data-o="' + i + '">' + n2(i) + '</button>'; }).join('');
    var largo = matchMedia('(min-width: 900px)');
    var escolher = function (i, rolar) {
      $$('.dt-ponto').forEach(function (b) { b.setAttribute('aria-selected', String(+b.dataset.o === i)); });
      $$('.cartao').forEach(function (c, k) { c.classList.toggle('ativo', k === i); });
      if (rolar && !largo.matches) $('#obj-' + i).scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'center' });
    };
    $('.dt-pontos').addEventListener('click', function (e) { var b = e.target.closest('[data-o]'); if (b) escolher(+b.dataset.o, true); });
    escolher(0, false);
    // posiciona os pontos e a faixa de texto sobre a foto (object-fit: cover)
    var palco = $('.dt-palco'), fundo = $('.dt-fundo');
    var posPontos = function () {
      var cw = palco.clientWidth, ch = palco.clientHeight, iw = 1400, ih = 2059;
      var op = getComputedStyle(fundo).objectPosition.split(' ').map(function (v) { return parseFloat(v) / 100; });
      var s = Math.max(cw / iw, ch / ih), w = iw * s, h = ih * s, ox = (cw - w) * op[0], oy = (ch - h) * (op[1] || .5);
      $$('.dt-ponto').forEach(function (b, i) { var p = pontosDados[i]; b.style.left = (ox + p[0] * w) + 'px'; b.style.top = (oy + p[1] * h) + 'px'; });
      palco.style.setProperty('--olho', (oy + .4 * h) + 'px');
    };
    posPontos();
    addEventListener('resize', posPontos);
  }

  /* ---------- clube: planos e economia ---------- */
  var planos = $('.planos');
  if (planos) {
    planos.innerHTML = PL.map(function (p, i) {
      return '<article class="plano rv' + (i === 1 ? ' dest' : '') + '">' + (i === 1 ? '<p class="tag">o mais escolhido</p>' : '') + '<h3><small>' + n2(i) + '</small><span translate="no">' + p[0] + '</span></h3><p class="p">' + real(p[1]) + '<small>/mês</small></p><p class="cred">' + real(p[2]) + ' em créditos todo mês</p><ul>' +
        p[3].map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul><a class="botao" href="#" data-wa="Olá, Glow! Quero assinar o ' + p[0] + ' (' + real(p[1]) + '/mês).">Assinar o ' + p[0] + '</a></article>';
    }).join('');
  }
  var g = $('#gasto');
  if (g) {
    var out = $('.econ output');
    var econ = function () {
      var v = +g.value; out.textContent = real(v);
      var melhor = PL.filter(function (p) { return p[2] <= v * 1.05; }).pop() || PL[0];
      var resto = Math.max(0, v - melhor[2]), novo = melhor[1] + resto * 0.8, eco = v - novo;
      $('.econ-res').innerHTML = eco > 0 ? 'Com o <b translate="no">' + melhor[0] + '</b> você pagaria ' + real(novo) + ' pelo mesmo tanto: <b>' + real(eco * 12) + ' a menos por ano</b>.' : 'Gastando ' + real(v) + ' por mês, o clube ainda não compensa. Compensa a partir de ' + real(PL[0][1] * 1.05) + '.';
    };
    g.addEventListener('input', econ); econ();
  }

  /* ---------- unidades (home e unidade.html) ---------- */
  var UN = [['Moema', 'Av. Ibirapuera, 2.120', '040'], ['Pinheiros', 'Rua dos Pinheiros, 870', '054'], ['Jardins', 'Rua Oscar Freire, 1.340', '014'], ['Vila Mariana', 'Rua Domingos de Morais, 2.780', '041'], ['Tatuapé', 'Rua Tuiuti, 2.010', '033'], ['Santana', 'Rua Voluntários da Pátria, 3.120', '020'], ['Morumbi', 'Av. Giovanni Gronchi, 5.600', '056'], ['Brooklin', 'Rua Joaquim Nabuco, 380', '045'], ['Perdizes', 'Rua Cardoso de Almeida, 1.150', '050'], ['Santo André', 'Av. Industrial, 600', '090'], ['Alphaville', 'Al. Rio Negro, 1.030', '064']];
  var sem = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var unQ = $('#un-q');
  if (unQ) {
    var trat = '';
    try { trat = new URLSearchParams(location.search).get('t') || ''; trat = trat.replace(/[^\wÀ-ÿ ]/g, '').slice(0, 40); } catch (e) {}
    var un = function () {
      var q = sem(unQ.value.trim()), d = q.replace(/\D/g, '');
      var l = UN.filter(function (u) { return !q || (d.length >= 2 ? u[2].indexOf(d.slice(0, 3)) === 0 || u[2].slice(0, 2) === d.slice(0, 2) : sem(u[0]).indexOf(q) > -1); });
      if (!l.length) l = UN.slice(0, 3);
      $('.un-lista').innerHTML = l.slice(0, 4).map(function (u) { return '<li><span><b>' + u[0] + '</b><small>' + u[1] + ' · seg a sáb, 8h às 21h</small></span><a href="#" data-wa="Olá, Glow! Quero reservar ' + (trat ? trat.toLowerCase() : 'uma avaliação') + ' na unidade ' + u[0] + '.">Reservar</a></li>'; }).join('');
    };
    unQ.addEventListener('input', un);
    document.addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b && $('#unidades')) { e.preventDefault(); trat = b.dataset.t; un(); $('#unidades').scrollIntoView({ behavior: calmo ? 'auto' : 'smooth' }); } });
    un();
  }

  /* ---------- perguntas: indique e ganhe ---------- */
  var indique = $('#indique');
  if (indique) {
    var abrirIndique = function () { if (location.hash === '#indique') indique.open = true; };
    addEventListener('hashchange', abrirIndique); abrirIndique();
    document.addEventListener('click', function (e) { if (e.target.closest('a[href="#indique"]')) indique.open = true; });
  }
  var ind = $('#ind');
  if (ind) {
    ind.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = ind.nome.value.trim().split(' ')[0]; if (n.length < 2) { $('.ind-res').textContent = 'Escreva seu primeiro nome.'; return; }
      var cod = sem(n).replace(/[^a-z]/g, '').toUpperCase().slice(0, 8) + (Date.now() % 900 + 100);
      $('.ind-res').innerHTML = 'Seu código: <code>' + cod + '</code> · mande para as amigas: <a href="#" data-wa="Oi! Use meu código ' + cod + ' na Glow e ganhe R$ 100 no primeiro tratamento.">compartilhar no WhatsApp</a>';
    });
  }

  /* ---------- linhas de mapeamento: pausar ---------- */
  var pausa = $('.sb-pausa');
  if (pausa) {
    pausa.addEventListener('click', function () {
      var p = pausa.getAttribute('aria-pressed') !== 'true';
      pausa.setAttribute('aria-pressed', String(p)); pausa.setAttribute('aria-label', p ? 'Retomar a animação das linhas' : 'Pausar a animação das linhas');
      $('.sob').classList.toggle('parado', p);
    });
    if (calmo) { pausa.setAttribute('aria-pressed', 'true'); $('.sob').classList.add('parado'); }
  }

  /* ---------- blog: filtro por tema ---------- */
  var filtro = $('.bl-filtro');
  if (filtro) {
    filtro.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-f]'); if (!b) return;
      $$('button', filtro).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      $$('.bl-card').forEach(function (c) { c.hidden = b.dataset.f !== 'todos' && c.dataset.tema !== b.dataset.f; });
    });
  }

  /* ---------- formulários que viram mensagem no WhatsApp ---------- */
  $$('form[data-assunto]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!f.reportValidity()) return;
      var linhas = $$('[name]', f).filter(function (c) { return c.value.trim(); }).map(function (c) {
        var rot = c.dataset.rot || (c.labels && c.labels[0] ? c.labels[0].textContent.replace('*', '').trim() : c.name);
        return '• ' + rot + ': ' + c.value.trim();
      });
      if (window.BR_WA) window.BR_WA('Olá, Glow! ' + f.dataset.assunto + '\n' + linhas.join('\n'));
      var ok = $('.form-ok', f); if (ok) ok.hidden = false;
    });
  });

  /* ---------- topo ---------- */
  var topo = $('.topo'), heroi = $('.heroi'), pgHeroi = $('.pg-heroi');
  function topoRolou() { topo.classList.toggle('rolou', scrollY > innerHeight * (heroi ? .6 : .3)); }

  /* ---------- entrada suave ---------- */
  if (!calmo && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    $$('.rv').forEach(function (el) { io.observe(el); });
  }

  /* ---------- seções presas guiadas pela rolagem ---------- */
  var h1 = $('.heroi h1'), rola = $('.h-rola'), frase = $('.h-frase'), hFoto = $('.h-foto');
  var linhas = $('.linhas'), trilho = $('.li-trilho');
  var arte = $('.arte'), fotos = $$('.ar-fotos img');
  var semfim = $('.semfim'), sfFixo = $('.sf-fixo');
  var pgFoto = pgHeroi ? $('img', pgHeroi) : null, pgTit = pgHeroi ? $('h1', pgHeroi) : null;
  function prog(el) { var r = el.getBoundingClientRect(), t = r.height - innerHeight; return t > 0 ? Math.min(1, Math.max(0, -r.top / t)) : 0; }
  var suave = function (x) { return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
  function quadro() {
    topoRolou();
    if (calmo) return;
    var vh = innerHeight, r;
    // abertura das páginas internas: foto desce devagar e o título desfoca ao sair
    if (pgFoto && scrollY < vh * 1.2) {
      var k = Math.min(1, scrollY / (vh * .8));
      pgFoto.style.transform = 'translateY(' + (scrollY * .25).toFixed(1) + 'px) scale(' + (1.04 + k * .06).toFixed(3) + ')';
      if (pgTit) { pgTit.style.filter = 'blur(' + (k * 10).toFixed(1) + 'px)'; pgTit.style.opacity = String(1 - k * .9); }
    }
    // abertura da home
    if (heroi && h1) {
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
    }
    // cartões correndo de lado
    if (linhas && trilho) {
      r = linhas.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) {
        var q = prog(linhas), falta = trilho.scrollWidth - innerWidth;
        trilho.style.transform = 'translateX(' + (-suave(q) * Math.max(0, falta)) + 'px)';
      }
    }
    // fotos passando por trás da frase
    if (arte) {
      r = arte.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) {
        var off = -r.top;
        fotos.forEach(function (f) { f.style.transform = 'translateY(' + (-off * (+f.dataset.v)) + 'px)'; });
      }
    }
    // foto que cresce
    if (semfim && sfFixo) {
      r = semfim.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) {
        var s = prog(semfim), c = suave(Math.min(1, s / .7)), w = innerWidth, h = sfFixo.clientHeight;
        var bw = Math.min(150, w * .36), bh = bw * 1.25;
        sfFixo.style.setProperty('--ci', ((h - bh) / 2 * (1 - c)).toFixed(1) + 'px');
        sfFixo.style.setProperty('--cl', ((w - bw) / 2 * (1 - c)).toFixed(1) + 'px');
        sfFixo.style.setProperty('--to', Math.min(1, Math.max(0, (s - .62) / .2)).toFixed(3));
      }
    }
  }
  var pedido = false;
  addEventListener('scroll', function () { if (!pedido) { pedido = true; requestAnimationFrame(function () { pedido = false; quadro(); }); } }, { passive: true });
  addEventListener('resize', quadro);
  quadro();
})();
