// Tecton · núcleo: dados (uma chave só no navegador, que o modo conta sobe para a nuvem), rotas pelo endereço (#obras, #obra/ID),
// janelas, avisos, ícones, impressão e WhatsApp. Sem dependências.
//
// Dados: localStorage 'tecton-v1'.
//  - Demonstração: { demo: 1, ativa: 'construtora', empresas: { construtora: {...}, loja: {...}, imobiliaria: {...} } }
//    (cada empresa de exemplo é criada na primeira vez que alguém abre aquele ramo).
//  - Conta (?conta=tecton): a própria empresa { config: { ramos: ['construtora', ...], ramo }, pessoas, fin, ... }.
export const CHAVE = 'tecton-v1';
export const CONTA = new URLSearchParams(location.search).get('conta') === 'tecton';
if (CONTA) window.veltriaComecaVazio = true; // conta nova já começa vazia e com as 5 perguntas: sem o "ver com exemplos" do conta-nuvem (22/11/2026)
export const RAMOS = {
  construtora: { nome: 'Construtora e empreiteira', curto: 'Construtora', ico: 'capacete' },
  loja: { nome: 'Loja de material de construção', curto: 'Loja', ico: 'loja' },
  imobiliaria: { nome: 'Imobiliária e incorporadora', curto: 'Imobiliária', ico: 'predio' },
};

// ------------------------------------------------------------------ datas e números
export const hoje = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
export const somaDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const somaMeses = (iso, n) => { const [a, m, d] = iso.split('-').map(Number); const x = new Date(Date.UTC(a, m - 1 + n, 1)); const ult = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate(); x.setUTCDate(Math.min(d, ult)); return x.toISOString().slice(0, 10); };
export const dias = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
export const dataBR = (iso) => { if (!iso) return ''; const [a, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}/${a}`; };
export const dataCurta = (iso) => { if (!iso) return ''; const [, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}`; };
export const mesAno = (iso) => { const N = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; const [a, m] = iso.split('-'); return `${N[+m - 1]}/${a.slice(2)}`; };
export const quando = (iso) => { const n = dias(hoje(), iso); return n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n === -1 ? 'ontem' : n > 0 ? `em ${n} dias` : `há ${-n} dias`; };
export const R$ = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const R0 = (v) => 'R$ ' + Math.round(Number(v || 0)).toLocaleString('pt-BR');
export const n2 = (v, c = 2) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: c });
export const pc = (v) => `${Math.round(Number(v || 0))}%`;
export const num = (s) => { if (typeof s === 'number') return s; const t = String(s || '').trim().replace(/\s|R\$/g, ''); if (!t) return 0; const v = /,/.test(t) || /^-?\d{1,3}(\.\d{3})+$/.test(t) ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t); return Number.isFinite(v) ? v : 0; };
export const t = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
export const uid = (p = 'x') => p + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6);
export const soma = (l, f) => (l || []).reduce((s, x) => s + (Number(f(x)) || 0), 0);
export const pl = (n, um, varios) => `${n} ${Number(n) === 1 ? um : varios}`;
export const fone = (s) => String(s || '').replace(/\D/g, '');

