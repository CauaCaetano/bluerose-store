// =============================================================
// Linha Nexo · núcleo comum dos sistemas de demonstração
// -------------------------------------------------------------
// Tudo roda no navegador: os dados ficam no localStorage deste aparelho,
// com dados de exemplo e um botão "Recomeçar". Cada sistema descreve suas
// coleções (campos) e páginas; o núcleo monta menu, listas com busca e
// filtros, formulários, confirmações, gráficos e o funil arrastável.
// =============================================================

// ---------------------------------------------------------------- utilidades
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
export const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const num = (v) => Number(v || 0).toLocaleString('pt-BR');
export const hoje = () => new Date().toISOString().slice(0, 10);
export const diaMais = (n, base = new Date()) => { const d = new Date(base); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
export const dataBR = (iso) => { if (!iso) return '—'; const [a, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}/${a}`; };
export const dataHoraBR = (iso) => (iso ? `${dataBR(iso)} ${String(iso).slice(11, 16)}` : '—');
export const diasAte = (iso) => Math.round((new Date(`${String(iso).slice(0, 10)}T12:00:00`) - new Date(`${hoje()}T12:00:00`)) / 864e5);
export const iniciais = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
export const sorteio = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const novoId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// ---------------------------------------------------------------- dados (localStorage)
export class Banco {
  constructor(chave, colecoes) {
    this.chave = chave; this.colecoes = colecoes;
    try { this.dados = JSON.parse(localStorage.getItem(chave) || 'null'); } catch { this.dados = null; }
    if (!this.dados || this.dados._versao !== 1) this.recomecar(false);
  }
  recomecar(salvar = true) {
    this.dados = { _versao: 1 };
    for (const [nome, c] of Object.entries(this.colecoes)) this.dados[nome] = (c.seed ? c.seed() : []).map((x) => ({ id: novoId(), criado_em: new Date().toISOString(), ...x }));
    if (salvar !== false) this.gravar(); else this.gravar();
  }
  gravar() { try { localStorage.setItem(this.chave, JSON.stringify(this.dados)); } catch { /* modo privado: fica só em memória */ } }
  lista(nome) { return this.dados[nome] || (this.dados[nome] = []); }
  obter(nome, id) { return this.lista(nome).find((x) => x.id === id) || null; }
  salvar(nome, obj) {
    const l = this.lista(nome);
    if (obj.id) { const i = l.findIndex((x) => x.id === obj.id); if (i >= 0) { l[i] = { ...l[i], ...obj, atualizado_em: new Date().toISOString() }; this.gravar(); return l[i]; } }
    const novo = { id: novoId(), criado_em: new Date().toISOString(), ...obj };
    l.unshift(novo); this.gravar(); return novo;
  }
  apagar(nome, id) { this.dados[nome] = this.lista(nome).filter((x) => x.id !== id); this.gravar(); }
}

// ---------------------------------------------------------------- avisos e modal
export function avisar(texto, tipo = 'ok') {
  let c = document.querySelector('.toasts');
  if (!c) { c = document.createElement('div'); c.className = 'toasts'; c.setAttribute('role', 'status'); document.body.appendChild(c); }
  const t = document.createElement('div'); t.className = `toast ${tipo}`; t.textContent = texto; c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
export function modal({ titulo, corpo, botoes = [], largura = 640 }) {
  return new Promise((resolver) => {
    const f = document.createElement('div'); f.className = 'fundo-modal';
    f.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(titulo)}" style="width:min(${largura}px,100%)">
      <div class="modal-cab"><h2>${esc(titulo)}</h2><button type="button" class="btn icone" data-fechar aria-label="Fechar">✕</button></div>
      <div class="modal-corpo">${corpo}</div>
      ${botoes.length ? `<div class="modal-pe">${botoes.map((b, i) => `<button type="button" class="btn ${b.classe || ''}" data-b="${i}">${esc(b.rotulo)}</button>`).join('')}</div>` : ''}</div>`;
    const fechar = (v) => { f.remove(); document.removeEventListener('keydown', tecla); resolver(v); };
    const tecla = (e) => { if (e.key === 'Escape') fechar(null); };
    f.addEventListener('click', (e) => {
      if (e.target === f || e.target.closest('[data-fechar]')) return fechar(null);
      const b = e.target.closest('[data-b]'); if (!b) return;
      const def = botoes[Number(b.dataset.b)];
      const r = def.acao ? def.acao(f) : def.valor;
      if (r !== false) fechar(r === undefined ? def.valor : r);
    });
    document.addEventListener('keydown', tecla);
    document.body.appendChild(f);
    setTimeout(() => f.querySelector('input,select,textarea,button.pri')?.focus(), 30);
  });
}
export const confirmar = (texto, rotulo = 'Confirmar', perigo = false) => modal({ titulo: 'Confirmar', corpo: `<p style="margin:0">${esc(texto)}</p>`, largura: 440,
  botoes: [{ rotulo: 'Cancelar', valor: false }, { rotulo, classe: perigo ? 'pri perigo' : 'pri', valor: true }] });

