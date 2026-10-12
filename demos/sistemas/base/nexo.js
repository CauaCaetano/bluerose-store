// =============================================================
// Linha Nexo · núcleo comum (v2)
// -------------------------------------------------------------
// Tudo roda no navegador: os dados ficam no localStorage deste aparelho,
// com dados de exemplo e um botão "Recomeçar". Cada sistema descreve
// páginas, coleções, fichas (painel lateral) e ações; o núcleo monta a
// estrutura (menu, topo, busca Ctrl+K, atalhos, tema), tabelas com visões,
// filtros e ações em massa, gráficos em SVG, funil arrastável, calendário
// com grade de horários, linha do tempo, formulários e impressão.
// =============================================================

import { resumoDoDia, resumoTexto } from './resumos.js';
import { prepararExtras } from './extras.js';

// ---------------------------------------------------------------- utilidades
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
export const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const moedaC = (v) => { const n = Number(v || 0), a = Math.abs(n); if (a >= 1e6) return `R$ ${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`; if (a >= 1e4) return `R$ ${(n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`; return moeda(n).replace(',00', ''); };
export const num = (v, d = 0) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: d });
export const pct = (v, d = 0) => `${Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: d })}%`;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const hoje = () => iso(new Date());
export const agoraISO = () => { const d = new Date(); return `${iso(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
export const paraData = (s) => new Date(`${String(s).slice(0, 10)}T12:00:00`);
export const diaMais = (n, base = hoje()) => { const d = paraData(base); d.setDate(d.getDate() + n); return iso(d); };
export const mesMais = (n, base = hoje()) => { const d = paraData(base); d.setDate(1); d.setMonth(d.getMonth() + n); return iso(d).slice(0, 7); };
export const dataBR = (s) => { if (!s) return '—'; const [a, m, d] = String(s).slice(0, 10).split('-'); return `${d}/${m}/${a}`; };
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const DIAS_L = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const dataCurta = (s) => { if (!s) return '—'; const d = paraData(s); const r = `${d.getDate()} ${MESES[d.getMonth()]}`; return d.getFullYear() === new Date().getFullYear() ? r : `${r} ${d.getFullYear()}`; };
export const nomeMes = (ym, longo = false) => { const [a, m] = ym.split('-').map(Number); return longo ? `${MESES_L[m - 1]} de ${a}` : MESES[m - 1]; };
export const horaBR = (s) => (s ? String(s).slice(11, 16) : '');
export const dataHoraBR = (s) => (s ? `${dataCurta(s)}, ${horaBR(s)}` : '—');
export const diasAte = (s) => Math.round((paraData(s) - paraData(hoje())) / 864e5);
export const diasEntre = (a, b) => Math.round((paraData(b) - paraData(a)) / 864e5);
export const relativo = (s) => {
  if (!s) return '—';
  const d = diasAte(s);
  if (d === 0) return s.length > 10 ? `hoje, ${horaBR(s)}` : 'hoje';
  if (d === 1) return s.length > 10 ? `amanhã, ${horaBR(s)}` : 'amanhã';
  if (d === -1) return 'ontem';
  if (d < 0 && d > -7) return `há ${-d} dias`;
  if (d > 1 && d < 7) return `${DIAS[paraData(s).getDay()]}${s.length > 10 ? `, ${horaBR(s)}` : ''}`;
  return dataCurta(s);
};
export const minutos = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + (m || 0); };
export const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(Math.round(min % 60)).padStart(2, '0')}`;
export const iniciais = (n) => String(n || '?').replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
export const sorteio = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
export const novoId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
export const soma = (l, f = (x) => x) => l.reduce((s, x) => s + (Number(f(x)) || 0), 0);
export const agrupar = (l, f) => l.reduce((m, x) => { const k = f(x); (m[k] ||= []).push(x); return m; }, {});
export const normal = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const CORES_AV = ['#6366f1', '#0ea5e9', '#14b8a6', '#22a06b', '#d97706', '#e11d48', '#9333ea', '#64748b', '#0891b2', '#c2410c', '#4f46e5', '#be185d'];
export const corDe = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return CORES_AV[h % CORES_AV.length]; };
export const av = (nome, cls = '') => `<span class="av ${cls}" style="background:${corDe(nome)}" title="${esc(nome)}">${esc(iniciais(nome))}</span>`;
let SPRITE = new URL('icones.svg', import.meta.url).href;
export const ic = (nome, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="${SPRITE}#i-${nome}"/></svg>`;
export const et = (texto, tom = '', extra = '') => `<span class="et ${tom} ${extra}">${esc(texto)}</span>`;
export const prog = (p, tom = '') => `<div class="prog ${tom}"><i style="width:${Math.max(0, Math.min(100, p || 0)).toFixed(1)}%"></i></div>`;
export const telLink = (t) => `https://wa.me/55${String(t || '').replace(/\D/g, '')}`;

// ---------------------------------------------------------------- feriados e dias úteis (Brasil)
function pascoa(a) { const b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4, g = Math.floor((c + 8) / 25), h = Math.floor((c - g + 1) / 3), i = (19 * b + c - e - h + 15) % 30, k = Math.floor(d / 4), l = d % 4, m = (32 + 2 * f + 2 * k - i - l) % 7, n = Math.floor((b + 11 * i + 22 * m) / 451), mes = Math.floor((i + m - 7 * n + 114) / 31), dia = ((i + m - 7 * n + 114) % 31) + 1; return new Date(a, mes - 1, dia, 12); }
const cacheFer = {};
export function feriados(ano) {
  if (cacheFer[ano]) return cacheFer[ano];
  const p = pascoa(ano), mais = (n) => { const d = new Date(p); d.setDate(d.getDate() + n); return iso(d); };
  const m = new Map([[`${ano}-01-01`, 'Confraternização Universal'], [mais(-48), 'Carnaval'], [mais(-47), 'Carnaval'], [mais(-2), 'Sexta-feira Santa'], [`${ano}-04-21`, 'Tiradentes'], [`${ano}-05-01`, 'Dia do Trabalho'], [mais(60), 'Corpus Christi'], [`${ano}-09-07`, 'Independência'], [`${ano}-10-12`, 'Nossa Senhora Aparecida'], [`${ano}-11-02`, 'Finados'], [`${ano}-11-15`, 'Proclamação da República'], [`${ano}-11-20`, 'Consciência Negra'], [`${ano}-12-25`, 'Natal']]);
  return (cacheFer[ano] = m);
}
export const nomeFeriado = (s) => feriados(Number(s.slice(0, 4))).get(s.slice(0, 10)) || '';
export const fimDeSemana = (s) => [0, 6].includes(paraData(s).getDay());
export const diaUtil = (s) => !fimDeSemana(s) && !nomeFeriado(s);

// ---------------------------------------------------------------- dados (localStorage)
export class Banco {
  constructor(chave, semente, inicial = null) {
    this.chave = chave; this.semente = semente;
    if (inicial) { this.dados = inicial; return; }
    try { this.dados = JSON.parse(localStorage.getItem(chave) || 'null'); } catch { this.dados = null; }
    if (!this.dados || !this.dados._ok) this.recomecar();
  }
  recomecar() {
    const s = this.semente();
    this.dados = { _ok: 1, _cfg: { ...(s._cfg || {}) }, _log: [] };
    for (const [nome, lista] of Object.entries(s)) if (nome !== '_cfg') this.dados[nome] = lista.map((x) => ({ id: novoId(), ...x }));
    this.gravar();
  }
  gravar() { try { localStorage.setItem(this.chave, JSON.stringify(this.dados)); } catch { /* modo privado: fica só em memória */ } }
  get cfg() { return this.dados._cfg; }
  lista(nome) { return this.dados[nome] || (this.dados[nome] = []); }
  obter(nome, id) { return id ? this.lista(nome).find((x) => x.id === id) || null : null; }
  salvar(nome, obj) {
    const l = this.lista(nome);
    if (obj.id) { const i = l.findIndex((x) => x.id === obj.id); if (i >= 0) { l[i] = { ...l[i], ...obj }; this.gravar(); return l[i]; } }
    const { id: _sem, ...resto } = obj;
    const novo = { id: novoId(), criado: agoraISO(), ...resto };
    l.unshift(novo); this.gravar(); return novo;
  }
  apagar(nome, id) { const l = this.lista(nome); const i = l.findIndex((x) => x.id === id); if (i < 0) return null; const [x] = l.splice(i, 1); this.gravar(); return { x, i }; }
  restaurar(nome, { x, i }) { this.lista(nome).splice(i, 0, x); this.gravar(); }
  /** histórico (aparece na linha do tempo das fichas) */
  registrar(alvo, texto, extra = {}) { this.dados._log.unshift({ id: novoId(), alvo, texto, quando: agoraISO(), ...extra }); if (this.dados._log.length > 600) this.dados._log.length = 600; this.gravar(); }
  historico(alvo) { return this.dados._log.filter((l) => l.alvo === alvo); }
}

// ---------------------------------------------------------------- avisos, modal, menus
export function avisar(texto, { tipo = 'ok', desfazer = null, tempo = 4200 } = {}) {
  let c = document.querySelector('.avisos');
  if (!c) { c = document.createElement('div'); c.className = 'avisos'; c.setAttribute('role', 'status'); document.body.appendChild(c); }
  const t = document.createElement('div'); t.className = `aviso ${tipo === 'erro' ? 'erro' : ''}`;
  t.innerHTML = `${ic(tipo === 'erro' ? 'warning-circle' : 'check-circle')}<span>${esc(texto)}</span>${desfazer ? '<button type="button">Desfazer</button>' : ''}`;
  if (desfazer) t.querySelector('button').onclick = () => { desfazer(); t.remove(); };
  c.appendChild(t); setTimeout(() => t.remove(), desfazer ? 6500 : tempo);
}
export function modal({ titulo, corpo, botoes = [], largura = 560, classe = '', aoAbrir = null }) {
  return new Promise((resolver) => {
    const f = document.createElement('div'); f.className = 'fundo-modal';
    f.innerHTML = `<div class="modal ${classe}" role="dialog" aria-modal="true" aria-label="${esc(titulo || '')}" style="width:min(${largura}px,100%)">
      ${titulo ? `<div class="modal-cab"><h2>${esc(titulo)}</h2><button type="button" class="btn fant ic-so peq" data-fechar aria-label="Fechar">${ic('x')}</button></div>` : ''}
      <div class="modal-corpo">${corpo}</div>
      ${botoes.length ? `<div class="modal-pe">${botoes.map((b, i) => `<button type="button" class="btn ${b.classe || ''}" data-b="${i}">${b.icone ? ic(b.icone) : ''}${esc(b.rotulo)}</button>`).join('')}</div>` : ''}</div>`;
    const anterior = document.activeElement;
    const fechar = (v) => { f.remove(); document.removeEventListener('keydown', tecla, true); anterior?.focus?.(); resolver(v); };
    const tecla = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); fechar(null); }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { const p = f.querySelector('.btn.pri'); if (p) { e.preventDefault(); p.click(); } }
    };
    f.addEventListener('mousedown', (e) => { if (e.target === f) fechar(null); });
    f.addEventListener('click', async (e) => {
      if (e.target.closest('[data-fechar]')) return fechar(null);
      const b = e.target.closest('[data-b]'); if (!b) return;
      const def = botoes[Number(b.dataset.b)];
      const r = def.acao ? await def.acao(f) : def.valor;
      if (r !== false) fechar(r === undefined ? def.valor : r);
    });
    document.addEventListener('keydown', tecla, true);
    document.body.appendChild(f);
    aoAbrir?.(f, fechar);
    setTimeout(() => (f.querySelector('[autofocus]') || f.querySelector('.modal-corpo input:not([type=checkbox]),.modal-corpo select,.modal-corpo textarea') || f.querySelector('.btn.pri'))?.focus(), 30);
  });
}
export const confirmar = (texto, { rotulo = 'Confirmar', perigo = false, titulo = 'Confirmar' } = {}) => modal({ titulo, largura: 420, corpo: `<p style="color:var(--tx-2)">${esc(texto)}</p>`,
  botoes: [{ rotulo: 'Cancelar', valor: false }, { rotulo, classe: `pri ${perigo ? 'perigo' : ''}`, valor: true }] });

