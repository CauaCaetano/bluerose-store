// Veltria Financeiro Essencial · núcleo financeiro (sem tela): regras, cálculos, migração e importação.
// Testado em tools/testes-financeiro/essencial.test.mjs (node --test).
//
// Regras do dinheiro (formato 2):
// - todo valor é centavo inteiro (campo c); nada de conta com número quebrado;
// - o extrato (movs) é a fonte da verdade: o saldo de cada pote é a soma dos movimentos, nunca um número guardado à parte;
// - cada entrada guarda a divisão feita na hora (div), então mudar as porcentagens depois não mexe no passado;
// - a divisão sempre fecha no centavo (maior resto) e só existe com porcentagens que somam exatamente 100;
// - transferência entre potes, pagamento de conta e acerto de saldo também são movimentos do extrato;
// - datas são dias relativos a hoje (dia: -3 = três dias atrás); a conta na nuvem anda com eles a cada dia.

import { centavos, reais, hojeISO, dataDe, isoDe, diaDe, compDe, lerExtrato, norm, DIA_MS } from '../financeiro-comum/dinheiro.js';
export { centavos, reais, hojeISO, dataDe, isoDe, diaDe, compDe, lerExtrato };

export const FORMATO = 2;
export const LIMITE_MEI = 8100000; // R$ 81.000,00 por ano (limite vigente em 2026)

// ------------------------------------------------------------------ dinheiro (centavos e datas vêm de ../financeiro-comum/dinheiro.js)
/** Divide c centavos pelas porcentagens dos potes; a soma das partes é sempre exatamente c. */
export function dividir(c, potes) {
  if (!Number.isInteger(c) || c <= 0) throw new Error('Valor inválido para dividir.');
  const v = validarPcts(potes); if (v) throw new Error(v);
  const partes = potes.map((p) => { const bruto = c * p.pct; return { k: p.k, c: Math.floor(bruto / 100), resto: bruto % 100 }; });
  let falta = c - partes.reduce((s, p) => s + p.c, 0);
  [...partes].sort((a, b) => b.resto - a.resto).forEach((p) => { if (falta > 0 && p.resto > 0) { p.c++; falta--; } });
  return Object.fromEntries(partes.filter((p) => p.c).map((p) => [p.k, p.c]));
}
/** Devolve a mensagem de erro, ou '' se a divisão dos potes é válida. */
export function validarPcts(potes) {
  if (!potes?.length) return 'Crie pelo menos um pote.';
  if (potes.some((p) => !Number.isInteger(p.pct) || p.pct < 0 || p.pct > 100)) return 'Use porcentagens inteiras entre 0 e 100.';
  const soma = potes.reduce((s, p) => s + p.pct, 0);
  return soma === 100 ? '' : `A divisão soma ${soma}%. Ela precisa dar exatamente 100%.`;
}

// ------------------------------------------------------------------ saldos (sempre calculados do extrato)
/** Efeito de um movimento em cada pote, em centavos. */
export function efeito(m) {
  if (m.tipo === 'entra') return { ...(m.div || {}) };
  if (m.tipo === 'sai') return { [m.pote]: -m.c };
  if (m.tipo === 'transf') return { [m.de]: -m.c, [m.para]: m.c };
  if (m.tipo === 'ajuste') return { [m.pote]: m.sinal < 0 ? -m.c : m.c };
  return {};
}
export function saldos(db) {
  const s = Object.fromEntries(db.potes.map((p) => [p.k, 0]));
  db.movs.forEach((m) => Object.entries(efeito(m)).forEach(([k, v]) => { s[k] = (s[k] || 0) + v; }));
  return s;
}
export const total = (db) => Object.values(saldos(db)).reduce((a, b) => a + b, 0);



// ------------------------------------------------------------------ operações (validam antes de gravar)
const novoId = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
function exigeValor(c) { if (!Number.isInteger(c) || c <= 0) throw new Error('Digite um valor maior que zero.'); }
function exigePote(db, k) { if (!db.potes.some((p) => p.k === k)) throw new Error('Escolha um pote válido.'); }
function registra(db, oque, dia = 0) { (db.historico ||= []).unshift({ dia, quando: new Date().toISOString(), oque }); db.historico.length > 300 && (db.historico.length = 300); }

