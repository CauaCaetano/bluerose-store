// Patrícia Leal · relógio, menu lateral, logotipo que ocupa a largura, revelações na rolagem,
// lista de situações (foto que segue o cursor + resposta aberta), pedido de horário (formulário curto que monta a mensagem do WhatsApp).
(function () {
  'use strict';
  var doc = document, raiz = doc.documentElement;
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || doc).querySelectorAll(s)); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var toque = matchMedia('(hover: none)').matches;
  raiz.classList.add('js');

  // ---------- relógio ----------
  var MES = ['JAN.', 'FEV.', 'MAR.', 'ABR.', 'MAIO', 'JUN.', 'JUL.', 'AGO.', 'SET.', 'OUT.', 'NOV.', 'DEZ.'];
  function hora() {
    var d = new Date(), t;
    try {
      var p = {}; new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric', hour12: false })
        .formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
      t = p.hour + 'H' + p.minute + ' ' + p.day + ' ' + MES[+p.month - 1];
    } catch (e) { t = d.getHours() + 'H' + String(d.getMinutes()).padStart(2, '0'); }
    $$('#hora, .hora2').forEach(function (el) { el.textContent = t + ' · Curitiba'; });
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

  // ---------- pedido de horário: nome, assunto e melhor período montam a mensagem do WhatsApp ----------
  var ASSUNTOS = ['Divórcio', 'Pensão', 'Guarda', 'Inventário', 'Outro assunto de família'];
  function msgHorario(nome, assunto, periodo) {
    return 'Olá, Dra. Patrícia! Sou ' + nome + ' e quero pedir um horário para conversar sobre ' + assunto.toLowerCase() + '. Melhor período para mim: ' + periodo + '.';
  }
  function enviaHorario(f) {
    var n = f.nome.value.trim(), er = $('.erro', f);
    er.textContent = n.length < 2 ? 'Escreva seu nome.' : '';
    if (er.textContent) { f.nome.focus(); return false; }
    if (window.BR_WA) window.BR_WA(msgHorario(n, f.assunto.value, f.periodo.value));
    return n;
  }
  if (cons) cons.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = enviaHorario(cons); if (!n) return;
    var ok = doc.createElement('p'); ok.className = 'cons-ok'; ok.setAttribute('role', 'status');
    ok.textContent = 'Pronto, ' + n.split(' ')[0] + '. A mensagem com o seu pedido abriu no WhatsApp: é só enviar por lá. Os horários livres são combinados na resposta.';
    cons.innerHTML = ''; cons.appendChild(ok);
  });

  // os botões "Pedir horário" abrem o formulário curto numa janela, sem sair da página
  var dlg = null;
  function montaDialogo() {
    dlg = doc.createElement('dialog');
    dlg.className = 'horario'; dlg.setAttribute('aria-labelledby', 'hr-t');
    dlg.innerHTML = '<form class="hr-form" novalidate>' +
      '<div class="hr-topo"><p class="rotulo">Consulta de 50 minutos · por vídeo ou no escritório</p><button type="button" class="menu-fecha hr-fecha">Fechar [×]</button></div>' +
      '<h2 id="hr-t" class="hr-tit">Pedir horário</h2>' +
      '<label><span class="rotulo">Seu nome</span><input name="nome" autocomplete="name"></label>' +
      '<label><span class="rotulo">Assunto</span><select name="assunto">' + ASSUNTOS.map(function (a) { return '<option>' + a + '</option>'; }).join('') + '</select></label>' +
      '<fieldset><legend class="rotulo">Melhor período</legend><div class="hr-per">' +
      [['de manhã, das 9h às 12h', 'Manhã'], ['à tarde, das 13h às 17h', 'Tarde'], ['no fim do dia, das 17h às 18h', 'Fim do dia'], ['qualquer período', 'Tanto faz']].map(function (p, i) {
        return '<label><input type="radio" name="periodo" value="' + p[0] + '"' + (i === 0 ? ' checked' : '') + '><span>' + p[1] + '</span></label>';
      }).join('') + '</div></fieldset>' +
      '<p class="erro" aria-live="polite"></p>' +
      '<div class="hr-pe"><p class="hr-nota">A mensagem abre pronta no WhatsApp para você enviar. Não precisa contar o caso por aqui.</p><button class="circulo hr-bt" type="submit">Montar mensagem</button></div>' +
      '</form>';
    doc.body.appendChild(dlg);
    var f = $('form', dlg);
    $('.hr-fecha', dlg).addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    f.addEventListener('submit', function (e) { e.preventDefault(); if (enviaHorario(f)) dlg.close(); });
  }
  function abreHorario(assunto) {
    if (!dlg) montaDialogo();
    var f = $('form', dlg);
    if (assunto) [].forEach.call(f.assunto.options, function (o) { if (o.text === assunto) f.assunto.value = o.value; });
    $('.erro', f).textContent = '';
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    setTimeout(function () { f.nome.focus(); }, 30);
  }
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a || !/^Pedir horário/.test(a.textContent.trim())) return;
    e.preventDefault();
    var as = a.dataset.assunto || null;
    if (!as) { try { as = new URL(a.href, location.href).searchParams.get('assunto'); } catch (er) {} }
    if (!as) { var pg = (location.pathname.match(/area-(\w+)/) || [])[1]; as = { divorcio: 'Divórcio', pensao: 'Pensão', guarda: 'Guarda', inventario: 'Inventário' }[pg] || null; }
    abreHorario(as);
  }, true);
})();
