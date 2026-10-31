// Aurora Laser · topo que encolhe, textos que entram, palavras grandes que levam às áreas, vitrine de áreas com preço (arrastar e setas),
// pacote com desconto por sessões e combo, tom de pele → laser e sessões, fundo que vira areia no agendamento, flor fixa e formulário pelo WhatsApp.
// Páginas internas: filtro dos tratamentos (tipo de área e para quem, também pela URL) e fotos do tratamento trocadas pelas miniaturas.
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- dados (preço por sessão e minutos) ----------
  var A = {
    f: [['Axila', 89, 5], ['Virilha simples', 99, 10], ['Virilha completa', 159, 15], ['Buço', 59, 5], ['Rosto inteiro', 139, 15], ['Meia perna', 189, 25], ['Perna inteira', 329, 40], ['Braço inteiro', 199, 20], ['Linha alba', 59, 5], ['Glúteo', 129, 15]],
    m: [['Barba', 189, 20], ['Pescoço', 99, 10], ['Peito', 189, 20], ['Abdômen', 169, 20], ['Costas', 259, 30], ['Ombros', 119, 15], ['Axila', 89, 5], ['Braço inteiro', 219, 20], ['Perna inteira', 349, 40], ['Virilha', 149, 15]]
  };
  var SELO = { f0: 'Mais pedida', f2: 'Mais pedida', f6: 'Combo verão', m0: 'Mais pedida', m4: 'Costas lisas' };
  var SES = { 1: 0, 5: 0.2, 10: 0.4 };
  var TOM = [['muito clara', 'Alexandrite 755 nm', '6 a 8', 'Pelo escuro em pele muito clara costuma responder bem ao laser. Evite bronzear entre as sessões.'], ['clara', 'Alexandrite 755 nm', '6 a 8', 'Pele ideal para o laser. Evite bronzear entre as sessões.'], ['morena', 'Diodo 810 nm', '8 a 10', 'Ajustamos a energia para não manchar. Pode fazer o ano inteiro.'], ['morena escura', 'Nd:YAG 1064 nm', '8 a 12', 'O Nd:YAG passa pela pele sem aquecer a melanina dela.'], ['negra', 'Nd:YAG 1064 nm', '10 a 12', 'É o laser mais seguro para pele negra, com resfriamento contínuo. A técnica ajusta a energia a cada sessão.']];
  var g = 'f', sel = {}, tom = null, servico = '';

  // ---------- topo ----------
  var topo = $('.topo'), flor = $('.flor'), heroi = $('.heroi');
  function rolagem() {
    var y = scrollY;
    topo.classList.toggle('rolou', y > 40);
    flor.classList.toggle('ativa', y > (heroi ? heroi.offsetHeight : 520) * 0.7);
  }
  addEventListener('scroll', rolagem, { passive: true }); rolagem();

  var hamb = $('.hamb'), mc = $('.menu-cel');
  function menu(abrir) { hamb.setAttribute('aria-expanded', String(abrir)); mc.hidden = !abrir; document.body.style.overflow = abrir ? 'hidden' : ''; }
  hamb.addEventListener('click', function () { menu(mc.hidden); });
  mc.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !mc.hidden) { menu(false); hamb.focus(); } });

  // ---------- textos que entram ----------
  var alvos = $$('.ta, .ta-lado');
  if ('IntersectionObserver' in window && !calmo) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var d = +(e.target.dataset.atraso || 0);
        e.target.style.transitionDelay = (d ? d * 0.3 + 0.2 : 0) + 's';
        e.target.classList.add('visto'); io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    alvos.forEach(function (el, i) { if (el.classList.contains('ta-lado')) el.dataset.atraso = el.dataset.atraso || (i % 3) * 0.6; io.observe(el); });
  } else alvos.forEach(function (el) { el.classList.add('visto'); });

  // ---------- fundo areia no agendamento ----------
  var agendar = $('#agendar');
  if ('IntersectionObserver' in window && agendar) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { document.body.classList.toggle('na-areia', e.isIntersecting); }); }, { rootMargin: '-35% 0px -35% 0px' }).observe(agendar);
  }

  // ---------- vitrine (só na home) ----------
  var trilho = $('.trilho');
  var pacoteTxt = '';
  if (trilho) (function () {
  function vitrine() {
    trilho.innerHTML = A[g].map(function (a, i) {
      var k = g + i, on = !!sel[k];
      return '<button type="button" class="area" data-a="' + i + '" aria-pressed="' + on + '" aria-label="' + a[0] + ', ' + real(a[1]) + ' a sessão">' +
        '<span class="area-topo"><span class="area-n">' + String(i + 1).padStart(2, '0') + ' / ' + A[g].length + '</span>' +
        (SELO[k] ? '<span class="area-selo">' + SELO[k] + '</span>' : '') +
        '<span class="area-preco">' + real(a[1]) + '<small>por sessão · ' + a[2] + ' min<br>10 sessões: ' + real(a[1] * 10 * 0.6) + '</small></span>' +
        '<span class="area-bt">' + (on ? 'Tirar do pacote' : 'Pôr no pacote') + '</span></span>' +
        '<span class="area-pe"><span>' + a[0] + '</span><span>' + real(a[1]) + '</span></span></button>';
    }).join('');
  }
  trilho.addEventListener('click', function (e) {
    if (arrastou) return;
    var b = e.target.closest('[data-a]'); if (!b) return;
    var k = g + b.dataset.a; sel[k] = !sel[k];
    b.setAttribute('aria-pressed', String(!!sel[k])); $('.area-bt', b).textContent = sel[k] ? 'Tirar do pacote' : 'Pôr no pacote';
    conta();
  });
  function genero(novo) {
    g = novo; $$('[data-g]').forEach(function (x) { x.setAttribute('aria-selected', String(x.dataset.g === g)); });
    vitrine(); trilho.scrollLeft = 0; conta();
  }
  $('.corpo').addEventListener('click', function (e) { var b = e.target.closest('[data-g]'); if (b) genero(b.dataset.g); });
  $$('[data-ir]').forEach(function (b) { b.addEventListener('click', function () { trilho.scrollBy({ left: +b.dataset.ir * 347 * (innerWidth < 900 ? 1 : 2), behavior: calmo ? 'auto' : 'smooth' }); }); });
  // arrastar com o mouse
  var x0 = 0, s0 = 0, segurando = false, arrastou = false;
  trilho.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; segurando = true; arrastou = false; x0 = e.clientX; s0 = trilho.scrollLeft; });
  addEventListener('pointermove', function (e) { if (!segurando) return; var dx = e.clientX - x0; if (Math.abs(dx) > 6) { arrastou = true; trilho.classList.add('arrastando'); } if (arrastou) trilho.scrollLeft = s0 - dx; });
  addEventListener('pointerup', function () { if (!segurando) return; segurando = false; trilho.classList.remove('arrastando'); setTimeout(function () { arrastou = false; }, 0); });

  // ---------- conta do pacote ----------
  var nSacola = $('.sacola-n'), ultimoN = 0;
  function conta() {
    var esc = A[g].filter(function (a, i) { return sel[g + i]; }), s = +$('[name=s]:checked').value, d = SES[s];
    nSacola.textContent = esc.length;
    if (esc.length !== ultimoN) { nSacola.classList.remove('pulo'); void nSacola.offsetWidth; nSacola.classList.add('pulo'); ultimoN = esc.length; }
    var op = $('.op-pacote');
    if (!esc.length) {
      pacoteTxt = '';
      op.innerHTML = 'O pacote que montei<small>escolha as áreas acima</small>';
      $('.conta').innerHTML = '<p class="conta-vazia">Toque nas áreas para ver o preço.</p><p class="c-areas">O total aparece aqui na hora, já com o desconto do pacote.</p>';
      return;
    }
    var combo = esc.length >= 3 ? 0.1 : 0, porSessao = esc.reduce(function (t, a) { return t + a[1]; }, 0), cheio = porSessao * s, total = cheio * (1 - d) * (1 - combo);
    var min = esc.reduce(function (t, a) { return t + a[2]; }, 0), parc = Math.min(12, s * 2);
    var nomes = esc.map(function (a) { return a[0]; });
    pacoteTxt = s + (s > 1 ? ' sessões' : ' sessão') + ' de ' + nomes.join(', ').toLowerCase() + ' por ' + real(total);
    op.innerHTML = 'O pacote que montei<small>' + real(total) + '</small>';
    $('.conta').innerHTML = '<p class="c-areas">' + nomes.join(' · ') + '</p><p class="grande">' + real(total) + '</p>' +
      (d || combo ? '<p><s>' + real(cheio) + '</s> · economia de ' + real(cheio - total) + '</p>' : '') +
      '<ul><li>' + s + (s > 1 ? ' sessões' : ' sessão') + ', a cada 30 a 45 dias, ' + min + ' min cada</li><li>' + real(total / s) + ' por sessão' + (combo ? ', com 10% do combo' : '') + '</li><li>em até ' + parc + 'x de ' + real(total / parc) + ' sem juros</li></ul>' +
      '<a class="botao" href="#" data-wa="Olá, Aurora! Quero o pacote de ' + pacoteTxt + (tom !== null ? ' (pele ' + TOM[tom][0] + ')' : '') + '. Posso agendar a sessão de avaliação?">Agendar sessão de avaliação</a>';
  }
  $('.sess').addEventListener('change', conta);
  window.AURORA_CONTA = conta;

  // palavras grandes e cartões do celular: já escolhem as áreas
  $$('[data-pre]').forEach(function (a) {
    a.addEventListener('click', function () {
      var p = a.dataset.pre.split(':'), ng = p[0];
      p[1].split(',').forEach(function (i) { sel[ng + i] = true; });
      genero(ng);
      var alvo = trilho.children[+p[1].split(',')[0]];
      if (alvo) setTimeout(function () { trilho.scrollTo({ left: alvo.offsetLeft - trilho.offsetLeft - parseFloat(getComputedStyle(trilho).paddingLeft), behavior: calmo ? 'auto' : 'smooth' }); }, calmo ? 0 : 700);
    });
  });

  sel.f0 = sel.f2 = true; vitrine(); conta();
  })();

  // ---------- tom de pele ----------
  var tonsEl = $('.tons');
  if (tonsEl) tonsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]'); if (!b) return; tom = +b.dataset.t;
    $$('[data-t]').forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
    var t = TOM[tom];
    $('.tom-res').innerHTML = '<p>Pele <b>' + t[0] + '</b> · laser <b>' + t[1] + '</b> · <b>' + t[2] + '</b> sessões</p><p>' + t[3] + '</p>';
    if (window.AURORA_CONTA) window.AURORA_CONTA();
  });

  // ---------- lista de serviço do formulário ----------
  var eb = $('.escolha-bt'), el = $('.escolha-l');
  if (eb && el) (function () {
  function lista(abrir) { eb.setAttribute('aria-expanded', String(abrir)); el.hidden = !abrir; if (abrir) $('li', el).focus(); }
  eb.addEventListener('click', function () { lista(el.hidden); });
  function escolhe(li) {
    servico = li.dataset.v === 'pacote' ? (pacoteTxt ? 'pacote de ' + pacoteTxt : 'montar um pacote') : li.dataset.v;
    $('span', eb).textContent = li.firstChild.textContent + (li.dataset.v === 'pacote' && pacoteTxt ? ' · ' + li.querySelector('small').textContent : '');
    $$('li', el).forEach(function (x) { x.setAttribute('aria-selected', String(x === li)); });
    lista(false); eb.focus();
  }
  el.addEventListener('click', function (e) { var li = e.target.closest('li'); if (li) escolhe(li); });
  el.addEventListener('keydown', function (e) {
    var li = e.target.closest('li'); if (!li) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolhe(li); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); (li.nextElementSibling || li).focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (li.previousElementSibling || li).focus(); }
    else if (e.key === 'Escape') { lista(false); eb.focus(); }
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.escolha')) { eb.setAttribute('aria-expanded', 'false'); el.hidden = true; } });

  $('.form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, nome = f.nome.value.trim(), tel = f.tel.value.trim(), erro = '';
    f.nome.classList.toggle('erro', !nome); f.tel.classList.toggle('erro', tel.replace(/\D/g, '').length < 10);
    if (!nome) erro = 'Escreva seu nome.'; else if (tel.replace(/\D/g, '').length < 10) erro = 'Escreva o telefone com DDD.'; else if (!f.aceite.checked) erro = 'Marque o aceite do regulamento.';
    $('.f-erro').textContent = erro; if (erro) return;
    var txt = 'Olá, Aurora! Sou ' + (nome + ' ' + f.sobrenome.value.trim()).trim() + ', telefone ' + tel + (f.email.value.trim() ? ', e-mail ' + f.email.value.trim() : '') +
      '. Quero agendar a sessão de avaliação' + (servico && servico !== 'Sessão de avaliação' ? ' e saber sobre ' + (servico.indexOf('Clube') === 0 ? 'o ' : '') + servico.charAt(0).toLowerCase() + servico.slice(1) : '') + (tom !== null ? '. Minha pele é ' + TOM[tom][0] : '') + '.';
    if (window.BR_WA) window.BR_WA(txt.replace(/\s+/g, ' '));
  });

  })();

  // o link do regulamento abre o texto no rodapé
  document.addEventListener('click', function (e) { var a = e.target.closest('a[href="#regulamento"]'); if (a) { var d = document.getElementById('regulamento'); if (d) d.open = true; } });

  // ---------- tratamentos: filtro por tipo de área e para quem ----------
  var ff = $('[data-filtro]');
  if (ff) (function () {
    var itens = $$('.zb-grade .zb-item'), vazio = $('.zb-vazio'), num = $('[data-n]', ff), q = new URLSearchParams(location.search);
    ['tipo', 'para'].forEach(function (k) { if (q.get(k)) ff[k].value = q.get(k); });
    function filtra(url) {
      var tp = ff.tipo.value, pa = ff.para.value, n = 0;
      itens.forEach(function (li) {
        var ok = (!tp || li.dataset.regiao === tp) && (!pa || li.dataset.para.split(' ').indexOf(pa) > -1);
        li.hidden = !ok; if (ok) { n++; li.classList.add('visto'); }
      });
      num.textContent = n; num.parentNode.lastChild.textContent = n === 1 ? ' tratamento' : ' tratamentos';
      vazio.hidden = n > 0;
      if (url && history.replaceState) { var u = new URLSearchParams(); if (tp) u.set('tipo', tp); if (pa) u.set('para', pa); history.replaceState(null, '', location.pathname + (u.toString() ? '?' + u : '')); }
    }
    ff.addEventListener('change', function () { filtra(true); });
    ff.addEventListener('submit', function (e) { e.preventDefault(); });
    ff.addEventListener('reset', function () { setTimeout(function () { filtra(true); }, 0); });
    $$('[data-limpa]').forEach(function (b) { b.addEventListener('click', function () { ff.reset(); }); });
    filtra(false);
  })();

  // ---------- página do tratamento: miniaturas trocam a foto grande ----------
  var grande = $('.tr-grande img');
  if (grande) $$('.tr-mini').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.tr-mini').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      grande.classList.remove('troca'); void grande.offsetWidth;
      grande.src = b.dataset.src; grande.alt = b.dataset.alt; grande.width = +b.dataset.w; grande.height = +b.dataset.h;
      grande.classList.add('troca');
    });
  });
})();