/**
 * Lança um movimento. chave: identifica a operação (o mesmo toque duas vezes não lança duas vezes).
 * entra: { c, desc, dia, receita, cob? }  sai: { c, desc, dia, pote, cat?, conta?, fixa?, comp? }
 * transf: { c, de, para, dia }  ajuste: { c, pote, sinal, desc }
 */
export function lancar(db, tipo, dados, chave) {
  if (chave && db.movs.some((m) => m.chave === chave)) return null; // já lançado
  const c = dados.c; exigeValor(c);
  const m = { id: novoId(), tipo, c, desc: String(dados.desc || '').trim().slice(0, 120), dia: Number.isInteger(dados.dia) ? dados.dia : 0, criado: new Date().toISOString(), origem: dados.origem || 'app' };
  if (chave) m.chave = chave;
  if (tipo === 'entra') { m.div = dividir(c, db.potes); m.receita = dados.receita !== false; if (dados.cob) m.cob = dados.cob; if (dados.cli) m.cli = String(dados.cli).slice(0, 80); m.desc ||= 'Entrada'; }
  else if (tipo === 'sai') { exigePote(db, dados.pote); m.pote = dados.pote; m.cat = dados.cat || categoriaSugerida(m.desc) || 'Outros'; ['conta', 'fixa', 'comp'].forEach((k) => dados[k] && (m[k] = dados[k])); m.desc ||= 'Saída'; }
  else if (tipo === 'transf') { exigePote(db, dados.de); exigePote(db, dados.para); if (dados.de === dados.para) throw new Error('Escolha potes diferentes.'); m.de = dados.de; m.para = dados.para; m.desc ||= 'Passou entre potes'; }
  else if (tipo === 'ajuste') { exigePote(db, dados.pote); m.pote = dados.pote; m.sinal = dados.sinal < 0 ? -1 : 1; m.desc ||= 'Acerto de saldo'; }
  else throw new Error('Tipo de movimento desconhecido.');
  if (dados.imp) m.imp = dados.imp;
  db.movs.push(m);
  registra(db, `Lançou ${tipo === 'entra' ? 'entrada' : tipo === 'sai' ? 'saída' : tipo === 'transf' ? 'transferência' : 'acerto'} de ${reais(c)}${m.desc ? ` (${m.desc})` : ''}`, m.dia);
  return m;
}

/** Edita um movimento. Na entrada, a nova divisão usa as mesmas proporções da original (o passado não muda de regra). */
export function editar(db, id, mud) {
  const m = db.movs.find((x) => x.id === id); if (!m) throw new Error('Movimento não encontrado.');
  const novo = { ...m, ...mud };
  exigeValor(novo.c);
  if (m.tipo === 'entra' && novo.c !== m.c) novo.div = redividir(m.div, novo.c);
  if (m.tipo === 'sai') exigePote(db, novo.pote);
  if (m.tipo === 'transf') { exigePote(db, novo.de); exigePote(db, novo.para); if (novo.de === novo.para) throw new Error('Escolha potes diferentes.'); }
  novo.editado = new Date().toISOString();
  Object.assign(m, novo);
  registra(db, `Editou movimento: ${m.desc} · ${reais(m.c)}`);
  return m;
}
/** Mantém as proporções de uma divisão antiga para um novo total, fechando no centavo. */
export function redividir(div, c) {
  const tot = Object.values(div || {}).reduce((a, b) => a + b, 0);
  if (!tot) throw new Error('Esta entrada não tem divisão registrada.');
  const pseudo = Object.entries(div).map(([k, v]) => ({ k, num: c * v, c: Math.floor((c * v) / tot), resto: (c * v) % tot }));
  let falta = c - pseudo.reduce((s, p) => s + p.c, 0);
  [...pseudo].sort((a, b) => b.resto - a.resto).forEach((p) => { if (falta > 0) { p.c++; falta--; } });
  return Object.fromEntries(pseudo.filter((p) => p.c).map((p) => [p.k, p.c]));
}
export function apagar(db, id) {
  const i = db.movs.findIndex((x) => x.id === id); if (i < 0) throw new Error('Movimento não encontrado.');
  const [m] = db.movs.splice(i, 1);
  registra(db, `Apagou movimento: ${m.desc} · ${reais(m.c)}`);
  return m;
}

