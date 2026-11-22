// Popina · cardápio do cliente (estrutura dos cardápios de delivery mais usados: capa, busca, destaques, abas que grudam, foto à direita,
// tela do produto com opções, sacola fixa, cupom, finalizar curto, agendar com a loja fechada e acompanhar o pedido).
// ?mesa=N: pede da mesa (o garçom confere), chama o garçom e pede a conta.  Sem mesa: entrega ou retirada, com taxa por bairro e troco.
// r=<restaurante>: o cardápio de verdade (nuvem). Sem r: o restaurante de exemplo deste aparelho (demonstração; ?fechado=1 simula a loja fechada).
// Todo pedido também pode ir para o WhatsApp do restaurante (link wa.me com o pedido escrito).
// COMPATIBILIDADE: o pedido continua com os mesmos campos (nome, tel, end, bairro, pagar, troco, itens). Os novos (ref, cupom, desconto,
// taxa, total, agendado) só se somam; o que o sistema do dono ainda não lê vai também escrito no endereço, no pagamento e na observação.
import { ico, folha, toast, $, $$ } from './ui.js?v=47';
import { formOpcoes, abertoAgora, textoHorarios, precoTamP, DIAS } from './opcoes.js?v=47';

const q = new URLSearchParams(location.search);
const R = /^[0-9a-f-]{36}$/i.test(q.get('r') || '') ? q.get('r') : '';
const mesa = Math.max(0, parseInt(q.get('mesa'), 10) || 0);
const demoFechado = !R && q.get('fechado') === '1';
const CHAVE_LOCAL = `popina-cli-${R || 'exemplo'}`;
const din = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const t = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const soDig = (s) => String(s || '').replace(/\D/g, '');
const num = (v) => { const s = String(v ?? '').trim(); return Number(/,/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s) || 0; };
let M = null, L = null, modo = mesa ? 'mesa' : 'delivery', sacola = [], busca = '', loja = null, maisPedidos = new Set();
const P = (id) => M.produtos.find((p) => p.id === id);
const guardado = (k, v) => { try { const o = JSON.parse(localStorage.getItem(CHAVE_LOCAL) || '{}'); if (v === undefined) return o[k]; if (v === null) delete o[k]; else o[k] = v; localStorage.setItem(CHAVE_LOCAL, JSON.stringify(o)); } catch { /* sem acesso */ } return undefined; };
const LOJA_PADRAO = { cor: '#1B6B4A', horarios: [], aceitaQR: true, delivery: true, retirada: true, pagamentos: ['Pix', 'Cartão na entrega', 'Dinheiro'], pedidoMinimo: 0, tempoEntrega: '', tempoRetirada: '' };
const SVG_COMP = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1"/></svg>';
const SVG_LAPIS = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>';

// só na demonstração: bairros de Orlândia e de Sales Oliveira e dois cupons para testar (o restaurante de verdade usa os dele)
const BAIRROS_DEMO = [['Centro', 4, 'Orlândia'], ['Jardim Boa Vista', 5, 'Orlândia'], ['Vila Nova', 6, 'Orlândia'], ['Parque dos Ipês', 7, 'Orlândia'], ['Distrito Industrial', 10, 'Orlândia'],
  ['Centro de Sales Oliveira', 12, 'Sales Oliveira'], ['Jardim Paulista (Sales Oliveira)', 14, 'Sales Oliveira']].map(([nome, taxa, cidade]) => ({ nome, taxa, cidade }));
const CUPONS_DEMO = [{ codigo: 'BEMVINDO', tipo: 'pct', valor: 10, minimo: 30, txt: '10% de desconto em pedidos a partir de R$ 30' }, { codigo: 'FRETEGRATIS', tipo: 'frete', minimo: 50, txt: 'Entrega grátis a partir de R$ 50' }];

