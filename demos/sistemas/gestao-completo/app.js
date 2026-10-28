// Veltria Gestão Completo · protótipo "balcão de etiquetas"
// Seis partes na doca (Painel, Vender, Produtos, Clientes, Contas, Relatórios); cadastros e detalhes abrem na gaveta.
// Dados de exemplo guardados só neste navegador (?novo no endereço recomeça).

import { abrirIA, painelDono, limparDono } from './extras.js';

const CHAVE = 'veltria-gestao-completo-v1';
const R = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const Rk = (v) => (v >= 10000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : R(v));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const ini = (n) => n.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
const hoje0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const diaTxt = (offset) => { const d = hoje0(); d.setDate(d.getDate() + offset); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''); };
const $ = (s, el = document) => el.querySelector(s);
const ic = {
  painel: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/></svg>',
  vender: '<svg viewBox="0 0 24 24"><path d="M4 6h16l-1.5 9h-13z"/><circle cx="9" cy="19" r="1.4"/><circle cx="16" cy="19" r="1.4"/></svg>',
  produtos: '<svg viewBox="0 0 24 24"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="8" cy="8" r="1.6"/></svg>',
  clientes: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/></svg>',
  contas: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  relatorios: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  dono: '<svg viewBox="0 0 24 24"><path d="M4 18h16l-1.5-9-4.5 4-2-6-2 6-4.5-4z"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  mais: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
};
const PARTES = [['painel', 'Painel'], ['vender', 'Vender'], ['produtos', 'Produtos'], ['clientes', 'Clientes'], ['contas', 'Contas'], ['relatorios', 'Relatórios'], ['dono', 'Dono']];
const CATS = ['Cozinha', 'Mesa', 'Limpeza', 'Organização', 'Decoração'];
const VENDEDORES = ['Helena Prado', 'Bianca Souza', 'Rafael Prado'];
const COR_CAT = { Cozinha: '#773c45', Mesa: '#17243a', Limpeza: '#7f8696', Organização: '#c6ad91', Decoração: '#a8737b' };

// ---------------------------------------------------------------- dados de exemplo
function semente() {
  let r = 11; const rnd = () => ((r = (r * 16807) % 2147483647) - 1) / 2147483646;
  const produtos = [
    ['Jogo de panelas antiaderente 5 peças', 'Cozinha', 189, 329.9, 6, 3], ['Frigideira 24 cm', 'Cozinha', 42, 79.9, 14, 5], ['Faqueiro inox 24 peças', 'Mesa', 61, 119.9, 9, 4],
    ['Jogo de copos 6 un.', 'Mesa', 18.5, 39.9, 22, 8], ['Aparelho de jantar 20 peças', 'Mesa', 148, 279, 2, 3], ['Garrafa térmica 1 L', 'Cozinha', 27, 54.9, 17, 6],
    ['Pote hermético kit 5', 'Organização', 21, 44.9, 31, 10], ['Organizador de gaveta', 'Organização', 9.8, 22.9, 40, 12], ['Cesto multiuso', 'Organização', 14, 29.9, 3, 6],
    ['Balde com espremedor', 'Limpeza', 23, 49.9, 12, 5], ['Rodo 40 cm', 'Limpeza', 8.4, 17.9, 26, 8], ['Kit panos de microfibra', 'Limpeza', 11, 24.9, 0, 10],
    ['Vaso de cerâmica médio', 'Decoração', 26, 59.9, 8, 3], ['Porta-retrato 15x21', 'Decoração', 9.5, 24.9, 19, 6], ['Vela aromática', 'Decoração', 12, 32.9, 5, 6],
    ['Tábua de corte bambu', 'Cozinha', 16, 34.9, 21, 6], ['Escorredor de louça', 'Cozinha', 33, 69.9, 7, 4], ['Toalha de mesa 6 lugares', 'Mesa', 24, 54.9, 11, 4],
  ].map(([nome, cat, custo, preco, estoque, minimo], i) => ({ id: `p${i}`, nome, cat, custo, preco, estoque, minimo, cod: `789${String(4400000 + i * 173).padStart(10, '0')}` }));
  const clientes = [
    ['Márcia Fontes', '(11) 98811-2040', 0, 2400], ['Restaurante Sabor de Casa', '(11) 3344-1209', 486.5, 3000], ['Jonas Prado', '(11) 99120-5531', 129.8, 800],
    ['Buffet Ramos', '(11) 97000-3412', 0, 5000], ['Cláudia Neves', '(11) 98455-7009', 54.9, 500], ['Pousada Ipê Amarelo', '(11) 3021-8890', 0, 4000],
  ].map(([nome, tel, deve, limite], i) => ({ id: `c${i}`, nome, tel, deve, limite, compras: 2 + Math.floor(rnd() * 14) }));
  const vendas = []; let nv = 1000;
  for (let dia = -6; dia <= 0; dia++) {
    const n = 10 + Math.floor(rnd() * 12);
    for (let k = 0; k < n; k++) {
      const itens = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => { const p = produtos[Math.floor(rnd() * produtos.length)]; return { id: p.id, nome: p.nome, qtd: 1 + Math.floor(rnd() * 2), preco: p.preco, custo: p.custo }; });
      const total = itens.reduce((t, x) => t + x.qtd * x.preco, 0);
      const forma = ['Pix', 'Pix', 'Cartão', 'Cartão', 'Dinheiro', 'Fiado'][Math.floor(rnd() * 6)];
      const c = forma === 'Fiado' || rnd() > .7 ? clientes[Math.floor(rnd() * clientes.length)] : null;
      const hh = 9 + Math.floor(k * 9 / n), mm = Math.floor(rnd() * 60);
      if (dia === 0 && hh * 60 + mm > Math.max(9 * 60 + 30, new Date().getHours() * 60 + new Date().getMinutes())) continue;   // hoje: só até agora
      vendas.push({ n: nv++, dia, hora: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, itens, total, desconto: 0, forma, cliente: c?.id || '' });
    }
  }
  const contas = [
    { id: 'k0', tipo: 'pagar', nome: 'Utilar Distribuidora (boleto)', valor: 2380.4, vence: 2, pago: false, cat: 'Fornecedor' },
    { id: 'k1', tipo: 'pagar', nome: 'Aluguel da loja', valor: 3200, vence: 6, pago: false, cat: 'Aluguel' },
    { id: 'k2', tipo: 'pagar', nome: 'Energia', valor: 386.7, vence: -1, pago: false, cat: 'Contas da casa' },
    { id: 'k3', tipo: 'pagar', nome: 'Cerâmicas Vale (nota 4471)', valor: 1150, vence: 15, pago: false, cat: 'Fornecedor' },
    { id: 'k4', tipo: 'receber', nome: 'Restaurante Sabor de Casa: fiado de outubro', valor: 486.5, vence: 4, pago: false, cat: 'Fiado', cliente: 'c1' },
    { id: 'k5', tipo: 'receber', nome: 'Buffet Ramos: pedido de festa (2ª parcela)', valor: 1840, vence: 9, pago: false, cat: 'Pedido' },
    { id: 'k6', tipo: 'pagar', nome: 'Internet e telefone', valor: 149.9, vence: -4, pago: true, cat: 'Contas da casa' },
  ];
  vendas.forEach((v, i) => { v.vendedor = VENDEDORES[i % 3]; });
  produtos[13].promo = { preco: 19.9, ate: 5 }; produtos[6].promo = { preco: 39.9, ate: 2 };
  const fornecedores = [['Utilar Distribuidora', '(11) 3011-4400', ['Cozinha', 'Mesa']], ['Limpa Bem Atacado', '(11) 3388-1020', ['Limpeza', 'Organização']], ['Cerâmicas Vale', '(19) 3455-7781', ['Decoração']]].map(([nome, tel, cats], i) => ({ id: `f${i}`, nome, tel, cats }));
  const orcamentos = [{ n: 'O-31', cliente: 'c3', itens: [{ id: 'p4', nome: produtos[4].nome, qtd: 2, preco: produtos[4].preco, custo: produtos[4].custo }, { id: 'p17', nome: produtos[17].nome, qtd: 4, preco: produtos[17].preco, custo: produtos[17].custo }], total: 2 * produtos[4].preco + 4 * produtos[17].preco, dia: -2, st: 'aberto' }];
  // 2ª leva: lista de presente, encomendas, carnê, avaria, kits, campanha, despesas fixas, metas por vendedor, aniversários e clientes sumidos
  const mm = String(new Date().getMonth() + 1).padStart(2, '0'); Object.assign(clientes[0], { nasc: `${mm}-12`, ultima: -3 }); Object.assign(clientes[4], { nasc: `${mm}-27`, ultima: -9 }); Object.assign(clientes[2], { nasc: '01-20', ultima: -2 }); Object.assign(clientes[5], { ultima: -75 }); Object.assign(clientes[3], { ultima: -64 }); Object.assign(clientes[1], { ultima: -1, credito: 12.4 });
  const listas = [{ id: 'L1', nome: 'Larissa e Tiago', evento: 'Chá de cozinha', dia: 18, tel: '11988112233', itens: [['p0', 1, 1, ['tia Rosa']], ['p2', 1, 0, []], ['p3', 2, 1, ['Bia']], ['p15', 1, 0, []], ['p5', 1, 0, []], ['p16', 1, 0, []]].map(([id, qtd, comprado, por]) => ({ id, qtd, comprado, por })) }];
  const encomendas = [{ id: 'E1', cliente: 'c0', prod: 'Panela de pressão 7 L inox', valor: 219.9, sinal: 60, prazo: 3, st: 'pedida' }, { id: 'E2', cliente: 'c3', prod: 'Jogo de taças de cristal (12)', valor: 389, sinal: 100, prazo: -1, st: 'chegou' }];
  const carnes = [{ id: 'K1', cliente: 'c2', total: 548, parcelas: [[137, -35, true], [137, -5, false], [137, 25, false], [137, 55, false]].map(([valor, vence, pago]) => ({ valor, vence, pago })) }];
  const fixas = [['Aluguel da loja', 3200], ['Salários e encargos', 6900], ['Energia e água', 520], ['Internet e telefone', 150], ['Contador', 450], ['Sistema e maquininha', 380]].map(([nome, v]) => ({ nome, v }));
  const extras2 = { listas, encomendas, carnes, cobrados: {}, cashback: 3, avarias: [{ n: 'a1', id: 'p4', qtd: 1, forn: 'Utilar Distribuidora', motivo: 'Prato lascado na caixa', st: 'separada' }], kits: [{ id: 'T1', nome: 'Kit cozinha nova', itens: ['p1', 'p15', 'p5'], desc: 10 }, { id: 'T2', nome: 'Kit organização', itens: ['p6', 'p7'], desc: 8 }], campanhas: [{ id: 'C1', nome: 'Semana da limpeza', cat: 'Limpeza', pct: 12, fim: 7, ativa: false }], pedidosForn: [], markup: { Cozinha: 80, Mesa: 90, Limpeza: 100, Organização: 110, Decoração: 120 }, metaVend: { 'Helena Prado': 7000, 'Bianca Souza': 6000, 'Rafael Prado': 6000 }, fixas, saldoBanco: 8400 };
  return { ...extras2, produtos, clientes, vendas, contas, fornecedores, orcamentos, ajustes: [], devolucoes: [], caixa: { sangrias: [], fechamentos: [] }, vendedor: VENDEDORES[0], comissao: 2, cupom: [], forma: 'Pix', desconto: 0, cliente: '', caixaInicial: 300, proxVenda: nv, proxOrc: 32, metaDia: 2500 };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || semente(); } catch { return semente(); } })();
['fornecedores', 'orcamentos', 'ajustes', 'devolucoes'].forEach((k) => { if (!Array.isArray(db[k])) db[k] = []; }); db.caixa ||= { sangrias: [], fechamentos: [] }; db.vendedor ||= VENDEDORES[0]; db.comissao ??= 2; db.proxOrc ||= 1;
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { /* sem espaço: segue na memória */ } };
const prod = (id) => db.produtos.find((p) => p.id === id);
const cli = (id) => db.clientes.find((c) => c.id === id);

