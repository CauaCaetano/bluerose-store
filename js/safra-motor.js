// Conferência de Safra: motor de conferência (sem tela). Roda no navegador e no Node (testes); nada é enviado.
// Confere o que o produtor ENTREGOU contra o que foi PAGO, carga a carga. Não classifica grão (umidade, impureza
// e avariados vêm do romaneio); confere se a tabela/regra foi aplicada certa e se as contas fecham.
(function (raiz) {
  'use strict';
  var SACA = 60; // kg

  // padrões de mercado (referência, não lei): a tabela do contrato do produtor sempre prevalece
  var PADROES = {
    soja: { umidade: 14, impureza: 1, avariados: 8 },
    milho: { umidade: 14, impureza: 1, avariados: 6 },
    sorgo: { umidade: 14, impureza: 1, avariados: 6 },
    trigo: { umidade: 13, impureza: 1, avariados: 5 },
    cafe: { umidade: 12.5, impureza: 1, avariados: 0 }
  };

  // retenção da contribuição previdenciária na venda (pessoa física, sobre a comercialização):
  // 1,5% até 03/2026; ~1,63% a partir de 04/2026 (LC 224/2025: 1,32% + 0,11% RAT + 0,2% Senar; confirmar na IN da Receita).
  // Quem optou pela folha recolhe só o Senar (0,2%). Pessoa jurídica e isentos: não conferimos.
  function funruralEsperado(regime, dataISO) {
    if (regime === 'pf') return dataISO && dataISO >= '2026-04-01' ? 0.0163 : 0.015;
    if (regime === 'pf_folha') return 0.002;
    return null;
  }

  var num = function (v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v).trim().replace(/[R$\s%]/g, '');
    if (!s) return null;
    // 1.234,56 → 1234.56 ; 1234.56 → 1234.56 ; 1,5 → 1.5
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); // 2.000 / 45.000 = milhar
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  };
  var r2 = function (n) { return Math.round(n * 100) / 100; };

  // desconto de umidade em % do peso:
  // - tabela do contrato: [[umidadeAte, descontoPct], ...] em ordem crescente (pega a 1ª faixa que cobre)
  // - sem tabela: referência pela perda real de água (Ui - Up) / (100 - Up) × 100
  function descUmidade(u, contrato) {
    var p = contrato.umidade;
    if (u === null || u <= p) return { pct: 0, fonte: 'tabela' };
    var t = contrato.tabelaUmidade;
    if (t && t.length) {
      for (var i = 0; i < t.length; i++) if (u <= t[i][0] + 1e-9) return { pct: t[i][1], fonte: 'tabela' };
      return { pct: null, fonte: 'fora_da_tabela' };
    }
    return { pct: (u - p) / (100 - p) * 100, fonte: 'referencia' };
  }
  // impureza e avariados: desconta o que passa do padrão, ponto a ponto (prática comum; o contrato pode dizer outra coisa)
  function descExcedente(v, padrao) { return v === null || v <= padrao ? 0 : v - padrao; }

  function normalizarContrato(c) {
    c = c || {};
    var prod = PADROES[c.produto] ? c.produto : 'soja';
    var pad = PADROES[prod];
    return {
      produto: prod,
      umidade: num(c.umidade) !== null ? num(c.umidade) : pad.umidade,
      impureza: num(c.impureza) !== null ? num(c.impureza) : pad.impureza,
      avariados: num(c.avariados) !== null ? num(c.avariados) : pad.avariados,
      descontaAvariados: c.descontaAvariados !== false,
      tabelaUmidade: Array.isArray(c.tabelaUmidade) ? c.tabelaUmidade.map(function (f) { return [num(f[0]), num(f[1])]; }).filter(function (f) { return f[0] !== null && f[1] !== null; }).sort(function (a, b) { return a[0] - b[0]; }) : [],
      preco: num(c.preco), // R$ por saca, se o contrato tiver preço fixo
      regime: c.regime || 'nao_conferir',
      toleranciaKg: num(c.toleranciaKg) !== null ? num(c.toleranciaKg) : 2,
      toleranciaReais: num(c.toleranciaReais) !== null ? num(c.toleranciaReais) : 1
    };
  }

  // carga de grão: { data, ticket, placa, bruto, tara, liquido, umidade, impureza, avariados, descontoKg, final, preco, valor, funrural }
  function conferirGraos(cargas, contratoBruto, liquidacao) {
    var c = normalizarContrato(contratoBruto), linhas = [], vistos = {};
    var tot = { cargas: 0, liquidoKg: 0, finalPagoKg: 0, finalDevidoKg: 0, valorPago: 0, valorDevido: 0, aFavor: 0, contra: 0, funruralPago: 0, funruralDevido: 0 };
    (cargas || []).forEach(function (cg, i) {
      var g = {}; for (var k in cg) g[k] = cg[k];
      ['bruto', 'tara', 'liquido', 'umidade', 'impureza', 'avariados', 'descontoKg', 'final', 'preco', 'valor', 'funrural'].forEach(function (k) { g[k] = num(cg[k]); });
      var L = { n: i + 1, carga: g, achados: [], dif: 0 };
      var achar = function (tipo, texto, reais, kg) { L.achados.push({ tipo: tipo, texto: texto, reais: reais === undefined ? null : r2(reais), kg: kg === undefined ? null : Math.round(kg) }); };
      // 1. ticket repetido
      if (g.ticket) { var t = String(g.ticket).trim(); if (vistos[t]) achar('duplicado', 'Ticket ' + t + ' repetido (já está na carga ' + vistos[t] + ').'); else vistos[t] = i + 1; }
      // 2. peso líquido = bruto − tara
      var liq = g.bruto !== null && g.tara !== null ? g.bruto - g.tara : g.liquido;
      if (g.bruto !== null && g.tara !== null && g.liquido !== null && Math.abs(g.liquido - liq) > c.toleranciaKg)
        achar('peso', 'Peso líquido informado (' + g.liquido + ' kg) diferente de bruto − tara (' + liq + ' kg).', null, liq - g.liquido);
      if (liq === null || liq <= 0) { achar('dados', 'Sem peso para conferir esta carga.'); linhas.push(L); return; }
      // 3. descontos de qualidade
      var du = descUmidade(g.umidade, c), di = descExcedente(g.impureza, c.impureza), da = c.descontaAvariados ? descExcedente(g.avariados, c.avariados) : 0;
      if (du.fonte === 'fora_da_tabela') achar('tabela', 'Umidade ' + g.umidade + '% acima da última faixa da tabela do contrato: confirme o desconto com o armazém.');
      var pctDevido = (du.pct || 0) + di + da;
      var descDevidoKg = liq * pctDevido / 100;
      var finalDevido = liq - descDevidoKg;
      var finalPago = g.final !== null ? g.final : g.descontoKg !== null ? liq - g.descontoKg : null;
      var preco = g.preco !== null ? g.preco : c.preco;
      if (finalPago !== null) {
        var difKg = finalDevido - finalPago;
        if (Math.abs(difKg) > c.toleranciaKg) {
          var reais = preco !== null ? difKg / SACA * preco : null;
          var base = 'Desconto de qualidade: devido ' + Math.round(descDevidoKg) + ' kg (' + r2(pctDevido) + '%: umidade ' + r2(du.pct || 0) + '%, impureza ' + r2(di) + '%' + (da ? ', avariados ' + r2(da) + '%' : '') + '), aplicado ' + Math.round(liq - finalPago) + ' kg.';
          if (du.fonte === 'referencia' && difKg > 0) achar('qualidade_ref', base + ' Sem a tabela do contrato, usamos a perda real de água como referência: pergunte ao armazém qual tabela foi usada.', reais, difKg);
          else achar('qualidade', base, reais, difKg);
        }
      }
      // 4. preço do contrato
      if (c.preco !== null && g.preco !== null && Math.abs(g.preco - c.preco) > 0.005)
        achar('preco', 'Preço pago R$ ' + g.preco.toFixed(2) + '/sc, contrato R$ ' + c.preco.toFixed(2) + '/sc.', (finalPago !== null ? finalPago : finalDevido) / SACA * (c.preco - g.preco));
      // 5. valor da carga = sacas pagas × preço
      var valorCalc = finalPago !== null && g.preco !== null ? finalPago / SACA * g.preco : null;
      if (valorCalc !== null && g.valor !== null && Math.abs(valorCalc - g.valor) > c.toleranciaReais)
        achar('valor', 'Valor pago R$ ' + g.valor.toFixed(2) + ' não fecha com sacas × preço (R$ ' + valorCalc.toFixed(2) + ').', valorCalc - g.valor);
      // 6. retenção previdenciária (Funrural)
      var fe = funruralEsperado(c.regime, g.data), bruto$ = g.valor !== null ? g.valor : valorCalc;
      if (fe !== null && g.funrural !== null && bruto$ !== null) {
        var fd = bruto$ * fe;
        tot.funruralPago += g.funrural; tot.funruralDevido += fd;
        if (g.funrural - fd > c.toleranciaReais) achar('funrural', 'Retenção de R$ ' + g.funrural.toFixed(2) + ' acima do esperado para o regime (' + (fe * 100).toFixed(2) + '% = R$ ' + fd.toFixed(2) + '). Conferir com o contador.', g.funrural - fd);
      }
      L.dif = L.achados.reduce(function (s, a) { return s + (a.reais || 0); }, 0);
      tot.cargas++; tot.liquidoKg += liq; tot.finalDevidoKg += finalDevido; if (finalPago !== null) tot.finalPagoKg += finalPago;
      if (preco !== null) tot.valorDevido += finalDevido / SACA * (c.preco !== null ? c.preco : preco);
      if (g.valor !== null) tot.valorPago += g.valor;
      L.achados.forEach(function (a) { if (a.reais > 0) tot.aFavor += a.reais; else if (a.reais < 0) tot.contra += -a.reais; });
      linhas.push(L);
    });
    // 7. total da liquidação contra a soma das cargas
    var gerais = [];
    if (liquidacao) {
      var lk = num(liquidacao.kg), lv = num(liquidacao.valor);
      if (lk !== null && Math.abs(lk - tot.finalPagoKg) > c.toleranciaKg * Math.max(1, tot.cargas))
        gerais.push({ tipo: 'liquidacao', texto: 'A liquidação fala em ' + Math.round(lk) + ' kg, mas as cargas pagas somam ' + Math.round(tot.finalPagoKg) + ' kg.', kg: Math.round(tot.finalPagoKg - lk) });
      if (lv !== null && Math.abs(lv - tot.valorPago) > c.toleranciaReais * Math.max(1, tot.cargas))
        gerais.push({ tipo: 'liquidacao', texto: 'A liquidação fala em R$ ' + lv.toFixed(2) + ', mas as cargas somam R$ ' + tot.valorPago.toFixed(2) + '.', reais: r2(tot.valorPago - lv) });
    }
    gerais.forEach(function (a) { if (a.reais > 0) tot.aFavor += a.reais; });
    for (var k in tot) tot[k] = r2(tot[k]);
    return { produto: c.produto, contrato: c, linhas: linhas, gerais: gerais, totais: tot, comAchado: linhas.filter(function (l) { return l.achados.length; }).length };
  }

  // cana: valor = toneladas × ATR (kg/t) × preço do kg de ATR (Consecana do mês). Carga: { data, ticket, toneladas, atr, precoAtr, valor }
  function conferirCana(cargas, opcoes) {
    opcoes = opcoes || {};
    var tol = num(opcoes.toleranciaReais) !== null ? num(opcoes.toleranciaReais) : 1, precoPadrao = num(opcoes.precoAtr), vistos = {}, linhas = [];
    var tot = { cargas: 0, toneladas: 0, valorPago: 0, valorDevido: 0, aFavor: 0, contra: 0 };
    (cargas || []).forEach(function (cg, i) {
      var g = { data: cg.data, ticket: cg.ticket, toneladas: num(cg.toneladas), atr: num(cg.atr), precoAtr: num(cg.precoAtr) !== null ? num(cg.precoAtr) : precoPadrao, valor: num(cg.valor) };
      var L = { n: i + 1, carga: g, achados: [], dif: 0 };
      if (g.ticket) { var t = String(g.ticket).trim(); if (vistos[t]) L.achados.push({ tipo: 'duplicado', texto: 'Ticket ' + t + ' repetido (já está na carga ' + vistos[t] + ').' }); else vistos[t] = i + 1; }
      if (g.toneladas === null || g.atr === null || g.precoAtr === null) { L.achados.push({ tipo: 'dados', texto: 'Faltam toneladas, ATR ou preço do ATR para conferir.' }); linhas.push(L); return; }
      var devido = g.toneladas * g.atr * g.precoAtr;
      if (g.valor !== null && Math.abs(devido - g.valor) > tol) L.achados.push({ tipo: 'valor', texto: g.toneladas + ' t × ' + g.atr + ' kg ATR/t × R$ ' + g.precoAtr + '/kg = R$ ' + devido.toFixed(2) + '; pago R$ ' + g.valor.toFixed(2) + '.', reais: r2(devido - g.valor) });
      L.dif = L.achados.reduce(function (s, a) { return s + (a.reais || 0); }, 0);
      tot.cargas++; tot.toneladas += g.toneladas; tot.valorDevido += devido; if (g.valor !== null) tot.valorPago += g.valor;
      L.achados.forEach(function (a) { if (a.reais > 0) tot.aFavor += a.reais; else if (a.reais < 0) tot.contra += -a.reais; });
      linhas.push(L);
    });
    for (var k in tot) tot[k] = r2(tot[k]);
    return { produto: 'cana', linhas: linhas, gerais: [], totais: tot, comAchado: linhas.filter(function (l) { return l.achados.length; }).length };
  }

  // mensagem pronta para o produtor mandar ao armazém/usina pedindo explicação (educada, sem acusar)
  function mensagemContestacao(res, quem) {
    var l = res.linhas.filter(function (x) { return x.achados.some(function (a) { return a.reais > 0 || a.tipo === 'duplicado' || a.tipo === 'peso'; }); });
    if (!l.length && !res.gerais.length) return '';
    var real = function (v) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    var txt = ['Olá' + (quem ? ', ' + quem : '') + '. Conferimos as cargas da nossa ' + (res.produto === 'cana' ? 'cana' : res.produto) + ' com a liquidação e encontramos diferenças. Podem nos explicar ou acertar os itens abaixo?', ''];
    l.forEach(function (x) {
      x.achados.forEach(function (a) {
        if (a.reais > 0 || a.tipo === 'duplicado' || a.tipo === 'peso')
          txt.push('- Carga ' + x.n + (x.carga.ticket ? ' (ticket ' + x.carga.ticket + (x.carga.data ? ', ' + x.carga.data.split('-').reverse().join('/') : '') + ')' : '') + ': ' + a.texto + (a.reais > 0 ? ' Diferença: ' + real(a.reais) + '.' : ''));
      });
    });
    res.gerais.forEach(function (a) { txt.push('- ' + a.texto); });
    txt.push('', 'Total das diferenças a nosso favor: ' + real(res.totais.aFavor) + '. Ficamos no aguardo dos documentos ou do acerto. Obrigado.');
    return txt.join('\n');
  }

  var API = { SACA: SACA, PADROES: PADROES, num: num, funruralEsperado: funruralEsperado, descUmidade: descUmidade, normalizarContrato: normalizarContrato, conferirGraos: conferirGraos, conferirCana: conferirCana, mensagemContestacao: mensagemContestacao };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else raiz.SAFRA = API;
})(typeof window !== 'undefined' ? window : globalThis);
