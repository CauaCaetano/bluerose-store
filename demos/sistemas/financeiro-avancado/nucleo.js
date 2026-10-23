// Veltria Financeiro Avançado · núcleo (sem tela): alçadas, remessa, conciliação, fechamento com trava, rateio, consolidado,
// indicadores e auditoria. Testado em tools/testes-financeiro/avancado.test.mjs.
//
// Regras (formato 2):
// - planejamento (caixa 13 semanas, orçado/real, rateio, eliminações) em reais inteiros; pagamentos e extrato em centavos;
// - rateio divide em reais inteiros pelo maior resto: a soma das partes é sempre o valor da despesa; lançar o rateio do mês
//   soma no real de cada empresa uma vez só e pode ser estornado;
// - eliminação intercompany tira o mesmo valor da receita e do custo do grupo: o resultado do grupo é a soma dos resultados;
// - indicador só existe se vier dos dados do sistema (nada de número de exemplo fixo);
// - mês fechado trava toda alteração daquele mês; reabrir exige motivo e fica na auditoria;
// - aprovação respeita a alçada de quem aprova; toda alteração vai para a auditoria com data e hora completas.
import { centavos, reais, hojeISO, isoDe, diaDe, lerExtrato, norm } from '../financeiro-comum/dinheiro.js';
export { centavos, reais, hojeISO, isoDe, diaDe, lerExtrato };

