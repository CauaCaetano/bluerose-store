// Veltria Clínica · agenda médica, prontuário e convênios (referências: iClinic, Feegow, Amplimed)
import {
  criarApp, esc, moeda, moedaC, num, pct, hoje, diaMais, mesMais, nomeMes, dataCurta, dataBR, relativo, diasAte, paraData, minutos, hhmm,
  sorteio, soma, agrupar, av, ic, et, kpis, barras, rosca, barrasH, calGrade, DIAS, DIAS_L, telLink,
  modal, confirmar, avisar, editar, excluir, ficha, props, linhaDoTempo, vazio, imprimir,
  corSegura,
} from '../base/nexo.js';
import { LADOS as FERR, ITENS as FERR_ITENS } from './ferramentas.js';
import { acoesLado, ferramentaPaginas, travarPro } from '../base/lado.js';

const ABRE = 7, FECHA = 20;
const STATUS = { agendado: ['Agendado', '#94a3b8'], confirmado: ['Confirmado', '#3b82f6'], chegou: ['Na recepção', '#f59e0b'], atendimento: ['Em atendimento', '#a855f7'], atendido: ['Atendido', '#16a34a'], faltou: ['Faltou', '#e11d48'], cancelado: ['Cancelado', '#64748b'] };
const GUIA = { pendente: ['A enviar', 'al'], enviada: ['Enviada', 'info'], paga: ['Paga', 'ok'], glosada: ['Glosada', 'er'] };
const FORMAS = ['PIX', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro'];
const ativos = (x) => !['cancelado', 'faltou'].includes(x.status);

// ---------------------------------------------------------------- dados de exemplo (fictícios)
function semente() {
  const r = sorteio(20261101), esc1 = (l) => l[Math.floor(r() * l.length)], ent = (a, b) => a + Math.floor(r() * (b - a + 1));
  const profissionais = [['Dra. Helena Prado', 'Clínica geral', 'CRM-MG 48213', '#0e7490', [1, 2, 3, 4, 5], '08:00', '17:00'], ['Dr. Marcos Tavares', 'Cardiologia', 'CRM-MG 39577', '#7c3aed', [1, 3, 5], '09:00', '18:00'], ['Dra. Lívia Andrade', 'Dermatologia', 'CRM-MG 52104', '#db2777', [2, 4, 6], '08:00', '14:00'], ['Rafael Couto', 'Nutrição', 'CRN-9 21877', '#16a34a', [1, 2, 4], '13:00', '19:00']]
    .map(([nome, especialidade, conselho, cor, dias, ini, fim], i) => ({ id: `pr${i}`, nome, especialidade, conselho, cor, dias, ini, fim, duracao: i === 3 ? 45 : 30 }));
  const hd = paraData(hoje()).getDay(); [0, 1].forEach((i) => { if (!profissionais[i].dias.includes(hd)) profissionais[i].dias.push(hd); }); // demonstração: sempre há agenda hoje
  const convenios = [['Unimed', 145, 30], ['Bradesco Saúde', 160, 45], ['SulAmérica', 150, 30], ['Amil', 130, 60]].map(([nome, valor_consulta, prazo], i) => ({ id: `cv${i}`, nome, valor_consulta, prazo }));
  const procedimentos = [['Consulta', 320, 30], ['Retorno', 0, 20], ['Eletrocardiograma', 180, 20], ['Teste ergométrico', 420, 40], ['Avaliação de pele (dermatoscopia)', 260, 30], ['Consulta nutricional + bioimpedância', 280, 45], ['Aplicação de botox (por região)', 900, 30], ['Pequena cirurgia (retirada de sinal)', 650, 40]].map(([nome, preco, duracao], i) => ({ id: `pc${i}`, nome, preco, duracao }));
  const nomes = ['Ana Clara Ribeiro', 'Bruno Henrique Sales', 'Carla Menezes', 'Daniel Fonseca', 'Eduarda Lopes', 'Fábio Monteiro', 'Gabriela Teixeira', 'Heitor Campos', 'Isabela Duarte', 'João Pedro Lacerda', 'Karina Moura', 'Lucas Almeida', 'Mariana Fagundes', 'Nelson Prates', 'Olívia Batista', 'Pedro Rezende', 'Quésia Antunes', 'Renato Siqueira', 'Sílvia Bastos', 'Tiago Moreira', 'Úrsula Castro', 'Vinícius Rocha', 'Wesley Pinheiro', 'Yasmin Godoy', 'Zélia Carvalho', 'Antônio Brandão', 'Beatriz Nogueira', 'Cecília Amaral', 'Diego Paiva', 'Elaine Furtado', 'Felipe Viana', 'Gustavo Lima', 'Helena Barros', 'Igor Matos', 'Juliana Peixoto', 'Kátia Ramos'];
  const pacientes = nomes.map((nome, i) => { const conv = i % 3 === 2 ? null : convenios[i % 4].id; return { id: `pa${i}`, nome, nascimento: `${ent(1950, 2015)}-${String(ent(1, 12)).padStart(2, '0')}-${String(ent(1, 28)).padStart(2, '0')}`, sexo: i % 2 ? 'M' : 'F', cpf: `${ent(100, 999)}.${ent(100, 999)}.${ent(100, 999)}-${ent(10, 99)}`, telefone: `(31) 9${ent(8100, 9899)}-${ent(1000, 9999)}`, email: `${nome.split(' ')[0].toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}@email.com`, convenio: conv, carteirinha: conv ? `${ent(1000, 9999)} ${ent(1000, 9999)} ${ent(1000, 9999)}` : '', alergias: i % 7 === 0 ? 'Dipirona' : i % 11 === 0 ? 'Penicilina' : '', criado: diaMais(-ent(20, 600)) }; });
  pacientes.find((p) => p.id === 'pa4').nascimento = `1988-${hoje().slice(5)}`;
  const consultas = [];
  for (let d = -90; d <= 14; d++) {
    const data = diaMais(d), dow = paraData(data).getDay();
    for (const p of profissionais) {
      if (!p.dias.includes(dow)) continue;
      const slots = []; for (let m = minutos(p.ini); m + p.duracao <= minutos(p.fim); m += p.duracao) if (m < 12 * 60 || m >= 13 * 60) slots.push(m);
      for (const m of slots) {
        if (r() > (d >= 0 ? (d < 3 ? 0.72 : 0.42) : 0.7)) continue;
        const pa = esc1(pacientes), proc = p.id === 'pr1' ? esc1(['pc0', 'pc0', 'pc1', 'pc2', 'pc3']) : p.id === 'pr2' ? esc1(['pc0', 'pc4', 'pc4', 'pc6', 'pc7', 'pc1']) : p.id === 'pr3' ? 'pc5' : esc1(['pc0', 'pc0', 'pc1']);
        const pr = procedimentos.find((x) => x.id === proc), conv = pa.convenio && !['pc6', 'pc7'].includes(proc) && r() < 0.8;
        const passado = d < 0 || (d === 0 && m < 10 * 60);
        const status = passado ? (r() < 0.07 ? 'faltou' : r() < 0.04 ? 'cancelado' : 'atendido') : d === 0 ? (m < 11 * 60 ? esc1(['chegou', 'atendimento', 'confirmado']) : esc1(['confirmado', 'confirmado', 'agendado'])) : d <= 1 ? esc1(['confirmado', 'agendado', 'agendado']) : 'agendado';
        const valor = conv ? convenios.find((c) => c.id === pa.convenio).valor_consulta * (proc === 'pc1' ? 0 : 1) : pr.preco;
        consultas.push({ id: `c${consultas.length}`, paciente: pa.id, profissional: p.id, data, ini: hhmm(m), duracao: p.duracao, procedimento: proc, tipo: conv ? 'convenio' : 'particular', convenio: conv ? pa.convenio : null, valor, status,
          pago: status === 'atendido' && !conv ? d < -3 || r() > 0.3 : false, forma: conv ? null : esc1(FORMAS), guia: conv && status === 'atendido' ? (d < -40 ? (r() < 0.96 ? 'paga' : 'glosada') : d < -6 ? (d < -25 && r() < 0.5 ? 'paga' : 'enviada') : 'pendente') : null, chegada: status === 'chegou' || status === 'atendimento' ? hhmm(m - ent(5, 25)) : null });
      }
    }
  }
  const evolucoes = [];
  consultas.filter((c) => c.status === 'atendido' && diasAte(c.data) > -60).slice(-140).forEach((c, i) => {
    const p = profissionais.find((x) => x.id === c.profissional);
    const textos = { 'Clínica geral': ['S: Refere cansaço há 2 semanas e cefaleia vespertina.\nO: PA 128/82, FC 76, afebril. Ausculta sem alterações.\nA: Cefaleia tensional. Investigar anemia.\nP: Hemograma, ferritina, TSH. Retorno com exames.', 'S: Tosse seca há 5 dias, sem febre.\nO: Orofaringe hiperemiada, pulmões limpos.\nA: IVAS.\nP: Sintomáticos, hidratação. Retornar se febre.'], Cardiologia: ['S: Palpitações esporádicas aos esforços.\nO: PA 134/86, FC 82, ritmo regular. ECG sem alterações agudas.\nA: Investigação de arritmia.\nP: Holter 24 h e ecocardiograma.', 'S: Retorno de hipertensão. Uso regular de losartana.\nO: PA 122/78.\nA: HAS controlada.\nP: Manter conduta. Retorno em 6 meses.'], Dermatologia: ['S: Lesão pigmentada no dorso que mudou de cor.\nO: Lesão 6 mm, bordas irregulares (dermatoscopia).\nA: Nevo atípico.\nP: Exérese com anatomopatológico.', 'S: Acne inflamatória em face.\nO: Pápulas e pústulas em região malar.\nA: Acne grau II.\nP: Tratamento tópico, retorno em 60 dias.'], Nutrição: ['Bioimpedância: 31% gordura, massa magra 48 kg.\nObjetivo: reeducação alimentar e perda de 6 kg.\nPlano alimentar de 1.700 kcal entregue.', 'Retorno: −2,4 kg em 30 dias. Boa adesão.\nAjuste de lanches e hidratação (2,5 L/dia).'] };
    evolucoes.push({ id: `ev${i}`, paciente: c.paciente, profissional: c.profissional, consulta: c.id, data: c.data, tipo: 'evolucao', texto: esc1(textos[p.especialidade]) });
    if (i % 4 === 0) evolucoes.push({ id: `rx${i}`, paciente: c.paciente, profissional: c.profissional, consulta: c.id, data: c.data, tipo: 'receita', texto: esc1(['Losartana 50 mg — 1 comprimido pela manhã, uso contínuo.', 'Dipirona 500 mg — 1 comprimido de 6/6 h se dor, por até 3 dias.', 'Adapaleno 0,1% gel — aplicar à noite no rosto, por 60 dias.']) });
  });
  return { _cfg: { empresa: 'Clínica Vitta', endereco: 'Av. do Contorno, 6.120 · Funcionários · Belo Horizonte/MG', cnpj: '41.208.553/0001-07', telefone: '(31) 3281-4400' }, profissionais, convenios, procedimentos, pacientes, consultas, evolucoes };
}

// ---------------------------------------------------------------- ficha de saúde, odontograma e retornos
const PERGUNTAS = {
  base: [['queixa', 'O que motivou a consulta?', 'longo'], ['medicamentos', 'Usa algum medicamento? Quais?', 'texto'], ['alergias', 'Tem alergia a algum remédio ou material?', 'texto'], ['doencas', 'Tem hipertensão, diabetes ou outra doença crônica?', 'texto'], ['cirurgias', 'Já fez alguma cirurgia? Qual?', 'texto'], ['gestante', 'Está grávida ou amamentando?', 'sim_nao'], ['fuma', 'Fuma?', 'sim_nao']],
  odonto: [['gengiva', 'Sua gengiva sangra ao escovar?', 'sim_nao'], ['protese', 'Usa prótese ou aparelho?', 'sim_nao'], ['anestesia', 'Já teve reação a anestesia de dentista?', 'sim_nao']],
  psicologia: [['busca', 'O que você espera da terapia?', 'longo'], ['terapia', 'Já fez terapia antes?', 'sim_nao'], ['sono', 'Como está o seu sono?', 'texto']],
  fisioterapia: [['dor', 'Onde dói e há quanto tempo?', 'longo'], ['escala', 'De 0 a 10, quanto dói hoje?', 'texto'], ['exames', 'Tem exames de imagem recentes?', 'sim_nao']],
  estetica: [['pele', 'Como é a sua pele (oleosa, seca, mista, sensível)?', 'texto'], ['acidos', 'Usa ácidos ou isotretinoína?', 'sim_nao'], ['sol', 'Tomou sol nos últimos 7 dias?', 'sim_nao']],
};
const TERMO = 'Autorizo a clínica a registrar as minhas informações de saúde no prontuário eletrônico, de forma sigilosa, conforme a Lei Geral de Proteção de Dados (LGPD) e o código de ética profissional. Declaro que as informações acima são verdadeiras.';
const DENTES = [[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28], [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]];
const DENTE_ST = [['', 'Hígido', 'var(--painel)'], ['carie', 'Cárie', '#f59e0b'], ['rest', 'Restaurado', '#3b82f6'], ['canal', 'Canal', '#a855f7'], ['coroa', 'Coroa / prótese', '#14b8a6'], ['implante', 'Implante', '#64748b'], ['ausente', 'Ausente / extraído', '#e11d48']];
const ehOdonto = (a) => a.db.cfg.ramo === 'odonto' || a.db.lista('profissionais').some((x) => /odonto|dentist/i.test(x.especialidade));
const perguntasDe = (a) => [...PERGUNTAS.base, ...(PERGUNTAS[a.db.cfg.ramo] || (ehOdonto(a) ? PERGUNTAS.odonto : []))].map(([id, rot, tipo]) => ({ id, rot, tipo }));
const retornos = (a) => a.db.lista('pacientes').filter((p) => p.retorno && diasAte(p.retorno) <= 7 && !a.db.lista('consultas').some((c) => c.paciente === p.id && c.data >= hoje() && !['cancelado', 'faltou'].includes(c.status))).sort((x, y) => x.retorno.localeCompare(y.retorno));

// ---------------------------------------------------------------- regras
const prof = (a, id) => a.db.obter('profissionais', id);
const pac = (a, id) => a.db.obter('pacientes', id);
const proc = (a, id) => a.db.obter('procedimentos', id);
const conv = (a, id) => a.db.obter('convenios', id);
const cons = (a) => a.db.lista('consultas');
const fimDe = (c) => hhmm(minutos(c.ini) + (c.duracao || 30));
const idade = (n) => { if (!n) return ''; const d = paraData(n), h = new Date(); let i = h.getFullYear() - d.getFullYear(); if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) i--; return `${i} anos`; };
const atende = (p, data) => p && p.dias.includes(paraData(data).getDay());
const etC = (c) => `<span class="et sem-ponto" style="background:color-mix(in srgb,${STATUS[c.status][1]} 14%,var(--painel));color:${STATUS[c.status][1]}">${STATUS[c.status][0]}</span>`;
const choque = (a, pid, data, ini, dur, ignorar) => cons(a).find((c) => c.id !== ignorar && c.profissional === pid && c.data === data && ativos(c) && minutos(c.ini) < minutos(ini) + dur && minutos(ini) < minutos(c.ini) + c.duracao);