let popAberto = null;
export function fecharPop() { popAberto?.remove(); popAberto = null; }
export function pop(ancora, itens) {
  fecharPop();
  const p = document.createElement('div'); p.className = 'pop'; p.setAttribute('role', 'menu');
  p.innerHTML = itens.map((it, i) => (it.sep ? '<div class="sep"></div>' : `<button type="button" role="menuitem" data-i="${i}" class="${it.perigo ? 'perigo' : ''}">${it.icone ? ic(it.icone) : ''}${esc(it.rotulo)}</button>`)).join('');
  document.body.appendChild(p);
  const r = ancora.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight;
  p.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.right - w))}px`;
  p.style.top = `${r.bottom + h + 8 > innerHeight ? r.top - h - 4 : r.bottom + 4}px`;
  p.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; const it = itens[Number(b.dataset.i)]; fecharPop(); it.acao?.(); });
  setTimeout(() => (popAberto = p), 0);
  p.querySelector('button')?.focus();
}
document.addEventListener('mousedown', (e) => { if (popAberto && !popAberto.contains(e.target)) fecharPop(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && popAberto) fecharPop(); });

// ---------------------------------------------------------------- formulários
function opcoesDe(c, app) {
  if (c.tipo === 'relacao') return app.db.lista(c.colecao).filter((x) => (c.filtrar ? c.filtrar(x, app) : true)).map((x) => [x.id, typeof c.mostrar === 'function' ? c.mostrar(x, app) : x[c.mostrar || 'nome']]).sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'pt-BR'));
  const o = typeof c.opcoes === 'function' ? c.opcoes(app) : c.opcoes || [];
  return o.map((x) => (Array.isArray(x) ? x : [x, x]));
}
export function campoHTML(c, v, app) {
  const id = `f-${c.nome}`, req = c.obrigatorio ? 'required' : '';
  const val = v ?? (typeof c.padrao === 'function' ? c.padrao(app) : c.padrao) ?? '';
  let ctl;
  if (c.tipo === 'selecao' || c.tipo === 'relacao') ctl = `<select id="${id}" name="${c.nome}" ${req}>${c.obrigatorio && val ? '' : '<option value="">Selecione…</option>'}${opcoesDe(c, app).map(([k, r]) => `<option value="${esc(k)}" ${String(k) === String(val) ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>`;
  else if (c.tipo === 'texto-longo') ctl = `<textarea id="${id}" name="${c.nome}" ${req} placeholder="${esc(c.dica || '')}">${esc(val)}</textarea>`;
  else if (c.tipo === 'booleano') ctl = `<label class="flex" style="height:32px;font-weight:400;color:var(--tx)"><input type="checkbox" id="${id}" name="${c.nome}" ${val ? 'checked' : ''}> ${esc(c.texto || 'Sim')}</label>`;
  else if (c.tipo === 'moeda') ctl = `<div class="prefixo"><span>R$</span><input id="${id}" name="${c.nome}" type="number" step="0.01" min="${c.min ?? 0}" inputmode="decimal" value="${esc(val)}" ${req}></div>`;
  else {
    const t = { numero: 'number', data: 'date', datahora: 'datetime-local', email: 'email', tel: 'tel', hora: 'time', porcentagem: 'number' }[c.tipo] || 'text';
    const extra = c.tipo === 'numero' || c.tipo === 'porcentagem' ? `step="${c.passo || 'any'}" ${c.min != null ? `min="${c.min}"` : ''} inputmode="decimal"` : '';
    ctl = `<input id="${id}" name="${c.nome}" type="${t}" ${extra} value="${esc(c.tipo === 'datahora' ? String(val).slice(0, 16) : val)}" ${req} placeholder="${esc(c.dica || '')}" ${c.max ? `maxlength="${c.max}"` : ''}>`;
  }
  return `<label class="campo ${c.largo || c.tipo === 'texto-longo' ? 'largo' : ''}" for="${id}">${esc(c.rotulo)}${c.obrigatorio ? ' <span class="er-tx">*</span>' : ''}${ctl}${c.ajuda ? `<span class="ajuda">${esc(c.ajuda)}</span>` : ''}</label>`;
}
export function lerCampos(raiz, campos) {
  const o = {};
  for (const c of campos) {
    const el = raiz.querySelector(`[name="${c.nome}"]`); if (!el) continue;
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (['moeda', 'numero', 'porcentagem'].includes(c.tipo)) v = v === '' ? null : Number(v);
    o[c.nome] = v;
  }
  return o;
}
/** Abre o formulário de uma coleção (novo ou edição). Devolve o registro salvo ou null. */
export async function editar(app, nome, registro = null, extra = {}) {
  const col = app.colecoes[nome];
  const campos = (typeof col.campos === 'function' ? col.campos(app) : col.campos).filter((c) => !c.oculto);
  const corpo = `<form class="form-grade ${col.tres ? 'tres' : ''}" novalidate onsubmit="return false">${campos.map((c) => campoHTML(c, registro?.[c.nome] ?? extra[c.nome], app)).join('')}</form>`;
  const r = await modal({
    titulo: registro ? `Editar ${col.singular}` : `${col.genero === 'f' ? 'Nova' : 'Novo'} ${col.singular}`, corpo, largura: col.largura || 600,
    botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: registro ? 'Salvar' : 'Criar', classe: 'pri', acao: (f) => {
      const form = f.querySelector('form');
      if (!form.reportValidity()) return false;
      const dados = lerCampos(form, campos);
      const erro = col.validar?.(dados, app, registro);
      if (erro) { avisar(erro, { tipo: 'erro' }); return false; }
      return dados;
    } }],
  });
  if (!r) return null;
  let dados = { ...(registro ? { id: registro.id } : {}), ...extra, ...r };
  if (col.antesDeSalvar) dados = col.antesDeSalvar(dados, app, registro) || dados;
  const salvo = app.db.salvar(nome, dados);
  col.aoSalvar?.(salvo, app, !registro, registro);
  if (!registro) app.db.registrar(`${nome}:${salvo.id}`, `${col.genero === 'f' ? 'Criada' : 'Criado'}`, { icone: 'plus' });
  avisar(`${col.singular[0].toUpperCase()}${col.singular.slice(1)} ${registro ? 'salv' : 'criad'}${col.genero === 'f' ? 'a' : 'o'}`);
  return salvo;
}
export async function excluir(app, nome, id, aoFim = null) {
  const col = app.colecoes[nome];
  if (!(await confirmar(`Excluir ${col.genero === 'f' ? 'esta' : 'este'} ${col.singular}? Você pode desfazer logo em seguida.`, { rotulo: 'Excluir', perigo: true, titulo: `Excluir ${col.singular}` }))) return false;
  const r = app.db.apagar(nome, id);
  fecharGaveta(); app.render(); aoFim?.();
  avisar(`${col.singular[0].toUpperCase()}${col.singular.slice(1)} ${col.genero === 'f' ? 'excluída' : 'excluído'}`, { desfazer: () => { app.db.restaurar(nome, r); app.render(); } });
  return true;
}

