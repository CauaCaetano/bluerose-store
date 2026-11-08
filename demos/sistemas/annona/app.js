// Annona · estoque e vendas do mercadinho, da mercearia, do empório e do bar pequeno.
// Código de barras (leitor ou câmera), validade por lote, entrada pela nota do fornecedor (XML), estoque mínimo e lista de compras,
// venda no balcão (dinheiro, Pix, cartão e fiado), mesas do bar com dose da garrafa, fiado com limite e cobrança no WhatsApp,
// perdas e quebras, inventário pelo celular, caixa do dia e lucro por produto.
// Dinheiro sempre em centavos (inteiros). Quantidade em unidades, kg ou garrafas (a dose baixa a fração da garrafa).
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
const agora = () => new Date().toISOString();
const telLimpo = (tel) => String(tel || '').replace(/\D/g, '');
const zap = (tel, m) => `https://wa.me/${telLimpo(tel).length >= 12 ? '' : '55'}${telLimpo(tel)}?text=${encodeURIComponent(m)}`;
const FORMAS = { dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Débito', credito: 'Crédito', fiado: 'Fiado' };
const UN = { un: 'un', kg: 'kg', cx: 'cx', gf: 'garrafa' };
const MOTIVOS = ['Venceu', 'Quebrou', 'Estragou', 'Consumo da casa', 'Sumiu', 'Ajuste de inventário', 'Outro'];

// EAN-13 com dígito verificador certo (os códigos da demonstração passam no leitor de verdade)
function ean13(base12) { const d = String(base12).padStart(12, '0').slice(0, 12); let s = 0; for (let i = 0; i < 12; i++) s += Number(d[i]) * (i % 2 ? 3 : 1); return d + ((10 - (s % 10)) % 10); }
const eanValido = (c) => /^\d{13}$/.test(c) && ean13(c.slice(0, 12)) === c;

// fotos de produto (Pexels, licença livre) só na demonstração; na conta, a loja põe a foto que quiser
const FOTOS = {"Cerveja lata 350": "cerveja-lata", "Cerveja long neck": "cerveja-longneck", "Cerveja garrafa 600": "cerveja-600", "Cerveja puro malte": "cerveja-473", "Refrigerante lata": "refri-lata", "Água mineral": "agua", "Energético": "energetico", "Cachaça": "cachaca", "Conhaque": "conhaque", "Arroz": "arroz", "Feijão": "feijao", "Açúcar": "acucar", "Óleo": "oleo", "Café": "cafe", "Macarrão": "macarrao", "Leite": "leite", "Iogurte": "iogurte", "Queijo": "queijo", "Presunto": "presunto", "Pão francês": "pao-frances", "Pão de forma": "pao-forma", "Bolo": "bolo", "Tomate": "tomate", "Banana": "banana", "Batata palha": "batata-palha", "Batata": "batata", "Detergente": "detergente", "Sabão": "sabao", "Papel": "papel", "Sabonete": "sabonete", "Carvão": "carvao", "Gelo": "gelo", "Linguiça": "linguica", "Picanha": "picanha", "Amendoim": "amendoim", "Chocolate": "chocolate", "Batata frita": "porcao-batata", "Calabresa": "porcao-calabresa", "Isca": "porcao-isca", "Pastel": "porcao-pastel", "Uísque": "uisque", "Vodca": "vodca", "Manteiga": "manteiga"};
// ------------------------------------------------------------------ demonstração: o Mercadinho São José (mercearia com bar)
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
  // [nome, categoria, un, custo, preço, estoque, mínimo, fornecedor, validade em dias (lote) ou 0, dose {ml, doseMl, preço}]
  const L = [
    ['Cerveja lata 350 ml', 'Cervejas', 'un', 289, 549, 24, 60, 'f1', 0],
    ['Cerveja long neck 330 ml', 'Cervejas', 'un', 469, 899, 48, 36, 'f1', 0],
    ['Cerveja garrafa 600 ml', 'Cervejas', 'un', 699, 1290, 30, 24, 'f1', 0],
    ['Cerveja puro malte lata 473 ml', 'Cervejas', 'un', 459, 799, 36, 24, 'f1', 0],
    ['Refrigerante 2 L', 'Bebidas', 'un', 699, 1099, 18, 12, 'f1', 0],
    ['Refrigerante lata 350 ml', 'Bebidas', 'un', 289, 549, 40, 24, 'f1', 0],
    ['Água mineral 500 ml', 'Bebidas', 'un', 119, 350, 60, 36, 'f1', 0],
    ['Energético 473 ml', 'Bebidas', 'un', 699, 1290, 12, 6, 'f1', 0],
    ['Cachaça prata 965 ml', 'Destilados', 'gf', 1490, 2490, 6.48, 3, 'f1', 0, { ml: 965, doseMl: 50, preco: 500 }],
    ['Vodca 998 ml', 'Destilados', 'gf', 3890, 5990, 3.6, 2, 'f1', 0, { ml: 998, doseMl: 50, preco: 1000 }],
    ['Uísque 8 anos 1 L', 'Destilados', 'gf', 9990, 14990, 2.35, 1, 'f1', 0, { ml: 1000, doseMl: 50, preco: 1800 }],
    ['Conhaque 900 ml', 'Destilados', 'gf', 1990, 3190, 4.7, 2, 'f1', 0, { ml: 900, doseMl: 50, preco: 600 }],
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
    ['Batata palha 120 g', 'Petiscos', 'un', 399, 749, 11, 6, 'f2', 0],
    ['Chocolate 90 g', 'Bomboniere', 'un', 499, 849, 20, 10, 'f2', 0],
    ['Batata frita (porção)', 'Porções', 'un', 890, 3290, 0, 0, '', 0],
    ['Calabresa acebolada (porção)', 'Porções', 'un', 1250, 3690, 0, 0, '', 0],
    ['Isca de frango (porção)', 'Porções', 'un', 1490, 4290, 0, 0, '', 0],
    ['Pastel (6 unidades)', 'Porções', 'un', 690, 2490, 0, 0, '', 0],
  ];
  const produtos = L.map((x, i) => {
    const mult = x[5] <= x[6] ? 1 : 3; // o que está no mínimo continua no mínimo (lista de compras); o resto tem estoque de verdade
    const p = { id: `p${i + 1}`, nome: x[0], cat: x[1], un: x[2], custo: x[3], preco: x[4], q: r3(x[5] * mult), min: x[6], forn: x[7], cod: ean13(`7891${String(20261 + i * 37).padStart(5, '0')}${String(i).padStart(3, '0')}`), lotes: [], criado: somaDias(h, -90) };
    if (x[9]) p.dose = { ...x[9] };
    const fo = Object.entries(FOTOS).filter(([n]) => x[0].startsWith(n)).sort((a, b) => b[0].length - a[0].length)[0]; if (fo) p.foto = `fotos/${fo[1]}.webp`;
    if (x[1] === 'Porções') { p.semEstoque = true; p.cozinha = true; p.cod = ''; p.adics = x[0].startsWith('Batata') ? [{ n: 'Cheddar e bacon', v: 900 }, { n: 'Trocar por mandioca', v: 0 }] : x[0].startsWith('Pastel') ? [{ n: 'Metade carne, metade queijo', v: 0 }] : [{ n: 'Molho extra', v: 300 }]; }
    if (x[0].startsWith('Cerveja garrafa')) p.hh = { preco: 990, dias: [4, 5], de: '18:00', ate: '20:00' };
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
  // vendas dos últimos 28 dias (mais na sexta e no sábado; o bar vende à noite)
  const vendas = [], formas = ['dinheiro', 'pix', 'pix', 'debito', 'credito', 'debito', 'pix'];
  for (let d = 27; d >= 0; d--) {
    const dia = somaDias(h, -d), sem = new Date(`${dia}T12:00`).getDay(), hAgora = new Date().getHours(), n = Math.round([58, 44, 46, 49, 55, 74, 86][sem] * (0.88 + r() * 0.24));
    for (let k = 0; k < n; k++) {
      const itens = [], ni = 1 + Math.floor(r() * 4);
      for (let j = 0; j < ni; j++) {
        const p = produtos[Math.floor(r() ** 1.6 * produtos.length)];
        if (p.dose && r() < 0.7) { const q = 1 + Math.floor(r() * 3); itens.push({ p: p.id, nome: `Dose de ${p.nome.replace(/ \d.*$/, '')}`, q, preco: p.dose.preco, custo: Math.round(p.custo * p.dose.doseMl / p.dose.ml), dose: true }); continue; }
        const q = p.un === 'kg' ? r3(0.2 + r() * 1.3) : 1 + Math.floor(r() * (p.cat === 'Cervejas' ? 6 : 2));
        itens.push({ p: p.id, nome: p.nome, q, preco: p.preco, custo: p.custo });
      }
      const total = itens.reduce((s, x) => s + Math.round(x.q * x.preco), 0), hora = sem >= 5 || sem === 0 ? 8 + Math.floor(r() * 15) : 7 + Math.floor(r() * 14);
      if (d === 0 && hora > hAgora) continue; // hoje: só as vendas até agora
      const f = formas[Math.floor(r() * formas.length)];
      vendas.push({ id: uid('v'), n: vendas.length + 1, data: `${dia}T${pad(Math.min(hora, 23))}:${pad(Math.floor(r() * 60))}:00`, itens, total, desc: 0, pag: [{ f, v: total }], origem: hora >= 18 ? 'mesa' : 'balcao', mesa: hora >= 18 ? `Mesa ${1 + Math.floor(r() * 8)}` : null, vend: hora >= 18 ? 'u3' : r() < 0.55 ? 'u2' : 'u1' });
    }
  }
  vendas.sort((a, b) => a.data.localeCompare(b.data)); vendas.forEach((v, i) => { v.n = i + 1; });
  const pid = (n) => produtos.find((p) => p.nome.startsWith(n));
  const item = (n, q, dose = false) => { const p = pid(n); return dose ? { p: p.id, nome: `Dose de ${p.nome.replace(/ \d.*$/, '')}`, q, preco: p.dose.preco, custo: Math.round(p.custo * p.dose.doseMl / p.dose.ml), dose: true, h: agora() } : { p: p.id, nome: p.nome, q, preco: p.preco, custo: p.custo, h: agora() }; };
  const mesas = [
    { id: 'm3', nome: 'Mesa 3', pessoas: 4, aberta: `${h}T17:42:00`, itens: [item('Cerveja garrafa', 6), item('Amendoim', 2), item('Cachaça', 3, true), item('Batata palha', 1), { ...item('Calabresa acebolada', 1), id: 'i-demo2', cz: 'prep', obs: 'Sem pimenta' }] },
    { id: 'm5', nome: 'Mesa 5', pessoas: 2, aberta: `${h}T18:20:00`, itens: [item('Cerveja long neck', 5), item('Refrigerante lata', 1), item('Amendoim', 1), { ...item('Batata frita', 1), id: 'i-demo1', cz: 'novo', obs: 'Bem sequinha', adics: [{ n: 'Cheddar e bacon', v: 900 }], base: 3290, preco: 4190 }] },
    { id: 'mb', nome: 'Balcão', pessoas: 1, aberta: `${h}T18:55:00`, itens: [item('Conhaque', 2, true), item('Cerveja lata', 2)] },
  ];
  const entradas = [
    { id: uid('e'), data: somaDias(h, -1), forn: 'f4', nota: '4471', itens: [{ p: pid('Pão francês').id, q: 6, custo: 1090 }, { p: pid('Pão de forma').id, q: 6, custo: 699 }], total: 6540 + 4194 },
    { id: uid('e'), data: somaDias(h, -3), forn: 'f3', nota: '118203', itens: [{ p: pid('Leite').id, q: 24, custo: 449 }, { p: pid('Iogurte').id, q: 18, custo: 189 }, { p: pid('Presunto').id, q: 3, custo: 2790 }], total: 10776 + 3402 + 8370 },
    { id: uid('e'), data: somaDias(h, -5), forn: 'f1', nota: '902117', itens: [{ p: pid('Cerveja lata').id, q: 96, custo: 289 }, { p: pid('Cerveja garrafa').id, q: 48, custo: 699 }, { p: pid('Cachaça').id, q: 6, custo: 1490 }], total: 27744 + 33552 + 8940 },
  ];
  const perdas = [
    { id: uid('x'), data: `${somaDias(h, -2)}T20:10:00`, p: pid('Cerveja garrafa').id, q: 1, motivo: 'Quebrou', custo: 699, obs: 'Caiu da mesa 4' },
    { id: uid('x'), data: `${somaDias(h, -4)}T08:05:00`, p: pid('Pão francês').id, q: 0.8, motivo: 'Venceu', custo: 872, obs: '' },
    { id: uid('x'), data: `${somaDias(h, -9)}T15:30:00`, p: pid('Iogurte').id, q: 4, motivo: 'Venceu', custo: 756, obs: '' },
  ];
  const caixa = { aberto: true, ab: `${h}T07:02:00`, troco: 15000, movs: [{ id: uid('k'), t: 'sangria', v: 18000, m: 'Pagamento do pão', d: `${h}T07:40:00` }] };
  return {
    v: 1, demo: true,
    loja: { nome: 'Mercadinho São José', slogan: 'Mercearia e bar', tel: '16 99123-4455', cidade: 'Franca', pix: 'mercadinhosaojose@email.com', prazo: 30, limite: 20000, servico: 10, vendSemPrazo: false },
    usuarios: [{ id: 'u1', nome: 'Sérgio Andrade', perfil: 'dono', tel: '16 99123-4455', email: 'sergio@mercadinhosaojose.com', pin: '1234', perms: {} }, { id: 'u2', nome: 'Kátia Moreira', perfil: 'caixa', tel: '16 99288-1043', pin: '', perms: { caixa: true } }, { id: 'u3', nome: 'Rafael Lima', perfil: 'garcom', tel: '16 99307-5521', pin: '', perms: {} }], usuario: 'u1', meta: 0,
    atividades: [
      { data: `${somaDias(h, -2)}T20:12:00`, quem: 'Rafael Lima', txt: 'Perda: 1 Cerveja garrafa 600 ml (Quebrou)', tipo: 'perda' },
      { data: `${somaDias(h, -3)}T09:20:00`, quem: 'Sérgio Andrade', txt: 'Entrada da nota 118203 (Laticínios Serra Azul): R$ 225,48', tipo: 'entrada' },
      { data: `${somaDias(h, -4)}T19:05:00`, quem: 'Kátia Moreira', txt: 'Liberado com a senha do dono: fiado de Marquinhos (pedreiro) acima do limite', tipo: 'liberacao' },
      { data: `${somaDias(h, -5)}T08:40:00`, quem: 'Sérgio Andrade', txt: 'Preço da Cerveja lata 350 ml: R$ 4,99 → R$ 5,49', tipo: 'preco' },
    ],
    fornecedores: F, produtos, clientes, fiado, vendas, mesas, entradas, perdas, caixa, caixas: [], inventarios: [], pedidos: [], ajustes: [],
  };
}

// ------------------------------------------------------------------ dados
let db = null;
const novo = new URLSearchParams(location.search).has('novo');
try { db = novo ? null : JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { db = null; }
if (!db || !Array.isArray(db.produtos)) { db = window.veltriaConta ? vazio() : inicial(); if (db.demo) { const s30 = db.vendas.reduce((s, v) => s + v.total, 0); db.meta = Math.round((s30 / 28) * 30 * 1.15 / 100000) * 100000; } }
function vazio() { return { v: 1, loja: { nome: (window.veltriaConta && window.veltriaConta.empresa) || 'Meu comércio', slogan: '', tel: '', cidade: '', pix: '', prazo: 30, limite: 20000, servico: 10 }, usuarios: [{ id: 'u1', nome: 'Dono', perfil: 'dono', pin: '', perms: {} }], usuario: 'u1', meta: 0, atividades: [], fornecedores: [], produtos: [], clientes: [], fiado: [], vendas: [], mesas: [], entradas: [], perdas: [], caixa: { aberto: false, movs: [] }, caixas: [], inventarios: [], pedidos: [], ajustes: [] }; }
const grava = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch (e) { toast('Não consegui salvar neste aparelho (sem espaço). Faça uma cópia em Configurações.', true); } };
if (novo) { grava(); history.replaceState(null, '', location.pathname + location.hash); }
window.veltriaDados = () => db;

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
const baixos = () => comEstoque().filter((p) => p.q <= p.min).sort((a, b) => a.q / (a.min || 1) - b.q / (b.min || 1));
const lotesAtivos = () => ativos().flatMap((p) => (p.lotes || []).filter((l) => l.q > 0.0005 && l.val).map((l) => ({ ...l, p }))).sort((a, b) => a.val.localeCompare(b.val));
const vencendo = (n = 7) => lotesAtivos().filter((l) => dias(hoje(), l.val) <= n);
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
  relat: '<path d="M4 19h16M7 15v-3M12 15V8M17 15v-6"/>', xml: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13l-2 2 2 2M15 13l2 2-2 2"/>', subir: '<path d="M12 20V8M7 13l5-5 5 5M5 4h14"/>', pct: '<path d="M6 18L18 6"/><circle cx="7.5" cy="7.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/>',
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

// ------------------------------------------------------------------ câmera (leitor de código de barras do celular)
let fluxo = null, laco = 0;
function paraCamera() { cancelAnimationFrame(laco); if (fluxo) { fluxo.getTracks().forEach((x) => x.stop()); fluxo = null; } }
async function lerCamera(aoLer) {
  if (!('BarcodeDetector' in window) || !navigator.mediaDevices) { toast('Este navegador não lê código pela câmera. Use o leitor USB ou digite os números do código.', true); return; }
  const j = abrir(`${cab('Aponte para o código de barras', 'Segure firme, a uns 15 cm. Lê sozinho.')}<div class="cam"><video playsinline muted></video><span class="mira"></span></div><footer class="j-pe"><button type="button" class="bt" data-fechar>Fechar</button></footer>`);
  try {
    const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
    fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const v = $('video', j); v.srcObject = fluxo; await v.play();
    const passo = async () => { if (!fluxo) return; try { const r = await det.detect(v); if (r[0]) { const c = r[0].rawValue; if (navigator.vibrate) navigator.vibrate(60); fechar(); aoLer(c); return; } } catch (e) { /* quadro ainda carregando */ } laco = requestAnimationFrame(passo); };
    passo();
  } catch (e) { fechar(); toast('Não consegui abrir a câmera. Libere a câmera para este site e tente de novo.', true); }
}

// ------------------------------------------------------------------ marca e menu
function marca() {
  const h = new Date().getHours(), s = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  $('#saudacao').textContent = `${s}, ${db.loja.nome}`;
  const nv = vencendo(7).length, nf = devedores().filter((c) => contaFiado(c.id).atraso > 0).length, nc = baixos().length, nm = db.mesas.length;
  const n = (id, v) => { const e = $(id); e.hidden = !v; e.textContent = v; };
  n('#n-cozinha', naCozinha().filter((y) => y.x.cz !== 'pronto').length); n('#n-val', nv); n('#n-fiado', nf); n('#n-compras', nc); n('#n-mesas', nm);
  document.title = `${db.loja.nome} · Annona`;
  $('#lat-loja-ini').textContent = iniciais(db.loja.nome); $('#lat-loja-nome').textContent = db.loja.nome;
  const lc = $('#lat-caixa'); lc.textContent = db.caixa.aberto ? `Caixa aberto desde ${horaBR(db.caixa.ab)}` : 'Caixa fechado'; lc.classList.toggle('fechado', !db.caixa.aberto);
  $('#lat-eu-av').textContent = iniciais(eu().nome); $('#lat-eu-nome').textContent = eu().nome; $('#lat-eu-papel').textContent = PAPEL[eu().perfil] || '';
}

const TELAS = {};
// ------------------------------------------------------------------ equipe, permissões e registro do que aconteceu
const PERMS = [['custo', 'Ver custo e lucro'], ['desconto', 'Dar desconto'], ['fiado', 'Fiado acima do limite'], ['caixa', 'Abrir, sangrar e fechar o caixa'], ['estoque', 'Corrigir estoque e registrar perda'], ['entradas', 'Dar entrada e mudar preço'], ['relatorios', 'Ver relatórios']];
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
      <label class="toda">Abrir o sistema em<select name="abrir">${[['painel', 'Painel'], ['vender', 'Vender'], ['mesas', 'Mesas'], ['estoque', 'Estoque']].map(([k, n]) => `<option value="${k}"${(u.abrir || 'painel') === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
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
  abrir(`${cab('Pessoa na equipe', window.veltriaConta ? 'Na conta, ela recebe o convite e entra com o próprio login.' : 'Na demonstração, a pessoa fica só neste aparelho.')}<form class="form"><label>Nome<input name="nome" required></label><label>Função<select name="p"><option value="caixa">Caixa</option><option value="garcom">Garçom do bar</option><option value="repositor">Repositor</option></select></label><label>WhatsApp<input name="tel" inputmode="tel"></label><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Pôr na equipe</button></footer></form>`, (j) => {
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
      <div class="carrossel" id="carrossel">${top.map((x) => `<a class="vitrine" href="#estoque" data-prod-v="${x.p.id}">${foto(x.p, 'grande')}<b>${t(x.p.nome)}</b><small>${x.q ? `${x.p.un === 'kg' ? `${numBR(x.q, 1)} kg` : `${numBR(x.q, 0)} un`} vendid${x.p.un === 'kg' ? 'os' : 'as'}` : ''}${x.q && x.doses ? ' · ' : ''}${x.doses ? `${x.doses} doses` : ''}</small>${pode('custo') ? `<span class="lucro">↗ Lucro: ${din(x.l)}</span>` : ''}</a>`).join('') || '<p class="vazio">Ainda sem vendas.</p>'}</div></article>
    <article class="bloco"><header><h3>${ico('mesa')}Mesas abertas (bar)</h3><a class="seta-link" href="#mesas" aria-label="Ver mesas">${ico('seta')}</a></header>
      ${db.mesas.length ? `<ul class="mesas-mini">${db.mesas.map((m) => `<li><a href="#mesas/${m.id}"><span class="m-ico">${ico(m.nome === 'Balcão' ? 'taca' : 'mesa')}</span><span><b>${t(m.nome)}</b><small>${m.nome === 'Balcão' ? `${m.itens.length} itens` : `${m.pessoas} pessoa${m.pessoas === 1 ? '' : 's'}`} · desde ${horaBR(m.aberta)}</small></span><b>${din(totalMesa(m))}</b>${ico('seta')}</a></li>`).join('')}</ul>` : '<p class="vazio">Nenhuma mesa aberta.</p>'}
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
  const c = db.caixa;
  return c.aberto ? `<p class="caixa-linha">${ico('caixa')} Caixa aberto desde ${horaBR(c.ab)}. Dinheiro esperado na gaveta: <b>${din(resumoCaixa().esperado)}</b>. <a href="#caixa">Ver o caixa</a></p>` : `<p class="caixa-linha alerta">${ico('alerta')} O caixa está fechado. <a href="#caixa">Abrir o caixa</a></p>`;
}

// ------------------------------------------------------------------ vender (balcão)
// happy hour: preço por dia da semana e horário (ex.: cerveja de quinta e sexta, das 18h às 20h)
const hhAgora = (p) => { const h = p.hh; if (!h || !h.preco) return false; const d = new Date(), hm = d.toTimeString().slice(0, 5); return (h.dias || []).includes(d.getDay()) && hm >= h.de && hm < h.ate; };
const precoAgora = (p) => (hhAgora(p) ? p.hh.preco : p.preco);
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
      ${db.caixa.aberto ? '' : '<p class="aviso-mini">O caixa está fechado. Você pode vender; o dinheiro entra no próximo caixa aberto.</p>'}
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
function lerNoBalcao(txt) {
  const s = String(txt || '').trim(); if (!s) return;
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
          if (s.s === 'bloq') { toast(`${c.nome}: ${s.txt}. Só o dono libera em Fiado.`, true); return; }
          if (novoSaldo > c.limite) { const vv = v; liberar('fiado', `fiado de ${c.nome} acima do limite (${din(novoSaldo)} de ${din(c.limite)})`, () => { pag.push({ f, v: vv, cli: c.id }); pagar.reabre(); }); return; }
          segue();
        };
        $('#pg-cli-ok', j).addEventListener('click', ok); $('#pg-cli', j).focus(); return;
      }
      pag.push({ f, v }); ex.innerHTML = ''; desenha(j);
    }));
    $('#pg-fim', j).addEventListener('click', () => {
      const venda = { id: uid('v'), n: (db.vendas.at(-1) || { n: 0 }).n + 1, data: agora(), itens: itens.map((x) => ({ ...x })), total, desc, servico, pag: pag.map((x) => ({ ...x })), origem, mesa, vend: db.usuario };
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
  abrir(`${cab('Venda concluída', `Nº ${v.n} · ${din(v.total)}`)}<pre class="cupom">${t(txt)}</pre><footer class="j-pe"><button type="button" class="bt" data-imp>${ico('imp')}Imprimir</button>${cl && cl.tel ? `<a class="bt" target="_blank" rel="noopener" href="${zap(cl.tel, txt)}">${ico('zap')}Mandar no WhatsApp</a>` : ''}<button type="button" class="bt cheio" data-fechar>Nova venda</button></footer>`, (j) => {
    $('[data-imp]', j).addEventListener('click', () => imprimir(txt));
    if (db.loja.impAuto) imprimir(txt);
    setTimeout(() => $('[data-imp]', j).focus(), 40); // Enter imprime
  });
}

// ------------------------------------------------------------------ mesas e comandas do bar
const totalMesa = (m) => m.itens.reduce((s, x) => s + Math.round(x.q * x.preco), 0);
// cozinha: os pedidos das mesas chegam aqui (no aparelho da cozinha, chegam pela nuvem em até 30 segundos)
const naCozinha = () => db.mesas.flatMap((m) => m.itens.filter((x) => x.cz && x.cz !== 'entregue').map((x) => ({ m, x })));
const minutos = (iso) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
TELAS.cozinha = () => {
  const l = naCozinha(), col = (st, tit) => { const it = l.filter((y) => y.x.cz === st).sort((a, b) => a.x.h.localeCompare(b.x.h)); return `<section class="kds-col"><h3>${tit} <span class="selo">${it.length}</span></h3>${it.map(({ m, x }) => `<article class="kds ${st}${minutos(x.h) >= 20 && st !== 'pronto' ? ' atrasado' : ''}"><header><b>${t(m.nome)}</b><span>${minutos(x.h)} min</span></header><p class="kds-item">${numBR(x.q, 0)}× ${t(x.nome)}</p>${(x.adics || []).length ? `<p class="adic">+ ${t(x.adics.map((a) => a.n).join(', '))}</p>` : ''}${x.obs ? `<p class="obs">“${t(x.obs)}”</p>` : ''}<footer>${st === 'novo' ? `<button type="button" class="bt mini" data-cz="${m.id}:${x.id}:prep">Começar</button>` : ''}${st !== 'pronto' ? `<button type="button" class="bt mini verde" data-cz="${m.id}:${x.id}:pronto">Pronto</button>` : `<button type="button" class="bt mini" data-cz="${m.id}:${x.id}:entregue">Entregue</button>`}<button type="button" class="icone-bt" data-czimp="${m.id}:${x.id}" aria-label="Imprimir este pedido">${ico('imp')}</button></footer></article>`).join('') || '<p class="vazio">Nada aqui.</p>'}</section>`; };
  return `<section class="cab-tela"><div><h2>Cozinha</h2><p>Os pedidos das mesas chegam aqui na hora. Deixe esta tela aberta num celular ou tablet na cozinha; o garçom vê na mesa quando fica pronto.</p></div></section>
  <div class="kds-grade">${col('novo', 'Na fila')}${col('prep', 'Preparando')}${col('pronto', 'Pronto para levar')}</div>`;
};
TELAS.mesas = (id) => {
  const m = id && db.mesas.find((x) => x.id === id);
  if (m) return telaMesa(m);
  return `<section class="cab-tela"><div><h2>Mesas e comandas</h2><p>Cada mesa vai somando o que pede. A dose baixa a parte da garrafa no estoque quando a conta fecha.</p></div><button type="button" class="bt cheio" data-acao="nova-mesa">${ico('mais')}Abrir mesa</button></section>
  ${db.mesas.length ? `<section class="mesas">${db.mesas.map((x) => `<a class="mesa" href="#mesas/${x.id}"><span class="m-ico grande">${ico(x.nome === 'Balcão' ? 'taca' : 'mesa')}</span><b>${t(x.nome)}</b><small>${x.pessoas} pessoa${x.pessoas === 1 ? '' : 's'} · aberta às ${horaBR(x.aberta)}</small><span class="m-tot">${din(totalMesa(x))}</span><small>${x.itens.reduce((s, i) => s + i.q, 0)} itens</small></a>`).join('')}</section>` : '<p class="vazio grande">Nenhuma mesa aberta. Toque em Abrir mesa quando chegar alguém.</p>'}
  ${fechadasHoje()}`;
};
function fechadasHoje() {
  const l = vendasEntre(hoje(), hoje()).filter((v) => v.mesa).reverse();
  return l.length ? `<section class="bloco"><header><h3>Contas fechadas hoje</h3></header><table class="tab"><thead><tr><th>Mesa</th><th>Hora</th><th>Forma</th><th>Total</th></tr></thead><tbody>${l.map((v) => `<tr><td>${t(v.mesa)}</td><td>${horaBR(v.data)}</td><td>${v.pag.map((x) => FORMAS[x.f]).join(' + ')}</td><td>${din(v.total)}</td></tr>`).join('')}</tbody></table></section>` : '';
}
function telaMesa(m) {
  const tot = totalMesa(m), serv = Math.round(tot * (db.loja.servico || 0) / 100);
  return `<section class="cab-tela"><div><a class="voltar" href="#mesas">← Todas as mesas</a><h2>${t(m.nome)}</h2><p>${m.pessoas} pessoa${m.pessoas === 1 ? '' : 's'} · aberta às ${horaBR(m.aberta)}</p></div><div class="acoes"><button type="button" class="bt" data-acao="pessoas" data-id="${m.id}">Pessoas</button><button type="button" class="bt" data-acao="parcial" data-id="${m.id}">${ico('imp')}Conta parcial</button><button type="button" class="bt" data-acao="separar" data-id="${m.id}" ${m.itens.length ? '' : 'disabled'}>Separar a conta</button></div></section>
  <section class="pdv">
    <div class="pdv-esq">
      <form class="leitor" id="f-mesa" data-id="${m.id}" autocomplete="off"><span>${ico('busca')}</span><input id="leitor-mesa" placeholder="O que a mesa pediu? Nome ou código" aria-label="Produto pedido pela mesa"><button type="button" class="icone-bt" data-acao="camera-mesa" data-id="${m.id}" aria-label="Ler código pela câmera">${ico('cam')}</button></form>
      <div class="sugestoes" id="sugestoes"></div>
      <h3 class="mini-tit">Do bar</h3>
      <div class="rapidos">${ativos().filter((p) => p.cozinha || p.dose || /Cerveja|Bebidas|Petiscos/.test(p.cat)).sort((a, b) => (b.cozinha ? 1 : 0) - (a.cozinha ? 1 : 0)).slice(0, 16).map((p) => `<button type="button" class="rapido" data-mesa-por="${p.id}" data-id="${m.id}">${foto(p)}<b>${t(p.nome)}</b><span>${din(precoAgora(p))}</span>${hhAgora(p) ? '<i class="hh-on">happy hour agora</i>' : ''}${p.dose ? `<i>dose ${din(p.dose.preco)}</i>` : ''}</button>`).join('')}</div>
    </div>
    <aside class="pdv-dir bloco"><header><h3>${ico('mesa')}Comanda</h3></header>
      ${m.itens.length ? `<ul class="itens">${m.itens.map((x, i) => itemLinha(x, i, `mesa-${m.id}`)).join('')}</ul>` : '<p class="vazio">A comanda está vazia.</p>'}
      <dl class="soma"><div><dt>Consumo</dt><dd>${din(tot)}</dd></div>${serv ? `<div><dt>Serviço (${db.loja.servico}%, opcional)</dt><dd>${din(serv)}</dd></div>` : ''}<div class="total"><dt>Total</dt><dd>${din(tot + serv)}</dd></div>${m.pessoas > 1 ? `<div><dt>Por pessoa (${m.pessoas})</dt><dd>${din(Math.ceil((tot + serv) / m.pessoas))}</dd></div>` : ''}</dl>
      <div class="pdv-acoes">${m.itens.length ? '' : `<button type="button" class="bt" data-acao="cancelar-mesa" data-id="${m.id}">Cancelar mesa</button>`}<button type="button" class="bt cheio verde grande" data-acao="fechar-mesa" data-id="${m.id}" ${m.itens.length ? '' : 'disabled'}>Fechar a conta</button></div>
    </aside></section>`;
}
// cada pessoa marca o que consumiu e paga só aquilo; o resto continua na mesa
function separarConta(m) {
  const un = []; m.itens.forEach((x, i) => { const p = prod(x.p), kg = p && p.un === 'kg' && !x.dose; const n = kg ? 1 : Math.round(x.q); for (let k = 0; k < n; k++) un.push({ i, q: kg ? x.q : 1, x }); });
  abrir(`${cab(`Separar a conta da ${t(m.nome)}`, 'Marque o que esta pessoa consumiu')}<div class="form"><ul class="separa">${un.map((u, k) => `<li><label class="check"><input type="checkbox" data-u="${k}"> <span>${t(u.x.nome)}${u.x.obs ? ` <small>“${t(u.x.obs)}”</small>` : ''}</span><b>${din(Math.round(u.q * u.x.preco))}</b></label></li>`).join('')}</ul>
    <label class="check"><input type="checkbox" id="s-serv" ${db.loja.servico ? 'checked' : 'disabled'}> Cobrar serviço de ${db.loja.servico || 0}% desta parte</label>
    <p class="sep-tot" id="s-tot">Marcados: R$ 0,00</p><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio verde" id="s-ok" disabled>Receber os marcados</button></footer></div>`, (j) => {
    const sel = () => $$('[data-u]:checked', j).map((c) => un[Number(c.dataset.u)]);
    const att = () => { const s2 = sel(), tot = s2.reduce((a, u) => a + Math.round(u.q * u.x.preco), 0); $('#s-tot', j).innerHTML = `Marcados: <b>${din(tot)}</b> de ${din(totalMesa(m))}`; $('#s-ok', j).disabled = !s2.length; };
    j.addEventListener('change', att); att();
    $('#s-ok', j).addEventListener('click', () => {
      const s2 = sel(), por = {}; s2.forEach((u) => { (por[u.i] ||= { ...u.x, q: 0 }).q = r3(por[u.i].q + u.q); });
      const itens = Object.values(por), tot = itens.reduce((a, x) => a + Math.round(x.q * x.preco), 0), serv = $('#s-serv', j).checked ? Math.round(tot * (db.loja.servico || 0) / 100) : 0;
      fechar();
      pagar({ itens, servico: serv, titulo: `Parte da conta da ${m.nome}`, origem: 'mesa', mesa: `${m.nome} (parte)`, depois: () => {
        Object.keys(por).map(Number).sort((a, b) => b - a).forEach((i) => { m.itens[i].q = r3(m.itens[i].q - por[i].q); if (m.itens[i].q <= 0.0005) m.itens.splice(i, 1); });
        if (!m.itens.length) { db.mesas = db.mesas.filter((x) => x.id !== m.id); location.hash = '#mesas'; toast(`${m.nome} paga por completo.`); }
        grava(); mostra();
      } });
    });
  }, true);
}
// observação e adicionais de um item (vão para a cozinha e para a conta)
function obsItem(lista, i) {
  const x = lista[i], p = prod(x.p), ad = (p && p.adics) || [], tem = new Set((x.adics || []).map((a) => a.n));
  abrir(`${cab(t(x.nome), 'Observação e adicionais')}<form class="form"><label>Observação para a cozinha<input name="obs" value="${t(x.obs || '')}" placeholder="Sem cebola, bem passada, sem gelo…" maxlength="120"></label>
    ${ad.length ? `<p class="mini-tit">Adicionais</p>${ad.map((a, k) => `<label class="check"><input type="checkbox" name="a${k}" ${tem.has(a.n) ? 'checked' : ''}> ${t(a.n)}${a.v ? ` <b>+ ${din(a.v)}</b>` : ''}</label>`).join('')}` : '<p class="dica">Este produto não tem adicionais. Cadastre em Estoque, no produto.</p>'}
    <footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Salvar</button></footer></form>`, (j) => {
    $('form', j).addEventListener('submit', (e) => {
      e.preventDefault(); const f = e.target, base = x.base ?? x.preco;
      x.obs = f.obs.value.trim(); x.adics = ad.filter((a, k) => f[`a${k}`] && f[`a${k}`].checked); x.base = base; x.preco = base + x.adics.reduce((s2, a) => s2 + a.v, 0);
      grava(); fechar(); mostra();
    });
  });
}
function novaMesa() {
  const prox = (() => { for (let i = 1; i < 100; i++) if (!db.mesas.some((m) => m.nome === `Mesa ${i}`)) return `Mesa ${i}`; return 'Mesa'; })();
  abrir(`${cab('Abrir mesa')}<form class="form"><label>Nome da mesa ou da comanda<input name="nome" value="${prox}" required></label><label>Pessoas<input name="p" type="number" min="1" max="40" value="2"></label><p class="dica">Pode ser Mesa 7, Balcão, Comanda 15 ou o nome do cliente.</p><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Abrir</button></footer></form>`, (j) => {
    $('form', j).addEventListener('submit', (e) => { e.preventDefault(); const f = e.target, nome = f.nome.value.trim(); if (db.mesas.some((m) => sa(m.nome) === sa(nome))) { toast('Já existe uma mesa aberta com esse nome.', true); return; } const m = { id: uid('m'), nome, pessoas: Math.max(1, Number(f.p.value) || 1), aberta: agora(), itens: [] }; db.mesas.push(m); grava(); fechar(); location.hash = `#mesas/${m.id}`; });
  });
}
function fecharMesa(m, parcial = false) {
  const tot = totalMesa(m), serv = Math.round(tot * (db.loja.servico || 0) / 100);
  if (parcial) {
    const txt = `${db.loja.nome} · ${m.nome}\nConta parcial ${dataBR(agora())} ${horaBR(agora())}\n\n${m.itens.map((x) => `${numBR(x.q)} ${x.nome} ${din(Math.round(x.q * x.preco))}`).join('\n')}\n\nConsumo ${din(tot)}${serv ? `\nServiço ${db.loja.servico}% (opcional) ${din(serv)}` : ''}\nTotal ${din(tot + serv)}${m.pessoas > 1 ? `\nPor pessoa ${din(Math.ceil((tot + serv) / m.pessoas))}` : ''}`;
    abrir(`${cab('Conta parcial', t(m.nome))}<pre class="cupom">${t(txt)}</pre><footer class="j-pe"><button type="button" class="bt cheio" data-fechar>Ok</button></footer>`); return;
  }
  abrir(`${cab(`Fechar ${t(m.nome)}`)}<div class="form"><label class="check"><input type="checkbox" id="c-serv" ${serv ? 'checked' : ''} ${db.loja.servico ? '' : 'disabled'}> Cobrar serviço de ${db.loja.servico || 0}% (${din(serv)})</label><p class="dica">O serviço é opcional para o cliente.</p><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio verde" data-seg>Ir para o pagamento</button></footer></div>`, (j) => {
    $('[data-seg]', j).addEventListener('click', () => {
      const s = $('#c-serv', j).checked ? serv : 0; fechar();
      pagar({ itens: m.itens, servico: s, titulo: `Conta da ${m.nome}`, origem: 'mesa', mesa: m.nome, depois: () => { db.mesas = db.mesas.filter((x) => x.id !== m.id); grava(); location.hash = '#mesas'; } });
    });
  });
}

// ------------------------------------------------------------------ estoque
TELAS.estoque = () => {
  const f = sa(estado.filtro), c = estado.cat;
  const l = ativos().filter((p) => (!c || (c === '_baixo' ? p.q <= p.min : p.cat === c)) && (!f || sa(p.nome).includes(f) || p.cod.includes(estado.filtro.trim()))).sort((a, b) => a.cat.localeCompare(b.cat) || a.nome.localeCompare(b.nome));
  const nBaixo = baixos().length;
  return `<section class="cab-tela"><div><h2>Estoque</h2><p>${ativos().length} produtos · ${din(valorEstoque())} em mercadoria pelo custo.</p></div><div class="acoes"><button type="button" class="bt" data-acao="exportar-estoque">Planilha</button><button type="button" class="bt" data-acao="importar">Importar planilha</button><button type="button" class="bt cheio" data-acao="novo-produto">${ico('mais')}Novo produto</button></div></section>
  <form class="leitor" id="f-busca-est" autocomplete="off"><span>${ico('busca')}</span><input id="busca-est" value="${t(estado.filtro)}" placeholder="Buscar pelo nome ou passar o código" aria-label="Buscar produto"><button type="button" class="icone-bt" data-acao="camera-estoque" aria-label="Ler código pela câmera">${ico('cam')}</button></form>
  <div class="chips"><button type="button" class="chip${!c ? ' on' : ''}" data-cat="">Todos</button><button type="button" class="chip alerta${c === '_baixo' ? ' on' : ''}" data-cat="_baixo">Abaixo do mínimo (${nBaixo})</button>${cats().map((x) => `<button type="button" class="chip${c === x ? ' on' : ''}" data-cat="${t(x)}">${t(x)}</button>`).join('')}</div>
  <section class="bloco sem-pad"><table class="tab grande"><thead><tr><th>Produto</th><th>Estoque</th><th class="so-pc">Mínimo</th><th class="so-pc">Custo</th><th>Preço</th><th class="so-pc">Margem</th><th class="so-pc">Validade mais próxima</th></tr></thead><tbody>
  ${l.map((p) => { const s = situ(p), lv = (p.lotes || []).filter((x) => x.val).sort((a, b) => a.val.localeCompare(b.val))[0]; return `<tr class="clica" data-prod="${p.id}"><td><span class="com-foto">${foto(p, 'mini')}<span><b>${t(p.nome)}</b><small class="cod">${t(p.cat)} · ${t(p.cod)}${p.dose ? ` · dose ${p.dose.doseMl} ml` : ''}</small></span></span></td><td><span class="tag ${s === 'ok' ? 'verde' : s === 'baixo' ? 'ambar' : 'verm'}">${qtdTxt(p)}</span></td><td class="so-pc">${qtdTxt(p, p.min)}</td><td class="so-pc">${din(p.custo)}</td><td>${din(p.preco)}${p.un === 'kg' ? '/kg' : ''}${p.dose ? `<small class="cod">dose ${din(p.dose.preco)}</small>` : ''}${p.hh ? `<small class="cod hh-txt">${t(hhTxt(p))}</small>` : ''}</td><td class="so-pc">${margem(p.preco, p.custo).toLocaleString('pt-BR')}%</td><td class="so-pc">${lv ? `<span class="tag ${dias(hoje(), lv.val) <= 7 ? 'ambar' : 'cinza'}">${dataBR(lv.val)}</span>` : '<span class="mudo">—</span>'}</td></tr>`; }).join('') || '<tr><td colspan="7" class="vazio">Nenhum produto encontrado.</td></tr>'}
  </tbody></table></section>`;
};
function formProduto(base = {}) {
  const p = base.id ? base : { nome: '', cat: '', un: 'un', custo: 0, preco: 0, q: 0, min: 0, forn: '', cod: '', ...base };
  const ed = !!p.id;
  abrir(`${cab(ed ? t(p.nome) : 'Novo produto', ed ? `Estoque: ${qtdTxt(p)}` : '')}<form class="form duas" id="f-prod">
    <label class="toda">Nome do produto<input name="nome" value="${t(p.nome)}" required placeholder="Cerveja lata 350 ml"></label>
    <label>Código de barras<span class="com-bt"><input name="cod" value="${t(p.cod)}" inputmode="numeric" placeholder="Passe no leitor"><button type="button" class="icone-bt" data-cam aria-label="Ler pela câmera">${ico('cam')}</button></span></label>
    <label>Categoria<input name="cat" value="${t(p.cat)}" list="dl-cat" placeholder="Mercearia"></label>
    <label>Vendido por<select name="un"><option value="un"${p.un === 'un' ? ' selected' : ''}>Unidade</option><option value="kg"${p.un === 'kg' ? ' selected' : ''}>Quilo (balança)</option><option value="cx"${p.un === 'cx' ? ' selected' : ''}>Caixa</option><option value="gf"${p.un === 'gf' ? ' selected' : ''}>Garrafa (vende dose)</option></select></label>
    <label>Fornecedor<select name="forn"><option value="">—</option>${db.fornecedores.map((f) => `<option value="${f.id}"${p.forn === f.id ? ' selected' : ''}>${t(f.nome)}</option>`).join('')}</select></label>
    <label>Custo (R$)<input name="custo" value="${campoDin(p.custo)}" inputmode="decimal" placeholder="0,00"></label>
    <label>Preço de venda (R$)<input name="preco" value="${campoDin(p.preco)}" inputmode="decimal" required placeholder="0,00"></label>
    <p class="toda margem" id="mg"></p>
    ${ed ? '' : '<label>Estoque agora<input name="q" inputmode="decimal" value="0"></label>'}
    <label>Estoque mínimo<input name="min" inputmode="decimal" value="${numBR(p.min)}"></label>
    <fieldset class="toda extras"><legend>Bar e cozinha</legend>
      <label class="check"><input type="checkbox" name="semEstoque" ${p.semEstoque ? 'checked' : ''}> Feito na hora (porção, lanche): não controla estoque</label>
      <label class="check"><input type="checkbox" name="cozinha" ${p.cozinha ? 'checked' : ''}> Pedido vai para a tela da Cozinha</label>
      <label>Adicionais, um por linha (nome = preço)<textarea name="adics" rows="3" placeholder="Cheddar e bacon = 9,00&#10;Trocar por mandioca = 0">${t((p.adics || []).map((a) => `${a.n} = ${campoDin(a.v) || '0'}`).join('\n'))}</textarea></label>
      <div class="hh"><label>Happy hour: preço (R$)<input name="hhp" inputmode="decimal" value="${p.hh ? campoDin(p.hh.preco) : ''}" placeholder="vazio = sem happy hour"></label><label>Das<input name="hhde" type="time" value="${p.hh ? p.hh.de : '18:00'}"></label><label>Às<input name="hhate" type="time" value="${p.hh ? p.hh.ate : '20:00'}"></label>
      <div class="dias-hh">${DIAS.map((d, k) => `<label class="check"><input type="checkbox" name="hhd${k}" ${p.hh && p.hh.dias.includes(k) ? 'checked' : ''}> ${d}</label>`).join('')}</div></div></fieldset>
    <fieldset class="toda dose" ${p.un === 'gf' ? '' : 'hidden'}><legend>Dose (bebida vendida aberta)</legend><label>Garrafa tem (ml)<input name="ml" inputmode="numeric" value="${p.dose ? p.dose.ml : 1000}"></label><label>Cada dose (ml)<input name="dml" inputmode="numeric" value="${p.dose ? p.dose.doseMl : 50}"></label><label>Preço da dose (R$)<input name="dpreco" inputmode="decimal" value="${p.dose ? campoDin(p.dose.preco) : ''}"></label><p class="dica toda" id="dose-info"></p></fieldset>
    <footer class="j-pe toda">${ed ? `<button type="button" class="bt perigo" data-arq>Tirar de linha</button><button type="button" class="bt" data-ajuste>Corrigir estoque</button>` : ''}<button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Salvar</button></footer>
  </form><datalist id="dl-cat">${cats().map((c) => `<option value="${t(c)}">`).join('')}</datalist>`, (j) => {
    const f = $('form', j);
    const conta = () => {
      const c = lerDin(f.custo.value), pr = lerDin(f.preco.value); $('#mg', j).innerHTML = pr ? `Margem de <b>${margem(pr, c).toLocaleString('pt-BR')}%</b> · lucro de ${din(pr - c)} por ${f.un.value === 'kg' ? 'kg' : f.un.value === 'gf' ? 'garrafa' : 'unidade'}` : '';
      $('.dose', j).hidden = f.un.value !== 'gf';
      if (f.un.value === 'gf') { const ml = lerNum(f.ml.value) || 1, d = lerNum(f.dml.value) || 1, dp = lerDin(f.dpreco.value), n = Math.floor(ml / d); $('#dose-info', j).textContent = `Rende ${n} doses. Vendendo tudo em dose: ${din(n * dp)} (a garrafa custou ${din(c)}). Custo de cada dose: ${din(Math.round(c * d / ml))}.`; }
    };
    f.addEventListener('input', conta); conta();
    $('[data-cam]', j).addEventListener('click', () => { const salvo = Object.fromEntries(new FormData(f)); lerCamera((cod) => formProduto({ ...p, ...lerForm(salvo), cod })); });
    if (ed) { $('[data-arq]', j).addEventListener('click', () => confirmar('Tirar de linha', `${t(p.nome)} sai das listas e da venda. O histórico continua nos relatórios.`, 'Tirar de linha', () => { p.arq = true; grava(); mostra(); toast('Produto tirado de linha.'); }, true)); $('[data-ajuste]', j).addEventListener('click', () => liberar('estoque', `corrigir o estoque de ${p.nome}`, () => ajusteEstoque(p))); }
    f.addEventListener('submit', (e) => {
      e.preventDefault(); const d = lerForm(Object.fromEntries(new FormData(f)));
      if (d.cod && db.produtos.some((x) => x.cod === d.cod && x.id !== p.id && !x.arq)) { toast('Já existe outro produto com esse código de barras.', true); return; }
      if (d.preco <= 0) { toast('Digite o preço de venda.', true); return; }
      if (ed && d.preco !== p.preco) registra(`Preço de ${p.nome}: ${din(p.preco)} → ${din(d.preco)}`, 'preco');
      if (ed && d.preco !== p.preco && !pode('entradas')) { liberar('entradas', `mudar o preço de ${p.nome}`, () => { Object.assign(p, d); if (!d.dose) delete p.dose; grava(); mostra(); toast('Produto salvo.'); }); return; }
      if (ed) Object.assign(p, d); else { const n = { id: uid('p'), ...d, cod: d.cod || ean13(`2${String(Date.now()).slice(-11)}`), lotes: [], criado: hoje() }; db.produtos.push(n); }
      if (!d.dose) delete p.dose;
      if (!d.hh) delete p.hh;
      grava(); fechar(); mostra(); toast(ed ? 'Produto salvo.' : 'Produto cadastrado. Para ele ter estoque com validade, dê entrada pela nota.');
    });
  });
}
function lerForm(o) {
  const d = { nome: String(o.nome || '').trim(), cod: String(o.cod || '').trim(), cat: String(o.cat || '').trim() || 'Outros', un: o.un || 'un', forn: o.forn || '', custo: lerDin(o.custo), preco: lerDin(o.preco), min: lerNum(o.min) };
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
function receber(c) {
  const k = contaFiado(c.id);
  abrir(`${cab(`Receber de ${t(c.nome)}`, `Deve ${din(k.saldo)}`)}<form class="form"><label>Valor recebido (R$)<input name="v" value="${campoDin(k.saldo)}" inputmode="decimal" required></label><label>Forma<select name="f"><option value="dinheiro">Dinheiro</option><option value="pix">Pix</option><option value="debito">Débito</option><option value="credito">Crédito</option></select></label><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio verde">Receber</button></footer></form>`, (j) => {
    $('form', j).addEventListener('submit', (e) => {
      e.preventDefault(); const v = Math.min(lerDin(e.target.v.value), k.saldo), fm = e.target.f.value; if (v <= 0) { toast('Digite o valor.', true); return; }
      db.fiado.push({ id: uid('f'), cli: c.id, data: agora(), tipo: 'pag', v, obs: FORMAS[fm], forma: fm }); registra(`${c.nome} pagou ${din(v)} do fiado (${FORMAS[fm]})`, 'fiado'); grava(); fechar(); mostra();
      const resta = contaFiado(c.id).saldo, msg = `Oi, ${c.nome.split(' ')[0]}! Recebemos ${din(v)} aqui no ${db.loja.nome}. ${resta ? `Ficou em aberto ${din(resta)}.` : 'Sua conta está quitada. Obrigado!'}`;
      abrir(`${cab('Recebido', din(v))}<p class="j-txt">${resta ? `Ainda deve ${din(resta)}.` : 'Conta quitada.'}</p><footer class="j-pe">${c.tel ? `<a class="bt" target="_blank" rel="noopener" href="${zap(c.tel, msg)}">${ico('zap')}Mandar o recibo no WhatsApp</a>` : ''}<button type="button" class="bt cheio" data-fechar>Ok</button></footer>`);
    });
  });
}

// ------------------------------------------------------------------ compras (lista automática do que está abaixo do mínimo)
TELAS.compras = () => {
  const l = baixos(), por = {};
  l.forEach((p) => { const k = p.forn || '_'; (por[k] ||= []).push(p); });
  const sug = (p) => (p.un === 'kg' ? r3(Math.max(p.min * 2 - p.q, p.min)) : Math.max(1, Math.ceil(p.min * 2 - p.q)));
  return `<section class="cab-tela"><div><h2>Lista de compras</h2><p>O que está no mínimo ou abaixo, separado por fornecedor. A quantidade sugerida leva o estoque ao dobro do mínimo; mude se quiser.</p></div></section>
  ${Object.entries(por).map(([fid, ps]) => { const f = forn(fid); const tot = ps.reduce((s, p) => s + Math.round(sug(p) * p.custo), 0); return `<section class="bloco sem-pad"><header class="pad"><h3>${t(f ? f.nome : 'Sem fornecedor')}</h3>${f && f.prazo ? `<span class="selo">${t(f.prazo)}</span>` : ''}</header><table class="tab grande" data-forn="${fid}"><thead><tr><th>Produto</th><th>Tem</th><th>Mínimo</th><th>Pedir</th><th class="so-pc">Custo estimado</th></tr></thead><tbody>${ps.map((p) => `<tr><td><span class="com-foto">${foto(p, 'mini')}<b>${t(p.nome)}</b></span></td><td><span class="tag ${p.q <= 0 ? 'verm' : 'ambar'}">${qtdTxt(p)}</span></td><td>${qtdTxt(p, p.min)}</td><td><input class="mini-in" data-ped="${p.id}" inputmode="decimal" value="${numBR(sug(p))}" aria-label="Quantidade a pedir de ${t(p.nome)}"></td><td class="so-pc">${din(Math.round(sug(p) * p.custo))}</td></tr>`).join('')}</tbody></table><footer class="pad acoes-l"><span class="mudo">Estimado: ${din(tot)}</span>${f && f.tel ? `<button type="button" class="bt" data-pedir="${fid}">${ico('zap')}Mandar pedido no WhatsApp</button>` : '<span class="mudo">Cadastre o WhatsApp do fornecedor para mandar o pedido.</span>'}</footer></section>`; }).join('') || '<p class="vazio grande">Tudo acima do mínimo. Nada para comprar agora.</p>'}
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
    <section class="bloco"><form class="form" id="f-inv"><label>O que contar<select name="cat"><option value="">Tudo</option>${cats().map((c) => `<option>${t(c)}</option>`).join('')}</select></label><button class="bt cheio">Começar a contagem</button></form>${ult ? `<p class="dica">Último inventário: ${dataBR(ult.data)}, ${ult.itens.length} produtos, diferença de ${din(ult.dif)} pelo custo.</p>` : ''}</section>`;
  }
  const l = iv.itens.map((x) => ({ ...x, p: prod(x.p) })).filter((x) => x.p), feitos = l.filter((x) => x.c !== null).length;
  return `<section class="cab-tela"><div><h2>Contando: ${t(iv.cat || 'todo o estoque')}</h2><p>${feitos} de ${l.length} contados.</p></div><div class="acoes"><button type="button" class="bt" data-acao="inv-cancelar">Cancelar</button><button type="button" class="bt cheio" data-acao="inv-fim">Terminar e ver diferenças</button></div></section>
  <form class="leitor" id="f-inv-cod" autocomplete="off"><span>${ico('busca')}</span><input id="inv-cod" placeholder="Passe o código: cada leitura soma 1"><button type="button" class="icone-bt" data-acao="camera-inv" aria-label="Ler pela câmera">${ico('cam')}</button></form>
  <section class="bloco sem-pad"><table class="tab grande"><thead><tr><th>Produto</th><th>Contei</th><th class="so-pc">Sistema diz</th></tr></thead><tbody>${l.map((x) => `<tr${x.c !== null ? ' class="feito"' : ''}><td><b>${t(x.p.nome)}</b><small class="cod">${t(x.p.cod)}</small></td><td><input class="mini-in" data-conta="${x.p.id}" inputmode="decimal" value="${x.c === null ? '' : numBR(x.c)}" placeholder="—" aria-label="Contagem de ${t(x.p.nome)}"></td><td class="so-pc">${qtdTxt(x.p)}</td></tr>`).join('')}</tbody></table></section>`;
};
function fimInventario() {
  const iv = estado.invent, l = iv.itens.filter((x) => x.c !== null).map((x) => ({ ...x, p: prod(x.p) })).filter((x) => x.p).map((x) => ({ ...x, dif: r3(x.c - x.p.q) })).filter((x) => Math.abs(x.dif) > 0.0005);
  const val = l.reduce((s, x) => s + Math.round(x.dif * x.p.custo), 0);
  abrir(`${cab('Diferenças do inventário', `${l.length} produto${l.length === 1 ? '' : 's'} diferente${l.length === 1 ? '' : 's'} · ${val < 0 ? 'faltou' : 'sobrou'} ${din(Math.abs(val))} pelo custo`)}${l.length ? `<table class="tab"><thead><tr><th>Produto</th><th>Sistema</th><th>Contei</th><th>Diferença</th></tr></thead><tbody>${l.map((x) => `<tr><td>${t(x.p.nome)}</td><td>${qtdTxt(x.p)}</td><td>${qtdTxt(x.p, x.c)}</td><td class="${x.dif < 0 ? 'verm-txt' : 'ok-txt'}">${x.dif > 0 ? '+' : ''}${numBR(x.dif)}</td></tr>`).join('')}</tbody></table>` : '<p class="j-txt">Tudo bateu com o sistema.</p>'}<footer class="j-pe"><button type="button" class="bt" data-fechar>Continuar contando</button><button type="button" class="bt cheio" data-ok>Corrigir o estoque</button></footer>`, (j) => {
    $('[data-ok]', j).addEventListener('click', () => {
      l.forEach((x) => registraAjuste(x.p, x.dif, 'Ajuste de inventário', 'Inventário'));
      db.inventarios.push({ id: uid('i'), data: hoje(), cat: iv.cat, itens: iv.itens.filter((x) => x.c !== null), dif: val }); estado.invent = null; grava(); fechar(); mostra(); toast('Estoque corrigido pelo inventário.');
    });
  }, true);
}

// ------------------------------------------------------------------ caixa do dia
function resumoCaixa(c = db.caixa) {
  const de = c.ab || agora(), ate = c.fe || '9999', vs = db.vendas.filter((v) => !v.cancelada && v.data >= de && v.data <= ate), por = {};
  vs.forEach((v) => v.pag.forEach((p) => { por[p.f] = (por[p.f] || 0) + p.v; }));
  const receb = db.fiado.filter((f) => f.tipo === 'pag' && f.data >= de && f.data <= ate), rDin = receb.filter((f) => (f.forma || 'dinheiro') === 'dinheiro').reduce((s, f) => s + f.v, 0);
  const san = (c.movs || []).filter((m) => m.t === 'sangria').reduce((s, m) => s + m.v, 0), sup = (c.movs || []).filter((m) => m.t === 'suprimento').reduce((s, m) => s + m.v, 0);
  return { vs, por, rDin, receb: receb.reduce((s, f) => s + f.v, 0), san, sup, esperado: (c.troco || 0) + (por.dinheiro || 0) + rDin + sup - san, total: vs.reduce((s, v) => s + v.total, 0) };
}
TELAS.caixa = () => {
  const c = db.caixa;
  if (!c.aberto) return `<section class="cab-tela"><div><h2>Caixa do dia</h2><p>O caixa está fechado.</p></div></section><section class="bloco"><form class="form" id="f-abre"><label>Troco na gaveta para começar (R$)<input name="troco" inputmode="decimal" value="150,00"></label><button class="bt cheio verde">Abrir o caixa</button></form></section>${historicoCaixa()}`;
  const r = resumoCaixa();
  return `<section class="cab-tela"><div><h2>Caixa do dia</h2><p>Aberto às ${horaBR(c.ab)} de ${dataBR(c.ab)} com ${din(c.troco)} de troco.</p></div><div class="acoes"><button type="button" class="bt" data-acao="sangria">Sangria</button><button type="button" class="bt" data-acao="suprimento">Suprimento</button><button type="button" class="bt cheio" data-acao="fechar-caixa">Fechar o caixa</button></div></section>
  <section class="cartoes">${Object.entries(FORMAS).map(([k, n]) => `<div class="cartao"><div><small>${n}</small><b>${din(r.por[k] || 0)}</b></div></div>`).join('')}<div class="cartao ouro-borda"><div><small>Fiado recebido</small><b>${din(r.receb)}</b></div></div></section>
  <section class="bloco"><dl class="soma larga"><div><dt>Troco inicial</dt><dd>${din(c.troco)}</dd></div><div><dt>Vendas em dinheiro</dt><dd>${din(r.por.dinheiro || 0)}</dd></div><div><dt>Fiado recebido em dinheiro</dt><dd>${din(r.rDin)}</dd></div><div><dt>Suprimentos</dt><dd>${din(r.sup)}</dd></div><div><dt>Sangrias</dt><dd>− ${din(r.san)}</dd></div><div class="total"><dt>Dinheiro que deve ter na gaveta</dt><dd>${din(r.esperado)}</dd></div></dl>
  ${(c.movs || []).length ? `<ul class="lista-simples">${c.movs.map((m) => `<li><b>${m.t === 'sangria' ? 'Sangria' : 'Suprimento'}</b><span>${horaBR(m.d)} · ${t(m.m || '')}</span><b>${din(m.v)}</b></li>`).join('')}</ul>` : ''}</section>${historicoCaixa()}`;
};
function historicoCaixa() {
  return db.caixas.length ? `<section class="bloco sem-pad"><header class="pad"><h3>Caixas fechados</h3></header><table class="tab grande"><thead><tr><th>Dia</th><th>Vendas</th><th>Esperado</th><th>Contado</th><th>Diferença</th></tr></thead><tbody>${[...db.caixas].reverse().slice(0, 15).map((x) => `<tr><td>${dataBR(x.ab)}</td><td>${din(x.total)}</td><td>${din(x.esperado)}</td><td>${din(x.contado)}</td><td class="${x.contado - x.esperado < 0 ? 'verm-txt' : x.contado - x.esperado > 0 ? 'ok-txt' : ''}">${din(x.contado - x.esperado)}</td></tr>`).join('')}</tbody></table></section>` : '';
}
function movCaixa(tipo) {
  abrir(`${cab(tipo === 'sangria' ? 'Sangria (tirar dinheiro da gaveta)' : 'Suprimento (pôr dinheiro na gaveta)')}<form class="form"><label>Valor (R$)<input name="v" inputmode="decimal" required></label><label>Motivo<input name="m" placeholder="${tipo === 'sangria' ? 'Pagamento do pão' : 'Troco'}"></label><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Registrar</button></footer></form>`, (j) => {
    $('form', j).addEventListener('submit', (e) => { e.preventDefault(); const v = lerDin(e.target.v.value); if (v <= 0) { toast('Digite o valor.', true); return; } db.caixa.movs.push({ id: uid('k'), t: tipo, v, m: e.target.m.value.trim(), d: agora() }); registra(`${tipo === 'sangria' ? 'Sangria' : 'Suprimento'} de ${din(v)}${e.target.m.value.trim() ? ` (${e.target.m.value.trim()})` : ''}`, 'caixa'); grava(); fechar(); mostra(); });
  });
}
function fecharCaixa() {
  const r = resumoCaixa();
  abrir(`${cab('Fechar o caixa', `Deve ter ${din(r.esperado)} em dinheiro na gaveta`)}<form class="form"><label>Quanto você contou na gaveta (R$)<input name="c" inputmode="decimal" required></label><p class="mudo" id="dif"></p><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Fechar o caixa</button></footer></form>`, (j) => {
    const f = $('form', j); f.c.addEventListener('input', () => { const d = lerDin(f.c.value) - r.esperado; $('#dif', j).textContent = !f.c.value ? '' : d === 0 ? 'Bateu certinho.' : d < 0 ? `Faltando ${din(-d)}.` : `Sobrando ${din(d)}.`; });
    f.addEventListener('submit', (e) => { e.preventDefault(); const c = db.caixa; c.fe = agora(); db.caixas.push({ ab: c.ab, fe: c.fe, troco: c.troco, movs: c.movs, esperado: r.esperado, contado: lerDin(f.c.value), total: r.total, por: r.por }); db.caixa = { aberto: false, movs: [] }; registra(`Caixa fechado: esperado ${din(r.esperado)}, contado ${din(lerDin(f.c.value))}`, 'caixa'); grava(); fechar(); mostra(); toast('Caixa fechado.'); });
  });
}

// ------------------------------------------------------------------ relatórios
TELAS.relatorios = () => {
  if (!pode('relatorios')) return `<section class="cab-tela"><div><h2>Relatórios</h2><p>Os relatórios são do dono. Peça para ele liberar no Painel do dono.</p></div></section>`;
  const k = estado.rel, [de, ate] = periodo(k), vs = vendasEntre(de, ate), tot = vs.reduce((s, v) => s + v.total, 0), cus = vs.reduce((s, v) => s + custoVenda(v), 0), luc = tot - cus;
  const perd = db.perdas.filter((x) => x.data.slice(0, 10) >= de && x.data.slice(0, 10) <= ate).reduce((s, x) => s + x.custo, 0);
  const por = {}; vs.forEach((v) => v.itens.forEach((x) => { const n = x.dose ? x.nome : (prod(x.p) || {}).nome || x.nome; por[n] ||= { q: 0, v: 0, c: 0, dose: x.dose, kg: (prod(x.p) || {}).un === 'kg' }; por[n].q += x.q; por[n].v += Math.round(x.q * x.preco); por[n].c += Math.round(x.q * x.custo); }));
  const linhas = Object.entries(por).map(([n, x]) => ({ n, ...x, l: x.v - x.c })).sort((a, b) => b.l - a.l);
  let acum = 0; const totL = linhas.reduce((s, x) => s + Math.max(0, x.l), 0) || 1; linhas.forEach((x) => { acum += Math.max(0, x.l); x.abc = acum / totL <= 0.8 ? 'A' : acum / totL <= 0.95 ? 'B' : 'C'; });
  const fp = {}; vs.forEach((v) => v.pag.forEach((p) => { fp[p.f] = (fp[p.f] || 0) + p.v; }));
  const hrs = Array(24).fill(0); vs.forEach((v) => { hrs[Number(v.data.slice(11, 13))] += v.total; }); const maxH = Math.max(...hrs, 1);
  const bar = vs.filter((v) => v.origem === 'mesa').reduce((s, v) => s + v.total, 0);
  return `<section class="cab-tela"><div><h2>Relatórios</h2><p>${dataBR(de)} a ${dataBR(ate)} · ${vs.length} vendas</p></div><div class="acoes"><button type="button" class="bt" data-acao="exportar-rel">Planilha</button></div></section>
  <div class="chips">${[['hoje', 'Hoje'], ['7', '7 dias'], ['30', '30 dias'], ['mes', 'Este mês']].map(([v, n]) => `<button type="button" class="chip${k === v ? ' on' : ''}" data-rel="${v}">${n}</button>`).join('')}</div>
  <section class="cartoes"><div class="cartao"><div><small>Vendas</small><b>${din(tot)}</b><span class="var">ticket médio ${din(vs.length ? Math.round(tot / vs.length) : 0)}</span></div></div><div class="cartao"><div><small>Lucro bruto</small><b>${din(luc)}</b><span class="var sobe">margem ${margem(tot, cus).toLocaleString('pt-BR')}%</span></div></div><div class="cartao"><div><small>Perdas e quebras</small><b>${din(perd)}</b><span class="var desce">lucro sem perdas: ${din(luc - perd)}</span></div></div><div class="cartao"><div><small>Bar (mesas)</small><b>${din(bar)}</b><span class="var">balcão ${din(tot - bar)}</span></div></div></section>
  <section class="grade2"><article class="bloco"><header><h3>Por forma de pagamento</h3></header><ul class="formas-rel">${Object.entries(FORMAS).map(([f, n]) => `<li><span>${n}</span><span class="medidor"><i style="width:${tot ? Math.round(((fp[f] || 0) / tot) * 100) : 0}%"></i></span><b>${din(fp[f] || 0)}</b></li>`).join('')}</ul></article>
  <article class="bloco"><header><h3>Vendas por hora</h3></header><div class="barras horas">${hrs.map((v, i) => (i >= 6 ? `<div class="b-col"><span class="b-bar" style="height:${Math.max(2, Math.round((v / maxH) * 100))}%" title="${pad(i)}h: ${din(v)}"></span><span class="b-dia">${i % 3 === 0 ? `${i}h` : ''}</span></div>` : '')).join('')}</div></article></section>
  <section class="bloco sem-pad"><header class="pad"><h3>Lucro por produto</h3><span class="selo">A = os que fazem 80% do lucro</span></header><table class="tab grande"><thead><tr><th>Produto</th><th>Vendido</th><th>Faturou</th><th>Lucro</th><th class="so-pc">Margem</th><th class="so-pc">Curva</th></tr></thead><tbody>${linhas.slice(0, 60).map((x) => `<tr><td>${t(x.n)}</td><td>${x.kg ? `${numBR(x.q)} kg` : numBR(x.q, 0)}</td><td>${din(x.v)}</td><td><b>${din(x.l)}</b></td><td class="so-pc">${margem(x.v, x.c).toLocaleString('pt-BR')}%</td><td class="so-pc"><span class="tag ${x.abc === 'A' ? 'verde' : x.abc === 'B' ? 'ambar' : 'cinza'}">${x.abc}</span></td></tr>`).join('') || '<tr><td colspan="6" class="vazio">Sem vendas no período.</td></tr>'}</tbody></table></section>`;
};

// ------------------------------------------------------------------ configurações e guia
TELAS.config = () => `<section class="cab-tela"><div><h2>Configurações</h2><p>Dados do comércio, fiado, serviço do bar e cópia dos dados.</p></div></section>
  <section class="bloco"><form class="form duas" id="f-loja">
    <label>Nome do comércio<input name="nome" value="${t(db.loja.nome)}" required></label><label>Frase curta<input name="slogan" value="${t(db.loja.slogan)}"></label>
    <label>WhatsApp do comércio<input name="tel" value="${t(db.loja.tel)}" inputmode="tel"></label><label>Cidade<input name="cidade" value="${t(db.loja.cidade)}"></label>
    <label class="toda">Chave Pix (aparece no QR da venda e na cobrança do fiado)<input name="pix" value="${t(db.loja.pix)}" placeholder="CPF, CNPJ, celular, e-mail ou chave aleatória"></label>
    <label>Prazo do fiado (dias)<input name="prazo" type="number" min="1" max="120" value="${db.loja.prazo}"></label><label>Limite padrão de cliente novo (R$)<input name="limite" value="${campoDin(db.loja.limite)}" inputmode="decimal"></label>
    <label>Serviço do bar (%) — 0 para não cobrar<input name="servico" type="number" min="0" max="20" value="${db.loja.servico}"></label>
    <label class="check toda"><input type="checkbox" name="impAuto" ${db.loja.impAuto ? 'checked' : ''}> Imprimir o comprovante sozinho ao concluir a venda (impressora térmica de 80 mm)</label>
    <p class="dica toda">Para sair direto, sem a janela de impressão: no computador do caixa, abra o Chrome pelo atalho com <b>--kiosk-printing</b> no fim (botão direito no atalho → Propriedades → Destino). A impressora térmica precisa ser a padrão do Windows.</p>
    <footer class="j-pe toda"><button class="bt cheio">Salvar</button></footer></form></section>
  <section class="bloco"><header><h3>Cópia dos dados</h3></header><p class="dica">Guarde uma cópia de tudo num arquivo. Na conta, os dados já ficam na nuvem; a cópia é uma garantia a mais.</p><div class="acoes"><button type="button" class="bt" data-acao="copia">Baixar cópia</button><label class="bt">Restaurar cópia<input type="file" accept=".json,application/json" id="restaura" hidden></label></div></section>
  <section class="bloco"><header><h3>Nota fiscal</h3></header><p class="dica">O Annona não emite nota fiscal. A venda gera um comprovante sem valor fiscal para imprimir ou mandar no WhatsApp. Quem precisa de NFC-e continua usando o emissor que já tem e usa o Annona para estoque, validade, fiado, mesas, compras e lucro.</p></section>`;
const GUIA = [
  ['Cadastre os produtos', 'Em Estoque, toque em Novo produto e passe o código de barras no leitor (ou na câmera do celular). Para quem já tem planilha, use Importar planilha.'],
  ['Dê entrada pela nota', 'Em Entradas, toque em Ler o XML da nota. O Annona traz produto, quantidade, custo, lote e validade. Se a nota vier em caixa (CX C/12), ele pergunta quantas unidades vêm.'],
  ['Venda no balcão', 'Em Vender, passe o código ou digite o nome. Produto de balança pede o peso. Escolha dinheiro (mostra o troco), Pix (mostra o QR), cartão ou fiado.'],
  ['Mesas do bar', 'Em Mesas, abra a mesa e vá lançando o que pedem. Garrafa com dose: escolha Dose e o estoque baixa só os ml servidos. Ao fechar, divide por pessoa e cobra o serviço se quiser.'],
  ['Cozinha e porções', 'Porção e lanche são “feitos na hora” e vão para a tela Cozinha assim que o garçom lança na mesa, com a observação (sem cebola) e os adicionais (cheddar + R$ 9). A cozinha marca Preparando e Pronto; o garçom vê na mesa.'],
  ['Separar a conta', 'Na mesa, toque em Separar a conta: cada pessoa marca o que consumiu e paga só aquilo. O resto continua na mesa. Também dá para dividir igual por pessoa.'],
  ['Happy hour', 'No produto, ponha o preço de happy hour, os dias e o horário. Nesse horário a venda já sai com o preço certo, sem ninguém lembrar.'],
  ['Fiado com limite', 'Passe o caderno inteiro de uma vez (Fiado → Passar o caderno inteiro). Cada cliente tem limite. Passou do prazo, aparece o atraso; com mais de 15 dias o fiado trava sozinho. Cobre pelo WhatsApp com a mensagem pronta.'],
  ['Validades', 'A tela Validades mostra o que já venceu, o que vence em 7 dias e em 30 dias, com o dinheiro parado em cada lote.'],
  ['Compras', 'O que está no mínimo entra sozinho na lista de compras, separada por fornecedor, pronta para mandar no WhatsApp.'],
  ['Perdas e inventário', 'Quebrou, venceu ou sumiu: registre em Perdas. Uma vez por mês, conte a prateleira em Inventário e o estoque se corrige.'],
  ['Caixa do dia', 'Abra com o troco, registre sangrias e feche contando a gaveta. O Annona diz quanto deveria ter.'],
  ['Relatórios', 'Veja quanto vendeu, quanto lucrou de verdade (já tirando as perdas) e quais produtos dão mais lucro.'],
];
TELAS.guia = () => `<section class="cab-tela"><div><h2>Como usar o Annona</h2><p>Treze passos, do cadastro ao lucro.</p></div></section><ol class="guia">${GUIA.map(([a, b]) => `<li><b>${a}</b><p>${b}</p></li>`).join('')}</ol>`;
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
setInterval(() => { if (telaAtual === 'cozinha' && $('#camada').hidden) { try { const d = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (d && Array.isArray(d.mesas)) db.mesas = d.mesas; } catch (e) { /* fica como está */ } mostra(); } }, 15000);

// sugestões ao digitar no leitor (balcão e mesa)
function sugere(inp, ao) {
  const box = $('#sugestoes'); if (!box) return;
  const l = inp.value.trim().length >= 2 && !/^\d{6,}$/.test(inp.value.trim()) ? buscaProd(inp.value) : [];
  box.innerHTML = l.map((p) => `<button type="button" class="sug" data-sug="${p.id}">${foto(p, 'mini')}<b>${t(p.nome)}</b><span>${qtdTxt(p)}</span><b>${din(p.preco)}${p.un === 'kg' ? '/kg' : ''}</b></button>`).join('');
  $$('[data-sug]', box).forEach((b) => b.addEventListener('click', () => { inp.value = ''; box.innerHTML = ''; ao(prod(b.dataset.sug)); }));
}
function poeNaMesa(m, p) { quanto(p, (q, dose) => { addItem(m.itens, p, { q, dose, cozinha: true }); grava(); mostra(); setTimeout(() => { const l = $('#leitor-mesa'); if (l) l.focus(); }, 30); toast(p.cozinha ? `${p.nome}: pedido enviado para a cozinha.` : `${dose ? 'Dose' : p.nome} na ${m.nome}.`); }); }
function lerNaMesa(m, s) { s = String(s || '').trim(); if (!s) return; const p = ativos().find((x) => x.cod === s); if (p) { poeNaMesa(m, p); return; } const l = buscaProd(s); if (l.length === 1) poeNaMesa(m, l[0]); else toast(l.length ? 'Escolha um dos produtos da lista.' : 'Produto não encontrado.', !l.length); }
function contaInv(cod) { const p = ativos().find((x) => x.cod === String(cod).trim()); const it = p && estado.invent.itens.find((x) => x.p === p.id); if (!it) { toast('Esse código não está nesta contagem.', true); return; } it.c = r3((it.c || 0) + 1); mostra(); toast(`${p.nome}: ${numBR(it.c)}`); }

function liga() {
  const fl = $('#f-leitor'); if (fl) { const i = $('#leitor'); fl.addEventListener('submit', (e) => { e.preventDefault(); const v = i.value; i.value = ''; $('#sugestoes').innerHTML = ''; lerNoBalcao(v); }); i.addEventListener('input', () => sugere(i, poeNaVenda)); }
  const fm = $('#f-mesa'); if (fm) { const m = db.mesas.find((x) => x.id === fm.dataset.id), i = $('#leitor-mesa'); fm.addEventListener('submit', (e) => { e.preventDefault(); const v = i.value; i.value = ''; $('#sugestoes').innerHTML = ''; lerNaMesa(m, v); }); i.addEventListener('input', () => sugere(i, (p) => poeNaMesa(m, p))); }
  const fb = $('#f-busca-est'); if (fb) { const i = $('#busca-est'); fb.addEventListener('submit', (e) => { e.preventDefault(); const p = ativos().find((x) => x.cod === i.value.trim()); if (p) formProduto(p); else if (/^\d{8,14}$/.test(i.value.trim())) formProduto({ cod: i.value.trim() }); }); i.addEventListener('input', () => { estado.filtro = i.value; const pos = i.selectionStart; mostra(); const n = $('#busca-est'); n.focus(); n.setSelectionRange(pos, pos); }); }
  const fi = $('#f-inv'); if (fi) fi.addEventListener('submit', (e) => { e.preventDefault(); const c = e.target.cat.value; estado.invent = { cat: c, itens: comEstoque().filter((p) => !c || p.cat === c).map((p) => ({ p: p.id, c: null })) }; mostra(); });
  const fic = $('#f-inv-cod'); if (fic) fic.addEventListener('submit', (e) => { e.preventDefault(); const i = $('#inv-cod'); const v = i.value; i.value = ''; contaInv(v); });
  $$('[data-perm]').forEach((c) => c.addEventListener('change', () => { const [ui, k] = c.dataset.perm.split('.'), u = db.usuarios.find((x) => x.id === ui); (u.perms ||= {})[k] = c.checked; registra(`${u.nome}: ${c.checked ? 'pode' : 'não pode mais'} ${PERMS.find((x) => x[0] === k)[1].toLowerCase()}`, 'equipe'); grava(); toast('Permissão salva.'); }));
  const fp = $('#f-perfil'); if (fp) fp.addEventListener('submit', (e) => { e.preventDefault(); const f = e.target, u = eu(); if (f.pin.value && !/^\d{4}$/.test(f.pin.value)) { toast('A senha tem 4 números.', true); return; } Object.assign(u, { nome: f.nome.value.trim(), tel: f.tel.value.trim(), email: f.email.value.trim(), abrir: f.abrir.value }); if (f.pin.value) u.pin = f.pin.value; grava(); mostra(); toast('Perfil salvo.'); });
  const fmt = $('#f-meta'); if (fmt) fmt.m.addEventListener('change', () => { db.meta = lerDin(fmt.m.value); grava(); mostra(); toast('Meta salva.'); });
  $$('[data-conta]').forEach((inp) => inp.addEventListener('change', () => { const it = estado.invent.itens.find((x) => x.p === inp.dataset.conta); it.c = inp.value.trim() === '' ? null : r3(lerNum(inp.value)); inp.closest('tr').classList.toggle('feito', it.c !== null); }));
  const fa = $('#f-abre'); if (fa) fa.addEventListener('submit', (e) => { e.preventDefault(); if (!pode('caixa')) { liberar('caixa', 'abrir o caixa', () => fa.requestSubmit()); return; } db.caixa = { aberto: true, ab: agora(), troco: lerDin(e.target.troco.value), movs: [] }; registra(`Caixa aberto com ${din(db.caixa.troco)} de troco`, 'caixa'); grava(); mostra(); toast('Caixa aberto. Boas vendas!'); });
  const flj = $('#f-loja'); if (flj) flj.addEventListener('submit', (e) => { e.preventDefault(); const f = e.target; Object.assign(db.loja, { nome: f.nome.value.trim(), slogan: f.slogan.value.trim(), tel: f.tel.value.trim(), cidade: f.cidade.value.trim(), pix: f.pix.value.trim(), prazo: Math.max(1, Number(f.prazo.value) || 30), limite: lerDin(f.limite.value), servico: Math.max(0, Math.min(20, Number(f.servico.value) || 0)), impAuto: f.impAuto.checked }); grava(); mostra(); toast('Configurações salvas.'); });
  const xml = $('#xml'); if (xml) xml.addEventListener('click', (e) => { if (!pode('entradas')) { e.preventDefault(); liberar('entradas', 'dar entrada pela nota', () => xml.click()); } });
  if (xml) xml.addEventListener('change', () => { const a = xml.files[0]; if (!a) return; a.text().then((txt) => { try { formEntrada(lerXML(txt)); } catch (e) { toast('Esse arquivo não parece o XML de uma nota fiscal (NF-e).', true); } }); xml.value = ''; });
  const rs = $('#restaura'); if (rs) rs.addEventListener('change', () => { const a = rs.files[0]; if (!a) return; a.text().then((txt) => { try { const d = JSON.parse(txt); if (!Array.isArray(d.produtos)) throw new Error('x'); confirmar('Restaurar a cópia', 'Os dados de agora serão trocados pelos da cópia.', 'Restaurar', () => { db = d; grava(); mostra(); toast('Cópia restaurada.'); }, true); } catch (e) { toast('Esse arquivo não é uma cópia do Annona.', true); } }); rs.value = ''; });
}

// cliques
document.addEventListener('click', (e) => {
  const b = e.target.closest('button, tr.clica, [data-cat], [data-rel]'); if (!b || b.closest('#camada')) return;
  const ds = b.dataset;
  if (ds.carro) { const c = $('#carrossel'); c.scrollBy({ left: Number(ds.carro) * c.clientWidth * 0.8, behavior: 'smooth' }); return; }
  if (ds.por) { poeNaVenda(prod(ds.por)); return; }
  if (ds.mesaPor) { poeNaMesa(db.mesas.find((m) => m.id === ds.id), prod(ds.mesaPor)); return; }
  for (const k of ['menos', 'mais', 'tira']) if (ds[k]) {
    const [onde, i] = ds[k].split(':'), lista = onde === 'venda' ? estado.venda.itens : db.mesas.find((m) => `mesa-${m.id}` === onde).itens, it = lista[Number(i)];
    if (k === 'tira' || (k === 'menos' && it.q <= 1)) lista.splice(Number(i), 1); else it.q = r3(it.q + (k === 'mais' ? 1 : -1));
    if (onde !== 'venda') grava(); mostra(); return;
  }
  if (ds.cat !== undefined && b.classList.contains('chip')) { estado.cat = ds.cat; mostra(); return; }
  if (ds.rel) { estado.rel = ds.rel; mostra(); return; }
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
  if (ds.obs || ds.entregue) { const [onde, i] = (ds.obs || ds.entregue).split(':'), lista = db.mesas.find((m) => `mesa-${m.id}` === onde).itens; if (ds.obs) obsItem(lista, Number(i)); else { lista[Number(i)].cz = 'entregue'; grava(); mostra(); } return; }
  if (ds.cz) { const [mid, iid, st] = ds.cz.split(':'), m = db.mesas.find((x) => x.id === mid), x = m && m.itens.find((y) => y.id === iid); if (x) { x.cz = st; if (st === 'pronto') x.pronto = agora(); grava(); mostra(); if (st === 'pronto') toast(`${x.nome} da ${m.nome} pronto.`); } return; }
  if (ds.czimp) { const [mid, iid] = ds.czimp.split(':'), m = db.mesas.find((x) => x.id === mid), x = m && m.itens.find((y) => y.id === iid); if (x) imprimir(`COZINHA · ${m.nome}\n${horaBR(x.h)}\n\n${numBR(x.q, 0)}x ${x.nome}${(x.adics || []).length ? `\n+ ${x.adics.map((a) => a.n).join(', ')}` : ''}${x.obs ? `\nOBS: ${x.obs}` : ''}`); return; }
  if (ds.como) { db.usuario = ds.como; grava(); location.hash = `#${eu().abrir || 'painel'}`; mostra(); toast(`Agora você vê o sistema como ${eu().nome}.`); return; }
  if (ds.tiraU) { const u = db.usuarios.find((x) => x.id === ds.tiraU); confirmar('Tirar da equipe', `${t(u.nome)} perde o acesso. As vendas dela continuam nos relatórios.`, 'Tirar', () => { db.usuarios = db.usuarios.filter((x) => x.id !== u.id); registra(`${u.nome} saiu da equipe`, 'equipe'); grava(); mostra(); }, true); return; }
  const id = ds.id, A = {
    'camera-venda': () => lerCamera(lerNoBalcao), 'camera-estoque': () => lerCamera((c) => { const p = ativos().find((x) => x.cod === c); if (p) formProduto(p); else formProduto({ cod: c }); }),
    'camera-mesa': () => lerCamera((c) => lerNaMesa(db.mesas.find((m) => m.id === id), c)), 'camera-inv': () => lerCamera(contaInv),
    'limpar-venda': () => { estado.venda = { itens: [], cli: '', desc: 0 }; mostra(); },
    desconto: () => liberar('desconto', 'desconto na venda', () => abrir(`${cab('Desconto na venda')}<form class="form"><label>Desconto (R$)<input name="d" inputmode="decimal" value="${campoDin(estado.venda.desc)}"></label><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Aplicar</button></footer></form>`, (j) => $('form', j).addEventListener('submit', (ev) => { ev.preventDefault(); const sub = estado.venda.itens.reduce((s, x) => s + Math.round(x.q * x.preco), 0); estado.venda.desc = Math.min(sub, lerDin(ev.target.d.value)); fechar(); mostra(); }))),
    'pagar-venda': () => pagar({ itens: estado.venda.itens, desc: estado.venda.desc, titulo: 'Receber', origem: 'balcao', depois: () => { estado.venda = { itens: [], cli: '', desc: 0 }; mostra(); } }),
    'nova-mesa': novaMesa, separar: () => separarConta(db.mesas.find((m) => m.id === id)), 'caderno-todo': cadernoTodo, 'fechar-mesa': () => fecharMesa(db.mesas.find((m) => m.id === id)), parcial: () => fecharMesa(db.mesas.find((m) => m.id === id), true),
    'cancelar-mesa': () => { registra(`Mesa cancelada: ${(db.mesas.find((m) => m.id === id) || {}).nome}`, 'mesa'); db.mesas = db.mesas.filter((m) => m.id !== id); grava(); location.hash = '#mesas'; },
    pessoas: () => { const m = db.mesas.find((x) => x.id === id); abrir(`${cab('Pessoas na mesa')}<form class="form"><label>Quantas pessoas<input name="p" type="number" min="1" max="40" value="${m.pessoas}"></label><footer class="j-pe"><button class="bt cheio">Salvar</button></footer></form>`, (j) => $('form', j).addEventListener('submit', (ev) => { ev.preventDefault(); m.pessoas = Math.max(1, Number(ev.target.p.value) || 1); grava(); fechar(); mostra(); })); },
    'novo-produto': () => formProduto(), 'nova-entrada': () => liberar('entradas', 'dar entrada de mercadoria', () => formEntrada()), 'nova-perda': () => liberar('estoque', 'registrar perda', () => formPerda()), 'nova-pessoa': novaPessoa,
    'novo-cliente': () => formCliente(), 'editar-cliente': () => formCliente(cli(id)), receber: () => receber(cli(id)),
    bloquear: () => { cli(id).bloq = true; registra(`Fiado bloqueado: ${cli(id).nome}`, 'fiado'); grava(); mostra(); toast('Fiado bloqueado para este cliente.'); },
    liberar: () => { const c = cli(id); if (c.bloq) { c.bloq = false; grava(); mostra(); toast('Cliente desbloqueado.'); } else confirmar('Liberar o fiado', 'O cliente está com atraso. Liberar só desta vez? (Na próxima venda, decida de novo.)', 'Entendi', () => toast('Na venda, escolha Fiado normalmente: o dono pode passar o limite.'), false); },
    caderno: () => { const c = cli(id); abrir(`${cab('Passar do caderno', t(c.nome))}<form class="form"><label>Valor que ele já devia (R$)<input name="v" inputmode="decimal" required></label><label>Data da compra no caderno<input name="d" type="date" value="${hoje()}"></label><footer class="j-pe"><button type="button" class="bt" data-fechar>Voltar</button><button class="bt cheio">Lançar</button></footer></form>`, (j) => $('form', j).addEventListener('submit', (ev) => { ev.preventDefault(); const v = lerDin(ev.target.v.value); if (v <= 0) return; db.fiado.push({ id: uid('f'), cli: c.id, data: `${ev.target.d.value}T12:00:00`, tipo: 'compra', v, obs: 'Do caderno' }); grava(); fechar(); mostra(); toast('Dívida do caderno lançada.'); })); },
    'novo-forn': () => formForn(), sangria: () => liberar('caixa', 'sangria do caixa', () => movCaixa('sangria')), suprimento: () => liberar('caixa', 'suprimento do caixa', () => movCaixa('suprimento')), 'fechar-caixa': () => liberar('caixa', 'fechar o caixa', fecharCaixa),
    'inv-cancelar': () => { estado.invent = null; mostra(); }, 'inv-fim': fimInventario,
    copia: () => baixarArq(`annona-copia-${hoje()}.json`, JSON.stringify(db), 'application/json'),
    'exportar-estoque': () => baixarArq(`estoque-${hoje()}.csv`, csv([['Produto', 'Código', 'Categoria', 'Unidade', 'Estoque', 'Mínimo', 'Custo', 'Preço'], ...ativos().map((p) => [p.nome, p.cod, p.cat, UN[p.un], numBR(p.q), numBR(p.min), campoDin(p.custo), campoDin(p.preco)])])),
    'exportar-rel': () => { const [de, ate] = periodo(estado.rel); baixarArq(`vendas-${de}-a-${ate}.csv`, csv([['Nº', 'Data', 'Hora', 'Origem', 'Itens', 'Total', 'Lucro', 'Pagamento'], ...vendasEntre(de, ate).map((v) => [v.n, dataBR(v.data), horaBR(v.data), v.mesa || 'Balcão', v.itens.map((x) => `${numBR(x.q)} ${x.nome}`).join(', '), campoDin(v.total), campoDin(lucroVenda(v)), v.pag.map((x) => FORMAS[x.f]).join(' + ')])])); },
    importar: importarPlanilha,
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
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedido = e; $('#bt-instalar').hidden = false; });
$('#bt-instalar').addEventListener('click', async () => { if (!pedido) return; pedido.prompt(); await pedido.userChoice; pedido = null; $('#bt-instalar').hidden = true; });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
$('#recomecar').addEventListener('click', () => confirmar('Recomeçar a demonstração?', 'Os dados de exemplo voltam ao começo neste aparelho.', 'Recomeçar', () => { localStorage.removeItem(CHAVE); location.replace(location.pathname); }, true));
if (window.veltriaConta) document.body.classList.add('na-conta');
if (!location.hash && eu().abrir && eu().abrir !== 'painel') history.replaceState(null, '', `#${eu().abrir}`);
rota();
