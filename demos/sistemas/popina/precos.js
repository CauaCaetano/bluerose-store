// Popina · regras de preço das funções da casa, sem depender da tela nem dos dados: rodízio, happy hour, prato do dia,
// pizza em frações com borda, combos e consumação mínima. O sistema da equipe e o cardápio do cliente usam as mesmas contas.
export const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const min = (h) => { const [a, b] = String(h || '0:0').split(':').map(Number); return (a || 0) * 60 + (b || 0); };
export const ymd = (ts = Date.now()) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// ---------------------------------------------------------------- rodízio: preço por pessoa (adulto, criança, meia)
export const TIPOS_RODIZIO = [['adulto', 'Adulto'], ['crianca', 'Criança'], ['meia', 'Meia (terceira idade)']];
export function valorRodizio(cfg = {}, qtd = {}) {
  return r2(TIPOS_RODIZIO.reduce((s, [k]) => s + (Number(qtd[k]) || 0) * (Number(cfg[k]) || 0), 0));
}
export const pessoasRodizio = (qtd = {}) => TIPOS_RODIZIO.reduce((s, [k]) => s + (Number(qtd[k]) || 0), 0);
export const inclusoRodizio = (cfg = {}, prodId) => (cfg.inclusos || []).includes(prodId);
// pedido por rodada: quantas peças inclusas ainda cabem nesta rodada (porPessoa × pessoas − já pedido)
export function cabeNaRodada(cfg = {}, pessoas = 1, jaPedido = 0, novo = 1) {
  const lim = (Number(cfg.porRodada) || 0) * Math.max(1, pessoas);
  if (!lim) return { ok: true, limite: 0, resta: Infinity };
  const resta = Math.max(0, lim - jaPedido);
  return { ok: novo <= resta, limite: lim, resta };
}

// ---------------------------------------------------------------- happy hour: dias da semana, janela de horário, produtos ou categorias
export function naJanela(regra, agora = new Date()) {
  if (!regra || regra.ativo === false || !(regra.dias || []).length) return false;
  const m = agora.getHours() * 60 + agora.getMinutes(), de = min(regra.de), ate = min(regra.ate), dia = agora.getDay();
  if (ate > de) return regra.dias.includes(dia) && m >= de && m < ate;
  // passa da meia-noite (ex.: 22:00 às 01:00): depois da meia-noite vale a regra do dia anterior
  return (regra.dias.includes(dia) && m >= de) || (regra.dias.includes((dia + 6) % 7) && m < ate);
}
export const vale = (regra, p) => (regra.alvo === 'cat' ? (regra.ids || []).includes(p.cat) : (regra.ids || []).includes(p.id));
export function precoHappy(regra, base) {
  const v = Number(regra.valor) || 0;
  return r2(Math.max(0, regra.tipo === '%' ? base * (1 - v / 100) : Math.min(base, v)));
}
// a regra de happy hour que vale agora para este produto (a de maior desconto)
export function happyAgora(regras = [], p, base, agora = new Date()) {
  const l = regras.filter((x) => naJanela(x, agora) && vale(x, p)).map((x) => ({ regra: x, preco: precoHappy(x, base) }));
  return l.sort((a, b) => a.preco - b.preco)[0] || null;
}

// ---------------------------------------------------------------- prato do dia: um prato por dia da semana (0 = domingo) com preço especial
export function pratoDoDia(lista = [], agora = new Date()) { const x = lista?.[agora.getDay()]; return x?.prod ? x : null; }

// preço do produto agora (sem tamanho ou no tamanho escolhido), com o motivo: prato do dia ou happy hour
// mods: Set das funções ligadas; loja: a configuração da loja (pratoDoDia, happyHour)
export function precoAgora(p, base, { loja = {}, mods = new Set(), tam = '', agora = new Date() } = {}) {
  let melhor = { preco: r2(base), motivo: '' };
  if (mods.has('pratoDoDia') && !tam) { const d = pratoDoDia(loja.pratoDoDia, agora); if (d && d.prod === p.id && Number(d.preco) > 0 && d.preco < melhor.preco) melhor = { preco: r2(d.preco), motivo: 'Prato do dia' }; }
  if (mods.has('happyHour')) { const h = happyAgora(loja.happyHour, p, base, agora); if (h && h.preco < melhor.preco) melhor = { preco: h.preco, motivo: 'Happy hour', ate: h.regra.ate }; }
  return melhor;
}