// ------------------------------------------------------------------ contas e cobranças (pago/recebido sai do extrato)
export const recebido = (db, cob) => db.movs.filter((m) => m.tipo === 'entra' && m.cob === cob.id).reduce((s, m) => s + m.c, 0);
export const pagoConta = (db, conta) => db.movs.filter((m) => m.tipo === 'sai' && m.conta === conta.id).reduce((s, m) => s + m.c, 0);
export const pagoFixa = (db, fixa, comp) => fixa.pagaAntes === comp ? fixa.c : db.movs.filter((m) => m.tipo === 'sai' && m.fixa === fixa.id && m.comp === comp).reduce((s, m) => s + m.c, 0);

// Frequência da conta fixa: mensal (padrão, no dia do mês), semanal (num dia da semana) ou anual (dia e mês).
// "comp" é a chave do período pago: AAAA-MM (mensal), AAAA (anual) ou AAAA-MM-DD da segunda-feira (semanal).
export const FREQS = { mensal: 'todo mês', semanal: 'toda semana', anual: 'todo ano' };
export const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const meioDia = (d) => { const x = new Date(d); x.setHours(12, 0, 0, 0); return x; };
const ultDia = (a, m) => new Date(a, m + 1, 0).getDate();
const dm = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
/** Período da conta fixa que contém a data (desloc −1 = o anterior, 1 = o seguinte), com o vencimento dentro dele. */
export function periodoFixa(f, agora = new Date(), desloc = 0) {
  const h = meioDia(agora), freq = f.freq || 'mensal';
  if (freq === 'semanal') {
    const ini = new Date(h); ini.setDate(h.getDate() - ((h.getDay() + 6) % 7) + 7 * desloc);
    const vence = new Date(ini); vence.setDate(ini.getDate() + (((f.dow ?? 1) + 6) % 7)); const fim = new Date(ini); fim.setDate(ini.getDate() + 6);
    return { comp: hojeISO(ini), vence, fim, rot: `semana de ${dm(ini)}` };
  }
  if (freq === 'anual') { const a = h.getFullYear() + desloc, m = Math.min(11, Math.max(0, (Number(f.mes) || 1) - 1)); return { comp: String(a), vence: new Date(a, m, Math.min(f.dia, ultDia(a, m)), 12), fim: new Date(a, 11, 31, 12), rot: String(a) }; }
  const b = new Date(h.getFullYear(), h.getMonth() + desloc, 1, 12), a = b.getFullYear(), m = b.getMonth();
  return { comp: hojeISO(b).slice(0, 7), vence: new Date(a, m, Math.min(f.dia, ultDia(a, m)), 12), fim: new Date(a, m, ultDia(a, m), 12), rot: `${String(m + 1).padStart(2, '0')}/${a}` };
}
/** Nome do período pela chave (para a descrição do pagamento). */
export function rotuloComp(f, comp) {
  if ((f.freq || 'mensal') === 'semanal') return `semana de ${comp.slice(8)}/${comp.slice(5, 7)}`;
  if (f.freq === 'anual') return comp;
  return `${comp.slice(5)}/${comp.slice(0, 4)}`;
}
/** Como a conta se repete, em palavras. */
export function descFreq(f) {
  if (f.freq === 'semanal') return `toda ${DIAS_SEMANA[f.dow ?? 1]}`;
  if (f.freq === 'anual') return `todo ano em ${String(f.dia).padStart(2, '0')}/${String(f.mes || 1).padStart(2, '0')}`;
  return `todo dia ${f.dia}`;
}
// o período conta a partir de quando a conta foi criada: mensal pelo mês (como sempre foi); semanal e anual pelo vencimento
const desdeISO = (f) => (!f.desde ? '' : f.desde.length === 7 ? `${f.desde}-01` : f.desde);
const valePeriodo = (f, p) => !desdeISO(f) || hojeISO((f.freq || 'mensal') === 'mensal' ? p.fim : p.vence) >= desdeISO(f);
const NOME_ANT = { mensal: 'mês passado', semanal: 'semana passada', anual: 'ano passado' }, DO_ANT = { mensal: 'do mês passado', semanal: 'da semana passada', anual: 'do ano passado' };

