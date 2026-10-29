// Ferreira Reformas · orçamento em 4 passos: cada resposta avança sozinha; no fim, faixa de preço e prazo.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + (Math.round(v / 100) * 100).toLocaleString('pt-BR'); };
  // preço por m² no padrão, dias base e dias por m², dica de tamanho
  var T = {
    banheiro: ['banheiro', 2150, 6, 0.4, 'Banheiro social costuma ter de 3 a 6 m².', 6, 2, 20],
    cozinha: ['cozinha', 1650, 12, 0.5, 'Cozinha de apartamento fica entre 6 e 12 m².', 10, 4, 40],
    piso: ['piso', 190, 3, 0.12, 'Some a área dos cômodos. Apartamento de 2 quartos tem uns 60 m².', 60, 10, 120],
    pintura: ['pintura', 48, 2, 0.06, 'Use a área do piso: calculamos paredes e teto a partir dela.', 70, 10, 120]
  };
  var q = $('#quiz'), passo = 0;
  function ir(p) {
    passo = p;
    $$('.q-passo', q).forEach(function (f) { f.hidden = +f.dataset.p !== p; });
    $('.q-res', q).hidden = p < 4;
    $('.q-barra i', q).style.width = Math.min(100, (p + 1) * 25) + '%';
    $('.q-volta', q).hidden = p === 0;
    if (p === 1) { var t = T[q.tipo.value]; q.m2.min = t[6]; q.m2.max = t[7]; q.m2.value = t[5]; $('.q-dica', q).textContent = t[4]; m2(); }
    if (p === 4) resultado();
    var f = $('.q-passo:not([hidden]) input, .q-res .botao', q); if (f && p > 0) f.focus({ preventScroll: true });
  }
  function m2() { q.m2.previousElementSibling.textContent = q.m2.value + ' m²'; }
  q.m2.addEventListener('input', m2);
  q.m2.addEventListener('change', function () { setTimeout(function () { ir(2); }, 350); });
  q.addEventListener('change', function (e) {
    if (e.target.name === 'tipo') ir(1); else if (e.target.name === 'ac') ir(3); else if (e.target.name === 'qd') ir(4);
  });
  // no teclado ou no celular o controle deslizante não dispara "change" sozinho: um botão também avança
  var seg = document.createElement('button'); seg.type = 'button'; seg.className = 'botao'; seg.textContent = 'Continuar'; seg.style.marginTop = '18px';
  seg.addEventListener('click', function () { ir(2); }); $('[data-p="1"]', q).appendChild(seg);
  $('.q-volta', q).addEventListener('click', function () { ir(passo === 4 ? 3 : passo - 1); });

  function resultado() {
    var t = T[q.tipo.value], m = +q.m2.value, ac = +q.ac.value, base = t[1] * m * ac;
    var dias = Math.round(t[2] + t[3] * m), nivel = $('[name=ac]:checked + span b', q).textContent.toLowerCase();
    $('.q-res', q).innerHTML = '<p style="margin:0;font-weight:700">Reforma de ' + t[0] + ', ' + m + ' m², ' + nivel + '</p><p class="q-faixa">' + real(base * 0.9) + ' <small style="font-size:.5em;font-weight:700">a ' + real(base * 1.12) + '</small></p>' +
      '<ul><li>Prazo de ' + dias + ' a ' + (dias + 3) + ' dias úteis, com multa por atraso</li><li>Material e mão de obra inclusos</li><li>Em até 12x no cartão, ou 6% de desconto à vista</li></ul>' +
      '<a class="botao" href="#" data-wa="Olá, Ferreira! Fiz o orçamento no site: reforma de ' + t[0] + ', ' + m + ' m², acabamento ' + nivel + ', ' + q.qd.value + '. Estimativa ' + real(base * 0.9) + ' a ' + real(base * 1.12) + '. Posso mandar fotos?">Mandar fotos e fechar o valor</a>';
  }
  ir(0);
})();
