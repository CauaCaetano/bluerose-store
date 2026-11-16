// Popina · o estado do restaurante e as regras (enviar para a cozinha, baixar estoque, fechar conta, caixa).
// Guarda no aparelho (localStorage) e avisa as outras abas na hora (BroadcastChannel). Na conta real, a mesma
// interface (window.popinaNuvem) troca isso pela nuvem com tempo real entre os aparelhos.
import { estadoInicial, estadoVazio } from './dados.js?v=23';
import { precoTam, nomeItem, opcaoReal, nomeSabores, aplicarCota, aplicarComboEtapas } from './opcoes.js?v=23';
import { temModulo, modulosAtivos } from './perfis.js?v=23';
import { valorRodizio, inclusoRodizio, precoAgora, precoFracoes, precoBorda, faltaCombo, faltaConsumacao, ordemEtapa, ymd, precoKg, noTurno, mlDaVenda } from './precos.js?v=23';

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
  try { const d = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (d && d.versao === 1 && (CONTA || d.exemplo === 8)) return d; /* a conta real nunca é trocada pelo exemplo */ } catch { /* sem acesso */ }
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
  const L = lojaCfg();
  const sub = r2(itensValidos(c).reduce((s, i) => s + valorItem(i), 0));
  // rodízio: preço por pessoa (adulto, criança, meia); os itens inclusos já entram com preço zero
  const rodizio = c.rodizio ? valorRodizio(L.rodizio, c.rodizio) : 0;
  // evento: pacote por convidado que chegou e couvert artístico; o que passar do pacote entra como item
  const ev = c.evento ? (db.eventos || []).find((e) => e.id === c.evento) : null, presentes = ev ? (ev.convidados || []).filter((x) => x.chegou).length : 0;
  const pacote = ev ? r2(presentes * (Number(ev.pacote) || 0)) : 0;
  // portaria: o ingresso e a consumação mínima (cobra a diferença quando consumiu menos)
  const ingresso = r2(c.ingresso?.preco || 0), consumacao = c.consumacao ? faltaConsumacao(sub, c.consumacao) : 0;
  const servico = SERVICO_EM.includes(c.tipo) && c.servico ? r2((sub + rodizio + pacote) * (db.config.servico || 0) / 100) : 0;
  // couvert por pessoa: liga sozinho quando o restaurante cobra (c.couvert === false desliga só nesta mesa)
  const couvert = r2((temCouvert(c) ? Number(L.couvert) * (c.pessoas || 0) : 0) + (ev ? presentes * (Number(ev.couvert) || 0) : 0));
  const entrega = c.tipo === 'delivery' ? r2(c.taxaEntrega || 0) : 0;
  const desconto = r2(c.desconto || 0);
  // cartão perdido (comanda individual): a taxa configurada entra na conta
  const perdido = c.tipo === 'cartao' && c.perdido ? r2(Number(L.taxaCartaoPerdido) || 0) : 0;
  const total = r2(Math.max(0, sub + rodizio + pacote + ingresso + consumacao + servico + couvert + entrega + perdido - desconto));
  const pago = r2((c.pagamentos || []).reduce((s, p) => s + p.valor, 0));
  return { sub, rodizio, pacote, presentes, ingresso, consumacao, servico, couvert, entrega, perdido, desconto, total, pago, falta: r2(Math.max(0, total - pago)) };
}
const SERVICO_EM = ['mesa', 'cartao', 'evento'];
// couvert: só com a função ligada; configuração antiga com valor salvo e sem escolha do dono continua cobrando
export function couvertLigado(L = lojaCfg()) {
  if (L.modulos && L.modulos.couvert === false) return false;
  return temModulo(L, 'couvert') || Number(L.couvert) > 0;
}
export const temCouvert = (c) => (c.tipo === 'mesa' || c.tipo === 'cartao') && couvertLigado() && Number(lojaCfg().couvert) > 0 && c.couvert !== false;
// funções da casa ligadas agora (template + o que o dono ligou/desligou)
export const tem = (k) => temModulo(lojaCfg(), k);
// onde está a conta: mesa, cartão, evento, balcão ou delivery (com a senha, quando houver)
export function ondeComanda(c) {
  if (!c) return '';
  if (c.tipo === 'mesa') return `Mesa ${c.mesa}`;
  if (c.tipo === 'cartao') return `Cartão ${c.cartao}${c.naMesa ? ` · mesa ${c.naMesa}` : ''}`;
  if (c.tipo === 'evento') return `Evento ${c.nomeEvento || ''}`.trim();
  if (c.tipo === 'delivery') return `Delivery #${c.num}`;
  return `Balcão #${c.num}${c.senha ? ` · senha ${c.senha}` : ''}`;
}

// ------------------------------------------------------------------ quem fez, histórico da mesa e auditoria
const PAPEL_NOME = { garcom: 'Garçom', cozinha: 'Cozinha', caixa: 'Caixa', dono: 'Dono' };
// quem está usando este aparelho: o operador do caixa, o garçom da mesa ou o papel do aparelho (+ "PIN do gerente" quando autorizado)
export function quemAgora(c = null, comPin = false) {
  let p = ''; try { p = sessionStorage.getItem('popina-papel') || localStorage.getItem('popina-papel') || ''; } catch { /* sem acesso */ }
  const q = p === 'caixa' && db.caixa?.operador ? db.caixa.operador : (p === 'garcom' || !p) && c?.garcom ? c.garcom : PAPEL_NOME[p] || 'Garçom';
  return comPin ? `${q} · PIN do gerente` : q;
}
// linha do tempo da mesa (abriu, enviou, cancelou, juntou, desconto, fechou...)
export function marcar(c, tipo, txt, quem = quemAgora(c)) {
  (c.hist ||= []).push({ t: Date.now(), tipo, txt, quem });
  if (c.hist.length > 200) c.hist.splice(0, c.hist.length - 200);
}
// registro de auditoria: só acrescenta; guarda as últimas 2000 ações sensíveis
export function auditar(tipo, dados = {}) {
  const a = (db.auditoria ||= []);
  a.push({ id: uid('a'), t: Date.now(), tipo, quem: quemAgora(), ...dados });
  if (a.length > 2000) a.splice(0, a.length - 2000);
}
// regras do gerente: PIN de 4 números, limite de desconto sem PIN e conferência cega no fechamento
export const REGRAS_PADRAO = { pin: '', limiteDesconto: 10, conferenciaCega: false };
export const regras = () => ({ ...REGRAS_PADRAO, ...(db.config.regras || {}) });
export function setRegras(parcial) { db.config.regras = { ...regras(), ...parcial }; grava(); }
export const temPin = () => /^\d{4}$/.test(regras().pin || '');
export const pinConfere = (p) => !temPin() || String(p || '') === regras().pin;

