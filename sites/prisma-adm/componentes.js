/* Prisma · peças reutilizadas: cartão de imóvel, tabela de extrato e gráfico de barras (SVG). */
(function () {
  'use strict';
  var PR = window.PR, esc = PR.esc, brl = PR.brl, brl0 = PR.brl0;

  function cartao(im, lazy) {
    var f = im.fotos[0];
    var carac = [];
    if (im.quartos) carac.push(im.quartos + (im.quartos > 1 ? ' quartos' : ' quarto'));
    if (im.suites) carac.push(im.suites + (im.suites > 1 ? ' suítes' : ' suíte'));
    carac.push(im.area + ' m²');
    carac.push(im.vagas ? im.vagas + (im.vagas > 1 ? ' vagas' : ' vaga') : 'sem vaga');
    var selos = (im.pet ? '<span class="selo selo-pet">Aceita pet</span> ' : '') + (im.mobiliado ? '<span class="selo selo-neutro">Mobiliado</span> ' : '') + (im.novo ? '<span class="selo selo-ok">Novo</span>' : '');
    var msg = 'Olá, Prisma! Quero visitar o imóvel ' + im.cod + ' (' + im.titulo + '), no ' + im.bairro + ', com aluguel de ' + brl0(im.aluguel) + '.';
    return '<article class="imovel">' +
      '<a class="imovel-foto" href="imovel.html?c=' + im.cod + '" tabindex="-1" aria-hidden="true"><img src="img/' + f[0] + '.webp" width="' + f[1] + '" height="' + f[2] + '" alt="' + esc(f[3]) + '"' + (lazy ? ' loading="lazy"' : '') + '><span class="imovel-cod">' + im.cod + '</span></a>' +
      '<div class="imovel-corpo">' +
        '<p class="imovel-tipo">' + esc(im.tipo) + '</p>' +
        '<h3><a href="imovel.html?c=' + im.cod + '">' + esc(im.titulo) + '</a></h3>' +
        '<p class="imovel-bairro">' + esc(im.bairro) + ' · ' + esc(im.regiao) + '</p>' +
        '<ul class="imovel-carac">' + carac.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ul>' +
        (selos ? '<div>' + selos + '</div>' : '') +
        '<div class="imovel-custos">' +
          '<div><span>Aluguel</span><span class="alug num">' + brl0(im.aluguel) + '</span></div>' +
          '<div><span>Condomínio + IPTU + seguro</span><span class="num">' + brl0(im.cond + im.iptu + im.seguro) + '</span></div>' +
          '<div class="tot"><span>Total por mês</span><span class="num">' + brl0(im.total) + '</span></div>' +
        '</div>' +
        '<div class="imovel-acoes"><a class="bt bt-pri" href="locacao.html?c=' + im.cod + '">Quero alugar</a><a class="bt bt-cla" href="#" data-wa="' + esc(msg) + '">Agendar visita</a></div>' +
      '</div></article>';
  }

  var SIT = {
    repassado: function (l) { return '<span class="selo selo-ok">Repassado em ' + l.data + '</span>'; },
    aguardando: function () { return '<span class="selo selo-pend">Aguardando pagamento do inquilino</span>'; },
    descontado: function () { return '<span class="selo selo-neutro">Descontado de outro repasse</span>'; },
    sem: function () { return '<span class="selo selo-neutro">Sem movimento</span>'; }
  };
  function tabelaExtrato(c, completo) {
    var lin = c.linhas.filter(function (l) { return l.bruto || l.despesa; });
    var h = '<table class="demonstrativo resp"><caption class="sr">Extrato de ' + esc(c.rotulo) + '</caption><thead><tr><th scope="col">Imóvel</th><th scope="col">Aluguel bruto</th><th scope="col">Taxa adm.</th><th scope="col">Despesas</th>' + (completo ? '<th scope="col">IRRF</th>' : '') + '<th scope="col">Líquido</th>' + (completo ? '<th scope="col">Repasse</th>' : '') + '</tr></thead><tbody>';
    lin.forEach(function (l) {
      h += '<tr><th scope="row">' + l.cod + '<small>' + esc(l.nome) + ' · ' + esc(l.bairro) + '</small>' + (l.despesaDesc && completo ? '<small>Despesa: ' + esc(l.despesaDesc) + '</small>' : '') + '</th>' +
        '<td class="num" data-rot="Aluguel bruto">' + brl(l.bruto) + '</td><td class="num menos" data-rot="Taxa de administração">' + (l.taxa ? '− ' + brl(l.taxa) : brl(0)) + '</td><td class="num' + (l.despesa ? ' menos' : '') + '" data-rot="Despesas">' + (l.despesa ? '− ' + brl(l.despesa) : brl(0)) + '</td>' +
        (completo ? '<td class="num' + (l.imposto ? ' menos' : '') + '" data-rot="IRRF">' + (l.imposto ? '− ' + brl(l.imposto) : brl(0)) + '</td>' : '') +
        '<td class="num" data-rot="Líquido"><b>' + brl(l.liquido) + '</b></td>' + (completo ? '<td data-rot="Repasse">' + SIT[l.situacao](l) + '</td>' : '') + '</tr>';
    });
    h += '</tbody><tfoot><tr><th scope="row">Total da competência</th><td class="num" data-rot="Aluguel bruto">' + brl(c.bruto) + '</td><td class="num menos" data-rot="Taxa de administração">− ' + brl(c.taxa) + '</td><td class="num menos" data-rot="Despesas">' + (c.despesa ? '− ' : '') + brl(c.despesa) + '</td>' +
      (completo ? '<td class="num menos" data-rot="IRRF">' + (c.imposto ? '− ' : '') + brl(c.imposto) + '</td>' : '') + '<td class="num" data-rot="Líquido"><span class="liq">' + brl(c.liquido) + '</span></td>' + (completo ? '<td></td>' : '') + '</tr></tfoot></table>';
    return h;
  }

  // gráfico de barras: bruto (claro) e líquido (escuro) por competência
  function grafico(cs, largura) {
    var W = Math.max(300, Math.min(760, Math.round(largura || 640))), H = W < 420 ? 220 : 240, m = { t: 14, r: 8, b: 30, l: 52 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    var max = Math.max.apply(null, cs.map(function (c) { return c.bruto; })) || 1;
    var passo = Math.pow(10, Math.floor(Math.log10(max))) / 2, topo = Math.ceil(max / passo) * passo;
    var bw = iw / cs.length, s = '<svg class="grafico" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gráfico de aluguel bruto e líquido por mês">';
    for (var k = 0; k <= 4; k++) {
      var v = topo * k / 4, y = m.t + ih - ih * k / 4;
      s += '<line class="ref" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (m.l - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + (v >= 1000 ? (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : v) + '</text>';
    }
    cs.forEach(function (c, i) {
      var x = m.l + i * bw, hb = ih * c.bruto / topo, hl = ih * Math.max(0, c.liquido) / topo;
      s += '<rect class="barra-b" x="' + (x + bw * .14) + '" y="' + (m.t + ih - hb) + '" width="' + (bw * .72) + '" height="' + hb + '"/>';
      s += '<rect class="barra-l" tabindex="0" data-i="' + i + '" x="' + (x + bw * .3) + '" y="' + (m.t + ih - hl) + '" width="' + (bw * .4) + '" height="' + hl + '"><title>' + c.rotulo + ': bruto ' + brl(c.bruto) + ', líquido ' + brl(c.liquido) + '</title></rect>';
      s += '<text x="' + (x + bw / 2) + '" y="' + (H - 10) + '" text-anchor="middle">' + (W < 420 ? c.curto.charAt(0).toUpperCase() : c.curto.split('/')[0]) + '</text>';
    });
    s += '</svg><div class="legenda"><span><i style="background:#c9d9dc"></i>Aluguel bruto</span><span><i style="background:var(--acc)"></i>Líquido repassado</span></div>';
    s += '<p class="dica-grafico" aria-live="polite"></p>';
    return s;
  }
  function ligarGrafico(caixa, cs) {
    var dica = caixa.querySelector('.dica-grafico');
    var mostra = function (e) { var r = e.target.closest('.barra-l'); if (!r) return; var c = cs[+r.dataset.i]; dica.textContent = c.rotulo.charAt(0).toUpperCase() + c.rotulo.slice(1) + ': bruto ' + brl(c.bruto) + ' · líquido ' + brl(c.liquido); };
    caixa.addEventListener('mouseover', mostra); caixa.addEventListener('focusin', mostra);
  }

  window.PRC = { cartao: cartao, tabelaExtrato: tabelaExtrato, grafico: grafico, ligarGrafico: ligarGrafico, SIT: SIT };
})();
