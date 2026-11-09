// Annona · controle de estoque e de vendas do mercadinho, da mercearia e do empório.
// Código de barras (leitor ou câmera), validade por lote, entrada pela nota do fornecedor (XML), estoque mínimo e lista de compras,
// venda no balcão (dinheiro, Pix, cartão e fiado), histórico e cancelamento de venda, fiado com limite e cobrança no WhatsApp,
// perdas e quebras, inventário pelo celular, produtos parados, quantos dias o estoque dura, caixa do dia e lucro por produto.
// Dinheiro sempre em centavos (inteiros). Quantidade em unidades ou kg.
// Dados neste navegador; na conta, o conta-nuvem.js leva cada alteração para a nuvem. ?novo recomeça a demonstração.

import { qrSVG } from '../base/qr.js';
import { pixCopiaECola } from '../base/pix.js';

const CHAVE = 'annona-v1';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const t = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const din = (c) => (Math.round(c || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
// "1.234,56", "1234,56", "1234.56", "R$ 50" -> centavos
const lerDin = (v) => { let s = String(v ?? '').replace(/[^\d,.-]/g, ''); if (!s) return 0; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const n = Number(s); return Number.isFinite(n) ? Math.round(n * 100) : 0; };
const lerNum = (v) => { let s = String(v ?? '').trim().replace(/[^\d,.-]/g, ''); if (!s) return 0; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const n = Number(s); return Number.isFinite(n) ? n : 0; };
const campoDin = (c) => (c ? (c / 100).toFixed(2).replace('.', ',') : '');
const r3 = (n) => Math.round((n || 0) * 1000) / 1000;
const numBR = (n, casas = 3) => r3(n).toLocaleString('pt-BR', { maximumFractionDigits: casas });
let seq = 0;
const uid = (p = 'x') => `${p}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const pad = (n) => String(n).padStart(2, '0');
const isoD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoje = () => isoD(new Date());
const somaDias = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoD(new Date(y, m - 1, d + n)); };
const dias = (de, ate = hoje()) => Math.round((new Date(`${ate}T12:00`) - new Date(`${String(de).slice(0, 10)}T12:00`)) / 864e5);
const dataBR = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');
const horaBR = (iso) => (iso && iso.length > 10 ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
// horário local, sem fuso: com toISOString a venda das 21h em diante caía no dia seguinte
const agora = () => { const d = new Date(); return `${isoD(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const telLimpo = (tel) => String(tel || '').replace(/\D/g, '');
const zap = (tel, m) => `https://wa.me/${telLimpo(tel).length >= 12 ? '' : '55'}${telLimpo(tel)}?text=${encodeURIComponent(m)}`;
const FORMAS = { dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Débito', credito: 'Crédito', fiado: 'Fiado' };
const UN = { un: 'un', kg: 'kg', cx: 'cx', gf: 'garrafa' };
const MOTIVOS = ['Venceu', 'Quebrou', 'Estragou', 'Consumo da casa', 'Sumiu', 'Ajuste de inventário', 'Outro'];

// EAN-13 com dígito verificador certo (os códigos da demonstração passam no leitor de verdade)
function ean13(base12) { const d = String(base12).padStart(12, '0').slice(0, 12); let s = 0; for (let i = 0; i < 12; i++) s += Number(d[i]) * (i % 2 ? 3 : 1); return d + ((10 - (s % 10)) % 10); }
const eanValido = (c) => /^\d{13}$/.test(c) && ean13(c.slice(0, 12)) === c;

// ------------------------------------------------------------------ código de barras desenhado (SVG feito aqui, sem biblioteca)
// EAN-13 quando os 13 números conferem no dígito verificador, EAN-8 com 8, e Code 128 para qualquer outro código
// (interno, de 12 números, com letras ou com o dígito errado). Só lê p.cod: nada é gravado nem convertido.
const dvGS1 = (d) => { let s = 0; for (let i = 0; i < d.length; i++) s += Number(d[d.length - 1 - i]) * (i % 2 ? 1 : 3); return (10 - (s % 10)) % 10; };
const ean8Valido = (c) => /^\d{8}$/.test(c) && dvGS1(c.slice(0, 7)) === Number(c[7]);
const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_R = EAN_L.map((x) => [...x].map((b) => (b === '1' ? '0' : '1')).join(''));
const EAN_G = EAN_R.map((x) => [...x].reverse().join(''));
const EAN_PAR = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
const C128 = ['212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412', '211214', '211232', '2331112'];
// qual desenho cada código ganha, e um aviso quando o número parece EAN mas o último dígito não confere
function tipoBarras(cod) {
  const c = String(cod ?? '').trim();
  if (!c) return { tipo: '', c };
  if (eanValido(c)) return { tipo: 'EAN-13', c };
  if (ean8Valido(c)) return { tipo: 'EAN-8', c };
  if (!/^[\x20-\x7E]+$/.test(c) || c.length > 48) return { tipo: '', c, erro: 'Esse código tem letras ou símbolos que não dá para desenhar. Use só números e letras sem acento.' };
  const aviso = /^\d{13}$/.test(c) ? `O último número não confere (pelo EAN-13 seria ${ean13(c.slice(0, 12)).slice(-1)}). Confira o código da embalagem; enquanto isso, a etiqueta sai em Code 128.`
    : /^\d{8}$/.test(c) ? `O último número não confere (pelo EAN-8 seria ${dvGS1(c.slice(0, 7))}). A etiqueta sai em Code 128.` : '';
  return { tipo: 'Code 128', c, aviso };
}
// Code 128: conjunto C (pares de números) quando o código é só número com quantidade par; senão conjunto B
function code128(c) {
  const so = /^\d+$/.test(c) && c.length % 2 === 0 && c.length >= 4;
  const v = so ? [105, ...c.match(/\d\d/g).map(Number)] : [104, ...[...c].map((x) => x.charCodeAt(0) - 32)];
  const ck = v.reduce((s, x, i) => s + x * (i || 1), 0) % 103;
  return [...v, ck, 106].map((x) => C128[x]).join('');
}
// devolve o SVG (barras pretas em fundo branco, em unidades de módulo) ou '' quando não dá para desenhar.
// alt = altura das barras em módulos; o número legível vai embaixo, como na embalagem.
function barrasSVG(cod, { alt = 50, numeros = true, cls = 'barras' } = {}) {
  const { tipo, c } = tipoBarras(cod); if (!tipo) return '';
  const fs = 9, txtH = numeros ? 11 : 0, barras = [];   // [x, largura, longa?]
  let larg = 0, txt = '';
  const poe = (mods, x0, longa = false) => { let x = x0; for (const b of mods) { if (b === '1') barras.push([x, 1, longa]); x++; } };
  const letra = (s, x) => `<text x="${x}" y="${alt + (tipo === 'Code 128' ? 9.5 : 8.5)}" text-anchor="middle" font-size="${fs}">${t(s)}</text>`;
  if (tipo === 'EAN-13') {
    const q = 11, par = EAN_PAR[c[0]]; larg = q + 95 + 7;
    poe('101', q, true);
    for (let i = 0; i < 6; i++) poe((par[i] === 'L' ? EAN_L : EAN_G)[c[i + 1]], q + 3 + i * 7);
    poe('01010', q + 45, true);
    for (let i = 0; i < 6; i++) poe(EAN_R[c[i + 7]], q + 50 + i * 7);
    poe('101', q + 92, true);
    if (numeros) { txt = letra(c[0], q - 5); for (let i = 0; i < 6; i++) { txt += letra(c[i + 1], q + 6.5 + i * 7) + letra(c[i + 7], q + 53.5 + i * 7); } }
  } else if (tipo === 'EAN-8') {
    const q = 7; larg = q + 67 + 7;
    poe('101', q, true);
    for (let i = 0; i < 4; i++) poe(EAN_L[c[i]], q + 3 + i * 7);
    poe('01010', q + 31, true);
    for (let i = 0; i < 4; i++) poe(EAN_R[c[i + 4]], q + 36 + i * 7);
    poe('101', q + 64, true);
    if (numeros) for (let i = 0; i < 4; i++) txt += letra(c[i], q + 6.5 + i * 7) + letra(c[i + 4], q + 39.5 + i * 7);
  } else {
    const q = 10; let x = q; const pad = code128(c);
    [...pad].forEach((w, i) => { const n = Number(w); if (i % 2 === 0) barras.push([x, n, false]); x += n; });
    larg = x + q; if (numeros) txt = letra(c, larg / 2);
  }
  // barras vizinhas viram um retângulo só (desenho mais leve e sem frestas na impressão)
  const juntas = []; barras.forEach((b) => { const u = juntas[juntas.length - 1]; if (u && u[0] + u[1] === b[0] && u[2] === b[2]) u[1] += b[1]; else juntas.push([...b]); });
  const ext = tipo === 'Code 128' || !numeros ? 0 : 5, h = alt + Math.max(ext, txtH);
  const rects = juntas.map(([x, w, longa]) => `M${x} 0h${w}v${alt + (longa ? ext : 0)}h-${w}z`).join('');
  return `<svg class="${cls}" viewBox="0 0 ${larg} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Código de barras ${t(tipo)} ${t(c)}" data-tipo="${t(tipo)}" data-cod="${t(c)}"><rect width="${larg}" height="${h}" fill="#fff" stroke="none"/><path d="${rects}" fill="#000" stroke="none" shape-rendering="crispEdges"/>${txt ? `<g fill="#000" stroke="none" font-family="'DM Sans', Arial, sans-serif" font-weight="500">${txt}</g>` : ''}</svg>`;
}

// fotos de produto (Pexels, licença livre) só na demonstração; na conta, a loja põe a foto que quiser
const FOTOS = {"Cerveja lata 350": "cerveja-lata", "Cerveja long neck": "cerveja-longneck", "Cerveja garrafa 600": "cerveja-600", "Cerveja puro malte": "cerveja-473", "Refrigerante lata": "refri-lata", "Água mineral": "agua", "Energético": "energetico", "Cachaça": "cachaca", "Conhaque": "conhaque", "Arroz": "arroz", "Feijão": "feijao", "Açúcar": "acucar", "Óleo": "oleo", "Café": "cafe", "Macarrão": "macarrao", "Leite": "leite", "Iogurte": "iogurte", "Queijo": "queijo", "Presunto": "presunto", "Pão francês": "pao-frances", "Pão de forma": "pao-forma", "Bolo": "bolo", "Tomate": "tomate", "Banana": "banana", "Batata palha": "batata-palha", "Batata": "batata", "Detergente": "detergente", "Sabão": "sabao", "Papel": "papel", "Sabonete": "sabonete", "Carvão": "carvao", "Gelo": "gelo", "Linguiça": "linguica", "Picanha": "picanha", "Amendoim": "amendoim", "Chocolate": "chocolate", "Uísque": "uisque", "Vodca": "vodca", "Manteiga": "manteiga"};
// ------------------------------------------------------------------ demonstração: o Mercadinho São José (mercearia)
function rnd(sem) { let a = sem >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
function inicial() {
  const r = rnd(20261108), h = hoje();
  const F = [
    { id: 'f1', nome: 'Distribuidora Imperial Bebidas', tel: '16 99812-4410', prazo: 'Entrega na terça e na sexta' },
    { id: 'f2', nome: 'Atacadão Mogiana', tel: '16 3721-5590', prazo: 'Retirada no balcão' },
    { id: 'f3', nome: 'Laticínios Serra Azul', tel: '16 99630-1182', prazo: 'Entrega na segunda' },
    { id: 'f4', nome: 'Padaria Trigo Bom', tel: '16 99104-7735', prazo: 'Todo dia às 6h' },
    { id: 'f5', nome: 'Hortifrúti do Ceasa', tel: '16 99277-3018', prazo: 'Quarta e sábado' },
  ];
  // [nome, categoria, un, custo, preço, estoque, mínimo, fornecedor, validade em dias (lote) ou 0, parado (sem venda no último mês)]
  const L = [
    ['Cerveja lata 350 ml', 'Cervejas', 'un', 289, 549, 24, 60, 'f1', 0],
    ['Cerveja long neck 330 ml', 'Cervejas', 'un', 469, 899, 48, 36, 'f1', 0],
    ['Cerveja garrafa 600 ml', 'Cervejas', 'un', 699, 1290, 30, 24, 'f1', 0],
    ['Cerveja puro malte lata 473 ml', 'Cervejas', 'un', 459, 799, 36, 24, 'f1', 0],
    ['Refrigerante 2 L', 'Bebidas', 'un', 699, 1099, 18, 12, 'f1', 0],
    ['Refrigerante lata 350 ml', 'Bebidas', 'un', 289, 549, 40, 24, 'f1', 0],
    ['Água mineral 500 ml', 'Bebidas', 'un', 119, 350, 60, 36, 'f1', 0],
    ['Energético 473 ml', 'Bebidas', 'un', 699, 1290, 12, 6, 'f1', 0],
    ['Cachaça prata 965 ml', 'Destilados', 'un', 1490, 2490, 6, 3, 'f1', 0],
    ['Vodca 998 ml', 'Destilados', 'un', 3890, 5990, 4, 2, 'f1', 0],
    ['Uísque 8 anos 1 L', 'Destilados', 'un', 9990, 14990, 3, 1, 'f1', 0, 1],
    ['Conhaque 900 ml', 'Destilados', 'un', 1990, 3190, 5, 2, 'f1', 0, 1],
    ['Arroz 5 kg', 'Mercearia', 'un', 2390, 3190, 3, 10, 'f2', 0],
    ['Feijão carioca 1 kg', 'Mercearia', 'un', 699, 979, 14, 10, 'f2', 0],
    ['Açúcar 5 kg', 'Mercearia', 'un', 1890, 2490, 8, 6, 'f2', 0],
    ['Óleo de soja 900 ml', 'Mercearia', 'un', 699, 949, 16, 10, 'f2', 0],
    ['Café 500 g', 'Mercearia', 'un', 1690, 2390, 11, 8, 'f2', 0],
    ['Macarrão espaguete 500 g', 'Mercearia', 'un', 389, 599, 22, 12, 'f2', 0],
    ['Leite integral 1 L', 'Laticínios e frios', 'un', 449, 649, 30, 24, 'f3', 9],
    ['Iogurte 170 g', 'Laticínios e frios', 'un', 189, 349, 18, 12, 'f3', 4],
    ['Queijo muçarela fatiado', 'Laticínios e frios', 'kg', 3490, 5490, 3.2, 2, 'f3', 8],
    ['Presunto fatiado', 'Laticínios e frios', 'kg', 2790, 4290, 2.6, 2, 'f3', 5],
    ['Manteiga 200 g', 'Laticínios e frios', 'un', 1090, 1590, 9, 6, 'f3', 40],
    ['Pão francês', 'Padaria', 'kg', 1090, 1899, 6.5, 4, 'f4', 1],
    ['Pão de forma', 'Padaria', 'un', 699, 999, 7, 6, 'f4', 6],
    ['Bolo caseiro', 'Padaria', 'un', 1100, 1990, 4, 3, 'f4', 3],
    ['Tomate', 'Hortifrúti', 'kg', 599, 899, 7.4, 5, 'f5', 6],
    ['Banana prata', 'Hortifrúti', 'kg', 399, 699, 9.1, 6, 'f5', 5],
    ['Batata', 'Hortifrúti', 'kg', 449, 749, 12, 8, 'f5', 15],
    ['Detergente 500 ml', 'Limpeza', 'un', 199, 349, 26, 12, 'f2', 0],
    ['Sabão em pó 1 kg', 'Limpeza', 'un', 1190, 1690, 9, 6, 'f2', 0],
    ['Papel higiênico 12 rolos', 'Higiene', 'un', 1590, 2290, 7, 6, 'f2', 0],
    ['Sabonete 85 g', 'Higiene', 'un', 189, 349, 30, 12, 'f2', 0],
    ['Carvão 4 kg', 'Churrasco', 'un', 1490, 2490, 2, 8, 'f2', 0],
    ['Gelo 5 kg', 'Churrasco', 'un', 690, 1290, 10, 8, 'f2', 0],
    ['Linguiça toscana', 'Churrasco', 'kg', 1990, 2990, 4.2, 3, 'f3', 12],
    ['Picanha', 'Churrasco', 'kg', 5990, 8390, 2.8, 2, 'f3', 6],
    ['Amendoim japonês 150 g', 'Petiscos', 'un', 349, 699, 15, 8, 'f2', 0],
    ['Vinagre 750 ml', 'Mercearia', 'un', 299, 499, 14, 4, 'f2', 0, 1],
    ['Fermento em pó 100 g', 'Mercearia', 'un', 349, 599, 11, 4, 'f2', 0, 1],
    ['Batata palha 120 g', 'Petiscos', 'un', 399, 749, 11, 6, 'f2', 0],
    ['Chocolate 90 g', 'Bomboniere', 'un', 499, 849, 20, 10, 'f2', 0],
  ];
  const produtos = L.map((x, i) => {
    const mult = x[5] <= x[6] ? 1 : 3; // o que está no mínimo continua no mínimo (lista de compras); o resto tem estoque de verdade
    const p = { id: `p${i + 1}`, nome: x[0], cat: x[1], un: x[2], custo: x[3], preco: x[4], q: r3(x[5] * mult), min: x[6], forn: x[7], cod: ean13(`7891${String(20261 + i * 37).padStart(5, '0')}${String(i).padStart(3, '0')}`), lotes: [], criado: somaDias(h, -90) };
    if (x[9]) p.parado = true;
    if (x[2] === 'kg') p.plu = String(i + 1);
    const fo = Object.entries(FOTOS).filter(([n]) => x[0].startsWith(n)).sort((a, b) => b[0].length - a[0].length)[0]; if (fo) p.foto = `fotos/${fo[1]}.webp`;
    if (x[8]) { // dois lotes: o mais antigo vence antes
      const q1 = r3(p.q * 0.4), q2 = r3(p.q - q1);
      p.lotes = [{ id: uid('l'), lote: `L${String(240 + i * 7)}`, val: somaDias(h, Math.max(1, Math.round(x[8] * 0.7))), q: q1, ent: somaDias(h, -6) }, { id: uid('l'), lote: `L${String(251 + i * 7)}`, val: somaDias(h, x[8] + 4), q: q2, ent: somaDias(h, -1) }];
    }
    return p;
  });
  // um lote já vencido para a tela de validades mostrar
  produtos.find((p) => p.nome.startsWith('Iogurte')).lotes[0].val = somaDias(h, -1);
  const clientes = [
    ['Seu Antônio da oficina', '16 99231-4087', 30000], ['Dona Cida', '16 99145-2290', 20000], ['Marquinhos (pedreiro)', '16 99318-7754', 15000],
    ['Neusa da escola', '16 99602-1135', 25000], ['Zé Carlos', '16 99877-6043', 10000], ['Patrícia Lopes', '16 99410-5528', 20000],
  ].map((c, i) => ({ id: `c${i + 1}`, nome: c[0], tel: c[1], limite: c[2], bloq: false, desde: somaDias(h, -200 + i * 20) }));
  const fiado = [];
  const pf = (cli, d, tipo, v, obs = '') => fiado.push({ id: uid('f'), cli, data: `${somaDias(h, d)}T${pad(9 + Math.floor(r() * 10))}:${pad(Math.floor(r() * 60))}:00`, tipo, v, obs });
  pf('c1', -38, 'compra', 18450, 'Compra do mês'); pf('c1', -20, 'pag', 10000, 'Pix'); pf('c1', -6, 'compra', 6720);
  pf('c2', -12, 'compra', 4380); pf('c2', -3, 'compra', 2190);
  pf('c3', -52, 'compra', 9800); pf('c3', -44, 'compra', 3650); pf('c3', -30, 'pag', 5000, 'Dinheiro');
  pf('c4', -9, 'compra', 3120); pf('c4', -2, 'pag', 3120, 'Pix');
  pf('c5', -15, 'compra', 7990); pf('c6', -4, 'compra', 2850);
  // vendas dos últimos 28 dias (mais na sexta e no sábado); os produtos marcados como parados não vendem
  const vendaveis = produtos.filter((p) => !p.parado), vendas = [], formas = ['dinheiro', 'pix', 'pix', 'debito', 'credito', 'debito', 'pix'];
  for (let d = 27; d >= 0; d--) {
    const dia = somaDias(h, -d), sem = new Date(`${dia}T12:00`).getDay(), hAgora = new Date().getHours(), n = Math.round([58, 44, 46, 49, 55, 74, 86][sem] * (0.88 + r() * 0.24));
    for (let k = 0; k < n; k++) {
      const itens = [], ni = 1 + Math.floor(r() * 4);
      for (let j = 0; j < ni; j++) {
        const p = vendaveis[Math.floor(r() ** 1.6 * vendaveis.length)];
        const q = p.un === 'kg' ? r3(0.2 + r() * 1.3) : 1 + Math.floor(r() * (p.cat === 'Cervejas' ? 6 : 2));
        itens.push({ p: p.id, nome: p.nome, q, preco: p.preco, custo: p.custo });
      }
      const total = itens.reduce((s, x) => s + Math.round(x.q * x.preco), 0), hora = sem >= 5 || sem === 0 ? 8 + Math.floor(r() * 15) : 7 + Math.floor(r() * 14);
      if (d === 0 && hora > hAgora) continue; // hoje: só as vendas até agora
      const f = formas[Math.floor(r() * formas.length)];
      vendas.push({ id: uid('v'), cx: r() < 0.6 ? 'c1' : 'c2', n: vendas.length + 1, data: `${dia}T${pad(Math.min(hora, 23))}:${pad(Math.floor(r() * 60))}:00`, itens, total, desc: 0, pag: [{ f, v: total }], origem: 'balcao', vend: r() < 0.55 ? 'u2' : r() < 0.6 ? 'u1' : 'u3' });
    }
  }
  vendas.sort((a, b) => a.data.localeCompare(b.data)); vendas.forEach((v, i) => { v.n = i + 1; });
  // uma venda cancelada ontem, para a tela Vendas mostrar como fica
  const vc = vendas.filter((v) => v.data.slice(0, 10) === somaDias(h, -1))[3]; if (vc) vc.cancelada = { data: vc.data.replace(/T(\d\d)/, (m, x) => `T${pad(Math.min(23, Number(x) + 1))}`), motivo: 'Cliente desistiu da compra', quem: 'Sérgio Andrade' };
  const pid = (n) => produtos.find((p) => p.nome.startsWith(n));
  const semanais = [];
  for (let w = 0; w < 4; w++) {
    const de = somaDias(h, -27 + w * 7), ate = somaDias(h, -21 + w * 7), por = {};
    vendas.filter((v) => v.data.slice(0, 10) >= de && v.data.slice(0, 10) <= ate).forEach((v) => v.itens.forEach((x) => { por[x.p] = (por[x.p] || 0) + x.q; }));
    F.forEach((f) => {
      const itens = produtos.filter((p) => p.forn === f.id && por[p.id]).map((p) => ({ p: p.id, q: p.un === 'kg' ? r3(Math.ceil(por[p.id] * 1.05 * 10) / 10) : Math.ceil(por[p.id] * 1.05), custo: p.custo }));
      if (itens.length) semanais.push({ id: uid('e'), data: somaDias(de, -1), forn: f.id, nota: String(30100 + w * 37 + Number(f.id.slice(1)) * 5), itens, total: itens.reduce((a, x) => a + Math.round(x.q * x.custo), 0) });
    });
  }
  const entradas = [...semanais,
    { id: uid('e'), data: somaDias(h, -1), forn: 'f4', nota: '4471', itens: [{ p: pid('Pão francês').id, q: 6, custo: 1090 }, { p: pid('Pão de forma').id, q: 6, custo: 699 }], total: 6540 + 4194 },
    { id: uid('e'), data: somaDias(h, -3), forn: 'f3', nota: '118203', itens: [{ p: pid('Leite').id, q: 24, custo: 449 }, { p: pid('Iogurte').id, q: 18, custo: 189 }, { p: pid('Presunto').id, q: 3, custo: 2790 }], total: 10776 + 3402 + 8370 },
    { id: uid('e'), data: somaDias(h, -5), forn: 'f1', nota: '902117', itens: [{ p: pid('Cerveja lata').id, q: 96, custo: 289 }, { p: pid('Cerveja garrafa').id, q: 48, custo: 699 }, { p: pid('Cachaça').id, q: 6, custo: 1490 }], total: 27744 + 33552 + 8940 },
  ].sort((a, b) => a.data.localeCompare(b.data));
  const perdas = [
    { id: uid('x'), data: `${somaDias(h, -2)}T16:10:00`, p: pid('Cerveja garrafa').id, q: 1, motivo: 'Quebrou', custo: 699, obs: 'Caiu da prateleira' },
    { id: uid('x'), data: `${somaDias(h, -4)}T08:05:00`, p: pid('Pão francês').id, q: 0.8, motivo: 'Venceu', custo: 872, obs: '' },
    { id: uid('x'), data: `${somaDias(h, -9)}T15:30:00`, p: pid('Iogurte').id, q: 4, motivo: 'Venceu', custo: 756, obs: '' },
  ];
  // dois inventários passados: o que sumiu sem explicação aparece no relatório de diferenças
  const sumiu = [['Cerveja long neck', 6], ['Chocolate', 4], ['Picanha', 0.8], ['Cerveja lata', 12], ['Energético', 2]], ajI = [];
  [[-41, 'Bebidas e frios'], [-12, 'Tudo']].forEach(([dd, cat], k) => sumiu.slice(k, k + 4).forEach(([n, q]) => { const p = pid(n); ajI.push({ id: uid('x'), data: `${somaDias(h, dd)}T07:30:00`, p: p.id, q: q * (k ? 1 : 0.5), motivo: 'Ajuste de inventário', custo: Math.round(q * (k ? 1 : 0.5) * p.custo), obs: 'Inventário' }); }));
  perdas.push(...ajI);
  const inventarios = [[-41, 'Bebidas e frios', 0], [-12, 'Tudo', 1]].map(([dd, cat, k]) => { const f2 = ajI.filter((x) => x.data.startsWith(somaDias(h, dd))).reduce((a, x) => a + x.custo, 0); return { id: uid('i'), data: somaDias(h, dd), cat, itens: Array(k ? 38 : 16).fill(0).map((z, ii) => ({ p: produtos[ii].id, c: 1 })), dif: -f2 + (k ? 349 : 0), falta: f2, sobra: k ? 349 : 0, quem: k ? 'Rafael Lima' : 'Sérgio Andrade' }; });
  const caixa = { aberto: true, quem: 'Kátia Moreira', ab: `${h}T07:02:00`, troco: 15000, movs: [{ id: uid('k'), t: 'sangria', v: 18000, m: 'Pagamento do pão', d: `${h}T07:40:00` }] };
  return {
    v: 1, demo: true, terminais: [{ id: 'c1', nome: 'Caixa 1' }, { id: 'c2', nome: 'Caixa 2' }], caixasT: { c2: { aberto: true, quem: 'Sérgio Andrade', ab: `${h}T08:30:00`, troco: 10000, movs: [] } },
    loja: { bal: { ativo: true, tipo: 'preco', dig: 4 }, nome: 'Mercadinho São José', slogan: 'Mercearia e empório', tel: '16 99123-4455', cidade: 'Franca', pix: 'mercadinhosaojose@email.com', prazo: 30, limite: 20000, servico: 10, vendSemPrazo: false },
    usuarios: [{ id: 'u1', nome: 'Sérgio Andrade', perfil: 'dono', tel: '16 99123-4455', email: 'sergio@mercadinhosaojose.com', pin: '1234', perms: {} }, { id: 'u2', nome: 'Kátia Moreira', perfil: 'caixa', tel: '16 99288-1043', pin: '', perms: { caixa: true } }, { id: 'u3', nome: 'Rafael Lima', perfil: 'repositor', tel: '16 99307-5521', pin: '', perms: { estoque: true, entradas: true } }], usuario: 'u1', meta: 0,
    atividades: [
      { data: `${somaDias(h, -2)}T16:12:00`, quem: 'Rafael Lima', txt: 'Perda: 1 Cerveja garrafa 600 ml (Quebrou)', tipo: 'perda' },
      { data: `${somaDias(h, -1)}T15:20:00`, quem: 'Sérgio Andrade', txt: 'Venda cancelada: cliente desistiu da compra (o estoque voltou)', tipo: 'cancelada' },
      { data: `${somaDias(h, -3)}T09:20:00`, quem: 'Sérgio Andrade', txt: 'Entrada da nota 118203 (Laticínios Serra Azul): R$ 225,48', tipo: 'entrada' },
      { data: `${somaDias(h, -4)}T19:05:00`, quem: 'Kátia Moreira', txt: 'Liberado com a senha do dono: fiado de Marquinhos (pedreiro) acima do limite', tipo: 'liberacao' },
      { data: `${somaDias(h, -5)}T08:40:00`, quem: 'Sérgio Andrade', txt: 'Preço da Cerveja lata 350 ml: R$ 4,99 → R$ 5,49', tipo: 'preco' },
    ],
    fornecedores: F, produtos, clientes, fiado, vendas, entradas, perdas, caixa, caixas: [], inventarios, pedidos: [], ajustes: [],
  };
}

// ------------------------------------------------------------------ dados
let db = null;
const novo = new URLSearchParams(location.search).has('novo'), pediuInstalar = new URLSearchParams(location.search).has('instalar');
try { db = novo ? null : JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { db = null; }
if (!db || !Array.isArray(db.produtos)) { db = window.veltriaConta ? vazio() : inicial(); if (db.demo) { const s30 = db.vendas.reduce((s, v) => s + v.total, 0); db.meta = Math.round((s30 / 28) * 30 * 1.15 / 100000) * 100000; } }
function vazio() { return { v: 1, loja: { nome: (window.veltriaConta && window.veltriaConta.empresa) || 'Meu comércio', slogan: '', tel: '', cidade: '', pix: '', prazo: 30, limite: 20000, servico: 10 }, usuarios: [{ id: 'u1', nome: 'Dono', perfil: 'dono', pin: '', perms: {} }], usuario: 'u1', meta: 0, atividades: [], fornecedores: [], produtos: [], clientes: [], fiado: [], vendas: [], mesas: [], entradas: [], perdas: [], caixa: { aberto: false, movs: [] }, caixas: [], inventarios: [], pedidos: [], ajustes: [] }; }
const grava = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch (e) { toast('Não consegui salvar neste aparelho (sem espaço). Faça uma cópia em Configurações.', true); } };
if (novo) { grava(); history.replaceState(null, '', location.pathname + location.hash); }
if (db.mesas && db.mesas.length) db.mesas = [];
window.veltriaDados = () => db;

// vários caixas: o Caixa 1 fica em db.caixa (como sempre); os outros em db.caixasT; cada aparelho guarda qual é o seu
db.terminais ||= [{ id: 'c1', nome: 'Caixa 1' }]; db.caixasT ||= {};
const TERM = () => { let x = ''; try { x = localStorage.getItem('annona-caixa') || ''; } catch (e) { /* sem armazenamento */ } return db.terminais.some((y) => y.id === x) ? x : 'c1'; };
const nomeTerm = (id) => (db.terminais.find((y) => y.id === id) || {}).nome || 'Caixa 1';
const CXA = (t2 = TERM()) => (t2 === 'c1' ? db.caixa : (db.caixasT[t2] ||= { aberto: false, movs: [] }));
const poeCXA = (t2, c) => { if (t2 === 'c1') db.caixa = c; else db.caixasT[t2] = c; };
const doTerm = (x, t2) => (x.cx || 'c1') === t2;
const prod = (id) => db.produtos.find((p) => p.id === id);
const cli = (id) => db.clientes.find((c) => c.id === id);
const forn = (id) => db.fornecedores.find((f) => f.id === id);
const ativos = () => db.produtos.filter((p) => !p.arq);
const comEstoque = () => ativos().filter((p) => !p.semEstoque);
const cats = () => [...new Set(ativos().map((p) => p.cat).filter(Boolean))].sort();
const margem = (preco, custo) => (preco > 0 ? Math.round(((preco - custo) / preco) * 1000) / 10 : 0);
const qtdTxt = (p, q = p.q) => {
  if (p.semEstoque) return 'feito na hora';
  if (p.dose) { const g = Math.floor(q + 1e-9), ml = Math.round((q - g) * p.dose.ml); return ml > 0 ? `${g} fechada${g === 1 ? '' : 's'} + ${ml} ml aberta` : `${g} garrafa${g === 1 ? '' : 's'}`; }
  return p.un === 'kg' ? `${numBR(q)} kg` : `${numBR(q, 0)} ${UN[p.un] || 'un'}`;
};
// miniatura do produto: a foto, ou a inicial sobre a cor da categoria
const COR_CAT = ['#F5E8EE', '#FBF1DC', '#E2F3EE', '#F1EAF5', '#F7ECE6'];
const foto = (p, cls = '') => (!p ? `<span class="foto ${cls}"></span>` : p.foto ? `<span class="foto ${cls}"><img src="${t(p.foto)}" alt="" loading="lazy" width="120" height="120"></span>` : `<span class="foto letra ${cls}" style="background:${COR_CAT[[...String(p.cat)].reduce((s, c) => s + c.charCodeAt(0), 0) % COR_CAT.length]}">${t(String(p.nome).slice(0, 1))}</span>`);
const situ = (p) => (p.semEstoque ? 'ok' : p.q <= 0 ? 'zerado' : p.q <= p.min ? 'baixo' : 'ok');
const baixos = () => comEstoque().filter((p) => p.q <= p.min || (mediaDia(p) > 0 && duraDias(p) < 7)).sort((a, b) => a.q / (a.min || 1) - b.q / (b.min || 1));
const lotesAtivos = () => ativos().flatMap((p) => (p.lotes || []).filter((l) => l.q > 0.0005 && l.val).map((l) => ({ ...l, p }))).sort((a, b) => a.val.localeCompare(b.val));
const vencendo = (n = 7) => lotesAtivos().filter((l) => dias(hoje(), l.val) <= n);
// giro: média vendida por dia nos últimos 30 dias, quantos dias o estoque dura e o que está parado
let _giro = null, _giroN = -1;
function giro() {
  if (_giro && _giroN === db.vendas.length) return _giro;
  const de = somaDias(hoje(), -29), q = {}, ult = {};
  for (const v of db.vendas) { if (v.cancelada) continue; const d = v.data.slice(0, 10); for (const x of v.itens) { if (d >= de) q[x.p] = (q[x.p] || 0) + x.q; if (!ult[x.p] || d > ult[x.p]) ult[x.p] = d; } }
  _giroN = db.vendas.length; _giro = { q, ult }; return _giro;
}
const mediaDia = (p) => (giro().q[p.id] || 0) / 30;
const duraDias = (p) => { const m = mediaDia(p); return m > 0 ? Math.floor(p.q / m) : Infinity; };
const ultimaVenda = (p) => giro().ult[p.id] || '';
const parados = (n = 30) => comEstoque().filter((p) => p.q > 0 && (!ultimaVenda(p) || dias(ultimaVenda(p)) >= n)).sort((a, b) => b.q * b.custo - a.q * a.custo);
const duraTxt = (p) => { if (p.semEstoque) return '—'; const d = duraDias(p); if (d === Infinity) return p.q > 0 ? 'parado' : '—'; return d === 0 ? 'acaba hoje' : `${d} dia${d === 1 ? '' : 's'}`; };
const valorEstoque = () => comEstoque().reduce((s, p) => s + Math.max(0, p.q) * p.custo, 0);

// baixa do estoque: tira dos lotes que vencem primeiro
function baixar(p, q) {
  if (p.semEstoque) return; // porção feita na hora
  p.q = r3(p.q - q);
  let falta = q;
  for (const l of [...(p.lotes || [])].sort((a, b) => String(a.val || '9').localeCompare(String(b.val || '9')))) { if (falta <= 0) break; const tira = Math.min(l.q, falta); l.q = r3(l.q - tira); falta = r3(falta - tira); }
  p.lotes = (p.lotes || []).filter((l) => l.q > 0.0005);
}
function devolver(p, q) { p.q = r3(p.q + q); if (p.lotes && p.lotes.length) { p.lotes[p.lotes.length - 1].q = r3(p.lotes[p.lotes.length - 1].q + q); } }
const qBaixa = (it) => { const p = prod(it.p); return it.dose && p && p.dose ? r3(it.q * p.dose.doseMl / p.dose.ml) : it.q; };

// fiado: pagamentos cobrem as compras mais antigas; o que sobra em aberto conta o atraso pela compra mais antiga
function contaFiado(cid) {
  const ls = db.fiado.filter((f) => f.cli === cid).sort((a, b) => a.data.localeCompare(b.data));
  let pago = ls.filter((f) => f.tipo === 'pag').reduce((s, f) => s + f.v, 0);
  const comp = ls.filter((f) => f.tipo === 'compra'); const abertas = [];
  for (const c of comp) { const usa = Math.min(pago, c.v); pago -= usa; if (c.v - usa > 0) abertas.push({ ...c, resta: c.v - usa }); }
  const saldo = abertas.reduce((s, c) => s + c.resta, 0), antiga = abertas[0], atraso = antiga ? Math.max(0, dias(antiga.data) - db.loja.prazo) : 0;
  return { saldo, atraso, antiga, ls, credito: pago };
}
function situCli(c) {
  const k = contaFiado(c.id);
  if (c.bloq) return { k, s: 'bloq', txt: 'Bloqueado por você' };
  if (k.atraso > 15) return { k, s: 'bloq', txt: `Bloqueado: ${k.atraso} dias de atraso` };
  if (k.atraso > 0) return { k, s: 'atraso', txt: `${k.atraso} dia${k.atraso === 1 ? '' : 's'} de atraso` };
  if (k.saldo >= c.limite) return { k, s: 'limite', txt: 'No limite' };
  if (k.saldo > 0) return { k, s: 'ok', txt: 'Em dia' };
  return { k, s: 'zero', txt: 'Sem conta aberta' };
}
const devedores = () => db.clientes.filter((c) => contaFiado(c.id).saldo > 0);
const totalFiado = () => db.clientes.reduce((s, c) => s + contaFiado(c.id).saldo, 0);
function msgCobranca(c) {
  const k = contaFiado(c.id);
  const pix = db.loja.pix ? ` Se preferir, o Pix é ${db.loja.pix}.` : '';
  return k.atraso > 0
    ? `Oi, ${c.nome.split(' ')[0]}! Tudo bem? Aqui é do ${db.loja.nome}. Sua conta está em ${din(k.saldo)}, com a compra mais antiga do dia ${dataBR(k.antiga.data)}. Consegue acertar esta semana?${pix} Obrigado!`
    : `Oi, ${c.nome.split(' ')[0]}! Aqui é do ${db.loja.nome}. Só para avisar: sua conta está em ${din(k.saldo)}.${pix} Qualquer dúvida, é só chamar.`;
}

// período para relatórios
function periodo(k) { const h = hoje(); if (k === 'hoje') return [h, h]; if (k === '7') return [somaDias(h, -6), h]; if (k === 'mes') return [`${h.slice(0, 8)}01`, h]; return [somaDias(h, -29), h]; }
const vendasEntre = (de, ate) => db.vendas.filter((v) => !v.cancelada && v.data.slice(0, 10) >= de && v.data.slice(0, 10) <= ate);
const custoVenda = (v) => v.itens.reduce((s, x) => s + Math.round(x.q * x.custo), 0);
const lucroVenda = (v) => v.total - custoVenda(v);

// ------------------------------------------------------------------ interface comum
const ICO = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>', mais: '<path d="M12 5v14M5 12h14"/>', menos: '<path d="M5 12h14"/>', cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  zap: '<path d="M4 20l1.4-4A8 8 0 1 1 8 18.6z"/><path d="M9 9.5c.5 2 2 3.5 4 4l1.2-1.2 2 1-.6 1.6c-3.5 0-7-3.5-7-7l1.6-.6 1 2z"/>',
  lixo: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>', lapis: '<path d="M4 20l4-1 11-11-3-3L5 16z"/>', ok: '<path d="M5 12l4 4 10-10"/>', seta: '<path d="M9 6l6 6-6 6"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', imp: '<path d="M7 9V4h10v5M7 17H5v-6h14v6h-2M8 14h8v6H8z"/>', alerta: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
  sacola: '<path d="M3 5h2l2 11h11l2-8H6.2"/><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  caixa: '<path d="M12 3l8 4v10l-8 4-8-4V7z"/><path d="M4 7l8 4 8-4M12 11v10"/>', gente: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/>', moeda: '<circle cx="12" cy="12" r="8"/><path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6.5v11"/>',
  mesa: '<path d="M4 9h16M6 9v11M18 9v11M8 9V5h8v4"/>', taca: '<path d="M7 3h10l-1 7a4 4 0 0 1-8 0zM12 14v6M8 21h8"/>', trofeu: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8l-1-4H9z"/>',
  relat: '<path d="M4 19h16M7 15v-3M12 15V8M17 15v-6"/>', barras: '<path d="M4 6v12M7 6v12M10 6v12M14 6v12M16.5 6v12M20 6v12"/>', xml: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13l-2 2 2 2M15 13l2 2-2 2"/>', subir: '<path d="M12 20V8M7 13l5-5 5 5M5 4h14"/>', pct: '<path d="M6 18L18 6"/><circle cx="7.5" cy="7.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/>',
};
const ico = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k] || ''}</svg>`;
function toast(m, erro = false) { const d = document.createElement('div'); d.className = `toast${erro ? ' erro' : ''}`; d.textContent = m; $('#toasts').append(d); setTimeout(() => d.remove(), 4200); }
let aoFechar = null;
function abrir(html, ligar, larga = false) {
  const c = $('#camada'); c.innerHTML = `<div class="janela${larga ? ' larga' : ''}" role="dialog" aria-modal="true">${html}</div>`; c.hidden = false;
  const j = $('.janela', c); $$('[data-fechar]', j).forEach((b) => b.addEventListener('click', fechar));
  if (ligar) ligar(j); const f = $('input:not([type=hidden]):not([readonly]), select, textarea, button.cheio', j); if (f) setTimeout(() => f.focus(), 30);
  return j;
}
function fechar() { const c = $('#camada'); c.hidden = true; c.innerHTML = ''; paraCamera(); if (aoFechar) { const f = aoFechar; aoFechar = null; f(); } }
$('#camada').addEventListener('mousedown', (e) => { if (e.target.id === 'camada') fechar(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#camada').hidden) fechar(); });
const cab = (titulo, sub = '') => `<header class="j-cab"><div><h2>${titulo}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button type="button" class="icone-bt" data-fechar aria-label="Fechar">${ico('x')}</button></header>`;
function confirmar(titulo, texto, rot, acao, perigo = false) {
  abrir(`${cab(titulo)}<p class="j-txt">${texto}</p><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt ${perigo ? 'perigo' : 'cheio'}" data-sim>${rot}</button></footer>`, (j) => $('[data-sim]', j).addEventListener('click', () => { fechar(); acao(); }));
}
const baixarArq = (nome, texto, tipo = 'text/csv') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: tipo })); a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
const csv = (linhas) => '﻿' + linhas.map((l) => l.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
const listaProdutos = () => `<datalist id="dl-prod">${ativos().map((p) => `<option value="${t(p.nome)}">`).join('')}</datalist>`;
const listaCli = () => `<datalist id="dl-cli">${db.clientes.map((c) => `<option value="${t(c.nome)}">`).join('')}</datalist>`;
const acharProd = (txt) => { const s = String(txt || '').trim(); if (!s) return null; return ativos().find((p) => p.cod === s) || ativos().find((p) => sa(p.nome) === sa(s)) || null; };
const buscaProd = (txt) => { const s = sa(txt); if (!s) return []; const por = ativos().find((p) => p.cod === String(txt).trim()); if (por) return [por]; return ativos().filter((p) => sa(p.nome).includes(s) || sa(p.cat).includes(s)).slice(0, 12); };

// ------------------------------------------------------------------ leitor de código de barras (igual ao do PlayCell)
// Câmera: 1080p, foco contínuo; cada tentativa usa um quadro tratado de um jeito: normal, invertido (código branco em
// fundo preto) e com mais contraste. Leitor do próprio navegador quando existe (Android e Mac); senão ZXing (Windows e iPhone).
const FORMATOS_CAM = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code', 'data_matrix'];
const FILTROS_CAM = ['none', 'grayscale(1) invert(1) contrast(1.5)', 'grayscale(1) contrast(1.8)'];
let fluxo = null, laco = 0, camParada = true;
function paraCamera() { camParada = true; clearTimeout(laco); if (fluxo) { fluxo.getTracks().forEach((x) => x.stop()); fluxo = null; } }
let zxingPronto = null;
const carregaZXing = () => (zxingPronto ||= new Promise((ok, erro) => { if (window.ZXing) { ok(window.ZXing); return; } const sc = document.createElement('script'); sc.src = 'zxing.min.js'; sc.onload = () => ok(window.ZXing); sc.onerror = erro; document.head.append(sc); }));
async function lerCamera(aoLer) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Este navegador não abre a câmera. Use o leitor USB ou digite os números do código.', true); return; }
  const j = abrir(`${cab('Aponte para o código de barras', 'Segure firme, a uns 15 cm. Lê sozinho, até código branco em fundo preto.')}<div class="cam"><video playsinline muted></video><span class="mira"></span></div><p class="mudo" id="cam-msg">Abrindo a câmera…</p><footer class="j-pe"><button type="button" class="bt" data-fechar>Cancelar</button></footer>`);
  const msg = (x) => { const m = $('#cam-msg', j); if (m) m.textContent = x; };
  camParada = false;
  const achou = (bruto) => { const c = String(bruto || '').trim(); if (!c || camParada) return false; camParada = true; if (navigator.vibrate) navigator.vibrate(80); fechar(); aoLer(c); return true; };
  try {
    // câmera de trás no celular; no computador, a webcam
    fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
    if (camParada) { paraCamera(); return; }
    const trilha = fluxo.getVideoTracks()[0];   // foco contínuo, quando a câmera deixa (código pequeno)
    if (trilha && trilha.applyConstraints) trilha.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
    const v = $('video', j); v.srcObject = fluxo; await v.play();
    msg('Aponte para o código de barras do produto.');
    const tela = document.createElement('canvas'), ctx = tela.getContext('2d', { willReadFrequently: true });
    let vez = 0;
    const quadro = () => { if (!v.videoWidth) return null; tela.width = v.videoWidth; tela.height = v.videoHeight; ctx.filter = FILTROS_CAM[vez++ % FILTROS_CAM.length]; ctx.drawImage(v, 0, 0); ctx.filter = 'none'; return tela; };
    const BD = window.BarcodeDetector, suportados = BD && BD.getSupportedFormats ? await BD.getSupportedFormats().catch(() => []) : [];
    let ler1;
    if (BD && suportados.includes('code_128')) {   // leitor do próprio navegador: mais rápido
      const det = new BD({ formats: FORMATOS_CAM.filter((f) => suportados.includes(f)) });
      ler1 = async (c) => (await det.detect(c)).map((x) => x.rawValue);
    } else {                                        // Windows e iPhone: ZXing, carregado só agora
      msg('Preparando o leitor…');
      const Z = await carregaZXing();
      const dicas = new Map([[Z.DecodeHintType.TRY_HARDER, true], [Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_128, Z.BarcodeFormat.CODE_39, Z.BarcodeFormat.ITF, Z.BarcodeFormat.QR_CODE, Z.BarcodeFormat.DATA_MATRIX]]]);
      const zx = new Z.MultiFormatReader(); zx.setHints(dicas);
      ler1 = async (c) => { try { return [zx.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(c))), dicas).getText()]; } catch (e) { return []; } finally { zx.reset(); } };
      msg('Aponte para o código de barras do produto.');
    }
    const ler = async () => {
      if (camParada) return;
      const c = quadro();
      if (c) try { for (const tx of await ler1(c)) if (achou(tx)) return; } catch (e) { /* quadro ainda sem imagem */ }
      laco = setTimeout(ler, 120);
    };
    ler();
  } catch (e) {
    const nome = e && e.name;
    msg(nome === 'NotAllowedError' ? 'A câmera foi bloqueada. Libere a câmera para este site nas permissões do navegador.' : nome === 'NotFoundError' ? 'Nenhuma câmera encontrada neste aparelho. Use o leitor USB ou digite o código.' : 'Não consegui abrir a câmera. Digite o código ou use o leitor USB.');
  }
}

