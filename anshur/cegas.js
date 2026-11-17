// Teste às cegas público (teste-as-cegas.html): regras sem tela. Roda só no navegador; nada é enviado.
// Usa o motor de avaliação real (motor.js); não tem conta própria de preço.
// Base geral = BASE REAL DE MERCADO (mercado.js / mercado-anuncios.js): catálogo com a referência de cada modelo calculada
// dos anúncios públicos (a data da coleta vem dos dados) e os próprios anúncios como comparáveis. São PREÇOS PEDIDOS em anúncio,
// não preços de venda fechada. Nada da demonstração (dados.js, revenda fictícia) entra aqui.
// Validação temporal (walk-forward): as trocas vão em ordem cronológica e cada uma é avaliada só com a base de mercado
// mais as trocas da revenda que vieram antes dela (e, quando há datas, que já tinham sido vendidas na data dela).
(function (raiz) {
  // estado declarado → nota da ficha de inspeção (1 a 5) → condição 0 a 100, a mesma escala do motor (nota × 20)
  const ESTADOS = [
    { id: 'excelente', nome: 'Excelente', nota: 5 },
    { id: 'bom', nome: 'Bom', nota: 4 },
    { id: 'regular', nome: 'Regular', nota: 3 },
    { id: 'ruim', nome: 'Ruim', nota: 2 }
  ];
  const TIPOS = { trator: 'Trator', colhedora: 'Colhedora', pulverizador: 'Pulverizador', plantadeira: 'Plantadeira', implemento: 'Implemento' };
  // implemento (grade, arado, subsolador, roçadeira, distribuidor, carreta, plataforma...) não tem horímetro
  const semHoras = (tipo) => tipo === 'implemento';
  const OUTRO = '__outro';
  const FORA = 'Este modelo ainda não está disponível no catálogo de avaliação do Anshur.';
  const TOTAL = 5;
  const MARGEM = 0.14; // margem-alvo padrão do Anshur (a mesma sugerida a uma revenda nova); aparece no cálculo de cada troca

  // contexto do teste a partir da base de mercado (window.MERCADO): catálogo real e comparáveis com o estado da máquina avaliada
  function contextoMercado(MER, extra) {
    return Object.assign({
      modelos: MER.modelos,
      base: (maq) => MER.comparaveis(maq.cond),
      margem: MARGEM,
      mercado: { n: MER.usaveis.length, modelos: MER.modelos.length, coleta: MER.coleta, fontes: MER.fontes }
    }, extra || {});
  }

  const condDe = (estado) => { const e = ESTADOS.find((x) => x.id === estado); return e ? e.nota * 20 : null; };
  const somaDias = (iso, dias) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + dias); return d.toISOString().slice(0, 10); };
  const inteiro = (v) => (v === '' || v == null ? NaN : Number(v));
  const ehInteiro = (v) => Number.isInteger(v);

  // procura no catálogo real; nunca troca por outro modelo parecido
  function doCatalogo(modelos, t) {
    if (!t || !t.modelo || t.modelo === OUTRO || t.marca === OUTRO) return null;
    return modelos.find((m) => m.tipo === t.tipo && m.marca === t.marca && m.modelo === t.modelo) || null;
  }

  // devolve { campo: mensagem }; vazio = troca válida
  function validar(t, ctx) {
    const e = {}, hoje = ctx.hoje, anoMax = +hoje.slice(0, 4);
    t = t || {};
    if (!TIPOS[t.tipo]) e.tipo = 'Escolha a categoria.';
    if (!t.marca) e.marca = 'Escolha a marca.';
    if (!t.modelo) e.modelo = 'Escolha o modelo.';
    if (t.tipo && t.marca && t.modelo && !doCatalogo(ctx.modelos, t)) e.modelo = FORA;
    const ano = inteiro(t.ano), horas = inteiro(t.horas), dias = inteiro(t.dias);
    if (!(ehInteiro(ano) && ano >= 1990 && ano <= anoMax)) e.ano = `Informe o ano da máquina (1990 a ${anoMax}).`;
    if (!semHoras(t.tipo) && !(ehInteiro(horas) && horas >= 0 && horas <= 100000)) e.horas = 'Informe as horas (número inteiro, 0 ou mais).';
    if (!condDe(t.estado)) e.estado = 'Escolha o estado.';
    if (!(t.pago > 0)) e.pago = 'Informe quanto a revenda pagou na troca.';
    if (!(t.vendido > 0)) e.vendido = 'Informe por quanto vendeu depois.';
    if (t.pago > 0 && t.vendido > 0 && (t.pago > t.vendido * 3 || t.vendido > t.pago * 3)) e.vendido = 'Valor pago e valor vendido muito diferentes: confira os zeros.';
    if (!(ehInteiro(dias) && dias >= 0 && dias <= 3650)) e.dias = 'Informe os dias no pátio (número inteiro, 0 ou mais).';
    if (t.data) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t.data) || isNaN(Date.parse(t.data))) e.data = 'Data inválida.';
      else if (t.data > hoje) e.data = 'A data da troca não pode estar no futuro.';
      else if (!e.dias && somaDias(t.data, dias) > hoje) e.dias = 'Com essa data, a venda cairia no futuro: confira os dias no pátio.';
      else if (!e.ano && ano > +t.data.slice(0, 4) + 1) e.ano = 'A máquina é mais nova que a data da troca: confira o ano ou a data.';
    }
    return e;
  }
  const valida = (t, ctx) => Object.keys(validar(t, ctx)).length === 0;

  // ordem cronológica: com a data de todas, pela data; senão, a ordem do cadastro (pedimos da mais antiga para a mais recente)
  function ordenar(trocas) {
    const idx = trocas.map((t, i) => i);
    const todasComData = trocas.every((t) => t.data);
    if (todasComData) idx.sort((a, b) => trocas[a].data.localeCompare(trocas[b].data) || a - b);
    return { ordem: idx, porData: todasComData, semData: trocas.filter((t) => !t.data).length };
  }

  // a troca da revenda vira uma "venda concluída" no formato do motor
  // modelos (opcional): catálogo de mercado; a máquina leva a referência e as horas/ano do modelo para o motor
  // não procurar no catálogo da demonstração
  function paraMotor(t, n, modelos) {
    const m = { id: 'R' + n, tipo: t.tipo, marca: t.marca, modelo: t.modelo, ano: +t.ano, horas: semHoras(t.tipo) ? 0 : +t.horas, cond: condDe(t.estado),
      pago: t.pago, vendido: t.vendido, diasPatio: +t.dias, origem: 'Teste às cegas' };
    const c = modelos ? doCatalogo(modelos, t) : null;
    if (c) { m.referencia = c.base; m.hAno = c.hAno; }
    if (t.data) { m.entrada = t.data; m.saida = somaDias(t.data, +t.dias); }
    return m;
  }

  // histórico da revenda que a troca de posição k (0 = mais antiga) pode usar: só as anteriores a ela.
  // Com datas nas duas, a anterior só entra se já tinha sido vendida antes da data desta troca (sem vazamento).
  function historicoPara(k, maqs) {
    const atual = maqs[k], usadas = [], foraPorData = [];
    for (let j = 0; j < k; j++) {
      const p = maqs[j];
      if (atual.entrada && p.saida && !(p.saida < atual.entrada)) foraPorData.push(j);
      else usadas.push(j);
    }
    return { usadas, foraPorData };
  }

  // ctx: { motor, modelos (catálogo de mercado), base (comparáveis de mercado: lista ou função da máquina avaliada),
  //        margem, hoje, mercado (resumo da base para o texto de limitações) } — ver contextoMercado
  function analisar(trocas, ctx) {
    const { ordem, porData, semData } = ordenar(trocas);
    const baseDe = typeof ctx.base === 'function' ? ctx.base : () => ctx.base;
    const maqs = ordem.map((i, k) => paraMotor(trocas[i], k + 1, ctx.modelos));
    const linhas = maqs.map((maq, k) => {
      const h = historicoPara(k, maqs);
      const historico = baseDe(maq).concat(h.usadas.map((j) => maqs[j]));
      const r = ctx.motor.avaliar(maq, { historico, dataIdade: maq.entrada, margem: ctx.margem, semValidacao: true });
      const l = { pos: k + 1, cadastro: ordem[k] + 1, maq, troca: trocas[ordem[k]], usadas: h.usadas.map((j) => j + 1), foraPorData: h.foraPorData.map((j) => j + 1), r };
      if (!r) return l;
      const efeito = (nome) => { const mo = r.motivos.find((x) => x.nome === nome); return mo ? mo.valor : 0; };
      l.ajustes = { idade: efeito('Ano'), horas: efeito('Horas de uso'), conservacao: efeito('Estado na inspeção') };
      l.margemValor = Math.round(r.venda * r.margem);
      l.dif = maq.pago - r.teto;
      l.difPct = l.dif / r.teto;
      l.bruto = maq.vendido - maq.pago;
      l.erroVenda = (r.venda - maq.vendido) / maq.vendido;
      return l;
    });
    const ok = linhas.filter((l) => l.r);
    const soma = (f) => ok.reduce((s, l) => s + f(l), 0);
    const resumo = {
      n: ok.length, total: linhas.length,
      acima: ok.filter((l) => l.dif > 0).length,
      somaAcima: soma((l) => Math.max(0, l.dif)),
      somaAbaixo: soma((l) => Math.max(0, -l.dif)),
      liquido: soma((l) => l.dif),
      pago: soma((l) => l.maq.pago), recomendado: soma((l) => l.r.teto),
      prejuizos: ok.filter((l) => l.bruto < 0).length,
      prejuizosAcima: ok.filter((l) => l.bruto < 0 && l.dif > 0).length,
      diasMedio: ok.length ? Math.round(soma((l) => l.maq.diasPatio) / ok.length) : 0,
      diasAcima: (() => { const a = ok.filter((l) => l.dif > 0); return a.length ? Math.round(a.reduce((s, l) => s + l.maq.diasPatio, 0) / a.length) : null; })(),
      erroVendaMedio: ok.length ? soma((l) => Math.abs(l.erroVenda)) / ok.length : 0
    };
    return { linhas, resumo, porData, semData, mercado: ctx.mercado, limites: limites(linhas, { porData, semData, mercado: ctx.mercado, modelos: ctx.modelos }) };
  }

  const SITES = { 'Agrofy': 'Agrofy (agrofy.com.br)', 'Tratores e Colheitadeiras': 'Tratores e Colheitadeiras (tratoresecolheitadeiras.com.br)', 'MF Rural': 'MF Rural (mfrural.com.br)' };
  const dataBR = (iso) => iso.split('-').reverse().join('/');
  const textoBase = (m) => `Base de mercado: ${m.n.toLocaleString('pt-BR')} anúncios públicos de máquinas e implementos usados coletados em ${dataBR(m.coleta)} (fontes: ${m.fontes.map((f) => SITES[f] || f).join('; ')}), cobrindo ${m.modelos} modelos. São preços pedidos, não de venda fechada.`;

  function limites(linhas, info) {
    const m = info.mercado;
    const out = [
      `São só ${linhas.length} negócios: o resultado é uma estimativa com base nos preços de mercado e nessas trocas, sem precisão estatística. Serve para conversar sobre a decisão, não para provar ganho ou perda.`,
      m ? textoBase(m) : `Base geral: catálogo com ${info.modelos.length} modelos.`,
      'Preço pedido costuma ficar acima do preço de venda fechada, então a venda estimada da primeira troca tende a sair alta. A partir da segunda, as vendas reais de vocês entram no cálculo e puxam a estimativa para a realidade da revenda. A referência de cada modelo é a mediana dos anúncios, levada para 1 ano de uso com a depreciação medida nos próprios anúncios.',
      'Anúncio não informa o estado da máquina e quase nunca as horas: a base de mercado não ajusta conservação nem horas. Esses ajustes só aparecem com as trocas de vocês.',
      `Os preços de mercado são de ${m ? dataBR(m.coleta).slice(3) : 'hoje'}. Em trocas de anos atrás, o mercado era outro e a comparação perde precisão. Não é a Tabela Fipe nem o mercado da sua região.`,
      'O valor pago e o valor vendido de cada troca só entram no cálculo das trocas seguintes, nunca no da própria troca.',
      'O resultado real mostrado é venda menos valor pago. Preparo, comissão e juros que a revenda teve não foram informados.'
    ];
    if (info.semData) out.push(`${info.semData === linhas.length ? 'Nenhuma troca tem' : info.semData + ' de ' + linhas.length + ' trocas estão sem'} data: usamos a ordem em que você cadastrou e contamos a idade da máquina como se a troca fosse hoje, o que tende a baixar o valor recomendado. Com as datas, o teste fica mais justo.`);
    const fora = linhas.filter((l) => l.foraPorData.length);
    if (fora.length) out.push(`Em ${fora.length} ${fora.length === 1 ? 'troca' : 'trocas'}, alguma troca anterior ainda não tinha sido vendida na data dela e ficou fora do histórico (o Anshur ainda não saberia aquele preço).`);
    if (linhas.some((l) => semHoras(l.maq.tipo))) out.push('Implemento não tem horímetro: é avaliado pelo ano e pelo estado. Cada "modelo" de implemento é o grupo e o porte que os anúncios informam (ex.: Grade aradora 16 discos), por fabricante; a perda por ano é medida nos anúncios do próprio grupo.');
    const sem = linhas.filter((l) => !l.r);
    if (sem.length) out.push(`${sem.length} ${sem.length === 1 ? 'troca não pôde' : 'trocas não puderam'} ser avaliadas por falta de referência e ficaram fora do resumo.`);
    return out;
  }

  const real = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  const pct = (v) => (v * 100).toFixed(1).replace('.', ',') + '%';
  function textoResumo(res) {
    const s = res.resumo, l = [];
    l.push('Teste às cegas do Anshur (calculado no navegador, com ' + s.n + ' trocas antigas)');
    l.push(`Em ${s.acima} de ${s.n} trocas a revenda pagou acima do valor máximo recomendado pelo Anshur.`);
    if (s.liquido > 0) l.push(`No total, o Anshur teria mandado pagar ${real(s.liquido)} a menos (${real(s.pago)} pagos x ${real(s.recomendado)} recomendados).`);
    else l.push(`No total, a revenda pagou ${real(-s.liquido)} abaixo do recomendado (${real(s.pago)} pagos x ${real(s.recomendado)} recomendados).`);
    res.linhas.filter((x) => x.r).forEach((x) => l.push(`${x.pos}. ${x.maq.marca} ${x.maq.modelo} ${x.maq.ano}: pagou ${real(x.maq.pago)}, máximo Anshur ${real(x.r.teto)} (${x.dif > 0 ? '+' : ''}${pct(x.difPct)})`));
    const mes = res.mercado && res.mercado.coleta ? res.mercado.coleta.slice(5, 7) + '/' + res.mercado.coleta.slice(0, 4) : '';
    l.push(`Estimativa com base em preços pedidos em anúncios públicos${mes ? ' (' + mes + ')' : ''} e em ${s.n} negócios, sem precisão estatística.`);
    return l.join('\n');
  }

  const API = { ESTADOS, TIPOS, semHoras, OUTRO, FORA, TOTAL, MARGEM, contextoMercado, textoBase, condDe, somaDias, doCatalogo, validar, valida, ordenar, paraMotor, historicoPara, analisar, textoResumo };
  if (typeof module !== 'undefined') module.exports = API; else raiz.CEGAS = API;
})(typeof window !== 'undefined' ? window : globalThis);
