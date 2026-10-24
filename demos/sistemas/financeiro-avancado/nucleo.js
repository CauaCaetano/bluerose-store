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
export { lerBoleto } from '../financeiro-comum/dinheiro.js';

export const FORMATO = 2;
export let CATS = [['Receita de vendas', 'r'], ['Receita de serviços', 'r'], ['Custo das mercadorias', 'c'], ['Fretes', 'c'], ['Folha e encargos', 'c'], ['Aluguel e condomínio', 'c'], ['Marketing', 'c'], ['Tecnologia', 'c'], ['Despesas financeiras', 'c'], ['Serviços de terceiros', 'c'], ['Impostos e taxas', 'c']]; // muda com usarPlano(db)
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
export function exigeAberto(db, comp = compAtual()) { if (db.travaAte && comp < db.travaAte.slice(0, 7)) throw new Error(`Lançamentos até ${db.travaAte.split('-').reverse().join('/')} estão travados. O dono tira a trava em Equipe e alçadas.`); if (fechado(db, comp)) throw new Error(`${nomeComp(comp)} está fechado. Para mudar algo, o dono reabre o mês (fica na auditoria).`); }
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
  const aprovados = [], recusados = [], proprios = [], primeira = [], mesma = [];
  ids.forEach((id) => { const p = db.pags.find((x) => x.id === id); if (!p || p.st !== 'pendente') return; if (!pode(db, papel, p.c)) { recusados.push(p); return; } if (!db.politica?.autoAprovacao && p.criadoPor && norm(p.criadoPor) === norm(quem)) { proprios.push(p); return; } if (db.politica?.duplaAcima && p.c > db.politica.duplaAcima * 100) { if (!p.aprov1) { p.aprov1 = { quem, papel, em: new Date().toISOString() }; p.sel = false; (p.hist ||= []).push({ em: p.aprov1.em, quem, o: `1ª aprovação (${PAPEIS[papel]}); falta a 2ª, de outra pessoa` }); primeira.push(p); return; } if (norm(p.aprov1.quem) === norm(quem)) { mesma.push(p); return; } } p.st = 'aprovado'; p.aprov = { quem, papel, em: new Date().toISOString() }; p.sel = false; (p.hist ||= []).push({ em: p.aprov.em, quem, o: `aprovou (${PAPEIS[papel]})` }); aprovados.push(p); });
  if (aprovados.length) registra(db, `${quem} (${PAPEIS[papel]})`, `aprovou ${aprovados.length} pagamento(s): ${reais(aprovados.reduce((s, p) => s + p.c, 0))}`, { ref: `pag:${aprovados.map((p) => p.id).join(',')}`, antes: 'pendente', depois: 'aprovado' });
  if (recusados.length) registra(db, `${quem} (${PAPEIS[papel]})`, `tentou aprovar ${recusados.length} pagamento(s) acima da alçada`);
  if (proprios.length) registra(db, `${quem} (${PAPEIS[papel]})`, `tentou aprovar ${proprios.length} pagamento(s) que lançou (bloqueado pela política)`);
  if (primeira.length) registra(db, `${quem} (${PAPEIS[papel]})`, `deu a 1ª aprovação em ${primeira.length} pagamento(s) acima de ${reais((db.politica.duplaAcima || 0) * 100)}`, { ref: `pag:${primeira.map((p) => p.id).join(',')}`, antes: 'pendente', depois: '1ª aprovação' });
  return { aprovados, recusados, proprios, primeira, mesma };
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
export const sugerePagamento = (db, e) => (e.c < 0 && !e.pag && !e.mov && !e.multi ? db.pags.find((p) => ['aprovado', 'remessa', 'pago'].includes(p.st) && (((p.st !== 'pago') && faltaTitulo(p) === -e.c) || (db.movs || []).some((m) => m.ref?.k === 'pag' && m.ref.id === p.id && !m.ext && m.c === e.c))) || null : null);
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
  const auto = Object.fromEntries(emps.map((e) => [e.k, realDasBaixas(db, e.k)])); // real = ajuste à mão + baixas do mês
  const linhas = CATS.map(([c, t], i) => { const v = emps.map((e) => (db.orc[e.k][i]?.r || 0) + (auto[e.k][c] || 0)), el = (db.eliminacoes || []).reduce((s, x) => s + (x.receita === c || x.custo === c ? x.v : 0), 0); return { c, t, v, el, grupo: v.reduce((a, b) => a + b, 0) - el }; });
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
  const ext = db.extrato, semCat = ext.filter((e) => !categoria(db, e) && !e.pag && !e.rec && !e.mov && !e.multi).length, min = Math.min(...caixa.fim), sMin = caixa.fim.indexOf(min);
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
  if (!['autoAprovacao', 'duplaAcima'].includes(chave)) throw new Error('Política inválida.');
  if (chave === 'duplaAcima') { const v = Number(valor) || 0; if (!Number.isInteger(v) || v < 0) throw new Error('Valor inválido.'); const antes = db.politica?.duplaAcima || 0; (db.politica ||= {}).duplaAcima = v; registra(db, quem, 'mudou a aprovação em dois níveis', { ref: 'politica:duplaAcima', antes: antes ? `acima de ${reais(antes * 100)}` : 'desligada', depois: v ? `acima de ${reais(v * 100)}` : 'desligada' }); return; }
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
  if (d.cc && !(db.centros || []).some((c) => c.id === d.cc)) throw new Error('Centro de custo não encontrado.');
  const grupo = n > 1 ? nid('g') : undefined;
  const criados = parcelar(d.c, n, d.venc).map((p, i) => { const x = { id: nid('p'), emp: d.emp, forn: String(d.forn).trim().slice(0, 80), desc: (String(d.desc).trim() + (n > 1 ? ` (${i + 1}/${n})` : '')).slice(0, 120), c: p.c, venc: p.venc, st: 'pendente', sel: false, criadoPor: quem, baixas: [] }; if (d.cat) x.cat = d.cat; EXTRAS.forEach((k) => { if (d[k]) x[k] = d[k]; }); if (grupo) { x.grupo = grupo; x.parcela = { n: i + 1, de: n, total: d.c }; } hist(x, quem, `lançou ${reais(p.c)}${n > 1 ? ` (parcela ${i + 1} de ${n})` : ''}`); db.pags.push(x); return x; });
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
const EXTRAS = ['cc', 'pessoa', 'nfe', 'recorrente', 'comp', 'imposto', 'reembolso', 'boleto'];
export const RETENCOES = { ir: 'IR (1,5%)', pcc: 'PIS/COFINS/CSLL (4,65%)', iss: 'ISS', inss: 'INSS (11%)' };
export function novoRecebivel(db, d, quem, papel) {
  exige(db, papel, 'criar'); exigeAberto(db); const n = validaTitulo({ ...d, quem: d.cliente }, 'o cliente');
  if (d.cat && !CATS.some(([c, t]) => c === d.cat && t === 'r')) throw new Error('Escolha uma conta de receita.');
  if (d.cc && !(db.centros || []).some((c) => c.id === d.cc)) throw new Error('Centro de custo não encontrado.');
  const ret = Object.fromEntries(Object.keys(RETENCOES).map((k) => [k, Number(d.retencoes?.[k]) || 0]).filter(([, v]) => v)), totRet = Object.values(ret).reduce((a, b) => a + b, 0);
  if (Object.values(ret).some((v) => !Number.isInteger(v) || v < 0)) throw new Error('Retenção inválida.'); if (totRet && n > 1) throw new Error('Retenções valem para nota à vista; para parcelar, lance cada parcela.'); if (totRet >= d.c) throw new Error('As retenções passam do valor da nota.');
  if (d.pessoa && !d.semLimite) { const k = creditoPessoa(db, d.pessoa); if (k.limite !== null && k.usado + d.c - totRet > k.limite) { if (!d.liberarLimite) throw new Error(`Passa do limite de crédito de ${d.cliente} (${reais(k.limite)}; deve ${reais(k.usado)}). Diretor ou dono pode liberar.`); if (papel === 'gerente') throw new Error('Só diretor ou dono libera acima do limite de crédito.'); registra(db, quem, `liberou ${d.cliente} acima do limite de crédito (${reais(k.limite)})`, { ref: `pessoa:${d.pessoa}`, antes: reais(k.usado), depois: reais(k.usado + d.c - totRet) }); } }
  if (totRet) d = { ...d, c: d.c - totRet };
  const grupo = n > 1 ? nid('g') : undefined;
  const criados = parcelar(d.c, n, d.venc).map((p, i) => { const x = { id: nid('r'), emp: d.emp, cliente: String(d.cliente).trim().slice(0, 80), desc: (String(d.desc).trim() + (n > 1 ? ` (${i + 1}/${n})` : '')).slice(0, 120), c: p.c, venc: p.venc, st: 'aberto', criadoPor: quem, baixas: [] }; if (d.cat) x.cat = d.cat; EXTRAS.forEach((k) => { if (d[k]) x[k] = d[k]; }); if (totRet) { x.bruto = d.c + totRet; x.ret = ret; } if (grupo) { x.grupo = grupo; x.parcela = { n: i + 1, de: n, total: d.c }; } hist(x, quem, `lançou ${reais(p.c)} a receber`); (db.recs ||= []).push(x); return x; });
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
  if (dia > 0) throw new Error('A data da baixa não pode ser no futuro.'); exigeDia(db, dia);
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
  const m = String(motivo || '').trim(); if (!m) throw new Error('Diga o motivo do estorno.'); const b = t.baixas[i]; exigeDia(db, b.dia);
  t.baixas.splice(i, 1); if (b.mov) db.movs = db.movs.filter((x) => x.id !== b.mov); if (b.adiant) { const a = (db.adiantamentos || []).find((x) => x.id === b.adiant); if (a) a.usado -= b.c; }
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
  if (!Number.isInteger(d.saldoIni)) throw new Error('Saldo inicial inválido.'); const desde = Number.isInteger(d.desde) ? d.desde : 0; if (desde > 0) throw new Error('A data do saldo inicial não pode ser no futuro.'); exigeDia(db, desde);
  if ((db.contas ||= []).some((c) => c.emp === d.emp && norm(c.nome) === norm(nome))) throw new Error('Já existe uma conta com esse nome nesta empresa.');
  const c = { id: nid('c'), emp: d.emp, nome: nome.slice(0, 60), saldoIni: d.tipo === 'cartao' ? 0 : d.saldoIni, desde }; if (d.tipo === 'cartao') { c.tipo = 'cartao'; if (!Number.isInteger(d.limite) || d.limite <= 0) throw new Error('Digite o limite do cartão.'); c.limite = d.limite; } db.contas.push(c);
  registra(db, quem, `cadastrou a conta ${c.nome} com saldo inicial de ${reais(c.saldoIni)} em ${isoDe(desde).split('-').reverse().join('/')}`, { ref: `conta:${c.id}`, depois: reais(c.saldoIni) }); return c;
}
export function saldoConta(db, id, ate = 0) { const c = (db.contas || []).find((x) => x.id === id); if (!c) return 0; return c.saldoIni + (db.movs || []).filter((m) => m.conta === id && m.dia >= c.desde && m.dia <= ate).reduce((s, m) => s + m.c, 0); }
export function transferir(db, d, quem, papel) {
  exige(db, papel, 'tesouraria'); const de = (db.contas || []).find((x) => x.id === d.de), para = (db.contas || []).find((x) => x.id === d.para), dia = Number.isInteger(d.dia) ? d.dia : 0;
  if (!de || !para) throw new Error('Escolha as duas contas.'); if (de === para) throw new Error('Escolha contas diferentes.'); if (de.emp !== para.emp) throw new Error('Transferência entre empresas do grupo é empréstimo ou aporte, não transferência: lance como pagamento e recebível.');
  if (!Number.isInteger(d.c) || d.c <= 0) throw new Error('Digite o valor.'); if (dia > 0) throw new Error('A data não pode ser no futuro.'); if (dia < de.desde || dia < para.desde) throw new Error('A data é anterior ao saldo inicial de uma das contas.'); exigeDia(db, dia);
  const tid = nid('t'), desc = String(d.desc || 'Transferência entre contas').slice(0, 80);
  (db.movs ||= []).push({ id: nid('m'), conta: de.id, dia, c: -d.c, tipo: 'transf', transf: tid, desc: `${desc} → ${para.nome}` }, { id: nid('m'), conta: para.id, dia, c: d.c, tipo: 'transf', transf: tid, desc: `${desc} ← ${de.nome}` });
  registra(db, quem, `transferiu ${reais(d.c)} de ${de.nome} para ${para.nome}`, { ref: `transf:${tid}`, depois: reais(d.c) }); return tid;
}
export function desfazerTransferencia(db, tid, quem, papel) {
  exige(db, papel, 'tesouraria'); const ms = (db.movs || []).filter((m) => m.transf === tid); if (ms.length !== 2) throw new Error('Transferência não encontrada.');
  if (ms.some((m) => m.ext)) throw new Error('Esta transferência já foi conciliada com o extrato: desfaça a conciliação antes.'); exigeDia(db, ms[0].dia);
  db.movs = db.movs.filter((m) => m.transf !== tid); registra(db, quem, `desfez a transferência de ${reais(Math.abs(ms[0].c))}`, { ref: `transf:${tid}`, antes: reais(Math.abs(ms[0].c)), depois: 'desfeita' });
}
/** Disponível por empresa, compromissos e recebimentos de até `dias`; transferências não mudam o total (anulam-se). */
export function tesouraria(db, emp, dias = 7) {
  const emps = emp === 'todas' ? [...new Set([...(db.contas || []).map((c) => c.emp), ...db.pags.map((p) => p.emp)])] : [emp];
  return emps.map((e) => {
    const todas = (db.contas || []).filter((c) => c.emp === e).map((c) => ({ ...c, saldo: saldoConta(db, c.id) })), contas = todas.filter((c) => c.tipo !== 'cartao'), cartoes = todas.filter((c) => c.tipo === 'cartao'), total = contas.reduce((s, c) => s + c.saldo, 0);
    const pagar = db.pags.filter((p) => p.emp === e && ['pendente', 'aprovado', 'remessa'].includes(p.st) && p.venc <= dias).reduce((s, p) => s + faltaTitulo(p), 0);
    const receber = (db.recs || []).filter((r) => r.emp === e && r.st !== 'cancelado' && r.venc <= dias).reduce((s, r) => s + faltaTitulo(r), 0);
    return { emp: e, contas, cartoes, fatura: -cartoes.reduce((s, c) => s + c.saldo, 0), total, pagar, receber, depois: total - pagar + receber, insuficiente: contas.length > 0 && total - pagar < 0, semConta: !contas.length };
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
  if (e.c <= 0 || e.pag || e.rec || e.mov || e.multi) return null; const pal = norm(e.desc);
  const cands = (db.recs || []).filter((r) => r.st !== 'cancelado' && (faltaTitulo(r) === e.c || movLivre(db, 'rec', r.id, e.c)) && (!e.conta || r.emp === db.contas?.find((c) => c.id === e.conta)?.emp));
  return cands.sort((a, b) => Number(norm(b.cliente).split(' ').some((w) => w.length > 3 && pal.includes(w))) - Number(norm(a.cliente).split(' ').some((w) => w.length > 3 && pal.includes(w))) || Math.abs(a.venc - e.dia) - Math.abs(b.venc - e.dia))[0] || null;
}
/** Concilia a linha com um título (k): liga à baixa manual de mesmo valor se existir; senão cria a baixa (parcial se for menor). */
export function conciliarTitulo(db, extId, k, id, quem, papel) {
  exige(db, papel, 'conciliar'); const e = db.extrato.find((x) => x.id === extId); if (!e) throw new Error('Linha do extrato não encontrada.');
  if (e.pag || e.rec || e.mov || e.multi) throw new Error('Esta linha já está conciliada.'); if ((e.c > 0) !== (k === 'rec')) throw new Error(e.c > 0 ? 'Entrada no banco concilia com recebível.' : 'Saída no banco concilia com pagamento.');
  const t = titulo(db, k, id), v = Math.abs(e.c), m = movLivre(db, k, id, e.c);
  if (m) { m.ext = e.id; e.mov = m.id; e[k] = t.id; const b = t.baixas.find((x) => x.mov === m.id); if (b) b.ext = e.id; hist(t, quem, 'baixa conferida com o extrato'); registra(db, quem, `conciliou ${reais(v)} do extrato (${e.desc}) com a baixa já lançada de ${k === 'pag' ? t.forn : t.cliente}`, { ref: `ext:${e.id}` }); return { ligou: m.id }; }
  if (v > faltaTitulo(t)) throw new Error(`O banco mostra ${reais(v)}, mais do que falta (${reais(faltaTitulo(t))}).`);
  const contaE = e.conta || (db.contas || []).find((c) => c.emp === t.emp)?.id || null;
  const b = baixar(db, k, id, { c: v, dia: e.dia, conta: contaE, ext: e.id, origem: 'extrato' }, quem, papel, 'conciliar');
  e[k] = t.id; e.criou = b.id; if (b.mov) e.mov = b.mov; return { baixa: b.id };
}
export function desconciliar(db, extId, quem, papel) {
  exige(db, papel, 'conciliar'); const e0 = db.extrato.find((x) => x.id === extId);
  if (e0?.avulso) { exigeDia(db, e0.dia); db.movs = db.movs.filter((m) => m.id !== e0.mov); delete e0.mov; delete e0.avulso; registra(db, quem, `desfez o lançamento avulso de ${e0.desc}`, { ref: `ext:${e0.id}` }); return; }
  if (e0?.multi) { exigeDia(db, e0.dia); e0.multi.forEach((x) => { const t = titulo(db, x.k, x.id), b = t.baixas.find((y) => y.id === x.b); t.baixas = t.baixas.filter((y) => y !== b); if (b?.mov) db.movs = db.movs.filter((m) => m.id !== b.mov); if (x.k === 'pag' && t.st === 'pago') { t.st = t.remessa ? 'remessa' : 'aprovado'; delete t.pagoEm; } hist(t, quem, 'desfez a conciliação'); }); delete e0.multi; registra(db, quem, `desfez a conciliação de ${e0.desc}`, { ref: `ext:${e0.id}` }); return; }
  const e = e0, k = e?.pag ? 'pag' : e?.rec ? 'rec' : null; if (!e || !k) throw new Error('Esta linha não está conciliada.');
  const t = titulo(db, k, e[k]);
  if (e.criou) { const b = t.baixas.find((x) => x.id === e.criou); exigeDia(db, e.dia); t.baixas = t.baixas.filter((x) => x !== b); if (b?.mov) db.movs = db.movs.filter((x) => x.id !== b.mov); if (k === 'pag' && t.st === 'pago') { t.st = t.remessa ? 'remessa' : 'aprovado'; delete t.pagoEm; } }
  else if (!e.mov && !(t.baixas || []).some((x) => x.ext === e.id)) { exigeDia(db, e.dia); if (k === 'pag' && t.st === 'pago' && !baixado(t)) { t.st = t.remessa ? 'remessa' : 'aprovado'; delete t.pagoEm; } } // ligação de antes das baixas: só a situação
  else { const m = (db.movs || []).find((x) => x.id === e.mov); if (m) delete m.ext; const b = (t.baixas || []).find((x) => x.ext === e.id); if (b) delete b.ext; }
  delete e[k]; delete e.mov; delete e.criou; hist(t, quem, 'desfez a conciliação'); registra(db, quem, `desfez a conciliação de ${e.desc}`, { ref: `ext:${e.id}` });
}
/** Conferência de uma conta: saldo que o banco mostra × saldo do sistema; linhas do extrato e baixas ainda sem par. */
export function conferenciaConta(db, contaId) {
  const c = (db.contas || []).find((x) => x.id === contaId); if (!c) return null;
  const sistema = saldoConta(db, contaId), inf = db.saldoBanco?.[contaId], linhas = db.extrato.filter((e) => e.conta === contaId);
  const pend = linhas.filter((e) => !e.pag && !e.rec && !e.mov && !e.multi && !categoria(db, e)), semBanco = (db.movs || []).filter((m) => m.conta === contaId && !m.ext && !['transf', 'fatura', 'cartao'].includes(m.tipo));
  return { conta: c, sistema, banco: inf ? inf.c : null, dif: inf ? inf.c - sistema : null, justificativa: inf?.just || '', conciliadas: linhas.filter((e) => e.pag || e.rec || e.mov || e.multi).length, pendentes: pend.length, semBanco: semBanco.length };
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
  const semPar = db.extrato.filter((e) => !e.pag && !e.rec && !e.mov && !e.multi && !categoria(db, e));
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

// ================================================================== plano de contas, cadastros, recorrências e relatórios
// Regras:
// - plano de contas da empresa (nome, receita ou custo, linha do fluxo e grupo); renomear atualiza tudo que usa a conta;
//   conta em uso não é apagada;
// - cliente e fornecedor com CPF/CNPJ conferido pelos dígitos; o mesmo documento não é cadastrado duas vezes;
// - recorrência gera o título de cada mês uma vez só (recorrência + mês); no fluxo, as próximas ocorrências entram mesmo
//   antes de gerar;
// - fluxo integrado: em cada linha e semana vale o maior entre o previsto à mão e o que já está lançado em títulos
//   (o título consome a previsão; nunca soma duas vezes);
// - real do orçado = ajuste à mão (o que não passa pelo sistema) + baixas do mês, pela conta do plano;
// - trava por data: nada com data até o dia travado muda (baixas, transferências, lançamentos avulsos).
export const PLANO_PADRAO = [['Receita de vendas', 'r', 'Clientes (a receber)', 'Receitas'], ['Receita de serviços', 'r', 'Clientes (a receber)', 'Receitas'], ['Custo das mercadorias', 'c', 'Fornecedores', 'Custos diretos'], ['Fretes', 'c', 'Fornecedores', 'Custos diretos'], ['Folha e encargos', 'c', 'Folha e encargos', 'Pessoal'], ['Aluguel e condomínio', 'c', 'Despesas gerais', 'Estrutura'], ['Marketing', 'c', 'Despesas gerais', 'Comercial'], ['Tecnologia', 'c', 'Despesas gerais', 'Estrutura'], ['Despesas financeiras', 'c', 'Financiamentos', 'Financeiro'], ['Serviços de terceiros', 'c', 'Despesas gerais', 'Estrutura'], ['Impostos e taxas', 'c', 'Impostos', 'Impostos']]
  .map(([c, t, linha, grupo]) => ({ c, t, linha, grupo }));
export const LINHAS_FLUXO = { r: ['Clientes (a receber)', 'Contratos recorrentes', 'Outras entradas'], c: ['Fornecedores', 'Folha e encargos', 'Impostos', 'Financiamentos', 'Despesas gerais'] };
/** Liga o plano de contas da empresa (ou o padrão) às regras: CATS passa a ser a lista dele. */
export function usarPlano(db) {
  if (!Array.isArray(db.plano) || !db.plano.length) db.plano = PLANO_PADRAO.map((p) => ({ ...p }));
  CATS = db.plano.map((p) => [p.c, p.t]); return db.plano;
}
export function linhaDe(db, cat, k) { const p = (db.plano || PLANO_PADRAO).find((x) => x.c === cat); return p?.linha || (k === 'rec' ? 'Clientes (a receber)' : 'Fornecedores'); }
const usoDaConta = (db, c) => db.pags.filter((p) => p.cat === c).length + (db.recs || []).filter((r) => r.cat === c).length + (db.rateio || []).filter((r) => r.cat === c).length + (db.eliminacoes || []).filter((e) => e.receita === c || e.custo === c).length + (db.movs || []).filter((m) => m.cat === c).length + (db.recorrentes || []).filter((r) => r.cat === c).length + Object.values(db.orc || {}).filter((l) => l.some((x) => x.c === c && (x.o || x.r))).length;
export function novaContaPlano(db, d, quem, papel) {
  exige(db, papel, 'criar'); usarPlano(db); const c = String(d.c || '').trim().slice(0, 50);
  if (!c) throw new Error('Dê um nome à conta.'); if (!['r', 'c'].includes(d.t)) throw new Error('Escolha receita ou custo.');
  if (db.plano.some((p) => norm(p.c) === norm(c))) throw new Error('Já existe uma conta com esse nome.');
  const linha = LINHAS_FLUXO[d.t].includes(d.linha) ? d.linha : LINHAS_FLUXO[d.t][0];
  db.plano.push({ c, t: d.t, linha, grupo: String(d.grupo || '').trim().slice(0, 40) || (d.t === 'r' ? 'Receitas' : 'Outras despesas') }); usarPlano(db);
  registra(db, quem, `criou a conta "${c}" no plano de contas`, { ref: `plano:${c}`, depois: `${d.t === 'r' ? 'receita' : 'custo'} · ${linha}` });
}
export function editarContaPlano(db, antigo, d, quem, papel) {
  exige(db, papel, 'criar'); usarPlano(db); const p = db.plano.find((x) => x.c === antigo); if (!p) throw new Error('Conta não encontrada.');
  const novo = String(d.c ?? antigo).trim().slice(0, 50); if (!novo) throw new Error('Dê um nome à conta.');
  if (novo !== antigo && db.plano.some((x) => x !== p && norm(x.c) === norm(novo))) throw new Error('Já existe uma conta com esse nome.');
  if (d.linha && LINHAS_FLUXO[p.t].includes(d.linha)) p.linha = d.linha; if (d.grupo !== undefined) p.grupo = String(d.grupo).trim().slice(0, 40) || p.grupo;
  if (novo !== antigo) {
    const troca = (o, k) => { if (o[k] === antigo) o[k] = novo; };
    db.pags.forEach((x) => troca(x, 'cat')); (db.recs || []).forEach((x) => troca(x, 'cat')); (db.rateio || []).forEach((x) => troca(x, 'cat')); (db.movs || []).forEach((x) => troca(x, 'cat')); (db.recorrentes || []).forEach((x) => troca(x, 'cat'));
    (db.eliminacoes || []).forEach((x) => { troca(x, 'receita'); troca(x, 'custo'); }); Object.values(db.orc || {}).forEach((l) => l.forEach((x) => troca(x, 'c'))); (db.regras || []).forEach((x) => troca(x, 'conta'));
    p.c = novo;
  }
  usarPlano(db); registra(db, quem, 'editou uma conta do plano de contas', { ref: `plano:${novo}`, antes: antigo, depois: `${novo} · ${p.linha} · ${p.grupo}` });
}
export function removerContaPlano(db, c, quem, papel) {
  exige(db, papel, 'criar'); usarPlano(db); const n = usoDaConta(db, c); if (n) throw new Error(`A conta "${c}" está em uso (${n} lançamento[s] ou linha[s]); renomeie em vez de apagar.`);
  if (db.plano.length <= 2) throw new Error('O plano precisa de ao menos uma receita e um custo.');
  db.plano = db.plano.filter((p) => p.c !== c);
  Object.keys(db.orc || {}).forEach((k) => { db.orc[k] = db.orc[k].filter((x) => x.c !== c); }); usarPlano(db); registra(db, quem, `apagou a conta "${c}" do plano de contas`, { ref: `plano:${c}`, antes: c, depois: 'apagada' });
}

// ------------------------------------------------------------------ clientes e fornecedores (CPF/CNPJ conferido)
export function docValido(doc) {
  const d = String(doc || '').replace(/\D/g, '');
  if (d.length === 11) { if (/^(\d)\1+$/.test(d)) return false; const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; }; return dv(9) === Number(d[9]) && dv(10) === Number(d[10]); }
  if (d.length === 14) { if (/^(\d)\1+$/.test(d)) return false; const dv = (n) => { const p = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; const s = p.reduce((a, w, i) => a + w * Number(d[i]), 0) % 11; return s < 2 ? 0 : 11 - s; }; return dv(12) === Number(d[12]) && dv(13) === Number(d[13]); }
  return false;
}
export const docFormatado = (doc) => { const d = String(doc || '').replace(/\D/g, ''); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : d; };
export function salvarPessoa(db, d, quem, papel) {
  exige(db, papel, 'criar'); const nome = String(d.nome || '').trim().slice(0, 80); if (!nome) throw new Error('Digite o nome.');
  if (!['cliente', 'fornecedor', 'ambos', 'funcionario'].includes(d.tipo)) throw new Error('Escolha o tipo.');
  const doc = String(d.doc || '').replace(/\D/g, ''); if (doc && !docValido(doc)) throw new Error('CPF ou CNPJ inválido (confira os dígitos).');
  const prazo = d.prazo === '' || d.prazo === undefined ? null : Number(d.prazo); if (prazo !== null && (!Number.isInteger(prazo) || prazo < 0 || prazo > 365)) throw new Error('Prazo em dias, de 0 a 365.');
  const limite = d.limite === '' || d.limite === undefined || d.limite === null ? null : d.limite; if (limite !== null && (!Number.isInteger(limite) || limite < 0)) throw new Error('Limite de crédito inválido.');
  const lista = (db.pessoas ||= []), atual = d.id && lista.find((p) => p.id === d.id);
  if (doc && lista.some((p) => p !== atual && p.doc === doc)) throw new Error('Esse CPF/CNPJ já está cadastrado.');
  if (!doc && lista.some((p) => p !== atual && !p.doc && norm(p.nome) === norm(nome))) throw new Error('Já existe um cadastro com esse nome.');
  const v = { nome, tipo: d.tipo, doc, pix: String(d.pix || '').trim().slice(0, 77), banco: String(d.banco || '').trim().slice(0, 80), email: String(d.email || '').trim().slice(0, 80), tel: String(d.tel || '').replace(/[^\d+]/g, '').slice(0, 16), prazo, limite };
  if (atual) { const antes = atual.nome; Object.assign(atual, v); if (antes !== nome) { db.pags.forEach((p) => { if (p.pessoa === atual.id) p.forn = nome; }); (db.recs || []).forEach((r) => { if (r.pessoa === atual.id) r.cliente = nome; }); } registra(db, quem, `editou o cadastro de ${nome}`, { ref: `pessoa:${atual.id}`, antes, depois: nome }); return atual; }
  const p = { id: nid('h'), ...v }; lista.push(p); registra(db, quem, `cadastrou ${nome}${doc ? ` (${docFormatado(doc)})` : ''}`, { ref: `pessoa:${p.id}` }); return p;
}
/** Acha o cadastro pelo documento ou pelo nome (sem diferenciar acento e maiúscula). */
export function acharPessoa(db, { nome, doc } = {}) { const d = String(doc || '').replace(/\D/g, ''); return (db.pessoas || []).find((p) => (d && p.doc === d) || (nome && norm(p.nome) === norm(nome))) || null; }
export function resumoPessoa(db, id) {
  const pg = db.pags.filter((p) => p.pessoa === id), rc = (db.recs || []).filter((r) => r.pessoa === id);
  return { aPagar: pg.reduce((s, p) => s + faltaTitulo(p), 0), pago: pg.reduce((s, p) => s + baixado(p), 0), aReceber: rc.reduce((s, r) => s + faltaTitulo(r), 0), recebido: rc.reduce((s, r) => s + baixado(r), 0), atrasado: rc.filter((r) => situacaoRec(r).st === 'atrasado').reduce((s, r) => s + faltaTitulo(r), 0), titulos: pg.length + rc.length };
}

// ------------------------------------------------------------------ centros de custo
export function novoCentro(db, nome, quem, papel) { exige(db, papel, 'criar'); const n = String(nome || '').trim().slice(0, 40); if (!n) throw new Error('Dê um nome ao centro de custo.'); if ((db.centros ||= []).some((c) => norm(c.nome) === norm(n))) throw new Error('Já existe esse centro de custo.'); const c = { id: nid('k'), nome: n }; db.centros.push(c); registra(db, quem, `criou o centro de custo ${n}`, { ref: `cc:${c.id}` }); return c; }
export function orcarCentro(db, cc, comp, v, quem, papel) { exige(db, papel, 'criar'); exigeAberto(db, comp); if (!(db.centros || []).some((c) => c.id === cc)) throw new Error('Centro de custo não encontrado.'); if (!Number.isInteger(v) || v < 0) throw new Error('Valor inválido.'); const k = `${cc}|${comp}`, antes = (db.orcCentros ||= {})[k] || 0; if (v) db.orcCentros[k] = v; else delete db.orcCentros[k]; registra(db, quem, 'mudou o orçamento de um centro de custo', { ref: `cc:${cc}:${comp}`, antes: reais(antes * 100), depois: reais(v * 100) }); }
/** Por centro de custo no mês: orçado (reais), pago (baixas) e comprometido (pagamentos em aberto que vencem no mês). */
export function resumoCentros(db, emp, comp = compAtual()) {
  const ok = (p) => emp === 'todas' || p.emp === emp, mes = (d) => compDoDia(d) === comp;
  return (db.centros || []).map((c) => { const ps = db.pags.filter((p) => ok(p) && p.cc === c.id), avul = (db.movs || []).filter((m) => m.cc === c.id && m.c < 0 && mes(m.dia) && (emp === 'todas' || (db.contas || []).find((x) => x.id === m.conta)?.emp === emp));
    const pago = ps.reduce((s, p) => s + (p.baixas || []).filter((b) => mes(b.dia)).reduce((q, b) => q + b.total, 0), 0) - avul.reduce((s, m) => s + m.c, 0);
    const comprometido = ps.filter((p) => ['pendente', 'aprovado', 'remessa'].includes(p.st) && mes(p.venc)).reduce((s, p) => s + faltaTitulo(p), 0);
    const orcado = (db.orcCentros?.[`${c.id}|${comp}`] || 0) * 100; return { ...c, orcado, pago, comprometido, livre: orcado - pago - comprometido }; });
}

// ------------------------------------------------------------------ recorrências e impostos (gera o título de cada mês uma vez só)
export function novaRecorrencia(db, d, quem, papel) {
  exige(db, papel, 'criar'); if (!['pag', 'rec'].includes(d.k)) throw new Error('Escolha pagar ou receber.');
  if (!String(d.quem || '').trim() || !String(d.desc || '').trim()) throw new Error('Preencha quem e o que é.'); if (!Number.isInteger(d.c) || d.c <= 0) throw new Error('Digite o valor.');
  const dia = Number(d.dia); if (!Number.isInteger(dia) || dia < 1 || dia > 31) throw new Error('Dia do vencimento de 1 a 31.');
  const r = { id: nid('q'), k: d.k, emp: d.emp, quem: String(d.quem).trim().slice(0, 80), desc: String(d.desc).trim().slice(0, 120), c: d.c, dia, cat: d.cat || '', cc: d.cc || '', imposto: !!d.imposto, ativa: true, desde: d.desde || compAtual(), ate: d.ate || '' };
  (db.recorrentes ||= []).push(r); registra(db, quem, `criou ${r.imposto ? 'o imposto' : 'a recorrência'} ${r.desc} · ${reais(r.c)} todo dia ${dia}`, { ref: `rec-fixa:${r.id}` }); return r;
}
export function pausarRecorrencia(db, id, ativa, quem, papel) { exige(db, papel, 'criar'); const r = (db.recorrentes || []).find((x) => x.id === id); if (!r) throw new Error('Recorrência não encontrada.'); r.ativa = !!ativa; registra(db, quem, `${ativa ? 'reativou' : 'pausou'} ${r.desc}`, { ref: `rec-fixa:${id}`, antes: ativa ? 'pausada' : 'ativa', depois: ativa ? 'ativa' : 'pausada' }); }
const vencNoMes = (dia, comp, agora = new Date()) => { const [a, m] = comp.split('-').map(Number), ult = new Date(a, m, 0).getDate(); return diaDe(`${comp}-${String(Math.min(dia, ult)).padStart(2, '0')}`, agora); };
const proxComp = (comp, n = 1) => { const [a, m] = comp.split('-').map(Number), d = new Date(a, m - 1 + n, 1, 12); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const vale = (r, comp) => r.ativa !== false && comp >= (r.desde || comp) && (!r.ate || comp <= r.ate);
export const jaGerado = (db, r, comp) => (r.k === 'pag' ? db.pags : db.recs || []).some((t) => t.recorrente === r.id && t.comp === comp);
export function aGerarRecorrentes(db, comp = compAtual()) { return (db.recorrentes || []).filter((r) => vale(r, comp) && !jaGerado(db, r, comp)); }
export function gerarRecorrentes(db, comp, quem, papel, emp = 'todas') {
  exige(db, papel, 'criar'); exigeAberto(db, comp);
  const feitos = aGerarRecorrentes(db, comp).filter((r) => emp === 'todas' || r.emp === emp).map((r) => { const base = { emp: r.emp, desc: `${r.desc} · ${comp.slice(5)}/${comp.slice(0, 4)}`, c: r.c, venc: vencNoMes(r.dia, comp), cc: r.cc || undefined, recorrente: r.id, comp };
    return r.k === 'pag' ? novoPagamento(db, { ...base, forn: r.quem, cat: r.cat || (r.imposto ? 'Impostos e taxas' : undefined), imposto: r.imposto }, quem, papel)[0] : novoRecebivel(db, { ...base, cliente: r.quem, cat: r.cat || undefined }, quem, papel)[0]; });
  if (feitos.length) registra(db, quem, `gerou ${feitos.length} título(s) recorrente(s) de ${nomeComp(comp)}`, { ref: `recorrentes:${comp}` }); return feitos;
}
/** Próximas ocorrências ainda não geradas, em dias relativos, até `ate` dias (para o fluxo). */
export function ocorrenciasFuturas(db, ate = SEMANAS * 7, agora = new Date()) {
  const out = []; (db.recorrentes || []).forEach((r) => { for (let i = 0, comp = compAtual(agora); i < 5; i++, comp = proxComp(comp)) { const v = vencNoMes(r.dia, comp, agora); if (v > ate) break; if (v >= 0 && vale(r, comp) && !jaGerado(db, r, comp)) out.push({ ...r, venc: v, comp }); } });
  return out;
}

// ------------------------------------------------------------------ fluxo de 13 semanas alimentado pelos títulos
/** Títulos em aberto e recorrências ainda não geradas, por linha do fluxo e semana, em reais inteiros (atrasado entra na semana 1). */
export function titulosNoFluxo(db, emps, agora = new Date()) {
  const out = {}, poe = (linha, venc, c) => { const i = Math.max(0, Math.floor(venc / 7)); if (i >= SEMANAS) return; (out[linha] ||= Array(SEMANAS).fill(0))[i] += Math.round(c / 100); };
  const ok = (x) => emps.includes(x.emp);
  db.pags.filter((p) => ok(p) && ['pendente', 'aprovado', 'remessa'].includes(p.st)).forEach((p) => poe(linhaDe(db, p.cat, 'pag'), p.venc, faltaTitulo(p)));
  (db.recs || []).filter((r) => ok(r) && r.st !== 'cancelado').forEach((r) => poe(r.recorrente ? CONTRATOS : linhaDe(db, r.cat, 'rec'), r.venc, faltaTitulo(r)));
  ocorrenciasFuturas(db, SEMANAS * 7, agora).filter(ok).forEach((r) => poe(r.k === 'rec' ? CONTRATOS : linhaDe(db, r.cat || (r.imposto ? 'Impostos e taxas' : ''), 'pag'), r.venc, r.c));
  return out;
}
/** O título consome a previsão: em cada linha e semana vale o maior entre o previsto à mão e o lançado. */
export function integrarTitulos(base, lancados) {
  const linhas = JSON.parse(JSON.stringify(base.linhas)), vindo = {};
  Object.entries(lancados).forEach(([r, arr]) => { if (!linhas[r]) linhas[r] = Array(SEMANAS).fill(0); arr.forEach((v, i) => { if (v > linhas[r][i]) { vindo[r] = (vindo[r] || 0) + v - linhas[r][i]; linhas[r][i] = v; } }); });
  return { saldo: base.saldo, linhas, acimaDoPrevisto: vindo };
}
/** Foto da projeção (uma por semana e empresa) para comparar depois com o que de fato entrou e saiu nas contas. */
export function fotografarFluxo(db, emp, p, agora = new Date()) {
  const hoje = hojeISO(agora), l = ((db.fotos ||= {})[emp] ||= []), ult = l[l.length - 1];
  if (ult && (Date.parse(hoje) - Date.parse(ult.iso)) / DIA < 7) return null;
  const f = { iso: hoje, ent: p.ent[0] || 0, sai: p.sai[0] || 0, fim: p.fim[0] || 0 }; l.push(f); if (l.length > 26) l.shift(); return f;
}
const DIA = 864e5;
/** Semanas que já passaram: previsto na foto × realizado nas contas bancárias da empresa (sem transferências entre contas). */
export function previstoRealizado(db, emp, agora = new Date()) {
  const hoje = hojeISO(agora), contas = new Set((db.contas || []).filter((c) => emp === 'todas' || c.emp === emp).map((c) => c.id));
  const fotos = emp === 'todas' ? [] : (db.fotos?.[emp] || []);
  return fotos.filter((f) => (Date.parse(hoje) - Date.parse(f.iso)) / DIA >= 7).map((f) => {
    const ini = diaDe(f.iso, agora), ms = (db.movs || []).filter((m) => contas.has(m.conta) && m.tipo !== 'transf' && m.dia >= ini && m.dia <= ini + 6);
    const ent = Math.round(ms.filter((m) => m.c > 0).reduce((s, m) => s + m.c, 0) / 100), sai = Math.round(-ms.filter((m) => m.c < 0).reduce((s, m) => s + m.c, 0) / 100);
    return { iso: f.iso, prevEnt: f.ent, prevSai: f.sai, ent, sai, difEnt: ent - f.ent, difSai: sai - f.sai };
  });
}

// ------------------------------------------------------------------ real do orçado pelas baixas; relatórios
/** Real do mês por conta do plano, em reais: baixas de pagamentos e recebimentos + lançamentos avulsos nas contas. */
export function realDasBaixas(db, emp, comp = compAtual()) {
  const out = {}, mes = (d) => compDoDia(d) === comp, ok = (x) => emp === 'todas' || x.emp === emp, soma = (cat, c) => { if (cat) out[cat] = (out[cat] || 0) + c; };
  db.pags.filter(ok).forEach((p) => (p.baixas || []).filter((b) => mes(b.dia)).forEach((b) => soma(p.cat, b.total)));
  (db.recs || []).filter(ok).forEach((r) => (r.baixas || []).filter((b) => mes(b.dia)).forEach((b) => soma(r.cat || 'Receita de vendas', b.total)));
  (db.movs || []).filter((m) => ['avulso', 'cartao'].includes(m.tipo) && mes(m.dia) && (emp === 'todas' || (db.contas || []).find((c) => c.id === m.conta)?.emp === emp)).forEach((m) => soma(m.cat, Math.abs(m.c)));
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Math.round(v / 100)]));
}
/** DRE gerencial do mês por grupo e conta. Competência: títulos pelo vencimento; caixa: baixas e avulsos pela data. */
export function dre(db, emp, comp = compAtual(), { regime = 'competencia', cc = '' } = {}) {
  usarPlano(db); const mes = (d) => compDoDia(d) === comp, ok = (x) => (emp === 'todas' || x.emp === emp) && (!cc || x.cc === cc), v = {}, soma = (cat, c) => { if (cat) v[cat] = (v[cat] || 0) + c; };
  let retencoes = 0;
  if (regime === 'caixa') { db.pags.filter((p) => ok(p) && !p.distribuicao).forEach((p) => (p.baixas || []).filter((b) => mes(b.dia)).forEach((b) => soma(p.cat || 'Sem conta', p.emprestimo ? Math.round((b.total * p.juros) / p.c) : b.total))); (db.recs || []).filter(ok).forEach((r) => (r.baixas || []).filter((b) => mes(b.dia)).forEach((b) => soma(r.cat || 'Receita de vendas', b.total))); }
  else { db.pags.filter((p) => ok(p) && !p.distribuicao && !['cancelado', 'rejeitado'].includes(p.st) && mes(p.venc)).forEach((p) => soma(p.cat || 'Sem conta', p.emprestimo ? p.juros : p.c)); (db.recs || []).filter((r) => ok(r) && (r.st !== 'cancelado' || r.acordo) && mes(r.venc)).forEach((r) => { if (r.reneg) return soma(r.cat || 'Receita de vendas', r.juros || 0); soma(r.cat || 'Receita de vendas', r.bruto || r.c); retencoes += (r.bruto || r.c) - r.c; }); }
  (db.movs || []).filter((m) => ['avulso', 'cartao'].includes(m.tipo) && mes(m.dia) && (!cc || m.cc === cc) && (emp === 'todas' || (db.contas || []).find((c) => c.id === m.conta)?.emp === emp)).forEach((m) => soma(m.cat || 'Sem conta', Math.abs(m.c)));
  const tipo = (c) => db.plano.find((p) => p.c === c)?.t || (c === 'Sem conta' ? 'c' : 'c'), grupo = (c) => db.plano.find((p) => p.c === c)?.grupo || 'Sem conta';
  const linhas = Object.entries(v).map(([c, x]) => ({ c, t: tipo(c), grupo: grupo(c), v: x })).sort((a, b) => (a.t === b.t ? 0 : a.t === 'r' ? -1 : 1) || a.grupo.localeCompare(b.grupo) || b.v - a.v);
  const receita = linhas.filter((l) => l.t === 'r').reduce((s, l) => s + l.v, 0), custos = linhas.filter((l) => l.t === 'c').reduce((s, l) => s + l.v, 0);
  const grupos = []; linhas.forEach((l) => { let g = grupos.find((x) => x.grupo === l.grupo && x.t === l.t); if (!g) grupos.push((g = { grupo: l.grupo, t: l.t, v: 0, contas: [] })); g.v += l.v; g.contas.push(l); });
  return { comp, regime, receita, retencoes, custos, resultado: receita - retencoes - custos, grupos };
}
/** Contas a receber por faixa de atraso, por cliente. */
export function aging(db, emp) {
  const F = [['A vencer', (d) => d >= 0], ['1–30 dias', (d) => d < 0 && d >= -30], ['31–60 dias', (d) => d < -30 && d >= -60], ['61–90 dias', (d) => d < -60 && d >= -90], ['Mais de 90', (d) => d < -90]];
  const rs = (db.recs || []).filter((r) => (emp === 'todas' || r.emp === emp) && faltaTitulo(r)), porCli = {};
  rs.forEach((r) => { const k = r.cliente, i = F.findIndex(([, f]) => f(r.venc)); (porCli[k] ||= Array(F.length).fill(0))[i] += faltaTitulo(r); });
  const faixas = F.map(([n], i) => ({ n, v: Object.values(porCli).reduce((s, a) => s + a[i], 0) }));
  return { faixas, clientes: Object.entries(porCli).map(([cliente, v]) => ({ cliente, v, total: v.reduce((a, b) => a + b, 0), atrasado: v.slice(1).reduce((a, b) => a + b, 0) })).sort((a, b) => b.atrasado - a.atrasado || b.total - a.total), total: faixas.reduce((s, f) => s + f.v, 0) };
}
/** Extrato de uma conta com saldo depois de cada movimento (do mais antigo ao mais novo). */
export function extratoConta(db, id) { const c = (db.contas || []).find((x) => x.id === id); if (!c) return []; let s = c.saldoIni; return (db.movs || []).filter((m) => m.conta === id && m.dia >= c.desde).sort((a, b) => a.dia - b.dia).map((m) => { s += m.c; return { ...m, saldo: s }; }); }
/** Fluxo realizado por mês (DFC simplificada): entradas e saídas das contas bancárias, sem transferências entre contas próprias. */
export function dfc(db, emp, meses = 6, agora = new Date()) {
  const contas = new Set((db.contas || []).filter((c) => (emp === 'todas' || c.emp === emp) && c.tipo !== 'cartao').map((c) => c.id)), l = [];
  for (let i = meses - 1; i >= 0; i--) { const comp = proxComp(compAtual(agora), -i), ms = (db.movs || []).filter((m) => contas.has(m.conta) && !['transf', 'fatura'].includes(m.tipo) && compDoDia(m.dia) === comp); l.push({ comp, ent: ms.filter((m) => m.c > 0).reduce((s, m) => s + m.c, 0), sai: -ms.filter((m) => m.c < 0).reduce((s, m) => s + m.c, 0) }); }
  return l.map((x) => ({ ...x, liquido: x.ent - x.sai }));
}

