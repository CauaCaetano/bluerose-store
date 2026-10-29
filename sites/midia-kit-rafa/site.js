// Rafa Treina · mídia kit: placar por rede (Instagram/TikTok), barras do público, monte a sua campanha e salvar em PDF.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };

  var PLACAR = {
    ig: [['92 mil', 'seguidores no Instagram'], ['58 mil', 'visualizações por Reel'], ['7,2%', 'de engajamento'], ['4,1 mil', 'salvamentos por post'], ['14 mil', 'visualizações nos Stories'], ['+3,4 mil', 'seguidores novos no mês']],
    tt: [['140 mil', 'seguidores no TikTok'], ['96 mil', 'visualizações por vídeo'], ['68%', 'assistem até o fim'], ['8,9 mil', 'compartilhamentos no mês'], ['2,6 mi', 'visualizações no mês'], ['+6,1 mil', 'seguidores novos no mês']]
  };
  function placar(r) {
    $$('.rede-troca button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.r === r)); });
    $('.placar-grade').innerHTML = PLACAR[r].map(function (x) { return '<li><b>' + x[0] + '</b><span>' + x[1] + '</span></li>'; }).join('');
  }
  $('.rede-troca').addEventListener('click', function (e) { var b = e.target.closest('[data-r]'); if (b) placar(b.dataset.r); });
  placar('ig');

  var BARRAS = { idade: [['18 a 24', 34], ['25 a 34', 44], ['35 a 44', 16], ['45 ou mais', 6]], cidades: [['Belo Horizonte', 18], ['São Paulo', 15], ['Rio de Janeiro', 8], ['Contagem', 4]] };
  $$('[data-barras]').forEach(function (ul) {
    var l = BARRAS[ul.dataset.barras], mx = Math.max.apply(null, l.map(function (x) { return x[1]; }));
    ul.innerHTML = l.map(function (x) { return '<li><div><span>' + x[0] + '</span><b>' + x[1] + '%</b></div><i data-w="' + (x[1] / mx * 100) + '"></i></li>'; }).join('');
  });
  function encher(el) { $$('i[data-w]', el).forEach(function (i) { i.style.width = i.dataset.w + '%'; }); }
  var obs = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { encher(e.target); obs.unobserve(e.target); } }); }, { threshold: .3 }) : null;
  $$('[data-barras]').forEach(function (ul) { if (obs) obs.observe(ul); else encher(ul); });

  var FORM = [['reel', 'Reel no Instagram', 'treino completo usando o produto, 30 a 60 s', 1400], ['tiktok', 'Vídeo no TikTok', 'versão do treino para o TikTok', 1200], ['stories', 'Sequência de Stories', '3 Stories com link e cupom', 600],
    ['teste', 'Teste de 30 dias', '4 vídeos curtos, um por semana, contando o resultado', 4200], ['aula', 'Aula aberta presencial', 'treino na sua loja ou academia, até 2 h', 2500]];
  var qtd = {};
  $('.series').innerHTML = FORM.map(function (f) { qtd[f[0]] = 0; return '<li><span><b>' + f[1] + '</b><small>' + f[2] + '</small></span><span class="pr">' + real(f[3]) + '</span><span class="qtd"><button type="button" data-m="' + f[0] + '" data-d="-1" aria-label="Menos ' + f[1] + '">−</button><output data-q="' + f[0] + '">0</output><button type="button" data-m="' + f[0] + '" data-d="1" aria-label="Mais ' + f[1] + '">+</button></span></li>'; }).join('');
  qtd.reel = 2; qtd.stories = 2;
  function total() {
    var itens = FORM.filter(function (f) { return qtd[f[0]]; }), n = 0, base = 0;
    itens.forEach(function (f) { n += qtd[f[0]]; base += qtd[f[0]] * f[3]; });
    var desc = n >= 4 ? base * 0.1 : 0, sub = base - desc, ex = $('[data-extra="excl"]').checked ? sub * 0.25 : 0, an = $('[data-extra="anuncio"]').checked ? sub * 0.4 : 0, tot = sub + ex + an;
    $$('[data-q]').forEach(function (o) { o.textContent = qtd[o.dataset.q]; });
    $('.ficha-linhas').innerHTML = itens.length ? itens.map(function (f) { return '<p><span>' + qtd[f[0]] + ' × ' + f[1] + '</span><span>' + real(qtd[f[0]] * f[3]) + '</span></p>'; }).join('') + (desc ? '<p><span>10% a menos (4 entregas ou mais)</span><span>−' + real(desc) + '</span></p>' : '') + (ex ? '<p><span>Exclusividade 30 dias</span><span>+' + real(ex) + '</span></p>' : '') + (an ? '<p><span>Uso em anúncio 3 meses</span><span>+' + real(an) + '</span></p>' : '') : '<p>Escolha pelo menos um formato.</p>';
    $('[data-total]').textContent = real(tot);
    $('[data-pedir]').dataset.wa = 'Olá, Rafa! Quero uma proposta: ' + (itens.map(function (f) { return qtd[f[0]] + ' ' + f[1].toLowerCase(); }).join(', ') || 'ainda vou escolher os formatos') + (ex ? ', com exclusividade' : '') + (an ? ', com uso em anúncio' : '') + '. Total estimado ' + real(tot) + '.';
  }
  $('.series').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (!b) return; qtd[b.dataset.m] = Math.max(0, Math.min(12, qtd[b.dataset.m] + Number(b.dataset.d))); total(); });
  $$('[data-extra]').forEach(function (c) { c.addEventListener('change', total); });
  total();

  $$('[data-imprimir]').forEach(function (b) { b.addEventListener('click', function () { encher(document); window.print(); }); });
})();