// ------------------------------------------------------------------ dados
let R = null; // a raiz guardada
export let db = null; // a empresa aberta agora
const ouvintes = [];
export const ouvir = (f) => ouvintes.push(f);
function ler() { try { const s = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (s && (s.empresas || s.config)) return s; } catch { /* dados ruins: começa de novo */ } return null; }
export function vazia() {
  return { config: { nome: '', cidade: 'Orlândia', uf: 'SP', ramos: [], ramo: '', esquema: 'petroleo', marca: {}, perfis: {}, saldoInicial: 0 },
    pessoas: [], fin: [], equipe: [], avisos: [], docs: [],
    obras: [], trab: [], apont: [], pedidos: [], empreitas: [],
    produtos: [], vendas: [], orcs: [], entregas: [], caminhoes: [], contasObra: [], fiado: [], compras: [], espera: [], devolucoes: [],
    emps: [], imoveis: [], leads: [], visitas: [], propostas: [], contratos: [], alugueis: [], corretores: [], comissoes: [],
    notas: [] }; // notas: registro das notas emitidas fora do Tecton (nota.js)
}
// completa campos que faltam (dados de versões antigas ou de uma conta nova)
function completa(e) { const v = vazia(); Object.keys(v).forEach((k) => { if (e[k] == null) e[k] = v[k]; }); Object.keys(v.config).forEach((k) => { if (e.config[k] == null) e.config[k] = v.config[k]; }); return e; }
export let semente = null; // dados.js preenche: (ramo) => empresa de exemplo
export const usarSemente = (f) => { semente = f; };
export function carregar() {
  R = ler();
  if (CONTA) { if (!R || !R.config) R = vazia(); db = completa(R); return; }
  if (!R || !R.empresas) R = { demo: 1, ativa: '', empresas: {} };
  db = R.ativa && R.empresas[R.ativa] ? completa(R.empresas[R.ativa]) : null;
}
export const raiz = () => R;
export function abrirEmpresaDemo(ramo) {
  if (!R.empresas[ramo]) R.empresas[ramo] = semente(ramo);
  R.ativa = ramo; db = completa(R.empresas[ramo]); grava();
}
// recomeçar volta os dados ao exemplo, mas guarda as respostas do primeiro acesso (o ajuste do menu e do painel)
export function recomecar() { const a = R && R.ativa, aj = R && R.ajuste, pl = R && R.pulou; try { localStorage.removeItem(CHAVE); } catch { /* ok */ } carregar(); if (aj) R.ajuste = aj; if (pl) R.pulou = pl; if (a) abrirEmpresaDemo(a); }
export function grava() {
  try { localStorage.setItem(CHAVE, JSON.stringify(R)); } catch { toast('Sem espaço neste navegador: apague fotos antigas do diário'); }
  ouvintes.forEach((f) => f(true));
}
// conta: a equipe mexeu em outro aparelho e os dados chegaram (conta-nuvem.js chama isto em vez de recarregar a página)
window.veltriaAoVivo = () => { carregar(); ouvintes.forEach((f) => f(false)); };
export const ramoAtual = () => (db && (db.config.ramos.includes(db.config.ramo) ? db.config.ramo : db.config.ramos[0])) || '';
export const pessoa = (id) => db.pessoas.find((p) => p.id === id) || null;
export const nomeDe = (id) => pessoa(id)?.nome || '—';
export const empresaNome = () => db?.config.nome || 'Sua empresa';

