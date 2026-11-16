// Popina · produção: preparos (sub-receitas feitas na casa), aproveitamento (fator de correção), lotes e validade,
// sugestão de compra e produção do dia. Cada tela entra na Gestão (#mais/<id>).
// Um preparo é um insumo com i.preparo = { rende, validade, itens: [{ insumo, qtd }] } (qtd líquida, na unidade do ingrediente).
// Aproveitamento: i.aprov = % (peso líquido ÷ bruto). A ficha técnica guarda o que sai do estoque (bruto): ao mudar o
// aproveitamento, as fichas são reescaladas para manter o líquido; assim o custo do prato e a baixa já contam a perda.
import { db, t, din, dinCurto, grava, r2, uid, insumo, saldo, APARELHO, registrarPerda, consumoVenda, fmtQtd, auditar, quemAgora, ouvir, custoPrato } from './loja.js?v=23';
import { acao, ir } from './nucleo.js?v=23';
import { ico, folha, toast, confirma, $, $$ } from './ui.js?v=23';
import { TELAS_MAIS, MONTAR, volta } from './mais.js?v=23';
import { fornecedor, abrirNovaCompra, criarLote, ymd, somaDias, dataCurta, zap } from './financeiro.js?v=23';

// entradas do hub da Gestão: [id, nome, ícone, detalhe]
export const HUB_PRODUCAO = [
  ['preparos', 'Preparos', 'chef', 'Sub-receitas da casa: custo, rendimento e produção'],
  ['producao', 'Produção do dia', 'check', 'Pré-preparo com as quantidades sugeridas'],
  ['lotes', 'Lotes e validade', 'calendario', 'O que vence, qual usar primeiro e descarte'],
  ['sugestao', 'Sugestão de compra', 'carrinho', 'Quanto pedir de cada fornecedor'],
  ['aproveitamento', 'Aproveitamento', 'folha', 'Fator de correção: peso líquido e bruto'],
  ['rendimento', 'Rendimento real', 'grafico', 'Previsto × real de cada preparo e a perda em R$'],
  ['rastreio', 'Rastreabilidade', 'etiqueta', 'De que lote veio e em que produção foi usado'],
];

const DIA = 864e5;
const num = (v) => { const s = String(v ?? '').trim(); return Number(/,/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s) || 0; };
const vir = (n) => String(n ?? '').replace('.', ',');
const r4 = (v) => Math.round((Number(v) || 0) * 10000) / 10000;
const garantir = () => { db.lotes ||= []; db.producoes ||= []; };

// ------------------------------------------------------------------ aproveitamento (fator de correção)
export const aprov = (i) => { const a = Number(i?.aprov); return a > 0 && a < 100 ? a / 100 : 1; };
// muda o aproveitamento e reescala as fichas dos pratos para o líquido ficar igual (o bruto que sai do estoque muda)
export function setAproveitamento(id, pct, gravar = true) {
  const i = insumo(id); if (!i) return false;
  const antes = aprov(i); pct = Number(pct) || 0;
  if (pct > 0 && pct < 100) i.aprov = r2(pct); else delete i.aprov;
  const depois = aprov(i); if (Math.abs(antes - depois) < 1e-9) return false;
  const k = antes / depois;
  db.produtos.forEach((p) => (p.ficha || []).forEach((f) => { if (f.insumo === id) f.qtd = r4(f.qtd * k); }));
  if (gravar) grava(); return true;
}
// líquido de uma linha da ficha (o que vai no prato) a partir do bruto guardado
export const liquidoFicha = (f) => r4(f.qtd * aprov(insumo(f.insumo)));

// ------------------------------------------------------------------ preparos (sub-receitas)
export const ehPreparo = (i) => !!i?.preparo;
export const preparos = () => db.insumos.filter(ehPreparo);
// custo por unidade da receita (g, ml ou un) de qualquer insumo; preparo soma os ingredientes (bruto = líquido ÷ aproveitamento)
export function custoUnRec(i, visto = new Set()) {
  if (!i) return 0;
  if (!i.preparo) return (Number(i.custo) || 0) / (Number(i.fator) || 1);
  if (visto.has(i.id)) return 0; // receita que usa ela mesma: corta o laço
  const v2 = new Set(visto).add(i.id);
  const tot = (i.preparo.itens || []).reduce((s, x) => { const j = insumo(x.insumo); return s + (j ? (x.qtd / aprov(j)) * custoUnRec(j, v2) : 0); }, 0);
  return tot / (Number(i.preparo.rende) || 1);
}
// o custo do preparo (por unidade de compra) fica gravado no insumo: a ficha dos pratos, o CMV e as margens usam esse valor
export function atualizarCustos() {
  let mudou = false;
  preparos().forEach((i) => { const c = r2(custoUnRec(i) * (Number(i.fator) || 1)); if (Math.abs(c - (Number(i.custo) || 0)) > 0.004) { i.custo = c; mudou = true; } });
  return mudou;
}
export function salvarPreparo({ id = '', nome, unid = 'g', rende, validade = 3, minimo = 0, itens = [] }) {
  let i = id ? insumo(id) : null;
  if (!i) { i = { id: uid('i'), nome: '', unid, compra: unid === 'g' ? 'kg' : unid === 'ml' ? 'L' : 'un', fator: unid === 'un' ? 1 : 1000, estoque: 0, minimo: 0, custo: 0, geracao: Date.now() }; db.insumos.push(i); }
  Object.assign(i, { nome: String(nome || i.nome).trim().slice(0, 60), minimo: Math.max(0, Number(minimo) || 0) });
  if (!id) i.unid = unid;
  i.preparo = { rende: Math.max(0.001, Number(rende) || 1), validade: Math.max(0, Math.round(Number(validade) || 0)), itens: itens.filter((x) => x.insumo !== i.id && insumo(x.insumo) && x.qtd > 0).map((x) => ({ insumo: x.insumo, qtd: r4(x.qtd) })) };
  atualizarCustos(); grava(); return i;
}
// baixa local, pelo mesmo caminho das vendas (chave geração:aparelho), sem brigar com outros aparelhos
function tirar(i, q) { const k = `${i.geracao || 0}:${APARELHO}`; i.baixas ||= {}; i.baixas[k] = r2((i.baixas[k] || 0) + q); }
function mov(i, qtd, motivo, quem) {
  (db.movEstoque ||= []).push({ id: uid('e'), t: Date.now(), insumo: i.id, tipo: 'producao', qtd: r2(qtd), motivo, quem, custo: r2((qtd / (i.fator || 1)) * (i.custo || 0)) });
  if (db.movEstoque.length > 5000) db.movEstoque.splice(0, db.movEstoque.length - 5000);
}
// o que a produção de "qtd" (na unidade do preparo) tira de cada ingrediente (bruto)
export function consumoProducao(i, qtd) {
  const f = qtd / (Number(i.preparo?.rende) || 1);
  return (i.preparo?.itens || []).map((x) => { const j = insumo(x.insumo); return j ? { j, q: r2((x.qtd * f) / aprov(j)) } : null; }).filter(Boolean);
}
// quais lotes de um insumo saem numa baixa de q: primeiro o que vence antes (FEFO); o que não tem lote fica "sem lote"
export function lotesParaBaixa(id, q) {
  let resta = r2(q); const l = [];
  lotesAtivos(id).forEach((x) => { if (resta <= 0) return; const u = r2(Math.min(resta, x.resta)); if (u > 0) { l.push({ lote: x.id, qtd: u }); resta = r2(resta - u); } });
  return l;
}
// produzir: tira os ingredientes (pela receita prevista), soma no estoque o que rendeu de fato e cria o lote com a validade.
// Guarda de que lote saiu cada ingrediente (rastreabilidade) e o previsto × real (rendimento)
export function produzir(id, qtd, { data = ymd(), validade = null, quem = quemAgora(), real = null } = {}) {
  garantir();
  const i = insumo(id); qtd = r2(qtd); if (!ehPreparo(i) || !(qtd > 0)) return null;
  const rendeu = real == null || !(Number(real) >= 0) ? qtd : r2(Number(real));
  const cons = consumoProducao(i, qtd), custo = r2(cons.reduce((s, { j, q }) => s + q * custoUnRec(j), 0));
  const usados = cons.map(({ j, q }) => ({ j, q, lotes: lotesParaBaixa(j.id, q) }));
  cons.forEach(({ j, q }) => { tirar(j, q); mov(j, -q, `Produção: ${i.nome}`, quem); });
  i.estoque = r2((i.estoque || 0) + rendeu); mov(i, rendeu, 'Produção', quem);
  const pid = uid('pr'), dias = validade ?? i.preparo.validade ?? 3, lote = rendeu > 0 ? criarLote({ insumo: i.id, qtd: rendeu, validade: somaDias(data, dias), origem: 'producao', ref: pid, data }) : null;
  db.producoes.push({ id: pid, insumo: i.id, qtd: rendeu, previsto: qtd, real: rendeu, data, ts: Date.now(), lote: lote?.id || '', custo, quem, consumo: usados.map(({ j, q, lotes }) => ({ insumo: j.id, qtd: q, lotes })) });
  if (db.producoes.length > 2000) db.producoes.splice(0, db.producoes.length - 2000);
  atualizarCustos();
  auditar('producao', { quem, item: i.nome, qtd: fmtQtd(rendeu, i.unid), valor: custo, motivo: `Produção${rendeu < qtd ? ` · rendeu ${fmtQtd(rendeu, i.unid)} de ${fmtQtd(qtd, i.unid)} previstos` : ''}${lote ? ` · lote vence ${dataCurta(lote.validade)}` : ''}` });
  grava(); return lote || { id: '', validade: data };
}