// ------------------------------------------------------------------ nota fiscal de entrada (XML) → contas a pagar
/** nota = { chave, numero, cnpj, nome, total (centavos), emissao (AAAA-MM-DD), dups: [{ n, venc: AAAA-MM-DD, c }] }. */
export function pagamentosDaNota(db, nota, emp, { cat, cc } = {}, quem, papel) {
  exige(db, papel, 'criar'); const ch = String(nota.chave || '').replace(/\D/g, '');
  if (ch && db.pags.some((p) => p.nfe === ch)) throw new Error('Esta nota já foi lançada.');
  if (!Number.isInteger(nota.total) || nota.total <= 0) throw new Error('A nota não tem valor total.');
  const dups = (nota.dups || []).filter((d) => Number.isInteger(d.c) && d.c > 0 && d.venc);
  if (dups.length && dups.reduce((s, d) => s + d.c, 0) !== nota.total) throw new Error('As duplicatas não somam o total da nota: confira o XML.');
  let pes = acharPessoa(db, { doc: nota.cnpj, nome: nota.nome }); if (!pes && nota.nome) pes = salvarPessoa(db, { nome: nota.nome, tipo: 'fornecedor', doc: docValido(nota.cnpj) ? nota.cnpj : '' }, quem, papel);
  const partes = dups.length ? dups : [{ n: '1', venc: nota.emissao, c: nota.total }];
  const criados = partes.map((d, i) => novoPagamento(db, { emp, forn: pes?.nome || nota.nome || 'Fornecedor', desc: `NF ${nota.numero}${partes.length > 1 ? ` · dup ${d.n || i + 1}/${partes.length}` : ''}`, c: d.c, venc: diaDe(d.venc), cat, cc, pessoa: pes?.id, nfe: ch || undefined }, quem, papel)[0]);
  registra(db, quem, `lançou a NF ${nota.numero} de ${pes?.nome || nota.nome}: ${reais(nota.total)} em ${criados.length} parcela(s)`, { ref: `nfe:${ch}` }); return criados;
}

