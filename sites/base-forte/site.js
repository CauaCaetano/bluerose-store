// Base Forte · custo da casa por m², divisão por etapa (o que se paga em cada uma) e reunião com o engenheiro.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var real = function (v) { return 'R$ ' + (Math.round(v / 100) * 100).toLocaleString('pt-BR'); };
  // etapa, parte do custo, meses (para 120 m²), o que entrega
  var ET = [['Fundação', .12, 1, 'sapatas, baldrame e impermeabilização'], ['Estrutura', .18, 1.5, 'pilares, vigas e lajes'], ['Alvenaria e telhado', .17, 1.5, 'paredes, cobertura e calhas'],
            ['Instalações', .15, 1.2, 'elétrica, água e esgoto'], ['Revestimentos', .23, 1.8, 'reboco, piso, azulejo e forro'], ['Acabamento e chave', .15, 1, 'pintura, louças, metais e limpeza']];
  var c = $('#calc');
  function conta() {
    var m2 = +c.m2.value, pd = +c.pd.value, pv = +c.pv.value, obra = m2 * pd * pv, proj = c.proj.checked ? Math.max(9800, m2 * 62) : 0, total = obra + proj;
    var meses = Math.round((6 + (m2 - 120) / 40 + (pv > 1 ? 1 : 0)) * 10) / 10; meses = Math.max(4, meses);
    c.m2.previousElementSibling.textContent = m2 + ' m²';
    var parc = c.fin.checked ? '<p>Financiando, a Caixa libera o dinheiro por medição de etapa, o mesmo jeito que cobramos. Nós cuidamos da documentação.</p>' : '<p>Pagamento em 6 parcelas, uma por etapa concluída. Sem entrada antes da obra começar.</p>';
    $('.cl-res').innerHTML = '<p style="margin:0">Casa de ' + m2 + ' m², ' + c.querySelector('[name=pd]:checked + span b').textContent.toLowerCase() + (pv > 1 ? ', sobrado' : ', térrea') + '</p><p class="total">' + real(total) + '</p><p>' + real(total / m2) + ' por m² · pronta em cerca de ' + String(meses).replace('.', ',') + ' meses</p>' +
      '<div class="barras">' + ET.map(function (e) { return '<div><span>' + e[0] + '</span><i style="width:' + (e[1] * 400) + '%"></i><span>' + real(obra * e[1]) + '</span></div>'; }).join('') + (proj ? '<div><span>Projetos</span><i style="width:' + Math.min(100, proj / obra * 400) + '%;background:#d97a1e"></i><span>' + real(proj) + '</span></div>' : '') + '</div>' + parc +
      '<a class="botao" href="#" data-wa="Olá, Base Forte! Calculei no site uma casa de ' + m2 + ' m² por ' + real(total) + '. Quero marcar a reunião grátis com o engenheiro.">Quero o orçamento real</a>';
    // trilha de pagamento por etapa
    var mes = 0;
    $('.trilha').innerHTML = ET.map(function (e, i) { mes += e[2] * meses / 8; return '<li data-n="' + (i + 1) + '"><b>' + e[0] + '</b><span>' + e[3] + '</span><span>até o ' + Math.max(1, Math.round(mes)) + 'º mês</span><em>' + real(obra * e[1]) + '</em></li>'; }).join('');
  }
  c.addEventListener('input', conta); c.addEventListener('change', conta); conta();

  var r = $('#reuniao');
  r.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = r.nome.value.trim(), t = r.tel.value.replace(/\D/g, ''), er = $('.erro', r);
    er.textContent = n.length < 2 ? 'Escreva seu nome.' : t.length < 10 ? 'Confira o WhatsApp com DDD.' : '';
    if (er.textContent) return;
    window.BR_WA && window.BR_WA('Olá, Base Forte! Sou ' + n + ' e quero marcar a reunião grátis com o engenheiro. Minha casa: ' + c.m2.value + ' m².');
    r.innerHTML = '<p style="font-weight:800;font-size:1.2rem">Reunião pedida, ' + n.split(' ')[0] + '. O engenheiro chama você no WhatsApp hoje.</p>';
  });
})();
