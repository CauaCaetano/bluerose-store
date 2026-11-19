// Popina · operação do dia a dia: pendências do dono (uma lista só com o que precisa de atenção hoje), metas do mês,
// consumo interno e cortesias, divisão das gorjetas e manutenção dos equipamentos. Cada tela entra na Gestão (#mais/<id>).
// Dados: db.consumoInterno, db.config.gorjeta, db.gorjetaPagas, db.config.metas e db.equipamentos.
import { db, t, din, dinCurto, grava, r2, uid, prod, quemAgora, auditar, ouvir, consumoVenda, custoVenda, estoqueBaixo, insumo } from './loja.js?v=34';
import { acao } from './nucleo.js?v=34';
import { ico, folha, toast, confirma, $, $$ } from './ui.js?v=34';
import { TELAS_MAIS, MONTAR, volta, TOPO_GESTAO } from './mais.js?v=34';
import { garantirFin, ymd, somaDias, dataCurta, contaPaga, restaConta, periodo, filtroPeriodo, ligaPeriodo, dre, conciliacaoPendente, clientesFiado, baixarEstoque, novaConta, pagarConta, zap, gerarRecorrentes,
  esperadoDia, conferirDia, custoUnit, valorConferido, totalNota, fornecedor } from './financeiro.js?v=34';
import { vencendo, rendimentoBaixo, custoUnRec, consumoProducao } from './producao.js?v=34';

// entradas do hub da Gestão: [id, nome, ícone, detalhe]
export const HUB_OPERACAO = [
  ['pendencias', 'Pendências de hoje', 'sino', 'Tudo o que precisa da sua atenção, num lugar só'],
  ['metas', 'Metas do mês', 'grafico', 'Quanto vender no mês, gasto médio por conta, custo dos ingredientes (CMV) e a previsão'],
  ['consumo', 'Consumo interno e cortesias', 'cloche', 'Refeição da equipe, degustação, dono e cortesias'],
  ['gorjetas', 'Gorjetas e 10%', 'moedas', 'Quanto entrou e quanto fica para cada um'],
  ['manutencao', 'Manutenção', 'ajustes', 'Equipamentos, preventivas, defeitos e custos'],
];

const DIA = 864e5;
const num = (v) => { const s = String(v ?? '').trim(); return Number(/,/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s) || 0; };
const vir = (n) => String(n ?? '').replace('.', ',');
const dec2 = (n) => (Number(n) || 0).toFixed(2).replace('.', ',');
const soma = (l, f) => r2(l.reduce((s, x) => s + (Number(f(x)) || 0), 0));
const tsDia = (s) => new Date(`${s}T12:00`).getTime();
const pill = (cls, txt) => `<em class="fin-st fin-${cls}">${txt}</em>`;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const barra = (pct, ruim = false) => `<span class="r4-barra ${ruim ? 'ruim' : ''}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></span>`;

// estilos das telas novas (sem mexer nas folhas de estilo do sistema)
if (!document.getElementById('r4-css')) {
  const st = document.createElement('style'); st.id = 'r4-css';
  st.textContent = `
.r4-conf{list-style:none;margin:0 0 10px;padding:0;display:grid;gap:10px}
.r4-conf>li{border:1px solid var(--linha,#ddd);border-radius:12px;padding:10px 12px;background:var(--papel,#fff)}
.r4-conf-tit{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;margin-bottom:6px}.r4-conf-tit small{color:var(--mudo,#777)}
.r4-conf-campos{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.r4-conf-campos .campo{margin:0;min-width:0}
.r4-conf-campos input,.r4-conf-campos select{width:100%;min-width:0}
.r4-sub{font-size:15px;margin:14px 0 6px}
.r4-mini{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.r4-mini>li{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border:1px solid var(--linha,#ddd);border-radius:10px;background:var(--papel,#fff);min-width:0}
.r4-mini>li>span{flex:1;min-width:0;overflow-wrap:anywhere}.r4-mini>li small{display:block;color:var(--mudo,#777)}.r4-mini>li>.ico{width:20px;height:20px;flex:none;margin-top:2px}
.r4-mini>li .fin-st{flex:none}
.r4-concf{list-style:none;margin:0 0 8px;padding:0;display:grid;gap:8px}
.r4-concf>li{display:grid;grid-template-columns:minmax(0,1fr) 150px 90px;gap:10px;align-items:center;padding:8px 10px;border:1px solid var(--linha,#ddd);border-radius:10px;background:var(--papel,#fff)}
.r4-concf small{display:block;color:var(--mudo,#777)}.r4-concf .campo{margin:0}.r4-dif{text-align:right}
.r4-rot{font-weight:800;margin:8px 0 4px;font-size:13.5px;text-transform:uppercase;letter-spacing:.04em}
.r4-topo{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:14px;margin:0 0 16px}
.r4-card{background:var(--papel,#FFFBF2);border:1px solid var(--linha,#E2D2B8);border-radius:14px;padding:12px 14px;min-width:0}
.r4-card h2{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:16px;margin:0 0 8px}.r4-card h2 a{font-size:13px;font-weight:700;white-space:nowrap}
.r4-pend{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.r4-pend>li>a{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.03);text-decoration:none;color:inherit;min-width:0}
.r4-pend>li>a>span{flex:1;min-width:0}.r4-pend b{display:block;overflow-wrap:anywhere}.r4-pend small{display:block;color:var(--mudo,#777);overflow-wrap:anywhere}
.r4-pend .ico{width:20px;height:20px;flex:none}.r4-pend .alto{border-left:4px solid #B4532F}.r4-pend .medio{border-left:4px solid #C27C0E}.r4-pend .baixo{border-left:4px solid #5F6B2B}
.r4-pend em{font-style:normal;font-weight:800;font-size:13px;white-space:nowrap}
.r4-meta{display:grid;gap:4px;margin:0 0 10px}.r4-meta>div{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:14px}.r4-meta small{color:var(--mudo,#777)}
.r4-barra{display:block;height:9px;border-radius:99px;background:rgba(0,0,0,.08);overflow:hidden}.r4-barra i{display:block;height:100%;background:#5F6B2B;border-radius:99px}.r4-barra.ruim i{background:#B4532F}
.r4-metas{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 14px}
.r4-metas .r4-card b.grande{display:block;font-size:26px;margin:2px 0}
.r4-pess{list-style:none;margin:0 0 8px;padding:0;display:grid;gap:8px}
.r4-pess>li{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) 80px 80px 40px;gap:8px;align-items:end}
.r4-pess .campo{margin:0;min-width:0}.r4-pess input{width:100%;min-width:0}
.r4-itens{list-style:none;margin:0 0 6px;padding:0;display:grid;gap:8px}.r4-itens>li{display:grid;grid-template-columns:minmax(0,1fr) 70px 40px;gap:8px;align-items:center}
.r4-itens select,.r4-itens input{width:100%;min-width:0}
.r4-larga{grid-column:span 2}
@media (max-width:700px){.r4-topo,.r4-metas{grid-template-columns:1fr}.r4-conf-campos{grid-template-columns:1fr 1fr}
  .r4-concf>li{grid-template-columns:minmax(0,1fr) 110px}.r4-concf .r4-dif{grid-column:1 / -1;text-align:left}
  .r4-pess>li{grid-template-columns:minmax(0,1fr) 64px 64px 40px}.r4-pess>li>.r4-fun{grid-column:1 / -1;order:9}}`;
  document.head.appendChild(st);
}

// ------------------------------------------------------------------ equipe (para gorjetas e autorizações)
const nomesEquipe = () => [...new Set([...(db.config.garcons || []), ...((db.config.gorjeta?.pessoas || []).map((p) => p.nome)), ...((db.equipe || []).map((p) => p.nome).filter(Boolean))])].filter(Boolean);

