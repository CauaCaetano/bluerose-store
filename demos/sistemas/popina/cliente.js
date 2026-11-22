// Popina · cardápio do cliente (estrutura de cardápio de delivery: capa, busca, abas que grudam, foto à direita, tela do produto, sacola fixa e finalizar).
// ?mesa=N: pede da mesa (o garçom confere), chama o garçom e pede a conta.  Sem mesa: entrega ou retirada, com taxa por bairro e troco.
// r=<restaurante>: o cardápio de verdade (nuvem). Sem r: o restaurante de exemplo deste aparelho (demonstração).
// Todo pedido também pode ir para o WhatsApp do restaurante (link wa.me com o pedido escrito).
import { ico, folha, toast, $, $$ } from './ui.js?v=45';
import { formOpcoes, temOpcoes, abertoAgora, textoHorarios } from './opcoes.js?v=45';

const q = new URLSearchParams(location.search);
const R = /^[0-9a-f-]{36}$/i.test(q.get('r') || '') ? q.get('r') : '';
const mesa = Math.max(0, parseInt(q.get('mesa'), 10) || 0);
const CHAVE_LOCAL = `popina-cli-${R || 'exemplo'}`;
const din = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const t = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const soDig = (s) => String(s || '').replace(/\D/g, '');
const num = (v) => { const s = String(v ?? '').trim(); return Number(/,/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s) || 0; };
let M = null, L = null, modo = mesa ? 'mesa' : 'delivery', sacola = [], busca = '', cat = '', loja = null;
const P = (id) => M.produtos.find((p) => p.id === id);
const guardado = (k, v) => { try { const o = JSON.parse(localStorage.getItem(CHAVE_LOCAL) || '{}'); if (v === undefined) return o[k]; o[k] = v; localStorage.setItem(CHAVE_LOCAL, JSON.stringify(o)); } catch { /* sem acesso */ } return undefined; };
const LOJA_PADRAO = { cor: '#1B6B4A', horarios: [], aceitaQR: true, delivery: true, retirada: true, pagamentos: ['Pix', 'Cartão na entrega', 'Dinheiro'], pedidoMinimo: 0, tempoEntrega: '', tempoRetirada: '' };