// ---------------------------------------------------------------- pizza em frações: 1/2, 1/3, 1/4 e borda por tamanho
// precos: o preço de cada sabor no tamanho escolhido; regra: 'caro' (o sabor mais caro) ou 'proporcional' (média dos sabores)
export function precoFracoes(precos = [], regra = 'caro') {
  const l = precos.map(Number).filter((x) => x >= 0); if (!l.length) return 0;
  return r2(regra === 'proporcional' ? l.reduce((s, x) => s + x, 0) / l.length : Math.max(...l));
}
// preço da borda no tamanho (precos: um valor por tamanho, do menor para o maior; sem tamanho, o último)
export function precoBorda(borda, idxTam = -1) {
  const l = (borda?.precos || []).map(Number); if (!l.length) return r2(borda?.preco || 0);
  return r2(idxTam >= 0 && idxTam < l.length ? l[idxTam] : l[l.length - 1]);
}
export const FRACAO_NOME = { 1: 'inteira', 2: '1/2', 3: '1/3', 4: '1/4' };

// ---------------------------------------------------------------- combos: grupos com os produtos permitidos e preço fechado
// escolha: [{ g: índice do grupo, prod }]; devolve o que está faltando ('' quando está tudo certo)
export function faltaCombo(combo = [], escolha = []) {
  for (let g = 0; g < combo.length; g++) {
    const e = escolha.find((x) => x.g === g);
    if (!e) return `Escolha: ${combo[g].nome}`;
    if (!(combo[g].itens || []).includes(e.prod)) return `Opção inválida em ${combo[g].nome}`;
  }
  return '';
}

// ---------------------------------------------------------------- consumação mínima (portaria): cobra a diferença quando consumiu menos
export const faltaConsumacao = (consumo, minimo) => r2(Math.max(0, (Number(minimo) || 0) - (Number(consumo) || 0)));

// ---------------------------------------------------------------- alergênicos
export const ALERGENOS = [['gluten', 'Glúten', 'contem'], ['lactose', 'Lactose', 'contem'], ['ovo', 'Ovo', 'contem'], ['amendoim', 'Amendoim', 'contem'], ['frutosmar', 'Frutos do mar', 'contem'],
  ['vegano', 'Vegano', 'dieta'], ['vegetariano', 'Vegetariano', 'dieta'], ['semacucar', 'Sem açúcar', 'dieta']];
// filtro do cliente: "Sem glúten" esconde quem contém glúten; "Vegano" mostra só quem é vegano
export function passaFiltro(p, filtros = []) {
  const a = p.alergenos || [];
  return filtros.every((f) => { const x = ALERGENOS.find((y) => y[0] === f); if (!x) return true; return x[2] === 'contem' ? !a.includes(f) : a.includes(f); });
}
export const ETAPAS = [['entrada', 'Entrada'], ['principal', 'Principal'], ['sobremesa', 'Sobremesa']];
export const ordemEtapa = (e) => { const k = ETAPAS.findIndex((x) => x[0] === e); return k < 0 ? -1 : k; };

// ---------------------------------------------------------------- pedido por rodada por categoria
// cfg.rodadaCat: { [categoria]: peças por pessoa } (0 = sem limite nesta categoria); categoria fora da lista usa o limite geral (porRodada)
export function limiteRodada(cfg = {}, cat = '') {
  const m = cfg.rodadaCat || {};
  if (cat && m[cat] != null && m[cat] !== '') return { chave: cat, porPessoa: Math.max(0, Number(m[cat]) || 0) };
  return { chave: '', porPessoa: Math.max(0, Number(cfg.porRodada) || 0) };
}
// itens: [{ cat, qtd }] peças inclusas desta rodada (ainda não entregues); só conta quem divide o mesmo limite
export function cabeNaRodadaCat(cfg = {}, pessoas = 1, itens = [], cat = '', novo = 1) {
  const L = limiteRodada(cfg, cat);
  const ja = itens.filter((i) => limiteRodada(cfg, i.cat).chave === L.chave).reduce((s, i) => s + (Number(i.qtd) || 0), 0);
  return { ...cabeNaRodada({ porRodada: L.porPessoa }, pessoas, ja, novo), cat: L.chave };
}