// ------------------------------------------------------------------ manutenção
export const garantirOp = () => { db.equipamentos ||= []; db.consumoInterno ||= []; db.gorjetaPagas ||= []; };
const SERVICOS = [['preventiva', 'Preventiva / limpeza'], ['defeito', 'Defeito'], ['conserto', 'Conserto']];
export const proximaPreventiva = (e) => (e.intervalo > 0 && e.ultima ? somaDias(e.ultima, Number(e.intervalo)) : '');
export function situacaoEq(e, hoje = ymd()) {
  const p = proximaPreventiva(e); if (e.parado) return 'parado'; if (!p) return 'sem';
  return p < hoje ? 'vencida' : p === hoje ? 'hoje' : p <= somaDias(hoje, 7) ? 'logo' : 'ok';
}
const NOME_EQ = { parado: 'Parado', vencida: 'Preventiva vencida', hoje: 'Preventiva hoje', logo: 'Preventiva em breve', ok: 'Em dia', sem: 'Sem preventiva' };
const CLS_EQ = { parado: 'vencida', vencida: 'vencida', hoje: 'hoje', logo: 'aberta', ok: 'ok', sem: 'paga' };
export function registrarServico(e, { tipo, data = ymd(), desc = '', custo = 0, quem = quemAgora(), conta = '' }) {
  garantirOp(); custo = r2(Math.max(0, Number(custo) || 0));
  const h = { id: uid('ms'), tipo, data, desc: String(desc || '').trim().slice(0, 160), custo, quem, ts: Date.now() };
  (e.historico ||= []).push(h);
  if (tipo === 'preventiva' && (!e.ultima || data >= e.ultima)) e.ultima = data;
  if (tipo === 'defeito') e.parado = !!e.paraDefeito; if (tipo === 'conserto' || tipo === 'preventiva') e.parado = false;
  if (custo > 0 && conta) {
    const c = novaConta({ tipo: 'pagar', desc: `${tipo === 'preventiva' ? 'Preventiva' : 'Conserto'}: ${e.nome}`, categoria: 'manutencao', valor: custo, venc: conta === 'paga' ? data : somaDias(data, 15), obs: h.desc });
    if (conta === 'paga') pagarConta(c, custo, data, 'Pix'); h.conta = c.id;
  }
  auditar('manutencao', { quem, item: e.nome, valor: custo, motivo: `${SERVICOS.find((x) => x[0] === tipo)?.[1] || tipo}${h.desc ? ` · ${h.desc}` : ''}` });
  grava(); return h;
}
const manutVencida = () => (db.equipamentos || []).filter((e) => ['vencida', 'hoje', 'parado'].includes(situacaoEq(e)) || (situacaoEq(e) === 'logo' && proximaPreventiva(e) <= somaDias(ymd(), 3)));

// ------------------------------------------------------------------ metas do mês
export const metasCfg = () => ({ faturamento: 0, ticket: 0, cmv: 0, ...(db.config.metas || {}) });
export function metasMes(agora = new Date()) {
  const ini = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime(), fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1).getTime();
  const diasMes = Math.round((fim - ini) / DIA), d = dre(ini, agora.getTime() + 1), M = metasCfg();
  const hojeIni = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime(), vendeuHoje = db.vendas.some((v) => !v.cancelado && v.ts >= hojeIni);
  const dias = Math.max(1, agora.getDate() - (vendeuHoje && agora.getHours() >= 15 ? 0 : 1)), restam = Math.max(0, diasMes - agora.getDate() + 1);
  const fat = d.liquida, ticket = d.vendas ? r2(fat / d.vendas) : 0, cmv = fat ? r2((d.cmv / fat) * 100) : 0, proj = r2((fat / dias) * diasMes);
  return { M, fat, ticket, cmv, proj, diasMes, dias, restam, vendas: d.vendas, falta: r2(Math.max(0, M.faturamento - fat)), porDia: restam ? r2(Math.max(0, M.faturamento - fat) / restam) : 0,
    pctFat: M.faturamento ? r2((fat / M.faturamento) * 100) : 0, pctProj: M.faturamento ? r2((proj / M.faturamento) * 100) : 0 };
}

// ------------------------------------------------------------------ consumo interno e cortesias
export const TIPOS_CI = ['Refeição de funcionário', 'Degustação', 'Consumo do dono', 'Cortesia'];
// baixa o estoque pela ficha técnica de cada prato, guarda o custo e o preço de cardápio; não vira venda
export function registrarConsumo({ tipo, itens, motivo = '', autorizou = '', para = '', quem = quemAgora(), ts = Date.now() }) {
  garantirOp();
  const l = (itens || []).map((x) => ({ p: prod(x.prod), qtd: Math.max(0, Number(x.qtd) || 0) })).filter((x) => x.p && x.qtd > 0);
  if (!l.length) return { erro: 'Escolha pelo menos um prato' };
  if (!TIPOS_CI.includes(tipo)) return { erro: 'Escolha o tipo' };
  if (String(autorizou).trim().length < 2) return { erro: 'Informe quem autorizou' };
  if (tipo === 'Cortesia' && String(motivo).trim().length < 3) return { erro: 'Escreva o motivo da cortesia' };
  const fv = { itens: l.map(({ p, qtd }) => ({ prod: p.id, nome: p.nome, qtd, preco: p.preco })) };
  const custo = custoVenda(fv), cons = consumoVenda(fv);
  Object.entries(cons).forEach(([id, q]) => baixarEstoque(id, q, 'consumo', `${tipo}${motivo ? `: ${motivo}` : ''}`, quem));
  const r = { id: uid('ci'), tipo, itens: fv.itens.map(({ prod: pid, nome, qtd }) => ({ prod: pid, nome, qtd })), custo, cardapio: soma(l, (x) => x.p.preco * x.qtd), motivo: String(motivo).trim().slice(0, 140), autorizou: String(autorizou).trim().slice(0, 60), para: String(para).trim().slice(0, 60), ts, quem };
  db.consumoInterno.push(r);
  auditar('consumo-interno', { quem, item: r.itens.map((x) => `${x.qtd}× ${x.nome}`).join(', '), valor: custo, motivo: `${tipo} · autorizado por ${r.autorizou}${r.motivo ? ` · ${r.motivo}` : ''}` });
  grava(); return { ok: true, r };
}

// ------------------------------------------------------------------ gorjetas (10% e gorjetas a mais) e a divisão
export const REGRAS_GORJ = [['igual', 'Igual para todos'], ['pontos', 'Por pontos'], ['horas', 'Por horas trabalhadas']];
export function gorjetaCfg() {
  const c = db.config.gorjeta || {};
  return { regra: c.regra || 'igual', retencao: Number(c.retencao) || 0, pessoas: (c.pessoas?.length ? c.pessoas : (db.config.garcons || []).map((n) => ({ id: uid('gp'), nome: n, funcao: 'Garçom', pontos: 10, horas: 40 }))) };
}
export function gorjetaPeriodo(de, ate, C = gorjetaCfg()) {
  const v = db.vendas.filter((x) => !x.cancelado && x.ts >= de && x.ts < ate);
  const servico = soma(v, (x) => x.servico), extra = soma(v.flatMap((x) => x.pagamentos || []), (p) => p.gorjeta), ret = r2(servico * C.retencao / 100), total = r2(servico - ret + extra);
  const peso = (p) => (C.regra === 'pontos' ? Number(p.pontos) || 0 : C.regra === 'horas' ? Number(p.horas) || 0 : 1), tot = C.pessoas.reduce((s, p) => s + peso(p), 0);
  let resto = total;
  const linhas = C.pessoas.map((p, k) => { const val = k === C.pessoas.length - 1 ? r2(resto) : r2(tot ? (total * peso(p)) / tot : 0); resto = r2(resto - val); return { nome: p.nome, funcao: p.funcao || '', base: peso(p), pct: tot ? r2((peso(p) / tot) * 100) : 0, valor: tot ? val : 0 }; });
  return { vendas: v.length, servico, extra, ret, total, linhas, regra: C.regra };
}
const textoGorjeta = (P, g) => `Gorjetas · ${db.config.nome || 'restaurante'}\n${P.rot}\nServiço ${din(g.servico)}${g.extra ? ` + gorjetas ${din(g.extra)}` : ''}${g.ret ? ` − retenção ${din(g.ret)}` : ''} = ${din(g.total)}\nRegra: ${REGRAS_GORJ.find((r) => r[0] === g.regra)?.[1]}\n${g.linhas.map((l) => `• ${l.nome}: ${din(l.valor)}`).join('\n')}`;

