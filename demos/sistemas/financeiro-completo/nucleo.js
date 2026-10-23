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
import { centavos, reais, hojeISO, dataDe, isoDe, diaDe, compDe, lerExtrato, norm, DIA_MS } from '../financeiro-comum/dinheiro.js';
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
export const baixas = (db) => db.lancs.flatMap((l) => (l.pagamentos || []).map((p) => ({ ...p, lanc: l.id, tipo: l.tipo, quem: l.quem, desc: l.desc, cat: l.cat, s: sinal(l) * p.c })));
export const saldoAte = (db, dia = 0) => db.saldoInicial.c + baixas(db).filter((b) => b.dia <= dia).reduce((s, b) => s + b.s, 0);
export const saldoHoje = (db) => saldoAte(db, 0);
export const abertos = (db, tipo) => db.lancs.filter((l) => (!tipo || l.tipo === tipo) && situacao(l).falta > 0);

// ------------------------------------------------------------------ contas: criar, editar, baixar, estornar, cancelar
export function novaConta(db, d) {
  exigeValor(d.c); if (!['r', 'p'].includes(d.tipo)) throw new Error('Tipo inválido.');
  const quem = String(d.quem || '').trim(), desc = String(d.desc || '').trim(); if (!quem || !desc) throw new Error(`Preencha ${d.tipo === 'r' ? 'o cliente' : 'o fornecedor'} e o que é.`);
  if (!Number.isInteger(d.venc)) throw new Error('Escolha o vencimento.');
  const rep = Math.max(1, Math.min(36, Number(d.rep) || 1)), criados = [], base = dataDe(d.venc), grupo = rep > 1 ? nid('g') : undefined;
  for (let i = 0; i < rep; i++) {
    // repetir mês a mês no mesmo dia do calendário (31 vira o último dia do mês curto)
    const alvo = new Date(base.getFullYear(), base.getMonth() + i, 1, 12), ult = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate(); alvo.setDate(Math.min(base.getDate(), ult));
    const h = new Date(); h.setHours(12, 0, 0, 0);
    const l = { id: nid(), tipo: d.tipo, quem: quem.slice(0, 80), desc: (desc + (rep > 1 ? ` (${i + 1}/${rep})` : '')).slice(0, 120), c: d.c, venc: Math.round((alvo - h) / DIA_MS), cat: d.cat || CATS[d.tipo][0], cc: d.cc || '', tel: d.tel || '', status: 'aberto', avisos: [], pagamentos: [], origem: d.origem || 'manual' };
    if (grupo) l.grupo = grupo; ['contrato', 'comp', 'orc', 'boleto'].forEach((k) => d[k] && (l[k] = d[k]));
    db.lancs.push(l); criados.push(l);
  }
  registra(db, `Lançou ${d.tipo === 'r' ? 'a receber' : 'a pagar'}: ${quem} · ${reais(d.c)}${rep > 1 ? ` × ${rep} meses` : ''}`);
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
/** Baixa (recebimento ou pagamento), inteira ou parcial. chave evita lançar a mesma baixa duas vezes. */
export function baixar(db, id, c, { dia = 0, forma = '', chave, ext, origem = 'manual' } = {}) {
  const l = db.lancs.find((x) => x.id === id); if (!l) throw new Error('Conta não encontrada.');
  exigeValor(c); const s = situacao(l);
  if (s.st === 'cancelado' || s.st === 'quitado') throw new Error('Esta conta não está em aberto.');
  if (c > s.falta) throw new Error(`O máximo para baixar é ${reais(s.falta)}.`);
  if (dia > 0) throw new Error('A data da baixa não pode ser no futuro.');
  if (chave && db.lancs.some((x) => (x.pagamentos || []).some((p) => p.chave === chave))) return null;
  const p = { id: nid('b'), c, dia, forma, origem, quando: new Date().toISOString() }; if (chave) p.chave = chave; if (ext) p.ext = ext;
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
  if (alvo.tipo === 'ligar') { p = l.pagamentos.find((x) => x.id === alvo.pag); if (!p || p.ext) throw new Error('Essa baixa já está ligada a outra linha do banco.'); if (p.c !== Math.abs(e.c)) throw new Error('O valor da baixa é diferente do valor do banco.'); p.ext = e.id; e.conc = { lanc: l.id, pag: p.id, criou: false }; }
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
  comps(agora).forEach((c, i) => { const g = aGerar(db, c, agora).length; if (g && (i === 0 || agora.getDate() >= 20)) l.push({ tipo: 'vence', id: `contr:${c}`, txt: `${g} contrato(s) sem a cobrança de ${c.slice(5)}/${c.slice(0, 4)}.`, ir: 'contratos' }); });
  return l;
}
/** A régua manda lembrar hoje? (marcos em dias relativos ao vencimento; já lembrou hoje = aviso com dia 0) */
export function lembreteHoje(db, l) { return situacao(l).falta > 0 && (db.regua || []).some((d) => l.venc + d === 0) && !(l.avisos || []).includes(0); }

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
