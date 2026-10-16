// Blue Rose Ofixl · ferramentas: BTUs do ambiente, preço da visita, carga de gás e fim da garantia (Básico)
// e atendimentos de amanhã, preventivas vencendo, orçamentos sem resposta e serviços a receber (Pro).
import { esc, moeda, hoje, diaMais, diasAte, dataCurta, dataBR } from '../base/nexo.js';
import { bloco, ldLista, ldItem, ldNums, campoN, campoD, calc, n0, fmtN, zap, registrarCalcs } from '../base/lado.js';

const primeiro = (n) => String(n || '').split(' ')[0];
const cliente = (a, id) => a.db.obter('clientes', id);
const total = (o) => (o.itens || []).filter((x) => x.aprovado !== false).reduce((s, x) => s + Number(x.qtd || 1) * Number(x.preco || 0), 0) - Number(o.desconto || 0);
const proxPrev = (x) => (Number(x.periodicidade) && x.ultima ? diaMais(Number(x.periodicidade), x.ultima) : null);
const ABERTAS = ['agendada', 'caminho', 'atendimento'];

registrarCalcs({
  // regra de mercado: 600 BTUs por m² + 600 por pessoa a mais + 600 por aparelho que esquenta; sol da tarde soma 15%
  btu: (f) => { const area = n0(f.area.value), pessoas = n0(f.pessoas.value), aparelhos = n0(f.aparelhos.value), sol = f.sol.value === '1';
    if (!area) return 'Informe a área do ambiente.';
    let b = area * 600 + Math.max(0, pessoas - 1) * 600 + aparelhos * 600; if (sol) b *= 1.15;
    const op = [9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000].find((x) => x >= b) || 60000;
    return `Carga estimada: <b>${fmtN(b, 0)} BTUs</b>.<br>Indique um aparelho de <b>${fmtN(op, 0)} BTUs</b>.<br><span class="mute">Estimativa rápida para orçamento; confira o ambiente na visita.</span>`; },
  preco: (f) => { const horas = n0(f.horas.value), hora = n0(f.hora.value), km = n0(f.km.value), porKm = n0(f.porKm.value), mat = n0(f.mat.value), margem = n0(f.margem.value);
    if (!horas || !hora) return 'Informe as horas e o valor da hora.';
    const custo = horas * hora + km * porKm + mat, preco = custo * (1 + margem / 100);
    return `Custo: ${moeda(custo)}.<br>Preço sugerido: <b>${moeda(preco)}</b> (margem de ${fmtN(margem, 0)}%).`; },
  gas: (f) => { const metros = n0(f.metros.value), padrao = n0(f.padrao.value), gm = n0(f.gm.value);
    if (!metros) return 'Informe o comprimento da tubulação.';
    const extra = Math.max(0, metros - padrao) * gm;
    return extra ? `Carga adicional: <b>${fmtN(extra, 0)} g</b> de gás para ${fmtN(metros - padrao, 1)} m além do que vem de fábrica.<br><span class="mute">Confira o valor por metro no manual do fabricante.</span>` : `A carga de fábrica cobre ${fmtN(padrao, 1)} m: não precisa completar.`; },
  garantia: (f) => { const d = f.data.value, dias = n0(f.dias.value); if (!d) return 'Informe a data do serviço.';
    const fim = diaMais(dias, d), resta = diasAte(fim);
    return `Garantia até <b>${dataBR(fim)}</b>${resta >= 0 ? ` (faltam ${resta} dias)` : ' (já venceu)'}.`; },
});