// ------------------------------------------------------------------ ícones (linha)
const P = {
  painel: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  capacete: '<path d="M4 16a8 8 0 0 1 16 0"/><path d="M2 16h20v2H2z"/><path d="M10 8V5h4v3"/>',
  loja: '<path d="M4 9h16l-1-4H5z"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/>',
  predio: '<path d="M4 21V5l8-2v18"/><path d="M12 8h8v13"/><path d="M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2"/><path d="M2 21h20"/>',
  obra: '<path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/>',
  orcamento: '<path d="M7 3h10l3 3v15H4V3z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  equipe: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.6 3-5.5 6-5.5s5.4 1.9 6 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.5c2.4.2 4 1.8 4.5 4.5"/>',
  carrinho: '<path d="M3 4h2l2.4 11h11L21 7H6.2"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="18" cy="19.5" r="1.5"/>',
  diario: '<path d="M6 3h11a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M8 8h7M8 12h7M8 16h4"/>',
  dinheiro: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
  pessoas: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.5-6 7-6s6.2 2 7 6"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  mais: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  mais2: '<path d="M12 5v14M5 12h14"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  caminhao: '<path d="M2 6h11v10H2z"/><path d="M13 9h4l4 4v3h-8"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  caixa: '<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
  grafico: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  conta: '<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h4"/>',
  funil: '<path d="M3 4h18l-7 8v6l-4 2v-8z"/>',
  agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chave: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>',
  contrato: '<path d="M7 3h10l3 3v15H4V3z"/><path d="M8 9h8M8 13h5"/><path d="M8 18c1.5-1.5 2.5 1 4 0s2-1.5 3 0"/>',
  porcento: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  zap: '<path d="M4 20l1.3-3.8A8 8 0 1 1 8 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.5-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z"/>',
  imprimir: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="1.5"/><path d="M6 14h12v7H6z"/>',
  foto: '<path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="4"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  aberto: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-1.9"/>',
  lixo: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  lapis: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  voltar: '<path d="M15 5l-7 7 7 7"/>',
  frente: '<path d="M9 5l7 7-7 7"/>',
  acima: '<path d="M5 15l7-7 7 7"/>',
  abaixo: '<path d="M5 9l7 7 7-7"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  ajuda: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6"/><path d="M12 16.8v.2"/>',
  codigo: '<path d="M4 6v12M7 6v12M10 6v12M14 6v12M16 6v12M20 6v12"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  chuva: '<path d="M7 16a5 5 0 1 1 1-9.9A6 6 0 0 1 19 9a4 4 0 0 1-1 7.9"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/>',
  doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
  sino: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  mapa: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  troca: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
};
export const ico = (n) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${P[n] || P.mais}</svg>`;

// ------------------------------------------------------------------ janelas e avisos
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
let folhaAberta = 0, redesenhar = false;
export function folha({ titulo, corpo, pe = '', larga = false, aoAbrir }) {
  const f = document.createElement('div'); f.className = 'folha-fundo';
  f.innerHTML = `<div class="folha${larga ? ' larga' : ''}" role="dialog" aria-modal="true" aria-label="${t(titulo)}"><div class="folha-cab"><h2>${t(titulo)}</h2><button type="button" class="bt-ico" data-fechar aria-label="Fechar">${ico('x')}</button></div><div class="folha-corpo">${corpo}</div>${pe ? `<div class="folha-pe">${pe}</div>` : ''}</div>`;
  const antes = document.activeElement;
  const fechar = () => { if (!f.isConnected) return; f.remove(); folhaAberta--; if (!folhaAberta && redesenhar) { redesenhar = false; desenhar(true); } document.removeEventListener('keydown', esc); antes?.focus?.(); };
  const esc = (e) => { if (e.key === 'Escape' && f.isConnected && f === $$('.folha-fundo').pop()) fechar(); };
  f._fechar = fechar;
  f.addEventListener('click', (e) => { if (e.target.closest('[data-ir]')) return; if (e.target === f || e.target.closest('[data-fechar]')) { e.preventDefault(); fechar(); } });
  document.addEventListener('keydown', esc);
  document.body.appendChild(f); folhaAberta++;
  const foco = f.querySelector('[autofocus]') || f.querySelector('input,select,textarea') || f.querySelector('.folha-pe .bt.cheio') || f.querySelector('button');
  setTimeout(() => foco?.focus(), 30);
  aoAbrir?.(f, fechar);
  return { el: f, fechar };
}
export const temFolha = () => folhaAberta > 0;
let tt = 0;
export function toast(msg) { $$('.toast').forEach((x) => x.remove()); const d = document.createElement('div'); d.className = 'toast'; d.role = 'status'; d.textContent = msg; document.body.appendChild(d); clearTimeout(tt); tt = setTimeout(() => d.remove(), 3200); }
export function confirma(texto, sim = 'Confirmar', perigo = false) {
  return new Promise((ok) => {
    let res = false;
    const { el } = folha({ titulo: 'Confirmar', corpo: `<p>${t(texto)}</p>`, pe: `<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt ${perigo ? 'perigo' : 'cheio'}" data-sim>${t(sim)}</button>` });
    el.querySelector('[data-sim]').onclick = () => { res = true; el.querySelector('[data-fechar]').click(); };
    new MutationObserver((m, o) => { if (!el.isConnected) { o.disconnect(); ok(res); } }).observe(document.body, { childList: true });
  });
}

