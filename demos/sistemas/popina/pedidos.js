// Popina · balcão e delivery: pedidos por etapa, pedido novo (telefone, balcão ou cardápio online), taxa por bairro e WhatsApp pronto.
import { db, t, din, dinCurto, tempo, comanda, conta, novoPedido, enviar, grava, itensValidos, linkCardapio, clientePorTel, lojaCfg } from './loja.js?v=18';
import { registrar, acao, ir } from './nucleo.js?v=18';
import { ico, folha, toast, $, $$ } from './ui.js?v=18';
import { linhaItem, abrirSeletor } from './salao.js?v=18';

const ETAPAS = [['novo', 'Recebidos'], ['preparo', 'Preparando'], ['saiu', 'Saiu para entrega'], ['pronto_retirar', 'Pronto para retirar']];
function etapa(c) {
  if (c.tipo === 'delivery' && c.entrega === 'saiu') return 'saiu';
  const it = itensValidos(c).filter((i) => i.status !== 'rascunho');
  if (!it.length || it.every((i) => i.status === 'novo')) return 'novo';
  if (it.every((i) => ['pronto', 'entregue'].includes(i.status))) return c.tipo === 'delivery' ? 'preparo_ok' : 'pronto_retirar';
  return 'preparo';
}
const zap = (tel, msg) => `https://wa.me/55${String(tel || '').replace(/\D/g, '').replace(/^55/, '')}?text=${encodeURIComponent(msg)}`;
function msgDe(c, tipo) {
  const v = conta(c), nome = (c.cliente?.nome || '').split(' ')[0];
  if (tipo === 'confirmado') return `Olá, ${nome}! Seu pedido #${c.num} na ${db.config.nome} foi confirmado e já está sendo preparado. Total ${dinCurto(v.total)}. Obrigado!`;
  if (tipo === 'saiu') return `${nome}, seu pedido #${c.num} saiu para entrega e chega em instantes! ${c.pagarNaEntrega ? `Pagamento na entrega: ${c.pagarNaEntrega}, ${dinCurto(v.falta)}.` : ''}`;
  return `${nome}, seu pedido #${c.num} está pronto para retirar na ${db.config.nome}. Total ${dinCurto(v.total)}.`;
}
// comanda de papel pendurada no trilho (conceito do GPT: relatorios/popina/conceitos-gpt/4-pedidos-pc.png)
function cartao(c) {
  const v = conta(c), e = etapa(c);
  const ok = (r) => `${ico('check')}${r}`;
  const bt = c.tipo === 'delivery'
    ? (e === 'saiu' ? `<button type="button" class="bt cheio" data-acao="entregue" data-c="${c.id}">${ok('Entregue')}</button>` : e === 'preparo_ok' ? `<button type="button" class="bt claro" data-acao="saiu" data-c="${c.id}">${ok('Saiu')}</button>` : '')
    : (e === 'pronto_retirar' ? `<a class="bt oliva" href="#caixa/${c.id}">${ok('Retirado')}</a>` : '');
  const pg = v.falta <= 0 ? ['pago', 'Pago'] : c.pagarNaEntrega ? ['entrega', `Paga na entrega: ${t(c.pagarNaEntrega)}`] : ['apagar', 'A pagar'];
  const onde = c.tipo === 'delivery' ? `${ico('pino')}${t([c.cliente?.end, c.cliente?.bairro].filter(Boolean).join(' · '))}` : `${ico('loja')}Retirada no balcão`;
  return `<article class="ticket pd ${e === 'preparo_ok' ? 'preparo' : e === 'pronto_retirar' ? 'pronto' : e}"><header><i class="tk-ico">${ico(c.tipo === 'delivery' ? 'moto' : 'sacola')}</i><div class="tk-tit"><b>#${c.num} · ${t(c.cliente?.nome || 'Cliente')}</b><small>${onde}</small></div><span class="relogio"><b>${tempo(c.aberta)}</b></span></header>
    <p class="pd-itens">${itensValidos(c).map((i) => `${i.qtd}× ${t(i.nome)}`).join(', ') || '<em>sem itens</em>'}</p>
    <p class="pg ${pg[0]}">${pg[1]}</p>
    <footer><b>${dinCurto(v.total)}</b><span></span>${bt || `<a class="bt-ico" href="#pedidos/ver/${c.id}" aria-label="Abrir pedido">${ico('dir')}</a>`}</footer></article>`;
}
registrar('pedidos', {
  titulo: 'Pedidos', aba: 'pedidos',
  html(modo, x) {
    if (modo === 'novo') return formNovo(x || 'delivery');
    if (modo === 'ver') { const c = comanda(x); return c ? verPedido(c) : '<div class="vazio">Pedido não encontrado (talvez já tenha sido fechado).</div>'; }
    const ps = db.comandas.filter((c) => c.tipo !== 'mesa');
    const grupos = { novo: [], preparo: [], saiu: [], pronto_retirar: [] };
    ps.forEach((c) => { const e = etapa(c); (grupos[e === 'preparo_ok' ? 'preparo' : e] ||= []).push(c); });
    const COL = { novo: 'novo', preparo: 'preparo', saiu: 'saiu', pronto_retirar: 'pronto' };
    return `<header class="cab-pedidos"><h1><img src="img/k-louro-esq.webp?v=1" alt="" width="56" height="74">Pedidos<img src="img/k-louro-dir.webp?v=1" alt="" width="56" height="74"></h1><img class="aqueduto-img" src="img/aqueduto.webp?v=2" alt="" width="340" height="88">
      <div class="linha-bts"><a class="bt claro" href="#pedidos/novo/balcao">${ico('mais2')}Balcão</a><a class="bt cheio" href="#pedidos/novo/delivery">${ico('moto')}Delivery</a></div></header>
      <div class="link-cardapio">${ico('qr')}<div><b>Cardápio online para delivery</b><span>Os clientes pedem pelo link e o pedido cai aqui sozinho.</span></div><button type="button" class="bt oliva" data-acao="copiar-link">${ico('link')}Copiar link</button></div>
      <section class="kds quadro pd-quadro">${ETAPAS.map(([e, r]) => `<div class="kds-col ${COL[e]}"><h2 class="placa">${r.toUpperCase()} <span>(${grupos[e]?.length || 0})</span></h2><div class="trilho" aria-hidden="true"></div>${(grupos[e] || []).map(cartao).join('') || '<div class="vazio-quadro">Nada aqui.</div>'}</div>`).join('')}</section>`;
  },
  montar(el, modo) {
    if (modo !== 'novo') return;
    const f = $('form', el); const tipo = f.dataset.tipo;
    const taxa = () => { const b = db.bairros.find((x) => x.nome === f.bairro?.value); $('[data-taxa]', el) && ($('[data-taxa]', el).textContent = b ? `Taxa de entrega: ${din(b.taxa)}` : ''); };
    f.bairro?.addEventListener('change', taxa); taxa();
    f.tel.addEventListener('input', () => {
      const x = clientePorTel(f.tel.value), info = $('[data-cli]', el);
      if (!x) { info.textContent = ''; return; }
      info.textContent = `${x.nome} · ${x.pedidos} pedidos, ${din(x.total)} no total${x.obs ? ` · ${x.obs}` : ''}`;
      if (!f.nome.value) f.nome.value = x.nome || '';
      if (f.end && !f.end.value && x.end) f.end.value = x.end;
      if (f.bairro && !f.bairro.value && x.bairro) { f.bairro.value = x.bairro; taxa(); }
    });
    f.onsubmit = (e) => {
      e.preventDefault();
      if (!f.nome.value.trim()) return toast('Escreva o nome do cliente');
      if (tipo === 'delivery' && (!f.end.value.trim() || !f.bairro.value)) return toast('Endereço e bairro são obrigatórios na entrega');
      const c = novoPedido(tipo, { nome: f.nome.value.trim(), tel: f.tel?.value || '', end: f.end?.value || '', bairro: f.bairro?.value || '' }, { origem: f.origem.value, pagarNaEntrega: f.pagar?.value || '' });
      ir(`pedidos/ver/${c.id}`); setTimeout(() => abrirSeletor(c), 80);
    };
  },
});
function formNovo(tipo) {
  return `<header class="cab-tela"><a class="bt-ico" href="#pedidos" aria-label="Voltar">${ico('voltar')}</a><div><h1>${tipo === 'delivery' ? 'Novo delivery' : 'Novo pedido de balcão'}</h1><p>Depois do cliente, você escolhe os itens</p></div></header>
    <form class="form" data-tipo="${tipo}" novalidate>
      <label class="campo"><span>WhatsApp do cliente</span><input name="tel" inputmode="tel" placeholder="(16) 99999-0000" autocomplete="off"><small data-cli class="mudo"></small></label>
      <label class="campo"><span>Nome do cliente</span><input name="nome" autocomplete="off" required></label>
      ${tipo === 'delivery' ? `
      <label class="campo"><span>Endereço (rua, número, complemento)</span><input name="end" required></label>
      <label class="campo"><span>Bairro</span><select name="bairro" required><option value="">Escolha</option>${db.bairros.map((b) => `<option>${t(b.nome)}</option>`).join('')}</select><small data-taxa class="mudo"></small></label>
      <label class="campo"><span>Paga na entrega com</span><select name="pagar"><option value="">Já pagou / pagar no balcão</option><option>Pix</option><option>Dinheiro</option><option>Cartão (maquininha)</option></select></label>` : ''}
      <label class="campo"><span>Pedido feito por</span><select name="origem"><option>${tipo === 'delivery' ? 'telefone' : 'balcão'}</option><option>WhatsApp</option><option>Instagram</option></select></label>
      <button class="bt cheio grande">Escolher os itens</button></form>`;
}
function verPedido(c) {
  const v = conta(c), rasc = c.itens.filter((i) => i.status === 'rascunho');
  return `<header class="cab-tela"><a class="bt-ico" href="#pedidos" aria-label="Voltar">${ico('voltar')}</a><div><h1>#${c.num} · ${t(c.cliente?.nome || '')}</h1><p>${c.tipo === 'delivery' ? `${t(c.cliente?.end || '')} · ${t(c.cliente?.bairro || '')}` : 'Retirada no balcão'}</p></div></header>
    <ul class="itens">${c.itens.map((i) => linhaItem(c, i)).join('')}</ul>
    <section class="totais"><div><span>Itens</span><b>${din(v.sub)}</b></div>${v.entrega ? `<div><span>Entrega</span><b>${din(v.entrega)}</b></div>` : ''}<div class="total"><span>Total</span><b>${din(v.total)}</b></div></section>
    <div class="barra-acoes"><button type="button" class="bt" data-acao="cardapio-pick" data-c="${c.id}">${ico('mais2')}Itens</button>
      ${rasc.length ? `<button type="button" class="bt cheio grande" data-acao="enviar-pedido" data-c="${c.id}">Enviar para a cozinha</button>` : `<a class="bt cheio grande" href="#caixa/${c.id}">Cobrar · ${dinCurto(v.falta)}</a>`}</div>
    <div class="linha-bts" style="margin-top:12px"><button type="button" class="bt" data-acao="via-entrega" data-c="${c.id}">${ico('impressora')}Imprimir a via${c.tipo === 'delivery' ? ' de entrega' : ''}</button></div>
    ${c.cliente?.tel ? `<div class="linha-bts" style="margin-top:12px"><a class="bt zap" href="${zap(c.cliente.tel, msgDe(c, 'confirmado'))}" target="_blank" rel="noopener">${ico('zap')}Confirmar no WhatsApp</a></div>` : ''}`;
}
acao('enviar-pedido', (b) => { const c = comanda(b.dataset.c); enviar(c); toast('Enviado para a cozinha'); ir('pedidos'); });
acao('saiu', (b) => {
  const c = comanda(b.dataset.c); if (etapa(c) !== 'preparo_ok') return toast('A cozinha ainda não marcou o pedido como pronto');
  const ents = db.entregadores || [];
  const sair = (eid) => { c.entrega = 'saiu'; c.saiu = Date.now(); c.entregador = eid || ''; c.itens.forEach((i) => { if (i.status === 'pronto') i.status = 'entregue'; }); grava(); };
  if (ents.length && !b.dataset.e) {
    folha({ titulo: `#${c.num}: quem vai levar?`, corpo: `<div class="papeis">${ents.map((e) => `<button type="button" class="papel" data-e="${e.id}"><b>${t(e.nome)}</b><small>${t(e.tel || '')}</small></button>`).join('')}<button type="button" class="papel" data-e="-"><b>Outro / sem anotar</b></button></div>`,
      aoAbrir: (f, fechar) => { f.querySelectorAll('[data-e]').forEach((x) => { x.onclick = () => { fechar(); b.dataset.e = x.dataset.e; sair(x.dataset.e === '-' ? '' : x.dataset.e); aviso(); }; }); } });
    return;
  }
  sair('');
  aviso();
  function aviso() {
  if (c.cliente?.tel) folha({ titulo: `#${c.num} saiu para entrega`, corpo: '<p>Avise o cliente pelo WhatsApp:</p>', pe: `<a class="bt zap grande" href="${zap(c.cliente.tel, msgDe(c, 'saiu'))}" target="_blank" rel="noopener" data-fechar>${ico('zap')}Avisar ${t(c.cliente.nome.split(' ')[0])}</a>` });
  }
});
acao('entregue', (b) => { const c = comanda(b.dataset.c); ir(`caixa/${c.id}`); toast('Confirme o pagamento para fechar o pedido'); });

