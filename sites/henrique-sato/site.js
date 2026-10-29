// Dr. Henrique Sato · resposta para cada dor, calculadora de implante e formulário da avaliação.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };

  var DOR = {
    dentadura: '<b>Com o protocolo fixo, a dentadura vai embora.</b> São 4 a 6 implantes que seguram uma arcada inteira, presa no osso. Você morde maçã, come carne e não tira para dormir.',
    medo: '<b>Você pode fazer dormindo.</b> Um médico anestesista acompanha a sedação do começo ao fim. Mais da metade dos nossos pacientes chegam dizendo que têm pavor.',
    vergonha: '<b>Em 72 horas você já sorri com dente fixo.</b> Ninguém fica sem dente no meio do tratamento: o provisório entra junto com o implante.',
    preco: '<b>Um implante sai a partir de R$ 2.290, em até 24x de R$ 95.</b> Menos que trocar a dentadura de 5 em 5 anos, e o preço fica escrito no plano antes de começar.',
    osso: '<b>Falta de osso quase sempre tem solução.</b> Enxerto no mesmo dia ou implante zigomático, que se apoia no osso da face. A tomografia grátis mostra o seu caso em 20 minutos.'
  };
  document.querySelector('.dores-lista').addEventListener('click', function (e) {
    var b = e.target.closest('[data-dor]'); if (!b) return;
    [].forEach.call(document.querySelectorAll('[data-dor]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    $('.resposta').innerHTML = '<p>' + DOR[b.dataset.dor] + '</p><p style="margin-top:14px"><a class="link" href="#avaliacao">Agendar avaliação grátis</a></p>';
  });

  // preços de partida por caso; sedação soma por sessão
  var CASO = { '1': ['1 implante com coroa de porcelana', 2290], '3': ['3 implantes com coroas', 6490], arcada: ['protocolo fixo, uma arcada', 14900], duas: ['protocolo fixo, duas arcadas', 27900] };
  var calc = $('#calc');
  function conta() {
    var c = CASO[calc.q.value], sed = +calc.sed.value, total = c[1] + sed;
    $('.qt-res').innerHTML = '<p>' + c[0] + (sed ? ' + sedação' : '') + '</p><p class="grande">' + real(total) + '</p><p>ou 24x de <b>' + real(Math.ceil(total / 24)) + '</b> · à vista no Pix ' + real(total * 0.92) + '</p><p style="font-size:.9rem">Inclui tomografia, cirurgia guiada, dente provisório em 72 h e definitivo com 10 anos de garantia.</p><a class="botao" href="#avaliacao">Confirmar na avaliação grátis</a>';
    return c[0];
  }
  calc.addEventListener('change', conta); conta();

  var f = $('#form');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = f.nome.value.trim(), tel = f.tel.value.replace(/\D/g, ''), er = $('.erro', f);
    er.textContent = nome.length < 2 ? 'Escreva seu nome.' : tel.length < 10 ? 'Confira o WhatsApp com DDD.' : '';
    if (er.textContent) return;
    window.BR_WA && window.BR_WA('Olá, Dr. Henrique! Sou ' + nome + ' e quero a avaliação com tomografia grátis. Meu caso: ' + conta() + '.');
    f.innerHTML = '<p style="font-size:1.3rem;font-weight:700">Horário pré-reservado, ' + nome.split(' ')[0] + '.</p><p>A secretária confirma no seu WhatsApp em até 10 minutos.</p>';
  });
})();
