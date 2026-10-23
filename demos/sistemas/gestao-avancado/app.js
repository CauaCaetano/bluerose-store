// Veltria Gestão Avançado · protótipo "estação de trabalho"
// Módulos abertos em abas, busca de comandos (Ctrl+K), atalhos F2–F9, duas unidades (Matriz e Filial), lotes e validade,
// compras com sugestão automática, fluxo de caixa projetado, DRE, metas e comissões, notas fiscais, curva ABC e auditoria.
// Dados de exemplo guardados só neste navegador (?novo no endereço recomeça).

import { abrirIA, painelDono, limparDono } from './extras.js';

const CHAVE = 'veltria-gestao-avancado-v1';
const R = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const Rk = (v) => (Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil` : R(v));
const pct = (v) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const $ = (s, el = document) => el.querySelector(s);
const data = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); };
const agoraTxt = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const UN = { matriz: 'Matriz', filial: 'Filial' };
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const I = {
  cockpit: svg('<path d="M3 13a9 9 0 0 1 18 0"/><path d="m12 13 4-4"/><path d="M3 17h18"/>'),
  pdv: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 20h10M12 16v4"/>'),
  estoque: svg('<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>'),
  compras: svg('<path d="M6 7h12l-1 13H7z"/><path d="M9 7a3 3 0 0 1 6 0"/>'),
  financeiro: svg('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  clientes: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>'),
  equipe: svg('<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>'),
  fiscal: svg('<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6M9 18h3"/>'),
  relatorios: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  auditoria: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  modulos: svg('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
  dono: svg('<path d="M4 18h16l-1.5-9-4.5 4-2-6-2 6-4.5-4z"/>'), ia: svg('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>'),
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>'), mais: svg('<path d="M12 5v14M5 12h14"/>'),
};
const MOD = {
  cockpit: { nome: 'Cockpit', desc: 'Os números da empresa num relance', k: 'F1' },
  pdv: { nome: 'Frente de caixa', desc: 'Venda com leitor, várias formas de pagamento e NFC-e', k: 'F2' },
  estoque: { nome: 'Estoque', desc: 'Duas unidades, lotes, validade e transferências', k: 'F3' },
  compras: { nome: 'Compras', desc: 'Sugestão automática e pedidos aos fornecedores', k: 'F4' },
  financeiro: { nome: 'Financeiro', desc: 'Fluxo projetado, contas e DRE do mês', k: 'F6' },
  clientes: { nome: 'Clientes', desc: 'Crédito, saldo e grupos (VIP, em risco, novos)', k: '' },
  equipe: { nome: 'Equipe e metas', desc: 'Metas por vendedor e comissões', k: '' },
  fiscal: { nome: 'Notas fiscais', desc: 'NFC-e e NF-e, rejeições e contingência', k: 'F8' },
  relatorios: { nome: 'Relatórios', desc: 'Curva ABC, margem por categoria, horários', k: 'F7' },
  auditoria: { nome: 'Auditoria', desc: 'Quem fez o quê e quando', k: 'F9' },
  dono: { nome: 'Painel do dono', desc: 'Equipe, cargos, permissões por módulo e plano', k: '' },
  modulos: { nome: 'Todos os módulos', desc: '', k: '' },
};
const TECLAS = { F1: 'cockpit', F2: 'pdv', F3: 'estoque', F4: 'compras', F6: 'financeiro', F7: 'relatorios', F8: 'fiscal', F9: 'auditoria' };
const OPERADOR = 'Renata Saldanha';

// ---------------------------------------------------------------- dados de exemplo
function semente() {
  let r = 29; const rnd = () => ((r = (r * 16807) % 2147483647) - 1) / 2147483646;
  const fornecedores = [
    { id: 'f0', nome: 'Laticínios Serra Azul', prazo: 21 }, { id: 'f1', nome: 'Vinícola Campos Altos', prazo: 28 },
    { id: 'f2', nome: 'Grãos & Cia Atacado', prazo: 14 }, { id: 'f3', nome: 'Importadora Mediterrâneo', prazo: 35 }, { id: 'f4', nome: 'Café Mantiqueira', prazo: 21 },
  ];
  const base = [
    ['QJ-001', 'Queijo canastra meia cura 1 kg', 'Frios', 'f0', 58, 99.9, 1, 8], ['QJ-002', 'Queijo minas padrão 500 g', 'Frios', 'f0', 21, 38.9, 1, 12],
    ['MT-010', 'Manteiga de garrafa 500 ml', 'Frios', 'f0', 24, 44.9, 1, 6], ['IO-011', 'Iogurte natural integral 500 g', 'Frios', 'f0', 7.2, 14.9, 1, 20],
    ['VN-101', 'Vinho tinto Merlot 750 ml', 'Bebidas', 'f1', 39, 79.9, 0, 10], ['VN-102', 'Espumante brut 750 ml', 'Bebidas', 'f1', 44, 89.9, 0, 8],
    ['VN-103', 'Vinho branco Chardonnay 750 ml', 'Bebidas', 'f1', 36, 72.9, 0, 6], ['GR-201', 'Arroz arbóreo 1 kg', 'Mercearia', 'f2', 19, 34.9, 0, 10],
    ['GR-202', 'Feijão preto orgânico 1 kg', 'Mercearia', 'f2', 9.8, 17.9, 0, 15], ['GR-203', 'Granola artesanal 500 g', 'Mercearia', 'f2', 14, 29.9, 1, 10],
    ['IM-301', 'Azeite extravirgem 500 ml', 'Importados', 'f3', 31, 59.9, 0, 12], ['IM-302', 'Massa grano duro 500 g', 'Importados', 'f3', 9.5, 21.9, 0, 18],
    ['IM-303', 'Tomate pelado lata 400 g', 'Importados', 'f3', 7.9, 16.9, 0, 14], ['IM-304', 'Pesto genovês 190 g', 'Importados', 'f3', 18, 36.9, 1, 8],
    ['CF-401', 'Café especial em grãos 250 g', 'Cafés', 'f4', 22, 46.9, 0, 15], ['CF-402', 'Café moído tradicional 500 g', 'Cafés', 'f4', 15, 28.9, 0, 20],
    ['CF-403', 'Cápsulas compatíveis 10 un.', 'Cafés', 'f4', 11, 24.9, 0, 15], ['DC-501', 'Doce de leite artesanal 400 g', 'Doces', 'f0', 12, 26.9, 1, 10],
    ['DC-502', 'Goiabada cascão 600 g', 'Doces', 'f2', 10, 21.9, 1, 8], ['DC-503', 'Chocolate 70% cacau 100 g', 'Doces', 'f3', 9, 19.9, 0, 20],
  ];
  const produtos = base.map(([sku, nome, cat, forn, custo, preco, perec, min], i) => {
    const m = Math.floor(rnd() * min * 3), f = Math.floor(rnd() * min * 2);
    const p = { id: `p${i}`, sku, nome, cat, forn, custo, preco, perecivel: !!perec, min, est: { matriz: m, filial: f }, lotes: [] };
    if (perec) for (const un of ['matriz', 'filial']) {
      let resta = p.est[un], k = 0;
      while (resta > 0) { const q = Math.min(resta, 1 + Math.floor(rnd() * 12)); p.lotes.push({ lote: `L${String(2410 + i * 7 + k).padStart(5, '0')}`, vence: [3, 6, 9, 15, 24, 40, 75][Math.floor(rnd() * 7)], qtd: q, un }); resta -= q; k++; }
    }
    return p;
  });
  const vendedores = [
    { id: 'v0', nome: 'Renata Saldanha', un: 'matriz', meta: 42000, comissao: 2 }, { id: 'v1', nome: 'Diego Albuquerque', un: 'matriz', meta: 38000, comissao: 2.5 },
    { id: 'v2', nome: 'Paula Moraes', un: 'filial', meta: 30000, comissao: 2.5 }, { id: 'v3', nome: 'Caio Teixeira', un: 'filial', meta: 26000, comissao: 3 },
  ];
  const clientes = [
    ['Restaurante Terroir', '12.448.301/0001-09', 15000], ['Helena Vasconcelos', '***.552.817-**', 3000], ['Bistrô da Praça', '33.120.774/0001-51', 10000],
    ['Fernando Lacerda', '***.903.114-**', 2000], ['Empório Casa Verde (revenda)', '08.665.230/0001-42', 20000], ['Luiza Cardim', '***.218.440-**', 1500],
    ['Hotel Mirante do Vale', '41.007.928/0001-10', 25000], ['Otávio Ribas', '***.771.065-**', 1000],
  ].map(([nome, doc, limite], i) => ({ id: `c${i}`, nome, doc, limite, saldo: 0, ultima: 999, compras: 0, gasto: 0 }));
  const vendas = []; let n = 18000, nf = 52100;
  for (let dia = -29; dia <= 0; dia++) {
    const dow = (new Date(Date.now() + dia * 864e5)).getDay(), qtd = Math.round((dow === 0 ? 8 : dow === 6 ? 26 : 16) * (0.8 + rnd() * 0.5));
    for (let k = 0; k < qtd; k++) {
      const hAgora = Math.min(20, Math.max(8, new Date().getHours()));
      if (dia === 0 && rnd() > (hAgora - 7) / 13) continue;   // hoje: só a parte do dia que já passou
      const v = vendedores[Math.floor(rnd() * 4)], h = dia === 0 ? 8 + Math.floor(rnd() * (hAgora - 7)) : 8 + Math.min(12, Math.floor((rnd() + rnd() + rnd()) / 3 * 13));
      const itens = Array.from({ length: 1 + Math.floor(rnd() * 4) }, () => { const p = produtos[Math.floor(Math.pow(rnd(), 1.6) * produtos.length)]; return { id: p.id, qtd: 1 + Math.floor(rnd() * 3), preco: p.preco, custo: p.custo }; });
      const total = itens.reduce((t, x) => t + x.qtd * x.preco, 0);
      const c = rnd() < .35 ? clientes[Math.floor(rnd() * clientes.length)] : null;
      const pag = c && rnd() < .3 ? 'A prazo' : ['Pix', 'Crédito', 'Débito', 'Dinheiro'][Math.floor(rnd() * 4)];
      if (c) { c.compras++; c.gasto += total; c.ultima = Math.min(c.ultima, -dia); if (pag === 'A prazo') c.saldo += total; }
      const st = rnd(); const status = dia === 0 && st < .06 ? 'Contingência' : st < .025 ? 'Rejeitada' : 'Autorizada';
      vendas.push({ n: n++, dia, hora: h, un: v.un, vend: v.id, itens, total, pag, cli: c?.id || '', nota: { tipo: c && c.doc.includes('/') ? 'NF-e' : 'NFC-e', num: nf++, status, motivo: status === 'Rejeitada' ? 'Rejeição 778: NCM inexistente' : status === 'Contingência' ? 'SEFAZ fora do ar: emitida offline' : '' } });
    }
  }
  clientes[7].ultima = 63; clientes[5].ultima = Math.max(clientes[5].ultima, 48);
  const contas = [
    ['pagar', 'Aluguel Matriz', 6800, 3, 'Ocupação'], ['pagar', 'Aluguel Filial', 4200, 3, 'Ocupação'], ['pagar', 'Folha de pagamento', 15900, 5, 'Pessoal'],
    ['pagar', 'Energia (duas unidades)', 2310, -2, 'Ocupação'], ['pagar', 'Simples Nacional (DAS)', 8930, 20, 'Impostos'], ['pagar', 'Marketing digital', 1500, 12, 'Comercial'],
    ['pagar', 'Laticínios Serra Azul (NF 8812)', 7420, 8, 'Fornecedor'], ['pagar', 'Importadora Mediterrâneo (NF 3301)', 12650, 16, 'Fornecedor'], ['pagar', 'Sistema e internet', 690, 25, 'Administrativo'],
    ['receber', 'Hotel Mirante do Vale: fatura quinzenal', 9840, 6, 'Clientes'], ['receber', 'Restaurante Terroir: boleto', 4310, 11, 'Clientes'], ['receber', 'Repasse das maquininhas (D+1)', 13280, 1, 'Cartões'],
    ['receber', 'Repasse das maquininhas (crédito D+30)', 27600, 18, 'Cartões'], ['pagar', 'Contabilidade', 1350, -12, 'Administrativo', true],
  ].map(([tipo, nome, valor, vence, cat, pago], i) => ({ id: `k${i}`, tipo, nome, valor, vence, cat, pago: !!pago }));
  const pedidos = [
    { id: 'o0', num: 771, forn: 'f1', itens: [{ id: 'p4', qtd: 24, custo: 39 }, { id: 'p5', qtd: 12, custo: 44 }], status: 'Enviado', dia: -3 },
    { id: 'o1', num: 772, forn: 'f4', itens: [{ id: 'p14', qtd: 30, custo: 22 }], status: 'Rascunho', dia: -1 },
  ];
  const movs = [{ dia: -1, hora: '17:40', tipo: 'Transferência', txt: '12× Vinho tinto Merlot: Matriz → Filial', quem: 'Diego Albuquerque' }, { dia: -2, hora: '09:12', tipo: 'Entrada', txt: 'Pedido 769 recebido (Grãos & Cia)', quem: 'Renata Saldanha' }, { dia: -2, hora: '19:05', tipo: 'Perda', txt: '3× Iogurte natural (lote L02434 vencido)', quem: 'Paula Moraes' }];
  const log = [
    { dia: -1, hora: '18:02', quem: 'Caio Teixeira', txt: 'Fechou o caixa 02 da Filial com diferença de R$ 0,00' },
    { dia: -1, hora: '17:40', quem: 'Diego Albuquerque', txt: 'Transferiu 12× Vinho tinto Merlot da Matriz para a Filial' },
    { dia: -1, hora: '11:21', quem: 'Renata Saldanha', txt: 'Mudou o preço de Azeite extravirgem 500 ml de R$ 56,90 para R$ 59,90' },
    { dia: 0, hora: '08:02', quem: OPERADOR, txt: 'Abriu o caixa 01 da Matriz com R$ 400,00' },
  ];
  return { produtos, fornecedores, vendedores, clientes, vendas, contas, pedidos, movs, log, abas: ['cockpit'], ativa: 'cockpit', un: 'todas', pdv: { itens: [], cli: '', vend: 'v0' }, proxVenda: n, proxNota: nf, proxPedido: 773, saldoBanco: 38450, metaMesExtra: 0, estoqueAba: 'posicao', finAba: 'fluxo', busca: {} };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || semente(); } catch { return semente(); } })();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { /* sem espaço: segue na memória */ } };
const prod = (id) => db.produtos.find((p) => p.id === id);
const forn = (id) => db.fornecedores.find((f) => f.id === id);
const vend = (id) => db.vendedores.find((v) => v.id === id);
const cli = (id) => db.clientes.find((c) => c.id === id);
const registrar = (txt) => db.log.push({ dia: 0, hora: agoraTxt(), quem: OPERADOR, txt });

// ---------------------------------------------------------------- contas
const diaMes = () => new Date().getDate();
const vendasUn = () => db.vendas.filter((v) => db.un === 'todas' || v.un === db.un);
const doMes = () => vendasUn().filter((v) => v.dia > -diaMes());
const soma = (l, f) => l.reduce((t, x) => t + f(x), 0);
const custoVenda = (v) => soma(v.itens, (x) => x.qtd * x.custo);
const totalEst = (p) => (db.un === 'todas' ? p.est.matriz + p.est.filial : p.est[db.un]);
const vendidos30 = () => { const m = {}; vendasUn().forEach((v) => v.itens.forEach((x) => { m[x.id] = (m[x.id] || 0) + x.qtd; })); return m; };
const cobertura = (p, v30) => { const g = (v30[p.id] || 0) / 30; return g ? totalEst(p) / g : Infinity; };
const metaMes = () => soma(db.vendedores.filter((v) => db.un === 'todas' || v.un === db.un), (v) => v.meta);
const lotesVencendo = (dias = 10) => db.produtos.flatMap((p) => p.lotes.filter((l) => l.qtd > 0 && l.vence <= dias && (db.un === 'todas' || l.un === db.un)).map((l) => ({ p, l }))).sort((a, b) => a.l.vence - b.l.vence);
function abc() {
  const rec = {}; vendasUn().forEach((v) => v.itens.forEach((x) => { rec[x.id] = (rec[x.id] || 0) + x.qtd * x.preco; }));
  const tot = soma(Object.values(rec), (x) => x) || 1; let acc = 0;
  return db.produtos.map((p) => ({ p, r: rec[p.id] || 0 })).sort((a, b) => b.r - a.r).map((x) => { acc += x.r; return { ...x, part: x.r / tot, acc: acc / tot, classe: acc / tot <= .8 ? 'A' : acc / tot <= .95 ? 'B' : 'C' }; });
}
function fluxo() {
  const media = soma(db.vendas.filter((v) => v.dia > -14 && v.dia < 0), (v) => v.total) / 13 * .62;   // parte que entra em dinheiro, Pix e débito no mesmo dia
  let s = db.saldoBanco; const pts = [];
  for (let d = 0; d <= 30; d++) {
    const ent = soma(db.contas.filter((k) => k.tipo === 'receber' && !k.pago && (d === 0 ? k.vence <= 0 : k.vence === d)), (k) => k.valor) + (d ? media : 0);
    const sai = soma(db.contas.filter((k) => k.tipo === 'pagar' && !k.pago && (d === 0 ? k.vence <= 0 : k.vence === d)), (k) => k.valor);
    s += ent - sai; pts.push({ d, s, ent, sai });
  }
  return pts;
}

// ---------------------------------------------------------------- janelas e avisos
function avisar(txt) { const a = document.createElement('div'); a.className = 'aviso'; a.textContent = txt; $('#avisos').append(a); setTimeout(() => a.remove(), 3200); }
let janelaOk = null, focoAntes = null;
function janela(titulo, corpo, botao, aoConfirmar) {
  focoAntes = document.activeElement;
  $('#janela').innerHTML = `<div class="janela-cab"><h2 id="janela-titulo">${titulo}</h2><button type="button" data-acao="fechar-janela" aria-label="Fechar">${I.x}</button></div><div class="janela-corpo">${corpo}</div><div class="janela-pe"><button class="btn" data-acao="fechar-janela">Cancelar</button>${botao ? `<button class="btn prim" data-acao="ok-janela">${botao}</button>` : ''}</div>`;
  janelaOk = aoConfirmar; $('#janela-fundo').hidden = false;
  setTimeout(() => ($('#janela input, #janela select') || $('#janela [data-acao="ok-janela"]') || $('#janela button')).focus(), 30);
}
const fecharJanela = () => { $('#janela-fundo').hidden = true; janelaOk = null; focoAntes?.focus?.(); };
const erroJanela = (t) => { let e = $('#janela .erro-txt'); if (!e) { e = document.createElement('p'); e.className = 'erro-txt'; $('#janela .janela-corpo').append(e); } e.textContent = t; return false; };
const num = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.'));

// ---------------------------------------------------------------- abas
function abrir(m) {
  if (!MOD[m]) return;
  if (!db.abas.includes(m)) db.abas.push(m);
  db.ativa = m; gravar(); desenhar(); $('#area').focus({ preventScroll: true });
}
function fecharAba(m) {
  const i = db.abas.indexOf(m); db.abas.splice(i, 1);
  if (!db.abas.length) db.abas = ['modulos'];
  if (db.ativa === m) db.ativa = db.abas[Math.max(0, i - 1)];
  gravar(); desenhar();
}

// ---------------------------------------------------------------- módulos
const kpi = (rot, val, det, cls = '') => `<div class="pn kpi c3 ${cls}"><span class="rot">${rot}</span><span class="val">${val}</span><span class="det">${det}</span></div>`;
const unTxt = () => (db.un === 'todas' ? 'nas duas unidades' : `na ${UN[db.un]}`);

function mCockpit() {
  const mes = doMes(), fat = soma(mes, (v) => v.total), cmv = soma(mes, custoVenda), meta = metaMes();
  const hoje = vendasUn().filter((v) => v.dia === 0);
  const fh = soma(hoje, (v) => v.total);
  const v30 = vendidos30(), capital = soma(db.produtos, (p) => totalEst(p) * p.custo);
  const frac = Math.min(1, fat / meta), prev = fat / diaMes() * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const L = Math.PI * 60;
  const fl = fluxo(), mn = Math.min(...fl.map((x) => x.s), 0), mx = Math.max(...fl.map((x) => x.s)), W = 600, H = 150;
  const X = (d) => 30 + d / 30 * (W - 40), Y = (s) => 10 + (1 - (s - mn) / (mx - mn || 1)) * (H - 30);
  const linha = fl.map((p, i) => `${i ? 'L' : 'M'}${X(p.d).toFixed(1)},${Y(p.s).toFixed(1)}`).join(' ');
  const menor = fl.reduce((a, b) => (b.s < a.s ? b : a));
  const abaixo = db.produtos.filter((p) => totalEst(p) < p.min), venc = lotesVencendo(7), atras = db.contas.filter((k) => !k.pago && k.vence < 0), rej = vendasUn().filter((v) => v.nota.status !== 'Autorizada');
  const alertas = [
    abaixo.length && { t: `${abaixo.length} produtos abaixo do estoque mínimo`, s: abaixo.slice(0, 3).map((p) => p.nome.split(' ').slice(0, 3).join(' ')).join(', '), tag: 'erro', m: 'compras' },
    venc.length && { t: `${venc.length} lotes vencem em até 7 dias`, s: `${soma(venc, (x) => x.l.qtd)} unidades, ${R(soma(venc, (x) => x.l.qtd * x.p.custo))} pelo custo`, tag: 'alerta', m: 'estoque', aba: 'lotes' },
    atras.length && { t: `${atras.length} contas vencidas`, s: atras.map((k) => k.nome).join(', '), tag: 'erro', m: 'financeiro', aba: 'contas' },
    rej.length && { t: `${rej.length} notas precisam de atenção`, s: 'rejeitadas ou emitidas em contingência', tag: 'lav', m: 'fiscal' },
  ].filter(Boolean);
  const ranking = db.vendedores.filter((v) => db.un === 'todas' || v.un === db.un).map((v) => ({ v, f: soma(mes.filter((x) => x.vend === v.id), (x) => x.total) })).sort((a, b) => b.f - a.f);
  const mapa = Array.from({ length: 7 }, () => Array(13).fill(0)); vendasUn().forEach((v) => { const dw = new Date(Date.now() + v.dia * 864e5).getDay(); mapa[dw][v.hora - 8] += v.total; });
  const mmax = Math.max(...mapa.flat(), 1), dn = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  return `<div class="mod-cab"><div><h1>Cockpit</h1><p>${unTxt()} · atualizado às ${agoraTxt()}</p></div><div class="acoes"><button class="btn prim" data-acao="abrir" data-m="pdv">${I.pdv}Nova venda <span class="k">F2</span></button><button class="btn" data-acao="paleta">${I.mais}Fazer algo <span class="k">Ctrl K</span></button></div></div>
  <div class="bento">
    ${kpi('Faturamento do mês', Rk(fat), `previsão de fechar em ${Rk(prev)}`, 'escuro')}
    ${kpi('Hoje até agora', R(fh), `${hoje.length} vendas · semana passada no dia inteiro: ${Rk(soma(vendasUn().filter((v) => v.dia === -7), (v) => v.total))}`)}
    ${kpi('Margem bruta do mês', pct(fat ? (fat - cmv) / fat : 0), `lucro bruto de ${Rk(fat - cmv)}`)}
    ${kpi('Capital em estoque', Rk(capital), `pelo custo · ticket médio ${R(fat / Math.max(1, mes.length))}`)}
    <section class="pn c4"><div class="pn-cab"><h2>Meta do mês</h2><span class="tag ${frac >= diaMes() / 30 ? 'ok' : 'alerta'}">${frac >= diaMes() / 30 ? 'no ritmo' : 'abaixo do ritmo'}</span></div>
      <div class="medidor"><svg viewBox="0 0 150 92" aria-hidden="true"><path d="M15 80a60 60 0 0 1 120 0" stroke="var(--porcelana-2)" stroke-width="14"/><path d="M15 80a60 60 0 0 1 120 0" stroke="var(--lavanda-esc)" stroke-width="14" stroke-dasharray="${frac * L} ${L}"/><text x="75" y="74" text-anchor="middle" style="font:600 20px var(--mono);fill:var(--tinta)">${Math.round(frac * 100)}%</text></svg>
      <div><b class="mono">${Rk(fat)}</b><div class="sub">de ${Rk(meta)}</div><div class="sub">faltam ${Rk(Math.max(0, meta - fat))} em ${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - diaMes()} dias</div></div></div></section>
    <section class="pn c8 grafico"><div class="pn-cab"><h2>Saldo projetado: próximos 30 dias</h2><span class="sub">menor saldo ${R(menor.s)} em ${data(menor.d)}</span></div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Saldo projetado"><path d="${linha} L${X(30)},${H - 20} L${X(0)},${H - 20}Z" fill="rgba(183,161,201,.25)" stroke="none"/>${mn < 0 ? `<line x1="30" x2="${W - 10}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--erro)" stroke-dasharray="4 4"/>` : ''}<path d="${linha}" stroke="var(--ameixa)" stroke-width="2.2" fill="none"/><circle cx="${X(menor.d)}" cy="${Y(menor.s)}" r="4.5" fill="var(--ouro)" stroke="var(--ameixa)"/>${[0, 10, 20, 30].map((d) => `<text x="${X(d)}" y="${H - 4}" text-anchor="middle">${data(d)}</text>`).join('')}<text x="2" y="${Y(mx) + 4}">${Rk(mx).replace('R$ ', '')}</text><text x="2" y="${Y(mn) + 4}">${Rk(mn).replace('R$ ', '')}</text></svg></section>
    <section class="pn c5"><div class="pn-cab"><h2>Alertas</h2><span class="tag ${alertas.length ? 'erro' : 'ok'}">${alertas.length}</span></div>${alertas.length ? `<ul class="lista">${alertas.map((a) => `<li><span class="tag ${a.tag}">●</span><div class="cresce"><b>${a.t}</b><span>${esc(a.s)}</span></div><button class="btn peq" data-acao="abrir" data-m="${a.m}" ${a.aba ? `data-aba="${a.aba}"` : ''}>Resolver</button></li>`).join('')}</ul>` : '<p class="vazio">Sem alertas.</p>'}</section>
    <section class="pn c3"><div class="pn-cab"><h2>Vendedores no mês</h2></div><ul class="lista">${ranking.map(({ v, f }) => `<li><div class="cresce"><b>${esc(v.nome.split(' ')[0])} <span class="tag">${UN[v.un]}</span></b><div class="barra-h ${f >= v.meta * diaMes() / 30 ? '' : 'ouro'}"><i style="width:${Math.min(100, f / v.meta * 100)}%"></i></div></div><span class="mono">${Math.round(f / v.meta * 100)}%</span></li>`).join('')}</ul></section>
    <section class="pn c4"><div class="pn-cab"><h2>Quando a loja vende</h2><span class="sub">30 dias, por hora</span></div><div class="mapa">${mapa.map((l, dw) => `<span>${dn[dw]}</span>${l.map((x, hh) => `<i style="opacity:${(0.08 + x / mmax * .92).toFixed(2)}" title="${dn[dw]} ${hh + 8}h: ${R(x)}"></i>`).join('')}`).join('')}<span></span>${Array.from({ length: 13 }, (_, i) => `<span style="text-align:center">${i % 3 === 0 ? i + 8 : ''}</span>`).join('')}</div></section>
  </div>`;
}

function mPdv() {
  const it = db.pdv.itens, total = soma(it, (x) => x.qtd * prod(x.id).preco), un = db.un === 'todas' ? 'matriz' : db.un;
  return `<div class="mod-cab"><div><h1>Frente de caixa · ${UN[un]}</h1><p>Leia o código ou digite o SKU. Para várias unidades use <span class="mono">3*CF-401</span>. Enter põe na venda.</p></div><div class="acoes"><button class="btn" data-acao="limpar-pdv" ${it.length ? '' : 'disabled'}>Cancelar venda</button></div></div>
  <div class="pdv"><div>
    <form class="leitor" id="leitor"><input class="campo" id="leitor-in" placeholder="Código, SKU ou nome do produto" autocomplete="off" aria-label="Código do produto" list="lista-prod"><button class="btn prim">Pôr</button></form>
    <datalist id="lista-prod">${db.produtos.map((p) => `<option value="${p.sku}">${esc(p.nome)}</option>`).join('')}</datalist>
    <div class="tab-caixa"><table><thead><tr><th>#</th><th>SKU</th><th>Produto</th><th class="n">Qtd</th><th class="n">Unitário</th><th class="n">Total</th><th class="n">Estoque ${UN[un]}</th><th></th></tr></thead><tbody>
    ${it.map((x, i) => { const p = prod(x.id); return `<tr><td class="n">${i + 1}</td><td class="mono">${p.sku}</td><td>${esc(p.nome)}${p.perecivel ? ' <span class="tag alerta">lote</span>' : ''}</td><td class="n">${x.qtd}</td><td class="n">${R(p.preco)}</td><td class="n"><b>${R(x.qtd * p.preco)}</b></td><td class="n">${p.est[un]}</td><td class="n"><button class="btn peq" data-acao="tirar-item" data-i="${i}" aria-label="Tirar ${esc(p.nome)}">${I.x}</button></td></tr>`; }).join('') || '<tr><td colspan="8" class="vazio" style="text-align:center;padding:30px">Nenhum item. Leia o primeiro código.</td></tr>'}
    </tbody></table></div></div>
    <aside class="total-pdv"><span class="sub" style="color:var(--lavanda)">Total da venda</span><span class="val">${R(total)}</span>
      <div class="l"><span>Itens</span><span class="mono">${soma(it, (x) => x.qtd)}</span></div>
      <div class="form" style="margin-top:10px"><label style="color:var(--lavanda-2)">Vendedor<select class="campo" id="pdv-vend">${db.vendedores.filter((v) => v.un === un).map((v) => `<option value="${v.id}" ${db.pdv.vend === v.id ? 'selected' : ''}>${esc(v.nome)}</option>`).join('')}</select></label>
      <label style="color:var(--lavanda-2)">Cliente (CPF/CNPJ na nota)<select class="campo" id="pdv-cli"><option value="">Consumidor final</option>${db.clientes.map((c) => `<option value="${c.id}" ${db.pdv.cli === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label></div>
      <div class="pagtos">${[['Pix', 'F5'], ['Crédito', ''], ['Débito', ''], ['Dinheiro', '']].map(([f, k]) => `<button data-acao="pagar" data-f="${f}" ${it.length ? '' : 'disabled'}>${f}${k ? `<kbd>${k}</kbd>` : ''}</button>`).join('')}</div>
      <button class="btn ouro" style="width:100%" data-acao="pagar" data-f="" ${it.length ? '' : 'disabled'}>Dividir pagamento e emitir nota <span class="k">F10</span></button>
    </aside></div>`;
}

function mEstoque() {
  const v30 = vendidos30(), q = norm(db.busca.estoque || ''), aba = db.estoqueAba;
  const seg = `<div class="seg" role="group" aria-label="Visão do estoque">${[['posicao', 'Posição'], ['lotes', 'Lotes e validade'], ['movs', 'Movimentações']].map(([k, n]) => `<button data-acao="estoque-aba" data-v="${k}" aria-pressed="${aba === k}">${n}</button>`).join('')}</div>`;
  let corpo = '';
  if (aba === 'posicao') {
    const lista = db.produtos.filter((p) => !q || norm(p.nome).includes(q) || norm(p.sku).includes(q));
    corpo = `<div class="tab-caixa"><table><thead><tr><th>SKU</th><th>Produto</th><th>Categoria</th><th class="n">Matriz</th><th class="n">Filial</th><th class="n">Mínimo</th><th class="n">Giro 30 dias</th><th class="n">Cobertura</th><th>Situação</th><th></th></tr></thead><tbody>
    ${lista.map((p) => { const c = cobertura(p, v30), t = totalEst(p); return `<tr><td class="mono">${p.sku}</td><td>${esc(p.nome)}</td><td>${p.cat}</td><td class="n">${p.est.matriz}</td><td class="n">${p.est.filial}</td><td class="n">${p.min}</td><td class="n">${v30[p.id] || 0}</td><td class="n">${c === Infinity ? '—' : `${Math.round(c)} d`}</td><td>${t < p.min ? '<span class="tag erro">abaixo do mínimo</span>' : c < 12 ? '<span class="tag alerta">repor logo</span>' : c > 90 ? '<span class="tag ard">parado</span>' : '<span class="tag ok">ok</span>'}</td><td class="n"><button class="btn peq" data-acao="transferir" data-id="${p.id}">Transferir</button> <button class="btn peq" data-acao="ajustar" data-id="${p.id}">Ajustar</button></td></tr>`; }).join('')}</tbody></table></div>`;
  } else if (aba === 'lotes') {
    const ls = db.produtos.flatMap((p) => p.lotes.filter((l) => l.qtd > 0 && (db.un === 'todas' || l.un === db.un)).map((l) => ({ p, l }))).sort((a, b) => a.l.vence - b.l.vence);
    corpo = `<p class="sub">O caixa vende primeiro o lote que vence antes. Lotes vencidos ou perdidos saem por baixa, com registro na auditoria.</p><div class="tab-caixa"><table><thead><tr><th>Lote</th><th>Produto</th><th>Unidade</th><th class="n">Qtd</th><th class="n">Vence</th><th class="n">Valor (custo)</th><th>Situação</th><th></th></tr></thead><tbody>
    ${ls.map(({ p, l }) => `<tr><td class="mono">${l.lote}</td><td>${esc(p.nome)}</td><td>${UN[l.un]}</td><td class="n">${l.qtd}</td><td class="n">${data(l.vence)} <span class="sub">(${l.vence} d)</span></td><td class="n">${R(l.qtd * p.custo)}</td><td>${l.vence <= 3 ? '<span class="tag erro">vence já</span>' : l.vence <= 10 ? '<span class="tag alerta">fazer promoção</span>' : '<span class="tag ok">no prazo</span>'}</td><td class="n">${l.vence <= 10 ? `<button class="btn peq" data-acao="promo" data-id="${p.id}">Promoção</button> ` : ''}<button class="btn peq" data-acao="baixa-lote" data-id="${p.id}" data-lote="${l.lote}" data-un="${l.un}">Dar baixa</button></td></tr>`).join('')}</tbody></table></div>`;
  } else {
    corpo = `<div class="tab-caixa"><table><thead><tr><th>Quando</th><th>Tipo</th><th>O que</th><th>Quem</th></tr></thead><tbody>${[...db.movs].sort((a, b) => b.dia - a.dia || b.hora.localeCompare(a.hora)).map((m) => `<tr><td class="mono">${data(m.dia)} ${m.hora}</td><td><span class="tag ${m.tipo === 'Perda' ? 'erro' : m.tipo === 'Entrada' ? 'ok' : 'lav'}">${m.tipo}</span></td><td>${esc(m.txt)}</td><td>${esc(m.quem)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  return `<div class="mod-cab"><div><h1>Estoque</h1><p>${db.produtos.length} produtos · ${Rk(soma(db.produtos, (p) => totalEst(p) * p.custo))} ${unTxt()} · ${soma(db.produtos, (p) => p.lotes.length)} lotes controlados</p></div><div class="acoes"><button class="btn" data-acao="transferir">Transferir entre unidades</button><button class="btn prim" data-acao="novo-produto">${I.mais}Novo produto</button></div></div>
  <div class="filtros">${seg}${aba === 'posicao' ? `<input class="campo" id="busca-estoque" placeholder="Filtrar por nome ou SKU" value="${esc(db.busca.estoque || '')}" style="flex:1;max-width:320px">` : ''}</div>${corpo}`;
}

function sugestao() {
  const v30 = vendidos30();
  return db.produtos.map((p) => { const g = (v30[p.id] || 0) / 30, alvo = Math.max(p.min * 2, Math.ceil(g * 30)), t = p.est.matriz + p.est.filial; return { p, q: Math.max(0, alvo - t), cob: g ? t / g : Infinity }; }).filter((x) => x.q > 0 && (x.cob < 15 || x.p.est.matriz + x.p.est.filial < x.p.min));
}
function mCompras() {
  const sug = sugestao(), porF = {}; sug.forEach((x) => { (porF[x.p.forn] ||= []).push(x); });
  return `<div class="mod-cab"><div><h1>Compras</h1><p>A sugestão olha o giro dos últimos 30 dias e o estoque mínimo, para comprar o suficiente para 1 mês.</p></div><div class="acoes"><button class="btn prim" data-acao="gerar-pedidos" ${sug.length ? '' : 'disabled'}>Gerar ${Object.keys(porF).length} pedidos da sugestão</button></div></div>
  <div class="bento">
    <section class="pn c7"><div class="pn-cab"><h2>Sugestão de compra</h2><span class="tag lav">${sug.length} itens · ${R(soma(sug, (x) => x.q * x.p.custo))}</span></div>
      ${sug.length ? `<div class="tab-caixa"><table><thead><tr><th>Fornecedor</th><th>Produto</th><th class="n">Tem</th><th class="n">Cobertura</th><th class="n">Comprar</th><th class="n">Custo</th></tr></thead><tbody>${sug.map((x) => `<tr><td>${esc(forn(x.p.forn).nome)}</td><td>${esc(x.p.nome)}</td><td class="n">${x.p.est.matriz + x.p.est.filial}</td><td class="n">${x.cob === Infinity ? '—' : `${Math.round(x.cob)} d`}</td><td class="n"><b>${x.q}</b></td><td class="n">${R(x.q * x.p.custo)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="vazio">Nada para comprar agora: todos os produtos têm mais de 15 dias de estoque.</p>'}
    </section>
    <section class="pn c5"><div class="pn-cab"><h2>Pedidos</h2><button class="btn peq" data-acao="novo-pedido">${I.mais}Pedido manual</button></div>
      <ul class="lista">${[...db.pedidos].sort((a, b) => b.num - a.num).map((o) => `<li><div class="cresce"><b>Pedido ${o.num} · ${esc(forn(o.forn).nome)}</b><span>${o.itens.length} itens · ${R(soma(o.itens, (x) => x.qtd * x.custo))} · ${data(o.dia)}</span></div><span class="tag ${o.status === 'Recebido' ? 'ok' : o.status === 'Enviado' ? 'lav' : ''}">${o.status}</span>${o.status === 'Rascunho' ? `<button class="btn peq" data-acao="enviar-pedido" data-id="${o.id}">Enviar</button>` : o.status === 'Enviado' ? `<button class="btn peq prim" data-acao="receber-pedido" data-id="${o.id}">Receber</button>` : ''}</li>`).join('') || '<li class="vazio">Nenhum pedido.</li>'}</ul></section>
  </div>`;
}

function mFinanceiro() {
  const aba = db.finAba, seg = `<div class="seg" role="group" aria-label="Visão do financeiro">${[['fluxo', 'Fluxo de caixa'], ['contas', 'Contas'], ['dre', 'DRE do mês']].map(([k, n]) => `<button data-acao="fin-aba" data-v="${k}" aria-pressed="${aba === k}">${n}</button>`).join('')}</div>`;
  let corpo = '';
  if (aba === 'fluxo') {
    const fl = fluxo().filter((p) => p.ent || p.sai);
    corpo = `<div class="tab-caixa"><table><thead><tr><th>Dia</th><th class="n">Entra</th><th class="n">Sai</th><th class="n">Saldo previsto</th></tr></thead><tbody>${fl.map((p) => `<tr><td class="mono">${data(p.d)}${p.d === 0 ? ' (hoje, com o que já venceu)' : ''}</td><td class="n" style="color:var(--ok)">${p.ent ? R(p.ent) : ''}</td><td class="n" style="color:var(--erro)">${p.sai ? R(p.sai) : ''}</td><td class="n"><b style="color:${p.s < 0 ? 'var(--erro)' : 'inherit'}">${R(p.s)}</b></td></tr>`).join('')}</tbody></table></div><p class="sub">Saldo em conta hoje: ${R(db.saldoBanco)}. As vendas entram pela média das últimas 2 semanas (parte à vista); cartão de crédito entra pelos repasses lançados em Contas.</p>`;
  } else if (aba === 'contas') {
    const ks = [...db.contas].sort((a, b) => a.pago - b.pago || a.vence - b.vence);
    corpo = `<div class="tab-caixa"><table><thead><tr><th>Tipo</th><th>Descrição</th><th>Categoria</th><th class="n">Vencimento</th><th class="n">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${ks.map((k) => `<tr><td><span class="tag ${k.tipo === 'pagar' ? 'erro' : 'ok'}">${k.tipo === 'pagar' ? 'pagar' : 'receber'}</span></td><td>${esc(k.nome)}</td><td>${k.cat}</td><td class="n mono">${data(k.vence)}</td><td class="n">${R(k.valor)}</td><td>${k.pago ? '<span class="tag ok">baixada</span>' : k.vence < 0 ? '<span class="tag erro">vencida</span>' : k.vence <= 3 ? '<span class="tag alerta">vence logo</span>' : '<span class="tag">em aberto</span>'}</td><td class="n">${k.pago ? '' : `<button class="btn peq" data-acao="baixar" data-id="${k.id}">Baixar</button>`}</td></tr>`).join('')}</tbody></table></div>`;
  } else {
    const mes = doMes(), rb = soma(mes, (v) => v.total), imp = rb * .067, cmv = soma(mes, custoVenda), lb = rb - imp - cmv;
    const desp = {}; db.contas.filter((k) => k.tipo === 'pagar' && k.cat !== 'Fornecedor' && k.cat !== 'Impostos').forEach((k) => { desp[k.cat] = (desp[k.cat] || 0) + k.valor; });
    const td = soma(Object.values(desp), (x) => x), res = lb - td;
    const l = (n, v, cls = '', ind = 0) => `<tr class="${cls}"><td style="padding-left:${10 + ind * 18}px">${n}</td><td class="n">${v < 0 ? `− ${R(-v)}` : R(v)}</td><td class="n">${rb ? (v < 0 ? `− ${pct(-v / rb)}` : pct(v / rb)) : '—'}</td></tr>`;
    corpo = `<div class="tab-caixa" style="max-width:720px"><table><thead><tr><th>Demonstrativo de resultado · mês atual · ${unTxt()}</th><th class="n">Valor</th><th class="n">% da receita</th></tr></thead><tbody>
      ${l('<b>Receita bruta de vendas</b>', rb)}${l('(−) Simples Nacional estimado (6,7%)', -imp, '', 1)}${l('(−) Custo das mercadorias vendidas', -cmv, '', 1)}${l('<b>= Lucro bruto</b>', lb)}
      ${Object.entries(desp).map(([c, v]) => l(`(−) ${c}`, -v, '', 1)).join('')}${l(`<b>= Resultado do mês ${res >= 0 ? '(lucro)' : '(prejuízo)'}</b>`, res, 'sel')}
    </tbody></table></div><p class="sub">Despesas pelo mês cheio (contas lançadas). O imposto é estimado pela alíquota efetiva do Simples informada na configuração.</p>`;
  }
  return `<div class="mod-cab"><div><h1>Financeiro</h1><p>Saldo em conta ${R(db.saldoBanco)} · a pagar ${R(soma(db.contas.filter((k) => k.tipo === 'pagar' && !k.pago), (k) => k.valor))} · a receber ${R(soma(db.contas.filter((k) => k.tipo === 'receber' && !k.pago), (k) => k.valor))}</p></div><div class="acoes"><button class="btn prim" data-acao="nova-conta">${I.mais}Lançar conta</button></div></div><div class="filtros">${seg}</div>${corpo}`;
}

function grupo(c, top) { return c.ultima > 45 ? ['em risco', 'erro'] : c.compras <= 2 ? ['novo', 'lav'] : c.gasto >= top ? ['VIP', 'alerta'] : ['regular', '']; }
function mClientes() {
  const ord = [...db.clientes].sort((a, b) => b.gasto - a.gasto), top = ord[Math.min(2, ord.length - 1)]?.gasto || 0;
  const cont = {}; db.clientes.forEach((c) => { const g = grupo(c, top)[0]; cont[g] = (cont[g] || 0) + 1; });
  return `<div class="mod-cab"><div><h1>Clientes</h1><p>${Object.entries(cont).map(([g, n]) => `${n} ${g}`).join(' · ')} · ${R(soma(db.clientes, (c) => c.saldo))} a receber em vendas a prazo</p></div><div class="acoes"><button class="btn prim" data-acao="novo-cliente">${I.mais}Novo cliente</button></div></div>
  <div class="tab-caixa"><table><thead><tr><th>Cliente</th><th>CPF/CNPJ</th><th>Grupo</th><th class="n">Compras (30 d)</th><th class="n">Gasto (30 d)</th><th class="n">Última compra</th><th class="n">Saldo a prazo</th><th>Crédito usado</th><th></th></tr></thead><tbody>
  ${ord.map((c) => { const g = grupo(c, top), uso = c.limite ? c.saldo / c.limite : 0; return `<tr><td><b>${esc(c.nome)}</b></td><td class="mono">${c.doc}</td><td><span class="tag ${g[1]}">${g[0]}</span></td><td class="n">${c.compras}</td><td class="n">${R(c.gasto)}</td><td class="n">${c.ultima > 900 ? '—' : c.ultima === 0 ? 'hoje' : `há ${c.ultima} d`}</td><td class="n">${R(c.saldo)}</td><td style="min-width:120px"><div class="barra-h ${uso > .8 ? '' : 'ouro'}"><i style="width:${Math.min(100, uso * 100)}%"></i></div><span class="sub">${pct(uso)} de ${Rk(c.limite)}</span></td><td class="n"><button class="btn peq" data-acao="limite" data-id="${c.id}">Crédito</button></td></tr>`; }).join('')}</tbody></table></div>`;
}

function mEquipe() {
  const mes = db.vendas.filter((v) => v.dia > -diaMes());
  return `<div class="mod-cab"><div><h1>Equipe e metas</h1><p>Metas do mês e comissões calculadas sobre o que cada um vendeu.</p></div></div>
  <div class="tab-caixa"><table><thead><tr><th>Vendedor</th><th>Unidade</th><th class="n">Vendas</th><th class="n">Vendido no mês</th><th class="n">Meta</th><th>Andamento</th><th class="n">Ticket médio</th><th class="n">Comissão</th><th class="n">A pagar</th><th></th></tr></thead><tbody>
  ${db.vendedores.map((v) => { const vs = mes.filter((x) => x.vend === v.id), f = soma(vs, (x) => x.total), ritmo = f / v.meta >= diaMes() / 30; return `<tr><td><b>${esc(v.nome)}</b></td><td>${UN[v.un]}</td><td class="n">${vs.length}</td><td class="n">${R(f)}</td><td class="n">${R(v.meta)}</td><td style="min-width:150px"><div class="barra-h ${ritmo ? '' : 'ouro'}"><i style="width:${Math.min(100, f / v.meta * 100)}%"></i></div><span class="sub">${pct(f / v.meta)} · ${ritmo ? 'no ritmo' : 'abaixo do ritmo'}</span></td><td class="n">${R(f / Math.max(1, vs.length))}</td><td class="n">${v.comissao.toLocaleString('pt-BR')}%</td><td class="n"><b>${R(f * v.comissao / 100)}</b></td><td class="n"><button class="btn peq" data-acao="editar-vend" data-id="${v.id}">Editar</button></td></tr>`; }).join('')}</tbody></table></div>`;
}

function mFiscal() {
  const f = db.busca.fiscal || 'atencao', ns = vendasUn().filter((v) => (f === 'atencao' ? v.nota.status !== 'Autorizada' : true)).sort((a, b) => b.nota.num - a.nota.num).slice(0, 80);
  const cont = (s) => vendasUn().filter((v) => v.nota.status === s).length;
  return `<div class="mod-cab"><div><h1>Notas fiscais</h1><p>${cont('Autorizada')} autorizadas · ${cont('Rejeitada')} rejeitadas · ${cont('Contingência')} em contingência (30 dias, ${unTxt()})</p></div><div class="acoes"><button class="btn prim" data-acao="reenviar-todas" ${cont('Rejeitada') + cont('Contingência') ? '' : 'disabled'}>Corrigir e reenviar todas</button></div></div>
  <div class="filtros"><div class="seg">${[['atencao', 'Precisam de atenção'], ['todas', 'Últimas 80']].map(([k, n]) => `<button data-acao="fiscal-filtro" data-v="${k}" aria-pressed="${f === k}">${n}</button>`).join('')}</div></div>
  <div class="tab-caixa"><table><thead><tr><th>Número</th><th>Tipo</th><th>Data</th><th>Unidade</th><th>Destinatário</th><th class="n">Valor</th><th>Situação</th><th>Detalhe</th><th></th></tr></thead><tbody>
  ${ns.map((v) => `<tr><td class="mono">${v.nota.num}</td><td>${v.nota.tipo}</td><td class="mono">${data(v.dia)} ${String(v.hora).padStart(2, '0')}h</td><td>${UN[v.un]}</td><td>${v.cli ? esc(cli(v.cli).nome) : 'Consumidor final'}</td><td class="n">${R(v.total)}</td><td><span class="tag ${v.nota.status === 'Autorizada' ? 'ok' : v.nota.status === 'Rejeitada' ? 'erro' : 'alerta'}">${v.nota.status}</span></td><td class="sub">${esc(v.nota.motivo)}</td><td class="n">${v.nota.status !== 'Autorizada' ? `<button class="btn peq" data-acao="reenviar" data-n="${v.n}">Reenviar</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="9" class="vazio" style="text-align:center;padding:24px">Todas as notas estão autorizadas.</td></tr>'}</tbody></table></div>`;
}

function mRelatorios() {
  const a = abc(), cats = {}; vendasUn().forEach((v) => v.itens.forEach((x) => { const c = prod(x.id).cat; cats[c] ||= { r: 0, l: 0 }; cats[c].r += x.qtd * x.preco; cats[c].l += x.qtd * (x.preco - x.custo); }));
  const nA = a.filter((x) => x.classe === 'A').length;
  return `<div class="mod-cab"><div><h1>Relatórios</h1><p>Curva ABC dos últimos 30 dias: ${nA} produtos (classe A) fazem 80% da receita ${unTxt()}.</p></div><div class="acoes"><button class="btn" data-acao="exportar-abc">Exportar planilha (CSV)</button></div></div>
  <div class="bento"><section class="pn c8"><div class="pn-cab"><h2>Curva ABC</h2></div><div class="tab-caixa" style="max-height:52vh"><table><thead><tr><th>Classe</th><th>SKU</th><th>Produto</th><th class="n">Receita</th><th class="n">Participação</th><th class="n">Acumulado</th></tr></thead><tbody>
  ${a.map((x) => `<tr><td><span class="tag ${x.classe === 'A' ? 'lav' : x.classe === 'B' ? 'alerta' : ''}">${x.classe}</span></td><td class="mono">${x.p.sku}</td><td>${esc(x.p.nome)}</td><td class="n">${R(x.r)}</td><td class="n">${pct(x.part)}</td><td class="n">${pct(x.acc)}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="pn c4"><div class="pn-cab"><h2>Margem por categoria</h2></div><ul class="lista">${Object.entries(cats).sort((x, y) => y[1].r - x[1].r).map(([c, v]) => `<li><div class="cresce"><b>${c}</b><div class="barra-h"><i style="width:${v.l / v.r * 100}%"></i></div></div><div style="text-align:right"><span class="mono">${pct(v.l / v.r)}</span><br><span class="sub">${Rk(v.r)}</span></div></li>`).join('')}</ul></section></div>`;
}

function mAuditoria() {
  const q = norm(db.busca.auditoria || ''), ls = [...db.log].sort((a, b) => b.dia - a.dia || b.hora.localeCompare(a.hora)).filter((l) => !q || norm(`${l.quem} ${l.txt}`).includes(q));
  return `<div class="mod-cab"><div><h1>Auditoria</h1><p>Tudo o que muda preço, estoque, dinheiro ou nota fica registrado com quem fez e quando. Ninguém apaga.</p></div></div>
  <div class="filtros"><input class="campo" id="busca-auditoria" placeholder="Filtrar por pessoa ou assunto" value="${esc(db.busca.auditoria || '')}" style="flex:1;max-width:360px"></div>
  <div class="tab-caixa"><table><thead><tr><th>Quando</th><th>Quem</th><th>O que aconteceu</th></tr></thead><tbody>${ls.map((l) => `<tr><td class="mono">${data(l.dia)} ${l.hora}</td><td>${esc(l.quem)}</td><td>${esc(l.txt)}</td></tr>`).join('')}</tbody></table></div>`;
}

function mModulos() {
  return `<div class="mod-cab"><div><h1>Módulos</h1><p>Abra quantos quiser: cada um fica numa aba lá em cima.</p></div></div><div class="lancador">${Object.entries(MOD).filter(([k]) => k !== 'modulos').map(([k, m]) => `<button class="mod" data-acao="abrir" data-m="${k}"><span class="ico">${I[k]}</span><b>${m.nome}</b><small>${m.desc}${m.k ? ` · <kbd>${m.k}</kbd>` : ''}</small></button>`).join('')}</div>`;
}

const mDono = () => `<div class="mod-cab"><div><h1>Painel do dono</h1><p>Equipe das duas unidades, cargos, o que cada pessoa pode fazer em cada módulo e o seu plano. Só o dono e os administradores veem.</p></div></div><div id="ga-dono"></div>`;
const DONO = { sistema: 'Veltria Gestão Avançado', preco: 199, chave: CHAVE, empresa: 'Emporio Vila Nobre', dono: OPERADOR,
  areas: [['pdv', 'Frente de caixa'], ['estoque', 'Estoque'], ['compras', 'Compras'], ['financeiro', 'Financeiro'], ['clientes', 'Clientes'], ['equipe', 'Equipe e metas'], ['fiscal', 'Notas fiscais'], ['relatorios', 'Relatórios']],
  cargos: {
    'Operador de caixa': { pdv: 'editar', estoque: 'ver', compras: 'nenhum', financeiro: 'nenhum', clientes: 'ver', equipe: 'nenhum', fiscal: 'ver', relatorios: 'nenhum' },
    Vendedor: { pdv: 'editar', estoque: 'ver', compras: 'nenhum', financeiro: 'nenhum', clientes: 'editar', equipe: 'ver', fiscal: 'nenhum', relatorios: 'nenhum' },
    Comprador: { pdv: 'nenhum', estoque: 'editar', compras: 'editar', financeiro: 'ver', clientes: 'nenhum', equipe: 'nenhum', fiscal: 'ver', relatorios: 'ver' },
    Financeiro: { pdv: 'ver', estoque: 'ver', compras: 'ver', financeiro: 'editar', clientes: 'editar', equipe: 'ver', fiscal: 'editar', relatorios: 'editar' },
    'Gerente de loja': { pdv: 'editar', estoque: 'editar', compras: 'editar', financeiro: 'ver', clientes: 'editar', equipe: 'editar', fiscal: 'editar', relatorios: 'editar' } },
  equipe: [['Diego Albuquerque', 'Gerente de loja'], ['Paula Moraes', 'Gerente de loja'], ['Caio Teixeira', 'Vendedor'], ['Marta Lins', 'Financeiro'], ['Jonas Reis', 'Comprador']] };
function ia() {
  const mes = doMes();
  abrirIA({ sistema: 'Veltria Gestão Avançado', telas: Object.values(MOD).filter((m) => m.desc).map((m) => m.nome),
    numeros: () => [['faturamento do mês', Rk(soma(mes, (v) => v.total))], ['meta do mês', Rk(metaMes())], ['menor saldo previsto em 30 dias', R(fluxo().reduce((a, b) => (b.s < a.s ? b : a)).s)], ['capital em estoque', Rk(soma(db.produtos, (p) => totalEst(p) * p.custo))]],
    alertas: () => [...db.produtos.filter((p) => totalEst(p) < p.min).slice(0, 3).map((p) => `${p.nome} abaixo do mínimo`), ...lotesVencendo(7).slice(0, 2).map(({ p, l }) => `lote ${l.lote} de ${p.nome} vence em ${l.vence} dias`), ...db.contas.filter((k) => !k.pago && k.vence < 0).map((k) => `conta vencida: ${k.nome}`), ...(vendasUn().some((v) => v.nota.status === 'Rejeitada') ? ['há notas fiscais rejeitadas para reenviar'] : [])] });
}
const RENDER = { dono: mDono, cockpit: mCockpit, pdv: mPdv, estoque: mEstoque, compras: mCompras, financeiro: mFinanceiro, clientes: mClientes, equipe: mEquipe, fiscal: mFiscal, relatorios: mRelatorios, auditoria: mAuditoria, modulos: mModulos };

function desenhar() {
  $('#abas').innerHTML = db.abas.map((m) => `<div class="aba" role="tab" tabindex="0" aria-selected="${m === db.ativa}" data-acao="abrir" data-m="${m}">${I[m]}<span>${MOD[m].nome}</span>${db.abas.length > 1 ? `<span class="fechar-aba" role="button" aria-label="Fechar ${MOD[m].nome}" data-acao="fechar-aba" data-m="${m}">${I.x}</span>` : ''}</div>`).join('') + `<button class="aba-nova" data-acao="abrir" data-m="modulos" aria-label="Abrir módulo">${I.mais}</button>`;
  $('#area').innerHTML = RENDER[db.ativa]();
  if (db.ativa === 'dono') painelDono($('#ga-dono'), DONO);
  $('#filial').value = db.un;
  document.title = `${MOD[db.ativa].nome} · Veltria Gestão Avançado`;
  status();
}
function status() {
  $('#status').innerHTML = `<span><i class="pt"></i><b>Online</b> · sincronizado</span><span>Operador <b>${OPERADOR}</b> (gerente)</span><span>Caixa 01 <b>aberto</b> desde 08:02</span><span>Unidade <b>${db.un === 'todas' ? 'todas' : UN[db.un]}</b></span><span class="atalhos">${Object.entries(TECLAS).slice(1, 6).map(([k, m]) => `<button data-acao="abrir" data-m="${m}">${k} ${MOD[m].nome.split(' ')[0]}</button>`).join('')}<b>${agoraTxt()}</b></span>`;
}

// ---------------------------------------------------------------- ações
function porNoPdv(texto) {
  const m = String(texto).trim().match(/^(\d+)\s*\*\s*(.+)$/), qtd = m ? Number(m[1]) : 1, q = norm(m ? m[2] : texto);
  if (!q) return;
  const p = db.produtos.find((x) => norm(x.sku) === q) || db.produtos.find((x) => norm(x.nome).includes(q));
  if (!p) { avisar(`Nenhum produto com "${texto}".`); return; }
  const un = db.un === 'todas' ? 'matriz' : db.un, it = db.pdv.itens.find((x) => x.id === p.id), ja = it?.qtd || 0;
  if (ja + qtd > p.est[un]) { avisar(`${p.nome}: só há ${p.est[un]} na ${UN[un]}.`); return; }
  if (it) it.qtd += qtd; else db.pdv.itens.push({ id: p.id, qtd });
  gravar(); desenhar(); $('#leitor-in')?.focus();
}
function pagar(forma) {
  const it = db.pdv.itens; if (!it.length) return;
  const total = soma(it, (x) => x.qtd * prod(x.id).preco), un = db.un === 'todas' ? 'matriz' : db.un;
  const formas = ['Pix', 'Crédito', 'Débito', 'Dinheiro', 'A prazo'];
  janela(`Pagamento · ${R(total)}`, `<form class="form" id="f"><p class="dica" style="margin:0">Divida entre as formas que o cliente usar. A nota sai assim que o total fechar.</p>${formas.map((f) => `<label>${f}${f === 'A prazo' ? ' <span class="dica">(precisa de cliente com crédito)</span>' : ''}<input class="campo" name="${f}" inputmode="decimal" value="${f === forma ? total.toFixed(2).replace('.', ',') : ''}" placeholder="0,00"></label>`).join('')}<p class="mono" id="falta"></p></form>`, 'Emitir nota e concluir', () => {
    const fd = new FormData($('#f')), parts = formas.map((f) => [f, num(fd.get(f)) || 0]).filter((x) => x[1] > 0), pago = soma(parts, (x) => x[1]);
    if (pago + 0.005 < total) return erroJanela(`Faltam ${R(total - pago)}.`);
    const prazo = parts.find((x) => x[0] === 'A prazo'), c = cli(db.pdv.cli);
    if (prazo && !c) return erroJanela('Venda a prazo precisa de um cliente.');
    if (prazo && c.saldo + prazo[1] > c.limite) return erroJanela(`Passa do crédito de ${c.nome} (${R(c.limite - c.saldo)} livres).`);
    const troco = Math.max(0, pago - total);
    if (troco && !parts.some((x) => x[0] === 'Dinheiro')) return erroJanela('Só dá troco quando entra dinheiro.');
    const itens = it.map((x) => { const p = prod(x.id); p.est[un] -= x.qtd; let r = x.qtd; p.lotes.filter((l) => l.un === un && l.qtd > 0).sort((a, b) => a.vence - b.vence).forEach((l) => { const t = Math.min(r, l.qtd); l.qtd -= t; r -= t; }); return { id: p.id, qtd: x.qtd, preco: p.preco, custo: p.custo }; });
    const v = { n: db.proxVenda++, dia: 0, hora: new Date().getHours(), un, vend: db.pdv.vend, itens, total, pag: parts.map((x) => x[0]).join(' + '), cli: c?.id || '', nota: { tipo: c && c.doc.includes('/') ? 'NF-e' : 'NFC-e', num: db.proxNota++, status: 'Autorizada', motivo: '' } };
    db.vendas.push(v);
    if (c) { c.compras++; c.gasto += total; c.ultima = 0; if (prazo) c.saldo += prazo[1]; }
    registrar(`Venda ${v.n} de ${R(total)} na ${UN[un]} (${v.pag}); ${v.nota.tipo} ${v.nota.num} autorizada`);
    db.pdv = { itens: [], cli: '', vend: db.pdv.vend };
    avisar(`Venda ${v.n} concluída. ${v.nota.tipo} ${v.nota.num} autorizada.${troco ? ` Troco: ${R(troco)}.` : ''}`);
    return true;
  });
  const conta = () => { const fd = new FormData($('#f')), pago = soma(formas, (f) => num(fd.get(f)) || 0); $('#falta').textContent = pago + 0.005 < total ? `Falta ${R(total - pago)}` : pago > total + 0.005 ? `Troco ${R(pago - total)}` : 'Total fechado.'; };
  $('#f').addEventListener('input', conta); conta();
}
function transferir(id) {
  const p = id ? prod(id) : db.produtos[0];
  janela('Transferir entre unidades', `<form class="form" id="f"><label>Produto<select class="campo" name="id">${db.produtos.map((x) => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${x.sku} · ${esc(x.nome)} (M ${x.est.matriz} / F ${x.est.filial})</option>`).join('')}</select></label>
    <div class="dupla"><label>De<select class="campo" name="de"><option value="matriz">Matriz</option><option value="filial">Filial</option></select></label><label>Quantidade<input class="campo" name="qtd" type="number" min="1" value="1"></label></div></form>`, 'Transferir', () => {
    const fd = new FormData($('#f')), x = prod(fd.get('id')), de = fd.get('de'), para = de === 'matriz' ? 'filial' : 'matriz', q = Math.floor(num(fd.get('qtd')));
    if (!(q > 0)) return erroJanela('Coloque a quantidade.');
    if (q > x.est[de]) return erroJanela(`A ${UN[de]} só tem ${x.est[de]}.`);
    x.est[de] -= q; x.est[para] += q;
    let r = q; x.lotes.filter((l) => l.un === de && l.qtd > 0).sort((a, b) => a.vence - b.vence).forEach((l) => { const t = Math.min(r, l.qtd); if (t) { l.qtd -= t; x.lotes.push({ ...l, qtd: t, un: para }); r -= t; } });
    db.movs.push({ dia: 0, hora: agoraTxt(), tipo: 'Transferência', txt: `${q}× ${x.nome}: ${UN[de]} → ${UN[para]}`, quem: OPERADOR });
    registrar(`Transferiu ${q}× ${x.nome} da ${UN[de]} para a ${UN[para]}`); avisar('Transferência registrada.'); return true;
  });
}
function ajustar(id) {
  const p = prod(id);
  janela(`Ajustar estoque · ${esc(p.nome)}`, `<form class="form" id="f"><p class="dica" style="margin:0">Use depois de contar a prateleira (inventário). O motivo fica na auditoria.</p><div class="dupla"><label>Matriz (contado)<input class="campo" name="matriz" type="number" min="0" value="${p.est.matriz}"></label><label>Filial (contado)<input class="campo" name="filial" type="number" min="0" value="${p.est.filial}"></label></div><label>Motivo<select class="campo" name="motivo"><option>Inventário</option><option>Avaria</option><option>Furto ou perda</option><option>Consumo interno</option></select></label></form>`, 'Salvar ajuste', () => {
    const fd = new FormData($('#f')), m = Math.floor(num(fd.get('matriz'))), f = Math.floor(num(fd.get('filial')));
    if (!(m >= 0 && f >= 0)) return erroJanela('Quantidades inválidas.');
    const dif = m + f - p.est.matriz - p.est.filial; p.est.matriz = m; p.est.filial = f;
    db.movs.push({ dia: 0, hora: agoraTxt(), tipo: dif < 0 ? 'Perda' : 'Ajuste', txt: `${p.nome}: ${dif >= 0 ? '+' : ''}${dif} (${fd.get('motivo')})`, quem: OPERADOR });
    registrar(`Ajustou o estoque de ${p.nome} em ${dif >= 0 ? '+' : ''}${dif} un. (${fd.get('motivo')})`); avisar('Estoque ajustado.'); return true;
  });
}
function gerarPedidos() {
  const porF = {}; sugestao().forEach((x) => { (porF[x.p.forn] ||= []).push({ id: x.p.id, qtd: x.q, custo: x.p.custo }); });
  Object.entries(porF).forEach(([f, itens]) => { db.pedidos.push({ id: `o${Date.now()}${f}`, num: db.proxPedido++, forn: f, itens, status: 'Rascunho', dia: 0 }); });
  registrar(`Gerou ${Object.keys(porF).length} pedidos de compra pela sugestão automática`); avisar(`${Object.keys(porF).length} pedidos criados como rascunho. Revise e envie.`);
  gravar(); desenhar();
}
function receberPedido(id) {
  const o = db.pedidos.find((x) => x.id === id), f = forn(o.forn), tot = soma(o.itens, (x) => x.qtd * x.custo);
  janela(`Receber pedido ${o.num}`, `<p>${esc(f.nome)} · ${o.itens.length} itens · ${R(tot)}</p><ul class="lista">${o.itens.map((x) => `<li><div class="cresce"><b>${esc(prod(x.id).nome)}</b><span>${x.qtd} un. a ${R(x.custo)}${prod(x.id).perecivel ? ' · entra com lote novo (validade 60 dias)' : ''}</span></div></li>`).join('')}</ul><p class="dica">Entra no estoque da Matriz e lança ${R(tot)} a pagar em ${f.prazo} dias.</p>`, 'Confirmar recebimento', () => {
    o.itens.forEach((x) => { const p = prod(x.id); p.est.matriz += x.qtd; p.custo = x.custo; if (p.perecivel) p.lotes.push({ lote: `L${String(30000 + o.num).padStart(5, '0')}`, vence: 60, qtd: x.qtd, un: 'matriz' }); });
    o.status = 'Recebido';
    db.contas.push({ id: `k${Date.now()}`, tipo: 'pagar', nome: `${f.nome} (pedido ${o.num})`, valor: tot, vence: f.prazo, cat: 'Fornecedor', pago: false });
    db.movs.push({ dia: 0, hora: agoraTxt(), tipo: 'Entrada', txt: `Pedido ${o.num} recebido (${f.nome})`, quem: OPERADOR });
    registrar(`Recebeu o pedido ${o.num} de ${f.nome} (${R(tot)})`); avisar('Pedido recebido: estoque e contas atualizados.'); return true;
  });
}
function exportarAbc() {
  const linhas = [['Classe', 'SKU', 'Produto', 'Receita', 'Participação', 'Acumulado'], ...abc().map((x) => [x.classe, x.p.sku, x.p.nome, x.r.toFixed(2).replace('.', ','), (x.part * 100).toFixed(1).replace('.', ','), (x.acc * 100).toFixed(1).replace('.', ',')])];
  const csv = '﻿' + linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'curva-abc.csv'; a.click(); URL.revokeObjectURL(a.href);
  registrar('Exportou a curva ABC em planilha');
}

// ---------------------------------------------------------------- busca de comandos
const ACOES = [
  { n: 'Nova venda', t: 'ação', f: () => abrir('pdv') }, { n: 'Perguntar ao Assistente IA', t: 'ação · grátis', f: () => ia() },
  { n: 'Convidar pessoa para a equipe', t: 'ação', f: () => abrir('dono') }, { n: 'Transferir estoque entre unidades', t: 'ação', f: () => transferir() },
  { n: 'Gerar pedidos pela sugestão de compra', t: 'ação', f: () => { abrir('compras'); gerarPedidos(); } }, { n: 'Lançar conta a pagar ou a receber', t: 'ação', f: () => novaConta() },
  { n: 'Ver DRE do mês', t: 'ação', f: () => { db.finAba = 'dre'; abrir('financeiro'); } }, { n: 'Ver lotes vencendo', t: 'ação', f: () => { db.estoqueAba = 'lotes'; abrir('estoque'); } },
  { n: 'Exportar curva ABC (planilha)', t: 'ação', f: exportarAbc }, { n: 'Reenviar notas rejeitadas', t: 'ação', f: () => { db.busca.fiscal = 'atencao'; abrir('fiscal'); } },
];
let pItens = [], pSel = 0;
function paleta() { $('#paleta-fundo').hidden = false; $('#paleta-q').value = ''; filtrarPaleta(); $('#paleta-q').focus(); }
const fecharPaleta = () => { $('#paleta-fundo').hidden = true; };
function filtrarPaleta() {
  const q = norm($('#paleta-q').value);
  const mods = Object.entries(MOD).filter(([k]) => k !== 'modulos').map(([k, m]) => ({ n: m.nome, t: `módulo${m.k ? ` · ${m.k}` : ''}`, ic: I[k], f: () => abrir(k) }));
  const prods = db.produtos.map((p) => ({ n: `${p.sku} · ${p.nome}`, t: `produto · ${R(p.preco)} · M ${p.est.matriz} / F ${p.est.filial}`, f: () => { db.estoqueAba = 'posicao'; db.busca.estoque = p.sku; abrir('estoque'); } }));
  const clis = db.clientes.map((c) => ({ n: c.nome, t: 'cliente', f: () => abrir('clientes') }));
  const todos = [...ACOES.map((a) => ({ ...a, ic: I.mais })), ...mods, ...prods, ...clis];
  pItens = (q ? todos.filter((x) => q.split(/\s+/).every((w) => norm(`${x.n} ${x.t}`).includes(w))) : [...ACOES.map((a) => ({ ...a, ic: I.mais })), ...mods]).slice(0, 12);
  pSel = 0; listaPaleta();
}
function listaPaleta() { $('#paleta-lista').innerHTML = pItens.map((x, i) => `<li role="option" aria-selected="${i === pSel}" data-i="${i}">${x.ic || I.estoque}<span>${esc(x.n)}</span><span class="tipo">${esc(x.t)}</span></li>`).join('') || '<li>Nada encontrado.</li>'; $('#paleta-lista [aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }
function rodarPaleta(i) { const x = pItens[i]; if (!x) return; fecharPaleta(); x.f(); }

function novaConta() {
  janela('Lançar conta', `<form class="form" id="f"><div class="dupla"><label>Tipo<select class="campo" name="tipo"><option value="pagar">A pagar</option><option value="receber">A receber</option></select></label><label>Categoria<select class="campo" name="cat">${['Fornecedor', 'Ocupação', 'Pessoal', 'Impostos', 'Comercial', 'Administrativo', 'Clientes', 'Cartões'].map((c) => `<option>${c}</option>`).join('')}</select></label></div><label>Descrição<input class="campo" name="nome" placeholder="Ex.: Manutenção da câmara fria"></label><div class="dupla"><label>Valor (R$)<input class="campo" name="valor" inputmode="decimal"></label><label>Vence em (dias)<input class="campo" name="vence" type="number" value="10"></label></div></form>`, 'Lançar', () => {
    const fd = new FormData($('#f')), nome = String(fd.get('nome')).trim(), valor = num(fd.get('valor'));
    if (!nome || !(valor > 0)) return erroJanela('Coloque a descrição e o valor.');
    db.contas.push({ id: `k${Date.now()}`, tipo: fd.get('tipo'), nome, valor, vence: Math.floor(num(fd.get('vence'))) || 0, cat: fd.get('cat'), pago: false });
    registrar(`Lançou conta a ${fd.get('tipo')} "${nome}" de ${R(valor)}`); avisar('Conta lançada.'); return true;
  });
}

// ---------------------------------------------------------------- eventos
document.addEventListener('click', (e) => {
  const li = e.target.closest('#paleta-lista li[data-i]'); if (li) { rodarPaleta(Number(li.dataset.i)); return; }
  if (e.target.id === 'paleta-fundo') { fecharPaleta(); return; }
  if (e.target.id === 'janela-fundo') { fecharJanela(); return; }
  const a = e.target.closest('[data-acao]'); if (!a) return;
  e.preventDefault(); e.stopPropagation();
  const { acao, id } = a.dataset;
  const F = {
    abrir: () => { if (a.dataset.aba) { if (a.dataset.m === 'estoque') db.estoqueAba = a.dataset.aba; else db.finAba = a.dataset.aba; } abrir(a.dataset.m); },
    'fechar-aba': () => fecharAba(a.dataset.m),
    paleta, ia, 'fechar-janela': fecharJanela,
    'ok-janela': () => { if (janelaOk && janelaOk() !== false) { fecharJanela(); gravar(); desenhar(); } },
    'estoque-aba': () => { db.estoqueAba = a.dataset.v; desenhar(); }, 'fin-aba': () => { db.finAba = a.dataset.v; desenhar(); },
    'fiscal-filtro': () => { db.busca.fiscal = a.dataset.v; desenhar(); },
    transferir: () => transferir(id), ajustar: () => ajustar(id),
    'tirar-item': () => { db.pdv.itens.splice(Number(a.dataset.i), 1); gravar(); desenhar(); },
    'limpar-pdv': () => { db.pdv.itens = []; registrar('Cancelou uma venda em andamento no caixa 01'); gravar(); desenhar(); },
    pagar: () => pagar(a.dataset.f),
    'gerar-pedidos': gerarPedidos,
    'enviar-pedido': () => { const o = db.pedidos.find((x) => x.id === id); o.status = 'Enviado'; registrar(`Enviou o pedido ${o.num} para ${forn(o.forn).nome}`); avisar(`Pedido ${o.num} enviado por e-mail ao fornecedor.`); gravar(); desenhar(); },
    'receber-pedido': () => receberPedido(id),
    'novo-pedido': () => { db.pedidos.push({ id: `o${Date.now()}`, num: db.proxPedido++, forn: 'f0', itens: [{ id: 'p0', qtd: 10, custo: prod('p0').custo }], status: 'Rascunho', dia: 0 }); avisar('Rascunho criado.'); gravar(); desenhar(); },
    baixar: () => { const k = db.contas.find((x) => x.id === id); k.pago = true; db.saldoBanco += k.tipo === 'pagar' ? -k.valor : k.valor; registrar(`Baixou a conta "${k.nome}" (${R(k.valor)})`); avisar('Conta baixada; saldo atualizado.'); gravar(); desenhar(); },
    'nova-conta': novaConta,
    reenviar: () => { const v = db.vendas.find((x) => x.n === Number(a.dataset.n)); v.nota.status = 'Autorizada'; v.nota.motivo = 'Reenviada e autorizada'; registrar(`Reenviou a ${v.nota.tipo} ${v.nota.num}: autorizada`); avisar(`Nota ${v.nota.num} autorizada.`); gravar(); desenhar(); },
    'reenviar-todas': () => { let n = 0; db.vendas.forEach((v) => { if (v.nota.status !== 'Autorizada') { v.nota.status = 'Autorizada'; v.nota.motivo = 'Reenviada e autorizada'; n++; } }); registrar(`Reenviou ${n} notas pendentes: todas autorizadas`); avisar(`${n} notas autorizadas.`); gravar(); desenhar(); },
    'exportar-abc': exportarAbc,
    promo: () => { const p = prod(id), novo = Math.round(p.preco * .8 * 10) / 10 - 0.01; registrar(`Promoção em ${p.nome}: de ${R(p.preco)} para ${R(novo)} até acabar o lote`); p.preco = novo; avisar(`${p.nome} agora sai por ${R(novo)}.`); gravar(); desenhar(); },
    'baixa-lote': () => { const p = prod(id), l = p.lotes.find((x) => x.lote === a.dataset.lote && x.un === a.dataset.un); janela('Dar baixa no lote', `<p>${esc(p.nome)} · lote <span class="mono">${l.lote}</span> · ${l.qtd} un. na ${UN[l.un]} · perda de ${R(l.qtd * p.custo)}</p>`, 'Dar baixa', () => { p.est[l.un] = Math.max(0, p.est[l.un] - l.qtd); db.movs.push({ dia: 0, hora: agoraTxt(), tipo: 'Perda', txt: `${l.qtd}× ${p.nome} (lote ${l.lote})`, quem: OPERADOR }); registrar(`Deu baixa em ${l.qtd}× ${p.nome}, lote ${l.lote} (${R(l.qtd * p.custo)})`); l.qtd = 0; avisar('Baixa registrada.'); return true; }); },
    limite: () => { const c = cli(id); janela(`Crédito · ${esc(c.nome)}`, `<form class="form" id="f"><label>Limite para vendas a prazo (R$)<input class="campo" name="l" inputmode="decimal" value="${c.limite}"></label><p class="dica">Saldo em aberto hoje: ${R(c.saldo)}.</p></form>`, 'Salvar', () => { const l = num(new FormData($('#f')).get('l')); if (!(l >= 0)) return erroJanela('Valor inválido.'); registrar(`Mudou o crédito de ${c.nome} de ${R(c.limite)} para ${R(l)}`); c.limite = l; return true; }); },
    'editar-vend': () => { const v = vend(id); janela(`Meta e comissão · ${esc(v.nome)}`, `<form class="form" id="f"><div class="dupla"><label>Meta do mês (R$)<input class="campo" name="meta" inputmode="decimal" value="${v.meta}"></label><label>Comissão (%)<input class="campo" name="com" inputmode="decimal" value="${String(v.comissao).replace('.', ',')}"></label></div></form>`, 'Salvar', () => { const fd = new FormData($('#f')), m = num(fd.get('meta')), c = num(fd.get('com')); if (!(m > 0) || !(c >= 0 && c <= 30)) return erroJanela('Meta maior que zero e comissão entre 0 e 30%.'); registrar(`Mudou a meta de ${v.nome} para ${R(m)} e a comissão para ${c}%`); v.meta = m; v.comissao = c; return true; }); },
    'novo-produto': () => janela('Novo produto', `<form class="form" id="f"><div class="dupla"><label>SKU<input class="campo" name="sku" placeholder="Ex.: CF-404"></label><label>Categoria<select class="campo" name="cat">${[...new Set(db.produtos.map((p) => p.cat))].map((c) => `<option>${c}</option>`).join('')}</select></label></div><label>Nome<input class="campo" name="nome"></label><div class="dupla"><label>Custo (R$)<input class="campo" name="custo" inputmode="decimal"></label><label>Preço (R$)<input class="campo" name="preco" inputmode="decimal"></label></div><div class="dupla"><label>Fornecedor<select class="campo" name="forn">${db.fornecedores.map((f) => `<option value="${f.id}">${esc(f.nome)}</option>`).join('')}</select></label><label>Estoque mínimo<input class="campo" name="min" type="number" value="10"></label></div><label><span><input type="checkbox" name="perec"> Controlar lote e validade</span></label></form>`, 'Cadastrar', () => {
      const fd = new FormData($('#f')), sku = String(fd.get('sku')).trim().toUpperCase(), nome = String(fd.get('nome')).trim(), custo = num(fd.get('custo')), preco = num(fd.get('preco'));
      if (!sku || !nome || !(preco > 0) || !(custo >= 0)) return erroJanela('Preencha SKU, nome, custo e preço.');
      if (db.produtos.some((p) => p.sku === sku)) return erroJanela('Já existe um produto com esse SKU.');
      db.produtos.push({ id: `p${Date.now()}`, sku, nome, cat: fd.get('cat'), forn: fd.get('forn'), custo, preco, perecivel: !!fd.get('perec'), min: Math.floor(num(fd.get('min'))) || 0, est: { matriz: 0, filial: 0 }, lotes: [] });
      registrar(`Cadastrou o produto ${sku} · ${nome}`); avisar('Produto cadastrado.'); return true;
    }),
    'novo-cliente': () => janela('Novo cliente', `<form class="form" id="f"><label>Nome ou razão social<input class="campo" name="nome"></label><div class="dupla"><label>CPF ou CNPJ<input class="campo" name="doc" inputmode="numeric"></label><label>Crédito (R$)<input class="campo" name="lim" inputmode="decimal" value="0"></label></div></form>`, 'Cadastrar', () => {
      const fd = new FormData($('#f')), nome = String(fd.get('nome')).trim(); if (!nome) return erroJanela('Coloque o nome.');
      db.clientes.push({ id: `c${Date.now()}`, nome, doc: String(fd.get('doc')).trim() || '—', limite: num(fd.get('lim')) || 0, saldo: 0, ultima: 999, compras: 0, gasto: 0 });
      registrar(`Cadastrou o cliente ${nome}`); avisar('Cliente cadastrado.'); return true;
    }),
  };
  F[acao]?.();
});
document.addEventListener('submit', (e) => { if (e.target.id === 'leitor') { e.preventDefault(); porNoPdv($('#leitor-in').value); } else if (e.target.closest('#janela')) { e.preventDefault(); $('#janela [data-acao="ok-janela"]')?.click(); } });
document.addEventListener('change', (e) => {
  if (e.target.id === 'filial') { db.un = e.target.value; gravar(); desenhar(); }
  if (e.target.id === 'pdv-vend') { db.pdv.vend = e.target.value; gravar(); }
  if (e.target.id === 'pdv-cli') { db.pdv.cli = e.target.value; gravar(); }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'paleta-q') filtrarPaleta();
  for (const k of ['estoque', 'auditoria']) if (e.target.id === `busca-${k}`) { db.busca[k] = e.target.value; const pos = e.target.selectionStart; desenhar(); const i = $(`#busca-${k}`); i.focus(); i.setSelectionRange(pos, pos); }
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if ($('#paleta-fundo').hidden) paleta(); else fecharPaleta(); return; }
  if (!$('#paleta-fundo').hidden) {
    if (e.key === 'Escape') fecharPaleta();
    else if (e.key === 'ArrowDown') { e.preventDefault(); pSel = Math.min(pItens.length - 1, pSel + 1); listaPaleta(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); pSel = Math.max(0, pSel - 1); listaPaleta(); }
    else if (e.key === 'Enter') { e.preventDefault(); rodarPaleta(pSel); }
    return;
  }
  if (!$('#janela-fundo').hidden) { if (e.key === 'Escape') fecharJanela(); return; }
  if (TECLAS[e.key]) { e.preventDefault(); abrir(TECLAS[e.key]); setTimeout(() => $('#leitor-in')?.focus(), 30); return; }
  if (db.ativa === 'pdv' && e.key === 'F10') { e.preventDefault(); pagar(''); }
  if (db.ativa === 'pdv' && e.key === 'F5') { e.preventDefault(); pagar('Pix'); }
  if (e.key === 'Enter' && e.target.classList?.contains('aba')) e.target.click();
});
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); limparDono(CHAVE); db = semente(); fecharJanela(); fecharPaleta(); desenhar(); avisar('Demonstração recomeçada.'); });
setInterval(status, 30000);
desenhar();