// ------------------------------------------------------------------ comandas
// rodizio: { adulto, crianca, meia } quando a mesa abre no rodízio (as pessoas são a soma)
export function abrirMesa(n, pessoas = 2, garcom = '', rodizio = null) {
  let c = comandaDaMesa(n); if (c) return c;
  c = { id: uid('m'), tipo: 'mesa', mesa: n, pessoas, aberta: Date.now(), garcom, itens: [], pagamentos: [], servico: true, ...(rodizio ? { rodizio } : {}) };
  marcar(c, 'abriu', `Mesa aberta com ${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'}${rodizio ? ' no rodízio' : ''}${garcom ? ` · ${garcom}` : ''}`);
  db.comandas.push(c); grava(); return c;
}
// comanda individual: cartão numerado, sozinho (balcão do bar, portaria) ou dentro de uma mesa
export const cartaoAberto = (n) => db.comandas.find((c) => c.tipo === 'cartao' && c.cartao === Number(n));
export function abrirCartao(n, extra = {}) {
  n = Number(n); let c = cartaoAberto(n); if (c) return c;
  c = { id: uid('k'), tipo: 'cartao', cartao: n, pessoas: 1, aberta: Date.now(), garcom: '', itens: [], pagamentos: [], servico: true, ...extra };
  marcar(c, 'abriu', `Cartão ${n} aberto${c.naMesa ? ` na mesa ${c.naMesa}` : ''}${c.nome ? ` · ${c.nome}` : ''}`);
  db.comandas.push(c); grava(); return c;
}
export const proximoCartao = () => { let n = 1; const usados = new Set(db.comandas.filter((c) => c.tipo === 'cartao').map((c) => c.cartao)); while (usados.has(n)) n++; return n; };
// senha de balcão: número do dia, recomeça a cada dia
export function proximaSenha() {
  const d = ymd(); if (db.senha?.dia !== d) db.senha = { dia: d, n: 0 };
  return ++db.senha.n;
}
export function novoPedido(tipo, cliente = {}, extra = {}) {
  const senha = tipo === 'balcao' && tem('senha') && !extra.encomenda && extra.senha !== false ? { senha: proximaSenha() } : {};
  const c = { id: uid(tipo[0]), tipo, num: db.numPedido++, aberta: Date.now(), cliente, itens: [], pagamentos: [], servico: false, taxaEntrega: 0, ...(tipo === 'delivery' ? { entrega: 'novo' } : {}), ...extra, ...senha };
  if (c.senha === false) delete c.senha;
  if (tipo === 'delivery' && cliente.bairro) c.taxaEntrega = db.bairros.find((b) => b.nome === cliente.bairro)?.taxa || 0;
  db.comandas.push(c); grava(); return c;
}
// item ainda não enviado (rascunho do garçom) -> status 'rascunho'
export function adicionarItem(c, { prodId, qtd = 1, obs = '', adic = [], meia = null, kg = 0, tam = '', sabores = null, combo = null }) {
  const p = prod(prodId); if (!p) return false;
  if (c.perdido) return false; // cartão perdido: nada novo entra até ser encontrado
  const L = lojaCfg(), M = modulosAtivos(L);
  const tm = tam && p.tamanhos?.length ? p.tamanhos.find((x) => x.nome === tam) : null;
  let nome = nomeItem(p, { tam: tm?.nome }), preco = precoTam(p, tm?.nome), promo = '';
  const regra = M.has('meiaMeia') ? L.fracoes?.regra || 'caro' : 'caro';
  // pizza em frações (1/2, 1/3, 1/4): o preço segue a regra do restaurante (sabor mais caro ou proporcional)
  const sab = Array.isArray(sabores) && sabores.length > 1 ? [p, ...sabores.filter((x) => x !== p.id).map(prod)].filter((x) => x?.pizza).slice(0, M.has('meiaMeia') ? 4 : 2) : null;
  if (sab?.length > 1) { nome = nomeSabores(sab, tm?.nome); preco = precoFracoes(sab.map((x) => precoTam(x, tm?.nome)), regra); meia = sab.length === 2 ? { a: sab[0].id, b: sab[1].id } : null; }
  else if (meia) { const b = prod(meia.b); if (b) { nome = nomeItem(p, { tam: tm?.nome, meia }, b); preco = precoFracoes([precoTam(p, tm?.nome), precoTam(b, tm?.nome)], regra); } }
  // por quilo: o prato pesado vira 1 item com o valor do peso (o estoque baixa a ficha × kg)
  if (p.porKg && kg > 0) { const pk = precoKg(p); nome = `${p.nome} · ${kg.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`; preco = r2(pk.preco * kg); qtd = 1; if (pk.desde) promo = `Quilo desde ${pk.desde}`; }
  else if (!(sab?.length > 1) && !meia) { const pa = precoAgora(p, preco, { loja: L, mods: M, tam: tm?.nome }); if (pa.motivo) { preco = pa.preco; promo = pa.motivo; } }
  // combo: os componentes escolhidos vão junto (a cozinha vê cada um); o preço é o do combo
  const cmb = M.has('combos') && p.combo?.length && Array.isArray(combo) && !faltaCombo(p.combo, combo) ? combo.map((x) => ({ g: x.g, grupo: p.combo[x.g].nome, prod: x.prod, nome: prod(x.prod)?.nome || '' })) : null;
  // rodízio: item incluso entra com preço zero (os adicionais continuam cobrados)
  const rod = !!(c.rodizio && M.has('rodizio') && inclusoRodizio(L.rodizio, p.id));
  if (rod) { preco = 0; promo = ''; }
  // vitrine: o que sobrou ontem e foi "vender amanhã com desconto" sai com o desconto até acabar
  else if (M.has('vitrine') && p.vitrine) { const pv = db.vitrine?.dia === ymd() ? db.vitrine.promo?.[p.id] : null; if (pv && pv.qtd >= qtd && pv.pct > 0) { preco = r2(preco * (1 - pv.pct / 100)); promo = 'Do dia anterior'; pv.qtd -= qtd; } }
  c.itens.push({ id: uid('i'), prod: prodId, nome, qtd, preco: r2(preco), setor: p.setor, obs, adic, meia, status: 'rascunho', ...(p.porKg && kg > 0 ? { kg } : {}), ...(tm ? { tam: tm.nome, fator: Number(tm.fator) || 1 } : {}),
    ...(sab?.length > 2 ? { sabores: sab.map((x) => x.id) } : {}), ...(cmb ? { combo: cmb } : {}), ...(rod ? { rodizio: true } : {}), ...(promo ? { promo } : {}),
    ...(M.has('etapas') && p.etapa ? { etapa: p.etapa } : {}), ...(M.has('vitrine') && p.vitrine ? { vitrine: true } : {}) });
  grava(); return true;
}
// borda de pizza (configurada na loja) no tamanho escolhido: { nome: 'Borda: Catupiry', preco }
export function bordaReal(p, nome, tam) {
  const L = lojaCfg(); if (!p?.pizza || !temModulo(L, 'meiaMeia')) return null;
  const b = (L.fracoes?.bordas || []).find((x) => `Borda: ${x.nome}` === nome); if (!b) return null;
  const k = tam && p.tamanhos?.length ? p.tamanhos.findIndex((x) => x.nome === tam) : -1;
  return { nome, preco: precoBorda(b, k) };
}
// envia os rascunhos para a cozinha/bar e baixa o estoque pela ficha técnica
// sequência de pratos (etapas): manda o que não tem etapa e só a primeira etapa pendente; as outras esperam o "Liberar próxima etapa"
// itens da vitrine não passam pela cozinha: saem entregues e baixam a quantidade feita no dia
export function enviar(c, liberar = false) {
  const agora = Date.now(); let n = 0;
  const rasc = c.itens.filter((i) => i.status === 'rascunho'), o = (i) => ordemEtapa(i.etapa);
  let manda = rasc;
  if (tem('etapas') && rasc.some((i) => o(i) >= 0)) {
    const com = rasc.filter((i) => o(i) >= 0), seg = com.filter((i) => i.segura), novos = com.filter((i) => !i.segura);
    const mSeg = seg.length ? Math.min(...seg.map(o)) : Infinity, mNovo = novos.length ? Math.min(...novos.map(o)) : Infinity;
    const alvo = liberar ? Math.min(mSeg, mNovo) : mNovo < mSeg ? mNovo : -1;
    manda = rasc.filter((i) => (o(i) < 0 && !i.segura) || o(i) === alvo);
    com.filter((i) => !manda.includes(i)).forEach((i) => { i.segura = true; });
  }
  manda.forEach((i) => { delete i.segura; i.status = i.vitrine ? 'entregue' : 'novo'; i.enviado = agora; if (i.vitrine) { i.entregue = agora; tirarVitrine(i.prod, i.qtd); } n++; baixar(i, 1); });
  baixarEmbalagens(c, manda);
  const esperam = c.itens.filter((i) => i.status === 'rascunho' && i.segura).length;
  if (n) marcar(c, 'enviou', `Enviou ${n} ${n === 1 ? 'item' : 'itens'} para a cozinha e o bar${esperam ? ` (${esperam} esperando a próxima etapa)` : ''}`);
  grava(); return n;
}
// embalagem automática (delivery e balcão): a caixa da pizza pelo tamanho e, uma vez por pedido, a embalagem do delivery
// L.embalagem = { pizza: [{ tam: 'Broto', insumo: 'cx_broto' }, { tam: '', insumo: 'cx_grande' }], delivery: 'emb_delivery' }
function baixarEmbalagens(c, itens) {
  const L = lojaCfg(), E = L.embalagem || {}; if (!temModulo(L, 'embalagem') || !['delivery', 'balcao'].includes(c.tipo)) return;
  const sai = (id, q) => { const ins = insumo(id); if (!ins || !(q > 0)) return; const k = `${ins.geracao || 0}:${APARELHO}`; ins.baixas ||= {}; ins.baixas[k] = r2((ins.baixas[k] || 0) + q); (c.emb ||= {})[id] = (c.emb[id] || 0) + q; };
  itens.forEach((i) => { if (!prod(i.prod)?.pizza) return; const tm = String(i.tam || '').toLowerCase(), l = E.pizza || []; const r = l.find((x) => x.tam && tm.includes(String(x.tam).toLowerCase())) || l.find((x) => !x.tam); if (r) sai(r.insumo, i.qtd); });
  if (c.tipo === 'delivery' && E.delivery && !c.emb?.[E.delivery] && itens.length) sai(E.delivery, 1);
}
// a próxima etapa que está esperando (índice em ETAPAS) ou -1
export const proximaEtapa = (c) => { const l = c.itens.filter((i) => i.status === 'rascunho' && i.segura).map((i) => ordemEtapa(i.etapa)).filter((x) => x >= 0); return l.length ? Math.min(...l) : -1; };
// vitrine: quantidade feita no dia, por produto (vira esgotado quando acaba)
// o que foi "levar para amanhã" no fechamento da vitrine entra como feito no dia seguinte
export function vitrineHoje() {
  const d = ymd(); if (db.vitrine?.dia === d) return db.vitrine;
  const a = db.vitrineAmanha?.dia === d ? { ...(db.vitrineAmanha.qtd || {}) } : {};
  const pr = db.vitrineAmanha?.dia === d && db.vitrineAmanha.promo ? JSON.parse(JSON.stringify(db.vitrineAmanha.promo)) : null; // de ontem com desconto
  db.vitrine = { dia: d, qtd: { ...a }, feito: { ...a }, ...(Object.keys(a).length ? { deOntem: { ...a } } : {}), ...(pr ? { promo: pr } : {}) };
  if (db.vitrineAmanha?.dia === d) delete db.vitrineAmanha;
  return db.vitrine;
}
export const restaVitrine = (id) => { const v = db.vitrine; if (v?.dia === ymd()) return v.qtd?.[id] ?? null; const a = db.vitrineAmanha; return a?.dia === ymd() && a.qtd?.[id] != null ? a.qtd[id] : null; };
function tirarVitrine(id, q) {
  const v = vitrineHoje(); if (v.qtd[id] == null) return;
  v.qtd[id] = Math.max(0, v.qtd[id] - q);
  const p = prod(id); if (p && v.qtd[id] === 0) { p.ativo = false; p.esgotouVitrine = v.dia; }
}
function fichaDoItem(i) {
  if (i.sabores?.length > 1) { // frações: a ficha de cada sabor dividida pelo número de sabores
    const m = {}, n = i.sabores.length;
    i.sabores.forEach((id) => (prod(id)?.ficha || []).forEach((f) => { m[f.insumo] = (m[f.insumo] || 0) + f.qtd / n; }));
    return Object.entries(m).map(([insumo, qtd]) => ({ insumo, qtd }));
  }
  if (i.combo?.length) { // combo: a ficha de cada componente
    const m = {}; i.combo.forEach((x) => (prod(x.prod)?.ficha || []).forEach((f) => { m[f.insumo] = (m[f.insumo] || 0) + f.qtd; }));
    return Object.entries(m).map(([insumo, qtd]) => ({ insumo, qtd }));
  }
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
  baixarBarril(i, sinal);
}
// chopp: cada copo vendido tira os ml do produto do barril que está na torneira (por aparelho, como as baixas do estoque)
export const barrilDe = (prodId) => (db.barris || []).find((b) => !b.fim && (b.prods || []).includes(prodId));
function baixarBarril(i, sinal) {
  const p = prod(i.prod), b = p?.ml ? barrilDe(i.prod) : null; if (!b) return;
  b.usado ||= {}; b.usado[APARELHO] = r2((b.usado[APARELHO] || 0) + sinal * mlDaVenda(p.ml, i.qtd, i.fator || 1));
}
// venda no balcão do caixa (restaurante a quilo, bebida, sobremesa): já sai entregue, sem ir para a cozinha
export function venderDireto(c) {
  const agora = Date.now(); let n = 0;
  c.itens.filter((i) => i.status === 'rascunho').forEach((i) => { i.status = 'entregue'; i.enviado = agora; if (i.vitrine) tirarVitrine(i.prod, i.qtd); n++; baixar(i, 1); });
  if (n) grava(); return n;
}
export function mudarStatus(c, item, status) {
  item.status = status; if (status === 'pronto') item.pronto = Date.now();
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
  marcar(destino, 'juntou', `Juntou a mesa ${origem.mesa} nesta (${origem.pessoas || 0} pessoas, ${itensValidos(origem).length} itens)`);
  db.comandas = db.comandas.filter((x) => x !== origem);
  db.chamados = db.chamados.filter((x) => x.mesa !== origem.mesa);
  grava(); return true;
}
// passa itens escolhidos para outra mesa (abre a mesa se estiver livre); a mesa de origem vazia é liberada
export function transferirItens(c, ids, mesa) {
  if (!c || mesa === c.mesa || !ids.length) return null;
  const mover = c.itens.filter((i) => ids.includes(i.id) && !i.cancelado); if (!mover.length) return null;
  const d = comandaDaMesa(mesa) || abrirMesa(mesa, 1, c.garcom || '');
  c.itens = c.itens.filter((i) => !mover.includes(i)); d.itens.push(...mover);
  const txt = mover.map((i) => `${i.qtd}× ${i.nome}`).join(', ');
  marcar(c, 'transferiu', `Passou para a mesa ${mesa}: ${txt}`); marcar(d, 'transferiu', `Veio da mesa ${c.mesa}: ${txt}`);
  const liberou = !itensValidos(c).length && !(c.pagamentos || []).length;
  if (liberou) db.comandas = db.comandas.filter((x) => x !== c);
  grava(); return { destino: d, liberou };
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
  marcar(c, 'fechou', `Conta fechada · ${din(v.total)}`);
  // kg, fator e meia ficam na venda para o custo (CMV) e para devolver o estoque num estorno
  db.vendas.push({ id: db.vendas.some((x) => x.id === c.id) ? `${c.id}-${Date.now().toString(36)}` : c.id, ts: Date.now(), tipo: c.tipo, mesa: c.mesa, num: c.num,
    itens: itensValidos(c).map((i) => ({ prod: i.prod, nome: i.nome, qtd: i.qtd, preco: valorItem(i) / i.qtd, setor: i.setor, ...(i.kg ? { kg: i.kg } : {}), ...(i.fator ? { fator: i.fator } : {}), ...(i.meia ? { meia: i.meia } : {}), ...(i.sabores ? { sabores: i.sabores } : {}), ...(i.combo ? { combo: i.combo } : {}), ...(i.rodizio ? { rodizio: true } : {}) })),
    total: v.total, servico: v.servico, couvert: v.couvert, entrega: v.entrega, desconto: v.desconto, onde: ondeComanda(c),
    ...(v.rodizio ? { rodizio: v.rodizio, rodizioPessoas: c.rodizio } : {}), ...(v.pacote ? { pacote: v.pacote, evento: c.evento } : {}), ...(v.ingresso ? { ingresso: v.ingresso } : {}), ...(v.consumacao ? { consumacao: v.consumacao } : {}), ...(v.perdido ? { taxaPerdido: v.perdido } : {}), pagamentos: c.pagamentos, forma: c.pagamentos.length === 1 ? c.pagamentos[0].forma : 'Dividido', cancelados: c.itens.filter((i) => i.cancelado).length, garcom: c.garcom || '', entregador: c.entregador || '', cupom: c.cupom || '', cliente: c.cliente?.tel ? String(c.cliente.tel).replace(/\D/g, '') : '',
    pessoas: c.pessoas || 0, servicoOn: !!c.servico, couvertOn: c.couvert !== false, aberta: c.aberta, hist: c.hist || [],
    ...(v.desconto ? { descontoMotivo: c.descontoInfo?.motivo || (c.cupom ? `Cupom ${c.cupom}` : ''), descontoQuem: c.descontoInfo?.quem || '' } : {}) });
  registrarCliente(c, v.total);
  db.comandas = db.comandas.filter((x) => x !== c);
  db.chamados = db.chamados.filter((x) => x.mesa !== c.mesa || c.tipo !== 'mesa');
  grava();
}
// dividir por pessoas: valor de cada parte (a última leva os centavos que sobram)
export function partes(total, n) {
  const base = Math.floor((total / n) * 100) / 100; const ult = r2(total - base * (n - 1));
  return Array.from({ length: n }, (_, k) => (k === n - 1 ? ult : base));
}
// desconto com motivo e quem deu (vai para a venda, para o histórico da mesa e para a auditoria)
export function darDesconto(c, valor, motivo = '', quem = quemAgora(c)) {
  const antes = r2(c.desconto || 0); valor = r2(Math.max(0, valor));
  c.desconto = valor; c.descontoInfo = valor ? { motivo, quem, ts: Date.now() } : null;
  if (valor) marcar(c, 'desconto', `Desconto de ${din(valor)}${motivo ? ` (${motivo})` : ''}`, quem);
  else if (antes) marcar(c, 'desconto', 'Tirou o desconto', quem);
  auditar(valor ? 'desconto' : 'desconto-tirado', { quem, mesa: c.mesa, num: c.num, valor: valor || antes, motivo, pct: conta(c).sub ? Math.round((valor / conta(c).sub) * 1000) / 10 : 0 });
  grava();
}
export const vendaDeHoje = (v) => new Date(v.ts).toDateString() === new Date().toDateString();
// cancela (estorna) uma venda fechada: fica marcada, nunca apagada; pode devolver o estoque
export function cancelarVenda(v, motivo, devolver = false, quem = quemAgora()) {
  if (!v || v.cancelado) return false;
  if (devolver) (v.itens || []).forEach((i) => baixar({ ...i, kg: i.kg || (prod(i.prod)?.porKg && prod(i.prod).preco ? i.preco / prod(i.prod).preco : 0) }, -1));
  v.cancelado = { ts: Date.now(), motivo, quem, estoque: !!devolver };
  auditar('estorno', { quem, venda: v.id, mesa: v.mesa, num: v.num, valor: v.total, motivo, estoque: !!devolver });
  grava(); return true;
}
// reabre uma conta de mesa fechada hoje: a venda fica marcada como reaberta (sai do faturamento) e a comanda volta com os pagamentos
export function reabrirVenda(v, motivo, quem = quemAgora()) {
  if (!v || v.cancelado || v.tipo !== 'mesa' || !vendaDeHoje(v)) return { erro: 'Só dá para reabrir conta de mesa fechada hoje.' };
  if (comandaDaMesa(v.mesa)) return { erro: `A mesa ${v.mesa} está ocupada agora. Troque a outra conta de mesa antes.` };
  const c = { id: uid('m'), tipo: 'mesa', mesa: v.mesa, pessoas: v.pessoas || 1, aberta: v.aberta || v.ts, garcom: v.garcom || '', servico: v.servicoOn ?? !!v.servico, ...(v.couvertOn === false ? { couvert: false } : {}),
    itens: (v.itens || []).map((i) => ({ id: uid('i'), prod: i.prod, nome: i.nome, qtd: i.qtd, preco: r2(i.preco), setor: i.setor || prod(i.prod)?.setor || 'cozinha', obs: '', adic: [], status: 'entregue', enviado: v.ts, entregue: v.ts, ...(i.kg ? { kg: i.kg } : {}), ...(i.fator ? { fator: i.fator } : {}), ...(i.meia ? { meia: i.meia } : {}), ...(i.sabores ? { sabores: i.sabores } : {}), ...(i.combo ? { combo: i.combo } : {}), ...(i.rodizio ? { rodizio: true } : {}) })),
    pagamentos: (v.pagamentos || []).map((p) => ({ ...p })), hist: [...(v.hist || [])], ...(v.rodizioPessoas ? { rodizio: { ...v.rodizioPessoas } } : {}),
    ...(v.desconto ? { desconto: v.desconto, descontoInfo: { motivo: v.descontoMotivo || '', quem: v.descontoQuem || '', ts: v.ts } } : {}), ...(v.cupom ? { cupom: v.cupom } : {}) };
  marcar(c, 'reabriu', `Conta reaberta (${motivo})`, quem);
  v.cancelado = { ts: Date.now(), motivo, quem, reaberta: true };
  db.comandas.push(c);
  auditar('reabrir', { quem, venda: v.id, mesa: v.mesa, valor: v.total, motivo });
  grava(); return { c };
}