// Leitor USB ou Bluetooth (pistola): ele "digita" como um teclado, só que muito rápido (poucos milissegundos por tecla)
// e termina com Enter. Fora dos campos de texto, reconhece esse ritmo em qualquer tela e entrega o código lido;
// dentro de um campo, a leitura vai para o campo normalmente.
(function leitorUSB() {
  let buf = '', ultima = 0, fim = 0;
  const campo = (el) => el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
  const entregar = () => { const c = buf; buf = ''; if (c.length >= 8 && $('#camada').hidden) codigoLido(c); };
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey || campo(e.target)) { buf = ''; return; }
    const t0 = performance.now();
    clearTimeout(fim);
    if (e.key === 'Enter' || e.key === 'Tab') { if (buf.length >= 8) { e.preventDefault(); entregar(); } buf = ''; return; }
    if (e.key.length !== 1) return;
    if (t0 - ultima > 60) buf = '';           // pessoa digitando (ou começo de uma leitura nova)
    buf += e.key; ultima = t0;
    fim = setTimeout(() => { if (buf.length >= 12) entregar(); else buf = ''; }, 150); // leitor configurado sem Enter
  });
})();
// para onde vai o código lido pela pistola, conforme a tela aberta
function codigoLido(c) {
  if (telaAtual === 'vender') { lerNoBalcao(c); return; }
  if (telaAtual === 'inventario' && estado.invent) { contaInv(c); return; }
  const p = ativos().find((x) => x.cod === c), bal = typeof lerBalanca === 'function' && lerBalanca(c);
  if (p) { formProduto(p); return; }
  if (bal) { formProduto(bal.p); return; }
  confirmar('Código não cadastrado', `O código ${t(c)} ainda não está no estoque. Quer cadastrar o produto agora?`, 'Cadastrar', () => formProduto({ cod: c }));
}

// ------------------------------------------------------------------ marca e menu
function marca() {
  const h = new Date().getHours(), s = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  $('#saudacao').textContent = `${s}, ${db.loja.nome}`;
  const nv = vencendo(7).length, nf = devedores().filter((c) => contaFiado(c.id).atraso > 0).length, nc = baixos().length;
  const n = (id, v) => { const e = $(id); e.hidden = !v; e.textContent = v; };
  n('#n-val', nv); n('#n-fiado', nf); n('#n-compras', nc);
  document.title = `${db.loja.nome} · Annona`;
  $('#lat-loja-ini').textContent = iniciais(db.loja.nome); $('#lat-loja-nome').textContent = db.loja.nome;
  const lc = $('#lat-caixa'), cx0 = CXA(); lc.textContent = cx0.aberto ? `${nomeTerm(TERM())} aberto desde ${horaBR(cx0.ab)}` : `${nomeTerm(TERM())} fechado`; lc.classList.toggle('fechado', !cx0.aberto);
  $('#lat-eu-av').textContent = iniciais(eu().nome); $('#lat-eu-nome').textContent = eu().nome; $('#lat-eu-papel').textContent = PAPEL[eu().perfil] || '';
}

