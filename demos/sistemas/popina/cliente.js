// Popina · cardápio do cliente.
// ?mesa=N: pede da mesa (o garçom confere), chama o garçom e pede a conta.  Sem mesa: entrega ou retirada, com taxa por bairro e troco.
// r=<restaurante>: o cardápio de verdade (nuvem). Sem r: o restaurante de exemplo deste aparelho (demonstração).
// Todo pedido também pode ir para o WhatsApp do restaurante (link wa.me com o pedido escrito).
import { ico, folha, toast, $, $$ } from './ui.js?v=42';
import { formOpcoes, temOpcoes, abertoAgora, textoHorarios } from './opcoes.js?v=42';

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
const LOJA_PADRAO = { cor: '#B4532F', horarios: [], aceitaQR: true, delivery: true, retirada: true, pagamentos: ['Pix', 'Cartão na entrega', 'Dinheiro'], pedidoMinimo: 0, tempoEntrega: '', tempoRetirada: '' };

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
  const cor = /^#[0-9a-f]{6}$/i.test(L.cor || '') ? L.cor : '#B4532F';
  let c = [1, 3, 5].map((k) => parseInt(cor.slice(k, k + 2), 16));
  const lum = (x) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(x[0]) + 0.7152 * f(x[1]) + 0.0722 * f(x[2]); };
  for (let k = 0; k < 40 && 1.05 / (lum(c) + 0.05) < 4.6; k++) c = c.map((v) => v * 0.93);
  const h = '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const s = document.documentElement.style; s.setProperty('--loja', h); s.setProperty('--loja-tinta', h); s.setProperty('--loja-suave', '#' + [1, 3, 5].map((k) => Math.round(parseInt(cor.slice(k, k + 2), 16) * 0.16 + 255 * 0.84).toString(16).padStart(2, '0')).join(''));
  $('meta[name=theme-color]').content = h;
  document.title = `${M.nome} · Cardápio`;
}

