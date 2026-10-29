// Sorriso Prime · buscador de unidade, horários livres por unidade e dia, checagem de convênio,
// tabela de tratamentos e proposta para empresas.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
  var sem = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };

  // nome, bairros atendidos, endereço, abre, fecha, abre domingo
  var UN = [
    ['Savassi', 'savassi funcionarios lourdes centro', 'Rua Pernambuco, 1.120', 7, 22, true],
    ['Pampulha', 'pampulha ouro preto sao luiz', 'Av. Otacílio Negrão, 880', 8, 20, false],
    ['Buritis', 'buritis estoril havai', 'Av. Prof. Mário Werneck, 1.540', 8, 21, true],
    ['Barreiro', 'barreiro milionarios', 'Av. Afonso Vaz de Melo, 640', 8, 20, false],
    ['Venda Nova', 'venda nova santa monica', 'Rua Padre Pedro Pinto, 2.130', 8, 21, true],
    ['Castelo', 'castelo ouro preto', 'Rua Castelo de Lisboa, 210', 8, 20, false],
    ['Contagem · Eldorado', 'contagem eldorado', 'Av. João César de Oliveira, 1.870', 8, 22, true],
    ['Nova Lima · Vila da Serra', 'nova lima vila da serra belvedere', 'Alameda Oscar Niemeyer, 1.033', 8, 20, false],
    ['Betim · Centro', 'betim', 'Av. Governador Valadares, 512', 8, 20, true]
  ];
  var agora = new Date(), hora = agora.getHours(), dom = agora.getDay() === 0;
  var aberta = function (u) { return (!dom || u[5]) && hora >= u[3] && hora < u[4]; };
  $('#bairros').innerHTML = UN.map(function (u) { return '<option value="' + u[0] + '">'; }).join('');
  var filtro = 'todas', termo = '', sel = -1;

  function listar() {
    var q = sem(termo.trim());
    var lista = UN.map(function (u, i) { return [u, i]; }).filter(function (x) {
      var u = x[0]; if (filtro === 'agora' && !aberta(u)) return false; if (filtro === 'domingo' && !u[5]) return false;
      return !q || sem(u[0] + ' ' + u[1]).indexOf(q) > -1;
    });
    $('.un-lista').innerHTML = lista.length ? lista.map(function (x) {
      var u = x[0], i = x[1];
      return '<li><button type="button" data-u="' + i + '" aria-pressed="' + (i === sel) + '"><b>' + u[0] + '</b><small>' + u[2] + ' · ' + u[3] + 'h às ' + u[4] + 'h' + (u[5] ? ' · domingo' : '') + '</small><em class="' + (aberta(u) ? 'aberta">aberta agora' : 'fechada">abre às ' + u[3] + 'h') + '</em></button></li>';
    }).join('') : '<li class="un-vazia">Nenhuma unidade com esse nome. A mais perto do centro é a <b>Savassi</b>, aberta até 22h.</li>';
  }
  $('.un-filtro').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (!b) return; filtro = b.dataset.f; $$('[data-f]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); listar(); });
  $('#onde').addEventListener('input', function (e) { termo = e.target.value; listar(); });
  $('#buscador').addEventListener('submit', function (e) {
    e.preventDefault(); termo = $('#onde').value; listar();
    var primeiro = $('.un-lista [data-u]'); if (primeiro) abrir(+primeiro.dataset.u);
    $('#unidades').scrollIntoView({ behavior: 'smooth' });
  });

  // horários livres: fixos por unidade e dia (simulação), só a partir da hora atual no dia de hoje
  var diaSel = 0, horaSel = '';
  function abrir(i) {
    sel = i; listar(); diaSel = 0; horaSel = ''; desenharHorarios();
  }
  function desenharHorarios() {
    var u = UN[sel], dias = [];
    for (var k = 0; dias.length < 6; k++) { var d = new Date(); d.setDate(d.getDate() + k); if (d.getDay() !== 0 || u[5]) dias.push(d); }
    var d = dias[diaSel], hoje = d.toDateString() === new Date().toDateString(), slots = [];
    for (var h = u[3]; h < u[4]; h++) [0, 30].forEach(function (m) {
      if (hoje && (h < hora + 1)) return;
      if ((d.getDate() * 7 + h * 3 + m + sel * 5) % 5 > 1) slots.push(String(h).padStart(2, '0') + ':' + (m ? '30' : '00'));
    });
    var oque = $('#oque').options[$('#oque').selectedIndex].text;
    $('.horarios').innerHTML = '<h3 style="margin:0">' + u[0] + '</h3><p style="margin:0;color:var(--tx-2)">' + oque + '</p>' +
      '<div class="dias">' + dias.map(function (x, k) { return '<button type="button" data-d="' + k + '" aria-pressed="' + (k === diaSel) + '">' + (k === 0 && x.toDateString() === new Date().toDateString() ? 'Hoje' : x.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })) + '</button>'; }).join('') + '</div>' +
      (slots.length ? '<div class="slots">' + slots.slice(0, 16).map(function (s) { return '<button type="button" data-h="' + s + '" aria-pressed="' + (s === horaSel) + '">' + s + '</button>'; }).join('') + '</div>' : '<p>Sem horário hoje. Veja amanhã.</p>') +
      '<a class="botao" href="#" data-wa="Olá, Sorriso Prime! Quero ' + oque.toLowerCase() + ' na unidade ' + u[0] + (horaSel ? ', ' + d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }) + ' às ' + horaSel : '') + '.">' + (horaSel ? 'Reservar ' + horaSel : 'Escolha um horário') + '</a>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-u]'); if (b) { abrir(+b.dataset.u); return; }
    var d = e.target.closest('.horarios [data-d]'); if (d) { diaSel = +d.dataset.d; horaSel = ''; desenharHorarios(); return; }
    var h = e.target.closest('.horarios [data-h]'); if (h) { horaSel = h.dataset.h; desenharHorarios(); }
  });
  $('#oque').addEventListener('change', function () { if (sel > -1) desenharHorarios(); });
  listar();

  // convênios: o que cada um cobre
  var COB = ['Consulta e urgência', 'Limpeza e flúor', 'Restauração', 'Canal', 'Extração', 'Aparelho', 'Implante'];
  var PL = { 'odontoprev': [1, 1, 1, 1, 1, 0, 0], 'amil dental': [1, 1, 1, 1, 1, 1, 0], 'sulamerica odonto': [1, 1, 1, 1, 1, 1, 0], 'bradesco dental': [1, 1, 1, 1, 1, 0, 0], 'metlife': [1, 1, 1, 1, 1, 1, 1], 'unimed odonto': [1, 1, 1, 1, 1, 0, 0], 'porto seguro odonto': [1, 1, 1, 1, 1, 1, 0], 'hapvida odonto': [1, 1, 1, 0, 1, 0, 0], 'uniodonto': [1, 1, 1, 1, 1, 0, 0] };
  function cv() {
    var q = sem($('#plano').value.trim()), r = $('.cv-res');
    if (q.length < 3) { r.innerHTML = '<p style="color:var(--tx-2)">Aceitamos ' + Object.keys(PL).length * 4 + ' planos, entre eles Odontoprev, Amil, SulAmérica, Bradesco e MetLife.</p>'; return; }
    var k = Object.keys(PL).find(function (p) { return p.indexOf(q) > -1 || q.indexOf(p.split(' ')[0]) > -1; });
    if (!k) { r.innerHTML = '<p><b>Não achamos esse plano.</b> Atendemos particular com 20% de desconto para quem não tem convênio, em até 18x.</p><a class="botao" href="#" data-wa="Olá! Meu plano é ' + $('#plano').value.trim() + '. Vocês atendem?">Perguntar pelo WhatsApp</a>'; return; }
    r.innerHTML = '<p><b style="text-transform:capitalize">' + k + '</b> é aceito em todas as 9 unidades.</p><ul>' + COB.map(function (c, i) { return '<li>' + c + (PL[k][i] ? '<span class="sim">coberto</span>' : '<span class="nao">particular, com 20% off</span>') + '</li>'; }).join('') + '</ul><a class="botao" href="#unidades">Agendar pelo convênio</a>';
  }
  $('#plano').addEventListener('input', cv); cv();

  // tratamentos por aba
  var AB = [
    [['Avaliação', 'Exame clínico e plano por escrito.', 'grátis', ''], ['Limpeza', 'Profilaxia, tártaro e flúor.', 'R$ 149', 'ou pelo convênio'], ['Restauração', 'Resina na cor do dente.', 'R$ 180', 'por face']],
    [['Clareamento', 'Consultório + moldeira para casa.', 'R$ 590', 'ou 6x de R$ 98'], ['Lentes de contato', 'Porcelana de 0,3 mm.', 'R$ 990', 'por dente, até 18x'], ['Gengivoplastia', 'Sorriso gengival corrigido.', 'R$ 890', 'ou 10x de R$ 89']],
    [['Aparelho fixo', 'Metálico, manutenção inclusa.', 'R$ 129', 'por mês'], ['Aparelho estético', 'Safira, quase invisível.', 'R$ 199', 'por mês'], ['Alinhador', 'Placas transparentes digitais.', 'R$ 289', 'por mês, 18x']],
    [['Implante unitário', 'Pino e coroa em porcelana.', 'R$ 1.990', 'em até 18x'], ['Protocolo fixo', 'Arcada inteira em 72 h.', 'R$ 12.900', 'em até 24x'], ['Enxerto ósseo', 'Quando falta osso.', 'R$ 890', 'por região']]
  ];
  function aba(i) {
    $$('[data-aba]').forEach(function (b) { b.setAttribute('aria-selected', String(+b.dataset.aba === i)); });
    $('.aba-painel').innerHTML = AB[i].map(function (t) { return '<article class="item"><b>' + t[0] + '</b><p>' + t[1] + '</p><p class="pr">' + t[2] + '<small>' + t[3] + '</small></p><a class="botao" href="#" data-wa="Olá, Sorriso Prime! Quero agendar ' + t[0].toLowerCase() + '.">Agendar</a></article>'; }).join('');
  }
  $('.abas').addEventListener('click', function (e) { var b = e.target.closest('[data-aba]'); if (b) aba(+b.dataset.aba); }); aba(0);

  // empresas
  var emp = $('#emp');
  function ec() {
    var n = Math.max(2, +emp.n.value || 2), p = n >= 200 ? 19.9 : n >= 50 ? 22.9 : 24.9;
    $('.emp-conta').innerHTML = real(p) + ' por funcionário · <b>' + real(Math.round(n * p * 100) / 100) + ' por mês</b>';
    $('[data-wa-emp]').setAttribute('data-wa', 'Olá, Sorriso Prime! Quero proposta do plano para ' + n + ' funcionários.');
  }
  emp.addEventListener('input', ec); emp.addEventListener('submit', function (e) { e.preventDefault(); }); ec();
})();
