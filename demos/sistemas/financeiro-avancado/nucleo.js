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
import { centavos, reais, hojeISO, isoDe, diaDe, dataDe, lerExtrato, norm } from '../financeiro-comum/dinheiro.js';
export { centavos, reais, hojeISO, isoDe, diaDe, dataDe, lerExtrato };

export const FORMATO = 2;
export const CATS = [['Receita de vendas', 'r'], ['Receita de serviços', 'r'], ['Custo das mercadorias', 'c'], ['Fretes', 'c'], ['Folha e encargos', 'c'], ['Aluguel e condomínio', 'c'], ['Marketing', 'c'], ['Tecnologia', 'c'], ['Despesas financeiras', 'c'], ['Serviços de terceiros', 'c']];
export const PAPEIS = { gerente: 'Gerente', diretor: 'Diretor', dono: 'Dono' };
const nid = (p = 'a') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const compAtual = (agora = new Date()) => hojeISO(agora).slice(0, 7);
export const nomeComp = (comp) => new Date(`${comp}-15T12:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

/** Registro de auditoria: quem, quando, o quê e, quando houver, o registro afetado (ref) e os valores antes e depois. */
export function registra(db, quem, o, extra = {}) { const a = { em: new Date().toISOString(), quem: quem || 'Você', o }; ['ref', 'antes', 'depois'].forEach((k) => { if (extra[k] !== undefined && extra[k] !== '') a[k] = String(extra[k]).slice(0, 160); }); (db.audit ||= []).unshift(a); if (db.audit.length > 500) db.audit.length = 500; }
/** Reais inteiros de uma célula ("1.234", "1234,00", "-50"). */
export function inteiro(v, { negativo = false } = {}) {
  const c = centavos(v); if (!Number.isInteger(c)) throw new Error('Número inválido. Use só algarismos, ex.: 12.500');
  const r = Math.round(c / 100); if (!negativo && r < 0) throw new Error('O valor não pode ser negativo.'); return r;
}

// ------------------------------------------------------------------ fechamento: o mês fechado não muda
export const fechado = (db, comp = compAtual()) => !!db.fechados?.[comp];
export function exigeAberto(db, comp = compAtual()) { if (fechado(db, comp)) throw new Error(`${nomeComp(comp)} está fechado. Para mudar algo, o dono reabre o mês (fica na auditoria).`); }
export function fecharMes(db, comp, quem, papel, justificativas = {}) {
  exigeAberto(db, comp); exige(db, papel, 'fechar'); const falta = db.fech.filter((f) => !f.ok); if (falta.length) throw new Error(`Faltam ${falta.length} etapa(s): ${falta.map((f) => f.t).join('; ')}.`);
  const v = verificacoes(db, comp), sem = v.filter((x) => !x.ok && !String(justificativas[x.id] || '').trim());
  if (sem.length) throw new Error(`Verificações sem justificativa: ${sem.map((x) => `${x.t} (${x.det})`).join('; ')}.`);
  const verif = v.map((x) => ({ ...x, just: x.ok ? '' : String(justificativas[x.id]).trim().slice(0, 160) }));
  (db.fechados ||= {})[comp] = { em: new Date().toISOString(), por: quem, verif }; registra(db, quem, `fechou ${nomeComp(comp)}${verif.some((x) => x.just) ? ` com ${verif.filter((x) => x.just).length} justificativa(s)` : ''}`, { ref: `fech:${comp}`, antes: 'aberto', depois: 'fechado' });
}
export function reabrirMes(db, comp, quem, papel, motivo) {
  if (!fechado(db, comp)) throw new Error('Este mês não está fechado.');
  if (papel !== 'dono') throw new Error('Só o dono reabre um mês fechado.');
  if (!String(motivo || '').trim()) throw new Error('Diga o motivo para reabrir (fica na auditoria).');
  delete db.fechados[comp]; registra(db, quem, `reabriu ${nomeComp(comp)}: ${String(motivo).trim().slice(0, 140)}`, { ref: `fech:${comp}`, antes: 'fechado', depois: 'aberto' });
}

// ------------------------------------------------------------------ aprovações por alçada e remessa
export const alcadaNecessaria = (db, c) => (c <= db.alcadas.gerente * 100 ? 'gerente' : c <= db.alcadas.diretor * 100 ? 'diretor' : 'dono');
const pode = (db, papel, c) => papel === 'dono' || (papel === 'diretor' && c <= db.alcadas.diretor * 100) || (papel === 'gerente' && c <= db.alcadas.gerente * 100);
/** Aprova os pagamentos que a alçada de quem aprova cobre; devolve { aprovados, recusados }. */
export function aprovar(db, ids, quem, papel) {
  exigeAberto(db); if (!PAPEIS[papel]) throw new Error('Escolha o papel de quem aprova.'); if (!String(quem || '').trim()) throw new Error('Diga quem está aprovando.'); exige(db, papel, 'aprovar');
  const aprovados = [], recusados = [], proprios = [];
  ids.forEach((id) => { const p = db.pags.find((x) => x.id === id); if (!p || p.st !== 'pendente') return; if (!pode(db, papel, p.c)) { recusados.push(p); return; } if (!db.politica?.autoAprovacao && p.criadoPor && norm(p.criadoPor) === norm(quem)) { proprios.push(p); return; } p.st = 'aprovado'; p.aprov = { quem, papel, em: new Date().toISOString() }; p.sel = false; (p.hist ||= []).push({ em: p.aprov.em, quem, o: `aprovou (${PAPEIS[papel]})` }); aprovados.push(p); });
  if (aprovados.length) registra(db, `${quem} (${PAPEIS[papel]})`, `aprovou ${aprovados.length} pagamento(s): ${reais(aprovados.reduce((s, p) => s + p.c, 0))}`, { ref: `pag:${aprovados.map((p) => p.id).join(',')}`, antes: 'pendente', depois: 'aprovado' });
  if (recusados.length) registra(db, `${quem} (${PAPEIS[papel]})`, `tentou aprovar ${recusados.length} pagamento(s) acima da alçada`);
  if (proprios.length) registra(db, `${quem} (${PAPEIS[papel]})`, `tentou aprovar ${proprios.length} pagamento(s) que lançou (bloqueado pela política)`);
  return { aprovados, recusados, proprios };
}
/** Arquivo para pagar no banco (CSV para conferência e pagamento manual; o CNAB depende do convênio de cada banco). */
// remessa: com baixa parcial, só o que falta vai para o banco
export function remessa(db, emp, quem, papel) {
  exige(db, papel, 'exportar'); const l = db.pags.filter((p) => p.st === 'aprovado' && faltaTitulo(p) > 0 && (emp === 'todas' || p.emp === emp)); if (!l.length) throw new Error('Nenhum pagamento aprovado para a remessa.');
  const id = nid('r'), q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  l.forEach((p) => { p.st = 'remessa'; p.remessa = id; (p.hist ||= []).push({ em: new Date().toISOString(), quem, o: `entrou na remessa ${id} (arquivo CSV para pagar no banco; não é envio automático)` }); });
  registra(db, quem, `gerou a remessa ${id} com ${l.length} pagamento(s): ${reais(l.reduce((s, p) => s + faltaTitulo(p), 0))}`);
  return { id, csv: '﻿' + ['Empresa;Fornecedor;Descrição;Vencimento;Valor (R$);Aprovado por', ...l.map((p) => [p.emp, p.forn, p.desc, isoDe(p.venc).split('-').reverse().join('/'), (faltaTitulo(p) / 100).toFixed(2).replace('.', ','), `${p.aprov?.quem || ''} (${PAPEIS[p.aprov?.papel] || ''})`].map(q).join(';'))].join('\r\n') };
}

// ------------------------------------------------------------------ extrato: importar, categorizar por regra, ligar a pagamento
// linha repetida = mesma conta + mesma referência do banco, ou mesmo valor, dia e descrição
export function importarExtrato(db, linhas, arquivo, quem, conta = '') {
  const novas = []; if (conta && !(db.contas || []).some((c) => c.id === conta)) throw new Error('Conta bancária não encontrada.');
  linhas.forEach((l) => { const c = l.tipo === 'sai' ? -l.c : l.c; if (db.extrato.some((e) => (e.conta || '') === (conta || '') && ((l.ref && e.ref === l.ref) || (e.c === c && e.dia === l.dia && norm(e.desc) === norm(l.desc))))) return; const e = { id: nid('e'), dia: l.dia, desc: String(l.desc || '').slice(0, 120), c, arquivo: String(arquivo || '').slice(0, 80) }; if (l.ref) e.ref = l.ref; if (conta) e.conta = conta; db.extrato.push(e); novas.push(e); });
  registra(db, quem, `importou ${novas.length} linha(s) de extrato de ${arquivo || 'arquivo'} (${linhas.length - novas.length} repetida[s])`);
  return novas;
}
export const categoria = (db, e) => db.regras.find((r) => norm(e.desc).includes(norm(r.se)))?.cat || '';
export const sugerePagamento = (db, e) => (e.c < 0 && !e.pag && !e.mov ? db.pags.find((p) => ['aprovado', 'remessa', 'pago'].includes(p.st) && (((p.st !== 'pago') && faltaTitulo(p) === -e.c) || (db.movs || []).some((m) => m.ref?.k === 'pag' && m.ref.id === p.id && !m.ext && m.c === e.c))) || null : null);
export function ligarPagamento(db, extId, pagId, quem, papel) {
  const e = db.extrato.find((x) => x.id === extId), p = db.pags.find((x) => x.id === pagId);
  if (!e || !p) throw new Error('Linha ou pagamento não encontrado.'); if (e.pag || e.mov) throw new Error('Esta linha já está ligada a um pagamento.');
  if (!['aprovado', 'remessa', 'pago'].includes(p.st)) throw new Error('Só pagamento aprovado pode ser dado como pago.');
  if (!(db.movs || []).some((m) => m.ref?.k === 'pag' && m.ref.id === p.id && !m.ext && m.c === e.c) && faltaTitulo(p) !== -e.c) throw new Error('O valor do banco é diferente do que falta pagar.');
  return conciliarTitulo(db, extId, 'pag', pagId, quem, papel);
}
export function desligarPagamento(db, extId, quem, papel) { const e = db.extrato.find((x) => x.id === extId); if (!e?.pag) throw new Error('Esta linha não está ligada.'); desconciliar(db, extId, quem, papel); }

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
  const ext = db.extrato, semCat = ext.filter((e) => !categoria(db, e) && !e.pag && !e.rec && !e.mov).length, min = Math.min(...caixa.fim), sMin = caixa.fim.indexOf(min);
  const pct = (a, b) => (b ? `${(a / b * 100).toFixed(1).replace('.', ',')}%` : '—'), temOrc = linhasOrc.some((x) => x.o || x.r);
  const ok = (x) => emp === 'todas' || x.emp === emp, contas = (db.contas || []).filter(ok), recs = (db.recs || []).filter((r) => ok(r) && r.st !== 'cancelado');
  const vencido = recs.filter((r) => r.venc < 0).reduce((s, r) => s + faltaTitulo(r), 0), aberto = recs.reduce((s, r) => s + faltaTitulo(r), 0);
  const porCli = {}; recs.forEach((r) => { porCli[r.cliente] = (porCli[r.cliente] || 0) + faltaTitulo(r); }); const top = Object.entries(porCli).sort((a, b) => b[1] - a[1])[0];
  const comp30 = db.pags.filter((p) => ok(p) && ['pendente', 'aprovado', 'remessa'].includes(p.st) && p.venc <= 30).reduce((s, p) => s + faltaTitulo(p), 0);
  const extra = [
    ['Disponível em conta', contas.length ? reais(contas.reduce((s, c) => s + saldoConta(db, c.id), 0)) : '—', contas.length ? `${contas.length} conta(s) bancária(s), hoje` : 'sem conta bancária cadastrada (Tesouraria)', 'tesouraria', 'saldo inicial + baixas + transferências de cada conta'],
    ['Vencido a receber', recs.length ? reais(vencido) : '—', recs.length ? `${pct(vencido, aberto)} do que está em aberto (${reais(aberto)})` : 'sem contas a receber lançadas', 'contas a receber', 'soma do que falta receber com vencimento antes de hoje'],
    ['Compromissos a pagar (30 dias)', reais(comp30), 'pendentes, aprovados e na remessa que vencem até 30 dias', 'contas a pagar', 'soma do que falta pagar com vencimento até 30 dias'],
    ['Concentração de recebimentos', top && aberto ? pct(top[1], aberto) : '—', top && aberto ? `maior cliente: ${top[0]}` : 'sem contas a receber em aberto', 'contas a receber', 'maior cliente ÷ total em aberto a receber'],
  ];
  if (!temOrc) return [['Orçado x real', '—', 'sem orçado nem real lançados neste mês', 'orçado x real', 'receita, margem e EBITDA saem do orçado x real'], ['Menor saldo em 13 semanas', reais(min * 100), min < 0 ? `negativo na semana ${sMin + 1}` : `na semana ${sMin + 1}`, 'fluxo de caixa', 'menor saldo final semanal do planejamento'], ...extra];
  return [
    ['Receita real do mês', reais(rec * 100), `orçado ${reais(recO * 100)} (${pct(rec - recO, recO)} de desvio)`, 'orçado x real', 'soma das contas de receita (real)'],
    ['Margem bruta', pct(rec - cmv, rec), rec ? `receita − custo das mercadorias = ${reais((rec - cmv) * 100)}` : 'sem receita real no mês', 'orçado x real', '(receita − custo das mercadorias) ÷ receita'],
    ['EBITDA do mês', reais(ebitda * 100), rec ? `${pct(ebitda, rec)} da receita (antes das despesas financeiras)` : 'sem receita real no mês', 'orçado x real', 'receita − custos + despesas financeiras (sem depreciação, que não é lançada aqui)'],
    ['Resultado operacional', reais((rec - cus) * 100), `orçado ${reais((recO - cusO) * 100)}`, 'orçado x real', 'receitas − custos e despesas (real)'],
    ['Desvio orçamentário', pct((rec - cus) - (recO - cusO), Math.abs(recO - cusO)), `${reais(((rec - cus) - (recO - cusO)) * 100)} no resultado`, 'orçado x real', '(resultado real − orçado) ÷ |resultado orçado|'],
    ['Menor saldo em 13 semanas', reais(min * 100), min < 0 ? `negativo na semana ${sMin + 1}` : `na semana ${sMin + 1}`, 'fluxo de caixa', 'menor saldo final semanal do planejamento'],
    ['Pagamentos esperando aprovação', String(pend.length), reais(pend.reduce((s, p) => s + p.c, 0)), 'contas a pagar', 'pagamentos lançados ainda sem aprovação'],
    ['Aprovados ainda não pagos', String(aprov.length), reais(aprov.reduce((s, p) => s + faltaTitulo(p), 0)), 'contas a pagar e extrato', 'aprovados e na remessa, pelo que falta pagar'],
    ['Extrato sem categoria', ext.length ? pct(semCat, ext.length) : '—', ext.length ? `${semCat} de ${ext.length} linha(s)` : 'nenhum extrato importado', 'conciliação', 'linhas sem regra nem título ligado ÷ linhas'],
    ...extra,
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

// ------------------------------------------------------------------ fluxo de caixa de 13 semanas (planejamento, em reais inteiros)
// A projeção usa só as linhas do planejamento. Os pagamentos lançados para aprovação são compromissos: aparecem na lista e
// num alerta quando passam do previsto, mas não somam no saldo (senão o mesmo dinheiro contaria duas vezes).
export const SEMANAS = 13;
export const CENARIOS = { base: [1, 1], pess: [85, 100], otim: [108, 100] };
export const CONTRATOS = 'Contratos recorrentes';
/** Semana i: começa hoje + 7i. Devolve { ini, fim } em dias relativos e o rótulo "23/10–29/10". */
export function semana(i, agora = new Date()) {
  const d = (n) => { const x = new Date(agora); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() + n); return x.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); };
  return { ini: i * 7, fim: i * 7 + 6, rotulo: `${d(i * 7)}–${d(i * 7 + 6)}` };
}
/** Soma as empresas e aplica o cenário oficial (percentual só nas entradas variáveis, contratos ficam como estão). */
export function linhasBase(fontes, entra, sai, cenario = 'base') {
  const [num, den] = CENARIOS[cenario] || CENARIOS.base, l = {};
  [...entra, ...sai].forEach((r) => { l[r] = Array.from({ length: SEMANAS }, (_, i) => { const s = fontes.reduce((a, f) => a + (f.linhas[r]?.[i] || 0), 0); return entra.includes(r) && r !== CONTRATOS ? Math.round(s * num / den) : s; }); });
  return { saldo: fontes.reduce((a, f) => a + (f.saldo || 0), 0), linhas: l };
}
const desloca = (arr, k) => { if (!k) return [...arr]; const out = Array(arr.length).fill(0); arr.forEach((v, i) => { const j = i + k; if (j >= 0 && j < arr.length) out[j] += v; else if (j < 0) out[0] += v; }); return out; };
/**
 * Simulação: devolve linhas novas sem tocar nas originais. sim = { receitaPct, atrasoReceb, adiarForn, cortePct, despesa: { v, semana }, investimento: { v, semana } }.
 * O que sai do horizonte de 13 semanas por atraso fica em sim.foraDoHorizonte (para avisar).
 */
export function simular(base, entra, sai, sim = {}) {
  const l = JSON.parse(JSON.stringify(base.linhas)), fora = { entra: 0, sai: 0 };
  const pct = (v, p) => Math.round(v * (100 + p) / 100);
  if (sim.receitaPct) entra.filter((r) => r !== CONTRATOS).forEach((r) => { l[r] = l[r].map((v) => pct(v, sim.receitaPct)); });
  if (sim.atrasoReceb) { const r = entra[0], antes = l[r].reduce((a, b) => a + b, 0); l[r] = desloca(l[r], sim.atrasoReceb); fora.entra = antes - l[r].reduce((a, b) => a + b, 0); }
  if (sim.adiarForn) { const r = sai[0], antes = l[r].reduce((a, b) => a + b, 0); l[r] = desloca(l[r], sim.adiarForn); fora.sai = antes - l[r].reduce((a, b) => a + b, 0); }
  if (sim.cortePct) sai.filter((r) => !/impost|financiam/i.test(r)).forEach((r) => { l[r] = l[r].map((v) => pct(v, -Math.abs(sim.cortePct))); });
  const extra = Array(SEMANAS).fill(0);
  [sim.despesa, sim.investimento].forEach((x) => { if (x && x.v > 0 && x.semana >= 0 && x.semana < SEMANAS) extra[x.semana] += Math.round(x.v); });
  if (extra.some(Boolean)) l['Simulação (novas saídas)'] = extra;
  return { saldo: base.saldo, linhas: l, fora };
}
/** Projeta semana a semana. opc = { semanas, excluir: [linhas fora do filtro] }. */
export function projetar(dados, entra, sai, opc = {}) {
  const n = Math.min(SEMANAS, opc.semanas || SEMANAS), fora = new Set(opc.excluir || []);
  const saiTodas = [...sai, ...Object.keys(dados.linhas).filter((r) => !entra.includes(r) && !sai.includes(r))];
  const ent = [], sa = [], ini = [], fim = []; let s = dados.saldo;
  for (let i = 0; i < n; i++) {
    ini.push(s); const e = entra.filter((r) => !fora.has(r)).reduce((a, r) => a + (dados.linhas[r]?.[i] || 0), 0), o = saiTodas.filter((r) => !fora.has(r)).reduce((a, r) => a + (dados.linhas[r]?.[i] || 0), 0);
    ent.push(e); sa.push(o); s += e - o; fim.push(s);
  }
  const totEnt = ent.reduce((a, b) => a + b, 0), totSai = sa.reduce((a, b) => a + b, 0), min = Math.min(...fim);
  const porLinha = (rs) => rs.filter((r) => !fora.has(r)).map((r) => [r, (dados.linhas[r] || []).slice(0, n).reduce((a, b) => a + b, 0)]).filter(([, v]) => v).sort((a, b) => b[1] - a[1]);
  return { n, saldo: dados.saldo, ini, fim, ent, sai: sa, totEnt, totSai, final: fim[n - 1], min, semMin: fim.indexOf(min), entradas: porLinha(entra), saidas: porLinha(saiTodas) };
}
/**
 * Alertas do fluxo, cada um com motivo, valor, semana e para onde ir. Só condições que dá para conferir nos dados:
 * saldo abaixo do limite (ou negativo), pagamento de alto valor (acima da alçada do gerente) vencendo em 7 dias,
 * semana com saídas muito acima da média, e compromissos lançados que passam do previsto para fornecedores na semana.
 */
export function alertasFluxo(p, { limite = 0, pags = [], alcadaGerente = 20000, fornecedores = [] } = {}) {
  const a = [];
  // semanas com o mesmo problema viram um alerta só (com a primeira semana e o pior saldo), para os outros riscos não sumirem da lista
  const junta = (idx, tipo, motivo, frase) => { if (!idx.length) return; const pior = Math.min(...idx.map((i) => p.fim[i])); a.push({ tipo, motivo, semana: idx[0], valor: pior, semanas: idx.map((i) => i + 1), txt: idx.length === 1 ? `${frase} na semana ${idx[0] + 1}.` : `${frase} em ${idx.length} semanas, a partir da semana ${idx[0] + 1} (pior: semana ${p.fim.indexOf(pior) + 1}).`, ir: 'tabela' }); };
  junta(p.fim.map((v, i) => (v < 0 ? i : -1)).filter((i) => i >= 0), 'erro', 'Saldo negativo', 'O saldo fica negativo');
  if (limite) junta(p.fim.map((v, i) => (v >= 0 && v < limite ? i : -1)).filter((i) => i >= 0), 'atencao', 'Abaixo do limite de segurança', 'O saldo fica abaixo do limite de segurança');
  pags.filter((x) => ['pendente', 'aprovado', 'remessa'].includes(x.st) && x.venc >= 0 && x.venc <= 7 && x.c > alcadaGerente * 100).forEach((x) => a.push({ tipo: 'atencao', motivo: 'Pagamento alto vencendo', semana: Math.floor(x.venc / 7), valorC: x.c, txt: `${x.forn}: ${x.desc} vence em ${x.venc} dia(s) (${x.st}).`, ir: 'aprovar', id: x.id }));
  const media = p.n ? p.sai.reduce((s, v) => s + v, 0) / p.n : 0;
  p.sai.forEach((v, i) => { if (media && v > media * 1.5) a.push({ tipo: 'atencao', motivo: 'Saídas concentradas', semana: i, valor: v, txt: `A semana ${i + 1} concentra ${Math.round(v / media * 100)}% da média semanal de saídas.`, ir: 'tabela' }); });
  const comp = Array(SEMANAS).fill(0); pags.filter((x) => ['pendente', 'aprovado', 'remessa'].includes(x.st) && x.venc >= 0 && x.venc < SEMANAS * 7).forEach((x) => { comp[Math.floor(x.venc / 7)] += x.c; });
  comp.forEach((c, i) => { const prev = (fornecedores[i] || 0) * 100; if (c && c > prev) a.push({ tipo: 'atencao', motivo: 'Compromissos acima do previsto', semana: i, valorC: c - prev, txt: `Pagamentos lançados na semana ${i + 1} passam do previsto para fornecedores em ${reais(c - prev)}.`, ir: 'aprovar' }); });
  const peso = { erro: 0, atencao: 1 };
  return a.sort((x, y) => peso[x.tipo] - peso[y.tipo] || x.semana - y.semana);
}

// ================================================================== operação: permissões, contas a pagar e a receber, tesouraria
// Regras:
// - permissão por papel e operação; o dono tem todas e é o único que muda as permissões dos outros;
// - quem lançou um pagamento não aprova o próprio (política padrão; o dono pode liberar);
// - rejeitar exige motivo; pagamento rejeitado ou cancelado nunca vira aprovado;
// - cada conta bancária tem saldo inicial com data; saldo = inicial + movimentos (baixas, transferências), nunca digitado;
// - toda baixa (inteira ou parcial) gera um movimento na conta escolhida: juros e multa somam, desconto tira;
// - transferência entre contas da mesma empresa = dois movimentos que se anulam: não é receita nem despesa;
// - conciliar liga a linha do extrato a um movimento que já existe ou cria a baixa na data do banco; uma linha e um
//   movimento só se ligam uma vez; título com baixa manual não ganha uma segunda baixa pelo extrato;
// - valores em centavos; datas em dias relativos a hoje; nada disso mexe no planejamento das 13 semanas.
export const OPS = { criar: 'lançar e editar títulos', aprovar: 'aprovar e rejeitar pagamentos', pagar: 'dar baixa (pagar e receber)', conciliar: 'conciliar o extrato', exportar: 'exportar e gerar remessa', tesouraria: 'cadastrar contas e transferir', fechar: 'fechar o mês', auditoria: 'ver a auditoria' };
export const PERMS_PADRAO = {
  gerente: { criar: true, aprovar: true, pagar: false, conciliar: true, exportar: true, tesouraria: false, fechar: false, auditoria: false },
  diretor: { criar: true, aprovar: true, pagar: true, conciliar: true, exportar: true, tesouraria: true, fechar: true, auditoria: true },
};
export const podeFazer = (db, papel, op) => papel === 'dono' || !!(db.perms?.[papel] || PERMS_PADRAO[papel])?.[op];
export function exige(db, papel, op) {
  if (!PAPEIS[papel]) throw new Error('Escolha o papel de quem está usando.');
  if (!podeFazer(db, papel, op)) throw new Error(`${PAPEIS[papel]} não tem permissão para ${OPS[op]}. Peça ao dono em Equipe e alçadas.`);
}
export function definirPermissao(db, papelQuem, alvo, op, valor, quem) {
  if (papelQuem !== 'dono') throw new Error('Só o dono muda as permissões.');
  if (!PERMS_PADRAO[alvo] || !OPS[op]) throw new Error('Permissão inválida.');
  db.perms ||= JSON.parse(JSON.stringify(PERMS_PADRAO)); db.perms[alvo] ||= { ...PERMS_PADRAO[alvo] };
  const antes = podeFazer(db, alvo, op); db.perms[alvo][op] = !!valor;
  registra(db, quem, `mudou a permissão de ${PAPEIS[alvo]} para ${OPS[op]}`, { ref: `perm:${alvo}:${op}`, antes: antes ? 'sim' : 'não', depois: valor ? 'sim' : 'não' });
}
export function definirPolitica(db, papelQuem, chave, valor, quem) {
  if (papelQuem !== 'dono') throw new Error('Só o dono muda a política de aprovação.');
  if (!['autoAprovacao'].includes(chave)) throw new Error('Política inválida.');
  const antes = !!db.politica?.[chave]; (db.politica ||= {})[chave] = !!valor;
  registra(db, quem, 'mudou a política: quem lança pode aprovar o próprio pagamento', { ref: `politica:${chave}`, antes: antes ? 'sim' : 'não', depois: valor ? 'sim' : 'não' });
}

const hist = (t, quem, o) => { (t.hist ||= []).push({ em: new Date().toISOString(), quem: quem || 'Você', o }); };
const compDoDia = (dia) => hojeISO(dataDe(dia)).slice(0, 7);
const inteiroC = (v, nome) => { if (v === undefined || v === null || v === '') return 0; if (!Number.isInteger(v) || v < 0) throw new Error(`${nome} inválido.`); return v; };
export const baixado = (t) => (t.baixas || []).reduce((s, b) => s + b.c, 0);
export const faltaTitulo = (t) => (['cancelado', 'rejeitado', 'pago'].includes(t.st) ? 0 : Math.max(0, t.c - baixado(t)));
/** Situação do recebível: cancelado, quitado, atrasado, vence hoje ou aberto (parcial quando já recebeu uma parte). */
export function situacaoRec(r) {
  const p = baixado(r), falta = faltaTitulo(r);
  if (r.st === 'cancelado') return { st: 'cancelado', p, falta: 0 };
  if (!falta) return { st: 'quitado', p, falta };
  return { st: r.venc < 0 ? 'atrasado' : r.venc === 0 ? 'hoje' : 'aberto', p, falta, parcial: p > 0 };
}
const lista = (db, k) => (k === 'pag' ? db.pags : (db.recs ||= []));
function titulo(db, k, id) { const t = lista(db, k).find((x) => x.id === id); if (!t) throw new Error(k === 'pag' ? 'Pagamento não encontrado.' : 'Recebível não encontrado.'); return t; }
/** Parcelas de mesmo valor total: as primeiras levam o centavo que sobra; vencimentos mês a mês no mesmo dia (31 → último dia). */
function parcelar(c, n, venc, agora = new Date()) {
  const base = dataDe(venc, agora); return Array.from({ length: n }, (_, i) => {
    const alvo = new Date(base.getFullYear(), base.getMonth() + i, 1, 12), ult = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate(); alvo.setDate(Math.min(base.getDate(), ult));
    return { c: Math.floor(c / n) + (i < c % n ? 1 : 0), venc: diaDe(hojeISO(alvo), agora) };
  });
}
function validaTitulo(d, rotulo) {
  if (!Number.isInteger(d.c) || d.c <= 0) throw new Error('Digite um valor maior que zero.');
  if (!String(d.quem || '').trim() || !String(d.desc || '').trim()) throw new Error(`Preencha ${rotulo} e o que é.`);
  if (!Number.isInteger(d.venc)) throw new Error('Escolha o vencimento.');
  const n = Number(d.parcelas) || 1; if (!Number.isInteger(n) || n < 1 || n > 36) throw new Error('Parcelas de 1 a 36.'); if (n > d.c) throw new Error('Valor pequeno demais para tantas parcelas.');
  return n;
}

// ------------------------------------------------------------------ contas a pagar: lançar, aprovar, rejeitar, cancelar
export function novoPagamento(db, d, quem, papel) {
  exige(db, papel, 'criar'); exigeAberto(db); const n = validaTitulo({ ...d, quem: d.forn }, 'o fornecedor');
  if (d.cat && !CATS.some(([c, t]) => c === d.cat && t === 'c')) throw new Error('Escolha uma conta de despesa.');
  const grupo = n > 1 ? nid('g') : undefined;
  const criados = parcelar(d.c, n, d.venc).map((p, i) => { const x = { id: nid('p'), emp: d.emp, forn: String(d.forn).trim().slice(0, 80), desc: (String(d.desc).trim() + (n > 1 ? ` (${i + 1}/${n})` : '')).slice(0, 120), c: p.c, venc: p.venc, st: 'pendente', sel: false, criadoPor: quem, baixas: [] }; if (d.cat) x.cat = d.cat; if (grupo) { x.grupo = grupo; x.parcela = { n: i + 1, de: n, total: d.c }; } hist(x, quem, `lançou ${reais(p.c)}${n > 1 ? ` (parcela ${i + 1} de ${n})` : ''}`); db.pags.push(x); return x; });
  registra(db, quem, `lançou pagamento para aprovar: ${d.forn} · ${reais(d.c)}${n > 1 ? ` em ${n} parcelas` : ''}`, { ref: `pag:${criados[0].id}`, depois: reais(d.c) });
  return criados;
}
export function rejeitar(db, ids, quem, papel, motivo) {
  exigeAberto(db); exige(db, papel, 'aprovar'); const m = String(motivo || '').trim(); if (!m) throw new Error('Diga o motivo da rejeição (fica no histórico).');
  const feitos = [];
  ids.forEach((id) => { const p = db.pags.find((x) => x.id === id); if (!p || p.st !== 'pendente') return; p.st = 'rejeitado'; p.sel = false; p.rejeicao = { quem, papel, em: new Date().toISOString(), motivo: m.slice(0, 160) }; hist(p, quem, `rejeitou: ${m.slice(0, 160)}`); feitos.push(p); });
  if (feitos.length) registra(db, `${quem} (${PAPEIS[papel]})`, `rejeitou ${feitos.length} pagamento(s): ${m.slice(0, 120)}`, { ref: `pag:${feitos.map((p) => p.id).join(',')}`, antes: 'pendente', depois: 'rejeitado' });
  return feitos;
}
export function cancelarPagamento(db, id, quem, papel, motivo) {
  exigeAberto(db); exige(db, papel, 'criar'); const p = titulo(db, 'pag', id), m = String(motivo || '').trim();
  if (!m) throw new Error('Diga o motivo do cancelamento.'); if (['pago', 'cancelado', 'rejeitado'].includes(p.st)) throw new Error('Este pagamento não pode ser cancelado.');
  if (baixado(p)) throw new Error('Já há baixa neste pagamento: estorne a baixa antes de cancelar.');
  const antes = p.st; p.st = 'cancelado'; p.sel = false; p.cancelamento = { quem, em: new Date().toISOString(), motivo: m.slice(0, 160) }; hist(p, quem, `cancelou: ${m}`);
  registra(db, quem, `cancelou o pagamento a ${p.forn} (${reais(p.c)}): ${m.slice(0, 120)}`, { ref: `pag:${p.id}`, antes, depois: 'cancelado' });
}

// ------------------------------------------------------------------ contas a receber
export function novoRecebivel(db, d, quem, papel) {
  exige(db, papel, 'criar'); exigeAberto(db); const n = validaTitulo({ ...d, quem: d.cliente }, 'o cliente');
  const grupo = n > 1 ? nid('g') : undefined;
  const criados = parcelar(d.c, n, d.venc).map((p, i) => { const x = { id: nid('r'), emp: d.emp, cliente: String(d.cliente).trim().slice(0, 80), desc: (String(d.desc).trim() + (n > 1 ? ` (${i + 1}/${n})` : '')).slice(0, 120), c: p.c, venc: p.venc, st: 'aberto', criadoPor: quem, baixas: [] }; if (grupo) { x.grupo = grupo; x.parcela = { n: i + 1, de: n, total: d.c }; } hist(x, quem, `lançou ${reais(p.c)} a receber`); (db.recs ||= []).push(x); return x; });
  registra(db, quem, `lançou a receber: ${d.cliente} · ${reais(d.c)}${n > 1 ? ` em ${n} parcelas` : ''}`, { ref: `rec:${criados[0].id}`, depois: reais(d.c) });
  return criados;
}
export function cancelarRecebivel(db, id, quem, papel, motivo) {
  exigeAberto(db); exige(db, papel, 'criar'); const r = titulo(db, 'rec', id), m = String(motivo || '').trim(); if (!m) throw new Error('Diga o motivo do cancelamento.');
  if (r.st === 'cancelado' || !faltaTitulo(r)) throw new Error('Este recebível não está em aberto.');
  const falta = faltaTitulo(r); r.st = 'cancelado'; r.cancelamento = { quem, em: new Date().toISOString(), motivo: m.slice(0, 160) }; hist(r, quem, `cancelou o saldo de ${reais(falta)}: ${m}`);
  registra(db, quem, `cancelou ${reais(falta)} a receber de ${r.cliente}: ${m.slice(0, 120)}`, { ref: `rec:${r.id}`, antes: reais(falta), depois: 'cancelado' });
}

// ------------------------------------------------------------------ encargos (multa e juros de atraso) e baixas
/** Multa e juros sugeridos para um título atrasado, pelas regras dos Ajustes (multa % uma vez, juros % ao mês pro rata dia). */
export function encargos(db, t, c = faltaTitulo(t)) {
  const atraso = Math.max(0, -t.venc), r = db.encargos || { multaPct: 2, jurosMesPct: 1 };
  if (!atraso) return { atraso: 0, multa: 0, juros: 0 };
  return { atraso, multa: Math.round(c * r.multaPct / 100), juros: Math.round(c * r.jurosMesPct / 100 * atraso / 30) };
}
/**
 * Baixa de um título (k = 'pag' ou 'rec'), inteira ou parcial: c é o principal; juros, multa e desconto ficam detalhados;
 * o movimento na conta é o total pago ou recebido. Pagamento só depois de aprovado. op = permissão exigida.
 */
export function baixar(db, k, id, d, quem, papel, op = 'pagar') {
  exige(db, papel, op); const t = titulo(db, k, id), dia = Number.isInteger(d.dia) ? d.dia : 0;
  if (dia > 0) throw new Error('A data da baixa não pode ser no futuro.'); exigeAberto(db, compDoDia(dia));
  if (k === 'pag' && !['aprovado', 'remessa'].includes(t.st)) throw new Error(t.st === 'pendente' ? 'Este pagamento ainda não foi aprovado.' : 'Este pagamento não está em aberto.');
  if (k === 'rec' && t.st === 'cancelado') throw new Error('Este recebível foi cancelado.');
  const falta = faltaTitulo(t); if (!Number.isInteger(d.c) || d.c <= 0) throw new Error('Digite o valor da baixa.'); if (d.c > falta) throw new Error(`O máximo para baixar é ${reais(falta)}.`);
  const juros = inteiroC(d.juros, 'Juros'), multa = inteiroC(d.multa, 'Multa'), desconto = inteiroC(d.desconto, 'Desconto'), total = d.c + juros + multa - desconto;
  if (total <= 0) throw new Error('O desconto não pode ser maior que o valor.');
  let ct = null;
  if (d.conta) { ct = (db.contas || []).find((x) => x.id === d.conta); if (!ct) throw new Error('Conta bancária não encontrada.'); if (ct.emp !== t.emp) throw new Error('A conta escolhida é de outra empresa.'); if (dia < ct.desde) throw new Error('A data é anterior ao saldo inicial desta conta.'); }
  else if ((db.contas || []).some((x) => x.emp === t.emp)) throw new Error('Escolha a conta bancária da baixa.');
  const b = { id: nid('b'), c: d.c, juros, multa, desconto, total, dia, conta: ct?.id || null, em: new Date().toISOString(), quem, origem: d.origem || 'manual' };
  if (ct) { const m = { id: nid('m'), conta: ct.id, dia, c: (k === 'pag' ? -1 : 1) * total, tipo: k, ref: { k, id: t.id, baixa: b.id }, desc: `${k === 'pag' ? t.forn : t.cliente} · ${t.desc}` }; if (d.ext) m.ext = d.ext; (db.movs ||= []).push(m); b.mov = m.id; }
  if (d.ext) b.ext = d.ext;
  (t.baixas ||= []).push(b);
  if (k === 'pag' && !faltaTitulo(t)) { t.st = 'pago'; t.pagoEm = dia; }
  const det = [juros && `juros ${reais(juros)}`, multa && `multa ${reais(multa)}`, desconto && `desconto ${reais(desconto)}`].filter(Boolean).join(', ');
  hist(t, quem, `${k === 'pag' ? 'pagou' : 'recebeu'} ${reais(d.c)}${det ? ` (${det}; total ${reais(total)})` : ''}${ct ? ` pela conta ${ct.nome}` : ''}${d.ext ? ' pelo extrato' : ''}`);
  registra(db, quem, `${k === 'pag' ? 'pagou' : 'recebeu'} ${reais(total)} · ${k === 'pag' ? t.forn : t.cliente}${det ? ` (${det})` : ''}`, { ref: `${k}:${t.id}`, antes: `falta ${reais(falta)}`, depois: `falta ${reais(faltaTitulo(t))}` });
  return b;
}
/** Baixa em lote: confere tudo antes (mesma empresa da conta, aprovado, em aberto) e só então baixa o que falta de cada um. */
export function baixarLote(db, ids, { dia = 0, conta } = {}, quem, papel) {
  exige(db, papel, 'pagar'); if (!ids.length) throw new Error('Selecione os pagamentos.');
  const ct = (db.contas || []).find((x) => x.id === conta); if (!ct) throw new Error('Escolha a conta bancária.');
  const ts = ids.map((id) => titulo(db, 'pag', id)), ruins = ts.filter((t) => !['aprovado', 'remessa'].includes(t.st) || !faltaTitulo(t) || t.emp !== ct.emp);
  if (ruins.length) throw new Error(`${ruins.length} pagamento(s) não entram no lote (não aprovados, já pagos ou de outra empresa): ${ruins.map((t) => t.forn).slice(0, 4).join(', ')}.`);
  const tot = ts.reduce((a, t) => a + faltaTitulo(t), 0), bs = ts.map((t) => baixar(db, 'pag', t.id, { c: faltaTitulo(t), dia, conta }, quem, papel));
  registra(db, quem, `baixa em lote de ${ts.length} pagamento(s) pela conta ${ct.nome}: ${reais(tot)}`, { ref: `lote:${bs.map((b) => b.id).join(',')}`, depois: reais(tot) });
  return bs;
}
export function estornarBaixa(db, k, id, baixaId, quem, papel, motivo) {
  exige(db, papel, 'pagar'); const t = titulo(db, k, id), i = (t.baixas || []).findIndex((b) => b.id === baixaId); if (i < 0) throw new Error('Baixa não encontrada.');
  const m = String(motivo || '').trim(); if (!m) throw new Error('Diga o motivo do estorno.'); const b = t.baixas[i]; exigeAberto(db, compDoDia(b.dia));
  t.baixas.splice(i, 1); if (b.mov) db.movs = db.movs.filter((x) => x.id !== b.mov);
  if (b.ext) { const e = db.extrato.find((x) => x.id === b.ext); if (e) { delete e.pag; delete e.rec; delete e.mov; delete e.criou; } }
  if (k === 'pag' && t.st === 'pago') { t.st = t.remessa ? 'remessa' : 'aprovado'; delete t.pagoEm; }
  hist(t, quem, `estornou ${reais(b.total)}: ${m}`); registra(db, quem, `estornou ${reais(b.total)} de ${k === 'pag' ? t.forn : t.cliente}: ${m.slice(0, 120)}`, { ref: `${k}:${t.id}`, antes: `baixado ${reais(baixado(t) + b.c)}`, depois: `baixado ${reais(baixado(t))}` });
}

// ------------------------------------------------------------------ anexos e comprovantes (pequenos, guardados com o título)
export const ANEXO = { max: 300000, porTitulo: 3, total: 2000000, tipos: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'] };
export function anexar(db, k, id, a, quem, papel) {
  exige(db, papel, 'criar'); const t = titulo(db, k, id);
  if (!ANEXO.tipos.includes(a.tipo)) throw new Error('Use PDF, PNG, JPG ou WEBP.'); if (!(a.tam > 0) || a.tam > ANEXO.max) throw new Error('Arquivo grande demais (até 300 KB).');
  if ((t.anexos || []).length >= ANEXO.porTitulo) throw new Error('Até 3 anexos por título.');
  const usado = [...db.pags, ...(db.recs || [])].reduce((s, x) => s + (x.anexos || []).reduce((q, y) => q + y.tam, 0), 0); if (usado + a.tam > ANEXO.total) throw new Error('O espaço de anexos da empresa (2 MB) está cheio.');
  if (!/^data:[\w/+.-]+;base64,/.test(String(a.dados || ''))) throw new Error('Arquivo ilegível.');
  const x = { id: nid('x'), nome: String(a.nome || 'anexo').slice(0, 80), tipo: a.tipo, tam: a.tam, dados: a.dados, em: new Date().toISOString(), quem }; (t.anexos ||= []).push(x);
  hist(t, quem, `anexou ${x.nome}`); registra(db, quem, `anexou ${x.nome} em ${k === 'pag' ? t.forn : t.cliente}`, { ref: `${k}:${t.id}` }); return x;
}
export function tirarAnexo(db, k, id, anexoId, quem, papel) { exige(db, papel, 'criar'); const t = titulo(db, k, id), a = (t.anexos || []).find((x) => x.id === anexoId); if (!a) throw new Error('Anexo não encontrado.'); t.anexos = t.anexos.filter((x) => x !== a); hist(t, quem, `removeu o anexo ${a.nome}`); registra(db, quem, `removeu o anexo ${a.nome}`, { ref: `${k}:${t.id}` }); }
export const veAnexos = (db, papel) => podeFazer(db, papel, 'criar') || podeFazer(db, papel, 'aprovar');

// ------------------------------------------------------------------ tesouraria: contas bancárias e transferências
export function novaContaBancaria(db, d, quem, papel) {
  exige(db, papel, 'tesouraria'); const nome = String(d.nome || '').trim(); if (!nome) throw new Error('Dê um nome à conta (banco e número).');
  if (!Number.isInteger(d.saldoIni)) throw new Error('Saldo inicial inválido.'); const desde = Number.isInteger(d.desde) ? d.desde : 0; if (desde > 0) throw new Error('A data do saldo inicial não pode ser no futuro.'); exigeAberto(db, compDoDia(desde));
  if ((db.contas ||= []).some((c) => c.emp === d.emp && norm(c.nome) === norm(nome))) throw new Error('Já existe uma conta com esse nome nesta empresa.');
  const c = { id: nid('c'), emp: d.emp, nome: nome.slice(0, 60), saldoIni: d.saldoIni, desde }; db.contas.push(c);
  registra(db, quem, `cadastrou a conta ${c.nome} com saldo inicial de ${reais(c.saldoIni)} em ${isoDe(desde).split('-').reverse().join('/')}`, { ref: `conta:${c.id}`, depois: reais(c.saldoIni) }); return c;
}
export function saldoConta(db, id, ate = 0) { const c = (db.contas || []).find((x) => x.id === id); if (!c) return 0; return c.saldoIni + (db.movs || []).filter((m) => m.conta === id && m.dia >= c.desde && m.dia <= ate).reduce((s, m) => s + m.c, 0); }
export function transferir(db, d, quem, papel) {
  exige(db, papel, 'tesouraria'); const de = (db.contas || []).find((x) => x.id === d.de), para = (db.contas || []).find((x) => x.id === d.para), dia = Number.isInteger(d.dia) ? d.dia : 0;
  if (!de || !para) throw new Error('Escolha as duas contas.'); if (de === para) throw new Error('Escolha contas diferentes.'); if (de.emp !== para.emp) throw new Error('Transferência entre empresas do grupo é empréstimo ou aporte, não transferência: lance como pagamento e recebível.');
  if (!Number.isInteger(d.c) || d.c <= 0) throw new Error('Digite o valor.'); if (dia > 0) throw new Error('A data não pode ser no futuro.'); if (dia < de.desde || dia < para.desde) throw new Error('A data é anterior ao saldo inicial de uma das contas.'); exigeAberto(db, compDoDia(dia));
  const tid = nid('t'), desc = String(d.desc || 'Transferência entre contas').slice(0, 80);
  (db.movs ||= []).push({ id: nid('m'), conta: de.id, dia, c: -d.c, tipo: 'transf', transf: tid, desc: `${desc} → ${para.nome}` }, { id: nid('m'), conta: para.id, dia, c: d.c, tipo: 'transf', transf: tid, desc: `${desc} ← ${de.nome}` });
  registra(db, quem, `transferiu ${reais(d.c)} de ${de.nome} para ${para.nome}`, { ref: `transf:${tid}`, depois: reais(d.c) }); return tid;
}
export function desfazerTransferencia(db, tid, quem, papel) {
  exige(db, papel, 'tesouraria'); const ms = (db.movs || []).filter((m) => m.transf === tid); if (ms.length !== 2) throw new Error('Transferência não encontrada.');
  if (ms.some((m) => m.ext)) throw new Error('Esta transferência já foi conciliada com o extrato: desfaça a conciliação antes.'); exigeAberto(db, compDoDia(ms[0].dia));
  db.movs = db.movs.filter((m) => m.transf !== tid); registra(db, quem, `desfez a transferência de ${reais(Math.abs(ms[0].c))}`, { ref: `transf:${tid}`, antes: reais(Math.abs(ms[0].c)), depois: 'desfeita' });
}
/** Disponível por empresa, compromissos e recebimentos de até `dias`; transferências não mudam o total (anulam-se). */
export function tesouraria(db, emp, dias = 7) {
  const emps = emp === 'todas' ? [...new Set([...(db.contas || []).map((c) => c.emp), ...db.pags.map((p) => p.emp)])] : [emp];
  return emps.map((e) => {
    const contas = (db.contas || []).filter((c) => c.emp === e).map((c) => ({ ...c, saldo: saldoConta(db, c.id) })), total = contas.reduce((s, c) => s + c.saldo, 0);
    const pagar = db.pags.filter((p) => p.emp === e && ['pendente', 'aprovado', 'remessa'].includes(p.st) && p.venc <= dias).reduce((s, p) => s + faltaTitulo(p), 0);
    const receber = (db.recs || []).filter((r) => r.emp === e && r.st !== 'cancelado' && r.venc <= dias).reduce((s, r) => s + faltaTitulo(r), 0);
    return { emp: e, contas, total, pagar, receber, depois: total - pagar + receber, insuficiente: contas.length > 0 && total - pagar < 0, semConta: !contas.length };
  });
}

// ------------------------------------------------------------------ agenda de compromissos
export function agenda(db, emp, de = -30, ate = 60) {
  const ok = (x) => emp === 'todas' || x.emp === emp, it = [];
  db.pags.filter((p) => ok(p) && faltaTitulo(p) && p.venc >= de && p.venc <= ate).forEach((p) => it.push({ k: 'pag', id: p.id, dia: p.venc, quem: p.forn, desc: p.desc, c: faltaTitulo(p), st: p.st, emp: p.emp }));
  (db.recs || []).filter((r) => ok(r) && faltaTitulo(r) && r.venc >= de && r.venc <= ate).forEach((r) => it.push({ k: 'rec', id: r.id, dia: r.venc, quem: r.cliente, desc: r.desc, c: faltaTitulo(r), st: situacaoRec(r).st, emp: r.emp }));
  return it.sort((a, b) => a.dia - b.dia || (a.k === 'rec' ? -1 : 1));
}

// ------------------------------------------------------------------ conciliação por conta (pagamentos e recebimentos)
const movLivre = (db, k, id, valor) => (db.movs || []).find((m) => m.ref?.k === k && m.ref.id === id && !m.ext && m.c === valor);
export function sugereRecebivel(db, e) {
  if (e.c <= 0 || e.pag || e.rec || e.mov) return null; const pal = norm(e.desc);
  const cands = (db.recs || []).filter((r) => r.st !== 'cancelado' && (faltaTitulo(r) === e.c || movLivre(db, 'rec', r.id, e.c)) && (!e.conta || r.emp === db.contas?.find((c) => c.id === e.conta)?.emp));
  return cands.sort((a, b) => Number(norm(b.cliente).split(' ').some((w) => w.length > 3 && pal.includes(w))) - Number(norm(a.cliente).split(' ').some((w) => w.length > 3 && pal.includes(w))) || Math.abs(a.venc - e.dia) - Math.abs(b.venc - e.dia))[0] || null;
}
/** Concilia a linha com um título (k): liga à baixa manual de mesmo valor se existir; senão cria a baixa (parcial se for menor). */
export function conciliarTitulo(db, extId, k, id, quem, papel) {
  exige(db, papel, 'conciliar'); const e = db.extrato.find((x) => x.id === extId); if (!e) throw new Error('Linha do extrato não encontrada.');
  if (e.pag || e.rec || e.mov) throw new Error('Esta linha já está conciliada.'); if ((e.c > 0) !== (k === 'rec')) throw new Error(e.c > 0 ? 'Entrada no banco concilia com recebível.' : 'Saída no banco concilia com pagamento.');
  const t = titulo(db, k, id), v = Math.abs(e.c), m = movLivre(db, k, id, e.c);
  if (m) { m.ext = e.id; e.mov = m.id; e[k] = t.id; const b = t.baixas.find((x) => x.mov === m.id); if (b) b.ext = e.id; hist(t, quem, 'baixa conferida com o extrato'); registra(db, quem, `conciliou ${reais(v)} do extrato (${e.desc}) com a baixa já lançada de ${k === 'pag' ? t.forn : t.cliente}`, { ref: `ext:${e.id}` }); return { ligou: m.id }; }
  if (v > faltaTitulo(t)) throw new Error(`O banco mostra ${reais(v)}, mais do que falta (${reais(faltaTitulo(t))}).`);
  const contaE = e.conta || (db.contas || []).find((c) => c.emp === t.emp)?.id || null;
  const b = baixar(db, k, id, { c: v, dia: e.dia, conta: contaE, ext: e.id, origem: 'extrato' }, quem, papel, 'conciliar');
  e[k] = t.id; e.criou = b.id; if (b.mov) e.mov = b.mov; return { baixa: b.id };
}
export function desconciliar(db, extId, quem, papel) {
  exige(db, papel, 'conciliar'); const e = db.extrato.find((x) => x.id === extId), k = e?.pag ? 'pag' : e?.rec ? 'rec' : null; if (!e || !k) throw new Error('Esta linha não está conciliada.');
  const t = titulo(db, k, e[k]);
  if (e.criou) { const b = t.baixas.find((x) => x.id === e.criou); exigeAberto(db, compDoDia(e.dia)); t.baixas = t.baixas.filter((x) => x !== b); if (b?.mov) db.movs = db.movs.filter((x) => x.id !== b.mov); if (k === 'pag' && t.st === 'pago') { t.st = t.remessa ? 'remessa' : 'aprovado'; delete t.pagoEm; } }
  else if (!e.mov && !(t.baixas || []).some((x) => x.ext === e.id)) { exigeAberto(db, compDoDia(e.dia)); if (k === 'pag' && t.st === 'pago' && !baixado(t)) { t.st = t.remessa ? 'remessa' : 'aprovado'; delete t.pagoEm; } } // ligação de antes das baixas: só a situação
  else { const m = (db.movs || []).find((x) => x.id === e.mov); if (m) delete m.ext; const b = (t.baixas || []).find((x) => x.ext === e.id); if (b) delete b.ext; }
  delete e[k]; delete e.mov; delete e.criou; hist(t, quem, 'desfez a conciliação'); registra(db, quem, `desfez a conciliação de ${e.desc}`, { ref: `ext:${e.id}` });
}
/** Conferência de uma conta: saldo que o banco mostra × saldo do sistema; linhas do extrato e baixas ainda sem par. */
export function conferenciaConta(db, contaId) {
  const c = (db.contas || []).find((x) => x.id === contaId); if (!c) return null;
  const sistema = saldoConta(db, contaId), inf = db.saldoBanco?.[contaId], linhas = db.extrato.filter((e) => e.conta === contaId);
  const pend = linhas.filter((e) => !e.pag && !e.rec && !e.mov && !categoria(db, e)), semBanco = (db.movs || []).filter((m) => m.conta === contaId && !m.ext && m.tipo !== 'transf');
  return { conta: c, sistema, banco: inf ? inf.c : null, dif: inf ? inf.c - sistema : null, justificativa: inf?.just || '', conciliadas: linhas.filter((e) => e.pag || e.rec || e.mov).length, pendentes: pend.length, semBanco: semBanco.length };
}
export function informarSaldoBanco(db, contaId, c, quem, papel, just = '') {
  exige(db, papel, 'conciliar'); if (!(db.contas || []).some((x) => x.id === contaId)) throw new Error('Conta não encontrada.'); if (!Number.isInteger(c)) throw new Error('Saldo inválido.');
  const antes = db.saldoBanco?.[contaId]; (db.saldoBanco ||= {})[contaId] = { c, em: new Date().toISOString(), comp: compAtual(), just: String(just || '').trim().slice(0, 160) };
  registra(db, quem, `informou o saldo do banco da conta: ${reais(c)}${just ? ` (diferença justificada: ${just})` : ''}`, { ref: `saldo:${contaId}`, antes: antes ? reais(antes.c) : '—', depois: reais(c) });
}

// ------------------------------------------------------------------ fechamento: verificações tiradas dos dados
export function verificacoes(db, comp = compAtual()) {
  const v = [], conta = (id, t, ok, det) => v.push({ id, t, ok, det });
  const pend = db.pags.filter((p) => p.st === 'pendente');
  conta('aprov', 'Pagamentos sem aprovação pendente', !pend.length, pend.length ? `${pend.length} pagamento(s) esperando aprovação (${reais(pend.reduce((s, p) => s + p.c, 0))})` : 'nenhum pendente');
  const semPar = db.extrato.filter((e) => !e.pag && !e.rec && !e.mov && !categoria(db, e));
  conta('extrato', 'Extrato conciliado ou com categoria', !semPar.length, semPar.length ? `${semPar.length} linha(s) sem par nem regra` : `${db.extrato.length} linha(s) revisadas`);
  const cs = (db.contas || []).map((c) => conferenciaConta(db, c.id)), sem = cs.filter((x) => x.banco === null || db.saldoBanco[x.conta.id].comp !== comp), dif = cs.filter((x) => x.dif && !x.justificativa);
  conta('saldos', 'Saldos conferidos com o banco', !sem.length && !dif.length, !cs.length ? 'nenhuma conta bancária cadastrada' : sem.length ? `${sem.length} conta(s) sem o saldo do banco informado neste mês` : dif.length ? `${dif.length} conta(s) com diferença sem justificativa` : `${cs.length} conta(s) conferidas`);
  conta('rateio', 'Rateio do mês lançado', !db.rateio.length || !!db.rateiosLancados?.[comp], db.rateio.length ? (db.rateiosLancados?.[comp] ? 'lançado' : 'não lançado') : 'sem rateio cadastrado');
  const atr = (db.recs || []).filter((r) => situacaoRec(r).st === 'atrasado');
  conta('receber', 'Recebíveis atrasados identificados', true, atr.length ? `${atr.length} atrasado(s): ${reais(atr.reduce((s, r) => s + faltaTitulo(r), 0))} (informativo)` : 'nenhum atrasado');
  conta('pacote', 'Relatórios do período gerados', !!db.pacotes?.[comp], db.pacotes?.[comp] ? `pacote baixado em ${new Date(db.pacotes[comp]).toLocaleDateString('pt-BR')}` : 'baixe o pacote do contador');
  return v;
}

// ------------------------------------------------------------------ cenários salvos (nunca mexem no oficial)
const SIM_OK = ['receitaPct', 'atrasoReceb', 'adiarForn', 'cortePct', 'despesa', 'investimento'];
export function salvarCenario(db, nome, sim, quem) {
  const n = String(nome || '').trim(); if (!n) throw new Error('Dê um nome ao cenário.'); if (!Object.keys(sim || {}).length) throw new Error('Mude alguma premissa antes de salvar.');
  const limpo = Object.fromEntries(Object.entries(sim).filter(([k]) => SIM_OK.includes(k))); if ((db.cenarios ||= []).some((c) => norm(c.nome) === norm(n))) throw new Error('Já existe um cenário com esse nome.');
  const c = { id: nid('s'), nome: n.slice(0, 60), sim: JSON.parse(JSON.stringify(limpo)), em: new Date().toISOString(), por: quem }; db.cenarios.push(c); registra(db, quem, `salvou o cenário "${c.nome}" (não altera o planejamento)`, { ref: `cen:${c.id}` }); return c;
}
export function renomearCenario(db, id, nome, quem) { const c = (db.cenarios || []).find((x) => x.id === id), n = String(nome || '').trim(); if (!c) throw new Error('Cenário não encontrado.'); if (!n) throw new Error('Dê um nome.'); const antes = c.nome; c.nome = n.slice(0, 60); registra(db, quem, 'renomeou um cenário', { ref: `cen:${id}`, antes, depois: c.nome }); }
export function descartarCenario(db, id, quem) { const c = (db.cenarios || []).find((x) => x.id === id); if (!c) throw new Error('Cenário não encontrado.'); db.cenarios = db.cenarios.filter((x) => x !== c); registra(db, quem, `descartou o cenário "${c.nome}"`, { ref: `cen:${id}` }); }

// ------------------------------------------------------------------ orçado x real: comprometido, projeção e revisões
/** Detalhe de uma conta do orçado: pagamentos comprometidos (aprovação ou remessa) e pagos no mês, rateio e revisões. */
export function detalheOrcado(db, emp, i, comp = compAtual(), agora = new Date()) {
  const cat = CATS[i]?.[0], mes = (d) => compDoDia(d) === comp, doEmp = (p) => emp === 'todas' || p.emp === emp;
  const ps = db.pags.filter((p) => doEmp(p) && p.cat === cat);
  const comprometidos = ps.filter((p) => ['pendente', 'aprovado', 'remessa'].includes(p.st) && mes(p.venc)), pagos = ps.flatMap((p) => (p.baixas || []).filter((b) => mes(b.dia)).map((b) => ({ ...b, p })));
  const rat = (db.rateiosLancados?.[comp]?.aplic || []).filter((a) => a.i === i && (emp === 'todas' || a.emp === emp)).reduce((s, a) => s + a.v, 0);
  const rev = (db.audit || []).filter((a) => a.ref && (a.ref === `orc:${emp}:${i}:o` || (emp === 'todas' && a.ref.startsWith('orc:') && a.ref.endsWith(`:${i}:o`))));
  const [a, m] = comp.split('-').map(Number), dias = new Date(a, m, 0).getDate(), hoje = comp === compAtual(agora) ? agora.getDate() : dias;
  return { cat, comprometido: faltaSoma(comprometidos), comprometidos, pagos, pagoC: pagos.reduce((s, b) => s + b.c, 0), rateio: rat, revisoes: rev, fracao: hoje / dias };
}
const faltaSoma = (l) => l.reduce((s, p) => s + faltaTitulo(p), 0);
/** Projeção linear até o fim do mês (real ÷ dias corridos × dias do mês); no mês fechado ou passado é o próprio real. */
export const projecaoMes = (real, fracao) => (fracao >= 1 || fracao <= 0 ? real : Math.round(real / fracao));