// ------------------------------------------------------------------ régua de cobrança (o app mostra; quem usa envia)
export function lembretesHoje(db, emp, regua = db.regua || [-3, 0, 3, 10]) {
  return (db.recs || []).filter((r) => (emp === 'todas' || r.emp === emp) && faltaTitulo(r) && regua.some((d) => r.venc + d === 0) && !(r.avisos || []).includes(0)).map((r) => ({ ...r, marco: r.venc > 0 ? `vence em ${r.venc} dia(s)` : r.venc === 0 ? 'vence hoje' : `atrasado ${-r.venc} dia(s)` }));
}
export function marcarCobrado(db, id, quem) { const r = (db.recs || []).find((x) => x.id === id); if (!r) throw new Error('Recebível não encontrado.'); (r.avisos ||= []).push(0); hist(r, quem, 'enviou lembrete de cobrança'); }

// ------------------------------------------------------------------ conciliação: vários títulos numa linha, lançamento avulso pela regra, em lote
export function conciliarVarios(db, extId, alvos, quem, papel) {
  exige(db, papel, 'conciliar'); const e = db.extrato.find((x) => x.id === extId); if (!e) throw new Error('Linha do extrato não encontrada.');
  if (e.pag || e.rec || e.mov || e.multi) throw new Error('Esta linha já está conciliada.'); if (alvos.length < 2) throw new Error('Escolha dois ou mais títulos.');
  const k = e.c > 0 ? 'rec' : 'pag', ts = alvos.map((id) => titulo(db, k, id)), soma = ts.reduce((s, t) => s + faltaTitulo(t), 0);
  if (soma !== Math.abs(e.c)) throw new Error(`Os títulos somam ${reais(soma)}; o banco mostra ${reais(Math.abs(e.c))}.`);
  const conta = e.conta || (db.contas || []).find((c) => c.emp === ts[0].emp)?.id || null;
  e.multi = ts.map((t) => ({ k, id: t.id, b: baixar(db, k, t.id, { c: faltaTitulo(t), dia: e.dia, conta, ext: e.id, origem: 'extrato' }, quem, papel, 'conciliar').id }));
  registra(db, quem, `conciliou ${reais(Math.abs(e.c))} do extrato com ${ts.length} títulos`, { ref: `ext:${e.id}` }); return e.multi;
}
/** Linha do banco sem título (tarifa, rendimento, IOF): lança direto na conta do plano, ligado ao extrato. */
export function lancarAvulso(db, extId, cat, quem, papel, cc = '') {
  exige(db, papel, 'conciliar'); const e = db.extrato.find((x) => x.id === extId); if (!e) throw new Error('Linha não encontrada.'); if (e.pag || e.rec || e.mov || e.multi) throw new Error('Esta linha já está conciliada.');
  usarPlano(db); if (!db.plano.some((p) => p.c === cat)) throw new Error('Escolha uma conta do plano.'); if (!e.conta) throw new Error('A linha não tem conta bancária: importe o extrato escolhendo a conta.'); exigeDia(db, e.dia);
  const m = { id: nid('m'), conta: e.conta, dia: e.dia, c: e.c, tipo: 'avulso', cat, ext: e.id, desc: e.desc }; if (cc) m.cc = cc; (db.movs ||= []).push(m); e.mov = m.id; e.avulso = true;
  registra(db, quem, `lançou ${reais(e.c)} do extrato direto em ${cat}`, { ref: `ext:${e.id}`, depois: cat }); return m;
}
/** Lança de uma vez as linhas com regra que tem conta do plano, e aceita as sugestões de título com valor exato. */
export function conciliarEmLote(db, quem, papel) {
  exige(db, papel, 'conciliar'); let avulsos = 0, titulos = 0;
  db.extrato.filter((e) => !e.pag && !e.rec && !e.mov && !e.multi).forEach((e) => {
    const p = sugerePagamento(db, e), r = !p && sugereRecebivel(db, e);
    try { if (p) { conciliarTitulo(db, e.id, 'pag', p.id, quem, papel); titulos++; return; } if (r) { conciliarTitulo(db, e.id, 'rec', r.id, quem, papel); titulos++; return; }
      const rg = (db.regras || []).find((x) => x.conta && norm(e.desc).includes(norm(x.se))); if (rg && e.conta) { lancarAvulso(db, e.id, rg.conta, quem, papel); avulsos++; } } catch { /* linha que não pôde (mês fechado, sem conta): fica para a mão */ }
  });
  return { titulos, avulsos };
}

