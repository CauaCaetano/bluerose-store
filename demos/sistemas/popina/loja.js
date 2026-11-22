// Popina · o estado do restaurante e as regras (lançar, mandar para a cozinha, fechar conta, caixa, estoque, fiado).
// Guarda no aparelho (localStorage, chave popina-v1) e avisa as outras abas na hora (BroadcastChannel). Na conta real,
// conta-nuvem.js troca a chave pela da empresa e sobe cada alteração para a nuvem.
// COMPATIBILIDADE: os dados do Popina antigo abrem aqui sem perder nada. Os campos das funções que saíram (rodízio, eventos,
// portaria, vitrine, cupons, reservas, produção...) continuam guardados como estão: esta versão só não os mostra.
// Nada aqui apaga campo antigo; tudo é alterado no lugar.
import { estadoInicial, estadoVazio, EXEMPLO } from './dados.js?v=52';

export const CHAVE = 'popina-v1';
export const CONTA = window.veltriaConta || null;
export const ESPACO = CONTA?.espaco || '';
// identidade deste aparelho (as baixas de estoque de cada aparelho não se sobrescrevem na fusão da nuvem)
export const APARELHO = (() => { try { let d = localStorage.getItem('popina-aparelho'); if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem('popina-aparelho', d); } return d; } catch { return 'x'; } })();
const canal = 'BroadcastChannel' in window ? new BroadcastChannel('popina') : null;
let ouvintes = [];
export let db = carregar();

function carregar() {
  try {
    const d = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    // a conta real nunca é trocada pelo exemplo; a demonstração antiga recebe o exemplo novo
    if (d && d.versao === 1 && (CONTA || d.exemplo === EXEMPLO)) return completar(d);
  } catch { /* sem acesso */ }
  const d = CONTA ? estadoVazio(CONTA.empresa || 'Meu restaurante') : estadoInicial();
  try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch { /* sem acesso */ }
  return completar(d);
}
// só acrescenta o que falta (nunca tira nem troca o que já existe)
function completar(d) {
  d.config ||= {}; d.config.loja ||= {};
  for (const k of ['produtos', 'categorias', 'insumos', 'bairros', 'comandas', 'chamados', 'pedidosQR', 'vendas', 'clientes', 'entregadores']) if (!Array.isArray(d[k])) d[k] = [];
  if (!(d.numPedido > 0)) d.numPedido = 1;
  return d;
}
export function recomecar() { if (CONTA) return; db = completar(estadoInicial()); grava(); }
export function ouvir(f) { ouvintes.push(f); return () => { ouvintes = ouvintes.filter((x) => x !== f); }; }
let agendado = 0;
export function grava(origemOutraAba = false) {
  if (!origemOutraAba) {
    try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { /* cheio ou sem acesso */ }
    canal?.postMessage({ t: Date.now() });
  }
  cancelAnimationFrame(agendado); agendado = requestAnimationFrame(() => ouvintes.forEach((f) => f()));
  if (document.hidden) ouvintes.forEach((f) => f()); // aba escondida: requestAnimationFrame não roda
}
function recarregar() { try { const d = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (d) db = completar(d); } catch { /* nada */ } grava(true); }
canal?.addEventListener('message', recarregar);
window.veltriaAoVivo = recarregar; // a nuvem trouxe alterações de outro aparelho
addEventListener('storage', (e) => { if (e.key === CHAVE) recarregar(); });

// ------------------------------------------------------------------ utilidades
export const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const din = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const t = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
export const soDig = (s) => String(s || '').replace(/\D/g, '');
export const num = (v) => { const s = String(v ?? '').trim(); return Number(/,/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s) || 0; };
export const vir = (n) => (n === '' || n == null ? '' : String(n).replace('.', ','));
export const ymd = (ts = Date.now()) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const hora = (ts) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const inicioDoDia = (ts = Date.now()) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
export function tempo(ts, agora = Date.now()) {
  const m = Math.max(0, Math.round((agora - ts) / 60e3));
  return m < 1 ? 'agora' : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
}
export const minutos = (ts, agora = Date.now()) => Math.max(0, (agora - ts) / 60e3);
export const fone = (tel) => { const d = soDig(tel); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d; };
// link do WhatsApp (o número ganha o 55 do Brasil quando vier só com DDD)
export const zap = (tel, txt) => { let d = soDig(tel); if (d && d.length <= 11) d = '55' + d; return `https://wa.me/${d}?text=${encodeURIComponent(txt)}`; };
export const prod = (id) => db.produtos.find((p) => p.id === id);
export const insumo = (id) => db.insumos.find((i) => i.id === id);
export const comanda = (id) => db.comandas.find((c) => c.id === id);
export const comandaDaMesa = (n) => db.comandas.find((c) => c.tipo === 'mesa' && c.mesa === n);
export const ativos = () => db.produtos.filter((p) => p.ativo !== false);