// ------------------------------------------------------------------ topo, modo e lista
const aberto = () => !R || abertoAgora(L.horarios); // na demonstração o exemplo fica sempre aberto (para testar a qualquer hora)
const precoBase = (p) => (p.tamanhos?.length ? Math.min(...p.tamanhos.map((x) => Number(x.preco) || 0)) : Number(p.preco) || 0);
const vendeOnline = (p) => !p.porKg;
function topo() {
  const ini = String(M.nome || 'R').split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  const zap = soDig(M.whatsapp);
  $('#cli-topo').innerHTML = `${L.capa ? `<div class="cli-capa" style="background-image:url('${t(L.capa)}')" role="img" aria-label="Foto do restaurante"></div>` : ''}
    <div class="cli-id"><div class="cli-logo" ${L.logo ? `style="background-image:url('${t(L.logo)}')"` : ''}>${L.logo ? '' : t(ini)}</div>
      <div><h1>${t(M.nome)}</h1>${L.boasVindas ? `<p>${t(L.boasVindas)}</p>` : ''}
        <p class="cli-st"><span class="etq ${aberto() ? 'livre' : 'alerta'}">${aberto() ? 'Aberto agora' : 'Fechado agora'}</span><button type="button" class="cli-link" data-horarios>Ver horários</button></p></div></div>
    <div class="cli-pills">${L.endereco ? `<a class="chip" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${L.endereco} ${M.cidade || ''}`)}">${ico('pino')}${t(L.endereco)}</a>` : ''}${zap ? `<a class="chip" target="_blank" rel="noopener" href="https://wa.me/55${zap.replace(/^55/, '')}">${ico('zap')}WhatsApp</a>` : ''}</div>`;
  $('[data-horarios]').onclick = () => folha({ titulo: 'Horários', corpo: `<ul class="lista-l">${textoHorarios(L.horarios).map((x) => `<li><div class="tx">${t(x)}</div></li>`).join('')}</ul>` });
}
function caixaModo() {
  const el = $('#cli-modo');
  if (mesa) {
    el.innerHTML = `<div class="cartao cli-mesa"><div><b>Mesa ${mesa}</b><small>${L.aceitaQR === false ? 'Faça o pedido com o garçom' : 'Escolha, mande o pedido e o garçom confere'}</small></div>
      <div class="cli-mesa-bts"><button type="button" class="bt" data-chamar>${ico('sino')}Chamar o garçom</button><button type="button" class="bt" data-conta>${ico('conta')}Ver a conta</button></div></div>`;
    $('[data-chamar]', el).onclick = chamar; $('[data-conta]', el).onclick = verConta; return;
  }
  const ops = [['delivery', 'Entrega', L.delivery !== false], ['balcao', 'Vou buscar', L.retirada !== false]].filter((x) => x[2]);
  if (!ops.some((x) => x[0] === modo)) modo = ops[0]?.[0] || 'delivery';
  el.innerHTML = ops.length ? `<div class="chips" role="group" aria-label="Como quer receber">${ops.map(([k, n]) => `<button type="button" class="chip" data-modo="${k}" aria-pressed="${modo === k}">${k === 'delivery' ? ico('moto') : ico('sacola')}${n}</button>`).join('')}</div>
    <p class="mudo cli-tempo">${modo === 'delivery' ? `${L.tempoEntrega ? `Entrega em ${t(L.tempoEntrega)}` : 'Entrega'}${L.pedidoMinimo ? ` · pedido mínimo ${din(L.pedidoMinimo)}` : ''}${(M.bairros || []).length ? ` · taxa de ${din(Math.min(...M.bairros.map((b) => b.taxa)))} a ${din(Math.max(...M.bairros.map((b) => b.taxa)))}` : ''}` : `${L.tempoRetirada ? `Fica pronto em ${t(L.tempoRetirada)}` : 'Retire no balcão'}${L.endereco ? ` · ${t(L.endereco)}` : ''}`}</p>`
    : '<p class="aviso">Este restaurante não está aceitando pedidos pelo link agora.</p>';
  $$('[data-modo]', el).forEach((b) => { b.onclick = () => { modo = b.dataset.modo; caixaModo(); barra(); }; });
}
function lista() {
  const prods = M.produtos.filter(vendeOnline), qq = busca.toLowerCase();
  const cats = (M.categorias || []).filter((k) => prods.some((p) => p.cat === k.id));
  $('#cli-cats').innerHTML = `<button type="button" class="chip" data-cat="" aria-pressed="${!cat}">Tudo</button>${cats.map((k) => `<button type="button" class="chip" data-cat="${t(k.id)}" aria-pressed="${cat === k.id}">${t(k.nome)}</button>`).join('')}`;
  $$('[data-cat]').forEach((b) => { b.onclick = () => { cat = b.dataset.cat; lista(); if (cat) document.getElementById(`c-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
  const pode = !mesa || L.aceitaQR !== false;
  const sec = cats.filter((k) => !cat || k.id === cat).map((k) => { const l = prods.filter((p) => p.cat === k.id && (!qq || `${p.nome} ${p.desc || ''}`.toLowerCase().includes(qq))); if (!l.length) return '';
    return `<section id="c-${t(k.id)}"><h2 class="cli-h2">${t(k.nome)}</h2><div class="cli-prods">${l.map((p) => `<article class="cli-prod">${p.foto ? `<img src="${t(p.foto)}" alt="" loading="lazy" width="112" height="112">` : ''}
      <div class="tx"><h3>${t(p.nome)}</h3>${p.desc ? `<p>${t(p.desc)}</p>` : ''}<b class="preco">${p.tamanhos?.length ? 'a partir de ' : ''}${din(precoBase(p))}</b>
      ${pode ? `<button type="button" class="bt cheio" data-pedir="${t(p.id)}">Pedir</button>` : ''}</div></article>`).join('')}</div></section>`; }).join('');
  $('#cli-lista').innerHTML = sec || '<p class="vazio">Nada encontrado.</p>';
  $$('[data-pedir]').forEach((b) => { b.onclick = () => escolher(P(b.dataset.pedir)); });
}