// ------------------------------------------------------------------ formulários por lista de campos
// campo: { k, r: rótulo, tipo: text|num|money|date|select|area|pessoa|check|tel|email, op: [[valor, nome]], req, dica, largo, min, step, ph }
export function campos(lista, v = {}) {
  return `<div class="campos">${lista.map((c) => {
    const val = v[c.k] ?? c.padrao ?? '', req = c.req ? ' required' : '', cls = c.largo || c.tipo === 'area' ? ' largo' : '';
    let inp;
    if (c.tipo === 'select' || c.tipo === 'pessoa') {
      const op = c.tipo === 'pessoa' ? [['', '— escolha —'], ...db.pessoas.filter((p) => !c.filtro || c.filtro(p)).sort((a, b) => a.nome.localeCompare(b.nome)).map((p) => [p.id, p.nome])] : c.op;
      inp = `<select name="${c.k}"${req}>${op.map(([a, b]) => `<option value="${t(a)}"${String(a) === String(val) ? ' selected' : ''}>${t(b)}</option>`).join('')}</select>`;
    } else if (c.tipo === 'area') inp = `<textarea name="${c.k}"${req} placeholder="${t(c.ph || '')}">${t(val)}</textarea>`;
    else if (c.tipo === 'check') return `<label class="liga${cls}">${t(c.r)}<input type="checkbox" name="${c.k}"${val ? ' checked' : ''}></label>`;
    else {
      const tp = { num: 'text', money: 'text', date: 'date', tel: 'tel', email: 'email' }[c.tipo] || 'text';
      const mode = c.tipo === 'num' || c.tipo === 'money' ? ' inputmode="decimal"' : c.tipo === 'tel' ? ' inputmode="tel"' : '';
      const mostra = (c.tipo === 'money' || c.tipo === 'num') && val !== '' ? n2(val, c.tipo === 'money' ? 2 : 3) : val;
      inp = `<input type="${tp}" name="${c.k}" value="${t(mostra)}"${req}${mode}${c.ph ? ` placeholder="${t(c.ph)}"` : ''}${c.max ? ` maxlength="${c.max}"` : ''}>`;
    }
    return `<label class="campo${cls}"><span>${t(c.r)}${c.req ? '' : ''}</span>${inp}${c.dica ? `<small>${t(c.dica)}</small>` : ''}</label>`;
  }).join('')}</div>`;
}
export function lerCampos(form, lista) {
  const o = {};
  lista.forEach((c) => {
    const e = form.querySelector(`[name="${c.k}"]`); if (!e) return;
    if (c.tipo === 'check') o[c.k] = e.checked;
    else if (c.tipo === 'num' || c.tipo === 'money') o[c.k] = num(e.value);
    else o[c.k] = e.value.trim();
  });
  return o;
}
// janela de cadastro: valida os obrigatórios e chama aoSalvar(dados); aoApagar opcional
export function editar({ titulo, lista, v = {}, aoSalvar, aoApagar, extra = '', salvar = 'Salvar', larga }) {
  const { el, fechar } = folha({ titulo, larga, corpo: `<form data-form novalidate>${campos(lista, v)}${extra}</form>`,
    pe: `${aoApagar ? `<button type="button" class="bt perigo" data-apagar>${ico('lixo')}Apagar</button>` : ''}<button type="button" class="bt" data-fechar>Cancelar</button><button type="button" class="bt cheio" data-salvar>${ico('check')}${t(salvar)}</button>` });
  const f = el.querySelector('form');
  const vai = () => {
    const falta = lista.find((c) => c.req && !String(f.querySelector(`[name="${c.k}"]`)?.value || '').trim());
    if (falta) { toast(`Preencha: ${falta.r}`); f.querySelector(`[name="${falta.k}"]`)?.focus(); return; }
    const r = aoSalvar(lerCampos(f, lista), f); if (r === false) return; fechar();
  };
  el.querySelector('[data-salvar]').onclick = vai;
  f.addEventListener('submit', (e) => { e.preventDefault(); vai(); });
  el.querySelector('[data-apagar]')?.addEventListener('click', async () => { if (await confirma('Apagar este cadastro? Não dá para desfazer.', 'Apagar', true)) { aoApagar(); fechar(); } });
  return { el, fechar, form: f };
}

