// Veltria Financeiro Completo · núcleo (sem tela): contas a pagar e a receber, baixas, conciliação, contratos, resultado.
// Testado em tools/testes-financeiro/completo.test.mjs.
//
// Regras (formato 2):
// - todo valor em centavos inteiros;
// - o saldo de hoje = saldo de abertura + soma das baixas (recebimentos e pagamentos). Nunca é digitado nem somado à parte;
// - cada conta guarda as suas baixas (parciais ou não); a situação (aberta, parcial, atrasada, quitada) sai delas;
// - conciliar liga uma linha do extrato a uma baixa: ou a uma que já existe, ou cria a baixa na data do banco. Uma linha e uma
//   baixa só se ligam uma vez; desfazer remove o que a conciliação criou;
// - contratos geram a cobrança de cada mês uma vez só (contrato + mês);
// - datas são dias relativos a hoje; a conta na nuvem anda com eles todo dia.
import { centavos, reais, hojeISO, dataDe, isoDe, diaDe, compDe, lerExtrato, norm, DIA_MS, docValido } from '../financeiro-comum/dinheiro.js';
export { docValido };
export { centavos, reais, hojeISO, dataDe, isoDe, diaDe, compDe, lerExtrato };
export { lerBoleto } from '../financeiro-comum/dinheiro.js';

export const FORMATO = 2;
export const CATS = { r: ['Instalação', 'Manutenção', 'Contratos', 'Projetos', 'Outras receitas'], p: ['Material', 'Pessoal', 'Estrutura', 'Veículos', 'Impostos', 'Tarifas bancárias', 'Outras despesas'] };
const nid = (p = 'f') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const sinal = (l) => (l.tipo === 'r' ? 1 : -1);
function registra(db, oque) { (db.historico ||= []).unshift({ quando: new Date().toISOString(), dia: 0, oque }); if (db.historico.length > 400) db.historico.length = 400; }
const exigeValor = (c) => { if (!Number.isInteger(c) || c <= 0) throw new Error('Digite um valor maior que zero.'); };

// ------------------------------------------------------------------ situação e saldo
export const pago = (l) => (l.pagamentos || []).reduce((s, p) => s + p.c, 0);
export function situacao(l) {
  const p = pago(l), falta = Math.max(0, l.c - p);
  if (l.status === 'cancelado') return { st: 'cancelado', p, falta: 0 };
  if (falta === 0) return { st: 'quitado', p, falta };
  return { st: l.venc < 0 ? 'atrasado' : l.venc === 0 ? 'hoje' : 'aberto', p, falta, parcial: p > 0 };
}
export const baixas = (db) => db.lancs.flatMap((l) => (l.pagamentos || []).map((p) => ({ ...p, lanc: l.id, tipo: l.tipo, quem: l.quem, desc: l.desc, cat: l.cat, s: sinal(l) * (p.c + (p.enc || 0)) })));
export const saldoAte = (db, dia = 0) => db.saldoInicial.c + (db.bancos || []).reduce((s, b) => s + b.ini, 0) + baixas(db).filter((b) => b.dia <= dia).reduce((s, b) => s + b.s, 0); // transferências entre contas se anulam no total
export const saldoHoje = (db) => saldoAte(db, 0);
export const abertos = (db, tipo) => db.lancs.filter((l) => (!tipo || l.tipo === tipo) && situacao(l).falta > 0);

// ------------------------------------------------------------------ contas: criar, editar, baixar, estornar, cancelar
export function novaConta(db, d) {
  exigeValor(d.c); if (!['r', 'p'].includes(d.tipo)) throw new Error('Tipo inválido.');
  const quem = String(d.quem || '').trim(), desc = String(d.desc || '').trim(); if (!quem || !desc) throw new Error(`Preencha ${d.tipo === 'r' ? 'o cliente' : 'o fornecedor'} e o que é.`);
  if (!Number.isInteger(d.venc)) throw new Error('Escolha o vencimento.');
  const parc = Math.max(1, Math.min(36, Number(d.parcelas) || 1)), repetir = Math.max(1, Math.min(36, Number(d.rep) || 1));
  if (parc > 1 && repetir > 1) throw new Error('Escolha repetir todo mês ou parcelar o valor, não os dois.');
  if (parc > d.c) throw new Error('Valor pequeno demais para tantas parcelas.');
  const rep = Math.max(parc, repetir), criados = [], base = dataDe(d.venc), grupo = rep > 1 ? nid('g') : undefined;
  for (let i = 0; i < rep; i++) {
    // repetir mês a mês no mesmo dia do calendário (31 vira o último dia do mês curto)
    const alvo = new Date(base.getFullYear(), base.getMonth() + i, 1, 12), ult = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate(); alvo.setDate(Math.min(base.getDate(), ult));
    const h = new Date(); h.setHours(12, 0, 0, 0);
    const valor = parc > 1 ? Math.floor(d.c / parc) + (i < d.c % parc ? 1 : 0) : d.c; // parcelas: as primeiras levam o centavo que sobra
    const l = { id: nid(), tipo: d.tipo, quem: quem.slice(0, 80), desc: (desc + (rep > 1 ? ` (${i + 1}/${rep})` : '')).slice(0, 120), c: valor, venc: Math.round((alvo - h) / DIA_MS), cat: d.cat || CATS[d.tipo][0], cc: d.cc || '', tel: d.tel || '', status: 'aberto', avisos: [], pagamentos: [], origem: d.origem || 'manual' };
    if (grupo) l.grupo = grupo; if (parc > 1) l.parcela = { n: i + 1, de: parc, total: d.c }; ['contrato', 'comp', 'orc', 'boleto', 'pessoa'].forEach((k) => d[k] && (l[k] = d[k]));
    db.lancs.push(l); criados.push(l);
  }
  registra(db, `Lançou ${d.tipo === 'r' ? 'a receber' : 'a pagar'}: ${quem} · ${reais(d.c)}${parc > 1 ? ` em ${parc} parcelas` : rep > 1 ? ` × ${rep} meses` : ''}`);
  return criados;
}
export function editarConta(db, id, mud) {
  const l = db.lancs.find((x) => x.id === id); if (!l) throw new Error('Conta não encontrada.');
  if (mud.c !== undefined) { exigeValor(mud.c); if (mud.c < pago(l)) throw new Error(`Já foram baixados ${reais(pago(l))}; o valor não pode ser menor.`); }
  const antes = `${reais(l.c)} venc. ${isoDe(l.venc)}`;
  ['quem', 'desc', 'c', 'venc', 'cat', 'cc', 'tel'].forEach((k) => { if (mud[k] !== undefined) l[k] = mud[k]; });
  registra(db, `Editou ${l.quem} · ${l.desc} (antes: ${antes})`);
  return l;
}
/** Parcelas do mesmo parcelamento, em ordem, com o que falta no total. */
export function parcelas(db, l) {
  if (!l?.parcela) return null; const g = db.lancs.filter((x) => x.grupo === l.grupo && x.parcela).sort((a, b) => a.parcela.n - b.parcela.n);
  return { lista: g, total: l.parcela.total, pago: g.reduce((a, x) => a + pago(x), 0), falta: g.reduce((a, x) => a + situacao(x).falta, 0) };
}
/** Baixa (recebimento ou pagamento), inteira ou parcial. chave evita lançar a mesma baixa duas vezes. */
export function baixar(db, id, c, { dia = 0, forma = '', chave, ext, origem = 'manual', conta = PRINCIPAL, juros = 0, multa = 0, desconto = 0 } = {}) {
  const l = db.lancs.find((x) => x.id === id); if (!l) throw new Error('Conta não encontrada.');
  exigeValor(c); const s = situacao(l);
  if (s.st === 'cancelado' || s.st === 'quitado') throw new Error('Esta conta não está em aberto.');
  if (c > s.falta) throw new Error(`O máximo para baixar é ${reais(s.falta)}.`);
  if (dia > 0) throw new Error('A data da baixa não pode ser no futuro.');
  if (chave && db.lancs.some((x) => (x.pagamentos || []).some((p) => p.chave === chave))) return null;
  if (![juros, multa, desconto].every((v) => Number.isInteger(v) && v >= 0)) throw new Error('Juros, multa e desconto: valores em reais, sem sinal.'); if (c + juros + multa - desconto <= 0) throw new Error('O desconto não pode ser maior que o valor.');
  if (!contasBanco(db).some((x) => x.id === conta)) throw new Error('Conta bancária não encontrada.');
  const p = { id: nid('b'), c, dia, forma, origem, quando: new Date().toISOString() }; if (chave) p.chave = chave; if (ext) p.ext = ext; if (conta !== PRINCIPAL) p.conta = conta; if (juros + multa - desconto) { p.enc = juros + multa - desconto; p.encargos = { juros, multa, desconto }; }
  (l.pagamentos ||= []).push(p);
  registra(db, `${l.tipo === 'r' ? 'Recebeu' : 'Pagou'} ${reais(c)} · ${l.quem} · ${l.desc}${situacao(l).falta ? ` (falta ${reais(situacao(l).falta)})` : ''}`);
  return p;
}
export function estornar(db, lancId, pagId) {
  const l = db.lancs.find((x) => x.id === lancId), i = l?.pagamentos.findIndex((p) => p.id === pagId) ?? -1; if (i < 0) throw new Error('Baixa não encontrada.');
  const [p] = l.pagamentos.splice(i, 1);
  if (p.ext) { const e = db.extrato.find((x) => x.id === p.ext); if (e) delete e.conc; }
  registra(db, `Estornou ${reais(p.c)} de ${l.quem} · ${l.desc}`);
  return p;
}
export function cancelarConta(db, id, motivo = '') {
  const l = db.lancs.find((x) => x.id === id); if (!l) throw new Error('Conta não encontrada.');
  l.status = 'cancelado'; l.motivo = String(motivo).slice(0, 120);
  registra(db, `Cancelou ${l.quem} · ${l.desc}${pago(l) ? ` (fica o que já foi baixado: ${reais(pago(l))})` : ''}${motivo ? ` · ${motivo}` : ''}`);
}
export function excluirConta(db, id) {
  const l = db.lancs.find((x) => x.id === id); if (!l) throw new Error('Conta não encontrada.');
  if (pago(l)) throw new Error('Esta conta tem baixas: estorne as baixas antes ou cancele a conta.');
  db.lancs = db.lancs.filter((x) => x !== l); registra(db, `Excluiu ${l.quem} · ${l.desc} · ${reais(l.c)}`);
}
export function adiar(db, id, dias) { const l = db.lancs.find((x) => x.id === id); if (!l) throw new Error('Conta não encontrada.'); l.venc += dias; registra(db, `Adiou ${dias} dia(s): ${l.quem} · ${l.desc} (vence ${isoDe(l.venc)})`); }

