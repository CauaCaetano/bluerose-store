// Veltria Gestão Avançado · protótipo "estação de trabalho"
// Módulos abertos em abas, busca de comandos (Ctrl+K), atalhos F2–F9, duas unidades (Matriz e Filial), lotes e validade,
// compras com sugestão automática, fluxo de caixa projetado, DRE, metas e comissões, notas fiscais, curva ABC e auditoria.
// Dados de exemplo guardados só neste navegador (?novo no endereço recomeça).

import { abrirIA, painelDono, limparDono } from './extras.js';

const CHAVE = 'veltria-gestao-avancado-v1';
const R = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const Rk = (v) => (Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil` : R(v));
const pct = (v) => (Number.isFinite(v) ? `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const $ = (s, el = document) => el.querySelector(s);
const data = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); };
const agoraTxt = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
// unidades da loja: ficam nos dados (db.unidades); estas são as do exemplo
const UN_EXEMPLO = { matriz: 'Matriz · Centro', filial: 'Filial · Jardim Europa' };
const UN = {};
const KS = () => Object.keys(UN), k0 = () => KS()[0];
const estTot = (p) => KS().reduce((t, k) => t + (p.est[k] || 0), 0);
const curto = (k) => String(UN[k] || k).split(' · ')[0];
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
  caixa: { nome: 'Caixa', desc: 'Abertura, sangria, suprimento e fechamento por unidade', k: '' },
  precos: { nome: 'Preços e promoções', desc: 'Reajuste em massa e promoções com prazo', k: '' },
  inventario: { nome: 'Inventário', desc: 'Contagem cega por categoria e acuracidade', k: '' },
  auditoria: { nome: 'Auditoria', desc: 'Quem fez o quê e quando', k: 'F9' },
  dono: { nome: 'Painel do dono', desc: 'Equipe, cargos, permissões por módulo e plano', k: '' },
  modulos: { nome: 'Todos os módulos', desc: '', k: '' },
};
I.caixa = I.pdv; I.precos = I.relatorios; I.inventario = I.estoque;
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
  ].map(([nome, doc, limite], i) => ({ id: `c${i}`, nome, doc, limite, tel: `3198${String(7100000 + i * 13579).slice(0, 7)}`, saldo: 0, ultima: 999, compras: 0, gasto: 0 }));
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
  const caixas = { matriz: { aberto: true, abertura: 400, hora: '08:02', sangrias: [], suprimentos: [], fechamentos: [] }, filial: { aberto: true, abertura: 300, hora: '08:15', sangrias: [{ v: 500, motivo: 'Cofre', hora: '12:40' }], suprimentos: [], fechamentos: [] } };
  const promos = [{ id: 'pr1', alvo: 'cat:Doces', pct: 10, ate: 6 }];
  const inventarios = [{ dia: -9, cat: 'Bebidas', un: 'matriz', itens: 3, div: 0, acur: 1 }, { dia: -4, cat: 'Frios', un: 'filial', itens: 4, div: 1, acur: 0.97 }];
  // 2ª leva: cestas, pedidos de empresas, fracionamento, degustações, clube do vinho, vale-presente, delivery, perdas, acordos, orçamento, metas e concorrência
  const hojeD = new Date().getDate(), dPas = (k) => -Math.min(k, hojeD - 1);
  [1500, 3000, 800, 5000, 1000].forEach((v, i) => { fornecedores[i].pedMin = v; }); [176, 176, 150, 120].forEach((h, i) => { vendedores[i].horas = h; });
  clientes.forEach((c, i) => { if (c.saldo > 0) c.vence = [2, 0, -3, -9, 5, 1, -1, 7][i]; });
  const metaCat = {}; vendas.filter((v) => v.dia > -hojeD).forEach((v) => v.itens.forEach((x) => { const c = produtos.find((p) => p.id === x.id).cat; metaCat[c] = (metaCat[c] || 0) + x.qtd * x.preco; }));
  Object.keys(metaCat).forEach((c, i) => { metaCat[c] = Math.ceil(metaCat[c] / hojeD * 30 * [1.08, 0.92, 1.15][i % 3] / 500) * 500; });
  const extras2 = {
    cestas: [{ id: 'ce1', nome: 'Cesta Café da Manhã', itens: [['p14', 1], ['p17', 1], ['p9', 1], ['p1', 1]].map(([id, qtd]) => ({ id, qtd })), emb: 18, preco: 189, estoque: 4 }, { id: 'ce2', nome: 'Cesta Italiana', itens: [['p10', 1], ['p11', 2], ['p12', 1], ['p13', 1], ['p4', 1]].map(([id, qtd]) => ({ id, qtd })), emb: 25, preco: 289, estoque: 0 }],
    corporativo: [{ id: 'co1', empresa: 'Construtora Alvorada', cesta: 'ce2', qtd: 40, valorUn: 274.55, entrega: 38, sinal: 3295, st: 'confirmado' }, { id: 'co2', empresa: 'Clínica Bem Viver', cesta: 'ce1', qtd: 25, valorUn: 179.55, entrega: 45, sinal: 0, st: 'proposta' }],
    fracionados: [{ id: 'fr1', prod: 'p0', pecas: 2, n: 7, g: 250, perda: 4, preco: 27.49, dia: -2, val: 10 }, { id: 'fr2', prod: 'p1', pecas: 3, n: 5, g: 280, perda: 3, preco: 23.99, dia: -12, val: 10 }],
    degustacoes: [{ prod: 'p0', un: 'matriz', custo: 140, antes: 2, dia2: 9, dia: dPas(5) }, { prod: 'p13', un: 'filial', custo: 95, antes: 1, dia2: 3, dia: dPas(11) }, { prod: 'p14', un: 'matriz', custo: 110, antes: 3, dia2: 11, dia: dPas(16) }],
    clube: { preco: 149, un: { matriz: { ativos: 38, pausados: 3, cancelados: 1 }, filial: { ativos: 21, pausados: 1, cancelados: 2 } }, kit: [{ id: 'p4', qtd: 1 }, { id: 'p6', qtd: 1 }, { id: 'p19', qtd: 1 }] },
    vales: [{ id: 'vp1', cod: 'VP-1041', valor: 150, saldo: 150, comprador: 'Marina Torres', dia: -6 }, { id: 'vp2', cod: 'VP-1042', valor: 300, saldo: 85.4, comprador: 'Construtora Alvorada', dia: -40 }, { id: 'vp3', cod: 'VP-1043', valor: 100, saldo: 0, comprador: 'Rafael Antunes', dia: -75 }],
    taxas: { Centro: 8, 'Jardim Europa': 10, 'Vila Nobre': 6, Lourdes: 12 },
    delivery: [{ id: 'dl1', cliente: 'Helena Vasconcelos', bairro: 'Jardim Europa', taxa: 0, valor: 312.4, min: 34, prazo: 60, st: 'rota', un: 'filial' }, { id: 'dl2', cliente: 'Fernando Lacerda', bairro: 'Centro', taxa: 8, valor: 96.7, min: 12, prazo: 60, st: 'separando', un: 'matriz' }, { id: 'dl3', cliente: 'Luiza Cardim', bairro: 'Lourdes', taxa: 12, valor: 148.3, min: 41, prazo: 60, st: 'entregue', un: 'matriz' }, { id: 'dl4', cliente: 'Otávio Ribas', bairro: 'Vila Nobre', taxa: 6, valor: 74.9, min: 66, prazo: 60, st: 'rota', un: 'matriz' }],
    perdasReg: [['p3', 4, 'Vencido', 'matriz', 1], ['p5', 1, 'Quebra', 'filial', 3], ['p0', 1, 'Avaria no recebimento', 'matriz', 6], ['p17', 2, 'Vencido', 'filial', 9], ['p3', 3, 'Vencido', 'filial', 13]].map(([prod, qtd, motivo, un, d]) => ({ prod, qtd, motivo, un, dia: dPas(d) })),
    acordos: [{ id: 'ac1', forn: 'f1', regra: '4% em produto comprando R$ 60.000,00 no trimestre', meta: 60000, comprado: 47200, pct: 4 }, { id: 'ac2', forn: 'f3', regra: '5% em produto comprando R$ 40.000,00 no trimestre', meta: 40000, comprado: 41800, pct: 5 }],
    concorr: [['p10', [54.9, 62.9]], ['p4', [84.9, 76.5]], ['p14', [49.9, 48]], ['p0', [94.9, 109]]].map(([prod, precos]) => ({ prod, precos })),
    orcDesp: { Ocupação: 13000, Pessoal: 16500, Impostos: 9000, Comercial: 1200, Administrativo: 2000 }, metaCat, regua: {},
  };
  return { ...extras2, produtos, fornecedores, vendedores, clientes, vendas, contas, pedidos, movs, log, caixas, promos, inventarios, devolucoes: [], conciliados: [], comPagas: [], abas: ['cockpit'], ativa: 'cockpit', un: 'todas', unidades: { ...UN_EXEMPLO }, pdv: { itens: [], cli: '', vend: 'v0' }, proxVenda: n, proxNota: nf, proxPedido: 773, saldoBanco: 38450, metaMesExtra: 0, estoqueAba: 'posicao', finAba: 'fluxo', busca: {} };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || semente(); } catch { return semente(); } })();
window.veltriaDados = () => db;
// loja que começou do zero trabalha com uma unidade, que dá para renomear; cada produto ganha estoque zerado na unidade nova
function lerUnidades() {
  const u = db.unidades && typeof db.unidades === 'object' ? db.unidades : { ...UN_EXEMPLO };
  Object.keys(UN).forEach((k) => delete UN[k]); Object.assign(UN, Object.keys(u).length ? u : { principal: 'Loja principal' });
  (db.produtos || []).forEach((p) => { p.est = p.est || {}; KS().forEach((k) => { if (p.est[k] == null) p.est[k] = 0; }); });
  if (db.un !== 'todas' && !UN[db.un]) db.un = 'todas';
}
lerUnidades();
['promos', 'inventarios', 'devolucoes', 'conciliados', 'comPagas'].forEach((k) => { if (!Array.isArray(db[k])) db[k] = []; }); db.caixas ||= {}; KS().forEach((k) => { db.caixas[k] ||= { aberto: false, abertura: 0, hora: '', sangrias: [], suprimentos: [], fechamentos: [] }; });
function formUnidade(k) {
  janela(k ? 'Renomear unidade' : 'Nova unidade', `<form class="form" id="f"><label>Nome da unidade<input class="campo" name="n" required value="${k ? esc(UN[k]) : ''}" placeholder="Ex.: Filial · Savassi"></label></form>`, k ? 'Salvar' : 'Cadastrar', () => {
    const nome = String(new FormData($('#f')).get('n') || '').trim(); if (!nome) return erroJanela('Coloque o nome da unidade.');
    const chave = k || nome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '').slice(0, 10) + Date.now().toString(36).slice(-3);
    db.unidades = { ...UN, [chave]: nome }; lerUnidades(); if (!k) db.un = chave;
    registrar(k ? `Renomeou a unidade para ${nome}` : `Cadastrou a unidade ${nome}`); gravar(); desenhar(); avisar(k ? 'Unidade renomeada.' : 'Unidade cadastrada. O estoque dela começa zerado: use Transferir ou Entrada.'); return true;
  });
} // modo conta: começar do zero e resumo para a IA
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
// preço de prateleira com a melhor promoção que vale hoje (produto ou categoria)
const promoDe = (p) => db.promos.filter((x) => x.ate >= 0 && (x.alvo === `p:${p.id}` || x.alvo === `cat:${p.cat}`)).sort((a, b) => b.pct - a.pct)[0];
const precoV = (p) => { const x = promoDe(p); return x ? Math.round(p.preco * (1 - x.pct / 100) * 100) / 100 : p.preco; };
const TAXA = { 'Crédito': 0.029, 'Débito': 0.011 };
const dinheiroCaixa = (k) => { const c = db.caixas[k]; if (!c) return 0; return c.abertura + soma(c.suprimentos, (x) => x.v) - soma(c.sangrias, (x) => x.v) + soma(db.vendas.filter((v) => v.dia === 0 && v.un === k && /Dinheiro/.test(v.pag)), (v) => (v.parts ? (v.parts.find((p) => p[0] === 'Dinheiro')?.[1] || 0) - (v.troco || 0) : v.total)) - soma(db.devolucoes.filter((d) => d.dia === 0 && d.un === k && d.como === 'Dinheiro'), (d) => d.valor); };
const custoVenda = (v) => soma(v.itens, (x) => x.qtd * x.custo);
const totalEst = (p) => (db.un === 'todas' ? estTot(p) : p.est[db.un] || 0);
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
  $('#janela').innerHTML = `<div class="janela-cab"><h2 id="janela-titulo">${titulo}</h2><button type="button" data-acao="fechar-janela" aria-label="Fechar">${I.x}</button></div><div class="janela-corpo">${corpo}</div><div class="janela-pe"><button class="btn" data-acao="fechar-janela">${botao ? 'Cancelar' : 'Fechar'}</button>${botao ? `<button class="btn prim" data-acao="ok-janela">${botao}</button>` : ''}</div>`;
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
const unTxt = () => (db.un === 'todas' ? (KS().length > 1 ? `nas ${KS().length} unidades` : `na ${curto(k0())}`) : `na ${curto(db.un)}`);