export const LADOS = {
  calculos: () => bloco('BTUs do ambiente', 'sun', calc('btu', campoN('area', 'Área (m²)', 15) + campoN('pessoas', 'Pessoas no ambiente', 2) + campoN('aparelhos', 'Aparelhos que esquentam (TV, PC…)', 1) + `<label class="campo">Sol da tarde?<select name="sol"><option value="0">Não</option><option value="1">Sim</option></select></label>`))
    + bloco('Preço do serviço', 'calculator', calc('preco', campoN('horas', 'Horas de trabalho', 2) + campoN('hora', 'Valor da hora (R$)', 80) + campoN('km', 'Deslocamento (km)', 10) + campoN('porKm', 'Custo por km (R$)', 1.5) + campoN('mat', 'Materiais (R$)', 0) + campoN('margem', 'Margem (%)', 30)))
    + bloco('Carga de gás adicional', 'drop', calc('gas', campoN('metros', 'Tubulação instalada (m)', 6) + campoN('padrao', 'Já vem carregado para (m)', 3) + campoN('gm', 'Gramas por metro extra', 20)))
    + bloco('Fim da garantia', 'shield-check', calc('garantia', campoD('data', 'Data do serviço', hoje()) + campoN('dias', 'Garantia (dias)', 90))),
  avisos: (a) => {
    const os = a.db.lista('ordens'), amanha = diaMais(1);
    const deAmanha = os.filter((o) => ABERTAS.includes(o.status) && o.data === amanha).sort((x, y) => String(x.hora).localeCompare(String(y.hora)));
    const prev = a.db.lista('equipamentos').filter((x) => { const p = proxPrev(x); return p && diasAte(p) <= 15 && !os.some((o) => ABERTAS.includes(o.status) && (o.equipamentos || []).includes(x.id)); });
    const orc = os.filter((o) => o.status === 'orcamento' && diasAte(o.orcado_em || o.data) <= -3);
    const receber = os.filter((o) => o.status === 'concluida' && !o.pago && total(o) > 0);
    return bloco('Atendimentos de amanhã', 'calendar-check', ldLista(deAmanha.map((o) => { const c = cliente(a, o.cliente) || {};
        return ldItem(esc(c.nome || ''), `${o.hora || ''} · ${esc(o.tipo || '')}`, { dir: zap(c.telefone, `Olá, ${primeiro(c.contato || c.nome)}! Aqui é da ${a.empresa}. Confirmando o serviço de ${String(o.tipo || '').toLowerCase()} amanhã, ${dataCurta(amanha)}, às ${o.hora}. Posso confirmar?`, 'Confirmar') }); }), 'Nenhum atendimento amanhã.'))
      + bloco('Preventivas vencendo (15 dias)', 'arrows-clockwise', `<p>Manutenção preventiva é dinheiro certo: ofereça antes de o cliente esquecer.</p>${ldLista(prev.map((x) => { const c = cliente(a, x.cliente) || {};
        return ldItem(esc(c.nome || ''), `${esc(x.tipo)}${x.local ? ` · ${esc(x.local)}` : ''} · ${dataCurta(proxPrev(x))}`, { dir: zap(c.telefone, `Olá, ${primeiro(c.contato || c.nome)}! Aqui é da ${a.empresa}. Está na hora da manutenção preventiva do seu ${String(x.tipo).toLowerCase()}${x.local ? ` (${x.local})` : ''}. Posso agendar para esta semana?`, 'Oferecer') }); }), 'Nenhuma preventiva vencendo.')}`)
      + bloco('Orçamentos sem resposta', 'hourglass', ldLista(orc.map((o) => { const c = cliente(a, o.cliente) || {};
        return ldItem(esc(c.nome || ''), `#${o.numero} · ${moeda(total(o))}`, { dir: zap(c.telefone, `Olá, ${primeiro(c.contato || c.nome)}! Conseguiu ver o orçamento de ${String(o.tipo).toLowerCase()} (${moeda(total(o))})? Posso reservar um horário ainda esta semana.`, 'Lembrar') }); }), 'Nenhum orçamento parado.'))
      + bloco('Serviços a receber', 'hand-coins', ldNums([[moeda(receber.reduce((s, o) => s + total(o), 0)), 'a receber']]) + ldLista(receber.slice(0, 10).map((o) => { const c = cliente(a, o.cliente) || {};
        return ldItem(esc(c.nome || ''), `#${o.numero} · ${moeda(total(o))}`, { dir: zap(c.telefone, `Olá, ${primeiro(c.contato || c.nome)}! Consta em aberto o serviço #${o.numero} (${moeda(total(o))}). Posso te mandar o PIX?`, 'Cobrar') }); }), 'Nada a receber.'));
  },
};

export const ITENS = [
  ['btu', 'BTUs do ambiente', 'sun', 'calculos', 'BTUs'],
  ['preco', 'Preço do serviço', 'calculator', 'calculos', 'Preço do serviço'],
  ['gas', 'Carga de gás adicional', 'drop', 'calculos', 'Carga de gás'],
  ['garantia', 'Fim da garantia', 'shield-check', 'calculos', 'Fim da garantia'],
  ['amanha', 'Atendimentos de amanhã', 'calendar-check', 'avisos', 'Amanhã'],
  ['preventivas', 'Preventivas vencendo', 'arrows-clockwise', 'avisos', 'Preventivas'],
  ['orcamentos', 'Orçamentos sem resposta', 'hourglass', 'avisos', 'Orçamentos'],
  ['receber', 'Serviços a receber', 'hand-coins', 'avisos', 'A receber'],
];
