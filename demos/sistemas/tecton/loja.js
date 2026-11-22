// Tecton · Loja de material de construção: balcão com leitor de código de barras, orçamento rápido no WhatsApp, estoque com
// unidades e fracionado, entregas com roteiro e caminhão, conta da obra, fiado com limite, compras, preço por tabela e
// desconto por quantidade, relatórios do que gira e do que está parado.
import { mesAno, db, grava, tela, acao, ir, cab, vazio, barra, ico, t, R$, R0, n2, pc, dataBR, dataCurta, quando, hoje, somaDias, dias, uid, soma, num, fone,
  folha, editar, campos, toast, confirma, $, $$, pessoa, nomeDe, whatsapp, imprimir, recibo, pl, ACOES, pixCopiaCola } from './nucleo.js?v=3';
import { PAINEIS, numero, saudacao, ORIGENS, ENTRADAS_CAIXA, RELACIONADOS, BUSCAS, editarPessoa, gestor } from './comum.js?v=3';
import { escolhaNoReceber, aposReceber, etiquetaNota, botaoNota, avisoDevolucao, folhaExportar, modoNf } from './nota.js?v=3';

const R = 'loja';
const prod = (id) => db.produtos.find((p) => p.id === id);
const UN = { sc: 'saco', 'm³': 'm³', 'm²': 'm²', m: 'metro', pç: 'peça', br: 'barra', kg: 'kg', lata: 'lata', bd: 'balde', rolo: 'rolo', lt: 'litro', cx: 'caixa', un: 'unidade' };
const fracionavel = (un) => ['m³', 'm²', 'm', 'kg', 'lt'].includes(un);
const tabelas = () => db.config.tabelas || [{ id: 'balcao', nome: 'Balcão', desc: 0 }];
const descTabela = (id) => tabelas().find((x) => x.id === id)?.desc || 0;
function preco(p, qtd, tabela) {
  const tb = descTabela(tabela), fx = (p.faixas || []).filter((f) => qtd >= f.min).reduce((m, f) => Math.max(m, f.desc), 0), d = Math.max(tb, fx);
  return { unit: Math.round(p.preco * (1 - d / 100) * 100) / 100, desc: d, porque: d ? (fx >= tb ? `−${n2(fx)}% a partir de ${n2((p.faixas || []).filter((f) => qtd >= f.min && f.desc === fx)[0].min)} ${p.un}` : `−${n2(tb)}% tabela ${tabelas().find((x) => x.id === tabela)?.nome}`) : '' };
}
const UNP = { sc: 'sc', rolo: 'rolos', lata: 'latas', bd: 'baldes', pç: 'pç', br: 'br', cx: 'cx', un: 'un' };
const unTxt = (q, un) => `${n2(q, 3)} ${Number(q) === 1 ? un : UNP[un] || un}`;
// já vendido e esperando o caminhão: fica separado (não pode ser vendido de novo)
const reservado = (p) => soma(db.entregas.filter((e) => ['agendada', 'saiu'].includes(e.status)), (e) => soma((e.itens || []).filter((x) => x.prod === p.id || (!x.prod && x.nome === p.nome)), (x) => x.qtd - (x.ok || 0)));
const estoqueTxt0 = (p) => `${unTxt(p.estoque, p.un)}${p.fator > 1 ? ` (${n2(p.estoque / p.fator, 1)} ${p.compra})` : ''}${p.porCaixa ? ` (${n2(p.estoque / p.porCaixa, 0)} cx)` : ''}`;
const estoqueTxt = (p) => { const r = reservado(p); return `${estoqueTxt0(p)}${r ? ` · ${unTxt(r, p.un)} separado para entrega ou retirada` : ''}`; };
const saldoConta = (c) => soma(db.vendas.filter((v) => v.conta === c.id), (v) => v.total) - soma(c.pagamentos, (x) => x.valor);
const saldoFiado = (pid) => soma(db.fiado.filter((f) => f.pessoa === pid), (f) => f.valor);
const PARADO = 60;
const parado = (p) => p.estoque > 0 && (!p.ult || p.ult < somaDias(hoje(), -PARADO));
const baixo = (p) => p.estoque <= p.minimo && p.minimo > 0;
// a compra mais antiga ainda não paga (os pagamentos abatem da mais antiga para a mais nova)
function maisAntigo(compras, pago) { let resto = pago; const l = compras.slice().sort((a, b) => a.dia.localeCompare(b.dia)); for (const c of l) { if (resto >= c.valor - 0.009) { resto -= c.valor; continue; } return c.dia; } return ''; }
const PRAZO = () => db.config.prazoFiado || 30;
function idade(d, prazo = PRAZO()) { if (!d) return { txt: 'em dia', cls: 'ok', atraso: 0 }; const n = dias(d, hoje()), v = n - prazo; return v > 0 ? { txt: `atrasado ${pl(v, 'dia', 'dias')}`, cls: 'erro', atraso: v } : v === 0 ? { txt: 'vence hoje', cls: 'atn', atraso: 0 } : { txt: `vence em ${pl(-v, 'dia', 'dias')}`, cls: 'info', atraso: 0 }; }
function situacaoFiado(pid) { const l = db.fiado.filter((f) => f.pessoa === pid); return idade(maisAntigo(l.filter((f) => f.valor > 0).map((f) => ({ dia: f.dia, valor: f.valor })), -soma(l.filter((f) => f.valor < 0), (f) => f.valor))); }
function situacaoConta(c) { return idade(maisAntigo(db.vendas.filter((v) => v.conta === c.id).map((v) => ({ dia: v.dia, valor: v.total })), soma(c.pagamentos, (x) => x.valor)), c.prazo || PRAZO()); }
const caixaAtual = () => { try { return localStorage.getItem('tecton-caixa') || 'Caixa 1'; } catch { return 'Caixa 1'; } };
const ST_ENT = { agendada: ['a sair', 'info'], saiu: ['saiu', 'atn'], parcial: ['entregue em parte', 'erro'], entregue: ['entregue', 'ok'] };
const ST_RET = { agendada: ['esperando retirar', 'info'], saiu: ['esperando retirar', 'info'], parcial: ['retirou em parte', 'erro'], entregue: ['retirado', 'ok'] };
const retira = (e) => e.modo === 'retira';
const stEnt = (e) => (retira(e) ? ST_RET : ST_ENT)[e.status];
// trava de crédito: atrasado ou sem limite disponível = só o dono libera a venda a prazo
function credito(pid, conta) {
  const at = atrasoCli(pid), lim = conta ? conta.limite : pessoa(pid)?.limite || 0, deve = conta ? saldoConta(conta) : saldoFiado(pid), disp = Math.max(0, lim - Math.max(0, deve));
  if (at > 0) return { trav: true, txt: `Travado: atrasado ${pl(at, 'dia', 'dias')}`, sub: 'só o dono libera venda a prazo', disp };
  if (lim > 0 && disp < 0.01) return { trav: true, txt: 'Travado: limite usado inteiro', sub: 'receba ou aumente o limite', disp };
  return { trav: false, txt: `Liberado: pode comprar ${R$(disp)}`, sub: `usou ${pc(lim ? Math.max(0, deve) / lim * 100 : 0)} do limite`, disp };
}
const travaHtml = (c) => `<div class="trava ${c.trav ? 'erro' : 'ok'}">${ico(c.trav ? 'cadeado' : 'aberto')}<span><b>${t(c.txt)}</b><small>${t(c.sub)}</small></span></div>`;