const TELAS = {};
// ------------------------------------------------------------------ equipe, permissões e registro do que aconteceu
const PERMS = [['custo', 'Ver custo e lucro'], ['desconto', 'Dar desconto'], ['cancelar', 'Cancelar venda'], ['fiado', 'Fiado acima do limite'], ['caixa', 'Abrir, sangrar e fechar o caixa'], ['estoque', 'Corrigir estoque e registrar perda'], ['entradas', 'Dar entrada e mudar preço'], ['relatorios', 'Ver relatórios']];
const PAPEL = { dono: 'Dono', caixa: 'Caixa', garcom: 'Garçom do bar', repositor: 'Repositor' };
const eu = () => db.usuarios.find((u) => u.id === db.usuario) || db.usuarios[0];
const dono = () => eu().perfil === 'dono';
const pode = (k) => dono() || !!(eu().perms || {})[k];
const nomeU = (id) => (db.usuarios.find((u) => u.id === id) || {}).nome || '—';
const iniciais = (n) => String(n || '?').split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
function registra(txt, tipo = 'geral') { (db.atividades ||= []).unshift({ data: agora(), quem: eu().nome, txt, tipo }); db.atividades.length = Math.min(db.atividades.length, 400); }
// quem não tem a permissão pede a senha do dono (4 números) na hora
function liberar(k, motivo, ok) {
  if (pode(k)) { ok(); return; }
  const d = db.usuarios.find((u) => u.perfil === 'dono');
  abrir(`${cab('Senha do dono', motivo)}<form class="form"><label>Senha de liberação (4 números)<input name="pin" inputmode="numeric" maxlength="4" autocomplete="off" required style="letter-spacing:8px;text-align:center;font-size:20px"></label>${db.demo ? '<p class="dica">Na demonstração a senha do dono é 1234.</p>' : ''}<footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Liberar</button></footer></form>`, (j) => {
    $('form', j).addEventListener('submit', (e) => { e.preventDefault(); if (!d || !d.pin || e.target.pin.value !== d.pin) { toast(d && d.pin ? 'Senha errada.' : 'O dono ainda não cadastrou a senha em Meu perfil.', true); return; } fechar(); registra(`Liberado com a senha do dono: ${motivo}`, 'liberacao'); grava(); ok(); });
  });
}
TELAS.perfil = () => {
  const u = eu(), h = hoje(), ini = `${h.slice(0, 8)}01`, mv = vendasEntre(ini, h).filter((v) => v.vend === u.id), hj = mv.filter((v) => v.data.slice(0, 10) === h);
  const tot = mv.reduce((s, v) => s + v.total, 0);
  return `<section class="cab-tela"><div><h2>Meu perfil</h2><p>${PAPEL[u.perfil] || 'Equipe'} · ${t(db.loja.nome)}</p></div></section>
  <section class="grade2"><article class="bloco"><div class="perfil-topo"><span class="av grande">${t(iniciais(u.nome))}</span><div><b>${t(u.nome)}</b><small>${PAPEL[u.perfil] || ''}</small></div></div>
    <form class="form duas" id="f-perfil"><label>Nome<input name="nome" value="${t(u.nome)}" required></label><label>WhatsApp<input name="tel" value="${t(u.tel || '')}" inputmode="tel"></label><label class="toda">E-mail<input name="email" type="email" value="${t(u.email || '')}"></label>
      <label class="toda">Abrir o sistema em<select name="abrir">${[['painel', 'Painel'], ['vender', 'Vender'], ['vendas', 'Vendas'], ['estoque', 'Estoque']].map(([k, n]) => `<option value="${k}"${(u.abrir || 'painel') === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="toda">${u.perfil === 'dono' ? 'Senha de liberação (4 números): o caixa pede quando precisar dar desconto ou passar o limite do fiado' : 'Minha senha de 4 números'}<input name="pin" inputmode="numeric" maxlength="4" placeholder="${u.pin ? 'já cadastrada · digite para trocar' : '••••'}" autocomplete="off"></label>
      <footer class="j-pe toda"><button class="bt cheio">Salvar</button></footer></form></article>
    <article class="bloco"><header><h3>${ico('sacola')}Minhas vendas</h3></header><section class="cartoes"><div class="cartao"><div><small>Hoje</small><b>${din(hj.reduce((s, v) => s + v.total, 0))}</b><span class="var">${hj.length} vendas</span></div></div><div class="cartao"><div><small>No mês</small><b>${din(tot)}</b><span class="var">${mv.length} vendas · ticket ${din(mv.length ? Math.round(tot / mv.length) : 0)}</span></div></div></section>
      <h3 class="mini-tit">O que eu posso fazer</h3><ul class="lista-simples">${PERMS.map(([k, n]) => `<li><span>${n}</span><span class="tag ${pode(k) ? 'verde' : 'cinza'}">${pode(k) ? 'Pode' : 'Pede a senha do dono'}</span></li>`).join('')}</ul></article></section>`;
};
TELAS.dono = () => {
  if (!dono()) return `<section class="cab-tela"><div><h2>Painel do dono</h2><p>Só o dono vê este painel.</p></div></section><p class="vazio grande">${db.demo ? '<button type="button" class="bt cheio" data-como="u1">Voltar para o dono (demonstração)</button>' : 'Peça ao dono do comércio.'}</p>`;
  const h = hoje(), ini = `${h.slice(0, 8)}01`, vs = vendasEntre(ini, h), tot = vs.reduce((s, v) => s + v.total, 0), luc = vs.reduce((s, v) => s + lucroVenda(v), 0);
  const perd = db.perdas.filter((x) => x.data.slice(0, 10) >= ini).reduce((s, x) => s + x.custo, 0), diaM = Number(h.slice(8)), ult = new Date(Number(h.slice(0, 4)), Number(h.slice(5, 7)), 0).getDate();
  const meta = db.meta || 0, proj = Math.round((tot / diaM) * ult), pct = meta ? Math.min(100, Math.round((tot / meta) * 100)) : 0;
  const ativ = (db.atividades || []).slice(0, 40);
  return `<section class="cab-tela"><div><h2>Painel do dono</h2><p>Meta, equipe, quem pode o quê e tudo o que aconteceu no comércio.</p></div><div class="acoes"><button type="button" class="bt cheio" data-acao="nova-pessoa">${ico('mais')}Pessoa na equipe</button></div></section>
  <section class="grade2"><article class="bloco"><header><h3>${ico('trofeu')}Meta do mês</h3></header><p class="meta-n"><b>${din(tot)}</b> <span class="mudo">de ${din(meta)} · ${pct}%</span></p><span class="medidor grosso"><i style="width:${pct}%"></i></span>
      <p class="mudo">No ritmo de hoje o mês fecha em <b class="${proj >= meta ? 'ok-txt' : 'verm-txt'}">${din(proj)}</b>. ${meta ? (proj >= meta ? 'Vai bater a meta.' : `Faltam ${din(Math.max(0, meta - tot))} em ${ult - diaM} dias.`) : ''}</p>
      <form class="form" id="f-meta" style="max-width:260px;margin-top:10px"><label>Meta de vendas do mês (R$)<input name="m" inputmode="decimal" value="${campoDin(meta)}"></label></form></article>
    <article class="bloco"><header><h3>${ico('moeda')}Dinheiro do mês</h3></header><dl class="soma"><div><dt>Vendas</dt><dd>${din(tot)}</dd></div><div><dt>Lucro bruto</dt><dd class="ok-txt">${din(luc)}</dd></div><div><dt>Perdas e quebras</dt><dd class="verm-txt">− ${din(perd)}</dd></div><div><dt>Fiado na rua</dt><dd>${din(totalFiado())}</dd></div><div class="total"><dt>Lucro depois das perdas</dt><dd>${din(luc - perd)}</dd></div></dl></article></section>
  <section class="bloco sem-pad"><header class="pad"><h3>${ico('gente')}Equipe no mês</h3></header><table class="tab grande"><thead><tr><th>Pessoa</th><th>Função</th><th>Vendas</th><th>Vendido</th><th class="so-pc">Ticket</th><th class="so-pc">Descontos</th><th></th></tr></thead><tbody>${db.usuarios.map((u) => { const m = vs.filter((v) => v.vend === u.id), tt = m.reduce((s, v) => s + v.total, 0); return `<tr><td><span class="com-foto"><span class="av">${t(iniciais(u.nome))}</span><b>${t(u.nome)}</b></span></td><td>${PAPEL[u.perfil] || ''}</td><td>${m.length}</td><td>${din(tt)}</td><td class="so-pc">${din(m.length ? Math.round(tt / m.length) : 0)}</td><td class="so-pc">${din(m.reduce((s, v) => s + (v.desc || 0), 0))}</td><td class="acoes-l">${db.demo && u.id !== db.usuario ? `<button type="button" class="bt mini" data-como="${u.id}">Ver como ${t(u.nome.split(' ')[0])}</button>` : ''}${u.perfil !== 'dono' ? `<button type="button" class="bt mini perigo" data-tira-u="${u.id}">Tirar</button>` : ''}</td></tr>`; }).join('')}</tbody></table></section>
  <section class="bloco sem-pad"><header class="pad"><h3>${ico('ok')}Quem pode o quê</h3><span class="selo">o dono pode tudo</span></header><div class="perm-rolar"><table class="tab grande perm"><thead><tr><th>Pessoa</th>${PERMS.map(([, n]) => `<th>${n}</th>`).join('')}</tr></thead><tbody>${db.usuarios.filter((u) => u.perfil !== 'dono').map((u) => `<tr><td><b>${t(u.nome)}</b><small class="cod">${PAPEL[u.perfil] || ''}</small></td>${PERMS.map(([k, n]) => `<td><input type="checkbox" data-perm="${u.id}.${k}" ${(u.perms || {})[k] ? 'checked' : ''} aria-label="${t(u.nome)}: ${n}"></td>`).join('')}</tr>`).join('') || `<tr><td colspan="${PERMS.length + 1}" class="vazio">Só o dono na equipe.</td></tr>`}</tbody></table></div><p class="dica pad">Sem a permissão, o sistema pede a senha do dono na hora (cadastre em Meu perfil).</p></section>
  <section class="bloco"><header><h3>${ico('alerta')}O que aconteceu no comércio</h3></header>${ativ.length ? `<ul class="lista-simples ativ">${ativ.map((a) => `<li><span class="ponto-t ${a.tipo}"></span><span><b>${t(a.txt)}</b><small>${dataBR(a.data)} ${horaBR(a.data)} · ${t(a.quem)}</small></span></li>`).join('')}</ul>` : '<p class="vazio">Nada registrado ainda.</p>'}</section>`;
};
function novaPessoa() {
  abrir(`${cab('Pessoa na equipe', window.veltriaConta ? 'Na conta, ela recebe o convite e entra com o próprio login.' : 'Na demonstração, a pessoa fica só neste aparelho.')}<form class="form"><label>Nome<input name="nome" required></label><label>Função<select name="p"><option value="caixa">Caixa</option><option value="repositor">Repositor</option></select></label><label>WhatsApp<input name="tel" inputmode="tel"></label><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Pôr na equipe</button></footer></form>`, (j) => {
    $('form', j).addEventListener('submit', (e) => { e.preventDefault(); const f = e.target, perms = f.p.value === 'repositor' ? { estoque: true, entradas: true } : {}; db.usuarios.push({ id: uid('u'), nome: f.nome.value.trim(), perfil: f.p.value, tel: f.tel.value.trim(), perms }); registra(`${f.nome.value.trim()} entrou na equipe (${PAPEL[f.p.value]})`, 'equipe'); grava(); fechar(); mostra(); });
  });
}

// ------------------------------------------------------------------ telas
const estado = { venda: { itens: [], cli: '', desc: 0 }, filtro: '', cat: '', rel: '30', invent: null };

TELAS.painel = () => {
  const h = hoje(), vh = vendasEntre(h, h), tot = vh.reduce((s, v) => s + v.total, 0), luc = vh.reduce((s, v) => s + lucroVenda(v), 0);
  const hm = new Date().toTimeString().slice(0, 5), ontem = vendasEntre(somaDias(h, -1), somaDias(h, -1)).filter((v) => v.data.slice(11, 16) <= hm), totO = ontem.reduce((s, v) => s + v.total, 0), lucO = ontem.reduce((s, v) => s + lucroVenda(v), 0);
  const varia = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 1000) / 10 : 0);
  const chip = (x, rot = 'em relação a ontem') => `<span class="var ${x >= 0 ? 'sobe' : 'desce'}"><i>${x >= 0 ? '↗' : '↘'} ${x >= 0 ? '+' : '−'}${Math.abs(x).toLocaleString('pt-BR')}%</i> ${rot}</span>`;
  const sem = [], ant = []; for (let i = 6; i >= 0; i--) { const d = somaDias(h, -i); sem.push([d, vendasEntre(d, d).reduce((s, v) => s + v.total, 0)]); ant.push(vendasEntre(somaDias(d, -7), somaDias(d, -7)).reduce((s, v) => s + v.total, 0)); }
  const totS = sem.reduce((s, x) => s + x[1], 0), totA = ant.reduce((s, x) => s + x, 0);
  // mais vendidos de hoje (ou da semana, se o dia ainda está começando), com lucro
  const base = vh.length >= 5 ? vh : vendasEntre(somaDias(h, -6), h), por = {};
  base.forEach((v) => v.itens.forEach((x) => { const p = prod(x.p); if (!p) return; por[p.id] ||= { p, q: 0, l: 0, doses: 0 }; por[p.id].q += x.dose ? 0 : x.q; por[p.id].doses += x.dose ? x.q : 0; por[p.id].l += Math.round(x.q * (x.preco - x.custo)); }));
  const top = Object.values(por).sort((a, b) => b.l - a.l).slice(0, 10);
  const vence = vencendo(7).slice(0, 3), repor = baixos().slice(0, 3);
  return `<section class="kpis">
    <a class="kpi" href="#relatorios"><span class="k-ico verde">${ico('sacola')}</span><div><small>Vendas de hoje</small><b>${din(tot)}</b>${chip(varia(tot, totO), 'em relação a ontem até esta hora')}</div></a>
    <a class="kpi" href="#relatorios"><span class="k-ico verde">${ico('moeda')}</span><div><small>Lucro de hoje</small><b>${pode('custo') ? din(luc) : '••••'}</b>${pode('custo') ? chip(varia(luc, lucO), 'em relação a ontem até esta hora') : '<span class="var">só o dono vê</span>'}</div></a>
    <a class="kpi" href="#fiado"><span class="k-ico ouro">${ico('gente')}</span><div><small>Fiado a receber</small><b>${din(totalFiado())}</b><span class="var">${devedores().length} cliente${devedores().length === 1 ? '' : 's'} com conta aberta</span></div></a>
    <a class="kpi" href="#estoque"><span class="k-ico azul">${ico('caixa')}</span><div><small>Valor em estoque</small><b>${din(valorEstoque())}</b><span class="var">pelo preço de custo</span></div></a>
  </section>
  <section class="painel-meio">
    <article class="bloco grafico"><header><h3>${ico('relat')}Vendas da semana</h3>${chip(varia(totS, totA), 'em relação à semana anterior')}</header>${linha(sem)}<p class="mudo">Total dos 7 dias: <b>${din(totS)}</b></p></article>
    <article class="bloco"><header><h3>${ico('cal')}Vence em 7 dias</h3><a class="seta-link" href="#validades" aria-label="Ver validades">${ico('seta')}</a></header>
      ${vence.length ? `<ul class="lista-foto">${vence.map((l) => { const d = dias(h, l.val); return `<li>${foto(l.p)}<span><b>${t(l.p.nome)}</b><small>${d < 0 ? `Venceu em ${dataBR(l.val)}` : `Vence em ${dataBR(l.val).slice(0, 5)}`}</small></span><span class="tag ${d <= 2 ? 'verm' : 'ambar'}">${qtdTxt(l.p, l.q)}</span></li>`; }).join('')}</ul>` : '<p class="vazio">Nada vencendo nos próximos 7 dias.</p>'}</article>
    <article class="bloco"><header><h3>${ico('alerta')}Repor agora</h3><a class="seta-link" href="#compras" aria-label="Ver lista de compras">${ico('seta')}</a></header>
      ${repor.length ? `<ul class="lista-foto">${repor.map((p) => `<li>${foto(p)}<span><b>${t(p.nome)}</b><small>Estoque: ${qtdTxt(p)}</small></span><span class="tag ambar">Mín. ${numBR(p.min, 1)}</span></li>`).join('')}</ul>` : '<p class="vazio">Nenhum produto abaixo do mínimo.</p>'}</article>
  </section>
  <section class="painel-baixo">
    <article class="bloco"><header><h3>${ico('trofeu')}Mais vendidos ${base === vh ? 'hoje' : 'da semana'}</h3><span class="carro-bts"><button type="button" class="icone-bt" data-carro="-1" aria-label="Anteriores">‹</button><button type="button" class="icone-bt" data-carro="1" aria-label="Próximos">›</button></span></header>
      <div class="carrossel" id="carrossel">${top.map((x) => `<a class="vitrine" href="#estoque" data-prod-v="${x.p.id}">${foto(x.p, 'grande')}<b>${t(x.p.nome)}</b><small>${x.q ? `${x.p.un === 'kg' ? `${numBR(x.q, 1)} kg` : `${numBR(x.q, 0)} un`} vendid${x.p.un === 'kg' ? 'os' : 'as'}` : ''}</small>${pode('custo') ? `<span class="lucro">↗ Lucro: ${din(x.l)}</span>` : ''}</a>`).join('') || '<p class="vazio">Ainda sem vendas.</p>'}</div></article>
    <article class="bloco"><header><h3>${ico('caixa')}Parados há 30 dias</h3><a class="seta-link" href="#estoque" data-ir-parados aria-label="Ver parados no estoque">${ico('seta')}</a></header>
      ${parados().length ? `<ul class="lista-foto">${parados().slice(0, 3).map((p) => `<li>${foto(p)}<span><b>${t(p.nome)}</b><small>${ultimaVenda(p) ? `Última venda em ${dataBR(ultimaVenda(p))}` : 'Nunca vendeu'}</small></span><span class="tag cinza">${din(Math.round(p.q * p.custo))}</span></li>`).join('')}</ul><p class="mudo">Dinheiro parado: <b>${din(parados().reduce((a, p) => a + p.q * p.custo, 0))}</b></p>` : '<p class="vazio">Nenhum produto parado. Tudo girando.</p>'}
      ${caixaTxt()}</article>
  </section>`;
};
// gráfico de linha suave (SVG) com área, pontos e o maior dia destacado
function linha(sem) {
  const W = 580, H = 240, pe = 30, esq = 96, max = Math.max(...sem.map((x) => x[1]), 1), passo = [500, 1000, 2000, 2500, 5000, 10000, 20000, 50000].map((x) => x * 100).find((x) => x * 4 >= max) || 5000000, teto = passo * 4;
  const X = (i) => esq + (i * (W - esq - 16)) / (sem.length - 1), Y = (v) => 12 + (1 - v / teto) * (H - pe - 24);
  const pts = sem.map((x, i) => [X(i), Y(x[1])]);
  let d = `M${pts[0][0]},${pts[0][1]}`; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2; d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`; }
  const NS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], im = sem.reduce((b, x, i) => (x[1] > sem[b][1] ? i : b), 0), lin = [0, 0.25, 0.5, 0.75, 1].map((f) => teto * f);
  return `<svg class="linha" viewBox="0 0 ${W} ${H}" role="img" aria-label="Vendas dos últimos 7 dias"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2D9A7F" stop-opacity=".28"/><stop offset="1" stop-color="#2D9A7F" stop-opacity="0"/></linearGradient></defs>
    ${lin.map((v) => `<line x1="${esq}" x2="${W - 8}" y1="${Y(v)}" y2="${Y(v)}" class="grade-l"/><text x="${esq - 8}" y="${Y(v) + 4}" text-anchor="end" class="eixo">${din(v).replace(',00', '')}</text>`).join('')}
    <path d="${d} L${pts.at(-1)[0]},${Y(0)} L${pts[0][0]},${Y(0)} Z" fill="url(#ga)"/><path d="${d}" class="traco"/>
    ${pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === im ? 6 : 4}" class="ponto${i === im ? ' max' : ''}"><title>${dataBR(sem[i][0])}: ${din(sem[i][1])}</title></circle><text x="${x}" y="${H - 6}" text-anchor="middle" class="eixo">${i === sem.length - 1 ? 'Hoje' : NS[new Date(`${sem[i][0]}T12:00`).getDay()]}</text>`).join('')}
    <g transform="translate(${Math.min(pts[im][0], W - 60)},${pts[im][1] < 44 ? pts[im][1] + 30 : pts[im][1] - 28})"><rect x="-54" y="-14" width="108" height="26" rx="8" class="balao"/><text y="4" text-anchor="middle" class="balao-t">${din(sem[im][1])}</text></g></svg>`;
}
function caixaTxt() {
  const c = CXA();
  return c.aberto ? `<p class="caixa-linha">${ico('caixa')} ${t(nomeTerm(TERM()))} aberto desde ${horaBR(c.ab)}. Dinheiro esperado na gaveta: <b>${din(resumoCaixa().esperado)}</b>. <a href="#caixa">Ver o caixa</a></p>` : `<p class="caixa-linha alerta">${ico('alerta')} O caixa está fechado. <a href="#caixa">Abrir o caixa</a></p>`;
}

// ------------------------------------------------------------------ vender (balcão)
// happy hour: preço por dia da semana e horário (ex.: cerveja de quinta e sexta, das 18h às 20h)
const hhAgora = () => false;
const precoAgora = (p) => p.preco;
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const hhTxt = (p) => (p.hh && p.hh.preco ? `Happy hour ${din(p.hh.preco)} · ${(p.hh.dias || []).map((x) => DIAS[x]).join(', ')} das ${p.hh.de} às ${p.hh.ate}` : '');
const totalVenda = () => Math.max(0, estado.venda.itens.reduce((s, x) => s + Math.round(x.q * x.preco), 0) - estado.venda.desc);
function addItem(lista, p, { q = 1, dose = false, cozinha = false } = {}) {
  if (dose && !p.dose) dose = false;
  const pr = dose ? p.dose.preco : precoAgora(p), vaiCozinha = cozinha && p.cozinha;
  // pedido da cozinha é sempre uma linha nova (cada pedido tem a sua hora e as suas observações)
  const ja = !vaiCozinha && lista.find((x) => x.p === p.id && !!x.dose === dose && p.un !== 'kg' && !x.obs && !(x.adics || []).length && x.preco === pr);
  if (ja) { ja.q = r3(ja.q + q); return ja; }
  const it = dose ? { p: p.id, nome: `Dose de ${p.nome.replace(/ \d.*$/, '')}`, q, preco: pr, custo: Math.round(p.custo * p.dose.doseMl / p.dose.ml), dose: true, h: agora() } : { p: p.id, nome: p.nome, q, preco: pr, base: pr, custo: p.custo, h: agora(), ...(hhAgora(p) ? { hh: true } : {}) };
  if (vaiCozinha) Object.assign(it, { id: uid('i'), cz: 'novo' });
  lista.push(it); return it;
}
// escolhe garrafa ou dose, ou pede o peso; depois chama ok(q, dose)
function quanto(p, ok) {
  if (p.dose) {
    abrir(`${cab(t(p.nome), `Estoque: ${qtdTxt(p)}`)}<div class="escolha2"><button type="button" class="opcao" data-d="1">${ico('taca')}<b>Dose de ${p.dose.doseMl} ml</b><span>${din(p.dose.preco)}</span></button><button type="button" class="opcao" data-d="0">${ico('caixa')}<b>Garrafa fechada</b><span>${din(p.preco)}</span></button></div>`, (j) => $$('[data-d]', j).forEach((b) => b.addEventListener('click', () => { fechar(); ok(1, b.dataset.d === '1'); })));
    return;
  }
  if (p.un === 'kg') {
    const pr = precoAgora(p);
    abrir(`${cab(`Peso de ${t(p.nome)}`, `${din(pr)} o kg`)}<form class="form" id="f-peso"><label>Peso que está na balança (kg)<input name="kg" class="peso-in" inputmode="decimal" required placeholder="0,350" autocomplete="off"></label>
      <div class="pesos">${[0.1, 0.2, 0.25, 0.5, 0.75, 1].map((x) => `<button type="button" class="peso-bt" data-kg="${x}">${x < 1 ? `${x * 1000} g` : '1 kg'}</button>`).join('')}</div>
      <p class="peso-tot" id="pz">R$ 0,00</p><p class="aviso-peso" id="pa" hidden></p><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio verde grande">Pôr na venda</button></footer></form>`, (j) => {
      const f = $('form', j), mostraT = () => { const q = lerNum(f.kg.value); $('#pz', j).textContent = din(Math.round(q * pr)); const a = $('#pa', j); a.hidden = !(q > 5 || (q > 0 && q < 0.02)); a.textContent = q > 5 ? `${numBR(q)} kg? Confira: talvez seja ${numBR(q / 10)} ou ${numBR(q / 100)} kg.` : 'Peso muito baixo. Confira a vírgula: 0,350 = 350 gramas.'; };
      f.kg.addEventListener('input', mostraT);
      $$('[data-kg]', j).forEach((b) => b.addEventListener('click', () => { f.kg.value = numBR(Number(b.dataset.kg)); mostraT(); f.kg.focus(); }));
      let confirmou = false;
      f.addEventListener('submit', (e) => { e.preventDefault(); const q = r3(lerNum(f.kg.value)); if (q <= 0) { toast('Digite o peso, por exemplo 0,350.', true); return; } if ((q > 5 || q < 0.02) && !confirmou) { confirmou = true; toast('Peso fora do comum. Confira e toque de novo em Pôr na venda.', true); return; } fechar(); ok(q, false); });
    });
    return;
  }
  ok(1, false);
}
TELAS.vender = () => {
  const v = estado.venda, tot = totalVenda(), sub = v.itens.reduce((s, x) => s + Math.round(x.q * x.preco), 0);
  const rapidos = maisVendidos(10);
  return `<section class="pdv">
    <div class="pdv-esq">
      <form class="leitor" id="f-leitor" autocomplete="off"><span>${ico('busca')}</span><input id="leitor" placeholder="Passe o código no leitor ou digite o nome" aria-label="Código de barras ou nome do produto" autofocus><button type="button" class="icone-bt" data-acao="camera-venda" aria-label="Ler código pela câmera">${ico('cam')}</button></form>
      <div class="sugestoes" id="sugestoes"></div>
      <h3 class="mini-tit">Mais vendidos</h3>
      <div class="rapidos">${rapidos.map((p) => `<button type="button" class="rapido" data-por="${p.id}">${foto(p)}<b>${t(p.nome)}</b><span>${din(precoAgora(p))}${p.un === 'kg' ? '/kg' : ''}</span>${hhAgora(p) ? '<i class="hh-on">happy hour agora</i>' : ''}${p.dose ? `<i>dose ${din(p.dose.preco)}</i>` : ''}</button>`).join('')}</div>
    </div>
    <aside class="pdv-dir bloco">
      <header><h3>${ico('sacola')}Venda no balcão</h3>${v.itens.length ? '<button type="button" class="link" data-acao="limpar-venda">Limpar</button>' : ''}</header>
      ${v.itens.length ? `<ul class="itens">${v.itens.map((x, i) => itemLinha(x, i, 'venda')).join('')}</ul>` : '<p class="vazio">Passe o primeiro produto no leitor, digite o nome ou toque num dos mais vendidos.</p>'}
      <dl class="soma"><div><dt>Subtotal</dt><dd>${din(sub)}</dd></div>${v.desc ? `<div><dt>Desconto</dt><dd>− ${din(v.desc)}</dd></div>` : ''}<div class="total"><dt>Total</dt><dd>${din(tot)}</dd></div></dl>
      <div class="pdv-acoes"><button type="button" class="bt" data-acao="desconto" ${v.itens.length ? '' : 'disabled'}>Desconto</button><button type="button" class="bt cheio verde grande" data-acao="pagar-venda" ${v.itens.length ? '' : 'disabled'}>Receber ${din(tot)}</button></div>
      ${CXA().aberto ? '' : '<p class="aviso-mini">Este caixa está fechado. Você pode vender; o dinheiro entra no próximo caixa aberto.</p>'}
    </aside></section>`;
};
function itemLinha(x, i, onde) {
  const p = prod(x.p), kg = p && p.un === 'kg' && !x.dose;
  const CZ = { novo: ['Na fila da cozinha', 'ambar'], prep: ['Preparando', 'ambar'], pronto: ['Pronto: levar à mesa', 'verde'], entregue: ['Entregue', 'cinza'] };
  const extra = [x.hh ? '<span class="tag ouro-tag">happy hour</span>' : '', x.cz ? `<span class="tag ${CZ[x.cz][1]}">${CZ[x.cz][0]}</span>` : '', (x.adics || []).length ? `<small class="adic">+ ${t(x.adics.map((a) => a.n).join(', '))}</small>` : '', x.obs ? `<small class="obs">“${t(x.obs)}”</small>` : ''].join('');
  return `<li>${foto(p, 'mini')}<div><b>${t(x.nome)}</b><small>${kg ? `${numBR(x.q)} kg × ${din(x.preco)}` : `${din(x.preco)} cada`}</small>${extra}${onde !== 'venda' && p && !x.dose && (p.cozinha || (p.adics || []).length) ? `<button type="button" class="link mini-link" data-obs="${onde}:${i}">${x.obs || (x.adics || []).length ? 'Mudar observação' : '+ Observação ou adicional'}</button>` : ''}${x.cz === 'pronto' ? `<button type="button" class="link mini-link" data-entregue="${onde}:${i}">Marcar como entregue</button>` : ''}</div>
    <div class="qtd">${kg ? '' : `<button type="button" class="icone-bt" data-menos="${onde}:${i}" aria-label="Tirar um">${ico('menos')}</button><span>${numBR(x.q, 0)}</span><button type="button" class="icone-bt" data-mais="${onde}:${i}" aria-label="Mais um">${ico('mais')}</button>`}</div>
    <b class="vl">${din(Math.round(x.q * x.preco))}</b><button type="button" class="icone-bt" data-tira="${onde}:${i}" aria-label="Tirar ${t(x.nome)}">${ico('lixo')}</button></li>`;
}
function maisVendidos(n) {
  const c = {}; vendasEntre(somaDias(hoje(), -29), hoje()).forEach((v) => v.itens.forEach((x) => { c[x.p] = (c[x.p] || 0) + (x.dose ? x.q * 0.4 : x.q); }));
  const l = Object.entries(c).sort((a, b) => b[1] - a[1]).map((x) => prod(x[0])).filter((p) => p && !p.arq).slice(0, n);
  return l.length ? l : ativos().slice(0, n);
}
function poeNaVenda(p) {
  quanto(p, (q, dose) => {
    if (!dose && !p.semEstoque && p.q - q < 0 && p.un !== 'kg') toast(`Atenção: o estoque de ${p.nome} vai ficar negativo. Confira depois.`, true);
    addItem(estado.venda.itens, p, { q, dose }); mostra(); setTimeout(() => { const l = $('#leitor'); if (l) l.focus(); }, 30);
  });
}
// etiqueta da balança (13 dígitos): 2 + PLU (4 dígitos + 0, ou 5 dígitos) + valor em 6 dígitos (centavos ou gramas) + dígito verificador
function lerBalanca(s2) {
  const bl = db.loja.bal; if (!bl || !bl.ativo || !/^2\d{12}$/.test(s2)) return null;
  const dig = bl.dig === 5 ? 5 : 4, plu = Number(s2.slice(1, 1 + dig)), val = Number(s2.slice(6, 12)), p = ativos().find((x) => x.plu && Number(x.plu) === plu);
  if (!p || !val) return null;
  return { p, q: bl.tipo === 'peso' ? r3(val / 1000) : r3(val / p.preco) };
}
function lerNoBalcao(txt) {
  const s = String(txt || '').trim(); if (!s) return;
  const bal = lerBalanca(s);
  if (bal) { addItem(estado.venda.itens, bal.p, { q: bal.q }); mostra(); toast(`${bal.p.nome}: ${numBR(bal.q)} kg pela etiqueta da balança.`); setTimeout(() => { const l = $('#leitor'); if (l) l.focus(); }, 30); return; }
  const p = ativos().find((x) => x.cod === s);
  if (p) { poeNaVenda(p); return; }
  const l = buscaProd(s);
  if (l.length === 1) { poeNaVenda(l[0]); return; }
  if (/^\d{8,14}$/.test(s)) { confirmar('Código não cadastrado', `O código ${t(s)} ainda não está no estoque. Quer cadastrar o produto agora?`, 'Cadastrar', () => formProduto({ cod: s })); return; }
  toast(l.length ? 'Escolha um dos produtos da lista.' : 'Nenhum produto com esse nome.', !l.length);
}

