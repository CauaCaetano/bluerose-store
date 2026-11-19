// Arca · núcleo de empresa (sem tela): várias empresas e contas bancárias, aprovação por alçada, juros e multa,
// parcelas, plano de contas em árvore, rateio, conciliação com regras, orçamento, DRE (competência e caixa), DFC,
// indicadores, provisão de impostos, fechamento de período e inadimplência.
//
// Tudo aqui é ADITIVO ao formato 2 do nucleo.js (o mesmo de quem já assina): campos novos com valor padrão, nada é
// renomeado nem apagado. Um lançamento sem "banco" é da primeira conta bancária; sem "emp", da empresa dessa conta.
// Valores sempre em centavos inteiros; datas são dias relativos a hoje (como no nucleo.js).

import { situacaoCob, situacaoConta, situacaoFixa, projecao, CATEGORIAS, isoDe, dataDe } from './nucleo.js';
import { DIA_MS } from '../financeiro-comum/dinheiro.js';

// ------------------------------------------------------------------ cadastros com valor padrão
export const PERFIS = {
  dono: { nome: 'Dono', desc: 'vê e faz tudo, fecha o mês e cuida da equipe' },
  financeiro: { nome: 'Financeiro', desc: 'lança, paga, recebe, concilia e exporta' },
  aprovador: { nome: 'Aprovador', desc: 'vê tudo e aprova ou recusa pagamentos' },
  contador: { nome: 'Contador', desc: 'só vê e exporta (não muda nada)' },
};
const PODE = {
  dono: ['lancar', 'pagar', 'receber', 'conciliar', 'aprovar', 'exportar', 'cadastros', 'fechar', 'equipe'],
  financeiro: ['lancar', 'pagar', 'receber', 'conciliar', 'exportar', 'cadastros'],
  aprovador: ['aprovar', 'exportar'],
  contador: ['exportar'],
};
export const pode = (perfil, acao) => (PODE[perfil] || []).includes(acao);

// grupos do plano de contas = linhas da DRE; sinal +1 soma no resultado, −1 subtrai; fora = fica fora do resultado (vai só para a DFC)
export const GRUPOS = [
  { k: 'receita', cod: '1', nome: 'Receita bruta', sinal: 1, tipo: 'entra' },
  { k: 'deducao', cod: '2', nome: 'Deduções e impostos sobre vendas', sinal: -1, tipo: 'sai', variavel: true },
  { k: 'custo', cod: '3', nome: 'Custos das vendas e serviços', sinal: -1, tipo: 'sai', variavel: true },
  { k: 'pessoal', cod: '4', nome: 'Despesas com pessoal', sinal: -1, tipo: 'sai' },
  { k: 'adm', cod: '5', nome: 'Despesas administrativas', sinal: -1, tipo: 'sai' },
  { k: 'comercial', cod: '6', nome: 'Despesas comerciais', sinal: -1, tipo: 'sai' },
  { k: 'outrasrec', cod: '7', nome: 'Outras receitas operacionais', sinal: 1, tipo: 'entra' },
  { k: 'financeira', cod: '8', nome: 'Despesas financeiras', sinal: -1, tipo: 'sai' },
  { k: 'recfin', cod: '9', nome: 'Receitas financeiras', sinal: 1, tipo: 'entra' },
  { k: 'ir', cod: '10', nome: 'IRPJ e CSLL', sinal: -1, tipo: 'sai' },
  { k: 'invest', cod: '11', nome: 'Investimentos (fora do resultado)', sinal: -1, tipo: 'sai', fora: true },
  { k: 'financ', cod: '12', nome: 'Aportes e empréstimos (fora do resultado)', sinal: 1, tipo: 'entra', fora: true },
  { k: 'distrib', cod: '13', nome: 'Retiradas e lucros distribuídos (fora do resultado)', sinal: -1, tipo: 'sai', fora: true },
];
export const grupo = (k) => GRUPOS.find((g) => g.k === k);
export const CAT_ENTRADA = 'Receita de vendas', CAT_NAO_RECEITA = 'Outras entradas';
const PADRAO_GRUPO = {
  receita: ['Receita de vendas', 'Receita de serviços'], outrasrec: ['Outras receitas'], recfin: ['Receitas financeiras'],
  financ: ['Outras entradas', 'Aporte de sócios', 'Empréstimos recebidos'], deducao: ['Impostos', 'Devoluções e abatimentos'],
  custo: ['Fornecedores e mercadorias', 'Material e produtos', 'Fretes e logística'], pessoal: ['Folha de pagamento', 'Pró-labore', 'Pessoal', 'Benefícios'],
  adm: ['Aluguel e espaço', 'Contas fixas', 'Serviços de terceiros', 'Sistemas e software', 'Seguros', 'Manutenção', 'Alimentação', 'Outros'],
  comercial: ['Marketing', 'Transporte', 'Comissões de vendas'], financeira: ['Tarifas bancárias', 'Juros e multas'], ir: ['IRPJ e CSLL'],
  invest: ['Equipamentos'], distrib: ['Retirada (meu salário)', 'Distribuição de lucros'],
};
export function planoPadrao() {
  const l = []; let n = 0;
  GRUPOS.forEach((g) => (PADRAO_GRUPO[g.k] || []).forEach((nome) => l.push({ id: `pc${++n}`, nome, grupo: g.k, pai: '' })));
  return l;
}
export const IMPOSTOS_PADRAO = {
  simples: { das: 9.5 }, presumido: { presIrpj: 8, presCsll: 12, irpj: 15, csll: 9, pis: 0.65, cofins: 3, icms: 0, iss: 0 },
  real: { pis: 1.65, cofins: 7.6, irpj: 15, csll: 9, icms: 0, iss: 0 }, diaIcms: 20,
};
/** Completa os cadastros novos sem mexer no que existe (migração aditiva, idempotente). */
export function garantir(db) {
  if (!Array.isArray(db.empresas) || !db.empresas.length) db.empresas = [{ id: 'e1', nome: db.negocio || 'Minha empresa', cnpj: db.cnpj || '', regime: db.regime || 'simples' }];
  if (!Array.isArray(db.bancos) || !db.bancos.length) db.bancos = [{ id: 'b1', nome: 'Conta principal', banco: '', ag: '', num: '', emp: db.empresas[0].id, tipo: 'corrente' }];
  db.bancos.forEach((b) => { if (!db.empresas.some((e) => e.id === b.emp)) b.emp = db.empresas[0].id; });
  if (!Array.isArray(db.usuarios) || !db.usuarios.length) db.usuarios = [{ id: 'u1', nome: db.dono || 'Dono', perfil: 'dono', contato: '' }];
  if (!db.alcada || typeof db.alcada !== 'object') db.alcada = { limite: 0 }; // 0 = ninguém precisa aprovar (como era antes)
  if (!Array.isArray(db.plano) || !db.plano.length) db.plano = planoPadrao();
  // categoria usada nos dados que não está no plano entra como despesa administrativa (nada some do relatório)
  const tem = new Set(db.plano.map((p) => p.nome));
  [...(db.movs || []), ...(db.contas || []), ...(db.fixas || [])].forEach((x) => { if (x.cat && !tem.has(x.cat)) { db.plano.push({ id: `pc${Date.now().toString(36)}${tem.size}`, nome: x.cat, grupo: 'adm', pai: '' }); tem.add(x.cat); } });
  CATEGORIAS.forEach((c) => { if (!tem.has(c)) { db.plano.push({ id: `pcn${tem.size}`, nome: c, grupo: 'adm', pai: '' }); tem.add(c); } });
  ['projetos', 'regras', 'filtros'].forEach((k) => { if (!Array.isArray(db[k])) db[k] = []; });
  if (!db.orcamento || typeof db.orcamento !== 'object') db.orcamento = { cat: {}, cc: {} };
  db.orcamento.cat ||= {}; db.orcamento.cc ||= {};
  if (!db.impostos || typeof db.impostos !== 'object') db.impostos = JSON.parse(JSON.stringify(IMPOSTOS_PADRAO));
  if (!db.regua || !Array.isArray(db.regua.dias)) db.regua = { dias: [-1, 0, 3, 7, 15], email: true, whatsapp: true };
  if (!db.cenarios) db.cenarios = { otimista: { receitaExtra: 5 }, pessimista: { atrasa: 20, perde: 5, gastoExtra: 5 } };
  if (typeof db.fechado !== 'string') db.fechado = '';
  return db;
}