const colecoes = {
  pacientes: { singular: 'paciente', plural: 'pacientes', largura: 640, campos: [
    { nome: 'nome', rotulo: 'Nome completo', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'nascimento', rotulo: 'Nascimento', tipo: 'data' }, { nome: 'sexo', rotulo: 'Sexo', tipo: 'selecao', opcoes: [['F', 'Feminino'], ['M', 'Masculino']] },
    { nome: 'cpf', rotulo: 'CPF', tipo: 'texto' }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel', obrigatorio: true }, { nome: 'email', rotulo: 'E-mail', tipo: 'email' },
    { nome: 'convenio', rotulo: 'Convênio', tipo: 'relacao', colecao: 'convenios' }, { nome: 'carteirinha', rotulo: 'Nº da carteirinha', tipo: 'texto' }, { nome: 'alergias', rotulo: 'Alergias', tipo: 'texto', largo: true, dica: 'Deixe em branco se não houver' }],
    antesDeSalvar: (d, a, antes) => ({ ...d, criado: antes?.criado || hoje() }) },
  profissionais: { singular: 'profissional', plural: 'profissionais', campos: [
    { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true }, { nome: 'especialidade', rotulo: 'Especialidade', tipo: 'texto', obrigatorio: true }, { nome: 'conselho', rotulo: 'Registro (CRM, CRO, CRN…)', tipo: 'texto' },
    { nome: 'ini', rotulo: 'Início do expediente', tipo: 'hora', padrao: '08:00' }, { nome: 'fim', rotulo: 'Fim do expediente', tipo: 'hora', padrao: '18:00' }, { nome: 'duracao', rotulo: 'Duração da consulta (min)', tipo: 'numero', padrao: 30 }],
    antesDeSalvar: (d, a, antes) => ({ ...d, dias: antes?.dias || [1, 2, 3, 4, 5], cor: antes?.cor || '#0e7490' }) },
  convenios: { singular: 'convênio', plural: 'convênios', campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true }, { nome: 'valor_consulta', rotulo: 'Valor pago por consulta', tipo: 'moeda' }, { nome: 'prazo', rotulo: 'Prazo de pagamento (dias)', tipo: 'numero', padrao: 30 }] },
  procedimentos: { singular: 'procedimento', plural: 'procedimentos', campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'preco', rotulo: 'Preço particular', tipo: 'moeda' }, { nome: 'duracao', rotulo: 'Duração (min)', tipo: 'numero', padrao: 30 }] },
};

