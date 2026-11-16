// Popina · cardápio do cliente. ?mesa=N: pede da mesa (o garçom confirma), chama o garçom e vê a conta.
// ?delivery=1: entrega ou retirada, com bairro, cupom e pagamento. r=<restaurante>: o cardápio de verdade (nuvem);
// sem r: o restaurante de exemplo deste aparelho. A cara (capa, logo, cor, tema, horários) vem do restaurante.
import { db, t, din, uid, grava, ouvir, comandaDaMesa, conta, novoPedido, adicionarItem, comanda, lojaCfg, validarCupom, aplicarCupom } from './loja.js?v=19';
import { formOpcoes, aPartir, situacao, textoHorarios, nomeItem, rotAdic } from './opcoes.js?v=19';
import { ico, folha, toast, $, $$ } from './ui.js?v=19';

const q = new URLSearchParams(location.search);
const R = /^[0-9a-f-]{36}$/i.test(q.get('r') || '') ? q.get('r') : '';
const mesa = Math.max(0, parseInt(q.get('mesa'), 10) || 0);
const CHAVE_LOCAL = `popina-cli-${R || 'exemplo'}`;
let M = null, modo = mesa ? 'mesa' : 'delivery', sacola = [], cupom = null, busca = '';
const P = (id) => M.produtos.find((p) => p.id === id);
const guardado = (k, v) => { try { const o = JSON.parse(localStorage.getItem(CHAVE_LOCAL) || '{}'); if (v === undefined) return o[k]; o[k] = v; localStorage.setItem(CHAVE_LOCAL, JSON.stringify(o)); } catch { return undefined; } return undefined; };