// ------------------------------------------------------------------ rotas
export const TELAS = {};
export const ACOES = {};
export const tela = (nome, def) => { TELAS[nome] = def; };
export const acao = (nome, f) => { ACOES[nome] = f; };
export const ir = (h) => { if (location.hash.slice(1) === h) desenhar(true); else location.hash = h; };
export let telaInicial = () => 'painel';
export const definirInicial = (f) => { telaInicial = f; };
// portão: antes de qualquer tela, a conversa do primeiro acesso (ajuste.js decide quando)
let portao = () => null;
export const definirPortao = (f) => { portao = f; };
export function rota() { const h = decodeURIComponent(location.hash.slice(1)) || telaInicial(); const [nome, ...args] = h.split('/'); return { nome: TELAS[nome] ? nome : telaInicial(), args }; }
let ultimo = '';
export function desenhar(forcar = true) {
  const el = document.getElementById('tela'); if (!el) return;
  const P = portao(); if (P && TELAS[P]) { const T = TELAS[P]; el.innerHTML = T.html(); el.dataset.tela = P; T.montar?.(el); document.title = 'Tecton'; document.dispatchEvent(new CustomEvent('tecton-tela', { detail: { nome: P } })); return; }
  if (!db || !ramoAtual()) { const T = TELAS._escolha; el.innerHTML = T.html(); T.montar?.(el); document.dispatchEvent(new CustomEvent('tecton-tela', { detail: { nome: '_escolha' } })); return; }
  let { nome, args } = rota(); let T = TELAS[nome];
  if (T.ramo && !db.config.ramos.includes(T.ramo)) { nome = telaInicial(); args = []; T = TELAS[nome]; }
  const ativo = document.activeElement;
  if (!forcar && ativo && el.contains(ativo) && /INPUT|TEXTAREA|SELECT/.test(ativo.tagName)) return;
  const trocou = location.hash !== ultimo, y = trocou ? 0 : scrollY; ultimo = location.hash;
  el.innerHTML = T.html(...args); el.dataset.tela = nome;
  T.montar?.(el, ...args);
  if (trocou) { el.classList.remove('tela-entra'); void el.offsetWidth; el.classList.add('tela-entra'); }
  scrollTo(0, y);
  const tit = typeof T.titulo === 'function' ? T.titulo(...args) : T.titulo;
  document.title = `${tit ? tit + ' · ' : ''}${db.config.marca?.topo && db.config.nome ? db.config.nome : 'Tecton'}`;
  document.dispatchEvent(new CustomEvent('tecton-tela', { detail: { nome, args, aba: T.aba || nome } }));
}
export function iniciarRotas() {
  addEventListener('hashchange', () => desenhar(true));
  // salvou aqui: redesenha na hora (ou ao fechar a janela); chegou da equipe: não atrapalha quem está digitando
  ouvir((local) => { if (temFolha()) redesenhar = true; else desenhar(!!local); });
  document.addEventListener('click', (e) => {
    const n = e.target.closest('[data-ir]'); if (n) { e.preventDefault(); const ff = n.closest('.folha-fundo'); if (ff) ff._fechar(); ir(n.dataset.ir); return; }
    const b = e.target.closest('[data-acao]'); if (!b) return;
    const f = ACOES[b.dataset.acao]; if (!f) return; e.preventDefault(); f(b, e);
  });
  desenhar(true);
}
// cabeçalho padrão das telas
export const cab = (titulo, sub = '', bts = '', volta = '') => `${volta ? `<button type="button" class="volta" data-ir="${t(volta)}">${ico('voltar')}Voltar</button>` : ''}<div class="cab"><div><h1>${t(titulo)}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${bts ? `<div class="linha-bts">${bts}</div>` : ''}</div>`;
export const vazio = (txt, bt = '') => `<div class="vazio-box"><p>${t(txt)}</p>${bt}</div>`;
export const barra = (v, cls = '') => `<div class="barra ${cls}" role="img" aria-label="${pc(v)}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div>`;

// ------------------------------------------------------------------ foto: reduz no aparelho antes de guardar
export function reduzir(arquivo, max = 720, q = 0.62) {
  return new Promise((ok, falha) => {
    const r = new FileReader();
    r.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', q)); }; im.onerror = falha; im.src = r.result; };
    r.onerror = falha; r.readAsDataURL(arquivo);
  });
}

// ------------------------------------------------------------------ impressão e PDF (pelo navegador: Imprimir › Salvar como PDF)
export function cabDoc() {
  const c = db.config, logo = c.marca?.logo;
  return `<div class="doc-cab">${logo ? `<img src="${t(logo)}" alt="">` : ''}<div><b>${t(c.nome || 'Sua empresa')}</b><small>${t([c.cnpj && 'CNPJ ' + c.cnpj, c.endereco, [c.cidade, c.uf].filter(Boolean).join('/')].filter(Boolean).join(' · '))}</small><small>${t([c.fone && 'WhatsApp ' + c.fone, c.email].filter(Boolean).join(' · '))}</small></div></div>`;
}
export function imprimir(titulo, corpo, rodape = 'Documento sem valor fiscal.') {
  const el = document.getElementById('impressao');
  el.innerHTML = `<div class="doc">${cabDoc()}<h1>${t(titulo)}</h1>${corpo}<p class="rodape">${t(rodape)} Emitido em ${dataBR(hoje())} pelo Tecton.</p></div>`;
  const antes = document.title; document.title = `${titulo} · ${db.config.nome || 'Tecton'}`;
  setTimeout(() => { window.print(); document.title = antes; }, 60);
}
export function recibo({ de, valor, ref, forma, dia = hoje(), quem = db.config.nome }) {
  imprimir('Recibo', `<p>Recebemos de <b>${t(de)}</b> a quantia de <b>${R$(valor)}</b>${ref ? `, referente a ${t(ref)}` : ''}${forma ? `, pago em ${t(forma)}` : ''}.</p><p>${t(db.config.cidade || '')}, ${dataBR(dia)}.</p><div class="ass"><div>${t(quem || '')}</div><div>${t(de)}</div></div>`);
}

