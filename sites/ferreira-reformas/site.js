// Ferreira Reformas · abertura presa (foto vira traço), topo que some e volta, menu do celular, fotos reveladas, títulos parados,
// miniaturas em paralaxe, abas que abrem, contadores, trilho de obras com fundo desfocado, faixas corridas, pilha de cartas,
// orçamento em 4 passos (página orcamento.html; aceita ?tipo=), filtro de obras e formulários que viram mensagem no WhatsApp.
// Cada bloco só roda se a seção existir na página.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var real = function (v) { return 'R$ ' + (Math.round(v / 100) * 100).toLocaleString('pt-BR'); };
  var wa = function (msg) { if (window.BR_WA) window.BR_WA(msg); };

  // ---------- menu do celular ----------
  var topo = $('.topo'), abreMenu = $('.abre-menu');
  function menu(sim) {
    if (!abreMenu) return;
    topo.classList.toggle('menu-aberto', sim);
    abreMenu.setAttribute('aria-expanded', String(sim));
    abreMenu.textContent = sim ? 'Fechar' : 'Menu';
  }
  if (abreMenu) {
    abreMenu.addEventListener('click', function () { menu(abreMenu.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && topo.classList.contains('menu-aberto')) { menu(false); abreMenu.focus(); } });
    $$('.menu a').forEach(function (a) { a.addEventListener('click', function () { menu(false); }); });
    matchMedia('(min-width: 901px)').addEventListener('change', function (m) { if (m.matches) menu(false); });
  }

  // ---------- rolagem: topo, abertura e paralaxe ----------
  var abre = $('.abre'), cena = $('.abre-cena'), cab = $('.cb-foto'), ultimoY = scrollY;
  var minis = $$('.es-mini'), fotosEs = $$('.es-foto img'), pgFoto = $('.pg-heroi > img');
  function rolar() {
    var y = scrollY, vh = innerHeight;
    // abertura: no primeiro trecho a foto sobe (corte de baixo para cima) e o texto some
    if (abre && cena) {
      var p = Math.min(1, Math.max(0, y / (abre.offsetHeight - vh)));
      cena.style.setProperty('--corte', (p * 100).toFixed(2) + '%');
      cena.style.setProperty('--tx', Math.max(0, 1 - p * 2.2).toFixed(3));
      cena.classList.toggle('so-traco', p > .5);
    }
    // topo: transparente sobre a foto de abertura; depois some ao descer e volta em creme ao subir
    var passou = y > vh * (abre ? .6 : .35);
    topo.classList.toggle('solido', passou);
    var aberto = topo.classList.contains('menu-aberto');
    topo.classList.toggle('escondido', passou && !aberto && y > ultimoY + 2 && !topo.contains(document.activeElement));
    if (y < ultimoY - 2 || !passou) topo.classList.remove('escondido');
    ultimoY = y;
    if (calmo) return;
    if (pgFoto && y < vh * 1.2) pgFoto.style.transform = 'translateY(' + (y * .18).toFixed(1) + 'px) scale(1.04)';
    if (cab) { var r = cab.parentNode.getBoundingClientRect(); if (r.bottom > 0 && r.top < vh) cab.style.setProperty('--px', ((r.top + r.height / 2 - vh / 2) * -0.12).toFixed(1) + 'px'); }
    minis.forEach(function (m) {
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
  // títulos (h1/h2) ficam parados: bloco com título não sobe inteiro, só as partes sem título
  $$('.sobe').forEach(function (el) {
    if (!el.querySelector('h1, h2')) return;
    el.classList.remove('sobe');
    [].forEach.call(el.children, function (f) { if (!f.matches('h1, h2') && !f.querySelector('h1, h2')) f.classList.add('sobe'); });
  });
  var vistos = $$('.revela, .sobe');
  if (calmo || !('IntersectionObserver' in window)) vistos.forEach(function (el) { el.classList.add('visto'); });
  else {
    var obs = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); obs.unobserve(e.target); } }); }, { threshold: .2 });
    vistos.forEach(function (el) { obs.observe(el); });
  }

  // ---------- contadores ----------
  if ('IntersectionObserver' in window) {
    var contaObs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; contaObs.unobserve(e.target);
        var el = e.target, fim = +el.dataset.ate, ini = el.hasAttribute('data-sem-ponto') ? fim - 11 : 0, t0 = performance.now();
        var fmt = function (v) { return el.hasAttribute('data-sem-ponto') ? String(v) : v.toLocaleString('pt-BR'); };
        if (calmo) { el.textContent = fmt(fim); return; }
        (function passo(t) { var q = Math.min(1, (t - t0) / 1800); el.textContent = fmt(Math.round(ini + (fim - ini) * (1 - Math.pow(1 - q, 3)))); if (q < 1) requestAnimationFrame(passo); })(t0);
      });
    }, { threshold: .6 });
    $$('.conta').forEach(function (c) { if (calmo) return; c.textContent = c.hasAttribute('data-sem-ponto') ? String(+c.dataset.ate - 11) : '0'; contaObs.observe(c); });
  }

  // ---------- abas (promessas, vagas) ----------
  $$('.aba button').forEach(function (b) {
    b.addEventListener('click', function () {
      var abrir = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', abrir); document.getElementById(b.getAttribute('aria-controls')).hidden = !abrir;
    });
  });

  // ---------- faixas corridas: duplica o conteúdo para o laço não ter emenda ----------
  $$('.faixa-trilho, .vz-trilho, .mq-trilho').forEach(function (ul) {
    $$('li', ul).forEach(function (li) { var c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); ul.appendChild(c); });
  });

  // ---------- trilho de obras ----------
  var trilho = $('.ob-trilho');
  if (trilho) {
    var cards = $$('.ob-card'), fundo = $('.ob-fundo img'), conta = $('.ob-conta span'), atual = 0;
    var largura = function () { return cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : trilho.clientWidth; };
    var marcar = function () {
      var i = Math.max(0, Math.min(cards.length - 1, Math.round(trilho.scrollLeft / largura())));
      if (trilho.scrollLeft + trilho.clientWidth >= trilho.scrollWidth - 4) i = cards.length - 1;
      if (i === atual) return; atual = i;
      if (conta) conta.textContent = String(i + 1).padStart(2, '0');
      if (!fundo) return;
      fundo.style.opacity = 0;
      setTimeout(function () { fundo.src = cards[i].dataset.img; fundo.style.opacity = 1; }, calmo ? 0 : 250);
    };
    trilho.addEventListener('scroll', function () { requestAnimationFrame(marcar); }, { passive: true });
    $$('.seta').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = Math.max(0, Math.min(cards.length - 1, atual + +b.dataset.dir));
        trilho.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: calmo ? 'auto' : 'smooth' });
      });
    });
  }

  // ---------- pilha de cartas da equipe ----------
  var pilha = $('.pilha');
  if (pilha) {
    var cartas = $$('.carta', pilha), frente = 0, giro;
    var arrumar = function () { cartas.forEach(function (c, i) { c.dataset.pos = (i - frente + cartas.length) % cartas.length; c.setAttribute('aria-hidden', c.dataset.pos !== '0'); }); };
    var proxima = function () {
      var c = cartas[frente]; c.classList.add('sai');
      setTimeout(function () { c.classList.remove('sai'); frente = (frente + 1) % cartas.length; arrumar(); }, calmo ? 0 : 380);
    };
    arrumar();
    $('.pilha-bt', pilha).addEventListener('click', function () { clearInterval(giro); proxima(); });
    if (!calmo && 'IntersectionObserver' in window) {
      var pilhaObs = new IntersectionObserver(function (es) { es.forEach(function (e) { clearInterval(giro); if (e.isIntersecting) giro = setInterval(proxima, 4200); }); }, { threshold: .4 });
      pilhaObs.observe(pilha);
    }
  }

  // ---------- filtro de obras (obras.html) ----------
  var filtro = $('.filtro');
  if (filtro) {
    var itens = $$('.go-card'), contaF = $('.filtro-conta');
    filtro.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-f]'); if (!b) return;
      $$('button', filtro).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      var n = 0;
      itens.forEach(function (it) { var ok = b.dataset.f === 'todas' || it.dataset.tipo.split(' ').indexOf(b.dataset.f) > -1; it.hidden = !ok; if (ok) n++; });
      if (contaF) contaF.textContent = n === 1 ? '1 obra' : n + ' obras';
    });
  }

  // ---------- formulários que viram mensagem no WhatsApp (contato, carreiras) ----------
  $$('form[data-assunto]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!f.reportValidity()) return;
      var linhas = $$('[name]', f).filter(function (c) { return c.value.trim() && c.type !== 'checkbox'; }).map(function (c) {
        var rot = c.dataset.rot || (c.labels && c.labels[0] ? c.labels[0].textContent.replace('*', '').trim() : c.name);
        return '• ' + rot + ': ' + c.value.trim();
      });
      wa('Olá, Ferreira! ' + f.dataset.assunto + '\n' + linhas.join('\n'));
      var ok = $('.form-ok', f); if (ok) ok.hidden = false;
    });
  });

  // "Quero essa vaga" já escolhe a vaga no formulário de candidatura
  $$('[data-vaga]').forEach(function (a) {
    a.addEventListener('click', function () { var sel = $('#candidatura select[name=vaga]'); if (sel) sel.value = a.dataset.vaga; });
  });

  // ---------- orçamento em 4 passos: cada resposta avança sozinha; no fim, faixa de preço e prazo ----------
  var q = $('#orcamento');
  if (!q || !q.m2) return;
  // preço por m² no padrão, dias base e dias por m², dica de tamanho, tamanho inicial, mínimo, máximo
  var T = {
    banheiro: ['banheiro', 2150, 6, 0.4, 'Banheiro social costuma ter de 3 a 6 m².', 6, 2, 20],
    cozinha: ['cozinha', 1650, 12, 0.5, 'Cozinha de apartamento fica entre 6 e 12 m².', 10, 4, 40],
    piso: ['piso', 190, 3, 0.12, 'Some a área dos cômodos. Apartamento de 2 quartos tem uns 60 m².', 60, 10, 120],
    pintura: ['pintura', 48, 2, 0.06, 'Use a área do piso: calculamos paredes e teto a partir dela.', 70, 10, 120]
  };
  var passo = 0;
  function ir(p, foco) {
    passo = p;
    $$('.q-passo', q).forEach(function (f) { f.hidden = +f.dataset.p !== p; });
    $('.q-res', q).hidden = p < 4;
    $('.q-barra i', q).style.width = Math.min(100, (p + 1) * 25) + '%';
    $('.q-volta', q).hidden = p === 0;
    if (p === 1) { var t = T[q.tipo.value]; q.m2.min = t[6]; q.m2.max = t[7]; q.m2.value = t[5]; $('.q-dica', q).textContent = t[4]; m2(); }
    if (p === 4) resultado();
    var f = $('.q-passo:not([hidden]) input, .q-res .botao', q); if (f && p > 0 && foco !== false) f.focus({ preventScroll: true });
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
      '<ul><li>Prazo de ' + dias + ' a ' + (dias + 3) + ' dias úteis, com multa por atraso</li><li>Material e mão de obra inclusos</li><li>Em até 12x no cartão, ou 6% de desconto à vista</li><li>Garantia de 5 anos por escrito, ART/RRT e seguro de RC em condomínio (exemplo a confirmar)</li></ul>' +
      '<a class="botao" href="#" data-wa="Olá, Ferreira! Fiz o orçamento no site: reforma de ' + t[0] + ', ' + m + ' m², acabamento ' + nivel + ', ' + q.qd.value + '. Estimativa ' + real(base * 0.9) + ' a ' + real(base * 1.12) + '. Posso mandar fotos?">Mandar fotos e fechar o valor</a>';
  }
  // ?tipo=banheiro (vindo da home ou da página do serviço) já começa no passo 2
  var tipo = new URLSearchParams(location.search).get('tipo'), radio = tipo && T[tipo] ? $('input[name=tipo][value="' + tipo + '"]', q) : null;
  if (radio) { radio.checked = true; ir(1, false); } else ir(0);
})();