// ------------------------------------------------------------------ lotes e validade
// o saldo é distribuído do lote mais novo para o mais velho (quem usa primeiro o mais velho: o que sobra é o mais novo)
export function lotesAtivos(id) {
  garantir();
  const i = insumo(id); if (!i) return [];
  let resta = Math.max(0, saldo(i));
  return db.lotes.filter((l) => l.insumo === id && !l.descartado).sort((a, b) => b.criado - a.criado)
    .map((l) => { const r = Math.min(l.qtd, resta); resta = r2(resta - r); return { ...l, resta: r2(r) }; }).filter((l) => l.resta > 0.0001)
    .sort((a, b) => a.validade.localeCompare(b.validade));
}
export const todosLotes = () => [...new Set((db.lotes || []).filter((l) => !l.descartado).map((l) => l.insumo))].flatMap(lotesAtivos);
export function vencendo(dias = 3, hoje = ymd()) { const lim = somaDias(hoje, dias); return todosLotes().filter((l) => l.validade <= lim).sort((a, b) => a.validade.localeCompare(b.validade)); }
const situLote = (l, hoje = ymd()) => (l.validade < hoje ? 'vencido' : l.validade === hoje ? 'hoje' : l.validade === somaDias(hoje, 1) ? 'amanha' : l.validade <= somaDias(hoje, 3) ? 'perto' : 'ok');
const NOME_LOTE = { vencido: 'Vencido', hoje: 'Vence hoje', amanha: 'Vence amanhã', perto: 'Vence logo', ok: 'No prazo' };
// FEFO: com mais de um lote, usar primeiro o que vence antes
export function fefo() {
  const m = {}; todosLotes().forEach((l) => { (m[l.insumo] ||= []).push(l); });
  return Object.entries(m).filter(([, l]) => l.length > 1).map(([id, l]) => ({ insumo: insumo(id), lote: l[0], outros: l.length - 1 }));
}
// descarta o que resta do lote como perda "Vencido" (a mesma perda da tela de Estoque)
export function descartarLote(loteId) {
  const l = (db.lotes || []).find((x) => x.id === loteId); if (!l || l.descartado) return 0;
  const a = lotesAtivos(l.insumo).find((x) => x.id === l.id), q = a ? a.resta : 0;
  l.descartado = { ts: Date.now(), qtd: q, quem: quemAgora() };
  if (q > 0) registrarPerda(l.insumo, q, `Vencido: lote de ${dataCurta(l.data)}`); else grava();
  return q;
}

// ------------------------------------------------------------------ consumo médio, sugestão de compra e de produção
// consumo por insumo nos últimos N dias: vendas (pela ficha técnica) + ingredientes usados nas produções
export function consumoPeriodo(dias = 14, agora = Date.now()) {
  const de = agora - dias * DIA, m = {};
  db.vendas.filter((v) => v.ts >= de && v.ts <= agora && (!v.cancelado || (v.cancelado.estoque === false && !v.cancelado.reaberta))).forEach((v) => Object.entries(consumoVenda(v)).forEach(([id, q]) => { m[id] = (m[id] || 0) + q; }));
  (db.movEstoque || []).filter((x) => (x.tipo === 'producao' || x.tipo === 'consumo') && x.qtd < 0 && x.t >= de && x.t <= agora).forEach((x) => { m[x.insumo] = (m[x.insumo] || 0) - x.qtd; });
  return m;
}
export const consumoMedio = (id, dias = 14, m = consumoPeriodo(dias)) => r4((m[id] || 0) / dias);
// por insumo comprado: média por dia, dias de estoque e a quantidade para cobrir (prazo do fornecedor + 7 dias) − estoque − o que já foi pedido
export function sugestaoCompra(dias = 14) {
  garantir();
  const m = consumoPeriodo(dias);
  const pedido = {}; (db.notasCompra || []).filter((n) => n.status !== 'recebida').forEach((n) => n.itens.forEach((it) => { const i = insumo(it.insumo); if (i) pedido[i.id] = (pedido[i.id] || 0) + Math.max(0, it.qtd - (it.recebido || 0)) * (i.fator || 1); }));
  return db.insumos.filter((i) => !ehPreparo(i)).map((i) => {
    const med = (m[i.id] || 0) / dias, fo = fornecedor(i.fornecedor), prazo = fo ? Number(fo.prazo) || 0 : 2, tem = saldo(i), jaPedido = r2(pedido[i.id] || 0);
    const cobre = med * (prazo + 7), falta = Math.max(cobre, Number(i.minimo) || 0) - tem - jaPedido;
    const compra = falta > 0 ? Math.max(1, Math.ceil(falta / (i.fator || 1))) : 0;
    return { insumo: i, med: r4(med), tem, dura: med > 0 ? Math.max(0, tem / med) : Infinity, prazo, cobre: r2(cobre), jaPedido, falta: r2(Math.max(0, falta)), compra, valor: r2(compra * (i.custo || 0)), fornecedor: fo?.id || '' };
  }).filter((x) => x.compra > 0).sort((a, b) => a.dura - b.dura);
}
export function sugestaoPorFornecedor(dias = 14) {
  const g = {}; sugestaoCompra(dias).forEach((x) => { (g[x.fornecedor] ||= []).push(x); });
  return Object.entries(g).map(([id, itens]) => ({ fornecedor: fornecedor(id) || null, id, itens, total: r2(itens.reduce((s, x) => s + x.valor, 0)) })).sort((a, b) => (a.fornecedor ? 0 : 1) - (b.fornecedor ? 0 : 1) || b.total - a.total);
}
export const textoPedido = (grupo) => `Pedido · ${db.config.nome || 'restaurante'}\n${grupo.itens.map((x) => `• ${x.insumo.nome}: ${x.compra} ${x.insumo.compra}`).join('\n')}\nObrigado.`;
// produção do dia: para cada preparo, o que falta para cobrir hoje e amanhã pela média, em receitas inteiras
export function sugestaoProducao(dias = 14) {
  const m = consumoPeriodo(dias);
  return preparos().map((i) => {
    const med = (m[i.id] || 0) / dias, rende = Number(i.preparo.rende) || 1, falta = med * 2 - saldo(i);
    return { insumo: i.id, med: r4(med), tem: saldo(i), qtd: falta > 0 ? Math.ceil(falta / rende) * rende : 0 };
  });
}
export function diaProducao(dia = ymd()) {
  if (db.prodDia?.dia === dia) return db.prodDia;
  return { dia, itens: sugestaoProducao().filter((x) => x.qtd > 0).map((x) => ({ id: `pd-${x.insumo}`, insumo: x.insumo, qtd: x.qtd, feito: 0 })), novo: true };
}
const gravaDia = (d) => { delete d.novo; db.prodDia = d; };