// pagamento (balcão e mesa usam o mesmo)
function pagar({ itens, desc = 0, servico = 0, titulo, origem, mesa = null, depois }) {
  const bruto = itens.reduce((s, x) => s + Math.round(x.q * x.preco), 0), total = Math.max(0, bruto - desc + servico);
  const pag = [];
  const resta = () => total - pag.reduce((s, x) => s + x.v, 0);
  const desenha = (j) => {
    const r = resta();
    $('#pg-lista', j).innerHTML = pag.length ? pag.map((x, i) => `<li><span>${FORMAS[x.f]}${x.cli ? ` · ${t(cli(x.cli).nome)}` : ''}${x.troco ? ` · troco ${din(x.troco)}` : ''}</span><b>${din(x.v)}</b><button type="button" class="icone-bt" data-tirapg="${i}" aria-label="Tirar">${ico('x')}</button></li>`).join('') : '';
    $('#pg-resta', j).innerHTML = r > 0 ? `Falta receber <b>${din(r)}</b>` : '<b class="ok-txt">Tudo recebido</b>';
    $('#pg-val', j).value = r > 0 ? campoDin(r) : '';
    $('#pg-fim', j).disabled = r > 0; $('#pg-formas', j).hidden = r <= 0;
    $$('[data-tirapg]', j).forEach((b) => b.addEventListener('click', () => { pag.splice(Number(b.dataset.tirapg), 1); desenha(j); }));
  };
  pagar.reabre = () => { abrirPg(); };
  const abrirPg = () => abrir(`${cab(titulo, `Total ${din(total)}${servico ? ` (com ${din(servico)} de serviço)` : ''}${desc ? ` · desconto de ${din(desc)}` : ''}`)}
    <div class="form"><ul class="pg-lista" id="pg-lista"></ul><p class="pg-resta" id="pg-resta"></p>
    <div id="pg-formas"><label>Valor desta parte<input id="pg-val" inputmode="decimal"></label>
    <div class="formas">${Object.entries(FORMAS).map(([k, n]) => `<button type="button" class="forma" data-f="${k}">${n}</button>`).join('')}</div>
    <div id="pg-extra"></div></div>
    <footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio verde" id="pg-fim" disabled>Concluir venda</button></footer></div>${listaCli()}`, (j) => {
    desenha(j);
    $$('[data-f]', j).forEach((b) => b.addEventListener('click', () => {
      const f = b.dataset.f, v = Math.min(lerDin($('#pg-val', j).value), f === 'dinheiro' ? Infinity : resta()), ex = $('#pg-extra', j);
      if (v <= 0) { toast('Digite o valor desta parte.', true); return; }
      if (f === 'dinheiro') {
        const vale = Math.min(v, resta()), troco = v - vale; pag.push({ f, v: vale, troco: troco > 0 ? troco : 0 }); ex.innerHTML = troco > 0 ? `<p class="troco">Troco: <b>${din(troco)}</b></p>` : ''; desenha(j); return;
      }
      if (f === 'pix') {
        const chave = db.loja.pix; let qr = '';
        if (chave) { try { const cod = pixCopiaECola({ chave, nome: db.loja.nome, cidade: db.loja.cidade || 'BRASIL', valor: v / 100 }); qr = `<div class="pix-qr">${qrSVG(cod, 180, '#3A1A24')}<p>O cliente lê o QR no app do banco. Confira no seu celular se o Pix de <b>${din(v)}</b> caiu antes de concluir.</p></div>`; } catch (e) { qr = ''; } }
        ex.innerHTML = qr || '<p class="mudo">Cadastre a chave Pix em Configurações para mostrar o QR aqui.</p>'; pag.push({ f, v }); desenha(j); return;
      }
      if (f === 'fiado') {
        ex.innerHTML = `<label>Cliente do fiado<input id="pg-cli" list="dl-cli" placeholder="Nome do cliente"></label><button type="button" class="bt" id="pg-cli-ok">Pendurar ${din(v)}</button>`;
        const ok = () => {
          const c = db.clientes.find((x) => sa(x.nome) === sa($('#pg-cli', j).value));
          if (!c) { confirmar('Cliente novo', 'Esse nome não está no fiado. Quer cadastrar agora?', 'Cadastrar', () => formCliente({ nome: $('#pg-cli', j).value })); return; }
          const s = situCli(c), novoSaldo = s.k.saldo + v;
          const segue = () => { pag.push({ f, v, cli: c.id }); ex.innerHTML = ''; desenha(j); };
          if (s.s === 'bloq' && !c.bloq && s.k.saldo > 0) { const vv = v; abrir(`${cab(`${t(c.nome)} está travado`, s.txt)}<p class="j-txt">Deve ${din(s.k.saldo)}. Se pagar a dívida agora (ou a parte atrasada), o crédito volta na hora e a compra de hoje entra no fiado, sem senha.</p><footer class="j-pe"><button type="button" class="bt" data-volta>Voltar</button><button type="button" class="bt cheio verde" data-rec>Receber a dívida agora</button></footer>`, (j2) => { $('[data-volta]', j2).addEventListener('click', () => pagar.reabre()); $('[data-rec]', j2).addEventListener('click', () => receber(c, () => { const s3 = situCli(c); if (s3.s !== 'bloq' && s3.k.saldo + vv <= c.limite) { pag.push({ f, v: vv, cli: c.id }); toast(`Crédito liberado: ${din(vv)} no fiado de ${c.nome}.`); } pagar.reabre(); })); }); return; }
          if (s.s === 'bloq') { toast(`${c.nome}: ${s.txt}. Só o dono libera em Fiado.`, true); return; }
          if (novoSaldo > c.limite) { const vv = v; liberar('fiado', `fiado de ${c.nome} acima do limite (${din(novoSaldo)} de ${din(c.limite)})`, () => { pag.push({ f, v: vv, cli: c.id }); pagar.reabre(); }); return; }
          segue();
        };
        $('#pg-cli-ok', j).addEventListener('click', ok); $('#pg-cli', j).focus(); return;
      }
      pag.push({ f, v }); ex.innerHTML = ''; desenha(j);
    }));
    $('#pg-fim', j).addEventListener('click', () => {
      const venda = { id: uid('v'), cx: TERM(), n: (db.vendas.at(-1) || { n: 0 }).n + 1, data: agora(), itens: itens.map((x) => ({ ...x })), total, desc, servico, pag: pag.map((x) => ({ ...x })), origem, mesa, vend: db.usuario };
      venda.itens.forEach((x) => { const p = prod(x.p); if (p) baixar(p, qBaixa(x)); });
      pag.filter((x) => x.f === 'fiado').forEach((x) => db.fiado.push({ id: uid('f'), cli: x.cli, data: venda.data, tipo: 'compra', v: x.v, venda: venda.id, obs: `Venda nº ${venda.n}` }));
      if (desc) registra(`Desconto de ${din(desc)} na venda nº ${venda.n}`, 'desconto');
      db.vendas.push(venda); grava(); fechar(); depois && depois(venda); comprovante(venda);
    });
  });
  abrirPg();
}
// imprime direto por um quadro escondido (sem abrir janela). No Chrome aberto com --kiosk-printing, sai sem perguntar nada.
function imprimir(txt) {
  let f = $('#quadro-imp'); if (!f) { f = document.createElement('iframe'); f.id = 'quadro-imp'; f.title = 'impressão'; f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; document.body.append(f); }
  const d = f.contentDocument; d.open(); d.write(`<!doctype html><meta charset="utf-8"><style>@page{size:80mm auto;margin:3mm}body{margin:0;font:12.5px/1.35 monospace;white-space:pre-wrap;width:74mm}</style>${t(txt)}`); d.close();
  setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast('Não consegui imprimir. Confira a impressora.', true); } }, 60);
}
function comprovante(v) {
  const c = v.pag.find((x) => x.cli), cl = c && cli(c.cli);
  const linhas = v.itens.map((x) => `${numBR(x.q, 3)} ${x.nome}${(x.adics || []).length ? ` (+ ${x.adics.map((a) => a.n).join(', ')})` : ''} ${din(Math.round(x.q * x.preco))}`);
  const txt = `${db.loja.nome}\nVenda nº ${v.n} · ${dataBR(v.data)} ${horaBR(v.data)}\n\n${linhas.join('\n')}\n${v.servico ? `Serviço ${din(v.servico)}\n` : ''}${v.desc ? `Desconto −${din(v.desc)}\n` : ''}Total ${din(v.total)}\n${v.pag.map((x) => `${FORMAS[x.f]} ${din(x.v)}`).join('\n')}\n\nComprovante sem valor fiscal. Obrigado pela preferência!`;
  const fi = v.pag.find((x) => x.f === 'fiado'), assina = fi && cl ? `\n\nReconheço que fiquei devendo ${din(fi.v)}\nao ${db.loja.nome} por esta compra.\n\n\n______________________________\n${cl.nome}` : '';
  const duasVias = assina ? `${txt}${assina}\n\n1ª via: fica com o comércio\n\n- - - - - - - - - - - - - - - -\n\n${txt}\n\n2ª via: do cliente` : txt;
  abrir(`${cab('Venda concluída', `Nº ${v.n} · ${din(v.total)}`)}<pre class="cupom">${t(assina ? txt + assina : txt)}</pre><footer class="j-pe"><button type="button" class="bt" data-imp>${ico('imp')}${assina ? 'Imprimir 2 vias' : 'Imprimir'}</button>${cl && cl.tel ? `<a class="bt" target="_blank" rel="noopener" href="${zap(cl.tel, txt)}">${ico('zap')}Mandar no WhatsApp</a>` : ''}<button type="button" class="bt cheio" data-fechar>Nova venda</button></footer>`, (j) => {
    $('[data-imp]', j).addEventListener('click', () => imprimir(duasVias));
    if (db.loja.impAuto) imprimir(duasVias);
    setTimeout(() => $('[data-imp]', j).focus(), 40); // Enter imprime
  });
}