// ---------- orçamento em painel lateral: serviço → imóvel → quando → contato, termina no resumo (demonstração, nada é enviado) ----------
(function () {
  var PASSOS = [
    { chave: 'obra', titulo: 'O que vamos reformar?', ops: [['Banheiro', 'revestimento, box e metais'], ['Cozinha', 'bancada, pontos e piso'], ['Piso', 'porcelanato, vinílico ou laminado'], ['Pintura', 'paredes e teto, com móveis cobertos']] },
    { chave: 'terreno', titulo: 'Onde é a obra?', ops: [['Apartamento', 'cuidamos dos papéis do síndico'], ['Casa', 'Goiânia e região'], ['Comercial', 'loja, sala ou consultório']] },
    { chave: 'area', titulo: 'Quando começar?', ops: [['Este mês', 'visita técnica em até 3 dias'], ['Próximo mês', 'reservamos a data no contrato'], ['Só pesquisando', 'mandamos a faixa de preço']] },
    { chave: 'dados', titulo: 'Para quem mandamos?' }
  ];
  var ROT = { obra: 'Serviço', terreno: 'Imóvel', area: 'Início', nome: 'Nome', tel: 'WhatsApp' };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var p = document.createElement('div');
  p.className = 'orc orc-fr'; p.hidden = true;
  p.innerHTML = '<div class="orc-fundo" data-fecha></div>' +
    '<aside class="orc-painel" role="dialog" aria-modal="true" aria-labelledby="orc-t">' +
    '<div class="orc-cab"><p class="orc-passo"></p><button type="button" class="orc-x" data-fecha aria-label="Fechar"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4l12 12M16 4L4 16"/></svg></button></div>' +
    '<div class="orc-barra"><i></i></div>' +
    '<form class="orc-corpo" novalidate></form></aside>';
  document.body.appendChild(p);
  var corpo = p.querySelector('.orc-corpo'), passoTx = p.querySelector('.orc-passo'), barra = p.querySelector('.orc-barra i');
  var at = 0, resp = {}, volta = null;
  function desenha() {
    var s = PASSOS[at], h = '';
    passoTx.textContent = at < PASSOS.length ? '[ 0' + (at + 1) + '/0' + PASSOS.length + ' ]' : '[ pronto ]';
    barra.style.width = ((Math.min(at, PASSOS.length) + 1) / (PASSOS.length + 1) * 100) + '%';
    if (!s) {
      h = '<h2 id="orc-t" class="orc-tit" tabindex="-1">Orçamento pedido.</h2><p class="orc-tx">O Marcos responde pelo WhatsApp em até 2 horas úteis com a faixa de preço e a data da visita técnica grátis.</p><dl class="orc-res">';
      ['obra', 'terreno', 'area', 'nome', 'tel'].forEach(function (k) { h += '<div><dt>' + ROT[k] + '</dt><dd></dd></div>'; });
      h += '</dl><p class="orc-aviso">Demonstração: nada foi enviado. No site da Ferreira, o pedido chega no WhatsApp da obra.</p><div class="orc-bts"><button type="button" class="botao" data-fecha>Fechar</button></div>';
      corpo.innerHTML = h;
      var dds = corpo.querySelectorAll('dd');
      ['obra', 'terreno', 'area', 'nome', 'tel'].forEach(function (k, i) { dds[i].textContent = resp[k] || '—'; });
    } else if (s.ops) {
      h = '<h2 id="orc-t" class="orc-tit" tabindex="-1">' + s.titulo + '</h2><fieldset class="orc-ops"><legend class="vh">' + s.titulo + '</legend>';
      s.ops.forEach(function (o, i) { h += '<label><input type="radio" name="' + s.chave + '" value="' + o[0] + '"' + (resp[s.chave] === o[0] ? ' checked' : '') + '><span><b>' + o[0] + '</b><small>' + o[1] + '</small></span></label>'; });
      h += '</fieldset><p class="orc-erro" aria-live="polite"></p>';
    } else {
      h = '<h2 id="orc-t" class="orc-tit" tabindex="-1">' + s.titulo + '</h2><div class="orc-campos"><label><span>Seu nome</span><input name="nome" autocomplete="name" maxlength="60"></label><label><span>WhatsApp com DDD</span><input name="tel" inputmode="tel" autocomplete="tel" maxlength="20"></label></div><p class="orc-erro" aria-live="polite"></p>';
    }
    if (s) h += '<div class="orc-bts">' + (at > 0 ? '<button type="button" class="orc-volta">Voltar</button>' : '') + '<button type="submit" class="botao">' + (at === PASSOS.length - 1 ? 'Pedir orçamento' : 'Continuar') + '</button></div>';
    if (s) corpo.innerHTML = h;
    if (s && !s.ops) { corpo.nome.value = resp.nome || ''; corpo.tel.value = resp.tel || ''; }
    var t = corpo.querySelector('.orc-tit'); if (t) t.focus({ preventScroll: true });
  }
  corpo.addEventListener('submit', function (e) {
    e.preventDefault();
    var s = PASSOS[at], erro = corpo.querySelector('.orc-erro');
    if (s.ops) {
      var m = corpo.querySelector('input:checked'); if (!m) { erro.textContent = 'Escolha uma opção para continuar.'; return; }
      resp[s.chave] = m.value;
    } else {
      var n = corpo.nome.value.trim(), tl = corpo.tel.value.replace(/\D/g, '');
      if (n.length < 2) { erro.textContent = 'Escreva o seu nome.'; corpo.nome.focus(); return; }
      if (tl.length < 10) { erro.textContent = 'Confira o WhatsApp: DDD e número.'; corpo.tel.focus(); return; }
      resp.nome = n; resp.tel = corpo.tel.value.trim();
    }
    at++; desenha();
  });
  corpo.addEventListener('change', function (e) { if (e.target.type === 'radio') { var er = corpo.querySelector('.orc-erro'); if (er) er.textContent = ''; } });
  corpo.addEventListener('click', function (e) { if (e.target.closest('.orc-volta')) { at--; desenha(); } });
  p.addEventListener('click', function (e) { if (e.target.closest('[data-fecha]')) fecha(); });
  document.addEventListener('keydown', function (e) {
    if (p.hidden) return;
    if (e.key === 'Escape') fecha();
    if (e.key === 'Tab') {
      var f = [].filter.call(p.querySelectorAll('button, input, [tabindex="-1"]'), function (x) { return x.offsetParent !== null && x.tabIndex >= 0; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  function abre(origem) {
    volta = origem || document.activeElement; at = 0; resp = {};
    p.hidden = false; document.documentElement.classList.add('orc-aberto');
    desenha(); requestAnimationFrame(function () { p.classList.add('vis'); });
  }
  function fecha() {
    p.classList.remove('vis'); document.documentElement.classList.remove('orc-aberto');
    setTimeout(function () { p.hidden = true; if (volta && volta.focus) volta.focus(); }, calmo ? 0 : 420);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-orc], .topo-bt'); if (!a) return;
    e.preventDefault(); abre(a);
  });
})();

// ---------- da visita à entrega: a foto de fundo troca conforme o cartão que passa ----------
(function () {
  var h = document.querySelector('.hist'); if (!h) return;
  var fotos = h.querySelectorAll('.hist-fotos img'), passos = h.querySelectorAll('.hist-passo');
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var i = +e.target.dataset.i;
      passos.forEach(function (x, k) { x.classList.toggle('at', k === i); });
      fotos.forEach(function (x, k) { x.classList.toggle('at', k === i); });
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  passos.forEach(function (x) { io.observe(x); });
})();