// ================================================================== telas
const custoTxt = (i) => { const c = custoUnRec(i); return i.unid === 'g' ? `${din(c * 1000)}/kg` : i.unid === 'ml' ? `${din(c * 1000)}/L` : `${din(c)}/un`; };
const pill = (cls, txt) => `<em class="fin-st fin-${cls}">${txt}</em>`;

// ---------------- preparos
TELAS_MAIS.preparos = () => {
  garantir(); atualizarCustos();
  const l = preparos().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return volta('mais', 'Preparos', 'Feitos na casa a partir de outros insumos. Entram na ficha técnica dos pratos como qualquer insumo') + `<div class="linha-bts"><button type="button" class="bt cheio" data-acao="prd-preparo">${ico('mais2')}Novo preparo</button><a class="bt" href="#mais/producao">Produção do dia</a><a class="bt" href="#mais/lotes">Lotes e validade</a></div>
    <ul class="lista-res prd-lista">${l.map((i) => { const usa = db.produtos.filter((p) => (p.ficha || []).some((f) => f.insumo === i.id)); const baixo = saldo(i) <= (i.minimo || 0);
      return `<li class="${baixo ? 'prd-baixo' : ''}"><div><b>${t(i.nome)}</b><small>Rende ${fmtQtd(i.preparo.rende, i.unid)} · validade ${i.preparo.validade} ${i.preparo.validade === 1 ? 'dia' : 'dias'} · custo ${custoTxt(i)}</small>
        <small>${(i.preparo.itens || []).map((x) => { const j = insumo(x.insumo); return j ? `${fmtQtd(x.qtd, j.unid)} ${t(j.nome)}${aprov(j) < 1 ? ` (${fmtQtd(r2(x.qtd / aprov(j)), j.unid)} bruto)` : ''}` : ''; }).filter(Boolean).join(' · ') || 'Sem ingredientes'}</small>
        <small>${usa.length ? `Usado em ${usa.slice(0, 4).map((p) => t(p.nome)).join(', ')}${usa.length > 4 ? ` e mais ${usa.length - 4}` : ''}` : 'Ainda não está na ficha de nenhum prato'}</small></div>
        <div class="res-bts"><span class="prd-tem ${baixo ? 'erro' : ''}">Tem ${fmtQtd(saldo(i), i.unid)}</span><button type="button" class="bt cheio pq" data-acao="prd-produzir" data-i="${i.id}">Produzir</button><button type="button" class="bt-ico" data-acao="prd-preparo" data-i="${i.id}" aria-label="Editar ${t(i.nome)}">${ico('ajustes')}</button></div></li>`; }).join('') || '<li class="vazio">Nenhum preparo ainda. Ex.: molho de tomate feito de tomate, cebola e azeite, que rende 5 L.</li>'}</ul>`;
};
acao('prd-preparo', (b) => {
  const ed = insumo(b.dataset.i), novo = !ed;
  const cands = db.insumos.filter((i) => !ehPreparo(i));
  let itens = (ed?.preparo?.itens || []).map((x) => ({ ...x })); if (!itens.length) itens = [{ insumo: db.insumos.find((i) => i !== ed)?.id || '', qtd: 0 }];
  const linhas = () => itens.map((x, k) => { const j = insumo(x.insumo); return `<li><select data-pi="${k}" aria-label="Ingrediente">${db.insumos.filter((y) => y !== ed).map((y) => `<option value="${y.id}" ${y.id === x.insumo ? 'selected' : ''}>${t(y.nome)}${ehPreparo(y) ? ' (preparo)' : ''}</option>`).join('')}</select>
    <input data-pq="${k}" inputmode="decimal" value="${x.qtd ? vir(x.qtd) : ''}" placeholder="Líquido" aria-label="Quantidade líquida"><small data-pu="${k}">${t(j?.unid || '')}${aprov(j) < 1 ? ` · ${Math.round(aprov(j) * 100)}%` : ''}</small><button type="button" class="bt-ico" data-ptira="${k}" aria-label="Tirar ingrediente">${ico('lixo')}</button></li>`; }).join('');
  folha({ titulo: novo ? 'Novo preparo' : ed.nome, larga: true, corpo: `${novo && cands.length ? `<label class="campo"><span>Transformar um insumo que já existe (opcional)</span><select data-conv><option value="">Não, criar um insumo novo</option>${cands.map((i) => `<option value="${i.id}">${t(i.nome)}</option>`).join('')}</select></label>` : ''}
    <label class="campo"><span>Nome</span><input data-n maxlength="60" value="${t(ed?.nome || '')}" placeholder="Ex.: Molho de tomate da casa"></label>
    <div class="tres-c"><label class="campo"><span>Unidade</span><select data-u ${novo ? '' : 'disabled'}>${[['g', 'gramas (g)'], ['ml', 'mililitros (ml)'], ['un', 'unidades']].map(([v, n]) => `<option value="${v}" ${(ed?.unid || 'g') === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="campo"><span>Rende (na unidade)</span><input data-r inputmode="decimal" value="${ed?.preparo ? vir(ed.preparo.rende) : ''}" placeholder="Ex.: 5000"></label><label class="campo"><span>Validade (dias)</span><input data-v inputmode="numeric" value="${ed?.preparo?.validade ?? 3}"></label></div>
    <label class="campo"><span>Avisar abaixo de (na unidade)</span><input data-m inputmode="decimal" value="${vir(ed?.minimo || 0)}"></label>
    <div class="campo"><span>Ingredientes para uma receita (peso líquido; com aproveitamento, a baixa tira o bruto)</span><ul class="ficha-ed" data-l>${linhas()}</ul><button type="button" class="link" data-mais>+ Ingrediente</button></div>
    <p class="prd-custo" data-custo></p>${novo ? '' : '<button type="button" class="bt perigo" data-tirar>Deixar de ser preparo</button>'}`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
  aoAbrir: (f, fechar) => {
    const ler = () => { itens = itens.map((x, k) => ({ insumo: $(`[data-pi="${k}"]`, f)?.value || x.insumo, qtd: num($(`[data-pq="${k}"]`, f)?.value) })); };
    const custo = () => { ler(); const r = num($('[data-r]', f).value) || 1, u = $('[data-u]', f).value; const tot = itens.reduce((s, x) => { const j = insumo(x.insumo); return s + (j && j !== ed ? (x.qtd / aprov(j)) * custoUnRec(j, new Set(ed ? [ed.id] : [])) : 0); }, 0);
      $('[data-custo]', f).innerHTML = `Custo da receita <b>${din(tot)}</b> · ${u === 'un' ? `${din(tot / r)}/un` : `${din((tot / r) * 1000)}/${u === 'g' ? 'kg' : 'L'}`}`; };
    f.addEventListener('input', custo);
    f.addEventListener('change', (e) => { const s = e.target.closest('[data-pi]'); if (s) { const j = insumo(s.value); $(`[data-pu="${s.dataset.pi}"]`, f).textContent = `${j?.unid || ''}${aprov(j) < 1 ? ` · ${Math.round(aprov(j) * 100)}%` : ''}`; custo(); }
      if (e.target.matches('[data-conv]')) { const j = insumo(e.target.value); if (j) { $('[data-n]', f).value = j.nome; $('[data-u]', f).value = j.unid; $('[data-m]', f).value = vir(j.minimo || 0); } custo(); } });
    $('[data-mais]', f).onclick = () => { ler(); itens.push({ insumo: db.insumos.find((i) => i !== ed)?.id || '', qtd: 0 }); $('[data-l]', f).innerHTML = linhas(); };
    f.addEventListener('click', (e) => { const x = e.target.closest('[data-ptira]'); if (!x) return; ler(); itens.splice(Number(x.dataset.ptira), 1); $('[data-l]', f).innerHTML = linhas(); custo(); });
    $('[data-tirar]', f)?.addEventListener('click', async () => { if (!(await confirma(`${ed.nome} volta a ser um insumo comprado. O estoque e o histórico continuam.`, 'Confirmar'))) return; delete ed.preparo; grava(); fechar(); toast('Agora é um insumo comum'); });
    custo();
    $('[data-ok]', f).onclick = () => {
      ler(); const nome = $('[data-n]', f).value.trim(), rende = num($('[data-r]', f).value);
      if (nome.length < 2) { toast('Escreva o nome do preparo'); return $('[data-n]', f).focus(); }
      if (!(rende > 0)) { toast('Informe quanto a receita rende'); return $('[data-r]', f).focus(); }
      if (!itens.some((x) => x.qtd > 0)) return toast('Informe pelo menos um ingrediente com quantidade');
      const conv = $('[data-conv]', f)?.value || '';
      salvarPreparo({ id: ed?.id || conv, nome, unid: $('[data-u]', f).value, rende, validade: num($('[data-v]', f).value), minimo: num($('[data-m]', f).value), itens });
      fechar(); toast(novo ? 'Preparo criado. Ele já aparece na ficha técnica dos pratos' : 'Preparo salvo');
    };
  } });
});
// produzir um preparo (aoFeito recebe o lote; usado pela produção do dia)
export function abrirProduzir(id, qtd = 0, aoFeito = null) {
  const i = insumo(id); if (!ehPreparo(i)) return;
  const q0 = qtd || i.preparo.rende;
  folha({ titulo: `Produzir ${i.nome}`, corpo: `<div class="tres-c"><label class="campo"><span>Previsto (${t(i.unid)})</span><input data-q inputmode="decimal" value="${vir(q0)}"></label><label class="campo"><span>Data</span><input type="date" data-d value="${ymd()}"></label><label class="campo"><span>Validade (dias)</span><input data-v inputmode="numeric" value="${i.preparo.validade}"></label></div>
    <div class="duas-c"><label class="campo"><span>Rendeu de fato (${t(i.unid)})</span><input data-real inputmode="decimal" value="${vir(q0)}"></label><div class="campo"><span>Rendimento</span><b class="fin-total" data-pct>100%</b></div></div>
    <div class="chips">${[0.5, 1, 2].map((k) => `<button type="button" class="chip" data-x="${k}">${k === 0.5 ? 'Meia receita' : k === 1 ? '1 receita' : '2 receitas'}</button>`).join('')}</div>
    <p class="mudo" style="margin-top:10px">Tira do estoque:</p><ul class="prd-consumo" data-c></ul>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Produzir e criar o lote</button>',
  aoAbrir: (f, fechar) => {
    let realMexido = false; $('[data-real]', f).addEventListener('input', () => { realMexido = true; });
    const pct = () => { const q = num($('[data-q]', f).value), r = num($('[data-real]', f).value), p2 = q ? Math.round((r / q) * 1000) / 10 : 0; const el = $('[data-pct]', f); el.textContent = `${vir(p2)}%${p2 < rendMin() ? ' · abaixo do esperado' : ''}`; el.className = `fin-total ${p2 < rendMin() ? 'erro' : ''}`; };
    f.addEventListener('input', pct);
    const prev = () => { if (!realMexido) $('[data-real]', f).value = $('[data-q]', f).value; pct(); const q = num($('[data-q]', f).value); $('[data-c]', f).innerHTML = consumoProducao(i, q).map(({ j, q: c }) => `<li><span>${t(j.nome)}</span><b class="${saldo(j) < c ? 'erro' : ''}">${fmtQtd(c, j.unid)}</b><small>tem ${fmtQtd(saldo(j), j.unid)}</small></li>`).join('') || '<li>Sem ingredientes na receita.</li>'; };
    $('[data-q]', f).oninput = prev; $$('[data-x]', f).forEach((x) => { x.onclick = () => { $('[data-q]', f).value = vir(r2(i.preparo.rende * Number(x.dataset.x))); prev(); }; }); prev();
    $('[data-ok]', f).onclick = () => {
      const q = num($('[data-q]', f).value); if (!(q > 0)) return toast('Informe a quantidade');
      const rv = $('[data-real]', f).value.trim(), real = rv === '' ? q : Math.max(0, num(rv));
      const lote = produzir(i.id, q, { data: $('[data-d]', f).value || ymd(), validade: Math.max(0, Math.round(num($('[data-v]', f).value))), real });
      fechar(); if (lote) { toast(`${fmtQtd(real, i.unid)} de ${i.nome} no estoque${real < q - 0.0001 ? ` (${Math.round((real / q) * 100)}% do previsto)` : ''} · vence ${dataCurta(lote.validade)}`); aoFeito?.(lote); }
    };
  } });
}
acao('prd-produzir', (b) => abrirProduzir(b.dataset.i, num(b.dataset.q)));

// ---------------- produção do dia (pré-preparo)
TELAS_MAIS.producao = () => {
  garantir();
  const d = diaProducao(), sug = Object.fromEntries(sugestaoProducao().map((x) => [x.insumo, x])), feitos = d.itens.filter((x) => x.feito).length;
  return volta('mais', 'Produção do dia', `${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} · ${feitos} de ${d.itens.length} feitos`) + `
    <p class="mudo">Sugestão pela média de consumo dos últimos 14 dias para cobrir hoje e amanhã, em receitas inteiras. Ajuste a quantidade e marque como feito: tira os ingredientes e cria o lote.</p>
    <div class="linha-bts"><button type="button" class="bt" data-acao="prd-dia-mais">${ico('mais2')}Pôr preparo na lista</button><button type="button" class="bt" data-acao="prd-dia-refazer">Refazer a sugestão</button><a class="bt" href="#mais/preparos">Preparos</a></div>
    <ul class="prd-check">${d.itens.map((x) => { const i = insumo(x.insumo); if (!i) return ''; const s = sug[i.id];
      return `<li class="${x.feito ? 'feito' : ''}"><button type="button" class="prd-marca" data-acao="prd-dia-feito" data-id="${x.id}" ${x.feito ? 'disabled' : ''} aria-label="${x.feito ? 'Feito' : `Marcar ${t(i.nome)} como feito`}">${ico('check')}</button>
        <div><b>${t(i.nome)}</b><small>${s ? `consome ${fmtQtd(s.med, i.unid)}/dia · tem ${fmtQtd(saldo(i), i.unid)}` : ''}${x.feito ? ` · feito às ${new Date(x.feito).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}</small></div>
        ${x.feito ? `<b class="prd-q">${fmtQtd(x.qtd, i.unid)}</b>` : `<label class="prd-q"><input data-dia-q="${x.id}" inputmode="decimal" value="${vir(x.qtd)}" aria-label="Quantidade de ${t(i.nome)}"><small>${t(i.unid)}</small></label><button type="button" class="bt-ico" data-acao="prd-dia-tirar" data-id="${x.id}" aria-label="Tirar da lista">${ico('lixo')}</button>`}</li>`; }).join('') || '<li class="vazio">Nada para produzir hoje pela média. Use “Pôr preparo na lista” se quiser adiantar.</li>'}</ul>`;
};
MONTAR.producao = (el) => {
  $$('[data-dia-q]', el).forEach((inp) => { inp.onchange = () => { const d = diaProducao(), x = d.itens.find((y) => y.id === inp.dataset.diaQ); if (!x) return; x.qtd = r2(Math.max(0, num(inp.value))); gravaDia(d); grava(); }; });
};
acao('prd-dia-feito', (b) => {
  const d = diaProducao(), x = d.itens.find((y) => y.id === b.dataset.id); if (!x || x.feito) return;
  const inp = $(`[data-dia-q="${x.id}"]`); if (inp) x.qtd = r2(Math.max(0, num(inp.value)));
  abrirProduzir(x.insumo, x.qtd, (lote) => { x.feito = Date.now(); x.lote = lote.id; gravaDia(d); grava(); });
});
acao('prd-dia-tirar', (b) => { const d = diaProducao(); d.itens = d.itens.filter((y) => y.id !== b.dataset.id); gravaDia(d); grava(); });
acao('prd-dia-refazer', async () => {
  if (db.prodDia?.dia === ymd() && db.prodDia.itens.some((x) => x.feito) && !(await confirma('Refazer a lista? O que já foi feito continua no estoque.', 'Refazer'))) return;
  const d = diaProducao('x'); d.dia = ymd(); const antes = db.prodDia?.dia === ymd() ? db.prodDia.itens.filter((x) => x.feito) : [];
  d.itens = [...antes, ...d.itens.filter((x) => !antes.some((y) => y.insumo === x.insumo))]; gravaDia(d); grava(); toast('Lista refeita pela média');
});
acao('prd-dia-mais', () => {
  const l = preparos(); if (!l.length) { toast('Cadastre primeiro um preparo'); return ir('mais/preparos'); }
  folha({ titulo: 'Pôr preparo na lista', corpo: `<label class="campo"><span>Preparo</span><select data-i>${l.map((i) => `<option value="${i.id}">${t(i.nome)}</option>`).join('')}</select></label><label class="campo"><span>Quantidade</span><input data-q inputmode="decimal" placeholder="Uma receita"></label>`,
    pe: '<button type="button" class="bt cheio grande" data-ok>Pôr na lista</button>',
    aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => { const i = insumo($('[data-i]', f).value), d = diaProducao(); d.itens.push({ id: uid('pd'), insumo: i.id, qtd: r2(num($('[data-q]', f).value) || i.preparo.rende), feito: 0 }); gravaDia(d); grava(); fechar(); }; } });
});

// ---------------- lotes e validade
TELAS_MAIS.lotes = () => {
  garantir();
  const hoje = ymd(), venc = vencendo(3, hoje), fe = fefo(), todos = todosLotes();
  const linha = (l) => { const i = insumo(l.insumo), s = situLote(l, hoje); return `<tr class="${s === 'vencido' ? 'fin-atraso' : ''}"><td><b>${t(i?.nome || '?')}</b><small>${l.origem === 'producao' ? 'Produção' : 'Compra'} de ${dataCurta(l.data)}</small></td><td class="num">${fmtQtd(l.resta, i?.unid || '')}${l.resta < l.qtd ? `<small>de ${fmtQtd(l.qtd, i?.unid || '')}</small>` : ''}</td><td>${dataCurta(l.validade)}</td><td>${pill({ vencido: 'vencida', hoje: 'hoje', amanha: 'hoje', perto: 'aberta', ok: 'ok' }[s], NOME_LOTE[s])}</td>
    <td class="acoes"><a class="bt-ico" href="#mais/rastreio/${l.insumo}" aria-label="Rastrear ${t(i?.nome || '')}">${ico('etiqueta')}</a><button type="button" class="bt pq ${s === 'vencido' ? 'perigo' : ''}" data-acao="prd-descartar" data-l="${l.id}">Descartar</button></td></tr>`; };
  const tab = (l, vazio) => `<div class="tabela-rolo"><table class="tabela"><thead><tr><th>Lote</th><th class="num">Resta</th><th>Validade</th><th>Situação</th><th></th></tr></thead><tbody>${l.map(linha).join('') || `<tr><td colspan="5" class="vazio">${vazio}</td></tr>`}</tbody></table></div>`;
  return volta('mais', 'Lotes e validade', 'Lotes das compras com validade e das produções. O que resta é estimado: sai primeiro o lote mais velho') + `<div class="linha-bts"><button type="button" class="bt" data-acao="prd-lote">${ico('mais2')}Novo lote</button><a class="bt" href="#mais/producao">Produção do dia</a><a class="bt" href="#mais/rastreio">Rastreabilidade</a></div>
    ${fe.length ? `<section class="bloco"><div class="sec-tit"><h2>Use primeiro</h2><span>o lote que vence antes</span></div><ul class="prd-fefo">${fe.map((x) => `<li>${ico('alerta')}<span><b>${t(x.insumo?.nome || '')}</b>: use primeiro o lote de ${dataCurta(x.lote.data)} (vence ${dataCurta(x.lote.validade)}, resta ${fmtQtd(x.lote.resta, x.insumo?.unid || '')})</span></li>`).join('')}</ul></section>` : ''}
    <section class="bloco"><div class="sec-tit"><h2>Vencendo</h2><span>vencidos e próximos 3 dias</span></div>${tab(venc, 'Nada vencendo nos próximos 3 dias.')}</section>
    <section class="bloco"><div class="sec-tit"><h2>Todos os lotes com saldo</h2><span>${todos.length}</span></div>${tab(todos, 'Nenhum lote. Informe a validade ao receber uma compra ou produza um preparo.')}</section>`;
};
acao('prd-descartar', async (b) => {
  const l = (db.lotes || []).find((x) => x.id === b.dataset.l); if (!l) return;
  const i = insumo(l.insumo), a = lotesAtivos(l.insumo).find((x) => x.id === l.id), q = a?.resta || 0;
  if (!(await confirma(`Descartar ${fmtQtd(q, i?.unid || '')} de ${i?.nome || ''} (lote de ${dataCurta(l.data)})? Vira perda com motivo Vencido.`, 'Descartar', true))) return;
  descartarLote(l.id); toast('Lote descartado e perda registrada');
});
acao('prd-lote', () => {
  if (!db.insumos.length) return toast('Cadastre primeiro os insumos');
  folha({ titulo: 'Novo lote', corpo: `<p class="mudo">Para o que já está no estoque e tem validade. Não muda o saldo.</p><label class="campo"><span>Insumo</span><select data-i>${db.insumos.map((i) => `<option value="${i.id}">${t(i.nome)}</option>`).join('')}</select></label>
    <div class="tres-c"><label class="campo"><span>Quantidade (<i data-u>${t(db.insumos[0].unid)}</i>)</span><input data-q inputmode="decimal"></label><label class="campo"><span>Entrada</span><input type="date" data-d value="${ymd()}"></label><label class="campo"><span>Validade</span><input type="date" data-v></label></div>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Salvar lote</button>',
  aoAbrir: (f, fechar) => {
    $('[data-i]', f).onchange = () => { $('[data-u]', f).textContent = insumo($('[data-i]', f).value)?.unid || ''; };
    $('[data-ok]', f).onclick = () => { const q = num($('[data-q]', f).value), v = $('[data-v]', f).value; if (!(q > 0)) return toast('Informe a quantidade'); if (!v) return toast('Informe a validade');
      criarLote({ insumo: $('[data-i]', f).value, qtd: q, validade: v, origem: 'compra', data: $('[data-d]', f).value || ymd() }); grava(); fechar(); toast('Lote salvo'); };
  } });
});

