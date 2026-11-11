// Fortis · núcleo: utilidades, dados (no aparelho), dados de exemplo da demonstração, ícones e peças de tela
// (folha que sobe de baixo, aviso rápido, formulário). Dinheiro sempre em centavos.

export const CHAVE = 'fortis-v1';
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const t = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const din = (c) => (Math.round(c || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dinCurto = (c) => { const v = Math.round(c || 0) / 100; return Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : din(c).replace(',00', ''); };
export const lerDin = (v) => { let s = String(v ?? '').replace(/[^\d,.-]/g, ''); if (!s) return 0; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const n = Number(s); return Number.isFinite(n) ? Math.round(n * 100) : 0; };
export const lerNum = (v) => { let s = String(v ?? '').trim().replace(/[^\d,.-]/g, ''); if (!s) return 0; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const n = Number(s); return Number.isFinite(n) ? n : 0; };
export const campoDin = (c) => (c ? (c / 100).toFixed(2).replace('.', ',') : '');
export const numBR = (n, casas = 2) => (Math.round((n || 0) * 10 ** casas) / 10 ** casas).toLocaleString('pt-BR', { maximumFractionDigits: casas });
let seq = 0;
export const uid = (p = 'x') => `${p}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const pad = (n) => String(n).padStart(2, '0');
export const isoD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hoje = () => isoD(new Date());
export const somaDias = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoD(new Date(y, m - 1, d + n)); };
export const dias = (de, ate = hoje()) => Math.round((new Date(`${ate}T12:00`) - new Date(`${String(de).slice(0, 10)}T12:00`)) / 864e5);
export const dataBR = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');
export const dataCurta = (iso) => { if (!iso) return ''; const d = new Date(`${iso.slice(0, 10)}T12:00`); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''); };
export const agora = () => { const d = new Date(); return `${isoD(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export function haQuanto(iso) {
  const ms = Date.now() - new Date(iso.length > 10 ? iso : `${iso}T12:00`).getTime(), h = Math.round(ms / 36e5);
  if (h < 1) return 'agora há pouco'; if (h < 24) return `há ${h} h`; const d = Math.round(h / 24); return d === 1 ? 'ontem' : d < 30 ? `há ${d} dias` : dataBR(iso);
}
export const quando = (iso) => { const n = dias(hoje(), iso); return n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n === -1 ? 'ontem' : n > 1 && n < 7 ? new Date(`${iso}T12:00`).toLocaleDateString('pt-BR', { weekday: 'long' }) : dataCurta(iso); };
export const telLimpo = (tel) => String(tel || '').replace(/\D/g, '');
// link do WhatsApp (na demonstração o js/envio-demo.js mostra a simulação; não usar location.href)
export const zap = (tel, m) => { const d = telLimpo(tel); return `https://wa.me/${d ? (d.length >= 12 ? d : `55${d}`) : ''}?text=${encodeURIComponent(m)}`; };
export const abrirZap = (tel, m) => window.open(zap(tel, m), '_blank', 'noopener');
export const iniciais = (n) => String(n || '?').split(/\s+/).filter((x) => x && !/^(d[aeo]s?|e)$/i.test(x)).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
const CORES_AV = ['#5E7486', '#2E333B', '#8C7756', '#6F8597', '#7C6A5E', '#4F6B66', '#7D6574'];
export const corAv = (s) => CORES_AV[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % CORES_AV.length];
export const av = (nome, cls = '') => `<span class="av ${cls}" style="background:${corAv(nome)}" aria-hidden="true">${t(iniciais(nome))}</span>`;
export const vibra = (ms = 10) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* sem vibração */ } };
export const reduzido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------------ ícones próprios (traço 1,8, cantos redondos)
const P = {
  tijolo: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 9.7h18M3 14.3h18M9 5v4.7M15 9.7v4.6M9 14.3V19M15 5v4.7"/>',
  piso: '<path d="M3 8 12 3l9 5-9 5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8M7.5 5.5l9 5M16.5 5.5l-9 5"/>',
  capacete: '<path d="M3 17h18M4.5 17a7.5 7.5 0 0 1 15 0"/><path d="M10 10V6.5h4V10M12 6.5v3"/>',
  carrinho: '<path d="M3 6h3l3 9h9l2-6H8"/><circle cx="10" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/>',
  raio: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
  gota: '<path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3z"/>',
  rolo: '<rect x="3" y="3.5" width="15" height="6" rx="1.5"/><path d="M18 6.5h2.5v5H11v3"/><rect x="9.5" y="14.5" width="3" height="6.5" rx="1"/>',
  placa: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 9h16M4 15h16M12 3v18"/>',
  solda: '<path d="M4 20 14 10M14 10l3-3 3 3-3 3z"/><path d="M6 8l1.5 1.5M4 11h2M9 4v2M4 4l2 2"/>',
  vidro: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 10l4-4M8 15l8-8M13 17l3-3"/>',
  telhado: '<path d="M2 12 12 4l10 8"/><path d="M5 10v10h14V10"/><path d="M5 14h14M5 17h14"/>',
  chave: '<path d="M14.5 3.5a5 5 0 0 0-4.6 7L3.5 17v3.5H7l6.4-6.4a5 5 0 1 0 1.1-10.6z"/><circle cx="16" cy="8" r="1.3"/>',
  neve: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.5 4l2.5 2 2.5-2M9.5 20l2.5-2 2.5 2"/>',
  folha: '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19 13 11"/>',
  escudo: '<path d="M12 3 4.5 6v6c0 4.6 3.2 7.8 7.5 9 4.3-1.2 7.5-4.4 7.5-9V6z"/>',
  calha: '<path d="M3 7h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M16 14v7"/>',
  grade: '<path d="M4 4h16v16H4zM9 4v16M15 4v16M4 9h16M4 15h16"/>',
  casa: '<path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  lupa: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  gente: '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 6M21 20a5 5 0 0 0-3.5-4.8"/>',
  caixa: '<path d="M4 8h16v12H4z"/><path d="M8 8V5.5h8V8M4 13h16M10 13v2h4v-2"/>',
  serrote: '<path d="M3 16 15.5 3.5l2 2L6 17"/><path d="M5 14l1.2 1.2M7.5 11.5l1.2 1.2M10 9l1.2 1.2M12.5 6.5l1.2 1.2"/><path d="M16 6l4 4-2.5 2.5-4-4"/><path d="M14 18h7"/>',
  trena: '<rect x="3" y="7" width="12" height="12" rx="3"/><circle cx="9" cy="13" r="2.4"/><path d="M15 15h6v3h-3"/>',
  lista: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1.2 1.2L6.8 5M3.5 12l1.2 1.2L6.8 11M3.5 18l1.2 1.2L6.8 17"/>',
  loja: '<path d="M4 10v10h16V10"/><path d="M3 10 5 4h14l2 6c0 1.4-1.2 2.4-2.6 2.4S16 11.4 16 10c0 1.4-1.2 2.4-2.6 2.4S11 11.4 11 10c0 1.4-1.2 2.4-2.6 2.4S5.6 11.4 5.6 10"/><path d="M10 20v-4h4v4"/>',
  moeda: '<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.5-1-1.6-1.6-2.8-1.6-1.6 0-2.8.9-2.8 2.2 0 3 5.8 1.5 5.8 4.4 0 1.3-1.3 2.2-3 2.2-1.3 0-2.5-.6-3-1.7M12 6v1.6M12 16.4V18"/>',
  grafico: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  ferramenta: '<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3z"/><path d="M14.5 6.5 17 4l3 3-2.5 2.5"/>',
  calendario: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  zap: '<path d="M4.5 19.5 5.6 16A8 8 0 1 1 8.4 18.6z"/><path d="M9.3 8.6c.3 2.6 2.3 4.8 5 5.6l1-1.1-1.8-1-1 .8a4.5 4.5 0 0 1-2-2l.8-1-1-1.8z"/>',
  coracao: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10C19.5 15.4 12 20 12 20z"/>',
  balao: '<path d="M4 5h16v11H9l-5 4z"/>',
  salvar: '<path d="M6 4h12v16l-6-4-6 4z"/>',
  partilhar: '<circle cx="6" cy="12" r="2.5"/><circle cx="17.5" cy="6" r="2.5"/><circle cx="17.5" cy="18" r="2.5"/><path d="m8.2 10.8 7-3.6M8.2 13.2l7 3.6"/>',
  seta: '<path d="M15 5 8 12l7 7"/>',
  setaDir: '<path d="m9 5 7 7-7 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  lapis: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  lixo: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  luz: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  alerta: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17v.3"/>',
  camera: '<path d="M4 8h3.5L9 5.5h6L16.5 8H20v11H4z"/><circle cx="12" cy="13.5" r="3.4"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  pix: '<path d="m12 3.5 3 3-3 3-3-3zM12 14.5l3 3-3 3-3-3zM3.5 12l3-3 3 3-3 3zM14.5 12l3-3 3 3-3 3z"/>',
  copiar: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
  recarregar: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4.5h-4.5"/>',
  estrela: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8-4.3-4.1 5.9-.8z"/>',
  ia: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><path d="M12 7.5 13.4 11l3.1 1-3.1 1L12 16.5 10.6 13l-3.1-1 3.1-1z"/>',
  mapa: '<path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  porta: '<path d="M6 21V3.5h10V21M4 21h16"/><circle cx="13.5" cy="12.5" r=".9"/>',
  chapa: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 12h10V5M13 12v7M13 15.5h8"/>',
  regua: '<path d="M3 16 16 3l5 5L8 21z"/><path d="m7 12 1.5 1.5M10 9l2 2M13 6l1.5 1.5"/>',
  sacola: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  enviar: '<path d="m4 12 16-8-6 16-2.5-6.5z"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/>',
  ajuda: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.9M12 16.5v.3"/>',
  globo: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.5 3.5 5.4 3.5 8.5s-1.1 6-3.5 8.5c-2.4-2.5-3.5-5.4-3.5-8.5s1.1-6 3.5-8.5z"/>',
  antesdepois: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 3v18"/><path d="m8 12-2 0M16 12h2"/>',
  sino: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  olho: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
};
export const ico = (n, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${P[n] || P.mais}</svg>`;

// ------------------------------------------------------------------ dados
export let db = null;
export function carregar() {
  const q = new URLSearchParams(location.search);
  if (q.has('novo')) { try { localStorage.removeItem(CHAVE); } catch { /* sem acesso */ } }
  try { const d = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (d && d.v === 1) { db = d; return db; } } catch { /* dado estragado: recomeça com o exemplo */ }
  db = exemplo(); grava(); return db;
}
let avisouCheio = false;
export function grava() {
  try { localStorage.setItem(CHAVE, JSON.stringify(db)); avisouCheio = false; }
  catch { if (!avisouCheio) { avisouCheio = true; toast('O celular ficou sem espaço para guardar. Apague fotos antigas do portfólio.', 'erro'); } }
}
export const achar = (lista, id) => (db[lista] || []).find((x) => x.id === id);

// ------------------------------------------------------------------ dados de exemplo (todos fictícios, marcados como exemplo)
function exemplo() {
  const H = hoje(), d = (n) => somaDias(H, n);
  let semente = 7;
  const rnd = () => { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; };
  const lojas = [
    { id: 'l1', nome: 'Depósito Ipê (exemplo)', end: 'Av. do Exemplo, 100', tel: '1690000-0201', exemplo: true, lat: -20.7196, lon: -47.8862 },
    { id: 'l2', nome: 'Casa do Construtor Jatobá (exemplo)', end: 'Rua Fictícia, 45', tel: '1690000-0202', exemplo: true, lat: -20.7232, lon: -47.8790 },
    { id: 'l3', nome: 'Materiais Peroba (exemplo)', end: 'Rua de Demonstração, 900', tel: '1690000-0203', exemplo: true, lat: -20.7151, lon: -47.8921 },
  ];
  // preços de exemplo (não são preços de lojas reais)
  const tabela = [
    ['Cimento CP-II 50 kg', 'saco', [3790, 3590, 3990]], ['Areia média (m³)', 'm³', [14500, 15800, 13900]], ['Brita 1 (m³)', 'm³', [15900, 14900, 16500]],
    ['Bloco de concreto 14x19x39', 'un', [390, 420, 365]], ['Cal hidratada 20 kg', 'saco', [1890, 1790, 2190]], ['Ferro 3/8 CA-50 (barra 12 m)', 'barra', [5490, 5790, 5190]],
    ['Porcelanato 60x60 (m²)', 'm²', [6990, 7490, 6490]], ['Argamassa AC-III 20 kg', 'saco', [4290, 3890, 4590]], ['Argamassa AC-II 20 kg', 'saco', [2390, 2190, 2490]],
    ['Rejunte 5 kg', 'saco', [3290, 2990, 4990]], ['Espaçador 2 mm (pacote 100)', 'pacote', [690, 590, 750]], ['Cunha niveladora (pacote 100)', 'pacote', [3990, 4290, 3790]],
    ['Tinta acrílica fosca 18 L', 'lata', [32900, 29900, 34900]], ['Tubo PVC soldável 25 mm (barra 6 m)', 'barra', [2290, 2490, 2190]],
    ['Chapa MDF 15 mm branco 2750x1840', 'chapa', [28900, 30500, 27400]], ['Tábua de cumaru 10 cm (metro)', 'm', [2850, 3100, 2690]],
  ];
  const precos = [];
  tabela.forEach(([nome, un, ps], i) => ps.forEach((p, k) => precos.push({ id: `pr${i}${k}`, mat: nome, un, loja: lojas[k].id, preco: p, data: d(-Math.floor(rnd() * 20)), fonte: ['nota', 'orçamento', 'balcão'][k], exemplo: true })));
  const clientes = [
    { id: 'c1', nome: 'Juliana Rocha', tel: '1690000-0101', end: 'Rua das Acácias, 120 · Centro', desde: d(-40), obs: 'Prefere contato à tarde.' },
    { id: 'c2', nome: 'Paulo Mendes', tel: '1690000-0102', end: 'Chácara Recanto, km 4', desde: d(-6), obs: 'Indicação da Juliana.' },
    { id: 'c3', nome: 'Carla Nunes', tel: '1690000-0103', end: 'Rua Goiás, 88', desde: d(-18) },
    { id: 'c4', nome: 'Renato Lima', tel: '1690000-0104', end: 'Av. Brasil, 1500, ap 32', desde: d(-55) },
    { id: 'c5', nome: 'Irene Prado', tel: '1690000-0105', end: 'Rua São Paulo, 410', desde: d(-90), obs: 'Combinou pagar o resto em 2 vezes.' },
    { id: 'c6', nome: 'Felipe Andrade', tel: '1690000-0106', end: 'Rua Minas, 77', desde: d(-120) },
  ];
  const item = (mat, qtd, loja, comprado = false) => { const p = precos.find((x) => x.mat === mat && x.loja === loja) || precos.find((x) => x.mat === mat); return { id: uid('m'), nome: mat, un: p ? p.un : 'un', qtd, preco: p ? p.preco : 0, loja, comprado }; };
  const etapas = (nomes, feitas) => nomes.map((n, i) => ({ id: uid('e'), nome: n, feito: i < feitas }));
  const orc = (o) => ({ modo: 'empreitada', valorUn: 0, qtd: 1, desloc: 0, margem: 10, mostrarItens: true, entradaPct: 40, parcelas: 1, validade: 15, prazo: 15, status: 'rascunho', ...o });
  const obras = [
    { id: 'o1', cliente: 'c1', titulo: 'Reforma do banheiro social', tipo: 'banheiro', oficio: 'azulejista', status: 'andamento', criada: d(-30), inicio: d(-6), prazo: d(8),
      etapas: etapas(['Quebrar o piso e o azulejo velho', 'Hidráulica nova', 'Contrapiso e impermeabilização', 'Assentar porcelanato', 'Rejunte e limpeza'], 2),
      mats: [item('Porcelanato 60x60 (m²)', 22, 'l1', true), item('Argamassa AC-III 20 kg', 8, 'l1'), item('Rejunte 5 kg', 2, 'l3'), item('Espaçador 2 mm (pacote 100)', 2, 'l3'), item('Cunha niveladora (pacote 100)', 2, 'l2'), item('Cimento CP-II 50 kg', 6, 'l3', true), item('Tubo PVC soldável 25 mm (barra 6 m)', 4, 'l2', true)],
      orc: orc({ modo: 'm2', valorUn: 9000, qtd: 22, desloc: 0, status: 'aprovado', enviadoEm: d(-27), parcelas: 2 }), recebido: 150000,
      agenda: [{ id: uid('a'), data: d(2), hora: '07:30', nota: 'Assentar o porcelanato' }], hist: [{ data: d(-30), txt: 'Visita e medidas' }, { data: d(-27), txt: 'Orçamento enviado no WhatsApp' }, { data: d(-24), txt: 'Aprovado com entrada de R$ 1.500' }], antes: true,
      diario: [{ id: 'dd1', data: d(-6), nota: 'Quebrei o piso e o azulejo velho. Entulho já saiu.', foto: '' }, { id: 'dd2', data: d(-3), nota: 'Hidráulica nova do chuveiro e da pia, testada por 30 min.', foto: '' }] },
    { id: 'o2', cliente: 'c2', titulo: 'Muro de bloco na divisa (28 m²)', tipo: 'muro', oficio: 'pedreiro', status: 'orcamento', criada: d(-3), prazo: d(25),
      etapas: etapas(['Visita e medidas', 'Fundação e baldrame', 'Levantar o bloco', 'Reboco e chapisco'], 1),
      mats: [item('Bloco de concreto 14x19x39', 368, 'l3'), item('Cimento CP-II 50 kg', 14, 'l1'), item('Areia média (m³)', 2, 'l1'), item('Brita 1 (m³)', 1, 'l2'), item('Cal hidratada 20 kg', 4, 'l1'), item('Ferro 3/8 CA-50 (barra 12 m)', 8, 'l2')],
      orc: orc({ modo: 'diaria', valorUn: 25000, qtd: 8, desloc: 6000 }), recebido: 0, agenda: [], hist: [{ data: d(-3), txt: 'Pedido recebido pelo mural' }] },
    { id: 'o3', cliente: 'c3', titulo: 'Porcelanato da sala e cozinha', tipo: 'piso', oficio: 'azulejista', status: 'aprovada', criada: d(-12), inicio: d(5), prazo: d(12),
      etapas: etapas(['Comprar o piso', 'Regularizar o contrapiso', 'Assentar', 'Rejuntar e rodapé'], 0),
      mats: [item('Porcelanato 60x60 (m²)', 38, 'l3'), item('Argamassa AC-III 20 kg', 13, 'l2'), item('Rejunte 5 kg', 3, 'l1')],
      orc: orc({ modo: 'm2', valorUn: 8000, qtd: 35, status: 'aprovado', enviadoEm: d(-10), entradaPct: 30 }), recebido: 120000,
      agenda: [{ id: uid('a'), data: d(5), hora: '07:00', nota: 'Começar a sala' }], hist: [{ data: d(-10), txt: 'Orçamento aprovado' }] },
    { id: 'o4', cliente: 'c4', titulo: 'Churrasqueira e bancada', tipo: 'muro', oficio: 'pedreiro', status: 'concluida', criada: d(-50), inicio: d(-20), prazo: d(-14), fim: d(-13),
      etapas: etapas(['Base', 'Alvenaria', 'Revestimento', 'Bancada'], 4), mats: [], orc: orc({ valorUn: 240000, status: 'aprovado', enviadoEm: d(-45) }), recebido: 240000, garantiaAte: somaDias(d(-13), 360), agenda: [], hist: [{ data: d(-13), txt: 'Entregue' }], antes: true },
    { id: 'o5', cliente: 'c5', titulo: 'Fachada: reboco e pintura', tipo: 'fachada', oficio: 'pedreiro', status: 'concluida', criada: d(-80), inicio: d(-45), prazo: d(-20), fim: d(-18),
      etapas: etapas(['Raspagem', 'Reboco', 'Massa', 'Pintura'], 4), mats: [], orc: orc({ valorUn: 520000, status: 'aprovado', enviadoEm: d(-75), parcelas: 3 }), recebido: 430000, venceSaldo: d(-12), agenda: [], hist: [{ data: d(-18), txt: 'Entregue. Faltam R$ 900 combinados para 6 dias depois.' }], antes: true },
    { id: 'o6', cliente: 'c6', titulo: 'Piso da varanda e calçada', tipo: 'piso', oficio: 'azulejista', status: 'concluida', criada: d(-130), fim: d(-100),
      etapas: etapas(['Contrapiso', 'Assentamento', 'Rejunte'], 3), mats: [], orc: orc({ valorUn: 310000, status: 'aprovado' }), recebido: 310000, garantiaAte: d(20), avaliacaoPedida: true, agenda: [], hist: [], postado: true, antes: true },
  ];
  // movimento do caixa dos últimos 4 meses (exemplo)
  const fin = [];
  for (let i = 120; i >= 0; i--) {
    const dia = d(-i), sem = new Date(`${dia}T12:00`).getDay();
    if (sem === 0) continue;
    if (rnd() < 0.42) fin.push({ id: uid('f'), data: dia, tipo: 'e', valor: Math.round((18000 + rnd() * 52000) / 500) * 500, desc: ['Diária de obra', 'Serviço de reparo', 'Assentamento de piso', 'Parcela de serviço', 'Reboco de parede'][Math.floor(rnd() * 5)], cat: 'Serviço', pago: true });
    if (rnd() < 0.36) fin.push({ id: uid('f'), data: dia, tipo: 's', valor: Math.round((2500 + rnd() * 21000) / 100) * 100, desc: ['Material', 'Combustível', 'Disco de corte', 'Ajudante (diária)', 'Almoço na obra'][Math.floor(rnd() * 5)], cat: ['Material', 'Transporte', 'Ferramenta', 'Ajudante', 'Alimentação'][Math.floor(rnd() * 5)], pago: true });
  }
  fin.push({ id: uid('f'), data: d(-24), tipo: 'e', valor: 150000, desc: 'Entrada do banheiro', cat: 'Serviço', obra: 'o1', cli: 'c1', pago: true });
  fin.push({ id: uid('f'), data: d(-10), tipo: 'e', valor: 120000, desc: 'Entrada do porcelanato da sala', cat: 'Serviço', obra: 'o3', cli: 'c3', pago: true });
  fin.push({ id: uid('f'), data: d(-6), tipo: 's', valor: 176600, desc: 'Porcelanato do banheiro', cat: 'Material', obra: 'o1', pago: true });
  const noMes = (n) => somaDias(H, -Math.min(n, new Date().getDate() - 1)); // fica dentro do mês atual
  fin.push({ id: uid('f'), data: noMes(3), tipo: 'e', valor: 280000, desc: 'Parcela final da churrasqueira', cat: 'Serviço', obra: 'o4', cli: 'c4', pago: true });
  fin.push({ id: uid('f'), data: noMes(2), tipo: 'e', valor: 90000, desc: 'Reboco da garagem (diárias)', cat: 'Serviço', pago: true });
  fin.push({ id: uid('f'), data: H, tipo: 'e', valor: 35000, desc: 'Diária de reboco (vizinho da Juliana)', cat: 'Serviço', pago: true });
  fin.push({ id: uid('f'), data: H, tipo: 's', valor: 12000, desc: 'Diária do ajudante', cat: 'Ajudante', pago: true });
  fin.push({ id: uid('f'), data: d(4), tipo: 's', valor: 38000, desc: 'Parcela da cortadora de piso', cat: 'Ferramenta', pago: false });
  fin.push({ id: uid('f'), data: d(9), tipo: 's', valor: 12900, desc: 'Conta do celular e internet', cat: 'Contas', pago: false });

  const perfis = [
    { id: 'p1', nome: 'Rafael Souza', oficio: 'Marceneiro', of: 'marceneiro', cidade: 'Ribeirão Preto', segue: true, seguidores: 812 },
    { id: 'p2', nome: 'Tiago Moraes', oficio: 'Eletricista', of: 'eletricista', cidade: 'Orlândia', segue: true, seguidores: 233 },
    { id: 'p3', nome: 'Bruna Teixeira', oficio: 'Pintora', of: 'pintor', cidade: 'Morro Agudo', segue: false, seguidores: 410 },
    { id: 'p4', nome: 'Edson Carvalho', oficio: 'Gesseiro', of: 'gesseiro', cidade: 'Orlândia', segue: false, seguidores: 158 },
    { id: 'p5', nome: 'Jorge Batista', oficio: 'Carpinteiro', of: 'carpinteiro', cidade: 'Sales Oliveira', segue: false, seguidores: 95 },
    { id: 'p6', nome: 'Lúcia Fernandes', oficio: 'Mestre de obras', of: 'mestre', cidade: 'São Joaquim da Barra', segue: true, seguidores: 1290 },
  ];
  const com = (autor, txt) => ({ id: uid('k'), autor, txt });
  const posts = [
    { id: 's1', autor: 'p1', of: 'marceneiro', tipo: 'ad', cena: 'cozinha', texto: 'Cozinha toda em MDF amadeirado, 9 dias do corte à instalação. 14 portas e 6 gavetas aproveitando cada canto.', data: `${d(0)}T07:40`, curtidas: 86, curti: false, salvo: false, coms: [com('p6', 'Acabamento top! Qual fita de borda você usou?'), com('p2', 'Ficou muito bom, Rafa.')] },
    { id: 's2', autor: 'eu', of: 'azulejista', tipo: 'ad', cena: 'banheiro', obra: 'o6', texto: 'Banheiro inteiro em porcelanato 60x60 com nivelador. Do azulejo quebrado ao box novo em 8 dias.', data: `${d(-12)}T19:10`, curtidas: 54, curti: false, salvo: false, coms: [com('p6', 'Junta alinhadinha. Parabéns!')] },
    { id: 's3', autor: 'p2', of: 'eletricista', tipo: 'ad', cena: 'quadro', texto: 'Quadro antigo com fio derretido virou quadro novo com DR e circuitos separados. Segurança primeiro.', data: `${d(-1)}T18:00`, curtidas: 31, curti: true, salvo: false, coms: [] },
    { id: 's4', autor: 'p6', of: 'mestre', tipo: 'ad', cena: 'muro', texto: 'Muro de bloco com portão novo. 32 m², fundação com baldrame e reboco dos dois lados.', data: `${d(-2)}T12:20`, curtidas: 142, curti: false, salvo: true, coms: [com('eu', 'Quantos dias de obra, Lúcia?')] },
    { id: 's5', autor: 'eu', of: 'pedreiro', tipo: 'ad', cena: 'fachada', obra: 'o5', texto: 'Fachada da Dona Irene: raspagem, reboco novo e pintura. Ficou outra casa.', data: `${d(-17)}T10:00`, curtidas: 77, curti: false, salvo: false, coms: [] },
    { id: 's6', autor: 'p3', of: 'pintor', tipo: 'foto', cena: 'fachada', texto: 'Duas demãos de acrílica fosca e a casa ganhou cara nova. Dica: selador antes, sempre.', data: `${d(-3)}T16:30`, curtidas: 25, curti: false, salvo: false, coms: [] },
    { id: 's7', autor: 'eu', of: 'azulejista', tipo: 'ad', cena: 'piso', texto: 'Contrapiso cru virou porcelanato na sala inteira. 35 m² com rodapé.', data: `${d(-40)}T09:00`, curtidas: 63, curti: false, salvo: false, coms: [] },
    { id: 's8', autor: 'p5', of: 'carpinteiro', tipo: 'ad', cena: 'deck', texto: 'Deck de cumaru entregue no fim de semana.', data: `${d(-5)}T09:00`, curtidas: 40, curti: false, salvo: false, coms: [] },
  ];
  const pedidos = [
    { id: 'j1', titulo: 'Assentar porcelanato na cozinha (18 m²)', of: 'azulejista', cidade: 'Orlândia', bairro: 'Jardim Boa Vista', desc: 'Já comprei o porcelanato 60x60. Preciso de alguém para tirar o piso velho e assentar.', prazo: 'até 30 dias', faixa: 'até R$ 2.500', cliente: 'Mariana', tel: '1690000-0301', data: `${d(0)}T06:50`, cena: 'piso', interesse: false },
    { id: 'j2', titulo: 'Levantar parede para dividir quarto', of: 'pedreiro', cidade: 'Orlândia', bairro: 'Centro', desc: 'Parede de 3,5 m por 2,7 m de altura com uma porta. Pode ser bloco ou drywall.', prazo: 'esta semana', faixa: '', cliente: 'Seu Antônio', tel: '1690000-0302', data: `${d(0)}T05:30`, cena: 'muro', interesse: false },
    { id: 'j3', titulo: 'Reforma completa de banheiro', of: 'azulejista', cidade: 'Morro Agudo', bairro: 'Residencial Primavera', desc: 'Trocar piso, azulejo até o teto e o box. Banheiro de 2 x 2,5 m.', prazo: 'até 45 dias', faixa: '', cliente: 'Fernanda', tel: '1690000-0303', data: `${d(-1)}T20:15`, cena: 'banheiro', interesse: true },
    { id: 'j4', titulo: 'Montar 2 guarda-roupas de loja', of: 'montador', cidade: 'Orlândia', bairro: 'Vila Nova', desc: 'Comprei 2 guarda-roupas de 6 portas na loja, chegam sexta. Preciso montar no sábado.', prazo: 'sábado', faixa: 'até R$ 350', cliente: 'Cláudio', tel: '1690000-0304', data: `${d(-1)}T14:00`, cena: 'guarda-roupa', interesse: false },
    { id: 'j5', titulo: 'Pintura de 3 quartos', of: 'pintor', cidade: 'Sales Oliveira', bairro: 'Centro', desc: 'Parede com massa já feita, só pintura. Tinta por minha conta.', prazo: 'até 15 dias', faixa: '', cliente: 'Rose', tel: '1690000-0305', data: `${d(-2)}T09:00`, cena: 'fachada', interesse: false },
    { id: 'j6', titulo: 'Calçada de 20 m na frente da casa', of: 'pedreiro', cidade: 'Orlândia', bairro: 'Jardim Paraíso', desc: 'Calçada nova no padrão da prefeitura, com rampa na garagem.', prazo: 'até 20 dias', faixa: 'até R$ 3.000', cliente: 'Gilberto', tel: '1690000-0306', data: `${d(-3)}T11:40`, cena: 'piso', interesse: false },
    { id: 'j7', titulo: 'Tomadas e chuveiro novo', of: 'eletricista', cidade: 'Orlândia', bairro: 'Centro', desc: 'Trocar 6 tomadas para o padrão novo e instalar chuveiro de 7500 W.', prazo: 'urgente', faixa: '', cliente: 'Lia', tel: '1690000-0307', data: `${d(-2)}T08:10`, cena: 'quadro', interesse: false },
    { id: 'j8', titulo: 'Deck para área da piscina', of: 'carpinteiro', cidade: 'Orlândia', bairro: 'Recreio', desc: 'Área de 5 x 3 m. Pode ser cumaru ou outra madeira boa.', prazo: 'até 45 dias', faixa: '', cliente: 'Sérgio', tel: '1690000-0308', data: `${d(-4)}T10:00`, cena: 'deck', interesse: false },
  ];
  return {
    v: 1, criado: H, cadastro: false, tour: false, dicas: {},
    perfil: { nome: 'Marcos Tavares', apelido: 'Marcos', oficios: ['pedreiro', 'azulejista'], cidade: 'Orlândia', uf: 'SP', zap: '1690000-0001', foto: '', bio: 'Pedreiro e azulejista há 14 anos. Banheiro, piso, muro e reforma completa. Orçamento sem compromisso, com lista de material detalhada.', seguidores: 386, meta: 900000, margem: 10, raio: 30 },
    pix: { tipo: 'aleatoria', chave: 'e3a1c2d4-0000-4000-8000-0000000000aa', nome: 'Marcos Tavares', cidade: 'Orlandia', exemplo: true },
    clientes, obras, lojas, precos, fin, perfis, posts, pedidos,
    avaliacoes: [
      { nome: 'Renato L.', nota: 5, txt: 'Churrasqueira ficou exatamente como no desenho. Pontual e caprichoso.', data: d(-12) },
      { nome: 'Irene P.', nota: 5, txt: 'Fachada linda, deixou tudo limpo no fim.', data: d(-17) },
      { nome: 'Felipe A.', nota: 4, txt: 'Atrasou um dia por causa da chuva, mas avisou antes. Piso ficou ótimo.', data: d(-98) },
    ],
    achados: null, achadosVistos: {}, achadosSalvos: {},
    equipe: [{ id: 'p-aj1', nome: 'Wellington Souza', funcao: 'Ajudante', diaria: 12000, tel: '1690000-0401' }],
    diarias: [d(-4), d(-3), d(-2), d(-1)].filter((x) => new Date(`${x}T12:00`).getDay() !== 0).map((x, i) => ({ id: `dj${i}`, pessoa: 'p-aj1', data: x, valor: 12000, obra: 'o1', pago: false })),
    notifs: [{ txt: 'Lúcia Fernandes curtiu o seu antes e depois do banheiro', data: `${d(0)}T08:12` }, { txt: 'Rafael Souza começou a seguir você', data: `${d(-1)}T21:02` }],
  };
}

// ------------------------------------------------------------------ aviso rápido
export function toast(msg, tipo = 'ok', acao) {
  const caixa = $('#toasts'); if (!caixa) return;
  const el = document.createElement('div'); el.className = `toast ${tipo}`;
  el.innerHTML = `<span>${t(msg)}</span>${acao ? `<button type="button">${t(acao.rotulo)}</button>` : ''}`;
  if (acao) el.querySelector('button').onclick = () => { acao.fazer(); tira(); };
  caixa.appendChild(el);
  let fora = false; const tira = () => { if (fora) return; fora = true; el.classList.add('sai'); setTimeout(() => el.remove(), 200); };
  setTimeout(tira, acao ? 5200 : 2800);
}

// ------------------------------------------------------------------ folha que sobe de baixo (arrastar para baixo fecha)
let folhaAberta = null;
export function folha({ titulo, corpo, pe = '', aoAbrir, aoFechar, classe = '' }) {
  if (folhaAberta) folhaAberta.fechar(true);
  const fundo = document.createElement('div'); fundo.className = 'fundo';
  const f = document.createElement('section'); f.className = `folha ${classe}`; f.setAttribute('role', 'dialog'); f.setAttribute('aria-modal', 'true'); f.setAttribute('aria-label', titulo);
  f.innerHTML = `<div class="folha-alca" aria-hidden="true"><i></i></div><header class="folha-cab"><h2>${titulo}</h2><button type="button" data-fechar aria-label="Fechar">${ico('x')}</button></header><div class="folha-corpo">${corpo}</div>${pe ? `<footer class="folha-pe">${pe}</footer>` : ''}`;
  document.body.append(fundo, f);
  const antes = document.activeElement;
  let fechada = false;
  const api = {
    el: f,
    fechar(rapido) {
      if (fechada) return; fechada = true; folhaAberta = null;
      if (rapido) { fundo.remove(); f.remove(); } else { fundo.classList.add('sai'); f.classList.add('sai'); setTimeout(() => { fundo.remove(); f.remove(); }, 190); }
      document.removeEventListener('keydown', tecla);
      if (aoFechar) aoFechar();
      if (antes && antes.focus && document.contains(antes)) antes.focus({ preventScroll: true });
    },
  };
  const tecla = (e) => { if (e.key === 'Escape') api.fechar(); };
  document.addEventListener('keydown', tecla);
  fundo.onclick = () => api.fechar();
  f.addEventListener('click', (e) => { if (e.target.closest('[data-fechar]')) api.fechar(); });
  // arrastar a alça para baixo
  const alca = f.querySelector('.folha-alca'); let y0 = null, dy = 0;
  alca.addEventListener('pointerdown', (e) => { y0 = e.clientY; dy = 0; alca.setPointerCapture(e.pointerId); f.style.transition = 'none'; });
  alca.addEventListener('pointermove', (e) => { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); f.style.transform = `translateY(${dy}px)`; });
  const solta = () => { if (y0 === null) return; y0 = null; f.style.transition = 'transform .2s var(--ease)'; if (dy > 90) api.fechar(); else f.style.transform = ''; };
  alca.addEventListener('pointerup', solta); alca.addEventListener('pointercancel', solta);
  folhaAberta = api;
  if (aoAbrir) aoAbrir(f, api);
  const foco = f.querySelector('[autofocus]') || f.querySelector('.folha-cab button');
  setTimeout(() => foco && foco.focus({ preventScroll: true }), 60);
  return api;
}
export const folhaAtual = () => folhaAberta;

export function confirmar(titulo, texto, rotulo, fazer) {
  folha({ titulo, corpo: `<p>${t(texto)}</p>`, pe: `<button type="button" class="bt leve" data-fechar>Cancelar</button><button type="button" class="bt cheio" data-sim>${t(rotulo)}</button>`,
    aoAbrir: (f, api) => { f.querySelector('[data-sim]').onclick = () => { api.fechar(); fazer(); }; } });
}

// ------------------------------------------------------------------ formulário dentro da folha
// campos: [{ n, r (rótulo), tipo: text|tel|num|din|data|hora|area|sel, valor, lista (sugestões; aceita texto livre), ops (sel), dica, obrig, cheio (largura toda), meio }]
export function formulario({ titulo, campos, rotulo = 'Salvar', salvar, extraPe = '', depois }) {
  const id = uid('f');
  const campo = (c) => {
    const v = c.valor ?? '', nome = `name="${c.n}" id="${id}${c.n}"`, ob = c.obrig ? 'required' : '';
    let entrada;
    if (c.tipo === 'area') entrada = `<textarea ${nome} ${ob} ${c.voz ? 'data-voz' : ''} placeholder="${t(c.ph || '')}">${t(v)}</textarea>`;
    else if (c.tipo === 'sel') entrada = `<select ${nome}>${c.ops.map(([k, r]) => `<option value="${t(k)}" ${String(k) === String(v) ? 'selected' : ''}>${t(r)}</option>`).join('')}</select>`;
    else {
      const tp = { tel: 'tel', data: 'date', hora: 'time', num: 'text', din: 'text' }[c.tipo] || 'text';
      const modo = c.tipo === 'num' || c.tipo === 'din' ? 'inputmode="decimal"' : c.tipo === 'tel' ? 'inputmode="tel"' : '';
      const lista = c.lista ? `list="${id}${c.n}-l"` : '';
      entrada = `<input type="${tp}" ${nome} ${modo} ${lista} ${ob} ${c.voz ? 'data-voz' : ''} value="${t(c.tipo === 'din' ? campoDin(v) : v)}" placeholder="${t(c.ph || (c.tipo === 'din' ? '0,00' : ''))}" autocomplete="off">${c.lista ? `<datalist id="${id}${c.n}-l">${c.lista.map((x) => `<option value="${t(x)}">`).join('')}</datalist>` : ''}`;
    }
    return `<label class="campo"><span>${t(c.r)}</span>${entrada}${c.dica ? `<small>${t(c.dica)}</small>` : ''}</label>`;
  };
  const grupos = []; let par = [];
  campos.forEach((c) => { if (c.meio) { par.push(campo(c)); if (par.length === 2) { grupos.push(`<div class="duas">${par.join('')}</div>`); par = []; } } else { if (par.length) { grupos.push(`<div class="duas">${par.join('')}</div>`); par = []; } grupos.push(campo(c)); } });
  if (par.length) grupos.push(`<div class="duas">${par.join('')}</div>`);
  return folha({
    titulo, corpo: `<form id="${id}" novalidate>${grupos.join('')}<p class="campo erro" data-erro hidden></p></form>`,
    pe: `${extraPe}<button type="button" class="bt leve" data-fechar>Cancelar</button><button type="submit" form="${id}" class="bt cheio">${t(rotulo)}</button>`,
    aoAbrir: (f, api) => {
      const form = f.querySelector('form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const o = {};
        for (const c of campos) {
          const el = form.elements[c.n]; let v = el ? el.value.trim() : '';
          if (c.obrig && !v) { const er = form.querySelector('[data-erro]'); er.hidden = false; er.textContent = `Preencha: ${c.r}.`; el.focus(); return; }
          if (c.tipo === 'din') v = lerDin(v); else if (c.tipo === 'num') v = lerNum(v);
          o[c.n] = v;
        }
        const r = salvar(o);
        if (r === false) return;
        if (typeof r === 'string') { const er = form.querySelector('[data-erro]'); er.hidden = false; er.textContent = r; return; }
        api.fechar(); vibra(12);
      });
      if (depois) depois(f, api);
      ligarVoz(f);
    },
  });
}

// copiar texto (com plano B para navegador antigo)
export async function copiar(txt) {
  try { await navigator.clipboard.writeText(txt); toast('Copiado'); return; } catch { /* plano B */ }
  const a = document.createElement('textarea'); a.value = txt; document.body.appendChild(a); a.select();
  try { document.execCommand('copy'); toast('Copiado'); } catch { toast('Não deu para copiar. Segure no texto e copie.', 'erro'); }
  a.remove();
}

// IA grátis (nexo-ia, na conta) com plano B: o texto pronto do modelo
export async function comIA(pedido, modelo) {
  if (typeof window.veltriaIA === 'function') {
    try { const r = await window.veltriaIA(pedido); if (r && !/não respondeu|Sem conexão|Não consegui/i.test(r)) return { txt: r.replace(/\n\n\(\d+ perguntas grátis restantes hoje\)$/, ''), ia: true }; } catch { /* cai no modelo */ }
  }
  await new Promise((ok) => setTimeout(ok, 450));
  return { txt: modelo(), ia: false };
}

// ------------------------------------------------------------------ navegação (a tela é desenhada no app.js)
export const repinta = () => dispatchEvent(new Event('fortis-pinta'));
export const ir = (h) => { if (location.hash === `#${h}`) repinta(); else location.hash = h; };
// cabeçalho das telas de dentro: voltar, título e dica da tela
export const cab = (titulo, sub = '', { voltar = true, dica = '', direita = '' } = {}) => `<header class="cab">${voltar ? `<button type="button" class="voltar" data-acao="voltar" aria-label="Voltar">${ico('seta')}</button>` : ''}<h1>${titulo}${sub ? `<small>${sub}</small>` : ''}</h1>${direita}${dica ? `<button type="button" class="dica-bt" data-acao="dica" data-dica="${t(dica)}" aria-label="Dica desta tela">?</button>` : ''}</header>`;

// ------------------------------------------------------------------ ditado: falar em vez de digitar (campos com data-voz)
const Reconhece = window.SpeechRecognition || window.webkitSpeechRecognition;
export function ligarVoz(raiz = document) {
  if (!Reconhece) return;
  $$('[data-voz]:not([data-voz-ok])', raiz).forEach((campo) => {
    campo.dataset.vozOk = '1';
    const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'voz-bt'; bt.setAttribute('aria-label', 'Falar em vez de digitar');
    bt.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>';
    const caixa = document.createElement('span'); caixa.className = 'voz-caixa'; campo.replaceWith(caixa); caixa.append(campo, bt);
    bt.onclick = () => {
      const r = new Reconhece(); r.lang = 'pt-BR'; r.interimResults = false; r.maxAlternatives = 1;
      bt.classList.add('ouvindo'); vibra(10);
      r.onresult = (e) => { const txt = e.results[0][0].transcript; campo.value = campo.value && campo.tagName === 'TEXTAREA' ? `${campo.value} ${txt}` : txt; campo.dispatchEvent(new Event('input', { bubbles: true })); campo.dispatchEvent(new Event('change', { bubbles: true })); };
      r.onerror = () => toast('Não deu para ouvir. Tente de novo, perto do celular.', 'erro');
      r.onend = () => bt.classList.remove('ouvindo');
      try { r.start(); } catch { bt.classList.remove('ouvindo'); }
    };
  });
}
