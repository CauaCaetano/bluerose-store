// Vértice · rodada 3 · comportamento comum das páginas: transição suave entre páginas (350 ms, sem tela branca), topo que
// fica sólido ao rolar, menu em tela cheia, entrada do hero (uma vez), revelação de títulos por máscara, cursor contextual só
// no desktop, mapa da cidade com pontos, palco da obra controlado pela rolagem (desktop), visualizador das fotos dos interiores,
// galeria, simulador de financiamento do saldo, formulários de contato que montam a conversa no WhatsApp e o prazo da tabela.
// As ferramentas de venda (fachada/espelho, plantas, simulador da obra, captação) ficam em vendas.js.
(function () {
  'use strict';
  var raizHtml = document.documentElement; raizHtml.classList.add('js');
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fino = matchMedia('(pointer: fine)').matches;
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var mi = function (v) { return 'R$ ' + (v / 1e6).toFixed(2).replace('.', ',') + ' mi'; };
  var lim = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  // ── transição entre páginas: fade de 350 ms (o navegador com View Transitions faz sozinho)
  var temVT = 'onpagereveal' in window || (CSS.supports && CSS.supports('view-transition-name: a'));
  if (!calmo && !temVT) document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || a.target || a.hasAttribute('download') || a.hasAttribute('data-wa')) return;
    var u = new URL(a.href, location.href); if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash) || !/\.html$|\/$/.test(u.pathname)) return;
    e.preventDefault(); raizHtml.classList.add('saindo'); setTimeout(function () { location.href = u.href; }, 300);
  });
  addEventListener('pageshow', function () { raizHtml.classList.remove('saindo'); });

  // ── menu em tela cheia
  var btMenu = $('.bt-menu'), menu = $('#menu');
  if (btMenu && menu) {
    var abreMenu = function (on) { menu.hidden = !on; btMenu.setAttribute('aria-expanded', String(on)); document.body.classList.toggle('menu-aberto', on); $('.bt-menu-t', btMenu).textContent = on ? 'Fechar' : 'Menu'; if (on) { var l = $('a', menu); if (l) l.focus(); } };
    btMenu.addEventListener('click', function () { abreMenu(menu.hidden); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) abreMenu(false); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { abreMenu(false); btMenu.focus(); } });
  }

  // ── topo: transparente sobre o hero, sólido ao rolar, some ao descer e volta ao subir
  var topo = $('.topo'), ultY = scrollY, hero = $('.hero');
  var topoQuadro = function () {
    var y = scrollY;
    topo.classList.toggle('cheio', !hero || y > 40);
    if (y > 500 && y > ultY + 6 && document.body.classList.contains('menu-aberto') === false) topo.classList.add('some'); else if (y < ultY - 6 || y < 500) topo.classList.remove('some');
    ultY = y;
  };
  if (topo) { topoQuadro(); addEventListener('scroll', topoQuadro, { passive: true }); }

  // ── hero: imagem 1,06 → 1 em 1400 ms, título por máscara, subtítulo +180 ms, cartão sobe; uma vez só
  if (hero) {
    var img = $('.hero-foto img', hero), vai = function () { requestAnimationFrame(function () { hero.classList.add('pronto'); }); };
    if (calmo || !img || img.complete) vai(); else { img.addEventListener('load', vai, { once: true }); setTimeout(vai, 1200); }
  }

  // ── revelar ao entrar na tela (uma vez)
  var alvos = $$('.revela, .revela-t, .nf');
  if ('IntersectionObserver' in window && !calmo) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -12% 0px' });
    alvos.forEach(function (el) { io.observe(el); });
  } else alvos.forEach(function (el) { el.classList.add('visto'); });

  // ── cursor contextual: "Ver unidade", "Explorar", "Ampliar" (só com mouse e sem movimento reduzido)
  if (fino && !calmo && innerWidth > 900) {
    var cur = document.createElement('div'); cur.className = 'cursor'; cur.setAttribute('aria-hidden', 'true'); document.body.appendChild(cur);
    var alvoC = null;
    addEventListener('pointermove', function (e) {
      cur.style.setProperty('--x', e.clientX + 'px'); cur.style.setProperty('--y', e.clientY + 'px');
      var a = e.target.closest && e.target.closest('[data-cursor]');
      if (a !== alvoC) { alvoC = a; cur.classList.toggle('on', !!a); if (a) cur.textContent = a.getAttribute('data-cursor'); }
    }, { passive: true });
    document.addEventListener('pointerleave', function () { cur.classList.remove('on'); alvoC = null; });
  }

  // ── mapa da cidade: pontos selecionáveis ligados à lista
  $$('[data-mapa]').forEach(function (mp) {
    var info = $('.mapa-info', mp);
    var escolhe = function (k) {
      $$('.m-pt', mp).forEach(function (p) { p.classList.toggle('on', p.dataset.k === k); });
      $$('.mapa-pts button', mp).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.k === k)); if (b.dataset.k === k && info) info.textContent = b.dataset.info; });
    };
    mp.addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (b) escolhe(b.dataset.k); });
    mp.addEventListener('keydown', function (e) { var b = e.target.closest('.m-pt'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); escolhe(b.dataset.k); } });
    escolhe($('.mapa-pts button', mp).dataset.k);
  });

  // ── obra: palco preso com 5 etapas trocadas pela rolagem (desktop); no celular vira cartões com scroll-snap
  var pista = $('.obra-pista');
  if (pista) {
    var fotos = $$('.obra-foto', pista), etapas = $$('.obra-etapa', pista), marcas = $$('.obra-marcas li', pista), barra = $('.obra-barra-trilho', pista), atual = -1;
    var largo = matchMedia('(min-width: 901px)');
    var poe = function (i) {
      if (i === atual) return; atual = i;
      fotos.forEach(function (f, k) { f.classList.toggle('on', k === i); });
      etapas.forEach(function (f, k) { f.classList.toggle('on', k === i); });
      marcas.forEach(function (f, k) { f.classList.toggle('on', k <= i); });
    };
    var obraQuadro = function () {
      if (!largo.matches) return;
      var r = pista.getBoundingClientRect(), p = lim(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
      barra.style.setProperty('--p', p.toFixed(4));
      poe(Math.min(fotos.length - 1, Math.floor(p * fotos.length * .999)));
    };
    var pedido = false;
    addEventListener('scroll', function () { if (!pedido) { pedido = true; requestAnimationFrame(function () { pedido = false; obraQuadro(); }); } }, { passive: true });
    addEventListener('resize', obraQuadro); poe(0); obraQuadro();
    marcas.forEach(function (m, k) {
      m.addEventListener('click', function () { if (!largo.matches) return; var r = pista.getBoundingClientRect(); scrollTo({ top: scrollY + r.top + (pista.offsetHeight - innerHeight) * (k + .5) / fotos.length, behavior: calmo ? 'auto' : 'smooth' }); });
    });
  }

  // ── visualizador ampliado (interiores e outras fotos com data-lb)
  var lbs = $$('[data-lb]');
  if (lbs.length) {
    var lb = document.createElement('dialog'); lb.className = 'lb'; lb.setAttribute('aria-label', 'Foto ampliada');
    lb.innerHTML = '<figure><img alt=""></figure><figcaption></figcaption><button type="button" class="redondo lb-x" aria-label="Fechar"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg></button>' +
      '<button type="button" class="redondo lb-ant" aria-label="Foto anterior"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15 10H5m4-4l-4 4 4 4"/></svg></button><button type="button" class="redondo lb-prox" aria-label="Próxima foto"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10m-4-4l4 4-4 4"/></svg></button>';
    document.body.appendChild(lb);
    var li = 0, abreLb = function (i) { li = (i + lbs.length) % lbs.length; var im = $('img', lbs[li]); $('img', lb).src = im.currentSrc || im.src; $('img', lb).alt = im.alt; $('figcaption', lb).textContent = lbs[li].getAttribute('data-lb'); if (!lb.open) lb.showModal(); };
    lbs.forEach(function (b, i) { b.addEventListener('click', function () { abreLb(i); }); });
    $('.lb-x', lb).addEventListener('click', function () { lb.close(); });
    $('.lb-ant', lb).addEventListener('click', function () { abreLb(li - 1); });
    $('.lb-prox', lb).addEventListener('click', function () { abreLb(li + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.tagName === 'FIGURE') lb.close(); });
    lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') abreLb(li - 1); if (e.key === 'ArrowRight') abreLb(li + 1); });
  }

  // ── galeria: filtro por tema e ampliação
  var gal = $('.gal-grade');
  if (gal) {
    $$('.gal-filtro button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.gal-filtro button').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        $$('figure', gal).forEach(function (g) { g.hidden = b.dataset.g !== 'todas' && g.dataset.g !== b.dataset.g; });
      });
    });
    var dlg = $('.gal-dlg'), itens = function () { return $$('figure:not([hidden]) button', gal); }, idx = 0;
    var abre = function (i) { var l = itens(); idx = (i + l.length) % l.length; var im = $('img', l[idx]); $('img', dlg).src = im.src; $('img', dlg).alt = im.alt; $('figcaption', dlg).textContent = l[idx].parentNode.querySelector('figcaption').textContent; if (!dlg.open) dlg.showModal(); };
    gal.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) abre(itens().indexOf(b)); });
    $('.gal-ant', dlg).addEventListener('click', function () { abre(idx - 1); });
    $('.gal-prox', dlg).addEventListener('click', function () { abre(idx + 1); });
    $('.gal-x', dlg).addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') abre(idx - 1); if (e.key === 'ArrowRight') abre(idx + 1); });
  }

  // ── simulador de financiamento bancário do saldo nas chaves (como comprar)
  var fin = $('#financ');
  if (fin) {
    var simula = function () {
      var v = +fin.val.value, e = +fin.ent.value, n = +fin.prazo.value * 12, j = Math.pow(1 + .115, 1 / 12) - 1, sal = v * (1 - e / 100);
      fin.val.previousElementSibling.textContent = mi(v); fin.ent.previousElementSibling.textContent = e + '% · ' + real(v * e / 100);
      fin.prazo.previousElementSibling.textContent = fin.prazo.value + ' anos';
      var amort = sal / n, p1 = amort + sal * j, pn = amort + amort * j;
      $('.fn-res').innerHTML = '<p class="sim-rot">Primeira parcela (SAC)</p><p class="grande">' + real(p1) + '<small> /mês</small></p>' +
        '<table><tr><td>Valor financiado</td><td>' + real(sal) + '</td></tr><tr><td>Última parcela</td><td>' + real(pn) + '</td></tr><tr><td>Renda familiar sugerida</td><td>' + real(p1 / .3) + '</td></tr></table>' +
        '<p class="aviso-sim">Simulação com juros de 11,5% ao ano + TR, tabela SAC. A taxa final depende do banco e da sua análise de crédito.</p>';
    };
    fin.addEventListener('input', simula); simula();
  }

  // ── formulários de contato: validam e abrem a conversa no WhatsApp com o pedido montado
  $$('form.ct').forEach(function (ct) {
    ct.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = ct.nome.value.trim(), t = ct.tel.value.replace(/\D/g, ''), er = $('.erro', ct);
      $$('[aria-invalid]', ct).forEach(function (i) { i.removeAttribute('aria-invalid'); });
      var falha = function (c, m) { c.setAttribute('aria-invalid', 'true'); c.focus(); er.textContent = m; };
      if (n.length < 2) return falha(ct.nome, 'Escreva seu nome.');
      if (t.length < 10) return falha(ct.tel, 'Confira o WhatsApp com DDD.');
      if (!ct.ok.checked) return falha(ct.ok, 'Marque a autorização de contato.');
      var msg = 'Olá, Vértice! Sou ' + n + '. Quero ' + ct.qr.value.charAt(0).toLowerCase() + ct.qr.value.slice(1) + (ct.msg && ct.msg.value.trim() ? '. ' + ct.msg.value.trim() : '.');
      if (window.BR_WA) window.BR_WA(msg);
      ct.innerHTML = '<p class="ct-ok">Pedido recebido, ' + n.split(' ')[0].replace(/[<>&"]/g, '') + '. Um corretor responde hoje, das 9h às 20h.</p>';
    });
    if (ct.tel) ct.tel.addEventListener('input', function () {
      var d = ct.tel.value.replace(/\D/g, '').slice(0, 11);
      ct.tel.value = d.length > 6 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4) : d.length > 2 ? '(' + d.slice(0, 2) + ') ' + d.slice(2) : d;
    });
  });

  // ── tabela de lançamento vale até o último dia do mês
  var ates = $$('[data-ate]');
  if (ates.length) {
    var fim = new Date(); fim = new Date(fim.getFullYear(), fim.getMonth() + 1, 0, 23, 59, 59);
    ates.forEach(function (a) { a.textContent = fim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); });
    var cont = function () { var s = Math.max(0, (fim - new Date()) / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600); $$('[data-conta]').forEach(function (c) { c.textContent = 'Faltam ' + d + (d === 1 ? ' dia e ' : ' dias e ') + h + (h === 1 ? ' hora.' : ' horas.'); }); };
    cont(); setInterval(cont, 60000);
  }
})();