// ------------------------------------------------------------------ empréstimo entre empresas (mútuo) e cartão corporativo
export function mutuo(db, d, quem, papel) {
  exige(db, papel, 'tesouraria'); const de = (db.contas || []).find((c) => c.id === d.de), para = (db.contas || []).find((c) => c.id === d.para), dia = Number.isInteger(d.dia) ? d.dia : 0;
  if (!de || !para) throw new Error('Escolha as duas contas.'); if (de.emp === para.emp) throw new Error('Mútuo é entre empresas diferentes; na mesma empresa use transferência.');
  if (de.tipo === 'cartao' || para.tipo === 'cartao') throw new Error('Use contas correntes.'); if (!Number.isInteger(d.c) || d.c <= 0) throw new Error('Digite o valor.'); if (dia > 0) throw new Error('A data não pode ser no futuro.'); exigeDia(db, dia);
  const id = nid('u'); (db.movs ||= []).push({ id: nid('m'), conta: de.id, dia, c: -d.c, tipo: 'mutuo', mutuo: id, desc: `Empréstimo para ${para.nome}` }, { id: nid('m'), conta: para.id, dia, c: d.c, tipo: 'mutuo', mutuo: id, desc: `Empréstimo de ${de.nome}` });
  (db.mutuos ||= []).push({ id, credora: de.emp, devedora: para.emp, c: d.c, dia, devolvido: 0, desc: String(d.desc || '').slice(0, 80) });
  registra(db, quem, `registrou empréstimo de ${reais(d.c)} entre empresas do grupo`, { ref: `mutuo:${id}`, depois: reais(d.c) }); return id;
}
export function devolverMutuo(db, id, d, quem, papel) {
  exige(db, papel, 'tesouraria'); const u = (db.mutuos || []).find((x) => x.id === id); if (!u) throw new Error('Empréstimo não encontrado.');
  const de = (db.contas || []).find((c) => c.id === d.de), para = (db.contas || []).find((c) => c.id === d.para), dia = Number.isInteger(d.dia) ? d.dia : 0, falta = u.c - u.devolvido;
  if (!de || !para || de.emp !== u.devedora || para.emp !== u.credora) throw new Error('A devolução sai da empresa que pegou e entra na que emprestou.');
  if (!Number.isInteger(d.c) || d.c <= 0 || d.c > falta) throw new Error(`Devolva de R$ 0,01 até ${reais(falta)}.`); exigeDia(db, dia);
  db.movs.push({ id: nid('m'), conta: de.id, dia, c: -d.c, tipo: 'mutuo', mutuo: id, desc: 'Devolução de empréstimo' }, { id: nid('m'), conta: para.id, dia, c: d.c, tipo: 'mutuo', mutuo: id, desc: 'Devolução de empréstimo recebida' });
  u.devolvido += d.c; registra(db, quem, `registrou devolução de ${reais(d.c)} de empréstimo entre empresas`, { ref: `mutuo:${id}`, antes: `falta ${reais(falta)}`, depois: `falta ${reais(falta - d.c)}` });
}
export function gastoCartao(db, d, quem, papel) {
  exige(db, papel, 'criar'); const c = (db.contas || []).find((x) => x.id === d.conta), dia = Number.isInteger(d.dia) ? d.dia : 0;
  if (!c || c.tipo !== 'cartao') throw new Error('Escolha o cartão.'); if (!Number.isInteger(d.c) || d.c <= 0) throw new Error('Digite o valor.'); usarPlano(db);
  if (!db.plano.some((p) => p.c === d.cat && p.t === 'c')) throw new Error('Escolha a conta de despesa.'); if (dia > 0) throw new Error('A data não pode ser no futuro.'); exigeDia(db, dia);
  const usado = -saldoConta(db, c.id); if (c.limite && usado + d.c > c.limite) throw new Error(`Passa do limite do cartão (${reais(c.limite)}).`);
  const m = { id: nid('m'), conta: c.id, dia, c: -d.c, tipo: 'cartao', cat: d.cat, desc: String(d.desc || 'Gasto no cartão').slice(0, 80) }; if (d.cc) m.cc = d.cc; if (d.reembolso) m.reembolso = true; db.movs.push(m);
  registra(db, quem, `lançou gasto de ${reais(d.c)} no cartão ${c.nome}: ${m.desc}`, { ref: `cartao:${c.id}`, depois: d.cat }); return m;
}
export function pagarFatura(db, d, quem, papel) {
  exige(db, papel, 'pagar'); const cartao = (db.contas || []).find((x) => x.id === d.cartao), de = (db.contas || []).find((x) => x.id === d.de), dia = Number.isInteger(d.dia) ? d.dia : 0;
  if (!cartao || cartao.tipo !== 'cartao') throw new Error('Escolha o cartão.'); if (!de || de.tipo === 'cartao') throw new Error('Escolha a conta corrente que paga.'); if (de.emp !== cartao.emp) throw new Error('A fatura é paga pela mesma empresa do cartão.');
  const fat = -saldoConta(db, cartao.id); if (!Number.isInteger(d.c) || d.c <= 0 || d.c > fat) throw new Error(`Pague de R$ 0,01 até ${reais(Math.max(0, fat))}.`); exigeDia(db, dia);
  const t = nid('t'); db.movs.push({ id: nid('m'), conta: de.id, dia, c: -d.c, tipo: 'fatura', transf: t, desc: `Fatura ${cartao.nome}` }, { id: nid('m'), conta: cartao.id, dia, c: d.c, tipo: 'fatura', transf: t, desc: 'Pagamento da fatura' });
  registra(db, quem, `pagou ${reais(d.c)} da fatura do cartão ${cartao.nome}`, { ref: `cartao:${cartao.id}`, antes: reais(fat), depois: reais(fat - d.c) });
}