// cozinha por estação: o pedido só aparece pronto para o garçom quando todas as estações daquele envio terminaram
export const prontoDeVez = (c, i) => !tem('estacoes') || c.itens.every((x) => x.cancelado || x.enviado !== i.enviado || x.setor !== i.setor || ['pronto', 'entregue'].includes(x.status));
// ------------------------------------------------------------------ fila do garçom (o que fazer agora)
export function fila(garcom = '') {
  const l = [], agora = Date.now();
  db.comandas.filter((c) => c.tipo === 'mesa' && c.pediuConta).forEach((c) => l.push({ tipo: 'conta', c, ts: c.pediuConta, prioridade: 3 }));
  db.chamados.filter((x) => !x.atendido).forEach((x) => l.push({ tipo: 'chamou', x, c: comandaDaMesa(x.mesa), ts: x.ts, prioridade: 2 }));
  db.comandas.forEach((c) => {
    const prontos = c.itens.filter((i) => i.status === 'pronto' && !i.cancelado && prontoDeVez(c, i));
    if (prontos.length) l.push({ tipo: 'pronto', c, itens: prontos, ts: Math.min(...prontos.map((i) => i.pronto || agora)), prioridade: 2.5 });
  });
  db.pedidosQR.forEach((q) => l.push({ tipo: 'qr', q, ts: q.ts, prioridade: 2.8 }));
  return l.sort((a, b) => b.prioridade - a.prioridade || a.ts - b.ts);
}
export function estadoMesa(n) {
  const c = comandaDaMesa(n);
  if (!c) return db.pedidosQR.some((q) => q.mesa === n) ? 'qr' : 'livre';
  if (c.pediuConta) return 'conta';
  if (c.itens.some((i) => i.status === 'pronto' && !i.cancelado && prontoDeVez(c, i))) return 'pronto';
  if (db.chamados.some((x) => x.mesa === n && !x.atendido)) return 'chamou';
  return 'ocupada';
}
export function atenderChamado(x) { x.atendido = Date.now(); db.chamados = db.chamados.filter((y) => !y.atendido); grava(); }
export function confirmarQR(q) {
  const c = abrirMesa(q.mesa, 2, '');
  q.itens.forEach((i) => { if (adicionarItem(c, { prodId: i.prod, qtd: i.qtd, obs: i.obs, adic: i.adic || [], meia: i.meia || null, tam: i.tam || '', sabores: i.sabores || null, combo: i.combo || null }) && i.comboUp) c.itens.at(-1).comboUp = i.comboUp; });
  if (tem('comboEtapas')) aplicarComboEtapas(c.itens, lojaCfg(), prod);
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
  // gorjeta da divisão por pessoa: fica fora do faturamento, mas a de dinheiro está na gaveta
  const gorj = {}; vendas.forEach((v) => (v.pagamentos || []).forEach((p) => { if (p.gorjeta) gorj[p.forma] = r2((gorj[p.forma] || 0) + p.gorjeta); }));
  const dinheiro = r2((db.caixa?.troco || 0) + (porForma.Dinheiro || 0) + (gorj.Dinheiro || 0) - sangria + suprimento);
  return { vendas, total: r2(vendas.reduce((s, v) => s + v.total, 0)), porForma, sangria, suprimento, dinheiroNaGaveta: dinheiro, servico: r2(vendas.reduce((s, v) => s + (v.servico || 0), 0)), gorjetas: r2(Object.values(gorj).reduce((s, x) => s + x, 0)) };
}
export function abrirCaixa(troco, operador) { db.caixa = { aberto: Date.now(), troco: r2(troco), movimentos: [], operador }; grava(); }
export function movimento(tipo, valor, motivo, quem = quemAgora()) {
  db.caixa.movimentos.push({ tipo, valor: r2(valor), motivo, ts: Date.now(), quem });
  auditar(tipo, { quem, valor: r2(valor), motivo }); grava();
}
// extra: { contadoPorForma, cega } da conferência cega
export function fecharCaixa(contado, motivo = '', quem = '', extra = {}) {
  const r = caixaResumo(); (db.fechamentos ||= []).push({ ...db.caixa, id: uid('f'), fechado: Date.now(), fechadoPor: quem, motivo, abertas: db.comandas.map((c) => c.id), resumo: { total: r.total, vendas: r.vendas.length, porForma: r.porForma, sangria: r.sangria, suprimento: r.suprimento, servico: r.servico, gaveta: r.dinheiroNaGaveta, contado: r2(contado), diferenca: r2(contado - r.dinheiroNaGaveta), ...extra } });
  if (r2(contado - r.dinheiroNaGaveta)) auditar('caixa-diferenca', { quem, valor: r2(contado - r.dinheiroNaGaveta), motivo });
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
// movimentações manuais do estoque (perdas e ajustes de inventário), na unidade da receita
export const MOTIVOS_PERDA = ['Vencido', 'Quebra', 'Consumo interno', 'Erro de preparo', 'Outro'];
function registrarMov(i, tipo, qtd, motivo, quem) {
  const m = { id: uid('e'), t: Date.now(), insumo: i.id, tipo, qtd: r2(qtd), motivo, quem, custo: r2((qtd / (i.fator || 1)) * (i.custo || 0)) };
  (db.movEstoque ||= []).push(m); if (db.movEstoque.length > 5000) db.movEstoque.splice(0, db.movEstoque.length - 5000);
  return m;
}
// perda: tira do saldo pelo mesmo caminho das baixas (não briga com outros aparelhos)
export function registrarPerda(insumoId, qtd, motivo, quem = quemAgora()) {
  const i = insumo(insumoId); if (!i || !(qtd > 0)) return;
  const k = `${i.geracao || 0}:${APARELHO}`; i.baixas ||= {}; i.baixas[k] = r2((i.baixas[k] || 0) + qtd);
  const m = registrarMov(i, 'perda', -qtd, motivo, quem);
  auditar('perda', { quem, item: i.nome, qtd, valor: -m.custo, motivo }); grava();
}
// inventário: o contado vira o saldo novo e a diferença fica registrada como ajuste
export function ajustarEstoque(insumoId, contado, motivo = 'Inventário', quem = quemAgora(), gravar = true) {
  const i = insumo(insumoId); if (!i) return 0;
  const dif = r2(contado - saldo(i)); if (!dif) return 0;
  registrarMov(i, 'ajuste', dif, motivo, quem);
  i.estoque = r2(contado); i.geracao = Date.now(); // contagem nova: as baixas antigas param de contar
  if (gravar) grava(); return dif;
}
// o que cada venda gastou de cada insumo, pela ficha técnica (para o histórico e o CMV)
export function consumoVenda(v) {
  const m = {};
  (v.itens || []).forEach((i) => { const p = prod(i.prod); const kg = i.kg || (p?.porKg && p.preco ? i.preco / p.preco : 0); const fator = (kg || i.qtd) * (i.fator || 1);
    fichaDoItem(i).forEach((f) => { m[f.insumo] = (m[f.insumo] || 0) + f.qtd * fator; }); });
  return m;
}
// custo teórico da venda (ficha técnica × preço de compra de hoje)
export const custoVenda = (v) => r2(Object.entries(consumoVenda(v)).reduce((s, [id, q]) => { const i = insumo(id); return s + (i ? (q / (i.fator || 1)) * (i.custo || 0) : 0); }, 0));
// doses de garrafa: o estoque aparece em garrafas fracionadas (fator = doses por garrafa)
export const fmtQtd = (q, unid, fator = 0) => unid === 'dose' && fator > 0 ? `${(q / fator).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} garrafas (${Number(q).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} doses)`
  : unid === 'g' && Math.abs(q) >= 1000 ? `${(q / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`
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
    const p = prod(i?.prod); if (!p || p.porKg || p.ativo === false || !noTurno(p, db.categorias, lojaCfg().turnos)) return null; // por quilo só no balcão; fora do turno não entra
    const qtd = Math.min(30, Math.max(1, Math.round(Number(i.qtd) || 1)));
    const tam = p.tamanhos?.some((x) => x.nome === i.tam) ? i.tam : '';
    const ext = { mods: modulosAtivos(lojaCfg()) };
    const adic = aplicarCota(p, (Array.isArray(i.adic) ? i.adic : []).map((a) => opcaoReal(p, a?.nome, ext) || bordaReal(p, a?.nome, tam)).filter(Boolean), ext);
    const b = i.meia && prod(i.meia.b); const meia = p.pizza && b?.pizza ? { a: p.id, b: b.id } : null;
    const sabores = p.pizza && Array.isArray(i.sabores) ? i.sabores.map(prod).filter((x) => x?.pizza && x.ativo !== false).map((x) => x.id).slice(0, 4) : null;
    const combo = p.combo?.length && Array.isArray(i.combo) && !faltaCombo(p.combo, i.combo.map((x) => ({ g: Number(x?.g), prod: String(x?.prod) }))) ? i.combo.map((x) => ({ g: Number(x.g), prod: String(x.prod) })) : null;
    return { prod: p.id, qtd, obs: String(i.obs || '').slice(0, 160), adic, meia, tam, sabores, combo, ...(['acomp', 'bebida'].includes(i.comboUp) ? { comboUp: i.comboUp, qtd: 1 } : {}) };
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
    } else if (r.tipo === 'reserva') {
      if (!tem('reservas') || (db.reservas || []).some((x) => x.id === id)) return;
      const x = reservaLimpa(d); if (!x) return;
      (db.reservas ||= []).push({ id, ...x, status: 'pendente', origem: 'Cardápio online', criado: ts }); novos++;
    } else if (r.tipo === 'delivery' || r.tipo === 'balcao') {
      const itens = itensLimpos(d.itens); if (!itens.length) return;
      if (comanda(id)) return;
      const para = encomendaValida(d.para);
      const c = novoPedido(r.tipo, { nome: String(d.nome || '').slice(0, 80), tel: String(d.tel || ''), end: r.tipo === 'delivery' ? String(d.end || '').slice(0, 160) : '', bairro: r.tipo === 'delivery' ? String(d.bairro || '') : '' },
        { origem: 'Cardápio online', pagarNaEntrega: String(d.pagar || '').slice(0, 60), id, ...(para ? { encomenda: { para } } : {}) });
      itens.forEach((i) => { if (adicionarItem(c, { prodId: i.prod, qtd: i.qtd, obs: i.obs, adic: i.adic, meia: i.meia, tam: i.tam, sabores: i.sabores, combo: i.combo }) && i.comboUp) c.itens.at(-1).comboUp = i.comboUp; });
      if (tem('comboEtapas')) aplicarComboEtapas(c.itens, lojaCfg(), prod); // desconto do combo em etapas, conferido aqui
      if (d.cupom) aplicarCupom(c, String(d.cupom).slice(0, 24)); // o restaurante confere o cupom de novo com as regras dele
      novos++;
    }
  });
  if (novos) { grava(); dispatchEvent(new CustomEvent('popina-chegou', { detail: novos })); }
};

