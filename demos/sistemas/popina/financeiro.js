// Popina · financeiro: fornecedores, compras (recebimento, parcelas, histórico de preços), contas a pagar e a receber,
// fiado (conta do cliente), fluxo de caixa, DRE gerencial e margem por canal. Cada tela entra na Gestão (#mais/<id>).
// Dados: db.fornecedores, db.notasCompra, db.contas, db.fiado { lanc, limites }, db.lotes e db.config.fin.
// A entrada no estoque usa entradaCompra (a mesma da tela de Estoque); o custo teórico usa custoVenda (o mesmo CMV dos relatórios).
import { db, t, din, dinCurto, grava, r2, uid, insumo, entradaCompra, custoVenda, custoPrato, partes, auditar, quemAgora, ouvir, clientePorTel, ondeComanda, lojaCfg, movimento, fmtQtd, CONTA, APARELHO } from './loja.js?v=28';
import { acao, ir } from './nucleo.js?v=28';
import { ico, folha, toast, confirma, $, $$ } from './ui.js?v=28';
import { TELAS_MAIS, MONTAR, volta } from './mais.js?v=28';

// entradas do hub da Gestão: [id, nome, ícone, detalhe]
export const HUB_FINANCEIRO = [
  ['fornecedores', 'Fornecedores', 'pessoas', 'Contato, prazo de entrega e o que cada um vende'],
  ['compras', 'Compras', 'carrinho', 'Notas, recebimento, parcelas e histórico de preços'],
  ['contas', 'Contas a pagar e receber', 'conta', 'Vencimentos, contas do mês e pagamentos'],
  ['fiado', 'Fiado', 'etiqueta', 'Conta dos clientes, limite e recebimentos'],
  ['conciliacao', 'Conferir recebimentos', 'check', 'Confere se o que caiu no banco e na maquininha bate com o vendido (conciliação)'],
  ['fluxo', 'Fluxo de caixa', 'moedas', 'Entradas e saídas por dia e os próximos 30 dias'],
  ['dre', 'Resultado do mês (DRE)', 'grafico', 'Quanto entrou, quanto gastou e quanto sobrou'],
  ['margens', 'Lucro por prato', 'cardapio', 'Quanto sobra de cada prato no salão e no delivery'],
];