// ------------------------------------------------------------------ empresas e contas bancárias
export const bancoPadrao = (db) => db.bancos[0]?.id;
export const bancoDe = (db, x) => (x && db.bancos.some((b) => b.id === x.banco) ? x.banco : bancoPadrao(db));
export const empDe = (db, x) => (x?.emp && db.empresas.some((e) => e.id === x.emp) ? x.emp : db.bancos.find((b) => b.id === bancoDe(db, x))?.emp || db.empresas[0]?.id);
/** Efeito de um movimento em cada conta bancária. */
export function efeitoBanco(db, m) {
  if (m.tipo === 'entra') return { [bancoDe(db, m)]: m.c };
  if (m.tipo === 'sai') return { [bancoDe(db, m)]: -m.c };
  if (m.tipo === 'ajuste') return { [bancoDe(db, m)]: m.sinal < 0 ? -m.c : m.c };
  if (m.tipo === 'transfb') return { [m.bde]: -m.c, [m.bpara]: m.c };
  return {}; // passar entre reservas não muda o banco
}
export function saldosBancos(db, ateDia = Infinity) {
  const s = Object.fromEntries(db.bancos.map((b) => [b.id, 0]));
  db.movs.forEach((m) => { if (m.dia <= ateDia) Object.entries(efeitoBanco(db, m)).forEach(([k, v]) => { s[k] = (s[k] || 0) + v; }); });
  return s;
}
export const saldoEmpresa = (db, emp, sb = saldosBancos(db)) => db.bancos.filter((b) => !emp || b.emp === emp).reduce((a, b) => a + (sb[b.id] || 0), 0);
/** Transferência entre contas bancárias (mesma empresa ou entre empresas do grupo). Não é receita nem despesa. */
export function transferir(db, { c, de, para, dia = 0, desc = '' }) {
  if (!Number.isInteger(c) || c <= 0) throw new Error('Digite um valor maior que zero.');
  if (!db.bancos.some((b) => b.id === de) || !db.bancos.some((b) => b.id === para)) throw new Error('Escolha as duas contas.');
  if (de === para) throw new Error('Escolha contas diferentes.');
  const nb = (k) => db.bancos.find((b) => b.id === k).nome;
  const m = { id: `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, tipo: 'transfb', c, bde: de, bpara: para, desc: String(desc || `Transferência ${nb(de)} → ${nb(para)}`).slice(0, 120), dia, criado: new Date().toISOString(), origem: 'app' };
  db.movs.push(m);
  return m;
}

// ------------------------------------------------------------------ filtros de empresa
export const daEmpresa = (db, emp) => (x) => !emp || empDe(db, x) === emp;

// ------------------------------------------------------------------ aprovação por alçada
/** Precisa de aprovação: valor igual ou acima do limite (limite 0 = não usa aprovação). */
export const precisaAprovar = (db, conta) => !!db.alcada?.limite && conta.c >= db.alcada.limite;
export function estadoAprov(db, conta) {
  if (!precisaAprovar(db, conta)) return 'livre';
  return conta.aprov?.st || 'pendente';
}
/** Quem pode aprovar: perfil com "aprovar" e que não seja quem lançou a conta (quem lança não aprova acima do limite). */
export function podeAprovar(db, usuario, conta) {
  if (!usuario || !pode(usuario.perfil, 'aprovar')) return { ok: false, motivo: 'Seu perfil não aprova pagamentos.' };
  if (conta.criadoPor && conta.criadoPor === usuario.id) return { ok: false, motivo: 'Quem lançou não pode aprovar o próprio pagamento acima do limite.' };
  return { ok: true };
}
export function aprovar(db, usuario, conta, sim, motivo = '') {
  const p = podeAprovar(db, usuario, conta); if (!p.ok) throw new Error(p.motivo);
  if (!sim && !String(motivo).trim()) throw new Error('Diga o motivo da recusa.');
  conta.aprov = { st: sim ? 'aprovada' : 'recusada', por: usuario.id, nome: usuario.nome, em: new Date().toISOString(), ...(sim ? {} : { motivo: String(motivo).trim().slice(0, 160) }) };
  return conta.aprov;
}
/** Pagamento liberado? (não precisa de aprovação, ou já foi aprovado) */
export const liberado = (db, conta) => ['livre', 'aprovada'].includes(estadoAprov(db, conta));

// ------------------------------------------------------------------ juros e multa (cobrança e conta em atraso)
/** Multa (% única) + juros (% ao mês, pró-rata por dia) sobre o que falta, a partir do dia seguinte ao vencimento. */
export function encargos(item, falta, hoje = 0) {
  const atraso = Math.max(0, hoje - item.vence);
  if (!atraso || !falta) return { atraso: 0, multa: 0, juros: 0, total: falta };
  const multa = Math.round(falta * (Number(item.multa) || 0) / 100), juros = Math.round(falta * (Number(item.juros) || 0) / 100 / 30 * atraso);
  return { atraso, multa, juros, total: falta + multa + juros };
}

// ------------------------------------------------------------------ parcelas
/** Divide c em n parcelas que fecham no centavo; vencimentos a cada "intervalo" dias (30 = mensal pelo calendário). */
export function parcelas(c, n, venc0, intervalo = 30) {
  if (!Number.isInteger(n) || n < 1 || n > 120) throw new Error('Use de 1 a 120 parcelas.');
  if (!Number.isInteger(c) || c < n) throw new Error('Valor pequeno demais para essa quantidade de parcelas.');
  const base = Math.floor(c / n), resto = c - base * n, d0 = dataDe(venc0), hoje = dataDe(0);
  return Array.from({ length: n }, (_, i) => {
    let vence = venc0 + i * intervalo;
    if (intervalo === 30) { const d = new Date(d0.getFullYear(), d0.getMonth() + i, 1, 12); d.setDate(Math.min(d0.getDate(), new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); vence = Math.round((d - hoje) / DIA_MS); }
    return { c: base + (i < resto ? 1 : 0), vence, parc: `${i + 1}/${n}` };
  });
}

// ------------------------------------------------------------------ plano de contas
export function grupoDaCat(db, nome, tipo) {
  const p = db.plano.find((x) => x.nome === nome);
  if (p) { if (p.pai) { const pai = db.plano.find((x) => x.id === p.pai); if (pai) return pai.grupo; } return p.grupo; }
  return tipo === 'entra' ? 'receita' : 'adm';
}
export const catDe = (m) => (m.tipo === 'entra' ? m.cat || (m.receita === false ? CAT_NAO_RECEITA : CAT_ENTRADA) : m.cat || 'Outros');
/** Árvore: grupo › categoria › subcategoria, com código (1.01, 1.01.01). */
export function arvore(db) {
  return GRUPOS.map((g) => {
    const cats = db.plano.filter((p) => p.grupo === g.k && !p.pai).map((p, i) => ({ ...p, cod: `${g.cod}.${String(i + 1).padStart(2, '0')}`, filhos: db.plano.filter((s) => s.pai === p.id).map((s, j) => ({ ...s, cod: `${g.cod}.${String(i + 1).padStart(2, '0')}.${String(j + 1).padStart(2, '0')}` })) }));
    return { ...g, cats };
  });
}
export function codigoDaCat(db, nome) { for (const g of arvore(db)) for (const c of g.cats) { if (c.nome === nome) return c.cod; const s = c.filhos.find((f) => f.nome === nome); if (s) return s.cod; } return ''; }
export const catsDoTipo = (db, tipo) => db.plano.filter((p) => p.ativa !== false && (grupo(db.plano.find((x) => x.id === p.pai)?.grupo || p.grupo)?.tipo === tipo)).map((p) => p.nome);

// ------------------------------------------------------------------ rateio entre centros de custo
/** Partes de um valor por centro de custo: rateio (% inteiros que somam 100) ou o centro único. Fecha no centavo. */
export function partesCC(x) {
  if (Array.isArray(x.rat) && x.rat.length) {
    const p = x.rat.map((r) => ({ cc: r.cc, c: Math.floor(x.c * r.pct / 100), resto: (x.c * r.pct) % 100 }));
    let falta = x.c - p.reduce((s, r) => s + r.c, 0);
    [...p].sort((a, b) => b.resto - a.resto).forEach((r) => { if (falta > 0) { r.c++; falta--; } });
    return p.map(({ cc, c }) => ({ cc, c }));
  }
  return [{ cc: x.cc || '', c: x.c }];
}
export function validarRateio(rat) {
  if (!rat.length) return '';
  if (rat.some((r) => !r.cc || !Number.isInteger(r.pct) || r.pct <= 0)) return 'Cada parte do rateio precisa de centro de custo e % inteira maior que zero.';
  const s = rat.reduce((a, r) => a + r.pct, 0); return s === 100 ? '' : `O rateio soma ${s}%. Precisa dar 100%.`;
}

// ------------------------------------------------------------------ períodos (mês do calendário em dias relativos)
export const mesDe = (dia, agora = new Date()) => isoDe(dia, agora).slice(0, 7);
export function diasDoMes(mesISO, agora = new Date()) {
  const [a, m] = mesISO.split('-').map(Number), h = new Date(agora); h.setHours(12, 0, 0, 0);
  const rel = (d) => Math.round((d - h) / DIA_MS);
  return [rel(new Date(a, m - 1, 1, 12)), rel(new Date(a, m, 0, 12))];
}
export function mesesAte(mesISO, n) { const [a, m] = mesISO.split('-').map(Number); return Array.from({ length: n }, (_, i) => { const d = new Date(a, m - 1 - (n - 1 - i), 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }); }
export const nomeMes = (mesISO, curto) => { const [a, m] = mesISO.split('-').map(Number); return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', curto ? { month: 'short', year: '2-digit' } : { month: 'long', year: 'numeric' }).replace('.', ''); };

// ------------------------------------------------------------------ fechamento de período
/** O mês do dia está fechado? (fechado = 'AAAA-MM' do último mês travado) */
export const fechadoEm = (db, dia) => !!db.fechado && mesDe(dia) <= db.fechado;
export function exigeAberto(db, ...dias) {
  const d = dias.find((x) => Number.isFinite(x) && fechadoEm(db, x));
  if (d !== undefined) throw new Error(`O mês ${nomeMes(mesDe(d))} está fechado. Para mudar, o dono reabre em Equipe › Fechamento.`);
}

// ------------------------------------------------------------------ DRE gerencial (caixa e competência)
/**
 * Itens de resultado do período. Caixa: o que entrou e saiu do banco (lançamentos). Competência: pela data do fato
 * (cobranças e contas pela competência ou criação, ainda que não pagas; lançamentos avulsos pela competência ou data).
 */
export function itensResultado(db, de, ate, { base = 'caixa', emp = '', cc = '' } = {}) {
  const daEmp = daEmpresa(db, emp), itens = [];
  const add = (x, tipo, c, cat, dia) => { if (dia < de || dia > ate || !daEmp(x)) return; partesCC({ ...x, c }).forEach((p) => { if (!cc || p.cc === cc) itens.push({ tipo, c: p.c, cat, grupo: grupoDaCat(db, cat, tipo), cc: p.cc, dia }); }); };
  if (base === 'caixa') {
    db.movs.forEach((m) => { if (m.tipo === 'entra' || m.tipo === 'sai') add(m, m.tipo, m.c, catDe(m), m.dia); });
  } else {
    db.cobrancas.forEach((x) => { if (x.status === 'cancelada') return; add(x, 'entra', x.recebidaAntes ? x.c : x.c, x.cat || CAT_ENTRADA, Number.isFinite(x.dcomp) ? x.dcomp : Number.isFinite(x.criada) ? x.criada : x.vence); });
    db.contas.forEach((x) => { if (x.status === 'cancelada') return; add(x, 'sai', x.c, x.cat || 'Outros', Number.isFinite(x.dcomp) ? x.dcomp : x.vence); });
    db.movs.forEach((m) => {
      if (m.tipo === 'entra' && !m.cob) add(m, 'entra', m.c, catDe(m), Number.isFinite(m.dcomp) ? m.dcomp : m.dia);
      if (m.tipo === 'sai' && !m.conta) add(m, 'sai', m.c, catDe(m), Number.isFinite(m.dcomp) ? m.dcomp : m.dia);
    });
  }
  return itens;
}
/** DRE: grupos, subtotais e categorias. */
export function dre(db, de, ate, op = {}) {
  const it = itensResultado(db, de, ate, op), g = {}, cats = {};
  it.forEach((i) => { g[i.grupo] = (g[i.grupo] || 0) + i.c; (cats[i.grupo] ||= {}); cats[i.grupo][i.cat] = (cats[i.grupo][i.cat] || 0) + i.c; });
  const v = (k) => g[k] || 0;
  const bruta = v('receita'), liquida = bruta - v('deducao'), lucroBruto = liquida - v('custo');
  const ebitda = lucroBruto - v('pessoal') - v('adm') - v('comercial') + v('outrasrec');
  const antesIR = ebitda - v('financeira') + v('recfin'), liquido = antesIR - v('ir');
  const linhas = [
    { k: 'receita', nome: 'Receita bruta', v: bruta, g: 'receita' }, { k: 'deducao', nome: '(−) Deduções e impostos sobre vendas', v: -v('deducao'), g: 'deducao' },
    { k: 'liquida', nome: '= Receita líquida', v: liquida, total: true }, { k: 'custo', nome: '(−) Custos das vendas e serviços', v: -v('custo'), g: 'custo' },
    { k: 'lucrobruto', nome: '= Lucro bruto', v: lucroBruto, total: true }, { k: 'pessoal', nome: '(−) Despesas com pessoal', v: -v('pessoal'), g: 'pessoal' },
    { k: 'adm', nome: '(−) Despesas administrativas', v: -v('adm'), g: 'adm' }, { k: 'comercial', nome: '(−) Despesas comerciais', v: -v('comercial'), g: 'comercial' },
    { k: 'outrasrec', nome: '(+) Outras receitas operacionais', v: v('outrasrec'), g: 'outrasrec' }, { k: 'ebitda', nome: '= EBITDA (resultado operacional)', v: ebitda, total: true },
    { k: 'financeira', nome: '(−) Despesas financeiras', v: -v('financeira'), g: 'financeira' }, { k: 'recfin', nome: '(+) Receitas financeiras', v: v('recfin'), g: 'recfin' },
    { k: 'antesir', nome: '= Resultado antes do IR e CSLL', v: antesIR, total: true }, { k: 'ir', nome: '(−) IRPJ e CSLL', v: -v('ir'), g: 'ir' },
    { k: 'liquido', nome: '= Resultado líquido', v: liquido, total: true, final: true },
  ];
  const fora = [{ k: 'invest', nome: 'Investimentos (equipamentos, obras)', v: -v('invest') }, { k: 'financ', nome: 'Aportes e empréstimos recebidos', v: v('financ') }, { k: 'distrib', nome: 'Retiradas e lucros distribuídos', v: -v('distrib') }];
  const variaveis = v('deducao') + v('custo'), fixas = v('pessoal') + v('adm') + v('comercial') + v('financeira');
  return { linhas, fora, cats, bruta, liquida, lucroBruto, ebitda, antesIR, liquido, variaveis, fixas, g };
}
/** Análise vertical (% da receita bruta) e horizontal (variação contra o período anterior). */
export const av = (v, bruta) => (bruta ? v / bruta * 100 : null);
export const ah = (v, ant) => (ant ? (v - ant) / Math.abs(ant) * 100 : null);

// ------------------------------------------------------------------ DFC (método direto)
export function dfc(db, de, ate, { emp = '' } = {}) {
  const daEmp = daEmpresa(db, emp), sb0 = saldosBancosFiltro(db, de - 1, emp), ms = db.movs.filter((m) => m.dia >= de && m.dia <= ate && daEmp(m));
  const op = { rec: 0, forn: 0, pessoal: 0, imp: 0, desp: 0 }, inv = { sai: 0 }, fin = { entra: 0, sai: 0 };
  let transf = 0;
  ms.forEach((m) => {
    if (m.tipo === 'transfb') { const b1 = db.bancos.find((b) => b.id === m.bde), b2 = db.bancos.find((b) => b.id === m.bpara); if (emp && (b1?.emp === emp) !== (b2?.emp === emp)) transf += b2?.emp === emp ? m.c : -m.c; return; }
    if (m.tipo !== 'entra' && m.tipo !== 'sai') return;
    const gk = grupoDaCat(db, catDe(m), m.tipo);
    if (m.tipo === 'entra') { if (gk === 'financ') fin.entra += m.c; else op.rec += m.c; return; }
    if (gk === 'invest') inv.sai += m.c; else if (gk === 'distrib') fin.sai += m.c; else if (gk === 'custo') op.forn += m.c; else if (gk === 'pessoal') op.pessoal += m.c; else if (gk === 'deducao' || gk === 'ir') op.imp += m.c; else op.desp += m.c;
  });
  const fop = op.rec - op.forn - op.pessoal - op.imp - op.desp, finv = -inv.sai, ffin = fin.entra - fin.sai;
  return { inicial: sb0, op, inv, fin, fop, finv, ffin, transf, variacao: fop + finv + ffin + transf, final: sb0 + fop + finv + ffin + transf };
}
function saldosBancosFiltro(db, ateDia, emp) { const s = saldosBancos(db, ateDia); return db.bancos.filter((b) => !emp || b.emp === emp).reduce((a, b) => a + (s[b.id] || 0), 0); }

// ------------------------------------------------------------------ a receber e a pagar em aberto
export function abertos(db, { emp = '' } = {}) {
  const daEmp = daEmpresa(db, emp);
  const rec = db.cobrancas.filter(daEmp).map((x) => ({ x, s: situacaoCob(db, x) })).filter((r) => r.s.falta > 0);
  const pag = db.contas.filter(daEmp).map((x) => ({ x, s: situacaoConta(db, x) })).filter((r) => r.s.falta > 0);
  const fx = db.fixas.filter(daEmp).map((x) => ({ x, s: situacaoFixa(db, x) })).filter((r) => r.s.falta > 0);
  return { rec, pag, fx, aReceber: rec.reduce((a, r) => a + r.s.falta, 0), vencido: rec.filter((r) => r.s.st === 'atrasada').reduce((a, r) => a + r.s.falta, 0), aPagar: pag.reduce((a, r) => a + r.s.falta, 0) + fx.reduce((a, r) => a + r.s.falta, 0) };
}

// ------------------------------------------------------------------ indicadores
export function indicadores(db, de, ate, { emp = '' } = {}) {
  const d = dre(db, de, ate, { emp, base: 'competencia' }), dias = Math.max(1, ate - de + 1), ab = abertos(db, { emp });
  const caixa = saldoEmpresa(db, emp), recDia = d.bruta / dias, compras = (d.g.custo || 0) + (d.g.adm || 0) + (d.g.comercial || 0), compDia = compras / dias;
  const mc = d.bruta ? (d.bruta - d.variaveis) / d.bruta : 0, fixasMes = d.fixas / dias * 30;
  return {
    margemBruta: d.bruta ? d.lucroBruto / d.bruta * 100 : null, margemLiquida: d.bruta ? d.liquido / d.bruta * 100 : null, margemEbitda: d.bruta ? d.ebitda / d.bruta * 100 : null,
    ebitda: d.ebitda, pmr: recDia ? ab.aReceber / recDia : null, pmp: compDia ? ab.aPagar / compDia : null,
    capitalGiro: caixa + ab.aReceber - ab.aPagar, ncg: ab.aReceber - ab.aPagar, caixa, aReceber: ab.aReceber, aPagar: ab.aPagar,
    margemContrib: mc * 100, pontoEquilibrio: mc > 0 ? Math.round(fixasMes / mc) : null, receitaMes: Math.round(d.bruta / dias * 30), fixasMes: Math.round(fixasMes), dre: d,
  };
}

// ------------------------------------------------------------------ orçamento x realizado
export function orcamento(db, mesISO, { emp = '' } = {}) {
  const [de, ate] = diasDoMes(mesISO), it = itensResultado(db, de, ate, { base: 'competencia', emp }).filter((i) => i.tipo === 'sai');
  const real = { cat: {}, cc: {} }; it.forEach((i) => { real.cat[i.cat] = (real.cat[i.cat] || 0) + i.c; if (i.cc) real.cc[i.cc] = (real.cc[i.cc] || 0) + i.c; });
  const linha = (orc, r) => { const pct = orc ? r / orc * 100 : null; return { orc, real: r, dif: orc - r, pct, st: !orc ? (r ? 'sem' : '') : pct > 100 ? 'estourou' : pct >= 85 ? 'atencao' : 'ok' }; };
  const cats = [...new Set([...Object.keys(db.orcamento.cat), ...Object.keys(real.cat)])].map((k) => ({ k, ...linha(db.orcamento.cat[k] || 0, real.cat[k] || 0) }));
  const ccs = [...new Set([...Object.keys(db.orcamento.cc), ...Object.keys(real.cc)])].map((k) => ({ k, ...linha(db.orcamento.cc[k] || 0, real.cc[k] || 0) }));
  const ord = (a, b) => (b.pct ?? -1) - (a.pct ?? -1) || b.real - a.real;
  return { cats: cats.sort(ord), ccs: ccs.sort(ord), totOrc: cats.reduce((a, x) => a + x.orc, 0), totReal: cats.reduce((a, x) => a + x.real, 0) };
}
/** Alertas de estouro e atenção do mês corrente (para o painel). */
export function alertasOrcamento(db, mesISO) { const o = orcamento(db, mesISO); return [...o.cats.map((x) => ({ ...x, tipo: 'categoria' })), ...o.ccs.map((x) => ({ ...x, tipo: 'centro de custo' }))].filter((x) => x.st === 'estourou' || x.st === 'atencao'); }

// ------------------------------------------------------------------ fluxo realizado + previsto e cenários
/** Itens previstos com cenário: otimista (recebe tudo no prazo, receita extra), pessimista (parte atrasa 30 dias, parte não entra, gastos maiores). */
export function previstos(db, n, cenario = 'realista', emp = '') {
  const f = daEmpresa(db, emp), base = emp ? { ...db, cobrancas: db.cobrancas.filter(f), contas: db.contas.filter(f), fixas: db.fixas.filter(f) } : db;
  const p = projecao(base, n + 31);
  let it = p.itens.map((i) => ({ ...i }));
  if (cenario === 'otimista') { const x = (db.cenarios.otimista.receitaExtra || 0) / 100; it.forEach((i) => { if (i.sinal > 0) i.c = Math.round(i.c * (1 + x)); }); }
  if (cenario === 'pessimista') {
    const c = db.cenarios.pessimista, atrasa = (c.atrasa || 0) / 100, perde = (c.perde || 0) / 100, extra = (c.gastoExtra || 0) / 100, novos = [];
    it.forEach((i) => { if (i.sinal > 0) { const perdido = Math.round(i.c * perde), atrasado = Math.round(i.c * atrasa); i.c -= perdido + atrasado; if (atrasado) novos.push({ ...i, c: atrasado, dia: i.dia + 30, desc: `${i.desc} (atrasa)` }); } else i.c = Math.round(i.c * (1 + extra)); });
    it = [...it, ...novos];
  }
  return it.filter((i) => i.dia <= n && i.c > 0).sort((a, b) => a.dia - b.dia);
}
/** Fluxo por período: dia, semana ou mês, com o realizado (passado) e o previsto (futuro) e o saldo no fim de cada período. */
export function fluxoPeriodos(db, gran = 'mensal', cenario = 'realista', { emp = '' } = {}) {
  const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
  const rel = (d) => Math.round((d - hoje) / DIA_MS), per = [];
  if (gran === 'diario') for (let k = -7; k <= 14; k++) per.push({ de: k, ate: k, nome: dataDe(k).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) });
  else if (gran === 'semanal') { const seg = new Date(hoje); seg.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7)); for (let k = -6; k <= 8; k++) { const a = new Date(seg); a.setDate(seg.getDate() + 7 * k); const de = rel(a); per.push({ de, ate: de + 6, nome: `sem. ${a.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` }); } }
  else for (let k = -3; k <= 3; k++) { const a = new Date(hoje.getFullYear(), hoje.getMonth() + k, 1, 12), b = new Date(hoje.getFullYear(), hoje.getMonth() + k + 1, 0, 12); per.push({ de: rel(a), ate: rel(b), nome: a.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '') }); }
  const n = Math.max(1, per.at(-1).ate), prev = previstos(db, n, cenario, emp), daEmp = daEmpresa(db, emp);
  let saldo = saldoEmpresa(db, emp, saldosBancos(db, per[0].de - 1));
  return per.map((p) => {
    const ms = db.movs.filter((m) => m.dia >= p.de && m.dia <= Math.min(p.ate, 0) && daEmp(m));
    const er = ms.filter((m) => m.tipo === 'entra').reduce((a, m) => a + m.c, 0), sr = ms.filter((m) => m.tipo === 'sai').reduce((a, m) => a + m.c, 0);
    let tr = 0; if (emp) ms.filter((m) => m.tipo === 'transfb').forEach((m) => { const e1 = db.bancos.find((b) => b.id === m.bde)?.emp, e2 = db.bancos.find((b) => b.id === m.bpara)?.emp; if (e1 !== e2) tr += e2 === emp ? m.c : e1 === emp ? -m.c : 0; });
    // previsto: só de hoje em diante (atrasados contam como hoje, como no nucleo)
    const pv = prev.filter((i) => i.dia >= p.de && i.dia <= p.ate);
    const ep = pv.filter((i) => i.sinal > 0).reduce((a, i) => a + i.c, 0), sp = pv.filter((i) => i.sinal < 0).reduce((a, i) => a + i.c, 0);
    saldo += er - sr + tr + ep - sp;
    return { ...p, er, sr, ep, sp, saldo, passado: p.ate < 0, futuro: p.de > 0 };
  });
}

// ------------------------------------------------------------------ impostos: provisão por regime e calendário
export function provisaoImpostos(db, emp, mesISO) {
  const e = db.empresas.find((x) => x.id === emp) || db.empresas[0], [de, ate] = diasDoMes(mesISO), d = dre(db, de, ate, { emp: e.id, base: 'competencia' }), al = db.impostos, rb = d.bruta, l = [];
  const pct = (v, p) => Math.round(v * (Number(p) || 0) / 100);
  if (e.regime === 'mei') l.push({ k: 'das', nome: 'DAS do MEI', c: 0, nota: 'valor fixo mensal (veja a guia do mês)' });
  if (e.regime === 'simples') l.push({ k: 'das', nome: 'DAS (Simples Nacional)', c: pct(rb, al.simples.das), base: rb, aliq: al.simples.das });
  if (e.regime === 'presumido') {
    const p = al.presumido, bIr = pct(rb, p.presIrpj), bCs = pct(rb, p.presCsll), adic = Math.max(0, bIr - 2000000);
    l.push({ k: 'pis', nome: 'PIS', c: pct(rb, p.pis), base: rb, aliq: p.pis }, { k: 'cofins', nome: 'COFINS', c: pct(rb, p.cofins), base: rb, aliq: p.cofins },
      { k: 'irpj', nome: 'IRPJ (presumido, provisão mensal)', c: pct(bIr, p.irpj) + pct(adic, 10), base: bIr, aliq: p.irpj }, { k: 'csll', nome: 'CSLL (presumido, provisão mensal)', c: pct(bCs, p.csll), base: bCs, aliq: p.csll });
    if (p.icms) l.push({ k: 'icms', nome: 'ICMS', c: pct(rb, p.icms), base: rb, aliq: p.icms }); if (p.iss) l.push({ k: 'iss', nome: 'ISS', c: pct(rb, p.iss), base: rb, aliq: p.iss });
  }
  if (e.regime === 'real') {
    const p = al.real, lucro = Math.max(0, d.antesIR), adic = Math.max(0, lucro - 2000000);
    l.push({ k: 'pis', nome: 'PIS (não cumulativo, sem créditos)', c: pct(rb, p.pis), base: rb, aliq: p.pis }, { k: 'cofins', nome: 'COFINS (não cumulativo, sem créditos)', c: pct(rb, p.cofins), base: rb, aliq: p.cofins },
      { k: 'irpj', nome: 'IRPJ (estimativa sobre o lucro do mês)', c: pct(lucro, p.irpj) + pct(adic, 10), base: lucro, aliq: p.irpj }, { k: 'csll', nome: 'CSLL (estimativa sobre o lucro do mês)', c: pct(lucro, p.csll), base: lucro, aliq: p.csll });
    if (p.icms) l.push({ k: 'icms', nome: 'ICMS', c: pct(rb, p.icms), base: rb, aliq: p.icms }); if (p.iss) l.push({ k: 'iss', nome: 'ISS', c: pct(rb, p.iss), base: rb, aliq: p.iss });
  }
  return { emp: e, receita: rb, itens: l, total: l.reduce((a, x) => a + x.c, 0) };
}
const ultimoDiaUtil = (a, m) => { const d = new Date(a, m + 1, 0, 12); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1); return d; };
const diaUtilAte = (a, m, dia) => { const d = new Date(a, m, Math.min(dia, new Date(a, m + 1, 0).getDate()), 12); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1); return d; };
/** Vencimentos dos próximos n dias, por empresa, com o valor provisionado do mês de apuração. */
export function calendarioImpostos(db, n = 60, agora = new Date()) {
  const h = new Date(agora); h.setHours(12, 0, 0, 0); const rel = (d) => Math.round((d - h) / DIA_MS), l = [];
  for (let k = -1; k <= Math.ceil(n / 28) + 1; k++) {
    const ap = new Date(h.getFullYear(), h.getMonth() + k - 1, 1, 12), mesAp = `${ap.getFullYear()}-${String(ap.getMonth() + 1).padStart(2, '0')}`, a = ap.getFullYear(), m = ap.getMonth() + 1; // vence no mês seguinte ao da apuração
    db.empresas.forEach((e) => {
      const prov = provisaoImpostos(db, e.id, mesAp), val = (k2) => prov.itens.filter((i) => k2.includes(i.k)).reduce((s, i) => s + i.c, 0);
      const push = (nome, data, c, ks) => { const dia = rel(data); if (dia >= -5 && dia <= n) l.push({ emp: e.id, empNome: e.nome, nome, dia, c, mesAp, ks }); };
      if (e.regime === 'simples' || e.regime === 'mei') push(e.regime === 'mei' ? 'DAS do MEI' : 'DAS', diaUtilAte(a, m, 20), val(['das']), ['das']);
      if (e.regime === 'presumido' || e.regime === 'real') {
        push('PIS e COFINS', diaUtilAte(a, m, 25), val(['pis', 'cofins']), ['pis', 'cofins']);
        if (e.regime === 'real' || [2, 5, 8, 11].includes(ap.getMonth())) push(e.regime === 'real' ? 'IRPJ e CSLL (estimativa mensal)' : 'IRPJ e CSLL (trimestre)', ultimoDiaUtil(a, m), e.regime === 'real' ? val(['irpj', 'csll']) : [0, 1, 2].reduce((s, j) => { const x = new Date(a, m - 1 - j - 1, 1); return s + provisaoImpostos(db, e.id, `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`).itens.filter((i) => ['irpj', 'csll'].includes(i.k)).reduce((q, i) => q + i.c, 0); }, 0), ['irpj', 'csll']);
        if ((db.impostos[e.regime]?.icms || 0) > 0) push('ICMS', diaUtilAte(a, m, db.impostos.diaIcms || 20), val(['icms']), ['icms']);
      }
      if (e.regime !== 'mei') push('FGTS, INSS e IRRF da folha', diaUtilAte(a, m, 20), 0, ['folha']);
    });
  }
  return l.sort((x, y) => x.dia - y.dia);
}

// ------------------------------------------------------------------ cobrança: régua e inadimplência
/** Marcos da régua (dias em relação ao vencimento) que caem hoje e ainda não foram lembrados. */
export function lembretesHoje(db) {
  return db.cobrancas.map((x) => ({ x, s: situacaoCob(db, x) })).filter(({ x, s }) => s.falta > 0 && db.regua.dias.includes(-x.vence) && !(x.avisos || []).includes(0));
}
export function inadimplencia(db, { emp = '' } = {}) {
  const por = {};
  db.cobrancas.filter(daEmpresa(db, emp)).forEach((x) => {
    const s = situacaoCob(db, x), k = x.cli; por[k] ||= { cli: k, tel: x.tel, email: x.email, aberto: 0, vencido: 0, f30: 0, f60: 0, f90: 0, f90m: 0, maior: 0, qtd: 0, recebido: 0 };
    const p = por[k]; p.recebido += s.r || 0; if (!s.falta) return; p.aberto += s.falta; p.qtd++;
    if (s.st === 'atrasada') { const d = -x.vence; p.vencido += s.falta; p.maior = Math.max(p.maior, d); p[d <= 30 ? 'f30' : d <= 60 ? 'f60' : d <= 90 ? 'f90' : 'f90m'] += s.falta; }
  });
  return Object.values(por).filter((p) => p.aberto).sort((a, b) => b.vencido - a.vencido || b.aberto - a.aberto);
}

// ------------------------------------------------------------------ conciliação: regras e sugestão de par
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
export function regraPara(db, linha) { return db.regras.find((r) => r.contem && semAcento(linha.desc).includes(semAcento(r.contem)) && (!r.tipo || r.tipo === linha.tipo)); }
/**
 * Para cada linha do extrato de uma conta: já conciliada (mesmo número do banco), par sugerido (lançamento da mesma
 * conta, mesmo tipo e valor, até 5 dias de diferença, ainda não conciliado), regra ("contém TARIFA" → categoria) ou nova.
 */
export function sugerir(db, banco, linhas) {
  const usados = new Set(), bancoOk = (m) => bancoDe(db, m) === banco;
  return linhas.map((l) => {
    if (l.ref && db.movs.some((m) => m.conc?.ref === l.ref || m.ref === l.ref)) return { ...l, acao: 'ja', motivo: 'já conciliada' };
    const cands = db.movs.filter((m) => !usados.has(m.id) && !m.conc && bancoOk(m) && m.tipo === l.tipo && m.c === l.c && Math.abs(m.dia - l.dia) <= 5);
    if (cands.length) {
      const pal = (s) => new Set(semAcento(s).split(/[^A-Z0-9]+/).filter((w) => w.length > 2));
      const nota = (m) => { const a = pal(m.desc), b = pal(l.desc); let i = 0; a.forEach((w) => b.has(w) && i++); return 100 - Math.abs(m.dia - l.dia) * 6 + Math.min(i, 3) * 4 - 12; };
      const best = cands.sort((a, b) => nota(b) - nota(a))[0]; usados.add(best.id);
      return { ...l, acao: 'par', par: best.id, conf: Math.max(55, Math.min(99, nota(best))) };
    }
    const r = regraPara(db, l); if (r) return { ...l, acao: 'regra', regra: r.id, cat: r.cat, cc: r.cc || '' };
    return { ...l, acao: 'novo' };
  });
}
/** Lançamentos da conta ainda sem conciliação (até hoje). */
export const pendentesConc = (db, banco) => db.movs.filter((m) => (m.tipo === 'entra' || m.tipo === 'sai') && bancoDe(db, m) === banco && !m.conc && m.dia <= 0);