// ------------------------------------------------------------------ loja: a cara do restaurante e as regras do cardápio online
export const LOJA_PADRAO = {
  cor: '#B4532F', tema: 'claro', template: 'basico', estilo: 'moderno', creditos: true, logo: '', capa: '', boasVindas: '', endereco: '', instagram: '', aviso: '',
  // horários por dia da semana (0 = domingo): lista de turnos [abre, fecha]; fecha depois da meia-noite vale ("18:00", "01:00")
  horarios: [[['11:00', '15:00']], [], [['11:00', '15:00'], ['18:00', '23:00']], [['11:00', '15:00'], ['18:00', '23:00']], [['11:00', '15:00'], ['18:00', '23:00']], [['11:00', '15:00'], ['18:00', '23:59']], [['11:00', '15:30'], ['18:00', '23:59']]],
  aceitaQR: true, delivery: true, retirada: true, pedidoMinimo: 0, tempoEntrega: '40 a 60 min', tempoRetirada: '20 a 30 min',
  pagamentos: ['Pix', 'Cartão na entrega', 'Dinheiro'], areas: [], couvert: 0, comissao: 10,
  // alertas (minutos): mesa sem atenção no salão e comanda atrasada na cozinha
  alertas: { mesa: 25, kds: 10 },
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
  // cartão fidelidade: um carimbo por compra paga com produtos que valem, a partir do valor mínimo
  if (tem('fidelidade')) {
    const F = fidelidade(); vencerPremio(x, F);
    const val = valorFidelidade(c, F);
    if (val > 0 && val >= F.minimo) { x.carimbos = (x.carimbos || 0) + 1; histFid(x, 'carimbo', val); if (x.carimbos >= F.compras && !x.premioDesde) x.premioDesde = Date.now(); }
  }
}
// alvo '' = a compra toda; 'cat' ou 'prod' = só o que está em ids conta para o mínimo e para ganhar o carimbo
export const FIDELIDADE_PADRAO = { compras: 10, premio: 'Um prato à sua escolha', minimo: 0, alvo: '', ids: [], validade: 0 };
export const fidelidade = () => ({ ...FIDELIDADE_PADRAO, ...(lojaCfg().fidelidade || {}) });
export function valorFidelidade(c, F = fidelidade()) {
  if (!F.alvo || !(F.ids || []).length) return conta(c).total;
  return r2(itensValidos(c).filter((i) => (F.alvo === 'cat' ? F.ids.includes(prod(i.prod)?.cat) : F.ids.includes(i.prod))).reduce((s, i) => s + valorItem(i), 0));
}
function histFid(x, tipo, valor = 0) { (x.histFid ||= []).push({ t: Date.now(), tipo, ...(valor ? { valor: r2(valor) } : {}) }); if (x.histFid.length > 120) x.histFid.splice(0, x.histFid.length - 120); }
// prêmio liberado vale N dias (0 = não vence); vencido, os carimbos do cartão completo saem
export const vencePremio = (x, F = fidelidade()) => (F.validade > 0 && x?.premioDesde && (x.carimbos || 0) >= F.compras ? x.premioDesde + F.validade * 864e5 : 0);
function vencerPremio(x, F) {
  const v = vencePremio(x, F); if (!v || Date.now() <= v) return false;
  x.carimbos -= F.compras; histFid(x, 'venceu'); x.premioDesde = x.carimbos >= F.compras ? Date.now() : null; return true;
}
export function darPremio(x, quem = quemAgora()) {
  const F = fidelidade(); if (!x) return false;
  if (vencerPremio(x, F)) { grava(); return false; }
  if ((x.carimbos || 0) < F.compras) return false;
  x.carimbos -= F.compras; x.premios = (x.premios || 0) + 1; histFid(x, 'premio'); x.premioDesde = x.carimbos >= F.compras ? Date.now() : null;
  auditar('premio', { quem, item: F.premio, motivo: `Cartão fidelidade de ${x.nome || x.tel}` }); grava(); return true;
}

