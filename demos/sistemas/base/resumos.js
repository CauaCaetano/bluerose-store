// =============================================================
// Veltria · resumo diário do dono
// -------------------------------------------------------------
// Funções puras (sem tela): recebem os dados do sistema e a data de hoje
// e devolvem o resumo do dia. Usadas dentro do sistema (botão "Resumo do
// dia") e pela função agendada que manda o e-mail de manhã (nexo-resumo).
// =============================================================
const R$ = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const mais = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const soma = (l, f) => l.reduce((s, x) => s + (Number(f(x)) || 0), 0);
const L = (d, k) => (Array.isArray(d[k]) ? d[k] : []);
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// -------------------------------------------------------------
// Alertas financeiros: regras que vigiam os números e sugerem a ação.
// Limites em _cfg.alertas: { margem_min (%), saldo_min (R$), meta_receita (R$/mês) }.
// -------------------------------------------------------------
const mesDe = (iso, n) => { const [a, m] = iso.split('-').map(Number); const d = new Date(a, m - 1 + n, 15); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const nomeMesA = (ym) => MESES[Number(ym.slice(5)) - 1];
const pctA = (v) => `${v.toFixed(1).replace('.', ',')}%`;
const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const NOMES_CAT = { servicos: 'Serviços prestados', pecas: 'Venda de peças', contratos: 'Contratos', fornecedores: 'Peças e materiais', salarios: 'Salários e encargos', prolabore: 'Pró-labore', aluguel: 'Aluguel', energia: 'Energia e água', internet: 'Internet e telefone', combustivel: 'Combustível e veículos', marketing: 'Marketing', contador: 'Contabilidade', tarifas: 'Tarifas bancárias', impostos: 'Impostos' };
const limites = (d) => ({ margem_min: 15, saldo_min: 0, meta_receita: 0, ...((d._cfg || {}).alertas || {}) });
const ritmoMeta = (feito, meta, hoje) => { const dia = Number(hoje.slice(8)), dm = new Date(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)), 0).getDate(); return dia >= 10 && meta > 0 && feito < meta * (dia / dm) * 0.85 ? { proj: (feito / dia) * dm } : null; };

