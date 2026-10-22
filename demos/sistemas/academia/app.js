// Veltria Academia · alunos, mensalidades, check-in, aulas e treinos (referências: Tecnofit, Next Fit, EVO)
import {
  criarApp, esc, moeda, moedaC, num, pct, hoje, diaMais, mesMais, nomeMes, dataCurta, dataBR, relativo, diasAte, paraData, minutos, hhmm,
  sorteio, soma, agrupar, av, ic, et, kpis, barras, linhas, rosca, barrasH, calGrade, kanban, DIAS, DIAS_L, telLink, normal,
  modal, confirmar, avisar, editar, excluir, ficha, props, linhaDoTempo, vazio, imprimir,
} from '../base/nexo.js';
import { LADOS as FERR, ITENS as FERR_ITENS } from './ferramentas.js';
import { acoesLado, ferramentaPaginas, travarPro } from '../base/lado.js';

const FORMAS = ['PIX', 'Cartão de crédito', 'Cartão recorrente', 'Cartão de débito', 'Dinheiro'];
const ETAPAS = [['agendada', 'Aula marcada', '#94a3b8'], ['fez', 'Fez a aula', '#3b82f6'], ['proposta', 'Proposta enviada', '#f59e0b'], ['matriculou', 'Matriculou', '#16a34a'], ['perdido', 'Não fechou', '#64748b']];
const OBJETIVOS = ['Emagrecimento', 'Hipertrofia', 'Condicionamento', 'Saúde e qualidade de vida', 'Reabilitação', 'Performance'];
const EXERC = { A: [['Supino reto', 4, '10', 30], ['Supino inclinado com halteres', 3, '12', 14], ['Crucifixo na máquina', 3, '12', 35], ['Tríceps na polia', 4, '12', 25], ['Tríceps francês', 3, '10', 12]], B: [['Puxada frontal', 4, '10', 45], ['Remada baixa', 3, '12', 40], ['Remada unilateral', 3, '10', 16], ['Rosca direta', 3, '12', 20], ['Rosca martelo', 3, '10', 10]], C: [['Agachamento livre', 4, '8', 50], ['Leg press 45°', 4, '12', 160], ['Cadeira extensora', 3, '15', 40], ['Mesa flexora', 3, '12', 35], ['Panturrilha em pé', 4, '15', 60]] };

// ---------------------------------------------------------------- dados de exemplo (fictícios)
function semente() {
  const r = sorteio(20261102), esc1 = (l) => l[Math.floor(r() * l.length)], ent = (a, b) => a + Math.floor(r() * (b - a + 1));
  const planos = [['Mensal livre', 149.9, 1], ['Trimestral livre', 129.9, 3], ['Semestral livre', 114.9, 6], ['Anual livre', 99.9, 12], ['Mensal + aulas coletivas', 189.9, 1], ['Funcional 3x por semana', 169.9, 1]].map(([nome, valor, meses], i) => ({ id: `pl${i}`, nome, valor, meses }));
  const professores = ['Caio Medeiros', 'Fernanda Lins', 'Gustavo Pires', 'Juliana Rocha'];
  const pn = ['Amanda', 'Bruno', 'Camila', 'Diego', 'Elisa', 'Felipe', 'Giovana', 'Henrique', 'Isadora', 'João', 'Kelly', 'Leonardo', 'Marina', 'Natan', 'Otávio', 'Paula', 'Rafaela', 'Samuel', 'Tatiane', 'Victor', 'Larissa', 'Mateus', 'Bianca', 'Rodrigo', 'Letícia', 'Gabriel', 'Aline', 'Thiago', 'Priscila', 'André'];
  const sn = ['Souza', 'Oliveira', 'Pereira', 'Lima', 'Carvalho', 'Ribeiro', 'Almeida', 'Gomes', 'Martins', 'Araújo', 'Barbosa', 'Rocha', 'Dias', 'Teixeira', 'Freitas', 'Moreira'];
  const alunos = [], mensalidades = [], checkins = [], treinos = [];
  for (let i = 0; i < 168; i++) {
    const nome = `${pn[i % pn.length]} ${sn[(i * 7) % sn.length]}${i >= 60 ? ` ${sn[(i * 3 + 5) % sn.length]}` : ''}`;
    const pl = planos[i % 9 < 4 ? 0 : i % 9 < 6 ? 3 : i % 9 < 7 ? 1 : i % 9 < 8 ? 4 : 5], inicio = diaMais(-ent(5, 700));
    const cancelado = i % 13 === 5 && diasAte(inicio) < -90, congelado = i === 40 || i === 77;
    const a = { id: `al${i}`, nome, nascimento: `${ent(1968, 2008)}-${String(ent(1, 12)).padStart(2, '0')}-${String(ent(1, 28)).padStart(2, '0')}`, telefone: `(11) 9${ent(7000, 9899)}-${ent(1000, 9999)}`, email: `${normal(nome.split(' ')[0])}${i}@email.com`, plano: pl.id, inicio, dia_venc: ent(1, 28), objetivo: esc1(OBJETIVOS), professor: esc1(professores), status: cancelado ? 'cancelado' : congelado ? 'congelado' : 'ativo', criado: inicio, sexo: i % 2 ? 'M' : 'F', avaliacao: { peso: ent(55, 102), gordura: ent(12, 34), data: diaMais(-ent(10, 120)) } };
    if (i === 3) a.nascimento = `1994-${hoje().slice(5)}`;
    alunos.push(a);
    // mensalidades dos últimos meses
    for (let m = -6; m <= 0; m++) {
      const venc = `${mesMais(m)}-${String(a.dia_venc).padStart(2, '0')}`; if (venc < inicio || (cancelado && m > -2) || (congelado && m > -1)) continue;
      const atraso = venc < hoje() && ((i % 17 === 2 && m >= -1) || (i % 23 === 7 && m === 0));
      const pago = venc <= hoje() ? !atraso : false;
      mensalidades.push({ id: `ms${mensalidades.length}`, aluno: a.id, valor: pl.valor * (pl.meses > 1 && m % pl.meses ? 0 : 1) || pl.valor, competencia: mesMais(m), vencimento: venc, status: pago ? 'pago' : 'aberto', pago_em: pago ? diaMais(ent(-3, 2), venc) : null, forma: esc1(FORMAS) });
    }
    const prox = `${mesMais(1)}-${String(a.dia_venc).padStart(2, '0')}`; if (!cancelado && !congelado) mensalidades.push({ id: `ms${mensalidades.length}`, aluno: a.id, valor: pl.valor, competencia: mesMais(1), vencimento: prox, status: 'aberto', forma: esc1(FORMAS) });
    // frequência: a maioria treina 3x por semana; alguns sumiram
    const freq = cancelado ? 0 : congelado ? 0 : i % 11 === 4 ? 0.04 : i % 5 === 0 ? 0.3 : 0.5, some = i % 11 === 4 ? ent(12, 30) : 0;
    const pico = esc1([6, 7, 7, 8, 9, 10, 12, 14, 16, 17, 18, 18, 19, 19, 20]);
    for (let d = -60; d <= 0; d++) { if (d > -some) continue; const dia = diaMais(d); if (paraData(dia).getDay() === 0 && r() < 0.8) continue; if (r() < freq) checkins.push({ id: `ck${checkins.length}`, aluno: a.id, data: dia, hora: hhmm(pico * 60 + ent(-20, 50)) }); }
    if (!cancelado && i % 3 !== 2) ['A', 'B', 'C'].forEach((k) => treinos.push({ id: `tr${treinos.length}`, aluno: a.id, nome: `Treino ${k}`, foco: { A: 'Peito e tríceps', B: 'Costas e bíceps', C: 'Pernas' }[k], professor: a.professor, criado: diaMais(-ent(5, 70)), exercicios: EXERC[k].map(([n, s, rp, c]) => ({ nome: n, series: s, reps: rp, carga: Math.round(c * (0.7 + r() * 0.6)) })) }));
  }
  // check-ins de hoje até agora
  const agora = new Date().getHours();
  alunos.filter((a) => a.status === 'ativo').slice(0, 60).forEach((a, k) => { const h = esc1([6, 7, 8, 12, 17, 18]); if (h <= Math.max(agora, 9) && k % 2 === 0 && !checkins.some((c) => c.aluno === a.id && c.data === hoje())) checkins.push({ id: `ck${checkins.length}`, aluno: a.id, data: hoje(), hora: hhmm(h * 60 + ent(0, 55)) }); });
  const turmas = [['Spinning', 'Fernanda Lins', [1, 3, 5], '07:00', 50, 20], ['Funcional', 'Caio Medeiros', [2, 4], '07:00', 50, 16], ['Pilates solo', 'Juliana Rocha', [2, 4], '09:00', 50, 12], ['Muay thai', 'Gustavo Pires', [1, 3], '19:00', 60, 18], ['Spinning', 'Fernanda Lins', [2, 4], '18:30', 50, 20], ['Funcional', 'Caio Medeiros', [1, 3, 5], '18:00', 50, 16], ['Zumba', 'Juliana Rocha', [5], '19:00', 50, 25], ['Abdominal 30', 'Caio Medeiros', [1, 2, 3, 4, 5], '12:15', 30, 15], ['Yoga', 'Juliana Rocha', [6], '09:00', 60, 14], ['Cross training', 'Gustavo Pires', [2, 4, 6], '08:00', 60, 14]]
    .map(([nome, professor, dias, hora, duracao, vagas], i) => ({ id: `tu${i}`, nome, professor, dias, hora, duracao, vagas, inscritos: alunos.filter((a, k) => a.status === 'ativo' && (k + i) % 9 === 0).slice(0, vagas - (i % 4)).map((a) => a.id) }));
  const leadsN = ['Cristiane Faria', 'Douglas Neves', 'Eduardo Prado', 'Flávia Moraes', 'Guilherme Sá', 'Helena Vidal', 'Ítalo Barros', 'Jéssica Luz', 'Kauã Ramos', 'Lorena Cunha', 'Murilo Torres', 'Nathalia Reis', 'Pietra Lacerda', 'Renan Castro'];
  const experimentais = leadsN.map((nome, i) => ({ id: `ex${i}`, nome, telefone: `(11) 9${ent(7000, 9899)}-${ent(1000, 9999)}`, origem: esc1(['Instagram', 'Indicação', 'Google', 'Passou na frente', 'Gympass']), interesse: esc1(['Musculação', 'Funcional', 'Spinning', 'Muay thai', 'Pilates']), data: diaMais(ent(-12, 4)), etapa: ['agendada', 'agendada', 'fez', 'proposta', 'matriculou', 'matriculou', 'matriculou', 'perdido'][i % 8], criado: diaMais(-ent(1, 20)) }));
  const avaliacoes = [];
  alunos.filter((a) => a.status !== 'cancelado' && a.avaliacao).forEach((a, k) => {
    const n = 2 + (k % 3), meta = a.objetivo === 'Hipertrofia' ? 1 : -1;
    for (let j = 0; j < n; j++) {
      const t = n - 1 - j, peso = a.avaliacao.peso - meta * t * (0.8 + r() * 1.6), gordura = a.avaliacao.gordura + t * (0.6 + r() * 0.9);
      avaliacoes.push({ id: `av${avaliacoes.length}`, aluno: a.id, data: diaMais(-(t * 45 + ent(0, 10)), a.avaliacao.data), peso: Math.round(peso * 10) / 10, gordura: Math.round(gordura * 10) / 10, cintura: Math.round(70 + gordura * 0.9 + t), braco: Math.round(28 + (meta > 0 ? -t * 0.6 : 0) + r() * 3), altura: 158 + (k % 30) });
    }
  });
  return { avaliacoes, _cfg: { empresa: 'Arena Fit', endereco: 'Rua Augusta, 2.140 · Jardins · São Paulo/SP', cnpj: '29.874.112/0001-40', telefone: '(11) 3062-7788' }, planos, alunos, mensalidades, checkins, turmas, treinos, experimentais };
}

