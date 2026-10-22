// Veltria CRM · ferramentas: comissão, meta do mês, desconto máximo, contatos necessários (Básico)
// e negócios parados, atividades atrasadas, previsões vencidas e clientes para nova venda (Pro).
import { esc, moeda, hoje, diaMais, diasAte, dataCurta, diaUtil } from '../base/nexo.js';
import { bloco, ldLista, ldItem, ldNums, campoN, calc, n0, fmtN, zap, registrarCalcs } from '../base/lado.js';

const primeiro = (n) => String(n || '').split(' ')[0];
const contato = (a, id) => a.db.obter('contatos', id);
const quem = (id) => String(id || '').replace(/^./, (c) => c.toUpperCase());
const uteisAteFimDoMes = () => { let n = 0, d = hoje(); const mes = d.slice(0, 7); while (d.slice(0, 7) === mes) { if (diaUtil(d)) n++; d = diaMais(1, d); } return n; };

registrarCalcs({
  comissao: (f) => { const v = n0(f.vendido.value), p = n0(f.pct.value), bonus = n0(f.bonus.value), meta = n0(f.meta.value);
    if (!v) return 'Informe quanto foi vendido.';
    const c = v * p / 100, b = meta && v >= meta ? bonus : 0;
    return `Comissão (${fmtN(p)}%): <b>${moeda(c)}</b>${bonus ? `<br>Bônus por bater a meta: <b>${moeda(b)}</b>${meta && v < meta ? ` (faltam ${moeda(meta - v)})` : ''}` : ''}<br>Total: <b>${moeda(c + b)}</b>`; },
  meta: (f) => { const meta = n0(f.meta.value), feito = n0(f.feito.value), dias = Math.max(1, n0(f.dias.value)), ticket = n0(f.ticket.value);
    if (!meta) return 'Informe a meta do mês.';
    const falta = Math.max(0, meta - feito);
    return falta ? `Faltam <b>${moeda(falta)}</b> (${fmtN(feito / meta * 100)}% feito).<br>Por dia útil: <b>${moeda(falta / dias)}</b> em ${fmtN(dias, 0)} dias.${ticket ? `<br>Com ticket de ${moeda(ticket)}: <b>${Math.ceil(falta / ticket)} vendas</b>.` : ''}` : `Meta batida: <b>${moeda(feito)}</b> de ${moeda(meta)}.`; },
  desconto: (f) => { const preco = n0(f.preco.value), custo = n0(f.custo.value), mm = n0(f.margem.value);
    if (!preco) return 'Informe o preço.';
    const minimo = custo / (1 - mm / 100), max = Math.max(0, (1 - minimo / preco) * 100);
    return `Preço mínimo para ${fmtN(mm)}% de margem: <b>${moeda(minimo)}</b>.<br>Desconto máximo: <b>${fmtN(max)}%</b> (${moeda(preco - minimo)}).`; },
  funil: (f) => { const meta = n0(f.meta.value), ticket = n0(f.ticket.value), conv = n0(f.conv.value);
    if (!meta || !ticket || !conv) return 'Informe meta, ticket e conversão.';
    const vendas = Math.ceil(meta / ticket), contatos = Math.ceil(vendas / (conv / 100));
    return `Para ${moeda(meta)}: <b>${vendas} vendas</b> de ${moeda(ticket)}.<br>Com ${fmtN(conv)}% de conversão: <b>${contatos} contatos</b> no mês (${Math.ceil(contatos / 22)} por dia útil).`; },
});

