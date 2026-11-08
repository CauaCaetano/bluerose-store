// Patrícia Leal · relógio, menu lateral, logotipo que ocupa a largura, revelações na rolagem,
// lista de situações (resposta aberta com foto), pedido de horário (formulário curto que monta a mensagem do WhatsApp).
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

  // títulos sem animação de entrada (regra do dono): só as linhas e os textos aparecem na rolagem
  var alvos = $$('.linha');
  if ('IntersectionObserver' in window && !calmo) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    alvos.forEach(function (a) { io.observe(a); });
  } else alvos.forEach(function (a) { a.classList.add('visto'); });

  // (08/11) sem foto que segue o cursor: a foto de cada situação aparece dentro da resposta aberta
  var segue = null;

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

  // ---------- agendar conversa: painel lateral verde em três passos (assunto, quando, contato) e confirmação ----------
  // Demonstração: nada é enviado. Num site real, o pedido chega no WhatsApp e no e-mail do escritório.
  var pn = null, pveu = null, pp = 1, pvolta = null;
  var PSEM = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'], PMES = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
  var pesc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function pdias(n) { var r = [], d = new Date(); d.setHours(12); while (r.length < n) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) r.push(new Date(d)); } return r; }
  function pmonta() {
    pveu = doc.createElement('div'); pveu.className = 'pn-veu'; pveu.hidden = true;
    pn = doc.createElement('aside'); pn.className = 'pn'; pn.hidden = true;
    pn.setAttribute('role', 'dialog'); pn.setAttribute('aria-modal', 'true'); pn.setAttribute('aria-labelledby', 'pn-t');
    pn.innerHTML =
      '<div class="pn-topo"><p class="rotulo pn-n" aria-live="polite">1 / 3</p><button type="button" class="menu-fecha pn-x">Fechar [×]</button></div>' +
      '<h2 id="pn-t" class="pn-tit">Agendar conversa</h2>' +
      '<form class="pn-f" novalidate>' +
      '<fieldset class="pn-et" data-p="1"><legend class="rotulo">Assunto</legend><div class="pn-lista">' +
      ASSUNTOS.map(function (a, i) { return '<label><input type="radio" name="assunto" value="' + a + '"' + (i ? '' : ' checked') + '><span>' + a + '</span></label>'; }).join('') + '</div></fieldset>' +
      '<fieldset class="pn-et" data-p="2" hidden><legend class="rotulo">Quando</legend><div class="pn-dias">' +
      pdias(5).map(function (d, i) { var v = PSEM[d.getDay()] + ' ' + d.getDate() + ' ' + PMES[d.getMonth()]; return '<label><input type="radio" name="dia" value="' + v + '"' + (i ? '' : ' checked') + '><span><small>' + PSEM[d.getDay()] + '</small>' + d.getDate() + '</span></label>'; }).join('') + '</div>' +
      '<p class="rotulo pn-sub">Período</p><div class="pn-pilulas">' + [['de manhã', 'Manhã'], ['à tarde', 'Tarde'], ['no fim do dia', 'Fim do dia']].map(function (x, i) { return '<label><input type="radio" name="periodo" value="' + x[0] + '"' + (i ? '' : ' checked') + '><span>' + x[1] + '</span></label>'; }).join('') + '</div>' +
      '<p class="rotulo pn-sub">Formato</p><div class="pn-pilulas">' + [['por vídeo', 'Por vídeo'], ['no escritório, em Curitiba', 'No escritório']].map(function (x, i) { return '<label><input type="radio" name="formato" value="' + x[0] + '"' + (i ? '' : ' checked') + '><span>' + x[1] + '</span></label>'; }).join('') + '</div></fieldset>' +
      '<fieldset class="pn-et" data-p="3" hidden><legend class="rotulo">Contato</legend>' +
      '<label class="pn-c"><span class="rotulo">Seu nome</span><input name="nome" autocomplete="name"></label>' +
      '<label class="pn-c"><span class="rotulo">WhatsApp com DDD</span><input name="tel" inputmode="tel" autocomplete="tel"></label>' +
      '<label class="pn-ck"><input type="checkbox" name="priv"><span>Li a <a href="privacidade.html">política de privacidade</a> e concordo com o uso destes dados para o retorno.</span></label>' +
      '<p class="pn-nota">Não precisa contar o caso por aqui: isso fica para a conversa, com sigilo.</p></fieldset>' +
      '<p class="erro pn-erro" aria-live="polite"></p>' +
      '<div class="pn-pe"><button type="button" class="menu-fecha pn-volta" hidden>← Voltar</button><button type="submit" class="pn-segue">Continuar</button></div>' +
      '</form><div class="pn-ok" hidden tabindex="-1"></div>';
    doc.body.appendChild(pveu); doc.body.appendChild(pn);
    var f = $('.pn-f', pn);
    $('.pn-x', pn).addEventListener('click', pfecha); pveu.addEventListener('click', pfecha);
    $('.pn-volta', pn).addEventListener('click', function () { pvai(pp - 1); });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var er = $('.pn-erro', pn); er.textContent = '';
      if (pp < 3) { pvai(pp + 1); return; }
      if (f.nome.value.trim().length < 2) { er.textContent = 'Escreva o seu nome.'; f.nome.focus(); return; }
      if (f.tel.value.replace(/\D/g, '').length < 10) { er.textContent = 'Confira o WhatsApp com DDD.'; f.tel.focus(); return; }
      if (!f.priv.checked) { er.textContent = 'Marque a concordância com a política de privacidade.'; return; }
      var ok = $('.pn-ok', pn);
      ok.innerHTML = '<p class="rotulo">Pedido registrado</p><h3 class="pn-tit">Até breve, ' + pesc(f.nome.value.trim().split(' ')[0]) + '.</h3>' +
        '<dl class="pn-res"><div><dt class="rotulo">Assunto</dt><dd>' + pesc(f.assunto.value) + '</dd></div><div><dt class="rotulo">Quando</dt><dd>' + pesc(f.dia.value) + ', ' + pesc(f.periodo.value) + '</dd></div><div><dt class="rotulo">Formato</dt><dd>' + pesc(f.formato.value) + '</dd></div><div><dt class="rotulo">Retorno</dt><dd>WhatsApp ' + pesc(f.tel.value) + '</dd></div></dl>' +
        '<p class="pn-nota">O horário exato é confirmado pelo WhatsApp. A conversa dura cerca de 50 minutos.</p>' +
        '<p class="pn-demo">Demonstração: nada foi enviado. Num site real, o pedido chega no WhatsApp e no e-mail do escritório.</p>' +
        '<button type="button" class="pn-segue pn-fim">Fechar</button>';
      f.hidden = true; $('.pn-n', pn).textContent = 'Pronto'; ok.hidden = false; pn.scrollTop = 0; ok.focus();
      $('.pn-fim', ok).addEventListener('click', pfecha);
    });
    doc.addEventListener('keydown', function (e) {
      if (pn.hidden) return;
      if (e.key === 'Escape') pfecha();
      if (e.key === 'Tab') {
        var fo = [].filter.call(pn.querySelectorAll('button, input, a[href], [tabindex="-1"]'), function (x) { return x.offsetParent !== null; });
        if (e.shiftKey && doc.activeElement === fo[0]) { e.preventDefault(); fo[fo.length - 1].focus(); }
        else if (!e.shiftKey && doc.activeElement === fo[fo.length - 1]) { e.preventDefault(); fo[0].focus(); }
      }
    });
  }
  function pvai(n) {
    pp = n;
    $$('.pn-et', pn).forEach(function (x) { x.hidden = +x.dataset.p !== n; });
    $('.pn-n', pn).textContent = n + ' / 3';
    $('.pn-volta', pn).hidden = n === 1;
    $('.pn-segue', pn).textContent = n === 3 ? 'Confirmar' : 'Continuar';
    var i = $('.pn-et[data-p="' + n + '"] input', pn); if (i) i.focus({ preventScroll: true });
  }
  function pabre(assunto) {
    if (!pn) pmonta();
    var f = $('.pn-f', pn), ok = $('.pn-ok', pn);
    if (!ok.hidden) { ok.hidden = true; f.hidden = false; f.reset(); }
    if (assunto) [].forEach.call(f.assunto, function (r) { if (r.value === assunto) r.checked = true; });
    $('.pn-erro', pn).textContent = '';
    pvolta = doc.activeElement; pveu.hidden = false; pn.hidden = false; raiz.classList.add('pn-aberto');
    requestAnimationFrame(function () { pveu.classList.add('on'); pn.classList.add('on'); });
    pvai(1);
  }
  function pfecha() {
    pn.classList.remove('on'); pveu.classList.remove('on'); raiz.classList.remove('pn-aberto');
    setTimeout(function () { pn.hidden = true; pveu.hidden = true; }, calmo ? 0 : 600);
    if (pvolta && pvolta.focus) pvolta.focus({ preventScroll: true });
  }
  // o mesmo CTA em todo o site: "Agendar", "Pedir horário", "Marcar" e os links para #consulta abrem o painel
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a, button'); if (!a || a.closest('.pn') || a.type === 'submit') return;
    var t = a.textContent.trim(), h = a.getAttribute('href') || '';
    if (!(a.hasAttribute('data-agendar') || /^(Pedir horário|Marcar|Agendar)/.test(t) || /#consulta$/.test(h))) return;
    e.preventDefault(); e.stopPropagation();
    var as = a.dataset.assunto || null;
    if (!as) { try { as = new URL(a.href, location.href).searchParams.get('assunto'); } catch (er) {} }
    if (!as) { var pg = (location.pathname.match(/area-(\w+)/) || [])[1]; as = { divorcio: 'Divórcio', pensao: 'Pensão', guarda: 'Guarda', inventario: 'Inventário' }[pg] || null; }
    pabre(as);
  }, true);

  // ---------- como anda o caso: a foto acompanha o passo que está no meio da tela ----------
  var plp = $$('.pl-passo'), plf = $$('.pl-fotos img');
  if (plp.length && 'IntersectionObserver' in window) {
    var plio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var i = +e.target.dataset.i;
        plp.forEach(function (x, k) { x.classList.toggle('on', k === i); });
        plf.forEach(function (x, k) { x.classList.toggle('on', k === i); });
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    plp.forEach(function (x) { plio.observe(x); });
  }
})();
