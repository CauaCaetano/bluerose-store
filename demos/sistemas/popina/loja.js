// Popina · o estado do restaurante e as regras (enviar para a cozinha, baixar estoque, fechar conta, caixa).
// Guarda no aparelho (localStorage) e avisa as outras abas na hora (BroadcastChannel). Na conta real, a mesma
// interface (window.popinaNuvem) troca isso pela nuvem com tempo real entre os aparelhos.
import { estadoInicial, estadoVazio } from './dados.js?v=11';
import { precoTam, nomeItem, opcaoReal } from './opcoes.js?v=11';

export const CHAVE = 'popina-v1';
// conta real: conta-nuvem.js (carregado antes) troca a chave pela da empresa e sobe cada alteração para a nuvem
export const CONTA = window.veltriaConta || null;
// identidade deste aparelho (para as baixas de estoque não se sobrescreverem entre aparelhos)
export const APARELHO = (() => { try { let d = localStorage.getItem('popina-aparelho'); if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem('popina-aparelho', d); } return d; } catch { return 'x'; } })();
export const ESPACO = CONTA?.espaco || '';
const canal = 'BroadcastChannel' in window ? new BroadcastChannel('popina') : null;
let ouvintes = [];
export let db = carregar();

function carregar() {
  try { const d = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (d && d.versao === 1 && (CONTA || d.exemplo === 3)) return d; /* a conta real nunca é trocada pelo exemplo */ } catch { /* sem acesso */ }
  const d = CONTA ? estadoVazio(CONTA.empresa || 'Meu restaurante') : estadoInicial();
  try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch { /* sem acesso */ }
  return d;
}
export function recomecar() { if (CONTA) return; db = estadoInicial(); grava(); }
export function ouvir(f) { ouvintes.push(f); return () => { ouvintes = ouvintes.filter((x) => x !== f); }; }
let agendado = 0;
export function grava(origemOutraAba = false) {
  if (!origemOutraAba) {
    try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { /* cheio ou sem acesso */ }
    canal?.postMessage({ t: Date.now() });
    window.popinaNuvem?.salvar?.(db);
  }
  cancelAnimationFrame(agendado); agendado = requestAnimationFrame(() => ouvintes.forEach((f) => f()));
}
// outra aba (ou outro aparelho, pela nuvem) mudou: recarrega e redesenha
function recarregar() { try { const d = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (d) db = d; } catch { /* nada */ } grava(true); }
canal?.addEventListener('message', recarregar);
// a nuvem trouxe alterações de outro aparelho (conta-nuvem.js já juntou e gravou): redesenha sem recarregar a página
window.veltriaAoVivo = recarregar;
addEventListener('storage', (e) => { if (e.key === CHAVE) recarregar(); });
export function substituir(novo) { db = novo; grava(true); try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { /* nada */ } }