// ---------------------------------------------------------------- painel lateral (ficha do registro)
let gavetaAtual = null;
export function fecharGaveta() {
  if (!gavetaAtual) return;
  const { g, v } = gavetaAtual; gavetaAtual = null;
  g.classList.remove('on'); v.classList.remove('on');
  setTimeout(() => { g.remove(); v.remove(); }, 260);
  if (location.hash.includes('?')) history.replaceState(null, '', location.hash.split('?')[0]);
}
export function gaveta(html, { estreita = false, aoMontar = null } = {}) {
  if (gavetaAtual) { gavetaAtual.g.className = `gaveta on ${estreita ? 'estreita' : ''}`; gavetaAtual.g.innerHTML = html; aoMontar?.(gavetaAtual.g); return gavetaAtual.g; }
  const v = document.createElement('div'); v.className = 'veu';
  const g = document.createElement('aside'); g.className = `gaveta ${estreita ? 'estreita' : ''}`; g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true');
  g.innerHTML = html;
  document.body.append(v, g);
  v.addEventListener('click', fecharGaveta);
  requestAnimationFrame(() => { v.classList.add('on'); g.classList.add('on'); });
  gavetaAtual = { g, v };
  aoMontar?.(g);
  setTimeout(() => g.querySelector('[data-fechar-gaveta]')?.focus(), 50);
  return g;
}
/** Monta o HTML padrão de uma ficha: topo, cabeçalho, abas e corpo */
export function ficha({ tipo, icone = 'file-text', titulo, sub = '', avatar = '', extra = '', acoes = '', abas = null, aba = null, corpo = '', pe = '' }) {
  return `<div class="gav-topo"><span class="tipo">${ic(icone)}${esc(tipo)}</span><div class="flex" style="margin-left:auto;gap:4px">${acoes}<button type="button" class="btn fant ic-so peq" data-fechar-gaveta aria-label="Fechar (Esc)">${ic('x')}</button></div></div>
    <div class="gav-corpo"><div class="gav-cab">${avatar}<div class="cresce"><h2>${titulo}</h2>${sub ? `<div class="sub">${sub}</div>` : ''}${extra}</div></div>
    ${abas ? `<div class="gav-abas" role="tablist">${abas.map(([id, r, n]) => `<button type="button" role="tab" data-aba="${id}" aria-selected="${id === aba}">${esc(r)}${n ? ` <span class="mute">${n}</span>` : ''}</button>`).join('')}</div>` : ''}
    <div data-corpo-aba>${corpo}</div></div>${pe ? `<div class="gav-pe">${pe}</div>` : ''}`;
}
export const props = (linhas) => `<dl class="props">${linhas.filter(Boolean).map(([icone, r, v]) => `<dt>${ic(icone)}${esc(r)}</dt><dd>${v ?? '<span class="mute">—</span>'}</dd>`).join('')}</dl>`;
export const linhaDoTempo = (itens) => (itens.length ? `<ul class="tempo">${itens.map((x) => `<li><span class="bola ${x.tom || ''}">${ic(x.icone || 'dot-outline')}</span><div class="txt"><div>${x.html}<span class="q">${esc(x.quando ? relativo(x.quando) : '')}</span></div>${x.nota ? `<div class="nota-box">${esc(x.nota)}</div>` : ''}</div></li>`).join('')}</ul>` : vazio('clock-countdown', 'Nada no histórico ainda'));
export const vazio = (icone, titulo, texto = '', acao = '') => `<div class="vazio">${ic(icone)}<b>${esc(titulo)}</b>${texto ? `<span>${esc(texto)}</span>` : ''}${acao}</div>`;

// ---------------------------------------------------------------- indicadores e gráficos (SVG)
export const kpis = (lista) => `<div class="kpis" style="--n:${lista.length}">${lista.map((k) => `<div class="kpi ${k.alerta ? 'alerta' : ''}">
  <div class="rot">${k.icone ? ic(k.icone) : ''}${esc(k.rot)}</div><div class="val">${k.val}</div>
  ${k.nota || k.var != null ? `<div class="nota">${k.var != null && isFinite(k.var) ? `<span class="var ${k.var >= 0 ? 'sobe' : 'desce'}">${ic(k.var >= 0 ? 'trend-up' : 'trend-down', 'p')}${pct(Math.abs(k.var))}</span>` : ''}${k.nota ? `<span>${k.nota}</span>` : ''}</div>` : ''}
  ${k.spark ? sparkline(k.spark, k.cor) : ''}</div>`).join('')}</div>`;