// ------------------------------------------------------------------ de onde vem o cardápio
function doExemplo() {
  M = { nome: db.config.nome, cidade: db.config.cidade, servico: db.config.servico, mesas: db.config.mesas, whatsapp: db.config.whatsapp, loja: lojaCfg(),
    categorias: db.categorias, produtos: db.produtos, bairros: db.bairros };
}
async function rpc(fn, args) {
  const c = window.NEXO_NUVEM;
  const r = await fetch(`${c.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: c.chave, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error('rede');
  return r.json();
}
const lojaPadrao = () => ({ cor: '#B4532F', tema: 'claro', estilo: 'moderno', creditos: true, horarios: [], aceitaQR: true, delivery: true, retirada: true, pagamentos: ['Pix', 'Cartão na entrega', 'Dinheiro'], areas: [] });
async function daNuvem() {
  const d = await rpc('popina_cardapio', { p_espaco: R });
  if (d.erro) throw new Error(d.erro);
  M = { ...d, loja: { ...lojaPadrao(), ...(d.loja || {}) }, produtos: d.produtos.map((p) => ({ ...p, ativo: true })) };
}

// as ações do cliente: no exemplo gravam neste aparelho; no restaurante de verdade vão para a fila da nuvem
const api = R ? {
  mesa: (itens) => rpc('popina_pedir', { p_espaco: R, p_tipo: 'mesa', p_mesa: mesa, p_dados: { itens } }),
  pedido: (tipo, dados) => rpc('popina_pedir', { p_espaco: R, p_tipo: tipo, p_mesa: null, p_dados: dados }),
  chamar: () => rpc('popina_pedir', { p_espaco: R, p_tipo: 'chamado', p_mesa: mesa, p_dados: {} }),
  pedirConta: () => rpc('popina_pedir', { p_espaco: R, p_tipo: 'conta', p_mesa: mesa, p_dados: {} }),
  cupom: (codigo, subtotal) => rpc('popina_cupom', { p_espaco: R, p_codigo: codigo, p_subtotal: subtotal }),
  status: (id, tipo) => rpc('popina_status', { p_espaco: R, p_id: id, p_tipo: tipo }),
  async conta() {
    const r = await rpc('popina_conta', { p_espaco: R, p_mesa: mesa }); if (r.erro) throw new Error(r.erro);
    const itens = r.itens.map((i) => ({ ...i, valor: i.qtd * (i.preco + (i.adic || []).reduce((s, a) => s + Number(a.preco || 0), 0)) }));
    const s = itens.reduce((a, i) => a + i.valor, 0), servico = Math.round(s * r.servico) / 100, total = s + servico - (r.desconto || 0);
    return { itens, sub: s, servico, pago: r.pago || 0, falta: Math.max(0, total - (r.pago || 0)), pediuConta: r.pediuConta };
  },
} : {
  mesa: async (itens) => { const id = uid('q'); db.pedidosQR.push({ id, mesa, ts: Date.now(), nome: `Mesa ${mesa} (QR)`, itens }); grava(); return { ok: true, id }; },
  pedido: async (tipo, d) => {
    const c = novoPedido(tipo, { nome: d.nome, tel: d.tel, end: d.end, bairro: d.bairro }, { origem: 'Cardápio online', pagarNaEntrega: d.pagar });
    d.itens.forEach((i) => adicionarItem(c, { prodId: i.prod, qtd: i.qtd, obs: i.obs, adic: i.adic, meia: i.meia, tam: i.tam }));
    if (d.cupom) aplicarCupom(c, d.cupom);
    return { ok: true, id: c.id, num: c.num };
  },
  chamar: async () => { if (!db.chamados.some((x) => x.mesa === mesa && !x.atendido)) { db.chamados.push({ id: uid('c'), mesa, tipo: 'garcom', ts: Date.now(), origem: 'QR' }); grava(); return { ok: true }; } return { ok: true, repetido: true }; },
  pedirConta: async () => { const c = comandaDaMesa(mesa); if (c) { c.pediuConta = Date.now(); grava(); } return { ok: true }; },
  cupom: async (codigo, subtotal) => { const v = validarCupom(codigo, subtotal); return v.erro ? { erro: v.erro } : { ok: true, codigo: v.cupom.codigo, desconto: v.desconto }; },
  async status(id, tipo) {
    if (tipo === 'mesa') return { etapa: db.pedidosQR.some((x) => x.id === id) ? 'recebido' : 'confirmado' };
    const c = comanda(id);
    if (!c) return { etapa: db.vendas.some((v) => v.id === id) ? 'entregue' : 'recebido' };
    if (c.entrega === 'saiu') return { etapa: 'saiu' };
    const it = c.itens.filter((i) => !i.cancelado);
    if (it.every((i) => i.status === 'rascunho')) return { etapa: 'recebido' };
    if (it.every((i) => ['pronto', 'entregue'].includes(i.status))) return { etapa: 'pronto' };
    return { etapa: 'preparo' };
  },
  async conta() {
    const c = comandaDaMesa(mesa); if (!c) return { itens: [] };
    const v = conta(c), its = c.itens.filter((i) => !i.cancelado && i.status !== 'rascunho');
    return { itens: its.map((i) => ({ nome: i.nome, qtd: i.qtd, valor: i.qtd * (i.preco + (i.adic || []).reduce((s, a) => s + a.preco, 0)) })), sub: v.sub, servico: v.servico, pago: v.pago, falta: v.falta, pediuConta: !!c.pediuConta };
  },
};

// ------------------------------------------------------------------ aparência do restaurante
function tema() {
  const L = M.loja, cor = /^#[0-9a-f]{6}$/i.test(L.cor || '') ? L.cor : '#B4532F';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(cor.slice(i, i + 2), 16)); const claro = (0.299 * r + 0.587 * g + 0.114 * b) > 165;
  document.body.style.setProperty('--marca', cor); document.body.style.setProperty('--marca-txt', claro ? '#1d1712' : '#fff');
  // estilo escolhido pelo restaurante (só os conhecidos viram classe); no rústico o fundo é sempre o pergaminho
  // luxo e realeza usam a base do moderno com a paleta e os ornamentos do template
  const est = ['rustico', 'moderno', 'luxo', 'realeza', 'japones', 'italiano', 'churrascaria', 'mexicano', 'pizzaria', 'hamburgueria', 'pub', 'chines', 'balada', 'cafeteria'].includes(L.estilo) ? L.estilo : (L.estilo === undefined ? 'rustico' : 'moderno');
  document.body.classList.remove('est-rustico', 'est-moderno', 'est-luxo', 'est-realeza', 'est-japones', 'est-italiano', 'est-churrascaria', 'est-mexicano', 'est-pizzaria', 'est-hamburgueria', 'est-pub', 'est-chines', 'est-balada', 'est-cafeteria'); document.body.classList.add(`est-${est}`);
  if (['luxo', 'realeza', 'japones', 'italiano', 'churrascaria', 'mexicano', 'pizzaria', 'hamburgueria', 'pub', 'chines', 'balada', 'cafeteria'].includes(est)) document.body.classList.add('est-moderno');
  document.body.classList.toggle('escuro', L.tema === 'escuro' && est === 'moderno');
  $('meta[name=theme-color]').content = cor;
  document.title = `${M.nome} · Cardápio`;
}
const LOURO = '<svg class="louro" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20C9 15 12 10 13 3"/><path d="M8 15c-2.5 0-4-1.2-4.5-3 2.4-.4 4 .6 4.5 3zM10 11.5c-2.2-.6-3.3-2.1-3.3-3.9 2.2.2 3.4 1.6 3.3 3.9zM12 7.5c-1.6-1.1-2.1-2.8-1.7-4.4 1.9.8 2.5 2.4 1.7 4.4zM9.5 14.5c1-2.2 2.8-3.1 4.7-2.8-.9 2-2.6 3-4.7 2.8zM11.5 10.5c1.3-1.9 3-2.4 4.8-1.8-1.2 1.7-2.9 2.3-4.8 1.8z"/></svg>';
const tituloSec = (n) => `<h2 class="cli-h2"><img src="img/c-louro-esq.webp?v=1" alt="" width="30" height="31"><span>${t(n)}</span><img src="img/c-louro-dir.webp?v=1" alt="" width="30" height="31"></h2>`;
const SVG = { local: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>', relogio: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>', zap: '<svg viewBox="0 0 24 24"><path d="M4 20l1.4-4A8 8 0 1 1 8 18.6z"/></svg>', insta: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/></svg>' };
function topo() {
  const L = M.loja, st = situacao(L.horarios);
  const capa = $('#cli-capa-foto'); if (L.capa) { capa.style.backgroundImage = `url("${L.capa.replace(/"/g, '')}")`; capa.classList.remove('sem'); } else { capa.style.backgroundImage = ''; capa.classList.add('sem'); }
  const lg = $('#cli-logo'); if (L.logo) { lg.style.backgroundImage = `url("${L.logo.replace(/"/g, '')}")`; lg.textContent = ''; lg.classList.remove('ini'); } else { lg.style.backgroundImage = ''; lg.textContent = M.nome.split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase(); lg.classList.add('ini'); }
  $('#cli-nome').textContent = M.nome; $('#cli-boas').textContent = L.boasVindas || M.cidade || '';
  $('#cli-status').innerHTML = st.texto ? `<a class="cli-selo ${st.aberto ? 'aberto' : 'fechado'}" href="#horarios">${SVG.relogio}<span>${st.aberto ? `Aberto<br> ${t(st.texto.replace(/^Aberto /, ''))}` : `Fechado<br> ${t(st.texto.replace(/^Fechado agora · /, '').replace('abre hoje às', 'abre às'))}`}</span></a>` : '';
  const zap = String(M.whatsapp || '').replace(/\D/g, '');
  $('#cli-pills').innerHTML = [
    L.endereco ? `<a class="pill" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${L.endereco} ${M.cidade || ''}`)}" target="_blank" rel="noopener">${SVG.local}${t(L.endereco)}</a>` : '',
    zap ? `<a class="pill" href="https://wa.me/55${zap.replace(/^55/, '')}" target="_blank" rel="noopener">${SVG.zap}WhatsApp</a>` : '',
    L.instagram ? `<a class="pill" href="https://instagram.com/${encodeURIComponent(L.instagram.replace(/^@/, ''))}" target="_blank" rel="noopener">${SVG.insta}@${t(L.instagram.replace(/^@/, ''))}</a>` : '',
  ].join('');
}
const nomeMesaDe = (n) => { const a = (M.loja.areas || []).find((x) => n >= x.de && n <= x.ate); return a ? `${a.nome} · mesa ${n}` : `Mesa ${n}`; };
function caixaModo() {
  const L = M.loja, el = $('#cli-modo');
  if (mesa) {
    el.innerHTML = `<div class="cli-modo-caixa na-mesa"><div class="cli-fita-linha"><div class="cli-fita"><b>${t(nomeMesaDe(mesa))}</b></div><img class="cli-aqueduto" src="img/c-aqueduto.webp?v=1" alt="" width="180" height="50"></div>${L.aceitaQR === false ? '<small>Faça o pedido com o garçom</small>' : ''}
      <div class="cli-modo-bts"><button type="button" class="bt" data-chamar>${ico('cloche')}Chamar garçom</button><button type="button" class="bt" data-conta>${ico('conta')}Ver a conta</button></div></div>`;
    $('[data-chamar]', el).onclick = chamar; $('[data-conta]', el).onclick = verConta; return;
  }
  const ops = [['delivery', 'Entregar', L.delivery !== false], ['balcao', 'Vou buscar', L.retirada !== false]].filter((x) => x[2]);
  if (!ops.some((x) => x[0] === modo)) modo = ops[0]?.[0] || 'delivery';
  el.innerHTML = ops.length ? `<div class="cli-modo-caixa"><div class="seg-cli" role="group" aria-label="Entrega ou retirada">${ops.map(([k, n]) => `<button type="button" data-modo="${k}" aria-pressed="${k === modo}">${n}</button>`).join('')}</div>
    <div><small>${modo === 'delivery' ? `Entrega em ${t(L.tempoEntrega || 'até 1 hora')}` : `Pronto em ${t(L.tempoRetirada || '30 min')}`}${L.pedidoMinimo ? ` · pedido mínimo ${din(L.pedidoMinimo)}` : ''}</small></div></div>`
    : '<div class="cli-aviso fechado">Este restaurante não está recebendo pedidos pelo link agora.</div>';
  $$('[data-modo]', el).forEach((b) => { b.onclick = () => { modo = b.dataset.modo; caixaModo(); desenhaSacola(); }; });
}
function acompanharLink() {
  const u = guardado('ultimo'); if (!u || Date.now() - u.ts > 6 * 3600e3) return '';
  return `<div class="cli-acomp"><div><b>Seu pedido de ${new Date(u.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</b><small>Veja em que pé está</small></div><button type="button" class="bt" data-acomp>Acompanhar</button></div>`;
}
function avisos() {
  const L = M.loja, st = situacao(L.horarios);
  $('#cli-aviso').innerHTML = (!mesa && !st.aberto ? `<div class="cli-aviso fechado">${t(st.texto)}. Você pode olhar o cardápio; os pedidos voltam quando abrir.</div>` : '')
    + acompanharLink();
  $('#cli-aviso-fim').innerHTML = L.aviso ? `<div class="cli-aviso">${t(L.aviso)}</div>` : '';
  $('[data-acomp]')?.addEventListener('click', () => acompanhar(guardado('ultimo')));
}

