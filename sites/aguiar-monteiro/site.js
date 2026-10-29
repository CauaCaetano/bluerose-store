// Aguiar & Monteiro · prazo de 2 anos para a ação, rescisão pela CLT (estimativa) e direitos extras.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };

  // prazo prescricional: 2 anos depois da saída
  var sd = $('#saida'), hoje = new Date();
  sd.max = hoje.toISOString().slice(0, 7);
  var ini = new Date(hoje); ini.setMonth(ini.getMonth() - 3); sd.value = ini.toISOString().slice(0, 7);
  function prazo() {
    if (!sd.value) return;
    var p = sd.value.split('-'), lim = new Date(+p[0] + 2, +p[1] - 1, 1), meses = (lim.getFullYear() - hoje.getFullYear()) * 12 + lim.getMonth() - hoje.getMonth();
    $('.prazo-res').innerHTML = meses > 0 ? 'Seu prazo vai até <b>' + lim.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) + '</b>: restam ' + meses + ' meses.' : '<b>O prazo de 2 anos já passou.</b> Fale com a gente: alguns direitos, como FGTS, têm regras próprias.';
  }
  sd.addEventListener('input', prazo); prazo();

  var r = $('#resc');
  function resc() {
    var s = Math.max(0, +r.sal.value), m = Math.max(1, +r.meses.value), mot = r.mot.value, anos = Math.floor(m / 12);
    var mesesAno = m % 12 || 12, linhas = [];
    linhas.push(['Saldo de salário (15 dias)', s / 2]);
    if (mot !== 'justa') linhas.push(['13º proporcional (' + mesesAno + '/12)', s * mesesAno / 12]);
    if (mot !== 'justa') linhas.push(['Férias proporcionais + 1/3', s * mesesAno / 12 * 4 / 3]);
    if (r.ferias.checked) linhas.push(['Férias vencidas + 1/3', s * 4 / 3]);
    var avisoDias = Math.min(90, 30 + 3 * anos);
    if (mot === 'sem' && !r.aviso.checked) linhas.push(['Aviso prévio indenizado (' + avisoDias + ' dias)', s * avisoDias / 30]);
    if (mot === 'acordo' && !r.aviso.checked) linhas.push(['Metade do aviso prévio', s * avisoDias / 60]);
    var fgts = s * 0.08 * m;
    if (mot === 'sem') linhas.push(['Multa de 40% do FGTS', fgts * 0.4]);
    if (mot === 'acordo') linhas.push(['Multa de 20% do FGTS', fgts * 0.2]);
    var tot = linhas.reduce(function (a, l) { return a + l[1]; }, 0);
    var saque = mot === 'sem' ? 'Você saca todo o FGTS (cerca de ' + real(fgts) + ') e pode pedir seguro-desemprego.' : mot === 'acordo' ? 'No acordo você saca 80% do FGTS e não recebe seguro-desemprego.' : 'Nesse tipo de saída o FGTS fica retido.';
    $('.cl-res').innerHTML = '<table>' + linhas.map(function (l) { return '<tr><td>' + l[0] + '</td><td>' + real(l[1]) + '</td></tr>'; }).join('') + '<tr class="tot"><td>Você deveria receber</td><td>' + real(tot) + '</td></tr></table><p>' + saque + ' Se recebeu menos que isso, ou com atraso de mais de 10 dias, há multa de 1 salário a seu favor.</p>';
    return s;
  }
  r.addEventListener('input', resc); r.addEventListener('change', resc);

  // direitos extras: estimativas simples sobre 24 meses
  var D = { he: ['horas extras', function (s) { return s / 220 * 1.5 * 25 * 24; }], ins: ['insalubridade', function () { return 1518 * 0.2 * 24; }], desvio: ['diferença por desvio de função', function (s) { return s * 0.25 * 24; }], ass: ['indenização por assédio moral', function (s) { return s * 5; }], fgts: ['FGTS não depositado', function (s) { return s * 0.08 * 12; }] };
  function dir() {
    var s = resc(), marc = [].slice.call(document.querySelectorAll('[data-d]:checked'));
    var tot = marc.reduce(function (a, x) { return a + D[x.dataset.d][1](s); }, 0);
    $('.dr-res').innerHTML = marc.length ? '<p style="margin:0">Estimativa do que você pode cobrar</p><p class="grande">' + real(tot * 0.7) + ' a ' + real(tot * 1.2) + '</p><p>' + marc.map(function (x) { return D[x.dataset.d][0]; }).join(', ') + '. Valor depende de provas: testemunhas, mensagens, cartões de ponto.</p><a class="botao" href="#caso">Quero cobrar isso</a>' : '<p style="margin:0;font-size:1.2rem">Marque ao lado o que acontecia. Mais da metade dos trabalhadores que nos procuram tinha pelo menos um destes direitos sem receber.</p>';
  }
  document.querySelector('.dr-lista').addEventListener('change', dir); r.addEventListener('input', dir); dir();

  var c = $('#caso-f');
  c.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = c.nome.value.trim(), t = c.tel.value.replace(/\D/g, ''), er = $('.erro', c);
    er.textContent = n.length < 2 ? 'Escreva seu nome.' : t.length < 10 ? 'Confira o WhatsApp com DDD.' : '';
    if (er.textContent) return;
    window.BR_WA && window.BR_WA('Olá, Aguiar & Monteiro! Sou ' + n + ', saí da empresa ' + (c.emp.value.trim() || '(não informada)') + ' e quero a análise grátis do meu caso.');
    c.innerHTML = '<p style="grid-column:1/-1;font-size:1.3rem">Recebido, ' + n.split(' ')[0] + '. Um advogado chama você no WhatsApp em até 24 horas.</p>';
  });
})();
