// Popina · tela da cozinha e do bar (KDS): cada envio vira um ticket, na ordem de chegada, com o tempo correndo.
// "Começar" e "Pronto" avisam o garçom na hora (a fila dele mostra o prato pronto).
import { db, t, tempo, minutos, comanda, mudarStatus } from './loja.js?v=3';
import { registrar, acao } from './nucleo.js?v=3';
import { ico, toast, bip } from './ui.js?v=3';
import { rotAdic } from './opcoes.js?v=3';
import { LOURO } from './salao.js?v=3';

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
// relógio que anda de segundo em segundo (mm:ss) em cada comanda da tela
const mmss = (ms) => { const s2 = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s2 / 3600), m = Math.floor((s2 % 3600) / 60), x = s2 % 60; return `${h ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`; };
let relogio = 0;
function ticket(k) {
  const m = minutos(k.env), atraso = k.estado === 'pronto' ? '' : m >= 25 ? 'atrasado' : m >= 15 ? 'atencao' : '';
  const prontos = k.itens.filter((i) => i.status === 'pronto' || i.status === 'entregue').length, ico2 = k.c.tipo === 'mesa' ? 'salao' : k.c.tipo === 'delivery' ? 'moto' : 'sacola';
  const quando = k.estado === 'pronto' ? Math.max(...k.itens.map((i) => i.pronto || k.env)) : k.env;
  return `<article class="ticket ${k.estado} ${atraso}">
    <header><i class="tk-ico">${ico(ico2)}</i><div class="tk-tit"><b>${ONDE(k.c)}</b><small>${k.c.tipo === 'mesa' ? `${k.c.pessoas || 2} pessoas${k.c.garcom ? ` · ${t(k.c.garcom)}` : ''}` : t(k.c.cliente?.nome || '') + (k.c.tipo === 'delivery' ? ' · entrega' : ' · retirada')}</small></div>
      <span class="relogio" data-desde="${quando}" data-pronto="${k.estado === 'pronto' ? 1 : ''}">${k.estado === 'pronto' ? `<small>Pronto há</small> ` : ''}<b>${mmss(Date.now() - quando)}</b></span></header>
    <ul>${k.itens.map((i) => `<li class="${i.status}"><b>${i.qtd}×</b><div>${t(i.nome)}${(i.adic || []).map((a) => `<em class="nota ${String(a.nome).includes(': ') ? 'esc' : 'mais'}">${rotAdic(a)}</em>`).join('')}${i.obs ? `<em class="nota obs">${ico('conta')}${t(i.obs)}</em>` : ''}</div>
      ${k.estado !== 'pronto' && i.status !== 'pronto' ? `<button type="button" class="bt-ico" data-acao="item-pronto" data-c="${k.c.id}" data-i="${i.id}" aria-label="${t(i.nome)} pronto">${ico('check')}</button>` : '<i class="ok-item">' + ico('check') + '</i>'}</li>`).join('')}</ul>
    ${k.estado !== 'pronto' && k.itens.length ? `<div class="tk-prog" title="${prontos} de ${k.itens.length} prontos"><i style="width:${Math.max(6, (prontos / k.itens.length) * 100)}%"></i></div>` : ''}
    <footer>${k.estado === 'novo' ? `<button type="button" class="bt cheio grande" data-acao="comecar" data-c="${k.c.id}" data-env="${k.env}">Começar a preparar</button><button type="button" class="link pular" data-acao="tudo-pronto" data-c="${k.c.id}" data-env="${k.env}">Já está pronto</button>`
      : k.estado === 'preparo' ? `<button type="button" class="bt cheio grande" data-acao="tudo-pronto" data-c="${k.c.id}" data-env="${k.env}">Pronto</button>`
        : `<span class="pronto-txt">${ico('check')}Pronto, aguardando o garçom</span>`}<button type="button" class="bt-ico tk-imp" data-acao="imprimir-ticket" data-c="${k.c.id}" data-env="${k.env}" aria-label="Imprimir esta comanda">${ico('impressora')}</button></footer></article>`;
}
registrar('cozinha', {
  titulo: 'Cozinha', aba: 'cozinha',
  html() {
    const l = tickets(); const cols = [['novo', 'Novos'], ['preparo', 'Preparando'], ['pronto', 'Prontos']];
    const novos = l.filter((k) => k.estado === 'novo');
    // som quando chega pedido novo (só os que ainda não tinham aparecido neste aparelho)
    const chave = novos.map((k) => `${k.c.id}-${k.env}`); const inedito = chave.some((x) => !vistos.has(x)); vistos = new Set(chave);
    if (inedito && document.body.dataset.tocou) bip(990);
    return `<header class="cab-cozinha"><h1>${LOURO}${setor === 'bar' ? 'Bar' : setor === 'tudo' ? 'Cozinha e bar' : 'Cozinha'}${LOURO}</h1>
      <div class="seg" role="group" aria-label="Setor">${[['cozinha', 'Cozinha'], ['bar', 'Bar'], ['tudo', 'Tudo']].map(([v, r]) => `<button type="button" data-acao="setor" data-s="${v}" aria-pressed="${setor === v}">${r}</button>`).join('')}</div>
      <button type="button" class="bt-ico grande" data-acao="tela-cheia" aria-label="Tela cheia">${ico('planta')}</button></header>
      <section class="kds quadro">${cols.map(([e, r]) => `<div class="kds-col ${e}"><h2 class="placa">${LOURO}${r} <span>(${l.filter((k) => k.estado === e).length})</span></h2><div class="trilho"></div>${l.filter((k) => k.estado === e).map(ticket).join('') || '<div class="vazio-quadro">Nada aqui.</div>'}</div>`).join('')}</section>`;
  },
  montar() {
    clearInterval(relogio);
    relogio = setInterval(() => {
      const els = document.querySelectorAll('[data-desde]'); if (!els.length) return clearInterval(relogio);
      els.forEach((e) => { const b = e.querySelector('b'); if (b) b.textContent = mmss(Date.now() - Number(e.dataset.desde)); });
    }, 1000);
  },
});
acao('tela-cheia', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => toast('Este aparelho não deixa tela cheia')); });
// comanda impressa (impressora comum ou térmica pelo navegador): grande, só o que a cozinha precisa
acao('imprimir-ticket', (b) => {
  const c = comanda(b.dataset.c), env = Number(b.dataset.env); if (!c) return;
  const its = c.itens.filter((i) => i.enviado === env && !i.cancelado);
  const w = window.open('', '_blank', 'width=380,height=600'); if (!w) return toast('Libere as janelas para imprimir');
  const e = (x) => String(x ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${e(ONDE(c))}</title><style>@page{size:80mm auto;margin:4mm}body{font:14px/1.35 system-ui,sans-serif;width:72mm;margin:0}h1{font-size:22px;margin:0 0 2px}p{margin:0 0 8px;font-size:12px}li{margin:6px 0;font-size:16px}em{display:block;font-style:normal;font-weight:700;text-transform:uppercase;font-size:13px}ul{list-style:none;padding:0;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:6px 0}</style>
    <h1>${e(ONDE(c))}</h1><p>${new Date(env).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${c.garcom ? ` · ${e(c.garcom)}` : ''}${c.cliente?.nome ? ` · ${e(c.cliente.nome)}` : ''}</p>
    <ul>${its.map((i) => `<li><b>${i.qtd}× ${e(i.nome)}</b>${(i.adic || []).map((a) => `<em>${e(a.nome)}</em>`).join('')}${i.obs ? `<em>${e(i.obs)}</em>` : ''}</li>`).join('')}</ul><script>print();setTimeout(()=>close(),400)<\/script>`);
  w.document.close();
});
const doTicket = (b) => { const c = comanda(b.dataset.c); const env = Number(b.dataset.env); return { c, itens: c ? c.itens.filter((i) => i.enviado === env && !i.cancelado && (setor === 'tudo' || i.setor === setor)) : [] }; };
acao('setor', (b) => { setor = b.dataset.s; try { localStorage.setItem('popina-setor', setor); } catch { /* nada */ } dispatchEvent(new HashChangeEvent('hashchange')); });
acao('comecar', (b) => { const { c, itens } = doTicket(b); itens.forEach((i) => i.status === 'novo' && mudarStatus(c, i, 'preparo')); });
acao('tudo-pronto', (b) => { const { c, itens } = doTicket(b); itens.forEach((i) => i.status !== 'pronto' && mudarStatus(c, i, 'pronto')); toast(`${c.tipo === 'mesa' ? 'Mesa ' + c.mesa : 'Pedido #' + c.num}: pronto. O garçom já foi avisado.`); });
acao('item-pronto', (b) => { const c = comanda(b.dataset.c); const i = c?.itens.find((x) => x.id === b.dataset.i); if (i) mudarStatus(c, i, 'pronto'); });