// ------------------------------------------------------------------ cardápio
const precoCard = (p) => `<span class="cli-preco">${p.promoDe ? `<s>${din(p.promoDe)}</s>` : ''}${p.tamanhos?.length ? `<small>a partir de</small> ${din(aPartir(p))}` : din(p.preco)}${p.porKg ? '<small>/kg · pesado no balcão</small>' : ''}</span>`;
const tags = (p) => ((p.tags || []).length ? `<span class="cli-tags">${p.tags.map((x) => { const v = /vegetari|vegan/i.test(x); return `<i class="tag ${v ? 'verde' : ''}">${ico(v ? 'folha' : 'coroa')}${t(x)}</i>`; }).join('')}</span>` : '');
const cartao = (p) => `<button type="button" class="cli-prod ${p.ativo === false ? 'off' : ''}" data-p="${p.id}" ${p.ativo === false ? 'aria-disabled="true"' : ''}>
  <span class="cli-prod-txt">${tags(p)}<b>${t(p.nome)}</b>${p.desc ? `<p>${t(p.desc)}</p>` : ''}${p.ativo === false ? '<span class="cli-preco">Esgotado hoje</span>' : precoCard(p)}</span>
  ${p.foto ? `<img src="${t(p.foto)}" alt="" loading="lazy">` : ''}${p.ativo === false || p.porKg ? '' : '<i class="cli-mais" aria-hidden="true">+</i>'}</button>`;
