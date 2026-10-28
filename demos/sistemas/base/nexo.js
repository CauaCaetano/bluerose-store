// =============================================================
// Veltria · núcleo comum (v2)
// -------------------------------------------------------------
// Tudo roda no navegador: os dados ficam no localStorage deste aparelho,
// com dados de exemplo e um botão "Recomeçar". Cada sistema descreve
// páginas, coleções, fichas (painel lateral) e ações; o núcleo monta a
// estrutura (menu, topo, busca Ctrl+K, atalhos, tema), tabelas com visões,
// filtros e ações em massa, gráficos em SVG, funil arrastável, calendário
// com grade de horários, linha do tempo, formulários e impressão.
// =============================================================

import { ligarCalcs } from './lado.js';
import { resumoDoDia, resumoTexto } from './resumos.js';
import { prepararExtras } from './extras.js';
import { cargosDe, resumoAcesso, editarPermissoes } from './equipe.js';
import { paginaImportar } from './planilha.js';
import { prepararSuporte } from './suporte.js';
import { prepararAdicionar } from './adicionar.js';
import { baixarXlsx } from './xlsx.js';
// Assistente IA: liberado em 17/10 (sem a chave do Gemini, a função nexo-ia responde que está sendo ativado)
const IA_LIBERADA = true;

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
const CORES_AV = ['#4f46e5', '#0369a1', '#0f766e', '#15803d', '#b45309', '#be123c', '#7e22ce', '#475569', '#0e7490', '#c2410c', '#4338ca', '#be185d'];
// cor vinda de dado (profissional, etapa…) só entra no estilo se for uma cor de verdade: evita injeção de HTML/CSS
const COR_OK = /^(#[0-9a-f]{3,8}|var\(--[a-z0-9-]+\)|(rgb|hsl)a?\([0-9\s.,%/]+\)|[a-z]{3,20})$/i;
export const corSegura = (v, padrao = 'var(--acc)') => (typeof v === 'string' && COR_OK.test(v.trim()) ? v.trim() : padrao);
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
  // versao: quando os dados de exemplo de um sistema mudam muito, sobe o número e a demonstração recomeça uma vez
  constructor(chave, semente, inicial = null, versao = 1) {
    this.chave = chave; this.semente = semente; this.versao = versao;
    if (inicial) { this.dados = inicial; return; }
    try { this.dados = JSON.parse(localStorage.getItem(chave) || 'null'); } catch { this.dados = null; }
    if (!this.dados || !this.dados._ok || (this.dados._v || 1) !== versao) this.recomecar();
  }
  recomecar() {
    const s = this.semente();
    this.dados = { _ok: 1, _v: this.versao || 1, _cfg: { ...(s._cfg || {}) }, _log: [] };
    for (const [nome, lista] of Object.entries(s)) if (nome !== '_cfg') this.dados[nome] = lista.map((x) => ({ id: novoId(), ...x }));
    this.gravar();
  }
  gravar() { try { localStorage.setItem(this.chave, JSON.stringify(this.dados)); } catch { /* modo privado: fica só em memória */ } }
  get cfg() { return this.dados._cfg; }
  lista(nome) { return this.dados[nome] || (this.dados[nome] = []); }
  obter(nome, id) { return id ? this.lista(nome).find((x) => x.id === id) || null : null; }
  salvar(nome, obj) {
    if (obj && typeof obj.cor === 'string' && !COR_OK.test(obj.cor.trim())) { obj = { ...obj }; delete obj.cor; }
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
      if ([...document.querySelectorAll('.fundo-modal')].pop() !== f) return; // janela sobre janela: só a de cima responde
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
const DIAS_CAMPO = [[1, 'Seg'], [2, 'Ter'], [3, 'Qua'], [4, 'Qui'], [5, 'Sex'], [6, 'Sáb'], [0, 'Dom']];
export function campoHTML(c, v, app) {
  const id = `f-${c.nome}`, req = c.obrigatorio ? 'required' : '';
  const val = v ?? (typeof c.padrao === 'function' ? c.padrao(app) : c.padrao) ?? '';
  // dias da semana: um botão por dia (guarda os números de 0 = domingo a 6 = sábado)
  if (c.tipo === 'dias') { const marc = Array.isArray(val) ? val.map(Number) : [];
    return `<div class="campo largo" role="group" aria-label="${esc(c.rotulo)}">${esc(c.rotulo)}<div class="dias-sel">${DIAS_CAMPO.map(([n, r]) => `<label><input type="checkbox" name="${c.nome}" value="${n}" ${marc.includes(n) ? 'checked' : ''}><span>${r}</span></label>`).join('')}</div>${c.ajuda ? `<span class="ajuda">${esc(c.ajuda)}</span>` : ''}</div>`; }
  let ctl;
  // escolha livre: a lista continua igual (com o valor que já vem preenchido); a última opção, "Escrever outro…",
  // abre um campo para a pessoa digitar o que quiser. Campos que mandam em regras (situação, etapa, pessoas) usam fixo e não têm essa opção.
  const livre = c.tipo === 'selecao' && !c.fixo && (c.livre || (Array.isArray(c.opcoes) && c.opcoes.every((x) => typeof x === 'string')));
  if (livre) {
    const ops = opcoesDe(c, app), achada = ops.some(([k]) => String(k) === String(val)), outro = val !== '' && val != null && !achada;
    ctl = `<select id="${id}" data-livre-sel ${req}>${(c.obrigatorio && val) ? '' : '<option value="">Selecione…</option>'}${ops.map(([k, r]) => `<option value="${esc(k)}" ${!outro && String(k) === String(val) ? 'selected' : ''}>${esc(r)}</option>`).join('')}<option value="__outro" ${outro ? 'selected' : ''}>✎ Escrever outro…</option></select>
      <input type="text" name="${c.nome}" data-livre-txt value="${esc(val)}" ${outro ? (c.obrigatorio ? 'required' : '') : 'hidden'} data-obrig="${c.obrigatorio ? 1 : ''}" placeholder="Escreva aqui" style="margin-top:6px" autocomplete="off">`;
  } else if (c.tipo === 'selecao' || c.tipo === 'relacao') ctl = `<select id="${id}" name="${c.nome}" ${req}>${c.obrigatorio && val ? '' : '<option value="">Selecione…</option>'}${opcoesDe(c, app).map(([k, r]) => `<option value="${esc(k)}" ${String(k) === String(val) ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>`;
  else if (c.tipo === 'texto-longo') ctl = `<textarea id="${id}" name="${c.nome}" ${req} placeholder="${esc(c.dica || '')}">${esc(val)}</textarea>`;
  else if (c.tipo === 'booleano') ctl = `<label class="flex" style="height:32px;font-weight:400;color:var(--tx)"><input type="checkbox" id="${id}" name="${c.nome}" ${val ? 'checked' : ''}> ${esc(c.texto || 'Sim')}</label>`;
  else if (c.tipo === 'moeda') ctl = `<div class="prefixo"><span>R$</span><input id="${id}" name="${c.nome}" type="number" step="0.01" min="${c.min ?? 0}" inputmode="decimal" value="${esc(val)}" ${req}></div>`;
  else {
    const t = { numero: 'number', data: 'date', datahora: 'datetime-local', email: 'email', tel: 'tel', hora: 'time', porcentagem: 'number' }[c.tipo] || 'text';
    const extra = c.tipo === 'numero' || c.tipo === 'porcentagem' ? `step="${c.passo || 'any'}" ${c.min != null ? `min="${c.min}"` : ''} inputmode="decimal"` : '';
    ctl = `<input id="${id}" name="${c.nome}" type="${t}" ${extra} value="${esc(c.tipo === 'datahora' ? String(val).slice(0, 16) : val)}" ${req} placeholder="${esc(c.dica || '')}" ${c.max ? `maxlength="${c.max}"` : ''}>`;
  }
  // empresa nova: a lista de onde escolher ainda está vazia; em vez de travar o formulário, deixa cadastrar ali mesmo
  const alvo = c.tipo === 'relacao' && app?.colecoes?.[c.colecao];
  const semOpcao = alvo && !opcoesDe(c, app).length
    ? `<span class="ajuda" data-sem-opcao>${alvo.genero === 'f' ? 'Nenhuma' : 'Nenhum'} ${esc(alvo.singular)} ${alvo.genero === 'f' ? 'cadastrada' : 'cadastrado'} ainda. <button type="button" class="btn peq" data-novo-rel="${esc(c.colecao)}" data-campo="${esc(c.nome)}">${ic('plus')}Cadastrar agora</button></span>` : '';
  return `<label class="campo ${c.largo || c.tipo === 'texto-longo' ? 'largo' : ''}" for="${id}">${esc(c.rotulo)}${c.obrigatorio ? ' <span class="er-tx">*</span>' : ''}${ctl}${c.ajuda ? `<span class="ajuda">${esc(c.ajuda)}</span>` : ''}${semOpcao}</label>`;
}
// lista com "Escrever outro…": a escolha vai para o campo de texto (que é o que fica salvo)
document.addEventListener('change', (e) => {
  const sel = e.target.closest?.('[data-livre-sel]'); if (!sel) return;
  const txt = sel.parentElement.querySelector('[data-livre-txt]'); if (!txt) return;
  const outro = sel.value === '__outro';
  txt.hidden = !outro; txt.required = outro && !!txt.dataset.obrig;
  if (outro) { txt.value = ''; txt.focus(); } else txt.value = sel.value;
});
// CNPJ (14 dígitos) ou CEP digitado: preenche pela BrasilAPI (dados públicos, grátis) só os campos que ainda estão vazios.
// CPF nunca sai daqui. Sem internet ou sem resposta, não faz nada.
const BRASILAPI = 'https://brasilapi.com.br/api';
const capitular = (t) => String(t || '').toLowerCase().replace(/(^|[\s/(-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/(?<=\s)(De|Da|Do|Das|Dos|E)(?=\s)/g, (x) => x.toLowerCase()).replace(/(?<=[\s,])(Ii|Iii|Iv|Vi|Vii|Viii|Ix|Xi|Xii)(?=[\s,]|$)/g, (x) => x.toUpperCase());
document.addEventListener('change', async (e) => {
  const el = e.target, form = el.closest?.('form, .modal, .gaveta'); if (!form || el.tagName !== 'INPUT') return;
  const nome = el.name || '', dig = String(el.value || '').replace(/\D/g, '');
  const pegar = (...ns) => ns.map((n) => form.querySelector(`[name="${n}"]`)).find(Boolean);
  const pôr = (campo, v) => { if (campo && v && !String(campo.value || '').trim()) { campo.value = String(v).trim(); campo.dispatchEvent(new Event('input', { bubbles: true })); } };
  try {
    if (/^(doc|documento|cnpj|cpf_cnpj)$/.test(nome) && dig.length === 14) {
      const r = await fetch(`${BRASILAPI}/cnpj/v1/${dig}`); if (!r.ok) return;
      const j = await r.json();
      const fone = String(j.ddd_telefone_1 || '').replace(/\D/g, '');
      pôr(pegar('nome', 'empresa', 'razao'), capitular((j.nome_fantasia || '').trim() || j.razao_social));
      pôr(pegar('endereco'), capitular([j.descricao_tipo_de_logradouro, j.logradouro].filter(Boolean).join(' ')) + (j.numero ? `, ${j.numero}` : '') + (j.complemento ? ` ${capitular(j.complemento)}` : ''));
      pôr(pegar('bairro'), capitular(j.bairro)); pôr(pegar('cep'), j.cep); pôr(pegar('uf'), j.uf);
      const cid = pegar('cidade'); pôr(cid, cid && /uf/i.test(cid.closest('label')?.textContent || '') ? `${capitular(j.municipio)}/${j.uf}` : capitular(j.municipio));
      if (fone.length >= 10) pôr(pegar('telefone', 'whatsapp', 'celular'), `(${fone.slice(0, 2)}) ${fone.slice(2, -4)}-${fone.slice(-4)}`);
      pôr(pegar('email'), String(j.email || '').toLowerCase());
      avisar(`Dados da empresa preenchidos pelo CNPJ (situação ${String(j.descricao_situacao_cadastral || 'na Receita').toLowerCase()}). Confira antes de salvar.`);
    } else if (nome === 'cep' && dig.length === 8) {
      const r = await fetch(`${BRASILAPI}/cep/v1/${dig}`); if (!r.ok) return;
      const j = await r.json();
      pôr(pegar('endereco'), j.street); pôr(pegar('bairro'), j.neighborhood); pôr(pegar('uf'), j.state);
      const cid = pegar('cidade'); pôr(cid, cid && /uf/i.test(cid.closest('label')?.textContent || '') ? `${j.city}/${j.state}` : j.city);
    }
  } catch { /* sem internet: segue sem preencher */ }
});
export function lerCampos(raiz, campos) {
  const o = {};
  for (const c of campos) {
    if (c.tipo === 'dias') { const ls = [...raiz.querySelectorAll(`[name="${c.nome}"]`)]; if (ls.length) o[c.nome] = ls.filter((x) => x.checked).map((x) => Number(x.value)).sort(); continue; }
    const el = raiz.querySelector(`[name="${c.nome}"]`); if (!el) continue;
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.hasAttribute('data-livre-txt')) v = String(v).trim();
    if (['moeda', 'numero', 'porcentagem'].includes(c.tipo)) v = v === '' ? null : Number(v);
    o[c.nome] = v;
  }
  return o;
}
/** Abre o formulário de uma coleção (novo ou edição). Devolve o registro salvo ou null. */
export async function editar(app, nome, registro = null, extra = {}) {
  if (app.podeMexer && !app.podeMexer('salvar')) return null;
  const col = app.colecoes[nome];
  const campos = (typeof col.campos === 'function' ? col.campos(app) : col.campos).filter((c) => !c.oculto);
  // o que veio da planilha sem campo próprio aparece (e pode ser corrigido) na edição, em todos os sistemas
  if (registro?._planilha) campos.push({ nome: '_planilha', rotulo: 'Da planilha', tipo: 'texto-longo', largo: true, ajuda: 'Colunas importadas que não têm campo próprio no sistema.' });
  const corpo = `<form class="form-grade ${col.tres ? 'tres' : ''}" novalidate onsubmit="return false">${campos.map((c) => campoHTML(c, registro?.[c.nome] ?? extra[c.nome], app)).join('')}</form>`;
  const r = await modal({
    titulo: registro ? `Editar ${col.singular}` : `${col.genero === 'f' ? 'Nova' : 'Novo'} ${col.singular}`, corpo, largura: col.largura || 600,
    aoAbrir: (f) => f.querySelectorAll('[data-novo-rel]').forEach((b) => b.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const novo = await editar(app, b.dataset.novoRel);
      if (!novo) return;
      const c = campos.find((x) => x.nome === b.dataset.campo), sel = f.querySelector(`select[name="${b.dataset.campo}"]`);
      if (c && sel) { sel.innerHTML = opcoesDe(c, app).map(([k, rot]) => `<option value="${esc(k)}" ${k === novo.id ? 'selected' : ''}>${esc(rot)}</option>`).join(''); sel.value = novo.id; }
      b.closest('[data-sem-opcao]')?.remove();
    })),
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
  if (app.podeMexer && !app.podeMexer('apagar')) return false;
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
  ${k.spark ? sparkline(k.spark, corSegura(k.cor)) : ''}</div>`).join('')}</div>`;
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
      if (v > 0) s += `<rect class="barra" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(2, bw - (empilhado ? 0 : 3)).toFixed(1)}" height="${bh.toFixed(1)}" rx="${empilhado ? 2 : 4}" fill="${corSegura(series[j].cor)}"><title>${esc(d.rot)} · ${esc(series[j].nome)}: ${fmt(v)}</title></rect>`;
      acc += v;
    });
    s += `<text x="${(ml + i * slot + slot / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(d.rot)}</text>`;
  });
  if (linhaMeta) s += `<line x1="${ml}" x2="${L - 6}" y1="${Y(linhaMeta)}" y2="${Y(linhaMeta)}" stroke="var(--tx-3)" stroke-dasharray="4 4"/><text x="${L - 8}" y="${Y(linhaMeta) - 5}" text-anchor="end">meta ${fmt(linhaMeta)}</text>`;
  return `${s}</svg>${series.length > 1 ? legenda(series) : ''}`;
}
export const legenda = (series) => `<div class="legenda">${series.map((s) => `<span><i style="background:${corSegura(s.cor)}"></i>${esc(s.nome)}</span>`).join('')}</div>`;
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
    if (area && !se.tracejada) s += `<path d="${d}L${pts.at(-1)[0]},${Y(Math.max(mn, 0))}L${pts[0][0]},${Y(Math.max(mn, 0))}Z" fill="${corSegura(se.cor)}" opacity=".09"/>`;
    s += `<path d="${d}" fill="none" stroke="${corSegura(se.cor)}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" ${se.tracejada ? 'stroke-dasharray="5 5"' : ''}/>`;
  });
  const cada = Math.ceil(rotulos.length / 9);
  rotulos.forEach((r, i) => { if (i % cada === 0 || i === rotulos.length - 1) s += `<text x="${X(i).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(r)}</text>`; });
  return `${s}</svg>${series.length > 1 ? legenda(series) : ''}`;
}
/** Rosca (donut). itens: [{rot, v, cor}] */
export function rosca({ itens, centro = '', sub = '', fmt = num }) {
  const tot = soma(itens, (x) => x.v) || 1, R = 52, C = 2 * Math.PI * R; let off = 0;
  const arcos = itens.filter((x) => x.v > 0).map((x) => { const l = (x.v / tot) * C; const a = `<circle cx="66" cy="66" r="${R}" fill="none" stroke="${corSegura(x.cor)}" stroke-width="16" stroke-dasharray="${Math.max(0, l - 1.5)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 66 66)"><title>${esc(x.rot)}: ${fmt(x.v)}</title></circle>`; off += l; return a; }).join('');
  return `<div class="rosca"><svg viewBox="0 0 132 132" role="img"><circle cx="66" cy="66" r="${R}" fill="none" stroke="var(--neutro-bg)" stroke-width="16"/>${arcos}
    <text x="66" y="${sub ? 64 : 70}" text-anchor="middle" style="font-size:17px;font-weight:650;fill:var(--tx)">${esc(centro)}</text>${sub ? `<text x="66" y="81" text-anchor="middle" style="font-size:10.5px">${esc(sub)}</text>` : ''}</svg>
    <div class="itens">${itens.map((x) => `<div><i style="background:${corSegura(x.cor)}"></i><span class="corta">${esc(x.rot)}</span><b>${fmt(x.v)}</b><span class="mute" style="width:38px;text-align:right">${pct((x.v / tot) * 100)}</span></div>`).join('')}</div></div>`;
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
    <button type="button" class="btn fant ic-so peq" data-tab-csv="${cfg.id}" title="Baixar planilha (Excel ou CSV)" aria-label="Baixar planilha">${ic('download-simple')}</button>
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
    return `<section class="coluna" data-coluna="${esc(c.id)}" style="--c:${corSegura(c.cor, 'var(--borda-2)')}"><div class="coluna-cab"><div class="barra-cor"></div><div class="t">${esc(c.nome)}<span class="n">${l.length}</span></div>${c.sub ? `<div class="v">${c.sub(l)}</div>` : ''}</div>
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
      ${eventos.filter((e) => e.col === c.id).map((e) => { const t = Y(e.ini), h = Math.max(22, Y(e.fim) - t - 2); return `<div class="evento ${e.cls || ''}" data-evento="${e.id}" style="top:${t + 1}px;height:${h}px;--c:${corSegura(e.cor)}" title="${esc(`${e.ini}–${e.fim} · ${e.titulo}`)}"><b>${esc(e.titulo)}</b>${h > 34 ? `<span>${esc(e.ini)}–${esc(e.fim)}${e.sub ? ` · ${esc(e.sub)}` : ''}</span>` : ''}${h > 52 && e.sub2 ? `<span>${esc(e.sub2)}</span>` : ''}</div>`; }).join('')}
    </div>`).join('')}</div></div>`;
}
/** Mês: itens [{data, titulo, cor, id}] */
export function calMes({ ym, itens, aoClicar = 'abrirEvento' }) {
  const [a, m] = ym.split('-').map(Number), pri = new Date(a, m - 1, 1), ini = new Date(pri); ini.setDate(1 - pri.getDay());
  const dias = Array.from({ length: 42 }, (_, i) => { const d = new Date(ini); d.setDate(ini.getDate() + i); return iso(d); });
  return `<div class="cal-mes">${DIAS.map((d) => `<div class="dsem">${d}</div>`).join('')}${dias.map((d) => { const l = itens.filter((x) => x.data === d); return `<div class="d ${d.slice(0, 7) !== ym ? 'outro' : ''} ${d === hoje() ? 'hoje' : ''}"><span class="n">${Number(d.slice(8))}</span>${l.slice(0, 4).map((x) => `<div class="pill" style="--c:${corSegura(x.cor)}" data-acao="${aoClicar}" data-id="${x.id}" title="${esc(x.titulo)}">${esc(x.titulo)}</div>`).join('')}${l.length > 4 ? `<span class="mute" style="font-size:11px">+${l.length - 4}</span>` : ''}</div>`; }).join('')}</div>`;
}

// ---------------------------------------------------------------- impressão
export function imprimir(html) {
  let area = document.getElementById('area-impressao');
  if (!area) { area = document.createElement('div'); area.id = 'area-impressao'; document.body.appendChild(area); const st = document.createElement('style'); st.textContent = '#area-impressao{display:none}@media print{body>*:not(#area-impressao){display:none!important}#area-impressao{display:block}}'; document.head.appendChild(st); }
  const logo = imprimir.logo?.();
  if (logo) html = html.replace('<div class="doc">', `<div class="doc"><img src="${esc(logo)}" alt="" style="height:52px;max-width:200px;object-fit:contain;display:block;margin-bottom:10px">`);
  // selo nos impressos do Básico: o documento vai para o cliente do nosso cliente e mostra de onde veio (o Pro sai sem)
  if (!imprimir.semRodape?.()) html += `<div style="margin-top:26px;padding-top:9px;border-top:1px solid #d9dee8;font:11px/1.4 system-ui,sans-serif;color:#6b7590;text-align:center">Documento gerado no ${esc(imprimir.produto || 'sistema')} da Blue Rose · organize o seu negócio também: <b>bluerose-store.com</b> · teste 7 dias grátis</div>`;
  area.innerHTML = html; setTimeout(() => window.print(), 60);
}

// ---------------------------------------------------------------- aplicativo
export function criarApp(cfg) {
  imprimir.produto = cfg.nome;
  const raiz = document.documentElement;
  raiz.style.setProperty('--sis', cfg.cor); // a cor de destaque é o azul da Blue Rose (nexo.css); a do sistema fica como apoio
  try { raiz.dataset.tema = localStorage.getItem('nexo-tema') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'); } catch { raiz.dataset.tema = 'claro'; }
  const nuvem = !!window.NEXO_NUVEM;
  document.documentElement.dataset.produto = cfg.id;
  document.title = nuvem ? `${cfg.nome} · Blue Rose Express` : `${cfg.nome} · demonstração · Blue Rose Express`;
  const app = { ...cfg, estado: {}, acoes: {}, db: null, kanbans: {}, cals: {}, nuvem };
  if (nuvem) {
    // versão na nuvem: entrar, escolher a empresa e carregar os dados antes de montar a tela
    import('./nuvem.js').then((m) => m.iniciarNuvem(app, cfg)).then((sessao) => { app.sessao = sessao; app.db = sessao.db; if (app.db.cfg.empresa) app.empresa = app.db.cfg.empresa; montar(app, cfg); sessao.depoisDeMontar?.(); })
      .catch((e) => { document.body.innerHTML = `<div style="padding:40px;font-family:system-ui">Não foi possível abrir o sistema: ${esc(e.message || e)}. <a href="">Tentar de novo</a></div>`; });
    return app;
  }
  app.db = new Banco(`nexo2-${cfg.id}`, cfg.semente, null, cfg.versaoDemo || 1);
  if (app.db.cfg.empresa) app.empresa = app.db.cfg.empresa;
  montar(app, cfg);
  return app;
}

function montar(app, cfg) {
  const raiz = document.documentElement;
  raiz.dataset.produto = cfg.id;
  // permissões da pessoa (versão na nuvem): 'editar' | 'ver' | 'nenhum' por área; o dono tem tudo
  app.acesso = (id) => app.sessao?.acesso?.(id) || 'editar';
  app.podeMexer = (tipo) => {
    if (app._sistema) return true;
    const ac = app.acesso(app.pagina?.id || '');
    if (ac === 'editar' && (tipo !== 'apagar' || !app.sessao?.podeExcluir || app.sessao.podeExcluir())) return true;
    avisar(ac === 'editar' ? 'Você não tem permissão para apagar registros. Fale com o dono da empresa.' : 'Você tem acesso só para ver esta área. Fale com o dono da empresa para poder editar.', { tipo: 'erro', tempo: 5000 });
    return false;
  };
  if (app.sessao?.acesso) {
    const db = app.db, salvar = db.salvar.bind(db), apagar = db.apagar.bind(db);
    db.salvar = (nome, obj) => (app.podeMexer('salvar') ? salvar(nome, obj) : (setTimeout(() => app.render(), 0), { ...obj }));
    db.apagar = (nome, id) => (app.podeMexer('apagar') ? apagar(nome, id) : (setTimeout(() => app.render(), 0), null));
  }
  const site = 'https://bluerose-store.com/';
  const paginas = cfg.paginas.filter((p) => p.id);
  const preco = (v) => moeda(v).replace(',00', '');
  prepararExtras(app, cfg);
  prepararSuporte(app, cfg);
  if (app.db.cfg.ramo_pendente && !app.db.cfg.ramo) { app.aplicarModelo(app.db.cfg.ramo_pendente, true); delete app.db.cfg.ramo_pendente; app.db.gravar(); }
  const voltar = cfg.paginaSite ? `<a class="faixa-voltar" href="${site}${cfg.paginaSite}" target="_top">${ic('arrow-left')}<span>Voltar<span class="so-larga"> ao site</span></span></a><span class="sep so-larga"></span>` : '';
  const faixaDemo = `<div class="faixa nao-imprime">${voltar}<span class="so-larga">Demonstração do <b>${esc(cfg.nome)}</b> · dados de exemplo, só neste navegador</span><span class="sep so-larga"></span>
      <button type="button" data-acao="recomecar">Recomeçar</button>
      ${cfg.cta === false ? '' : `<a class="cta" href="${site}app/${cfg.id}/" target="_top">Testar grátis<span class="so-larga">&nbsp;7 dias com os seus dados</span></a>`}</div>`;
  document.body.innerHTML = `
    ${app.nuvem ? app.sessao.faixa() : faixaDemo}
    <div class="app" id="app">
      <nav class="lat" aria-label="Menu principal">
        <div class="marca"><img class="marca-logo" src="${cfg.logo || new URL('veltria.png?v=1', import.meta.url).href}" alt="${cfg.logo ? esc(cfg.nome) : 'Blue Rose'}" width="30" height="30"><div><b>${esc(cfg.nome)}</b><small>${esc(cfg.marcaSub || `Blue Rose · ${cfg.sub}`)}</small></div></div>
        <div class="conta">${av(app.empresa)}<div class="cresce"><b class="corta" data-empresa>${esc(app.empresa)}</b><small class="corta">${esc(app.nuvem ? app.sessao.subConta() : cfg.conta || 'Conta de demonstração')}</small></div></div>
        <button type="button" class="busca-lat" data-acao="paleta">${ic('magnifying-glass')}Buscar ou ir para…<kbd>Ctrl K</kbd></button>
        ${cfg.paginas.filter((p) => !p.id || app.acesso(p.id) !== 'nenhum').map((p) => (p.grupo && !p.id ? `<div class="grupo">${esc(p.grupo)}</div>` : `<a class="item" href="#/${p.id}" data-pag="${p.id}">${ic(p.icone || 'circle')}<span class="corta">${esc(p.rot)}</span><span class="cont" data-cont="${p.id}" hidden></span></a>`)).join('')}
        <div class="lat-pe">
          <a class="item" href="#" data-acao="resumoDia">${ic('notepad')}Resumo do dia</a>
          <a class="item" href="#" data-acao="assistenteIA">${ic('sparkle')}Assistente IA <span class="et ok sem-ponto" style="margin-left:auto;font-size:10px">grátis</span></a>
          <a class="item" href="#/suporte" data-pag="suporte">${ic('lifebuoy')}Suporte</a>
          <a class="item" href="#" data-acao="feedback">${ic('chat-circle-text')}Enviar feedback</a>
          ${!app.nuvem || app.sessao.gestor ? `<a class="item item-dono" href="#/dono" data-pag="dono">${ic('crown')}Painel do dono</a><a class="item" href="#/importar" data-pag="importar">${ic('table')}Importar planilha</a>` : ''}
          ${app.nuvem ? `<a class="item" href="javascript:void 0" data-pwa-instalar hidden>${ic('download-simple')}Instalar o app</a>` : ''}
          <a class="item" href="#/config" data-pag="config">${ic('gear-six')}Configurações</a>
          <a class="item" href="javascript:void 0" data-acao="tema">${ic('moon')}<span data-tema-rot>Tema escuro</span></a>
          <a class="item" href="javascript:void 0" data-acao="atalhos">${ic('keyboard')}Atalhos</a>
          ${app.nuvem ? `<a class="item" href="javascript:void 0" data-acao="sair">${ic('sign-out')}Sair</a>` : ''}
          <a class="feito-br" href="${site}" target="_blank" rel="noopener" title="Blue Rose Express"><img src="${new URL('blue-rose.png', import.meta.url).href}" alt="" width="20" height="20"><span>Feito pela <b>Blue Rose</b></span></a>
        </div>
      </nav>
      <main class="principal"><header class="topo"><button type="button" class="btn fant ic-so btn-menu" data-acao="menu" aria-label="Abrir menu">${ic('list')}</button><img class="topo-logo" src="${cfg.logo || new URL('veltria.png?v=1', import.meta.url).href}" alt="${esc(cfg.nome)}" width="26" height="26"><div class="trilha" id="trilha"></div><div class="acoes" id="acoes-topo"></div></header>
        <div class="conteudo" id="conteudo"></div></main>
    </div>`;
  const $ = (s) => document.querySelector(s);
  const atualizaTemaRot = () => { const e = raiz.dataset.tema === 'escuro'; const a = $('[data-acao="tema"]'); a.innerHTML = `${ic(e ? 'sun' : 'moon')}<span>${e ? 'Tema claro' : 'Tema escuro'}</span>`; };
  atualizaTemaRot();

  const rota = () => { const h = location.hash.replace(/^#\/?/, '').split('?')[0]; const [id, ...params] = h.split('/'); return { id: id || paginas[0].id, params: params.map(decodeURIComponent) }; };
  app.ir = (h) => { if (location.hash === h) app.render(); else location.hash = h; };
  app.render = () => {
    app.antesDeRender?.();
    const { id, params } = rota();
    const p = id === 'config' ? paginaConfig : id === 'suporte' ? app.paginaSuporte : id === 'dono' ? paginaDono : id === 'importar' ? paginaPlanilha : paginas.find((x) => x.id === id) || paginas[0];
    if (app.acesso(p.id) === 'nenhum') { const ok = paginas.find((x) => app.acesso(x.id) !== 'nenhum'); if (ok && ok !== p) { location.hash = `#/${ok.id}`; return; } }
    app.pagina = p; app.params = params; raiz.dataset.soVer = app.acesso(p.id) === 'ver' ? '1' : '';
    document.querySelectorAll('.lat a.item[data-pag]').forEach((a) => a.classList.toggle('ativo', a.dataset.pag === p.id));
    const titulo = typeof p.titulo === 'function' ? p.titulo(app, params) : p.titulo || p.rot;
    $('#trilha').innerHTML = (p.trilha ? p.trilha(app, params) : '') + `<h1>${esc(titulo)}</h1>`;
    $('#acoes-topo').innerHTML = p.acoes ? p.acoes(app, params) : '';
    const c = $('#conteudo'); c.className = `conteudo ${p.cheio ? 'cheio' : ''}`;
    const rolagem = scrollY;
    // aviso para o dono ligar o backup semanal: aparece na primeira aba até ele ligar ou adiar
    const corpo = (app.nuvem && p.id === paginas[0]?.id && app.sessao.avisoBackup ? app.sessao.avisoBackup() : '') + p.render(app, params);
    // painel lateral da aba (opcional): ferramentas e atalhos daquela área; no celular fica recolhido em cima
    if (p.lado) {
      const aberto = app.estado.ladoFechado ? false : innerWidth >= 1100;
      c.innerHTML = `<div class="com-lado"><div class="com-lado-princ">${corpo}</div><details class="lado nao-imprime" ${aberto ? 'open' : ''}><summary>${ic('sidebar-simple')}<span>Ferramentas desta aba</span>${ic('caret-down', 'seta')}</summary><div class="lado-corpo">${app.travarLado ? app.travarLado(app, p.lado(app, params)) : p.lado(app, params)}</div></details></div>`;
      c.querySelector('details.lado').addEventListener('toggle', (e) => { if (innerWidth >= 1100) app.estado.ladoFechado = !e.target.open; });
    } else c.innerHTML = corpo;
    if (p.id === paginas[0].id && app.passosHTML && app.acesso(p.id) === 'editar') c.insertAdjacentHTML('afterbegin', app.passosHTML());
    if (raiz.dataset.soVer) c.insertAdjacentHTML('afterbegin', `<div class="dica">${ic('eye')}<span>Você pode <b>ver</b> esta área, mas não editar. Para mudar isso, fale com o dono da empresa.</span></div>`);
    p.montar?.(app, c, params);
    if (p.lado) ligarCalcs(c);
    if (app._mesmaPagina === `${p.id}/${params.join('/')}`) scrollTo(0, rolagem); else scrollTo(0, 0);
    app._mesmaPagina = `${p.id}/${params.join('/')}`;
    for (const m of paginas) { const el = document.querySelector(`[data-cont="${m.id}"]`); const r = m.cont?.(app); if (el) { const n = typeof r === 'object' ? r?.n : r; el.hidden = !n; el.textContent = n || ''; el.className = `cont ${r?.tom || ''}`; } }
    $('#app').classList.remove('menu-aberto');
  };
  window.addEventListener('hashchange', () => { fecharGaveta(); app.render(); });
  // botão "Adicionar" (manual, planilha, texto colado e foto) no topo de todas as páginas
  prepararAdicionar(app, cfg);

  // fichas (painel lateral)
  app.abrir = (tipo, id, aba) => {
    const f = cfg.fichas?.[tipo]; if (!f) return;
    const r = f(app, id, aba); if (!r) return;
    gaveta(r.html, { estreita: r.estreita, aoMontar: (g) => { g.dataset.tipo = tipo; g.dataset.id = id; r.montar?.(g); notaDaPlanilha(g, id); } });
  };
  // colunas da planilha que não tinham campo próprio ficam guardadas no registro e aparecem aqui, na ficha
  const notaDaPlanilha = (g, id) => {
    const reg = Object.keys(app.colecoes || {}).map((c) => app.db.obter(c, id)).find(Boolean);
    if (!reg?._planilha || g.querySelector('[data-da-planilha]')) return;
    g.querySelector('.gav-corpo')?.insertAdjacentHTML('beforeend', `<div class="cartao" data-da-planilha style="margin-top:14px"><div class="cartao-cab"><div><h3>Da planilha</h3><div class="sub">Colunas importadas que não têm campo próprio no sistema</div></div></div><div class="cartao-corpo" style="white-space:pre-line">${esc(reg._planilha)}</div></div>`);
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
    // assistente com IA grátis: manda só os números do resumo (sem nomes nem telefones) e a pergunta
    assistenteIA: async (d = {}) => {
      // a IA ainda não foi liberada pelo dono: mostra só o aviso de em breve
      if (!IA_LIBERADA) { modal({ titulo: 'Assistente IA · em breve', largura: 460, corpo: '<p class="mute-2">Em breve você vai poder perguntar ao assistente o que priorizar no dia, como está o mês e pedir mensagens prontas, grátis e dentro do sistema.</p>', botoes: [{ rotulo: 'Entendi', valor: null, classe: 'pri' }] }); return; }
      const r = resumoDoDia(cfg.id, app.db.dados, hoje());
      const contagens = Object.fromEntries(Object.entries(app.db.dados).filter(([k, v]) => Array.isArray(v) && !k.startsWith('_')).map(([k, v]) => [k, v.length]));
      const contexto = { destaques: r?.destaques || [], alertas: r?.alertas || [], contagens };
      const sugestoes = ['O que eu devo priorizar hoje?', 'Como está o meu mês?', 'Escreva uma mensagem de cobrança educada', 'Como eu consigo mais clientes?', `Como funciona o ${cfg.nome}?`];
      const desenhar = (resp = '', carregando = false) => `<div class="col" style="gap:10px">
        <div class="ia-cab"><img class="ia-logo" src="${new URL('blue-rose.png', import.meta.url).href}" alt="Blue Rose" width="76" height="76"><div class="col" style="gap:10px;flex:1;min-width:0">
        <p class="mute-2" style="font-size:12.5px;margin:0">Pergunte sobre o seu negócio ou sobre como usar o sistema. A IA vê só os números e avisos do resumo do dia, nunca telefones, e-mails ou documentos dos seus clientes.${app.sessao ? '' : ' Na demonstração, a resposta é um exemplo.'}</p>
        <div class="dica" style="margin:0">${ic('sparkle')}<span>Você tem <b>20 perguntas grátis por dia</b>${app.sessao ? `. Restam <b data-ia-rest>…</b> hoje.` : ' na versão com conta.'}</span></div></div></div>
        <details data-ia-conta style="border:1px solid var(--borda);border-radius:8px;padding:8px 12px"><summary style="cursor:pointer;font-size:13px;font-weight:500">Usar a minha conta do Gemini ou do ChatGPT <span class="mute" style="font-weight:400">(só para você)</span></summary>
          <div class="col" style="gap:10px;margin-top:10px">
            <p class="mute-2" style="font-size:12.5px;margin:0">Com a sua própria chave você pergunta até 300 vezes por dia, pela sua conta. Vale só para o seu usuário: cada pessoa da equipe conecta a dela, se quiser. Funciona com <b>chave de API</b>, não com a assinatura do app (ChatGPT Plus ou Gemini Advanced não servem). <b>Gemini:</b> chave grátis em <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>. <b>ChatGPT:</b> em <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">platform.openai.com/api-keys</a> (a OpenAI cobra pelo uso, na sua conta).</p>
            <div class="form-grade"><label class="campo">Conta<select data-ia-prov><option value="gemini">Gemini (Google)</option><option value="openai">ChatGPT (OpenAI)</option></select></label>
              <label class="campo">Modelo (opcional)<input data-ia-modelo type="text" maxlength="60" placeholder="padrão"></label>
              <label class="campo largo">Chave de API<input data-ia-chave type="password" autocomplete="off" placeholder="cole a chave"></label></div>
            <p class="mute" style="font-size:12px;margin:0">A chave fica guardada no servidor e não aparece de novo para ninguém, nem para o dono da empresa. A IA nunca recebe o código do sistema, chaves ou dados dos seus clientes.</p>
            <div class="flex" style="justify-content:flex-end;gap:8px;flex-wrap:wrap"><button type="button" class="btn fant perigo" data-ia-remover style="display:none">Voltar para a IA grátis</button><button type="button" class="btn pri" data-ia-salvar>Conectar a minha conta</button></div>
          </div></details>
        <div class="flex" style="flex-wrap:wrap;gap:6px">${sugestoes.map((x) => `<button type="button" class="btn peq" data-ia-sug="${esc(x)}">${esc(x)}</button>`).join('')}</div>
        <label class="campo largo">Sua pergunta<textarea data-ia-perg rows="2" maxlength="600" placeholder="Ex.: quais clientes eu devo cobrar primeiro?">${esc(d.p || '')}</textarea></label>
        <div data-ia-resp class="cartao" style="padding:12px;white-space:pre-wrap;${resp || carregando ? '' : 'display:none'}">${carregando ? 'Pensando…' : esc(resp)}</div></div>`;
      // demonstração: resposta de exemplo conforme o assunto da pergunta, com os números de exemplo do sistema
      const numeros = () => (r?.destaques?.length ? r.destaques.map(([a, b]) => `${a.toLowerCase()}: ${b}`).join('; ') : 'ainda há poucos dados');
      const telas = cfg.paginas.filter((p) => p.id && p.rot).slice(0, 8).map((p) => p.rot.toLowerCase());
      const exemplo = (pg) => {
        const q = pg.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        let t;
        if (/prioriz|hoje|urgente|primeiro|agora/.test(q)) t = r?.alertas?.length ? `Hoje, comece por aqui:\n- ${r.alertas.join('\n- ')}\n\nDepois disso, confira ${numeros()}.` : `Nada urgente agora (${numeros()}). Bom momento para chamar clientes antigos e pedir indicações.`;
        else if (/mes|vend|fatur|lucro|caixa|resultado|numero/.test(q)) t = `Resumo do momento: ${numeros()}.\n\nPara ver o mês inteiro e comparar com o anterior, abra o painel e os relatórios.${r?.alertas?.length ? ` Atenção: ${r.alertas[0]}.` : ''}`;
        else if (/cobr|mensagem|whats|lembrete|atras/.test(q)) t = 'Mensagem pronta para mandar no WhatsApp:\n\n"Olá, tudo bem? Passando para lembrar do pagamento em aberto. Se já pagou, desconsidere. Se preferir, te mando o PIX agora mesmo. Obrigado!"\n\nDica: mande no começo da manhã e ofereça o PIX junto.';
        else if (/cliente|vender mais|divulg|marketing|indica|instagram/.test(q)) t = 'Três ações para esta semana:\n1. Chame os clientes que não voltam há mais de 60 dias com uma oferta simples.\n2. Peça indicação para os clientes mais satisfeitos, com um mimo para quem indicar.\n3. Poste 2 fotos reais do seu trabalho no Instagram e no status do WhatsApp.';
        else if (/como (funciona|usa|faco|cadastr)|onde|tela|menu|sistema/.test(q)) t = `O ${cfg.nome} é dividido em telas no menu da esquerda: ${telas.join(', ')} e outras. Comece cadastrando os seus dados (ou suba a sua planilha em Importar), depois use o painel para acompanhar o dia. Se travar em algo, abra um chamado em Suporte.`;
        else if (/estoque|produto|repor|validade|lote/.test(q)) t = `Olhe a tela de estoque: ali aparecem os itens abaixo do mínimo e os que vencem primeiro. Agora: ${numeros()}.`;
        else t = `Pelos números de agora (${numeros()}), o melhor caminho é ${r?.alertas?.length ? `resolver primeiro: ${r.alertas[0]}` : 'manter a rotina e acompanhar o painel todo dia'}.`;
        return `${t}\n\n(Exemplo da demonstração. Na versão contratada, a IA responde exatamente à sua pergunta, com os números da sua empresa.)`;
      };
      const perguntar = async (f) => {
        const t = f.querySelector('[data-ia-perg]'), out = f.querySelector('[data-ia-resp]'), pergunta = t.value.trim();
        if (pergunta.length < 3) { t.focus(); return false; }
        out.style.display = ''; out.textContent = 'Pensando…';
        if (!app.sessao?.funcao) { setTimeout(() => { out.textContent = exemplo(pergunta); }, 1200); return false; }
        try { const x = await app.sessao.funcao('nexo-ia', { pergunta: (window.__brIdioma?.comIdioma || ((t) => t))(pergunta), sistema: cfg.nome, contexto, hoje: hoje() }); out.textContent = `${x.resposta}${typeof x.restantes === 'number' ? `\n\n${x.restantes === 0 ? (x.propria ? 'Limite de segurança de hoje atingido.' : 'Esta foi a última pergunta grátis de hoje. Amanhã você tem mais 20, ou conecte a sua conta do Gemini ou do ChatGPT aqui, em Usar a minha conta.') : `Restam ${x.restantes} de ${x.propria ? 300 : 20} perguntas${x.propria ? '' : ' grátis'} hoje.`}` : ''}`; const rr = f.querySelector('[data-ia-rest]'); if (rr && typeof x.restantes === 'number') rr.textContent = x.restantes; }
        catch (e) { out.textContent = e.message || 'Não foi possível responder agora.'; }
        return false;
      };
      modal({ titulo: 'Assistente IA', largura: 620, corpo: desenhar(), botoes: [{ rotulo: 'Fechar', valor: null, classe: 'fant' }, { rotulo: 'Perguntar', classe: 'pri', acao: perguntar }],
        aoAbrir: (f) => {
          const dica = f.querySelector('.dica span'), btSalvar = f.querySelector('[data-ia-salvar]'), btRemover = f.querySelector('[data-ia-remover]');
          const status = () => app.sessao?.funcao && app.sessao.funcao('nexo-ia', { acao: 'status' }).then((x) => {
            dica.innerHTML = x.propria ? `Usando a <b>sua conta ${x.provedor === 'openai' ? 'do ChatGPT' : 'do Gemini'}</b>. Restam <b data-ia-rest>${x.restantes}</b> de ${x.limite} perguntas hoje.` : `Você tem <b>20 perguntas grátis por dia</b>. Restam <b data-ia-rest>${x.restantes}</b> hoje.`;
            btRemover.style.display = x.propria ? '' : 'none'; btSalvar.textContent = x.propria ? 'Salvar' : 'Conectar a minha conta';
            f.querySelector('[data-ia-chave]').placeholder = x.propria ? '•••••••• (deixe em branco para manter)' : 'cole a chave';
            if (x.propria) { f.querySelector('[data-ia-prov]').value = x.provedor; f.querySelector('[data-ia-modelo]').value = x.modelo || ''; }
          }, () => {});
          status();
          btSalvar.addEventListener('click', async () => {
            if (!app.sessao?.funcao) { avisar('Na versão com conta, você conecta aqui a sua chave do Gemini ou do ChatGPT.'); return; }
            const chave = f.querySelector('[data-ia-chave]').value.trim(), modelo = f.querySelector('[data-ia-modelo]').value.trim();
            if (modelo && !/^[a-z0-9][a-z0-9.\-]{1,60}$/i.test(modelo)) { avisar('Nome do modelo inválido', { tipo: 'erro' }); return; }
            btSalvar.disabled = true; btSalvar.textContent = 'Testando a chave…';
            try {
              const t = await app.sessao.funcao('nexo-ia', { acao: 'salvar', provedor: f.querySelector('[data-ia-prov]').value, chave, modelo });
              if (t.ok) { f.querySelector('[data-ia-chave]').value = ''; avisar(`Conta conectada: a IA agora usa o seu ${t.provedor === 'openai' ? 'ChatGPT' : 'Gemini'}`); } else { avisar(t.erro, { tipo: 'erro', tempo: 10000 }); }
            } catch (e) { avisar(e.message, { tipo: 'erro', tempo: 10000 }); }
            btSalvar.disabled = false; status();
          });
          btRemover.addEventListener('click', async () => {
            try { await app.sessao.funcao('nexo-ia', { acao: 'remover' }); f.querySelector('[data-ia-modelo]').value = ''; avisar('Voltou para a IA grátis: a sua chave foi apagada'); } catch (e) { avisar(e.message, { tipo: 'erro' }); }
            status();
          }); f.addEventListener('click', (e) => { const b2 = e.target.closest('[data-ia-sug]'); if (!b2) return; f.querySelector('[data-ia-perg]').value = b2.dataset.iaSug; perguntar(f); }); f.querySelector('[data-ia-perg]')?.focus(); } });
    },
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
        ${a.nuvem ? '' : `<div class="dica">${ic('info')}<span>Na versão contratada, os cadastros são os da sua empresa, e cada pessoa da equipe tem o próprio acesso.</span></div>`}</div></div>
      ${!a.nuvem || a.sessao.gestor ? `<div class="cartao"><div class="cartao-cab"><div><h3>Equipe, cargos e permissões</h3><div class="sub">Ficam no Painel do dono, que só o dono e os administradores veem</div></div></div><div class="cartao-corpo"><div class="entre"><span class="mute-2">Convide pessoas, escolha o cargo e o que cada uma pode ver e editar.</span><a class="btn pri" href="#/dono">${ic('crown')}Abrir o Painel do dono</a></div></div></div>` : ''}
      <div class="cartao"><div class="cartao-cab"><div><h3>Dados</h3><div class="sub">Cópia e restauração</div></div></div><div class="cartao-corpo col" style="gap:10px">
        <div class="entre"><span class="mute-2">Baixar uma cópia de tudo (JSON)</span><button type="button" class="btn" data-acao="exportarDados">${ic('download-simple')}Exportar</button></div>
        ${a.nuvem ? a.sessao.linhasDados() : `<div class="entre"><span class="mute-2">Voltar aos dados de exemplo</span><button type="button" class="btn perigo" data-acao="recomecar">${ic('arrow-counter-clockwise')}Recomeçar</button></div>`}</div></div>
      ${a.nuvem ? (a.sessao.cartaoLocal ? a.sessao.cartaoLocal() : '') + a.sessao.cartaoResumo() + (a.sessao.cartaoBackup ? a.sessao.cartaoBackup() : '') : ''}${a.extrasConfig ? a.extrasConfig(a) : ''}${cfg.configExtra ? cfg.configExtra(a) : ''}</div>`,
  };
  const paginaPlanilha = paginaImportar(app);
  const paginaDono = {
    id: 'dono', rot: 'Painel do dono', titulo: 'Painel do dono',
    render: (a) => (a.nuvem ? a.sessao.painelDono() : painelDonoDemo(a, cfg)),
  };
  app.acoes.convidarDemo = async () => {
    const r = await editarPermissoes(app, cfg, { titulo: 'Convidar pessoa', comEmail: true, podeAdmin: true }); if (!r) return;
    app.db.cfg.equipe_demo = [...(app.db.cfg.equipe_demo || []), { email: r.email, papel: r.papel, perm: r.perm, convite: true }]; app.db.gravar();
    avisar('Convite criado. Na versão contratada, a pessoa recebe o link no WhatsApp e entra com o próprio e-mail.'); app.render();
  };
  app.acoes.acessoDemo = async (d) => {
    const l = app.db.cfg.equipe_demo || [], m = l[Number(d.i)]; if (!m) return;
    const r = await editarPermissoes(app, cfg, { titulo: `Cargo e acesso de ${m.email}`, atual: m.perm, papel: m.papel, podeAdmin: true }); if (!r) return;
    l[Number(d.i)] = { ...m, papel: r.papel, perm: r.perm }; app.db.gravar(); avisar('Cargo e acesso atualizados'); app.render();
  };
  app.acoes.avisoDemo = () => avisar('Na versão contratada, o dono troca o plano por aqui e confirma no Mercado Pago.');
  app.acoes.demoIndicacao = () => avisar('Na versão contratada, isto copia o seu link único de indicação.');
  app.acoes.tirarDemo = (d) => { const l = app.db.cfg.equipe_demo || []; l.splice(Number(d.i), 1); app.db.gravar(); app.render(); };
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
      const bruto = (c, x) => (c.csv ? c.csv(x, app) : c.valor ? c.valor(x, app) : x[c.k]);
      const cel = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const moedaCol = (c) => c.n && /valor|preco|total|saldo|custo|aberto|mensal|fatur|comiss|receb|pago|venda/i.test(`${c.k} ${c.rot}`);
      const nomeArq = `${normal(app.empresa || cfg.id).replace(/[^a-z0-9]+/g, '-')}-${tid}-${hoje()}`;
      pop(t, [
        { rotulo: 'Excel (.xlsx)', icone: 'table', acao: () => { baixarXlsx(nomeArq, [{ nome: cfgT.plural || tid, linhas: [cols.map((c) => c.rot || c.k), ...itens.map((x) => cols.map((c) => { const v = bruto(c, x); return moedaCol(c) && typeof v === 'number' ? { v, t: 'moeda' } : v; }))] }]); avisar(`Planilha do Excel com ${itens.length} linhas baixada`); } },
        { rotulo: 'CSV (texto)', icone: 'file-text', acao: () => { const linhas = [cols.map((c) => cel(c.rot)).join(';'), ...itens.map((x) => cols.map((c) => cel(bruto(c, x))).join(';'))]; baixar(`${nomeArq}.csv`, `﻿${linhas.join('\n')}`); avisar(`Planilha com ${itens.length} linhas baixada`); } },
      ]); return;
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

// Painel do dono na demonstração: mostra a equipe com cargos e o que só o dono vê (na nuvem, quem monta é a sessão)
function painelDonoDemo(a, cfg) {
  if (!a.db.cfg.equipe_demo) {
    const cg = cargosDe(cfg).map(([n]) => n);
    a.db.cfg.equipe_demo = (cfg.equipe || []).slice(1).map(([n, cargo], i) => ({ email: `${normal(n).split(' ')[0]}@${normal(cfg.empresa || 'empresa').replace(/[^a-z]/g, '').slice(0, 14) || 'empresa'}.com.br`, nome: n, papel: i === 0 ? 'admin' : 'membro', perm: i === 0 ? { total: true, cargo } : { ...(cargosDe(cfg).find(([x]) => x === cg[Math.min(i, cg.length - 1)])?.[1] || {}), cargo } }));
  }
  const eq = a.db.cfg.equipe_demo, preco = cfg.produto?.mensal || 0, ano = Math.round(preco * 12 * 0.8);
  const kp = [['crown', 'Sua função', 'Dono', 'Acesso a tudo, inclusive plano'], ['users-three', 'Equipe', `${eq.length + 1} pessoas`, cfg.produto?.unico ? 'Sem limite de pessoas' : `${eq.length} de 5 convites no Básico`], ['shield-check', 'Token de dono', 'Ativado', 'Pedido só no primeiro acesso'], ['calendar-check', 'Plano', cfg.produto?.unico ? 'Plano único' : 'Básico mensal', `R$ ${preco}/mês ou R$ ${ano.toLocaleString('pt-BR')}/ano`]];
  return `<div class="dica">${ic('crown')}<span>Só o dono e os administradores veem este painel. A equipe usa o sistema com o cargo e as permissões que você escolher.</span></div>
    <div class="grade g4" style="gap:12px">${kp.map(([i, t, v, s_]) => `<div class="cartao" style="padding:14px 16px"><div class="flex" style="gap:8px;color:var(--tx-3);font-size:12.5px">${ic(i, 'p')}${t}</div><b style="display:block;font-size:19px;margin-top:6px">${esc(v)}</b><div class="mute-2" style="font-size:12px;margin-top:2px">${esc(s_)}</div></div>`).join('')}</div>
    <div class="grade g2" style="align-items:start">
      <div class="cartao"><div class="cartao-cab"><div><h3>Equipe</h3><div class="sub">Cada pessoa entra com o próprio e-mail</div></div></div><ul class="lista">
        <li>${av((cfg.equipe || [['Você']])[0][0])}<div class="cresce"><div class="t corta">${esc((cfg.equipe || [['Você']])[0][0])} <span class="mute">(você)</span> ${et('Dono', 'acc')}</div><div class="s">Dono · acesso total</div></div></li>
        ${eq.map((m, i) => `<li>${av(m.nome || m.email)}<div class="cresce"><div class="t corta">${esc(m.nome || m.email)} ${m.papel === 'admin' ? et('Administrador', 'info') : ''}${m.convite ? ` ${et('Convite enviado', 'al')}` : ''}</div><div class="s">${esc(resumoAcesso(m.perm, m.papel))}</div></div><button type="button" class="btn fant peq" data-acao="acessoDemo" data-i="${i}">${ic('key')}Cargo e acesso</button><button type="button" class="btn fant peq ic-so" data-acao="tirarDemo" data-i="${i}" aria-label="Remover">${ic('trash')}</button></li>`).join('')}</ul>
        <div class="cartao-corpo" style="border-top:1px solid var(--borda)"><div class="entre"><span class="mute-2" style="font-size:12.5px">No convite você escolhe o cargo e o que a pessoa pode ver e editar.</span><button type="button" class="btn pri" data-acao="convidarDemo">${ic('user-plus')}Convidar pessoa</button></div></div></div>
      <div class="col" style="gap:16px">
        <div class="cartao"><div class="cartao-cab"><div><h3>Indique e ganhe</h3><div class="sub">A cada 3 indicações que assinam, 1 mês de Pro pagando o Básico</div></div>${et('2 assinaram', 'ok')}</div><div class="cartao-corpo col" style="gap:10px">
          <div class="flex" style="gap:8px"><input readonly value="https://bluerose-store.com/?indica=K7M2Q9XA" aria-label="Link de indicação de exemplo" style="flex:1;min-width:0"><button type="button" class="btn" data-acao="demoIndicacao">${ic('copy')}Copiar</button></div>
          <div><div class="entre" style="font-size:12.5px;margin-bottom:6px"><span class="mute-2">2 de 3 para o próximo mês de Pro</span><span class="mute-2">5 pessoas entraram pelo link</span></div><div class="prog"><i style="width:67%"></i></div></div>
          <p class="mute" style="font-size:12px;margin:0">Na versão contratada, o link é único da sua conta e o prêmio entra sozinho.</p></div></div>
        <div class="cartao"><div class="cartao-cab"><div><h3>Cargos sugeridos</h3><div class="sub">O cargo já marca o que a pessoa pode fazer</div></div></div><ul class="lista">${cargosDe(cfg).map(([n, pr]) => `<li><div class="cresce"><div class="t">${esc(n)}</div><div class="s">${esc(resumoAcesso({ ...pr, cargo: '' }))}</div></div></li>`).join('')}<li><div class="cresce"><div class="t">Administrador</div><div class="s">Acesso total e entra neste painel · só o dono escolhe</div></div></li></ul></div>
        <div class="cartao"><div class="cartao-cab"><div><h3>Plano e pagamento</h3><div class="sub">${cfg.produto?.unico ? 'Plano único' : 'Básico'} mensal · R$ ${preco}/mês</div></div></div><div class="cartao-corpo"><div class="entre"><span class="mute-2">Pague por ano e economize 20%: R$ ${ano.toLocaleString('pt-BR')}/ano</span><button type="button" class="btn" data-acao="avisoDemo">${ic('calendar-check')}Mudar para o anual</button></div></div></div>
      </div></div>`;
}
