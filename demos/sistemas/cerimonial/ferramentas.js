// Blue Rose Eternize · ferramentas: comida e bebida por convidado, divisão do orçamento, mesas e parcelas até o
// evento (Básico) e convidados sem resposta, pagamentos vencendo, tarefas atrasadas e bodas para lembrar (Pro).
import { esc, moeda, hoje, diaMais, diasAte, dataCurta } from '../base/nexo.js';
import { bloco, ldLista, ldItem, campoN, campoD, calc, n0, fmtN, zap, registrarCalcs } from '../base/lado.js';

const primeiro = (n) => String(n || '').split(' ')[0];
const evento = (a, id) => a.db.obter('eventos', id);
const proximos = (a) => a.db.lista('eventos').filter((e) => e.data >= hoje() && e.etapa !== 'realizado').sort((x, y) => x.data.localeCompare(y.data));

registrarCalcs({
  buffet: (f) => { const adultos = n0(f.adultos.value), criancas = n0(f.criancas.value), horas = Math.max(1, n0(f.horas.value)); if (!adultos) return 'Informe o número de convidados.';
    const eq = adultos + criancas * 0.5, salg = Math.round(eq * (horas >= 5 ? 20 : 15)), doces = Math.round(eq * 6), refri = eq * 0.6, agua = eq * 0.5, carne = eq * 0.4;
    return `Salgados: <b>${salg}</b> · Docinhos: <b>${doces}</b><br>Prato principal (proteína): <b>${fmtN(carne)} kg</b><br>Refrigerante/suco: <b>${fmtN(refri)} L</b> · Água: <b>${fmtN(agua)} L</b><br><span class="mute">Médias de mercado para ${fmtN(horas, 0)} horas de festa; crianças contam como meio adulto.</span>`; },
  divisao: (f) => { const t = n0(f.total.value); if (!t) return 'Informe o orçamento total.';
    const l = [['Local e buffet', 50], ['Decoração e flores', 12], ['Foto e vídeo', 10], ['Música e iluminação', 8], ['Traje e beleza', 8], ['Convites e lembranças', 4], ['Assessoria', 5], ['Reserva para imprevistos', 3]];
    return l.map(([n, p]) => `${n} (${p}%): <b>${moeda(t * p / 100)}</b>`).join('<br>'); },
  mesas: (f) => { const conv = n0(f.convidados.value), lugares = Math.max(1, n0(f.lugares.value)), extra = n0(f.extra.value); if (!conv) return 'Informe os convidados.';
    const n = Math.ceil(conv * (1 + extra / 100) / lugares);
    return `Mesas: <b>${n}</b> de ${fmtN(lugares, 0)} lugares (${fmtN(n * lugares, 0)} lugares, com ${fmtN(extra, 0)}% de folga).`; },
  parcelas: (f) => { const v = n0(f.valor.value), data = f.data.value; if (!v || !data) return 'Informe o valor e a data do evento.';
    const meses = Math.max(1, Math.floor(diasAte(data) / 30));
    return `Até o evento: <b>${meses} ${meses === 1 ? 'mês' : 'meses'}</b>.<br>Parcelas mensais: <b>${moeda(v / meses)}</b> (quitando 1 mês antes, ${Math.max(1, meses - 1)}× de ${moeda(v / Math.max(1, meses - 1))}).`; },
});