// ------------------------------------------------------------------ de onde vem o cardápio
async function rpc(fn, args) {
  const c = window.NEXO_NUVEM;
  const r = await fetch(`${c.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: c.chave, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error('rede');
  return r.json();
}
function doExemplo() {
  const { db, lojaCfg } = loja;
  M = { nome: db.config.nome, cidade: db.config.cidade, servico: db.config.servico, whatsapp: db.config.whatsapp, loja: lojaCfg(), categorias: db.categorias, produtos: db.produtos.filter((p) => p.ativo !== false), bairros: db.bairros };
  L = { ...LOJA_PADRAO, ...M.loja };
}
async function daNuvem() {
  const d = await rpc('popina_cardapio', { p_espaco: R });
  if (d.erro) throw new Error(d.erro);
  M = { ...d, produtos: (d.produtos || []).filter((p) => p.ativo !== false) }; L = { ...LOJA_PADRAO, ...(d.loja || {}) };
}
// as ações: no exemplo gravam neste aparelho (como se fosse o restaurante); no restaurante de verdade vão para a fila da nuvem
const api = {
  async mesa(itens) { if (R) return rpc('popina_pedir', { p_espaco: R, p_tipo: 'mesa', p_mesa: mesa, p_dados: { itens } }); const { db, uid, grava } = loja; const id = uid('q'); db.pedidosQR.push({ id, mesa, ts: Date.now(), nome: `Mesa ${mesa} (QR)`, itens }); grava(); return { ok: true, id }; },
  async pedido(tipo, d) {
    if (R) return rpc('popina_pedir', { p_espaco: R, p_tipo: tipo, p_mesa: null, p_dados: d });
    const { novoPedido, adicionarItem, itensLimpos } = loja;
    const c = novoPedido(tipo, { nome: d.nome, tel: d.tel, end: d.end, bairro: d.bairro }, { origem: 'Cardápio online', pagarNaEntrega: d.pagar, ...(tipo === 'balcao' ? { modo: 'retirada' } : {}), ...(d.troco > 0 ? { trocoPara: d.troco } : {}) });
    itensLimpos(d.itens).forEach((i) => adicionarItem(c, { prodId: i.prod, qtd: i.qtd, obs: i.obs, adic: i.adic, meia: i.meia, tam: i.tam }));
    return { ok: true, id: c.id, num: c.num, senha: c.senha || 0 };
  },
  async chamar() { if (R) return rpc('popina_pedir', { p_espaco: R, p_tipo: 'chamado', p_mesa: mesa, p_dados: {} }); const { db, uid, grava } = loja; if (!db.chamados.some((x) => x.mesa === mesa && !x.atendido)) { db.chamados.push({ id: uid('c'), mesa, tipo: 'garcom', ts: Date.now(), origem: 'QR' }); grava(); } return { ok: true }; },
  async pedirConta() { if (R) return rpc('popina_pedir', { p_espaco: R, p_tipo: 'conta', p_mesa: mesa, p_dados: {} }); const { comandaDaMesa, grava } = loja; const c = comandaDaMesa(mesa); if (c) { c.pediuConta = Date.now(); grava(); } return { ok: true, semConta: !c }; },
  async conta() {
    if (R) { const r = await rpc('popina_conta', { p_espaco: R, p_mesa: mesa }); if (r.erro) throw new Error(r.erro); const itens = (r.itens || []).map((i) => ({ ...i, valor: i.qtd * (i.preco + (i.adic || []).reduce((s, a) => s + Number(a.preco || 0), 0)) })); const s = itens.reduce((a, i) => a + i.valor, 0), servico = Math.round(s * (r.servico || 0)) / 100; return { itens, sub: s, servico, total: s + servico - (r.desconto || 0), pago: r.pago || 0 }; }
    const { comandaDaMesa, conta, itensValidos, valorItem } = loja; const c = comandaDaMesa(mesa); if (!c) return { itens: [] };
    const v = conta(c); return { itens: itensValidos(c).filter((i) => i.status !== 'rascunho').map((i) => ({ nome: i.nome, qtd: i.qtd, valor: valorItem(i) })), sub: v.sub, servico: v.servico, total: v.total, pago: v.pago };
  },
  async status(id, tipo) {
    if (R) return rpc('popina_status', { p_espaco: R, p_id: id, p_tipo: tipo });
    const { db, comanda } = loja;
    if (tipo === 'mesa') return { etapa: db.pedidosQR.some((x) => x.id === id) ? 'recebido' : 'confirmado' };
    const c = comanda(id); if (!c) return { etapa: db.vendas.some((v) => v.id === id) ? 'entregue' : 'recebido' };
    if (c.entrega === 'saiu') return { etapa: 'saiu' };
    const it = c.itens.filter((i) => !i.cancelado);
    if (it.every((i) => i.status === 'rascunho')) return { etapa: 'recebido' };
    if (it.every((i) => ['pronto', 'entregue'].includes(i.status))) return { etapa: 'pronto' };
    return { etapa: 'preparo' };
  },
};

// ------------------------------------------------------------------ a cor do restaurante (com leitura garantida)
function aplicarCor() {
  const cor = /^#[0-9a-f]{6}$/i.test(L.cor || '') ? L.cor : '#1B6B4A';
  let c = [1, 3, 5].map((k) => parseInt(cor.slice(k, k + 2), 16));
  const lum = (x) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(x[0]) + 0.7152 * f(x[1]) + 0.0722 * f(x[2]); };
  for (let k = 0; k < 40 && 1.05 / (lum(c) + 0.05) < 4.6; k++) c = c.map((v) => v * 0.93);
  const h = '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const s = document.documentElement.style; s.setProperty('--loja', h); s.setProperty('--loja-tinta', h); s.setProperty('--loja-suave', '#' + [1, 3, 5].map((k) => Math.round(parseInt(cor.slice(k, k + 2), 16) * 0.16 + 255 * 0.84).toString(16).padStart(2, '0')).join(''));
  $('meta[name=theme-color]').content = h;
  document.title = `${M.nome} · Cardápio`;
}

// ------------------------------------------------------------------ capa, modo e lista (mesma estrutura de um cardápio de delivery: capa, busca, abas que grudam, lista com foto à direita)
const aberto = () => !R || abertoAgora(L.horarios); // na demonstração o exemplo fica sempre aberto (para testar a qualquer hora)
const precoBase = (p) => (p.tamanhos?.length ? Math.min(...p.tamanhos.map((x) => Number(x.preco) || 0)) : Number(p.preco) || 0);
const vendeOnline = (p) => !p.porKg;
const logoDe = () => L.logo || (!R ? 'img/c-logo-exemplo.webp' : '');
const faixaTaxa = () => { const l = (M.bairros || []).map((b) => Number(b.taxa) || 0); if (!l.length) return ''; const a = Math.min(...l), b = Math.max(...l); return a === b ? din(a) : `${din(a)} a ${din(b)}`; };
function topo() {
  const ini = String(M.nome || 'R').split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  const zap = soDig(M.whatsapp), lg = logoDe(), ab = aberto();
  const info = mesa ? [] : [
    L.delivery !== false && L.tempoEntrega ? `${ico('relogio')}<span>${t(L.tempoEntrega)}</span>` : '',
    L.delivery !== false && faixaTaxa() ? `${ico('moto')}<span>Entrega ${t(faixaTaxa())}</span>` : '',
    L.pedidoMinimo ? `${ico('sacola')}<span>Mínimo ${din(L.pedidoMinimo)}</span>` : '',
  ].filter(Boolean);
  $('#cx-capa').innerHTML = `<div class="cx-banner${L.capa ? '' : ' sem'}" ${L.capa ? `style="background-image:url('${t(L.capa)}')"` : ''} role="img" aria-label="Foto do restaurante"></div>
    <div class="cx-cab"><div class="cx-logo" ${lg ? `style="background-image:url('${t(lg)}')"` : ''}>${lg ? '' : t(ini)}</div>
      <div class="cx-ident"><h1>${t(M.nome)}</h1>${L.boasVindas ? `<p class="cx-sub">${t(L.boasVindas)}</p>` : ''}
        <p class="cx-st"><span class="cx-estado ${ab ? 'on' : 'off'}">${ab ? 'Aberto agora' : 'Fechado agora'}</span><button type="button" class="cx-link" data-horarios>Horários</button>${L.endereco ? `<a class="cx-link" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${L.endereco} ${M.cidade || ''}`)}">Endereço</a>` : ''}${zap ? `<a class="cx-link" target="_blank" rel="noopener" href="https://wa.me/55${zap.replace(/^55/, '')}">WhatsApp</a>` : ''}</p></div></div>
    ${info.length ? `<ul class="cx-info">${info.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}`;
  $('[data-horarios]').onclick = () => folha({ titulo: 'Horários', corpo: `${L.endereco ? `<p class="mudo" style="margin-bottom:10px">${t(L.endereco)}${M.cidade ? ` · ${t(M.cidade)}` : ''}</p>` : ''}<ul class="lista-l">${textoHorarios(L.horarios).map((x) => `<li><div class="tx">${t(x)}</div></li>`).join('')}</ul>` });
}
function opsModo() { return [['delivery', 'Entrega', L.delivery !== false], ['balcao', 'Retirada', L.retirada !== false]].filter((x) => x[2]); }
function caixaModo() {
  const el = $('#cli-modo');
  if (mesa) {
    el.innerHTML = `<div class="cx-mesa"><div><b>Mesa ${mesa}</b><small>${L.aceitaQR === false ? 'Faça o pedido com o garçom' : 'Escolha, mande o pedido e o garçom confere'}</small></div>
      <div class="cx-mesa-bts"><button type="button" class="cx-bt" data-chamar>${ico('sino')}Chamar o garçom</button><button type="button" class="cx-bt" data-conta>${ico('conta')}Ver a conta</button></div></div>`;
    $('[data-chamar]', el).onclick = chamar; $('[data-conta]', el).onclick = verConta; return;
  }
  const ops = opsModo();
  if (!ops.some((x) => x[0] === modo)) modo = ops[0]?.[0] || 'delivery';
  el.innerHTML = ops.length ? `<div class="cx-seg" role="group" aria-label="Como quer receber">${ops.map(([k, n]) => `<button type="button" data-modo="${k}" aria-pressed="${modo === k}">${k === 'delivery' ? ico('moto') : ico('sacola')}<span>${n}</span><small>${k === 'delivery' ? t(L.tempoEntrega || '') : t(L.tempoRetirada || '')}</small></button>`).join('')}</div>`
    : '<p class="cx-nota">Este restaurante não está aceitando pedidos pelo link agora.</p>';
  $$('[data-modo]', el).forEach((b) => { b.onclick = () => { trocarModo(b.dataset.modo); }; });
}
function trocarModo(m) { if (m === modo) return; modo = m; caixaModo(); barra(); }
let obsAbas = null;
function lista() {
  const prods = M.produtos.filter(vendeOnline), qq = busca.toLowerCase();
  const cats = (M.categorias || []).filter((k) => prods.some((p) => p.cat === k.id));
  const pode = !mesa || L.aceitaQR !== false;
  const secs = cats.map((k) => { const l = prods.filter((p) => p.cat === k.id && (!qq || `${p.nome} ${p.desc || ''}`.toLowerCase().includes(qq))); return { k, l }; }).filter((s) => s.l.length);
  $('#cli-cats').innerHTML = secs.map(({ k }, i) => `<a href="#c-${t(k.id)}" data-cat="${t(k.id)}" ${i === 0 ? 'aria-current="true"' : ''}>${t(k.nome)}</a>`).join('');
  $('#cli-lista').innerHTML = secs.map(({ k, l }) => `<section class="cx-sec" id="c-${t(k.id)}" data-sec="${t(k.id)}"><h2>${t(k.nome)}</h2><div class="cx-prods">${l.map((p) => `<button type="button" class="cx-prod" data-pedir="${t(p.id)}" ${pode ? '' : 'data-ver'}>
      <span class="tx"><b class="nm">${t(p.nome)}</b>${p.desc ? `<span class="ds">${t(p.desc)}</span>` : ''}<span class="pr">${p.tamanhos?.length ? '<small>a partir de</small> ' : ''}${din(precoBase(p))}</span></span>
      ${p.foto ? `<img src="${t(p.foto)}" alt="" loading="lazy" width="112" height="112">` : ''}</button>`).join('')}</div></section>`).join('') || `<p class="cx-vazio">${qq ? `Nada encontrado para “${t(busca)}”.` : 'O cardápio ainda está vazio.'}</p>`;
  $$('[data-cat]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); const s = document.getElementById(`c-${a.dataset.cat}`); if (!s) return; const y = s.getBoundingClientRect().top + scrollY - $('#cx-nav').offsetHeight - 8; scrollTo({ top: y, behavior: 'smooth' }); marcarAba(a.dataset.cat); }; });
  $$('[data-pedir]').forEach((b) => { b.onclick = () => escolher(P(b.dataset.pedir), !pode); });
  // a aba da categoria que está na tela fica marcada enquanto a pessoa rola
  obsAbas?.disconnect();
  if ('IntersectionObserver' in window) {
    obsAbas = new IntersectionObserver((es) => { const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) marcarAba(v.target.dataset.sec); }, { rootMargin: '-140px 0px -55% 0px' });
    $$('[data-sec]').forEach((s) => obsAbas.observe(s));
  }
}
function marcarAba(id) {
  $$('#cli-cats a').forEach((a) => { const on = a.dataset.cat === id; if (on) { a.setAttribute('aria-current', 'true'); const n = $('#cli-cats'); n.scrollTo({ left: a.offsetLeft - n.clientWidth / 2 + a.clientWidth / 2, behavior: 'smooth' }); } else a.removeAttribute('aria-current'); });
}

// ------------------------------------------------------------------ telas (produto e sacola): tela cheia no celular, janela no computador
function tela({ cls = '', html, aoAbrir }) {
  const f = document.createElement('div'); f.className = 'cx-tela-fundo';
  f.innerHTML = `<section class="cx-tela ${cls}" role="dialog" aria-modal="true">${html}</section>`;
  document.body.appendChild(f); document.body.classList.add('cx-travado');
  requestAnimationFrame(() => f.classList.add('aberta'));
  const fechar = () => { f.classList.remove('aberta'); document.removeEventListener('keydown', esc); setTimeout(() => { f.remove(); if (!$('.cx-tela-fundo')) document.body.classList.remove('cx-travado'); }, 200); };
  const esc = (e) => { if (e.key === 'Escape') fechar(); };
  document.addEventListener('keydown', esc);
  f.addEventListener('click', (e) => { if (e.target === f || e.target.closest('[data-voltar]')) fechar(); });
  aoAbrir?.(f, fechar);
  return { el: f, fechar };
}
const cabTela = (titulo) => `<header class="cx-tela-cab"><button type="button" class="cx-voltar" data-voltar aria-label="Voltar"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><h2>${t(titulo)}</h2></header>`;

// ------------------------------------------------------------------ produto
const valorLinha = (x) => r2(x.qtd * x.unit);
const subtotal = () => r2(sacola.reduce((s, x) => s + valorLinha(x), 0));
const qtdSacola = () => sacola.reduce((s, x) => s + x.qtd, 0);
const nomeLinha = (x) => { const p = P(x.prod); if (!p) return 'item'; const b = x.meia?.b && P(x.meia.b); return `${b ? `Meia ${p.nome.replace(/^Pizza /i, '').toLowerCase()} / meia ${b.nome.replace(/^Pizza /i, '').toLowerCase()}` : p.nome}${x.tam ? ` (${x.tam})` : ''}`; };
function salvarSacola() { guardado(`sacola-${mesa || 'online'}`, sacola); }
function escolher(p, soVer = false) {
  if (!p) return;
  const fechado = !aberto() && !mesa;
  const fo = formOpcoes(p, { produtos: M.produtos });
  const pode = !soVer && !fechado;
  tela({ cls: 'cx-prod-tela', html: `${p.foto ? `<div class="cx-foto"><img src="${t(p.foto)}" alt=""><button type="button" class="cx-voltar flut" data-voltar aria-label="Voltar"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button></div>` : cabTela(p.nome)}
    <div class="cx-tela-corpo"><div class="cx-prod-info"><h2>${t(p.nome)}</h2>${p.desc ? `<p>${t(p.desc)}</p>` : ''}<b class="pr">${p.tamanhos?.length ? 'a partir de ' : ''}${din(precoBase(p))}</b></div>
      ${pode ? `<div class="cx-ops">${fo.html}</div>` : `<p class="cx-nota">${fechado ? 'O restaurante está fechado agora. Veja os horários na capa.' : 'Peça este prato ao garçom.'}</p>`}</div>
    ${pode ? '<footer class="cx-tela-pe"><div class="cx-pe-qtd" data-qtd-lugar></div><button type="button" class="cx-bt cheio" data-ok><span>Adicionar</span><b data-tot></b></button></footer>' : ''}`,
  aoAbrir: (f, fechar) => {
    if (!pode) return;
    const q = $('.cx-ops > .qtd', f); if (q) $('[data-qtd-lugar]', f).appendChild(q); else $('[data-qtd-lugar]', f).remove();
    $$('.op-grupo', f).forEach((g) => { const em = $('legend em', g); if (em && /obrigat/.test(em.textContent)) g.classList.add('obrig'); });
    const bt = $('[data-ok]', f);
    fo.ligar($('.cx-tela', f), () => { $('[data-tot]', f).textContent = din(fo.total()); });
    bt.onclick = () => { const falta = fo.falta(); if (falta) { toast(falta); const g = $$('.op-grupo.obrig', f).find((x) => !$('input:checked', x)); g?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      const v = fo.valor(); sacola.push({ prod: p.id, qtd: v.qtd, tam: v.tam, meia: v.meia, adic: v.adic, obs: v.obs, unit: r2(fo.total() / v.qtd) }); salvarSacola(); barra(); fechar(); toast(`${v.qtd}× ${p.nome} na sacola`); };
  } });
}

// ------------------------------------------------------------------ sacola fixa (barra embaixo no celular, coluna ao lado no computador)
function itensHtml(editar = true) {
  return `<ul class="cx-itens">${sacola.map((x, k) => `<li><div class="nm"><b>${t(nomeLinha(x))}</b>${x.adic?.length ? `<small>${t(x.adic.map((a) => a.nome.replace(/^[^:]+: /, '')).join(', '))}</small>` : ''}${x.obs ? `<small class="obs">${t(x.obs)}</small>` : ''}<span class="v">${din(valorLinha(x))}</span></div>
    ${editar ? `<div class="cx-mini-qtd"><button type="button" data-menos="${k}" aria-label="${x.qtd === 1 ? 'Tirar' : 'Menos um'}">${x.qtd === 1 ? '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/></svg>' : '−'}</button><b>${x.qtd}</b><button type="button" data-mais="${k}" aria-label="Mais um">+</button></div>` : `<span class="q">${x.qtd}×</span>`}</li>`).join('')}</ul>`;
}
function ligarItens(raiz, depois) {
  $$('[data-menos]', raiz).forEach((b) => { b.onclick = () => { const k = Number(b.dataset.menos), x = sacola[k]; x.qtd--; if (x.qtd <= 0) sacola.splice(k, 1); salvarSacola(); barra(); depois(); }; });
  $$('[data-mais]', raiz).forEach((b) => { b.onclick = () => { const x = sacola[Number(b.dataset.mais)]; x.qtd = Math.min(50, x.qtd + 1); salvarSacola(); barra(); depois(); }; });
}
function barra() {
  const n = qtdSacola(), el = $('#cli-barra'), lado = $('#cx-lado');
  el.innerHTML = n ? `<button type="button" class="cx-bt cheio" data-sacola><span class="cx-cont">${n}</span><span>Ver sacola</span><b>${din(subtotal())}</b></button>` : '';
  el.hidden = !n; document.body.classList.toggle('com-barra', !!n);
  $('[data-sacola]', el)?.addEventListener('click', abrirSacola);
  lado.innerHTML = `<div class="cx-lado-caixa"><h2>Sua sacola</h2>${n ? `${itensHtml(true)}<div class="cx-tot"><div><span>Subtotal</span><b>${din(subtotal())}</b></div></div><button type="button" class="cx-bt cheio" data-sacola2><span>${mesa ? 'Revisar e mandar' : 'Continuar'}</span><b>${din(subtotal())}</b></button>` : `<p class="cx-lado-vazio">${ico('sacola')}Sua sacola está vazia.<br>Escolha um prato no cardápio.</p>`}</div>`;
  ligarItens(lado, () => {}); $('[data-sacola2]', lado)?.addEventListener('click', abrirSacola);
}

// ------------------------------------------------------------------ sacola + finalizar (entrega ou retirada, endereço, pagamento, troco e resumo)
const taxaBairro = (b) => r2((M.bairros || []).find((x) => x.nome === b)?.taxa || 0);
function abrirSacola() {
  if (!sacola.length) return;
  const cli = guardado('cliente') || {};
  const st = { nome: cli.nome || '', tel: cli.tel || '', end: cli.end || '', bairro: cli.bairro || '', pg: (L.pagamentos || [])[0] || '', troco: '', obs: '' };
  const pgs = () => (L.pagamentos || []);
  const nomePg = (f) => (modo === 'balcao' ? f.replace(' na entrega', '') : f);
  const ops = opsModo();
  const corpo = () => `
    <section class="cx-bloco"><div class="cx-bloco-cab"><h3>Seu pedido</h3><button type="button" class="cx-link" data-voltar>Adicionar mais itens</button></div>${itensHtml(true)}</section>
    ${mesa ? `<section class="cx-bloco"><h3>Mesa ${mesa}</h3><label class="cx-campo"><span>Seu nome (opcional)</span><input data-f="nome" maxlength="40" autocomplete="name" value="${t(st.nome)}"></label></section>` : `
    ${ops.length > 1 ? `<section class="cx-bloco"><h3>Como quer receber?</h3><div class="cx-seg">${ops.map(([k, n]) => `<button type="button" data-modo2="${k}" aria-pressed="${modo === k}">${k === 'delivery' ? ico('moto') : ico('sacola')}<span>${n}</span><small>${k === 'delivery' ? t(L.tempoEntrega || '') : t(L.tempoRetirada || '')}</small></button>`).join('')}</div></section>` : ''}
    ${modo === 'delivery' ? `<section class="cx-bloco"><h3>Endereço de entrega</h3>
      <label class="cx-campo"><span>Rua, número e complemento</span><input data-f="end" maxlength="160" autocomplete="street-address" value="${t(st.end)}" placeholder="Ex.: Rua 7, 120, casa dos fundos"></label>
      ${(M.bairros || []).length ? `<label class="cx-campo"><span>Bairro</span><select data-f="bairro"><option value="">Escolha o bairro</option>${M.bairros.map((b) => `<option value="${t(b.nome)}" ${st.bairro === b.nome ? 'selected' : ''}>${t(b.nome)} · entrega ${din(b.taxa)}</option>`).join('')}</select></label>` : ''}</section>`
    : `<section class="cx-bloco"><h3>Retirada no balcão</h3><p class="cx-mudo">${L.endereco ? `${t(L.endereco)}${M.cidade ? ` · ${t(M.cidade)}` : ''}` : t(M.nome)}${L.tempoRetirada ? `<br>Fica pronto em ${t(L.tempoRetirada)}` : ''}</p></section>`}
    <section class="cx-bloco"><h3>Seus dados</h3>
      <label class="cx-campo"><span>Nome</span><input data-f="nome" maxlength="60" autocomplete="name" value="${t(st.nome)}"></label>
      <label class="cx-campo"><span>WhatsApp com DDD</span><input data-f="tel" inputmode="tel" autocomplete="tel" value="${t(st.tel)}" placeholder="16 99999-9999"></label></section>
    ${pgs().length ? `<section class="cx-bloco"><h3>Forma de pagamento</h3><div class="cx-pgs" role="radiogroup" aria-label="Forma de pagamento">${pgs().map((f) => `<label class="cx-pg"><input type="radio" name="pg" value="${t(f)}" ${st.pg === f ? 'checked' : ''}><span>${f === 'Pix' ? ico('pix') : /dinheiro/i.test(f) ? ico('dinheiro') : ico('cartao')}${t(nomePg(f))}</span></label>`).join('')}</div>
      <label class="cx-campo" data-troco-l ${st.pg === 'Dinheiro' ? '' : 'hidden'}><span>Troco para quanto? (deixe vazio se não precisa)</span><input data-f="troco" inputmode="decimal" placeholder="Ex.: 50" value="${t(st.troco)}"></label>
      <p class="cx-mudo cx-pg-nota">O pagamento é feito ${modo === 'delivery' ? 'na entrega' : 'na retirada'}.</p></section>` : ''}`}
    <section class="cx-bloco"><label class="cx-campo"><span>Alguma observação?</span><input data-f="obs" maxlength="140" placeholder="${mesa ? 'Ex.: sem pressa, vamos dividir' : 'Ex.: tocar a campainha'}" value="${t(st.obs)}"></label></section>
    <section class="cx-bloco cx-resumo"><h3>Resumo</h3><div class="cx-tot" data-tot></div></section>`;
  const titulo = mesa ? `Pedido da mesa ${mesa}` : 'Sacola';
  tela({ cls: 'cx-sacola-tela', html: `${cabTela(titulo)}<div class="cx-tela-corpo" data-c></div>
    <footer class="cx-tela-pe"><button type="button" class="cx-bt cheio largo" data-enviar><span>${mesa ? 'Mandar para o garçom' : 'Fazer pedido'}</span><b data-tot2></b></button></footer>`,
  aoAbrir: (f, fechar) => {
    const ler = () => { $$('[data-f]', f).forEach((i) => { st[i.dataset.f] = i.value; }); const r = $('[name=pg]:checked', f); if (r) st.pg = r.value; };
    const taxa = () => (!mesa && modo === 'delivery' ? taxaBairro(st.bairro) : 0);
    const tot = () => {
      const s = subtotal(), tx = taxa(), semBairro = !mesa && modo === 'delivery' && (M.bairros || []).length && !st.bairro;
      $('[data-tot]', f).innerHTML = `<div><span>Subtotal</span><span>${din(s)}</span></div>${!mesa && modo === 'delivery' ? `<div><span>Taxa de entrega</span><span>${semBairro ? 'escolha o bairro' : tx ? din(tx) : 'grátis'}</span></div>` : ''}<div class="total"><span>Total</span><span>${din(s + tx)}</span></div>
        ${!mesa && modo === 'delivery' && L.pedidoMinimo && s < L.pedidoMinimo ? `<p class="cx-nota">O pedido mínimo para entrega é ${din(L.pedidoMinimo)}. Faltam ${din(L.pedidoMinimo - s)}.</p>` : ''}`;
      $('[data-tot2]', f).textContent = din(s + tx);
    };
    const montar = () => {
      $('[data-c]', f).innerHTML = corpo();
      ligarItens(f, () => { if (!sacola.length) return fechar(); ler(); montar(); });
      $$('[data-modo2]', f).forEach((b) => { b.onclick = () => { ler(); modo = b.dataset.modo2; caixaModo(); montar(); }; });
      $$('[name=pg]', f).forEach((r) => { r.onchange = () => { st.pg = r.value; $('[data-troco-l]', f).hidden = r.value !== 'Dinheiro'; }; });
      $$('[data-f]', f).forEach((i) => { i.addEventListener('input', () => { st[i.dataset.f] = i.value; if (i.dataset.f === 'bairro') tot(); }); i.addEventListener('change', () => { st[i.dataset.f] = i.value; tot(); }); });
      tot();
    };
    montar();
    $('[data-enviar]', f).onclick = async (e) => {
      ler();
      const bt = e.currentTarget; const nome = st.nome.trim(), obs = st.obs.trim();
      const itens = sacola.map((x) => ({ prod: x.prod, qtd: x.qtd, tam: x.tam || '', meia: x.meia || null, adic: x.adic || [], obs: [x.obs, obs && sacola.length === 1 ? obs : ''].filter(Boolean).join(', ') }));
      const avisa = (msg, sel) => { toast(msg); const i = sel && $(sel, f); if (i) { i.focus(); i.scrollIntoView({ behavior: 'smooth', block: 'center' }); } };
      let dados = null;
      if (!mesa) {
        const tel = soDig(st.tel), end = st.end.trim(), bairro = st.bairro;
        if (modo === 'delivery' && !end) return avisa('Escreva o endereço', '[data-f=end]');
        if (modo === 'delivery' && (M.bairros || []).length && !bairro) return avisa('Escolha o bairro', '[data-f=bairro]');
        if (nome.length < 2) return avisa('Escreva seu nome', '[data-f=nome]');
        if (tel.length < 10) return avisa('Escreva seu WhatsApp com DDD', '[data-f=tel]');
        if (modo === 'delivery' && L.pedidoMinimo && subtotal() < L.pedidoMinimo) return toast(`O pedido mínimo para entrega é ${din(L.pedidoMinimo)}`);
        const pg = st.pg || '', troco = pg === 'Dinheiro' ? r2(num(st.troco)) : 0;
        if (troco && troco < subtotal() + taxa()) return avisa(`O troco precisa ser para mais de ${din(subtotal() + taxa())}`, '[data-f=troco]');
        guardado('cliente', { nome, tel, end, bairro });
        dados = { nome, tel, end, bairro, pagar: `${pg}${troco ? ` (troco para ${din(troco)})` : ''}`, troco, itens: obs && sacola.length > 1 ? [...itens.slice(0, -1), { ...itens.at(-1), obs: [itens.at(-1).obs, obs].filter(Boolean).join(', ') }] : itens };
      } else if (obs && sacola.length > 1) itens[itens.length - 1].obs = [itens.at(-1).obs, obs].filter(Boolean).join(', ');
      bt.disabled = true; const txt = bt.innerHTML; bt.innerHTML = '<span>Mandando…</span>';
      const msg = textoZap(dados, nome, obs);
      try {
        const r = mesa ? await api.mesa(itens) : await api.pedido(modo, dados);
        if (r?.erro) throw new Error(r.erro);
        sacola = []; salvarSacola(); barra(); fechar(); confirmado(r, msg);
      } catch (er) { bt.disabled = false; bt.innerHTML = txt; mostrarFalha(msg, er); }
    };
  } });
}
// o pedido escrito para o WhatsApp do restaurante
function textoZap(d, nome, obs) {
  const L1 = [`*Pedido ${mesa ? `da mesa ${mesa}` : modo === 'delivery' ? 'para entrega' : 'para retirar'}*${nome ? ` · ${nome}` : ''}`, ''];
  sacola.forEach((x) => { L1.push(`${x.qtd}× ${nomeLinha(x)} · ${din(valorLinha(x))}`); if (x.adic?.length) L1.push(`   ${x.adic.map((a) => a.nome.replace(/^[^:]+: /, '')).join(', ')}`); if (x.obs) L1.push(`   Obs.: ${x.obs}`); });
  const tx = d && modo === 'delivery' ? taxaBairro(d.bairro) : 0;
  L1.push('', `Itens: ${din(subtotal())}`); if (tx) L1.push(`Entrega: ${din(tx)}`); L1.push(`*Total: ${din(subtotal() + tx)}*`);
  if (d) { L1.push('', `Nome: ${d.nome}`, `WhatsApp: ${d.tel}`); if (modo === 'delivery') L1.push(`Endereço: ${d.end}${d.bairro ? ` · ${d.bairro}` : ''}`); if (d.pagar) L1.push(`Pagamento: ${d.pagar}`); }
  if (obs) L1.push(`Obs.: ${obs}`);
  L1.push('', `_Pedido feito pelo cardápio online${M.marca ? '' : ' (Popina)'}_`);
  return L1.join('\n');
}
const linkZap = (msg) => { const z = soDig(M.whatsapp); return z ? `https://wa.me/55${z.replace(/^55/, '')}?text=${encodeURIComponent(msg)}` : ''; };
function mostrarFalha(msg, er) {
  const z = linkZap(msg);
  folha({ titulo: 'Não deu para mandar agora', corpo: `<p class="aviso perigo">${t(er?.message === 'rede' || /fetch/i.test(er?.message || '') ? 'Sem internet ou o sistema do restaurante não respondeu.' : er?.message || 'Tente de novo.')}</p>${z ? '<p style="margin-top:12px">Você pode mandar o mesmo pedido pelo WhatsApp do restaurante:</p>' : ''}`,
    pe: z ? `<a class="bt ok grande" target="_blank" rel="noopener" href="${t(z)}" data-fechar>${ico('zap')}Mandar pelo WhatsApp</a>` : '<button type="button" class="bt grande" data-fechar>Voltar</button>' });
}
const ETAPAS = { recebido: 'Recebido', confirmado: 'O garçom confirmou', preparo: 'Preparando', pronto: 'Pronto', saiu: 'Saiu para entrega', entregue: 'Entregue', agendado: 'Agendado' };
function confirmado(r, msg) {
  const z = linkZap(msg);
  folha({ titulo: 'Pedido recebido!', corpo: `<div style="text-align:center"><div style="color:var(--ok);display:grid;place-items:center">${ico('okcirc', 'style="width:64px;height:64px"')}</div>
    <p style="font-size:19px;font-weight:700;margin:8px 0">${mesa ? 'O garçom já vai conferir o seu pedido.' : `Pedido nº ${t(r.num || '')}${r.senha ? ` · senha ${t(r.senha)}` : ''}`}</p>
    ${!mesa ? `<p class="mudo">${modo === 'delivery' ? (L.tempoEntrega ? `Chega em ${t(L.tempoEntrega)}.` : '') : (L.tempoRetirada ? `Fica pronto em ${t(L.tempoRetirada)}.` : '')}</p>` : ''}
    <p style="margin-top:12px"><span class="etq novo" data-etapa>Recebido</span></p></div>
    ${z ? '<p class="mudo" style="margin-top:16px;text-align:center">Quer garantir? Mande também uma cópia no WhatsApp do restaurante:</p>' : ''}`,
  pe: `${z ? `<a class="bt ok grande" target="_blank" rel="noopener" href="${t(z)}">${ico('zap')}Mandar no WhatsApp</a>` : ''}<button type="button" class="bt grande" data-fechar>Fechar</button>`,
  aoAbrir: (f) => {
    const id = r.id; if (!id) return;
    const ver = () => { if (!document.body.contains(f)) return clearInterval(tm); api.status(id, mesa ? 'mesa' : modo).then((s) => { const e = $('[data-etapa]', f); if (e && s?.etapa) e.textContent = s.etapa === 'pronto' && modo === 'balcao' ? 'Pronto para retirar' : ETAPAS[s.etapa] || s.etapa; }).catch(() => {}); };
    const tm = setInterval(ver, 8000); ver();
  } });
}
async function chamar() { try { const r = await api.chamar(); toast(r?.erro ? r.erro : 'O garçom foi chamado'); } catch { toast('Sem internet agora. Chame o garçom com a mão.'); } }
async function verConta() {
  try {
    const c = await api.conta();
    folha({ titulo: `Conta da mesa ${mesa}`, corpo: c.itens.length ? `<ul class="itens">${c.itens.map((i) => `<li><span class="q">${i.qtd}×</span><div class="nm"><b>${t(i.nome)}</b></div><span class="v">${din(i.valor)}</span></li>`).join('')}</ul>
      <div class="totais"><div><span>Itens</span><span>${din(c.sub)}</span></div>${c.servico ? `<div><span>Serviço</span><span>${din(c.servico)}</span></div>` : ''}${c.pago ? `<div><span>Já pago</span><span>${din(c.pago)}</span></div>` : ''}<div class="total"><span>Total</span><span>${din(c.total - (c.pago || 0))}</span></div></div>` : '<p class="vazio">Nada na conta ainda.</p>',
    pe: c.itens.length ? '<button type="button" class="bt cheio grande" data-pedir-conta>Pedir a conta</button>' : '',
    aoAbrir: (f, fechar) => { $('[data-pedir-conta]', f)?.addEventListener('click', async () => { await api.pedirConta().catch(() => null); fechar(); toast('Pronto! O garçom vai trazer a conta.'); }); } });
  } catch { toast('Sem internet agora. Peça a conta ao garçom.'); }
}
function rodape() {
  $('#cli-rodape').innerHTML = `${M.marca ? '' : '<p>Cardápio feito com o Popina</p>'}${R ? '' : '<p><a href="fotos/CREDITOS.md" target="_blank" rel="noopener">Créditos das fotos</a></p>'}`;
}

// ------------------------------------------------------------------ começo
addEventListener('error', (e) => { if (e.target.tagName === 'IMG') e.target.remove(); }, true);
$('#cli-q').addEventListener('input', (e) => { busca = e.target.value.trim(); lista(); });
function aviso() { $('#cli-aviso').innerHTML = `${!aberto() && !mesa ? '<p class="cx-nota">Fechado agora. Você pode olhar o cardápio; os pedidos abrem no horário.</p>' : ''}${L.aviso ? `<p class="cx-nota azul">${t(L.aviso)}</p>` : ''}`; }
function carregarSacola() {
  // sacola guardada: a nova (uma só para entrega e retirada) ou a antiga (separada por modo)
  sacola = guardado(`sacola-${mesa || 'online'}`) || (!mesa && (guardado('sacola-delivery') || guardado('sacola-balcao'))) || [];
  sacola = (Array.isArray(sacola) ? sacola : []).filter((x) => P(x.prod) && x.qtd > 0);
}
function tudo() { aplicarCor(); topo(); caixaModo(); aviso(); lista(); rodape(); carregarSacola(); barra(); }
async function iniciar() {
  if (!R) {
    loja = await import('./loja.js?v=45'); doExemplo();
    loja.ouvir(() => { doExemplo(); if (!document.querySelector('.folha-fundo, .cx-tela-fundo')) { aplicarCor(); topo(); lista(); } });
    tudo(); return;
  }
  try { await daNuvem(); } catch (e) { $('#cli-lista').innerHTML = `<p class="cx-vazio">${t(e.message === 'rede' || /fetch/i.test(e.message) ? 'Sem internet agora. Confira a conexão e recarregue a página.' : e.message)}</p>`; return; }
  tudo();
  // preço, esgotado ou horário mudou no restaurante: atualiza a cada minuto
  setInterval(() => { if (document.visibilityState === 'visible' && !document.querySelector('.folha-fundo, .cx-tela-fundo')) daNuvem().then(() => { aplicarCor(); topo(); aviso(); lista(); }).catch(() => {}); }, 60000);
}
iniciar();