// ------------------------------------------------------------------ estoque
// vendas: tudo o que foi vendido, com busca, detalhe, reimpressão e cancelamento (o estoque volta e o fiado é estornado)
TELAS.vendas = () => {
  const k = estado.vper || 'hoje', [de, ate] = periodo(k), b = sa(estado.vbusca || '');
  const l = db.vendas.filter((v) => v.data.slice(0, 10) >= de && v.data.slice(0, 10) <= ate).filter((v) => !b || String(v.n) === b || v.itens.some((x) => sa(x.nome).includes(b)) || v.pag.some((x) => x.cli && sa((cli(x.cli) || {}).nome).includes(b))).reverse();
  const ok = l.filter((v) => !v.cancelada), tot = ok.reduce((a, v) => a + v.total, 0), canc = l.filter((v) => v.cancelada);
  return `<section class="cab-tela"><div><h2>Vendas</h2><p>${ok.length} venda${ok.length === 1 ? '' : 's'} · ${din(tot)}${canc.length ? ` · ${canc.length} cancelada${canc.length === 1 ? '' : 's'}` : ''}</p></div><div class="acoes"><button type="button" class="bt" data-acao="exportar-vendas">Planilha</button><a class="bt cheio" href="#vender">${ico('mais')}Nova venda</a></div></section>
  <div class="chips">${[['hoje', 'Hoje'], ['7', '7 dias'], ['30', '30 dias'], ['mes', 'Este mês']].map(([v, n]) => `<button type="button" class="chip${k === v ? ' on' : ''}" data-vper="${v}">${n}</button>`).join('')}</div>
  <form class="leitor" id="f-vbusca" autocomplete="off"><span>${ico('busca')}</span><input id="vbusca" value="${t(estado.vbusca || '')}" placeholder="Número da venda, produto ou cliente do fiado" aria-label="Buscar venda"></form>
  <section class="bloco sem-pad"><table class="tab grande"><thead><tr><th>Nº</th><th>Quando</th><th>Itens</th><th class="so-pc">Pagamento</th><th class="so-pc">Quem vendeu</th><th>Total</th></tr></thead><tbody>
  ${l.slice(0, 300).map((v) => `<tr class="clica${v.cancelada ? ' cancelada' : ''}" data-venda="${v.id}"><td><b>${v.n}</b></td><td>${dataBR(v.data)} <small class="cod">${horaBR(v.data)}</small></td><td>${t(v.itens.map((x) => x.nome).slice(0, 2).join(', '))}${v.itens.length > 2 ? ` <small class="cod">+${v.itens.length - 2}</small>` : ''}</td><td class="so-pc">${v.pag.map((x) => FORMAS[x.f]).join(' + ')}</td><td class="so-pc">${t(nomeU(v.vend))}</td><td>${v.cancelada ? `<span class="tag verm">Cancelada</span> <s>${din(v.total)}</s>` : `<b>${din(v.total)}</b>`}</td></tr>`).join('') || '<tr><td colspan="6" class="vazio">Nenhuma venda no período.</td></tr>'}
  </tbody></table></section>`;
};
function detalheVenda(v) {
  const luc = lucroVenda(v);
  abrir(`${cab(`Venda nº ${v.n}`, `${dataBR(v.data)} às ${horaBR(v.data)} · ${t(nomeU(v.vend))}`)}${v.cancelada ? `<p class="faixa-alerta">${ico('alerta')} Cancelada em ${dataBR(v.cancelada.data)} por ${t(v.cancelada.quem)}: ${t(v.cancelada.motivo)}</p>` : ''}
    <table class="tab"><thead><tr><th>Produto</th><th>Qtd.</th><th>Preço</th><th>Total</th></tr></thead><tbody>${v.itens.map((x) => `<tr><td>${t(x.nome)}</td><td>${numBR(x.q)}</td><td>${din(x.preco)}</td><td>${din(Math.round(x.q * x.preco))}</td></tr>`).join('')}</tbody></table>
    <dl class="soma">${v.desc ? `<div><dt>Desconto</dt><dd>− ${din(v.desc)}</dd></div>` : ''}<div class="total"><dt>Total</dt><dd>${din(v.total)}</dd></div>${v.pag.map((x) => `<div><dt>${FORMAS[x.f]}${x.cli ? ` · ${t((cli(x.cli) || {}).nome || '')}` : ''}</dt><dd>${din(x.v)}</dd></div>`).join('')}${pode('custo') ? `<div><dt>Lucro</dt><dd class="ok-txt">${din(luc)}</dd></div>` : ''}</dl>
    <footer class="j-pe">${v.cancelada ? '' : '<button type="button" class="bt perigo" data-cancelar>Cancelar a venda</button>'}<button type="button" class="bt" data-reimp>${ico('imp')}Imprimir de novo</button><button type="button" class="bt cheio" data-fechar>Ok</button></footer>`, (j) => {
    $('[data-reimp]', j).addEventListener('click', () => { fechar(); comprovante(v); });
    const bc = $('[data-cancelar]', j); if (bc) bc.addEventListener('click', () => liberar('cancelar', `cancelar a venda nº ${v.n}`, () => cancelarVenda(v)));
  }, true);
}
function cancelarVenda(v) {
  abrir(`${cab(`Cancelar a venda nº ${v.n}`, din(v.total))}<form class="form"><label>Motivo<select name="m"><option>Cliente desistiu da compra</option><option>Lançada errada</option><option>Troca de produto</option><option>Devolução</option><option>Outro</option></select></label><label>Observação<input name="obs" placeholder="Opcional"></label><p class="dica">Os produtos voltam para o estoque${v.pag.some((x) => x.f === 'fiado') ? ' e o valor sai do fiado do cliente' : ''}. Se o cliente pagou em dinheiro, devolva pelo caixa (sangria).</p><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio perigo">Cancelar a venda</button></footer></form>`, (j) => {
    $('form', j).addEventListener('submit', (e) => {
      e.preventDefault(); const f = e.target, motivo = f.m.value + (f.obs.value.trim() ? `: ${f.obs.value.trim()}` : '');
      v.itens.forEach((x) => { const p = prod(x.p); if (p) devolver(p, x.q); });
      db.fiado = db.fiado.filter((x) => x.venda !== v.id);
      v.cancelada = { data: agora(), motivo, quem: eu().nome };
      registra(`Venda nº ${v.n} cancelada (${din(v.total)}): ${motivo}. O estoque voltou.`, 'cancelada'); grava(); fechar(); mostra(); toast('Venda cancelada. O estoque voltou.');
    });
  });
}
TELAS.estoque = () => {
  const f = sa(estado.filtro), c = estado.cat;
  const pr = new Set(parados().map((x) => x.id)), l = ativos().filter((p) => (!c || (c === '_baixo' ? baixos().includes(p) : c === '_parado' ? pr.has(p.id) : p.cat === c)) && (!f || sa(p.nome).includes(f) || p.cod.includes(estado.filtro.trim()))).sort((a, b) => a.cat.localeCompare(b.cat) || a.nome.localeCompare(b.nome));
  const nBaixo = baixos().length;
  return `<section class="cab-tela"><div><h2>Estoque</h2><p>${ativos().length} produtos · ${din(valorEstoque())} em mercadoria pelo custo.</p></div><div class="acoes"><button type="button" class="bt" data-acao="exportar-estoque">Planilha</button><button type="button" class="bt" data-acao="importar">Importar planilha</button><button type="button" class="bt" data-acao="reajuste">Reajustar preços</button><button type="button" class="bt" data-acao="etiquetas">${ico('imp')}Imprimir etiquetas</button><button type="button" class="bt cheio" data-acao="novo-produto">${ico('mais')}Novo produto</button></div></section>
  <form class="leitor" id="f-busca-est" autocomplete="off"><span>${ico('busca')}</span><input id="busca-est" value="${t(estado.filtro)}" placeholder="Buscar pelo nome ou passar o código" aria-label="Buscar produto"><button type="button" class="icone-bt" data-acao="camera-estoque" aria-label="Ler código pela câmera">${ico('cam')}</button></form>
  <div class="chips"><button type="button" class="chip${!c ? ' on' : ''}" data-cat="">Todos</button><button type="button" class="chip alerta${c === '_baixo' ? ' on' : ''}" data-cat="_baixo">Repor (${nBaixo})</button><button type="button" class="chip${c === '_parado' ? ' on' : ''}" data-cat="_parado">Parados há 30 dias (${pr.size})</button>${cats().map((x) => `<button type="button" class="chip${c === x ? ' on' : ''}" data-cat="${t(x)}">${t(x)}</button>`).join('')}</div>
  <section class="bloco sem-pad"><table class="tab grande"><thead><tr><th>Produto</th><th>Estoque</th><th class="so-pc">Mínimo</th><th class="so-pc">Custo</th><th>Preço</th><th class="so-pc">Margem</th><th class="so-pc">Dura</th><th class="so-pc">Validade mais próxima</th></tr></thead><tbody>
  ${l.map((p) => { const s = situ(p), lv = (p.lotes || []).filter((x) => x.val).sort((a, b) => a.val.localeCompare(b.val))[0]; return `<tr class="clica" data-prod="${p.id}"><td><span class="com-foto">${foto(p, 'mini')}<span><b>${t(p.nome)}</b><small class="cod">${t(p.cat)} · <span class="cod-num">${tipoBarras(p.cod).tipo ? `<span class="mini-barras" title="Código de barras ${t(tipoBarras(p.cod).tipo)}">${ico('barras')}</span>` : ''}${t(p.cod)}</span>${p.dose ? ` · dose ${p.dose.doseMl} ml` : ''}</small></span></span></td><td><span class="tag ${s === 'ok' ? 'verde' : s === 'baixo' ? 'ambar' : 'verm'}">${qtdTxt(p)}</span></td><td class="so-pc">${qtdTxt(p, p.min)}</td><td class="so-pc">${din(p.custo)}</td><td>${din(p.preco)}${p.un === 'kg' ? '/kg' : ''}${p.dose ? `<small class="cod">dose ${din(p.dose.preco)}</small>` : ''}${p.hh ? `<small class="cod hh-txt">${t(hhTxt(p))}</small>` : ''}</td><td class="so-pc">${margem(p.preco, p.custo).toLocaleString('pt-BR')}%</td><td class="so-pc"><span class="tag ${duraTxt(p) === 'parado' ? 'cinza' : duraDias(p) < 7 ? 'ambar' : 'verde'}">${duraTxt(p)}</span></td><td class="so-pc">${lv ? `<span class="tag ${dias(hoje(), lv.val) <= 7 ? 'ambar' : 'cinza'}">${dataBR(lv.val)}</span>` : '<span class="mudo">—</span>'}</td></tr>`; }).join('') || '<tr><td colspan="8" class="vazio">Nenhum produto encontrado.</td></tr>'}
  </tbody></table></section>`;
};
function formProduto(base = {}) {
  const p = base.id ? base : { nome: '', cat: '', un: 'un', custo: 0, preco: 0, q: 0, min: 0, forn: '', cod: '', ...base };
  const ed = !!p.id;
  abrir(`${cab(ed ? t(p.nome) : 'Novo produto', ed ? `Estoque: ${qtdTxt(p)}` : '')}<form class="form duas" id="f-prod">
    <label class="toda">Nome do produto<input name="nome" value="${t(p.nome)}" required placeholder="Cerveja lata 350 ml"></label>
    <div class="cod-cel"><label>Código de barras<span class="com-bt"><input name="cod" value="${t(p.cod)}" inputmode="numeric" placeholder="Passe no leitor"><button type="button" class="icone-bt" data-cam aria-label="Ler pela câmera">${ico('cam')}</button></span></label><div class="barras-ficha" id="barras-ficha" aria-live="polite"></div></div>
    <label>Categoria<input name="cat" value="${t(p.cat)}" list="dl-cat" placeholder="Mercearia"></label>
    <label>Vendido por<select name="un"><option value="un"${p.un === 'un' ? ' selected' : ''}>Unidade</option><option value="kg"${p.un === 'kg' ? ' selected' : ''}>Quilo (balança)</option><option value="cx"${p.un === 'cx' ? ' selected' : ''}>Caixa</option></select></label>
    <label>Fornecedor<select name="forn"><option value="">—</option>${db.fornecedores.map((f) => `<option value="${f.id}"${p.forn === f.id ? ' selected' : ''}>${t(f.nome)}</option>`).join('')}</select></label>
    <label>Custo (R$)<input name="custo" value="${campoDin(p.custo)}" inputmode="decimal" placeholder="0,00"></label>
    <label>Preço de venda (R$)<input name="preco" value="${campoDin(p.preco)}" inputmode="decimal" required placeholder="0,00"></label>
    <p class="toda off" id="off" hidden></p>
    <p class="toda margem" id="mg"></p>
    ${ed ? '' : '<label>Estoque agora<input name="q" inputmode="decimal" value="0"></label>'}
    <label>Estoque mínimo<input name="min" inputmode="decimal" value="${numBR(p.min)}"></label>
    <label>Código na balança (PLU)<input name="plu" inputmode="numeric" value="${t(p.plu || '')}" placeholder="só para produto de balança"></label>
    ${ed ? `<p class="toda giro">Vende ${numBR(mediaDia(p), 1)} ${p.un === 'kg' ? 'kg' : 'un'} por dia · o estoque dura ${duraTxt(p)}${ultimaVenda(p) ? ` · última venda em ${dataBR(ultimaVenda(p))}` : ' · sem venda registrada'}</p>` : ''}
    <footer class="j-pe toda">${ed ? `<button type="button" class="bt perigo" data-arq>Tirar de linha</button><button type="button" class="bt" data-hist>Histórico</button><button type="button" class="bt" data-ajuste>Corrigir estoque</button>` : ''}<button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Salvar</button></footer>
  </form><datalist id="dl-cat">${cats().map((c) => `<option value="${t(c)}">`).join('')}</datalist>`, (j) => {
    const f = $('form', j);
    const conta = () => {
      const c = lerDin(f.custo.value), pr = lerDin(f.preco.value); $('#mg', j).innerHTML = pr ? `Margem de <b>${margem(pr, c).toLocaleString('pt-BR')}%</b> · lucro de ${din(pr - c)} por ${f.un.value === 'kg' ? 'kg' : f.un.value === 'cx' ? 'caixa' : 'unidade'}` : '';
    };
    f.addEventListener('input', conta); conta();
    const desenha = () => {
      const box = $('#barras-ficha', j), info = tipoBarras(f.cod.value), svg = barrasSVG(f.cod.value, { alt: 46 });
      const salvo = ed && info.c === p.cod;   // a etiqueta sai com o que está gravado
      box.innerHTML = svg ? `${svg}<span class="bf-txt${info.aviso ? ' aviso' : ''}"><b>${t(info.tipo)}</b>${info.aviso ? t(info.aviso) : info.tipo === 'Code 128' ? 'Código interno ou de outro formato. Sai igual na etiqueta.' : 'Dígito verificador confere.'}${salvo ? `<button type="button" class="bt mini" data-etq-uma>${ico('imp')}Imprimir etiqueta</button>` : ''}</span>`
        : `<span class="bf-txt${info.erro ? ' aviso' : ''}">${info.erro ? t(info.erro) : 'Sem código ainda. Passe no leitor, use a câmera ou digite. Se ficar em branco, ao salvar o Annona cria um código interno (começa com 2).'}</span>`;
    };
    f.cod.addEventListener('input', desenha); desenha();
    j.addEventListener('click', (e) => { if (e.target.closest('[data-etq-uma]')) escolherEtiquetas(p); });
    // código novo e sem nome: procura na base aberta de produtos (nome, marca, tamanho e foto)
    const busca = async () => {
      const cod = f.cod.value.trim(); if (!/^\d{8,14}$/.test(cod) || f.nome.value.trim() || ed) return;
      const st = $('#off', j); st.hidden = false; st.textContent = 'Procurando o produto pelo código…';
      try {
        const ctl = new AbortController(); setTimeout(() => ctl.abort(), 6000);
        const r2 = await fetch(`https://world.openfoodfacts.org/api/v2/product/${cod}.json?fields=product_name,product_name_pt,brands,quantity,image_front_small_url`, { signal: ctl.signal });
        const pr = (await r2.json()).product;
        if (!pr || !(pr.product_name_pt || pr.product_name)) { st.textContent = 'Não achei esse código na base aberta. Escreva o nome.'; return; }
        const nome = [pr.product_name_pt || pr.product_name, pr.brands ? pr.brands.split(',')[0] : '', pr.quantity || ''].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        if (!f.nome.value.trim()) f.nome.value = nome;
        if (pr.image_front_small_url) { p.foto = pr.image_front_small_url; st.innerHTML = `<img src="${t(pr.image_front_small_url)}" alt="" width="44" height="44"> Achei: <b>${t(nome)}</b>. Confira e ponha o preço.`; } else st.innerHTML = `Achei: <b>${t(nome)}</b>. Confira e ponha o preço.`;
      } catch (e2) { st.textContent = 'Sem conexão com a base de produtos agora. Escreva o nome.'; }
    };
    f.cod.addEventListener('change', busca); setTimeout(busca, 50);
    $('[data-cam]', j).addEventListener('click', () => { const salvo = Object.fromEntries(new FormData(f)); lerCamera((cod) => formProduto({ ...p, ...lerForm(salvo), cod })); });
    if (ed) { $('[data-arq]', j).addEventListener('click', () => confirmar('Tirar de linha', `${t(p.nome)} sai das listas e da venda. O histórico continua nos relatórios.`, 'Tirar de linha', () => { p.arq = true; grava(); mostra(); toast('Produto tirado de linha.'); }, true)); $('[data-hist]', j).addEventListener('click', () => historico(p)); $('[data-ajuste]', j).addEventListener('click', () => liberar('estoque', `corrigir o estoque de ${p.nome}`, () => ajusteEstoque(p))); }
    f.addEventListener('submit', (e) => {
      e.preventDefault(); const d = lerForm(Object.fromEntries(new FormData(f)));
      if (d.cod && db.produtos.some((x) => x.cod === d.cod && x.id !== p.id && !x.arq)) { toast('Já existe outro produto com esse código de barras.', true); return; }
      if (d.preco <= 0) { toast('Digite o preço de venda.', true); return; }
      if (ed && d.preco !== p.preco) registra(`Preço de ${p.nome}: ${din(p.preco)} → ${din(d.preco)}`, 'preco');
      if (ed && d.preco !== p.preco && !pode('entradas')) { liberar('entradas', `mudar o preço de ${p.nome}`, () => { Object.assign(p, d); if (!d.dose) delete p.dose; grava(); mostra(); toast('Produto salvo.'); }); return; }
      if (ed) Object.assign(p, d); else { const n = { id: uid('p'), ...d, cod: d.cod || ean13(`2${String(Date.now()).slice(-11)}`), lotes: [], criado: hoje(), ...(p.foto ? { foto: p.foto } : {}) }; db.produtos.push(n); }
      if (!d.dose) delete p.dose;
      if (!d.hh) delete p.hh;
      grava(); fechar(); mostra(); toast(ed ? 'Produto salvo.' : 'Produto cadastrado. Para ele ter estoque com validade, dê entrada pela nota.');
    });
  });
}
// histórico do produto: tudo o que entrou e saiu, do mais novo ao mais antigo, com o saldo depois de cada movimento
function historico(p) {
  const mv = [];
  db.entradas.forEach((e) => e.itens.filter((x) => x.p === p.id).forEach((x) => mv.push({ d: `${e.data}T08:00:00`, t: 'Entrada', q: x.q, ref: `${(forn(e.forn) || {}).nome || 'Fornecedor'}${e.nota ? ` · nota ${e.nota}` : ''}` })));
  db.vendas.forEach((v) => v.itens.filter((x) => x.p === p.id).forEach((x) => { mv.push({ d: v.data, t: 'Venda', q: -x.q, ref: `nº ${v.n} · ${nomeU(v.vend)}` }); if (v.cancelada) mv.push({ d: v.cancelada.data, t: 'Venda cancelada', q: x.q, ref: `nº ${v.n} · ${v.cancelada.motivo}` }); }));
  db.perdas.filter((x) => x.p === p.id).forEach((x) => mv.push({ d: x.data, t: `Perda (${x.motivo})`, q: -x.q, ref: x.obs || '' }));
  (db.ajustes || []).filter((x) => x.p === p.id).forEach((x) => mv.push({ d: x.data, t: `Ajuste (${x.motivo})`, q: x.q, ref: x.obs || '' }));
  mv.sort((a, b) => b.d.localeCompare(a.d));
  let saldo = p.q; mv.forEach((m) => { m.saldo = saldo; saldo = r3(saldo - m.q); });
  const ent = mv.filter((m) => m.q > 0 && m.t === 'Entrada').reduce((a, m) => a + m.q, 0), sai = mv.filter((m) => m.t === 'Venda').reduce((a, m) => a - m.q, 0), per = mv.filter((m) => m.t.startsWith('Perda')).reduce((a, m) => a - m.q, 0);
  abrir(`${cab(`Histórico: ${t(p.nome)}`, `Agora: ${qtdTxt(p)} · entrou ${numBR(ent)} · vendeu ${numBR(sai)} · perdeu ${numBR(per)}`)}<div class="hist"><table class="tab"><thead><tr><th>Quando</th><th>O que foi</th><th>Qtd.</th><th>Ficou</th></tr></thead><tbody>${mv.slice(0, 120).map((m) => `<tr><td>${dataBR(m.d)} <small class="cod">${horaBR(m.d)}</small></td><td>${t(m.t)}<small class="cod">${t(m.ref)}</small></td><td class="${m.q < 0 ? 'verm-txt' : 'ok-txt'}">${m.q > 0 ? '+' : ''}${numBR(m.q)}</td><td>${numBR(m.saldo)}</td></tr>`).join('') || '<tr><td colspan="4" class="vazio">Nenhum movimento ainda.</td></tr>'}</tbody></table></div><footer class="j-pe"><button type="button" class="bt cheio" data-fechar>Ok</button></footer>`, null, true);
}
// etiquetas de gôndola em folha A4 (ou Carta) adesiva: medidas reais das folhas Pimaco, impressas em tamanho real (100%)
const ETIQ = {
  media: { nome: 'Média', det: '63,5 × 25,4 mm · 33 por folha A4 (Pimaco A4256)', folha: [210, 297], col: 3, lin: 11, w: 63.5, h: 25.4, mt: 8.8, ml: 7.25, gx: 2.5, gy: 0, bw: 40 },
  pequena: { nome: 'Pequena de gôndola', det: '38,2 × 21,2 mm · 65 por folha A4 (Pimaco A4251)', folha: [210, 297], col: 5, lin: 13, w: 38.2, h: 21.2, mt: 10.7, ml: 4.5, gx: 2.5, gy: 0, bw: 34 },
  carta: { nome: 'Carta', det: '66,7 × 25,4 mm · 30 por folha Carta (Pimaco 6180 e 6080)', folha: [215.9, 279.4], col: 3, lin: 10, w: 66.7, h: 25.4, mt: 12.7, ml: 4.76, gx: 3.175, gy: 0, bw: 40 },
};
const precoEtiq = (p) => `${din(p.preco)}${p.un === 'kg' ? '<small>/kg</small>' : ''}`;
const umaEtiqueta = (p) => `<div class="etq"><div class="etq-cab"><b>${t(p.nome)}</b><span>${precoEtiq(p)}</span></div><div class="etq-barras">${barrasSVG(p.cod, { alt: 34 })}</div></div>`;
// monta as folhas na própria página e chama a impressão; o resto da tela some só no papel
function imprimirEtiquetas(itens, tam = 'media', inicio = 1) {
  const m = ETIQ[tam] || ETIQ.media, porFolha = m.col * m.lin, lista = [];
  for (let i = 1; i < inicio; i++) lista.push(null);   // folha já usada: pula as etiquetas que faltam
  itens.forEach(({ p, q }) => { for (let i = 0; i < q; i++) lista.push(p); });
  const folhas = [];
  for (let i = 0; i < lista.length; i += porFolha) folhas.push(lista.slice(i, i + porFolha));
  let d = $('#folha-etiquetas'); if (d) d.remove();
  d = document.createElement('div'); d.id = 'folha-etiquetas'; d.className = `etq-${tam}`; d.setAttribute('aria-hidden', 'true');
  d.style.cssText = `--fw:${m.folha[0]}mm;--fh:${m.folha[1]}mm;--ew:${m.w}mm;--eh:${m.h}mm;--mt:${m.mt}mm;--ml:${m.ml}mm;--gx:${m.gx}mm;--gy:${m.gy}mm;--col:${m.col};--bw:${m.bw}mm`;
  d.innerHTML = `<style>@page { size: ${m.folha[0]}mm ${m.folha[1]}mm; margin: 0; }</style>${folhas.map((f) => `<section class="etq-folha">${f.map((p) => (p ? umaEtiqueta(p) : '<div class="etq vazia"></div>')).join('')}</section>`).join('')}`;
  document.body.append(d); document.body.classList.add('imprime-etq');
  const limpa = () => { removeEventListener('afterprint', limpa); const x = $('#folha-etiquetas'); if (x) x.remove(); document.body.classList.remove('imprime-etq'); };
  addEventListener('afterprint', limpa);
  setTimeout(() => { try { window.print(); } catch (e) { toast('Não consegui abrir a impressão.', true); } }, 60);
  return folhas.length;
}
// escolher: todos, uma categoria ou só os marcados, com a quantidade de cada um
function escolherEtiquetas(pre = null) {
  const sel = new Map(ativos().map((p) => [p.id, { on: !pre, q: 1 }]));
  if (pre) sel.set(pre.id, { on: true, q: 1 });
  let tam = 'media', cat = pre ? '_marcados' : '';
  const comCod = (p) => !!tipoBarras(p.cod).tipo;
  const conta = () => { let n = 0; sel.forEach((v, id) => { if (v.on && comCod(prod(id))) n += v.q; }); return n; };
  abrir(`${cab('Imprimir etiquetas', 'Nome, preço e código de barras para a gôndola e para o produto')}<form class="form" id="f-etq">
    <fieldset class="etq-tams"><legend>Tamanho da etiqueta</legend>${Object.entries(ETIQ).map(([k, m]) => `<label class="etq-tam"><input type="radio" name="tam" value="${k}"${k === tam ? ' checked' : ''}><span><b>${m.nome}</b><small>${m.det}</small></span></label>`).join('')}</fieldset>
    <div class="duas"><label>Quais produtos<select name="cat"><option value="">Todos os produtos</option>${cats().map((c) => `<option value="${t(c)}">${t(c)}</option>`).join('')}<option value="_marcados"${pre ? ' selected' : ''}>Só os marcados</option></select></label><label>Começar na etiqueta nº<input name="ini" inputmode="numeric" value="1" aria-describedby="etq-ini-dica"></label></div>
    <p class="dica" id="etq-ini-dica">Folha já usada pela metade? Diga em qual etiqueta começar (contando da esquerda para a direita, de cima para baixo).</p>
    <div class="etq-marca"><button type="button" class="bt mini" data-todos="1">Marcar todos</button><button type="button" class="bt mini" data-todos="0">Desmarcar todos</button></div>
    <ul class="etq-lista" id="etq-lista"></ul>
    <footer class="j-pe"><b id="etq-soma"></b><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">${ico('imp')}Imprimir</button></footer>
  </form>`, (j) => {
    const f = $('form', j), ul = $('#etq-lista', j);
    const visiveis = () => ativos().filter((p) => (cat === '_marcados' ? sel.get(p.id).on : !cat || p.cat === cat)).sort((a, b) => a.cat.localeCompare(b.cat) || a.nome.localeCompare(b.nome));
    const soma = () => { const n = conta(), m = ETIQ[tam], ini = Math.max(1, Math.min(m.col * m.lin, Math.round(lerNum(f.ini.value)) || 1)), fl = Math.ceil((n + ini - 1) / (m.col * m.lin)); $('#etq-soma', j).textContent = n ? `${n} etiqueta${n === 1 ? '' : 's'} · ${fl} folha${fl === 1 ? '' : 's'}` : 'Nenhuma etiqueta marcada'; };
    const lista = () => {
      ul.innerHTML = visiveis().map((p) => { const s = sel.get(p.id), ok = comCod(p); return `<li class="${ok ? '' : 'sem-cod'}"><label class="check"><input type="checkbox" data-etq="${p.id}"${s.on && ok ? ' checked' : ''}${ok ? '' : ' disabled'}><span><b>${t(p.nome)}</b><small class="cod">${ok ? `${t(p.cat)} · ${din(p.preco)}${p.un === 'kg' ? '/kg' : ''}` : 'sem código para desenhar'}</small></span></label><input class="etq-q" data-etq-q="${p.id}" inputmode="numeric" value="${s.q}" aria-label="Quantas etiquetas de ${t(p.nome)}"${ok ? '' : ' disabled'}></li>`; }).join('') || '<li class="vazio">Nenhum produto aqui.</li>';
      soma();
    };
    $$('[name=tam]', j).forEach((r) => r.addEventListener('change', () => { tam = r.value; soma(); }));
    f.cat.addEventListener('change', () => { cat = f.cat.value; if (cat && cat !== '_marcados') sel.forEach((v, id) => { v.on = prod(id).cat === cat; }); else if (!cat) sel.forEach((v) => { v.on = true; }); lista(); });
    f.ini.addEventListener('input', soma);
    $$('[data-todos]', j).forEach((b) => b.addEventListener('click', () => { const on = b.dataset.todos === '1'; visiveis().forEach((p) => { sel.get(p.id).on = on; }); lista(); }));
    ul.addEventListener('change', (e) => { const c = e.target.closest('[data-etq]'); if (c) { sel.get(c.dataset.etq).on = c.checked; soma(); } });
    ul.addEventListener('input', (e) => { const c = e.target.closest('[data-etq-q]'); if (c) { const q = Math.max(0, Math.min(500, Math.round(lerNum(c.value)) || 0)); sel.get(c.dataset.etqQ).q = q; if (q > 0 && !sel.get(c.dataset.etqQ).on) { sel.get(c.dataset.etqQ).on = true; $(`[data-etq="${c.dataset.etqQ}"]`, ul).checked = true; } soma(); } });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const itens = ativos().filter((p) => sel.get(p.id).on && sel.get(p.id).q > 0 && comCod(p)).sort((a, b) => a.cat.localeCompare(b.cat) || a.nome.localeCompare(b.nome)).map((p) => ({ p, q: sel.get(p.id).q }));
      if (!itens.length) { toast('Marque pelo menos um produto.', true); return; }
      const m = ETIQ[tam], ini = Math.max(1, Math.min(m.col * m.lin, Math.round(lerNum(f.ini.value)) || 1));
      fechar(); const n = imprimirEtiquetas(itens, tam, ini);
      toast(`${n} folha${n === 1 ? '' : 's'} de etiquetas. Na impressão, deixe em tamanho real (100%), sem ajustar à página.`);
    });
    lista();
  }, true);
}
function lerForm(o) {
  const d = { plu: String(o.plu || '').replace(/\D/g, ''), nome: String(o.nome || '').trim(), cod: String(o.cod || '').trim(), cat: String(o.cat || '').trim() || 'Outros', un: o.un || 'un', forn: o.forn || '', custo: lerDin(o.custo), preco: lerDin(o.preco), min: lerNum(o.min) };
  if (o.q !== undefined) d.q = r3(lerNum(o.q));
  if (d.un === 'gf') d.dose = { ml: Math.max(1, Math.round(lerNum(o.ml) || 1000)), doseMl: Math.max(1, Math.round(lerNum(o.dml) || 50)), preco: lerDin(o.dpreco) };
  if ('adics' in o) {
    d.semEstoque = !!o.semEstoque; d.cozinha = !!o.cozinha;
    d.adics = String(o.adics || '').split('\n').map((l) => l.split('=')).filter((x) => x[0].trim()).map((x) => ({ n: x[0].trim(), v: lerDin(x[1] || '0') }));
    const hp = lerDin(o.hhp), dd = DIAS.map((x, k) => (o[`hhd${k}`] ? k : -1)).filter((k) => k >= 0);
    d.hh = hp > 0 && dd.length ? { preco: hp, dias: dd, de: o.hhde || '18:00', ate: o.hhate || '20:00' } : null;
  }
  return d;
}
// reajuste de preço de uma categoria (ou de tudo) por porcentagem, com arredondamento para ,49 / ,99
function reajuste() {
  abrir(`${cab('Reajustar preços', 'Aumento ou desconto por porcentagem')}<form class="form"><label>Categoria<select name="cat"><option value="">Todas</option>${cats().map((c) => `<option>${t(c)}</option>`).join('')}</select></label><label>Porcentagem (use − para baixar)<input name="pct" inputmode="decimal" value="5" required></label><label class="check"><input type="checkbox" name="arr" checked> Arredondar para ,49 ou ,99</label><p class="sep-tot" id="rj"></p><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Aplicar</button></footer></form>`, (j) => {
    const f = $('form', j), novoP = (v) => { let n = Math.round(v * (1 + lerNum(f.pct.value) / 100)); if (f.arr.checked && n > 100) { const c = n % 100; n = n - c + (c <= 49 ? 49 : 99); } return Math.max(1, n); };
    const alvo = () => comEstoque().filter((p) => !f.cat.value || p.cat === f.cat.value);
    const mostraR = () => { const l = alvo(), ex = l[0]; $('#rj', j).innerHTML = `${l.length} produto${l.length === 1 ? '' : 's'}${ex ? ` · ex.: ${t(ex.nome)} de ${din(ex.preco)} para <b>${din(novoP(ex.preco))}</b>` : ''}`; };
    f.addEventListener('input', mostraR); mostraR();
    f.addEventListener('submit', (e) => { e.preventDefault(); liberar('entradas', 'reajustar preços', () => { const l = alvo(); l.forEach((p) => { p.preco = novoP(p.preco); }); registra(`Reajuste de ${lerNum(f.pct.value).toLocaleString('pt-BR')}% em ${f.cat.value || 'todas as categorias'} (${l.length} produtos)`, 'preco'); grava(); fechar(); mostra(); toast(`${l.length} preços reajustados.`); }); });
  });
}
function ajusteEstoque(p) {
  abrir(`${cab(`Corrigir o estoque de ${t(p.nome)}`, `O sistema diz ${qtdTxt(p)}`)}<form class="form"><label>Quanto tem de verdade agora (${p.un === 'kg' ? 'kg' : p.dose ? 'garrafas; meia garrafa = 0,5' : 'unidades'})<input name="q" inputmode="decimal" required value="${numBR(p.q)}"></label><label>Por quê?<select name="m">${MOTIVOS.map((m) => `<option>${m}</option>`).join('')}</select></label><p class="dica">Se faltar, a diferença entra em Perdas com o motivo. Se sobrar, fica registrada como ajuste.</p><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Corrigir</button></footer></form>`, (j) => {
    $('form', j).addEventListener('submit', (e) => { e.preventDefault(); const q = r3(lerNum(e.target.q.value)), dif = r3(q - p.q); if (!dif) { fechar(); return; } registraAjuste(p, dif, e.target.m.value); grava(); fechar(); mostra(); toast('Estoque corrigido.'); });
  });
}
function registraAjuste(p, dif, motivo, obs = '') {
  registra(`${dif < 0 ? 'Perda' : 'Sobra'}: ${p.dose || p.un === 'kg' ? numBR(Math.abs(dif)) : numBR(Math.abs(dif), 0)} ${p.nome} (${motivo})`, dif < 0 ? 'perda' : 'ajuste');
  if (dif < 0) { db.perdas.push({ id: uid('x'), data: agora(), p: p.id, q: -dif, motivo, custo: Math.round(-dif * p.custo), obs }); baixar(p, -dif); }
  else { db.ajustes.push({ id: uid('a'), data: agora(), p: p.id, q: dif, motivo, obs }); devolver(p, dif); }
}

// ------------------------------------------------------------------ entradas de mercadoria (manual ou pelo XML da nota)
TELAS.entradas = (sub) => {
  if (sub === 'nova') { setTimeout(() => formEntrada(), 0); location.replace('#entradas'); }
  const l = [...db.entradas].sort((a, b) => b.data.localeCompare(a.data));
  return `<section class="cab-tela"><div><h2>Entradas de mercadoria</h2><p>Cada entrada soma no estoque, atualiza o custo e guarda o lote com a validade.</p></div><div class="acoes"><label class="bt">${ico('xml')}Ler o XML da nota<input type="file" accept=".xml,text/xml,application/xml" id="xml" hidden></label><button type="button" class="bt cheio" data-acao="nova-entrada">${ico('mais')}Dar entrada</button></div></section>
  <p class="dica larga">O XML da nota o fornecedor manda por e-mail junto com o boleto. O Annona lê os produtos, as quantidades, o custo, o lote e a validade; você só confere.</p>
  <section class="bloco sem-pad"><table class="tab grande"><thead><tr><th>Data</th><th>Fornecedor</th><th class="so-pc">Nota</th><th>Itens</th><th>Total</th></tr></thead><tbody>
  ${l.map((e) => `<tr class="clica" data-entrada="${e.id}"><td>${dataBR(e.data)}</td><td>${t((forn(e.forn) || {}).nome || e.fornNome || '—')}</td><td class="so-pc">${t(e.nota || '—')}</td><td>${e.itens.length}</td><td>${din(e.total)}</td></tr>`).join('') || '<tr><td colspan="5" class="vazio">Nenhuma entrada ainda.</td></tr>'}</tbody></table></section>`;
};
function formEntrada(pre = null) {
  const linhas = pre ? pre.itens : [{ nome: '', q: '', custo: '', lote: '', val: '' }];
  abrir(`${cab(pre ? 'Conferir a nota' : 'Dar entrada', pre ? `${t(pre.fornNome || '')} · nota ${t(pre.nota || '')}` : 'Mercadoria que chegou')}<form class="form" id="f-ent">
    <div class="duas"><label>Fornecedor<input name="forn" list="dl-forn" value="${t(pre ? pre.fornNome : '')}" placeholder="Nome do fornecedor"></label><label>Número da nota<input name="nota" value="${t(pre ? pre.nota : '')}" placeholder="Opcional"></label></div>
    <div class="ent-linhas" id="ent-linhas"></div>
    <button type="button" class="bt" data-mais-linha>${ico('mais')}Mais um produto</button>
    <p class="ent-total" id="ent-total"></p>
    <footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio ouro">Dar entrada no estoque</button></footer>
  </form>${listaProdutos()}<datalist id="dl-forn">${db.fornecedores.map((f) => `<option value="${t(f.nome)}">`).join('')}</datalist>`, (j) => {
    const box = $('#ent-linhas', j);
    const linha = (x) => { const d = document.createElement('div'); d.className = 'ent-linha'; d.innerHTML = `<label class="ent-nome">Produto${x.cEAN ? `<small>${t(x.cEAN)}</small>` : ''}<input name="p" list="dl-prod" value="${t(x.nome)}" required placeholder="Nome ou código"></label>${x.fator !== undefined ? `<label>Vem em<input name="fator" inputmode="numeric" value="${x.fator}" title="Unidades por embalagem"><small>${t(x.uCom || '')} c/ unid.</small></label>` : ''}<label>Qtd.<input name="q" inputmode="decimal" value="${x.q === '' ? '' : numBR(x.q)}" required></label><label>Custo un.<input name="custo" inputmode="decimal" value="${x.custo === '' ? '' : campoDin(x.custo)}"></label><label>Lote<input name="lote" value="${t(x.lote || '')}"></label><label>Validade<input name="val" type="date" value="${t(x.val || '')}"></label>${x.novo ? `<label>Preço de venda<input name="preco" inputmode="decimal" placeholder="novo produto"></label>` : ''}<button type="button" class="icone-bt" data-tira-l aria-label="Tirar linha">${ico('lixo')}</button>`; $('[data-tira-l]', d).addEventListener('click', () => { d.remove(); soma(); }); box.append(d); };
    const soma = () => { let tot = 0; $$('.ent-linha', box).forEach((d) => { const fa = d.querySelector('[name=fator]'); tot += Math.round(lerNum($('[name=q]', d).value) * lerDin($('[name=custo]', d).value) * (fa ? 1 : 1)); }); $('#ent-total', j).innerHTML = `Total da entrada: <b>${din(tot)}</b>`; };
    linhas.forEach(linha); soma(); box.addEventListener('input', soma);
    $('[data-mais-linha]', j).addEventListener('click', () => { linha({ nome: '', q: '', custo: '', lote: '', val: '' }); $$('[name=p]', box).at(-1).focus(); });
    $('form', j).addEventListener('submit', (e) => {
      e.preventDefault(); const f = e.target, nomeF = f.forn.value.trim();
      let fo = db.fornecedores.find((x) => sa(x.nome) === sa(nomeF)); if (!fo && nomeF) { fo = { id: uid('f'), nome: nomeF, tel: '', cnpj: pre ? pre.cnpj : '' }; db.fornecedores.push(fo); }
      const itens = []; let erro = '';
      $$('.ent-linha', box).forEach((d) => {
        const nome = $('[name=p]', d).value.trim(); let p = acharProd(nome); const fa = Math.max(1, lerNum(($('[name=fator]', d) || {}).value) || 1);
        const q = r3(lerNum($('[name=q]', d).value) * fa), custo = Math.round(lerDin($('[name=custo]', d).value) / fa), pv = $('[name=preco]', d);
        if (!nome || q <= 0) { erro = 'Confira produto e quantidade em todas as linhas.'; return; }
        if (!p) { const preco = pv ? lerDin(pv.value) : 0; p = { id: uid('p'), nome, cat: 'Outros', un: 'un', custo, preco: preco || Math.round(custo * 1.4), q: 0, min: 0, forn: fo ? fo.id : '', cod: (d.querySelector('small') || {}).textContent && eanValido(d.querySelector('small').textContent) ? d.querySelector('small').textContent : ean13(`2${String(Date.now() + itens.length).slice(-11)}`), lotes: [], criado: hoje() }; db.produtos.push(p); }
        itens.push({ p: p.id, q, custo, lote: $('[name=lote]', d).value.trim(), val: $('[name=val]', d).value });
      });
      if (erro || !itens.length) { toast(erro || 'Coloque pelo menos um produto.', true); return; }
      itens.forEach((x) => { const p = prod(x.p); const tot = Math.max(0, p.q) + x.q; if (x.custo > 0) p.custo = Math.round((Math.max(0, p.q) * p.custo + x.q * x.custo) / (tot || 1)); p.q = r3(p.q + x.q); if (x.val || x.lote) (p.lotes ||= []).push({ id: uid('l'), lote: x.lote, val: x.val, q: x.q, ent: hoje() }); if (fo && !p.forn) p.forn = fo.id; });
      db.entradas.push({ id: uid('e'), data: hoje(), forn: fo ? fo.id : '', nota: f.nota.value.trim(), itens, total: itens.reduce((s, x) => s + Math.round(x.q * x.custo), 0) });
      registra(`Entrada${f.nota.value.trim() ? ` da nota ${f.nota.value.trim()}` : ''}${fo ? ` (${fo.nome})` : ''}: ${din(db.entradas.at(-1).total)}`, 'entrada');
      grava(); fechar(); mostra(); toast(`Entrada feita: ${itens.length} produto${itens.length === 1 ? '' : 's'} no estoque.`);
    });
  }, true);
}
// XML da NF-e: produtos, quantidade, custo, código de barras, lote e validade (grupo rastro)
function lerXML(txt) {
  const x = new DOMParser().parseFromString(txt, 'text/xml'), g = (el, n) => { const e = el.getElementsByTagName(n)[0]; return e ? e.textContent.trim() : ''; };
  if (x.getElementsByTagName('parsererror').length || !x.getElementsByTagName('det').length) throw new Error('xml');
  const emit = x.getElementsByTagName('emit')[0];
  const itens = [...x.getElementsByTagName('det')].map((d) => {
    const pr = d.getElementsByTagName('prod')[0], cEAN = /^\d{8,14}$/.test(g(pr, 'cEAN')) ? g(pr, 'cEAN') : '', xProd = g(pr, 'xProd'), uCom = g(pr, 'uCom'), q = Number(g(pr, 'qCom')) || 0, vUn = Number(g(pr, 'vUnCom')) || 0;
    const ex = cEAN && ativos().find((p) => p.cod === cEAN), ras = d.getElementsByTagName('rastro')[0];
    const caixa = /^(CX|FD|PCT|PC|DZ|EMB|SC|FARDO|CAIXA|PACOTE)$/i.test(uCom), m = xProd.match(/(?:C\/|X)\s*(\d{1,3})\b/i), fator = caixa && m ? Number(m[1]) : 1;
    return { nome: ex ? ex.nome : xProd, cEAN, uCom, q, custo: Math.round(vUn * 100), fator: caixa ? fator : undefined, lote: ras ? g(ras, 'nLote') : '', val: ras ? g(ras, 'dVal').slice(0, 10) : '', novo: !ex };
  });
  return { fornNome: emit ? g(emit, 'xFant') || g(emit, 'xNome') : '', cnpj: emit ? g(emit, 'CNPJ') : '', nota: g(x, 'nNF'), itens };
}