// ------------------------------------------------------------------ trava por data e importação de títulos por planilha
export function definirTrava(db, iso, quem, papel) {
  if (papel !== 'dono') throw new Error('Só o dono trava por data.'); if (iso && !/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('Data inválida.'); if (iso && iso > hojeISO()) throw new Error('A trava não pode ser no futuro.');
  const antes = db.travaAte || ''; if (iso) db.travaAte = iso; else delete db.travaAte; registra(db, quem, iso ? 'travou lançamentos até uma data' : 'tirou a trava por data', { ref: 'trava', antes: antes || 'sem trava', depois: iso || 'sem trava' });
}
export function exigeDia(db, dia) { exigeAberto(db, compDoDia(dia)); if (db.travaAte && isoDe(dia) <= db.travaAte) throw new Error(`Lançamentos até ${db.travaAte.split('-').reverse().join('/')} estão travados. O dono tira a trava em Equipe e alçadas.`); }
const COLS = { tipo: /^tipo/, empresa: /^empresa/, nome: /^(nome|cliente|fornecedor|favorecido)/, desc: /^(descri|o qu|historico|histórico)/, valor: /^valor/, venc: /^(venc|data)/, conta: /^(conta|categoria|plano)/, cc: /^(centro|cc)/ };
/** linhas = [[cabeçalho], [valores], ...] (CSV ou .xlsx). simular = true só confere. Devolve { ok: [títulos], erros: [{ linha, motivo }] }. */
export function importarTitulos(db, linhas, emps, quem, papel, simular = false) {
  exige(db, papel, 'criar'); if (!linhas.length) throw new Error('Planilha vazia.');
  const cab = linhas[0].map((h) => norm(String(h)).trim()), col = Object.fromEntries(Object.entries(COLS).map(([k, re]) => [k, cab.findIndex((h) => re.test(h))]));
  if ([col.valor, col.venc, col.nome].some((i) => i < 0)) throw new Error('A planilha precisa das colunas Nome, Valor e Vencimento (e de preferência Tipo, Empresa, Descrição, Conta e Centro).');
  usarPlano(db); const ok = [], erros = [], alvo = simular ? JSON.parse(JSON.stringify(db)) : db; usarPlano(alvo);
  linhas.slice(1).forEach((l, i) => { if (!l.some((x) => String(x || '').trim())) return; const v = (k) => (col[k] >= 0 ? String(l[col[k]] ?? '').trim() : '');
    try { const tipo = /receb|entrada|cliente/i.test(v('tipo')) ? 'rec' : 'pag', c = centavos(v('valor').replace(/^-/, '')); if (!Number.isInteger(c) || c <= 0) throw new Error('valor inválido');
      const dt = v('venc'), iso = /^\d{2}\/\d{2}\/\d{4}$/.test(dt) ? dt.split('/').reverse().join('-') : dt; if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('vencimento inválido (use DD/MM/AAAA)');
      const e = v('empresa') ? emps.find((x) => norm(x.nome) === norm(v('empresa')) || x.k === v('empresa')) : emps[0]; if (!e) throw new Error(`empresa "${v('empresa')}" não existe`);
      const cat = v('conta') ? alvo.plano.find((p) => norm(p.c) === norm(v('conta')))?.c : undefined; if (v('conta') && !cat) throw new Error(`conta "${v('conta')}" não está no plano`);
      const cc = v('cc') ? (alvo.centros || []).find((x) => norm(x.nome) === norm(v('cc')))?.id : undefined; if (v('cc') && !cc) throw new Error(`centro de custo "${v('cc')}" não existe`);
      const base = { emp: e.k, desc: v('desc') || 'Importado da planilha', c, venc: diaDe(iso), cat, cc };
      ok.push(...(tipo === 'pag' ? novoPagamento(alvo, { ...base, forn: v('nome') }, quem, papel) : novoRecebivel(alvo, { ...base, cliente: v('nome') }, quem, papel)));
    } catch (x) { erros.push({ linha: i + 2, motivo: x.message }); } });
  if (!simular && ok.length) registra(db, quem, `importou ${ok.length} título(s) de planilha (${erros.length} recusado[s])`, { ref: 'importacao' });
  usarPlano(db); return { ok, erros };
}

// ------------------------------------------------------------------ crédito e dívida: empréstimo, aplicação, antecipação, adiantamento e acordo
const pctOk = (v, max, nome) => { const x = Number(String(v ?? '').replace(',', '.')); if (String(v ?? '').trim() === '' || !Number.isFinite(x) || x < 0 || x > max) throw new Error(`${nome}: de 0 a ${String(max).replace('.', ',')}%.`); return x; };
const corrente = (db, id, rotulo = 'Escolha a conta corrente.') => { const c = (db.contas || []).find((x) => x.id === id); if (!c || c.tipo === 'cartao') throw new Error(rotulo); return c; };
/** Tabela do empréstimo em centavos: Price (parcela fixa) ou SAC (amortização fixa); taxa em % ao mês; a última parcela zera o saldo. */
export function tabelaEmprestimo(c, taxa, n, sistema = 'price') {
  const i = taxa / 100, pmt = i ? (c * i) / (1 - (1 + i) ** -n) : c / n; let saldo = c;
  return Array.from({ length: n }, (_, k) => { const juros = Math.round(saldo * i), amort = k === n - 1 ? saldo : sistema === 'sac' ? Math.floor(c / n) : Math.round(pmt) - juros; saldo -= amort; return { n: k + 1, juros, amort, parcela: juros + amort, saldo }; });
}
/** Empréstimo bancário: o dinheiro entra na conta e as parcelas viram pagamentos já aprovados (contrato assinado); a DRE só leva os juros. */
export function contratarEmprestimo(db, d, quem, papel) {
  exige(db, papel, 'tesouraria'); const ct = corrente(db, d.conta, 'Escolha a conta que recebe o dinheiro.'), dia = Number.isInteger(d.dia) ? d.dia : 0, banco = String(d.banco || '').trim().slice(0, 60);
  if (!banco) throw new Error('Diga o banco ou credor.'); if (!Number.isInteger(d.c) || d.c <= 0) throw new Error('Digite o valor contratado.');
  const taxa = pctOk(d.taxa, 15, 'Taxa ao mês'), n = Number(d.n); if (!Number.isInteger(n) || n < 1 || n > 120) throw new Error('Parcelas de 1 a 120.'); if (!['price', 'sac'].includes(d.sistema)) throw new Error('Escolha Price ou SAC.');
  if (dia > 0) throw new Error('A data não pode ser no futuro.'); if (dia < ct.desde) throw new Error('A data é anterior ao saldo inicial da conta.'); exigeDia(db, dia);
  const venc = Number.isInteger(d.venc) ? d.venc : dia + 30; if (venc <= dia) throw new Error('A 1ª parcela vence depois da contratação.');
  usarPlano(db); const id = nid('e'), tab = tabelaEmprestimo(d.c, taxa, n, d.sistema), datas = parcelar(n, n, venc), cat = CATS.some(([c]) => c === 'Despesas financeiras') ? 'Despesas financeiras' : undefined;
  (db.movs ||= []).push({ id: nid('m'), conta: ct.id, dia, c: d.c, tipo: 'emprestimo', emprestimo: id, desc: `Empréstimo ${banco}` });
  const parcelas = tab.map((p, k) => { const x = { id: nid('p'), emp: ct.emp, forn: banco, desc: `Parcela ${p.n}/${n} do empréstimo`, c: p.parcela, venc: datas[k].venc, st: 'aprovado', sel: false, criadoPor: quem, baixas: [], emprestimo: id, juros: p.juros, amort: p.amort }; if (cat) x.cat = cat; hist(x, quem, `parcela do empréstimo: juros ${reais(p.juros)}, amortização ${reais(p.amort)}`); db.pags.push(x); return x.id; });
  const e = { id, emp: ct.emp, conta: ct.id, banco, c: d.c, taxa, n, sistema: d.sistema, dia, parcelas }; (db.emprestimos ||= []).push(e);
  registra(db, quem, `contratou empréstimo de ${reais(d.c)} com ${banco} em ${n}x (${d.sistema === 'sac' ? 'SAC' : 'Price'}, ${String(taxa).replace('.', ',')}% a.m.)`, { ref: `emprestimo:${id}`, depois: reais(tab.reduce((s, p) => s + p.parcela, 0)) }); return e;
}
/** Quanto falta do principal e dos juros: soma das parcelas que ainda não foram pagas (proporcional quando pagou só uma parte). */
export function saldoEmprestimo(db, id) {
  const ps = db.pags.filter((p) => p.emprestimo === id && p.st !== 'cancelado'), f = (p) => faltaTitulo(p) / p.c;
  return { principal: Math.round(ps.reduce((s, p) => s + p.amort * f(p), 0)), juros: Math.round(ps.reduce((s, p) => s + p.juros * f(p), 0)), pagas: ps.filter((p) => !faltaTitulo(p)).length, de: ps.length };
}
export const aliquotaIR = (dias) => (dias <= 180 ? 22.5 : dias <= 360 ? 20 : dias <= 720 ? 17.5 : 15);
/** Posição da aplicação: rende a taxa ao ano sobre dias corridos; o IR regressivo incide só no rendimento. shortcut: dias corridos/365, não dias úteis/252; serve para planejar, o extrato do banco manda. */
export function posicaoAplicacao(a, hoje = 0) {
  const dias = Math.max(0, (a.resgate ? a.resgate.dia : hoje) - a.dia), bruto = Math.round(a.c * (1 + a.taxaAno / 100) ** (dias / 365)), rend = bruto - a.c, aliq = aliquotaIR(dias), ir = Math.round((rend * aliq) / 100);
  return { dias, bruto, rend, aliq, ir, liquido: bruto - ir };
}
export function aplicar(db, d, quem, papel) {
  exige(db, papel, 'tesouraria'); const ct = corrente(db, d.conta), dia = Number.isInteger(d.dia) ? d.dia : 0, nome = String(d.nome || '').trim().slice(0, 60);
  if (!nome) throw new Error('Dê um nome à aplicação (ex.: CDB 102% CDI).'); if (!Number.isInteger(d.c) || d.c <= 0) throw new Error('Digite o valor.');
  const taxaAno = pctOk(d.taxaAno, 40, 'Rendimento ao ano'); if (dia > 0) throw new Error('A data não pode ser no futuro.'); if (dia < ct.desde) throw new Error('A data é anterior ao saldo inicial da conta.'); exigeDia(db, dia);
  if (d.c > saldoConta(db, ct.id, dia)) throw new Error(`Saldo insuficiente em ${ct.nome}.`);
  const a = { id: nid('i'), emp: ct.emp, conta: ct.id, nome, c: d.c, taxaAno, dia }; (db.aplicacoes ||= []).push(a);
  (db.movs ||= []).push({ id: nid('m'), conta: ct.id, dia, c: -d.c, tipo: 'aplicacao', aplicacao: a.id, desc: `Aplicação ${nome}` });
  registra(db, quem, `aplicou ${reais(d.c)} em ${nome} (${String(taxaAno).replace('.', ',')}% a.a.)`, { ref: `aplicacao:${a.id}`, depois: reais(d.c) }); return a;
}
export function resgatar(db, id, quem, papel, dia = 0) {
  exige(db, papel, 'tesouraria'); const a = (db.aplicacoes || []).find((x) => x.id === id); if (!a) throw new Error('Aplicação não encontrada.'); if (a.resgate) throw new Error('Esta aplicação já foi resgatada.');
  if (dia > 0 || dia < a.dia) throw new Error('Resgate entre a data da aplicação e hoje.'); exigeDia(db, dia);
  const p = posicaoAplicacao(a, dia); a.resgate = { dia, ...p, em: new Date().toISOString(), quem };
  db.movs.push({ id: nid('m'), conta: a.conta, dia, c: p.liquido, tipo: 'aplicacao', aplicacao: a.id, desc: `Resgate ${a.nome} (IR ${String(p.aliq).replace('.', ',')}%)` });
  registra(db, quem, `resgatou ${a.nome}: ${reais(p.liquido)} líquido (rendeu ${reais(p.rend)}, IR ${reais(p.ir)})`, { ref: `aplicacao:${a.id}`, antes: reais(a.c), depois: reais(p.liquido) }); return p;
}
/** Antecipação de recebíveis: desconto = valor × taxa ao mês × dias até o vencimento ÷ 30, título a título. */
export function simularAntecipacao(db, ids, taxa) {
  const tx = pctOk(taxa, 10, 'Taxa ao mês'), l = ids.map((id) => titulo(db, 'rec', id));
  if (!l.length) throw new Error('Escolha os recebíveis a antecipar.'); if (new Set(l.map((r) => r.emp)).size > 1) throw new Error('Antecipe recebíveis de uma empresa por vez.');
  const itens = l.map((r) => { const falta = faltaTitulo(r); if (r.st === 'cancelado' || !falta) throw new Error(`${r.cliente}: não está em aberto.`); if (r.venc <= 0) throw new Error(`${r.cliente}: já venceu; antecipação é de título a vencer.`); return { id: r.id, cliente: r.cliente, venc: r.venc, falta, desconto: Math.round((falta * tx * r.venc) / 3000) }; });
  const bruto = itens.reduce((s, x) => s + x.falta, 0), desconto = itens.reduce((s, x) => s + x.desconto, 0);
  return { emp: l[0].emp, taxa: tx, itens, bruto, desconto, liquido: bruto - desconto, prazoMedio: Math.round(itens.reduce((s, x) => s + x.falta * x.venc, 0) / bruto) };
}
export function anteciparRecebiveis(db, ids, d, quem, papel) {
  exige(db, papel, 'pagar'); const s = simularAntecipacao(db, ids, d.taxa), ct = corrente(db, d.conta); if (ct.emp !== s.emp) throw new Error('A conta é de outra empresa.');
  const banco = String(d.banco || 'banco').trim().slice(0, 40);
  s.itens.forEach((x) => { baixar(db, 'rec', x.id, { c: x.falta, desconto: x.desconto, dia: 0, conta: ct.id, origem: 'antecipacao' }, quem, papel); titulo(db, 'rec', x.id).antecipado = { banco, taxa: s.taxa, desconto: x.desconto }; });
  registra(db, quem, `antecipou ${s.itens.length} recebível(is) com ${banco}: ${reais(s.bruto)} por ${reais(s.liquido)} (custo ${reais(s.desconto)})`, { ref: `conta:${ct.id}`, antes: reais(s.bruto), depois: reais(s.liquido) }); return s;
}
/** Adiantamento a fornecedor: o dinheiro sai agora e vira crédito para abater dos próximos pagamentos dele. */
export function adiantar(db, d, quem, papel) {
  exige(db, papel, 'pagar'); const ct = corrente(db, d.conta), dia = Number.isInteger(d.dia) ? d.dia : 0, forn = String(d.forn || '').trim().slice(0, 80);
  if (!forn) throw new Error('Diga o fornecedor.'); if (!Number.isInteger(d.c) || d.c <= 0) throw new Error('Digite o valor.'); if (dia > 0) throw new Error('A data não pode ser no futuro.'); if (dia < ct.desde) throw new Error('A data é anterior ao saldo inicial da conta.'); exigeDia(db, dia);
  const a = { id: nid('d'), emp: ct.emp, conta: ct.id, forn, c: d.c, usado: 0, dia, desc: String(d.desc || '').trim().slice(0, 80) }; if (d.pessoa) a.pessoa = d.pessoa; (db.adiantamentos ||= []).push(a);
  (db.movs ||= []).push({ id: nid('m'), conta: ct.id, dia, c: -d.c, tipo: 'adiantamento', adiantamento: a.id, desc: `Adiantamento a ${forn}` });
  registra(db, quem, `adiantou ${reais(d.c)} a ${forn}`, { ref: `adiantamento:${a.id}`, depois: reais(d.c) }); return a;
}
const mesmoForn = (a, p) => (a.pessoa && p.pessoa ? a.pessoa === p.pessoa : norm(a.forn) === norm(p.forn));
export const pagamentosParaAbater = (db, a) => db.pags.filter((p) => p.emp === a.emp && ['aprovado', 'remessa'].includes(p.st) && faltaTitulo(p) && !p.emprestimo && mesmoForn(a, p));
export function compensarAdiantamento(db, adId, pagId, quem, papel) {
  exige(db, papel, 'pagar'); exigeDia(db, 0); const a = (db.adiantamentos || []).find((x) => x.id === adId); if (!a) throw new Error('Adiantamento não encontrado.');
  const p = titulo(db, 'pag', pagId); if (!pagamentosParaAbater(db, a).includes(p)) throw new Error('Só abate pagamento aprovado e em aberto do mesmo fornecedor e da mesma empresa.');
  const v = Math.min(a.c - a.usado, faltaTitulo(p)); if (v <= 0) throw new Error('Este adiantamento já foi todo usado.');
  const b = { id: nid('b'), c: v, juros: 0, multa: 0, desconto: 0, total: v, dia: 0, conta: null, em: new Date().toISOString(), quem, origem: 'adiantamento', adiant: a.id };
  (p.baixas ||= []).push(b); a.usado += v; if (!faltaTitulo(p)) { p.st = 'pago'; p.pagoEm = 0; }
  hist(p, quem, `abateu ${reais(v)} do adiantamento a ${a.forn}`); registra(db, quem, `abateu ${reais(v)} do adiantamento a ${a.forn}`, { ref: `pag:${p.id}`, antes: `crédito ${reais(a.c - a.usado + v)}`, depois: `crédito ${reais(a.c - a.usado)}` }); return v;
}
/** Acordo com cliente: junta títulos em aberto de um cliente, cancela os originais (a receita fica no mês de origem) e parcela o saldo com juros (Price). */
export function renegociar(db, ids, d, quem, papel) {
  exige(db, papel, 'criar'); exigeAberto(db); const l = ids.map((id) => titulo(db, 'rec', id)); if (!l.length) throw new Error('Escolha os títulos do acordo.');
  if (new Set(l.map((r) => `${r.emp}|${r.pessoa || norm(r.cliente)}`)).size > 1) throw new Error('Um acordo é de um cliente e uma empresa só.');
  l.forEach((r) => { if (r.st === 'cancelado' || !faltaTitulo(r)) throw new Error(`${r.desc}: não está em aberto.`); if (baixado(r)) throw new Error(`${r.desc}: já recebeu uma parte; receba o resto ou faça o acordo só dos títulos sem baixa.`); if (r.reneg) throw new Error(`${r.desc}: já é parcela de um acordo.`); });
  const n = Number(d.n); if (!Number.isInteger(n) || n < 1 || n > 24) throw new Error('Parcelas de 1 a 24.'); const taxa = pctOk(d.taxa, 10, 'Juros ao mês'), venc = Number(d.venc); if (!Number.isInteger(venc) || venc < 0) throw new Error('A 1ª parcela vence hoje ou depois.');
  const falta = l.reduce((s, r) => s + faltaTitulo(r), 0), tab = tabelaEmprestimo(falta, taxa, n), total = tab.reduce((s, p) => s + p.parcela, 0), id = nid('k');
  l.forEach((r) => { cancelarRecebivel(db, r.id, quem, papel, `renegociado no acordo ${id}`); r.acordo = id; });
  const novos = novoRecebivel(db, { emp: l[0].emp, cliente: l[0].cliente, desc: `Acordo de ${l.length} título(s)`, c: total, venc, parcelas: n, cat: l[0].cat, pessoa: l[0].pessoa, semLimite: true }, quem, papel);
  novos.forEach((x, i) => { x.reneg = id; x.juros = Math.min(x.c, tab[i].juros); });
  const k = { id, emp: l[0].emp, cliente: l[0].cliente, origem: l.map((r) => r.id), falta, juros: total - falta, n, taxa, em: new Date().toISOString(), quem }; (db.acordos ||= []).push(k);
  registra(db, quem, `fez acordo com ${k.cliente}: ${reais(falta)} em ${n}x com ${String(taxa).replace('.', ',')}% a.m. (total ${reais(total)})`, { ref: `acordo:${id}`, antes: reais(falta), depois: reais(total) }); return k;
}
/** Limite de crédito do cliente: o que ele ainda deve (títulos em aberto) contra o limite do cadastro (null = sem limite). */
export function creditoPessoa(db, id) {
  const p = (db.pessoas || []).find((x) => x.id === id), usado = (db.recs || []).filter((r) => r.pessoa === id && r.st !== 'cancelado').reduce((s, r) => s + faltaTitulo(r), 0), limite = p?.limite ?? null;
  return { limite, usado, livre: limite === null ? null : limite - usado };
}

// ------------------------------------------------------------------ análises: reajuste de contratos, provisões da folha, ciclo financeiro e ponto de equilíbrio
export function reajustarRecorrencias(db, ids, pct, indice, quem, papel) {
  exige(db, papel, 'criar'); const p = Number(String(pct ?? '').replace(',', '.')); if (String(pct ?? '').trim() === '' || !Number.isFinite(p) || p < -30 || p > 50) throw new Error('Reajuste de -30% a 50%.');
  const ind = String(indice || '').trim().slice(0, 30) || 'índice', l = (db.recorrentes || []).filter((r) => ids.includes(r.id)); if (!l.length) throw new Error('Escolha as recorrências.');
  l.forEach((r) => { const antes = r.c; r.c = Math.max(1, Math.round((r.c * (100 + p)) / 100)); (r.reajustes ||= []).push({ em: new Date().toISOString(), quem, indice: ind, pct: p, antes, depois: r.c }); registra(db, quem, `reajustou ${r.desc} em ${String(p).replace('.', ',')}% (${ind})`, { ref: `rec-fixa:${r.id}`, antes: reais(antes), depois: reais(r.c) }); });
  return l;
}
/** Provisão mensal da folha: 13º = folha ÷ 12; férias + 1/3 = folha ÷ 12 × 4/3; encargos (FGTS, e INSS fora do Simples) sobre as duas. Folha: a informada (real do mês) ou a da DRE. */
export function provisoesFolha(db, emp, comp = compAtual(), folhaReal = null) {
  const encPct = db.encProvisao ?? 8, folha = folhaReal ?? (dre(db, emp, comp).grupos.flatMap((g) => g.contas).find((c) => c.c === 'Folha e encargos')?.v || 0), decimo = Math.round(folha / 12), ferias = Math.round((folha * 4) / 36), enc = Math.round(((decimo + ferias) * encPct) / 100);
  return { folha, decimo, ferias, enc, encPct, total: decimo + ferias + enc };
}
export function registrarProvisao(db, emp, comp, quem, papel, folhaReal = null) {
  exige(db, papel, 'criar'); exigeAberto(db, comp); if (!emp || emp === 'todas') throw new Error('Escolha uma empresa.');
  if ((db.provisoes || []).some((p) => p.emp === emp && p.comp === comp)) throw new Error('A provisão deste mês já foi registrada.');
  const p = provisoesFolha(db, emp, comp, folhaReal); if (!p.folha) throw new Error('Não há folha lançada neste mês (conta Folha e encargos).');
  const x = { id: nid('v'), emp, comp, ...p, em: new Date().toISOString(), quem }; (db.provisoes ||= []).push(x);
  registra(db, quem, `registrou a provisão de 13º e férias de ${nomeComp(comp)}: ${reais(p.total)}`, { ref: `provisao:${emp}:${comp}`, depois: reais(p.total) }); return x;
}
export const provisaoAcumulada = (db, emp, ano = compAtual().slice(0, 4)) => (db.provisoes || []).filter((p) => (emp === 'todas' || p.emp === emp) && p.comp.startsWith(ano)).reduce((s, p) => s + p.total, 0);
/** Ciclo financeiro = estoque (dias, informado) + prazo médio de recebimento − prazo médio de pagamento. Prazos do cadastro, pesados pelo volume de 90 dias atrás a 30 à frente. */
export function cicloFinanceiro(db, emp, pme = Number(db.pme?.[emp]) || 0) {
  const ok = (x) => (emp === 'todas' || x.emp === emp) && x.venc >= -90 && x.venc <= 30, prazo = (id) => (db.pessoas || []).find((p) => p.id === id)?.prazo || 0;
  const medio = (l, val) => { const tot = l.reduce((s, x) => s + val(x), 0); return tot ? Math.round(l.reduce((s, x) => s + val(x) * prazo(x.pessoa), 0) / tot) : null; };
  const recs = (db.recs || []).filter((r) => ok(r) && r.st !== 'cancelado' && !r.reneg), pags = db.pags.filter((p) => ok(p) && !['cancelado', 'rejeitado'].includes(p.st) && !p.emprestimo);
  const pmr = medio(recs, (r) => r.bruto || r.c), pmp = medio(pags, (p) => p.c);
  return { pme, pmr, pmp, ciclo: pmr === null || pmp === null ? null : pme + pmr - pmp, vendas: recs.reduce((s, r) => s + (r.bruto || r.c), 0), compras: pags.reduce((s, p) => s + p.c, 0) };
}
export const VARIAVEIS = ['Custo das mercadorias', 'Fretes', 'Impostos e taxas'];
/** Margem de contribuição e ponto de equilíbrio do mês: custos variáveis (lista editável) e o resto é fixo. Linhas {c, t, v}: as informadas (real do mês) ou as da DRE. */
export function equilibrio(db, emp, comp = compAtual(), linhas = null) {
  const D = linhas ? null : dre(db, emp, comp), l = linhas || D.grupos.flatMap((g) => g.contas), vars = db.variaveis || VARIAVEIS, custos = l.filter((c) => c.t === 'c');
  const receita = linhas ? l.filter((c) => c.t === 'r').reduce((s, c) => s + c.v, 0) : D.receita - D.retencoes, variaveis = custos.filter((c) => vars.includes(c.c)).reduce((s, c) => s + c.v, 0), fixos = custos.reduce((s, c) => s + c.v, 0) - variaveis, mc = receita - variaveis, mcPct = receita ? mc / receita : null;
  const pe = mcPct > 0 ? Math.round(fixos / mcPct) : null; return { receita, variaveis, fixos, mc, mcPct, pe, seguranca: pe !== null && receita ? (receita - pe) / receita : null };
}

// ------------------------------------------------------------------ funções de 10/2026 (2ª leva)
const diaDoMes = (comp, dd, agora = new Date()) => { const [a, m] = comp.split('-').map(Number), ult = new Date(a, m, 0).getDate(), d = new Date(a, m - 1, Math.min(dd, ult), 12); return diaDe(hojeISO(d), agora); };
/** Vencimento federal no fim de semana antecipa para a sexta (DAS, DARF, FGTS); o municipal (ISS) e o estadual seguem a data. */
const antecipaFds = (dia, agora = new Date()) => { const w = dataDe(dia, agora).getDay(); return w === 6 ? dia - 1 : w === 0 ? dia - 2 : dia; };
export const OBRIGACOES = [['das', 'DAS do Simples Nacional', 20, true], ['pis', 'PIS e COFINS (DARF)', 25, true], ['irpj', 'IRPJ e CSLL (DARF)', 31, true], ['fgts', 'FGTS', 20, true], ['inss', 'INSS (GPS / DCTFWeb)', 20, true], ['irrf', 'IRRF sobre salários e serviços', 20, true], ['icms', 'ICMS', 9, false], ['iss', 'ISS', 10, false]];
/** Calendário fiscal do mês por empresa: cada obrigação marcada na empresa (db.obrigacoes[emp]) com o vencimento e se a guia já foi lançada. */
export function calendarioFiscal(db, emp, comp = compAtual(), agora = new Date()) {
  const emps = emp === 'todas' ? Object.keys(db.obrigacoes || {}) : [emp];
  return emps.flatMap((e) => (db.obrigacoes?.[e] || []).map((k) => { const o = OBRIGACOES.find(([x]) => x === k); if (!o) return null; const d0 = diaDoMes(comp, o[2], agora), venc = o[3] ? antecipaFds(d0, agora) : d0, guia = db.pags.find((p) => p.obrig === `${comp}:${e}:${k}` && !['cancelado', 'rejeitado'].includes(p.st)); return { emp: e, k, nome: o[1], venc, guia, st: guia ? (faltaTitulo(guia) ? 'lançada' : 'paga') : venc < 0 ? 'atrasada' : venc <= 5 ? 'vence logo' : 'a lançar' }; }).filter(Boolean)).sort((a, b) => a.venc - b.venc);
}
export function lancarGuia(db, { emp, k, c, comp = compAtual() }, quem, papel) {
  const o = OBRIGACOES.find(([x]) => x === k); if (!o) throw new Error('Obrigação não encontrada.'); const it = calendarioFiscal(db, emp, comp).find((x) => x.k === k); if (!it) throw new Error('Esta obrigação não está marcada para a empresa.'); if (it.guia) throw new Error('A guia deste mês já foi lançada.');
  usarPlano(db); const cat = CATS.some(([x]) => x === 'Impostos e taxas') ? 'Impostos e taxas' : undefined, [p] = novoPagamento(db, { emp, forn: o[1].split(' (')[0], desc: `${o[1]} · competência ${nomeComp(proxComp(comp, -1))}`, c, venc: it.venc, cat, imposto: true }, quem, papel); p.obrig = `${comp}:${emp}:${k}`; return p;
}
/** Retenções que os clientes fizeram nas notas (IR, PIS/COFINS/CSLL, INSS, ISS): crédito para abater na apuração do mês. */
export function retencoesSofridas(db, emp, comp = compAtual()) {
  const rs = (db.recs || []).filter((r) => (emp === 'todas' || r.emp === emp) && r.ret && r.st !== 'cancelado' && compDoDia(r.venc) === comp), t = Object.fromEntries(Object.keys(RETENCOES).map((k) => [k, 0]));
  rs.forEach((r) => Object.entries(r.ret).forEach(([k, v]) => { t[k] = (t[k] || 0) + v; })); return { notas: rs, porTipo: t, total: Object.values(t).reduce((a, b) => a + b, 0) };
}
// Regimes: Simples (anexo I comércio, III serviços), Presumido e Real. Valores em centavos por ano. ICMS/ISS ficam fora da comparação nos
// três (no Simples eles estão dentro da guia; por isso o "imposto local" informado soma no Presumido e no Real). shortcut: sem ICMS-ST, sem créditos de ICMS, sem desonerações; é para conversar com o contador.
const SIMPLES = { comercio: [[18000000, 4, 0], [36000000, 7.3, 594000], [72000000, 9.5, 1386000], [180000000, 10.7, 2250000], [360000000, 14.3, 8730000], [480000000, 19, 37800000]], servico: [[18000000, 6, 0], [36000000, 11.2, 936000], [72000000, 13.5, 1764000], [180000000, 16, 3564000], [360000000, 21, 12564000], [480000000, 33, 64800000]] };
export function compararRegimes({ receita, ativ = 'comercio', margem = 10, creditos = 0, local = 0 }) {
  if (!Number.isInteger(receita) || receita <= 0) throw new Error('Digite o faturamento do ano.'); if (!['comercio', 'servico'].includes(ativ)) throw new Error('Escolha comércio ou serviço.');
  if (!(margem >= -100 && margem <= 100)) throw new Error('Margem de lucro entre −100% e 100%.'); if (!Number.isInteger(creditos) || creditos < 0 || creditos > receita) throw new Error('Compras com crédito inválidas.');
  const adic = (base) => Math.max(0, base - 24000000) * 0.1, loc = Math.round(receita * local / 100), r = [];
  if (receita <= 480000000) { const [, aliq, ded] = SIMPLES[ativ].find(([lim]) => receita <= lim), ef = (receita * aliq / 100 - ded) / receita; r.push({ k: 'simples', nome: 'Simples Nacional', total: Math.round(receita * ef), ef, obs: `anexo ${ativ === 'comercio' ? 'I' : 'III'} · já inclui ${ativ === 'comercio' ? 'ICMS' : 'ISS'}` }); }
  else r.push({ k: 'simples', nome: 'Simples Nacional', total: null, obs: 'acima de R$ 4,8 milhões não pode' });
  const pIR = ativ === 'comercio' ? 0.08 : 0.32, pCS = ativ === 'comercio' ? 0.12 : 0.32, bIR = receita * pIR, pres = Math.round(bIR * 0.15 + adic(bIR) + receita * pCS * 0.09 + receita * 0.0365) + loc;
  r.push(receita <= 7800000000 ? { k: 'presumido', nome: 'Lucro Presumido', total: pres, ef: pres / receita, obs: `presunção ${pIR * 100}% (IRPJ) e ${pCS * 100}% (CSLL), PIS/COFINS 3,65%` } : { k: 'presumido', nome: 'Lucro Presumido', total: null, obs: 'acima de R$ 78 milhões não pode' });
  const lucro = Math.max(0, receita * margem / 100), real = Math.round(lucro * 0.15 + adic(lucro) + lucro * 0.09 + (receita - creditos) * 0.0925) + loc;
  r.push({ k: 'real', nome: 'Lucro Real', total: real, ef: real / receita, obs: 'IRPJ e CSLL sobre o lucro; PIS/COFINS 9,25% não cumulativo' });
  const ok = r.filter((x) => x.total !== null).sort((a, b) => a.total - b.total); return { regimes: r, melhor: ok[0]?.k, economia: ok.length > 1 ? ok[1].total - ok[0].total : 0 };
}
// Sócios: pró-labore (com o INSS de 11% retido) e distribuição de lucros limitada ao lucro do ano.
export function proLabore(db, emp, comp = compAtual(), quem, papel) {
  exige(db, papel, 'criar'); exigeAberto(db); const ss = (db.socios || []).filter((s) => s.emp === emp && s.proLabore > 0); if (!ss.length) throw new Error('Nenhum sócio com pró-labore nesta empresa.');
  if (db.pags.some((p) => p.prolabore === `${comp}:${emp}`)) throw new Error(`O pró-labore de ${nomeComp(comp)} já foi lançado.`);
  usarPlano(db); const teto = Number.isInteger(db.tetoINSS) ? db.tetoINSS : 815741, cat = CATS.some(([x]) => x === 'Folha e encargos') ? 'Folha e encargos' : undefined, venc = diaDoMes(proxComp(comp), 5);
  let inss = 0; const criados = ss.map((s) => { const ret = Math.round(Math.min(s.proLabore, teto) * 0.11); inss += ret; const [p] = novoPagamento(db, { emp, forn: s.nome, desc: `Pró-labore de ${nomeComp(comp)} (líquido)`, c: s.proLabore - ret, venc, cat }, quem, papel); p.prolabore = `${comp}:${emp}`; return p; });
  const [g] = novoPagamento(db, { emp, forn: 'Receita Federal', desc: `INSS retido do pró-labore · ${nomeComp(comp)}`, c: inss, venc: antecipaFds(diaDoMes(proxComp(comp), 20)), cat, imposto: true }, quem, papel); g.prolabore = `${comp}:${emp}`;
  return { pagamentos: criados, inss };
}
/** Lucros acumulados até o ano passado (do balanço, informado em db.lucroAnterior) + lucro do ano até o mês (DRE por competência) − o que já foi distribuído no ano. */
export function lucroDisponivel(db, emp, agora = new Date()) {
  const ano = agora.getFullYear(), meses = Array.from({ length: agora.getMonth() + 1 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`), lucro = meses.reduce((s, c) => s + dre(db, emp, c).resultado, 0);
  const dist = (db.distribuicoes || []).filter((d) => d.emp === emp && d.ano === ano).reduce((s, d) => s + d.c, 0); const anterior = Number.isInteger(db.lucroAnterior?.[emp]) ? db.lucroAnterior[emp] : 0; return { anterior, lucro, distribuido: dist, livre: Math.max(0, anterior + lucro - dist) };
}
export function distribuirLucros(db, { emp, c, venc = 5 }, quem, papel) {
  exige(db, papel, 'aprovar'); exigeAberto(db); if (!Number.isInteger(c) || c <= 0) throw new Error('Digite o valor a distribuir.');
  const ss = (db.socios || []).filter((s) => s.emp === emp && s.pct > 0), tot = ss.reduce((s, x) => s + x.pct, 0); if (!ss.length) throw new Error('Cadastre os sócios e a participação de cada um.'); if (Math.abs(tot - 100) > 0.001) throw new Error(`As participações somam ${String(tot).replace('.', ',')}%; precisam somar 100%.`);
  const L = lucroDisponivel(db, emp); if (c > L.livre) throw new Error(`Passa do lucro disponível (${reais(L.livre)}). Distribuir mais que o lucro pode ser tributado.`);
  let resto = c; const partes = ss.map((s, i) => { const v = i === ss.length - 1 ? resto : Math.floor(c * s.pct / 100); resto -= v; return [s, v]; });
  const id = nid('d'), ps = partes.filter(([, v]) => v > 0).map(([s, v]) => { const [p] = novoPagamento(db, { emp, forn: s.nome, desc: `Distribuição de lucros ${new Date().getFullYear()} (${String(s.pct).replace('.', ',')}%)`, c: v, venc }, quem, papel); p.distribuicao = id; return p; });
  (db.distribuicoes ||= []).push({ id, emp, ano: new Date().getFullYear(), c, em: new Date().toISOString(), quem }); registra(db, quem, `distribuiu ${reais(c)} de lucros aos sócios`, { ref: `dist:${id}`, depois: reais(c) }); return ps;
}
// Carteira do BPO: situação de cada empresa atendida, honorários e rotina com prazo.
export function carteira(db, emps, comp = compAtual()) {
  return emps.map((e) => { const k = e.k || e, pend = db.pags.filter((p) => p.emp === k && p.st === 'pendente').length, atras = (db.recs || []).filter((r) => r.emp === k && situacaoRec(r).st === 'atrasado').length, contas = (db.contas || []).filter((c) => c.emp === k).map((c) => c.id), semCat = db.extrato.filter((x) => (!x.conta || contas.includes(x.conta)) && !categoria(db, x) && !x.pag && !x.rec && !x.mov).length, tarefas = (db.tarefas || []).filter((t) => t.emp === k && !tarefaFeita(t)).length, h = (db.honorarios || {})[k];
    const nota = pend + atras + tarefas + (semCat ? 1 : 0); return { k, nome: e.nome || k, pend, atras, semCat, tarefas, fechado: !!db.fechados?.[comp], honorario: h?.c || 0, honorarioPago: !!h?.pagos?.[comp], st: nota === 0 ? 'em dia' : nota <= 3 ? 'atenção' : 'atrasada' }; });
}
export function marcarHonorario(db, emp, comp = compAtual(), quem) { const h = (db.honorarios ||= {})[emp]; if (!h?.c) throw new Error('Defina o honorário desta empresa.'); (h.pagos ||= {})[comp] = !h.pagos[comp]; registra(db, quem, `${h.pagos[comp] ? 'recebeu' : 'desmarcou'} o honorário de ${nomeComp(comp)} (${emp})`, { ref: `hon:${emp}:${comp}`, depois: reais(h.c) }); }
const chavePeriodo = (freq, agora = new Date()) => { const d = new Date(agora); if (freq === 'diaria') return hojeISO(d); if (freq === 'mensal') return hojeISO(d).slice(0, 7); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return `s${hojeISO(d)}`; };
export const tarefaFeita = (t, agora = new Date()) => !!t.feito?.[chavePeriodo(t.freq, agora)];
export function novaTarefa(db, d, quem) { const t = String(d.t || '').trim(); if (!t) throw new Error('Diga a tarefa.'); if (!['diaria', 'semanal', 'mensal'].includes(d.freq)) throw new Error('Escolha a frequência.'); const x = { id: nid('t'), emp: d.emp, t: t.slice(0, 80), resp: String(d.resp || '').trim().slice(0, 40), freq: d.freq, feito: {} }; (db.tarefas ||= []).push(x); registra(db, quem, `criou a rotina "${x.t}"`, { ref: `tarefa:${x.id}` }); return x; }
export function marcarTarefa(db, id, quem, agora = new Date()) { const t = (db.tarefas || []).find((x) => x.id === id); if (!t) throw new Error('Tarefa não encontrada.'); const k = chavePeriodo(t.freq, agora); if (t.feito[k]) delete t.feito[k]; else t.feito[k] = { quem, em: new Date().toISOString() }; registra(db, quem, `${t.feito[k] ? 'fez' : 'desmarcou'} "${t.t}"`, { ref: `tarefa:${id}` }); }
// Riscos: covenants, PDD, duplicidade, vigências e saldo mínimo.
/** Indicadores dos contratos de empréstimo. ebitdaMes em centavos (do real do mês); dívida e juros dos próximos 12 meses saem das parcelas. */
export function covenants(db, emp, ebitdaMes) {
  const da = (x) => emp === 'todas' || x.emp === emp, E = (db.emprestimos || []).filter(da), divida = E.reduce((s, e) => s + saldoEmprestimo(db, e.id).principal, 0), caixa = (db.contas || []).filter((c) => da(c) && c.tipo !== 'cartao').reduce((s, c) => s + saldoConta(db, c.id), 0), apl = (db.aplicacoes || []).filter((a) => da(a) && !a.resgate).reduce((s, a) => s + posicaoAplicacao(a).liquido, 0);
  const parc12 = db.pags.filter((p) => da(p) && p.emprestimo && faltaTitulo(p) && p.venc <= 365), juros12 = parc12.reduce((s, p) => s + Math.round(p.juros * faltaTitulo(p) / p.c), 0), receber = (db.recs || []).filter((r) => da(r) && r.st !== 'cancelado').reduce((s, r) => s + faltaTitulo(r), 0), pagar = db.pags.filter((p) => da(p) && !p.emprestimo && ['pendente', 'aprovado', 'remessa'].includes(p.st)).reduce((s, p) => s + faltaTitulo(p), 0) + parc12.reduce((s, p) => s + faltaTitulo(p), 0);
  const ebitda12 = ebitdaMes * 12, val = { divLiq: ebitda12 > 0 ? (divida - caixa - apl) / ebitda12 : null, liquidez: pagar ? (caixa + apl + receber) / pagar : null, cobertura: juros12 ? ebitda12 / juros12 : null };
  const lista = (db.covenants || []).filter((k) => emp === 'todas' || !k.emp || k.emp === emp).map((k) => { const v = val[k.ind]; return { ...k, valor: v, ok: v === null ? null : k.tipo === 'max' ? v <= k.limite : v >= k.limite }; });
  return { lista, divida, caixa: caixa + apl, ebitda12, ...val };
}
export const FAIXAS_PDD = [[30, 3], [90, 10], [180, 30], [Infinity, 100]];
/** Provisão para devedores duvidosos pelos dias de atraso de cada título (% por faixa, ajustável). */
export function pdd(db, emp, faixas = db.faixasPdd || FAIXAS_PDD) {
  const rs = (db.recs || []).filter((r) => (emp === 'todas' || r.emp === emp) && faltaTitulo(r) && r.venc < 0), por = faixas.map(([ate, p]) => ({ ate, p, base: 0, prov: 0 }));
  rs.forEach((r) => { const f = por.find((x) => -r.venc <= x.ate); f.base += faltaTitulo(r); }); por.forEach((f) => { f.prov = Math.round(f.base * f.p / 100); }); return { faixas: por, base: por.reduce((s, f) => s + f.base, 0), total: por.reduce((s, f) => s + f.prov, 0) };
}
export function registrarPdd(db, emp, comp = compAtual(), quem, papel) { exige(db, papel, 'criar'); exigeAberto(db); const p = pdd(db, emp); (db.pddReg ||= {})[`${comp}:${emp}`] = { c: p.total, em: new Date().toISOString(), quem }; registra(db, quem, `registrou a PDD de ${nomeComp(comp)}: ${reais(p.total)}`, { ref: `pdd:${emp}:${comp}`, depois: reais(p.total) }); return p.total; }
/** Pagamentos que parecem lançados duas vezes: mesmo fornecedor e valor com até 5 dias entre os vencimentos, ou o mesmo boleto/nota. */
export function duplicados(db, emp) {
  const ps = db.pags.filter((p) => (emp === 'todas' || p.emp === emp) && !['cancelado', 'rejeitado'].includes(p.st) && !p.emprestimo && !p.recorrente), out = [], ok = db.dupOk || {};
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) { const a = ps[i], b = ps[j], k = [a.id, b.id].sort().join('|'); if (ok[k] || a.emp !== b.emp) continue; const mesmoDoc = (a.boleto && a.boleto === b.boleto) || (a.nfe && a.nfe === b.nfe); if (mesmoDoc || (norm(a.forn) === norm(b.forn) && a.c === b.c && Math.abs(a.venc - b.venc) <= 5 && !(a.grupo && a.grupo === b.grupo))) out.push({ k, a, b, motivo: mesmoDoc ? 'mesmo boleto ou nota' : 'mesmo fornecedor e valor' }); }
  return out;
}
export function naoDuplicado(db, k, quem) { (db.dupOk ||= {})[k] = true; registra(db, quem, 'marcou dois pagamentos como não duplicados', { ref: `dup:${k}` }); }
/** Contratos, fianças, seguros e certidões com data de fim: vencido, vence em até o aviso (dias) ou em dia. */
export function vigencias(db, emp) { return (db.vigencias || []).filter((v) => emp === 'todas' || v.emp === emp).map((v) => ({ ...v, st: v.fim < 0 ? 'vencido' : v.fim <= (v.aviso ?? 30) ? 'renovar' : 'em dia' })).sort((a, b) => a.fim - b.fim); }
export function renovarVigencia(db, id, meses, quem) { const v = (db.vigencias || []).find((x) => x.id === id); if (!v) throw new Error('Item não encontrado.'); const n = Number(meses); if (!Number.isInteger(n) || n < 1 || n > 60) throw new Error('Renove de 1 a 60 meses.'); const d = dataDe(Math.max(v.fim, 0)); d.setMonth(d.getMonth() + n); const antes = v.fim; v.fim = diaDe(hojeISO(d)); registra(db, quem, `renovou ${v.nome} por ${n} meses`, { ref: `vig:${id}`, antes: isoDe(antes), depois: isoDe(v.fim) }); }
/** Contas abaixo do saldo mínimo definido (db.minimos[conta], centavos). */
export const abaixoDoMinimo = (db, emp) => (db.contas || []).filter((c) => (emp === 'todas' || c.emp === emp) && c.tipo !== 'cartao' && db.minimos?.[c.id] > 0).map((c) => ({ ...c, saldo: saldoConta(db, c.id), min: db.minimos[c.id] })).filter((c) => c.saldo < c.min);
// Análises: intercompany, adiar pagamentos para manter o mínimo, antecipar com desconto, investimento, curva ABC e atraso por cliente.
/** Títulos entre empresas do grupo: o que A tem a receber de B deve bater com o que B tem a pagar para A. */
export function intercompany(db, emps) {
  const nomeK = (n) => emps.find((e) => norm(e.nome) === norm(n))?.k, out = [];
  emps.forEach((a) => emps.forEach((b) => { if (a.k === b.k) return; const rec = (db.recs || []).filter((r) => r.emp === a.k && r.st !== 'cancelado' && nomeK(r.cliente) === b.k).reduce((s, r) => s + faltaTitulo(r), 0), pag = db.pags.filter((p) => p.emp === b.k && !['cancelado', 'rejeitado'].includes(p.st) && nomeK(p.forn) === a.k).reduce((s, p) => s + faltaTitulo(p), 0); if (rec || pag) out.push({ credora: a.k, devedora: b.k, aReceber: rec, aPagar: pag, dif: rec - pag }); }));
  return out;
}
const CRITICOS = ['Folha e encargos', 'Impostos e taxas', 'Despesas financeiras'];
// Ao adiar para d2, os saldos de d2 em diante não mudam (o pagamento continua descontado) e os de antes só melhoram.
/** Dias em que o saldo da empresa fica abaixo do mínimo e quais pagamentos (não críticos) adiar, maiores primeiro, para o primeiro dia em que cabem. */
export function sugerirAdiamentos(db, emp, minimo, dias = 30) {
  if (emp === 'todas') throw new Error('Escolha uma empresa.'); const caixa = (db.contas || []).filter((c) => c.emp === emp && c.tipo !== 'cartao').reduce((s, c) => s + saldoConta(db, c.id), 0);
  const ent = (d) => (db.recs || []).filter((r) => r.emp === emp && r.st !== 'cancelado' && Math.max(0, r.venc) === d).reduce((s, r) => s + faltaTitulo(r), 0), venc = {}, ps = db.pags.filter((p) => p.emp === emp && ['pendente', 'aprovado', 'remessa'].includes(p.st) && faltaTitulo(p));
  ps.forEach((p) => { venc[p.id] = Math.max(0, p.venc); }); const saldos = () => { let s = caixa; return Array.from({ length: dias + 1 }, (_, d) => { s += ent(d) - ps.filter((p) => venc[p.id] === d).reduce((t, p) => t + faltaTitulo(p), 0); return s; }); };
  const sug = [], S0 = saldos(); let S = S0;
  for (let d = 0; d <= dias; d++) { if (S[d] >= minimo) continue; const cand = ps.filter((p) => venc[p.id] === d && p.st !== 'remessa' && !p.imposto && !p.emprestimo && !CRITICOS.includes(p.cat)).sort((a, b) => faltaTitulo(b) - faltaTitulo(a));
    for (const p of cand) { if (S[d] >= minimo) break; const para = Array.from({ length: dias - d }, (_, i) => d + 1 + i).find((d2) => S.slice(d2).every((s) => s >= minimo)); if (para === undefined) continue; venc[p.id] = para; sug.push({ p, de: d, para }); S = saldos(); } }
  return { sugestoes: sug, menorAntes: Math.min(...S0), menorDepois: Math.min(...S), caixa };
}
export function adiarPagamento(db, id, para, quem, papel) {
  exige(db, papel, 'criar'); exigeAberto(db); const p = titulo(db, 'pag', id); if (!['pendente', 'aprovado'].includes(p.st)) throw new Error('Só dá para adiar pagamento pendente ou aprovado (fora da remessa).'); if (!Number.isInteger(para) || para <= p.venc) throw new Error('A nova data precisa ser depois do vencimento atual.');
  const antes = p.venc; p.venc = para; hist(p, quem, `adiou de ${isoDe(antes)} para ${isoDe(para)}`); registra(db, quem, `adiou o pagamento a ${p.forn}`, { ref: `pag:${id}`, antes: isoDe(antes), depois: isoDe(para) });
}
/** Pagar antes com desconto: a taxa mensal equivalente do desconto comparada com o que o dinheiro renderia parado. */
export function valeAntecipar({ c, desc, dias, rende }) {
  if (!Number.isInteger(c) || c <= 0) throw new Error('Digite o valor do título.'); if (!(desc > 0 && desc < 50)) throw new Error('Desconto entre 0 e 50%.'); if (!Number.isInteger(dias) || dias < 1 || dias > 360) throw new Error('Dias antecipados de 1 a 360.'); if (!(rende >= 0 && rende < 20)) throw new Error('Rendimento ao mês entre 0 e 20%.');
  const taxa = ((1 / (1 - desc / 100)) ** (30 / dias) - 1) * 100, ganho = Math.round(c * desc / 100), rendeu = Math.round(c * (1 - desc / 100) * ((1 + rende / 100) ** (dias / 30) - 1)); return { taxa, ganho, rendeu, vale: ganho > rendeu, diferenca: ganho - rendeu };
}
/** Investimento: VPL pela taxa mínima, TIR (bisseção) e payback simples e descontado, em meses. fluxos[0] é o investimento (negativo). */
export function investimento(fluxos, tma) {
  if (!Array.isArray(fluxos) || fluxos.length < 2 || !(fluxos[0] < 0) || fluxos.some((f) => !Number.isFinite(f))) throw new Error('Informe o investimento e as entradas.'); if (!(tma >= 0 && tma < 50)) throw new Error('Taxa mínima entre 0 e 50% ao mês.');
  const vpl = (t) => fluxos.reduce((s, f, i) => s + f / (1 + t) ** i, 0), V = vpl(tma / 100); let tir = null;
  if (vpl(0) > 0 && vpl(10) < 0) { let lo = 0, hi = 10; for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2; if (vpl(m) > 0) lo = m; else hi = m; } tir = (lo + hi) / 2 * 100; }
  const pb = (desc) => { let s = 0; for (let i = 0; i < fluxos.length; i++) { const f = desc ? fluxos[i] / (1 + tma / 100) ** i : fluxos[i]; if (s < 0 && s + f >= 0) return i - 1 + -s / f; s += f; } return null; };
  return { vpl: Math.round(V), tir, payback: pb(false), paybackDesc: pb(true) };
}
/** Curva ABC das despesas por fornecedor (últimos 90 dias e o que já está lançado para os próximos 30): A até 80% do gasto acumulado, B até 95%, C o resto. */
export function curvaABC(db, emp, dias = 90, futuro = 30) {
  const o = {}; db.pags.filter((p) => (emp === 'todas' || p.emp === emp) && !['cancelado', 'rejeitado'].includes(p.st) && !p.emprestimo && !p.distribuicao && p.venc >= -dias && p.venc <= futuro).forEach((p) => { const k = norm(p.forn); (o[k] ||= { forn: p.forn, c: 0, n: 0 }).c += p.c; o[k].n++; });
  const l = Object.values(o).sort((a, b) => b.c - a.c), tot = l.reduce((s, x) => s + x.c, 0); let ac = 0; return { total: tot, lista: l.map((x) => { const antes = ac; ac += x.c; return { ...x, pct: tot ? x.c / tot : 0, acum: tot ? ac / tot : 0, classe: !tot || antes / tot < 0.8 ? 'A' : antes / tot < 0.95 ? 'B' : 'C' }; }) };
}
/** Atraso médio de cada cliente nos recebimentos (pesado pelo valor) e a data provável dos títulos em aberto. */
export function atrasoClientes(db, emp) {
  const o = {}; (db.recs || []).filter((r) => (emp === 'todas' || r.emp === emp) && r.st !== 'cancelado').forEach((r) => { const x = (o[norm(r.cliente)] ||= { cliente: r.cliente, peso: 0, soma: 0, n: 0, aberto: 0, abertos: [] }); (r.baixas || []).forEach((b) => { x.peso += b.c; x.soma += b.c * Math.max(0, b.dia - r.venc); x.n++; }); if (faltaTitulo(r)) { x.aberto += faltaTitulo(r); x.abertos.push(r); } });
  return Object.values(o).map((x) => { const media = x.peso ? Math.round(x.soma / x.peso) : null; return { ...x, media, provavel: x.abertos.map((r) => ({ id: r.id, venc: r.venc, prevista: Math.max(0, r.venc + (media || 0)) })) }; }).sort((a, b) => (b.media ?? -1) - (a.media ?? -1));
}
/** Lote contábil do mês (regime de caixa): débito e crédito de cada baixa, pagamento e recebimento, para o contador importar. */
export function loteContabil(db, emp, comp = compAtual()) {
  const banco = (id) => (db.contas || []).find((c) => c.id === id)?.nome || 'Caixa', l = [], ok = (x) => emp === 'todas' || x.emp === emp;
  db.pags.filter(ok).forEach((p) => (p.baixas || []).filter((b) => compDoDia(b.dia) === comp).forEach((b) => { const deb = p.emprestimo ? 'Empréstimos e financiamentos' : p.distribuicao ? 'Lucros a distribuir' : p.cat || 'Fornecedores'; if (p.emprestimo && p.juros) { const j = Math.round(b.c * p.juros / p.c); l.push([b.dia, 'Despesas financeiras', banco(b.conta), j, `Juros ${p.forn} · ${p.desc}`]); l.push([b.dia, deb, banco(b.conta), b.total - j, `Amortização ${p.forn} · ${p.desc}`]); } else l.push([b.dia, deb, banco(b.conta), b.total, `${p.forn} · ${p.desc}`]); }));
  (db.recs || []).filter(ok).forEach((r) => (r.baixas || []).filter((b) => compDoDia(b.dia) === comp).forEach((b) => l.push([b.dia, banco(b.conta), r.cat || 'Clientes', b.total, `${r.cliente} · ${r.desc}`])));
  return l.sort((a, b) => a[0] - b[0]).map(([dia, deb, cred, c, hist2]) => ({ data: isoDe(dia), deb, cred, c, hist: hist2 }));
}
