// Peplo · gestão da loja de roupas pequena: fiado com limite, bloqueio e cobrança no WhatsApp, estoque por tamanho e cor,
// vendas com pagamento dividido, compras, trocas e devoluções, caixa do dia, peças paradas e relatórios.
// Dinheiro sempre em centavos (inteiros). Nada confirmado é apagado: cancelamento, devolução e renegociação viram registros novos.
// Dados neste navegador (a conta na nuvem sincroniza pela base conta-nuvem.js). ?novo recomeça a demonstração.

import { qrSVG } from '../base/qr.js';
const CHAVE = 'peplo-v1';
const EXEMPLO = 4; // 19/11: exemplo menor (30 dias) para não encher o navegador; 4: crediário com parcelas pagas, vencidas e vencendo
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const t = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const din = (c) => (Math.round(c || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dinC = (c) => (Math.abs(c) >= 1e7 ? `R$ ${(c / 1e8).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi` : din(c));
// "1.234,56", "1234,56", "1234.56", "R$ 50" -> centavos
const lerDin = (v) => { let s = String(v ?? '').replace(/[^\d,.-]/g, ''); if (!s) return 0; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const n = Number(s); return Number.isFinite(n) ? Math.round(n * 100) : 0; };
const campoDin = (c) => (c ? (c / 100).toFixed(2).replace('.', ',') : '');
let seq = 0;
const uid = (p = 'x') => `${p}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const pad = (n) => String(n).padStart(2, '0');
const isoD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoje = () => isoD(new Date());
const somaDias = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoD(new Date(y, m - 1, d + n)); };
const somaMes = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const x = new Date(y, m - 1 + n, 1); const ult = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate(); x.setDate(Math.min(d, ult)); return isoD(x); };
const dias = (de, ate = hoje()) => Math.round((new Date(`${ate}T12:00`) - new Date(`${String(de).slice(0, 10)}T12:00`)) / 864e5);
const dataBR = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');
const horaBR = (iso) => (iso && iso.length > 10 ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
// horário local, sem fuso: com toISOString a venda das 21h em diante caía no dia seguinte (corrigido em 08/11/2026)
const agora = () => { const d = new Date(); return `${isoD(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const telLimpo = (tel) => String(tel || '').replace(/\D/g, '');
const zap = (tel, m) => `https://wa.me/${telLimpo(tel).length >= 12 ? '' : '55'}${telLimpo(tel)}?text=${encodeURIComponent(m)}`;
const FORMAS = { dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Cartão de débito', credito: 'Cartão de crédito', fiado: 'Crediário', loja: 'Crédito da loja' };
const ICONE_CAT = {
  Vestidos: '<path d="M9 3h6l-1 4 4 13H6l4-13z"/><path d="M9 3l-1 2M15 3l1 2"/>',
  Blusas: '<path d="M8 4l4 2 4-2 4 4-3 3v9H7v-9L4 8z"/>',
  Camisetas: '<path d="M8 4h8l4 4-3 2v10H7V10L4 8z"/><path d="M10 4a2 2 0 0 0 4 0"/>',
  Calças: '<path d="M7 3h10l1 18h-4l-2-11-2 11H6z"/><path d="M7 7h10"/>',
  Saias: '<path d="M8 4h8l3 16H5z"/><path d="M8 7h8"/>',
  Jaquetas: '<path d="M8 3l4 3 4-3 4 3v14h-5V9l-3 4-3-4v11H4V6z"/>',
  Casacos: '<path d="M9 3h6l5 4v14h-5l-3-9-3 9H4V7z"/><path d="M9 3l3 9 3-9"/>',
  Shorts: '<path d="M6 5h12l1 10h-5l-2-5-2 5H5z"/>',
  Acessórios: '<path d="M6 9h12l-1 11H7z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/>',
};
// foto de cada cor das peças da demonstração (18/11/2026): a mesma peça recolorida, para a foto trocar quando a cor muda
const FOTOS_COR_EXEMPLO = {"p1":{"Nude":"img/cores/p1-nude.webp","Preto":"img/cores/p1-preto.webp","Vinho":"img/cores/p1-vinho.webp"},"p10":{"Off-white":"img/cores/p10-off.webp","Preto":"img/cores/p10-preto.webp"},"p11":{"Off-white":"img/cores/p11-off.webp"},"p12":{"Nude":"img/cores/p12-nude.webp","Preto":"img/cores/p12-preto.webp"},"p13":{"Jeans claro":"img/cores/p13-claro.webp"},"p14":{"Jeans claro":"img/cores/p14-claro.webp"},"p15":{"Preto":"img/cores/p15-preto.webp"},"p16":{"Preto":"img/cores/p16-preto.webp"},"p18":{"Preto":"img/cores/p18-preto.webp"},"p19":{"Preto":"img/cores/p19-preto.webp"},"p2":{"Preto":"img/cores/p2-preto.webp"},"p20":{"Preto":"img/cores/p20-preto.webp"},"p21":{"Off-white":"img/cores/p21-off.webp"},"p22":{"Marinho":"img/cores/p22-marinho.webp"},"p23":{"Preto":"img/cores/p23-preto.webp"},"p24":{"Preto":"img/cores/p24-preto.webp"},"p3":{"Nude":"img/cores/p3-nude.webp"},"p4":{"Off-white":"img/cores/p4-off.webp"},"p5":{"Nude":"img/cores/p5-nude.webp"},"p6":{"Branco":"img/cores/p6-branco.webp","Nude":"img/cores/p6-nude.webp"},"p7":{"Preto":"img/cores/p7-preto.webp","Vinho":"img/cores/p7-vinho.webp"},"p8":{"Off-white":"img/cores/p8-off.webp","Rosa":"img/cores/p8-rosa.webp"},"p9":{"Preto":"img/cores/p9-preto.webp"}};
function fotosDeCorExemplo(lista) { (lista || []).forEach((p) => { const f = FOTOS_COR_EXEMPLO[p.id]; if (f) (p.cores || []).forEach((c) => { if (!c.foto && f[c.n]) c.foto = f[c.n]; }); }); }
// foto da cor escolhida; sem foto própria, vale a foto da peça (dados antigos continuam iguais)
const fotoCor = (p, cor) => { const c = cor == null ? null : (p.cores || []).find((x) => x.n === cor); return (c && c.foto) || p.foto; };
const iconePeca = (p, cor) => fotoCor(p, cor) ? `<span class="peca"><img src="${t(fotoCor(p, cor))}" alt="" loading="lazy"></span>` : `<span class="peca" style="background:${(p.cores[0] || {}).h ? mistura(p.cores[0].h) : ''}"><svg viewBox="0 0 24 24">${ICONE_CAT[p.cat] || ICONE_CAT.Acessórios}</svg></span>`;
// cor clara para o fundo do ícone da peça (a primeira cor da grade, bem suave)
function mistura(h) { const n = parseInt(String(h).slice(1), 16); if (!Number.isFinite(n)) return ''; const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255, m = (x) => Math.round(x * 0.22 + 247 * 0.78); return `rgb(${m(r)},${m(g)},${m(b)})`; }
const TEMAS = [['ameixa', 'Ameixa', '#8A5367', '#B69A72'], ['champagne', 'Champagne', '#8C6E45', '#8A5367'], ['salvia', 'Sálvia', '#4E6B5C', '#B69A72'], ['petroleo', 'Azul petróleo', '#2F5A66', '#B69A72'], ['rose', 'Rosé', '#A85C6E', '#B69A72'], ['grafite', 'Grafite', '#3D3A36', '#B69A72']];
const MSGS = {
  lembrete: { titulo: 'Lembrete antes do vencimento', sug: 'Oi, {nome}! Tudo bem? Passando para lembrar que a parcela de {valor} da sua compra na {loja} vence em {venc}. Se preferir, pode pagar pelo Pix: {pix}. Obrigada pela preferência!' },
  hoje: { titulo: 'Vence hoje', sug: 'Oi, {nome}! A parcela de {valor} da sua compra na {loja} vence hoje ({venc}). Pix: {pix}. Qualquer dúvida, estou à disposição.' },
  atraso: { titulo: 'Parcela em atraso', sug: 'Oi, {nome}, tudo bem? Consta em aberto {saldo} na {loja}, com parcela vencida há {dias} dias. Podemos combinar o pagamento? Pix: {pix}. Se já pagou, desconsidere.' },
  acordo: { titulo: 'Aviso de renegociação', sug: 'Oi, {nome}! Como combinamos, o seu acordo na {loja} ficou assim: {acordo}. Qualquer coisa, é só chamar.' },
  pago: { titulo: 'Confirmação de pagamento', sug: 'Oi, {nome}! Recebemos {valor}. Obrigada! Saldo que ficou em aberto na {loja}: {saldo}.' },
  quitado: { titulo: 'Conta quitada', sug: 'Oi, {nome}! Sua conta na {loja} está quitada. Obrigada pela confiança, volte sempre!' },
};

// ------------------------------------------------------------------ demonstração: a Boutique Bella
function rnd(sem) { let a = sem >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
function inicial() {
  const r = rnd(20261118), esc_ = (l) => l[Math.floor(r() * l.length)], h = hoje();
  const C = { preto: { n: 'Preto', h: '#1f1d1b' }, branco: { n: 'Branco', h: '#f4f1ea' }, vinho: { n: 'Vinho', h: '#6b2338' }, nude: { n: 'Nude', h: '#d9b99b' }, azul: { n: 'Azul clássico', h: '#3e5f8a' }, claro: { n: 'Jeans claro', h: '#9db4cc' }, rosa: { n: 'Rosa', h: '#e3a3b5' }, verde: { n: 'Verde oliva', h: '#5f6b2e' }, caramelo: { n: 'Caramelo', h: '#a0683a' }, off: { n: 'Off-white', h: '#efe6d6' }, marinho: { n: 'Marinho', h: '#22304a' }, estampa: { n: 'Estampado', h: '#c98a8a' }, roxo: { n: 'Roxo', h: '#5b3a7a' }, xadrez: { n: 'Xadrez azul', h: '#7a86a8' } };
  const PMG = ['P', 'M', 'G', 'GG', 'XG'], PLUS = ['G1', 'G2', 'G3', 'G4'], NUM = ['36', '38', '40', '42', '44', '46', '48'], NUMP = ['46', '48', '50', '52', '54'];
  const PV = 'Coleção Primavera/Verão', OI = 'Coleção Outono/Inverno', FESTA = 'Coleção Festa', ESS = 'Linha Essenciais', JEANS = 'Linha Jeans';
  // [id, nome, categoria, código, custo, preço, tamanhos, cores, giro, coleção, foto] · a ordem é a da vitrine do Vender
  const def = [
    [1, 'Vestido Midi Floral', 'Vestidos', 'VM-1021', 8900, 21900, PMG, ['estampa', 'preto', 'vinho', 'nude'], 'forte', PV, 'img/peca-vestido-midi-floral.webp'],
    [2, 'Vestido Longo Alcinha', 'Vestidos', 'VL-1033', 10200, 24900, PMG, ['vinho', 'preto'], 'giro', FESTA, 'img/peca-vestido-longo-alcinha.webp'],
    [5, 'Blusa Cetim Manga Longa', 'Blusas', 'BC-5510', 4600, 11900, PMG, ['off', 'nude'], 'forte', ESS, 'img/peca-blusa-cetim.webp'],
    [4, 'Suéter Tricot Listrado', 'Blusas', 'BT-5502', 5200, 12900, PMG, ['marinho', 'off'], 'giro', OI, 'img/peca-sueter-tricot.webp'],
    [9, 'Calça Jeans Reta', 'Calças', 'CJ-6601', 7800, 17900, PMG, ['azul', 'preto'], 'forte', JEANS, 'img/peca-calca-jeans-reta.webp'],
    [15, 'Blazer Alfaiataria', 'Casacos', 'BZ-7701', 12400, 29900, PMG, ['caramelo', 'preto'], 'giro', OI, 'img/peca-blazer-alfaiataria.webp'],
    [7, 'Camiseta Básica', 'Camisetas', 'CB-1007', 1800, 4990, PMG, ['branco', 'preto', 'vinho'], 'forte', ESS, 'img/peca-camiseta-basica.webp'],
    [10, 'Calça Alfaiataria', 'Calças', 'CA-3212', 9200, 22900, PMG, ['verde', 'preto', 'off'], 'giro', PV, 'img/peca-calca-alfaiataria.webp'],
    [3, 'Vestido Tubinho', 'Vestidos', 'VT-1040', 7400, 17900, PMG, ['preto', 'nude'], 'giro', FESTA, 'fotos/p3.jpg'],
    [6, 'Body Canelado', 'Blusas', 'BD-5521', 2900, 6990, PMG, ['preto', 'branco', 'nude'], 'forte', ESS, 'fotos/p6.jpg'],
    [8, 'Camiseta Estampa Boho', 'Camisetas', 'CE-1007', 2400, 5990, PMG, ['off', 'rosa'], 'giro', PV, 'fotos/p8.jpg'],
    [11, 'Calça Pantalona Linho', 'Calças', 'CP-3320', 7600, 18900, NUM, ['nude', 'off'], 'parado', PV, 'fotos/p11.jpg'],
    [12, 'Saia Midi Plissada', 'Saias', 'SM-4401', 4800, 12900, PMG, ['off', 'preto', 'nude'], 'giro', PV, 'fotos/p12.jpg'],
    [13, 'Saia Jeans Curta', 'Saias', 'SJ-4410', 3900, 9900, NUM, ['azul', 'claro'], 'giro', JEANS, 'fotos/p13.jpg'],
    [14, 'Jaqueta Jeans Oversized', 'Casacos', 'JJ-6601', 9200, 22900, PMG, ['azul', 'claro'], 'parado', JEANS, 'fotos/p14.jpg'],
    [16, 'Short Alfaiataria Xadrez', 'Shorts', 'SA-7701', 3600, 8990, NUM, ['xadrez', 'preto'], 'giro', PV, 'fotos/p16.jpg'],
    [17, 'Short Jeans Destroyed', 'Shorts', 'SD-7710', 3200, 7990, NUM, ['azul'], 'parado', JEANS, 'fotos/p17.jpg'],
    [18, 'Bolsa Tiracolo Couro', 'Acessórios', 'AC-9901', 6800, 15900, ['Único'], ['caramelo', 'preto'], 'giro', '', 'fotos/p18.jpg'],
    [19, 'Cinto Fivela Dourada', 'Acessórios', 'AC-3011', 2400, 5990, ['P', 'M', 'G'], ['caramelo', 'preto'], 'giro', '', 'fotos/p19.jpg'],
    [20, 'Lenço de Seda Animal Print', 'Acessórios', 'AC-9920', 2200, 5990, ['Único'], ['caramelo', 'preto'], 'giro', '', 'fotos/p20.jpg'],
    [21, 'Conjunto Cropped e Saia Floral', 'Saias', 'CS-4430', 8800, 19900, PMG, ['estampa', 'off'], 'parado', PV, 'fotos/p21.jpg'],
    [22, 'Camisa Social Feminina', 'Blusas', 'CS-5530', 5400, 13900, PMG, ['branco', 'marinho'], 'giro', ESS, 'fotos/p22.jpg'],
    [23, 'Vestido Envelope Plus', 'Vestidos', 'VP-1050', 9400, 22900, PLUS, ['vinho', 'preto'], 'giro', FESTA, 'fotos/p23.jpg'],
    [24, 'Calça Jeans Plus Cintura Alta', 'Calças', 'CJ-3340', 7200, 17900, NUMP, ['azul', 'preto'], 'giro', JEANS, 'fotos/p24.jpg'],
  ];
  const produtos = def.map(([n, nome, cat, cod, custo, preco, tam, cores, giro, colecao, foto], i) => ({
    id: `p${n}`, nome, cat, cod, marca: '', colecao, forn: i % 3 ? 'Ateliê Rosa Confecções' : 'Brás Moda Atacado', foto, custo, preco, min: tam.length === 1 ? 2 : 1, tam, cores: cores.map((k) => ({ ...C[k] })), q: {}, criado: somaDias(h, -150), arquivado: false, giro,
  }));
  fotosDeCorExemplo(produtos);
  const fornecedores = [{ id: 'f1', nome: 'Brás Moda Atacado', tel: '11987650001' }, { id: 'f2', nome: 'Ateliê Rosa Confecções', tel: '19992340044' }];
  const NOMES = ['Ana Souza', 'Carla Mendes', 'Juliana Alves', 'Fernanda Lima', 'Patrícia Rocha', 'Beatriz Costa', 'Mariana Ribeiro', 'Camila Duarte', 'Larissa Prado', 'Renata Barros', 'Aline Teixeira', 'Gabriela Nunes', 'Tatiane Freitas', 'Débora Campos', 'Vanessa Moura', 'Simone Araújo', 'Cristina Pires', 'Luana Batista', 'Helena Castro', 'Rosângela Dias',
    'Isabela Martins', 'Letícia Gomes', 'Natália Cardoso', 'Priscila Ramos', 'Bruna Carvalho', 'Daniela Lopes', 'Elaine Moreira', 'Flávia Rezende', 'Giovana Pacheco', 'Jéssica Fonseca', 'Karina Vieira', 'Lívia Andrade', 'Marcela Pinto', 'Nathália Borges', 'Paula Siqueira', 'Raquel Coelho', 'Sabrina Melo', 'Talita Rangel', 'Viviane Lacerda', 'Yasmin Torres'];
  // aniversário: Ana amanhã e Patrícia em 5 dias (as outras espalhadas pelo ano)
  const niver = (ano, d) => `${ano}${somaDias(h, d).slice(4)}`;
  const clientes = NOMES.map((nome, i) => ({ id: `c${i + 1}`, nome, tel: `1699${String(1100000 + i * 7311).slice(0, 7)}`, cpf: '', nasc: i === 0 ? niver(1991, 1) : i === 4 ? niver(1987, 5) : `19${70 + (i * 3) % 30}-${pad(((i + 5) % 12) + 1)}-${pad((i * 7) % 27 + 1)}`, end: '', limite: [30000, 50000, 80000, 40000][i % 4], obs: '', bloqueado: false, credito: 0, criado: somaDias(h, -160), foto: i === 0 ? 'img/cliente-ana.webp' : i === 4 ? 'img/cliente-patricia.webp' : '' }));
  // nenhuma outra cliente faz aniversário nos próximos 7 dias por acaso
  clientes.forEach((c, i) => { if (i !== 0 && i !== 4) { const k = c.nasc.slice(5); for (let d = 0; d <= 8; d++) if (somaDias(h, d).slice(5) === k) c.nasc = `${c.nasc.slice(0, 5)}${somaDias(h, 40 + i).slice(5)}`; } });
  const MAUS = new Set(['c2', 'c9', 'c14', 'c27']); // não pagam em dia
  const VIP = ['c1', 'c3', 'c6', 'c12', 'c21'];
  clientes.find((c) => c.id === 'c9').bloqueado = true; clientes.find((c) => c.id === 'c9').obs = 'Bloqueada no crediário até acertar o atraso.';
  const db = { v: 1, exemplo: EXEMPLO, tema: 'ameixa', loja: { nome: 'Boutique Bella', slogan: 'Roupas e acessórios', dono: 'Bella', tel: '16991500746', cidade: 'Orlândia, SP', pix: 'boutiquebella@pix.com', logo: '' },
    cfg: { limitePadrao: 30000, alertaPct: 80, bloqueioDias: 15, bloqueioAuto: true, juros: { ativo: false, multaPct: 2, jurosMesPct: 1, carencia: 3 }, parados: [30, 60, 90], minimo: 1, msgs: {}, vipMin: 300000 },
    usuarios: EQUIPE(), usuario: 'u1', meta: 0, metas: {}, atividades: [],
    clientes, produtos, fornecedores, vendas: [], parcelas: [], pagamentos: [], acordos: [], cobrancas: [], movs: [], compras: [], excecoes: [], avarias: [], caixa: { aberto: null, historico: [] }, n: 1000 };
  // estoque: entrada há 150 dias e reposições a cada mês (o que não gira não é reposto)
  const alvo = (p) => (p.giro === 'forte' ? 5 : p.giro === 'parado' ? 2 : 3);
  const entra = (p, qtd, data, ref, cor, tm) => { const k = `${cor}|${tm}`; p.q[k] = (p.q[k] || 0) + qtd; db.movs.push({ id: uid('m'), data, p: p.id, cor, tam: tm, q: qtd, tipo: 'entrada', ref }); };
  produtos.forEach((p) => p.cores.forEach((c) => p.tam.forEach((tm) => entra(p, alvo(p), `${somaDias(h, -150)}T10:00:00`, 'Estoque inicial', c.n, tm))));
  db.compras.push({ id: 'cp1', data: somaDias(h, -150), forn: 'Brás Moda Atacado', itens: [], total: produtos.reduce((s, p) => s + p.custo * p.cores.length * p.tam.length * alvo(p), 0), forma: 'Boleto 30/60', obs: 'Estoque inicial da loja' });
  const repoe = (d, nc) => {
    const dia = somaDias(h, d), itens = [];
    produtos.filter((p) => p.giro !== 'parado').forEach((p, i) => { let n = 0; p.cores.forEach((c, ci) => p.tam.forEach((tm, ti) => { const k = `${c.n}|${tm}`, falta = alvo(p) - (p.q[k] || 0); if (falta > 0 && (d < -20 || (i + ci + ti) % 4)) { entra(p, falta, `${dia}T09:30:00`, `Compra ${nc}`, c.n, tm); n += falta; } })); if (n) itens.push({ p: p.id, qtd: n, custo: p.custo }); });
    db.compras.push({ id: nc, data: dia, forn: nc === 'cp3' || nc === 'cp5' ? 'Brás Moda Atacado' : 'Ateliê Rosa Confecções', itens, total: itens.reduce((s, x) => s + x.qtd * x.custo, 0), forma: nc === 'cp5' ? 'Pix' : 'Boleto 30 dias', obs: 'Reposição do que vendeu' });
  };
  // vendas dos últimos 30 dias (19/11: era 120; exemplo menor); as peças "paradas" não vendem
  const caixaHoje = 'cx-hoje', REP = { '-25': 'cp2', '-18': 'cp3', '-10': 'cp4', '-4': 'cp5' };
  for (let d = -30; d <= 0; d++) {
    if (REP[d]) repoe(d, REP[d]);
    const dia = somaDias(h, d), fds = new Date(`${dia}T12:00`).getDay(), n = d === 0 ? 11 : fds === 0 ? 0 : Math.floor(r() * 3) + (fds === 6 ? 3 : 1);
    for (let k = 0; k < n; k++) {
      const pode = produtos.filter((p) => p.giro !== 'parado' && Object.values(p.q).some((x) => x > 0));
      if (!pode.length) break;
      const itens = []; const ni = r() < 0.55 ? 1 : r() < 0.75 ? 2 : 3;
      for (let j = 0; j < ni; j++) {
        const p = r() < 0.45 ? esc_(pode.filter((x) => x.giro === 'forte').concat(pode.slice(0, 2))) : esc_(pode), vars = Object.entries(p.q).filter(([, x]) => x > 0); if (!vars.length) continue;
        const [kk] = esc_(vars), [cor, tam] = kk.split('|');
        if (itens.some((x) => x.p === p.id && x.cor === cor && x.tam === tam)) continue;
        itens.push({ p: p.id, nome: p.nome, cor, tam, qtd: 1, preco: p.preco, custo: p.custo });
      }
      if (!itens.length) continue;
      const total = itens.reduce((s, x) => s + x.preco * x.qtd, 0), desc = r() < 0.15 ? Math.round(total * 0.05 / 100) * 100 : 0, liq = total - desc;
      const cli = r() < 0.16 ? esc_(clientes.filter((c) => VIP.includes(c.id))) : r() < 0.78 ? esc_(clientes) : null, sorte = r();
      let pag;
      if (cli && sorte < 0.12 && !(cli.id === 'c9' && d > -60)) pag = [{ f: 'fiado', v: liq }];
      else if (cli && sorte < 0.17) pag = [{ f: 'pix', v: Math.round(liq / 2) }, { f: 'fiado', v: liq - Math.round(liq / 2) }];
      else pag = [{ f: esc_(['pix', 'pix', 'pix', 'dinheiro', 'dinheiro', 'credito', 'credito', 'credito', 'debito']), v: liq }];
      const hora = `${pad(9 + Math.floor(r() * 9))}:${pad(Math.floor(r() * 60))}:00`;
      const v = { id: uid('v'), n: ++db.n, data: `${dia}T${hora}`, vend: esc_(['u1', 'u2', 'u2', 'u3', 'u3']), cli: cli ? cli.id : null, itens, sub: total, desc, total: liq, pag, devol: [], caixa: d === 0 ? caixaHoje : `cx${d}` };
      itens.forEach((x) => { const p = produtos.find((y) => y.id === x.p); p.q[`${x.cor}|${x.tam}`] -= x.qtd; db.movs.push({ id: uid('m'), data: v.data, p: x.p, cor: x.cor, tam: x.tam, q: -x.qtd, tipo: 'venda', ref: v.id }); });
      const fiado = pag.find((x) => x.f === 'fiado');
      if (fiado) {
        const np = fiado.v > 15000 ? 3 : fiado.v > 8000 ? 2 : 1, base = Math.floor(fiado.v / np);
        for (let i = 0; i < np; i++) {
          const valor = i === np - 1 ? fiado.v - base * (np - 1) : base, venc = somaMes(dia, i + 1);
          const pc = { id: uid('pc'), cli: cli.id, venda: v.id, num: i + 1, de: np, valor, saldo: valor, venc, pags: [], status: 'aberta' };
          db.parcelas.push(pc);
          // quem paga em dia quita no vencimento (ou perto); as "más pagadoras" deixam vencer
          if (venc < h) {
            const paga = MAUS.has(cli.id) ? r() < 0.25 : r() < 0.93;
            if (paga) {
              const dp = somaDias(venc, Math.floor(r() * 6) - 2) > h ? h : somaDias(venc, Math.floor(r() * 6) - 2), f = esc_(['pix', 'pix', 'dinheiro']);
              const pg = { id: uid('pg'), data: `${dp}T15:20:00`, cli: cli.id, v: valor, f, parcelas: [{ id: pc.id, v: valor }], caixa: dp === h ? caixaHoje : `cx${dias(h, dp)}` };
              db.pagamentos.push(pg); pc.saldo = 0; pc.pags.push(pg.id);
            } else if (r() < 0.4) {
              const parte = Math.round(valor * 0.4 / 100) * 100, dp = somaDias(venc, 3) > h ? h : somaDias(venc, 3);
              const pg = { id: uid('pg'), data: `${dp}T11:00:00`, cli: cli.id, v: parte, f: 'dinheiro', parcelas: [{ id: pc.id, v: parte }], caixa: `cx${dias(h, dp)}` };
              db.pagamentos.push(pg); pc.saldo -= parte; pc.pags.push(pg.id);
            }
          }
        }
      }
      db.vendas.push(v);
    }
  }
  // crediário de compras anteriores aos 30 dias do exemplo (19/11): sem isso o Crediário ficava sem parcela paga no mês, vencida ou vencendo
  [['c2', 18900, -24, 0], ['c9', 24900, -16, 0], ['c14', 12900, -9, 0], ['c27', 17900, -33, 0], ['c1', 21900, -12, 1], ['c3', 29900, -8, 1], ['c6', 11900, -5, 1], ['c12', 13800, -15, 1], ['c4', 16900, 3, 0], ['c5', 9900, 6, 0], ['c8', 14900, 2, 0]].forEach(([cid, valor, dv, paga], i) => {
    if (!clientes.some((x) => x.id === cid)) return;
    const venc = somaDias(h, dv), pc = { id: uid('pc'), cli: cid, venda: null, caderno: 'Compra anterior ao sistema', data: somaDias(venc, -30), num: 1, de: 1, valor, saldo: valor, venc, pags: [], status: 'aberta' };
    db.parcelas.push(pc);
    if (paga) {
      const dp = somaDias(venc, (i % 3) - 1) > h ? h : somaDias(venc, (i % 3) - 1), pg = { id: uid('pg'), data: `${dp}T15:20:00`, cli: cid, v: valor, f: ['pix', 'dinheiro', 'pix'][i % 3], parcelas: [{ id: pc.id, v: valor }], caixa: dp === h ? caixaHoje : `cx${dias(h, dp)}` };
      db.pagamentos.push(pg); pc.saldo = 0; pc.pags.push(pg.id);
    }
  });
  // número da venda em ordem de data (o sorteio cria as vendas fora de ordem dentro do dia)
  db.vendas.sort((a, b) => a.data.localeCompare(b.data)).forEach((v, i) => { v.n = 1001 + i; }); db.n = 1000 + db.vendas.length;
  // duas trocas hoje (tamanho que não serviu): a peça volta para a arara e o valor vira crédito
  db.vendas.filter((v) => v.cli && v.data.slice(0, 10) < h && v.data.slice(0, 10) >= somaDias(h, -6) && !v.pag.some((x) => x.f === 'fiado')).slice(-2).forEach((v, i) => {
    const x = v.itens[0], c = clientes.find((y) => y.id === v.cli), val = x.preco; x.devolvido = 1;
    const p = produtos.find((y) => y.id === x.p); p.q[`${x.cor}|${x.tam}`] += 1;
    db.movs.push({ id: uid('m'), data: `${h}T${i ? '15:10' : '11:25'}:00`, p: x.p, cor: x.cor, tam: x.tam, q: 1, tipo: 'devolucao', ref: v.id, motivo: 'Tamanho não serviu' });
    c.credito = (c.credito || 0) + val;
    v.devol.push({ data: `${h}T${i ? '15:10' : '11:25'}:00`, valor: val, cond: 'revenda', motivo: 'Tamanho não serviu', destino: 'troca', destinoTxt: 'crédito na loja', tipo: 'troca' });
  });
  // pagamentos e cobranças de hoje, para a tela do dia ter vida
  const hojeAberta = db.parcelas.find((x) => x.saldo > 0 && x.venc < h && !MAUS.has(x.cli));
  if (hojeAberta) { const pg = { id: uid('pg'), data: `${h}T10:40:00`, cli: hojeAberta.cli, v: hojeAberta.saldo, f: 'pix', parcelas: [{ id: hojeAberta.id, v: hojeAberta.saldo }], caixa: caixaHoje }; db.pagamentos.push(pg); hojeAberta.pags.push(pg.id); hojeAberta.saldo = 0; }
  db.caixa.aberto = { id: caixaHoje, abertura: `${h}T08:55:00`, inicial: 20000, movs: [{ id: uid('cm'), t: 'despesa', v: 3500, desc: 'Café e água da loja', data: `${h}T09:10:00`, f: 'dinheiro' }] };
  for (let d = -5; d < 0; d++) db.caixa.historico.push({ id: `cx${d}`, abertura: `${somaDias(h, d)}T09:00:00`, fechamento: `${somaDias(h, d)}T18:30:00`, inicial: 20000, contado: null, esperado: null, dif: d === -3 ? -500 : 0, obs: d === -3 ? 'Faltaram R$ 5,00 (troco)' : '' });
  db.cobrancas.push({ id: uid('cb'), cli: 'c2', data: `${somaDias(h, -2)}T14:00:00`, modelo: 'atraso' });
  // metas: a do mês passado e a deste mês, um pouco acima do ritmo da loja (arredondadas no milhar)
  const mesDe = (iso) => iso.slice(0, 7), ritmo = db.vendas.filter((v) => v.data.slice(0, 10) >= somaDias(h, -60)).reduce((s, v) => s + v.total, 0) / 60;
  const m0 = mesDe(h), m1 = mesDe(somaMes(`${m0}-01`, -1)), m2 = mesDe(somaMes(`${m0}-01`, -2)), diasMes = (m) => new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate();
  [[m2, 0.95], [m1, 1.08], [m0, 1.15]].forEach(([m, k]) => { db.metas[m] = Math.round(ritmo * diasMes(m) * k / 100000) * 100000; });
  db.meta = db.metas[m0];
  return db;
}

const PERMS = [['custo', 'Ver custo e lucro'], ['desconto', 'Desconto acima do limite'], ['liberar', 'Liberar crediário fora da regra'], ['caixa', 'Abrir e fechar o caixa'], ['relatorios', 'Ver relatórios']];
const EQUIPE = () => [
  { id: 'u1', nome: 'Bella Martins', perfil: 'dona', tel: '16991500746', email: 'bella@boutiquebella.com', foto: '', nasc: '', descMax: 100, perms: {}, pin: '' },
  { id: 'u2', nome: 'Júlia Santos', perfil: 'vendedora', tel: '16992223344', email: '', foto: '', nasc: '', descMax: 10, perms: { caixa: true }, pin: '' },
  { id: 'u3', nome: 'Paula Reis', perfil: 'vendedora', tel: '16993334455', email: '', foto: '', nasc: '', descMax: 5, perms: {}, pin: '' },
];
let db;
try { db = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { db = null; }
if (new URLSearchParams(location.search).has('novo') || !db || !db.produtos) db = inicial();
// demonstração: quem tinha a loja de exemplo antiga recebe a nova (a antiga fica guardada numa cópia); a conta de verdade nunca é trocada
if (!window.veltriaConta && (db.exemplo || 1) < EXEMPLO) { db = inicial(); } // 19/11: sem cópia do exemplo antigo (enchia o navegador)
if (!window.veltriaConta && db && db.exemplo === EXEMPLO) fotosDeCorExemplo(db.produtos);
const grava = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch (e) { setTimeout(() => { try { toast('Não consegui salvar neste aparelho (sem espaço). Faça uma cópia em Configurações.', true); } catch (_) { /* tela ainda montando */ } }, 0); } }; // 18/11: o aviso espera a tela montar (antes travava a demonstração com o armazenamento cheio)
// dados de antes desta versão: ganham equipe, meta e registro de atividades
if (!db.usuarios) { db.usuarios = EQUIPE(); db.usuario = 'u1'; }
db.meta = db.meta || 2500000; db.atividades = db.atividades || [];
// 18/11/2026: meta por mês (seletor no Início, valor em Configurações), cliente VIP, coleção da peça
db.metas = db.metas || {}; db.cfg.vipMin = db.cfg.vipMin ?? 300000;
db.produtos.forEach((p) => { if (p.colecao === undefined) p.colecao = ''; });
db.notas = db.notas || [];
db.fiscal = db.fiscal || { usar: false, ambiente: '2', regime: '1', razao: '', cnpj: '', ie: '', rua: '', numero: '', bairro: '', cidade: '', codMun: '', uf: 'SP', cep: '', cscId: '', serie: 1, proximo: 1 };
// 22/11/2026: a nota fiscal volta no modelo "use o emissor que você já tem" (db.fiscal.modo; veja a seção nota fiscal). O antigo db.fiscal.usar não é mais lido.
// várias lojas (07/11/2026): cada loja tem o próprio estoque e o próprio caixa; a loja 1 usa p.q e db.caixa (dados antigos continuam valendo)
db.lojas = db.lojas || [{ id: 'l1', nome: 'Loja principal' }];
const lojaAtual = () => { let l = ''; try { l = localStorage.getItem('peplo-loja') || ''; } catch (e) { /* sem armazenamento */ } return db.lojas.some((x) => x.id === l) ? l : 'l1'; };
const nomeLoja = (id) => (db.lojas.find((x) => x.id === id) || {}).nome || 'Loja';
const variasLojas = () => db.lojas.length > 1;
const CX = () => (lojaAtual() === 'l1' ? db.caixa : ((db.caixas ||= {})[lojaAtual()] ||= { aberto: null, historico: [] }));
db.pedidos = db.pedidos || []; db.promos = db.promos || []; db.cfg.comissaoPct = db.cfg.comissaoPct ?? 3;
db.cfg.taxas = db.cfg.taxas || { debito: 1.39, credito: 3.15, parcelado: 4.69, prazoDebito: 1, prazoCredito: 30 };
db.usuarios.forEach((u) => { if (u.comissao === undefined) u.comissao = u.perfil === 'dona' ? 0 : db.cfg.comissaoPct; });
if (!db.pedidosDemo && !db.pedidos.length && db.produtos.some((p) => p.id === 'p9')) {
  // demonstração: um pedido do Brás em aberto (metade já chegou) e a liquidação de inverno preparada
  const p9 = db.produtos.find((x) => x.id === 'p9'), p6 = db.produtos.find((x) => x.id === 'p6'), q9 = {}, q6 = {}, r9 = {};
  p9.cores.forEach((c) => p9.tam.slice(0, 5).forEach((tm) => { q9[`${c.n}|${tm}`] = 4; r9[`${c.n}|${tm}`] = 2; }));
  p6.cores.forEach((c) => p6.tam.forEach((tm) => { q6[`${c.n}|${tm}`] = 3; }));
  db.pedidos.push({ id: 'pd1', n: 1, forn: 'Brás Moda Atacado', data: somaDias(hoje(), -6), previsao: somaDias(hoje(), 4), obs: 'Viagem ao Brás, lote de jeans e body', itens: [{ p: 'p9', q: q9, rec: r9, custo: 6200 }, { p: 'p6', q: q6, rec: {}, custo: 2800 }], status: 'parcial' });
  db.promos.push({ id: 'pr1', nome: 'Liquidação de inverno', cat: 'Blusas', pct: 30, de: somaDias(hoje(), 10), ate: somaDias(hoje(), 25) });
  db.pedidosDemo = true;
} db.cfg.abrirEm = db.cfg.abrirEm || 'inicio';
grava();
const eu = () => db.usuarios.find((u) => u.id === db.usuario) || db.usuarios[0];
const dona = () => eu().perfil === 'dona';
const pode = (k) => dona() || !!(eu().perms || {})[k];
const registra = (txt, tipo = 'geral') => { db.atividades.unshift({ data: agora(), quem: eu().nome, txt, tipo }); db.atividades = db.atividades.slice(0, 300); };
const iniciais = (n) => String(n || '?').split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const nomeVend = (id) => (db.usuarios.find((u) => u.id === id) || {}).nome || '—';

// ------------------------------------------------------------------ regras: fiado
const cli = (id) => db.clientes.find((c) => c.id === id);
const prod = (id) => db.produtos.find((p) => p.id === id);
const parcelasDe = (cid) => db.parcelas.filter((p) => p.cli === cid);
const abertas = (cid) => parcelasDe(cid).filter((p) => p.saldo > 0 && p.status !== 'renegociada' && p.status !== 'cancelada');
const aberto = (cid) => abertas(cid).reduce((s, p) => s + p.saldo, 0);
const vencido = (cid) => abertas(cid).filter((p) => p.venc < hoje()).reduce((s, p) => s + p.saldo, 0);
const maiorAtraso = (cid) => abertas(cid).filter((p) => p.venc < hoje()).reduce((m, p) => Math.max(m, dias(p.venc)), 0);
const statusParc = (p) => (p.status === 'renegociada' ? 'renegociada' : p.status === 'cancelada' ? 'cancelada' : p.saldo <= 0 ? 'paga' : p.venc < hoje() ? 'vencida' : p.saldo < p.valor ? 'parcial' : p.venc === hoje() ? 'hoje' : 'pendente');
const ROT_PARC = { paga: ['ok', 'Paga'], vencida: ['mal', 'Vencida'], parcial: ['atn', 'Paga em parte'], hoje: ['atn', 'Vence hoje'], pendente: ['', 'A vencer'], renegociada: ['ac', 'Renegociada'], cancelada: ['', 'Cancelada'] };
function situacao(c) {
  const ab = aberto(c.id), ven = vencido(c.id), atr = maiorAtraso(c.id);
  if (c.bloqueado) return { k: 'bloq', tag: 'mal', txt: 'Bloqueada no crediário' };
  if (db.cfg.bloqueioAuto && atr > db.cfg.bloqueioDias) return { k: 'bloq', tag: 'mal', txt: `Bloqueio automático (${atr} dias)` };
  if (ven > 0) return { k: 'atraso', tag: 'mal', txt: `Em atraso · ${atr} dias` };
  if (c.limite && ab >= c.limite) return { k: 'limite', tag: 'atn', txt: 'Limite usado' };
  if (c.limite && ab >= c.limite * db.cfg.alertaPct / 100) return { k: 'perto', tag: 'atn', txt: 'Perto do limite' };
  if (ab > 0) return { k: 'emdia', tag: 'ok', txt: 'Em dia' };
  return { k: 'sem', tag: '', txt: 'Sem crediário' };
}
// pode vender crediário? (venda à vista nunca é bloqueada)
function podeFiado(c, valor) {
  if (!c) return { ok: false, motivo: 'Escolha a cliente para vender no crediário.' };
  const s = situacao(c), disp = (c.limite || 0) - aberto(c.id);
  if (s.k === 'bloq') return { ok: false, motivo: c.bloqueado ? `${c.nome} está bloqueada no crediário.` : `${c.nome} está bloqueada no crediário (${s.txt.toLowerCase()}).`, excecao: true };
  if (s.k === 'atraso') return { ok: false, motivo: `${c.nome} tem ${din(vencido(c.id))} vencido.`, excecao: true };
  if (valor > disp) return { ok: false, motivo: `Passa do limite: ela tem ${din(Math.max(0, disp))} disponível de ${din(c.limite || 0)}.`, excecao: true };
  return { ok: true, disp };
}
function encargo(p) {
  const j = db.cfg.juros; if (!j.ativo || p.saldo <= 0) return 0;
  const atr = dias(p.venc); if (atr <= j.carencia) return 0;
  return Math.round(p.saldo * j.multaPct / 100 + p.saldo * j.jurosMesPct / 100 * atr / 30);
}
const encargos = (cid) => abertas(cid).reduce((s, p) => s + encargo(p), 0);
function msg(k, c, extra = {}) {
  const ab = abertas(c.id).sort((a, b) => a.venc.localeCompare(b.venc)), prox = ab[0];
  const v = { nome: c.nome.split(' ')[0], loja: db.loja.nome, pix: db.loja.pix || 'combinar na loja', saldo: din(aberto(c.id) + encargos(c.id)), valor: din(prox ? prox.saldo : 0), venc: prox ? dataBR(prox.venc) : '', dias: maiorAtraso(c.id), ...extra };
  return ((db.cfg.msgs || {})[k] || MSGS[k].sug).replace(/\{(\w+)\}/g, (m, x) => String(v[x] ?? ''));
}
const modeloCobranca = (c) => (vencido(c.id) > 0 ? 'atraso' : abertas(c.id).some((p) => p.venc === hoje()) ? 'hoje' : 'lembrete');

// ------------------------------------------------------------------ regras: estoque
const Q = (p, l = lojaAtual()) => (l === 'l1' ? (p.q ||= {}) : ((p.qs ||= {})[l] ||= {}));
const qtd = (p, cor, tam, l) => Q(p, l)[`${cor}|${tam}`] || 0;
const totalPecas = (p, l) => Object.values(Q(p, l)).reduce((s, x) => s + Math.max(0, x), 0);
const totalRede = (p) => db.lojas.reduce((s, l) => s + totalPecas(p, l.id), 0);
const ativos = () => db.produtos.filter((p) => !p.arquivado);
function ultimaVenda(pid) { let u = null; for (const m of db.movs) if (m.p === pid && m.tipo === 'venda' && (!u || m.data > u)) u = m.data; return u; }
function situacaoParada(p) {
  const u = ultimaVenda(p.id), d = dias(u || p.criado), [a, b, c] = db.cfg.parados;
  return { dias: d, ultima: u, nivel: d > c ? 'Encalhada' : d > b ? 'Parada' : d > a ? 'Atenção' : 'Normal', tag: d > c ? 'mal' : d > b ? 'atn' : d > a ? 'ac' : 'ok' };
}
const parados = () => ativos().filter((p) => totalPecas(p) > 0).map((p) => ({ p, ...situacaoParada(p) })).filter((x) => x.dias > db.cfg.parados[1]).sort((a, b) => b.dias - a.dias);
const baixos = () => ativos().flatMap((p) => p.cores.flatMap((c) => p.tam.map((tm) => ({ p, cor: c.n, tam: tm, q: qtd(p, c.n, tm) })))).filter((x) => x.q <= x.p.min);
const produtosBaixos = () => [...new Set(baixos().map((x) => x.p))];
function grade(p, { editar = false, minimo = true, loja } = {}) {
  return `<div class="tabela-wrap"><table class="gradeq"><thead><tr><th></th>${p.tam.map((tm) => `<th>${t(tm)}</th>`).join('')}</tr></thead><tbody>${p.cores.map((c) => `<tr><th class="cor"><span class="bolinha" style="background:${t(c.h)}"></span>${t(c.n)}</th>${p.tam.map((tm) => {
    const q = qtd(p, c.n, tm, loja);
    return editar ? `<td><input type="number" inputmode="numeric" min="0" data-g="${t(c.n)}|${t(tm)}" value="${q}" aria-label="${t(c.n)} ${t(tm)}"></td>` : `<td class="${q <= 0 ? 'zero' : minimo && q <= p.min ? 'baixo' : ''}">${q}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function mover(p, cor, tam, q, tipo, ref, motivo = '', l = lojaAtual()) { const k = `${cor}|${tam}`, g = Q(p, l); g[k] = (g[k] || 0) + q; db.movs.push({ id: uid('m'), data: agora(), p: p.id, cor, tam, q, tipo, ref, motivo, loja: l }); }

// ------------------------------------------------------------------ código de barras (Code 128-B) e etiquetas
const codVar = (p, cor, tam) => `${String(p.cod || p.id).replace(/[^A-Za-z0-9-]/g, '')}-${p.cores.findIndex((c) => c.n === cor) + 1}${String(tam).replace(/\s/g, '')}`.toUpperCase();
function acharCodigo(cod) { const c = String(cod || '').trim().toUpperCase(); if (c.length < 4) return null; for (const p of ativos()) for (const k of p.cores) for (const tm of p.tam) if (codVar(p, k.n, tm) === c) return { p, cor: k.n, tam: tm }; return null; }
const C128 = '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112'.split(' ');
function barras(txt, alt = 46) {
  const v = [104]; for (const ch of String(txt)) v.push(Math.max(0, Math.min(94, ch.charCodeAt(0) - 32)));
  let soma = 104; for (let i = 1; i < v.length; i++) soma += v[i] * i; v.push(soma % 103, 106);
  let x = 10, r = ''; v.forEach((c) => { const pd = C128[c]; for (let i = 0; i < pd.length; i++) { const w = Number(pd[i]); if (i % 2 === 0) r += `<rect x="${x}" y="0" width="${w}" height="${alt}"/>`; x += w; } });
  return `<svg class="barras-svg" viewBox="0 0 ${x + 10} ${alt}" preserveAspectRatio="none" role="img" aria-label="Código ${t(txt)}"><g fill="#111">${r}</g></svg>`;
}
function etiquetas(p) {
  abrir(`<h2>Etiquetas de ${t(p.nome)}</h2><p class="mudo">Uma etiqueta por peça em estoque (ou escolha a quantidade). O leitor de código de barras no Vender põe a peça certa na sacola, com cor e tamanho.</p>
    <div class="tabela-wrap"><table class="gradeq"><thead><tr><th></th>${p.tam.map((tm) => `<th>${t(tm)}</th>`).join('')}</tr></thead><tbody>${p.cores.map((c) => `<tr><th class="cor"><span class="bolinha" style="background:${t(c.h)}"></span>${t(c.n)}</th>${p.tam.map((tm) => `<td><input type="number" min="0" data-et="${t(c.n)}|${t(tm)}" value="${Math.max(0, qtd(p, c.n, tm))}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="acoes"><button type="button" class="bt cheio" data-ok>Imprimir etiquetas</button></div>`, (j) => {
    $('[data-ok]', j).onclick = () => {
      const l = []; $$('[data-et]', j).forEach((i) => { const [cor, tam] = i.dataset.et.split('|'); for (let k = 0; k < Math.min(200, Number(i.value) || 0); k++) l.push({ cor, tam }); });
      if (!l.length) { toast('Escolha ao menos uma etiqueta.', true); return; }
      if (imprimirEtiquetas(l.map((x) => ({ p, ...x })))) fechar();
    };
  });
}

// ------------------------------------------------------------------ nota fiscal (NFC-e, modelo 65) · "use o emissor que você já tem" (22/11/2026)
// Configurações › Nota fiscal › "Como você emite nota hoje?" (db.fiscal.modo):
//   api      → a conta da própria loja num emissor (Brasil NFe ou Focus NFe). O token vai para a função nexo-nfce e fica cifrado
//              no servidor; o certificado A1 e o CSC ficam no painel do emissor dela. A NFC-e sai ao finalizar a venda.
//   outro    → emite no PDV, no emissor dela ou pelo contador: a venda ganha "Nota emitida em outro sistema" e as vendas
//              são exportadas (CSV por peça com NCM, CFOP e CSOSN, e XML simples) para lançar no emissor ou mandar ao contador.
//   bluerose → a Blue Rose emite (em breve).   nao → não emite (ex.: MEI): nada aparece.
// Só acrescenta campos: db.fiscal.modo/provedor/auto, peça .ncm/.cfop/.csosn/.orig, nota .protocolo/.qrcode/.url/.autorizada/.cancelada,
// venda .nfOutro/.nfErro. Na demonstração a nota é de exemplo (homologação, sem valor fiscal). Token, certificado e senha nunca ficam aqui.
const NCM_SUG = { Vestidos: '6204.44.00', Blusas: '6206.40.00', Camisetas: '6109.10.00', Calças: '6204.62.00', Saias: '6204.52.00', Jaquetas: '6204.33.00', Shorts: '6204.62.00', Acessórios: '4202.22.10', Casacos: '6202.40.00' };
const TPAG = { dinheiro: '01', credito: '03', debito: '04', loja: '05', pix: '17', fiado: '05' };
const PROV_NF = { brasilnfe: ['Brasil NFe', 'No painel da Brasil NFe: Empresas › a sua empresa › Token da empresa.'], focus: ['Focus NFe', 'No painel da Focus NFe: Minhas empresas › a sua empresa › Tokens (use o de homologação para testar).'] };
const MODOS_NF = [
  ['api', 'Tenho conta num emissor de nota on-line', 'Brasil NFe ou Focus NFe. Você cola o token da sua conta e a NFC-e sai pelo Peplo ao finalizar a venda.'],
  ['outro', 'Emito no meu PDV, no meu emissor ou pelo contador', 'O Peplo não emite: você marca a nota na venda e exporta as vendas para o emissor ou o contador.'],
  ['bluerose', 'Quero que a Blue Rose emita', 'A gente cuida do emissor para você.'],
  ['nao', 'Não emito nota (ex.: MEI)', 'Nada de nota aparece nas vendas.'],
];
const modoNf = () => db.fiscal.modo || '';
const emiteNf = () => modoNf() === 'api';
const nfAtivo = () => ['api', 'outro'].includes(modoNf());
const simplesNf = () => db.fiscal.regime !== '3';
const somenteNum = (x) => String(x || '').replace(/\D/g, '');
const emConta = () => !!window.veltriaConta;
let nfServidor = null; // o que a função diz da conta do emissor (conectado, provedor, ambiente). Nunca o token.
const chamaNf = (body) => (emConta() && window.nexoNfce ? window.nexoNfce(body) : Promise.resolve({ ok: false, mensagem: 'Entre na conta para usar a nota fiscal.' }));
function statusNf() {
  if (!emConta()) { nfServidor = { conectado: !!db.fiscal.conectadoDemo, provedor: db.fiscal.provedor || null, demo: true }; return Promise.resolve(nfServidor); }
  return chamaNf({ acao: 'status' }).then((s) => (nfServidor = s || {})).catch(() => (nfServidor = {}));
}
// dados fiscais da peça: o que a dona salvou ou a sugestão da categoria (moda no Simples). Confirme com o contador.
function fiscalPeca(p) {
  const x = p || {}, ncm = somenteNum(x.ncm);
  return { ncm: ncm || somenteNum(NCM_SUG[x.cat] || ''), sug: !ncm, cfop: x.cfop || '5102', csosn: x.csosn || (simplesNf() ? '102' : '00'), orig: x.orig || '0', cest: somenteNum(x.cest) };
}
const notaValida = (n) => !!n && (n.status === 'autorizada' || n.status === 'demonstracao');
const notaDe = (v) => (v && v.nota ? db.notas.find((x) => x.id === v.nota) : null);
// a venda vira o pedido de nota (em reais, como a função espera); o desconto é rateado pelas peças
function notaDaVenda(v, cpf = '') {
  const its = v.itens.filter((x) => x.qtd > 0 && x.preco > 0).map((x) => { const p = prod(x.p), f = fiscalPeca(p);
    return { codigo: (p ? codVar(p, x.cor, x.tam) : String(x.p)).slice(0, 60), nome: `${x.nome} ${x.cor} ${x.tam}`.slice(0, 120), ncm: f.ncm, cfop: f.cfop, cst: f.csosn, cest: f.cest, orig: f.orig, un: 'UN', qtd: x.qtd, unit: x.preco / 100, c: x.preco * x.qtd, dc: 0 }; });
  const soma = its.reduce((s, i) => s + i.c, 0); let resto = Math.min(v.desc || 0, soma);
  its.forEach((i, k) => { const p = k === its.length - 1 ? resto : Math.round((v.desc || 0) * i.c / (soma || 1)); i.dc = Math.min(i.c, p); resto -= i.dc; });
  let troco = v.troco || 0;
  const pagamentos = v.pag.map((x) => { const tr = x.f === 'dinheiro' && troco ? troco : 0; troco -= tr; return { tpag: TPAG[x.f] || '99', valor: (x.v + tr) / 100, troco: tr / 100 }; }).filter((x) => x.valor > 0);
  const ref = `${String(v.id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 44)}${v.nfTentativas ? `-${v.nfTentativas}` : ''}`;
  return { ref, cpf: somenteNum(cpf), cnpj: somenteNum(db.fiscal.cnpj), piscofins: '49', pagamentos,
    itens: its.map(({ c, dc, ...i }) => ({ ...i, total: c / 100, desc: dc / 100, outro: 0 })) };
}
function dvChave(c43) { let p = 2, s2 = 0; for (let i = c43.length - 1; i >= 0; i--) { s2 += Number(c43[i]) * p; p = p === 9 ? 2 : p + 1; } const r = s2 % 11; return r < 2 ? 0 : 11 - r; }
function montarChave(nNF, data) {
  const f = db.fiscal, d = new Date(data), aamm = `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}`;
  const cnpj = somenteNum(f.cnpj).padStart(14, '0').slice(-14), cNF = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
  const c43 = `35${aamm}${cnpj}65${String(f.serie).padStart(3, '0')}${String(nNF).padStart(9, '0')}1${cNF}`;
  return c43 + dvChave(c43);
}
// demonstração: nota de exemplo com chave de dígito certo, em homologação
function notaDeExemplo() {
  const n = db.fiscal.proximo || 1, chave = montarChave(n, Date.now()); db.fiscal.proximo = n + 1;
  return { ok: true, demo: true, chave, numero: n, serie: db.fiscal.serie || 1, protocolo: `135${String(Date.now()).slice(-12)}`, ambiente: 'homologacao', provedor: 'demo',
    qrcode: `https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode?p=${chave}|2|2|1|${'0'.repeat(40)}`, url_consulta: 'https://www.homologacao.nfce.fazenda.sp.gov.br/consulta', autorizada_em: new Date().toISOString() };
}
const nfAndamento = new Set();
async function emitirNota(v, cpf = '') {
  if (!v || v.cancelada) { toast('Esta venda foi cancelada.', true); return null; }
  if (notaValida(notaDe(v))) return notaDe(v);
  if (nfAndamento.has(v.id)) return null;
  const n = notaDaVenda(v, cpf), falta = n.itens.find((i) => !/^\d{8}$/.test(i.ncm));
  if (falta) { toast(`Falta o NCM de ${falta.nome}. Veja Configurações › Nota fiscal › Dados fiscais das peças.`, true); return null; }
  nfAndamento.add(v.id); toast('Emitindo a NFC-e...');
  let r; try { r = emConta() ? await chamaNf({ acao: 'emitir', venda: v.id, nota: n }) : await new Promise((ok) => setTimeout(() => ok(notaDeExemplo()), 600)); } catch (e) { r = { ok: false, mensagem: 'Sem internet agora. Tente de novo.' }; }
  nfAndamento.delete(v.id);
  const venda = db.vendas.find((x) => x.id === v.id) || v; // pode ter vindo da nuvem no meio
  if (!r || !r.ok) {
    venda.nfTentativas = (venda.nfTentativas || 0) + (r && r.desligado ? 0 : 1); venda.nfErro = { data: agora(), msg: String((r && r.mensagem) || 'A nota não foi autorizada.').slice(0, 300) }; grava();
    toast(r && r.desligado ? 'Conecte a conta do seu emissor em Configurações › Nota fiscal.' : `A NFC-e não saiu: ${venda.nfErro.msg}`, true); return null;
  }
  const nota = { id: uid('nf'), venda: venda.id, numero: r.numero || null, serie: r.serie || db.fiscal.serie || 1, data: agora(), cpf: n.cpf, chave: String(r.chave || ''), valor: venda.total, status: 'autorizada',
    ambiente: r.ambiente === 'producao' ? '1' : '2', provedor: r.provedor || '', protocolo: String(r.protocolo || ''), qrcode: String(r.qrcode || '').slice(0, 1200), url: String(r.url_consulta || '').slice(0, 300),
    autorizada: (r.autorizada_em && new Date(r.autorizada_em).getTime()) || Date.now(), quem: eu().nome, ...(r.demo ? { demo: true } : {}) };
  db.notas.push(nota); venda.nota = nota.id; delete venda.nfErro;
  registra(`NFC-e${nota.numero ? ` nº ${nota.numero}` : ''} da venda nº ${venda.n}${nota.ambiente === '2' ? ' (teste, sem valor fiscal)' : ''}`, 'fiscal'); grava();
  toast(`NFC-e${nota.numero ? ` nº ${nota.numero}` : ''} autorizada.`);
  return nota;
}
const minutosNota = (n) => Math.max(0, 30 - Math.floor((Date.now() - (n.autorizada || new Date(n.data).getTime())) / 60e3));
const AVISO_DEVOLUCAO = 'Passou dos 30 minutos: em São Paulo a NFC-e não cancela mais. Para a troca ou devolução, emita a nota de devolução (entrada, CFOP 1202) no seu emissor ou peça ao seu contador. No Peplo, registre a troca normalmente.';
function cancelarNota(n) {
  if (!notaValida(n)) return;
  const min = minutosNota(n);
  if (!min) return abrir(`<h2>Esta nota não cancela mais</h2><p class="mudo">${AVISO_DEVOLUCAO}</p><div class="acoes"><button type="button" class="bt cheio" data-ok>Entendi</button></div>`, (j) => { $('[data-ok]', j).onclick = fechar; });
  abrir(`<h2>Cancelar a NFC-e${n.numero ? ` nº ${n.numero}` : ''}?</h2><p class="mudo">Em São Paulo dá para cancelar em até 30 minutos (faltam ${min} min). O motivo vai para a SEFAZ. A venda continua no Peplo: se a peça voltou, registre também a troca ou devolução.</p>
    <label class="campo">Motivo (pelo menos 15 letras)<input id="nf-mot" list="dl-nf-mot" maxlength="255" value="Cliente desistiu da compra"><datalist id="dl-nf-mot"><option value="Cliente desistiu da compra"><option value="Venda lançada em duplicidade"><option value="Erro nas peças ou no valor da venda"></datalist></label>
    <div class="acoes"><button type="button" class="bt" data-nao>Voltar</button><button type="button" class="bt perigo" data-sim>Cancelar a nota</button></div>`, (j) => {
    $('[data-nao]', j).onclick = fechar;
    $('[data-sim]', j).onclick = async (e) => {
      const motivo = $('#nf-mot', j).value.trim(); if (motivo.length < 15) { toast('Escreva o motivo com pelo menos 15 letras.', true); return; }
      e.currentTarget.disabled = true;
      let x; try { x = emConta() && !n.demo ? await chamaNf({ acao: 'cancelar', chave: n.chave, motivo }) : { ok: true, protocolo: `135${Date.now().toString().slice(-12)}` }; } catch (er) { x = { ok: false, mensagem: 'Sem internet agora.' }; }
      if (!x || !x.ok) { e.currentTarget.disabled = false; toast((x && x.mensagem) || 'A SEFAZ não aceitou o cancelamento.', true); return; }
      n.status = 'cancelada'; n.cancelada = { data: agora(), motivo, quem: eu().nome, protocolo: x.protocolo || '' };
      registra(`NFC-e${n.numero ? ` nº ${n.numero}` : ''} cancelada: ${motivo}`, 'fiscal'); grava(); fechar(); mostra(); toast('Nota cancelada.');
    };
  });
}
// DANFE NFC-e de 80 mm, com o QR da consulta
function danfeHTML(nota) {
  const v = db.vendas.find((x) => x.id === nota.venda) || { itens: [], pag: [], desc: 0, total: nota.valor }, f = db.fiscal, teste = nota.ambiente !== '1', n = notaDaVenda(v, nota.cpf);
  const cnpj = somenteNum(f.cnpj).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') || '—', cons = nota.url || `https://www.${teste ? 'homologacao.' : ''}nfce.fazenda.sp.gov.br/consulta`;
  return `<div class="danfe">${teste ? '<p class="c"><b>EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO · SEM VALOR FISCAL</b></p>' : ''}
    <p class="c"><b>${t(f.razao || db.loja.nome)}</b><br>CNPJ ${t(cnpj)}${f.ie ? ` · IE ${t(f.ie)}` : ''}<br>${t([f.rua && `${f.rua}, ${f.numero || 'S/N'}`, f.bairro, f.cidade && `${f.cidade} - SP`].filter(Boolean).join(' · ') || db.loja.cidade || '')}</p><hr>
    <p class="c">DANFE NFC-e · Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</p><hr>
    ${n.itens.map((i, k) => `<div class="l"><span>${pad(k + 1)} ${t(i.codigo)} ${t(i.nome)}<br>${i.qtd} UN × ${din(Math.round(i.unit * 100))}</span><span>${din(Math.round(i.total * 100))}</span></div>`).join('')}<hr>
    <div class="l"><span>Qtd. total de itens</span><span>${n.itens.reduce((a, i) => a + i.qtd, 0)}</span></div><div class="l"><span>Valor total R$</span><span>${din(v.sub || v.total + (v.desc || 0))}</span></div>
    ${v.desc ? `<div class="l"><span>Desconto R$</span><span>− ${din(v.desc)}</span></div>` : ''}<div class="l"><b>Valor a pagar R$</b><b>${din(v.total)}</b></div>
    <div class="l"><small>FORMA DE PAGAMENTO</small><small>VALOR PAGO R$</small></div>${n.pagamentos.map((p) => `<div class="l"><span>${t({ '01': 'Dinheiro', '03': 'Cartão de crédito', '04': 'Cartão de débito', '05': 'Crédito loja', '17': 'Pix' }[p.tpag] || 'Outros')}</span><span>${din(Math.round(p.valor * 100))}</span></div>`).join('')}
    ${v.troco ? `<div class="l"><span>Troco R$</span><span>${din(v.troco)}</span></div>` : ''}<hr>
    <p class="c"><b>Consulte pela chave de acesso em</b><br><small>${t(cons)}</small></p><p class="c chave">${t(String(nota.chave).replace(/(\d{4})(?=\d)/g, '$1 '))}</p><hr>
    <p class="c">${nota.cpf ? `CONSUMIDOR ${nota.cpf.length === 14 ? 'CNPJ' : 'CPF'} ${t(nota.cpf.length === 11 ? nota.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : nota.cpf)}` : 'CONSUMIDOR NÃO IDENTIFICADO'}</p><hr>
    <p class="c"><b>NFC-e nº ${String(nota.numero || '').padStart(9, '0')} Série ${String(nota.serie || 1).padStart(3, '0')} ${dataBR(nota.data)} ${horaBR(nota.data)}</b><br>Protocolo de autorização: ${t(nota.protocolo || '—')}</p>
    ${nota.qrcode ? `<div class="qr">${qrSVG(nota.qrcode, 150, '#000')}</div>` : ''}<p class="c"><small>Tributos aproximados (Lei 12.741/2012): consulte o seu contador</small></p>
    ${teste ? '<p class="c"><b>SEM VALOR FISCAL</b></p>' : ''}${nota.status === 'cancelada' ? '<p class="c"><b>NOTA CANCELADA</b></p>' : ''}</div>`;
}
function imprimirDanfe(nota) {
  let f = $('#quadro-danfe'); if (!f) { f = document.createElement('iframe'); f.id = 'quadro-danfe'; f.title = 'impressão da nota'; f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; document.body.append(f); }
  const d = f.contentDocument; d.open();
  d.write(`<!doctype html><meta charset="utf-8"><title>DANFE NFC-e</title><style>@page{size:80mm auto;margin:3mm}body{margin:0;width:74mm;font:11.5px/1.35 ui-monospace,Consolas,monospace;color:#000}.c{text-align:center;margin:4px 0}.l{display:flex;justify-content:space-between;gap:8px;margin:2px 0}.chave{font-size:11px;word-spacing:2px}hr{border:0;border-top:1px dashed #000;margin:6px 0}.qr{display:grid;place-items:center;margin:6px 0}small{font-size:10px;word-break:break-all}</style>${danfeHTML(nota)}`);
  d.close(); setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast('Não consegui imprimir. Confira a impressora.', true); } }, 80);
}
function mostrarNota(nota) {
  if (!nota) return;
  const st = nota.status === 'cancelada' ? 'Cancelada.' : nota.ambiente !== '1' ? (nota.demo ? 'Demonstração: nota de exemplo, sem valor fiscal.' : 'Autorizada em homologação (teste, sem valor fiscal).') : 'Autorizada pela SEFAZ.';
  const min = notaValida(nota) ? minutosNota(nota) : 0;
  abrir(`<h2>NFC-e${nota.numero ? ` nº ${nota.numero}` : ''}</h2><p class="mudo">${st}${nota.cancelada ? ` Motivo: ${t(nota.cancelada.motivo)}.` : ''}</p>
    <div class="recibo danfe-tela">${danfeHTML(nota)}</div>
    ${notaValida(nota) && !min ? '<p class="mudo" style="font-size:13px;margin:10px 0 0">Passou dos 30 minutos: para troca ou devolução, emita a nota de devolução no seu emissor.</p>' : ''}
    <div class="acoes"><button type="button" class="bt cheio" data-imp-nf>${icb('impressora')}Imprimir (80 mm)</button>${min ? `<button type="button" class="bt perigo" data-cancela-nota="${nota.id}">Cancelar a nota (${min} min)</button>` : ''}</div>`, (j) => {
    $('[data-imp-nf]', j).onclick = () => imprimirDanfe(nota);
  });
}
function folhaEmitir(v) {
  abrir(`<h2>Emitir NFC-e · ${din(v.total)}</h2><p class="mudo">Venda nº ${v.n}. ${emConta() ? (db.fiscal.ambiente === '1' ? 'A nota sai valendo (produção).' : 'Ambiente de teste (homologação): a nota não tem valor fiscal.') : 'Demonstração: sai uma nota de exemplo, sem valor fiscal.'}</p>
    <label class="campo">CPF ou CNPJ na nota (opcional)<input id="nf-cpf" inputmode="numeric" maxlength="18" placeholder="Só se a cliente pedir" value="${t((v.cli && (cli(v.cli) || {}).cpf) || '')}" autocomplete="off"></label>
    ${v.nfErro ? `<div class="caixa-aviso mal">Última tentativa: ${t(v.nfErro.msg)}</div>` : ''}
    <div class="acoes"><button type="button" class="bt" data-nao>Voltar</button><button type="button" class="bt cheio" data-sim>Emitir</button></div>`, (j) => {
    $('[data-nao]', j).onclick = fechar;
    $('[data-sim]', j).onclick = async () => { const c = somenteNum($('#nf-cpf', j).value); if (c && c.length !== 11 && c.length !== 14) { toast('Escreva o CPF (11 números) ou o CNPJ (14).', true); return; } fechar(); const n = await emitirNota(v, c); if (n) { mostra(); mostrarNota(n); } };
  });
}
function folhaOutro(v) {
  abrir(`<h2>Nota emitida em outro sistema</h2><p class="mudo">Venda nº ${v.n} · ${din(v.total)}. Serve só para você saber quais vendas já têm nota.</p>
    <label class="campo">Número ou chave da nota (opcional)<input id="nf-ref" maxlength="60" value="${t((v.nfOutro || {}).ref || '')}" placeholder="Ex.: 1234 ou a chave de 44 números"></label>
    <div class="acoes">${v.nfOutro ? '<button type="button" class="bt" data-tirar>Desmarcar</button>' : '<button type="button" class="bt" data-nao>Voltar</button>'}<button type="button" class="bt cheio" data-sim>Marcar</button></div>`, (j) => {
    const nao = $('[data-nao]', j); if (nao) nao.onclick = fechar;
    $('[data-sim]', j).onclick = () => { v.nfOutro = { ref: $('#nf-ref', j).value.trim().slice(0, 60), data: agora(), quem: eu().nome }; grava(); fechar(); mostra(); toast('Venda marcada com nota.'); };
    const tr = $('[data-tirar]', j); if (tr) tr.onclick = () => { delete v.nfOutro; grava(); fechar(); mostra(); toast('Marca tirada.'); };
  });
}
// exportar vendas para o emissor ou o contador: CSV (uma linha por peça) e XML simples (não é documento fiscal)
const PER_NF = [['hoje', 'Hoje'], ['ontem', 'Ontem'], ['7', 'Últimos 7 dias'], ['mes', 'Este mês'], ['mespassado', 'Mês passado']];
function periodoNf(k) {
  const h = hoje();
  if (k === 'ontem') return [somaDias(h, -1), somaDias(h, -1)];
  if (k === '7') return [somaDias(h, -6), h];
  if (k === 'mes') return [`${h.slice(0, 8)}01`, h];
  if (k === 'mespassado') { const i = somaMes(`${h.slice(0, 8)}01`, -1); return [i, ultimoDia(i.slice(0, 7))]; }
  return [h, h];
}
const situacaoNf = (v) => { const n = notaDe(v); return v.cancelada ? 'venda cancelada' : notaValida(n) ? 'NFC-e autorizada' : v.nfOutro ? 'nota em outro sistema' : n && n.status === 'cancelada' ? 'NFC-e cancelada' : 'sem nota'; };
const refNf = (v) => { const n = notaDe(v); return notaValida(n) ? `${n.numero || ''} ${n.chave || ''}`.trim() : v.nfOutro ? v.nfOutro.ref || '' : n ? `${n.numero || ''} ${n.chave || ''}`.trim() : ''; };
const nro = (c) => campoDin(c) || '0,00';
function exportarCSV(l) {
  const linhas = [['Data', 'Hora', 'Venda', 'Peça', 'Código', 'NCM', 'CFOP', 'CSOSN/CST', 'Origem', 'Qtde', 'Unidade', 'Valor unitário', 'Valor do item', 'Desconto do item', 'Total da venda', 'Pagamentos', 'CPF/CNPJ', 'Nota (número/chave)', 'Situação', 'Devolvido']];
  l.forEach((v) => { const n = notaDaVenda(v, (notaDe(v) || {}).cpf || ''), pags = v.pag.map((x) => `${FORMAS[x.f]} ${nro(x.v)}`).join(' + ');
    n.itens.forEach((i, k) => { const x = v.itens.filter((y) => y.qtd > 0 && y.preco > 0)[k] || {};
      linhas.push([dataBR(v.data), horaBR(v.data), v.n, i.nome, i.codigo, i.ncm, i.cfop, i.cst, i.orig, i.qtd, i.un, nro(Math.round(i.unit * 100)), nro(Math.round(i.total * 100)), nro(Math.round(i.desc * 100)), nro(v.total), pags, n.cpf, refNf(v), situacaoNf(v), x.devolvido || 0]); }); });
  return csv(linhas);
}
const xmlEsc = (s) => String(s ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
function exportarXML(l, de, ate) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Vendas do Peplo para lançar no emissor ou mandar ao contador. NÃO é documento fiscal. -->\n<vendasPeplo versao="1" loja="${xmlEsc(db.fiscal.razao || db.loja.nome)}" cnpj="${somenteNum(db.fiscal.cnpj)}" de="${de}" ate="${ate}" gerado="${new Date().toISOString()}">\n${l.map((v) => { const n = notaDaVenda(v, (notaDe(v) || {}).cpf || ''), nt = notaDe(v);
    return `  <venda numero="${v.n}" data="${xmlEsc(v.data)}" total="${(v.total / 100).toFixed(2)}" desconto="${((v.desc || 0) / 100).toFixed(2)}" situacao="${xmlEsc(situacaoNf(v))}"${n.cpf ? ` cpf="${n.cpf}"` : ''}${nt && nt.chave ? ` chaveNFCe="${nt.chave}"` : ''}${v.nfOutro && v.nfOutro.ref ? ` notaOutroSistema="${xmlEsc(v.nfOutro.ref)}"` : ''}>\n${n.itens.map((i) => `    <item codigo="${xmlEsc(i.codigo)}" descricao="${xmlEsc(i.nome)}" ncm="${i.ncm}" cfop="${i.cfop}" csosn="${i.cst}" orig="${i.orig}" un="${i.un}" qtd="${i.qtd}" vUnit="${i.unit.toFixed(2)}" vProd="${i.total.toFixed(2)}" vDesc="${i.desc.toFixed(2)}"/>`).join('\n')}\n${n.pagamentos.map((p) => `    <pagamento tPag="${p.tpag}" vPag="${p.valor.toFixed(2)}"${p.troco ? ` vTroco="${p.troco.toFixed(2)}"` : ''}/>`).join('\n')}${(v.devol || []).map((d) => `\n    <devolucao data="${xmlEsc(d.data)}" valor="${(d.valor / 100).toFixed(2)}" tipo="${xmlEsc(d.tipo)}" motivo="${xmlEsc(d.motivo)}"/>`).join('')}\n  </venda>`; }).join('\n')}\n</vendasPeplo>\n`;
}
function exportarVendasNf() {
  let per = 'hoje', soSem = false;
  const lista = () => { const [de, ate] = periodoNf(per); return db.vendas.filter((v) => v.data.slice(0, 10) >= de && v.data.slice(0, 10) <= ate && (!soSem || (!v.cancelada && !notaValida(notaDe(v)) && !v.nfOutro))).sort((a, b) => a.data.localeCompare(b.data)); };
  const resumo = () => { const l = lista(); return `${l.length} venda${l.length === 1 ? '' : 's'} · ${din(l.filter((v) => !v.cancelada).reduce((s, v) => s + v.total, 0))}`; };
  abrir(`<h2>Exportar vendas</h2><p class="mudo">Para lançar no seu emissor ou mandar ao contador. O CSV abre no Excel: uma linha por peça, com NCM, CFOP e CSOSN.</p>
    <div class="seg-l" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-top:12px">${PER_NF.map(([k, n]) => `<button type="button" data-per-nf="${k}" aria-pressed="${k === per}">${n}</button>`).join('')}</div>
    <label class="troca"><span>Só as vendas sem nota</span><input type="checkbox" id="nf-sosem"></label><div class="caixa-aviso ok" data-res>${resumo()}</div>
    <div class="acoes"><button type="button" class="bt" data-xml>XML simples</button><button type="button" class="bt cheio" data-csv>Baixar CSV</button></div>`, (j) => {
    const atual = () => { $('[data-res]', j).textContent = resumo(); };
    $$('[data-per-nf]', j).forEach((b) => { b.onclick = () => { per = b.dataset.perNf; $$('[data-per-nf]', j).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); atual(); }; });
    $('#nf-sosem', j).onchange = (e) => { soSem = e.target.checked; atual(); };
    const nome = (ext) => `vendas-peplo-${per}-${hoje()}.${ext}`;
    $('[data-csv]', j).onclick = () => { const l = lista(); if (!l.length) { toast('Nada para exportar neste período.', true); return; } baixar(nome('csv'), exportarCSV(l)); toast('CSV baixado.'); };
    $('[data-xml]', j).onclick = () => { const l = lista(); if (!l.length) { toast('Nada para exportar neste período.', true); return; } const [de, ate] = periodoNf(per); baixar(nome('xml'), exportarXML(l, de, ate), 'application/xml'); toast('XML baixado.'); };
  });
}
// dados fiscais de todas as peças de uma vez (já vem com a sugestão da categoria)
const CFOP_NF = [['5102', '5102 · revenda de mercadoria'], ['5101', '5101 · venda de produção própria (confecção)'], ['5405', '5405 · revenda com ICMS já pago antes (ST)']];
const CSOSN_NF = () => (simplesNf() ? [['102', '102 · Simples, sem crédito'], ['101', '101 · Simples, com crédito'], ['500', '500 · ICMS já cobrado antes (ST)'], ['103', '103 · isento no Simples']] : [['00', '00 · tributada integralmente'], ['60', '60 · ICMS cobrado antes (ST)'], ['40', '40 · isenta']]);
const ORIG_NF = [['0', '0 · Nacional'], ['1', '1 · Importada direto'], ['2', '2 · Importada no mercado interno']];
const opcoesNf = (l, v) => l.map(([k, n]) => `<option value="${k}" ${String(v) === k ? 'selected' : ''}>${n}</option>`).join('');
function folhaFiscalPecas() {
  const l = ativos();
  abrir(`<h2>Dados fiscais das peças</h2><div class="caixa-aviso atn">Já vem com a sugestão de NCM de cada categoria (moda, ${simplesNf() ? 'Simples Nacional' : 'regime normal'}). <b>Confirme com o seu contador</b> antes de emitir valendo.</div>
    <div style="margin-top:12px">${l.map((p) => { const f = fiscalPeca(p); return `<div data-fp="${p.id}" style="border-bottom:1px solid var(--linha-2);padding:10px 0"><b>${t(p.nome)}</b> <small class="mudo">${t(p.cat)}</small>${f.sug ? ' <span class="tag atn">sugestão</span>' : ''}
      <div class="campos" style="margin-top:8px"><label class="campo">NCM<input data-k="ncm" inputmode="numeric" maxlength="10" value="${t(f.ncm.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3'))}"></label><label class="campo">Origem<select data-k="orig">${opcoesNf(ORIG_NF, f.orig)}</select></label>
      <label class="campo">CFOP<select data-k="cfop">${opcoesNf(CFOP_NF, f.cfop)}</select></label><label class="campo">${simplesNf() ? 'CSOSN' : 'CST do ICMS'}<select data-k="csosn">${opcoesNf(CSOSN_NF(), f.csosn)}</select></label></div></div>`; }).join('') || '<p class="vazio"><b>Nenhuma peça</b>Cadastre as peças no Estoque primeiro.</p>'}</div>
    <div class="acoes"><button type="button" class="bt" data-nao>Voltar</button><button type="button" class="bt cheio" data-sim>Salvar</button></div>`, (j) => {
    $('[data-nao]', j).onclick = fechar;
    $('[data-sim]', j).onclick = () => {
      let ruim = '';
      $$('[data-fp]', j).forEach((c) => { const p = prod(c.dataset.fp), ncm = somenteNum($('[data-k="ncm"]', c).value); if (!p) return; if (ncm.length !== 8) { ruim = ruim || p.nome; return; }
        Object.assign(p, { ncm: ncm.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3'), cfop: $('[data-k="cfop"]', c).value, csosn: $('[data-k="csosn"]', c).value, orig: $('[data-k="orig"]', c).value }); });
      grava(); if (ruim) { toast(`O NCM tem 8 números: confira ${ruim}.`, true); return; } fechar(); mostra(); toast('Dados fiscais salvos.');
    };
  }, true);
}
// a seção nas Configurações (só a dona vê)
function secaoNota() {
  const m = modoNf(), f = db.fiscal, s = nfServidor || {}, p = f.provedor || 'brasilnfe', con = !!s.conectado && s.provedor === p;
  const semNcm = ativos().filter((x) => !somenteNum(x.ncm)).length;
  const modos = `<div class="seg-l" role="radiogroup" aria-label="Como você emite nota hoje?" style="margin:10px 0 4px">${MODOS_NF.map(([k, n, dsc]) => `<button type="button" role="radio" data-nf="modo" data-nfv="${k}" aria-pressed="${m === k}" aria-checked="${m === k}"><b>${n}${k === 'bluerose' ? ' <span class="tag ac">em breve</span>' : ''}</b><br><small class="mudo">${dsc}</small></button>`).join('')}</div>`;
  const loja = `<div class="campos" style="margin-top:12px">${[['razao', 'Razão social'], ['cnpj', 'CNPJ'], ['ie', 'Inscrição estadual'], ['rua', 'Rua'], ['numero', 'Número'], ['bairro', 'Bairro'], ['cidade', 'Cidade (SP)'], ['cep', 'CEP']].map(([k, n]) => `<label class="campo">${n}<input data-fiscal="${k}" value="${t(f[k] || '')}"${['cnpj', 'ie', 'cep', 'numero'].includes(k) ? ' inputmode="numeric"' : ''}></label>`).join('')}
    <label class="campo">Regime<select data-fiscal="regime"><option value="1" ${f.regime === '1' ? 'selected' : ''}>Simples Nacional</option><option value="4" ${f.regime === '4' ? 'selected' : ''}>MEI</option><option value="3" ${f.regime === '3' ? 'selected' : ''}>Regime normal</option></select></label></div>`;
  const botoes = `<div class="cfg-bts" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="bt pq" data-nf="pecas">${icb('etiqueta')}Dados fiscais das peças${semNcm ? ` (${semNcm} com sugestão)` : ''}</button><button type="button" class="bt pq" data-nf="exportar">${icb('folha')}Exportar vendas</button>${emiteNf() ? '<a class="bt pq" href="#notas">Notas emitidas</a>' : ''}</div>`;
  let corpo = '';
  if (m === 'api') corpo = `<div class="cartao-cab" style="margin-top:14px"><h2>A conta da sua loja no emissor</h2></div>
    <div class="seg-l" style="grid-template-columns:repeat(2,minmax(0,1fr))">${Object.entries(PROV_NF).map(([k, [n]]) => `<button type="button" data-nf="prov" data-nfv="${k}" aria-pressed="${p === k}">${n}</button>`).join('')}</div>
    <div class="caixa-aviso ${con ? 'ok' : 'atn'}">${con ? `Conectado à ${PROV_NF[p][0]}. O token está guardado cifrado no servidor e não aparece aqui.` : 'O certificado A1 e o CSC da SEFAZ ficam no painel do seu emissor. Aqui só vai o token.'}</div>
    <label class="campo">Token da sua conta ${PROV_NF[p][0]}<input id="nf-token" type="password" autocomplete="off" spellcheck="false" maxlength="300" placeholder="${con ? 'Guardado. Cole outro só para trocar' : 'Cole aqui o token'}"><small>${PROV_NF[p][1]} A nota sai pela sua conta e você paga direto ao seu emissor.</small></label>
    <p class="campo" style="margin:12px 0 6px">Ambiente</p><div class="seg-l" style="grid-template-columns:repeat(2,minmax(0,1fr))">${[['2', 'Teste (homologação)'], ['1', 'Valendo (produção)']].map(([k, n]) => `<button type="button" data-nf="amb" data-nfv="${k}" aria-pressed="${(f.ambiente || '2') === k}">${n}</button>`).join('')}</div>
    <label class="troca" style="margin-top:8px"><span><b>Deixar "Emitir NFC-e" marcado em toda venda</b><br><small class="mudo">Desmarque na sacola quando não for dar nota.</small></span><input type="checkbox" data-nf-auto ${f.auto !== false ? 'checked' : ''}></label>
    <p class="mudo" style="font-size:13px;margin:10px 0 0">Dados da loja (saem no DANFE):</p>${loja}
    <div class="cfg-bts" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="bt pq cheio" data-nf="conectar">${con ? 'Salvar' : 'Salvar e conectar'}</button>${con ? '<button type="button" class="bt pq" data-nf="desconectar">Desconectar</button>' : ''}</div>${botoes}
    <p class="mudo" style="font-size:13px;margin:12px 0 0">NFC-e de SP: cancela em até 30 minutos, com motivo. Depois disso, troca e devolução pedem a nota de devolução no seu emissor. Confira NCM, CFOP e CSOSN com o seu contador.</p>`;
  else if (m === 'outro') corpo = `<p class="mudo" style="margin:10px 0 0">No comprovante de cada venda aparece "Nota emitida em outro sistema" (com o número, se quiser). No fim do dia, exporte as vendas para o seu emissor ou para o contador.</p>${botoes}`;
  else if (m === 'bluerose') corpo = '<div class="caixa-aviso atn" style="margin-top:10px">Ainda não disponível. Enquanto isso, conecte a conta do seu emissor (Brasil NFe ou Focus NFe) ou marque as notas que você emite no seu PDV.</div>';
  else if (m === 'nao') corpo = '<p class="mudo" style="margin:10px 0 0">Tudo certo: nada de nota aparece nas vendas. Dá para mudar quando quiser.</p>';
  return `<section class="cartao cfg-sec" id="cfg-nota" style="margin-top:16px;min-width:0;overflow-wrap:anywhere"><div class="cartao-cab"><h2>${icb('notas')}Nota fiscal</h2></div><p class="mudo cfg-txt">Como você emite nota hoje? O Peplo usa o emissor que você já tem e não cobra nada a mais por nota.</p>${modos}${corpo}</section>`;
}
const acoesNf = {
  modo: (b) => { db.fiscal.modo = b.dataset.nfv; if (db.fiscal.auto === undefined) db.fiscal.auto = true; registra(`Nota fiscal: ${MODOS_NF.find((x) => x[0] === b.dataset.nfv)[1].toLowerCase()}`, 'fiscal'); grava(); mostra(); if (b.dataset.nfv === 'api' && !nfServidor) statusNf().then(() => { if ($('#cfg-nota')) mostra(); }); },
  prov: (b) => { db.fiscal.provedor = b.dataset.nfv; grava(); mostra(); },
  amb: (b) => { const k = b.dataset.nfv, ok = () => { db.fiscal.ambiente = k; grava(); mostra(); toast(k === '1' ? 'Emitindo valendo (produção).' : 'Ambiente de teste.'); if (emConta() && nfServidor && nfServidor.conectado && nfServidor.provedor === (db.fiscal.provedor || 'brasilnfe')) chamaNf({ acao: 'conectar', provedor: db.fiscal.provedor || 'brasilnfe', ambiente: k === '1' ? 'producao' : 'homologacao' }).then(statusNf); };
    if (k === '1') confirmar('Emitir valendo?', 'As notas passam a ter valor fiscal. Teste antes em homologação.', 'Sim, valendo', ok); else ok(); },
  conectar: async (b) => {
    const tk = ($('#nf-token') || {}).value || '', p = db.fiscal.provedor || 'brasilnfe', cnpj = somenteNum(db.fiscal.cnpj);
    if (cnpj && cnpj.length !== 14) { toast('O CNPJ tem 14 números.', true); return; }
    if (p === 'focus' && cnpj.length !== 14) { toast('A Focus NFe pede o CNPJ da loja.', true); return; }
    db.fiscal.provedor = p; grava();
    if (!emConta()) { if (!tk.trim() && !db.fiscal.conectadoDemo) { toast('Cole o token da sua conta.', true); return; } db.fiscal.conectadoDemo = true; grava(); nfServidor = { conectado: true, provedor: p, demo: true }; mostra(); toast('Demonstração: conectado (nada foi enviado).'); return; }
    b.disabled = true;
    const r = await chamaNf({ acao: 'conectar', provedor: p, token: tk.trim(), ambiente: db.fiscal.ambiente === '1' ? 'producao' : 'homologacao' });
    if ($('#nf-token')) $('#nf-token').value = '';
    if (!r || !r.ok) { b.disabled = false; toast((r && (r.erro || r.mensagem)) || 'Não deu para conectar.', true); return; }
    await statusNf(); mostra(); toast(`Conectado à ${PROV_NF[p][0]}.`);
  },
  desconectar: () => confirmar('Desconectar o emissor?', 'O token é apagado do servidor. As notas já emitidas continuam guardadas.', 'Desconectar', async () => { if (emConta()) await chamaNf({ acao: 'desconectar' }); else { db.fiscal.conectadoDemo = false; grava(); } await statusNf(); mostra(); toast('Desconectado.'); }, true),
  pecas: () => folhaFiscalPecas(),
  exportar: () => exportarVendasNf(),
  outro: (b) => { const v = db.vendas.find((x) => x.id === b.dataset.nfid); if (v) { fechar(); folhaOutro(v); } },
};
document.addEventListener('click', (e) => { const b = e.target.closest('[data-nf]'); if (b && acoesNf[b.dataset.nf]) acoesNf[b.dataset.nf](b); });
document.addEventListener('change', (e) => { if (e.target.matches('[data-nf-auto]')) { db.fiscal.auto = e.target.checked; grava(); toast(e.target.checked ? '"Emitir NFC-e" já vem marcado.' : '"Emitir NFC-e" vem desmarcado.'); } });

// ------------------------------------------------------------------ liquidação e promoções
const promoDe = (p, d = hoje()) => db.promos.filter((x) => x.de <= d && x.ate >= d && (x.cat === 'Todas' || x.cat === p.cat)).sort((a, b) => b.pct - a.pct)[0] || null;
const precoAtual = (p) => { const pr = promoDe(p); return pr ? Math.round(p.preco * (100 - pr.pct) / 100 / 10) * 10 : p.preco; };

// ------------------------------------------------------------------ comissão
const comissaoDe = (u, vs) => Math.round(vs.reduce((s, v) => s + v.total - (v.devol || []).reduce((a, d) => a + d.valor, 0), 0) * (u.comissao || 0) / 100);

// ------------------------------------------------------------------ cartão: taxa, previsão e conferência com o extrato
function vendasCartao(dias = 45) {
  const ini = somaDias(hoje(), -dias), tx = db.cfg.taxas, l = [];
  db.vendas.filter((v) => !v.cancelada && v.data.slice(0, 10) >= ini).forEach((v) => v.pag.forEach((x, i) => {
    if (x.f !== 'debito' && x.f !== 'credito') return;
    const pct = x.f === 'debito' ? tx.debito : (x.parc || 1) > 1 ? tx.parcelado : tx.credito, taxa = Math.round(x.v * pct / 100);
    l.push({ v, i, f: x.f, bruto: x.v, taxa, liquido: x.v - taxa, prev: somaDias(v.data.slice(0, 10), x.f === 'debito' ? tx.prazoDebito : tx.prazoCredito), ok: !!x.conferido });
  }));
  return l.sort((a, b) => b.v.data.localeCompare(a.v.data));
}
function conferirExtrato() {
  abrir(`<h2>Conferir com o extrato da maquininha</h2><p class="mudo">Baixe o extrato de vendas da maquininha (Stone, Cielo, PagBank, Mercado Pago, Rede…) em CSV e carregue aqui. O Peplo procura cada venda pelo dia e pelo valor e mostra o que bateu e o que ficou faltando.</p>
    <label class="bt" for="ex-arq">Escolher o extrato (CSV)</label><input type="file" id="ex-arq" accept=".csv,text/csv,text/plain" class="sr">
    <label class="campo" style="margin-top:12px">Ou cole as linhas (data;valor)<textarea id="ex-txt" rows="5" placeholder="data;valor&#10;07/11/2026;129,90"></textarea></label><div data-ex-res style="margin-top:10px"></div>
    <div class="acoes"><button type="button" class="bt cheio" data-ok>Conferir</button></div>`, (j) => {
    $('#ex-arq', j).addEventListener('change', (e) => { const f = e.target.files[0]; if (f) f.text().then((x) => { $('#ex-txt', j).value = x; }); });
    $('[data-ok]', j).onclick = () => {
      const linhas = lerPlanilha($('#ex-txt', j).value), cart = vendasCartao(60).filter((x) => !x.ok), bateu = [], sobrou = [];
      linhas.forEach((o) => { const dt = col(o, 'data', 'date'), v = lerDin(col(o, 'valor', 'bruto', 'amount')); const iso = /^\d{2}\/\d{2}\/\d{4}/.test(dt) ? dt.slice(0, 10).split('/').reverse().join('-') : dt.slice(0, 10);
        const k = cart.findIndex((x) => x.bruto === v && x.v.data.slice(0, 10) === iso); if (k >= 0) { const x = cart.splice(k, 1)[0]; x.v.pag[x.i].conferido = true; bateu.push(x); } else if (v) sobrou.push(`${dataBR(iso)} ${din(v)}`); });
      registra(`Extrato da maquininha conferido: ${bateu.length} vendas bateram`, 'caixa'); grava();
      $('[data-ex-res]', j).innerHTML = `<div class="caixa-aviso ok">${bateu.length} vendas bateram com o extrato (${din(bateu.reduce((s, x) => s + x.bruto, 0))}).</div>${cart.filter((x) => x.v.data.slice(0, 10) < hoje()).length ? `<div class="caixa-aviso atn">No Peplo e não no extrato: ${cart.filter((x) => x.v.data.slice(0, 10) < hoje()).slice(0, 8).map((x) => `venda nº ${x.v.n} ${dataBR(x.v.data)} ${din(x.bruto)}`).join(' · ')}</div>` : ''}${sobrou.length ? `<div class="caixa-aviso mal">No extrato e não no Peplo (venda sem registro?): ${sobrou.slice(0, 8).join(' · ')}</div>` : ''}`;
    };
  });
}

// ------------------------------------------------------------------ regras: caixa
function caixaAtual(auto = true) {
  if (!CX().aberto && auto) { CX().aberto = { id: uid('cx'), abertura: agora(), inicial: 0, movs: [] }; toast('Caixa aberto automaticamente com R$ 0,00. Ajuste o troco inicial em Caixa.'); }
  return CX().aberto;
}
function resumoCaixa(cx) {
  const vs = db.vendas.filter((v) => v.caixa === cx.id && !v.cancelada), pgs = db.pagamentos.filter((p) => p.caixa === cx.id);
  const por = (f) => vs.reduce((s, v) => s + v.pag.filter((x) => x.f === f).reduce((a, x) => a + x.v, 0), 0);
  const rec = (f) => pgs.filter((p) => p.f === f).reduce((s, p) => s + p.v + (p.encargo || 0), 0);
  const mv = (tp, f) => cx.movs.filter((m) => m.t === tp && (!f || (m.f || 'dinheiro') === f)).reduce((s, m) => s + m.v, 0);
  const r = { vendas: vs.length, dinheiro: por('dinheiro'), pix: por('pix'), debito: por('debito'), credito: por('credito'), fiado: por('fiado'), loja: por('loja'), recDinheiro: rec('dinheiro'), recPix: rec('pix'), recCartao: rec('debito') + rec('credito'), despesas: mv('despesa'), despDinheiro: mv('despesa', 'dinheiro'), retiradas: mv('retirada'), reforcos: mv('reforco'), reembolsos: mv('reembolso') };
  r.esperado = cx.inicial + r.dinheiro + r.recDinheiro + r.reforcos - r.despDinheiro - r.retiradas - r.reembolsos;
  return r;
}

// ------------------------------------------------------------------ período e números
function periodo(k, de, ate) {
  const h = hoje();
  if (k === 'hoje') return [h, h];
  if (k === '7') return [somaDias(h, -6), h];
  if (k === 'semana') { const d = new Date(`${h}T12:00`), ds = (d.getDay() + 6) % 7; return [somaDias(h, -ds), h]; }
  if (k === '30') return [somaDias(h, -29), h];
  if (k === 'mes') return [`${h.slice(0, 8)}01`, h];
  if (k === 'passado') { const ini = somaMes(`${h.slice(0, 8)}01`, -1); return [ini, somaDias(`${h.slice(0, 8)}01`, -1)]; }
  return [de || h, ate || h];
}
function numeros(ini, fim) {
  const dentro = (d) => d.slice(0, 10) >= ini && d.slice(0, 10) <= fim;
  const vs = db.vendas.filter((v) => !v.cancelada && dentro(v.data)), pgs = db.pagamentos.filter((p) => dentro(p.data));
  const bruto = vs.reduce((s, v) => s + v.sub, 0), desc = vs.reduce((s, v) => s + v.desc, 0);
  const devol = db.vendas.flatMap((v) => (v.devol || []).filter((d) => dentro(d.data))).reduce((s, d) => s + d.valor, 0);
  const cmv = vs.reduce((s, v) => s + v.itens.reduce((a, x) => a + x.custo * (x.qtd - (x.devolvido || 0)), 0), 0);
  const liquido = bruto - desc - devol;
  const recebidoVenda = vs.reduce((s, v) => s + v.pag.filter((x) => x.f !== 'fiado' && x.f !== 'loja').reduce((a, x) => a + x.v, 0), 0);
  const recebidoFiado = pgs.reduce((s, p) => s + p.v, 0);
  const fiadoVendido = vs.reduce((s, v) => s + v.pag.filter((x) => x.f === 'fiado').reduce((a, x) => a + x.v, 0), 0);
  const despesas = [CX().aberto, ...CX().historico].filter(Boolean).flatMap((c) => c.movs || []).filter((m) => m.t === 'despesa' && dentro(m.data)).reduce((s, m) => s + m.v, 0);
  return { vs, pgs, bruto, desc, devol, liquido, cmv, lucro: liquido - cmv, recebidoVenda, recebidoFiado, recebido: recebidoVenda + recebidoFiado, fiadoVendido, despesas, ticket: vs.length ? Math.round(liquido / vs.length) : 0 };
}
const totalAberto = () => db.clientes.reduce((s, c) => s + aberto(c.id), 0);
const totalVencido = () => db.clientes.reduce((s, c) => s + vencido(c.id), 0);
const devedoras = () => db.clientes.filter((c) => aberto(c.id) > 0);
const atrasadas = () => db.clientes.filter((c) => vencido(c.id) > 0).sort((a, b) => vencido(b.id) - vencido(a.id));
function avisos() {
  const l = [], at = atrasadas(), h = hoje();
  if (at.length) l.push({ ic: 'mal', txt: `${at.length} ${at.length === 1 ? 'cliente está' : 'clientes estão'} com parcelas vencidas (${din(totalVencido())})`, ir: '#fiado/vencidas' });
  const hj = db.parcelas.filter((p) => p.saldo > 0 && p.venc === h && p.status === 'aberta');
  if (hj.length) l.push({ ic: 'atn', txt: `${hj.length} ${hj.length === 1 ? 'parcela vence' : 'parcelas vencem'} hoje (${din(hj.reduce((s, p) => s + p.saldo, 0))})`, ir: '#fiado/hoje' });
  const bx = produtosBaixos(); if (bx.length) l.push({ ic: 'atn', txt: `${bx.length} ${bx.length === 1 ? 'peça está' : 'peças estão'} com estoque baixo em algum tamanho ou cor`, ir: '#estoque/baixo' });
  const pr = parados(); if (pr.length) l.push({ ic: 'ac', txt: `${pr.length} ${pr.length === 1 ? 'peça parada' : 'peças paradas'} há mais de ${db.cfg.parados[1]} dias (${din(pr.reduce((s, x) => s + totalPecas(x.p) * x.p.custo, 0))} de custo)`, ir: '#estoque/parados' });
  if (!CX().aberto) l.push({ ic: 'ac', txt: 'O caixa de hoje ainda não foi aberto', ir: '#caixa' });
  return l;
}

// ------------------------------------------------------------------ interface: utilidades
const ICO = {
  bolsa: '<path d="M6 8h12l-1 12H7z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>', moedas: '<ellipse cx="9" cy="7" rx="5" ry="2.5"/><path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7"/><path d="M10 15.5c.6 1.2 2.6 2 5 2 2.8 0 5-1.1 5-2.5v-4c0-1.4-2.2-2.5-5-2.5"/>',
  cartao: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>', alerta: '<path d="M12 3l9.5 17H2.5z"/><path d="M12 10v4M12 17.5v.5"/>', sino: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/>',
  gente: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M21 20a5 5 0 0 0-4-5"/>', cabide: '<path d="M12 7a2 2 0 1 1 2-2"/><path d="M12 7l-9 7h18z"/>', caixa: '<path d="M12 3l8 4v10l-8 4-8-4V7z"/>', lucro: '<path d="M4 18l6-6 4 4 6-8"/><path d="M15 8h5v5"/>',
  zap: '<path d="M4 20l1.4-4A8 8 0 1 1 8 18.6z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.6-2-1-1 .8c-1-.4-1.9-1.3-2.3-2.3l.8-1-1-2z"/>', seta: '<path d="M9 6l6 6-6 6"/>', ok: '<path d="M5 12l4.5 4.5L19 7"/>', mais: '<path d="M12 5v14M5 12h14"/>',
  recibo: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>', troca: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>', calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
};
const ico = (k) => `<svg viewBox="0 0 24 24">${ICO[k] || ''}</svg>`;
function toast(m, erro = false) {
  const el = document.createElement('div'); el.className = `toast${erro ? ' erro' : ''}`;
  el.innerHTML = `${erro ? ico('alerta') : ico('ok')}<span>${t(m)}</span>`; $('#toasts').append(el);
  setTimeout(() => { el.classList.add('sai'); setTimeout(() => el.remove(), 320); }, erro ? 4200 : 2600);
}
function abrir(html, ligar, larga = false) {
  const c = $('#camada'); c.hidden = false;
  c.innerHTML = `<div class="janela${larga ? ' larga' : ''}" role="dialog" aria-modal="true"><button type="button" class="fechar" aria-label="Fechar">×</button>${html}</div>`;
  const j = $('.janela', c); $('.fechar', j).onclick = fechar; c.onclick = (e) => { if (e.target === c) fechar(); };
  setTimeout(() => (j.querySelector('input:not([type=hidden]),select,textarea') || j).focus({ preventScroll: true }), 60);
  if (ligar) ligar(j);
  return j;
}
function fechar() { const c = $('#camada'); c.hidden = true; c.innerHTML = ''; document.body.classList.remove('imprime-janela'); }
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#camada').hidden) fechar(); });
function confirmar(titulo, texto, rot, acao, perigo = false) {
  abrir(`<h2>${t(titulo)}</h2><p class="mudo">${t(texto)}</p><div class="acoes"><button type="button" class="bt" data-nao>Voltar</button><button type="button" class="bt ${perigo ? 'perigo' : 'cheio'}" data-sim>${t(rot)}</button></div>`, (j) => {
    $('[data-nao]', j).onclick = fechar; $('[data-sim]', j).onclick = () => { fechar(); acao(); };
  });
}
// botões: onda no toque
addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.bt'); if (!b) return;
  const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height), o = document.createElement('span');
  o.className = 'onda'; o.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
  b.append(o); setTimeout(() => o.remove(), 600);
});
// números que sobem até o valor (só na primeira vez que a tela aparece)
function contar(raiz) {
  $$('[data-conta]', raiz).forEach((el) => {
    const fim = Number(el.dataset.conta), fmt = el.dataset.fmt === 'n' ? (v) => Math.round(v).toLocaleString('pt-BR') : din, t0 = performance.now(), dur = 700;
    const passo = (now) => { const k = Math.min(1, (now - t0) / dur), e = 1 - (1 - k) ** 3; el.textContent = fmt(fim * e); if (k < 1) requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
  });
}
function ajustaAbas(raiz = document) {
  $$('.abas', raiz).forEach((a) => {
    let ind = $('.ind', a); if (!ind) { ind = document.createElement('i'); ind.className = 'ind'; a.prepend(ind); }
    const s = $('[aria-selected="true"]', a); if (!s) return;
    ind.style.width = `${s.offsetWidth}px`; ind.style.transform = `translateX(${s.offsetLeft - 4}px)`;
  });
}
const ADD = {
  venda: ['ir-vender', 'Venda', 'abre o caixa de venda'], cliente: ['nova-cli', 'Cliente', 'nome, WhatsApp e limite do crediário'], caderno: ['fiado-caderno', 'Crediário do caderno', 'dívida antiga anotada à mão'],
  receber: ['receber-escolher', 'Pagamento recebido', 'baixa no crediário de uma cliente'], peca: ['nova-peca', 'Peça', 'com cores, tamanhos e quantidades'], compra: ['nova-compra', 'Chegada de mercadoria', 'entrada no estoque'],
  despesa: ['mov-despesa', 'Despesa', 'sai do caixa do dia'], retirada: ['mov-retirada', 'Retirada', 'dinheiro tirado da gaveta'], reforco: ['mov-reforco', 'Reforço de troco', 'dinheiro posto na gaveta'],
  cadernoTodo: ['passar-caderno', 'Passar o caderno inteiro', 'várias clientes de uma vez, em lista'],
  impCli: ['importar-clientes', 'Clientes de uma planilha', 'importa nome, WhatsApp e quanto devem'], impPeca: ['importar-pecas', 'Peças de uma planilha', 'importa cor, tamanho e quantidade'],
  forn: ['novo-forn', 'Fornecedor', 'nome e WhatsApp'], pedido: ['novo-pedido', 'Pedido de compra', 'o que você comprou e ainda vai chegar'], promo: ['nova-promo', 'Liquidação ou promoção', 'desconto por categoria com data'], usuario: ['novo-usuario', 'Pessoa da equipe', 'vendedora ou gerente'],
};
const addBt = (...k) => `<details class="add"><summary class="bt cheio">${ico('mais')}Adicionar</summary><div class="add-menu">${k.map((x) => ADD[x]).map(([a, n, sub]) => `<button type="button" data-acao="${a}">${ico('mais')}<span>${n}<small>${sub}</small></span></button>`).join('')}</div></details>`;
const abas = (lista, atual, attr) => `<div class="abas" role="tablist">${lista.map(([k, n]) => `<button type="button" role="tab" aria-selected="${k === atual}" ${attr}="${k}">${n}</button>`).join('')}</div>`;
function lerFoto(arq, lado = 256) {
  return new Promise((ok, erro) => {
    if (!/^image\//.test(arq.type)) return erro(new Error('Escolha uma imagem (JPG ou PNG).'));
    const img = new Image(), url = URL.createObjectURL(arq);
    img.onload = () => { const c = document.createElement('canvas'), m = Math.min(img.width, img.height); c.width = c.height = lado; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, lado, lado); x.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, lado, lado); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', 0.85)); };
    img.onerror = () => erro(new Error('Não consegui abrir essa imagem.')); img.src = url;
  });
}
const baixar = (nome, texto, tipo = 'text/csv') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: `${tipo};charset=utf-8` })); a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
const csv = (linhas) => '﻿' + linhas.map((l) => l.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
const listaClientes = () => `<datalist id="dl-cli">${db.clientes.map((c) => `<option value="${t(c.nome)}">`).join('')}</datalist>`;
const acharCli = (nome) => db.clientes.find((c) => sa(c.nome) === sa(nome));
function marca() {
  const L = db.loja, ini = String(L.nome || 'Loja').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  $('#loja-logo').innerHTML = L.logo ? `<img src="${t(L.logo)}" alt="">` : t(ini);
  $('#loja-nome').textContent = L.nome || 'Sua loja'; $('#loja-slogan').textContent = variasLojas() ? nomeLoja(lojaAtual()) : (L.slogan || '');
  document.documentElement.dataset.tema = db.tema || 'ameixa';
  const u = eu(), te = $('#topo-eu'); if (te) { te.innerHTML = `<span class="eu-foto">${u.foto ? `<img src="${t(u.foto)}" alt="">` : t(iniciais(u.nome))}</span><span class="eu-ola">Olá, ${t(u.nome.split(' ')[0])}</span>${icb('baixo')}`; te.title = `${u.nome} · meu perfil e mais opções`; }
  const at = atrasadas().length, bx = produtosBaixos().length, av = avisos().length;
  // o crediário é uma função entre muitas: os atrasos aparecem no sino, sem número vermelho no menu
  const nf = $('#n-fiado'); nf.hidden = true; nf.textContent = at;
  const ne = $('#n-estoque'); ne.hidden = !bx; ne.textContent = bx;
  const na = $('#n-avisos'); na.hidden = !av; na.textContent = av;
}


// ------------------------------------------------------------------ boutique (18/11/2026): ícones, etiqueta de título e os números novos
const ICB = {
  inicio: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
  vender: '<path d="M2.5 4h2.6l2.3 11h10.8l2.2-8H6.2"/><circle cx="9" cy="19.2" r="1.3"/><circle cx="17" cy="19.2" r="1.3"/>',
  vendas: '<path d="M4 8h15l-3.5-3.5"/><path d="M20 16H5l3.5 3.5"/>',
  estoque: '<path d="M12 3 20 7v10l-8 4-8-4V7z"/><path d="M4 7l8 4 8-4M12 11v10"/>',
  etiquetas: '<path d="M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l8.2 8.2a1.4 1.4 0 0 1 0 2l-6.6 6.6a1.4 1.4 0 0 1-2 0z"/><circle cx="8.3" cy="8.3" r="1.6"/>',
  clientes: '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0"/><path d="M15.5 4.8a3.3 3.3 0 0 1 0 6.4M17.6 14.2A6 6 0 0 1 21.2 20"/>',
  fiado: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 9.5h19M6 14.5h4"/>',
  compras: '<path d="M2.5 6.5h11v9h-11z"/><path d="M13.5 9.5h4l3 3.2v2.8h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  caixa: '<path d="M3.5 13h17v7h-17z"/><path d="M5.5 13 7 8h10l1.5 5"/><path d="M9 8V4.5h6V8M9 16.5h6"/>',
  relatorios: '<path d="M3 20.5h18M6 17V11M10.5 17V6M15 17v-7.5M19.5 17V4"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3.9a7.7 7.7 0 0 0-2.6-1.5L14.2 2.5h-4l-.4 2.5a7.7 7.7 0 0 0-2.6 1.5l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-.9a7.7 7.7 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.7 7.7 0 0 0 2.6-1.5l2.3.9 2-3.4z"/>',
  dono: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  perfil: '<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>',
  guia: '<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M9 7h7M9 11h5"/>',
  mais: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  notas: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  bolsa: '<path d="M5 8.5h14l-1 12H6z"/><path d="M8.5 8.5V7a3.5 3.5 0 0 1 7 0v1.5"/>',
  vestido: '<path d="M9 2.5v3.2L7.4 8.6 9.6 11 5 21h14l-4.6-10 2.2-2.4L15 5.7V2.5"/><path d="M9 5.7c1 .8 2 1.2 3 1.2s2-.4 3-1.2M9.6 11h4.8"/>',
  alvo: '<circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4.5"/><circle cx="11" cy="13" r="1.2"/><path d="M11 13l8.5-8.5M16.5 4.5h3v3"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  registradora: '<path d="M3.5 13.5h17V20h-17z"/><path d="M5.5 13.5l1.2-4.5h10.6l1.2 4.5"/><path d="M8.5 9V5h7v4"/><path d="M10 7h4M7 16.5h2M11 16.5h2M15 16.5h2"/>',
  entrada: '<path d="M12 3.5 19.5 7v9.5L12 20.5 4.5 16.5V7z"/><path d="M4.5 7 12 11l7.5-4M12 11v9.5"/>',
  etiqueta: '<path d="M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l8.2 8.2a1.4 1.4 0 0 1 0 2l-6.6 6.6a1.4 1.4 0 0 1-2 0z"/><circle cx="8.3" cy="8.3" r="1.6"/>',
  maisCirc: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v9M7.5 12h9"/>',
  trocas: '<path d="M4 8h15l-3.5-3.5"/><path d="M20 16H5l3.5 3.5"/>',
  pessoas: '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0"/><path d="M15.5 4.8a3.3 3.3 0 0 1 0 6.4M17.6 14.2A6 6 0 0 1 21.2 20"/>',
  cartao: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 9.5h19M6 14.5h4"/>',
  barrasV: '<path d="M3 20.5h18M6 18V10M10.5 18V6M15 18v-8M19.5 18V8"/>',
  moedas: '<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v4c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6"/><path d="M4.5 10v4c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-4"/><path d="M4.5 14v4c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-4"/>',
  cabide: '<path d="M12 8.5V7.6c0-.9.6-1.4 1.3-1.9A2 2 0 1 0 10 4.2"/><path d="M12 8.5 2.8 15.2c-.7.5-.4 1.6.5 1.6h17.4c.9 0 1.2-1.1.5-1.6z"/>',
  ampulheta: '<path d="M6.5 3h11M6.5 21h11"/><path d="M7.5 3c0 4.5 4.5 6 4.5 9s-4.5 4.5-4.5 9M16.5 3c0 4.5-4.5 6-4.5 9s4.5 4.5 4.5 9"/>',
  presente: '<rect x="3.5" y="9" width="17" height="4" rx="1"/><path d="M5 13v7.5h14V13M12 9v11.5"/><path d="M12 9c-1.5-3.5-5.5-4.5-5.5-2 0 1.5 2.5 2 5.5 2zM12 9c1.5-3.5 5.5-4.5 5.5-2 0 1.5-2.5 2-5.5 2z"/>',
  busca: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  codigo: '<path d="M3.5 5v14M6.5 5v14M9 5v14M12.5 5v14M14.5 5v14M17.5 5v14M20.5 5v14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  lixo: '<path d="M4 6.5h16M9.5 6.5V4h5v2.5M6 6.5l1 14h10l1-14M10 10.5v6M14 10.5v6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  coroa: '<path d="M3.5 8.5l4.5 4 4-7 4 7 4.5-4-1.5 10h-14z"/>',
  pix: '<path d="M12 2.8 21.2 12 12 21.2 2.8 12z"/><path d="M8.2 8.8 12 12.6l3.8-3.8M8.2 15.2 12 11.4l3.8 3.8"/>',
  dinheiro: '<rect x="2.5" y="6" width="19" height="12" rx="1.5"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5v5M18 9.5v5"/>',
  dividir: '<path d="M6 4v5.5c0 2 1 3 3 4.5l3 2M18 4v5.5c0 2-1 3-3 4.5l-3 2v4"/><path d="M4 6l2-2 2 2M16 6l2-2 2 2"/>',
  pontos: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
  folha: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-4 6-7 10-9"/>',
  caminhao: '<path d="M2.5 6.5h11v9h-11z"/><path d="M13.5 9.5h4l3 3.2v2.8h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  giro: '<path d="M20 11a8 8 0 0 0-14.5-4.5L3.5 9"/><path d="M3.5 4v5h5"/><path d="M4 13a8 8 0 0 0 14.5 4.5l2-2.5"/><path d="M20.5 20v-5h-5"/>',
  tendencia: '<path d="M3 20.5h18M5.5 18v-3.5M9.5 18v-6M13.5 18v-4.5M17.5 18v-8"/><path d="M4.5 11.5l5-4.5 4 3 6-6M15.5 4h4.5v4.5"/>',
  impressora: '<path d="M6.5 9V3.5h11V9"/><rect x="3" y="9" width="18" height="8" rx="1.5"/><path d="M6.5 14h11v6.5h-11z"/>',
  seta: '<path d="M9 6l6 6-6 6"/>', baixo: '<path d="M7 10l5 5 5-5"/>', zap: ICO.zap, ok: ICO.ok, recibo: ICO.recibo,
  sair: '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>', ajuda: '<path d="M4 20l1.4-4A8 8 0 1 1 8 18.6z"/>', instalar: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
};
const icb = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICB[k] || ''}</svg>`;
// título de cada tela dentro da etiqueta de tecido com borla
const cab = (k, nome, txt = '', acoes = '', forte = '') => `<div class="cab cab-etq"><h1 class="etq-titulo"><span class="etq-ic">${icb(k)}</span><span class="etq-nome">${nome}</span></h1>${txt || forte ? `<div class="cab-txt">${forte ? `<b>${forte}</b>` : ''}${txt ? `<p>${txt}</p>` : ''}</div>` : ''}${acoes ? `<div class="acoes">${acoes}</div>` : ''}</div>`;
const fotoPeca = (p, cls = '', cor = null) => `<span class="foto ${cls}">${fotoCor(p, cor) ? `<img src="${t(fotoCor(p, cor))}" alt="" loading="lazy">` : `<svg viewBox="0 0 24 24">${ICONE_CAT[p.cat] || ICONE_CAT.Acessórios}</svg>`}</span>`;
const fotoCli = (c, cls = '') => `<span class="foto-cli ${cls}">${c.foto ? `<img src="${t(c.foto)}" alt="" loading="lazy">` : t(iniciais(c.nome))}</span>`;
const ORDEM_CAT = ['Vestidos', 'Blusas', 'Calças', 'Saias', 'Casacos', 'Jaquetas', 'Acessórios', 'Camisetas', 'Shorts'];
const categorias = (l = ativos()) => [...new Set(l.map((p) => p.cat))].sort((a, b) => ((ORDEM_CAT.indexOf(a) + 1) || 99) - ((ORDEM_CAT.indexOf(b) + 1) || 99) || a.localeCompare(b));
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const mesAtual = () => hoje().slice(0, 7);
const nomeMes = (ym) => MESES[Number(ym.slice(5, 7)) - 1] || '';
const ultimoDia = (ym) => isoD(new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0));
const metaDe = (ym) => (db.metas && db.metas[ym] !== undefined ? db.metas[ym] : ym === mesAtual() ? db.meta || 0 : 0);
const vendidoNoMes = (ym) => { const fim = ultimoDia(ym); return numeros(`${ym}-01`, fim > hoje() ? hoje() : fim).liquido; };
const comprasCli = (cid, d = 365) => { const ini = somaDias(hoje(), -d); return db.vendas.filter((v) => v.cli === cid && !v.cancelada && v.data.slice(0, 10) >= ini).reduce((s, v) => s + v.total - (v.devol || []).reduce((a, x) => a + x.valor, 0), 0); };
const vip = (c) => !!c && comprasCli(c.id) >= (db.cfg.vipMin || 300000);
// próximo aniversário (29/02 vira 01/03 nos anos que não têm)
function proximoNiver(c) {
  if (!c || !/^\d{4}-\d{2}-\d{2}/.test(c.nasc || '')) return null;
  const h = hoje(), md = c.nasc.slice(5, 10), noAno = (a) => { const d = `${a}-${md}`; return isoD(new Date(`${d}T12:00`)) === d ? d : `${a}-03-01`; };
  let d = noAno(Number(h.slice(0, 4))); if (d < h) d = noAno(Number(h.slice(0, 4)) + 1);
  return { data: d, dias: dias(h, d) };
}
const aniversariantes = (n = 7) => db.clientes.map((c) => ({ c, ...proximoNiver(c) })).filter((x) => x.data && x.dias <= n).sort((a, b) => a.dias - b.dias || a.c.nome.localeCompare(b.c.nome));
const quandoNiver = (x) => `${Number(x.data.slice(8))} de ${MESES[Number(x.data.slice(5, 7)) - 1]} (${x.dias === 0 ? 'hoje' : x.dias === 1 ? 'amanhã' : `em ${x.dias} dias`})`;
const msgNiver = (c) => `Oi, ${c.nome.split(' ')[0]}! A ${db.loja.nome} deseja um feliz aniversário! Preparamos um presente para você: passe na loja nesta semana e ganhe um mimo especial na sua compra. Um beijo!`;
const clientesAtivos = (d = 90) => { const ini = somaDias(hoje(), -d); return new Set(db.vendas.filter((v) => v.cli && !v.cancelada && v.data.slice(0, 10) >= ini).map((v) => v.cli)).size; };
const trocasDe = (d = hoje()) => db.vendas.flatMap((v) => v.devol || []).filter((x) => String(x.data).slice(0, 10) === d);
const comissoesMes = () => { const n = numeros(`${mesAtual()}-01`, hoje()); return db.usuarios.reduce((s, u) => s + comissaoDe(u, n.vs.filter((v) => v.vend === u.id)), 0); };
const pecasNoEstoque = () => ativos().reduce((s, p) => s + totalPecas(p), 0);
const valorEstoque = (custo = pode('custo')) => ativos().reduce((s, p) => s + totalPecas(p) * (custo ? p.custo : p.preco), 0);
function maisVendidas(ini, fim) {
  const m = {}; numeros(ini, fim).vs.forEach((v) => v.itens.forEach((x) => { const q = x.qtd - (x.devolvido || 0); if (q > 0) m[x.p] = (m[x.p] || 0) + q; }));
  return Object.entries(m).map(([id, q]) => ({ p: prod(id), q })).filter((x) => x.p).sort((a, b) => b.q - a.q || a.p.nome.localeCompare(b.p.nome));
}
// giro do estoque: peças vendidas nos últimos 30 dias sobre as peças que estão na loja
const giroMes = () => { const ini = somaDias(hoje(), -30), vend = db.movs.filter((m) => m.tipo === 'venda' && String(m.data).slice(0, 10) >= ini && (m.loja || 'l1') === lojaAtual()).reduce((s, m) => s - m.q, 0), est = pecasNoEstoque(); return est ? vend / est : 0; };
const fmtN = (n, c = 1) => n.toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
const celular = () => matchMedia('(max-width: 860px)').matches;
// grade cor x tamanho: célula vermelha quando chega no mínimo, cinza quando zerou, traço quando a peça não tem o tamanho
function celulaQ(p, cor, tm, caixa = false) {
  const q = qtd(p, cor, tm), cls = !p.tam.includes(tm) ? 'sem' : q <= 0 ? 'zero' : q <= p.min ? 'baixo' : '', v = p.tam.includes(tm) ? q : '–';
  return caixa ? `<td class="${cls}"><span>${v}</span></td>` : `<td class="${cls}">${v}</td>`;
}

// ------------------------------------------------------------------ vender (18/11/2026): peça escolhida ao lado da vitrine e a sacola de papel
const dispVar = (p, cor, tm) => qtd(p, cor, tm) - noCarrinho(p.id, cor, tm);
function novaSel(p) { const c = p.cores.find((x) => p.tam.some((tm) => dispVar(p, x.n, tm) > 0)) || p.cores[0]; return { p: p.id, cor: c.n, tam: null, q: 1 }; }
function painelSel(sel) {
  if (!sel) return '<aside class="cartao escolha vazia"><p><b>Toque numa peça</b>Escolha a cor, o tamanho e a quantidade aqui. Com o leitor, passe o código e a peça vai direto para a sacola.</p></aside>';
  const p = prod(sel.p), pa = precoAtual(p), nTam = sel.tam ? dispVar(p, sel.cor, sel.tam) : 0, nCor = p.tam.reduce((s, tm) => s + Math.max(0, dispVar(p, sel.cor, tm)), 0);
  return `<aside class="cartao escolha" id="escolha" aria-label="Peça escolhida">
    <div class="esc-cab">${fotoPeca(p, 'esc-foto', sel.cor)}<div><b>${t(p.nome)}</b><small>${t(p.cod)}</small><strong>${pa < p.preco ? `<s>${din(p.preco)}</s> ` : ''}${din(pa)}</strong></div><button type="button" class="fechar-sel" data-acao="fecha-sel" aria-label="Fechar">${icb('x')}</button></div>
    <p class="esc-rot">Cor</p><div class="cores">${p.cores.map((c) => `<button type="button" data-sc="${t(c.n)}" aria-pressed="${c.n === sel.cor}" ${p.tam.some((tm) => dispVar(p, c.n, tm) > 0) ? '' : 'disabled'}><i style="background:${t(c.h)}"></i>${t(c.n)}${c.n === sel.cor ? `<span class="ok-c">${icb('check')}</span>` : ''}</button>`).join('')}</div>
    <p class="esc-rot">Tamanho</p><div class="tams">${p.tam.map((tm) => { const d = dispVar(p, sel.cor, tm); return `<button type="button" data-st="${t(tm)}" aria-pressed="${tm === sel.tam}" ${d > 0 ? '' : 'disabled'} title="${Math.max(0, d)} em estoque">${t(tm)}</button>`; }).join('')}</div>
    <div class="esc-pe"><div class="esc-est">${icb('estoque')}<span>${sel.tam ? `Estoque: ${nTam} ${nTam === 1 ? 'unidade' : 'unidades'}<small>(${t(sel.cor)} / ${t(sel.tam)})</small>` : `Escolha o tamanho<small>${nCor} em ${t(sel.cor)}</small>`}</span></div>
    <div class="esc-q"><p class="esc-rot">Quantidade</p><div class="qtd"><button type="button" data-sq="-1" aria-label="Menos">−</button><b>${sel.q}</b><button type="button" data-sq="1" aria-label="Mais">+</button></div></div></div>
    <button type="button" class="bt cheio largo por" data-acao="por-sel">${icb('maisCirc')}Adicionar à sacola</button>
  </aside>`;
}
function ajustaDesc() {
  const sub = estado.sacola.reduce((s, x) => s + x.preco * x.qtd, 0), v = Number(estado.descVal) || 0;
  estado.desc = estado.descModo === 'rs' ? Math.min(sub, Math.max(0, v)) : Math.round(sub * Math.min(100, Math.max(0, v)) / 100);
  return estado.desc;
}
const FORMAS_BT = [['pix', 'Pix', 'pix'], ['credito', 'Crédito', 'cartao'], ['debito', 'Débito', 'cartao'], ['dinheiro', 'Dinheiro', 'dinheiro'], ['fiado', 'Crediário', 'fiado']];
function sacolaHTML() {
  const sac = estado.sacola; ajustaDesc();
  const sub = sac.reduce((s, x) => s + x.preco * x.qtd, 0), total = Math.max(0, sub - estado.desc), nIt = sac.reduce((s, x) => s + x.qtd, 0);
  const c = acharCli(estado.vCli), pago = estado.pag.reduce((s, x) => s + (x.v || 0), 0), falta = total - pago;
  const fiadoV = estado.pag.filter((x) => x.f === 'fiado').reduce((s, x) => s + (x.v || 0), 0), pf = fiadoV ? podeFiado(c, fiadoV) : { ok: true };
  const cred = c ? c.credito || 0 : 0, formas = Object.entries(FORMAS).filter(([k]) => k !== 'loja' || cred > 0);
  const nv = c ? proximoNiver(c) : null, umaForma = !estado.dividir, f0 = estado.pag[0] || { f: 'pix' };
  const bts = [...FORMAS_BT, ...(cred > 0 ? [['loja', 'Crédito loja', 'presente']] : [])];
  return `<div class="sac-topo" aria-hidden="true"></div><div class="sac-corpo">
    <div class="sac-cab"><h2>${icb('bolsa')}Sacola de venda</h2>${sac.length ? `<button type="button" class="bt pq limpar" data-acao="esvaziar">${icb('lixo')}Limpar</button>` : ''}</div>
    ${sac.length ? `<ul class="sac-itens">${sac.map((x, i) => { const p = prod(x.p) || { cod: '', foto: '', cat: '' }; return `<li>${fotoPeca(p, 'mini', x.cor)}<span class="it-txt"><b>${t(x.nome)}</b><small>${t(p.cod)} · ${t(x.cor)} · ${t(x.tam)}</small></span><span class="q"><button type="button" data-q="${i}" data-d="-1" aria-label="Menos">−</button><b>${x.qtd}</b><button type="button" data-q="${i}" data-d="1" aria-label="Mais">+</button></span><b class="it-preco">${x.preco < (x.cheio || x.preco) ? `<s>${din(x.cheio * x.qtd)}</s>` : ''}${din(x.preco * x.qtd)}</b><button type="button" class="it-tira" data-rm="${i}" aria-label="Tirar ${t(x.nome)}">${icb('x')}</button></li>`; }).join('')}</ul>` : '<p class="sac-vazia"><b>Sacola vazia</b>Toque nas peças ou passe o leitor de código de barras.</p>'}
    <div class="sac-bloco"><p class="sac-rot">${icb('perfil')}Cliente</p>
      <div class="cli-linha"><label class="cli-campo"><span class="sr">Cliente</span><input id="v-cli" list="dl-cli" value="${t(estado.vCli)}" placeholder="Nome da cliente (opcional)" autocomplete="off">${listaClientes()}${estado.vCli ? `<button type="button" class="limpa" data-acao="limpa-cli" aria-label="Tirar a cliente">${icb('x')}</button>` : ''}</label><button type="button" class="bt-ic" data-acao="busca-cli" aria-label="Procurar cliente">${icb('busca')}</button></div>
      ${c ? `<p class="cli-info"><span>${nv ? `Aniversário: ${dataBR(nv.data).slice(0, 5)} · ` : ''}Compras: ${din(comprasCli(c.id))}${cred ? ` · Crédito na loja: ${din(cred)}` : ''}</span>${vip(c) ? `<b class="vip">${icb('coroa')}Cliente VIP</b>` : ''}</p>` : estado.vCli ? '<p class="cli-info"><span>Cliente nova: será cadastrada ao finalizar.</span></p>' : ''}</div>
    <div class="sac-bloco desc-linha"><p class="sac-rot">${icb('etiqueta')}Desconto</p><div class="seg" role="group" aria-label="Desconto em porcentagem ou em reais"><button type="button" data-dm="pct" aria-pressed="${estado.descModo !== 'rs'}">%</button><button type="button" data-dm="rs" aria-pressed="${estado.descModo === 'rs'}">R$</button></div><input id="v-desc" inputmode="decimal" value="${estado.descModo === 'rs' ? campoDin(estado.descVal) || '0,00' : estado.descVal ? String(estado.descVal).replace('.', ',') : '0,00'}" aria-label="Valor do desconto"></div>
    <div class="sac-tot"><div><span>Subtotal (${nIt} ${nIt === 1 ? 'item' : 'itens'})</span><span>${din(sub)}</span></div><div><span>Desconto</span><span>${estado.desc ? '−' : ''}${din(estado.desc)}</span></div><div class="grande"><b>Total da venda</b><b data-total>${din(total)}</b></div></div>
    <div class="sac-pag-cab"><p class="sac-rot">${icb('cartao')}Forma de pagamento</p><button type="button" class="link" data-acao="dividir2">${icb('dividir')}${umaForma ? 'Dividir pagamento' : 'Pagar numa forma só'}</button></div>
    ${umaForma ? `<div class="formas">${bts.map(([k, n, ic]) => `<button type="button" data-forma="${k}" aria-pressed="${f0.f === k}">${f0.f === k ? `<span class="ok-c">${icb('check')}</span>` : ''}${icb(ic)}<span>${n}</span></button>`).join('')}</div>
      ${f0.f === 'credito' ? `<label class="campo pag-extra">Parcelas no cartão<select data-pp="0">${Array.from({ length: 10 }, (_, k) => `<option value="${k + 1}" ${(f0.parc || 1) === k + 1 ? 'selected' : ''}>${k + 1}×${k ? ` de ${din(Math.round(total / (k + 1)))}` : ' (à vista)'}</option>`).join('')}</select></label>` : ''}
      ${f0.f === 'dinheiro' && sac.length ? `<label class="campo pag-extra">Recebido em dinheiro (para o troco)<input data-pv="0" inputmode="decimal" value="${campoDin(f0.v)}"></label>` : ''}`
    : `${estado.pag.map((x, i) => `<div class="pag-linha"><select data-pf="${i}" aria-label="Forma de pagamento">${formas.map(([k, n]) => `<option value="${k}" ${x.f === k ? 'selected' : ''}>${n}</option>`).join('')}</select><input data-pv="${i}" inputmode="decimal" value="${campoDin(x.v)}" placeholder="0,00" aria-label="Valor">${estado.pag.length > 1 ? `<button type="button" class="x" data-tira="${i}" aria-label="Tirar">×</button>` : '<span></span>'}</div>${x.f === 'credito' ? `<label class="campo pag-extra">Parcelas no cartão<select data-pp="${i}">${Array.from({ length: 10 }, (_, k) => `<option value="${k + 1}" ${(x.parc || 1) === k + 1 ? 'selected' : ''}>${k + 1}×${k ? '' : ' (à vista)'}</option>`).join('')}</select></label>` : ''}`).join('')}
      <div class="pag-links"><button type="button" class="link" data-acao="dividir">+ Outra forma</button>${falta !== 0 && sac.length ? `<button type="button" class="link" data-acao="completar">Pôr o que falta (${din(falta)})</button>` : ''}</div>`}
    ${fiadoV ? `<div class="campos cred-campos"><label class="campo">Parcelas<select id="p-n">${Array.from({ length: 12 }, (_, i) => `<option ${estado.parc.n === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label><label class="campo">A cada<select id="p-int"><option value="mes" ${estado.parc.int === 'mes' ? 'selected' : ''}>mês</option><option value="15" ${estado.parc.int === '15' ? 'selected' : ''}>15 dias</option><option value="7" ${estado.parc.int === '7' ? 'selected' : ''}>semana</option></select></label><label class="campo">1º vencimento<input id="p-prim" type="date" value="${estado.parc.prim}"></label></div>
      <p class="mudo cred-txt">${estado.parc.n}× de ${din(Math.floor(fiadoV / estado.parc.n))} no crediário${c ? ` · ${t(situacao(c).txt)} · disponível ${din(Math.max(0, (c.limite || 0) - aberto(c.id)))}` : ''}</p>` : ''}
    ${falta > 0 && sac.length ? `<div class="caixa-aviso atn">Faltam ${din(falta)} para fechar o total.</div>` : falta < 0 ? `<div class="caixa-aviso atn">Pagamento passa ${din(-falta)} do total${estado.pag.some((x) => x.f === 'dinheiro') ? ` (troco de ${din(-falta)})` : ''}.</div>` : ''}
    ${fiadoV && !pf.ok ? `<div class="caixa-aviso mal">${t(pf.motivo)}${pf.excecao ? (estado.excecao ? `<br><b>Exceção liberada:</b> ${t(estado.excecao)}` : ' <button type="button" class="link" data-acao="excecao">Liberar exceção</button>') : ''}</div>` : ''}
    ${emiteNf() ? `<div class="campos" style="margin-top:12px;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:end"><label class="troca" style="padding:0"><span>Emitir NFC-e</span><input type="checkbox" id="v-nota" ${(estado.nota ?? (db.fiscal.auto !== false)) ? 'checked' : ''}></label><label class="campo">CPF na nota (opcional)<input id="v-cpf" inputmode="numeric" value="${t(estado.cpf || '')}" placeholder="000.000.000-00"></label></div>` : ''}
    <button type="button" class="bt cheio largo finalizar" data-acao="finalizar" ${sac.length ? '' : 'disabled'}>${icb('check')}Finalizar venda (F12)</button>
  </div>`;
}

// ------------------------------------------------------------------ etiquetas: impressão de várias peças de uma vez
function imprimirEtiquetas(l) {
  if (!l.length) { toast('Escolha ao menos uma etiqueta.', true); return false; }
  const w = open('', '_blank'); if (!w) { toast('O navegador bloqueou a janela de impressão.', true); return false; }
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Etiquetas</title><style>body{font:11px Arial,sans-serif;margin:8mm}.g{display:grid;grid-template-columns:repeat(3,62mm);gap:3mm}.e{border:1px dashed #bbb;border-radius:2mm;padding:2.5mm;height:32mm;display:grid;grid-template-rows:auto auto 1fr auto;break-inside:avoid}.e b{font-size:12px}.e .pr{font-size:15px;font-weight:700}.barras-svg{width:100%;height:11mm}.c{font-size:9px;letter-spacing:.06em;text-align:center}</style><div class="g">${l.map(({ p, cor, tam }) => `<div class="e"><span>${t(db.loja.nome)}</span><b>${t(p.nome)} · ${t(cor)} · ${t(tam)}</b><span class="pr">${din(precoAtual(p))}</span><div>${barras(codVar(p, cor, tam))}<div class="c">${codVar(p, cor, tam)}</div></div></div>`).join('')}</div><script>setTimeout(()=>print(),300)<\/script>`);
  w.document.close(); toast(`${l.length} ${l.length === 1 ? 'etiqueta pronta' : 'etiquetas prontas'} para imprimir.`); return true;
}

// ------------------------------------------------------------------ estoque (18/11/2026): tabela com grade cor x tamanho, filtros e resumo
function estoqueTabela() {
  const f = estado.est, b = sa(estado.busca), bx = new Set(produtosBaixos()), prs = parados(), pr = new Set(prs.map((x) => x.p));
  const passa = (p, semCat) => (semCat || f.cat === 'Todas' || p.cat === f.cat) && (!f.col || p.colecao === f.col) && (!f.forn || p.forn === f.forn) && (!f.baixo || bx.has(p)) && (!f.parados || pr.has(p)) && (!b || sa(`${p.nome} ${p.cod} ${p.cat} ${p.colecao || ''}`).includes(b));
  const base = ativos().filter((p) => passa(p, true)), l = base.filter((p) => passa(p)), cats = categorias(ativos());
  const cols = [...new Set(ativos().map((p) => p.colecao).filter(Boolean))].sort(), forns = [...new Set(ativos().map((p) => p.forn).filter(Boolean))].sort();
  const pecas = pecasNoEstoque(), unPar = prs.reduce((s, x) => s + totalPecas(x.p), 0), giro = giroMes();
  const porCat = {}; ativos().forEach((p) => { porCat[p.cat] = (porCat[p.cat] || 0) + totalPecas(p); });
  const catOrd = Object.entries(porCat).sort((a, z) => z[1] - a[1]), top4 = catOrd.slice(0, 4), outros = catOrd.slice(4).reduce((s, x) => s + x[1], 0);
  const barrasCat = [...top4, ...(outros ? [['Outros', outros]] : [])], maxCat = Math.max(1, ...barrasCat.map((x) => x[1]));
  // dica automática: o que repor primeiro, ou o que liquidar
  const bxCat = {}; [...bx].forEach((p) => { bxCat[p.cat] = (bxCat[p.cat] || 0) + 1; });
  const bxTop = Object.entries(bxCat).sort((a, z) => z[1] - a[1]).slice(0, 2).map(([c]) => `“${t(c)}”`);
  const dica = bx.size ? `Reponha ${bx.size} ${bx.size === 1 ? 'peça' : 'peças'} com estoque baixo${bxTop.length ? ` em ${bxTop.join(' e ')}` : ''}.` : prs.length ? `${unPar} peças paradas há mais de ${db.cfg.parados[1]} dias: que tal uma liquidação dessas peças?` : 'Estoque em dia: nenhum tamanho no mínimo e nada parado.';
  let cabAnt = null;
  const linhas = l.map((p) => {
    const usa = cabAnt && p.tam.every((tm) => cabAnt.includes(tm)) ? cabAnt : p.tam, mostraCab = usa !== cabAnt; cabAnt = usa;
    return `<div class="est-linha" role="row" data-peca="${p.id}" tabindex="0">
      <div class="est-peca">${fotoPeca(p)}<div><b>${t(p.nome)}</b><small>${t(p.cod)}</small><span class="chips-p"><i class="chip-cat">${t(p.cat)}</i>${p.colecao ? `<i class="chip-col">${t(p.colecao)}</i>` : ''}</span></div></div>
      <div class="est-grade"><table class="gq">${mostraCab ? `<thead><tr><th></th>${usa.map((tm) => `<th>${t(tm)}</th>`).join('')}</tr></thead>` : ''}<tbody>${p.cores.map((c) => `<tr><th><button type="button" class="cor-ver" data-ver-cor="${t(c.n)}" data-ver-p="${p.id}" title="Ver a foto em ${t(c.n)}"><i style="background:${t(c.h)}"></i>${t(c.n)}</button></th>${usa.map((tm) => celulaQ(p, c.n, tm)).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="est-n custo">${pode('custo') ? din(p.custo) : '—'}</div>
      <div class="est-n preco">${precoAtual(p) < p.preco ? `<s>${din(p.preco)}</s>` : ''}<b>${din(precoAtual(p))}</b></div>
      <details class="mais-op"><summary aria-label="Mais opções da peça">${icb('pontos')}</summary><div class="op-menu"><button type="button" data-editar-peca="${p.id}">Editar peça</button><button type="button" data-etiquetas="${p.id}">Etiquetas</button><button type="button" data-repor="${p.id}">Entrada de estoque</button><button type="button" data-transf="${p.id}">Transferir entre lojas</button><button type="button" data-arquivar-p="${p.id}">Arquivar</button></div></details>
    </div>`;
  }).join('');
  const filtro = (ic, rot, attr, val, ops) => `<label class="filtro">${icb(ic)}<span><small>${rot}</small><select ${attr} aria-label="${rot}"><option value="">Todas</option>${ops.map((o) => `<option ${o === val ? 'selected' : ''}>${t(o)}</option>`).join('')}</select></span>${icb('baixo')}</label>`;
  return `${cab('estoque', 'Estoque', 'Controle completo do seu estoque por peça, cor e tamanho, em todas as lojas.', `<button type="button" class="bt cheio" data-acao="nova-peca">${icb('maisCirc')}Nova peça</button><button type="button" class="bt" data-acao="nova-compra">${icb('entrada')}Entrada de<br>estoque</button><a class="bt" href="#etiquetas">${icb('codigo')}Imprimir<br>etiquetas</a><button type="button" class="bt" data-acao="transferir">${icb('trocas')}Transferir<br>entre lojas</button>`)}
    <div class="est-filtros">
      <label class="filtro">${icb('vestido')}<span><small>Categoria</small><select data-ef="cat" aria-label="Categoria"><option value="Todas">Todas</option>${cats.map((c) => `<option ${c === f.cat ? 'selected' : ''}>${t(c)}</option>`).join('')}</select></span>${icb('baixo')}</label>
      ${filtro('folha', 'Coleção', 'data-ef="col"', f.col, cols).replace('<option value="">Todas</option>', '<option value="">Todas</option>')}
      ${filtro('caminhao', 'Fornecedor', 'data-ef="forn"', f.forn, forns).replace('>Todas<', '>Todos<')}
      <label class="filtro chk"><input type="checkbox" data-ef-b="baixo" ${f.baixo ? 'checked' : ''}><span><b>Estoque baixo</b><small>(${bx.size} ${bx.size === 1 ? 'item' : 'itens'})</small></span></label>
      <label class="filtro chk"><input type="checkbox" data-ef-b="parados" ${f.parados ? 'checked' : ''}><span><b>Peças paradas</b><small>(${prs.length} ${prs.length === 1 ? 'item' : 'itens'})</small></span></label>
      <label class="busca est-busca"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><span class="sr">Buscar peça</span><input id="est-busca" placeholder="Buscar peça (nome, referência ou código)" value="${t(estado.busca)}" autocomplete="off"></label>
    </div>
    <div class="est-corpo">
      <div class="est-esq">
        <div class="pilulas abas-cat" role="tablist">${[['Todas', `Todas as peças (${base.length})`], ...cats.map((c) => [c, `${t(c)} (${base.filter((p) => p.cat === c).length})`])].map(([c, n]) => `<button type="button" role="tab" data-ef-cat="${t(c)}" aria-selected="${c === f.cat}">${c !== 'Todas' ? `<svg viewBox="0 0 24 24">${ICONE_CAT[c] || ICONE_CAT.Acessórios}</svg>` : ''}${n}</button>`).join('')}</div>
        <div class="cartao est-tab" role="table"><div class="est-cab" role="row"><span>Peça / Referência</span><span>Cores e grade de tamanhos <small>(quantidade em estoque)</small></span><span class="est-n">Custo</span><span class="est-n">Preço</span><span></span></div>
          ${linhas || '<p class="vazio"><b>Nenhuma peça neste filtro</b>Tire um filtro ou cadastre a peça em “Nova peça”.</p>'}</div>
      </div>
      <aside class="est-lado">
        <section class="papel resumo"><i class="alfinete" aria-hidden="true"></i><h2>${icb('estoque')}Resumo do estoque</h2>
          <div class="valor-total">${icb('vestido')}<span><small>Valor total em estoque${pode('custo') ? '' : ' (preço de venda)'}</small><b data-conta="${valorEstoque()}">${din(valorEstoque())}</b></span></div>
          <div class="res-linha">${icb('estoque')}<span><small>Total de peças</small><b>${pecas.toLocaleString('pt-BR')} un.</b></span></div>
          <a class="res-linha rosa" href="#estoque/paradas">${icb('cabide')}<span><small>Peças paradas</small><b>${unPar.toLocaleString('pt-BR')} un.</b></span></a>
          <div class="res-linha">${icb('giro')}<span><small>Giro do estoque</small><b>${fmtN(giro)} ${giro >= 1.95 ? 'vezes' : 'vez'} / mês</b></span></div>
          <h3>Estoque por categoria</h3>
          ${barrasCat.map(([c, q], i) => `<div class="cat-barra${i < 2 ? ' forte' : ''}"><span>${c === 'Outros' ? '<i class="pontinhos">••</i>' : `<svg viewBox="0 0 24 24">${ICONE_CAT[c] || ICONE_CAT.Acessórios}</svg>`}${t(c)}</span><span class="trilho"><i style="width:${Math.round(q / maxCat * 78)}%"></i></span><b>${pecas ? Math.round(q / pecas * 100) : 0}%</b></div>`).join('')}
        </section>
        <section class="papel rosa dica"><i class="alfinete" aria-hidden="true"></i>${icb('tendencia')}<div><h2>Dica do Peplo</h2><p>${dica}</p></div></section>
        <section class="cartao mais-est"><h3>Mais do estoque</h3><a href="#estoque/promos">${icb('etiqueta')}Liquidação e promoções</a><a href="#estoque/paradas">${icb('ampulheta')}Peças paradas em detalhe</a><a href="#estoque/movs">${icb('trocas')}Movimentações</a>${variasLojas() ? `<a href="#estoque/lojas">${icb('estoque')}Todas as lojas</a>` : ''}<button type="button" data-acao="novo-pedido">${icb('caminhao')}Pedido de compra</button><button type="button" data-acao="importar-pecas">${icb('entrada')}Peças de uma planilha</button><button type="button" data-acao="exportar-estoque">${icb('recibo')}Baixar a planilha do estoque</button></section>
      </aside>
    </div>`;
}

// "Como usar" curto de cada tela: abre pelo botão ? do topo (na tela em que a pessoa está) e em Configurações, Guia
const COMO = {
  inicio: ['inicio', 'Início', ['O resumo do dia: vendas, caixa, crediário vencendo e aniversariantes.', 'Toque num número para abrir a lista dele.', 'A barra da meta mostra quanto falta para bater a meta do mês.']],
  vender: ['vender', 'Vender', ['Toque na peça ou passe o leitor de código de barras.', 'Escolha cor e tamanho, ponha a cliente e a forma de pagamento.', 'Dá para dividir o pagamento (parte no Pix, parte no crediário). O estoque baixa na hora.']],
  vendas: ['vendas', 'Vendas e trocas', ['Todas as vendas, da mais nova para a mais antiga.', 'Abra uma venda para mandar o comprovante ou fazer troca e devolução.', 'Na troca, a peça volta ao estoque e o valor vira crédito, abatimento ou dinheiro.']],
  estoque: ['estoque', 'Estoque', ['Cada peça com as cores, os tamanhos e quantas tem de cada.', '“Adicionar” cadastra peça nova ou importa de planilha.', 'As abas mostram peças paradas, promoções e as movimentações.']],
  etiquetas: ['etiquetas', 'Etiquetas', ['Escolha as peças e quantas etiquetas de cada.', 'Imprima em impressora comum ou de etiqueta, com código de barras.']],
  clientes: ['clientes', 'Clientes', ['Ficha de cada cliente: compras, crediário, aniversário e tamanho.', 'O selo VIP aparece para quem compra acima do valor de Configurações.']],
  fiado: ['fiado', 'Crediário', ['Quem deve, quanto e quando vence.', '“Receber” baixa o pagamento (pode ser parte) e gera o recibo.', '“Cobrar” abre o WhatsApp da cliente com a mensagem pronta.']],
  compras: ['compras', 'Compras', ['Pedidos aos fornecedores e a chegada da mercadoria.', 'Na chegada, digite quantas peças vieram de cada cor e tamanho: o estoque sobe sozinho.']],
  caixa: ['caixa', 'Caixa', ['Abra o caixa com o troco da gaveta (ou ele abre na primeira venda).', 'Lance despesas, retiradas e reforços.', 'No fim do dia, “Fechar caixa”: conte o dinheiro e veja se bateu.']],
  relatorios: ['relatorios', 'Relatórios', ['Escolha o período no alto.', 'Vendas, lucro, peças que mais saem, vendedoras e crediário.', 'Baixe em planilha para mandar ao contador.']],
  dono: ['dono', 'Painel do dono', ['O mês da loja num olhar e a projeção até o fim do mês.', 'Equipe: o que cada pessoa pode fazer e a comissão.']],
  config: ['config', 'Configurações', ['Perfil, cores, sua marca, guia, regras da loja e a sua assinatura.', 'Use os atalhos no alto para ir direto a uma seção.']],
};
const COMO_ORDEM = ['inicio', 'vender', 'vendas', 'estoque', 'etiquetas', 'clientes', 'fiado', 'compras', 'caixa', 'relatorios', 'dono', 'config'];
function comoUsar(k) {
  const c = COMO[k] || COMO.inicio;
  abrir(`<h2>Como usar: ${t(c[1])}</h2><ol class="como-lista">${c[2].map((x) => `<li>${t(x)}</li>`).join('')}</ol><div class="acoes"><a class="bt" href="#guia" data-fecha-como>Guia completo</a><a class="bt" href="#config/cfg-guia" data-fecha-como>Todas as telas</a><button type="button" class="bt cheio" data-fecha-como>Entendi</button></div>`, (j) => { $$('[data-fecha-como]', j).forEach((b) => b.addEventListener('click', fechar)); });
}
// Configurações: o bloco "Minha assinatura" (base/assinatura.js) fica montado entre um redesenho e outro (não recarrega nem perde o estado)
let blocoAss = null;
function posConfig(tela) {
  if (!nfServidor && emiteNf()) statusNf().then(() => { if ($('#cfg-nota')) mostra(); });
  const slot = $('#ass-slot', tela);
  if (slot && window.BRAssinatura) { if (blocoAss) slot.replaceWith(blocoAss); else blocoAss = BRAssinatura.montar(slot, { app: 'peplo', nome: 'Peplo', mensal: 59, pagina: 'peplo.html' }); }
  const em = $('#cfg-email', tela);
  if (em && window.BRAssinatura) BRAssinatura.conta().then((c) => { if (c.email) em.value = c.email; if (c.modo === 'conta') $$('[data-so-conta]', tela).forEach((b) => { b.hidden = false; }); });
}

// ------------------------------------------------------------------ telas
let estado = { fiadoFiltro: 'todos', estoqueAba: 'pecas', busca: '', relPer: 'mes', relDe: '', relAte: '', vendAba: 'vender', cliBusca: '', sacola: [], vCli: '', desc: 0, descModo: 'pct', descVal: 0, dividir: false, cat: 'Todas', sel: null, selFechada: false, metaMes: '', est: { cat: 'Todas', col: '', forn: '', baixo: false, parados: false }, pag: [{ f: 'pix', v: 0 }], parc: { n: 1, int: 'mes', prim: somaMes(hoje(), 1) }, excecao: null };
const GUIA = [
  ['Primeiros passos (10 minutos)', [
    ['Ponha a cara da sua loja', 'Em Configurações, “A marca da sua loja”: logo, nome, frase, WhatsApp, chave Pix e a cor do sistema. Tudo aparece no topo, nos recibos e nas cobranças.'],
    ['Defina as regras do crediário', 'Em Configurações, “Regras do crediário”: o limite da cliente nova, quando avisar que está perto do limite e com quantos dias de atraso o crediário bloqueia sozinho. Juros e multa ficam desligados, a não ser que você ligue.'],
    ['Passe o seu caderno', 'Em Crediário, “Adicionar” e “Passar o caderno inteiro”: uma linha por cliente, com nome, WhatsApp, quanto deve e quando vence. Se tiver planilha, use “Clientes de uma planilha”.'],
    ['Cadastre as peças', 'Em Estoque, “Adicionar” e “Peça”: nome, categoria, custo, preço, foto, tamanhos (atalhos de PP a G5 e de 34 a 56), cores e quantas tem de cada. Também dá para importar de planilha.'],
    ['Chame a equipe', 'No Painel do dono, “Adicionar” e “Pessoa da equipe”. Marque o que cada vendedora pode fazer (ver custo, dar desconto, mexer no caixa) e a comissão dela.'],
  ]],
  ['O dia a dia', [
    ['Abra o caixa', 'Em Caixa do dia, digite o troco que está na gaveta. Se esquecer, ele abre sozinho na primeira venda.'],
    ['Venda', 'Em Vender, toque na peça (ou passe o leitor de código de barras), escolha cor e tamanho, ponha a cliente e o pagamento. Dá para dividir: parte no Pix, parte no crediário. O estoque baixa na hora.'],
    ['Venda no crediário', 'Escolha “Crediário”, as parcelas e o 1º vencimento. Se a cliente estiver atrasada ou sem limite, o Peplo avisa; só a senha da dona libera a exceção.'],
    ['Receba e cobre', 'Em Crediário, “Receber” baixa o pagamento (pode ser só uma parte) e gera o recibo para mandar no WhatsApp. “Cobrar” abre o WhatsApp da cliente com a mensagem pronta.'],
    ['Troque ou devolva', 'Em Vendas e trocas, abra a venda e toque em “Troca ou devolução”: a peça volta ao estoque (ou vai como avaria) e o valor vira crédito, abate do crediário ou volta em dinheiro.'],
    ['Feche o caixa', 'No fim do dia, “Fechar caixa”: conte o dinheiro da gaveta e o Peplo mostra se bateu ou a diferença.'],
  ]],
  ['Estoque e compras', [
    ['Mercadoria chegou', 'Em Compras, “Adicionar” e “Chegada de mercadoria”: escolha a peça e digite quantas chegaram de cada cor e tamanho.'],
    ['Pedido de atacado', 'Na viagem de compra, faça o “Pedido de compra”. Quando chegar, toque em “Registrar chegada” (pode chegar em partes). O Peplo mostra a margem do lote.'],
    ['Etiquetas', 'Em Estoque, toque em “Etiquetas” na peça: saem com o preço e o código de barras de cada cor e tamanho.'],
    ['Liquidação', 'Em Estoque, aba Liquidação: escolha a categoria, o desconto e as datas. No período, o Vender já usa o preço com desconto. Use a aba Parados para escolher o que liquidar.'],
  ]],
  ['Números e controle', [
    ['Relatórios ao vivo', 'Em Relatórios: diário, semanal e mensal. Vendas, lucro bruto, dinheiro que entrou, crediário, inadimplência e o que mais vende.'],
    ['Painel do dono', 'Meta do mês com a projeção, vendas e comissão de cada vendedora, quem pode o quê e tudo o que aconteceu na loja.'],
    ['Duas lojas ou mais', 'Em Configurações, “Lojas”: cadastre a filial e escolha em cada aparelho por qual loja ele vende. Em Estoque, “Todas as lojas” mostra as lojas lado a lado, as vendas do mês de cada uma e transfere peças.'],
    ['Cartão', 'Em Configurações, ponha as taxas da sua maquininha. No Caixa do dia, “Conferir com o extrato” mostra o que bateu.'],
    ['Cópia de segurança', 'Com a assinatura, tudo fica na nuvem e aparece no celular e no computador. Em Configurações você também baixa uma cópia em arquivo quando quiser.'],
  ]],
];
const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };

const TELAS = {
  inicio() {
    const h = hoje(), n = numeros(h, h), pecasHoje = n.vs.reduce((s, v) => s + v.itens.reduce((a, x) => a + x.qtd - (x.devolvido || 0), 0), 0);
    const ym = estado.metaMes || mesAtual(), meta = metaDe(ym), feito = vendidoNoMes(ym), pct = meta ? Math.round(feito / meta * 100) : 0;
    const meses = [0, -1, -2, -3, -4, -5].map((k) => somaMes(`${mesAtual()}-01`, k).slice(0, 7));
    const iniMes = `${mesAtual()}-01`, nm = numeros(iniMes, h), top = maisVendidas(iniMes, h).slice(0, 3);
    // estoque baixo por grade: as combinações peça + cor com mais tamanhos no mínimo
    const bxCor = {}; baixos().forEach((x) => { const k = `${x.p.id}|${x.cor}`; (bxCor[k] ||= { p: x.p, cor: x.cor, n: 0 }).n++; });
    const ini30 = somaDias(h, -30), saiu = {}; db.movs.forEach((m) => { if (m.tipo === 'venda' && String(m.data).slice(0, 10) >= ini30) saiu[`${m.p}|${m.cor}`] = (saiu[`${m.p}|${m.cor}`] || 0) - m.q; });
    const todasBx = Object.values(bxCor).sort((a, b) => (saiu[`${b.p.id}|${b.cor}`] || 0) - (saiu[`${a.p.id}|${a.cor}`] || 0) || b.n - a.n || a.p.nome.localeCompare(b.p.nome));
    // a tabela usa a grade mais comum entre as primeiras (P a XG na maioria das lojas); as outras grades entram em linha própria
    const freq = {}; todasBx.slice(0, 6).forEach((x) => { const k = x.p.tam.join(','); freq[k] = (freq[k] || 0) + 1; });
    const tamsCab = todasBx.length ? (Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]).split(',') : ['P', 'M', 'G', 'GG', 'XG'];
    const linhasBx = [...todasBx.filter((x) => x.p.tam.every((tm) => tamsCab.includes(tm))), ...todasBx.filter((x) => !x.p.tam.every((tm) => tamsCab.includes(tm)))].slice(0, 3);
    const pr = parados(), unPar = pr.reduce((s, x) => s + totalPecas(x.p), 0), niver = aniversariantes(7);
    const ab = totalAberto(), trocas = trocasDe(h).length, est = valorEstoque();
    const kpi = (ic, rot, val, ir, cls = '', fmt = '') => `<a class="kpi6 ${cls}" href="${ir}">${icb(ic)}<span><small>${rot}</small><b ${fmt === 'txt' ? '' : `data-conta="${val}"`}>${fmt === 'txt' ? val : din(val)}</b></span></a>`;
    const corH = (p, cor) => (p.cores.find((c) => c.n === cor) || {}).h || '#ccc';
    return `<section class="ini-ola"><h1>${saudacao()}${db.loja.dono ? `, ${t(db.loja.dono)}` : ''}!</h1><i class="titulo-traco" aria-hidden="true"></i><p>Aqui está o movimento da sua loja hoje.</p></section>
      <div class="ini-hero cascata">
        <a class="etq etq-hoje" href="#vendas" aria-label="Vendas de hoje: ${din(n.liquido)}"><span class="etq-ic">${icb('bolsa')}</span><span class="etq-txt"><small>Vendas de hoje</small><b data-conta="${n.liquido}">${din(n.liquido)}</b><em>${n.vs.length} ${n.vs.length === 1 ? 'venda' : 'vendas'} <i>•</i> ${pecasHoje} ${pecasHoje === 1 ? 'peça' : 'peças'}</em></span><span class="etq-ic2">${icb('vestido')}</span></a>
        <section class="cartao meta-cartao"><div class="meta-cab"><span class="meta-ic">${icb('alvo')}</span><div><h2>Meta do mês</h2><b class="meta-v">${meta ? din(meta) : 'Sem meta'}</b></div>
          <label class="mes-sel">${icb('calendario')}<select data-meta-mes aria-label="Mês da meta">${meses.map((m) => `<option value="${m}" ${m === ym ? 'selected' : ''}>${nomeMes(m).replace(/^./, (x) => x.toUpperCase())}${m.slice(0, 4) !== mesAtual().slice(0, 4) ? ` ${m.slice(0, 4)}` : ''}</option>`).join('')}</select></label></div>
          <div class="meta-barra"><i style="width:${Math.min(100, pct)}%"></i></div>
          <div class="meta-pe"><span>${din(feito)} (${pct}%)</span><span>${!meta ? (dona() ? '<a class="link" href="#config/meta">Definir a meta</a>' : 'Meta não definida') : feito >= meta ? '<b class="ok-t">Meta batida!</b>' : `Falta ${din(meta - feito)}`}</span></div></section>
        <section class="papel atalhos"><i class="alfinete" aria-hidden="true"></i><h2>Atalhos rápidos</h2><div class="atalhos-l">
          <a href="#vender">${icb('registradora')}<span>Vender<br>(F2)</span></a><button type="button" data-acao="nova-compra">${icb('entrada')}<span>Entrada<br>de estoque</span></button><a href="#etiquetas">${icb('etiqueta')}<span>Emitir<br>etiquetas</span></a><button type="button" data-acao="novo-pedido">${icb('maisCirc')}<span>Nova<br>compra</span></button></div></section>
        <nav class="atalhos-cel" aria-label="Atalhos"><a href="#vender">${icb('vender')}<span>Vender<small>(F2)</small></span></a><a href="#estoque">${icb('estoque')}<span>Estoque</span></a><a href="#etiquetas">${icb('codigo')}<span>Etiquetas</span></a><a href="#clientes">${icb('clientes')}<span>Clientes</span></a></nav>
      </div>
      <div class="kpis6 cascata">
        ${kpi('estoque', 'Estoque', est, '#estoque')}
        ${kpi('trocas', 'Trocas hoje', `${trocas} ${trocas === 1 ? 'troca' : 'trocas'}`, '#vendas', '', 'txt')}
        ${kpi('pessoas', 'Clientes', `${clientesAtivos()} ativos`, '#clientes', '', 'txt')}
        ${kpi('cartao', 'Crediário', ab, '#fiado', 'rosa')}
        ${kpi('barrasV', 'Vendas no mês', nm.liquido, '#relatorios')}
        ${kpi('moedas', 'Comissões (mês)', comissoesMes(), dona() ? '#dono' : '#perfil')}
      </div>
      <div class="ini-grade cascata">
        <section class="cartao top-vendas"><div class="cartao-cab"><h2>${icb('cabide')}Peças mais vendidas <small>(mês)</small></h2><a class="link" href="#relatorios">Ver todas ›</a></div>
          ${top.length ? `<ol class="ranking">${top.map((x, i) => `<li><span class="rk-foto">${fotoPeca(x.p)}<b class="rk rk${i + 1}">${i + 1}º</b></span><span class="rk-txt"><b>${t(x.p.nome)}</b><small>${t(x.p.cod)} <i>•</i> ${x.q} un.</small><strong>${din(precoAtual(x.p))}</strong></span></li>`).join('')}</ol>` : '<p class="vazio"><b>Nenhuma venda no mês</b>As peças que mais saem aparecem aqui.</p>'}</section>
        <section class="cartao baixo-grade"><div class="cartao-cab"><h2>${icb('estoque')}Estoque baixo por grade</h2><a class="link" href="#estoque/baixo">Ver estoque ›</a></div>
          ${linhasBx.length ? `<table class="bxg"><thead><tr><th>Peça / Cor</th>${tamsCab.map((tm) => `<th>${t(tm)}</th>`).join('')}</tr></thead><tbody>${linhasBx.map((x) => { const igual = x.p.tam.every((tm) => tamsCab.includes(tm)); return `<tr data-peca="${x.p.id}" tabindex="0"><td><span class="bx-peca">${fotoPeca(x.p, '', x.cor)}<span><b>${t(x.p.nome)}</b><small>${t(x.p.cod)}</small><em><i style="background:${t(corH(x.p, x.cor))}"></i>${t(x.cor)}</em></span></span></td>${igual ? tamsCab.map((tm) => celulaQ(x.p, x.cor, tm, true)).join('') : `<td colspan="${tamsCab.length}"><span class="bx-outra">${x.p.tam.map((tm) => `<span><small>${t(tm)}</small>${celulaQ(x.p, x.cor, tm).replace(/<\/?td/g, (m) => m.replace('td', 'b'))}</span>`).join('')}</span></td>`}</tr>`; }).join('')}</tbody></table>` : '<p class="vazio"><b>Estoque em dia</b>Nenhum tamanho no mínimo.</p>'}</section>
        <div class="ini-lado">
          <section class="cartao parados-c"><div class="cartao-cab"><h2>${icb('ampulheta')}Peças paradas</h2><a class="link" href="#estoque/paradas">Ver todas ›</a></div>
            <a class="parados-faixa" href="#estoque/paradas"><i class="pecas-dobradas" aria-hidden="true"></i><span><b>${unPar} ${unPar === 1 ? 'peça' : 'peças'}</b><small>sem venda há mais de ${db.cfg.parados[1]} dias</small></span></a></section>
          <section class="cartao niver"><div class="cartao-cab"><h2>${icb('presente')}Aniversariantes <small>(7 dias)</small></h2><button type="button" class="link" data-acao="ver-niver">Ver todos ›</button></div>
            ${niver.length ? `<ul class="niver-l">${niver.slice(0, 2).map((x) => `<li>${fotoCli(x.c)}<a class="cresce" href="#cliente/${x.c.id}"><b>${t(x.c.nome)}</b><small>${quandoNiver(x)}</small></a>${x.c.tel ? `<a class="bt-presente" href="${zap(x.c.tel, msgNiver(x.c))}" target="_blank" rel="noopener" aria-label="Mandar parabéns para ${t(x.c.nome)} no WhatsApp" title="Mandar parabéns no WhatsApp">${icb('presente')}</a>` : ''}</li>`).join('')}</ul>` : '<p class="vazio"><b>Ninguém nesta semana</b>Ponha o aniversário no cadastro da cliente.</p>'}</section>
        </div>
      </div>`;
  },

  vender() {
    const busca = sa(estado.busca), cat = estado.cat || 'Todas', cats = categorias();
    const lista = ativos().filter((p) => (cat === 'Todas' || p.cat === cat) && (!busca || sa(`${p.nome} ${p.cod} ${p.cat} ${p.colecao || ''}`).includes(busca)));
    let sel = estado.sel && prod(estado.sel.p) && !prod(estado.sel.p).arquivado ? estado.sel : null;
    if (!sel && !estado.selFechada) { const p0 = lista.find((p) => totalPecas(p) > 0); if (p0) sel = estado.sel = novaSel(p0); }
    const qSac = estado.sacola.reduce((s, x) => s + x.qtd, 0);
    return `<div class="pdv2">
      <div class="pdv-esq">
        ${cab('vender', 'Vender', 'Venda rápida, troca e várias formas de pagamento.', '', `Caixa da ${t(db.loja.nome)}`)}
        <div class="pdv-busca"><label class="busca"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><span class="sr">Buscar peça</span><input id="pdv-busca" placeholder="${celular() ? 'Busque por nome, referência ou código' : 'Busque por nome, referência ou leia o código de barras'}" value="${t(estado.busca)}" autocomplete="off"></label><button type="button" class="bt-ic leitor" data-acao="leitor" aria-label="Ler código de barras" title="Leitor de código de barras">${icb('codigo')}</button><button type="button" class="bt cheio nova-peca" data-acao="nova-peca">${icb('maisCirc')}Nova peça (F8)</button></div>
        <div class="pilulas" role="tablist" aria-label="Categorias">${[['Todas', ''], ...cats.map((c) => [c, ICONE_CAT[c] || ICONE_CAT.Acessórios])].map(([c, ic]) => `<button type="button" role="tab" data-cat="${t(c)}" aria-selected="${c === cat}">${ic ? `<svg viewBox="0 0 24 24">${ic}</svg>` : ''}${t(c)}</button>`).join('')}</div>
        <div class="pdv-meio${sel ? ' com-sel' : ''}">
          <div class="vitrine cascata">${lista.map((p) => { const tot = totalPecas(p), pa = precoAtual(p); return `<button type="button" class="peca-c${sel && sel.p === p.id ? ' sel' : ''}" data-pick="${p.id}" ${tot ? '' : 'aria-disabled="true"'}>${fotoPeca(p, '', sel && sel.p === p.id ? sel.cor : null)}${tot ? '' : '<em class="esgotada">Esgotada</em>'}<b>${t(p.nome)}</b><small>${t(p.cod)}</small><strong>${pa < p.preco ? `<s>${din(p.preco)}</s>` : ''}${din(pa)}</strong></button>`; }).join('') || '<p class="vazio"><b>Nenhuma peça encontrada</b>Confira o nome ou cadastre a peça em Estoque.</p>'}</div>
          ${painelSel(sel)}
        </div>
      </div>
      <aside class="sacola2" id="sacola" aria-label="Sacola de venda">${sacolaHTML()}</aside>
      <a class="sacola-bt${qSac ? '' : ' vazia'}" href="#sacola">${icb('bolsa')}<span>Sacola (${qSac} ${qSac === 1 ? 'item' : 'itens'})</span><b>${din(totalSacola())}</b></a>
    </div>`;
  },

  sacola() {
    if (!celular()) return TELAS.vender();
    return `<div class="sacola-tela"><a class="link voltar" href="#vender">← Continuar vendendo</a><section class="sacola2" aria-label="Sacola de venda">${sacolaHTML()}</section></div>`;
  },

  etiquetas() {
    const b = sa(estado.etqBusca || ''), cat = estado.etqCat || 'Todas', marc = estado.etqSel || (estado.etqSel = {}), modo = estado.etqModo || 'estoque';
    const l = ativos().filter((p) => (cat === 'Todas' || p.cat === cat) && (!b || sa(`${p.nome} ${p.cod} ${p.cat}`).includes(b)));
    const nMarc = Object.keys(marc).filter((k) => marc[k] && prod(k)).length, ex = l[0] || ativos()[0];
    const qtdEt = (p) => (modo === 'estoque' ? totalPecas(p) : p.cores.length * p.tam.length);
    const totalEt = Object.keys(marc).filter((k) => marc[k] && prod(k)).reduce((s, k) => s + qtdEt(prod(k)), 0);
    return `${cab('etiquetas', 'Etiquetas', 'Preço e código de barras de cada cor e tamanho. No Vender, o leitor põe a peça certa na sacola.', `<button type="button" class="bt" data-acao="etq-todas">${nMarc && nMarc === l.length ? 'Desmarcar todas' : 'Marcar todas'}</button><button type="button" class="bt cheio" data-acao="etq-imprimir" ${nMarc ? '' : 'disabled'}>${icb('impressora')}Imprimir ${totalEt ? `${totalEt} ${totalEt === 1 ? 'etiqueta' : 'etiquetas'}` : 'marcadas'}</button>`)}
      <div class="etq-grade">
        <section class="cartao">
          <label class="busca" style="display:block;margin-bottom:12px"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><span class="sr">Buscar peça</span><input id="etq-busca" placeholder="Buscar peça (nome, referência ou código)" value="${t(estado.etqBusca || '')}" autocomplete="off"></label>
          <div class="pilulas pq">${['Todas', ...categorias()].map((c) => `<button type="button" data-etq-cat="${t(c)}" aria-selected="${c === cat}">${t(c)}</button>`).join('')}</div>
          <ul class="etq-l">${l.map((p) => `<li><label class="etq-marca"><input type="checkbox" data-etq-p="${p.id}" ${marc[p.id] ? 'checked' : ''} aria-label="Incluir ${t(p.nome)}"></label>${fotoPeca(p)}<span class="cresce"><b>${t(p.nome)}</b><small>${t(p.cod)} · ${totalPecas(p)} em estoque · ${p.cores.length} ${p.cores.length === 1 ? 'cor' : 'cores'} · ${p.tam.join(' ')}</small></span><strong>${din(precoAtual(p))}</strong><button type="button" class="bt pq" data-etiquetas="${p.id}">Escolher quantidades</button></li>`).join('') || '<li><p class="vazio"><b>Nenhuma peça</b>Confira a busca.</p></li>'}</ul>
        </section>
        <aside class="etq-lado">
          <section class="papel"><i class="alfinete" aria-hidden="true"></i><h2>Como sai a etiqueta</h2>
            ${ex ? `<div class="etq-modelo"><span>${t(db.loja.nome)}</span><b>${t(ex.nome)} · ${t(ex.cores[0].n)} · ${t(ex.tam[0])}</b><strong>${din(precoAtual(ex))}</strong>${barras(codVar(ex, ex.cores[0].n, ex.tam[0]), 40)}<small>${codVar(ex, ex.cores[0].n, ex.tam[0])}</small></div>` : ''}
            <p class="campo" style="margin:14px 0 6px">Quantas etiquetas por peça marcada</p>
            <div class="seg-l"><button type="button" data-etq-modo="estoque" aria-pressed="${modo === 'estoque'}">Uma por peça em estoque</button><button type="button" data-etq-modo="grade" aria-pressed="${modo === 'grade'}">Uma de cada cor e tamanho</button></div>
            <p class="mudo" style="font-size:13px;margin:10px 0 0">Folha A4 com 3 colunas (62 × 32 mm). Para escolher a quantidade de cada cor e tamanho, use “Escolher quantidades” na peça.</p></section>
        </aside>
      </div>`;
  },

  notas() {
    if (!emiteNf() && !db.notas.length) return `${cab('notas', `Notas fiscais`, `O Peplo emite a NFC-e pela conta do emissor que você já tem. Escolha em Configurações como a sua loja emite nota.`, `<a class="bt cheio" href="#config/cfg-nota">Ir para Configurações</a>`)}`;
    const l = db.notas.slice().reverse();
    return `${cab('notas', `Notas fiscais`, `NFC-e emitidas nas vendas. ${db.fiscal.ambiente === '1' ? 'Ambiente de produção.' : 'Ambiente de homologação (teste, sem valor fiscal).'} Cancela em até 30 minutos; depois, troca e devolução pedem a nota de devolução no seu emissor.`, `<button type="button" class="bt" data-nf="exportar">Exportar vendas</button><button type="button" class="bt" data-acao="xml-notas">Lista das notas</button><a class="bt cheio" href="#vender">${ico('mais')}Nova venda</a>`)}
      <section class="cartao"><div class="tabela-wrap"><table class="tabela cartoes"><thead><tr><th>Nº</th><th>Data</th><th>Venda</th><th>CPF</th><th class="n">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${l.map((n) => { const v = db.vendas.find((x) => x.id === n.venda) || {}; const st = n.status === 'autorizada' && n.ambiente !== '1' ? ['ac', n.demo ? 'Demonstração' : 'Teste (homologação)'] : ({ demonstracao: ['ac', 'Demonstração'], pendente: ['atn', 'Aguardando SEFAZ'], autorizada: ['ok', 'Autorizada'], cancelada: ['', 'Cancelada'], rejeitada: ['mal', 'Rejeitada'] }[n.status] || ['', n.status]); return `<tr><td>${n.numero || '—'}</td><td data-r="Data">${dataBR(n.data)} ${horaBR(n.data)}</td><td data-r="Venda">nº ${v.n || '—'}</td><td data-r="CPF">${n.cpf ? '•••' + n.cpf.slice(-4) : '—'}</td><td class="n">${din(n.valor)}</td><td><span class="tag ${st[0]}">${st[1]}</span></td><td><button type="button" class="bt pq" data-nota="${n.id}">Abrir</button></td></tr>`; }).join('') || '<tr><td colspan="7"><p class="vazio"><b>Nenhuma nota ainda</b>Na próxima venda, deixe marcado “Emitir NFC-e”.</p></td></tr>'}</tbody></table></div></section>`;
  },

  vendas() {
    const l = db.vendas.slice().sort((a, b) => b.data.localeCompare(a.data)).slice(0, 80);
    return `${cab('vendas', `Vendas e trocas`, `As últimas vendas. Toque numa venda para ver o comprovante, trocar ou devolver.`, `${nfAtivo() ? '<button type="button" class="bt" data-nf="exportar">Exportar para o contador</button>' : ''}${addBt('venda', 'cliente', 'caderno')}`)}
      <section class="cartao"><div class="tabela-wrap"><table class="tabela cartoes"><thead><tr><th>Nº</th><th>Data</th><th>Cliente</th><th>Peças</th><th>Pagamento</th><th class="n">Total</th><th></th></tr></thead><tbody>
      ${l.map((v) => `<tr><td data-r="Nº">${v.n}</td><td data-r="Data">${dataBR(v.data)} ${horaBR(v.data)}</td><td data-r="Cliente">${t(v.cli ? (cli(v.cli) || {}).nome : 'Sem cliente')}</td><td data-r="Peças">${v.itens.reduce((s, x) => s + x.qtd, 0)}</td><td data-r="Pagamento">${v.pag.map((x) => FORMAS[x.f]).join(' + ')}${v.devol && v.devol.length ? ' <span class="tag ac">troca/devolução</span>' : ''}${v.cancelada ? ' <span class="tag mal">cancelada</span>' : ''}${notaValida(notaDe(v)) ? ' <span class="tag ok">NFC-e</span>' : v.nfOutro ? ' <span class="tag">nota em outro sistema</span>' : ''}</td><td class="n">${din(v.total)}</td><td><button type="button" class="bt pq" data-venda="${v.id}">Abrir</button></td></tr>`).join('')}
      </tbody></table></div></section>`;
  },

  fiado(sub) {
    const f = sub || estado.fiadoFiltro, h = hoje();
    const recMes = numeros(`${h.slice(0, 8)}01`, h).recebidoFiado, ven = totalVencido();
    const prox7 = db.parcelas.filter((p) => p.saldo > 0 && p.status === 'aberta' && p.venc >= h && p.venc <= somaDias(h, 7)).reduce((s, p) => s + p.saldo, 0);
    const rec = recMes + ven ? Math.round(recMes / (recMes + ven) * 100) : 100;
    const filtros = [['todos', 'Todas'], ['emdia', 'Em dia'], ['hoje', 'Vencem logo'], ['vencidas', 'Vencidas'], ['bloq', 'Bloqueadas'], ['quitadas', 'Quitadas']];
    let l = db.clientes.filter((c) => parcelasDe(c.id).length);
    if (f === 'emdia') l = l.filter((c) => aberto(c.id) > 0 && !vencido(c.id));
    if (f === 'hoje') l = l.filter((c) => abertas(c.id).some((p) => p.venc >= h && p.venc <= somaDias(h, 7)));
    if (f === 'vencidas') l = l.filter((c) => vencido(c.id) > 0);
    if (f === 'bloq') l = l.filter((c) => situacao(c).k === 'bloq');
    if (f === 'quitadas') l = l.filter((c) => !aberto(c.id));
    if (f === 'todos') l = l.filter((c) => aberto(c.id) > 0);
    l.sort((a, b) => vencido(b.id) - vencido(a.id) || aberto(b.id) - aberto(a.id));
    return `${cab('fiado', `Crediário`, `Quem deve, quanto, desde quando. Cobre com um toque e receba em parte ou tudo.`, `<button type="button" class="bt" data-acao="exportar-fiado">Planilha</button>${addBt('cadernoTodo', 'caderno', 'receber', 'cliente', 'impCli')}`)}
      <div class="grade g4 kpis cascata" style="margin-bottom:18px">
        <div class="cartao kpi"><span class="kpi-ic">${ico('cartao')}</span><span><small>A receber</small><b data-conta="${totalAberto()}">${din(totalAberto())}</b><em>${devedoras().length} clientes</em></span></div>
        <div class="cartao kpi ${ven ? 'mal' : ''}"><span class="kpi-ic mal">${ico('alerta')}</span><span><small>Vencido</small><b data-conta="${ven}">${din(ven)}</b><em>${atrasadas().length} em atraso</em></span></div>
        <div class="cartao kpi"><span class="kpi-ic ouro">${ico('calendario')}</span><span><small>Vence em 7 dias</small><b data-conta="${prox7}">${din(prox7)}</b><em>lembre antes de vencer</em></span></div>
        <div class="cartao kpi ok"><span class="kpi-ic ok">${ico('moedas')}</span><span><small>Recebido no mês</small><b data-conta="${recMes}">${din(recMes)}</b><em>${recMes + ven ? `${rec}% recuperado` : 'nada vencido no mês'}</em></span></div>
      </div>
      ${abas(filtros, f, 'data-ff')}
      <section class="cartao">${l.length ? `<ul class="lista">${l.map((c) => { const s = situacao(c), ab = aberto(c.id), lim = c.limite || 0, pct = lim ? Math.min(100, Math.round(ab / lim * 100)) : 0; return `<li style="flex-wrap:wrap">
        <a class="cresce" href="#cliente/${c.id}" style="text-decoration:none;color:inherit;min-width:180px"><b>${t(c.nome)}</b><small>${din(ab)} em aberto${vencido(c.id) ? ` · <span style="color:var(--mal)">${din(vencido(c.id))} vencido</span>` : ''} · limite ${din(lim)}</small><span class="barra-lim ${s.tag}" style="margin-top:6px;max-width:260px"><i style="width:${pct}%"></i></span></a>
        <span class="tag ${s.tag}">${s.txt}</span>
        ${ab ? `<a class="bt pq zap" href="${zap(c.tel, msg(modeloCobranca(c), c))}" target="_blank" rel="noopener" data-cobra="${c.id}">${ico('zap')}Cobrar</a><button type="button" class="bt pq cheio" data-receber="${c.id}">Receber</button>` : ''}</li>`; }).join('')}</ul>` : '<p class="vazio"><b>Ninguém aqui</b>Nenhuma cliente neste filtro.</p>'}</section>`;
  },

  cliente(id) {
    const c = cli(id); if (!c) return '<p class="vazio"><b>Cliente não encontrada</b><a href="#clientes">Voltar</a></p>';
    const s = situacao(c), ab = aberto(c.id), disp = Math.max(0, (c.limite || 0) - ab), enc = encargos(c.id);
    const ps = parcelasDe(c.id).sort((a, b) => a.venc.localeCompare(b.venc)), vs = db.vendas.filter((v) => v.cli === c.id).sort((a, b) => b.data.localeCompare(a.data));
    const pgs = db.pagamentos.filter((p) => p.cli === c.id).sort((a, b) => b.data.localeCompare(a.data)), cbs = db.cobrancas.filter((x) => x.cli === c.id).sort((a, b) => b.data.localeCompare(a.data));
    const abertasL = ps.filter((p) => p.saldo > 0 && p.status === 'aberta'), hist = ps.filter((p) => !(p.saldo > 0 && p.status === 'aberta'));
    return `${cab('clientes', `${t(c.nome)}`, `${vip(c) ? `<b class="vip" style="margin:0 6px 0 0">${icb('coroa')}Cliente VIP</b>` : ''}${t(c.tel ? c.tel.replace(/^(\d{2})(\d{5})(\d+)$/, '($1) $2-$3') : 'Sem telefone')}${c.nasc ? ` · aniversário ${dataBR(c.nasc).slice(0, 5)}` : ''} · <span class="tag ${s.tag}">${s.txt}</span>`, `<a class="bt" href="#clientes">← Clientes</a>${ab ? `<a class="bt zap" href="${zap(c.tel, msg(modeloCobranca(c), c))}" target="_blank" rel="noopener" data-cobra="${c.id}">${ico('zap')}Cobrar</a><button type="button" class="bt cheio" data-receber="${c.id}">Receber pagamento</button>` : ''}<button type="button" class="bt" data-editar-cli="${c.id}">Editar</button>`)}
      <div class="grade g4 kpis cascata" style="margin-bottom:16px">
        <div class="cartao kpi"><span class="kpi-ic">${ico('cartao')}</span><span><small>Em aberto</small><b>${din(ab)}</b><em>${abertasL.length} ${abertasL.length === 1 ? 'parcela' : 'parcelas'}</em></span></div>
        <div class="cartao kpi ${vencido(c.id) ? 'mal' : ''}"><span class="kpi-ic mal">${ico('alerta')}</span><span><small>Vencido</small><b>${din(vencido(c.id))}</b><em>${maiorAtraso(c.id) ? `maior atraso ${maiorAtraso(c.id)} dias` : 'nada vencido'}</em></span></div>
        <div class="cartao kpi"><span class="kpi-ic ouro">${ico('moedas')}</span><span><small>Limite disponível</small><b>${din(disp)}</b><em>de ${din(c.limite || 0)}</em></span></div>
        <div class="cartao kpi"><span class="kpi-ic ok">${ico('bolsa')}</span><span><small>Comprou no total</small><b>${din(vs.reduce((a, v) => a + v.total, 0))}</b><em>${vs.length} compras${c.credito ? ` · crédito ${din(c.credito)}` : ''}</em></span></div>
      </div>
      ${enc ? `<div class="caixa-aviso atn">Com juros e multa do atraso (regra da loja ligada): ${din(enc)} a mais.</div>` : ''}
      <div class="grade g-21">
        <section class="cartao"><div class="cartao-cab"><h2>Parcelas em aberto</h2>${abertasL.length > 1 ? `<button type="button" class="bt pq" data-renegociar="${c.id}">${ico('troca')}Renegociar</button>` : ''}</div>
          ${abertasL.length ? `<div class="tabela-wrap"><table class="tabela cartoes"><thead><tr><th>Parcela</th><th>Venc.</th><th class="n">Valor</th><th class="n">Falta</th><th>Situação</th></tr></thead><tbody>${abertasL.map((p) => { const st = ROT_PARC[statusParc(p)]; return `<tr><td data-r="Parcela">${p.acordo ? 'Acordo ' : 'Venda '}${p.num}/${p.de}</td><td data-r="Vencimento">${dataBR(p.venc)}</td><td class="n" data-r="Valor">${din(p.valor)}</td><td class="n" data-r="Falta"><b>${din(p.saldo)}</b></td><td><span class="tag ${st[0]}">${st[1]}${statusParc(p) === 'vencida' ? ` · ${dias(p.venc)}d` : ''}</span></td></tr>`; }).join('')}</tbody></table></div>` : '<p class="vazio"><b>Nada em aberto</b>Conta quitada.</p>'}
          <div class="cartao-cab" style="margin-top:18px"><h2>Pagamentos</h2></div>
          ${pgs.length ? `<ul class="lista">${pgs.slice(0, 12).map((p) => `<li><span class="cresce"><b>${din(p.v)}${p.encargo ? ` + ${din(p.encargo)} de encargos` : ''}</b><small>${dataBR(p.data)} · ${FORMAS[p.f] || p.f}${p.obs ? ` · ${t(p.obs)}` : ''}</small></span><button type="button" class="bt pq" data-recibo="${p.id}">${ico('recibo')}Recibo</button></li>`).join('')}</ul>` : '<p class="mudo">Nenhum pagamento ainda.</p>'}
          ${hist.length ? `<details style="margin-top:12px"><summary class="link">Parcelas pagas, renegociadas e canceladas (${hist.length})</summary><ul class="lista">${hist.map((p) => `<li><span class="cresce"><b>${p.acordo ? 'Acordo' : 'Venda'} ${p.num}/${p.de} · ${din(p.valor)}</b><small>venc. ${dataBR(p.venc)}</small></span><span class="tag ${ROT_PARC[statusParc(p)][0]}">${ROT_PARC[statusParc(p)][1]}</span></li>`).join('')}</ul></details>` : ''}
        </section>
        <section class="cartao"><div class="cartao-cab"><h2>Limite e regras</h2></div>
          <div class="barra-lim ${s.tag}" style="margin-bottom:8px"><i style="width:${c.limite ? Math.min(100, Math.round(ab / c.limite * 100)) : 0}%"></i></div>
          <p class="mudo" style="font-size:13.5px;margin:0 0 12px">Usou ${din(ab)} de ${din(c.limite || 0)}. Venda à vista nunca é bloqueada.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="bt pq" data-limite="${c.id}">Alterar limite</button><button type="button" class="bt pq ${c.bloqueado ? '' : 'perigo'}" data-bloq="${c.id}">${c.bloqueado ? 'Desbloquear crediário' : 'Bloquear crediário'}</button><button type="button" class="bt pq" data-extrato="${c.id}">${ico('recibo')}Extrato</button></div>
          ${c.obs ? `<p style="margin:14px 0 0;font-size:14px"><b>Observação:</b> ${t(c.obs)}</p>` : ''}
          <div class="cartao-cab" style="margin-top:18px"><h2>Compras</h2></div>
          ${vs.length ? `<ul class="lista">${vs.slice(0, 8).map((v) => `<li><span class="cresce"><b>${din(v.total)} · ${v.itens.map((x) => t(x.nome)).join(', ')}</b><small>${dataBR(v.data)} · ${v.pag.map((x) => FORMAS[x.f]).join(' + ')}</small></span><button type="button" class="bt pq" data-venda="${v.id}">Abrir</button></li>`).join('')}</ul>` : '<p class="mudo">Nenhuma compra.</p>'}
          <div class="cartao-cab" style="margin-top:18px"><h2>Cobranças enviadas</h2></div>
          ${cbs.length ? `<ul class="lista">${cbs.slice(0, 6).map((x) => `<li><span class="cresce"><b>${t((MSGS[x.modelo] || {}).titulo || 'Mensagem')}</b><small>${dataBR(x.data)} ${horaBR(x.data)}</small></span></li>`).join('')}</ul>` : '<p class="mudo">Nenhuma cobrança registrada.</p>'}
        </section>
      </div>`;
  },

  clientes() {
    const b = sa(estado.cliBusca), l = db.clientes.filter((c) => !b || sa(`${c.nome} ${c.tel}`).includes(b)).sort((a, z) => a.nome.localeCompare(z.nome));
    return `${cab('clientes', `Clientes`, `${db.clientes.length} clientes · ${clientesAtivos()} compraram nos últimos 90 dias · ${aniversariantes(7).length} fazem aniversário nesta semana.`, `${addBt('cliente', 'cadernoTodo', 'caderno', 'impCli')}`)}
      <label class="busca" style="display:block;margin-bottom:14px"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span class="sr">Buscar cliente</span><input id="cli-busca" placeholder="Buscar por nome ou telefone" value="${t(estado.cliBusca)}" autocomplete="off"></label>
      <section class="cartao"><ul class="lista cli-lista">${l.map((c) => { const s = situacao(c), nv = proximoNiver(c), cp = comprasCli(c.id); return `<li>${fotoCli(c)}<a class="cresce" href="#cliente/${c.id}" style="text-decoration:none;color:inherit"><b>${t(c.nome)}</b><small>${t(c.tel ? c.tel.replace(/^(\d{2})(\d{5})(\d+)$/, '($1) $2-$3') : 'sem telefone')} · ${cp ? `compras em 12 meses ${din(cp)}` : 'sem compra recente'}${nv ? ` · aniversário ${dataBR(nv.data).slice(0, 5)}${nv.dias <= 7 ? ` (${nv.dias === 0 ? 'hoje' : nv.dias === 1 ? 'amanhã' : `em ${nv.dias} dias`})` : ''}` : ''}${aberto(c.id) ? ` · crediário ${din(aberto(c.id))}` : ''}</small></a>${vip(c) ? `<b class="vip">${icb('coroa')}VIP</b>` : ''}${s.k !== 'sem' && s.k !== 'emdia' ? `<span class="tag ${s.tag}">${s.txt}</span>` : ''}</li>`; }).join('') || '<p class="vazio"><b>Nenhuma cliente</b>Cadastre com o botão acima.</p>'}</ul></section>`;
  },

  estoque(sub) {
    if (!sub || sub === 'pecas' || sub === 'baixo' || sub === 'parados') { if (sub === 'baixo' || sub === 'parados') { estado.est = { cat: 'Todas', col: '', forn: '', baixo: sub === 'baixo', parados: sub === 'parados' }; history.replaceState(null, '', '#estoque'); } return estoqueTabela(); }
    const a = sub === 'paradas' ? 'parados' : sub;
    const tabs = [['parados', `Peças paradas (${parados().length})`], ['promos', 'Liquidação'], ['movs', 'Movimentações'], ...(variasLojas() ? [['lojas', 'Todas as lojas']] : [])];
    let corpo = '';
    if (a === 'pecas') {
      const b = sa(estado.busca), l = ativos().filter((p) => !b || sa(`${p.nome} ${p.cod} ${p.cat}`).includes(b));
      corpo = `<label class="busca" style="display:block;margin-bottom:14px"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span class="sr">Buscar peça</span><input id="est-busca" placeholder="Buscar peça" value="${t(estado.busca)}" autocomplete="off"></label>
        <div class="produtos cascata">${l.map((p) => `<article class="cartao prod" data-peca="${p.id}" tabindex="0"><div class="prod-topo">${iconePeca(p)}<div><b>${t(p.nome)}</b><small>${t(p.cod)} · ${t(p.cat)}</small></div></div>${grade(p)}${variasLojas() ? `<p class="mudo" style="font-size:12.5px;margin:6px 0 0">${db.lojas.map((l) => `${t(l.nome)}: <b>${totalPecas(p, l.id)}</b>`).join(' · ')} <button type="button" class="link" data-transf="${p.id}">Transferir</button></p>` : ''}<div class="prod-rodape"><span>${totalPecas(p)} peças${pode('custo') ? ` · custo ${din(p.custo)}` : ''}</span><span style="display:flex;gap:8px;align-items:center"><button type="button" class="bt pq" data-etiquetas="${p.id}">Etiquetas</button><b>${din(precoAtual(p))}</b></span></div></article>`).join('') || '<p class="vazio"><b>Nenhuma peça</b>Cadastre a primeira com “Nova peça”.</p>'}</div>`;
    }
    if (a === 'baixo') {
      const ps = produtosBaixos();
      corpo = ps.length ? `<div class="produtos cascata">${ps.map((p) => `<article class="cartao prod" data-peca="${p.id}" tabindex="0"><div class="prod-topo">${iconePeca(p)}<div><b>${t(p.nome)}</b><small>mínimo ${p.min} por cor e tamanho · ${baixos().filter((x) => x.p === p).length} faltando</small></div></div>${grade(p)}<button type="button" class="bt pq" data-repor="${p.id}">Registrar chegada</button></article>`).join('')}</div>` : '<section class="cartao"><p class="vazio"><b>Nada abaixo do mínimo</b>Quando um tamanho ou cor chegar no mínimo, aparece aqui.</p></section>';
    }
    if (a === 'parados') {
      const pr = ativos().filter((p) => totalPecas(p) > 0).map((p) => ({ p, ...situacaoParada(p) })).filter((x) => x.dias > db.cfg.parados[0]).sort((x, y) => y.dias - x.dias);
      const preso = pr.filter((x) => x.dias > db.cfg.parados[2]).reduce((s, x) => s + totalPecas(x.p) * x.p.custo, 0);
      corpo = `${preso ? `<div class="caixa-aviso mal" style="margin-bottom:14px">Você tem <b>${din(preso)}</b> em mercadoria sem vender há mais de ${db.cfg.parados[2]} dias. Que tal uma vitrine, uma promoção ou oferecer às clientes que compram essa categoria?</div>` : ''}
        <section class="cartao"><div class="tabela-wrap"><table class="tabela cartoes"><thead><tr><th>Peça</th><th>Situação</th><th class="n">Peças</th><th>Última venda</th><th class="n">Dinheiro parado</th><th class="n">Se vender tudo</th></tr></thead><tbody>${pr.map((x) => `<tr><td><b>${t(x.p.nome)}</b><br><small class="mudo">${t(x.p.cod)}</small></td><td data-r="Situação"><span class="tag ${x.tag}">${x.nivel} · ${x.dias} dias</span></td><td class="n" data-r="Peças">${totalPecas(x.p)}</td><td data-r="Última venda">${x.ultima ? dataBR(x.ultima) : 'nunca vendeu'}</td><td class="n" data-r="Custo parado">${din(totalPecas(x.p) * x.p.custo)}</td><td class="n" data-r="Venda possível">${din(totalPecas(x.p) * x.p.preco)}</td></tr>`).join('') || '<tr><td colspan="6"><p class="vazio"><b>Nada parado</b>Tudo vendeu recentemente.</p></td></tr>'}</tbody></table></div>
        <p class="mudo" style="font-size:13px;margin:10px 0 0">Faixas: até ${db.cfg.parados[0]} dias normal · até ${db.cfg.parados[1]} atenção · até ${db.cfg.parados[2]} parada · depois encalhada (mude em Configurações).</p></section>`;
    }
    if (a === 'promos') {
      const h = hoje();
      corpo = `<section class="cartao"><div class="cartao-cab"><h2>Liquidações e promoções</h2><button type="button" class="bt pq cheio" data-acao="nova-promo">${ico('mais')}Nova</button></div>${db.promos.length ? `<ul class="lista">${db.promos.slice().reverse().map((x) => `<li><span class="cresce"><b>${t(x.nome)} · ${x.pct}% em ${t(x.cat === 'Todas' ? 'toda a loja' : x.cat)}</b><small>${dataBR(x.de)} a ${dataBR(x.ate)}</small></span><span class="tag ${x.de <= h && x.ate >= h ? 'ok' : x.de > h ? 'ac' : ''}">${x.de <= h && x.ate >= h ? 'Valendo agora' : x.de > h ? 'Programada' : 'Encerrada'}</span><button type="button" class="bt pq perigo" data-tira-promo="${x.id}">Tirar</button></li>`).join('')}</ul>` : '<p class="vazio"><b>Nenhuma promoção</b>Crie a liquidação com a categoria, o desconto e as datas.</p>'}
        <p class="mudo" style="font-size:13px;margin:10px 0 0">Dica: use “Parados” para escolher o que entra na liquidação.</p></section>`;
    }
    if (a === 'lojas' && variasLojas()) {
      const ini = `${hoje().slice(0, 7)}-01`, vm = db.vendas.filter((v) => !v.cancelada && v.data.slice(0, 10) >= ini);
      const b = sa(estado.busca), l = ativos().filter((p) => !b || sa(`${p.nome} ${p.cod} ${p.cat}`).includes(b));
      corpo = `<div class="grade g${Math.min(4, db.lojas.length)} kpis cascata" style="margin-bottom:16px">${db.lojas.map((lj) => { const vs = vm.filter((v) => (v.loja || 'l1') === lj.id); return `<div class="kpi"><span><small>${t(lj.nome)}${lj.id === lojaAtual() ? ' · este aparelho' : ''}</small><b>${din(vs.reduce((s, v) => s + v.total, 0))}</b><em>${vs.length} vendas no mês · ${ativos().reduce((s, p) => s + totalPecas(p, lj.id), 0)} peças</em></span></div>`; }).join('')}</div>
        <label class="busca" style="display:block;margin-bottom:14px"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span class="sr">Buscar peça</span><input id="est-busca" placeholder="Buscar peça" value="${t(estado.busca)}" autocomplete="off"></label>
        <section class="cartao"><div class="tabela-wrap"><table class="tabela cartoes"><thead><tr><th>Peça</th>${db.lojas.map((lj) => `<th class="n">${t(lj.nome)}</th>`).join('')}<th class="n">Total</th><th></th></tr></thead><tbody>${l.map((p) => `<tr><td><b>${t(p.nome)}</b><br><small class="mudo">${t(p.cod)}</small></td>${db.lojas.map((lj) => { const q = totalPecas(p, lj.id); return `<td class="n" data-r="${t(lj.nome)}"><span class="${q ? '' : 'tag mal'}">${q}</span></td>`; }).join('')}<td class="n" data-r="Total"><b>${totalRede(p)}</b></td><td><button type="button" class="bt pq" data-transf="${p.id}">Ver e transferir</button></td></tr>`).join('') || `<tr><td colspan="${db.lojas.length + 3}"><p class="vazio"><b>Nenhuma peça</b>Cadastre a primeira em “Peças”.</p></td></tr>`}</tbody></table></div>
        <p class="mudo" style="font-size:13px;margin:10px 0 0">Cada loja vende do próprio estoque. A transferência tira de uma e põe na outra, e fica nas Movimentações.</p></section>`;
    }
    if (a === 'movs') {
      const TIPO = { venda: ['', 'Venda'], entrada: ['ok', 'Entrada'], ajuste: ['atn', 'Ajuste'], devolucao: ['ac', 'Devolução'], avaria: ['mal', 'Avaria'], troca: ['ac', 'Troca'], transf: ['ac', 'Transferência'] };
      const l = db.movs.slice().sort((x, y) => y.data.localeCompare(x.data)).slice(0, 120);
      corpo = `<section class="cartao"><div class="tabela-wrap"><table class="tabela cartoes"><thead><tr><th>Data</th><th>Peça</th><th>Cor · tamanho</th><th>Tipo</th><th class="n">Qtd.</th><th>Motivo</th></tr></thead><tbody>${l.map((m) => { const p = prod(m.p) || { nome: '?' }, tp = TIPO[m.tipo] || ['', m.tipo]; return `<tr><td data-r="Data">${dataBR(m.data)} ${horaBR(m.data)}</td><td><b>${t(p.nome)}</b></td><td data-r="Variação">${t(m.cor)} · ${t(m.tam)}</td><td><span class="tag ${tp[0]}">${tp[1]}</span></td><td class="n" data-r="Quantidade">${m.q > 0 ? '+' : ''}${m.q}</td><td data-r="Motivo">${variasLojas() ? `<b>${t(nomeLoja(m.loja || 'l1'))}</b> · ` : ''}${t(m.motivo || m.ref || '')}</td></tr>`; }).join('')}</tbody></table></div></section>`;
    }
    const NOMES_EXTRA = { parados: 'Peças paradas', promos: 'Liquidação e promoções', movs: 'Movimentações', lojas: 'Todas as lojas' };
    return `${cab('estoque', 'Estoque', `${NOMES_EXTRA[a] || ''} · ${pecasNoEstoque().toLocaleString('pt-BR')} peças na loja.`, `<a class="bt" href="#estoque">← Voltar à tabela</a><button type="button" class="bt" data-acao="exportar-estoque">Planilha</button>${addBt('peca', 'compra', 'pedido', 'promo', 'impPeca')}`)}
      ${abas(tabs, a, 'data-ea')}${corpo}`;
  },

  compras(sub) {
    const aba = sub || estado.comprasAba || 'pedidos';
    const tabs = [['pedidos', `Pedidos em aberto (${db.pedidos.filter((p) => p.status !== 'recebido').length})`], ['chegadas', 'Chegadas'], ['abc', 'Fornecedores · curva ABC']];
    let corpo = '';
    if (aba === 'pedidos') {
      const l = db.pedidos.slice().sort((x, y) => (x.status === 'recebido') - (y.status === 'recebido') || y.data.localeCompare(x.data));
      corpo = l.length ? `<div class="grade cascata">${l.map((pd) => { const r = resumoPedido(pd); return `<section class="cartao"><div class="cartao-cab"><h2>Pedido nº ${pd.n} · ${t(pd.forn)}</h2><span class="tag ${pd.status === 'recebido' ? 'ok' : pd.status === 'parcial' ? 'atn' : 'ac'}" style="margin-left:auto">${pd.status === 'recebido' ? 'Recebido' : pd.status === 'parcial' ? 'Chegou em parte' : 'Aguardando'}</span></div>
        <p class="mudo" style="margin:-4px 0 10px;font-size:13.5px">Feito em ${dataBR(pd.data)}${pd.previsao ? ` · previsão de chegada ${dataBR(pd.previsao)}` : ''}${pd.obs ? ` · ${t(pd.obs)}` : ''}</p>
        <div class="grade g4 kpis" style="margin-bottom:10px"><div class="kpi"><span><small>Peças pedidas</small><b>${r.pecas}</b><em>${r.chegou} já chegaram</em></span></div><div class="kpi"><span><small>Custo do lote</small><b>${din(r.custo)}</b><em>${din(r.custoFalta)} ainda a chegar</em></span></div><div class="kpi"><span><small>Se vender tudo</small><b>${din(r.venda)}</b><em>pelo preço de etiqueta</em></span></div><div class="kpi ok"><span><small>Margem projetada</small><b>${r.venda ? Math.round((r.venda - r.custo) / r.venda * 100) : 0}%</b><em>${din(r.venda - r.custo)} de lucro bruto</em></span></div></div>
        <ul class="lista">${pd.itens.map((it) => { const p = prod(it.p) || { nome: '?' }, q = Object.values(it.q).reduce((s2, x) => s2 + x, 0), rc = Object.values(it.rec || {}).reduce((s2, x) => s2 + x, 0); return `<li>${p.foto ? `<span class="peca"><img src="${t(p.foto)}" alt=""></span>` : ''}<span class="cresce"><b>${t(p.nome)}</b><small>${rc}/${q} peças chegaram · custo ${din(it.custo)} cada</small></span></li>`; }).join('')}</ul>
        ${pd.status !== 'recebido' ? `<div class="acoes" style="margin-top:10px"><button type="button" class="bt" data-cancelar-pedido="${pd.id}">Cancelar o que falta</button><button type="button" class="bt cheio" data-receber-pedido="${pd.id}">Registrar chegada</button></div>` : ''}</section>`; }).join('')}</div>` : '<section class="cartao"><p class="vazio"><b>Nenhum pedido em aberto</b>Faça o pedido na viagem de compra e dê baixa quando a mercadoria chegar.</p></section>';
    }
    if (aba === 'chegadas') {
      const l = db.compras.slice().sort((x, y) => y.data.localeCompare(x.data));
      corpo = `<section class="cartao"><div class="tabela-wrap"><table class="tabela cartoes"><thead><tr><th>Data</th><th>Fornecedor</th><th>Peças</th><th>Pagamento</th><th class="n">Custo</th><th class="n">Margem do lote</th></tr></thead><tbody>${l.map((c) => { const venda = c.itens.reduce((s2, x) => s2 + x.qtd * ((prod(x.p) || {}).preco || 0), 0); return `<tr><td data-r="Data">${dataBR(c.data)}</td><td><b>${t(c.forn)}</b>${c.obs ? `<br><small class="mudo">${t(c.obs)}</small>` : ''}</td><td data-r="Peças">${c.itens.length ? c.itens.reduce((s2, x) => s2 + x.qtd, 0) : '—'}</td><td data-r="Pagamento">${t(c.forma || '')}</td><td class="n">${din(c.total)}</td><td class="n" data-r="Margem">${venda ? `${Math.round((venda - c.total) / venda * 100)}%` : '—'}</td></tr>`; }).join('') || '<tr><td colspan="6"><p class="vazio"><b>Nenhuma chegada</b></p></td></tr>'}</tbody></table></div></section>`;
    }
    if (aba === 'abc') {
      const ini = somaDias(hoje(), -365), porF = {};
      db.fornecedores.forEach((f) => { porF[f.nome] = { f, comprado: 0, vendido: 0, custoVendido: 0 }; });
      db.compras.filter((c) => c.data >= ini).forEach((c) => { porF[c.forn] = porF[c.forn] || { f: { nome: c.forn }, comprado: 0, vendido: 0, custoVendido: 0 }; porF[c.forn].comprado += c.total; });
      db.vendas.filter((v) => !v.cancelada && v.data.slice(0, 10) >= ini).forEach((v) => v.itens.forEach((x) => { const p = prod(x.p); if (!p || !porF[p.forn]) return; porF[p.forn].vendido += x.preco * x.qtd; porF[p.forn].custoVendido += x.custo * x.qtd; }));
      const l = Object.values(porF).sort((x, y) => y.vendido - x.vendido), tot = l.reduce((s2, x) => s2 + x.vendido, 0) || 1; let ac = 0;
      corpo = `<section class="cartao"><p class="mudo" style="margin:0 0 12px;font-size:13.5px">Últimos 12 meses. Classe A: os fornecedores que trazem 80% das vendas; B: os próximos 15%; C: o resto. Margem = quanto sobra das peças vendidas depois do custo.</p><div class="tabela-wrap"><table class="tabela cartoes"><thead><tr><th>Fornecedor</th><th>Classe</th><th class="n">Comprado</th><th class="n">Vendido</th><th class="n">Margem</th><th class="n">% das vendas</th></tr></thead><tbody>${l.map((x) => { const antes = ac / tot; ac += x.vendido; const cl = antes < 0.8 ? 'A' : antes < 0.95 ? 'B' : 'C'; return `<tr><td><b>${t(x.f.nome)}</b>${x.f.tel ? `<br><small class="mudo">${t(x.f.tel)}</small>` : ''}</td><td data-r="Classe"><span class="tag ${cl === 'A' ? 'ok' : cl === 'B' ? 'atn' : ''}">${cl}</span></td><td class="n" data-r="Comprado">${din(x.comprado)}</td><td class="n" data-r="Vendido">${din(x.vendido)}</td><td class="n" data-r="Margem">${x.vendido ? `${Math.round((x.vendido - x.custoVendido) / x.vendido * 100)}%` : '—'}</td><td class="n" data-r="Participação">${Math.round(x.vendido / tot * 100)}%</td></tr>`; }).join('')}</tbody></table></div></section>`;
    }
    return `${cab('compras', `Compras`, `Pedidos, fornecedores e chegadas. Pedido feito na viagem de compra, chegada por cor e tamanho, margem de cada lote e quem são os melhores fornecedores.`, `${addBt('pedido', 'compra', 'peca', 'forn')}`)}
      ${abas(tabs, aba, 'data-ca')}${corpo}`;
  },

  caixa() {
    const cx = CX().aberto;
    const hist = `<section class="cartao" style="margin-top:16px"><div class="cartao-cab"><h2>Fechamentos anteriores</h2></div><ul class="lista">${CX().historico.slice().reverse().slice(0, 12).map((h) => `<li><span class="cresce"><b>${dataBR(h.abertura)}</b><small>aberto ${horaBR(h.abertura)} · fechado ${horaBR(h.fechamento)}${h.obs ? ` · ${t(h.obs)}` : ''}</small></span><span class="tag ${h.dif ? 'mal' : 'ok'}">${h.dif ? `diferença ${din(h.dif)}` : 'bateu'}</span></li>`).join('') || '<p class="mudo">Nenhum fechamento ainda.</p>'}</ul></section>`;
    if (!cx) return `${cab('caixa', `Caixa`, `Abra o caixa com o troco que está na gaveta.`, ``)}
      <section class="cartao" style="max-width:520px"><label class="campo">Troco inicial (R$)<input id="cx-ini" inputmode="decimal" placeholder="200,00"></label><button type="button" class="bt cheio largo" style="margin-top:12px" data-acao="abrir-caixa">Abrir caixa</button></section>${hist}`;
    const r = resumoCaixa(cx), linha = (n, v, cls = '') => `<li><span class="cresce">${n}</span><b class="num ${cls}">${din(v)}</b></li>`;
    return `${cab('caixa', `Caixa do dia`, `Aberto às ${horaBR(cx.abertura)} de ${dataBR(cx.abertura)} · ${r.vendas} vendas. Pix, cartão e crediário não entram na gaveta.`, `${addBt('despesa', 'retirada', 'reforco', 'receber')}<button type="button" class="bt" data-acao="fechar-caixa">Fechar caixa</button>`)}
      <div class="grade g4 kpis cascata" style="margin-bottom:16px">
        <div class="cartao kpi"><span class="kpi-ic ouro">${ico('moedas')}</span><span><small>Dinheiro esperado na gaveta</small><b data-conta="${r.esperado}">${din(r.esperado)}</b><em>troco ${din(cx.inicial)}</em></span></div>
        <div class="cartao kpi"><span class="kpi-ic">${ico('cartao')}</span><span><small>Pix</small><b>${din(r.pix + r.recPix)}</b><em>vendas + fiado recebido</em></span></div>
        <div class="cartao kpi"><span class="kpi-ic">${ico('cartao')}</span><span><small>Cartão</small><b>${din(r.debito + r.credito + r.recCartao)}</b><em>débito ${din(r.debito)} · crédito ${din(r.credito)}</em></span></div>
        <div class="cartao kpi"><span class="kpi-ic mal">${ico('recibo')}</span><span><small>Vendido no crediário</small><b>${din(r.fiado)}</b><em>entra quando receber</em></span></div>
      </div>
      <div class="grade g2">
        <section class="cartao"><div class="cartao-cab"><h2>Conta da gaveta</h2></div><ul class="lista">${linha('Troco inicial', cx.inicial)}${linha('Vendas em dinheiro', r.dinheiro)}${linha('Crediário recebido em dinheiro', r.recDinheiro)}${linha('Reforços', r.reforcos)}${linha('Despesas pagas em dinheiro', -r.despDinheiro, 'mudo')}${linha('Retiradas', -r.retiradas, 'mudo')}${linha('Reembolsos em dinheiro', -r.reembolsos, 'mudo')}<li><span class="cresce"><b>Esperado na gaveta</b></span><b class="num" style="font-size:20px">${din(r.esperado)}</b></li></ul></section>
        <section class="cartao"><div class="cartao-cab"><h2>Lançamentos do caixa</h2></div><ul class="lista">${cx.movs.slice().reverse().map((m) => `<li><span class="cresce"><b>${t(m.desc || m.t)}</b><small>${horaBR(m.data)} · ${{ despesa: 'Despesa', retirada: 'Retirada', reforco: 'Reforço', reembolso: 'Reembolso' }[m.t]}${m.f && m.f !== 'dinheiro' ? ` · ${FORMAS[m.f]}` : ''}</small></span><b class="num">${m.t === 'reforco' ? '+' : '−'}${din(m.v)}</b></li>`).join('') || '<p class="mudo">Nenhuma despesa, retirada ou reforço hoje.</p>'}</ul></section>
      </div>
      <section class="cartao" style="margin-top:16px"><div class="cartao-cab"><h2>${ico('cartao')}Cartão: a receber e conferência</h2><button type="button" class="bt pq" data-acao="conferir-extrato">Conferir com o extrato</button></div>${(() => { const l = vendasCartao(45), aRec = l.filter((x) => x.prev >= hoje()); return `<div class="grade g4 kpis" style="margin-bottom:12px"><div class="kpi"><span><small>Cartão a receber</small><b>${din(aRec.reduce((s2, x) => s2 + x.liquido, 0))}</b><em>líquido, já sem a taxa</em></span></div><div class="kpi"><span><small>Taxas da maquininha (45 dias)</small><b>${din(l.reduce((s2, x) => s2 + x.taxa, 0))}</b><em>débito ${db.cfg.taxas.debito}% · crédito ${db.cfg.taxas.credito}%</em></span></div><div class="kpi ok"><span><small>Conferidas com o extrato</small><b>${l.filter((x) => x.ok).length} de ${l.length}</b><em>vendas no cartão</em></span></div></div>
        <div class="tabela-wrap"><table class="tabela cartoes"><thead><tr><th>Venda</th><th>Forma</th><th class="n">Valor</th><th class="n">Taxa</th><th class="n">Cai na conta</th><th>Previsão</th><th></th></tr></thead><tbody>${l.slice(0, 12).map((x) => `<tr><td>nº ${x.v.n} · ${dataBR(x.v.data)}</td><td data-r="Forma">${FORMAS[x.f]}${(x.v.pag[x.i].parc || 1) > 1 ? ` ${x.v.pag[x.i].parc}×` : ''}</td><td class="n" data-r="Valor">${din(x.bruto)}</td><td class="n" data-r="Taxa">${din(x.taxa)}</td><td class="n" data-r="Líquido"><b>${din(x.liquido)}</b></td><td data-r="Previsão">${dataBR(x.prev)}</td><td><span class="tag ${x.ok ? 'ok' : ''}">${x.ok ? 'Conferida' : 'A conferir'}</span></td></tr>`).join('') || '<tr><td colspan="7"><p class="mudo">Nenhuma venda no cartão.</p></td></tr>'}</tbody></table></div><p class="mudo" style="font-size:13px;margin:10px 0 0">As taxas e prazos da sua maquininha ficam em Configurações.</p>`; })()}</section>${hist}`;
  },

  relatorios() {
    const [ini, fim] = periodo(estado.relPer, estado.relDe, estado.relAte), n = numeros(ini, fim);
    const pers = [['hoje', 'Diário'], ['semana', 'Semanal'], ['mes', 'Mensal'], ['passado', 'Mês passado'], ['livre', 'Escolher datas']];
    if (!pode('relatorios')) return `${cab('relatorios', `Relatórios`, `Seu acesso não mostra os relatórios. Peça para a dona liberar em Painel do dono.`, ``)}`;
    const porProd = {}; n.vs.forEach((v) => v.itens.forEach((x) => { const k = x.p; porProd[k] = porProd[k] || { nome: x.nome, q: 0, v: 0 }; porProd[k].q += x.qtd; porProd[k].v += x.preco * x.qtd; }));
    const top = Object.values(porProd).sort((a, b) => b.v - a.v).slice(0, 8), maxTop = Math.max(1, ...top.map((x) => x.v));
    const porCat = {}; n.vs.forEach((v) => v.itens.forEach((x) => { const c = (prod(x.p) || {}).cat || 'Outras'; porCat[c] = (porCat[c] || 0) + x.preco * x.qtd; }));
    const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]), maxCat = Math.max(1, ...cats.map((x) => x[1]));
    const nd = Math.min(31, dias(ini, fim) + 1), barras = Array.from({ length: nd }, (_, i) => { const d = somaDias(fim, i - nd + 1); return [d, n.vs.filter((v) => v.data.slice(0, 10) === d).reduce((s, v) => s + v.total, 0)]; }), maxB = Math.max(1, ...barras.map((x) => x[1]));
    const rec = { dinheiro: 0, pix: 0, debito: 0, credito: 0 }; n.vs.forEach((v) => v.pag.forEach((x) => { if (rec[x.f] !== undefined) rec[x.f] += x.v; })); n.pgs.forEach((p) => { if (rec[p.f] !== undefined) rec[p.f] += p.v; });
    const inad = totalAberto() ? Math.round(totalVencido() / totalAberto() * 100) : 0;
    const k = (rot, v, sub, cls = '') => `<div class="cartao kpi ${cls}"><span><small>${rot}</small><b>${v}</b><em>${sub}</em></span></div>`;
    return `${cab('relatorios', `Relatórios`, `${ini === fim ? dataBR(ini) : `${dataBR(ini)} a ${dataBR(fim)}`} · <span class="vivo"><i></i>ao vivo, atualizado às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span><br>Venda no crediário não é dinheiro recebido; faturamento não é lucro.`, `<button type="button" class="bt" data-acao="csv-vendas">Planilha das vendas</button><button type="button" class="bt" data-acao="imprimir">Imprimir</button>${addBt('venda', 'despesa')}`)}
      ${abas(pers, estado.relPer, 'data-per')}
      ${estado.relPer === 'livre' ? `<div class="campos" style="max-width:420px;margin-bottom:16px"><label class="campo">De<input type="date" id="rel-de" value="${ini}"></label><label class="campo">Até<input type="date" id="rel-ate" value="${fim}"></label></div>` : ''}
      <div class="grade g4 cascata" style="margin-bottom:16px">
        ${k('Vendas líquidas', din(n.liquido), `${n.vs.length} vendas · ticket ${din(n.ticket)}`)}
        ${pode('custo') ? k('Lucro bruto', din(n.lucro), `${n.liquido ? Math.round(n.lucro / n.liquido * 100) : 0}% · custo das peças ${din(n.cmv)}`, 'ok') : k('Lucro bruto', '—', 'só a dona vê')}
        ${k('Dinheiro que entrou', din(n.recebido), `${din(n.recebidoFiado)} de crediário recebido`)}
        ${k('Vendido no crediário', din(n.fiadoVendido), `a receber hoje ${din(totalAberto())}`)}
        ${k('Faturamento bruto', din(n.bruto), 'antes de descontos e devoluções')}
        ${k('Descontos', din(n.desc), 'dados no balcão')}
        ${k('Devoluções', din(n.devol), 'trocas e estornos')}
        ${k('Inadimplência', `${inad}%`, `${din(totalVencido())} vencido hoje`, inad > 15 ? 'mal' : '')}
      </div>
      <div class="grade g2" style="margin-bottom:16px">
        <section class="cartao"><div class="cartao-cab"><h2>Vendas por dia</h2></div><div class="barras">${barras.map(([d, v]) => `<div title="${dataBR(d)}: ${din(v)}"><i style="height:${Math.round(v / maxB * 130)}px"></i><span>${nd <= 10 ? dataBR(d).slice(0, 5) : d.slice(8)}</span></div>`).join('')}</div></section>
        <section class="cartao"><div class="cartao-cab"><h2>Como entrou o dinheiro</h2></div>${Object.entries(rec).map(([f, v]) => `<div class="hbar"><span>${FORMAS[f]}</span><span class="trilho"><i style="width:${Math.round(v / Math.max(1, ...Object.values(rec)) * 100)}%"></i></span><b>${din(v)}</b></div>`).join('')}<p class="mudo" style="font-size:13px;margin:8px 0 0">Despesas lançadas no caixa no período: ${din(n.despesas)}</p></section>
      </div>
      <div class="grade g2">
        <section class="cartao"><div class="cartao-cab"><h2>Mais vendidas</h2></div>${top.map((x) => `<div class="hbar"><span title="${t(x.nome)}">${t(x.nome)}</span><span class="trilho"><i style="width:${Math.round(x.v / maxTop * 100)}%"></i></span><b>${x.q} · ${din(x.v)}</b></div>`).join('') || '<p class="vazio">Nenhuma venda no período.</p>'}</section>
        <section class="cartao"><div class="cartao-cab"><h2>Por categoria</h2></div>${cats.map(([c, v]) => `<div class="hbar"><span>${t(c)}</span><span class="trilho"><i style="width:${Math.round(v / maxCat * 100)}%"></i></span><b>${din(v)}</b></div>`).join('') || '<p class="vazio">Nenhuma venda no período.</p>'}
          <p class="mudo" style="font-size:13px;margin:10px 0 0">Parado há mais de ${db.cfg.parados[2]} dias: ${din(parados().filter((x) => x.dias > db.cfg.parados[2]).reduce((s, x) => s + totalPecas(x.p) * x.p.custo, 0))} pelo custo.</p></section>
      </div>`;
  },

  config() {
    const L = db.loja, j = db.cfg.juros, d = dona(), u = eu(), ini = String(L.nome || 'L').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
    const cargo = u.perfil === 'dona' ? 'Dona da loja' : (u.cargo || 'Vendedora'), tm = TEMAS.find((x) => x[0] === (db.tema || 'ameixa')) || TEMAS[0];
    const secs = [['cfg-perfil', 'Perfil'], ['cfg-cores', 'Cores'], ['cfg-marca', 'Sua marca'], ['cfg-guia', 'Guia'], ...(d ? [['cfg-loja', 'Regras da loja'], ['cfg-nota', 'Nota fiscal'], ['cfg-copia', 'Cópia de segurança']] : []), ['cfg-assinatura', 'Minha assinatura']];
    return `${cab('config', `Configurações`, d ? `Seu perfil, as cores, a marca da loja, o guia, as regras da loja e a sua assinatura.` : `Seu perfil, o guia e a assinatura da loja. Cores, marca e regras, só a dona muda.`, `${d ? `<a class="bt" href="#dono">${icb('dono')}Painel do dono</a>` : ''}<button type="button" class="bt" data-acao="instalar">${icb('instalar')}Instalar o app</button>`)}
      <nav class="cfg-nav" aria-label="Seções das Configurações">${secs.map(([id, n]) => `<a href="#config/${id}">${n}</a>`).join('')}</nav>
      <div class="grade g2">
        <section class="cartao cfg-sec" id="cfg-perfil"><div class="cartao-cab"><h2>${icb('perfil')}Perfil</h2></div>
          <div class="cfg-eu"><span class="foto-perfil">${u.foto ? `<img src="${t(u.foto)}" alt="">` : t(iniciais(u.nome))}</span><div><b>${t(u.nome)}</b><small>${t(cargo)} · ${t(L.nome)}</small></div></div>
          <div class="campos"><label class="campo">E-mail da conta<input id="cfg-email" readonly value="${t(u.email || '')}" aria-describedby="cfg-email-d"><small id="cfg-email-d">Só leitura: é o e-mail do login.</small></label><label class="campo">Cargo<input readonly value="${t(cargo)}"></label></div>
          <div class="cfg-bts"><a class="bt pq cheio" href="#perfil">Editar nome, foto e senha de liberação</a><button type="button" class="bt pq" data-acao="trocar-senha" data-so-conta hidden>Trocar a senha do login</button><button type="button" class="bt pq" data-acao="sair-conta" data-so-conta hidden>Sair</button></div></section>
        <section class="cartao cfg-sec" id="cfg-cores"><div class="cartao-cab"><h2>${icb('etiqueta')}Esquema de cores</h2></div><p class="mudo cfg-txt">A cor vale no sistema inteiro: menu, botões, etiquetas, gráficos e recibos. ${d ? 'Quem você convidar vê igual.' : 'Só a dona troca a cor da loja.'}</p>
          ${d ? `<div class="temas">${TEMAS.map(([k, n, a, b]) => `<button type="button" data-tema="${k}" aria-pressed="${(db.tema || 'ameixa') === k}" style="--a:${a};--b:${b}"><i></i>${n}</button>`).join('')}</div>` : `<div class="temas"><button type="button" aria-pressed="true" disabled style="--a:${tm[2]};--b:${tm[3]}"><i></i>${tm[1]}</button></div>`}</section>
      </div>
      <section class="cartao cfg-sec" id="cfg-marca" style="margin-top:16px"><div class="cartao-cab"><h2>${icb('coroa')}Sua marca</h2></div><p class="mudo cfg-txt">Sua logo e o nome aparecem no topo, nos recibos, nas etiquetas e nas mensagens de cobrança. Quem você convidar vê igual.</p>
        <div class="cfg-eu"><span class="loja-logo" style="width:72px;height:72px;font-size:24px">${L.logo ? `<img src="${t(L.logo)}" alt="">` : t(ini)}</span>${d ? `<div style="display:flex;gap:8px;flex-wrap:wrap"><label class="bt pq cheio" for="logo-in">${L.logo ? 'Trocar logo' : 'Pôr a logo'}</label><input type="file" id="logo-in" accept="image/*" class="sr">${L.logo ? '<button type="button" class="bt pq" data-acao="tira-logo">Tirar</button>' : ''}</div>` : `<div><b>${t(L.nome)}</b><small>${t(L.slogan || '')}</small></div>`}</div>
        ${d ? `<div class="campos">${[['nome', 'Nome da loja'], ['slogan', 'Frase abaixo do nome'], ['dono', 'Seu nome (para a saudação)'], ['tel', 'WhatsApp da loja'], ['cidade', 'Cidade'], ['pix', 'Chave Pix (vai nas cobranças)']].map(([k, n]) => `<label class="campo">${n}<input data-loja="${k}" value="${t(L[k] || '')}"></label>`).join('')}</div>` : '<p class="mudo cfg-txt" style="margin:12px 0 0">Só a dona muda a logo, o nome, o WhatsApp e a chave Pix.</p>'}</section>
      <section class="cartao cfg-sec" id="cfg-guia" style="margin-top:16px"><div class="cartao-cab"><h2>${icb('guia')}Guia: como usar</h2></div><p class="mudo cfg-txt">Um passo a passo curto de cada tela. Também abre a qualquer hora pelo botão <b>?</b> no topo.</p>
        <div class="cfg-como">${COMO_ORDEM.filter((k) => d || !['dono', 'relatorios', 'compras'].includes(k)).map((k) => `<button type="button" class="bt pq" data-como="${k}">${icb(COMO[k][0])}${COMO[k][1]}</button>`).join('')}</div>
        <div class="cfg-bts" style="margin-top:12px"><a class="bt pq cheio" href="#guia">Guia completo, do primeiro dia ao fim do mês</a><button type="button" class="bt pq zap" data-acao="ajuda">${ico('zap')}Falar com uma pessoa</button></div></section>
      ${d ? `<div id="cfg-loja" class="cfg-sec" style="margin-top:16px">
      <div>
        <section class="cartao"><div class="cartao-cab"><h2>Regras do crediário</h2></div>
          <div class="campos"><label class="campo">Limite de cliente nova (R$)<input data-cfgd="limitePadrao" inputmode="decimal" value="${campoDin(db.cfg.limitePadrao)}"></label><label class="campo">Avisar quando usar (%) do limite<input data-cfg="alertaPct" type="number" min="10" max="100" value="${db.cfg.alertaPct}"></label>
          <label class="campo inteiro troca" style="color:var(--texto)"><span>Bloquear o crediário sozinho de quem passar do prazo</span><input type="checkbox" data-cfgb="bloqueioAuto" ${db.cfg.bloqueioAuto ? 'checked' : ''}></label>
          <label class="campo">Dias de atraso para bloquear<input data-cfg="bloqueioDias" type="number" min="1" value="${db.cfg.bloqueioDias}"></label></div>
          <label class="troca" style="margin-top:8px"><span><b>Cobrar juros e multa no atraso</b><br><small class="mudo">Desligado por padrão. Se ligar, combine antes com a cliente.</small></span><input type="checkbox" data-juros="ativo" ${j.ativo ? 'checked' : ''}></label>
          ${j.ativo ? `<div class="campos"><label class="campo">Multa (%)<input data-juros="multaPct" type="number" step="0.1" min="0" max="2" value="${j.multaPct}"><small>Pelo Código de Defesa do Consumidor, no máximo 2%.</small></label><label class="campo">Juros ao mês (%)<input data-juros="jurosMesPct" type="number" step="0.1" min="0" value="${j.jurosMesPct}"></label><label class="campo">Carência (dias)<input data-juros="carencia" type="number" min="0" value="${j.carencia}"></label></div>` : ''}
          <div class="cartao-cab" style="margin-top:18px"><h2>Maquininha de cartão</h2></div>
          <div class="campos" style="grid-template-columns:repeat(3,minmax(0,1fr))">${[['debito', 'Taxa no débito (%)'], ['credito', 'Crédito à vista (%)'], ['parcelado', 'Crédito parcelado (%)'], ['prazoDebito', 'Débito cai em (dias)'], ['prazoCredito', 'Crédito cai em (dias)']].map(([k, n]) => `<label class="campo">${n}<input data-taxa="${k}" type="number" step="0.01" min="0" value="${db.cfg.taxas[k]}"></label>`).join('')}</div>
          <div class="cartao-cab" style="margin-top:18px"><h2>Estoque</h2></div>
          <div class="campos" style="grid-template-columns:repeat(3,minmax(0,1fr))">${['Atenção depois de', 'Parada depois de', 'Encalhada depois de'].map((n, i) => `<label class="campo">${n} (dias)<input data-parado="${i}" type="number" min="1" value="${db.cfg.parados[i]}"></label>`).join('')}</div>
        </section>
      </div>
      ${secaoNota()}
      <div class="grade g2" style="margin-top:16px">
        <section class="cartao" id="meta"><div class="cartao-cab"><h2>${icb('alvo')}Metas de vendas</h2></div><p class="mudo" style="margin:-6px 0 12px;font-size:13.5px">A meta de cada mês aparece no Início, com a barra do que já foi vendido e quanto falta. Deixe em branco o mês sem meta.</p>
          <div class="campos">${[-1, 0, 1, 2].map((k) => somaMes(`${mesAtual()}-01`, k).slice(0, 7)).map((m) => `<label class="campo">${nomeMes(m).replace(/^./, (x) => x.toUpperCase())} de ${m.slice(0, 4)}${m === mesAtual() ? ' (este mês)' : ''}<input data-meta-m="${m}" inputmode="decimal" value="${campoDin(metaDe(m))}" placeholder="0,00"><small>${m <= mesAtual() ? `Vendido: ${din(vendidoNoMes(m))}` : 'Mês que vem'}</small></label>`).join('')}</div></section>
        <section class="cartao"><div class="cartao-cab"><h2>${icb('coroa')}Clientes VIP e comissão</h2></div><p class="mudo" style="margin:-6px 0 12px;font-size:13.5px">A cliente vira VIP quando compra a partir deste valor em 12 meses. O selo aparece na sacola do Vender e na lista de clientes.</p>
          <div class="campos"><label class="campo">Compras em 12 meses para ser VIP (R$)<input data-cfgd="vipMin" inputmode="decimal" value="${campoDin(db.cfg.vipMin)}"></label><label class="campo">Comissão das vendedoras novas (%)<input data-cfg="comissaoPct" type="number" min="0" max="50" step="0.5" value="${db.cfg.comissaoPct}"><small>A de cada pessoa muda no Painel do dono.</small></label></div></section>
      </div>
      <section class="cartao" style="margin-top:16px"><div class="cartao-cab"><h2>Lojas</h2>${dona() ? `<button type="button" class="bt pq" data-acao="nova-loja">${ico('mais')}Nova loja</button>` : ''}</div><p class="mudo" style="margin:-6px 0 12px;font-size:13.5px">Tem filial? Cadastre aqui, na mesma assinatura. Cada loja tem o próprio estoque e o próprio caixa; clientes, crediário e relatórios ficam juntos.</p>
        <div class="campos">${db.lojas.map((l) => `<label class="campo">Nome da loja<input data-filial-nome="${l.id}" value="${t(l.nome)}" ${dona() ? '' : 'disabled'}></label>`).join('')}
        <label class="campo">Este aparelho vende pela<select data-filial-atual>${db.lojas.map((l) => `<option value="${l.id}" ${l.id === lojaAtual() ? 'selected' : ''}>${t(l.nome)}</option>`).join('')}</select><small>Escolha em cada celular ou computador.</small></label></div></section>
      <section class="cartao" style="margin-top:16px"><div class="cartao-cab"><h2>Mensagens de cobrança no WhatsApp</h2></div><p class="mudo" style="margin:-6px 0 12px;font-size:13.5px">As palavras entre chaves viram os dados de cada cliente: {nome}, {valor}, {venc}, {saldo}, {dias}, {loja}, {pix}, {acordo}. Deixe em branco para voltar ao texto sugerido.</p>
        <div class="grade g2">${Object.entries(MSGS).map(([k, m]) => `<label class="campo">${m.titulo}<textarea data-msg="${k}" rows="4">${t((db.cfg.msgs || {})[k] || m.sug)}</textarea></label>`).join('')}</div></section>
      </div>
      <section class="cartao cfg-sec" id="cfg-copia" style="margin-top:16px"><div class="cartao-cab"><h2>Cópia de segurança</h2></div><p class="mudo cfg-txt">Baixe um arquivo com tudo (clientes, crediário, estoque, vendas e caixa) e guarde. Para voltar, é só carregar o arquivo.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="bt" data-acao="backup">Baixar cópia</button><label class="bt" for="backup-in">Carregar cópia</label><input type="file" id="backup-in" accept="application/json,.json" class="sr">${window.BRAssinatura && BRAssinatura.emConta() ? '' : '<button type="button" class="bt perigo" data-acao="recomecar">Recomeçar a demonstração</button>'}</div></section>` : ''}
      <div class="cfg-sec" id="cfg-assinatura" style="margin-top:16px"><div id="ass-slot"></div></div>`;
  },

  guia() {
    return `${cab('guia', `Guia de uso`, `Do primeiro dia ao fechamento do mês, em passos curtos. Toque em cada assunto.`, `<button type="button" class="bt" data-acao="instalar">Instalar o app</button><button type="button" class="bt zap" data-acao="ajuda">${ico('zap')}Falar com uma pessoa</button>`)}
      <div class="grade cascata">${GUIA.map(([g, itens], gi) => `<section class="cartao"><div class="cartao-cab"><h2><span class="tag ac" style="font-family:var(--sans)">${gi + 1}</span>${t(g)}</h2></div>${itens.map(([titulo, txt]) => `<details class="guia-item"><summary>${t(titulo)}</summary><p>${t(txt)}</p></details>`).join('')}</section>`).join('')}</div>`;
  },

  mais() {
    const G = [['A loja', [['#vendas', 'vendas', 'Vendas e trocas'], ['#etiquetas', 'etiquetas', 'Etiquetas'], ['#fiado', 'fiado', 'Crediário'], ['#compras', 'compras', 'Compras'], ['#caixa', 'caixa', 'Caixa'], ['#relatorios', 'relatorios', 'Relatórios'], ...(emiteNf() || db.notas.length ? [['#notas', 'notas', 'Notas fiscais']] : [])]], ['Sistema', [['#config', 'config', 'Configurações'], ['#perfil', 'perfil', 'Meu perfil'], ...(dona() ? [['#dono', 'dono', 'Painel do dono']] : []), ['#guia', 'guia', 'Guia de como usar']]]];
    return `${cab('mais', 'Mais', 'Tudo da loja, por assunto.')}${G.map(([g, it]) => `<p class="mais-grupo">${g}</p><div class="mais-lista cascata">${it.map(([h, i, n]) => `<a href="${h}">${icb(i)}${n}</a>`).join('')}</div>`).join('')}
      <button type="button" class="bt largo" style="margin-top:18px" data-como="${estado.ultimaTela || 'inicio'}">${icb('guia')}Como usar esta tela</button><button type="button" class="bt largo" style="margin-top:10px" data-acao="instalar">${icb('instalar')}Instalar o app no celular</button><button type="button" class="bt largo zap" style="margin-top:10px" data-acao="ajuda">${ico('zap')}Falar com uma pessoa da equipe</button>`;
  },

  perfil() {
    const u = eu(), h = hoje(), ini = `${h.slice(0, 8)}01`, mv = db.vendas.filter((v) => v.vend === u.id && !v.cancelada && v.data.slice(0, 10) >= ini), tot = mv.reduce((s, v) => s + v.total, 0);
    const hj = mv.filter((v) => v.data.slice(0, 10) === h);
    return `${cab('perfil', `Meu perfil`, `${u.perfil === 'dona' ? 'Dona da loja · acesso completo' : `Vendedora · ${t(db.loja.nome)}`}`, ``)}
      <div class="grade g2">
        <section class="cartao"><div style="display:flex;gap:16px;align-items:center;margin-bottom:16px"><span class="foto-perfil">${u.foto ? `<img src="${t(u.foto)}" alt="">` : t(iniciais(u.nome))}</span><div style="display:grid;gap:8px"><b style="font-family:var(--serif);font-size:22px">${t(u.nome)}</b><div style="display:flex;gap:8px;flex-wrap:wrap"><label class="bt pq cheio" for="foto-eu">${u.foto ? 'Trocar foto' : 'Pôr foto'}</label><input type="file" id="foto-eu" accept="image/*" class="sr">${u.foto ? '<button type="button" class="bt pq" data-acao="tira-foto-eu">Tirar</button>' : ''}</div></div></div>
          <div class="campos">${[['nome', 'Nome'], ['tel', 'WhatsApp'], ['email', 'E-mail'], ['nasc', 'Aniversário', 'date']].map(([k, n, tp]) => `<label class="campo">${n}<input data-eu="${k}" ${tp ? `type="${tp}"` : ''} value="${t(u[k] || '')}"></label>`).join('')}</div>
          <p class="campo" style="margin:16px 0 8px">Abrir o sistema em</p><div class="chips">${[['inicio', 'Visão geral'], ['vender', 'Vender'], ['fiado', 'Crediário']].map(([k, n]) => `<button type="button" data-abrir-em="${k}" aria-pressed="${(u.abrirEm || 'inicio') === k}">${n}</button>`).join('')}</div>
          <p class="campo" style="margin:16px 0 6px">Senha de liberação (4 números)</p><p class="mudo" style="font-size:13px;margin:0 0 8px">${u.perfil === 'dona' ? 'Usada para liberar crediário fora da regra e desconto acima do limite quando a vendedora pedir.' : 'Usada para confirmar ações sensíveis.'} ${u.pin ? 'Já cadastrada.' : 'Ainda não cadastrada (na demonstração, a senha da dona é 1234).'}</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><input id="pin-novo" inputmode="numeric" maxlength="4" placeholder="••••" style="width:110px;min-height:42px;border-radius:10px;border:1px solid var(--linha);text-align:center;letter-spacing:6px"><button type="button" class="bt" data-acao="salvar-pin">Salvar senha</button></div>
        </section>
        <section class="cartao"><div class="cartao-cab"><h2>Minhas vendas</h2><span class="vivo" style="margin-left:auto"><i></i>ao vivo</span></div>
          <div class="grade g2 kpis" style="margin-bottom:12px"><div class="kpi"><span><small>Hoje</small><b>${din(hj.reduce((s, v) => s + v.total, 0))}</b><em>${hj.length} vendas</em></span></div><div class="kpi"><span><small>No mês</small><b>${din(tot)}</b><em>${mv.length} vendas · ticket ${din(mv.length ? Math.round(tot / mv.length) : 0)}</em></span></div></div>
          <p class="campo" style="margin:12px 0 6px">O que eu posso fazer</p><ul class="lista">${PERMS.map(([k, n]) => `<li><span class="cresce">${n}</span><span class="tag ${pode(k) ? 'ok' : ''}">${pode(k) ? 'Pode' : 'Pede para a dona'}</span></li>`).join('')}<li><span class="cresce">Desconto sem pedir</span><span class="tag ac">até ${u.perfil === 'dona' ? '100' : u.descMax}%</span></li></ul>
          ${db.usuarios.length > 1 ? `<p class="mudo" style="font-size:13px;margin:14px 0 0">Na demonstração, a dona troca de pessoa no Painel do dono para ver o sistema como a vendedora vê.</p>` : ''}</section>
      </div>`;
  },

  dono() {
    if (!dona()) return `${cab('dono', `Painel do dono`, `Só a dona da loja vê este painel.`, ``)}<section class="cartao"><p class="vazio"><b>Acesso da dona</b>Volte para a sua conta para ver.</p><button type="button" class="bt largo" data-entrar-como="u1">Voltar para a conta da dona (demonstração)</button></section>`;
    const h = hoje(), ini = `${h.slice(0, 8)}01`, n = numeros(ini, h), diaMes = Number(h.slice(8)), ultimo = new Date(Number(h.slice(0, 4)), Number(h.slice(5, 7)), 0).getDate();
    const proj = Math.round(n.liquido / diaMes * ultimo); db.meta = metaDe(mesAtual()); const pct = db.meta ? Math.min(100, Math.round(n.liquido / db.meta * 100)) : 0;
    const porVend = db.usuarios.map((u) => { const vs = n.vs.filter((v) => v.vend === u.id), tot = vs.reduce((s, v) => s + v.total, 0); return { u, vs, tot, desc: vs.reduce((s, v) => s + v.desc, 0), fiado: vs.reduce((s, v) => s + v.pag.filter((x) => x.f === 'fiado').reduce((a, x) => a + x.v, 0), 0) }; });
    const ativ = [...db.atividades, ...db.excecoes.map((e) => ({ data: e.data, quem: '', txt: `Crediário liberado fora da regra para ${(cli(e.cli) || {}).nome || 'cliente'}: ${din(e.valor)} (${e.motivo})`, tipo: 'excecao' })), ...db.movs.filter((m) => m.tipo === 'ajuste' || m.tipo === 'avaria').map((m) => ({ data: m.data, quem: '', txt: `${m.tipo === 'ajuste' ? 'Ajuste de estoque' : 'Avaria'}: ${(prod(m.p) || {}).nome} ${m.cor} ${m.tam} (${m.q > 0 ? '+' : ''}${m.q}) ${m.motivo || ''}`, tipo: 'estoque' })), ...CX().historico.filter((c) => c.dif).map((c) => ({ data: c.fechamento, quem: '', txt: `Caixa fechou com diferença de ${din(c.dif)}${c.obs ? ` (${c.obs})` : ''}`, tipo: 'caixa' }))].sort((a, b) => String(b.data).localeCompare(String(a.data))).slice(0, 25);
    return `${cab('dono', `Painel do dono`, `Meta, equipe, quem pode o quê e tudo o que aconteceu na loja.`, `${addBt('usuario')}`)}
      <div class="grade g-21" style="margin-bottom:16px">
        <section class="cartao"><div class="cartao-cab"><h2>${ico('lucro')}Meta do mês</h2><span class="vivo" style="margin-left:auto"><i></i>ao vivo</span></div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap"><b style="font-size:28px" data-conta="${n.liquido}">${din(n.liquido)}</b><span class="mudo">de ${din(db.meta)} · ${pct}%</span></div>
          <div class="meta"><i style="width:${pct}%"></i></div>
          <p class="mudo" style="margin:0 0 12px;font-size:13.5px">No ritmo de hoje a loja fecha o mês em <b style="color:${proj >= db.meta ? 'var(--ok)' : 'var(--mal)'}">${din(proj)}</b>. ${proj >= db.meta ? 'Vai bater a meta.' : `Faltam ${din(db.meta - n.liquido)} em ${ultimo - diaMes} dias: ${din(Math.max(0, Math.round((db.meta - n.liquido) / Math.max(1, ultimo - diaMes))))} por dia.`}</p>
          <label class="campo" style="max-width:240px">Meta de vendas do mês (R$)<input data-meta inputmode="decimal" value="${campoDin(db.meta)}"></label></section>
        <section class="cartao"><div class="cartao-cab"><h2>${ico('moedas')}Dinheiro do mês</h2></div><ul class="lista"><li><span class="cresce">Vendas líquidas</span><b class="num">${din(n.liquido)}</b></li><li><span class="cresce">Lucro bruto</span><b class="num" style="color:var(--ok)">${din(n.lucro)}</b></li><li><span class="cresce">Despesas do caixa</span><b class="num">${din(n.despesas)}</b></li><li><span class="cresce">Crediário a receber</span><b class="num">${din(totalAberto())}</b></li><li><span class="cresce">Crediário vencido</span><b class="num" style="color:var(--mal)">${din(totalVencido())}</b></li></ul></section>
      </div>
      <section class="cartao" style="margin-bottom:16px"><div class="cartao-cab"><h2>${ico('gente')}Equipe no mês</h2></div><div class="tabela-wrap"><table class="tabela cartoes"><thead><tr><th>Pessoa</th><th class="n">Vendas</th><th class="n">Vendido</th><th class="n">Ticket</th><th class="n">Descontos</th><th class="n">No crediário</th><th class="n">Comissão</th><th></th></tr></thead><tbody>${porVend.map((x) => `<tr><td><b>${t(x.u.nome)}</b><br><small class="mudo">${x.u.perfil === 'dona' ? 'Dona' : 'Vendedora'}${x.u.id === db.usuario ? ' · você' : ''}</small></td><td class="n" data-r="Vendas">${x.vs.length}</td><td class="n" data-r="Vendido"><b>${din(x.tot)}</b></td><td class="n" data-r="Ticket">${din(x.vs.length ? Math.round(x.tot / x.vs.length) : 0)}</td><td class="n" data-r="Descontos">${din(x.desc)}</td><td class="n" data-r="Crediário">${din(x.fiado)}</td><td class="n" data-r="Comissão">${x.u.comissao ? `<b>${din(comissaoDe(x.u, x.vs))}</b><br><small class="mudo">${x.u.comissao}%</small>` : '—'}</td><td>${x.u.id === db.usuario ? '' : `<button type="button" class="bt pq" data-entrar-como="${x.u.id}">Ver como ${t(x.u.nome.split(' ')[0])}</button>`}</td></tr>`).join('')}</tbody></table></div></section>
      <section class="cartao" style="margin-bottom:16px"><div class="cartao-cab"><h2>${ico('ok')}Quem pode o quê</h2></div><p class="mudo" style="margin:-6px 0 12px;font-size:13.5px">A dona pode tudo. Para a vendedora, marque o que ela pode fazer sem pedir a sua senha.</p>
        <div class="tabela-wrap"><div class="perm"><b style="text-align:left">Pessoa</b>${PERMS.map(([, n]) => `<b>${n}</b>`).join('')}${db.usuarios.filter((u) => u.perfil !== 'dona').map((u) => `<span><b>${t(u.nome)}</b><br><small class="mudo">desconto até <input data-desc-max="${u.id}" type="number" min="0" max="100" value="${u.descMax}" style="width:52px;border:1px solid var(--linha);border-radius:6px;padding:2px 4px">% · comissão <input data-comissao="${u.id}" type="number" min="0" max="50" step="0.5" value="${u.comissao || 0}" style="width:56px;border:1px solid var(--linha);border-radius:6px;padding:2px 4px">%</small></span>${PERMS.map(([k]) => `<label><input type="checkbox" data-perm="${u.id}.${k}" ${(u.perms || {})[k] ? 'checked' : ''} aria-label="${t(u.nome)}: ${k}"></label>`).join('')}`).join('')}</div></div></section>
      <section class="cartao"><div class="cartao-cab"><h2>${ico('recibo')}O que aconteceu na loja</h2></div><ul class="lista">${ativ.map((a) => `<li><span class="cresce"><b style="white-space:normal">${t(a.txt)}</b><small>${dataBR(a.data)} ${horaBR(a.data)}${a.quem ? ` · ${t(a.quem)}` : ''}</small></span></li>`).join('') || '<p class="mudo">Nada registrado ainda.</p>'}</ul></section>`;
  },
};

// ------------------------------------------------------------------ rotas
function rota() {
  const [nome, arg] = (location.hash.slice(1) || 'inicio').split('/');
  const f = TELAS[nome] || TELAS.inicio, tela = $('#tela');
  // redesenho da mesma tela (um clique, um número que mudou) não repete a animação de entrada: sem piscar
  // listas que correm de lado (vitrine, categorias) continuam onde estavam depois de redesenhar
  const LADO = '.vitrine, .pilulas, .abas-cat, .abas', posLado = rota.mesma ? $$(LADO, tela).map((e) => e.scrollLeft) : [];
  tela.innerHTML = f(arg); tela.classList.toggle('quieto', !!rota.mesma);
  if (rota.mesma) $$(LADO, tela).forEach((e, i) => { if (posLado[i]) e.scrollLeft = posLado[i]; }); if (!rota.mesma) { tela.classList.remove('entra'); void tela.offsetWidth; tela.classList.add('entra'); }
  const aba = nome === 'cliente' ? 'clientes' : nome === 'sacola' ? 'vender' : TELAS[nome] ? nome : 'inicio';
  $('#principal').dataset.tela = TELAS[nome] ? nome : 'inicio';
  const mn = $('#menu a[data-aba="notas"]'); if (mn) mn.hidden = !emiteNf();
  $$('[data-aba]').forEach((a) => a.toggleAttribute('aria-current', false));
  $$(`[data-aba="${aba}"]`).forEach((a) => a.setAttribute('aria-current', 'page'));
  if (['vendas', 'etiquetas', 'fiado', 'compras', 'caixa', 'relatorios', 'config', 'perfil', 'dono', 'guia', 'notas'].includes(nome)) $$('.barra [data-aba="mais"]').forEach((a) => a.setAttribute('aria-current', 'page'));
  marca(); contar(tela); requestAnimationFrame(() => ajustaAbas(tela));
  if (nome === 'config') posConfig(tela);
  if (TELAS[nome] && !['mais', 'guia'].includes(nome)) estado.ultimaTela = COMO[nome] ? nome : (nome === 'cliente' ? 'clientes' : nome === 'sacola' ? 'vender' : estado.ultimaTela);
  if (!rota.mesma) scrollTo({ top: 0 }); rota.mesma = false;
  if (nome === 'config' && arg && document.getElementById(arg)) setTimeout(() => document.getElementById(arg).scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
}
const mostra = () => { rota.mesma = true; rota(); };
addEventListener('hashchange', rota);
addEventListener('resize', () => ajustaAbas());

// ------------------------------------------------------------------ ações: venda
function escolherPeca(p) {
  let cor = (p.cores.find((c) => p.tam.some((tm) => qtd(p, c.n, tm) > 0)) || p.cores[0]).n, tam = null, q = 1;
  const desenha = (j) => {
    const fp = $('[data-foto-peca]', j); if (fp) fp.innerHTML = iconePeca(p, cor);
    $('[data-corpo]', j).innerHTML = `<p class="campo" style="margin:0 0 8px">Cor</p><div class="chips">${p.cores.map((c) => `<button type="button" data-c="${t(c.n)}" aria-pressed="${c.n === cor}"><span class="bolinha" style="background:${t(c.h)}"></span>${t(c.n)}</button>`).join('')}</div>
      <p class="campo" style="margin:14px 0 8px">Tamanho</p><div class="chips">${p.tam.map((tm) => { const n = qtd(p, cor, tm) - noCarrinho(p.id, cor, tm); return `<button type="button" data-t="${t(tm)}" aria-pressed="${tm === tam}" ${n > 0 ? '' : 'disabled'}>${t(tm)} <small style="opacity:.7">(${Math.max(0, n)})</small></button>`; }).join('')}</div>
      <div style="display:flex;align-items:center;gap:14px;margin-top:16px"><span class="campo" style="margin:0">Quantidade</span><span class="q" style="display:inline-flex;gap:8px;align-items:center"><button type="button" class="x" data-qq="-1">−</button><b>${q}</b><button type="button" class="x" data-qq="1">+</button></span><b style="margin-left:auto;font-size:20px">${din(p.preco * q)}</b></div>`;
  };
  abrir(`<div class="prod-topo" style="margin-bottom:14px"><span data-foto-peca>${iconePeca(p, cor)}</span><div><h2 style="margin:0">${t(p.nome)}</h2><small class="mudo">${t(p.cod)} · ${din(p.preco)}</small></div></div><div data-corpo class="escolha-peca"></div><div class="acoes"><button type="button" class="bt cheio" data-por>${ico('bolsa')}Pôr na sacola</button></div>`, (j) => {
    desenha(j);
    j.addEventListener('click', (e) => {
      const c = e.target.closest('[data-c]'), tb = e.target.closest('[data-t]'), qq = e.target.closest('[data-qq]');
      if (c) { cor = c.dataset.c; tam = null; q = 1; desenha(j); }
      if (tb) { tam = tb.dataset.t; q = 1; desenha(j); }
      if (qq) { const max = tam ? qtd(p, cor, tam) - noCarrinho(p.id, cor, tam) : 1; q = Math.max(1, Math.min(max, q + Number(qq.dataset.qq))); desenha(j); }
      if (e.target.closest('[data-por]')) {
        if (!tam) { toast('Escolha o tamanho.', true); return; }
        const ja = estado.sacola.find((x) => x.p === p.id && x.cor === cor && x.tam === tam);
        if (ja) ja.qtd += q; else estado.sacola.push({ p: p.id, nome: p.nome, cor, tam, h: (p.cores.find((x) => x.n === cor) || {}).h, qtd: q, preco: precoAtual(p), cheio: p.preco, custo: p.custo });
        ajustaPagamento(); fechar(); mostra(); toast(`${p.nome} (${cor}, ${tam}) na sacola.`);
      }
    });
  });
}
const noCarrinho = (pid, cor, tam) => estado.sacola.filter((x) => x.p === pid && x.cor === cor && x.tam === tam).reduce((s, x) => s + x.qtd, 0);
const totalSacola = () => Math.max(0, estado.sacola.reduce((s, x) => s + x.preco * x.qtd, 0) - ajustaDesc());
// com uma forma só, o valor acompanha o total da sacola
function ajustaPagamento() { if (estado.pag.length === 1) estado.pag[0].v = totalSacola(); }
function liberarExcecao() {
  if (!pode('liberar')) return pedirSenha('Liberar crediário fora da regra precisa da senha da dona.', () => { abrirExcecao(); });
  abrirExcecao();
}
// senha de 4 números da dona (na demonstração é 1234); compara pelo resumo SHA-256, a senha não fica guardada
async function resumoPin(p) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`peplo:${p}`)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
function pedirSenha(motivo, ok) {
  abrir(`<h2>Senha da dona</h2><p class="mudo">${t(motivo)}</p><label class="campo">Senha de liberação<input id="pin" inputmode="numeric" maxlength="4" autocomplete="off" style="letter-spacing:8px;text-align:center;font-size:22px"></label><p class="mudo" style="font-size:12.5px;margin:8px 0 0">Na demonstração a senha é 1234.</p><div class="acoes"><button type="button" class="bt cheio" data-ok>Liberar</button></div>`, (j) => {
    $('[data-ok]', j).onclick = async () => { const d = db.usuarios.find((u) => u.perfil === 'dona'), r = await resumoPin($('#pin', j).value.trim()), certo = d.pin ? d.pin === r : $('#pin', j).value.trim() === '1234'; if (!certo) { toast('Senha errada.', true); return; } fechar(); ok(); };
  });
}
function abrirExcecao() {
  abrir(`<h2>Liberar exceção no crediário</h2><p class="mudo">Fica registrado quem liberou, quando, o valor e o motivo.</p><label class="campo">Quem está liberando<input id="ex-quem" value="${t(db.loja.dono || '')}"></label><label class="campo" style="margin-top:10px">Motivo<textarea id="ex-mot" placeholder="Ex.: cliente antiga, combinou de pagar sexta"></textarea></label><div class="acoes"><button type="button" class="bt cheio" data-ok>Liberar</button></div>`, (j) => {
    $('[data-ok]', j).onclick = () => { const q = $('#ex-quem', j).value.trim(), m = $('#ex-mot', j).value.trim(); if (!q || m.length < 5) { toast('Diga quem libera e o motivo.', true); return; } estado.excecao = `${q}: ${m}`; registra(`Exceção no crediário liberada: ${m}`, 'excecao'); fechar(); mostra(); };
  });
}
function finalizarVenda() {
  const sac = estado.sacola; if (!sac.length) return; ajustaDesc();
  const sub = sac.reduce((s, x) => s + x.preco * x.qtd, 0), total = Math.max(0, sub - estado.desc);
  if (estado.desc > sub) return toast('O desconto é maior que o total.', true);
  const pags = estado.pag.filter((x) => x.v > 0), pago = pags.reduce((s, x) => s + x.v, 0);
  if (pago < total) return toast(`Faltam ${din(total - pago)} no pagamento.`, true);
  const troco = pago - total;
  if (estado.desc && !pode('desconto') && estado.desc > Math.round(sub * eu().descMax / 100) && !estado.descLiberado) { pedirSenha(`Desconto de ${din(estado.desc)} passa do seu limite de ${eu().descMax}%.`, () => { estado.descLiberado = true; registra(`Desconto de ${din(estado.desc)} liberado com a senha da dona`, 'desconto'); finalizarVenda(); }); return; }
  if (troco > 0 && !pags.some((x) => x.f === 'dinheiro')) return toast('O pagamento passa do total. Ajuste os valores (troco só no dinheiro).', true);
  // estoque: confere de novo na hora (nunca negativo)
  for (const x of sac) { const p = prod(x.p); if (!p || qtd(p, x.cor, x.tam) < noCarrinho(x.p, x.cor, x.tam)) return toast(`Sem estoque de ${x.nome} ${x.cor} ${x.tam}.`, true); }
  let c = acharCli(estado.vCli);
  if (!c && estado.vCli.trim()) { c = { id: uid('c'), nome: estado.vCli.trim(), tel: '', cpf: '', nasc: '', end: '', limite: db.cfg.limitePadrao, obs: '', bloqueado: false, credito: 0, criado: hoje() }; db.clientes.push(c); }
  const fiado = pags.filter((x) => x.f === 'fiado').reduce((s, x) => s + x.v, 0), loja = pags.filter((x) => x.f === 'loja').reduce((s, x) => s + x.v, 0);
  if (fiado) { const pf = podeFiado(c, fiado); if (!pf.ok && !(pf.excecao && estado.excecao)) return toast(pf.motivo, true); if (!pf.ok) db.excecoes.push({ data: agora(), cli: c.id, valor: fiado, motivo: estado.excecao }); }
  if (loja && (!c || (c.credito || 0) < loja)) return toast('A cliente não tem esse crédito na loja.', true);
  const cx = caixaAtual();
  // troco sai do dinheiro
  const pagFinal = pags.map((x) => ({ ...x })); if (troco > 0) { const d = pagFinal.find((x) => x.f === 'dinheiro'); d.v -= troco; }
  const v = { id: uid('v'), n: ++db.n, data: agora(), loja: lojaAtual(), vend: db.usuario, cli: c ? c.id : null, itens: sac.map((x) => ({ p: x.p, nome: x.nome, cor: x.cor, tam: x.tam, qtd: x.qtd, preco: x.preco, custo: x.custo })), sub, desc: estado.desc, total, pag: pagFinal.filter((x) => x.v > 0), devol: [], caixa: cx.id, troco, excecao: fiado && estado.excecao ? estado.excecao : null };
  v.itens.forEach((x) => mover(prod(x.p), x.cor, x.tam, -x.qtd, 'venda', v.id));
  if (loja) c.credito -= loja;
  if (fiado) {
    const n = estado.parc.n, base = Math.floor(fiado / n);
    for (let i = 0; i < n; i++) {
      const venc = estado.parc.int === 'mes' ? somaMes(estado.parc.prim, i) : somaDias(estado.parc.prim, i * Number(estado.parc.int));
      db.parcelas.push({ id: uid('pc'), cli: c.id, venda: v.id, num: i + 1, de: n, valor: i === n - 1 ? fiado - base * (n - 1) : base, saldo: i === n - 1 ? fiado - base * (n - 1) : base, venc, pags: [], status: 'aberta' });
    }
  }
  db.vendas.push(v);
  const comNota = emiteNf() && (estado.nota ?? (db.fiscal.auto !== false)), cpfNota = estado.cpf || (c && c.cpf) || '';
  grava();
  estado = { ...estado, cpf: '', nota: undefined, descLiberado: false, sacola: [], vCli: '', desc: 0, descVal: 0, dividir: false, sel: null, selFechada: false, pag: [{ f: 'pix', v: 0 }], parc: { n: 1, int: 'mes', prim: somaMes(hoje(), 1) }, excecao: null, busca: '' };
  if (location.hash === '#sacola') location.hash = '#vender'; else mostra();
  if (comNota) emitirNota(v, cpfNota).then((n) => { if (n) mostrarNota(n); else comprovante(v); }); else comprovante(v);
}
function comprovante(v) {
  const c = v.cli ? cli(v.cli) : null, ps = db.parcelas.filter((p) => p.venda === v.id && !p.acordo);
  const texto = `${db.loja.nome}\nCompra nº ${v.n} · ${dataBR(v.data)} ${horaBR(v.data)}\n${v.itens.map((x) => `${x.qtd}x ${x.nome} (${x.cor}, ${x.tam}) ${din(x.preco * x.qtd)}`).join('\n')}${v.desc ? `\nDesconto: -${din(v.desc)}` : ''}\nTotal: ${din(v.total)}\n${v.pag.map((x) => `${FORMAS[x.f]}: ${din(x.v)}`).join('\n')}${ps.length ? `\nParcelas: ${ps.map((p) => `${p.num}/${p.de} ${din(p.valor)} vence ${dataBR(p.venc)}`).join('; ')}` : ''}\nObrigada pela preferência!`;
  abrir(`<h2>Venda nº ${v.n}${v.cancelada ? ' (cancelada)' : ''}</h2><p class="mudo">${dataBR(v.data)} ${horaBR(v.data)}${c ? ` · ${t(c.nome)}` : ''}</p>
    <div class="recibo"><h3>${t(db.loja.nome)}</h3><p class="mudo" style="text-align:center;margin:2px 0 10px;font-size:12.5px">${t(db.loja.cidade || '')} · comprovante sem valor fiscal</p>
      ${v.itens.map((x) => `<div class="linha-r"><span>${x.qtd}× ${t(x.nome)} <small class="mudo">${t(x.cor)} · ${t(x.tam)}${x.devolvido ? ` · ${x.devolvido} devolvida(s)` : ''}</small></span><b>${din(x.preco * x.qtd)}</b></div>`).join('')}<hr>
      ${v.desc ? `<div class="linha-r"><span>Desconto</span><span>−${din(v.desc)}</span></div>` : ''}<div class="linha-r"><b>Total</b><b>${din(v.total)}</b></div>
      ${v.pag.map((x) => `<div class="linha-r"><span>${FORMAS[x.f]}</span><span>${din(x.v)}</span></div>`).join('')}${v.troco ? `<div class="linha-r"><span>Troco</span><span>${din(v.troco)}</span></div>` : ''}
      ${ps.length ? `<hr>${ps.map((p) => `<div class="linha-r"><span>Parcela ${p.num}/${p.de} · vence ${dataBR(p.venc)}</span><span>${din(p.valor)}</span></div>`).join('')}` : ''}
      ${(v.devol || []).map((d) => `<hr><div class="linha-r"><span>${d.tipo === 'troca' ? 'Troca' : 'Devolução'} em ${dataBR(d.data)} · ${t(d.destinoTxt)}</span><span>−${din(d.valor)}</span></div>`).join('')}</div>
    <div class="acoes">${c && c.tel ? `<a class="bt zap" href="${zap(c.tel, texto)}" target="_blank" rel="noopener">${ico('zap')}Mandar no WhatsApp</a>` : ''}<button type="button" class="bt" data-imp>Imprimir</button>${v.nota ? `<button type="button" class="bt" data-nota="${v.nota}">${icb('notas')}NFC-e${notaValida(notaDe(v)) ? '' : ' (cancelada)'}</button>` : ''}${emiteNf() && !v.cancelada && !notaValida(notaDe(v)) ? `<button type="button" class="bt" data-emitir="${v.id}">${icb('notas')}Emitir NFC-e</button>` : ''}${modoNf() === 'outro' && !v.cancelada ? `<button type="button" class="bt" data-nf="outro" data-nfid="${v.id}">${icb('notas')}${v.nfOutro ? `Nota: ${t(v.nfOutro.ref || 'em outro sistema')}` : 'Nota emitida em outro sistema'}</button>` : ''}${v.cancelada ? '' : `<button type="button" class="bt" data-devolver="${v.id}">${ico('troca')}Troca ou devolução</button>`}</div>`, (j) => {
    $('[data-imp]', j).onclick = () => { document.body.classList.add('imprime-janela'); print(); };
  });
}

// ------------------------------------------------------------------ ações: troca e devolução
// venda com NFC-e: até 30 minutos dá para cancelar a nota (cliente desistiu de tudo); depois, a devolução é pela nota de devolução no emissor
function avisoNotaTroca(v) {
  const n = notaDe(v); if (!notaValida(n)) return '';
  const min = minutosNota(n);
  return min ? `<div class="caixa-aviso atn">Esta venda tem a NFC-e${n.numero ? ` nº ${n.numero}` : ''}. Se a cliente desistiu da compra toda, cancele a nota (faltam ${min} min) e registre a devolução aqui. Troca de tamanho ou cor não precisa cancelar. <button type="button" class="link" data-cancela-nota="${n.id}">Cancelar a nota</button></div>`
    : `<div class="caixa-aviso atn">Esta venda tem a NFC-e${n.numero ? ` nº ${n.numero}` : ''}, que não cancela mais (passou de 30 minutos). Registre a troca ou devolução aqui e emita a nota de devolução (entrada, CFOP 1202) no seu emissor, ou peça ao seu contador.</div>`;
}
function devolver(v) {
  const c = v.cli ? cli(v.cli) : null, fator = v.sub ? v.total / v.sub : 1;
  const abertasVenda = db.parcelas.filter((p) => p.venda === v.id && p.saldo > 0 && p.status === 'aberta');
  abrir(`<h2>Troca ou devolução · venda nº ${v.n}</h2><p class="mudo">A venda original fica guardada. Escolha o que voltou, como está a peça e o que fazer com o valor.</p>
    ${avisoNotaTroca(v)}
    ${v.itens.map((x, i) => { const pode = x.qtd - (x.devolvido || 0); return `<div class="troca" style="border-bottom:1px solid var(--linha-2)"><span><b>${t(x.nome)}</b><br><small class="mudo">${t(x.cor)} · ${t(x.tam)} · ${din(Math.round(x.preco * fator))} cada</small></span><select data-dv="${i}" ${pode ? '' : 'disabled'} style="min-height:40px;border-radius:10px;border:1px solid var(--linha);padding:4px 8px">${Array.from({ length: pode + 1 }, (_, k) => `<option value="${k}">${k}</option>`).join('')}</select></div>`; }).join('')}
    <div class="campos" style="margin-top:14px"><label class="campo">Como voltou a peça<select id="dv-cond"><option value="revenda">Boa, volta para a arara</option><option value="avaria">Com defeito ou avaria</option></select></label>
    <label class="campo">Motivo<input id="dv-mot" list="dl-mot" placeholder="Ex.: tamanho não serviu"><datalist id="dl-mot"><option value="Tamanho não serviu"><option value="Não gostou da cor"><option value="Defeito na costura"><option value="Arrependimento"></datalist></label>
    <label class="campo inteiro">O que fazer com o valor<select id="dv-dest">${abertasVenda.length ? '<option value="fiado">Abater do crediário desta compra</option>' : ''}${c ? '<option value="troca">Troca: vira crédito e já abre uma venda nova</option><option value="credito">Guardar como crédito para a cliente</option>' : ''}<option value="dinheiro">Devolver em dinheiro (sai do caixa)</option><option value="pix">Devolver no Pix</option></select></label></div>
    <p class="mudo" data-dv-total style="margin:10px 0 0">Valor: ${din(0)}</p>
    <div class="acoes"><button type="button" class="bt cheio" data-ok>Confirmar</button></div>`, (j) => {
    const valor = () => v.itens.reduce((s, x, i) => s + Math.round(x.preco * fator) * Number($(`[data-dv="${i}"]`, j).value || 0), 0);
    j.addEventListener('change', () => { $('[data-dv-total]', j).textContent = `Valor: ${din(valor())}`; });
    $('[data-ok]', j).onclick = () => {
      const val = valor(); if (!val) { toast('Escolha a quantidade que voltou.', true); return; }
      const cond = $('#dv-cond', j).value, dest = $('#dv-dest', j).value, mot = $('#dv-mot', j).value.trim() || 'Devolução';
      v.itens.forEach((x, i) => { const n = Number($(`[data-dv="${i}"]`, j).value || 0); if (!n) return; x.devolvido = (x.devolvido || 0) + n; const p = prod(x.p);
        if (cond === 'revenda') mover(p, x.cor, x.tam, n, 'devolucao', v.id, mot); else { db.avarias.push({ data: agora(), p: x.p, cor: x.cor, tam: x.tam, q: n, motivo: mot, venda: v.id }); db.movs.push({ id: uid('m'), data: agora(), p: x.p, cor: x.cor, tam: x.tam, q: 0, tipo: 'avaria', ref: v.id, motivo: `${n} peça(s) com avaria: ${mot}` }); } });
      let txt = '';
      if (dest === 'fiado') { let resto = val; abertasVenda.sort((a, b) => b.venc.localeCompare(a.venc)).forEach((p) => { const a = Math.min(resto, p.saldo); p.saldo -= a; p.valor -= a; resto -= a; }); if (resto > 0 && c) c.credito = (c.credito || 0) + resto; txt = 'abatido do crediário'; }
      if (dest === 'credito' || dest === 'troca') { c.credito = (c.credito || 0) + val; txt = 'crédito na loja'; }
      if (dest === 'dinheiro' || dest === 'pix') { const cx = caixaAtual(); cx.movs.push({ id: uid('cm'), t: 'reembolso', v: val, desc: `Devolução venda nº ${v.n}`, data: agora(), f: dest }); txt = `devolvido no ${dest === 'pix' ? 'Pix' : 'dinheiro'}`; }
      v.devol.push({ data: agora(), valor: val, cond, motivo: mot, destino: dest, destinoTxt: txt, tipo: dest === 'troca' ? 'troca' : 'devolucao' });
      grava(); fechar();
      if (dest === 'troca') { estado.vCli = c.nome; estado.pag = [{ f: 'loja', v: 0 }]; location.hash = '#vender'; toast(`${din(val)} de crédito para ${c.nome.split(' ')[0]}. Escolha a peça nova.`); }
      else { mostra(); toast(`Devolução registrada: ${din(val)} ${txt}.`); }
    };
  });
}

// ------------------------------------------------------------------ ações: fiado
function receber(c) {
  const ab = abertas(c.id).sort((a, b) => a.venc.localeCompare(b.venc)), total = aberto(c.id), enc = encargos(c.id);
  abrir(`<h2>Receber de ${t(c.nome)}</h2><p class="mudo">Em aberto: ${din(total)}${vencido(c.id) ? ` (${din(vencido(c.id))} vencido)` : ''}. O valor quita primeiro as parcelas mais antigas; pode ser só uma parte.</p>
    <div class="chips" style="margin-bottom:12px">${ab.slice(0, 3).map((p) => `<button type="button" data-sug="${p.saldo}">Parcela ${p.num}/${p.de} · ${din(p.saldo)}</button>`).join('')}<button type="button" data-sug="${total}">Tudo · ${din(total)}</button></div>
    <div class="campos"><label class="campo">Valor recebido (R$)<input id="rc-v" inputmode="decimal" value="${campoDin(ab[0] ? ab[0].saldo : 0)}"></label><label class="campo">Forma<select id="rc-f">${['pix', 'dinheiro', 'debito', 'credito'].map((f) => `<option value="${f}">${FORMAS[f]}</option>`).join('')}</select></label>
    ${enc ? `<label class="campo inteiro troca" style="color:var(--texto)"><span>Cobrar juros e multa do atraso (${din(enc)})</span><input type="checkbox" id="rc-enc"></label>` : ''}</div>
    <div class="acoes"><button type="button" class="bt cheio" data-ok>${ico('ok')}Receber e gerar recibo</button></div>`, (j) => {
    j.addEventListener('click', (e) => { const s = e.target.closest('[data-sug]'); if (s) $('#rc-v', j).value = campoDin(Number(s.dataset.sug)); });
    $('[data-ok]', j).onclick = () => {
      let v = lerDin($('#rc-v', j).value); const f = $('#rc-f', j).value, comEnc = $('#rc-enc', j)?.checked ? enc : 0;
      if (v <= 0) { toast('Digite o valor recebido.', true); return; }
      if (v > total) { toast(`Ela deve ${din(total)}. Digite até esse valor.`, true); return; }
      const cx = caixaAtual(), saldoAntes = total, pg = { id: uid('pg'), data: agora(), cli: c.id, v, f, parcelas: [], caixa: cx.id, encargo: comEnc };
      for (const p of ab) { if (v <= 0) break; const a = Math.min(v, p.saldo); p.saldo -= a; v -= a; p.pags.push(pg.id); pg.parcelas.push({ id: p.id, v: a }); }
      pg.antes = saldoAntes; pg.depois = aberto(c.id);
      db.pagamentos.push(pg); grava(); fechar(); mostra(); recibo(pg, true);
    };
  });
}
function recibo(pg, novo = false) {
  const c = cli(pg.cli), quitou = pg.depois === 0;
  const k = quitou ? 'quitado' : 'pago', m = msg(k, c, { valor: din(pg.v + (pg.encargo || 0)), saldo: din(pg.depois ?? aberto(c.id)) });
  abrir(`<h2>${novo ? 'Pagamento recebido' : 'Recibo'}</h2><p class="mudo">${quitou ? 'Conta quitada.' : 'Saldo atualizado.'}</p>
    <div class="recibo"><h3>${t(db.loja.nome)}</h3><p class="mudo" style="text-align:center;margin:2px 0 10px;font-size:12.5px">Recibo nº ${t(pg.id.slice(-6).toUpperCase())} · ${dataBR(pg.data)} ${horaBR(pg.data)}</p>
      <div class="linha-r"><span>Recebi de</span><b>${t(c.nome)}</b></div><div class="linha-r"><span>Valor</span><b>${din(pg.v)}</b></div>${pg.encargo ? `<div class="linha-r"><span>Juros e multa</span><b>${din(pg.encargo)}</b></div>` : ''}
      <div class="linha-r"><span>Forma</span><span>${FORMAS[pg.f]}</span></div><hr>
      ${pg.antes !== undefined ? `<div class="linha-r"><span>Devia antes</span><span>${din(pg.antes)}</span></div>` : ''}<div class="linha-r"><span>Ficou devendo</span><b>${din(pg.depois ?? aberto(c.id))}</b></div>
      ${pg.parcelas.map((x) => { const p = db.parcelas.find((y) => y.id === x.id); return p ? `<div class="linha-r"><small>Parcela ${p.num}/${p.de} (venc. ${dataBR(p.venc)})</small><small>${din(x.v)}${p.saldo ? '' : ' · quitada'}</small></div>` : ''; }).join('')}
      <p style="text-align:center;margin:12px 0 0;font-family:var(--serif);font-style:italic">Obrigada pela confiança!</p></div>
    <div class="acoes">${c.tel ? `<a class="bt zap" href="${zap(c.tel, `${m}\n\nRecibo nº ${pg.id.slice(-6).toUpperCase()} · ${din(pg.v)} em ${dataBR(pg.data)}.`)}" target="_blank" rel="noopener">${ico('zap')}Mandar recibo no WhatsApp</a>` : ''}<button type="button" class="bt" data-imp>Imprimir</button></div>`, (j) => {
    $('[data-imp]', j).onclick = () => { document.body.classList.add('imprime-janela'); print(); };
  });
}
function cobrar(c) { db.cobrancas.push({ id: uid('cb'), cli: c.id, data: agora(), modelo: modeloCobranca(c) }); grava(); }
function renegociar(c) {
  const ab = abertas(c.id).sort((a, b) => a.venc.localeCompare(b.venc)), enc = encargos(c.id);
  abrir(`<h2>Renegociar a dívida de ${t(c.nome)}</h2><p class="mudo">As parcelas escolhidas viram um acordo novo. As antigas ficam no histórico como renegociadas e não são cobradas de novo.</p>
    ${ab.map((p) => `<label class="troca" style="border-bottom:1px solid var(--linha-2)"><span>Parcela ${p.num}/${p.de} · venc. ${dataBR(p.venc)} · <b>${din(p.saldo)}</b></span><input type="checkbox" data-rp="${p.id}" checked></label>`).join('')}
    ${enc ? `<label class="troca"><span>Somar juros e multa (${din(enc)})</span><input type="checkbox" id="rn-enc"></label>` : ''}
    <div class="campos" style="margin-top:12px"><label class="campo">Entrada hoje (R$)<input id="rn-ent" inputmode="decimal" placeholder="0,00"></label><label class="campo">Forma da entrada<select id="rn-f">${['pix', 'dinheiro', 'debito', 'credito'].map((f) => `<option value="${f}">${FORMAS[f]}</option>`).join('')}</select></label>
    <label class="campo">Parcelas<select id="rn-n">${Array.from({ length: 12 }, (_, i) => `<option ${i === 2 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label><label class="campo">1º vencimento<input type="date" id="rn-prim" value="${somaDias(hoje(), 30)}"></label></div>
    <p class="mudo" data-rn-res style="margin:10px 0 0"></p><div class="acoes"><button type="button" class="bt cheio" data-ok>Fechar acordo</button></div>`, (j) => {
    const calc = () => { const sel = ab.filter((p) => $(`[data-rp="${p.id}"]`, j).checked), soma = sel.reduce((s, p) => s + p.saldo, 0) + ($('#rn-enc', j)?.checked ? enc : 0), ent = lerDin($('#rn-ent', j).value), n = Number($('#rn-n', j).value); return { sel, soma, ent, n, parc: Math.max(0, soma - ent) }; };
    const mostrar = () => { const r = calc(); $('[data-rn-res]', j).textContent = `Total ${din(r.soma)} · entrada ${din(r.ent)} · ${r.n}× de ${din(Math.floor(r.parc / r.n))}`; };
    j.addEventListener('input', mostrar); j.addEventListener('change', mostrar); mostrar();
    $('[data-ok]', j).onclick = () => {
      const r = calc(); if (!r.sel.length) { toast('Escolha ao menos uma parcela.', true); return; }
      if (r.ent > r.soma) { toast('A entrada passa do total.', true); return; }
      const ac = { id: uid('ac'), cli: c.id, data: agora(), origem: r.sel.map((p) => p.id), total: r.soma, entrada: r.ent, n: r.n, parcelas: [] };
      r.sel.forEach((p) => { p.status = 'renegociada'; p.saldoAntes = p.saldo; p.saldo = 0; p.acordoNovo = ac.id; });
      if (r.ent > 0) { const cx = caixaAtual(); db.pagamentos.push({ id: uid('pg'), data: agora(), cli: c.id, v: r.ent, f: $('#rn-f', j).value, parcelas: [], caixa: cx.id, obs: 'Entrada do acordo' }); }
      const base = Math.floor(r.parc / r.n), prim = $('#rn-prim', j).value || somaDias(hoje(), 30);
      for (let i = 0; i < r.n && r.parc > 0; i++) { const val = i === r.n - 1 ? r.parc - base * (r.n - 1) : base, pc = { id: uid('pc'), cli: c.id, venda: null, acordo: ac.id, num: i + 1, de: r.n, valor: val, saldo: val, venc: somaMes(prim, i), pags: [], status: 'aberta' }; db.parcelas.push(pc); ac.parcelas.push(pc.id); }
      db.acordos.push(ac); if (c.bloqueado) c.obs = `${c.obs ? `${c.obs} ` : ''}Acordo em ${dataBR(hoje())}.`;
      grava(); fechar(); mostra();
      const txt = `entrada de ${din(r.ent)} e ${r.n}× de ${din(base)}, a 1ª em ${dataBR(prim)}`;
      abrir(`<h2>Acordo fechado</h2><p class="mudo">${t(txt)}.</p><div class="acoes">${c.tel ? `<a class="bt zap" href="${zap(c.tel, msg('acordo', c, { acordo: txt }))}" target="_blank" rel="noopener" data-cobra-ac="${c.id}">${ico('zap')}Avisar no WhatsApp</a>` : ''}<button type="button" class="bt" data-fim>Pronto</button></div>`, (k) => { $('[data-fim]', k).onclick = fechar; });
    };
  });
}
function extrato(c) {
  const linhas = [...db.vendas.filter((v) => v.cli === c.id && v.pag.some((x) => x.f === 'fiado')).map((v) => [v.data, `Compra nº ${v.n} no crediário`, v.pag.filter((x) => x.f === 'fiado').reduce((s, x) => s + x.v, 0)]), ...db.pagamentos.filter((p) => p.cli === c.id).map((p) => [p.data, `Pagamento (${FORMAS[p.f]})${p.obs ? ` · ${p.obs}` : ''}`, -p.v]), ...db.acordos.filter((a) => a.cli === c.id).map((a) => [a.data, `Acordo: ${a.n}× (renegociação)`, 0])].sort((a, b) => a[0].localeCompare(b[0]));
  let s = 0;
  abrir(`<h2>Extrato de ${t(c.nome)}</h2><p class="mudo">Tudo o que comprou no crediário e pagou.</p><div class="recibo"><h3>${t(db.loja.nome)}</h3>${linhas.map(([d, desc, v]) => { s += v; return `<div class="linha-r"><span><small class="mudo">${dataBR(d)}</small> ${t(desc)}</span><span class="num">${v ? (v > 0 ? '+' : '−') + din(Math.abs(v)) : ''}</span></div>`; }).join('')}<hr><div class="linha-r"><b>Em aberto hoje</b><b>${din(aberto(c.id))}</b></div></div>
    <div class="acoes"><button type="button" class="bt" data-imp>Imprimir</button></div>`, (j) => { $('[data-imp]', j).onclick = () => { document.body.classList.add('imprime-janela'); print(); }; }, true);
}
function formCliente(c) {
  const novo = !c; c = c || { nome: '', tel: '', cpf: '', nasc: '', end: '', limite: db.cfg.limitePadrao, obs: '' };
  abrir(`<h2>${novo ? 'Nova cliente' : 'Editar cliente'}</h2><div class="campos" style="margin-top:12px"><label class="campo inteiro">Nome<input id="fc-nome" value="${t(c.nome)}" required></label><label class="campo">WhatsApp<input id="fc-tel" inputmode="tel" value="${t(c.tel)}" placeholder="(16) 99999-9999"></label><label class="campo">Limite no crediário (R$)<input id="fc-lim" inputmode="decimal" value="${campoDin(c.limite)}"></label><label class="campo">CPF (opcional)<input id="fc-cpf" inputmode="numeric" value="${t(c.cpf)}"></label><label class="campo">Aniversário<input id="fc-nasc" type="date" value="${t(c.nasc)}"><small>Aparece nos aniversariantes do Início e na sacola.</small></label><label class="campo inteiro">Endereço (opcional)<input id="fc-end" value="${t(c.end)}"></label><label class="campo inteiro">Observação<textarea id="fc-obs">${t(c.obs)}</textarea></label></div>
    <div class="acoes"><button type="button" class="bt cheio" data-ok>Salvar</button></div>`, (j) => {
    $('[data-ok]', j).onclick = () => {
      const nome = $('#fc-nome', j).value.trim(); if (nome.length < 2) { toast('Escreva o nome da cliente.', true); return; }
      const dup = db.clientes.find((x) => sa(x.nome) === sa(nome) && x !== c); if (dup) { toast('Já existe uma cliente com esse nome.', true); return; }
      Object.assign(c, { nome, tel: telLimpo($('#fc-tel', j).value), limite: lerDin($('#fc-lim', j).value), cpf: $('#fc-cpf', j).value.trim(), nasc: $('#fc-nasc', j).value, end: $('#fc-end', j).value.trim(), obs: $('#fc-obs', j).value.trim() });
      if (novo) db.clientes.push({ id: uid('c'), bloqueado: false, credito: 0, criado: hoje(), ...c });
      grava(); fechar(); mostra(); toast(novo ? 'Cliente cadastrada.' : 'Cliente salva.');
    };
  });
}
function fiadoCaderno() {
  abrir(`<h2>Lançar fiado do caderno</h2><p class="mudo">Passe para o sistema o que está anotado à mão. Fica no crediário da cliente, com vencimento, como qualquer outra compra.</p>
    <div class="campos"><label class="campo inteiro">Cliente<input id="fd-cli" list="dl-cli" placeholder="Nome (se for nova, é cadastrada)">${listaClientes()}</label><label class="campo">WhatsApp (se for nova)<input id="fd-tel" inputmode="tel"></label><label class="campo">Quanto ela deve (R$)<input id="fd-v" inputmode="decimal"></label>
    <label class="campo">Data da compra<input type="date" id="fd-data" value="${hoje()}"></label><label class="campo">O que comprou<input id="fd-desc" list="dl-fd" placeholder="Ex.: 2 blusas e 1 calça"><datalist id="dl-fd"><option value="Compras anotadas no caderno"><option value="Saldo antigo"></datalist></label>
    <label class="campo">Parcelas<select id="fd-n">${Array.from({ length: 12 }, (_, i) => `<option>${i + 1}</option>`).join('')}</select></label><label class="campo">Vencimento (1ª)<input type="date" id="fd-venc" value="${somaDias(hoje(), 30)}"><small>Se já venceu, ponha a data antiga: entra como atrasada.</small></label></div>
    <div class="acoes"><button type="button" class="bt cheio" data-ok>Lançar no crediário</button></div>`, (j) => {
    $('[data-ok]', j).onclick = () => {
      const nome = $('#fd-cli', j).value.trim(), v = lerDin($('#fd-v', j).value), n = Number($('#fd-n', j).value), venc = $('#fd-venc', j).value || somaDias(hoje(), 30);
      if (nome.length < 2) { toast('Escreva o nome da cliente.', true); return; } if (v <= 0) { toast('Digite quanto ela deve.', true); return; }
      let c = acharCli(nome); if (!c) { c = { id: uid('c'), nome, tel: telLimpo($('#fd-tel', j).value), cpf: '', nasc: '', end: '', limite: Math.max(db.cfg.limitePadrao, v), obs: '', bloqueado: false, credito: 0, criado: hoje() }; db.clientes.push(c); }
      const base = Math.floor(v / n), desc = $('#fd-desc', j).value.trim() || 'Crediário do caderno';
      for (let i = 0; i < n; i++) db.parcelas.push({ id: uid('pc'), cli: c.id, venda: null, caderno: desc, data: $('#fd-data', j).value || hoje(), num: i + 1, de: n, valor: i === n - 1 ? v - base * (n - 1) : base, saldo: i === n - 1 ? v - base * (n - 1) : base, venc: somaMes(venc, i), pags: [], status: 'aberta' });
      registra(`Crediário do caderno lançado para ${c.nome}: ${din(v)} (${desc})`, 'fiado'); grava(); fechar(); location.hash = `#cliente/${c.id}`; mostra(); toast(`${din(v)} lançado no crediário de ${c.nome.split(' ')[0]}.`);
    };
  });
}
function passarCaderno() {
  const linha = (i) => `<tr><td><input data-cd="${i}.nome" list="dl-cli" placeholder="Nome da cliente" aria-label="Cliente ${i + 1}"></td><td><input data-cd="${i}.tel" inputmode="tel" placeholder="WhatsApp" aria-label="WhatsApp ${i + 1}"></td><td><input data-cd="${i}.v" inputmode="decimal" placeholder="0,00" aria-label="Deve ${i + 1}"></td><td><input data-cd="${i}.venc" type="date" aria-label="Vencimento ${i + 1}"></td></tr>`;
  let n = 10;
  abrir(`<h2>Passar o caderno inteiro</h2><p class="mudo">Uma linha por cliente: nome, WhatsApp, quanto deve e quando vence (se já venceu, ponha a data antiga). Aperte Enter para ir ao próximo campo. Quem já está cadastrada só ganha a dívida.</p>
    <div class="tabela-wrap"><table class="tabela cd-tab"><thead><tr><th>Cliente</th><th>WhatsApp</th><th>Deve (R$)</th><th>Vence em</th></tr></thead><tbody data-cd-linhas>${Array.from({ length: n }, (_, i) => linha(i)).join('')}</tbody></table></div>${listaClientes()}
    <button type="button" class="link" data-cd-mais style="margin-top:8px">+ Mais 10 linhas</button><p class="mudo" data-cd-res style="margin:8px 0 0"></p>
    <div class="acoes"><button type="button" class="bt cheio" data-ok>Lançar tudo no crediário</button></div>`, (j) => {
    const ler = () => { const l = []; for (let i = 0; i < n; i++) { const g = (k) => ($(`[data-cd="${i}.${k}"]`, j) || {}).value || ''; const nome = g('nome').trim(), v = lerDin(g('v')); if (nome.length >= 2 && v > 0) l.push({ nome, tel: telLimpo(g('tel')), v, venc: g('venc') || somaDias(hoje(), 30) }); } return l; };
    const res = () => { const l = ler(); $('[data-cd-res]', j).textContent = l.length ? `${l.length} ${l.length === 1 ? 'cliente' : 'clientes'} · ${din(l.reduce((s, x) => s + x.v, 0))} no total` : ''; };
    j.addEventListener('input', res);
    j.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-cd]')) { e.preventDefault(); const c = $$('[data-cd]', j), k = c.indexOf(e.target); if (c[k + 1]) c[k + 1].focus(); } });
    $('[data-cd-mais]', j).onclick = () => { $('[data-cd-linhas]', j).insertAdjacentHTML('beforeend', Array.from({ length: 10 }, (_, i) => linha(n + i)).join('')); n += 10; };
    $('[data-ok]', j).onclick = () => {
      const l = ler(); if (!l.length) { toast('Preencha ao menos uma linha com nome e valor.', true); return; }
      l.forEach((x) => { let c = acharCli(x.nome); if (!c) { c = { id: uid('c'), nome: x.nome, tel: x.tel, cpf: '', nasc: '', end: '', limite: Math.max(db.cfg.limitePadrao, x.v), obs: '', bloqueado: false, credito: 0, criado: hoje() }; db.clientes.push(c); } else if (x.tel && !c.tel) c.tel = x.tel;
        db.parcelas.push({ id: uid('pc'), cli: c.id, venda: null, caderno: 'Crediário do caderno', data: hoje(), num: 1, de: 1, valor: x.v, saldo: x.v, venc: x.venc, pags: [], status: 'aberta' }); });
      registra(`Caderno passado para o sistema: ${l.length} clientes, ${din(l.reduce((s, x) => s + x.v, 0))}`, 'fiado'); grava(); fechar(); location.hash = '#fiado'; mostra(); toast(`${l.length} clientes lançadas no crediário.`);
    };
  }, true);
}
function resumoPedido(pd) {
  let pecas = 0, chegou = 0, custo = 0, custoFalta = 0, venda = 0;
  pd.itens.forEach((it) => { const p = prod(it.p) || { preco: 0 }; Object.entries(it.q).forEach(([k, q]) => { const r = (it.rec || {})[k] || 0; pecas += q; chegou += r; custo += q * it.custo; custoFalta += Math.max(0, q - r) * it.custo; venda += q * p.preco; }); });
  return { pecas, chegou, custo, custoFalta, venda };
}
function formPedido() {
  const linhas = [{ p: '', q: {} }];
  const pecaPorNome = (n) => db.produtos.find((p) => sa(p.nome) === sa(n) || sa(p.cod) === sa(n));
  abrir(`<h2>Pedido de compra</h2><p class="mudo">Anote o que comprou no atacado. O estoque só sobe quando você registrar a chegada (pode chegar em partes).</p>
    <div class="campos"><label class="campo">Fornecedor<input id="pd-forn" list="dl-forn3" placeholder="Ex.: Brás Moda Atacado"><datalist id="dl-forn3">${db.fornecedores.map((f) => `<option value="${t(f.nome)}">`).join('')}</datalist></label><label class="campo">Previsão de chegada<input type="date" id="pd-prev" value="${somaDias(hoje(), 7)}"></label><label class="campo inteiro">Observação<input id="pd-obs" placeholder="Ex.: viagem de compra a Goiânia"></label></div>
    <div data-linhas style="margin-top:14px"></div><button type="button" class="link" data-mais-linha>+ Outra peça neste pedido</button>
    <p class="total"><span>Custo do pedido</span><b data-tot>${din(0)}</b></p><div class="acoes"><button type="button" class="bt cheio" data-ok>Salvar pedido</button></div>`, (j) => {
    const desenha = () => {
      $('[data-linhas]', j).innerHTML = linhas.map((l, i) => { const p = prod(l.p); return `<div class="cartao" style="margin-bottom:12px;box-shadow:none"><label class="campo">Peça<input data-lp="${i}" list="dl-pecas2" value="${t(p ? p.nome : '')}" placeholder="Nome ou código"></label>
        ${p ? `<div class="tabela-wrap" style="margin-top:8px"><table class="gradeq"><thead><tr><th></th>${p.tam.map((tm) => `<th>${t(tm)}</th>`).join('')}</tr></thead><tbody>${p.cores.map((c) => `<tr><th class="cor"><span class="bolinha" style="background:${t(c.h)}"></span>${t(c.n)}</th>${p.tam.map((tm) => `<td><input type="number" min="0" data-lq="${i}" data-k="${t(c.n)}|${t(tm)}" value="${l.q[`${c.n}|${tm}`] || ''}"></td>`).join('')}</tr>`).join('')}</tbody></table></div><label class="campo" style="margin-top:8px;max-width:220px">Custo por peça (R$)<input data-lc="${i}" inputmode="decimal" value="${campoDin(l.custo ?? p.custo)}"></label>` : ''}</div>`; }).join('') + `<datalist id="dl-pecas2">${ativos().map((p) => `<option value="${t(p.nome)}">`).join('')}</datalist>`;
      $('[data-tot]', j).textContent = din(linhas.reduce((s2, l) => { const p = prod(l.p); return s2 + (p ? Object.values(l.q).reduce((a2, x) => a2 + x, 0) * (l.custo ?? p.custo) : 0); }, 0));
    };
    desenha();
    j.addEventListener('change', (e) => { const lp = e.target.dataset.lp; if (lp !== undefined) { const p = pecaPorNome(e.target.value); linhas[lp] = { p: p ? p.id : '', q: {} }; desenha(); } });
    j.addEventListener('input', (e) => { const i = e.target.dataset.lq, c = e.target.dataset.lc; if (i !== undefined) linhas[i].q[e.target.dataset.k] = Math.max(0, Math.round(Number(e.target.value) || 0)); if (c !== undefined) linhas[c].custo = lerDin(e.target.value); if (i !== undefined || c !== undefined) $('[data-tot]', j).textContent = din(linhas.reduce((s2, l) => { const p = prod(l.p); return s2 + (p ? Object.values(l.q).reduce((a2, x) => a2 + x, 0) * (l.custo ?? p.custo) : 0); }, 0)); });
    $('[data-mais-linha]', j).onclick = () => { linhas.push({ p: '', q: {} }); desenha(); };
    $('[data-ok]', j).onclick = () => {
      const val = linhas.filter((l) => prod(l.p) && Object.values(l.q).some((x) => x > 0)); if (!val.length) { toast('Digite as quantidades do pedido.', true); return; }
      const forn = $('#pd-forn', j).value.trim() || 'Sem fornecedor'; if (forn !== 'Sem fornecedor' && !db.fornecedores.some((f) => sa(f.nome) === sa(forn))) db.fornecedores.push({ id: uid('f'), nome: forn, tel: '' });
      const n = db.pedidos.reduce((m, p) => Math.max(m, p.n), 0) + 1;
      db.pedidos.push({ id: uid('pd'), n, forn, data: hoje(), previsao: $('#pd-prev', j).value, obs: $('#pd-obs', j).value.trim(), itens: val.map((l) => ({ p: l.p, q: { ...l.q }, rec: {}, custo: l.custo ?? prod(l.p).custo })), status: 'aberto' });
      registra(`Pedido de compra nº ${n} para ${forn}`, 'compra'); grava(); fechar(); estado.comprasAba = 'pedidos'; location.hash = '#compras'; mostra(); toast(`Pedido nº ${n} salvo.`);
    };
  }, true);
}
function receberPedido(pd) {
  abrir(`<h2>Chegada do pedido nº ${pd.n}</h2><p class="mudo">Já vem preenchido com o que falta chegar. Ajuste se veio menos.</p>${pd.itens.map((it, i) => { const p = prod(it.p); return `<div class="cartao" style="margin-bottom:10px;box-shadow:none"><b>${t(p.nome)}</b><div class="tabela-wrap" style="margin-top:6px"><table class="gradeq"><thead><tr><th></th>${p.tam.map((tm) => `<th>${t(tm)}</th>`).join('')}</tr></thead><tbody>${p.cores.map((c) => `<tr><th class="cor">${t(c.n)}</th>${p.tam.map((tm) => { const k = `${c.n}|${tm}`, falta = Math.max(0, (it.q[k] || 0) - ((it.rec || {})[k] || 0)); return `<td>${(it.q[k] || 0) ? `<input type="number" min="0" max="${falta}" data-rp="${i}" data-k="${t(k)}" value="${falta}">` : '—'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div></div>`; }).join('')}
    <div class="campos"><label class="campo">Pagamento<input id="rp-forma" list="dl-forma2" placeholder="Ex.: boleto 30 dias"><datalist id="dl-forma2"><option value="Pix"><option value="Boleto 30 dias"><option value="Boleto 30/60"><option value="Cartão"></datalist></label></div>
    <div class="acoes"><button type="button" class="bt cheio" data-ok>Dar entrada no estoque</button></div>`, (j) => {
    $('[data-ok]', j).onclick = () => {
      let total = 0, pecas = 0; const itens = [], idc = uid('cp');
      $$('[data-rp]', j).forEach((inp) => { const it = pd.itens[Number(inp.dataset.rp)], k = inp.dataset.k, n = Math.max(0, Math.round(Number(inp.value) || 0)); if (!n) return; const [cor, tam] = k.split('|'), p = prod(it.p); mover(p, cor, tam, n, 'entrada', idc, `Pedido nº ${pd.n} de ${pd.forn}`); it.rec = it.rec || {}; it.rec[k] = (it.rec[k] || 0) + n; total += n * it.custo; pecas += n; p.custo = it.custo; const ja = itens.find((x) => x.p === it.p); if (ja) ja.qtd += n; else itens.push({ p: it.p, qtd: n, custo: it.custo }); });
      if (!pecas) { toast('Digite quantas peças chegaram.', true); return; }
      db.compras.push({ id: idc, data: hoje(), forn: pd.forn, itens, total, forma: $('#rp-forma', j).value.trim(), obs: `Pedido nº ${pd.n}` });
      const falta = pd.itens.some((it) => Object.entries(it.q).some(([k, q]) => q > ((it.rec || {})[k] || 0))); pd.status = falta ? 'parcial' : 'recebido';
      registra(`Chegada do pedido nº ${pd.n}: ${pecas} peças`, 'compra'); grava(); fechar(); mostra(); toast(`${pecas} peças entraram no estoque.`);
    };
  }, true);
}
function formPromo() {
  const cats = ['Todas', ...new Set(db.produtos.map((p) => p.cat))];
  abrir(`<h2>Liquidação ou promoção</h2><p class="mudo">No período, o Vender já mostra o preço com desconto e a etiqueta sai com o preço novo.</p><div class="campos"><label class="campo inteiro">Nome<input id="pr-n" placeholder="Ex.: Liquidação de verão"></label><label class="campo">Categoria<select id="pr-c">${cats.map((c) => `<option>${t(c)}</option>`).join('')}</select></label><label class="campo">Desconto (%)<input id="pr-p" type="number" min="1" max="90" value="20"></label><label class="campo">De<input type="date" id="pr-de" value="${hoje()}"></label><label class="campo">Até<input type="date" id="pr-ate" value="${somaDias(hoje(), 15)}"></label></div><div class="acoes"><button type="button" class="bt cheio" data-ok>Salvar</button></div>`, (j) => {
    $('[data-ok]', j).onclick = () => { const nome = $('#pr-n', j).value.trim() || 'Promoção', pct = Math.min(90, Math.max(1, Number($('#pr-p', j).value) || 0)), de = $('#pr-de', j).value, ate = $('#pr-ate', j).value; if (!de || !ate || ate < de) { toast('Confira as datas.', true); return; } db.promos.push({ id: uid('pr'), nome, cat: $('#pr-c', j).value, pct, de, ate }); registra(`Promoção criada: ${nome} (${pct}%)`, 'promo'); grava(); fechar(); mostra(); toast('Promoção salva.'); };
  });
}
function receberEscolher() {
  abrir(`<h2>Pagamento recebido</h2><p class="mudo">De quem?</p><label class="campo">Cliente<input id="re-cli" list="dl-dev" autocomplete="off"><datalist id="dl-dev">${devedoras().map((c) => `<option value="${t(c.nome)}">${din(aberto(c.id))}</option>`).join('')}</datalist></label><div class="acoes"><button type="button" class="bt cheio" data-ok>Continuar</button></div>`, (j) => {
    $('[data-ok]', j).onclick = () => { const c = acharCli($('#re-cli', j).value); if (!c) { toast('Escolha uma cliente da lista.', true); return; } if (!aberto(c.id)) { toast(`${c.nome} não deve nada.`, true); return; } receber(c); };
  });
}
// planilha: aceita CSV com ; ou , e cabeçalho em português (nome, telefone, limite, deve / nome, código, categoria, cor, tamanho, quantidade, custo, preço)
function lerPlanilha(txt) {
  const linhas = txt.replace(/^\ufeff/, '').split(/\r?\n/).filter((l) => l.trim()); if (linhas.length < 2) return [];
  const sep = (linhas[0].match(/;/g) || []).length >= (linhas[0].match(/,/g) || []).length ? ';' : ',';
  const quebra = (l) => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map((x) => x.trim()); };
  const cab = quebra(linhas[0]).map(sa);
  return linhas.slice(1).map((l) => { const c = quebra(l), o = {}; cab.forEach((h, i) => { o[h] = c[i] || ''; }); return o; });
}
const col = (o, ...nomes) => { for (const n of nomes) { const k = Object.keys(o).find((x) => x.includes(n)); if (k && o[k]) return o[k]; } return ''; };
function importar(tipo) {
  const modelo = tipo === 'clientes' ? 'nome;telefone;limite;deve;vencimento\nMaria Oliveira;16999990000;500,00;350,00;2026-11-10' : 'nome;codigo;categoria;cor;tamanho;quantidade;custo;preco\nBlusa Tricot;BT-01;Blusas;Preto;M;3;52,00;129,00';
  abrir(`<h2>${tipo === 'clientes' ? 'Clientes' : 'Peças'} de uma planilha</h2><p class="mudo">Salve a planilha como CSV (Excel: Salvar como, CSV) ou cole as linhas abaixo. A primeira linha é o cabeçalho.</p>
    <label class="bt" for="imp-arq">Escolher arquivo CSV</label><input type="file" id="imp-arq" accept=".csv,text/csv,text/plain" class="sr">
    <label class="campo" style="margin-top:12px">Ou cole aqui<textarea id="imp-txt" rows="6" placeholder="${t(modelo.replace(/\n/g, ' ⏎ '))}"></textarea></label>
    <p class="mudo" data-prev style="margin:8px 0 0;font-size:13.5px"></p><div class="acoes"><button type="button" class="bt" data-modelo>Baixar modelo</button><button type="button" class="bt cheio" data-ok>Importar</button></div>`, (j) => {
    const prev = () => { const l = lerPlanilha($('#imp-txt', j).value); $('[data-prev]', j).textContent = l.length ? `${l.length} linhas prontas para importar.` : ''; };
    $('#imp-txt', j).addEventListener('input', prev);
    $('#imp-arq', j).addEventListener('change', (e) => { const f = e.target.files[0]; if (f) f.text().then((x) => { $('#imp-txt', j).value = x; prev(); }); });
    $('[data-modelo]', j).onclick = () => baixar(`modelo-${tipo}.csv`, '\ufeff' + modelo);
    $('[data-ok]', j).onclick = () => {
      const l = lerPlanilha($('#imp-txt', j).value); if (!l.length) { toast('Nenhuma linha para importar.', true); return; }
      let n = 0;
      if (tipo === 'clientes') l.forEach((o) => { const nome = col(o, 'nome', 'cliente'); if (nome.length < 2) return; let c = acharCli(nome); if (!c) { c = { id: uid('c'), nome, tel: telLimpo(col(o, 'tel', 'whats', 'celular')), cpf: col(o, 'cpf'), nasc: '', end: col(o, 'endere'), limite: lerDin(col(o, 'limite')) || db.cfg.limitePadrao, obs: '', bloqueado: false, credito: 0, criado: hoje() }; db.clientes.push(c); n++; }
        const deve = lerDin(col(o, 'deve', 'saldo', 'divida')); if (deve > 0) db.parcelas.push({ id: uid('pc'), cli: c.id, venda: null, caderno: 'Saldo importado da planilha', data: hoje(), num: 1, de: 1, valor: deve, saldo: deve, venc: /^\d{4}-\d{2}-\d{2}$/.test(col(o, 'venc')) ? col(o, 'venc') : somaDias(hoje(), 30), pags: [], status: 'aberta' }); });
      else l.forEach((o) => { const nome = col(o, 'nome', 'produto', 'peca'); if (nome.length < 2) return; let p = db.produtos.find((x) => sa(x.nome) === sa(nome)); const cor = col(o, 'cor') || 'Única', tam = col(o, 'tam') || 'Único';
        if (!p) { p = { id: uid('p'), nome, cat: col(o, 'categ') || 'Outras', cod: col(o, 'cod'), marca: '', forn: '', custo: lerDin(col(o, 'custo')), preco: lerDin(col(o, 'preco', 'venda')), min: db.cfg.minimo, tam: [], cores: [], q: {}, criado: hoje(), arquivado: false }; db.produtos.push(p); n++; }
        if (!p.tam.includes(tam)) p.tam.push(tam); if (!p.cores.some((c) => c.n === cor)) p.cores.push({ n: cor, h: (CORES_SUG.find(([x]) => sa(x) === sa(cor)) || [0, '#b69a72'])[1] });
        const q = Math.max(0, Math.round(Number(col(o, 'quant', 'qtd', 'estoque').replace(',', '.')) || 0)); if (q) mover(p, cor, tam, q, 'entrada', 'Planilha', 'Importado da planilha'); });
      registra(`Planilha de ${tipo} importada (${l.length} linhas)`, 'importar'); grava(); fechar(); mostra(); toast(`${l.length} linhas importadas${n ? `, ${n} ${tipo === 'clientes' ? 'clientes novas' : 'peças novas'}` : ''}.`);
    };
  });
}
// instalar de verdade: o navegador oferece (Chrome, Edge, Android); no iPhone e no Safari, mostra o passo a passo
let pedidoInstalar = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedidoInstalar = e; });
addEventListener('appinstalled', () => { pedidoInstalar = null; toast('Peplo instalado. Abra pelo ícone na tela.'); });
const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function instalar() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent), android = /android/i.test(navigator.userAgent);
  const passos = ios ? ['Toque no botão de compartilhar (o quadrado com a seta para cima), embaixo no Safari.', 'Role e toque em “Adicionar à Tela de Início”.', 'Toque em “Adicionar”. O ícone do Peplo aparece na tela do iPhone.']
    : android ? ['Toque nos três pontinhos do Chrome, no canto de cima.', 'Toque em “Instalar app” ou “Adicionar à tela inicial”.', 'Confirme. O ícone do Peplo aparece junto com os seus apps.']
    : ['No Chrome ou no Edge, clique no ícone de instalar na barra de endereço (um computador com uma seta) ou no menu ⋮, em “Instalar Peplo”.', 'Confirme em “Instalar”.', 'O Peplo abre numa janela própria e ganha atalho na área de trabalho e no menu Iniciar.'];
  abrir(`<div class="instala"><img src="icone-512.png" alt=""><h2 style="padding:0">${instalado() ? 'O Peplo já está instalado' : 'Instalar o Peplo'}</h2>
    <p class="mudo" style="margin:0">Fica na tela do celular e do computador como um aplicativo, abre sem a barra do navegador e continua vendendo mesmo com a internet fraca (sobe para a nuvem quando a conexão volta).</p>
    ${instalado() ? '' : pedidoInstalar ? '<div class="acoes" style="justify-content:center"><button type="button" class="bt cheio" data-ok>Instalar agora</button></div>' : `<ol style="text-align:left;margin:6px 0 0;padding-left:20px;display:grid;gap:8px">${passos.map((x) => `<li>${t(x)}</li>`).join('')}</ol>`}
    ${window.veltriaConta ? '' : '<p class="mudo" style="font-size:12.5px;margin:6px 0 0">Esta é a demonstração. Depois de assinar, instale pela sua conta: o app abre direto na sua loja.</p>'}</div>`, (j) => {
    const b = $('[data-ok]', j);
    if (b) b.onclick = async () => { const p = pedidoInstalar; if (!p) return; p.prompt(); const r = await p.userChoice.catch(() => ({})); pedidoInstalar = null; fechar(); if (r.outcome === 'accepted') toast('Instalando o Peplo…'); };
  });
}
window.veltriaNovoCadastro = (tipo, nome) => { if (/cli/.test(tipo)) formCliente({ nome, tel: '', cpf: '', nasc: '', end: '', limite: db.cfg.limitePadrao, obs: '' }); };

// ------------------------------------------------------------------ ações: estoque e compras
const CORES_SUG = [['Preto', '#1f1d1b'], ['Branco', '#f4f1ea'], ['Off-white', '#ede4d3'], ['Nude', '#d9b99b'], ['Caramelo', '#a0683a'], ['Vinho', '#6b2338'], ['Rosa', '#e3a3b5'], ['Azul jeans', '#4a6a8f'], ['Marinho', '#22304a'], ['Verde oliva', '#6e7444'], ['Estampado', '#b5677f'], ['Cinza', '#9a958e']];
function formPeca(p) {
  const nova = !p; p = p ? JSON.parse(JSON.stringify(p)) : { nome: '', cat: 'Blusas', cod: '', marca: '', forn: '', custo: 0, preco: 0, min: db.cfg.minimo, tam: ['P', 'M', 'G', 'GG'], cores: [{ n: 'Preto', h: '#1f1d1b' }], q: {} };
  if (!nova) p.q = { ...Q(prod(p.id)) };
  const desenhaGrade = (j) => { $('[data-grade]', j).innerHTML = grade(p, { editar: true }); };
  abrir(`<h2>${nova ? 'Nova peça' : 'Editar peça'}</h2><p class="mudo">${nova ? 'A quantidade de cada cor e tamanho entra como estoque inicial.' : 'Mudar a quantidade registra um ajuste com o motivo.'}</p>
    <div class="campos"><label class="campo inteiro">Nome<input id="fp-nome" value="${t(p.nome)}" placeholder="Ex.: Vestido Midi Floral"></label>
    <label class="campo">Categoria<input id="fp-cat" list="dl-cat" value="${t(p.cat)}"><datalist id="dl-cat">${Object.keys(ICONE_CAT).map((c) => `<option value="${c}">`).join('')}</datalist></label><label class="campo">Código<input id="fp-cod" value="${t(p.cod)}" placeholder="Ex.: VM-1021"></label>
    <label class="campo">Custo (R$)<input id="fp-custo" inputmode="decimal" value="${campoDin(p.custo)}"></label><label class="campo">Preço de venda (R$)<input id="fp-preco" inputmode="decimal" value="${campoDin(p.preco)}"><small data-margem></small></label>
    <label class="campo">Estoque mínimo por cor e tamanho<input id="fp-min" type="number" min="0" value="${p.min}"></label><label class="campo">Fornecedor<input id="fp-forn" list="dl-forn" value="${t(p.forn)}"><datalist id="dl-forn">${db.fornecedores.map((f) => `<option value="${t(f.nome)}">`).join('')}</datalist></label>
    <label class="campo inteiro">Tamanhos (separe por vírgula)<input id="fp-tam" value="${t(p.tam.join(', '))}"><small>Sugestões: <button type="button" class="link" data-tams="PP, P, M, G, GG">PP a GG</button> · <button type="button" class="link" data-tams="P, M, G, GG, XG, G1, G2, G3, G4">P até G4</button> · <button type="button" class="link" data-tams="G1, G2, G3, G4, G5">Plus G1 a G5</button> · <button type="button" class="link" data-tams="34, 36, 38, 40, 42, 44">34 a 44</button> · <button type="button" class="link" data-tams="44, 46, 48, 50, 52, 54, 56">44 a 56</button> · <button type="button" class="link" data-tams="Único">Único</button></small></label></div>
    <div style="display:flex;gap:12px;align-items:center;margin-top:14px"><span class="peca" data-foto-prev style="width:64px;height:64px">${p.foto ? `<img src="${t(p.foto)}" alt="">` : ''}</span><label class="bt pq" for="fp-foto">${p.foto ? 'Trocar foto' : 'Pôr foto da peça'}</label><input type="file" id="fp-foto" accept="image/*" class="sr"></div>
    <p class="campo" style="margin:14px 0 8px">Cores <small class="mudo">(cada cor pode ter a sua foto; sem foto, vale a foto da peça)</small></p><div class="chips cores-cad" data-cores>${p.cores.map((c, i) => `<span class="cor-item"><button type="button" data-tira-cor="${i}" title="Tirar"><span class="bolinha" style="background:${t(c.h)}"></span>${t(c.n)} ×</button><label class="cor-foto" title="Foto da peça em ${t(c.n)}">${c.foto ? `<img src="${t(c.foto)}" alt="">` : ''}<span>${c.foto ? 'Trocar foto' : 'Foto desta cor'}</span><input type="file" accept="image/*" class="sr" data-foto-cor="${i}"></label></span>`).join('')}</div>
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><input id="fp-cor" list="dl-cores" placeholder="Nova cor" style="min-height:40px;border-radius:10px;border:1px solid var(--linha);padding:6px 10px;flex:1;min-width:140px"><datalist id="dl-cores">${CORES_SUG.map(([n]) => `<option value="${n}">`).join('')}</datalist><input type="color" id="fp-corh" value="#8a5367" style="width:46px;height:40px;border:1px solid var(--linha);border-radius:10px;padding:2px"><button type="button" class="bt pq" data-acao-cor>Pôr cor</button></div>
    ${nfAtivo() ? `<details style="margin-top:14px"><summary class="link">Dados fiscais da peça (para a nota)</summary><div class="campos" style="margin-top:10px"><label class="campo">NCM<input id="fp-ncm" list="dl-ncm" value="${t(p.ncm || NCM_SUG[p.cat] || '')}" placeholder="0000.00.00"><datalist id="dl-ncm">${Object.entries(NCM_SUG).map(([c, n]) => `<option value="${n}">${c}</option>`).join('')}</datalist><small>Confirme com o seu contador.</small></label><label class="campo">CFOP<input id="fp-cfop" value="${t(p.cfop || '5102')}"></label><label class="campo">CSOSN / CST<input id="fp-csosn" value="${t(p.csosn || '102')}"></label><label class="campo">Origem<select id="fp-orig"><option value="0" ${(p.orig || '0') === '0' ? 'selected' : ''}>0 · Nacional</option><option value="1" ${p.orig === '1' ? 'selected' : ''}>1 · Importada direto</option><option value="2" ${p.orig === '2' ? 'selected' : ''}>2 · Importada no mercado interno</option></select></label></div></details>` : ''}
    <p class="campo" style="margin:16px 0 8px">Quantidade em estoque${variasLojas() ? ` na ${t(nomeLoja(lojaAtual()))}` : ''}</p><div data-grade></div>
    ${nova ? '' : '<label class="campo" style="margin-top:10px">Motivo do ajuste (se mudar a quantidade)<input id="fp-mot" list="dl-aj" placeholder="Ex.: contagem do estoque"><datalist id="dl-aj"><option value="Contagem do estoque"><option value="Peça com defeito"><option value="Perda ou furto"><option value="Brinde"></datalist></label>'}
    <div class="acoes">${nova ? '' : `<button type="button" class="bt perigo" data-arquivar>${p.arquivado ? 'Voltar para a venda' : 'Arquivar'}</button>`}<button type="button" class="bt cheio" data-ok>Salvar</button></div>`, (j) => {
    const lerGrade = () => $$('[data-g]', j).forEach((i) => { p.q[i.dataset.g] = Math.max(0, Math.round(Number(i.value) || 0)); });
    const margem = () => { const c = lerDin($('#fp-custo', j).value), v = lerDin($('#fp-preco', j).value); $('[data-margem]', j).textContent = c && v ? `Margem ${Math.round((v - c) / v * 100)}% · ${din(v - c)} por peça` : ''; };
    desenhaGrade(j); margem(); j.addEventListener('input', (e) => { if (e.target.id === 'fp-custo' || e.target.id === 'fp-preco') margem(); });
    const corChips = () => { $('[data-cores]', j).innerHTML = p.cores.map((c, i) => `<span class="cor-item"><button type="button" data-tira-cor="${i}" title="Tirar"><span class="bolinha" style="background:${t(c.h)}"></span>${t(c.n)} ×</button><label class="cor-foto" title="Foto da peça em ${t(c.n)}">${c.foto ? `<img src="${t(c.foto)}" alt="">` : ''}<span>${c.foto ? 'Trocar foto' : 'Foto desta cor'}</span><input type="file" accept="image/*" class="sr" data-foto-cor="${i}"></label></span>`).join(''); };
    $('#fp-cor', j).addEventListener('change', (e) => { const s = CORES_SUG.find(([n]) => sa(n) === sa(e.target.value)); if (s) $('#fp-corh', j).value = s[1]; });
    $('#fp-foto', j).addEventListener('change', (e) => { const f = e.target.files[0]; if (f) lerFoto(f, 320).then((u) => { p.foto = u; $('[data-foto-prev]', j).innerHTML = `<img src="${u}" alt="">`; }).catch((x) => toast(x.message, true)); });
    j.addEventListener('change', (e) => { const fc = e.target.closest('[data-foto-cor]'); if (!fc || !fc.files[0]) return; const i = Number(fc.dataset.fotoCor); lerFoto(fc.files[0], 320).then((u) => { if (p.cores[i]) { p.cores[i].foto = u; corChips(); } }).catch((x) => toast(x.message, true)); });
    $('#fp-tam', j).addEventListener('change', (e) => { lerGrade(); p.tam = e.target.value.split(',').map((x) => x.trim()).filter(Boolean); desenhaGrade(j); });
    j.addEventListener('click', (e) => {
      const tb = e.target.closest('[data-tams]'); if (tb) { lerGrade(); $('#fp-tam', j).value = tb.dataset.tams; p.tam = tb.dataset.tams.split(',').map((x) => x.trim()); desenhaGrade(j); }
      const tc = e.target.closest('[data-tira-cor]'); if (tc && p.cores.length > 1) { lerGrade(); p.cores.splice(Number(tc.dataset.tiraCor), 1); corChips(); desenhaGrade(j); }
      if (e.target.closest('[data-acao-cor]')) { const n = $('#fp-cor', j).value.trim(); if (!n) return; if (p.cores.some((c) => sa(c.n) === sa(n))) { toast('Essa cor já está na peça.', true); return; } lerGrade(); p.cores.push({ n, h: $('#fp-corh', j).value }); $('#fp-cor', j).value = ''; corChips(); desenhaGrade(j); }
      if (e.target.closest('[data-arquivar]')) { const orig = prod(p.id); orig.arquivado = !orig.arquivado; grava(); fechar(); mostra(); toast(orig.arquivado ? 'Peça arquivada (o histórico continua).' : 'Peça de volta para a venda.'); }
    });
    $('[data-ok]', j).onclick = () => {
      lerGrade();
      const nome = $('#fp-nome', j).value.trim(), preco = lerDin($('#fp-preco', j).value), tam = $('#fp-tam', j).value.split(',').map((x) => x.trim()).filter(Boolean);
      if (nome.length < 2) { toast('Escreva o nome da peça.', true); return; }
      if (!preco) { toast('Digite o preço de venda.', true); return; }
      if (!tam.length) { toast('Ponha ao menos um tamanho.', true); return; }
      if (nfAtivo() && $('#fp-ncm', j)) Object.assign(p, { ncm: $('#fp-ncm', j).value.trim(), cfop: $('#fp-cfop', j).value.trim() || '5102', csosn: $('#fp-csosn', j).value.trim() || '102', orig: $('#fp-orig', j).value });
      Object.assign(p, { nome, cat: $('#fp-cat', j).value.trim() || 'Outras', cod: $('#fp-cod', j).value.trim(), custo: lerDin($('#fp-custo', j).value), preco, min: Math.max(0, Number($('#fp-min', j).value) || 0), forn: $('#fp-forn', j).value.trim(), tam });
      if (p.forn && !db.fornecedores.some((f) => sa(f.nome) === sa(p.forn))) db.fornecedores.push({ id: uid('f'), nome: p.forn, tel: '' });
      if (nova) {
        const np = { ...p, id: uid('p'), q: {}, criado: hoje(), arquivado: false };
        db.produtos.push(np); Object.entries(p.q).forEach(([k, q]) => { const [cor, tm] = k.split('|'); if (q > 0 && np.tam.includes(tm) && np.cores.some((c) => c.n === cor)) mover(np, cor, tm, q, 'entrada', 'Estoque inicial', 'Cadastro da peça'); });
      } else {
        const orig = prod(p.id), mot = $('#fp-mot', j).value.trim() || 'Ajuste manual';
        p.cores.forEach((c) => p.tam.forEach((tm) => { const k = `${c.n}|${tm}`, nv = p.q[k] || 0, at = qtd(orig, c.n, tm); if (nv !== at) { mover(orig, c.n, tm, nv - at, 'ajuste', 'Ajuste', mot); } }));
        const q = orig.q, qs = orig.qs; Object.assign(orig, { ...p, q, qs });
      }
      grava(); fechar(); mostra(); toast(nova ? 'Peça cadastrada.' : 'Peça salva.');
    };
  }, true);
}
function formTransf(p) {
  if (!variasLojas()) return toast('Cadastre a segunda loja em Configurações.', true);
  const outra = db.lojas.find((l) => l.id !== lojaAtual()) || db.lojas[1];
  abrir(`<h2>${t(p.nome)} nas lojas</h2><p class="mudo">O estoque de cada loja, cor e tamanho. Para mandar peças de uma loja para a outra, preencha embaixo.</p>
    ${db.lojas.map((l) => `<h3 style="margin:14px 0 6px;font-size:15px">${t(l.nome)} · ${totalPecas(p, l.id)} peças</h3>${grade(p, { loja: l.id })}`).join('')}
    <div class="campos" style="margin-top:16px"><label class="campo">Sai da loja<select id="tr-de">${db.lojas.map((l) => `<option value="${l.id}" ${l.id === lojaAtual() ? 'selected' : ''}>${t(l.nome)}</option>`).join('')}</select></label>
    <label class="campo">Vai para<select id="tr-para">${db.lojas.map((l) => `<option value="${l.id}" ${l.id === outra.id ? 'selected' : ''}>${t(l.nome)}</option>`).join('')}</select></label>
    <label class="campo">Cor<select id="tr-cor">${p.cores.map((c) => `<option>${t(c.n)}</option>`).join('')}</select></label>
    <label class="campo">Tamanho<select id="tr-tam">${p.tam.map((tm) => `<option>${t(tm)}</option>`).join('')}</select></label>
    <label class="campo">Quantidade<input id="tr-q" type="number" min="1" value="1" inputmode="numeric"><small data-tem></small></label></div>
    <div class="acoes"><button type="button" class="bt cheio" data-ok>Transferir</button></div>`, (j) => {
    const tem = () => { $('[data-tem]', j).textContent = `Tem ${qtd(p, $('#tr-cor', j).value, $('#tr-tam', j).value, $('#tr-de', j).value)} na loja de saída.`; };
    tem(); j.addEventListener('change', tem);
    $('[data-ok]', j).onclick = () => {
      const de = $('#tr-de', j).value, para = $('#tr-para', j).value, cor = $('#tr-cor', j).value, tam = $('#tr-tam', j).value, q = Math.round(Number($('#tr-q', j).value) || 0);
      if (de === para) return toast('Escolha lojas diferentes.', true);
      if (q < 1) return toast('Digite a quantidade.', true);
      if (q > qtd(p, cor, tam, de)) return toast(`A ${nomeLoja(de)} só tem ${qtd(p, cor, tam, de)} de ${cor} ${tam}.`, true);
      const ref = uid('tr');
      mover(p, cor, tam, -q, 'transf', ref, `Para ${nomeLoja(para)}`, de); mover(p, cor, tam, q, 'transf', ref, `Vindo da ${nomeLoja(de)}`, para);
      registra(`Transferência: ${q} ${p.nome} ${cor} ${tam}, da ${nomeLoja(de)} para a ${nomeLoja(para)}`, 'estoque');
      grava(); fechar(); mostra(); marca(); toast(`${q} ${q === 1 ? 'peça transferida' : 'peças transferidas'} para a ${nomeLoja(para)}.`); formTransf(p);
    };
  }, true);
}
function formCompra(pid) {
  const linhas = [{ p: pid || '', q: {} }];
  const pecaPorNome = (n) => db.produtos.find((p) => sa(p.nome) === sa(n) || sa(p.cod) === sa(n));
  abrir(`<h2>Registrar chegada de mercadoria</h2><p class="mudo">Escolha a peça e digite quantas chegaram de cada cor e tamanho. O estoque sobe na hora.</p>
    <div class="campos"><label class="campo">Fornecedor<input id="fc-forn" list="dl-forn2" placeholder="Ex.: Brás Moda Atacado"><datalist id="dl-forn2">${db.fornecedores.map((f) => `<option value="${t(f.nome)}">`).join('')}</datalist></label><label class="campo">Data<input type="date" id="fc-data" value="${hoje()}"></label>
    <label class="campo">Pagamento<input id="fc-forma" list="dl-forma" placeholder="Ex.: Pix, boleto 30 dias"><datalist id="dl-forma"><option value="Pix"><option value="Dinheiro"><option value="Boleto 30 dias"><option value="Boleto 30/60"><option value="Cartão"></datalist></label><label class="campo">Observação<input id="fc-obs"></label></div>
    <div data-linhas style="margin-top:14px"></div><button type="button" class="link" data-mais-linha>+ Outra peça nesta compra</button>
    <p class="total"><span>Total da compra</span><b data-tot>${din(0)}</b></p>
    <div class="acoes"><button type="button" class="bt cheio" data-ok>Dar entrada no estoque</button></div>`, (j) => {
    const desenha = () => {
      $('[data-linhas]', j).innerHTML = linhas.map((l, i) => { const p = prod(l.p); return `<div class="cartao" style="margin-bottom:12px;box-shadow:none"><label class="campo">Peça<input data-lp="${i}" list="dl-pecas" value="${t(p ? p.nome : '')}" placeholder="Nome ou código da peça"></label>
        ${p ? `<p class="campo" style="margin:10px 0 6px">Quantidades que chegaram</p><div class="tabela-wrap"><table class="gradeq"><thead><tr><th></th>${p.tam.map((tm) => `<th>${t(tm)}</th>`).join('')}</tr></thead><tbody>${p.cores.map((c) => `<tr><th class="cor"><span class="bolinha" style="background:${t(c.h)}"></span>${t(c.n)}</th>${p.tam.map((tm) => `<td><input type="number" min="0" inputmode="numeric" data-lq="${i}" data-k="${t(c.n)}|${t(tm)}" value="${l.q[`${c.n}|${tm}`] || ''}"></td>`).join('')}</tr>`).join('')}</tbody></table></div><label class="campo" style="margin-top:8px;max-width:220px">Custo por peça (R$)<input data-lc="${i}" inputmode="decimal" value="${campoDin(l.custo ?? p.custo)}"></label>` : '<p class="mudo" style="font-size:13px;margin:6px 0 0">Peça nova? Cadastre primeiro em Estoque, Nova peça.</p>'}</div>`; }).join('') + `<datalist id="dl-pecas">${ativos().map((p) => `<option value="${t(p.nome)}">`).join('')}</datalist>`;
      tot();
    };
    const tot = () => { $('[data-tot]', j).textContent = din(linhas.reduce((s, l) => { const p = prod(l.p); return s + (p ? Object.values(l.q).reduce((a, x) => a + x, 0) * (l.custo ?? p.custo) : 0); }, 0)); };
    desenha();
    j.addEventListener('change', (e) => { const lp = e.target.dataset.lp; if (lp !== undefined) { const p = pecaPorNome(e.target.value); linhas[lp] = { p: p ? p.id : '', q: {} }; desenha(); } });
    j.addEventListener('input', (e) => { const i = e.target.dataset.lq, c = e.target.dataset.lc; if (i !== undefined) { linhas[i].q[e.target.dataset.k] = Math.max(0, Math.round(Number(e.target.value) || 0)); tot(); } if (c !== undefined) { linhas[c].custo = lerDin(e.target.value); tot(); } });
    $('[data-mais-linha]', j).onclick = () => { linhas.push({ p: '', q: {} }); desenha(); };
    $('[data-ok]', j).onclick = () => {
      const val = linhas.filter((l) => prod(l.p) && Object.values(l.q).some((x) => x > 0)); if (!val.length) { toast('Digite a quantidade que chegou.', true); return; }
      const forn = $('#fc-forn', j).value.trim() || 'Sem fornecedor', id = uid('cp');
      if (forn !== 'Sem fornecedor' && !db.fornecedores.some((f) => sa(f.nome) === sa(forn))) db.fornecedores.push({ id: uid('f'), nome: forn, tel: '' });
      let total = 0; const itens = [];
      val.forEach((l) => { const p = prod(l.p), custo = l.custo ?? p.custo; Object.entries(l.q).forEach(([k, q]) => { if (q > 0) { const [cor, tm] = k.split('|'); mover(p, cor, tm, q, 'entrada', id, `Compra de ${forn}`); total += q * custo; } }); itens.push({ p: p.id, qtd: Object.values(l.q).reduce((a, x) => a + x, 0), custo }); p.custo = custo; });
      db.compras.push({ id, data: $('#fc-data', j).value || hoje(), forn, itens, total, forma: $('#fc-forma', j).value.trim(), obs: $('#fc-obs', j).value.trim() });
      grava(); fechar(); mostra(); toast(`Entrada de ${itens.reduce((s, x) => s + x.qtd, 0)} peças registrada.`);
    };
  }, true);
}

// ------------------------------------------------------------------ ações: caixa
function movCaixa(tipo) {
  if (!pode('caixa')) return pedirSenha('Mexer no caixa precisa da senha da dona.', () => movCaixaOk(tipo));
  movCaixaOk(tipo);
}
function movCaixaOk(tipo) {
  const nome = { despesa: 'Despesa', retirada: 'Retirada', reforco: 'Reforço de troco' }[tipo];
  abrir(`<h2>${nome}</h2><div class="campos" style="margin-top:12px"><label class="campo">Valor (R$)<input id="mc-v" inputmode="decimal"></label>${tipo === 'despesa' ? `<label class="campo">Pago com<select id="mc-f"><option value="dinheiro">Dinheiro da gaveta</option><option value="pix">Pix</option><option value="debito">Cartão</option></select></label>` : ''}<label class="campo inteiro">Descrição<input id="mc-d" list="dl-mc" placeholder="${tipo === 'despesa' ? 'Ex.: sacolas, café, motoboy' : tipo === 'retirada' ? 'Ex.: depósito no banco' : 'Ex.: troco do banco'}"><datalist id="dl-mc"><option value="Sacolas e embalagens"><option value="Café e água"><option value="Motoboy"><option value="Depósito no banco"><option value="Troco"></datalist></label></div>
    <div class="acoes"><button type="button" class="bt cheio" data-ok>Lançar</button></div>`, (j) => {
    $('[data-ok]', j).onclick = () => { const v = lerDin($('#mc-v', j).value); if (v <= 0) { toast('Digite o valor.', true); return; } caixaAtual().movs.push({ id: uid('cm'), t: tipo, v, desc: $('#mc-d', j).value.trim() || nome, data: agora(), f: $('#mc-f', j)?.value || 'dinheiro' }); grava(); fechar(); mostra(); toast(`${nome} lançada.`); };
  });
}
function fecharCaixa() {
  if (!pode('caixa')) return pedirSenha('Fechar o caixa precisa da senha da dona.', fecharCaixaOk);
  fecharCaixaOk();
}
function fecharCaixaOk() {
  const cx = CX().aberto, r = resumoCaixa(cx);
  abrir(`<h2>Fechar o caixa</h2><p class="mudo">Conte o dinheiro da gaveta. O sistema esperava <b>${din(r.esperado)}</b>.</p><label class="campo">Dinheiro contado (R$)<input id="fx-c" inputmode="decimal"></label><p data-dif class="mudo" style="margin:8px 0 0"></p><label class="campo" style="margin-top:10px">Observação<input id="fx-o" placeholder="Ex.: faltou troco"></label>
    <div class="acoes"><button type="button" class="bt cheio" data-ok>Fechar caixa</button></div>`, (j) => {
    $('#fx-c', j).addEventListener('input', (e) => { const d = lerDin(e.target.value) - r.esperado; $('[data-dif]', j).innerHTML = e.target.value ? (d === 0 ? '<span style="color:var(--ok)">Bateu certinho.</span>' : `<span style="color:var(--mal)">${d > 0 ? 'Sobrou' : 'Faltou'} ${din(Math.abs(d))}.</span>`) : ''; });
    $('[data-ok]', j).onclick = () => { if (!$('#fx-c', j).value.trim()) { toast('Digite o dinheiro contado.', true); return; } const c = lerDin($('#fx-c', j).value); CX().historico.push({ ...cx, fechamento: agora(), contado: c, esperado: r.esperado, dif: c - r.esperado, obs: $('#fx-o', j).value.trim(), resumo: r, por: eu().nome }); CX().aberto = null; registra(`Caixa fechado: contado ${din(c)}, esperado ${din(r.esperado)}`, 'caixa'); grava(); fechar(); mostra(); toast(c === r.esperado ? 'Caixa fechado. Bateu certinho.' : `Caixa fechado com diferença de ${din(c - r.esperado)}.`); };
  });
}

// ------------------------------------------------------------------ busca e avisos do topo
$('#bt-busca').onclick = () => abrir(`<h2>Buscar</h2><label class="busca" style="display:block;margin:10px 0"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="bg" placeholder="Nome da cliente ou da peça" autocomplete="off"></label><ul class="lista" data-res></ul>`, (j) => {
  $('#bg', j).addEventListener('input', (e) => { const b = sa(e.target.value); $('[data-res]', j).innerHTML = b.length < 2 ? '' : [...db.clientes.filter((c) => sa(c.nome).includes(b)).slice(0, 6).map((c) => `<li><a class="cresce" href="#cliente/${c.id}" data-fecha style="text-decoration:none;color:inherit"><b>${t(c.nome)}</b><small>Cliente · ${din(aberto(c.id))} em aberto</small></a></li>`), ...ativos().filter((p) => sa(`${p.nome} ${p.cod}`).includes(b)).slice(0, 6).map((p) => `<li>${iconePeca(p)}<a class="cresce" href="#estoque" data-peca-b="${p.id}" style="text-decoration:none;color:inherit"><b>${t(p.nome)}</b><small>Peça · ${totalPecas(p)} em estoque · ${din(p.preco)}</small></a></li>`)].join('') || '<li class="mudo">Nada encontrado.</li>'; });
  j.addEventListener('click', (e) => { if (e.target.closest('[data-fecha]')) fechar(); const pb = e.target.closest('[data-peca-b]'); if (pb) { e.preventDefault(); fechar(); formPeca(prod(pb.dataset.pecaB)); } });
});
$('#bt-avisos').onclick = () => abrir(`<h2>Atenção à sua loja</h2><div style="margin-top:12px">${avisos().map((a) => `<a class="aviso" href="${a.ir}" data-fecha><span class="ic ${a.ic}">${ico(a.ic === 'mal' ? 'alerta' : 'caixa')}</span><span>${t(a.txt)}</span><span class="seta">${ico('seta')}</span></a>`).join('') || '<p class="vazio"><b>Tudo em ordem</b></p>'}</div>`, (j) => { j.addEventListener('click', (e) => { if (e.target.closest('[data-fecha]')) fechar(); }); });

// ------------------------------------------------------------------ cliques e campos
document.addEventListener('click', (e) => {
  const el = e.target.closest('button, a, [data-peca]'); if (!el) return;
  const d = el.dataset, ac = d.acao;
  if (d.escolher) return escolherPeca(prod(d.escolher));
  if (d.verCor) { const p = prod(d.verP), lin = el.closest('.est-linha'), f = lin && $('.est-peca .foto', lin); if (p && f) { f.outerHTML = fotoPeca(p, '', d.verCor); $$('.cor-ver', lin).forEach((b) => b.setAttribute('aria-pressed', String(b === el))); } return; }
  if (d.pick) { const p = prod(d.pick); if (!totalPecas(p)) return toast(`${p.nome} está esgotada. Registre a chegada em Estoque.`, true); estado.sel = novaSel(p); estado.selFechada = false; mostra(); if (celular()) { const x = $('#escolha'), v = $(`[data-pick="${d.pick}"]`); if (v) v.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }); if (x && x.getBoundingClientRect().top > innerHeight - 200) x.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
  if (d.sc && estado.sel) { const p = prod(estado.sel.p); estado.sel.cor = d.sc; if (estado.sel.tam && dispVar(p, d.sc, estado.sel.tam) < 1) estado.sel.tam = null; estado.sel.q = 1; return mostra(); }
  if (d.st && estado.sel) { estado.sel.tam = d.st; estado.sel.q = 1; return mostra(); }
  if (d.sq && estado.sel) { const p = prod(estado.sel.p), max = estado.sel.tam ? dispVar(p, estado.sel.cor, estado.sel.tam) : 1; if (!estado.sel.tam) return toast('Escolha o tamanho.', true); estado.sel.q = Math.max(1, Math.min(max, estado.sel.q + Number(d.sq))); return mostra(); }
  if (d.cat) { estado.cat = d.cat; estado.sel = null; estado.selFechada = false; return mostra(); }
  if (d.rm !== undefined) { estado.sacola.splice(Number(d.rm), 1); if (!estado.sacola.length) estado.excecao = null; ajustaPagamento(); return mostra(); }
  if (d.forma) { estado.dividir = false; estado.pag = [{ f: d.forma, v: totalSacola(), parc: 1 }]; estado.excecao = null; return mostra(); }
  if (d.dm) { if (estado.descModo !== d.dm) { estado.descModo = d.dm; estado.descVal = 0; ajustaPagamento(); } return mostra(); }
  if (d.efCat) { estado.est.cat = d.efCat; return mostra(); }
  if (d.etqCat) { estado.etqCat = d.etqCat; return mostra(); }
  if (d.etqModo) { estado.etqModo = d.etqModo; return mostra(); }
  if (d.editarPeca) { el.closest('details')?.removeAttribute('open'); return formPeca(prod(d.editarPeca)); }
  if (d.arquivarP) { el.closest('details')?.removeAttribute('open'); const p = prod(d.arquivarP); return confirmar(`Arquivar ${p.nome}?`, 'A peça sai do Vender e do estoque, mas o histórico de vendas continua. Dá para voltar em Editar peça.', 'Arquivar', () => { p.arquivado = true; registra(`Peça arquivada: ${p.nome}`, 'estoque'); grava(); mostra(); toast('Peça arquivada.'); }, true); }
  if (d.q !== undefined) { const x = estado.sacola[Number(d.q)]; const p = prod(x.p), novo = x.qtd + Number(d.d); if (novo <= 0) estado.sacola.splice(Number(d.q), 1); else if (Number(d.d) > 0 && qtd(p, x.cor, x.tam) < noCarrinho(x.p, x.cor, x.tam) + 1) toast('Não tem mais desse tamanho.', true); else x.qtd = novo; ajustaPagamento(); return mostra(); }
  if (d.tira !== undefined) { estado.pag.splice(Number(d.tira), 1); ajustaPagamento(); return mostra(); }
  if (d.venda) return comprovante(db.vendas.find((v) => v.id === d.venda));
  if (d.devolver) { fechar(); return devolver(db.vendas.find((v) => v.id === d.devolver)); }
  if (d.receber) return receber(cli(d.receber));
  if (d.cobra) return cobrar(cli(d.cobra));
  if (d.recibo) return recibo(db.pagamentos.find((p) => p.id === d.recibo));
  if (d.renegociar) return renegociar(cli(d.renegociar));
  if (d.extrato) return extrato(cli(d.extrato));
  if (d.editarCli) return formCliente(cli(d.editarCli));
  if (d.limite) { const c = cli(d.limite); return abrir(`<h2>Limite de ${t(c.nome)}</h2><p class="mudo">Hoje ela deve ${din(aberto(c.id))}.</p><label class="campo">Novo limite (R$)<input id="nl" inputmode="decimal" value="${campoDin(c.limite)}"></label><div class="acoes"><button type="button" class="bt cheio" data-ok>Salvar</button></div>`, (j) => { $('[data-ok]', j).onclick = () => { c.limite = lerDin($('#nl', j).value); grava(); fechar(); mostra(); toast('Limite salvo.'); }; }); }
  if (d.bloq) { const c = cli(d.bloq); c.bloqueado = !c.bloqueado; grava(); mostra(); return toast(c.bloqueado ? `${c.nome} bloqueada no crediário (à vista continua).` : `${c.nome} liberada no crediário.`); }
  if (d.ff) { estado.fiadoFiltro = d.ff; location.hash = '#fiado'; return mostra(); }
  if (d.ea) { estado.estoqueAba = d.ea; location.hash = `#estoque/${d.ea === 'parados' ? 'paradas' : d.ea}`; return; }
  if (d.per) { estado.relPer = d.per; return mostra(); }
  if (d.transf) { el.closest('details')?.removeAttribute('open'); return formTransf(prod(d.transf)); }
  if (d.peca && !e.target.closest('button, details, a')) return formPeca(prod(d.peca));
  if (d.repor) { el.closest('details')?.removeAttribute('open'); return formCompra(d.repor); }
  if (d.mov) return movCaixa(d.mov);
  if (d.nota) { fechar(); return mostrarNota(db.notas.find((x) => x.id === d.nota)); }
  if (d.emitir) { const v = db.vendas.find((x) => x.id === d.emitir); fechar(); return folhaEmitir(v); }
  if (d.cancelaNota) { fechar(); return cancelarNota(db.notas.find((x) => x.id === d.cancelaNota)); }
  if (d.ca) { estado.comprasAba = d.ca; if (!location.hash.startsWith('#compras')) location.hash = '#compras'; return mostra(); }
  if (d.receberPedido) return receberPedido(db.pedidos.find((x) => x.id === d.receberPedido));
  if (d.cancelarPedido) { const pd = db.pedidos.find((x) => x.id === d.cancelarPedido); return confirmar('Cancelar o que falta deste pedido?', 'O que já chegou continua no estoque. O resto sai do pedido.', 'Cancelar o resto', () => { pd.itens.forEach((it) => { it.q = { ...(it.rec || {}) }; }); pd.status = 'recebido'; registra(`Pedido nº ${pd.n}: o que faltava foi cancelado`, 'compra'); grava(); mostra(); }, true); }
  if (d.etiquetas) { el.closest('details')?.removeAttribute('open'); return etiquetas(prod(d.etiquetas)); }
  if (d.tiraPromo) { db.promos = db.promos.filter((x) => x.id !== d.tiraPromo); grava(); mostra(); return toast('Promoção tirada.'); }
  if (d.entrarComo) { db.usuario = d.entrarComo; grava(); registra(`Entrou como ${eu().nome} (demonstração)`, 'acesso'); location.hash = d.entrarComo === 'u1' ? '#dono' : '#inicio'; mostra(); return toast(`Agora você vê o sistema como ${eu().nome.split(' ')[0]}.`); }
  if (d.abrirEm) { eu().abrirEm = d.abrirEm; grava(); mostra(); return toast('Salvo.'); }
  if (el.closest('.add-menu')) el.closest('details').removeAttribute('open');
  if (d.como) return comoUsar(d.como);
  if (d.tema && el.closest('.temas')) { db.tema = d.tema; grava(); mostra(); return toast(`Cor ${TEMAS.find((x) => x[0] === d.tema)[1].toLowerCase()} aplicada.`); }
  if (!ac) return;
  ({
    esvaziar: () => { estado.sacola = []; estado.excecao = null; ajustaPagamento(); mostra(); },
    dividir: () => { const falta = totalSacola() - estado.pag.reduce((s, x) => s + (x.v || 0), 0); estado.pag.push({ f: estado.pag.some((x) => x.f === 'fiado') ? 'dinheiro' : 'fiado', v: Math.max(0, falta) }); mostra(); },
    completar: () => { const falta = totalSacola() - estado.pag.reduce((s, x) => s + (x.v || 0), 0), u = estado.pag[estado.pag.length - 1]; u.v = Math.max(0, (u.v || 0) + falta); mostra(); },
    excecao: liberarExcecao, finalizar: finalizarVenda,
    'por-sel': () => {
      const s2 = estado.sel; if (!s2) return; const p = prod(s2.p);
      if (!s2.tam) { toast('Escolha o tamanho.', true); return; }
      if (dispVar(p, s2.cor, s2.tam) < s2.q) { toast(`Só tem ${Math.max(0, dispVar(p, s2.cor, s2.tam))} de ${s2.cor} ${s2.tam}.`, true); return; }
      const ja = estado.sacola.find((x) => x.p === p.id && x.cor === s2.cor && x.tam === s2.tam);
      if (ja) ja.qtd += s2.q; else estado.sacola.push({ p: p.id, nome: p.nome, cor: s2.cor, tam: s2.tam, h: (p.cores.find((x) => x.n === s2.cor) || {}).h, qtd: s2.q, preco: precoAtual(p), cheio: p.preco, custo: p.custo });
      toast(`${p.nome} (${s2.cor}, ${s2.tam}) na sacola.`); estado.sel = { ...s2, tam: null, q: 1 }; ajustaPagamento(); mostra();
    },
    'fecha-sel': () => { estado.sel = null; estado.selFechada = true; mostra(); },
    leitor: () => { const n = $('#pdv-busca'); if (n) { n.value = ''; estado.busca = ''; n.focus(); } toast('Pode passar o leitor: o código entra na busca e a peça vai direto para a sacola, com cor e tamanho.'); },
    'limpa-cli': () => { estado.vCli = ''; estado.excecao = null; mostra(); },
    'busca-cli': () => abrir(`<h2>Escolher a cliente</h2><label class="busca" style="display:block;margin:10px 0"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><input id="bc" placeholder="Nome ou telefone" autocomplete="off"></label><ul class="lista" data-res></ul><div class="acoes"><button type="button" class="bt" data-nova>${icb('maisCirc')}Cadastrar cliente nova</button></div>`, (j) => {
      const lista = (b) => db.clientes.filter((c) => !b || sa(`${c.nome} ${c.tel}`).includes(b)).sort((a, z) => comprasCli(z.id) - comprasCli(a.id)).slice(0, 12).map((c) => `<li>${fotoCli(c)}<button type="button" class="cresce linha-bt" data-esc-cli="${t(c.nome)}"><b>${t(c.nome)}</b><small>Compras: ${din(comprasCli(c.id))}${vip(c) ? ' · Cliente VIP' : ''}</small></button></li>`).join('') || '<li class="mudo">Ninguém com esse nome.</li>';
      $('[data-res]', j).innerHTML = lista(''); $('#bc', j).addEventListener('input', (e) => { $('[data-res]', j).innerHTML = lista(sa(e.target.value)); });
      j.addEventListener('click', (e) => { const b = e.target.closest('[data-esc-cli]'); if (b) { estado.vCli = b.dataset.escCli; estado.excecao = null; fechar(); mostra(); } if (e.target.closest('[data-nova]')) { fechar(); formCliente(); } });
    }),
    dividir2: () => {
      if (estado.dividir) { estado.dividir = false; estado.pag = [{ f: (estado.pag[0] || {}).f || 'pix', v: totalSacola() }]; }
      else { const tot = totalSacola(), a = Math.round(tot / 2 / 100) * 100, f0 = (estado.pag[0] || {}).f || 'pix'; estado.dividir = true; estado.pag = [{ f: f0, v: a }, { f: f0 === 'pix' ? 'credito' : 'pix', v: tot - a }]; }
      estado.excecao = null; mostra();
    },
    'ver-niver': () => { const l = aniversariantes(31); abrir(`<h2>Aniversariantes</h2><p class="mudo">Os próximos 30 dias. Mande os parabéns com um mimo: é a mensagem que mais traz cliente de volta.</p><ul class="lista niver-l">${l.map((x) => `<li>${fotoCli(x.c)}<a class="cresce" href="#cliente/${x.c.id}" data-fecha><b>${t(x.c.nome)}</b><small>${quandoNiver(x)} · compras ${din(comprasCli(x.c.id))}</small></a>${x.c.tel ? `<a class="bt-presente" href="${zap(x.c.tel, msgNiver(x.c))}" target="_blank" rel="noopener" aria-label="Mandar parabéns para ${t(x.c.nome)}">${icb('presente')}</a>` : ''}</li>`).join('') || '<li class="mudo">Nenhum aniversário nos próximos 30 dias. Ponha a data no cadastro da cliente.</li>'}</ul>`, (j) => { j.addEventListener('click', (e) => { if (e.target.closest('[data-fecha]')) fechar(); }); }); },
    'etq-todas': () => { const b = sa(estado.etqBusca || ''), cat = estado.etqCat || 'Todas', l = ativos().filter((p) => (cat === 'Todas' || p.cat === cat) && (!b || sa(`${p.nome} ${p.cod} ${p.cat}`).includes(b))), m = estado.etqSel ||= {}, todas = l.every((p) => m[p.id]); l.forEach((p) => { m[p.id] = !todas; }); mostra(); },
    'etq-imprimir': () => { const m = estado.etqSel || {}, l = []; Object.keys(m).filter((k) => m[k] && prod(k)).forEach((k) => { const p = prod(k); p.cores.forEach((c) => p.tam.forEach((tm) => { const n = (estado.etqModo || 'estoque') === 'estoque' ? Math.max(0, qtd(p, c.n, tm)) : 1; for (let i = 0; i < Math.min(200, n); i++) l.push({ p, cor: c.n, tam: tm }); })); }); if (imprimirEtiquetas(l)) registra(`${l.length} etiquetas impressas`, 'estoque'); },
    transferir: () => { if (!variasLojas()) return confirmar('Transferir entre lojas', 'Para transferir peças, cadastre a segunda loja em Configurações, “Lojas”. Cada loja tem o próprio estoque e o próprio caixa.', 'Ir para Configurações', () => { location.hash = '#config'; }); abrir(`<h2>Transferir entre lojas</h2><p class="mudo">Qual peça vai de uma loja para a outra?</p><label class="campo">Peça<input id="tp" list="dl-tp" placeholder="Nome ou código"><datalist id="dl-tp">${ativos().map((p) => `<option value="${t(p.nome)}">`).join('')}</datalist></label><div class="acoes"><button type="button" class="bt cheio" data-ok>Continuar</button></div>`, (j) => { $('[data-ok]', j).onclick = () => { const v = sa($('#tp', j).value), p = ativos().find((x) => sa(x.nome) === v || sa(x.cod) === v); if (!p) { toast('Escolha uma peça da lista.', true); return; } fechar(); formTransf(p); }; }); },
    'ir-vender': () => { location.hash = '#vender'; }, 'xml-notas': () => baixar(`notas-${hoje()}.csv`, csv([['Número', 'Série', 'Data', 'Chave', 'CPF', 'Valor', 'Situação'], ...db.notas.map((n) => [n.numero, n.serie, `${dataBR(n.data)} ${horaBR(n.data)}`, n.chave, n.cpf, campoDin(n.valor), n.status])])), 'novo-pedido': formPedido, 'nova-promo': formPromo, 'conferir-extrato': conferirExtrato, 'fiado-caderno': fiadoCaderno, 'passar-caderno': passarCaderno, ajuda: () => window.open(`https://wa.me/5516991500746?text=${encodeURIComponent(`Olá! Uso o Peplo na ${db.loja.nome} e preciso de ajuda.`)}`, '_blank', 'noopener'), 'receber-escolher': receberEscolher,
    'mov-despesa': () => movCaixa('despesa'), 'mov-retirada': () => movCaixa('retirada'), 'mov-reforco': () => movCaixa('reforco'),
    'importar-clientes': () => importar('clientes'), 'importar-pecas': () => importar('pecas'), instalar,
    'nova-loja': () => { if (!dona()) return toast('Só a dona cadastra lojas.', true); db.lojas.push({ id: uid('l'), nome: `Loja ${db.lojas.length + 1}` }); registra('Loja nova cadastrada', 'geral'); grava(); mostra(); toast('Loja criada. Dê o nome dela e transfira as peças em Estoque.'); },
    'tira-foto-eu': () => { eu().foto = ''; grava(); mostra(); },
    como: () => comoUsar(($('#principal').dataset.tela) || 'inicio'),
    'trocar-senha': () => { if (!window.veltriaNuvem) return; window.veltriaNuvem.trocarSenha().then((e) => toast(`Mandamos o link para criar a senha nova em ${e}.`)).catch((x) => toast(x.message || 'Não deu para mandar agora.', true)); },
    'sair-conta': () => confirmar('Sair da conta?', 'O que você fez já está salvo na nuvem. Para voltar, entre com o seu e-mail e a senha.', 'Sair', () => window.veltriaNuvem && window.veltriaNuvem.sair()),
    'salvar-pin': async () => { const p = ($('#pin-novo') || {}).value || ''; if (!/^\d{4}$/.test(p)) { toast('A senha tem 4 números.', true); return; } eu().pin = await resumoPin(p); grava(); mostra(); toast('Senha salva.'); },
    'novo-usuario': () => abrir(`<h2>Pessoa da equipe</h2><p class="mudo">Na conta de verdade ela recebe o convite e entra com o próprio login.</p><div class="campos"><label class="campo inteiro">Nome<input id="nu-n"></label><label class="campo">WhatsApp<input id="nu-t" inputmode="tel"></label><label class="campo">Desconto sem pedir (%)<input id="nu-d" type="number" min="0" max="100" value="5"></label></div><div class="acoes"><button type="button" class="bt cheio" data-ok>Pôr na equipe</button></div>`, (j) => { $('[data-ok]', j).onclick = () => { const n = $('#nu-n', j).value.trim(); if (n.length < 2) { toast('Escreva o nome.', true); return; } db.usuarios.push({ id: uid('u'), nome: n, perfil: 'vendedora', tel: telLimpo($('#nu-t', j).value), email: '', foto: '', nasc: '', descMax: Number($('#nu-d', j).value) || 0, perms: {}, pin: '' }); registra(`${n} entrou na equipe`, 'equipe'); grava(); fechar(); mostra(); toast(`${n} está na equipe.`);
      // na conta, o convite de verdade (login próprio) sai pela equipe da nuvem; sem isso a pessoa ficava só na lista
      if (emConta() && window.veltriaAbrir && window.veltriaAbrir.convidar) window.veltriaAbrir.convidar(); }; }),
    'nova-cli': () => formCliente(), 'nova-peca': () => formPeca(), 'nova-compra': () => formCompra(),
    'novo-forn': () => abrir(`<h2>Novo fornecedor</h2><div class="campos" style="margin-top:12px"><label class="campo">Nome<input id="nf-n"></label><label class="campo">WhatsApp<input id="nf-t" inputmode="tel"></label></div><div class="acoes"><button type="button" class="bt cheio" data-ok>Salvar</button></div>`, (j) => { $('[data-ok]', j).onclick = () => { const n = $('#nf-n', j).value.trim(); if (!n) { toast('Escreva o nome.', true); return; } db.fornecedores.push({ id: uid('f'), nome: n, tel: telLimpo($('#nf-t', j).value) }); grava(); fechar(); mostra(); }; }),
    'abrir-caixa': () => { CX().aberto = { id: uid('cx'), abertura: agora(), inicial: lerDin($('#cx-ini').value), movs: [] }; grava(); mostra(); toast('Caixa aberto.'); },
    'fechar-caixa': fecharCaixa,
    'tira-logo': () => { db.loja.logo = ''; grava(); mostra(); },
    backup: () => { baixar(`peplo-copia-${hoje()}.json`, JSON.stringify(db), 'application/json'); toast('Cópia baixada. Guarde o arquivo.'); },
    recomecar: () => confirmar('Recomeçar a demonstração?', 'Os dados de exemplo voltam ao começo neste aparelho.', 'Recomeçar', () => { localStorage.removeItem(CHAVE); location.replace(location.pathname); }, true),
    imprimir: () => print(),
    'csv-vendas': () => { const [i, f] = periodo(estado.relPer, estado.relDe, estado.relAte); baixar(`vendas-${i}-a-${f}.csv`, csv([['Nº', 'Data', 'Cliente', 'Peças', 'Subtotal', 'Desconto', 'Total', 'Pagamento'], ...numeros(i, f).vs.map((v) => [v.n, `${dataBR(v.data)} ${horaBR(v.data)}`, v.cli ? (cli(v.cli) || {}).nome : '', v.itens.map((x) => `${x.qtd}x ${x.nome} ${x.cor} ${x.tam}`).join(' | '), campoDin(v.sub), campoDin(v.desc), campoDin(v.total), v.pag.map((x) => `${FORMAS[x.f]} ${campoDin(x.v)}`).join(' + ')])])); },
    'exportar-fiado': () => baixar(`fiado-${hoje()}.csv`, csv([['Cliente', 'Telefone', 'Em aberto', 'Vencido', 'Maior atraso (dias)', 'Limite', 'Situação'], ...devedoras().map((c) => [c.nome, c.tel, campoDin(aberto(c.id)), campoDin(vencido(c.id)), maiorAtraso(c.id), campoDin(c.limite), situacao(c).txt])])),
    'exportar-estoque': () => baixar(`estoque-${hoje()}.csv`, csv([['Peça', 'Código', 'Categoria', 'Cor', 'Tamanho', 'Quantidade', 'Custo', 'Preço'], ...ativos().flatMap((p) => p.cores.flatMap((c) => p.tam.map((tm) => [p.nome, p.cod, p.cat, c.n, tm, qtd(p, c.n, tm), campoDin(p.custo), campoDin(p.preco)])))])),
  }[ac] || (() => {}))();
});
// leitor de código de barras: digita o código e aperta Enter no campo de busca do Vender
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.target.id !== 'pdv-busca') return;
  const a = acharCodigo(e.target.value); if (!a) return;
  e.preventDefault(); if (qtd(a.p, a.cor, a.tam) - noCarrinho(a.p.id, a.cor, a.tam) < 1) { toast(`Sem estoque de ${a.p.nome} ${a.cor} ${a.tam}.`, true); return; }
  const ja = estado.sacola.find((x) => x.p === a.p.id && x.cor === a.cor && x.tam === a.tam);
  if (ja) ja.qtd++; else estado.sacola.push({ p: a.p.id, nome: a.p.nome, cor: a.cor, tam: a.tam, h: (a.p.cores.find((x) => x.n === a.cor) || {}).h, qtd: 1, preco: precoAtual(a.p), cheio: a.p.preco, custo: a.p.custo });
  estado.busca = ''; ajustaPagamento(); mostra(); const n = $('#pdv-busca'); if (n) n.focus(); toast(`${a.p.nome} (${a.cor}, ${a.tam}) na sacola.`);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.closest('[data-peca]') && e.target.matches('[data-peca]')) formPeca(prod(e.target.dataset.peca)); });
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.id === 'etq-busca') { estado.etqBusca = el.value; const pos = el.selectionStart; mostra(); const n = $('#etq-busca'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
  if (el.id === 'pdv-busca' || el.id === 'est-busca') { estado.busca = el.value; const pos = el.selectionStart; mostra(); const n = $(`#${el.id}`); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
  if (el.id === 'cli-busca') { estado.cliBusca = el.value; const pos = el.selectionStart; mostra(); const n = $('#cli-busca'); n.focus(); n.setSelectionRange(pos, pos); }
});
document.addEventListener('change', (e) => {
  const el = e.target, d = el.dataset;
  if (el.id === 'v-cli') { estado.vCli = el.value; estado.excecao = null; mostra(); }
  if (el.id === 'v-nota') { estado.nota = el.checked; }
  if (el.id === 'v-cpf') { estado.cpf = el.value; }
  if (el.id === 'v-desc') { estado.descVal = estado.descModo === 'rs' ? lerDin(el.value) : Math.min(100, Math.max(0, Number(String(el.value).replace(',', '.').replace(/[^\d.]/g, '')) || 0)); ajustaPagamento(); mostra(); }
  if (el.matches('[data-meta-mes]')) { estado.metaMes = el.value; mostra(); }
  if (d.ef) { estado.est[d.ef] = el.value || (d.ef === 'cat' ? 'Todas' : ''); mostra(); }
  if (d.efB) { estado.est[d.efB] = el.checked; mostra(); }
  if (d.etqP) { (estado.etqSel ||= {})[d.etqP] = el.checked; mostra(); }
  if (d.metaM) { const v = lerDin(el.value); if (v) db.metas[d.metaM] = v; else delete db.metas[d.metaM]; if (d.metaM === mesAtual()) db.meta = v; grava(); toast('Meta salva.'); }
  if (d.pf !== undefined) { estado.pag[Number(d.pf)].f = el.value; estado.excecao = null; mostra(); }
  if (d.pv !== undefined) { estado.pag[Number(d.pv)].v = lerDin(el.value); mostra(); }
  if (d.pp !== undefined) { estado.pag[Number(d.pp)].parc = Number(el.value); mostra(); }
  if (el.id === 'p-n') { estado.parc.n = Number(el.value); mostra(); }
  if (el.id === 'p-int') { estado.parc.int = el.value; mostra(); }
  if (el.id === 'p-prim') { estado.parc.prim = el.value || somaMes(hoje(), 1); mostra(); }
  if (el.id === 'rel-de') { estado.relDe = el.value; mostra(); }
  if (el.id === 'rel-ate') { estado.relAte = el.value; mostra(); }
  if (d.loja) { db.loja[d.loja] = d.loja === 'tel' ? telLimpo(el.value) : el.value.trim(); grava(); marca(); toast('Salvo.'); }
  if (d.filialNome) { const l = db.lojas.find((x) => x.id === d.filialNome), n = el.value.trim(); if (l && n) { l.nome = n; grava(); marca(); toast('Nome da loja salvo.'); } }
  if (el.matches('[data-filial-atual]')) { try { localStorage.setItem('peplo-loja', el.value); } catch (e) { /* sem armazenamento */ } marca(); mostra(); toast(`Este aparelho agora vende pela ${nomeLoja(el.value)}.`); }
  if (d.cfg) { db.cfg[d.cfg] = d.cfg === 'comissaoPct' ? Math.min(50, Math.max(0, Number(el.value) || 0)) : Math.max(1, Number(el.value) || 1); grava(); toast('Regra salva.'); }
  if (d.cfgd) { db.cfg[d.cfgd] = lerDin(el.value); grava(); toast('Regra salva.'); }
  if (d.cfgb) { db.cfg[d.cfgb] = el.checked; grava(); marca(); toast('Regra salva.'); }
  if (d.juros) { db.cfg.juros[d.juros] = d.juros === 'ativo' ? el.checked : Math.max(0, Number(el.value) || 0); if (d.juros === 'multaPct') db.cfg.juros.multaPct = Math.min(2, db.cfg.juros.multaPct); grava(); if (d.juros === 'ativo') mostra(); toast('Regra salva.'); }
  if (d.fiscal) { db.fiscal[d.fiscal] = ['serie', 'proximo'].includes(d.fiscal) ? Math.max(1, Number(el.value) || 1) : el.value.trim(); grava(); toast('Dado fiscal salvo.'); }
  if (d.taxa) { db.cfg.taxas[d.taxa] = Math.max(0, Number(el.value) || 0); grava(); toast('Taxa salva.'); }
  if (d.parado !== undefined) { db.cfg.parados[Number(d.parado)] = Math.max(1, Number(el.value) || 1); db.cfg.parados.sort((a, b) => a - b); grava(); toast('Faixas salvas.'); }
  if (d.msg) { db.cfg.msgs = db.cfg.msgs || {}; const v = el.value.trim(); if (!v || v === MSGS[d.msg].sug) delete db.cfg.msgs[d.msg]; else db.cfg.msgs[d.msg] = v; grava(); toast('Mensagem salva.'); }
  if (d.eu) { eu()[d.eu] = d.eu === 'tel' ? telLimpo(el.value) : el.value.trim(); grava(); marca(); toast('Perfil salvo.'); }
  if (el.id === 'foto-eu' && el.files?.[0]) lerFoto(el.files[0], 192).then((u) => { eu().foto = u; grava(); mostra(); toast('Foto no perfil.'); }).catch((x) => toast(x.message, true));
  if (el.dataset.meta !== undefined && el.matches('[data-meta]')) { db.meta = lerDin(el.value); db.metas[mesAtual()] = db.meta; grava(); mostra(); toast('Meta salva.'); }
  if (d.perm) { const [uidp, k] = d.perm.split('.'), u = db.usuarios.find((x) => x.id === uidp); u.perms = u.perms || {}; u.perms[k] = el.checked; registra(`${u.nome}: ${el.checked ? 'pode' : 'não pode mais'} ${PERMS.find((p) => p[0] === k)[1].toLowerCase()}`, 'permissao'); grava(); toast('Permissão salva.'); }
  if (d.comissao) { const u = db.usuarios.find((x) => x.id === d.comissao); u.comissao = Math.min(50, Math.max(0, Number(el.value) || 0)); grava(); mostra(); toast('Comissão salva.'); }
  if (d.descMax) { const u = db.usuarios.find((x) => x.id === d.descMax); u.descMax = Math.min(100, Math.max(0, Number(el.value) || 0)); grava(); toast('Limite de desconto salvo.'); }
  if (el.id === 'logo-in' && el.files?.[0]) lerFoto(el.files[0]).then((u) => { db.loja.logo = u; grava(); mostra(); toast('Logo da loja no topo.'); }).catch((x) => toast(x.message, true));
  if (el.id === 'backup-in' && el.files?.[0]) {
    el.files[0].text().then((txt) => { const x = JSON.parse(txt); if (!x || !Array.isArray(x.produtos) || !Array.isArray(x.clientes) || !Array.isArray(x.vendas) || !Array.isArray(x.parcelas)) throw new Error('arquivo'); confirmar('Carregar a cópia?', `A cópia tem ${x.clientes.length} clientes, ${x.produtos.length} peças e ${x.vendas.length} vendas. Ela substitui o que está agora neste aparelho.`, 'Carregar', () => { db = x; grava(); mostra(); toast('Cópia carregada.'); }); })
      .catch(() => toast('Esse arquivo não é uma cópia do Peplo.', true));
  }
});
// simulação da assinatura na demonstração (a conta de verdade é tratada pela base)
addEventListener('message', (e) => { if (e.origin === location.origin && e.data && e.data.simular === 'normal') { mostra(); } });
$('#bt-instalar').onclick = instalar;
// menu do usuário no topo: perfil, painel do dono, guia, ajuda e instalar
function menuEu(abre) {
  const m = $('#eu-menu'), b = $('#topo-eu'), u = eu(); if (!m) return;
  if (!abre) { m.hidden = true; b.setAttribute('aria-expanded', 'false'); return; }
  m.innerHTML = `<p class="eu-quem"><b>${t(u.nome)}</b><small>${u.perfil === 'dona' ? 'Dona da loja' : 'Vendedora'} · ${t(db.loja.nome)}</small></p><a href="#perfil">${icb('perfil')}Meu perfil</a>${dona() ? `<a href="#dono">${icb('dono')}Painel do dono</a>` : ''}<a href="#config">${icb('config')}Configurações</a><a href="#guia">${icb('guia')}Guia de como usar</a><button type="button" data-acao="ajuda">${icb('ajuda')}Falar com a gente</button><button type="button" data-acao="instalar">${icb('instalar')}Instalar o app</button>`;
  m.hidden = false; b.setAttribute('aria-expanded', 'true');
}
$('#topo-eu').addEventListener('click', (e) => { e.stopPropagation(); menuEu($('#eu-menu').hidden); });
document.addEventListener('click', (e) => { if (!e.target.closest('.topo-eu-box') || e.target.closest('#eu-menu a, #eu-menu button')) menuEu(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') menuEu(false); });
// F2 vender · F8 nova peça · F12 finalizar a venda
addEventListener('keydown', (e) => {
  if (!['F2', 'F8', 'F12'].includes(e.key) || !$('#camada').hidden) return;
  const tela = (location.hash.slice(1) || 'inicio').split('/')[0];
  if (e.key === 'F2') { e.preventDefault(); if (tela !== 'vender') location.hash = '#vender'; setTimeout(() => { const n = $('#pdv-busca'); if (n) n.focus(); }, 60); }
  if (e.key === 'F8') { e.preventDefault(); formPeca(); }
  if (e.key === 'F12' && (tela === 'vender' || tela === 'sacola') && estado.sacola.length) { e.preventDefault(); finalizarVenda(); }
});
addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#bt-busca').click(); } });
// ao vivo: as telas de números se atualizam sozinhas (sem atrapalhar quem está digitando ou com uma janela aberta)
setInterval(() => { const n = (location.hash.slice(1) || 'inicio').split('/')[0]; if (['inicio', 'relatorios', 'caixa', 'dono', 'fiado'].includes(n) && $('#camada').hidden && !document.activeElement.matches('input,textarea,select') && !document.querySelector('details.add[open]')) mostra(); }, 20000);
// abre na tela que a pessoa escolheu no perfil
if (!location.hash && eu().abrirEm && eu().abrirEm !== 'inicio') location.hash = `#${eu().abrirEm}`;
if (new URLSearchParams(location.search).has('instalar')) setTimeout(instalar, 900);
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); location.replace(location.pathname); });
if ('serviceWorker' in navigator && window === window.top) navigator.serviceWorker.register('sw.js').catch(() => {});
rota();