// ------------------------------------------------------------------ validades
TELAS.validades = () => {
  const l = lotesAtivos(), h = hoje();
  const grupo = (tit, ls, cls) => (ls.length ? `<section class="bloco sem-pad"><header class="pad"><h3>${tit}</h3><span class="selo">${ls.length}</span></header><table class="tab grande"><thead><tr><th>Produto</th><th>Lote</th><th>Validade</th><th>Quantidade</th><th class="so-pc">Custo parado</th><th></th></tr></thead><tbody>${ls.map((x) => { const d = dias(h, x.val); return `<tr><td><span class="com-foto">${foto(x.p, 'mini')}<b>${t(x.p.nome)}</b></span></td><td>${t(x.lote || '—')}</td><td><span class="tag ${cls}">${dataBR(x.val)}</span><small class="cod">${d < 0 ? `venceu há ${-d} dia${d === -1 ? '' : 's'}` : d === 0 ? 'vence hoje' : `faltam ${d} dia${d === 1 ? '' : 's'}`}</small></td><td>${qtdTxt(x.p, x.q)}</td><td class="so-pc">${din(Math.round(x.q * x.p.custo))}</td><td class="acoes-l">${d < 0 ? `<button type="button" class="bt mini perigo" data-perda-lote="${x.p.id}:${x.id}">Jogar fora</button>` : `<button type="button" class="bt mini" data-oferta="${x.p.id}">Fazer oferta</button>`}</td></tr>`; }).join('')}</tbody></table></section>` : '');
  const venc = l.filter((x) => dias(h, x.val) < 0), sete = l.filter((x) => dias(h, x.val) >= 0 && dias(h, x.val) <= 7), trinta = l.filter((x) => dias(h, x.val) > 7 && dias(h, x.val) <= 30);
  const parado = [...venc, ...sete].reduce((s, x) => s + Math.round(x.q * x.p.custo), 0);
  return `<section class="cab-tela"><div><h2>Validades</h2><p>${parado ? `${din(parado)} em mercadoria vencida ou vencendo em 7 dias. Venda antes com oferta.` : 'Nada vencendo nos próximos 7 dias.'}</p></div></section>
  ${grupo('Já venceu', venc, 'verm')}${grupo('Vence em até 7 dias', sete, 'ambar')}${grupo('Vence em até 30 dias', trinta, 'cinza')}${l.length ? '' : '<p class="vazio grande">Nenhum lote com validade. Dê entrada pela nota com lote e validade.</p>'}`;
};

// ------------------------------------------------------------------ fiado
TELAS.fiado = (id) => {
  const c = id && cli(id);
  if (c) return telaCliente(c);
  const l = db.clientes.map((x) => ({ c: x, s: situCli(x) })).sort((a, b) => b.s.k.atraso - a.s.k.atraso || b.s.k.saldo - a.s.k.saldo);
  const atras = l.filter((x) => x.s.k.atraso > 0);
  return `<section class="cab-tela"><div><h2>Fiado</h2><p>${din(totalFiado())} a receber de ${devedores().length} cliente${devedores().length === 1 ? '' : 's'}. Prazo de ${db.loja.prazo} dias; com mais de 15 dias de atraso o fiado trava sozinho.</p></div><div class="acoes"><button type="button" class="bt" data-acao="caderno-todo">Passar o caderno inteiro</button><button type="button" class="bt cheio" data-acao="novo-cliente">${ico('mais')}Novo cliente</button></div></section>
  ${atras.length ? `<p class="faixa-alerta">${ico('alerta')} ${atras.length} cliente${atras.length === 1 ? '' : 's'} em atraso, somando ${din(atras.reduce((s, x) => s + x.s.k.saldo, 0))}.</p>` : ''}
  <section class="clientes">${l.map(({ c: x, s }) => `<a class="cli" href="#fiado/${x.id}"><span class="av">${t(x.nome.slice(0, 1))}</span><span class="cli-n"><b>${t(x.nome)}</b><small class="st ${s.s}">${s.txt}</small></span><span class="cli-v"><b>${din(s.k.saldo)}</b><small>limite ${din(x.limite)}</small><span class="medidor"><i style="width:${Math.min(100, Math.round((s.k.saldo / (x.limite || 1)) * 100))}%"></i></span></span></a>`).join('') || '<p class="vazio grande">Nenhum cliente no fiado.</p>'}</section>`;
};
function telaCliente(c) {
  const s = situCli(c), k = s.k, ls = [...k.ls].reverse();
  return `<section class="cab-tela"><div><a class="voltar" href="#fiado">← Todos do fiado</a><h2>${t(c.nome)}</h2><p><span class="st ${s.s}">${s.txt}</span> · cliente desde ${dataBR(c.desde)}${c.tel ? ` · ${t(c.tel)}` : ''}</p></div><div class="acoes"><button type="button" class="bt" data-acao="editar-cliente" data-id="${c.id}">${ico('lapis')}Editar</button>${c.tel && k.saldo ? `<a class="bt" target="_blank" rel="noopener" href="${zap(c.tel, msgCobranca(c))}">${ico('zap')}Cobrar no WhatsApp</a>` : ''}<button type="button" class="bt cheio verde" data-acao="receber" data-id="${c.id}" ${k.saldo ? '' : 'disabled'}>Receber</button></div></section>
  <section class="cartoes tres"><div class="cartao"><div><small>Deve</small><b>${din(k.saldo)}</b></div></div><div class="cartao"><div><small>Limite</small><b>${din(c.limite)}</b><span class="var">pode pendurar mais ${din(Math.max(0, c.limite - k.saldo))}</span></div></div><div class="cartao"><div><small>Compra mais antiga em aberto</small><b>${k.antiga ? dataBR(k.antiga.data) : '—'}</b>${k.atraso ? `<span class="var desce">${k.atraso} dias de atraso</span>` : ''}</div></div></section>
  ${s.s === 'bloq' ? `<p class="faixa-alerta">${ico('alerta')} Fiado travado: ${s.txt}. <button type="button" class="link" data-acao="liberar" data-id="${c.id}">${c.bloq ? 'Desbloquear' : 'Liberar mesmo assim'}</button></p>` : `<p class="dica larga"><button type="button" class="link" data-acao="bloquear" data-id="${c.id}">Bloquear o fiado deste cliente</button></p>`}
  <section class="bloco sem-pad"><table class="tab grande"><thead><tr><th>Data</th><th>O que foi</th><th>Valor</th></tr></thead><tbody>${ls.map((f) => { const v = f.venda && db.vendas.find((x) => x.id === f.venda); return `<tr><td>${dataBR(f.data)} <small class="cod">${horaBR(f.data)}</small></td><td>${f.tipo === 'pag' ? `Pagou${f.obs ? ` (${t(f.obs)})` : ''}` : `Comprou${v ? `: ${t(v.itens.map((x) => x.nome).slice(0, 3).join(', '))}${v.itens.length > 3 ? '…' : ''}` : f.obs ? ` (${t(f.obs)})` : ''}`}</td><td class="${f.tipo === 'pag' ? 'ok-txt' : ''}">${f.tipo === 'pag' ? '− ' : ''}${din(f.v)}</td></tr>`; }).join('') || '<tr><td colspan="3" class="vazio">Sem lançamentos.</td></tr>'}</tbody></table></section>
  <p class="dica larga"><button type="button" class="link" data-acao="caderno" data-id="${c.id}">Passar do caderno: lançar uma dívida antiga</button></p>`;
}
// o caderno inteiro de uma vez: uma linha por cliente (nome, WhatsApp, limite, quanto deve e desde quando); Enter cria a próxima linha
function cadernoTodo() {
  const linha = () => `<div class="cad-linha"><input name="n" placeholder="Nome" aria-label="Nome"><input name="t" placeholder="WhatsApp" inputmode="tel" aria-label="WhatsApp"><input name="l" placeholder="Limite" inputmode="decimal" value="${campoDin(db.loja.limite)}" aria-label="Limite"><input name="v" placeholder="Deve R$" inputmode="decimal" aria-label="Quanto deve"><input name="d" type="date" value="${hoje()}" aria-label="Desde quando"></div>`;
  abrir(`${cab('Passar o caderno inteiro', 'Uma linha por cliente. Enter cria a próxima linha.')}<form class="form"><div class="cad-cab"><span>Nome</span><span>WhatsApp</span><span>Limite</span><span>Deve</span><span>Desde</span></div><div id="cad">${linha()}${linha()}${linha()}</div><button type="button" class="bt" data-mais-cad>${ico('mais')}Mais uma linha</button><p class="dica">Quem já está no fiado com o mesmo nome recebe só a dívida, sem duplicar o cadastro.</p><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Lançar tudo</button></footer></form>`, (j) => {
    const box = $('#cad', j), mais = () => { box.insertAdjacentHTML('beforeend', linha()); $('.cad-linha:last-child [name=n]', box).focus(); };
    $('[data-mais-cad]', j).addEventListener('click', mais);
    box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); const l = e.target.closest('.cad-linha'); if (l === box.lastElementChild) mais(); else $('[name=n]', l.nextElementSibling).focus(); } });
    $('form', j).addEventListener('submit', (e) => {
      e.preventDefault(); let n = 0, tot = 0;
      $$('.cad-linha', box).forEach((l) => {
        const nome = $('[name=n]', l).value.trim(); if (!nome) return;
        let c = db.clientes.find((x) => sa(x.nome) === sa(nome));
        if (!c) { c = { id: uid('c'), nome, tel: $('[name=t]', l).value.trim(), limite: lerDin($('[name=l]', l).value) || db.loja.limite, bloq: false, desde: hoje() }; db.clientes.push(c); }
        const v = lerDin($('[name=v]', l).value); if (v > 0) { db.fiado.push({ id: uid('f'), cli: c.id, data: `${$('[name=d]', l).value || hoje()}T12:00:00`, tipo: 'compra', v, obs: 'Do caderno' }); tot += v; }
        n++;
      });
      if (!n) { toast('Escreva pelo menos um nome.', true); return; }
      registra(`Caderno passado para o sistema: ${n} cliente${n === 1 ? '' : 's'}, ${din(tot)} em fiado`, 'fiado'); grava(); fechar(); mostra(); toast(`${n} cliente${n === 1 ? '' : 's'} lançado${n === 1 ? '' : 's'}, ${din(tot)} em fiado.`);
    });
  }, true);
}
function formCliente(base = {}) {
  const c = base.id ? base : { nome: base.nome || '', tel: '', limite: db.loja.limite };
  abrir(`${cab(c.id ? 'Editar cliente' : 'Novo cliente do fiado')}<form class="form"><label>Nome<input name="nome" value="${t(c.nome)}" required></label><label>WhatsApp<input name="tel" value="${t(c.tel)}" inputmode="tel" placeholder="16 99999-9999"></label><label>Limite do fiado (R$)<input name="lim" value="${campoDin(c.limite)}" inputmode="decimal"></label><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Salvar</button></footer></form>`, (j) => {
    $('form', j).addEventListener('submit', (e) => { e.preventDefault(); const f = e.target, d = { nome: f.nome.value.trim(), tel: f.tel.value.trim(), limite: lerDin(f.lim.value) }; if (!c.id && db.clientes.some((x) => sa(x.nome) === sa(d.nome))) { toast('Já existe um cliente com esse nome.', true); return; } if (c.id) Object.assign(c, d); else db.clientes.push({ id: uid('c'), ...d, bloq: false, desde: hoje() }); grava(); fechar(); mostra(); toast('Cliente salvo.'); });
  });
}
function receber(c, depois = null) {
  const k = contaFiado(c.id);
  abrir(`${cab(`Receber de ${t(c.nome)}`, `Deve ${din(k.saldo)}`)}<form class="form"><label>Valor recebido (R$)<input name="v" value="${campoDin(k.saldo)}" inputmode="decimal" required></label><label>Forma<select name="f"><option value="dinheiro">Dinheiro</option><option value="pix">Pix</option><option value="debito">Débito</option><option value="credito">Crédito</option></select></label><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio verde">Receber</button></footer></form>`, (j) => {
    $('form', j).addEventListener('submit', (e) => {
      e.preventDefault(); const v = Math.min(lerDin(e.target.v.value), k.saldo), fm = e.target.f.value; if (v <= 0) { toast('Digite o valor.', true); return; }
      db.fiado.push({ id: uid('f'), cli: c.id, data: agora(), tipo: 'pag', v, obs: FORMAS[fm], forma: fm, cx: TERM() }); registra(`${c.nome} pagou ${din(v)} do fiado (${FORMAS[fm]})`, 'fiado'); grava(); fechar(); mostra();
      const resta = contaFiado(c.id).saldo, msg = `Oi, ${c.nome.split(' ')[0]}! Recebemos ${din(v)} aqui no ${db.loja.nome}. ${resta ? `Ficou em aberto ${din(resta)}.` : 'Sua conta está quitada. Obrigado!'}`;
      const s2 = situCli(c), livre = Math.max(0, c.limite - s2.k.saldo);
      abrir(`${cab('Recebido', din(v))}<p class="j-txt">${resta ? `Ainda deve ${din(resta)}.` : 'Conta quitada.'} ${s2.s === 'bloq' ? `Continua travado: ${s2.txt}.` : `Pode pendurar até ${din(livre)} agora.`}</p><footer class="j-pe">${c.tel ? `<a class="bt" target="_blank" rel="noopener" href="${zap(c.tel, msg)}">${ico('zap')}Mandar o recibo no WhatsApp</a>` : ''}<button type="button" class="bt cheio" data-fechar>${depois ? 'Voltar para a venda' : 'Ok'}</button></footer>`);
      if (depois) aoFechar = depois;
    });
  });
}

// ------------------------------------------------------------------ compras (lista automática do que está abaixo do mínimo)
TELAS.compras = () => {
  const l = baixos(), por = {};
  l.forEach((p) => { const k = p.forn || '_'; (por[k] ||= []).push(p); });
  const sug = (p) => { const alvoQ = Math.max(p.min * 2, mediaDia(p) * 15); return p.un === 'kg' ? r3(Math.max(alvoQ - p.q, p.min)) : Math.max(1, Math.ceil(alvoQ - p.q)); };
  return `<section class="cab-tela"><div><h2>Lista de compras</h2><p>O que está no mínimo ou acaba em menos de 7 dias, separado por fornecedor. A quantidade sugerida cobre 15 dias de venda (ou o dobro do mínimo); mude se quiser.</p></div></section>
  ${Object.entries(por).map(([fid, ps]) => { const f = forn(fid); const tot = ps.reduce((s, p) => s + Math.round(sug(p) * p.custo), 0); return `<section class="bloco sem-pad"><header class="pad"><h3>${t(f ? f.nome : 'Sem fornecedor')}</h3>${f && f.prazo ? `<span class="selo">${t(f.prazo)}</span>` : ''}</header><table class="tab grande" data-forn="${fid}"><thead><tr><th>Produto</th><th>Tem</th><th>Mínimo</th><th class="so-pc">Vende por dia</th><th>Pedir</th><th class="so-pc">Custo estimado</th></tr></thead><tbody>${ps.map((p) => `<tr><td><span class="com-foto">${foto(p, 'mini')}<b>${t(p.nome)}</b></span></td><td><span class="tag ${p.q <= 0 ? 'verm' : 'ambar'}">${qtdTxt(p)}</span></td><td>${qtdTxt(p, p.min)}</td><td class="so-pc">${numBR(mediaDia(p), 1)}<small class="cod">dura ${duraTxt(p)}</small></td><td><input class="mini-in" data-ped="${p.id}" inputmode="decimal" value="${numBR(sug(p))}" aria-label="Quantidade a pedir de ${t(p.nome)}"></td><td class="so-pc">${din(Math.round(sug(p) * p.custo))}</td></tr>`).join('')}</tbody></table><footer class="pad acoes-l"><span class="mudo">Estimado: ${din(tot)}</span>${f && f.tel ? `<button type="button" class="bt" data-pedir="${fid}">${ico('zap')}Mandar pedido no WhatsApp</button>` : '<span class="mudo">Cadastre o WhatsApp do fornecedor para mandar o pedido.</span>'}</footer></section>`; }).join('') || '<p class="vazio grande">Tudo acima do mínimo. Nada para comprar agora.</p>'}
  <section class="bloco"><header><h3>Fornecedores</h3><button type="button" class="link" data-acao="novo-forn">+ Novo fornecedor</button></header><ul class="lista-simples">${db.fornecedores.map((f) => `<li><b>${t(f.nome)}</b><span>${t(f.tel || 'sem telefone')}${f.prazo ? ` · ${t(f.prazo)}` : ''}</span><button type="button" class="link" data-edforn="${f.id}">Editar</button></li>`).join('') || '<li class="vazio">Nenhum fornecedor.</li>'}</ul></section>`;
};
function formForn(f = {}) {
  abrir(`${cab(f.id ? 'Editar fornecedor' : 'Novo fornecedor')}<form class="form"><label>Nome<input name="nome" value="${t(f.nome || '')}" required></label><label>WhatsApp<input name="tel" value="${t(f.tel || '')}" inputmode="tel"></label><label>Dia de entrega ou combinado<input name="prazo" value="${t(f.prazo || '')}" placeholder="Entrega na terça"></label><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Salvar</button></footer></form>`, (j) => {
    $('form', j).addEventListener('submit', (e) => { e.preventDefault(); const d = { nome: e.target.nome.value.trim(), tel: e.target.tel.value.trim(), prazo: e.target.prazo.value.trim() }; if (f.id) Object.assign(f, d); else db.fornecedores.push({ id: uid('f'), ...d }); grava(); fechar(); mostra(); });
  });
}

// ------------------------------------------------------------------ perdas e quebras
TELAS.perdas = () => {
  const [de] = periodo('30'), l = db.perdas.filter((x) => x.data.slice(0, 10) >= de).sort((a, b) => b.data.localeCompare(a.data)), por = {};
  l.forEach((x) => { por[x.motivo] = (por[x.motivo] || 0) + x.custo; });
  return `<section class="cab-tela"><div><h2>Perdas e quebras</h2><p>Últimos 30 dias: <b>${din(l.reduce((s, x) => s + x.custo, 0))}</b> pelo custo. O que se perde sai do estoque e aparece no lucro.</p></div><button type="button" class="bt cheio" data-acao="nova-perda">${ico('mais')}Registrar perda</button></section>
  ${Object.keys(por).length ? `<div class="chips estaticos">${Object.entries(por).sort((a, b) => b[1] - a[1]).map(([m, v]) => `<span class="chip">${t(m)}: <b>${din(v)}</b></span>`).join('')}</div>` : ''}
  <section class="bloco sem-pad"><table class="tab grande"><thead><tr><th>Data</th><th>Produto</th><th>Qtd.</th><th>Motivo</th><th>Custo</th></tr></thead><tbody>${l.map((x) => { const p = prod(x.p); return `<tr><td>${dataBR(x.data)}</td><td>${t(p ? p.nome : '—')}${x.obs ? `<small class="cod">${t(x.obs)}</small>` : ''}</td><td>${p ? qtdTxt(p, x.q) : numBR(x.q)}</td><td>${t(x.motivo)}</td><td>${din(x.custo)}</td></tr>`; }).join('') || '<tr><td colspan="5" class="vazio">Nenhuma perda nos últimos 30 dias.</td></tr>'}</tbody></table></section>`;
};
function formPerda(pid = '', q = '') {
  const p0 = pid && prod(pid);
  abrir(`${cab('Registrar perda')}<form class="form"><label>Produto<input name="p" list="dl-prod" value="${t(p0 ? p0.nome : '')}" required></label><label>Quantidade (un, kg ou garrafa; dose derramada = 0,05)<input name="q" inputmode="decimal" value="${q === '' ? '1' : numBR(q)}" required></label><label>Motivo<select name="m">${MOTIVOS.filter((m) => m !== 'Ajuste de inventário').map((m) => `<option>${m}</option>`).join('')}</select></label><label>Observação<input name="obs" placeholder="Opcional"></label><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio perigo">Registrar</button></footer></form>${listaProdutos()}`, (j) => {
    $('form', j).addEventListener('submit', (e) => { e.preventDefault(); const f = e.target, p = acharProd(f.p.value), qq = r3(lerNum(f.q.value)); if (!p || qq <= 0) { toast('Escolha o produto e a quantidade.', true); return; } registraAjuste(p, -qq, f.m.value, f.obs.value.trim()); grava(); fechar(); mostra(); toast('Perda registrada e tirada do estoque.'); });
  });
}

