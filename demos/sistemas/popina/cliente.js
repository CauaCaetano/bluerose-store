// Popina · cardápio do cliente (estrutura dos cardápios de delivery mais usados: capa, busca, destaques, abas que grudam, foto à direita,
// tela do produto com opções, sacola fixa, cupom, finalizar curto, agendar com a loja fechada e acompanhar o pedido).
// ?mesa=N: pede da mesa (o garçom confere), chama o garçom e pede a conta.  Sem mesa: entrega ou retirada, com taxa por bairro e troco.
// r=<restaurante>: o cardápio de verdade (nuvem). Sem r: o restaurante de exemplo deste aparelho (demonstração; ?fechado=1 simula a loja fechada).
// Todo pedido também pode ir para o WhatsApp do restaurante (link wa.me com o pedido escrito).
// COMPATIBILIDADE: o pedido continua com os mesmos campos (nome, tel, end, bairro, pagar, troco, itens). Os novos (ref, cupom, desconto,
// taxa, total, agendado) só se somam; o que o sistema do dono ainda não lê vai também escrito no endereço, no pagamento e na observação.
import { ico, folha, toast, $, $$ } from './ui.js?v=54';
import * as som from './som.js?v=54';
// cardápio do cliente: só um toque leve ao pôr na sacola e ao mandar o pedido; mudo no link "Som" do topo (vale neste celular)
som.chaveSom('popina-som-cli', false);
import { formOpcoes, abertoAgora, textoHorarios, precoTamP, DIAS } from './opcoes.js?v=54';
import { criarConta, buscarCep, minhaLocalizacao, casarBairro, endLimpo, endLinha, juntarEnd } from './conta-cliente.js?v=54';

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
let conta = null; // conta opcional do cliente (Google ou e-mail); null na mesa
let M = null, L = null, modo = mesa ? 'mesa' : 'delivery', sacola = [], busca = '', loja = null, maisPedidos = new Set();
const P = (id) => M.produtos.find((p) => p.id === id);
const guardado = (k, v) => { try { const o = JSON.parse(localStorage.getItem(CHAVE_LOCAL) || '{}'); if (v === undefined) return o[k]; if (v === null) delete o[k]; else o[k] = v; localStorage.setItem(CHAVE_LOCAL, JSON.stringify(o)); } catch { /* sem acesso */ } return undefined; };
const LOJA_PADRAO = { cor: '#6B2737', horarios: [], aceitaQR: true, delivery: true, retirada: true, pagamentos: ['Pix', 'Cartão na entrega', 'Dinheiro'], pedidoMinimo: 0, tempoEntrega: '', tempoRetirada: '' };
const SVG_COMP = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1"/></svg>';
const SVG_PESSOA = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
const SVG_G = '<svg class="cx-g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';
const SVG_EMAIL = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5L12 13l8.5-6.5"/></svg>';
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
  const cor = /^#[0-9a-f]{6}$/i.test(L.cor || '') ? L.cor : '#6B2737';
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
const logoDe = () => L.logo || (!R ? 'img/c-logo-exemplo.webp?v=2' : '');
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
        <p class="cx-st"><span class="cx-estado ${ab ? 'on' : 'off'}">${ab ? 'Aberto agora' : `Fechado${prox ? ` · abre ${quandoTxt(prox)}` : ' agora'}`}</span><button type="button" class="cx-link" data-horarios>Horários</button>${L.endereco ? `<a class="cx-link" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${L.endereco} ${M.cidade || ''}`)}">Endereço</a>` : ''}${zap ? `<a class="cx-link" target="_blank" rel="noopener" href="https://wa.me/55${zap.replace(/^55/, '')}">WhatsApp</a>` : ''}${mesa ? '' : `<button type="button" class="cx-link" data-compartilhar>${SVG_COMP}Compartilhar</button>`}<button type="button" class="cx-link cx-som" data-som-bt><i data-som-ico></i><span data-som-txt>Som</span></button>${conta ? `<button type="button" class="cx-link" data-minhaconta>${SVG_PESSOA}${conta.estado() ? 'Minha conta' : 'Entrar'}</button>` : ''}</p></div></div>
    ${info.length ? `<ul class="cx-info">${info.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}`;
  $('[data-horarios]').onclick = () => folha({ titulo: 'Horários', corpo: `${L.endereco ? `<p class="mudo" style="margin-bottom:10px">${t(L.endereco)}${M.cidade ? ` · ${t(M.cidade)}` : ''}</p>` : ''}<ul class="lista-l">${textoHorarios(L.horarios).map((x, k) => `<li${k === new Date().getDay() ? ' style="font-weight:800"' : ''}><div class="tx">${t(x)}</div></li>`).join('')}</ul>` });
  $('[data-compartilhar]')?.addEventListener('click', compartilhar);
  const sb = $('[data-som-bt]'); if (sb) som.ligarBotao(sb);
  $('[data-minhaconta]')?.addEventListener('click', () => (conta.estado() ? minhaConta() : entrarConta()));
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
      salvarSacola(); if (!ed) som.toque(); barra(); fechar(); depois?.(); toast(ed ? 'Item atualizado' : `${v.qtd}× ${p.nome} na sacola`); };
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
let nAntes = -1;
function barra() {
  const n = qtdSacola(), el = $('#cli-barra'), lado = $('#cx-lado'), fm = faltaMinimo(), pula = nAntes >= 0 && n > nAntes; nAntes = n;
  const aviso = fm ? `<p class="cx-falta">Faltam <b>${din(fm)}</b> para o pedido mínimo de entrega (${din(L.pedidoMinimo)})</p>` : '';
  el.innerHTML = n ? `${aviso}<button type="button" class="cx-bt cheio" data-sacola><span class="cx-cont">${n}</span><span>Ver sacola</span><b>${din(subtotal())}</b></button>` : '';
  el.hidden = !n; document.body.classList.toggle('com-barra', !!n); document.body.classList.toggle('com-falta', !!(n && fm));
  $('[data-sacola]', el)?.addEventListener('click', abrirSacola);
  if (pula) $('.cx-cont', el)?.classList.add('pula'); // o número da sacola dá um pulinho ao pôr item
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
const cepBonito = (v) => { const d = soDig(v).slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };
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
  const st = { nome: cli.nome || '', tel: cli.tel ? foneBonito(cli.tel) : '', end: cli.end || '', bairro: bairroDe(cli.bairro) ? cli.bairro : '', ref: cli.ref || '', pg: (L.pagamentos || [])[0] || '', troco: '', obs: '', cupom: '', quando: fechado ? String(slots[0] || '') : '',
    cep: cli.cep ? cepBonito(cli.cep) : '', rua: cli.rua || '', numero: cli.numero || '', compl: cli.compl || '', bairroTxt: cli.bairroTxt || '', cidade: cli.cidade || '', semNum: !!cli.semNum, endId: '', apelido: 'Casa' };
  // endereço guardado do jeito antigo (uma linha só): separa rua, número e complemento
  if (!st.rua && st.end) { const m = st.end.split(' · ')[0].match(/^(.*?),\s*(\d+[a-z]?)\s*(?:,\s*(.*))?$/i); if (m) Object.assign(st, { rua: m[1], numero: m[2], compl: m[3] || '' }); else st.rua = st.end.split(' · ')[0]; }
  const ends = () => (conta?.estado()?.enderecos || []);
  const usarEnd = (e) => { e = endLimpo(e); Object.assign(st, { endId: e.id, apelido: e.apelido, cep: e.cep ? cepBonito(e.cep) : '', rua: e.rua, numero: e.numero, semNum: !e.numero, compl: e.compl, ref: e.ref, cidade: e.cidade,
    bairro: bairroDe(e.bairro) ? e.bairro : casarBairro(M.bairros, e.bairro, e.cidade), bairroTxt: (M.bairros || []).length ? '' : e.bairro }); };
  const daConta = () => { const c = conta?.estado(); if (!c) return; if (c.nome) st.nome = c.nome; if (c.telefone) st.tel = foneBonito(c.telefone); if (ends().length) usarEnd(ends()[0]); else st.endId = 'novo'; };
  daConta();
  const pgs = () => (L.pagamentos || []);
  const nomePg = (f) => (modo === 'balcao' ? f.replace(' na entrega', ' na retirada') : f);
  const ops = opsModo(), zap = soDig(M.whatsapp);
  const taxa = () => (!mesa && modo === 'delivery' ? taxaBairro(st.bairro) : 0);
  const cupomOk = () => { const c = acharCupom(st.cupom); return c && !erroCupom(c, subtotal()) ? c : null; };
  const desconto = () => valorCupom(cupomOk(), subtotal(), taxa());
  const total = () => r2(subtotal() + taxa() - desconto());
  const blocoConta = () => {
    if (!conta) return '';
    const c = conta.estado();
    return c ? `<section class="cx-bloco cx-conta-ok"><span class="cx-conta-ico">${SVG_PESSOA}</span><div class="tx"><b>Olá, ${t((c.nome || 'cliente').split(' ')[0])}</b><small>${c.via === 'google' ? 'Entrou com Google' : c.via === 'exemplo' ? 'Conta de exemplo' : 'Entrou com e-mail'}${c.email ? ` · ${t(c.email)}` : ''}</small></div><button type="button" class="cx-link" data-minha>Minha conta</button></section>`
      : `<section class="cx-bloco cx-conta-cx"><b>Peça mais rápido com uma conta</b><small class="cx-mudo">Endereços salvos e dados preenchidos no próximo pedido. É opcional.</small>
        <div class="cx-conta-bts"><button type="button" class="cx-bt cx-google" data-google>${SVG_G}<span>Entrar com Google</span></button><button type="button" class="cx-bt" data-email-conta>${SVG_EMAIL}<span>Com e-mail</span></button></div>
        <small class="cx-mudo">Ou continue sem conta: é só preencher abaixo.</small></section>`;
  };
  let ultimoCep = soDig(st.cep);
  const gruposSlots = () => { const g = {}; slots.forEach((v) => { const k = new Date(v).toDateString(); (g[k] ||= []).push(v); }); return Object.values(g); };
  const corpo = () => `
    <section class="cx-bloco"><div class="cx-bloco-cab"><h3>Seu pedido</h3><button type="button" class="cx-link" data-voltar>Adicionar mais itens</button></div>${itensHtml(true)}</section>
    ${mesa ? `<section class="cx-bloco"><h3>Mesa ${mesa}</h3><label class="cx-campo"><span>Seu nome (opcional)</span><input data-f="nome" maxlength="40" autocomplete="name" value="${t(st.nome)}"></label></section>` : `
    ${ops.length > 1 ? `<section class="cx-bloco"><h3>Como quer receber?</h3><div class="cx-seg">${ops.map(([k, n]) => `<button type="button" data-modo2="${k}" aria-pressed="${modo === k}">${k === 'delivery' ? ico('moto') : ico('sacola')}<span>${n}</span><small>${k === 'delivery' ? t(L.tempoEntrega || '') : t(L.tempoRetirada || '')}</small></button>`).join('')}</div></section>` : ''}
    ${blocoConta()}
    ${modo === 'delivery' ? `<section class="cx-bloco"><h3>Endereço de entrega</h3>
      ${ends().length ? `<div class="cx-pgs cx-ends" role="radiogroup" aria-label="Endereços salvos">${ends().map((e) => `<label class="cx-pg"><input type="radio" name="endsalvo" value="${t(e.id)}" ${st.endId === e.id ? 'checked' : ''}><span>${ico('pino')}<span class="cx-end-tx"><b>${t(e.apelido)}</b><small>${t(endLinha(e))}${e.bairro ? ` · ${t(e.bairro)}` : ''}</small></span></span></label>`).join('')}
        <label class="cx-pg"><input type="radio" name="endsalvo" value="novo" ${st.endId === 'novo' ? 'checked' : ''}><span>${ico('mais2')}Outro endereço</span></label></div>` : ''}
      <div class="cx-endform" data-endform ${ends().length && st.endId !== 'novo' ? 'hidden' : ''}>
      <div class="cx-cep"><label class="cx-campo"><span>CEP</span><input data-f="cep" inputmode="numeric" autocomplete="postal-code" maxlength="9" value="${t(st.cep)}" placeholder="00000-000"></label>
        <button type="button" class="cx-bt cx-local" data-local>${ico('pino')}<span>Usar minha localização</span></button></div>
      <p class="cx-cep-st" data-cep-st role="status">${st.cep ? '' : 'Digite o CEP e a rua e o bairro aparecem sozinhos.'}</p>
      <label class="cx-campo"><span>Rua</span><input data-f="rua" maxlength="100" autocomplete="address-line1" value="${t(st.rua)}" placeholder="Ex.: Rua Seis"></label>
      <div class="cx-duas"><label class="cx-campo"><span>Número</span><input data-f="numero" maxlength="12" inputmode="numeric" autocomplete="off" value="${t(st.numero)}" ${st.semNum ? 'disabled placeholder="s/n"' : 'placeholder="120"'}></label>
        <label class="cx-campo"><span>Complemento <i>(opcional)</i></span><input data-f="compl" maxlength="60" autocomplete="address-line2" value="${t(st.compl)}" placeholder="Apto, bloco, fundos"></label></div>
      <label class="cx-check"><input type="checkbox" data-semnum ${st.semNum ? 'checked' : ''}><span>Sem número</span></label>
      ${(M.bairros || []).length ? `<label class="cx-campo"><span>Bairro</span><select data-f="bairro">${opcoesBairro(st.bairro)}</select>${zap ? `<small class="cx-mudo">Não achou o bairro? <a class="cx-link" target="_blank" rel="noopener" href="https://wa.me/55${zap.replace(/^55/, '')}?text=${encodeURIComponent('Olá! Vocês entregam no meu bairro?')}">Pergunte no WhatsApp</a></small>` : ''}</label>`
        : `<label class="cx-campo"><span>Bairro</span><input data-f="bairroTxt" maxlength="60" value="${t(st.bairroTxt)}"></label>`}
      <label class="cx-campo"><span>Ponto de referência <i>(opcional)</i></span><input data-f="ref" maxlength="60" value="${t(st.ref)}" placeholder="Ex.: perto da padaria, portão azul"></label>
      ${conta?.estado() ? `<div class="cx-campo"><span>Salvar como</span><div class="cx-chips" role="radiogroup" aria-label="Salvar como">${['Casa', 'Trabalho', 'Outro'].map((a) => `<label><input type="radio" name="apelido" value="${a}" ${st.apelido === a ? 'checked' : ''}><span>${a}</span></label>`).join('')}</div><small class="cx-mudo">Fica salvo na sua conta para o próximo pedido.</small></div>` : ''}
      </div>${ends().length && st.endId !== 'novo' && (M.bairros || []).length && !st.bairro ? `<p class="cx-nota" style="margin-top:10px">Este endereço está num bairro fora da lista de entrega. Escolha <b>Outro endereço</b> e o bairro mais próximo.</p>` : ''}</section>`
    : `<section class="cx-bloco"><h3>Retirada no balcão</h3><p class="cx-mudo">${L.endereco ? `${t(L.endereco)}${M.cidade ? ` · ${t(M.cidade)}` : ''}` : t(M.nome)}${L.tempoRetirada ? `<br>Fica pronto em ${t(L.tempoRetirada)}` : ''}</p></section>`}
    ${slots.length ? `<section class="cx-bloco"><h3>Quando?</h3>${fechado ? `<p class="cx-mudo" style="margin-bottom:10px">O restaurante está fechado agora. Escolha o horário e o pedido fica agendado.</p>` : ''}
      <div class="cx-pgs" role="radiogroup" aria-label="Quando">${fechado ? '' : `<label class="cx-pg"><input type="radio" name="quando" value="" ${st.quando ? '' : 'checked'}><span>${ico('relogio')}O quanto antes${modo === 'delivery' && L.tempoEntrega ? ` · ${t(L.tempoEntrega)}` : modo === 'balcao' && L.tempoRetirada ? ` · ${t(L.tempoRetirada)}` : ''}</span></label>`}
      <label class="cx-pg"><input type="radio" name="quando" value="agendar" ${st.quando ? 'checked' : ''}><span>${ico('calendario')}Agendar</span></label></div>
      <label class="cx-campo" data-quando-l ${st.quando ? '' : 'hidden'}><span>Horário</span><select data-f="quando">${gruposSlots().map((g) => `<optgroup label="${t(diaTxt(g[0]).replace(/^./, (c) => c.toUpperCase()))} ${dataCurta(g[0])}">${g.map((v) => `<option value="${v}" ${String(v) === st.quando ? 'selected' : ''}>${horaTxt(v)}</option>`).join('')}</optgroup>`).join('')}</select></label></section>` : ''}
    <section class="cx-bloco"><div class="cx-bloco-cab"><h3>Seus dados</h3>${cli.nome && !conta?.estado() ? '<button type="button" class="cx-link" data-esquecer>Esquecer meus dados</button>' : ''}</div>
      <label class="cx-campo"><span>Nome</span><input data-f="nome" maxlength="60" autocomplete="name" value="${t(st.nome)}"></label>
      <label class="cx-campo"><span>WhatsApp com DDD</span><input data-f="tel" type="tel" inputmode="tel" autocomplete="tel" value="${t(st.tel)}" placeholder="(16) 99999-9999"></label>
      <p class="cx-mudo">${conta?.estado() ? 'Seus dados e endereços ficam salvos na sua conta.' : 'Seus dados ficam guardados só neste aparelho para o próximo pedido.'}</p></section>
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
      $('[data-esquecer]', f)?.addEventListener('click', () => { guardado('cliente', null); Object.assign(st, { nome: '', tel: '', end: '', bairro: '', ref: '', cep: '', rua: '', numero: '', compl: '', bairroTxt: '', cidade: '', semNum: false }); Object.keys(cli).forEach((k) => delete cli[k]); montar(); toast('Seus dados foram apagados deste aparelho'); });
      // conta (opcional)
      const depoisDeEntrar = () => { if (!document.body.contains(f)) return; ler(); daConta(); montar(); };
      $('[data-google]', f)?.addEventListener('click', () => entrarGoogle(depoisDeEntrar));
      $('[data-email-conta]', f)?.addEventListener('click', () => entrarConta({ aoEntrar: depoisDeEntrar }));
      $('[data-minha]', f)?.addEventListener('click', () => minhaConta(() => { if (!document.body.contains(f)) return; ler(); if (!conta.estado()) st.endId = ''; else if (!ends().some((e) => e.id === st.endId)) daConta(); montar(); }));
      // endereço: salvos em 1 toque, CEP, localização, sem número
      $$('[name=endsalvo]', f).forEach((r) => { r.onchange = () => { ler(); if (r.value === 'novo') { Object.assign(st, { endId: 'novo', cep: '', rua: '', numero: '', compl: '', ref: '', bairro: '', bairroTxt: '', cidade: '', semNum: false, apelido: ends().some((e) => e.apelido === 'Casa') ? 'Trabalho' : 'Casa' }); ultimoCep = ''; } else { const e = ends().find((x) => x.id === r.value); if (e) usarEnd(e); } montar(); if (r.value === 'novo') $('[data-f=cep]', f)?.focus(); }; });
      $$('[name=apelido]', f).forEach((r) => { r.onchange = () => { st.apelido = r.value; }; });
      const poe = (k, v) => { st[k] = v; const i = $(`[data-f=${k}]`, f); if (i) i.value = v; };
      const stCep = (html, erro = false) => { const el = $('[data-cep-st]', f); if (el) { el.innerHTML = html; el.classList.toggle('erro', erro); } };
      const FORA = '[fora]'; // marca interna: o aviso é de cidade fora da entrega
      const casar = (bairro, cidade) => {
        const bs = M.bairros || [];
        if (!bs.length) { if (bairro) poe('bairroTxt', bairro); return ''; }
        const b = casarBairro(bs, bairro, cidade); if (b) { poe('bairro', b); tot(); return ''; }
        const cids = [...new Set(bs.map((x) => x.cidade).filter(Boolean))], fora = cidade && cids.length && !cids.some((c) => c.toLowerCase() === cidade.toLowerCase());
        // só a cidade de fora vira aviso (laranja); bairro fora da lista ou CEP geral é texto neutro
        return fora ? FORA + ` Este restaurante entrega em <b>${t(cids.join(', '))}</b>. Confira o CEP ou escolha um bairro da lista.` : bairro ? ` <b>${t(bairro)}</b> não está na lista: escolha o bairro mais próximo.` : ' Escolha o bairro abaixo.';
      };
      const stAviso = (base, aviso) => stCep(base + aviso.replace(FORA, ''), aviso.startsWith(FORA));
      const consultarCep = async (d) => {
        stCep('Buscando o CEP…');
        try {
          const r = await buscarCep(d); if (soDig(st.cep) !== d) return;
          st.cidade = r.cidade; if (r.rua) poe('rua', r.rua);
          const aviso = casar(r.bairro, r.cidade);
          if (r.rua) stAviso(`${ico('check')}${t(r.rua)}${r.bairro ? ` · ${t(r.bairro)}` : ''} · ${t(r.cidade)}/${t(r.uf)}.`, aviso);
          else if (aviso.startsWith(FORA)) stAviso(`${t(r.cidade)}/${t(r.uf)}.`, aviso);
          else stCep(`CEP geral da cidade${r.cidade ? ` (${t(r.cidade)}/${t(r.uf)})` : ''}: escolha o bairro e digite a rua.`);
          if (!st.semNum) $(r.rua ? '[data-f=numero]' : '[data-f=rua]', f)?.focus();
        } catch (e) {
          // CEP não achado ou sem internet: segue normal, sem vermelho
          stCep(/consultar/i.test(e.message) ? t(e.message) : d.endsWith('000') ? 'CEP geral da cidade: escolha o bairro e digite a rua.' : 'Não achamos este CEP: escolha o bairro e digite a rua.');
          $('[data-f=rua]', f)?.focus();
        }
      };
      const cepI = $('[data-f=cep]', f);
      cepI?.addEventListener('input', () => { const d = soDig(cepI.value).slice(0, 8); cepI.value = cepBonito(d); st.cep = cepI.value; if (d.length === 8 && d !== ultimoCep) { ultimoCep = d; consultarCep(d); } else if (d.length < 8) ultimoCep = ''; });
      $('[data-local]', f)?.addEventListener('click', async (e) => {
        const b = e.currentTarget; b.disabled = true; stCep('Procurando onde você está…');
        try {
          const r = await minhaLocalizacao(); let v = null;
          if (r.cep.length === 8) { try { v = await buscarCep(r.cep); } catch { v = null; } poe('cep', cepBonito(r.cep)); ultimoCep = r.cep; }
          if (r.rua || v?.rua) poe('rua', r.rua || v.rua); if (r.numero && !st.semNum) poe('numero', r.numero);
          st.cidade = v?.cidade || r.cidade;
          const aviso = casar(v?.bairro || r.bairro, st.cidade);
          stAviso(`${ico('check')}Achamos: ${t(st.rua || 'rua não identificada')}${r.numero ? `, ${t(r.numero)}` : ''}${st.cidade ? ` · ${t(st.cidade)}` : ''}. Confira o número.`, aviso);
          $('[data-f=numero]', f)?.focus();
        } catch (er) { stCep(t(er.message), true); }
        b.disabled = false;
      });
      $('[data-semnum]', f)?.addEventListener('change', (e) => { st.semNum = e.target.checked; const n = $('[data-f=numero]', f); n.disabled = st.semNum; n.placeholder = st.semNum ? 's/n' : '120'; if (st.semNum) poe('numero', ''); else n.focus(); });
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
        const tel = soDig(st.tel), bairro = st.bairro, ref = st.ref.trim(), rua = st.rua.trim(), numero = st.semNum ? '' : st.numero.trim(), compl = st.compl.trim(), cep = soDig(st.cep), bairroTxt = (st.bairroTxt || '').trim();
        const abrirForm = () => { const fm = $('[data-endform]', f); if (fm?.hidden) { st.endId = 'novo'; montar(); } };
        if (modo === 'delivery' && !rua) { abrirForm(); return avisa('Escreva a rua (ou digite o CEP)', '[data-f=cep]'); }
        if (modo === 'delivery' && !numero && !st.semNum && !/\d/.test(rua)) { abrirForm(); return avisa('Escreva o número da casa (ou marque "Sem número")', '[data-f=numero]'); }
        if (modo === 'delivery' && (M.bairros || []).length && !bairro) { abrirForm(); return avisa('Escolha o bairro', '[data-f=bairro]'); }
        const end = [[rua, numero || (st.semNum ? 's/n' : '')].filter(Boolean).join(', '), compl].filter(Boolean).join(', ') + (bairroTxt && !(M.bairros || []).length ? ` · ${bairroTxt}` : '');
        if (nome.length < 2) return avisa('Escreva seu nome', '[data-f=nome]');
        if (tel.length < 10) return avisa('Escreva seu WhatsApp com DDD', '[data-f=tel]');
        if (faltaMinimo()) return toast(`O pedido mínimo para entrega é ${din(L.pedidoMinimo)}`);
        if (st.cupom && !cupomOk()) return avisa(erroCupom(acharCupom(st.cupom), subtotal()) || 'Confira o cupom', '[data-f=cupom]');
        const pg = st.pg || '', troco = /dinheiro/i.test(pg) ? r2(num(st.troco)) : 0;
        if (troco && troco < total()) return avisa(`O troco precisa ser para mais de ${din(total())}`, '[data-f=troco]');
        guardado('cliente', { nome, tel, end, bairro, ref, cep, rua, numero, compl, bairroTxt, cidade: st.cidade || '', semNum: st.semNum });
        const cup = cupomOk(), ds = desconto();
        // mesmos campos de sempre (end continua com o endereço inteiro escrito); cep, rua, numero, compl e cidade só se somam
        dados = { nome, tel, end: modo === 'delivery' ? [end, ref ? `Ref.: ${ref}` : ''].filter(Boolean).join(' · ').slice(0, 160) : '', bairro: modo === 'delivery' ? bairro : '',
          pagar: `${pg}${troco ? ` (troco para ${din(troco)})` : ''}${cup ? ` · cupom ${cup.codigo}` : ''}`, troco, itens,
          ref, taxa: taxa(), total: total(), ...(cup ? { cupom: cup.codigo, desconto: ds } : {}), ...(ag ? { agendado: { ts: ag, texto: quandoTxt(ag) } } : {}),
          ...(modo === 'delivery' ? { cep, rua, numero: numero || (st.semNum ? 's/n' : ''), compl, cidade: st.cidade || '' } : {}) };
        const c = conta?.estado();
        if (c) {
          const lista = modo === 'delivery' ? juntarEnd(c.enderecos, { id: st.endId && st.endId !== 'novo' ? st.endId : undefined, apelido: st.apelido, cep, rua, numero, compl, bairro: bairro || bairroTxt, cidade: st.cidade, ref }) : c.enderecos;
          conta.salvar({ nome, telefone: tel, enderecos: lista }).catch(() => {}); // nunca segura o pedido
        }
      }
      bt.disabled = true; const txt = bt.innerHTML; bt.innerHTML = '<span>Mandando…</span>';
      const msg = textoZap(dados, nome, obs, ag);
      try {
        const r = mesa ? await api.mesa(itens) : await api.pedido(modo, dados);
        if (r?.erro) throw new Error(r.erro);
        const feito = { id: r.id, num: r.num || '', senha: r.senha || 0, modo, ts: Date.now(), itens: sacola.map((x) => ({ ...x })), sub: subtotal(), taxa: taxa(), desconto: desconto(), total: total(), msg, agendado: ag || 0, end: dados?.end || '', bairro: dados?.bairro || '', pagar: dados?.pagar || '', etapa: 'recebido' };
        sacola = []; salvarSacola(); barra(); fechar(); som.enviado();
        if (mesa) confirmadoMesa(r, msg); else { guardado('ultimo', feito); guardado('pedidos', [feito, ...(guardado('pedidos') || []).filter((x) => x?.id !== feito.id)].slice(0, 10)); ultimo(); acompanhar(feito); }
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
  try { const s = await api.status(u.id, u.modo); if (s?.etapa) { u.etapa = s.etapa; if (s.motivo) u.motivo = s.motivo; if (s.etapa === 'entregue' || s.etapa === 'recusado') u.fim = true; const g = guardado('ultimo'); if (g?.id === u.id) guardado('ultimo', u); const h = guardado('pedidos'); if (Array.isArray(h) && h.some((x) => x?.id === u.id)) guardado('pedidos', h.map((x) => (x?.id === u.id ? u : x))); } } catch { /* sem internet: fica como estava */ }
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
// ------------------------------------------------------------------ conta do cliente (opcional): Google, e-mail e senha, endereços e meus pedidos
async function entrarGoogle(depois) {
  if (!conta.real) { toast('Na demonstração, entra como cliente de exemplo'); await conta.google(); toast('Pronto! Você entrou como Cliente de exemplo'); depois?.(); return; }
  try { guardado('reabrirSacola', sacola.length ? 1 : null); await conta.google(); } catch { guardado('reabrirSacola', null); toast('Não deu para abrir o Google agora. Tente com e-mail ou continue sem conta.'); }
}
function entrarConta({ aoEntrar, aba = 'entrar' } = {}) {
  let modoC = aba;
  const corpo = () => `<div class="cx-entrar">
    <button type="button" class="cx-bt cx-google largo" data-g>${SVG_G}<span>Entrar com Google</span></button>
    ${conta.real ? '' : '<p class="cx-mudo">Na demonstração, o Google entra como cliente de exemplo.</p>'}
    <div class="cx-ou"><span>ou com e-mail</span></div>
    <div class="cx-seg" role="group" aria-label="Entrar ou criar conta"><button type="button" data-aba="entrar" aria-pressed="${modoC === 'entrar'}"><span>Entrar</span></button><button type="button" data-aba="criar" aria-pressed="${modoC === 'criar'}"><span>Criar conta</span></button></div>
    <form data-form novalidate>
      ${modoC === 'criar' ? '<label class="cx-campo"><span>Seu nome</span><input name="nome" maxlength="80" autocomplete="name" required></label>' : ''}
      <label class="cx-campo"><span>E-mail</span><input name="email" type="email" inputmode="email" autocomplete="email" maxlength="120" required></label>
      <label class="cx-campo"><span>Senha${modoC === 'criar' ? ' <i>(mínimo 6)</i>' : ''}</span><input name="senha" type="password" minlength="6" autocomplete="${modoC === 'criar' ? 'new-password' : 'current-password'}" required></label>
      <p class="cx-cep-st erro" data-erro role="alert"></p>
      <button type="submit" class="cx-bt cheio largo" data-ir><span>${modoC === 'criar' ? 'Criar minha conta' : 'Entrar'}</span></button>
    </form>
    <button type="button" class="cx-link cx-sem" data-fechar>Continuar sem conta</button></div>`;
  folha({ titulo: 'Entrar na sua conta', corpo: corpo(), aoAbrir: (f, fechar) => {
    const ligar = () => {
      $('[data-g]', f).onclick = async () => { await entrarGoogle(() => { fechar(); aoEntrar?.(); }); };
      $$('[data-aba]', f).forEach((b) => { b.onclick = () => { modoC = b.dataset.aba; $('.folha-corpo', f).innerHTML = corpo(); ligar(); $('[name=nome],[name=email]', f)?.focus(); }; });
      $('[data-form]', f).onsubmit = async (e) => {
        e.preventDefault(); const fd = new FormData(e.target), nome = String(fd.get('nome') || '').trim(), email = String(fd.get('email') || '').trim(), senha = String(fd.get('senha') || '');
        const erro = (m) => { $('[data-erro]', f).textContent = m; };
        if (modoC === 'criar' && nome.length < 2) return erro('Escreva seu nome');
        if (!/^\S+@\S+\.\S+$/.test(email)) return erro('Confira o e-mail');
        if (conta.real && senha.length < 6) return erro('A senha precisa ter pelo menos 6 caracteres');
        const bt = $('[data-ir]', f); bt.disabled = true; erro('');
        try {
          const r = modoC === 'criar' ? await conta.criar(nome, email, senha) : await conta.entrar(email, senha);
          if (r.confirmar) { $('.folha-corpo', f).innerHTML = `<p style="font-weight:700">Conta criada! Mandamos um link para <b>${t(email)}</b>.</p><p class="cx-mudo" style="margin-top:8px">Abra o e-mail, toque no link e volte aqui para entrar. Enquanto isso, dá para pedir sem conta.</p><button type="button" class="cx-bt cheio largo" style="margin-top:14px" data-fechar><span>Entendi</span></button>`; return; }
          fechar(); toast(modoC === 'criar' ? 'Conta criada. Seus próximos pedidos ficam mais rápidos' : 'Pronto! Você entrou'); aoEntrar?.();
        } catch (er) { erro(er?.message || 'Não deu agora. Tente de novo.'); bt.disabled = false; }
      };
    };
    ligar();
  } });
}
function minhaConta(depois) {
  const c = conta.estado(); if (!c) return entrarConta({ aoEntrar: depois });
  const peds = (guardado('pedidos') || []).filter((u) => u?.id && u.itens?.length);
  const corpo = () => { const x = conta.estado(); return `<div class="cx-minha">
    <p class="cx-minha-quem">${SVG_PESSOA}<span><b>${t(x.nome || 'Cliente')}</b><small>${t(x.email)}${x.telefone ? ` · ${t(foneBonito(x.telefone))}` : ''}</small></span></p>
    <h3>Endereços salvos</h3>${x.enderecos.length ? `<ul class="cx-lista-end">${x.enderecos.map((e) => `<li>${ico('pino')}<span><b>${t(e.apelido)}</b><small>${t(endLinha(e))}${e.bairro ? ` · ${t(e.bairro)}` : ''}${e.cep ? ` · <span class="cx-nw">CEP ${t(cepBonito(e.cep))}</span>` : ''}</small></span><button type="button" class="cx-link" data-tirar="${t(e.id)}" aria-label="Tirar o endereço ${t(e.apelido)}">Tirar</button></li>`).join('')}</ul>` : '<p class="cx-mudo">Nenhum ainda. O endereço do próximo pedido fica salvo aqui.</p>'}
    <h3>Meus pedidos</h3>${peds.length ? `<ul class="cx-lista-end">${peds.map((u, k) => `<li>${ico(u.modo === 'delivery' ? 'moto' : 'sacola')}<span><b>Nº ${t(u.num || '')} · ${din(u.total)}</b><small>${t(new Date(u.ts).toLocaleDateString('pt-BR'))} · ${t(rotuloEtapa(u))}</small></span><button type="button" class="cx-link" data-ped="${k}">${ativo(u) ? 'Acompanhar' : 'Pedir de novo'}</button></li>`).join('')}</ul>` : '<p class="cx-mudo">Os pedidos feitos neste aparelho aparecem aqui.</p>'}
    </div>`; };
  folha({ titulo: 'Minha conta', corpo: corpo(), pe: '<button type="button" class="bt grande" data-sair>Sair da conta</button>', aoAbrir: (f, fechar) => {
    const ligar = () => {
      $$('[data-tirar]', f).forEach((b) => { b.onclick = async () => { await conta.salvar({ enderecos: conta.estado().enderecos.filter((e) => e.id !== b.dataset.tirar) }).catch(() => toast('Sem internet agora')); $('.folha-corpo', f).innerHTML = corpo(); ligar(); depois?.(); }; });
      $$('[data-ped]', f).forEach((b) => { b.onclick = () => { const u = peds[Number(b.dataset.ped)]; fechar(); if (ativo(u)) acompanhar(u); else pedirDeNovo(u); }; });
    };
    ligar();
    $('[data-sair]', f).onclick = async () => { await conta.sair(); fechar(); toast('Você saiu da conta. Dá para pedir sem conta normalmente'); depois?.(); };
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
// conta opcional: o objeto existe logo (para o botão Entrar), a sessão é lida depois que o cardápio aparece
async function posConta() {
  if (!conta) return;
  await conta.iniciar().catch(() => null);
  topo();
  // voltou do Google com a sacola cheia: abre a sacola já preenchida
  if (conta.estado() && guardado('reabrirSacola')) { guardado('reabrirSacola', null); if (sacola.length) abrirSacola(); }
}
async function iniciar() {
  if (!mesa) { conta = criarConta({ real: !!R }); conta.ouvir(() => { if (M) topo(); }); }
  if (!R) {
    loja = await import('./loja.js?v=54'); doExemplo();
    loja.ouvir(() => { doExemplo(); if (!document.querySelector('.folha-fundo, .cx-tela-fundo')) { aplicarCor(); topo(); lista(); } });
    tudo(); posConta(); return;
  }
  try { await daNuvem(); } catch (e) { $('#cli-lista').innerHTML = `<p class="cx-vazio">${t(e.message === 'rede' || /fetch/i.test(e.message) ? 'Sem internet agora. Confira a conexão e recarregue a página.' : e.message)}</p>`; return; }
  tudo(); posConta();
  // preço, esgotado ou horário mudou no restaurante: atualiza a cada minuto
  setInterval(() => { if (document.visibilityState === 'visible' && !document.querySelector('.folha-fundo, .cx-tela-fundo')) daNuvem().then(() => { aplicarCor(); topo(); aviso(); lista(); }).catch(() => {}); }, 60000);
}
iniciar();