export const FORMATO = 2;
export const CATS = [['Receita de vendas', 'r'], ['Receita de serviços', 'r'], ['Custo das mercadorias', 'c'], ['Fretes', 'c'], ['Folha e encargos', 'c'], ['Aluguel e condomínio', 'c'], ['Marketing', 'c'], ['Tecnologia', 'c'], ['Despesas financeiras', 'c'], ['Serviços de terceiros', 'c']];
export const PAPEIS = { gerente: 'Gerente', diretor: 'Diretor', dono: 'Dono' };
const nid = (p = 'a') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const compAtual = (agora = new Date()) => hojeISO(agora).slice(0, 7);
export const nomeComp = (comp) => new Date(`${comp}-15T12:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

export function registra(db, quem, o) { (db.audit ||= []).unshift({ em: new Date().toISOString(), quem: quem || 'Você', o }); if (db.audit.length > 500) db.audit.length = 500; }
/** Reais inteiros de uma célula ("1.234", "1234,00", "-50"). */
export function inteiro(v, { negativo = false } = {}) {
  const c = centavos(v); if (!Number.isInteger(c)) throw new Error('Número inválido. Use só algarismos, ex.: 12.500');
  const r = Math.round(c / 100); if (!negativo && r < 0) throw new Error('O valor não pode ser negativo.'); return r;
}

// ------------------------------------------------------------------ fechamento: o mês fechado não muda
export const fechado = (db, comp = compAtual()) => !!db.fechados?.[comp];
export function exigeAberto(db, comp = compAtual()) { if (fechado(db, comp)) throw new Error(`${nomeComp(comp)} está fechado. Para mudar algo, o dono reabre o mês (fica na auditoria).`); }
export function fecharMes(db, comp, quem) {
  exigeAberto(db, comp); const falta = db.fech.filter((f) => !f.ok); if (falta.length) throw new Error(`Faltam ${falta.length} etapa(s): ${falta.map((f) => f.t).join('; ')}.`);
  (db.fechados ||= {})[comp] = { em: new Date().toISOString(), por: quem }; registra(db, quem, `fechou ${nomeComp(comp)}`);
}
export function reabrirMes(db, comp, quem, papel, motivo) {
  if (!fechado(db, comp)) throw new Error('Este mês não está fechado.');
  if (papel !== 'dono') throw new Error('Só o dono reabre um mês fechado.');
  if (!String(motivo || '').trim()) throw new Error('Diga o motivo para reabrir (fica na auditoria).');
  delete db.fechados[comp]; registra(db, quem, `reabriu ${nomeComp(comp)}: ${String(motivo).trim().slice(0, 140)}`);
}

// ------------------------------------------------------------------ aprovações por alçada e remessa
export const alcadaNecessaria = (db, c) => (c <= db.alcadas.gerente * 100 ? 'gerente' : c <= db.alcadas.diretor * 100 ? 'diretor' : 'dono');
const pode = (db, papel, c) => papel === 'dono' || (papel === 'diretor' && c <= db.alcadas.diretor * 100) || (papel === 'gerente' && c <= db.alcadas.gerente * 100);
/** Aprova os pagamentos que a alçada de quem aprova cobre; devolve { aprovados, recusados }. */
export function aprovar(db, ids, quem, papel) {
  exigeAberto(db); if (!PAPEIS[papel]) throw new Error('Escolha o papel de quem aprova.'); if (!String(quem || '').trim()) throw new Error('Diga quem está aprovando.');
  const aprovados = [], recusados = [];
  ids.forEach((id) => { const p = db.pags.find((x) => x.id === id); if (!p || p.st !== 'pendente') return; if (!pode(db, papel, p.c)) { recusados.push(p); return; } p.st = 'aprovado'; p.aprov = { quem, papel, em: new Date().toISOString() }; p.sel = false; aprovados.push(p); });
  if (aprovados.length) registra(db, `${quem} (${PAPEIS[papel]})`, `aprovou ${aprovados.length} pagamento(s): ${reais(aprovados.reduce((s, p) => s + p.c, 0))}`);
  if (recusados.length) registra(db, `${quem} (${PAPEIS[papel]})`, `tentou aprovar ${recusados.length} pagamento(s) acima da alçada`);
  return { aprovados, recusados };
}
/** Arquivo para pagar no banco (CSV para conferência e pagamento manual; o CNAB depende do convênio de cada banco). */
export function remessa(db, emp, quem) {
  const l = db.pags.filter((p) => p.st === 'aprovado' && (emp === 'todas' || p.emp === emp)); if (!l.length) throw new Error('Nenhum pagamento aprovado para a remessa.');
  const id = nid('r'), q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  l.forEach((p) => { p.st = 'remessa'; p.remessa = id; });
  registra(db, quem, `gerou a remessa ${id} com ${l.length} pagamento(s): ${reais(l.reduce((s, p) => s + p.c, 0))}`);
  return { id, csv: '﻿' + ['Empresa;Fornecedor;Descrição;Vencimento;Valor (R$);Aprovado por', ...l.map((p) => [p.emp, p.forn, p.desc, isoDe(p.venc).split('-').reverse().join('/'), (p.c / 100).toFixed(2).replace('.', ','), `${p.aprov?.quem || ''} (${PAPEIS[p.aprov?.papel] || ''})`].map(q).join(';'))].join('\r\n') };
}

// ------------------------------------------------------------------ extrato: importar, categorizar por regra, ligar a pagamento
export function importarExtrato(db, linhas, arquivo, quem) {
  const novas = [];
  linhas.forEach((l) => { const c = l.tipo === 'sai' ? -l.c : l.c; if (db.extrato.some((e) => (l.ref && e.ref === l.ref) || (e.c === c && e.dia === l.dia && norm(e.desc) === norm(l.desc)))) return; const e = { id: nid('e'), dia: l.dia, desc: String(l.desc || '').slice(0, 120), c, arquivo: String(arquivo || '').slice(0, 80) }; if (l.ref) e.ref = l.ref; db.extrato.push(e); novas.push(e); });
  registra(db, quem, `importou ${novas.length} linha(s) de extrato de ${arquivo || 'arquivo'} (${linhas.length - novas.length} repetida[s])`);
  return novas;
}
export const categoria = (db, e) => db.regras.find((r) => norm(e.desc).includes(norm(r.se)))?.cat || '';
export const sugerePagamento = (db, e) => (e.c < 0 && !e.pag ? db.pags.find((p) => ['aprovado', 'remessa'].includes(p.st) && p.c === -e.c && !db.extrato.some((x) => x.pag === p.id)) : null);
export function ligarPagamento(db, extId, pagId, quem) {
  const e = db.extrato.find((x) => x.id === extId), p = db.pags.find((x) => x.id === pagId);
  if (!e || !p) throw new Error('Linha ou pagamento não encontrado.'); if (e.pag) throw new Error('Esta linha já está ligada a um pagamento.');
  if (p.c !== -e.c) throw new Error('O valor do banco é diferente do pagamento.'); if (!['aprovado', 'remessa'].includes(p.st)) throw new Error('Só pagamento aprovado pode ser dado como pago.');
  e.pag = p.id; p.st = 'pago'; p.pagoEm = e.dia; registra(db, quem, `conciliou ${reais(p.c)} pago a ${p.forn} com o extrato (${e.desc})`);
}
export function desligarPagamento(db, extId, quem) { const e = db.extrato.find((x) => x.id === extId), p = e && db.pags.find((x) => x.id === e.pag); if (!p) throw new Error('Esta linha não está ligada.'); delete e.pag; p.st = p.remessa ? 'remessa' : 'aprovado'; delete p.pagoEm; registra(db, quem, `desfez a conciliação do pagamento a ${p.forn}`); }

// ------------------------------------------------------------------ rateio exato, lançado uma vez por mês, com estorno
export function ratear(v, pcts) {
  if (!Number.isInteger(v) || v < 0) throw new Error('Valor do rateio inválido.');
  if (pcts.some((p) => !Number.isInteger(p) || p < 0)) throw new Error('Use percentuais inteiros.');
  const s = pcts.reduce((a, b) => a + b, 0); if (s !== 100) throw new Error(`Os percentuais somam ${s}%; precisam dar 100%.`);
  const partes = pcts.map((p) => ({ v: Math.floor(v * p / 100), resto: (v * p) % 100 })); let falta = v - partes.reduce((a, x) => a + x.v, 0);
  [...partes].sort((a, b) => b.resto - a.resto).forEach((x) => { if (falta > 0 && x.resto > 0) { x.v++; falta--; } });
  return partes.map((x) => x.v);
}
export function lancarRateio(db, emps, comp, quem) {
  exigeAberto(db, comp); if (db.rateiosLancados?.[comp]) throw new Error(`O rateio de ${nomeComp(comp)} já foi lançado. Estorne antes de lançar de novo.`);
  const iCat = (c) => CATS.findIndex(([n]) => n === c), aplic = [];
  db.rateio.forEach((r, ri) => { const i = iCat(r.cat); if (i < 0 || CATS[i][1] !== 'c') throw new Error(`Escolha a conta de despesa de "${r.d}".`); ratear(r.v, r.p); });
  db.rateio.forEach((r) => { const i = iCat(r.cat), partes = ratear(r.v, r.p); emps.forEach((e, j) => { if (!partes[j]) return; db.orc[e.k][i].r += partes[j]; aplic.push({ emp: e.k, i, v: partes[j] }); }); });
  (db.rateiosLancados ||= {})[comp] = { em: new Date().toISOString(), por: quem, aplic };
  registra(db, quem, `lançou o rateio de ${nomeComp(comp)}: ${reais(db.rateio.reduce((s, r) => s + r.v, 0) * 100)} entre ${emps.length} empresa(s)`);
  return aplic;
}
export function estornarRateio(db, comp, quem) {
  exigeAberto(db, comp); const l = db.rateiosLancados?.[comp]; if (!l) throw new Error('Não há rateio lançado neste mês.');
  l.aplic.forEach((a) => { if (db.orc[a.emp]?.[a.i]) db.orc[a.emp][a.i].r -= a.v; }); delete db.rateiosLancados[comp];
  registra(db, quem, `estornou o rateio de ${nomeComp(comp)}`);
}

// ------------------------------------------------------------------ consolidado e indicadores (só do que está nos dados)
export function consolidado(db, emps) {
  const linhas = CATS.map(([c, t], i) => { const v = emps.map((e) => db.orc[e.k][i].r), el = (db.eliminacoes || []).reduce((s, x) => s + (x.receita === c || x.custo === c ? x.v : 0), 0); return { c, t, v, el, grupo: v.reduce((a, b) => a + b, 0) - el }; });
  const res = (vs) => linhas.reduce((s, l, k) => s + (l.t === 'r' ? 1 : -1) * vs[k], 0);
  const porEmp = emps.map((_, j) => res(linhas.map((l) => l.v[j]))), grupo = res(linhas.map((l) => l.grupo));
  return { linhas, porEmp, grupo, eliminado: (db.eliminacoes || []).reduce((s, x) => s + x.v, 0) };
}
/** Indicadores calculados com o que o sistema tem. O que precisa de dado que não existe aqui não aparece. */
export function indicadores(db, linhasOrc, caixa, emp) {
  const soma = (t, k) => linhasOrc.filter((x) => x.t === t).reduce((s, x) => s + x[k], 0), val = (c, k) => linhasOrc.find((x) => x.c === c)?.[k] || 0;
  const rec = soma('r', 'r'), cus = soma('c', 'r'), recO = soma('r', 'o'), cusO = soma('c', 'o');
  const ebitda = rec - cus + val('Despesas financeiras', 'r'), cmv = val('Custo das mercadorias', 'r');
  const pend = db.pags.filter((p) => p.st === 'pendente' && (emp === 'todas' || p.emp === emp)), aprov = db.pags.filter((p) => ['aprovado', 'remessa'].includes(p.st) && (emp === 'todas' || p.emp === emp));
  const ext = db.extrato, semCat = ext.filter((e) => !categoria(db, e) && !e.pag).length, min = Math.min(...caixa.fim), sMin = caixa.fim.indexOf(min);
  const pct = (a, b) => (b ? `${(a / b * 100).toFixed(1).replace('.', ',')}%` : '—');
  return [
    ['Receita real do mês', reais(rec * 100), `orçado ${reais(recO * 100)} (${pct(rec - recO, recO)} de desvio)`, 'orçado x real'],
    ['Margem bruta', pct(rec - cmv, rec), `receita − custo das mercadorias = ${reais((rec - cmv) * 100)}`, 'orçado x real'],
    ['EBITDA do mês', reais(ebitda * 100), `${pct(ebitda, rec)} da receita (antes das despesas financeiras)`, 'orçado x real'],
    ['Resultado operacional', reais((rec - cus) * 100), `orçado ${reais((recO - cusO) * 100)}`, 'orçado x real'],
    ['Menor saldo em 13 semanas', reais(min * 100), min < 0 ? `negativo na semana ${sMin + 1}` : `na semana ${sMin + 1}`, 'caixa 13 semanas'],
    ['Pagamentos esperando aprovação', String(pend.length), reais(pend.reduce((s, p) => s + p.c, 0)), 'aprovações'],
    ['Aprovados ainda não pagos', String(aprov.length), reais(aprov.reduce((s, p) => s + p.c, 0)), 'aprovações e extrato'],
    ['Extrato sem categoria', ext.length ? pct(semCat, ext.length) : '—', `${semCat} de ${ext.length} linha(s)`, 'conciliação'],
  ];
}

// ------------------------------------------------------------------ migração do formato 1
export function migrar(antigo, agora = new Date()) {
  if (!antigo || typeof antigo !== 'object') throw new Error('Dados ilegíveis.');
  if (antigo.formato >= FORMATO) return antigo;
  const d = JSON.parse(JSON.stringify(antigo)), comp = compAtual(agora), r = (v) => Math.round(Number(v) || 0);
  d.pags = (d.pags || []).map((p) => { const n = { id: p.id, emp: p.emp, forn: p.forn, desc: p.desc, c: Math.round((Number(p.valor) || 0) * 100), venc: Number(p.venc) || 0, st: p.st || 'pendente', sel: false }; if (n.st !== 'pendente') n.aprov = { quem: 'antes da atualização', papel: 'dono', em: new Date(agora).toISOString() }; return n; });
  d.extrato = (d.extrato || []).map((e, i) => ({ id: e.id || `e${i}`, dia: Number(e.dia) || 0, desc: e.desc || '', c: Math.round((Number(e.valor) || 0) * 100), arquivo: 'antes da atualização' }));
  Object.values(d.caixa || {}).forEach((cx) => { cx.saldo = r(cx.saldo); Object.keys(cx.linhas || {}).forEach((k) => { cx.linhas[k] = cx.linhas[k].map(r); }); });
  Object.keys(d.orc || {}).forEach((k) => { d.orc[k] = CATS.map(([c, t]) => { const x = d.orc[k].find((y) => y.c === c); return { c, t, o: r(x?.o), r: r(x?.r) }; }); });
  const MAPA = { 'aluguel': 'Aluguel e condomínio', 'tecnologia': 'Tecnologia', 'erp': 'Tecnologia', 'diretoria': 'Folha e encargos', 'contabil': 'Serviços de terceiros', 'juridic': 'Serviços de terceiros' };
  d.rateio = (d.rateio || []).map((x) => ({ d: x.d, v: r(x.v), p: (x.p || []).map(r), cat: x.cat || Object.entries(MAPA).find(([k]) => norm(x.d).includes(k))?.[1] || '' }));
  d.fechados = d.fechado ? { [comp]: { em: new Date(agora).toISOString(), por: 'antes da atualização' } } : {}; delete d.fechado;
  d.audit = (d.audit || []).map((a) => ({ em: a.em || '', quando: a.q, quem: a.quem, o: a.o }));
  d.eliminacoes = d.eliminacoes || []; d.rateiosLancados = d.rateiosLancados || {};
  d.alcadas = { gerente: r(d.alcadas?.gerente) || 20000, diretor: r(d.alcadas?.diretor) || 80000 };
  d.formato = FORMATO; d.migracao = { de: 1, em: new Date(agora).toISOString(), obs: 'Indicadores fixos e eliminação fixa do formato 1 foram retirados; a eliminação intercompany agora é cadastrada.' };
  return d;
}