function mCockpit() {
  const mes = doMes(), fat = soma(mes, (v) => v.total), cmv = soma(mes, custoVenda), meta = metaMes();
  const hoje = vendasUn().filter((v) => v.dia === 0);
  const fh = soma(hoje, (v) => v.total);
  const v30 = vendidos30(), capital = soma(db.produtos, (p) => totalEst(p) * p.custo);
  const frac = meta > 0 ? Math.min(1, fat / meta) : 0, prev = fat / diaMes() * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const L = Math.PI * 60;
  const fl = fluxo(), mn = Math.min(...fl.map((x) => x.s), 0), mx = Math.max(...fl.map((x) => x.s)), W = 860, H = 200;
  const X = (d) => 64 + d / 30 * (W - 84), Y = (s) => 10 + (1 - (s - mn) / (mx - mn || 1)) * (H - 30);
  const linha = fl.map((p, i) => `${i ? 'L' : 'M'}${X(p.d).toFixed(1)},${Y(p.s).toFixed(1)}`).join(' ');
  const menor = fl.reduce((a, b) => (b.s < a.s ? b : a));
  const abaixo = db.produtos.filter((p) => totalEst(p) < p.min), venc = lotesVencendo(7), atras = db.contas.filter((k) => !k.pago && k.vence < 0), rej = vendasUn().filter((v) => v.nota.status !== 'Autorizada');
  const alertas = [
    abaixo.length && { t: `${abaixo.length} ${abaixo.length === 1 ? 'produto' : 'produtos'} abaixo do estoque mínimo`, s: abaixo.slice(0, 3).map((p) => p.nome.split(' ').slice(0, 3).join(' ')).join(', '), tag: 'erro', m: 'compras' },
    venc.length && { t: `${venc.length} ${venc.length === 1 ? 'lote vence' : 'lotes vencem'} em até 7 dias`, s: `${soma(venc, (x) => x.l.qtd)} unidades, ${R(soma(venc, (x) => x.l.qtd * x.p.custo))} pelo custo`, tag: 'alerta', m: 'estoque', aba: 'lotes' },
    atras.length && { t: `${atras.length} ${atras.length === 1 ? 'conta vencida' : 'contas vencidas'}`, s: atras.map((k) => k.nome).join(', '), tag: 'erro', m: 'financeiro', aba: 'contas' },
    KS().filter((k) => !db.caixas[k]?.aberto).length && { t: `Caixa fechado: ${KS().filter((k) => !db.caixas[k]?.aberto).map((k) => curto(k)).join(', ')}`, s: 'abra para vender', tag: 'alerta', m: 'caixa' },
    rej.length && { t: `${rej.length} ${rej.length === 1 ? 'nota precisa' : 'notas precisam'} de atenção`, s: 'rejeitadas ou emitidas em contingência', tag: 'lav', m: 'fiscal' },
  ].filter(Boolean);
  const ranking = db.vendedores.filter((v) => db.un === 'todas' || v.un === db.un).map((v) => ({ v, f: soma(mes.filter((x) => x.vend === v.id), (x) => x.total) })).sort((a, b) => b.f - a.f);
  const mapa = Array.from({ length: 7 }, () => Array(13).fill(0)); vendasUn().forEach((v) => { const dw = new Date(Date.now() + v.dia * 864e5).getDay(); mapa[dw][v.hora - 8] += v.total; });
  const mmax = Math.max(...mapa.flat(), 1), dn = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  return `<div class="mod-cab"><div><h1>Cockpit</h1><p>${unTxt()} · atualizado às ${agoraTxt()}</p></div><div class="acoes"><button class="btn prim" data-acao="abrir" data-m="pdv">${I.pdv}Nova venda <span class="k">F2</span></button><button class="btn" data-acao="paleta">${I.mais}Fazer algo <span class="k">Ctrl K</span></button></div></div>
  <div class="bento">
    ${kpi('Faturamento do mês', Rk(fat), `previsão de fechar em ${Rk(prev)}`, 'escuro')}
    ${kpi('Hoje até agora', R(fh), `${hoje.length} ${hoje.length === 1 ? 'venda' : 'vendas'} · semana passada no dia inteiro: ${Rk(soma(vendasUn().filter((v) => v.dia === -7), (v) => v.total))}`)}
    ${kpi('Margem bruta do mês', pct(fat ? (fat - cmv) / fat : 0), `lucro bruto de ${Rk(fat - cmv)}`)}
    ${kpi('Capital em estoque', Rk(capital), `pelo custo · ticket médio ${R(fat / Math.max(1, mes.length))}`)}
    <section class="pn c4"><div class="pn-cab"><h2>Meta do mês</h2><span class="tag ${frac >= diaMes() / 30 ? 'ok' : 'alerta'}">${frac >= diaMes() / 30 ? 'no ritmo' : 'abaixo do ritmo'}</span></div>
      <div class="medidor"><svg viewBox="0 0 150 92" aria-hidden="true"><path d="M15 80a60 60 0 0 1 120 0" stroke="var(--porcelana-2)" stroke-width="14"/><path d="M15 80a60 60 0 0 1 120 0" stroke="var(--lavanda-esc)" stroke-width="14" stroke-dasharray="${frac * L} ${L}"/><text x="75" y="74" text-anchor="middle" style="font:600 20px var(--mono);fill:var(--tinta)">${Math.round(frac * 100)}%</text></svg>
      <div><b class="mono">${Rk(fat)}</b><div class="sub">de ${Rk(meta)}</div><div class="sub">faltam ${Rk(Math.max(0, meta - fat))} em ${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - diaMes()} dias</div></div></div></section>
    <section class="pn c8 grafico"><div class="pn-cab"><h2>Saldo projetado: próximos 30 dias</h2><span class="sub">menor saldo ${R(menor.s)} em ${data(menor.d)}</span></div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Saldo projetado"><path d="${linha} L${X(30)},${H - 20} L${X(0)},${H - 20}Z" fill="rgba(183,161,201,.25)" stroke="none"/>${mn < 0 ? `<line x1="30" x2="${W - 10}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--erro)" stroke-dasharray="4 4"/>` : ''}<path d="${linha}" stroke="var(--ameixa)" stroke-width="2.2" fill="none"/><circle cx="${X(menor.d)}" cy="${Y(menor.s)}" r="4.5" fill="var(--ouro)" stroke="var(--ameixa)"/>${[0, 10, 20, 30].map((d) => `<text x="${X(d)}" y="${H - 4}" text-anchor="${d === 0 ? 'start' : d === 30 ? 'end' : 'middle'}">${data(d)}</text>`).join('')}<text x="2" y="${Y(mx) + 4}">${Rk(mx).replace('R$ ', '')}</text><text x="2" y="${Y(mn) + 4}">${Rk(mn).replace('R$ ', '')}</text></svg></section>
    <section class="pn c5"><div class="pn-cab"><h2>Alertas</h2><span class="tag ${alertas.length ? 'erro' : 'ok'}">${alertas.length}</span></div>${alertas.length ? `<ul class="lista">${alertas.map((a) => `<li><span class="tag ${a.tag}">●</span><div class="cresce"><b>${a.t}</b><span>${esc(a.s)}</span></div><button class="btn peq" data-acao="abrir" data-m="${a.m}" ${a.aba ? `data-aba="${a.aba}"` : ''}>Resolver</button></li>`).join('')}</ul>` : '<p class="vazio">Sem alertas.</p>'}</section>
    <section class="pn c3"><div class="pn-cab"><h2>Vendedores no mês</h2></div><ul class="lista">${ranking.map(({ v, f }) => `<li><div class="cresce"><b>${esc(v.nome.split(' ')[0])} <span class="tag">${UN[v.un]}</span></b><div class="barra-h ${f >= v.meta * diaMes() / 30 ? '' : 'ouro'}"><i style="width:${Math.min(100, f / v.meta * 100)}%"></i></div></div><span class="mono">${Math.round(v.meta ? f / v.meta * 100 : 0)}%</span></li>`).join('')}</ul></section>
    <section class="pn c4"><div class="pn-cab"><h2>Quando a loja vende</h2><span class="sub">30 dias, por hora</span></div><div class="mapa">${mapa.map((l, dw) => `<span>${dn[dw]}</span>${l.map((x, hh) => `<i style="opacity:${(0.08 + x / mmax * .92).toFixed(2)}" title="${dn[dw]} ${hh + 8}h: ${R(x)}"></i>`).join('')}`).join('')}<span></span>${Array.from({ length: 13 }, (_, i) => `<span style="text-align:center">${i % 3 === 0 ? i + 8 : ''}</span>`).join('')}</div></section>
  </div>`;
}