// ------------------------------------------------------------------ contratos: a cobrança de cada mês, uma vez só
export function vencimentoNoMes(diaDoMes, comp, agora = new Date()) {
  const [a, m] = comp.split('-').map(Number), ult = new Date(a, m, 0).getDate(), alvo = new Date(a, m - 1, Math.min(diaDoMes, ult), 12);
  const h = new Date(agora); h.setHours(12, 0, 0, 0); return Math.round((alvo - h) / DIA_MS);
}
export const comps = (agora = new Date()) => [hojeISO(agora).slice(0, 7), hojeISO(new Date(agora.getFullYear(), agora.getMonth() + 1, 1)).slice(0, 7)];
export function aGerar(db, comp, agora) { return db.contratos.filter((c) => c.ativo !== false && (c.desde || comp) <= comp && !db.lancs.some((l) => l.contrato === c.id && l.comp === comp)); }
export function gerarContratos(db, comp, agora = new Date()) {
  const novos = aGerar(db, comp, agora).flatMap((c) => novaConta(db, { tipo: 'r', quem: c.cli, desc: `${c.plano} · ${comp.slice(5)}/${comp.slice(0, 4)}`, c: c.c, venc: vencimentoNoMes(c.dia, comp, agora), cat: 'Contratos', tel: c.tel, contrato: c.id, comp, origem: 'contrato' }));
  if (novos.length) registra(db, `Gerou ${novos.length} cobrança(s) de contrato de ${comp.slice(5)}/${comp.slice(0, 4)}`);
  return novos;
}

// ------------------------------------------------------------------ extrato: importar sem duplicar, sugerir, conciliar, desfazer
export function importarExtrato(db, linhas, arquivo = '') {
  const imp = { arquivo: String(arquivo).slice(0, 80), em: new Date().toISOString() }, novas = [];
  linhas.forEach((l) => {
    const c = l.tipo === 'sai' ? -l.c : l.c;
    const dup = db.extrato.some((e) => (l.ref && e.ref === l.ref) || (e.c === c && e.dia === l.dia && norm(e.desc) === norm(l.desc)));
    if (dup) return;
    const e = { id: nid('e'), dia: l.dia, desc: String(l.desc || '').slice(0, 120), c, imp }; if (l.ref) e.ref = l.ref;
    db.extrato.push(e); novas.push(e);
  });
  registra(db, `Importou ${novas.length} linha(s) de extrato de ${imp.arquivo || 'arquivo'} (${linhas.length - novas.length} já existiam)`);
  return novas;
}
const palavras = (s) => new Set(norm(s).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter((w) => w.length > 2 && !/^(pix|ted|doc|pag|pgto|receb|recebido|ltda|s\/a|sa|eireli|me|transf|de|da|do)$/.test(w)));
/** Sugestões para uma linha do extrato, da mais provável para a menos: baixa já feita sem banco, ou conta em aberto. */
export function sugestoes(db, e) {
  if (e.conc) return [];
  const tipo = e.c > 0 ? 'r' : 'p', v = Math.abs(e.c), pal = palavras(e.desc), rej = new Set(e.rejeitadas || []), out = [];
  const nota = (l, diaRef) => { const comum = [...palavras(`${l.quem} ${l.desc}`)].filter((w) => pal.has(w)).length; return 50 + Math.min(30, comum * 15) + Math.max(0, 20 - Math.abs(diaRef - e.dia) * 2); };
  db.lancs.filter((l) => l.tipo === tipo && l.status !== 'cancelado').forEach((l) => {
    (l.pagamentos || []).filter((p) => !p.ext && p.c === v && Math.abs(p.dia - e.dia) <= 7 && !rej.has(`${l.id}:${p.id}`)).forEach((p) => out.push({ tipo: 'ligar', lanc: l.id, pag: p.id, nota: nota(l, p.dia) + 10, l }));
    const s = situacao(l); if (rej.has(l.id) || !s.falta) return;
    if (s.falta === v) out.push({ tipo: 'baixar', lanc: l.id, nota: nota(l, l.venc), l });
    // pagamento parcial: só sugere quando o nome no banco bate com o da conta
    else if (s.falta > v && [...palavras(`${l.quem} ${l.desc}`)].some((w) => pal.has(w))) out.push({ tipo: 'baixar', parcial: true, lanc: l.id, nota: nota(l, l.venc) - 25, l });
  });
  return out.sort((a, b) => b.nota - a.nota);
}
export function conciliar(db, extId, alvo) {
  const e = db.extrato.find((x) => x.id === extId); if (!e) throw new Error('Linha do extrato não encontrada.');
  if (e.conc) throw new Error('Esta linha já foi conciliada.');
  const l = db.lancs.find((x) => x.id === alvo.lanc); if (!l) throw new Error('Conta não encontrada.');
  if ((e.c > 0) !== (l.tipo === 'r')) throw new Error(e.c > 0 ? 'Entrada no banco só concilia com conta a receber.' : 'Saída no banco só concilia com conta a pagar.');
  let p;
  if (alvo.tipo === 'ligar') { p = l.pagamentos.find((x) => x.id === alvo.pag); if (!p || p.ext) throw new Error('Essa baixa já está ligada a outra linha do banco.'); if (p.c + (p.enc || 0) !== Math.abs(e.c)) throw new Error('O valor da baixa é diferente do valor do banco.'); p.ext = e.id; e.conc = { lanc: l.id, pag: p.id, criou: false }; }
  else { p = baixar(db, l.id, Math.abs(e.c), { dia: e.dia, ext: e.id, origem: 'conciliacao', forma: 'banco' }); e.conc = { lanc: l.id, pag: p.id, criou: true }; }
  registra(db, `Conciliou ${reais(Math.abs(e.c))} do banco (${e.desc}) com ${l.quem} · ${l.desc}`);
  return p;
}
/** Linha do banco sem conta no sistema: cria a conta já quitada na data do banco e concilia. */
export function criarDoExtrato(db, extId, { quem, desc, cat } = {}) {
  const e = db.extrato.find((x) => x.id === extId); if (!e || e.conc) throw new Error('Linha indisponível.');
  const [l] = novaConta(db, { tipo: e.c > 0 ? 'r' : 'p', quem: quem || e.desc.split(' ').slice(-3).join(' ') || 'Banco', desc: desc || e.desc, c: Math.abs(e.c), venc: e.dia, cat: cat || (e.c > 0 ? 'Outras receitas' : /tarifa|taxa|iof|juros/i.test(e.desc) ? 'Tarifas bancárias' : 'Outras despesas'), origem: 'extrato' });
  return conciliar(db, extId, { tipo: 'baixar', lanc: l.id });
}
export function rejeitar(db, extId, sug) { const e = db.extrato.find((x) => x.id === extId); (e.rejeitadas ||= []).push(sug.tipo === 'ligar' ? `${sug.lanc}:${sug.pag}` : sug.lanc); registra(db, `Recusou uma sugestão de conciliação para ${e.desc}`); }
export function ignorar(db, extId, motivo) { const e = db.extrato.find((x) => x.id === extId); if (e.conc) throw new Error('Esta linha já foi conciliada.'); e.conc = { ignorado: true, motivo: String(motivo || 'sem motivo').slice(0, 80) }; registra(db, `Marcou como fora do caixa: ${e.desc} (${e.conc.motivo})`); }
export function desfazer(db, extId) {
  const e = db.extrato.find((x) => x.id === extId); if (!e?.conc) throw new Error('Esta linha não está conciliada.');
  const c = e.conc; delete e.conc;
  if (!c.ignorado) { const l = db.lancs.find((x) => x.id === c.lanc), p = l?.pagamentos.find((x) => x.id === c.pag); if (p) { if (c.criou) l.pagamentos = l.pagamentos.filter((x) => x !== p); else delete p.ext; } }
  registra(db, `Desfez a conciliação de ${e.desc}`);
}
/** Conferência com o banco: diferença entre o saldo que o banco mostra e o saldo do sistema. */
export function conferencia(db, saldoBancoC) {
  const sistema = saldoHoje(db), semLinha = baixas(db).filter((b) => !b.ext && b.dia >= -60), pend = db.extrato.filter((e) => !e.conc);
  return { sistema, banco: saldoBancoC, dif: saldoBancoC - sistema, baixasSemBanco: semLinha.length, linhasPendentes: pend.length };
}