// ------------------------------------------------------------------ inventário (contagem pelo celular)
TELAS.inventario = () => {
  const iv = estado.invent;
  if (!iv) {
    const ult = db.inventarios.at(-1);
    return `<section class="cab-tela"><div><h2>Inventário</h2><p>Conte o que tem na prateleira, passe o código ou digite. No fim, o Annona mostra a diferença e corrige o estoque.</p></div></section>
    <section class="bloco"><form class="form" id="f-inv"><label>O que contar<select name="cat"><option value="">Tudo</option>${cats().map((c) => `<option>${t(c)}</option>`).join('')}</select></label><button class="bt cheio">Começar a contagem</button></form>${ult ? `<p class="dica">Último inventário: ${dataBR(ult.data)}, ${ult.itens.length} produtos, diferença de ${din(ult.dif)} pelo custo.</p>` : ''}</section>${divergencias()}`;
  }
  const l = iv.itens.map((x) => ({ ...x, p: prod(x.p) })).filter((x) => x.p), feitos = l.filter((x) => x.c !== null).length;
  return `<section class="cab-tela"><div><h2>Contando: ${t(iv.cat || 'todo o estoque')}</h2><p>${feitos} de ${l.length} contados.</p></div><div class="acoes"><button type="button" class="bt" data-acao="inv-cancelar">Cancelar</button><button type="button" class="bt cheio" data-acao="inv-fim">Terminar e ver diferenças</button></div></section>
  <form class="leitor" id="f-inv-cod" autocomplete="off"><span>${ico('busca')}</span><input id="inv-cod" placeholder="Passe o código: cada leitura soma 1"><button type="button" class="icone-bt" data-acao="camera-inv" aria-label="Ler pela câmera">${ico('cam')}</button></form>
  <section class="bloco sem-pad"><table class="tab grande"><thead><tr><th>Produto</th><th>Contei</th><th class="so-pc">Sistema diz</th></tr></thead><tbody>${l.map((x) => `<tr${x.c !== null ? ' class="feito"' : ''}><td><b>${t(x.p.nome)}</b><small class="cod">${t(x.p.cod)}</small></td><td><input class="mini-in" data-conta="${x.p.id}" inputmode="decimal" value="${x.c === null ? '' : numBR(x.c)}" placeholder="—" aria-label="Contagem de ${t(x.p.nome)}"></td><td class="so-pc">${qtdTxt(x.p)}</td></tr>`).join('')}</tbody></table></section>`;
};
// diferenças dos inventários: o que sumiu sem explicação (achado só na contagem) separado das perdas registradas
function divergencias() {
  const de = somaDias(hoje(), -90), inv = db.inventarios.filter((x) => x.data >= de);
  const semExp = db.perdas.filter((x) => x.motivo === 'Ajuste de inventário' && x.data.slice(0, 10) >= de), reg = db.perdas.filter((x) => x.motivo !== 'Ajuste de inventário' && x.data.slice(0, 10) >= de);
  const sV = semExp.reduce((a, x) => a + x.custo, 0), rV = reg.reduce((a, x) => a + x.custo, 0), por = {};
  semExp.forEach((x) => { por[x.p] ||= { q: 0, v: 0, n: 0 }; por[x.p].q += x.q; por[x.p].v += x.custo; por[x.p].n++; });
  const top = Object.entries(por).map(([pid, x]) => ({ p: prod(pid), ...x })).filter((x) => x.p).sort((a, b) => b.v - a.v).slice(0, 10);
  if (!inv.length && !semExp.length) return '<p class="dica larga">Depois do primeiro inventário, aqui aparece o que sumiu sem explicação (estoque do sistema x prateleira), separado das perdas registradas.</p>';
  return `<section class="cartoes tres"><div class="cartao"><div><small>Sumiu sem explicação (90 dias)</small><b class="verm-txt">${din(sV)}</b><span class="var">achado só na contagem</span></div></div><div class="cartao"><div><small>Perdas registradas (90 dias)</small><b>${din(rV)}</b><span class="var">venceu, quebrou, consumo…</span></div></div><div class="cartao"><div><small>Inventários feitos</small><b>${inv.length}</b><span class="var">${inv.length ? `último em ${dataBR(inv.at(-1).data)}` : ''}</span></div></div></section>
  ${top.length ? `<section class="bloco sem-pad"><header class="pad"><h3>${ico('alerta')}Onde mais some</h3><span class="selo">diferença entre o sistema e a prateleira</span></header><table class="tab grande"><thead><tr><th>Produto</th><th>Faltou</th><th>Em dinheiro</th><th class="so-pc">Em quantos inventários</th></tr></thead><tbody>${top.map((x) => `<tr><td><span class="com-foto">${foto(x.p, 'mini')}<b>${t(x.p.nome)}</b></span></td><td>${qtdTxt(x.p, x.q)}</td><td class="verm-txt">${din(x.v)}</td><td class="so-pc">${x.n}</td></tr>`).join('')}</tbody></table></section>` : ''}
  ${inv.length ? `<section class="bloco sem-pad"><header class="pad"><h3>Inventários</h3></header><table class="tab grande"><thead><tr><th>Dia</th><th>O que contou</th><th>Produtos</th><th>Faltou</th><th>Sobrou</th><th class="so-pc">Quem contou</th></tr></thead><tbody>${[...inv].reverse().map((x) => `<tr><td>${dataBR(x.data)}</td><td>${t(x.cat || 'Tudo')}</td><td>${x.itens.length}</td><td class="verm-txt">${din(x.falta ?? Math.max(0, -x.dif))}</td><td class="ok-txt">${din(x.sobra ?? Math.max(0, x.dif))}</td><td class="so-pc">${t(x.quem || '')}</td></tr>`).join('')}</tbody></table></section>` : ''}`;
}
function fimInventario() {
  const iv = estado.invent, l = iv.itens.filter((x) => x.c !== null).map((x) => ({ ...x, p: prod(x.p) })).filter((x) => x.p).map((x) => ({ ...x, dif: r3(x.c - x.p.q) })).filter((x) => Math.abs(x.dif) > 0.0005);
  const val = l.reduce((s, x) => s + Math.round(x.dif * x.p.custo), 0);
  abrir(`${cab('Diferenças do inventário', `${l.length} produto${l.length === 1 ? '' : 's'} diferente${l.length === 1 ? '' : 's'} · ${val < 0 ? 'faltou' : 'sobrou'} ${din(Math.abs(val))} pelo custo`)}${l.length ? `<table class="tab"><thead><tr><th>Produto</th><th>Sistema</th><th>Contei</th><th>Diferença</th></tr></thead><tbody>${l.map((x) => `<tr><td>${t(x.p.nome)}</td><td>${qtdTxt(x.p)}</td><td>${qtdTxt(x.p, x.c)}</td><td class="${x.dif < 0 ? 'verm-txt' : 'ok-txt'}">${x.dif > 0 ? '+' : ''}${numBR(x.dif)}</td></tr>`).join('')}</tbody></table>` : '<p class="j-txt">Tudo bateu com o sistema.</p>'}<footer class="j-pe"><button type="button" class="bt" data-fechar>Continuar contando</button><button type="button" class="bt cheio" data-ok>Corrigir o estoque</button></footer>`, (j) => {
    $('[data-ok]', j).addEventListener('click', () => {
      l.forEach((x) => registraAjuste(x.p, x.dif, 'Ajuste de inventário', 'Inventário'));
      db.inventarios.push({ id: uid('i'), data: hoje(), cat: iv.cat, itens: iv.itens.filter((x) => x.c !== null), dif: val, falta: l.filter((x) => x.dif < 0).reduce((a, x) => a + Math.round(-x.dif * x.p.custo), 0), sobra: l.filter((x) => x.dif > 0).reduce((a, x) => a + Math.round(x.dif * x.p.custo), 0), quem: eu().nome }); estado.invent = null; grava(); fechar(); mostra(); toast('Estoque corrigido pelo inventário.');
    });
  }, true);
}

// ------------------------------------------------------------------ caixa do dia
function resumoCaixa(c = CXA(), t2 = TERM()) {
  const de = c.ab || agora(), ate = c.fe || '9999', vs = db.vendas.filter((v) => !v.cancelada && doTerm(v, t2) && v.data >= de && v.data <= ate), por = {};
  vs.forEach((v) => v.pag.forEach((p) => { por[p.f] = (por[p.f] || 0) + p.v; }));
  const receb = db.fiado.filter((f) => f.tipo === 'pag' && doTerm(f, t2) && f.data >= de && f.data <= ate), rDin = receb.filter((f) => (f.forma || 'dinheiro') === 'dinheiro').reduce((s, f) => s + f.v, 0);
  const san = (c.movs || []).filter((m) => m.t === 'sangria').reduce((s, m) => s + m.v, 0), sup = (c.movs || []).filter((m) => m.t === 'suprimento').reduce((s, m) => s + m.v, 0);
  return { vs, por, rDin, receb: receb.reduce((s, f) => s + f.v, 0), san, sup, esperado: (c.troco || 0) + (por.dinheiro || 0) + rDin + sup - san, total: vs.reduce((s, v) => s + v.total, 0) };
}
const outrosCaixas = () => (db.terminais.length > 1 ? `<section class="bloco"><header><h3>${ico('caixa')}Todos os caixas</h3></header><ul class="lista-simples">${db.terminais.map((x) => { const c2 = CXA(x.id), r2 = c2.aberto ? resumoCaixa(c2, x.id) : null; return `<li><b>${t(x.nome)}${x.id === TERM() ? ' <small class="cod">este aparelho</small>' : ''}</b><span>${c2.aberto ? `aberto às ${horaBR(c2.ab)} · ${r2.vs.length} vendas · ${din(r2.total)} · gaveta ${din(r2.esperado)}` : 'fechado'}</span></li>`; }).join('')}</ul></section>` : '');
const escolheCaixa = () => (db.terminais.length > 1 ? `<label class="esc-caixa">Este aparelho é o<select data-term>${db.terminais.map((x) => `<option value="${x.id}"${x.id === TERM() ? ' selected' : ''}>${t(x.nome)}</option>`).join('')}</select></label>` : '');
TELAS.caixa = () => {
  const c = CXA(), nt = nomeTerm(TERM());
  if (!c.aberto) return `<section class="cab-tela"><div><h2>${t(nt)}</h2><p>Este caixa está fechado.</p></div>${escolheCaixa()}</section><section class="bloco"><form class="form" id="f-abre"><label>Troco na gaveta para começar (R$)<input name="troco" inputmode="decimal" value="150,00"></label><button class="bt cheio verde">Abrir o caixa</button></form></section>${outrosCaixas()}${historicoCaixa()}`;
  const r = resumoCaixa();
  return `<section class="cab-tela"><div><h2>${t(nt)}</h2><p>Aberto às ${horaBR(c.ab)} de ${dataBR(c.ab)} com ${din(c.troco)} de troco.</p></div><div class="acoes"><button type="button" class="bt" data-acao="sangria">Sangria</button><button type="button" class="bt" data-acao="suprimento">Suprimento</button><button type="button" class="bt cheio" data-acao="fechar-caixa">Fechar o caixa</button></div>${escolheCaixa()}</section>
  <section class="cartoes">${Object.entries(FORMAS).map(([k, n]) => `<div class="cartao"><div><small>${n}</small><b>${din(r.por[k] || 0)}</b></div></div>`).join('')}<div class="cartao ouro-borda"><div><small>Fiado recebido</small><b>${din(r.receb)}</b></div></div></section>
  <section class="bloco"><dl class="soma larga"><div><dt>Troco inicial</dt><dd>${din(c.troco)}</dd></div><div><dt>Vendas em dinheiro</dt><dd>${din(r.por.dinheiro || 0)}</dd></div><div><dt>Fiado recebido em dinheiro</dt><dd>${din(r.rDin)}</dd></div><div><dt>Suprimentos</dt><dd>${din(r.sup)}</dd></div><div><dt>Sangrias</dt><dd>− ${din(r.san)}</dd></div><div class="total"><dt>Dinheiro que deve ter na gaveta</dt><dd>${din(r.esperado)}</dd></div></dl>
  ${(c.movs || []).length ? `<ul class="lista-simples">${c.movs.map((m) => `<li><b>${m.t === 'sangria' ? 'Sangria' : 'Suprimento'}</b><span>${horaBR(m.d)} · ${t(m.m || '')}</span><b>${din(m.v)}</b></li>`).join('')}</ul>` : ''}</section>${outrosCaixas()}${historicoCaixa()}`;
};
function historicoCaixa() {
  return db.caixas.length ? `<section class="bloco sem-pad"><header class="pad"><h3>Caixas fechados</h3></header><table class="tab grande"><thead><tr><th>Dia</th><th class="so-pc">Caixa</th><th>Vendas</th><th>Esperado</th><th>Contado</th><th>Diferença</th></tr></thead><tbody>${[...db.caixas].reverse().slice(0, 20).map((x) => `<tr><td>${dataBR(x.ab)}</td><td class="so-pc">${t(x.nome || 'Caixa 1')}${x.quem ? `<small class="cod">${t(x.quem)}</small>` : ''}</td><td>${din(x.total)}</td><td>${din(x.esperado)}</td><td>${din(x.contado)}</td><td class="${x.contado - x.esperado < 0 ? 'verm-txt' : x.contado - x.esperado > 0 ? 'ok-txt' : ''}">${din(x.contado - x.esperado)}</td></tr>`).join('')}</tbody></table></section>` : '';
}
function movCaixa(tipo) {
  abrir(`${cab(tipo === 'sangria' ? 'Sangria (tirar dinheiro da gaveta)' : 'Suprimento (pôr dinheiro na gaveta)')}<form class="form"><label>Valor (R$)<input name="v" inputmode="decimal" required></label><label>Motivo<input name="m" placeholder="${tipo === 'sangria' ? 'Pagamento do pão' : 'Troco'}"></label><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Registrar</button></footer></form>`, (j) => {
    $('form', j).addEventListener('submit', (e) => { e.preventDefault(); const v = lerDin(e.target.v.value); if (v <= 0) { toast('Digite o valor.', true); return; } CXA().movs.push({ id: uid('k'), t: tipo, v, m: e.target.m.value.trim(), d: agora() }); registra(`${tipo === 'sangria' ? 'Sangria' : 'Suprimento'} no ${nomeTerm(TERM())} de ${din(v)}${e.target.m.value.trim() ? ` (${e.target.m.value.trim()})` : ''}`, 'caixa'); grava(); fechar(); mostra(); });
  });
}
function fecharCaixa() {
  const r = resumoCaixa();
  abrir(`${cab('Fechar o caixa', `Deve ter ${din(r.esperado)} em dinheiro na gaveta`)}<form class="form"><label>Quanto você contou na gaveta (R$)<input name="c" inputmode="decimal" required></label><p class="mudo" id="dif"></p><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Fechar o caixa</button></footer></form>`, (j) => {
    const f = $('form', j); f.c.addEventListener('input', () => { const d = lerDin(f.c.value) - r.esperado; $('#dif', j).textContent = !f.c.value ? '' : d === 0 ? 'Bateu certinho.' : d < 0 ? `Faltando ${din(-d)}.` : `Sobrando ${din(d)}.`; });
    f.addEventListener('submit', (e) => { e.preventDefault(); const t2 = TERM(), c = CXA(t2); c.fe = agora(); db.caixas.push({ ab: c.ab, fe: c.fe, troco: c.troco, movs: c.movs, esperado: r.esperado, contado: lerDin(f.c.value), total: r.total, por: r.por, cx: t2, nome: nomeTerm(t2), quem: eu().nome }); poeCXA(t2, { aberto: false, movs: [] }); registra(`${nomeTerm(t2)} fechado: esperado ${din(r.esperado)}, contado ${din(lerDin(f.c.value))}`, 'caixa'); grava(); fechar(); mostra(); toast('Caixa fechado.'); });
  });
}

// ------------------------------------------------------------------ relatórios
TELAS.relatorios = () => {
  if (!pode('relatorios')) return `<section class="cab-tela"><div><h2>Relatórios</h2><p>Os relatórios são do dono. Peça para ele liberar no Painel do dono.</p></div></section>`;
  const k = estado.rel, [de, ate] = periodo(k), vs = vendasEntre(de, ate), tot = vs.reduce((s, v) => s + v.total, 0), cus = vs.reduce((s, v) => s + custoVenda(v), 0), luc = tot - cus;
  const perd = db.perdas.filter((x) => x.data.slice(0, 10) >= de && x.data.slice(0, 10) <= ate).reduce((s, x) => s + x.custo, 0);
  const por = {}; vs.forEach((v) => v.itens.forEach((x) => { const n = (prod(x.p) || {}).nome || x.nome; por[n] ||= { q: 0, v: 0, c: 0, kg: (prod(x.p) || {}).un === 'kg' }; por[n].q += x.q; por[n].v += Math.round(x.q * x.preco); por[n].c += Math.round(x.q * x.custo); }));
  const linhas = Object.entries(por).map(([n, x]) => ({ n, ...x, l: x.v - x.c })).sort((a, b) => b.l - a.l);
  let acum = 0; const totL = linhas.reduce((s, x) => s + Math.max(0, x.l), 0) || 1; linhas.forEach((x) => { acum += Math.max(0, x.l); x.abc = acum / totL <= 0.8 ? 'A' : acum / totL <= 0.95 ? 'B' : 'C'; });
  const fp = {}; vs.forEach((v) => v.pag.forEach((p) => { fp[p.f] = (fp[p.f] || 0) + p.v; }));
  const hrs = Array(24).fill(0); vs.forEach((v) => { hrs[Number(v.data.slice(11, 13))] += v.total; }); const maxH = Math.max(...hrs, 1);
  const itensV = vs.reduce((a, v) => a + v.itens.length, 0), canc = db.vendas.filter((v) => v.cancelada && v.data.slice(0, 10) >= de && v.data.slice(0, 10) <= ate);
  return `<section class="cab-tela"><div><h2>Relatórios</h2><p>${dataBR(de)} a ${dataBR(ate)} · ${vs.length} vendas</p></div><div class="acoes"><button type="button" class="bt" data-acao="exportar-rel">Planilha</button></div></section>
  <div class="chips">${[['hoje', 'Hoje'], ['7', '7 dias'], ['30', '30 dias'], ['mes', 'Este mês']].map(([v, n]) => `<button type="button" class="chip${k === v ? ' on' : ''}" data-rel="${v}">${n}</button>`).join('')}</div>
  <section class="cartoes"><div class="cartao"><div><small>Vendas</small><b>${din(tot)}</b><span class="var">ticket médio ${din(vs.length ? Math.round(tot / vs.length) : 0)}</span></div></div><div class="cartao"><div><small>Lucro bruto</small><b>${din(luc)}</b><span class="var sobe">margem ${margem(tot, cus).toLocaleString('pt-BR')}%</span></div></div><div class="cartao"><div><small>Perdas e quebras</small><b>${din(perd)}</b><span class="var desce">lucro sem perdas: ${din(luc - perd)}</span></div></div><div class="cartao"><div><small>Vendas canceladas</small><b>${canc.length}</b><span class="var">${din(canc.reduce((a, v) => a + v.total, 0))} · ${itensV} itens vendidos</span></div></div></section>
  <section class="grade2"><article class="bloco"><header><h3>Por forma de pagamento</h3></header><ul class="formas-rel">${Object.entries(FORMAS).map(([f, n]) => `<li><span>${n}</span><span class="medidor"><i style="width:${tot ? Math.round(((fp[f] || 0) / tot) * 100) : 0}%"></i></span><b>${din(fp[f] || 0)}</b></li>`).join('')}</ul></article>
  <article class="bloco"><header><h3>Vendas por hora</h3></header><div class="barras horas">${hrs.map((v, i) => (i >= 6 ? `<div class="b-col"><span class="b-bar" style="height:${Math.max(2, Math.round((v / maxH) * 100))}%" title="${pad(i)}h: ${din(v)}"></span><span class="b-dia">${i % 3 === 0 ? `${i}h` : ''}</span></div>` : '')).join('')}</div></article></section>
  <section class="bloco sem-pad"><header class="pad"><h3>Lucro por produto</h3><span class="selo">A = os que fazem 80% do lucro</span></header><table class="tab grande"><thead><tr><th>Produto</th><th>Vendido</th><th>Faturou</th><th>Lucro</th><th class="so-pc">Margem</th><th class="so-pc">Curva</th></tr></thead><tbody>${linhas.slice(0, 60).map((x) => `<tr><td>${t(x.n)}</td><td>${x.kg ? `${numBR(x.q)} kg` : numBR(x.q, 0)}</td><td>${din(x.v)}</td><td><b>${din(x.l)}</b></td><td class="so-pc">${margem(x.v, x.c).toLocaleString('pt-BR')}%</td><td class="so-pc"><span class="tag ${x.abc === 'A' ? 'verde' : x.abc === 'B' ? 'ambar' : 'cinza'}">${x.abc}</span></td></tr>`).join('') || '<tr><td colspan="6" class="vazio">Sem vendas no período.</td></tr>'}</tbody></table></section>`;
};

// ------------------------------------------------------------------ configurações e guia
TELAS.config = () => `<section class="cab-tela"><div><h2>Configurações</h2><p>Dados do comércio, fiado, impressão e cópia dos dados.</p></div></section>
  <section class="bloco"><form class="form duas" id="f-loja">
    <label>Nome do comércio<input name="nome" value="${t(db.loja.nome)}" required></label><label>Frase curta<input name="slogan" value="${t(db.loja.slogan)}"></label>
    <label>WhatsApp do comércio<input name="tel" value="${t(db.loja.tel)}" inputmode="tel"></label><label>Cidade<input name="cidade" value="${t(db.loja.cidade)}"></label>
    <label class="toda">Chave Pix (aparece no QR da venda e na cobrança do fiado)<input name="pix" value="${t(db.loja.pix)}" placeholder="CPF, CNPJ, celular, e-mail ou chave aleatória"></label>
    <label>Prazo do fiado (dias)<input name="prazo" type="number" min="1" max="120" value="${db.loja.prazo}"></label><label>Limite padrão de cliente novo (R$)<input name="limite" value="${campoDin(db.loja.limite)}" inputmode="decimal"></label>
    <label class="check toda"><input type="checkbox" name="impAuto" ${db.loja.impAuto ? 'checked' : ''}> Imprimir o comprovante sozinho ao concluir a venda (impressora térmica de 80 mm)</label>
    <p class="dica toda">Para sair direto, sem a janela de impressão: no computador do caixa, abra o Chrome pelo atalho com <b>--kiosk-printing</b> no fim (botão direito no atalho → Propriedades → Destino). A impressora térmica precisa ser a padrão do Windows.</p>
    <footer class="j-pe toda"><button class="bt cheio">Salvar</button></footer></form></section>
  <section class="bloco"><header><h3>Caixas</h3><button type="button" class="link" data-acao="novo-caixa">+ Novo caixa</button></header><p class="dica">Cada caixa abre, faz sangria e fecha separado. Em cada computador ou celular do caixa, escolha qual caixa ele é.</p><ul class="lista-simples">${db.terminais.map((x) => `<li><b>${t(x.nome)}</b><span>${x.id === TERM() ? 'este aparelho' : ''}</span>${x.id !== TERM() ? `<button type="button" class="link" data-usar-term="${x.id}">Usar neste aparelho</button>` : ''}</li>`).join('')}</ul></section>
  <section class="bloco"><header><h3>Balança etiquetadora</h3></header><form class="form duas" id="f-bal"><label class="check toda"><input type="checkbox" name="ativo" ${db.loja.bal && db.loja.bal.ativo ? 'checked' : ''}> Ler a etiqueta da balança (código de barras que começa com 2)</label>
    <label>A etiqueta traz<select name="tipo"><option value="preco"${(db.loja.bal || {}).tipo !== 'peso' ? ' selected' : ''}>O preço (R$)</option><option value="peso"${(db.loja.bal || {}).tipo === 'peso' ? ' selected' : ''}>O peso (kg)</option></select></label>
    <label>Dígitos do código do produto (PLU)<select name="dig"><option value="4"${(db.loja.bal || {}).dig !== 5 ? ' selected' : ''}>4 (2 CCCC 0 VVVVVV D)</option><option value="5"${(db.loja.bal || {}).dig === 5 ? ' selected' : ''}>5 (2 CCCCC VVVVVV D)</option></select></label>
    <p class="dica toda">No cadastro de cada produto de balança, preencha o “Código na balança (PLU)” igual ao da balança. Ao passar a etiqueta no caixa, o produto e o peso entram sozinhos.</p><footer class="j-pe toda"><button class="bt cheio">Salvar</button></footer></form></section>
  <section class="bloco"><header><h3>Cópia dos dados</h3></header><p class="dica">Guarde uma cópia de tudo num arquivo. Na conta, os dados já ficam na nuvem; a cópia é uma garantia a mais.</p><div class="acoes"><button type="button" class="bt" data-acao="copia">Baixar cópia</button><label class="bt">Restaurar cópia<input type="file" accept=".json,application/json" id="restaura" hidden></label></div></section>
  <section class="bloco"><header><h3>Nota fiscal</h3></header><p class="dica">O Annona não emite nota fiscal. A venda gera um comprovante sem valor fiscal para imprimir ou mandar no WhatsApp. Quem precisa de NFC-e continua usando o emissor que já tem e usa o Annona para estoque, validade, vendas, fiado, compras e lucro.</p></section>`;
const GUIA = [
  ['Cadastre os produtos', 'Em Estoque, toque em Novo produto e passe o código de barras no leitor (ou na câmera do celular): se o produto estiver na base aberta, o nome e a foto aparecem sozinhos. Quem já tem planilha usa Importar planilha.'],
  ['Dê entrada pela nota', 'Em Entradas, toque em Ler o XML da nota. O Annona traz produto, quantidade, custo, lote e validade. Nota em caixa (CX C/12) vira unidade com o custo certo.'],
  ['Venda no balcão', 'Em Vender, passe o código ou digite o nome. Produto de balança pede o peso. Dinheiro mostra o troco, Pix mostra o QR, e ainda cartão ou fiado.'],
  ['Acompanhe as vendas', 'Em Vendas fica tudo o que foi vendido, com busca. Toque numa venda para ver os itens, imprimir de novo ou cancelar: o estoque volta sozinho e fica registrado quem cancelou.'],
  ['Veja o histórico do produto', 'No produto, Histórico mostra cada entrada, venda, perda e ajuste, com o saldo depois de cada um. Dá para achar onde o estoque sumiu.'],
  ['Repor na hora certa', 'O Annona calcula quanto cada produto vende por dia e quantos dias o estoque dura. O que acaba em menos de 7 dias ou está no mínimo entra na lista de Compras, por fornecedor, pronta para o WhatsApp.'],
  ['Cuide do que está parado', 'Estoque → Parados há 30 dias mostra o dinheiro preso na prateleira. Faça oferta ou pare de comprar.'],
  ['Validades', 'A tela Validades mostra o que já venceu, o que vence em 7 e em 30 dias, com o dinheiro de cada lote.'],
  ['Perdas e inventário', 'Quebrou, venceu ou sumiu: registre em Perdas. Uma vez por mês, conte a prateleira em Inventário: o estoque se corrige e a tela mostra o que sumiu sem explicação, produto por produto, separado das perdas registradas.'],
  ['Preços', 'Reajustar preços muda uma categoria inteira por porcentagem, já arredondando para ,49 ou ,99.'],
  ['Fiado com limite', 'Passe o caderno inteiro de uma vez. Cada cliente tem limite; passou do prazo, aparece o atraso, e com mais de 15 dias o fiado trava sozinho. Se ele pagar a dívida na hora, o crédito volta. A venda no fiado imprime em 2 vias, com linha para o cliente assinar.'],
  ['Instale no celular e no computador', 'Toque em Instalar o app (no menu ou no topo). No iPhone: Safari → Compartilhar → Adicionar à Tela de Início. No Android: Chrome → três pontinhos → Instalar app. No computador: ícone de instalar na barra de endereço.'],
  ['Vários caixas e balança', 'Em Configurações, crie o Caixa 2, o Caixa 3… e em cada computador escolha qual caixa ele é: cada um abre, faz sangria e fecha separado. Com balança etiquetadora, ligue “Ler a etiqueta da balança” e preencha o código PLU do produto.'],
  ['Caixa do dia e relatórios', 'Abra o caixa com o troco e feche contando a gaveta. Nos relatórios, veja vendas, lucro de verdade (já tirando as perdas) e quais produtos dão mais lucro.'],
];
TELAS.guia = () => `<section class="cab-tela"><div><h2>Como usar o Annona</h2><p>${GUIA.length} passos, do cadastro ao lucro.</p></div></section><ol class="guia">${GUIA.map(([a, b]) => `<li><b>${a}</b><p>${b}</p></li>`).join('')}</ol>`;
TELAS.mais = () => `<section class="cab-tela"><div><h2>Mais</h2></div></section><nav class="mais-grade">${$$('#menu a').map((a) => `<a href="${a.getAttribute('href')}">${a.querySelector('svg').outerHTML}<span>${a.querySelector('span').textContent}</span></a>`).join('')}</nav>`;