// via para o entregador (ou para o balcão): endereço, itens, total e como paga
acao('via-entrega', (b) => {
  const c = comanda(b.dataset.c); if (!c) return; const v = conta(c), L = lojaCfg();
  const w = window.open('', '_blank', 'width=380,height=640'); if (!w) return toast('Libere as janelas para imprimir');
  const e = (x) => String(x ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Pedido #${c.num}</title><style>@page{size:80mm auto;margin:4mm}body{font:13px/1.4 system-ui,sans-serif;width:72mm;margin:0}h1{font-size:20px;margin:0}h2{font-size:14px;margin:8px 0 2px}.l{display:flex;justify-content:space-between;gap:6px}hr{border:0;border-top:1px dashed #000;margin:6px 0}small{display:block;color:#333}</style>
    <h1>${e(db.config.nome)}</h1><small>${e(L.endereco || '')}</small><hr><h1>Pedido #${c.num}</h1><small>${new Date(c.aberta).toLocaleString('pt-BR')}</small>
    <h2>${e(c.cliente?.nome || '')}${c.cliente?.tel ? ` · ${e(c.cliente.tel)}` : ''}</h2>${c.tipo === 'delivery' ? `<div>${e(c.cliente?.end || '')}<br>${e(c.cliente?.bairro || '')}</div>` : '<div>Retirada no balcão</div>'}<hr>
    ${itensValidos(c).map((i) => `<div class="l"><span>${i.qtd}× ${e(i.nome)}</span><span>${din(i.qtd * i.preco + (i.adic || []).reduce((s2, a) => s2 + a.preco, 0) * i.qtd)}</span></div>${(i.adic || []).map((a) => `<small>  ${e(a.nome)}</small>`).join('')}${i.obs ? `<small>  ${e(i.obs)}</small>` : ''}`).join('')}<hr>
    ${v.entrega ? `<div class="l"><span>Entrega</span><span>${din(v.entrega)}</span></div>` : ''}${v.desconto ? `<div class="l"><span>Desconto${c.cupom ? ` (${e(c.cupom)})` : ''}</span><span>− ${din(v.desconto)}</span></div>` : ''}<div class="l"><b>Total</b><b>${din(v.total)}</b></div>
    <div class="l"><span>${v.falta <= 0 ? 'Pago' : `A receber${c.pagarNaEntrega ? ': ' + e(c.pagarNaEntrega) : ''}`}</span><span>${v.falta > 0 ? din(v.falta) : ''}</span></div><script>print();setTimeout(()=>close(),400)<\/script>`);
  w.document.close();
});

acao('copiar-link', async () => { const u = new URL(linkCardapio('delivery=1'), location.href).href; try { await navigator.clipboard.writeText(u); toast('Link do cardápio copiado'); } catch { window.open(u, '_blank', 'noopener'); } });