// ------------------------------------------------------------------ projeção, resultado, pendências
export function projecao(db, n = 30) {
  let s = saldoHoje(db);
  return Array.from({ length: n }, (_, d) => {
    const doDia = abertos(db).filter((l) => (d === 0 ? l.venc <= 0 : l.venc === d));
    const ent = doDia.filter((l) => l.tipo === 'r').reduce((a, l) => a + situacao(l).falta, 0), sai = doDia.filter((l) => l.tipo === 'p').reduce((a, l) => a + situacao(l).falta, 0);
    s += ent - sai; return { d, ent, sai, saldo: s };
  });
}
/** Mês em dias relativos [primeiro, último] para "AAAA-MM". */
export function mesEmDias(comp, agora = new Date()) { const [a, m] = comp.split('-').map(Number), h = new Date(agora); h.setHours(12, 0, 0, 0); const d = (x) => Math.round((x - h) / DIA_MS); return [d(new Date(a, m - 1, 1, 12)), d(new Date(a, m, 0, 12))]; }
/** Resultado do mês: competência (pelo vencimento, vendido/gasto) e caixa (pelas baixas, recebido/pago). */
export function resultado(db, comp, imposto = 0, agora = new Date()) {
  const [de, ate] = mesEmDias(comp, agora), dentro = (d) => d >= de && d <= ate;
  const comp_ = db.lancs.filter((l) => l.status !== 'cancelado' && dentro(l.venc)), cx = baixas(db).filter((b) => dentro(b.dia));
  const porCat = (l, v) => { const o = {}; l.forEach((x) => { o[x.cat || 'Outros'] = (o[x.cat || 'Outros'] || 0) + v(x); }); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
  const rec = comp_.filter((l) => l.tipo === 'r'), des = comp_.filter((l) => l.tipo === 'p');
  const receita = rec.reduce((s, l) => s + l.c, 0), impostoEst = Math.round(receita * imposto / 100);
  const despesas = des.filter((l) => l.cat !== 'Impostos').reduce((s, l) => s + l.c, 0), impostosLancados = des.filter((l) => l.cat === 'Impostos').reduce((s, l) => s + l.c, 0);
  return {
    receita, despesas, impostoEst, impostosLancados, lucro: receita - despesas - impostoEst,
    recCat: porCat(rec, (l) => l.c), desCat: porCat(des.filter((l) => l.cat !== 'Impostos'), (l) => l.c),
    caixa: { entrou: cx.filter((b) => b.s > 0).reduce((s, b) => s + b.s, 0), saiu: -cx.filter((b) => b.s < 0).reduce((s, b) => s + b.s, 0) },
    aReceberDoMes: rec.reduce((s, l) => s + situacao(l).falta, 0), aPagarDoMes: des.reduce((s, l) => s + situacao(l).falta, 0),
  };
}
export function pendencias(db, agora = new Date()) {
  const l = [], p = projecao(db), min = p.reduce((a, x) => (x.saldo < a.saldo ? x : a), p[0]);
  if (min.saldo < 0) l.push({ tipo: 'erro', id: 'caixa', txt: `O caixa fica negativo em ${isoDe(min.d).split('-').reverse().join('/')}: ${reais(min.saldo)}.`, ir: 'fluxo' });
  const atr = abertos(db, 'r').filter((x) => x.venc < 0); if (atr.length) l.push({ tipo: 'atraso', id: 'rec-atr', txt: `${atr.length} cobrança(s) atrasada(s): ${reais(atr.reduce((s, x) => s + situacao(x).falta, 0))}.`, ir: 'receber' });
  const pv = abertos(db, 'p').filter((x) => x.venc <= 2); if (pv.length) l.push({ tipo: 'vence', id: 'pag-vence', txt: `${pv.length} conta(s) a pagar vencida(s) ou vencendo em até 2 dias: ${reais(pv.reduce((s, x) => s + situacao(x).falta, 0))}.`, ir: 'pagar' });
  const reg = abertos(db, 'r').filter((x) => lembreteHoje(db, x)); if (reg.length) l.push({ tipo: 'cobrar', id: 'regua', txt: `${reg.length} cliente(s) para lembrar hoje pela régua de cobrança.`, ir: 'receber' });
  const pend = db.extrato.filter((e) => !e.conc).length; if (pend) l.push({ tipo: 'vence', id: 'conc', txt: `${pend} linha(s) do banco para conciliar.`, ir: 'conciliar' });
  orcamentoMes(db, hojeISO(agora).slice(0, 7), agora).filter((o) => o.st !== 'ok').forEach((o) => l.push({ tipo: o.st === 'estourou' ? 'estouro' : 'orc', id: `orc:${o.cat}`, txt: o.st === 'estourou' ? `Orçamento de ${o.cat} estourado: pago ${reais(o.pago)} de ${reais(o.orcado)}.` : o.st === 'vai estourar' ? `Orçamento de ${o.cat} vai estourar: pago ${reais(o.pago)} + em aberto ${reais(o.previsto)} passa de ${reais(o.orcado)}.` : `Orçamento de ${o.cat} em ${String(o.pct).replace('.', ',')}% (pago ${reais(o.pago)} de ${reais(o.orcado)}).`, ir: 'orcamento' }));
  comps(agora).forEach((c, i) => { const g = aGerar(db, c, agora).length; if (g && (i === 0 || agora.getDate() >= 20)) l.push({ tipo: 'vence', id: `contr:${c}`, txt: `${g} contrato(s) sem a cobrança de ${c.slice(5)}/${c.slice(0, 4)}.`, ir: 'contratos' }); });
  return l;
}
/** A régua manda lembrar hoje? (marcos em dias relativos ao vencimento; já lembrou hoje = aviso com dia 0) */
export function lembreteHoje(db, l) { return situacao(l).falta > 0 && (db.regua || []).some((d) => l.venc + d === 0) && !(l.avisos || []).includes(0); }

// ------------------------------------------------------------------ orçamento por categoria (limite por mês)
/**
 * Para cada categoria de despesa com limite: orçado, pago no mês (baixas, caixa), em aberto com vencimento no mês
 * (previsto, ainda não pago), disponível = orçado − pago, % usado e situação. Pago e previsto nunca se misturam.
 * Situação: "estourou" (pago > orçado), "vai estourar" (pago + em aberto > orçado), "atenção" (pago ≥ tolerância), "ok".
 */
export function orcamentoMes(db, comp, agora = new Date()) {
  const [de, ate] = mesEmDias(comp, agora), dentro = (d) => d >= de && d <= ate, tol = Number.isInteger(db.orcTol) ? db.orcTol : 80;
  return CATS.p.filter((cat) => Number.isInteger(db.orcCat?.[cat]) && db.orcCat[cat] > 0).map((cat) => {
    const lim = db.orcCat[cat], ls = db.lancs.filter((l) => l.tipo === 'p' && l.status !== 'cancelado' && l.cat === cat);
    const baixasMes = ls.flatMap((l) => (l.pagamentos || []).filter((b) => dentro(b.dia)).map((b) => ({ ...b, l })));
    const abertasMes = ls.filter((l) => dentro(l.venc) && situacao(l).falta > 0);
    const pago_ = baixasMes.reduce((a, b) => a + b.c, 0), previsto = abertasMes.reduce((a, l) => a + situacao(l).falta, 0), pct = Math.round(pago_ / lim * 1000) / 10;
    const st = pago_ > lim ? 'estourou' : pago_ + previsto > lim ? 'vai estourar' : pct >= tol ? 'atenção' : 'ok';
    return { cat, orcado: lim, pago: pago_, previsto, disponivel: lim - pago_, desvio: pago_ - lim, pct, st, baixas: baixasMes, abertas: abertasMes };
  });
}
export function definirOrcamento(db, cat, c) {
  if (!CATS.p.includes(cat)) throw new Error('Categoria de despesa inválida.');
  if (!Number.isInteger(c) || c < 0) throw new Error('Digite um limite válido (zero tira o orçamento).');
  const antes = db.orcCat?.[cat] || 0; (db.orcCat ||= {}); if (c) db.orcCat[cat] = c; else delete db.orcCat[cat];
  registra(db, `Orçamento de ${cat}: ${antes ? reais(antes) : 'sem limite'} → ${c ? reais(c) : 'sem limite'} por mês`);
}

// ------------------------------------------------------------------ notificações: lidas por pessoa, reaparecem se mudarem
/** Prioridade de cada aviso; "lida" vale para o texto lido: se o valor ou a situação mudar, o aviso volta. */
export const PRIORIDADE = { erro: 'alta', atraso: 'alta', estouro: 'alta', vence: 'média', cobrar: 'média', orc: 'média' };
export const lida = (db, p) => db.lidas?.[p.id] === p.txt;
export function marcarLida(db, p) { (db.lidas ||= {})[p.id] = p.txt; }
export function desmarcarLida(db, id) { if (db.lidas) delete db.lidas[id]; }

// ------------------------------------------------------------------ exportação para o contador
export function csvContador(db, comp, agora = new Date()) {
  const [de, ate] = mesEmDias(comp, agora), q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`, br = (c) => (c / 100).toFixed(2).replace('.', ','), dt = (d) => isoDe(d, agora).split('-').reverse().join('/');
  const contas = db.lancs.filter((l) => (l.venc >= de && l.venc <= ate) || (l.pagamentos || []).some((p) => p.dia >= de && p.dia <= ate));
  const linhas = contas.flatMap((l) => { const s = situacao(l), base = [l.tipo === 'r' ? 'A receber' : 'A pagar', l.quem, l.desc, l.cat, l.cc || '', dt(l.venc), br(l.c)]; const bs = (l.pagamentos || []).filter((p) => p.dia >= de && p.dia <= ate); return bs.length ? bs.map((p) => [...base, dt(p.dia), br(p.c), p.ext ? 'Conciliado com o banco' : 'Baixa manual', s.st].map(q).join(';')) : [[...base, '', '', '', s.st].map(q).join(';')]; });
  const ext = db.extrato.filter((e) => e.dia >= de && e.dia <= ate).map((e) => ['Extrato', '', e.desc, '', '', dt(e.dia), br(e.c), '', '', e.conc ? (e.conc.ignorado ? `Fora do caixa: ${e.conc.motivo}` : 'Conciliado') : 'Pendente', ''].map(q).join(';'));
  return '﻿' + ['Tipo;Cliente/Fornecedor;Descrição;Categoria;Centro de custo;Vencimento;Valor (R$);Data da baixa;Valor baixado (R$);Origem;Situação', ...linhas, ...ext].join('\r\n');
}

// ------------------------------------------------------------------ migração do formato 1 (reais soltos e saldo digitado)
/**
 * Converte o formato 1 sem perder nada. Idempotente. As contas "pago" do formato 1 viram uma baixa no vencimento
 * (ou hoje, se venceriam no futuro). O saldo de abertura é calculado para o saldo de hoje continuar o mesmo que a
 * pessoa via: abertura = saldo do formato 1 − baixas migradas. Nenhuma conta nem linha de extrato é inventada.
 */
export function migrar(antigo, agora = new Date()) {
  if (!antigo || typeof antigo !== 'object') throw new Error('Dados ilegíveis.');
  if (antigo.formato >= FORMATO) return antigo;
  const d = JSON.parse(JSON.stringify(antigo)), c = (v) => centavos(Number(v) || 0);
  const lancs = (d.lancs || []).map((l) => {
    const n = { id: l.id, tipo: l.tipo === 'r' ? 'r' : 'p', quem: l.quem || '', desc: l.desc || '', c: c(l.valor), venc: Number(l.venc) || 0, cat: l.cat || '', cc: '', tel: l.tel || '', status: l.status === 'cancelado' ? 'cancelado' : 'aberto', avisos: l.avisos || [], pagamentos: [], origem: 'migracao' };
    if (l.status === 'pago' && n.c > 0) n.pagamentos.push({ id: `${l.id}-b`, c: n.c, dia: Math.min(0, n.venc), forma: '', origem: 'migracao', quando: new Date(agora).toISOString() });
    return n;
  }).filter((l) => l.c > 0);
  const extrato = (d.extrato || []).map((e) => { const n = { id: e.id, dia: Number(e.dia) || 0, desc: e.desc || '', c: c(e.valor) }; const l = e.ok && lancs.find((x) => x.id === e.ok); if (l && l.pagamentos[0] && !l.pagamentos[0].ext) { l.pagamentos[0].ext = n.id; n.conc = { lanc: l.id, pag: l.pagamentos[0].id, criou: false }; } return n; });
  const somaBaixas = lancs.reduce((s, l) => s + sinal(l) * pago(l), 0);
  const contratos = (d.contratos || []).map((k) => ({ id: k.id, cli: k.cli, plano: k.plano, c: c(k.valor), dia: Number(k.dia) || 10, tel: k.tel || '', ativo: true, desde: hojeISO(agora).slice(0, 7) }));
  // cobranças já geradas pelo formato 1: liga à conta para o mês não ser gerado de novo
  (d.contratos || []).filter((k) => k.gerado).forEach((k) => { const l = lancs.find((x) => !x.contrato && x.tipo === 'r' && x.quem === k.cli && x.desc.startsWith(k.plano)); if (l) { l.contrato = k.id; l.comp = compDe(l.venc, agora); } });
  return {
    formato: FORMATO, empresa: d.empresa || '', pix: d.pix || '', cidade: d.cidade || '',
    saldoInicial: { c: c(d.saldo) - somaBaixas, obs: 'Calculado na atualização para o saldo de hoje continuar igual.' },
    lancs, extrato, contratos, orcs: (d.orcs || []).map((o) => ({ id: o.id, cli: o.cli, desc: o.desc, c: c(o.valor), st: o.st, dia: Number(o.dia) || 0, tel: o.tel || '' })),
    regua: Array.isArray(d.regua) ? d.regua : [-3, 0, 3, 10], imposto: Number(d.imposto) || 0, plano: d.plano, conversa: d.conversa || [], historico: [],
    migracao: { de: 1, em: new Date(agora).toISOString(), saldoAntes: c(d.saldo) },
  };
}

// ================================================================== contas bancárias, cadastros, encargos, nota, planilha e relatórios
// - a conta principal é o saldo de abertura de sempre; outras contas (banco, caixa da loja) têm o próprio saldo de abertura;
//   o saldo de hoje é a soma de todas; transferência entre contas não muda o total nem vira receita ou despesa;
// - a baixa pode levar juros, multa e desconto: o principal abate a conta, o total entra ou sai da conta escolhida;
// - cliente e fornecedor com CPF/CNPJ conferido; nota fiscal (XML) vira contas a pagar pelas duplicatas, uma vez só.
export const PRINCIPAL = 'principal';
export function contasBanco(db) { return [{ id: PRINCIPAL, nome: db.nomePrincipal || 'Conta principal', ini: db.saldoInicial.c }, ...(db.bancos || []).map((b) => ({ ...b }))]; }
export function novaContaBanco(db, { nome, ini }) {
  const n = String(nome || '').trim().slice(0, 50); if (!n) throw new Error('Dê um nome à conta (banco ou caixa).');
  if (!Number.isInteger(ini)) throw new Error('Saldo de abertura inválido.'); if (contasBanco(db).some((c) => norm(c.nome) === norm(n))) throw new Error('Já existe uma conta com esse nome.');
  const b = { id: nid('k'), nome: n, ini }; (db.bancos ||= []).push(b); registra(db, `Abriu a conta ${n} com ${reais(ini)}`); return b;
}
const valorBaixa = (p) => p.c + (p.enc || 0);
export function saldoConta(db, id, dia = 0) {
  const c = contasBanco(db).find((x) => x.id === id); if (!c) return 0;
  const bx = db.lancs.reduce((s, l) => s + (l.pagamentos || []).filter((p) => (p.conta || PRINCIPAL) === id && p.dia <= dia).reduce((q, p) => q + sinal(l) * valorBaixa(p), 0), 0);
  const tr = (db.transferencias || []).filter((t) => t.dia <= dia).reduce((s, t) => s + (t.para === id ? t.c : 0) - (t.de === id ? t.c : 0), 0);
  return c.ini + bx + tr;
}
export function transferir(db, { de, para, c, dia = 0, desc = '' }) {
  const cs = contasBanco(db); if (!cs.some((x) => x.id === de) || !cs.some((x) => x.id === para)) throw new Error('Escolha as duas contas.'); if (de === para) throw new Error('Escolha contas diferentes.');
  exigeValor(c); if (dia > 0) throw new Error('A data não pode ser no futuro.');
  const t = { id: nid('t'), de, para, c, dia, desc: String(desc).slice(0, 80) }; (db.transferencias ||= []).push(t);
  registra(db, `Transferiu ${reais(c)} de ${cs.find((x) => x.id === de).nome} para ${cs.find((x) => x.id === para).nome}`); return t;
}
export function desfazerTransferencia(db, id) { const t = (db.transferencias || []).find((x) => x.id === id); if (!t) throw new Error('Transferência não encontrada.'); db.transferencias = db.transferencias.filter((x) => x !== t); registra(db, `Desfez a transferência de ${reais(t.c)}`); }
/** Multa e juros sugeridos para conta atrasada (multa % uma vez, juros % ao mês pro rata dia). */
export function encargosSugeridos(db, l, c = situacao(l).falta) { const at = Math.max(0, -l.venc), r = db.encargos || { multa: 2, juros: 1 }; return at ? { atraso: at, multa: Math.round(c * r.multa / 100), juros: Math.round(c * r.juros / 100 * at / 30) } : { atraso: 0, multa: 0, juros: 0 }; }

// ------------------------------------------------------------------ clientes e fornecedores
export function salvarPessoa(db, d) {
  const nome = String(d.nome || '').trim().slice(0, 80); if (!nome) throw new Error('Digite o nome.'); if (!['cliente', 'fornecedor', 'ambos'].includes(d.tipo)) throw new Error('Escolha cliente, fornecedor ou os dois.');
  const doc = String(d.doc || '').replace(/\D/g, ''); if (doc && !docValido(doc)) throw new Error('CPF ou CNPJ inválido (confira os dígitos).');
  const l = (db.pessoas ||= []), atual = d.id && l.find((p) => p.id === d.id);
  if (doc && l.some((p) => p !== atual && p.doc === doc)) throw new Error('Esse CPF/CNPJ já está cadastrado.'); if (!doc && l.some((p) => p !== atual && !p.doc && norm(p.nome) === norm(nome))) throw new Error('Já existe um cadastro com esse nome.');
  const v = { nome, tipo: d.tipo, doc, tel: String(d.tel || '').replace(/\D/g, '').slice(0, 13), email: String(d.email || '').trim().slice(0, 80), pix: String(d.pix || '').trim().slice(0, 77), obs: String(d.obs || '').trim().slice(0, 140) };
  if (atual) { const antes = atual.nome; Object.assign(atual, v); if (antes !== nome) db.lancs.forEach((x) => { if (x.pessoa === atual.id) x.quem = nome; }); registra(db, `Editou o cadastro de ${nome}`); return atual; }
  const p = { id: nid('h'), ...v }; l.push(p); registra(db, `Cadastrou ${nome}`); return p;
}
export const acharPessoa = (db, { nome, doc } = {}) => { const d = String(doc || '').replace(/\D/g, ''); return (db.pessoas || []).find((p) => (d && p.doc === d) || (nome && norm(p.nome) === norm(nome))) || null; };
export function resumoPessoa(db, p) { const ls = db.lancs.filter((l) => l.pessoa === p.id || (!l.pessoa && norm(l.quem) === norm(p.nome))); return { aReceber: ls.filter((l) => l.tipo === 'r').reduce((s, l) => s + situacao(l).falta, 0), aPagar: ls.filter((l) => l.tipo === 'p').reduce((s, l) => s + situacao(l).falta, 0), atrasado: ls.filter((l) => situacao(l).st === 'atrasado').reduce((s, l) => s + situacao(l).falta, 0), contas: ls.length }; }

// ------------------------------------------------------------------ nota fiscal do fornecedor (XML) e planilha
/** nota = { chave, numero, cnpj, nome, total, emissao: AAAA-MM-DD, dups: [{ n, venc, c }] } → uma conta a pagar por duplicata. */
export function contasDaNota(db, nota, { cat, cc } = {}) {
  const ch = String(nota.chave || '').replace(/\D/g, ''); if (ch && db.lancs.some((l) => l.nfe === ch)) throw new Error('Esta nota já foi lançada.');
  if (!Number.isInteger(nota.total) || nota.total <= 0) throw new Error('A nota não tem valor total.');
  const dups = (nota.dups || []).filter((d) => Number.isInteger(d.c) && d.c > 0 && d.venc); if (dups.length && dups.reduce((s, d) => s + d.c, 0) !== nota.total) throw new Error('As duplicatas não somam o total da nota.');
  let p = acharPessoa(db, { doc: nota.cnpj, nome: nota.nome }); if (!p && nota.nome) p = salvarPessoa(db, { nome: nota.nome, tipo: 'fornecedor', doc: docValido(nota.cnpj) ? nota.cnpj : '' });
  const partes = dups.length ? dups : [{ n: '1', venc: nota.emissao, c: nota.total }];
  const ls = partes.map((d, i) => { const [l] = novaConta(db, { tipo: 'p', quem: p?.nome || nota.nome || 'Fornecedor', desc: `NF ${nota.numero}${partes.length > 1 ? ` · ${i + 1}/${partes.length}` : ''}`, c: d.c, venc: diaDe(d.venc), cat: cat || 'Material', cc: cc || '', origem: 'nfe' }); if (ch) l.nfe = ch; if (p) l.pessoa = p.id; return l; });
  registra(db, `Lançou a NF ${nota.numero} de ${p?.nome || nota.nome}: ${reais(nota.total)} em ${ls.length} conta(s)`); return ls;
}
const COL = { tipo: /^tipo/, nome: /^(nome|cliente|fornecedor)/, desc: /^(descri|o qu|histor)/, valor: /^valor/, venc: /^(venc|data)/, cat: /^(categ|conta)/, cc: /^(centro|cc)/ };
/** Planilha [[cabeçalho], ...]: confere tudo; simular = true não grava. */
export function importarPlanilha(db, linhas, simular = false) {
  if (!linhas.length) throw new Error('Planilha vazia.'); const cab = linhas[0].map((h) => norm(String(h)).trim()), col = Object.fromEntries(Object.entries(COL).map(([k, re]) => [k, cab.findIndex((h) => re.test(h))]));
  if ([col.nome, col.valor, col.venc].some((i) => i < 0)) throw new Error('A planilha precisa das colunas Nome, Valor e Vencimento (e de preferência Tipo, Descrição, Categoria e Centro).');
  const alvo = simular ? JSON.parse(JSON.stringify(db)) : db, ok = [], erros = [];
  linhas.slice(1).forEach((l, i) => { if (!l.some((x) => String(x || '').trim())) return; const v = (k) => (col[k] >= 0 ? String(l[col[k]] ?? '').trim() : '');
    try { const tipo = /receb|entrada|cliente/i.test(v('tipo')) ? 'r' : 'p', c = centavos(v('valor').replace(/^-/, '')); if (!Number.isInteger(c) || c <= 0) throw new Error('valor inválido');
      const dt = v('venc'), iso = /^\d{2}\/\d{2}\/\d{4}$/.test(dt) ? dt.split('/').reverse().join('-') : dt; if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('vencimento inválido (use DD/MM/AAAA)');
      const cat = v('cat') ? CATS[tipo].find((x) => norm(x) === norm(v('cat'))) : CATS[tipo][0]; if (!cat) throw new Error(`categoria "${v('cat')}" não existe para ${tipo === 'r' ? 'receber' : 'pagar'}`);
      ok.push(...novaConta(alvo, { tipo, quem: v('nome'), desc: v('desc') || 'Importado da planilha', c, venc: diaDe(iso), cat, cc: v('cc'), origem: 'planilha' }));
    } catch (x) { erros.push({ linha: i + 2, motivo: x.message }); } });
  if (!simular && ok.length) registra(db, `Importou ${ok.length} conta(s) de planilha (${erros.length} recusada[s])`); return { ok, erros };
}

// ------------------------------------------------------------------ comprovantes
export const ANEXO = { max: 300000, porConta: 3, tipos: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'] };
export function anexar(db, id, a) {
  const l = db.lancs.find((x) => x.id === id); if (!l) throw new Error('Conta não encontrada.');
  if (!ANEXO.tipos.includes(a.tipo)) throw new Error('Use PDF, PNG, JPG ou WEBP.'); if (!(a.tam > 0) || a.tam > ANEXO.max) throw new Error('Arquivo grande demais (até 300 KB).');
  if ((l.anexos || []).length >= ANEXO.porConta) throw new Error('Até 3 comprovantes por conta.'); if (!/^data:[\w/+.-]+;base64,/.test(String(a.dados || ''))) throw new Error('Arquivo ilegível.');
  const x = { id: nid('x'), nome: String(a.nome || 'comprovante').slice(0, 80), tipo: a.tipo, tam: a.tam, dados: a.dados, quando: new Date().toISOString() }; (l.anexos ||= []).push(x); registra(db, `Anexou ${x.nome} em ${l.quem} · ${l.desc}`); return x;
}
export function tirarAnexo(db, id, xid) { const l = db.lancs.find((x) => x.id === id), a = l?.anexos?.find((x) => x.id === xid); if (!a) throw new Error('Comprovante não encontrado.'); l.anexos = l.anexos.filter((x) => x !== a); registra(db, `Removeu o comprovante ${a.nome}`); }

// ------------------------------------------------------------------ relatórios: inadimplência, evolução de 6 meses, centros de custo
export function inadimplencia(db) {
  const F = [['A vencer', (d) => d >= 0], ['1–30 dias', (d) => d < 0 && d >= -30], ['31–60 dias', (d) => d < -30 && d >= -60], ['Mais de 60', (d) => d < -60]];
  const por = {}; abertos(db, 'r').forEach((l) => { const i = F.findIndex(([, f]) => f(l.venc)); (por[l.quem] ||= Array(F.length).fill(0))[i] += situacao(l).falta; });
  const faixas = F.map(([n], i) => ({ n, v: Object.values(por).reduce((s, a) => s + a[i], 0) }));
  return { faixas, total: faixas.reduce((s, f) => s + f.v, 0), clientes: Object.entries(por).map(([quem, v]) => ({ quem, v, atrasado: v.slice(1).reduce((a, b) => a + b, 0), total: v.reduce((a, b) => a + b, 0) })).sort((a, b) => b.atrasado - a.atrasado || b.total - a.total) };
}
export function evolucao(db, meses = 6, agora = new Date()) {
  return Array.from({ length: meses }, (_, i) => { const d = new Date(agora.getFullYear(), agora.getMonth() - (meses - 1 - i), 15, 12), comp = hojeISO(d).slice(0, 7), r = resultado(db, comp, db.imposto, agora); return { comp, receita: r.receita, despesas: r.despesas + r.impostosLancados, lucro: r.lucro - r.impostosLancados, entrou: r.caixa.entrou, saiu: r.caixa.saiu }; });
}
export function porCentro(db, comp, agora = new Date()) {
  const [de, ate] = mesEmDias(comp, agora), out = {};
  db.lancs.filter((l) => l.status !== 'cancelado' && l.venc >= de && l.venc <= ate).forEach((l) => { const k = l.cc || 'Sem centro de custo', o = (out[k] ||= { cc: k, receita: 0, despesa: 0, aberto: 0 }); if (l.tipo === 'r') o.receita += l.c; else o.despesa += l.c; o.aberto += situacao(l).falta * sinal(l); });
  return Object.values(out).map((o) => ({ ...o, resultado: o.receita - o.despesa })).sort((a, b) => (a.cc === 'Sem centro de custo') - (b.cc === 'Sem centro de custo') || b.resultado - a.resultado);
}

// ------------------------------------------------------------------ funções de 10/2026 (2ª leva)
/** Valor por extenso, para o recibo (centavos, até 999 milhões). */
export function extenso(c) {
  const U = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'], D = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'], C = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const ate999 = (n) => { if (n === 100) return 'cem'; const k = Math.floor(n / 100), r = n % 100, p = []; if (k) p.push(C[k]); if (r) p.push(r < 20 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? ` e ${U[r % 10]}` : '')); return p.join(' e '); };
  const n = Math.floor(c / 100), cent = c % 100, mi = Math.floor(n / 1e6), mil = Math.floor(n / 1000) % 1000, r = n % 1000, g = [];
  if (mi) g.push(mi === 1 ? 'um milhão' : `${ate999(mi)} milhões`); if (mil) g.push(mil === 1 ? 'mil' : `${ate999(mil)} mil`); if (r) g.push(ate999(r));
  let t = g.reduce((s, x, i) => (!i ? x : `${s}${i === g.length - 1 && r && (r < 100 || r % 100 === 0) ? ' e ' : ' '}${x}`), '');
  if (n) t += n === 1 ? ' real' : !mil && !r ? ' de reais' : ' reais';
  if (cent) t += `${n ? ' e ' : ''}${ate999(cent)} ${cent === 1 ? 'centavo' : 'centavos'}`;
  return t || 'zero real';
}
/** Recibo de uma conta recebida: o que foi pago até agora, com o valor por extenso. */
export function recibo(db, id) {
  const l = db.lancs.find((x) => x.id === id); if (!l || l.tipo !== 'r') throw new Error('Recebível não encontrado.'); const v = pago(l); if (!v) throw new Error('Nada recebido nesta conta ainda.');
  return { quem: l.quem, desc: l.desc, c: v, extenso: extenso(v), dia: Math.max(...l.pagamentos.map((p) => p.dia)), formas: [...new Set(l.pagamentos.map((p) => p.forma).filter(Boolean))] };
}
// Simples Nacional, serviços: anexos III e V. Alíquota efetiva = (RBT12 × alíquota − parcela a deduzir) ÷ RBT12; Fator R (folha ÷ receita, 12 meses) de 28% ou mais leva ao anexo III.
const FAIXAS = { III: [[18000000, 6, 0], [36000000, 11.2, 936000], [72000000, 13.5, 1764000], [180000000, 16, 3564000], [360000000, 21, 12564000], [480000000, 33, 64800000]], V: [[18000000, 15.5, 0], [36000000, 18, 450000], [72000000, 19.5, 990000], [180000000, 20.5, 1710000], [360000000, 23, 6210000], [480000000, 30.5, 54000000]] };
export function simples(rbt12, folha12) {
  exigeValor(rbt12); if (!Number.isInteger(folha12) || folha12 < 0) throw new Error('Folha dos 12 meses inválida.'); if (rbt12 > 480000000) throw new Error('Acima de R$ 4,8 milhões em 12 meses a empresa sai do Simples.');
  const ef = (anx) => { const [, aliq, ded] = FAIXAS[anx].find(([lim]) => rbt12 <= lim); return (rbt12 * aliq / 100 - ded) / rbt12; }, fatorR = folha12 / rbt12, anexo = fatorR >= 0.28 ? 'III' : 'V';
  return { fatorR, anexo, efIII: ef('III'), efV: ef('V'), efetiva: ef(anexo), dasMes: Math.round(rbt12 / 12 * ef(anexo)), folhaPara28: Math.max(0, Math.ceil(rbt12 * 28 / 100) - folha12) };
}
/** Quanto separar de imposto do que entrou no mês, e quanto já foi separado (db.reservas). */
export function reservaImposto(db, comp, pct = db.imposto || 0, agora = new Date()) {
  const [de, ate] = mesEmDias(comp, agora), entrou = baixas(db).filter((b) => b.s > 0 && b.dia >= de && b.dia <= ate).reduce((s, b) => s + b.s, 0), devido = Math.round(entrou * pct / 100), reservado = (db.reservas || []).filter((r) => r.comp === comp).reduce((s, r) => s + r.c, 0);
  return { entrou, devido, reservado, falta: Math.max(0, devido - reservado) };
}
export function reservar(db, comp, c) { exigeValor(c); (db.reservas ||= []).push({ id: nid('v'), comp, c, dia: 0 }); registra(db, `Separou ${reais(c)} para os impostos de ${comp}`); }
/** Comissão sobre o que já foi recebido no mês, pelo responsável de cada conta (l.resp) e a % dele (db.comissionados). */
export function comissoes(db, comp, agora = new Date()) {
  const [de, ate] = mesEmDias(comp, agora);
  return (db.comissionados || []).map((p) => { const base = db.lancs.filter((l) => l.tipo === 'r' && l.resp === p.id).flatMap((l) => l.pagamentos || []).filter((b) => b.dia >= de && b.dia <= ate).reduce((s, b) => s + b.c, 0); return { ...p, base, valor: Math.round(base * p.pct / 100) }; });
}
/** Rentabilidade por cliente: o que ele pagou (ou vai pagar) menos os custos lançados no centro de custo com o nome dele. */
export function rentabilidade(db) {
  const o = {}; db.lancs.filter((l) => l.status !== 'cancelado').forEach((l) => { const k = l.tipo === 'r' ? l.quem : l.cc; if (!k) return; const x = (o[norm(k)] ||= { quem: k, receita: 0, custo: 0 }); if (l.tipo === 'r') { x.receita += l.c; x.quem = l.quem; } else x.custo += l.c; });
  return Object.values(o).filter((x) => x.receita > 0).map((x) => ({ ...x, margem: x.receita - x.custo, pct: (x.receita - x.custo) / x.receita })).sort((a, b) => b.margem - a.margem);
}
export const FIXAS = ['Pessoal', 'Estrutura', 'Veículos', 'Tarifas bancárias'];
/** Ponto de equilíbrio do mês: custos fixos ÷ margem de contribuição (receita menos material, outras despesas e imposto). */
export function equilibrio(db, comp, agora = new Date()) {
  const r = resultado(db, comp, db.imposto, agora), fixos = r.desCat.filter(([c]) => FIXAS.includes(c)).reduce((s, [, v]) => s + v, 0), variaveis = r.desCat.filter(([c]) => !FIXAS.includes(c)).reduce((s, [, v]) => s + v, 0) + r.impostoEst, mc = r.receita - variaveis, mcPct = r.receita ? mc / r.receita : null;
  return { receita: r.receita, fixos, variaveis, mc, mcPct, pe: mcPct > 0 ? Math.round(fixos / mcPct) : null };
}
/** Saúde financeira: inadimplência, concentração dos 3 maiores clientes e prazo médio (ponderado pelo valor) do que falta receber; atrasado conta como hoje. */
export function saude(db, agora = new Date()) {
  const ab = abertos(db, 'r'), totalAb = ab.reduce((s, l) => s + situacao(l).falta, 0), atrasado = ab.filter((l) => l.venc < 0).reduce((s, l) => s + situacao(l).falta, 0);
  const rec90 = db.lancs.filter((l) => l.tipo === 'r' && l.status !== 'cancelado' && l.venc >= -90 && l.venc <= 0), tot90 = rec90.reduce((s, l) => s + l.c, 0), porCli = {}; rec90.forEach((l) => { porCli[l.quem] = (porCli[l.quem] || 0) + l.c; });
  const top3 = Object.values(porCli).sort((a, b) => b - a).slice(0, 3).reduce((s, v) => s + v, 0);
  return { inadimplencia: totalAb ? atrasado / totalAb : 0, atrasado, concentracao: tot90 ? top3 / tot90 : 0, ticket: rec90.length ? Math.round(tot90 / rec90.length) : 0, prazoMedio: totalAb ? Math.round(ab.reduce((t, l) => t + situacao(l).falta * Math.max(0, l.venc), 0) / totalAb) : null };
}
/** Capital de giro que falta: o que vence a pagar em n dias menos o saldo de hoje e o que entra no período. */
export function capitalGiro(db, n = 30) { const ab = (t) => abertos(db, t).filter((l) => l.venc <= n).reduce((s, l) => s + situacao(l).falta, 0), pagar = ab('p'), receber = ab('r'), saldo = saldoHoje(db); return { pagar, receber, saldo, falta: Math.max(0, pagar - receber - saldo) }; }
/** Cenário do caixa: parte do a receber não entra (perda %) e o resto atrasa (dias). Devolve o menor saldo e o saldo no fim. */
export function cenario(db, { n = 90, perda = 0, atraso = 0 } = {}) {
  let s = saldoHoje(db), menor = s, diaMenor = 0;
  for (let d = 0; d < n; d++) { const doDia = abertos(db).filter((l) => (l.tipo === 'r' ? Math.max(0, l.venc) + atraso : Math.max(0, l.venc)) === d); s += doDia.reduce((t, l) => t + (l.tipo === 'r' ? Math.round(situacao(l).falta * (1 - perda / 100)) : -situacao(l).falta), 0); if (s < menor) { menor = s; diaMenor = d; } }
  return { fim: s, menor, diaMenor };
}
/** Acordo com cliente: junta contas em aberto dele, cancela as originais e parcela o total com juros simples ao mês. */
export function acordo(db, ids, { n, juros = 0, venc = 7 }) {
  const ls = ids.map((id) => db.lancs.find((l) => l.id === id)); if (!ls.length || ls.some((l) => !l || l.tipo !== 'r' || !situacao(l).falta)) throw new Error('Escolha contas a receber em aberto.');
  if (new Set(ls.map((l) => norm(l.quem))).size > 1) throw new Error('Um acordo é de um cliente só.'); const k = Number(n); if (!Number.isInteger(k) || k < 1 || k > 24) throw new Error('Parcelas de 1 a 24.'); if (!(juros >= 0 && juros <= 10)) throw new Error('Juros de 0 a 10% ao mês.');
  const falta = ls.reduce((s, l) => s + situacao(l).falta, 0), total = Math.round(falta * (1 + juros / 100 * k)), grupo = nid('a');
  ls.forEach((l) => { l.status = 'cancelado'; l.motivo = 'Renegociado em acordo'; l.acordo = grupo; });
  const novas = novaConta(db, { tipo: 'r', quem: ls[0].quem, desc: `Acordo (${ls.length} conta(s))`, c: total, venc, parcelas: k, cat: ls[0].cat, tel: ls[0].tel, pessoa: ls[0].pessoa }); novas.forEach((l) => { l.acordo = grupo; });
  registra(db, `Fez acordo com ${ls[0].quem}: ${reais(falta)} em ${k}x (total ${reais(total)})`); return { falta, total, parcelas: novas };
}
/** Adiantamento (sinal) do cliente: entra no caixa agora e fica de crédito para abater na conta do serviço. */
export function adiantar(db, { quem, c, forma = 'PIX' }) {
  exigeValor(c); const nome = String(quem || '').trim(); if (!nome) throw new Error('Diga o cliente.');
  const [l] = novaConta(db, { tipo: 'r', quem: nome, desc: 'Adiantamento (sinal)', c, venc: 0, cat: 'Outras receitas' }); l.adiantamento = true; baixar(db, l.id, c, { forma });
  (db.creditos ||= {})[norm(nome)] = (db.creditos[norm(nome)] || 0) + c; return l;
}
export const creditoDe = (db, quem) => (db.creditos || {})[norm(quem)] || 0;
export function usarCredito(db, id) {
  const l = db.lancs.find((x) => x.id === id); if (!l || l.tipo !== 'r') throw new Error('Recebível não encontrado.'); const cr = creditoDe(db, l.quem), f = situacao(l).falta; if (!cr) throw new Error('Este cliente não tem adiantamento.'); if (!f) throw new Error('Esta conta já está quitada.');
  const v = Math.min(cr, f); l.c -= v; l.abatido = (l.abatido || 0) + v; db.creditos[norm(l.quem)] = cr - v; registra(db, `Abateu ${reais(v)} do adiantamento de ${l.quem} em ${l.desc}`); return v;
}
/** Reembolso de despesa da equipe: pedido → aprovado (vira conta a pagar) → pago pela baixa normal. */
export function pedirReembolso(db, { quem, desc, c }) { exigeValor(c); if (!String(quem || '').trim() || !String(desc || '').trim()) throw new Error('Diga quem gastou e com o quê.'); const r = { id: nid('e'), quem: String(quem).trim(), desc: String(desc).trim(), c, dia: 0, st: 'pedido' }; (db.reembolsos ||= []).push(r); return r; }
export function aprovarReembolso(db, id) { const r = (db.reembolsos || []).find((x) => x.id === id); if (!r || r.st !== 'pedido') throw new Error('Reembolso não está esperando aprovação.'); const [l] = novaConta(db, { tipo: 'p', quem: r.quem, desc: `Reembolso: ${r.desc}`, c: r.c, venc: 0, cat: 'Outras despesas' }); r.st = 'aprovado'; r.lanc = l.id; registra(db, `Aprovou reembolso de ${reais(r.c)} para ${r.quem}`); return l; }
/** Cartão de crédito da empresa: compras do mês e a fatura que vira conta a pagar no vencimento. */
export function compraCartao(db, { desc, c, cat = 'Outras despesas', parcelas = 1 }) {
  exigeValor(c); const n = Math.max(1, Math.min(12, Number(parcelas) || 1)); if (!String(desc || '').trim()) throw new Error('Diga o que foi comprado.'); const cart = (db.cartao ||= { limite: 1500000, vence: 10, compras: [] });
  const usado = cart.compras.filter((x) => !x.faturada).reduce((s, x) => s + x.c, 0); if (usado + c > cart.limite) throw new Error(`Passa do limite do cartão (${reais(cart.limite)}).`);
  for (let i = 0; i < n; i++) cart.compras.push({ id: nid('k'), desc: `${String(desc).trim()}${n > 1 ? ` (${i + 1}/${n})` : ''}`, c: Math.floor(c / n) + (i < c % n ? 1 : 0), cat, mes: i, faturada: false });
}
export function fecharFatura(db) {
  const cart = db.cartao; const l = (cart?.compras || []).filter((x) => !x.faturada && !x.mes); if (!l.length) throw new Error('Nenhuma compra para fechar.');
  const tot = l.reduce((s, x) => s + x.c, 0), [conta] = novaConta(db, { tipo: 'p', quem: 'Cartão de crédito da empresa', desc: `Fatura (${l.length} compra(s))`, c: tot, venc: cart.vence, cat: 'Outras despesas' });
  l.forEach((x) => { x.faturada = true; }); cart.compras.filter((x) => !x.faturada && x.mes).forEach((x) => { x.mes--; }); registra(db, `Fechou a fatura do cartão: ${reais(tot)}`); return conta;
}
/** Caixinha (fundo fixo em dinheiro): gastos pequenos e a reposição, que sai do banco. */
export function gastoCaixinha(db, { desc, c }) { exigeValor(c); const cx = (db.caixinha ||= { fundo: 50000, mov: [] }), saldo = cx.fundo + cx.mov.reduce((s, m) => s + m.c, 0); if (c > saldo) throw new Error(`A caixinha só tem ${reais(saldo)}.`); cx.mov.push({ id: nid('x'), dia: 0, desc: String(desc || 'Gasto').trim(), c: -c }); }
export const saldoCaixinha = (db) => (db.caixinha ? db.caixinha.fundo + db.caixinha.mov.reduce((s, m) => s + m.c, 0) : 0);
export function reporCaixinha(db) { const cx = db.caixinha, falta = cx.fundo - saldoCaixinha(db); if (falta <= 0) throw new Error('A caixinha está cheia.'); const [l] = novaConta(db, { tipo: 'p', quem: 'Caixinha', desc: 'Reposição da caixinha', c: falta, venc: 0, cat: 'Outras despesas' }); baixar(db, l.id, falta, { forma: 'Saque' }); cx.mov.push({ id: nid('x'), dia: 0, desc: 'Reposição', c: falta }); return falta; }
/** Despesas que subiram: o mesmo fornecedor cobrou mais de 10% acima do mês anterior. */
export function subiram(db, agora = new Date()) {
  const [c0, c1] = [hojeISO(new Date(agora.getFullYear(), agora.getMonth() - 1, 15)).slice(0, 7), compDe(0, agora)], porMes = (comp) => { const [de, ate] = mesEmDias(comp, agora), o = {}; db.lancs.filter((l) => l.tipo === 'p' && l.status !== 'cancelado' && l.venc >= de && l.venc <= ate).forEach((l) => { o[norm(l.quem)] = { quem: l.quem, c: (o[norm(l.quem)]?.c || 0) + l.c }; }); return o; };
  const a = porMes(c0), b = porMes(c1); return Object.keys(b).filter((k) => a[k] && b[k].c > a[k].c * 1.1).map((k) => ({ quem: b[k].quem, antes: a[k].c, agora: b[k].c, pct: b[k].c / a[k].c - 1 })).sort((x, y) => y.pct - x.pct);
}
