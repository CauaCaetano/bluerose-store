// Lu Veloso · mídia kit: pacote pronto (escolha um) + itens avulsos + exclusividade e uso em anúncio; total na hora e salvar em PDF.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };

  // [id, nome, preço, itens]; "sem" deixa montar só com avulsos
  var PACOTES = [
    ['vitrine', 'Vitrine', 4900, ['1 Reel com 3 looks', '1 carrossel de 6 fotos', '3 Stories com link']],
    ['colecao', 'Coleção', 9800, ['2 Reels de lookbook', '2 carrosséis', '6 Stories com link e cupom', '6 fotos para o site da marca']],
    ['sem', 'Só avulsos', 0, ['Monte do zero com os itens abaixo']]
  ];
  var AVULSOS = [['reel', 'Reel extra', 'lookbook de 30 a 60 s', 3200], ['carrossel', 'Carrossel extra', 'até 10 fotos', 2100], ['stories', 'Sequência de Stories', '3 Stories com link', 1100], ['fotos', 'Fotos para o site', '6 fotos tratadas, direito de uso de 1 ano', 2400], ['pinterest', 'Pins no Pinterest', '5 pins com link da loja', 900]];
  var pacote = 'vitrine', qtd = {};

  $('.pc-grade').innerHTML = PACOTES.map(function (p) { return '<button type="button" class="pacote" role="radio" data-pac="' + p[0] + '" aria-checked="false"><b>' + p[1] + '</b><span class="pr">' + (p[2] ? real(p[2]) : 'Você escolhe') + '</span><ul>' + p[3].map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul></button>'; }).join('');
  $('.pc-mais').innerHTML = AVULSOS.map(function (a) { qtd[a[0]] = 0; return '<li><span><b>' + a[1] + '</b><small>' + a[2] + '</small></span><span>' + real(a[3]) + '</span><span class="qtd"><button type="button" data-m="' + a[0] + '" data-d="-1" aria-label="Menos ' + a[1] + '">−</button><output data-q="' + a[0] + '">0</output><button type="button" data-m="' + a[0] + '" data-d="1" aria-label="Mais ' + a[1] + '">+</button></span></li>'; }).join('');

  function total() {
    var p = PACOTES.filter(function (x) { return x[0] === pacote; })[0], av = AVULSOS.filter(function (a) { return qtd[a[0]]; }), base = p[2];
    av.forEach(function (a) { base += qtd[a[0]] * a[3]; });
    var ex = $('[data-extra="excl"]').checked ? base * 0.25 : 0, an = $('[data-extra="anuncio"]').checked ? base * 0.4 : 0, tot = base + ex + an;
    $$('.pacote').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.pac === pacote)); });
    $$('[data-q]').forEach(function (o) { o.textContent = qtd[o.dataset.q]; });
    $('.pc-linhas').innerHTML = (p[2] ? '<p><span>Pacote ' + p[1] + '</span><span>' + real(p[2]) + '</span></p>' : '') + av.map(function (a) { return '<p><span>' + qtd[a[0]] + ' × ' + a[1] + '</span><span>' + real(qtd[a[0]] * a[3]) + '</span></p>'; }).join('') + (ex ? '<p><span>Exclusividade 30 dias</span><span>+' + real(ex) + '</span></p>' : '') + (an ? '<p><span>Uso em anúncio 3 meses</span><span>+' + real(an) + '</span></p>' : '') || '<p>Escolha um pacote ou um item avulso.</p>';
    $('[data-total]').textContent = real(tot);
    var partes = (p[2] ? ['pacote ' + p[1]] : []).concat(av.map(function (a) { return qtd[a[0]] + ' ' + a[1].toLowerCase(); }));
    $('[data-pedir]').dataset.wa = 'Olá, Lu! Quero uma proposta: ' + (partes.join(', ') || 'ainda vou escolher') + (ex ? ', com exclusividade' : '') + (an ? ', com uso em anúncio' : '') + '. Total estimado ' + real(tot) + '.';
  }
  $('.pc-grade').addEventListener('click', function (e) { var b = e.target.closest('[data-pac]'); if (b) { pacote = b.dataset.pac; total(); } });
  $('.pc-mais').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (!b) return; qtd[b.dataset.m] = Math.max(0, Math.min(12, qtd[b.dataset.m] + Number(b.dataset.d))); total(); });
  $$('[data-extra]').forEach(function (c) { c.addEventListener('change', total); });
  total();

  $$('[data-imprimir]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });
})();
