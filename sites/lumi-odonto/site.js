// Lumi Odontologia · agendamento da avaliação (vai pelo WhatsApp), tratamento já marcado a partir dos cartões
// e simulador de parcelas.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var real = function (v) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); };

  // os botões "Avaliar meu caso" levam ao formulário com o tratamento já escolhido
  var ag = $('#agendar');
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-trat]'); if (!b || !ag.trat) return;
    [].forEach.call(ag.trat.options, function (o) { if (o.text.indexOf(b.dataset.trat) === 0) ag.trat.value = o.value; });
    setTimeout(function () { ag.nome.focus({ preventScroll: true }); }, 450);
  });
  ag.addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = ag.nome.value.trim(), tel = ag.tel.value.replace(/\D/g, ''), erro = $('.erro', ag);
    erro.textContent = nome.length < 2 ? 'Escreva seu nome.' : tel.length < 10 ? 'Confira o WhatsApp com DDD.' : '';
    if (erro.textContent) return;
    var per = ag.querySelector('[name=per]:checked').value, trat = ag.trat.value;
    window.BR_WA && window.BR_WA('Olá, Lumi! Sou ' + nome + ' e quero agendar a avaliação grátis. Tratamento: ' + trat.toLowerCase() + '. Melhor horário: ' + per + '.');
    ag.classList.add('ok');
    ag.innerHTML = '<p class="ag-t">Pronto, ' + nome.split(' ')[0] + '!</p><p class="ag-sub">Sua avaliação grátis está pré-reservada. A recepção chama no seu WhatsApp em até 15 minutos para confirmar o horário da ' + per + '.</p>';
  });

  // simulador de parcelas: até 18x sem juros
  var s = $('#simula');
  function conta() {
    var v = +s.t.value, n = +s.n.value, nome = s.t.options[s.t.selectedIndex].text.split(' · ')[0];
    s.n.previousElementSibling.textContent = n + 'x';
    $('.pr-res').innerHTML = '<p>' + nome + ' em ' + n + 'x sem juros</p><p class="grande">' + real(Math.ceil(v / n * 100) / 100) + '<small style="font-size:1rem;font-weight:600"> /mês</small></p><p>Total de ' + real(v) + '. À vista no Pix, 5% de desconto: ' + real(Math.round(v * 0.95)) + '.</p><a class="botao botao-g" href="#agendar" data-trat="' + nome.split(',')[0] + '">Quero essa condição</a>';
  }
  s.addEventListener('input', conta); conta();
})();