// ---------------------------------------------------------------- horários do dia
export const minDia = (agora = new Date()) => agora.getHours() * 60 + agora.getMinutes();
// janela ['11:00', '15:00'] (pode passar da meia-noite)
export function naFaixa(j, agora = new Date()) {
  if (!Array.isArray(j) || !j[0] || !j[1]) return false;
  const m = minDia(agora), de = min(j[0]), ate = min(j[1]);
  return ate > de ? m >= de && m < ate : m >= de || m < ate;
}
// cortesia "até 00:30": antes do meio-dia conta como a madrugada da mesma noite
export function antesDe(ate, agora = new Date()) {
  if (!ate) return true;
  const aj = (m) => (m < 12 * 60 ? m + 1440 : m);
  return aj(minDia(agora)) <= aj(min(ate));
}
// a noite da casa (balada): antes do meio-dia ainda é a noite de ontem
export const noite = (ts = Date.now()) => ymd(ts - 12 * 3600e3);

// ---------------------------------------------------------------- quilo: preço por horário
// p.faixasKg = [{ de: '14:30', preco: 49.9 }]: antes da primeira faixa vale p.preco
export function precoKg(p = {}, agora = new Date()) {
  const m = minDia(agora), l = (p.faixasKg || []).filter((f) => f && /^\d{1,2}:\d{2}$/.test(f.de || '') && Number(f.preco) > 0).sort((a, b) => min(a.de) - min(b.de));
  let preco = Number(p.preco) || 0, desde = '', ate = '';
  for (const f of l) { if (m >= min(f.de)) { preco = Number(f.preco); desde = f.de; } else { ate = f.de; break; } }
  return { preco: r2(preco), desde, ate, varia: l.length > 0 };
}

// ---------------------------------------------------------------- cardápio por turno (almoço e jantar)
export const TURNOS = [['almoco', 'Almoço'], ['jantar', 'Jantar']];
// cfg = { ligado, almoco: ['11:00','15:00'], jantar: ['18:00','23:30'] }; o turno vem do prato ou, sem ele, da categoria
export const turnoDe = (p = {}, cats = []) => p.turno || cats.find((c) => c.id === p.cat)?.turno || '';
export function noTurno(p, cats = [], cfg = {}, agora = new Date()) {
  if (!cfg?.ligado) return true;
  const tu = turnoDe(p, cats); if (!tu || !cfg[tu]) return true;
  return naFaixa(cfg[tu], agora);
}

// ---------------------------------------------------------------- chopp por barril
// barril = { litros, usado: { aparelho: ml } }; mlCopo: o ml do produto (para os copos que ainda saem)
export const mlUsado = (b) => Object.values(b?.usado || {}).reduce((s, x) => s + (Number(x) || 0), 0);
export function estadoBarril(b = {}, mlCopo = 0) {
  const cap = (Number(b.litros) || 0) * 1000, usado = Math.max(0, mlUsado(b)), resta = Math.max(0, cap - usado);
  return { cap, usado, resta, litros: r2(resta / 1000), pct: cap ? Math.round((resta / cap) * 100) : 0,
    copos: mlCopo ? Math.floor(resta / mlCopo) : 0, esperados: mlCopo ? Math.floor(cap / mlCopo) : 0, vendidos: mlCopo ? Math.round(usado / mlCopo) : 0 };
}
// trocar o barril: o que o sistema diz que ainda tinha vira a perda (espuma, fundo); rendimento = vendido ÷ capacidade
export function fecharBarril(b = {}) { const e = estadoBarril(b); return { perdaMl: e.resta, rendimento: e.cap ? Math.round((e.usado / e.cap) * 1000) / 10 : 0 }; }
// ml que uma venda tira do barril (o tamanho multiplica pelo fator)
export const mlDaVenda = (mlCopo, qtd = 1, fator = 1) => r2((Number(mlCopo) || 0) * (Number(qtd) || 0) * (Number(fator) || 1));

// ---------------------------------------------------------------- portaria: lotes de ingresso e lotação com reentrada
// lotes = [{ nome, preco, qtd }] (qtd 0 = sem limite); vale o primeiro lote que ainda tem ingresso; null = esgotou
export function loteAtual(lotes = [], vendidos = {}) {
  for (let k = 0; k < lotes.length; k++) {
    const l = lotes[k], v = Number(vendidos[l.nome]) || 0, q = Number(l.qtd) || 0;
    if (!q || v < q) return { k, lote: l, resta: q ? q - v : Infinity };
  }
  return null;
}
// entradas = [{ saidas, voltas, saiu }]: dentro agora = entradas − saídas + reentradas (a saída final conta como saída)
export function lotacao(entradas = []) {
  let e = 0, s = 0, r = 0;
  entradas.forEach((x) => { e++; s += (Number(x.saidas) || 0) + (x.saiu ? 1 : 0); r += Number(x.voltas) || 0; });
  return { entradas: e, saidas: s, reentradas: r, dentro: Math.max(0, e - s + r) };
}