// ---------------- sugestão de compra
TELAS_MAIS.sugestao = () => {
  garantir();
  const g = sugestaoPorFornecedor(14);
  const dura = (x) => (x.dura === Infinity ? '—' : x.dura < 1 ? '<b class="erro">menos de 1 dia</b>' : `${vir(Math.round(x.dura * 10) / 10)} dias`);
  return volta('mais', 'Sugestão de compra', 'Média dos últimos 14 dias: compra o que cobre o prazo do fornecedor + 7 dias, menos o estoque e o que já foi pedido') + `<div class="linha-bts"><a class="bt" href="#mais/fornecedores">Fornecedores e prazos</a><a class="bt" href="#mais/compras">Compras</a></div>
    ${g.map((x) => `<section class="bloco"><div class="sec-tit"><h2>${t(x.fornecedor?.nome || 'Sem fornecedor')}</h2><span>${x.fornecedor ? `entrega em ${x.fornecedor.prazo || 0} ${x.fornecedor.prazo === 1 ? 'dia' : 'dias'} · ` : 'prazo de 2 dias · '}cerca de ${dinCurto(x.total)}</span></div>
      <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Insumo</th><th class="num">Consumo/dia</th><th class="num">Tem</th><th class="num">Dura</th><th class="num">Comprar</th></tr></thead><tbody>
      ${x.itens.map((s) => `<tr><td><b>${t(s.insumo.nome)}</b>${s.jaPedido ? `<small>já pedido ${fmtQtd(s.jaPedido, s.insumo.unid)}</small>` : ''}</td><td class="num">${fmtQtd(s.med, s.insumo.unid)}</td><td class="num">${fmtQtd(s.tem, s.insumo.unid)}</td><td class="num">${dura(s)}</td><td class="num"><b>${s.compra} ${t(s.insumo.compra)}</b><small>${dinCurto(s.valor)}</small></td></tr>`).join('')}</tbody></table></div>
      <div class="linha-bts" style="margin-top:10px">${x.fornecedor?.tel ? `<a class="bt zap" href="${zap(x.fornecedor.tel, textoPedido(x))}" target="_blank" rel="noopener">${ico('zap')}Mandar pedido pelo WhatsApp</a>` : `<a class="bt zap" href="${zap('', textoPedido(x))}" target="_blank" rel="noopener">${ico('zap')}Mandar a lista pelo WhatsApp</a>`}<button type="button" class="bt cheio" data-acao="prd-criar-compra" data-f="${x.id}">${ico('carrinho')}Criar compra</button></div></section>`).join('') || '<div class="vazio">Nada para comprar agora: o estoque cobre o prazo de entrega + 7 dias de cada insumo.</div>'}`;
};
acao('prd-criar-compra', (b) => {
  const x = sugestaoPorFornecedor(14).find((y) => y.id === b.dataset.f); if (!x) return;
  abrirNovaCompra({ fornecedor: x.id, itens: x.itens.map((s) => ({ insumo: s.insumo.id, qtd: s.compra, total: s.valor })) });
});