function mPdv() {
  const it = db.pdv.itens, total = soma(it, (x) => x.qtd * precoV(prod(x.id))), un = db.un === 'todas' ? k0() : db.un;
  return `<div class="mod-cab"><div><h1>Frente de caixa · ${UN[un]}</h1><p>Leia o código ou digite o SKU. Para várias unidades use <span class="mono">3*CF-401</span>. Enter põe na venda.</p></div><div class="acoes"><button class="btn" data-acao="limpar-pdv" ${it.length ? '' : 'disabled'}>Cancelar venda</button></div></div>
  <div class="pdv"><div>
    <form class="leitor" id="leitor"><input class="campo" id="leitor-in" placeholder="Código, SKU ou nome do produto" autocomplete="off" aria-label="Código do produto" list="lista-prod"><button class="btn prim">Pôr</button></form>
    <datalist id="lista-prod">${db.produtos.map((p) => `<option value="${p.sku}">${esc(p.nome)}</option>`).join('')}</datalist>
    <div class="tab-caixa"><table><thead><tr><th>#</th><th>SKU</th><th>Produto</th><th class="n">Qtd</th><th class="n">Unitário</th><th class="n">Total</th><th class="n">Estoque ${UN[un]}</th><th></th></tr></thead><tbody>
    ${it.map((x, i) => { const p = prod(x.id); return `<tr><td class="n">${i + 1}</td><td class="mono">${p.sku}</td><td>${esc(p.nome)}${p.perecivel ? ' <span class="tag alerta">lote</span>' : ''}</td><td class="n">${x.qtd}</td><td class="n">${precoV(p) !== p.preco ? `<s class="sub">${R(p.preco)}</s> ` : ''}${R(precoV(p))}</td><td class="n"><b>${R(x.qtd * precoV(p))}</b></td><td class="n">${p.est[un]}</td><td class="n"><button class="btn peq" data-acao="tirar-item" data-i="${i}" aria-label="Tirar ${esc(p.nome)}">${I.x}</button></td></tr>`; }).join('') || '<tr><td colspan="8" class="vazio" style="text-align:center;padding:30px">Nenhum item. Leia o primeiro código.</td></tr>'}
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
    corpo = `<div class="tab-caixa"><table><thead><tr><th>SKU</th><th>Produto</th><th>Categoria</th>${KS().map((k) => `<th class="n">${esc(curto(k))}</th>`).join('')}<th class="n">Mínimo</th><th class="n">Giro 30 dias</th><th class="n">Cobertura</th><th>Situação</th><th></th></tr></thead><tbody>
    ${lista.map((p) => { const c = cobertura(p, v30), t = totalEst(p); return `<tr><td class="mono">${p.sku}</td><td>${esc(p.nome)}</td><td>${p.cat}</td>${KS().map((k) => `<td class="n">${p.est[k] || 0}</td>`).join('')}<td class="n">${p.min}</td><td class="n">${v30[p.id] || 0}</td><td class="n">${c === Infinity ? '—' : `${Math.round(c)} d`}</td><td>${t < p.min ? '<span class="tag erro">abaixo do mínimo</span>' : c < 12 ? '<span class="tag alerta">repor logo</span>' : c > 90 ? '<span class="tag ard">parado</span>' : '<span class="tag ok">ok</span>'}</td><td class="n"><button class="btn peq" data-acao="transferir" data-id="${p.id}">Transferir</button> <button class="btn peq" data-acao="ajustar" data-id="${p.id}">Ajustar</button></td></tr>`; }).join('')}</tbody></table></div>`;
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
  return db.produtos.map((p) => { const g = (v30[p.id] || 0) / 30, alvo = Math.max(p.min * 2, Math.ceil(g * 30)), t = estTot(p); return { p, q: Math.max(0, alvo - t), cob: g ? t / g : Infinity }; }).filter((x) => x.q > 0 && (x.cob < 15 || x.p.est.matriz + x.p.est.filial < x.p.min));
}
function mCompras() {
  const sug = sugestao(), porF = {}; sug.forEach((x) => { (porF[x.p.forn] ||= []).push(x); });
  return `<div class="mod-cab"><div><h1>Compras</h1><p>A sugestão olha o giro dos últimos 30 dias e o estoque mínimo, para comprar o suficiente para 1 mês.</p></div><div class="acoes"><button class="btn prim" data-acao="gerar-pedidos" ${sug.length ? '' : 'disabled'}>Gerar ${Object.keys(porF).length} pedidos da sugestão</button></div></div>
  <div class="bento">
    <section class="pn c7"><div class="pn-cab"><h2>Sugestão de compra</h2><span class="tag lav">${sug.length} itens · ${R(soma(sug, (x) => x.q * x.p.custo))}</span></div>
      ${sug.length ? `<div class="tab-caixa"><table><thead><tr><th>Fornecedor</th><th>Produto</th><th class="n">Tem</th><th class="n">Cobertura</th><th class="n">Comprar</th><th class="n">Custo</th></tr></thead><tbody>${sug.map((x) => `<tr><td>${esc(forn(x.p.forn).nome)}</td><td>${esc(x.p.nome)}</td><td class="n">${estTot(x.p)}</td><td class="n">${x.cob === Infinity ? '—' : `${Math.round(x.cob)} d`}</td><td class="n"><b>${x.q}</b></td><td class="n">${R(x.q * x.p.custo)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="vazio">Nada para comprar agora: todos os produtos têm mais de 15 dias de estoque.</p>'}
    </section>
    <section class="pn c5"><div class="pn-cab"><h2>Pedidos</h2><button class="btn peq" data-acao="novo-pedido">${I.mais}Pedido manual</button></div>
      <ul class="lista">${[...db.pedidos].sort((a, b) => b.num - a.num).map((o) => `<li><div class="cresce"><b>Pedido ${o.num} · ${esc(forn(o.forn).nome)}</b><span>${o.itens.length} itens · ${R(soma(o.itens, (x) => x.qtd * x.custo))} · ${data(o.dia)}</span></div><span class="tag ${o.status === 'Recebido' ? 'ok' : o.status === 'Enviado' ? 'lav' : ''}">${o.status}</span>${o.status === 'Rascunho' ? `<button class="btn peq" data-acao="enviar-pedido" data-id="${o.id}">Enviar</button>` : o.status === 'Enviado' ? `<button class="btn peq prim" data-acao="receber-pedido" data-id="${o.id}">Receber</button>` : ''}</li>`).join('') || '<li class="vazio">Nenhum pedido.</li>'}</ul></section>
  </div>`;
}

function mFinanceiro() {
  const aba = db.finAba, seg = `<div class="seg" role="group" aria-label="Visão do financeiro">${[['fluxo', 'Fluxo de caixa'], ['contas', 'Contas'], ['dre', 'DRE do mês'], ['unidades', 'Resultado por unidade'], ['cartoes', 'Conciliação de cartões']].map(([k, n]) => `<button data-acao="fin-aba" data-v="${k}" aria-pressed="${aba === k}">${n}</button>`).join('')}</div>`;
  let corpo = '';
  if (aba === 'fluxo') {
    const fl = fluxo().filter((p) => p.ent || p.sai);
    corpo = `<div class="tab-caixa"><table><thead><tr><th>Dia</th><th class="n">Entra</th><th class="n">Sai</th><th class="n">Saldo previsto</th></tr></thead><tbody>${fl.map((p) => `<tr><td class="mono">${data(p.d)}${p.d === 0 ? ' (hoje, com o que já venceu)' : ''}</td><td class="n" style="color:var(--ok)">${p.ent ? R(p.ent) : ''}</td><td class="n" style="color:var(--erro)">${p.sai ? R(p.sai) : ''}</td><td class="n"><b style="color:${p.s < 0 ? 'var(--erro)' : 'inherit'}">${R(p.s)}</b></td></tr>`).join('')}</tbody></table></div><p class="sub">Saldo em conta hoje: ${R(db.saldoBanco)}. As vendas entram pela média das últimas 2 semanas (parte à vista); cartão de crédito entra pelos repasses lançados em Contas.</p>`;
  } else if (aba === 'contas') {
    const ks = [...db.contas].sort((a, b) => a.pago - b.pago || a.vence - b.vence);
    corpo = `<div class="tab-caixa"><table><thead><tr><th>Tipo</th><th>Descrição</th><th>Categoria</th><th class="n">Vencimento</th><th class="n">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${ks.map((k) => `<tr><td><span class="tag ${k.tipo === 'pagar' ? 'erro' : 'ok'}">${k.tipo === 'pagar' ? 'pagar' : 'receber'}</span></td><td>${esc(k.nome)}</td><td>${k.cat}</td><td class="n mono">${data(k.vence)}</td><td class="n">${R(k.valor)}</td><td>${k.pago ? '<span class="tag ok">baixada</span>' : k.vence < 0 ? '<span class="tag erro">vencida</span>' : k.vence <= 3 ? '<span class="tag alerta">vence logo</span>' : '<span class="tag">em aberto</span>'}</td><td class="n">${k.pago ? '' : `<button class="btn peq" data-acao="baixar" data-id="${k.id}">Baixar</button>`}</td></tr>`).join('')}</tbody></table></div>`;
  } else if (aba === 'unidades') {
    const mes = db.vendas.filter((v) => v.dia > -diaMes()), rbT = soma(mes, (v) => v.total) || 1, despGer = db.contas.filter((k) => k.tipo === 'pagar' && !['Fornecedor', 'Impostos'].includes(k.cat));
    const linhas = KS().map((k) => { const vs = mes.filter((v) => v.un === k), rb = soma(vs, (v) => v.total), cmv = soma(vs, custoVenda), imp = rb * 0.067, propria = soma(despGer.filter((d) => norm(d.nome).includes(norm(curto(k)))), (d) => d.valor), comum = soma(despGer.filter((d) => !KS().some((u) => norm(d.nome).includes(norm(curto(u))))), (d) => d.valor) * rb / rbT, res = rb - imp - cmv - propria - comum; return { k, rb, cmv, imp, propria, comum, res }; });
    corpo = `<div class="tab-caixa"><table><thead><tr><th>Mês atual</th>${linhas.map((l) => `<th class="n">${esc(curto(l.k))}</th>`).join('')}</tr></thead><tbody>${[['Receita de vendas', 'rb', 1], ['(−) Simples estimado', 'imp', -1], ['(−) Custo das mercadorias', 'cmv', -1], ['(−) Despesas da própria unidade', 'propria', -1], ['(−) Despesas comuns (rateio pela receita)', 'comum', -1]].map(([n, c, s1]) => `<tr><td>${n}</td>${linhas.map((l) => `<td class="n">${s1 < 0 ? '− ' : ''}${R(l[c])}</td>`).join('')}</tr>`).join('')}<tr class="sel"><td><b>= Resultado</b></td>${linhas.map((l) => `<td class="n"><b style="color:${l.res < 0 ? 'var(--erro)' : 'inherit'}">${R(l.res)}</b><br><span class="sub">${pct(l.rb ? l.res / l.rb : 0)} da receita</span></td>`).join('')}</tr></tbody></table></div><p class="sub">Despesa com o nome da unidade (ex.: Aluguel Filial) fica com ela; as outras são divididas pela receita de cada uma.</p>`;
  } else if (aba === 'cartoes') {
    const dias = Array.from({ length: 7 }, (_, i) => -i - 1).map((d) => { const vs = db.vendas.filter((v) => v.dia === d), linha = (f) => { const b = soma(vs.filter((v) => (v.parts ? v.parts.some((p) => p[0] === f) : v.pag === f)), (v) => (v.parts ? v.parts.find((p) => p[0] === f)?.[1] || 0 : v.total)); return { b, liq: b * (1 - TAXA[f]) }; }; return { d, cr: linha('Crédito'), db: linha('Débito'), ok: db.conciliados.some((c) => c.dia === d) }; });
    corpo = `<div class="tab-caixa"><table><thead><tr><th>Dia da venda</th><th class="n">Crédito (bruto)</th><th class="n">Débito (bruto)</th><th class="n">Taxas</th><th class="n">Deve cair na conta</th><th>Repasse</th><th></th></tr></thead><tbody>${dias.map((x) => `<tr><td class="mono">${data(x.d)}</td><td class="n">${R(x.cr.b)}</td><td class="n">${R(x.db.b)}</td><td class="n">− ${R(x.cr.b - x.cr.liq + x.db.b - x.db.liq)}</td><td class="n"><b>${R(x.cr.liq + x.db.liq)}</b><br><span class="sub">débito em ${data(x.d + 1)}, crédito em ${data(x.d + 30)}</span></td><td>${x.ok ? '<span class="tag ok">conferido</span>' : '<span class="tag alerta">a conferir</span>'}</td><td class="n">${x.ok ? '' : `<button class="btn peq" data-acao="conciliar" data-d="${x.d}">Bateu com o extrato</button>`}</td></tr>`).join('')}</tbody></table></div><p class="sub">Taxas combinadas com a maquininha: crédito ${pct(TAXA['Crédito'])} e débito ${pct(TAXA['Débito'])}. Se o valor do extrato vier diferente, reclame com a operadora com esta tabela.</p>`;
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
  return `<div class="mod-cab"><div><h1>Clientes</h1><p>${Object.entries(cont).map(([g, n]) => `${n} ${g}`).join(' · ')} · ${R(soma(db.clientes, (c) => c.saldo))} a receber em vendas a prazo</p></div><div class="acoes"><button class="btn" data-acao="campanha">Mensagem para quem sumiu</button><button class="btn prim" data-acao="novo-cliente">${I.mais}Novo cliente</button></div></div>
  <div class="tab-caixa"><table><thead><tr><th>Cliente</th><th>CPF/CNPJ</th><th>Grupo</th><th class="n">Compras (30 d)</th><th class="n">Gasto (30 d)</th><th class="n">Última compra</th><th class="n">Saldo a prazo</th><th>Crédito usado</th><th></th></tr></thead><tbody>
  ${ord.map((c) => { const g = grupo(c, top), uso = c.limite ? c.saldo / c.limite : 0; return `<tr><td><b>${esc(c.nome)}</b></td><td class="mono">${c.doc}</td><td><span class="tag ${g[1]}">${g[0]}</span></td><td class="n">${c.compras}</td><td class="n">${R(c.gasto)}</td><td class="n">${c.ultima > 900 ? '—' : c.ultima === 0 ? 'hoje' : `há ${c.ultima} d`}</td><td class="n">${R(c.saldo)}</td><td style="min-width:120px"><div class="barra-h ${uso > .8 ? '' : 'ouro'}"><i style="width:${Math.min(100, uso * 100)}%"></i></div><span class="sub">${pct(uso)} de ${Rk(c.limite)}</span></td><td class="n" style="white-space:nowrap">${c.saldo > 0 ? `<button class="btn peq" data-acao="receber-cli" data-id="${c.id}">Receber</button> ` : ''}<button class="btn peq" data-acao="limite" data-id="${c.id}">Crédito</button></td></tr>`; }).join('')}</tbody></table></div>`;
}

function mEquipe() {
  const mes = db.vendas.filter((v) => v.dia > -diaMes());
  return `<div class="mod-cab"><div><h1>Equipe e metas</h1><p>Metas do mês e comissões calculadas sobre o que cada um vendeu.</p></div><div class="acoes"><button class="btn prim" data-acao="fechar-comissoes" ${db.comPagas.some((c) => c.mes === new Date().toISOString().slice(0, 7)) ? 'disabled' : ''}>Fechar comissões do mês</button></div></div>${db.comPagas.length ? `<p class="sub">Fechadas: ${[...new Set(db.comPagas.map((c) => c.mes))].map((m) => `${m.split('-').reverse().join('/')} (${R(soma(db.comPagas.filter((c) => c.mes === m), (c) => c.valor))})`).join(' · ')}</p>` : ''}
  <div class="tab-caixa"><table><thead><tr><th>Vendedor</th><th>Unidade</th><th class="n">Vendas</th><th class="n">Vendido no mês</th><th class="n">Meta</th><th>Andamento</th><th class="n">Ticket médio</th><th class="n">Comissão</th><th class="n">A pagar</th><th></th></tr></thead><tbody>
  ${db.vendedores.map((v) => { const vs = mes.filter((x) => x.vend === v.id), f = soma(vs, (x) => x.total), ritmo = v.meta > 0 && f / v.meta >= diaMes() / 30; return `<tr><td><b>${esc(v.nome)}</b></td><td>${UN[v.un]}</td><td class="n">${vs.length}</td><td class="n">${R(f)}</td><td class="n">${R(v.meta)}</td><td style="min-width:150px"><div class="barra-h ${ritmo ? '' : 'ouro'}"><i style="width:${Math.min(100, f / v.meta * 100)}%"></i></div><span class="sub">${pct(f / v.meta)} · ${ritmo ? 'no ritmo' : 'abaixo do ritmo'}</span></td><td class="n">${R(f / Math.max(1, vs.length))}</td><td class="n">${v.comissao.toLocaleString('pt-BR')}%</td><td class="n"><b>${R(f * v.comissao / 100)}</b></td><td class="n"><button class="btn peq" data-acao="editar-vend" data-id="${v.id}">Editar</button></td></tr>`; }).join('')}</tbody></table></div>`;
}

function mFiscal() {
  const f = db.busca.fiscal || 'atencao', ns = vendasUn().filter((v) => (f === 'atencao' ? v.nota.status !== 'Autorizada' : true)).sort((a, b) => b.nota.num - a.nota.num).slice(0, 80);
  const cont = (s) => vendasUn().filter((v) => v.nota.status === s).length;
  return `<div class="mod-cab"><div><h1>Notas fiscais</h1><p>${cont('Autorizada')} autorizadas · ${cont('Rejeitada')} rejeitadas · ${cont('Contingência')} em contingência (30 dias, ${unTxt()})</p></div><div class="acoes"><button class="btn prim" data-acao="reenviar-todas" ${cont('Rejeitada') + cont('Contingência') ? '' : 'disabled'}>Corrigir e reenviar todas</button></div></div>
  ${db.devolucoes.length ? `<p class="sub">Notas de devolução: ${db.devolucoes.slice(-4).reverse().map((d) => `${d.nota} (venda ${d.n}, ${R(d.valor)})`).join(' · ')}</p>` : ''}<div class="filtros"><div class="seg">${[['atencao', 'Precisam de atenção'], ['todas', 'Últimas 80']].map(([k, n]) => `<button data-acao="fiscal-filtro" data-v="${k}" aria-pressed="${f === k}">${n}</button>`).join('')}</div></div>
  <div class="tab-caixa"><table><thead><tr><th>Número</th><th>Tipo</th><th>Data</th><th>Unidade</th><th>Destinatário</th><th class="n">Valor</th><th>Situação</th><th>Detalhe</th><th></th></tr></thead><tbody>
  ${ns.map((v) => `<tr><td class="mono">${v.nota.num}</td><td>${v.nota.tipo}</td><td class="mono">${data(v.dia)} ${String(v.hora).padStart(2, '0')}h</td><td>${UN[v.un]}</td><td>${v.cli ? esc(cli(v.cli).nome) : 'Consumidor final'}</td><td class="n">${R(v.total)}</td><td><span class="tag ${v.nota.status === 'Autorizada' ? 'ok' : v.nota.status === 'Rejeitada' ? 'erro' : 'alerta'}">${v.nota.status}</span></td><td class="sub">${esc(v.nota.motivo)}</td><td class="n">${v.nota.status !== 'Autorizada' ? `<button class="btn peq" data-acao="reenviar" data-n="${v.n}">Reenviar</button>` : v.itens.some((x) => x.qtd - (x.dev || 0) > 0) && v.dia >= -30 ? `<button class="btn peq" data-acao="devolver" data-n="${v.n}">Devolver</button>` : '<span class="tag">devolvida</span>'}</td></tr>`).join('') || '<tr><td colspan="9" class="vazio" style="text-align:center;padding:24px">Todas as notas estão autorizadas.</td></tr>'}</tbody></table></div>`;
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

function mCaixa() {
  return `<div class="mod-cab"><div><h1>Caixa</h1><p>Um caixa por unidade: abre com o troco, registra sangria (tirar dinheiro) e suprimento (pôr troco) e fecha conferindo a gaveta. A venda só passa com o caixa aberto.</p></div></div>
  <div class="bento">${KS().map((k) => { const c = db.caixas[k], vs = db.vendas.filter((v) => v.dia === 0 && v.un === k), por = {}; vs.forEach((v) => (v.parts || [[v.pag, v.total]]).forEach(([f, x]) => { por[f] = (por[f] || 0) + x; })); return `<section class="pn c6"><div class="pn-cab"><h2>${esc(UN[k])}</h2><span class="tag ${c.aberto ? 'ok' : ''}">${c.aberto ? `aberto desde ${c.hora}` : 'fechado'}</span></div>
    <ul class="lista"><li><div class="cresce"><b>Dinheiro na gaveta (sistema)</b><span>abertura ${R(c.abertura)} + vendas em dinheiro + suprimentos − sangrias − devoluções</span></div><b class="mono">${R(dinheiroCaixa(k))}</b></li>${Object.entries(por).map(([f, x]) => `<li><div class="cresce"><b>${esc(f)}</b></div><span class="mono">${R(x)}</span></li>`).join('')}${c.sangrias.map((x) => `<li><div class="cresce"><b>Sangria</b><span>${esc(x.motivo)} · ${x.hora}</span></div><span class="mono">− ${R(x.v)}</span></li>`).join('')}${c.suprimentos.map((x) => `<li><div class="cresce"><b>Suprimento</b><span>${x.hora}</span></div><span class="mono">+ ${R(x.v)}</span></li>`).join('')}${c.fechamentos.map((x) => `<li><div class="cresce"><b>Fechamento</b><span>${x.hora} · contado ${R(x.contado)}</span></div><span class="tag ${x.dif ? 'erro' : 'ok'}">${x.dif ? R(x.dif) : 'bateu'}</span></li>`).join('')}</ul>
    <div class="acoes" style="margin-top:10px">${c.aberto ? `<button class="btn peq" data-acao="mov-caixa" data-k="${k}" data-t="sangria">Sangria</button><button class="btn peq" data-acao="mov-caixa" data-k="${k}" data-t="suprimento">Suprimento</button><button class="btn peq prim" data-acao="fechar-caixa" data-k="${k}">Fechar o caixa</button>` : `<button class="btn peq prim" data-acao="abrir-caixa" data-k="${k}">Abrir o caixa</button>`}</div></section>`; }).join('')}</div>`;
}
function mPrecos() {
  const l = db.promos.filter((x) => x.ate >= 0), alvoTxt = (a) => (a.startsWith('cat:') ? `toda a categoria ${a.slice(4)}` : prod(a.slice(2))?.nome || '—');
  return `<div class="mod-cab"><div><h1>Preços e promoções</h1><p>Reajuste uma categoria inteira de uma vez (com trava de margem mínima) e programe promoções com data para acabar: o caixa já cobra o preço certo.</p></div><div class="acoes"><button class="btn" data-acao="reajuste">Reajustar preços</button><button class="btn prim" data-acao="nova-promo">${I.mais}Promoção</button></div></div>
  <div class="bento"><section class="pn c6"><div class="pn-cab"><h2>Promoções valendo</h2><span class="tag lav">${l.length}</span></div><ul class="lista">${l.map((x) => `<li><div class="cresce"><b>${x.pct}% em ${esc(alvoTxt(x.alvo))}</b><span>até ${data(x.ate)}</span></div><button class="btn peq" data-acao="tira-promo" data-id="${x.id}">Encerrar</button></li>`).join('') || '<li class="vazio">Nenhuma promoção.</li>'}</ul></section>
  <section class="pn c6"><div class="pn-cab"><h2>Margem por produto</h2></div><div class="tab-caixa" style="max-height:46vh"><table><thead><tr><th>Produto</th><th class="n">Custo</th><th class="n">Preço</th><th class="n">Margem</th></tr></thead><tbody>${db.produtos.map((p) => { const pv = precoV(p), m = (pv - p.custo) / pv; return `<tr><td>${esc(p.nome)}${pv !== p.preco ? ' <span class="tag alerta">promoção</span>' : ''}</td><td class="n">${R(p.custo)}</td><td class="n">${R(pv)}</td><td class="n"><span class="tag ${m < 0.25 ? 'erro' : m < 0.35 ? 'alerta' : 'ok'}">${pct(m)}</span></td></tr>`; }).join('')}</tbody></table></div></section></div>`;
}
function mInventario() {
  const cats = [...new Set(db.produtos.map((p) => p.cat))];
  return `<div class="mod-cab"><div><h1>Inventário</h1><p>Contagem cega: quem conta não vê o que o sistema diz. Conte uma categoria por vez, sem fechar a loja. A diferença vira ajuste com registro na auditoria.</p></div><div class="acoes"><button class="btn prim" data-acao="contagem">Contar uma categoria</button></div></div>
  <div class="bento"><section class="pn c7"><div class="pn-cab"><h2>Contagens</h2></div><div class="tab-caixa"><table><thead><tr><th>Quando</th><th>Categoria</th><th>Unidade</th><th class="n">Itens</th><th class="n">Com diferença</th><th class="n">Acuracidade</th></tr></thead><tbody>${[...db.inventarios].sort((a, b) => b.dia - a.dia).map((x) => `<tr><td class="mono">${data(x.dia)}</td><td>${esc(x.cat)}</td><td>${esc(curto(x.un))}</td><td class="n">${x.itens}</td><td class="n">${x.div}</td><td class="n"><span class="tag ${x.acur >= 0.98 ? 'ok' : x.acur >= 0.9 ? 'alerta' : 'erro'}">${pct(x.acur)}</span></td></tr>`).join('') || '<tr><td colspan="6" class="vazio">Nenhuma contagem ainda.</td></tr>'}</tbody></table></div></section>
  <section class="pn c5"><div class="pn-cab"><h2>Próximas a contar</h2></div><ul class="lista">${cats.map((c) => { const u = db.inventarios.filter((x) => x.cat === c).sort((a, b) => b.dia - a.dia)[0]; return { c, d: u ? -u.dia : 999 }; }).sort((a, b) => b.d - a.d).map((x) => `<li><div class="cresce"><b>${esc(x.c)}</b><span>${x.d > 900 ? 'nunca contada' : `última há ${x.d} dias`}</span></div>${x.d > 30 ? '<span class="tag alerta">contar</span>' : ''}</li>`).join('')}</ul></section></div>`;
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
const RENDER = { caixa: mCaixa, precos: mPrecos, inventario: mInventario, dono: mDono, cockpit: mCockpit, pdv: mPdv, estoque: mEstoque, compras: mCompras, financeiro: mFinanceiro, clientes: mClientes, equipe: mEquipe, fiscal: mFiscal, relatorios: mRelatorios, auditoria: mAuditoria, modulos: mModulos };

function desenhar() {
  $('#abas').innerHTML = db.abas.map((m) => `<div class="aba" role="tab" tabindex="0" aria-selected="${m === db.ativa}" data-acao="abrir" data-m="${m}">${I[m]}<span>${MOD[m].nome}</span>${db.abas.length > 1 ? `<span class="fechar-aba" role="button" aria-label="Fechar ${MOD[m].nome}" data-acao="fechar-aba" data-m="${m}">${I.x}</span>` : ''}</div>`).join('') + `<button class="aba-nova" data-acao="abrir" data-m="modulos" aria-label="Abrir módulo">${I.mais}</button>`;
  $('#area').innerHTML = RENDER[db.ativa]();
  if (db.ativa === 'dono') painelDono($('#ga-dono'), DONO);
  $('#filial').innerHTML = `<option value="todas">${KS().length > 1 ? 'Todas as unidades' : 'A loja toda'}</option>${KS().map((k) => `<option value="${k}">${esc(UN[k])}</option>`).join('')}<option value="__nova">+ Nova unidade…</option>${db.un !== 'todas' ? '<option value="__renomear">Renomear esta unidade…</option>' : ''}`;
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
  const un = db.un === 'todas' ? k0() : db.un, it = db.pdv.itens.find((x) => x.id === p.id), ja = it?.qtd || 0;
  if (ja + qtd > p.est[un]) { avisar(`${p.nome}: só há ${p.est[un]} na ${UN[un]}.`); return; }
  if (it) it.qtd += qtd; else db.pdv.itens.push({ id: p.id, qtd });
  gravar(); desenhar(); $('#leitor-in')?.focus();
}
function pagar(forma) {
  const it = db.pdv.itens; if (!it.length) return;
  const total = soma(it, (x) => x.qtd * precoV(prod(x.id))), un = db.un === 'todas' ? k0() : db.un;
  if (!db.caixas[un]?.aberto) { avisar(`O caixa da ${curto(un)} está fechado: abra em Caixa.`); return; }
  const formas = ['Pix', 'Crédito', 'Débito', 'Dinheiro', 'A prazo'];
  janela(`Pagamento · ${R(total)}`, `<form class="form" id="f"><p class="dica" style="margin:0">Divida entre as formas que o cliente usar. A nota sai assim que o total fechar.</p>${formas.map((f) => `<label>${f}${f === 'A prazo' ? ' <span class="dica">(precisa de cliente com crédito)</span>' : ''}<input class="campo" name="${f}" inputmode="decimal" value="${f === forma ? total.toFixed(2).replace('.', ',') : ''}" placeholder="0,00"></label>`).join('')}<p class="mono" id="falta"></p></form>`, 'Emitir nota e concluir', () => {
    const fd = new FormData($('#f')), parts = formas.map((f) => [f, num(fd.get(f)) || 0]).filter((x) => x[1] > 0), pago = soma(parts, (x) => x[1]);
    if (pago + 0.005 < total) return erroJanela(`Faltam ${R(total - pago)}.`);
    const prazo = parts.find((x) => x[0] === 'A prazo'), c = cli(db.pdv.cli);
    if (prazo && !c) return erroJanela('Venda a prazo precisa de um cliente.');
    if (prazo && c.saldo + prazo[1] > c.limite) return erroJanela(`Passa do crédito de ${c.nome} (${R(c.limite - c.saldo)} livres).`);
    const troco = Math.max(0, pago - total);
    if (troco && !parts.some((x) => x[0] === 'Dinheiro')) return erroJanela('Só dá troco quando entra dinheiro.');
    const itens = it.map((x) => { const p = prod(x.id); p.est[un] -= x.qtd; let r = x.qtd; p.lotes.filter((l) => l.un === un && l.qtd > 0).sort((a, b) => a.vence - b.vence).forEach((l) => { const t = Math.min(r, l.qtd); l.qtd -= t; r -= t; }); return { id: p.id, qtd: x.qtd, preco: precoV(p), custo: p.custo }; });
    const v = { n: db.proxVenda++, dia: 0, hora: new Date().getHours(), un, vend: db.pdv.vend, itens, total, pag: parts.map((x) => x[0]).join(' + '), parts, troco, cli: c?.id || '', nota: { tipo: c && c.doc.includes('/') ? 'NF-e' : 'NFC-e', num: db.proxNota++, status: 'Autorizada', motivo: '' } };
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
  janela('Transferir entre unidades', `<form class="form" id="f"><label>Produto<select class="campo" name="id">${db.produtos.map((x) => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${x.sku} · ${esc(x.nome)} (${KS().map((k) => `${esc(curto(k))} ${x.est[k] || 0}`).join(' / ')})</option>`).join('')}</select></label>
    <div class="dupla"><label>De<select class="campo" name="de">${KS().map((k) => `<option value="${k}">${esc(curto(k))}</option>`).join('')}</select></label><label>Para<select class="campo" name="para">${KS().map((k, i) => `<option value="${k}" ${i === 1 ? 'selected' : ''}>${esc(curto(k))}</option>`).join('')}</select></label><label>Quantidade<input class="campo" name="qtd" type="number" min="1" value="1"></label></div></form>`, 'Transferir', () => {
    const fd = new FormData($('#f')), x = prod(fd.get('id')), de = fd.get('de'), para = fd.get('para'), q = Math.floor(num(fd.get('qtd')));
    if (de === para) return erroJanela('Escolha unidades diferentes.');
    if (!(q > 0)) return erroJanela('Coloque a quantidade.');
    if (q > (x.est[de] || 0)) return erroJanela(`A ${curto(de)} só tem ${x.est[de] || 0}.`);
    x.est[de] -= q; x.est[para] = (x.est[para] || 0) + q;
    let r = q; x.lotes.filter((l) => l.un === de && l.qtd > 0).sort((a, b) => a.vence - b.vence).forEach((l) => { const t = Math.min(r, l.qtd); if (t) { l.qtd -= t; x.lotes.push({ ...l, qtd: t, un: para }); r -= t; } });
    db.movs.push({ dia: 0, hora: agoraTxt(), tipo: 'Transferência', txt: `${q}× ${x.nome}: ${UN[de]} → ${UN[para]}`, quem: OPERADOR });
    registrar(`Transferiu ${q}× ${x.nome} da ${UN[de]} para a ${UN[para]}`); avisar('Transferência registrada.'); return true;
  });
}
function ajustar(id) {
  const p = prod(id);
  janela(`Ajustar estoque · ${esc(p.nome)}`, `<form class="form" id="f"><p class="dica" style="margin:0">Use depois de contar a prateleira (inventário). O motivo fica na auditoria.</p><div class="dupla">${KS().map((k) => `<label>${esc(curto(k))} (contado)<input class="campo" name="u_${k}" type="number" min="0" value="${p.est[k] || 0}"></label>`).join('')}</div><label>Motivo<select class="campo" name="motivo"><option>Inventário</option><option>Avaria</option><option>Furto ou perda</option><option>Consumo interno</option></select></label></form>`, 'Salvar ajuste', () => {
    const fd = new FormData($('#f')), novo = Object.fromEntries(KS().map((k) => [k, Math.floor(num(fd.get(`u_${k}`)))]));
    if (!Object.values(novo).every((v) => v >= 0)) return erroJanela('Quantidades inválidas.');
    const dif = Object.values(novo).reduce((t, v) => t + v, 0) - estTot(p); Object.assign(p.est, novo);
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
    o.itens.forEach((x) => { const p = prod(x.id); p.est[k0()] = (p.est[k0()] || 0) + x.qtd; p.custo = x.custo; if (p.perecivel) p.lotes.push({ lote: `L${String(30000 + o.num).padStart(5, '0')}`, vence: 60, qtd: x.qtd, un: k0() }); });
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
  { n: 'Exportar curva ABC (planilha)', t: 'ação', f: exportarAbc }, { n: 'Abrir ou fechar o caixa', t: 'ação', f: () => abrir('caixa') }, { n: 'Programar promoção', t: 'ação', f: () => abrir('precos') }, { n: 'Contar estoque (inventário)', t: 'ação', f: () => abrir('inventario') }, { n: 'Conciliar cartões', t: 'ação', f: () => { db.finAba = 'cartoes'; abrir('financeiro'); } }, { n: 'Reenviar notas rejeitadas', t: 'ação', f: () => { db.busca.fiscal = 'atencao'; abrir('fiscal'); } },
];
let pItens = [], pSel = 0;
function paleta() { $('#paleta-fundo').hidden = false; $('#paleta-q').value = ''; filtrarPaleta(); $('#paleta-q').focus(); }
const fecharPaleta = () => { $('#paleta-fundo').hidden = true; };
function filtrarPaleta() {
  const q = norm($('#paleta-q').value);
  const mods = Object.entries(MOD).filter(([k]) => k !== 'modulos').map(([k, m]) => ({ n: m.nome, t: `módulo${m.k ? ` · ${m.k}` : ''}`, ic: I[k], f: () => abrir(k) }));
  const prods = db.produtos.map((p) => ({ n: `${p.sku} · ${p.nome}`, t: `produto · ${R(p.preco)} · ${KS().map((k) => `${curto(k)} ${p.est[k] || 0}`).join(' / ')}`, f: () => { db.estoqueAba = 'posicao'; db.busca.estoque = p.sku; abrir('estoque'); } }));
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

// ---------------------------------------------------------------- funções de 10/2026 (2ª leva)
const NOVOS = { cestas: ['Cestas de presente', 'Montagem, custo e margem de cada cesta', 'compras'], corporativo: ['Pedidos de empresas', 'Cestas de fim de ano com sinal e entrega', 'clientes'], fracionamento: ['Fracionamento', 'Queijos e frios em pedaços, com etiqueta e perda de corte', 'estoque'], degustacao: ['Degustações', 'Custo da ação e quanto vendeu a mais', 'relatorios'], clube: ['Clube do vinho', 'Assinatura mensal com kit', 'clientes'], vales: ['Vale-presente', 'Emitir, consultar saldo e usar', 'pdv'], delivery: ['Delivery', 'Pedidos com taxa por bairro e prazo', 'compras'], ruptura: ['Ruptura', 'Produto zerado e quanto deixa de vender', 'estoque'], perdas: ['Perdas e quebras', 'Vencidos e avarias contra a meta', 'estoque'], fornmargem: ['Margem por fornecedor', 'Quem dá lucro e quem prende dinheiro', 'compras'], acordos: ['Acordos com fornecedores', 'Bonificação por volume comprado', 'compras'], pedidominimo: ['Pedido mínimo', 'Completar o pedido para ganhar o frete', 'compras'], fimdeano: ['Planejamento de fim de ano', 'Quanto comprar para dezembro', 'relatorios'], comparativo: ['Comparativo das unidades', 'Ticket, itens por venda e margem lado a lado', 'relatorios'], orcdesp: ['Orçamento de despesas', 'Previsto contra o que vence no mês', 'financeiro'], score: ['Crédito dos clientes', 'Limite sugerido pelo histórico', 'clientes'], regua: ['Régua de cobrança', 'Lembrete antes, no dia e depois', 'financeiro'], produtividade: ['Vendas por hora', 'Quanto cada vendedor vende por hora', 'equipe'], metascat: ['Metas por categoria', 'Quanto cada categoria precisa vender', 'equipe'], concorrencia: ['Preço da concorrência', 'Pesquisa nos empórios do bairro', 'precos'] };
const CONC = ['Super Nobre', 'Empório da Esquina'];
const MULT_DEZ = { Bebidas: 2.4, Doces: 1.9, Frios: 1.6, Importados: 1.7, Cafés: 1.3, Mercearia: 1.1 };
const tb = (cab, linhas, vazio) => `<div class="tab-caixa"><table><thead><tr>${cab.map((c) => (c.startsWith('$') ? `<th class="n">${c.slice(1)}</th>` : `<th>${c}</th>`)).join('')}</tr></thead><tbody>${linhas.join('') || `<tr><td colspan="${cab.length}" class="vazio">${vazio}</td></tr>`}</tbody></table></div>`;
const cabM = (k, botoes = '') => `<div class="mod-cab"><div><h1>${NOVOS[k][0]}</h1><p>${NOVOS[k][1]}.</p></div>${botoes ? `<div class="acoes">${botoes}</div>` : ''}</div>`;
const fone = (t) => String(t || '').replace(/\D/g, '');
const unsF = () => (db.un === 'todas' ? KS() : [db.un]);
const custoCesta = (c) => soma(c.itens, (x) => x.qtd * (prod(x.id)?.custo || 0)) + c.emb;
const montaveis = (c) => Math.min(...c.itens.map((x) => Math.floor(estTot(prod(x.id)) / x.qtd)));
const vendas30Un = (k) => { const m = {}; db.vendas.filter((v) => v.un === k).forEach((v) => v.itens.forEach((x) => { m[x.id] = (m[x.id] || 0) + x.qtd; })); return m; };
Object.entries(NOVOS).forEach(([k, [nome, desc, ico]]) => { MOD[k] = { nome, desc, k: '' }; I[k] = I[ico]; });
['cestas', 'corporativo', 'fracionados', 'degustacoes', 'vales', 'delivery', 'acordos', 'perdasReg', 'concorr'].forEach((k) => { if (!Array.isArray(db[k])) db[k] = []; }); db.clube ||= { preco: 149, un: {}, kit: [] }; db.orcDesp ||= {}; db.metaCat ||= {}; db.taxas ||= {}; db.regua ||= {};

Object.assign(RENDER, {
  cestas() { return `${cabM('cestas', `<button class="btn prim" data-acao="ga-cesta-nova">${I.mais}Nova cesta</button>`)}<div class="bento">${db.cestas.map((c) => { const cu = custoCesta(c), mt = montaveis(c); return `<section class="pn c4"><div class="pn-cab"><h2>${esc(c.nome)}</h2><span class="tag ${c.estoque ? 'ok' : ''}">${c.estoque || 0} prontas</span></div><ul class="lista">${c.itens.map((x) => `<li><div class="cresce"><b>${x.qtd}× ${esc(prod(x.id)?.nome || '')}</b><span>tem ${estTot(prod(x.id))}</span></div></li>`).join('')}<li><div class="cresce"><b>Embalagem e laço</b></div><span class="mono">${R(c.emb)}</span></li></ul><p class="sub">Custo ${R(cu)} · preço ${R(c.preco)} · margem <b>${pct((c.preco - cu) / c.preco)}</b> · dá para montar ${mt}</p><div class="acoes"><button class="btn peq prim" data-acao="ga-montar" data-id="${c.id}" ${mt ? '' : 'disabled'}>Montar</button></div></section>`; }).join('') || '<p class="vazio">Nenhuma cesta.</p>'}</div>`; },
  corporativo() { const l = db.corporativo; return `${cabM('corporativo', `<button class="btn prim" data-acao="ga-corp-novo">${I.mais}Pedido de empresa</button>`)}<div class="bento">${kpi('Em pedidos', R(soma(l.filter((x) => x.st !== 'proposta'), (x) => x.qtd * x.valorUn)), `${l.filter((x) => x.st !== 'proposta').length} confirmado(s)`, 'c3')}${kpi('Propostas', R(soma(l.filter((x) => x.st === 'proposta'), (x) => x.qtd * x.valorUn)), 'esperando a empresa', 'c3')}</div>${tb(['Empresa', 'Cesta', '$Qtd', '$Valor', '$Sinal', 'Entrega', 'Faltam itens', 'Situação', ''], l.map((x) => { const c = db.cestas.find((y) => y.id === x.cesta), falta = c ? c.itens.map((i) => ({ p: prod(i.id), q: i.qtd * x.qtd - estTot(prod(i.id)) })).filter((y) => y.q > 0) : []; return `<tr><td><b>${esc(x.empresa)}</b></td><td>${esc(c?.nome || '')}</td><td class="n">${x.qtd}</td><td class="n">${R(x.qtd * x.valorUn)}</td><td class="n">${R(x.sinal)}</td><td>${data(x.entrega)}</td><td>${falta.length ? falta.map((y) => `${y.q}× ${esc(y.p.nome.split(' ').slice(0, 3).join(' '))}`).join(', ') : '<span class="tag ok">tem tudo</span>'}</td><td><span class="tag ${x.st === 'entregue' ? 'ok' : x.st === 'confirmado' ? 'lav' : ''}">${x.st}</span></td><td>${x.st === 'proposta' ? `<button class="btn peq prim" data-acao="ga-corp" data-id="${x.id}" data-v="confirmado">Fechou</button>` : x.st === 'confirmado' ? `<button class="btn peq" data-acao="ga-corp" data-id="${x.id}" data-v="entregue">Entregue</button>` : ''}</td></tr>`; }), 'Nenhum pedido.')}`; },
  fracionamento() { const l = db.fracionados.slice().reverse(); return `${cabM('fracionamento', `<button class="btn prim" data-acao="ga-fracionar">${I.mais}Fracionar</button>`)}<p class="sub">Peça inteira cortada em pedaços embalados. A perda de corte (casca, aparas) entra no custo; a etiqueta leva peso, preço, data do fracionamento e validade.</p>${tb(['Quando', 'Produto', '$Peças', '$Pedaços', '$Peso', '$Perda', '$Preço do pedaço', 'Validade', ''], l.map((f) => { const p = prod(f.prod); return `<tr><td>${data(f.dia)}</td><td>${esc(p?.nome || '')}</td><td class="n">${f.pecas}</td><td class="n">${f.n}</td><td class="n">${f.g} g</td><td class="n">${f.perda}%</td><td class="n">${R(f.preco)}</td><td>${f.val + f.dia < 0 ? '<span class="tag erro">vencido</span>' : data(f.dia + f.val)}</td><td><button class="btn peq" data-acao="ga-etiqueta" data-id="${f.id}">Etiqueta</button></td></tr>`; }), 'Nada fracionado ainda.')}`; },
  degustacao() { return `${cabM('degustacao', `<button class="btn prim" data-acao="ga-degust">${I.mais}Degustação</button>`)}${tb(['Quando', 'Produto', 'Unidade', '$Custo da ação', '$Vendia por dia', '$Vendeu no dia', '$Venda a mais', 'Valeu?'], db.degustacoes.map((d) => { const p = prod(d.prod), extra = (d.dia2 - d.antes) * p.preco, lucro = (d.dia2 - d.antes) * (p.preco - p.custo) - d.custo; return `<tr><td>${data(d.dia)}</td><td>${esc(p.nome)}</td><td>${esc(curto(d.un))}</td><td class="n">${R(d.custo)}</td><td class="n">${d.antes}</td><td class="n">${d.dia2}</td><td class="n">${R(extra)}</td><td>${lucro >= 0 ? `<span class="tag ok">sim, +${R(lucro)}</span>` : `<span class="tag erro">não, ${R(lucro)}</span>`}</td></tr>`; }), 'Nenhuma degustação.')}<p class="sub">Lucro = venda a mais × margem do produto − custo da ação (produto aberto e promotor).</p>`; },
  clube() { const c = db.clube, ks = unsF(), at = soma(ks, (k) => c.un[k]?.ativos || 0), canc = soma(ks, (k) => c.un[k]?.cancelados || 0), cust = soma(c.kit, (x) => x.qtd * prod(x.id).custo); return `${cabM('clube', `<button class="btn prim" data-acao="ga-clube-cobrar">Cobrar o mês</button>`)}<div class="bento">${kpi('Assinantes', String(at), `${soma(ks, (k) => c.un[k]?.pausados || 0)} pausados`, 'c3')}${kpi('Receita por mês', R(at * c.preco), `${R(c.preco)} cada`, 'c3')}${kpi('Margem do kit', pct((c.preco - cust) / c.preco), `custo ${R(cust)}`, 'c3')}${kpi('Cancelamento', pct(canc / Math.max(1, at + canc)), `${canc} no mês`, `c3 ${canc / Math.max(1, at + canc) > 0.05 ? 'alerta' : ''}`)}<section class="pn c12"><div class="pn-cab"><h2>Kit do mês</h2></div><ul class="lista">${c.kit.map((x) => `<li><div class="cresce"><b>${x.qtd}× ${esc(prod(x.id).nome)}</b><span>tem ${estTot(prod(x.id))} · precisa ${x.qtd * at}</span></div>${estTot(prod(x.id)) < x.qtd * at ? '<span class="tag erro">comprar</span>' : '<span class="tag ok">ok</span>'}</li>`).join('')}</ul></section></div>`; },
  vales() { const ab = db.vales.filter((v) => v.saldo > 0); return `${cabM('vales', `<button class="btn prim" data-acao="ga-vale-novo">${I.mais}Emitir vale</button>`)}<div class="bento">${kpi('Saldo em aberto', R(soma(ab, (v) => v.saldo)), `${ab.length} vale(s) · é dinheiro que já entrou`, 'c4')}</div>${tb(['Código', 'Comprado por', 'Emitido', '$Valor', '$Saldo', 'Validade', ''], db.vales.slice().reverse().map((v) => `<tr><td class="mono">${esc(v.cod)}</td><td>${esc(v.comprador)}</td><td>${data(v.dia)}</td><td class="n">${R(v.valor)}</td><td class="n"><b>${R(v.saldo)}</b></td><td>${data(v.dia + 365)}</td><td>${v.saldo > 0 ? `<button class="btn peq" data-acao="ga-vale-usar" data-id="${v.id}">Usar</button>` : '<span class="tag">usado</span>'}</td></tr>`), 'Nenhum vale.')}`; },
  delivery() { const l = db.delivery.filter((d) => db.un === 'todas' || d.un === db.un); return `${cabM('delivery', `<button class="btn prim" data-acao="ga-entrega">${I.mais}Pedido</button>`)}<div class="bento">${kpi('Em andamento', String(l.filter((d) => d.st !== 'entregue').length), `${l.filter((d) => d.st !== 'entregue' && d.min > d.prazo).length} atrasado(s)`, 'c3')}${kpi('Taxas cobradas', R(soma(l, (d) => d.taxa)), 'hoje', 'c3')}</div>${tb(['Cliente', 'Bairro', 'Unidade', '$Pedido', '$Taxa', 'Tempo', ''], l.map((d) => `<tr><td><b>${esc(d.cliente)}</b></td><td>${esc(d.bairro)}</td><td>${esc(curto(d.un))}</td><td class="n">${R(d.valor)}</td><td class="n">${R(d.taxa)}</td><td>${d.st === 'entregue' ? `${d.min} min` : `<span class="tag ${d.min > d.prazo ? 'erro' : 'lav'}">${d.min} de ${d.prazo} min</span>`}</td><td>${d.st === 'separando' ? `<button class="btn peq" data-acao="ga-entrega-av" data-id="${d.id}">Saiu</button>` : d.st === 'rota' ? `<button class="btn peq prim" data-acao="ga-entrega-av" data-id="${d.id}">Entregue</button>` : '<span class="tag ok">entregue</span>'}</td></tr>`), 'Nenhum pedido.')}<section class="pn" style="margin-top:14px"><div class="pn-cab"><h2>Taxa por bairro</h2></div><div class="dupla">${Object.entries(db.taxas).map(([b, v]) => `<label>${esc(b)} (R$)<input class="campo" data-taxa="${esc(b)}" inputmode="decimal" value="${v}"></label>`).join('')}</div></section>`; },
  ruptura() { const l = unsF().flatMap((k) => { const v = vendas30Un(k); return db.produtos.filter((p) => (p.est[k] || 0) === 0 && v[p.id]).map((p) => ({ p, k, perde: v[p.id] / 30 * p.preco, outra: KS().find((o) => o !== k && (p.est[o] || 0) > p.min) })); }).sort((a, b) => b.perde - a.perde); return `${cabM('ruptura')}<div class="bento">${kpi('Venda perdida por dia', R(soma(l, (x) => x.perde)), `${l.length} produto(s) zerado(s)`, `c4 ${l.length ? 'alerta' : ''}`)}</div>${tb(['Produto', 'Zerado em', '$Perde por dia', 'Saída'], l.map((x) => `<tr><td><b>${esc(x.p.nome)}</b></td><td>${esc(curto(x.k))}</td><td class="n">${R(x.perde)}</td><td>${x.outra ? `<button class="btn peq prim" data-acao="transferir" data-id="${x.p.id}">Transferir da ${esc(curto(x.outra))}</button>` : '<span class="tag">comprar (Compras)</span>'}</td></tr>`), 'Nenhum produto zerado com venda.')}`; },
  perdas() { const l = db.perdasReg.filter((x) => x.dia > -diaMes() && (db.un === 'todas' || x.un === db.un)), tot = soma(l, (x) => x.qtd * prod(x.prod).custo), fat = soma(doMes(), (v) => v.total), por = {}; l.forEach((x) => { const c = prod(x.prod).cat; por[c] = (por[c] || 0) + x.qtd * prod(x.prod).custo; }); return `${cabM('perdas', `<button class="btn prim" data-acao="ga-perda">${I.mais}Registrar perda</button>`)}<div class="bento">${kpi('Perdas no mês', R(tot), `${pct(tot / Math.max(1, fat))} do faturamento · meta 1%`, `c4 ${tot / Math.max(1, fat) > 0.01 ? 'alerta' : ''}`)}${Object.entries(por).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c, v]) => kpi(c, R(v), 'em perdas', 'c4')).join('')}</div>${tb(['Quando', 'Produto', 'Unidade', '$Qtd', 'Motivo', '$Custo'], l.slice().reverse().map((x) => `<tr><td>${data(x.dia)}</td><td>${esc(prod(x.prod).nome)}</td><td>${esc(curto(x.un))}</td><td class="n">${x.qtd}</td><td>${esc(x.motivo)}</td><td class="n">${R(x.qtd * prod(x.prod).custo)}</td></tr>`), 'Nenhuma perda.')}`; },
  fornmargem() { const v30 = vendidos30(); return `${cabM('fornmargem')}${tb(['Fornecedor', '$Vendido (30 dias)', '$Margem', '$Estoque (custo)', '$Dura', '$Prazo para pagar', 'Leitura'], db.fornecedores.map((f) => { const ps = db.produtos.filter((p) => p.forn === f.id), vend = soma(ps, (p) => (v30[p.id] || 0) * p.preco), cmv = soma(ps, (p) => (v30[p.id] || 0) * p.custo), est = soma(ps, (p) => totalEst(p) * p.custo), dias = cmv ? est / (cmv / 30) : null; return `<tr><td><b>${esc(f.nome)}</b></td><td class="n">${R(vend)}</td><td class="n">${vend ? pct((vend - cmv) / vend) : '—'}</td><td class="n">${R(est)}</td><td class="n">${dias === null ? '—' : `${Math.round(dias)} dias`}</td><td class="n">${f.prazo} dias</td><td>${dias === null ? '' : dias <= f.prazo ? '<span class="tag ok">vende antes de pagar</span>' : `<span class="tag alerta">paga ${Math.round(dias - f.prazo)} dias antes de vender</span>`}</td></tr>`; }), '')}<p class="sub">Quando o estoque dura menos que o prazo do fornecedor, é ele quem financia a loja.</p>`; },
  acordos() { return `${cabM('acordos', `<button class="btn prim" data-acao="ga-acordo">${I.mais}Acordo</button>`)}${tb(['Fornecedor', 'Acordo', '$Comprado', '$Meta', 'Andamento', '$Bonificação', ''], db.acordos.map((a) => { const ok = a.comprado >= a.meta; return `<tr><td><b>${esc(forn(a.forn)?.nome || '')}</b></td><td>${esc(a.regra)}</td><td class="n">${R(a.comprado)}</td><td class="n">${R(a.meta)}</td><td style="min-width:140px"><div class="barra-h ${ok ? '' : 'ouro'}"><i style="width:${Math.min(100, a.comprado / a.meta * 100)}%"></i></div><span class="sub">${ok ? 'meta batida' : `faltam ${R(a.meta - a.comprado)}`}</span></td><td class="n">${R(Math.min(a.comprado, a.meta) * a.pct / 100)}</td><td>${ok && !a.cobrado ? `<button class="btn peq prim" data-acao="ga-acordo-cobrar" data-id="${a.id}">Cobrar</button>` : a.cobrado ? '<span class="tag ok">cobrada</span>' : ''}</td></tr>`; }), 'Nenhum acordo.')}`; },
  pedidominimo() { const sug = sugestao(), v30 = vendidos30(); return `${cabM('pedidominimo')}${tb(['Fornecedor', '$Sugestão de compra', '$Pedido mínimo', 'Situação', 'Para completar'], db.fornecedores.map((f) => { const s = sug.filter((x) => x.p.forn === f.id), tot = soma(s, (x) => x.q * x.p.custo), falta = Math.max(0, (f.pedMin || 0) - tot), extra = []; if (tot && falta) { let r = falta; db.produtos.filter((p) => p.forn === f.id).map((p) => ({ p, cob: cobertura(p, v30) })).sort((a, b) => a.cob - b.cob).forEach(({ p }) => { if (r <= 0) return; const q = Math.max(1, Math.ceil(Math.min(r, p.custo * p.min) / p.custo)); extra.push(`${q}× ${p.nome.split(' ').slice(0, 3).join(' ')}`); r -= q * p.custo; }); } return `<tr><td><b>${esc(f.nome)}</b></td><td class="n">${R(tot)}</td><td class="n">${R(f.pedMin || 0)}</td><td>${!tot ? '<span class="tag">nada a comprar</span>' : falta ? `<span class="tag alerta">faltam ${R(falta)}</span>` : '<span class="tag ok">frete grátis</span>'}</td><td><small>${extra.map(esc).join(', ')}</small></td></tr>`; }), '')}<p class="sub">Abaixo do mínimo o fornecedor cobra frete ou não entrega. Os itens sugeridos para completar são os que vão acabar primeiro.</p>`; },
  fimdeano() { const v30 = vendidos30(), cats = Object.keys(MULT_DEZ); return `${cabM('fimdeano')}${tb(['Categoria', '$Vende por mês', '$Dezembro (previsão)', '$Tem em estoque', '$Comprar a mais', 'Pedir até'], cats.map((c) => { const ps = db.produtos.filter((p) => p.cat === c), mes = soma(ps, (p) => (v30[p.id] || 0) * p.custo), dez = mes * MULT_DEZ[c], est = soma(ps, (p) => totalEst(p) * p.custo), prazo = Math.max(...ps.map((p) => forn(p.forn)?.prazo || 14)) ; const d = new Date(new Date().getFullYear(), 11, 1); d.setDate(d.getDate() - Math.round(prazo / 2)); return `<tr><td><b>${c}</b> <small class="sub">×${String(MULT_DEZ[c]).replace('.', ',')}</small></td><td class="n">${R(mes)}</td><td class="n">${R(dez)}</td><td class="n">${R(est)}</td><td class="n"><b>${R(Math.max(0, dez - est))}</b></td><td>${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td></tr>`; }), '')}<p class="sub">Valores pelo custo. O multiplicador vem de dezembro do ano passado contra a média do ano (vinho e espumante mais que dobram). Peça antes que o fornecedor também fique sem.</p>`; },
  comparativo() { const l = KS().map((k) => { const vs = db.vendas.filter((v) => v.un === k), tot = soma(vs, (v) => v.total), cmv = soma(vs, custoVenda), it = soma(vs, (v) => soma(v.itens, (x) => x.qtd)); return { k, n: vs.length, tot, ticket: tot / Math.max(1, vs.length), ipv: it / Math.max(1, vs.length), mg: tot ? (tot - cmv) / tot : 0, cli: vs.filter((v) => v.cli).length / Math.max(1, vs.length) }; }); const best = (f) => Math.max(...l.map(f)); return `${cabM('comparativo')}${tb(['Indicador', ...l.map((x) => esc(UN[x.k]))], [['Vendido (30 dias)', (x) => R(x.tot), (x) => x.tot], ['Vendas', (x) => String(x.n), (x) => x.n], ['Ticket médio', (x) => R(x.ticket), (x) => x.ticket], ['Itens por venda', (x) => x.ipv.toLocaleString('pt-BR', { maximumFractionDigits: 1 }), (x) => x.ipv], ['Margem bruta', (x) => pct(x.mg), (x) => x.mg], ['Vendas com cliente identificado', (x) => pct(x.cli), (x) => x.cli]].map(([n, f, g]) => `<tr><td>${n}</td>${l.map((x) => `<td class="n">${g(x) === best(g) && l.length > 1 ? `<b>${f(x)}</b>` : f(x)}</td>`).join('')}</tr>`), '')}<p class="sub">Em negrito, a melhor unidade em cada linha: o que ela faz é o que ensinar à outra.</p>`; },
  orcdesp() { const mes = new Date(), fim = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate() - mes.getDate(), real = {}; db.contas.filter((k) => k.tipo === 'pagar' && k.cat !== 'Fornecedor' && k.vence >= -diaMes() + 1 && k.vence <= fim).forEach((k) => { real[k.cat] = (real[k.cat] || 0) + k.valor; }); const cats = [...new Set([...Object.keys(db.orcDesp), ...Object.keys(real)])]; return `${cabM('orcdesp')}${tb(['Grupo', '$Orçado', '$No mês', '$Diferença', ''], cats.map((c) => { const o = db.orcDesp[c] || 0, r = real[c] || 0, d = r - o; return `<tr><td><b>${esc(c)}</b></td><td class="n"><input class="campo" style="width:110px;text-align:right" data-orcd="${esc(c)}" inputmode="decimal" value="${o}" aria-label="Orçado de ${esc(c)}"></td><td class="n">${R(r)}</td><td class="n">${d > 0 ? `<span class="tag erro">+${R(d)}</span>` : R(d)}</td><td>${o ? `<div class="barra-h ${r > o ? 'ouro' : ''}"><i style="width:${Math.min(100, r / o * 100)}%"></i></div>` : ''}</td></tr>`; }), '')}<p class="sub">"No mês" soma as contas a pagar que vencem neste mês, pagas ou não. Fornecedor entra à parte do orçamento de despesas.</p>`; },
  score() { const l = db.clientes.map((c) => { const mesG = c.gasto, atraso = c.saldo > c.limite * 0.8, sug = Math.round(Math.max(500, mesG * 1.5) / 100) * 100, pts = Math.max(0, Math.min(1000, Math.round(500 + Math.min(300, c.compras * 15) - (c.ultima > 45 && c.ultima < 900 ? 200 : 0) - (atraso ? 250 : 0)))); return { c, pts, sug: atraso ? Math.min(c.limite, sug) : sug }; }).sort((a, b) => b.pts - a.pts); return `${cabM('score')}${tb(['Cliente', '$Compras (30 dias)', '$Gastou', '$Deve', '$Pontos', '$Limite hoje', '$Limite sugerido', ''], l.map(({ c, pts, sug }) => `<tr><td><b>${esc(c.nome)}</b></td><td class="n">${c.compras}</td><td class="n">${R(c.gasto)}</td><td class="n">${R(c.saldo)}</td><td class="n"><span class="tag ${pts >= 700 ? 'ok' : pts >= 450 ? 'lav' : 'erro'}">${pts}</span></td><td class="n">${R(c.limite)}</td><td class="n">${R(sug)}</td><td>${sug !== c.limite ? `<button class="btn peq" data-acao="ga-limite" data-id="${c.id}" data-v="${sug}">Usar</button>` : ''}</td></tr>`), '')}<p class="sub">Pontos: compras frequentes sobem; sumiço de mais de 45 dias e dívida perto do limite descem. Limite sugerido: 1,5 vez o que comprou no mês (mínimo R$ 500), sem aumentar para quem está devendo perto do limite.</p>`; },
  regua() { const l = db.clientes.filter((c) => c.saldo > 0 && c.vence != null).sort((a, b) => a.vence - b.vence), passo = (v) => (v > 3 ? null : v > 0 ? ['antes', 'lembrete de que vence em breve'] : v === 0 ? ['hoje', 'vence hoje'] : v >= -5 ? ['depois', 'venceu há poucos dias'] : ['atrasado', `atrasado há ${-v} dias`]); return `${cabM('regua')}${tb(['Cliente', '$Deve', 'Vence', 'Etapa', ''], l.map((c) => { const p = passo(c.vence), feito = db.regua[`${c.id}:${p?.[0]}`]; return `<tr><td><b>${esc(c.nome)}</b></td><td class="n">${R(c.saldo)}</td><td>${data(c.vence)}</td><td>${p ? `<span class="tag ${p[0] === 'atrasado' ? 'erro' : p[0] === 'antes' ? 'lav' : 'alerta'}">${p[1]}</span>` : '<span class="sub">ainda não</span>'}</td><td>${p ? (feito ? '<span class="tag ok">mandado</span>' : `<a class="btn peq prim" target="_blank" rel="noopener" data-regua="${c.id}:${p[0]}" href="https://wa.me/55${fone(c.tel)}?text=${encodeURIComponent(`Olá! Aqui é do ${DONO.empresa}. ${p[0] === 'antes' ? `Lembrando que a fatura de ${R(c.saldo)} vence ${data(c.vence)}.` : p[0] === 'hoje' ? `A fatura de ${R(c.saldo)} vence hoje.` : `A fatura de ${R(c.saldo)} venceu ${data(c.vence)}. Podemos combinar o pagamento?`} Obrigado!`)}">Mandar</a>`) : ''}</td></tr>`; }), 'Ninguém com conta a prazo.')}<p class="sub">Três toques: 3 dias antes, no dia e até 5 dias depois. Depois disso vira cobrança do gerente.</p>`; },
  produtividade() { const mes = doMes(); return `${cabM('produtividade')}${tb(['Vendedor', 'Unidade', '$Horas no mês', '$Vendido', '$Por hora', '$Vendas por hora', '$Ticket'], db.vendedores.filter((v) => db.un === 'todas' || v.un === db.un).map((v) => { const vs = mes.filter((x) => x.vend === v.id), t = soma(vs, (x) => x.total), h = Math.round((v.horas || 176) * diaMes() / 30); return `<tr><td><b>${esc(v.nome)}</b></td><td>${esc(curto(v.un))}</td><td class="n">${h}</td><td class="n">${R(t)}</td><td class="n"><b>${R(t / Math.max(1, h))}</b></td><td class="n">${(vs.length / Math.max(1, h)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</td><td class="n">${R(t / Math.max(1, vs.length))}</td></tr>`; }), '')}<p class="sub">Horas proporcionais aos dias do mês até hoje. Venda por hora baixa no mesmo turno de outro vendedor pede treino de abordagem.</p>`; },
  metascat() { const mes = doMes(), cats = [...new Set(db.produtos.map((p) => p.cat))], dm = diaMes(), fim = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(); return `${cabM('metascat')}${tb(['Categoria', '$Vendido no mês', '$Meta', 'Andamento', '$Precisa por dia'], cats.map((c) => { const v = soma(mes, (x) => soma(x.itens.filter((i) => prod(i.id)?.cat === c), (i) => i.qtd * i.preco)), m = db.metaCat[c] || 0, ritmo = m && v / m >= dm / fim; return `<tr><td><b>${c}</b></td><td class="n">${R(v)}</td><td class="n"><input class="campo" style="width:110px;text-align:right" data-metacat="${c}" inputmode="decimal" value="${m}" aria-label="Meta de ${c}"></td><td style="min-width:150px">${m ? `<div class="barra-h ${ritmo ? '' : 'ouro'}"><i style="width:${Math.min(100, v / m * 100)}%"></i></div><span class="sub">${pct(v / m)} · ${ritmo ? 'no ritmo' : 'abaixo do ritmo'}</span>` : ''}</td><td class="n">${m ? R(Math.max(0, m - v) / Math.max(1, fim - dm + 1)) : '—'}</td></tr>`; }), '')}`; },
  concorrencia() { return `${cabM('concorrencia', `<button class="btn prim" data-acao="ga-conc">${I.mais}Produto na pesquisa</button>`)}${tb(['Produto', '$Nosso', ...CONC.map((c) => `$${c}`), 'Posição', ''], db.concorr.map((x) => { const p = prod(x.prod), mn = Math.min(...x.precos), alvo = Math.max(Math.round(p.custo * 1.25 * 10) / 10, Math.round((mn - 0.1) * 100) / 100), pr = precoV(p); return `<tr><td><b>${esc(p.nome)}</b><br><small class="sub">custo ${R(p.custo)}</small></td><td class="n"><b>${R(pr)}</b></td>${x.precos.map((v, i) => `<td class="n"><input class="campo" style="width:90px;text-align:right" data-concp="${x.prod}|${i}" inputmode="decimal" value="${String(v).replace('.', ',')}" aria-label="Preço ${CONC[i]}"></td>`).join('')}<td>${pr <= mn ? '<span class="tag ok">mais barato</span>' : `<span class="tag alerta">${R(pr - mn)} acima</span>`}</td><td>${pr > mn && alvo < pr ? `<button class="btn peq" data-acao="ga-conc-ir" data-id="${p.id}" data-v="${alvo}">Ir para ${R(alvo)}</button>` : ''}</td></tr>`; }), 'Nenhum produto na pesquisa.')}<p class="sub">O sistema não sugere preço abaixo do custo mais 25%. Em empório, não precisa ser o mais barato: precisa não ser o mais caro no que o cliente compara.</p>`; },
});

const G = {
  'ga-cesta-nova': () => janela('Nova cesta', `<form class="form" id="f"><label>Nome<input class="campo" name="n" required value="Cesta Brunch"></label><label>Produtos (Ctrl para vários)<select class="campo" name="p" multiple size="7">${db.produtos.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select></label><div class="dupla"><label>Embalagem e laço (R$)<input class="campo" name="e" inputmode="decimal" value="22"></label><label>Preço (R$)<input class="campo" name="v" inputmode="decimal" required></label></div></form>`, 'Criar', () => { const f = new FormData($('#f')), ps = f.getAll('p'), v = num(f.get('v')), e = num(f.get('e')) || 0; if (ps.length < 2) return erroJanela('Escolha pelo menos dois produtos.'); const c = { id: `ce${Date.now().toString(36)}`, nome: String(f.get('n')).trim(), itens: ps.map((id) => ({ id, qtd: 1 })), emb: e, preco: v, estoque: 0 }; if (!(v > custoCesta(c))) return erroJanela(`O preço precisa passar do custo (${R(custoCesta(c))}).`); db.cestas.push(c); registrar(`Criou a cesta ${c.nome}`); return true; }),
  'ga-montar': (a) => { const c = db.cestas.find((x) => x.id === a.dataset.id), mt = montaveis(c); janela(`Montar ${esc(c.nome)}`, `<form class="form" id="f"><label>Quantas (até ${mt})<input class="campo" name="q" type="number" min="1" max="${mt}" value="${Math.min(5, mt)}"></label><p class="dica">Os itens saem do estoque da unidade que tem mais.</p></form>`, 'Montar', () => { const q = Math.round(num(new FormData($('#f')).get('q'))); if (!(q >= 1 && q <= mt)) return erroJanela(`De 1 a ${mt}.`); c.itens.forEach((x) => { let r = x.qtd * q; const p = prod(x.id); KS().slice().sort((u, w) => (p.est[w] || 0) - (p.est[u] || 0)).forEach((k) => { const t = Math.min(r, p.est[k] || 0); p.est[k] -= t; r -= t; }); }); c.estoque = (c.estoque || 0) + q; registrar(`Montou ${q} ${c.nome}`); avisar(`${q} ${c.nome} prontas.`); return true; }); },
  'ga-corp-novo': () => janela('Pedido de empresa', `<form class="form" id="f"><label>Empresa<input class="campo" name="e" required></label><div class="dupla"><label>Cesta<select class="campo" name="c">${db.cestas.map((c) => `<option value="${c.id}">${esc(c.nome)} · ${R(c.preco)}</option>`).join('')}</select></label><label>Quantidade<input class="campo" name="q" type="number" min="1" value="20"></label></div><div class="dupla"><label>Desconto por volume (%)<input class="campo" name="d" inputmode="decimal" value="5"></label><label>Entrega em (dias)<input class="campo" name="t" type="number" min="1" value="30"></label></div></form>`, 'Salvar proposta', () => { const f = new FormData($('#f')), c = db.cestas.find((x) => x.id === f.get('c')), q = Math.round(num(f.get('q'))), d = num(f.get('d')) || 0; if (!String(f.get('e')).trim() || !(q >= 1)) return erroJanela('Empresa e quantidade.'); if (!(d >= 0 && d <= 30)) return erroJanela('Desconto de 0 a 30%.'); db.corporativo.push({ id: `co${Date.now().toString(36)}`, empresa: String(f.get('e')).trim(), cesta: c.id, qtd: q, valorUn: Math.round(c.preco * (1 - d / 100) * 100) / 100, entrega: Math.round(num(f.get('t'))) || 30, sinal: 0, st: 'proposta' }); return true; }),
  'ga-corp': (a) => { const x = db.corporativo.find((y) => y.id === a.dataset.id); x.st = a.dataset.v; if (x.st === 'confirmado' && !x.sinal) x.sinal = Math.round(x.qtd * x.valorUn * 0.3); registrar(`Pedido de ${x.empresa}: ${x.st}`); gravar(); desenhar(); avisar(x.st === 'confirmado' ? `Sinal de 30% (${R(x.sinal)}) registrado.` : 'Entrega registrada.'); },
  'ga-fracionar': () => { const ps = db.produtos.filter((p) => p.cat === 'Frios'); janela('Fracionar', `<form class="form" id="f"><label>Produto<select class="campo" name="p">${ps.map((p) => `<option value="${p.id}">${esc(p.nome)} (tem ${estTot(p)})</option>`).join('')}</select></label><div class="dupla"><label>Peças inteiras<input class="campo" name="n" type="number" min="1" value="1"></label><label>Peso da peça (g)<input class="campo" name="pg" type="number" min="100" value="1000"></label></div><div class="dupla"><label>Peso de cada pedaço (g)<input class="campo" name="g" type="number" min="50" value="250"></label><label>Perda de corte (%)<input class="campo" name="pe" inputmode="decimal" value="4"></label></div><label>Validade depois de fracionado (dias)<input class="campo" name="v" type="number" min="1" max="60" value="10"></label></form>`, 'Fracionar', () => { const f = new FormData($('#f')), p = prod(f.get('p')), n = Math.round(num(f.get('n'))), pg = num(f.get('pg')), g = num(f.get('g')), pe = num(f.get('pe')) || 0, v = Math.round(num(f.get('v'))); if (!(n >= 1) || n > estTot(p)) return erroJanela(`De 1 a ${estTot(p)} peça(s).`); if (!(g >= 50 && g < pg)) return erroJanela('O pedaço precisa ser menor que a peça.'); if (!(pe >= 0 && pe < 30)) return erroJanela('Perda de 0 a 30%.'); const ped = Math.floor(n * pg * (1 - pe / 100) / g), preco = Math.round(p.preco / pg * g * 1.1 * 10) / 10 - 0.01; let r = n; KS().slice().sort((u, w) => (p.est[w] || 0) - (p.est[u] || 0)).forEach((k) => { const t = Math.min(r, p.est[k] || 0); p.est[k] -= t; r -= t; }); db.fracionados.push({ id: `fr${Date.now().toString(36)}`, prod: p.id, pecas: n, n: ped, g, perda: pe, preco, dia: 0, val: v }); registrar(`Fracionou ${n} ${p.nome} em ${ped} pedaços de ${g} g`); avisar(`${ped} pedaços de ${g} g a ${R(preco)}.`); return true; }); },
  'ga-etiqueta': (a) => { const f = db.fracionados.find((x) => x.id === a.dataset.id), p = prod(f.prod); janela('Etiqueta', `<div class="etq-f"><b>${esc(p.nome.split(' ').slice(0, 3).join(' '))}</b><span>${f.g} g · ${R(f.preco)}</span><small>Fracionado em ${data(f.dia)} · validade ${data(f.dia + f.val)}</small><small>Conservar entre 0 °C e 10 °C · ${esc(DONO.empresa)}</small></div>`, '', null); },
  'ga-degust': () => janela('Degustação', `<form class="form" id="f"><label>Produto<select class="campo" name="p">${db.produtos.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select></label><div class="dupla"><label>Custo da ação (R$)<input class="campo" name="c" inputmode="decimal" value="120"></label><label>Unidade<select class="campo" name="u">${KS().map((k) => `<option value="${k}">${esc(UN[k])}</option>`).join('')}</select></label></div><div class="dupla"><label>Vendia por dia<input class="campo" name="a" type="number" min="0" value="3"></label><label>Vendeu no dia<input class="campo" name="d" type="number" min="0" value="12"></label></div></form>`, 'Salvar', () => { const f = new FormData($('#f')); db.degustacoes.push({ prod: f.get('p'), un: f.get('u'), custo: num(f.get('c')) || 0, antes: Math.round(num(f.get('a'))) || 0, dia2: Math.round(num(f.get('d'))) || 0, dia: 0 }); return true; }),
  'ga-clube-cobrar': () => { const at = soma(KS(), (k) => db.clube.un[k]?.ativos || 0); registrar(`Gerou a cobrança do clube do vinho: ${at} assinantes`); gravar(); avisar(`${at} cobranças de ${R(db.clube.preco)} enviadas (cartão recorrente e Pix): ${R(at * db.clube.preco)}.`); },
  'ga-vale-novo': () => janela('Emitir vale-presente', `<form class="form" id="f"><div class="dupla"><label>Valor (R$)<input class="campo" name="v" inputmode="decimal" value="150"></label><label>Comprado por<input class="campo" name="c" required></label></div></form>`, 'Emitir', () => { const f = new FormData($('#f')), v = num(f.get('v')); if (!(v >= 20)) return erroJanela('Valor mínimo de R$ 20.'); if (!String(f.get('c')).trim()) return erroJanela('Quem está comprando?'); const cod = `VP-${1041 + db.vales.length}`; db.vales.push({ id: `vp${Date.now().toString(36)}`, cod, valor: v, saldo: v, comprador: String(f.get('c')).trim(), dia: 0 }); registrar(`Emitiu o vale ${cod} de ${R(v)}`); avisar(`Vale ${cod} emitido. O valor entra no caixa agora e sai do estoque quando for usado.`); return true; }),
  'ga-vale-usar': (a) => { const v = db.vales.find((x) => x.id === a.dataset.id); janela(`Usar ${esc(v.cod)}`, `<form class="form" id="f"><p>Saldo ${R(v.saldo)}</p><label>Valor da compra (R$)<input class="campo" name="v" inputmode="decimal" value="${String(v.saldo).replace('.', ',')}"></label></form>`, 'Usar', () => { const u = num(new FormData($('#f')).get('v')); if (!(u > 0)) return erroJanela('Informe o valor.'); const usa = Math.min(u, v.saldo); v.saldo = Math.round((v.saldo - usa) * 100) / 100; registrar(`Usou ${R(usa)} do vale ${v.cod}`); avisar(u > usa ? `Vale cobriu ${R(usa)}; falta ${R(u - usa)} em outra forma.` : `Restam ${R(v.saldo)} no vale.`); return true; }); },
  'ga-entrega': () => janela('Pedido para entregar', `<form class="form" id="f"><label>Cliente<input class="campo" name="c" required></label><div class="dupla"><label>Bairro<select class="campo" name="b">${Object.keys(db.taxas).map((b) => `<option>${esc(b)}</option>`).join('')}</select></label><label>Valor do pedido (R$)<input class="campo" name="v" inputmode="decimal" required></label></div><label>Unidade<select class="campo" name="u">${KS().map((k) => `<option value="${k}">${esc(UN[k])}</option>`).join('')}</select></label></form>`, 'Lançar', () => { const f = new FormData($('#f')), v = num(f.get('v')); if (!(v > 0) || !String(f.get('c')).trim()) return erroJanela('Cliente e valor.'); const b = f.get('b'); db.delivery.push({ id: `dl${Date.now().toString(36)}`, cliente: String(f.get('c')).trim(), bairro: b, taxa: v >= 250 ? 0 : db.taxas[b], valor: v, min: 0, prazo: 60, st: 'separando', un: f.get('u') }); if (v >= 250) avisar('Acima de R$ 250: entrega grátis.'); return true; }),
  'ga-entrega-av': (a) => { const d = db.delivery.find((x) => x.id === a.dataset.id); d.st = d.st === 'separando' ? 'rota' : 'entregue'; gravar(); desenhar(); },
  'ga-perda': () => janela('Registrar perda', `<form class="form" id="f"><label>Produto<select class="campo" name="p">${db.produtos.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select></label><div class="dupla"><label>Quantidade<input class="campo" name="q" type="number" min="1" value="1"></label><label>Unidade<select class="campo" name="u">${KS().map((k) => `<option value="${k}">${esc(UN[k])}</option>`).join('')}</select></label></div><label>Motivo<select class="campo" name="m"><option>Vencido</option><option>Quebra</option><option>Avaria no recebimento</option><option>Degustação não registrada</option><option>Furto</option></select></label></form>`, 'Registrar', () => { const f = new FormData($('#f')), p = prod(f.get('p')), q = Math.round(num(f.get('q'))), u = f.get('u'); if (!(q >= 1) || q > (p.est[u] || 0)) return erroJanela(`De 1 a ${p.est[u] || 0} na ${curto(u)}.`); p.est[u] -= q; db.perdasReg.push({ dia: 0, prod: p.id, qtd: q, motivo: f.get('m'), un: u }); db.movs.push({ dia: 0, hora: agoraTxt(), tipo: 'Perda', txt: `${q}× ${p.nome} (${f.get('m')})`, quem: OPERADOR }); registrar(`Registrou perda de ${q}× ${p.nome}`); return true; }),
  'ga-acordo': () => janela('Acordo com fornecedor', `<form class="form" id="f"><label>Fornecedor<select class="campo" name="f">${db.fornecedores.map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join('')}</select></label><div class="dupla"><label>Meta de compra no trimestre (R$)<input class="campo" name="m" inputmode="decimal" required></label><label>Bonificação (%)<input class="campo" name="p" inputmode="decimal" value="5"></label></div></form>`, 'Salvar', () => { const f = new FormData($('#f')), m = num(f.get('m')), pp = num(f.get('p')); if (!(m > 0) || !(pp > 0 && pp <= 20)) return erroJanela('Meta e bonificação de 0,1 a 20%.'); db.acordos.push({ id: `ac${Date.now().toString(36)}`, forn: f.get('f'), regra: `${String(pp).replace('.', ',')}% em produto comprando ${R(m)} no trimestre`, meta: m, comprado: 0, pct: pp }); return true; }),
  'ga-acordo-cobrar': (a) => { const x = db.acordos.find((y) => y.id === a.dataset.id); x.cobrado = true; registrar(`Cobrou a bonificação de ${forn(x.forn).nome}: ${R(x.meta * x.pct / 100)}`); gravar(); desenhar(); avisar('Pedido de bonificação enviado ao fornecedor.'); },
  'ga-limite': (a) => { const c = cli(a.dataset.id), ant = c.limite; c.limite = Number(a.dataset.v); registrar(`Mudou o limite de ${c.nome}: ${R(ant)} → ${R(c.limite)}`); gravar(); desenhar(); },
  'ga-conc': () => janela('Produto na pesquisa', `<form class="form" id="f"><label>Produto<select class="campo" name="p">${db.produtos.filter((p) => !db.concorr.some((x) => x.prod === p.id)).map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select></label><div class="dupla">${CONC.map((c, i) => `<label>${c} (R$)<input class="campo" name="c${i}" inputmode="decimal" required></label>`).join('')}</div></form>`, 'Incluir', () => { const f = new FormData($('#f')), pr = CONC.map((_, i) => num(f.get(`c${i}`))); if (pr.some((v) => !(v > 0))) return erroJanela('Preços dos dois concorrentes.'); db.concorr.push({ prod: f.get('p'), precos: pr }); return true; }),
  'ga-conc-ir': (a) => { const p = prod(a.dataset.id), ant = p.preco; p.preco = Number(a.dataset.v); registrar(`Mudou o preço de ${p.nome}: ${R(ant)} → ${R(p.preco)} (concorrência)`); gravar(); desenhar(); avisar('Preço atualizado nas duas unidades.'); },
};
document.addEventListener('click', (e) => { const a = e.target.closest('[data-acao]'); if (a && G[a.dataset.acao]) { G[a.dataset.acao](a); return; } const r = e.target.closest('[data-regua]'); if (r) { db.regua[r.dataset.regua] = true; gravar(); setTimeout(desenhar, 200); } });
document.addEventListener('change', (e) => {
  const t = e.target, d = t.dataset;
  if (d.taxa) { const v = num(t.value); if (!(v >= 0)) { avisar('Valor inválido.'); desenhar(); return; } db.taxas[d.taxa] = v; gravar(); return; }
  if (d.orcd) { const v = num(t.value); if (!(v >= 0)) { avisar('Valor inválido.'); desenhar(); return; } db.orcDesp[d.orcd] = v; gravar(); desenhar(); return; }
  if (d.metacat) { const v = num(t.value); if (!(v >= 0)) { avisar('Valor inválido.'); desenhar(); return; } db.metaCat[d.metacat] = v; registrar(`Mudou a meta de ${d.metacat}`); gravar(); desenhar(); return; }
  if (d.concp) { const [id, i] = d.concp.split('|'), v = num(t.value); if (!(v > 0)) { avisar('Preço inválido.'); desenhar(); return; } db.concorr.find((x) => x.prod === id).precos[Number(i)] = v; gravar(); desenhar(); }
});

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
    'novo-pedido': () => { janela('Pedido manual', `<form class="form" id="f"><label>Fornecedor<select class="campo" name="forn" id="forn-ped">${db.fornecedores.map((f) => `<option value="${f.id}">${esc(f.nome)} · ${f.prazo} dias</option>`).join('')}</select></label><div id="itens-ped"></div></form>`, 'Criar rascunho', () => { const fd = new FormData($('#f')), f = fd.get('forn'), itens = db.produtos.filter((p) => p.forn === f).map((p) => ({ id: p.id, qtd: Math.round(num(fd.get(`q_${p.id}`)) || 0), custo: num(fd.get(`c_${p.id}`)) || p.custo })).filter((x) => x.qtd > 0); if (!itens.length) return erroJanela('Coloque a quantidade de pelo menos um item.'); if (itens.some((x) => !(x.custo > 0))) return erroJanela('Custo inválido.'); db.pedidos.push({ id: `o${Date.now()}`, num: db.proxPedido++, forn: f, itens, status: 'Rascunho', dia: 0 }); registrar(`Criou o pedido manual para ${forn(f).nome} (${itens.length} itens)`); avisar('Rascunho criado: revise e envie.'); return true; }); const monta = () => { const f = $('#forn-ped').value; $('#itens-ped').innerHTML = db.produtos.filter((p) => p.forn === f).map((p) => `<div class="dupla"><label>${p.sku} · ${esc(p.nome)} <span class="dica">tem ${estTot(p)}</span><input class="campo" name="q_${p.id}" type="number" min="0" placeholder="0"></label><label>Custo (R$)<input class="campo" name="c_${p.id}" inputmode="decimal" value="${String(p.custo).replace('.', ',')}"></label></div>`).join(''); }; $('#forn-ped').addEventListener('change', monta); monta(); },
    baixar: () => { const k = db.contas.find((x) => x.id === id); k.pago = true; db.saldoBanco += k.tipo === 'pagar' ? -k.valor : k.valor; registrar(`Baixou a conta "${k.nome}" (${R(k.valor)})`); avisar('Conta baixada; saldo atualizado.'); gravar(); desenhar(); },
    'nova-conta': novaConta,
    reenviar: () => { const v = db.vendas.find((x) => x.n === Number(a.dataset.n)); v.nota.status = 'Autorizada'; v.nota.motivo = 'Reenviada e autorizada'; registrar(`Reenviou a ${v.nota.tipo} ${v.nota.num}: autorizada`); avisar(`Nota ${v.nota.num} autorizada.`); gravar(); desenhar(); },
    'reenviar-todas': () => { let n = 0; db.vendas.forEach((v) => { if (v.nota.status !== 'Autorizada') { v.nota.status = 'Autorizada'; v.nota.motivo = 'Reenviada e autorizada'; n++; } }); registrar(`Reenviou ${n} notas pendentes: todas autorizadas`); avisar(`${n} notas autorizadas.`); gravar(); desenhar(); },
    'exportar-abc': exportarAbc,
    'abrir-caixa': () => { const k = a.dataset.k; janela(`Abrir caixa · ${esc(UN[k])}`, `<form class="form" id="f"><label>Troco na gaveta (R$)<input class="campo" name="v" inputmode="decimal" value="300"></label></form>`, 'Abrir', () => { const v = num(new FormData($('#f')).get('v')); if (!(v >= 0)) return erroJanela('Valor inválido.'); db.caixas[k] = { aberto: true, abertura: v, hora: agoraTxt(), sangrias: [], suprimentos: [], fechamentos: db.caixas[k]?.fechamentos || [] }; registrar(`Abriu o caixa da ${UN[k]} com ${R(v)}`); return true; }); },
    'mov-caixa': () => { const k = a.dataset.k, t = a.dataset.t; janela(`${t === 'sangria' ? 'Sangria' : 'Suprimento'} · ${esc(UN[k])}`, `<form class="form" id="f"><label>Valor (R$)<input class="campo" name="v" inputmode="decimal" required></label>${t === 'sangria' ? '<label>Motivo<input class="campo" name="m" value="Cofre"></label>' : ''}<p class="dica">Na gaveta agora: ${R(dinheiroCaixa(k))}</p></form>`, 'Registrar', () => { const fd = new FormData($('#f')), v = num(fd.get('v')); if (!(v > 0)) return erroJanela('Informe o valor.'); if (t === 'sangria' && v > dinheiroCaixa(k)) return erroJanela('Maior que o dinheiro da gaveta.'); (t === 'sangria' ? db.caixas[k].sangrias : db.caixas[k].suprimentos).push({ v, motivo: String(fd.get('m') || '').trim(), hora: agoraTxt() }); registrar(`${t === 'sangria' ? 'Sangria' : 'Suprimento'} de ${R(v)} no caixa da ${UN[k]}`); return true; }); },
    'fechar-caixa': () => { const k = a.dataset.k; janela(`Fechar caixa · ${esc(UN[k])}`, `<form class="form" id="f"><p>Pelo sistema: <b>${R(dinheiroCaixa(k))}</b> em dinheiro.</p><label>Contei na gaveta (R$)<input class="campo" name="c" inputmode="decimal" required></label><label>Observação<input class="campo" name="o"></label></form>`, 'Fechar', () => { const fd = new FormData($('#f')), c = num(fd.get('c')); if (!(c >= 0) || String(fd.get('c')).trim() === '') return erroJanela('Informe o valor contado.'); const dif = Math.round((c - dinheiroCaixa(k)) * 100) / 100; db.caixas[k].fechamentos.push({ hora: agoraTxt(), contado: c, dif, obs: String(fd.get('o') || '').trim() }); db.caixas[k].aberto = false; registrar(`Fechou o caixa da ${UN[k]} com diferença de ${R(dif)}`); avisar(dif ? `Diferença de ${R(dif)} registrada.` : 'Caixa fechado: bateu.'); return true; }); },
    devolver: () => { const v = db.vendas.find((x) => x.n === Number(a.dataset.n)); janela(`Devolução · venda ${v.n}`, `<form class="form" id="f">${v.itens.map((x, i) => `<label>${esc(prod(x.id).nome)} (levou ${x.qtd}${x.dev ? `, já voltou ${x.dev}` : ''})<input class="campo" name="q${i}" type="number" min="0" max="${x.qtd - (x.dev || 0)}" value="0"></label>`).join('')}<label>Devolver o valor em<select class="campo" name="como"><option>Dinheiro</option><option>Pix</option><option>Estorno no cartão</option>${v.cli ? '<option>Abater do saldo a prazo</option>' : ''}</select></label><p class="dica">Volta para o estoque da ${esc(curto(v.un))} e sai uma nota de devolução ligada à ${v.nota.tipo} ${v.nota.num}.</p></form>`, 'Devolver', () => { const fd = new FormData($('#f')); let valor = 0; const ls = []; v.itens.forEach((x, i) => { const q = Math.round(num(fd.get(`q${i}`)) || 0); if (q > 0 && q <= x.qtd - (x.dev || 0)) { x.dev = (x.dev || 0) + q; prod(x.id).est[v.un] = (prod(x.id).est[v.un] || 0) + q; valor += q * x.preco; ls.push(`${q}× ${prod(x.id).nome}`); } }); if (!ls.length) return erroJanela('Escolha o que volta.'); const como = String(fd.get('como')); if (/Abater/.test(como)) { const c = cli(v.cli); c.saldo = Math.max(0, c.saldo - valor); } const nota = `ND ${db.proxNota++}`; db.devolucoes.push({ n: v.n, un: v.un, itens: ls.join(', '), valor, como: /Abater/.test(como) ? 'Saldo' : como, dia: 0, nota }); db.movs.push({ dia: 0, hora: agoraTxt(), tipo: 'Entrada', txt: `Devolução da venda ${v.n}: ${ls.join(', ')}`, quem: OPERADOR }); registrar(`Devolução da venda ${v.n} (${R(valor)}, ${como}); nota ${nota}`); avisar(`Devolvido ${R(valor)}. ${nota} emitida.`); return true; }); },
    contagem: () => { const cats = [...new Set(db.produtos.map((p) => p.cat))]; janela('Contagem cega', `<form class="form" id="f"><div class="dupla"><label>Categoria<select class="campo" name="cat" id="cat-cont">${cats.map((c) => `<option>${c}</option>`).join('')}</select></label><label>Unidade<select class="campo" name="un">${KS().map((k) => `<option value="${k}">${esc(curto(k))}</option>`).join('')}</select></label></div><div id="itens-cont"></div></form>`, 'Salvar contagem', () => { const fd = new FormData($('#f')), cat = fd.get('cat'), un = fd.get('un'), ps = db.produtos.filter((p) => p.cat === cat); const cont = ps.map((p) => ({ p, q: Math.round(num(fd.get(`c_${p.id}`))) })); if (cont.some((x) => !(x.q >= 0) || String(fd.get(`c_${x.p.id}`)).trim() === '')) return erroJanela('Conte todos os itens (zero se não tiver).'); const difs = cont.filter((x) => x.q !== (x.p.est[un] || 0)); difs.forEach((x) => { const d = x.q - (x.p.est[un] || 0); x.p.est[un] = x.q; db.movs.push({ dia: 0, hora: agoraTxt(), tipo: d < 0 ? 'Perda' : 'Ajuste', txt: `Inventário: ${x.p.nome} ${d > 0 ? '+' : ''}${d} na ${UN[un]}`, quem: OPERADOR }); }); const acur = 1 - difs.length / (ps.length || 1); db.inventarios.push({ dia: 0, cat, un, itens: ps.length, div: difs.length, acur }); registrar(`Inventário de ${cat} na ${UN[un]}: ${difs.length} diferença(s), acuracidade ${pct(acur)}`); avisar(difs.length ? `${difs.length} diferença(s) ajustada(s).` : 'Tudo bateu.'); return true; }); const monta = () => { const cat = $('#cat-cont').value; $('#itens-cont').innerHTML = db.produtos.filter((p) => p.cat === cat).map((p) => `<label>${p.sku} · ${esc(p.nome)}<input class="campo" name="c_${p.id}" type="number" min="0" placeholder="quantos contou"></label>`).join(''); }; $('#cat-cont').addEventListener('change', monta); monta(); },
    reajuste: () => { const cats = [...new Set(db.produtos.map((p) => p.cat))]; janela('Reajustar preços', `<form class="form" id="f"><div class="dupla"><label>Categoria<select class="campo" name="cat"><option value="">Todas</option>${cats.map((c) => `<option>${c}</option>`).join('')}</select></label><label>Reajuste (%)<input class="campo" name="p" inputmode="decimal" required placeholder="Ex.: 5 ou -3"></label></div><label>Margem mínima permitida (%)<input class="campo" name="m" inputmode="decimal" value="25"></label><label><span><input type="checkbox" name="r" checked> Arredondar para terminar em ,90</span></label><p class="dica">Produto que ficaria abaixo da margem mínima não muda e aparece no aviso.</p></form>`, 'Aplicar', () => { const fd = new FormData($('#f')), p1 = num(fd.get('p')), mm = num(fd.get('m')) / 100; if (!p1 || Math.abs(p1) > 50) return erroJanela('Reajuste entre -50% e 50%.'); const ps = db.produtos.filter((p) => !fd.get('cat') || p.cat === fd.get('cat')); let mud = 0; const pres = []; ps.forEach((p) => { let novo = p.preco * (1 + p1 / 100); if (fd.get('r')) novo = Math.max(0.9, Math.floor(novo) + 0.9); novo = Math.round(novo * 100) / 100; if ((novo - p.custo) / novo < mm) { pres.push(p.nome); return; } p.preco = novo; mud++; }); registrar(`Reajustou ${mud} preço(s) em ${p1}%${fd.get('cat') ? ` (${fd.get('cat')})` : ''}`); avisar(`${mud} preço(s) mudaram${pres.length ? `; ${pres.length} ficaram por causa da margem` : ''}.`); return true; }); },
    'nova-promo': () => { const cats = [...new Set(db.produtos.map((p) => p.cat))]; janela('Promoção', `<form class="form" id="f"><label>Em quê<select class="campo" name="alvo">${cats.map((c) => `<option value="cat:${c}">Categoria ${c}</option>`).join('')}${db.produtos.map((p) => `<option value="p:${p.id}">${p.sku} · ${esc(p.nome)}</option>`).join('')}</select></label><div class="dupla"><label>Desconto (%)<input class="campo" name="p" inputmode="decimal" required></label><label>Por quantos dias<input class="campo" name="d" type="number" min="1" max="60" value="7"></label></div></form>`, 'Programar', () => { const fd = new FormData($('#f')), p1 = num(fd.get('p')), d = Math.round(num(fd.get('d'))); if (!(p1 > 0 && p1 <= 70)) return erroJanela('Desconto entre 1% e 70%.'); if (!(d > 0)) return erroJanela('Prazo em dias.'); const alvo = fd.get('alvo'), afetados = db.produtos.filter((p) => alvo === `p:${p.id}` || alvo === `cat:${p.cat}`), prejuizo = afetados.filter((p) => p.preco * (1 - p1 / 100) < p.custo); if (prejuizo.length && !confirm(`${prejuizo.length} produto(s) ficam abaixo do custo. Programar assim mesmo?`)) return false; db.promos.push({ id: `pr${Date.now()}`, alvo, pct: p1, ate: d }); registrar(`Programou ${p1}% em ${alvo.startsWith('cat:') ? alvo.slice(4) : prod(alvo.slice(2)).nome} por ${d} dias`); return true; }); },
    'tira-promo': () => { const x = db.promos.find((y) => y.id === id); x.ate = -1; registrar(`Encerrou a promoção de ${x.pct}%`); gravar(); desenhar(); },
    conciliar: () => { db.conciliados.push({ dia: Number(a.dataset.d) }); registrar(`Conciliou os cartões do dia ${data(Number(a.dataset.d))}`); gravar(); desenhar(); },
    'fechar-comissoes': () => { const mesKey = new Date().toISOString().slice(0, 7), mes = db.vendas.filter((v) => v.dia > -diaMes()), l = db.vendedores.map((v) => ({ v, c: Math.round(soma(mes.filter((x) => x.vend === v.id), (x) => x.total) * v.comissao) / 100 })).filter((x) => x.c > 0); janela('Fechar comissões do mês', `<ul class="lista">${l.map((x) => `<li><div class="cresce"><b>${esc(x.v.nome)}</b><span>${x.v.comissao.toLocaleString('pt-BR')}% · ${esc(curto(x.v.un))}</span></div><b class="mono">${R(x.c)}</b></li>`).join('')}</ul><p class="dica">Vira uma conta a pagar por pessoa, com vencimento no 5º dia útil.</p>`, 'Fechar e lançar', () => { l.forEach((x) => { db.comPagas.push({ mes: mesKey, vend: x.v.id, valor: x.c }); db.contas.push({ id: `k${Date.now()}${x.v.id}`, tipo: 'pagar', nome: `Comissão de ${x.v.nome}`, valor: x.c, vence: 5, cat: 'Pessoal', pago: false }); }); registrar(`Fechou as comissões de ${mesKey}: ${R(soma(l, (x) => x.c))}`); avisar('Comissões lançadas em Contas a pagar.'); return true; }); },
    'receber-cli': () => { const c = cli(id); janela(`Receber · ${esc(c.nome)}`, `<form class="form" id="f"><p>Saldo a prazo: <b>${R(c.saldo)}</b></p><div class="dupla"><label>Valor (R$)<input class="campo" name="v" inputmode="decimal" value="${c.saldo.toFixed(2).replace('.', ',')}"></label><label>Forma<select class="campo" name="f"><option>Pix</option><option>Boleto</option><option>Dinheiro</option></select></label></div>${c.tel ? `<p><a class="btn peq" target="_blank" rel="noopener" href="https://wa.me/55${c.tel}?text=${encodeURIComponent(`Olá! Aqui é do ${DONO.empresa}. Seu saldo em aberto é de ${R(c.saldo)}. Podemos mandar o Pix?`)}">Cobrar no WhatsApp</a></p>` : ''}</form>`, 'Receber', () => { const fd = new FormData($('#f')), v = Math.round(num(fd.get('v')) * 100) / 100; if (!(v > 0) || v > c.saldo + 0.004) return erroJanela(`Valor entre 0 e ${R(c.saldo)}.`); c.saldo = Math.round((c.saldo - v) * 100) / 100; db.saldoBanco += fd.get('f') === 'Dinheiro' ? 0 : v; registrar(`Recebeu ${R(v)} de ${c.nome} (${fd.get('f')})`); avisar(c.saldo ? `Recebido. Resta ${R(c.saldo)}.` : `${c.nome} quitou.`); return true; }); },
    campanha: () => { const l = db.clientes.filter((c) => c.ultima > 45 && c.ultima < 900); janela('Mensagem para quem sumiu', l.length ? `<p class="dica">${l.length} cliente(s) sem comprar há mais de 45 dias. O botão abre o WhatsApp com a mensagem pronta; quem envia é você.</p><ul class="lista">${l.map((c) => `<li><div class="cresce"><b>${esc(c.nome)}</b><span>última compra há ${c.ultima} dias · gastou ${R(c.gasto)}</span></div>${c.tel ? `<a class="btn peq" target="_blank" rel="noopener" href="https://wa.me/55${c.tel}?text=${encodeURIComponent(`Olá, ${c.nome.split(' ')[0]}! Sentimos sua falta no ${DONO.empresa}. Chegaram queijos e vinhos novos: quer que a gente separe algo para você?`)}">WhatsApp</a>` : ''}</li>`).join('')}</ul>` : '<p class="vazio">Ninguém sumido.</p>', '', null); },

    promo: () => { const p = prod(id), novo = Math.round(p.preco * .8 * 10) / 10 - 0.01; registrar(`Promoção em ${p.nome}: de ${R(p.preco)} para ${R(novo)} até acabar o lote`); p.preco = novo; avisar(`${p.nome} agora sai por ${R(novo)}.`); gravar(); desenhar(); },
    'baixa-lote': () => { const p = prod(id), l = p.lotes.find((x) => x.lote === a.dataset.lote && x.un === a.dataset.un); janela('Dar baixa no lote', `<p>${esc(p.nome)} · lote <span class="mono">${l.lote}</span> · ${l.qtd} un. na ${UN[l.un]} · perda de ${R(l.qtd * p.custo)}</p>`, 'Dar baixa', () => { p.est[l.un] = Math.max(0, p.est[l.un] - l.qtd); db.movs.push({ dia: 0, hora: agoraTxt(), tipo: 'Perda', txt: `${l.qtd}× ${p.nome} (lote ${l.lote})`, quem: OPERADOR }); registrar(`Deu baixa em ${l.qtd}× ${p.nome}, lote ${l.lote} (${R(l.qtd * p.custo)})`); l.qtd = 0; avisar('Baixa registrada.'); return true; }); },
    limite: () => { const c = cli(id); janela(`Crédito · ${esc(c.nome)}`, `<form class="form" id="f"><label>Limite para vendas a prazo (R$)<input class="campo" name="l" inputmode="decimal" value="${c.limite}"></label><p class="dica">Saldo em aberto hoje: ${R(c.saldo)}.</p></form>`, 'Salvar', () => { const l = num(new FormData($('#f')).get('l')); if (!(l >= 0)) return erroJanela('Valor inválido.'); registrar(`Mudou o crédito de ${c.nome} de ${R(c.limite)} para ${R(l)}`); c.limite = l; return true; }); },
    'editar-vend': () => { const v = vend(id); janela(`Meta e comissão · ${esc(v.nome)}`, `<form class="form" id="f"><div class="dupla"><label>Meta do mês (R$)<input class="campo" name="meta" inputmode="decimal" value="${v.meta}"></label><label>Comissão (%)<input class="campo" name="com" inputmode="decimal" value="${String(v.comissao).replace('.', ',')}"></label></div></form>`, 'Salvar', () => { const fd = new FormData($('#f')), m = num(fd.get('meta')), c = num(fd.get('com')); if (!(m > 0) || !(c >= 0 && c <= 30)) return erroJanela('Meta maior que zero e comissão entre 0 e 30%.'); registrar(`Mudou a meta de ${v.nome} para ${R(m)} e a comissão para ${c}%`); v.meta = m; v.comissao = c; return true; }); },
    'novo-produto': () => janela('Novo produto', `<form class="form" id="f"><div class="dupla"><label>SKU<input class="campo" name="sku" placeholder="Ex.: CF-404"></label><label>Categoria<select class="campo" name="cat">${[...new Set(db.produtos.map((p) => p.cat))].map((c) => `<option>${c}</option>`).join('')}</select></label></div><label>Nome<input class="campo" name="nome"></label><div class="dupla"><label>Custo (R$)<input class="campo" name="custo" inputmode="decimal"></label><label>Preço (R$)<input class="campo" name="preco" inputmode="decimal"></label></div><div class="dupla"><label>Fornecedor<select class="campo" name="forn">${db.fornecedores.map((f) => `<option value="${f.id}">${esc(f.nome)}</option>`).join('')}</select></label><label>Estoque mínimo<input class="campo" name="min" type="number" value="10"></label></div><label><span><input type="checkbox" name="perec"> Controlar lote e validade</span></label></form>`, 'Cadastrar', () => {
      const fd = new FormData($('#f')), sku = String(fd.get('sku')).trim().toUpperCase(), nome = String(fd.get('nome')).trim(), custo = num(fd.get('custo')), preco = num(fd.get('preco'));
      if (!sku || !nome || !(preco > 0) || !(custo >= 0)) return erroJanela('Preencha SKU, nome, custo e preço.');
      if (db.produtos.some((p) => p.sku === sku)) return erroJanela('Já existe um produto com esse SKU.');
      db.produtos.push({ id: `p${Date.now()}`, sku, nome, cat: fd.get('cat'), forn: fd.get('forn'), custo, preco, perecivel: !!fd.get('perec'), min: Math.floor(num(fd.get('min'))) || 0, est: Object.fromEntries(KS().map((k) => [k, 0])), lotes: [] });
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
  if (e.target.id === 'filial') { const v = e.target.value; if (v === '__nova' || v === '__renomear') { e.target.value = db.un; formUnidade(v === '__renomear' ? db.un : null); return; } db.un = v; gravar(); desenhar(); }
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