function lista() {
  const visiveis = M.produtos.filter((p) => !busca || `${p.nome} ${p.desc || ''}`.toLowerCase().includes(busca.toLowerCase()));
  const cats = M.categorias.filter((c) => visiveis.some((p) => p.cat === c.id));
  const dest = !busca ? M.produtos.filter((p) => p.destaque && p.ativo !== false) : [];
  $('#cli-cats').innerHTML = (dest.length ? '<a href="#sec-destaques" class="on">Destaques</a>' : '') + cats.map((c, k) => `<a href="#sec-${c.id}" class="${!k && !dest.length ? 'on' : ''}">${t(c.nome)}</a>`).join('');
  $('#cli-lista').innerHTML = (dest.length ? `<section class="cli-sec" id="sec-destaques">${tituloSec('Destaques da casa')}<div class="cli-destaques">${dest.map((p) => `<button type="button" class="cli-dest" data-p="${p.id}" aria-label="${t(p.nome)}, ${p.tamanhos?.length ? 'a partir de ' + din(aPartir(p)) : din(p.preco)}">${p.foto ? `<img src="${t(p.foto)}" alt="" loading="lazy">` : ''}<span><b>${t(p.nome)}</b></span></button>`).join('')}</div></section>` : '')
    + (cats.map((c) => `<section class="cli-sec" id="sec-${c.id}">${tituloSec(c.nome)}<div class="cli-grade">${visiveis.filter((p) => p.cat === c.id).map(cartao).join('')}</div></section>`).join('')
    || `<p class="cli-vazio">${busca ? `Nada encontrado para “${t(busca)}”.` : 'O cardápio ainda está sendo montado.'}</p>`);
  const links = $$('#cli-cats a');
  links.forEach((a) => { a.onclick = () => links.forEach((x) => x.classList.toggle('on', x === a)); });
}
function rodape() {
  const L = M.loja, hoje = new Date().getDay();
  $('#cli-rodape').innerHTML = `${L.horarios?.some((d) => d?.length) ? `<h3 id="horarios">Horários</h3><ul class="cli-horarios">${textoHorarios(L.horarios).map(([d, h], k) => `<li class="${k === hoje ? 'hoje' : ''}"><span>${d[0].toUpperCase() + d.slice(1)}</span><span>${h}</span></li>`).join('')}</ul>` : ''}
    ${L.endereco ? `<p>${t(L.endereco)}${M.cidade ? ` · ${t(M.cidade)}` : ''}</p>` : ''}
    ${L.creditos !== false && !M.marca ? `<p>Cardápio feito com o Popina${R ? '' : ' · <a href="fotos/CREDITOS.md" target="_blank" rel="noopener">créditos das fotos</a>'}</p>` : ''}`;
}