const ALERTAS = {
  financeiro(d, hoje) {
    const lim = limites(d), lanc = L(d, 'lancamentos'), out = [];
    const pessoa = new Map(L(d, 'pessoas').map((p) => [p.id, p.nome]));
    const sinal = (l) => (l.tipo === 'receita' ? 1 : -1), ab = lanc.filter((l) => l.status === 'aberto');
    // 1. margem líquida do último mês fechado (competência: vencimento)
    const m1 = mesDe(hoje, -1), m2 = mesDe(hoje, -2);
    const margem = (ym) => { const ls = lanc.filter((l) => String(l.vencimento).startsWith(ym)), r = soma(ls.filter((l) => l.tipo === 'receita'), (l) => l.valor); return r ? ((r - soma(ls.filter((l) => l.tipo === 'despesa'), (l) => l.valor)) / r) * 100 : null; };
    const g1 = margem(m1), g2 = margem(m2);
    if (g1 !== null && (g1 < lim.margem_min || (g2 !== null && g2 - g1 > 2))) out.push({ nivel: g1 < 0 ? 'alto' : 'medio', regra: 'margem', titulo: g1 < lim.margem_min ? `Margem de ${nomeMesA(m1)} ficou em ${pctA(g1)}, abaixo da meta de ${pctA(lim.margem_min)}` : `Margem caiu de ${pctA(g2)} em ${nomeMesA(m2)} para ${pctA(g1)} em ${nomeMesA(m1)}`, acao: 'Revise as maiores despesas do mês e os preços e descontos.' });
    // 2. caixa projetado nas próximas 4 semanas
    let saldo = soma(L(d, 'contas'), (c) => c.saldo_inicial) + soma(lanc.filter((l) => l.status === 'pago' && l.pago_em <= hoje), (l) => sinal(l) * l.valor);
    let menor = Infinity, quando = hoje;
    for (let i = 0; i <= 28; i++) { const dia = mais(hoje, i); saldo += soma(ab.filter((l) => (l.vencimento < hoje ? hoje : l.vencimento) === dia), (l) => sinal(l) * l.valor); if (saldo < menor) { menor = saldo; quando = dia; } }
    if (menor < lim.saldo_min) out.push({ nivel: 'alto', regra: 'caixa', titulo: `O caixa chega a ${R$(menor)} em ${ddmm(quando)}${lim.saldo_min ? ` (mínimo combinado: ${R$(lim.saldo_min)})` : ''}`, acao: 'Antecipe recebimentos, renegocie ou adie pagamentos antes dessa data.' });
    // 3. contas a receber vencidas
    const aRec = ab.filter((l) => l.tipo === 'receita'), venc = aRec.filter((l) => l.vencimento < hoje), tv = soma(venc, (l) => l.valor), ta = soma(aRec, (l) => l.valor);
    if (ta && tv / ta > 0.1) {
      const porCli = {}; venc.forEach((l) => { porCli[l.pessoa] = (porCli[l.pessoa] || 0) + l.valor; });
      const top = Object.entries(porCli).sort((a, b) => b[1] - a[1]).slice(0, 2);
      out.push({ nivel: tv / ta > 0.25 ? 'alto' : 'medio', regra: 'vencidos', titulo: `${R$(tv)} a receber estão vencidos (${pctA((tv / ta) * 100)} do total a receber)`, acao: `Cobre primeiro: ${top.map(([p, v]) => `${pessoa.get(p) || 'cliente'} (${R$(v)})`).join(' e ')}.` });
    }
    // 4. despesas fora do padrão: categoria acima da média e fornecedor novo
    const desp = lanc.filter((l) => l.tipo === 'despesa' && l.vencimento <= hoje), ini30 = mais(hoje, -30), ini120 = mais(hoje, -120);
    const cats = [...new Set(desp.map((l) => l.categoria))];
    for (const c of cats) {
      const at = soma(desp.filter((l) => l.categoria === c && l.vencimento > ini30), (l) => l.valor), base = soma(desp.filter((l) => l.categoria === c && l.vencimento > ini120 && l.vencimento <= ini30), (l) => l.valor) / 3;
      if (base > 0 && at > base * 1.3 && at - base > 300) out.push({ nivel: 'medio', regra: 'categoria', titulo: `${NOMES_CAT[c] || c}: ${R$(at)} nos últimos 30 dias, ${Math.round((at / base - 1) * 100)}% acima da média`, acao: 'Confira se é um gasto pontual ou se virou recorrente.' });
    }
    const vistos = new Set(desp.filter((l) => l.vencimento <= mais(hoje, -15)).map((l) => l.pessoa));
    const novos = lanc.filter((l) => l.tipo === 'despesa' && l.pessoa && !vistos.has(l.pessoa) && l.vencimento > mais(hoje, -15) && l.vencimento <= mais(hoje, 15) && l.valor >= 1000);
    for (const l of novos.slice(0, 2)) out.push({ nivel: 'medio', regra: 'fornecedor', titulo: `Fornecedor novo com valor alto: ${pessoa.get(l.pessoa) || 'sem nome'}, ${R$(l.valor)} (${l.descricao})`, acao: 'Confirme a origem e o valor antes de pagar.' });
    // 5. capital de giro: o que entra em 30 dias cobre o que sai?
    const s0 = soma(L(d, 'contas'), (c) => c.saldo_inicial) + soma(lanc.filter((l) => l.status === 'pago' && l.pago_em <= hoje), (l) => sinal(l) * l.valor);
    const r30 = soma(aRec.filter((l) => l.vencimento <= mais(hoje, 30)), (l) => l.valor), p30 = soma(ab.filter((l) => l.tipo === 'despesa' && l.vencimento <= mais(hoje, 30)), (l) => l.valor);
    if (s0 + r30 - p30 < 0 && !out.some((x) => x.regra === 'caixa')) out.push({ nivel: 'alto', regra: 'giro', titulo: `Faltam ${R$(p30 - s0 - r30)} para cobrir as contas dos próximos 30 dias`, acao: 'Acelere os recebimentos, reduza prazos dados aos clientes ou negocie prazo com fornecedores.' });
    // 6. receita x meta do mês
    const ym = hoje.slice(0, 7), rMes = soma(lanc.filter((l) => l.tipo === 'receita' && String(l.vencimento).startsWith(ym) && l.vencimento <= hoje), (l) => l.valor), rit = ritmoMeta(rMes, lim.meta_receita, hoje);
    if (rit) out.push({ nivel: 'medio', regra: 'meta', titulo: `No ritmo atual o mês fecha em ${R$(rit.proj)}, abaixo da meta de ${R$(lim.meta_receita)}`, acao: 'Puxe orçamentos parados e clientes recorrentes.' });
    return out;
  },
  farmacia(d, hoje) {
    const lim = limites(d), out = [], vs = L(d, 'vendas').filter((v) => v.status !== 'cancelada');
    const total = (v) => soma(v.itens || [], (x) => x.qtd * x.preco) - (v.desconto || 0) + ((v.entrega || {}).taxa || 0), custo = (v) => soma(v.itens || [], (x) => x.qtd * (x.custo || 0));
    const m1 = mesDe(hoje, -1), m2 = mesDe(hoje, -2);
    const margem = (ym) => { const l = vs.filter((v) => String(v.data).startsWith(ym)), t = soma(l, total); return t ? ((t - soma(l, custo)) / t) * 100 : null; };
    const g1 = margem(m1), g2 = margem(m2);
    if (g1 !== null && (g1 < lim.margem_min || (g2 !== null && g2 - g1 > 2))) out.push({ nivel: 'medio', regra: 'margem', titulo: g1 < lim.margem_min ? `Margem bruta de ${nomeMesA(m1)} ficou em ${pctA(g1)}, abaixo da meta de ${pctA(lim.margem_min)}` : `Margem bruta caiu de ${pctA(g2)} em ${nomeMesA(m2)} para ${pctA(g1)} em ${nomeMesA(m1)}`, acao: 'Veja descontos de convênio, genéricos vendidos abaixo da margem e custo das distribuidoras.' });
    const lotes = L(d, 'produtos').flatMap((p) => (p.lotes || []).filter((l) => l.qtd > 0).map((l) => ({ p, l })));
    const venc = lotes.filter((x) => x.l.validade < hoje), em60 = lotes.filter((x) => x.l.validade >= hoje && x.l.validade <= mais(hoje, 60));
    if (venc.length) out.push({ nivel: 'alto', regra: 'vencidos', titulo: `${plural(venc.length, 'lote vencido', 'lotes vencidos')} no estoque (${R$(soma(venc, (x) => x.l.qtd * (x.p.custo || 0)))} a custo)`, acao: 'Separe da área de venda, identifique e dê baixa em Lotes e validade.' });
    if (em60.length) out.push({ nivel: 'medio', regra: 'validade', titulo: `${plural(em60.length, 'lote vence', 'lotes vencem')} em até 60 dias (${R$(soma(em60, (x) => x.l.qtd * (x.p.custo || 0)))} a custo)`, acao: 'Peça troca à distribuidora ou faça promoção antes de virar perda.' });
    const temps = L(d, 'temperaturas').filter((t) => t.data >= mais(hoje, -2)), fora = temps.filter((t) => Number(t.maxima ?? t.atual) > 8 || Number(t.minima ?? t.atual) < 2);
    if (fora.length) out.push({ nivel: 'alto', regra: 'geladeira', titulo: `Geladeira fora de 2 a 8 °C em ${plural(fora.length, 'leitura', 'leituras')} nos últimos 3 dias`, acao: 'Confira os termolábeis e registre a ação tomada.' });
    const pmc = L(d, 'produtos').filter((p) => p.pmc && p.preco > p.pmc);
    if (pmc.length) out.push({ nivel: 'alto', regra: 'pmc', titulo: `${plural(pmc.length, 'produto', 'produtos')} com preço acima do PMC`, acao: 'Ajuste o preço: vender acima do PMC da CMED é proibido.' });
    const rit = ritmoMeta(soma(vs.filter((v) => String(v.data).startsWith(hoje.slice(0, 7))), total), lim.meta_receita, hoje);
    if (rit) out.push({ nivel: 'medio', regra: 'meta', titulo: `No ritmo atual o mês fecha em ${R$(rit.proj)}, abaixo da meta de ${R$(lim.meta_receita)}`, acao: 'Lembre os clientes de uso contínuo e os convênios.' });
    return out;
  },
  gestao(d, hoje) {
    const lim = limites(d), out = [], fat = L(d, 'vendas').filter((v) => ['faturado', 'enviado', 'entregue'].includes(v.status));
    const total = (v) => soma(v.itens || [], (x) => x.qtd * x.preco) - (v.desconto || 0) + (v.frete || 0), custo = (v) => soma(v.itens || [], (x) => x.qtd * (x.custo || 0));
    const m1 = mesDe(hoje, -1), m2 = mesDe(hoje, -2);
    const margem = (ym) => { const vs = fat.filter((v) => String(v.data).startsWith(ym)), t = soma(vs, total); return t ? ((t - soma(vs, custo)) / t) * 100 : null; };
    const g1 = margem(m1), g2 = margem(m2);
    if (g1 !== null && (g1 < lim.margem_min || (g2 !== null && g2 - g1 > 2))) out.push({ nivel: 'medio', regra: 'margem', titulo: g1 < lim.margem_min ? `Margem bruta de ${nomeMesA(m1)} ficou em ${pctA(g1)}, abaixo da meta de ${pctA(lim.margem_min)}` : `Margem bruta caiu de ${pctA(g2)} em ${nomeMesA(m2)} para ${pctA(g1)} em ${nomeMesA(m1)}`, acao: 'Veja descontos dados, frete e produtos vendidos abaixo do custo de reposição.' });
    const dia = Number(hoje.slice(8)), ym = hoje.slice(0, 7);
    const ate = (ymx) => soma(fat.filter((v) => String(v.data).startsWith(ymx) && Number(String(v.data).slice(8, 10)) <= dia), total);
    const agora = ate(ym), antes = ate(m1);
    if (dia >= 7 && antes > 0 && agora < antes * 0.8) out.push({ nivel: 'medio', regra: 'ritmo', titulo: `Vendas do mês ${Math.round((1 - agora / antes) * 100)}% abaixo do mesmo ponto de ${nomeMesA(m1)} (${R$(agora)} contra ${R$(antes)})`, acao: 'Contate os clientes que compravam todo mês e não compraram ainda.' });
    const rit = ritmoMeta(soma(fat.filter((v) => String(v.data).startsWith(ym)), total), lim.meta_receita, hoje);
    if (rit) out.push({ nivel: 'medio', regra: 'meta', titulo: `No ritmo atual o mês fecha em ${R$(rit.proj)}, abaixo da meta de ${R$(lim.meta_receita)}`, acao: 'Ative representantes e clientes parados.' });
    const est = (p) => soma(Object.values(p.estoque || {}), (x) => x), ini = mais(hoje, -90);
    const vendeu = new Set(fat.filter((v) => v.data >= ini).flatMap((v) => (v.itens || []).map((x) => x.produto)));
    const ps = L(d, 'produtos'), parados = ps.filter((p) => est(p) > 0 && !vendeu.has(p.id)), vParado = soma(parados, (p) => est(p) * (p.custo || 0)), vTotal = soma(ps, (p) => Math.max(0, est(p)) * (p.custo || 0));
    if (vTotal && vParado / vTotal > 0.1) out.push({ nivel: 'medio', regra: 'parado', titulo: `${R$(vParado)} em estoque parado: ${plural(parados.length, 'produto', 'produtos')} sem venda há 90 dias`, acao: 'Faça promoção, devolva ao fornecedor ou pare de comprar esses itens.' });
    return out;
  },
};
/** Alertas do dia: [{ nivel: 'alto' | 'medio', regra, titulo, acao }] */
export function alertasDoDia(app, dados, hoje) {
  const f = ALERTAS[app] || ALERTAS[String(app).replace(/^nexo-?/, '')];
  try { return f ? f(dados || {}, hoje) : []; } catch { return []; }
}

