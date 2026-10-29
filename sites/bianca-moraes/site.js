// Dra. Bianca Moraes · pontos do rosto → procedimento, preço, duração e recuperação; avaliação pelo WhatsApp.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var Z = {
    testa: ['Botox na testa e pés de galinha', 'Suaviza as linhas de expressão sem travar o rosto: você continua franzindo a testa, só que sem marcar.', 'R$ 1.190', '4 a 6 meses', 'nenhuma'],
    olheira: ['Preenchimento de olheiras', 'Ácido hialurônico em pouca quantidade no sulco abaixo do olho. Tira o ar de cansaço.', 'R$ 1.590', '12 a 18 meses', '1 a 2 dias de leve inchaço'],
    malar: ['Maçã do rosto', 'Devolve o volume que o rosto perde com o tempo e levanta o terço médio, sem efeito de bochecha.', 'R$ 1.890', '18 meses', '1 dia'],
    labios: ['Preenchimento labial', 'Contorno e hidratação com 0,5 a 1 ml. Definimos juntas o formato antes de começar.', 'R$ 1.390', '9 a 12 meses', '2 dias de inchaço'],
    mandibula: ['Contorno de mandíbula e queixo', 'Marca o ângulo da mandíbula e equilibra o perfil. É o que mais muda a foto de lado.', 'R$ 2.990', '18 a 24 meses', '2 a 3 dias'],
    pele: ['Bioestimulador de colágeno', 'Estimula o seu próprio colágeno para firmar a pele do rosto e do pescoço. O resultado aparece aos poucos, em 60 dias.', 'R$ 2.490 por sessão', 'até 2 anos', 'nenhuma']
  };
  var atual = 'ainda não sei';
  document.querySelector('.foto').addEventListener('click', function (e) {
    var b = e.target.closest('[data-z]'); if (!b) return;
    [].forEach.call(document.querySelectorAll('[data-z]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    var z = Z[b.dataset.z]; atual = z[0];
    $('.painel').innerHTML = '<h3>' + z[0] + '</h3><p style="color:var(--tx-2);margin:0">' + z[1] + '</p><dl><div><dt>a partir de</dt><dd>' + z[2] + '</dd></div><div><dt>dura</dt><dd>' + z[3] + '</dd></div><div><dt>recuperação</dt><dd>' + z[4] + '</dd></div></dl><a class="botao" href="#agendar">Avaliar ' + z[0].split(' ')[0].toLowerCase() + ' de graça</a>';
    $('.ag-z b').textContent = z[0].toLowerCase();
  });
  [].forEach.call(document.querySelectorAll('[data-z]'), function (b) { b.setAttribute('aria-pressed', 'false'); });

  var f = $('#ag');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = f.nome.value.trim(), t = f.tel.value.replace(/\D/g, ''), er = $('.erro', f);
    er.textContent = n.length < 2 ? 'Escreva seu nome.' : t.length < 10 ? 'Confira o WhatsApp com DDD.' : '';
    if (er.textContent) return;
    window.BR_WA && window.BR_WA('Olá, Dra. Bianca! Sou ' + n + ' e quero a avaliação grátis. Interesse: ' + atual.toLowerCase() + '.');
    f.innerHTML = '<p style="grid-column:1/-1;font-family:var(--serif);font-size:1.6rem">Obrigada, ' + n.split(' ')[0] + '. Te chamo no WhatsApp ainda hoje.</p>';
  });
})();