// ------------------------------------------------------------------ reservas e encomendas (o que vem do cardápio do cliente é conferido aqui)
export function reservaLimpa(d = {}) {
  const data = /^\d{4}-\d{2}-\d{2}$/.test(d.data || '') ? d.data : '', hora = /^\d{2}:\d{2}$/.test(d.hora || '') ? d.hora : '';
  const nome = String(d.nome || '').trim().slice(0, 80), pessoas = Math.min(60, Math.max(1, Math.round(Number(d.pessoas) || 0)));
  if (!data || !hora || !nome) return null;
  return { data, hora, nome, tel: String(d.tel || '').replace(/\D/g, '').slice(0, 13), pessoas, obs: String(d.obs || '').slice(0, 160), mesa: 0,
    ...(d.restricoes ? { restricoes: String(d.restricoes).slice(0, 160) } : {}), ...(d.ocasiao ? { ocasiao: String(d.ocasiao).slice(0, 60) } : {}) };
}
// encomenda: data e hora futuras respeitando a antecedência mínima (em horas)
export const antecedencia = () => Math.max(0, Number(lojaCfg().encomendas?.antecedencia ?? 24));
export function encomendaValida(para) {
  const ts = typeof para === 'number' ? para : Date.parse(para || ''); if (!ts || !tem('encomendas')) return 0;
  return ts >= Date.now() + antecedencia() * 3600e3 - 5 * 60e3 && ts < Date.now() + 120 * 864e5 ? ts : 0;
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