// ---------------- aproveitamento (fator de correção)
TELAS_MAIS.aproveitamento = () => {
  const l = db.insumos.filter((i) => !ehPreparo(i)).sort((a, b) => (aprov(a) - aprov(b)) || a.nome.localeCompare(b.nome, 'pt-BR'));
  const por = (i, c) => (i.unid === 'g' ? `${dinCurto(c * 1000)}/kg` : i.unid === 'ml' ? `${dinCurto(c * 1000)}/L` : `${dinCurto(c)}/un`);
  return volta('mais', 'Aproveitamento', 'Peso líquido ÷ peso bruto. Ex.: de 1 kg de carne sobram 780 g limpos = 78%') + `<p class="mudo">A ficha técnica dos pratos continua com o peso líquido que vai no prato; o estoque baixa o bruto (líquido ÷ aproveitamento) e o custo do prato já conta a perda da limpeza.</p>
    <form class="form larga" data-aprov><div class="tabela-rolo"><table class="tabela prd-aprov"><thead><tr><th>Insumo</th><th>Aproveitamento</th><th class="num">Custo bruto</th><th class="num">Custo do limpo</th><th>Pratos</th></tr></thead><tbody>
    ${l.map((i) => { const c = (i.custo || 0) / (i.fator || 1), n = db.produtos.filter((p) => (p.ficha || []).some((f) => f.insumo === i.id)).length; return `<tr><td><b>${t(i.nome)}</b></td><td><label class="prd-pct"><input name="a_${i.id}" inputmode="decimal" value="${aprov(i) < 1 ? vir(i.aprov) : ''}" placeholder="100" aria-label="Aproveitamento de ${t(i.nome)} em %"><small>%</small></label></td>
      <td class="num">${por(i, c)}</td><td class="num">${aprov(i) < 1 ? `<b>${por(i, c / aprov(i))}</b>` : '<small class="mudo">igual</small>'}</td><td>${n || ''}</td></tr>`; }).join('')}</tbody></table></div>
    <div class="salvar-fixo"><button class="bt cheio grande">Salvar</button></div></form>`;
};
MONTAR.aproveitamento = (el) => {
  const f = $('[data-aprov]', el); if (!f) return;
  f.onsubmit = (e) => { e.preventDefault(); let n = 0; db.insumos.filter((i) => !ehPreparo(i)).forEach((i) => { const inp = f[`a_${i.id}`]; if (!inp) return; const v = inp.value.trim() === '' ? 100 : Math.max(1, Math.min(100, num(inp.value))); if (setAproveitamento(i.id, v, false)) n++; });
    if (n) { atualizarCustos(); auditar('aproveitamento', { motivo: `${n} ${n === 1 ? 'insumo' : 'insumos'} com aproveitamento novo` }); grava(); } toast(n ? `Aproveitamento salvo · fichas ajustadas em ${n} ${n === 1 ? 'insumo' : 'insumos'}` : 'Nada mudou'); };
};

