// Patrícia Leal · resposta por situação (prazo, custo, documentos), faixa de pensão e pedido de consulta.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var S = {
    consensual: ['Divórcio consensual', 'Se não houver filho menor, dá para fazer no cartório, em uma só assinatura. Com filhos menores, vai ao juiz, mas como acordo, que é rápido.', '15 a 45 dias', 'a partir de R$ 3.500', 'RG, certidão de casamento, documentos dos bens'],
    litigioso: ['Divórcio sem acordo', 'Ninguém é obrigado a continuar casado: o divórcio sai mesmo que o outro não queira. O que se discute é divisão de bens, pensão e guarda, e eu tento acordo antes de cada audiência.', '8 a 18 meses', 'a partir de R$ 6.000', 'certidões, comprovantes de renda, lista de bens e dívidas'],
    pensao: ['Pensão alimentícia', 'Dá para pedir pensão provisória já na primeira semana, para os filhos não ficarem esperando o fim do processo. Revisão vale quando a renda de alguém mudou.', 'provisória em 15 dias', 'a partir de R$ 2.800', 'certidão de nascimento, gastos da criança, o que souber da renda do outro'],
    guarda: ['Guarda e convivência', 'A regra hoje é a guarda compartilhada, com uma casa de referência. O plano de convivência escrito evita que cada fim de semana vire uma briga nova.', '3 a 10 meses', 'a partir de R$ 4.200', 'certidões, rotina da criança, mensagens que mostrem o combinado'],
    inventario: ['Inventário', 'Com herdeiros de acordo e todos maiores, faz no cartório em poucas semanas. Atenção ao prazo de 60 dias para não pagar multa no imposto (ITCD).', '30 a 90 dias no cartório', 'a partir de 4% do valor dos bens', 'certidão de óbito, documentos dos bens e dos herdeiros']
  };
  document.querySelector('.sit-op').addEventListener('click', function (e) {
    var b = e.target.closest('[data-s]'); if (!b) return;
    [].forEach.call(document.querySelectorAll('[data-s]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    var s = S[b.dataset.s];
    $('.carta').innerHTML = '<h3 style="font-weight:400;font-size:1.7rem;margin:0 0 .4em">' + s[0] + '</h3><p>' + s[1] + '</p><dl><div><dt>prazo comum</dt><dd>' + s[2] + '</dd></div><div><dt>honorários</dt><dd>' + s[3] + '</dd></div><div><dt>o que separar</dt><dd style="font-size:.95rem">' + s[4] + '</dd></div></dl><p class="assina">Cada caso tem detalhes. Na consulta eu olho o seu e dou o prazo e o valor exatos. · Patrícia</p><a class="botao" href="#consulta" data-assunto="' + s[0] + '">Marcar consulta sobre ' + s[0].toLowerCase() + '</a>';
  });
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-assunto]'); if (!b) return; var sel = $('#cons').assunto; [].forEach.call(sel.options, function (o) { if (b.dataset.assunto.indexOf(o.text.split(' ')[0]) > -1) sel.value = o.value; }); });

  // faixa comum nos tribunais: 1 filho 15–20%, 2 filhos 20–25%, 3 ou mais 25–30% da renda líquida
  var p = $('#pens');
  function pc() {
    var r = +p.r.value, f = +p.f.value, base = [0, 15, 20, 25, 28][f], topo = base + 5;
    p.r.previousElementSibling.textContent = real(r); p.f.previousElementSibling.textContent = f + (f > 1 ? ' filhos' : ' filho');
    var txt = p.inf.checked ? '<p>Sem carteira assinada, o juiz costuma fixar em salário mínimo: entre <b>' + (f * 0.3 + 0.2).toFixed(1).replace('.', ',') + ' e ' + (f * 0.4 + 0.3).toFixed(1).replace('.', ',') + ' salários</b>, conforme o padrão de vida que se consegue provar.</p>' : '';
    $('.pn-res').innerHTML = '<p style="margin:0">Faixa comum para ' + f + (f > 1 ? ' filhos' : ' filho') + '</p><p class="faixa">' + real(r * base / 100) + ' a ' + real(r * topo / 100) + '</p><p>' + base + '% a ' + topo + '% da renda líquida, por mês, descontados em folha quando há emprego formal.</p>' + txt + '<a class="botao" href="#consulta">Pedir a pensão com segurança</a>';
  }
  p.addEventListener('input', pc); pc();

  var c = $('#cons');
  c.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = c.nome.value.trim(), t = c.tel.value.replace(/\D/g, ''), er = $('.erro', c);
    er.textContent = n.length < 2 ? 'Escreva seu nome.' : t.length < 10 ? 'Confira o WhatsApp com DDD.' : '';
    if (er.textContent) return;
    window.BR_WA && window.BR_WA('Olá, Dra. Patrícia! Sou ' + n + ' e quero marcar a consulta online sobre ' + c.assunto.value.toLowerCase() + '.');
    c.innerHTML = '<p style="grid-column:1/-1;font-size:1.2rem">Obrigada, ' + n.split(' ')[0] + '. Respondo pessoalmente no seu WhatsApp hoje, com os horários livres.</p>';
  });
})();