// ------------------------------------------------------------------ utilidades
export const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const din = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dinCurto = (v) => `R$ ${(Math.round((Number(v) || 0) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const t = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
export function tempo(ts, agora = Date.now()) {
  const m = Math.max(0, Math.round((agora - ts) / 60e3));
  return m < 1 ? 'agora' : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
}
export const minutos = (ts, agora = Date.now()) => Math.max(0, (agora - ts) / 60e3);
export const prod = (id) => db.produtos.find((p) => p.id === id);
export const insumo = (id) => db.insumos.find((i) => i.id === id);
export const comanda = (id) => db.comandas.find((c) => c.id === id);
export const comandaDaMesa = (n) => db.comandas.find((c) => c.tipo === 'mesa' && c.mesa === n);

// ------------------------------------------------------------------ valores da conta
export const valorItem = (i) => r2(i.qtd * (i.preco + (i.adic || []).reduce((s, a) => s + a.preco, 0)));
export const itensValidos = (c) => c.itens.filter((i) => !i.cancelado);
export function conta(c) {
  const sub = r2(itensValidos(c).reduce((s, i) => s + valorItem(i), 0));
  const servico = c.tipo === 'mesa' && c.servico ? r2(sub * (db.config.servico || 0) / 100) : 0;
  const entrega = c.tipo === 'delivery' ? r2(c.taxaEntrega || 0) : 0;
  const desconto = r2(c.desconto || 0);
  const total = r2(Math.max(0, sub + servico + entrega - desconto));
  const pago = r2((c.pagamentos || []).reduce((s, p) => s + p.valor, 0));
  return { sub, servico, entrega, desconto, total, pago, falta: r2(Math.max(0, total - pago)) };
}

// ------------------------------------------------------------------ comandas
export function abrirMesa(n, pessoas = 2, garcom = '') {
  let c = comandaDaMesa(n); if (c) return c;
  c = { id: uid('m'), tipo: 'mesa', mesa: n, pessoas, aberta: Date.now(), garcom, itens: [], pagamentos: [], servico: true };
  db.comandas.push(c); grava(); return c;
}
export function novoPedido(tipo, cliente = {}, extra = {}) {
  const c = { id: uid(tipo[0]), tipo, num: db.numPedido++, aberta: Date.now(), cliente, itens: [], pagamentos: [], servico: false, taxaEntrega: 0, ...(tipo === 'delivery' ? { entrega: 'novo' } : {}), ...extra };
  if (tipo === 'delivery' && cliente.bairro) c.taxaEntrega = db.bairros.find((b) => b.nome === cliente.bairro)?.taxa || 0;
  db.comandas.push(c); grava(); return c;
}
// item ainda não enviado (rascunho do garçom) -> status 'rascunho'
export function adicionarItem(c, { prodId, qtd = 1, obs = '', adic = [], meia = null, kg = 0, tam = '' }) {
  const p = prod(prodId); if (!p) return;
  const tm = tam && p.tamanhos?.length ? p.tamanhos.find((x) => x.nome === tam) : null;
  let nome = nomeItem(p, { tam: tm?.nome }), preco = precoTam(p, tm?.nome);
  // por quilo: o prato pesado vira 1 item com o valor do peso (o estoque baixa a ficha × kg)
  if (p.porKg && kg > 0) { nome = `${p.nome} · ${kg.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`; preco = r2(p.preco * kg); qtd = 1; }
  if (meia) { const b = prod(meia.b); if (b) { nome = nomeItem(p, { tam: tm?.nome, meia }, b); preco = Math.max(precoTam(p, tm?.nome), precoTam(b, tm?.nome)); } }
  c.itens.push({ id: uid('i'), prod: prodId, nome, qtd, preco: r2(preco), setor: p.setor, obs, adic, meia, status: 'rascunho', ...(p.porKg && kg > 0 ? { kg } : {}), ...(tm ? { tam: tm.nome, fator: Number(tm.fator) || 1 } : {}) });
  grava();
}
// envia os rascunhos para a cozinha/bar e baixa o estoque pela ficha técnica
export function enviar(c) {
  const agora = Date.now(); let n = 0;
  c.itens.filter((i) => i.status === 'rascunho').forEach((i) => { i.status = 'novo'; i.enviado = agora; n++; baixar(i, 1); });
  if (n) grava(); return n;
}
function fichaDoItem(i) {
  if (i.meia) { // meia a meia: metade da ficha de cada sabor (massa e molho contam uma vez)
    const a = prod(i.meia.a)?.ficha || [], b = prod(i.meia.b)?.ficha || [], m = {};
    [...a, ...b].forEach((f) => { m[f.insumo] = (m[f.insumo] || 0) + f.qtd / 2; });
    return Object.entries(m).map(([insumo, qtd]) => ({ insumo, qtd }));
  }
  return prod(i.prod)?.ficha || [];
}
// sinal: 1 baixa, -1 devolve (item cancelado antes de preparar)
function baixar(i, sinal) {
  const fator = (i.kg || i.qtd) * (i.fator || 1); fichaDoItem(i).forEach((f) => { const ins = insumo(f.insumo); if (ins) { const k = `${ins.geracao || 0}:${APARELHO}`; ins.baixas = ins.baixas || {}; ins.baixas[k] = r2((ins.baixas[k] || 0) + sinal * f.qtd * fator); } });
}
// venda no balcão do caixa (restaurante a quilo, bebida, sobremesa): já sai entregue, sem ir para a cozinha
export function venderDireto(c) {
  const agora = Date.now(); let n = 0;
  c.itens.filter((i) => i.status === 'rascunho').forEach((i) => { i.status = 'entregue'; i.enviado = agora; n++; baixar(i, 1); });
  if (n) grava(); return n;
}
export function mudarStatus(c, item, status) {
  item.status = status; if (status === 'pronto') item.pronto = Date.now();
  if (status === 'preparo') item.inicio = Date.now();
  if (status === 'pronto') item.pronto = Date.now();
  if (status === 'entregue') item.entregue = Date.now();
  grava();
}
export function cancelarItem(c, item, motivo = '') {
  if (item.status === 'rascunho') { c.itens = c.itens.filter((x) => x !== item); grava(); return; }
  if (item.status === 'novo') baixar(item, -1); // ainda não foi para a panela: volta para o estoque
  item.cancelado = { motivo, ts: Date.now() }; grava();
}
export function transferir(c, novaMesa) {
  if (comandaDaMesa(novaMesa)) return false;
  c.mesa = novaMesa; grava(); return true;
}
// pagamento parcial ou total; quando o total foi pago, a conta fecha e vira venda
export function pagar(c, forma, valor, extra = {}) {
  // conta já fechada em outro aparelho: não cobra de novo
  if (!db.comandas.includes(c)) return false;
  c.pagamentos.push({ id: uid('pg'), forma, valor: r2(valor), ts: Date.now(), ...extra }); grava();
  if (conta(c).falta <= 0.009) fechar(c);
}
export function fechar(c) {
  if (!db.comandas.includes(c)) return false;
  const v = conta(c);
  db.vendas.push({ id: db.vendas.some((x) => x.id === c.id) ? `${c.id}-${Date.now().toString(36)}` : c.id, ts: Date.now(), tipo: c.tipo, mesa: c.mesa, num: c.num, itens: itensValidos(c).map((i) => ({ prod: i.prod, nome: i.nome, qtd: i.qtd, preco: valorItem(i) / i.qtd })),
    total: v.total, servico: v.servico, entrega: v.entrega, desconto: v.desconto, pagamentos: c.pagamentos, forma: c.pagamentos.length === 1 ? c.pagamentos[0].forma : 'Dividido', cancelados: c.itens.filter((i) => i.cancelado).length, garcom: c.garcom || '', entregador: c.entregador || '', cupom: c.cupom || '', cliente: c.cliente?.tel ? String(c.cliente.tel).replace(/\D/g, '') : '' });
  if (c.tipo !== 'mesa') registrarCliente(c, v.total);
  db.comandas = db.comandas.filter((x) => x !== c);
  db.chamados = db.chamados.filter((x) => x.mesa !== c.mesa || c.tipo !== 'mesa');
  grava();
}
// dividir por pessoas: valor de cada parte (a última leva os centavos que sobram)
export function partes(total, n) {
  const base = Math.floor((total / n) * 100) / 100; const ult = r2(total - base * (n - 1));
  return Array.from({ length: n }, (_, k) => (k === n - 1 ? ult : base));
}

// ------------------------------------------------------------------ fila do garçom (o que fazer agora)
export function fila(garcom = '') {
  const l = [], agora = Date.now();
  db.comandas.filter((c) => c.tipo === 'mesa' && c.pediuConta).forEach((c) => l.push({ tipo: 'conta', c, ts: c.pediuConta, prioridade: 3 }));
  db.chamados.filter((x) => !x.atendido).forEach((x) => l.push({ tipo: 'chamou', x, c: comandaDaMesa(x.mesa), ts: x.ts, prioridade: 2 }));
  db.comandas.forEach((c) => {
    const prontos = c.itens.filter((i) => i.status === 'pronto' && !i.cancelado);
    if (prontos.length) l.push({ tipo: 'pronto', c, itens: prontos, ts: Math.min(...prontos.map((i) => i.pronto || agora)), prioridade: 2.5 });
  });
  db.pedidosQR.forEach((q) => l.push({ tipo: 'qr', q, ts: q.ts, prioridade: 2.8 }));
  return l.sort((a, b) => b.prioridade - a.prioridade || a.ts - b.ts);
}
export function estadoMesa(n) {
  const c = comandaDaMesa(n);
  if (!c) return db.pedidosQR.some((q) => q.mesa === n) ? 'qr' : 'livre';
  if (c.pediuConta) return 'conta';
  if (c.itens.some((i) => i.status === 'pronto' && !i.cancelado)) return 'pronto';
  if (db.chamados.some((x) => x.mesa === n && !x.atendido)) return 'chamou';
  return 'ocupada';
}
export function atenderChamado(x) { x.atendido = Date.now(); db.chamados = db.chamados.filter((y) => !y.atendido); grava(); }
export function confirmarQR(q) {
  const c = abrirMesa(q.mesa, 2, '');
  q.itens.forEach((i) => adicionarItem(c, { prodId: i.prod, qtd: i.qtd, obs: i.obs, adic: i.adic || [], meia: i.meia || null, tam: i.tam || '' }));
  db.pedidosQR = db.pedidosQR.filter((x) => x !== q);
  enviar(c); return c;
}
export function recusarQR(q) { db.pedidosQR = db.pedidosQR.filter((x) => x !== q); grava(); }

// ------------------------------------------------------------------ caixa do dia
export function caixaResumo() {
  const ini = db.caixa?.aberto || 0; const vendas = db.vendas.filter((v) => v.ts >= ini && !v.cancelado);
  const porForma = {};
  vendas.forEach((v) => (v.pagamentos?.length ? v.pagamentos : [{ forma: v.forma, valor: v.total }]).forEach((p) => { porForma[p.forma] = r2((porForma[p.forma] || 0) + p.valor); }));
  const mov = db.caixa?.movimentos || [];
  const sangria = r2(mov.filter((m) => m.tipo === 'sangria').reduce((s, m) => s + m.valor, 0));
  const suprimento = r2(mov.filter((m) => m.tipo === 'suprimento').reduce((s, m) => s + m.valor, 0));
  const dinheiro = r2((db.caixa?.troco || 0) + (porForma.Dinheiro || 0) - sangria + suprimento);
  return { vendas, total: r2(vendas.reduce((s, v) => s + v.total, 0)), porForma, sangria, suprimento, dinheiroNaGaveta: dinheiro, servico: r2(vendas.reduce((s, v) => s + (v.servico || 0), 0)) };
}
export function abrirCaixa(troco, operador) { db.caixa = { aberto: Date.now(), troco: r2(troco), movimentos: [], operador }; grava(); }
export function movimento(tipo, valor, motivo) { db.caixa.movimentos.push({ tipo, valor: r2(valor), motivo, ts: Date.now() }); grava(); }
export function fecharCaixa(contado, motivo = '', quem = '') {
  const r = caixaResumo(); (db.fechamentos ||= []).push({ ...db.caixa, fechado: Date.now(), fechadoPor: quem, motivo, abertas: db.comandas.map((c) => c.id), resumo: { total: r.total, porForma: r.porForma, gaveta: r.dinheiroNaGaveta, contado: r2(contado), diferenca: r2(contado - r.dinheiroNaGaveta) } });
  db.caixa = null; grava(); return r;
}

// ------------------------------------------------------------------ estoque
// saldo = contagem atual − baixas desta contagem (chave 'geração:aparelho'; baixas antigas sem geração contam na 0)
export const saldo = (i) => r2((i.estoque || 0) - Object.entries(i.baixas || {}).reduce((s, [k, v]) => s + ((k.includes(':') ? Number(k.split(':')[0]) : 0) === (i.geracao || 0) ? v : 0), 0));
export const estoqueBaixo = () => db.insumos.filter((i) => saldo(i) <= i.minimo);
export function custoPrato(p) {
  return r2((p.ficha || []).reduce((s, f) => { const i = insumo(f.insumo); return s + (i ? (f.qtd / i.fator) * i.custo : 0); }, 0));
}
export function entradaCompra(insumoId, qtdCompra, custo) {
  const i = insumo(insumoId); if (!i) return;
  i.estoque = r2(i.estoque + qtdCompra * i.fator); if (custo) i.custo = r2(custo);
  (db.compras ||= []).push({ insumo: insumoId, qtd: qtdCompra, custo, ts: Date.now() }); grava();
}
export const fmtQtd = (q, unid) => unid === 'g' && Math.abs(q) >= 1000 ? `${(q / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`
  : unid === 'ml' && Math.abs(q) >= 1000 ? `${(q / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L`
    : `${Number(q).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unid}`;

// ------------------------------------------------------------------ cardápio online (conta real)
// endereço do cardápio do cliente: na conta real leva o restaurante (r=); na demonstração, o exemplo deste aparelho
export function linkCardapio(extra = '') {
  const u = window.popinaPlano === 'marca' && ESPACO ? new URL('/cardapio/', location.href) : new URL('cardapio.html', location.href); u.search = '';
  if (ESPACO) u.searchParams.set('r', ESPACO);
  new URLSearchParams(extra).forEach((v, k) => u.searchParams.set(k, v));
  return u.href;
}
// o que o cliente mandou é conferido de novo aqui: preço, adicionais e sabores vêm sempre do cardápio do restaurante
function itensLimpos(itens) {
  return (Array.isArray(itens) ? itens : []).map((i) => {
    const p = prod(i?.prod); if (!p || p.porKg || p.ativo === false) return null; // prato por quilo só no balcão, pesado
    const qtd = Math.min(30, Math.max(1, Math.round(Number(i.qtd) || 1)));
    const adic = (Array.isArray(i.adic) ? i.adic : []).map((a) => opcaoReal(p, a?.nome)).filter(Boolean);
    const tam = p.tamanhos?.some((x) => x.nome === i.tam) ? i.tam : '';
    const b = i.meia && prod(i.meia.b); const meia = p.pizza && b?.pizza ? { a: p.id, b: b.id } : null;
    return { prod: p.id, qtd, obs: String(i.obs || '').slice(0, 160), adic, meia, tam };
  }).filter(Boolean);
}
window.popinaChegou = (lista) => {
  let novos = 0;
  lista.forEach((r) => {
    const d = r.dados || {}, ts = Date.parse(r.criado) || Date.now(), id = 'w' + r.id;
    if (r.tipo === 'mesa') {
      const itens = itensLimpos(d.itens); if (!itens.length || db.pedidosQR.some((x) => x.id === id)) return;
      db.pedidosQR.push({ id, mesa: r.mesa, ts, nome: `Mesa ${r.mesa} (QR)`, itens }); novos++;
    } else if (r.tipo === 'chamado') {
      if (!db.chamados.some((x) => x.mesa === r.mesa && !x.atendido)) { db.chamados.push({ id, mesa: r.mesa, tipo: 'garcom', ts, origem: 'QR' }); novos++; }
    } else if (r.tipo === 'conta') {
      const c = comandaDaMesa(r.mesa); if (c && !c.pediuConta) { c.pediuConta = ts; novos++; }
    } else if (r.tipo === 'delivery' || r.tipo === 'balcao') {
      const itens = itensLimpos(d.itens); if (!itens.length) return;
      if (comanda(id)) return;
      const c = novoPedido(r.tipo, { nome: String(d.nome || '').slice(0, 80), tel: String(d.tel || ''), end: r.tipo === 'delivery' ? String(d.end || '').slice(0, 160) : '', bairro: r.tipo === 'delivery' ? String(d.bairro || '') : '' },
        { origem: 'Cardápio online', pagarNaEntrega: String(d.pagar || '').slice(0, 60), id });
      itens.forEach((i) => adicionarItem(c, { prodId: i.prod, qtd: i.qtd, obs: i.obs, adic: i.adic, meia: i.meia, tam: i.tam }));
      if (d.cupom) aplicarCupom(c, String(d.cupom).slice(0, 24)); // o restaurante confere o cupom de novo com as regras dele
      novos++;
    }
  });
  if (novos) { grava(); dispatchEvent(new CustomEvent('popina-chegou', { detail: novos })); }
};

// ------------------------------------------------------------------ loja: a cara do restaurante e as regras do cardápio online
export const LOJA_PADRAO = {
  cor: '#B4532F', tema: 'claro', template: 'taverna', estilo: 'rustico', creditos: true, logo: '', capa: '', boasVindas: '', endereco: '', instagram: '', aviso: '',
  // horários por dia da semana (0 = domingo): lista de turnos [abre, fecha]; fecha depois da meia-noite vale ("18:00", "01:00")
  horarios: [[['11:00', '15:00']], [], [['11:00', '15:00'], ['18:00', '23:00']], [['11:00', '15:00'], ['18:00', '23:00']], [['11:00', '15:00'], ['18:00', '23:00']], [['11:00', '15:00'], ['18:00', '23:59']], [['11:00', '15:30'], ['18:00', '23:59']]],
  aceitaQR: true, delivery: true, retirada: true, pedidoMinimo: 0, tempoEntrega: '40 a 60 min', tempoRetirada: '20 a 30 min',
  pagamentos: ['Pix', 'Cartão na entrega', 'Dinheiro'], areas: [], couvert: 0, comissao: 10,
};
export const lojaCfg = () => ({ ...LOJA_PADRAO, ...(db.config.loja || {}) });
export function setLoja(parcial) { db.config.loja = { ...lojaCfg(), ...parcial }; grava(); }
// nome da mesa conforme a área (Varanda 3, Salão 7...) ou só o número
export function nomeMesa(n) {
  const a = lojaCfg().areas.find((x) => n >= x.de && n <= x.ate);
  return a ? `${a.nome} · ${n}` : `Mesa ${n}`;
}

// ------------------------------------------------------------------ clientes do delivery e do balcão (pelo telefone)
const soDig = (s) => String(s || '').replace(/\D/g, '');
export const clientePorTel = (tel) => { const d = soDig(tel); return d.length >= 10 ? (db.clientes || []).find((x) => x.id === 't' + d) : null; };
export function registrarCliente(c, total) {
  const d = soDig(c.cliente?.tel); if (d.length < 10) return;
  db.clientes ||= [];
  let x = db.clientes.find((y) => y.id === 't' + d);
  if (!x) { x = { id: 't' + d, tel: d, nome: '', pedidos: 0, total: 0, primeiro: Date.now() }; db.clientes.push(x); }
  Object.assign(x, { nome: c.cliente.nome || x.nome, ...(c.cliente.end ? { end: c.cliente.end, bairro: c.cliente.bairro } : {}), pedidos: x.pedidos + 1, total: r2(x.total + total), ultimo: Date.now() });
}

// ------------------------------------------------------------------ cupons (cardápio online e balcão)
export function validarCupom(codigo, subtotal, agora = Date.now()) {
  const cp = (db.cupons || []).find((x) => x.codigo.toUpperCase() === String(codigo || '').trim().toUpperCase());
  if (!cp || !cp.ativo) return { erro: 'Cupom não encontrado.' };
  if (cp.ate && agora > Date.parse(cp.ate + 'T23:59:59')) return { erro: 'Este cupom venceu.' };
  if (cp.limite && (cp.usos || 0) >= cp.limite) return { erro: 'Este cupom já foi usado o máximo de vezes.' };
  if (subtotal < (cp.minimo || 0)) return { erro: `Vale para pedidos a partir de ${din(cp.minimo)}.` };
  const desconto = r2(cp.tipo === '%' ? subtotal * cp.valor / 100 : Math.min(cp.valor, subtotal));
  return { cupom: cp, desconto };
}
export function aplicarCupom(c, codigo) {
  const v = validarCupom(codigo, conta(c).sub); if (v.erro) return v;
  c.cupom = v.cupom.codigo; c.desconto = v.desconto; v.cupom.usos = (v.cupom.usos || 0) + 1; grava(); return v;
}

// ------------------------------------------------------------------ entregadores (saída e acerto do dia)
export function acertoEntregadores(desde) {
  const r = {};
  db.vendas.filter((v) => v.ts >= desde && v.entregador).forEach((v) => { (r[v.entregador] ||= { entregas: 0, taxas: 0 }); r[v.entregador].entregas++; r[v.entregador].taxas = r2(r[v.entregador].taxas + (v.entrega || 0)); });
  return r;
}