// ---------------------------------------------------------------- regras
const aluno = (a, id) => a.db.obter('alunos', id);
const plano = (a, id) => a.db.obter('planos', id);
const mens = (a) => a.db.lista('mensalidades');
const cks = (a) => a.db.lista('checkins');
const ultimoCk = (a, id) => cks(a).filter((c) => c.aluno === id).map((c) => c.data).sort().pop();
const emAtraso = (a, id) => mens(a).filter((m) => m.aluno === id && m.status === 'aberto' && m.vencimento < hoje());
const sumido = (a, x) => x.status === 'ativo' && (() => { const u = ultimoCk(a, x.id); return !u || diasAte(u) <= -10; })();
const idade = (n) => { const d = paraData(n), h = new Date(); let i = h.getFullYear() - d.getFullYear(); if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) i--; return i; };
const situacao = (a, x) => (x.status === 'cancelado' ? et('Cancelado', '') : x.status === 'congelado' ? et('Congelado', 'info') : emAtraso(a, x.id).length ? et(`Em atraso (${emAtraso(a, x.id).length})`, 'er') : sumido(a, x) ? et('Sumido', 'al') : et('Ativo', 'ok'));
const avals = (a, id) => a.db.lista('avaliacoes').filter((v) => v.aluno === id).sort((u, v) => v.data.localeCompare(u.data));
const mrr = (a) => soma(a.db.lista('alunos').filter((x) => x.status === 'ativo'), (x) => plano(a, x.plano)?.valor || 0);

const colecoes = {
  alunos: { singular: 'aluno', plural: 'alunos', largura: 640, campos: (a) => [
    { nome: 'nome', rotulo: 'Nome completo', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel', obrigatorio: true }, { nome: 'email', rotulo: 'E-mail', tipo: 'email' },
    { nome: 'nascimento', rotulo: 'Nascimento', tipo: 'data' }, { nome: 'plano', rotulo: 'Plano', tipo: 'relacao', colecao: 'planos', obrigatorio: true, mostrar: (p) => `${p.nome} · ${moeda(p.valor)}` },
    { nome: 'dia_venc', rotulo: 'Dia do vencimento', tipo: 'numero', padrao: () => Math.min(28, new Date().getDate()) }, { nome: 'objetivo', rotulo: 'Objetivo', tipo: 'selecao', opcoes: OBJETIVOS },
    { nome: 'professor', rotulo: 'Professor responsável', tipo: 'selecao', opcoes: ['Caio Medeiros', 'Fernanda Lins', 'Gustavo Pires', 'Juliana Rocha'] }],
    antesDeSalvar: (d, a, antes) => ({ ...d, status: antes?.status || 'ativo', inicio: antes?.inicio || hoje(), criado: antes?.criado || hoje() }),
    aoSalvar: (s, a, novo) => { if (novo) { const p = plano(a, s.plano); a.db.salvar('mensalidades', { aluno: s.id, valor: p.valor, competencia: hoje().slice(0, 7), vencimento: hoje(), status: 'aberto', forma: 'PIX' }); } } },
  planos: { singular: 'plano', plural: 'planos', campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'valor', rotulo: 'Valor mensal', tipo: 'moeda', obrigatorio: true }, { nome: 'meses', rotulo: 'Fidelidade (meses)', tipo: 'numero', padrao: 1 }] },
  experimentais: { singular: 'aula experimental', genero: 'f', plural: 'aulas experimentais', campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel', obrigatorio: true }, { nome: 'interesse', rotulo: 'Interesse', tipo: 'selecao', opcoes: ['Musculação', 'Funcional', 'Spinning', 'Muay thai', 'Pilates'] }, { nome: 'origem', rotulo: 'Como conheceu', tipo: 'selecao', opcoes: ['Instagram', 'Indicação', 'Google', 'Passou na frente', 'Gympass'] }, { nome: 'data', rotulo: 'Data da aula', tipo: 'data', padrao: () => diaMais(1) }],
    antesDeSalvar: (d, a, antes) => ({ ...d, etapa: antes?.etapa || 'agendada', criado: antes?.criado || hoje() }) },
  turmas: { singular: 'turma', genero: 'f', plural: 'turmas', campos: [{ nome: 'nome', rotulo: 'Aula', tipo: 'texto', obrigatorio: true }, { nome: 'professor', rotulo: 'Professor', tipo: 'selecao', opcoes: ['Caio Medeiros', 'Fernanda Lins', 'Gustavo Pires', 'Juliana Rocha'] }, { nome: 'hora', rotulo: 'Horário', tipo: 'hora', obrigatorio: true }, { nome: 'duracao', rotulo: 'Duração (min)', tipo: 'numero', padrao: 50 }, { nome: 'vagas', rotulo: 'Vagas', tipo: 'numero', padrao: 15 }],
    antesDeSalvar: (d, a, antes) => ({ ...d, dias: antes?.dias || [1, 3, 5], inscritos: antes?.inscritos || [] }) },
};

