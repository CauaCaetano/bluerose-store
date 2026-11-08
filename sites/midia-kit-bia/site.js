// Bia na Cozinha · mídia kit de demonstração: público em barras (faixas), monte sua campanha com cards selecionáveis
// e composição ilustrativa (ingredientes, preparo, rendimento estimado e valor de referência), contato que valida e
// monta a mensagem de WhatsApp (simulação da moldura) e salvar em PDF.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var mil = function (v) { return v >= 1000 ? (Math.round(v / 100) / 10).toLocaleString('pt-BR') + ' mil' : String(Math.round(v)); };

  // ---------- público: faixas de exemplo (a barra vai até o meio da faixa) ----------
  var BARRAS = {
    idade: [['18 a 24', 12, 20], ['25 a 34', 35, 45], ['35 a 44', 22, 30], ['45 ou mais', 10, 16]],
    regioes: [['Sudeste', 50, 60], ['Nordeste', 12, 18], ['Sul', 12, 18], ['Centro-Oeste', 6, 10], ['Norte', 2, 5]]
  };
  $$('[data-barras]').forEach(function (ul) {
    var l = BARRAS[ul.dataset.barras], mx = Math.max.apply(null, l.map(function (x) { return x[2]; }));
    ul.innerHTML = l.map(function (x) { return '<li><span>' + x[0] + '</span><i data-w="' + ((x[1] + x[2]) / 2 / mx * 100) + '"></i><b>' + x[1] + '–' + x[2] + '%</b></li>'; }).join('');
  });
  var cresce = function (el) { $$('i[data-w]', el).forEach(function (i) { i.style.width = i.dataset.w + '%'; }); };
  var obs = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { cresce(e.target); obs.unobserve(e.target); } }); }, { threshold: .3 }) : null;
  $$('[data-barras]').forEach(function (ul) { if (obs) obs.observe(ul); else cresce(ul); });

  // ---------- monte sua campanha ----------
  // id, nome, descrição, preço de referência, entregas {reel, stories, carrossel}, cor no prato
  var FORM = [
    ['reel', 'Reel patrocinado', 'Receita completa de 30 a 60 s com o produto no preparo.', 1800, { reel: 1 }, '#c8402f'],
    ['stories', 'Sequência de Stories', '4 Stories com bastidor, enquete e link para a marca.', 700, { stories: 1 }, '#d9a441'],
    ['receita', 'Receita com produto', 'Reel, receita escrita na legenda e Stories de bastidor.', 2400, { reel: 1, stories: 1 }, '#4f6b3a'],
    ['carrossel', 'Carrossel de receitas', 'Três receitas em até 10 fotos, feito para salvar.', 1300, { carrossel: 1 }, '#8a5a3c'],
    ['combo', 'Combo do mês', '2 Reels, 1 carrossel e 2 sequências de Stories em 4 semanas. R$ 700 a menos que avulso.', 5600, { reel: 2, carrossel: 1, stories: 2 }, '#2a1e17']
  ];
  var POR = {}; FORM.forEach(function (f) { POR[f[0]] = f; });
  var qtd = {}; FORM.forEach(function (f) { qtd[f[0]] = 0; });
  qtd.receita = 1; qtd.stories = 1;

  $('.formatos').innerHTML = FORM.map(function (f) {
    return '<li class="fmt" data-id="' + f[0] + '" style="--cor:' + f[5] + '">' +
      '<button type="button" class="fmt-escolha" data-escolher="' + f[0] + '" aria-pressed="false"><span class="fmt-marca" aria-hidden="true"></span>' +
      '<span class="fmt-txt"><b>' + f[1] + '</b><small>' + f[2] + '</small></span><span class="pr">' + real(f[3]) + '</span></button>' +
      '<span class="qtd" aria-label="Quantidade de ' + f[1] + '"><button type="button" data-m="' + f[0] + '" data-d="-1" aria-label="Menos ' + f[1] + '">−</button><output data-q="' + f[0] + '">0</output><button type="button" data-m="' + f[0] + '" data-d="1" aria-label="Mais ' + f[1] + '">+</button></span></li>';
  }).join('');

  function itens() { return FORM.filter(function (f) { return qtd[f[0]] > 0; }); }
  function entregas() {
    var t = { reel: 0, stories: 0, carrossel: 0 };
    itens().forEach(function (f) { Object.keys(f[4]).forEach(function (k) { t[k] += f[4][k] * qtd[f[0]]; }); });
    return t;
  }
  function preparo(t) {
    // alterna os tipos (Reel, Stories, carrossel...) e divide em blocos seguidos de até 4 semanas
    var filas = [['Reel', t.reel], ['Stories', t.stories], ['Carrossel', t.carrossel]], pub = [], n = { Reel: 0, Stories: 0, Carrossel: 0 }, resta = true;
    while (resta) { resta = false; filas.forEach(function (f) { if (n[f[0]] < f[1]) { n[f[0]]++; pub.push(f[0] + ' ' + n[f[0]]); resta = true; } }); }
    if (!pub.length) return [];
    var semanas = Math.min(4, Math.max(1, Math.ceil(pub.length / 2))), passos = ['Semana 0 · briefing, roteiro e aprovação da receita'];
    for (var s = 0; s < semanas; s++) {
      var da = pub.filter(function (_, k) { return Math.floor(k * semanas / pub.length) === s; });
      passos.push('Semana ' + (s + 1) + ' · gravação e publicação: ' + da.join(', '));
    }
    passos.push('Fim · relatório com os prints do Instagram Insights');
    return passos;
  }
  function total() {
    var lista = itens(), base = 0, t = entregas();
    lista.forEach(function (f) { base += qtd[f[0]] * f[3]; });
    var ex = $('[data-extra="excl"]').checked ? base * 0.25 : 0, an = $('[data-extra="anuncio"]').checked ? base * 0.4 : 0, tot = base + ex + an;

    $$('.fmt').forEach(function (li) { var on = qtd[li.dataset.id] > 0; li.classList.toggle('on', on); $('.fmt-escolha', li).setAttribute('aria-pressed', String(on)); });
    $$('[data-q]').forEach(function (o) { o.textContent = qtd[o.dataset.q]; });

    $('.cp-ingr').innerHTML = lista.length ? lista.map(function (f) { return '<li style="--cor:' + f[5] + '"><span>' + qtd[f[0]] + ' × ' + f[1] + '</span></li>'; }).join('') : '<li class="vazio">Escolha pelo menos um formato ao lado.</li>';
    var passos = preparo(t);
    $('.cp-preparo').innerHTML = passos.length ? passos.map(function (p) { return '<li>' + p + '</li>'; }).join('') : '<li>O cronograma aparece quando houver um formato.</li>';

    var vMin = t.reel * 18000 + t.stories * 3500, vMax = t.reel * 45000 + t.stories * 7000;
    $('.cp-rende').innerHTML = (vMax ? 'Entre <b>' + mil(vMin) + '</b> e <b>' + mil(vMax) + '</b> visualizações somando Reels e Stories' : 'Sem Reels nem Stories ainda') +
      (t.carrossel ? '; carrossel com 1,2–3,5 mil curtidas por post' : '') + '. Faixa ilustrativa, não é garantia de resultado.';

    // prato: cada formato ocupa uma fatia do valor
    var ac = 0, fat = lista.map(function (f) { var a = ac, p = base ? qtd[f[0]] * f[3] / base * 100 : 0; ac += p; return f[5] + ' ' + a + '% ' + ac + '%'; });
    $('.prato').style.background = fat.length ? 'conic-gradient(' + fat.join(',') + ')' : 'var(--linha)';

    $('.pr-linhas').innerHTML = lista.map(function (f) { return '<p><span>' + qtd[f[0]] + ' × ' + f[1] + '</span><span>' + real(qtd[f[0]] * f[3]) + '</span></p>'; }).join('') +
      (ex ? '<p><span>Exclusividade 30 dias</span><span>+' + real(ex) + '</span></p>' : '') + (an ? '<p><span>Uso em anúncio 3 meses</span><span>+' + real(an) + '</span></p>' : '');
    $('[data-total]').textContent = real(tot);
    $('[data-pedir]').dataset.wa = 'Olá, Bia! Quero uma proposta com esta composição: ' + resumo() + '. Valor de referência ' + real(tot) + '.';
  }
  function resumo() {
    var l = itens().map(function (f) { return qtd[f[0]] + ' ' + f[1].toLowerCase(); });
    if ($('[data-extra="excl"]').checked) l.push('exclusividade de 30 dias');
    if ($('[data-extra="anuncio"]').checked) l.push('uso em anúncio por 3 meses');
    return l.join(', ') || 'ainda vou escolher os formatos';
  }
  $('.formatos').addEventListener('click', function (e) {
    var esc = e.target.closest('[data-escolher]'), b = e.target.closest('[data-m]');
    if (esc) { var id = esc.dataset.escolher; qtd[id] = qtd[id] ? 0 : 1; total(); }
    else if (b) { qtd[b.dataset.m] = Math.max(0, Math.min(6, qtd[b.dataset.m] + Number(b.dataset.d))); total(); }
  });
  $$('[data-extra]').forEach(function (c) { c.addEventListener('change', total); });
  total();

  // "Incluir ..." nas possibilidades de conteúdo: marca o formato e leva até a campanha
  $$('[data-incluir]').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.dataset.incluir; if (!qtd[id]) qtd[id] = 1; total();
      var li = $('.fmt[data-id="' + id + '"]'); li.classList.remove('pisca'); void li.offsetWidth; li.classList.add('pisca');
      $('#campanha').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      b.textContent = 'Incluído na campanha';
    });
  });

  // ---------- contato: valida e monta a mensagem (a moldura mostra a simulação do WhatsApp) ----------
  var form = $('.form');
  function erro(campo, id, msg) { campo.setAttribute('aria-invalid', msg ? 'true' : 'false'); if (msg) campo.setAttribute('aria-describedby', id); else campo.removeAttribute('aria-describedby'); $('#' + id).textContent = msg || ''; return !msg; }
  function validar() {
    var n = form.nome.value.trim(), m = form.marca.value.trim(), c = form.contato.value.trim();
    var email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c), fone = c.replace(/\D/g, '').length >= 10 && c.replace(/\D/g, '').length <= 13 && !/[a-z@]/i.test(c);
    var ok = [erro(form.nome, 'e-nome', n.length < 2 ? 'Escreva seu nome.' : ''),
      erro(form.marca, 'e-marca', m.length < 2 ? 'Escreva o nome da marca ou empresa.' : ''),
      erro(form.contato, 'e-cont', !c ? 'Informe um WhatsApp ou e-mail.' : (!email && !fone ? 'Use um e-mail válido ou um WhatsApp com DDD.' : ''))];
    return ok.every(Boolean);
  }
  ['nome', 'marca', 'contato'].forEach(function (k) { form[k].addEventListener('input', function () { if (form[k].getAttribute('aria-invalid') === 'true') validar(); }); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = $('.form-ok');
    if (!validar()) { ok.textContent = ''; var p = $('[aria-invalid="true"]', form); if (p) p.focus(); return; }
    var msg = 'Olá, Bia! Sou ' + form.nome.value.trim() + ', da ' + form.marca.value.trim() + ' (' + form.tipo.value.toLowerCase() + ').\n' +
      'Quero publicar: ' + form.quando.value.toLowerCase() + '.\n' +
      ($('#f-comp').checked ? 'Composição que montei: ' + resumo() + ' (valor de referência ' + $('[data-total]').textContent + ').\n' : '') +
      (form.msg.value.trim() ? 'Sobre o produto: ' + form.msg.value.trim() + '\n' : '') +
      'Contato: ' + form.contato.value.trim();
    ok.textContent = 'Mensagem montada. Demonstração: nada foi enviado.';
    if (window.BR_WA) window.BR_WA(msg);
  });

  // ---------- PDF ----------
  $$('[data-imprimir]').forEach(function (b) { b.addEventListener('click', function () { cresce(document); window.print(); }); });
})();
