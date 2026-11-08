// Dra. Bianca Moraes · topo que encolhe, menus suspensos, fotos da abertura em fusão, ondas, carrosséis, rosto com pontos,
// vaso que se desenha, contadores, pétalas, dicas em vídeo e janela de agendamento que chama o WhatsApp.
// Nas páginas internas: pedido de avaliação em 3 passos e formulário de contato (tudo abre o WhatsApp).
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
    if (lateral) lateral.classList.toggle('ver', y > innerHeight * .8);
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
  if (ondas) for (var i = 0; i < 16; i++) { var p = d.createElementNS(NS, 'path'); ondas.appendChild(p); linhas.push(p); }
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
  if (!calmo && ondas) { var vivo = true; new IntersectionObserver(function (e) { vivo = e[0].isIntersecting; }).observe(ondas); (function anda() { if (vivo) { fase += .006; desenhaOndas(); } requestAnimationFrame(anda); })(); }

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

  // ---------- do espelho ao resultado: a rolagem conta o processo e troca a foto presa ao lado ----------
  var proc = $('.processo');
  if (proc && 'IntersectionObserver' in window) {
    var pFotos = $$('.pr-fotos img', proc), pPassos = $$('.pr-passo', proc);
    var ioP = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var i = +e.target.dataset.i;
        pFotos.forEach(function (f, k) { f.classList.toggle('on', k === i); });
        pPassos.forEach(function (x, k) { x.classList.toggle('on', k === i); });
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    pPassos.forEach(function (x) { ioP.observe(x); });
  }

  // ---------- tabelas: o nome da coluna vai em cada célula (no celular a linha vira cartão) ----------
  $$('.tabela').forEach(function (t) {
    var cab = [].map.call(t.querySelectorAll('thead th'), function (th) { return th.textContent.trim(); });
    [].forEach.call(t.querySelectorAll('tbody tr'), function (tr) {
      [].forEach.call(tr.children, function (c, i) { if (c.tagName === 'TD' && cab[i]) c.setAttribute('data-rotulo', cab[i]); });
    });
  });

  // ---------- aparecer ao rolar ----------
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('ver'); io.unobserve(e.target); } }); }, { threshold: .18 });
  // títulos (h1/h2) ficam parados: bloco com título não sobe inteiro, só as partes sem título
  $$('.anima').forEach(function (el) {
    if (el.matches('h1, h2')) { el.classList.remove('anima'); return; }
    if (!el.querySelector('h1, h2')) return;
    el.classList.remove('anima');
    [].forEach.call(el.children, function (f) { if (!f.matches('h1, h2') && !f.querySelector('h1, h2')) f.classList.add('anima'); });
  });
  $$('.anima, .ajuda, .numeros').forEach(function (el) { io.observe(el); });

  // ---------- carrossel de casos ----------
  var car = $('[data-car]');
  if (car) (function () {
  var trilho = $('.car-trilho', car), casos = $$('.caso', car), ci = 1;
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
  })();

  // ---------- como podemos ajudar: rosto com pontos ----------
  var Z = {
    testa: { u: 'tratamento-botox.html', n: 'Testa e pés de galinha', p: 'Botox na testa e pés de galinha', x: 300, y: 196, t: 'A ruga de expressão marca porque o músculo puxa a pele o dia inteiro. Relaxar só esse músculo resolve sem travar o rosto.', l: ['Suaviza a testa e as linhas ao redor dos olhos.', 'Você continua franzindo, só que sem marcar.', 'Também trata bruxismo e suor em excesso.'], v: ['R$ 1.190', '4 a 6 meses', 'nenhuma'] },
    olheira: { u: 'tratamento-olheiras.html', n: 'Olheiras', p: 'Preenchimento de olheiras', x: 336, y: 304, t: 'Muitas vezes a olheira é sombra de um sulco fundo, não pigmento. Pouca quantidade no lugar certo tira o ar de cansaço.', l: ['Disfarça o sulco abaixo do olho.', 'Ilumina o olhar sem deixar “bolsa”.', 'Avaliamos antes se a sua olheira é de sulco.'], v: ['R$ 1.590', '12 a 18 meses', '1 a 2 dias de leve inchaço'] },
    malar: { u: 'tratamento-maca-do-rosto.html', n: 'Maçã do rosto', p: 'Maçã do rosto', x: 246, y: 336, t: 'Com o tempo, o rosto perde volume no terço médio e tudo parece descer. Repor esse apoio levanta sem inflar.', l: ['Levanta o terço médio do rosto.', 'Suaviza o bigode chinês de forma indireta.', 'Sem efeito de bochecha cheia.'], v: ['R$ 1.890', '18 meses', '1 dia'] },
    labios: { u: 'tratamento-labios.html', n: 'Lábios', p: 'Preenchimento labial', x: 300, y: 392, t: 'Cada boca é única, como uma digital. Vamos desenhar juntas o formato antes da primeira gota.', l: ['Contorno e hidratação com 0,5 a 1 ml.', 'Corrige assimetrias naturais dos lábios.', 'Nada de volume exagerado.'], v: ['R$ 1.390', '9 a 12 meses', '2 dias de inchaço'] },
    mandibula: { u: 'tratamento-mandibula.html', n: 'Mandíbula e queixo', p: 'Contorno de mandíbula e queixo', x: 352, y: 424, t: 'O ângulo da mandíbula e a projeção do queixo dão estrutura ao rosto. É o que mais muda a foto de perfil.', l: ['Marca o ângulo da mandíbula.', 'Equilibra o perfil e o queixo.', 'Disfarça o início de papada.'], v: ['R$ 2.990', '18 a 24 meses', '2 a 3 dias'] },
    pele: { u: 'tratamento-bioestimulador.html', n: 'Pele e flacidez', p: 'Bioestimulador de colágeno', x: 300, y: 498, t: 'O bioestimulador faz o seu próprio corpo produzir colágeno. A firmeza aparece aos poucos e dura muito mais.', l: ['Firma rosto e pescoço.', 'Melhora textura e viço da pele.', 'Resultado gradual, em cerca de 60 dias.'], v: ['R$ 2.490 por sessão', 'até 2 anos', 'nenhuma'] }
  };
  var atual = 'labios', camada = $('.pontos-rosto');
  if (camada) (function () {
  var CHAVES = Object.keys(Z), info = $('.aj-info'), nome = $('.aj-nome'), selBt = $('.aj-atual'), selLista = $('#aj-lista');
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
      '<div class="aj-bts"><button type="button" class="pilula" data-abrir-agenda data-int="' + z.p + '">Avaliar ' + z.n.toLowerCase() + '</button><a class="pilula" href="' + z.u + '">Ver tratamento</a></div>';
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
  mostra('labios');
  })();

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
  if (!calmo && pet) for (var j = 0; j < 14; j++) {
    var s = d.createElement('span'); s.className = 'petala';
    s.style.left = (Math.random() * 100) + '%';
    s.style.animationDuration = (9 + Math.random() * 9) + 's'; s.style.animationDelay = (-Math.random() * 16) + 's';
    s.style.setProperty('--dx', (Math.random() * 160 - 60) + 'px'); s.style.setProperty('--r', (180 + Math.random() * 360) + 'deg');
    s.style.transform = 'scale(' + (.6 + Math.random() * .7) + ')'; s.style.opacity = (.4 + Math.random() * .5).toFixed(2);
    pet.appendChild(s);
  }

  // ---------- dicas em vídeo: prévia no hover (computador) e janela com o vídeo ao clicar no play ----------
  var dj = $('#dica-janela'), djv = dj && $('.dj-video', dj);
  var passa = matchMedia('(hover: hover) and (pointer: fine)').matches;
  function toca(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  $$('.reel').forEach(function (r) {
    var v = $('video', r);
    if (v && passa && !calmo) {
      r.addEventListener('mouseenter', function () { r.classList.add('tocando'); toca(v); });
      r.addEventListener('mouseleave', function () { r.classList.remove('tocando'); v.pause(); });
    }
    r.addEventListener('click', function () {
      if (!dj || !v) return;
      v.pause(); r.classList.remove('tocando');
      var tit = $('.reel-tit', r).cloneNode(true), sm = $('small', tit); if (sm) sm.remove();
      $('#dj-t', dj).textContent = tit.textContent.trim();
      $('.dj-dica', dj).textContent = $('.reel-dica', r).textContent;
      var src = $('source', v).getAttribute('src');
      if (djv.getAttribute('data-src') !== src) { djv.setAttribute('data-src', src); djv.poster = v.getAttribute('poster'); djv.src = src; }
      if (dj.showModal) dj.showModal(); else dj.setAttribute('open', '');
      djv.currentTime = 0; toca(djv);
    });
  });
  if (dj) {
    var fechaDica = function () { djv.pause(); if (dj.open) { if (dj.close) dj.close(); else dj.removeAttribute('open'); } };
    $('.dj-fechar', dj).addEventListener('click', fechaDica);
    dj.addEventListener('click', function (e) { if (e.target === dj) fechaDica(); });
    dj.addEventListener('close', function () { djv.pause(); });
    $('[data-abrir-agenda]', dj).addEventListener('click', function () { fechaDica(); });
  }

  // ---------- vídeos de fundo: tocam só quando aparecem na tela (com movimento reduzido fica o pôster) ----------
  if (!calmo && 'IntersectionObserver' in window) $$('video[data-auto]').forEach(function (v) {
    new IntersectionObserver(function (e) { if (e[0].isIntersecting) toca(v); else v.pause(); }, { threshold: .25 }).observe(v);
  });

  // ---------- pedido de avaliação em 3 passos (agendar.html) ----------
  var pf = $('[data-passos]');
  if (pf) (function () {
    var ps = $$('.pf-passo', pf), et = $$('.pf-etapas li', pf), n = 0;
    function vai(k) {
      n = Math.max(0, Math.min(ps.length - 1, k));
      ps.forEach(function (x, i) { x.hidden = i !== n; });
      et.forEach(function (x, i) { x.classList.toggle('on', i <= n); });
      var f = $('input:checked, input:not([type=radio])', ps[n]); if (f) f.focus();
    }
    pf.addEventListener('click', function (e) { if (e.target.closest('[data-prox]')) vai(n + 1); else if (e.target.closest('[data-volta]')) vai(n - 1); });
    pf.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = pf.nome.value.trim(), tel = pf.tel.value.replace(/\D/g, ''), er = $('.erro', pf);
      pf.nome.classList.toggle('ruim', nome.length < 2); pf.tel.classList.toggle('ruim', tel.length < 10);
      er.textContent = nome.length < 2 ? 'Escreva seu nome.' : tel.length < 10 ? 'Confira o WhatsApp com DDD.' : !pf.aceite.checked ? 'Marque que concorda com a política de privacidade.' : '';
      if (er.textContent) return;
      var int = pf.querySelector('[name=pint]:checked').value, hora = pf.querySelector('[name=phora]:checked').value;
      if (window.BR_WA) window.BR_WA('Olá, Dra. Bianca Moraes! Sou ' + nome + ' e quero agendar a avaliação sem custo. Interesse: ' + int.toLowerCase() + '. Melhor horário: ' + hora.toLowerCase() + '. WhatsApp: ' + tel + '.');
      pf.innerHTML = '<p class="pf-ok">Obrigada, ' + nome.split(' ')[0].replace(/[<>&"]/g, '') + '. A clínica confirma a sua avaliação no WhatsApp ainda hoje.</p>';
    });
  })();

  // ---------- mensagem pelo formulário de contato ----------
  var fc = $('#f-contato');
  if (fc) fc.addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = fc.nome.value.trim(), tel = fc.tel.value.replace(/\D/g, ''), msg = fc.msg.value.trim(), er = $('.erro', fc);
    fc.nome.classList.toggle('ruim', nome.length < 2); fc.tel.classList.toggle('ruim', tel.length < 10); fc.msg.classList.toggle('ruim', msg.length < 3);
    er.textContent = nome.length < 2 ? 'Escreva seu nome.' : tel.length < 10 ? 'Confira o WhatsApp com DDD.' : msg.length < 3 ? 'Escreva a sua mensagem.' : !fc.aceite.checked ? 'Marque que concorda com a política de privacidade.' : '';
    if (er.textContent) return;
    if (window.BR_WA) window.BR_WA('Olá, Dra. Bianca Moraes! Sou ' + nome + ' (WhatsApp ' + tel + (fc.email.value.trim() ? ', e-mail ' + fc.email.value.trim() : '') + '). ' + msg);
    fc.innerHTML = '<p class="pf-ok">Mensagem pronta, ' + nome.split(' ')[0].replace(/[<>&"]/g, '') + '. A recepção responde no WhatsApp no mesmo dia.</p>';
  });

  // ---------- janela de agendamento ----------
  // painel lateral em passos: interesse → período → dados → confirmação com resumo (envio simulado na demonstração)
  var dlg = $('#agenda');
  var INTS = [].map.call($$('#ag-int option'), function (o) { return o.text; });
  var PERS = ['Manhã, de 9h às 12h', 'Tarde, de 13h às 19h', 'Sábado, de 8h às 13h'];
  var ag = { int: '', per: '', nome: '', tel: '', passo: 0 };
  var escH = function (t) { return String(t).replace(/[<>&"]/g, function (m) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[m]; }); };
  var corpoAg = $('.ag-corpo', dlg);
  dlg.classList.add('ag-painel');
  function msgAg() { return 'Olá, Dra. Bianca Moraes! Sou ' + ag.nome + ' e quero agendar a avaliação sem custo.\n• Interesse: ' + ag.int + '\n• Melhor período: ' + ag.per + '\n• WhatsApp: ' + ag.tel; }
  function chips(lista, atual, nome) {
    return '<div class="ag-chips" role="radiogroup">' + lista.map(function (t) { return '<button type="button" role="radio" class="ag-chip" data-' + nome + '="' + escH(t) + '" aria-checked="' + (t === atual) + '">' + escH(t) + '</button>'; }).join('') + '</div>';
  }
  function telaAg() {
    var p = ag.passo, h = '<ol class="ag-prog" aria-label="Etapas">' + ['Interesse', 'Período', 'Seus dados', 'Confirmar'].map(function (n, i) { return '<li class="' + (i < p ? 'feito' : i === p ? 'agora' : '') + '"' + (i === p ? ' aria-current="step"' : '') + '><span>' + n + '</span></li>'; }).join('') + '</ol>';
    if (p === 0) h += '<p class="ag-olho">Passo 1 de 4</p><h2 id="ag-t" tabindex="-1">O que avaliar?</h2><p class="ag-sub">Se não souber, a Dra. Bianca indica na avaliação.</p>' + chips(INTS, ag.int, 'int');
    if (p === 1) h += '<p class="ag-olho">Passo 2 de 4</p><h2 id="ag-t" tabindex="-1">Melhor período</h2><p class="ag-sub">A recepção oferece o primeiro horário livre nesse período.</p>' + chips(PERS, ag.per, 'per');
    if (p === 2) h += '<p class="ag-olho">Passo 3 de 4</p><h2 id="ag-t" tabindex="-1">Seus dados</h2><p class="ag-sub">Só para a recepção confirmar com você.</p><form class="ag ag-dados" novalidate><label for="ag-nome">Seu nome</label><input id="ag-nome" name="nome" autocomplete="name" value="' + escH(ag.nome) + '"><label for="ag-tel">WhatsApp com DDD</label><input id="ag-tel" name="tel" inputmode="tel" autocomplete="tel" placeholder="(81) 99999-9999" value="' + escH(ag.tel) + '"><p class="erro" aria-live="polite"></p><div class="ag-pe"><button type="button" class="pilula" data-ag-volta>Voltar</button><button type="submit" class="pilula pilula-cheia">Ver resumo</button></div></form>';
    if (p === 3) h += '<p class="ag-olho">Passo 4 de 4</p><h2 id="ag-t" tabindex="-1">Confira</h2><dl class="ag-resumo"><div><dt>Interesse</dt><dd>' + escH(ag.int) + '</dd></div><div><dt>Período</dt><dd>' + escH(ag.per) + '</dd></div><div><dt>Nome</dt><dd>' + escH(ag.nome) + '</dd></div><div><dt>WhatsApp</dt><dd>' + escH(ag.tel) + '</dd></div><div><dt>Avaliação</dt><dd>40 minutos, sem custo</dd></div></dl><div class="ag-pe"><button type="button" class="pilula" data-ag-volta>Voltar</button><button type="button" class="pilula pilula-cheia" data-ag-ok>Confirmar pedido</button></div>';
    if (p === 4) h += '<p class="ag-olho">Pedido feito</p><h2 id="ag-t" tabindex="-1">Tudo certo, ' + escH(ag.nome.split(' ')[0]) + '</h2><p class="ag-sub">A recepção confirma o dia e o horário no seu WhatsApp ainda hoje.</p><dl class="ag-resumo"><div><dt>Interesse</dt><dd>' + escH(ag.int) + '</dd></div><div><dt>Período</dt><dd>' + escH(ag.per) + '</dd></div></dl><p class="ag-demo">Demonstração: nada foi enviado. Veja como o pedido chega no WhatsApp da clínica.</p><div class="ag-pe"><button type="button" class="pilula" data-ag-fecha>Fechar</button><button type="button" class="pilula pilula-cheia" data-ag-wa>Ver no WhatsApp</button></div>';
    if (p < 2) h += '<div class="ag-pe">' + (p ? '<button type="button" class="pilula" data-ag-volta>Voltar</button>' : '<span></span>') + '<button type="button" class="pilula pilula-cheia" data-ag-segue' + ((p === 0 ? ag.int : ag.per) ? '' : ' disabled') + '>Continuar</button></div>';
    corpoAg.innerHTML = h;
    var t = $('#ag-t', corpoAg); if (t && telaAg.foco) t.focus({ preventScroll: true });
    telaAg.foco = true; corpoAg.scrollTop = 0;
  }
  function abreAgenda(int) {
    ag = { int: INTS.indexOf(int) > -1 ? int : '', per: '', nome: ag.nome, tel: ag.tel, passo: 0 };
    telaAg.foco = false; telaAg();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    setTimeout(function () { var c = $('.ag-chip[aria-checked="true"]', dlg) || $('.ag-chip', dlg); if (c) c.focus(); }, 80);
  }
  function fechaAgenda() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  d.addEventListener('click', function (e) { var b = e.target.closest('[data-abrir-agenda]'); if (!b) return; e.preventDefault(); fechaDd(null); abreAgenda(b.dataset.int || (Z[atual] && b.closest('.aj-info') ? Z[atual].p : '')); });
  $('.ag-fechar').addEventListener('click', fechaAgenda);
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg) { fechaAgenda(); return; }
    var c = e.target.closest('.ag-chip');
    if (c) { if (c.dataset.int) ag.int = c.dataset.int; if (c.dataset.per) ag.per = c.dataset.per; ag.passo++; telaAg(); return; }
    if (e.target.closest('[data-ag-segue]')) { ag.passo++; telaAg(); return; }
    if (e.target.closest('[data-ag-volta]')) { ag.passo = Math.max(0, ag.passo - 1); telaAg(); return; }
    if (e.target.closest('[data-ag-ok]')) { ag.passo = 4; telaAg(); return; }
    if (e.target.closest('[data-ag-fecha]')) { fechaAgenda(); return; }
    if (e.target.closest('[data-ag-wa]')) { fechaAgenda(); if (window.BR_WA) window.BR_WA(msgAg()); }
  });
  dlg.addEventListener('submit', function (e) {
    var fd = e.target.closest('.ag-dados'); if (!fd) return;
    e.preventDefault();
    var n = fd.nome.value.trim(), t = fd.tel.value.replace(/\D/g, ''), er = $('.erro', fd);
    fd.nome.classList.toggle('ruim', n.length < 2); fd.tel.classList.toggle('ruim', t.length < 10 || t.length > 11);
    er.textContent = n.length < 2 ? 'Escreva seu nome.' : (t.length < 10 || t.length > 11) ? 'Confira o WhatsApp com DDD.' : '';
    if (er.textContent) { (n.length < 2 ? fd.nome : fd.tel).focus(); return; }
    ag.nome = n; ag.tel = fd.tel.value.trim(); ag.passo = 3; telaAg();
  });
})();