/** Situação de uma cobrança: recebida, cancelada, atrasada, vence hoje ou aberta. */
export function situacaoCob(db, cob) {
  const r = recebido(db, cob), falta = Math.max(0, cob.c - r);
  if (cob.status === 'cancelada') return { st: 'cancelada', r, falta: 0 };
  if (cob.recebidaAntes) return { st: 'recebida', r: cob.c, falta: 0, foraDoExtrato: true }; // recebida antes da atualização, sem entrada no extrato
  if (falta === 0) return { st: 'recebida', r, falta };
  return { st: cob.vence < 0 ? 'atrasada' : cob.vence === 0 ? 'hoje' : 'aberta', r, falta, parcial: r > 0 };
}
export function situacaoConta(db, conta) {
  const p = pagoConta(db, conta), falta = Math.max(0, conta.c - p);
  if (conta.status === 'cancelada') return { st: 'cancelada', p, falta: 0 };
  if (falta === 0) return { st: 'paga', p, falta };
  return { st: conta.vence < 0 ? 'atrasada' : conta.vence === 0 ? 'hoje' : 'aberta', p, falta, parcial: p > 0 };
}
/** Conta fixa no período atual (mês, semana ou ano). Nunca cobra período anterior à criação da conta. */
export function situacaoFixa(db, fixa, agora = new Date()) {
  let p0 = periodoFixa(fixa, agora); const pa = periodoFixa(fixa, agora, -1);
  if (!valePeriodo(fixa, p0)) p0 = periodoFixa(fixa, agora, 1); // criada depois do vencimento deste período: o próximo é o que vale
  const venceEm = Math.round((p0.vence - meioDia(agora)) / DIA_MS), p = pagoFixa(db, fixa, p0.comp), falta = Math.max(0, fixa.c - p);
  const antAberta = fixa.ativa !== false && valePeriodo(fixa, pa) && pa.comp !== p0.comp && fixa.c > 0 && pagoFixa(db, fixa, pa.comp) < fixa.c;
  const base = { comp: p0.comp, rot: p0.rot, venceEm, compAnt: pa.comp, rotAnt: NOME_ANT[fixa.freq || 'mensal'] };
  if (fixa.ativa === false) return { ...base, st: 'pausada', falta: 0, antAberta: false };
  const st = falta === 0 ? 'paga' : venceEm < 0 ? 'atrasada' : venceEm === 0 ? 'hoje' : 'aberta';
  return { ...base, st, p, falta, antAberta };
}

export function receber(db, cobId, c, chave) {
  const cob = db.cobrancas.find((x) => x.id === cobId); if (!cob) throw new Error('Cobrança não encontrada.');
  const s = situacaoCob(db, cob);
  if (s.st === 'cancelada' || s.st === 'recebida') throw new Error('Esta cobrança não está em aberto.');
  if (c > s.falta) throw new Error(`O máximo a receber é ${reais(s.falta)}.`);
  return lancar(db, 'entra', { c, desc: `${cob.desc} · ${cob.cli}`, receita: true, cob: cob.id, cli: cob.cli }, chave);
}
export function pagarConta(db, contaId, c, chave) {
  const conta = db.contas.find((x) => x.id === contaId); if (!conta) throw new Error('Conta não encontrada.');
  const s = situacaoConta(db, conta);
  if (s.st === 'cancelada' || s.st === 'paga') throw new Error('Esta conta não está em aberto.');
  return lancar(db, 'sai', { c, desc: conta.desc, pote: conta.pote, cat: conta.cat, conta: conta.id }, chave);
}
export function pagarFixa(db, fixaId, c, agora = new Date(), compAlvo) {
  const f = db.fixas.find((x) => x.id === fixaId); if (!f) throw new Error('Conta fixa não encontrada.');
  const comp = compAlvo || situacaoFixa(db, f, agora).comp;
  // a chave é a conta + o período: pagar duas vezes o mesmo período não lança duas saídas
  return lancar(db, 'sai', { c, desc: `${f.desc} (${rotuloComp(f, comp)})`, pote: f.pote, cat: f.cat || (f.das ? 'Impostos' : 'Contas fixas'), fixa: f.id, comp }, `fixa:${f.id}:${comp}`);
}

