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
  return { produtos, clientes, vendas, contas, fornecedores, orcamentos, ajustes: [], devolucoes: [], caixa: { sangrias: [], fechamentos: [] }, vendedor: VENDEDORES[0], comissao: 2, cupom: [], forma: 'Pix', desconto: 0, cliente: '', caixaInicial: 300, proxVenda: nv, proxOrc: 32, metaDia: 2500 };
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
  const nome = PARTES.find((p) => p[0] === parte)[1];
  document.title = `${nome} · Veltria Gestão Completo`;
  $('#tela').innerHTML = TELAS[parte]();
  if (parte === 'dono') painelDono($('#gc-dono'), DONO);
  const badges = { produtos: acabando().length, contas: pagarAte(3).length, vender: db.cupom.length };
  $('#doca').innerHTML = PARTES.map(([id, n]) => `<a href="#${id}" ${id === parte ? 'aria-current="page"' : ''}>${ic[id]}<span>${n}</span>${badges[id] ? `<i>${badges[id]}</i>` : ''}</a>`).join('');
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
    if (c) c.compras++;
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