// ---------------------------------------------------------------- marcar consulta
async function marcar(a, base = {}) {
  const c = base.id ? base : null, v = { profissional: 'pr0', data: hoje(), ini: '09:00', procedimento: 'pc0', ...base };
  const r = await modal({ titulo: c ? 'Remarcar consulta' : 'Nova consulta', largura: 620, corpo: `<form class="form-grade" data-cons>
    <label class="campo largo">Paciente<select name="paciente" required><option value="">Selecione…</option>${a.db.lista('pacientes').sort((x, y) => x.nome.localeCompare(y.nome)).map((p) => `<option value="${p.id}" ${p.id === v.paciente ? 'selected' : ''}>${esc(p.nome)}${p.convenio ? ` · ${esc(conv(a, p.convenio)?.nome || '')}` : ''}</option>`).join('')}</select></label>
    <label class="campo">Profissional<select name="profissional">${a.db.lista('profissionais').map((p) => `<option value="${p.id}" ${p.id === v.profissional ? 'selected' : ''}>${esc(p.nome)} · ${esc(p.especialidade)}</option>`).join('')}</select></label>
    <label class="campo">Procedimento<select name="procedimento">${a.db.lista('procedimentos').map((p) => `<option value="${p.id}" ${p.id === v.procedimento ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></label>
    <label class="campo">Data<input type="date" name="data" value="${v.data}" required></label><label class="campo">Horário<input type="time" name="ini" value="${v.ini}" step="900" required></label>
    <label class="campo">Atendimento<select name="tipo"><option value="convenio">Convênio do paciente</option><option value="particular" ${v.tipo === 'particular' ? 'selected' : ''}>Particular</option></select></label></form>`,
  botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: c ? 'Salvar' : 'Marcar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); if (!fm.reportValidity()) return false; return Object.fromEntries(new FormData(fm)); } }] });
  if (!r) return null;
  const p = prof(a, r.profissional), pa = pac(a, r.paciente), pr = proc(a, r.procedimento), dur = pr?.duracao || p.duracao;
  if (!atende(p, r.data) && !(await confirmar(`${p.nome} não atende ${DIAS_L[paraData(r.data).getDay()]}. Marcar mesmo assim?`))) return null;
  const ch = choque(a, r.profissional, r.data, r.ini, dur, c?.id);
  if (ch && !(await confirmar(`Já existe consulta às ${ch.ini} com ${pac(a, ch.paciente)?.nome}. Marcar como encaixe?`, { rotulo: 'Encaixar' }))) return null;
  const viaConv = r.tipo === 'convenio' && pa.convenio;
  const salvo = a.db.salvar('consultas', { ...(c ? { id: c.id } : { status: 'agendado', pago: false }), paciente: r.paciente, profissional: r.profissional, procedimento: r.procedimento, data: r.data, ini: r.ini, duracao: dur, tipo: viaConv ? 'convenio' : 'particular', convenio: viaConv ? pa.convenio : null, valor: viaConv ? conv(a, pa.convenio).valor_consulta : pr.preco });
  a.db.registrar(`consultas:${salvo.id}`, c ? `Remarcada para ${dataCurta(r.data)}, ${r.ini}` : 'Consulta marcada', { icone: 'calendar-plus' });
  avisar(`${pa.nome.split(' ')[0]} · ${dataCurta(r.data)}, ${r.ini} com ${p.nome}`); a.render(); return salvo;
}

// ---------------------------------------------------------------- páginas
function agenda(a) {
  const st = a.estado.ag ||= { data: hoje() };
  const ps = a.db.lista('profissionais'), lista = cons(a).filter((c) => c.data === st.data);
  a.cals.agenda = {
    aoClicar: (id) => a.abrir('consulta', id),
    aoMover: (id, col, hora) => { const c = a.db.obter('consultas', id); const ch = choque(a, col, st.data, hora, c.duracao, id); a.db.salvar('consultas', { id, profissional: col, ini: hora }); a.db.registrar(`consultas:${id}`, `Remarcada para ${hora} com ${prof(a, col).nome}`, { icone: 'arrows-left-right' }); avisar(`${pac(a, c.paciente)?.nome.split(' ')[0]} → ${hora}${ch ? ' (encaixe)' : ''}`, { tipo: ch ? 'erro' : 'ok', desfazer: () => { a.db.salvar('consultas', { id, profissional: c.profissional, ini: c.ini }); a.render(); } }); a.render(); },
    aoClicarVazio: (col, hora) => marcar(a, { profissional: col, data: st.data, ini: hora }),
  };
  const fora = (p) => (atende(p, st.data) ? [[`0${ABRE}:00`, p.ini], ['12:00', '13:00'], [p.fim, `${FECHA}:00`]] : [[`0${ABRE}:00`, `${FECHA}:00`]]);
  const grade = calGrade({ id: 'agenda', inicio: ABRE, fim: FECHA, hh: 60, larguraCol: 200, agora: st.data === hoje() ? { col: '*', hora: new Date().toTimeString().slice(0, 5) } : null,
    colunas: ps.map((p) => ({ id: p.id, rot: p.nome, sub: atende(p, st.data) ? `${p.especialidade} · ${lista.filter((c) => c.profissional === p.id && ativos(c)).length} consultas` : 'não atende', avatar: `<span class="av" style="background:${corSegura(p.cor)}">${esc(p.nome.replace(/^Dra?\. /, '').split(' ').map((x) => x[0]).slice(0, 2).join(''))}</span>`, fora: fora(p) })),
    eventos: lista.filter((c) => c.status !== 'cancelado').map((c) => ({ id: c.id, col: c.profissional, ini: c.ini, fim: fimDe(c), titulo: pac(a, c.paciente)?.nome || '—', sub: proc(a, c.procedimento)?.nome, sub2: c.tipo === 'convenio' ? conv(a, c.convenio)?.nome : 'Particular', cor: STATUS[c.status][1], cls: c.status === 'faltou' ? 'cancelado' : c.status === 'atendido' ? 'feito' : '' })) });
  const at = lista.filter(ativos), d = paraData(st.data);
  return `<div class="cal"><div class="cal-barra">
    <div class="grupo-btn"><button type="button" data-acao="diaAg" data-d="-1" aria-label="Dia anterior">${ic('caret-left', 'p')}</button><button type="button" data-acao="diaAg" data-d="0">Hoje</button><button type="button" data-acao="diaAg" data-d="1" aria-label="Próximo dia">${ic('caret-right', 'p')}</button></div>
    <h3>${DIAS_L[d.getDay()]}, ${d.getDate()} de ${nomeMes(st.data.slice(0, 7), true)}</h3><input type="date" value="${st.data}" data-mudar="dataAg" style="width:150px;height:28px" aria-label="Escolher data">
    <span class="mute" style="font-size:12.5px;margin-left:auto"><b class="num" style="color:var(--tx)">${at.length}</b> consultas · <b style="color:var(--tx)">${at.filter((c) => c.status === 'agendado').length}</b> sem confirmar</span>
    ${at.some((c) => c.status === 'agendado') ? `<button type="button" class="btn peq" data-acao="confirmarDia">${ic('whatsapp-logo')}Pedir confirmação</button>` : ''}<button type="button" class="btn pri peq" data-acao="novaConsulta">${ic('plus')}Consulta</button></div>${grade}
    <div class="flex mute nao-imprime" style="font-size:12px;gap:14px;padding:9px 12px;border-top:1px solid var(--borda);flex-wrap:wrap">${Object.entries(STATUS).filter(([k]) => k !== 'cancelado').map(([, [n, c]]) => `<span class="flex" style="gap:5px"><i style="width:10px;height:10px;border-radius:3px;background:${c}"></i>${n}</span>`).join('')}<span style="margin-left:auto">Arraste para remarcar · clique duas vezes num horário vazio para marcar</span></div></div>`;
}

function recepcao(a) {
  const hojeL = cons(a).filter((c) => c.data === hoje() && ativos(c)).sort((x, y) => x.ini.localeCompare(y.ini));
  const agoraM = minutos(new Date().toTimeString().slice(0, 5));
  const col = (st, titulo, sub, vazioT) => { const l = hojeL.filter((c) => st.includes(c.status)); return `<div class="cartao"><div class="cartao-cab"><div><h3>${titulo} <span class="mute">${l.length}</span></h3><div class="sub">${sub}</div></div></div>${l.length ? `<ul class="lista">${l.map((c) => { const p = pac(a, c.paciente), espera = c.chegada ? agoraM - minutos(c.chegada) : 0; return `<li class="clicavel" data-abrir="consulta:${c.id}">${av(p?.nome || '?')}<div class="cresce"><div class="t corta">${esc(p?.nome || '—')}</div><div class="s corta">${c.ini} · ${esc(prof(a, c.profissional)?.nome || '')}${c.status === 'chegou' && espera > 0 ? ` · <span class="${espera > 20 ? 'er-tx' : 'al-tx'}">esperando há ${espera} min</span>` : ''}</div></div>${c.status === 'agendado' || c.status === 'confirmado' ? `<button type="button" class="btn peq" data-acao="stCons" data-id="${c.id}" data-s="chegou">${ic('door-open')}Chegou</button>` : c.status === 'chegou' ? `<button type="button" class="btn peq pri" data-acao="stCons" data-id="${c.id}" data-s="atendimento">${ic('play')}Chamar</button>` : c.status === 'atendimento' ? `<button type="button" class="btn peq ok pri" data-acao="finalizar" data-id="${c.id}">${ic('check')}Finalizar</button>` : c.tipo === 'particular' && !c.pago ? `<button type="button" class="btn peq" data-acao="receber" data-id="${c.id}">${ic('currency-circle-dollar')}Receber</button>` : et(c.tipo === 'convenio' ? 'Convênio' : 'Pago', 'ok')}</li>`; }).join('')}</ul>` : vazio('check-circle', vazioT)}</div>`; };
  return `<div class="grade g2">${col(['agendado', 'confirmado'], 'A chegar', 'Consultas de hoje ainda não chegaram', 'Todos já chegaram')}${col(['chegou'], 'Na recepção', 'Ordem de chegada · tempo de espera', 'Ninguém esperando')}</div>
    <div class="grade g2">${col(['atendimento'], 'Em atendimento', 'No consultório agora', 'Nenhum atendimento agora')}${col(['atendido'], 'Atendidos hoje', 'Receba os particulares na saída', 'Ninguém atendido ainda')}</div>`;
}

function painel(a) {
  const hojeL = cons(a).filter((c) => c.data === hoje() && ativos(c)), ym = hoje().slice(0, 7), mes = cons(a).filter((c) => c.data.startsWith(ym) && c.data <= hoje());
  const atend = mes.filter((c) => c.status === 'atendido'), faltas = cons(a).filter((c) => diasAte(c.data) > -30 && c.data < hoje() && ['faltou', 'atendido'].includes(c.status));
  const recebMes = soma(atend.filter((c) => c.tipo === 'particular' && c.pago), (c) => c.valor), convMes = soma(atend.filter((c) => c.tipo === 'convenio'), (c) => c.valor);
  const amanhaSem = cons(a).filter((c) => c.data === diaMais(1) && c.status === 'agendado');
  const dias = Array.from({ length: 30 }, (_, i) => diaMais(i - 29));
  return `${kpis([{ rot: 'Consultas hoje', icone: 'calendar-check', val: num(hojeL.length), nota: `${hojeL.filter((c) => c.status === 'atendido').length} atendidas · ${hojeL.filter((c) => c.status === 'chegou').length} na recepção` },
    { rot: `Faturamento de ${nomeMes(ym)}`, icone: 'currency-circle-dollar', val: moeda(recebMes + convMes), nota: `${moedaC(recebMes)} particular · ${moedaC(convMes)} convênios`, spark: dias.map((d) => soma(cons(a).filter((c) => c.data === d && c.status === 'atendido'), (c) => c.valor)) },
    { rot: 'Faltas (30 dias)', icone: 'user-minus', val: pct((faltas.filter((c) => c.status === 'faltou').length / (faltas.length || 1)) * 100, 1), alerta: faltas.filter((c) => c.status === 'faltou').length / (faltas.length || 1) > 0.08, nota: 'confirme pelo WhatsApp um dia antes' },
    { rot: 'Convênios a receber', icone: 'hand-coins', val: moeda(soma(cons(a).filter((c) => c.tipo === 'convenio' && ['pendente', 'enviada'].includes(c.guia)), (c) => c.valor)), nota: `${cons(a).filter((c) => c.guia === 'pendente').length} guias a enviar` }])}
    <div class="grade g21"><div class="cartao"><div class="cartao-cab"><div><h3>Atendimentos por dia</h3><div class="sub">Últimos 30 dias</div></div><a class="btn peq" href="#/relatorios">Relatórios</a></div><div class="cartao-corpo">${barras({ dados: dias.map((d) => ({ rot: Number(d.slice(8)), v: [cons(a).filter((c) => c.data === d && c.status === 'atendido' && c.tipo === 'particular').length, cons(a).filter((c) => c.data === d && c.status === 'atendido' && c.tipo === 'convenio').length] })), series: [{ nome: 'Particular', cor: 'var(--acc)' }, { nome: 'Convênio', cor: '#94a3b8' }], empilhado: true, altura: 200 })}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Próximas de hoje</h3></div><a class="btn peq" href="#/recepcao">Recepção</a></div>${hojeL.filter((c) => ['agendado', 'confirmado', 'chegou'].includes(c.status)).length ? `<ul class="lista">${hojeL.filter((c) => ['agendado', 'confirmado', 'chegou'].includes(c.status)).sort((x, y) => x.ini.localeCompare(y.ini)).slice(0, 7).map((c) => `<li class="clicavel" data-abrir="consulta:${c.id}"><b class="num" style="width:44px">${c.ini}</b><div class="cresce"><div class="t corta">${esc(pac(a, c.paciente)?.nome || '')}</div><div class="s corta">${esc(prof(a, c.profissional)?.nome || '')}</div></div>${etC(c)}</li>`).join('')}</ul>` : vazio('check-circle', 'Agenda de hoje concluída')}</div></div>
    ${retornos(a).length ? `<div class="cartao"><div class="cartao-cab"><div><h3>Retornos para marcar</h3><div class="sub">Pacientes com retorno vencendo e sem consulta marcada</div></div></div><ul class="lista">${retornos(a).slice(0, 8).map((p) => `<li>${av(p.nome)}<div class="cresce"><div class="t corta">${esc(p.nome)}</div><div class="s">retorno ${relativo(p.retorno)}</div></div><a class="btn peq" target="_blank" rel="noopener" href="${telLink(p.telefone)}?text=${encodeURIComponent(`Olá, ${p.nome.split(' ')[0]}! Aqui é da ${a.empresa}. Está chegando a hora do seu retorno. Qual o melhor dia para você?`)}">${ic('whatsapp-logo')}Chamar</a><button type="button" class="btn peq" data-acao="novaConsulta" data-p="${p.id}">${ic('calendar-plus')}Marcar</button></li>`).join('')}</ul></div>` : ''}
    ${amanhaSem.length ? `<div class="cartao"><div class="cartao-cab"><div><h3>Confirmar consultas de amanhã</h3><div class="sub">${amanhaSem.length} pacientes ainda não confirmaram</div></div><button type="button" class="btn peq" data-acao="confirmarAmanha">${ic('check')}Marcar todas confirmadas</button></div><ul class="lista">${amanhaSem.slice(0, 8).map((c) => { const p = pac(a, c.paciente); return `<li>${av(p.nome)}<div class="cresce"><div class="t">${esc(p.nome)}</div><div class="s">${c.ini} · ${esc(prof(a, c.profissional).nome)}</div></div><a class="btn peq" target="_blank" rel="noopener" href="${telLink(p.telefone)}?text=${encodeURIComponent(`Olá, ${p.nome.split(' ')[0]}! Aqui é da ${a.empresa}. Confirmando sua consulta amanhã (${dataBR(c.data)}) às ${c.ini} com ${prof(a, c.profissional).nome}. Responda SIM para confirmar ou nos avise se precisar remarcar.`)}">${ic('whatsapp-logo')}Confirmar</a></li>`; }).join('')}</ul></div>` : ''}`;
}

function pacientesPag(a) {
  return a.tab({ id: 'pacientes', colecao: 'pacientes', singular: 'paciente', plural: 'pacientes', ordem: 'nome', buscaDica: 'Nome, CPF ou telefone…',
    visoes: [{ id: 'todos', rot: 'Todos' }, { id: 'conv', rot: 'Convênio', filtro: (p) => !!p.convenio }, { id: 'part', rot: 'Particular', filtro: (p) => !p.convenio }, { id: 'aniv', rot: 'Aniversariantes do mês', filtro: (p) => String(p.nascimento).slice(5, 7) === hoje().slice(5, 7) }],
    filtros: [{ k: 'convenio', rot: 'Convênio', opcoes: (aa) => aa.db.lista('convenios').map((c) => [c.id, c.nome]) }],
    textoBusca: (p) => `${p.nome} ${p.cpf} ${p.telefone}`, novo: { rot: 'Novo paciente', attrs: 'data-acao="novoCad" data-c="pacientes"' }, aoClicar: (id) => a.abrir('paciente', id),
    colunas: [{ k: 'nome', rot: 'Paciente', render: (p) => `<span class="flex" style="gap:9px">${av(p.nome)}<span><span class="prim">${esc(p.nome)}</span><span class="sub">${idade(p.nascimento)}${p.alergias ? ` · <span class="er-tx">alergia: ${esc(p.alergias)}</span>` : ''}</span></span></span>` },
      { k: 'telefone', rot: 'WhatsApp', oc: true }, { k: 'convenio', rot: 'Convênio', valor: (p) => conv(a, p.convenio)?.nome || 'Particular', render: (p) => (p.convenio ? et(conv(a, p.convenio)?.nome || '', 'info', 'sem-ponto') : '<span class="mute">Particular</span>') },
      { k: 'ultima', rot: 'Última consulta', oc: true, valor: (p) => cons(a).filter((c) => c.paciente === p.id && c.status === 'atendido').map((c) => c.data).sort().pop() || '', render: (p) => { const u = cons(a).filter((c) => c.paciente === p.id && c.status === 'atendido').map((c) => c.data).sort().pop(); return u ? relativo(u) : '<span class="mute">—</span>'; } },
      { k: 'proxima', rot: 'Próxima', valor: (p) => cons(a).filter((c) => c.paciente === p.id && c.data >= hoje() && ativos(c) && c.status !== 'atendido').map((c) => c.data).sort()[0] || '', render: (p) => { const n = cons(a).filter((c) => c.paciente === p.id && c.data >= hoje() && ativos(c) && c.status !== 'atendido').sort((x, y) => (x.data + x.ini).localeCompare(y.data + y.ini))[0]; return n ? `${dataCurta(n.data)}, ${n.ini}` : '<span class="mute">—</span>'; } }] });
}

function faturamento(a) {
  const st = a.estado.fat ||= { conv: '' };
  const l = cons(a).filter((c) => c.tipo === 'convenio' && c.status === 'atendido' && (!st.conv || c.convenio === st.conv));
  const porConv = a.db.lista('convenios').map((cv) => { const x = cons(a).filter((c) => c.convenio === cv.id && c.status === 'atendido'); return { cv, pend: x.filter((c) => c.guia === 'pendente'), env: x.filter((c) => c.guia === 'enviada'), glo: x.filter((c) => c.guia === 'glosada'), pago: x.filter((c) => c.guia === 'paga' && diasAte(c.data) > -90) }; });
  return `${kpis([{ rot: 'Guias a enviar', icone: 'paper-plane-tilt', val: num(soma(porConv, (x) => x.pend.length)), nota: moeda(soma(porConv, (x) => soma(x.pend, (c) => c.valor))) }, { rot: 'Enviadas aguardando pagamento', icone: 'hourglass', val: moeda(soma(porConv, (x) => soma(x.env, (c) => c.valor))), nota: `${soma(porConv, (x) => x.env.length)} guias` }, { rot: 'Glosas', icone: 'warning', val: moeda(soma(porConv, (x) => soma(x.glo, (c) => c.valor))), alerta: porConv.some((x) => x.glo.length), nota: 'recorra em até 30 dias' }, { rot: 'Recebido (90 dias)', icone: 'check-circle', val: moeda(soma(porConv, (x) => soma(x.pago, (c) => c.valor))) }])}
    <div class="cartao"><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Convênio</th><th class="n">A enviar</th><th class="n">Enviadas</th><th class="n">Glosadas</th><th class="n">Prazo</th><th></th></tr></thead><tbody>${porConv.map((x) => `<tr><td><b>${esc(x.cv.nome)}</b><span class="sub">${moeda(x.cv.valor_consulta)} por consulta</span></td><td class="n">${x.pend.length} · ${moeda(soma(x.pend, (c) => c.valor))}</td><td class="n">${x.env.length} · ${moeda(soma(x.env, (c) => c.valor))}</td><td class="n ${x.glo.length ? 'er-tx' : ''}">${x.glo.length}</td><td class="n">${x.cv.prazo} dias</td><td class="acoes">${x.pend.length ? `<button type="button" class="btn peq pri" data-acao="enviarLote" data-cv="${x.cv.id}">${ic('paper-plane-tilt')}Fechar lote</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="entre"><h3 style="font-size:14px">Guias</h3><select data-mudar="fatConv" style="width:auto"><option value="">Todos os convênios</option>${a.db.lista('convenios').map((c) => `<option value="${c.id}" ${c.id === st.conv ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div>
    ${a.tab({ id: 'guias', itens: () => l, singular: 'guia', plural: 'guias', ordem: 'data', desc: true, aoClicar: (id) => a.abrir('consulta', id),
      visoes: Object.entries(GUIA).map(([k, [n]]) => ({ id: k, rot: n, filtro: (c) => c.guia === k })),
      massa: [{ rot: 'Marcar como enviadas', icone: 'paper-plane-tilt', acao: (ids) => { ids.forEach((id) => a.db.salvar('consultas', { id, guia: 'enviada' })); avisar(`${ids.length} guias enviadas`); } }, { rot: 'Marcar como pagas', icone: 'check', acao: (ids) => { ids.forEach((id) => a.db.salvar('consultas', { id, guia: 'paga' })); avisar(`${ids.length} guias pagas`); } }],
      colunas: [{ k: 'data', rot: 'Data', render: (c) => dataCurta(c.data) }, { k: 'paciente', rot: 'Paciente', valor: (c) => pac(a, c.paciente)?.nome, render: (c) => `<span class="prim">${esc(pac(a, c.paciente)?.nome || '')}</span><span class="sub mono">${esc(pac(a, c.paciente)?.carteirinha || '')}</span>` }, { k: 'convenio', rot: 'Convênio', oc: true, valor: (c) => conv(a, c.convenio)?.nome }, { k: 'procedimento', rot: 'Procedimento', oc: true, valor: (c) => proc(a, c.procedimento)?.nome }, { k: 'valor', rot: 'Valor', n: true, render: (c) => moeda(c.valor) }, { k: 'guia', rot: 'Situação', render: (c) => et(GUIA[c.guia][0], GUIA[c.guia][1]) }] })}`;
}

function caixa(a) {
  const part = cons(a).filter((c) => c.tipo === 'particular' && c.status === 'atendido');
  return `${kpis([{ rot: 'Recebido hoje', icone: 'cash-register', val: moeda(soma(part.filter((c) => c.pago && c.data === hoje()), (c) => c.valor)) }, { rot: 'Recebido no mês', icone: 'coins', val: moeda(soma(part.filter((c) => c.pago && c.data.startsWith(hoje().slice(0, 7))), (c) => c.valor)) }, { rot: 'Atendidos sem pagamento', icone: 'warning', val: moeda(soma(part.filter((c) => !c.pago), (c) => c.valor)), alerta: part.some((c) => !c.pago), nota: `${part.filter((c) => !c.pago).length} atendimentos` }])}
    ${a.tab({ id: 'caixa', itens: () => part, singular: 'atendimento', plural: 'atendimentos', ordem: 'data', desc: true, aoClicar: (id) => a.abrir('consulta', id), total: (l) => moeda(soma(l, (c) => c.valor)),
      visoes: [{ id: 'aberto', rot: 'A receber', filtro: (c) => !c.pago }, { id: 'mes', rot: 'Este mês', filtro: (c) => c.data.startsWith(hoje().slice(0, 7)) }, { id: 'todos', rot: 'Todos' }],
      filtros: [{ k: 'forma', rot: 'Forma', opcoes: FORMAS }, { k: 'profissional', rot: 'Profissional', opcoes: (aa) => aa.db.lista('profissionais').map((p) => [p.id, p.nome]) }],
      colunas: [{ k: 'data', rot: 'Data', render: (c) => `${dataCurta(c.data)} <span class="mute">${c.ini}</span>` }, { k: 'paciente', rot: 'Paciente', valor: (c) => pac(a, c.paciente)?.nome, render: (c) => `<span class="prim">${esc(pac(a, c.paciente)?.nome || '')}</span><span class="sub">${esc(proc(a, c.procedimento)?.nome || '')}</span>` }, { k: 'profissional', rot: 'Profissional', oc: true, valor: (c) => prof(a, c.profissional)?.nome }, { k: 'forma', rot: 'Forma', oc: true }, { k: 'valor', rot: 'Valor', n: true, render: (c) => moeda(c.valor) },
        { k: 'pago', rot: '', ord: false, csv: false, render: (c) => (c.pago ? et('Recebido', 'ok') : `<button type="button" class="btn peq" data-acao="receber" data-id="${c.id}">${ic('currency-circle-dollar')}Receber</button>`) }] })}`;
}

function relatorios(a) {
  const ult = cons(a).filter((c) => diasAte(c.data) > -90 && c.data <= hoje());
  const at = ult.filter((c) => c.status === 'atendido');
  const meses = Array.from({ length: 4 }, (_, i) => mesMais(i - 3));
  return `${kpis([{ rot: 'Atendimentos (90 dias)', icone: 'stethoscope', val: num(at.length) }, { rot: 'Ticket médio', icone: 'receipt', val: moeda(soma(at, (c) => c.valor) / (at.length || 1)) }, { rot: 'Pacientes novos (90 dias)', icone: 'user-plus', val: num(a.db.lista('pacientes').filter((p) => diasAte(p.criado) > -90).length) }, { rot: 'Taxa de faltas', icone: 'user-minus', val: pct((ult.filter((c) => c.status === 'faltou').length / (ult.length || 1)) * 100, 1) }])}
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Por profissional</h3><div class="sub">Últimos 90 dias</div></div></div><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Profissional</th><th class="n">Atend.</th><th class="n">Faltas</th><th class="n">Faturado</th></tr></thead><tbody>${a.db.lista('profissionais').map((p) => { const l = ult.filter((c) => c.profissional === p.id); return `<tr><td><span class="flex">${av(p.nome, 'p')}<span><b>${esc(p.nome)}</b><span class="sub">${esc(p.especialidade)}</span></span></span></td><td class="n">${l.filter((c) => c.status === 'atendido').length}</td><td class="n">${l.filter((c) => c.status === 'faltou').length}</td><td class="n">${moeda(soma(l.filter((c) => c.status === 'atendido'), (c) => c.valor))}</td></tr>`; }).join('')}</tbody></table></div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Particular × convênios</h3><div class="sub">Faturamento dos últimos 90 dias</div></div></div><div class="cartao-corpo">${rosca({ itens: [{ rot: 'Particular', v: soma(at.filter((c) => c.tipo === 'particular'), (c) => c.valor), cor: 'var(--acc)' }, ...a.db.lista('convenios').map((cv, i) => ({ rot: cv.nome, v: soma(at.filter((c) => c.convenio === cv.id), (c) => c.valor), cor: ['#94a3b8', '#f59e0b', '#8b5cf6', '#14b8a6'][i % 4] }))], centro: moedaC(soma(at, (c) => c.valor)), fmt: moedaC })}</div></div></div>
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Faturamento por mês</h3></div></div><div class="cartao-corpo">${barras({ dados: meses.map((m) => ({ rot: nomeMes(m), v: [soma(cons(a).filter((c) => c.data.startsWith(m) && c.status === 'atendido'), (c) => c.valor)] })), series: [{ nome: 'Faturado', cor: 'var(--acc)' }], fmt: moedaC, altura: 200 })}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Procedimentos mais feitos</h3></div></div><div class="cartao-corpo">${barrasH(Object.entries(agrupar(at, (c) => c.procedimento)).map(([k, l]) => ({ rot: proc(a, k)?.nome || '—', v: l.length })).sort((x, y) => y.v - x.v).slice(0, 7))}</div></div></div>`;
}

function cadastros(a) {
  const st = a.estado.cad ||= { aba: 'profissionais' };
  const abas = `<div class="abas-pag">${[['profissionais', 'Profissionais', 'stethoscope'], ['procedimentos', 'Procedimentos', 'clipboard-text'], ['convenios', 'Convênios', 'identification-card']].map(([k, n, i]) => `<button type="button" data-acao="abaCad" data-a="${k}" aria-selected="${st.aba === k}">${ic(i)}${n}</button>`).join('')}</div>`;
  const cfgs = { profissionais: [{ k: 'nome', rot: 'Nome', render: (p) => `<span class="flex">${av(p.nome, 'p')}<span><span class="prim">${esc(p.nome)}</span><span class="sub">${esc(p.conselho || '')}</span></span></span>` }, { k: 'especialidade', rot: 'Especialidade' }, { k: 'dias', rot: 'Atende', render: (p) => p.dias.map((d) => DIAS[d]).join(', ') }, { k: 'ini', rot: 'Horário', render: (p) => `${p.ini}–${p.fim}` }],
    procedimentos: [{ k: 'nome', rot: 'Procedimento', render: (p) => `<span class="prim">${esc(p.nome)}</span>` }, { k: 'duracao', rot: 'Duração', n: true, render: (p) => `${p.duracao} min` }, { k: 'preco', rot: 'Particular', n: true, render: (p) => moeda(p.preco) }],
    convenios: [{ k: 'nome', rot: 'Convênio', render: (c) => `<span class="prim">${esc(c.nome)}</span>` }, { k: 'valor_consulta', rot: 'Por consulta', n: true, render: (c) => moeda(c.valor_consulta) }, { k: 'prazo', rot: 'Prazo', n: true, render: (c) => `${c.prazo} dias` }, { k: 'pac', rot: 'Pacientes', n: true, valor: (c) => a.db.lista('pacientes').filter((p) => p.convenio === c.id).length, render: (c) => num(a.db.lista('pacientes').filter((p) => p.convenio === c.id).length) }] };
  return abas + a.tab({ id: `cad-${st.aba}`, colecao: st.aba, singular: colecoes[st.aba].singular, plural: colecoes[st.aba].plural, ordem: 'nome', novo: { rot: `Novo ${colecoes[st.aba].singular}`, attrs: `data-acao="novoCad" data-c="${st.aba}"` }, aoClicar: async (id) => { if (await editar(a, st.aba, a.db.obter(st.aba, id))) a.render(); }, colunas: cfgs[st.aba] });
}

// ---------------------------------------------------------------- documentos
function docReceita(a, ev) {
  const p = pac(a, ev.paciente), pr = prof(a, ev.profissional), cfg = a.db.cfg;
  return `<div class="doc"><div style="text-align:center;border-bottom:2px solid #222;padding-bottom:10px"><h1>${esc(a.empresa)}</h1><div style="color:#555">${esc(cfg.endereco)} · ${esc(cfg.telefone)}</div></div>
    <h2 style="text-align:center;margin:22px 0">${ev.tipo === 'atestado' ? 'ATESTADO' : 'RECEITUÁRIO'}</h2><p><b>Paciente:</b> ${esc(p?.nome || '')}${p?.nascimento ? ` · ${idade(p.nascimento)}` : ''}</p>
    <div style="white-space:pre-wrap;font-size:14px;line-height:1.8;margin:18px 0 60px">${esc(ev.texto)}</div><p>Belo Horizonte, ${dataBR(ev.data)}.</p><div class="ass"><div>${esc(pr?.nome || '')}<br>${esc(pr?.conselho || '')}</div></div></div>`;
}

// ---------------------------------------------------------------- fichas
const fichas = {
  consulta(a, id) {
    const c = a.db.obter('consultas', id); if (!c) return null; const p = pac(a, c.paciente), pr = prof(a, c.profissional);
    const prox = { agendado: ['confirmado', 'Confirmar', 'check'], confirmado: ['chegou', 'Paciente chegou', 'door-open'], chegou: ['atendimento', 'Chamar para o consultório', 'play'] }[c.status];
    return { estreita: true, html: ficha({ tipo: 'Consulta', icone: 'calendar-check', titulo: esc(p?.nome || '—'), avatar: av(p?.nome || '?', 'gg'), sub: `${etC(c)}<span>${dataCurta(c.data)}, ${c.ini}–${fimDe(c)}</span>`,
      extra: `<div class="flex" style="margin-top:12px;flex-wrap:wrap">${prox ? `<button type="button" class="btn pri" data-acao="stCons" data-id="${id}" data-s="${prox[0]}">${ic(prox[2])}${prox[1]}</button>` : ''}${c.status === 'atendimento' ? `<button type="button" class="btn pri ok" data-acao="finalizar" data-id="${id}">${ic('check')}Finalizar e evoluir</button>` : ''}${c.status === 'atendido' && c.tipo === 'particular' && !c.pago ? `<button type="button" class="btn pri ok" data-acao="receber" data-id="${id}">${ic('currency-circle-dollar')}Receber ${moeda(c.valor)}</button>` : ''}${['agendado', 'confirmado'].includes(c.status) ? `<button type="button" class="btn" data-acao="remarcar" data-id="${id}">${ic('calendar-blank')}Remarcar</button><button type="button" class="btn" data-acao="stCons" data-id="${id}" data-s="faltou">${ic('user-minus')}Faltou</button>` : ''}${p?.telefone ? `<a class="btn" target="_blank" rel="noopener" href="${telLink(p.telefone)}">${ic('whatsapp-logo')}WhatsApp</a>` : ''}</div>`,
      corpo: `<div class="gav-sec">${props([['stethoscope', 'Profissional', `${esc(pr?.nome || '')} · ${esc(pr?.especialidade || '')}`], ['clipboard-text', 'Procedimento', esc(proc(a, c.procedimento)?.nome || '')], ['identification-card', 'Atendimento', c.tipo === 'convenio' ? `${esc(conv(a, c.convenio)?.nome || '')} · guia ${GUIA[c.guia || 'pendente'][0].toLowerCase()}` : 'Particular'], ['currency-circle-dollar', 'Valor', `${moeda(c.valor)}${c.tipo === 'particular' ? (c.pago ? ` · ${et(`Recebido (${c.forma})`, 'ok')}` : '') : ''}`], ['warning', 'Alergias', p?.alergias ? `<span class="er-tx">${esc(p.alergias)}</span>` : null], ['user', 'Paciente', `<a href="#" data-abrir="paciente:${p?.id}">Abrir prontuário</a>`]])}</div>
        <div class="gav-sec"><h4>Histórico</h4>${linhaDoTempo(a.db.historico(`consultas:${id}`).map((h) => ({ quando: h.quando, icone: h.icone, tom: h.tom, html: esc(h.texto) })))}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="stCons" data-id="${id}" data-s="cancelado">${ic('x')}Cancelar consulta</button>` }) };
  },
  paciente(a, id, aba = 'pront') {
    const p = pac(a, id); if (!p) return null;
    const cs = cons(a).filter((c) => c.paciente === id).sort((x, y) => (y.data + y.ini).localeCompare(x.data + x.ini)), evs = a.db.lista('evolucoes').filter((e) => e.paciente === id).sort((x, y) => y.data.localeCompare(x.data));
    let corpo = '';
    if (aba === 'pront') corpo = `<div class="gav-sec"><div class="flex" style="flex-wrap:wrap;margin-bottom:12px"><button type="button" class="btn pri peq" data-acao="evoluir" data-id="${id}" data-t="evolucao">${ic('note-pencil')}Evolução</button><button type="button" class="btn peq" data-acao="evoluir" data-id="${id}" data-t="receita">${ic('pill')}Receita</button><button type="button" class="btn peq" data-acao="evoluir" data-id="${id}" data-t="atestado">${ic('file-text')}Atestado</button><button type="button" class="btn peq" data-acao="evoluir" data-id="${id}" data-t="exame">${ic('flask')}Pedido de exame</button></div>
      ${evs.length ? linhaDoTempo(evs.map((e) => ({ quando: e.data, icone: { evolucao: 'note-pencil', receita: 'pill', atestado: 'file-text', exame: 'flask', anamnese: 'clipboard-text' }[e.tipo], tom: e.tipo === 'evolucao' ? 'acc' : e.tipo === 'anamnese' ? 'ok' : '', html: `<b>${{ evolucao: 'Evolução', receita: 'Receita', atestado: 'Atestado', exame: 'Pedido de exame', anamnese: 'Ficha de saúde (preenchida pelo paciente)' }[e.tipo]}</b> · ${esc(prof(a, e.profissional)?.nome || '')}<div style="white-space:pre-wrap;margin-top:4px;color:var(--tx-2)">${esc(e.texto)}</div>${!['evolucao', 'anamnese'].includes(e.tipo) ? `<button type="button" class="btn fant peq" style="margin-top:6px" data-acao="imprimirDoc" data-id="${e.id}">${ic('printer')}Imprimir</button>` : ''}` }))) : vazio('note-pencil', 'Prontuário vazio', 'Registre a primeira evolução após a consulta.')}</div>`;
    if (aba === 'cons') corpo = `<div class="gav-sec">${cs.length ? `<ul class="lista" style="margin:0 -20px">${cs.slice(0, 30).map((c) => `<li class="clicavel" data-abrir="consulta:${c.id}"><div class="cresce"><div class="t">${dataCurta(c.data)}, ${c.ini} · ${esc(proc(a, c.procedimento)?.nome || '')}</div><div class="s">${esc(prof(a, c.profissional)?.nome || '')}</div></div>${etC(c)}</li>`).join('')}</ul>` : vazio('calendar-blank', 'Nenhuma consulta')}</div>`;
    if (aba === 'odonto') { const dn = p.dentes || {}; corpo = `<div class="gav-sec"><h4>Odontograma</h4><p class="mute" style="font-size:12.5px;margin-bottom:10px">Clique no dente para mudar a situação.</p>${DENTES.map((l) => `<div class="odonto">${l.map((n) => { const st = DENTE_ST.find((x) => x[0] === (dn[n] || '')) || DENTE_ST[0]; return `<button type="button" class="dente" style="--d:${st[2]}" data-acao="dente" data-id="${id}" data-n="${n}" title="${n} · ${st[1]}"><span>${n}</span></button>`; }).join('')}</div>`).join('')}
      <div class="flex mute" style="flex-wrap:wrap;gap:10px;font-size:12px;margin-top:12px">${DENTE_ST.map(([, nm, c]) => `<span class="flex" style="gap:5px"><i style="width:11px;height:11px;border-radius:3px;border:1px solid var(--borda);background:${c}"></i>${nm}</span>`).join('')}</div></div>${a.anexos.html('pacientes', id, { titulo: 'Radiografias e fotos', dica: 'Radiografias, fotos intraorais e exames em PDF' })}`; }
    if (aba === 'anexos') corpo = a.anexos.html('pacientes', id, { titulo: 'Exames e documentos', dica: 'Exames, laudos e fotos do paciente (só a equipe vê)' });
    if (aba === 'dados') corpo = `<div class="gav-sec">${props([['cake', 'Nascimento', p.nascimento ? `${dataBR(p.nascimento)} · ${idade(p.nascimento)}` : null], ['identification-card', 'CPF', `<span class="mono">${esc(p.cpf || '—')}</span>`], ['phone', 'WhatsApp', p.telefone ? `${esc(p.telefone)} · <a href="${telLink(p.telefone)}" target="_blank" rel="noopener">abrir conversa</a>` : null], ['envelope-simple', 'E-mail', esc(p.email || '')], ['first-aid', 'Convênio', p.convenio ? `${esc(conv(a, p.convenio)?.nome || '')} · <span class="mono">${esc(p.carteirinha || '')}</span>` : 'Particular'], ['warning', 'Alergias', p.alergias ? `<span class="er-tx">${esc(p.alergias)}</span>` : 'Nenhuma informada'], ['calendar-plus', 'Paciente desde', dataCurta(p.criado)], ['arrows-clockwise', 'Retorno', p.retorno ? `${dataCurta(p.retorno)} · ${relativo(p.retorno)}` : null], ['clipboard-text', 'Ficha de saúde', p.anamnese_em ? `preenchida em ${dataCurta(p.anamnese_em)}` : 'ainda não preenchida'], ['list-checks', 'Atendimentos', String(cons(a).filter((c) => c.paciente === id && c.status === 'atendido').length)]])}</div>`;
    return { html: ficha({ tipo: 'Paciente', icone: 'user', titulo: esc(p.nome), avatar: av(p.nome, 'gg'), sub: `<span>${idade(p.nascimento)}</span>${p.convenio ? et(conv(a, p.convenio)?.nome || '', 'info', 'sem-ponto') : et('Particular', '', 'sem-ponto')}${p.alergias ? et(`Alergia: ${p.alergias}`, 'er') : ''}`,
      extra: `<div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn pri" data-acao="novaConsulta" data-p="${id}">${ic('calendar-plus')}Marcar consulta</button><button type="button" class="btn" data-acao="linkFicha" data-id="${id}">${ic('clipboard-text')}Ficha de saúde pelo link</button></div>`,
      aba, abas: [['pront', 'Prontuário', evs.length], ...(ehOdonto(a) ? [['odonto', 'Odontograma']] : [['anexos', 'Exames', (p._anexos || []).length || '']]), ['cons', 'Consultas', cs.length], ['dados', 'Dados']], corpo,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="pacientes" data-id="${id}">${ic('pencil-simple')}Editar</button>` }), montar: (g) => (g.dataset.aba = aba) };
  },
};

// ---------------------------------------------------------------- aplicativo
const app = criarApp({
  id: 'clinica', nome: 'Veltria Clínica', sub: 'Clínicas e consultórios', cor: '#0e7490', icone: 'stethoscope', empresa: 'Clínica Vitta', conta: 'Multiespecialidades · Belo Horizonte',
  produto: { mensal: 109 }, semente, colecoes, fichas, buscaDica: 'pacientes e consultas',
  portal: {
    anamnese: {
      explica: 'O paciente preenche a ficha de saúde e aceita o termo pelo celular antes da consulta. As respostas entram no prontuário.',
      montar: (a, id) => {
        const p = pac(a, id); if (!p) return null;
        const c = cons(a).filter((x) => x.paciente === id && x.data >= hoje() && !['cancelado', 'faltou'].includes(x.status)).sort((x, y) => (x.data + x.ini).localeCompare(y.data + y.ini))[0];
        return { paciente: p.nome, consulta: c ? `${dataBR(c.data)} às ${c.ini} com ${prof(a, c.profissional)?.nome || ''}` : '', perguntas: perguntasDe(a), termo: a.db.cfg.termo || TERMO, respondido: !!p.anamnese_link_ok };
      },
      responder: (a, r) => {
        const p = pac(a, r.ref); if (!p || r.acao !== 'anamnese') return '';
        const resp = r.dados.respostas || {}, qs = perguntasDe(a);
        const texto = qs.filter((q) => resp[q.id]).map((q) => `${q.rot}\n→ ${String(resp[q.id]).slice(0, 600)}`).join('\n\n') + (r.dados.aceite ? `\n\nTermo aceito por ${String(r.dados.aceite).slice(0, 120)} em ${dataBR(hoje())}.` : '');
        a.db.salvar('evolucoes', { paciente: p.id, data: hoje(), tipo: 'anamnese', texto, profissional: null });
        const al = String(resp.alergias || '').trim();
        a.db.salvar('pacientes', { id: p.id, anamnese_em: hoje(), anamnese_link_ok: true, ...(al && !/^(n[aã]o|nenhum|nenhuma|-)$/i.test(al) ? { alergias: al.slice(0, 120) } : {}) });
        return `${p.nome.split(' ')[0]} preencheu a ficha de saúde pelo link${al && !/^(n[aã]o|nenhum)/i.test(al) ? ` · alergia: ${al}` : ''}`;
      },
    },
  },
  modelos: [
    { id: 'medica', nome: 'Clínica médica', desc: 'Consultas, retornos e exames', dados: { procedimentos: [['Consulta', 300, 30], ['Retorno', 0, 20], ['Atestado de saúde ocupacional', 120, 20]].map(([nome, preco, duracao]) => ({ nome, preco, duracao })) } },
    { id: 'odonto', nome: 'Odontologia', desc: 'Odontograma, avaliação, limpeza, restauração e canal', dados: { procedimentos: [['Avaliação odontológica', 120, 30], ['Limpeza (profilaxia)', 220, 40], ['Restauração em resina', 280, 40], ['Tratamento de canal', 900, 60], ['Extração simples', 300, 40], ['Clareamento a laser', 1200, 60]].map(([nome, preco, duracao]) => ({ nome, preco, duracao })) } },
    { id: 'psicologia', nome: 'Psicologia', desc: 'Sessões de 50 minutos e avaliação', dados: { procedimentos: [['Sessão de psicoterapia', 200, 50], ['Avaliação psicológica', 350, 60], ['Sessão de casal', 280, 60]].map(([nome, preco, duracao]) => ({ nome, preco, duracao })) } },
    { id: 'fisioterapia', nome: 'Fisioterapia', desc: 'Sessões, RPG e pilates clínico', dados: { procedimentos: [['Avaliação fisioterapêutica', 180, 50], ['Sessão de fisioterapia', 120, 50], ['RPG', 160, 50], ['Pilates clínico', 140, 50]].map(([nome, preco, duracao]) => ({ nome, preco, duracao })) } },
    { id: 'estetica', nome: 'Estética e dermatologia', desc: 'Procedimentos estéticos e retornos', dados: { procedimentos: [['Limpeza de pele', 220, 60], ['Aplicação de toxina botulínica', 1100, 30], ['Preenchimento com ácido hialurônico', 1600, 45], ['Peeling químico', 380, 40]].map(([nome, preco, duracao]) => ({ nome, preco, duracao })) } },
  ],
  passos: (a) => [{ id: 'ficha', rot: 'Mande a ficha de saúde para um paciente', feito: Object.keys(a.db.cfg.links || {}).some((k) => k.startsWith('anamnese:')) }, { id: 'prof', rot: 'Cadastre os profissionais e os horários', feito: a.db.lista('profissionais').length > 0, href: '#/cadastros' }],
  equipe: [['Dra. Helena Prado', 'Diretora clínica'], ['Patrícia Gomes', 'Recepção'], ['Dr. Marcos Tavares', 'Médico'], ['Dra. Lívia Andrade', 'Médica'], ['Rafael Couto', 'Nutricionista']],
  busca: [{ colecao: 'pacientes', grupo: 'Pacientes', icone: 'user', ficha: 'paciente', rot: (p) => p.nome, sub: (p) => p.telefone }],
  comandos: [{ rot: 'Nova consulta', icone: 'calendar-plus', acao: (a) => marcar(a) }, { rot: 'Novo paciente', icone: 'user-plus', acao: (a) => a.acoes.novoCad({ c: 'pacientes' }) }],
  paginas: [
    { id: 'painel', lado: FERR.painel, rot: 'Painel', icone: 'house', titulo: 'Visão geral', render: painel, atalho: 'i' },
    { id: 'agenda', rot: 'Agenda', icone: 'calendar-blank', render: agenda, cheio: true, atalho: 'a', novo: (a) => marcar(a) },
    { id: 'recepcao', lado: FERR.agenda, rot: 'Recepção', icone: 'door-open', titulo: 'Recepção e sala de espera', render: recepcao, atalho: 'r', cont: (a) => cons(a).filter((c) => c.data === hoje() && c.status === 'chegou').length },
    { id: 'pacientes', lado: FERR.pacientes, rot: 'Pacientes e prontuários', icone: 'users', render: pacientesPag, atalho: 'p', novo: (a) => a.acoes.novoCad({ c: 'pacientes' }) },
    { grupo: 'Financeiro' },
    { id: 'caixa', lado: FERR.caixa, rot: 'Caixa (particular)', icone: 'cash-register', render: caixa, cont: (a) => { const n = cons(a).filter((c) => c.tipo === 'particular' && c.status === 'atendido' && !c.pago).length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'convenios', rot: 'Faturamento de convênios', icone: 'identification-card', render: faturamento, cont: (a) => cons(a).filter((c) => c.guia === 'pendente').length },
    { id: 'relatorios', rot: 'Relatórios', icone: 'chart-bar', render: relatorios },
    { grupo: 'Cadastros' },
    { id: 'cadastros', rot: 'Profissionais e tabelas', icone: 'list-checks', render: cadastros },
    ...ferramentaPaginas(FERR, FERR_ITENS),
  ],
});

const reab = () => { app.render(); app.reabrir(); };
const MODELOS = { evolucao: 'S: \nO: \nA: \nP: ', receita: '', atestado: 'Atesto, para os devidos fins, que o(a) paciente esteve sob meus cuidados nesta data, necessitando de ___ dia(s) de afastamento de suas atividades.', exame: 'Solicito:\n- Hemograma completo\n- ' };
Object.assign(app.acoes, {
  novaConsulta: (d = {}) => marcar(app, d.p ? { paciente: d.p } : {}),
  remarcar: (d) => marcar(app, app.db.obter('consultas', d.id)),
  diaAg: (d) => { const st = app.estado.ag; st.data = d.d === '0' ? hoje() : diaMais(Number(d.d), st.data); app.render(); },
  dataAg: (d, el) => { app.estado.ag.data = el.value || hoje(); app.render(); },
  stCons: async (d) => {
    const c = app.db.obter('consultas', d.id);
    if (d.s === 'cancelado' && !(await confirmar('Cancelar esta consulta? O horário fica livre na agenda.', { rotulo: 'Cancelar consulta', perigo: true }))) return;
    app.db.salvar('consultas', { id: d.id, status: d.s, ...(d.s === 'chegou' ? { chegada: new Date().toTimeString().slice(0, 5) } : {}) });
    app.db.registrar(`consultas:${d.id}`, STATUS[d.s][0], { icone: 'arrow-right', tom: 'acc' });
    avisar(`${pac(app, c.paciente)?.nome.split(' ')[0]}: ${STATUS[d.s][0].toLowerCase()}`, { desfazer: () => { app.db.salvar('consultas', { id: d.id, status: c.status }); reab(); } }); reab();
  },
  finalizar: async (d) => { const c = app.db.obter('consultas', d.id); app.db.salvar('consultas', { id: d.id, status: 'atendido', ...(c.tipo === 'convenio' ? { guia: 'pendente' } : {}) }); app.db.registrar(`consultas:${d.id}`, 'Atendimento finalizado', { icone: 'check', tom: 'ok' }); await app.acoes.evoluir({ id: c.paciente, t: 'evolucao', c: d.id }); reab(); },
  evoluir: async (d) => {
    const nomes = { evolucao: 'Evolução', receita: 'Receita', atestado: 'Atestado', exame: 'Pedido de exame' };
    const r = await modal({ titulo: `${nomes[d.t]} · ${pac(app, d.id).nome}`, largura: 620, corpo: `<label class="campo">Profissional<select data-pr>${app.db.lista('profissionais').map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select></label><label class="campo" style="margin-top:10px">Texto<textarea data-tx style="min-height:180px;font-family:var(--mono, monospace)">${esc(MODELOS[d.t])}</textarea></label>${d.t === 'evolucao' ? `<label class="campo" style="margin-top:10px">Retorno<select data-ret><option value="">Sem retorno</option>${[[7, '7 dias'], [15, '15 dias'], [30, '30 dias'], [60, '2 meses'], [90, '3 meses'], [180, '6 meses'], [365, '1 ano']].map(([n, t]) => `<option value="${n}">Em ${t}</option>`).join('')}</select></label>` : ''}`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Salvar no prontuário', classe: 'pri', acao: (f) => { const t = f.querySelector('[data-tx]').value.trim(); if (!t) return false; return { texto: t, profissional: f.querySelector('[data-pr]').value, ret: f.querySelector('[data-ret]')?.value || '' }; } }] });
    if (!r) return; const ret = r.ret; delete r.ret; if (ret) app.db.salvar('pacientes', { id: d.id, retorno: diaMais(Number(ret)) });
    const ev = app.db.salvar('evolucoes', { paciente: d.id, consulta: d.c || null, data: hoje(), tipo: d.t, ...r }); avisar(`${nomes[d.t]} salva no prontuário`); if (d.t !== 'evolucao') imprimir(docReceita(app, ev)); reab();
  },
  linkFicha: (d) => { const p = pac(app, d.id); app.db.salvar('pacientes', { id: d.id, anamnese_link_ok: false }); app.portal.compartilhar('anamnese', d.id, { titulo: `Ficha de saúde · ${p.nome}`, telefone: p.telefone, texto: `Olá, ${p.nome.split(' ')[0]}! Antes da sua consulta na ${app.empresa}, preencha a sua ficha de saúde (leva 2 minutos):` }); },
  dente: (d) => { const p = pac(app, d.id), dn = { ...(p.dentes || {}) }; const i = DENTE_ST.findIndex((x) => x[0] === (dn[d.n] || '')); const prox = DENTE_ST[(i + 1) % DENTE_ST.length][0]; if (prox) dn[d.n] = prox; else delete dn[d.n]; app.db.salvar('pacientes', { id: d.id, dentes: dn }); app.reabrir(); },
  imprimirDoc: (d) => imprimir(docReceita(app, app.db.obter('evolucoes', d.id))),
  receber: async (d) => { const c = app.db.obter('consultas', d.id); const r = await modal({ titulo: `Receber ${moeda(c.valor)}`, largura: 400, corpo: `<label class="campo">Forma de pagamento<select data-f>${FORMAS.map((f) => `<option>${f}</option>`).join('')}</select></label>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Confirmar', classe: 'pri ok', acao: (f) => f.querySelector('[data-f]').value }] }); if (!r) return; app.db.salvar('consultas', { id: d.id, pago: true, forma: r }); app.db.registrar(`consultas:${d.id}`, `Recebido ${moeda(c.valor)} (${r})`, { icone: 'currency-circle-dollar', tom: 'ok' }); avisar('Pagamento registrado'); reab(); },
  confirmarDia: () => { const l = cons(app).filter((c) => c.data === app.estado.ag.data && c.status === 'agendado'); const c = l[0]; const p = pac(app, c.paciente); window.open(`${telLink(p.telefone)}?text=${encodeURIComponent(`Olá, ${p.nome.split(' ')[0]}! Confirmando sua consulta em ${dataBR(c.data)} às ${c.ini} na ${app.empresa}. Responda SIM para confirmar.`)}`, '_blank', 'noopener'); app.db.salvar('consultas', { id: c.id, status: 'confirmado' }); avisar(`Mensagem aberta para ${p.nome.split(' ')[0]} · faltam ${l.length - 1}`); app.render(); },
  confirmarAmanha: () => { const l = cons(app).filter((c) => c.data === diaMais(1) && c.status === 'agendado'); l.forEach((c) => app.db.salvar('consultas', { id: c.id, status: 'confirmado' })); avisar(`${l.length} consultas confirmadas`); app.render(); },
  enviarLote: (d) => { const l = cons(app).filter((c) => c.convenio === d.cv && c.guia === 'pendente'); l.forEach((c) => app.db.salvar('consultas', { id: c.id, guia: 'enviada' })); avisar(`Lote de ${l.length} guias fechado para ${conv(app, d.cv).nome} (${moeda(soma(l, (c) => c.valor))})`); app.render(); },
  fatConv: (d, el) => { app.estado.fat.conv = el.value; app.render(); },
  abaCad: (d) => { app.estado.cad.aba = d.a; app.render(); },
  novoCad: async (d) => { if (await editar(app, d.c)) app.render(); },
  editarCad: async (d) => { if (await editar(app, d.c, app.db.obter(d.c, d.id))) reab(); },
});

// ferramentas do painel ao lado das telas (WhatsApp e copiar)
Object.assign(app.acoes, acoesLado());
app.travarLado = travarPro;   // avisos e mensagens prontas: plano Pro (calculadoras: Básico)