// ------------------------------------------------------------------ categorias e relatórios
export const CATEGORIAS = ['Material e produtos', 'Aluguel e espaço', 'Contas fixas', 'Impostos', 'Transporte', 'Alimentação', 'Marketing', 'Equipamentos', 'Retirada (meu salário)', 'Pessoal', 'Outros'];
const PISTAS = [[/salario|retirada|pro.?labore/, 'Retirada (meu salário)'], [/aluguel|condom|\bsala\b/, 'Aluguel e espaço'], [/das\b|imposto|inss|iss\b|darf|simples/, 'Impostos'], [/luz|energia|agua|internet|celular|telefone|contador/, 'Contas fixas'],
  [/uber|99|gasolina|combust|onibus|estacion|pedagio/, 'Transporte'], [/pizza|almoco|lanche|restaurante|mercado|ifood/, 'Alimentação'], [/anuncio|instagram|facebook|google ads|impuls|panfleto/, 'Marketing'],
  [/pigment|lamina|material|produto|insumo|tinta|estoque/, 'Material e produtos'], [/maquina|equipamento|cadeira|notebook|ferramenta/, 'Equipamentos']];
export function categoriaSugerida(desc) { const s = String(desc || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); const p = PISTAS.find(([r]) => r.test(s)); return p ? p[1] : ''; }

/** Entradas, saídas e categorias entre dois dias relativos (inclusive). */
export function resumo(db, de, ate) {
  const ms = db.movs.filter((m) => m.dia >= de && m.dia <= ate);
  const soma = (f) => ms.filter(f).reduce((s, m) => s + m.c, 0);
  const cats = {}; ms.filter((m) => m.tipo === 'sai').forEach((m) => { cats[m.cat || 'Outros'] = (cats[m.cat || 'Outros'] || 0) + m.c; });
  const receita = soma((m) => m.tipo === 'entra' && m.receita !== false), outras = soma((m) => m.tipo === 'entra' && m.receita === false), saidas = soma((m) => m.tipo === 'sai');
  return { receita, outras, entradas: receita + outras, saidas, resultado: receita + outras - saidas, cats: Object.entries(cats).sort((a, b) => b[1] - a[1]), qtd: ms.length };
}
/** Período em dias relativos: 'mes' (mês do calendário), 'mespassado', '30', '90', 'ano'. */
export function periodo(nome, agora = new Date()) {
  const h = new Date(agora); h.setHours(12, 0, 0, 0); const d = (x) => Math.round((x - h) / DIA_MS);
  if (nome === 'mes') return [d(new Date(h.getFullYear(), h.getMonth(), 1, 12)), 0];
  if (nome === 'mespassado') return [d(new Date(h.getFullYear(), h.getMonth() - 1, 1, 12)), d(new Date(h.getFullYear(), h.getMonth(), 0, 12))];
  if (nome === 'ano') return [d(new Date(h.getFullYear(), 0, 1, 12)), 0];
  return [-(Number(nome) - 1 || 29), 0];
}
/** Faturamento do MEI no ano do calendário: o informado antes de usar o app + as entradas marcadas como receita. */
export function faturamentoAno(db, agora = new Date()) {
  const [de] = periodo('ano', agora), ano = agora.getFullYear();
  const app = db.movs.filter((m) => m.tipo === 'entra' && m.receita !== false && m.dia >= de && m.dia <= 0).reduce((s, m) => s + m.c, 0);
  const antes = db.fatInicial && db.fatInicial.ano === ano ? db.fatInicial.c : 0;
  return { antes, app, total: antes + app };
}
/** O que deve entrar e sair nos próximos n dias (previsto), separado do saldo de hoje (realizado). */
export function projecao(db, n = 30, agora = new Date()) {
  const itens = [];
  db.cobrancas.forEach((x) => { const s = situacaoCob(db, x); if (s.falta > 0 && x.vence <= n) itens.push({ dia: Math.max(0, x.vence), c: s.falta, sinal: 1, desc: `${x.cli} · ${x.desc}`, atrasada: x.vence < 0 }); });
  db.contas.forEach((x) => { const s = situacaoConta(db, x); if (s.falta > 0 && x.vence <= n) itens.push({ dia: Math.max(0, x.vence), c: s.falta, sinal: -1, desc: x.desc, atrasada: x.vence < 0 }); });
  db.fixas.filter((f) => f.ativa !== false && f.c > 0).forEach((f) => {
    for (let k = 0; k < 60; k++) {
      const p = periodoFixa(f, agora, k), dia = Math.round((p.vence - meioDia(agora)) / DIA_MS);
      if (dia > n) break; if (!valePeriodo(f, p)) continue;
      const falta = Math.max(0, f.c - pagoFixa(db, f, p.comp));
      if (falta && (dia >= 0 || k === 0)) itens.push({ dia: Math.max(0, dia), c: falta, sinal: -1, desc: f.desc, atrasada: dia < 0 });
    }
  });
  itens.sort((a, b) => a.dia - b.dia);
  const hoje = total(db); let s = hoje, menor = { s: hoje, dia: 0 };
  const linha = itens.map((i) => { s += i.sinal * i.c; if (s < menor.s) menor = { s, dia: i.dia }; return { ...i, saldo: s }; });
  return { hoje, fim: s, entra: itens.filter((i) => i.sinal > 0).reduce((a, i) => a + i.c, 0), sai: itens.filter((i) => i.sinal < 0).reduce((a, i) => a + i.c, 0), itens: linha, menor };
}

