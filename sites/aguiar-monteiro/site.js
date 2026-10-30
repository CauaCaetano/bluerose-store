// Aguiar & Monteiro · tema por seção, menu de pontos, revelações, prazo de 2 anos, rescisão pela CLT (estimativa), direitos extras e envio do caso.
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // tema e ponto ativo conforme a seção no meio da tela
  var secs = $$('.sec'), links = $$('.pontos a'), meta = $('meta[name="theme-color"]'), atual = null;
  function olha() {
    var meio = innerHeight * 0.5, achou = secs[0];
    for (var i = 0; i < secs.length; i++) { var r = secs[i].getBoundingClientRect(); if (r.top <= meio && r.bottom > meio) { achou = secs[i]; break; } }
    if (achou === atual) return;
    atual = achou;
    document.body.dataset.tema = achou.dataset.tema;
    if (meta) meta.content = achou.dataset.tema === 'claro' ? '#ffffff' : '#000000';
    links.forEach(function (a) { a.classList.toggle('ativo', a.getAttribute('href') === '#' + achou.id); });
  }
  addEventListener('scroll', olha, { passive: true }); addEventListener('resize', olha); olha();

  // menu no celular
  var bt = $('.menu-bt'), nav = $('#pontos');
  bt.addEventListener('click', function () { var ab = nav.classList.toggle('aberto'); bt.setAttribute('aria-expanded', ab); bt.textContent = ab ? 'Fechar' : 'Menu'; });
  links.forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('aberto'); bt.setAttribute('aria-expanded', 'false'); bt.textContent = 'Menu'; }); });

  // áreas: a do centro acende; resto aparece subindo
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('ativo', e.isIntersecting); }); }, { rootMargin: '-30% 0px -30% 0px' });
    $$('.ar').forEach(function (el) { io.observe(el); });
    if (!calmo) {
      var rv = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vis'); rv.unobserve(e.target); } }); }, { rootMargin: '0px 0px -12% 0px' });
      $$('.tb-grade > *, .eq-grade > *, .pg-grade > *, .sb-grade > *, .vi-bloco, .ca-bloco').forEach(function (el, i) { el.classList.add('revela'); el.style.transitionDelay = (i % 4) * 0.08 + 's'; rv.observe(el); });
    }
  } else { $$('.ar').forEach(function (el) { el.classList.add('ativo'); }); }

  // prazo prescricional: 2 anos depois da saída
  var sd = $('#saida'), hoje = new Date();
  sd.max = hoje.toISOString().slice(0, 7);
  var ini = new Date(hoje); ini.setMonth(ini.getMonth() - 3); sd.value = ini.toISOString().slice(0, 7);
  function prazo() {
    if (!sd.value) return;
    var p = sd.value.split('-'), lim = new Date(+p[0] + 2, +p[1] - 1, 1), meses = (lim.getFullYear() - hoje.getFullYear()) * 12 + lim.getMonth() - hoje.getMonth();
    $('.prazo-res').innerHTML = meses > 0 ? 'Seu prazo vai até <b>' + lim.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) + '</b>: restam ' + meses + ' meses.' : '<b>O prazo de 2 anos já passou.</b> Fale com a gente: alguns direitos, como o FGTS, têm regras próprias.';
  }
  sd.addEventListener('input', prazo); prazo();

  // rescisão pela CLT
  var r = $('#resc');
  function resc() {
    var s = Math.max(0, +r.sal.value), m = Math.max(1, +r.meses.value), mot = r.mot.value, anos = Math.floor(m / 12);
    var mesesAno = m % 12 || 12, linhas = [];
    linhas.push(['Saldo de salário (15 dias)', s / 2]);
    if (mot !== 'justa') linhas.push(['13º proporcional (' + mesesAno + '/12)', s * mesesAno / 12]);
    if (mot !== 'justa') linhas.push(['Férias proporcionais + 1/3', s * mesesAno / 12 * 4 / 3]);
    if (r.ferias.checked) linhas.push(['Férias vencidas + 1/3', s * 4 / 3]);
    var avisoDias = Math.min(90, 30 + 3 * anos);
    if (mot === 'sem' && !r.aviso.checked) linhas.push(['Aviso prévio indenizado (' + avisoDias + ' dias)', s * avisoDias / 30]);
    if (mot === 'acordo' && !r.aviso.checked) linhas.push(['Metade do aviso prévio', s * avisoDias / 60]);
    var fgts = s * 0.08 * m;
    if (mot === 'sem') linhas.push(['Multa de 40% do FGTS', fgts * 0.4]);
    if (mot === 'acordo') linhas.push(['Multa de 20% do FGTS', fgts * 0.2]);
    var tot = linhas.reduce(function (a, l) { return a + l[1]; }, 0);
    var saque = mot === 'sem' ? 'Você saca todo o FGTS (cerca de ' + real(fgts) + ') e pode pedir seguro-desemprego.' : mot === 'acordo' ? 'No acordo você saca 80% do FGTS e não recebe seguro-desemprego.' : 'Nesse tipo de saída o FGTS fica retido.';
    $('.cl-res').innerHTML = '<table>' + linhas.map(function (l) { return '<tr><td>' + l[0] + '</td><td>' + real(l[1]) + '</td></tr>'; }).join('') + '<tr class="tot"><td>Pela CLT, a rescisão seria</td><td>' + real(tot) + '</td></tr></table><p>' + saque + ' Se recebeu menos que isso, ou com atraso de mais de 10 dias, a lei prevê multa de 1 salário a seu favor (art. 477, § 8º).</p>';
    return s;
  }
  r.addEventListener('input', resc); r.addEventListener('change', resc);

  // direitos extras: estimativas simples sobre 24 meses
  var D = { he: ['horas extras', function (s) { return s / 220 * 1.5 * 25 * 24; }], ins: ['insalubridade', function () { return 1518 * 0.2 * 24; }], desvio: ['diferença por desvio de função', function (s) { return s * 0.25 * 24; }], ass: ['indenização por assédio moral', function (s) { return s * 5; }], fgts: ['FGTS não depositado', function (s) { return s * 0.08 * 12; }] };
  function dir() {
    var s = resc(), marc = $$('[data-d]:checked');
    var tot = marc.reduce(function (a, x) { return a + D[x.dataset.d][1](s); }, 0);
    $('.dr-res').innerHTML = marc.length ? '<p style="margin:0">Referência pela lei, para os itens marcados</p><p class="grande">' + real(tot * 0.7) + ' a ' + real(tot * 1.2) + '</p><p>' + marc.map(function (x) { return D[x.dataset.d][0]; }).join(', ') + '. O valor real depende de provas (testemunhas, mensagens, cartões de ponto) e da decisão do juiz: não é promessa de resultado.</p><a class="botao" href="#contato">Falar com um advogado sobre isso</a>' : '<p style="margin:0;font-size:1.1rem">Marque ao lado o que acontecia no seu trabalho para ver a referência pela lei.</p>';
  }
  $('.dr-lista').addEventListener('change', dir); r.addEventListener('input', dir); dir();

  // envio do caso pelo WhatsApp
  var c = $('#caso-f');
  c.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = c.nome.value.trim(), t = c.tel.value.replace(/\D/g, ''), er = $('.erro', c);
    er.textContent = n.length < 2 ? 'Escreva seu nome.' : t.length < 10 ? 'Confira o WhatsApp com DDD.' : !c.priv.checked ? 'Marque que concorda com a política de privacidade.' : '';
    if (er.textContent) return;
    window.BR_WA && window.BR_WA('Olá, Aguiar & Monteiro! Sou ' + n + ', saí da empresa ' + (c.emp.value.trim() || '(não informada)') + ' e quero falar com um advogado sobre o meu caso.' + (c.sigilo.checked ? ' Peço sigilo total.' : ''));
    c.innerHTML = '<p class="enviado">Recebido, ' + n.split(' ')[0].replace(/[<>&"]/g, '') + '. Um advogado chama você no WhatsApp em até 24 horas úteis.</p>';
  });
})();