const RESUMOS = {
  crm(d, hoje) {
    const ontem = mais(hoje, -1), ym = hoje.slice(0, 7);
    const ganhos = L(d, 'negocios').filter((n) => n.status === 'ganho'), abertos = L(d, 'negocios').filter((n) => n.status === 'aberto');
    const mes = soma(ganhos.filter((n) => String(n.fechado || '').startsWith(ym)), (n) => n.valor), meta = soma(L(d, 'metas').filter((m) => m.mes === ym), (m) => m.valor);
    const ativ = L(d, 'atividades').filter((a) => !a.feita), hojeA = ativ.filter((a) => String(a.quando).slice(0, 10) === hoje), atras = ativ.filter((a) => String(a.quando).slice(0, 10) < hoje);
    const semProx = abertos.filter((n) => !ativ.some((a) => a.negocio === n.id));
    return {
      destaques: [['Vendido ontem', R$(soma(ganhos.filter((n) => n.fechado === ontem), (n) => n.valor))], ['Vendido no mês', `${R$(mes)}${meta ? ` (${Math.round((mes / meta) * 100)}% da meta)` : ''}`], ['Em negociação', `${R$(soma(abertos, (n) => n.valor))} em ${abertos.length} negócios`]],
      itens: hojeA.sort((a, b) => String(a.quando).localeCompare(String(b.quando))).slice(0, 8).map((a) => `${String(a.quando).slice(11, 16)} · ${a.titulo}`),
      tituloItens: plural(hojeA.length, 'atividade para hoje', 'atividades para hoje'),
      alertas: [atras.length && plural(atras.length, 'atividade atrasada', 'atividades atrasadas'), semProx.length && `${plural(semProx.length, 'negócio', 'negócios')} sem próxima atividade`].filter(Boolean),
    };
  },
  agenda(d, hoje) {
    const ontem = mais(hoje, -1), amanha = mais(hoje, 1), ags = L(d, 'agendamentos');
    const hojeL = ags.filter((x) => x.data === hoje && !['cancelado', 'faltou'].includes(x.status)).sort((a, b) => String(a.ini).localeCompare(String(b.ini)));
    const cmd = L(d, 'comandas').filter((k) => k.status === 'fechada' && k.data === ontem), fatOntem = soma(cmd, (k) => soma(k.itens || [], (i) => i.qtd * i.preco) - (k.desconto || 0));
    const clientes = new Map(L(d, 'clientes').map((c) => [c.id, c]));
    const aniver = L(d, 'clientes').filter((c) => String(c.nascimento || '').slice(5) === hoje.slice(5));
    const semConf = ags.filter((x) => x.data === amanha && x.status === 'agendado');
    return {
      destaques: [['Atendimentos hoje', `${hojeL.length} · previsto ${R$(soma(hojeL, (x) => x.valor))}`], ['Faturado ontem', R$(fatOntem)], ['Faltas ontem', String(ags.filter((x) => x.data === ontem && x.status === 'faltou').length)]],
      itens: hojeL.slice(0, 10).map((x) => `${x.ini} · ${clientes.get(x.cliente)?.nome || 'Cliente'}`), tituloItens: 'Agenda de hoje',
      alertas: [semConf.length && `${plural(semConf.length, 'cliente de amanhã ainda não confirmou', 'clientes de amanhã ainda não confirmaram')}`, aniver.length && `Aniversário hoje: ${aniver.map((c) => c.nome.split(' ')[0]).join(', ')}`].filter(Boolean),
    };
  },
  juridico(d, hoje) {
    const amanha = mais(hoje, 1), pend = L(d, 'prazos').filter((p) => p.status === 'pendente');
    const procs = new Map(L(d, 'processos').map((p) => [p.id, p]));
    const urg = pend.filter((p) => p.tipo === 'prazo' && p.data <= amanha).sort((a, b) => a.data.localeCompare(b.data));
    const aud = pend.filter((p) => p.tipo !== 'prazo' && p.data === hoje);
    const atras = L(d, 'honorarios').filter((h) => h.status !== 'recebido' && h.vencimento < hoje);
    return {
      destaques: [['Prazos vencendo até amanhã', String(urg.length)], ['Audiências e perícias hoje', String(aud.length)], ['Intimações para tratar', String(L(d, 'publicacoes').filter((x) => x.status === 'nova').length)]],
      itens: [...urg.slice(0, 6).map((p) => `${p.data === hoje ? 'HOJE' : p.data < hoje ? 'VENCIDO' : 'amanhã'} · ${p.titulo} · ${procs.get(p.processo)?.numero || ''}`), ...aud.map((p) => `${p.hora || ''} · ${p.titulo}`)], tituloItens: 'Prazos e audiências',
      alertas: [atras.length && `${R$(soma(atras, (h) => h.valor))} de honorários em atraso`].filter(Boolean),
    };
  },
  financeiro(d, hoje) {
    const lanc = L(d, 'lancamentos'), sinal = (l) => (l.tipo === 'receita' ? 1 : -1);
    const saldo = soma(L(d, 'contas'), (c) => c.saldo_inicial) + soma(lanc.filter((l) => l.status === 'pago' && l.pago_em <= hoje), (l) => sinal(l) * l.valor);
    const ab = lanc.filter((l) => l.status === 'aberto');
    const pagarHoje = ab.filter((l) => l.tipo === 'despesa' && l.vencimento <= hoje), receberVenc = ab.filter((l) => l.tipo === 'receita' && l.vencimento < hoje), receberHoje = ab.filter((l) => l.tipo === 'receita' && l.vencimento === hoje);
    const os = L(d, 'ordens').filter((o) => o.status !== 'entregue');
    return {
      destaques: [['Saldo em contas', R$(saldo)], ['A pagar hoje (e vencidas)', R$(soma(pagarHoje, (l) => l.valor))], ['A receber hoje', R$(soma(receberHoje, (l) => l.valor))]],
      itens: pagarHoje.slice(0, 8).map((l) => `Pagar ${R$(l.valor)} · ${l.descricao}`), tituloItens: 'Contas para pagar hoje',
      alertas: [receberVenc.length && `${R$(soma(receberVenc, (l) => l.valor))} de clientes em atraso (${receberVenc.length})`, os.filter((o) => o.status === 'pronta').length && `${plural(os.filter((o) => o.status === 'pronta').length, 'OS pronta', 'OS prontas')} esperando retirada`, os.filter((o) => o.previsao < hoje).length && `${plural(os.filter((o) => o.previsao < hoje).length, 'OS atrasada', 'OS atrasadas')}`].filter(Boolean),
    };
  },
  farmacia(d, hoje) {
    const ontem = mais(hoje, -1), vs = L(d, 'vendas').filter((v) => v.status !== 'cancelada'), total = (v) => soma(v.itens || [], (x) => x.qtd * x.preco) - (v.desconto || 0) + ((v.entrega || {}).taxa || 0);
    const vOntem = vs.filter((v) => v.data === ontem), vMes = vs.filter((v) => String(v.data).startsWith(hoje.slice(0, 7)));
    const est = (p) => soma((p.lotes || []).filter((l) => l.validade >= hoje), (l) => l.qtd);
    const zerados = L(d, 'produtos').filter((p) => est(p) <= 0), baixos = L(d, 'produtos').filter((p) => est(p) > 0 && est(p) <= p.minimo);
    const venc = L(d, 'produtos').flatMap((p) => (p.lotes || []).filter((l) => l.qtd > 0 && l.validade < hoje).map(() => 1)).length;
    const receitas = L(d, 'receitas').filter((r) => r.data === ontem).length;
    return {
      destaques: [['Vendido ontem', `${R$(soma(vOntem, total))} em ${plural(vOntem.length, 'cupom', 'cupons')}`], ['Vendido no mês', R$(soma(vMes, total))], ['Receitas retidas ontem', String(receitas)]],
      itens: [...zerados.slice(0, 5).map((p) => `SEM ESTOQUE · ${p.nome}`), ...baixos.slice(0, 5).map((p) => `Abaixo do mínimo · ${p.nome}`)], tituloItens: 'Repor no balcão',
      alertas: [venc && `${plural(venc, 'lote vencido', 'lotes vencidos')} ainda no estoque`].filter(Boolean),
    };
  },
  gestao(d, hoje) {
    const ontem = mais(hoje, -1), vendas = L(d, 'vendas'), total = (v) => soma(v.itens || [], (x) => x.qtd * x.preco) - (v.desconto || 0) + (v.frete || 0);
    const fatOntem = vendas.filter((v) => v.data === ontem && ['faturado', 'enviado', 'entregue'].includes(v.status));
    const separar = vendas.filter((v) => ['aprovado', 'separacao'].includes(v.status));
    const est = (p) => soma(Object.values(p.estoque || {}), (x) => x);
    const zerados = L(d, 'produtos').filter((p) => est(p) <= 0), baixos = L(d, 'produtos').filter((p) => est(p) > 0 && est(p) <= p.minimo);
    const atrasadas = L(d, 'compras').filter((c) => ['enviado', 'parcial'].includes(c.status) && c.previsao < hoje);
    return {
      destaques: [['Vendido ontem', `${R$(soma(fatOntem, total))} em ${plural(fatOntem.length, 'pedido', 'pedidos')}`], ['Vendido no mês', R$(soma(vendas.filter((v) => String(v.data).startsWith(hoje.slice(0, 7)) && ['faturado', 'enviado', 'entregue'].includes(v.status)), total))], ['Para separar · repor', `${plural(separar.length, 'pedido', 'pedidos')} · ${plural(zerados.length + baixos.length, 'item', 'itens')}`]],
      itens: [...zerados.slice(0, 5).map((p) => `SEM ESTOQUE · ${p.nome}`), ...baixos.slice(0, 5).map((p) => `Abaixo do mínimo · ${p.nome}`)], tituloItens: 'Estoque',
      alertas: [atrasadas.length && `${plural(atrasadas.length, 'compra atrasada', 'compras atrasadas')} do fornecedor`].filter(Boolean),
    };
  },
  clinica(d, hoje) {
    const ontem = mais(hoje, -1), amanha = mais(hoje, 1), cs = L(d, 'consultas'), at = (c) => !['cancelado', 'faltou'].includes(c.status);
    const pac = new Map(L(d, 'pacientes').map((p) => [p.id, p])), prof = new Map(L(d, 'profissionais').map((p) => [p.id, p]));
    const hojeL = cs.filter((c) => c.data === hoje && at(c)).sort((a, b) => String(a.ini).localeCompare(String(b.ini)));
    const semPag = cs.filter((c) => c.tipo === 'particular' && c.status === 'atendido' && !c.pago);
    return {
      destaques: [['Consultas hoje', `${hojeL.length} · ${hojeL.filter((c) => c.status !== 'agendado').length} confirmadas`], ['Atendidos ontem', `${cs.filter((c) => c.data === ontem && c.status === 'atendido').length} · ${R$(soma(cs.filter((c) => c.data === ontem && c.status === 'atendido'), (c) => c.valor))}`], ['Faltas ontem', String(cs.filter((c) => c.data === ontem && c.status === 'faltou').length)]],
      itens: hojeL.slice(0, 10).map((c) => `${c.ini} · ${pac.get(c.paciente)?.nome || 'Paciente'} · ${prof.get(c.profissional)?.nome || ''}`), tituloItens: 'Agenda de hoje',
      alertas: [cs.filter((c) => c.data === amanha && c.status === 'agendado').length && `${plural(cs.filter((c) => c.data === amanha && c.status === 'agendado').length, 'consulta de amanhã sem confirmação', 'consultas de amanhã sem confirmação')}`, semPag.length && `${R$(soma(semPag, (c) => c.valor))} de atendimentos particulares sem pagamento`, cs.filter((c) => c.guia === 'pendente').length && `${plural(cs.filter((c) => c.guia === 'pendente').length, 'guia de convênio a enviar', 'guias de convênio a enviar')}`].filter(Boolean),
    };
  },
  academia(d, hoje) {
    const ontem = mais(hoje, -1), al = L(d, 'alunos'), ativos = al.filter((x) => x.status === 'ativo'), ms = L(d, 'mensalidades'), ck = L(d, 'checkins');
    const atras = ms.filter((m) => m.status === 'aberto' && m.vencimento < hoje), ult = new Map(); ck.forEach((c) => { if ((ult.get(c.aluno) || '') < c.data) ult.set(c.aluno, c.data); });
    const sumidos = ativos.filter((x) => !ult.get(x.id) || ult.get(x.id) <= mais(hoje, -10));
    const exp = L(d, 'experimentais').filter((x) => x.data === hoje && x.etapa === 'agendada');
    return {
      destaques: [['Alunos ativos', String(ativos.length)], ['Check-ins ontem', String(ck.filter((c) => c.data === ontem).length)], ['Recebido ontem', R$(soma(ms.filter((m) => m.pago_em === ontem), (m) => m.valor))]],
      itens: exp.map((x) => `Aula experimental: ${x.nome} (${x.interesse})`), tituloItens: 'Aulas experimentais hoje',
      alertas: [atras.length && `${R$(soma(atras, (m) => m.valor))} em mensalidades atrasadas (${new Set(atras.map((m) => m.aluno)).size} alunos)`, sumidos.length && `${plural(sumidos.length, 'aluno ativo sem treinar há 10 dias', 'alunos ativos sem treinar há 10 dias')}`].filter(Boolean),
    };
  },
  restaurante(d, hoje) {
    const ontem = mais(hoje, -1), ps = L(d, 'pedidos').filter((p) => p.pago && p.data === ontem);
    const tot = (p) => soma(p.itens || [], (i) => i.qtd * i.preco) * (p.servico ? 1.1 : 1) + (p.taxa || 0) - (p.desconto || 0);
    const comprar = L(d, 'insumos').filter((x) => x.estoque <= x.minimo);
    return {
      destaques: [['Vendido ontem', R$(soma(ps, tot))], ['Pedidos ontem', `${ps.length} · ${ps.filter((p) => p.canal !== 'salao').length} delivery/balcão`], ['Ticket médio', R$(soma(ps, tot) / (ps.length || 1))]],
      itens: comprar.slice(0, 8).map((x) => `Comprar: ${x.nome} (tem ${String(x.estoque).replace('.', ',')} ${x.un})`), tituloItens: 'Lista de compras',
      alertas: [comprar.length && `${plural(comprar.length, 'insumo abaixo do mínimo', 'insumos abaixo do mínimo')}`].filter(Boolean),
    };
  },
  imobiliaria(d, hoje) {
    const vs = L(d, 'visitas').filter((v) => v.data === hoje && v.status === 'agendada').sort((a, b) => a.hora.localeCompare(b.hora));
    const ps = new Map(L(d, 'pessoas').map((p) => [p.id, p])), im = new Map(L(d, 'imoveis').map((x) => [x.id, x]));
    const cb = L(d, 'cobrancas'), atras = cb.filter((c) => c.status === 'aberto' && c.vencimento < hoje), rep = cb.filter((c) => c.status === 'pago' && !c.repassado);
    return {
      destaques: [['Visitas hoje', String(vs.length)], ['Novos contatos para atender', String(L(d, 'negocios').filter((n) => n.etapa === 'lead').length)], ['Imóveis disponíveis', String(L(d, 'imoveis').filter((x) => x.status === 'disponivel').length)]],
      itens: vs.map((v) => `${v.hora} · ${ps.get(v.cliente)?.nome || ''} · ${im.get(v.imovel)?.codigo || ''}`), tituloItens: 'Visitas de hoje',
      alertas: [atras.length && `${R$(soma(atras, (c) => c.valor))} de aluguéis em atraso`, rep.length && `${plural(rep.length, 'repasse', 'repasses')} a fazer aos proprietários`].filter(Boolean),
    };
  },
  oficina(d, hoje) {
    const ontem = mais(hoje, -1), os = L(d, 'ordens'), ab = os.filter((o) => o.etapa !== 'entregue'), vale = (o) => (o.itens || []).filter((x) => x.aprovado !== false);
    const tot = (o) => soma(vale(o), (x) => x.qtd * x.preco) - (o.desconto || 0);
    const vs = new Map(L(d, 'veiculos').map((v) => [v.id, v])), ags = L(d, 'agendamentos').filter((x) => x.data === hoje).sort((a, b) => a.hora.localeCompare(b.hora));
    return {
      destaques: [['Carros no pátio', `${ab.length} · ${ab.filter((o) => o.etapa === 'pronto').length} prontos`], ['Faturado ontem', R$(soma(os.filter((o) => o.entregue_em === ontem), tot))], ['Agendados hoje', String(ags.length)]],
      itens: ags.map((x) => `${x.hora} · ${vs.get(x.veiculo)?.modelo || ''} ${vs.get(x.veiculo)?.placa || ''} · ${x.servico}`), tituloItens: 'Agendamentos de hoje',
      alertas: [ab.filter((o) => o.etapa === 'orcamento').length && `${plural(ab.filter((o) => o.etapa === 'orcamento').length, 'orçamento esperando resposta', 'orçamentos esperando resposta')}`, ab.filter((o) => o.previsao < hoje && !['pronto'].includes(o.etapa)).length && `${plural(ab.filter((o) => o.previsao < hoje && !['pronto'].includes(o.etapa)).length, 'carro atrasado', 'carros atrasados')} no pátio`].filter(Boolean),
    };
  },
  // Blue Rose Eternize · assessoria de casamentos
  cerimonial(d, hoje) {
    const evs = L(d, 'eventos').filter((e) => e.data >= hoje && e.etapa !== 'negociacao').sort((a, b) => a.data.localeCompare(b.data));
    const dias = (iso) => Math.round((new Date(`${iso}T12:00:00`) - new Date(`${hoje}T12:00:00`)) / 864e5);
    const atras = L(d, 'tarefas').filter((t) => !t.feita && t.prazo < hoje && evs.some((e) => e.id === t.evento));
    const venc = L(d, 'contratacoes').filter((c) => c.status !== 'pago' && c.vencimento && c.vencimento <= mais(hoje, 7));
    const semResp = L(d, 'convidados').filter((c) => c.rsvp === 'pendente' && evs.some((e) => e.id === c.evento && dias(e.data) <= 30));
    return {
      destaques: [['Próximo evento', evs[0] ? `${evs[0].nome} · ${dias(evs[0].data) === 0 ? 'hoje' : `em ${dias(evs[0].data)} dias`}` : 'nenhum'], ['Eventos a caminho', String(evs.length)], ['Pagamentos a fornecedores (7 dias)', R$(soma(venc, (c) => c.valor - (c.pago || 0)))]],
      itens: evs.filter((e) => dias(e.data) <= 30).map((e) => `${ddmm(e.data)} · ${e.nome} · ${e.local || ''}`), tituloItens: 'Eventos nos próximos 30 dias',
      alertas: [atras.length && plural(atras.length, 'tarefa atrasada', 'tarefas atrasadas'), semResp.length && `${plural(semResp.length, 'convidado sem resposta', 'convidados sem resposta')} em eventos deste mês`, venc.length && plural(venc.length, 'pagamento a fornecedor vence esta semana', 'pagamentos a fornecedores vencem esta semana')].filter(Boolean),
    };
  },
  // Veltria Obras · reformas e obras
  obras(d, hoje) {
    const obs = L(d, 'obras'), and = obs.filter((o) => o.status === 'andamento');
    const cobrar = obs.flatMap((o) => (o.etapas || []).filter((e) => e.status === 'feita' && !e.pago));
    const ultimo = (id) => L(d, 'diario').filter((x) => x.obra === id).map((x) => x.data).sort().pop();
    const parado = and.filter((o) => !ultimo(o.id) || ultimo(o.id) < mais(hoje, -2));
    const dev = L(d, 'diarias').filter((x) => !x.pago), extras = L(d, 'aditivos').filter((x) => x.status === 'pendente');
    return {
      destaques: [['Obras em andamento', String(and.length)], ['Pronto para cobrar', R$(soma(cobrar, (e) => e.valor))], ['Diárias a pagar', R$(soma(dev, (x) => x.valor))]],
      itens: and.map((o) => `${o.titulo} · ${(o.etapas || []).find((e) => e.status === 'andamento')?.nome || 'próxima etapa a definir'} · entrega ${ddmm(o.previsao)}`), tituloItens: 'Obras rodando',
      alertas: [cobrar.length && plural(cobrar.length, 'etapa pronta para cobrar', 'etapas prontas para cobrar'), parado.length && `${plural(parado.length, 'obra sem diário', 'obras sem diário')} há mais de 2 dias`, and.filter((o) => o.previsao < hoje).length && plural(and.filter((o) => o.previsao < hoje).length, 'obra com prazo vencido', 'obras com prazo vencido'), extras.length && plural(extras.length, 'serviço extra esperando o cliente', 'serviços extras esperando o cliente')].filter(Boolean),
    };
  },
  // Blue Rose Ofixl · serviços técnicos em campo
  ofixl(d, hoje) {
    const os = L(d, 'ordens'), cli = new Map(L(d, 'clientes').map((c) => [c.id, c])), abertas = ['agendada', 'caminho', 'atendimento'];
    const tot = (o) => soma((o.itens || []).filter((x) => x.aprovado !== false), (x) => Number(x.qtd || 1) * Number(x.preco || 0)) - Number(o.desconto || 0);
    const hojeL = os.filter((o) => abertas.includes(o.status) && o.data === hoje).sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
    const mes = hoje.slice(0, 7), feitas = os.filter((o) => o.status === 'concluida' && String(o.concluida_em || o.data).startsWith(mes));
    const receber = os.filter((o) => o.status === 'concluida' && !o.pago), orc = os.filter((o) => o.status === 'orcamento' && String(o.orcado_em || o.data) <= mais(hoje, -3));
    const prev = L(d, 'equipamentos').filter((x) => Number(x.periodicidade) && x.ultima && mais(x.ultima, Number(x.periodicidade)) <= mais(hoje, 15) && !os.some((o) => abertas.includes(o.status) && (o.equipamentos || []).includes(x.id)));
    return {
      destaques: [['Atendimentos hoje', String(hojeL.length)], ['Concluídos no mês', `${feitas.length} · ${R$(soma(feitas, tot))}`], ['A receber', R$(soma(receber, tot))]],
      itens: hojeL.map((o) => `${o.hora || ''} · ${cli.get(o.cliente)?.nome || ''} · ${o.tipo}`), tituloItens: 'Atendimentos de hoje',
      alertas: [prev.length && plural(prev.length, 'preventiva para oferecer', 'preventivas para oferecer'), orc.length && plural(orc.length, 'orçamento sem resposta', 'orçamentos sem resposta'), receber.length && plural(receber.length, 'serviço a receber', 'serviços a receber')].filter(Boolean),
    };
  },
  // Blue Rose Guard · controle de pragas
  pragas(d, hoje) {
    const os = L(d, 'ordens'), cli = new Map(L(d, 'clientes').map((c) => [c.id, c])), cfg = d._cfg || {};
    const hojeL = os.filter((o) => o.status === 'agendada' && o.data === hoje).sort((a, b) => a.hora.localeCompare(b.hora));
    const mes = hoje.slice(0, 7), exec = os.filter((o) => o.status === 'executada' && o.data.startsWith(mes));
    const receber = os.filter((o) => o.status === 'executada' && !o.pago), ret = os.filter((o) => o.retorno_de && o.status === 'agendada');
    const lic = [['Licença sanitária', cfg.licenca_sanitaria_validade], ['Licença ambiental', cfg.licenca_ambiental_validade]].filter(([, v]) => v && v <= mais(hoje, 30));
    const repor = L(d, 'produtos').filter((p) => p.estoque <= p.minimo);
    return {
      destaques: [['Serviços hoje', String(hojeL.length)], [`Executados no mês`, `${exec.length} · ${R$(soma(exec, (o) => o.valor))}`], ['A receber', R$(soma(receber, (o) => o.valor))]],
      itens: hojeL.map((o) => `${o.hora} · ${cli.get(o.cliente)?.nome || ''} · ${o.servico}${o.retorno_de ? ' (garantia)' : ''}`), tituloItens: 'Serviços de hoje',
      alertas: [...lic.map(([n, v]) => `${n} vence em ${ddmm(v)}`), ret.length && plural(ret.length, 'retorno em garantia agendado', 'retornos em garantia agendados'), repor.length && plural(repor.length, 'produto para repor', 'produtos para repor')].filter(Boolean),
    };
  },
};