// ---------------------------------------------------------------- campos e formulários
function opcoesDe(campo, app) {
  if (campo.tipo === 'relacao') return app.db.lista(campo.colecao).map((x) => [x.id, x[campo.mostrar || 'nome']]);
  return (campo.opcoes || []).map((o) => (Array.isArray(o) ? o : [o, o]));
}
export function valorExibido(campo, v, app) {
  if (v === undefined || v === null || v === '') return '<span class="muted">—</span>';
  switch (campo.tipo) {
    case 'moeda': return moeda(v);
    case 'numero': return num(v);
    case 'data': return dataBR(v);
    case 'datahora': return dataHoraBR(v);
    case 'booleano': return v ? 'Sim' : 'Não';
    case 'relacao': { const r = app.db.obter(campo.colecao, v); return r ? esc(r[campo.mostrar || 'nome']) : '<span class="muted">—</span>'; }
    case 'selecao': { const cor = campo.cores?.[v]; return cor ? `<span class="selo ${cor}">${esc(v)}</span>` : esc(v); }
    default: return esc(v);
  }
}
function inputDe(campo, v, app) {
  const id = `f-${campo.nome}`, req = campo.obrigatorio ? 'required' : '';
  const val = v ?? (typeof campo.padrao === 'function' ? campo.padrao() : campo.padrao) ?? '';
  let ctl;
  if (campo.tipo === 'selecao' || campo.tipo === 'relacao') {
    ctl = `<select id="${id}" name="${campo.nome}" ${req}>${campo.obrigatorio ? '' : '<option value="">—</option>'}${opcoesDe(campo, app).map(([k, r]) => `<option value="${esc(k)}" ${String(k) === String(val) ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>`;
  } else if (campo.tipo === 'texto-longo') ctl = `<textarea id="${id}" name="${campo.nome}" ${req}>${esc(val)}</textarea>`;
  else if (campo.tipo === 'booleano') ctl = `<select id="${id}" name="${campo.nome}"><option value="0">Não</option><option value="1" ${val ? 'selected' : ''}>Sim</option></select>`;
  else {
    const t = { moeda: 'number', numero: 'number', data: 'date', datahora: 'datetime-local', email: 'email', tel: 'tel', hora: 'time' }[campo.tipo] || 'text';
    const extra = campo.tipo === 'moeda' ? 'step="0.01" min="0"' : campo.tipo === 'numero' ? 'step="any"' : '';
    ctl = `<input id="${id}" name="${campo.nome}" type="${t}" ${extra} value="${esc(campo.tipo === 'datahora' ? String(val).slice(0, 16) : val)}" ${req} ${campo.tipo === 'texto' && campo.max ? `maxlength="${campo.max}"` : ''}>`;
  }
  return `<label class="campo ${campo.largo || campo.tipo === 'texto-longo' ? 'largo' : ''}" for="${id}">${esc(campo.rotulo)}${campo.obrigatorio ? ' *' : ''}${ctl}</label>`;
}
function lerFormulario(form, campos) {
  const o = {};
  for (const c of campos) {
    const el = form.querySelector(`[name="${c.nome}"]`); if (!el) continue;
    let v = el.value;
    if (c.tipo === 'moeda' || c.tipo === 'numero') v = v === '' ? null : Number(v);
    if (c.tipo === 'booleano') v = v === '1';
    o[c.nome] = v;
  }
  return o;
}
/** Abre o formulário de uma coleção (novo ou edição). Devolve o registro salvo ou null. */
export async function editar(app, nomeColecao, registro = null, extra = {}) {
  const col = app.colecoes[nomeColecao];
  const campos = col.campos.filter((c) => !c.somenteLista);
  const corpo = `<form class="form-grade" novalidate>${campos.map((c) => inputDe(c, registro?.[c.nome] ?? extra[c.nome], app)).join('')}</form>`;
  const r = await modal({
    titulo: registro ? `Editar ${col.singular}` : `Novo ${col.singular}`, corpo,
    botoes: [{ rotulo: 'Cancelar', valor: null }, { rotulo: 'Salvar', classe: 'pri', acao: (f) => {
      const form = f.querySelector('form');
      if (!form.reportValidity()) return false;
      const dados = lerFormulario(form, campos);
      const erro = col.validar?.(dados);
      if (erro) { avisar(erro, 'erro'); return false; }
      return dados;
    } }],
  });
  if (!r) return null;
  const salvo = app.db.salvar(nomeColecao, { ...(registro ? { id: registro.id } : {}), ...extra, ...r });
  col.aoSalvar?.(salvo, app, !registro);
  avisar(registro ? `${col.singular[0].toUpperCase()}${col.singular.slice(1)} atualizado` : `${col.singular[0].toUpperCase()}${col.singular.slice(1)} criado`);
  return salvo;
}

// ---------------------------------------------------------------- lista (CRUD) com busca, filtros e ordenação
export function paginaLista(app, nomeColecao, opcoes = {}) {
  const col = app.colecoes[nomeColecao];
  const estado = app.estado[nomeColecao] ||= { busca: '', filtros: {}, ordem: opcoes.ordem || null, desc: !!opcoes.desc };
  const colunas = col.campos.filter((c) => c.lista);
  const filtraveis = col.campos.filter((c) => c.filtro);
  let itens = app.db.lista(nomeColecao).filter((x) => (opcoes.filtro ? opcoes.filtro(x) : true));
  if (estado.busca) {
    const b = estado.busca.toLowerCase();
    itens = itens.filter((x) => col.campos.some((c) => String(c.tipo === 'relacao' ? (app.db.obter(c.colecao, x[c.nome])?.[c.mostrar || 'nome'] || '') : x[c.nome] ?? '').toLowerCase().includes(b)));
  }
  for (const [k, v] of Object.entries(estado.filtros)) if (v) itens = itens.filter((x) => String(x[k]) === v);
  if (estado.ordem) {
    const c = col.campos.find((x) => x.nome === estado.ordem);
    itens = [...itens].sort((a, b) => { const va = a[estado.ordem] ?? '', vb = b[estado.ordem] ?? ''; const r = c && ['moeda', 'numero'].includes(c.tipo) ? (va || 0) - (vb || 0) : String(va).localeCompare(String(vb), 'pt-BR'); return estado.desc ? -r : r; });
  }
  const total = opcoes.total ? opcoes.total(itens) : '';
  return `<div class="cartao">
    <div class="cartao-cab"><div class="barra-ferr" style="flex:1">
      <label class="busca"><input type="search" placeholder="Buscar ${esc(col.plural)}…" value="${esc(estado.busca)}" data-busca="${nomeColecao}" aria-label="Buscar"></label>
      ${filtraveis.map((c) => `<select class="filtro" data-filtro="${nomeColecao}:${c.nome}" aria-label="${esc(c.rotulo)}"><option value="">${esc(c.rotulo)}: todos</option>${opcoesDe(c, app).map(([k, r]) => `<option value="${esc(k)}" ${estado.filtros[c.nome] === String(k) ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>`).join('')}
      <span class="muted">${itens.length} ${itens.length === 1 ? col.singular : col.plural}${total ? ` · ${total}` : ''}</span>
    </div>${opcoes.semNovo ? '' : `<div class="acoes"><button type="button" class="btn pri" data-novo="${nomeColecao}">+ ${esc(col.botaoNovo || `Novo ${col.singular}`)}</button></div>`}</div>
    <div class="tabela-caixa">${itens.length ? `<table class="tabela"><thead><tr>${colunas.map((c) => `<th class="${['moeda', 'numero'].includes(c.tipo) ? 'num' : ''} ${c.ocultaCel ? 'oculta-cel' : ''}" data-ordem="${nomeColecao}:${c.nome}">${esc(c.rotulo)}${estado.ordem === c.nome ? (estado.desc ? ' ↓' : ' ↑') : ''}</th>`).join('')}<th></th></tr></thead>
      <tbody>${itens.slice(0, 300).map((x) => `<tr>${colunas.map((c, i) => `<td class="${['moeda', 'numero'].includes(c.tipo) ? 'num' : ''} ${c.ocultaCel ? 'oculta-cel' : ''}">${i === 0 && col.subtitulo ? `<b>${c.exibir ? c.exibir(x, app) : valorExibido(c, x[c.nome], app)}</b><span class="sub">${esc(col.subtitulo(x, app))}</span>` : (c.exibir ? c.exibir(x, app) : valorExibido(c, x[c.nome], app))}</td>`).join('')}
        <td><div class="acoes-linha">${(opcoes.acoesExtra ? opcoes.acoesExtra(x) : '')}<button type="button" class="btn peq" data-editar="${nomeColecao}:${x.id}">Editar</button><button type="button" class="btn peq perigo" data-apagar="${nomeColecao}:${x.id}" aria-label="Excluir">✕</button></div></td></tr>`).join('')}</tbody></table>`
      : `<div class="vazio">Nada por aqui${estado.busca || Object.values(estado.filtros).some(Boolean) ? ' com esse filtro' : ' ainda'}.</div>`}</div></div>`;
}

// ---------------------------------------------------------------- componentes
export const kpi = ({ icone, rotulo, valor, nota = '', tom = '', variacao = null }) => `<div class="kpi ${tom}"><div class="kpi-ic">${icone}</div><div><span>${esc(rotulo)}</span><b>${valor}</b>${nota || variacao != null ? `<small class="${variacao > 0 ? 'sobe' : variacao < 0 ? 'desce' : ''}">${variacao != null ? `${variacao > 0 ? '▲' : variacao < 0 ? '▼' : ''} ${Math.abs(variacao)}% ` : ''}${esc(nota)}</small>` : ''}</div></div>`;
export const cartao = (titulo, corpo, { sub = '', acoes = '', semPad = false } = {}) => `<div class="cartao"><div class="cartao-cab"><div><h2>${esc(titulo)}</h2>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>${acoes ? `<div class="acoes">${acoes}</div>` : ''}</div><div class="${semPad ? '' : 'cartao-corpo'}">${corpo}</div></div>`;
export const progresso = (pct, cor = '') => `<div class="barra-prog"><i style="width:${Math.max(0, Math.min(100, pct))}%;${cor ? `background:${cor}` : ''}"></i></div>`;

/** Gráfico de barras (agrupadas) em SVG. series: [{nome, cor}], dados: [{rotulo, valores:[...]}] */
export function graficoBarras({ dados, series, altura = 220, formato = num }) {
  const L = 640, H = altura, ml = 56, mb = 26, mt = 10, w = L - ml - 8, h = H - mb - mt;
  const max = Math.max(1, ...dados.flatMap((d) => d.valores)) * 1.1;
  const passo = w / Math.max(1, dados.length), bw = Math.min(28, (passo * 0.7) / series.length);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => max * t);
  return `<svg class="grafico" viewBox="0 0 ${L} ${H}" role="img" aria-label="Gráfico">
    ${ticks.map((t) => { const y = mt + h - (t / max) * h; return `<line class="eixo" x1="${ml}" x2="${L - 8}" y1="${y}" y2="${y}"/><text x="${ml - 6}" y="${y + 4}" text-anchor="end">${formato(Math.round(t))}</text>`; }).join('')}
    ${dados.map((d, i) => { const x0 = ml + i * passo + (passo - bw * series.length) / 2; return d.valores.map((v, j) => { const bh = (v / max) * h; return `<rect x="${x0 + j * bw}" y="${mt + h - bh}" width="${bw - 3}" height="${bh}" rx="4" fill="${series[j].cor}"><title>${esc(d.rotulo)} · ${esc(series[j].nome)}: ${formato(v)}</title></rect>`; }).join('') + `<text x="${ml + i * passo + passo / 2}" y="${H - 8}" text-anchor="middle">${esc(d.rotulo)}</text>`; }).join('')}
  </svg>${series.length > 1 ? `<div class="legenda">${series.map((s) => `<span><i style="background:${s.cor}"></i>${esc(s.nome)}</span>`).join('')}</div>` : ''}`;
}
/** Gráfico de linha (saldo acumulado, por exemplo) */
export function graficoLinha({ pontos, altura = 200, cor = 'var(--acc)', formato = num }) {
  const L = 640, H = altura, ml = 64, mb = 26, mt = 12, w = L - ml - 10, h = H - mb - mt;
  const vs = pontos.map((p) => p.valor), min = Math.min(0, ...vs), max = Math.max(1, ...vs);
  const y = (v) => mt + h - ((v - min) / (max - min || 1)) * h, x = (i) => ml + (i / Math.max(1, pontos.length - 1)) * w;
  const d = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  const ticks = [min, (min + max) / 2, max];
  return `<svg class="grafico" viewBox="0 0 ${L} ${H}" role="img" aria-label="Gráfico de linha">
    ${ticks.map((t) => `<line class="eixo" x1="${ml}" x2="${L - 10}" y1="${y(t)}" y2="${y(t)}"/><text x="${ml - 6}" y="${y(t) + 4}" text-anchor="end">${formato(Math.round(t))}</text>`).join('')}
    ${min < 0 ? `<line x1="${ml}" x2="${L - 10}" y1="${y(0)}" y2="${y(0)}" stroke="var(--er)" stroke-dasharray="4 4"/>` : ''}
    <path d="${d} L${x(pontos.length - 1)},${y(min)} L${x(0)},${y(min)} Z" fill="${cor}" opacity=".08"/>
    <path d="${d}" fill="none" stroke="${cor}" stroke-width="2.5" stroke-linejoin="round"/>
    ${pontos.map((p, i) => (i % Math.ceil(pontos.length / 8) === 0 || i === pontos.length - 1 ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(p.rotulo)}</text>` : '')).join('')}
  </svg>`;
}
/** Funil / kanban arrastável. aoMover(id, colunaNova) */
export function kanban({ chave, colunas, itens, campo, cartao: desenhar, rodape }) {
  return `<div class="kanban" data-kanban="${chave}">${colunas.map((c) => {
    const lista = itens.filter((x) => x[campo] === c.id);
    return `<div class="coluna" data-coluna="${esc(c.id)}"><div class="coluna-cab"><span>${esc(c.nome)}</span><small>${lista.length}${rodape ? ` · ${rodape(lista)}` : ''}</small></div>
      ${lista.map((x) => `<div class="ficha" draggable="true" data-ficha="${x.id}">${desenhar(x)}</div>`).join('')}</div>`;
  }).join('')}</div>`;
}

// ---------------------------------------------------------------- aplicativo (menu, rotas, eventos)
export function criarApp(cfg) {
  document.documentElement.style.setProperty('--acc', cfg.cor);
  document.title = `${cfg.nome} · demonstração · Blue Rose Express`;
  const app = { ...cfg, estado: {}, db: new Banco(`nexo-${cfg.id}-v1`, cfg.colecoes), kanbans: {} };
  const paginas = cfg.menu.filter((m) => m.id);
  const site = 'https://bluerose-store.com/';
  document.body.innerHTML = `
    <div class="demo-faixa"><span>Demonstração do <b>${esc(cfg.nome)}</b> · os dados ficam só neste navegador</span>
      <button type="button" data-recomecar>Recomeçar com os dados de exemplo</button>
      <a class="demo-cta" href="${site}sistemas.html#${cfg.id}">Comprar ${moeda(cfg.produto.compra)} ou alugar ${moeda(cfg.produto.mensal)}/mês</a></div>
    <div class="app" id="app">
      <nav class="menu" aria-label="Menu">
        <div class="marca"><div class="marca-ic">${esc(cfg.inicial || cfg.nome.split(' ').pop()[0])}</div><div><b>${esc(cfg.nome)}</b><small>${esc(cfg.sub)}</small></div></div>
        <div class="empresa"><b>${esc(cfg.empresa)}</b><small>${esc(cfg.empresaSub || 'Conta de demonstração')}</small></div>
        ${cfg.menu.map((m) => (m.grupo ? `<div class="menu-grupo">${esc(m.grupo)}</div>` : `<a href="#/${m.id}" data-pag="${m.id}"><i>${m.icone}</i>${esc(m.rotulo)}<span class="cont" data-cont="${m.id}" hidden></span></a>`)).join('')}
        <div style="margin-top:auto;padding:12px 8px 0" class="muted"><small>Feito pela <a href="${site}" target="_blank" rel="noopener">Blue Rose Express</a></small></div>
      </nav>
      <main class="principal"><div class="topo"><button type="button" class="btn icone btn-menu" data-abrir-menu aria-label="Abrir menu">☰</button><div><h1 id="titulo"></h1><div class="sub" id="subtitulo"></div></div><div class="acoes" id="acoes-topo"></div></div>
        <div class="conteudo" id="conteudo"></div></main>
    </div>`;
  const $ = (s) => document.querySelector(s);

  app.render = () => {
    const rota = location.hash.replace(/^#\/?/, '').split('/')[0] || paginas[0].id;
    const p = paginas.find((x) => x.id === rota) || paginas[0];
    document.querySelectorAll('.menu a').forEach((a) => a.classList.toggle('ativo', a.dataset.pag === p.id));
    $('#titulo').textContent = p.titulo || p.rotulo;
    $('#subtitulo').textContent = typeof p.sub === 'function' ? p.sub(app) : (p.sub || '');
    $('#acoes-topo').innerHTML = p.acoes ? p.acoes(app) : '';
    $('#conteudo').innerHTML = p.crud ? (p.antes ? p.antes(app) : '') + paginaLista(app, p.crud, p.opcoes || {}) : p.pagina(app);
    p.montar?.(app, $('#conteudo'));
    for (const m of paginas) { const c = document.querySelector(`[data-cont="${m.id}"]`); const n = m.contador?.(app); if (c) { c.hidden = !n; c.textContent = n || ''; } }
    document.getElementById('app').classList.remove('menu-aberto');
  };
  window.addEventListener('hashchange', app.render);

  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-novo],[data-editar],[data-apagar],[data-ordem],[data-recomecar],[data-abrir-menu],[data-acao]');
    if (!t) { if (!e.target.closest('.menu')) document.getElementById('app').classList.remove('menu-aberto'); return; }
    if (t.dataset.abrirMenu !== undefined) { document.getElementById('app').classList.toggle('menu-aberto'); return; }
    if (t.dataset.recomecar !== undefined) { if (await confirmar('Apagar tudo o que você mudou e voltar aos dados de exemplo?', 'Recomeçar')) { app.db.recomecar(); app.estado = {}; avisar('Dados de exemplo restaurados'); app.render(); } return; }
    if (t.dataset.novo) { if (await editar(app, t.dataset.novo)) app.render(); return; }
    if (t.dataset.editar) { const [c, id] = t.dataset.editar.split(':'); if (await editar(app, c, app.db.obter(c, id))) app.render(); return; }
    if (t.dataset.apagar) { const [c, id] = t.dataset.apagar.split(':'); if (await confirmar(`Excluir este ${app.colecoes[c].singular}?`, 'Excluir', true)) { app.db.apagar(c, id); avisar('Excluído'); app.render(); } return; }
    if (t.dataset.ordem) { const [c, campo] = t.dataset.ordem.split(':'); const s = app.estado[c]; s.desc = s.ordem === campo ? !s.desc : false; s.ordem = campo; app.render(); return; }
    if (t.dataset.acao && app.acoes?.[t.dataset.acao]) { const r = await app.acoes[t.dataset.acao](t.dataset.id, app, t); if (r !== false) app.render(); }
  });
  document.addEventListener('input', (e) => {
    const b = e.target.closest('[data-busca]');
    if (b) { app.estado[b.dataset.busca].busca = b.value; const pos = b.selectionStart; app.render(); const nb = document.querySelector(`[data-busca="${b.dataset.busca}"]`); nb?.focus(); nb?.setSelectionRange(pos, pos); }
  });
  document.addEventListener('change', (e) => {
    const f = e.target.closest('[data-filtro]');
    if (f) { const [c, campo] = f.dataset.filtro.split(':'); app.estado[c].filtros[campo] = f.value; app.render(); }
  });
  // arrastar fichas do funil
  let arrastando = null;
  document.addEventListener('dragstart', (e) => { const f = e.target.closest('[data-ficha]'); if (!f) return; arrastando = f.dataset.ficha; f.classList.add('arrastando'); e.dataTransfer.effectAllowed = 'move'; });
  document.addEventListener('dragend', (e) => { e.target.closest?.('[data-ficha]')?.classList.remove('arrastando'); document.querySelectorAll('.coluna.alvo').forEach((c) => c.classList.remove('alvo')); });
  document.addEventListener('dragover', (e) => { const c = e.target.closest('[data-coluna]'); if (c && arrastando) { e.preventDefault(); document.querySelectorAll('.coluna.alvo').forEach((x) => x !== c && x.classList.remove('alvo')); c.classList.add('alvo'); } });
  document.addEventListener('drop', (e) => {
    const c = e.target.closest('[data-coluna]'); if (!c || !arrastando) return;
    e.preventDefault();
    const k = c.closest('[data-kanban]').dataset.kanban;
    app.kanbans[k]?.(arrastando, c.dataset.coluna); arrastando = null; app.render();
  });
  app.render();
  return app;
}
