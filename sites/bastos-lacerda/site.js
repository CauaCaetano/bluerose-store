// Bastos Lacerda · triagem por palavras do problema → área, sócio, prazo e horários; sócios; andamento de processo.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var sem = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  // sócio: nome, foto, área, formação
  var SO = [['Ricardo Bastos', 'a1', 'Tributário', 'mestre pela FGV, ex-conselheiro do CARF'], ['Helena Lacerda', 'a3', 'Trabalhista empresarial', 'especialista pela PUC-SP, 22 anos de contencioso'], ['Marcelo Viana', 'a2', 'Contratos e cobrança', 'LL.M. pela Columbia, contratos internacionais'], ['Camila Duarte', 'a4', 'Societário, M&A e LGPD', 'DPO certificada, 140 operações de M&A']];
  // área: palavras, sócio, prazo, custo, primeiro passo
  var AR = [
    ['Tributário', ['receita', 'autuac', 'imposto', 'pis', 'cofins', 'icms', 'tribut', 'fisco', 'multa fiscal', 'iss'], 0, '30 dias para a defesa administrativa', 'a partir de 8% do valor discutido', 'Não pague nem parcele antes de analisarmos: há prazo de 30 dias para impugnar.'],
    ['Trabalhista empresarial', ['funcionario', 'empregado', 'trabalhista', 'reclamac', 'demiti', 'sindicato', 'ex-func', 'acao trabalh', 'clt'], 1, 'audiência em 60 a 120 dias', 'R$ 4.500 a R$ 12.000 por ação', 'Separe cartões de ponto, holerites e contrato: a defesa sai em até 15 dias.'],
    ['Contratos e cobrança', ['contrato', 'nao paga', 'cobranc', 'inadimpl', 'divida', 'fornecedor', 'cliente', 'boleto', 'venceu'], 2, 'notificação em 48 h, ação em 2 semanas', 'êxito de 10% a 20% do recuperado', 'Uma notificação extrajudicial resolve 6 em cada 10 casos sem ir à justiça.'],
    ['Societário e M&A', ['socio', 'sociedade', 'quotas', 'acordo de socios', 'tirar um socio', 'empresa', 'venda da empresa', 'investidor'], 3, '30 a 90 dias', 'a partir de R$ 15.000', 'Antes de qualquer conversa com o sócio, revisamos o contrato social e o acordo de sócios.'],
    ['LGPD e incidentes de dados', ['dados', 'vazar', 'vazaram', 'lgpd', 'hacker', 'privacidade', 'anpd', 'incidente'], 3, 'comunicação à ANPD em até 3 dias úteis', 'plano de resposta a partir de R$ 9.000', 'Preserve os registros e não apague nada: o prazo legal de comunicação já está correndo.']
  ];
  function achar(t) {
    var q = sem(t), melhor = null, pts = 0;
    AR.forEach(function (a) { var n = a[1].filter(function (p) { return q.indexOf(p) > -1; }).length; if (n > pts) { pts = n; melhor = a; } });
    return melhor;
  }
  var res = $('#resultado'), slot = '';
  function mostrar() {
    var t = $('#prob').value.trim(); if (t.length < 6) { res.hidden = true; return; }
    var a = achar(t);
    if (!a) { res.hidden = false; res.innerHTML = '<div class="rs"><div class="rs-a"><p class="area">TRIAGEM</p><h3>Precisamos de um pouco mais de detalhe</h3><p>Conte o que aconteceu, com quem e desde quando. Um advogado de plantão lê e encaminha ao sócio certo em até 4 horas.</p><a class="botao" href="#" data-wa="Olá, Bastos Lacerda! Meu caso: ' + t.replace(/"/g, '') + '">Enviar para o plantão</a></div></div>'; return; }
    var s = SO[a[2]], dias = [];
    for (var k = 0; dias.length < 3; k++) { var d = new Date(); d.setDate(d.getDate() + k); if (d.getDay() % 6) dias.push(d); }
    var h = dias.map(function (d, i) { return ['09:30', '14:00', '17:30'].filter(function (x, j) { var hj = d.toDateString() === new Date().toDateString(); return (!hj || +x.slice(0, 2) > new Date().getHours() + 3) && (d.getDate() + j + a[2]) % 3; }).map(function (x) { var r = (i === 0 && d.toDateString() === new Date().toDateString() ? 'hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })) + ' ' + x; return '<button type="button" data-slot="' + r + '" aria-pressed="false">' + r + '</button>'; }).join(''); }).join('');
    res.hidden = false; slot = '';
    res.innerHTML = '<div class="rs"><div class="rs-a"><p class="area">' + a[0].toUpperCase() + '</p><h3>' + a[5] + '</h3><dl><div><dt>prazo típico</dt><dd>' + a[3] + '</dd></div><div><dt>honorários</dt><dd>' + a[4] + '</dd></div><div><dt>primeira resposta</dt><dd>até 4 horas</dd></div></dl></div>' +
      '<div class="rs-b"><img src="img/' + s[1] + '.webp" alt="' + s[0] + '"><div><p style="margin:0;color:var(--marfim);font-size:.8rem">sócio responsável</p><h3 style="margin:2px 0 4px">' + s[0] + '</h3><p style="margin:0;color:var(--marfim);font-size:.84rem">' + s[3] + '</p></div><div class="slots">' + h + '</div><a class="botao" href="#" data-wa-socio data-wa="Olá, Bastos Lacerda! Quero falar com ' + s[0] + ' sobre: ' + t.replace(/"/g, '') + '">Pedir conversa por vídeo</a></div></div>';
  }
  $('#prob').addEventListener('input', mostrar);
  $('.exemplos').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; $('#prob').value = b.textContent; mostrar(); res.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  $('#triagem').addEventListener('submit', function (e) { e.preventDefault(); });
  res.addEventListener('click', function (e) {
    var b = e.target.closest('[data-slot]'); if (!b) return;
    $$('[data-slot]', res).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    var a = $('[data-wa-socio]', res); a.setAttribute('data-wa', a.getAttribute('data-wa').split(' | ')[0] + ' | Horário: ' + b.dataset.slot); a.textContent = 'Confirmar conversa · ' + b.dataset.slot;
  });

  $('.sc-grade').innerHTML = SO.map(function (s, i) { return '<article class="socio"><img src="img/' + s[1] + '.webp" alt="' + s[0] + '" loading="lazy"><h3>' + s[0] + '</h3><p>' + s[2] + ' · ' + s[3] + '</p><button type="button" data-area="' + i + '">Falar com ' + s[0].split(' ')[0] + '</button></article>'; }).join('');
  $('.sc-grade').addEventListener('click', function (e) { var b = e.target.closest('[data-area]'); if (!b) return; var a = AR.find(function (x) { return x[2] === +b.dataset.area; }); $('#prob').value = 'Assunto de ' + a[0].toLowerCase() + ': ' + a[1][0]; mostrar(); $('#triagem').scrollIntoView({ behavior: 'smooth' }); });

  var MOV = [['Hoje, 10:12', 'Juntada a manifestação do escritório sobre o laudo pericial', 'prazo cumprido 3 dias antes'], ['21/10', 'Laudo pericial contábil entregue', 'favorável em 4 dos 5 pontos'], ['02/09', 'Audiência de conciliação', 'sem acordo; perícia determinada'], ['14/07', 'Contestação protocolada', ''], ['03/06', 'Citação da empresa', 'distribuído à 12ª Vara Cível']];
  function proc(e) {
    if (e) e.preventDefault();
    var n = $('#num').value.replace(/\D/g, '');
    $('.linha').innerHTML = n.length !== 20 ? '<li><b>Número incompleto</b><span>O número do processo tem 20 dígitos, no formato 0000000-00.0000.0.00.0000.</span></li>' : MOV.map(function (m) { return '<li><b>' + m[1] + '</b><span>' + m[0] + (m[2] ? ' · ' + m[2] : '') + '</span></li>'; }).join('') + '<li><b>Próximo passo</b><span>Sentença prevista para dezembro · você é avisado no WhatsApp</span></li>';
  }
  $('#proc').addEventListener('submit', proc); proc();
})();