// ------------------------------------------------------------------ utilidades
const DIA = 864e5;
const num = (v) => { const s = String(v ?? '').trim(); return Number(/,/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s) || 0; };
const vir = (n) => String(n ?? '').replace('.', ',');
const dec2 = (n) => (Number(n) || 0).toFixed(2).replace('.', ',');
const soDig = (s) => String(s || '').replace(/\D/g, '');
export const ymd = (ts = Date.now()) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const somaDias = (s, n) => { const d = new Date(`${s}T12:00`); d.setDate(d.getDate() + n); return ymd(d.getTime()); };
// mesmo dia no mês seguinte (31 vira o último dia do mês quando ele é mais curto)
export const somaMes = (s, n) => { const [a, m, d] = s.split('-').map(Number); const x = new Date(a, m - 1 + n, 1, 12); x.setDate(Math.min(d, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate())); return ymd(x.getTime()); };
export const dataCurta = (s) => (s ? new Date(`${s}T12:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '');
const tsDia = (s) => new Date(`${s}T12:00`).getTime();
const fone = (tel) => { const d = soDig(tel); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d; };
export const zap = (tel, msg) => `https://wa.me/${soDig(tel) ? '55' + soDig(tel).replace(/^55(?=\d{10,11}$)/, '') : ''}?text=${encodeURIComponent(msg)}`;
const soma = (l, f) => r2(l.reduce((s, x) => s + (Number(f(x)) || 0), 0));

export function garantirFin() {
  db.fornecedores ||= []; db.notasCompra ||= []; db.contas ||= []; db.lotes ||= [];
  db.fiado ||= {}; db.fiado.lanc ||= []; db.fiado.limites ||= {};
}
// ajustes do financeiro: taxas de cartão e Pix (%), custo do delivery (embalagem R$ e comissão %), limite padrão do fiado
export const FIN_PADRAO = { taxas: { debito: 1.99, credito: 3.49, pix: 0 }, delivery: { embalagem: 0, comissao: 0 }, limiteFiado: 300 };
export const finCfg = () => { const c = db.config.fin || {}; return { ...FIN_PADRAO, ...c, taxas: { ...FIN_PADRAO.taxas, ...(c.taxas || {}) }, delivery: { ...FIN_PADRAO.delivery, ...(c.delivery || {}) } }; };
export function setFin(parcial) { const c = finCfg(); db.config.fin = { ...c, ...parcial, taxas: { ...c.taxas, ...(parcial.taxas || {}) }, delivery: { ...c.delivery, ...(parcial.delivery || {}) } }; grava(); }

// período (o mesmo jeito dos relatórios): hoje, ontem, 7, 30, mes ou "AAAA-MM-DD~AAAA-MM-DD"; fim exclusivo
export function periodo(p = '30') {
  const meia = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }, mais = (ts, n) => { const d = new Date(ts); d.setDate(d.getDate() + n); return d.getTime(); };
  const hoje = meia(Date.now()), fim = mais(hoje, 1), m = /^(\d{4}-\d{2}-\d{2})~(\d{4}-\d{2}-\d{2})$/.exec(String(p || ''));
  let r;
  if (p === 'hoje') r = { de: hoje, ate: fim, rot: 'Hoje' };
  else if (p === 'ontem') r = { de: mais(hoje, -1), ate: hoje, rot: 'Ontem' };
  else if (p === '7') r = { de: mais(hoje, -6), ate: fim, rot: 'Últimos 7 dias' };
  else if (p === 'mes') { const d = new Date(hoje); d.setDate(1); r = { de: d.getTime(), ate: fim, rot: 'Este mês' }; }
  else if (m) { let a = new Date(`${m[1]}T00:00`).getTime(), b = new Date(`${m[2]}T00:00`).getTime(); if (b < a) [a, b] = [b, a]; r = { de: a, ate: mais(b, 1), rot: `${new Date(a).toLocaleDateString('pt-BR')} a ${new Date(b).toLocaleDateString('pt-BR')}`, id: 'per' }; }
  else r = { de: mais(hoje, -29), ate: fim, rot: 'Últimos 30 dias', id: '30' };
  return { id: p || '30', ...r, dias: Math.max(1, Math.round((r.ate - r.de) / DIA)) };
}
export const filtroPeriodo = (rota, P) => `<div class="filtros per-filtro"><div class="chips">${[['hoje', 'Hoje'], ['ontem', 'Ontem'], ['7', '7 dias'], ['30', '30 dias'], ['mes', 'Este mês']].map(([k, n]) => `<a class="chip ${P.id === k ? 'on' : ''}" href="#mais/${rota}/${k}">${n}</a>`).join('')}</div>
  <form class="per-datas" data-per="${rota}"><label class="campo"><span>De</span><input type="date" name="de" value="${ymd(P.de)}"></label><label class="campo"><span>Até</span><input type="date" name="ate" value="${ymd(P.ate - 1)}"></label><button class="bt ${P.id === 'per' ? 'cheio' : ''}">Ver período</button></form></div>`;
export const ligaPeriodo = (el) => { const f = $('[data-per]', el); if (f) f.onsubmit = (e) => { e.preventDefault(); if (!f.de.value || !f.ate.value) return toast('Escolha as duas datas'); ir(`mais/${f.dataset.per}/${f.de.value}~${f.ate.value}`); }; };

// ------------------------------------------------------------------ fornecedores
export const fornecedor = (id) => (db.fornecedores || []).find((f) => f.id === id);
export function salvarFornecedor(d, insumos = null) {
  garantirFin();
  let f = d.id ? fornecedor(d.id) : null;
  if (!f) { f = { id: uid('fo') }; db.fornecedores.push(f); }
  Object.assign(f, { nome: String(d.nome || '').trim().slice(0, 80), doc: String(d.doc || '').trim().slice(0, 20), tel: soDig(d.tel).slice(0, 13), prazo: Math.max(0, Math.round(Number(d.prazo) || 0)), obs: String(d.obs || '').trim().slice(0, 200) });
  // insumos ligados: este passa a ser o fornecedor preferido de cada um marcado
  if (insumos) db.insumos.forEach((i) => { if (insumos.includes(i.id)) i.fornecedor = f.id; else if (i.fornecedor === f.id) delete i.fornecedor; });
  grava(); return f;
}

// ------------------------------------------------------------------ compras (notas): itens na unidade de compra, preço total do item
export const totalItens = (n) => soma(n.itens, (i) => i.total);
export const totalNota = (n) => r2(totalItens(n) + (Number(n.frete) || 0));
// preço por unidade de compra com o frete rateado pelo valor de cada item (é o custo que entra no estoque)
export function custoUnit(n, it) { const ti = totalItens(n) || 1; return it.qtd ? r2((it.total + (Number(n.frete) || 0) * (it.total / ti)) / it.qtd) : 0; }
export const STATUS_COMPRA = { aberta: 'A receber', parcial: 'Recebida parcial', recebida: 'Recebida' };
export function novaCompra({ fornecedor: fo = '', data = ymd(), itens = [], frete = 0, obs = '' }) {
  garantirFin();
  const n = { id: uid('nc'), fornecedor: fo, data, itens: itens.filter((i) => insumo(i.insumo) && i.qtd > 0).map((i) => ({ insumo: i.insumo, qtd: r2(i.qtd), total: r2(i.total), recebido: 0 })), frete: r2(frete), obs, status: 'aberta', criado: Date.now(), quem: quemAgora() };
  if (!n.itens.length) return null;
  db.notasCompra.push(n); grava(); return n;
}
// recebe o que chegou (receb = { índice: quantidade na unidade de compra }; sem receb = tudo o que falta).
// Cada item entra no estoque pela entradaCompra (atualiza o saldo e o preço de compra) e, com validade, vira um lote.
// Conferência (opc): divergencias = { índice: { tipo, motivo } } (faltou, veio a mais, trocado, avariado) e encerrar = o que
// faltou não vem mais. Só entra no estoque o que chegou; "veio a mais" aceita passar do pedido. Ao fechar, a conta a pagar
// da compra se ajusta ao valor conferido (preço de cada item × o que chegou + frete).
export const DIVERGENCIAS = [['ok', 'Conferido'], ['faltou', 'Faltou'], ['amais', 'Veio a mais'], ['trocado', 'Trocado'], ['avariado', 'Avariado']];
export const nomeDiv = (k) => DIVERGENCIAS.find((d) => d[0] === k)?.[1] || k;
export function receberCompra(n, receb = null, validades = {}, opc = {}) {
  if (!n) return 0; let k2 = 0; const div = opc.divergencias || {}, quem = quemAgora();
  n.itens.forEach((it, k) => {
    const falta = r2(Math.max(0, it.qtd - (it.recebido || 0))), d = div[k];
    let q = r2(receb ? Math.max(0, Number(receb[k]) || 0) : falta); if (d?.tipo !== 'amais') q = Math.min(q, falta);
    if (d && d.tipo && d.tipo !== 'ok') (n.divergencias ||= []).push({ id: uid('dv'), k, insumo: it.insumo, tipo: d.tipo, esperado: falta, chegou: q, motivo: String(d.motivo || '').trim().slice(0, 140), ts: Date.now(), quem });
    else if (opc.encerrar && q < falta - 0.0001) (n.divergencias ||= []).push({ id: uid('dv'), k, insumo: it.insumo, tipo: 'faltou', esperado: falta, chegou: q, motivo: 'Não veio', ts: Date.now(), quem });
    if (!(q > 0)) return;
    entradaCompra(it.insumo, q, custoUnit(n, it)); it.recebido = r2((it.recebido || 0) + q); k2++;
    const i = insumo(it.insumo);
    if (validades[k] && i) criarLote({ insumo: i.id, qtd: q * (i.fator || 1), validade: validades[k], origem: 'compra', ref: n.id });
  });
  if (opc.encerrar) n.encerrada = { ts: Date.now(), quem };
  n.status = opc.encerrar || n.itens.every((it) => it.recebido >= it.qtd - 0.0001) ? 'recebida' : n.itens.some((it) => it.recebido > 0) ? 'parcial' : 'aberta';
  if (n.status === 'recebida') ajustarContasCompra(n, n.divergencias?.length ? `Conferência: ${n.divergencias.map((x) => `${insumo(x.insumo)?.nome || ''} ${nomeDiv(x.tipo).toLowerCase()}`).join(', ')}` : 'Conferência do recebimento');
  if (k2 || opc.encerrar) { n.recebidaEm = Date.now(); auditar('compra-recebida', { item: fornecedor(n.fornecedor)?.nome || 'Compra', valor: valorConferido(n), motivo: `${STATUS_COMPRA[n.status]}${n.divergencias?.length ? ' · com divergência' : ''}` }); }
  grava(); return k2 || (opc.encerrar ? 1 : 0);
}
// valor do que chegou de fato (preço de cada item × quantidade recebida + frete); antes de fechar a compra vale o total da nota
export const valorConferido = (n) => (n.status === 'recebida' ? r2(n.itens.reduce((s, it) => s + (it.qtd ? (it.total / it.qtd) * (it.recebido || 0) : 0), 0) + (Number(n.frete) || 0)) : totalNota(n));
export const valorDevido = (n) => (n.valorAjustado ?? totalNota(n));
// diferença entre o que a conta cobra e o conferido: abate das parcelas em aberto (da última para a primeira) ou soma na última;
// se tudo já foi pago, a sobra vira crédito a receber do fornecedor
function abater(c, valor, motivo) { const a = r2(Math.min(valor, restaConta(c))); if (!(a > 0)) return 0; c.valorOriginal ??= c.valor; c.valor = r2(c.valor - a); (c.ajustes ||= []).push({ valor: -a, motivo, ts: Date.now(), quem: quemAgora() }); return a; }
function creditoFornecedor(fo, valor, motivo) { return novaConta({ tipo: 'receber', desc: `Crédito com ${fornecedor(fo)?.nome || 'fornecedor'}`, categoria: 'outros', valor, venc: somaDias(ymd(), 7), fornecedor: fo, obs: motivo }); }
export function ajustarContasCompra(n, motivo = 'Conferência do recebimento') {
  garantirFin();
  const alvo = valorConferido(n), delta = r2(alvo - valorDevido(n)); n.valorAjustado = alvo; if (Math.abs(delta) < 0.01) return 0;
  const cts = db.contas.filter((c) => c.compra === n.id && c.tipo === 'pagar').sort((a, b) => b.venc.localeCompare(a.venc));
  if (!cts.length) return delta; // sem conta ainda: quando gerar, já sai pelo valor conferido
  if (delta < 0) { let resta = -delta; cts.forEach((c) => { resta = r2(resta - abater(c, resta, motivo)); }); if (resta > 0.009) creditoFornecedor(n.fornecedor, resta, `${motivo} · compra de ${dataCurta(n.data)}`); }
  else { const c = cts.find((x) => !contaPaga(x)) || null; if (c) { c.valorOriginal ??= c.valor; c.valor = r2(c.valor + delta); (c.ajustes ||= []).push({ valor: delta, motivo, ts: Date.now(), quem: quemAgora() }); } else novaConta({ tipo: 'pagar', desc: `Diferença da compra de ${fornecedor(n.fornecedor)?.nome || 'fornecedor'}`, categoria: 'fornecedor', valor: delta, venc: somaDias(ymd(), 7), fornecedor: n.fornecedor, compra: n.id, obs: motivo }); }
  return delta;
}
// baixa do estoque fora da venda (devolução, consumo interno), pelo mesmo caminho das vendas (chave geração:aparelho)
export function baixarEstoque(insumoId, q, tipo, motivo, quem = quemAgora()) {
  const i = insumo(insumoId); q = r2(q); if (!i || !(q > 0)) return 0;
  const k = `${i.geracao || 0}:${APARELHO}`; i.baixas ||= {}; i.baixas[k] = r2((i.baixas[k] || 0) + q);
  const custo = r2((q / (i.fator || 1)) * (i.custo || 0));
  (db.movEstoque ||= []).push({ id: uid('e'), t: Date.now(), insumo: i.id, tipo, qtd: -q, motivo, quem, custo: -custo });
  if (db.movEstoque.length > 5000) db.movEstoque.splice(0, db.movEstoque.length - 5000);
  return custo;
}
// devolução ao fornecedor: tira do estoque (qtd na unidade de compra) e vira abatimento numa conta a pagar ou crédito a receber
export const DESTINOS_DEV = [['abater', 'Abater numa conta a pagar'], ['receber', 'O fornecedor devolve o dinheiro (conta a receber)']];
export function devolverFornecedor(n, k, qtd, motivo, destino = 'abater', contaId = '') {
  garantirFin();
  const it = n?.itens?.[k]; if (!it) return { erro: 'Item não encontrado' };
  const pode = r2((it.recebido || 0) - (it.devolvido || 0)); qtd = r2(qtd);
  if (!(qtd > 0)) return { erro: 'Informe a quantidade' }; if (qtd > pode + 0.0001) return { erro: `Só chegou ${vir(pode)} desse item` };
  if (String(motivo || '').trim().length < 3) return { erro: 'Escreva o motivo da devolução' };
  const i = insumo(it.insumo), valor = r2(qtd * custoUnit(n, it)), quem = quemAgora(), fo = fornecedor(n.fornecedor)?.nome || 'fornecedor';
  baixarEstoque(it.insumo, qtd * (i?.fator || 1), 'devolucao', `Devolução a ${fo}: ${motivo}`, quem);
  it.devolvido = r2((it.devolvido || 0) + qtd);
  const txt = `Devolução de ${vir(qtd)} ${i?.compra || ''} de ${i?.nome || ''}: ${motivo}`;
  let conta = null, credito = 0;
  if (destino === 'abater') { conta = db.contas.find((c) => c.id === contaId && !contaPaga(c)); const a = conta ? abater(conta, valor, txt) : 0; if (valor - a > 0.009) credito = r2(valor - a); }
  else credito = valor;
  const cr = credito ? creditoFornecedor(n.fornecedor, credito, txt) : null;
  (n.devolucoes ||= []).push({ id: uid('dv'), k, insumo: it.insumo, qtd, valor, motivo: String(motivo).trim().slice(0, 140), destino, conta: conta?.id || '', credito: cr?.id || '', ts: Date.now(), quem });
  auditar('devolucao', { quem, item: i?.nome || '', qtd, valor, motivo: `${fo} · ${motivo}` });
  grava(); return { ok: true, valor, conta, credito: cr };
}
// lote (compra com validade ou produção): qtd na unidade da receita
export function criarLote({ insumo: id, qtd, validade, origem = 'compra', ref = '', data = ymd() }) {
  garantirFin();
  const l = { id: uid('lt'), insumo: id, qtd: r2(qtd), validade, origem, ref, data, criado: Date.now() };
  db.lotes.push(l); return l;
}
// a compra vira conta a pagar: à vista (opcional já paga) ou em N parcelas a cada "intervalo" dias
export function gerarContasCompra(n, { parcelas = 1, primeiro = n.data, intervalo = 30, paga = false, forma = 'Pix' } = {}) {
  garantirFin();
  const N = Math.max(1, Math.min(24, Math.round(parcelas) || 1)), vals = partes(valorDevido(n), N), nome = fornecedor(n.fornecedor)?.nome || 'fornecedor';
  const l = vals.map((v, k) => novaConta({ tipo: 'pagar', desc: `Compra de ${nome}${N > 1 ? ` · ${k + 1}/${N}` : ''}`, categoria: 'fornecedor', valor: v, venc: somaDias(primeiro, k * intervalo), fornecedor: n.fornecedor, compra: n.id, ...(N > 1 ? { parcela: `${k + 1}/${N}` } : {}) }));
  if (paga && N === 1) pagarConta(l[0], l[0].valor, primeiro, forma);
  n.contas = l.map((c) => c.id); grava(); return l;
}
// preços pagos por um insumo (por fornecedor), do mais novo para o mais velho; preço = total do item ÷ quantidade (sem frete)
export function historicoPrecos(insumoId) {
  return (db.notasCompra || []).flatMap((n) => n.itens.filter((it) => it.insumo === insumoId && it.qtd > 0).map((it) => ({ fornecedor: n.fornecedor, data: n.data, preco: r2(it.total / it.qtd), qtd: it.qtd, nota: n.id })))
    .sort((a, b) => b.data.localeCompare(a.data) || 0);
}
// último preço de cada fornecedor e a variação contra o anterior do mesmo fornecedor (%)
export function ultimosPrecos(insumoId) {
  const m = {}; historicoPrecos(insumoId).forEach((h) => { (m[h.fornecedor] ||= []).push(h); });
  return Object.entries(m).map(([fo, l]) => ({ fornecedor: fo, ultimo: l[0], antes: l[1] || null, variacao: l[1] && l[1].preco ? r2(((l[0].preco - l[1].preco) / l[1].preco) * 100) : null }));
}

// ------------------------------------------------------------------ contas a pagar e a receber
export const CATEGORIAS_PAGAR = [['fornecedor', 'Fornecedor'], ['aluguel', 'Aluguel'], ['energia', 'Energia'], ['agua', 'Água'], ['internet', 'Internet'], ['salarios', 'Salários'], ['impostos', 'Impostos'], ['manutencao', 'Manutenção'], ['marketing', 'Marketing'], ['outros', 'Outros']];
export const CATEGORIAS_RECEBER = [['clientes', 'Clientes'], ['eventos', 'Eventos'], ['outros', 'Outros']];
export const FORMAS_CONTA = ['Pix', 'Boleto', 'Dinheiro', 'Cartão', 'Transferência', 'Débito automático'];
const nomeCat = (k) => [...CATEGORIAS_PAGAR, ...CATEGORIAS_RECEBER].find((c) => c[0] === k)?.[1] || 'Outros';
export const pagoConta = (c) => soma(c.pagamentos || [], (p) => p.valor);
export const restaConta = (c) => r2(Math.max(0, c.valor - pagoConta(c)));
export const contaPaga = (c) => restaConta(c) <= 0.009;
export function situacaoConta(c, hoje = ymd()) { return contaPaga(c) ? 'paga' : c.venc < hoje ? 'vencida' : c.venc === hoje ? 'hoje' : 'aberta'; }
const NOME_SIT = { paga: 'Paga', vencida: 'Vencida', hoje: 'Vence hoje', aberta: 'Em aberto' };
export function novaConta(d) {
  garantirFin();
  const c = { id: uid('ct'), tipo: d.tipo === 'receber' ? 'receber' : 'pagar', desc: String(d.desc || '').trim().slice(0, 100) || 'Conta', categoria: d.categoria || 'outros', valor: r2(Math.max(0, Number(d.valor) || 0)), venc: d.venc || ymd(),
    pagamentos: [], recorrente: !!d.recorrente, criado: Date.now(), ...(d.fornecedor ? { fornecedor: d.fornecedor } : {}), ...(d.compra ? { compra: d.compra } : {}), ...(d.parcela ? { parcela: d.parcela } : {}), ...(d.obs ? { obs: String(d.obs).slice(0, 200) } : {}) };
  db.contas.push(c); return c;
}
// pagamento (ou recebimento) total ou parcial; conta recorrente quitada gera a do mês seguinte (uma vez só)
export function pagarConta(c, valor, data = ymd(), forma = 'Pix') {
  if (!c) return null;
  valor = r2(Math.min(Number(valor) || 0, restaConta(c))); if (!(valor > 0)) return null;
  (c.pagamentos ||= []).push({ id: uid('pg'), valor, data, forma, ts: Date.now(), quem: quemAgora() });
  let prox = null;
  if (contaPaga(c) && c.recorrente && !c.proxima) {
    prox = novaConta({ tipo: c.tipo, desc: c.desc, categoria: c.categoria, valor: c.valor, venc: somaMes(c.venc, 1), recorrente: true, fornecedor: c.fornecedor, obs: c.obs });
    c.proxima = prox.id;
  }
  auditar(c.tipo === 'pagar' ? 'conta-paga' : 'conta-recebida', { valor, motivo: `${c.desc} · ${forma}` });
  grava(); return prox || true;
}
// despesas que se repetem: quando chega o mês do vencimento, a do mês seguinte já aparece (uma vez só, sem duplicar)
export function gerarRecorrentes(hoje = ymd()) {
  garantirFin(); const mes = hoje.slice(0, 7); let n = 0;
  for (let volta = 0; volta < 24; volta++) {
    const l = db.contas.filter((c) => c.recorrente && !c.proxima && c.venc.slice(0, 7) <= mes); if (!l.length) break;
    l.forEach((c) => {
      const venc = somaMes(c.venc, 1), ja = db.contas.find((x) => x !== c && x.tipo === c.tipo && x.recorrente && x.desc === c.desc && x.venc.slice(0, 7) === venc.slice(0, 7));
      if (ja) { c.proxima = ja.id; return; }
      const p = novaConta({ tipo: c.tipo, desc: c.desc, categoria: c.categoria, valor: c.valorOriginal ?? c.valor, venc, recorrente: true, fornecedor: c.fornecedor, obs: c.obs }); p.auto = true; c.proxima = p.id; n++;
    });
  }
  if (n) grava(); return n;
}

// ------------------------------------------------------------------ fiado (conta do cliente, pelo telefone)
export const FORMA_FIADO = 'Fiado (conta do cliente)';
// conta faturada (caixa.js) vira conta a receber: no fluxo e na conciliação só conta quando a empresa paga
const aPrazo = (f) => f === FORMA_FIADO || f === 'Faturado (empresa)';
const cidDe = (tel) => 't' + soDig(tel);
export const saldoFiado = (cid) => { garantirFin(); return soma(db.fiado.lanc.filter((l) => l.cliente === cid), (l) => (l.tipo === 'compra' ? l.valor : -l.valor)); };
export const limiteFiado = (cid) => { garantirFin(); const x = db.fiado.limites[cid]; return x != null ? Number(x) : Number(finCfg().limiteFiado) || 0; };
const nomeFiado = (cid) => clientePorTel(cid.slice(1))?.nome || [...(db.fiado?.lanc || [])].reverse().find((l) => l.cliente === cid && l.nome)?.nome || '';
// lança o fiado da conta (venda = comanda do caixa, cliente = { nome, tel }); confere o limite do cliente. Devolve { ok } ou { erro }
export function registrarFiado(venda, cliente, valor) {
  garantirFin();
  const d = soDig(cliente?.tel), nome = String(cliente?.nome || '').trim().slice(0, 80);
  if (d.length < 10) return { erro: 'Informe o telefone do cliente com DDD' };
  if (nome.length < 2) return { erro: 'Informe o nome do cliente' };
  valor = r2(valor); if (!(valor > 0)) return { erro: 'Valor inválido' };
  const cid = 't' + d, s = saldoFiado(cid), lim = limiteFiado(cid);
  if (s + valor > lim + 0.009) return { erro: `Passa do limite de ${din(lim)} (já deve ${din(s)})`, saldo: s, limite: lim };
  db.fiado.lanc.push({ id: uid('fd'), cliente: cid, nome, tel: d, tipo: 'compra', valor, ts: Date.now(), onde: venda ? ondeComanda(venda) : '', comanda: venda?.id || '', quem: quemAgora(venda) });
  db.clientes ||= [];
  if (!db.clientes.some((x) => x.id === cid)) db.clientes.push({ id: cid, tel: d, nome, pedidos: 0, total: 0, primeiro: Date.now() });
  auditar('fiado', { valor, motivo: `Fiado de ${nome}`, mesa: venda?.mesa, num: venda?.num });
  grava(); return { ok: true, saldo: r2(s + valor), limite: lim };
}
// recebe do cliente (total ou parcial); em dinheiro com o caixa aberto, entra na gaveta como suprimento
export function receberFiado(cid, valor, forma = 'Dinheiro') {
  garantirFin();
  valor = r2(Math.min(Number(valor) || 0, saldoFiado(cid))); if (!(valor > 0)) return null;
  const gaveta = forma === 'Dinheiro' && !!db.caixa;
  db.fiado.lanc.push({ id: uid('fd'), cliente: cid, nome: nomeFiado(cid), tel: cid.slice(1), tipo: 'receb', valor, forma, ts: Date.now(), quem: quemAgora(), ...(gaveta ? { gaveta: true } : {}) });
  if (gaveta) movimento('suprimento', valor, `Recebimento de fiado · ${nomeFiado(cid) || fone(cid.slice(1))}`); else { auditar('fiado-recebido', { valor, motivo: `${nomeFiado(cid)} · ${forma}` }); grava(); }
  return valor;
}
export function clientesFiado() {
  garantirFin();
  const ids = [...new Set([...db.fiado.lanc.map((l) => l.cliente), ...Object.keys(db.fiado.limites)])];
  return ids.map((cid) => { const l = db.fiado.lanc.filter((x) => x.cliente === cid); return { cid, nome: nomeFiado(cid), tel: cid.slice(1), saldo: saldoFiado(cid), limite: limiteFiado(cid), ultima: Math.max(0, ...l.filter((x) => x.tipo === 'compra').map((x) => x.ts)) }; })
    .sort((a, b) => b.saldo - a.saldo || a.nome.localeCompare(b.nome, 'pt-BR'));
}
// a folha do caixa: pede nome e telefone, mostra o saldo e o limite, lança o fiado e só então fecha a parte da conta
export function pedirFiado(c, valor, concluir) {
  garantirFin();
  const cl = c?.cliente || {};
  folha({ titulo: `Fiado · ${din(valor)}`, corpo: `<p class="mudo">Fica na conta do cliente para receber depois em Gestão › Fiado.</p>
    <label class="campo"><span>WhatsApp do cliente (com DDD)</span><input data-tel inputmode="tel" autocomplete="off" value="${t(cl.tel || '')}" placeholder="16 99999-9999"></label>
    <label class="campo"><span>Nome do cliente</span><input data-nome maxlength="80" value="${t(cl.nome || '')}"></label>
    <p class="fiado-info" data-info></p>`,
  pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio" data-ok>Pôr na conta do cliente</button>',
  aoAbrir: (f, fechar) => {
    const info = () => {
      const d = soDig($('[data-tel]', f).value), el = $('[data-info]', f); if (d.length < 10) { el.textContent = 'Com o telefone, aparece quanto o cliente já deve e o limite.'; return; }
      const cid = 't' + d, s = saldoFiado(cid), lim = limiteFiado(cid), novo = r2(s + valor), nm = nomeFiado(cid);
      if (nm && !$('[data-nome]', f).value.trim()) $('[data-nome]', f).value = nm;
      el.innerHTML = `Deve ${din(s)} · limite ${din(lim)} · ${novo > lim + 0.009 ? `<b class="erro">passa do limite em ${din(novo - lim)}</b>` : `fica devendo ${din(novo)}`}`;
    };
    $('[data-tel]', f).oninput = info; info();
    $('[data-ok]', f).onclick = () => {
      if (c && !db.comandas.includes(c)) { fechar(); toast('Esta conta já foi fechada em outro aparelho'); return; }
      const cli = { nome: $('[data-nome]', f).value.trim(), tel: soDig($('[data-tel]', f).value) };
      const r = registrarFiado(c, cli, valor); if (r.erro) { toast(r.erro); return; }
      if (c && soDig(c.cliente?.tel).length < 10) c.cliente = { ...(c.cliente || {}), nome: cli.nome, tel: cli.tel };
      fechar(); concluir?.({ fiado: cidDe(cli.tel) });
    };
  } });
}

// ------------------------------------------------------------------ fluxo de caixa e projeção
const pagamentosVenda = (v) => (v.pagamentos?.length ? v.pagamentos : [{ forma: v.forma, valor: v.total }]);
const sangrias = () => [...(db.fechamentos || []).flatMap((f) => f.movimentos || []), ...(db.caixa?.movimentos || [])].filter((m) => m.tipo === 'sangria');
// por dia: entradas (vendas recebidas por forma, fiado recebido, contas a receber pagas) e saídas (contas pagas, sangrias); o fiado vendido não é entrada
export function fluxo(de, ate) {
  garantirFin();
  const dentro = (ts) => ts >= de && ts < ate, m = {};
  const D = (k) => (m[k] ||= { vendas: 0, formas: {}, fiado: 0, receber: 0, pagar: 0, sangria: 0 });
  db.vendas.filter((v) => !v.cancelado && dentro(v.ts)).forEach((v) => pagamentosVenda(v).forEach((p) => { if (aPrazo(p.forma)) return; const d = D(ymd(v.ts)); d.vendas += p.valor; d.formas[p.forma] = (d.formas[p.forma] || 0) + p.valor; }));
  db.fiado.lanc.filter((l) => l.tipo === 'receb' && dentro(l.ts)).forEach((l) => { D(ymd(l.ts)).fiado += l.valor; });
  db.contas.forEach((c) => (c.pagamentos || []).forEach((p) => { if (dentro(tsDia(p.data))) D(p.data)[c.tipo] += p.valor; }));
  sangrias().filter((s) => dentro(s.ts)).forEach((s) => { D(ymd(s.ts)).sangria += s.valor; });
  const dias = []; let acum = 0;
  for (let d = new Date(de); d.getTime() < ate; d.setDate(d.getDate() + 1)) {
    const k = ymd(d.getTime()), x = m[k] || { vendas: 0, formas: {}, fiado: 0, receber: 0, pagar: 0, sangria: 0 };
    const entradas = r2(x.vendas + x.fiado + x.receber), saidas = r2(x.pagar + x.sangria), saldo = r2(entradas - saidas); acum = r2(acum + saldo);
    dias.push({ dia: k, ...x, vendas: r2(x.vendas), fiado: r2(x.fiado), receber: r2(x.receber), pagar: r2(x.pagar), sangria: r2(x.sangria), entradas, saidas, saldo, acum });
  }
  const formas = {}; dias.forEach((d) => Object.entries(d.formas).forEach(([f, v]) => { formas[f] = r2((formas[f] || 0) + v); }));
  return { dias, formas, entradas: soma(dias, (d) => d.entradas), saidas: soma(dias, (d) => d.saidas), saldo: acum };
}
// próximos N dias: contas a pagar e a receber em aberto por vencimento (as atrasadas ficam numa linha só)
export function projecao(n = 30) {
  garantirFin();
  const hoje = ymd(), fim = somaDias(hoje, n), m = {};
  db.contas.filter((c) => !contaPaga(c) && c.venc <= fim).forEach((c) => { const k = c.venc < hoje ? 'atraso' : c.venc; (m[k] ||= { receber: 0, pagar: 0 })[c.tipo] += restaConta(c); });
  let acum = 0;
  return Object.keys(m).sort((a, b) => (a === 'atraso' ? -1 : b === 'atraso' ? 1 : a.localeCompare(b))).map((k) => { const x = m[k], s = r2(x.receber - x.pagar); acum = r2(acum + s); return { dia: k, receber: r2(x.receber), pagar: r2(x.pagar), saldo: s, acum }; });
}

// ------------------------------------------------------------------ DRE gerencial (estimativa, não é contabilidade)
const taxaDaForma = (f, T) => (/d[ée]bito/i.test(f) ? T.debito : /cr[ée]dito|cart[aã]o/i.test(f) ? T.credito : /pix/i.test(f) ? T.pix : 0);
export function dre(de, ate) {
  garantirFin();
  const dentro = (ts) => ts >= de && ts < ate, F = finCfg(), L = lojaCfg();
  const vP = db.vendas.filter((v) => dentro(v.ts) && !v.cancelado);
  const vC = db.vendas.filter((v) => v.cancelado && !v.cancelado.reaberta && dentro(v.cancelado.ts || v.ts));
  const descontos = soma(vP, (v) => v.desconto), cancelamentos = soma(vC, (v) => v.total), liquida = soma(vP, (v) => v.total);
  const bruta = r2(liquida + descontos + cancelamentos), servico = soma(vP, (v) => v.servico), comissao = Number(L.comissao ?? 10) || 0, repasse = r2(servico * comissao / 100);
  const cmv = soma(vP, custoVenda);
  const porForma = {}; vP.forEach((v) => pagamentosVenda(v).forEach((p) => { porForma[p.forma] = r2((porForma[p.forma] || 0) + p.valor); }));
  const taxas = r2(Object.entries(porForma).reduce((s, [f, v]) => s + v * taxaDaForma(f, F.taxas) / 100, 0));
  // despesas = contas a pagar pagas no período; compras de fornecedor ficam de fora (o custo delas já está no CMV)
  const desp = {}; db.contas.filter((c) => c.tipo === 'pagar' && c.categoria !== 'fornecedor').forEach((c) => (c.pagamentos || []).forEach((p) => { if (dentro(tsDia(p.data))) desp[c.categoria] = r2((desp[c.categoria] || 0) + p.valor); }));
  const despesas = soma(Object.values(desp), (x) => x);
  // consumo interno e cortesias: custo pela ficha técnica, fora das vendas (Operação › Consumo interno)
  const ciL = (db.consumoInterno || []).filter((x) => dentro(x.ts)), consumo = soma(ciL, (x) => x.custo), consumoTipo = {};
  ciL.forEach((x) => { consumoTipo[x.tipo] = r2((consumoTipo[x.tipo] || 0) + x.custo); });
  const resultado = r2(liquida - repasse - cmv - taxas - despesas - consumo);
  return { vendas: vP.length, bruta, descontos, cancelamentos, liquida, servico, comissao, repasse, cmv, porForma, taxas, desp, despesas, consumo, consumoTipo, resultado, margem: liquida ? r2((resultado / liquida) * 100) : 0 };
}

// ------------------------------------------------------------------ margem por canal (salão × delivery)
export function margemCanal(p, F = finCfg()) {
  const custo = custoPrato(p), preco = Number(p.preco) || 0, emb = Number(F.delivery.embalagem) || 0, com = (Number(F.delivery.comissao) || 0) / 100;
  const ms = r2(preco - custo), md = r2(preco - custo - emb - preco * com), pctS = preco ? (ms / preco) * 100 : 0, pctD = preco ? (md / preco) * 100 : 0;
  // preço no delivery para ter a mesma margem % do salão: (custo + embalagem) ÷ (1 − comissão − margem do salão)
  const div = 1 - com - pctS / 100, igual = custo && div > 0.01 ? r2((custo + emb) / div) : 0;
  return { custo, preco, salao: ms, delivery: md, pctS: r2(pctS), pctD: r2(pctD), precoIgual: igual };
}

// ================================================================== telas
const pill = (cls, txt) => `<em class="fin-st fin-${cls}">${txt}</em>`;
const sel = (l, v, vazio = '') => `${vazio ? `<option value="">${vazio}</option>` : ''}${l.map(([k, n]) => `<option value="${t(k)}" ${k === v ? 'selected' : ''}>${t(n)}</option>`).join('')}`;
const optsForn = (v) => sel((db.fornecedores || []).map((f) => [f.id, f.nome]), v, 'Sem fornecedor');

// ---------------- fornecedores
TELAS_MAIS.fornecedores = () => {
  garantirFin();
  const l = db.fornecedores.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return volta('mais', 'Fornecedores', `${l.length} cadastrados · ligue cada insumo ao fornecedor preferido`) + `<div class="linha-bts"><button type="button" class="bt cheio" data-acao="fin-forn">${ico('mais2')}Novo fornecedor</button><a class="bt" href="#mais/compras">Compras</a><a class="bt" href="#mais/sugestao">Sugestão de compra</a></div>
    <ul class="lista-res fin-lista">${l.map((f) => {
      const ins = db.insumos.filter((i) => i.fornecedor === f.id), aPagar = soma(db.contas.filter((c) => c.tipo === 'pagar' && c.fornecedor === f.id && !contaPaga(c)), restaConta);
      return `<li><div><b>${t(f.nome)}</b><small>${[f.doc && t(f.doc), f.tel && fone(f.tel), `entrega em ${f.prazo || 0} ${f.prazo === 1 ? 'dia' : 'dias'}`].filter(Boolean).join(' · ')}</small><small>${ins.length ? ins.map((i) => t(i.nome)).join(', ') : 'Nenhum insumo ligado'}</small>${f.obs ? `<small>${t(f.obs)}</small>` : ''}</div>
        <div class="res-bts">${aPagar ? `<em class="badge">${dinCurto(aPagar)} a pagar</em>` : ''}${f.tel ? `<a class="bt-ico" href="${zap(f.tel, '')}" target="_blank" rel="noopener" aria-label="WhatsApp de ${t(f.nome)}">${ico('zap')}</a>` : ''}<button type="button" class="bt-ico" data-acao="fin-forn" data-id="${f.id}" aria-label="Editar ${t(f.nome)}">${ico('ajustes')}</button></div></li>`;
    }).join('') || '<li class="vazio">Nenhum fornecedor ainda. Cadastre quem entrega para você e ligue os insumos de cada um.</li>'}</ul>`;
};
acao('fin-forn', (b) => {
  garantirFin();
  const f = fornecedor(b.dataset.id) || { nome: '', doc: '', tel: '', prazo: 1, obs: '' }, novo = !f.id;
  folha({ titulo: novo ? 'Novo fornecedor' : f.nome, larga: true, corpo: `<label class="campo"><span>Nome</span><input data-n maxlength="80" value="${t(f.nome)}" placeholder="Ex.: Distribuidora Central"></label>
    <div class="duas-c"><label class="campo"><span>CNPJ ou CPF (opcional)</span><input data-doc maxlength="20" value="${t(f.doc)}"></label><label class="campo"><span>Telefone ou WhatsApp</span><input data-tel inputmode="tel" value="${t(fone(f.tel))}" placeholder="16 99999-9999"></label></div>
    <div class="duas-c"><label class="campo"><span>Prazo de entrega (dias)</span><input data-pz inputmode="numeric" value="${f.prazo ?? 1}"></label><label class="campo"><span>Observação</span><input data-obs maxlength="200" value="${t(f.obs)}" placeholder="Ex.: pedido mínimo R$ 300"></label></div>
    <div class="campo"><span>Insumos que você compra dele (fica como fornecedor preferido)</span><div class="chips quebra">${db.insumos.map((i) => { const on = !novo && i.fornecedor === f.id; return `<label class="chip ${on ? 'on' : ''}"><input type="checkbox" data-ins value="${i.id}" ${on ? 'checked' : ''} hidden>${t(i.nome)}${i.fornecedor && i.fornecedor !== f.id ? ` <small>(${t(fornecedor(i.fornecedor)?.nome || '')})</small>` : ''}</label>`; }).join('')}</div></div>
    ${novo ? '' : '<button type="button" class="bt perigo" data-apagar>Apagar fornecedor</button>'}`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
  aoAbrir: (el, fechar) => {
    el.addEventListener('change', (e) => { const i = e.target; if (i.matches('.chip input')) i.closest('.chip').classList.toggle('on', i.checked); });
    $('[data-apagar]', el)?.addEventListener('click', async () => {
      if (!(await confirma(`Apagar ${f.nome}? As compras e contas antigas continuam, só sem o fornecedor.`, 'Apagar', true))) return;
      db.insumos.forEach((i) => { if (i.fornecedor === f.id) delete i.fornecedor; }); db.fornecedores = db.fornecedores.filter((x) => x !== f); grava(); fechar(); toast('Fornecedor apagado');
    });
    $('[data-ok]', el).onclick = () => {
      const nome = $('[data-n]', el).value.trim(); if (nome.length < 2) { toast('Escreva o nome do fornecedor'); return $('[data-n]', el).focus(); }
      salvarFornecedor({ id: f.id, nome, doc: $('[data-doc]', el).value, tel: $('[data-tel]', el).value, prazo: num($('[data-pz]', el).value), obs: $('[data-obs]', el).value }, $$('[data-ins]:checked', el).map((x) => x.value));
      fechar(); toast(novo ? 'Fornecedor cadastrado' : 'Fornecedor salvo');
    };
  } });
});

// ---------------- compras
TELAS_MAIS.compras = (filtro = '') => {
  garantirFin();
  const de30 = somaDias(ymd(), -30), ult = db.notasCompra.filter((n) => n.data >= de30);
  const l = db.notasCompra.filter((n) => !filtro || n.status === filtro).sort((a, b) => b.data.localeCompare(a.data) || b.criado - a.criado).slice(0, 80);
  const ins = [...new Set(db.notasCompra.flatMap((n) => n.itens.map((i) => i.insumo)))].map(insumo).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const precos = ins.flatMap((i) => ultimosPrecos(i.id).map((u) => ({ i, ...u })));
  const aReceber = db.notasCompra.filter((n) => n.status !== 'recebida').length;
  const de30ts = Date.now() - 30 * DIA, ocorr = db.notasCompra.flatMap((n) => [...(n.divergencias || []).map((x) => ({ ...x, n, dev: false })), ...(n.devolucoes || []).map((x) => ({ ...x, n, dev: true }))]).filter((x) => x.ts >= de30ts).sort((a, b) => b.ts - a.ts);
  return volta('mais', 'Compras', `${ult.length} nos últimos 30 dias · ${din(soma(ult, totalNota))}`) + `<div class="linha-bts"><button type="button" class="bt cheio" data-acao="fin-compra">${ico('mais2')}Nova compra</button><a class="bt" href="#mais/sugestao">Sugestão de compra</a><a class="bt" href="#mais/fornecedores">Fornecedores</a></div>
    <div class="filtros"><div class="chips">${[['', 'Todas'], ['aberta', 'A receber'], ['parcial', 'Recebida parcial'], ['recebida', 'Recebidas']].map(([k, n]) => `<a class="chip ${filtro === k ? 'on' : ''}" href="#mais/compras/${k}">${n}${k === '' && aReceber ? ` <em class="badge">${aReceber}</em>` : ''}</a>`).join('')}</div></div>
    <section class="bloco"><div class="tabela-rolo"><table class="tabela"><thead><tr><th>Data</th><th>Fornecedor</th><th>Itens</th><th class="num">Total</th><th>Situação</th><th></th></tr></thead><tbody>
    ${l.map((n) => `<tr><td>${dataCurta(n.data)}</td><td><b>${t(fornecedor(n.fornecedor)?.nome || 'Sem fornecedor')}</b></td><td><small>${n.itens.map((it) => { const i = insumo(it.insumo); return `${vir(it.qtd)} ${t(i?.compra || '')} ${t(i?.nome || '?')}${it.recebido < it.qtd && n.status === 'parcial' ? ` (chegou ${vir(it.recebido || 0)})` : ''}`; }).join(' · ')}</small></td>
      <td class="num">${dinCurto(valorDevido(n))}${Math.abs(valorDevido(n) - totalNota(n)) > 0.009 ? `<small>nota ${dinCurto(totalNota(n))}</small>` : ''}</td><td>${pill(n.status, STATUS_COMPRA[n.status])}${n.divergencias?.length ? ` ${pill('vencida', 'Divergência')}` : ''}</td>
      <td class="acoes">${n.status !== 'recebida' ? `<button type="button" class="bt pq" data-acao="fin-receber" data-id="${n.id}">Receber</button>` : ''}<button type="button" class="bt-ico" data-acao="fin-ver-compra" data-id="${n.id}" aria-label="Ver a compra">${ico('dir')}</button></td></tr>`).join('') || '<tr><td colspan="6" class="vazio">Nenhuma compra registrada. Toque em Nova compra para lançar a nota do fornecedor.</td></tr>'}</tbody></table></div></section>
    ${ocorr.length ? `<section class="bloco"><div class="sec-tit"><h2>Divergências e devoluções</h2><span>últimos 30 dias</span></div><div class="tabela-rolo"><table class="tabela"><thead><tr><th>Quando</th><th>Fornecedor</th><th>Item</th><th>O que houve</th><th class="num">Valor</th></tr></thead><tbody>
      ${ocorr.map((x) => { const i = insumo(x.insumo), pu = x.n.itens[x.k]?.qtd ? x.n.itens[x.k].total / x.n.itens[x.k].qtd : 0; return `<tr><td>${new Date(x.ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td><td>${t(fornecedor(x.n.fornecedor)?.nome || '')}</td><td><b>${t(i?.nome || '')}</b></td><td>${x.dev ? `${pill('ok', 'Devolução')} ${vir(x.qtd)} ${t(i?.compra || '')}` : `${pill(x.tipo === 'amais' ? 'aberta' : 'vencida', nomeDiv(x.tipo))} esperado ${vir(x.esperado)}, chegou ${vir(x.chegou)}`}<small>${t(x.motivo || '')}</small></td><td class="num">${x.dev ? `−${dinCurto(x.valor)}` : dinCurto(r2((x.chegou - x.esperado) * pu))}</td></tr>`; }).join('')}</tbody></table></div></section>` : ''}
    <section class="bloco"><div class="sec-tit"><h2>Histórico de preços</h2><span>último preço de cada fornecedor e a variação contra a compra anterior</span></div>
      <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Insumo</th><th>Fornecedor</th><th class="num">Último</th><th class="num">Antes</th><th class="num">Variação</th><th></th></tr></thead><tbody>
      ${precos.map((x) => `<tr><td><b>${t(x.i.nome)}</b></td><td>${t(fornecedor(x.fornecedor)?.nome || 'Sem fornecedor')}</td><td class="num">${dinCurto(x.ultimo.preco)}/${t(x.i.compra)}<small>${dataCurta(x.ultimo.data)}</small></td><td class="num">${x.antes ? `${dinCurto(x.antes.preco)}<small>${dataCurta(x.antes.data)}</small>` : '<small class="mudo">primeira</small>'}</td>
        <td class="num">${x.variacao == null ? '' : `<b class="${x.variacao > 0.05 ? 'erro' : x.variacao < -0.05 ? 'ok-txt' : ''}">${x.variacao > 0 ? '+' : ''}${vir(x.variacao)}%</b>`}</td><td class="acoes"><button type="button" class="bt-ico" data-acao="fin-precos" data-i="${x.i.id}" aria-label="Todos os preços de ${t(x.i.nome)}">${ico('relogio')}</button></td></tr>`).join('') || '<tr><td colspan="6" class="vazio">Os preços aparecem aqui depois das primeiras compras.</td></tr>'}</tbody></table></div></section>`;
};
acao('fin-precos', (b) => {
  const i = insumo(b.dataset.i); if (!i) return;
  const h = historicoPrecos(i.id);
  folha({ titulo: `Preços de ${i.nome}`, larga: true, corpo: `<div class="tabela-rolo"><table class="tabela"><thead><tr><th>Data</th><th>Fornecedor</th><th class="num">Quantidade</th><th class="num">Preço</th></tr></thead><tbody>
    ${h.map((x) => `<tr><td>${dataCurta(x.data)}</td><td>${t(fornecedor(x.fornecedor)?.nome || 'Sem fornecedor')}</td><td class="num">${vir(x.qtd)} ${t(i.compra)}</td><td class="num"><b>${dinCurto(x.preco)}</b>/${t(i.compra)}</td></tr>`).join('')}</tbody></table></div>
    <p class="mudo">Preço de compra usado no custo dos pratos hoje: ${din(i.custo)}/${t(i.compra)}.</p>` });
});
acao('fin-ver-compra', (b) => {
  const n = (db.notasCompra || []).find((x) => x.id === b.dataset.id); if (!n) return;
  const cts = (db.contas || []).filter((c) => c.compra === n.id);
  folha({ titulo: `Compra de ${dataCurta(n.data)}`, larga: true, corpo: `<p class="mudo">${t(fornecedor(n.fornecedor)?.nome || 'Sem fornecedor')} · ${STATUS_COMPRA[n.status]}${n.obs ? ` · ${t(n.obs)}` : ''}</p>
    <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Insumo</th><th class="num">Pedido</th><th class="num">Chegou</th><th class="num">Total</th><th class="num">Custo com frete</th></tr></thead><tbody>
    ${n.itens.map((it) => { const i = insumo(it.insumo); return `<tr><td>${t(i?.nome || '?')}</td><td class="num">${vir(it.qtd)} ${t(i?.compra || '')}</td><td class="num">${vir(it.recebido || 0)}</td><td class="num">${dinCurto(it.total)}</td><td class="num">${dinCurto(custoUnit(n, it))}/${t(i?.compra || '')}</td></tr>`; }).join('')}</tbody></table></div>
    <div class="resumo"><div><span>Itens</span><b>${din(totalItens(n))}</b></div><div><span>Frete</span><b>${din(n.frete || 0)}</b></div><div class="total"><span>Total</span><b>${din(totalNota(n))}</b></div></div>
    ${Math.abs(valorDevido(n) - totalNota(n)) > 0.009 ? `<p class="aviso ouro">${ico('alerta')}Conferido ${din(valorDevido(n))} (nota ${din(totalNota(n))}): a conta a pagar foi ajustada.</p>` : ''}
    ${n.divergencias?.length ? `<h3 class="r4-sub">Divergências no recebimento</h3><ul class="r4-mini">${n.divergencias.map((x) => { const i = insumo(x.insumo); return `<li>${pill(x.tipo === 'amais' ? 'aberta' : 'vencida', nomeDiv(x.tipo))}<span><b>${t(i?.nome || '')}</b>: esperado ${vir(x.esperado)}, chegou ${vir(x.chegou)} ${t(i?.compra || '')}${x.motivo ? ` · ${t(x.motivo)}` : ''}<small>${new Date(x.ts).toLocaleDateString('pt-BR')} · ${t(x.quem || '')}</small></span></li>`; }).join('')}</ul>` : ''}
    ${n.devolucoes?.length ? `<h3 class="r4-sub">Devoluções ao fornecedor</h3><ul class="r4-mini">${n.devolucoes.map((x) => { const i = insumo(x.insumo); return `<li>${pill('ok', dinCurto(x.valor))}<span><b>${vir(x.qtd)} ${t(i?.compra || '')} de ${t(i?.nome || '')}</b> · ${t(x.motivo)}<small>${x.destino === 'abater' && x.conta ? 'abatido na conta a pagar' : 'crédito a receber do fornecedor'} · ${new Date(x.ts).toLocaleDateString('pt-BR')}</small></span></li>`; }).join('')}</ul>` : ''}
    ${cts.length ? `<p class="mudo" style="margin-top:10px">Contas a pagar: ${cts.map((c) => `${t(c.parcela || 'à vista')} ${dinCurto(c.valor)}${c.ajustes?.length ? ` (era ${dinCurto(c.valorOriginal)})` : ''} vence ${dataCurta(c.venc)} (${NOME_SIT[situacaoConta(c)].toLowerCase()})`).join(' · ')}</p>` : ''}`,
  pe: `${n.status !== 'recebida' ? `<button type="button" class="bt cheio" data-fechar data-acao="fin-receber" data-id="${n.id}">Receber</button>` : ''}${n.itens.some((it) => (it.recebido || 0) - (it.devolvido || 0) > 0.0001) ? `<button type="button" class="bt" data-fechar data-acao="fin-devolver" data-id="${n.id}">Devolver ao fornecedor</button>` : ''}${!cts.length ? `<button type="button" class="bt" data-fechar data-acao="fin-gerar-contas" data-id="${n.id}">Gerar conta a pagar</button>` : ''}` });
});
// nova compra (pre = { fornecedor, itens: [{ insumo, qtd, total }] } quando vem da sugestão de compra)
export function abrirNovaCompra(pre = {}) {
  garantirFin();
  const base = db.insumos.filter((i) => !i.preparo);
  if (!base.length) { toast('Cadastre primeiro os insumos em Estoque'); return; }
  let itens = (pre.itens || []).map((x) => ({ ...x })); if (!itens.length) itens = [{ insumo: base[0].id, qtd: 0, total: 0 }];
  const linhas = () => itens.map((x, k) => { const i = insumo(x.insumo); return `<li><select data-ci="${k}" aria-label="Insumo">${base.map((y) => `<option value="${y.id}" ${y.id === x.insumo ? 'selected' : ''}>${t(y.nome)}</option>`).join('')}</select>
    <input data-cq="${k}" inputmode="decimal" value="${x.qtd ? vir(x.qtd) : ''}" placeholder="Qtd" aria-label="Quantidade"><small data-cu="${k}">${t(i?.compra || '')}</small><input data-ct="${k}" inputmode="decimal" value="${x.total ? dec2(x.total) : ''}" placeholder="Total R$" aria-label="Preço total do item"><button type="button" class="bt-ico" data-ctira="${k}" aria-label="Tirar item">${ico('lixo')}</button></li>`; }).join('');
  folha({ titulo: 'Nova compra', larga: true, corpo: `<div class="duas-c"><label class="campo"><span>Fornecedor</span><select data-fo>${optsForn(pre.fornecedor || '')}</select></label><label class="campo"><span>Data da compra</span><input type="date" data-dt value="${ymd()}"></label></div>
    <div class="campo"><span>Itens: quantidade na unidade de compra e o preço total de cada item</span><ul class="ficha-ed fin-itens" data-l>${linhas()}</ul><button type="button" class="link" data-mais>+ Item</button></div>
    <div class="duas-c"><label class="campo"><span>Frete (opcional, R$)</span><input data-fr inputmode="decimal" placeholder="0,00"></label><div class="campo"><span>Total da compra</span><b class="fin-total" data-tot></b></div></div>
    <section class="bloco-form"><h2>Pagamento</h2><label class="campo"><span>Conta a pagar</span><select data-pg><option value="paga">À vista, já paga</option><option value="vista">À vista, pagar no vencimento</option><option value="parc">Parcelado</option><option value="">Não gerar conta</option></select></label>
      <div class="tres-c" data-pgx hidden><label class="campo"><span>Parcelas</span><input data-np inputmode="numeric" value="2"></label><label class="campo"><span>Primeiro vencimento</span><input type="date" data-pv value="${somaDias(ymd(), 30)}"></label><label class="campo"><span>A cada (dias)</span><input data-iv inputmode="numeric" value="30"></label></div>
      <label class="campo" data-fpx><span>Forma</span><select data-fp>${FORMAS_CONTA.map((f) => `<option>${f}</option>`).join('')}</select></label></section>
    <label class="interruptor bloco-int"><input type="checkbox" data-chegou checked><span></span>Já chegou: dar entrada no estoque agora (com validade, se quiser)</label>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Salvar compra</button>',
  aoAbrir: (f, fechar) => {
    const ler = () => { itens = itens.map((x, k) => ({ insumo: $(`[data-ci="${k}"]`, f)?.value || x.insumo, qtd: num($(`[data-cq="${k}"]`, f)?.value), total: num($(`[data-ct="${k}"]`, f)?.value) })); };
    const tot = () => { ler(); $('[data-tot]', f).textContent = din(soma(itens, (x) => x.total) + num($('[data-fr]', f).value)); };
    const pg = () => { const v = $('[data-pg]', f).value; $('[data-pgx]', f).hidden = v !== 'parc' && v !== 'vista'; $('[data-np]', f).closest('.campo').hidden = v !== 'parc'; $('[data-iv]', f).closest('.campo').hidden = v !== 'parc'; $('[data-fpx]', f).hidden = !v; };
    f.addEventListener('input', tot);
    f.addEventListener('change', (e) => { const s = e.target.closest('[data-ci]'); if (s) { const i = insumo(s.value); $(`[data-cu="${s.dataset.ci}"]`, f).textContent = i?.compra || ''; } if (e.target.matches('[data-pg]')) pg(); });
    $('[data-mais]', f).onclick = () => { ler(); itens.push({ insumo: base[0].id, qtd: 0, total: 0 }); $('[data-l]', f).innerHTML = linhas(); };
    f.addEventListener('click', (e) => { const x = e.target.closest('[data-ctira]'); if (!x) return; ler(); itens.splice(Number(x.dataset.ctira), 1); if (!itens.length) itens.push({ insumo: base[0].id, qtd: 0, total: 0 }); $('[data-l]', f).innerHTML = linhas(); tot(); });
    tot(); pg();
    $('[data-ok]', f).onclick = () => {
      ler(); const validos = itens.filter((x) => x.qtd > 0);
      if (!validos.length) return toast('Informe a quantidade de pelo menos um item');
      if (validos.some((x) => !(x.total > 0))) return toast('Informe o preço total de cada item');
      const dt = $('[data-dt]', f).value || ymd();
      const n = novaCompra({ fornecedor: $('[data-fo]', f).value, data: dt, itens: validos, frete: num($('[data-fr]', f).value) }); if (!n) return toast('Confira os itens');
      const modo = $('[data-pg]', f).value, forma = $('[data-fp]', f).value;
      if (modo === 'paga') gerarContasCompra(n, { paga: true, primeiro: dt, forma });
      else if (modo === 'vista') gerarContasCompra(n, { primeiro: $('[data-pv]', f).value || dt });
      else if (modo === 'parc') gerarContasCompra(n, { parcelas: num($('[data-np]', f).value) || 2, primeiro: $('[data-pv]', f).value || dt, intervalo: Math.max(1, num($('[data-iv]', f).value) || 30) });
      const chegou = $('[data-chegou]', f).checked; fechar(); toast('Compra registrada');
      if (chegou) setTimeout(() => abrirReceber(n), 240); else ir('mais/compras');
    };
  } });
}
acao('fin-compra', () => abrirNovaCompra());
acao('fin-gerar-contas', (b) => {
  const n = (db.notasCompra || []).find((x) => x.id === b.dataset.id); if (!n) return;
  folha({ titulo: 'Gerar conta a pagar', corpo: `<p class="mudo">Total da compra: ${din(valorDevido(n))}</p><div class="tres-c"><label class="campo"><span>Parcelas</span><input data-np inputmode="numeric" value="1"></label><label class="campo"><span>Primeiro vencimento</span><input type="date" data-pv value="${somaDias(n.data, 30)}"></label><label class="campo"><span>A cada (dias)</span><input data-iv inputmode="numeric" value="30"></label></div>`,
    pe: '<button type="button" class="bt cheio grande" data-ok>Gerar</button>',
    aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => { const l = gerarContasCompra(n, { parcelas: num($('[data-np]', f).value) || 1, primeiro: $('[data-pv]', f).value || n.data, intervalo: Math.max(1, num($('[data-iv]', f).value) || 30) }); fechar(); toast(`${l.length} ${l.length === 1 ? 'conta gerada' : 'parcelas geradas'}`); }; } });
});
// recebimento com conferência: pedido × chegou por item, divergência com motivo, validade do lote e, se o que faltou
// não vem mais, a compra fecha e a conta a pagar se ajusta ao conferido
export function abrirReceber(n) {
  if (!n) return;
  const l = n.itens.map((it, k) => [it, k]).filter(([it]) => it.recebido < it.qtd - 0.0001);
  if (!l.length) { toast('Esta compra já foi recebida'); return; }
  const optsDiv = DIVERGENCIAS.map(([k, nm]) => `<option value="${k}">${nm}</option>`).join('');
  folha({ titulo: 'Receber e conferir', larga: true, corpo: `<p class="mudo">${t(fornecedor(n.fornecedor)?.nome || 'Sem fornecedor')} · compra de ${dataCurta(n.data)}. Confira item por item: só entra no estoque o que chegou.</p>
    <ul class="r4-conf">${l.map(([it, k]) => { const i = insumo(it.insumo), falta = r2(it.qtd - (it.recebido || 0)); return `<li data-k="${k}"><div class="r4-conf-tit"><b>${t(i?.nome || '?')}</b><small>pedido ${vir(falta)} ${t(i?.compra || '')}${it.recebido ? ` (já chegou ${vir(it.recebido)})` : ''} · ${dinCurto(it.qtd ? it.total / it.qtd : 0)}/${t(i?.compra || '')}</small></div>
      <div class="r4-conf-campos"><label class="campo"><span>Chegou (${t(i?.compra || '')})</span><input data-rq="${k}" data-falta="${falta}" inputmode="decimal" value="${vir(falta)}"></label>
        <label class="campo"><span>Situação</span><select data-rd="${k}">${optsDiv}</select></label>
        <label class="campo r4-larga"><span>Motivo da divergência</span><input data-rm="${k}" maxlength="140" placeholder="Ex.: 2 caixas amassadas"></label>
        <label class="campo"><span>Validade (opcional)</span><input type="date" data-rv="${k}" min="${ymd()}"></label></div></li>`; }).join('')}</ul>
    <label class="interruptor bloco-int"><input type="checkbox" data-enc><span></span>O que faltou não vem mais: fechar a compra e ajustar a conta a pagar</label>
    <div class="resumo"><div><span>Pedido</span><b>${din(valorDevido(n))}</b></div><div class="total"><span>Conferido</span><b data-conf></b></div></div><p class="mudo" data-dif></p>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Confirmar recebimento</button>',
  aoAbrir: (f, fechar) => {
    const ler = () => { const receb = {}, div = {}; $$('[data-rq]', f).forEach((x) => { receb[x.dataset.rq] = Math.max(0, num(x.value)); }); $$('[data-rd]', f).forEach((x) => { div[x.dataset.rd] = { tipo: x.value, motivo: $(`[data-rm="${x.dataset.rd}"]`, f).value }; }); return { receb, div }; };
    const conta = () => {
      const { receb, div } = ler();
      const v = r2(n.itens.reduce((s2, it, k) => { const ch = (it.recebido || 0) + (receb[k] ?? 0); const q = div[k]?.tipo === 'amais' ? ch : Math.min(it.qtd, ch); return s2 + (it.qtd ? (it.total / it.qtd) * q : 0); }, 0) + (Number(n.frete) || 0));
      $('[data-conf]', f).textContent = din(v);
      const d = r2(v - valorDevido(n)), enc = $('[data-enc]', f).checked || Object.values(div).every((x) => x.tipo !== 'faltou') && n.itens.every((it, k) => (it.recebido || 0) + (receb[k] ?? 0) >= it.qtd - 0.0001);
      $('[data-dif]', f).textContent = Math.abs(d) < 0.01 ? 'Bate com o pedido.' : enc ? `A conta a pagar ${d < 0 ? 'cai' : 'sobe'} ${din(Math.abs(d))} ao confirmar.` : `Diferença de ${din(Math.abs(d))}: o que falta fica a receber até você fechar a compra.`;
    };
    f.addEventListener('input', (e) => {
      const q = e.target.closest('[data-rq]');
      if (q) { const k = q.dataset.rq, falta = Number(q.dataset.falta), v = num(q.value), s2 = $(`[data-rd="${k}"]`, f);
        if (v > falta + 0.0001) s2.value = 'amais'; else if (v < falta - 0.0001 && (s2.value === 'ok' || s2.value === 'amais')) s2.value = 'faltou'; else if (Math.abs(v - falta) < 0.0001 && (s2.value === 'faltou' || s2.value === 'amais')) s2.value = 'ok'; }
      conta();
    });
    f.addEventListener('change', (e) => { if (e.target.matches('[data-rd]') && ['trocado', 'avariado'].includes(e.target.value)) $('[data-enc]', f).checked = true; conta(); });
    conta();
    $('[data-ok]', f).onclick = () => {
      const { receb, div } = ler(), val = {}; $$('[data-rv]', f).forEach((x) => { if (x.value) val[x.dataset.rv] = x.value; });
      const sem = Object.entries(div).find(([, d]) => d.tipo !== 'ok' && d.tipo !== 'amais' && String(d.motivo).trim().length < 3 && d.tipo !== 'faltou');
      if (sem) { toast('Escreva o motivo do item trocado ou avariado'); return $(`[data-rm="${sem[0]}"]`, f).focus(); }
      const enc = $('[data-enc]', f).checked, k = receberCompra(n, receb, val, { divergencias: div, encerrar: enc }); fechar();
      const dv = n.divergencias?.filter((x) => Date.now() - x.ts < 5000).length || 0;
      toast(!k ? 'Nada entrou no estoque' : n.status === 'recebida' ? `Compra recebida${dv ? ` com ${dv} ${dv === 1 ? 'divergência' : 'divergências'}` : ''}${Math.abs(valorDevido(n) - totalNota(n)) > 0.009 ? ` · conta ajustada para ${din(valorDevido(n))}` : ''}` : 'Recebida em parte, o resto fica a receber');
      ir('mais/compras');
    };
  } });
}
acao('fin-receber', (b) => abrirReceber((db.notasCompra || []).find((x) => x.id === b.dataset.id)));
acao('fin-devolver', (b) => {
  garantirFin();
  const n = (db.notasCompra || []).find((x) => x.id === b.dataset.id); if (!n) return;
  const its = n.itens.map((it, k) => [it, k]).filter(([it]) => (it.recebido || 0) - (it.devolvido || 0) > 0.0001);
  if (!its.length) return toast('Nada desta compra para devolver');
  const abertas = db.contas.filter((c) => c.tipo === 'pagar' && !contaPaga(c) && (c.compra === n.id || (n.fornecedor && c.fornecedor === n.fornecedor))).sort((a, c) => (a.compra === n.id ? -1 : 0) - (c.compra === n.id ? -1 : 0) || a.venc.localeCompare(c.venc));
  folha({ titulo: 'Devolver ao fornecedor', corpo: `<p class="mudo">${t(fornecedor(n.fornecedor)?.nome || 'Sem fornecedor')} · compra de ${dataCurta(n.data)}. Sai do estoque e vira abatimento ou crédito.</p>
    <label class="campo"><span>Item</span><select data-k>${its.map(([it, k]) => { const i = insumo(it.insumo); return `<option value="${k}">${t(i?.nome || '?')} (até ${vir(r2((it.recebido || 0) - (it.devolvido || 0)))} ${t(i?.compra || '')})</option>`; }).join('')}</select></label>
    <div class="duas-c"><label class="campo"><span>Quantidade (unidade de compra)</span><input data-q inputmode="decimal"></label><div class="campo"><span>Valor</span><b class="fin-total" data-v>R$ 0,00</b></div></div>
    <label class="campo"><span>Motivo</span><input data-m maxlength="140" placeholder="Ex.: Embalagem violada"></label>
    <label class="campo"><span>O que fazer com o valor</span><select data-dest>${DESTINOS_DEV.map(([k, nm]) => `<option value="${k}" ${k === 'abater' && !abertas.length ? 'disabled' : ''} ${k === (abertas.length ? 'abater' : 'receber') ? 'selected' : ''}>${nm}</option>`).join('')}</select></label>
    <label class="campo" data-cx ${abertas.length ? '' : 'hidden'}><span>Conta a pagar</span><select data-c>${abertas.map((c) => `<option value="${c.id}">${t(c.desc)} · falta ${dinCurto(restaConta(c))} · vence ${dataCurta(c.venc)}</option>`).join('')}</select></label>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Registrar devolução</button>',
  aoAbrir: (f, fechar) => {
    const val = () => { const it = n.itens[Number($('[data-k]', f).value)]; $('[data-v]', f).textContent = din(r2(num($('[data-q]', f).value) * custoUnit(n, it))); };
    f.addEventListener('input', val); f.addEventListener('change', (e) => { if (e.target.matches('[data-dest]')) $('[data-cx]', f).hidden = e.target.value !== 'abater'; val(); }); val();
    $('[data-ok]', f).onclick = () => {
      const r = devolverFornecedor(n, Number($('[data-k]', f).value), num($('[data-q]', f).value), $('[data-m]', f).value, $('[data-dest]', f).value, $('[data-c]', f)?.value || '');
      if (r.erro) return toast(r.erro);
      fechar(); toast(`Devolução de ${din(r.valor)} registrada${r.conta ? ' e abatida da conta' : ''}${r.credito ? ` · crédito de ${din(r.credito.valor)} a receber` : ''}`);
    };
  } });
});

// ---------------- contas a pagar e a receber
TELAS_MAIS.contas = (arg = '') => {
  garantirFin();
  const [tipo0, filtro = ''] = String(arg || '').split('~'), tipo = tipo0 === 'receber' ? 'receber' : 'pagar', hoje = ymd(), em7 = somaDias(hoje, 7), mes = hoje.slice(0, 7);
  const todas = db.contas.filter((c) => c.tipo === tipo), abertas = todas.filter((c) => !contaPaga(c));
  const F = { rec: (c) => c.recorrente && !contaPaga(c), '': (c) => !contaPaga(c), vencidas: (c) => situacaoConta(c, hoje) === 'vencida', hoje: (c) => situacaoConta(c, hoje) === 'hoje', 7: (c) => !contaPaga(c) && c.venc <= em7, mes: (c) => c.venc.startsWith(mes), pagas: contaPaga };
  const l = todas.filter(F[filtro] || F['']).sort((a, b) => (filtro === 'pagas' ? b.venc.localeCompare(a.venc) : a.venc.localeCompare(b.venc)));
  const venc = abertas.filter((c) => c.venc < hoje), hj = abertas.filter((c) => c.venc === hoje), sete = abertas.filter((c) => c.venc <= em7);
  const pagoMes = soma(todas.flatMap((c) => c.pagamentos || []).filter((p) => p.data.startsWith(mes)), (p) => p.valor);
  const verbo = tipo === 'pagar' ? 'Pagar' : 'Receber', rot = `${tipo}~`;
  return volta('mais', 'Contas a pagar e receber', 'Vencimentos, contas que se repetem todo mês e pagamentos em partes') + `
    <div class="seg grande fin-seg" role="group"><a href="#mais/contas/pagar~${filtro}" aria-pressed="${tipo === 'pagar'}">A pagar</a><a href="#mais/contas/receber~${filtro}" aria-pressed="${tipo === 'receber'}">A receber</a></div>
    <section class="kpis"><div class="${venc.length ? 'fin-alerta' : ''}"><small>Vencidas</small><b>${dinCurto(soma(venc, restaConta))}</b><span>${venc.length} ${venc.length === 1 ? 'conta' : 'contas'}</span></div><div><small>Vence hoje</small><b>${dinCurto(soma(hj, restaConta))}</b><span>${hj.length} ${hj.length === 1 ? 'conta' : 'contas'}</span></div>
      <div><small>Próximos 7 dias</small><b>${dinCurto(soma(sete, restaConta))}</b><span>com as vencidas</span></div><div><small>${tipo === 'pagar' ? 'Pago' : 'Recebido'} no mês</small><b>${dinCurto(pagoMes)}</b><span>${new Date().toLocaleDateString('pt-BR', { month: 'long' })}</span></div></section>
    <div class="linha-bts"><button type="button" class="bt cheio" data-acao="fin-conta" data-tipo="${tipo}">${ico('mais2')}Nova conta a ${tipo}</button></div>
    <div class="filtros"><div class="chips">${[['', 'Em aberto'], ['vencidas', 'Vencidas'], ['hoje', 'Hoje'], ['7', '7 dias'], ['mes', 'Este mês'], ['rec', 'Todo mês'], ['pagas', tipo === 'pagar' ? 'Pagas' : 'Recebidas']].map(([k, n]) => `<a class="chip ${filtro === k ? 'on' : ''}" href="#mais/contas/${rot}${k}">${n}</a>`).join('')}</div></div>
    <section class="bloco"><div class="tabela-rolo"><table class="tabela fin-contas"><thead><tr><th>Vence</th><th>Conta</th><th class="num">Valor</th><th class="num">Falta</th><th>Situação</th><th></th></tr></thead><tbody>
    ${l.map((c) => { const s = situacaoConta(c, hoje), pg = pagoConta(c); return `<tr class="${s === 'vencida' ? 'fin-atraso' : s === 'paga' ? 'off' : ''}"><td>${dataCurta(c.venc)}</td><td><b>${t(c.desc)}</b><small>${[nomeCat(c.categoria), c.recorrente ? (c.auto ? 'todo mês · gerada sozinha' : 'todo mês') : '', c.ajustes?.length ? `ajustada de ${dinCurto(c.valorOriginal ?? c.valor)}` : '', c.fornecedor ? t(fornecedor(c.fornecedor)?.nome || '') : '', pg && !contaPaga(c) ? `já ${tipo === 'pagar' ? 'pago' : 'recebido'} ${dinCurto(pg)}` : ''].filter(Boolean).join(' · ')}</small></td>
      <td class="num">${dinCurto(c.valor)}</td><td class="num">${contaPaga(c) ? '' : `<b>${dinCurto(restaConta(c))}</b>`}</td><td>${pill(s, NOME_SIT[s])}</td>
      <td class="acoes">${contaPaga(c) ? '' : `<button type="button" class="bt pq ${s === 'vencida' ? 'cheio' : ''}" data-acao="fin-pagar" data-id="${c.id}">${verbo}</button>`}<button type="button" class="bt-ico" data-acao="fin-conta" data-id="${c.id}" aria-label="Editar ${t(c.desc)}">${ico('ajustes')}</button></td></tr>`; }).join('') || `<tr><td colspan="6" class="vazio">Nenhuma conta ${filtro === 'pagas' ? (tipo === 'pagar' ? 'paga' : 'recebida') : 'nesse filtro'}.</td></tr>`}</tbody></table></div></section>`;
};
acao('fin-conta', (b) => {
  garantirFin();
  const c = (db.contas || []).find((x) => x.id === b.dataset.id), novo = !c, tipo = c?.tipo || b.dataset.tipo || 'pagar', cats = tipo === 'pagar' ? CATEGORIAS_PAGAR : CATEGORIAS_RECEBER;
  const x = c || { desc: '', categoria: tipo === 'pagar' ? 'outros' : 'clientes', valor: 0, venc: ymd(), recorrente: false, fornecedor: '', obs: '' };
  folha({ titulo: novo ? `Nova conta a ${tipo}` : x.desc, corpo: `<label class="campo"><span>Descrição</span><input data-d maxlength="100" value="${t(x.desc)}" placeholder="${tipo === 'pagar' ? 'Ex.: Conta de energia' : 'Ex.: Saldo do evento'}"></label>
    <div class="duas-c"><label class="campo"><span>Categoria</span><select data-cat>${sel(cats, x.categoria)}</select></label><label class="campo"><span>Valor (R$)</span><input data-v inputmode="decimal" value="${x.valor ? dec2(x.valor) : ''}" placeholder="0,00"></label></div>
    <div class="duas-c"><label class="campo"><span>Vencimento</span><input type="date" data-venc value="${x.venc}"></label>${tipo === 'pagar' ? `<label class="campo"><span>Fornecedor (opcional)</span><select data-fo>${optsForn(x.fornecedor || '')}</select></label>` : '<span></span>'}</div>
    <label class="interruptor bloco-int"><input type="checkbox" data-rec ${x.recorrente ? 'checked' : ''}><span></span>Repete todo mês: a do mês seguinte aparece sozinha</label>
    <label class="campo"><span>Observação (opcional)</span><input data-obs maxlength="200" value="${t(x.obs || '')}"></label>
    ${c?.pagamentos?.length ? `<p class="mudo">${c.pagamentos.map((p) => `${dataCurta(p.data)} ${dinCurto(p.valor)} (${t(p.forma)})`).join(' · ')}</p>` : ''}
    ${!novo && !c.pagamentos?.length ? '<button type="button" class="bt perigo" data-apagar>Apagar conta</button>' : ''}`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
  aoAbrir: (f, fechar) => {
    $('[data-apagar]', f)?.addEventListener('click', async () => { if (!(await confirma(`Apagar ${c.desc}?`, 'Apagar', true))) return; db.contas = db.contas.filter((y) => y !== c); grava(); fechar(); toast('Conta apagada'); });
    $('[data-ok]', f).onclick = () => {
      const d = { desc: $('[data-d]', f).value.trim(), categoria: $('[data-cat]', f).value, valor: r2(num($('[data-v]', f).value)), venc: $('[data-venc]', f).value || ymd(), recorrente: $('[data-rec]', f).checked, fornecedor: $('[data-fo]', f)?.value || '', obs: $('[data-obs]', f).value.trim() };
      if (d.desc.length < 2) { toast('Escreva a descrição'); return $('[data-d]', f).focus(); }
      if (!(d.valor > 0)) { toast('Informe o valor'); return $('[data-v]', f).focus(); }
      if (novo) novaConta({ tipo, ...d }); else { Object.assign(c, d); if (!c.fornecedor) delete c.fornecedor; }
      grava(); fechar(); toast(novo ? 'Conta lançada' : 'Conta salva');
    };
  } });
});
acao('fin-pagar', (b) => {
  const c = (db.contas || []).find((x) => x.id === b.dataset.id); if (!c) return;
  const verbo = c.tipo === 'pagar' ? 'Pagar' : 'Receber', resta = restaConta(c);
  folha({ titulo: `${verbo} · ${c.desc}`, corpo: `<p class="mudo">Valor ${din(c.valor)}${pagoConta(c) ? ` · já ${c.tipo === 'pagar' ? 'pago' : 'recebido'} ${din(pagoConta(c))}` : ''} · vence ${dataCurta(c.venc)}</p>
    <div class="duas-c"><label class="campo"><span>Valor (menos que o total fica em aberto)</span><input data-v inputmode="decimal" value="${dec2(resta)}"></label><label class="campo"><span>Data</span><input type="date" data-dt value="${ymd()}"></label></div>
    <label class="campo"><span>Forma</span><select data-fp>${FORMAS_CONTA.map((x) => `<option>${x}</option>`).join('')}</select></label>
    ${c.recorrente && !c.proxima ? `<p class="mudo">A de ${dataCurta(somaMes(c.venc, 1))} é gerada sozinha.</p>` : ''}${c.ajustes?.length ? `<p class="mudo">Ajustes: ${c.ajustes.map((a) => `${a.valor < 0 ? '−' : '+'}${dinCurto(Math.abs(a.valor))} (${t(a.motivo)})`).join(' · ')}</p>` : ''}`,
  pe: `<button type="button" class="bt cheio grande" data-ok>${verbo}</button>`,
  aoAbrir: (f, fechar) => {
    $('[data-ok]', f).onclick = () => {
      const v = r2(num($('[data-v]', f).value)); if (!(v > 0)) return toast('Informe o valor');
      if (v > resta + 0.009) return toast(`O valor passa do que falta (${din(resta)})`);
      const r = pagarConta(c, v, $('[data-dt]', f).value || ymd(), $('[data-fp]', f).value); fechar();
      toast(r?.id ? `Quitada. A próxima vence em ${dataCurta(r.venc)}` : contaPaga(c) ? 'Quitada' : `Pagamento parcial. Falta ${din(restaConta(c))}`);
    };
  } });
});

// ---------------- fiado
TELAS_MAIS.fiado = () => {
  garantirFin();
  const l = clientesFiado(), dev = l.filter((x) => x.saldo > 0.009), F = finCfg(), total = soma(dev, (x) => x.saldo);
  const de30 = Date.now() - 30 * DIA, rec30 = soma(db.fiado.lanc.filter((x) => x.tipo === 'receb' && x.ts >= de30), (x) => x.valor);
  return volta('mais', 'Fiado', 'A conta dos clientes: no caixa, escolha “Fiado” e informe o telefone') + `<section class="kpis"><div><small>Em aberto</small><b>${dinCurto(total)}</b><span>${dev.length} ${dev.length === 1 ? 'cliente' : 'clientes'}</span></div><div><small>Recebido em 30 dias</small><b>${dinCurto(rec30)}</b><span>de fiado</span></div>
      <div><small>Limite padrão</small><b>${dinCurto(F.limiteFiado)}</b><span>por cliente</span></div><div class="${dev.some((x) => x.saldo >= x.limite * 0.9) ? 'fin-alerta' : ''}"><small>Perto do limite</small><b>${dev.filter((x) => x.saldo >= x.limite * 0.9).length}</b><span>90% ou mais</span></div></section>
    <form class="form linha-form" data-fiado-lim><label class="campo"><span>Limite padrão por cliente (R$)</span><input name="lim" inputmode="decimal" value="${dec2(F.limiteFiado)}"></label><button class="bt">Salvar limite</button></form>
    <section class="bloco"><div class="tabela-rolo"><table class="tabela"><thead><tr><th>Cliente</th><th class="num">Deve</th><th class="num">Limite</th><th>Última compra</th><th></th></tr></thead><tbody>
    ${l.map((x) => `<tr class="${x.saldo > 0.009 ? '' : 'off'}"><td><b>${t(x.nome || 'Sem nome')}</b><small>${fone(x.tel)}</small></td><td class="num"><b class="${x.saldo > x.limite ? 'erro' : ''}">${dinCurto(x.saldo)}</b></td><td class="num">${dinCurto(x.limite)}<span class="fin-barra"><i style="width:${Math.min(100, x.limite ? (x.saldo / x.limite) * 100 : 0)}%"></i></span></td><td>${x.ultima ? new Date(x.ultima).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''}</td>
      <td class="acoes">${x.saldo > 0.009 ? `<button type="button" class="bt pq cheio" data-acao="fin-fiado-receber" data-c="${x.cid}">Receber</button><a class="bt-ico" href="${zap(x.tel, `Olá, ${x.nome.split(' ')[0] || ''}. Sua conta no ${db.config.nome} está em ${din(x.saldo)}. Quando puder, passe aqui ou pague por Pix. Obrigado.`)}" target="_blank" rel="noopener" aria-label="Lembrar ${t(x.nome)} no WhatsApp">${ico('zap')}</a>` : ''}
        <button type="button" class="bt-ico" data-acao="fin-fiado-extrato" data-c="${x.cid}" aria-label="Extrato de ${t(x.nome)}">${ico('relogio')}</button><button type="button" class="bt-ico" data-acao="fin-fiado-limite" data-c="${x.cid}" aria-label="Limite de ${t(x.nome)}">${ico('ajustes')}</button></td></tr>`).join('') || '<tr><td colspan="5" class="vazio">Ninguém na conta. No caixa, a forma “Fiado” lança a conta do cliente pelo telefone.</td></tr>'}</tbody></table></div></section>`;
};
MONTAR.fiado = (el) => {
  const f = $('[data-fiado-lim]', el); if (!f) return;
  f.onsubmit = (e) => { e.preventDefault(); setFin({ limiteFiado: r2(Math.max(0, num(f.lim.value))) }); toast('Limite salvo'); };
};
acao('fin-fiado-receber', (b) => {
  const cid = b.dataset.c, s = saldoFiado(cid), nome = nomeFiado(cid);
  folha({ titulo: `Receber de ${nome || fone(cid.slice(1))}`, corpo: `<p class="mudo">Deve ${din(s)}</p>
    <label class="campo"><span>Valor recebido</span><input data-v inputmode="decimal" value="${dec2(s)}"></label>
    <div class="chips"><button type="button" class="chip on" data-tudo>Quitar tudo (${dinCurto(s)})</button><button type="button" class="chip" data-meio>Metade</button></div>
    <label class="campo"><span>Forma</span><select data-fp>${['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito'].map((x) => `<option>${x}</option>`).join('')}</select></label>
    <p class="mudo">${db.caixa ? 'Em dinheiro, entra na gaveta do caixa aberto como suprimento.' : 'O caixa está fechado: o recebimento fica só no fiado e no fluxo de caixa.'}</p>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Receber</button>',
  aoAbrir: (f, fechar) => {
    $('[data-tudo]', f).onclick = () => { $('[data-v]', f).value = dec2(s); }; $('[data-meio]', f).onclick = () => { $('[data-v]', f).value = dec2(r2(s / 2)); };
    $('[data-ok]', f).onclick = () => { const v = r2(num($('[data-v]', f).value)); if (!(v > 0)) return toast('Informe o valor'); if (v > s + 0.009) return toast(`O cliente deve ${din(s)}`); receberFiado(cid, v, $('[data-fp]', f).value); fechar(); const r = saldoFiado(cid); toast(r > 0.009 ? `Recebido ${din(v)}. Ainda deve ${din(r)}` : 'Conta quitada'); };
  } });
});
acao('fin-fiado-extrato', (b) => {
  const cid = b.dataset.c, l = (db.fiado?.lanc || []).filter((x) => x.cliente === cid).sort((a, c) => c.ts - a.ts);
  folha({ titulo: `Fiado de ${nomeFiado(cid) || fone(cid.slice(1))}`, larga: true, corpo: `<p class="mudo">Deve ${din(saldoFiado(cid))} · limite ${din(limiteFiado(cid))}</p><div class="tabela-rolo"><table class="tabela"><thead><tr><th>Quando</th><th>Movimento</th><th class="num">Valor</th></tr></thead><tbody>
    ${l.map((x) => `<tr><td>${new Date(x.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td><td>${x.tipo === 'compra' ? `Compra${x.onde ? ` · ${t(x.onde)}` : ''}` : `Recebido · ${t(x.forma || '')}`}<small>${t(x.quem || '')}</small></td><td class="num"><b class="${x.tipo === 'compra' ? 'erro' : 'ok-txt'}">${x.tipo === 'compra' ? '+' : '−'}${dinCurto(x.valor)}</b></td></tr>`).join('') || '<tr><td colspan="3" class="vazio">Sem movimento.</td></tr>'}</tbody></table></div>` });
});
acao('fin-fiado-limite', (b) => {
  const cid = b.dataset.c, proprio = db.fiado?.limites?.[cid];
  folha({ titulo: `Limite de ${nomeFiado(cid) || fone(cid.slice(1))}`, corpo: `<label class="campo"><span>Limite deste cliente (R$). Em branco usa o padrão de ${din(finCfg().limiteFiado)}.</span><input data-v inputmode="decimal" value="${proprio != null ? dec2(proprio) : ''}" placeholder="Padrão"></label>`,
    pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
    aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => { garantirFin(); const v = $('[data-v]', f).value.trim(); if (v === '') delete db.fiado.limites[cid]; else db.fiado.limites[cid] = r2(Math.max(0, num(v))); auditar('fiado-limite', { motivo: `Limite de ${nomeFiado(cid)}: ${v === '' ? 'padrão' : din(num(v))}` }); grava(); fechar(); toast('Limite salvo'); }; } });
});

// ---------------- fluxo de caixa
TELAS_MAIS.fluxo = (per) => {
  garantirFin();
  const P = periodo(per || '30'), r = fluxo(P.de, P.ate), pr = projecao(30), dias = r.dias.slice(-62).reverse();
  const totF = Object.values(r.formas).reduce((s, x) => s + x, 0) || 1, aRec = soma(pr, (x) => x.receber), aPag = soma(pr, (x) => x.pagar);
  const fiadoAberto = soma(clientesFiado(), (x) => Math.max(0, x.saldo));
  return volta('mais', 'Fluxo de caixa', `${P.rot}${CONTA ? '' : ' · dados de exemplo'}`) + filtroPeriodo('fluxo', P) + `
    <section class="kpis"><div><small>Entradas</small><b>${dinCurto(r.entradas)}</b><span>vendas recebidas, fiado e contas</span></div><div><small>Saídas</small><b>${dinCurto(r.saidas)}</b><span>contas pagas e sangrias</span></div>
      <div class="${r.saldo < 0 ? 'fin-alerta' : ''}"><small>Saldo do período</small><b>${dinCurto(r.saldo)}</b><span>entradas − saídas</span></div><div><small>Próximos 30 dias</small><b>${dinCurto(aRec - aPag)}</b><span>${dinCurto(aRec)} a receber · ${dinCurto(aPag)} a pagar</span></div></section>
    <section class="bloco"><div class="sec-tit"><h2>Por dia</h2><span>o fiado vendido entra quando o cliente paga</span></div>
      <div class="tabela-rolo"><table class="tabela fin-fluxo"><thead><tr><th>Dia</th><th class="num">Vendas</th><th class="num">Fiado recebido</th><th class="num">Contas recebidas</th><th class="num">Contas pagas</th><th class="num">Sangrias</th><th class="num">Saldo do dia</th><th class="num">Acumulado</th></tr></thead><tbody>
      ${dias.map((d) => `<tr class="${d.entradas || d.saidas ? '' : 'off'}"><td>${new Date(`${d.dia}T12:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</td><td class="num">${d.vendas ? dinCurto(d.vendas) : ''}</td><td class="num">${d.fiado ? dinCurto(d.fiado) : ''}</td><td class="num">${d.receber ? dinCurto(d.receber) : ''}</td>
        <td class="num">${d.pagar ? `<span class="erro">−${dinCurto(d.pagar)}</span>` : ''}</td><td class="num">${d.sangria ? `−${dinCurto(d.sangria)}` : ''}</td><td class="num"><b class="${d.saldo < 0 ? 'erro' : ''}">${dinCurto(d.saldo)}</b></td><td class="num">${dinCurto(d.acum)}</td></tr>`).join('')}</tbody></table></div></section>
    <div class="duas"><section class="bloco"><div class="sec-tit"><h2>Vendas recebidas por forma</h2></div>${Object.entries(r.formas).sort((a, b) => b[1] - a[1]).map(([f, v]) => `<div class="prop valor"><span>${t(f)}</span><i style="width:${(v / totF) * 100}%"></i><b>${dinCurto(v)}</b></div>`).join('') || '<div class="vazio">Sem vendas no período.</div>'}</section>
      <section class="bloco"><div class="sec-tit"><h2>Próximos 30 dias</h2><span>contas em aberto${fiadoAberto ? ` · fiado a receber ${dinCurto(fiadoAberto)}` : ''}</span></div>
        <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Dia</th><th class="num">A receber</th><th class="num">A pagar</th><th class="num">Acumulado</th></tr></thead><tbody>
        ${pr.map((x) => `<tr class="${x.dia === 'atraso' ? 'fin-atraso' : ''}"><td>${x.dia === 'atraso' ? '<b>Em atraso</b>' : dataCurta(x.dia)}</td><td class="num">${x.receber ? dinCurto(x.receber) : ''}</td><td class="num">${x.pagar ? `<span class="erro">−${dinCurto(x.pagar)}</span>` : ''}</td><td class="num"><b class="${x.acum < 0 ? 'erro' : ''}">${dinCurto(x.acum)}</b></td></tr>`).join('') || '<tr><td colspan="4" class="vazio">Nenhuma conta em aberto nos próximos 30 dias.</td></tr>'}</tbody></table></div>
        <p class="mudo"><a href="#mais/contas">Ver as contas</a></p></section></div>`;
};
MONTAR.fluxo = ligaPeriodo;

// ---------------- DRE gerencial
TELAS_MAIS.dre = (per) => {
  garantirFin();
  const P = periodo(per || 'mes'), d = dre(P.de, P.ate), F = finCfg(), pc = (v) => (d.liquida ? `${vir(Math.round((v / d.liquida) * 1000) / 10)}%` : '');
  const linha = (rot, v, cls = '', sinal = '−') => `<div class="${cls}"><span>${rot}</span><b>${v ? `${sinal === '−' ? '− ' : ''}${din(v)}` : din(0)}</b><small>${cls.includes('sub') || sinal !== '−' ? '' : pc(v)}</small></div>`;
  return volta('mais', 'DRE gerencial', `${P.rot}${CONTA ? '' : ' · dados de exemplo'}`) + filtroPeriodo('dre', P) + `
    <p class="aviso ouro">${ico('alerta')}Estimativa gerencial, não substitui a contabilidade.</p>
    <section class="kpis"><div><small>Receita líquida</small><b>${dinCurto(d.liquida)}</b><span>${d.vendas} vendas</span></div><div><small>CMV teórico</small><b>${d.liquida ? vir(Math.round((d.cmv / d.liquida) * 1000) / 10) : 0}%</b><span>${dinCurto(d.cmv)}</span></div>
      <div><small>Despesas pagas</small><b>${dinCurto(d.despesas)}</b><span>sem compras de fornecedor</span></div><div class="${d.resultado < 0 ? 'fin-alerta' : ''}"><small>Resultado</small><b>${dinCurto(d.resultado)}</b><span>margem ${vir(d.margem)}%</span></div></section>
    <section class="bloco"><div class="resumo cartao-resumo fin-dre">
      ${linha('Receita bruta', d.bruta, 'sub', '+')}
      ${linha('Descontos', d.descontos)}${linha('Cancelamentos e estornos', d.cancelamentos)}
      ${linha('Receita líquida', d.liquida, 'total sub', '+')}
      ${linha(`Comissão dos garçons (${d.comissao}% do serviço de ${dinCurto(d.servico)})`, d.repasse)}
      ${linha('CMV teórico (ficha técnica × preço de compra)', d.cmv)}
      ${linha(`Taxas de cartão e Pix (débito ${vir(F.taxas.debito)}%, crédito ${vir(F.taxas.credito)}%, Pix ${vir(F.taxas.pix)}%)`, d.taxas)}
      ${CATEGORIAS_PAGAR.filter(([k]) => d.desp[k]).map(([k, n]) => linha(`Despesa: ${n}`, d.desp[k])).join('') || linha('Despesas (nenhuma conta paga no período)', 0)}
      ${d.consumo ? linha(`Consumo interno e cortesias (custo; ${Object.entries(d.consumoTipo).map(([k, v]) => `${t(k).toLowerCase()} ${dinCurto(v)}`).join(', ')})`, d.consumo) : ''}
      ${linha('Resultado operacional', d.resultado, `total sub ${d.resultado < 0 ? 'fin-neg' : ''}`, '+')}
      <div class="fin-margem"><span>Margem operacional</span><b class="${d.margem < 0 ? 'erro' : 'ok-txt'}">${vir(d.margem)}%</b></div></div>
      <p class="mudo">Despesas são as contas a pagar quitadas no período. Pagamentos a fornecedor não entram aqui: o custo das mercadorias já está no CMV. Consumo interno e cortesias entram pelo custo, separados das vendas. Sem perdas de estoque, impostos sobre a venda e depreciação, a não ser que estejam lançados como conta.</p></section>
    <form class="form bloco-form" data-taxas><h2>Taxas das maquininhas e do Pix</h2><div class="tres-c"><label class="campo"><span>Débito (%)</span><input name="debito" inputmode="decimal" value="${vir(F.taxas.debito)}"></label><label class="campo"><span>Crédito (%)</span><input name="credito" inputmode="decimal" value="${vir(F.taxas.credito)}"></label><label class="campo"><span>Pix (%)</span><input name="pix" inputmode="decimal" value="${vir(F.taxas.pix)}"></label></div><button class="bt">Salvar taxas</button></form>`;
};
MONTAR.dre = (el) => {
  ligaPeriodo(el);
  const f = $('[data-taxas]', el); if (f) f.onsubmit = (e) => { e.preventDefault(); const cl = (v) => r2(Math.max(0, Math.min(30, num(v)))); setFin({ taxas: { debito: cl(f.debito.value), credito: cl(f.credito.value), pix: cl(f.pix.value) } }); toast('Taxas salvas'); };
};

// ---------------- preço e margem por canal
TELAS_MAIS.margens = () => {
  const F = finCfg(), l = db.produtos.filter((p) => p.preco > 0);
  const cats = db.categorias.filter((k) => l.some((p) => p.cat === k.id));
  const cel = (v, pct) => `${dinCurto(v)} · <b class="${pct < 55 ? 'erro' : ''}">${vir(Math.round(pct))}%</b>`;
  return volta('mais', 'Margem por canal', 'Quanto sobra de cada prato no salão e no delivery, pela ficha técnica') + `
    <form class="form bloco-form" data-canal><h2>Custos do delivery</h2><div class="duas-c"><label class="campo"><span>Embalagem por pedido de 1 prato (R$)</span><input name="emb" inputmode="decimal" value="${dec2(F.delivery.embalagem)}"></label><label class="campo"><span>Comissão do app de entrega (%)</span><input name="com" inputmode="decimal" value="${vir(F.delivery.comissao)}"></label></div><button class="bt">Salvar</button></form>
    ${cats.map((k) => `<section class="bloco"><div class="sec-tit"><h2>${t(k.nome)}</h2></div><div class="tabela-rolo"><table class="tabela fin-canal"><thead><tr><th>Prato</th><th class="num">Preço</th><th class="num">Custo</th><th class="num">Salão</th><th class="num">Delivery</th><th class="num">No delivery, para a mesma margem</th></tr></thead><tbody>
    ${l.filter((p) => p.cat === k.id).map((p) => { const m = margemCanal(p, F); return `<tr><td><b>${t(p.nome)}</b>${p.porKg ? '<small>por kg</small>' : ''}</td><td class="num">${dinCurto(m.preco)}</td><td class="num">${m.custo ? dinCurto(m.custo) : '<small class="mudo">sem ficha</small>'}</td><td class="num">${cel(m.salao, m.pctS)}</td><td class="num">${cel(m.delivery, m.pctD)}</td><td class="num">${m.precoIgual ? `<b>${dinCurto(m.precoIgual)}</b>${m.precoIgual > m.preco + 0.009 ? `<small>+${dinCurto(m.precoIgual - m.preco)}</small>` : ''}` : ''}</td></tr>`; }).join('')}</tbody></table></div></section>`).join('') || '<div class="vazio">Cadastre os pratos com preço e ficha técnica para ver as margens.</div>'}
    <p class="mudo">Salão: preço − custo dos insumos. Delivery: também tira a embalagem e a comissão do app. Abaixo de 55% fica em vermelho.</p>`;
};
MONTAR.margens = (el) => {
  const f = $('[data-canal]', el); if (f) f.onsubmit = (e) => { e.preventDefault(); setFin({ delivery: { embalagem: r2(Math.max(0, num(f.emb.value))), comissao: r2(Math.max(0, Math.min(60, num(f.com.value)))) } }); toast('Custos do delivery salvos'); };
};

// ------------------------------------------------------------------ conciliação: o que devia cair × o que caiu, por dia e forma
export const GRUPOS_PG = [['dinheiro', 'Dinheiro'], ['pix', 'Pix'], ['debito', 'Débito'], ['credito', 'Crédito'], ['app', 'App de delivery'], ['outros', 'Outras formas']];
export const grupoForma = (f) => (aPrazo(f) ? null : /ifood|rappi|aiqfome|99 ?food|\bapp\b/i.test(f) ? 'app' : /d[ée]bito/i.test(f) ? 'debito' : /cr[ée]dito|cart[aã]o/i.test(f) ? 'credito' : /pix/i.test(f) ? 'pix' : /dinheiro/i.test(f) ? 'dinheiro' : 'outros');
// vendas do dia por grupo: bruto, taxa (maquininha, Pix ou comissão do app) e o esperado = bruto − taxa
export function esperadoDia(dia, F = finCfg()) {
  const de = tsDia(dia) - 12 * 36e5, ate = de + DIA, g = {};
  db.vendas.filter((v) => !v.cancelado && v.ts >= de && v.ts < ate).forEach((v) => pagamentosVenda(v).forEach((p) => { const k = grupoForma(p.forma); if (!k) return; (g[k] ||= { bruto: 0, taxa: 0 }).bruto += Number(p.valor) || 0; }));
  Object.entries(g).forEach(([k, x]) => { const pct = k === 'app' ? Number(F.delivery.comissao) || 0 : k === 'debito' ? F.taxas.debito : k === 'credito' ? F.taxas.credito : k === 'pix' ? F.taxas.pix : 0; x.bruto = r2(x.bruto); x.taxa = r2(x.bruto * pct / 100); x.esperado = r2(x.bruto - x.taxa); });
  return g;
}
export const conciliacaoDia = (dia) => (db.conciliacao || {})[dia] || null;
export function conferirDia(dia, inf, ok = true) {
  db.conciliacao ||= {};
  const e = esperadoDia(dia), dif = r2(Object.keys(e).reduce((s, k) => s + ((inf[k] ?? e[k].esperado) - e[k].esperado), 0));
  db.conciliacao[dia] = { inf: Object.fromEntries(Object.entries(inf).map(([k, v]) => [k, r2(v)])), ok: ok ? Date.now() : 0, quem: quemAgora(), dif };
  if (ok) auditar('conciliacao', { valor: dif, motivo: `Conferido o dia ${dataCurta(dia)}${dif ? ` com diferença de ${din(dif)}` : ''}` });
  grava(); return dif;
}
// por dia: esperado, informado (o que a pessoa disse que caiu; sem informar, conta o esperado só depois de conferido)
export function linhasConciliacao(de, ate) {
  const l = [];
  for (let d = new Date(de); d.getTime() < ate; d.setDate(d.getDate() + 1)) {
    const dia = ymd(d.getTime()), e = esperadoDia(dia), ks = Object.keys(e); if (!ks.length) continue;
    const c = conciliacaoDia(dia), esp = soma(ks, (k) => e[k].esperado), inf = c ? soma(ks, (k) => c.inf?.[k] ?? e[k].esperado) : 0;
    l.push({ dia, e, c, bruto: soma(ks, (k) => e[k].bruto), taxa: soma(ks, (k) => e[k].taxa), esperado: esp, informado: c ? inf : null, dif: c ? r2(inf - esp) : 0, ok: !!c?.ok });
  }
  return l.reverse();
}
// dias passados (até 7 para trás) com venda e sem conferência
export const conciliacaoPendente = (dias = 7) => { const hoje = ymd(); return linhasConciliacao(tsDia(somaDias(hoje, -dias)) - 12 * 36e5, tsDia(hoje) - 12 * 36e5).filter((x) => !x.ok); };

TELAS_MAIS.conciliacao = (per) => {
  garantirFin();
  const P = periodo(per || '7'), l = linhasConciliacao(P.de, P.ate), hoje = ymd(), pend = l.filter((x) => !x.ok && x.dia < hoje);
  const difs = l.filter((x) => x.ok && Math.abs(x.dif) > 0.009), porG = {};
  l.forEach((x) => Object.entries(x.e).forEach(([k, v]) => { const g = (porG[k] ||= { esperado: 0, informado: 0, conf: 0 }); g.esperado += v.esperado; if (x.ok) { g.conf += v.esperado; g.informado += x.c.inf?.[k] ?? v.esperado; } }));
  const st = (x) => (x.ok ? (Math.abs(x.dif) > 0.009 ? pill('vencida', `Diferença ${x.dif > 0 ? '+' : '−'}${dinCurto(Math.abs(x.dif))}`) : pill('ok', 'Conferido')) : x.dia === hoje ? pill('aberta', 'Dia em andamento') : pill('hoje', 'A conferir'));
  return volta('mais', 'Conciliação', `${P.rot} · o que devia cair na conta (vendas − taxas) × o que caiu de fato`) + filtroPeriodo('conciliacao', P) + `
    <section class="kpis"><div class="${pend.length ? 'fin-alerta' : ''}"><small>Dias a conferir</small><b>${pend.length}</b><span>sem contar hoje</span></div><div><small>Esperado</small><b>${dinCurto(soma(l, (x) => x.esperado))}</b><span>já sem as taxas</span></div>
      <div><small>Taxas do período</small><b>${dinCurto(soma(l, (x) => x.taxa))}</b><span>maquininha, Pix e app</span></div><div class="${difs.length ? 'fin-alerta' : ''}"><small>Diferenças</small><b>${dinCurto(soma(difs, (x) => x.dif))}</b><span>${difs.length} ${difs.length === 1 ? 'dia' : 'dias'} com diferença</span></div></section>
    <section class="bloco"><div class="sec-tit"><h2>Por dia</h2><span>toque em Conferir e informe o que caiu em cada forma</span></div><div class="tabela-rolo"><table class="tabela r4-conc"><thead><tr><th>Dia</th><th class="num">Vendas</th><th class="num">Esperado</th><th class="num">Recebido</th><th>Situação</th><th></th></tr></thead><tbody>
    ${l.map((x) => `<tr class="${x.ok ? '' : x.dia < hoje ? 'fin-atraso' : ''}"><td>${new Date(`${x.dia}T12:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</td><td class="num">${dinCurto(x.bruto)}</td><td class="num">${dinCurto(x.esperado)}</td><td class="num">${x.informado == null ? '' : `<b>${dinCurto(x.informado)}</b>`}</td><td>${st(x)}</td>
      <td class="acoes"><button type="button" class="bt pq ${!x.ok && x.dia < hoje ? 'cheio' : ''}" data-acao="fin-conciliar" data-dia="${x.dia}">${x.ok ? 'Ver' : 'Conferir'}</button></td></tr>`).join('') || '<tr><td colspan="6" class="vazio">Sem vendas no período.</td></tr>'}</tbody></table></div></section>
    <section class="bloco"><div class="sec-tit"><h2>Por forma de pagamento</h2><span>nos dias conferidos</span></div><div class="tabela-rolo"><table class="tabela"><thead><tr><th>Forma</th><th class="num">Esperado</th><th class="num">Conferido</th><th class="num">Recebido</th><th class="num">Diferença</th></tr></thead><tbody>
    ${GRUPOS_PG.filter(([k]) => porG[k]).map(([k, nm]) => { const g = porG[k], d = r2(g.informado - g.conf); return `<tr><td><b>${nm}</b></td><td class="num">${dinCurto(g.esperado)}</td><td class="num">${dinCurto(g.conf)}</td><td class="num">${dinCurto(g.informado)}</td><td class="num"><b class="${Math.abs(d) > 0.009 ? 'erro' : 'ok-txt'}">${d > 0 ? '+' : ''}${dinCurto(d)}</b></td></tr>`; }).join('') || '<tr><td colspan="5" class="vazio">Sem vendas no período.</td></tr>'}</tbody></table></div>
    <p class="mudo">Taxas usadas: débito ${vir(finCfg().taxas.debito)}%, crédito ${vir(finCfg().taxas.credito)}%, Pix ${vir(finCfg().taxas.pix)}%, app ${vir(finCfg().delivery.comissao)}%. Ajuste em <a href="#mais/dre">DRE</a> e em <a href="#mais/margens">Margem por canal</a>.</p></section>`;
};
MONTAR.conciliacao = ligaPeriodo;
acao('fin-conciliar', (b) => {
  const dia = b.dataset.dia, e = esperadoDia(dia), c = conciliacaoDia(dia), ks = GRUPOS_PG.filter(([k]) => e[k]);
  folha({ titulo: `Conferir ${new Date(`${dia}T12:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}`, larga: true, corpo: `<p class="mudo">Informe quanto caiu de fato em cada forma (extrato do banco, da maquininha e do app). Em branco conta o esperado.</p>
    <ul class="r4-concf">${ks.map(([k, nm]) => `<li><div><b>${nm}</b><small>vendas ${dinCurto(e[k].bruto)}${e[k].taxa ? ` − taxa ${dinCurto(e[k].taxa)}` : ''} = esperado <b>${dinCurto(e[k].esperado)}</b></small></div><label class="campo"><span>Recebido</span><input data-g="${k}" inputmode="decimal" value="${c?.inf?.[k] != null ? dec2(c.inf[k]) : ''}" placeholder="${dec2(e[k].esperado)}"></label><b class="r4-dif" data-d="${k}"></b></li>`).join('')}</ul>
    <button type="button" class="link" data-tudo>Preencher tudo com o esperado</button>
    <div class="resumo"><div><span>Esperado</span><b>${din(soma(ks, ([k]) => e[k].esperado))}</b></div><div class="total"><span>Diferença</span><b data-tot></b></div></div>
    ${c?.ok ? `<p class="mudo">Conferido por ${t(c.quem || '')} em ${new Date(c.ok).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.</p>` : ''}`,
  pe: '<button type="button" class="bt" data-salvar>Só salvar</button><button type="button" class="bt cheio" data-ok>Conferir o dia</button>',
  aoAbrir: (f, fechar) => {
    const ler = () => Object.fromEntries($$('[data-g]', f).map((x) => [x.dataset.g, x.value.trim() === '' ? e[x.dataset.g].esperado : num(x.value)]));
    const calc = () => { const inf = ler(); let tot = 0; Object.entries(inf).forEach(([k, v]) => { const d = r2(v - e[k].esperado); tot += d; const el = $(`[data-d="${k}"]`, f); el.textContent = Math.abs(d) < 0.01 ? 'ok' : `${d > 0 ? '+' : '−'}${dinCurto(Math.abs(d))}`; el.className = `r4-dif ${Math.abs(d) < 0.01 ? 'ok-txt' : 'erro'}`; }); $('[data-tot]', f).textContent = din(r2(tot)); };
    f.addEventListener('input', calc); calc();
    $('[data-tudo]', f).onclick = () => { $$('[data-g]', f).forEach((x) => { x.value = dec2(e[x.dataset.g].esperado); }); calc(); };
    $('[data-salvar]', f).onclick = () => { conferirDia(dia, ler(), false); fechar(); toast('Valores salvos'); };
    $('[data-ok]', f).onclick = () => { const d = conferirDia(dia, ler(), true); fechar(); toast(Math.abs(d) < 0.01 ? 'Dia conferido, tudo bateu' : `Dia conferido com diferença de ${din(d)}`); };
  } });
});

// ------------------------------------------------------------------ demonstração: fornecedores, compras, contas e fiado (uma vez)
export function semearFinanceiro() {
  if (!db.exemplo || db.fornecedores) return false;
  garantirFin();
  const hoje = ymd(), d = (n) => somaDias(hoje, n), ts = (n, h = 10) => new Date(`${d(n)}T${String(h).padStart(2, '0')}:00`).getTime();
  db.fornecedores.push(
    { id: 'fo1', nome: 'Frigorífico Boi Bravo', doc: '12.345.678/0001-90', tel: '16991112233', prazo: 1, obs: 'Entrega de terça a sábado, até as 9h' },
    { id: 'fo2', nome: 'Hortifruti Ferraz', doc: '', tel: '16993216540', prazo: 1, obs: 'Pedido até as 18h chega no outro dia' },
    { id: 'fo3', nome: 'Laticínios Serra Azul', doc: '23.456.789/0001-01', tel: '16994567812', prazo: 2, obs: '' },
    { id: 'fo4', nome: 'Distribuidora Central', doc: '34.567.890/0001-12', tel: '1633221100', prazo: 3, obs: 'Pedido mínimo R$ 300 · boleto' });
  Object.entries({ fo1: ['carne', 'frango', 'bacon', 'calabresa', 'presunto'], fo2: ['tomate', 'cebola', 'alface'], fo3: ['queijo', 'ovo', 'leite_cond'], fo4: ['arroz', 'feijao', 'batata', 'refri', 'cerveja', 'suco', 'pao', 'chocolate'] })
    .forEach(([f, ids]) => ids.forEach((id) => { const i = insumo(id); if (i) i.fornecedor = f; }));
  const nota = (id, fo, dd, itens, frete, status) => ({ id, fornecedor: fo, data: d(dd), itens: itens.map(([insumo, qtd, total, rec]) => ({ insumo, qtd, total, recebido: rec ?? qtd })), frete, obs: '', status, criado: ts(dd, 9), recebidaEm: ts(dd, 11), quem: 'Bruna' });
  db.notasCompra.push(
    nota('nc1', 'fo1', -28, [['carne', 10, 629], ['frango', 8, 191.2], ['bacon', 3, 116.7]], 0, 'recebida'),
    nota('nc2', 'fo4', -21, [['arroz', 25, 150], ['feijao', 10, 85], ['cerveja', 4, 504], ['refri', 3, 96]], 25, 'recebida'),
    nota('nc3', 'fo3', -14, [['queijo', 10, 419], ['ovo', 2, 42]], 0, 'recebida'),
    nota('nc4', 'fo1', -9, [['carne', 8, 519.2], ['frango', 6, 149.4]], 0, 'recebida'),
    nota('nc5', 'fo2', -5, [['tomate', 6, 47.4], ['cebola', 5, 27], ['alface', 12, 42]], 0, 'recebida'),
    nota('nc6', 'fo4', -2, [['batata', 10, 175, 10], ['cerveja', 2, 258, 0]], 0, 'parcial'));
  const pg = (valor, dd, forma = 'Pix') => ({ id: uid('pg'), valor, data: d(dd), forma, ts: ts(dd, 15), quem: 'Bruna' });
  const conta = (o) => { const c = { tipo: 'pagar', categoria: 'outros', pagamentos: [], recorrente: false, criado: ts(-30), ...o }; db.contas.push(c); return c; };
  const nn = (id) => db.notasCompra.find((n) => n.id === id);
  [['nc1', 'Pix'], ['nc2', 'Boleto'], ['nc3', 'Pix'], ['nc5', 'Dinheiro']].forEach(([id, forma], k) => { const n = nn(id), v = totalNota(n); n.contas = [`ctc${k}`]; conta({ id: `ctc${k}`, desc: `Compra de ${fornecedor(n.fornecedor).nome}`, categoria: 'fornecedor', valor: v, venc: n.data, fornecedor: n.fornecedor, compra: n.id, pagamentos: [{ ...pg(v, 0, forma), data: n.data }] }); });
  const n4 = nn('nc4'), [p1, p2] = partes(totalNota(n4), 2); n4.contas = ['ctp1', 'ctp2'];
  conta({ id: 'ctp1', desc: 'Compra de Frigorífico Boi Bravo · 1/2', categoria: 'fornecedor', valor: p1, venc: d(6), fornecedor: 'fo1', compra: 'nc4', parcela: '1/2' });
  conta({ id: 'ctp2', desc: 'Compra de Frigorífico Boi Bravo · 2/2', categoria: 'fornecedor', valor: p2, venc: d(21), fornecedor: 'fo1', compra: 'nc4', parcela: '2/2' });
  nn('nc6').contas = ['ctb6']; conta({ id: 'ctb6', desc: 'Compra de Distribuidora Central', categoria: 'fornecedor', valor: totalNota(nn('nc6')), venc: d(26), fornecedor: 'fo4', compra: 'nc6', obs: 'Boleto 28 dias' });
  const alVenc = d(6), alAntes = somaMes(alVenc, -1), alDias = Math.round((tsDia(alAntes) - tsDia(hoje)) / DIA);
  conta({ id: 'al1', desc: 'Aluguel do salão', categoria: 'aluguel', valor: 4500, venc: alAntes, recorrente: true, proxima: 'al2', pagamentos: [pg(4500, alDias, 'Transferência')] });
  conta({ id: 'al2', desc: 'Aluguel do salão', categoria: 'aluguel', valor: 4500, venc: alVenc, recorrente: true });
  conta({ id: 'en1', desc: 'Conta de energia', categoria: 'energia', valor: 1286.4, venc: d(-3), obs: 'Ligar para negociar se atrasar mais' });
  conta({ id: 'ag1', desc: 'Conta de água', categoria: 'agua', valor: 312.8, venc: d(-8), pagamentos: [pg(312.8, -8, 'Débito automático')] });
  conta({ id: 'in1', desc: 'Internet fibra', categoria: 'internet', valor: 149.9, venc: d(12), recorrente: true });
  conta({ id: 'sa1', desc: 'Folha de pagamento', categoria: 'salarios', valor: 9800, venc: d(-10), pagamentos: [pg(9800, -10, 'Transferência')] });
  conta({ id: 'im1', desc: 'Simples Nacional', categoria: 'impostos', valor: 2140, venc: d(4) });
  conta({ id: 'ma1', desc: 'Limpeza da coifa', categoria: 'manutencao', valor: 380, venc: d(-16), pagamentos: [pg(380, -16, 'Pix')] });
  conta({ id: 'mk1', desc: 'Anúncio no Instagram', categoria: 'marketing', valor: 200, venc: d(-12), pagamentos: [pg(200, -12, 'Cartão')] });
  conta({ id: 'rc1', tipo: 'receber', desc: 'Evento da Laura · sinal', categoria: 'eventos', valor: 450, venc: d(-4), pagamentos: [pg(450, -4, 'Pix')] });
  conta({ id: 'rc2', tipo: 'receber', desc: 'Evento da Laura · saldo', categoria: 'eventos', valor: 449, venc: d(5) });
  const fd = (cid, nome, tipo, valor, dd, extra = {}) => db.fiado.lanc.push({ id: uid('fd'), cliente: cid, nome, tel: cid.slice(1), tipo, valor, ts: ts(dd, 20), quem: 'Bruna', ...extra });
  fd('t16991234567', 'Patrícia Lima', 'compra', 86.4, -12, { onde: 'Balcão #12' }); fd('t16991234567', 'Patrícia Lima', 'compra', 54.9, -6, { onde: 'Delivery #31' }); fd('t16991234567', 'Patrícia Lima', 'receb', 60, -3, { forma: 'Pix' });
  fd('t16997776655', 'Fernanda Rocha', 'compra', 142.7, -4, { onde: 'Mesa 5' }); fd('t16997776655', 'Fernanda Rocha', 'compra', 39.8, -1, { onde: 'Balcão #38' });
  db.fiado.limites.t16997776655 = 200;
  db.config.fin = { taxas: { debito: 1.99, credito: 3.49, pix: 0 }, delivery: { embalagem: 2.5, comissao: 12 }, limiteFiado: 300 };
  grava(); return true;
}
semearFinanceiro();
gerarRecorrentes();
// "Recomeçar a demonstração" troca o db inteiro: semeia de novo quando os dados novos chegarem; as contas do mês seguinte aparecem sozinhas
ouvir(() => { if (db.exemplo && !db.fornecedores) semearFinanceiro(); if (db.contas) gerarRecorrentes(); });
