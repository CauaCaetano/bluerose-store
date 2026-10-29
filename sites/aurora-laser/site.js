// Aurora Laser · áreas com preço por sessão, pacote com desconto, combo acima de 3 áreas, tom de pele → laser e sessões.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var A = {
    f: [['Axila', 89], ['Virilha simples', 99], ['Virilha completa', 159], ['Buço', 59], ['Rosto inteiro', 139], ['Meia perna', 189], ['Perna inteira', 329], ['Braço inteiro', 199], ['Linha alba', 59], ['Glúteo', 129]],
    m: [['Barba', 189], ['Pescoço', 99], ['Peito', 189], ['Abdômen', 169], ['Costas', 259], ['Ombros', 119], ['Axila', 89], ['Braço inteiro', 219], ['Perna inteira', 349], ['Virilha', 149]]
  };
  var g = 'f', sel = {}, tom = null;
  var SES = { 1: 0, 5: 0.2, 10: 0.4 };
  function areas() {
    $('.areas').innerHTML = A[g].map(function (a, i) { return '<button type="button" data-a="' + i + '" aria-pressed="' + !!sel[g + i] + '">' + a[0] + '<small>' + real(a[1]) + ' a sessão</small></button>'; }).join('');
  }
  function conta() {
    var esc = A[g].filter(function (a, i) { return sel[g + i]; }), s = +$('[name=s]:checked').value, d = SES[s];
    var combo = esc.length >= 3 ? 0.1 : 0, porSessao = esc.reduce(function (t, a) { return t + a[1]; }, 0), cheio = porSessao * s, total = cheio * (1 - d) * (1 - combo);
    if (!esc.length) { $('.conta').innerHTML = '<p style="font-size:1.3rem;color:#fff;margin:0">Toque nas áreas ao lado.</p><p>A partir de 3 áreas, mais 10% de desconto no combo.</p>'; return; }
    var parc = Math.min(12, s * 2);
    $('.conta').innerHTML = '<p style="margin:0">' + esc.map(function (a) { return a[0]; }).join(', ') + '</p><p class="grande">' + real(total) + '</p>' +
      (d || combo ? '<p><s>' + real(cheio) + '</s> · economia de ' + real(cheio - total) + '</p>' : '') +
      '<ul><li>' + s + (s > 1 ? ' sessões' : ' sessão') + ', a cada 30 a 45 dias</li><li>' + real(total / s) + ' por sessão' + (combo ? ', com 10% do combo' : '') + '</li><li>em até ' + parc + 'x de ' + real(total / parc) + ' sem juros</li></ul>' +
      '<a class="botao" href="#" data-wa="Olá, Aurora! Quero o pacote de ' + s + ' sessões de ' + esc.map(function (a) { return a[0].toLowerCase(); }).join(', ') + ' por ' + real(total) + (tom !== null ? ' (pele ' + TOM[tom][0] + ')' : '') + '. Posso agendar a sessão teste grátis?">Agendar sessão teste grátis</a>';
  }
  $('.areas').addEventListener('click', function (e) { var b = e.target.closest('[data-a]'); if (!b) return; var k = g + b.dataset.a; sel[k] = !sel[k]; b.setAttribute('aria-pressed', String(!!sel[k])); conta(); });
  $('.corpo').addEventListener('click', function (e) { var b = e.target.closest('[data-g]'); if (!b) return; g = b.dataset.g; $$('[data-g]').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); }); areas(); conta(); });
  $('.sess').addEventListener('change', conta);
  sel.f0 = sel.f2 = true; areas(); conta();

  var TOM = [['muito clara', 'Alexandrite 755 nm', '6 a 8', 'Resposta rápida: a maioria vê diferença já na 2ª sessão.'], ['clara', 'Alexandrite 755 nm', '6 a 8', 'Pele ideal para o laser. Evite bronzear entre as sessões.'], ['morena', 'Diodo 810 nm', '8 a 10', 'Ajustamos a energia para não manchar. Pode fazer o ano inteiro.'], ['morena escura', 'Nd:YAG 1064 nm', '8 a 12', 'O Nd:YAG passa pela pele sem aquecer a melanina dela.'], ['negra', 'Nd:YAG 1064 nm', '10 a 12', 'É o laser mais seguro para pele negra, com resfriamento contínuo. Zero risco de queimadura na técnica certa.']];
  $('.tons').addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]'); if (!b) return; tom = +b.dataset.t;
    $$('[data-t]').forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
    var t = TOM[tom];
    $('.tom-res').innerHTML = '<p style="margin:0 0 6px">Pele <b>' + t[0] + '</b> · laser <b>' + t[1] + '</b></p><p style="margin:0 0 6px">Sessões esperadas: <b>' + t[2] + '</b></p><p style="margin:0">' + t[3] + '</p>';
    conta();
  });
})();
