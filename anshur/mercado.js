// Base REAL de preços de mercado do Anshur (anúncios públicos de máquinas usadas, coleta de 16/11/2026).
// Os dados ficam em mercado-anuncios.js (gerado por ferramentas/limpar_mercado.py a partir de ferramentas/coletar_mercado.py).
// Fontes: Agrofy e Tratores e Colheitadeiras. São PREÇOS PEDIDOS em anúncios, não preços de venda fechada.
//
// O que este arquivo calcula, sempre a partir dos próprios anúncios (nada chutado):
// 1. Depreciação por ano de cada categoria: inclinação de log(preço) contra a idade DENTRO de cada modelo
//    (regressão simples com efeito fixo por modelo: compara anúncios do mesmo modelo com anos diferentes).
// 2. Referência de cada modelo (o "base" do catálogo do motor = valor equivalente a uma máquina de 1 ano):
//    MEDIANA de preço × e^(−depreciação × (idade − 1)) dos anúncios do modelo. Mediana para um anúncio fora da curva não puxar.
// 3. Horas por ano típicas da categoria (hAno): mediana de horas ÷ idade nos anúncios que informam horas.
//    Com menos de MIN_HORAS anúncios com horas, fica o padrão do motor (MOTOR.HANO) e isso aparece em `hAnoOrigem`.
// 4. Catálogo: só modelos com pelo menos `minimo` anúncios (4). Modelo com menos fica fora e o teste às cegas mostra
//    a mensagem de modelo fora do catálogo.
// 5. Comparáveis para o motor: cada anúncio vira uma "venda de referência" com vendido = preço pedido e data = dia da coleta.
//    Anúncio não informa o estado: o comparável recebe o mesmo estado da máquina avaliada (a base de mercado não ajusta
//    conservação; esse ajuste só vem das trocas da própria revenda). Anúncio sem horas recebe as horas típicas da idade
//    (hAno × idade), então as horas só pesam pelo que os anúncios com horas e as trocas da revenda mostram.
(function (raiz) {
  const D = raiz.MERCADO_DADOS;
  if (!D) return;
  const ANO = +D.coleta.slice(0, 4);
  const MIN_HORAS = 5;
  const idadeDe = (a) => ANO - a.ano;
  const chave = (x) => x.tipo + '|' + x.marca + '|' + x.modelo;

  function mediana(v) {
    const s = v.filter((x) => Number.isFinite(x)).sort((a, b) => a - b), n = s.length;
    if (!n) return NaN;
    return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  }

  // inclinação de log(preço) por ano de idade dentro de cada modelo, juntando os modelos da categoria
  function depreciacao(anuncios) {
    const out = {};
    [...new Set(anuncios.map((a) => a.tipo))].forEach((tipo) => {
      const por = new Map();
      anuncios.filter((a) => a.tipo === tipo).forEach((a) => { const k = chave(a); if (!por.has(k)) por.set(k, []); por.get(k).push(a); });
      let sxy = 0, sxx = 0, n = 0;
      por.forEach((xs) => {
        if (xs.length < 2) return;
        const mi = xs.reduce((s, a) => s + idadeDe(a), 0) / xs.length, ml = xs.reduce((s, a) => s + Math.log(a.preco), 0) / xs.length;
        xs.forEach((a) => { const d = idadeDe(a) - mi; sxy += d * (Math.log(a.preco) - ml); sxx += d * d; n++; });
      });
      out[tipo] = { porAno: sxx ? sxy / sxx : 0, anuncios: n, perdaAno: sxx ? 1 - Math.exp(sxy / sxx) : 0 };
    });
    return out;
  }

  function horasPorAno(anuncios) {
    const out = {};
    [...new Set(anuncios.map((a) => a.tipo))].forEach((tipo) => {
      const r = anuncios.filter((a) => a.tipo === tipo && a.horas > 0 && idadeDe(a) >= 1).map((a) => a.horas / idadeDe(a));
      out[tipo] = { hAno: r.length >= MIN_HORAS ? Math.round(mediana(r) / 10) * 10 : null, anuncios: r.length };
    });
    return out;
  }

  // referência do modelo = mediana dos preços levados para 1 ano de idade com a depreciação da categoria
  function referencia(xs, porAno) {
    return Math.round(mediana(xs.map((a) => a.preco * Math.exp(-porAno * (idadeDe(a) - 1)))) / 1000) * 1000;
  }

  function montar(dados) {
    const anuncios = dados.anuncios, dep = depreciacao(anuncios), hor = horasPorAno(anuncios);
    const padraoH = (tipo) => ((raiz.MOTOR && raiz.MOTOR.HANO) || {})[tipo] || 800;
    const grupos = new Map();
    anuncios.forEach((a) => { const k = chave(a); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(a); });
    const resumo = [...grupos.values()].map((xs) => {
      const a = xs[0], hs = xs.filter((x) => x.horas).map((x) => x.horas);
      return { tipo: a.tipo, marca: a.marca, modelo: a.modelo, n: xs.length, mediana: mediana(xs.map((x) => x.preco)),
        anos: [Math.min(...xs.map((x) => x.ano)), Math.max(...xs.map((x) => x.ano))], horas: hs.length ? [Math.min(...hs), Math.max(...hs)] : null,
        noCatalogo: xs.length >= dados.minimo };
    });
    const modelos = resumo.filter((r) => r.noCatalogo).map((r) => {
      const xs = grupos.get(chave(r));
      return { tipo: r.tipo, marca: r.marca, modelo: r.modelo, base: referencia(xs, dep[r.tipo].porAno),
        hAno: hor[r.tipo].hAno || padraoH(r.tipo), hAnoOrigem: hor[r.tipo].hAno ? 'anuncios' : 'padrao-do-motor',
        anuncios: r.n, mediana: r.mediana, anos: r.anos, fonte: 'mercado-2026-11' };
    });
    const doCatalogo = (x) => modelos.find((m) => m.tipo === x.tipo && m.marca === x.marca && m.modelo === x.modelo) || null;
    const usaveis = anuncios.filter(doCatalogo);
    // anúncios no formato de "venda de referência" do motor; cond = estado da máquina avaliada (anúncio não informa)
    function comparaveis(cond) {
      return usaveis.map((a) => {
        const m = doCatalogo(a), informou = a.horas > 0;
        return { id: 'mercado-' + a.id, tipo: a.tipo, marca: a.marca, modelo: a.modelo, ano: a.ano,
          horas: informou ? a.horas : Math.round(m.hAno * Math.max(0, idadeDe(a))), horasInformadas: informou,
          cond, vendido: a.preco, entrada: dados.coleta, saida: dados.coleta, diasPatio: null,
          referencia: m.base, hAno: m.hAno, origem: 'Anúncio público (preço pedido)', fonte: a.fonte, url: a.url };
      });
    }
    return { coleta: dados.coleta, fontes: dados.fontes, minimo: dados.minimo, anuncios, usaveis, resumo, modelos, depreciacao: dep, horasPorAno: hor,
      doCatalogo, comparaveis, mediana, referencia };
  }

  const API = montar(D);
  API.montar = montar;
  raiz.MERCADO = API;
})(typeof window !== 'undefined' ? window : globalThis);
