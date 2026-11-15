// Popina · tela da cozinha e do bar (KDS): cada envio vira um ticket, na ordem de chegada, com o tempo correndo.
// "Começar" e "Pronto" avisam o garçom na hora (a fila dele mostra o prato pronto).
import { db, t, tempo, minutos, comanda, mudarStatus } from './loja.js?v=1';
import { registrar, acao } from './nucleo.js?v=1';
import { ico, toast, bip } from './ui.js?v=1';

let setor = (() => { try { return localStorage.getItem('popina-setor') || 'cozinha'; } catch { return 'cozinha'; } })();
let vistos = new Set();

// agrupa itens por comanda + horário de envio (um ticket por envio)
function tickets() {
  const l = [];
  db.comandas.forEach((c) => {
    const grupos = {};
    c.itens.filter((i) => !i.cancelado && ['novo', 'preparo', 'pronto'].includes(i.status) && (setor === 'tudo' || i.setor === setor))
      .forEach((i) => { (grupos[i.enviado] ||= []).push(i); });
    Object.entries(grupos).forEach(([env, itens]) => l.push({ c, env: Number(env), itens, estado: itens.every((i) => i.status === 'pronto') ? 'pronto' : itens.some((i) => i.status === 'preparo') ? 'preparo' : 'novo' }));
  });
  return l.sort((a, b) => a.env - b.env);
}
const ONDE = (c) => (c.tipo === 'mesa' ? `Mesa ${c.mesa}` : c.tipo === 'delivery' ? `Delivery #${c.num}` : `Balcão #${c.num}`);
function ticket(k) {
  const m = minutos(k.env), atraso = k.estado === 'pronto' ? '' : m >= 25 ? 'atrasado' : m >= 15 ? 'atencao' : '';
  return `<article class="ticket ${k.estado} ${atraso}">
    <header><b>${ONDE(k.c)}</b>${k.itens.length ? `<small class="prog">${k.itens.filter((i) => i.status === 'pronto' || i.status === 'entregue').length}/${k.itens.length} prontos</small>` : ''}<span class="relogio">${ico('relogio')}${tempo(k.env)}</span></header>
    ${k.c.tipo !== 'mesa' && k.c.cliente?.nome ? `<p class="ticket-cli">${t(k.c.cliente.nome)}${k.c.tipo === 'delivery' ? ' · entrega' : ' · retirada'}</p>` : ''}
    <ul>${k.itens.map((i) => `<li class="${i.status}"><b>${i.qtd}×</b><div>${t(i.nome)}${i.obs ? `<em>${t(i.obs)}</em>` : ''}${(i.adic || []).length ? `<em>+ ${i.adic.map((a) => t(a.nome)).join(', ')}</em>` : ''}</div>
      ${k.estado !== 'pronto' && i.status !== 'pronto' ? `<button type="button" class="bt-ico" data-acao="item-pronto" data-c="${k.c.id}" data-i="${i.id}" aria-label="${t(i.nome)} pronto">${ico('check')}</button>` : ''}</li>`).join('')}</ul>
    <footer>${k.estado === 'novo' ? `<button type="button" class="bt cheio grande" data-acao="comecar" data-c="${k.c.id}" data-env="${k.env}">Começar a preparar</button><button type="button" class="link pular" data-acao="tudo-pronto" data-c="${k.c.id}" data-env="${k.env}">Já está pronto</button>`
      : k.estado === 'preparo' ? `<button type="button" class="bt cheio grande" data-acao="tudo-pronto" data-c="${k.c.id}" data-env="${k.env}">Pronto</button>`
        : `<span class="pronto-txt">${ico('check')}Pronto, aguardando o garçom</span>`}</footer></article>`;
}
registrar('cozinha', {
  titulo: 'Cozinha', aba: 'cozinha',
  html() {
    const l = tickets(); const cols = [['novo', 'Novos'], ['preparo', 'Preparando'], ['pronto', 'Prontos']];
    const novos = l.filter((k) => k.estado === 'novo');
    // som quando chega pedido novo (só os que ainda não tinham aparecido neste aparelho)
    const chave = novos.map((k) => `${k.c.id}-${k.env}`); const inedito = chave.some((x) => !vistos.has(x)); vistos = new Set(chave);
    if (inedito && document.body.dataset.tocou) bip(990);
    return `<header class="cab-tela"><div><h1>${setor === 'bar' ? 'Bar' : setor === 'tudo' ? 'Cozinha e bar' : 'Cozinha'}</h1><p>${novos.length} novos · ${l.filter((k) => k.estado === 'preparo').length} preparando</p></div>
      <div class="seg" role="group" aria-label="Setor">${[['cozinha', 'Cozinha'], ['bar', 'Bar'], ['tudo', 'Tudo']].map(([v, r]) => `<button type="button" data-acao="setor" data-s="${v}" aria-pressed="${setor === v}">${r}</button>`).join('')}</div></header>
      <section class="kds">${cols.map(([e, r]) => `<div class="kds-col"><h2>${r} <span>${l.filter((k) => k.estado === e).length}</span></h2>${l.filter((k) => k.estado === e).map(ticket).join('') || '<div class="vazio">Nada aqui.</div>'}</div>`).join('')}</section>`;
  },
});
const doTicket = (b) => { const c = comanda(b.dataset.c); const env = Number(b.dataset.env); return { c, itens: c ? c.itens.filter((i) => i.enviado === env && !i.cancelado && (setor === 'tudo' || i.setor === setor)) : [] }; };
acao('setor', (b) => { setor = b.dataset.s; try { localStorage.setItem('popina-setor', setor); } catch { /* nada */ } dispatchEvent(new HashChangeEvent('hashchange')); });
acao('comecar', (b) => { const { c, itens } = doTicket(b); itens.forEach((i) => i.status === 'novo' && mudarStatus(c, i, 'preparo')); });
acao('tudo-pronto', (b) => { const { c, itens } = doTicket(b); itens.forEach((i) => i.status !== 'pronto' && mudarStatus(c, i, 'pronto')); toast(`${c.tipo === 'mesa' ? 'Mesa ' + c.mesa : 'Pedido #' + c.num}: pronto. O garçom já foi avisado.`); });
acao('item-pronto', (b) => { const c = comanda(b.dataset.c); const i = c?.itens.find((x) => x.id === b.dataset.i); if (i) mudarStatus(c, i, 'pronto'); });
