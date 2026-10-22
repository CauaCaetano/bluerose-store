// Veltria Academia · ferramentas ao lado das telas: IMC, zonas de frequência cardíaca, 1RM, gasto calórico,
// alunos sumidos, mensalidades em atraso, aniversariantes, experimentais sem fechar e ocupação das turmas.
import { esc, moeda, hoje, diaMais, diasAte, dataCurta } from '../base/nexo.js';
import { bloco, ldLista, ldItem, ldNums, campoN, campoS, calc, n0, fmtN, zap, registrarCalcs } from '../base/lado.js';

const primeiro = (n) => String(n || '').split(' ')[0];
const aluno = (a, id) => a.db.obter('alunos', id);
const aniversarioEm = (nasc, dias) => { if (!nasc) return null; for (let k = 0; k <= dias; k++) { const d = diaMais(k); if (d.slice(5) === nasc.slice(5)) return d; } return null; };

registrarCalcs({
  imc: (f) => { const p = n0(f.peso.value), h = n0(f.altura.value) / 100; if (!p || !h) return 'Informe peso e altura.';
    const v = p / (h * h), c = v < 18.5 ? 'abaixo do peso' : v < 25 ? 'peso adequado' : v < 30 ? 'sobrepeso' : v < 35 ? 'obesidade grau I' : v < 40 ? 'obesidade grau II' : 'obesidade grau III';
    return `IMC <b>${fmtN(v)}</b>: ${c}.<br>Faixa de peso adequado: <b>${fmtN(18.5 * h * h)} a ${fmtN(24.9 * h * h)} kg</b>.`; },
  fc: (f) => { const idade = n0(f.idade.value), rep = n0(f.rep.value); if (!idade || !rep) return 'Informe idade e FC de repouso.';
    const max = 220 - idade, res = max - rep, z = (a, b) => `${Math.round(rep + res * a)}–${Math.round(rep + res * b)} bpm`;
    return `FC máxima estimada: <b>${max} bpm</b><br>Leve (50–60%): <b>${z(0.5, 0.6)}</b><br>Queima de gordura (60–70%): <b>${z(0.6, 0.7)}</b><br>Aeróbico (70–80%): <b>${z(0.7, 0.8)}</b><br>Limiar (80–90%): <b>${z(0.8, 0.9)}</b><br><span class="mute">Fórmula de Karvonen.</span>`; },
  rm: (f) => { const carga = n0(f.carga.value), reps = n0(f.reps.value); if (!carga || !reps) return 'Informe a carga e as repetições.';
    if (reps > 12) return 'Use uma série de até 12 repetições para a estimativa ficar confiável.';
    const rm = carga * (1 + reps / 30), p = (x) => `${Math.round(rm * x)} kg`;
    return `1RM estimado: <b>${fmtN(rm)} kg</b> (Epley).<br>Força (85%): <b>${p(0.85)}</b> · Hipertrofia (70–80%): <b>${p(0.7)}–${p(0.8)}</b> · Resistência (60%): <b>${p(0.6)}</b>`; },
  calorias: (f) => { const p = n0(f.peso.value), h = n0(f.altura.value), i = n0(f.idade.value), fat = n0(f.atividade.value), sexo = f.sexo.value;
    if (!p || !h || !i) return 'Informe peso, altura e idade.';
    const tmb = 10 * p + 6.25 * h - 5 * i + (sexo === 'M' ? 5 : -161), total = tmb * fat;
    return `Metabolismo basal: <b>${Math.round(tmb)} kcal</b><br>Gasto do dia: <b>${Math.round(total)} kcal</b><br>Para emagrecer (−500): <b>${Math.round(total - 500)} kcal</b> · Para ganhar massa (+300): <b>${Math.round(total + 300)} kcal</b><br><span class="mute">Mifflin-St Jeor. Para dieta, encaminhe ao nutricionista.</span>`; },
});

