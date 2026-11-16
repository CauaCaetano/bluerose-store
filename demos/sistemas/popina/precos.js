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