// ------------------------------------------------------------------ automações: o que pede atenção agora
/** Lista de pendências calculada dos dados (nada é enviado sozinho: o app mostra, a pessoa decide). */
export function pendencias(db, agora = new Date()) {
  const l = [], antes = Number.isInteger(db.avisoDias) ? db.avisoDias : 3; // antecedência dos avisos de vencimento (dias), configurável
  const pv = validarPcts(db.potes); if (pv) l.push({ tipo: 'erro', id: 'pcts', txt: pv, ir: 'pote/' + db.potes[0]?.k });
  const sd = saldos(db); db.potes.forEach((p) => { if (sd[p.k] < 0) l.push({ tipo: 'erro', id: 'neg:' + p.k, txt: `O pote ${p.nome} está negativo (${reais(sd[p.k])}).`, ir: 'pote/' + p.k }); });
  (db.migracao?.divergencias || []).filter((d) => !d.resolvida).forEach((d) => l.push({ tipo: 'erro', id: 'div:' + d.pote, txt: `Conferir o pote ${d.nome}: antes da atualização ele mostrava ${reais(d.gravado)}, o extrato soma ${reais(d.calculado)}.`, ir: 'conferir' }));
  db.fixas.forEach((f) => { const s = situacaoFixa(db, f, agora); if (f.c <= 0) return;
    if (s.st === 'atrasada') l.push({ tipo: 'atraso', id: 'fixa:' + f.id, txt: `${f.desc} venceu ${-s.venceEm === 1 ? 'ontem' : `há ${-s.venceEm} dias`} e não foi paga.`, ir: 'contas' });
    else if ((s.st === 'hoje' || s.st === 'aberta') && s.venceEm <= antes) l.push({ tipo: 'vence', id: 'fixa:' + f.id, txt: `${f.desc} vence ${s.venceEm === 0 ? 'hoje' : `em ${s.venceEm} dia(s)`}: ${reais(s.falta)}.`, ir: 'contas' });
    if (s.antAberta) l.push({ tipo: 'atraso', id: 'fixa-ant:' + f.id, txt: `${f.desc} ${DO_ANT[f.freq || 'mensal']} ficou sem pagamento registrado.`, ir: 'contas' }); });
  db.contas.forEach((x) => { const s = situacaoConta(db, x); if (s.falta && x.vence <= antes) l.push({ tipo: x.vence < 0 ? 'atraso' : 'vence', id: 'conta:' + x.id, txt: `${x.desc}: ${reais(s.falta)} ${x.vence < 0 ? `atrasada ${-x.vence} dia(s)` : x.vence === 0 ? 'vence hoje' : `vence em ${x.vence} dia(s)`}.`, ir: 'contas' }); });
  db.cobrancas.forEach((x) => { const s = situacaoCob(db, x); if (!s.falta) return; const m = lembreteDoDia(x);
    if (m) l.push({ tipo: 'cobrar', id: 'cob:' + x.id, txt: `Lembrar ${x.cli} de ${reais(s.falta)} (${m}).`, ir: 'receber', cob: x.id }); });
  return l;
}
/** Régua de cobrança: 1 dia antes, no dia e 3 dias depois. Devolve o marco de hoje que ainda não foi lembrado. */
export function lembreteDoDia(cob) {
  const v = cob.vence, marco = v === 1 ? 'vence amanhã' : v === 0 ? 'vence hoje' : v <= -3 && (-v - 3) % 7 === 0 ? `atrasada ${-v} dias` : '';
  return marco && !(cob.avisos || []).includes(0) ? marco : ''; // aviso com dia 0 = já lembrou hoje
}

