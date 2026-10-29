// Bia na Cozinha · mídia kit: números por rede em 30 ou 90 dias, público em barras, monte a sua campanha (total na hora,
// 10% a menos acima de 3 entregas, exclusividade e uso em anúncio) e salvar em PDF.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };

  // [nome, seguidores, { período: [rótulo, valor]... }]
  var REDES = [
    ['Instagram', '186 mil seguidores', { 30: [['Alcance no mês', '1,9 mi'], ['Visualizações por Reel', '94 mil'], ['Engajamento', '6,8%'], ['Salvamentos por post', '8,2 mil'], ['Stories: visualizações', '21 mil']],
      90: [['Alcance no trimestre', '5,1 mi'], ['Visualizações por Reel', '88 mil'], ['Engajamento', '6,4%'], ['Salvamentos por post', '7,6 mil'], ['Stories: visualizações', '19 mil']] }],
    ['TikTok', '304 mil seguidores', { 30: [['Visualizações no mês', '3,4 mi'], ['Visualizações por vídeo', '162 mil'], ['Tempo médio assistido', '74%'], ['Compartilhamentos', '12 mil'], ['Seguidores novos', '+9,8 mil']],
      90: [['Visualizações no trimestre', '9,2 mi'], ['Visualizações por vídeo', '148 mil'], ['Tempo médio assistido', '71%'], ['Compartilhamentos', '33 mil'], ['Seguidores novos', '+26 mil']] }],
    ['YouTube', '48 mil inscritos', { 30: [['Visualizações no mês', '410 mil'], ['Visualizações por vídeo', '38 mil'], ['Tempo médio', '6 min 40 s'], ['Horas assistidas', '45 mil'], ['Shorts por mês', '12']],
      90: [['Visualizações no trimestre', '1,1 mi'], ['Visualizações por vídeo', '35 mil'], ['Tempo médio', '6 min 12 s'], ['Horas assistidas', '121 mil'], ['Shorts por trimestre', '34']] }]
  ];
  function redes(p) {
    $$('.periodo button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.p === p)); });
    $('.redes').innerHTML = REDES.map(function (r) { return '<article class="rede"><h3>' + r[0] + ' <small>' + r[1] + '</small></h3><dl>' + r[2][p].map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('') + '</dl></article>'; }).join('');
  }
  $('.periodo').addEventListener('click', function (e) { var b = e.target.closest('[data-p]'); if (b) redes(b.dataset.p); });
  redes('30');

  var BARRAS = { idade: [['18 a 24', 18], ['25 a 34', 41], ['35 a 44', 27], ['45 ou mais', 14]], cidades: [['São Paulo', 22], ['Rio de Janeiro', 9], ['Belo Horizonte', 7], ['Curitiba', 5], ['Campinas', 4]] };
  $$('[data-barras]').forEach(function (ul) {
    var l = BARRAS[ul.dataset.barras], mx = Math.max.apply(null, l.map(function (x) { return x[1]; }));
    ul.innerHTML = l.map(function (x) { return '<li><span>' + x[0] + '</span><i data-w="' + (x[1] / mx * 100) + '"></i><b>' + x[1] + '%</b></li>'; }).join('');
  });
  // as barras crescem quando aparecem na tela
  var obs = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { $$('i[data-w]', e.target).forEach(function (i) { i.style.width = i.dataset.w + '%'; }); obs.unobserve(e.target); } }); }, { threshold: .3 }) : null;
  $$('[data-barras]').forEach(function (ul) { if (obs) obs.observe(ul); else $$('i[data-w]', ul).forEach(function (i) { i.style.width = i.dataset.w + '%'; }); });

  // monte a sua campanha
  var FORM = [['reel', 'Reel no Instagram', 'receita completa com a marca, de 30 a 60 s', 2400], ['tiktok', 'Vídeo no TikTok', 'mesma receita adaptada para o TikTok', 2000], ['carrossel', 'Carrossel', 'passo a passo em até 8 fotos', 1600],
    ['stories', 'Sequência de Stories', '3 Stories com link e cupom', 900], ['youtube', 'Integração no YouTube', '60 a 90 s dentro de um vídeo longo', 3800], ['receita', 'Receita exclusiva para a marca', 'texto, fotos e vídeo para o site da marca', 2800]];
  var qtd = {};
  $('.formatos').innerHTML = FORM.map(function (f) { qtd[f[0]] = 0; return '<li><span><b>' + f[1] + '</b><small>' + f[2] + '</small></span><span class="pr">' + real(f[3]) + '</span><span class="qtd"><button type="button" data-m="' + f[0] + '" data-d="-1" aria-label="Menos ' + f[1] + '">−</button><output data-q="' + f[0] + '">0</output><button type="button" data-m="' + f[0] + '" data-d="1" aria-label="Mais ' + f[1] + '">+</button></span></li>'; }).join('');
  qtd.reel = 2; qtd.stories = 1;
  function total() {
    var itens = FORM.filter(function (f) { return qtd[f[0]]; }), n = 0, base = 0;
    itens.forEach(function (f) { n += qtd[f[0]]; base += qtd[f[0]] * f[3]; });
    var desc = n > 3 ? base * 0.1 : 0, sub = base - desc, ex = $('[data-extra="excl"]').checked ? sub * 0.25 : 0, an = $('[data-extra="anuncio"]').checked ? sub * 0.4 : 0, tot = sub + ex + an;
    $$('[data-q]').forEach(function (o) { o.textContent = qtd[o.dataset.q]; });
    $('.pr-linhas').innerHTML = itens.length ? itens.map(function (f) { return '<p><span>' + qtd[f[0]] + ' × ' + f[1] + '</span><span>' + real(qtd[f[0]] * f[3]) + '</span></p>'; }).join('') + (desc ? '<p><span>10% a menos (mais de 3 entregas)</span><span>−' + real(desc) + '</span></p>' : '') + (ex ? '<p><span>Exclusividade 30 dias</span><span>+' + real(ex) + '</span></p>' : '') + (an ? '<p><span>Uso em anúncio 3 meses</span><span>+' + real(an) + '</span></p>' : '') : '<p>Escolha pelo menos um formato.</p>';
    $('[data-total]').textContent = real(tot);
    $('[data-pedir]').dataset.wa = 'Olá, Bia! Quero uma proposta: ' + (itens.map(function (f) { return qtd[f[0]] + ' ' + f[1].toLowerCase(); }).join(', ') || 'ainda vou escolher os formatos') + (ex ? ', com exclusividade' : '') + (an ? ', com uso em anúncio' : '') + '. Total estimado ' + real(tot) + '.';
  }
  $('.formatos').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (!b) return; qtd[b.dataset.m] = Math.max(0, Math.min(12, qtd[b.dataset.m] + Number(b.dataset.d))); total(); });
  $$('[data-extra]').forEach(function (c) { c.addEventListener('change', total); });
  total();

  $$('[data-imprimir]').forEach(function (b) { b.addEventListener('click', function () { $$('i[data-w]').forEach(function (i) { i.style.width = i.dataset.w + '%'; }); window.print(); }); });
})();