/** Resumo do dia de um sistema: { destaques, itens, tituloItens, alertas } */
export function resumoDoDia(app, dados, hoje) {
  const id = RESUMOS[app] ? app : app.replace(/^nexo-?/, ''), f = RESUMOS[id];
  if (!f) return { destaques: [], itens: [], alertas: [] };
  const r = f(dados, hoje), novos = alertasDoDia(id, dados, hoje);
  // o alerta novo de vencidos já traz o valor e quem cobrar primeiro
  const antigos = novos.some((x) => x.regra === 'vencidos') ? r.alertas.filter((x) => !/clientes em atraso/.test(x)) : r.alertas;
  return { ...r, alertas: [...novos.map((x) => `${x.titulo}. ${x.acao}`), ...antigos] };
}
export function resumoTexto(nomeSistema, empresa, r, hoje) {
  const [a, m, dd] = hoje.split('-');
  return [`*Resumo do dia · ${empresa}*`, `${nomeSistema} · ${dd}/${m}/${a}`, '', ...r.destaques.map(([k, v]) => `• ${k}: *${v}*`),
    ...(r.alertas.length ? ['', '⚠️ Atenção', ...r.alertas.map((x) => `• ${x}`)] : []), ...(r.itens.length ? ['', r.tituloItens || 'Hoje', ...r.itens.map((x) => `• ${x}`)] : [])].join('\n');
}
export function resumoHTML(nomeSistema, empresa, r, hoje, link) {
  const e = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const [a, m, dd] = hoje.split('-');
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a18"><p style="color:#8c887f;margin:0">${e(nomeSistema)} · ${dd}/${m}/${a}</p><h1 style="font-size:20px;margin:4px 0 16px">Resumo do dia · ${e(empresa)}</h1>
    <table style="width:100%;border-collapse:collapse">${r.destaques.map(([k, v]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#57544e">${e(k)}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-weight:bold">${e(v)}</td></tr>`).join('')}</table>
    ${r.alertas.length ? `<div style="margin:16px 0;padding:12px 14px;background:#fbf0dc;border-radius:8px"><b>Atenção</b><ul style="margin:6px 0 0;padding-left:18px">${r.alertas.map((x) => `<li>${e(x)}</li>`).join('')}</ul></div>` : ''}
    ${r.itens.length ? `<h2 style="font-size:15px;margin:18px 0 6px">${e(r.tituloItens || 'Hoje')}</h2><ul style="padding-left:18px;margin:0">${r.itens.map((x) => `<li style="margin:4px 0">${e(x)}</li>`).join('')}</ul>` : ''}
    <p style="margin-top:22px"><a href="${e(link)}" style="background:#1a1a18;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Abrir o sistema</a></p>
    <p style="color:#8c887f;font-size:12px;margin-top:22px">Você recebe este e-mail porque ativou o resumo diário nas configurações. Para parar, desligue lá.</p></div>`;
}
