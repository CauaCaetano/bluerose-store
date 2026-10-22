// Veltria Jurídico · ferramentas ao lado das telas: atualização de valores, honorários, dias entre datas, pensão,
// processos parados, audiências da semana com aviso ao cliente, honorários vencidos e tarefas atrasadas.
import { esc, moeda, hoje, diaMais, diasAte, dataCurta, diaUtil } from '../base/nexo.js';
import { bloco, ldLista, ldItem, ldNums, campoN, campoD, campoS, calc, n0, fmtN, zap, registrarCalcs } from '../base/lado.js';

const NOMES = { paulo: 'Dr. Paulo', ana: 'Dra. Ana', lia: 'Dra. Lia' };
const quem = (id) => NOMES[id] || String(id || 'Sem responsável');
const primeiro = (n) => String(n || '').split(' ')[0];
const cli = (a, id) => a.db.obter('clientes', id);
const proc = (a, id) => a.db.obter('processos', id);

registrarCalcs({
  atualizacao: (f) => { const v = n0(f.valor.value), corr = n0(f.corr.value), juros = n0(f.juros.value), meses = n0(f.meses.value), multa = n0(f.multa.value);
    if (!v) return 'Informe o valor original.';
    const corrigido = v * (1 + corr / 100), j = corrigido * (juros / 100) * meses, m = (corrigido + j) * (multa / 100);
    return `Corrigido: <b>${moeda(corrigido)}</b><br>Juros (${fmtN(juros)}% a.m. × ${fmtN(meses, 0)} meses, simples): <b>${moeda(j)}</b>${multa ? `<br>Multa ${fmtN(multa)}%: <b>${moeda(m)}</b>` : ''}<br>Total atualizado: <b>${moeda(corrigido + j + m)}</b><br><span class="mute">Informe a correção acumulada do índice (IPCA-E, INPC…) no período.</span>`; },
  honorarios: (f) => { const v = n0(f.valor.value), contr = n0(f.contrato.value), exito = n0(f.exito.value);
    if (!v) return 'Informe o valor da causa ou do proveito econômico.';
    return `Contratuais (${fmtN(contr)}%): <b>${moeda(v * contr / 100)}</b><br>Êxito (${fmtN(exito)}%): <b>${moeda(v * exito / 100)}</b><br>Sucumbência (10% a 20%, art. 85 do CPC): <b>${moeda(v * 0.1)} a ${moeda(v * 0.2)}</b>`; },
  dias: (f) => { const a = f.ini.value, b = f.fim.value; if (!a || !b) return 'Informe as duas datas.';
    let [x, y] = a <= b ? [a, b] : [b, a], corridos = 0, uteis = 0;
    for (let d = diaMais(1, x); d <= y; d = diaMais(1, d)) { corridos++; if (diaUtil(d)) uteis++; }
    return `<b>${corridos}</b> dias corridos e <b>${uteis}</b> dias úteis entre as datas (sem contar o primeiro dia).<br><span class="mute">Desconta sábados, domingos e feriados nacionais; confira os feriados da comarca.</span>`; },
  pensao: (f) => { const renda = n0(f.renda.value), p = n0(f.pct.value), sm = n0(f.sm.value), filhos = Math.max(1, n0(f.filhos.value));
    if (!renda || !p) return 'Informe a renda e o percentual.';
    const v = renda * p / 100;
    return `Pensão: <b>${moeda(v)}</b> por mês (${fmtN(p)}% de ${moeda(renda)})${filhos > 1 ? `, <b>${moeda(v / filhos)}</b> para cada um dos ${fmtN(filhos, 0)} filhos` : ''}.${sm ? `<br>Equivale a <b>${fmtN(v / sm, 2)}</b> salário(s) mínimo(s).` : ''}`; },
});