// ------------------------------------------------------------------ pendências do dono
export function pendencias() {
  garantirFin(); garantirOp();
  const hoje = ymd(), amanha = somaDias(hoje, 1), P = [];
  const add = (nivel, ic, tit, det, href, bt = 'Resolver') => P.push({ nivel, ic, tit, det, href, bt });
  const pagar = db.contas.filter((c) => c.tipo === 'pagar' && !contaPaga(c)), lista = (l) => l.slice(0, 3).map((c) => c.desc).join(', ') + (l.length > 3 ? ` e mais ${l.length - 3}` : '');
  const venc = pagar.filter((c) => c.venc < hoje), hj = pagar.filter((c) => c.venc === hoje), am = pagar.filter((c) => c.venc === amanha);
  if (venc.length) add('alto', 'conta', `${plural(venc.length, 'conta vencida', 'contas vencidas')} · ${dinCurto(soma(venc, restaConta))}`, lista(venc), '#mais/contas/pagar~vencidas', 'Pagar');
  if (hj.length) add('alto', 'conta', `${plural(hj.length, 'conta vence', 'contas vencem')} hoje · ${dinCurto(soma(hj, restaConta))}`, lista(hj), '#mais/contas/pagar~hoje', 'Pagar');
  if (am.length) add('medio', 'conta', `${plural(am.length, 'conta vence', 'contas vencem')} amanhã · ${dinCurto(soma(am, restaConta))}`, lista(am), '#mais/contas/pagar~7', 'Ver');
  const rec = db.contas.filter((c) => c.tipo === 'receber' && !contaPaga(c) && c.venc < hoje);
  if (rec.length) add('medio', 'moedas', `${plural(rec.length, 'conta a receber atrasada', 'contas a receber atrasadas')} · ${dinCurto(soma(rec, restaConta))}`, lista(rec), '#mais/contas/receber~vencidas', 'Cobrar');
  const lv = vencendo(1, hoje), vencidos = lv.filter((l) => l.validade < hoje), quase = lv.filter((l) => l.validade >= hoje);
  const nomeL = (l) => l.map((x) => insumo(x.insumo)?.nome || '').filter(Boolean).slice(0, 3).join(', ');
  if (vencidos.length) add('alto', 'calendario', `${plural(vencidos.length, 'lote vencido', 'lotes vencidos')} no estoque`, `${nomeL(vencidos)}: descarte e registre a perda`, '#mais/lotes', 'Ver lotes');
  if (quase.length) add('medio', 'calendario', `${plural(quase.length, 'lote vence', 'lotes vencem')} hoje ou amanhã`, `${nomeL(quase)}: use primeiro`, '#mais/lotes', 'Ver lotes');
  const comp = (db.notasCompra || []).filter((n) => n.status !== 'recebida' && n.data <= hoje);
  if (comp.length) add('medio', 'carrinho', `${plural(comp.length, 'compra a receber', 'compras a receber')}`, comp.slice(0, 3).map((n) => `${fornecedor(n.fornecedor)?.nome || 'Sem fornecedor'} (${dataCurta(n.data)})`).join(', '), '#mais/compras/aberta', 'Conferir');
  const cp = conciliacaoPendente(7);
  if (cp.length) add('medio', 'check', `${plural(cp.length, 'dia', 'dias')} sem conciliação`, `${cp.slice(0, 4).map((x) => dataCurta(x.dia)).join(', ')}: confira o que caiu na conta`, '#mais/conciliacao', 'Conferir');
  const mv = manutVencida();
  if (mv.length) add(mv.some((e) => ['vencida', 'parado'].includes(situacaoEq(e))) ? 'alto' : 'medio', 'ajustes', `${plural(mv.length, 'equipamento precisa', 'equipamentos precisam')} de manutenção`, mv.slice(0, 3).map((e) => `${e.nome} (${NOME_EQ[situacaoEq(e)].toLowerCase()}${proximaPreventiva(e) ? ` ${dataCurta(proximaPreventiva(e))}` : ''})`).join(', '), '#mais/manutencao', 'Ver');
  const eb = estoqueBaixo();
  if (eb.length) add('medio', 'estoque', `${plural(eb.length, 'item abaixo', 'itens abaixo')} do mínimo`, eb.slice(0, 4).map((i) => i.nome).join(', ') + (eb.length > 4 ? ` e mais ${eb.length - 4}` : ''), '#mais/sugestao', 'Comprar');
  const fd = clientesFiado().filter((x) => x.saldo > x.limite + 0.009);
  if (fd.length) add('medio', 'etiqueta', `${plural(fd.length, 'cliente passou', 'clientes passaram')} do limite do fiado`, fd.slice(0, 3).map((x) => `${x.nome || 'Sem nome'} (${dinCurto(x.saldo)})`).join(', '), '#mais/fiado', 'Cobrar');
  const rb = rendimentoBaixo();
  if (rb.length) add('baixo', 'chef', `Rendimento abaixo do esperado`, rb.map((x) => `${x.insumo.nome} ${vir(x.ultimo)}%`).join(', '), '#mais/rendimento', 'Ver');
  const m = metasMes();
  if (m.M.faturamento && m.proj < m.M.faturamento * 0.97) add('baixo', 'grafico', `Projeção abaixo da meta do mês`, `${dinCurto(m.proj)} de ${dinCurto(m.M.faturamento)} · faltam ${dinCurto(m.porDia)} por dia`, '#mais/metas', 'Ver');
  const ord = { alto: 0, medio: 1, baixo: 2 };
  return P.sort((a, b) => ord[a.nivel] - ord[b.nivel]);
}
const itemPend = (p) => `<li><a href="${p.href}" class="${p.nivel}">${ico(p.ic)}<span><b>${t(p.tit)}</b><small>${t(p.det)}</small></span><em>${p.bt} ›</em></a></li>`;

// topo da Gestão: resumo das pendências e as metas
TOPO_GESTAO.push(() => {
  const p = pendencias(), m = metasMes(), M = m.M;
  const metas = M.faturamento || M.ticket || M.cmv ? `
      ${M.faturamento ? `<div class="r4-meta"><div><b>Faturamento ${dinCurto(m.fat)}</b><small>meta ${dinCurto(M.faturamento)} · ${vir(Math.round(m.pctFat))}%</small></div>${barra(m.pctFat)}<div><small>Projeção do mês</small><small><b class="${m.proj < M.faturamento ? 'erro' : 'ok-txt'}">${dinCurto(m.proj)}</b> (${vir(Math.round(m.pctProj))}%)</small></div></div>` : ''}
      ${M.ticket ? `<div class="r4-meta"><div><b>Ticket médio ${dinCurto(m.ticket)}</b><small>meta ${dinCurto(M.ticket)}</small></div>${barra((m.ticket / M.ticket) * 100, m.ticket < M.ticket)}</div>` : ''}
      ${M.cmv ? `<div class="r4-meta"><div><b>CMV ${vir(m.cmv)}%</b><small>meta até ${vir(M.cmv)}%</small></div>${barra((m.cmv / M.cmv) * 100, m.cmv > M.cmv)}</div>` : ''}` : '<p class="mudo">Defina a meta de faturamento, o ticket médio e o CMV do mês para acompanhar aqui.</p>';
  return `<section class="r4-topo" aria-label="Pendências e metas"><div class="r4-card"><h2><span>${ico('sino')} Pendências de hoje${p.length ? ` <em class="badge">${p.length}</em>` : ''}</span><a href="#mais/pendencias">Ver todas</a></h2>
      <ul class="r4-pend">${p.slice(0, 4).map(itemPend).join('') || `<li><a href="#mais/pendencias" class="baixo">${ico('check')}<span><b>Nada pendente hoje</b><small>Contas, lotes, compras, conciliação e manutenção em dia</small></span></a></li>`}</ul></div>
    <div class="r4-card"><h2><span>${ico('grafico')} Metas do mês</span><a href="#mais/metas">Ajustar</a></h2>${metas}</div></section>`;
});

// ================================================================== telas
// ---------------- pendências
TELAS_MAIS.pendencias = () => {
  const p = pendencias(), n = (k) => p.filter((x) => x.nivel === k).length;
  return volta('mais', 'Pendências de hoje', `${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} · o que precisa da sua atenção`) + `
    <section class="kpis"><div class="${n('alto') ? 'fin-alerta' : ''}"><small>Urgente</small><b>${n('alto')}</b><span>resolver hoje</span></div><div><small>Atenção</small><b>${n('medio')}</b><span>nos próximos dias</span></div><div><small>Acompanhar</small><b>${n('baixo')}</b><span>rendimento e metas</span></div><div><small>Total</small><b>${p.length}</b><span>${p.length ? 'pendências' : 'tudo em dia'}</span></div></section>
    <section class="bloco"><ul class="r4-pend">${p.map(itemPend).join('') || `<li><a href="#mais" class="baixo">${ico('check')}<span><b>Nada pendente</b><small>Contas, lotes, compras, conciliação, manutenção, estoque e fiado em dia.</small></span></a></li>`}</ul></section>
    <p class="mudo">Entram aqui: contas vencidas e que vencem até amanhã, contas a receber atrasadas, lotes vencidos ou vencendo, compras a receber, dias sem conciliação, manutenção vencida, estoque abaixo do mínimo, fiado acima do limite, rendimento baixo e a projeção da meta.</p>`;
};

