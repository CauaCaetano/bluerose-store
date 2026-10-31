// Lumi Odontologia · horário vivo (aberto/fechado agora), cabeçalho que fica sólido, abertura que segue o mouse,
// menu do celular, tratamentos em blocos que levam à página de cada um e simulador de parcelas nas páginas de tratamento.
// Agendar vai pelo WhatsApp ([data-wa]). Cada bloco só roda se a página tiver o elemento dele.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // cabeçalho: degradê sobre a foto, sólido depois dela
  var topo = $('.topo'), abre = $('.abre');
  function cabecalho() { topo.classList.toggle('cheio', !abre || scrollY > abre.offsetHeight - 100); }
  addEventListener('scroll', cabecalho, { passive: true }); cabecalho();

  // menu do celular
  var mb = $('.menu-bt');
  if (mb) {
    var fecha = function () { topo.classList.remove('aberto'); mb.setAttribute('aria-expanded', 'false'); mb.setAttribute('aria-label', 'Abrir menu'); };
    mb.addEventListener('click', function () { var ab = topo.classList.toggle('aberto'); mb.setAttribute('aria-expanded', String(ab)); mb.setAttribute('aria-label', ab ? 'Fechar menu' : 'Abrir menu'); });
    $$('.menu a').forEach(function (a) { a.addEventListener('click', fecha); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && topo.classList.contains('aberto')) { fecha(); mb.focus(); } });
    addEventListener('resize', function () { if (innerWidth > 1000) fecha(); });
  }

  // a foto de abertura acompanha o mouse devagar; o texto vai no sentido contrário (sensação de profundidade)
  var cena = $('.cena');
  if (cena && abre && !calmo && matchMedia('(pointer: fine)').matches) {
    abre.addEventListener('mousemove', function (e) {
      var x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
      cena.style.transform = 'translate(' + (-x * 24) + 'px,' + (-y * 16) + 'px)';
      $('.abre-txt').style.transform = 'translate(' + (x * 8) + 'px,' + (y * 5) + 'px)';
    });
  }

  // horário: marca o dia de hoje e diz se está aberto agora
  var lista = $('.h-dias');
  if (lista) {
    var DIAS = [['Segunda', '08:00–12:00', '14:00–20:00', 8, 20], ['Terça', '08:00–18:00', '', 8, 18], ['Quarta', '08:00–18:00', '', 8, 18], ['Quinta', '08:00–18:00', '', 8, 18], ['Sexta', '08:00–16:00', '', 8, 16], ['Sábado', 'Com hora marcada', '', 0, 0]];
    var agora = new Date(), dia = agora.getDay(), hora = agora.getHours() + agora.getMinutes() / 60;
    lista.innerHTML = DIAS.map(function (d, i) { return '<li' + (i + 1 === dia ? ' class="hoje"' : '') + '><b>' + d[0] + '</b>' + d[1] + (d[2] ? '<br>' + d[2] : '') + '</li>'; }).join('');
    var hoje = DIAS[dia - 1], aberto = hoje && hoje[4] && hora >= hoje[3] && hora < hoje[4];
    var prox = (function () { for (var k = 1; k <= 7; k++) { var dd = (dia + k) % 7; if (DIAS[dd - 1] && DIAS[dd - 1][4]) return DIAS[dd - 1]; } })();
    var est = $('.h-agora'); est.classList.toggle('aberto', !!aberto);
    $('span', est).textContent = aberto ? 'Aberto agora' : 'Fechado agora';
    $('.h-prox').textContent = aberto ? 'Até as ' + hoje[4] + 'h de hoje' : (hoje && hoje[4] && hora < hoje[3] ? 'Abre hoje às ' + hoje[3] + 'h' : 'Abre ' + prox[0].toLowerCase() + ' às ' + prox[3] + 'h');
  }

  // tratamentos: 1 bloco grande, 2 empilhados à direita e 3 embaixo; cada um leva à página do tratamento
  var bento = $('.bento');
  if (bento) {
    var TRAT = [
      ['Implante dentário', 'implante.webp', 'Uma solução fixa para os dentes que faltam, planejada com raio-x digital e colocada na própria clínica.', 'tratamento-implante.html'],
      ['Tratamento de canal', 'canal.webp', 'Tratamento para tentar salvar o seu dente natural.', 'tratamento-canal.html'],
      ['Aparelho e alinhadores', 'ortodontia.webp', 'Aparelho fixo, de safira ou alinhador transparente, para crianças e adultos.', 'tratamento-aparelho.html'],
      ['Clareamento e estética', 'clareamento.webp', 'Clareamento e lentes de contato dental, com prova do sorriso antes.', 'tratamento-clareamento.html'],
      ['Limpeza e revisão', 'limpeza.webp', 'Higiene profissional e prevenção para uma boca saudável.', 'tratamento-limpeza.html'],
      ['Dentista das crianças', 'sorriso.webp', 'Consultas calmas e tranquilas para os pequenos.', 'tratamento-criancas.html']
    ];
    var bloco = function (t, g) { return '<a class="card' + (g ? ' g' : '') + '" href="' + t[3] + '"><img src="img/' + t[1] + '" alt="" loading="lazy"><span class="c-in"><span class="c-tit">' + t[0] + '</span><span class="c-desc">' + t[2] + '</span><span class="c-mais">Saiba mais →</span></span></a>'; };
    bento.innerHTML = bloco(TRAT[0], true) + bloco(TRAT[1]) + bloco(TRAT[2]) + '<div class="linha3">' + bloco(TRAT[3]) + bloco(TRAT[4]) + bloco(TRAT[5]) + '</div>';
  }

  // simulador de parcelas das páginas de tratamento e de pagamento
  $$('.gv-sim[data-preco]').forEach(function (s) {
    var r = $('input[type=range]', s), valor = +s.dataset.preco;
    function parc() { var n = +r.value; $('output', s).textContent = n + 'x'; $('.gv-parc', s).textContent = n + 'x de ' + real(Math.ceil(valor / n * 100) / 100); }
    r.addEventListener('input', parc); parc();
  });
})();