// ------------------------------------------------------------------ migração do formato 1 (reais soltos, saldo guardado à parte)
/**
 * Converte o formato 1 no 2 sem perder nada. Idempotente: dado já no formato 2 volta igual.
 * As entradas antigas não guardavam a divisão: ela é refeita com as porcentagens que estavam salvas (marcada divEstimada).
 * Se o saldo calculado do extrato não bater com o saldo que estava guardado, nada é inventado: a diferença fica
 * em migracao.divergencias para a pessoa conferir e decidir (o app mostra isso como pendência).
 */
export function migrar(antigo, agora = new Date()) {
  if (!antigo || typeof antigo !== 'object') throw new Error('Dados ilegíveis.');
  if (antigo.formato >= FORMATO) return antigo;
  const d = JSON.parse(JSON.stringify(antigo)), c = (v) => centavos(Number(v) || 0);
  const pctsOk = !validarPcts((d.potes || []).map((p) => ({ k: p.k, pct: Math.round(Number(p.pct) || 0) })));
  const potes = (d.potes || []).map((p) => ({ k: p.k, nome: p.nome, pct: Math.round(Number(p.pct) || 0), metaC: c(p.meta) }));
  // potes que não somavam 100: a divisão das entradas antigas usa as proporções que existiam (normalizadas)
  const pesos = Object.fromEntries(potes.filter((p) => p.pct > 0).map((p) => [p.k, p.pct]));
  const divAntiga = (cc) => (Object.keys(pesos).length ? redividir(pesos, cc) : { [potes[0].k]: cc });
  const movs = (d.movs || []).map((m) => {
    const n = { id: m.id, tipo: m.tipo, c: c(m.valor), desc: m.desc || '', dia: Number(m.dia) || 0, origem: 'migracao' };
    if (m.cli) n.cli = m.cli;
    if (m.tipo === 'entra') { n.div = divAntiga(n.c); n.divEstimada = true; n.receita = true; }
    else { n.pote = m.pote; n.cat = categoriaSugerida(m.desc) || 'Outros'; }
    return n;
  }).filter((m) => m.c > 0);
  const novo = {
    formato: FORMATO, negocio: d.negocio || '', dono: d.dono || '', pix: d.pix || '', cidade: d.cidade || '', cnpj: d.cnpj || '',
    potes, movs,
    cobrancas: (d.cobrancas || []).map((x) => ({ id: x.id, cli: x.cli, tel: x.tel, c: c(x.valor), desc: x.desc, vence: Number(x.vence) || 0, status: x.status === 'cancelada' ? 'cancelada' : 'aberta', avisos: x.avisos || [] })),
    contas: [], recibos: [], reciboSeq: 0, historico: [],
    fixas: (d.fixas || []).map((f) => ({ id: f.id, desc: f.desc, c: f.pote === 'imposto' && /das/i.test(f.desc) ? c(d.das) : c(f.valor), dia: Number(f.dia) || 10, pote: f.pote, cat: f.pote === 'imposto' ? 'Impostos' : 'Contas fixas', das: f.pote === 'imposto' && /das/i.test(f.desc), ativa: true, desde: hojeISO(agora).slice(0, 7) })),
    assinatura: d.assinatura, plano: d.plano, conversa: d.conversa || [],
  };
  // cobranças pagas no formato 1 viraram entrada sem vínculo: liga a entrada certa para "recebido" continuar valendo
  (d.cobrancas || []).filter((x) => x.status === 'paga').forEach((x) => {
    const n = novo.cobrancas.find((y) => y.id === x.id), m = novo.movs.find((y) => y.tipo === 'entra' && !y.cob && y.c === n.c && y.desc.includes(x.cli));
    if (m) m.cob = n.id; else n.recebidaAntes = true;
  });
  // contas fixas pagas no formato 1: o pagamento deste mês vira o vínculo com a saída do extrato, se houver
  (d.fixas || []).filter((f) => f.paga).forEach((f) => { const n = novo.fixas.find((y) => y.id === f.id), m = novo.movs.find((y) => y.tipo === 'sai' && !y.fixa && y.desc === f.desc && y.dia > -31); if (m) { m.fixa = n.id; m.comp = compDe(m.dia, agora); } else if (n.c) n.pagaAntes = hojeISO(agora).slice(0, 7); });
  // faturamento do MEI: o número que a pessoa via continua o mesmo (o que já existia + o que o app soma daqui pra frente)
  const doAno = faturamentoAno({ ...novo, fatInicial: null }, agora).app;
  novo.fatInicial = { ano: agora.getFullYear(), c: Math.max(0, c(d.fatAno) - doAno) };
  // conferência: saldo guardado (formato 1) x saldo calculado do extrato (formato 2)
  // o formato 1 guardava frações de centavo; a divisão nova fecha cada entrada no centavo, então até 1 centavo por entrada é só arredondamento
  const calc = saldos(novo), divergencias = [], tolera = novo.movs.filter((m) => m.tipo === 'entra').length;
  (d.potes || []).forEach((p) => { const g = c(p.saldo); if (Math.abs(g - calc[p.k]) > tolera) divergencias.push({ pote: p.k, nome: p.nome, gravado: g, calculado: calc[p.k] }); });
  novo.migracao = { de: 1, em: new Date(agora).toISOString(), divergencias, pctsAntigosSomavam100: pctsOk };
  return novo;
}