// ------------------------------------------------------------------ escolher um prato
function detalhe(p) {
  if (!p || p.ativo === false) return;
  if (p.porKg) return toast(`${p.nome}: ${din(p.preco)} o quilo. Monte o prato no buffet e pese no balcão.`);
  if (mesa && M.loja.aceitaQR === false) return toast('Os pedidos desta mesa são feitos com o garçom.');
  const op = formOpcoes(p, { produtos: M.produtos, din, t, obsRapidas: [] });
  folha({ titulo: p.nome, corpo: `${p.foto ? `<img class="cli-foto" src="${t(p.foto)}" alt="">` : ''}${tags(p)}${p.desc ? `<p class="cli-det-txt">${t(p.desc)}</p>` : ''}${p.serve ? `<p class="cli-det-serve">${t(p.serve)}</p>` : ''}${op.html}`,
    pe: '<button type="button" class="bt cheio grande" data-add>Adicionar</button>',
    aoAbrir: (f, fechar) => {
      const bt = $('[data-add]', f);
      op.ligar(f, () => { const fl = op.falta(); bt.textContent = fl || `Adicionar · ${din(op.unit() * op.s.qtd)}`; bt.classList.toggle('pendente', !!fl); });
      bt.onclick = () => {
        const fl = op.falta(); if (fl) return toast(fl);
        const it = op.item(f), b = it.meia && P(it.meia.b);
        sacola.push({ k: uid(), prod: p.id, nome: nomeItem(p, { tam: it.tam, meia: it.meia }, b), qtd: it.qtd, unit: it.unit, tam: it.tam, adic: it.adic, obs: it.obs, meia: it.meia });
        fechar(); desenhaSacola(); toast(`${it.qtd}× ${p.nome} no pedido`);
      };
    } });
}