// ---------------- metas
TELAS_MAIS.metas = () => {
  const m = metasMes(), M = m.M, mes = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return volta('mais', 'Metas do mês', `${mes} · dia ${new Date().getDate()} de ${m.diasMes}`) + `
    <div class="r4-metas"><div class="r4-card"><small>Faturamento</small><b class="grande">${dinCurto(m.fat)}</b>${M.faturamento ? `${barra(m.pctFat)}<p class="mudo">${vir(Math.round(m.pctFat))}% da meta de ${dinCurto(M.faturamento)}</p>` : '<p class="mudo">Sem meta</p>'}</div>
      <div class="r4-card"><small>Ticket médio</small><b class="grande">${dinCurto(m.ticket)}</b>${M.ticket ? `${barra((m.ticket / M.ticket) * 100, m.ticket < M.ticket)}<p class="mudo">meta ${dinCurto(M.ticket)} · ${m.vendas} vendas</p>` : `<p class="mudo">${m.vendas} vendas</p>`}</div>
      <div class="r4-card"><small>CMV</small><b class="grande ${M.cmv && m.cmv > M.cmv ? 'erro' : ''}">${vir(m.cmv)}%</b>${M.cmv ? `${barra((m.cmv / M.cmv) * 100, m.cmv > M.cmv)}<p class="mudo">meta até ${vir(M.cmv)}% ${m.cmv > M.cmv ? '· acima da meta' : '· dentro da meta'}</p>` : '<p class="mudo">Sem meta</p>'}</div></div>
    ${M.faturamento ? `<section class="kpis"><div class="${m.proj < M.faturamento ? 'fin-alerta' : ''}"><small>Projeção do mês</small><b>${dinCurto(m.proj)}</b><span>no ritmo de ${dinCurto(r2(m.fat / m.dias))}/dia</span></div><div><small>Falta vender</small><b>${dinCurto(m.falta)}</b><span>para bater a meta</span></div>
      <div><small>Por dia, até o fim</small><b>${dinCurto(m.porDia)}</b><span>${plural(m.restam, 'dia restante', 'dias restantes')} (com hoje)</span></div><div><small>Projeção × meta</small><b class="${m.pctProj < 100 ? 'erro' : 'ok-txt'}">${vir(Math.round(m.pctProj))}%</b><span>${m.pctProj >= 100 ? 'no caminho' : 'abaixo do ritmo'}</span></div></section>` : ''}
    <form class="form bloco-form" data-metas><h2>Metas de ${mes}</h2><div class="duas-c"><label class="campo"><span>Faturamento do mês (R$)</span><input name="fat" inputmode="decimal" value="${M.faturamento ? dec2(M.faturamento) : ''}" placeholder="Ex.: 120.000,00"></label><label class="campo"><span>Ticket médio (R$)</span><input name="tk" inputmode="decimal" value="${M.ticket ? dec2(M.ticket) : ''}" placeholder="Ex.: 85,00"></label></div>
      <label class="campo"><span>CMV máximo (% da receita)</span><input name="cmv" inputmode="decimal" value="${M.cmv ? vir(M.cmv) : ''}" placeholder="Ex.: 30"></label><button class="bt cheio">Salvar metas</button></form>
    <p class="mudo">Faturamento = receita líquida do mês (sem descontos e cancelamentos). CMV pela ficha técnica, o mesmo da DRE. A projeção divide o vendido pelos dias que já passaram e multiplica pelos dias do mês.</p>`;
};
MONTAR.metas = (el) => {
  const f = $('[data-metas]', el); if (!f) return;
  f.onsubmit = (e) => { e.preventDefault(); db.config.metas = { faturamento: r2(Math.max(0, num(f.fat.value))), ticket: r2(Math.max(0, num(f.tk.value))), cmv: r2(Math.max(0, Math.min(100, num(f.cmv.value)))) }; auditar('metas', { motivo: `Metas: ${din(db.config.metas.faturamento)} · ticket ${din(db.config.metas.ticket)} · CMV ${db.config.metas.cmv}%` }); grava(); toast('Metas salvas'); };
};