// ---------------------------------------------------------------- páginas
function painel(a) {
  const al = a.db.lista('alunos'), ativos = al.filter((x) => x.status === 'ativo'), atras = mens(a).filter((m) => m.status === 'aberto' && m.vencimento < hoje());
  const ckHoje = cks(a).filter((c) => c.data === hoje()), sum = ativos.filter((x) => sumido(a, x));
  const meses = Array.from({ length: 6 }, (_, i) => mesMais(i - 5));
  const aniv = al.filter((x) => x.status === 'ativo' && String(x.nascimento).slice(5) === hoje().slice(5));
  return `${kpis([{ rot: 'Alunos ativos', icone: 'users-three', val: num(ativos.length), nota: (() => { const n = al.filter((x) => x.criado.startsWith(hoje().slice(0, 7))).length; return `${n} ${n === 1 ? 'matrícula' : 'matrículas'} no mês`; })() },
    { rot: 'Receita recorrente', icone: 'arrows-clockwise', val: moeda(mrr(a)), nota: 'por mês, com os planos ativos', spark: meses.map((m) => soma(mens(a).filter((x) => x.competencia === m && x.status === 'pago'), (x) => x.valor)) },
    { rot: 'Mensalidades em atraso', icone: 'warning', val: moeda(soma(atras, (m) => m.valor)), alerta: atras.length > 0, nota: `${new Set(atras.map((m) => m.aluno)).size} alunos` },
    { rot: 'Check-ins hoje', icone: 'qr-code', val: num(ckHoje.length), nota: `média de ${num(cks(a).filter((c) => diasAte(c.data) > -30).length / 30)} por dia` }])}
    <div class="grade g21"><div class="cartao"><div class="cartao-cab"><div><h3>Frequência por horário</h3><div class="sub">Check-ins dos últimos 30 dias · planeje professores e aulas</div></div></div><div class="cartao-corpo">${barras({ dados: Array.from({ length: 17 }, (_, i) => i + 6).map((h) => ({ rot: `${h}h`, v: [cks(a).filter((c) => diasAte(c.data) > -30 && Number(c.hora.slice(0, 2)) === h).length] })), series: [{ nome: 'Check-ins', cor: 'var(--acc)' }], altura: 210, largura: 760 })}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Risco de cancelamento</h3><div class="sub">Ativos sem treinar há 10 dias ou mais</div></div><a class="btn peq" href="#/alunos">Ver alunos</a></div>${sum.length ? `<ul class="lista">${sum.slice(0, 6).map((x) => `<li>${av(x.nome)}<div class="cresce"><div class="t corta">${esc(x.nome)}</div><div class="s">último treino ${ultimoCk(a, x.id) ? relativo(ultimoCk(a, x.id)) : 'nunca'}</div></div><a class="btn peq" target="_blank" rel="noopener" href="${telLink(x.telefone)}?text=${encodeURIComponent(`Oi, ${x.nome.split(' ')[0]}! Sentimos sua falta aqui na ${a.empresa} 💪 Tá tudo bem? Quer que a gente ajuste seu treino ou horário?`)}">${ic('whatsapp-logo')}Chamar</a></li>`).join('')}</ul>` : vazio('check-circle', 'Todos treinando')}</div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Mais assíduos do mês</h3><div class="sub">Reconheça quem treina mais: dá para mandar os parabéns pelo WhatsApp</div></div></div><div class="cartao-corpo">${barrasH(Object.entries(agrupar(cks(a).filter((c) => c.data.startsWith(hoje().slice(0, 7))), (c) => c.aluno)).map(([k, l]) => ({ rot: aluno(a, k)?.nome || '—', v: l.length })).sort((x, y) => y.v - x.v).slice(0, 5))}</div></div>
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Mensalidades em atraso</h3><div class="sub">Cobre com um clique</div></div><a class="btn peq" href="#/financeiro">Financeiro</a></div>${atras.length ? `<ul class="lista">${atras.sort((x, y) => x.vencimento.localeCompare(y.vencimento)).slice(0, 6).map((m) => { const x = aluno(a, m.aluno); return `<li>${av(x.nome)}<div class="cresce"><div class="t corta">${esc(x.nome)}</div><div class="s">venceu ${relativo(m.vencimento)}</div></div><b class="num er-tx">${moeda(m.valor)}</b><button type="button" class="btn peq" data-acao="receber" data-id="${m.id}">${ic('check')}Recebido</button></li>`; }).join('')}</ul>` : vazio('check-circle', 'Ninguém em atraso')}</div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Aulas experimentais</h3><div class="sub">Conversão dos últimos 30 dias</div></div><a class="btn peq" href="#/experimentais">Funil</a></div><div class="cartao-corpo">${barrasH(ETAPAS.slice(0, 4).map(([id, n, c]) => ({ html: `<span class="flex"><i style="width:9px;height:9px;border-radius:3px;background:${c}"></i>${n}</span>`, v: a.db.lista('experimentais').filter((x) => ETAPAS.findIndex((e) => e[0] === x.etapa) >= ETAPAS.findIndex((e) => e[0] === id) && x.etapa !== 'perdido').length })))}
      ${aniv.length ? `<div class="dica" style="margin-top:12px">${ic('cake')}<span>Aniversário hoje: <b>${aniv.map((x) => esc(x.nome)).join(', ')}</b></span></div>` : ''}</div></div></div>`;
}

function recepcao(a) {
  const st = a.estado.rec ||= { busca: '' };
  const b = normal(st.busca), achados = b ? a.db.lista('alunos').filter((x) => normal(x.nome).includes(b) || x.telefone.replace(/\D/g, '').includes(b.replace(/\D/g, '') || '§')).slice(0, 6) : [];
  const ckHoje = cks(a).filter((c) => c.data === hoje()).sort((x, y) => y.hora.localeCompare(x.hora));
  return `<div class="grade g21"><div class="cartao"><div class="cartao-cab"><div><h3>Check-in</h3><div class="sub">Busque pelo nome ou telefone. Quem está em atraso aparece bloqueado, como na catraca.</div></div></div><div class="cartao-corpo">
      <label class="caixa-busca" style="max-width:none">${ic('magnifying-glass')}<input type="search" data-mudar="buscaRec" value="${esc(st.busca)}" placeholder="Nome ou telefone do aluno…" autofocus aria-label="Buscar aluno"></label>
      ${achados.length ? `<ul class="lista" style="margin:12px -18px 0">${achados.map((x) => { const atr = emAtraso(a, x.id), bloq = x.status !== 'ativo' || atr.length > 0, ja = ckHoje.some((c) => c.aluno === x.id); return `<li>${av(x.nome, 'g')}<div class="cresce"><div class="t">${esc(x.nome)}</div><div class="s">${esc(plano(a, x.plano)?.nome || '')} · ${situacao(a, x)}</div></div>${ja ? et('Já entrou hoje', 'ok') : bloq ? `<span class="er-tx" style="font-size:12.5px">${x.status !== 'ativo' ? 'Plano inativo' : `Em atraso: ${moeda(soma(atr, (m) => m.valor))}`}</span>${atr.length ? `<button type="button" class="btn peq" data-acao="receber" data-id="${atr[0].id}">${ic('currency-circle-dollar')}Receber</button>` : ''}` : `<button type="button" class="btn pri" data-acao="checkin" data-id="${x.id}">${ic('sign-in')}Liberar entrada</button>`}<button type="button" class="btn fant peq" data-abrir="aluno:${x.id}">Ficha</button></li>`; }).join('')}</ul>` : st.busca ? `<p class="mute" style="margin-top:12px">Nenhum aluno encontrado.</p>` : ''}</div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Entradas de hoje <span class="mute">${ckHoje.length}</span></h3></div></div>${ckHoje.length ? `<ul class="lista">${ckHoje.slice(0, 12).map((c) => `<li class="clicavel" data-abrir="aluno:${c.aluno}"><b class="num" style="width:44px">${c.hora}</b><div class="cresce t corta">${esc(aluno(a, c.aluno)?.nome || '')}</div></li>`).join('')}</ul>` : vazio('qr-code', 'Ninguém entrou ainda')}</div></div>`;
}

