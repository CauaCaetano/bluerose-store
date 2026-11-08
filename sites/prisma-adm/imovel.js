/* Prisma · página do imóvel (?c=PR-1021). */
(function () {
  'use strict';
  var P = window.PRISMA, C = window.PRC, U = window.PR, $ = U.$, esc = U.esc, brl = U.brl, brl0 = U.brl0;
  var cod = ''; try { cod = new URLSearchParams(location.search).get('c') || ''; } catch (e) {}
  var im = P.obterImovel(cod) || P.obterImovel('PR-1021');
  document.title = im.titulo + ' no ' + im.bairro + ' · ' + im.cod + ' · Prisma';
  $('#trilha-cod').textContent = im.cod; $('#im-tipo').textContent = im.tipo + ' · ' + im.cod;
  $('#im-titulo').textContent = im.titulo; $('#im-local').textContent = im.bairro + ', ' + im.regiao + ' · Ribeirão Preto/SP';
  $('#im-cod').textContent = im.cod; $('#im-desc').textContent = im.desc;
  $('#im-itens').innerHTML = im.itens.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
  $('#mapa-bairro').textContent = im.bairro; $('#im-mapa-txt').textContent = im.bairro + ', ' + im.regiao + ' de Ribeirão Preto.';
  $('#galeria').innerHTML = im.fotos.map(function (f, i) { return '<button type="button" data-foto="' + i + '" aria-label="Ampliar foto ' + (i + 1) + '"><img src="img/' + f[0] + '.webp" width="' + f[1] + '" height="' + f[2] + '" alt="' + esc(f[3]) + '"' + (i ? ' loading="lazy"' : ' fetchpriority="high"') + '></button>'; }).join('');
  $('#carac').innerHTML = [['Área', im.area + ' m²'], ['Quartos', im.quartos ? im.quartos + (im.suites ? ' (' + im.suites + ' suíte' + (im.suites > 1 ? 's' : '') + ')' : '') : '—'], ['Banheiros', im.banheiros], ['Vagas', im.vagas || 'sem vaga']].map(function (c) { return '<div><span>' + c[0] + '</span><b>' + c[1] + '</b></div>'; }).join('');
  $('#custos').innerHTML = '<table class="demonstrativo"><tbody><tr><th scope="row">Aluguel</th><td class="num">' + brl(im.aluguel) + '</td></tr><tr><th scope="row">Condomínio</th><td class="num">' + brl(im.cond) + '</td></tr><tr><th scope="row">IPTU (mensal)</th><td class="num">' + brl(im.iptu) + '</td></tr><tr><th scope="row">Seguro incêndio</th><td class="num">' + brl(im.seguro) + '</td></tr></tbody><tfoot><tr><th scope="row">Total por mês</th><td class="num"><span class="liq">' + brl(im.total) + '</span></td></tr></tfoot></table><p class="nota">Renda sugerida para aprovação: a partir de ' + brl0(im.total * 3) + ' por mês.</p>';
  $('#bt-alugar').href = 'locacao.html?c=' + im.cod;
  $('#bt-visita').setAttribute('data-imovel', im.cod);
  $('#im-topo').innerHTML = '<span class="selo selo-ok">Disponível para alugar</span><span class="im-preco"><b class="num">' + brl0(im.aluguel) + '</b>de aluguel</span><span class="im-total">Total por mês <b class="num">' + brl0(im.total) + '</b> com condomínio, IPTU e seguro</span>';
  var par = P.carregarImoveis().filter(function (x) { return x.cod !== im.cod; }).sort(function (a, b) { return (a.tipo === im.tipo ? 0 : 1) - (b.tipo === im.tipo ? 0 : 1) || Math.abs(a.total - im.total) - Math.abs(b.total - im.total); }).slice(0, 3);
  $('#parecidos').innerHTML = par.map(function (x) { return C.cartao(x, true); }).join('');

  // foto em tela cheia com setas, teclado e gesto
  var fc = $('#foto-cheia'), img = $('img', fc), atual = 0, antes = null;
  function mostra(i) { atual = (i + im.fotos.length) % im.fotos.length; var f = im.fotos[atual]; img.src = 'img/' + f[0] + '.webp'; img.alt = f[3]; }
  function abre(i) { antes = document.activeElement; mostra(i); fc.hidden = false; document.body.classList.add('com-janela'); $('.x', fc).focus(); }
  function fecha() { fc.hidden = true; document.body.classList.remove('com-janela'); if (antes) antes.focus(); }
  $('#galeria').addEventListener('click', function (e) { var b = e.target.closest('[data-foto]'); if (b) abre(+b.dataset.foto); });
  fc.addEventListener('click', function (e) { if (e.target.closest('.x') || e.target === fc) fecha(); else if (e.target.closest('.ant')) mostra(atual - 1); else if (e.target.closest('.prox')) mostra(atual + 1); });
  document.addEventListener('keydown', function (e) { if (fc.hidden) return; if (e.key === 'Escape') fecha(); if (e.key === 'ArrowLeft') mostra(atual - 1); if (e.key === 'ArrowRight') mostra(atual + 1); });
  var x0 = null; fc.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  fc.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) mostra(atual + (dx < 0 ? 1 : -1)); x0 = null; }, { passive: true });
})();