// contas
const soma = (l, f) => l.reduce((t, x) => t + f(x), 0);
const vendasDia = (d) => db.vendas.filter((v) => v.dia === d);
const totalDia = (d) => vendasDia(d).reduce((t, v) => t + v.total, 0);
const lucroVenda = (v) => v.itens.reduce((t, x) => t + x.qtd * (x.preco - x.custo), 0) - (v.desconto || 0);
const lucroDia = (d) => vendasDia(d).reduce((t, v) => t + lucroVenda(v), 0);
const noCaixa = () => db.caixaInicial + vendasDia(0).filter((v) => v.forma === 'Dinheiro').reduce((t, v) => t + v.total, 0) - soma(db.caixa?.sangrias || [], (x) => x.v) - soma((db.devolucoes || []).filter((d) => d.dia === 0 && d.como === 'Dinheiro'), (d) => d.valor) + soma(db.clientes.flatMap((c) => (c.pagos || []).filter((p) => p.dia === 0 && p.forma === 'Dinheiro')), (p) => p.v);
// preço que vale agora (promoção dentro do prazo)
const pv = (p) => (p.promo && p.promo.ate >= 0 ? p.promo.preco : p.preco);
const n2 = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.'));
// planilha para o Excel (separador ;); célula que começa com = + - @ vira texto
function baixaCSV(nome, linhas) { const t = '﻿' + linhas.map((l) => l.map((v) => { const s1 = typeof v === 'number' ? String(Math.round(v * 100) / 100).replace('.', ',') : String(v ?? ''); return `"${(/^[=+\-@]/.test(s1) && typeof v !== 'number' ? `'${s1}` : s1).replace(/"/g, '""')}"`; }).join(';')).join('\r\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv;charset=utf-8' })); a.download = nome; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
const acabando = () => db.produtos.filter((p) => p.estoque <= p.minimo).sort((a, b) => a.estoque - b.estoque);
const aReceber = () => db.clientes.reduce((t, c) => t + c.deve, 0) + db.contas.filter((k) => k.tipo === 'receber' && !k.pago && !k.cliente).reduce((t, k) => t + k.valor, 0);
const pagarAte = (dias) => db.contas.filter((k) => k.tipo === 'pagar' && !k.pago && k.vence <= dias);
const vendidosQtd = () => { const m = {}; db.vendas.forEach((v) => v.itens.forEach((x) => { m[x.id] = (m[x.id] || 0) + x.qtd; })); return m; };

// ---------------------------------------------------------------- avisos e gaveta
function avisar(txt) { const a = document.createElement('div'); a.className = 'aviso'; a.textContent = txt; $('#avisos').append(a); setTimeout(() => a.remove(), 2800); }
let gavetaAcao = null, focoAntes = null;
function gaveta(titulo, corpo, pe = '', aoConfirmar = null) {
  focoAntes = document.activeElement;
  const g = $('#gaveta');
  g.innerHTML = `<div class="gaveta-cab"><h2 id="gaveta-titulo">${titulo}</h2><button type="button" data-acao="fechar" aria-label="Fechar">${ic.x}</button></div><div class="gaveta-corpo">${corpo}</div>${pe ? `<div class="gaveta-pe">${pe}</div>` : ''}`;
  gavetaAcao = aoConfirmar;
  $('#gaveta-fundo').hidden = false; g.classList.add('aberta'); g.setAttribute('aria-hidden', 'false');
  setTimeout(() => (g.querySelector('input, select, textarea') || g.querySelector('button')).focus(), 60);
}
function fecharGaveta() {
  const g = $('#gaveta'); g.classList.remove('aberta'); g.setAttribute('aria-hidden', 'true'); $('#gaveta-fundo').hidden = true; gavetaAcao = null;
  if (focoAntes) focoAntes.focus?.();
}

// ---------------------------------------------------------------- telas
let parte = 'painel', filtroCat = '', filtroPdv = '', filtroCli = '', abaContas = 'pagar';

const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
function telaPainel() {
  const agora = new Date().toTimeString().slice(0, 5), hoje = totalDia(0), ontem = soma(vendasDia(-1).filter((v) => v.hora <= agora), (v) => v.total), dif = ontem ? (hoje - ontem) / ontem : 0;
  const sem = Array.from({ length: 7 }, (_, i) => totalDia(i - 6)), max = Math.max(...sem, 1);
  const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const ult = [...vendasDia(0)].sort((a, b) => b.hora.localeCompare(a.hora)).slice(0, 6);
  const atencao = [
    ...acabando().slice(0, 3).map((p) => ({ txt: `<b>${esc(p.nome)}</b><span>${p.estoque ? `restam ${p.estoque}, o mínimo é ${p.minimo}` : 'acabou'}</span>`, selo: '<span class="selo vinho">Repor</span>', acao: `data-acao="entrada" data-id="${p.id}"` })),
    ...db.orcamentos.filter((o) => o.st === 'aberto' && o.dia <= -2).map((o) => ({ txt: `<b>Orçamento ${o.n}${o.cliente ? ` · ${esc(cli(o.cliente)?.nome || '')}` : ''}</b><span>${R(o.total)} parado há ${-o.dia} dias</span>`, selo: '<span class="selo alerta">Cobrar</span>', acao: 'data-acao="orcamentos"' })),
    ...pagarAte(3).map((k) => ({ txt: `<b>${esc(k.nome)}</b><span>${k.vence < 0 ? `venceu há ${-k.vence} dia${k.vence < -1 ? 's' : ''}` : k.vence === 0 ? 'vence hoje' : `vence em ${k.vence} dia${k.vence > 1 ? 's' : ''}`} · ${R(k.valor)}</span>`, selo: `<span class="selo ${k.vence < 0 ? 'vinho' : 'alerta'}">Pagar</span>`, acao: `data-acao="conta" data-id="${k.id}"` })),
  ];
  const pctMeta = Math.min(100, Math.round(hoje / db.metaDia * 100));
  return `<div class="cab"><div><h1>${saudacao()}. ${pctMeta >= 100 ? 'A meta do dia já foi batida.' : 'A loja está aberta.'}</h1><p>Você vendeu ${R(hoje)} hoje, ${pctMeta}% da meta do dia (${R(db.metaDia)}).</p></div><button class="btn navy" data-acao="ir" data-v="relatorios">Ver relatórios</button></div>
  <div class="etiquetas">
    <div class="etiqueta vinho"><span class="rot">Vendido hoje</span><span class="val">${R(hoje)}</span><span class="det"><span class="${dif >= 0 ? 'sobe' : 'desce'}">${dif >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(dif * 100))}%</span> sobre ontem até esta hora</span></div>
    <div class="etiqueta"><span class="rot">Lucro de hoje</span><span class="val">${R(lucroDia(0))}</span><span class="det">${vendasDia(0).length} vendas, ticket médio ${R(hoje / Math.max(1, vendasDia(0).length))}</span></div>
    <div class="etiqueta navy"><span class="rot">Dinheiro na gaveta</span><span class="val">${R(noCaixa())}</span><span class="det">abriu com ${R(db.caixaInicial)}</span></div>
    <div class="etiqueta"><span class="rot">A receber</span><span class="val">${R(aReceber())}</span><span class="det">fiado e pedidos em aberto</span></div>
  </div>
  <div class="grade-2">
    <section class="bloco"><div class="bloco-cab"><h2>Últimos 7 dias</h2><span class="selo">${Rk(sem.reduce((a, b) => a + b, 0))} na semana</span></div>
      <div class="semana">${sem.map((v, i) => { const d = hoje0(); d.setDate(d.getDate() + i - 6); return `<div class="dia ${i === 6 ? 'hoje' : ''} ${v === max && v > 0 ? 'top' : ''}"><b>${Rk(v).replace('R$ ', '')}</b><div class="barra" style="height:${Math.max(2, v / max * 100)}%" title="${R(v)}"></div><small>${i === 6 ? 'hoje' : dias[d.getDay()]}</small></div>`; }).join('')}</div>
      <div class="semana-pe"><span>Média por dia <b>${R(sem.reduce((a, b) => a + b, 0) / 7)}</b></span><span>Melhor dia <b>${(() => { const k = sem.indexOf(max); const d = hoje0(); d.setDate(d.getDate() + k - 6); return k === 6 ? 'hoje' : dias[d.getDay()]; })()} · ${R(max)}</b></span></div>
    </section>
    <section class="bloco"><div class="bloco-cab"><h2>Precisa de você</h2><span class="selo vinho">${atencao.length}</span></div>
      ${atencao.length ? `<ul class="lista">${atencao.map((a) => `<li><div class="cresce">${a.txt}</div><button class="btn peq fant" ${a.acao}>${a.selo}</button></li>`).join('')}</ul>` : '<p class="vazio">Nada pendente. Bom trabalho.</p>'}
    </section>
  </div>
  <section class="bloco"><div class="bloco-cab"><h2>Vendas de hoje</h2><button class="btn peq vinho" data-acao="ir" data-v="vender">${ic.mais}Nova venda</button></div>
    ${ult.length ? `<ul class="lista">${ult.map((v) => `<li class="clica" data-acao="venda" data-n="${v.n}" style="cursor:pointer"><span class="av">${v.hora}</span><div class="cresce"><b>${esc(v.itens.map((x) => `${x.qtd}× ${x.nome}`).join(', '))}</b><span>Venda ${v.n} · ${v.forma}${v.cliente ? ` · ${esc(cli(v.cliente)?.nome)}` : ''}</span></div><b class="dir">${R(v.total)}</b></li>`).join('')}</ul>` : '<p class="vazio">Nenhuma venda ainda hoje. A primeira está a um toque: Nova venda.</p>'}
  </section>`;
}

function telaVender() {
  const q = norm(filtroPdv);
  const lista = db.produtos.filter((p) => (!filtroCat || p.cat === filtroCat) && (!q || norm(p.nome).includes(q) || p.cod.includes(q)));
  const sub = db.cupom.reduce((t, x) => t + x.qtd * pv(prod(x.id)), 0), desc = Math.min(db.desconto || 0, sub), total = sub - desc;
  const noCupom = Object.fromEntries(db.cupom.map((x) => [x.id, x.qtd]));
  return `<div class="cab"><div><h1>Vender</h1><p>Toque no produto para pôr no cupom. Dá para buscar pelo nome ou pelo código de barras.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select class="campo" id="vendedor" aria-label="Quem está vendendo" style="width:auto">${VENDEDORES.map((n) => `<option ${db.vendedor === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><button class="btn" data-acao="orcamentos">Orçamentos${db.orcamentos.filter((o) => o.st === 'aberto').length ? ` (${db.orcamentos.filter((o) => o.st === 'aberto').length})` : ''}</button><button class="btn navy" data-acao="fechar-caixa">Fechar o caixa</button></div></div>
  <div class="pdv">
    <div>
      <div class="pdv-busca"><input class="campo" id="pdv-busca" type="search" placeholder="Buscar produto ou passar o código" value="${esc(filtroPdv)}" autocomplete="off" aria-label="Buscar produto"></div>
      <div class="chips" role="group" aria-label="Categorias"><button class="chip" data-acao="cat" data-v="" aria-pressed="${!filtroCat}">Todos</button>${CATS.map((c) => `<button class="chip" data-acao="cat" data-v="${c}" aria-pressed="${filtroCat === c}">${c}</button>`).join('')}</div>
      <div class="produtos-grade">${lista.map((p) => `<button class="prod ${p.estoque ? '' : 'sem'}" data-acao="por" data-id="${p.id}" ${p.estoque ? '' : 'disabled'}>${noCupom[p.id] ? `<span class="qtd-no">${noCupom[p.id]}</span>` : ''}<b>${esc(p.nome)}</b><small>${p.estoque ? `${p.estoque} em estoque` : 'sem estoque'}</small><span class="preco">${pv(p) !== p.preco ? `<s style="display:block;opacity:.6;font-size:.62em;font-weight:500">${R(p.preco)}</s>` : ''}${R(pv(p))}</span></button>`).join('') || '<p class="vazio">Nenhum produto com esse nome.</p>'}</div>
    </div>
    <aside class="cupom" aria-label="Cupom da venda">
      <div class="cupom-cab"><b>Venda ${db.proxVenda}</b><span>${db.cupom.reduce((t, x) => t + x.qtd, 0)} itens</span></div>
      ${db.cupom.length ? `<ul class="cupom-itens">${db.cupom.map((x) => { const p = prod(x.id); return `<li><b>${esc(p.nome)}</b><b class="num">${R(pv(p) * x.qtd)}</b><div class="ctrl"><button data-acao="menos" data-id="${p.id}" aria-label="Tirar um">−</button><span class="num">${x.qtd}</span><button data-acao="mais" data-id="${p.id}" aria-label="Pôr mais um">+</button></div><small class="num" style="color:var(--tinta-3)">${R(pv(p))} cada${pv(p) !== p.preco ? ' · promoção' : ''}</small></li>`; }).join('')}</ul>` : '<p class="vazio" style="padding:18px">O cupom está vazio. Toque em um produto ao lado.</p>'}
      <div class="cupom-pe">
        <div class="linha-tot"><span>Subtotal</span><span>${R(sub)}</span></div>
        <div class="linha-tot"><span>Desconto <button class="btn peq fant" data-acao="desconto" style="min-height:28px;padding:0 8px">${desc ? 'mudar' : 'dar desconto'}</button></span><span>− ${R(desc)}</span></div>
        <div class="linha-tot grande"><span>Total</span><span>${R(total)}</span></div>
        <div class="formas" role="group" aria-label="Forma de pagamento">${['Pix', 'Cartão', 'Dinheiro', 'Fiado', ...(db.cliente && cli(db.cliente)?.credito ? ['Crédito'] : [])].map((f) => `<button data-acao="forma" data-v="${f}" aria-pressed="${db.forma === f}">${f}</button>`).join('')}</div>
        ${db.forma === 'Fiado' || db.cliente ? `<select class="campo" id="pdv-cliente" aria-label="Cliente"><option value="">${db.forma === 'Fiado' ? 'Escolha o cliente do fiado' : 'Sem cliente'}</option>${db.clientes.map((c) => `<option value="${c.id}" ${db.cliente === c.id ? 'selected' : ''}>${esc(c.nome)}${c.deve ? ` (deve ${R(c.deve)})` : ''}</option>`).join('')}</select>` : '<button class="btn peq fant" data-acao="pdv-cliente">+ Pôr o nome do cliente</button>'}
        <button class="btn vinho" data-acao="fechar-venda" ${db.cupom.length ? '' : 'disabled'}>Fechar venda · ${R(total)}</button>
        <button class="btn peq fant" data-acao="salvar-orc" ${db.cupom.length ? '' : 'disabled'}>Salvar como orçamento</button>
      </div>
    </aside>
  </div>`;
}

function telaProdutos() {
  const q = norm($('#busca').value), vend = vendidosQtd();
  const lista = db.produtos.filter((p) => (!filtroCat || p.cat === filtroCat) && (!q || norm(p.nome).includes(q)));
  const valorEstoque = db.produtos.reduce((t, p) => t + p.estoque * p.custo, 0);
  return `<div class="cab"><div><h1>Produtos</h1><p>${db.produtos.length} produtos, ${R(valorEstoque)} parados em estoque (pelo custo). ${acabando().length} precisam de reposição.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-acao="fornecedores">Fornecedores</button><button class="btn" data-acao="etiquetas">Etiquetas de preço</button><button class="btn" data-acao="entrada">Chegou mercadoria</button><button class="btn vinho" data-acao="produto">${ic.mais}Novo produto</button></div></div>
  <div class="chips" role="group" aria-label="Categorias"><button class="chip" data-acao="cat" data-v="" aria-pressed="${!filtroCat}">Todos</button>${CATS.map((c) => `<button class="chip" data-acao="cat" data-v="${c}" aria-pressed="${filtroCat === c}">${c}</button>`).join('')}</div>
  <section class="bloco"><div class="tabela-caixa"><table>
    <thead><tr><th>Produto</th><th>Categoria</th><th>Estoque</th><th class="n">Custo</th><th class="n">Preço</th><th class="n">Margem</th><th class="n">Vendidos (7 dias)</th></tr></thead>
    <tbody>${lista.map((p) => { const m = (p.preco - p.custo) / p.preco, baixo = p.estoque <= p.minimo; return `<tr class="clica" data-acao="produto" data-id="${p.id}"><td><b>${esc(p.nome)}</b></td><td><span class="selo" style="background:${COR_CAT[p.cat]}22;color:${COR_CAT[p.cat] === '#c6ad91' ? '#7a6248' : COR_CAT[p.cat]}">${p.cat}</span></td><td style="white-space:nowrap"><span class="nivel ${baixo ? 'baixo' : ''}"><i style="width:${Math.min(100, p.estoque / (p.minimo * 3) * 100)}%"></i></span>${p.estoque}${baixo ? ' <span class="selo vinho">repor</span>' : ''}</td><td class="n">${R(p.custo)}</td><td class="n"><b>${R(pv(p))}</b>${pv(p) !== p.preco ? `<br><span class="selo alerta">promoção até ${diaTxt(p.promo.ate)}</span>` : ''}</td><td class="n">${Math.round(m * 100)}%</td><td class="n">${vend[p.id] || 0}</td></tr>`; }).join('')}</tbody>
  </table></div></section>`;
}

function telaClientes() {
  const q = norm(filtroCli || $('#busca').value);
  const lista = db.clientes.filter((c) => !q || norm(c.nome).includes(q)).sort((a, b) => b.deve - a.deve);
  return `<div class="cab"><div><h1>Clientes</h1><p>${db.clientes.length} clientes. ${R(db.clientes.reduce((t, c) => t + c.deve, 0))} em fiado para receber.</p></div><button class="btn vinho" data-acao="cliente">${ic.mais}Novo cliente</button></div>
  <section class="bloco"><ul class="lista">${lista.map((c) => { const usado = c.limite ? c.deve / c.limite : 0; return `<li class="clica" data-acao="cliente" data-id="${c.id}" style="cursor:pointer"><span class="av">${ini(c.nome)}</span><div class="cresce"><b>${esc(c.nome)}</b><span>${esc(c.tel)} · ${c.compras} compras · limite de fiado ${R(c.limite)}</span></div><div class="dir">${c.deve ? `<b>${R(c.deve)}</b><br><span class="selo ${usado > .8 ? 'vinho' : 'alerta'}">deve</span>` : '<span class="selo ok">em dia</span>'}</div></li>`; }).join('')}</ul></section>`;
}

function telaContas() {
  const ks = db.contas.filter((k) => k.tipo === abaContas).sort((a, b) => a.pago - b.pago || a.vence - b.vence);
  const abertas = ks.filter((k) => !k.pago), soma = abertas.reduce((t, k) => t + k.valor, 0);
  const prox7 = abertas.filter((k) => k.vence <= 7).reduce((t, k) => t + k.valor, 0);
  return `<div class="cab"><div><h1>Contas</h1><p>O que sai e o que entra nos próximos dias, sem planilha.</p></div><button class="btn vinho" data-acao="nova-conta">${ic.mais}Nova conta</button></div>
  <div class="chips" role="group" aria-label="Tipo de conta"><button class="chip" data-acao="aba-contas" data-v="pagar" aria-pressed="${abaContas === 'pagar'}">A pagar</button><button class="chip" data-acao="aba-contas" data-v="receber" aria-pressed="${abaContas === 'receber'}">A receber</button></div>
  <div class="etiquetas">
    <div class="etiqueta ${abaContas === 'pagar' ? 'vinho' : 'navy'}"><span class="rot">Em aberto</span><span class="val">${R(soma)}</span><span class="det">${abertas.length} contas</span></div>
    <div class="etiqueta"><span class="rot">Nos próximos 7 dias</span><span class="val">${R(prox7)}</span><span class="det">${abaContas === 'pagar' ? 'para separar no caixa' : 'para cobrar'}</span></div>
  </div>
  <section class="bloco"><ul class="lista">${ks.map((k) => `<li><span class="av" style="background:${k.pago ? 'var(--prata)' : k.vence < 0 ? 'var(--vinho)' : 'var(--navy)'}">${k.pago ? '✓' : k.vence < 0 ? '!' : k.vence}</span><div class="cresce"><b>${esc(k.nome)}</b><span>${k.cat} · ${k.pago ? 'pago' : k.vence < 0 ? `venceu dia ${diaTxt(k.vence)}` : `vence dia ${diaTxt(k.vence)}`}</span></div><b class="dir">${R(k.valor)}</b>${k.pago ? '<span class="selo ok">pago</span>' : `<button class="btn peq" data-acao="baixar" data-id="${k.id}">${abaContas === 'pagar' ? 'Paguei' : 'Recebi'}</button>`}</li>`).join('') || '<li class="vazio">Nenhuma conta aqui.</li>'}</ul></section>`;
}

function telaRelatorios() {
  const vend = vendidosQtd(), tot7 = db.vendas.reduce((t, v) => t + v.total, 0), luc7 = db.vendas.reduce((t, v) => t + lucroVenda(v), 0);
  const formas = {}; db.vendas.forEach((v) => { formas[v.forma] = (formas[v.forma] || 0) + v.total; });
  const coresF = { Pix: '#773c45', Cartão: '#17243a', Dinheiro: '#c6ad91', Fiado: '#b9bec7' };
  let acc = 0; const C = 2 * Math.PI * 54;
  const arcos = Object.entries(formas).map(([f, v]) => { const frac = v / tot7, s = `<circle cx="75" cy="75" r="54" fill="none" stroke="${coresF[f]}" stroke-width="26" stroke-dasharray="${frac * C} ${C}" stroke-dashoffset="${-acc * C}" transform="rotate(-90 75 75)"/>`; acc += frac; return s; }).join('');
  const top = db.produtos.map((p) => ({ p, q: vend[p.id] || 0, v: (vend[p.id] || 0) * p.preco })).sort((a, b) => b.v - a.v).slice(0, 6), maxV = top[0]?.v || 1;
  const porCat = CATS.map((c) => { let v = 0, l = 0; db.vendas.forEach((x) => x.itens.forEach((i) => { if (prod(i.id)?.cat === c) { v += i.qtd * i.preco; l += i.qtd * (i.preco - i.custo); } })); return { c, v, m: v ? l / v : 0 }; }).sort((a, b) => b.v - a.v);
  const parados = db.produtos.filter((p) => !vend[p.id] && p.estoque > 0);
  return `<div class="cab"><div><h1>Relatórios</h1><p>Os últimos 7 dias em uma página: o que vendeu, como pagaram e onde está o lucro.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-acao="meta">Meta do dia: ${R(db.metaDia)}</button><button class="btn navy" data-acao="planilha">Baixar planilha</button></div></div>
  <div class="etiquetas">
    <div class="etiqueta vinho"><span class="rot">Vendas em 7 dias</span><span class="val">${R(tot7)}</span><span class="det">${db.vendas.length} vendas</span></div>
    <div class="etiqueta"><span class="rot">Lucro bruto</span><span class="val">${R(luc7)}</span><span class="det">margem de ${tot7 ? Math.round(luc7 / tot7 * 100) : 0}%</span></div>
    <div class="etiqueta navy"><span class="rot">Ticket médio</span><span class="val">${R(tot7 / db.vendas.length)}</span><span class="det">por venda</span></div>
  </div>
  <div class="grade-2">
    <section class="bloco"><h2>Mais vendidos</h2><div class="barras-h">${top.map((t) => `<div class="l"><span>${esc(t.p.nome)}</span><span class="t"><i style="width:${t.v / maxV * 100}%"></i></span><b class="num" style="text-align:right">${Rk(t.v)}</b></div>`).join('')}</div></section>
    <section class="bloco"><h2>Como pagaram</h2><div class="rosca"><svg viewBox="0 0 150 150" aria-hidden="true">${arcos}</svg><ul class="legenda">${Object.entries(formas).sort((a, b) => b[1] - a[1]).map(([f, v]) => `<li><i style="background:${coresF[f]}"></i>${f} <b class="num">${Math.round(v / tot7 * 100)}%</b></li>`).join('')}</ul></div></section>
  </div>
  <div class="grade-2">
    <section class="bloco"><h2>Lucro por categoria</h2><div class="tabela-caixa"><table><thead><tr><th>Categoria</th><th class="n">Vendido</th><th class="n">Margem</th></tr></thead><tbody>${porCat.map((x) => `<tr><td>${x.c}</td><td class="n">${R(x.v)}</td><td class="n">${Math.round(x.m * 100)}%</td></tr>`).join('')}</tbody></table></div></section>
    <section class="bloco"><h2>Por vendedor <span class="dica">· comissão de ${String(db.comissao).replace('.', ',')}% <button class="btn peq fant" data-acao="comissao" style="min-height:26px;padding:0 8px">mudar</button></span></h2><div class="tabela-caixa"><table><thead><tr><th>Vendedor</th><th class="n">Vendas</th><th class="n">Vendido</th><th class="n">Comissão</th></tr></thead><tbody>${VENDEDORES.map((n) => { const l = db.vendas.filter((v) => v.vendedor === n), t = soma(l, (v) => v.total); return `<tr><td>${esc(n)}</td><td class="n">${l.length}</td><td class="n">${R(t)}</td><td class="n">${R(t * db.comissao / 100)}</td></tr>`; }).join('')}</tbody></table></div></section>
    <section class="bloco"><h2>Parados na prateleira</h2>${parados.length ? `<ul class="lista">${parados.map((p) => `<li><div class="cresce"><b>${esc(p.nome)}</b><span>${p.estoque} un. · ${R(p.estoque * p.custo)} empatados</span></div><span class="selo alerta">sem venda</span></li>`).join('')}</ul>` : '<p class="vazio">Todos os produtos venderam nesta semana.</p>'}</section>
  </div>${db.ajustes.length || db.devolucoes.length ? `<div class="grade-2">${db.ajustes.length ? `<section class="bloco"><h2>Perdas e ajustes</h2><ul class="lista">${db.ajustes.slice(-6).reverse().map((x) => `<li><div class="cresce"><b>${x.qtd > 0 ? '+' : ''}${x.qtd} ${esc(prod(x.id)?.nome || '')}</b><span>${esc(x.motivo)} · ${x.dia === 0 ? 'hoje' : diaTxt(x.dia)}</span></div><b class="dir">${R(x.valor)}</b></li>`).join('')}</ul></section>` : ''}${db.devolucoes.length ? `<section class="bloco"><h2>Trocas e devoluções</h2><ul class="lista">${db.devolucoes.slice(-6).reverse().map((d) => `<li><div class="cresce"><b>Venda ${d.n}</b><span>${esc(d.itens)} · ${esc(d.como)}</span></div><b class="dir">${R(d.valor)}</b></li>`).join('')}</ul></section>` : ''}</div>` : ''}`;
}

function telaDono() { return `<div class="cab"><div><h1>Painel do dono</h1><p>Equipe, cargos, o que cada pessoa pode ver e o seu plano. Só você e os administradores veem esta parte.</p></div></div><div id="gc-dono"></div>`; }
const DONO = { sistema: 'Veltria Gestão Completo', preco: 119, chave: CHAVE, empresa: 'Casa Aurora', dono: 'Helena Prado',
  areas: [['vender', 'Vender'], ['produtos', 'Produtos e estoque'], ['clientes', 'Clientes e fiado'], ['contas', 'Contas'], ['relatorios', 'Relatórios']],
  cargos: { Vendedor: { vender: 'editar', produtos: 'ver', clientes: 'editar', contas: 'nenhum', relatorios: 'nenhum' }, Estoquista: { vender: 'nenhum', produtos: 'editar', clientes: 'nenhum', contas: 'nenhum', relatorios: 'ver' }, Financeiro: { vender: 'ver', produtos: 'ver', clientes: 'ver', contas: 'editar', relatorios: 'editar' }, Gerente: { vender: 'editar', produtos: 'editar', clientes: 'editar', contas: 'editar', relatorios: 'editar' } },
  equipe: [['Rafael Prado', 'Gerente'], ['Bianca Souza', 'Vendedor'], ['Tiago Lemos', 'Estoquista']] };
function ia() {
  abrirIA({ sistema: 'Veltria Gestão Completo', telas: PARTES.map((p) => p[1]),
    numeros: () => [['vendido hoje', R(totalDia(0))], ['lucro de hoje', R(lucroDia(0))], ['dinheiro na gaveta', R(noCaixa())], ['a receber', R(aReceber())]],
    alertas: () => [...acabando().slice(0, 3).map((p) => `${p.nome} está acabando (tem ${p.estoque})`), ...pagarAte(3).map((k) => `pagar ${k.nome} (${R(k.valor)})`), ...db.clientes.filter((c) => c.limite && c.deve / c.limite > .8).map((c) => `${c.nome} usou quase todo o limite de fiado`)] });
}
const TELAS = { dono: telaDono, painel: telaPainel, vender: telaVender, produtos: telaProdutos, clientes: telaClientes, contas: telaContas, relatorios: telaRelatorios };
function desenhar() {
  const nome = (PARTES.find((p) => p[0] === parte) || SUB.find((p) => p[0] === parte) || ['', 'Mais'])[1];
  document.title = `${nome} · Veltria Gestão Completo`;
  $('#tela').innerHTML = TELAS[parte]();
  if (parte === 'dono') painelDono($('#gc-dono'), DONO);
  const badges = { produtos: acabando().length, contas: pagarAte(3).length, vender: db.cupom.length };
  $('#doca').innerHTML = PARTES.map(([id, n]) => `<a href="#${id}" ${id === (SUBK.has(parte) ? 'extras' : parte) ? 'aria-current="page"' : ''}>${ic[id]}<span>${n}</span>${badges[id] ? `<i>${badges[id]}</i>` : ''}</a>`).join('');
}
function ir(p) { if (!TELAS[p]) p = 'painel'; if ($('#gaveta').classList.contains('aberta')) fecharGaveta(); parte = p; filtroCat = ''; if (location.hash !== `#${p}`) history.replaceState(null, '', `#${p}`); desenhar(); window.scrollTo(0, 0); $('#tela').focus({ preventScroll: true }); }
window.addEventListener('hashchange', () => ir(location.hash.slice(1)));

// ---------------------------------------------------------------- gavetas
function gavetaProduto(id) {
  const p = id ? prod(id) : { nome: '', cat: CATS[0], custo: '', preco: '', estoque: 0, minimo: 5, cod: '' };
  gaveta(id ? 'Editar produto' : 'Novo produto', `<form class="form" id="f">
    <label>Nome do produto<input class="campo" name="nome" required value="${esc(p.nome)}" placeholder="Ex.: Jarra de vidro 1,5 L"></label>
    <label>Categoria<select class="campo" name="cat">${CATS.map((c) => `<option ${p.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <div class="dupla"><label>Custo (R$)<input class="campo" name="custo" inputmode="decimal" value="${p.custo}" required></label><label>Preço de venda (R$)<input class="campo" name="preco" inputmode="decimal" value="${p.preco}" required></label></div>
    <p class="dica" id="margem"></p>
    <div class="dupla"><label>Em estoque<input class="campo" name="estoque" type="number" min="0" value="${p.estoque}"></label><label>Avisar quando chegar a<input class="campo" name="minimo" type="number" min="0" value="${p.minimo}"></label></div>
    <label>Código de barras <span class="dica">(opcional)</span><input class="campo" name="cod" inputmode="numeric" value="${esc(p.cod)}"></label>
    <div class="dupla"><label>Preço de promoção (R$) <span class="dica">vazio = sem promoção</span><input class="campo" name="promo" inputmode="decimal" value="${p.promo && p.promo.ate >= 0 ? p.promo.preco : ''}"></label><label>Promoção por (dias)<input class="campo" name="promoDias" type="number" min="1" max="90" value="${p.promo && p.promo.ate >= 0 ? p.promo.ate : 7}"></label></div>
    ${id ? `<button type="button" class="btn peq fant" data-acao="ajuste" data-id="${id}">Ajustar estoque (perda, quebra, sobra)</button>` : ''}
    <p class="erro" id="erro" hidden></p></form>`,
  `<button class="btn fant" data-acao="fechar">Cancelar</button><button class="btn vinho" data-acao="confirmar">${id ? 'Salvar' : 'Cadastrar produto'}</button>`, () => {
    const f = new FormData($('#f')), num = (k) => Number(String(f.get(k)).replace(',', '.'));
    const nome = String(f.get('nome')).trim(), custo = num('custo'), preco = num('preco');
    if (!nome || !(preco > 0) || !(custo >= 0)) { const e = $('#erro'); e.hidden = false; e.textContent = 'Preencha o nome, o custo e o preço de venda.'; return false; }
    const pr = String(f.get('promo')).trim() ? num('promo') : 0; if (pr && !(pr > 0 && pr < preco)) { const e = $('#erro'); e.hidden = false; e.textContent = 'A promoção precisa ser menor que o preço normal.'; return false; } if (pr && pr < custo && !confirm('A promoção fica abaixo do custo. Salvar assim mesmo?')) return false;
    const dados = { nome, cat: f.get('cat'), custo, preco, estoque: Math.max(0, num('estoque') || 0), minimo: Math.max(0, num('minimo') || 0), cod: String(f.get('cod')).trim(), promo: pr ? { preco: pr, ate: Math.max(1, Math.round(num('promoDias')) || 7) } : null };
    if (id) Object.assign(prod(id), dados); else db.produtos.unshift({ id: `p${Date.now()}`, ...dados });
    avisar(id ? 'Produto salvo.' : 'Produto cadastrado.'); return true;
  });
  const calc = () => { const f = new FormData($('#f')), c = Number(String(f.get('custo')).replace(',', '.')), v = Number(String(f.get('preco')).replace(',', '.')); $('#margem').textContent = c > 0 && v > 0 ? `Lucro de ${R(v - c)} por unidade (margem de ${Math.round((v - c) / v * 100)}%).` : 'Coloque o custo e o preço para ver o lucro de cada unidade.'; };
  $('#f').addEventListener('input', calc); calc();
}
function gavetaEntrada(id) {
  gaveta('Chegou mercadoria', `<form class="form" id="f"><p class="dica" style="margin:0">Some no estoque o que chegou do fornecedor. Se veio com preço novo, atualize o custo.</p>
    <label>Produto<select class="campo" name="id">${db.produtos.map((p) => `<option value="${p.id}" ${p.id === id ? 'selected' : ''}>${esc(p.nome)} (tem ${p.estoque})</option>`).join('')}</select></label>
    <div class="dupla"><label>Quantidade que chegou<input class="campo" name="qtd" type="number" min="1" value="${id ? Math.max(1, prod(id).minimo * 2 - prod(id).estoque) : 1}" required></label><label>Custo unitário (R$)<input class="campo" name="custo" inputmode="decimal" value="${id ? prod(id).custo : ''}"></label></div>
    <label><span><input type="checkbox" name="boleto"> Lançar o pagamento ao fornecedor em Contas</span></label><p class="erro" id="erro" hidden></p></form>`,
  `<button class="btn fant" data-acao="fechar">Cancelar</button><button class="btn vinho" data-acao="confirmar">Somar ao estoque</button>`, () => {
    const f = new FormData($('#f')), p = prod(f.get('id')), qtd = Math.floor(Number(f.get('qtd'))), custo = Number(String(f.get('custo')).replace(',', '.'));
    if (!(qtd > 0)) { const e = $('#erro'); e.hidden = false; e.textContent = 'Coloque quantas unidades chegaram.'; return false; }
    p.estoque += qtd; if (custo > 0) p.custo = custo;
    if (f.get('boleto')) db.contas.push({ id: `k${Date.now()}`, tipo: 'pagar', nome: `Compra: ${qtd}× ${p.nome}`, valor: qtd * p.custo, vence: 28, pago: false, cat: 'Fornecedor' });
    avisar(`${qtd} un. somadas. ${p.nome} agora tem ${p.estoque}.`); return true;
  });
}
function gavetaCliente(id) {
  if (id) {
    const c = cli(id), hist = db.vendas.filter((v) => v.cliente === id).sort((a, b) => b.dia - a.dia || b.hora.localeCompare(a.hora));
    gaveta(esc(c.nome), `<div class="etiquetas" style="grid-template-columns:1fr 1fr"><div class="etiqueta vinho"><span class="rot">Deve</span><span class="val">${R(c.deve)}</span></div><div class="etiqueta"><span class="rot">Limite de fiado</span><span class="val">${R(c.limite)}</span></div></div>
      <p>${esc(c.tel)}</p>${(c.pagos || []).length ? `<h2>Pagamentos do fiado</h2><ul class="lista">${c.pagos.slice(-5).reverse().map((p) => `<li><div class="cresce"><b>${R(p.v)}</b><span>${p.dia === 0 ? 'hoje' : diaTxt(p.dia)} · ${esc(p.forma)}</span></div></li>`).join('')}</ul>` : ''}<h2>Compras recentes</h2>${hist.length ? `<ul class="lista">${hist.slice(0, 8).map((v) => `<li><div class="cresce"><b>${esc(v.itens.map((x) => `${x.qtd}× ${x.nome}`).join(', '))}</b><span>${v.dia === 0 ? 'hoje' : diaTxt(v.dia)} · ${v.forma}</span></div><b class="dir">${R(v.total)}</b></li>`).join('')}</ul>` : '<p class="vazio">Sem compras nesta semana.</p>'}`,
    (c.credito ? `<span class="selo ok">crédito de troca ${R(c.credito)}</span>` : '') + (c.deve ? `<a class="btn" href="https://wa.me/55${c.tel.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, ${c.nome.split(' ')[0]}! Passando para lembrar do saldo de ${R(c.deve)} na Casa Aurora. Pode pagar por Pix quando puder. Obrigado!`)}" target="_blank" rel="noopener">Lembrar no WhatsApp</a><button class="btn vinho" data-acao="receber-fiado" data-id="${c.id}">Receber</button>` : '<button class="btn" data-acao="fechar">Fechar</button>'));
    return;
  }
  gaveta('Novo cliente', `<form class="form" id="f"><label>Nome<input class="campo" name="nome" required placeholder="Ex.: Ana Lúcia"></label><label>WhatsApp<input class="campo" name="tel" inputmode="tel" placeholder="(11) 90000-0000"></label><label>Limite de fiado (R$) <span class="dica">deixe 0 para não vender fiado</span><input class="campo" name="limite" inputmode="decimal" value="500"></label><p class="erro" id="erro" hidden></p></form>`,
    `<button class="btn fant" data-acao="fechar">Cancelar</button><button class="btn vinho" data-acao="confirmar">Cadastrar cliente</button>`, () => {
      const f = new FormData($('#f')), nome = String(f.get('nome')).trim();
      if (!nome) { const e = $('#erro'); e.hidden = false; e.textContent = 'Coloque o nome do cliente.'; return false; }
      db.clientes.push({ id: `c${Date.now()}`, nome, tel: String(f.get('tel')).trim(), deve: 0, limite: Number(String(f.get('limite')).replace(',', '.')) || 0, compras: 0 });
      avisar('Cliente cadastrado.'); return true;
    });
}
function gavetaConta(id) {
  const k = db.contas.find((x) => x.id === id);
  gaveta(esc(k.nome), `<div class="etiquetas" style="grid-template-columns:1fr"><div class="etiqueta ${k.tipo === 'pagar' ? 'vinho' : 'navy'}"><span class="rot">${k.tipo === 'pagar' ? 'A pagar' : 'A receber'} · ${k.cat}</span><span class="val">${R(k.valor)}</span><span class="det">${k.vence < 0 ? `venceu dia ${diaTxt(k.vence)}` : `vence dia ${diaTxt(k.vence)}`}</span></div></div>`,
    `<button class="btn fant" data-acao="fechar">Depois</button><button class="btn vinho" data-acao="confirmar">${k.tipo === 'pagar' ? 'Marcar como paga' : 'Marcar como recebida'}</button>`, () => { k.pago = true; avisar('Conta baixada.'); return true; });
}
function gavetaNovaConta() {
  gaveta('Nova conta', `<form class="form" id="f"><label>Tipo<select class="campo" name="tipo"><option value="pagar" ${abaContas === 'pagar' ? 'selected' : ''}>A pagar</option><option value="receber" ${abaContas === 'receber' ? 'selected' : ''}>A receber</option></select></label>
    <label>Descrição<input class="campo" name="nome" required placeholder="Ex.: Boleto do fornecedor"></label><div class="dupla"><label>Valor (R$)<input class="campo" name="valor" inputmode="decimal" required></label><label>Vence em (dias)<input class="campo" name="vence" type="number" value="7"></label></div>
    <label>Categoria<select class="campo" name="cat"><option>Fornecedor</option><option>Aluguel</option><option>Contas da casa</option><option>Funcionários</option><option>Impostos</option><option>Pedido</option><option>Outros</option></select></label><p class="erro" id="erro" hidden></p></form>`,
  `<button class="btn fant" data-acao="fechar">Cancelar</button><button class="btn vinho" data-acao="confirmar">Lançar conta</button>`, () => {
    const f = new FormData($('#f')), valor = Number(String(f.get('valor')).replace(',', '.')), nome = String(f.get('nome')).trim();
    if (!nome || !(valor > 0)) { const e = $('#erro'); e.hidden = false; e.textContent = 'Coloque a descrição e o valor.'; return false; }
    db.contas.push({ id: `k${Date.now()}`, tipo: f.get('tipo'), nome, valor, vence: Number(f.get('vence')) || 0, pago: false, cat: f.get('cat') });
    abaContas = f.get('tipo'); avisar('Conta lançada.'); return true;
  });
}
function gavetaVenda(n) {
  const v = db.vendas.find((x) => x.n === n);
  gaveta(`Venda ${v.n}`, recibo(v), `<button class="btn" data-acao="fechar">Fechar</button>${v.itens.some((x) => x.qtd - (x.dev || 0) > 0) ? `<button class="btn vinho" data-acao="devolver" data-n="${v.n}">Troca ou devolução</button>` : ''}`);
}
const recibo = (v) => `<div class="recibo"><h3>Casa Aurora Utilidades</h3><p style="text-align:center;margin:0 0 10px;color:var(--tinta-3)">Venda ${v.n} · ${v.dia === 0 ? 'hoje' : diaTxt(v.dia)} às ${v.hora}</p>${v.itens.map((x) => `<div class="linha-tot"><span>${x.qtd}× ${esc(x.nome)}</span><span>${R(x.qtd * x.preco)}</span></div>`).join('')}${v.desconto ? `<div class="linha-tot"><span>Desconto</span><span>− ${R(v.desconto)}</span></div>` : ''}<hr style="border:0;border-top:1px dashed var(--camelo)"><div class="linha-tot grande"><span>Total</span><span>${R(v.total)}</span></div><p style="margin:8px 0 0;color:var(--tinta-2)">Pago no ${v.forma}${v.cliente ? ` · ${esc(cli(v.cliente)?.nome)}` : ''}${v.troco ? ` · troco ${R(v.troco)}` : ''}${v.vendedor ? ` · vendeu ${esc(v.vendedor)}` : ''}</p>${v.itens.some((x) => x.dev) ? `<p style="margin:6px 0 0;color:var(--vinho)">Devolvido: ${v.itens.filter((x) => x.dev).map((x) => `${x.dev}× ${esc(x.nome)}`).join(', ')}</p>` : ''}</div>`;

function fecharVenda() {
  const sub = db.cupom.reduce((t, x) => t + x.qtd * pv(prod(x.id)), 0), desc = Math.min(db.desconto || 0, sub), total = sub - desc;
  const c = db.cliente ? cli(db.cliente) : null;
  if (db.forma === 'Crédito') { if (!c || !(c.credito >= total)) { avisar(`Crédito de troca insuficiente${c ? ` (tem ${R(c.credito || 0)})` : ''}.`); return; } c.credito = Math.round((c.credito - total) * 100) / 100; }
  if (db.forma === 'Fiado') {
    if (!c) { avisar('Escolha o cliente do fiado.'); $('#pdv-cliente')?.focus(); return; }
    if (c.limite && c.deve + total > c.limite) { avisar(`Passa do limite de ${c.nome.split(' ')[0]} (${R(c.limite)}).`); return; }
  }
  const concluir = (troco = 0) => {
    const v = { n: db.proxVenda++, dia: 0, hora: new Date().toTimeString().slice(0, 5), itens: db.cupom.map((x) => { const p = prod(x.id); return { id: p.id, nome: p.nome, qtd: x.qtd, preco: pv(p), custo: p.custo }; }), total, desconto: desc, forma: db.forma, cliente: db.cliente, troco, vendedor: db.vendedor };
    v.itens.forEach((x) => { prod(x.id).estoque -= x.qtd; });
    if (db.forma === 'Fiado') c.deve += total;
    if (c) { c.compras++; c.ultima = 0; if (db.cashback && db.forma !== 'Crédito') c.credito = Math.round(((c.credito || 0) + total * db.cashback / 100) * 100) / 100; }
    db.vendas.push(v); db.cupom = []; db.desconto = 0; db.cliente = ''; db.forma = 'Pix'; gravar(); desenhar();
    gaveta('Venda fechada', recibo(v), `<button class="btn" data-acao="fechar">Fechar</button><button class="btn vinho" data-acao="fechar" data-depois="vender">Nova venda</button>`);
  };
  if (db.forma === 'Dinheiro') {
    gaveta('Pagamento em dinheiro', `<form class="form" id="f"><p style="margin:0;font:700 1.6rem var(--titulo)">Total ${R(total)}</p><label>Quanto o cliente deu (R$)<input class="campo" name="deu" inputmode="decimal" value="${Math.ceil(total / 10) * 10}"></label><p class="dica" id="troco"></p></form>`,
      `<button class="btn fant" data-acao="fechar">Voltar</button><button class="btn vinho" data-acao="confirmar">Confirmar</button>`, () => {
        const deu = Number(String(new FormData($('#f')).get('deu')).replace(',', '.')) || total;
        if (deu < total) { avisar('O valor é menor que o total.'); return false; }
        setTimeout(() => concluir(deu - total), 280); return true;
      });
    const t = () => { const deu = Number(String(new FormData($('#f')).get('deu')).replace(',', '.')); $('#troco').textContent = deu >= total ? `Troco: ${R(deu - total)}` : 'Falta dinheiro para fechar.'; };
    $('#f').addEventListener('input', t); t();
    return;
  }
  concluir();
}

// ---------------------------------------------------------------- funções de 10/2026 (2ª leva)
ic.extras = '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>';
PARTES.splice(PARTES.findIndex((p) => p[0] === 'dono'), 0, ['extras', 'Mais']);
const SUB = [['presentes', 'Listas de presente', 'casamento e chá de cozinha'], ['encomendas', 'Encomendas', 'com sinal e aviso'], ['carne', 'Carnê', 'crediário em parcelas'], ['cobranca', 'Cobrar atrasados', 'fiado e carnê vencidos'], ['cashback', 'Cashback', 'parte da compra volta como crédito'], ['aniversarios', 'Aniversariantes', 'cupom do mês'], ['sumidos', 'Clientes sumidos', 'sem comprar há 60 dias'], ['cobertura', 'Cobertura do estoque', 'quantos dias dura cada produto'], ['pedidos', 'Pedido ao fornecedor', 'pelo giro de cada item'], ['precos', 'Formação de preço', 'markup por categoria'], ['inventario', 'Inventário', 'contagem por categoria'], ['avarias', 'Avarias', 'devolver ao fornecedor'], ['abc', 'Curva ABC', 'o que não pode faltar'], ['kits', 'Kits e combos', 'venda casada com desconto'], ['catalogo', 'Catálogo no WhatsApp', 'lista de preços pronta'], ['campanhas', 'Campanhas de promoção', 'por categoria e data'], ['metasv', 'Metas por vendedor', 'semana a semana'], ['horarios', 'Melhores dias e horários', 'quando a loja vende'], ['resultado', 'Resultado do mês', 'lucro e ponto de equilíbrio'], ['caixa30', 'Caixa de 30 dias', 'o que entra e sai']];
const SUBK = new Set(SUB.map((s) => s[0]));
const media7 = () => { const m = vendidosQtd(); return Object.fromEntries(db.produtos.map((p) => [p.id, (m[p.id] || 0) / 7])); };
const fone = (t) => String(t || '').replace(/\D/g, '');
const wa = (tel, txt) => `https://wa.me/55${fone(tel)}?text=${encodeURIComponent(txt)}`;
const precoBonito = (v) => Math.max(0.9, Math.ceil(v) - 0.1);
let invCat = 'Cozinha', catCatalogo = 'Cozinha', contagem = {};
Object.assign(db, { listas: db.listas || [], encomendas: db.encomendas || [], carnes: db.carnes || [], cobrados: db.cobrados || {}, cashback: db.cashback ?? 0, avarias: db.avarias || [], kits: db.kits || [], campanhas: db.campanhas || [], pedidosForn: db.pedidosForn || [], markup: db.markup || { Cozinha: 80, Mesa: 90, Limpeza: 100, Organização: 110, Decoração: 120 }, metaVend: db.metaVend || {}, fixas: db.fixas || [], saldoBanco: db.saldoBanco ?? 0 });
const voltar = '<a href="#extras" class="btn fant peq" data-acao="ir" data-v="extras" style="margin-bottom:10px">← Mais</a>';
const cab = (t, p, b = '') => `${voltar}<div class="cab"><div><h1>${t}</h1><p>${p}</p></div>${b}</div>`;
const lista = (l, vazio) => `<section class="bloco"><ul class="lista">${l.join('') || `<li><span class="dica">${vazio}</span></li>`}</ul></section>`;
const tabela = (cabs, l, vazio) => `<section class="bloco"><div class="tabela-caixa"><table><thead><tr>${cabs.map((c) => (c.startsWith('$') ? `<th class="n">${c.slice(1)}</th>` : `<th>${c}</th>`)).join('')}</tr></thead><tbody>${l.join('') || `<tr><td colspan="${cabs.length}" class="dica">${vazio}</td></tr>`}</tbody></table></div></section>`;
const etq = (l) => `<div class="etiquetas">${l.map(([r, v, d = '', c = '']) => `<div class="etiqueta ${c}"><span class="rot">${r}</span><span class="val">${v}</span><span class="det">${d}</span></div>`).join('')}</div>`;
const parcelasAtras = () => db.carnes.flatMap((k) => k.parcelas.filter((p) => !p.pago && p.vence < 0).map((p) => ({ k, p })));

Object.assign(TELAS, {
  extras: () => `<div class="cab"><div><h1>Mais ferramentas</h1><p>O que faz a loja vender mais e perder menos, além do caixa do dia.</p></div></div><div class="hub-g">${SUB.map(([k, t, d]) => { const n = { cobranca: db.clientes.filter((c) => c.deve > 0).length + parcelasAtras().length, encomendas: db.encomendas.filter((x) => x.st === 'chegou').length, aniversarios: db.clientes.filter((c) => c.nasc?.slice(0, 2) === String(new Date().getMonth() + 1).padStart(2, '0') && !c.cupom).length, avarias: db.avarias.filter((a) => a.st === 'separada').length }[k]; return `<button type="button" class="hub-c" data-acao="ir" data-v="${k}"><b>${t}</b><span>${d}</span>${n ? `<i>${n}</i>` : ''}</button>`; }).join('')}</div>`,
  presentes: () => cab('Listas de presente', 'O casal escolhe na loja, os convidados compram pela lista e ninguém dá presente repetido. A loja ainda vende para quem nunca entrou nela.', `<button class="btn vinho" data-acao="g-lista-nova">${ic.mais}Nova lista</button>`) + db.listas.map((l) => { const tot = soma(l.itens, (i) => i.qtd), feito = soma(l.itens, (i) => i.comprado); return `<section class="bloco"><h2>${esc(l.nome)} <span class="dica">· ${esc(l.evento)} em ${diaTxt(l.dia)} · ${feito} de ${tot} presentes</span></h2><ul class="lista">${l.itens.map((i, ix) => { const p = prod(i.id); return `<li><div class="cresce"><b>${esc(p?.nome || '')}</b><span>${R(pv(p))} · ${i.comprado}/${i.qtd}${i.por?.length ? ` · ${i.por.map(esc).join(', ')}` : ''}</span></div>${i.comprado < i.qtd ? `<button class="btn peq vinho" data-acao="g-presente" data-id="${l.id}" data-n="${ix}">Vender</button>` : '<span class="selo ok">completo</span>'}</li>`; }).join('')}</ul><div class="gp"><a class="btn peq" target="_blank" rel="noopener" href="${wa(l.tel, `Olá! A lista de ${l.nome} na Casa Aurora: ${l.itens.filter((i) => i.comprado < i.qtd).map((i) => prod(i.id)?.nome).join(', ')}. É só vir ou pedir pelo WhatsApp.`)}">Mandar a lista</a></div></section>`; }).join('') || lista([], 'Nenhuma lista.'),
  encomendas: () => cab('Encomendas', 'O cliente pediu o que não tem na loja: anote, cobre um sinal e avise quando chegar.', `<button class="btn vinho" data-acao="g-encomenda">${ic.mais}Encomenda</button>`) + lista(db.encomendas.map((x) => { const c = cli(x.cliente); return `<li><div class="cresce"><b>${esc(x.prod)}</b><span>${esc(c?.nome || '')} · ${R(x.valor)} · sinal ${R(x.sinal)} · ${x.st === 'pedida' ? `chega ${diaTxt(x.prazo)}` : x.st}</span></div>${x.st === 'pedida' ? `<button class="btn peq" data-acao="g-enc" data-id="${x.id}" data-v="chegou">Chegou</button>` : x.st === 'chegou' ? `<a class="btn peq vinho" target="_blank" rel="noopener" href="${wa(c?.tel, `Olá, ${c?.nome.split(' ')[0]}! Chegou ${x.prod}. Falta pagar ${R(x.valor - x.sinal)}. Separamos para você!`)}">Avisar</a> <button class="btn peq" data-acao="g-enc" data-id="${x.id}" data-v="entregue">Entregue</button>` : '<span class="selo ok">entregue</span>'}</li>`; }), 'Nenhuma encomenda.'),
  carne: () => cab('Carnê', 'Crediário em parcelas mensais, com juros combinado e o carnê para o cliente levar. Mais seguro que o fiado sem data.', `<button class="btn vinho" data-acao="g-carne">${ic.mais}Novo carnê</button>`) + db.carnes.map((k) => `<section class="bloco"><h2>${esc(cli(k.cliente)?.nome || '')} <span class="dica">· ${R(k.total)} em ${k.parcelas.length}x</span></h2><ul class="lista">${k.parcelas.map((p, i) => `<li><span class="av" style="background:${p.pago ? 'var(--prata)' : p.vence < 0 ? 'var(--vinho)' : 'var(--navy)'}">${i + 1}</span><div class="cresce"><b>${R(p.valor)}</b><span>${p.pago ? 'paga' : p.vence < 0 ? `venceu ${diaTxt(p.vence)}` : `vence ${diaTxt(p.vence)}`}</span></div>${p.pago ? '<span class="selo ok">paga</span>' : `<button class="btn peq" data-acao="g-parcela" data-id="${k.id}" data-n="${i}">Recebi</button>`}</li>`).join('')}</ul></section>`).join('') || lista([], 'Nenhum carnê.'),
  cobranca: () => { const f = db.clientes.filter((c) => c.deve > 0), pa = parcelasAtras(); return cab('Cobrar atrasados', 'Fiado em aberto e parcela de carnê vencida, com a mensagem pronta. Cobrar cedo e com educação recebe mais.') + etq([['Fiado em aberto', R(soma(f, (c) => c.deve)), `${f.length} cliente(s)`, 'vinho'], ['Carnê vencido', R(soma(pa, (x) => x.p.valor)), `${pa.length} parcela(s)`]]) + lista([...f.map((c) => `<li><div class="cresce"><b>${esc(c.nome)}</b><span>fiado ${R(c.deve)}${db.cobrados[c.id] === new Date().toLocaleDateString('pt-BR') ? ' · cobrado hoje' : ''}</span></div><a class="btn peq vinho" target="_blank" rel="noopener" data-cobrou="${c.id}" href="${wa(c.tel, `Olá, ${c.nome.split(' ')[0]}! Aqui é da Casa Aurora. Ficou em aberto ${R(c.deve)} no fiado. Pode passar no Pix quando der? Obrigada!`)}">Cobrar</a></li>`), ...pa.map(({ k, p }) => { const c = cli(k.cliente); return `<li><div class="cresce"><b>${esc(c?.nome || '')}</b><span>parcela de ${R(p.valor)} venceu ${diaTxt(p.vence)}</span></div><a class="btn peq vinho" target="_blank" rel="noopener" data-cobrou="${c?.id}" href="${wa(c?.tel, `Olá, ${c?.nome.split(' ')[0]}! A parcela de ${R(p.valor)} do carnê venceu ${diaTxt(p.vence)}. Pode passar no Pix? Obrigada!`)}">Cobrar</a></li>`; })], 'Ninguém atrasado.'); },
  cashback: () => { const c = db.clientes.filter((x) => x.credito > 0); return cab('Cashback', 'Uma parte de cada compra volta como crédito para a próxima. O cliente identificado volta mais e você sabe quem ele é.') + etq([['Cashback', `${String(db.cashback).replace('.', ',')}%`, db.cashback ? 'de cada compra com cliente' : 'desligado', 'navy'], ['Crédito na mão dos clientes', R(soma(c, (x) => x.credito)), `${c.length} cliente(s)`]]) + `<section class="bloco"><form class="form" style="max-width:320px"><label>Porcentagem que volta (0 desliga)<input class="campo" data-cashback inputmode="decimal" value="${String(db.cashback).replace('.', ',')}"></label></form><p class="dica">Vale para venda com cliente escolhido, menos as pagas com o próprio crédito. O cliente usa escolhendo "Crédito" no caixa.</p></section>` + lista(c.map((x) => `<li><div class="cresce"><b>${esc(x.nome)}</b><span>${x.compras} compras</span></div><b class="num">${R(x.credito)}</b></li>`), 'Ninguém com crédito ainda.'); },
  aniversarios: () => { const mm = String(new Date().getMonth() + 1).padStart(2, '0'), l = db.clientes.filter((c) => c.nasc?.slice(0, 2) === mm).sort((a, b) => a.nasc.localeCompare(b.nasc)); return cab('Aniversariantes do mês', 'Um cupom de 10% no mês do aniversário faz o cliente voltar e trazer alguém junto.') + lista(l.map((c) => `<li><div class="cresce"><b>${esc(c.nome)}</b><span>dia ${c.nasc.slice(3)}</span></div>${c.cupom ? '<span class="selo ok">cupom enviado</span>' : `<a class="btn peq vinho" target="_blank" rel="noopener" data-cupom="${c.id}" href="${wa(c.tel, `Feliz aniversário, ${c.nome.split(' ')[0]}! A Casa Aurora separou 10% de desconto para você neste mês. É só falar o seu nome no caixa.`)}">Mandar cupom</a>`}</li>`), 'Ninguém faz aniversário este mês (cadastre a data no cliente).'); },
  sumidos: () => { const l = db.clientes.filter((c) => (c.ultima ?? 0) <= -60).sort((a, b) => a.ultima - b.ultima); return cab('Clientes sumidos', 'Quem comprava e parou há mais de 60 dias. Uma mensagem com uma novidade da categoria que ele comprava traz de volta.') + lista(l.map((c) => `<li><div class="cresce"><b>${esc(c.nome)}</b><span>última compra ${diaTxt(c.ultima)} · ${c.compras} compras</span></div><a class="btn peq vinho" target="_blank" rel="noopener" href="${wa(c.tel, `Olá, ${c.nome.split(' ')[0]}! Faz tempo que você não passa na Casa Aurora: chegaram novidades e separei um desconto de 10% para você esta semana.`)}">Chamar de volta</a></li>`), 'Nenhum cliente sumido.'); },
  cobertura: () => { const m = media7(), l = db.produtos.map((p) => ({ p, md: m[p.id], dias: m[p.id] ? p.estoque / m[p.id] : null, sug: Math.max(0, Math.ceil(m[p.id] * 30) - p.estoque) })).sort((a, b) => (a.dias ?? 1e9) - (b.dias ?? 1e9)); return cab('Cobertura do estoque', 'Quantos dias cada produto dura no ritmo da última semana. Menos de 7 dias: compre já. Mais de 90: dinheiro parado.') + tabela(['Produto', '$Tem', '$Vende por dia', '$Dura', '$Comprar para 30 dias'], l.map((x) => `<tr><td>${esc(x.p.nome)}</td><td class="n">${x.p.estoque}</td><td class="n">${x.md.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</td><td class="n">${x.dias === null ? '<span class="selo alerta">sem venda</span>' : x.dias < 7 ? `<span class="selo vinho">${Math.floor(x.dias)} dias</span>` : x.dias > 90 ? `<span class="selo alerta">${Math.round(x.dias)} dias</span>` : `${Math.round(x.dias)} dias`}</td><td class="n">${x.sug || ''}</td></tr>`), ''); },
  pedidos: () => { const m = media7(); return cab('Pedido ao fornecedor', 'Para cada fornecedor, o que comprar para 15 dias (compra quinzenal) pelo giro da última semana. O pedido sai pronto para o WhatsApp do vendedor.') + db.fornecedores.map((f) => { const l = db.produtos.filter((p) => f.cats.includes(p.cat)).map((p) => ({ p, q: Math.max(0, Math.ceil(m[p.id] * 15) - p.estoque, p.estoque <= p.minimo ? p.minimo * 2 - p.estoque : 0) })).filter((x) => x.q > 0), tot = soma(l, (x) => x.q * x.p.custo); return `<section class="bloco"><h2>${esc(f.nome)} <span class="dica">· ${f.cats.join(', ')}</span></h2>${l.length ? `<ul class="lista">${l.map((x) => `<li><div class="cresce"><b>${esc(x.p.nome)}</b><span>tem ${x.p.estoque}</span></div><b class="num">${x.q} un.</b></li>`).join('')}</ul><div class="gp"><b class="num">${R(tot)}</b><a class="btn peq vinho" target="_blank" rel="noopener" data-pedido="${f.id}" href="${wa(f.tel, `Pedido da Casa Aurora:\n${l.map((x) => `• ${x.q} un. ${x.p.nome}`).join('\n')}\nPode confirmar o prazo?`)}">Mandar pedido</a></div>` : '<p class="dica">Nada para comprar.</p>'}</section>`; }).join('') + (db.pedidosForn.length ? lista(db.pedidosForn.slice(-5).reverse().map((x) => `<li><div class="cresce"><b>${esc(x.forn)}</b><span>${x.itens} item(ns) · ${diaTxt(x.dia)}</span></div><b class="num">${R(x.total)}</b></li>`), '') : ''); },
  precos: () => cab('Formação de preço', 'Preço sugerido = custo + markup da categoria, terminado em ,90. Compare com o preço de hoje e ajuste o que está deixando dinheiro na mesa.') + `<section class="bloco"><div class="mk">${CATS.map((c) => `<label>${c} (%)<input class="campo" data-markup="${c}" type="number" min="0" max="400" value="${db.markup[c]}"></label>`).join('')}</div></section>` + tabela(['Produto', '$Custo', '$Hoje', '$Sugerido', '$Margem sugerida', ''], db.produtos.map((p) => { const s = precoBonito(p.custo * (1 + db.markup[p.cat] / 100)); return `<tr><td>${esc(p.nome)}</td><td class="n">${R(p.custo)}</td><td class="n">${R(p.preco)}</td><td class="n">${R(s)}</td><td class="n">${Math.round((s - p.custo) / s * 100)}%</td><td>${Math.abs(s - p.preco) >= 0.5 ? `<button class="btn peq ${s > p.preco ? 'vinho' : ''}" data-acao="g-preco" data-id="${p.id}">Usar</button>` : ''}</td></tr>`; }), ''),
  inventario: () => { const l = db.produtos.filter((p) => p.cat === invCat); return cab('Inventário', 'Conte uma categoria por semana. A diferença entre o sistema e a prateleira entra como ajuste, com motivo, e aparece nos relatórios.') + `<div class="chips">${CATS.map((c) => `<button class="chip" data-acao="g-invcat" data-v="${c}" aria-pressed="${c === invCat}">${c}</button>`).join('')}</div>` + tabela(['Produto', '$No sistema', '$Contei', '$Diferença'], l.map((p) => { const c = contagem[p.id]; return `<tr><td>${esc(p.nome)}</td><td class="n">${p.estoque}</td><td class="n"><input class="campo cont" data-contei="${p.id}" type="number" min="0" value="${c ?? ''}" placeholder="${p.estoque}" aria-label="Contei ${esc(p.nome)}"></td><td class="n">${c == null ? '' : c - p.estoque ? `<span class="selo vinho">${c - p.estoque > 0 ? '+' : ''}${c - p.estoque}</span>` : '<span class="selo ok">bate</span>'}</td></tr>`; }), '') + `<div class="gp"><button class="btn vinho" data-acao="g-inventario">Lançar as diferenças</button></div>`; },
  avarias: () => cab('Avarias', 'Produto que chegou quebrado ou com defeito sai do estoque, fica separado e volta ao fornecedor para troca ou crédito.', `<button class="btn vinho" data-acao="g-avaria">${ic.mais}Avaria</button>`) + lista(db.avarias.slice().reverse().map((a) => `<li><div class="cresce"><b>${a.qtd} ${esc(prod(a.id)?.nome || '')}</b><span>${esc(a.forn)} · ${esc(a.motivo)} · ${R(a.qtd * (prod(a.id)?.custo || 0))}</span></div>${a.st === 'separada' ? `<button class="btn peq" data-acao="g-avaria-ok" data-id="${a.n}">Fornecedor trocou</button>` : '<span class="selo ok">trocada</span>'}</li>`), 'Nenhuma avaria.'),
  abc: () => { const m = vendidosQtd(), l = db.produtos.map((p) => ({ p, v: (m[p.id] || 0) * pv(p) })).sort((a, b) => b.v - a.v), tot = soma(l, (x) => x.v); let ac = 0; return cab('Curva ABC', 'Os produtos A fazem 80% do faturamento da semana: estes nunca podem faltar nem ficar mal expostos.') + tabela(['Produto', '$Vendido', '$%', 'Classe'], l.map((x) => { const antes = ac; ac += x.v; const cl = !tot || antes / tot < 0.8 ? 'A' : antes / tot < 0.95 ? 'B' : 'C'; return `<tr><td>${esc(x.p.nome)}</td><td class="n">${R(x.v)}</td><td class="n">${tot ? Math.round(x.v / tot * 100) : 0}%</td><td><span class="selo ${cl === 'A' ? 'vinho' : cl === 'B' ? 'alerta' : ''}">${cl}</span></td></tr>`; }), ''); },
  kits: () => cab('Kits e combos', 'Produtos que combinam vendidos juntos com um pequeno desconto: o ticket sobe e o estoque gira.', `<button class="btn vinho" data-acao="g-kit">${ic.mais}Novo kit</button>`) + lista(db.kits.map((k) => { const sub = soma(k.itens, (id) => pv(prod(id))); return `<li><div class="cresce"><b>${esc(k.nome)}</b><span>${k.itens.map((id) => esc(prod(id)?.nome || '')).join(' + ')} · de ${R(sub)} por ${R(sub * (1 - k.desc / 100))}</span></div><button class="btn peq vinho" data-acao="g-kit-caixa" data-id="${k.id}">Pôr no caixa</button></li>`; }), 'Nenhum kit.'),
  catalogo: () => { const l = db.produtos.filter((p) => p.cat === catCatalogo && p.estoque > 0), txt = `*Casa Aurora Utilidades* · ${catCatalogo}\n${l.map((p) => `• ${p.nome}: ${p.promo && p.promo.ate >= 0 ? `de ${R(p.preco)} por *${R(pv(p))}*` : R(p.preco)}`).join('\n')}\n\nPeça pelo WhatsApp e retire na loja.`; return cab('Catálogo no WhatsApp', 'A lista de preços de uma categoria pronta para mandar no status, em grupos ou para o cliente que perguntou.') + `<div class="chips">${CATS.map((c) => `<button class="chip" data-acao="g-catcat" data-v="${c}" aria-pressed="${c === catCatalogo}">${c}</button>`).join('')}</div><section class="bloco"><pre class="catalogo">${esc(txt)}</pre><div class="gp"><button class="btn" data-acao="g-copiar-cat">Copiar</button><a class="btn vinho" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">Abrir no WhatsApp</a></div></section>`; },
  campanhas: () => cab('Campanhas de promoção', 'Uma categoria inteira com desconto por alguns dias ("Semana da cozinha"). Ao ativar, todos os produtos da categoria entram em promoção até a data final.', `<button class="btn vinho" data-acao="g-campanha">${ic.mais}Campanha</button>`) + lista(db.campanhas.map((c) => `<li><div class="cresce"><b>${esc(c.nome)}</b><span>${c.cat} · ${c.pct}% até ${diaTxt(c.fim)}</span></div>${c.ativa ? '<span class="selo ok">ativa</span>' : `<button class="btn peq vinho" data-acao="g-campanha-on" data-id="${c.id}">Ativar agora</button>`}</li>`), 'Nenhuma campanha.'),
  metasv: () => cab('Metas por vendedor', 'Quanto cada pessoa vendeu nos últimos 7 dias contra a meta da semana. Combine o prêmio de quem passar.') + tabela(['Vendedor', '$Vendeu', '$Meta', '%', '$Ticket'], VENDEDORES.map((n) => { const l = db.vendas.filter((v) => v.vendedor === n), t = soma(l, (v) => v.total), m = db.metaVend[n] || 0; return `<tr><td>${esc(n)}</td><td class="n">${R(t)}</td><td class="n"><input class="campo cont" data-metav="${esc(n)}" inputmode="decimal" value="${m}" aria-label="Meta de ${esc(n)}"></td><td><div class="barras-h"><div class="l" style="grid-template-columns:1fr 50px"><span class="t"><i style="width:${m ? Math.min(100, t / m * 100) : 0}%"></i></span><b class="num">${m ? Math.round(t / m * 100) : 0}%</b></div></div></td><td class="n">${R(l.length ? t / l.length : 0)}</td></tr>`; }), ''),
  horarios: () => { const D = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'], H = [9, 10, 11, 12, 13, 14, 15, 16, 17], g = {}; db.vendas.forEach((v) => { const d = hoje0(); d.setDate(d.getDate() + v.dia); const k = `${d.getDay()}|${Number(v.hora.slice(0, 2))}`; g[k] = (g[k] || 0) + v.total; }); const mx = Math.max(1, ...Object.values(g)); return cab('Melhores dias e horários', 'Onde a loja vende na semana. Horário fraco é hora de arrumar vitrine e fazer pedido; horário forte pede mais gente no balcão.') + `<section class="bloco"><div class="mapa-h" style="grid-template-columns:40px repeat(${H.length},1fr)"><span></span>${H.map((h) => `<span class="dica">${h}h</span>`).join('')}${D.map((d, i) => `<span class="dica">${d}</span>${H.map((h) => { const v = g[`${i}|${h}`] || 0; return `<i style="--v:${(v / mx).toFixed(2)}" title="${d} ${h}h: ${R(v)}">${v ? Math.round(v / 100) / 10 : ''}</i>`; }).join('')}`).join('')}</div><p class="dica">Valores em mil reais, últimos 7 dias.</p></section>`; },
  resultado: () => { const tot7 = soma(db.vendas, (v) => v.total), luc7 = soma(db.vendas, (v) => lucroVenda(v)), fat = tot7 / 7 * 30, lucB = luc7 / 7 * 30, mg = tot7 ? luc7 / tot7 : 0, fx = soma(db.fixas, (f) => f.v), res = lucB - fx, pe = mg ? fx / mg : 0; return cab('Resultado do mês', 'Projeção do mês pelo ritmo da última semana: vendas, lucro bruto, despesas fixas e quanto sobra. O ponto de equilíbrio é o mínimo para não ter prejuízo.') + etq([['Vendas no mês', Rk(fat), 'projeção de 30 dias', 'vinho'], ['Lucro bruto', Rk(lucB), `margem de ${Math.round(mg * 100)}%`], ['Despesas fixas', Rk(fx), `${db.fixas.length} conta(s)`], ['Sobra', Rk(res), res < 0 ? 'prejuízo' : 'lucro do mês', res < 0 ? 'vinho' : 'navy'], ['Ponto de equilíbrio', Rk(pe), `${R(pe / 30)} por dia`]]) + lista(db.fixas.map((f, i) => `<li><div class="cresce"><b>${esc(f.nome)}</b></div><input class="campo cont" data-fixa="${i}" inputmode="decimal" value="${f.v}" aria-label="Valor de ${esc(f.nome)}"></li>`), ''); },
  caixa30: () => { const tot7 = soma(db.vendas.filter((v) => v.forma !== 'Fiado'), (v) => v.total), dia = tot7 / 7, semanas = [0, 1, 2, 3].map((s) => { const de = s * 7 + 1, ate = s * 7 + 7, rec = soma(db.contas.filter((k) => k.tipo === 'receber' && !k.pago && k.vence >= de - (s ? 0 : 99) && k.vence <= ate), (k) => k.valor) + soma(db.carnes.flatMap((k) => k.parcelas.filter((p) => !p.pago && p.vence >= de - (s ? 0 : 99) && p.vence <= ate)), (p) => p.valor), pag = soma(db.contas.filter((k) => k.tipo === 'pagar' && !k.pago && k.vence >= de - (s ? 0 : 99) && k.vence <= ate), (k) => k.valor); return { s, ent: dia * 7 + rec, sai: pag, rec }; }); let ac = db.saldoBanco + noCaixa(); const ini = ac; return cab('Caixa dos próximos 30 dias', 'Banco mais gaveta hoje, as vendas no ritmo da última semana (sem o fiado), o que tem para receber e as contas que vencem.') + etq([['Hoje', R(ini), 'banco + gaveta', 'navy']]) + tabela(['Semana', '$Vendas e recebimentos', '$Contas', '$Fica'], semanas.map((x) => { ac += x.ent - x.sai; return `<tr><td>${x.s + 1}ª semana</td><td class="n">${R(x.ent)}</td><td class="n">${R(x.sai)}</td><td class="n"><b ${ac < 0 ? 'style="color:var(--vinho)"' : ''}>${R(ac)}</b></td></tr>`; }), '') + `<section class="bloco"><form class="form" style="max-width:320px"><label>Saldo no banco hoje (R$)<input class="campo" data-saldob inputmode="decimal" value="${db.saldoBanco}"></label></form></section>`; },
});

// ações da 2ª leva (o despachante principal só conhece as ações dele)
const G = {
  'g-lista-nova': () => gaveta('Nova lista de presente', `<form class="form" id="f"><label>Nome (casal ou família)<input class="campo" name="n" required></label><div class="dupla"><label>Evento<input class="campo" name="e" value="Chá de cozinha"></label><label>Daqui a quantos dias<input class="campo" name="d" type="number" min="1" value="30"></label></div><label>WhatsApp<input class="campo" name="t" inputmode="tel"></label><label>Produtos (segure Ctrl para vários)<select class="campo" name="p" multiple size="6">${db.produtos.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select></label></form>`, `<button class="btn fant" data-acao="fechar">Cancelar</button><button class="btn vinho" data-acao="confirmar">Criar</button>`, () => { const f = new FormData($('#f')), ps = f.getAll('p'); if (!String(f.get('n')).trim() || !ps.length) { avisar('Nome e pelo menos um produto.'); return false; } db.listas.push({ id: `L${Date.now().toString(36)}`, nome: String(f.get('n')).trim(), evento: String(f.get('e')).trim(), dia: Number(f.get('d')) || 30, tel: fone(f.get('t')), itens: ps.map((id) => ({ id, qtd: 1, comprado: 0, por: [] })) }); return true; }),
  'g-presente': (a) => { const l = db.listas.find((x) => x.id === a.dataset.id), i = l.itens[Number(a.dataset.n)], p = prod(i.id); if (p.estoque < 1) { avisar(`Sem estoque de ${p.nome}.`); return; } gaveta(`Presente · ${esc(p.nome)}`, `<form class="form" id="f"><p style="margin:0">${esc(l.nome)} · ${R(pv(p))}</p><label>Quem está dando<input class="campo" name="q" required></label><label>Forma<select class="campo" name="f"><option>Pix</option><option>Cartão</option><option>Dinheiro</option></select></label></form>`, `<button class="btn fant" data-acao="fechar">Cancelar</button><button class="btn vinho" data-acao="confirmar">Vender</button>`, () => { const f = new FormData($('#f')), q = String(f.get('q')).trim(); if (!q) { avisar('Diga quem está dando.'); return false; } i.comprado++; (i.por ||= []).push(q); p.estoque--; db.vendas.push({ n: db.proxVenda++, dia: 0, hora: new Date().toTimeString().slice(0, 5), itens: [{ id: p.id, nome: p.nome, qtd: 1, preco: pv(p), custo: p.custo }], total: pv(p), desconto: 0, forma: f.get('f'), cliente: '', vendedor: db.vendedor, lista: l.id }); avisar(`Vendido para a lista de ${l.nome}.`); return true; }); },
  'g-encomenda': () => gaveta('Nova encomenda', `<form class="form" id="f"><label>Cliente<select class="campo" name="c" data-livre="clientes">${db.clientes.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select></label><label>Produto<input class="campo" name="p" required></label><div class="dupla"><label>Valor (R$)<input class="campo" name="v" inputmode="decimal" required></label><label>Sinal (R$)<input class="campo" name="s" inputmode="decimal" value="0"></label></div><label>Chega em (dias)<input class="campo" name="d" type="number" min="1" value="7"></label></form>`, `<button class="btn fant" data-acao="fechar">Cancelar</button><button class="btn vinho" data-acao="confirmar">Salvar</button>`, () => { const f = new FormData($('#f')), v = n2(f.get('v')), s = n2(f.get('s')) || 0; if (!(v > 0) || !String(f.get('p')).trim()) { avisar('Produto e valor.'); return false; } if (s > v) { avisar('O sinal não pode passar do valor.'); return false; } db.encomendas.push({ id: `E${Date.now().toString(36)}`, cliente: f.get('c'), prod: String(f.get('p')).trim(), valor: v, sinal: s, prazo: Number(f.get('d')) || 7, st: 'pedida' }); if (s) db.vendas.push({ n: db.proxVenda++, dia: 0, hora: new Date().toTimeString().slice(0, 5), itens: [], total: s, desconto: 0, forma: 'Pix', cliente: f.get('c'), vendedor: db.vendedor, sinal: true }); return true; }),
  'g-enc': (a) => { const x = db.encomendas.find((y) => y.id === a.dataset.id); x.st = a.dataset.v; gravar(); desenhar(); },
  'g-carne': () => gaveta('Novo carnê', `<form class="form" id="f"><label>Cliente<select class="campo" name="c" data-livre="clientes">${db.clientes.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select></label><div class="dupla"><label>Valor da compra (R$)<input class="campo" name="v" inputmode="decimal" required></label><label>Parcelas<select class="campo" name="n">${[2, 3, 4, 5, 6, 8, 10].map((n) => `<option>${n}</option>`).join('')}</select></label></div><label>Juros ao mês (%)<input class="campo" name="j" inputmode="decimal" value="2"></label><p class="dica">Parcela fixa: valor × (1 + juros × parcelas) ÷ parcelas. A 1ª vence em 30 dias.</p></form>`, `<button class="btn fant" data-acao="fechar">Cancelar</button><button class="btn vinho" data-acao="confirmar">Criar carnê</button>`, () => { const f = new FormData($('#f')), v = n2(f.get('v')), n = Number(f.get('n')), j = n2(f.get('j')) || 0; if (!(v > 0)) { avisar('Informe o valor.'); return false; } if (!(j >= 0 && j <= 10)) { avisar('Juros de 0 a 10% ao mês.'); return false; } const tot = Math.round(v * (1 + j / 100 * n) * 100) / 100, base = Math.floor(tot / n * 100) / 100; db.carnes.push({ id: `K${Date.now().toString(36)}`, cliente: f.get('c'), total: tot, parcelas: Array.from({ length: n }, (_, i) => ({ valor: i === n - 1 ? Math.round((tot - base * (n - 1)) * 100) / 100 : base, vence: 30 * (i + 1), pago: false })) }); avisar(`Carnê de ${n}x criado: total ${R(tot)}.`); return true; }),
  'g-parcela': (a) => { const k = db.carnes.find((x) => x.id === a.dataset.id), p = k.parcelas[Number(a.dataset.n)]; p.pago = true; db.vendas.push({ n: db.proxVenda++, dia: 0, hora: new Date().toTimeString().slice(0, 5), itens: [], total: p.valor, desconto: 0, forma: 'Pix', cliente: k.cliente, vendedor: db.vendedor, carne: true }); gravar(); desenhar(); avisar(`Parcela de ${R(p.valor)} recebida.`); },
  'g-preco': (a) => { const p = prod(a.dataset.id), ant = p.preco; p.preco = precoBonito(p.custo * (1 + db.markup[p.cat] / 100)); gravar(); desenhar(); avisar(`${p.nome}: ${R(ant)} → ${R(p.preco)}. Imprima a etiqueta nova.`); },
  'g-invcat': (a) => { invCat = a.dataset.v; contagem = {}; desenhar(); },
  'g-inventario': () => { const l = db.produtos.filter((p) => p.cat === invCat && contagem[p.id] != null && contagem[p.id] !== p.estoque); l.forEach((p) => { const q = contagem[p.id] - p.estoque; db.ajustes.push({ id: p.id, qtd: q, motivo: `Inventário de ${invCat}`, dia: 0 }); p.estoque = contagem[p.id]; }); contagem = {}; gravar(); desenhar(); avisar(l.length ? `${l.length} diferença(s) lançada(s) como ajuste.` : 'Tudo bateu.'); },
  'g-avaria': () => gaveta('Avaria', `<form class="form" id="f"><label>Produto<select class="campo" name="p">${db.produtos.map((p) => `<option value="${p.id}">${esc(p.nome)} (tem ${p.estoque})</option>`).join('')}</select></label><div class="dupla"><label>Quantidade<input class="campo" name="q" type="number" min="1" value="1"></label><label>Fornecedor<select class="campo" name="f" data-livre="fornecedores">${db.fornecedores.map((f) => `<option>${esc(f.nome)}</option>`).join('')}</select></label></div><label>O que aconteceu<input class="campo" name="m" required value="Chegou quebrado"></label></form>`, `<button class="btn fant" data-acao="fechar">Cancelar</button><button class="btn vinho" data-acao="confirmar">Separar</button>`, () => { const f = new FormData($('#f')), p = prod(f.get('p')), q = Math.round(Number(f.get('q'))); if (!(q >= 1) || q > p.estoque) { avisar(`De 1 a ${p.estoque}.`); return false; } p.estoque -= q; db.avarias.push({ n: Date.now().toString(36), id: p.id, qtd: q, forn: f.get('f'), motivo: String(f.get('m')).trim(), st: 'separada' }); return true; }),
  'g-avaria-ok': (a) => { const x = db.avarias.find((y) => y.n === a.dataset.id); x.st = 'trocada'; prod(x.id).estoque += x.qtd; gravar(); desenhar(); avisar('Troca recebida: voltou para o estoque.'); },
  'g-kit': () => gaveta('Novo kit', `<form class="form" id="f"><label>Nome<input class="campo" name="n" required value="Kit cozinha nova"></label><label>Produtos (Ctrl para vários)<select class="campo" name="p" multiple size="6">${db.produtos.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select></label><label>Desconto do kit (%)<input class="campo" name="d" inputmode="decimal" value="10"></label></form>`, `<button class="btn fant" data-acao="fechar">Cancelar</button><button class="btn vinho" data-acao="confirmar">Salvar</button>`, () => { const f = new FormData($('#f')), ps = f.getAll('p'), d = n2(f.get('d')); if (ps.length < 2) { avisar('Escolha pelo menos dois produtos.'); return false; } if (!(d >= 0 && d <= 40)) { avisar('Desconto de 0 a 40%.'); return false; } db.kits.push({ id: `T${Date.now().toString(36)}`, nome: String(f.get('n')).trim(), itens: ps, desc: d }); return true; }),
  'g-kit-caixa': (a) => { const k = db.kits.find((x) => x.id === a.dataset.id), falta = k.itens.filter((id) => !(prod(id)?.estoque > 0)); if (falta.length) { avisar(`Sem estoque de ${falta.map((id) => prod(id)?.nome).join(', ')}.`); return; } k.itens.forEach((id) => { const x = db.cupom.find((i) => i.id === id); if (x) x.qtd++; else db.cupom.push({ id, qtd: 1 }); }); db.desconto = Math.round((db.desconto || 0) + soma(k.itens, (id) => pv(prod(id))) * k.desc / 100 * 100) / 100; gravar(); ir('vender'); avisar(`${k.nome} no caixa com ${k.desc}% de desconto.`); },
  'g-catcat': (a) => { catCatalogo = a.dataset.v; desenhar(); },
  'g-copiar-cat': () => { const t = $('.catalogo')?.textContent || ''; navigator.clipboard?.writeText(t).then(() => avisar('Catálogo copiado.'), () => avisar('Selecione e copie o texto.')); },
  'g-campanha': () => gaveta('Nova campanha', `<form class="form" id="f"><label>Nome<input class="campo" name="n" required value="Semana da cozinha"></label><div class="dupla"><label>Categoria<select class="campo" name="c">${CATS.map((c) => `<option>${c}</option>`).join('')}</select></label><label>Desconto (%)<input class="campo" name="p" inputmode="decimal" value="15"></label></div><label>Dura (dias)<input class="campo" name="d" type="number" min="1" max="60" value="7"></label></form>`, `<button class="btn fant" data-acao="fechar">Cancelar</button><button class="btn vinho" data-acao="confirmar">Salvar</button>`, () => { const f = new FormData($('#f')), p = n2(f.get('p')); if (!(p > 0 && p <= 50)) { avisar('Desconto de 1 a 50%.'); return false; } db.campanhas.push({ id: `C${Date.now().toString(36)}`, nome: String(f.get('n')).trim(), cat: f.get('c'), pct: p, fim: Number(f.get('d')) || 7, ativa: false }); return true; }),
  'g-campanha-on': (a) => { const c = db.campanhas.find((x) => x.id === a.dataset.id); let n = 0, abaixo = 0; db.produtos.filter((p) => p.cat === c.cat).forEach((p) => { const novo = Math.round(p.preco * (1 - c.pct / 100) * 100) / 100; if (novo < p.custo) { abaixo++; return; } p.promo = { preco: novo, ate: c.fim }; n++; }); c.ativa = true; gravar(); desenhar(); avisar(`${n} produto(s) em promoção até ${diaTxt(c.fim)}${abaixo ? `; ${abaixo} ficaria(m) abaixo do custo e ficou(aram) de fora` : ''}.`); },
};
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-acao]'); if (a && G[a.dataset.acao]) { e.preventDefault(); G[a.dataset.acao](a); return; }
  const cb = e.target.closest('[data-cobrou]'); if (cb) { db.cobrados[cb.dataset.cobrou] = new Date().toLocaleDateString('pt-BR'); gravar(); setTimeout(desenhar, 200); return; }
  const cp = e.target.closest('[data-cupom]'); if (cp) { cli(cp.dataset.cupom).cupom = true; gravar(); setTimeout(desenhar, 200); return; }
  const pd = e.target.closest('[data-pedido]'); if (pd) { const f = db.fornecedores.find((x) => x.id === pd.dataset.pedido), m = media7(), l = db.produtos.filter((p) => f.cats.includes(p.cat)).map((p) => ({ p, q: Math.max(0, Math.ceil(m[p.id] * 15) - p.estoque, p.estoque <= p.minimo ? p.minimo * 2 - p.estoque : 0) })).filter((x) => x.q > 0); db.pedidosForn.push({ forn: f.nome, itens: l.length, total: Math.round(soma(l, (x) => x.q * x.p.custo) * 100) / 100, dia: 0 }); gravar(); setTimeout(desenhar, 200); }
});
document.addEventListener('change', (e) => {
  const t = e.target, d = t.dataset;
  if ('cashback' in d) { const v = n2(t.value); if (!(v >= 0 && v <= 20)) { avisar('De 0 a 20%.'); desenhar(); return; } db.cashback = v; gravar(); desenhar(); return; }
  if (d.markup) { const v = Number(t.value); if (!(v >= 0 && v <= 400)) { avisar('Markup de 0 a 400%.'); desenhar(); return; } db.markup[d.markup] = v; gravar(); desenhar(); return; }
  if (d.contei) { const v = t.value === '' ? null : Math.round(Number(t.value)); if (v !== null && !(v >= 0)) { avisar('Quantidade inválida.'); desenhar(); return; } contagem[d.contei] = v; desenhar(); return; }
  if (d.metav) { db.metaVend[d.metav] = n2(t.value) || 0; gravar(); desenhar(); return; }
  if (d.fixa) { const v = n2(t.value); if (!(v >= 0)) { avisar('Valor inválido.'); desenhar(); return; } db.fixas[Number(d.fixa)].v = v; gravar(); desenhar(); return; }
  if ('saldob' in d) { const v = n2(t.value); if (!Number.isFinite(v)) { avisar('Valor inválido.'); desenhar(); return; } db.saldoBanco = v; gravar(); desenhar(); }
});

// ---------------------------------------------------------------- eventos
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-acao]'); if (!a) return;
  const { acao, v, id } = a.dataset;
  if (a.tagName === 'A' && acao !== 'ir') return;
  e.preventDefault();
  const acoes = {
    ir: () => ir(v),
    ia,
    fechar: () => { fecharGaveta(); if (a.dataset.depois) ir(a.dataset.depois); },
    confirmar: () => { if (gavetaAcao && gavetaAcao() !== false) { fecharGaveta(); gravar(); desenhar(); } },
    cat: () => { filtroCat = v; desenhar(); },
    por: () => { const p = prod(id), x = db.cupom.find((i) => i.id === id); if (x) { if (x.qtd < p.estoque) x.qtd++; else avisar(`Só tem ${p.estoque} de ${p.nome}.`); } else db.cupom.push({ id, qtd: 1 }); gravar(); desenhar(); },
    mais: () => acoes.por(),
    menos: () => { const x = db.cupom.find((i) => i.id === id); x.qtd--; if (!x.qtd) db.cupom = db.cupom.filter((i) => i !== x); gravar(); desenhar(); },
    forma: () => { db.forma = v; gravar(); desenhar(); },
    'pdv-cliente': () => { db.cliente = db.clientes[0].id; desenhar(); $('#pdv-cliente').focus(); },
    desconto: () => {
      const sub = db.cupom.reduce((t, x) => t + x.qtd * pv(prod(x.id)), 0);
      gaveta('Desconto', `<form class="form" id="f"><label>Desconto em reais<input class="campo" name="r" inputmode="decimal" value="${db.desconto || ''}"></label><label>ou em porcentagem<input class="campo" name="p" inputmode="decimal" placeholder="Ex.: 5"></label></form>`,
        `<button class="btn fant" data-acao="fechar">Cancelar</button><button class="btn vinho" data-acao="confirmar">Aplicar</button>`, () => {
          const f = new FormData($('#f')), p = Number(String(f.get('p')).replace(',', '.')), r = Number(String(f.get('r')).replace(',', '.'));
          db.desconto = Math.min(sub, p > 0 ? Math.round(sub * p) / 100 : r || 0); return true;
        });
    },
    'fechar-venda': fecharVenda,
    produto: () => gavetaProduto(id),
    entrada: () => gavetaEntrada(id),
    cliente: () => gavetaCliente(id),
    conta: () => gavetaConta(id),
    'nova-conta': gavetaNovaConta,
    'aba-contas': () => { abaContas = v; desenhar(); },
    baixar: () => { const k = db.contas.find((x) => x.id === id); k.pago = true; if (k.cliente) { const c = cli(k.cliente); if (c) c.deve = Math.max(0, c.deve - k.valor); } gravar(); desenhar(); avisar(k.tipo === 'pagar' ? 'Conta paga.' : 'Valor recebido.'); },
    venda: () => gavetaVenda(Number(a.dataset.n)),
    'fechar-caixa': () => { const vend = vendasDia(0), por = {}; vend.forEach((x) => { por[x.forma] = (por[x.forma] || 0) + x.total; }); gaveta('Fechar o caixa', `<div class="etiquetas" style="grid-template-columns:1fr 1fr"><div class="etiqueta navy"><span class="rot">Dinheiro na gaveta (sistema)</span><span class="val">${R(noCaixa())}</span><span class="det">abriu com ${R(db.caixaInicial)}</span></div><div class="etiqueta"><span class="rot">Vendido hoje</span><span class="val">${R(totalDia(0))}</span><span class="det">${vend.length} vendas</span></div></div><ul class="lista">${Object.entries(por).map(([f, t]) => `<li><div class="cresce"><b>${f}</b></div><b class="dir">${R(t)}</b></li>`).join('')}${db.caixa.sangrias.map((x) => `<li><div class="cresce"><b>Sangria</b><span>${esc(x.motivo)} · ${x.hora}</span></div><b class="dir">− ${R(x.v)}</b></li>`).join('')}</ul><form class="form" id="f"><div class="dupla"><label>Sangria agora (R$)<input class="campo" name="s" inputmode="decimal" placeholder="0"></label><label>Motivo da sangria<input class="campo" name="m" value="Depósito no banco"></label></div><label>Contei na gaveta (R$) <span class="dica">para fechar</span><input class="campo" name="c" inputmode="decimal"></label><p class="erro" id="erro" hidden></p></form>`, `<button class="btn fant" data-acao="fechar">Cancelar</button><button class="btn vinho" data-acao="confirmar">Salvar</button>`, () => { const f = new FormData($('#f')), sg = n2(f.get('s')) || 0, ct = String(f.get('c')).trim(), e = $('#erro'); if (sg < 0 || sg > noCaixa()) { e.hidden = false; e.textContent = 'Sangria maior que o dinheiro da gaveta.'; return false; } if (sg) db.caixa.sangrias.push({ v: sg, motivo: String(f.get('m')).trim() || 'Sangria', hora: new Date().toTimeString().slice(0, 5) }); if (ct) { const c = n2(ct), dif = Math.round((c - noCaixa()) * 100) / 100; db.caixa.fechamentos.push({ hora: new Date().toTimeString().slice(0, 5), contado: c, dif }); avisar(dif ? `Caixa fechado com diferença de ${R(dif)}.` : 'Caixa fechado: bateu certinho.'); } else if (sg) avisar('Sangria registrada.'); else { e.hidden = false; e.textContent = 'Informe a sangria ou o valor contado.'; return false; } return true; }); },
    'salvar-orc': () => { const sub = db.cupom.reduce((t, x) => t + x.qtd * pv(prod(x.id)), 0), desc = Math.min(db.desconto || 0, sub), o = { n: `O-${db.proxOrc++}`, cliente: db.cliente, itens: db.cupom.map((x) => { const p = prod(x.id); return { id: p.id, nome: p.nome, qtd: x.qtd, preco: pv(p), custo: p.custo }; }), total: sub - desc, desconto: desc, dia: 0, st: 'aberto' }; db.orcamentos.push(o); db.cupom = []; db.desconto = 0; gravar(); desenhar(); const c = cli(o.cliente); gaveta(`Orçamento ${o.n}`, recibo({ ...o, hora: new Date().toTimeString().slice(0, 5), forma: 'orçamento (não pago)' }), `${c?.tel ? `<a class="btn" target="_blank" rel="noopener" href="https://wa.me/55${c.tel.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, ${c.nome.split(' ')[0]}! Segue o orçamento ${o.n} da Casa Aurora: ${o.itens.map((x) => `${x.qtd}× ${x.nome}`).join(', ')}. Total ${R(o.total)}. Vale por 7 dias.`)}">Mandar no WhatsApp</a>` : ''}<button class="btn vinho" data-acao="fechar">Pronto</button>`); },
    orcamentos: () => { const l = [...db.orcamentos].sort((a, b) => (a.st !== 'aberto') - (b.st !== 'aberto') || b.dia - a.dia); gaveta('Orçamentos', l.length ? `<ul class="lista">${l.map((o) => `<li><div class="cresce"><b>${o.n} · ${esc(cli(o.cliente)?.nome || 'sem cliente')}</b><span>${esc(o.itens.map((x) => `${x.qtd}× ${x.nome}`).join(', '))} · ${o.dia === 0 ? 'hoje' : diaTxt(o.dia)}${o.dia < -7 && o.st === 'aberto' ? ' · vencido' : ''}</span></div><b class="dir">${R(o.total)}</b>${o.st === 'aberto' ? `<button class="btn peq vinho" data-acao="orc-venda" data-v="${o.n}">Virar venda</button>` : `<span class="selo ok">${o.st}</span>`}</li>`).join('')}</ul>` : '<p class="vazio">Nenhum orçamento. No cupom, toque em Salvar como orçamento.</p>', '<button class="btn" data-acao="fechar">Fechar</button>'); },
    'orc-venda': () => { const o = db.orcamentos.find((x) => x.n === v), falta = o.itens.filter((x) => (prod(x.id)?.estoque || 0) < x.qtd); if (falta.length) { avisar(`Sem estoque de ${falta.map((x) => x.nome).join(', ')}.`); return; } db.cupom = o.itens.map((x) => ({ id: x.id, qtd: x.qtd })); db.cliente = o.cliente || ''; db.desconto = o.desconto || 0; o.st = 'virou venda'; gravar(); fecharGaveta(); ir('vender'); avisar(`Orçamento ${o.n} no cupom: confira a forma de pagamento e feche.`); },
    devolver: () => { const vd = db.vendas.find((x) => x.n === Number(a.dataset.n)); gaveta(`Troca ou devolução · venda ${vd.n}`, `<form class="form" id="f">${vd.itens.map((x, i) => `<label>${esc(x.nome)} (levou ${x.qtd}${x.dev ? `, já voltou ${x.dev}` : ''})<input class="campo" name="q${i}" type="number" min="0" max="${x.qtd - (x.dev || 0)}" value="0"></label>`).join('')}<label>Como devolver<select class="campo" name="como"><option>Dinheiro</option><option>Pix</option>${vd.cliente ? '<option>Crédito para a próxima compra</option>' : ''}</select></label><p class="dica">O produto volta para o estoque. Código de Defesa do Consumidor: troca por defeito é obrigatória; por gosto, é cortesia da loja.</p><p class="erro" id="erro" hidden></p></form>`, `<button class="btn fant" data-acao="fechar">Cancelar</button><button class="btn vinho" data-acao="confirmar">Devolver</button>`, () => { const f = new FormData($('#f')); let valor = 0; const ls = []; vd.itens.forEach((x, i) => { const q = Math.round(Number(f.get(`q${i}`)) || 0); if (q > 0 && q <= x.qtd - (x.dev || 0)) { x.dev = (x.dev || 0) + q; const p = prod(x.id); if (p) p.estoque += q; valor += q * x.preco; ls.push(`${q}× ${x.nome}`); } }); if (!ls.length) { const e = $('#erro'); e.hidden = false; e.textContent = 'Escolha quanto volta de cada item.'; return false; } valor = Math.round(valor * (1 - (vd.desconto || 0) / (vd.total + (vd.desconto || 0))) * 100) / 100; const como = String(f.get('como')); if (/Crédito/.test(como)) { const c = cli(vd.cliente); c.credito = Math.round(((c.credito || 0) + valor) * 100) / 100; } else if (vd.forma === 'Fiado' && vd.cliente) { const c = cli(vd.cliente); c.deve = Math.max(0, Math.round((c.deve - valor) * 100) / 100); } db.devolucoes.push({ n: vd.n, itens: ls.join(', '), valor, como: /Crédito/.test(como) ? 'Crédito' : vd.forma === 'Fiado' ? 'Abatido do fiado' : como, dia: 0 }); avisar(`Devolvido: ${R(valor)} (${/Crédito/.test(como) ? 'crédito do cliente' : como}).`); return true; }); },
    fornecedores: () => { const ac = acabando(); gaveta('Fornecedores', `<ul class="lista">${db.fornecedores.map((f) => { const l = ac.filter((p) => f.cats.includes(p.cat)); return `<li><div class="cresce"><b>${esc(f.nome)}</b><span>${esc(f.tel)} · ${f.cats.join(', ')}${l.length ? ` · ${l.length} produto(s) para repor` : ''}</span></div>${l.length && f.tel ? `<a class="btn peq vinho" target="_blank" rel="noopener" href="https://wa.me/55${f.tel.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Pedido da Casa Aurora:\n${l.map((p) => `• ${Math.max(1, p.minimo * 2 - p.estoque)}× ${p.nome}`).join('\n')}\nPode mandar o orçamento e o prazo de entrega?`)}">Pedir pelo WhatsApp</a>` : ''}</li>`; }).join('') || '<li class="vazio">Nenhum fornecedor.</li>'}</ul><form class="form" id="f"><h2>Novo fornecedor</h2><div class="dupla"><label>Nome<input class="campo" name="n"></label><label>WhatsApp<input class="campo" name="t" inputmode="tel"></label></div><fieldset style="border:0;padding:0;margin:0;display:flex;gap:10px;flex-wrap:wrap">${CATS.map((c) => `<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="c_${c}"> ${c}</label>`).join('')}</fieldset><p class="erro" id="erro" hidden></p></form>`, `<button class="btn fant" data-acao="fechar">Fechar</button><button class="btn vinho" data-acao="confirmar">Cadastrar fornecedor</button>`, () => { const f = new FormData($('#f')), nome = String(f.get('n')).trim(), cats = CATS.filter((c) => f.get(`c_${c}`)); if (!nome || !cats.length) { const e = $('#erro'); e.hidden = false; e.textContent = 'Coloque o nome e marque o que ele vende.'; return false; } db.fornecedores.push({ id: `f${Date.now()}`, nome, tel: String(f.get('t')).trim(), cats }); avisar('Fornecedor cadastrado.'); return true; }); },
    etiquetas: () => { const l = db.produtos.filter((p) => !filtroCat || p.cat === filtroCat); gaveta('Etiquetas de preço', `<p class="dica" style="margin:0 0 8px">${filtroCat ? `Categoria ${filtroCat}` : 'Todos os produtos'} · ${l.length} etiquetas. Filtre pela categoria em Produtos para imprimir só uma prateleira.</p><div class="etiq-grade">${l.map((p) => `<div class="etiq-p"><b>${esc(p.nome)}</b><span>${pv(p) !== p.preco ? `<s>${R(p.preco)}</s> ` : ''}${R(pv(p))}</span><small>${esc(p.cod)}</small></div>`).join('')}</div>`, `<button class="btn fant" data-acao="fechar">Fechar</button><button class="btn vinho" data-acao="imprimir">Imprimir</button>`); },
    imprimir: () => { document.body.classList.add('so-gaveta'); print(); setTimeout(() => document.body.classList.remove('so-gaveta'), 500); },
    ajuste: () => { const p = prod(id); gaveta(`Ajuste · ${esc(p.nome)}`, `<form class="form" id="f"><p class="dica" style="margin:0">Tem ${p.estoque} no sistema.</p><div class="dupla"><label>Quantidade <span class="dica">negativo tira</span><input class="campo" name="q" type="number" value="-1" required></label><label>Motivo<select class="campo" name="m"><option>Quebrou</option><option>Defeito / avaria</option><option>Sumiu (furto)</option><option>Uso da loja</option><option>Contagem: sobrou</option></select></label></div><p class="erro" id="erro" hidden></p></form>`, `<button class="btn fant" data-acao="fechar">Cancelar</button><button class="btn vinho" data-acao="confirmar">Lançar ajuste</button>`, () => { const f = new FormData($('#f')), q = Math.round(Number(f.get('q'))), e = $('#erro'); if (!q) { e.hidden = false; e.textContent = 'Informe a quantidade.'; return false; } if (q < 0 && -q > p.estoque) { e.hidden = false; e.textContent = `Só há ${p.estoque} no estoque.`; return false; } p.estoque += q; db.ajustes.push({ id: p.id, qtd: q, motivo: f.get('m'), valor: Math.round(q * p.custo * 100) / 100, dia: 0 }); avisar('Ajuste lançado.'); return true; }); },
    'receber-fiado': () => { const c = cli(id); gaveta(`Receber · ${esc(c.nome)}`, `<form class="form" id="f"><p style="margin:0">Deve ${R(c.deve)}.</p><div class="dupla"><label>Valor (R$)<input class="campo" name="v" inputmode="decimal" value="${String(c.deve.toFixed(2)).replace('.', ',')}" required></label><label>Forma<select class="campo" name="f"><option>Pix</option><option>Dinheiro</option><option>Cartão</option></select></label></div><p class="erro" id="erro" hidden></p></form>`, `<button class="btn fant" data-acao="fechar">Cancelar</button><button class="btn vinho" data-acao="confirmar">Receber</button>`, () => { const f = new FormData($('#f')), val = Math.round(n2(f.get('v')) * 100) / 100, e = $('#erro'); if (!(val > 0)) { e.hidden = false; e.textContent = 'Informe o valor.'; return false; } if (val > c.deve + 0.004) { e.hidden = false; e.textContent = `O máximo é ${R(c.deve)}.`; return false; } c.deve = Math.round((c.deve - val) * 100) / 100; (c.pagos ||= []).push({ v: val, forma: f.get('f'), dia: 0 }); if (!c.deve) db.contas.filter((k) => k.cliente === id && !k.pago).forEach((k) => { k.pago = true; }); avisar(c.deve ? `Recebido ${R(val)}. Ainda deve ${R(c.deve)}.` : `${c.nome} quitou o fiado.`); return true; }); },
    meta: () => gaveta('Meta do dia', `<form class="form" id="f"><label>Quanto a loja precisa vender por dia (R$)<input class="campo" name="m" inputmode="decimal" value="${db.metaDia}" required></label><p class="erro" id="erro" hidden></p></form>`, `<button class="btn fant" data-acao="fechar">Cancelar</button><button class="btn vinho" data-acao="confirmar">Salvar</button>`, () => { const m = n2(new FormData($('#f')).get('m')); if (!(m > 0)) { const e = $('#erro'); e.hidden = false; e.textContent = 'Informe a meta.'; return false; } db.metaDia = m; avisar('Meta salva.'); return true; }),
    comissao: () => gaveta('Comissão dos vendedores', `<form class="form" id="f"><label>Porcentagem sobre o que cada um vendeu<input class="campo" name="c" inputmode="decimal" value="${String(db.comissao).replace('.', ',')}" required></label><p class="erro" id="erro" hidden></p></form>`, `<button class="btn fant" data-acao="fechar">Cancelar</button><button class="btn vinho" data-acao="confirmar">Salvar</button>`, () => { const c = n2(new FormData($('#f')).get('c')); if (!(c >= 0 && c <= 20)) { const e = $('#erro'); e.hidden = false; e.textContent = 'Entre 0% e 20%.'; return false; } db.comissao = c; return true; }),
    planilha: () => baixaCSV(`vendas-7-dias-${new Date().toISOString().slice(0, 10)}.csv`, [['Venda', 'Dia', 'Hora', 'Itens', 'Forma', 'Cliente', 'Vendedor', 'Desconto', 'Total', 'Lucro'], ...db.vendas.map((x) => [x.n, x.dia === 0 ? 'hoje' : diaTxt(x.dia), x.hora, x.itens.map((i) => `${i.qtd}x ${i.nome}`).join(', '), x.forma, cli(x.cliente)?.nome || '', x.vendedor || '', x.desconto || 0, x.total, lucroVenda(x)])]),
  };
  acoes[acao]?.();
});
document.addEventListener('change', (e) => { if (e.target.id === 'pdv-cliente') { db.cliente = e.target.value; gravar(); desenhar(); } if (e.target.id === 'vendedor') { db.vendedor = e.target.value; gravar(); } });
document.addEventListener('input', (e) => {
  if (e.target.id === 'pdv-busca') {
    filtroPdv = e.target.value; const pos = e.target.selectionStart; desenhar(); const i = $('#pdv-busca'); i.focus(); i.setSelectionRange(pos, pos);
    const exato = db.produtos.find((p) => p.cod === filtroPdv.trim());
    if (exato) { filtroPdv = ''; document.querySelector(`[data-acao="por"][data-id="${exato.id}"]`)?.click(); }
  }
  if (e.target.id === 'busca') {
    const q = norm(e.target.value);
    if (!q) return;
    if (db.produtos.some((p) => norm(p.nome).includes(q))) { if (parte !== 'produtos') ir('produtos'); else desenhar(); }
    else if (db.clientes.some((c) => norm(c.nome).includes(q))) { if (parte !== 'clientes') ir('clientes'); else desenhar(); }
    const b = $('#busca'); b.focus();
  }
});
$('#gaveta-fundo').addEventListener('click', fecharGaveta);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#gaveta').classList.contains('aberta')) fecharGaveta();
  if (e.key === 'Enter' && e.target.closest('#gaveta form') && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); $('#gaveta [data-acao="confirmar"]')?.click(); }
});
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); limparDono(CHAVE); db = semente(); fecharGaveta(); ir('painel'); avisar('Demonstração recomeçada.'); });

ir(location.hash.slice(1) || 'painel');

/* veltria: campos livres */
// Nome escrito à mão num campo de lista (js/campos-livres.js): vira cadastro novo nesta lista do db,
// no mesmo formato dos que já existem. O formulário grava como sempre.
window.veltriaNovoCadastro = (tipo, nome) => {
  const lista = db && db[tipo];
  if (!Array.isArray(lista)) return '';
  const ja = lista.find((x) => String(x.nome || '').trim().toLowerCase() === nome.trim().toLowerCase());
  if (ja) return ja.id;
  const mod = lista[0] || {}, n = {};
  Object.keys(mod).forEach((k) => { const v = mod[k]; n[k] = Array.isArray(v) ? [] : typeof v === 'number' ? 0 : typeof v === 'boolean' ? false : v && typeof v === 'object' ? {} : ''; });
  n.id = typeof mod.id === 'number' ? Math.max(0, ...lista.map((x) => Number(x.id) || 0)) + 1 : `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  n.nome = nome.trim();
  lista.push(n);
  return n.id;
};