function alunosPag(a) {
  return a.tab({ id: 'alunos', colecao: 'alunos', singular: 'aluno', plural: 'alunos', ordem: 'nome', buscaDica: 'Nome, telefone ou e-mail…',
    visoes: [{ id: 'ativos', rot: 'Ativos', filtro: (x) => x.status === 'ativo' }, { id: 'atraso', rot: 'Em atraso', filtro: (x) => emAtraso(a, x.id).length > 0 }, { id: 'sumidos', rot: 'Sumidos (10+ dias)', filtro: (x) => sumido(a, x) }, { id: 'novos', rot: 'Novos (30 dias)', filtro: (x) => diasAte(x.criado) > -30 }, { id: 'inativos', rot: 'Cancelados e congelados', filtro: (x) => x.status !== 'ativo' }, { id: 'todos', rot: 'Todos' }],
    filtros: [{ k: 'plano', rot: 'Plano', opcoes: (aa) => aa.db.lista('planos').map((p) => [p.id, p.nome]) }, { k: 'professor', rot: 'Professor', opcoes: ['Caio Medeiros', 'Fernanda Lins', 'Gustavo Pires', 'Juliana Rocha'] }, { k: 'objetivo', rot: 'Objetivo', opcoes: OBJETIVOS }],
    textoBusca: (x) => `${x.nome} ${x.telefone} ${x.email}`, novo: { rot: 'Matricular', attrs: 'data-acao="novoCad" data-c="alunos"' }, aoClicar: (id) => a.abrir('aluno', id),
    massa: [{ rot: 'Mensagem no WhatsApp', icone: 'whatsapp-logo', acao: (ids) => { const x = aluno(a, ids[0]); window.open(`${telLink(x.telefone)}`, '_blank', 'noopener'); avisar(`Abrindo conversa com ${x.nome.split(' ')[0]} (1 de ${ids.length})`); } }],
    colunas: [{ k: 'nome', rot: 'Aluno', render: (x) => `<span class="flex" style="gap:9px">${av(x.nome)}<span><span class="prim">${esc(x.nome)}</span><span class="sub">${esc(x.objetivo || '')}</span></span></span>` }, { k: 'plano', rot: 'Plano', oc: true, valor: (x) => plano(a, x.plano)?.nome, render: (x) => `${esc(plano(a, x.plano)?.nome || '')}<span class="sub">${moeda(plano(a, x.plano)?.valor)}/mês</span>` },
      { k: 'ultimo', rot: 'Último treino', valor: (x) => ultimoCk(a, x.id) || '', render: (x) => { const u = ultimoCk(a, x.id); return u ? `<span class="${diasAte(u) <= -10 ? 'al-tx' : ''}">${relativo(u)}</span>` : '<span class="mute">—</span>'; } },
      { k: 'freq', rot: 'Treinos (30 dias)', n: true, oc: true, valor: (x) => cks(a).filter((c) => c.aluno === x.id && diasAte(c.data) > -30).length, render: (x) => num(cks(a).filter((c) => c.aluno === x.id && diasAte(c.data) > -30).length) }, { k: 'status', rot: 'Situação', valor: (x) => (x.status !== 'ativo' ? 3 : emAtraso(a, x.id).length ? 0 : sumido(a, x) ? 1 : 2), render: (x) => situacao(a, x), csv: (x) => x.status }] });
}

function financeiro(a) {
  return `${kpis([{ rot: 'Recebido no mês', icone: 'coins', val: moeda(soma(mens(a).filter((m) => m.status === 'pago' && String(m.pago_em).startsWith(hoje().slice(0, 7))), (m) => m.valor)) }, { rot: 'A receber no mês', icone: 'calendar-blank', val: moeda(soma(mens(a).filter((m) => m.status === 'aberto' && m.vencimento.startsWith(hoje().slice(0, 7)) && m.vencimento >= hoje()), (m) => m.valor)) }, { rot: 'Inadimplência', icone: 'warning', val: pct((soma(mens(a).filter((m) => m.status === 'aberto' && m.vencimento < hoje()), (m) => m.valor) / (mrr(a) || 1)) * 100, 1), nota: 'do faturamento mensal' }, { rot: 'Ticket médio', icone: 'receipt', val: moeda(mrr(a) / (a.db.lista('alunos').filter((x) => x.status === 'ativo').length || 1)) }])}
    ${a.tab({ id: 'mens', colecao: 'mensalidades', singular: 'mensalidade', plural: 'mensalidades', ordem: 'vencimento', total: (l) => moeda(soma(l, (m) => m.valor)), aoClicar: (id) => a.abrir('aluno', a.db.obter('mensalidades', id).aluno),
      visoes: [{ id: 'atraso', rot: 'Em atraso', filtro: (m) => m.status === 'aberto' && m.vencimento < hoje() }, { id: 'prox', rot: 'Vencem em 7 dias', filtro: (m) => m.status === 'aberto' && diasAte(m.vencimento) >= 0 && diasAte(m.vencimento) <= 7 }, { id: 'pagas', rot: 'Recebidas no mês', filtro: (m) => m.status === 'pago' && String(m.pago_em).startsWith(hoje().slice(0, 7)) }, { id: 'todas', rot: 'Todas' }],
      filtros: [{ k: 'forma', rot: 'Forma', opcoes: FORMAS }], textoBusca: (m) => aluno(a, m.aluno)?.nome || '',
      massa: [{ rot: 'Dar baixa hoje', icone: 'check', acao: (ids) => { ids.forEach((id) => a.db.salvar('mensalidades', { id, status: 'pago', pago_em: hoje() })); avisar(`${ids.length} mensalidades recebidas`); } }],
      colunas: [{ k: 'vencimento', rot: 'Vencimento', render: (m) => `<span class="${m.status === 'aberto' && m.vencimento < hoje() ? 'er-tx' : ''}">${dataCurta(m.vencimento)}</span>` }, { k: 'aluno', rot: 'Aluno', valor: (m) => aluno(a, m.aluno)?.nome, render: (m) => `<span class="prim">${esc(aluno(a, m.aluno)?.nome || '')}</span><span class="sub">${esc(plano(a, aluno(a, m.aluno)?.plano)?.nome || '')} · ${nomeMes(m.competencia)}</span>` }, { k: 'forma', rot: 'Forma', oc: true }, { k: 'valor', rot: 'Valor', n: true, render: (m) => moeda(m.valor) },
        { k: 'status', rot: '', ord: false, csv: false, render: (m) => (m.status === 'pago' ? et(`Recebido ${dataCurta(m.pago_em)}`, 'ok') : `<span class="flex" style="gap:6px;justify-content:flex-end">${m.informado ? et('PIX informado pelo aluno', 'info') : ''}${m.vencimento < hoje() ? `<a class="btn peq" target="_blank" rel="noopener" href="${telLink(aluno(a, m.aluno)?.telefone)}?text=${encodeURIComponent(`Oi, ${aluno(a, m.aluno)?.nome.split(' ')[0]}! Aqui é da ${a.empresa}. Sua mensalidade de ${moeda(m.valor)} venceu em ${dataBR(m.vencimento)}. Te mando a chave PIX? 💪`)}">${ic('whatsapp-logo')}Cobrar</a>` : ''}<button type="button" class="btn peq" data-acao="receber" data-id="${m.id}">${ic('check')}Receber</button></span>`) }] })}`;
}

function aulas(a) {
  const st = a.estado.aulas ||= { data: paraData(hoje()).getDay() === 0 ? diaMais(1) : hoje() };
  const seg = diaMais(-((paraData(st.data).getDay() + 6) % 7), st.data), dias = Array.from({ length: 7 }, (_, i) => diaMais(i, seg));
  a.cals.aulas = { aoClicar: (id) => a.abrir('turma', id.split('@')[0]), aoClicarVazio: () => a.acoes.novoCad({ c: 'turmas' }) };
  const ev = [];
  a.db.lista('turmas').forEach((t) => dias.forEach((d) => { if (t.dias.includes(paraData(d).getDay())) { const oc = t.inscritos.length / t.vagas; ev.push({ id: `${t.id}@${d}`, col: d, ini: t.hora, fim: hhmm(minutos(t.hora) + t.duracao), titulo: t.nome, sub: `${t.professor.split(' ')[0]} · ${t.inscritos.length}/${t.vagas}`, cor: oc >= 1 ? '#e11d48' : oc >= 0.8 ? '#f59e0b' : '#16a34a' }); } }));
  return `<div class="cal"><div class="cal-barra"><div class="grupo-btn"><button type="button" data-acao="semAulas" data-d="-7" aria-label="Semana anterior">${ic('caret-left', 'p')}</button><button type="button" data-acao="semAulas" data-d="0">Esta semana</button><button type="button" data-acao="semAulas" data-d="7" aria-label="Próxima semana">${ic('caret-right', 'p')}</button></div><h3>Semana de ${dataCurta(seg)}</h3>
    <span class="mute" style="font-size:12.5px;margin-left:auto">${ev.length} aulas na semana · ocupação média ${pct((soma(a.db.lista('turmas'), (t) => t.inscritos.length) / (soma(a.db.lista('turmas'), (t) => t.vagas) || 1)) * 100)}</span><button type="button" class="btn pri peq" data-acao="novoCad" data-c="turmas">${ic('plus')}Turma</button></div>
    ${calGrade({ id: 'aulas', inicio: 6, fim: 22, hh: 46, larguraCol: 140, agora: { col: hoje(), hora: new Date().toTimeString().slice(0, 5) }, colunas: dias.map((d) => ({ id: d, rot: `${DIAS[paraData(d).getDay()]} ${Number(d.slice(8))}`, hoje: d === hoje() })), eventos: ev })}
    <div class="flex mute" style="font-size:12px;gap:14px;padding:9px 12px;border-top:1px solid var(--borda)"><span class="flex" style="gap:5px"><i style="width:10px;height:10px;border-radius:3px;background:#16a34a"></i>Com vagas</span><span class="flex" style="gap:5px"><i style="width:10px;height:10px;border-radius:3px;background:#f59e0b"></i>Quase lotada</span><span class="flex" style="gap:5px"><i style="width:10px;height:10px;border-radius:3px;background:#e11d48"></i>Lotada</span><span style="margin-left:auto">Clique numa aula para ver a lista de alunos</span></div></div>`;
}

