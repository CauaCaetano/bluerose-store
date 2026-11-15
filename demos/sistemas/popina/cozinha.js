// Popina · tela da cozinha e do bar (KDS): cada envio vira um ticket, na ordem de chegada, com o tempo correndo.
// "Começar" e "Pronto" avisam o garçom na hora (a fila dele mostra o prato pronto).
import { db, t, tempo, minutos, comanda, mudarStatus } from './loja.js?v=9';
import { registrar, acao } from './nucleo.js?v=9';
import { ico, toast, bip, folha } from './ui.js?v=9';

let setor = (() => { try { const s = localStorage.getItem('popina-setor'); return s === 'bar' ? 'bar' : 'cozinha'; } catch { return 'cozinha'; } })();
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
// a tela segue o conceito do GPT aprovado pelo dono (relatorios/popina/conceitos-gpt/2-cozinha-tablet.png):
// comanda de papel pendurada no trilho, sem botões; tocar na comanda abre as ações (começar, pronto, item a item, imprimir)
const opcao = (a) => { const n = String(a.nome); return n.includes(': ') ? n.split(': ').slice(1).join(': ') : n; };
function notas(i) {
  const l = (i.adic || []).map((a) => { const grupo = String(a.nome).split(': ')[0]; const forte = /ponto/i.test(grupo);
    return `<em class="kn ${forte ? 'forte' : ''}">${ico('fala')}${t(String(a.nome).includes(': ') ? opcao(a) : '+ ' + a.nome)}</em>`; });
  if (i.obs) { const sem = /^\s*(sem|não|nao|tirar)\b/i.test(i.obs); l.push(`<em class="kn ${sem ? 'forte alerta' : ''}">${ico(sem ? 'alerta' : 'fala')}${t(i.obs)}</em>`); }
  return l.join('');
}
function ticket(k) {
  const m = minutos(k.env), atrasado = k.estado === 'preparo' && m >= 10;
  const prontos = k.itens.filter((i) => i.status === 'pronto' || i.status === 'entregue').length, ico2 = k.c.tipo === 'mesa' ? 'mesa' : k.c.tipo === 'delivery' ? 'moto' : 'sacola';
  const quando = k.estado === 'pronto' ? Math.max(...k.itens.map((i) => i.pronto || k.env)) : k.env;
  const sub = k.c.tipo === 'mesa' ? `${ico('pessoas')}${k.c.pessoas || 2} pessoas` : t(k.c.cliente?.nome || (k.c.tipo === 'delivery' ? 'Entrega' : 'Retirada no balcão'));
  const rel = k.estado === 'pronto' ? `<span class="relogio pronto" data-desde="${quando}">${ico('okcirc')}<small>Pronto há <b>${mmss(Date.now() - quando)}</b></small></span>`
    : `<span class="relogio ${atrasado ? 'atrasado' : ''}" data-desde="${quando}">${atrasado ? ico('relogio') : ''}<b>${mmss(Date.now() - quando)}</b></span>`;
  return `<article class="ticket ${k.estado}" data-acao="ticket-abrir" data-c="${k.c.id}" data-env="${k.env}" tabindex="0" role="button" aria-label="${ONDE(k.c)}: abrir ações">
    <header><i class="tk-ico">${ico(ico2)}</i><div class="tk-tit"><b>${ONDE(k.c)}</b><small>${sub}</small></div>${rel}</header>
    <ul>${k.itens.map((i) => `<li class="${i.status}"><span>${i.qtd}× ${t(i.nome)}</span>${notas(i)}</li>`).join('')}</ul>
    ${k.estado === 'preparo' ? `<div class="tk-prog" title="${prontos} de ${k.itens.length} prontos"><i style="width:${Math.max(12, ((prontos + .6) / k.itens.length) * 100)}%"></i></div>` : ''}</article>`;
}
registrar('cozinha', {
  titulo: 'Cozinha', aba: 'cozinha',
  html() {
    const l = tickets(); const cols = [['novo', 'Novos'], ['preparo', 'Preparando'], ['pronto', 'Prontos']];
    const novos = l.filter((k) => k.estado === 'novo');
    // som quando chega pedido novo (só os que ainda não tinham aparecido neste aparelho)
    const chave = novos.map((k) => `${k.c.id}-${k.env}`); const inedito = chave.some((x) => !vistos.has(x)); vistos = new Set(chave);
    if (inedito && document.body.dataset.tocou) bip(990);
    return `<header class="cab-cozinha"><h1><img src="img/k-louro-esq.webp?v=1" alt="" width="56" height="74">${setor === 'bar' ? 'Bar' : 'Cozinha'}<img src="img/k-louro-dir.webp?v=1" alt="" width="56" height="74"></h1>
      <div class="seg-coz" role="group" aria-label="Setor">${[['cozinha', 'Cozinha', 'chef'], ['bar', 'Bar', 'taca']].map(([v, r, i]) => `<button type="button" data-acao="setor" data-s="${v}" aria-pressed="${setor === v}">${ico(i)}${r}</button>`).join('')}</div>
      <button type="button" class="bt-tela" data-acao="tela-cheia" aria-label="Tela cheia">${ico('telacheia')}</button></header>
      <section class="kds quadro">${cols.map(([e, r]) => `<div class="kds-col ${e}"><h2 class="placa">${r.toUpperCase()} <span>(${l.filter((k) => k.estado === e).length})</span></h2><div class="trilho" aria-hidden="true"></div>${l.filter((k) => k.estado === e).map(ticket).join('') || '<div class="vazio-quadro">Nada aqui.</div>'}</div>`).join('')}</section>`;
  },
  montar() {
    clearInterval(relogio);
    relogio = setInterval(() => {
      const els = document.querySelectorAll('[data-desde]'); if (!els.length) return clearInterval(relogio);
      els.forEach((e) => { const b = e.querySelector('b'); if (b) b.textContent = mmss(Date.now() - Number(e.dataset.desde)); });
    }, 1000);
  },
});
acao('ticket-abrir', (b) => {
  const c = comanda(b.dataset.c), env = Number(b.dataset.env); if (!c) return;
  const itens = c.itens.filter((i) => i.enviado === env && !i.cancelado && (setor === 'tudo' || i.setor === setor));
  const estado = itens.every((i) => i.status === 'pronto') ? 'pronto' : itens.some((i) => i.status === 'preparo') ? 'preparo' : 'novo';
  const d = `data-c="${c.id}" data-env="${env}"`;
  folha({ titulo: ONDE(c), corpo: `<ul class="lista-itens">${itens.map((i) => `<li><b>${i.qtd}×</b><span style="flex:1;margin:0">${t(i.nome)}${notas(i) ? `<small>${notas(i).replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<\/?em[^>]*>/g, ' · ').replace(/^ · | · $/g, '')}</small>` : ''}</span>
      ${i.status === 'pronto' ? `<i class="ok-item">${ico('check')}</i>` : `<button type="button" class="bt" data-acao="item-pronto" data-c="${c.id}" data-i="${i.id}">${ico('check')}Pronto</button>`}</li>`).join('')}</ul>`,
  pe: `<button type="button" class="bt" data-acao="imprimir-ticket" ${d}>${ico('impressora')}Imprimir</button>
    ${estado === 'novo' ? `<button type="button" class="bt" data-acao="tudo-pronto" ${d}>Já está pronto</button><button type="button" class="bt cheio" data-acao="comecar" ${d}>Começar a preparar</button>`
      : estado === 'preparo' ? `<button type="button" class="bt cheio" data-acao="tudo-pronto" ${d}>Tudo pronto</button>` : ''}`,
  aoAbrir: (f, fechar) => f.addEventListener('click', (e) => { if (e.target.closest('[data-acao]')) setTimeout(fechar, 0); }) });
});
document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.ticket[data-acao]')) { e.preventDefault(); e.target.click(); } });
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