// ------------------------------------------------------------------ painel
PAINEIS[R] = {
  padrao: ['k-vendas', 'k-entregas', 'k-fiado', 'k-baixo', 'entregas', 'cobrar', 'orcs', 'comprar'],
  nomes: { 'k-vendas': 'Vendas hoje (número)', 'k-entregas': 'Entregas do caminhão (número)', 'k-fiado': 'A receber a prazo (número)', 'k-baixo': 'Estoque baixo (número)', 'k-caixa': 'Caixas abertos (número)', entregas: 'Lista das entregas e retiradas', cobrar: 'Quem cobrar', orcs: 'Orçamentos esperando resposta', comprar: 'Repor o estoque (abaixo do mínimo)', formas: 'Vendas de hoje por forma de pagamento', parado: 'Parado no estoque' },
  cab() { return `<div class="cab"><div><h1>${saudacao()}, ${t(db.config.nome || 'loja')}</h1><p>${t(db.config.cidade || '')} · ${dataBR(hoje())}</p></div><div class="linha-bts"><button type="button" class="bt" data-ir="orcs">${ico('orcamento')}Orçamento</button><button type="button" class="bt cheio" data-ir="balcao">${ico('codigo')}Vender no balcão</button></div></div>`; },
  blocos() {
    const hv = db.vendas.filter((v) => v.dia === hoje()), ent = db.entregas.filter((e) => e.dia === hoje() || (retira(e) && e.status === 'agendada')).sort((a, b) => retira(a) - retira(b) || a.ordem - b.ordem), bx = db.produtos.filter(baixo);
    const devedores = [...db.contasObra.map((c) => ({ n: `${nomeDe(c.cliente)} · ${c.obra}`, s: saldoConta(c), i: situacaoConta(c), k: credito(c.cliente, c) })), ...[...new Set(db.fiado.map((f) => f.pessoa))].map((p) => ({ n: nomeDe(p), s: saldoFiado(p), i: situacaoFiado(p), k: credito(p) }))].filter((x) => x.s > 0.009);
    const aRec = soma(devedores, (x) => x.s), atras = devedores.filter((x) => x.i.atraso > 0), orcs = db.orcs.filter((o) => o.status === 'enviado');
    const ret = db.entregas.filter((e) => retira(e) && e.status === 'agendada').length, ents = ent.filter((e) => !retira(e));
    return {
      'k-vendas': { tipo: 'kpi', html: () => numero('dinheiro', 'Vendas hoje', R$(soma(hv, (v) => v.total)), pl(hv.length, 'venda', 'vendas'), 'relatorios') },
      'k-entregas': { tipo: 'kpi', html: () => numero('caminhao', 'Entregas de caminhão hoje', pl(ents.length, 'entrega', 'entregas'), `${ents.filter((e) => e.status === 'agendada').length} a sair · ${ents.filter((e) => e.status === 'saiu').length} na rua · ${ents.filter((e) => ['entregue', 'parcial'].includes(e.status)).length} feitas${ret ? `<br>fora isso, ${pl(ret, 'retirada', 'retiradas')} no depósito` : ''}`, 'entregas') },
      'k-fiado': { tipo: 'kpi', html: () => { const co = soma(db.contasObra, (c) => Math.max(0, saldoConta(c))); return numero('conta', 'A receber a prazo', R$(aRec), `conta da obra ${R$(co)} · fiado ${R$(aRec - co)}${atras.length ? ` · ${pl(atras.length, 'atrasada', 'atrasadas')}` : ''}`, 'contas'); } },
      'k-baixo': { tipo: 'kpi', html: () => numero('caixa', 'Estoque baixo', pl(bx.length, 'produto', 'produtos'), 'abaixo do mínimo', 'estoque/baixo') },
      'k-caixa': { tipo: 'kpi', html: () => { const cxs = db.config.caixas || ['Caixa 1', 'Caixa 2'], ab = cxs.filter((x) => { const s = (db.caixasDia || []).find((c) => c.caixa === x && c.dia === hoje()); return s && !s.fechado; }); return numero('dinheiro', 'Caixas abertos', `${ab.length} de ${cxs.length}`, ab.length ? t(ab.join(', ')) : 'nenhum aberto hoje', 'caixa'); } },
      entregas: { tipo: 'meia', html: () => `<div class="cartao"><div class="cartao-cab"><h2>Entregas de hoje</h2><button type="button" class="bt pq" data-ir="entregas">Roteiro</button></div>${ent.length ? `<ul class="lista">${ent.map((e) => `<li><span class="ponto ${e.status === 'entregue' ? 'ok' : e.status === 'agendada' ? '' : 'and'}"></span><div class="tx"><b>${t(nomeDe(e.cliente))}</b><small>${retira(e) ? 'retira no depósito' : `${t(e.endereco)} · ${t(db.caminhoes.find((c) => c.id === e.caminhao)?.nome || '')}`}${e.ocorr ? ` · <span class="vermelho">${t(e.ocorr)}</span>` : ''}</small></div><span class="et ${stEnt(e)[1]}">${stEnt(e)[0]}</span></li>`).join('')}</ul>` : vazio('Nenhuma entrega hoje.')}</div>` },
      cobrar: { tipo: 'meia', html: () => `<div class="cartao"><div class="cartao-cab"><h2>Cobrar</h2><button type="button" class="bt pq" data-ir="contas">Ver</button></div>${devedores.length ? `<ul class="lista">${devedores.sort((a, b) => b.i.atraso - a.i.atraso || b.s - a.s).map((x) => `<li><div class="tx"><b>${t(x.n)}</b><small><span class="et ${x.i.cls}">${x.i.txt}</span>${x.k.trav ? ` <span class="et erro">${ico('cadeado')}${x.i.atraso > 0 ? 'a prazo travado' : 'limite estourado'}</span>` : ''}</small></div><div class="val">${R$(x.s)}</div></li>`).join('')}</ul><p class="forte" style="margin-top:8px;text-align:right">Total ${R$(aRec)}</p>` : '<p class="mudo">Ninguém devendo.</p>'}</div>` },
      orcs: { tipo: 'meia', html: () => `<div class="cartao"><div class="cartao-cab"><h2>Orçamentos esperando resposta</h2><button type="button" class="bt pq" data-ir="orcs">Ver</button></div>${orcs.length ? `<ul class="lista">${orcs.map((o) => `<li><div class="tx"><b>${t(o.nome)}</b><small>${pl(o.itens.length, 'item', 'itens')} · vale até ${dataBR(o.validade)}</small></div><div class="val">${R$(o.total)}</div><button type="button" class="bt pq" data-acao="orc-venda" data-id="${o.id}">Virar venda</button></li>`).join('')}</ul>` : vazio('Nenhum orçamento esperando.')}</div>` },
      comprar: { tipo: 'meia', html: () => `<div class="cartao"><div class="cartao-cab"><h2>Repor o estoque</h2><button type="button" class="bt pq" data-acao="rep-baixo">Montar pedido</button></div>${bx.length ? `<ul class="lista">${bx.slice(0, 6).map((p) => `<li><div class="tx"><b>${t(p.nome)}</b><small>tem ${estoqueTxt(p)} · mínimo ${n2(p.minimo)} ${p.un}</small></div><span class="et erro">baixo</span></li>`).join('')}</ul>` : '<p class="mudo">Estoque em dia.</p>'}</div>` },
      formas: { tipo: 'meia', html: () => { const por = {}; hv.forEach((v) => { por[v.forma] = (por[v.forma] || 0) + v.total; }); const tot = soma(hv, (v) => v.total);
        return `<div class="cartao"><div class="cartao-cab"><h2>Vendas de hoje por forma</h2><button type="button" class="bt pq" data-ir="caixa">Caixa do dia</button></div>${hv.length ? `<ul class="lista">${Object.entries(por).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li><div class="tx"><b>${t(k)}</b><small>${pl(hv.filter((x) => x.forma === k).length, 'venda', 'vendas')}</small></div><div class="val">${R$(v)}<small>${pc(v / (tot || 1) * 100)}</small></div></li>`).join('')}</ul>` : '<p class="mudo">Nenhuma venda hoje ainda.</p>'}</div>`; } },
      parado: { tipo: 'meia', html: () => { const par = db.produtos.filter(parado).map((p) => ({ p, v: p.estoque * p.custo })).sort((a, b) => b.v - a.v);
        return `<div class="cartao"><div class="cartao-cab"><h2>Parado no estoque</h2><button type="button" class="bt pq" data-ir="relatorios">Relatórios</button></div>${par.length ? `<ul class="lista">${par.slice(0, 6).map(({ p, v }) => `<li><div class="tx"><b>${t(p.nome)}</b><small>${p.ult ? 'última venda em ' + dataBR(p.ult) : 'nunca vendeu'}</small></div><div class="val">${R$(v)}</div></li>`).join('')}</ul><p class="mudo peq" style="margin-top:8px">${R$(soma(par, (x) => x.v))} parados há ${PARADO} dias ou mais, pelo custo.</p>` : '<p class="mudo">Nada parado.</p>'}</div>`; } },
    };
  },
};

// ------------------------------------------------------------------ balcão
const novoCart = () => ({ itens: [], cliente: '', tabela: 'balcao', orc: '', frete: 0 });
let cart = novoCart();
const tabelaCart = () => Math.round(soma(cart.itens, (i) => i.qtd * (prod(i.prod)?.preco ?? i.unit)) * 100) / 100;
const itensCart = () => Math.round(soma(cart.itens, (i) => i.qtd * i.unit) * 100) / 100;
const totalCart = () => Math.round((itensCart() + (cart.frete || 0)) * 100) / 100;
function reprecificar() { cart.itens.forEach((i) => { const p = prod(i.prod); if (!p) return; const r = preco(p, i.qtd, cart.tabela); i.unit = r.unit; i.desc = r.desc; i.porque = r.porque; }); }
function adicionar(p, qtd = 1) {
  const j = cart.itens.find((i) => i.prod === p.id);
  if (j) j.qtd = Math.round((j.qtd + qtd) * 1000) / 1000; else cart.itens.push({ prod: p.id, nome: p.nome, un: p.un, qtd, unit: p.preco, desc: 0 });
  reprecificar(); if (p.estoque < (j?.qtd || qtd)) toast(`Atenção: só tem ${estoqueTxt(p)} no estoque`);
}
function acharCodigo(s) { const c = s.replace(/\D/g, ''); return c.length >= 8 ? db.produtos.find((p) => p.cod === c) : null; }
function linhaItem(i, k) {
  const p = prod(i.prod), cx = p?.porCaixa ? Math.ceil(i.qtd / p.porCaixa - 1e-9) : 0;
  return `<li><div class="tx"><b>${t(i.nome)}</b><small>${i.desc ? `<span class="riscado">${R$(p?.preco ?? i.unit)}</span> ` : ''}<b>${R$(i.unit)}</b> por ${t(UN[i.un] || i.un)}${i.porque ? ` · ${t(i.porque)}` : ''}</small>${p?.porCaixa ? `<small>${cx} cx de ${n2(p.porCaixa)} m² = ${n2(cx * p.porCaixa)} m²${Math.abs(cx * p.porCaixa - i.qtd) > 0.01 ? ` · <button type="button" class="bt pq" style="min-height:30px" data-cx="${k}">Fechar ${cx} caixas</button>` : ''}</small>` : ''}${p?.lote ? `<small>Lote ${t(p.lote)}</small>` : ''}${p?.fator > 1 ? `<small>= ${n2(i.qtd / p.fator, 2)} ${t(p.compra)} de ${n2(p.fator)} ${t(p.un)}</small>` : ''}</div><div class="qtd"><input inputmode="decimal" data-q="${k}" value="${n2(i.qtd, 3)}" aria-label="Quantidade de ${t(i.nome)}"><span>${t(i.un)}</span></div><div class="val">${R$(i.qtd * i.unit)}</div><button type="button" class="bt-ico" data-tira="${k}" aria-label="Tirar ${t(i.nome)}">${ico('x')}</button></li>`;
}
tela('balcao', {
  titulo: 'Balcão', ramo: R,
  html() {
    const tab = tabelaCart(), it = itensCart(), tot = totalCart(), c = pessoa(cart.cliente), contas = db.contasObra.filter((x) => x.aberta && (!cart.cliente || x.cliente === cart.cliente)), tb = tabelas().find((x) => x.id === cart.tabela), esp = db.espera || [];
    return `<div class="cab balcao-cab"><div><h1>${t(caixaAtual())} · Balcão</h1><p class="so-pc">Bipe o código de barras ou digite o produto</p></div><div class="linha-bts"><select class="ent" style="width:auto" data-caixa aria-label="Caixa deste computador">${(db.config.caixas || ['Caixa 1', 'Caixa 2']).map((x) => `<option ${x === caixaAtual() ? 'selected' : ''}>${t(x)}</option>`).join('')}</select><button type="button" class="bt" data-acao="vendas-dia" aria-label="Vendas e devoluções">${ico('troca')}<span class="tx-bt">Vendas e devoluções</span></button><button type="button" class="bt" data-acao="cart-limpa" aria-label="Limpar o balcão" ${cart.itens.length ? '' : 'disabled'}>${ico('x')}<span class="tx-bt">Limpar</span></button></div></div>
    ${(() => { const sc = sessao(); return !sc ? `<div class="aviso-box">${ico('dinheiro')}<span>O ${t(caixaAtual())} ainda não foi aberto hoje.</span><button type="button" class="bt pq" data-acao="caixa-abrir">Abrir o caixa</button></div>` : sc.fechado ? `<div class="aviso-box">${ico('dinheiro')}<span>O ${t(caixaAtual())} foi fechado às ${sc.fechado.hora}.</span></div>` : `<p class="mudo peq caixa-linha">${t(caixaAtual())} aberto às ${sc.abertoAs} com ${R$(sc.abertura)} de troco${(db.config.caixas || ['Caixa 1', 'Caixa 2']).filter((x) => x !== caixaAtual()).map((x) => { const o = sessao(x); return ` · ${t(x)} ${o ? (o.fechado ? 'fechado' : `aberto às ${o.abertoAs}, vendendo ao mesmo tempo`) : 'fechado'}`; }).join('')} <button type="button" class="bt pq" style="min-height:30px" data-ir="caixa">Caixa do dia</button></p>`; })()}
    ${esp.length ? `<div class="espera"><b>Vendas em espera (${esp.length}):</b>${esp.map((e) => `<button type="button" class="chip" data-acao="espera-volta" data-id="${e.id}">${t(e.nome)} · ${R$(e.total)}</button>`).join('')}</div>` : ''}
    <div class="pdv"><div><div class="cartao"><div class="bipa"><input data-bipa placeholder="Bipe o código ou digite o nome" aria-label="Código de barras ou nome do produto" autocomplete="off" enterkeyhint="search">${'BarcodeDetector' in window ? `<button type="button" class="bt-ico" style="width:56px;height:56px" data-camera aria-label="Ler o código com a câmera">${ico('foto')}</button>` : ''}</div><div data-sugere></div>
      <p class="mudo peq so-pc" style="margin-top:6px">Leitor USB: bipou, entrou. Quantidade antes do código: <b>10*</b> e bipe.</p></div>
      <div class="cartao">${cart.itens.length ? `<ul class="lista carrinho">${cart.itens.map(linhaItem).join('')}</ul>` : vazio('Nenhum item. Bipe um produto ou procure pelo nome.')}</div></div>
    <div class="cartao" style="position:sticky;top:90px"><label class="campo"><span>Cliente (opcional)</span><select data-cli><option value="">Cliente do balcão</option>${db.pessoas.filter((p) => p.tipo !== 'fornecedor').sort((a, b) => a.nome.localeCompare(b.nome)).map((p) => `<option value="${p.id}" ${p.id === cart.cliente ? 'selected' : ''}>${t(p.nome)}</option>`).join('')}</select></label>
      <div class="linha-bts" style="margin:-4px 0 10px"><button type="button" class="bt pq" data-cli-novo>${ico('mais2')}Cliente novo</button></div>
      <label class="campo"><span>Tabela de preço</span><select data-tab>${tabelas().map((x) => `<option value="${x.id}" ${x.id === cart.tabela ? 'selected' : ''}>${t(x.nome)}${x.desc ? ` (−${n2(x.desc)}%)` : ''}</option>`).join('')}</select></label>
      ${c ? (() => { const co = db.contasObra.filter((x) => x.aberta && x.cliente === c.id); if (co.length) return `<div class="credito-box"><small>A prazo pela conta da obra</small>${co.map((x) => { const k = credito(c.id, x); return `${travaHtml(k)}<p class="peq">${t(x.obra)}: deve ${R$(Math.max(0, saldoConta(x)))} de ${R$(x.limite)}${x.autorizados?.length ? ` · retiram: ${t(x.autorizados.join(', '))}` : ''}</p>`; }).join('')}</div>`; if (c.limite) { const k = credito(c.id); return `<div class="credito-box"><small>Fiado</small>${travaHtml(k)}<p class="peq">Deve ${R$(Math.max(0, saldoFiado(c.id)))} de ${R$(c.limite)} de limite</p></div>`; } return `<div class="aviso-box">${ico('pessoas')}<span>${t(c.nome)} compra só à vista (sem fiado).</span><button type="button" class="bt pq" data-acao="fi-limite" data-id="${c.id}">Dar limite</button></div>`; })() : ''}
      <div class="linhas-tot"><div><span>Preço de tabela (${pl(cart.itens.length, 'item', 'itens')})</span><b>${R$(tab)}</b></div>${tab - it > 0.009 ? `<div><span>Desconto ${t(cart.tabela !== 'balcao' ? tb?.nome || '' : 'por quantidade')}</span><b class="verde">− ${R$(tab - it)}</b></div>` : ''}
        <div><label style="display:flex;align-items:center;gap:6px">Frete <input class="ent" style="width:110px;min-height:36px" inputmode="decimal" data-frete value="${cart.frete ? n2(cart.frete) : ''}" placeholder="0,00" aria-label="Valor do frete"></label><b>${cart.frete ? '+ ' + R$(cart.frete) : 'sem frete'}</b></div></div>
      <div class="total-grande"><span>Total a pagar</span><b data-total>${R$(tot)}</b></div>
      <div class="pdv-acoes"><button type="button" class="bt cheio bt-grande" data-acao="vender" ${cart.itens.length ? '' : 'disabled'}>${ico('dinheiro')}Receber</button>
        <div class="grade g2" style="gap:8px"><button type="button" class="bt" data-acao="espera-segurar" ${cart.itens.length ? '' : 'disabled'}>${ico('agenda')}Deixar em espera</button><button type="button" class="bt zap" data-acao="orc-zap" ${cart.itens.length ? '' : 'disabled'}>${ico('zap')}Orçamento</button></div>
        <button type="button" class="bt" data-acao="vender-conta" ${contas.length ? '' : 'hidden'} ${cart.itens.length && contas.length ? '' : 'disabled'}>${ico(c && contas.length && credito(c.id, contas[0]).trav ? 'cadeado' : 'conta')}${c && contas.length && credito(c.id, contas[0]).trav ? 'Conta da obra travada: pedir liberação' : 'Lançar na conta da obra'}</button>
        ${c?.limite ? `<button type="button" class="bt" data-acao="vender-fiado" ${cart.itens.length ? '' : 'disabled'}>${ico(credito(c.id).trav ? 'cadeado' : 'pessoas')}${credito(c.id).trav ? 'Fiado: pedir liberação ao dono' : 'Vender no fiado'}</button>` : ''}</div></div></div>
    ${cart.itens.length ? `<div class="pdv-rodape"><span><small>Total · ${pl(cart.itens.length, 'item', 'itens')}</small><b>${R$(tot)}</b></span><button type="button" class="bt cheio" data-acao="vender">${ico('dinheiro')}Receber</button></div>` : ''}`;
  },
  montar(el) {
    const i = $('[data-bipa]', el), box = $('[data-sugere]', el); setTimeout(() => { if (matchMedia('(min-width:1024px)').matches) i.focus(); }, 50);
    const lista = (q) => { q = q.replace(/^\d+([.,]\d+)?\*/, '').trim().toLowerCase(); if (q.length < 2) { box.innerHTML = ''; return; } const l = db.produtos.filter((p) => p.nome.toLowerCase().includes(q) || p.cod.includes(q)).slice(0, 7);
      box.innerHTML = l.length ? `<div class="sugere">${l.map((p) => `<button type="button" data-add="${p.id}"><span><b>${t(p.nome)}</b><small class="mudo" style="display:block">${t(p.cod)} · tem ${estoqueTxt(p)}</small></span><b>${R$(p.preco)}/${t(p.un)}</b></button>`).join('')}</div>` : '<p class="mudo" style="margin-top:8px">Nada encontrado.</p>'; };
    const mult = () => { const m = i.value.match(/^(\d+(?:[.,]\d+)?)\*/); return m ? num(m[1]) : 1; };
    i.oninput = () => lista(i.value);
    i.onkeydown = (e) => { if (e.key !== 'Enter') return; e.preventDefault(); const q = i.value.replace(/^\d+([.,]\d+)?\*/, ''); const p = acharCodigo(q) || (box.querySelectorAll('[data-add]').length === 1 ? prod(box.querySelector('[data-add]').dataset.add) : null);
      if (p) { adicionar(p, mult()); i.value = ''; ir('balcao'); setTimeout(() => $('[data-bipa]')?.focus(), 20); } else if (/^\d{8,}$/.test(q.trim())) toast('Código não cadastrado: cadastre em Estoque'); };
    box.onclick = (e) => { const b = e.target.closest('[data-add]'); if (!b) return; adicionar(prod(b.dataset.add), mult()); ir('balcao'); setTimeout(() => $('[data-bipa]')?.focus(), 20); };
    $$('[data-q]', el).forEach((q) => q.onchange = () => { const v = num(q.value), it = cart.itens[q.dataset.q]; if (v <= 0) cart.itens.splice(q.dataset.q, 1); else { it.qtd = fracionavel(it.un) ? v : Math.round(v); } reprecificar(); ir('balcao'); });
    $$('[data-cx]', el).forEach((b) => b.onclick = () => { const it = cart.itens[b.dataset.cx], p = prod(it.prod); it.qtd = Math.round(Math.ceil(it.qtd / p.porCaixa - 1e-9) * p.porCaixa * 100) / 100; reprecificar(); ir('balcao'); });
    $$('[data-tira]', el).forEach((b) => b.onclick = () => { cart.itens.splice(b.dataset.tira, 1); ir('balcao'); });
    $('[data-cli]', el).onchange = (e) => { cart.cliente = e.target.value; const p = pessoa(cart.cliente); cart.tabela = p?.tabela || 'balcao'; reprecificar(); ir('balcao'); };
    $('[data-tab]', el).onchange = (e) => { cart.tabela = e.target.value; reprecificar(); ir('balcao'); };
    $('[data-frete]', el).onchange = (e) => { cart.frete = Math.max(0, num(e.target.value)); ir('balcao'); };
    $('[data-caixa]', el).onchange = (e) => { try { localStorage.setItem('tecton-caixa', e.target.value); } catch { /* ok */ } ir('balcao'); };
    $('[data-cli-novo]', el).onclick = () => editarPessoa({ tipo: 'cliente' }, (p) => { cart.cliente = p.id; });
    $('[data-camera]', el)?.addEventListener('click', lerCamera);
  },
});
async function lerCamera() {
  let st; const { el, fechar } = folha({ titulo: 'Ler código com a câmera', corpo: '<video data-v playsinline muted style="width:100%;border-radius:10px;background:#000"></video><p class="mudo peq" style="margin-top:8px">Aponte para o código de barras do produto.</p>', pe: '<button type="button" class="bt" data-fechar>Fechar</button>' });
  try { st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); } catch { toast('Sem acesso à câmera'); fechar(); return; }
  const v = $('[data-v]', el); v.srcObject = st; await v.play().catch(() => {}); const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'upc_a'] });
  const para = () => st.getTracks().forEach((x) => x.stop());
  new MutationObserver((m, o) => { if (!el.isConnected) { para(); o.disconnect(); } }).observe(document.body, { childList: true });
  const loop = async () => { if (!el.isConnected) return; try { const r = await det.detect(v); if (r[0]) { const p = acharCodigo(r[0].rawValue); if (p) { adicionar(p); fechar(); ir('balcao'); toast(`${p.nome} adicionado`); return; } toast(`Código ${r[0].rawValue} não cadastrado`); } } catch { /* tenta de novo */ } setTimeout(loop, 350); };
  loop();
}
acao('cart-limpa', async () => { if (await confirma('Limpar o balcão?', 'Limpar')) { cart = novoCart(); ir('balcao'); } });
// venda em espera: o cliente foi buscar o dinheiro e o caixa atende o próximo
acao('espera-segurar', () => { const c = pessoa(cart.cliente); editar({ titulo: 'Segurar esta venda', lista: [{ k: 'nome', r: 'Nome para achar depois', req: true, ph: 'Ex.: Toninho, foi buscar o cartão' }], v: { nome: c?.nome || '' }, salvar: 'Segurar',
  aoSalvar: (d) => { (db.espera ||= []).push({ id: uid('es'), nome: d.nome, dia: hoje(), caixa: caixaAtual(), total: totalCart(), cart: JSON.parse(JSON.stringify(cart)) }); cart = novoCart(); grava(); toast('Venda em espera: atenda o próximo'); } }); });
acao('espera-volta', (b) => { if (cart.itens.length) { toast('Segure ou limpe a venda atual antes'); return; } const e = db.espera.find((x) => x.id === b.dataset.id); cart = e.cart; db.espera = db.espera.filter((x) => x !== e); reprecificar(); grava(); toast(`Venda de ${e.nome} de volta`); });
function baixarEstoque(itens, sinal = -1) { itens.forEach((i) => { const p = prod(i.prod); if (p) { p.estoque = Math.round((p.estoque + sinal * i.qtd) * 1000) / 1000; if (sinal < 0) p.ult = hoje(); } }); }
function fecharVenda(forma, extra = {}) {
  const v = { id: uid('v'), dia: hoje(), itens: cart.itens.map(({ prod: pr, nome, un, qtd, unit, desc }) => ({ prod: pr, nome, un, qtd, unit, desc })), frete: cart.frete || 0, total: totalCart(), forma, cliente: cart.cliente, tabela: cart.tabela, caixa: caixaAtual(), ...extra };
  db.vendas.push(v); baixarEstoque(v.itens); if (cart.orc) { const o = db.orcs.find((x) => x.id === cart.orc); if (o) o.status = 'aceito'; }
  cart = novoCart(); return v;
}
function agendarEntrega(v, cli, endereco, bairro, dia, cm, modo = 'entrega') { db.entregas.push({ id: uid('en'), modo, venda: v.id, dia, cliente: cli, endereco, bairro, caminhao: cm, ordem: db.entregas.filter((x) => x.dia === dia && x.caminhao === cm).length + 1, status: 'agendada', obs: '', itens: v.itens.map((i) => ({ prod: i.prod, nome: i.nome, un: i.un, qtd: i.qtd, ok: 0 })) }); }
acao('vender', () => {
  if (!sessao() || sessao().fechado) { if (sessao()?.fechado) { toast(`O ${caixaAtual()} já foi fechado hoje`); return; } abrirCaixa(() => ACOES.vender()); return; }
  const tot = totalCart(), c = pessoa(cart.cliente), nfE = escolhaNoReceber(cart.cliente, '');
  const { el, fechar } = folha({ titulo: `Receber ${R$(tot)}`, corpo: `<div class="chips" style="margin-bottom:14px">${['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito'].map((f, i) => `<button type="button" class="chip" data-forma="${f}" aria-pressed="${i === 1}">${f}</button>`).join('')}</div>
    <div data-din hidden><label class="campo"><span>Recebido em dinheiro</span><input data-recebido inputmode="decimal" placeholder="${n2(tot)}"></label><p class="forte" data-troco></p></div>
    <p class="mudo peq" data-pix>Pix: o cliente paga na sua chave e você confere no app do banco. Cartão: passe na sua maquininha.</p>
    ${nfE.html}
    <p class="forte" style="margin:4px 0 6px">O material</p><div class="chips" style="margin-bottom:10px" role="group" aria-label="Como o material sai">${[['leva', 'Leva agora'], ['entrega', 'Entregar na obra'], ['retira', 'Retira no depósito depois']].map(([k, n], i) => `<button type="button" class="chip" data-modo="${k}" aria-pressed="${i === 0}">${n}</button>`).join('')}</div>
    <div data-ret hidden><p class="mudo peq">O material fica separado no pátio (sai do estoque livre) e aparece em Entregas › Retirada no depósito até o cliente buscar. Quem retirar assina o canhoto.</p></div>
    <div data-ent hidden>${campos([{ k: 'endereco', r: 'Endereço', largo: true }, { k: 'bairro', r: 'Bairro' }, { k: 'dia', r: 'Dia da entrega', tipo: 'date' }, { k: 'caminhao', r: 'Caminhão', tipo: 'select', op: db.caminhoes.map((x) => [x.id, x.nome]) }], { endereco: c?.endereco || '', dia: somaDias(hoje(), 1) })}<p class="mudo peq">${cart.frete ? `Frete de ${R$(cart.frete)} já está no total.` : 'Sem frete no total: para cobrar, volte e ponha o valor no campo Frete.'}</p></div>`,
    pe: `<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt" data-ok="recibo">${ico('imprimir')}Receber e imprimir</button><button type="button" class="bt cheio" data-ok="1">${ico('check')}Recebido</button>` });
  let forma = 'Pix', modo = 'leva';
  nfE.montar?.(el);
  $$('[data-modo]', el).forEach((b) => b.onclick = () => { modo = b.dataset.modo; $$('[data-modo]', el).forEach((x) => x.setAttribute('aria-pressed', x === b)); $('[data-ent]', el).hidden = modo !== 'entrega'; $('[data-ret]', el).hidden = modo !== 'retira'; });
  $$('[data-forma]', el).forEach((b) => b.onclick = () => { forma = b.dataset.forma; $$('[data-forma]', el).forEach((x) => x.setAttribute('aria-pressed', x === b)); $('[data-din]', el).hidden = forma !== 'Dinheiro'; $('[data-pix]', el).hidden = forma === 'Dinheiro'; });
  $('[data-recebido]', el).oninput = (e) => { const r = num(e.target.value); $('[data-troco]', el).textContent = r >= tot ? `Troco: ${R$(r - tot)}` : r ? `Faltam ${R$(tot - r)}` : ''; };
  // o modo (leva, entrega ou retira) é escolhido nos chips acima
  el.addEventListener('click', (e) => {
    const ok = e.target.closest('[data-ok]'); if (!ok) return;
    if (forma === 'Dinheiro' && $('[data-recebido]', el).value && num($('[data-recebido]', el).value) < tot) { toast('O valor recebido é menor que o total'); return; }
    const ent = modo === 'entrega'; if (ent && !$('[name=endereco]', el).value.trim()) { toast('Ponha o endereço da entrega'); return; }
    const esc = nfE.ler(el), cli = cart.cliente, v = fecharVenda(forma);
    if (ent) agendarEntrega(v, cli, $('[name=endereco]', el).value.trim(), $('[name=bairro]', el).value.trim(), $('[name=dia]', el).value || hoje(), $('[name=caminhao]', el).value);
    if (modo === 'retira') agendarEntrega(v, cli, 'Retira no depósito', '', hoje(), '', 'retira');
    grava(); fechar(); toast(ent ? 'Venda feita e entrega agendada' : modo === 'retira' ? 'Venda feita: material separado para retirar' : 'Venda feita'); ir('balcao');
    aposReceber(v, esc, ok.dataset.ok === 'recibo').then((imp) => { if (ok.dataset.ok === 'recibo' && !imp) reciboVenda(v); });
  });
});
function reciboVenda(v) {
  imprimir('Recibo de venda', `<p><b>Cliente:</b> ${t(v.cliente ? nomeDe(v.cliente) : 'Cliente do balcão')} · <b>Data:</b> ${dataBR(v.dia)} · <b>Pagamento:</b> ${t(v.forma)}${v.caixa ? ` · ${t(v.caixa)}` : ''}</p><table><thead><tr><th>Produto</th><th class="n">Qtd.</th><th class="n">Unitário</th><th class="n">Total</th></tr></thead><tbody>${v.itens.map((i) => `<tr><td>${t(i.nome)}</td><td class="n">${n2(i.qtd, 3)} ${t(i.un)}</td><td class="n">${R$(i.unit)}</td><td class="n">${R$(i.qtd * i.unit)}</td></tr>`).join('')}${v.frete ? `<tr><td>Frete</td><td></td><td></td><td class="n">${R$(v.frete)}</td></tr>` : ''}</tbody></table><p class="tot">Total: ${R$(v.total)}</p>`, 'Recibo sem valor fiscal. A nota fiscal sai no emissor que a loja já usa.');
}
const atrasoCli = (pid) => Math.max(situacaoFiado(pid).atraso, ...db.contasObra.filter((c) => c.cliente === pid).map((c) => (saldoConta(c) > 0.009 ? situacaoConta(c).atraso : 0)), 0);
// liberação do dono sem travar a fila: o dono libera na hora; o caixa digita a senha de liberação ou pede no WhatsApp
function liberarDono(motivo) {
  return new Promise((ok) => {
    let res = false; const pin = String(db.config.pinDono || '');
    const { el, fechar } = folha({ titulo: 'Liberação do dono', corpo: `<div class="trava erro">${ico('cadeado')}<span><b>${t(motivo)}</b><small>venda a prazo travada</small></span></div>${gestor() ? '<p class="mudo peq">Você é o dono: pode liberar agora. Quem está no caixa libera com a senha de liberação (Configurações › Empresa) ou pede no WhatsApp.</p>' : `<label class="campo"><span>Senha de liberação do dono</span><input data-pin type="password" inputmode="numeric" autocomplete="off" maxlength="8"></label>${pin ? '' : '<p class="mudo peq">O dono ainda não definiu a senha (Configurações › Empresa). Peça no WhatsApp.</p>'}`}`,
      pe: `<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt zap" data-pedir>${ico('zap')}Pedir ao dono</button><button type="button" class="bt cheio" data-lib>${ico('aberto')}Liberar</button>` });
    $('[data-pedir]', el).onclick = () => { fechar(); whatsapp(db.config.foneDono || db.config.fone, `Liberação no ${caixaAtual()}: ${motivo}. Total ${R$(totalCart())}. Libera?`, 'dono'); };
    $('[data-lib]', el).onclick = () => { if (!gestor()) { const v = $('[data-pin]', el).value.trim(); if (!pin || v !== pin) { toast('Senha errada'); return; } } res = true; (db.liberacoes ||= []).unshift({ dia: hoje(), hora: new Date().toTimeString().slice(0, 5), caixa: caixaAtual(), motivo, por: gestor() ? 'dono' : 'senha do dono' }); db.liberacoes = db.liberacoes.slice(0, 50); fechar(); };
    new MutationObserver((m, o) => { if (!el.isConnected) { o.disconnect(); ok(res); } }).observe(document.body, { childList: true, subtree: true });
  });
}
async function liberaAtraso(pid) { const a = atrasoCli(pid); if (!a) return true; return liberarDono(`${nomeDe(pid)} está atrasado ${pl(a, 'dia', 'dias')}`); }
acao('vender-conta', () => {
  const contas = db.contasObra.filter((x) => x.aberta && (!cart.cliente || x.cliente === cart.cliente)), tot = totalCart();
  const { el, fechar } = folha({ titulo: 'Lançar na conta da obra', corpo: `<p class="mudo" style="margin-bottom:10px">O cliente leva agora e paga depois. Total: <b>${R$(tot)}</b></p><label class="campo"><span>Quem está retirando</span><input data-retira list="autorizados" placeholder="Nome de quem leva o material"><datalist id="autorizados">${[...new Set(contas.flatMap((c) => c.autorizados || []))].map((n) => `<option value="${t(n)}">`).join('')}</datalist></label>${contas.map((c, i) => { const s = saldoConta(c); return `<label class="cartao marca-op" style="margin:0 0 8px"><input type="radio" name="co" value="${c.id}" ${i ? '' : 'checked'}><span><b>${t(c.obra)}</b><small class="mudo" style="display:block">${t(nomeDe(c.cliente))} · deve ${R$(Math.max(0, s))} de ${R$(c.limite)}${s + tot > c.limite ? ' · <span class="vermelho">passa do limite</span>' : ''}</small></span></label>`; }).join('')}`,
    pe: `<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio" data-ok>${ico('check')}Lançar</button>` });
  $('[data-ok]', el).onclick = async () => { const c = db.contasObra.find((x) => x.id === $('[name=co]:checked', el).value), quem = $('[data-retira]', el).value.trim(); if (!quem) { toast('Quem está retirando?'); return; } if (c.autorizados?.length && !c.autorizados.some((n) => n.toLowerCase() === quem.toLowerCase())) { if (!(await liberarDono(`${quem} não está na lista de quem pode retirar na conta ${c.obra}`))) return; } if (!(await liberaAtraso(c.cliente))) return; if (saldoConta(c) + tot > c.limite) { if (!(await liberarDono(`A compra passa o limite de ${R$(c.limite)} da conta ${c.obra}`))) return; }
    cart.cliente = c.cliente; fecharVenda('Conta da obra', { conta: c.id, retirou: quem }); grava(); fechar(); toast(`Lançado na conta ${c.obra}`); ir('balcao'); };
});
acao('vender-fiado', async () => {
  const c = pessoa(cart.cliente), tot = totalCart(), s = saldoFiado(c.id);
  if (!(await liberaAtraso(c.id))) return;
  if (s + tot > c.limite) { if (!(await liberarDono(`${c.nome} passaria a dever ${R$(s + tot)}, acima do limite de ${R$(c.limite)}`))) return; }
  const v = fecharVenda('Fiado'); db.fiado.push({ id: uid('fi'), pessoa: c.id, dia: hoje(), valor: v.total, desc: v.itens.map((i) => i.nome).slice(0, 3).join(', '), venda: v.id }); grava(); toast(`No fiado de ${c.nome}, vence em ${PRAZO()} dias`); ir('balcao');
});
// vendas do dia, recibo de novo e devolução ou troca
acao('vendas-dia', () => {
  const pinta = (q = '') => db.vendas.slice(-60).reverse().filter((v) => !q || `${nomeDe(v.cliente)} ${v.itens.map((i) => i.nome).join(' ')}`.toLowerCase().includes(q)).slice(0, 30).map((v) => `<li><div class="tx"><b>${dataBR(v.dia)} · ${t(v.cliente ? nomeDe(v.cliente) : 'Cliente do balcão')}</b><small>${t(v.forma)}${v.caixa ? ' · ' + t(v.caixa) : ''} · ${t(v.itens.map((i) => `${n2(i.qtd, 3)} ${i.un} ${i.nome}`).join(', '))}</small>${etiquetaNota(v) ? `<small>${etiquetaNota(v)}</small>` : ''}</div><div class="val">${R$(v.total)}</div><button type="button" class="bt-ico" data-rec="${v.id}" aria-label="Recibo">${ico('imprimir')}</button>${botaoNota(v)}<button type="button" class="bt pq" data-dev="${v.id}">Devolver</button></li>`).join('');
  const { el } = folha({ titulo: 'Vendas e devoluções', larga: true, corpo: `<input class="ent" type="search" data-bv placeholder="Procurar por cliente ou produto" aria-label="Procurar venda"><ul class="lista" data-lv style="margin-top:8px">${pinta()}</ul>`, pe: `${['api', 'outro'].includes(modoNf()) ? `<button type="button" class="bt" data-acao="nf-exportar">${ico('doc')}Exportar vendas</button>` : ''}<button type="button" class="bt cheio" data-fechar>Fechar</button>` });
  $('[data-bv]', el).oninput = (e) => { $('[data-lv]', el).innerHTML = pinta(e.target.value.toLowerCase()); };
  const repinta = () => { if (!el.isConnected) { document.removeEventListener('tecton-nota', repinta); return; } $('[data-lv]', el).innerHTML = pinta($('[data-bv]', el).value.toLowerCase()); };
  document.addEventListener('tecton-nota', repinta);
  el.addEventListener('click', (e) => { const r = e.target.closest('[data-rec]'); if (r) reciboVenda(db.vendas.find((v) => v.id === r.dataset.rec)); const d = e.target.closest('[data-dev]'); if (d) devolver(db.vendas.find((v) => v.id === d.dataset.dev)); });
});
function devolver(v) {
  const { el, fechar } = folha({ titulo: 'Devolução ou troca', corpo: `${avisoDevolucao(v)}<p class="mudo" style="margin-bottom:10px">${dataBR(v.dia)} · ${t(v.cliente ? nomeDe(v.cliente) : 'Cliente do balcão')} · ${t(v.forma)}</p>${v.itens.map((i, k) => `<label class="campo"><span>${t(i.nome)} (levou ${n2(i.qtd, 3)} ${t(i.un)} a ${R$(i.unit)})</span><input inputmode="decimal" data-dv="${k}" value="0"></label>`).join('')}
    <label class="campo"><span>Como devolver o dinheiro</span><select data-como>${v.forma === 'Fiado' ? '<option value="fiado">Abater do fiado</option>' : v.forma === 'Conta da obra' ? '<option value="conta">Abater da conta da obra</option>' : '<option value="dinheiro">Dinheiro ou Pix de volta</option>'}${v.cliente && v.forma !== 'Fiado' ? '<option value="credito">Crédito para a próxima compra</option>' : ''}</select></label><p class="forte" data-dvt></p>`,
    pe: `<button type="button" class="bt" data-fechar>Cancelar</button><button type="button" class="bt cheio" data-ok>${ico('check')}Registrar devolução</button>` });
  const calc = () => { const l = v.itens.map((i, k) => ({ ...i, qtd: Math.min(i.qtd, Math.max(0, num($(`[data-dv="${k}"]`, el).value))) })).filter((i) => i.qtd > 0); const tot = Math.round(soma(l, (i) => i.qtd * i.unit) * 100) / 100; $('[data-dvt]', el).textContent = tot ? `Valor da devolução: ${R$(tot)}` : ''; return { l, tot }; };
  el.addEventListener('input', calc);
  $('[data-ok]', el).onclick = () => { const { l, tot } = calc(); if (!tot) { toast('Diga quanto voltou de cada item'); return; } const como = $('[data-como]', el).value;
    baixarEstoque(l, +1); (db.devolucoes ||= []).push({ id: uid('dv'), dia: hoje(), venda: v.id, itens: l, valor: tot, como });
    if (como === 'fiado' || como === 'credito') db.fiado.push({ id: uid('fi'), pessoa: v.cliente, dia: hoje(), valor: -tot, desc: `Devolução: ${l.map((i) => i.nome).join(', ')}` });
    else if (como === 'conta') db.contasObra.find((c) => c.id === v.conta)?.pagamentos.push({ dia: hoje(), valor: tot, forma: 'Devolução de material' });
    else db.fin.push({ id: uid('f'), tipo: 'pagar', desc: `Devolução ao cliente · ${l.map((i) => i.nome).join(', ')}`, valor: tot, venc: hoje(), pago: hoje(), forma: 'Dinheiro', pessoa: v.cliente || '', cat: 'Devolução' });
    grava(); fechar(); $('.folha-fundo')?._fechar(); toast(`Devolução de ${R$(tot)} registrada; o estoque voltou`); };
}
// orçamento rápido: salva e manda no WhatsApp
acao('orc-zap', () => {
  const c = pessoa(cart.cliente);
  const { el, fechar } = folha({ titulo: 'Orçamento no WhatsApp', corpo: campos([{ k: 'nome', r: 'Para quem', req: true }, { k: 'fone', r: 'WhatsApp', tipo: 'tel' }, { k: 'validade', r: 'Vale até', tipo: 'date' }], { nome: c?.nome || '', fone: c?.fone || '', validade: somaDias(hoje(), 7) }),
    pe: `<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt" data-ok="pdf">${ico('imprimir')}Salvar e imprimir</button><button type="button" class="bt cheio" data-ok="zap">${ico('zap')}Salvar e mandar</button>` });
  el.addEventListener('click', (e) => { const ok = e.target.closest('[data-ok]'); if (!ok) return; const nome = $('[name=nome]', el).value.trim(); if (!nome) { toast('Para quem é o orçamento?'); return; }
    const o = { id: uid('oc'), dia: hoje(), cliente: cart.cliente, nome, fone: $('[name=fone]', el).value.trim(), itens: cart.itens.map(({ prod: pr, nome: n, un, qtd, unit, desc }) => ({ prod: pr, nome: n, un, qtd, unit, desc })), frete: cart.frete || 0, total: totalCart(), validade: $('[name=validade]', el).value || somaDias(hoje(), 7), status: 'enviado' };
    db.orcs.unshift(o); cart = novoCart(); grava(); fechar(); ok.dataset.ok === 'zap' ? zapOrc(o) : imprimirOrc(o); ir('balcao'); });
});
const textoOrc = (o) => `Orçamento ${db.config.nome}\nPara: ${o.nome}\n\n${o.itens.map((i) => `• ${n2(i.qtd, 3)} ${i.un} ${i.nome}: ${R$(i.qtd * i.unit)}`).join('\n')}${o.frete ? `\n• Frete: ${R$(o.frete)}` : ''}\n\nTotal: ${R$(o.total)}\nVale até ${dataBR(o.validade)}. Entregamos na obra.`;
function zapOrc(o) { whatsapp(o.fone, textoOrc(o), o.nome); }
function imprimirOrc(o) { imprimir(`Orçamento para ${o.nome}`, `<p><b>Data:</b> ${dataBR(o.dia)} · <b>Validade:</b> ${dataBR(o.validade)}</p><table><thead><tr><th>Produto</th><th class="n">Qtd.</th><th class="n">Unitário</th><th class="n">Total</th></tr></thead><tbody>${o.itens.map((i) => `<tr><td>${t(i.nome)}</td><td class="n">${n2(i.qtd, 3)} ${t(i.un)}</td><td class="n">${R$(i.unit)}</td><td class="n">${R$(i.qtd * i.unit)}</td></tr>`).join('')}${o.frete ? `<tr><td>Frete</td><td></td><td></td><td class="n">${R$(o.frete)}</td></tr>` : ''}</tbody></table><p class="tot">Total: ${R$(o.total)}</p>`, 'Orçamento sem valor fiscal. Preços sujeitos à disponibilidade do estoque.'); }
tela('orcs', {
  titulo: 'Orçamentos', ramo: R,
  html() {
    const grupos = [['enviado', 'Esperando resposta'], ['aceito', 'Viraram venda'], ['perdido', 'Não fecharam']];
    return cab('Orçamentos', 'Monte no Balcão e mande no WhatsApp em segundos', `<button type="button" class="bt cheio" data-ir="balcao">${ico('mais2')}Novo orçamento</button>`) + grupos.map(([k, n]) => { const l = db.orcs.filter((o) => o.status === k); return `<div class="cartao"><h2>${n} (${l.length})</h2>${l.length ? `<ul class="lista">${l.map((o) => `<li><div class="tx"><b>${t(o.nome)}</b><small>${dataBR(o.dia)} · ${t(o.itens.map((i) => i.nome).join(', '))}</small>${k === 'enviado' ? `<small>${o.validade < hoje() ? '<span class="vermelho">vencido</span>' : 'vale até ' + dataBR(o.validade)}</small>` : ''}</div><div class="val">${R$(o.total)}</div>
      <button type="button" class="bt-ico" data-acao="orc-imp" data-id="${o.id}" aria-label="Imprimir o orçamento de ${t(o.nome)}">${ico('imprimir')}</button><button type="button" class="bt-ico" data-acao="orc-rezap" data-id="${o.id}" aria-label="Mandar de novo no WhatsApp">${ico('zap')}</button>${k === 'enviado' ? `<button type="button" class="bt pq" data-acao="orc-perdeu" data-id="${o.id}">Não fechou</button><button type="button" class="bt pq cheio" data-acao="orc-venda" data-id="${o.id}">Virar venda</button>` : ''}</li>`).join('')}</ul>` : vazio('Nenhum.')}</div>`; }).join('');
  },
});
const orcDe = (b) => db.orcs.find((o) => o.id === b.dataset.id);
acao('orc-imp', (b) => imprimirOrc(orcDe(b))); acao('orc-rezap', (b) => zapOrc(orcDe(b)));
acao('orc-perdeu', (b) => { orcDe(b).status = 'perdido'; grava(); });
acao('orc-venda', (b) => { const o = orcDe(b); cart = { itens: o.itens.map((i) => ({ ...i })), cliente: o.cliente || '', tabela: pessoa(o.cliente)?.tabela || 'balcao', orc: o.id }; reprecificar(); ir('balcao'); toast('Itens do orçamento no Balcão'); });

// ------------------------------------------------------------------ estoque
let buscaE = '';
const situacaoProd = (p) => baixo(p) ? '<span class="et erro">abaixo do mínimo</span>' : !p.ult && p.estoque > 0 ? '<span class="et">nunca vendeu</span>' : parado(p) ? `<span class="et atn">sem venda há ${dias(p.ult, hoje())} dias</span>` : '<span class="et ok">girando</span>';
const filtraEstoque = (f) => { const q = buscaE.toLowerCase(); return db.produtos.filter((p) => f === 'baixo' ? baixo(p) : f === 'parado' ? parado(p) : true).filter((p) => !q || `${p.nome} ${p.cod}`.toLowerCase().includes(q)); };
tela('estoque', {
  titulo: 'Estoque', ramo: R,
  html(f = 'todos') {
    const l = filtraEstoque(f);
    return cab('Estoque', `${pl(db.produtos.length, 'produto', 'produtos')} · ${R$(soma(db.produtos, (p) => Math.max(0, p.estoque) * p.custo))} em mercadoria (pelo custo)`, `<button type="button" class="bt" data-acao="tabelas">${ico('porcento')}Tabelas de preço</button><button type="button" class="bt" data-acao="reajuste" data-f="${f}">${ico('grafico')}Reajustar preços</button><button type="button" class="bt cheio" data-acao="prod-ed">${ico('mais2')}Produto</button>`) +
      `<div class="cartao"><div class="cartao-cab"><div class="chips">${[['todos', 'Todos'], ['baixo', `Abaixo do mínimo (${db.produtos.filter(baixo).length})`], ['parado', `Sem venda há ${PARADO}+ dias (${db.produtos.filter(parado).length})`]].map(([k, n]) => `<button type="button" class="chip" data-ir="estoque/${k}" aria-pressed="${f === k}">${n}</button>`).join('')}</div><input class="ent" style="max-width:320px" type="search" data-busca-e placeholder="Procurar por nome ou código" value="${t(buscaE)}" aria-label="Procurar produto"></div>
      <div class="tab-wrap"><table class="tab empilha"><thead><tr><th>Produto</th><th class="n">Preço e custo</th><th class="n">Estoque</th><th class="n">Margem</th><th>Situação</th><th></th></tr></thead><tbody>${l.map((p) => `<tr><td data-r="Produto"><b>${t(p.nome)}</b><small class="mudo" style="display:block">${p.faixas?.length ? t(p.faixas.map((x) => `${n2(x.min)}+ ${p.un}: −${n2(x.desc)}%`).join(' · ')) : 'sem desconto por quantidade'}${p.lote ? ` · lote ${t(p.lote)}` : ''}</small></td><td class="n" data-r="Preço e custo">${R$(p.preco)}/${t(p.un)}<small class="mudo" style="display:block">custo ${R$(p.custo)}</small></td><td class="n" data-r="Estoque" style="white-space:normal;max-width:200px">${estoqueTxt(p)}</td><td class="n" data-r="Margem">${p.preco ? pc((p.preco - p.custo) / p.preco * 100) : '—'}</td><td data-r="Situação">${situacaoProd(p)}</td>
        <td class="n"><button type="button" class="bt pq" data-acao="prod-ajuste" data-id="${p.id}">Ajustar</button> <button type="button" class="bt-ico" data-acao="prod-ed" data-id="${p.id}" aria-label="Editar ${t(p.nome)}">${ico('lapis')}</button></td></tr>`).join('')}</tbody></table></div>${l.length ? '' : vazio('Nenhum produto aqui.')}</div>`;
  },
  montar(el, f) { const i = $('[data-busca-e]', el); i.oninput = () => { buscaE = i.value; const pos = i.selectionStart; ir(`estoque/${f || 'todos'}`); const n = $('[data-busca-e]'); n.focus(); n.setSelectionRange(pos, pos); }; },
});
acao('reajuste', (b) => { const l = filtraEstoque(b.dataset.f || 'todos');
  editar({ titulo: 'Reajustar preços', lista: [{ k: 'pct', r: 'Reajuste (%)', tipo: 'num', req: true, dica: `Vale para os ${l.length} produtos da lista que está na tela (use a busca para escolher, ex.: “cimento”). Negativo para baixar.` }], salvar: 'Reajustar',
    aoSalvar: (d) => { if (!d.pct) { toast('Digite o reajuste'); return false; } l.forEach((p) => { p.preco = Math.round(p.preco * (1 + d.pct / 100) * 100) / 100; }); grava(); toast(`${pl(l.length, 'preço reajustado', 'preços reajustados')} em ${n2(d.pct)}%`); } }); });
acao('prod-ed', (b) => {
  const p = b.dataset.id ? prod(b.dataset.id) : null;
  editar({ titulo: p ? 'Editar produto' : 'Novo produto', larga: true, lista: [{ k: 'nome', r: 'Nome', req: true, largo: true }, { k: 'cod', r: 'Código de barras', dica: 'Bipe o produto aqui' }, { k: 'un', r: 'Vende em', tipo: 'select', op: Object.entries(UN) },
    { k: 'preco', r: 'Preço de venda (R$)', tipo: 'money', req: true }, { k: 'custo', r: 'Custo (R$)', tipo: 'money' }, { k: 'estoque', r: 'Estoque (na unidade de venda)', tipo: 'num' }, { k: 'minimo', r: 'Estoque mínimo', tipo: 'num' },
    { k: 'compra', r: 'Fracionado: compra em', ph: 'rolo, caixa, milheiro (vazio = mesma unidade)' }, { k: 'fator', r: 'Quanto vem em cada um', tipo: 'num', dica: 'Ex.: rolo de 100 m = 100' },
    { k: 'porCaixa', r: 'Piso e revestimento: m² por caixa', tipo: 'num', dica: 'O balcão mostra quantas caixas fecham a metragem' }, { k: 'lote', r: 'Lote e tonalidade atual', ph: 'Ex.: L2309 · tom B' },
    { k: 'faixasTxt', r: 'Desconto por quantidade', largo: true, ph: '50=3, 100=5', dica: 'A partir de 50, 3% de desconto; a partir de 100, 5%' }],
    v: p ? { ...p, faixasTxt: (p.faixas || []).map((f) => `${n2(f.min)}=${n2(f.desc)}`).join(', ') } : { un: 'pç', fator: 1, estoque: 0, minimo: 0 },
    aoSalvar: (d) => { const cod = String(d.cod || '').replace(/\D/g, ''); if (cod && db.produtos.some((x) => x.cod === cod && x !== p)) { toast('Este código já é de outro produto'); return false; }
      d.cod = cod; d.fator = Math.max(1, d.fator || 1); d.faixas = String(d.faixasTxt || '').split(/[;,]\s*(?=\d)/).map((s) => s.split('=')).filter((x) => x.length === 2).map(([a, c]) => ({ min: num(a), desc: num(c) })).filter((x) => x.min > 0 && x.desc > 0); delete d.faixasTxt;
      if (p) Object.assign(p, d); else db.produtos.push({ id: uid('pr'), ult: '', ...d }); grava(); toast('Produto salvo'); },
    aoApagar: p ? () => { db.produtos = db.produtos.filter((x) => x !== p); grava(); } : null });
});
acao('prod-ajuste', (b) => { const p = prod(b.dataset.id);
  editar({ titulo: `Ajustar: ${p.nome}`, lista: [{ k: 'tipo', r: 'O que aconteceu', tipo: 'select', op: [['entrada', 'Entrou mercadoria'], ['perda', 'Perda ou quebra'], ['contagem', 'Contei e o certo é']] }, { k: 'qtd', r: `Quantidade (${p.un})`, tipo: 'num', req: true }], v: { tipo: 'contagem', qtd: p.estoque },
    aoSalvar: (d) => { p.estoque = Math.round((d.tipo === 'entrada' ? p.estoque + d.qtd : d.tipo === 'perda' ? p.estoque - d.qtd : d.qtd) * 1000) / 1000; grava(); toast(`Estoque: ${estoqueTxt(p)}`); } }); });
acao('tabelas', () => {
  const { el, fechar } = folha({ titulo: 'Tabelas de preço', corpo: `<p class="mudo" style="margin-bottom:10px">Desconto sobre o preço de venda para cada tipo de cliente. O cliente cadastrado com a tabela já entra com o preço dela no Balcão.</p><div data-tbs>${tabelas().map((x) => `<div class="campos" data-tb><label class="campo"><span>Nome</span><input name="nome" value="${t(x.nome)}" ${x.id === 'balcao' ? 'readonly' : ''}></label><label class="campo"><span>Desconto (%)</span><input name="desc" inputmode="decimal" value="${n2(x.desc)}" ${x.id === 'balcao' ? 'readonly' : ''}></label><input type="hidden" name="id" value="${t(x.id)}"></div>`).join('')}</div><button type="button" class="bt pq" data-mais-tb>${ico('mais2')}Mais uma tabela</button>`,
    pe: `<button type="button" class="bt" data-fechar>Cancelar</button><button type="button" class="bt cheio" data-ok>${ico('check')}Salvar</button>` });
  $('[data-mais-tb]', el).onclick = () => $('[data-tbs]', el).insertAdjacentHTML('beforeend', `<div class="campos" data-tb><label class="campo"><span>Nome</span><input name="nome" placeholder="Ex.: Atacado"></label><label class="campo"><span>Desconto (%)</span><input name="desc" inputmode="decimal" value="0"></label><input type="hidden" name="id" value="${uid('tb')}"></div>`);
  $('[data-ok]', el).onclick = () => { db.config.tabelas = $$('[data-tb]', el).map((r) => ({ id: $('[name=id]', r).value, nome: $('[name=nome]', r).value.trim(), desc: Math.max(0, Math.min(90, num($('[name=desc]', r).value))) })).filter((x) => x.nome); grava(); fechar(); toast('Tabelas salvas'); };
});

// ------------------------------------------------------------------ entregas
let diaEnt = '';
const itensEnt = (e) => e.itens || db.vendas.find((x) => x.id === e.venda)?.itens.map((i) => ({ nome: i.nome, un: i.un, qtd: i.qtd, ok: 0 })) || [];
tela('entregas', {
  titulo: 'Entregas', ramo: R,
  html() {
    const d = diaEnt || hoje(), l = db.entregas.filter((e) => e.dia === d && !retira(e)), nEnt = l.filter((e) => e.status === 'entregue').length, nPar = l.filter((e) => e.status === 'parcial').length, nSaiu = l.filter((e) => e.status === 'saiu').length;
    const ret = db.entregas.filter((e) => retira(e) && (e.status === 'agendada' || e.dia === d)).sort((a, b) => a.dia.localeCompare(b.dia)), oc = l.filter((e) => e.ocorr).length, ass = l.filter((e) => e.recebeu).length, feitas = nEnt + nPar;
    const sinais = (e) => `<div class="ent-sinais">${['entregue', 'parcial'].includes(e.status) ? `<span class="et ${e.recebeu ? 'ok' : 'erro'}">${ico('contrato')}${e.recebeu ? `${retira(e) ? 'retirou' : 'canhoto'}: ${t(e.recebeu)}` : 'canhoto sem assinatura'}</span>${e.conferiu ? `<span class="et ok">${ico('check')}conferido por ${t(e.conferiu)}</span>` : ''}` : `<span class="et">${ico('contrato')}canhoto a assinar</span>`}${e.ocorr ? `<span class="et erro">${ico('sino')}${t(e.ocorr)}${e.perda ? ' · lançado como perda' : ''}</span>` : ''}${e.complemento ? '<span class="et info">complemento de entrega anterior</span>' : ''}</div>`;
    const itensHtml = (e) => `<ul class="ent-itens">${itensEnt(e).map((x) => `<li>${['entregue', 'parcial'].includes(e.status) ? `<span class="forte">${n2(x.ok, 3)}</span> de ${n2(x.qtd, 3)}` : n2(x.qtd, 3)} ${t(x.un)} ${t(x.nome)}${x.ok < x.qtd && e.status === 'parcial' ? ` <span class="vermelho forte">(${e.perda ? 'não entregues' : 'faltaram'} ${n2(x.qtd - x.ok, 3)}${e.perda ? ', lançadas como perda' : ''})</span>` : ''}</li>`).join('')}</ul>`;
    return cab('Entregas', 'Caminhões do dia e retirada no depósito', `<button type="button" class="bt" data-acao="cam-ed">${ico('caminhao')}Caminhões</button><button type="button" class="bt cheio" data-acao="ent-nova">${ico('mais2')}Entrega</button>`) +
      `<div class="cartao ent-dia"><button type="button" class="bt-ico" data-dia="-1" aria-label="Dia anterior">${ico('voltar')}</button><b>${dataBR(d)} · ${quando(d)}</b><button type="button" class="bt-ico" data-dia="1" aria-label="Próximo dia">${ico('frente')}</button>${d !== hoje() ? '<button type="button" class="bt pq" data-dia="0">Hoje</button>' : ''}<span class="ent-resumo"><span class="et info">${l.length - feitas - nSaiu} a sair</span><span class="et atn">${nSaiu} na rua</span><span class="et ok">${pl(nEnt, 'entregue', 'entregues')}</span>${nPar ? `<span class="et erro">${nPar} em parte</span>` : ''}${oc ? `<span class="et erro">${pl(oc, 'ocorrência', 'ocorrências')}</span>` : ''}<span class="et">${ass} de ${feitas} canhotos assinados</span></span></div>
      <div class="grade g2 ent-cams">${db.caminhoes.map((c) => { const r = l.filter((e) => e.caminhao === c.id).sort((a, b) => a.ordem - b.ordem); return `<div class="cartao"><div class="cartao-cab"><h2>${t(c.nome)}</h2><span class="mudo">${t(c.placa)} · ${t(c.motorista || '')}</span></div>
        ${r.length ? `<ul class="lista">${r.map((e, i) => `<li class="ent-lin"><b class="ent-n">${i + 1}</b><div class="tx"><b>${t(nomeDe(e.cliente))} <span class="et ${ST_ENT[e.status][1]}">${ST_ENT[e.status][0]}</span></b><small>${t(e.endereco)} · ${t(e.bairro)}</small>${itensHtml(e)}${sinais(e)}${e.obs ? `<small>${t(e.obs)}</small>` : ''}</div>
          <span class="ent-bts"><button type="button" class="bt-ico" data-acao="ent-mover" data-id="${e.id}" data-d="-1" aria-label="Subir na ordem" title="Subir na ordem" ${i ? '' : 'disabled'}>${ico('acima')}</button><button type="button" class="bt-ico" data-acao="ent-mover" data-id="${e.id}" data-d="1" aria-label="Descer na ordem" title="Descer na ordem" ${i < r.length - 1 ? '' : 'disabled'}>${ico('abaixo')}</button><button type="button" class="bt-ico" data-acao="ent-canhoto" data-id="${e.id}" aria-label="Imprimir o canhoto" title="Imprimir o canhoto">${ico('imprimir')}</button><button type="button" class="bt-ico" data-acao="ent-nova" data-id="${e.id}" aria-label="Editar entrega" title="Editar entrega">${ico('lapis')}</button>
          ${e.status === 'agendada' ? `<button type="button" class="bt pq" data-acao="ent-st" data-st="saiu" data-id="${e.id}">Marcar saída</button>` : e.status === 'saiu' ? `<span class="et atn" style="align-self:center">na rua desde ${e.saiuAs || '07:40'}</span>` : ''}${e.status === 'agendada' || e.status === 'saiu' ? `<button type="button" class="bt pq cheio" data-acao="ent-ok" data-id="${e.id}">Dar baixa e canhoto</button>` : e.status === 'parcial' ? `<button type="button" class="bt pq cheio" data-acao="ent-resto" data-id="${e.id}">Agendar o que faltou</button>` : ''}</span></li>`).join('')}</ul>
        <div class="linha-bts"><button type="button" class="bt" data-acao="ent-roteiro" data-cam="${c.id}">${ico('imprimir')}Roteiro com canhotos</button><a class="bt" target="_blank" rel="noopener" href="${rotaMapa(r)}">${ico('mapa')}Abrir no mapa</a></div>` : vazio('Nenhuma entrega neste caminhão.')}</div>`; }).join('')}</div>
      <div class="cartao" style="margin-top:16px"><div class="cartao-cab"><h2>Retirada no depósito</h2><span class="mudo">${pl(ret.filter((e) => e.status === 'agendada').length, 'esperando o cliente', 'esperando o cliente')}</span></div><p class="mudo peq" style="margin-bottom:8px">Pago e separado no pátio: o cliente vem buscar com o próprio carro. Não entra no roteiro dos caminhões.</p>
        ${ret.length ? `<ul class="lista ret">${ret.map((e) => `<li class="ent-lin"><span class="ponto ${e.status === 'entregue' ? 'ok' : ''}"></span><div class="tx"><b>${t(nomeDe(e.cliente))} <span class="et ${ST_RET[e.status][1]}">${ST_RET[e.status][0]}</span></b><small>vendido ${dataBR(e.dia)}${e.status === 'agendada' && e.dia < hoje() ? ` · <b class="vermelho">separado há ${pl(dias(e.dia, hoje()), 'dia', 'dias')}</b>` : ''}</small>${itensHtml(e)}${['entregue', 'parcial'].includes(e.status) ? sinais(e) : ''}</div><span class="ent-bts"><button type="button" class="bt-ico" data-acao="ent-canhoto" data-id="${e.id}" aria-label="Imprimir o canhoto" title="Imprimir o canhoto">${ico('imprimir')}</button>${e.status === 'agendada' ? `<button type="button" class="bt pq cheio" data-acao="ent-ok" data-id="${e.id}">Registrar retirada</button>` : ''}</span></li>`).join('')}</ul>` : vazio('Nada esperando retirada.')}</div>
      ${l.some((e) => !db.caminhoes.find((c) => c.id === e.caminhao)) ? '<p class="vermelho">Há entregas sem caminhão: edite e escolha um.</p>' : ''}${frotaHtml()}`;
  },
  montar(el) { $$('[data-dia]', el).forEach((b) => b.onclick = () => { const n = Number(b.dataset.dia); diaEnt = n ? somaDias(diaEnt || hoje(), n) : hoje(); ir('entregas'); }); },
});
// ------------------------------------------------------------------ frota simples: quilometragem, combustível, manutenção e documentos de cada caminhão
const mesFrota = () => hoje().slice(0, 7);
const gastosCam = (c, mes = mesFrota()) => (c.gastos || []).filter((g) => g.dia.slice(0, 7) === mes);
function avisosCam(c) {
  const a = [];
  if (c.revKm && c.km && c.km >= c.revKm - 500) a.push(c.km >= c.revKm ? `revisão passou (${n2(c.km - c.revKm, 0)} km)` : `revisão em ${n2(c.revKm - c.km, 0)} km`);
  if (c.docVence && c.docVence <= somaDias(hoje(), 30)) a.push(c.docVence < hoje() ? `licenciamento venceu em ${dataBR(c.docVence)}` : `licenciamento vence ${quando(c.docVence)}`);
  if (c.seguroVence && c.seguroVence <= somaDias(hoje(), 30)) a.push(c.seguroVence < hoje() ? `seguro venceu em ${dataBR(c.seguroVence)}` : `seguro vence ${quando(c.seguroVence)}`);
  return a;
}
function frotaHtml() {
  if (!db.caminhoes.length) return '';
  return `<div class="cartao frota" style="margin-top:16px"><div class="cartao-cab"><h2>Frota dos caminhões</h2><span class="mudo">gasto em ${mesAno(hoje())}: ${R$(soma(db.caminhoes, (c) => soma(gastosCam(c), (g) => g.valor)))}</span></div>
    <div class="grade g2">${db.caminhoes.map((c) => { const g = gastosCam(c), comb = g.filter((x) => x.tipo === 'combustivel'), av = avisosCam(c), ab = (c.gastos || []).filter((x) => x.tipo === 'combustivel' && x.km).sort((a, b) => a.km - b.km), media = ab.length > 1 ? (ab[ab.length - 1].km - ab[0].km) / soma(ab.slice(1), (x) => x.litros || 0) : 0;
      return `<div class="frota-cam"><div class="tx"><b>${t(c.nome)}</b><small>${t(c.placa)} · ${t(c.motorista || 'sem motorista')}${c.km ? ` · ${n2(c.km, 0)} km` : ''}</small>${av.map((x) => `<small class="vermelho forte">${t(x)}</small>`).join('')}</div>
        <div class="linhas-tot"><div><span>Combustível no mês</span><b>${R$(soma(comb, (x) => x.valor))}</b></div><div><span>Manutenção no mês</span><b>${R$(soma(g.filter((x) => x.tipo === 'manutencao'), (x) => x.valor))}</b></div>${media ? `<div><span>Média</span><b>${n2(media, 1)} km/l</b></div>` : ''}</div>
        <div class="linha-bts"><button type="button" class="bt pq cheio" data-acao="frota-gasto" data-cam="${c.id}" data-tipo="combustivel">Abasteceu</button><button type="button" class="bt pq" data-acao="frota-gasto" data-cam="${c.id}" data-tipo="manutencao">Manutenção</button><button type="button" class="bt pq" data-acao="frota-ed" data-cam="${c.id}">Km e documentos</button></div>
        ${(c.gastos || []).length ? `<details class="ajuda"><summary>Últimos gastos</summary><ul class="lista">${c.gastos.slice(0, 6).map((x) => `<li><div class="tx"><b>${t(x.desc)}</b><small>${dataBR(x.dia)}${x.km ? ` · ${n2(x.km, 0)} km` : ''}${x.litros ? ` · ${n2(x.litros, 1)} L` : ''}</small></div><div class="val">${R$(x.valor)}</div></li>`).join('')}</ul></details>` : ''}</div>`; }).join('')}</div>
    <p class="mudo peq" style="margin-top:8px">Cada abastecimento e manutenção entra no Financeiro como conta já paga, na categoria Frota.</p></div>`;
}
acao('frota-gasto', (b) => { const c = db.caminhoes.find((x) => x.id === b.dataset.cam), comb = b.dataset.tipo === 'combustivel';
  editar({ titulo: `${comb ? 'Abastecimento' : 'Manutenção'}: ${c.nome}`, lista: [{ k: 'dia', r: 'Dia', tipo: 'date', req: true }, ...(comb ? [{ k: 'litros', r: 'Litros', tipo: 'num', req: true }] : [{ k: 'desc', r: 'O que foi feito', req: true, ph: 'Troca de óleo, pneu, freio…', largo: true }]), { k: 'valor', r: 'Valor pago (R$)', tipo: 'money', req: true }, { k: 'km', r: 'Km no painel', tipo: 'num' }],
    v: { dia: hoje(), km: c.km || '' }, salvar: 'Lançar',
    aoSalvar: (d) => { if (d.valor <= 0) { toast('Ponha o valor pago'); return false; } const desc = comb ? `Diesel · ${n2(d.litros, 1)} L` : d.desc;
      (c.gastos ||= []).unshift({ id: uid('fg'), dia: d.dia, tipo: b.dataset.tipo, desc, valor: d.valor, litros: d.litros || 0, km: d.km || 0 }); if (d.km > (c.km || 0)) c.km = d.km;
      db.fin.push({ id: uid('f'), tipo: 'pagar', desc: `${desc} · ${c.nome} (${c.placa})`, valor: d.valor, venc: d.dia, pago: d.dia, forma: '', pessoa: '', cat: comb ? 'Frota · combustível' : 'Frota · manutenção' });
      grava(); toast(comb ? 'Abastecimento lançado' : 'Manutenção lançada'); } }); });
acao('frota-ed', (b) => { const c = db.caminhoes.find((x) => x.id === b.dataset.cam);
  editar({ titulo: `Km e documentos: ${c.nome}`, lista: [{ k: 'km', r: 'Km atual', tipo: 'num' }, { k: 'revKm', r: 'Próxima revisão (km)', tipo: 'num' }, { k: 'docVence', r: 'Licenciamento vence em', tipo: 'date' }, { k: 'seguroVence', r: 'Seguro vence em', tipo: 'date' }], v: c,
    aoSalvar: (d) => { Object.assign(c, d); grava(); toast('Caminhão salvo'); } }); });
const rotaMapa = (r) => `https://www.google.com/maps/dir/${[db.config.endereco ? `${db.config.endereco}, ${db.config.cidade}` : db.config.cidade, ...r.filter((e) => e.status !== 'entregue').map((e) => `${e.endereco}, ${e.bairro}, ${db.config.cidade} ${db.config.uf || ''}`)].map(encodeURIComponent).join('/')}`;
acao('ent-mover', (b) => { const e = db.entregas.find((x) => x.id === b.dataset.id), r = db.entregas.filter((x) => x.dia === e.dia && x.caminhao === e.caminhao).sort((a, c) => a.ordem - c.ordem); const i = r.indexOf(e), j = i + Number(b.dataset.d); if (j < 0 || j >= r.length) return; [r[i], r[j]] = [r[j], r[i]]; r.forEach((x, k) => { x.ordem = k + 1; }); grava(); });
acao('ent-st', (b) => { const e = db.entregas.find((x) => x.id === b.dataset.id), hr = new Date().toTimeString().slice(0, 5); db.entregas.filter((x) => x.dia === e.dia && x.caminhao === e.caminhao && x.status === 'agendada').forEach((x) => { x.status = b.dataset.st; x.saiuAs = hr; }); grava(); toast('Saiu para entrega'); const c = pessoa(e.cliente); if (c?.fone) whatsapp(c.fone, `Olá! O material da ${db.config.nome} saiu para entrega em ${e.endereco}. Chega em breve.`, c.nome); });
// baixa da entrega: o que foi entregue de cada item e quem recebeu; faltou algo, fica "entregue em parte"
acao('ent-ok', (b) => { const e = db.entregas.find((x) => x.id === b.dataset.id); e.itens = itensEnt(e);
  const rt = retira(e), { el, fechar } = folha({ titulo: `${rt ? 'Retirada' : 'Entrega'}: ${nomeDe(e.cliente)}`, corpo: `<p class="mudo" style="margin-bottom:10px">${rt ? 'Confira o que o cliente levou do pátio.' : 'Confira o que ficou na obra.'} Faltou ou voltou algo? Diga quanto foi ${rt ? 'retirado' : 'entregue'}.</p>${e.itens.map((x, k) => `<label class="campo"><span>${t(x.nome)} (${rt ? 'separado' : 'saiu'} ${n2(x.qtd, 3)} ${t(x.un)})</span><input inputmode="decimal" data-ok-q="${k}" value="${n2(x.qtd, 3)}"></label>`).join('')}${campos([{ k: 'recebeu', r: rt ? 'Quem retirou' : 'Quem recebeu na obra', req: true, ph: 'Nome de quem assinou o canhoto' }, ...(rt ? [{ k: 'conferiu', r: 'Quem conferiu no pátio', ph: 'Funcionário que separou e conferiu' }] : []), { k: 'ocorr', r: 'Ocorrência (opcional)', ph: 'Ex.: quebraram 20 blocos no caminhão', largo: true }], {})}<label class="liga">O que faltou quebrou ou estragou: lançar como perda no estoque (não volta para a prateleira)<input type="checkbox" data-perda></label><p class="mudo peq">O nome fica como canhoto assinado na tela de Entregas.</p>`,
    pe: `<button type="button" class="bt" data-fechar>Cancelar</button><button type="button" class="bt cheio" data-ok>${ico('check')}Dar baixa</button>` });
  $('[data-ok]', el).onclick = () => { const r = $('[name=recebeu]', el).value.trim(); if (!r) { toast('Quem recebeu?'); return; } e.itens.forEach((x, k) => { x.ok = Math.max(0, Math.min(x.qtd, num($(`[data-ok-q="${k}"]`, el).value))); }); e.recebeu = r; if (rt) e.conferiu = $('[name=conferiu]', el).value.trim(); e.ocorr = $('[name=ocorr]', el).value.trim(); if (rt) e.dia = hoje(); if ($('[data-perda]', el).checked) { e.perda = true; e.itens.filter((x) => x.ok < x.qtd).forEach((x) => { const p = prod(x.prod) || db.produtos.find((y) => y.nome === x.nome); if (p) { p.estoque = Math.round((p.estoque - (x.qtd - x.ok)) * 1000) / 1000; (db.perdas ||= []).push({ dia: hoje(), prod: p.id, qtd: Math.round((x.qtd - x.ok) * 1000) / 1000, custo: p.custo, motivo: e.ocorr || 'quebra na entrega' }); } }); } e.status = e.itens.every((x) => x.ok >= x.qtd - 1e-9) ? 'entregue' : 'parcial'; grava(); fechar(); toast(e.status === 'entregue' ? 'Entregue' : 'Entregue em parte: agende o que faltou'); }; });
acao('ent-resto', (b) => { const e = db.entregas.find((x) => x.id === b.dataset.id), falta = e.itens.filter((x) => x.ok < x.qtd).map((x) => ({ nome: x.nome, un: x.un, qtd: Math.round((x.qtd - x.ok) * 1000) / 1000, ok: 0 })), d = somaDias(hoje(), 1);
  db.entregas.push({ id: uid('en'), venda: e.venda, dia: d, cliente: e.cliente, endereco: e.endereco, bairro: e.bairro, caminhao: e.caminhao, ordem: db.entregas.filter((x) => x.dia === d && x.caminhao === e.caminhao).length + 1, status: 'agendada', obs: '', complemento: true, itens: falta });
  e.status = 'entregue'; e.obs = `${e.obs ? e.obs + ' · ' : ''}o que faltou vai em ${dataBR(d)}`; grava(); toast(`O que faltou foi agendado para ${dataBR(d)}`); });
acao('ent-nova', (b) => { const e = b.dataset.id ? db.entregas.find((x) => x.id === b.dataset.id) : null;
  editar({ titulo: e ? 'Editar entrega' : 'Nova entrega', lista: [{ k: 'cliente', r: 'Cliente', tipo: 'pessoa', filtro: (p) => p.tipo !== 'fornecedor' }, { k: 'dia', r: 'Dia', tipo: 'date', req: true }, { k: 'endereco', r: 'Endereço', req: true, largo: true }, { k: 'bairro', r: 'Bairro' }, { k: 'caminhao', r: 'Caminhão', tipo: 'select', op: db.caminhoes.map((x) => [x.id, x.nome]) }, { k: 'obs', r: 'Observação', ph: 'Descarregar na calçada, ligar antes…', largo: true }],
    v: e || { dia: diaEnt || hoje(), caminhao: db.caminhoes[0]?.id },
    aoSalvar: (d) => { if (e) { if (e.dia !== d.dia || e.caminhao !== d.caminhao) d.ordem = db.entregas.filter((x) => x.dia === d.dia && x.caminhao === d.caminhao).length + 1; Object.assign(e, d); } else db.entregas.push({ id: uid('en'), venda: '', status: 'agendada', itens: [], ordem: db.entregas.filter((x) => x.dia === d.dia && x.caminhao === d.caminhao).length + 1, ...d }); grava(); toast('Entrega salva'); },
    aoApagar: e ? () => { db.entregas = db.entregas.filter((x) => x !== e); grava(); } : null }); });
acao('cam-ed', () => {
  const { el, fechar } = folha({ titulo: 'Caminhões', corpo: `<div data-cms>${db.caminhoes.map((c) => `<div class="campos" data-cm><label class="campo"><span>Nome</span><input name="nome" value="${t(c.nome)}"></label><label class="campo"><span>Placa</span><input name="placa" value="${t(c.placa)}"></label><label class="campo"><span>Motorista</span><input name="motorista" value="${t(c.motorista || '')}"></label><input type="hidden" name="id" value="${t(c.id)}"></div>`).join('')}</div><button type="button" class="bt pq" data-mais-cm>${ico('mais2')}Mais um caminhão</button>`,
    pe: `<button type="button" class="bt" data-fechar>Cancelar</button><button type="button" class="bt cheio" data-ok>${ico('check')}Salvar</button>` });
  $('[data-mais-cm]', el).onclick = () => $('[data-cms]', el).insertAdjacentHTML('beforeend', `<div class="campos" data-cm><label class="campo"><span>Nome</span><input name="nome" placeholder="Ex.: Caminhão basculante"></label><label class="campo"><span>Placa</span><input name="placa"></label><label class="campo"><span>Motorista</span><input name="motorista"></label><input type="hidden" name="id" value="${uid('cm')}"></div>`);
  $('[data-ok]', el).onclick = () => { db.caminhoes = $$('[data-cm]', el).map((r) => ({ id: $('[name=id]', r).value, nome: $('[name=nome]', r).value.trim(), placa: $('[name=placa]', r).value.trim(), motorista: $('[name=motorista]', r).value.trim() })).filter((x) => x.nome); grava(); fechar(); toast('Caminhões salvos'); };
});
const canhoto = (e) => `<div style="border:1px dashed #000;padding:10px;margin:10px 0;break-inside:avoid"><p><b>Canhoto de entrega · ${t(db.config.nome)}</b> · ${dataBR(e.dia)}</p><p><b>Cliente:</b> ${t(nomeDe(e.cliente))} · ${t(e.endereco)} · ${t(e.bairro)}</p><table><thead><tr><th>Material</th><th class="n">Saiu</th><th class="n">Recebido</th></tr></thead><tbody>${itensEnt(e).map((x) => `<tr><td>${t(x.nome)}</td><td class="n">${n2(x.qtd, 3)} ${t(x.un)}</td><td class="n">______</td></tr>`).join('')}</tbody></table><div class="ass" style="margin-top:30px"><div>Nome de quem recebeu</div><div>Assinatura</div></div></div>`;
acao('ent-canhoto', (b) => { const e = db.entregas.find((x) => x.id === b.dataset.id); imprimir('Canhoto de entrega', canhoto(e), 'Guarde o canhoto assinado: ele prova a entrega.'); });
acao('ent-roteiro', (b) => { const c = db.caminhoes.find((x) => x.id === b.dataset.cam), d = diaEnt || hoje(), r = db.entregas.filter((e) => e.dia === d && e.caminhao === c.id).sort((a, x) => a.ordem - x.ordem);
  imprimir(`Roteiro de ${dataBR(d)} · ${c.nome}`, `<p><b>Placa:</b> ${t(c.placa)} · <b>Motorista:</b> ${t(c.motorista || '')}</p><ol>${r.map((e) => `<li>${t(nomeDe(e.cliente))} · ${t(e.endereco)} · ${t(e.bairro)}${e.obs ? ` · <i>${t(e.obs)}</i>` : ''}</li>`).join('')}</ol>${r.map(canhoto).join('')}`, 'Roteiro interno de entregas, com um canhoto para cada cliente assinar.'); });

// ------------------------------------------------------------------ conta da obra e fiado
tela('contas', {
  titulo: 'Conta da obra e fiado', ramo: R,
  html(aba = 'obra') {
    const topo = cab(aba === 'obra' ? 'Conta da obra' : 'Fiado dos profissionais', aba === 'obra' ? `Construtora ou dono da obra compra para a obra e paga depois · prazo padrão de ${PRAZO()} dias por compra; cada conta pode ter o seu` : `Pedreiro, eletricista, encanador, pintor e outros com limite · prazo de ${PRAZO()} dias por compra`, aba === 'obra' ? `<button type="button" class="bt cheio" data-acao="co-nova">${ico('mais2')}Abrir conta da obra</button>` : `<button type="button" class="bt cheio" data-acao="fi-limite">${ico('mais2')}Dar limite de fiado</button>`) +
      `<div class="chips" style="margin-bottom:14px">${[['obra', 'Conta da obra'], ['fiado', 'Fiado dos profissionais']].map(([k, n]) => `<button type="button" class="chip" data-ir="contas/${k}" aria-pressed="${aba === k}">${n}</button>`).join('')}</div>`;
    if (aba === 'fiado') {
      const ps = db.pessoas.filter((p) => p.limite > 0 || Math.abs(saldoFiado(p.id)) > 0.009).map((p) => ({ p, s: saldoFiado(p.id), i: situacaoFiado(p.id) })).sort((a, b) => b.i.atraso - a.i.atraso || b.s - a.s);
      return topo + `<div class="cartao"><h2>Profissionais com limite (pedreiro, eletricista, pintor…)</h2>${ps.length ? `<ul class="lista">${ps.map(({ p, s, i }) => `<li style="flex-wrap:wrap"><div class="tx"><b>${t(p.nome)} ${s > 0.009 ? `<span class="et ${i.cls}">${i.txt}</span>` : ''}</b><small>${s < -0.009 ? `tem crédito de ${R$(-s)}` : `deve ${R$(s)} de ${R$(p.limite || 0)} de limite`}${(() => { const pg = db.fiado.filter((f) => f.pessoa === p.id && f.valor < 0).pop(); return pg ? ` · pagou ${R$(-pg.valor)} em ${dataBR(pg.dia)}` : ''; })()}</small>${travaHtml(credito(p.id))}</div>
        <button type="button" class="bt pq" data-acao="fi-hist" data-id="${p.id}">Ver compras</button><button type="button" class="bt pq zap" data-acao="fi-cobrar" data-id="${p.id}" ${s > 0 ? '' : 'disabled'}>${ico('zap')}Cobrar</button><button type="button" class="bt pq cheio" data-acao="fi-receber" data-id="${p.id}" ${s > 0 ? '' : 'disabled'}>Receber</button></li>`).join('')}</ul>` : vazio('Ninguém com fiado. Dê um limite a um profissional para liberar.')}</div>`;
    }
    return topo + `<div class="grade" style="grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))">${db.contasObra.map((c) => { const s = saldoConta(c), l = db.vendas.filter((v) => v.conta === c.id), i = situacaoConta(c); return `<div class="cartao"><div class="cartao-cab"><h2>${t(c.obra)}</h2>${c.aberta ? (s > 0.009 ? `<span class="et ${i.cls}">${i.txt}</span>` : '<span class="et ok">em dia</span>') : '<span class="et">fechada</span>'}</div><p class="mudo">${t(nomeDe(c.cliente))} · ${pl(l.length, 'compra', 'compras')} · paga em até ${c.prazo || PRAZO()} dias da compra</p>${c.autorizados?.length ? `<p class="peq" style="margin-top:4px"><b>Podem retirar:</b> ${t(c.autorizados.join(', '))}</p>` : ''}${c.pagamentos.length ? `<p class="peq" style="margin-top:4px">Último pagamento: ${R$(c.pagamentos[c.pagamentos.length - 1].valor)} em ${dataBR(c.pagamentos[c.pagamentos.length - 1].dia)}${s > 0.009 ? ' (parcial)' : ''}</p>` : ''}
      <div class="linhas-tot" style="margin:10px 0"><div><span>${s < -0.009 ? 'Crédito do cliente' : 'Deve'}</span><b class="${s > c.limite ? 'vermelho' : s < 0 ? 'verde' : ''}">${R$(Math.abs(s))}</b></div><div><span>Limite</span><b>${R$(c.limite)}</b></div></div>${c.aberta ? travaHtml(credito(c.cliente, c)) : ''}
      <div class="linha-bts">${s > 0.009 ? `<button type="button" class="bt pq cheio" data-acao="co-receber" data-id="${c.id}">Receber</button>` : ''}<button type="button" class="bt pq" data-acao="co-ver" data-id="${c.id}">Extrato</button><button type="button" class="bt pq zap" data-acao="co-zap" data-id="${c.id}" aria-label="Mandar o extrato no WhatsApp" title="Mandar o extrato no WhatsApp">${ico('zap')}WhatsApp</button></div></div>`; }).join('') || vazio('Nenhuma conta da obra.')}</div>`;
  },
});
const conta = (id) => db.contasObra.find((c) => c.id === id);
acao('co-nova', () => editar({ titulo: 'Abrir conta da obra', lista: [{ k: 'cliente', r: 'Cliente', tipo: 'pessoa', req: true, filtro: (p) => p.tipo !== 'fornecedor' }, { k: 'obra', r: 'Nome da obra', req: true, ph: 'Ex.: Casa do Jardim Europa' }, { k: 'limite', r: 'Limite (R$)', tipo: 'money', req: true }],
  aoSalvar: (d) => { db.contasObra.push({ id: uid('co'), aberta: true, pagamentos: [], ...d }); grava(); toast('Conta aberta: já aparece no Balcão'); } }));
function extratoConta(c) { const l = db.vendas.filter((v) => v.conta === c.id); return { l, txt: `Extrato da conta ${c.obra} · ${db.config.nome}\n\n${l.map((v) => `${dataCurta(v.dia)} · ${R$(v.total)} · ${v.itens.map((i) => i.nome).slice(0, 2).join(', ')}${v.retirou ? ` · retirou ${v.retirou}` : ''}`).join('\n')}\n${c.pagamentos.map((p) => `${dataCurta(p.dia)} · pago ${R$(p.valor)}`).join('\n')}\n\nSaldo: ${R$(saldoConta(c))}` }; }
acao('co-ver', (b) => { const c = conta(b.dataset.id), { l } = extratoConta(c);
  folha({ titulo: `Conta: ${c.obra}`, larga: true, corpo: `<p class="mudo" style="margin-bottom:10px">${t(nomeDe(c.cliente))} · limite ${R$(c.limite)}</p><ul class="lista">${[...l.map((v) => ({ d: v.dia, h: `<li><div class="tx"><b>Compra ${dataBR(v.dia)}</b><small>${t(v.itens.map((i) => `${n2(i.qtd, 3)} ${i.un} ${i.nome}`).join(' · '))}</small></div><div class="val">${R$(v.total)}</div></li>` })), ...c.pagamentos.map((p) => ({ d: p.dia, h: `<li><div class="tx"><b>Pagamento ${dataBR(p.dia)}</b><small>${t(p.forma || '')}</small></div><div class="val verde">− ${R$(p.valor)}</div></li>` }))].sort((a, x) => x.d.localeCompare(a.d)).map((x) => x.h).join('')}</ul><div class="total-grande"><span>Saldo</span><b>${R$(saldoConta(c))}</b></div>`,
    pe: `<button type="button" class="bt" data-acao="co-imp" data-id="${c.id}">${ico('imprimir')}Imprimir</button><button type="button" class="bt" data-acao="co-fechar" data-id="${c.id}">${c.aberta ? 'Fechar a conta' : 'Reabrir'}</button><button type="button" class="bt cheio" data-fechar>Fechar</button>` }); });
acao('co-zap', (b) => { const c = conta(b.dataset.id), p = pessoa(c.cliente), s = saldoConta(c), px = s > 0 ? pixCopiaCola(s, 'CONTA OBRA') : ''; whatsapp(p?.fone, `${extratoConta(c).txt}${px ? `

Pix copia e cola (já com o valor):
${px}` : ''}`, p?.nome); });
acao('co-imp', (b) => { const c = conta(b.dataset.id), { l } = extratoConta(c); imprimir(`Extrato da conta da obra · ${c.obra}`, `<p><b>Cliente:</b> ${t(nomeDe(c.cliente))}</p><table><thead><tr><th>Data</th><th>Descrição</th><th class="n">Valor</th></tr></thead><tbody>${l.map((v) => `<tr><td>${dataBR(v.dia)}</td><td>${t(v.itens.map((i) => `${n2(i.qtd, 3)} ${i.un} ${i.nome}`).join('; '))}</td><td class="n">${R$(v.total)}</td></tr>`).join('')}${c.pagamentos.map((p) => `<tr><td>${dataBR(p.dia)}</td><td>Pagamento (${t(p.forma || '')})</td><td class="n">− ${R$(p.valor)}</td></tr>`).join('')}</tbody></table><p class="tot">Saldo: ${R$(saldoConta(c))}</p>`); });
acao('co-fechar', async (b) => { const c = conta(b.dataset.id); if (c.aberta && saldoConta(c) > 0 && !(await confirma(`Ainda deve ${R$(saldoConta(c))}. Fechar a conta mesmo assim? (não aceita compras novas)`, 'Fechar'))) return; c.aberta = !c.aberta; grava(); $('.folha-fundo')?._fechar(); toast(c.aberta ? 'Conta reaberta' : 'Conta fechada'); });
function receberValor(titulo, max, aoReceber) {
  editar({ titulo, lista: [{ k: 'valor', r: 'Valor recebido (R$)', tipo: 'money', req: true }, { k: 'forma', r: 'Forma', tipo: 'select', op: ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Cheque', 'Boleto'].map((x) => [x, x]) }, { k: 'recibo', r: 'Imprimir recibo', tipo: 'check' }], v: { valor: max, forma: 'Pix' }, salvar: 'Receber',
    aoSalvar: (d) => { if (d.valor <= 0) { toast('Digite o valor'); return false; } aoReceber(d); grava(); toast('Recebimento registrado'); } });
}
acao('co-receber', (b) => { const c = conta(b.dataset.id); receberValor(`Receber: ${c.obra}`, saldoConta(c), (d) => { c.pagamentos.push({ dia: hoje(), valor: d.valor, forma: d.forma, caixa: caixaAtual() }); if (d.recibo) recibo({ de: nomeDe(c.cliente), valor: d.valor, ref: `conta da obra ${c.obra}`, forma: d.forma }); }); });
acao('fi-receber', (b) => { const p = pessoa(b.dataset.id); receberValor(`Receber fiado: ${p.nome}`, saldoFiado(p.id), (d) => { db.fiado.push({ id: uid('fi'), pessoa: p.id, dia: hoje(), valor: -d.valor, desc: `Pagamento (${d.forma})`, forma: d.forma, caixa: caixaAtual() }); if (d.recibo) recibo({ de: p.nome, valor: d.valor, ref: 'compras no fiado', forma: d.forma }); }); });
acao('fi-cobrar', (b) => { const p = pessoa(b.dataset.id), px = pixCopiaCola(saldoFiado(p.id), 'FIADO'); whatsapp(p.fone, `Olá, ${p.nome.split(' ')[0]}! Passando para lembrar do seu saldo no fiado da ${db.config.nome}: ${R$(saldoFiado(p.id))}. Pode pagar no balcão ou no Pix.${px ? `

Pix copia e cola (já com o valor):
${px}` : ''}

Obrigado!`, p.nome); });
acao('fi-hist', (b) => { const p = pessoa(b.dataset.id), l = db.fiado.filter((f) => f.pessoa === p.id).sort((a, c) => c.dia.localeCompare(a.dia));
  folha({ titulo: `Fiado: ${p.nome}`, corpo: `<ul class="lista">${l.map((f) => `<li><div class="tx"><b>${dataBR(f.dia)}</b><small>${t(f.desc)}</small></div><div class="val ${f.valor < 0 ? 'verde' : ''}">${f.valor < 0 ? '− ' + R$(-f.valor) : R$(f.valor)}</div></li>`).join('')}</ul><div class="total-grande"><span>Deve</span><b>${R$(saldoFiado(p.id))}</b></div><p class="mudo">Limite: ${R$(p.limite || 0)}</p>`, pe: `<button type="button" class="bt" data-acao="fi-limite" data-id="${p.id}">Mudar o limite</button><button type="button" class="bt cheio" data-fechar>Fechar</button>` }); });
acao('fi-limite', (b) => { $('.folha-fundo')?._fechar(); const p = b.dataset.id ? pessoa(b.dataset.id) : null;
  editar({ titulo: 'Limite do fiado', lista: [...(p ? [] : [{ k: 'pessoa', r: 'Cliente', tipo: 'pessoa', req: true, filtro: (x) => x.tipo !== 'fornecedor' }]), { k: 'limite', r: 'Limite (R$)', tipo: 'money', req: true, dica: '0 = não compra mais fiado' }], v: { limite: p?.limite || 1000 },
    aoSalvar: (d) => { if (!gestor()) { toast('Só o dono muda limite'); return false; } (p || pessoa(d.pessoa)).limite = d.limite; grava(); toast('Limite salvo'); } }); });

// ------------------------------------------------------------------ compras dos fornecedores
tela('reposicao', {
  titulo: 'Compras', ramo: R,
  html() {
    return cab('Compras dos fornecedores', 'Pedido, recebimento e conta a pagar', `<button type="button" class="bt" data-acao="rep-baixo">${ico('caixa')}Montar com o que está baixo</button><button type="button" class="bt cheio" data-acao="rep-novo">${ico('mais2')}Pedido</button>`) +
      [['pedido', 'Esperando chegar'], ['recebido', 'Recebidos']].map(([k, n]) => { const l = db.compras.filter((c) => c.status === k); return `<div class="cartao"><h2>${n}</h2>${l.length ? `<ul class="lista">${l.map((c) => `<li><div class="tx"><b>${t(nomeDe(c.forn))}</b><small>${dataBR(c.dia)} · ${t(c.itens.map((i) => `${n2(i.qtd)} ${i.un} ${i.nome}`).join(' · '))}</small></div><div class="val">${R$(soma(c.itens, (i) => i.qtd * i.custo))}</div>
        <button type="button" class="bt-ico" data-acao="rep-zap" data-id="${c.id}" aria-label="Mandar pedido no WhatsApp">${ico('zap')}</button>${k === 'pedido' ? `<button type="button" class="bt pq cheio" data-acao="rep-receber" data-id="${c.id}">Chegou</button>` : '<span class="et ok">no estoque</span>'}</li>`).join('')}</ul>` : vazio('Nenhum.')}</div>`; }).join('');
  },
});
function pedidoForm(itens = []) {
  const forn = db.pessoas.filter((p) => p.tipo !== 'cliente');
  const linha = (i = {}) => `<div class="campos" data-rp style="grid-template-columns:minmax(0,2fr) 100px 110px 42px;align-items:end"><label class="campo"><span>Produto</span><select name="prod">${db.produtos.map((p) => `<option value="${p.id}" ${p.id === i.prod ? 'selected' : ''}>${t(p.nome)} (compra em ${t(p.compra || p.un)})</option>`).join('')}</select></label><label class="campo"><span>Qtd.</span><input name="qtd" inputmode="decimal" value="${n2(i.qtd || 1)}"></label><label class="campo"><span>Custo un.</span><input name="custo" inputmode="decimal" value="${n2(i.custo ?? prod(i.prod || db.produtos[0]?.id)?.custo * (prod(i.prod || db.produtos[0]?.id)?.fator || 1))}"></label><button type="button" class="bt-ico" style="margin-bottom:14px" data-tira-rp aria-label="Tirar">${ico('x')}</button></div>`;
  const { el, fechar } = folha({ titulo: 'Pedido ao fornecedor', larga: true, corpo: `${campos([{ k: 'forn', r: 'Fornecedor', tipo: 'select', op: [['', '— escolha —'], ...forn.map((p) => [p.id, p.nome])] }, { k: 'venc', r: 'Vencimento do pagamento', tipo: 'date' }], { venc: somaDias(hoje(), 28) })}<div data-rps>${(itens.length ? itens : [{}]).map(linha).join('')}</div><button type="button" class="bt pq" data-mais-rp>${ico('mais2')}Mais um produto</button>`,
    pe: `<button type="button" class="bt" data-fechar>Cancelar</button><button type="button" class="bt" data-ok="zap">${ico('zap')}Salvar e mandar</button><button type="button" class="bt cheio" data-ok="1">${ico('check')}Salvar</button>` });
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-mais-rp]')) $('[data-rps]', el).insertAdjacentHTML('beforeend', linha());
    const x = e.target.closest('[data-tira-rp]'); if (x && $$('[data-rp]', el).length > 1) x.closest('[data-rp]').remove();
    const ok = e.target.closest('[data-ok]'); if (!ok) return;
    const fo = $('[name=forn]', el).value; if (!fo) { toast('Escolha o fornecedor'); return; }
    const l = $$('[data-rp]', el).map((r) => { const p = prod($('[name=prod]', r).value); return { prod: p.id, nome: p.nome, un: p.compra || p.un, qtd: num($('[name=qtd]', r).value), custo: num($('[name=custo]', r).value) }; }).filter((i) => i.qtd > 0);
    if (!l.length) { toast('Ponha pelo menos um produto'); return; }
    const c = { id: uid('cp'), forn: fo, dia: hoje(), status: 'pedido', venc: $('[name=venc]', el).value || somaDias(hoje(), 28), itens: l }; db.compras.unshift(c); grava(); fechar(); toast('Pedido salvo'); if (ok.dataset.ok === 'zap') zapCompra(c);
  });
  el.addEventListener('change', (e) => { if (e.target.name === 'prod') { const p = prod(e.target.value); $('[name=custo]', e.target.closest('[data-rp]')).value = n2(p.custo * (p.fator || 1)); } });
}
function zapCompra(c) { const f = pessoa(c.forn); whatsapp(f?.fone, `Olá! Pedido da ${db.config.nome}:\n${c.itens.map((i) => `• ${n2(i.qtd)} ${i.un} ${i.nome}`).join('\n')}\nEntrega em ${db.config.endereco || db.config.cidade}. Obrigado!`, f?.nome); }
acao('rep-novo', () => pedidoForm());
acao('rep-baixo', () => { const l = db.produtos.filter(baixo).map((p) => ({ prod: p.id, qtd: Math.max(1, Math.ceil((p.minimo * 2 - p.estoque) / (p.fator || 1))), custo: p.custo * (p.fator || 1) })); if (!l.length) { toast('Nada abaixo do mínimo'); return; } pedidoForm(l); toast(`${pl(l.length, "produto abaixo", "produtos abaixo")} do mínimo`); });
acao('rep-zap', (b) => zapCompra(db.compras.find((c) => c.id === b.dataset.id)));
// chegou a carga: confere quantidade e custo e já atualiza o preço de venda mantendo a margem
acao('rep-receber', (b) => { const c = db.compras.find((x) => x.id === b.dataset.id);
  const { el, fechar } = folha({ titulo: `Chegou: ${nomeDe(c.forn)}`, larga: true, corpo: `<p class="mudo" style="margin-bottom:10px">Confira a quantidade e o custo da nota. Se o custo subiu, o Tecton sugere o preço novo mantendo a sua margem.</p>
    <div class="tab-wrap"><table class="tab"><thead><tr><th>Produto</th><th class="n">Chegou</th><th class="n">Custo un.</th><th class="n">Preço hoje</th><th class="n">Preço novo</th></tr></thead><tbody>${c.itens.map((i, k) => { const p = prod(i.prod), m = p && p.custo ? p.preco / p.custo : 1.35, novo = p ? Math.round(i.custo / (p.fator || 1) * m * 100) / 100 : 0;
      return `<tr><td>${t(i.nome)}<small class="mudo" style="display:block">em ${t(i.un)}</small></td><td class="n"><input class="ent" style="width:90px;text-align:right" inputmode="decimal" data-rq="${k}" value="${n2(i.qtd)}" aria-label="Quantidade que chegou de ${t(i.nome)}"></td><td class="n"><input class="ent" style="width:110px;text-align:right" inputmode="decimal" data-rc="${k}" value="${n2(i.custo)}" aria-label="Custo de ${t(i.nome)}"></td><td class="n">${p ? R$(p.preco) + '/' + t(p.un) : ''}</td><td class="n"><input class="ent" style="width:110px;text-align:right" inputmode="decimal" data-rp="${k}" value="${n2(Math.max(novo, p?.preco || 0))}" aria-label="Preço novo de ${t(i.nome)}"></td></tr>`; }).join('')}</tbody></table></div>
    <label class="liga">Atualizar o preço de venda com a coluna “Preço novo”<input type="checkbox" data-atual checked></label><label class="campo"><span>Nota fiscal do fornecedor (número, opcional)</span><input data-nf></label>`,
    pe: `<button type="button" class="bt" data-fechar>Cancelar</button><button type="button" class="bt cheio" data-ok>${ico('check')}Dar entrada</button>` });
  $('[data-ok]', el).onclick = () => { const atual = $('[data-atual]', el).checked;
    c.itens.forEach((i, k) => { const p = prod(i.prod); i.qtd = Math.max(0, num($(`[data-rq="${k}"]`, el).value)); i.custo = Math.max(0, num($(`[data-rc="${k}"]`, el).value)); if (!p) return;
      p.estoque = Math.round((p.estoque + i.qtd * (p.fator || 1)) * 1000) / 1000; if (i.custo) p.custo = Math.round(i.custo / (p.fator || 1) * 100) / 100; if (atual) { const np = num($(`[data-rp="${k}"]`, el).value); if (np > 0) p.preco = np; } });
    c.status = 'recebido'; c.nf = $('[data-nf]', el).value.trim(); db.fin.push({ id: uid('f'), tipo: 'pagar', desc: `${nomeDe(c.forn)} · ${c.itens.map((i) => i.nome).slice(0, 2).join(', ')}${c.nf ? ` · NF ${c.nf}` : ''}`, valor: Math.round(soma(c.itens, (i) => i.qtd * i.custo) * 100) / 100, venc: c.venc || somaDias(hoje(), 28), pago: '', forma: '', pessoa: c.forn, cat: 'Mercadoria' });
    grava(); fechar(); toast(atual ? 'Estoque, custo e preços atualizados; conta a pagar criada' : 'Estoque atualizado e conta a pagar criada'); };
});

// ------------------------------------------------------------------ relatórios
tela('relatorios', {
  titulo: 'Relatórios', ramo: R,
  html() {
    const ini = somaDias(hoje(), -29), vs = db.vendas.filter((v) => v.dia >= ini), por = {};
    vs.forEach((v) => v.itens.forEach((i) => { const p = prod(i.prod); const r = por[i.prod] ||= { nome: i.nome, un: i.un, qtd: 0, val: 0, lucro: 0 }; r.qtd += i.qtd; r.val += i.qtd * i.unit; r.lucro += i.qtd * (i.unit - (p?.custo || 0)); }));
    const giro = Object.values(por).sort((a, b) => b.val - a.val), par = db.produtos.filter(parado).map((p) => ({ p, v: p.estoque * p.custo })).sort((a, b) => b.v - a.v), formas = {}, caixas = {};
    vs.forEach((v) => { formas[v.forma] = (formas[v.forma] || 0) + v.total; caixas[v.caixa || 'Caixa 1'] = (caixas[v.caixa || 'Caixa 1'] || 0) + v.total; }); const tot = soma(vs, (v) => v.total), mx = Math.max(1, ...giro.map((g) => g.val));
    return cab('Relatórios', `Últimos 30 dias: ${dataBR(ini)} a ${dataBR(hoje())}`) + `<div class="grade g4">${numero('dinheiro', 'Vendido', R$(tot), pl(vs.length, 'venda', 'vendas'))}${numero('grafico', 'Ticket médio', R$(vs.length ? tot / vs.length : 0))}${numero('porcento', 'Margem bruta', R$(soma(giro, (g) => g.lucro)), tot ? pc(soma(giro, (g) => g.lucro) / tot * 100) + ' das vendas' : '')}${numero('caixa', 'Dinheiro parado', R$(soma(par, (x) => x.v)), `${pl(par.length, 'produto', 'produtos')} sem venda há ${PARADO}+ dias`)}</div>
      <div class="grade g2"><div class="cartao"><h2>O que mais gira</h2><ul class="lista">${giro.slice(0, 10).map((g) => `<li style="flex-wrap:wrap"><div class="tx"><b>${t(g.nome)}</b><small>${n2(g.qtd, 1)} ${t(g.un)} · margem ${R$(g.lucro)}</small><div style="margin-top:6px">${barra(g.val / mx * 100, 'pri')}</div></div><div class="val">${R$(g.val)}</div></li>`).join('') || '<li class="mudo">Sem vendas no período.</li>'}</ul></div>
      <div class="cartao"><h2>Sem venda há ${PARADO} dias ou mais</h2>${par.length ? `<ul class="lista">${par.map(({ p, v }) => `<li><div class="tx"><b>${t(p.nome)}</b><small>tem ${estoqueTxt(p)} · ${p.ult ? 'última venda em ' + dataBR(p.ult) : 'nunca vendeu'}</small></div><div class="val">${R$(v)}</div></li>`).join('')}</ul><p class="mudo peq" style="margin-top:8px">Valor pelo custo de compra.</p>` : '<p class="mudo">Nada parado.</p>'}
        <h3 style="margin:16px 0 6px">Como pagaram</h3><ul class="lista">${Object.entries(formas).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li><div class="tx"><b>${t(k)}</b></div><div class="val">${R$(v)}<small>${pc(v / (tot || 1) * 100)}</small></div></li>`).join('')}</ul>
        <h3 style="margin:16px 0 6px">Por caixa</h3><ul class="lista">${Object.entries(caixas).map(([k, v]) => `<li><div class="tx"><b>${t(k)}</b></div><div class="val">${R$(v)}</div></li>`).join('')}</ul></div></div>`;
  },
});

// ------------------------------------------------------------------ caixa do dia (abertura, sangria, suprimento e fechamento de cada caixa)
const sessao = (cx = caixaAtual(), dia = hoje()) => (db.caixasDia ||= []).find((s) => s.caixa === cx && s.dia === dia);
const FORMAS = ['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito', 'Fiado', 'Conta da obra'];
function resumoCaixa(s) {
  const vs = db.vendas.filter((v) => v.dia === s.dia && (v.caixa || 'Caixa 1') === s.caixa), por = Object.fromEntries(FORMAS.map((f) => [f, soma(vs.filter((v) => v.forma === f), (v) => v.total)]));
  const recDin = soma(db.contasObra.flatMap((c) => c.pagamentos).filter((p) => p.dia === s.dia && p.caixa === s.caixa && p.forma === 'Dinheiro'), (p) => p.valor) + soma(db.fiado.filter((f) => f.dia === s.dia && f.caixa === s.caixa && f.forma === 'Dinheiro' && f.valor < 0), (f) => -f.valor);
  const sup = soma(s.movs.filter((m) => m.tipo === 'suprimento'), (m) => m.valor), san = soma(s.movs.filter((m) => m.tipo === 'sangria'), (m) => m.valor);
  return { vs, por, recDin, sup, san, esperado: Math.round((s.abertura + por.Dinheiro + recDin + sup - san) * 100) / 100 };
}
function abrirCaixa(depois) {
  editar({ titulo: `Abrir o ${caixaAtual()}`, lista: [{ k: 'abertura', r: 'Troco na gaveta (R$)', tipo: 'money', req: true }], v: { abertura: 200 }, salvar: 'Abrir o caixa',
    aoSalvar: (d) => { (db.caixasDia ||= []).push({ id: uid('cx'), caixa: caixaAtual(), dia: hoje(), abertura: d.abertura, abertoAs: new Date().toTimeString().slice(0, 5), quem: '', movs: [], fechado: null }); grava(); toast(`${caixaAtual()} aberto`); depois?.(); } });
}
tela('caixa', {
  titulo: 'Caixa do dia', ramo: R,
  html() {
    const s = sessao(), cx = caixaAtual();
    const topo = cab(`${cx} · Caixa do dia`, `${dataBR(hoje())} · cada computador escolhe o seu caixa`, `<select class="ent" style="width:auto" data-caixa aria-label="Caixa deste computador">${(db.config.caixas || ['Caixa 1', 'Caixa 2']).map((x) => `<option ${x === cx ? 'selected' : ''}>${t(x)}</option>`).join('')}</select>`);
    if (!s) return topo + `<div class="cartao" style="max-width:560px"><h2>${t(cx)} fechado</h2><p class="mudo" style="margin-bottom:12px">Abra o caixa com o troco da gaveta. As vendas, sangrias e suprimentos ficam ligados a ele até o fechamento.</p><button type="button" class="bt cheio bt-grande" data-acao="caixa-abrir">${ico('dinheiro')}Abrir o ${t(cx)}</button></div>`;
    const r = resumoCaixa(s), tot = soma(r.vs, (v) => v.total);
    return topo + `<div class="grade g4">${numero('agenda', s.fechado ? 'Fechado' : 'Aberto', s.fechado ? s.fechado.hora : s.abertoAs, `com ${R$(s.abertura)} de troco`)}${numero('dinheiro', 'Vendido neste caixa', R$(tot), pl(r.vs.length, 'venda', 'vendas'))}${numero('caixa', 'Dinheiro esperado na gaveta', R$(r.esperado), `${R$(s.abertura)} troco + ${R$(r.por.Dinheiro + r.recDin)} em dinheiro${r.sup ? ` + ${R$(r.sup)} suprimento` : ''}${r.san ? ` − ${R$(r.san)} sangria` : ''}`)}${numero('grafico', 'Pix e cartões', R$(r.por.Pix + r.por['Cartão de débito'] + r.por['Cartão de crédito']), `Pix ${R$(r.por.Pix)} · débito ${R$(r.por['Cartão de débito'])} · crédito ${R$(r.por['Cartão de crédito'])}`)}</div>
      <div class="cartao" style="margin-bottom:16px"><div class="cartao-cab" style="margin-bottom:6px"><h2>A loja hoje</h2><span class="mudo">os caixas lado a lado</span></div><div class="tab-wrap"><table class="tab empilha"><thead><tr><th>Caixa</th><th>Situação</th><th class="n">Vendido</th><th class="n">Dinheiro esperado</th><th class="n">Pix</th><th class="n">Cartões</th></tr></thead><tbody>${(db.config.caixas || ['Caixa 1', 'Caixa 2']).map((x) => { const ss = sessao(x); if (!ss) return `<tr><td data-r="Caixa"><b>${t(x)}</b></td><td data-r="Situação">fechado</td></tr>`; const q = resumoCaixa(ss); return `<tr><td data-r="Caixa"><b>${t(x)}</b></td><td data-r="Situação">${ss.fechado ? `fechado ${ss.fechado.hora}` : `aberto ${ss.abertoAs}`}</td><td class="n" data-r="Vendido">${R$(soma(q.vs, (v) => v.total))}</td><td class="n" data-r="Dinheiro esperado">${R$(q.esperado)}</td><td class="n" data-r="Pix">${R$(q.por.Pix)}</td><td class="n" data-r="Cartões">${R$(q.por['Cartão de débito'] + q.por['Cartão de crédito'])}</td></tr>`; }).join('')}</tbody></table></div></div>
      <div class="grade g2"><div class="cartao"><h2>Vendas do ${t(cx)} hoje</h2><div class="tab-wrap"><table class="tab"><thead><tr><th>Forma</th><th class="n">Vendas</th><th class="n">Total</th></tr></thead><tbody>${FORMAS.map((f) => `<tr><td>${f}</td><td class="n">${r.vs.filter((v) => v.forma === f).length}</td><td class="n">${R$(r.por[f])}</td></tr>`).join('')}<tr><td>Recebido de fiado e conta (em dinheiro)</td><td class="n"></td><td class="n">${R$(r.recDin)}</td></tr></tbody><tfoot><tr><td>Total vendido</td><td class="n">${r.vs.length}</td><td class="n">${R$(tot)}</td></tr></tfoot></table></div></div>
      <div><div class="cartao"><div class="cartao-cab"><h2>Sangria e suprimento</h2>${s.fechado ? '' : `<div class="linha-bts" style="margin:0"><button type="button" class="bt pq" data-acao="caixa-mov" data-tipo="sangria">Sangria</button><button type="button" class="bt pq" data-acao="caixa-mov" data-tipo="suprimento">Suprimento</button></div>`}</div>${s.movs.length ? `<ul class="lista">${s.movs.map((m) => `<li><div class="tx"><b>${m.tipo === 'sangria' ? 'Sangria' : 'Suprimento'} · ${m.hora}</b><small>${t(m.motivo || '')}</small></div><div class="val ${m.tipo === 'sangria' ? 'vermelho' : 'verde'}">${m.tipo === 'sangria' ? '−' : '+'} ${R$(m.valor)}</div></li>`).join('')}</ul>` : '<p class="mudo">Nenhuma ainda.</p>'}</div>
      <div class="cartao"><h2>${s.fechado ? 'Caixa fechado' : 'Fechar o caixa'}</h2>${s.fechado ? `<div class="linhas-tot"><div><span>Dinheiro esperado</span><b>${R$(s.fechado.esperado)}</b></div><div><span>Contado</span><b>${R$(s.fechado.contado)}</b></div><div><span>Diferença</span><b class="${s.fechado.dif < 0 ? 'vermelho' : s.fechado.dif > 0 ? 'verde' : ''}">${s.fechado.dif < 0 ? '−' : ''}${R$(Math.abs(s.fechado.dif))}</b></div></div><div class="linha-bts"><button type="button" class="bt" data-acao="caixa-imp">${ico('imprimir')}Imprimir o fechamento</button><button type="button" class="bt" data-acao="caixa-reabrir">Reabrir</button></div>`
        : `<div class="linhas-tot"><div><span>Dinheiro esperado</span><b>${R$(r.esperado)}</b></div><div><label style="display:flex;align-items:center;gap:8px">Contei na gaveta <input class="ent" style="width:130px;min-height:40px" inputmode="decimal" data-contei placeholder="0,00" aria-label="Dinheiro contado"></label><b data-dif></b></div></div><div class="linha-bts"><button type="button" class="bt cheio" data-acao="caixa-fechar">${ico('check')}Fechar e imprimir</button></div>`}</div></div></div>`;
  },
  montar(el) {
    $('[data-caixa]', el).onchange = (e) => { try { localStorage.setItem('tecton-caixa', e.target.value); } catch { /* ok */ } ir('caixa'); };
    const c = $('[data-contei]', el); if (c) c.oninput = () => { const s = sessao(), d = num(c.value) - resumoCaixa(s).esperado; $('[data-dif]', el).innerHTML = c.value ? `<span class="${d < 0 ? 'vermelho' : d > 0 ? 'verde' : ''}">Diferença ${d < 0 ? '−' : '+'}${R$(Math.abs(d))}</span>` : ''; };
  },
});
acao('caixa-abrir', () => abrirCaixa());
acao('caixa-mov', (b) => { const s = sessao(); editar({ titulo: b.dataset.tipo === 'sangria' ? 'Sangria (tirar dinheiro da gaveta)' : 'Suprimento (pôr troco na gaveta)', lista: [{ k: 'valor', r: 'Valor (R$)', tipo: 'money', req: true }, { k: 'motivo', r: 'Motivo', ph: b.dataset.tipo === 'sangria' ? 'Ex.: levado para o cofre' : 'Ex.: troco do banco' }],
  aoSalvar: (d) => { s.movs.push({ tipo: b.dataset.tipo, valor: d.valor, motivo: d.motivo, hora: new Date().toTimeString().slice(0, 5) }); grava(); toast('Registrado'); } }); });
acao('caixa-fechar', () => { const s = sessao(), c = $('[data-contei]'); if (!c.value) { toast('Conte o dinheiro da gaveta e digite o valor'); c.focus(); return; } const r = resumoCaixa(s); s.fechado = { hora: new Date().toTimeString().slice(0, 5), esperado: r.esperado, contado: num(c.value), dif: Math.round((num(c.value) - r.esperado) * 100) / 100 }; grava(); toast('Caixa fechado'); imprimirCaixa(s); });
acao('caixa-reabrir', async () => { if (!gestor()) { toast('Só o dono reabre o caixa'); return; } if (await confirma('Reabrir o caixa? O fechamento é desfeito.', 'Reabrir')) { sessao().fechado = null; grava(); } });
acao('caixa-imp', () => imprimirCaixa(sessao()));
function imprimirCaixa(s) { const r = resumoCaixa(s); imprimir(`Fechamento do ${s.caixa} · ${dataBR(s.dia)}`, `<p>Aberto às ${s.abertoAs} com ${R$(s.abertura)} · fechado às ${s.fechado?.hora || '—'}</p><table><thead><tr><th>Forma</th><th class="n">Total</th></tr></thead><tbody>${FORMAS.map((f) => `<tr><td>${f}</td><td class="n">${R$(r.por[f])}</td></tr>`).join('')}<tr><td>Sangrias</td><td class="n">− ${R$(r.san)}</td></tr><tr><td>Suprimentos</td><td class="n">${R$(r.sup)}</td></tr></tbody></table><p class="tot">Dinheiro esperado ${R$(r.esperado)} · contado ${R$(s.fechado?.contado || 0)} · diferença ${R$(s.fechado?.dif || 0)}</p><div class="ass"><div>Operador do caixa</div><div>Conferido por</div></div>`, 'Fechamento interno do caixa.'); }

// ------------------------------------------------------------------ financeiro, busca e cadastro
ORIGENS.push(Object.assign(() => [
  ...db.contasObra.filter((c) => saldoConta(c) > 0.009).map((c) => { const v0 = db.vendas.filter((v) => v.conta === c.id).map((v) => v.dia).sort()[0] || hoje(); return { id: 'co-' + c.id, tipo: 'receber', desc: `Conta da obra · ${c.obra}`, valor: Math.round(saldoConta(c) * 100) / 100, venc: somaDias(v0, 30), pago: '', pessoa: c.cliente, origem: 'Conta da obra', baixar: (dia, forma) => c.pagamentos.push({ dia, valor: Math.round(saldoConta(c) * 100) / 100, forma }) }; }),
  ...[...new Set(db.fiado.map((f) => f.pessoa))].filter((p) => saldoFiado(p) > 0.009).map((p) => { const d0 = db.fiado.filter((f) => f.pessoa === p && f.valor > 0).map((f) => f.dia).sort()[0] || hoje(); return { id: 'fi-' + p, tipo: 'receber', desc: `Fiado · ${nomeDe(p)}`, valor: Math.round(saldoFiado(p) * 100) / 100, venc: somaDias(d0, 30), pago: '', pessoa: p, origem: 'Fiado', baixar: (dia, forma) => db.fiado.push({ id: uid('fi'), pessoa: p, dia, valor: -saldoFiado(p), desc: `Pagamento (${forma})` }) }; }),
], { ramo: R }));
ENTRADAS_CAIXA.push(Object.assign(() => [...db.vendas.filter((v) => v.forma !== 'Conta da obra' && v.forma !== 'Fiado').map((v) => ({ dia: v.dia, valor: v.total, desc: `Venda no balcão${v.caixa ? ` · ${v.caixa}` : ''}`, cat: 'Vendas à vista', forma: v.forma, quem: v.cliente ? nomeDe(v.cliente) : '' })), ...db.contasObra.flatMap((c) => c.pagamentos.map((p) => ({ dia: p.dia, valor: p.valor, desc: `Recebido da conta da obra · ${c.obra}`, cat: 'Conta da obra', forma: p.forma, quem: nomeDe(c.cliente) }))), ...db.fiado.filter((f) => f.valor < 0).map((f) => ({ dia: f.dia, valor: -f.valor, desc: 'Recebido do fiado', cat: 'Fiado', forma: f.forma || '', quem: nomeDe(f.pessoa) }))].filter((x) => x.dia <= hoje()), { ramo: R }));
BUSCAS.push(Object.assign((q) => [
  ...db.produtos.filter((p) => `${p.nome} ${p.cod}`.toLowerCase().includes(q)).slice(0, 8).map((p) => [p.nome, `Produto · ${R$(p.preco)}/${p.un} · tem ${estoqueTxt(p)}`, 'estoque/todos']),
  ...db.orcs.filter((o) => o.nome.toLowerCase().includes(q)).map((o) => [`Orçamento de ${o.nome}`, `${R$(o.total)} · ${dataBR(o.dia)}`, 'orcs']),
  ...db.contasObra.filter((c) => c.obra.toLowerCase().includes(q)).map((c) => [`Conta da obra ${c.obra}`, nomeDe(c.cliente), 'contas/obra']),
], { ramo: R }));
RELACIONADOS.push((p) => { if (!db.config.ramos.includes(R)) return ''; const vs = db.vendas.filter((v) => v.cliente === p.id).slice(-8).reverse(), co = db.contasObra.filter((c) => c.cliente === p.id), s = saldoFiado(p.id); if (!vs.length && !co.length && !s && !p.limite) return '';
  return `<div class="cartao"><h2>Na loja</h2>${p.limite || s ? `<p style="margin-bottom:8px">Fiado: deve <b>${R$(s)}</b> de ${R$(p.limite || 0)}</p>` : ''}${co.map((c) => `<p>Conta da obra <b>${t(c.obra)}</b>: deve ${R$(saldoConta(c))}</p>`).join('')}<ul class="lista">${vs.map((v) => `<li><div class="tx"><b>${dataBR(v.dia)} · ${t(v.forma)}</b><small>${t(v.itens.map((i) => i.nome).join(', '))}</small></div><div class="val">${R$(v.total)}</div></li>`).join('')}</ul><p class="mudo peq">Tabela: ${t(tabelas().find((x) => x.id === p.tabela)?.nome || 'Balcão')}</p></div>`; });