export const LADOS = {
  calculadora: () => bloco('Atualizar um valor', 'trend-up', calc('atualizacao', campoN('valor', 'Valor original (R$)', 10000) + campoN('corr', 'Correção no período (%)', 4.5) + campoN('juros', 'Juros (% ao mês)', 1) + campoN('meses', 'Meses', 12) + campoN('multa', 'Multa (%)', 0)))
    + bloco('Honorários', 'hand-coins', calc('honorarios', campoN('valor', 'Valor da causa (R$)', 50000) + campoN('contrato', 'Contratuais (%)', 10) + campoN('exito', 'Êxito (%)', 20)))
    + bloco('Dias entre duas datas', 'calendar-dots', calc('dias', campoD('ini', 'De', diaMais(-30)) + campoD('fim', 'Até', hoje())))
    + bloco('Pensão alimentícia', 'users-three', calc('pensao', campoN('renda', 'Renda líquida (R$)', 5000) + campoN('pct', 'Percentual (%)', 30) + campoN('filhos', 'Filhos', 1) + campoN('sm', 'Salário mínimo (R$, opcional)', '', 'placeholder="valor vigente"'))),
  processos: (a) => {
    const ult = (pid) => a.db.lista('andamentos').filter((x) => x.processo === pid).map((x) => x.data).sort().pop();
    const parados = a.db.lista('processos').filter((p) => p.status === 'ativo').map((p) => ({ p, u: ult(p.id) || p.distribuido })).filter((x) => x.u && diasAte(x.u) < -90).sort((x, y) => x.u.localeCompare(y.u));
    return bloco('Sem andamento há mais de 90 dias', 'hourglass', `<p>Vale conferir no tribunal e, se for o caso, pedir impulso oficial.</p>${ldLista(parados.slice(0, 10).map(({ p, u }) => ldItem(esc(p.acao || p.numero), `${esc(cli(a, p.cliente)?.nome || '')} · último andamento ${dataCurta(u)}`, { attrs: `data-abrir="processo:${p.id}"` })), 'Todos os processos ativos andaram nos últimos 90 dias.')}`);
  },
  prazos: (a) => {
    const aud = a.db.lista('prazos').filter((x) => x.tipo === 'audiencia' && x.status === 'pendente' && diasAte(x.data) >= 0 && diasAte(x.data) <= 7).sort((x, y) => (x.data + (x.hora || '')).localeCompare(y.data + (y.hora || '')));
    return bloco('Audiências nos próximos 7 dias', 'gavel', `<p>Avise o cliente com antecedência: data, hora e o que levar.</p>${ldLista(aud.map((x) => { const p = proc(a, x.processo) || {}, c = cli(a, p.cliente) || {};
      return ldItem(esc(x.titulo || 'Audiência'), `${dataCurta(x.data)}${x.hora ? ` às ${x.hora}` : ''} · ${esc(c.nome || '')}`, { dir: zap(c.telefone, `Olá, ${primeiro(c.nome)}! Lembrete da ${x.titulo || 'audiência'} do seu processo no dia ${dataCurta(x.data)}${x.hora ? `, às ${x.hora}` : ''}${p.vara ? `, na ${p.vara}` : ''}. Leve documento com foto e chegue com 30 minutos de antecedência. Qualquer dúvida, fale comigo.`, 'Avisar') }); }), 'Nenhuma audiência nos próximos 7 dias.')}`);
  },
  financeiro: (a) => {
    const venc = a.db.lista('honorarios').filter((h) => h.status !== 'recebido' && h.vencimento && diasAte(h.vencimento) < 0).sort((x, y) => x.vencimento.localeCompare(y.vencimento));
    const total = venc.reduce((s, h) => s + Number(h.valor || 0), 0);
    return bloco('Honorários vencidos', 'warning', `${ldNums([[moeda(total), 'em atraso'], [String(venc.length), venc.length === 1 ? 'parcela' : 'parcelas']])}${ldLista(venc.slice(0, 10).map((h) => { const c = cli(a, h.cliente) || {};
      return ldItem(esc(c.nome || ''), `${esc(h.descricao || '')} · ${moeda(h.valor)} · venceu ${dataCurta(h.vencimento)}`, { dir: zap(c.telefone, `Olá, ${primeiro(c.nome)}! Tudo bem? Consta em aberto a parcela de ${moeda(h.valor)} (${h.descricao || 'honorários'}), com vencimento em ${dataCurta(h.vencimento)}. Posso te mandar os dados para pagamento?`, 'Cobrar') }); }), 'Nenhum honorário vencido.')}`);
  },
  tarefas: (a) => {
    const atr = a.db.lista('tarefas').filter((t) => t.status !== 'feita' && t.prazo && diasAte(t.prazo) < 0);
    const por = {}; atr.forEach((t) => { (por[t.responsavel] ||= []).push(t); });
    return bloco('Tarefas atrasadas por pessoa', 'list-checks', ldNums(Object.entries(por).map(([k, l]) => [String(l.length), quem(k)]).concat(atr.length ? [] : [['0', 'atrasadas']])) + ldLista(atr.sort((x, y) => x.prazo.localeCompare(y.prazo)).slice(0, 8).map((t) => ldItem(esc(t.titulo), `${quem(t.responsavel)} · prazo era ${dataCurta(t.prazo)}`)), 'Nenhuma tarefa atrasada.'));
  },
};

// cada ferramenta como item próprio no menu da esquerda: [id, rótulo, ícone, aba de origem, começo do título do bloco]
export const ITENS = [
  ['atualizar', 'Atualizar valores', 'trend-up', 'calculadora', 'Atualizar um valor'],
  ['honorarios', 'Calcular honorários', 'hand-coins', 'calculadora', 'Honorários'],
  ['dias', 'Dias entre datas', 'calendar-dots', 'calculadora', 'Dias entre'],
  ['pensao', 'Pensão alimentícia', 'users-three', 'calculadora', 'Pensão'],
  ['parados', 'Processos parados', 'hourglass', 'processos', 'Sem andamento'],
  ['audiencias', 'Avisar audiências', 'gavel', 'prazos', 'Audiências'],
  ['vencidos', 'Honorários vencidos', 'warning', 'financeiro', 'Honorários vencidos'],
  ['atrasadas', 'Tarefas atrasadas', 'list-checks', 'tarefas', 'Tarefas atrasadas'],
];