// ------------------------------------------------------------------ WhatsApp: de verdade na conta com assinatura; simulado na demonstração
export function whatsapp(numero, texto, para = '') {
  const n = fone(numero), real = CONTA && window.veltriaEnvioReal;
  db.avisos.unshift({ id: uid('w'), dia: hoje(), para: para || numero || '', texto: texto.slice(0, 160), sim: !real });
  db.avisos = db.avisos.slice(0, 30); grava();
  if (real) { window.open(`https://wa.me/${n ? (n.length <= 11 ? '55' + n : n) : ''}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener'); return; }
  folha({ titulo: 'WhatsApp (simulado)', corpo: `<div class="zap-sim"><p class="zap-para">Para: ${t(para || 'cliente')}${n ? ` · ${t(numero)}` : ''}</p><div class="zap-bolha">${t(texto)}</div></div><p class="mudo peq" style="margin-top:12px">${CONTA ? 'Durante o teste sem cartão ou sem assinatura ativa a mensagem fica só simulada.' : 'Na demonstração nada é enviado.'} Na sua conta, o WhatsApp abre com esta mensagem pronta e você só aperta enviar.</p>`,
    pe: `<button type="button" class="bt" data-copiar-zap>Copiar a mensagem</button><button type="button" class="bt cheio" data-fechar>Entendi</button>`,
    aoAbrir: (el) => { el.querySelector('[data-copiar-zap]').onclick = () => (navigator.clipboard ? navigator.clipboard.writeText(texto) : Promise.reject()).then(() => toast('Mensagem copiada')).catch(() => toast('Não deu para copiar aqui')); } });
}

// ------------------------------------------------------------------ Pix copia e cola (BR Code estático do Banco Central, feito no aparelho)
const semAcento = (s, n) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, n).trim();
const campoPix = (id, v) => id + String(v.length).padStart(2, '0') + v;
function crc16(s) { let c = 0xFFFF; for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; } return c.toString(16).toUpperCase().padStart(4, '0'); }
export function chavePix(k = db?.config.pix || db?.config.cnpj || '') {
  k = String(k).trim(); if (!k) return ''; if (k.includes('@')) return k.toLowerCase(); const d = k.replace(/\D/g, '');
  if (/^[0-9a-f-]{36}$/i.test(k)) return k.toLowerCase(); if (d.length === 14 || (d.length === 11 && !/^\(?\d{2}\)?\s?9/.test(k))) return d; if (d.length >= 10) return '+55' + d.slice(-11); return k;
}
export function pixCopiaCola(valor, ref = '') {
  const ch = chavePix(); if (!ch) return '';
  const p = campoPix('00', '01') + campoPix('26', campoPix('00', 'br.gov.bcb.pix') + campoPix('01', ch)) + '52040000' + '5303986' + (valor > 0 ? campoPix('54', Number(valor).toFixed(2)) : '') + '5802BR' + campoPix('59', semAcento(db.config.nome, 25) || 'RECEBEDOR') + campoPix('60', semAcento(db.config.cidade, 15) || 'BRASIL') + campoPix('62', campoPix('05', (semAcento(ref, 25).replace(/ /g, '') || '***')));
  return p + '6304' + crc16(p + '6304');
}
// ------------------------------------------------------------------ índices oficiais (séries do Banco Central: IGP-M 189, IPCA 433, INCC 192)
const SERIE = { 'IGP-M': 189, IPCA: 433, INCC: 192 };
export async function buscarIndice(nome, meses = 1) {
  const s = SERIE[nome]; if (!s) throw new Error('índice sem série');
  const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${s}/dados/ultimos/${meses}?formato=json`); if (!r.ok) throw new Error('sem resposta');
  const l = await r.json(); if (!Array.isArray(l) || !l.length) throw new Error('vazio');
  const pct = meses === 1 ? Number(l[l.length - 1].valor) : (l.reduce((m, x) => m * (1 + Number(x.valor) / 100), 1) - 1) * 100;
  const [, mm, aa] = l[l.length - 1].data.split('/'); return { pct: Math.round(pct * 100) / 100, mes: `${mm}/${aa}`, de: l[0].data.slice(3) };
}