// ------------------------------------------------------------------ o restaurante: a cara e as regras
export const LOJA_PADRAO = {
  cor: '#6B2737', logo: '', capa: '', boasVindas: '', endereco: '', instagram: '', aviso: '',
  // horários por dia da semana (0 = domingo): lista de turnos [abre, fecha]
  horarios: [[['11:00', '15:00']], [], [['11:00', '15:00'], ['18:00', '23:00']], [['11:00', '15:00'], ['18:00', '23:00']], [['11:00', '15:00'], ['18:00', '23:00']], [['11:00', '15:00'], ['18:00', '23:59']], [['11:00', '15:30'], ['18:00', '23:59']]],
  aceitaQR: true, delivery: true, retirada: true, pedidoMinimo: 0, tempoEntrega: '40 a 60 min', tempoRetirada: '20 a 30 min',
  pagamentos: ['Pix', 'Cartão na entrega', 'Dinheiro'], couvert: 0,
};
export const lojaCfg = () => ({ ...LOJA_PADRAO, ...(db.config.loja || {}) });
export function setLoja(parcial) { db.config.loja = { ...(db.config.loja || {}), ...parcial }; grava(); }
export const nomeMesa = (n) => `Mesa ${n}`;
// 22/11/2026: o laranja/telha saiu da paleta. As cores antigas que vinham do esquema "Taberna"/"Brasa" viram o padrão novo
// só na tela (o valor guardado não muda: quem escolher outra cor depois, grava por cima).
export const COR_PADRAO = '#6B2737';
const CORES_ANTIGAS = ['#b4532f', '#c2410c', '#9a3412', '#1b6b4a']; // 22/11: o verde padrão também vira o vinho novo
export const corLoja = () => { const c = String(lojaCfg().cor || '').toLowerCase(); return /^#[0-9a-f]{6}$/.test(c) && !CORES_ANTIGAS.includes(c) ? c : COR_PADRAO; };

// ------------------------------------------------------------------ valores da conta
const adicDe = (i) => (i.adic || []).reduce((s, a) => s + (Number(a.preco) || 0), 0);
export const valorItem = (i) => r2(i.qtd * (i.preco + adicDe(i)));
export const itensValidos = (c) => (c.itens || []).filter((i) => !i.cancelado);
const SERVICO_EM = ['mesa', 'cartao', 'evento'];
// rodízio, ingresso e consumação mínima são do Popina antigo: só entram se a conta aberta já tiver (nada novo cria isso)
const valorRodizio = (cfg = {}, q = {}) => r2(['adulto', 'crianca', 'meia', 'vegetariano', 'buffet', 'fora'].reduce((s, k) => s + (Number(q[k]) || 0) * (Number(cfg[k]) || 0), 0));
export function conta(c) {
  const L = lojaCfg();
  const sub = r2(itensValidos(c).reduce((s, i) => s + valorItem(i), 0));
  const rodizio = c.rodizio ? valorRodizio(L.rodizio, c.rodizio) : 0;
  const ingresso = r2(c.ingresso?.preco || 0), consumacao = c.consumacao ? r2(Math.max(0, Number(c.consumacao) - sub)) : 0;
  const pctServ = Number(db.config.servico ?? 10) || 0;
  const servico = SERVICO_EM.includes(c.tipo) && c.servico ? r2((sub + rodizio) * pctServ / 100) : 0;
  const couvert = (c.tipo === 'mesa' || c.tipo === 'cartao') && Number(L.couvert) > 0 && c.couvert !== false && !(L.modulos && L.modulos.couvert === false) ? r2(Number(L.couvert) * (c.pessoas || 0)) : 0;
  const entrega = c.tipo === 'delivery' ? r2(c.taxaEntrega || 0) : 0;
  const perdido = c.tipo === 'cartao' && c.perdido ? r2(Number(L.taxaCartaoPerdido) || 0) : 0;
  const desconto = r2(c.desconto || 0);
  const total = r2(Math.max(0, sub + rodizio + ingresso + consumacao + servico + couvert + entrega + perdido - desconto));
  const pago = r2((c.pagamentos || []).reduce((s, p) => s + (Number(p.valor) || 0), 0));
  return { sub, rodizio, ingresso, consumacao, servico, pctServ, couvert, entrega, perdido, desconto, total, pago, falta: r2(Math.max(0, total - pago)) };
}
export function ondeComanda(c) {
  if (!c) return '';
  if (c.tipo === 'mesa') return `Mesa ${c.mesa}`;
  if (c.tipo === 'cartao') return `Comanda ${c.cartao}${c.naMesa ? ` · mesa ${c.naMesa}` : ''}`;
  if (c.tipo === 'evento') return `Evento ${c.nomeEvento || ''}`.trim();
  if (c.tipo === 'delivery') return `Entrega #${c.num}`;
  return `${c.modo === 'retirada' ? 'Retirada' : 'Balcão'} #${c.num}`;
}
// nome curto para a cozinha e para a lista: mesa, senha ou o nome do cliente
export const quemPediu = (c) => (c.tipo === 'mesa' ? `Mesa ${c.mesa}` : c.cliente?.nome ? c.cliente.nome : ondeComanda(c));
export const tipoNome = (c) => ({ mesa: 'Mesa', delivery: 'Entrega', cartao: 'Comanda', evento: 'Evento' }[c.tipo] || (c.modo === 'retirada' ? 'Retirada' : 'Balcão'));

// ------------------------------------------------------------------ quem fez, histórico da mesa e registro interno
// nome de quem usa este aparelho (garçom ou caixa), escolhido uma vez e guardado no aparelho
export function euSou() { try { return localStorage.getItem('popina-eu') || ''; } catch { return ''; } }
export function setEuSou(n) { try { localStorage.setItem('popina-eu', n); } catch { /* nada */ } }
export function quemAgora(c = null, comPin = false) {
  const q = euSou() || c?.garcom || db.caixa?.operador || 'Equipe';
  return comPin ? `${q} · senha do gerente` : q;
}
export function marcar(c, tipo, txt, quem = quemAgora(c)) {
  (c.hist ||= []).push({ t: Date.now(), tipo, txt, quem });
  if (c.hist.length > 200) c.hist.splice(0, c.hist.length - 200);
}
// registro interno (não tem tela, mas continua guardando as ações sensíveis)
export function auditar(tipo, dados = {}) {
  const a = (db.auditoria ||= []);
  a.push({ id: uid('a'), t: Date.now(), tipo, quem: quemAgora(), ...dados });
  if (a.length > 2000) a.splice(0, a.length - 2000);
}
// senha do gerente (4 números) para cancelar e para desconto acima do limite
export const REGRAS_PADRAO = { pin: '', limiteDesconto: 10 };
export const regras = () => ({ ...REGRAS_PADRAO, ...(db.config.regras || {}) });
export function setRegras(parcial) { db.config.regras = { ...(db.config.regras || {}), ...parcial }; grava(); }
export const temPin = () => /^\d{4}$/.test(regras().pin || '');
export const pinConfere = (p) => !temPin() || String(p || '') === regras().pin;

// ------------------------------------------------------------------ comandas
export function abrirMesa(n, pessoas = 2, garcom = '') {
  let c = comandaDaMesa(n); if (c) return c;
  c = { id: uid('m'), tipo: 'mesa', mesa: n, pessoas, aberta: Date.now(), garcom, itens: [], pagamentos: [], servico: true };
  marcar(c, 'abriu', `Mesa aberta com ${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'}${garcom ? ` · ${garcom}` : ''}`);
  db.comandas.push(c); grava(); return c;
}
// senha do balcão: número do dia, recomeça a cada dia
export function proximaSenha() {
  const d = ymd(); if (db.senha?.dia !== d) db.senha = { dia: d, n: 0 };
  return ++db.senha.n;
}
// tipo: 'balcao' (balcão ou retirada, extra.modo = 'retirada') ou 'delivery'
export function novoPedido(tipo, cliente = {}, extra = {}) {
  const c = { id: uid(tipo[0]), tipo, num: db.numPedido++, aberta: Date.now(), cliente, itens: [], pagamentos: [], servico: false, taxaEntrega: 0,
    ...(tipo === 'delivery' ? { entrega: 'novo' } : { senha: proximaSenha() }), ...extra };
  if (tipo === 'delivery' && cliente.bairro && !extra.taxaEntrega) c.taxaEntrega = db.bairros.find((b) => b.nome === cliente.bairro)?.taxa || 0;
  marcar(c, 'abriu', `${ondeComanda(c)} aberto${cliente.nome ? ` · ${cliente.nome}` : ''}`);
  db.comandas.push(c); grava(); return c;
}
// preço do tamanho escolhido
export const precoTam = (p, tam) => (tam && p.tamanhos?.length ? (Number(p.tamanhos.find((x) => x.nome === tam)?.preco) || p.preco) : p.preco);
export const aPartir = (p) => (p.tamanhos?.length ? Math.min(...p.tamanhos.map((x) => Number(x.preco) || 0)) : Number(p.preco) || 0);
export const nomeCurto = (p) => String(p?.nome || '').replace(/^Pizza (de )?/i, '');
// nome do item na comanda: "Pizza calabresa (Grande)", "Pizza meia calabresa / meia muçarela (Grande)", "Comida por quilo · 0,450 kg"
export function nomeDoItem(p, { tam = '', meia = null, kg = 0 } = {}) {
  if (p.porKg && kg > 0) return `${p.nome} · ${kg.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`;
  const b = meia?.b ? prod(meia.b) : null;
  const base = b ? `${/^pizza/i.test(p.nome) ? 'Pizza ' : ''}meia ${nomeCurto(p).toLowerCase()} / meia ${nomeCurto(b).toLowerCase()}` : p.nome;
  return tam ? `${base} (${tam})` : base;
}
// rascunho do garçom: fica 'rascunho' até "Mandar para a cozinha"
// opções: tam (tamanho), meia ({ a, b }: meio a meio, cobra o sabor mais caro), kg (venda por quilo), adic ([{ nome, preco }]), obs
export function adicionarItem(c, { prodId, qtd = 1, obs = '', adic = [], meia = null, kg = 0, tam = '' }) {
  const p = prod(prodId); if (!p || !c) return false;
  const tm = tam && p.tamanhos?.length ? p.tamanhos.find((x) => x.nome === tam) : null;
  let preco = precoTam(p, tm?.nome);
  const b = meia?.b && p.pizza ? prod(meia.b) : null;
  if (b) { preco = Math.max(preco, precoTam(b, tm?.nome)); meia = { a: p.id, b: b.id }; } else meia = null;
  if (p.porKg && kg > 0) { preco = r2(p.preco * kg); qtd = 1; }
  // o mesmo item, igualzinho, ainda não mandado: só soma a quantidade (a comanda fica curta)
  const igual = !kg && c.itens.find((i) => i.status === 'rascunho' && i.prod === prodId && (i.tam || '') === (tm?.nome || '') && JSON.stringify(i.meia || null) === JSON.stringify(meia) && (i.obs || '') === (obs || '') && JSON.stringify(i.adic || []) === JSON.stringify(adic || []));
  if (igual) { igual.qtd += qtd; grava(); return true; }
  c.itens.push({ id: uid('i'), prod: prodId, nome: nomeDoItem(p, { tam: tm?.nome, meia, kg }), qtd, preco: r2(preco), setor: p.setor || 'cozinha', obs, adic, meia, status: 'rascunho',
    ...(p.porKg && kg > 0 ? { kg } : {}), ...(tm ? { tam: tm.nome, fator: Number(tm.fator) || 1 } : {}) });
  grava(); return true;
}
// manda os rascunhos para a cozinha e o bar e baixa o estoque (o que o prato tira do estoque)
export function enviar(c) {
  const agora = Date.now(); let n = 0;
  c.itens.filter((i) => i.status === 'rascunho').forEach((i) => { i.status = 'novo'; i.enviado = agora; delete i.segura; n++; baixar(i, 1); });
  if (n) marcar(c, 'enviou', `Mandou ${n} ${n === 1 ? 'item' : 'itens'} para a cozinha`);
  grava(); return n;
}
// venda direta no caixa (bebida, sobremesa, por quilo): sai entregue, sem passar pela cozinha
export function venderDireto(c) {
  const agora = Date.now(); let n = 0;
  c.itens.filter((i) => i.status === 'rascunho').forEach((i) => { i.status = 'entregue'; i.enviado = agora; i.entregue = agora; n++; baixar(i, 1); });
  if (n) grava(); return n;
}
export function mudarStatus(c, item, status) {
  item.status = status;
  if (status === 'preparo') item.inicio = Date.now();
  if (status === 'pronto') item.pronto = Date.now();
  if (status === 'entregue') item.entregue = Date.now();
  grava();
}
export function cancelarItem(c, item, motivo = '', quem = quemAgora(c)) {
  if (item.status === 'rascunho') { c.itens = c.itens.filter((x) => x !== item); grava(); return; }
  if (item.status === 'novo') baixar(item, -1); // ainda não foi para a panela: volta para o estoque
  item.cancelado = { motivo, ts: Date.now(), quem };
  marcar(c, 'cancelou', `Cancelou ${item.qtd}× ${item.nome}${motivo ? ` (${motivo})` : ''}`, quem);
  auditar('cancelar-item', { quem, mesa: c.mesa, num: c.num, item: item.nome, qtd: item.qtd, valor: valorItem(item), motivo, setor: item.setor, status: item.status });
  grava();
}
export function transferir(c, novaMesa) {
  if (comandaDaMesa(novaMesa)) return false;
  marcar(c, 'trocou', `Trocou da mesa ${c.mesa} para a ${novaMesa}`);
  db.chamados.forEach((x) => { if (x.mesa === c.mesa) x.mesa = novaMesa; });
  c.mesa = novaMesa; grava(); return true;
}
// junta a mesa "origem" nesta: itens, pessoas, pagamentos e histórico vêm junto; a origem fica livre
export function juntarMesas(destino, origem) {
  if (!destino || !origem || destino === origem || !db.comandas.includes(origem)) return false;
  destino.itens.push(...origem.itens);
  destino.pagamentos.push(...(origem.pagamentos || []));
  destino.pessoas = (destino.pessoas || 0) + (origem.pessoas || 0);
  if (origem.desconto) destino.desconto = r2((destino.desconto || 0) + origem.desconto);
  if (origem.pediuConta && !destino.pediuConta) destino.pediuConta = origem.pediuConta;
  destino.hist = [...(destino.hist || []), ...(origem.hist || []).map((h) => ({ ...h, txt: `Mesa ${origem.mesa}: ${h.txt}` }))].sort((a, b) => a.t - b.t);
  marcar(destino, 'juntou', `Juntou a mesa ${origem.mesa} nesta`);
  db.comandas = db.comandas.filter((x) => x !== origem);
  db.chamados = db.chamados.filter((x) => x.mesa !== origem.mesa);
  grava(); return true;
}
// quanto de cada item já foi pago na divisão por item (pagamento com itens: { idDoItem: qtd })
export function pagoPorItem(c) {
  const m = {}; (c.pagamentos || []).forEach((p) => Object.entries(p.itens || {}).forEach(([id, q]) => { m[id] = r2((m[id] || 0) + (Number(q) || 0)); }));
  return m;
}
export const livreDoItem = (c, i, pg = pagoPorItem(c)) => (i.cancelado ? 0 : r2(Math.max(0, i.qtd - (pg[i.id] || 0))));
// valor de uma escolha de itens: o consumo deles + a mesma proporção de 10%, couvert e desconto da conta
export function valorDosItens(c, sel) {
  const v = conta(c);
  const s = Object.entries(sel || {}).reduce((a, [id, q]) => { const i = c.itens.find((x) => x.id === id && !x.cancelado); return i && i.qtd > 0 ? a + valorItem(i) / i.qtd * Math.min(Number(q) || 0, i.qtd) : a; }, 0);
  return r2(Math.min(v.falta, v.sub ? s * (v.total / v.sub) : s));
}
// passa itens (ou parte da quantidade) para outra mesa; abre a mesa se estiver livre; a mesa de origem fecha se ficar vazia e sem pagamento
export function moverItens(origem, mesa, sel) {
  mesa = Number(mesa);
  if (!origem || !db.comandas.includes(origem) || !mesa || origem.mesa === mesa) return false;
  const pg = pagoPorItem(origem);
  const lista = Object.entries(sel || {}).map(([id, q]) => [origem.itens.find((i) => i.id === id && !i.cancelado), Number(q) || 0])
    .filter(([i, q]) => i && q > 0 && livreDoItem(origem, i, pg) > 0);
  if (!lista.length) return false;
  const destino = comandaDaMesa(mesa) || abrirMesa(mesa, 1, origem.garcom || '');
  const nomes = [];
  lista.forEach(([i, q]) => {
    q = i.kg ? i.qtd : Math.min(q, livreDoItem(origem, i, pg));
    if (q >= i.qtd) { origem.itens = origem.itens.filter((x) => x !== i); destino.itens.push(i); }
    else { i.qtd = r2(i.qtd - q); destino.itens.push({ ...i, id: uid('i'), qtd: q, adic: [...(i.adic || [])] }); }
    nomes.push(`${i.kg ? '' : `${q}× `}${i.nome}`);
  });
  marcar(origem, 'trocou', `Passou para a mesa ${mesa}: ${nomes.join(', ')}`);
  marcar(destino, 'trocou', `Veio da mesa ${origem.mesa}: ${nomes.join(', ')}`);
  if (!origem.itens.length && !(origem.pagamentos || []).length) db.comandas = db.comandas.filter((x) => x !== origem);
  grava(); return destino;
}
// pagamento parcial ou total; quando o total foi pago, a conta fecha e vira venda
export function pagar(c, forma, valor, extra = {}) {
  if (!db.comandas.includes(c)) return false; // fechada em outro aparelho
  c.pagamentos.push({ id: uid('pg'), forma, valor: r2(valor), ts: Date.now(), quem: quemAgora(c), ...extra }); grava();
  if (conta(c).falta <= 0.009) fechar(c);
  return true;
}
// balcão, retirada e entrega pagos antes de terminar: a venda já entra no caixa ("quitado"), mas o pedido continua no quadro
// e na cozinha até alguém tocar em "Entregue". A mesa fecha na hora, como sempre.
export const faltaEntregar = (c) => c.tipo !== 'mesa' && ['balcao', 'delivery'].includes(c.tipo)
  && (c.tipo === 'delivery' ? c.entrega !== 'entregue' : itensValidos(c).some((i) => i.status !== 'entregue'));
export function fechar(c) {
  if (!db.comandas.includes(c) || c.quitado) return false;
  const v = conta(c);
  marcar(c, 'fechou', `Conta fechada · ${din(v.total)}`);
  const vid = db.vendas.some((x) => x.id === c.id) ? `${c.id}-${Date.now().toString(36)}` : c.id;
  if (faltaEntregar(c)) { c.quitado = Date.now(); c.vendaId = vid; }
  db.vendas.push({ id: vid, ts: Date.now(), tipo: c.tipo, mesa: c.mesa, num: c.num,
    itens: itensValidos(c).map((i) => ({ prod: i.prod, nome: i.nome, qtd: i.qtd, preco: r2(valorItem(i) / i.qtd), setor: i.setor, ...(i.kg ? { kg: i.kg } : {}), ...(i.fator ? { fator: i.fator } : {}), ...(i.meia ? { meia: i.meia } : {}) })),
    total: v.total, servico: v.servico, couvert: v.couvert, entrega: v.entrega, desconto: v.desconto, onde: ondeComanda(c),
    ...(v.rodizio ? { rodizio: v.rodizio, rodizioPessoas: c.rodizio } : {}), ...(v.ingresso ? { ingresso: v.ingresso } : {}), ...(v.consumacao ? { consumacao: v.consumacao } : {}),
    pagamentos: c.pagamentos, forma: c.pagamentos.length === 1 ? c.pagamentos[0].forma : 'Dividido', cancelados: c.itens.filter((i) => i.cancelado).length,
    garcom: c.garcom || '', entregador: c.entregador || '', cliente: c.cliente?.tel ? soDig(c.cliente.tel) : '', ...(c.cliente?.nome ? { nomeCliente: c.cliente.nome } : {}),
    pessoas: c.pessoas || 0, servicoOn: !!c.servico, couvertOn: c.couvert !== false, aberta: c.aberta, hist: c.hist || [],
    ...(c.modo ? { modo: c.modo } : {}), ...(c.origem ? { origem: c.origem } : {}),
    ...(v.desconto ? { descontoMotivo: c.descontoInfo?.motivo || '', descontoQuem: c.descontoInfo?.quem || '' } : {}) });
  registrarCliente(c, v.total);
  if (c.quitado) { grava(); return true; }
  db.comandas = db.comandas.filter((x) => x !== c);
  db.chamados = db.chamados.filter((x) => x.mesa !== c.mesa || c.tipo !== 'mesa');
  grava(); return true;
}

// ------------------------------------------------------------------ quadro de pedidos: aceitar, recusar, pronto e entregue
// pedido do cardápio online que ninguém aceitou ainda (toca até alguém aceitar ou recusar)
export const aguardaAceite = (c) => c.tipo !== 'mesa' && !c.aceito && !c.quitado && c.origem === 'Cardápio online'
  && itensValidos(c).length > 0 && itensValidos(c).every((i) => i.status === 'rascunho');
// em que coluna do quadro o pedido está: novo, preparo ou pronto (os concluídos já são vendas)
export function etapa(c) {
  const it = itensValidos(c);
  if (c.tipo === 'delivery' && ['saiu', 'entregue'].includes(c.entrega)) return 'pronto';
  if (!it.length || it.every((i) => i.status === 'rascunho')) return 'novo';
  if (it.some((i) => ['novo', 'preparo'].includes(i.status))) return 'preparo';
  return 'pronto';
}
export function aceitarPedido(c) {
  if (!db.comandas.includes(c)) return 0;
  c.aceito = Date.now(); if (c.tipo === 'delivery' && (!c.entrega || c.entrega === 'novo')) c.entrega = 'preparo';
  marcar(c, 'aceitou', 'Pedido aceito'); return enviar(c);
}
export const MOTIVOS_RECUSA = ['Acabou um item do pedido', 'Fora da área de entrega', 'Estamos fechando', 'Muito movimento agora', 'Pedido repetido'];
export function recusarPedido(c, motivo = '', quem = quemAgora(c)) {
  if (!db.comandas.includes(c)) return false;
  const total = conta(c).total, ts = Date.now();
  c.itens.forEach((i) => { if (i.cancelado) return; if (i.status === 'novo') baixar(i, -1); i.cancelado = { motivo, ts, quem }; });
  c.recusado = { motivo, ts, quem };
  marcar(c, 'recusou', `Pedido recusado${motivo ? ` (${motivo})` : ''}`, quem);
  const r = (db.recusados ||= []);
  r.push({ id: c.id, ts, num: c.num, tipo: c.tipo, ...(c.modo ? { modo: c.modo } : {}), onde: ondeComanda(c), aberta: c.aberta, origem: c.origem || '', cliente: { nome: c.cliente?.nome || '', tel: c.cliente?.tel || '' }, total, motivo, quem });
  if (r.length > 300) r.splice(0, r.length - 300);
  auditar('recusar-pedido', { quem, num: c.num, valor: total, motivo });
  db.comandas = db.comandas.filter((x) => x !== c);
  grava(); return true;
}
// sem tela da cozinha: o próprio quadro marca tudo como pronto
export function marcarPronto(c) {
  const agora = Date.now(); let n = 0;
  c.itens.forEach((i) => { if (!i.cancelado && ['novo', 'preparo'].includes(i.status)) { i.status = 'pronto'; i.pronto = agora; n++; } });
  if (n) { marcar(c, 'pronto', 'Marcou o pedido como pronto'); grava(); }
  return n;
}
export function saiuEntrega(c, entregador = '') {
  c.entrega = 'saiu'; c.saiu = Date.now(); if (entregador) c.entregador = entregador;
  c.itens.filter((i) => ['pronto', 'novo', 'preparo'].includes(i.status) && !i.cancelado).forEach((i) => { i.status = 'entregue'; i.entregue = Date.now(); });
  const nome = entregador ? (db.entregadores || []).find((e) => e.id === entregador)?.nome || '' : '';
  marcar(c, 'saiu', `Saiu para entrega${nome ? ` com ${nome}` : ''}`);
  if (c.vendaId) { const v = db.vendas.find((x) => x.id === c.vendaId); if (v && entregador) v.entregador = entregador; }
  grava();
}
// "Entregue": tira do quadro. Se ainda falta receber, devolve 'pagar' (a tela leva para fechar a conta).
export function concluirPedido(c) {
  if (!db.comandas.includes(c)) return false;
  const agora = Date.now();
  if (c.tipo === 'delivery') c.entrega = 'entregue';
  c.itens.forEach((i) => { if (!i.cancelado && i.status !== 'entregue') { i.status = 'entregue'; i.entregue = agora; } });
  c.concluido = agora; marcar(c, 'entregou', c.tipo === 'delivery' ? 'Entregue ao cliente' : 'Entregue no balcão');
  if (c.quitado) {
    const v = db.vendas.find((x) => x.id === c.vendaId);
    if (v) { v.entregue = agora; if (c.entregador) v.entregador = c.entregador; v.hist = c.hist || v.hist; }
    db.comandas = db.comandas.filter((x) => x !== c); grava(); return true;
  }
  if (conta(c).falta <= 0.009) return fechar(c);
  grava(); return 'pagar';
}
// loja pausada: o cardápio online mostra "pausado" e não deixa pedir (ate = 0: até alguém voltar)
export function lojaPausada() { const p = lojaCfg().pausada; return p && (!p.ate || p.ate > Date.now()) ? p : null; }
export function pausarLoja(minutos = 0, motivo = '') { setLoja({ pausada: { ts: Date.now(), ate: minutos ? Date.now() + minutos * 60e3 : 0, motivo, quem: quemAgora() } }); auditar('pausar-loja', { motivo, valor: minutos }); }
export function voltarLoja() { setLoja({ pausada: null }); }
export const aceiteAuto = () => !!lojaCfg().aceiteAuto;
// pedido agendado pelo cardápio: aceita ISO ("2026-11-22T19:30"), número (ms) ou só "19:30" (hoje); devolve ms ou 0
export function agendadoDe(v) {
  if (!v) return 0;
  if (typeof v === 'number') return v > 1e12 ? v : 0;
  const s = String(v).trim(), m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (m) { const d = new Date(); d.setHours(Number(m[1]), Number(m[2]), 0, 0); return d.getTime(); }
  const ms = Date.parse(s); return Number.isFinite(ms) ? ms : 0;
}
// cupons do cardápio online (config.loja.cupons): tipo 'pct' (% dos itens), 'valor' (R$) ou 'frete' (entrega grátis)
export const cupons = () => (Array.isArray(lojaCfg().cupons) ? lojaCfg().cupons : []);
export function cupomValido(codigo, subtotal = 0, agora = Date.now()) {
  const cod = String(codigo || '').trim().toUpperCase(); if (!cod) return null;
  const k = cupons().find((x) => String(x.codigo || '').toUpperCase() === cod);
  if (!k || k.ativo === false) return null;
  if (k.validade && agora > new Date(`${k.validade}T23:59:59`).getTime()) return null;
  if (Number(k.limite) > 0 && (Number(k.usos) || 0) >= Number(k.limite)) return null;
  if (Number(k.minimo) > 0 && subtotal < Number(k.minimo) - 0.009) return null;
  return k;
}
export function aplicarCupom(c, codigo) {
  const v = conta(c), k = cupomValido(codigo, v.sub); if (!k) return false;
  if (k.tipo === 'frete') c.taxaEntrega = 0;
  else {
    const d = r2(Math.min(v.sub, k.tipo === 'pct' ? v.sub * (Number(k.valor) || 0) / 100 : Number(k.valor) || 0));
    if (d > 0) { c.desconto = d; c.descontoInfo = { motivo: `Cupom ${k.codigo}`, quem: 'Cardápio online', ts: Date.now() }; }
  }
  c.cupom = k.codigo; k.usos = (Number(k.usos) || 0) + 1;
  marcar(c, 'desconto', `Cupom ${k.codigo}`, 'Cardápio online');
  return true;
}
// dividir por pessoas: valor de cada parte (a última leva os centavos que sobram)
export function partes(total, n) {
  const base = Math.floor((total / n) * 100) / 100; const ult = r2(total - base * (n - 1));
  return Array.from({ length: n }, (_, k) => (k === n - 1 ? ult : base));
}
export function darDesconto(c, valor, motivo = '', quem = quemAgora(c)) {
  const antes = r2(c.desconto || 0); valor = r2(Math.max(0, valor));
  c.desconto = valor; c.descontoInfo = valor ? { motivo, quem, ts: Date.now() } : null;
  if (valor) marcar(c, 'desconto', `Desconto de ${din(valor)}${motivo ? ` (${motivo})` : ''}`, quem);
  else if (antes) marcar(c, 'desconto', 'Tirou o desconto', quem);
  auditar(valor ? 'desconto' : 'desconto-tirado', { quem, mesa: c.mesa, num: c.num, valor: valor || antes, motivo });
  grava();
}
export const vendaDeHoje = (v) => new Date(v.ts).toDateString() === new Date().toDateString();
// cancela (estorna) uma venda fechada: fica marcada, nunca apagada
export function cancelarVenda(v, motivo, quem = quemAgora()) {
  if (!v || v.cancelado) return false;
  v.cancelado = { ts: Date.now(), motivo, quem, estoque: false };
  auditar('estorno', { quem, venda: v.id, mesa: v.mesa, num: v.num, valor: v.total, motivo });
  grava(); return true;
}

// ------------------------------------------------------------------ o que fazer agora (garçom)
export const temPronto = (c) => c.itens.some((i) => i.status === 'pronto' && !i.cancelado);
export function fila() {
  const l = [];
  db.pedidosQR.forEach((q) => l.push({ tipo: 'qr', q, ts: q.ts, p: 4 }));
  db.comandas.filter((c) => c.tipo === 'mesa' && c.pediuConta).forEach((c) => l.push({ tipo: 'conta', c, ts: c.pediuConta, p: 3 }));
  db.chamados.filter((x) => !x.atendido).forEach((x) => l.push({ tipo: 'chamou', x, c: comandaDaMesa(x.mesa), ts: x.ts, p: 2 }));
  db.comandas.forEach((c) => { const pr = c.itens.filter((i) => i.status === 'pronto' && !i.cancelado); if (pr.length) l.push({ tipo: 'pronto', c, itens: pr, ts: Math.min(...pr.map((i) => i.pronto || Date.now())), p: 2.5 }); });
  return l.sort((a, b) => b.p - a.p || a.ts - b.ts);
}
export function estadoMesa(n) {
  const c = comandaDaMesa(n);
  if (!c) return db.pedidosQR.some((q) => q.mesa === n) ? 'qr' : 'livre';
  if (c.pediuConta) return 'conta';
  if (temPronto(c)) return 'pronto';
  if (db.chamados.some((x) => x.mesa === n && !x.atendido)) return 'chamou';
  return 'ocupada';
}
export function atenderChamado(x) { x.atendido = Date.now(); db.chamados = db.chamados.filter((y) => !y.atendido); grava(); }
// pedido que o cliente fez pelo QR da mesa: o garçom confere e manda para a cozinha
export function confirmarQR(q) {
  const c = abrirMesa(q.mesa, 2, euSou());
  q.itens.forEach((i) => adicionarItem(c, { prodId: i.prod, qtd: i.qtd, obs: i.obs, adic: i.adic || [], meia: i.meia || null, tam: i.tam || '' }));
  db.pedidosQR = db.pedidosQR.filter((x) => x !== q);
  enviar(c); return c;
}
export function recusarQR(q) { db.pedidosQR = db.pedidosQR.filter((x) => x !== q); grava(); }

// ------------------------------------------------------------------ caixa do dia
export const pagamentosVenda = (v) => (v.pagamentos?.length ? v.pagamentos : [{ forma: v.forma, valor: v.total }]);
export function caixaResumo(desde = db.caixa?.aberto || inicioDoDia(), ate = Infinity) {
  const vendas = db.vendas.filter((v) => v.ts >= desde && v.ts <= ate && !v.cancelado);
  const porForma = {};
  vendas.forEach((v) => pagamentosVenda(v).forEach((p) => { porForma[p.forma] = r2((porForma[p.forma] || 0) + (Number(p.valor) || 0)); }));
  const mov = (db.caixa?.movimentos || []).filter((m) => m.ts >= desde);
  const sangria = r2(mov.filter((m) => m.tipo === 'sangria').reduce((s, m) => s + m.valor, 0));
  const suprimento = r2(mov.filter((m) => m.tipo === 'suprimento').reduce((s, m) => s + m.valor, 0));
  const dinheiro = r2((db.caixa?.troco || 0) + (porForma.Dinheiro || 0) - sangria + suprimento);
  const fiadoRec = r2((db.fiado?.lanc || []).filter((l) => l.tipo === 'receb' && l.ts >= desde && l.ts <= ate).reduce((s, l) => s + l.valor, 0));
  return { vendas, total: r2(vendas.reduce((s, v) => s + v.total, 0)), porForma, sangria, suprimento, dinheiroNaGaveta: dinheiro, fiadoRec,
    servico: r2(vendas.reduce((s, v) => s + (v.servico || 0), 0)), entregas: r2(vendas.reduce((s, v) => s + (v.entrega || 0), 0)),
    cancelados: db.vendas.filter((v) => v.ts >= desde && v.ts <= ate && v.cancelado).length };
}
export function abrirCaixa(troco, operador) { db.caixa = { aberto: Date.now(), troco: r2(troco), movimentos: [], operador }; auditar('abrir-caixa', { valor: r2(troco) }); grava(); }
export function movimento(tipo, valor, motivo, quem = quemAgora()) {
  db.caixa.movimentos.push({ tipo, valor: r2(valor), motivo, ts: Date.now(), quem });
  auditar(tipo, { quem, valor: r2(valor), motivo }); grava();
}
// conferencia: { 'Cartão de débito': 120.5, Pix: 300 } (o que a maquininha e o extrato mostram), opcional
export function fecharCaixa(contado, motivo = '', quem = quemAgora(), conferencia = null) {
  const r = caixaResumo();
  (db.fechamentos ||= []).push({ ...db.caixa, id: uid('f'), fechado: Date.now(), fechadoPor: quem, motivo, abertas: db.comandas.filter((c) => !c.quitado).map((c) => c.id), ...(conferencia ? { conferencia } : {}),
    resumo: { total: r.total, vendas: r.vendas.length, porForma: r.porForma, sangria: r.sangria, suprimento: r.suprimento, servico: r.servico, gaveta: r.dinheiroNaGaveta, contado: r2(contado), diferenca: r2(contado - r.dinheiroNaGaveta) } });
  if (r2(contado - r.dinheiroNaGaveta)) auditar('caixa-diferenca', { quem, valor: r2(contado - r.dinheiroNaGaveta), motivo });
  db.caixa = null; grava(); return db.fechamentos.at(-1);
}

// ------------------------------------------------------------------ estoque simples
// saldo = contagem atual − baixas desta contagem (chave 'geração:aparelho'; baixas antigas sem geração contam na 0)
export const saldo = (i) => r2((i.estoque || 0) - Object.entries(i.baixas || {}).reduce((s, [k, v]) => s + ((k.includes(':') ? Number(k.split(':')[0]) : 0) === (i.geracao || 0) ? v : 0), 0));
export const estoqueBaixo = () => db.insumos.filter((i) => i.ativo !== false && saldo(i) <= (Number(i.minimo) || 0));
// o que cada item tira do estoque (o "tira do estoque" do prato); meio a meio: metade de cada sabor
function fichaDoItem(i) {
  if (i.meia) {
    const m = {}; [...(prod(i.meia.a)?.ficha || []), ...(prod(i.meia.b)?.ficha || [])].forEach((f) => { m[f.insumo] = (m[f.insumo] || 0) + f.qtd / 2; });
    return Object.entries(m).map(([ins, qtd]) => ({ insumo: ins, qtd }));
  }
  return prod(i.prod)?.ficha || [];
}
function baixar(i, sinal) {
  const fator = (i.kg || i.qtd) * (i.fator || 1);
  fichaDoItem(i).forEach((f) => { const ins = insumo(f.insumo); if (ins) { const k = `${ins.geracao || 0}:${APARELHO}`; ins.baixas ||= {}; ins.baixas[k] = r2((ins.baixas[k] || 0) + sinal * f.qtd * fator); } });
}
export function entradaCompra(insumoId, qtdCompra, custo) {
  const i = insumo(insumoId); if (!i) return;
  i.estoque = r2((i.estoque || 0) + qtdCompra * (i.fator || 1)); if (custo) i.custo = r2(custo);
  (db.compras ||= []).push({ insumo: insumoId, qtd: qtdCompra, custo, ts: Date.now() });
  registrarMov(i, 'entrada', qtdCompra * (i.fator || 1), 'Compra', quemAgora()); grava();
}
export const MOTIVOS_PERDA = ['Venceu', 'Quebrou', 'Caiu no chão', 'Consumo da equipe', 'Outro'];
function registrarMov(i, tipo, qtd, motivo, quem) {
  const m = { id: uid('e'), t: Date.now(), insumo: i.id, tipo, qtd: r2(qtd), motivo, quem, custo: r2((qtd / (i.fator || 1)) * (i.custo || 0)) };
  (db.movEstoque ||= []).push(m); if (db.movEstoque.length > 5000) db.movEstoque.splice(0, db.movEstoque.length - 5000);
  return m;
}
export function registrarPerda(insumoId, qtd, motivo, quem = quemAgora()) {
  const i = insumo(insumoId); if (!i || !(qtd > 0)) return;
  const k = `${i.geracao || 0}:${APARELHO}`; i.baixas ||= {}; i.baixas[k] = r2((i.baixas[k] || 0) + qtd);
  const m = registrarMov(i, 'perda', -qtd, motivo, quem);
  auditar('perda', { quem, item: i.nome, qtd, valor: -m.custo, motivo }); grava();
}
// contagem (inventário): o contado vira o saldo novo e a diferença fica registrada
export function ajustarEstoque(insumoId, contado, motivo = 'Contagem', quem = quemAgora()) {
  const i = insumo(insumoId); if (!i) return 0;
  const dif = r2(contado - saldo(i)); if (!dif) return 0;
  registrarMov(i, 'ajuste', dif, motivo, quem);
  i.estoque = r2(contado); i.geracao = Date.now(); grava(); return dif;
}
// quantidade na unidade de uso; g e ml grandes aparecem em kg e L
export const fmtQtd = (q, unid) => (unid === 'g' && Math.abs(q) >= 1000 ? `${(q / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`
  : unid === 'ml' && Math.abs(q) >= 1000 ? `${(q / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L`
    : `${Number(q).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unid || 'un'}`);

// ------------------------------------------------------------------ clientes, fiado e entregadores
export const clientePorTel = (tel) => { const d = soDig(tel); return d.length >= 10 ? (db.clientes || []).find((x) => x.id === 't' + d) : null; };
export function registrarCliente(c, total) {
  const d = soDig(c.cliente?.tel); if (d.length < 10) return;
  let x = db.clientes.find((y) => y.id === 't' + d);
  if (!x) { x = { id: 't' + d, tel: d, nome: '', pedidos: 0, total: 0, primeiro: Date.now() }; db.clientes.push(x); }
  Object.assign(x, { nome: c.cliente.nome || x.nome, ...(c.cliente.end ? { end: c.cliente.end, bairro: c.cliente.bairro } : {}), pedidos: (x.pedidos || 0) + 1, total: r2((x.total || 0) + total), ultimo: Date.now() });
}
export const FORMA_FIADO = 'Fiado (conta do cliente)';
const garantirFiado = () => { db.fiado ||= {}; db.fiado.lanc ||= []; db.fiado.limites ||= {}; };
export const limitePadraoFiado = () => Number(db.config.fin?.limiteFiado ?? 300) || 0;
export const saldoFiado = (cid) => { garantirFiado(); return r2(db.fiado.lanc.filter((l) => l.cliente === cid).reduce((s, l) => s + (l.tipo === 'compra' ? l.valor : -l.valor), 0)); };
export const limiteFiado = (cid) => { garantirFiado(); const x = db.fiado.limites[cid]; return x != null ? Number(x) : limitePadraoFiado(); };
export const nomeFiado = (cid) => clientePorTel(cid.slice(1))?.nome || [...(db.fiado?.lanc || [])].reverse().find((l) => l.cliente === cid && l.nome)?.nome || '';
export function registrarFiado(venda, cliente, valor) {
  garantirFiado();
  const d = soDig(cliente?.tel), nome = String(cliente?.nome || '').trim().slice(0, 80);
  if (d.length < 10) return { erro: 'Escreva o telefone do cliente com DDD' };
  if (nome.length < 2) return { erro: 'Escreva o nome do cliente' };
  valor = r2(valor); if (!(valor > 0)) return { erro: 'Valor inválido' };
  const cid = 't' + d, s = saldoFiado(cid), lim = limiteFiado(cid);
  if (lim > 0 && s + valor > lim + 0.009) return { erro: `Passa do limite de ${din(lim)} (já deve ${din(s)})` };
  db.fiado.lanc.push({ id: uid('fd'), cliente: cid, nome, tel: d, tipo: 'compra', valor, ts: Date.now(), onde: venda ? ondeComanda(venda) : '', comanda: venda?.id || '', quem: quemAgora(venda) });
  if (!db.clientes.some((x) => x.id === cid)) db.clientes.push({ id: cid, tel: d, nome, pedidos: 0, total: 0, primeiro: Date.now() });
  auditar('fiado', { valor, motivo: `Fiado de ${nome}`, mesa: venda?.mesa, num: venda?.num });
  grava(); return { ok: true, cid, saldo: r2(s + valor), limite: lim };
}
export function receberFiado(cid, valor, forma = 'Dinheiro') {
  garantirFiado();
  valor = r2(Math.min(Number(valor) || 0, saldoFiado(cid))); if (!(valor > 0)) return 0;
  const gaveta = forma === 'Dinheiro' && !!db.caixa;
  db.fiado.lanc.push({ id: uid('fd'), cliente: cid, nome: nomeFiado(cid), tel: cid.slice(1), tipo: 'receb', valor, forma, ts: Date.now(), quem: quemAgora(), ...(gaveta ? { gaveta: true } : {}) });
  if (gaveta) movimento('suprimento', valor, `Recebeu fiado · ${nomeFiado(cid) || fone(cid.slice(1))}`); else { auditar('fiado-recebido', { valor, motivo: `${nomeFiado(cid)} · ${forma}` }); grava(); }
  return valor;
}
export function clientesFiado() {
  garantirFiado();
  const ids = [...new Set([...db.fiado.lanc.map((l) => l.cliente), ...Object.keys(db.fiado.limites)])];
  return ids.map((cid) => ({ cid, nome: nomeFiado(cid), tel: cid.slice(1), saldo: saldoFiado(cid), limite: limiteFiado(cid) })).sort((a, b) => b.saldo - a.saldo || a.nome.localeCompare(b.nome, 'pt-BR'));
}
export function acertoEntregadores(desde) {
  const r = {};
  db.vendas.filter((v) => v.ts >= desde && v.entregador && !v.cancelado).forEach((v) => {
    (r[v.entregador] ||= { entregas: 0, taxas: 0, dinheiro: 0 }); r[v.entregador].entregas++; r[v.entregador].taxas = r2(r[v.entregador].taxas + (v.entrega || 0));
    r[v.entregador].dinheiro = r2(r[v.entregador].dinheiro + pagamentosVenda(v).filter((p) => p.forma === 'Dinheiro').reduce((s, p) => s + p.valor, 0));
  });
  return r;
}

// ------------------------------------------------------------------ cardápio online
export function linkCardapio(extra = '') {
  const u = window.popinaPlano === 'marca' && ESPACO ? new URL('/cardapio/', location.href) : new URL('cardapio.html', location.href); u.search = '';
  if (ESPACO) u.searchParams.set('r', ESPACO);
  new URLSearchParams(extra).forEach((v, k) => u.searchParams.set(k, v));
  return u.href;
}
// o que o cliente mandou é conferido de novo aqui: preço, tamanho, complementos e meio a meio vêm do cardápio do restaurante
export function opcaoReal(p, nome) {
  for (const g of p.grupos || []) for (const o of g.opcoes || []) if (nome === `${g.nome}: ${o.nome}`) return { nome, preco: Number(o.preco) || 0 };
  for (const a of p.adicionais || []) if (nome === a.nome) return { nome: a.nome, preco: Number(a.preco) || 0 };
  return null;
}
export function itensLimpos(itens) {
  return (Array.isArray(itens) ? itens : []).map((i) => {
    const p = prod(i?.prod); if (!p || p.porKg || p.ativo === false) return null;
    const qtd = Math.min(30, Math.max(1, Math.round(Number(i.qtd) || 1)));
    const tam = p.tamanhos?.some((x) => x.nome === i.tam) ? i.tam : '';
    const adic = (Array.isArray(i.adic) ? i.adic : []).map((a) => opcaoReal(p, a?.nome)).filter(Boolean);
    const b = i.meia && prod(i.meia.b); const meia = p.pizza && b?.pizza && b.ativo !== false ? { a: p.id, b: b.id } : null;
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
      const itens = itensLimpos(d.itens); if (!itens.length || comanda(id)) return;
      const c = novoPedido(r.tipo, { nome: String(d.nome || '').slice(0, 80), tel: String(d.tel || ''), end: r.tipo === 'delivery' ? String(d.end || '').slice(0, 160) : '', bairro: r.tipo === 'delivery' ? String(d.bairro || '') : '',
          ...(d.referencia ? { ref: String(d.referencia).slice(0, 120) } : {}) },
        { origem: 'Cardápio online', ...(agendadoDe(d.agendado) ? { agendado: agendadoDe(d.agendado) } : {}), pagarNaEntrega: String(d.pagar || '').slice(0, 60), id, ...(r.tipo === 'balcao' ? { modo: 'retirada' } : {}), ...(Number(d.troco) > 0 ? { trocoPara: r2(Math.min(5000, Number(d.troco))) } : {}) });
      itens.forEach((i) => adicionarItem(c, { prodId: i.prod, qtd: i.qtd, obs: i.obs, adic: i.adic, meia: i.meia, tam: i.tam }));
      // cupom do cardápio: conferido aqui de novo (código, validade, mínimo e limite de usos)
      // a taxa, o desconto e o total que o cardápio manda são só conferência: valem a taxa do bairro e o cupom conferido aqui
      if (d.cupom && !aplicarCupom(c, String(d.cupom).slice(0, 30))) marcar(c, 'desconto', `Cupom ${String(d.cupom).slice(0, 30)} não vale (sem desconto)`, 'Cardápio online');
      if (Number(d.total) > 0 && Math.abs(Number(d.total) - conta(c).total) >= 0.01) marcar(c, 'aviso', `O cliente viu ${din(Number(d.total))} no cardápio; a conta ficou ${din(conta(c).total)}`, 'Cardápio online');
      // aceitar sozinho (Pedidos › ajustes): vai direto para a cozinha
      if (aceiteAuto()) aceitarPedido(c);
      novos++;
    }
    // reservas, cupons e encomendas saíram desta versão: o que chegar assim é ignorado
  });
  if (novos) { grava(); dispatchEvent(new CustomEvent('popina-chegou', { detail: novos })); }
};
