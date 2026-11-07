// Peplo · gestão da loja de roupas pequena: fiado com limite, bloqueio e cobrança no WhatsApp, estoque por tamanho e cor,
// vendas com pagamento dividido, compras, trocas e devoluções, caixa do dia, peças paradas e relatórios.
// Dinheiro sempre em centavos (inteiros). Nada confirmado é apagado: cancelamento, devolução e renegociação viram registros novos.
// Dados neste navegador (a conta na nuvem sincroniza pela base conta-nuvem.js). ?novo recomeça a demonstração.

import { qrSVG } from '../base/qr.js';
const CHAVE = 'peplo-v1';
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
const agora = () => new Date().toISOString();
const telLimpo = (tel) => String(tel || '').replace(/\D/g, '');
const zap = (tel, m) => `https://wa.me/${telLimpo(tel).length >= 12 ? '' : '55'}${telLimpo(tel)}?text=${encodeURIComponent(m)}`;
const FORMAS = { dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Cartão de débito', credito: 'Cartão de crédito', fiado: 'Fiado', loja: 'Crédito da loja' };
const ICONE_CAT = {
  Vestidos: '<path d="M9 3h6l-1 4 4 13H6l4-13z"/><path d="M9 3l-1 2M15 3l1 2"/>',
  Blusas: '<path d="M8 4l4 2 4-2 4 4-3 3v9H7v-9L4 8z"/>',
  Camisetas: '<path d="M8 4h8l4 4-3 2v10H7V10L4 8z"/><path d="M10 4a2 2 0 0 0 4 0"/>',
  Calças: '<path d="M7 3h10l1 18h-4l-2-11-2 11H6z"/><path d="M7 7h10"/>',
  Saias: '<path d="M8 4h8l3 16H5z"/><path d="M8 7h8"/>',
  Jaquetas: '<path d="M8 3l4 3 4-3 4 3v14h-5V9l-3 4-3-4v11H4V6z"/>',
  Shorts: '<path d="M6 5h12l1 10h-5l-2-5-2 5H5z"/>',
  Acessórios: '<path d="M6 9h12l-1 11H7z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/>',
};
const iconePeca = (p) => p.foto ? `<span class="peca"><img src="${t(p.foto)}" alt="" loading="lazy"></span>` : `<span class="peca" style="background:${(p.cores[0] || {}).h ? mistura(p.cores[0].h) : ''}"><svg viewBox="0 0 24 24">${ICONE_CAT[p.cat] || ICONE_CAT.Acessórios}</svg></span>`;
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
  const r = rnd(20261107), esc_ = (l) => l[Math.floor(r() * l.length)], h = hoje();
  const C = { preto: { n: 'Preto', h: '#1f1d1b' }, branco: { n: 'Branco', h: '#f4f1ea' }, vinho: { n: 'Vinho', h: '#6b2338' }, nude: { n: 'Nude', h: '#d9b99b' }, azul: { n: 'Azul jeans', h: '#4a6a8f' }, claro: { n: 'Jeans claro', h: '#9db4cc' }, rosa: { n: 'Rosa', h: '#e3a3b5' }, verde: { n: 'Verde oliva', h: '#6e7444' }, caramelo: { n: 'Caramelo', h: '#a0683a' }, off: { n: 'Off-white', h: '#ede4d3' }, marinho: { n: 'Marinho', h: '#22304a' }, estampa: { n: 'Estampado', h: '#b5677f' }, roxo: { n: 'Roxo', h: '#5b3a7a' }, xadrez: { n: 'Xadrez azul', h: '#7a86a8' } };
  const PMG = ['P', 'M', 'G', 'GG', 'XG'], PLUS = ['G1', 'G2', 'G3', 'G4'], NUM = ['36', '38', '40', '42', '44', '46', '48'], NUMP = ['46', '48', '50', '52', '54'];
  const def = [
    ['Vestido Midi Floral', 'Vestidos', 'VM-1021', 8900, 21900, PMG, ['estampa', 'preto'], 'giro'],
    ['Vestido Longo Alcinha', 'Vestidos', 'VL-1033', 9800, 24900, PMG, ['roxo', 'vinho'], 'parado'],
    ['Vestido Tubinho', 'Vestidos', 'VT-1040', 7400, 17900, PMG, ['preto', 'nude'], 'giro'],
    ['Suéter Tricot Listrado', 'Blusas', 'BT-5502', 5200, 12900, PMG, ['marinho', 'off'], 'parado'],
    ['Blusa Cetim Manga Longa', 'Blusas', 'BC-5510', 4600, 11900, PMG, ['rosa', 'nude', 'branco'], 'giro'],
    ['Body Canelado', 'Blusas', 'BD-5521', 2900, 6990, PMG, ['preto', 'branco', 'nude'], 'forte'],
    ['Camiseta Básica Algodão', 'Camisetas', 'CB-1001', 1800, 4990, PMG, ['preto', 'branco', 'vinho'], 'forte'],
    ['Camiseta Estampa Boho', 'Camisetas', 'CE-1007', 2400, 5990, PMG, ['off', 'rosa'], 'giro'],
    ['Calça Jeans Reta', 'Calças', 'CJ-3301', 6400, 15900, NUM, ['azul', 'claro'], 'forte'],
    ['Calça Alfaiataria', 'Calças', 'CA-3312', 6900, 16900, NUM, ['preto', 'caramelo', 'off'], 'giro'],
    ['Calça Pantalona Linho', 'Calças', 'CP-3320', 7600, 18900, NUM, ['nude', 'off'], 'parado'],
    ['Saia Midi Plissada', 'Saias', 'SM-4401', 4800, 12900, PMG, ['off', 'preto', 'nude'], 'giro'],
    ['Saia Jeans Curta', 'Saias', 'SJ-4410', 3900, 9900, NUM, ['azul', 'claro'], 'giro'],
    ['Jaqueta Jeans Oversized', 'Jaquetas', 'JJ-6601', 9200, 22900, PMG, ['azul', 'claro'], 'parado'],
    ['Blazer Linho Acinturado', 'Jaquetas', 'BZ-6610', 11800, 27900, PMG, ['nude', 'preto'], 'giro'],
    ['Short Alfaiataria Xadrez', 'Shorts', 'SA-7701', 3600, 8990, NUM, ['xadrez', 'preto'], 'giro'],
    ['Short Jeans Destroyed', 'Shorts', 'SD-7710', 3200, 7990, NUM, ['azul'], 'parado'],
    ['Bolsa Tiracolo Couro', 'Acessórios', 'AC-9901', 6800, 15900, ['Único'], ['caramelo', 'preto'], 'giro'],
    ['Cinto Fivela Dourada', 'Acessórios', 'AC-9910', 1900, 4990, ['P', 'M', 'G'], ['preto', 'caramelo'], 'giro'],
    ['Lenço de Seda Animal Print', 'Acessórios', 'AC-9920', 2200, 5990, ['Único'], ['caramelo', 'preto'], 'giro'],
    ['Conjunto Cropped e Saia Floral', 'Saias', 'CS-4430', 8800, 19900, PMG, ['estampa', 'off'], 'parado'],
    ['Camisa Social Feminina', 'Blusas', 'CS-5530', 5400, 13900, PMG, ['branco', 'marinho'], 'giro'],
    ['Vestido Envelope Plus', 'Vestidos', 'VP-1050', 9400, 22900, PLUS, ['vinho', 'preto'], 'giro'],
    ['Calça Jeans Plus Cintura Alta', 'Calças', 'CJ-3340', 7200, 17900, NUMP, ['azul', 'preto'], 'forte'],
  ];
  const produtos = def.map(([nome, cat, cod, custo, preco, tam, cores, giro], i) => ({
    id: `p${i + 1}`, nome, cat, cod, marca: '', forn: i % 3 ? 'Ateliê Rosa Confecções' : 'Brás Moda Atacado', foto: `fotos/p${i + 1}.jpg`, custo, preco, min: tam.length === 1 ? 2 : 1, tam, cores: cores.map((k) => ({ ...C[k] })), q: {}, criado: somaDias(h, -150), arquivado: false, giro,
  }));
  const fornecedores = [{ id: 'f1', nome: 'Brás Moda Atacado', tel: '11987650001' }, { id: 'f2', nome: 'Ateliê Rosa Confecções', tel: '19992340044' }];
  const NOMES = ['Ana Souza', 'Carla Mendes', 'Juliana Alves', 'Fernanda Lima', 'Patrícia Rocha', 'Beatriz Costa', 'Mariana Ribeiro', 'Camila Duarte', 'Larissa Prado', 'Renata Barros', 'Aline Teixeira', 'Gabriela Nunes', 'Tatiane Freitas', 'Débora Campos', 'Vanessa Moura', 'Simone Araújo', 'Cristina Pires', 'Luana Batista', 'Helena Castro', 'Rosângela Dias'];
  const clientes = NOMES.map((nome, i) => ({ id: `c${i + 1}`, nome, tel: `1699${String(1100000 + i * 7311).slice(0, 7)}`, cpf: '', nasc: `19${70 + (i * 3) % 30}-${pad((i % 12) + 1)}-${pad((i * 7) % 27 + 1)}`, end: '', limite: [30000, 50000, 80000, 40000][i % 4], obs: '', bloqueado: false, credito: 0, criado: somaDias(h, -160) }));
  const MAUS = new Set(['c1', 'c2', 'c5', 'c9', 'c14']); // não pagam em dia
  clientes.find((c) => c.id === 'c9').bloqueado = true; clientes.find((c) => c.id === 'c9').obs = 'Bloqueada no fiado até acertar o atraso.';
  const db = { v: 1, tema: 'ameixa', loja: { nome: 'Boutique Bella', slogan: 'Roupas e acessórios', dono: 'Bella', tel: '16991500746', cidade: 'Orlândia, SP', pix: 'boutiquebella@pix.com', logo: '' },
    cfg: { limitePadrao: 30000, alertaPct: 80, bloqueioDias: 15, bloqueioAuto: true, juros: { ativo: false, multaPct: 2, jurosMesPct: 1, carencia: 3 }, parados: [30, 60, 90], minimo: 1, msgs: {} },
    usuarios: EQUIPE(), usuario: 'u1', meta: 2500000, atividades: [],
    clientes, produtos, fornecedores, vendas: [], parcelas: [], pagamentos: [], acordos: [], cobrancas: [], movs: [], compras: [], excecoes: [], avarias: [], caixa: { aberto: null, historico: [] }, n: 1000 };
  // estoque de partida (entrada há 150 dias) e uma reposição há 40 dias
  const entra = (p, qtd, data, ref) => p.cores.forEach((c) => p.tam.forEach((tm) => { const k = `${c.n}|${tm}`; p.q[k] = (p.q[k] || 0) + qtd; db.movs.push({ id: uid('m'), data, p: p.id, cor: c.n, tam: tm, q: qtd, tipo: 'entrada', ref }); }));
  produtos.forEach((p) => entra(p, p.giro === 'forte' ? 6 : p.giro === 'parado' ? 3 : 4, `${somaDias(h, -150)}T10:00:00`, 'Estoque inicial'));
  db.compras.push({ id: 'cp1', data: somaDias(h, -150), forn: 'Brás Moda Atacado', itens: [], total: produtos.reduce((s, p) => s + p.custo * p.cores.length * p.tam.length * (p.giro === 'forte' ? 6 : p.giro === 'parado' ? 3 : 4), 0), forma: 'Boleto 30/60', obs: 'Estoque inicial da loja' });
  const repor = produtos.filter((p) => p.giro === 'forte');
  repor.forEach((p) => entra(p, 3, `${somaDias(h, -40)}T09:30:00`, 'Compra cp2'));
  db.compras.push({ id: 'cp2', data: somaDias(h, -40), forn: 'Ateliê Rosa Confecções', itens: repor.map((p) => ({ p: p.id, qtd: p.cores.length * p.tam.length * 3, custo: p.custo })), total: repor.reduce((s, p) => s + p.custo * p.cores.length * p.tam.length * 3, 0), forma: 'Pix', obs: 'Reposição dos mais vendidos' });
  // vendas dos últimos 120 dias; as "paradas" só vendem no começo
  const caixaHoje = 'cx-hoje';
  for (let d = -120; d <= 0; d++) {
    const dia = somaDias(h, d), n = d === 0 ? 4 : Math.floor(r() * 3.2);
    for (let k = 0; k < n; k++) {
      const pode = produtos.filter((p) => (p.giro !== 'parado' || d < -85) && Object.values(p.q).some((x) => x > 0));
      if (!pode.length) break;
      const itens = []; const ni = r() < 0.7 ? 1 : 2;
      for (let j = 0; j < ni; j++) {
        const p = esc_(pode), vars = Object.entries(p.q).filter(([, x]) => x > 0); if (!vars.length) continue;
        const [kk] = esc_(vars), [cor, tam] = kk.split('|');
        if (itens.some((x) => x.p === p.id && x.cor === cor && x.tam === tam)) continue;
        itens.push({ p: p.id, nome: p.nome, cor, tam, qtd: 1, preco: p.preco, custo: p.custo });
      }
      if (!itens.length) continue;
      const total = itens.reduce((s, x) => s + x.preco * x.qtd, 0), desc = r() < 0.15 ? Math.round(total * 0.05 / 100) * 100 : 0, liq = total - desc;
      const cli = r() < 0.75 ? esc_(clientes) : null, sorte = r();
      let pag;
      if (cli && sorte < 0.3 && !(cli.id === 'c9' && d > -60)) pag = [{ f: 'fiado', v: liq }];
      else if (cli && sorte < 0.38) pag = [{ f: 'pix', v: Math.round(liq / 2) }, { f: 'fiado', v: liq - Math.round(liq / 2) }];
      else pag = [{ f: esc_(['pix', 'pix', 'pix', 'dinheiro', 'dinheiro', 'credito', 'credito', 'debito']), v: liq }];
      const hora = `${pad(9 + Math.floor(r() * 9))}:${pad(Math.floor(r() * 60))}:00`;
      const v = { id: uid('v'), n: ++db.n, data: `${dia}T${hora}`, vend: esc_(['u1', 'u2', 'u2', 'u3']), cli: cli ? cli.id : null, itens, sub: total, desc, total: liq, pag, devol: [], caixa: d === 0 ? caixaHoje : `cx${d}` };
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
  // pagamentos e cobranças de hoje, para a tela do dia ter vida
  const hojeAberta = db.parcelas.find((x) => x.saldo > 0 && x.venc < h && !MAUS.has(x.cli));
  if (hojeAberta) { const pg = { id: uid('pg'), data: `${h}T10:40:00`, cli: hojeAberta.cli, v: hojeAberta.saldo, f: 'pix', parcelas: [{ id: hojeAberta.id, v: hojeAberta.saldo }], caixa: caixaHoje }; db.pagamentos.push(pg); hojeAberta.pags.push(pg.id); hojeAberta.saldo = 0; }
  db.caixa.aberto = { id: caixaHoje, abertura: `${h}T08:55:00`, inicial: 20000, movs: [{ id: uid('cm'), t: 'despesa', v: 3500, desc: 'Café e água da loja', data: `${h}T09:10:00`, f: 'dinheiro' }] };
  for (let d = -5; d < 0; d++) db.caixa.historico.push({ id: `cx${d}`, abertura: `${somaDias(h, d)}T09:00:00`, fechamento: `${somaDias(h, d)}T18:30:00`, inicial: 20000, contado: null, esperado: null, dif: d === -3 ? -500 : 0, obs: d === -3 ? 'Faltaram R$ 5,00 (troco)' : '' });
  db.cobrancas.push({ id: uid('cb'), cli: 'c2', data: `${somaDias(h, -2)}T14:00:00`, modelo: 'atraso' });
  return db;
}

const PERMS = [['custo', 'Ver custo e lucro'], ['desconto', 'Desconto acima do limite'], ['liberar', 'Liberar fiado fora da regra'], ['caixa', 'Abrir e fechar o caixa'], ['relatorios', 'Ver relatórios']];
const EQUIPE = () => [
  { id: 'u1', nome: 'Bella Martins', perfil: 'dona', tel: '16991500746', email: 'bella@boutiquebella.com', foto: '', nasc: '', descMax: 100, perms: {}, pin: '' },
  { id: 'u2', nome: 'Júlia Santos', perfil: 'vendedora', tel: '16992223344', email: '', foto: '', nasc: '', descMax: 10, perms: { caixa: true }, pin: '' },
  { id: 'u3', nome: 'Paula Reis', perfil: 'vendedora', tel: '16993334455', email: '', foto: '', nasc: '', descMax: 5, perms: {}, pin: '' },
];
let db;
try { db = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { db = null; }
if (new URLSearchParams(location.search).has('novo') || !db || !db.produtos) db = inicial();
const grava = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch (e) { toast('Não consegui salvar neste aparelho (sem espaço). Faça uma cópia em Configurações.', true); } };
// dados de antes desta versão: ganham equipe, meta e registro de atividades
if (!db.usuarios) { db.usuarios = EQUIPE(); db.usuario = 'u1'; }
db.meta = db.meta || 2500000; db.atividades = db.atividades || [];
db.notas = db.notas || [];
db.fiscal = db.fiscal || { usar: false, ambiente: '2', regime: '1', razao: '', cnpj: '', ie: '', rua: '', numero: '', bairro: '', cidade: '', codMun: '', uf: 'SP', cep: '', cscId: '', serie: 1, proximo: 1 };
const NOTA_LIGADA = false; // 07/11/2026: dono decidiu deixar o Peplo sem nota fiscal por enquanto
if (!NOTA_LIGADA) db.fiscal.usar = false;
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
  if (c.bloqueado) return { k: 'bloq', tag: 'mal', txt: 'Bloqueada no fiado' };
  if (db.cfg.bloqueioAuto && atr > db.cfg.bloqueioDias) return { k: 'bloq', tag: 'mal', txt: `Bloqueio automático (${atr} dias)` };
  if (ven > 0) return { k: 'atraso', tag: 'mal', txt: `Em atraso · ${atr} dias` };
  if (c.limite && ab >= c.limite) return { k: 'limite', tag: 'atn', txt: 'Limite usado' };
  if (c.limite && ab >= c.limite * db.cfg.alertaPct / 100) return { k: 'perto', tag: 'atn', txt: 'Perto do limite' };
  if (ab > 0) return { k: 'emdia', tag: 'ok', txt: 'Em dia' };
  return { k: 'sem', tag: '', txt: 'Sem fiado' };
}
// pode vender fiado? (venda à vista nunca é bloqueada)
function podeFiado(c, valor) {
  if (!c) return { ok: false, motivo: 'Escolha a cliente para vender no fiado.' };
  const s = situacao(c), disp = (c.limite || 0) - aberto(c.id);
  if (s.k === 'bloq') return { ok: false, motivo: c.bloqueado ? `${c.nome} está bloqueada no fiado.` : `${c.nome} está bloqueada no fiado (${s.txt.toLowerCase()}).`, excecao: true };
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
const qtd = (p, cor, tam) => p.q[`${cor}|${tam}`] || 0;
const totalPecas = (p) => Object.values(p.q).reduce((s, x) => s + Math.max(0, x), 0);
const ativos = () => db.produtos.filter((p) => !p.arquivado);
function ultimaVenda(pid) { let u = null; for (const m of db.movs) if (m.p === pid && m.tipo === 'venda' && (!u || m.data > u)) u = m.data; return u; }
function situacaoParada(p) {
  const u = ultimaVenda(p.id), d = dias(u || p.criado), [a, b, c] = db.cfg.parados;
  return { dias: d, ultima: u, nivel: d > c ? 'Encalhada' : d > b ? 'Parada' : d > a ? 'Atenção' : 'Normal', tag: d > c ? 'mal' : d > b ? 'atn' : d > a ? 'ac' : 'ok' };
}
const parados = () => ativos().filter((p) => totalPecas(p) > 0).map((p) => ({ p, ...situacaoParada(p) })).filter((x) => x.dias > db.cfg.parados[1]).sort((a, b) => b.dias - a.dias);
const baixos = () => ativos().flatMap((p) => p.cores.flatMap((c) => p.tam.map((tm) => ({ p, cor: c.n, tam: tm, q: qtd(p, c.n, tm) })))).filter((x) => x.q <= x.p.min);
const produtosBaixos = () => [...new Set(baixos().map((x) => x.p))];
function grade(p, { editar = false, minimo = true } = {}) {
  return `<div class="tabela-wrap"><table class="gradeq"><thead><tr><th></th>${p.tam.map((tm) => `<th>${t(tm)}</th>`).join('')}</tr></thead><tbody>${p.cores.map((c) => `<tr><th class="cor"><span class="bolinha" style="background:${t(c.h)}"></span>${t(c.n)}</th>${p.tam.map((tm) => {
    const q = qtd(p, c.n, tm);
    return editar ? `<td><input type="number" inputmode="numeric" min="0" data-g="${t(c.n)}|${t(tm)}" value="${q}" aria-label="${t(c.n)} ${t(tm)}"></td>` : `<td class="${q <= 0 ? 'zero' : minimo && q <= p.min ? 'baixo' : ''}">${q}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function mover(p, cor, tam, q, tipo, ref, motivo = '') { const k = `${cor}|${tam}`; p.q[k] = (p.q[k] || 0) + q; db.movs.push({ id: uid('m'), data: agora(), p: p.id, cor, tam, q, tipo, ref, motivo }); }

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
      const w = open('', '_blank'); if (!w) { toast('O navegador bloqueou a janela de impressão.', true); return; }
      w.document.write(`<!doctype html><meta charset="utf-8"><title>Etiquetas</title><style>body{font:11px Inter,Arial,sans-serif;margin:8mm}.g{display:grid;grid-template-columns:repeat(3,62mm);gap:3mm}.e{border:1px dashed #bbb;border-radius:2mm;padding:2.5mm;height:32mm;display:grid;grid-template-rows:auto auto 1fr auto}.e b{font-size:12px}.e .pr{font-size:15px;font-weight:700}.barras-svg{width:100%;height:11mm}.c{font-size:9px;letter-spacing:.06em;text-align:center}</style><div class="g">${l.map((x) => `<div class="e"><span>${t(db.loja.nome)}</span><b>${t(p.nome)} · ${t(x.cor)} · ${t(x.tam)}</b><span class="pr">${din(precoAtual(p))}</span><div>${barras(codVar(p, x.cor, x.tam))}<div class="c">${codVar(p, x.cor, x.tam)}</div></div></div>`).join('')}</div><script>setTimeout(()=>print(),300)<\/script>`);
      w.document.close(); fechar(); toast(`${l.length} etiquetas prontas para imprimir.`);
    };
  });
}

// ------------------------------------------------------------------ nota fiscal (NFC-e, modelo 65)
// A loja escolhe se usa. Os custos da emissão são da loja (certificado digital A1, inscrição estadual, CSC na SEFAZ, contador).
// Na demonstração a nota é simulada e sai marcada SEM VALOR FISCAL; na conta, o envio à SEFAZ é feito pelo servidor do Peplo.
const NCM_SUG = { Vestidos: '6204.44.00', Blusas: '6206.40.00', Camisetas: '6109.10.00', Calças: '6204.62.00', Saias: '6204.52.00', Jaquetas: '6204.33.00', Shorts: '6204.62.00', Acessórios: '4202.22.10' };
const TPAG = { dinheiro: '01', credito: '03', debito: '04', loja: '05', pix: '17', fiado: '05' };
const EMISSAO_REAL = false; // 07/11/2026: o envio à SEFAZ (servidor com o certificado da loja) ainda não está no ar
const emiteAqui = () => !window.veltriaConta || EMISSAO_REAL;
const fiscalPronto = () => { const f = db.fiscal; return f.usar && f.cnpj.replace(/\D/g, '').length === 14 && f.ie && f.razao && f.cscId; };
const somenteNum = (x) => String(x || '').replace(/\D/g, '');
function dvChave(c43) { let p = 2, s2 = 0; for (let i = c43.length - 1; i >= 0; i--) { s2 += Number(c43[i]) * p; p = p === 9 ? 2 : p + 1; } const r = s2 % 11; return r < 2 ? 0 : 11 - r; }
function montarChave(nNF, data) {
  const f = db.fiscal, d = new Date(data), aamm = `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}`;
  const cnpj = somenteNum(f.cnpj).padStart(14, '0').slice(-14), cNF = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
  const c43 = `35${aamm}${cnpj}65${String(f.serie).padStart(3, '0')}${String(nNF).padStart(9, '0')}1${cNF}`;
  return c43 + dvChave(c43);
}
function emitirNota(v, cpf) {
  const f = db.fiscal, demo = !window.veltriaConta, n = f.proximo || 1;
  const nota = { id: uid('nf'), venda: v.id, numero: n, serie: f.serie, data: agora(), cpf: somenteNum(cpf), chave: montarChave(n, Date.now()), valor: v.total, status: demo ? 'demonstracao' : 'pendente', ambiente: f.ambiente };
  f.proximo = n + 1; db.notas.push(nota); v.nota = nota.id;
  registra(`NFC-e nº ${n} ${demo ? '(demonstração, sem valor fiscal)' : 'enviada para autorização'} da venda nº ${v.n}`, 'fiscal');
  return nota;
}
function danfe(nota) {
  const v = db.vendas.find((x) => x.id === nota.venda), f = db.fiscal, demo = nota.status === 'demonstracao';
  const url = `https://www.${nota.ambiente === '1' ? '' : 'homologacao.'}nfce.fazenda.sp.gov.br/qrcode?p=${nota.chave}|2|${nota.ambiente}|${f.cscId || '1'}`;
  abrir(`<h2>NFC-e nº ${nota.numero}</h2><p class="mudo">${demo ? 'Demonstração: esta nota é simulada e não tem valor fiscal.' : nota.status === 'autorizada' ? 'Autorizada pela SEFAZ.' : nota.status === 'cancelada' ? 'Cancelada.' : 'Aguardando a autorização da SEFAZ.'}</p>
    <div class="recibo" style="font-family:ui-monospace,Consolas,monospace;font-size:12.5px">${demo ? '<p style="text-align:center;font-weight:700;color:var(--mal);margin:0 0 8px">DEMONSTRAÇÃO · SEM VALOR FISCAL</p>' : ''}
      <p style="text-align:center;margin:0"><b>${t(f.razao || db.loja.nome)}</b><br>CNPJ ${t(f.cnpj || '00.000.000/0000-00')} · IE ${t(f.ie || 'ISENTO')}<br>${t([f.rua, f.numero, f.bairro, f.cidade].filter(Boolean).join(', ') || db.loja.cidade)}</p><hr>
      <p style="text-align:center;margin:0">Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</p><hr>
      ${v.itens.map((x, i) => `<div class="linha-r"><span>${pad(i + 1)} ${t(x.nome)} ${t(x.cor)} ${t(x.tam)}<br>${x.qtd} UN × ${din(x.preco)}</span><span>${din(x.preco * x.qtd)}</span></div>`).join('')}<hr>
      <div class="linha-r"><span>Qtd. total de itens</span><span>${v.itens.reduce((a, x) => a + x.qtd, 0)}</span></div>${v.desc ? `<div class="linha-r"><span>Descontos</span><span>${din(v.desc)}</span></div>` : ''}<div class="linha-r"><b>Valor a pagar</b><b>${din(v.total)}</b></div>
      ${v.pag.map((x) => `<div class="linha-r"><span>${FORMAS[x.f]}</span><span>${din(x.v)}</span></div>`).join('')}<hr>
      <p style="margin:0">Consulte pela chave de acesso em ${nota.ambiente === '1' ? 'www.nfce.fazenda.sp.gov.br/consulta' : 'www.homologacao.nfce.fazenda.sp.gov.br/consulta'}</p><p style="margin:4px 0;word-break:break-all"><b>${nota.chave.replace(/(\d{4})/g, '$1 ').trim()}</b></p>
      <p style="margin:0">${nota.cpf ? `CONSUMIDOR CPF ${nota.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}` : 'CONSUMIDOR NÃO IDENTIFICADO'}</p><p style="margin:4px 0">NFC-e nº ${nota.numero} Série ${nota.serie} ${dataBR(nota.data)} ${horaBR(nota.data)}${nota.ambiente === '2' ? '<br>EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO · SEM VALOR FISCAL' : ''}</p>
      <div style="width:150px;margin:8px auto">${qrSVG(url, 150)}</div><p style="text-align:center;margin:0;font-size:11px">Tributos aproximados conforme Lei 12.741/2012: consulte o seu contador</p></div>
    <div class="acoes"><button type="button" class="bt" data-imp>Imprimir</button>${nota.status !== 'cancelada' && dias(nota.data) === 0 ? `<button type="button" class="bt perigo" data-cancela-nota="${nota.id}">Cancelar nota</button>` : ''}</div>`, (j) => {
    $('[data-imp]', j).onclick = () => { document.body.classList.add('imprime-janela'); print(); };
  });
}

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
  if (!db.caixa.aberto && auto) { db.caixa.aberto = { id: uid('cx'), abertura: agora(), inicial: 0, movs: [] }; toast('Caixa aberto automaticamente com R$ 0,00. Ajuste o troco inicial em Caixa.'); }
  return db.caixa.aberto;
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
  const despesas = [db.caixa.aberto, ...db.caixa.historico].filter(Boolean).flatMap((c) => c.movs || []).filter((m) => m.t === 'despesa' && dentro(m.data)).reduce((s, m) => s + m.v, 0);
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
  if (!db.caixa.aberto) l.push({ ic: 'ac', txt: 'O caixa de hoje ainda não foi aberto', ir: '#caixa' });
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
  venda: ['ir-vender', 'Venda', 'abre o caixa de venda'], cliente: ['nova-cli', 'Cliente', 'nome, WhatsApp e limite do fiado'], caderno: ['fiado-caderno', 'Fiado do caderno', 'dívida antiga anotada à mão'],
  receber: ['receber-escolher', 'Pagamento recebido', 'baixa no fiado de uma cliente'], peca: ['nova-peca', 'Peça', 'com cores, tamanhos e quantidades'], compra: ['nova-compra', 'Chegada de mercadoria', 'entrada no estoque'],
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
  $('#loja-nome').textContent = L.nome || 'Sua loja'; $('#loja-slogan').textContent = L.slogan || '';
  document.documentElement.dataset.tema = db.tema || 'ameixa';
  const u = eu(), te = $('#topo-eu'); if (te) { te.innerHTML = u.foto ? `<img src="${t(u.foto)}" alt="">` : t(iniciais(u.nome)); te.title = `${u.nome} · meu perfil`; }
  const at = atrasadas().length, bx = produtosBaixos().length, av = avisos().length;
  const nf = $('#n-fiado'); nf.hidden = !at; nf.textContent = at;
  const ne = $('#n-estoque'); ne.hidden = !bx; ne.textContent = bx;
  const na = $('#n-avisos'); na.hidden = !av; na.textContent = av;
}

// ------------------------------------------------------------------ telas
let estado = { fiadoFiltro: 'todos', estoqueAba: 'pecas', busca: '', relPer: 'mes', relDe: '', relAte: '', vendAba: 'vender', cliBusca: '', sacola: [], vCli: '', desc: 0, pag: [{ f: 'pix', v: 0 }], parc: { n: 1, int: 'mes', prim: somaMes(hoje(), 1) }, excecao: null };
const GUIA = [
  ['Primeiros passos (10 minutos)', [
    ['Ponha a cara da sua loja', 'Em Configurações, “A marca da sua loja”: logo, nome, frase, WhatsApp, chave Pix e a cor do sistema. Tudo aparece no topo, nos recibos e nas cobranças.'],
    ['Defina as regras do fiado', 'Em Configurações, “Regras do fiado”: o limite da cliente nova, quando avisar que está perto do limite e com quantos dias de atraso o fiado bloqueia sozinho. Juros e multa ficam desligados, a não ser que você ligue.'],
    ['Passe o seu caderno', 'Em Fiado, “Adicionar” e “Passar o caderno inteiro”: uma linha por cliente, com nome, WhatsApp, quanto deve e quando vence. Se tiver planilha, use “Clientes de uma planilha”.'],
    ['Cadastre as peças', 'Em Estoque, “Adicionar” e “Peça”: nome, categoria, custo, preço, foto, tamanhos (atalhos de PP a G5 e de 34 a 56), cores e quantas tem de cada. Também dá para importar de planilha.'],
    ['Chame a equipe', 'No Painel do dono, “Adicionar” e “Pessoa da equipe”. Marque o que cada vendedora pode fazer (ver custo, dar desconto, mexer no caixa) e a comissão dela.'],
  ]],
  ['O dia a dia', [
    ['Abra o caixa', 'Em Caixa do dia, digite o troco que está na gaveta. Se esquecer, ele abre sozinho na primeira venda.'],
    ['Venda', 'Em Vender, toque na peça (ou passe o leitor de código de barras), escolha cor e tamanho, ponha a cliente e o pagamento. Dá para dividir: parte no Pix, parte no fiado. O estoque baixa na hora.'],
    ['Venda no fiado', 'Escolha “Fiado”, as parcelas e o 1º vencimento. Se a cliente estiver atrasada ou sem limite, o Peplo avisa; só a senha da dona libera a exceção.'],
    ['Receba e cobre', 'Em Fiado, “Receber” baixa o pagamento (pode ser só uma parte) e gera o recibo para mandar no WhatsApp. “Cobrar” abre o WhatsApp da cliente com a mensagem pronta.'],
    ['Troque ou devolva', 'Em Vendas e trocas, abra a venda e toque em “Troca ou devolução”: a peça volta ao estoque (ou vai como avaria) e o valor vira crédito, abate do fiado ou volta em dinheiro.'],
    ['Feche o caixa', 'No fim do dia, “Fechar caixa”: conte o dinheiro da gaveta e o Peplo mostra se bateu ou a diferença.'],
  ]],
  ['Estoque e compras', [
    ['Mercadoria chegou', 'Em Compras, “Adicionar” e “Chegada de mercadoria”: escolha a peça e digite quantas chegaram de cada cor e tamanho.'],
    ['Pedido de atacado', 'Na viagem de compra, faça o “Pedido de compra”. Quando chegar, toque em “Registrar chegada” (pode chegar em partes). O Peplo mostra a margem do lote.'],
    ['Etiquetas', 'Em Estoque, toque em “Etiquetas” na peça: saem com o preço e o código de barras de cada cor e tamanho.'],
    ['Liquidação', 'Em Estoque, aba Liquidação: escolha a categoria, o desconto e as datas. No período, o Vender já usa o preço com desconto. Use a aba Parados para escolher o que liquidar.'],
  ]],
  ['Números e controle', [
    ['Relatórios ao vivo', 'Em Relatórios: diário, semanal e mensal. Vendas, lucro bruto, dinheiro que entrou, fiado, inadimplência e o que mais vende.'],
    ['Painel do dono', 'Meta do mês com a projeção, vendas e comissão de cada vendedora, quem pode o quê e tudo o que aconteceu na loja.'],
    ['Cartão', 'Em Configurações, ponha as taxas da sua maquininha. No Caixa do dia, “Conferir com o extrato” mostra o que bateu.'],
    ['Cópia de segurança', 'Com a assinatura, tudo fica na nuvem e aparece no celular e no computador. Em Configurações você também baixa uma cópia em arquivo quando quiser.'],
  ]],
];
const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };

const TELAS = {
  inicio() {
    const n = numeros(hoje(), hoje()), ab = totalAberto(), ven = totalVencido(), dev = devedoras().length, at = atrasadas();
    const pr = parados(), bxp = produtosBaixos(), pecas = ativos().reduce((s, p) => s + totalPecas(p), 0);
    const kpi = (ic, cls, rot, val, sub, ir) => `<a class="cartao kpi ${cls}" href="${ir}"><span class="kpi-ic ${cls === 'mal' ? 'mal' : ic === 'moedas' ? 'ouro' : ''}">${ico(ic)}</span><span><small>${rot}</small><b data-conta="${val}">${din(val)}</b><em>${sub}</em></span></a>`;
    return `<section class="ola"><h1>${saudacao()}${db.loja.dono ? `, ${t(db.loja.dono)}` : ''}</h1><p>${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} · resumo da ${t(db.loja.nome)} · <span class="vivo"><i></i>ao vivo</span></p><div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">${addBt('venda', 'cliente', 'caderno', 'receber', 'peca', 'compra', 'despesa')}<a class="bt" href="#fiado/vencidas">${ico('zap')}Cobrar atrasadas</a></div></section>
      <div class="grade g4 kpis cascata" style="margin-bottom:16px">
        ${kpi('bolsa', '', 'Vendido hoje', n.liquido, `${n.vs.length} ${n.vs.length === 1 ? 'venda' : 'vendas'}${pode('custo') ? ` · lucro bruto ${din(n.lucro)}` : ''}`, '#relatorios')}
        ${kpi('moedas', '', 'Recebido hoje', n.recebido, `${din(n.recebidoFiado)} veio do fiado`, '#caixa')}
        ${kpi('cartao', '', 'Fiado em aberto', ab, `${dev} ${dev === 1 ? 'cliente' : 'clientes'}`, '#fiado')}
        ${kpi('alerta', ven ? 'mal' : '', 'Fiado vencido', ven, `${at.length} ${at.length === 1 ? 'cliente' : 'clientes'}`, '#fiado/vencidas')}
      </div>
      <div class="grade g-21 cascata" style="margin-bottom:16px">
        <section class="cartao"><div class="cartao-cab"><h2>${ico('sino')}Atenção à sua loja</h2></div>${avisos().map((a) => `<a class="aviso" href="${a.ir}"><span class="ic ${a.ic}">${ico(a.ic === 'mal' ? 'alerta' : a.ic === 'atn' ? 'caixa' : 'cabide')}</span><span>${t(a.txt)}</span><span class="seta">${ico('seta')}</span></a>`).join('') || '<p class="vazio"><b>Tudo em ordem</b>Nenhuma pendência na loja agora.</p>'}</section>
        <section class="cartao"><div class="cartao-cab"><h2>${ico('gente')}Quem está me devendo</h2><a class="link" href="#fiado">Ver todas</a></div>
          ${at.length ? `<ul class="lista">${at.slice(0, 5).map((c) => `<li><a class="cresce" href="#cliente/${c.id}" style="text-decoration:none;color:inherit"><b>${t(c.nome)}</b><small>${din(aberto(c.id))} em aberto · ${maiorAtraso(c.id)} dias de atraso</small></a><span class="tag mal num">${din(vencido(c.id))}</span><a class="bt pq zap" href="${zap(c.tel, msg('atraso', c))}" target="_blank" rel="noopener" data-cobra="${c.id}" aria-label="Cobrar ${t(c.nome)} no WhatsApp">${ico('zap')}</a></li>`).join('')}</ul>` : '<p class="vazio"><b>Ninguém em atraso</b>Todas as clientes do fiado estão em dia.</p>'}
        </section>
      </div>
      <div class="grade g2 cascata">
        <section class="cartao"><div class="cartao-cab"><h2>${ico('cabide')}Peças paradas</h2><a class="link" href="#estoque/parados">Ver todas</a></div>
          <p class="mudo" style="margin:-6px 0 8px;font-size:13.5px">Sem venda há mais de ${db.cfg.parados[1]} dias · ${din(pr.reduce((s, x) => s + totalPecas(x.p) * x.p.custo, 0))} de dinheiro parado</p>
          ${pr.length ? `<ul class="lista">${pr.slice(0, 4).map((x) => `<li>${iconePeca(x.p)}<span class="cresce"><b>${t(x.p.nome)}</b><small>${t(x.p.cod)} · ${totalPecas(x.p)} un.</small></span><span class="tag ${x.tag}">${x.dias} dias</span></li>`).join('')}</ul>` : '<p class="vazio"><b>Nada parado</b>Todas as peças venderam nos últimos dias.</p>'}
        </section>
        <section class="cartao"><div class="cartao-cab"><h2>${ico('caixa')}Estoque baixo</h2><a class="link" href="#estoque/baixo">Ver todos</a></div>
          ${bxp.length ? bxp.slice(0, 2).map((p) => `<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px">${iconePeca(p)}<div style="min-width:0;flex:1"><b>${t(p.nome)}</b><small class="mudo" style="display:block;margin-bottom:6px">${t(p.cod)} · mínimo ${p.min} por tamanho</small>${grade(p)}</div></div>`).join('') : '<p class="vazio"><b>Estoque em dia</b>Nenhum tamanho abaixo do mínimo.</p>'}
          <p class="mudo" style="margin:4px 0 0;font-size:13px">${pecas} peças na loja · ${din(ativos().reduce((s, p) => s + totalPecas(p) * p.custo, 0))} pelo custo</p>
        </section>
      </div>`;
  },

  vender() {
    const sac = estado.sacola, sub = sac.reduce((s, x) => s + x.preco * x.qtd, 0), total = Math.max(0, sub - estado.desc);
    const c = acharCli(estado.vCli), pago = estado.pag.reduce((s, x) => s + (x.v || 0), 0), falta = total - pago;
    const fiadoV = estado.pag.filter((x) => x.f === 'fiado').reduce((s, x) => s + (x.v || 0), 0);
    const pf = fiadoV ? podeFiado(c, fiadoV) : { ok: true };
    const cred = c ? c.credito || 0 : 0;
    const busca = sa(estado.busca), lista = ativos().filter((p) => !busca || sa(`${p.nome} ${p.cod} ${p.cat}`).includes(busca));
    const formas = Object.entries(FORMAS).filter(([k]) => k !== 'loja' || cred > 0);
    return `<div class="cab"><div><h1>Vender</h1><p>Toque na peça, escolha cor e tamanho. O estoque baixa na hora da venda.</p></div><div class="acoes"><a class="bt" href="#vendas">${ico('recibo')}Vendas e trocas</a>${addBt('cliente', 'peca', 'caderno')}</div></div>
      <div class="pdv">
        <section>
          <label class="busca" style="display:block;margin-bottom:14px"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span class="sr">Buscar peça</span><input id="pdv-busca" placeholder="Buscar peça ou passar o leitor de código de barras" value="${t(estado.busca)}" autocomplete="off"></label>
          <div class="produtos cascata">${lista.map((p) => { const tot = totalPecas(p); return `<button type="button" class="cartao prod" data-escolher="${p.id}" ${tot ? '' : 'disabled style="opacity:.55"'}><span class="prod-topo">${iconePeca(p)}<div><b>${t(p.nome)}</b><small>${t(p.cod)} · ${p.cores.length} ${p.cores.length === 1 ? 'cor' : 'cores'} · ${p.tam.join(' ')}</small></div></span><span class="prod-rodape"><span>${tot ? `${tot} em estoque` : 'Esgotada'}</span>${precoAtual(p) < p.preco ? `<b><s class="mudo" style="font-weight:500;font-size:13px">${din(p.preco)}</s> ${din(precoAtual(p))}</b>` : `<b>${din(p.preco)}</b>`}</span></button>`; }).join('') || '<p class="vazio"><b>Nenhuma peça encontrada</b>Confira o nome ou cadastre a peça em Estoque.</p>'}</div>
        </section>
        <aside class="cartao sacola" aria-label="Sacola">
          <div class="cartao-cab"><h2>${ico('bolsa')}Sacola</h2>${sac.length ? '<button type="button" class="link" data-acao="esvaziar">Esvaziar</button>' : ''}</div>
          ${sac.length ? `<ul class="itens-sacola">${sac.map((x, i) => `<li><span style="flex:1;min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t(x.nome)}</b><small class="mudo"><span class="bolinha" style="background:${t(x.h)}"></span>${t(x.cor)} · ${t(x.tam)} · ${din(x.preco)}</small></span><span class="q"><button type="button" data-q="${i}" data-d="-1" aria-label="Menos">−</button><b>${x.qtd}</b><button type="button" data-q="${i}" data-d="1" aria-label="Mais">+</button></span></li>`).join('')}</ul>` : '<p class="vazio" style="padding:14px 0"><b>Sacola vazia</b>Escolha as peças ao lado.</p>'}
          <div class="campos" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">
            <label class="campo">Cliente<input id="v-cli" list="dl-cli" value="${t(estado.vCli)}" placeholder="Opcional (obrigatória no fiado)" autocomplete="off">${listaClientes()}</label>
            <label class="campo">Desconto (R$)<input id="v-desc" inputmode="decimal" value="${campoDin(estado.desc)}" placeholder="0,00"></label>
          </div>
          ${c ? `<p class="mudo" style="font-size:13px;margin:6px 0 0">${t(c.nome)} · <span class="tag ${situacao(c).tag}">${situacao(c).txt}</span> · disponível no fiado ${din(Math.max(0, (c.limite || 0) - aberto(c.id)))}${cred ? ` · crédito na loja ${din(cred)}` : ''}</p>` : estado.vCli ? '<p class="mudo" style="font-size:13px;margin:6px 0 0">Cliente nova: será cadastrada ao finalizar.</p>' : ''}
          <div class="total"><span>Total</span><b data-total>${din(total)}</b></div>
          <p class="campo" style="margin:0 0 6px">Pagamento</p>
          ${estado.pag.map((x, i) => `<div class="pag-linha"><select data-pf="${i}" aria-label="Forma de pagamento">${formas.map(([k, n]) => `<option value="${k}" ${x.f === k ? 'selected' : ''}>${n}</option>`).join('')}</select><input data-pv="${i}" inputmode="decimal" value="${campoDin(x.v)}" placeholder="0,00" aria-label="Valor">${estado.pag.length > 1 ? `<button type="button" class="x" data-tira="${i}" aria-label="Tirar">×</button>` : '<span></span>'}</div>${x.f === 'credito' ? `<label class="campo" style="margin:-2px 0 8px;max-width:200px">Parcelas no cartão<select data-pp="${i}">${Array.from({ length: 10 }, (_, k) => `<option value="${k + 1}" ${(x.parc || 1) === k + 1 ? 'selected' : ''}>${k + 1}×${k ? '' : ' (à vista)'}</option>`).join('')}</select></label>` : ''}`).join('')}
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button type="button" class="link" data-acao="dividir">+ Dividir em outra forma</button>${falta !== 0 && sac.length ? `<button type="button" class="link" data-acao="completar">Pôr o que falta (${din(falta)})</button>` : ''}</div>
          ${fiadoV ? `<div class="campos" style="margin-top:12px;grid-template-columns:repeat(3,minmax(0,1fr))"><label class="campo">Parcelas<select id="p-n">${Array.from({ length: 12 }, (_, i) => `<option ${estado.parc.n === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label><label class="campo">A cada<select id="p-int"><option value="mes" ${estado.parc.int === 'mes' ? 'selected' : ''}>mês</option><option value="15" ${estado.parc.int === '15' ? 'selected' : ''}>15 dias</option><option value="7" ${estado.parc.int === '7' ? 'selected' : ''}>semana</option></select></label><label class="campo">1º vencimento<input id="p-prim" type="date" value="${estado.parc.prim}"></label></div>
            <p class="mudo" style="font-size:13px;margin:6px 0 0">${estado.parc.n}× de ${din(Math.floor(fiadoV / estado.parc.n))} no fiado</p>` : ''}
          ${falta > 0 && sac.length ? `<div class="caixa-aviso atn">Faltam ${din(falta)} para fechar o total.</div>` : falta < 0 ? `<div class="caixa-aviso atn">Pagamento passa ${din(-falta)} do total${estado.pag.some((x) => x.f === 'dinheiro') ? ` (troco de ${din(-falta)})` : ''}.</div>` : ''}
          ${fiadoV && !pf.ok ? `<div class="caixa-aviso mal">${t(pf.motivo)}${pf.excecao ? (estado.excecao ? `<br><b>Exceção liberada:</b> ${t(estado.excecao)}` : ' <button type="button" class="link" data-acao="excecao">Liberar exceção</button>') : ''}</div>` : ''}
          ${db.fiscal.usar ? `<div class="campos" style="margin-top:12px;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:end"><label class="troca" style="padding:0"><span>Emitir NFC-e</span><input type="checkbox" id="v-nota" ${estado.nota === false ? '' : 'checked'}></label><label class="campo">CPF na nota (opcional)<input id="v-cpf" inputmode="numeric" value="${t(estado.cpf || '')}" placeholder="000.000.000-00"></label></div>${!fiscalPronto() ? '<p class="mudo" style="font-size:12.5px;margin:6px 0 0">Complete os dados fiscais em Configurações para emitir.</p>' : !emiteAqui() ? '<p class="mudo" style="font-size:12.5px;margin:6px 0 0">A emissão de verdade está em liberação. Avisaremos quando estiver pronta.</p>' : ''}` : ''}
          <button type="button" class="bt cheio largo" style="margin-top:12px;min-height:50px" data-acao="finalizar" ${sac.length ? '' : 'disabled'}>${ico('ok')}Finalizar venda</button>
        </aside>
      </div>`;
  },

  notas() {
    if (!db.fiscal.usar) return `<div class="cab"><div><h1>Notas fiscais</h1><p>A nota fiscal está desligada. Ligue em Configurações, se a sua loja precisa emitir NFC-e.</p></div><div class="acoes"><a class="bt cheio" href="#config">Ir para Configurações</a></div></div>`;
    const l = db.notas.slice().reverse();
    return `<div class="cab"><div><h1>Notas fiscais</h1><p>NFC-e emitidas nas vendas. ${db.fiscal.ambiente === '2' ? 'Ambiente de homologação (teste, sem valor fiscal).' : 'Ambiente de produção.'}</p></div><div class="acoes"><button type="button" class="bt" data-acao="xml-notas">Baixar para o contador</button><a class="bt cheio" href="#vender">${ico('mais')}Nova venda</a></div></div>
      <section class="cartao"><div class="tabela-wrap"><table class="tabela cartoes"><thead><tr><th>Nº</th><th>Data</th><th>Venda</th><th>CPF</th><th class="n">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${l.map((n) => { const v = db.vendas.find((x) => x.id === n.venda) || {}; const st = { demonstracao: ['ac', 'Demonstração'], pendente: ['atn', 'Aguardando SEFAZ'], autorizada: ['ok', 'Autorizada'], cancelada: ['', 'Cancelada'], rejeitada: ['mal', 'Rejeitada'] }[n.status] || ['', n.status]; return `<tr><td>${n.numero}</td><td data-r="Data">${dataBR(n.data)} ${horaBR(n.data)}</td><td data-r="Venda">nº ${v.n || '—'}</td><td data-r="CPF">${n.cpf ? '•••' + n.cpf.slice(-4) : '—'}</td><td class="n">${din(n.valor)}</td><td><span class="tag ${st[0]}">${st[1]}</span></td><td><button type="button" class="bt pq" data-nota="${n.id}">Abrir</button></td></tr>`; }).join('') || '<tr><td colspan="7"><p class="vazio"><b>Nenhuma nota ainda</b>Na próxima venda, deixe marcado “Emitir NFC-e”.</p></td></tr>'}</tbody></table></div></section>`;
  },

  vendas() {
    const l = db.vendas.slice().sort((a, b) => b.data.localeCompare(a.data)).slice(0, 80);
    return `<div class="cab"><div><h1>Vendas e trocas</h1><p>As últimas vendas. Toque numa venda para ver o comprovante, trocar ou devolver.</p></div><div class="acoes">${addBt('venda', 'cliente', 'caderno')}</div></div>
      <section class="cartao"><div class="tabela-wrap"><table class="tabela cartoes"><thead><tr><th>Nº</th><th>Data</th><th>Cliente</th><th>Peças</th><th>Pagamento</th><th class="n">Total</th><th></th></tr></thead><tbody>
      ${l.map((v) => `<tr><td data-r="Nº">${v.n}</td><td data-r="Data">${dataBR(v.data)} ${horaBR(v.data)}</td><td data-r="Cliente">${t(v.cli ? (cli(v.cli) || {}).nome : 'Sem cliente')}</td><td data-r="Peças">${v.itens.reduce((s, x) => s + x.qtd, 0)}</td><td data-r="Pagamento">${v.pag.map((x) => FORMAS[x.f]).join(' + ')}${v.devol && v.devol.length ? ' <span class="tag ac">troca/devolução</span>' : ''}${v.cancelada ? ' <span class="tag mal">cancelada</span>' : ''}</td><td class="n">${din(v.total)}</td><td><button type="button" class="bt pq" data-venda="${v.id}">Abrir</button></td></tr>`).join('')}
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
    return `<div class="cab"><div><h1>Fiado</h1><p>Quem deve, quanto, desde quando. Cobre com um toque e receba em parte ou tudo.</p></div><div class="acoes"><button type="button" class="bt" data-acao="exportar-fiado">Planilha</button>${addBt('cadernoTodo', 'caderno', 'receber', 'cliente', 'impCli')}</div></div>
      <div class="grade g4 kpis cascata" style="margin-bottom:18px">
        <div class="cartao kpi"><span class="kpi-ic">${ico('cartao')}</span><span><small>A receber</small><b data-conta="${totalAberto()}">${din(totalAberto())}</b><em>${devedoras().length} clientes</em></span></div>
        <div class="cartao kpi ${ven ? 'mal' : ''}"><span class="kpi-ic mal">${ico('alerta')}</span><span><small>Vencido</small><b data-conta="${ven}">${din(ven)}</b><em>${atrasadas().length} em atraso</em></span></div>
        <div class="cartao kpi"><span class="kpi-ic ouro">${ico('calendario')}</span><span><small>Vence em 7 dias</small><b data-conta="${prox7}">${din(prox7)}</b><em>lembre antes de vencer</em></span></div>
        <div class="cartao kpi ok"><span class="kpi-ic ok">${ico('moedas')}</span><span><small>Recebido no mês</small><b data-conta="${recMes}">${din(recMes)}</b><em>${rec}% recuperado</em></span></div>
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
    return `<a href="#fiado" class="link" style="display:inline-block;margin-bottom:12px">← Fiado</a>
      <div class="cab"><div><h1>${t(c.nome)}</h1><p>${t(c.tel ? c.tel.replace(/^(\d{2})(\d{5})(\d+)$/, '($1) $2-$3') : 'Sem telefone')}${c.nasc ? ` · aniversário ${dataBR(c.nasc).slice(0, 5)}` : ''} · <span class="tag ${s.tag}">${s.txt}</span></p></div>
        <div class="acoes">${ab ? `<a class="bt zap" href="${zap(c.tel, msg(modeloCobranca(c), c))}" target="_blank" rel="noopener" data-cobra="${c.id}">${ico('zap')}Cobrar</a><button type="button" class="bt cheio" data-receber="${c.id}">Receber pagamento</button>` : ''}<button type="button" class="bt" data-editar-cli="${c.id}">Editar</button></div></div>
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
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="bt pq" data-limite="${c.id}">Alterar limite</button><button type="button" class="bt pq ${c.bloqueado ? '' : 'perigo'}" data-bloq="${c.id}">${c.bloqueado ? 'Desbloquear fiado' : 'Bloquear fiado'}</button><button type="button" class="bt pq" data-extrato="${c.id}">${ico('recibo')}Extrato</button></div>
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
    return `<div class="cab"><div><h1>Clientes</h1><p>${db.clientes.length} clientes. A etiqueta mostra na hora quem tem pendência.</p></div><div class="acoes">${addBt('cliente', 'cadernoTodo', 'caderno', 'impCli')}</div></div>
      <label class="busca" style="display:block;margin-bottom:14px"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span class="sr">Buscar cliente</span><input id="cli-busca" placeholder="Buscar por nome ou telefone" value="${t(estado.cliBusca)}" autocomplete="off"></label>
      <section class="cartao"><ul class="lista">${l.map((c) => { const s = situacao(c); return `<li><a class="cresce" href="#cliente/${c.id}" style="text-decoration:none;color:inherit"><b>${t(c.nome)}</b><small>${t(c.tel)} · ${aberto(c.id) ? `${din(aberto(c.id))} em aberto` : 'nada em aberto'} · limite ${din(c.limite || 0)}</small></a><span class="tag ${s.tag}">${s.txt}</span></li>`; }).join('') || '<p class="vazio"><b>Nenhuma cliente</b>Cadastre com o botão acima.</p>'}</ul></section>`;
  },

  estoque(sub) {
    const a = sub || estado.estoqueAba;
    const tabs = [['pecas', 'Peças'], ['baixo', `Estoque baixo (${produtosBaixos().length})`], ['parados', `Parados (${parados().length})`], ['promos', 'Liquidação'], ['movs', 'Movimentações']];
    let corpo = '';
    if (a === 'pecas') {
      const b = sa(estado.busca), l = ativos().filter((p) => !b || sa(`${p.nome} ${p.cod} ${p.cat}`).includes(b));
      corpo = `<label class="busca" style="display:block;margin-bottom:14px"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span class="sr">Buscar peça</span><input id="est-busca" placeholder="Buscar peça" value="${t(estado.busca)}" autocomplete="off"></label>
        <div class="produtos cascata">${l.map((p) => `<article class="cartao prod" data-peca="${p.id}" tabindex="0"><div class="prod-topo">${iconePeca(p)}<div><b>${t(p.nome)}</b><small>${t(p.cod)} · ${t(p.cat)}</small></div></div>${grade(p)}<div class="prod-rodape"><span>${totalPecas(p)} peças${pode('custo') ? ` · custo ${din(p.custo)}` : ''}</span><span style="display:flex;gap:8px;align-items:center"><button type="button" class="bt pq" data-etiquetas="${p.id}">Etiquetas</button><b>${din(precoAtual(p))}</b></span></div></article>`).join('') || '<p class="vazio"><b>Nenhuma peça</b>Cadastre a primeira com “Nova peça”.</p>'}</div>`;
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
    if (a === 'movs') {
      const TIPO = { venda: ['', 'Venda'], entrada: ['ok', 'Entrada'], ajuste: ['atn', 'Ajuste'], devolucao: ['ac', 'Devolução'], avaria: ['mal', 'Avaria'], troca: ['ac', 'Troca'] };
      const l = db.movs.slice().sort((x, y) => y.data.localeCompare(x.data)).slice(0, 120);
      corpo = `<section class="cartao"><div class="tabela-wrap"><table class="tabela cartoes"><thead><tr><th>Data</th><th>Peça</th><th>Cor · tamanho</th><th>Tipo</th><th class="n">Qtd.</th><th>Motivo</th></tr></thead><tbody>${l.map((m) => { const p = prod(m.p) || { nome: '?' }, tp = TIPO[m.tipo] || ['', m.tipo]; return `<tr><td data-r="Data">${dataBR(m.data)} ${horaBR(m.data)}</td><td><b>${t(p.nome)}</b></td><td data-r="Variação">${t(m.cor)} · ${t(m.tam)}</td><td><span class="tag ${tp[0]}">${tp[1]}</span></td><td class="n" data-r="Quantidade">${m.q > 0 ? '+' : ''}${m.q}</td><td data-r="Motivo">${t(m.motivo || m.ref || '')}</td></tr>`; }).join('')}</tbody></table></div></section>`;
    }
    return `<div class="cab"><div><h1>Estoque</h1><p>${ativos().reduce((s, p) => s + totalPecas(p), 0)} peças · ${din(ativos().reduce((s, p) => s + totalPecas(p) * p.custo, 0))} pelo custo · cada cor e tamanho contado separado.</p></div><div class="acoes"><button type="button" class="bt" data-acao="exportar-estoque">Planilha</button>${addBt('peca', 'compra', 'pedido', 'promo', 'impPeca')}</div></div>
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
    return `<div class="cab"><div><h1>Compras e fornecedores</h1><p>Pedido feito na viagem de compra, chegada por cor e tamanho, margem de cada lote e quem são os melhores fornecedores.</p></div><div class="acoes">${addBt('pedido', 'compra', 'peca', 'forn')}</div></div>
      ${abas(tabs, aba, 'data-ca')}${corpo}`;
  },

  caixa() {
    const cx = db.caixa.aberto;
    const hist = `<section class="cartao" style="margin-top:16px"><div class="cartao-cab"><h2>Fechamentos anteriores</h2></div><ul class="lista">${db.caixa.historico.slice().reverse().slice(0, 12).map((h) => `<li><span class="cresce"><b>${dataBR(h.abertura)}</b><small>aberto ${horaBR(h.abertura)} · fechado ${horaBR(h.fechamento)}${h.obs ? ` · ${t(h.obs)}` : ''}</small></span><span class="tag ${h.dif ? 'mal' : 'ok'}">${h.dif ? `diferença ${din(h.dif)}` : 'bateu'}</span></li>`).join('') || '<p class="mudo">Nenhum fechamento ainda.</p>'}</ul></section>`;
    if (!cx) return `<div class="cab"><div><h1>Caixa</h1><p>Abra o caixa com o troco que está na gaveta.</p></div></div>
      <section class="cartao" style="max-width:520px"><label class="campo">Troco inicial (R$)<input id="cx-ini" inputmode="decimal" placeholder="200,00"></label><button type="button" class="bt cheio largo" style="margin-top:12px" data-acao="abrir-caixa">Abrir caixa</button></section>${hist}`;
    const r = resumoCaixa(cx), linha = (n, v, cls = '') => `<li><span class="cresce">${n}</span><b class="num ${cls}">${din(v)}</b></li>`;
    return `<div class="cab"><div><h1>Caixa do dia</h1><p>Aberto às ${horaBR(cx.abertura)} de ${dataBR(cx.abertura)} · ${r.vendas} vendas. Pix, cartão e fiado não entram na gaveta.</p></div><div class="acoes">${addBt('despesa', 'retirada', 'reforco', 'receber')}<button type="button" class="bt" data-acao="fechar-caixa">Fechar caixa</button></div></div>
      <div class="grade g4 kpis cascata" style="margin-bottom:16px">
        <div class="cartao kpi"><span class="kpi-ic ouro">${ico('moedas')}</span><span><small>Dinheiro esperado na gaveta</small><b data-conta="${r.esperado}">${din(r.esperado)}</b><em>troco ${din(cx.inicial)}</em></span></div>
        <div class="cartao kpi"><span class="kpi-ic">${ico('cartao')}</span><span><small>Pix</small><b>${din(r.pix + r.recPix)}</b><em>vendas + fiado recebido</em></span></div>
        <div class="cartao kpi"><span class="kpi-ic">${ico('cartao')}</span><span><small>Cartão</small><b>${din(r.debito + r.credito + r.recCartao)}</b><em>débito ${din(r.debito)} · crédito ${din(r.credito)}</em></span></div>
        <div class="cartao kpi"><span class="kpi-ic mal">${ico('recibo')}</span><span><small>Vendido no fiado</small><b>${din(r.fiado)}</b><em>entra quando receber</em></span></div>
      </div>
      <div class="grade g2">
        <section class="cartao"><div class="cartao-cab"><h2>Conta da gaveta</h2></div><ul class="lista">${linha('Troco inicial', cx.inicial)}${linha('Vendas em dinheiro', r.dinheiro)}${linha('Fiado recebido em dinheiro', r.recDinheiro)}${linha('Reforços', r.reforcos)}${linha('Despesas pagas em dinheiro', -r.despDinheiro, 'mudo')}${linha('Retiradas', -r.retiradas, 'mudo')}${linha('Reembolsos em dinheiro', -r.reembolsos, 'mudo')}<li><span class="cresce"><b>Esperado na gaveta</b></span><b class="num" style="font-size:20px">${din(r.esperado)}</b></li></ul></section>
        <section class="cartao"><div class="cartao-cab"><h2>Lançamentos do caixa</h2></div><ul class="lista">${cx.movs.slice().reverse().map((m) => `<li><span class="cresce"><b>${t(m.desc || m.t)}</b><small>${horaBR(m.data)} · ${{ despesa: 'Despesa', retirada: 'Retirada', reforco: 'Reforço', reembolso: 'Reembolso' }[m.t]}${m.f && m.f !== 'dinheiro' ? ` · ${FORMAS[m.f]}` : ''}</small></span><b class="num">${m.t === 'reforco' ? '+' : '−'}${din(m.v)}</b></li>`).join('') || '<p class="mudo">Nenhuma despesa, retirada ou reforço hoje.</p>'}</ul></section>
      </div>
      <section class="cartao" style="margin-top:16px"><div class="cartao-cab"><h2>${ico('cartao')}Cartão: a receber e conferência</h2><button type="button" class="bt pq" data-acao="conferir-extrato">Conferir com o extrato</button></div>${(() => { const l = vendasCartao(45), aRec = l.filter((x) => x.prev >= hoje()); return `<div class="grade g4 kpis" style="margin-bottom:12px"><div class="kpi"><span><small>Cartão a receber</small><b>${din(aRec.reduce((s2, x) => s2 + x.liquido, 0))}</b><em>líquido, já sem a taxa</em></span></div><div class="kpi"><span><small>Taxas da maquininha (45 dias)</small><b>${din(l.reduce((s2, x) => s2 + x.taxa, 0))}</b><em>débito ${db.cfg.taxas.debito}% · crédito ${db.cfg.taxas.credito}%</em></span></div><div class="kpi ok"><span><small>Conferidas com o extrato</small><b>${l.filter((x) => x.ok).length} de ${l.length}</b><em>vendas no cartão</em></span></div></div>
        <div class="tabela-wrap"><table class="tabela cartoes"><thead><tr><th>Venda</th><th>Forma</th><th class="n">Valor</th><th class="n">Taxa</th><th class="n">Cai na conta</th><th>Previsão</th><th></th></tr></thead><tbody>${l.slice(0, 12).map((x) => `<tr><td>nº ${x.v.n} · ${dataBR(x.v.data)}</td><td data-r="Forma">${FORMAS[x.f]}${(x.v.pag[x.i].parc || 1) > 1 ? ` ${x.v.pag[x.i].parc}×` : ''}</td><td class="n" data-r="Valor">${din(x.bruto)}</td><td class="n" data-r="Taxa">${din(x.taxa)}</td><td class="n" data-r="Líquido"><b>${din(x.liquido)}</b></td><td data-r="Previsão">${dataBR(x.prev)}</td><td><span class="tag ${x.ok ? 'ok' : ''}">${x.ok ? 'Conferida' : 'A conferir'}</span></td></tr>`).join('') || '<tr><td colspan="7"><p class="mudo">Nenhuma venda no cartão.</p></td></tr>'}</tbody></table></div><p class="mudo" style="font-size:13px;margin:10px 0 0">As taxas e prazos da sua maquininha ficam em Configurações.</p>`; })()}</section>${hist}`;
  },

  relatorios() {
    const [ini, fim] = periodo(estado.relPer, estado.relDe, estado.relAte), n = numeros(ini, fim);
    const pers = [['hoje', 'Diário'], ['semana', 'Semanal'], ['mes', 'Mensal'], ['passado', 'Mês passado'], ['livre', 'Escolher datas']];
    if (!pode('relatorios')) return `<div class="cab"><div><h1>Relatórios</h1><p>Seu acesso não mostra os relatórios. Peça para a dona liberar em Painel do dono.</p></div></div>`;
    const porProd = {}; n.vs.forEach((v) => v.itens.forEach((x) => { const k = x.p; porProd[k] = porProd[k] || { nome: x.nome, q: 0, v: 0 }; porProd[k].q += x.qtd; porProd[k].v += x.preco * x.qtd; }));
    const top = Object.values(porProd).sort((a, b) => b.v - a.v).slice(0, 8), maxTop = Math.max(1, ...top.map((x) => x.v));
    const porCat = {}; n.vs.forEach((v) => v.itens.forEach((x) => { const c = (prod(x.p) || {}).cat || 'Outras'; porCat[c] = (porCat[c] || 0) + x.preco * x.qtd; }));
    const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]), maxCat = Math.max(1, ...cats.map((x) => x[1]));
    const nd = Math.min(31, dias(ini, fim) + 1), barras = Array.from({ length: nd }, (_, i) => { const d = somaDias(fim, i - nd + 1); return [d, n.vs.filter((v) => v.data.slice(0, 10) === d).reduce((s, v) => s + v.total, 0)]; }), maxB = Math.max(1, ...barras.map((x) => x[1]));
    const rec = { dinheiro: 0, pix: 0, debito: 0, credito: 0 }; n.vs.forEach((v) => v.pag.forEach((x) => { if (rec[x.f] !== undefined) rec[x.f] += x.v; })); n.pgs.forEach((p) => { if (rec[p.f] !== undefined) rec[p.f] += p.v; });
    const inad = totalAberto() ? Math.round(totalVencido() / totalAberto() * 100) : 0;
    const k = (rot, v, sub, cls = '') => `<div class="cartao kpi ${cls}"><span><small>${rot}</small><b>${v}</b><em>${sub}</em></span></div>`;
    return `<div class="cab"><div><h1>Relatórios</h1><p>${ini === fim ? dataBR(ini) : `${dataBR(ini)} a ${dataBR(fim)}`} · <span class="vivo"><i></i>ao vivo, atualizado às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span><br>Venda no fiado não é dinheiro recebido; faturamento não é lucro.</p></div><div class="acoes"><button type="button" class="bt" data-acao="csv-vendas">Planilha das vendas</button><button type="button" class="bt" data-acao="imprimir">Imprimir</button>${addBt('venda', 'despesa')}</div></div>
      ${abas(pers, estado.relPer, 'data-per')}
      ${estado.relPer === 'livre' ? `<div class="campos" style="max-width:420px;margin-bottom:16px"><label class="campo">De<input type="date" id="rel-de" value="${ini}"></label><label class="campo">Até<input type="date" id="rel-ate" value="${fim}"></label></div>` : ''}
      <div class="grade g4 cascata" style="margin-bottom:16px">
        ${k('Vendas líquidas', din(n.liquido), `${n.vs.length} vendas · ticket ${din(n.ticket)}`)}
        ${pode('custo') ? k('Lucro bruto', din(n.lucro), `${n.liquido ? Math.round(n.lucro / n.liquido * 100) : 0}% · custo das peças ${din(n.cmv)}`, 'ok') : k('Lucro bruto', '—', 'só a dona vê')}
        ${k('Dinheiro que entrou', din(n.recebido), `${din(n.recebidoFiado)} de fiado recebido`)}
        ${k('Vendido no fiado', din(n.fiadoVendido), `a receber hoje ${din(totalAberto())}`)}
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
    if (!dona()) return `<div class="cab"><div><h1>Configurações</h1><p>Só a dona mexe nas configurações da loja.</p></div></div>`;
    const L = db.loja, j = db.cfg.juros, ini = String(L.nome || 'L').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
    return `<div class="cab"><div><h1>Configurações</h1><p>A cara da sua loja, as regras do fiado e a cópia de segurança.</p></div><div class="acoes"><a class="bt cheio" href="#guia">${ico('recibo')}Guia de como usar</a><button type="button" class="bt" data-acao="instalar">Instalar o app</button></div></div>
      <div class="grade g2">
        <section class="cartao"><div class="cartao-cab"><h2>A marca da sua loja</h2></div><p class="mudo" style="margin:-6px 0 12px;font-size:13.5px">Sua logo e o nome aparecem no topo, nos recibos e nas mensagens. Quem você convidar vê igual.</p>
          <div style="display:flex;gap:14px;align-items:center;margin-bottom:14px"><span class="loja-logo" style="width:72px;height:72px;font-size:24px">${L.logo ? `<img src="${t(L.logo)}" alt="">` : t(ini)}</span><div style="display:flex;gap:8px;flex-wrap:wrap"><label class="bt pq cheio" for="logo-in">${L.logo ? 'Trocar logo' : 'Pôr a logo'}</label><input type="file" id="logo-in" accept="image/*" class="sr">${L.logo ? '<button type="button" class="bt pq" data-acao="tira-logo">Tirar</button>' : ''}</div></div>
          <div class="campos">${[['nome', 'Nome da loja'], ['slogan', 'Frase abaixo do nome'], ['dono', 'Seu nome (para a saudação)'], ['tel', 'WhatsApp da loja'], ['cidade', 'Cidade'], ['pix', 'Chave Pix (vai nas cobranças)']].map(([k, n]) => `<label class="campo">${n}<input data-loja="${k}" value="${t(L[k] || '')}"></label>`).join('')}</div>
          <p class="campo" style="margin:16px 0 8px">Cor do sistema</p><div class="temas">${TEMAS.map(([k, n, a, b]) => `<button type="button" data-tema="${k}" aria-pressed="${(db.tema || 'ameixa') === k}" style="--a:${a};--b:${b}"><i></i>${n}</button>`).join('')}</div>
        </section>
        <section class="cartao"><div class="cartao-cab"><h2>Regras do fiado</h2></div>
          <div class="campos"><label class="campo">Limite de cliente nova (R$)<input data-cfgd="limitePadrao" inputmode="decimal" value="${campoDin(db.cfg.limitePadrao)}"></label><label class="campo">Avisar quando usar (%) do limite<input data-cfg="alertaPct" type="number" min="10" max="100" value="${db.cfg.alertaPct}"></label>
          <label class="campo inteiro troca" style="color:var(--texto)"><span>Bloquear fiado sozinho de quem passar do prazo</span><input type="checkbox" data-cfgb="bloqueioAuto" ${db.cfg.bloqueioAuto ? 'checked' : ''}></label>
          <label class="campo">Dias de atraso para bloquear<input data-cfg="bloqueioDias" type="number" min="1" value="${db.cfg.bloqueioDias}"></label></div>
          <label class="troca" style="margin-top:8px"><span><b>Cobrar juros e multa no atraso</b><br><small class="mudo">Desligado por padrão. Se ligar, combine antes com a cliente.</small></span><input type="checkbox" data-juros="ativo" ${j.ativo ? 'checked' : ''}></label>
          ${j.ativo ? `<div class="campos"><label class="campo">Multa (%)<input data-juros="multaPct" type="number" step="0.1" min="0" max="2" value="${j.multaPct}"><small>Pelo Código de Defesa do Consumidor, no máximo 2%.</small></label><label class="campo">Juros ao mês (%)<input data-juros="jurosMesPct" type="number" step="0.1" min="0" value="${j.jurosMesPct}"></label><label class="campo">Carência (dias)<input data-juros="carencia" type="number" min="0" value="${j.carencia}"></label></div>` : ''}
          <div class="cartao-cab" style="margin-top:18px"><h2>Maquininha de cartão</h2></div>
          <div class="campos" style="grid-template-columns:repeat(3,minmax(0,1fr))">${[['debito', 'Taxa no débito (%)'], ['credito', 'Crédito à vista (%)'], ['parcelado', 'Crédito parcelado (%)'], ['prazoDebito', 'Débito cai em (dias)'], ['prazoCredito', 'Crédito cai em (dias)']].map(([k, n]) => `<label class="campo">${n}<input data-taxa="${k}" type="number" step="0.01" min="0" value="${db.cfg.taxas[k]}"></label>`).join('')}</div>
          <div class="cartao-cab" style="margin-top:18px"><h2>Estoque</h2></div>
          <div class="campos" style="grid-template-columns:repeat(3,minmax(0,1fr))">${['Atenção depois de', 'Parada depois de', 'Encalhada depois de'].map((n, i) => `<label class="campo">${n} (dias)<input data-parado="${i}" type="number" min="1" value="${db.cfg.parados[i]}"></label>`).join('')}</div>
        </section>
      </div>
      ${NOTA_LIGADA ? `<section class="cartao" style="margin-top:16px"><div class="cartao-cab"><h2>Nota fiscal (NFC-e)</h2></div>
        <label class="troca"><span><b>Minha loja vai emitir nota fiscal pelo Peplo</b><br><small class="mudo">Você escolhe. Se não usar, o Peplo funciona igual, só sem a nota.</small></span><input type="checkbox" data-fiscal-usar ${db.fiscal.usar ? 'checked' : ''}></label>
        <div class="caixa-aviso atn" style="margin:8px 0 12px"><b>Antes de ligar, saiba os custos (são da sua loja):</b><br>• Certificado digital A1 da empresa, comprado numa certificadora: em média R$ 150 a R$ 250 por ano.<br>• Inscrição estadual ativa e o código CSC, que você gera de graça no site da SEFAZ.<br>• Orientação do seu contador sobre NCM, CFOP e tributos das peças.<br>O Peplo não cobra nada a mais por nota. MEI não precisa dar nota para consumidor pessoa física.</div>
        ${db.fiscal.usar ? `<div class="campos">${[['razao', 'Razão social'], ['cnpj', 'CNPJ'], ['ie', 'Inscrição estadual'], ['rua', 'Rua'], ['numero', 'Número'], ['bairro', 'Bairro'], ['cidade', 'Cidade'], ['codMun', 'Código IBGE da cidade'], ['cep', 'CEP'], ['cscId', 'Identificador do CSC (ex.: 000001)']].map(([k, n]) => `<label class="campo">${n}<input data-fiscal="${k}" value="${t(db.fiscal[k] || '')}"></label>`).join('')}
          <label class="campo">Regime<select data-fiscal="regime"><option value="1" ${db.fiscal.regime === '1' ? 'selected' : ''}>Simples Nacional</option><option value="4" ${db.fiscal.regime === '4' ? 'selected' : ''}>MEI</option><option value="3" ${db.fiscal.regime === '3' ? 'selected' : ''}>Regime normal</option></select></label>
          <label class="campo">Ambiente<select data-fiscal="ambiente"><option value="2" ${db.fiscal.ambiente === '2' ? 'selected' : ''}>Homologação (teste, sem valor)</option><option value="1" ${db.fiscal.ambiente === '1' ? 'selected' : ''}>Produção (vale de verdade)</option></select></label>
          <label class="campo">Série<input data-fiscal="serie" type="number" min="1" value="${db.fiscal.serie}"></label><label class="campo">Próximo número<input data-fiscal="proximo" type="number" min="1" value="${db.fiscal.proximo}"></label></div>
          ${emiteAqui() ? '' : '<div class="caixa-aviso ac" style="margin-top:12px">A emissão de NFC-e pelo Peplo está em fase de liberação. Você já pode deixar os dados prontos: avisaremos pelo e-mail e aqui no sistema quando estiver liberada para a sua loja. Na demonstração você vê como a nota fica.</div>'}<p class="mudo" style="font-size:13px;margin:12px 0 0"><b>Certificado digital e código CSC:</b> por segurança, eles não ficam neste aparelho. Na conta, você envia o arquivo do certificado (.pfx), a senha e o CSC numa tela própria, e eles ficam guardados cifrados no servidor, que é quem fala com a SEFAZ. ${fiscalPronto() ? '<span class="tag ok">Dados da loja completos</span>' : '<span class="tag atn">Faltam dados da loja</span>'}</p>` : ''}
      </section>` : ''}
      <section class="cartao" style="margin-top:16px"><div class="cartao-cab"><h2>Mensagens de cobrança no WhatsApp</h2></div><p class="mudo" style="margin:-6px 0 12px;font-size:13.5px">As palavras entre chaves viram os dados de cada cliente: {nome}, {valor}, {venc}, {saldo}, {dias}, {loja}, {pix}, {acordo}. Deixe em branco para voltar ao texto sugerido.</p>
        <div class="grade g2">${Object.entries(MSGS).map(([k, m]) => `<label class="campo">${m.titulo}<textarea data-msg="${k}" rows="4">${t((db.cfg.msgs || {})[k] || m.sug)}</textarea></label>`).join('')}</div></section>
      <div class="grade g2" style="margin-top:16px">
        <section class="cartao"><div class="cartao-cab"><h2>Cópia de segurança</h2></div><p class="mudo" style="margin:-6px 0 12px;font-size:13.5px">Baixe um arquivo com tudo (clientes, fiado, estoque, vendas e caixa) e guarde. Para voltar, é só carregar o arquivo.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="bt" data-acao="backup">Baixar cópia</button><label class="bt" for="backup-in">Carregar cópia</label><input type="file" id="backup-in" accept="application/json,.json" class="sr"></div></section>
        <section class="cartao"><div class="cartao-cab"><h2>Assinatura</h2></div><p style="margin:0 0 6px"><b>Peplo · R$ 59/mês</b></p><p class="mudo" style="margin:0 0 12px;font-size:13.5px">Pagamento na hora no Pix ou no cartão, sem fidelidade. Na demonstração nada é cobrado.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="bt cheio" href="../../../peplo.html#precos" data-plano="basico">Assinar o Peplo</a><button type="button" class="bt perigo" data-acao="recomecar">Recomeçar a demonstração</button></div></section>
      </div>`;
  },

  guia() {
    return `<div class="cab"><div><h1>Guia de como usar</h1><p>Do primeiro dia ao fechamento do mês, em passos curtos. Toque em cada assunto.</p></div><div class="acoes"><button type="button" class="bt" data-acao="instalar">Instalar o app</button><button type="button" class="bt zap" data-acao="ajuda">${ico('zap')}Falar com uma pessoa</button></div></div>
      <div class="grade cascata">${GUIA.map(([g, itens], gi) => `<section class="cartao"><div class="cartao-cab"><h2><span class="tag ac" style="font-family:var(--sans)">${gi + 1}</span>${t(g)}</h2></div>${itens.map(([titulo, txt]) => `<details class="guia-item"><summary>${t(titulo)}</summary><p>${t(txt)}</p></details>`).join('')}</section>`).join('')}</div>`;
  },

  mais() {
    const G = [['A loja', [['#relatorios', 'lucro', 'Relatórios']]], ['Vendas', [['#vendas', 'recibo', 'Vendas e trocas'], ['#clientes', 'gente', 'Clientes']]], ['Mercadoria', [['#compras', 'bolsa', 'Compras e fornecedores']]], ['Dinheiro', [['#caixa', 'moedas', 'Caixa do dia']]], ['Sistema', [['#perfil', 'gente', 'Meu perfil'], ['#dono', 'ok', 'Painel do dono'], ['#config', 'cabide', 'Configurações'], ['#guia', 'recibo', 'Guia de como usar']]]];
    return `<div class="cab"><div><h1>Mais</h1><p>Tudo da loja, por assunto.</p></div></div>${G.map(([g, it]) => `<p class="campo" style="margin:16px 0 8px;letter-spacing:.06em;text-transform:uppercase;font-size:12px">${g}</p><div class="mais-lista cascata">${it.map(([h, i, n]) => `<a href="${h}">${ico(i)}${n}</a>`).join('')}</div>`).join('')}
      <button type="button" class="bt largo" style="margin-top:18px" data-acao="instalar">Instalar o app no celular</button><button type="button" class="bt largo zap" style="margin-top:10px" data-acao="ajuda">${ico('zap')}Falar com uma pessoa da equipe</button>`;
  },

  perfil() {
    const u = eu(), h = hoje(), ini = `${h.slice(0, 8)}01`, mv = db.vendas.filter((v) => v.vend === u.id && !v.cancelada && v.data.slice(0, 10) >= ini), tot = mv.reduce((s, v) => s + v.total, 0);
    const hj = mv.filter((v) => v.data.slice(0, 10) === h);
    return `<div class="cab"><div><h1>Meu perfil</h1><p>${u.perfil === 'dona' ? 'Dona da loja · acesso completo' : `Vendedora · ${t(db.loja.nome)}`}</p></div></div>
      <div class="grade g2">
        <section class="cartao"><div style="display:flex;gap:16px;align-items:center;margin-bottom:16px"><span class="foto-perfil">${u.foto ? `<img src="${t(u.foto)}" alt="">` : t(iniciais(u.nome))}</span><div style="display:grid;gap:8px"><b style="font-family:var(--serif);font-size:22px">${t(u.nome)}</b><div style="display:flex;gap:8px;flex-wrap:wrap"><label class="bt pq cheio" for="foto-eu">${u.foto ? 'Trocar foto' : 'Pôr foto'}</label><input type="file" id="foto-eu" accept="image/*" class="sr">${u.foto ? '<button type="button" class="bt pq" data-acao="tira-foto-eu">Tirar</button>' : ''}</div></div></div>
          <div class="campos">${[['nome', 'Nome'], ['tel', 'WhatsApp'], ['email', 'E-mail'], ['nasc', 'Aniversário', 'date']].map(([k, n, tp]) => `<label class="campo">${n}<input data-eu="${k}" ${tp ? `type="${tp}"` : ''} value="${t(u[k] || '')}"></label>`).join('')}</div>
          <p class="campo" style="margin:16px 0 8px">Abrir o sistema em</p><div class="chips">${[['inicio', 'Visão geral'], ['vender', 'Vender'], ['fiado', 'Fiado']].map(([k, n]) => `<button type="button" data-abrir-em="${k}" aria-pressed="${(u.abrirEm || 'inicio') === k}">${n}</button>`).join('')}</div>
          <p class="campo" style="margin:16px 0 6px">Senha de liberação (4 números)</p><p class="mudo" style="font-size:13px;margin:0 0 8px">${u.perfil === 'dona' ? 'Usada para liberar fiado fora da regra e desconto acima do limite quando a vendedora pedir.' : 'Usada para confirmar ações sensíveis.'} ${u.pin ? 'Já cadastrada.' : 'Ainda não cadastrada (na demonstração, a senha da dona é 1234).'}</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><input id="pin-novo" inputmode="numeric" maxlength="4" placeholder="••••" style="width:110px;min-height:42px;border-radius:10px;border:1px solid var(--linha);text-align:center;letter-spacing:6px"><button type="button" class="bt" data-acao="salvar-pin">Salvar senha</button></div>
        </section>
        <section class="cartao"><div class="cartao-cab"><h2>Minhas vendas</h2><span class="vivo" style="margin-left:auto"><i></i>ao vivo</span></div>
          <div class="grade g2 kpis" style="margin-bottom:12px"><div class="kpi"><span><small>Hoje</small><b>${din(hj.reduce((s, v) => s + v.total, 0))}</b><em>${hj.length} vendas</em></span></div><div class="kpi"><span><small>No mês</small><b>${din(tot)}</b><em>${mv.length} vendas · ticket ${din(mv.length ? Math.round(tot / mv.length) : 0)}</em></span></div></div>
          <p class="campo" style="margin:12px 0 6px">O que eu posso fazer</p><ul class="lista">${PERMS.map(([k, n]) => `<li><span class="cresce">${n}</span><span class="tag ${pode(k) ? 'ok' : ''}">${pode(k) ? 'Pode' : 'Pede para a dona'}</span></li>`).join('')}<li><span class="cresce">Desconto sem pedir</span><span class="tag ac">até ${u.perfil === 'dona' ? '100' : u.descMax}%</span></li></ul>
          ${db.usuarios.length > 1 ? `<p class="mudo" style="font-size:13px;margin:14px 0 0">Na demonstração, a dona troca de pessoa no Painel do dono para ver o sistema como a vendedora vê.</p>` : ''}</section>
      </div>`;
  },

  dono() {
    if (!dona()) return `<div class="cab"><div><h1>Painel do dono</h1><p>Só a dona da loja vê este painel.</p></div></div><section class="cartao"><p class="vazio"><b>Acesso da dona</b>Volte para a sua conta para ver.</p><button type="button" class="bt largo" data-entrar-como="u1">Voltar para a conta da dona (demonstração)</button></section>`;
    const h = hoje(), ini = `${h.slice(0, 8)}01`, n = numeros(ini, h), diaMes = Number(h.slice(8)), ultimo = new Date(Number(h.slice(0, 4)), Number(h.slice(5, 7)), 0).getDate();
    const proj = Math.round(n.liquido / diaMes * ultimo), pct = db.meta ? Math.min(100, Math.round(n.liquido / db.meta * 100)) : 0;
    const porVend = db.usuarios.map((u) => { const vs = n.vs.filter((v) => v.vend === u.id), tot = vs.reduce((s, v) => s + v.total, 0); return { u, vs, tot, desc: vs.reduce((s, v) => s + v.desc, 0), fiado: vs.reduce((s, v) => s + v.pag.filter((x) => x.f === 'fiado').reduce((a, x) => a + x.v, 0), 0) }; });
    const ativ = [...db.atividades, ...db.excecoes.map((e) => ({ data: e.data, quem: '', txt: `Fiado liberado fora da regra para ${(cli(e.cli) || {}).nome || 'cliente'}: ${din(e.valor)} (${e.motivo})`, tipo: 'excecao' })), ...db.movs.filter((m) => m.tipo === 'ajuste' || m.tipo === 'avaria').map((m) => ({ data: m.data, quem: '', txt: `${m.tipo === 'ajuste' ? 'Ajuste de estoque' : 'Avaria'}: ${(prod(m.p) || {}).nome} ${m.cor} ${m.tam} (${m.q > 0 ? '+' : ''}${m.q}) ${m.motivo || ''}`, tipo: 'estoque' })), ...db.caixa.historico.filter((c) => c.dif).map((c) => ({ data: c.fechamento, quem: '', txt: `Caixa fechou com diferença de ${din(c.dif)}${c.obs ? ` (${c.obs})` : ''}`, tipo: 'caixa' }))].sort((a, b) => String(b.data).localeCompare(String(a.data))).slice(0, 25);
    return `<div class="cab"><div><h1>Painel do dono</h1><p>Meta, equipe, quem pode o quê e tudo o que aconteceu na loja.</p></div><div class="acoes">${addBt('usuario')}</div></div>
      <div class="grade g-21" style="margin-bottom:16px">
        <section class="cartao"><div class="cartao-cab"><h2>${ico('lucro')}Meta do mês</h2><span class="vivo" style="margin-left:auto"><i></i>ao vivo</span></div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap"><b style="font-size:28px" data-conta="${n.liquido}">${din(n.liquido)}</b><span class="mudo">de ${din(db.meta)} · ${pct}%</span></div>
          <div class="meta"><i style="width:${pct}%"></i></div>
          <p class="mudo" style="margin:0 0 12px;font-size:13.5px">No ritmo de hoje a loja fecha o mês em <b style="color:${proj >= db.meta ? 'var(--ok)' : 'var(--mal)'}">${din(proj)}</b>. ${proj >= db.meta ? 'Vai bater a meta.' : `Faltam ${din(db.meta - n.liquido)} em ${ultimo - diaMes} dias: ${din(Math.max(0, Math.round((db.meta - n.liquido) / Math.max(1, ultimo - diaMes))))} por dia.`}</p>
          <label class="campo" style="max-width:240px">Meta de vendas do mês (R$)<input data-meta inputmode="decimal" value="${campoDin(db.meta)}"></label></section>
        <section class="cartao"><div class="cartao-cab"><h2>${ico('moedas')}Dinheiro do mês</h2></div><ul class="lista"><li><span class="cresce">Vendas líquidas</span><b class="num">${din(n.liquido)}</b></li><li><span class="cresce">Lucro bruto</span><b class="num" style="color:var(--ok)">${din(n.lucro)}</b></li><li><span class="cresce">Despesas do caixa</span><b class="num">${din(n.despesas)}</b></li><li><span class="cresce">Fiado a receber</span><b class="num">${din(totalAberto())}</b></li><li><span class="cresce">Fiado vencido</span><b class="num" style="color:var(--mal)">${din(totalVencido())}</b></li></ul></section>
      </div>
      <section class="cartao" style="margin-bottom:16px"><div class="cartao-cab"><h2>${ico('gente')}Equipe no mês</h2></div><div class="tabela-wrap"><table class="tabela cartoes"><thead><tr><th>Pessoa</th><th class="n">Vendas</th><th class="n">Vendido</th><th class="n">Ticket</th><th class="n">Descontos</th><th class="n">No fiado</th><th class="n">Comissão</th><th></th></tr></thead><tbody>${porVend.map((x) => `<tr><td><b>${t(x.u.nome)}</b><br><small class="mudo">${x.u.perfil === 'dona' ? 'Dona' : 'Vendedora'}${x.u.id === db.usuario ? ' · você' : ''}</small></td><td class="n" data-r="Vendas">${x.vs.length}</td><td class="n" data-r="Vendido"><b>${din(x.tot)}</b></td><td class="n" data-r="Ticket">${din(x.vs.length ? Math.round(x.tot / x.vs.length) : 0)}</td><td class="n" data-r="Descontos">${din(x.desc)}</td><td class="n" data-r="Fiado">${din(x.fiado)}</td><td class="n" data-r="Comissão">${x.u.comissao ? `<b>${din(comissaoDe(x.u, x.vs))}</b><br><small class="mudo">${x.u.comissao}%</small>` : '—'}</td><td>${x.u.id === db.usuario ? '' : `<button type="button" class="bt pq" data-entrar-como="${x.u.id}">Ver como ${t(x.u.nome.split(' ')[0])}</button>`}</td></tr>`).join('')}</tbody></table></div></section>
      <section class="cartao" style="margin-bottom:16px"><div class="cartao-cab"><h2>${ico('ok')}Quem pode o quê</h2></div><p class="mudo" style="margin:-6px 0 12px;font-size:13.5px">A dona pode tudo. Para a vendedora, marque o que ela pode fazer sem pedir a sua senha.</p>
        <div class="tabela-wrap"><div class="perm"><b style="text-align:left">Pessoa</b>${PERMS.map(([, n]) => `<b>${n}</b>`).join('')}${db.usuarios.filter((u) => u.perfil !== 'dona').map((u) => `<span><b>${t(u.nome)}</b><br><small class="mudo">desconto até <input data-desc-max="${u.id}" type="number" min="0" max="100" value="${u.descMax}" style="width:52px;border:1px solid var(--linha);border-radius:6px;padding:2px 4px">% · comissão <input data-comissao="${u.id}" type="number" min="0" max="50" step="0.5" value="${u.comissao || 0}" style="width:56px;border:1px solid var(--linha);border-radius:6px;padding:2px 4px">%</small></span>${PERMS.map(([k]) => `<label><input type="checkbox" data-perm="${u.id}.${k}" ${(u.perms || {})[k] ? 'checked' : ''} aria-label="${t(u.nome)}: ${k}"></label>`).join('')}`).join('')}</div></div></section>
      <section class="cartao"><div class="cartao-cab"><h2>${ico('recibo')}O que aconteceu na loja</h2></div><ul class="lista">${ativ.map((a) => `<li><span class="cresce"><b style="white-space:normal">${t(a.txt)}</b><small>${dataBR(a.data)} ${horaBR(a.data)}${a.quem ? ` · ${t(a.quem)}` : ''}</small></span></li>`).join('') || '<p class="mudo">Nada registrado ainda.</p>'}</ul></section>`;
  },
};

// ------------------------------------------------------------------ rotas
function rota() {
  const [nome, arg] = (location.hash.slice(1) || 'inicio').split('/');
  const f = TELAS[nome] || TELAS.inicio, tela = $('#tela');
  tela.innerHTML = f(arg); tela.classList.remove('entra'); void tela.offsetWidth; tela.classList.add('entra');
  const aba = nome === 'cliente' ? 'fiado' : nome === 'vendas' ? 'vendas' : TELAS[nome] ? nome : 'inicio';
  const mn = $('#menu a[data-aba="notas"]'); if (mn) mn.hidden = !db.fiscal.usar;
  $$('[data-aba]').forEach((a) => a.toggleAttribute('aria-current', false));
  $$(`[data-aba="${aba}"]`).forEach((a) => a.setAttribute('aria-current', 'page'));
  if (['vendas', 'clientes', 'compras', 'caixa', 'relatorios', 'config', 'perfil', 'dono', 'guia', 'notas'].includes(nome)) $$('.barra [data-aba="mais"]').forEach((a) => a.setAttribute('aria-current', 'page'));
  marca(); contar(tela); requestAnimationFrame(() => ajustaAbas(tela));
  if (!rota.mesma) scrollTo({ top: 0 }); rota.mesma = false;
}
const mostra = () => { rota.mesma = true; rota(); };
addEventListener('hashchange', rota);
addEventListener('resize', () => ajustaAbas());

// ------------------------------------------------------------------ ações: venda
function escolherPeca(p) {
  let cor = (p.cores.find((c) => p.tam.some((tm) => qtd(p, c.n, tm) > 0)) || p.cores[0]).n, tam = null, q = 1;
  const desenha = (j) => {
    $('[data-corpo]', j).innerHTML = `<p class="campo" style="margin:0 0 8px">Cor</p><div class="chips">${p.cores.map((c) => `<button type="button" data-c="${t(c.n)}" aria-pressed="${c.n === cor}"><span class="bolinha" style="background:${t(c.h)}"></span>${t(c.n)}</button>`).join('')}</div>
      <p class="campo" style="margin:14px 0 8px">Tamanho</p><div class="chips">${p.tam.map((tm) => { const n = qtd(p, cor, tm) - noCarrinho(p.id, cor, tm); return `<button type="button" data-t="${t(tm)}" aria-pressed="${tm === tam}" ${n > 0 ? '' : 'disabled'}>${t(tm)} <small style="opacity:.7">(${Math.max(0, n)})</small></button>`; }).join('')}</div>
      <div style="display:flex;align-items:center;gap:14px;margin-top:16px"><span class="campo" style="margin:0">Quantidade</span><span class="q" style="display:inline-flex;gap:8px;align-items:center"><button type="button" class="x" data-qq="-1">−</button><b>${q}</b><button type="button" class="x" data-qq="1">+</button></span><b style="margin-left:auto;font-size:20px">${din(p.preco * q)}</b></div>`;
  };
  abrir(`<div class="prod-topo" style="margin-bottom:14px">${iconePeca(p)}<div><h2 style="margin:0">${t(p.nome)}</h2><small class="mudo">${t(p.cod)} · ${din(p.preco)}</small></div></div><div data-corpo class="escolha-peca"></div><div class="acoes"><button type="button" class="bt cheio" data-por>${ico('bolsa')}Pôr na sacola</button></div>`, (j) => {
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
const totalSacola = () => Math.max(0, estado.sacola.reduce((s, x) => s + x.preco * x.qtd, 0) - estado.desc);
// com uma forma só, o valor acompanha o total da sacola
function ajustaPagamento() { if (estado.pag.length === 1) estado.pag[0].v = totalSacola(); }
function liberarExcecao() {
  if (!pode('liberar')) return pedirSenha('Liberar fiado fora da regra precisa da senha da dona.', () => { abrirExcecao(); });
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
  abrir(`<h2>Liberar exceção no fiado</h2><p class="mudo">Fica registrado quem liberou, quando, o valor e o motivo.</p><label class="campo">Quem está liberando<input id="ex-quem" value="${t(db.loja.dono || '')}"></label><label class="campo" style="margin-top:10px">Motivo<textarea id="ex-mot" placeholder="Ex.: cliente antiga, combinou de pagar sexta"></textarea></label><div class="acoes"><button type="button" class="bt cheio" data-ok>Liberar</button></div>`, (j) => {
    $('[data-ok]', j).onclick = () => { const q = $('#ex-quem', j).value.trim(), m = $('#ex-mot', j).value.trim(); if (!q || m.length < 5) { toast('Diga quem libera e o motivo.', true); return; } estado.excecao = `${q}: ${m}`; registra(`Exceção no fiado liberada: ${m}`, 'excecao'); fechar(); mostra(); };
  });
}
function finalizarVenda() {
  const sac = estado.sacola; if (!sac.length) return;
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
  const v = { id: uid('v'), n: ++db.n, data: agora(), vend: db.usuario, cli: c ? c.id : null, itens: sac.map((x) => ({ p: x.p, nome: x.nome, cor: x.cor, tam: x.tam, qtd: x.qtd, preco: x.preco, custo: x.custo })), sub, desc: estado.desc, total, pag: pagFinal.filter((x) => x.v > 0), devol: [], caixa: cx.id, troco, excecao: fiado && estado.excecao ? estado.excecao : null };
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
  const comNota = db.fiscal.usar && estado.nota !== false && fiscalPronto() && emiteAqui(), cpfNota = estado.cpf;
  if (db.fiscal.usar && estado.nota !== false && fiscalPronto() && !emiteAqui()) setTimeout(() => toast('A emissão de NFC-e pelo Peplo está em liberação. Avisaremos quando estiver pronta; esta venda ficou sem nota.', true), 400);
  const nota = comNota ? emitirNota(v, cpfNota) : null;
  grava();
  estado = { ...estado, cpf: '', descLiberado: false, sacola: [], vCli: '', desc: 0, pag: [{ f: 'pix', v: 0 }], parc: { n: 1, int: 'mes', prim: somaMes(hoje(), 1) }, excecao: null, busca: '' };
  mostra(); if (nota) danfe(nota); else comprovante(v);
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
    <div class="acoes">${c && c.tel ? `<a class="bt zap" href="${zap(c.tel, texto)}" target="_blank" rel="noopener">${ico('zap')}Mandar no WhatsApp</a>` : ''}<button type="button" class="bt" data-imp>Imprimir</button>${v.nota ? `<button type="button" class="bt" data-nota="${v.nota}">NFC-e</button>` : db.fiscal.usar && fiscalPronto() && emiteAqui() && !v.cancelada ? `<button type="button" class="bt" data-emitir="${v.id}">Emitir NFC-e</button>` : ''}${v.cancelada ? '' : `<button type="button" class="bt" data-devolver="${v.id}">${ico('troca')}Troca ou devolução</button>`}</div>`, (j) => {
    $('[data-imp]', j).onclick = () => { document.body.classList.add('imprime-janela'); print(); };
  });
}

// ------------------------------------------------------------------ ações: troca e devolução
function devolver(v) {
  const c = v.cli ? cli(v.cli) : null, fator = v.sub ? v.total / v.sub : 1;
  const abertasVenda = db.parcelas.filter((p) => p.venda === v.id && p.saldo > 0 && p.status === 'aberta');
  abrir(`<h2>Troca ou devolução · venda nº ${v.n}</h2><p class="mudo">A venda original fica guardada. Escolha o que voltou, como está a peça e o que fazer com o valor.</p>
    ${v.itens.map((x, i) => { const pode = x.qtd - (x.devolvido || 0); return `<div class="troca" style="border-bottom:1px solid var(--linha-2)"><span><b>${t(x.nome)}</b><br><small class="mudo">${t(x.cor)} · ${t(x.tam)} · ${din(Math.round(x.preco * fator))} cada</small></span><select data-dv="${i}" ${pode ? '' : 'disabled'} style="min-height:40px;border-radius:10px;border:1px solid var(--linha);padding:4px 8px">${Array.from({ length: pode + 1 }, (_, k) => `<option value="${k}">${k}</option>`).join('')}</select></div>`; }).join('')}
    <div class="campos" style="margin-top:14px"><label class="campo">Como voltou a peça<select id="dv-cond"><option value="revenda">Boa, volta para a arara</option><option value="avaria">Com defeito ou avaria</option></select></label>
    <label class="campo">Motivo<input id="dv-mot" list="dl-mot" placeholder="Ex.: tamanho não serviu"><datalist id="dl-mot"><option value="Tamanho não serviu"><option value="Não gostou da cor"><option value="Defeito na costura"><option value="Arrependimento"></datalist></label>
    <label class="campo inteiro">O que fazer com o valor<select id="dv-dest">${abertasVenda.length ? '<option value="fiado">Abater do fiado desta compra</option>' : ''}${c ? '<option value="troca">Troca: vira crédito e já abre uma venda nova</option><option value="credito">Guardar como crédito para a cliente</option>' : ''}<option value="dinheiro">Devolver em dinheiro (sai do caixa)</option><option value="pix">Devolver no Pix</option></select></label></div>
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
      if (dest === 'fiado') { let resto = val; abertasVenda.sort((a, b) => b.venc.localeCompare(a.venc)).forEach((p) => { const a = Math.min(resto, p.saldo); p.saldo -= a; p.valor -= a; resto -= a; }); if (resto > 0 && c) c.credito = (c.credito || 0) + resto; txt = 'abatido do fiado'; }
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
  const linhas = [...db.vendas.filter((v) => v.cli === c.id && v.pag.some((x) => x.f === 'fiado')).map((v) => [v.data, `Compra nº ${v.n} no fiado`, v.pag.filter((x) => x.f === 'fiado').reduce((s, x) => s + x.v, 0)]), ...db.pagamentos.filter((p) => p.cli === c.id).map((p) => [p.data, `Pagamento (${FORMAS[p.f]})${p.obs ? ` · ${p.obs}` : ''}`, -p.v]), ...db.acordos.filter((a) => a.cli === c.id).map((a) => [a.data, `Acordo: ${a.n}× (renegociação)`, 0])].sort((a, b) => a[0].localeCompare(b[0]));
  let s = 0;
  abrir(`<h2>Extrato de ${t(c.nome)}</h2><p class="mudo">Tudo o que comprou no fiado e pagou.</p><div class="recibo"><h3>${t(db.loja.nome)}</h3>${linhas.map(([d, desc, v]) => { s += v; return `<div class="linha-r"><span><small class="mudo">${dataBR(d)}</small> ${t(desc)}</span><span class="num">${v ? (v > 0 ? '+' : '−') + din(Math.abs(v)) : ''}</span></div>`; }).join('')}<hr><div class="linha-r"><b>Em aberto hoje</b><b>${din(aberto(c.id))}</b></div></div>
    <div class="acoes"><button type="button" class="bt" data-imp>Imprimir</button></div>`, (j) => { $('[data-imp]', j).onclick = () => { document.body.classList.add('imprime-janela'); print(); }; }, true);
}
function formCliente(c) {
  const novo = !c; c = c || { nome: '', tel: '', cpf: '', nasc: '', end: '', limite: db.cfg.limitePadrao, obs: '' };
  abrir(`<h2>${novo ? 'Nova cliente' : 'Editar cliente'}</h2><div class="campos" style="margin-top:12px"><label class="campo inteiro">Nome<input id="fc-nome" value="${t(c.nome)}" required></label><label class="campo">WhatsApp<input id="fc-tel" inputmode="tel" value="${t(c.tel)}" placeholder="(16) 99999-9999"></label><label class="campo">Limite no fiado (R$)<input id="fc-lim" inputmode="decimal" value="${campoDin(c.limite)}"></label><label class="campo">CPF (opcional)<input id="fc-cpf" inputmode="numeric" value="${t(c.cpf)}"></label><label class="campo">Aniversário (opcional)<input id="fc-nasc" type="date" value="${t(c.nasc)}"></label><label class="campo inteiro">Endereço (opcional)<input id="fc-end" value="${t(c.end)}"></label><label class="campo inteiro">Observação<textarea id="fc-obs">${t(c.obs)}</textarea></label></div>
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
  abrir(`<h2>Lançar fiado do caderno</h2><p class="mudo">Passe para o sistema o que está anotado à mão. Fica no fiado da cliente, com vencimento, como qualquer outra compra.</p>
    <div class="campos"><label class="campo inteiro">Cliente<input id="fd-cli" list="dl-cli" placeholder="Nome (se for nova, é cadastrada)">${listaClientes()}</label><label class="campo">WhatsApp (se for nova)<input id="fd-tel" inputmode="tel"></label><label class="campo">Quanto ela deve (R$)<input id="fd-v" inputmode="decimal"></label>
    <label class="campo">Data da compra<input type="date" id="fd-data" value="${hoje()}"></label><label class="campo">O que comprou<input id="fd-desc" list="dl-fd" placeholder="Ex.: 2 blusas e 1 calça"><datalist id="dl-fd"><option value="Compras anotadas no caderno"><option value="Saldo antigo"></datalist></label>
    <label class="campo">Parcelas<select id="fd-n">${Array.from({ length: 12 }, (_, i) => `<option>${i + 1}</option>`).join('')}</select></label><label class="campo">Vencimento (1ª)<input type="date" id="fd-venc" value="${somaDias(hoje(), 30)}"><small>Se já venceu, ponha a data antiga: entra como atrasada.</small></label></div>
    <div class="acoes"><button type="button" class="bt cheio" data-ok>Lançar no fiado</button></div>`, (j) => {
    $('[data-ok]', j).onclick = () => {
      const nome = $('#fd-cli', j).value.trim(), v = lerDin($('#fd-v', j).value), n = Number($('#fd-n', j).value), venc = $('#fd-venc', j).value || somaDias(hoje(), 30);
      if (nome.length < 2) { toast('Escreva o nome da cliente.', true); return; } if (v <= 0) { toast('Digite quanto ela deve.', true); return; }
      let c = acharCli(nome); if (!c) { c = { id: uid('c'), nome, tel: telLimpo($('#fd-tel', j).value), cpf: '', nasc: '', end: '', limite: Math.max(db.cfg.limitePadrao, v), obs: '', bloqueado: false, credito: 0, criado: hoje() }; db.clientes.push(c); }
      const base = Math.floor(v / n), desc = $('#fd-desc', j).value.trim() || 'Fiado do caderno';
      for (let i = 0; i < n; i++) db.parcelas.push({ id: uid('pc'), cli: c.id, venda: null, caderno: desc, data: $('#fd-data', j).value || hoje(), num: i + 1, de: n, valor: i === n - 1 ? v - base * (n - 1) : base, saldo: i === n - 1 ? v - base * (n - 1) : base, venc: somaMes(venc, i), pags: [], status: 'aberta' });
      registra(`Fiado do caderno lançado para ${c.nome}: ${din(v)} (${desc})`, 'fiado'); grava(); fechar(); location.hash = `#cliente/${c.id}`; mostra(); toast(`${din(v)} lançado no fiado de ${c.nome.split(' ')[0]}.`);
    };
  });
}
function passarCaderno() {
  const linha = (i) => `<tr><td><input data-cd="${i}.nome" list="dl-cli" placeholder="Nome da cliente" aria-label="Cliente ${i + 1}"></td><td><input data-cd="${i}.tel" inputmode="tel" placeholder="WhatsApp" aria-label="WhatsApp ${i + 1}"></td><td><input data-cd="${i}.v" inputmode="decimal" placeholder="0,00" aria-label="Deve ${i + 1}"></td><td><input data-cd="${i}.venc" type="date" aria-label="Vencimento ${i + 1}"></td></tr>`;
  let n = 10;
  abrir(`<h2>Passar o caderno inteiro</h2><p class="mudo">Uma linha por cliente: nome, WhatsApp, quanto deve e quando vence (se já venceu, ponha a data antiga). Aperte Enter para ir ao próximo campo. Quem já está cadastrada só ganha a dívida.</p>
    <div class="tabela-wrap"><table class="tabela cd-tab"><thead><tr><th>Cliente</th><th>WhatsApp</th><th>Deve (R$)</th><th>Vence em</th></tr></thead><tbody data-cd-linhas>${Array.from({ length: n }, (_, i) => linha(i)).join('')}</tbody></table></div>${listaClientes()}
    <button type="button" class="link" data-cd-mais style="margin-top:8px">+ Mais 10 linhas</button><p class="mudo" data-cd-res style="margin:8px 0 0"></p>
    <div class="acoes"><button type="button" class="bt cheio" data-ok>Lançar tudo no fiado</button></div>`, (j) => {
    const ler = () => { const l = []; for (let i = 0; i < n; i++) { const g = (k) => ($(`[data-cd="${i}.${k}"]`, j) || {}).value || ''; const nome = g('nome').trim(), v = lerDin(g('v')); if (nome.length >= 2 && v > 0) l.push({ nome, tel: telLimpo(g('tel')), v, venc: g('venc') || somaDias(hoje(), 30) }); } return l; };
    const res = () => { const l = ler(); $('[data-cd-res]', j).textContent = l.length ? `${l.length} ${l.length === 1 ? 'cliente' : 'clientes'} · ${din(l.reduce((s, x) => s + x.v, 0))} no total` : ''; };
    j.addEventListener('input', res);
    j.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-cd]')) { e.preventDefault(); const c = $$('[data-cd]', j), k = c.indexOf(e.target); if (c[k + 1]) c[k + 1].focus(); } });
    $('[data-cd-mais]', j).onclick = () => { $('[data-cd-linhas]', j).insertAdjacentHTML('beforeend', Array.from({ length: 10 }, (_, i) => linha(n + i)).join('')); n += 10; };
    $('[data-ok]', j).onclick = () => {
      const l = ler(); if (!l.length) { toast('Preencha ao menos uma linha com nome e valor.', true); return; }
      l.forEach((x) => { let c = acharCli(x.nome); if (!c) { c = { id: uid('c'), nome: x.nome, tel: x.tel, cpf: '', nasc: '', end: '', limite: Math.max(db.cfg.limitePadrao, x.v), obs: '', bloqueado: false, credito: 0, criado: hoje() }; db.clientes.push(c); } else if (x.tel && !c.tel) c.tel = x.tel;
        db.parcelas.push({ id: uid('pc'), cli: c.id, venda: null, caderno: 'Fiado do caderno', data: hoje(), num: 1, de: 1, valor: x.v, saldo: x.v, venc: x.venc, pags: [], status: 'aberta' }); });
      registra(`Caderno passado para o sistema: ${l.length} clientes, ${din(l.reduce((s, x) => s + x.v, 0))}`, 'fiado'); grava(); fechar(); location.hash = '#fiado'; mostra(); toast(`${l.length} clientes lançadas no fiado.`);
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
  const desenhaGrade = (j) => { $('[data-grade]', j).innerHTML = grade(p, { editar: true }); };
  abrir(`<h2>${nova ? 'Nova peça' : 'Editar peça'}</h2><p class="mudo">${nova ? 'A quantidade de cada cor e tamanho entra como estoque inicial.' : 'Mudar a quantidade registra um ajuste com o motivo.'}</p>
    <div class="campos"><label class="campo inteiro">Nome<input id="fp-nome" value="${t(p.nome)}" placeholder="Ex.: Vestido Midi Floral"></label>
    <label class="campo">Categoria<input id="fp-cat" list="dl-cat" value="${t(p.cat)}"><datalist id="dl-cat">${Object.keys(ICONE_CAT).map((c) => `<option value="${c}">`).join('')}</datalist></label><label class="campo">Código<input id="fp-cod" value="${t(p.cod)}" placeholder="Ex.: VM-1021"></label>
    <label class="campo">Custo (R$)<input id="fp-custo" inputmode="decimal" value="${campoDin(p.custo)}"></label><label class="campo">Preço de venda (R$)<input id="fp-preco" inputmode="decimal" value="${campoDin(p.preco)}"><small data-margem></small></label>
    <label class="campo">Estoque mínimo por cor e tamanho<input id="fp-min" type="number" min="0" value="${p.min}"></label><label class="campo">Fornecedor<input id="fp-forn" list="dl-forn" value="${t(p.forn)}"><datalist id="dl-forn">${db.fornecedores.map((f) => `<option value="${t(f.nome)}">`).join('')}</datalist></label>
    <label class="campo inteiro">Tamanhos (separe por vírgula)<input id="fp-tam" value="${t(p.tam.join(', '))}"><small>Sugestões: <button type="button" class="link" data-tams="PP, P, M, G, GG">PP a GG</button> · <button type="button" class="link" data-tams="P, M, G, GG, XG, G1, G2, G3, G4">P até G4</button> · <button type="button" class="link" data-tams="G1, G2, G3, G4, G5">Plus G1 a G5</button> · <button type="button" class="link" data-tams="34, 36, 38, 40, 42, 44">34 a 44</button> · <button type="button" class="link" data-tams="44, 46, 48, 50, 52, 54, 56">44 a 56</button> · <button type="button" class="link" data-tams="Único">Único</button></small></label></div>
    <div style="display:flex;gap:12px;align-items:center;margin-top:14px"><span class="peca" data-foto-prev style="width:64px;height:64px">${p.foto ? `<img src="${t(p.foto)}" alt="">` : ''}</span><label class="bt pq" for="fp-foto">${p.foto ? 'Trocar foto' : 'Pôr foto da peça'}</label><input type="file" id="fp-foto" accept="image/*" class="sr"></div>
    <p class="campo" style="margin:14px 0 8px">Cores</p><div class="chips" data-cores>${p.cores.map((c, i) => `<button type="button" data-tira-cor="${i}" title="Tirar"><span class="bolinha" style="background:${t(c.h)}"></span>${t(c.n)} ×</button>`).join('')}</div>
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><input id="fp-cor" list="dl-cores" placeholder="Nova cor" style="min-height:40px;border-radius:10px;border:1px solid var(--linha);padding:6px 10px;flex:1;min-width:140px"><datalist id="dl-cores">${CORES_SUG.map(([n]) => `<option value="${n}">`).join('')}</datalist><input type="color" id="fp-corh" value="#8a5367" style="width:46px;height:40px;border:1px solid var(--linha);border-radius:10px;padding:2px"><button type="button" class="bt pq" data-acao-cor>Pôr cor</button></div>
    ${NOTA_LIGADA ? `<details style="margin-top:14px"><summary class="link">Dados fiscais da peça (para a nota)</summary><div class="campos" style="margin-top:10px"><label class="campo">NCM<input id="fp-ncm" list="dl-ncm" value="${t(p.ncm || NCM_SUG[p.cat] || '')}" placeholder="0000.00.00"><datalist id="dl-ncm">${Object.entries(NCM_SUG).map(([c, n]) => `<option value="${n}">${c}</option>`).join('')}</datalist><small>Confirme com o seu contador.</small></label><label class="campo">CFOP<input id="fp-cfop" value="${t(p.cfop || '5102')}"></label><label class="campo">CSOSN / CST<input id="fp-csosn" value="${t(p.csosn || '102')}"></label><label class="campo">Origem<select id="fp-orig"><option value="0" ${(p.orig || '0') === '0' ? 'selected' : ''}>0 · Nacional</option><option value="1" ${p.orig === '1' ? 'selected' : ''}>1 · Importada direto</option><option value="2" ${p.orig === '2' ? 'selected' : ''}>2 · Importada no mercado interno</option></select></label></div></details>` : ''}
    <p class="campo" style="margin:16px 0 8px">Quantidade em estoque</p><div data-grade></div>
    ${nova ? '' : '<label class="campo" style="margin-top:10px">Motivo do ajuste (se mudar a quantidade)<input id="fp-mot" list="dl-aj" placeholder="Ex.: contagem do estoque"><datalist id="dl-aj"><option value="Contagem do estoque"><option value="Peça com defeito"><option value="Perda ou furto"><option value="Brinde"></datalist></label>'}
    <div class="acoes">${nova ? '' : `<button type="button" class="bt perigo" data-arquivar>${p.arquivado ? 'Voltar para a venda' : 'Arquivar'}</button>`}<button type="button" class="bt cheio" data-ok>Salvar</button></div>`, (j) => {
    const lerGrade = () => $$('[data-g]', j).forEach((i) => { p.q[i.dataset.g] = Math.max(0, Math.round(Number(i.value) || 0)); });
    const margem = () => { const c = lerDin($('#fp-custo', j).value), v = lerDin($('#fp-preco', j).value); $('[data-margem]', j).textContent = c && v ? `Margem ${Math.round((v - c) / v * 100)}% · ${din(v - c)} por peça` : ''; };
    desenhaGrade(j); margem(); j.addEventListener('input', (e) => { if (e.target.id === 'fp-custo' || e.target.id === 'fp-preco') margem(); });
    const corChips = () => { $('[data-cores]', j).innerHTML = p.cores.map((c, i) => `<button type="button" data-tira-cor="${i}" title="Tirar"><span class="bolinha" style="background:${t(c.h)}"></span>${t(c.n)} ×</button>`).join(''); };
    $('#fp-cor', j).addEventListener('change', (e) => { const s = CORES_SUG.find(([n]) => sa(n) === sa(e.target.value)); if (s) $('#fp-corh', j).value = s[1]; });
    $('#fp-foto', j).addEventListener('change', (e) => { const f = e.target.files[0]; if (f) lerFoto(f, 320).then((u) => { p.foto = u; $('[data-foto-prev]', j).innerHTML = `<img src="${u}" alt="">`; }).catch((x) => toast(x.message, true)); });
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
      Object.assign(p, { ncm: $('#fp-ncm', j).value.trim(), cfop: $('#fp-cfop', j).value.trim() || '5102', csosn: $('#fp-csosn', j).value.trim() || '102', orig: $('#fp-orig', j).value });
      Object.assign(p, { nome, cat: $('#fp-cat', j).value.trim() || 'Outras', cod: $('#fp-cod', j).value.trim(), custo: lerDin($('#fp-custo', j).value), preco, min: Math.max(0, Number($('#fp-min', j).value) || 0), forn: $('#fp-forn', j).value.trim(), tam });
      if (p.forn && !db.fornecedores.some((f) => sa(f.nome) === sa(p.forn))) db.fornecedores.push({ id: uid('f'), nome: p.forn, tel: '' });
      if (nova) {
        const np = { ...p, id: uid('p'), q: {}, criado: hoje(), arquivado: false };
        db.produtos.push(np); Object.entries(p.q).forEach(([k, q]) => { const [cor, tm] = k.split('|'); if (q > 0 && np.tam.includes(tm) && np.cores.some((c) => c.n === cor)) mover(np, cor, tm, q, 'entrada', 'Estoque inicial', 'Cadastro da peça'); });
      } else {
        const orig = prod(p.id), mot = $('#fp-mot', j).value.trim() || 'Ajuste manual';
        p.cores.forEach((c) => p.tam.forEach((tm) => { const k = `${c.n}|${tm}`, nv = p.q[k] || 0, at = orig.q[k] || 0; if (nv !== at) { orig.q[k] = at; mover(orig, c.n, tm, nv - at, 'ajuste', 'Ajuste', mot); } }));
        const q = orig.q; Object.assign(orig, { ...p, q });
      }
      grava(); fechar(); mostra(); toast(nova ? 'Peça cadastrada.' : 'Peça salva.');
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
  const cx = db.caixa.aberto, r = resumoCaixa(cx);
  abrir(`<h2>Fechar o caixa</h2><p class="mudo">Conte o dinheiro da gaveta. O sistema esperava <b>${din(r.esperado)}</b>.</p><label class="campo">Dinheiro contado (R$)<input id="fx-c" inputmode="decimal"></label><p data-dif class="mudo" style="margin:8px 0 0"></p><label class="campo" style="margin-top:10px">Observação<input id="fx-o" placeholder="Ex.: faltou troco"></label>
    <div class="acoes"><button type="button" class="bt cheio" data-ok>Fechar caixa</button></div>`, (j) => {
    $('#fx-c', j).addEventListener('input', (e) => { const d = lerDin(e.target.value) - r.esperado; $('[data-dif]', j).innerHTML = e.target.value ? (d === 0 ? '<span style="color:var(--ok)">Bateu certinho.</span>' : `<span style="color:var(--mal)">${d > 0 ? 'Sobrou' : 'Faltou'} ${din(Math.abs(d))}.</span>`) : ''; });
    $('[data-ok]', j).onclick = () => { if (!$('#fx-c', j).value.trim()) { toast('Digite o dinheiro contado.', true); return; } const c = lerDin($('#fx-c', j).value); db.caixa.historico.push({ ...cx, fechamento: agora(), contado: c, esperado: r.esperado, dif: c - r.esperado, obs: $('#fx-o', j).value.trim(), resumo: r, por: eu().nome }); db.caixa.aberto = null; registra(`Caixa fechado: contado ${din(c)}, esperado ${din(r.esperado)}`, 'caixa'); grava(); fechar(); mostra(); toast(c === r.esperado ? 'Caixa fechado. Bateu certinho.' : `Caixa fechado com diferença de ${din(c - r.esperado)}.`); };
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
  if (d.bloq) { const c = cli(d.bloq); c.bloqueado = !c.bloqueado; grava(); mostra(); return toast(c.bloqueado ? `${c.nome} bloqueada no fiado (à vista continua).` : `${c.nome} liberada no fiado.`); }
  if (d.ff) { estado.fiadoFiltro = d.ff; location.hash = '#fiado'; return mostra(); }
  if (d.ea) { estado.estoqueAba = d.ea; if (location.hash !== '#estoque') location.hash = '#estoque'; return mostra(); }
  if (d.per) { estado.relPer = d.per; return mostra(); }
  if (d.peca && !e.target.closest('button')) return formPeca(prod(d.peca));
  if (d.repor) return formCompra(d.repor);
  if (d.mov) return movCaixa(d.mov);
  if (d.nota) { fechar(); return danfe(db.notas.find((x) => x.id === d.nota)); }
  if (d.emitir) { const v = db.vendas.find((x) => x.id === d.emitir); const n = emitirNota(v, ''); grava(); fechar(); return danfe(n); }
  if (d.cancelaNota) { const n = db.notas.find((x) => x.id === d.cancelaNota); return confirmar('Cancelar esta nota?', 'O cancelamento fica registrado e a nota perde o valor. A venda continua; se precisar, faça a devolução.', 'Cancelar a nota', () => { n.status = 'cancelada'; registra(`NFC-e nº ${n.numero} cancelada`, 'fiscal'); grava(); mostra(); toast('Nota cancelada.'); }, true); }
  if (d.ca) { estado.comprasAba = d.ca; if (!location.hash.startsWith('#compras')) location.hash = '#compras'; return mostra(); }
  if (d.receberPedido) return receberPedido(db.pedidos.find((x) => x.id === d.receberPedido));
  if (d.cancelarPedido) { const pd = db.pedidos.find((x) => x.id === d.cancelarPedido); return confirmar('Cancelar o que falta deste pedido?', 'O que já chegou continua no estoque. O resto sai do pedido.', 'Cancelar o resto', () => { pd.itens.forEach((it) => { it.q = { ...(it.rec || {}) }; }); pd.status = 'recebido'; registra(`Pedido nº ${pd.n}: o que faltava foi cancelado`, 'compra'); grava(); mostra(); }, true); }
  if (d.etiquetas) return etiquetas(prod(d.etiquetas));
  if (d.tiraPromo) { db.promos = db.promos.filter((x) => x.id !== d.tiraPromo); grava(); mostra(); return toast('Promoção tirada.'); }
  if (d.entrarComo) { db.usuario = d.entrarComo; grava(); registra(`Entrou como ${eu().nome} (demonstração)`, 'acesso'); location.hash = d.entrarComo === 'u1' ? '#dono' : '#inicio'; mostra(); return toast(`Agora você vê o sistema como ${eu().nome.split(' ')[0]}.`); }
  if (d.abrirEm) { eu().abrirEm = d.abrirEm; grava(); mostra(); return toast('Salvo.'); }
  if (el.closest('.add-menu')) el.closest('details').removeAttribute('open');
  if (d.tema && el.closest('.temas')) { db.tema = d.tema; grava(); mostra(); return toast(`Cor ${TEMAS.find((x) => x[0] === d.tema)[1].toLowerCase()} aplicada.`); }
  if (!ac) return;
  ({
    esvaziar: () => { estado.sacola = []; estado.excecao = null; ajustaPagamento(); mostra(); },
    dividir: () => { const falta = totalSacola() - estado.pag.reduce((s, x) => s + (x.v || 0), 0); estado.pag.push({ f: estado.pag.some((x) => x.f === 'fiado') ? 'dinheiro' : 'fiado', v: Math.max(0, falta) }); mostra(); },
    completar: () => { const falta = totalSacola() - estado.pag.reduce((s, x) => s + (x.v || 0), 0), u = estado.pag[estado.pag.length - 1]; u.v = Math.max(0, (u.v || 0) + falta); mostra(); },
    excecao: liberarExcecao, finalizar: finalizarVenda,
    'ir-vender': () => { location.hash = '#vender'; }, 'xml-notas': () => baixar(`notas-${hoje()}.csv`, csv([['Número', 'Série', 'Data', 'Chave', 'CPF', 'Valor', 'Situação'], ...db.notas.map((n) => [n.numero, n.serie, `${dataBR(n.data)} ${horaBR(n.data)}`, n.chave, n.cpf, campoDin(n.valor), n.status])])), 'novo-pedido': formPedido, 'nova-promo': formPromo, 'conferir-extrato': conferirExtrato, 'fiado-caderno': fiadoCaderno, 'passar-caderno': passarCaderno, ajuda: () => window.open(`https://wa.me/5516991500746?text=${encodeURIComponent(`Olá! Uso o Peplo na ${db.loja.nome} e preciso de ajuda.`)}`, '_blank', 'noopener'), 'receber-escolher': receberEscolher,
    'mov-despesa': () => movCaixa('despesa'), 'mov-retirada': () => movCaixa('retirada'), 'mov-reforco': () => movCaixa('reforco'),
    'importar-clientes': () => importar('clientes'), 'importar-pecas': () => importar('pecas'), instalar,
    'tira-foto-eu': () => { eu().foto = ''; grava(); mostra(); },
    'salvar-pin': async () => { const p = ($('#pin-novo') || {}).value || ''; if (!/^\d{4}$/.test(p)) { toast('A senha tem 4 números.', true); return; } eu().pin = await resumoPin(p); grava(); mostra(); toast('Senha salva.'); },
    'novo-usuario': () => abrir(`<h2>Pessoa da equipe</h2><p class="mudo">Na conta de verdade ela recebe o convite e entra com o próprio login.</p><div class="campos"><label class="campo inteiro">Nome<input id="nu-n"></label><label class="campo">WhatsApp<input id="nu-t" inputmode="tel"></label><label class="campo">Desconto sem pedir (%)<input id="nu-d" type="number" min="0" max="100" value="5"></label></div><div class="acoes"><button type="button" class="bt cheio" data-ok>Pôr na equipe</button></div>`, (j) => { $('[data-ok]', j).onclick = () => { const n = $('#nu-n', j).value.trim(); if (n.length < 2) { toast('Escreva o nome.', true); return; } db.usuarios.push({ id: uid('u'), nome: n, perfil: 'vendedora', tel: telLimpo($('#nu-t', j).value), email: '', foto: '', nasc: '', descMax: Number($('#nu-d', j).value) || 0, perms: {}, pin: '' }); registra(`${n} entrou na equipe`, 'equipe'); grava(); fechar(); mostra(); toast(`${n} está na equipe.`); }; }),
    'nova-cli': () => formCliente(), 'nova-peca': () => formPeca(), 'nova-compra': () => formCompra(),
    'novo-forn': () => abrir(`<h2>Novo fornecedor</h2><div class="campos" style="margin-top:12px"><label class="campo">Nome<input id="nf-n"></label><label class="campo">WhatsApp<input id="nf-t" inputmode="tel"></label></div><div class="acoes"><button type="button" class="bt cheio" data-ok>Salvar</button></div>`, (j) => { $('[data-ok]', j).onclick = () => { const n = $('#nf-n', j).value.trim(); if (!n) { toast('Escreva o nome.', true); return; } db.fornecedores.push({ id: uid('f'), nome: n, tel: telLimpo($('#nf-t', j).value) }); grava(); fechar(); mostra(); }; }),
    'abrir-caixa': () => { db.caixa.aberto = { id: uid('cx'), abertura: agora(), inicial: lerDin($('#cx-ini').value), movs: [] }; grava(); mostra(); toast('Caixa aberto.'); },
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
  if (el.id === 'pdv-busca' || el.id === 'est-busca') { estado.busca = el.value; const pos = el.selectionStart; mostra(); const n = $(`#${el.id}`); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
  if (el.id === 'cli-busca') { estado.cliBusca = el.value; const pos = el.selectionStart; mostra(); const n = $('#cli-busca'); n.focus(); n.setSelectionRange(pos, pos); }
});
document.addEventListener('change', (e) => {
  const el = e.target, d = el.dataset;
  if (el.id === 'v-cli') { estado.vCli = el.value; estado.excecao = null; mostra(); }
  if (el.id === 'v-nota') { estado.nota = el.checked; }
  if (el.id === 'v-cpf') { estado.cpf = el.value; }
  if (el.id === 'v-desc') { estado.desc = lerDin(el.value); ajustaPagamento(); mostra(); }
  if (d.pf !== undefined) { estado.pag[Number(d.pf)].f = el.value; estado.excecao = null; mostra(); }
  if (d.pv !== undefined) { estado.pag[Number(d.pv)].v = lerDin(el.value); mostra(); }
  if (d.pp !== undefined) { estado.pag[Number(d.pp)].parc = Number(el.value); mostra(); }
  if (el.id === 'p-n') { estado.parc.n = Number(el.value); mostra(); }
  if (el.id === 'p-int') { estado.parc.int = el.value; mostra(); }
  if (el.id === 'p-prim') { estado.parc.prim = el.value || somaMes(hoje(), 1); mostra(); }
  if (el.id === 'rel-de') { estado.relDe = el.value; mostra(); }
  if (el.id === 'rel-ate') { estado.relAte = el.value; mostra(); }
  if (d.loja) { db.loja[d.loja] = d.loja === 'tel' ? telLimpo(el.value) : el.value.trim(); grava(); marca(); toast('Salvo.'); }
  if (d.cfg) { db.cfg[d.cfg] = Math.max(1, Number(el.value) || 1); grava(); toast('Regra salva.'); }
  if (d.cfgd) { db.cfg[d.cfgd] = lerDin(el.value); grava(); toast('Regra salva.'); }
  if (d.cfgb) { db.cfg[d.cfgb] = el.checked; grava(); marca(); toast('Regra salva.'); }
  if (d.juros) { db.cfg.juros[d.juros] = d.juros === 'ativo' ? el.checked : Math.max(0, Number(el.value) || 0); if (d.juros === 'multaPct') db.cfg.juros.multaPct = Math.min(2, db.cfg.juros.multaPct); grava(); if (d.juros === 'ativo') mostra(); toast('Regra salva.'); }
  if (el.matches('[data-fiscal-usar]')) { db.fiscal.usar = el.checked; registra(`Nota fiscal ${el.checked ? 'ligada' : 'desligada'}`, 'fiscal'); grava(); mostra(); toast(el.checked ? 'Nota fiscal ligada. Complete os dados da loja.' : 'Nota fiscal desligada.'); }
  if (d.fiscal) { db.fiscal[d.fiscal] = ['serie', 'proximo'].includes(d.fiscal) ? Math.max(1, Number(el.value) || 1) : el.value.trim(); grava(); toast('Dado fiscal salvo.'); }
  if (d.taxa) { db.cfg.taxas[d.taxa] = Math.max(0, Number(el.value) || 0); grava(); toast('Taxa salva.'); }
  if (d.parado !== undefined) { db.cfg.parados[Number(d.parado)] = Math.max(1, Number(el.value) || 1); db.cfg.parados.sort((a, b) => a - b); grava(); toast('Faixas salvas.'); }
  if (d.msg) { db.cfg.msgs = db.cfg.msgs || {}; const v = el.value.trim(); if (!v || v === MSGS[d.msg].sug) delete db.cfg.msgs[d.msg]; else db.cfg.msgs[d.msg] = v; grava(); toast('Mensagem salva.'); }
  if (d.eu) { eu()[d.eu] = d.eu === 'tel' ? telLimpo(el.value) : el.value.trim(); grava(); marca(); toast('Perfil salvo.'); }
  if (el.id === 'foto-eu' && el.files?.[0]) lerFoto(el.files[0], 192).then((u) => { eu().foto = u; grava(); mostra(); toast('Foto no perfil.'); }).catch((x) => toast(x.message, true));
  if (el.dataset.meta !== undefined && el.matches('[data-meta]')) { db.meta = lerDin(el.value); grava(); mostra(); toast('Meta salva.'); }
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
addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#bt-busca').click(); } });
// ao vivo: as telas de números se atualizam sozinhas (sem atrapalhar quem está digitando ou com uma janela aberta)
setInterval(() => { const n = (location.hash.slice(1) || 'inicio').split('/')[0]; if (['inicio', 'relatorios', 'caixa', 'dono', 'fiado'].includes(n) && $('#camada').hidden && !document.activeElement.matches('input,textarea,select') && !document.querySelector('details.add[open]')) mostra(); }, 20000);
// abre na tela que a pessoa escolheu no perfil
if (!location.hash && eu().abrirEm && eu().abrirEm !== 'inicio') location.hash = `#${eu().abrirEm}`;
if (new URLSearchParams(location.search).has('instalar')) setTimeout(instalar, 900);
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); location.replace(location.pathname); });
if ('serviceWorker' in navigator && window === window.top) navigator.serviceWorker.register('sw.js').catch(() => {});
rota();