// ------------------------------------------------------------------ sacola
const valorLinha = (x) => r2(x.qtd * x.unit);
const subtotal = () => r2(sacola.reduce((s, x) => s + valorLinha(x), 0));
const nomeLinha = (x) => { const p = P(x.prod); if (!p) return 'item'; const b = x.meia?.b && P(x.meia.b); return `${b ? `Meia ${p.nome.replace(/^Pizza /i, '').toLowerCase()} / meia ${b.nome.replace(/^Pizza /i, '').toLowerCase()}` : p.nome}${x.tam ? ` (${x.tam})` : ''}`; };
function salvarSacola() { guardado(`sacola-${mesa || modo}`, sacola); }
function escolher(p) {
  if (!p) return;
  if (!aberto() && !mesa) { toast('O restaurante está fechado agora'); return; }
  const por = (v, unit) => { sacola.push({ prod: p.id, qtd: v.qtd, tam: v.tam, meia: v.meia, adic: v.adic, obs: v.obs, unit }); salvarSacola(); barra(); toast(`${v.qtd}× ${p.nome} na sacola`); };
  if (!temOpcoes(p)) return por({ qtd: 1, tam: '', meia: null, adic: [], obs: '' }, precoBase(p));
  const fo = formOpcoes(p, { produtos: M.produtos });
  folha({ titulo: p.nome, corpo: `${p.foto ? `<img class="cli-foto-g" src="${t(p.foto)}" alt="">` : ''}${p.desc ? `<p class="mudo" style="margin-bottom:12px">${t(p.desc)}</p>` : ''}${fo.html}`,
    pe: '<button type="button" class="bt cheio grande" data-ok>Pôr na sacola</button>',
    aoAbrir: (f, fechar) => { const bt = $('[data-ok]', f); fo.ligar($('.folha-corpo', f), () => { bt.textContent = `Pôr na sacola · ${din(fo.total())}`; });
      bt.onclick = () => { const falta = fo.falta(); if (falta) return toast(falta); const v = fo.valor(); fechar(); por(v, r2(fo.total() / v.qtd)); }; } });
}
function barra() {
  const n = sacola.reduce((s, x) => s + x.qtd, 0), el = $('#cli-barra');
  el.innerHTML = n ? `<button type="button" class="bt cheio grande" data-sacola>${ico('sacola')}Ver pedido · ${n} ${n === 1 ? 'item' : 'itens'} · ${din(subtotal())}</button>` : '';
  el.hidden = !n; $('[data-sacola]', el)?.addEventListener('click', abrirSacola);
}
const taxaBairro = (b) => r2((M.bairros || []).find((x) => x.nome === b)?.taxa || 0);
function abrirSacola() {
  const cli = guardado('cliente') || {};
  const corpo = () => `<ul class="itens">${sacola.map((x, k) => `<li><span class="q">${x.qtd}×</span><div class="nm"><b>${t(nomeLinha(x))}</b>${x.adic?.length ? `<small>${t(x.adic.map((a) => a.nome.replace(/^[^:]+: /, '')).join(', '))}</small>` : ''}${x.obs ? `<small class="obs">${t(x.obs)}</small>` : ''}</div><span class="v">${din(valorLinha(x))}</span>
      <button type="button" class="bt-ico" data-menos="${k}" aria-label="Tirar um">−</button></li>`).join('')}</ul>
    ${mesa ? '<label class="campo" style="margin-top:12px"><span>Seu nome (opcional)</span><input data-nome maxlength="40" autocomplete="name"></label>' : `
      <div style="margin-top:14px"><label class="campo"><span>Seu nome</span><input data-nome maxlength="60" autocomplete="name" value="${t(cli.nome || '')}"></label>
      <label class="campo"><span>Seu WhatsApp</span><input data-tel inputmode="tel" autocomplete="tel" value="${t(cli.tel || '')}" placeholder="16 99999-9999"></label>
      ${modo === 'delivery' ? `<label class="campo"><span>Endereço (rua, número, complemento)</span><input data-end maxlength="160" autocomplete="street-address" value="${t(cli.end || '')}"></label>
        ${(M.bairros || []).length ? `<label class="campo"><span>Bairro</span><select data-bairro><option value="">Escolha o bairro</option>${M.bairros.map((b) => `<option value="${t(b.nome)}" ${cli.bairro === b.nome ? 'selected' : ''}>${t(b.nome)} · entrega ${din(b.taxa)}</option>`).join('')}</select></label>` : ''}` : ''}
      <p class="campo"><span>Como vai pagar</span></p><div class="chips quebra">${(L.pagamentos || []).map((f, k) => `<button type="button" class="chip" data-pg="${t(f)}" aria-pressed="${k === 0}">${t(modo === 'balcao' ? f.replace(' na entrega', '') : f)}</button>`).join('')}</div>
      <label class="campo" data-troco-l hidden style="margin-top:10px"><span>Troco para quanto? (deixe vazio se não precisa)</span><input data-troco inputmode="decimal" placeholder="Ex.: 50"></label></div>`}
    <label class="campo" style="margin-top:6px"><span>Alguma observação?</span><input data-obs maxlength="140" placeholder="Ex.: tocar a campainha"></label>
    <div class="totais" data-tot></div>`;
  folha({ titulo: mesa ? `Pedido da mesa ${mesa}` : modo === 'delivery' ? 'Seu pedido para entrega' : 'Seu pedido para retirar', corpo: `<div data-c>${corpo()}</div>`,
    pe: `<button type="button" class="bt cheio grande" data-enviar>${mesa ? 'Mandar para o garçom' : 'Fazer o pedido'}</button>`,
    aoAbrir: (f, fechar) => {
      const tot = () => { const s = subtotal(), tx = modo === 'delivery' ? taxaBairro($('[data-bairro]', f)?.value) : 0; $('[data-tot]', f).innerHTML = `<div><span>Itens</span><span>${din(s)}</span></div>${modo === 'delivery' && !mesa ? `<div><span>Entrega</span><span>${$('[data-bairro]', f)?.value || !(M.bairros || []).length ? din(tx) : 'escolha o bairro'}</span></div>` : ''}<div class="total"><span>Total</span><span>${din(s + tx)}</span></div>`; };
      const ligar = () => {
        $$('[data-menos]', f).forEach((b) => { b.onclick = () => { const x = sacola[Number(b.dataset.menos)]; x.qtd--; if (x.qtd <= 0) sacola.splice(Number(b.dataset.menos), 1); salvarSacola(); barra(); if (!sacola.length) return fechar(); $('[data-c]', f).innerHTML = corpo(); ligar(); }; });
        $$('[data-pg]', f).forEach((b) => { b.onclick = () => { $$('[data-pg]', f).forEach((y) => y.setAttribute('aria-pressed', y === b)); $('[data-troco-l]', f).hidden = b.dataset.pg !== 'Dinheiro'; }; });
        const pg0 = $('[data-pg][aria-pressed=true]', f); if (pg0 && $('[data-troco-l]', f)) $('[data-troco-l]', f).hidden = pg0.dataset.pg !== 'Dinheiro';
        $('[data-bairro]', f)?.addEventListener('change', tot); tot();
      };
      ligar();
      $('[data-enviar]', f).onclick = async (e) => {
        const bt = e.currentTarget; const nome = $('[data-nome]', f)?.value.trim() || '', obs = $('[data-obs]', f).value.trim();
        const itens = sacola.map((x) => ({ prod: x.prod, qtd: x.qtd, tam: x.tam || '', meia: x.meia || null, adic: x.adic || [], obs: [x.obs, obs && sacola.length === 1 ? obs : ''].filter(Boolean).join(', ') }));
        let dados = null;
        if (!mesa) {
          const tel = soDig($('[data-tel]', f).value), end = $('[data-end]', f)?.value.trim() || '', bairro = $('[data-bairro]', f)?.value || '';
          if (nome.length < 2) return toast('Escreva seu nome');
          if (tel.length < 10) return toast('Escreva seu WhatsApp com DDD');
          if (modo === 'delivery' && !end) return toast('Escreva o endereço');
          if (modo === 'delivery' && (M.bairros || []).length && !bairro) return toast('Escolha o bairro');
          if (modo === 'delivery' && L.pedidoMinimo && subtotal() < L.pedidoMinimo) return toast(`O pedido mínimo para entrega é ${din(L.pedidoMinimo)}`);
          const pg = $('[data-pg][aria-pressed=true]', f)?.dataset.pg || '', troco = pg === 'Dinheiro' ? r2(num($('[data-troco]', f).value)) : 0;
          guardado('cliente', { nome, tel, end, bairro });
          dados = { nome, tel, end, bairro, pagar: `${pg}${troco ? ` (troco para ${din(troco)})` : ''}`, troco, itens: obs && sacola.length > 1 ? [...itens.slice(0, -1), { ...itens.at(-1), obs: [itens.at(-1).obs, obs].filter(Boolean).join(', ') }] : itens };
        } else if (obs && sacola.length > 1) itens[itens.length - 1].obs = [itens.at(-1).obs, obs].filter(Boolean).join(', ');
        bt.disabled = true; bt.textContent = 'Mandando…';
        const msg = textoZap(dados, nome, obs);
        try {
          const r = mesa ? await api.mesa(itens) : await api.pedido(modo, dados);
          if (r?.erro) throw new Error(r.erro);
          sacola = []; salvarSacola(); barra(); fechar(); confirmado(r, msg);
        } catch (er) { bt.disabled = false; bt.textContent = 'Tentar de novo'; mostrarFalha(msg, er); }
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
const ETAPAS = { recebido: 'Recebido', confirmado: 'O garçom confirmou', preparo: 'Preparando', pronto: modo === 'delivery' ? 'Pronto, saindo logo' : 'Pronto para retirar', saiu: 'Saiu para entrega', entregue: 'Entregue', agendado: 'Agendado' };
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
    const ver = () => { if (!document.body.contains(f)) return clearInterval(tm); api.status(id, mesa ? 'mesa' : modo).then((s) => { const e = $('[data-etapa]', f); if (e && s?.etapa) e.textContent = ETAPAS[s.etapa] || s.etapa; }).catch(() => {}); };
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
function tudo() { aplicarCor(); topo(); caixaModo(); $('#cli-aviso').innerHTML = `${!aberto() && !mesa ? '<p class="aviso">Fechado agora. Veja os horários acima.</p>' : ''}${L.aviso ? `<p class="aviso azul">${t(L.aviso)}</p>` : ''}`; lista(); rodape(); sacola = guardado(`sacola-${mesa || modo}`) || []; sacola = sacola.filter((x) => P(x.prod)); barra(); }
async function iniciar() {
  if (!R) {
    loja = await import('./loja.js?v=42'); doExemplo();
    loja.ouvir(() => { doExemplo(); if (!document.querySelector('.folha-fundo')) { aplicarCor(); topo(); lista(); } });
    tudo(); return;
  }
  try { await daNuvem(); } catch (e) { $('#cli-lista').innerHTML = `<p class="vazio">${t(e.message === 'rede' || /fetch/i.test(e.message) ? 'Sem internet agora. Confira a conexão e recarregue a página.' : e.message)}</p>`; return; }
  tudo();
  // preço, esgotado ou horário mudou no restaurante: atualiza a cada minuto
  setInterval(() => { if (document.visibilityState === 'visible' && !document.querySelector('.folha-fundo')) daNuvem().then(() => { aplicarCor(); topo(); lista(); }).catch(() => {}); }, 60000);
}
iniciar();
