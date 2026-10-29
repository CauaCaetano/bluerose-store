// Glow · tratamentos por objetivo com preço fora e dentro do clube, planos do clube e economia, unidades por bairro/CEP
// e link de indicação.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var OBJ = [
    ['Manchas e melasma', [['Laser lavieen', 'sala1', 'Clareia manchas de sol e melasma em 3 a 5 sessões.', 590], ['Peeling de ácidos', 'serum', 'Renova a camada de cima da pele, 7 dias de descamação leve.', 320], ['Clareador home care', 'frascos', 'Protocolo para casa, prescrito pela médica.', 189]]],
    ['Rugas e linhas', [['Toxina botulínica', 'm2', 'Testa, glabela e pés de galinha, com retorno em 15 dias.', 1090], ['Bioestimulador', 'sala2', 'Firmeza que aparece em 60 dias e dura até 2 anos.', 2290], ['Ultraformer', 'facial', 'Ultrassom microfocado: efeito lifting sem cortes.', 1890]]],
    ['Acne e poros', [['Limpeza de pele profunda', 'facial', 'Extração, alta frequência e máscara calmante.', 189], ['Laser de CO2 fracionado', 'sala1', 'Suaviza cicatrizes de acne em 3 sessões.', 990], ['Peeling de ácido salicílico', 'serum', 'Controla oleosidade e espinhas ativas.', 260]]],
    ['Viço e hidratação', [['Skinbooster', 'm1', 'Hidratação injetável que dá brilho de dentro para fora.', 1290], ['Hydrafacial', 'facial', 'Limpeza, esfoliação e sérum em 45 minutos.', 450], ['Drenagem facial', 'pedras', 'Desincha e relaxa: ideal antes de eventos.', 160]]],
    ['Corpo', [['Criolipólise', 'sala2', 'Congela gordura localizada: −20% a −25% na área por sessão.', 790], ['Massagem modeladora', 'pedras', 'Pacote de 10 sessões, com drenagem.', 140], ['Radiofrequência corporal', 'sala1', 'Melhora flacidez e celulite.', 220]]]
  ];
  var obj = 0;
  function trats() {
    $$('[data-o]').forEach(function (b) { b.setAttribute('aria-selected', String(+b.dataset.o === obj)); });
    $('.trats').innerHTML = OBJ[obj][1].map(function (t) { return '<article class="trat"><img src="img/' + t[1] + '.webp" alt="' + t[0] + '" loading="lazy"><div><h3 style="font-size:1.35rem">' + t[0] + '</h3><p>' + t[2] + '</p><p class="pr"><b>' + real(t[3]) + '</b><span>' + real(t[3] * 0.8) + ' no clube</span></p><a class="botao" href="#unidades" data-t="' + t[0] + '">Reservar avaliação</a></div></article>'; }).join('');
  }
  $('.objs').innerHTML = OBJ.map(function (o, i) { return '<button role="tab" data-o="' + i + '" aria-selected="false">' + o[0] + '</button>'; }).join('');
  $('.objs').addEventListener('click', function (e) { var b = e.target.closest('[data-o]'); if (b) { obj = +b.dataset.o; trats(); } });
  trats();

  var PL = [['Glow 1', 199, 230, ['R$ 230 em créditos por mês', '20% off no que passar', 'Agenda prioritária']], ['Glow 2', 389, 460, ['R$ 460 em créditos por mês', '20% off no que passar', '1 drenagem de presente por mês', 'Agenda prioritária']], ['Glow Black', 790, 950, ['R$ 950 em créditos por mês', '25% off no que passar', 'Consulta médica trimestral', 'Créditos acumulam por 3 meses']]];
  $('.planos').innerHTML = PL.map(function (p, i) { return '<article class="plano' + (i === 1 ? ' dest' : '') + '">' + (i === 1 ? '<p class="tag">o mais escolhido</p>' : '') + '<h3>' + p[0] + '</h3><p class="p">' + real(p[1]) + '<small>/mês</small></p><ul>' + p[3].map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul><a class="botao" href="#" data-wa="Olá, Glow! Quero assinar o ' + p[0] + ' (' + real(p[1]) + '/mês).">Assinar ' + p[0] + '</a></article>'; }).join('');
  var g = $('#gasto');
  function econ() {
    var v = +g.value; g.previousElementSibling.textContent = real(v);
    var melhor = PL.filter(function (p) { return p[2] <= v * 1.05; }).pop() || PL[0];
    var resto = Math.max(0, v - melhor[2]), novo = melhor[1] + resto * 0.8, eco = v - novo;
    $('.econ-res').innerHTML = eco > 0 ? 'Com o <b>' + melhor[0] + '</b> você pagaria ' + real(novo) + ' pelo mesmo tanto: <b>' + real(eco * 12) + ' a menos por ano</b>.' : 'Gastando ' + real(v) + ' por mês, o clube ainda não compensa. Compensa a partir de ' + real(PL[0][1] * 1.05) + '.';
  }
  g.addEventListener('input', econ); econ();

  var UN = [['Moema', 'Av. Ibirapuera, 2.120', '040'], ['Pinheiros', 'Rua dos Pinheiros, 870', '054'], ['Jardins', 'Rua Oscar Freire, 1.340', '014'], ['Vila Mariana', 'Rua Domingos de Morais, 2.780', '041'], ['Tatuapé', 'Rua Tuiuti, 2.010', '033'], ['Santana', 'Rua Voluntários da Pátria, 3.120', '020'], ['Morumbi', 'Av. Giovanni Gronchi, 5.600', '056'], ['Brooklin', 'Rua Joaquim Nabuco, 380', '045'], ['Perdizes', 'Rua Cardoso de Almeida, 1.150', '050'], ['Santo André', 'Av. Industrial, 600', '090'], ['Alphaville', 'Al. Rio Negro, 1.030', '064']];
  var trat = '';
  var sem = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  function un() {
    var q = sem($('#un-q').value.trim()), d = q.replace(/\D/g, '');
    var l = UN.filter(function (u) { return !q || (d.length >= 2 ? u[2].indexOf(d.slice(0, 3)) === 0 || u[2].slice(0, 2) === d.slice(0, 2) : sem(u[0]).indexOf(q) > -1); });
    if (!l.length) l = UN.slice(0, 3);
    $('.un-lista').innerHTML = l.slice(0, 5).map(function (u) { return '<li><span><b>' + u[0] + '</b><small>' + u[1] + ' · <span>seg a sáb, 8h às 21h</span></small></span><a href="#" data-wa="Olá, Glow! Quero reservar ' + (trat ? trat.toLowerCase() : 'uma avaliação') + ' na unidade ' + u[0] + '.">Reservar</a></li>'; }).join('');
  }
  $('#un-q').addEventListener('input', un);
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) { trat = b.dataset.t; un(); } });
  un();

  var ind = $('#ind');
  ind.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = ind.nome.value.trim().split(' ')[0]; if (n.length < 2) { $('.ind-res').textContent = 'Escreva seu primeiro nome.'; return; }
    var cod = sem(n).replace(/[^a-z]/g, '').toUpperCase().slice(0, 8) + (Date.now() % 900 + 100);
    $('.ind-res').innerHTML = 'Seu código: <code>' + cod + '</code> · mande para as amigas: <a href="#" data-wa="Oi! Use meu código ' + cod + ' na Glow e ganhe R$ 100 no primeiro tratamento.">compartilhar no WhatsApp</a>';
  });
})();