function experimentaisPag(a) {
  a.kanbans.exp = (id, s) => { const x = a.db.obter('experimentais', id); a.db.salvar('experimentais', { id, etapa: s }); avisar(`${x.nome.split(' ')[0]} → ${ETAPAS.find((e) => e[0] === s)[1]}`); if (s === 'matriculou') a.acoes.matricularExp({ id }); };
  a.kanbans['exp:abrir'] = (id) => a.abrir('exp', id);
  return `<div class="entre"><span class="mute" style="font-size:12.5px">Arraste os cartões conforme a pessoa avança. Ao soltar em “Matriculou”, o sistema já abre a matrícula.</span><button type="button" class="btn pri" data-acao="novoCad" data-c="experimentais">${ic('plus')}Aula experimental</button></div>`
    + kanban({ id: 'exp', itens: a.db.lista('experimentais'), campo: 'etapa', colunas: ETAPAS.map(([id, nome, cor]) => ({ id, nome, cor })),
      ficha: (x) => `<div class="t">${esc(x.nome)}</div><div class="s">${esc(x.interesse)} · ${esc(x.origem)}</div><div class="linha"><span class="mute" style="font-size:11.5px">${x.etapa === 'agendada' ? `aula ${relativo(x.data)}` : dataCurta(x.data)}</span><a class="btn fant peq ic-so" target="_blank" rel="noopener" href="${telLink(x.telefone)}?text=${encodeURIComponent(`Oi, ${x.nome.split(' ')[0]}! Aqui é da ${a.empresa}. ${x.etapa === 'agendada' ? `Confirmando sua aula experimental ${dataBR(x.data)}. Venha com roupa de treino e garrafinha!` : 'O que achou da aula? Separei uma condição especial pra você começar esta semana.'}`)}" aria-label="WhatsApp">${ic('whatsapp-logo')}</a></div>` });
}

function relatorios(a) {
  const meses = Array.from({ length: 6 }, (_, i) => mesMais(i - 5)), al = a.db.lista('alunos');
  const ativosEm = (m) => al.filter((x) => x.inicio.slice(0, 7) <= m && (x.status !== 'cancelado' || m < mesMais(-1))).length;
  return `${kpis([{ rot: 'Matrículas (6 meses)', icone: 'user-plus', val: num(al.filter((x) => x.criado >= `${meses[0]}-01`).length) }, { rot: 'Cancelamentos', icone: 'user-minus', val: num(al.filter((x) => x.status === 'cancelado').length) }, { rot: 'Treinos por aluno', icone: 'barbell', val: num(cks(a).filter((c) => diasAte(c.data) > -30).length / (al.filter((x) => x.status === 'ativo').length || 1), 1), nota: 'nos últimos 30 dias' }, { rot: 'Conversão de experimentais', icone: 'funnel', val: pct((a.db.lista('experimentais').filter((x) => x.etapa === 'matriculou').length / (a.db.lista('experimentais').filter((x) => x.etapa !== 'agendada').length || 1)) * 100) }])}
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Alunos ativos</h3><div class="sub">Por mês</div></div></div><div class="cartao-corpo">${linhas({ rotulos: meses.map((m) => nomeMes(m)), series: [{ nome: 'Ativos', cor: 'var(--acc)', v: meses.map(ativosEm) }], altura: 200, zero: false })}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Receita por plano</h3><div class="sub">Planos ativos</div></div></div><div class="cartao-corpo">${rosca({ itens: a.db.lista('planos').map((p, i) => ({ rot: p.nome, v: soma(al.filter((x) => x.status === 'ativo' && x.plano === p.id), () => p.valor), cor: ['var(--acc)', '#f59e0b', '#8b5cf6', '#14b8a6', '#e11d48', '#64748b'][i % 6] })).filter((x) => x.v), centro: moedaC(mrr(a)), sub: 'por mês', fmt: moedaC })}</div></div></div>
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Por professor</h3></div></div><div class="cartao-corpo">${barrasH(Object.entries(agrupar(al.filter((x) => x.status === 'ativo'), (x) => x.professor)).map(([p, l]) => ({ rot: p, v: l.length, extra: `${l.filter((x) => sumido(a, x)).length} sumidos` })).sort((x, y) => y.v - x.v))}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Objetivos dos alunos</h3></div></div><div class="cartao-corpo">${barrasH(OBJETIVOS.map((o) => ({ rot: o, v: al.filter((x) => x.status === 'ativo' && x.objetivo === o).length })).sort((x, y) => y.v - x.v))}</div></div></div>`;
}

// ---------------------------------------------------------------- treino impresso
function docTreino(a, x) {
  const ts = a.db.lista('treinos').filter((t) => t.aluno === x.id);
  return `<div class="doc"><div class="entre"><div><h1>${esc(a.empresa)}</h1><div style="color:#555">Ficha de treino · ${esc(x.nome)} · objetivo: ${esc(x.objetivo || '')}</div></div><div style="text-align:right;color:#555">Professor: ${esc(x.professor)}<br>${dataBR(hoje())}</div></div>
    ${ts.map((t) => `<h2>${esc(t.nome)} · ${esc(t.foco || '')}</h2><table><thead><tr><th>Exercício</th><th class="n">Séries</th><th class="n">Repetições</th><th class="n">Carga</th><th>Feito</th></tr></thead><tbody>${t.exercicios.map((e) => `<tr><td>${esc(e.nome)}</td><td class="n">${e.series}</td><td class="n">${esc(e.reps)}</td><td class="n">${e.carga} kg</td><td>☐ ☐ ☐ ☐</td></tr>`).join('')}</tbody></table>`).join('')}</div>`;
}

