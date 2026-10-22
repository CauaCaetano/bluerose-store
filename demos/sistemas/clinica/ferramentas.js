// Veltria Clínica · ferramentas ao lado das telas: faltas, aniversariantes, confirmações de amanhã, horários livres,
// calculadoras (IMC, gestação e dose por peso), pacientes sumidos e particular a receber.
import { esc, moeda, hoje, diaMais, diasAte, dataCurta, dataBR, paraData, minutos, hhmm, DIAS_L } from '../base/nexo.js';
import { bloco, ldLista, ldItem, ldNums, campoN, campoD, calc, n0, fmtN, zap, registrarCalcs } from '../base/lado.js';

const primeiro = (n) => String(n || '').split(' ')[0];
const pac = (a, id) => a.db.obter('pacientes', id);
const cons = (a) => a.db.lista('consultas');
const ultimaAtendida = (a, pid) => cons(a).filter((c) => c.paciente === pid && c.status === 'atendido').map((c) => c.data).sort().pop();
const futura = (a, pid) => cons(a).some((c) => c.paciente === pid && c.data >= hoje() && !['cancelado', 'faltou'].includes(c.status));
const aniversarioEm = (nasc, dias) => { if (!nasc) return null; for (let k = 0; k <= dias; k++) { const d = diaMais(k); if (d.slice(5) === nasc.slice(5)) return d; } return null; };

registrarCalcs({
  imc: (f) => { const p = n0(f.peso.value), h = n0(f.altura.value) / 100; if (!p || !h) return 'Informe peso e altura.';
    const v = p / (h * h), c = v < 18.5 ? 'abaixo do peso' : v < 25 ? 'peso adequado' : v < 30 ? 'sobrepeso' : v < 35 ? 'obesidade grau I' : v < 40 ? 'obesidade grau II' : 'obesidade grau III';
    return `IMC <b>${fmtN(v)}</b>: ${c}.<br>Peso adequado para a altura: <b>${fmtN(18.5 * h * h)} a ${fmtN(24.9 * h * h)} kg</b>.`; },
  gestacao: (f) => { const dum = f.dum.value; if (!dum) return 'Informe a data da última menstruação (DUM).';
    const dias = -diasAte(dum), dpp = diaMais(280, dum); if (dias < 0) return 'A DUM não pode ser no futuro.';
    return `Idade gestacional: <b>${Math.floor(dias / 7)} semanas e ${dias % 7} dia(s)</b>.<br>Data provável do parto (Naegele): <b>${dataBR(dpp)}</b>.<br><span class="mute">Estimativa pela DUM; confirme com o ultrassom.</span>`; },
  dose: (f) => { const peso = n0(f.peso.value), mgkg = n0(f.mgkg.value), conc = n0(f.conc.value), vezes = Math.max(1, n0(f.vezes.value));
    if (!peso || !mgkg) return 'Informe o peso e a dose em mg/kg.';
    const mg = peso * mgkg, ml = conc ? mg / conc : 0;
    return `Dose: <b>${fmtN(mg)} mg</b> por tomada${conc ? ` = <b>${fmtN(ml, 2)} mL</b> (${fmtN(conc)} mg/mL)` : ''}.<br>Por dia: <b>${fmtN(mg * vezes)} mg</b> em ${vezes} ${vezes === 1 ? 'tomada' : 'tomadas'}.<br><span class="mute">Apoio ao cálculo: confira a dose máxima e a bula.</span>`; },
});