export const LADOS = {
  calculos: () => bloco('Comissão do vendedor', 'hand-coins', calc('comissao', campoN('vendido', 'Vendido no mês (R$)', 48000) + campoN('pct', 'Comissão (%)', 5) + campoN('meta', 'Meta (R$)', 60000) + campoN('bonus', 'Bônus da meta (R$)', 500)))
    + bloco('Quanto falta para a meta', 'target', calc('meta', campoN('meta', 'Meta do mês (R$)', 60000) + campoN('feito', 'Já vendido (R$)', 38000) + campoN('dias', 'Dias úteis restantes', uteisAteFimDoMes()) + campoN('ticket', 'Ticket médio (R$)', 4800)))
    + bloco('Desconto máximo', 'percent', calc('desconto', campoN('preco', 'Preço (R$)', 9600) + campoN('custo', 'Custo (R$)', 5200) + campoN('margem', 'Margem mínima (%)', 30)))
    + bloco('Quantos contatos preciso', 'funnel', calc('funil', campoN('meta', 'Meta (R$)', 60000) + campoN('ticket', 'Ticket médio (R$)', 4800) + campoN('conv', 'Conversão (%)', 20))),
  avisos: (a) => {
    const abertos = a.db.lista('negocios').filter((n) => n.status === 'aberto');
    const parados = abertos.filter((n) => n.etapa_desde && diasAte(n.etapa_desde) <= -7).sort((x, y) => x.etapa_desde.localeCompare(y.etapa_desde));
    const agora = new Date().toISOString().slice(0, 16), atras = a.db.lista('atividades').filter((x) => !x.feita && x.quando && x.quando < agora).sort((x, y) => x.quando.localeCompare(y.quando));
    const previsao = abertos.filter((n) => n.previsao && n.previsao < hoje()).sort((x, y) => x.previsao.localeCompare(y.previsao));
    const ganhos = {}; a.db.lista('negocios').filter((n) => n.status === 'ganho').forEach((n) => { const d = n.fechado_em || n.etapa_desde || n.criado; if (!ganhos[n.contato] || d > ganhos[n.contato]) ganhos[n.contato] = d; });
    const comAberto = new Set(abertos.map((n) => n.contato));
    const voltar = Object.entries(ganhos).filter(([c, d]) => d && diasAte(d) < -180 && !comAberto.has(c)).sort((x, y) => x[1].localeCompare(y[1]));
    return bloco('Negócios parados há 7 dias ou mais', 'hourglass', ldLista(parados.slice(0, 10).map((n) => { const c = contato(a, n.contato) || {};
        return ldItem(esc(n.titulo), `${moeda(n.valor)} · parado desde ${dataCurta(n.etapa_desde)}`, { attrs: `data-abrir="negocio:${n.id}"`, dir: zap(c.telefone, `Olá, ${primeiro(c.nome)}! Tudo bem? Passando para saber se conseguiu avaliar a nossa proposta. Posso ajudar com alguma dúvida para seguirmos?`, 'Retomar') }); }), 'Nenhum negócio parado.'))
      + bloco('Atividades atrasadas', 'alarm', ldNums([[String(atras.length), 'atrasadas']]) + ldLista(atras.slice(0, 10).map((x) => ldItem(esc(x.titulo), `${quem(x.responsavel)} · era ${dataCurta(x.quando.slice(0, 10))} às ${x.quando.slice(11, 16)}`, x.negocio ? { attrs: `data-abrir="negocio:${x.negocio}"` } : {})), 'Nenhuma atividade atrasada.'))
      + bloco('Previsão de fechamento vencida', 'calendar-dots', `<p>Atualize a data ou feche o negócio: assim a previsão do mês fica certa.</p>${ldLista(previsao.slice(0, 10).map((n) => ldItem(esc(n.titulo), `${moeda(n.valor)} · previsão era ${dataCurta(n.previsao)}`, { attrs: `data-abrir="negocio:${n.id}"` })), 'Nenhuma previsão vencida.')}`)
      + bloco('Clientes para uma nova venda', 'arrows-clockwise', `<p>Compraram há mais de 6 meses e não têm negócio aberto.</p>${ldLista(voltar.slice(0, 10).map(([cid, d]) => { const c = contato(a, cid) || {};
        return ldItem(esc(c.nome || ''), `última compra em ${dataCurta(d)}`, { dir: zap(c.telefone, `Olá, ${primeiro(c.nome)}! Faz um tempo desde a nossa última parceria. Temos novidades que podem ajudar vocês. Posso te mostrar em 15 minutos esta semana?`, 'Chamar') }); }), 'Nenhum cliente para chamar agora.')}`);
  },
};

export const ITENS = [
  ['comissao', 'Comissão do vendedor', 'hand-coins', 'calculos', 'Comissão do vendedor'],
  ['meta', 'Quanto falta para a meta', 'target', 'calculos', 'Quanto falta'],
  ['desconto', 'Desconto máximo', 'percent', 'calculos', 'Desconto máximo'],
  ['contatos', 'Quantos contatos preciso', 'funnel', 'calculos', 'Quantos contatos'],
  ['parados', 'Negócios parados', 'hourglass', 'avisos', 'Negócios parados'],
  ['atrasadas', 'Atividades atrasadas', 'alarm', 'avisos', 'Atividades atrasadas'],
  ['previsao', 'Previsões vencidas', 'calendar-dots', 'avisos', 'Previsão de fechamento'],
  ['novavenda', 'Clientes para nova venda', 'arrows-clockwise', 'avisos', 'Clientes para uma nova venda'],
];