export const LADOS = {
  calculos: () => bloco('Comida e bebida por convidado', 'fork-knife', calc('buffet', campoN('adultos', 'Adultos', 150) + campoN('criancas', 'Crianças', 20) + campoN('horas', 'Horas de festa', 5)))
    + bloco('Divisão do orçamento', 'chart-donut', calc('divisao', campoN('total', 'Orçamento total (R$)', 80000)))
    + bloco('Mesas necessárias', 'users-three', calc('mesas', campoN('convidados', 'Convidados', 170) + campoN('lugares', 'Lugares por mesa', 8) + campoN('extra', 'Folga (%)', 5)))
    + bloco('Parcelas até o evento', 'calendar-dots', calc('parcelas', campoN('valor', 'Valor a pagar (R$)', 24000) + campoD('data', 'Data do evento', diaMais(240)))),
  avisos: (a) => {
    const prox = proximos(a)[0];
    const sem = prox ? a.db.lista('convidados').filter((c) => c.evento === prox.id && c.rsvp === 'pendente') : [];
    const pagar = a.db.lista('contratacoes').filter((c) => c.status !== 'pago' && c.vencimento && diasAte(c.vencimento) <= 15).sort((x, y) => x.vencimento.localeCompare(y.vencimento));
    const atras = a.db.lista('tarefas').filter((t) => !t.feita && t.prazo && t.prazo < hoje() && evento(a, t.evento)?.etapa !== 'realizado');
    const bodas = a.db.lista('eventos').filter((e) => e.etapa === 'realizado' && e.tipo === 'Casamento' && e.data).map((e) => { const ano = Number(hoje().slice(0, 4)); let d = `${ano}${e.data.slice(4)}`; if (d < hoje()) d = `${ano + 1}${e.data.slice(4)}`; return { e, d }; }).filter((x) => diasAte(x.d) <= 30 && x.d.slice(0, 4) > x.e.data.slice(0, 4));
    return bloco(`Sem resposta${prox ? ` · ${prox.nome}` : ''}`, 'envelope-open', prox ? `<p>${sem.length} ${sem.length === 1 ? 'convidado ainda não respondeu' : 'convidados ainda não responderam'} para ${dataCurta(prox.data)}.</p>${ldLista(sem.slice(0, 12).map((c) => ldItem(esc(c.nome), c.acompanhantes ? `+${c.acompanhantes}` : 'sem acompanhante', {
        dir: zap(c.telefone, `Olá, ${primeiro(c.nome)}! Tudo bem? Estamos organizando ${prox.tipo === 'Casamento' ? 'o casamento' : 'o evento'} de ${prox.nome} em ${dataCurta(prox.data)}. Você consegue confirmar a sua presença? Responda SIM ou NÃO por aqui.`, 'Lembrar') })), 'Todos já responderam.')}` : ldLista([], 'Nenhum evento à frente.'))
      + bloco('Pagamentos a fornecedores (15 dias)', 'hand-coins', ldLista(pagar.map((c) => { const f = a.db.obter('fornecedores', c.fornecedor) || {}, e = evento(a, c.evento) || {};
        return ldItem(esc(f.nome || c.categoria || ''), `${esc(e.nome || '')} · ${diasAte(c.vencimento) < 0 ? 'venceu' : 'vence'} ${dataCurta(c.vencimento)}`, { dir: `<b class="num">${moeda(Number(c.valor || 0) - Number(c.pago || 0))}</b>` }); }), 'Nenhum pagamento nos próximos 15 dias.'))
      + bloco('Tarefas atrasadas', 'list-checks', ldLista(atras.sort((x, y) => x.prazo.localeCompare(y.prazo)).slice(0, 12).map((t) => ldItem(esc(t.titulo), `${esc(evento(a, t.evento)?.nome || '')} · prazo era ${dataCurta(t.prazo)}${t.quem ? ` · ${esc(t.quem)}` : ''}`)), 'Nenhuma tarefa atrasada.'))
      + bloco('Bodas para lembrar (30 dias)', 'heart', `<p>Um parabéns no aniversário de casamento vira indicação.</p>${ldLista(bodas.map(({ e, d }) => ldItem(esc(e.nome), `${Number(d.slice(0, 4)) - Number(e.data.slice(0, 4))} ano(s) em ${dataCurta(d)}`, {
        dir: zap(e.telefone, `Oi, ${primeiro(e.contratante || e.nome)}! Feliz aniversário de casamento! Foi uma alegria fazer parte desse dia. Se algum amigo for casar, vamos adorar ajudar também.`, 'Parabéns') })), 'Nenhum aniversário de casamento nos próximos 30 dias.')}`);
  },
};

export const ITENS = [
  ['buffet', 'Comida e bebida', 'fork-knife', 'calculos', 'Comida e bebida'],
  ['divisao', 'Divisão do orçamento', 'chart-donut', 'calculos', 'Divisão do orçamento'],
  ['mesas', 'Mesas necessárias', 'users-three', 'calculos', 'Mesas necessárias'],
  ['parcelas', 'Parcelas até o evento', 'calendar-dots', 'calculos', 'Parcelas'],
  ['rsvp', 'Convidados sem resposta', 'envelope-open', 'avisos', 'Sem resposta'],
  ['pagamentos', 'Pagamentos a fornecedores', 'hand-coins', 'avisos', 'Pagamentos a fornecedores'],
  ['tarefas', 'Tarefas atrasadas', 'list-checks', 'avisos', 'Tarefas atrasadas'],
  ['bodas', 'Bodas para lembrar', 'heart', 'avisos', 'Bodas para lembrar'],
];