// ------------------------------------------------------------------ importação de extrato: prévia e sem duplicar
/** Marca as linhas que já estão no extrato (mesmo dia, valor e tipo, e descrição parecida, ou o mesmo número do banco). */
export function marcarDuplicadas(db, linhas) {
  const usados = new Set();
  return linhas.map((l) => {
    const igual = db.movs.find((m) => !usados.has(m.id) && ((l.ref && m.ref === l.ref) || (m.tipo === l.tipo && m.c === l.c && m.dia === l.dia && (norm(m.desc) === norm(l.desc) || !l.desc || !m.desc || norm(m.desc).includes(norm(l.desc)) || norm(l.desc).includes(norm(m.desc))))));
    if (igual) usados.add(igual.id);
    return { ...l, duplicada: !!igual };
  });
}
/** Grava as linhas confirmadas. Saídas vão para o pote escolhido; entradas são divididas pelos potes de hoje. */
export function importar(db, linhas, { pote, receita = true, arquivo = '' } = {}) {
  const imp = { arquivo: String(arquivo).slice(0, 80), em: new Date().toISOString() }, feitos = [];
  linhas.filter((l) => !l.duplicada && l.incluir !== false).forEach((l) => {
    const m = lancar(db, l.tipo, { c: l.c, desc: l.desc, dia: l.dia, pote: l.pote || pote, receita: l.receita ?? receita, origem: 'importacao', imp }, l.ref ? `ref:${l.ref}` : undefined);
    if (m) { if (l.ref) m.ref = l.ref; feitos.push(m); }
  });
  registra(db, `Importou ${feitos.length} lançamento(s) de ${imp.arquivo || 'uma planilha'}`);
  return feitos;
}

// ------------------------------------------------------------------ exportação compreensível
export function extratoCSV(db, agora = new Date()) {
  const nome = (k) => db.potes.find((p) => p.k === k)?.nome || k, q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const tipo = { entra: 'Entrada', sai: 'Saída', transf: 'Transferência entre potes', ajuste: 'Acerto de saldo' };
  const linhas = [...db.movs].sort((a, b) => a.dia - b.dia).map((m) => {
    const sinal = m.tipo === 'sai' || (m.tipo === 'ajuste' && m.sinal < 0) ? -1 : m.tipo === 'transf' ? 0 : 1;
    const potes = m.tipo === 'entra' ? Object.entries(m.div || {}).map(([k, v]) => `${nome(k)} ${reais(v)}`).join(' | ') : m.tipo === 'transf' ? `${nome(m.de)} → ${nome(m.para)}` : nome(m.pote);
    return [isoDe(m.dia, agora).split('-').reverse().join('/'), tipo[m.tipo], m.desc, (sinal * m.c / 100).toFixed(2).replace('.', ','), m.tipo === 'entra' ? (m.receita === false ? 'Não é receita' : 'Receita') : m.cat || '', potes, m.cli || ''].map(q).join(';');
  });
  return '﻿' + ['Data;Tipo;Descrição;Valor (R$);Categoria;Potes;Cliente', ...linhas].join('\r\n');
}