// ---------------------------------------------------------------- divisão da conta por pessoa
// itens = [{ id, valor }]; atrib = { id: [pessoas] } (item dividido igual entre quem foi marcado, os centavos ficam com o último);
// fator leva rodízio, serviço e couvert na proporção; livre[k] troca o valor da pessoa; gorjeta[k] soma à parte
export function dividirPorPessoa({ itens = [], atrib = {}, n = 2, fator = 1, livre = {}, gorjeta = {} } = {}) {
  const base = Array(n).fill(0), its = Array.from({ length: n }, () => []), semDono = [];
  itens.forEach((i) => {
    const ps = [...new Set((atrib[i.id] || []).map(Number).filter((k) => k >= 0 && k < n))];
    if (!ps.length) { semDono.push(i); return; }
    const cents = Math.round((Number(i.valor) || 0) * 100), parte = Math.floor(cents / ps.length);
    ps.forEach((k, j) => { const c = j === ps.length - 1 ? cents - parte * (ps.length - 1) : parte; base[k] += c; its[k].push({ id: i.id, valor: c / 100, partes: ps.length }); });
  });
  const pessoas = base.map((c, k) => {
    const b = r2((c / 100) * fator), lv = livre[k] != null && livre[k] !== '' ? r2(livre[k]) : null, valor = lv ?? b, gj = r2(Math.max(0, Number(gorjeta[k]) || 0));
    return { k, itens: its[k], base: b, livre: lv, valor, gorjeta: gj, cobrar: r2(valor + gj) };
  });
  return { pessoas, semDono, semDonoValor: r2(semDono.reduce((s, i) => s + (Number(i.valor) || 0), 0) * fator), soma: r2(pessoas.reduce((s, p) => s + p.valor, 0)) };
}

// ---------------------------------------------------------------- mesa esquecida: sem item novo e sem atenção há X minutos
export function ultimaAtencao(c = {}) {
  const l = [c.aberta || 0, c.passou || 0];
  (c.itens || []).forEach((i) => l.push(i.enviado || 0, i.entregue || 0));
  (c.hist || []).forEach((h) => l.push(h.t || 0));
  return Math.max(...l);
}
export function esquecidas(comandas = [], minutos = 25, agora = Date.now()) {
  if (!(minutos > 0)) return [];
  return comandas.filter((c) => c.tipo === 'mesa' && !c.pediuConta && !c.pausaRod && !(c.itens || []).some((i) => !i.cancelado && ['novo', 'preparo', 'pronto'].includes(i.status)))
    .map((c) => ({ c, min: Math.floor((agora - ultimaAtencao(c)) / 60e3) })).filter((x) => x.min >= minutos).sort((a, b) => b.min - a.min);
}

// ---------------------------------------------------------------- eventos: orçamento, sinal, parcelas e saldo
export function orcamentoEvento(ev = {}) {
  const prev = Math.max(0, Number(ev.previstos) || (ev.convidados || []).length || 0);
  const pacote = r2(prev * (Number(ev.pacote) || 0)), couvert = r2(prev * (Number(ev.couvert) || 0));
  const extras = r2((ev.orcamento || []).reduce((s, x) => s + (Number(x.valor) || 0), 0)), total = r2(pacote + couvert + extras);
  const sinal = r2(Number(ev.sinal?.valor) || 0), parcelasPagas = r2((ev.parcelas || []).filter((p) => p.pago).reduce((s, p) => s + (Number(p.valor) || 0), 0));
  const aVencer = r2((ev.parcelas || []).filter((p) => !p.pago).reduce((s, p) => s + (Number(p.valor) || 0), 0)), recebido = r2(sinal + parcelasPagas);
  return { previstos: prev, pacote, couvert, extras, total, sinal, parcelasPagas, aVencer, recebido, saldo: r2(Math.max(0, total - recebido)) };
}