// ---------------------------------------------------------------- fichas
const fichas = {
  aluno(a, id, aba = 'resumo') {
    const x = aluno(a, id); if (!x) return null; const p = plano(a, x.plano), ms = mens(a).filter((m) => m.aluno === id).sort((u, v) => v.vencimento.localeCompare(u.vencimento)), ck = cks(a).filter((c) => c.aluno === id), ts = a.db.lista('treinos').filter((t) => t.aluno === id);
    let corpo = '';
    if (aba === 'resumo') {
      const sem = Array.from({ length: 8 }, (_, i) => diaMais(-7 * (7 - i)));
      corpo = `<div class="gav-sec">${props([['phone', 'WhatsApp', `${esc(x.telefone)} · <a href="${telLink(x.telefone)}" target="_blank" rel="noopener">abrir conversa</a>`], ['cake', 'Idade', x.nascimento ? `${idade(x.nascimento)} anos` : null], ['target', 'Objetivo', esc(x.objetivo || '')], ['user', 'Professor', esc(x.professor)], ['identification-card', 'Plano', `${esc(p?.nome || '')} · ${moeda(p?.valor)} · vence todo dia ${x.dia_venc}`], ['calendar-plus', 'Aluno desde', `${dataCurta(x.inicio)} · ${relativo(x.inicio)}`], ['heartbeat', 'Última avaliação', avals(a, id)[0] ? `${num(avals(a, id)[0].peso, 1)} kg · ${num(avals(a, id)[0].gordura, 1)}% de gordura · ${dataCurta(avals(a, id)[0].data)}` : null]])}</div>
        <div class="gav-sec"><h4>Treinos por semana (últimas 8)</h4>${barras({ dados: sem.map((s) => ({ rot: dataCurta(s), v: [ck.filter((c) => c.data >= s && c.data < diaMais(7, s)).length] })), series: [{ nome: 'Treinos', cor: 'var(--acc)' }], altura: 140, largura: 460 })}</div>`;
    }
    if (aba === 'treino') corpo = `<div class="gav-sec"><div class="flex" style="margin-bottom:10px"><button type="button" class="btn peq pri" data-acao="novoTreino" data-id="${id}">${ic('plus')}Novo treino</button>${ts.length ? `<button type="button" class="btn peq" data-acao="imprimirTreino" data-id="${id}">${ic('printer')}Imprimir ficha</button><a class="btn peq" target="_blank" rel="noopener" href="${telLink(x.telefone)}?text=${encodeURIComponent(ts.map((t) => `*${t.nome} · ${t.foco || ''}*\n${t.exercicios.map((e) => `• ${e.nome}: ${e.series}x${e.reps} · ${e.carga} kg`).join('\n')}`).join('\n\n'))}">${ic('whatsapp-logo')}Mandar no WhatsApp</a>` : ''}</div>
      ${ts.length ? ts.map((t) => `<div style="margin-bottom:14px"><div class="entre"><b>${esc(t.nome)} <span class="mute">· ${esc(t.foco || '')}</span></b><span class="mute" style="font-size:12px">desde ${dataCurta(t.criado)}</span></div><table class="tabela" style="margin-top:6px"><tbody>${t.exercicios.map((e) => `<tr><td>${esc(e.nome)}</td><td class="n">${e.series}×${esc(e.reps)}</td><td class="n">${e.carga} kg</td></tr>`).join('')}</tbody></table></div>`).join('') : vazio('barbell', 'Sem treino montado', 'Monte o treino A, B e C do aluno.')}</div>`;
    if (aba === 'fin') corpo = `<div class="gav-sec">${ms.length ? `<ul class="lista" style="margin:0 -20px">${ms.slice(0, 14).map((m) => `<li><div class="cresce"><div class="t">${nomeMes(m.competencia, true)}</div><div class="s">vence ${dataCurta(m.vencimento)}${m.forma ? ` · ${esc(m.forma)}` : ''}</div></div><b class="num">${moeda(m.valor)}</b>${m.status === 'pago' ? et('Pago', 'ok') : m.vencimento < hoje() ? `<button type="button" class="btn peq" data-acao="receber" data-id="${m.id}">${ic('check')}Receber</button>` : et('Em aberto', 'info')}</li>`).join('')}</ul>` : vazio('receipt', 'Sem mensalidades')}</div>`;
    if (aba === 'aval') {
      const av = avals(a, id), cr = [...av].reverse();
      const dif = (k) => (av.length > 1 ? av[0][k] - av[av.length - 1][k] : 0);
      corpo = `<div class="gav-sec"><div class="entre"><h4>Avaliação física</h4><button type="button" class="btn peq pri" data-acao="novaAval" data-id="${id}">${ic('plus')}Nova avaliação</button></div>
        ${av.length ? `${kpis([{ rot: 'Peso', icone: 'barbell', val: `${num(av[0].peso, 1)} kg`, nota: av.length > 1 ? `${dif('peso') > 0 ? '+' : ''}${num(dif('peso'), 1)} kg desde ${dataCurta(av[av.length - 1].data)}` : '' }, { rot: 'Gordura', icone: 'heartbeat', val: `${num(av[0].gordura, 1)}%`, nota: av.length > 1 ? `${dif('gordura') > 0 ? '+' : ''}${num(dif('gordura'), 1)} pontos` : '' }])}
          ${linhas({ rotulos: cr.map((v) => dataCurta(v.data)), series: [{ nome: 'Peso (kg)', cor: 'var(--acc)', v: cr.map((v) => v.peso) }, { nome: 'Gordura (%)', cor: '#64748b', v: cr.map((v) => v.gordura) }], altura: 170, largura: 460, zero: false, fmt: (v) => num(v, 1) })}
          <table class="tabela" style="margin-top:8px"><thead><tr><th>Data</th><th class="n">Peso</th><th class="n">Gordura</th><th class="n">Cintura</th><th class="n">Braço</th></tr></thead><tbody>${av.map((v) => `<tr><td>${dataCurta(v.data)}</td><td class="n">${num(v.peso, 1)} kg</td><td class="n">${num(v.gordura, 1)}%</td><td class="n">${v.cintura || '—'} cm</td><td class="n">${v.braco || '—'} cm</td></tr>`).join('')}</tbody></table>` : vazio('heartbeat', 'Nenhuma avaliação', 'Registre peso, gordura e medidas para acompanhar a evolução.')}</div>`;
    }
    if (aba === 'freq') corpo = `<div class="gav-sec">${ck.length ? `<ul class="lista" style="margin:0 -20px">${ck.sort((u, v) => (v.data + v.hora).localeCompare(u.data + u.hora)).slice(0, 25).map((c) => `<li><div class="cresce t">${DIAS_L[paraData(c.data).getDay()]}, ${dataCurta(c.data)}</div><span class="mute num">${c.hora}</span></li>`).join('')}</ul>` : vazio('qr-code', 'Nenhum check-in')}</div>`;
    return { html: ficha({ tipo: 'Aluno', icone: 'user', titulo: esc(x.nome), avatar: av(x.nome, 'gg'), sub: `${situacao(a, x)}<span>${esc(p?.nome || '')}</span>`,
      extra: `<div class="flex" style="margin-top:12px;flex-wrap:wrap">${x.status === 'ativo' && !emAtraso(a, id).length ? `<button type="button" class="btn pri" data-acao="checkin" data-id="${id}">${ic('sign-in')}Check-in</button>` : ''}${x.status === 'ativo' ? `<button type="button" class="btn" data-acao="congelar" data-id="${id}">${ic('pause')}Congelar</button><button type="button" class="btn" data-acao="linkAluno" data-id="${id}">${ic('link')}Área do aluno</button><button type="button" class="btn" data-acao="cancelarAluno" data-id="${id}">${ic('x')}Cancelar plano</button>` : `<button type="button" class="btn pri" data-acao="reativar" data-id="${id}">${ic('arrow-counter-clockwise')}Reativar</button>`}</div>`,
      aba, abas: [['resumo', 'Resumo'], ['treino', 'Treino', ts.length], ['aval', 'Avaliação', avals(a, id).length || ''], ['fin', 'Mensalidades', ms.filter((m) => m.status === 'aberto' && m.vencimento < hoje()).length || ''], ['freq', 'Frequência', ck.length]], corpo,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="alunos" data-id="${id}">${ic('pencil-simple')}Editar</button>` }), montar: (g) => (g.dataset.aba = aba) };
  },
  turma(a, id) {
    const t = a.db.obter('turmas', id); if (!t) return null;
    return { estreita: true, html: ficha({ tipo: 'Turma', icone: 'users-three', titulo: esc(t.nome), sub: `<span>${t.dias.map((d) => DIAS[d]).join(', ')} · ${t.hora} · ${t.duracao} min</span>${et(`${t.inscritos.length}/${t.vagas} vagas`, t.inscritos.length >= t.vagas ? 'er' : 'ok')}`,
      corpo: `<div class="gav-sec">${props([['user', 'Professor', esc(t.professor)]])}</div><div class="gav-sec"><div class="entre"><h4>Alunos inscritos</h4><button type="button" class="btn peq" data-acao="inscrever" data-id="${id}">${ic('plus')}Inscrever</button></div>${t.inscritos.length ? `<ul class="lista" style="margin:0 -20px">${t.inscritos.map((aid) => aluno(a, aid)).filter(Boolean).map((x) => `<li>${av(x.nome, 'p')}<div class="cresce t corta">${esc(x.nome)}</div><button type="button" class="btn fant peq ic-so" data-acao="desinscrever" data-id="${id}" data-a="${x.id}" aria-label="Tirar da turma">${ic('x')}</button></li>`).join('')}</ul>` : vazio('users-three', 'Ninguém inscrito')}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="turmas" data-id="${id}">${ic('pencil-simple')}Editar</button><button type="button" class="btn fant peq ic-so" data-acao="excluirCad" data-c="turmas" data-id="${id}" aria-label="Excluir">${ic('trash')}</button>` }) };
  },
  exp(a, id) {
    const x = a.db.obter('experimentais', id); if (!x) return null;
    return { estreita: true, html: ficha({ tipo: 'Aula experimental', icone: 'barbell', titulo: esc(x.nome), sub: et(ETAPAS.find((e) => e[0] === x.etapa)[1], x.etapa === 'matriculou' ? 'ok' : x.etapa === 'perdido' ? '' : 'info'),
      extra: `<div class="flex" style="margin-top:12px">${x.etapa !== 'matriculou' ? `<button type="button" class="btn pri" data-acao="matricularExp" data-id="${id}">${ic('user-plus')}Matricular</button>` : ''}<a class="btn" target="_blank" rel="noopener" href="${telLink(x.telefone)}">${ic('whatsapp-logo')}WhatsApp</a></div>`,
      corpo: `<div class="gav-sec">${props([['phone', 'WhatsApp', esc(x.telefone)], ['barbell', 'Interesse', esc(x.interesse)], ['megaphone', 'Como conheceu', esc(x.origem)], ['calendar-blank', 'Aula', dataBR(x.data)]])}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="experimentais" data-id="${id}">${ic('pencil-simple')}Editar</button>` }) };
  },
};

// ---------------------------------------------------------------- aplicativo
const app = criarApp({
  id: 'academia', nome: 'Veltria Academia', sub: 'Academias e estúdios', cor: '#ea580c', icone: 'barbell', empresa: 'Arena Fit', conta: 'Musculação e aulas · São Paulo',
  produto: { mensal: 99 }, semente, colecoes, fichas, buscaDica: 'alunos',
  portal: {
    aluno: {
      explica: 'A área do aluno no celular: treino do dia, check-in, evolução das avaliações e a mensalidade com PIX. O aluno pode salvar na tela inicial.',
      montar: (a, id) => {
        const x = aluno(a, id); if (!x) return null;
        const ts = a.db.lista('treinos').filter((t) => t.aluno === id), ck = cks(a).filter((c) => c.aluno === id);
        const m = mens(a).filter((y) => y.aluno === id && y.status === 'aberto').sort((u, v) => u.vencimento.localeCompare(v.vencimento))[0];
        const pix = a.pixDados();
        return { nome: x.nome, plano: plano(a, x.plano)?.nome || '', treinos: ts.map((t) => ({ nome: t.nome, foco: t.foco, exercicios: t.exercicios })), treinoHoje: ts.length ? ck.length % ts.length : 0,
          avaliacoes: avals(a, id).map((v) => ({ data: v.data, peso: v.peso, gordura: v.gordura })), checkinHoje: ck.some((c) => c.data === hoje()), frequencia30: ck.filter((c) => diasAte(c.data) > -30).length,
          mensalidade: m ? { valor: m.valor, vencimento: m.vencimento, status: m.status, atrasada: m.vencimento < hoje(), pix, txid: `MS${String(m.id).replace(/[^A-Za-z0-9]/g, '').slice(-10)}` } : { valor: plano(a, x.plano)?.valor || 0, vencimento: '', status: 'pago' } };
      },
      responder: (a, r) => {
        const x = aluno(a, r.ref); if (!x) return '';
        if (r.acao === 'checkin') {
          if (x.status !== 'ativo' || emAtraso(a, x.id).length || cks(a).some((c) => c.aluno === x.id && c.data === hoje())) return '';
          a.db.salvar('checkins', { aluno: x.id, data: hoje(), hora: new Date().toTimeString().slice(0, 5), app: true });
          return `${x.nome.split(' ')[0]} fez check-in pelo celular`;
        }
        if (r.acao === 'paguei') {
          const m = mens(a).filter((y) => y.aluno === x.id && y.status === 'aberto').sort((u, v) => u.vencimento.localeCompare(v.vencimento))[0]; if (!m) return '';
          a.db.salvar('mensalidades', { id: m.id, informado: hoje() });
          return `${x.nome.split(' ')[0]} informou o pagamento por PIX de ${moeda(m.valor)}: confira e dê baixa`;
        }
        return '';
      },
    },
  },
  modelos: [
    { id: 'musculacao', nome: 'Academia de musculação', desc: 'Planos mensal, trimestral e anual', dados: { planos: [['Mensal', 139.9, 1], ['Trimestral', 119.9, 3], ['Anual', 94.9, 12]].map(([nome, valor, meses]) => ({ nome, valor, meses })) } },
    { id: 'cross', nome: 'Box de cross training', desc: 'Turmas de WOD e planos por frequência', dados: { planos: [['Cross 3x por semana', 219, 1], ['Cross livre', 279, 1], ['Open box', 159, 1]].map(([nome, valor, meses]) => ({ nome, valor, meses })), turmas: [['WOD', '06:00'], ['WOD', '07:00'], ['WOD', '12:00'], ['WOD', '18:00'], ['WOD', '19:00'], ['LPO', '20:00']].map(([nome, hora]) => ({ nome, professor: 'Gustavo Pires', dias: [1, 2, 3, 4, 5], hora, duracao: 60, vagas: 16, inscritos: [] })) } },
    { id: 'pilates', nome: 'Estúdio de pilates', desc: 'Pacotes de 1x, 2x e 3x por semana', dados: { planos: [['Pilates 1x por semana', 240, 1], ['Pilates 2x por semana', 390, 1], ['Pilates 3x por semana', 520, 1]].map(([nome, valor, meses]) => ({ nome, valor, meses })), turmas: [['Pilates aparelho', '07:00'], ['Pilates aparelho', '09:00'], ['Pilates aparelho', '17:00'], ['Pilates aparelho', '19:00']].map(([nome, hora]) => ({ nome, professor: 'Juliana Rocha', dias: [1, 2, 3, 4, 5], hora, duracao: 50, vagas: 4, inscritos: [] })) } },
    { id: 'lutas', nome: 'Escola de lutas', desc: 'Jiu-jítsu, muay thai e boxe', dados: { planos: [['Uma modalidade', 179, 1], ['Duas modalidades', 249, 1], ['Kids', 149, 1]].map(([nome, valor, meses]) => ({ nome, valor, meses })), turmas: [['Jiu-jítsu', '19:00'], ['Muay thai', '20:00'], ['Boxe', '18:00'], ['Jiu-jítsu kids', '17:00']].map(([nome, hora]) => ({ nome, professor: 'Gustavo Pires', dias: [1, 3, 5], hora, duracao: 60, vagas: 20, inscritos: [] })) } },
  ],
  passos: (a) => [{ id: 'area', rot: 'Mande a área do aluno para um aluno', feito: Object.keys(a.db.cfg.links || {}).some((k) => k.startsWith('aluno:')) }, { id: 'pix', rot: 'Cadastre a chave PIX para as mensalidades', feito: a.temPix(), href: '#/config' }],
  equipe: [['Marcelo Duarte', 'Dono'], ['Bianca Torres', 'Recepção'], ['Caio Medeiros', 'Professor'], ['Fernanda Lins', 'Professora'], ['Gustavo Pires', 'Professor'], ['Juliana Rocha', 'Professora']],
  busca: [{ colecao: 'alunos', grupo: 'Alunos', icone: 'user', ficha: 'aluno', rot: (x) => x.nome, sub: (x) => x.telefone }],
  comandos: [{ rot: 'Matricular aluno', icone: 'user-plus', acao: (a) => a.acoes.novoCad({ c: 'alunos' }) }, { rot: 'Check-in', icone: 'qr-code', acao: (a) => a.ir('#/recepcao') }],
  paginas: [
    { id: 'painel', lado: (a) => FERR.painel(a) + FERR.experimentais(a), rot: 'Painel', icone: 'house', titulo: 'Visão geral', render: painel, atalho: 'i' },
    { id: 'recepcao', rot: 'Check-in', icone: 'qr-code', titulo: 'Recepção e check-in', render: recepcao, atalho: 'r' },
    { id: 'alunos', lado: FERR.alunos, rot: 'Alunos', icone: 'users-three', render: alunosPag, atalho: 'a', novo: (a) => a.acoes.novoCad({ c: 'alunos' }), cont: (a) => { const n = a.db.lista('alunos').filter((x) => sumido(a, x)).length; return n ? { n, tom: 'al' } : 0; } },
    { id: 'aulas', rot: 'Aulas e turmas', icone: 'calendar-blank', render: aulas, cheio: true },
    { id: 'experimentais', rot: 'Aulas experimentais', icone: 'funnel', render: experimentaisPag, cheio: true, cont: (a) => a.db.lista('experimentais').filter((x) => x.etapa === 'agendada').length },
    { grupo: 'Gestão' },
    { id: 'financeiro', lado: FERR.financeiro, rot: 'Mensalidades', icone: 'currency-circle-dollar', render: financeiro, atalho: 'f', cont: (a) => { const n = new Set(mens(a).filter((m) => m.status === 'aberto' && m.vencimento < hoje()).map((m) => m.aluno)).size; return n ? { n, tom: 'er' } : 0; } },
    { id: 'relatorios', rot: 'Relatórios', icone: 'chart-bar', render: relatorios },
    { id: 'planos', rot: 'Planos', icone: 'identification-card', render: (a) => a.tab({ id: 'planos', colecao: 'planos', singular: 'plano', plural: 'planos', ordem: 'valor', novo: { rot: 'Novo plano', attrs: 'data-acao="novoCad" data-c="planos"' }, aoClicar: async (id) => { if (await editar(a, 'planos', a.db.obter('planos', id))) a.render(); }, colunas: [{ k: 'nome', rot: 'Plano', render: (p) => `<span class="prim">${esc(p.nome)}</span>` }, { k: 'meses', rot: 'Fidelidade', n: true, render: (p) => (p.meses > 1 ? `${p.meses} meses` : 'sem') }, { k: 'valor', rot: 'Mensal', n: true, render: (p) => moeda(p.valor) }, { k: 'alunos', rot: 'Alunos ativos', n: true, valor: (p) => a.db.lista('alunos').filter((x) => x.status === 'ativo' && x.plano === p.id).length, render: (p) => num(a.db.lista('alunos').filter((x) => x.status === 'ativo' && x.plano === p.id).length) }] }) },
    ...ferramentaPaginas(FERR, FERR_ITENS),
  ],
});

const reab = () => { app.render(); app.reabrir(); };
Object.assign(app.acoes, {
  buscaRec: (d, el) => { app.estado.rec.busca = el.value; app.render(); const i = document.querySelector('[data-mudar="buscaRec"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } },
  checkin: (d) => { const x = aluno(app, d.id); if (cks(app).some((c) => c.aluno === d.id && c.data === hoje())) { avisar(`${x.nome.split(' ')[0]} já entrou hoje`); return; } const c = app.db.salvar('checkins', { aluno: d.id, data: hoje(), hora: new Date().toTimeString().slice(0, 5) }); avisar(`Entrada liberada: ${x.nome.split(' ')[0]}`, { desfazer: () => { app.db.apagar('checkins', c.id); reab(); } }); if (app.estado.rec) app.estado.rec.busca = ''; reab(); },
  linkAluno: async (d) => { await app.pedirPix('Para o aluno pagar a mensalidade pela área dele, cadastre a chave PIX da academia.'); const x = aluno(app, d.id); app.portal.compartilhar('aluno', d.id, { titulo: `Área do aluno · ${x.nome}`, telefone: x.telefone, texto: `Oi, ${x.nome.split(' ')[0]}! Esta é a sua área na ${app.empresa}: treino do dia, check-in e evolução. Salve na tela inicial do celular 💪` }); },
  novaAval: async (d) => {
    const ult = avals(app, d.id)[0] || {};
    const r = await modal({ titulo: `Avaliação física · ${aluno(app, d.id).nome}`, largura: 520, corpo: `<form class="form-grade"><label class="campo">Data<input type="date" name="data" value="${hoje()}"></label><label class="campo">Altura (cm)<input type="number" name="altura" value="${ult.altura || ''}"></label><label class="campo">Peso (kg)<input type="number" step="0.1" name="peso" value="${ult.peso || ''}" required></label><label class="campo">Gordura (%)<input type="number" step="0.1" name="gordura" value="${ult.gordura || ''}" required></label><label class="campo">Cintura (cm)<input type="number" name="cintura" value="${ult.cintura || ''}"></label><label class="campo">Braço (cm)<input type="number" name="braco" value="${ult.braco || ''}"></label></form>`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Salvar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); if (!fm.reportValidity()) return false; const o = Object.fromEntries(new FormData(fm)); return { data: o.data, ...Object.fromEntries(['altura', 'peso', 'gordura', 'cintura', 'braco'].map((k) => [k, o[k] ? Number(o[k]) : null])) }; } }] });
    if (!r) return; app.db.salvar('avaliacoes', { aluno: d.id, ...r }); avisar('Avaliação salva'); reab();
  },
  receber: async (d) => { const m = app.db.obter('mensalidades', d.id); const r = await modal({ titulo: `Receber ${moeda(m.valor)} · ${aluno(app, m.aluno).nome}`, largura: 420, corpo: `<label class="campo">Forma de pagamento<select data-f>${FORMAS.map((f) => `<option ${f === m.forma ? 'selected' : ''}>${f}</option>`).join('')}</select></label>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Confirmar', classe: 'pri ok', acao: (f) => f.querySelector('[data-f]').value }] }); if (!r) return; app.db.salvar('mensalidades', { id: d.id, status: 'pago', pago_em: hoje(), forma: r }); avisar('Mensalidade recebida'); reab(); },
  congelar: async (d) => { if (!(await confirmar('Congelar o plano? O aluno não paga nem entra até reativar.', { rotulo: 'Congelar' }))) return; app.db.salvar('alunos', { id: d.id, status: 'congelado' }); avisar('Plano congelado'); reab(); },
  cancelarAluno: async (d) => { if (!(await confirmar('Cancelar o plano deste aluno? As mensalidades futuras são removidas.', { rotulo: 'Cancelar plano', perigo: true }))) return; mens(app).filter((m) => m.aluno === d.id && m.status === 'aberto' && m.vencimento > hoje()).forEach((m) => app.db.apagar('mensalidades', m.id)); app.db.salvar('alunos', { id: d.id, status: 'cancelado', cancelado_em: hoje() }); avisar('Plano cancelado'); reab(); },
  reativar: (d) => { const x = aluno(app, d.id); app.db.salvar('alunos', { id: d.id, status: 'ativo' }); app.db.salvar('mensalidades', { aluno: d.id, valor: plano(app, x.plano).valor, competencia: hoje().slice(0, 7), vencimento: hoje(), status: 'aberto', forma: 'PIX' }); avisar('Aluno reativado · mensalidade gerada'); reab(); },
  novoTreino: async (d) => {
    const r = await modal({ titulo: 'Novo treino', largura: 620, corpo: `<form class="form-grade"><label class="campo">Nome<input name="nome" value="Treino ${'ABCDE'[app.db.lista('treinos').filter((t) => t.aluno === d.id).length] || 'X'}" required></label><label class="campo">Foco<input name="foco" placeholder="Ex.: Peito e tríceps"></label><label class="campo largo">Exercícios (um por linha: nome; séries; repetições; carga)<textarea name="ex" style="min-height:160px" placeholder="Supino reto; 4; 10; 30">${EXERC.A.map(([n, s, r2, c]) => `${n}; ${s}; ${r2}; ${c}`).join('\n')}</textarea></label></form>`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Salvar treino', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
    if (!r) return; const exercicios = r.ex.split('\n').map((l) => l.split(';').map((s) => s.trim())).filter((l) => l[0]).map(([nome, s, rp, c]) => ({ nome, series: Number(s) || 3, reps: rp || '12', carga: Number(c) || 0 }));
    app.db.salvar('treinos', { aluno: d.id, nome: r.nome, foco: r.foco, exercicios, professor: aluno(app, d.id).professor, criado: hoje() }); avisar('Treino salvo'); reab();
  },
  imprimirTreino: (d) => imprimir(docTreino(app, aluno(app, d.id))),
  semAulas: (d) => { app.estado.aulas.data = d.d === '0' ? hoje() : diaMais(Number(d.d), app.estado.aulas.data); app.render(); },
  inscrever: async (d) => { const t = app.db.obter('turmas', d.id); if (t.inscritos.length >= t.vagas && !(await confirmar('Turma lotada. Inscrever mesmo assim?'))) return; const r = await modal({ titulo: `Inscrever em ${t.nome}`, largura: 440, corpo: `<label class="campo">Aluno<select data-a>${app.db.lista('alunos').filter((x) => x.status === 'ativo' && !t.inscritos.includes(x.id)).sort((u, v) => u.nome.localeCompare(v.nome)).map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join('')}</select></label>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Inscrever', classe: 'pri', acao: (f) => f.querySelector('[data-a]').value }] }); if (!r) return; app.db.salvar('turmas', { id: d.id, inscritos: [...t.inscritos, r] }); avisar('Aluno inscrito'); reab(); },
  desinscrever: (d) => { const t = app.db.obter('turmas', d.id); app.db.salvar('turmas', { id: d.id, inscritos: t.inscritos.filter((x) => x !== d.a) }); reab(); },
  matricularExp: async (d) => { const x = app.db.obter('experimentais', d.id); const s = await editar(app, 'alunos', null, { nome: x.nome, telefone: x.telefone, objetivo: 'Condicionamento' }); if (s) { app.db.salvar('experimentais', { id: d.id, etapa: 'matriculou' }); avisar(`${x.nome.split(' ')[0]} matriculado`); } app.render(); },
  novoCad: async (d) => { if (await editar(app, d.c)) app.render(); },
  editarCad: async (d) => { if (await editar(app, d.c, app.db.obter(d.c, d.id))) reab(); },
  excluirCad: (d) => excluir(app, d.c, d.id),
});

// ferramentas do painel ao lado das telas (WhatsApp e copiar)
Object.assign(app.acoes, acoesLado());
app.travarLado = travarPro;   // avisos e mensagens prontas: plano Pro (calculadoras: Básico)