export const LADOS = {
  alunos: (a) => {
    const ult = {}; a.db.lista('checkins').forEach((c) => { if (!ult[c.aluno] || c.data > ult[c.aluno]) ult[c.aluno] = c.data; });
    const sumidos = a.db.lista('alunos').filter((x) => x.status === 'ativo' && ult[x.id] && diasAte(ult[x.id]) <= -10).sort((x, y) => ult[x.id].localeCompare(ult[y.id]));
    return bloco('Sumidos há 10 dias ou mais', 'person-simple-run', `<p>Quem some costuma cancelar. Chame antes.</p>${ldLista(sumidos.slice(0, 10).map((x) => ldItem(esc(x.nome), `último treino em ${dataCurta(ult[x.id])}`, {
        attrs: `data-abrir="aluno:${x.id}"`, dir: zap(x.telefone, `Oi, ${primeiro(x.nome)}! Sentimos sua falta aqui na ${a.empresa}. Está tudo bem? Bora voltar essa semana? Se quiser, ajusto o seu treino para encaixar na sua rotina.`, 'Chamar') })), 'Nenhum aluno ativo sumido.')}`)
      + bloco('Calcular IMC', 'scales', calc('imc', campoN('peso', 'Peso (kg)', 75) + campoN('altura', 'Altura (cm)', 172)))
      + bloco('Zonas de frequência cardíaca', 'heartbeat', calc('fc', campoN('idade', 'Idade', 30) + campoN('rep', 'FC de repouso (bpm)', 65)))
      + bloco('Carga máxima (1RM)', 'barbell', calc('rm', campoN('carga', 'Carga levantada (kg)', 60) + campoN('reps', 'Repetições', 8)))
      + bloco('Gasto calórico do dia', 'fire', calc('calorias', campoN('peso', 'Peso (kg)', 75) + campoN('altura', 'Altura (cm)', 172) + campoN('idade', 'Idade', 30)
        + campoS('sexo', 'Sexo', [['F', 'Feminino'], ['M', 'Masculino']]) + campoS('atividade', 'Atividade', [['1.55', 'Treina 3 a 5 vezes'], ['1.375', 'Treina 1 a 3 vezes'], ['1.725', 'Treina 6 a 7 vezes'], ['1.2', 'Sedentário']])));
  },
  financeiro: (a) => {
    const atr = a.db.lista('mensalidades').filter((m) => m.status === 'aberto' && m.vencimento < hoje()).sort((x, y) => x.vencimento.localeCompare(y.vencimento));
    const total = atr.reduce((s, m) => s + Number(m.valor || 0), 0);
    return bloco('Mensalidades em atraso', 'warning', `${ldNums([[moeda(total), 'em atraso'], [String(new Set(atr.map((m) => m.aluno)).size), 'alunos']])}${ldLista(atr.slice(0, 10).map((m) => { const x = aluno(a, m.aluno) || {};
      return ldItem(esc(x.nome || ''), `${moeda(m.valor)} · venceu ${dataCurta(m.vencimento)}`, { dir: zap(x.telefone, `Oi, ${primeiro(x.nome)}! A mensalidade de ${moeda(m.valor)} com vencimento em ${dataCurta(m.vencimento)} ainda está em aberto. Posso te mandar o PIX? Se já pagou, me avisa que eu dou baixa.`, 'Cobrar') }); }), 'Nenhuma mensalidade em atraso.')}`);
  },
  painel: (a) => {
    const aniv = a.db.lista('alunos').filter((x) => x.status === 'ativo').map((x) => ({ x, d: aniversarioEm(x.nascimento, 7) })).filter((y) => y.d).sort((p, q) => p.d.localeCompare(q.d));
    return bloco('Aniversariantes (7 dias)', 'cake', ldLista(aniv.slice(0, 10).map(({ x, d }) => ldItem(esc(x.nome), d === hoje() ? 'hoje' : dataCurta(d), {
      dir: zap(x.telefone, `Parabéns, ${primeiro(x.nome)}! A equipe da ${a.empresa} deseja um ano de muita saúde e treinos bons. Passa aqui que tem um abraço te esperando!`, 'Parabéns') })), 'Nenhum aniversário nos próximos 7 dias.'))
      + LADOS.aulas(a);
  },
  experimentais: (a) => {
    const abertos = a.db.lista('experimentais').filter((x) => ['fez', 'proposta'].includes(x.etapa) && diasAte(x.data || x.criado) <= -2).sort((x, y) => String(x.data).localeCompare(String(y.data)));
    return bloco('Fizeram a aula e não fecharam', 'user-plus', `<p>Depois de 2 dias sem resposta, um lembrete com uma condição de matrícula ajuda a fechar.</p>${ldLista(abertos.slice(0, 10).map((x) => ldItem(esc(x.nome), `${esc(x.interesse || '')} · aula em ${dataCurta(x.data)}`, {
      dir: zap(x.telefone, `Oi, ${primeiro(x.nome)}! O que achou da aula de ${x.interesse || 'experimental'} aqui na ${a.empresa}? Se quiser começar esta semana, consigo condição especial na matrícula. Posso te passar os planos?`, 'Lembrar') })), 'Ninguém esperando resposta.')}`);
  },
  aulas: (a) => {
    const tu = a.db.lista('turmas').map((t) => ({ t, n: (t.inscritos || []).length, v: Number(t.vagas) || 0 })).sort((x, y) => (y.n / (y.v || 1)) - (x.n / (x.v || 1)));
    return bloco('Ocupação das turmas', 'users-three', ldLista(tu.map(({ t, n, v }) => ldItem(esc(t.nome), `${esc(t.professor || '')} · ${t.hora || ''}`, { dir: `<b class="num" style="color:${v && n >= v ? 'var(--er)' : v && n / v >= 0.8 ? 'var(--al)' : 'inherit'}">${n}/${v || '—'}</b>` })), 'Nenhuma turma cadastrada.'));
  },
};

// cada ferramenta como item próprio no menu da esquerda: [id, rótulo, ícone, aba de origem, começo do título do bloco]
export const ITENS = [
  ['imc', 'IMC', 'scales', 'alunos', 'Calcular IMC'],
  ['fc', 'Zonas de frequência cardíaca', 'heartbeat', 'alunos', 'Zonas'],
  ['rm', 'Carga máxima (1RM)', 'barbell', 'alunos', 'Carga máxima'],
  ['calorias', 'Gasto calórico', 'fire', 'alunos', 'Gasto calórico'],
  ['sumidos', 'Alunos sumidos', 'person-simple-run', 'alunos', 'Sumidos'],
  ['atraso', 'Mensalidades em atraso', 'warning', 'financeiro', 'Mensalidades em atraso'],
  ['aniversarios', 'Aniversariantes', 'cake', 'painel', 'Aniversariantes'],
  ['experimentais', 'Experimentais sem fechar', 'user-plus', 'experimentais', 'Fizeram a aula'],
  ['turmas', 'Ocupação das turmas', 'users-three', 'aulas', 'Ocupação'],
];