// ------------------------------------------------------------------ rotas
let telaAtual = '';
function rota() {
  const [aba, sub] = (location.hash.slice(1) || 'painel').split('/'), nome = TELAS[aba] ? aba : 'painel';
  const tela = $('#tela'), mudou = nome !== telaAtual; telaAtual = nome;
  tela.innerHTML = TELAS[nome](sub);
  $$('[data-aba]').forEach((a) => a.classList.toggle('on', a.dataset.aba === nome));
  $('.topo').classList.toggle('so-painel', nome !== 'painel');
  $('#topo-sub').textContent = nome === 'painel' ? 'Veja o resumo do seu negócio hoje.' : db.loja.slogan || '';
  marca(); liga();
  const te = $('#topo-eu'); te.textContent = iniciais(eu().nome); te.title = `${eu().nome} · ${PAPEL[eu().perfil] || ''}`;
  if (mudou) { window.scrollTo(0, 0); tela.focus({ preventScroll: true }); anima(tela); }
  const l = $('#leitor') || $('#leitor-mesa') || $('#inv-cod'); if (l && matchMedia('(pointer:fine)').matches) l.focus();
}
// entrada orquestrada: blocos em sequência, itens em cascata e números que contam até o valor
function anima(tela) {
  tela.classList.remove('entra'); void tela.offsetWidth; tela.classList.add('entra');
  [...tela.children].forEach((el, i) => el.style.setProperty('--i', i));
  ['.kpi', '.vitrine', '.lista-foto li', '.mesas-mini li', '.rapido', '.mesa', '.cli', '.guia li', '.linha .ponto'].forEach((q) => $$(q, tela).forEach((el, j) => el.style.setProperty('--j', Math.min(j, 12))));
  clearTimeout(anima.t); anima.t = setTimeout(() => tela.classList.remove('entra'), 2600);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  $$('.kpi b, .cartao b, .meta-n b', tela).forEach((b) => {
    const txt = b.textContent; if (!/^R\$/.test(txt.trim())) return;
    const alvo = lerDin(txt), t0 = performance.now(), dur = 900;
    const passo = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3; b.textContent = din(Math.round(alvo * e)); if (k < 1) requestAnimationFrame(passo); else b.textContent = txt; };
    requestAnimationFrame(passo);
  });
}
const mostra = () => { const y = window.scrollY; rota(); window.scrollTo(0, y); };
addEventListener('hashchange', rota);

// sugestões ao digitar no leitor (balcão e mesa)
function sugere(inp, ao) {
  const box = $('#sugestoes'); if (!box) return;
  const l = inp.value.trim().length >= 2 && !/^\d{6,}$/.test(inp.value.trim()) ? buscaProd(inp.value) : [];
  box.innerHTML = l.map((p) => `<button type="button" class="sug" data-sug="${p.id}">${foto(p, 'mini')}<b>${t(p.nome)}</b><span>${qtdTxt(p)}</span><b>${din(p.preco)}${p.un === 'kg' ? '/kg' : ''}</b></button>`).join('');
  $$('[data-sug]', box).forEach((b) => b.addEventListener('click', () => { inp.value = ''; box.innerHTML = ''; ao(prod(b.dataset.sug)); }));
}
function contaInv(cod) { const p = ativos().find((x) => x.cod === String(cod).trim()); const it = p && estado.invent.itens.find((x) => x.p === p.id); if (!it) { toast('Esse código não está nesta contagem.', true); return; } it.c = r3((it.c || 0) + 1); mostra(); toast(`${p.nome}: ${numBR(it.c)}`); }

function liga() {
  const fl = $('#f-leitor'); if (fl) { const i = $('#leitor'); fl.addEventListener('submit', (e) => { e.preventDefault(); const v = i.value; i.value = ''; $('#sugestoes').innerHTML = ''; lerNoBalcao(v); }); i.addEventListener('input', () => sugere(i, poeNaVenda)); }
  const fb = $('#f-busca-est'); if (fb) { const i = $('#busca-est'); fb.addEventListener('submit', (e) => { e.preventDefault(); const p = ativos().find((x) => x.cod === i.value.trim()); if (p) formProduto(p); else if (/^\d{8,14}$/.test(i.value.trim())) formProduto({ cod: i.value.trim() }); }); i.addEventListener('input', () => { estado.filtro = i.value; const pos = i.selectionStart; mostra(); const n = $('#busca-est'); n.focus(); n.setSelectionRange(pos, pos); }); }
  const fvb = $('#f-vbusca'); if (fvb) { const i = $('#vbusca'); fvb.addEventListener('submit', (e) => e.preventDefault()); i.addEventListener('input', () => { estado.vbusca = i.value; const pos = i.selectionStart; mostra(); const n2 = $('#vbusca'); n2.focus(); n2.setSelectionRange(pos, pos); }); }
  const fi = $('#f-inv'); if (fi) fi.addEventListener('submit', (e) => { e.preventDefault(); const c = e.target.cat.value; estado.invent = { cat: c, itens: comEstoque().filter((p) => !c || p.cat === c).map((p) => ({ p: p.id, c: null })) }; mostra(); });
  const fic = $('#f-inv-cod'); if (fic) fic.addEventListener('submit', (e) => { e.preventDefault(); const i = $('#inv-cod'); const v = i.value; i.value = ''; contaInv(v); });
  $$('[data-term]').forEach((sel) => sel.addEventListener('change', () => { try { localStorage.setItem('annona-caixa', sel.value); } catch (e) { /* sem armazenamento */ } mostra(); toast(`Este aparelho agora é o ${nomeTerm(sel.value)}.`); }));
  $$('[data-perm]').forEach((c) => c.addEventListener('change', () => { const [ui, k] = c.dataset.perm.split('.'), u = db.usuarios.find((x) => x.id === ui); (u.perms ||= {})[k] = c.checked; registra(`${u.nome}: ${c.checked ? 'pode' : 'não pode mais'} ${PERMS.find((x) => x[0] === k)[1].toLowerCase()}`, 'equipe'); grava(); toast('Permissão salva.'); }));
  const fp = $('#f-perfil'); if (fp) fp.addEventListener('submit', (e) => { e.preventDefault(); const f = e.target, u = eu(); if (f.pin.value && !/^\d{4}$/.test(f.pin.value)) { toast('A senha tem 4 números.', true); return; } Object.assign(u, { nome: f.nome.value.trim(), tel: f.tel.value.trim(), email: f.email.value.trim(), abrir: f.abrir.value }); if (f.pin.value) u.pin = f.pin.value; grava(); mostra(); toast('Perfil salvo.'); });
  const fmt = $('#f-meta'); if (fmt) fmt.m.addEventListener('change', () => { db.meta = lerDin(fmt.m.value); grava(); mostra(); toast('Meta salva.'); });
  $$('[data-conta]').forEach((inp) => inp.addEventListener('change', () => { const it = estado.invent.itens.find((x) => x.p === inp.dataset.conta); it.c = inp.value.trim() === '' ? null : r3(lerNum(inp.value)); inp.closest('tr').classList.toggle('feito', it.c !== null); }));
  const fa = $('#f-abre'); if (fa) fa.addEventListener('submit', (e) => { e.preventDefault(); if (!pode('caixa')) { liberar('caixa', 'abrir o caixa', () => fa.requestSubmit()); return; } poeCXA(TERM(), { aberto: true, ab: agora(), troco: lerDin(e.target.troco.value), movs: [], quem: eu().nome }); registra(`${nomeTerm(TERM())} aberto com ${din(CXA().troco)} de troco`, 'caixa'); grava(); mostra(); toast('Caixa aberto. Boas vendas!'); });
  const flj = $('#f-loja'); if (flj) flj.addEventListener('submit', (e) => { e.preventDefault(); const f = e.target; Object.assign(db.loja, { nome: f.nome.value.trim(), slogan: f.slogan.value.trim(), tel: f.tel.value.trim(), cidade: f.cidade.value.trim(), pix: f.pix.value.trim(), prazo: Math.max(1, Number(f.prazo.value) || 30), limite: lerDin(f.limite.value), impAuto: f.impAuto.checked }); grava(); mostra(); toast('Configurações salvas.'); });
  const fbal = $('#f-bal'); if (fbal) fbal.addEventListener('submit', (e) => { e.preventDefault(); const f = e.target; db.loja.bal = { ativo: f.ativo.checked, tipo: f.tipo.value, dig: Number(f.dig.value) }; grava(); toast('Balança salva.'); });
  const xml = $('#xml'); if (xml) xml.addEventListener('click', (e) => { if (!pode('entradas')) { e.preventDefault(); liberar('entradas', 'dar entrada pela nota', () => xml.click()); } });
  if (xml) xml.addEventListener('change', () => { const a = xml.files[0]; if (!a) return; a.text().then((txt) => { try { formEntrada(lerXML(txt)); } catch (e) { toast('Esse arquivo não parece o XML de uma nota fiscal (NF-e).', true); } }); xml.value = ''; });
  const rs = $('#restaura'); if (rs) rs.addEventListener('change', () => { const a = rs.files[0]; if (!a) return; a.text().then((txt) => { try { const d = JSON.parse(txt); if (!Array.isArray(d.produtos)) throw new Error('x'); confirmar('Restaurar a cópia', 'Os dados de agora serão trocados pelos da cópia.', 'Restaurar', () => { db = d; grava(); mostra(); toast('Cópia restaurada.'); }, true); } catch (e) { toast('Esse arquivo não é uma cópia do Annona.', true); } }); rs.value = ''; });
}

// cliques
document.addEventListener('click', (e) => {
  const b = e.target.closest('button, tr.clica, [data-cat], [data-rel], [data-vper], [data-ir-parados]'); if (!b || b.closest('#camada')) return;
  const ds = b.dataset;
  if (b.matches('[data-ir-parados]')) { estado.cat = '_parado'; }
  if (ds.carro) { const c = $('#carrossel'); c.scrollBy({ left: Number(ds.carro) * c.clientWidth * 0.8, behavior: 'smooth' }); return; }
  if (ds.por) { poeNaVenda(prod(ds.por)); return; }
  for (const k of ['menos', 'mais', 'tira']) if (ds[k]) {
    const [onde, i] = ds[k].split(':'), lista = estado.venda.itens, it = lista[Number(i)];
    if (k === 'tira' || (k === 'menos' && it.q <= 1)) lista.splice(Number(i), 1); else it.q = r3(it.q + (k === 'mais' ? 1 : -1));
    if (onde !== 'venda') grava(); mostra(); return;
  }
  if (ds.cat !== undefined && b.classList.contains('chip')) { estado.cat = ds.cat; mostra(); return; }
  if (ds.rel) { estado.rel = ds.rel; mostra(); return; }
  if (ds.vper) { estado.vper = ds.vper; mostra(); return; }
  if (ds.venda) { detalheVenda(db.vendas.find((v) => v.id === ds.venda)); return; }
  if (ds.prod) { formProduto(prod(ds.prod)); return; }
  if (ds.entrada) { const en = db.entradas.find((x) => x.id === ds.entrada); abrir(`${cab(`Entrada de ${dataBR(en.data)}`, `${t((forn(en.forn) || {}).nome || '')}${en.nota ? ` · nota ${t(en.nota)}` : ''}`)}<table class="tab"><thead><tr><th>Produto</th><th>Qtd.</th><th>Custo</th><th>Lote</th><th>Validade</th></tr></thead><tbody>${en.itens.map((x) => { const p = prod(x.p); return `<tr><td>${t(p ? p.nome : '—')}</td><td>${p ? qtdTxt(p, x.q) : x.q}</td><td>${din(x.custo)}</td><td>${t(x.lote || '—')}</td><td>${dataBR(x.val) || '—'}</td></tr>`; }).join('')}</tbody></table><footer class="j-pe"><b>Total ${din(en.total)}</b><button type="button" class="bt cheio" data-fechar>Ok</button></footer>`, null, true); return; }
  if (ds.perdaLote && !pode('estoque')) { liberar('estoque', 'jogar fora lote vencido', () => toast('Liberado. Toque em Jogar fora de novo.')); return; }
  if (ds.perdaLote) { const [pid, lid] = ds.perdaLote.split(':'), p = prod(pid), l = p.lotes.find((x) => x.id === lid); confirmar('Jogar fora o lote vencido', `${qtdTxt(p, l.q)} de ${t(p.nome)} (lote ${t(l.lote || '—')}) saem do estoque como perda por vencimento: ${din(Math.round(l.q * p.custo))}.`, 'Registrar perda', () => { db.perdas.push({ id: uid('x'), data: agora(), p: p.id, q: l.q, motivo: 'Venceu', custo: Math.round(l.q * p.custo), obs: `Lote ${l.lote || ''}` }); p.q = r3(p.q - l.q); p.lotes = p.lotes.filter((x) => x.id !== lid); grava(); mostra(); toast('Lote vencido tirado do estoque.'); }, true); return; }
  if (ds.oferta) { const p = prod(ds.oferta); abrir(`${cab(`Oferta de ${t(p.nome)}`, `Preço hoje ${din(p.preco)} · custo ${din(p.custo)}`)}<form class="form"><label>Novo preço (R$)<input name="pr" inputmode="decimal" value="${campoDin(Math.max(p.custo, Math.round(p.preco * 0.8)))}"></label><p class="dica">Vender pelo custo ainda é melhor do que jogar fora. Volte o preço depois em Estoque.</p><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Mudar o preço</button></footer></form>`, (j) => $('form', j).addEventListener('submit', (ev) => { ev.preventDefault(); registra(`Oferta de ${p.nome}: ${din(p.preco)} → ${din(lerDin(ev.target.pr.value) || p.preco)}`, 'preco'); p.preco = lerDin(ev.target.pr.value) || p.preco; grava(); fechar(); mostra(); toast('Preço de oferta salvo.'); })); return; }
  if (ds.pedir) {
    const f = forn(ds.pedir), linhas = $$(`[data-forn="${ds.pedir}"] [data-ped]`).map((i) => { const p = prod(i.dataset.ped); return [p, lerNum(i.value)]; }).filter((x) => x[1] > 0);
    const txt = `Olá! Aqui é do ${db.loja.nome}. Pedido de ${dataBR(hoje())}:\n${linhas.map(([p, q]) => `• ${numBR(q)} ${p.un === 'kg' ? 'kg' : 'un'} de ${p.nome}`).join('\n')}\nObrigado!`;
    db.pedidos.push({ id: uid('o'), data: agora(), forn: f.id, itens: linhas.map(([p, q]) => ({ p: p.id, q })) }); grava(); window.open(zap(f.tel, txt), '_blank', 'noopener'); return;
  }
  if (ds.edforn) { formForn(forn(ds.edforn)); return; }
  if (ds.usarTerm) { try { localStorage.setItem('annona-caixa', ds.usarTerm); } catch (e2) { /* sem armazenamento */ } mostra(); toast(`Este aparelho agora é o ${nomeTerm(ds.usarTerm)}.`); return; }
  if (ds.como) { db.usuario = ds.como; grava(); location.hash = `#${eu().abrir || 'painel'}`; mostra(); toast(`Agora você vê o sistema como ${eu().nome}.`); return; }
  if (ds.tiraU) { const u = db.usuarios.find((x) => x.id === ds.tiraU); confirmar('Tirar da equipe', `${t(u.nome)} perde o acesso. As vendas dela continuam nos relatórios.`, 'Tirar', () => { db.usuarios = db.usuarios.filter((x) => x.id !== u.id); registra(`${u.nome} saiu da equipe`, 'equipe'); grava(); mostra(); }, true); return; }
  const id = ds.id, A = {
    'camera-venda': () => lerCamera(lerNoBalcao), 'camera-estoque': () => lerCamera((c) => { const p = ativos().find((x) => x.cod === c); if (p) formProduto(p); else formProduto({ cod: c }); }),
    'camera-inv': () => lerCamera(contaInv),
    'limpar-venda': () => { estado.venda = { itens: [], cli: '', desc: 0 }; mostra(); },
    desconto: () => liberar('desconto', 'desconto na venda', () => abrir(`${cab('Desconto na venda')}<form class="form"><label>Desconto (R$)<input name="d" inputmode="decimal" value="${campoDin(estado.venda.desc)}"></label><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Aplicar</button></footer></form>`, (j) => $('form', j).addEventListener('submit', (ev) => { ev.preventDefault(); const sub = estado.venda.itens.reduce((s, x) => s + Math.round(x.q * x.preco), 0); estado.venda.desc = Math.min(sub, lerDin(ev.target.d.value)); fechar(); mostra(); }))),
    'pagar-venda': () => pagar({ itens: estado.venda.itens, desc: estado.venda.desc, titulo: 'Receber', origem: 'balcao', depois: () => { estado.venda = { itens: [], cli: '', desc: 0 }; mostra(); } }),
    'caderno-todo': cadernoTodo,
    'novo-produto': () => formProduto(), reajuste, etiquetas: () => escolherEtiquetas(), 'nova-entrada': () => liberar('entradas', 'dar entrada de mercadoria', () => formEntrada()), 'nova-perda': () => liberar('estoque', 'registrar perda', () => formPerda()), 'nova-pessoa': novaPessoa,
    'novo-cliente': () => formCliente(), 'editar-cliente': () => formCliente(cli(id)), receber: () => receber(cli(id)),
    bloquear: () => { cli(id).bloq = true; registra(`Fiado bloqueado: ${cli(id).nome}`, 'fiado'); grava(); mostra(); toast('Fiado bloqueado para este cliente.'); },
    liberar: () => { const c = cli(id); if (c.bloq) { c.bloq = false; grava(); mostra(); toast('Cliente desbloqueado.'); } else confirmar('Liberar o fiado', 'O cliente está com atraso. Liberar só desta vez? (Na próxima venda, decida de novo.)', 'Entendi', () => toast('Na venda, escolha Fiado normalmente: o dono pode passar o limite.'), false); },
    caderno: () => { const c = cli(id); abrir(`${cab('Passar do caderno', t(c.nome))}<form class="form"><label>Valor que ele já devia (R$)<input name="v" inputmode="decimal" required></label><label>Data da compra no caderno<input name="d" type="date" value="${hoje()}"></label><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Lançar</button></footer></form>`, (j) => $('form', j).addEventListener('submit', (ev) => { ev.preventDefault(); const v = lerDin(ev.target.v.value); if (v <= 0) return; db.fiado.push({ id: uid('f'), cli: c.id, data: `${ev.target.d.value}T12:00:00`, tipo: 'compra', v, obs: 'Do caderno' }); grava(); fechar(); mostra(); toast('Dívida do caderno lançada.'); })); },
    'novo-forn': () => formForn(), sangria: () => liberar('caixa', 'sangria do caixa', () => movCaixa('sangria')), suprimento: () => liberar('caixa', 'suprimento do caixa', () => movCaixa('suprimento')), 'fechar-caixa': () => liberar('caixa', 'fechar o caixa', fecharCaixa),
    'inv-cancelar': () => { estado.invent = null; mostra(); }, 'inv-fim': fimInventario,
    copia: () => baixarArq(`annona-copia-${hoje()}.json`, JSON.stringify(db), 'application/json'),
    'exportar-estoque': () => baixarArq(`estoque-${hoje()}.csv`, csv([['Produto', 'Código', 'Categoria', 'Unidade', 'Estoque', 'Mínimo', 'Custo', 'Preço'], ...ativos().map((p) => [p.nome, p.cod, p.cat, UN[p.un], numBR(p.q), numBR(p.min), campoDin(p.custo), campoDin(p.preco)])])),
    'exportar-rel': () => { const [de, ate] = periodo(estado.rel); baixarArq(`vendas-${de}-a-${ate}.csv`, csv([['Nº', 'Data', 'Hora', 'Quem vendeu', 'Itens', 'Total', 'Lucro', 'Pagamento'], ...vendasEntre(de, ate).map((v) => [v.n, dataBR(v.data), horaBR(v.data), nomeU(v.vend), v.itens.map((x) => `${numBR(x.q)} ${x.nome}`).join(', '), campoDin(v.total), campoDin(lucroVenda(v)), v.pag.map((x) => FORMAS[x.f]).join(' + ')])])); },
    importar: importarPlanilha,
    'novo-caixa': () => liberar('caixa', 'criar um caixa', () => { const n = db.terminais.length + 1; db.terminais.push({ id: `c${Date.now().toString(36)}`, nome: `Caixa ${n}` }); registra(`Caixa ${n} criado`, 'caixa'); grava(); mostra(); toast(`Caixa ${n} criado. No aparelho dele, toque em Usar neste aparelho.`); }),
    'exportar-vendas': () => { const [de, ate] = periodo(estado.vper || 'hoje'); baixarArq(`vendas-${de}-a-${ate}.csv`, csv([['Nº', 'Data', 'Hora', 'Situação', 'Itens', 'Total', 'Pagamento', 'Quem vendeu'], ...db.vendas.filter((v) => v.data.slice(0, 10) >= de && v.data.slice(0, 10) <= ate).map((v) => [v.n, dataBR(v.data), horaBR(v.data), v.cancelada ? `Cancelada: ${v.cancelada.motivo}` : 'Concluída', v.itens.map((x) => `${numBR(x.q)} ${x.nome}`).join(', '), campoDin(v.total), v.pag.map((x) => FORMAS[x.f]).join(' + '), nomeU(v.vend)])])); },
  };
  if (ds.acao && A[ds.acao]) A[ds.acao]();
});
// planilha CSV (Excel salva em CSV): Produto; Código; Categoria; Estoque; Mínimo; Custo; Preço
function importarPlanilha() {
  abrir(`${cab('Importar planilha de produtos', 'Arquivo CSV (no Excel: Salvar como → CSV)')}<p class="j-txt">Colunas reconhecidas: <b>Produto</b>, Código, Categoria, Estoque, Mínimo, Custo, Preço. Produto com o mesmo código é atualizado.</p><div class="form"><input type="file" accept=".csv,text/csv" id="csvf"></div><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button></footer>`, (j) => {
    $('#csvf', j).addEventListener('change', (e) => e.target.files[0].text().then((txt) => {
      const ls = txt.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim()), sep = (ls[0].match(/;/g) || []).length >= (ls[0].match(/,/g) || []).length ? ';' : ',';
      const corta = (l) => l.split(sep).map((x) => x.replace(/^"|"$/g, '').trim()), cabs = corta(ls[0]).map(sa), col = (...n) => cabs.findIndex((c) => n.some((x) => c.includes(x)));
      const iN = col('produto', 'nome', 'descricao'), iC = col('codigo', 'barra', 'ean'), iCat = col('categoria', 'grupo'), iQ = col('estoque', 'quantidade', 'qtd'), iM = col('minimo'), iCu = col('custo'), iP = col('preco', 'venda');
      if (iN < 0) { toast('Não achei a coluna Produto.', true); return; }
      let n = 0, a = 0;
      ls.slice(1).forEach((l) => { const c = corta(l), nome = c[iN]; if (!nome) return; const cod = iC >= 0 ? c[iC].replace(/\D/g, '') : '', ex = cod && db.produtos.find((p) => p.cod === cod); const d = { nome, cat: (iCat >= 0 && c[iCat]) || 'Outros', min: iM >= 0 ? lerNum(c[iM]) : 0, custo: iCu >= 0 ? lerDin(c[iCu]) : 0, preco: iP >= 0 ? lerDin(c[iP]) : 0 }; if (ex) { Object.assign(ex, d); if (iQ >= 0) ex.q = r3(lerNum(c[iQ])); a++; } else { db.produtos.push({ id: uid('p'), ...d, un: 'un', q: iQ >= 0 ? r3(lerNum(c[iQ])) : 0, forn: '', cod: cod || ean13(`2${String(Date.now() + n).slice(-11)}`), lotes: [], criado: hoje() }); n++; } });
      grava(); fechar(); mostra(); toast(`${n} produto${n === 1 ? '' : 's'} novo${n === 1 ? '' : 's'} e ${a} atualizado${a === 1 ? '' : 's'}.`);
    }));
  });
}

// ------------------------------------------------------------------ instalar o app e demonstração
let pedido = null;
const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedido = e; });
addEventListener('appinstalled', () => { pedido = null; toast('Annona instalado. Abra pelo ícone na tela.'); marcaInstalar(); });
// instalar: usa o pedido do navegador quando existe (Chrome e Edge); senão, mostra o passo a passo do aparelho
function instalar() {
  if (instalado()) { toast('O Annona já está instalado neste aparelho.'); return; }
  const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), android = /Android/i.test(ua);
  const passos = ios ? [['Abra no Safari', 'O iPhone só instala pelo Safari. Se abriu por outro navegador, copie o endereço e abra no Safari.'], ['Toque em Compartilhar', 'O quadrado com a seta para cima, na barra de baixo.'], ['Adicionar à Tela de Início', 'Role a lista e toque nessa opção. Depois, em Adicionar.']]
    : android ? [['Abra no Chrome', 'Use o Chrome do celular.'], ['Toque nos três pontinhos', 'No canto de cima, à direita.'], ['Instalar app', 'Ou “Adicionar à tela inicial”. Confirme em Instalar.']]
    : [['Abra no Chrome ou no Edge', 'No computador do caixa.'], ['Clique no ícone de instalar', 'Fica no fim da barra de endereço (um monitor com uma seta).'], ['Instalar', 'O Annona abre na própria janela e ganha um ícone na área de trabalho.']];
  abrir(`${cab('Instalar o Annona', 'Vira um aplicativo com ícone, abre sem a barra do navegador e continua vendendo com a internet fraca.')}
    ${pedido ? `<button type="button" class="bt cheio verde grande inst-ja" data-inst-ja>${ico('subir')}Instalar agora</button><p class="dica">Ou pelo passo a passo:</p>` : ''}
    <ol class="inst">${passos.map(([a, b2]) => `<li><b>${a}</b><span>${b2}</span></li>`).join('')}</ol>
    <p class="dica">Instale em cada celular e computador da equipe. Na conta, todos veem os mesmos dados.</p><footer class="j-pe"><button type="button" class="bt" data-fechar>Fechar</button></footer>`, (j) => {
    const bj = $('[data-inst-ja]', j); if (bj) bj.addEventListener('click', async () => { const p2 = pedido; if (!p2) return; p2.prompt(); const r2 = await p2.userChoice; pedido = null; fechar(); if (r2.outcome === 'accepted') toast('Instalando o Annona…'); });
  });
}
function marcaInstalar() { $('#bt-instalar').hidden = instalado(); $('#lat-instalar').hidden = instalado(); }
$('#bt-instalar').addEventListener('click', instalar);
$('#lat-instalar').addEventListener('click', instalar);
marcaInstalar();
if (pediuInstalar) setTimeout(instalar, 600);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
$('#recomecar').addEventListener('click', () => confirmar('Recomeçar a demonstração?', 'Os dados de exemplo voltam ao começo neste aparelho.', 'Recomeçar', () => { localStorage.removeItem(CHAVE); location.replace(location.pathname); }, true));
if (window.veltriaConta) document.body.classList.add('na-conta');
if (!location.hash && eu().abrir && eu().abrir !== 'painel') history.replaceState(null, '', `#${eu().abrir}`);
rota();