export function sparkline(vals, cor = 'var(--acc)') {
  if (!vals?.length) return '';
  const mx = Math.max(...vals), mn = Math.min(...vals), W = 72, H = 26, x = (i) => (i / Math.max(1, vals.length - 1)) * W, y = (v) => H - 2 - ((v - mn) / (mx - mn || 1)) * (H - 4);
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${d}L${W},${H}L0,${H}Z" fill="${cor}" opacity=".1"/><path d="${d}" fill="none" stroke="${cor}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
const passoBonito = (max, n = 4) => { const bruto = max / n, mag = 10 ** Math.floor(Math.log10(bruto || 1)), r = bruto / mag; return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag; };
/** Barras verticais. dados: [{rot, v:[...]}], series: [{nome, cor}] */
export function barras({ dados, series, altura = 220, fmt = num, empilhado = false, linhaMeta = null, largura = 680 }) {
  const L = largura, H = altura, ml = 54, mb = 24, mt = 8, w = L - ml - 6, h = H - mb - mt;
  const tot = dados.map((d) => (empilhado ? soma(d.v) : Math.max(0, ...d.v)));
  const passo = passoBonito(Math.max(1, ...tot, linhaMeta || 0)), max = Math.ceil(Math.max(1, ...tot, linhaMeta || 0) / passo) * passo;
  const slot = w / Math.max(1, dados.length), gw = Math.min(46, slot * 0.62), bw = empilhado ? gw : gw / series.length;
  const Y = (v) => mt + h - (v / max) * h;
  let s = `<svg class="graf" viewBox="0 0 ${L} ${H}" role="img">`;
  for (let t = 0; t <= max + 1e-9; t += passo) s += `<line class="eixo ${t === 0 ? 'base' : ''}" x1="${ml}" x2="${L - 6}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${ml - 8}" y="${Y(t) + 3.5}" text-anchor="end">${fmt(t)}</text>`;
  dados.forEach((d, i) => {
    const x0 = ml + i * slot + (slot - gw) / 2; let acc = 0;
    d.v.forEach((v, j) => {
      const bh = Math.max(0, (v / max) * h), x = empilhado ? x0 : x0 + j * bw, y = empilhado ? Y(acc + v) : Y(v);
      if (v > 0) s += `<rect class="barra" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(2, bw - (empilhado ? 0 : 3)).toFixed(1)}" height="${bh.toFixed(1)}" rx="${empilhado ? 2 : 4}" fill="${series[j].cor}"><title>${esc(d.rot)} · ${esc(series[j].nome)}: ${fmt(v)}</title></rect>`;
      acc += v;
    });
    s += `<text x="${(ml + i * slot + slot / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(d.rot)}</text>`;
  });
  if (linhaMeta) s += `<line x1="${ml}" x2="${L - 6}" y1="${Y(linhaMeta)}" y2="${Y(linhaMeta)}" stroke="var(--tx-3)" stroke-dasharray="4 4"/><text x="${L - 8}" y="${Y(linhaMeta) - 5}" text-anchor="end">meta ${fmt(linhaMeta)}</text>`;
  return `${s}</svg>${series.length > 1 ? legenda(series) : ''}`;
}
export const legenda = (series) => `<div class="legenda">${series.map((s) => `<span><i style="background:${s.cor}"></i>${esc(s.nome)}</span>`).join('')}</div>`;
/** Linhas/áreas. rotulos: [..], series: [{nome, cor, v:[..], tracejada}] */
export function linhas({ rotulos, series, altura = 220, fmt = num, area = true, zero = true, largura = 680 }) {
  const L = largura, H = altura, ml = 60, mb = 24, mt = 10, w = L - ml - 8, h = H - mb - mt;
  const todos = series.flatMap((s) => s.v.filter((v) => v != null));
  let mn = Math.min(zero ? 0 : Infinity, ...todos), mx = Math.max(1, ...todos);
  const passo = passoBonito(mx - mn); mn = Math.floor(mn / passo) * passo; mx = Math.ceil(mx / passo) * passo;
  const X = (i) => ml + (i / Math.max(1, rotulos.length - 1)) * w, Y = (v) => mt + h - ((v - mn) / (mx - mn || 1)) * h;
  let s = `<svg class="graf" viewBox="0 0 ${L} ${H}" role="img">`;
  for (let t = mn; t <= mx + 1e-9; t += passo) s += `<line class="eixo ${Math.abs(t) < 1e-9 ? 'base' : ''}" x1="${ml}" x2="${L - 8}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${ml - 8}" y="${Y(t) + 3.5}" text-anchor="end">${fmt(t)}</text>`;
  if (mn < 0) s += `<line x1="${ml}" x2="${L - 8}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--er)" stroke-dasharray="3 4" opacity=".7"/>`;
  series.forEach((se) => {
    const pts = se.v.map((v, i) => (v == null ? null : [X(i), Y(v)])).filter(Boolean);
    if (!pts.length) return;
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
    if (area && !se.tracejada) s += `<path d="${d}L${pts.at(-1)[0]},${Y(Math.max(mn, 0))}L${pts[0][0]},${Y(Math.max(mn, 0))}Z" fill="${se.cor}" opacity=".09"/>`;
    s += `<path d="${d}" fill="none" stroke="${se.cor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" ${se.tracejada ? 'stroke-dasharray="5 5"' : ''}/>`;
  });
  const cada = Math.ceil(rotulos.length / 9);
  rotulos.forEach((r, i) => { if (i % cada === 0 || i === rotulos.length - 1) s += `<text x="${X(i).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(r)}</text>`; });
  return `${s}</svg>${series.length > 1 ? legenda(series) : ''}`;
}
/** Rosca (donut). itens: [{rot, v, cor}] */
export function rosca({ itens, centro = '', sub = '', fmt = num }) {
  const tot = soma(itens, (x) => x.v) || 1, R = 52, C = 2 * Math.PI * R; let off = 0;
  const arcos = itens.filter((x) => x.v > 0).map((x) => { const l = (x.v / tot) * C; const a = `<circle cx="66" cy="66" r="${R}" fill="none" stroke="${x.cor}" stroke-width="16" stroke-dasharray="${Math.max(0, l - 1.5)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 66 66)"><title>${esc(x.rot)}: ${fmt(x.v)}</title></circle>`; off += l; return a; }).join('');
  return `<div class="rosca"><svg viewBox="0 0 132 132" role="img"><circle cx="66" cy="66" r="${R}" fill="none" stroke="var(--neutro-bg)" stroke-width="16"/>${arcos}
    <text x="66" y="${sub ? 64 : 70}" text-anchor="middle" style="font-size:17px;font-weight:650;fill:var(--tx)">${esc(centro)}</text>${sub ? `<text x="66" y="81" text-anchor="middle" style="font-size:10.5px">${esc(sub)}</text>` : ''}</svg>
    <div class="itens">${itens.map((x) => `<div><i style="background:${x.cor}"></i><span class="corta">${esc(x.rot)}</span><b>${fmt(x.v)}</b><span class="mute" style="width:38px;text-align:right">${pct((x.v / tot) * 100)}</span></div>`).join('')}</div></div>`;
}
export const barrasH = (itens, { fmt = num, tom = '' } = {}) => { const mx = Math.max(1, ...itens.map((x) => x.v)); return `<div class="barras-h">${itens.map((x) => `<div class="l"><span class="corta">${x.html || esc(x.rot)}</span><b>${fmt(x.v)}${x.extra ? ` <span class="mute" style="font-weight:400">${x.extra}</span>` : ''}</b>${prog((x.v / mx) * 100, x.tom ?? tom)}</div>`).join('')}</div>`; };
export const funilH = (itens, { fmt = num } = {}) => { const mx = Math.max(1, ...itens.map((x) => x.v)); return `<div class="funil-h">${itens.map((x, i) => `<div class="f"><span class="corta">${esc(x.rot)}</span><div><div class="b" style="width:${Math.max(4, (x.v / mx) * 100)}%;opacity:${1 - i * 0.12}">${fmt(x.v)}</div></div><span class="r">${x.r || ''}</span></div>`).join('')}</div>`; };

// ---------------------------------------------------------------- tabela com visões, filtros, ordenação, seleção e exportação
export function tabela(app, cfg) {
  const st = app.estado[`tab:${cfg.id}`] ||= { busca: '', visao: cfg.visoes?.[0]?.id || '', filtros: {}, ordem: cfg.ordem || null, desc: !!cfg.desc, pagina: 0, sel: [] };
  let todos = typeof cfg.itens === 'function' ? cfg.itens(app) : app.db.lista(cfg.colecao);
  const visao = cfg.visoes?.find((v) => v.id === st.visao);
  let itens = visao?.filtro ? todos.filter((x) => visao.filtro(x, app)) : todos;
  for (const f of cfg.filtros || []) { const v = st.filtros[f.k]; if (v) itens = itens.filter((x) => String(f.valor ? f.valor(x, app) : x[f.k]) === v); }
  if (st.busca) { const b = normal(st.busca); itens = itens.filter((x) => normal(cfg.textoBusca ? cfg.textoBusca(x, app) : cfg.colunas.map((c) => (c.valor ? c.valor(x, app) : x[c.k])).join(' ')).includes(b)); }
  if (st.ordem) {
    const c = cfg.colunas.find((x) => x.k === st.ordem);
    const val = (x) => (c?.valor ? c.valor(x, app) : x[st.ordem]);
    itens = [...itens].sort((a, b) => { const va = val(a) ?? '', vb = val(b) ?? ''; const r = typeof va === 'number' || typeof vb === 'number' ? (Number(va) || 0) - (Number(vb) || 0) : String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }); return st.desc ? -r : r; });
  }
  const por = cfg.porPagina || 40, paginas = Math.max(1, Math.ceil(itens.length / por));
  if (st.pagina >= paginas) st.pagina = 0;
  const pagina = itens.slice(st.pagina * por, st.pagina * por + por);
  st.sel = st.sel.filter((id) => itens.some((x) => x.id === id));
  app.estado[`tab:${cfg.id}:itens`] = itens;
  const massa = cfg.massa?.length;
  const cab = `${cfg.visoes ? `<div class="visoes" role="tablist">${cfg.visoes.map((v) => `<button type="button" role="tab" data-tab-visao="${cfg.id}:${v.id}" aria-selected="${v.id === st.visao}">${esc(v.rot)}<span class="n">${v.filtro ? todos.filter((x) => v.filtro(x, app)).length : todos.length}</span></button>`).join('')}</div>` : ''}
    <div class="tab-barra"><label class="caixa-busca">${ic('magnifying-glass')}<input type="search" placeholder="${esc(cfg.buscaDica || 'Buscar…')}" value="${esc(st.busca)}" data-tab-busca="${cfg.id}" aria-label="Buscar"></label>
    ${(cfg.filtros || []).map((f) => { const ops = typeof f.opcoes === 'function' ? f.opcoes(app) : f.opcoes; return `<span class="filtro-chip ${st.filtros[f.k] ? 'ativo' : ''}"><select data-tab-filtro="${cfg.id}:${f.k}" aria-label="${esc(f.rot)}"><option value="">${esc(f.rot)}</option>${ops.map((o) => { const [v, r] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${st.filtros[f.k] === String(v) ? 'selected' : ''}>${esc(f.rot)}: ${esc(r)}</option>`; }).join('')}</select></span>`; }).join('')}
    ${Object.values(st.filtros).some(Boolean) || st.busca ? `<button type="button" class="btn fant peq" data-tab-limpar="${cfg.id}">Limpar</button>` : ''}
    <span class="mute" style="margin-left:auto;font-size:12.5px">${num(itens.length)} ${itens.length === 1 ? cfg.singular || 'item' : cfg.plural || 'itens'}${cfg.total ? ` · ${cfg.total(itens, app)}` : ''}</span>
    <button type="button" class="btn fant ic-so peq" data-tab-csv="${cfg.id}" title="Exportar planilha (CSV)" aria-label="Exportar planilha">${ic('download-simple')}</button>
    ${cfg.novo ? `<button type="button" class="btn pri peq" ${cfg.novo.attrs || ''}>${ic('plus')}${esc(cfg.novo.rot)}</button>` : ''}</div>`;
  const ths = `${massa ? `<th class="chk"><input type="checkbox" data-tab-todos="${cfg.id}" ${pagina.length && pagina.every((x) => st.sel.includes(x.id)) ? 'checked' : ''} aria-label="Selecionar todos"></th>` : ''}${cfg.colunas.map((c) => `<th class="${c.n ? 'n' : ''} ${c.oc ? 'oc' : ''} ${c.ord === false ? '' : 'ord'}" ${c.ord === false ? '' : `data-tab-ord="${cfg.id}:${c.k}"`} ${c.w ? `style="width:${c.w}"` : ''}>${esc(c.rot)}${st.ordem === c.k ? `<span class="seta">${st.desc ? '↓' : '↑'}</span>` : ''}</th>`).join('')}${cfg.acoesLinha ? '<th></th>' : ''}`;
  const corpo = pagina.map((x) => `<tr class="${cfg.aoClicar !== false ? 'clicavel' : ''} ${st.sel.includes(x.id) ? 'sel' : ''}" data-tab-linha="${cfg.id}:${x.id}">${massa ? `<td class="chk"><input type="checkbox" data-tab-sel="${cfg.id}:${x.id}" ${st.sel.includes(x.id) ? 'checked' : ''} aria-label="Selecionar"></td>` : ''}${cfg.colunas.map((c) => `<td class="${c.n ? 'n' : ''} ${c.oc ? 'oc' : ''} ${c.cls || ''}">${c.render ? c.render(x, app) : esc((c.valor ? c.valor(x, app) : x[c.k]) ?? '—')}</td>`).join('')}${cfg.acoesLinha ? `<td class="acoes">${cfg.acoesLinha(x, app)}</td>` : ''}</tr>`).join('');
  const rodape = cfg.rodape ? `<tfoot><tr>${cfg.rodape(itens, app)}</tr></tfoot>` : '';
  const vaz = itens.length ? '' : vazio(cfg.vazio?.icone || 'tray', st.busca || Object.values(st.filtros).some(Boolean) ? 'Nada encontrado com esse filtro' : cfg.vazio?.titulo || 'Nada por aqui ainda', cfg.vazio?.texto || '');
  return `<div class="cartao" data-tabela="${cfg.id}">${cab}<div class="tabela-caixa">${itens.length ? `<table class="tabela"><thead><tr>${ths}</tr></thead><tbody>${corpo}</tbody>${rodape}</table>` : vaz}</div>
    ${paginas > 1 ? `<div class="tab-pe"><span>${st.pagina * por + 1}–${Math.min(itens.length, (st.pagina + 1) * por)} de ${num(itens.length)}</span><div class="flex"><button type="button" class="btn peq" data-tab-pag="${cfg.id}:-1" ${st.pagina ? '' : 'disabled'}>${ic('caret-left')}Anterior</button><button type="button" class="btn peq" data-tab-pag="${cfg.id}:1" ${st.pagina < paginas - 1 ? '' : 'disabled'}>Próxima${ic('caret-right')}</button></div></div>` : ''}</div>
    ${massa && st.sel.length ? `<div class="massa nao-imprime"><b>${st.sel.length} ${st.sel.length === 1 ? 'selecionado' : 'selecionados'}</b>${cfg.massa.map((m, i) => `<button type="button" class="btn peq" data-tab-massa="${cfg.id}:${i}">${m.icone ? ic(m.icone) : ''}${esc(m.rot)}</button>`).join('')}<button type="button" class="btn peq ic-so" data-tab-desmarcar="${cfg.id}" aria-label="Limpar seleção">${ic('x')}</button></div>` : ''}`;
}
function baixar(nome, conteudo, tipo = 'text/csv;charset=utf-8') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo })); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
export { baixar };

// ---------------------------------------------------------------- kanban (arrastar e soltar)
export function kanban({ id, colunas, itens, campo, ficha: desenhar }) {
  return `<div class="kanban" data-kanban="${id}">${colunas.map((c) => {
    const l = itens.filter((x) => x[campo] === c.id);
    return `<section class="coluna" data-coluna="${esc(c.id)}" style="--c:${c.cor || 'var(--borda-2)'}"><div class="coluna-cab"><div class="barra-cor"></div><div class="t">${esc(c.nome)}<span class="n">${l.length}</span></div>${c.sub ? `<div class="v">${c.sub(l)}</div>` : ''}</div>
      <div class="coluna-corpo">${l.map((x) => `<article class="ficha ${c.classe?.(x) || ''}" draggable="true" data-ficha="${x.id}" tabindex="0">${desenhar(x)}</article>`).join('') || '<div class="mute" style="font-size:12px;text-align:center;padding:14px 4px">Arraste para cá</div>'}</div></section>`;
  }).join('')}</div>`;
}

// ---------------------------------------------------------------- calendário com grade de horários
/** colunas: [{id, rot, sub, hoje, fora:[[de,ate]...]}], eventos: [{id, col, ini:'HH:MM', fim:'HH:MM', titulo, sub, cor, cls}] */
export function calGrade({ id, colunas, eventos, inicio = 7, fim = 21, hh = 56, larguraCol = 170, agora = null }) {
  const alt = (fim - inicio) * hh, Y = (hm) => ((minutos(hm) - inicio * 60) / 60) * hh;
  const horas = Array.from({ length: fim - inicio }, (_, i) => `<div>${String(inicio + i).padStart(2, '0')}:00</div>`).join('');
  return `<div class="cal-rolo"><div class="cal-grade" data-cal="${id}" data-inicio="${inicio}" data-hh="${hh}" style="--hh:${hh}px;grid-template-columns:56px repeat(${colunas.length}, minmax(${larguraCol}px, 1fr))">
    <div class="cal-canto"></div>${colunas.map((c) => `<div class="cal-cab ${c.hoje ? 'hoje' : ''}">${c.avatar || ''}<div><b>${esc(c.rot)}</b>${c.sub ? `<small>${esc(c.sub)}</small>` : ''}</div></div>`).join('')}
    <div class="cal-horas" style="padding-top:0">${horas}</div>
    ${colunas.map((c) => `<div class="cal-dia" data-cal-col="${esc(c.id)}" style="height:${alt}px">
      ${(c.fora || []).map(([de, ate]) => `<div class="fora" style="top:${Math.max(0, Y(de))}px;height:${Math.max(0, Y(ate) - Math.max(0, Y(de)))}px"></div>`).join('')}
      ${agora && agora.col === c.id && minutos(agora.hora) >= inicio * 60 && minutos(agora.hora) <= fim * 60 ? `<div class="agora" style="top:${Y(agora.hora)}px"></div>` : ''}
      ${eventos.filter((e) => e.col === c.id).map((e) => { const t = Y(e.ini), h = Math.max(22, Y(e.fim) - t - 2); return `<div class="evento ${e.cls || ''}" data-evento="${e.id}" style="top:${t + 1}px;height:${h}px;--c:${e.cor || 'var(--acc)'}" title="${esc(`${e.ini}–${e.fim} · ${e.titulo}`)}"><b>${esc(e.titulo)}</b>${h > 34 ? `<span>${esc(e.ini)}–${esc(e.fim)}${e.sub ? ` · ${esc(e.sub)}` : ''}</span>` : ''}${h > 52 && e.sub2 ? `<span>${esc(e.sub2)}</span>` : ''}</div>`; }).join('')}
    </div>`).join('')}</div></div>`;
}
/** Mês: itens [{data, titulo, cor, id}] */
export function calMes({ ym, itens, aoClicar = 'abrirEvento' }) {
  const [a, m] = ym.split('-').map(Number), pri = new Date(a, m - 1, 1), ini = new Date(pri); ini.setDate(1 - pri.getDay());
  const dias = Array.from({ length: 42 }, (_, i) => { const d = new Date(ini); d.setDate(ini.getDate() + i); return iso(d); });
  return `<div class="cal-mes">${DIAS.map((d) => `<div class="dsem">${d}</div>`).join('')}${dias.map((d) => { const l = itens.filter((x) => x.data === d); return `<div class="d ${d.slice(0, 7) !== ym ? 'outro' : ''} ${d === hoje() ? 'hoje' : ''}"><span class="n">${Number(d.slice(8))}</span>${l.slice(0, 4).map((x) => `<div class="pill" style="--c:${x.cor || 'var(--acc)'}" data-acao="${aoClicar}" data-id="${x.id}" title="${esc(x.titulo)}">${esc(x.titulo)}</div>`).join('')}${l.length > 4 ? `<span class="mute" style="font-size:11px">+${l.length - 4}</span>` : ''}</div>`; }).join('')}</div>`;
}

// ---------------------------------------------------------------- impressão
export function imprimir(html) {
  let area = document.getElementById('area-impressao');
  if (!area) { area = document.createElement('div'); area.id = 'area-impressao'; document.body.appendChild(area); const st = document.createElement('style'); st.textContent = '#area-impressao{display:none}@media print{body>*:not(#area-impressao){display:none!important}#area-impressao{display:block}}'; document.head.appendChild(st); }
  area.innerHTML = html; setTimeout(() => window.print(), 60);
}

// ---------------------------------------------------------------- aplicativo
export function criarApp(cfg) {
  const raiz = document.documentElement;
  raiz.style.setProperty('--acc', cfg.cor);
  try { raiz.dataset.tema = localStorage.getItem('nexo-tema') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'); } catch { raiz.dataset.tema = 'claro'; }
  const nuvem = !!window.NEXO_NUVEM;
  document.title = nuvem ? `${cfg.nome} · Blue Rose Express` : `${cfg.nome} · demonstração · Blue Rose Express`;
  const app = { ...cfg, estado: {}, acoes: {}, db: null, kanbans: {}, cals: {}, nuvem };
  if (nuvem) {
    // versão na nuvem: entrar, escolher a empresa e carregar os dados antes de montar a tela
    import('./nuvem.js').then((m) => m.iniciarNuvem(app, cfg)).then((sessao) => { app.sessao = sessao; app.db = sessao.db; if (app.db.cfg.empresa) app.empresa = app.db.cfg.empresa; montar(app, cfg); sessao.depoisDeMontar?.(); })
      .catch((e) => { document.body.innerHTML = `<div style="padding:40px;font-family:system-ui">Não foi possível abrir o sistema: ${esc(e.message || e)}. <a href="">Tentar de novo</a></div>`; });
    return app;
  }
  app.db = new Banco(`nexo2-${cfg.id}`, cfg.semente);
  if (app.db.cfg.empresa) app.empresa = app.db.cfg.empresa;
  montar(app, cfg);
  return app;
}

function montar(app, cfg) {
  const raiz = document.documentElement;
  const site = 'https://bluerose-store.com/';
  const paginas = cfg.paginas.filter((p) => p.id);
  const preco = (v) => moeda(v).replace(',00', '');
  prepararExtras(app, cfg);
  if (app.db.cfg.ramo_pendente && !app.db.cfg.ramo) { app.aplicarModelo(app.db.cfg.ramo_pendente, true); delete app.db.cfg.ramo_pendente; app.db.gravar(); }
  const faixaDemo = `<div class="faixa nao-imprime"><span class="so-larga">Demonstração do <b>${esc(cfg.nome)}</b> · dados de exemplo, só neste navegador</span><span class="sep so-larga"></span>
      <button type="button" data-acao="recomecar">Recomeçar</button>
      <a class="cta" href="${site}app/${cfg.id}/" target="_top">Testar grátis 7 dias com os seus dados</a></div>`;
  document.body.innerHTML = `
    ${app.nuvem ? app.sessao.faixa() : faixaDemo}
    <div class="app" id="app">
      <nav class="lat" aria-label="Menu principal">
        <div class="marca"><div class="marca-ic">${ic(cfg.icone || 'squares-four')}</div><div><b>${esc(cfg.nome)}</b><small>${esc(cfg.sub)}</small></div></div>
        <div class="conta">${av(app.empresa)}<div class="cresce"><b class="corta" data-empresa>${esc(app.empresa)}</b><small class="corta">${esc(app.nuvem ? app.sessao.subConta() : cfg.conta || 'Conta de demonstração')}</small></div></div>
        <button type="button" class="busca-lat" data-acao="paleta">${ic('magnifying-glass')}Buscar ou ir para…<kbd>Ctrl K</kbd></button>
        ${cfg.paginas.map((p) => (p.grupo && !p.id ? `<div class="grupo">${esc(p.grupo)}</div>` : `<a class="item" href="#/${p.id}" data-pag="${p.id}">${ic(p.icone || 'circle')}<span class="corta">${esc(p.rot)}</span><span class="cont" data-cont="${p.id}" hidden></span></a>`)).join('')}
        <div class="lat-pe">
          <a class="item" href="#" data-acao="resumoDia">${ic('notepad')}Resumo do dia</a>
          <a class="item" href="#/config" data-pag="config">${ic('gear-six')}Configurações</a>
          <a class="item" href="javascript:void 0" data-acao="tema">${ic('moon')}<span data-tema-rot>Tema escuro</span></a>
          <a class="item" href="javascript:void 0" data-acao="atalhos">${ic('keyboard')}Atalhos</a>
          ${app.nuvem ? `<a class="item" href="javascript:void 0" data-acao="sair">${ic('sign-out')}Sair</a>` : ''}
          <div class="feito">Feito pela <a href="${site}" target="_top">Blue Rose Express</a></div>
        </div>
      </nav>
      <main class="principal"><header class="topo"><button type="button" class="btn fant ic-so btn-menu" data-acao="menu" aria-label="Abrir menu">${ic('list')}</button><div class="trilha" id="trilha"></div><div class="acoes" id="acoes-topo"></div></header>
        <div class="conteudo" id="conteudo"></div></main>
    </div>`;
  const $ = (s) => document.querySelector(s);
  const atualizaTemaRot = () => { const e = raiz.dataset.tema === 'escuro'; const a = $('[data-acao="tema"]'); a.innerHTML = `${ic(e ? 'sun' : 'moon')}<span>${e ? 'Tema claro' : 'Tema escuro'}</span>`; };
  atualizaTemaRot();

  const rota = () => { const h = location.hash.replace(/^#\/?/, '').split('?')[0]; const [id, ...params] = h.split('/'); return { id: id || paginas[0].id, params: params.map(decodeURIComponent) }; };
  app.ir = (h) => { if (location.hash === h) app.render(); else location.hash = h; };
  app.render = () => {
    const { id, params } = rota();
    const p = id === 'config' ? paginaConfig : paginas.find((x) => x.id === id) || paginas[0];
    app.pagina = p; app.params = params;
    document.querySelectorAll('.lat a.item[data-pag]').forEach((a) => a.classList.toggle('ativo', a.dataset.pag === p.id));
    const titulo = typeof p.titulo === 'function' ? p.titulo(app, params) : p.titulo || p.rot;
    $('#trilha').innerHTML = (p.trilha ? p.trilha(app, params) : '') + `<h1>${esc(titulo)}</h1>`;
    $('#acoes-topo').innerHTML = p.acoes ? p.acoes(app, params) : '';
    const c = $('#conteudo'); c.className = `conteudo ${p.cheio ? 'cheio' : ''}`;
    const rolagem = scrollY;
    c.innerHTML = p.render(app, params);
    if (p.id === paginas[0].id && app.passosHTML) c.insertAdjacentHTML('afterbegin', app.passosHTML());
    p.montar?.(app, c, params);
    if (app._mesmaPagina === `${p.id}/${params.join('/')}`) scrollTo(0, rolagem); else scrollTo(0, 0);
    app._mesmaPagina = `${p.id}/${params.join('/')}`;
    for (const m of paginas) { const el = document.querySelector(`[data-cont="${m.id}"]`); const r = m.cont?.(app); if (el) { const n = typeof r === 'object' ? r?.n : r; el.hidden = !n; el.textContent = n || ''; el.className = `cont ${r?.tom || ''}`; } }
    $('#app').classList.remove('menu-aberto');
  };
  window.addEventListener('hashchange', () => { fecharGaveta(); app.render(); });

  // fichas (painel lateral)
  app.abrir = (tipo, id, aba) => {
    const f = cfg.fichas?.[tipo]; if (!f) return;
    const r = f(app, id, aba); if (!r) return;
    gaveta(r.html, { estreita: r.estreita, aoMontar: (g) => { g.dataset.tipo = tipo; g.dataset.id = id; r.montar?.(g); } });
  };
  app.reabrir = () => { const g = document.querySelector('.gaveta.on'); if (g) app.abrir(g.dataset.tipo, g.dataset.id, g.dataset.aba); };

  // paleta de comandos
  async function paleta() {
    if (document.querySelector('.paleta')) return;
    const ops = [
      ...paginas.map((p) => ({ g: 'Ir para', rot: p.rot, icone: p.icone, s: p.atalho ? `G ${p.atalho.toUpperCase()}` : '', fazer: () => app.ir(`#/${p.id}`) })),
      ...(cfg.comandos || []).map((c) => ({ g: 'Ações', rot: c.rot, icone: c.icone || 'lightning', fazer: () => c.acao(app) })),
      { g: 'Ações', rot: raiz.dataset.tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro', icone: 'moon', fazer: () => app.acoes.tema() },
      { g: 'Ações', rot: 'Configurações', icone: 'gear-six', fazer: () => app.ir('#/config') },
    ];
    const registros = (cfg.busca || []).flatMap((b) => app.db.lista(b.colecao).map((x) => ({ g: b.grupo, rot: b.rot(x, app), s: b.sub?.(x, app) || '', icone: b.icone, fazer: () => app.abrir(b.ficha, x.id) })));
    let sel = 0, vis = ops;
    await modal({ titulo: '', largura: 620, classe: 'paleta', corpo: `<div class="entrada">${ic('magnifying-glass', 'g')}<input type="text" placeholder="Buscar ${esc(cfg.buscaDica || 'registros')}, páginas e ações…" autofocus aria-label="Buscar"></div><ul role="listbox"></ul><div class="rod"><span><kbd>↑</kbd> <kbd>↓</kbd> navegar</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> fechar</span></div>`,
      aoAbrir: (f, fechar) => {
        f.querySelector('.modal-corpo').style.padding = '0';
        const ent = f.querySelector('input'), ul = f.querySelector('ul');
        const desenha = () => {
          const b = normal(ent.value.trim());
          vis = b ? [...ops, ...registros].filter((o) => normal(`${o.rot} ${o.s}`).includes(b)).slice(0, 40) : ops;
          sel = Math.min(sel, Math.max(0, vis.length - 1));
          let g = ''; ul.innerHTML = vis.map((o, i) => { const c = o.g !== g ? `<li class="cab">${esc((g = o.g))}</li>` : ''; return `${c}<li class="op" role="option" data-i="${i}" aria-selected="${i === sel}">${ic(o.icone || 'arrow-right')}<span class="corta">${esc(o.rot)}</span>${o.s ? `<span class="s">${esc(o.s)}</span>` : ''}</li>`; }).join('') || '<li class="cab" style="padding:18px 10px">Nada encontrado.</li>';
          ul.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
        };
        const executa = (i) => { const o = vis[i]; if (!o) return; fechar(null); setTimeout(o.fazer, 30); };
        ent.addEventListener('input', () => { sel = 0; desenha(); });
        ent.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { sel = Math.min(vis.length - 1, sel + 1); desenha(); e.preventDefault(); } if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); desenha(); e.preventDefault(); } if (e.key === 'Enter') { e.preventDefault(); executa(sel); } });
        ul.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) executa(Number(li.dataset.i)); });
        desenha();
      } });
  }

  // ações globais
  Object.assign(app.acoes, {
    recomecar: async () => { if (await confirmar('Apagar tudo o que você mudou e voltar aos dados de exemplo?', { rotulo: 'Recomeçar', titulo: 'Recomeçar a demonstração' })) { app.db.recomecar(); app.estado = {}; app.empresa = app.db.cfg.empresa || cfg.empresa; $('[data-empresa]').textContent = app.empresa; avisar('Dados de exemplo restaurados'); app.render(); } },
    tema: () => { raiz.dataset.tema = raiz.dataset.tema === 'escuro' ? 'claro' : 'escuro'; try { localStorage.setItem('nexo-tema', raiz.dataset.tema); } catch { /* sem armazenamento */ } atualizaTemaRot(); app.render(); },
    menu: () => $('#app').classList.toggle('menu-aberto'),
    paleta,
    atalhos: () => modal({ titulo: 'Atalhos do teclado', largura: 460, corpo: `<div class="col" style="gap:9px">${[['Ctrl K', 'Buscar ou ir para qualquer lugar'], ['/', 'Buscar na lista'], ['N', 'Criar novo na página atual'], ...paginas.filter((p) => p.atalho).map((p) => [`G ${p.atalho.toUpperCase()}`, `Ir para ${p.rot}`]), ['Esc', 'Fechar janela ou ficha'], ['Ctrl Enter', 'Salvar o formulário aberto']].map(([k, t]) => `<div class="entre"><span class="mute-2">${esc(t)}</span><span>${k.split(' ').map((x) => `<kbd>${esc(x)}</kbd>`).join(' ')}</span></div>`).join('')}</div>`, botoes: [{ rotulo: 'Fechar', classe: 'pri', valor: true }] }),
    exportarDados: () => baixar(`${cfg.id}-dados.json`, JSON.stringify(app.db.dados, null, 1), 'application/json'),
    resumoDia: () => {
      const r = resumoDoDia(cfg.id, app.db.dados, hoje()), texto = resumoTexto(cfg.nome, app.empresa, r, hoje());
      const zap = app.db.cfg.whats_dono ? String(app.db.cfg.whats_dono).replace(/\D/g, '') : '';
      modal({ titulo: `Resumo do dia · ${dataCurta(hoje())}`, largura: 560, corpo: `<div class="col" style="gap:12px">
        <div class="grade g3" style="gap:8px">${r.destaques.map(([k, v]) => `<div style="padding:10px;border:1px solid var(--borda);border-radius:8px"><div class="mute" style="font-size:12px">${esc(k)}</div><b class="num" style="font-size:14.5px">${esc(v)}</b></div>`).join('')}</div>
        ${r.alertas.length ? `<div class="alerta-linha al" style="flex-direction:column;align-items:flex-start;gap:4px">${r.alertas.map((x) => `<span>${ic('warning', 'p')} ${esc(x)}</span>`).join('')}</div>` : `<div class="dica">${ic('check-circle')}<span>Nada urgente hoje.</span></div>`}
        ${r.itens.length ? `<div><h4 style="font-size:12.5px;color:var(--tx-3);font-weight:500;margin-bottom:6px">${esc(r.tituloItens || 'Hoje')}</h4><ul class="lista" style="margin:0 -18px">${r.itens.map((x) => `<li style="min-height:34px;padding:6px 18px">${esc(x)}</li>`).join('')}</ul></div>` : ''}
        <label class="campo">Seu WhatsApp (para mandar o resumo)<input data-zap type="tel" value="${esc(app.db.cfg.whats_dono || '')}" placeholder="(11) 99999-9999"></label></div>`,
        botoes: [{ rotulo: 'Copiar', icone: 'copy', classe: 'fant', acao: () => { navigator.clipboard?.writeText(texto).catch(() => {}); avisar('Resumo copiado'); return false; } },
          { rotulo: 'E-mail', icone: 'envelope-simple', acao: () => { location.href = `mailto:?subject=${encodeURIComponent(`Resumo do dia · ${app.empresa}`)}&body=${encodeURIComponent(texto.replace(/\*/g, ''))}`; return false; } },
          { rotulo: 'Enviar no WhatsApp', icone: 'whatsapp-logo', classe: 'pri', acao: (f) => { const n = f.querySelector('[data-zap]').value; if (n) { app.db.cfg.whats_dono = n; app.db.gravar(); } const num = String(n || zap).replace(/\D/g, ''); window.open(`https://wa.me/${num ? `55${num.replace(/^55/, '')}` : ''}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener'); return false; } }] });
    },
  });

  // página de configurações (comum)
  const paginaConfig = {
    id: 'config', rot: 'Configurações', titulo: 'Configurações',
    render: (a) => `<div class="grade g2">
      <div class="cartao"><div class="cartao-cab"><div><h3>Empresa</h3><div class="sub">Aparece no menu e nos documentos impressos</div></div></div><div class="cartao-corpo"><form class="form-grade" data-form-empresa onsubmit="return false">
        <label class="campo largo">Nome da empresa<input name="empresa" value="${esc(a.empresa)}"></label>
        <label class="campo">CNPJ<input name="cnpj" value="${esc(a.db.cfg.cnpj || '12.345.678/0001-90')}"></label>
        <label class="campo">Telefone<input name="telefone" value="${esc(a.db.cfg.telefone || '(11) 4002-8922')}"></label>
        <label class="campo largo">Endereço<input name="endereco" value="${esc(a.db.cfg.endereco || 'Rua das Flores, 120 · Centro · São Paulo/SP')}"></label>
        <div class="campo largo" style="flex-direction:row;justify-content:flex-end"><button type="button" class="btn pri" data-acao="salvarEmpresa">Salvar</button></div></form></div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Aparência</h3><div class="sub">Preferências deste navegador</div></div></div><div class="cartao-corpo col" style="gap:14px">
        <div class="entre"><span>Tema</span><div class="grupo-btn"><button type="button" data-acao="tema" aria-pressed="${raiz.dataset.tema !== 'escuro'}">${ic('sun', 'p')}Claro</button><button type="button" data-acao="tema" aria-pressed="${raiz.dataset.tema === 'escuro'}">${ic('moon', 'p')}Escuro</button></div></div>
        ${a.nuvem ? '' : `<div class="dica">${ic('info')}<span>Na versão contratada, a cor, o logotipo e os cadastros são os da sua empresa, e cada pessoa da equipe tem o próprio acesso.</span></div>`}</div></div>
      ${a.nuvem ? a.sessao.cartaoEquipe() : `<div class="cartao"><div class="cartao-cab"><div><h3>Equipe</h3><div class="sub">Quem usa o sistema</div></div></div><ul class="lista">${(cfg.equipe || []).map(([n, papel]) => `<li>${av(n)}<div><div class="t">${esc(n)}</div><div class="s">${esc(papel)}</div></div><span class="dir">${et('Ativo', 'ok')}</span></li>`).join('')}</ul></div>`}
      <div class="cartao"><div class="cartao-cab"><div><h3>Dados</h3><div class="sub">Cópia e restauração</div></div></div><div class="cartao-corpo col" style="gap:10px">
        <div class="entre"><span class="mute-2">Baixar uma cópia de tudo (JSON)</span><button type="button" class="btn" data-acao="exportarDados">${ic('download-simple')}Exportar</button></div>
        ${a.nuvem ? a.sessao.linhasDados() : `<div class="entre"><span class="mute-2">Voltar aos dados de exemplo</span><button type="button" class="btn perigo" data-acao="recomecar">${ic('arrow-counter-clockwise')}Recomeçar</button></div>`}</div></div>
      ${a.nuvem ? a.sessao.cartaoResumo() : ''}${a.extrasConfig ? a.extrasConfig(a) : ''}${cfg.configExtra ? cfg.configExtra(a) : ''}</div>`,
  };
  app.acoes.salvarEmpresa = () => { const f = $('[data-form-empresa]'); const d = Object.fromEntries(new FormData(f)); Object.assign(app.db.cfg, d, { empresa_ok: true }); app.db.gravar(); app.empresa = d.empresa || app.empresa; $('[data-empresa]').textContent = app.empresa; avisar('Dados da empresa salvos'); };

  // ---------------- eventos (delegação)
  document.addEventListener('click', async (e) => {
    if (e.target.closest('[data-fechar-gaveta]')) return fecharGaveta();
    const aba = e.target.closest('.gaveta [data-aba]');
    if (aba) { const g = aba.closest('.gaveta'); g.dataset.aba = aba.dataset.aba; app.abrir(g.dataset.tipo, g.dataset.id, aba.dataset.aba); return; }
    const t = e.target.closest('[data-acao],[data-abrir],[data-tab-ord],[data-tab-visao],[data-tab-pag],[data-tab-csv],[data-tab-limpar],[data-tab-massa],[data-tab-desmarcar],[data-tab-linha],[data-evento]');
    if (!t) { if (!e.target.closest('.lat') && !e.target.closest('.btn-menu')) $('#app')?.classList.remove('menu-aberto'); return; }
    if (t.matches('[data-tab-sel],[data-tab-todos]') || e.target.matches('input[type=checkbox]')) return;
    if (t.dataset.acao) { e.preventDefault(); const f = app.acoes[t.dataset.acao]; if (f) { const r = await f(t.dataset, t, e); if (r === 'render') app.render(); } return; }
    if (t.dataset.abrir) { e.preventDefault(); const [tipo, id, ab] = t.dataset.abrir.split(':'); app.abrir(tipo, id, ab); return; }
    if (t.dataset.evento) { const g = t.closest('[data-cal]'); if (t._arrastou) { t._arrastou = false; return; } app.cals[g?.dataset.cal]?.aoClicar?.(t.dataset.evento); return; }
    const [tid, arg] = (t.dataset.tabOrd || t.dataset.tabVisao || t.dataset.tabPag || t.dataset.tabCsv || t.dataset.tabLimpar || t.dataset.tabMassa || t.dataset.tabDesmarcar || t.dataset.tabLinha || '').split(':');
    const st = app.estado[`tab:${tid}`];
    if (t.dataset.tabLinha) { if (e.target.closest('button,a,input,select')) return; const cfgT = app.tabelas?.[tid]; if (cfgT?.aoClicar) cfgT.aoClicar(arg, app); return; }
    if (!st) return;
    if (t.dataset.tabOrd) { st.desc = st.ordem === arg ? !st.desc : false; st.ordem = arg; }
    if (t.dataset.tabVisao) { st.visao = arg; st.pagina = 0; st.sel = []; }
    if (t.dataset.tabPag) st.pagina += Number(arg);
    if (t.dataset.tabLimpar) { st.busca = ''; st.filtros = {}; }
    if (t.dataset.tabDesmarcar) st.sel = [];
    if (t.dataset.tabCsv) {
      const cfgT = app.tabelas?.[tid]; const itens = app.estado[`tab:${tid}:itens`] || [];
      const cols = cfgT.colunas.filter((c) => c.csv !== false);
      const cel = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const linhas = [cols.map((c) => cel(c.rot)).join(';'), ...itens.map((x) => cols.map((c) => cel(c.csv ? c.csv(x, app) : c.valor ? c.valor(x, app) : x[c.k])).join(';'))];
      baixar(`${cfg.id}-${tid}.csv`, `﻿${linhas.join('\n')}`); avisar(`Planilha com ${itens.length} linhas baixada`); return;
    }
    if (t.dataset.tabMassa) { const m = app.tabelas?.[tid]?.massa?.[Number(arg)]; if (m) { const ids = [...st.sel]; const r = await m.acao(ids, app); if (r !== false) st.sel = []; } }
    app.render();
  });
  document.addEventListener('submit', (e) => e.preventDefault());
  document.addEventListener('change', (e) => {
    const f = e.target.closest('[data-tab-filtro]');
    if (f) { const [tid, k] = f.dataset.tabFiltro.split(':'); const st = app.estado[`tab:${tid}`]; st.filtros[k] = f.value; st.pagina = 0; app.render(); return; }
    const s = e.target.closest('[data-tab-sel]');
    if (s) { const [tid, id] = s.dataset.tabSel.split(':'); const st = app.estado[`tab:${tid}`]; st.sel = s.checked ? [...new Set([...st.sel, id])] : st.sel.filter((x) => x !== id); app.render(); return; }
    const td = e.target.closest('[data-tab-todos]');
    if (td) { const tid = td.dataset.tabTodos; const st = app.estado[`tab:${tid}`]; const ids = [...document.querySelectorAll(`[data-tabela="${tid}"] [data-tab-sel]`)].map((x) => x.dataset.tabSel.split(':')[1]); st.sel = td.checked ? [...new Set([...st.sel, ...ids])] : st.sel.filter((x) => !ids.includes(x)); app.render(); return; }
    const m = e.target.closest('[data-mudar]');
    if (m && app.acoes[m.dataset.mudar]) app.acoes[m.dataset.mudar](m.dataset, m, e);
  });
  let tBusca;
  document.addEventListener('input', (e) => {
    const b = e.target.closest('[data-tab-busca]');
    if (!b) return;
    clearTimeout(tBusca);
    tBusca = setTimeout(() => { const tid = b.dataset.tabBusca; const st = app.estado[`tab:${tid}`]; st.busca = b.value; st.pagina = 0; const pos = b.selectionStart; app.render(); const nb = document.querySelector(`[data-tab-busca="${tid}"]`); nb?.focus(); nb?.setSelectionRange(pos, pos); }, 120);
  });

  // arrastar no funil
  let arrastando = null;
  document.addEventListener('dragstart', (e) => { const f = e.target.closest?.('[data-ficha]'); if (!f) return; arrastando = f.dataset.ficha; f.classList.add('arrastando'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', arrastando); } catch { /* ok */ } });
  document.addEventListener('dragend', (e) => { e.target.closest?.('[data-ficha]')?.classList.remove('arrastando'); document.querySelectorAll('.coluna.alvo').forEach((c) => c.classList.remove('alvo')); });
  document.addEventListener('dragover', (e) => { const c = e.target.closest?.('[data-coluna]'); if (c && arrastando) { e.preventDefault(); document.querySelectorAll('.coluna.alvo').forEach((x) => x !== c && x.classList.remove('alvo')); c.classList.add('alvo'); } });
  document.addEventListener('drop', (e) => {
    const c = e.target.closest?.('[data-coluna]'); if (!c || !arrastando) return;
    e.preventDefault();
    const k = c.closest('[data-kanban]').dataset.kanban, id = arrastando; arrastando = null;
    app.kanbans[k]?.(id, c.dataset.coluna); app.render();
  });
  document.addEventListener('click', (e) => { const f = e.target.closest('.ficha[data-ficha]'); if (!f || e.target.closest('button,a')) return; const k = f.closest('[data-kanban]')?.dataset.kanban; app.kanbans[`${k}:abrir`]?.(f.dataset.ficha); });

  // arrastar no calendário (mover evento, com encaixe de 15 min)
  document.addEventListener('pointerdown', (e) => {
    const ev = e.target.closest('[data-evento]'); const grade = ev?.closest('[data-cal]');
    if (!ev || !grade || e.button !== 0) return;
    const cal = app.cals[grade.dataset.cal]; if (!cal?.aoMover) return;
    const hh = Number(grade.dataset.hh), ini = Number(grade.dataset.inicio) * 60, col0 = ev.parentElement;
    const y0 = e.clientY, top0 = parseFloat(ev.style.top), x0 = e.clientX; let mov = false, colAlvo = col0, novoTop = top0;
    const move = (m) => {
      if (!mov && Math.hypot(m.clientX - x0, m.clientY - y0) < 6) return;
      if (!mov) { mov = true; ev.classList.add('arrastando'); }
      novoTop = Math.max(0, Math.round((top0 + m.clientY - y0) / (hh / 4)) * (hh / 4));
      ev.style.top = `${novoTop}px`;
      const sob = document.elementsFromPoint(m.clientX, m.clientY).find((x) => x.matches?.('[data-cal-col]'));
      if (sob && sob !== ev.parentElement) { sob.appendChild(ev); colAlvo = sob; }
    };
    const fim = () => {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', fim);
      if (!mov) return;
      ev._arrastou = true; ev.classList.remove('arrastando');
      const minIni = ini + Math.round(((novoTop - 1) / hh) * 60 / 15) * 15;
      cal.aoMover(ev.dataset.evento, colAlvo.dataset.calCol, hhmm(Math.max(ini, minIni)));
    };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', fim);
  });
  document.addEventListener('dblclick', (e) => {
    const col = e.target.closest('[data-cal-col]'); if (!col || e.target.closest('[data-evento]')) return;
    const grade = col.closest('[data-cal]'); const cal = app.cals[grade.dataset.cal]; if (!cal?.aoClicarVazio) return;
    const r = col.getBoundingClientRect(), hh = Number(grade.dataset.hh), ini = Number(grade.dataset.inicio) * 60;
    cal.aoClicarVazio(col.dataset.calCol, hhmm(ini + Math.floor(((e.clientY - r.top) / hh) * 60 / 15) * 15));
  });

  // atalhos de teclado
  let g = false, tg;
  document.addEventListener('keydown', (e) => {
    const digitando = e.target.closest('input,textarea,select,[contenteditable]');
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); paleta(); return; }
    if (e.key === 'Escape' && document.querySelector('.gaveta.on') && !document.querySelector('.fundo-modal')) { fecharGaveta(); return; }
    if (digitando || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.fundo-modal')) return;
    if (e.key === '/') { const b = document.querySelector('[data-tab-busca]'); if (b) { e.preventDefault(); b.focus(); } return; }
    if (e.key === '?') { app.acoes.atalhos(); return; }
    if (g) { g = false; const p = paginas.find((x) => x.atalho === e.key.toLowerCase()); if (p) { e.preventDefault(); app.ir(`#/${p.id}`); } return; }
    if (e.key.toLowerCase() === 'g') { g = true; clearTimeout(tg); tg = setTimeout(() => (g = false), 900); return; }
    if (e.key.toLowerCase() === 'n' && app.pagina?.novo) { e.preventDefault(); app.pagina.novo(app); }
  });

  app.tabelas = {};
  app.tab = (c) => { app.tabelas[c.id] = c; return tabela(app, c); };
  if (!location.hash) history.replaceState(null, '', `#/${paginas[0].id}`);
  queueMicrotask(() => app.render());
  return app;
}