// ---------------- consumo interno e cortesias
TELAS_MAIS.consumo = (per) => {
  garantirOp();
  const P = periodo(per || 'mes'), l = db.consumoInterno.filter((x) => x.ts >= P.de && x.ts < P.ate).sort((a, b) => b.ts - a.ts);
  const porT = Object.fromEntries(TIPOS_CI.map((k) => [k, soma(l.filter((x) => x.tipo === k), (x) => x.custo)]));
  return volta('mais', 'Consumo interno e cortesias', `${P.rot} · baixa o estoque pelo custo da ficha e não entra como venda`) + filtroPeriodo('consumo', P) + `
    <div class="linha-bts"><button type="button" class="bt cheio" data-acao="op-consumo">${ico('mais2')}Registrar consumo</button><a class="bt" href="#mais/dre">Ver na DRE</a></div>
    <section class="kpis">${TIPOS_CI.map((k) => `<div><small>${k}</small><b>${dinCurto(porT[k])}</b><span>${plural(l.filter((x) => x.tipo === k).length, 'registro', 'registros')}</span></div>`).join('')}</section>
    <section class="bloco"><div class="sec-tit"><h2>Registros</h2><span>custo total ${dinCurto(soma(l, (x) => x.custo))} · no cardápio valeria ${dinCurto(soma(l, (x) => x.cardapio))}</span></div><div class="tabela-rolo"><table class="tabela"><thead><tr><th>Quando</th><th>Tipo</th><th>O que saiu</th><th>Autorizou</th><th class="num">Custo</th><th class="num">Cardápio</th></tr></thead><tbody>
    ${l.map((x) => `<tr><td>${new Date(x.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td><td>${pill(x.tipo === 'Cortesia' ? 'hoje' : 'aberta', t(x.tipo))}</td><td><b>${x.itens.map((i) => `${vir(i.qtd)}× ${t(i.nome)}`).join(', ')}</b><small>${[x.para && `para ${t(x.para)}`, x.motivo && t(x.motivo)].filter(Boolean).join(' · ')}</small></td><td>${t(x.autorizou)}</td><td class="num"><b>${dinCurto(x.custo)}</b></td><td class="num">${dinCurto(x.cardapio)}</td></tr>`).join('') || '<tr><td colspan="6" class="vazio">Nada registrado no período. Registre a refeição da equipe, degustações e cortesias para o estoque e a DRE baterem.</td></tr>'}</tbody></table></div></section>`;
};
MONTAR.consumo = ligaPeriodo;
acao('op-consumo', () => {
  const ps = db.produtos.filter((p) => p.ativo !== false && p.preco > 0); if (!ps.length) return toast('Cadastre os pratos no cardápio primeiro');
  const cats = db.categorias.filter((k) => ps.some((p) => p.cat === k.id));
  const opts = (v) => cats.map((k) => `<optgroup label="${t(k.nome)}">${ps.filter((p) => p.cat === k.id).map((p) => `<option value="${p.id}" ${p.id === v ? 'selected' : ''}>${t(p.nome)}</option>`).join('')}</optgroup>`).join('');
  let itens = [{ prod: ps[0].id, qtd: 1 }];
  const linhas = () => itens.map((x, k) => `<li><select data-ip="${k}" aria-label="Prato">${opts(x.prod)}</select><input data-iq="${k}" inputmode="decimal" value="${vir(x.qtd)}" aria-label="Quantidade"><button type="button" class="bt-ico" data-itira="${k}" aria-label="Tirar">${ico('lixo')}</button></li>`).join('');
  const quem = nomesEquipe();
  folha({ titulo: 'Registrar consumo', larga: true, corpo: `<label class="campo"><span>Tipo</span><select data-tipo>${TIPOS_CI.map((k) => `<option>${k}</option>`).join('')}</select></label>
    <div class="campo"><span>O que saiu (pela ficha técnica)</span><ul class="r4-itens" data-l>${linhas()}</ul><button type="button" class="link" data-mais>+ Prato</button></div>
    <div class="duas-c"><label class="campo"><span>Quem autorizou</span><input data-aut list="r4-equipe" maxlength="60" placeholder="Ex.: Dono"><datalist id="r4-equipe">${['Dono', ...quem].map((n) => `<option value="${t(n)}">`).join('')}</datalist></label><label class="campo"><span>Para quem (opcional)</span><input data-para maxlength="60" placeholder="Ex.: equipe do almoço, mesa 5"></label></div>
    <label class="campo"><span>Motivo <small data-obr>(opcional)</small></span><input data-mot maxlength="140" placeholder="Ex.: prato atrasou 40 min"></label>
    <div class="resumo"><div><span>Preço de cardápio</span><b data-card></b></div><div class="total"><span>Custo (sai do estoque)</span><b data-custo></b></div></div>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Registrar</button>',
  aoAbrir: (f, fechar) => {
    const ler = () => { itens = itens.map((x, k) => ({ prod: $(`[data-ip="${k}"]`, f)?.value || x.prod, qtd: num($(`[data-iq="${k}"]`, f)?.value) })); };
    const calc = () => { ler(); const fv = { itens: itens.map((x) => { const p = prod(x.prod); return p && x.qtd > 0 ? { prod: p.id, nome: p.nome, qtd: x.qtd, preco: p.preco } : null; }).filter(Boolean) };
      $('[data-custo]', f).textContent = din(custoVenda(fv)); $('[data-card]', f).textContent = din(soma(fv.itens, (x) => x.preco * x.qtd)); $('[data-obr]', f).textContent = $('[data-tipo]', f).value === 'Cortesia' ? '(obrigatório na cortesia)' : '(opcional)'; };
    f.addEventListener('input', calc); f.addEventListener('change', calc);
    $('[data-mais]', f).onclick = () => { ler(); itens.push({ prod: ps[0].id, qtd: 1 }); $('[data-l]', f).innerHTML = linhas(); calc(); };
    f.addEventListener('click', (e) => { const x = e.target.closest('[data-itira]'); if (!x) return; ler(); itens.splice(Number(x.dataset.itira), 1); if (!itens.length) itens.push({ prod: ps[0].id, qtd: 1 }); $('[data-l]', f).innerHTML = linhas(); calc(); });
    calc();
    $('[data-ok]', f).onclick = () => {
      ler(); const r = registrarConsumo({ tipo: $('[data-tipo]', f).value, itens, motivo: $('[data-mot]', f).value, autorizou: $('[data-aut]', f).value, para: $('[data-para]', f).value });
      if (r.erro) return toast(r.erro);
      fechar(); toast(`${r.r.tipo} registrada · custo ${din(r.r.custo)} saiu do estoque`);
    };
  } });
});

// ---------------- gorjetas
TELAS_MAIS.gorjetas = (per) => {
  garantirOp();
  const P = periodo(per || '7'), C = gorjetaCfg(), g = gorjetaPeriodo(P.de, P.ate, C);
  const pago = db.gorjetaPagas.find((x) => x.de === ymd(P.de) && x.ate === ymd(P.ate - 1));
  return volta('mais', 'Gorjetas e 10%', `${P.rot} · o serviço e as gorjetas divididos pela regra da casa`) + filtroPeriodo('gorjetas', P) + `
    <section class="kpis"><div><small>Serviço (10%)</small><b>${dinCurto(g.servico)}</b><span>${plural(g.vendas, 'venda', 'vendas')}</span></div><div><small>Gorjetas a mais</small><b>${dinCurto(g.extra)}</b><span>deixadas no pagamento</span></div>
      <div><small>Retenção da casa</small><b>${dinCurto(g.ret)}</b><span>${vir(C.retencao)}% do serviço (encargos)</span></div><div class="${pago ? '' : 'fin-alerta'}"><small>A dividir</small><b>${dinCurto(g.total)}</b><span>${pago ? `pago em ${new Date(pago.ts).toLocaleDateString('pt-BR')}` : 'ainda não pago'}</span></div></section>
    <section class="bloco"><div class="sec-tit"><h2>Relatório para pagar</h2><span>${REGRAS_GORJ.find((r) => r[0] === C.regra)?.[1]}</span></div><div class="tabela-rolo"><table class="tabela"><thead><tr><th>Pessoa</th><th class="num">${C.regra === 'pontos' ? 'Pontos' : C.regra === 'horas' ? 'Horas' : 'Parte'}</th><th class="num">%</th><th class="num">Recebe</th></tr></thead><tbody>
    ${g.linhas.map((l) => `<tr><td><b>${t(l.nome)}</b><small>${t(l.funcao)}</small></td><td class="num">${C.regra === 'igual' ? '1' : vir(l.base)}</td><td class="num">${vir(l.pct)}%</td><td class="num"><b>${dinCurto(l.valor)}</b></td></tr>`).join('') || '<tr><td colspan="4" class="vazio">Cadastre a equipe abaixo.</td></tr>'}</tbody></table></div>
      <div class="linha-bts" style="margin-top:10px"><button type="button" class="bt" data-acao="op-gorj-copiar" data-p="${t(per || '7')}">Copiar relatório</button><a class="bt zap" href="${zap('', textoGorjeta(P, g))}" target="_blank" rel="noopener">${ico('zap')}Mandar no WhatsApp</a>${pago ? '' : `<button type="button" class="bt cheio" data-acao="op-gorj-pagar" data-p="${t(per || '7')}">Marcar como pago</button>`}</div></section>
    <form class="form bloco-form" data-gorj><h2>Equipe e regra</h2><div class="duas-c"><label class="campo"><span>Como dividir</span><select name="regra">${REGRAS_GORJ.map(([k, nm]) => `<option value="${k}" ${k === C.regra ? 'selected' : ''}>${nm}</option>`).join('')}</select></label><label class="campo"><span>Retenção da casa para encargos (% do serviço)</span><input name="ret" inputmode="decimal" value="${vir(C.retencao)}"></label></div>
      <ul class="r4-pess" data-pess>${C.pessoas.map((p) => `<li data-pid="${t(p.id)}"><label class="campo"><span>Nome</span><input data-pn value="${t(p.nome)}" maxlength="40"></label><label class="campo r4-fun"><span>Função</span><input data-pf value="${t(p.funcao || '')}" maxlength="30"></label><label class="campo"><span>Pontos</span><input data-pp inputmode="decimal" value="${vir(p.pontos ?? 10)}"></label><label class="campo"><span>Horas</span><input data-ph inputmode="decimal" value="${vir(p.horas ?? 40)}"></label><button type="button" class="bt-ico" data-ptira aria-label="Tirar ${t(p.nome)}">${ico('lixo')}</button></li>`).join('')}</ul>
      <button type="button" class="link" data-pmais>+ Pessoa</button><button class="bt cheio" style="margin-top:10px">Salvar equipe e regra</button></form>
    ${db.gorjetaPagas.length ? `<section class="bloco"><div class="sec-tit"><h2>Pagamentos feitos</h2></div><ul class="r4-mini">${db.gorjetaPagas.slice().sort((a, b) => b.ts - a.ts).slice(0, 8).map((x) => `<li>${ico('moedas')}<span><b>${dataCurta(x.de)} a ${dataCurta(x.ate)} · ${dinCurto(x.total)}</b><small>${x.linhas.map((l) => `${t(l.nome)} ${dinCurto(l.valor)}`).join(' · ')}</small></span></li>`).join('')}</ul></section>` : ''}`;
};
MONTAR.gorjetas = (el) => {
  ligaPeriodo(el);
  const f = $('[data-gorj]', el); if (!f) return;
  const nova = () => `<li data-pid="${uid('gp')}"><label class="campo"><span>Nome</span><input data-pn maxlength="40"></label><label class="campo r4-fun"><span>Função</span><input data-pf maxlength="30"></label><label class="campo"><span>Pontos</span><input data-pp inputmode="decimal" value="10"></label><label class="campo"><span>Horas</span><input data-ph inputmode="decimal" value="40"></label><button type="button" class="bt-ico" data-ptira aria-label="Tirar">${ico('lixo')}</button></li>`;
  $('[data-pmais]', f).onclick = () => { $('[data-pess]', f).insertAdjacentHTML('beforeend', nova()); $('[data-pess] li:last-child [data-pn]', f).focus(); };
  f.addEventListener('click', (e) => { const x = e.target.closest('[data-ptira]'); if (x) x.closest('li').remove(); });
  f.onsubmit = (e) => {
    e.preventDefault();
    const pessoas = $$('[data-pess] li', f).map((li) => ({ id: li.dataset.pid, nome: $('[data-pn]', li).value.trim(), funcao: $('[data-pf]', li).value.trim(), pontos: Math.max(0, num($('[data-pp]', li).value)), horas: Math.max(0, num($('[data-ph]', li).value)) })).filter((p) => p.nome.length >= 2);
    db.config.gorjeta = { regra: f.regra.value, retencao: r2(Math.max(0, Math.min(40, num(f.ret.value)))), pessoas }; grava(); toast('Equipe e regra salvas');
  };
};
acao('op-gorj-copiar', async (b) => {
  const P = periodo(b.dataset.p), g = gorjetaPeriodo(P.de, P.ate);
  try { await navigator.clipboard.writeText(textoGorjeta(P, g)); toast('Relatório copiado'); } catch { toast('Não deu para copiar neste aparelho'); }
});
acao('op-gorj-pagar', async (b) => {
  garantirOp();
  const P = periodo(b.dataset.p), g = gorjetaPeriodo(P.de, P.ate);
  if (!(g.total > 0)) return toast('Nada para pagar no período');
  if (!(await confirma(`Marcar ${din(g.total)} de gorjetas (${P.rot}) como pago para a equipe?`, 'Marcar como pago'))) return;
  db.gorjetaPagas.push({ id: uid('gj'), de: ymd(P.de), ate: ymd(P.ate - 1), total: g.total, linhas: g.linhas.map((l) => ({ nome: l.nome, valor: l.valor })), regra: g.regra, ts: Date.now(), quem: quemAgora() });
  auditar('gorjetas-pagas', { valor: g.total, motivo: `Gorjetas de ${dataCurta(ymd(P.de))} a ${dataCurta(ymd(P.ate - 1))}` }); grava(); toast('Pagamento das gorjetas registrado');
});

// ---------------- manutenção
TELAS_MAIS.manutencao = () => {
  garantirOp();
  const hoje = ymd(), l = db.equipamentos.slice().sort((a, b) => (proximaPreventiva(a) || '9999').localeCompare(proximaPreventiva(b) || '9999'));
  const de90 = somaDias(hoje, -90), hist = l.flatMap((e) => (e.historico || []).map((h) => ({ ...h, e }))).sort((a, b) => b.data.localeCompare(a.data));
  const custo90 = soma(hist.filter((h) => h.data >= de90), (h) => h.custo), venc = l.filter((e) => ['vencida', 'hoje', 'parado'].includes(situacaoEq(e))), sete = l.filter((e) => situacaoEq(e) === 'logo');
  return volta('mais', 'Manutenção', 'Equipamentos da casa, preventivas, defeitos e quanto custam') + `<div class="linha-bts"><button type="button" class="bt cheio" data-acao="op-eq">${ico('mais2')}Novo equipamento</button></div>
    <section class="kpis"><div class="${venc.length ? 'fin-alerta' : ''}"><small>Vencidas ou parados</small><b>${venc.length}</b><span>resolver já</span></div><div><small>Próximos 7 dias</small><b>${sete.length}</b><span>preventivas</span></div><div><small>Custo em 90 dias</small><b>${dinCurto(custo90)}</b><span>${plural(hist.filter((h) => h.data >= de90).length, 'serviço', 'serviços')}</span></div><div><small>Equipamentos</small><b>${l.length}</b><span>cadastrados</span></div></section>
    <section class="bloco"><div class="tabela-rolo"><table class="tabela"><thead><tr><th>Equipamento</th><th>Próxima preventiva</th><th>Situação</th><th>Último serviço</th><th class="num">Custo total</th><th></th></tr></thead><tbody>
    ${l.map((e) => { const s = situacaoEq(e), u = (e.historico || []).slice().sort((a, b) => b.data.localeCompare(a.data))[0]; return `<tr class="${['vencida', 'parado'].includes(s) ? 'fin-atraso' : ''}"><td><b>${t(e.nome)}</b><small>${[e.local && t(e.local), e.tecnico && t(e.tecnico)].filter(Boolean).join(' · ')}</small></td><td>${proximaPreventiva(e) ? `${dataCurta(proximaPreventiva(e))}<small>a cada ${e.intervalo} dias</small>` : '<small class="mudo">sem prazo</small>'}</td><td>${pill(CLS_EQ[s], NOME_EQ[s])}</td>
      <td>${u ? `${dataCurta(u.data)}<small>${t(SERVICOS.find((x) => x[0] === u.tipo)?.[1] || '')}${u.desc ? ` · ${t(u.desc)}` : ''}</small>` : ''}</td><td class="num">${dinCurto(soma(e.historico || [], (h) => h.custo))}</td>
      <td class="acoes"><button type="button" class="bt pq ${['vencida', 'hoje', 'parado'].includes(s) ? 'cheio' : ''}" data-acao="op-servico" data-id="${e.id}">Registrar</button>${e.tel ? `<a class="bt-ico" href="${zap(e.tel, `Olá, aqui é do ${db.config.nome || 'restaurante'}. Preciso agendar a manutenção do ${e.nome}.`)}" target="_blank" rel="noopener" aria-label="WhatsApp do técnico">${ico('zap')}</a>` : ''}<button type="button" class="bt-ico" data-acao="op-eq" data-id="${e.id}" aria-label="Editar ${t(e.nome)}">${ico('ajustes')}</button></td></tr>`; }).join('') || '<tr><td colspan="6" class="vazio">Cadastre o forno, a chopeira, os freezers e o que precisar de manutenção.</td></tr>'}</tbody></table></div></section>
    <section class="bloco"><div class="sec-tit"><h2>Histórico</h2><span>defeitos, consertos e preventivas</span></div><div class="tabela-rolo"><table class="tabela"><thead><tr><th>Data</th><th>Equipamento</th><th>Serviço</th><th class="num">Custo</th></tr></thead><tbody>
    ${hist.slice(0, 30).map((h) => `<tr><td>${dataCurta(h.data)}</td><td><b>${t(h.e.nome)}</b></td><td>${pill(h.tipo === 'defeito' ? 'vencida' : h.tipo === 'conserto' ? 'aberta' : 'ok', SERVICOS.find((x) => x[0] === h.tipo)?.[1] || '')}<small>${t(h.desc)}${h.quem ? ` · ${t(h.quem)}` : ''}</small></td><td class="num">${h.custo ? dinCurto(h.custo) : ''}</td></tr>`).join('') || '<tr><td colspan="4" class="vazio">Nenhum serviço registrado.</td></tr>'}</tbody></table></div></section>`;
};
acao('op-eq', (b) => {
  garantirOp();
  const e = db.equipamentos.find((x) => x.id === b.dataset.id), novo = !e, x = e || { nome: '', local: '', intervalo: 90, ultima: '', tecnico: '', tel: '', obs: '' };
  folha({ titulo: novo ? 'Novo equipamento' : x.nome, corpo: `<label class="campo"><span>Nome</span><input data-n maxlength="60" value="${t(x.nome)}" placeholder="Ex.: Forno de pizza, chopeira, freezer"></label>
    <div class="duas-c"><label class="campo"><span>Onde fica (opcional)</span><input data-l maxlength="40" value="${t(x.local || '')}" placeholder="Ex.: cozinha"></label><label class="campo"><span>Preventiva a cada (dias)</span><input data-i inputmode="numeric" value="${x.intervalo || ''}" placeholder="0 = sem"></label></div>
    <div class="duas-c"><label class="campo"><span>Última preventiva</span><input type="date" data-u value="${x.ultima || ''}"></label><label class="campo"><span>Técnico ou empresa</span><input data-t maxlength="60" value="${t(x.tecnico || '')}"></label></div>
    <label class="campo"><span>WhatsApp do técnico (opcional)</span><input data-tel inputmode="tel" value="${t(x.tel || '')}"></label>
    <label class="campo"><span>Observação</span><input data-o maxlength="160" value="${t(x.obs || '')}"></label>
    ${novo ? '' : '<button type="button" class="bt perigo" data-apagar>Apagar equipamento</button>'}`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
  aoAbrir: (f, fechar) => {
    $('[data-apagar]', f)?.addEventListener('click', async () => { if (!(await confirma(`Apagar ${e.nome} e o histórico dele?`, 'Apagar', true))) return; db.equipamentos = db.equipamentos.filter((y) => y !== e); grava(); fechar(); toast('Equipamento apagado'); });
    $('[data-ok]', f).onclick = () => {
      const nome = $('[data-n]', f).value.trim(); if (nome.length < 2) { toast('Escreva o nome'); return $('[data-n]', f).focus(); }
      const d = { nome, local: $('[data-l]', f).value.trim(), intervalo: Math.max(0, Math.round(num($('[data-i]', f).value))), ultima: $('[data-u]', f).value, tecnico: $('[data-t]', f).value.trim(), tel: $('[data-tel]', f).value.replace(/\D/g, ''), obs: $('[data-o]', f).value.trim() };
      if (novo) db.equipamentos.push({ id: uid('eq'), historico: [], ...d }); else Object.assign(e, d);
      grava(); fechar(); toast(novo ? 'Equipamento cadastrado' : 'Equipamento salvo');
    };
  } });
});
acao('op-servico', (b) => {
  const e = (db.equipamentos || []).find((x) => x.id === b.dataset.id); if (!e) return;
  folha({ titulo: `Registrar · ${e.nome}`, corpo: `<label class="campo"><span>O que foi</span><select data-tp>${SERVICOS.map(([k, nm]) => `<option value="${k}" ${k === (['vencida', 'hoje', 'logo'].includes(situacaoEq(e)) ? 'preventiva' : e.parado ? 'conserto' : 'defeito') ? 'selected' : ''}>${nm}</option>`).join('')}</select></label>
    <div class="duas-c"><label class="campo"><span>Data</span><input type="date" data-d value="${ymd()}"></label><label class="campo"><span>Custo (R$, opcional)</span><input data-c inputmode="decimal" placeholder="0,00"></label></div>
    <label class="campo"><span>Descrição</span><input data-ds maxlength="160" placeholder="Ex.: troca da borracha da porta"></label>
    <label class="interruptor bloco-int" data-parx><input type="checkbox" data-par><span></span>O equipamento parou (fica marcado até o conserto)</label>
    <label class="campo" data-ctx><span>Lançar o custo em Contas</span><select data-ct><option value="paga">Já paguei (conta paga)</option><option value="pagar">A pagar em 15 dias</option><option value="">Não lançar</option></select></label>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Registrar</button>',
  aoAbrir: (f, fechar) => {
    const ver = () => { $('[data-parx]', f).hidden = $('[data-tp]', f).value !== 'defeito'; }; $('[data-tp]', f).onchange = ver; ver();
    $('[data-ok]', f).onclick = () => {
      const tipo = $('[data-tp]', f).value, desc = $('[data-ds]', f).value.trim(); if (tipo !== 'preventiva' && desc.length < 3) { toast('Descreva o defeito ou o conserto'); return $('[data-ds]', f).focus(); }
      e.paraDefeito = $('[data-par]', f).checked;
      registrarServico(e, { tipo, data: $('[data-d]', f).value || ymd(), desc, custo: num($('[data-c]', f).value), conta: $('[data-ct]', f).value }); delete e.paraDefeito; grava();
      fechar(); toast(tipo === 'preventiva' ? `Preventiva registrada${proximaPreventiva(e) ? ` · próxima em ${dataCurta(proximaPreventiva(e))}` : ''}` : 'Registrado no histórico');
    };
  } });
});

// ------------------------------------------------------------------ demonstração (uma vez): conferência com divergência, devolução,
// rendimento real, rastreio, conciliação, contas que se repetem, consumo interno, gorjetas, metas e equipamentos
export function semearOperacao() {
  if (!db.exemplo || db.opDemo || !db.fornecedores || !db.producoes) return false;
  garantirFin(); garantirOp();
  const hoje = ymd(), d = (n) => somaDias(hoje, n), pad = (x) => String(x).padStart(2, '0'), ts = (n, h = 10, m = 0) => new Date(`${d(n)}T${pad(h)}:${pad(m)}`).getTime();
  const nn = (id) => db.notasCompra.find((n) => n.id === id), ct = (id) => db.contas.find((c) => c.id === id);
  // 1. compra de ontem conferida: faltou 1 kg de queijo que não vem mais; a conta caiu para o conferido
  if (insumo('queijo') && insumo('ovo') && !nn('nc7')) {
    const n = { id: 'nc7', fornecedor: 'fo3', data: d(-1), itens: [{ insumo: 'queijo', qtd: 6, total: 251.4, recebido: 5 }, { insumo: 'ovo', qtd: 2, total: 42, recebido: 2 }], frete: 0, obs: '', status: 'recebida', criado: ts(-1, 8), recebidaEm: ts(-1, 10), quem: 'Bruna', encerrada: { ts: ts(-1, 10), quem: 'Bruna' },
      divergencias: [{ id: 'dvx1', k: 0, insumo: 'queijo', tipo: 'faltou', esperado: 6, chegou: 5, motivo: 'Fornecedor sem estoque, não vem mais', ts: ts(-1, 10), quem: 'Bruna' }] };
    n.valorAjustado = valorConferido(n); db.notasCompra.push(n);
    const tot = totalNota(n);
    db.contas.push({ id: 'ctc7', tipo: 'pagar', desc: 'Compra de Laticínios Serra Azul', categoria: 'fornecedor', valor: n.valorAjustado, valorOriginal: tot, ajustes: [{ valor: r2(n.valorAjustado - tot), motivo: 'Conferência: Queijo muçarela faltou', ts: ts(-1, 10), quem: 'Bruna' }], venc: d(13), fornecedor: 'fo3', compra: 'nc7', pagamentos: [], recorrente: false, criado: ts(-1, 10), obs: 'Boleto 14 dias' });
    n.contas = ['ctc7'];
  }
  // tomate com 1 kg avariado na compra do hortifrúti (já paga: virou crédito com o fornecedor)
  const n5 = nn('nc5');
  if (n5 && !n5.divergencias) { const k = n5.itens.findIndex((it) => it.insumo === 'tomate'); if (k >= 0) { n5.itens[k].recebido = r2(n5.itens[k].qtd - 1); n5.divergencias = [{ id: 'dvx2', k, insumo: 'tomate', tipo: 'avariado', esperado: n5.itens[k].qtd, chegou: n5.itens[k].recebido, motivo: '1 kg amassado, recusado na entrega', ts: ts(-5, 9), quem: 'Lia' }]; n5.encerrada = { ts: ts(-5, 9), quem: 'Lia' };
    const v = valorConferido(n5), dif = r2(totalNota(n5) - v); n5.valorAjustado = v; db.contas.push({ id: 'crx1', tipo: 'receber', desc: 'Crédito com Hortifruti Ferraz', categoria: 'outros', valor: dif, venc: d(2), fornecedor: 'fo2', pagamentos: [], recorrente: false, criado: ts(-5, 9), obs: 'Conferência: Tomate avariado · abater no próximo pedido' }); } }
  // 2. devolução: 1 kg de frango abatido na 2ª parcela do frigorífico
  const n4 = nn('nc4'), c2 = ct('ctp2');
  if (n4 && c2 && !n4.devolucoes) { const k = n4.itens.findIndex((it) => it.insumo === 'frango'); if (k >= 0) { const it = n4.itens[k], valor = r2(1 * custoUnit(n4, it)); it.devolvido = 1; c2.valorOriginal = c2.valor; c2.valor = r2(c2.valor - valor);
    c2.ajustes = [{ valor: -valor, motivo: 'Devolução de 1 kg de Peito de frango: embalagem violada', ts: ts(-8, 11), quem: 'Bruna' }];
    n4.devolucoes = [{ id: 'dvd1', k, insumo: 'frango', qtd: 1, valor, motivo: 'Embalagem violada, cheiro forte', destino: 'abater', conta: 'ctp2', credito: '', ts: ts(-8, 11), quem: 'Bruna' }]; } }
  // 3. rendimento real e rastreio nas produções da demonstração (+ histórico sem mexer no estoque)
  if (insumo('acem') && !db.lotes.some((l) => l.id === 'lt7')) db.lotes.push({ id: 'lt7', insumo: 'acem', qtd: 6000, validade: d(3), origem: 'compra', ref: '', data: d(-3), criado: ts(-3, 9) });
  const ajusta = (lt, real, lotes = {}) => { const p = db.producoes.find((x) => x.lote === lt); if (!p || p.previsto) return; p.previsto = p.qtd; p.real = real; p.qtd = real; const l = db.lotes.find((x) => x.id === lt); if (l) l.qtd = real; (p.consumo || []).forEach((c) => { c.lotes = lotes[c.insumo] ? [{ lote: lotes[c.insumo], qtd: c.qtd }] : []; }); };
  ajusta('lt1', 4650, { tomate: 'lt6' }); ajusta('lt2', 10); ajusta('lt3', 19, { acem: 'lt7' }); ajusta('lt4', 20, { acem: 'lt7' });
  const hist = (id, dd, prev, real) => { const i = insumo(id); if (!i?.preparo) return; db.producoes.push({ id: `prh-${id}${-dd}`, insumo: id, qtd: real, previsto: prev, real, data: d(dd), ts: ts(dd, 8), lote: '', custo: r2(custoUnRec(i) * prev), quem: 'Lia', consumo: consumoProducao(i, prev).map(({ j, q }) => ({ insumo: j.id, qtd: q, lotes: [] })) }); };
  [['molho', -26, 5000, 4900], ['molho', -19, 5000, 4750], ['molho', -12, 5000, 4800], ['molho', -6, 5000, 4600], ['massa', -20, 10, 10], ['massa', -13, 10, 9], ['massa', -7, 10, 10], ['massa', -4, 10, 10], ['blend', -15, 20, 20], ['blend', -10, 20, 19], ['blend', -5, 20, 20]].forEach((x) => hist(...x));
  // 4. parte do delivery pago pelo app e a conciliação dos últimos dias (um dia com diferença no dinheiro, ontem a conferir)
  let k = 0; db.vendas.forEach((v) => { if (v.tipo === 'delivery' && !v.pagamentos && String(v.id).startsWith('h') && k++ % 3 === 0) v.forma = 'iFood (app)'; });
  for (let dd = -7; dd <= -2; dd++) { const e = esperadoDia(d(dd)), inf = Object.fromEntries(Object.entries(e).map(([g, x]) => [g, x.esperado])); if (!Object.keys(inf).length) continue; if (dd === -4) { const g = inf.dinheiro != null ? 'dinheiro' : Object.keys(inf)[0]; inf[g] = r2(inf[g] - 12.5); } conferirDia(d(dd), inf, true); db.conciliacao[d(dd)].ok = ts(dd + 1, 9, 30); db.conciliacao[d(dd)].quem = 'Bruna'; }
  // 5. contas que se repetem todo mês
  ['sa1', 'ag1', 'en1'].forEach((id) => { const c = ct(id); if (c) c.recorrente = true; });
  // 6. consumo interno e cortesias (sem mexer no estoque da demonstração)
  const ci = (dd, h, tipo, itens, motivo, autorizou, para = '') => { const fv = { itens: itens.map(([pid, qtd]) => { const p = prod(pid); return p ? { prod: p.id, nome: p.nome, qtd, preco: p.preco } : null; }).filter(Boolean) }; if (!fv.itens.length) return;
    db.consumoInterno.push({ id: `ci${-dd}${h}`, tipo, itens: fv.itens.map(({ prod: pr, nome, qtd }) => ({ prod: pr, nome, qtd })), custo: custoVenda(fv), cardapio: soma(fv.itens, (x) => x.preco * x.qtd), motivo, autorizou, para, ts: ts(dd, h), quem: 'Bruna' }); };
  ci(-9, 11, 'Refeição de funcionário', [['executivo', 4]], 'Almoço da equipe', 'Dono', 'cozinha e salão');
  ci(-6, 16, 'Degustação', [['pz_frango', 1]], 'Teste da massa nova', 'Dono', 'equipe da cozinha');
  ci(-5, 21, 'Cortesia', [['pudim', 2]], 'Prato atrasou 40 minutos', 'Rafael', 'mesa 5');
  ci(-3, 11, 'Refeição de funcionário', [['executivo', 3], ['refri', 3]], 'Almoço da equipe', 'Bruna', 'salão');
  ci(-2, 20, 'Consumo do dono', [['picanha', 1], ['cerveja', 2]], 'Jantar com fornecedor', 'Dono');
  ci(-1, 22, 'Cortesia', [['petit', 1]], 'Aniversário do cliente', 'Diego', 'mesa 8');
  // 7. gorjetas: equipe com pontos e horas e um pagamento da semana passada
  db.config.gorjeta = { regra: 'pontos', retencao: 20, pessoas: [{ id: 'gp1', nome: 'Rafael', funcao: 'Garçom', pontos: 10, horas: 44 }, { id: 'gp2', nome: 'Bruna', funcao: 'Garçonete e caixa', pontos: 10, horas: 40 }, { id: 'gp3', nome: 'Diego', funcao: 'Garçom', pontos: 10, horas: 36 }, { id: 'gp4', nome: 'Lia', funcao: 'Cozinheira', pontos: 6, horas: 44 }, { id: 'gp5', nome: 'Otávio', funcao: 'Auxiliar de cozinha', pontos: 4, horas: 40 }] };
  const ini = tsDia(d(-14)) - 12 * 36e5, fim = tsDia(d(-7)) - 12 * 36e5, g = gorjetaPeriodo(ini, fim);
  if (g.total > 0) db.gorjetaPagas.push({ id: 'gj1', de: d(-14), ate: d(-8), total: g.total, linhas: g.linhas.map((l) => ({ nome: l.nome, valor: l.valor })), regra: 'pontos', ts: ts(-7, 18), quem: 'Dono' });
  // 8. metas do mês: um pouco acima do ritmo dos últimos 30 dias
  const u = dre(Date.now() - 30 * DIA, Date.now() + 1), tk = u.vendas ? u.liquida / u.vendas : 60;
  db.config.metas = { faturamento: Math.max(5000, Math.ceil((u.liquida * 1.1) / 1000) * 1000), ticket: Math.ceil(tk * 1.06), cmv: 32 };
  // 9. equipamentos e o histórico de manutenção
  const eq = (id, nome, local, intervalo, ultima, tecnico, tel, historico, extra = {}) => db.equipamentos.push({ id, nome, local, intervalo, ultima: ultima == null ? '' : d(ultima), tecnico, tel, obs: '', historico: historico.map(([dd, tipo, desc, custo], k) => ({ id: `${id}h${k}`, tipo, data: d(dd), desc, custo, quem: 'Dono', ts: ts(dd, 15) })), ...extra });
  eq('eq1', 'Forno de pizza a lenha', 'cozinha', 90, -95, 'Fornos Brasa Viva', '16991230000', [[-95, 'preventiva', 'Limpeza da chaminé e troca de tijolos', 650]]);
  eq('eq2', 'Chopeira 2 vias', 'bar', 15, -14, 'Gelo Fino Refrigeração', '16992340000', [[-14, 'preventiva', 'Limpeza das serpentinas', 120], [-29, 'preventiva', 'Limpeza das serpentinas', 120]]);
  eq('eq3', 'Freezer horizontal 500 L', 'estoque', 180, -60, 'Gelo Fino Refrigeração', '16992340000', [[-60, 'preventiva', 'Revisão geral', 180], [-40, 'defeito', 'Porta não vedava, formando gelo', 0], [-38, 'conserto', 'Troca da borracha da porta', 180]]);
  eq('eq4', 'Coifa e exaustor', 'cozinha', 90, -16, 'Limpa Coifa Express', '', [[-16, 'preventiva', 'Limpeza completa da coifa', 380]]);
  eq('eq5', 'Chapa de lanches', 'cozinha', 60, -20, '', '', [[-20, 'preventiva', 'Regulagem dos queimadores', 90], [-2, 'defeito', 'Um queimador apagando sozinho', 0]]);
  db.opDemo = 1; gerarRecorrentes(); grava(); return true;
}
semearOperacao();
// "Recomeçar a demonstração" troca o db inteiro: semeia de novo depois do financeiro e da produção
ouvir(() => { if (db.exemplo && !db.opDemo && db.fornecedores && db.producoes) semearOperacao(); });