export const LADOS = {
  painel: (a) => {
    const faltas = cons(a).filter((c) => c.status === 'faltou' && diasAte(c.data) >= -7 && diasAte(c.data) <= 0 && !futura(a, c.paciente)).sort((x, y) => y.data.localeCompare(x.data));
    const aniv = a.db.lista('pacientes').map((p) => ({ p, d: aniversarioEm(p.nascimento, 7) })).filter((x) => x.d).sort((x, y) => x.d.localeCompare(y.d));
    return bloco('Faltaram nesta semana', 'user-minus', `<p>Pacientes que faltaram e ainda não remarcaram.</p>${ldLista(faltas.slice(0, 8).map((c) => { const p = pac(a, c.paciente) || {};
        return ldItem(esc(p.nome || ''), `faltou em ${dataCurta(c.data)} às ${c.ini}`, { dir: zap(p.telefone, `Olá, ${primeiro(p.nome)}! Aqui é da ${a.empresa}. Sentimos sua falta na consulta de ${dataCurta(c.data)}. Quer remarcar? Me diga o melhor dia e horário.`, 'Remarcar') }); }), 'Ninguém faltou sem remarcar.')}`)
      + bloco('Aniversariantes (7 dias)', 'cake', ldLista(aniv.slice(0, 8).map(({ p, d }) => ldItem(esc(p.nome), d === hoje() ? 'hoje' : dataCurta(d), {
        dir: zap(p.telefone, `Feliz aniversário, ${primeiro(p.nome)}! Toda a equipe da ${a.empresa} deseja um ano cheio de saúde. Conte sempre com a gente.`, 'Parabéns') })), 'Nenhum aniversário nos próximos 7 dias.'));
  },
  agenda: (a) => {
    const amanha = diaMais(1), conf = cons(a).filter((c) => c.data === amanha && c.status === 'agendado').sort((x, y) => x.ini.localeCompare(y.ini));
    const dow = paraData(hoje()).getDay(), agora = new Date().getHours() * 60 + new Date().getMinutes();
    const livres = a.db.lista('profissionais').filter((p) => (p.dias || []).includes(dow)).map((p) => {
      const ocupados = new Set(cons(a).filter((c) => c.profissional === p.id && c.data === hoje() && !['cancelado'].includes(c.status)).map((c) => c.ini));
      const l = []; for (let m = minutos(p.ini || '08:00'); m + (p.duracao || 30) <= minutos(p.fim || '18:00'); m += p.duracao || 30) if (m > agora && !ocupados.has(hhmm(m))) l.push(hhmm(m));
      return { p, l };
    });
    return bloco('Confirmar as consultas de amanhã', 'chat-circle-text', `<p>${dataCurta(amanha)}: ${conf.length} ${conf.length === 1 ? 'consulta ainda sem confirmação' : 'consultas ainda sem confirmação'}.</p>${ldLista(conf.slice(0, 12).map((c) => { const p = pac(a, c.paciente) || {};
        return ldItem(esc(p.nome || ''), `${c.ini} · ${esc(a.db.obter('profissionais', c.profissional)?.nome || '')}`, { attrs: `data-abrir="consulta:${c.id}"`, dir: zap(p.telefone, `Olá, ${primeiro(p.nome)}! Confirmando sua consulta amanhã, ${dataCurta(amanha)}, às ${c.ini}, na ${a.empresa}. Responda SIM para confirmar ou me avise se precisar remarcar.`, 'Confirmar') }); }), 'Tudo confirmado para amanhã.')}`)
      + bloco(`Horários livres hoje (${DIAS_L[dow].toLowerCase()})`, 'clock', ldLista(livres.map(({ p, l }) => ldItem(esc(p.nome), l.length ? `${l.length} ${l.length === 1 ? 'horário livre' : 'horários livres'} · próximo às ${l[0]}` : 'agenda cheia pelo resto do dia')), 'Nenhum profissional atende hoje.'));
  },
  pacientes: (a) => {
    const sumidos = a.db.lista('pacientes').map((p) => ({ p, u: ultimaAtendida(a, p.id) })).filter((x) => x.u && diasAte(x.u) < -180 && !futura(a, x.p.id)).sort((x, y) => x.u.localeCompare(y.u));
    return bloco('Calcular IMC', 'scales', calc('imc', campoN('peso', 'Peso (kg)', 70) + campoN('altura', 'Altura (cm)', 170)))
      + bloco('Gestação: semanas e data do parto', 'baby', calc('gestacao', campoD('dum', 'Data da última menstruação', diaMais(-70))))
      + bloco('Dose por peso', 'syringe', calc('dose', campoN('peso', 'Peso (kg)', 20) + campoN('mgkg', 'Dose (mg/kg)', 15) + campoN('conc', 'Concentração (mg/mL)', 50) + campoN('vezes', 'Tomadas por dia', 4)))
      + bloco('Sem consulta há mais de 6 meses', 'arrows-clockwise', `<p>Um convite para o check-up costuma trazer o paciente de volta.</p>${ldLista(sumidos.slice(0, 8).map(({ p, u }) => ldItem(esc(p.nome), `última consulta em ${dataCurta(u)}`, {
        attrs: `data-abrir="paciente:${p.id}"`, dir: zap(p.telefone, `Olá, ${primeiro(p.nome)}! Aqui é da ${a.empresa}. Já faz um tempo desde a sua última consulta. Que tal marcar o seu check-up? Me diga o melhor dia e horário.`, 'Convidar') })), 'Nenhum paciente sumido.')}`);
  },
  caixa: (a) => {
    const abertos = cons(a).filter((c) => c.tipo === 'particular' && c.status === 'atendido' && !c.pago && diasAte(c.data) <= -3).sort((x, y) => x.data.localeCompare(y.data));
    const total = abertos.reduce((s, c) => s + Number(c.valor || 0), 0);
    return bloco('Particular a receber há mais de 3 dias', 'hand-coins', `${ldNums([[moeda(total), 'em aberto'], [String(abertos.length), abertos.length === 1 ? 'consulta' : 'consultas']])}${ldLista(abertos.slice(0, 10).map((c) => { const p = pac(a, c.paciente) || {};
      return ldItem(esc(p.nome || ''), `${dataCurta(c.data)} · ${moeda(c.valor)}`, { dir: zap(p.telefone, `Olá, ${primeiro(p.nome)}! Aqui é da ${a.empresa}. Ficou em aberto o valor de ${moeda(c.valor)} da consulta de ${dataCurta(c.data)}. Posso te mandar a chave PIX?`, 'Cobrar') }); }), 'Nada em aberto.')}`);
  },
};

// cada ferramenta como item próprio no menu da esquerda: [id, rótulo, ícone, aba de origem, começo do título do bloco]
export const ITENS = [
  ['imc', 'IMC', 'scales', 'pacientes', 'Calcular IMC'],
  ['gestacao', 'Gestação e data do parto', 'baby', 'pacientes', 'Gestação'],
  ['dose', 'Dose por peso', 'syringe', 'pacientes', 'Dose por peso'],
  ['confirmar', 'Confirmar consultas', 'chat-circle-text', 'agenda', 'Confirmar as consultas'],
  ['livres', 'Horários livres', 'clock', 'agenda', 'Horários livres'],
  ['faltas', 'Faltas para remarcar', 'user-minus', 'painel', 'Faltaram'],
  ['aniversarios', 'Aniversariantes', 'cake', 'painel', 'Aniversariantes'],
  ['sumidos', 'Pacientes sumidos', 'arrows-clockwise', 'pacientes', 'Sem consulta'],
  ['receber', 'Particular a receber', 'hand-coins', 'caixa', 'Particular a receber'],
];
