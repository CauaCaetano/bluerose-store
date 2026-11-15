// Popina · cardápio do cliente. ?mesa=N: pede da mesa (o garçom confirma), chama o garçom e pede a conta.
// ?delivery=1: monta o pedido de entrega ou retirada, que cai em Pedidos > Recebidos.
import { db, t, din, prod, uid, grava, ouvir, comandaDaMesa, conta, novoPedido, adicionarItem } from './loja.js?v=1';
import { OBS_RAPIDAS } from './dados.js?v=1';
import { ico, folha, toast, $, $$ } from './ui.js?v=1';

const q = new URLSearchParams(location.search);
// r=<restaurante>: cardápio de verdade, lido da nuvem (funções públicas com limite). Sem r: o exemplo deste aparelho.
const R = /^[0-9a-f-]{36}$/i.test(q.get('r') || '') ? q.get('r') : '';
let M = { nome: '', cidade: '', servico: 0, categorias: [], produtos: [], bairros: [], mesas: 0 };
const P = (id) => M.produtos.find((p) => p.id === id);
function doExemplo() { M = { nome: db.config.nome, cidade: db.config.cidade, servico: db.config.servico, categorias: db.categorias, produtos: db.produtos, bairros: db.bairros, mesas: db.config.mesas }; }
async function rpc(fn, args) {
  const c = window.NEXO_NUVEM;
  const r = await fetch(`${c.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: c.chave, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error('rede');
  return r.json();
}
async function daNuvem() {
  const d = await rpc('popina_cardapio', { p_espaco: R });
  if (d.erro) throw new Error(d.erro);
  M = { ...d, produtos: d.produtos.map((p) => ({ ...p, ativo: true })) };
}
const mesa = Math.max(0, parseInt(q.get('mesa'), 10) || 0);
const delivery = !mesa;
let sacola = [];
const totalSacola = () => sacola.reduce((s, i) => s + i.qtd * (i.preco + i.adic.reduce((a, x) => a + x.preco, 0)), 0);

function topo() {
  $('#cli-nome').textContent = M.nome;
  $('#cli-onde').textContent = delivery ? `Delivery e retirada · ${M.cidade}` : `Mesa ${mesa}`;
  document.title = `Cardápio · ${M.nome}`;
  let a = $('.cli-acoes');
  if (!delivery && !a) {
    a = document.createElement('div'); a.className = 'cli-acoes';
    a.innerHTML = `<button type="button" class="bt" data-chamar>${ico('sino')}Chamar garçom</button><button type="button" class="bt" data-conta>${ico('conta')}Ver a conta</button>`;
    $('.cli-topo').after(a);
    $('[data-chamar]', a).onclick = chamar; $('[data-conta]', a).onclick = verConta;
  }
}
function lista() {
  const cats = M.categorias.filter((c) => M.produtos.some((p) => p.cat === c.id && p.ativo));
  $('#cli-cats').innerHTML = cats.map((c, k) => `<a class="chip ${k ? '' : 'on'}" href="#cat-${c.id}">${t(c.nome)}</a>`).join('');
  $('#cli-lista').innerHTML = cats.map((c) => `<h2 id="cat-${c.id}">${t(c.nome)}</h2>${M.produtos.filter((p) => p.cat === c.id && p.ativo).map((p) =>
    `<button type="button" class="cli-prod ${p.foto ? '' : 'sem-img'}" data-p="${p.id}">${p.foto ? `<img src="${t(p.foto)}" alt="" loading="lazy">` : ''}<div><b>${t(p.nome)}</b><p>${t(p.desc)}</p><em>${din(p.preco)}${p.porKg ? '/kg · pesado no balcão' : ''}</em></div></button>`).join('')}`).join('');
  $$('#cli-cats a').forEach((a) => { a.onclick = () => { $$('#cli-cats a').forEach((x) => x.classList.toggle('on', x === a)); }; });
}
function barra() {
  const n = sacola.reduce((s, i) => s + i.qtd, 0);
  $('#cli-barra').innerHTML = n ? `<button type="button" class="bt cheio" data-sacola><span>${ico('sacola')} Ver pedido (${n})</span><b>${din(totalSacola())}</b></button>` : '';
  $('[data-sacola]')?.addEventListener('click', verSacola);
}

// escolher um prato: meia a meia, adicionais, observação e quantidade
function detalhe(p) {
  if (p.porKg) return toast(`${p.nome}: ${din(p.preco)} o quilo. Monte o prato no buffet e pese no balcão.`);
  let qtd = 1, adic = [], obs = [], meiaB = '';
  const pizzas = M.produtos.filter((x) => x.pizza && x.ativo && x.id !== p.id);
  folha({ titulo: p.nome, corpo: `${p.foto ? `<img class="cli-foto" src="${t(p.foto)}" alt="">` : ''}<p class="mudo">${t(p.desc)}</p>
    ${p.pizza ? `<div class="campo"><span>Meia a meia (opcional)</span><div class="chips quebra">${pizzas.map((x) => `<button type="button" class="chip" data-meia="${x.id}">½ ${t(x.nome.replace(/^Pizza /, ''))}</button>`).join('')}</div></div>` : ''}
    ${p.adicionais?.length ? `<div class="campo"><span>Adicionais</span><div class="chips quebra">${p.adicionais.map((a, k) => `<button type="button" class="chip" data-ad="${k}">${t(a.nome)} +${din(a.preco)}</button>`).join('')}</div></div>` : ''}
    <div class="campo"><span>Alguma observação?</span><div class="chips quebra">${OBS_RAPIDAS.slice(0, 8).map((o) => `<button type="button" class="chip" data-obs="${t(o)}">${t(o)}</button>`).join('')}</div>
      <input data-livre maxlength="120" placeholder="Escreva aqui (opcional)" aria-label="Observação"></div>
    <div class="qtd"><button type="button" class="bt-ico grande" data-menos aria-label="Menos">−</button><b data-q>1</b><button type="button" class="bt-ico grande" data-mais aria-label="Mais">+</button></div>`,
  pe: `<button type="button" class="bt cheio grande" data-add>Adicionar · ${din(p.preco)}</button>`,
  aoAbrir: (f, fechar) => {
    const base = () => (meiaB ? Math.max(p.preco, P(meiaB).preco) : p.preco);
    const atual = () => { $('[data-q]', f).textContent = qtd; $('[data-add]', f).textContent = `Adicionar · ${din((base() + adic.reduce((s, a) => s + a.preco, 0)) * qtd)}`; };
    $('[data-menos]', f).onclick = () => { qtd = Math.max(1, qtd - 1); atual(); };
    $('[data-mais]', f).onclick = () => { qtd = Math.min(30, qtd + 1); atual(); };
    $$('[data-meia]', f).forEach((b) => { b.onclick = () => { meiaB = meiaB === b.dataset.meia ? '' : b.dataset.meia; $$('[data-meia]', f).forEach((x) => x.classList.toggle('on', x.dataset.meia === meiaB)); atual(); }; });
    $$('[data-ad]', f).forEach((b) => { b.onclick = () => { const a = p.adicionais[b.dataset.ad]; const on = b.classList.toggle('on'); adic = on ? [...adic, a] : adic.filter((x) => x !== a); atual(); }; });
    $$('[data-obs]', f).forEach((b) => { b.onclick = () => { const on = b.classList.toggle('on'); obs = on ? [...obs, b.dataset.obs] : obs.filter((x) => x !== b.dataset.obs); }; });
    $('[data-add]', f).onclick = () => {
      const nome = meiaB ? `Pizza meia ${p.nome.replace(/^Pizza /, '')} / meia ${P(meiaB).nome.replace(/^Pizza /, '')}` : p.nome;
      sacola.push({ k: uid(), prod: p.id, nome, qtd, preco: base(), adic, obs: [...obs, $('[data-livre]', f).value.trim()].filter(Boolean).join(', '), meia: meiaB ? { a: p.id, b: meiaB } : null });
      fechar(); barra(); toast(`${qtd}× ${nome} no pedido`);
    };
  } });
}

function verSacola() {
  const linhas = () => sacola.map((i) => `<li><span><b>${i.qtd}× ${t(i.nome)}</b>${i.adic.length ? `<small>+ ${i.adic.map((a) => t(a.nome)).join(', ')}</small>` : ''}${i.obs ? `<small>${t(i.obs)}</small>` : ''}</span>
    <span>${din(i.qtd * (i.preco + i.adic.reduce((s, a) => s + a.preco, 0)))}</span><button type="button" class="bt-ico" data-tirar="${i.k}" aria-label="Tirar ${t(i.nome)}">${ico('lixo')}</button></li>`).join('');
  const campos = delivery ? `<form data-form class="form" novalidate>
      <div class="seg grande" role="group" aria-label="Entrega ou retirada"><button type="button" data-modo="delivery" aria-pressed="true">Entregar</button><button type="button" data-modo="balcao" aria-pressed="false">Vou buscar</button></div>
      <label class="campo"><span>Seu nome</span><input name="nome" autocomplete="name" required></label>
      <label class="campo"><span>WhatsApp</span><input name="tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="(16) 9 9999-9999" required></label>
      <div data-end><label class="campo"><span>Endereço com número</span><input name="end" autocomplete="street-address"></label>
      <label class="campo"><span>Bairro</span><select name="bairro"><option value="">Escolha o bairro</option>${M.bairros.map((b) => `<option>${t(b.nome)}</option>`).join('')}</select></label></div>
      <label class="campo"><span>Como vai pagar?</span><select name="pagar"><option>Pix</option><option>Cartão na entrega</option><option>Dinheiro</option></select></label>
      <label class="campo" data-troco hidden><span>Troco para quanto? (opcional)</span><input name="troco" inputmode="decimal" placeholder="Ex.: 100"></label>
      <p class="erro" data-erro role="alert"></p></form>` : '<p class="mudo">O pedido vai para o garçom confirmar e segue direto para a cozinha.</p>';
  folha({ titulo: 'Seu pedido', corpo: `<ul class="lista-itens" data-linhas>${linhas()}</ul><div class="totais" data-tot></div>${campos}`,
    pe: `<button type="button" class="bt cheio grande" data-mandar>${delivery ? 'Fazer o pedido' : 'Mandar para a cozinha'}</button>`,
    aoAbrir: (f, fechar) => {
      let modo = 'delivery';
      const tot = () => {
        const b = M.bairros.find((x) => x.nome === $('[name=bairro]', f)?.value), taxa = delivery && modo === 'delivery' ? (b?.taxa || 0) : 0;
        $('[data-tot]', f).innerHTML = `${taxa ? `<div><span>Itens</span><span>${din(totalSacola())}</span></div><div><span>Entrega</span><span>${din(taxa)}</span></div>` : ''}<div class="total"><span>Total</span><b>${din(totalSacola() + taxa)}</b></div>`;
      };
      const redesenha = () => { $('[data-linhas]', f).innerHTML = linhas(); tot(); barra(); if (!sacola.length) fechar(); };
      f.addEventListener('click', (e) => { const b = e.target.closest('[data-tirar]'); if (b) { sacola = sacola.filter((i) => i.k !== b.dataset.tirar); redesenha(); } });
      $$('[data-modo]', f).forEach((b) => { b.onclick = () => { modo = b.dataset.modo; $$('[data-modo]', f).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); $('[data-end]', f).hidden = modo !== 'delivery'; tot(); }; });
      $('[name=bairro]', f)?.addEventListener('change', tot);
      $('[name=pagar]', f)?.addEventListener('change', (e) => { $('[data-troco]', f).hidden = e.target.value !== 'Dinheiro'; });
      tot();
      const bt = $('[data-mandar]', f);
      bt.onclick = async () => {
        if (!sacola.length || bt.disabled) return;
        const itens = sacola.map(({ prod: p, qtd, obs, adic, meia }) => ({ prod: p, qtd, obs, adic, meia })); const erro = $('[data-erro]', f);
        if (delivery) {
          const v = (n) => $(`[name=${n}]`, f).value.trim();
          if (!v('nome')) { erro.textContent = 'Escreva seu nome.'; return $('[name=nome]', f).focus(); }
          if (v('tel').replace(/\D/g, '').length < 10) { erro.textContent = 'Escreva o WhatsApp com DDD para avisarmos do pedido.'; return $('[name=tel]', f).focus(); }
          if (modo === 'delivery' && (!v('end') || !v('bairro'))) { erro.textContent = 'Para entregar, precisamos do endereço e do bairro.'; return $(v('end') ? '[name=bairro]' : '[name=end]', f).focus(); }
          const pagar = v('pagar') + (v('pagar') === 'Dinheiro' && v('troco') ? `, troco para ${v('troco')}` : '');
          const cli = { nome: v('nome'), tel: v('tel'), end: modo === 'delivery' ? v('end') : '', bairro: modo === 'delivery' ? v('bairro') : '' };
          const ok = await mandar(bt, erro, () => api.pedido(modo, cli, pagar, itens)); if (!ok) return;
          sacola = []; barra(); fechar(); confirmado(ok.num ? `Pedido #${ok.num} recebido` : 'Pedido recebido', `A ${t(M.nome)} confirma pelo WhatsApp e avisa quando ${modo === 'delivery' ? 'sair para entrega' : 'estiver pronto para buscar'}.`);
        } else {
          const ok = await mandar(bt, erro, () => api.mesa(itens)); if (!ok) return;
          sacola = []; barra(); fechar(); confirmado('Pedido enviado', 'O garçom confirma em instantes e ele segue para a cozinha.');
        }
      };
    } });
}
// envia sem deixar a pessoa tocar duas vezes; erro aparece na própria folha (ou em aviso, na mesa)
async function mandar(bt, erro, f) {
  const txt = bt.textContent; bt.disabled = true; bt.textContent = 'Enviando…';
  try { const r = await f(); if (r?.erro) throw new Error(r.erro); return r || {}; } catch (e) {
    const m = e.message === 'rede' || e.message === 'Failed to fetch' ? 'Sem internet agora. Confira a conexão e tente de novo.' : e.message;
    if (erro) erro.textContent = m; else toast(m); return null;
  } finally { bt.disabled = false; bt.textContent = txt; }
}
// as ações do cliente: no exemplo gravam neste aparelho; no restaurante de verdade vão para a fila da nuvem
const api = R ? {
  mesa: (itens) => rpc('popina_pedir', { p_espaco: R, p_tipo: 'mesa', p_mesa: mesa, p_dados: { itens } }),
  pedido: (tipo, cli, pagar, itens) => rpc('popina_pedir', { p_espaco: R, p_tipo: tipo, p_mesa: null, p_dados: { ...cli, pagar, itens } }),
  chamar: () => rpc('popina_pedir', { p_espaco: R, p_tipo: 'chamado', p_mesa: mesa, p_dados: {} }),
  pedirConta: () => rpc('popina_pedir', { p_espaco: R, p_tipo: 'conta', p_mesa: mesa, p_dados: {} }),
  async conta() {
    const r = await rpc('popina_conta', { p_espaco: R, p_mesa: mesa }); if (r.erro) throw new Error(r.erro);
    const itens = r.itens.map((i) => ({ ...i, valor: i.qtd * (i.preco + (i.adic || []).reduce((s, a) => s + Number(a.preco || 0), 0)) }));
    const sub = itens.reduce((s, i) => s + i.valor, 0), servico = Math.round(sub * r.servico) / 100, total = sub + servico - (r.desconto || 0);
    return { itens, sub, servico, pago: r.pago || 0, falta: Math.max(0, total - (r.pago || 0)), pediuConta: r.pediuConta };
  },
} : {
  mesa: async (itens) => { db.pedidosQR.push({ id: uid('q'), mesa, ts: Date.now(), nome: `Mesa ${mesa} (QR)`, itens }); grava(); return { ok: true }; },
  pedido: async (tipo, cli, pagar, itens) => {
    const c = novoPedido(tipo, cli, { origem: 'Cardápio online', pagarNaEntrega: pagar });
    itens.forEach((i) => adicionarItem(c, { prodId: i.prod, qtd: i.qtd, obs: i.obs, adic: i.adic, meia: i.meia })); return { ok: true, num: c.num };
  },
  chamar: async () => {
    if (!db.chamados.some((x) => x.mesa === mesa && !x.atendido)) { db.chamados.push({ id: uid('c'), mesa, tipo: 'garcom', ts: Date.now(), origem: 'QR' }); grava(); }
    return { ok: true };
  },
  pedirConta: async () => { const c = comandaDaMesa(mesa); if (c) { c.pediuConta = Date.now(); grava(); } return { ok: true }; },
  async conta() {
    const c = comandaDaMesa(mesa); if (!c) return { itens: [] };
    const v = conta(c), its = c.itens.filter((i) => !i.cancelado && i.status !== 'rascunho');
    return { itens: its.map((i) => ({ nome: i.nome, qtd: i.qtd, valor: i.qtd * (i.preco + (i.adic || []).reduce((s, a) => s + a.preco, 0)) })), sub: v.sub, servico: v.servico, pago: v.pago, falta: v.falta, pediuConta: !!c.pediuConta };
  },
};
function confirmado(tit, txt) {
  folha({ titulo: 'Pronto', corpo: `<div class="cli-ok">${ico('check')}<h3>${tit}</h3><p class="mudo">${txt}</p></div>`, pe: '<button type="button" class="bt cheio grande" data-fechar>Voltar ao cardápio</button>' });
}
async function chamar(e) {
  const r = await mandar(e.currentTarget, null, api.chamar); if (r) toast(r.repetido ? 'O garçom já foi chamado, está a caminho' : 'Garçom chamado');
}
async function verConta(e) {
  const v = await mandar(e.currentTarget, null, api.conta); if (!v) return;
  if (!v.itens.length) return toast('Ainda não há nada na conta desta mesa');
  folha({ titulo: `Conta da mesa ${mesa}`, corpo: `<ul class="cli-acompanha">${v.itens.map((i) => `<li><span>${i.qtd}× ${t(i.nome)}</span><span>${din(i.valor)}</span></li>`).join('')}</ul>
    <div class="totais"><div><span>Subtotal</span><span>${din(v.sub)}</span></div>${v.servico ? `<div><span>Serviço (${M.servico}%)</span><span>${din(v.servico)}</span></div>` : ''}${v.pago ? `<div><span>Já pago</span><span>${din(v.pago)}</span></div>` : ''}<div class="total"><span>Total</span><b>${din(v.falta)}</b></div></div>`,
  pe: v.pediuConta ? '<p class="mudo centro" style="flex:1">Conta pedida. O garçom traz a maquininha ou o Pix.</p>' : '<button type="button" class="bt cheio grande" data-pedir>Pedir a conta</button>',
  aoAbrir: (f, fechar) => { $('[data-pedir]', f)?.addEventListener('click', async (ev) => { if (await mandar(ev.currentTarget, null, api.pedirConta)) { fechar(); toast('Conta pedida. O garçom já vem'); } }); } });
}

// foto que não carregou some sem quebrar o layout (a CSP bloqueia onerror no HTML)
addEventListener('error', (e) => { if (e.target.tagName === 'IMG') e.target.style.visibility = 'hidden'; }, true);
document.addEventListener('click', (e) => { const b = e.target.closest('.cli-prod'); if (b) detalhe(P(b.dataset.p)); });
async function iniciar() {
  if (!R) { doExemplo(); ouvir(() => { doExemplo(); topo(); if (!document.querySelector('.folha-fundo')) lista(); }); topo(); lista(); barra(); return; }
  try { await daNuvem(); } catch (e) {
    $('#cli-lista').innerHTML = `<div class="vazio grande">${t(e.message === 'rede' || e.message === 'Failed to fetch' ? 'Sem internet agora. Confira a conexão e recarregue a página.' : e.message)}</div>`; return;
  }
  topo(); lista(); barra();
  // preço ou esgotado mudou no restaurante: atualiza sozinho a cada minuto (sem mexer no que está aberto)
  setInterval(() => { if (document.visibilityState === 'visible' && !document.querySelector('.folha-fundo')) daNuvem().then(() => { topo(); lista(); }).catch(() => {}); }, 60000);
}
iniciar();
