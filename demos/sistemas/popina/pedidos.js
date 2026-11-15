// Popina · balcão e delivery: pedidos por etapa, pedido novo (telefone, balcão ou cardápio online), taxa por bairro e WhatsApp pronto.
import { db, t, din, dinCurto, tempo, comanda, conta, novoPedido, enviar, grava, itensValidos, linkCardapio } from './loja.js?v=1';
import { registrar, acao, ir } from './nucleo.js?v=1';
import { ico, folha, toast, $, $$ } from './ui.js?v=1';
import { linhaItem, abrirSeletor } from './salao.js?v=1';

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
function cartao(c) {
  const v = conta(c), e = etapa(c);
  const bt = c.tipo === 'delivery'
    ? (e === 'saiu' ? `<button type="button" class="bt cheio" data-acao="entregue" data-c="${c.id}">Entregue</button>` : `<button type="button" class="bt ${e === 'preparo_ok' ? 'cheio' : ''}" data-acao="saiu" data-c="${c.id}" ${e === 'preparo_ok' ? '' : 'title="Libera quando a cozinha marcar pronto"'}>${ico('moto')}Saiu</button>`)
    : (e === 'pronto_retirar' ? `<a class="bt cheio" href="#caixa/${c.id}">Cobrar e entregar</a>` : '');
  return `<article class="pedido"><header><b>#${c.num} · ${t(c.cliente?.nome || 'Cliente')}</b><span>${tempo(c.aberta)}</span></header>
    <p class="mudo">${c.tipo === 'delivery' ? `${ico('moto')}${t(c.cliente?.end || '')} · ${t(c.cliente?.bairro || '')}` : `${ico('sacola')}Retirada no balcão`} · ${t(c.origem || '')}</p>
    <p>${itensValidos(c).map((i) => `${i.qtd}× ${t(i.nome)}`).join(', ') || '<em>sem itens</em>'}</p>
    <p class="pg ${v.falta <= 0 ? 'pago' : ''}">${v.falta <= 0 ? 'Pago' : c.pagarNaEntrega ? `Paga na entrega: ${t(c.pagarNaEntrega)}` : 'A pagar'}</p>
    <footer><b>${dinCurto(v.total)}</b><span></span>
      <a class="bt-ico" href="#pedidos/ver/${c.id}" aria-label="Abrir pedido">${ico('dir')}</a>${bt}</footer></article>`;
}
registrar('pedidos', {
  titulo: 'Pedidos', aba: 'pedidos',
  html(modo, x) {
    if (modo === 'novo') return formNovo(x || 'delivery');
    if (modo === 'ver') { const c = comanda(x); return c ? verPedido(c) : '<div class="vazio">Pedido não encontrado (talvez já tenha sido fechado).</div>'; }
    const ps = db.comandas.filter((c) => c.tipo !== 'mesa');
    const grupos = { novo: [], preparo: [], saiu: [], pronto_retirar: [] };
    ps.forEach((c) => { const e = etapa(c); (grupos[e === 'preparo_ok' ? 'preparo' : e] ||= []).push(c); });
    return `<header class="cab-tela"><div><h1>Balcão e delivery</h1><p>${ps.length} pedidos em andamento</p></div>
      <div class="linha-bts"><a class="bt" href="#pedidos/novo/balcao">${ico('sacola')}Balcão</a><a class="bt cheio" href="#pedidos/novo/delivery">${ico('moto')}Delivery</a></div></header>
      <div class="link-cardapio">${ico('qr')}<div><b>Cardápio online para delivery</b><span>Os clientes pedem pelo link e o pedido cai aqui sozinho.</span></div><a class="bt" href="${linkCardapio('delivery=1')}" target="_blank" rel="noopener">Abrir</a></div>
      <section class="colunas">${ETAPAS.map(([e, r]) => `<div class="coluna"><h2>${r} <span>${grupos[e]?.length || 0}</span></h2>${(grupos[e] || []).map(cartao).join('') || '<div class="vazio">Nada aqui.</div>'}</div>`).join('')}</section>`;
  },
  montar(el, modo) {
    if (modo !== 'novo') return;
    const f = $('form', el); const tipo = f.dataset.tipo;
    const taxa = () => { const b = db.bairros.find((x) => x.nome === f.bairro?.value); $('[data-taxa]', el) && ($('[data-taxa]', el).textContent = b ? `Taxa de entrega: ${din(b.taxa)}` : ''); };
    f.bairro?.addEventListener('change', taxa); taxa();
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
      <label class="campo"><span>Nome do cliente</span><input name="nome" autocomplete="off" required></label>
      ${tipo === 'delivery' ? `<label class="campo"><span>WhatsApp</span><input name="tel" inputmode="tel" placeholder="(16) 99999-0000"></label>
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
    ${c.cliente?.tel ? `<div class="linha-bts" style="margin-top:12px"><a class="bt zap" href="${zap(c.cliente.tel, msgDe(c, 'confirmado'))}" target="_blank" rel="noopener">${ico('zap')}Confirmar no WhatsApp</a></div>` : ''}`;
}
acao('enviar-pedido', (b) => { const c = comanda(b.dataset.c); enviar(c); toast('Enviado para a cozinha'); ir('pedidos'); });
acao('saiu', (b) => {
  const c = comanda(b.dataset.c); if (etapa(c) !== 'preparo_ok') return toast('A cozinha ainda não marcou o pedido como pronto');
  c.entrega = 'saiu'; c.saiu = Date.now(); c.itens.forEach((i) => { if (i.status === 'pronto') i.status = 'entregue'; }); grava();
  if (c.cliente?.tel) folha({ titulo: `#${c.num} saiu para entrega`, corpo: '<p>Avise o cliente pelo WhatsApp:</p>', pe: `<a class="bt zap grande" href="${zap(c.cliente.tel, msgDe(c, 'saiu'))}" target="_blank" rel="noopener" data-fechar>${ico('zap')}Avisar ${t(c.cliente.nome.split(' ')[0])}</a>` });
});
acao('entregue', (b) => { const c = comanda(b.dataset.c); ir(`caixa/${c.id}`); toast('Confirme o pagamento para fechar o pedido'); });
