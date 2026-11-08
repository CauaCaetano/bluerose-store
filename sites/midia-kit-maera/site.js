// Maëra Beauty · mídia kit: menu, revelação ao rolar, faixas de público, modo criadora (dado real do Insights),
// Swatch Studio, filtro do Content Lab, "Consultar disponibilidade" que marca o formato no formulário e contato
// que valida e monta a mensagem de WhatsApp (simulação da moldura da Blue Rose).
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var MARCA = (document.body.getAttribute('data-marca') || 'Maëra Beauty');
  var guardar = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var ler = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var limpa = function (v, n) { return String(v || '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 80); };
  var semMovimento = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- menu do celular ----------
  var menu = $('#menu'), abre = $('.abre-menu');
  abre.addEventListener('click', function () {
    var aberto = menu.classList.toggle('aberto');
    abre.setAttribute('aria-expanded', String(aberto));
    abre.textContent = aberto ? 'Fechar' : 'Índice';
  });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a') && menu.classList.contains('aberto')) { menu.classList.remove('aberto'); abre.setAttribute('aria-expanded', 'false'); abre.textContent = 'Índice'; }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('aberto')) { abre.click(); abre.focus(); } });

  // seção atual marcada no menu
  var links = $$('.menu a');
  if ('IntersectionObserver' in window) {
    var obsMenu = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        if (!en.target.id) return;
        var marcado = en.target.id === 'performance' ? 'numeros' : en.target.id === 'cases' ? 'colabs' : en.target.id;
        links.forEach(function (a) { a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + marcado)); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section').forEach(function (s) { obsMenu.observe(s); });
  }

  // ---------- revelação: só o que ainda está abaixo da tela ----------
  var faixas = $('.faixas');
  $$('.faixas li').forEach(function (li) {
    var min = Number(li.dataset.min), max = Number(li.dataset.max), t = $('.f-trilho i', li);
    t.style.setProperty('--min', min + '%'); t.style.setProperty('--larg', (max - min) + '%');
  });
  if ('IntersectionObserver' in window && !semMovimento) {
    var alturaTela = window.innerHeight;
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.remove('rv-espera');
        if (en.target === faixas) faixas.classList.add('cheio');
        obs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    $$('.rv').forEach(function (el, i) {
      if (el.getBoundingClientRect().top > alturaTela) { el.classList.add('rv-espera'); el.style.transitionDelay = (i % 4) * 90 + 'ms'; obs.observe(el); }
    });
    obs.observe(faixas);
  } else faixas.classList.add('cheio');

  // ---------- modo criadora: o dado real do Insights entra no card ----------
  var modo = $('[data-modo]');
  function mostrarCampos() { $$('.campo-dado').forEach(function (c) { c.hidden = !modo.checked; }); }
  $$('.perf').forEach(function (card) {
    var id = card.dataset.perf, ent = $('[data-entrada]', card), sai = $('[data-saida]', card);
    var salvo = ler('maera-perf-' + id);
    function pinta(v) { v = limpa(v, 18); sai.textContent = v || 'a preencher'; sai.classList.toggle('cheio', !!v); }
    if (salvo) { ent.value = salvo; pinta(salvo); }
    ent.addEventListener('input', function () { pinta(ent.value); guardar('maera-perf-' + id, limpa(ent.value, 18)); });
  });
  modo.addEventListener('change', function () { mostrarCampos(); if (modo.checked) $('[data-entrada]').focus(); });
  mostrarCampos();

  // ---------- Swatch Studio ----------
  var CORES = [
    ['nude', 'Nude', '#c49a84', 'Nude que não some em pele média e retinta. Bom para o dia a dia e para foto de produto.'],
    ['rosewood', 'Rosewood', '#8e5a55', 'Rosado amarronzado, a cor-assinatura do perfil. Funciona em quase todos os tons de pele.'],
    ['terracota', 'Terracota', '#b4613f', 'Laranja queimado para o verão e para looks com bronzer.'],
    ['berry', 'Berry', '#7a2d48', 'Frutas vermelhas escuras, para a noite e para o outono.'],
    ['caramelo', 'Caramelo', '#a8703f', 'Dourado quente, ótimo em blush e como base de sombra.'],
    ['burgundy', 'Burgundy', '#5c1e2a', 'Vinho fechado, o clássico de fim de ano.']
  ];
  var TEXTURAS = [
    ['batom', 'Batom', 'Batom cremoso', 'Cobertura alta e acabamento acetinado. O swatch mostra a cor real em uma passada.', 'Lip stories: swatch, aplicação e 8 horas depois'],
    ['gloss', 'Gloss', 'Gloss', 'Brilho espelhado e cor translúcida. A luz natural mostra o reflexo sem parecer melado.', 'Reel de close-up: o brilho na luz da janela'],
    ['base', 'Base', 'Base', 'Na base, a cor vira subtom. O teste mostra cobertura no antebraço e no rosto.', 'Teste de cobertura: antes, depois e fim do dia'],
    ['blush', 'Blush', 'Blush', 'Cor difusa, esfumada com pincel. Mostra quanto produto basta para a pele não ficar manchada.', 'Tutorial rápido: três jeitos de aplicar']
  ];
  var cor = 'rosewood', tex = 'batom';
  var svg = $('.sw-svg'), palco = $('.sw-palco'), peles = $('.sw-peles');
  $('.sw-cores').innerHTML = CORES.map(function (c) { return '<button type="button" class="sw-cor-b" role="radio" aria-checked="false" data-cor="' + c[0] + '"><i style="--c:' + c[2] + '"></i>' + c[1] + '</button>'; }).join('');
  $('.sw-texturas').innerHTML = TEXTURAS.map(function (t) { return '<button type="button" class="sw-tex-b" role="radio" aria-checked="false" data-tex="' + t[0] + '">' + t[1] + '</button>'; }).join('');
  // na base, a cor vira subtom: mistura com um tom de pele
  function mistura(hex, pele, p) {
    var a = [1, 3, 5].map(function (i) { return parseInt(hex.substr(i, 2), 16); }), b = [1, 3, 5].map(function (i) { return parseInt(pele.substr(i, 2), 16); });
    return '#' + a.map(function (v, i) { return ('0' + Math.round(v * p + b[i] * (1 - p)).toString(16)).slice(-2); }).join('');
  }
  function pintarSwatch(animar) {
    var c = CORES.filter(function (x) { return x[0] === cor; })[0], t = TEXTURAS.filter(function (x) { return x[0] === tex; })[0];
    var tom = tex === 'base' ? mistura(c[2], '#d9b49a', .35) : c[2];
    palco.style.setProperty('--sw', tom);
    svg.setAttribute('data-tex', tex); peles.setAttribute('data-tex', tex);
    $$('.sw-cor-b').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.cor === cor)); });
    $$('.sw-tex-b').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.tex === tex)); });
    $('[data-sw-nome]').textContent = c[1]; $('[data-sw-tex]').textContent = t[2]; $('[data-sw-hex]').textContent = tom.toUpperCase();
    $('[data-sw-sobre]').textContent = c[1] + ': ' + c[3];
    $('[data-sw-texto]').textContent = t[3];
    $('[data-sw-formato]').textContent = t[4];
    $('[data-sw-pedir]').setAttribute('data-wa', 'Olá, ' + MARCA + '! Quero uma campanha com a cor ' + c[1] + ' na textura ' + t[2].toLowerCase() + '. Formato sugerido no mídia kit: ' + t[4] + '.');
    if (animar && !semMovimento) { svg.classList.remove('risca'); void svg.getBoundingClientRect(); svg.classList.add('risca'); }
  }
  $('.sw-cores').addEventListener('click', function (e) { var b = e.target.closest('[data-cor]'); if (b && b.dataset.cor !== cor) { cor = b.dataset.cor; pintarSwatch(true); } });
  $('.sw-texturas').addEventListener('click', function (e) { var b = e.target.closest('[data-tex]'); if (b && b.dataset.tex !== tex) { tex = b.dataset.tex; pintarSwatch(true); } });
  // setas do teclado dentro de cada grupo de opções
  $$('.sw-cores, .sw-texturas').forEach(function (g) {
    g.addEventListener('keydown', function (e) {
      if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].indexOf(e.key) < 0) return;
      e.preventDefault();
      var bs = $$('button', g), i = bs.indexOf(document.activeElement), d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
      var n = bs[(i + d + bs.length) % bs.length]; n.focus(); n.click();
    });
  });
  pintarSwatch(false);

  // ---------- Content Lab: filtro ----------
  var pecas = $$('.peca'), conta = $('[data-lab-conta]');
  $('.filtros').addEventListener('click', function (e) {
    var b = e.target.closest('[data-filtro]'); if (!b) return;
    var f = b.dataset.filtro, n = 0;
    $$('.filtro').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    pecas.forEach(function (p) { var ok = f === 'todos' || p.dataset.cat === f; p.hidden = !ok; if (ok) n++; });
    conta.textContent = f === 'todos' ? 'Mostrando 12 formatos' : 'Mostrando ' + n + ' formatos de ' + b.firstChild.textContent.trim();
  });

  // ---------- contato ----------
  var FORMATOS = ['Tutorial patrocinado', 'Resenha com teste de 14 dias', 'Swatch Stories', 'Lançamento editorial', 'Série de skincare', 'Tutorial ao vivo', 'Conteúdo para a marca usar', 'Embaixadora'];
  var caixaF = $('[data-formatos]');
  caixaF.innerHTML = FORMATOS.map(function (f, i) { return '<label><input type="checkbox" name="formato" value="' + f + '" id="fmt-' + i + '"> ' + f + '</label>'; }).join('');
  var meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'], hoje = new Date();
  $('[data-meses]').innerHTML = '<option value="A combinar">A combinar</option>' + [1, 2, 3, 4, 5].map(function (k) { var d = new Date(hoje.getFullYear(), hoje.getMonth() + k, 1), v = meses[d.getMonth()] + ' de ' + d.getFullYear(); return '<option value="' + v + '">' + v.charAt(0).toUpperCase() + v.slice(1) + '</option>'; }).join('');

  // "Consultar disponibilidade" nos cards: marca o formato e leva ao formulário
  $$('[data-consultar]').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.dataset.consultar, c = $$('input[name="formato"]', caixaF).filter(function (x) { return x.value === f; })[0];
      if (c) c.checked = true;
      erro('formatos', '');
      $('#contato').scrollIntoView({ behavior: semMovimento ? 'auto' : 'smooth', block: 'start' });
      caixaF.classList.remove('realce'); void caixaF.offsetWidth; caixaF.classList.add('realce');
      setTimeout(function () { $('#f-nome').focus({ preventScroll: true }); }, semMovimento ? 0 : 700);
    });
  });

  var form = $('.ct-form');
  function erro(campo, msg) {
    var s = $('[data-erro="' + campo + '"]', form); if (s) s.textContent = msg;
    var el = form.elements[campo]; if (el && el.setAttribute) { if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); }
  }
  // máscara simples de telefone
  $('#f-wa').addEventListener('input', function (e) {
    var d = e.target.value.replace(/\D/g, '').slice(0, 11), v = d;
    if (d.length > 2) v = '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length > 7) v = '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4);
    e.target.value = v;
  });
  ['nome', 'marca', 'email', 'whatsapp'].forEach(function (n) { form.elements[n].addEventListener('input', function () { erro(n, ''); }); });
  caixaF.addEventListener('change', function () { erro('formatos', ''); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var el = form.elements, primeiro = null;
    var nome = limpa(el.nome.value, 60), marca = limpa(el.marca.value, 60), email = limpa(el.email.value, 80), wa = el.whatsapp.value.replace(/\D/g, '');
    var fmts = $$('input[name="formato"]:checked', caixaF).map(function (c) { return c.value; });
    var falhas = [
      ['nome', nome.length < 2 ? 'Escreva o seu nome.' : ''],
      ['marca', marca.length < 2 ? 'Escreva o nome da marca ou empresa.' : ''],
      ['email', !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) ? 'Confira o e-mail (ex.: nome@marca.com.br).' : ''],
      ['whatsapp', (wa.length < 10 || wa.length > 11) ? 'Escreva o WhatsApp com DDD.' : ''],
      ['formatos', fmts.length ? '' : 'Escolha pelo menos um formato.']
    ];
    falhas.forEach(function (f) { erro(f[0], f[1]); if (f[1] && !primeiro) primeiro = f[0]; });
    if (primeiro) {
      var alvo = primeiro === 'formatos' ? $('input[name="formato"]', caixaF) : el[primeiro];
      alvo.focus(); return;
    }
    var msg = 'Olá, ' + MARCA + '! Vi o seu mídia kit e quero consultar a disponibilidade.\n' +
      '• Nome: ' + nome + '\n' +
      '• Marca: ' + marca + '\n' +
      '• E-mail: ' + email + '\n' +
      '• WhatsApp: ' + el.whatsapp.value + '\n' +
      '• Formatos: ' + fmts.join(', ') + '\n' +
      '• Produto: ' + el.categoria.value + '\n' +
      '• Período: ' + el.periodo.value +
      (limpa(el.mensagem.value, 400) ? '\n• Sobre o produto: ' + limpa(el.mensagem.value, 400) : '');
    if (window.BR_WA) window.BR_WA(msg);
  });

  // ---------- salvar em PDF ----------
  $$('[data-imprimir]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });
})();
