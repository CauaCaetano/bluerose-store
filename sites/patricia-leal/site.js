// Patrícia Leal · relógio de BH, menu lateral, logotipo que ocupa a largura, revelações na rolagem,
// lista de situações (foto que segue o cursor + resposta aberta), calculadora informativa de pensão e pedido de consulta.
(function () {
  'use strict';
  var doc = document, raiz = doc.documentElement;
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || doc).querySelectorAll(s)); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var toque = matchMedia('(hover: none)').matches;
  raiz.classList.add('js');

  // ---------- relógio de Belo Horizonte ----------
  var MES = ['JAN.', 'FEV.', 'MAR.', 'ABR.', 'MAIO', 'JUN.', 'JUL.', 'AGO.', 'SET.', 'OUT.', 'NOV.', 'DEZ.'];
  function hora() {
    var d = new Date(), t;
    try {
      var p = {}; new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric', hour12: false })
        .formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
      t = p.hour + 'H' + p.minute + ' ' + p.day + ' ' + MES[+p.month - 1];
    } catch (e) { t = d.getHours() + 'H' + String(d.getMinutes()).padStart(2, '0'); }
    $$('#hora, .hora2').forEach(function (el) { el.textContent = t + ' · BH'; });
  }
  hora(); setInterval(hora, 15000);

  // ---------- menu lateral ----------
  var menu = $('#menu'), bt = $('.menu-bt'), veu = doc.createElement('div');
  veu.className = 'veu'; doc.body.appendChild(veu);
  function abrir(sim) {
    if (sim) { menu.hidden = false; void menu.offsetWidth; }
    menu.classList.toggle('aberto', sim); veu.classList.toggle('on', sim);
    bt.setAttribute('aria-expanded', String(sim));
    if (sim) { setTimeout(function () { $('.menu-nav a', menu).focus(); }, 60); }
    else { setTimeout(function () { if (!menu.classList.contains('aberto')) menu.hidden = true; }, calmo ? 0 : 700); bt.focus({ preventScroll: true }); }
  }
  bt.addEventListener('click', function () { abrir(true); });
  $('.menu-fecha').addEventListener('click', function () { abrir(false); });
  veu.addEventListener('click', function () { abrir(false); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) abrir(false); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('aberto')) abrir(false); });

  // ---------- logotipo do tamanho da largura ----------
  function ajustaLogo() {
    $$('.logo').forEach(function (lg) {
      var cx = lg.parentNode, larg = cx.clientWidth - parseFloat(getComputedStyle(cx).paddingLeft) - parseFloat(getComputedStyle(cx).paddingRight);
      lg.style.setProperty('--logo-fs', '100px');
      var w = lg.scrollWidth; if (!w) return;
      var fs = Math.floor(100 * larg / w * 0.995);
      lg.style.setProperty('--logo-fs', fs + 'px');
      if (lg.closest('.abre')) cx.style.setProperty('--logo-h', Math.round(fs * 0.8) + 'px');
    });
  }
  ajustaLogo();
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(ajustaLogo);
  addEventListener('resize', ajustaLogo);
  requestAnimationFrame(function () { setTimeout(function () { raiz.classList.add('pronto'); }, 120); });

  // ---------- títulos: palavras sobem por trás de uma máscara ----------
  $$('.titulo').forEach(function (h) {
    var i = 0;
    (function quebra(no) {
      [].slice.call(no.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = doc.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (pal) {
            if (!pal) return;
            if (/^\s+$/.test(pal)) { frag.appendChild(doc.createTextNode(' ')); return; }
            var a = doc.createElement('span'), b = doc.createElement('span');
            a.className = 'pl'; b.textContent = pal; b.style.setProperty('--i', i++); a.appendChild(b); frag.appendChild(a);
          });
          no.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') quebra(n);
      });
    })(h);
  });
  var alvos = $$('.titulo, .linha');
  if ('IntersectionObserver' in window && !calmo) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    alvos.forEach(function (a) { io.observe(a); });
  } else alvos.forEach(function (a) { a.classList.add('visto'); });

  // ---------- foto que segue o cursor sobre as listas ----------
  var segue = $('.segue'), simg = segue ? $('img', segue) : null, mx = 0, my = 0, sx = 0, sy = 0, ativo = null, rodando = false;
  function passo() {
    sx += (mx - sx) * (calmo ? 1 : 0.16); sy += (my - sy) * (calmo ? 1 : 0.16);
    segue.style.transform = 'translate3d(' + (sx - segue.offsetWidth * 0.5) + 'px,' + (sy - segue.offsetHeight * 0.55) + 'px,0)';
    if (ativo || Math.abs(mx - sx) > 0.5) requestAnimationFrame(passo); else rodando = false;
  }
  if (!toque && segue) {
    $$('.lista .item[data-foto]').forEach(function (it) {
      var src = it.dataset.foto; if (src) { var pre = new Image(); pre.src = src; }
      it.addEventListener('mouseenter', function (e) {
        if (!ativo) { sx = mx = e.clientX; sy = my = e.clientY; }
        ativo = it; simg.src = it.dataset.foto; segue.classList.add('on');
        if (!rodando) { rodando = true; requestAnimationFrame(passo); }
      });
      it.addEventListener('mouseleave', function () { if (ativo === it) { ativo = null; segue.classList.remove('on'); } });
      it.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; if (!rodando) { rodando = true; requestAnimationFrame(passo); } });
    });
    // a foto some quando a resposta aberta está sob o cursor, para não cobrir o texto
    $$('.item-corpo').forEach(function (c) {
      c.addEventListener('mouseenter', function () { segue.classList.remove('on'); });
      c.addEventListener('mouseleave', function () { if (ativo) segue.classList.add('on'); });
    });
  }

  // ---------- listas que abrem (situações, perguntas): uma resposta aberta por vez ----------
  $$('.lista-ab button.item-bt').forEach(function (b) {
    var corpo = doc.getElementById(b.getAttribute('aria-controls')), it = b.closest('.item'), lista = b.closest('.lista-ab');
    var f = null;
    if (it.dataset.foto) { f = doc.createElement('img'); f.className = 'foto-cel'; f.alt = it.dataset.alt || ''; f.loading = 'lazy'; f.dataset.src = it.dataset.foto; corpo.insertBefore(f, $('.texto', corpo)); }
    b.addEventListener('click', function () {
      var abrir = b.getAttribute('aria-expanded') !== 'true';
      $$('button.item-bt', lista).forEach(function (o) {
        if (o !== b && o.getAttribute('aria-expanded') === 'true') { o.setAttribute('aria-expanded', 'false'); doc.getElementById(o.getAttribute('aria-controls')).hidden = true; }
      });
      b.setAttribute('aria-expanded', String(abrir)); corpo.hidden = !abrir;
      if (abrir) {
        if (f && !f.src) f.src = f.dataset.src;
        corpo.classList.remove('abrindo'); void corpo.offsetWidth; corpo.classList.add('abrindo');
        if (segue) segue.classList.remove('on');
        var r = b.getBoundingClientRect(); if (r.top < 0 || r.top > innerHeight * 0.6) b.scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });

  // botões "Marcar" escolhem o assunto no formulário
  var cons = $('#cons');
  function poeAssunto(txt) { if (!cons || !cons.assunto) return; [].forEach.call(cons.assunto.options, function (o) { if (o.text === txt) cons.assunto.value = o.value; }); }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest('[data-assunto]'); if (b) poeAssunto(b.dataset.assunto);
  });
  // contato.html?assunto=Pensão já chega com o assunto escolhido
  try { var qa = new URLSearchParams(location.search).get('assunto'); if (qa) poeAssunto(qa); } catch (e) {}

  // ---------- calculadora informativa de pensão ----------
  // faixa comum nos tribunais: 1 filho 15–20%, 2 filhos 20–25%, 3 filhos 25–30%, 4 filhos 28–33% da renda líquida
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var p = $('#pens'), res = $('.pn-res');
  if (p && res) (function () {
  function pc() {
    var r = +p.r.value, f = +p.f.value, base = [0, 15, 20, 25, 28][f], topo = base + 5, fl = f + (f > 1 ? ' filhos' : ' filho');
    p.r.previousElementSibling.textContent = real(r); p.f.previousElementSibling.textContent = fl;
    $('.pn-cab', res).textContent = 'Faixa comum para ' + fl + ', por mês';
    $('.faixa', res).textContent = real(r * base / 100) + ' a ' + real(r * topo / 100);
    var t = '<p>' + base + '% a ' + topo + '% da renda líquida, descontados em folha quando há emprego formal.</p>';
    if (p.inf.checked) t += '<p>Sem carteira assinada, o juiz costuma fixar em salários mínimos: entre <b>' + (f * 0.3 + 0.2).toFixed(1).replace('.', ',') + ' e ' + (f * 0.4 + 0.3).toFixed(1).replace('.', ',') + ' salários</b>, conforme o padrão de vida que se consegue provar.</p>';
    $('.pn-txt', res).innerHTML = t;
  }
  p.addEventListener('input', pc); p.addEventListener('submit', function (e) { e.preventDefault(); }); pc();
  })();

  // ---------- pedido de consulta ----------
  if (cons) cons.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = cons.nome.value.trim(), t = cons.tel.value.replace(/\D/g, ''), er = $('.erro', cons);
    er.textContent = n.length < 2 ? 'Escreva seu nome.' : t.length < 10 ? 'Confira o WhatsApp com DDD.' : '';
    if (er.textContent) { (n.length < 2 ? cons.nome : cons.tel).focus(); return; }
    var assunto = cons.assunto.value.toLowerCase();
    if (window.BR_WA) window.BR_WA('Olá, Dra. Patrícia! Sou ' + n + ' e quero marcar a consulta online sobre ' + assunto + '.');
    var ok = doc.createElement('p'); ok.className = 'cons-ok'; ok.setAttribute('role', 'status');
    ok.textContent = 'Obrigada, ' + n.split(' ')[0] + '. A resposta com os horários livres para falar sobre ' + assunto + ' chega hoje no seu WhatsApp.';
    cons.innerHTML = ''; cons.appendChild(ok);
  });
})();
