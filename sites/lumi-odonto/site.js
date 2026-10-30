// Lumi Odontologia · horário vivo (aberto/fechado agora), cabeçalho que fica sólido, abertura que segue o mouse,
// tratamentos em blocos que abrem numa gaveta com simulador de parcelas e depoimentos em trilho. Agendar vai pelo WhatsApp ([data-wa]).
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // cabeçalho: degradê sobre a foto, sólido depois dela
  var topo = $('.topo'), abre = $('.abre');
  function cabecalho() { topo.classList.toggle('cheio', scrollY > abre.offsetHeight - 100); }
  addEventListener('scroll', cabecalho, { passive: true }); cabecalho();

  // a foto de abertura acompanha o mouse devagar; o texto vai no sentido contrário (sensação de profundidade)
  var cena = $('.cena');
  if (cena && !calmo && matchMedia('(pointer: fine)').matches) {
    abre.addEventListener('mousemove', function (e) {
      var x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
      cena.style.transform = 'translate(' + (-x * 24) + 'px,' + (-y * 16) + 'px)';
      $('.abre-txt').style.transform = 'translate(' + (x * 8) + 'px,' + (y * 5) + 'px)';
    });
  }

  // horário: marca o dia de hoje e diz se está aberto agora
  var DIAS = [['Segunda', '08:00–12:00', '14:00–20:00', 8, 20], ['Terça', '08:00–18:00', '', 8, 18], ['Quarta', '08:00–18:00', '', 8, 18], ['Quinta', '08:00–18:00', '', 8, 18], ['Sexta', '08:00–16:00', '', 8, 16], ['Sábado', 'Com hora marcada', '', 0, 0]];
  var agora = new Date(), dia = agora.getDay(), hora = agora.getHours() + agora.getMinutes() / 60;
  $('.h-dias').innerHTML = DIAS.map(function (d, i) { return '<li' + (i + 1 === dia ? ' class="hoje"' : '') + '><b>' + d[0] + '</b>' + d[1] + (d[2] ? '<br>' + d[2] : '') + '</li>'; }).join('');
  var hoje = DIAS[dia - 1], aberto = hoje && hoje[4] && hora >= hoje[3] && hora < hoje[4];
  var prox = (function () { for (var k = 1; k <= 7; k++) { var dd = (dia + k) % 7; if (DIAS[dd - 1] && DIAS[dd - 1][4]) return DIAS[dd - 1]; } })();
  var est = $('.h-agora'); est.classList.toggle('aberto', !!aberto);
  $('span', est).textContent = aberto ? 'Aberto agora' : 'Fechado agora';
  $('.h-prox').textContent = aberto ? 'Até as ' + hoje[4] + 'h de hoje' : (hoje && hoje[4] && hora < hoje[3] ? 'Abre hoje às ' + hoje[3] + 'h' : 'Abre ' + prox[0].toLowerCase() + ' às ' + prox[3] + 'h');

  // tratamentos: 1 bloco grande, 2 empilhados à direita e 3 embaixo; cada um abre uma gaveta com detalhes e parcelas
  var TRAT = [
    ['Implante dentário', 'implante.webp', 'Recupere os dentes que faltam com uma solução fixa, firme e de aparência natural. Avaliamos cada caso e colocamos o implante na própria clínica.', 2490, ['Pino de titânio e coroa de porcelana', 'Planejamento com raio-x digital na clínica', 'Garantia de 5 anos', 'De 3 a 6 meses, dependendo do osso']],
    ['Tratamento de canal', 'canal.webp', 'Tratamento para salvar o seu dente natural.', 590, ['Canal em 1 sessão na maioria dos casos', 'Urgência encaixada no mesmo dia', 'Analgésico já receitado na consulta']],
    ['Aparelho e alinhadores', 'ortodontia.webp', 'Aparelho fixo, de safira ou alinhador transparente, para crianças e adultos.', 4536, ['Alinhador transparente que ninguém percebe', 'Aparelho estético de safira', 'Acompanhamento mensal']],
    ['Clareamento e estética', 'clareamento.webp', 'Um sorriso mais branco e harmônico, que continua natural.', 690, ['Clareamento no consultório e em casa', 'Lentes de contato dental a partir de R$ 1.190 por dente', 'Prova do sorriso antes de colar']],
    ['Limpeza e revisão', 'limpeza.webp', 'Higiene profissional e prevenção para uma boca saudável.', 180, ['Coberta por Amil Dental, SulAmérica Odonto e Odontoprev', 'Revisão a cada 6 meses', 'Lembrete no WhatsApp']],
    ['Dentista das crianças', 'sorriso.webp', 'Consultas calmas e tranquilas para os pequenos.', 180, ['Primeira consulta com brincadeira, sem pressa', 'Selante e flúor', 'Orientação para os pais']]
  ];
  var bloco = function (t, i, g) { return '<button type="button" class="card' + (g ? ' g' : '') + '" data-t="' + i + '"><img src="img/' + t[1] + '" alt="" loading="lazy"><span class="c-in"><span class="c-tit">' + t[0] + '</span><span class="c-desc">' + t[2] + '</span><span class="c-mais">Saiba mais →</span></span></button>'; };
  $('.bento').innerHTML = bloco(TRAT[0], 0, true) + bloco(TRAT[1], 1) + bloco(TRAT[2], 2) + '<div class="linha3">' + bloco(TRAT[3], 3) + bloco(TRAT[4], 4) + bloco(TRAT[5], 5) + '</div>';
  var gv = $('#gaveta');
  function abrir(i) {
    var t = TRAT[i], parcela = t[3] >= 500;
    $('.gv-corpo', gv).innerHTML = '<button type="button" class="gv-fecha" aria-label="Fechar">×</button><img src="img/' + t[1] + '" alt="' + t[0] + '"><div class="gv-txt"><p class="rotulo">Tratamento</p><h3 id="gv-t">' + t[0] + '</h3><ul>' + t[4].map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul><p>a partir de</p><p class="gv-preco">' + real(t[3]) + '</p>' +
      (parcela ? '<div class="gv-sim"><label>Parcelas sem juros <output>12x</output></label><input type="range" min="1" max="18" value="12" aria-label="Número de parcelas"><p class="gv-parc"></p><p style="font-size:13px;color:var(--cinza)">Valor de partida. O do seu caso sai na avaliação, por escrito. No Pix, 5% de desconto.</p></div>' : '') +
      '<a class="bt-verde" href="#" data-wa="Olá, Lumi! Quero agendar uma avaliação para ' + t[0].toLowerCase() + '.">Agendar avaliação</a></div>';
    var r = $('input[type=range]', gv);
    function parc() { var n = +r.value; $('output', gv).textContent = n + 'x'; $('.gv-parc', gv).textContent = n + 'x de ' + real(Math.ceil(t[3] / n * 100) / 100); }
    if (r) { r.addEventListener('input', parc); parc(); }
    gv.showModal();
  }
  $('.bento').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) abrir(+b.dataset.t); });
  gv.addEventListener('click', function (e) { if (e.target === gv || e.target.closest('.gv-fecha')) gv.close(); });

  // depoimentos: trilho com setas e contador "1–3 / 9"
  var DEP = [['Estava de passagem por Campinas e tive uma urgência. A dentista foi muito profissional e me atendeu em poucas horas. Recomendo demais.', 'Keila M.'], ['Minha coroa soltou numa sexta à tarde. Liguei e consegui horário na mesma hora para colar de volta. Atendimento excelente.', 'Cláudio C.'], ['A melhor! Muito profissional e gente muito boa. A Dra. Beatriz faz um trabalho maravilhoso com implantes.', 'D. E.'],
             ['A melhor experiência que já tive com dentista. Dá para confiar 100%.', 'Marta R.'], ['Explicou tudo antes de começar e o preço do orçamento foi o preço do fim.', 'Juliana M.'], ['Levo minha filha desde os 6 anos. Ela pede para ir ao dentista.', 'Carolina R.'],
             ['Fiz o alinhador e ninguém no trabalho percebeu.', 'Felipe A.'], ['Clareamento sem sensibilidade, coisa que nunca tinha conseguido.', 'Patrícia L.'], ['Canal sem dor e em uma sessão só. Não acreditei.', 'Rodrigo S.']];
  var tr = $('.dp-trilho');
  tr.innerHTML = DEP.map(function (d) { return '<article><p class="est" aria-label="5 estrelas">★★★★★</p><q>' + d[0] + '</q><span>' + d[1] + '</span></article>'; }).join('');
  function conta() { var w = tr.firstElementChild.offsetWidth + 18, i = Math.round(tr.scrollLeft / w), n = Math.max(1, Math.round(tr.clientWidth / w)); $('.dp-cont').textContent = (i + 1) + '–' + Math.min(DEP.length, i + n) + ' / ' + DEP.length; }
  $('.dp-prox').addEventListener('click', function () { tr.scrollBy({ left: tr.clientWidth, behavior: 'smooth' }); });
  $('.dp-ant').addEventListener('click', function () { tr.scrollBy({ left: -tr.clientWidth, behavior: 'smooth' }); });
  tr.addEventListener('scroll', function () { requestAnimationFrame(conta); }, { passive: true }); conta();

  // menu: marca a seção que está na tela
  var links = $$('.menu a');
  var obs = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) links.forEach(function (a) { a.classList.toggle('ativo', a.getAttribute('href') === '#' + en.target.id); }); }); }, { rootMargin: '-45% 0px -50% 0px' });
  ['inicio', 'urgencia', 'tratamentos', 'clinica', 'dra', 'contato'].forEach(function (id) { var el = document.getElementById(id); if (el) obs.observe(el); });
})();