// ------------------------------------------------------------------ sacola (barra no celular, painel ao lado no computador)
const sub = () => sacola.reduce((s, i) => s + i.qtd * i.unit, 0);
const taxaBairro = (nome) => (modo === 'delivery' ? (M.bairros.find((b) => b.nome === nome)?.taxa || 0) : 0);
const abaixoMinimo = () => !mesa && M.loja.pedidoMinimo && sub() < M.loja.pedidoMinimo;
function htmlSacola(comBotao) {
  if (!sacola.length) return `<h2>Seu pedido</h2><p class="sacola-vazia">${mesa ? 'Escolha os pratos e mande direto para o garçom confirmar.' : 'Escolha os pratos para montar o seu pedido.'}</p>`;
  return `<h2>Seu pedido</h2><ul class="sacola-itens">${sacola.map((i) => `<li><div><b>${t(i.nome)}</b>${i.adic.length ? `<small>${i.adic.map(rotAdic).join(' · ')}</small>` : ''}${i.obs ? `<small>${t(i.obs)}</small>` : ''}</div><b>${din(i.qtd * i.unit)}</b>
    <div class="sacola-qtd"><button type="button" data-menos="${i.k}" aria-label="Menos ${t(i.nome)}">−</button><b>${i.qtd}</b><button type="button" data-mais="${i.k}" aria-label="Mais ${t(i.nome)}">+</button></div></li>`).join('')}</ul>
    ${!mesa ? `<div class="cupom"><input data-cupom placeholder="Cupom de desconto" aria-label="Cupom de desconto" value="${t(cupom?.codigo || '')}" maxlength="24"><button type="button" class="bt" data-aplicar>${cupom ? 'Trocar' : 'Aplicar'}</button></div><p class="cupom-msg ${cupom ? 'ok' : ''}">${cupom ? `Cupom ${t(cupom.codigo)}: − ${din(cupom.desconto)}` : ''}</p>` : ''}
    <div class="sacola-tot"><div><span>Itens</span><span>${din(sub())}</span></div>${cupom ? `<div><span>Desconto</span><span>− ${din(cupom.desconto)}</span></div>` : ''}${!mesa && modo === 'delivery' ? '<div><span>Entrega</span><span>conforme o bairro</span></div>' : ''}<div class="total"><span>Total</span><span>${din(Math.max(0, sub() - (cupom?.desconto || 0)))}</span></div></div>
    ${abaixoMinimo() ? `<p class="cupom-msg">Pedido mínimo de ${din(M.loja.pedidoMinimo)} para ${modo === 'delivery' ? 'entrega' : 'retirada'}.</p>` : ''}
    ${!mesa && R && !situacao(M.loja.horarios).aberto ? `<p class="cupom-msg">${t(situacao(M.loja.horarios).texto)}: monte o pedido agora e mande quando abrir.</p>` : ''}
    ${comBotao ? `<button type="button" class="bt cheio grande" style="width:100%;margin-top:12px" data-seguir ${abaixoMinimo() || (!mesa && R && !situacao(M.loja.horarios).aberto) ? 'disabled' : ''}>${mesa ? 'Mandar para o garçom' : 'Continuar'}</button>` : ''}`;
}
function ligarSacola(el, fecharFolha) {
  el.addEventListener('click', async (e) => {
    const m = e.target.closest('[data-mais],[data-menos]');
    if (m) { const i = sacola.find((x) => x.k === (m.dataset.mais || m.dataset.menos)); if (i) { i.qtd += m.dataset.mais ? 1 : -1; if (i.qtd <= 0) sacola = sacola.filter((x) => x !== i); } desenhaSacola(); revalidarCupom(); if (!sacola.length) fecharFolha?.(); return; }
    const ap = e.target.closest('[data-aplicar]');
    if (ap) {
      const cod = $('[data-cupom]', el).value.trim(); if (!cod) return;
      const r = await mandar(ap, null, () => api.cupom(cod, sub())); if (!r) return;
      cupom = { codigo: r.codigo, desconto: r.desconto }; desenhaSacola(); toast(`Cupom aplicado: − ${din(r.desconto)}`); return;
    }
    if (e.target.closest('[data-seguir]')) { fecharFolha?.(); finalizar(); }
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-cupom]')) $('[data-aplicar]', el)?.click(); });
}
async function revalidarCupom() { if (!cupom) return; const r = await api.cupom(cupom.codigo, sub()).catch(() => null); cupom = r && !r.erro ? { codigo: r.codigo, desconto: r.desconto } : null; desenhaSacola(); }
let ouvirSacola = null;
function desenhaSacola() {
  $('#cli-sacola-lado').innerHTML = htmlSacola(true);
  const n = sacola.reduce((s, i) => s + i.qtd, 0);
  $('#cli-barra').innerHTML = n ? `<button type="button" class="cli-ver" data-abre><span>${ico('carrinho')}Ver pedido (${n})</span><i aria-hidden="true"></i><b>${din(Math.max(0, sub() - (cupom?.desconto || 0)))}</b>${ico('dir')}</button>` : '';
  $('[data-abre]')?.addEventListener('click', () => folha({ titulo: 'Seu pedido', corpo: '<div data-sac></div>', pe: `<button type="button" class="bt cheio grande" data-ir>${mesa ? 'Mandar para o garçom' : 'Continuar'}</button>`,
    aoAbrir: (f, fechar) => {
      const sac = $('[data-sac]', f); ligarSacola(sac, fechar);
      ouvirSacola = () => { sac.innerHTML = htmlSacola(false); $('[data-ir]', f).disabled = !!abaixoMinimo(); }; ouvirSacola();
      $('[data-ir]', f).onclick = () => { fechar(); finalizar(); };
    }, aoFechar: () => { ouvirSacola = null; } }));
  ouvirSacola?.();
}

// ------------------------------------------------------------------ mandar o pedido
async function finalizar() {
  if (!sacola.length) return;
  const itens = sacola.map(({ prod, qtd, obs, adic, meia, tam }) => ({ prod, qtd, obs, adic, meia, tam }));
  if (mesa) {
    folha({ titulo: 'Mandar o pedido?', corpo: `<p class="mudo">O garçom confirma em instantes e o pedido segue para a cozinha. O valor entra na conta da ${t(nomeMesaDe(mesa))}.</p><div class="sacola-tot"><div class="total"><span>Total</span><span>${din(sub())}</span></div></div>`,
      pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio" data-ok>Mandar</button>',
      aoAbrir: (f, fechar) => { const bt = $('[data-ok]', f); bt.onclick = async () => { const r = await mandar(bt, null, () => api.mesa(itens)); if (!r) return; fechar(); concluido({ id: r.id, tipo: 'mesa' }); }; } });
    return;
  }
  const L = M.loja, st = situacao(L.horarios);
  if (!st.aberto && R) return toast(`${st.texto}. Os pedidos voltam quando abrir.`);
  if (!st.aberto) toast('Demonstração: o pedido passa mesmo fora do horário. No restaurante de verdade, só quando estiver aberto.');
  const ant = guardado('cliente') || {};
  folha({ titulo: modo === 'delivery' ? 'Entrega' : 'Retirada no balcão', corpo: `<form class="form" data-form novalidate>
      <label class="campo"><span>Seu nome</span><input name="nome" autocomplete="name" value="${t(ant.nome || '')}" required></label>
      <label class="campo"><span>WhatsApp</span><input name="tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="(16) 9 9999-9999" value="${t(ant.tel || '')}" required></label>
      ${modo === 'delivery' ? `<label class="campo"><span>Endereço com número</span><input name="end" autocomplete="street-address" value="${t(ant.end || '')}"></label>
      <label class="campo"><span>Complemento ou ponto de referência</span><input name="comp" value="${t(ant.comp || '')}" placeholder="Apto, bloco, perto de…"></label>
      <label class="campo"><span>Bairro</span><select name="bairro"><option value="">Escolha o bairro</option>${M.bairros.map((b) => `<option ${b.nome === ant.bairro ? 'selected' : ''} value="${t(b.nome)}">${t(b.nome)} · entrega ${din(b.taxa)}</option>`).join('')}</select></label>` : ''}
      <label class="campo"><span>Como vai pagar?</span><select name="pagar">${(L.pagamentos || ['Pix']).map((x) => `<option>${t(x)}</option>`).join('')}</select></label>
      <label class="campo" data-troco hidden><span>Troco para quanto? (opcional)</span><input name="troco" inputmode="decimal" placeholder="Ex.: 100"></label>
      <div class="sacola-tot" data-tot></div>
      <p class="erro" data-erro role="alert"></p></form>`,
  pe: '<button type="button" class="bt cheio grande" data-mandar>Fazer o pedido</button>',
  aoAbrir: (f, fechar) => {
    const v = (n) => ($(`[name=${n}]`, f)?.value || '').trim();
    const tot = () => { const taxa = taxaBairro(v('bairro')); $('[data-tot]', f).innerHTML = `<div><span>Itens</span><span>${din(sub())}</span></div>${cupom ? `<div><span>Cupom ${t(cupom.codigo)}</span><span>− ${din(cupom.desconto)}</span></div>` : ''}${modo === 'delivery' ? `<div><span>Entrega</span><span>${v('bairro') ? din(taxa) : 'escolha o bairro'}</span></div>` : ''}<div class="total"><span>Total</span><span>${din(Math.max(0, sub() - (cupom?.desconto || 0)) + taxa)}</span></div>`; };
    $('[name=bairro]', f)?.addEventListener('change', tot);
    $('[name=pagar]', f).addEventListener('change', (e) => { $('[data-troco]', f).hidden = !/dinheiro/i.test(e.target.value); });
    tot();
    const bt = $('[data-mandar]', f);
    bt.onclick = async () => {
      const erro = $('[data-erro]', f);
      if (!v('nome')) { erro.textContent = 'Escreva seu nome.'; return $('[name=nome]', f).focus(); }
      if (v('tel').replace(/\D/g, '').length < 10) { erro.textContent = 'Escreva o WhatsApp com DDD para avisarmos do pedido.'; return $('[name=tel]', f).focus(); }
      if (modo === 'delivery' && (!v('end') || !v('bairro'))) { erro.textContent = 'Para entregar, precisamos do endereço e do bairro.'; return $(v('end') ? '[name=bairro]' : '[name=end]', f).focus(); }
      const pagar = v('pagar') + (/dinheiro/i.test(v('pagar')) && v('troco') ? `, troco para ${v('troco')}` : '');
      const end = modo === 'delivery' ? [v('end'), v('comp')].filter(Boolean).join(' · ') : '';
      guardado('cliente', { nome: v('nome'), tel: v('tel'), end: v('end'), comp: v('comp'), bairro: v('bairro') });
      const r = await mandar(bt, erro, () => api.pedido(modo, { nome: v('nome'), tel: v('tel'), end, bairro: modo === 'delivery' ? v('bairro') : '', pagar, cupom: cupom?.codigo || '', itens }));
      if (!r) return;
      fechar(); concluido({ id: r.id, tipo: modo, num: r.num });
    };
  } });
}
function concluido(u) {
  sacola = []; cupom = null; desenhaSacola();
  if (u.id) { guardado('ultimo', { ...u, ts: Date.now() }); avisos(); }
  acompanhar({ ...u, ts: Date.now() }, true);
}
// envia sem deixar a pessoa tocar duas vezes; erro aparece na própria folha (ou em aviso)
async function mandar(bt, erro, f) {
  const txt = bt.textContent; bt.disabled = true; bt.textContent = 'Enviando…';
  try { const r = await f(); if (r?.erro) throw new Error(r.erro); return r || {}; } catch (e) {
    const m = e.message === 'rede' || e.message === 'Failed to fetch' ? 'Sem internet agora. Confira a conexão e tente de novo.' : e.message;
    if (erro) erro.textContent = m; else toast(m); return null;
  } finally { bt.disabled = false; bt.textContent = txt; }
}

// ------------------------------------------------------------------ acompanhar o pedido
const PASSOS = {
  mesa: [['recebido', 'Pedido enviado ao garçom'], ['confirmado', 'Confirmado e na cozinha'], ['fim', 'O garçom leva na mesa quando ficar pronto']],
  delivery: [['recebido', 'Pedido recebido'], ['preparo', 'Na cozinha'], ['pronto', 'Pronto, esperando o entregador'], ['saiu', 'Saiu para entrega'], ['entregue', 'Entregue']],
  balcao: [['recebido', 'Pedido recebido'], ['preparo', 'Na cozinha'], ['pronto', 'Pronto para retirar'], ['entregue', 'Retirado']],
};
function acompanhar(u, novo = false) {
  if (!u) return;
  const passos = PASSOS[u.tipo] || PASSOS.delivery; let timer = 0;
  folha({ titulo: novo ? 'Pedido enviado' : 'Seu pedido', corpo: `<div class="cli-ok">${ico('check')}<h3>${novo ? (u.num ? `Pedido #${u.num} recebido` : 'Recebemos o seu pedido') : 'Acompanhe aqui'}</h3>
      <p class="mudo">${u.tipo === 'mesa' ? 'Fique à vontade: o garçom confirma em instantes.' : `A ${t(M.nome)} avisa pelo WhatsApp a cada etapa.`}</p></div><ol class="passos" data-passos></ol>`,
    pe: '<button type="button" class="bt cheio grande" data-fechar>Voltar ao cardápio</button>',
    aoAbrir: (f) => {
      const atual = async () => {
        const r = await api.status(u.id, u.tipo).catch(() => null); const et = r?.etapa || 'recebido';
        const i = passos.findIndex((p) => p[0] === et), at = i < 0 ? 0 : i;
        const ol = $('[data-passos]', f); if (!ol || !document.body.contains(ol)) return clearInterval(timer);
        ol.innerHTML = passos.map(([, n], k) => `<li class="${k < at || (k === at && k === passos.length - 1) ? 'feito' : k === at ? 'agora' : ''}">${n}</li>`).join('');
      };
      atual(); timer = setInterval(atual, 8000);
    }, aoFechar: () => clearInterval(timer) });
}

// ------------------------------------------------------------------ mesa: garçom e conta
async function chamar(e) { const r = await mandar(e.currentTarget, null, api.chamar); if (r) toast(r.repetido ? 'O garçom já foi chamado, está a caminho' : 'Garçom chamado'); }
async function verConta(e) {
  const v = await mandar(e.currentTarget, null, api.conta); if (!v) return;
  if (!v.itens.length) return toast('Ainda não há nada na conta desta mesa');
  folha({ titulo: `Conta · ${nomeMesaDe(mesa)}`, corpo: `<ul class="cli-conta-itens">${v.itens.map((i) => `<li><span>${i.qtd}× ${t(i.nome)}</span><span>${din(i.valor)}</span></li>`).join('')}</ul>
    <div class="totais"><div><span>Subtotal</span><span>${din(v.sub)}</span></div>${v.servico ? `<div><span>Serviço (${M.servico}%)</span><span>${din(v.servico)}</span></div>` : ''}${v.pago ? `<div><span>Já pago</span><span>${din(v.pago)}</span></div>` : ''}<div class="total"><span>Total</span><b>${din(v.falta)}</b></div></div>`,
  pe: v.pediuConta ? '<p class="mudo centro" style="flex:1">Conta pedida. O garçom traz a maquininha ou o Pix.</p>' : '<button type="button" class="bt cheio grande" data-pedir>Pedir a conta</button>',
  aoAbrir: (f, fechar) => { $('[data-pedir]', f)?.addEventListener('click', async (ev) => { if (await mandar(ev.currentTarget, null, api.pedirConta)) { fechar(); toast('Conta pedida. O garçom já vem'); } }); } });
}

// ------------------------------------------------------------------ começo
addEventListener('error', (e) => { if (e.target.tagName === 'IMG') e.target.style.visibility = 'hidden'; }, true);
document.addEventListener('click', (e) => { const b = e.target.closest('.cli-prod,.cli-dest'); if (b) detalhe(P(b.dataset.p)); });
$('#cli-q').addEventListener('input', (e) => { busca = e.target.value.trim(); lista(); });
ligarSacola($('#cli-sacola-lado'));
function tudo() { tema(); topo(); caixaModo(); avisos(); lista(); rodape(); desenhaSacola(); }
async function iniciar() {
  if (!R) { doExemplo(); ouvir(() => { doExemplo(); if (!document.querySelector('.folha-fundo')) { tema(); topo(); avisos(); lista(); } }); tudo(); return; }
  try { await daNuvem(); } catch (e) {
    $('#cli-lista').innerHTML = `<p class="cli-vazio">${t(e.message === 'rede' || e.message === 'Failed to fetch' ? 'Sem internet agora. Confira a conexão e recarregue a página.' : e.message)}</p>`; return;
  }
  tudo();
  // preço, esgotado ou horário mudou no restaurante: atualiza sozinho a cada minuto (sem mexer no que está aberto)
  setInterval(() => { if (document.visibilityState === 'visible' && !document.querySelector('.folha-fundo')) daNuvem().then(() => { tema(); topo(); avisos(); lista(); }).catch(() => {}); }, 60000);
}
iniciar();