// ------------------------------------------------------------------ rendimento real (previsto × real)
export const rendMin = () => Number(db.config?.rendMin) || 95;
// produções com o real informado; perda = (previsto − real) × custo por unidade prevista
export const producoesComReal = (de = 0) => (db.producoes || []).filter((x) => x.previsto > 0 && x.real != null && x.ts >= de);
export function rendimentoPorPreparo(dias = 60) {
  const de = Date.now() - dias * DIA, m = {};
  producoesComReal(de).forEach((x) => { (m[x.insumo] ||= []).push(x); });
  return Object.entries(m).map(([id, l]) => {
    l.sort((a, b) => b.ts - a.ts); const i = insumo(id);
    const pcts = l.map((x) => (x.real / x.previsto) * 100), prev = l.reduce((s, x) => s + x.previsto, 0), real = l.reduce((s, x) => s + x.real, 0);
    const perda = r2(l.reduce((s, x) => s + Math.max(0, x.previsto - x.real) * ((x.custo || 0) / x.previsto), 0));
    return { insumo: i, id, l, n: l.length, prev: r2(prev), real: r2(real), media: r2(prev ? (real / prev) * 100 : 100), pior: r2(Math.min(...pcts)), ultimo: r2(pcts[0]), perda };
  }).filter((x) => x.insumo).sort((a, b) => a.media - b.media);
}
// alerta: preparo cuja última produção (7 dias) rendeu abaixo do mínimo
export const rendimentoBaixo = () => { const de = Date.now() - 7 * DIA; return rendimentoPorPreparo(60).filter((x) => x.l[0].ts >= de && x.ultimo < rendMin()); };
TELAS_MAIS.rendimento = () => {
  garantir();
  const l = rendimentoPorPreparo(60), min = rendMin(), perda = r2(l.reduce((s, x) => s + x.perda, 0)), baixos = l.filter((x) => x.ultimo < min || x.media < min);
  const ult = producoesComReal(Date.now() - 60 * DIA).sort((a, b) => b.ts - a.ts).slice(0, 12);
  const pc = (v) => `<b class="${v < min ? 'erro' : 'ok-txt'}">${vir(v)}%</b>`;
  return volta('mais', 'Rendimento real', 'O que a receita devia render × o que rendeu de fato, nos últimos 60 dias') + `<div class="linha-bts"><a class="bt cheio" href="#mais/preparos">${ico('chef')}Produzir um preparo</a><a class="bt" href="#mais/producao">Produção do dia</a></div>
    <section class="kpis"><div class="${perda > 0 ? 'fin-alerta' : ''}"><small>Perda no rendimento</small><b>${dinCurto(perda)}</b><span>custo do que não rendeu</span></div><div><small>Produções conferidas</small><b>${l.reduce((s, x) => s + x.n, 0)}</b><span>com o real informado</span></div>
      <div class="${baixos.length ? 'fin-alerta' : ''}"><small>Abaixo de ${vir(min)}%</small><b>${baixos.length}</b><span>${baixos.length === 1 ? 'preparo' : 'preparos'}</span></div><div><small>Pior média</small><b>${l[0] ? `${vir(l[0].media)}%` : '—'}</b><span>${t(l[0]?.insumo.nome || 'sem dados')}</span></div></section>
    ${baixos.length ? `<p class="aviso ouro">${ico('alerta')}${baixos.map((x) => `${t(x.insumo.nome)} rendeu ${vir(x.ultimo)}% na última produção`).join(' · ')}. Confira a receita, a balança e o desperdício no preparo.</p>` : ''}
    <section class="bloco"><div class="sec-tit"><h2>Por preparo</h2><span>média, pior produção e perda em R$</span></div><div class="tabela-rolo"><table class="tabela"><thead><tr><th>Preparo</th><th class="num">Produções</th><th class="num">Previsto</th><th class="num">Real</th><th class="num">Média</th><th class="num">Pior</th><th class="num">Perda</th></tr></thead><tbody>
    ${l.map((x) => `<tr class="${x.media < min ? 'fin-atraso' : ''}"><td><b>${t(x.insumo.nome)}</b><small>última ${vir(x.ultimo)}%</small></td><td class="num">${x.n}</td><td class="num">${fmtQtd(x.prev, x.insumo.unid)}</td><td class="num">${fmtQtd(x.real, x.insumo.unid)}</td><td class="num">${pc(x.media)}</td><td class="num">${pc(x.pior)}</td><td class="num">${x.perda ? `<b class="erro">${dinCurto(x.perda)}</b>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="vazio">Ao produzir, informe quanto rendeu de fato. As produções aparecem aqui.</td></tr>'}</tbody></table></div></section>
    <section class="bloco"><div class="sec-tit"><h2>Últimas produções</h2></div><div class="tabela-rolo"><table class="tabela"><thead><tr><th>Quando</th><th>Preparo</th><th class="num">Previsto</th><th class="num">Real</th><th class="num">%</th><th>Quem</th></tr></thead><tbody>
    ${ult.map((x) => { const i = insumo(x.insumo); return `<tr><td>${dataCurta(x.data)}</td><td>${t(i?.nome || '?')}</td><td class="num">${fmtQtd(x.previsto, i?.unid || '')}</td><td class="num">${fmtQtd(x.real, i?.unid || '')}</td><td class="num">${pc(r2((x.real / x.previsto) * 100))}</td><td>${t(x.quem || '')}</td></tr>`; }).join('') || '<tr><td colspan="6" class="vazio">Nenhuma produção com o real informado.</td></tr>'}</tbody></table></div></section>
    <form class="form linha-form" data-rmin><label class="campo"><span>Avisar quando render menos que (%)</span><input name="min" inputmode="decimal" value="${vir(min)}"></label><button class="bt">Salvar</button></form>`;
};
MONTAR.rendimento = (el) => { const f = $('[data-rmin]', el); if (f) f.onsubmit = (e) => { e.preventDefault(); db.config.rendMin = Math.max(50, Math.min(100, num(f.min.value) || 95)); grava(); toast('Limite salvo'); }; };

// ------------------------------------------------------------------ rastreabilidade: lote de compra → produção → lote produzido
const nomeLote = (l) => { if (!l) return 'Lote apagado'; const fo = l.origem === 'compra' ? (db.notasCompra || []).find((n) => n.id === l.ref) : null; return `${l.origem === 'producao' ? 'Produção' : 'Compra'} de ${dataCurta(l.data)}${fo ? ` · ${fornecedor(fo.fornecedor)?.nome || ''}` : ''} · vence ${dataCurta(l.validade)}`; };
export const producaoDoLote = (l) => (db.producoes || []).find((p) => p.lote === l.id || (l.ref && p.id === l.ref));
// produções que usaram um lote
export const usadoEm = (loteId) => (db.producoes || []).filter((p) => (p.consumo || []).some((c) => (c.lotes || []).some((x) => x.lote === loteId)));
TELAS_MAIS.rastreio = (id) => {
  garantir();
  const i = insumo(id), comLote = [...new Set((db.lotes || []).map((l) => l.insumo))].map(insumo).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const escolha = `<div class="filtros"><div class="chips">${comLote.map((x) => `<a class="chip ${x === i ? 'on' : ''}" href="#mais/rastreio/${x.id}">${t(x.nome)}</a>`).join('')}</div></div>`;
  if (!i) {
    const ult = (db.producoes || []).slice().sort((a, b) => b.ts - a.ts).slice(0, 10);
    return volta('mais', 'Rastreabilidade', 'Escolha um insumo ou preparo para ver os lotes, de onde vieram e onde foram usados') + escolha + `
      <section class="bloco"><div class="sec-tit"><h2>Últimas produções</h2><span>feito com</span></div><ul class="r4-mini">${ult.map((p) => { const j = insumo(p.insumo); return `<li>${ico('chef')}<span><b><a href="#mais/rastreio/${p.insumo}">${t(j?.nome || '?')}</a></b> · ${dataCurta(p.data)} · ${fmtQtd(p.real ?? p.qtd, j?.unid || '')}<small>${(p.consumo || []).map((c) => { const k = insumo(c.insumo); return `${t(k?.nome || '')}${c.lotes?.length ? ` (${c.lotes.map((x) => { const l = (db.lotes || []).find((y) => y.id === x.lote); return l ? `lote de ${dataCurta(l.data)}` : 'lote'; }).join(', ')})` : ' (sem lote)'}`; }).join(' · ')}</small></span></li>`; }).join('') || '<li class="vazio">Nenhuma produção ainda.</li>'}</ul></section>`;
  }
  const lotes = (db.lotes || []).filter((l) => l.insumo === i.id).sort((a, b) => b.criado - a.criado), ativos = Object.fromEntries(lotesAtivos(i.id).map((l) => [l.id, l.resta]));
  return volta('mais', `Rastreio · ${t(i.nome)}`, `${lotes.length} ${lotes.length === 1 ? 'lote' : 'lotes'} · tem ${fmtQtd(saldo(i), i.unid)}`) + escolha + `<div class="linha-bts"><a class="bt" href="#mais/rastreio">Todos</a><a class="bt" href="#mais/lotes">Lotes e validade</a></div>
    ${lotes.map((l) => { const p = l.origem === 'producao' ? producaoDoLote(l) : null, us = usadoEm(l.id), nc = l.origem === 'compra' ? (db.notasCompra || []).find((n) => n.id === l.ref) : null;
      return `<section class="bloco r4-lote"><div class="sec-tit"><h2>${nomeLote(l)}</h2><span>${fmtQtd(l.qtd, i.unid)}${ativos[l.id] != null ? ` · resta ${fmtQtd(ativos[l.id], i.unid)}` : l.descartado ? ' · descartado' : ' · usado'}</span></div>
        ${p ? `<p class="r4-rot">Feito com</p><ul class="r4-mini">${(p.consumo || []).map((c) => { const k = insumo(c.insumo); return `<li>${ico('folha')}<span><b>${fmtQtd(c.qtd, k?.unid || '')} de ${t(k?.nome || '?')}</b><small>${c.lotes?.length ? c.lotes.map((x) => `${fmtQtd(x.qtd, k?.unid || '')} do ${nomeLote((db.lotes || []).find((y) => y.id === x.lote)).replace(/^./, (m) => m.toLowerCase())}`).join(' · ') : 'sem lote registrado'}</small></span>${k ? `<a class="bt-ico" href="#mais/rastreio/${k.id}" aria-label="Rastrear ${t(k.nome)}">${ico('dir')}</a>` : ''}</li>`; }).join('')}</ul><p class="mudo">Por ${t(p.quem || '')}${p.previsto ? ` · previsto ${fmtQtd(p.previsto, i.unid)}, rendeu ${fmtQtd(p.real, i.unid)}` : ''}</p>` : ''}
        ${nc ? `<p class="mudo">Nota de ${dataCurta(nc.data)} · ${t(fornecedor(nc.fornecedor)?.nome || 'sem fornecedor')}${nc.divergencias?.some((x) => x.insumo === i.id) ? ' · teve divergência no recebimento' : ''}</p>` : ''}
        <p class="r4-rot">Usado em</p>${us.length ? `<ul class="r4-mini">${us.map((u) => { const k = insumo(u.insumo), q = (u.consumo || []).flatMap((c) => c.lotes || []).filter((x) => x.lote === l.id).reduce((s, x) => s + x.qtd, 0); return `<li>${ico('chef')}<span><b>${t(k?.nome || '?')}</b> · produção de ${dataCurta(u.data)}<small>usou ${fmtQtd(r2(q), i.unid)} deste lote${u.lote ? ' · gerou um lote' : ''}</small></span>${k ? `<a class="bt-ico" href="#mais/rastreio/${k.id}" aria-label="Rastrear ${t(k.nome)}">${ico('dir')}</a>` : ''}</li>`; }).join('')}</ul>` : '<p class="mudo">Nenhuma produção usou este lote (as vendas não marcam lote).</p>'}</section>`; }).join('') || '<div class="vazio">Este insumo não tem lotes. Informe a validade ao receber a compra ou produza o preparo.</div>'}`;
};

// ------------------------------------------------------------------ demonstração: preparos, aproveitamento e lotes (uma vez)
export function semearProducao() {
  if (!db.exemplo || db.producoes) return false;
  garantir();
  const hoje = ymd(), d = (n) => somaDias(hoje, n), ts = (n, h = 9) => new Date(`${d(n)}T${String(h).padStart(2, '0')}:00`).getTime(), agora = Date.now();
  const novo = (id, nome, unid, compra, fator, estoque, minimo, custo, fo) => { if (!insumo(id)) db.insumos.push({ id, nome, unid, compra, fator, estoque, minimo, custo, fornecedor: fo, geracao: agora }); };
  novo('azeite', 'Azeite de oliva', 'ml', 'L', 1000, 3000, 1000, 42.9, 'fo4'); novo('farinha', 'Farinha de trigo', 'g', 'kg', 1000, 20000, 5000, 5.9, 'fo4'); novo('acem', 'Acém moído', 'g', 'kg', 1000, 6000, 3000, 34.9, 'fo1');
  setAproveitamento('carne', 78, false); setAproveitamento('frango', 85, false);
  const prep = (id, nome, rende, validade, itens, estoque) => { const i = insumo(id); if (!i) return; Object.assign(i, { nome, preparo: { rende, validade, itens: itens.map(([insumo, qtd]) => ({ insumo, qtd })) }, estoque, geracao: agora, baixas: {} }); };
  prep('molho', 'Molho de tomate da casa', 5000, 5, [['tomate', 4000], ['cebola', 600], ['azeite', 150]], 2400);
  prep('massa', 'Massa fresca de pizza 35 cm', 10, 3, [['farinha', 2500], ['azeite', 100], ['ovo', 2]], 8);
  prep('blend', 'Blend de carne 150 g', 20, 2, [['acem', 2700], ['bacon', 300]], 26);
  const lote = (id, insumo, qtd, dd, val, origem, ref = '') => db.lotes.push({ id, insumo, qtd, validade: d(val), origem, ref, data: d(dd), criado: ts(dd) });
  lote('lt1', 'molho', 5000, -2, 3, 'producao'); lote('lt2', 'massa', 10, -1, 1, 'producao'); lote('lt3', 'blend', 20, -2, 0, 'producao'); lote('lt4', 'blend', 20, 0, 2, 'producao');
  lote('lt5', 'frango', 6000, -9, 2, 'compra', 'nc4'); lote('lt6', 'tomate', 6000, -5, 3, 'compra', 'nc5');
  [['molho', 5000, -2, 'lt1'], ['massa', 10, -1, 'lt2'], ['blend', 20, -2, 'lt3'], ['blend', 20, 0, 'lt4']].forEach(([id, qtd, dd, lt]) => { const i = insumo(id); db.producoes.push({ id: `pr-${lt}`, insumo: id, qtd, data: d(dd), ts: ts(dd, 8), lote: lt, custo: r2(custoUnRec(i) * qtd), quem: 'Diego', consumo: consumoProducao(i, qtd).map(({ j, q }) => ({ insumo: j.id, qtd: q })) }); });
  atualizarCustos(); grava(); return true;
}
semearProducao();
// custo dos preparos acompanha o preço de compra dos ingredientes; "Recomeçar a demonstração" semeia de novo
ouvir(() => { if (db.exemplo && !db.producoes) semearProducao(); else if (atualizarCustos()) grava(); });
