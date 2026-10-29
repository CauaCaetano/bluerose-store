// Vértice · espelho de vendas (18 andares × 4 finais, situação fixa por unidade), ficha da unidade, fluxo de
// pagamento na obra (entrada, 30 mensais, 3 anuais e o saldo nas chaves) e prazo da tabela de lançamento.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var mi = function (v) { return 'R$ ' + (v / 1e6).toFixed(2).replace('.', ',') + ' mi'; };
  // finais: tipo, m², suítes, vista, preço base no 1º andar
  var FIN = { 1: ['3 suítes', 128, 3, 'mar frontal', 1690000], 2: ['2 suítes', 92, 2, 'mar lateral', 1290000], 3: ['2 suítes', 92, 2, 'cidade', 1260000], 4: ['3 suítes', 128, 3, 'mar lateral', 1640000] };
  var ANDARES = 18, sel = null;
  var sit = function (a, f) { var h = (a * 37 + f * 11) % 10; return a < 6 ? (h < 7 ? 'v' : h < 8 ? 'r' : 'd') : (h < 4 ? 'v' : h < 5 ? 'r' : 'd'); };
  var preco = function (a, f) { return FIN[f][4] * (1 + (a - 1) * 0.012); };
  var vend = 0, html = '<span></span>' + [1, 2, 3, 4].map(function (f) { return '<span class="fin">final ' + f + '</span>'; }).join('');
  for (var a = ANDARES; a >= 1; a--) {
    html += '<span class="and">' + a + 'º</span>';
    for (var f = 1; f <= 4; f++) {
      var s = sit(a, f); if (s === 'v') vend++;
      html += '<button type="button" class="' + s + '" data-a="' + a + '" data-f="' + f + '" aria-pressed="false" aria-label="Unidade ' + a + '0' + f + ', ' + ({ d: 'disponível', r: 'reservada', v: 'vendida' })[s] + '"' + (s !== 'd' ? ' aria-disabled="true"' : '') + '>' + a + '0' + f + '</button>';
    }
  }
  $('.predio').innerHTML = html;
  $('[data-vend]').textContent = vend + ' de 72';

  function ficha(a, f) {
    sel = [a, f]; var t = FIN[f], p = preco(a, f);
    $$('.predio button').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.a === a && +b.dataset.f === f)); });
    $('.unid').innerHTML = '<img src="img/' + (t[2] === 3 ? 'sala' : 'planta') + '.webp" alt="' + (t[2] === 3 ? 'Living do decorado' : 'Planta da unidade') + '"><h3 style="font-size:1.8rem;margin:0">Unidade ' + a + '0' + f + '</h3><p class="preco">' + mi(p) + '</p>' +
      '<dl><dt>Tipo</dt><dd>' + t[0] + '</dd><dt>Área privativa</dt><dd>' + t[1] + ' m²</dd><dt>Vista</dt><dd>' + t[3] + '</dd><dt>Andar</dt><dd>' + a + 'º de 18</dd><dt>Vagas</dt><dd>' + (t[2] === 3 ? 2 : 1) + '</dd><dt>Preço por m²</dt><dd>' + real(p / t[1]) + '</dd></dl>' +
      '<a class="botao" href="#pagamento">Montar pagamento desta unidade</a>';
    fluxo();
  }
  $('.predio').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b || b.getAttribute('aria-disabled')) return; ficha(+b.dataset.a, +b.dataset.f); });

  var fl = $('#fluxo');
  function fluxo() {
    var a = sel ? sel[0] : 12, f = sel ? sel[1] : 2, p = preco(a, f), e = +fl.ent.value, m = +fl.men.value, an = +fl.anu.value;
    if (e + m + an > 85) { an = 85 - e - m; if (an < 0) { m += an; an = 0; } fl.anu.value = an; fl.men.value = m; }
    var ch = 100 - e - m - an;
    fl.ent.previousElementSibling.textContent = e + '% · ' + real(p * e / 100);
    fl.men.previousElementSibling.textContent = m + '% · 30x de ' + real(p * m / 100 / 30);
    fl.anu.previousElementSibling.textContent = an + '% · 3x de ' + real(p * an / 100 / 3);
    $('.pg-u').textContent = (sel ? 'Unidade ' + a + '0' + f : 'Exemplo: unidade 1202') + ' · ' + mi(p);
    $('.pg-chave').innerHTML = 'Saldo nas chaves: <b style="color:var(--tx)">' + ch + '% · ' + real(p * ch / 100) + '</b>, à vista ou financiado no banco.';
    $('.pg-res').innerHTML = '<p style="margin:0;color:var(--tx-2)">Durante 30 meses de obra você paga</p><p style="font-family:var(--serif);font-size:2.6rem;margin:4px 0;color:var(--ouro2)">' + real(p * m / 100 / 30) + '<span style="font-size:1rem;color:var(--tx-2)"> /mês</span></p>' +
      '<div class="barra" aria-hidden="true"><i style="width:' + e + '%;background:#ebd59c"></i><i style="width:' + m + '%;background:#c9a849"></i><i style="width:' + an + '%;background:#8c5b2b"></i><i style="width:' + ch + '%;background:#3a4362"></i></div>' +
      '<table><tr><td>Entrada (no contrato)</td><td>' + real(p * e / 100) + '</td></tr><tr><td>30 mensais</td><td>' + real(p * m / 100) + '</td></tr><tr><td>3 anuais</td><td>' + real(p * an / 100) + '</td></tr><tr><td>Chaves (dez/2028)</td><td>' + real(p * ch / 100) + '</td></tr></table>' +
      '<p style="font-size:.8rem;color:var(--tx-2);margin:10px 0 0">Parcelas corrigidas pelo INCC durante a obra.</p><a class="botao" href="#" data-wa="Olá, Vértice! Quero reservar a unidade ' + a + '0' + f + ' (' + mi(p) + ') com ' + e + '% de entrada e 30 mensais de ' + real(p * m / 100 / 30) + '.">Reservar a unidade ' + a + '0' + f + ' por 48 h</a>';
  }
  fl.addEventListener('input', fluxo); fluxo();

  // tabela de lançamento vale até o último dia do mês
  var fim = new Date(); fim = new Date(fim.getFullYear(), fim.getMonth() + 1, 0, 23, 59, 59);
  $('[data-ate]').textContent = fim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  function cont() { var s = Math.max(0, (fim - new Date()) / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600); $('[data-conta]').textContent = 'Faltam ' + d + ' dias e ' + h + ' horas.'; }
  cont(); setInterval(cont, 60000);
})();