// ------------------------------------------------------------------ de onde vem o cardápio
async function rpc(fn, args) {
  const c = window.NEXO_NUVEM;
  const r = await fetch(`${c.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: c.chave, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error('rede');
  return r.json();
}
function doExemplo() {
  const { db, lojaCfg } = loja;
  // os esgotados (desligados no cadastro) aparecem como indisponíveis, igual aos cardápios de delivery
  M = { nome: db.config.nome, cidade: db.config.cidade, servico: db.config.servico, whatsapp: db.config.whatsapp, loja: lojaCfg(), categorias: db.categorias, produtos: db.produtos, bairros: db.exemplo ? BAIRROS_DEMO : db.bairros };
  L = { ...LOJA_PADRAO, ...M.loja };
  const c = {}; (db.vendas || []).slice(-500).forEach((v) => (v.itens || []).forEach((i) => { if (i.prod) c[i.prod] = (c[i.prod] || 0) + (Number(i.qtd) || 1); }));
  maisPedidos = new Set([...Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id), ...M.produtos.filter((p) => p.maisPedido).map((p) => p.id)]);
}
async function daNuvem() {
  const d = await rpc('popina_cardapio', { p_espaco: R });
  if (d.erro) throw new Error(d.erro);
  M = { ...d, produtos: d.produtos || [] }; L = { ...LOJA_PADRAO, ...(d.loja || {}) };
  maisPedidos = new Set([...(Array.isArray(d.maisPedidos) ? d.maisPedidos : []), ...M.produtos.filter((p) => p.maisPedido).map((p) => p.id)]);
}
// as ações: no exemplo gravam neste aparelho (como se fosse o restaurante); no restaurante de verdade vão para a fila da nuvem
const api = {
  async mesa(itens) { if (R) return rpc('popina_pedir', { p_espaco: R, p_tipo: 'mesa', p_mesa: mesa, p_dados: { itens } }); const { db, uid, grava } = loja; const id = uid('q'); db.pedidosQR.push({ id, mesa, ts: Date.now(), nome: `Mesa ${mesa} (QR)`, itens }); grava(); return { ok: true, id }; },
  async pedido(tipo, d) {
    if (R) return rpc('popina_pedir', { p_espaco: R, p_tipo: tipo, p_mesa: null, p_dados: d });
    const { novoPedido, adicionarItem, itensLimpos } = loja;
    const c = novoPedido(tipo, { nome: d.nome, tel: d.tel, end: d.end, bairro: d.bairro }, { origem: 'Cardápio online', pagarNaEntrega: d.pagar, ...(tipo === 'balcao' ? { modo: 'retirada' } : {}), ...(d.troco > 0 ? { trocoPara: d.troco } : {}),
      ...(tipo === 'delivery' && d.taxa > 0 ? { taxaEntrega: d.taxa } : {}), ...(d.desconto > 0 ? { desconto: d.desconto, cupom: d.cupom } : {}), ...(d.agendado ? { agendadoPara: d.agendado.ts } : {}) });
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
    const rec = (db.recusados || []).find((x) => x.id === id); if (rec) return { etapa: 'recusado', motivo: rec.motivo || '' };
    const c = comanda(id); if (!c) return { etapa: db.vendas.some((v) => v.id === id) ? 'entregue' : 'recebido' };
    if (c.entrega === 'entregue') return { etapa: 'entregue' };
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

// ------------------------------------------------------------------ horários: aberto, próxima abertura e horários para agendar
const pausada = () => { const p = L.pausada; return !!(p && (!p.ate || Number(p.ate) > Date.now())); }; // dono pausou os pedidos online
const aberto = () => !pausada() && (R ? abertoAgora(L.horarios) : !demoFechado); // na demonstração fica aberto (para testar a qualquer hora), salvo ?fechado=1
const temHorarios = () => Array.isArray(L.horarios) && L.horarios.some((d) => d?.length);
const hm = (s) => { const [a, b] = String(s || '0:0').split(':').map(Number); return (a || 0) * 60 + (b || 0); };
function turnos(dias = 8) {
  const l = [], hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  for (let k = 0; k < dias; k++) {
    const d = new Date(hoje); d.setDate(d.getDate() + k);
    (L.horarios?.[d.getDay()] || []).forEach(([a, f]) => { const ini = new Date(d); ini.setHours(0, hm(a)); let fm = hm(f); if (fm <= hm(a)) fm += 1440; const fim = new Date(d); fim.setHours(0, fm); l.push({ ini, fim }); });
  }
  return l.sort((a, b) => a.ini - b.ini);
}
const diaTxt = (d) => { const h = new Date(); h.setHours(0, 0, 0, 0); const x = new Date(d); x.setHours(0, 0, 0, 0); const k = Math.round((x - h) / 864e5); return k === 0 ? 'hoje' : k === 1 ? 'amanhã' : DIAS[x.getDay()].toLowerCase(); };
const horaTxt = (d) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dataCurta = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const quandoTxt = (ts) => `${diaTxt(ts)}${['hoje', 'amanhã'].includes(diaTxt(ts)) ? '' : ` ${dataCurta(ts)}`} às ${horaTxt(ts)}`;
function proximaAbertura() { const agora = Date.now(); return turnos().find((x) => x.ini > agora)?.ini || null; }
// horários para agendar: de 30 em 30 min dentro dos turnos dos próximos dias (a partir de 45 min de agora)
function horariosAgendar() {
  if (!temHorarios() || L.agendar === false) return [];
  const desde = Date.now() + 45 * 60000, l = [];
  for (const x of turnos()) {
    let s = new Date(Math.max(x.ini.getTime() + 30 * 60000, desde)); s.setSeconds(0, 0); const m = s.getMinutes(); if (m % 30) s.setMinutes(m + (30 - (m % 30)));
    for (; s.getTime() <= x.fim.getTime() - 15 * 60000 && l.length < 60; s = new Date(s.getTime() + 30 * 60000)) l.push(s.getTime());
    if (new Set(l.map((v) => new Date(v).toDateString())).size > 3) break;
  }
  return l.filter((v, i, a) => a.indexOf(v) === i);
}
const podeAgendar = () => !mesa && horariosAgendar().length > 0;

// ------------------------------------------------------------------ capa, modo e lista
const precoBase = (p) => (p.tamanhos?.length ? Math.min(...p.tamanhos.map((x) => Number(x.preco) || 0)) : Number(p.preco) || 0);
const vendeOnline = (p) => !p.porKg;
const disponivel = (p) => !!p && p.ativo !== false && !p.esgotado;
const ehNovo = (p) => !!p.novo || (Number(p.criado) > 0 && Date.now() - Number(p.criado) < 21 * 864e5);
const selos = (p) => (!disponivel(p) ? '<i class="cx-selo off">Esgotado</i>' : `${maisPedidos.has(p.id) ? '<i class="cx-selo mais">Mais pedido</i>' : ''}${ehNovo(p) ? '<i class="cx-selo novo">Novo</i>' : ''}`);
const logoDe = () => L.logo || (!R ? 'img/c-logo-exemplo.webp' : '');
const faixaTaxa = () => { const l = (M.bairros || []).map((b) => Number(b.taxa) || 0); if (!l.length) return ''; const a = Math.min(...l), b = Math.max(...l); return a === b ? din(a) : `${din(a)} a ${din(b)}`; };
const linkCardapio = () => `${location.origin}${location.pathname}${R ? `?r=${R}` : ''}`;
async function compartilhar() {
  const url = linkCardapio(), dados = { title: M.nome, text: `Cardápio de ${M.nome}: faça seu pedido pelo link`, url };
  try { if (navigator.share) { await navigator.share(dados); return; } } catch (e) { if (e?.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); toast('Link do cardápio copiado'); } catch { folha({ titulo: 'Link do cardápio', corpo: `<p class="mudo">Copie e mande para quem quiser:</p><p style="margin-top:8px;word-break:break-all;font-weight:700">${t(url)}</p>` }); }
}
function topo() {
  const ini = String(M.nome || 'R').split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  const zap = soDig(M.whatsapp), lg = logoDe(), ab = aberto(), prox = !ab ? proximaAbertura() : null;
  const info = mesa ? [] : [
    L.delivery !== false && L.tempoEntrega ? `${ico('relogio')}<span>${t(L.tempoEntrega)}</span>` : '',
    L.delivery !== false && faixaTaxa() ? `${ico('moto')}<span>Entrega ${t(faixaTaxa())}</span>` : '',
    L.pedidoMinimo ? `${ico('sacola')}<span>Mínimo ${din(L.pedidoMinimo)}</span>` : '',
  ].filter(Boolean);
  $('#cx-capa').innerHTML = `<div class="cx-banner${L.capa ? '' : ' sem'}" ${L.capa ? `style="background-image:url('${t(L.capa)}')"` : ''} role="img" aria-label="Foto do restaurante"></div>
    <div class="cx-cab"><div class="cx-logo" ${lg ? `style="background-image:url('${t(lg)}')"` : ''}>${lg ? '' : t(ini)}</div>
      <div class="cx-ident"><h1>${t(M.nome)}</h1>${L.boasVindas ? `<p class="cx-sub">${t(L.boasVindas)}</p>` : ''}
        <p class="cx-st"><span class="cx-estado ${ab ? 'on' : 'off'}">${ab ? 'Aberto agora' : `Fechado${prox ? ` · abre ${quandoTxt(prox)}` : ' agora'}`}</span><button type="button" class="cx-link" data-horarios>Horários</button>${L.endereco ? `<a class="cx-link" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${L.endereco} ${M.cidade || ''}`)}">Endereço</a>` : ''}${zap ? `<a class="cx-link" target="_blank" rel="noopener" href="https://wa.me/55${zap.replace(/^55/, '')}">WhatsApp</a>` : ''}${mesa ? '' : `<button type="button" class="cx-link" data-compartilhar>${SVG_COMP}Compartilhar</button>`}</p></div></div>
    ${info.length ? `<ul class="cx-info">${info.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}`;
  $('[data-horarios]').onclick = () => folha({ titulo: 'Horários', corpo: `${L.endereco ? `<p class="mudo" style="margin-bottom:10px">${t(L.endereco)}${M.cidade ? ` · ${t(M.cidade)}` : ''}</p>` : ''}<ul class="lista-l">${textoHorarios(L.horarios).map((x, k) => `<li${k === new Date().getDay() ? ' style="font-weight:800"' : ''}><div class="tx">${t(x)}</div></li>`).join('')}</ul>` });
  $('[data-compartilhar]')?.addEventListener('click', compartilhar);
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
const linhaProd = (p, pode) => `<button type="button" class="cx-prod${disponivel(p) ? '' : ' indisp'}" data-pedir="${t(p.id)}" ${pode ? '' : 'data-ver'} ${disponivel(p) ? '' : 'aria-disabled="true"'}>
      <span class="tx"><b class="nm">${t(p.nome)}</b>${selos(p) ? `<span class="cx-selos">${selos(p)}</span>` : ''}${p.desc ? `<span class="ds">${t(p.desc)}</span>` : ''}<span class="pr">${p.tamanhos?.length ? '<small>a partir de</small> ' : ''}${din(precoBase(p))}</span></span>
      ${p.foto ? `<img src="${t(p.foto)}" alt="" loading="lazy" width="112" height="112">` : ''}</button>`;
function lista() {
  const prods = M.produtos.filter(vendeOnline), qq = busca.toLowerCase();
  const cats = (M.categorias || []).filter((k) => prods.some((p) => p.cat === k.id));
  const pode = !mesa || L.aceitaQR !== false;
  // disponíveis primeiro; os esgotados descem para o fim da categoria
  const secs = cats.map((k) => { const l = prods.filter((p) => p.cat === k.id && (!qq || `${p.nome} ${p.desc || ''}`.toLowerCase().includes(qq))).sort((a, b) => disponivel(b) - disponivel(a)); return { k, l }; }).filter((s) => s.l.length);
  const dest = qq ? [] : prods.filter((p) => disponivel(p) && (p.destaque || maisPedidos.has(p.id))).sort((a, b) => maisPedidos.has(b.id) - maisPedidos.has(a.id)).slice(0, 8);
  $('#cli-cats').innerHTML = [...(dest.length ? [['destaques', 'Destaques']] : []), ...secs.map(({ k }) => [k.id, k.nome])].map(([id, nome], i) => `<a href="#c-${t(id)}" data-cat="${t(id)}" ${i === 0 ? 'aria-current="true"' : ''}>${t(nome)}</a>`).join('');
  $('#cli-lista').innerHTML = (dest.length ? `<section class="cx-sec cx-dest" id="c-destaques" data-sec="destaques"><h2>Destaques</h2><div class="cx-dest-rolo">${dest.map((p) => `<button type="button" class="cx-card" data-pedir="${t(p.id)}" ${pode ? '' : 'data-ver'}>
      ${p.foto ? `<img src="${t(p.foto)}" alt="" loading="lazy" width="200" height="140">` : '<span class="cx-card-sem"></span>'}<span class="cx-selos">${selos(p) || (p.destaque ? '<i class="cx-selo mais">Destaque</i>' : '')}</span><b class="nm">${t(p.nome)}</b><span class="pr">${p.tamanhos?.length ? '<small>a partir de</small> ' : ''}${din(precoBase(p))}</span></button>`).join('')}</div></section>` : '')
    + (secs.map(({ k, l }) => `<section class="cx-sec" id="c-${t(k.id)}" data-sec="${t(k.id)}"><h2>${t(k.nome)}</h2><div class="cx-prods">${l.map((p) => linhaProd(p, pode)).join('')}</div></section>`).join('') || `<p class="cx-vazio">${qq ? `Nada encontrado para “${t(busca)}”.` : 'O cardápio ainda está vazio.'}</p>`);
  $$('[data-cat]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); const s = document.getElementById(`c-${a.dataset.cat}`); if (!s) return; const y = s.getBoundingClientRect().top + scrollY - $('#cx-nav').offsetHeight - 8; scrollTo({ top: y, behavior: 'smooth' }); marcarAba(a.dataset.cat); }; });
  $$('[data-pedir]').forEach((b) => { b.onclick = () => { const p = P(b.dataset.pedir); if (!disponivel(p)) return toast(`${p?.nome || 'Este item'} está esgotado no momento`); escolher(p, { soVer: !pode }); }; });
  obsAbas?.disconnect();
  if ('IntersectionObserver' in window) {
    obsAbas = new IntersectionObserver((es) => { const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) marcarAba(v.target.dataset.sec); }, { rootMargin: '-140px 0px -55% 0px' });
    $$('[data-sec]').forEach((s) => obsAbas.observe(s));
  }
}
function marcarAba(id) {
  $$('#cli-cats a').forEach((a) => { const on = a.dataset.cat === id; if (on) { a.setAttribute('aria-current', 'true'); const n = $('#cli-cats'); n.scrollTo({ left: a.offsetLeft - n.clientWidth / 2 + a.clientWidth / 2, behavior: 'smooth' }); } else a.removeAttribute('aria-current'); });
}

// ------------------------------------------------------------------ telas (produto, sacola, acompanhar): tela cheia no celular, janela no computador
function tela({ cls = '', html, aoAbrir, aoFechar }) {
  const f = document.createElement('div'); f.className = 'cx-tela-fundo';
  f.innerHTML = `<section class="cx-tela ${cls}" role="dialog" aria-modal="true">${html}</section>`;
  document.body.appendChild(f); document.body.classList.add('cx-travado');
  requestAnimationFrame(() => f.classList.add('aberta'));
  const fechar = () => { f.classList.remove('aberta'); document.removeEventListener('keydown', esc); aoFechar?.(); setTimeout(() => { f.remove(); if (!$('.cx-tela-fundo')) document.body.classList.remove('cx-travado'); }, 200); };
  const esc = (e) => { if (e.key === 'Escape' && f === $$('.cx-tela-fundo').at(-1)) fechar(); };
  document.addEventListener('keydown', esc);
  f.addEventListener('click', (e) => { if (e.target === f || e.target.closest('[data-voltar]')?.closest('.cx-tela-fundo') === f) fechar(); });
  aoAbrir?.(f, fechar);
  return { el: f, fechar };
}
const cabTela = (titulo) => `<header class="cx-tela-cab"><button type="button" class="cx-voltar" data-voltar aria-label="Voltar"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><h2>${t(titulo)}</h2></header>`;

// ------------------------------------------------------------------ produto (adicionar ou editar um item da sacola)
const valorLinha = (x) => r2(x.qtd * x.unit);
const subtotal = () => r2(sacola.reduce((s, x) => s + valorLinha(x), 0));
const qtdSacola = () => sacola.reduce((s, x) => s + x.qtd, 0);
const nomeLinha = (x) => { const p = P(x.prod); if (!p) return 'item'; const b = x.meia?.b && P(x.meia.b); return `${b ? `Meia ${p.nome.replace(/^Pizza /i, '').toLowerCase()} / meia ${b.nome.replace(/^Pizza /i, '').toLowerCase()}` : p.nome}${x.tam ? ` (${x.tam})` : ''}`; };
const mesmaLinha = (a, b) => a.prod === b.prod && (a.tam || '') === (b.tam || '') && JSON.stringify(a.meia || null) === JSON.stringify(b.meia || null) && JSON.stringify(a.adic || []) === JSON.stringify(b.adic || []) && (a.obs || '') === (b.obs || '');
function salvarSacola() { guardado(`sacola-${mesa || 'online'}`, sacola); }
function poeNaSacola(nova) { const igual = sacola.find((x) => mesmaLinha(x, nova)); if (igual) igual.qtd = Math.min(50, igual.qtd + nova.qtd); else sacola.push(nova); }
function escolher(p, { soVer = false, editar = -1, depois } = {}) {
  if (!p) return;
  const ed = editar >= 0 ? sacola[editar] : null;
  const fechado = !aberto() && !mesa, agendavel = fechado && podeAgendar();
  const fo = formOpcoes(p, { produtos: M.produtos });
  const pode = !soVer && disponivel(p) && (!fechado || agendavel);
  const prox = fechado ? proximaAbertura() : null;
  tela({ cls: 'cx-prod-tela', html: `${p.foto ? `<div class="cx-foto"><img src="${t(p.foto)}" alt=""><button type="button" class="cx-voltar flut" data-voltar aria-label="Voltar"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button></div>` : cabTela(p.nome)}
    <div class="cx-tela-corpo"><div class="cx-prod-info">${selos(p) ? `<span class="cx-selos">${selos(p)}</span>` : ''}<h2>${t(p.nome)}</h2>${p.desc ? `<p>${t(p.desc)}</p>` : ''}<b class="pr">${p.tamanhos?.length ? 'a partir de ' : ''}${din(precoBase(p))}</b></div>
      ${agendavel ? `<p class="cx-nota">Fechado agora${prox ? ` (abre ${quandoTxt(prox)})` : ''}. Você pode montar o pedido e agendar o horário.</p>` : ''}
      ${pode ? `<div class="cx-ops">${fo.html}</div>` : `<p class="cx-nota">${!disponivel(p) ? 'Esgotado no momento.' : fechado ? `O restaurante está fechado agora${prox ? ` e abre ${quandoTxt(prox)}` : ''}.` : 'Peça este prato ao garçom.'}</p>`}</div>
    ${pode ? `<footer class="cx-tela-pe"><div class="cx-pe-qtd" data-qtd-lugar></div><button type="button" class="cx-bt cheio" data-ok><span>${ed ? 'Atualizar' : 'Adicionar'}</span><b data-tot></b></button></footer>` : ''}`,
  aoAbrir: (f, fechar) => {
    if (!pode) return;
    const qd = $('.cx-ops > .qtd', f); if (qd) $('[data-qtd-lugar]', f).appendChild(qd); else $('[data-qtd-lugar]', f).remove();
    $$('.op-grupo', f).forEach((g) => { const em = $('legend em', g); if (em && /obrigat/.test(em.textContent)) { g.classList.add('obrig'); const r = em.textContent.replace(/^obrigatório( · )?/, ''); em.textContent = `Escolha ${r || '1'}`; em.insertAdjacentHTML('afterend', '<i class="cx-obrig">Obrigatório</i>'); } });
    const bt = $('[data-ok]', f), atualiza = () => { $('[data-tot]', f).textContent = din(fo.total()); $$('.op-grupo.obrig', f).forEach((g) => g.classList.toggle('feito', !!$('input:checked', g))); };
    fo.ligar($('.cx-tela', f), atualiza);
    if (ed) {
      // editar: volta as escolhas que já estavam no item
      const marca = (sel) => { const i = $(sel, f); if (i) { i.checked = true; i.dispatchEvent(new Event('change')); } };
      if (ed.tam) marca(`[name=tam][value="${CSS.escape(ed.tam)}"]`);
      if (ed.meia?.b) marca(`[name=meia][value="${CSS.escape(ed.meia.b)}"]`);
      const grupos = (p.grupos || []).filter((g) => g?.opcoes?.length);
      (ed.adic || []).forEach((a) => {
        grupos.forEach((g, k) => g.opcoes.forEach((o, j) => { if (`${g.nome}: ${o.nome}` === a.nome) marca(`[name="g${k}"][value="${j}"]`); }));
        (p.adicionais || []).forEach((x, j) => { if (x.nome === a.nome) marca(`[name=adic][value="${j}"]`); });
      });
      const lv = $('[data-livre]', f); if (lv && ed.obs) lv.value = ed.obs;
      for (let n = 1; n < ed.qtd; n++) $('[data-mais]', f)?.click();
      atualiza();
    }
    bt.onclick = () => { const falta = fo.falta(); if (falta) { toast(falta); const g = $$('.op-grupo.obrig', f).find((x) => !$('input:checked', x)); g?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      const v = fo.valor(), nova = { prod: p.id, qtd: v.qtd, tam: v.tam, meia: v.meia, adic: v.adic, obs: v.obs, unit: r2(fo.total() / v.qtd) };
      if (ed) sacola.splice(editar, 1, nova); else poeNaSacola(nova);
      salvarSacola(); barra(); fechar(); depois?.(); toast(ed ? 'Item atualizado' : `${v.qtd}× ${p.nome} na sacola`); };
  } });
}

// ------------------------------------------------------------------ sacola fixa (barra embaixo no celular, coluna ao lado no computador)
const faltaMinimo = () => (!mesa && modo === 'delivery' && L.pedidoMinimo && subtotal() < L.pedidoMinimo ? r2(L.pedidoMinimo - subtotal()) : 0);
function itensHtml(editar = true) {
  return `<ul class="cx-itens">${sacola.map((x, k) => `<li><div class="nm"><b>${t(nomeLinha(x))}</b>${x.adic?.length ? `<small>${t(x.adic.map((a) => a.nome.replace(/^[^:]+: /, '')).join(', '))}</small>` : ''}${x.obs ? `<small class="obs">${t(x.obs)}</small>` : ''}<span class="v">${din(valorLinha(x))}</span>${editar ? `<button type="button" class="cx-link cx-editar" data-editar="${k}">${SVG_LAPIS}Editar</button>` : ''}</div>
    ${editar ? `<div class="cx-mini-qtd"><button type="button" data-menos="${k}" aria-label="${x.qtd === 1 ? 'Tirar' : 'Menos um'}">${x.qtd === 1 ? '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/></svg>' : '−'}</button><b>${x.qtd}</b><button type="button" data-mais="${k}" aria-label="Mais um">+</button></div>` : `<span class="q">${x.qtd}×</span>`}</li>`).join('')}</ul>`;
}
function ligarItens(raiz, depois) {
  $$('[data-menos]', raiz).forEach((b) => { b.onclick = () => { const k = Number(b.dataset.menos), x = sacola[k]; x.qtd--; if (x.qtd <= 0) { sacola.splice(k, 1); toast('Item tirado da sacola'); } salvarSacola(); barra(); depois(); }; });
  $$('[data-mais]', raiz).forEach((b) => { b.onclick = () => { const x = sacola[Number(b.dataset.mais)]; x.qtd = Math.min(50, x.qtd + 1); salvarSacola(); barra(); depois(); }; });
  $$('[data-editar]', raiz).forEach((b) => { b.onclick = () => { const k = Number(b.dataset.editar); escolher(P(sacola[k]?.prod), { editar: k, depois }); }; });
}
function barra() {
  const n = qtdSacola(), el = $('#cli-barra'), lado = $('#cx-lado'), fm = faltaMinimo();
  const aviso = fm ? `<p class="cx-falta">Faltam <b>${din(fm)}</b> para o pedido mínimo de entrega (${din(L.pedidoMinimo)})</p>` : '';
  el.innerHTML = n ? `${aviso}<button type="button" class="cx-bt cheio" data-sacola><span class="cx-cont">${n}</span><span>Ver sacola</span><b>${din(subtotal())}</b></button>` : '';
  el.hidden = !n; document.body.classList.toggle('com-barra', !!n); document.body.classList.toggle('com-falta', !!(n && fm));
  $('[data-sacola]', el)?.addEventListener('click', abrirSacola);
  lado.innerHTML = `<div class="cx-lado-caixa"><h2>Sua sacola</h2>${n ? `${itensHtml(true)}<div class="cx-tot"><div><span>Subtotal</span><b>${din(subtotal())}</b></div></div>${aviso}<button type="button" class="cx-bt cheio" data-sacola2><span>${mesa ? 'Revisar e mandar' : 'Continuar'}</span><b>${din(subtotal())}</b></button>` : `<p class="cx-lado-vazio">${ico('sacola')}Sua sacola está vazia.<br>Escolha um prato no cardápio.</p>`}</div>`;
  ligarItens(lado, () => {}); $('[data-sacola2]', lado)?.addEventListener('click', abrirSacola);
}

// ------------------------------------------------------------------ cupom
const cupons = () => (Array.isArray(L.cupons) ? L.cupons : !R ? CUPONS_DEMO : []).filter((c) => c && c.codigo && c.ativo !== false && !(c.ate && Date.now() > Number(c.ate)));
const acharCupom = (cod) => cupons().find((c) => String(c.codigo).toUpperCase() === String(cod || '').trim().toUpperCase()) || null;
function erroCupom(c, sub) { if (!c) return 'Cupom não encontrado'; if (c.minimo && sub < c.minimo) return `Vale para pedidos a partir de ${din(c.minimo)}`; if (c.tipo === 'frete' && modo !== 'delivery') return 'Este cupom é só para entrega'; return ''; }
function valorCupom(c, sub, taxa) { if (!c || erroCupom(c, sub)) return 0; if (c.tipo === 'frete') return r2(taxa); if (c.tipo === 'pct') return r2(sub * Math.min(100, Number(c.valor) || 0) / 100); return r2(Math.min(sub, Number(c.valor) || 0)); }
const textoCupom = (c) => c.txt || (c.tipo === 'frete' ? 'Entrega grátis' : c.tipo === 'pct' ? `${c.valor}% de desconto` : `${din(c.valor)} de desconto`);

// ------------------------------------------------------------------ sacola + finalizar (entrega ou retirada, endereço, quando, dados, pagamento, cupom e resumo)
const bairroDe = (b) => (M.bairros || []).find((x) => x.nome === b);
const taxaBairro = (b) => r2(bairroDe(b)?.taxa || 0);
const foneBonito = (v) => { const d = soDig(v).slice(0, 11); if (d.length < 3) return d; if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`; if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; };
function opcoesBairro(sel) {
  const bs = M.bairros || [], cidades = [...new Set(bs.map((b) => b.cidade || ''))];
  const op = (b) => `<option value="${t(b.nome)}" ${sel === b.nome ? 'selected' : ''}>${t(b.nome)} · ${Number(b.taxa) ? din(b.taxa) : 'grátis'}</option>`;
  return `<option value="">Escolha o bairro</option>${cidades.length > 1 || cidades[0] ? cidades.map((c) => `<optgroup label="${t(c || 'Outros')}">${bs.filter((b) => (b.cidade || '') === c).map(op).join('')}</optgroup>`).join('') : bs.map(op).join('')}`;
}
function abrirSacola() {
  if (!sacola.length) return;
  const cli = guardado('cliente') || {};
  const fechado = !aberto() && !mesa, slots = mesa ? [] : horariosAgendar();
  const st = { nome: cli.nome || '', tel: cli.tel ? foneBonito(cli.tel) : '', end: cli.end || '', bairro: bairroDe(cli.bairro) ? cli.bairro : '', ref: cli.ref || '', pg: (L.pagamentos || [])[0] || '', troco: '', obs: '', cupom: '', quando: fechado ? String(slots[0] || '') : '' };
  const pgs = () => (L.pagamentos || []);
  const nomePg = (f) => (modo === 'balcao' ? f.replace(' na entrega', ' na retirada') : f);
  const ops = opsModo(), zap = soDig(M.whatsapp);
  const taxa = () => (!mesa && modo === 'delivery' ? taxaBairro(st.bairro) : 0);
  const cupomOk = () => { const c = acharCupom(st.cupom); return c && !erroCupom(c, subtotal()) ? c : null; };
  const desconto = () => valorCupom(cupomOk(), subtotal(), taxa());
  const total = () => r2(subtotal() + taxa() - desconto());
  const gruposSlots = () => { const g = {}; slots.forEach((v) => { const k = new Date(v).toDateString(); (g[k] ||= []).push(v); }); return Object.values(g); };
  const corpo = () => `
    <section class="cx-bloco"><div class="cx-bloco-cab"><h3>Seu pedido</h3><button type="button" class="cx-link" data-voltar>Adicionar mais itens</button></div>${itensHtml(true)}</section>
    ${mesa ? `<section class="cx-bloco"><h3>Mesa ${mesa}</h3><label class="cx-campo"><span>Seu nome (opcional)</span><input data-f="nome" maxlength="40" autocomplete="name" value="${t(st.nome)}"></label></section>` : `
    ${ops.length > 1 ? `<section class="cx-bloco"><h3>Como quer receber?</h3><div class="cx-seg">${ops.map(([k, n]) => `<button type="button" data-modo2="${k}" aria-pressed="${modo === k}">${k === 'delivery' ? ico('moto') : ico('sacola')}<span>${n}</span><small>${k === 'delivery' ? t(L.tempoEntrega || '') : t(L.tempoRetirada || '')}</small></button>`).join('')}</div></section>` : ''}
    ${modo === 'delivery' ? `<section class="cx-bloco"><h3>Endereço de entrega</h3>
      <label class="cx-campo"><span>Rua, número e complemento</span><input data-f="end" maxlength="120" autocomplete="street-address" value="${t(st.end)}" placeholder="Ex.: Rua 7, 120, casa dos fundos"></label>
      ${(M.bairros || []).length ? `<label class="cx-campo"><span>Bairro</span><select data-f="bairro">${opcoesBairro(st.bairro)}</select>${zap ? `<small class="cx-mudo">Não achou o bairro? <a class="cx-link" target="_blank" rel="noopener" href="https://wa.me/55${zap.replace(/^55/, '')}?text=${encodeURIComponent('Olá! Vocês entregam no meu bairro?')}">Pergunte no WhatsApp</a></small>` : ''}</label>` : ''}
      <label class="cx-campo"><span>Ponto de referência (opcional)</span><input data-f="ref" maxlength="60" value="${t(st.ref)}" placeholder="Ex.: perto da padaria, portão azul"></label></section>`
    : `<section class="cx-bloco"><h3>Retirada no balcão</h3><p class="cx-mudo">${L.endereco ? `${t(L.endereco)}${M.cidade ? ` · ${t(M.cidade)}` : ''}` : t(M.nome)}${L.tempoRetirada ? `<br>Fica pronto em ${t(L.tempoRetirada)}` : ''}</p></section>`}
    ${slots.length ? `<section class="cx-bloco"><h3>Quando?</h3>${fechado ? `<p class="cx-mudo" style="margin-bottom:10px">O restaurante está fechado agora. Escolha o horário e o pedido fica agendado.</p>` : ''}
      <div class="cx-pgs" role="radiogroup" aria-label="Quando">${fechado ? '' : `<label class="cx-pg"><input type="radio" name="quando" value="" ${st.quando ? '' : 'checked'}><span>${ico('relogio')}O quanto antes${modo === 'delivery' && L.tempoEntrega ? ` · ${t(L.tempoEntrega)}` : modo === 'balcao' && L.tempoRetirada ? ` · ${t(L.tempoRetirada)}` : ''}</span></label>`}
      <label class="cx-pg"><input type="radio" name="quando" value="agendar" ${st.quando ? 'checked' : ''}><span>${ico('calendario')}Agendar</span></label></div>
      <label class="cx-campo" data-quando-l ${st.quando ? '' : 'hidden'}><span>Horário</span><select data-f="quando">${gruposSlots().map((g) => `<optgroup label="${t(diaTxt(g[0]).replace(/^./, (c) => c.toUpperCase()))} ${dataCurta(g[0])}">${g.map((v) => `<option value="${v}" ${String(v) === st.quando ? 'selected' : ''}>${horaTxt(v)}</option>`).join('')}</optgroup>`).join('')}</select></label></section>` : ''}
    <section class="cx-bloco"><div class="cx-bloco-cab"><h3>Seus dados</h3>${cli.nome ? '<button type="button" class="cx-link" data-esquecer>Esquecer meus dados</button>' : ''}</div>
      <label class="cx-campo"><span>Nome</span><input data-f="nome" maxlength="60" autocomplete="name" value="${t(st.nome)}"></label>
      <label class="cx-campo"><span>WhatsApp com DDD</span><input data-f="tel" inputmode="tel" autocomplete="tel" value="${t(st.tel)}" placeholder="(16) 99999-9999"></label>
      <p class="cx-mudo">Seus dados ficam guardados só neste aparelho para o próximo pedido.</p></section>
    ${pgs().length ? `<section class="cx-bloco"><h3>Forma de pagamento</h3><div class="cx-pgs" role="radiogroup" aria-label="Forma de pagamento">${pgs().map((f) => `<label class="cx-pg"><input type="radio" name="pg" value="${t(f)}" ${st.pg === f ? 'checked' : ''}><span>${f === 'Pix' ? ico('pix') : /dinheiro/i.test(f) ? ico('dinheiro') : ico('cartao')}${t(nomePg(f))}</span></label>`).join('')}</div>
      <label class="cx-campo" data-troco-l ${st.pg === 'Dinheiro' ? '' : 'hidden'}><span>Troco para quanto? (deixe vazio se não precisa)</span><input data-f="troco" inputmode="decimal" placeholder="Ex.: 50" value="${t(st.troco)}"></label>
      <p class="cx-mudo cx-pg-nota">O pagamento é feito ${modo === 'delivery' ? 'na entrega' : 'na retirada'}.</p></section>` : ''}
    ${cupons().length ? `<section class="cx-bloco"><h3>Cupom de desconto</h3><div class="cx-cupom"><input data-f="cupom" maxlength="24" autocapitalize="characters" autocomplete="off" value="${t(st.cupom)}" placeholder="Digite o código" aria-label="Código do cupom"><button type="button" class="cx-bt" data-cupom>Aplicar</button></div><p class="cx-cupom-st" data-cupom-st role="status"></p>${!R ? `<p class="cx-mudo">Na demonstração, teste ${cupons().map((c) => `<b>${t(c.codigo)}</b>`).join(' ou ')}.</p>` : ''}</section>` : ''}`}
    <section class="cx-bloco"><label class="cx-campo"><span>Alguma observação?</span><input data-f="obs" maxlength="140" placeholder="${mesa ? 'Ex.: sem pressa, vamos dividir' : 'Ex.: tocar a campainha'}" value="${t(st.obs)}"></label></section>
    <section class="cx-bloco cx-resumo"><h3>Resumo</h3><div class="cx-tot" data-tot></div></section>`;
  const titulo = mesa ? `Pedido da mesa ${mesa}` : 'Sacola';
  tela({ cls: 'cx-sacola-tela', html: `${cabTela(titulo)}<div class="cx-tela-corpo" data-c></div>
    <footer class="cx-tela-pe"><button type="button" class="cx-bt cheio largo" data-enviar><span>${mesa ? 'Mandar para o garçom' : 'Fazer pedido'}</span><b data-tot2></b></button></footer>`,
  aoAbrir: (f, fechar) => {
    const ler = () => { $$('[data-f]', f).forEach((i) => { if (i.dataset.f !== 'quando' || st.quando) st[i.dataset.f] = i.value; }); const r = $('[name=pg]:checked', f); if (r) st.pg = r.value; };
    const statusCupom = () => {
      const el = $('[data-cupom-st]', f); if (!el) return;
      if (!st.cupom) { el.textContent = ''; el.className = 'cx-cupom-st'; return; }
      const c = acharCupom(st.cupom), e = erroCupom(c, subtotal());
      el.textContent = e || `${c.codigo}: ${textoCupom(c)} (−${din(desconto())})`; el.className = `cx-cupom-st ${e ? 'erro' : 'ok'}`;
    };
    const tot = () => {
      const s = subtotal(), tx = taxa(), ds = desconto(), semBairro = !mesa && modo === 'delivery' && (M.bairros || []).length && !st.bairro, fm = faltaMinimo();
      $('[data-tot]', f).innerHTML = `<div><span>Subtotal</span><span>${din(s)}</span></div>${!mesa && modo === 'delivery' ? `<div><span>Taxa de entrega${st.bairro ? ` (${t(st.bairro)})` : ''}</span><span>${semBairro ? 'escolha o bairro' : tx ? din(tx) : 'grátis'}</span></div>` : ''}${ds ? `<div class="desc"><span>Cupom ${t(cupomOk().codigo)}</span><span>−${din(ds)}</span></div>` : ''}<div class="total"><span>Total</span><span>${din(total())}</span></div>
        ${st.quando && slots.length ? `<p class="cx-nota azul">Agendado para ${t(quandoTxt(Number(st.quando)))}</p>` : ''}
        ${fm ? `<p class="cx-nota">O pedido mínimo para entrega é ${din(L.pedidoMinimo)}. Faltam ${din(fm)}.</p>` : ''}`;
      $('[data-tot2]', f).textContent = din(total()); statusCupom();
    };
    const montar = () => {
      const y = $('[data-c]', f).scrollTop;
      $('[data-c]', f).innerHTML = corpo(); $('[data-c]', f).scrollTop = y;
      ligarItens(f, () => { if (!sacola.length) return fechar(); ler(); montar(); });
      $$('[data-modo2]', f).forEach((b) => { b.onclick = () => { ler(); modo = b.dataset.modo2; caixaModo(); barra(); montar(); }; });
      $$('[name=pg]', f).forEach((r) => { r.onchange = () => { st.pg = r.value; $('[data-troco-l]', f).hidden = r.value !== 'Dinheiro'; }; });
      $$('[name=quando]', f).forEach((r) => { r.onchange = () => { const ag = r.value === 'agendar'; $('[data-quando-l]', f).hidden = !ag; st.quando = ag ? ($('[data-f=quando]', f)?.value || String(slots[0])) : ''; tot(); }; });
      $$('[data-f]', f).forEach((i) => { i.addEventListener('input', () => { if (i.dataset.f === 'quando' && !st.quando) return; st[i.dataset.f] = i.value; if (['bairro', 'quando'].includes(i.dataset.f)) tot(); }); i.addEventListener('change', () => { if (i.dataset.f === 'quando' && !st.quando) return; st[i.dataset.f] = i.value; tot(); }); });
      const tel = $('[data-f=tel]', f); if (tel) tel.addEventListener('input', () => { const p = tel.selectionStart === tel.value.length; tel.value = foneBonito(tel.value); st.tel = tel.value; if (p) tel.setSelectionRange(tel.value.length, tel.value.length); });
      $('[data-cupom]', f)?.addEventListener('click', () => { ler(); st.cupom = st.cupom.trim().toUpperCase(); $('[data-f=cupom]', f).value = st.cupom; tot(); if (cupomOk()) toast('Cupom aplicado'); });
      $('[data-f=cupom]', f)?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('[data-cupom]', f).click(); } });
      $('[data-esquecer]', f)?.addEventListener('click', () => { guardado('cliente', null); Object.assign(st, { nome: '', tel: '', end: '', bairro: '', ref: '' }); Object.keys(cli).forEach((k) => delete cli[k]); montar(); toast('Seus dados foram apagados deste aparelho'); });
      tot();
    };
    montar();
    $('[data-enviar]', f).onclick = async (e) => {
      ler();
      const bt = e.currentTarget; const nome = st.nome.trim(), obs = st.obs.trim();
      const avisa = (msg, sel) => { toast(msg); const i = sel && $(sel, f); if (i) { i.focus(); i.scrollIntoView({ behavior: 'smooth', block: 'center' }); } };
      const ag = !mesa && st.quando && slots.length ? Number(st.quando) : 0;
      if (!mesa && fechado && !ag) return avisa('O restaurante está fechado agora. Escolha um horário para agendar', '[name=quando]');
      const marcaAg = ag ? `Agendado para ${quandoTxt(ag)}` : '';
      const itens = sacola.map((x, k) => ({ prod: x.prod, qtd: x.qtd, tam: x.tam || '', meia: x.meia || null, adic: x.adic || [], obs: [k === 0 ? marcaAg : '', x.obs, obs && k === sacola.length - 1 ? obs : ''].filter(Boolean).join(', ') }));
      let dados = null;
      if (!mesa) {
        const tel = soDig(st.tel), end = st.end.trim(), bairro = st.bairro, ref = st.ref.trim();
        if (modo === 'delivery' && !end) return avisa('Escreva o endereço', '[data-f=end]');
        if (modo === 'delivery' && (M.bairros || []).length && !bairro) return avisa('Escolha o bairro', '[data-f=bairro]');
        if (nome.length < 2) return avisa('Escreva seu nome', '[data-f=nome]');
        if (tel.length < 10) return avisa('Escreva seu WhatsApp com DDD', '[data-f=tel]');
        if (faltaMinimo()) return toast(`O pedido mínimo para entrega é ${din(L.pedidoMinimo)}`);
        if (st.cupom && !cupomOk()) return avisa(erroCupom(acharCupom(st.cupom), subtotal()) || 'Confira o cupom', '[data-f=cupom]');
        const pg = st.pg || '', troco = /dinheiro/i.test(pg) ? r2(num(st.troco)) : 0;
        if (troco && troco < total()) return avisa(`O troco precisa ser para mais de ${din(total())}`, '[data-f=troco]');
        guardado('cliente', { nome, tel, end, bairro, ref });
        const cup = cupomOk(), ds = desconto();
        dados = { nome, tel, end: modo === 'delivery' ? [end, ref ? `Ref.: ${ref}` : ''].filter(Boolean).join(' · ').slice(0, 160) : '', bairro: modo === 'delivery' ? bairro : '',
          pagar: `${pg}${troco ? ` (troco para ${din(troco)})` : ''}${cup ? ` · cupom ${cup.codigo}` : ''}`, troco, itens,
          ref, taxa: taxa(), total: total(), ...(cup ? { cupom: cup.codigo, desconto: ds } : {}), ...(ag ? { agendado: { ts: ag, texto: quandoTxt(ag) } } : {}) };
      }
      bt.disabled = true; const txt = bt.innerHTML; bt.innerHTML = '<span>Mandando…</span>';
      const msg = textoZap(dados, nome, obs, ag);
      try {
        const r = mesa ? await api.mesa(itens) : await api.pedido(modo, dados);
        if (r?.erro) throw new Error(r.erro);
        const feito = { id: r.id, num: r.num || '', senha: r.senha || 0, modo, ts: Date.now(), itens: sacola.map((x) => ({ ...x })), sub: subtotal(), taxa: taxa(), desconto: desconto(), total: total(), msg, agendado: ag || 0, end: dados?.end || '', bairro: dados?.bairro || '', pagar: dados?.pagar || '', etapa: 'recebido' };
        sacola = []; salvarSacola(); barra(); fechar();
        if (mesa) confirmadoMesa(r, msg); else { guardado('ultimo', feito); ultimo(); acompanhar(feito); }
      } catch (er) { bt.disabled = false; bt.innerHTML = txt; mostrarFalha(msg, er); }
    };
  } });
}
// o pedido escrito para o WhatsApp do restaurante
function textoZap(d, nome, obs, ag = 0) {
  const L1 = [`*Pedido ${mesa ? `da mesa ${mesa}` : modo === 'delivery' ? 'para entrega' : 'para retirar'}*${nome ? ` · ${nome}` : ''}`, ''];
  if (ag) L1.splice(1, 0, `*Agendado para ${quandoTxt(ag)}*`);
  sacola.forEach((x) => { L1.push(`${x.qtd}× ${nomeLinha(x)} · ${din(valorLinha(x))}`); if (x.adic?.length) L1.push(`   ${x.adic.map((a) => a.nome.replace(/^[^:]+: /, '')).join(', ')}`); if (x.obs) L1.push(`   Obs.: ${x.obs}`); });
  const tx = d && modo === 'delivery' ? Number(d.taxa) || 0 : 0, ds = Number(d?.desconto) || 0;
  L1.push('', `Itens: ${din(subtotal())}`); if (tx) L1.push(`Entrega: ${din(tx)}`); if (ds) L1.push(`Cupom ${d.cupom}: −${din(ds)}`); L1.push(`*Total: ${din(subtotal() + tx - ds)}*`);
  if (d) { L1.push('', `Nome: ${d.nome}`, `WhatsApp: ${foneBonito(d.tel)}`); if (modo === 'delivery') L1.push(`Endereço: ${d.end}${d.bairro ? ` · ${d.bairro}` : ''}`); if (d.pagar) L1.push(`Pagamento: ${d.pagar}`); }
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
function confirmadoMesa(r, msg) {
  const z = linkZap(msg);
  folha({ titulo: 'Pedido recebido!', corpo: `<div style="text-align:center"><div style="color:var(--ok);display:grid;place-items:center">${ico('okcirc', 'style="width:64px;height:64px"')}</div>
    <p style="font-size:19px;font-weight:700;margin:8px 0">O garçom já vai conferir o seu pedido.</p>
    <p style="margin-top:12px"><span class="etq novo" data-etapa>Recebido</span></p></div>`,
  pe: `${z ? `<a class="bt ok grande" target="_blank" rel="noopener" href="${t(z)}">${ico('zap')}Mandar no WhatsApp</a>` : ''}<button type="button" class="bt grande" data-fechar>Fechar</button>`,
  aoAbrir: (f) => {
    const id = r.id; if (!id) return;
    const ver = () => { if (!document.body.contains(f)) return clearInterval(tm); api.status(id, 'mesa').then((s) => { const e = $('[data-etapa]', f); if (e && s?.etapa) e.textContent = ETAPAS[s.etapa] || s.etapa; }).catch(() => {}); };
    const tm = setInterval(ver, 8000); ver();
  } });
}

// ------------------------------------------------------------------ acompanhar o pedido (lê o status que o sistema do restaurante grava)
const PASSOS = {
  delivery: [['recebido', 'Pedido recebido', 'O restaurante já recebeu o seu pedido.'], ['preparo', 'Em preparo', 'A cozinha está preparando.'], ['saiu', 'Saiu para entrega', 'O entregador está a caminho.'], ['entregue', 'Entregue', 'Bom apetite!']],
  balcao: [['recebido', 'Pedido recebido', 'O restaurante já recebeu o seu pedido.'], ['preparo', 'Em preparo', 'A cozinha está preparando.'], ['pronto', 'Pronto para retirar', 'Pode vir buscar no balcão.'], ['entregue', 'Retirado', 'Bom apetite!']],
};
const idxEtapa = (u) => { const e = u.etapa || 'recebido'; return u.modo === 'delivery' ? ({ recebido: 0, confirmado: 0, agendado: 0, preparo: 1, pronto: 1, saiu: 2, entregue: 3 })[e] ?? 0 : ({ recebido: 0, confirmado: 0, agendado: 0, preparo: 1, pronto: 2, saiu: 2, entregue: 3 })[e] ?? 0; };
const rotuloEtapa = (u) => { if (u.etapa === 'recusado') return 'Pedido recusado pelo restaurante' + (u.motivo ? ': ' + u.motivo : ''); if (u.modo === 'delivery' && u.etapa === 'pronto') return 'Pronto, esperando o entregador'; return (PASSOS[u.modo] || PASSOS.delivery)[idxEtapa(u)][1]; };
const ativo = (u) => u && u.id && !u.fim && Date.now() - u.ts < 12 * 3600e3;
async function lerStatus(u) {
  try { const s = await api.status(u.id, u.modo); if (s?.etapa) { u.etapa = s.etapa; if (s.motivo) u.motivo = s.motivo; if (s.etapa === 'entregue' || s.etapa === 'recusado') u.fim = true; const g = guardado('ultimo'); if (g?.id === u.id) guardado('ultimo', u); } } catch { /* sem internet: fica como estava */ }
  return u;
}
function acompanhar(u) {
  const passos = PASSOS[u.modo] || PASSOS.delivery, z = soDig(M.whatsapp);
  const zapAcomp = () => linkZap(`Olá! Fiz o pedido nº ${u.num} pelo cardápio online e queria falar sobre ele.\n\n${u.msg || ''}`);
  const html = () => { const i = idxEtapa(u);
    return `<div class="cx-acomp-topo"><span class="cx-acomp-ico">${ico(u.fim ? 'okcirc' : u.modo === 'delivery' ? 'moto' : 'sacola')}</span><div><small>Pedido nº ${t(u.num)}${u.senha ? ` · senha ${t(u.senha)}` : ''}</small><b data-rotulo>${t(rotuloEtapa(u))}</b>
      <span class="cx-mudo">${u.agendado ? `Agendado para ${t(quandoTxt(u.agendado))}` : u.fim ? 'Obrigado pela preferência!' : u.modo === 'delivery' ? (L.tempoEntrega ? `Previsão: ${t(L.tempoEntrega)}` : '') : (L.tempoRetirada ? `Fica pronto em ${t(L.tempoRetirada)}` : '')}</span></div></div>
    <ol class="cx-passos">${passos.map(([, n, d], k) => `<li class="${k < i || (k === i && u.fim) ? 'feito' : k === i ? 'agora' : ''}"><i aria-hidden="true">${k < i || (k === i && u.fim) ? ico('check') : ''}</i><div><b>${t(n)}</b>${k === i ? `<small>${t(d)}</small>` : ''}</div></li>`).join('')}</ol>
    <p class="cx-mudo cx-acomp-at">Atualiza sozinho a cada poucos segundos.</p>
    <section class="cx-bloco"><h3>Resumo</h3><ul class="cx-itens">${(u.itens || []).map((x) => `<li><div class="nm"><b>${x.qtd}× ${t(nomeLinha(x))}</b>${x.adic?.length ? `<small>${t(x.adic.map((a) => a.nome.replace(/^[^:]+: /, '')).join(', '))}</small>` : ''}${x.obs ? `<small class="obs">${t(x.obs)}</small>` : ''}</div><span class="v">${din(valorLinha(x))}</span></li>`).join('')}</ul>
      <div class="cx-tot" style="margin-top:10px"><div><span>Subtotal</span><span>${din(u.sub)}</span></div>${u.modo === 'delivery' ? `<div><span>Entrega</span><span>${u.taxa ? din(u.taxa) : 'grátis'}</span></div>` : ''}${u.desconto ? `<div class="desc"><span>Desconto</span><span>−${din(u.desconto)}</span></div>` : ''}<div class="total"><span>Total</span><span>${din(u.total)}</span></div></div>
      ${u.end ? `<p class="cx-mudo" style="margin-top:10px">${ico('pino')} ${t(u.end)}${u.bairro ? ` · ${t(u.bairro)}` : ''}</p>` : ''}${u.pagar ? `<p class="cx-mudo" style="margin-top:4px">Pagamento: ${t(u.pagar)}</p>` : ''}</section>`; };
  tela({ cls: 'cx-acomp-tela', html: `${cabTela('Acompanhar pedido')}<div class="cx-tela-corpo" data-c>${html()}</div>
    <footer class="cx-tela-pe cx-pe-col">${z ? `<a class="cx-bt cheio largo cx-zap" target="_blank" rel="noopener" href="${t(zapAcomp())}">${ico('zap')}<span>Falar com o restaurante no WhatsApp</span></a>` : ''}<div class="cx-pe-linha"><button type="button" class="cx-bt" data-denovo>Pedir de novo</button><button type="button" class="cx-bt" data-voltar>Voltar ao cardápio</button></div></footer>`,
  aoAbrir: (f, fechar) => {
    $('[data-denovo]', f).onclick = () => { fechar(); pedirDeNovo(u); };
    const ver = async () => { if (!document.body.contains(f)) return clearInterval(tm); const antes = u.etapa; await lerStatus(u); if (u.etapa !== antes || u.fim) { $('[data-c]', f).innerHTML = html(); ultimo(); } if (u.fim) clearInterval(tm); };
    const tm = setInterval(ver, 8000); ver();
  } });
}
// preço de hoje de um item que já foi pedido (o cardápio pode ter mudado)
function unitAtual(x) {
  const p = P(x.prod); if (!disponivel(p)) return null;
  const tam = p.tamanhos?.some((y) => y.nome === x.tam) ? x.tam : (p.tamanhos?.length ? p.tamanhos.at(-1).nome : '');
  let b = Number(precoTamP(p, tam)) || 0; const m = x.meia?.b && P(x.meia.b); if (m && disponivel(m)) b = Math.max(b, Number(precoTamP(m, tam)) || 0);
  const adic = (x.adic || []).map((a) => { for (const g of p.grupos || []) for (const o of g.opcoes || []) if (a.nome === `${g.nome}: ${o.nome}`) return { nome: a.nome, preco: Number(o.preco) || 0 }; const ad = (p.adicionais || []).find((y) => y.nome === a.nome); return ad ? { nome: ad.nome, preco: Number(ad.preco) || 0 } : null; }).filter(Boolean);
  return { ...x, tam, meia: m && disponivel(m) ? x.meia : null, adic, unit: r2(b + adic.reduce((s, a) => s + a.preco, 0)), obs: String(x.obs || '').replace(/^Agendado para [^,]*(, )?/, '') };
}
function pedirDeNovo(u) {
  const l = (u?.itens || []).map(unitAtual), fora = (u?.itens || []).filter((x, k) => !l[k]).map((x) => P(x.prod)?.nome || 'um item');
  const ok = l.filter(Boolean); if (!ok.length) return toast('Os itens do último pedido não estão disponíveis agora');
  ok.forEach(poeNaSacola); salvarSacola(); barra();
  if (fora.length) toast(`${fora.join(', ')} ${fora.length > 1 ? 'estão esgotados' : 'está esgotado'} e ficou de fora`); else toast('Itens do último pedido na sacola');
  abrirSacola();
}
// faixa do último pedido: acompanhar enquanto está em andamento e pedir de novo
let tmUlt = 0;
function ultimo() {
  const el = $('#cli-ultimo'); if (!el) return;
  const u = mesa ? null : guardado('ultimo');
  if (!u?.itens?.length) { el.innerHTML = ''; return; }
  const resumo = u.itens.slice(0, 3).map((x) => `${x.qtd}× ${nomeLinha(x)}`).join(', ') + (u.itens.length > 3 ? '…' : '');
  el.innerHTML = ativo(u) ? `<div class="cx-ult on"><span class="cx-ult-ico">${ico(u.modo === 'delivery' ? 'moto' : 'sacola')}</span><div class="tx"><small>Pedido nº ${t(u.num)} em andamento</small><b>${t(rotuloEtapa(u))}</b></div><button type="button" class="cx-bt cheio" data-acomp>Acompanhar</button></div>`
    : `<div class="cx-ult"><span class="cx-ult-ico">${ico('relogio')}</span><div class="tx"><small>Seu último pedido</small><b>${t(resumo)}</b></div><button type="button" class="cx-bt" data-denovo2>Pedir de novo</button></div>`;
  $('[data-acomp]', el)?.addEventListener('click', () => acompanhar(u));
  $('[data-denovo2]', el)?.addEventListener('click', () => pedirDeNovo(u));
  clearInterval(tmUlt);
  if (ativo(u)) tmUlt = setInterval(async () => { if (document.visibilityState !== 'visible' || $('.cx-acomp-tela')) return; const antes = u.etapa; await lerStatus(u); if (u.etapa !== antes || u.fim) ultimo(); }, 20000);
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
function aviso() {
  const prox = !aberto() && !mesa ? proximaAbertura() : null;
  $('#cli-aviso').innerHTML = `${!aberto() && !mesa ? `<p class="cx-nota">Fechado agora${prox ? `. Abre ${t(quandoTxt(prox))}` : ''}.${podeAgendar() ? ' Você já pode fazer o pedido e agendar o horário.' : ' Você pode olhar o cardápio; os pedidos abrem no horário.'}</p>` : ''}${L.aviso ? `<p class="cx-nota azul">${t(L.aviso)}</p>` : ''}`;
}
function carregarSacola() {
  // sacola guardada: a nova (uma só para entrega e retirada) ou a antiga (separada por modo); esgotados saem
  sacola = guardado(`sacola-${mesa || 'online'}`) || (!mesa && (guardado('sacola-delivery') || guardado('sacola-balcao'))) || [];
  sacola = (Array.isArray(sacola) ? sacola : []).filter((x) => disponivel(P(x.prod)) && x.qtd > 0);
}
function tudo() { aplicarCor(); topo(); caixaModo(); aviso(); lista(); rodape(); carregarSacola(); barra(); ultimo(); }
async function iniciar() {
  if (!R) {
    loja = await import('./loja.js?v=47'); doExemplo();
    loja.ouvir(() => { doExemplo(); if (!document.querySelector('.folha-fundo, .cx-tela-fundo')) { aplicarCor(); topo(); lista(); } });
    tudo(); return;
  }
  try { await daNuvem(); } catch (e) { $('#cli-lista').innerHTML = `<p class="cx-vazio">${t(e.message === 'rede' || /fetch/i.test(e.message) ? 'Sem internet agora. Confira a conexão e recarregue a página.' : e.message)}</p>`; return; }
  tudo();
  // preço, esgotado ou horário mudou no restaurante: atualiza a cada minuto
  setInterval(() => { if (document.visibilityState === 'visible' && !document.querySelector('.folha-fundo, .cx-tela-fundo')) daNuvem().then(() => { aplicarCor(); topo(); aviso(); lista(); }).catch(() => {}); }, 60000);
}
iniciar();
