// Popina · tela da cozinha e do bar (KDS): cada envio vira um ticket, na ordem de chegada, com o tempo correndo.
// "Começar" e "Pronto" avisam o garçom na hora (a fila dele mostra o prato pronto).
import { db, t, tempo, minutos, comanda, mudarStatus, ondeComanda, tem, prod, lojaCfg } from './loja.js?v=28';
import { ETAPAS, ALERGENOS, ESTACOES_PADRAO, estacaoDe, filaForno } from './precos.js?v=28';
import { registrar, acao } from './nucleo.js?v=28';
import { ico, toast, bip, folha } from './ui.js?v=28';

const guarda = (k, v) => { try { if (v === undefined) return localStorage.getItem(k) || ''; localStorage.setItem(k, v); } catch { /* sem acesso */ } return ''; };
let setor = (() => { const s = guarda('popina-setor'); return ['bar', 'forno'].includes(s) ? s : 'cozinha'; })();
let estacao = guarda('popina-estacao');
let vistos = new Set();
// o setor que vale agora (a aba Forno só existe com a função ligada) e as estações da cozinha
const setorAgora = () => (setor === 'forno' && !tem('forno') ? 'cozinha' : setor);
const estacoes = () => { const L = lojaCfg(); return L.estacoes?.length ? L.estacoes : ESTACOES_PADRAO; };
const estDe = (i) => estacaoDe(prod(i.prod), lojaCfg().estacaoCat);
const nomeEst = (id) => estacoes().find((x) => x.id === id)?.nome || 'Cozinha geral';
const porEstacao = () => tem('estacoes') && setorAgora() === 'cozinha';
const estacaoAgora = () => (porEstacao() && estacoes().some((x) => x.id === estacao) ? estacao : '');
const ativo = (i) => !i.cancelado && ['novo', 'preparo', 'pronto'].includes(i.status);
const doSetor = (i) => i.setor === (setorAgora() === 'bar' ? 'bar' : 'cozinha');
const daEstacao = (i) => !estacaoAgora() || estDe(i) === estacaoAgora();

// agrupa itens por comanda + horário de envio (um ticket por envio)
// por estação: cada estação vê só os seus pratos, e a comanda só vai para "Prontos" quando todas as estações terminaram
function tickets() {
  const l = [];
  db.comandas.forEach((c) => {
    const grupos = {};
    c.itens.filter((i) => ativo(i) && doSetor(i) && daEstacao(i)).forEach((i) => { (grupos[i.enviado] ||= []).push(i); });
    Object.entries(grupos).forEach(([env, itens]) => {
      const meu = itens.every((i) => i.status === 'pronto') ? 'pronto' : itens.some((i) => i.status === 'preparo') ? 'preparo' : 'novo';
      const faltam = tem('estacoes') ? c.itens.filter((i) => !i.cancelado && i.enviado === Number(env) && doSetor(i) && !itens.includes(i) && !['pronto', 'entregue'].includes(i.status)) : [];
      const espera = [...new Set(faltam.map((i) => nomeEst(estDe(i))))];
      l.push({ c, env: Number(env), itens, espera, estado: meu === 'pronto' && espera.length ? 'preparo' : meu });
    });
  });
  return l.sort((a, b) => a.env - b.env);
}
// fila do forno: pizzas (ou pratos da estação Forno) na ordem de entrada, com a previsão de saída
const itensForno = () => db.comandas.flatMap((c) => c.itens.filter((i) => !i.cancelado && ['novo', 'preparo'].includes(i.status) && i.setor !== 'bar' && (prod(i.prod)?.pizza || estDe(i) === 'forno')).map((i) => ({ ...i, c, ref: i })));
const hm = (ts) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
function htmlForno() {
  const f = filaForno(itensForno(), lojaCfg().forno), dentro = f.filter((x) => x.noForno).sort((a, b) => a.sai - b.sai), fila = f.filter((x) => !x.noForno), F = lojaCfg().forno || {};
  const cartao = (x) => `<article class="forno-item ${x.noForno ? (x.passou ? 'tirar' : 'assando') : 'espera'}">
    <div class="fi-tit"><b>${x.i.qtd}× ${t(x.i.nome)}</b><small>${ONDE(x.i.c)} · ${x.min} min de forno</small></div>
    ${x.noForno ? `<div class="fi-tempo" data-ate="${x.sai}"><b>${x.passou ? 'Tirar do forno!' : mmss(x.sai - Date.now())}</b><small>${x.passou ? `passou ${mmss(Date.now() - x.sai)}` : `sai às ${hm(x.sai)}`}</small></div>
      <span class="barra"><i style="width:${Math.min(100, Math.round(((Date.now() - x.entra) / (x.sai - x.entra)) * 100))}%"></i></span>
      <button type="button" class="bt ${x.passou ? 'cheio' : ''}" data-acao="forno-tirou" data-c="${x.i.c.id}" data-i="${x.i.id}">${ico('check')}Tirei do forno</button>`
    : `<div class="fi-tempo"><b>${x.entra <= Date.now() + 30e3 ? 'Pode entrar' : `entra ${hm(x.entra)}`}</b><small>previsão de saída ${hm(x.sai)}</small></div>
      <button type="button" class="bt cheio" data-acao="forno-entrou" data-c="${x.i.c.id}" data-i="${x.i.id}">Pôr no forno</button>`}</article>`;
  return `<section class="forno"><p class="mudo">${dentro.length} de ${F.capacidade || 6} lugares do forno ocupados · ordem de entrada · tempo por tamanho (Regras das funções)</p>
    <div class="forno-cols"><div><h2 class="placa">NO FORNO <span>(${dentro.length})</span></h2>${dentro.map(cartao).join('') || '<div class="vazio-quadro">Forno vazio.</div>'}</div>
    <div><h2 class="placa">NA FILA <span>(${fila.length})</span></h2>${fila.map(cartao).join('') || '<div class="vazio-quadro">Nenhuma pizza esperando.</div>'}</div></div></section>`;
}
const ONDE = (c) => ondeComanda(c);
const NOME_ETAPA = Object.fromEntries(ETAPAS);
// alergênicos do prato (função ligada): a cozinha vê destacado o que o prato contém
const alergenos = (i) => (tem('alergenicos') ? (prod(i.prod)?.alergenos || []).map((a) => ALERGENOS.find((x) => x[0] === a)).filter((x) => x && x[2] === 'contem').map((x) => x[1]) : []);
// relógio que anda de segundo em segundo (mm:ss) em cada comanda da tela
const mmss = (ms) => { const s2 = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s2 / 3600), m = Math.floor((s2 % 3600) / 60), x = s2 % 60; return `${h ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`; };
let relogio = 0;
// a tela segue o conceito do GPT aprovado pelo dono (relatorios/popina/conceitos-gpt/2-cozinha-tablet.png):
// comanda de papel pendurada no trilho, sem botões; tocar na comanda abre as ações (começar, pronto, item a item, imprimir)
const opcao = (a) => { const n = String(a.nome); return n.includes(': ') ? n.split(': ').slice(1).join(': ') : n; };
function notas(i) {
  // etapa do prato (sequência), componentes do combo, ponto e pimenta destacados, alergênicos e observação
  const l = i.etapa ? [`<em class="kn etapa">${ico('chef')}${t(NOME_ETAPA[i.etapa] || i.etapa)}</em>`] : [];
  if (porEstacao() && !estacaoAgora() && i.setor !== 'bar') l.push(`<em class="kn est">${ico('chef')}${t(nomeEst(estDe(i)))}</em>`);
  if (i.fator && i.fator !== 1 && !prod(i.prod)?.pizza && i.setor !== 'bar') l.push(`<em class="kn">${ico('cloche')}Porção ${String(i.fator).replace('.', ',')}× da ficha</em>`);
  (i.combo || []).forEach((x) => l.push(`<em class="kn">${ico('cloche')}${t(x.grupo)}: ${t(x.nome)}</em>`));
  (i.adic || []).forEach((a) => { const grupo = String(a.nome).split(': ')[0]; const forte = /ponto|pimenta/i.test(grupo);
    l.push(`<em class="kn ${forte ? 'forte' : ''}">${ico('fala')}${t(String(a.nome).includes(': ') ? (forte ? String(a.nome) : opcao(a)) : '+ ' + a.nome)}</em>`); });
  const alg = alergenos(i); if (alg.length) l.push(`<em class="kn forte alerta">${ico('alerta')}Contém ${t(alg.join(', ').toLowerCase())}</em>`);
  if (i.obs) { const sem = /^\s*(sem|não|nao|tirar)\b|alerg/i.test(i.obs); l.push(`<em class="kn ${sem ? 'forte alerta' : ''}">${ico(sem ? 'alerta' : 'fala')}${t(i.obs)}</em>`); }
  return l.join('');
}
// mesa que veio de reserva: restrições (alergias) e ocasião aparecem no topo da comanda
const reservaTk = (c) => (c.reserva?.restricoes || c.reserva?.ocasiao ? `<p class="tk-reserva">${c.reserva.restricoes ? `<em class="kn forte alerta">${ico('alerta')}Restrições: ${t(c.reserva.restricoes)}</em>` : ''}${c.reserva.ocasiao ? `<em class="kn">${ico('coroa')}${t(c.reserva.ocasiao)}</em>` : ''}</p>` : '');
function ticket(k) {
  const m = minutos(k.env), atrasado = k.estado !== 'pronto' && m >= (Number(lojaCfg().alertas?.kds) || 10); // atraso configurável em Gestão › Caixa e regras
  const prontos = k.itens.filter((i) => i.status === 'pronto' || i.status === 'entregue').length, ico2 = k.c.tipo === 'mesa' ? 'mesa' : k.c.tipo === 'delivery' ? 'moto' : k.c.tipo === 'cartao' ? 'cartao' : k.c.tipo === 'evento' ? 'coroa' : 'sacola';
  const quando = k.estado === 'pronto' ? Math.max(...k.itens.map((i) => i.pronto || k.env)) : k.env;
  const sub = k.c.tipo === 'mesa' ? `${ico('pessoas')}${k.c.pessoas || 2} pessoas${k.c.rodizio ? ' · rodízio' : ''}` : k.c.tipo === 'cartao' ? t(k.c.nome || 'Comanda individual') : k.c.tipo === 'evento' ? 'Evento' : t(k.c.cliente?.nome || (k.c.tipo === 'delivery' ? 'Entrega' : 'Retirada no balcão'));
  const rel = k.estado === 'pronto' ? `<span class="relogio pronto" data-desde="${quando}">${ico('okcirc')}<small>Pronto há <b>${mmss(Date.now() - quando)}</b></small></span>`
    : `<span class="relogio ${atrasado ? 'atrasado' : ''}" data-desde="${quando}">${atrasado ? ico('relogio') : ''}<b>${mmss(Date.now() - quando)}</b></span>`;
  return `<article class="ticket ${k.estado}" data-acao="ticket-abrir" data-c="${k.c.id}" data-env="${k.env}" tabindex="0" role="button" aria-label="${ONDE(k.c)}: abrir ações">
    <header><i class="tk-ico">${ico(ico2)}</i><div class="tk-tit"><b>${ONDE(k.c)}</b><small>${sub}</small></div>${rel}</header>
    ${reservaTk(k.c)}<ul>${k.itens.map((i) => `<li class="${i.status}"><span>${i.qtd}× ${t(i.nome)}</span>${notas(i)}</li>`).join('')}</ul>
    ${k.espera?.length ? `<p class="tk-espera">${k.itens.every((i) => i.status === 'pronto') ? `${ico('okcirc')}Sua parte pronta · ` : ''}esperando ${t(k.espera.join(', '))}</p>` : ''}
    <p class="tk-dica">${k.estado === 'novo' ? 'Toque para começar a preparar' : k.estado === 'preparo' ? 'Toque quando ficar pronto' : 'O garçom já foi avisado'}</p>
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
    const S = setorAgora(), setores = [['cozinha', 'Cozinha', 'chef'], ['bar', 'Bar', 'taca'], ...(tem('forno') ? [['forno', 'Forno', 'relogio']] : [])];
    const tirar = tem('forno') ? filaForno(itensForno(), lojaCfg().forno).filter((x) => x.passou).length : 0;
    return `<header class="cab-cozinha"><h1><img src="img/k-louro-esq.webp?v=1" alt="" width="56" height="74">${S === 'bar' ? 'Bar' : S === 'forno' ? 'Forno' : estacaoAgora() ? t(nomeEst(estacaoAgora())) : 'Cozinha'}<img src="img/k-louro-dir.webp?v=1" alt="" width="56" height="74"></h1>
      <div class="seg-coz" role="group" aria-label="Setor">${setores.map(([v, r, i]) => `<button type="button" data-acao="setor" data-s="${v}" aria-pressed="${S === v}">${ico(i)}${r}${v === 'forno' && tirar ? ` <em class="badge">${tirar}</em>` : ''}</button>`).join('')}</div>
      <button type="button" class="bt-tela" data-acao="tela-cheia" aria-label="Tela cheia">${ico('telacheia')}</button></header>
      ${porEstacao() ? `<div class="chips estacoes-coz" role="group" aria-label="Estação">${[['', 'Todas'], ...estacoes().map((x) => [x.id, x.nome])].map(([v, n]) => `<button type="button" class="chip ${estacaoAgora() === v ? 'on' : ''}" data-acao="estacao" data-e="${t(v)}" aria-pressed="${estacaoAgora() === v}">${t(n)} <b>${db.comandas.reduce((s, c) => s + c.itens.filter((i) => ativo(i) && i.status !== 'pronto' && i.setor === 'cozinha' && (!v || estDe(i) === v)).length, 0)}</b></button>`).join('')}</div>` : ''}
      ${S === 'forno' ? htmlForno() : `<section class="kds quadro">${cols.map(([e, r]) => `<div class="kds-col ${e}"><h2 class="placa">${r.toUpperCase()} <span>(${l.filter((k) => k.estado === e).length})</span></h2><div class="trilho" aria-hidden="true"></div>${l.filter((k) => k.estado === e).map(ticket).join('') || `<div class="vazio-quadro">${e === 'novo' ? 'Nenhum pedido novo. Quando o garçom enviar, aparece aqui com um som.' : e === 'preparo' ? 'Nada sendo preparado.' : 'Nada pronto esperando.'}</div>`}</div>`).join('')}</section>`}`;
  },
  montar() {
    clearInterval(relogio);
    relogio = setInterval(() => {
      const els = document.querySelectorAll('[data-desde]'), ates = document.querySelectorAll('[data-ate]'); if (!els.length && !ates.length) return clearInterval(relogio);
      els.forEach((e) => { const b = e.querySelector('b'); if (b) b.textContent = mmss(Date.now() - Number(e.dataset.desde)); });
      // forno: contagem regressiva; quando passa da hora, a tela redesenha com o aviso "Tirar do forno!" e toca
      ates.forEach((e) => { const r = Number(e.dataset.ate) - Date.now(), b = e.querySelector('b'); if (r <= 0 && !e.closest('.tirar')) { if (document.body.dataset.tocou) bip(660); dispatchEvent(new HashChangeEvent('hashchange')); } else if (b && r > 0) b.textContent = mmss(r); });
    }, 1000);
  },
});
acao('ticket-abrir', (b) => {
  const c = comanda(b.dataset.c), env = Number(b.dataset.env); if (!c) return;
  const itens = c.itens.filter((i) => i.enviado === env && !i.cancelado && doSetor(i) && daEstacao(i));
  const estado = itens.every((i) => i.status === 'pronto') ? 'pronto' : itens.some((i) => i.status === 'preparo') ? 'preparo' : 'novo';
  const d = `data-c="${c.id}" data-env="${env}"`;
  folha({ titulo: ONDE(c), corpo: `${c.reserva?.restricoes ? `<p class="aviso perdido">${ico('alerta')}Restrições: ${t(c.reserva.restricoes)}</p>` : ''}<ul class="lista-itens">${itens.map((i) => `<li><b>${i.qtd}×</b><span style="flex:1;margin:0">${t(i.nome)}${notas(i) ? `<small>${notas(i).replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<\/?em[^>]*>/g, ' · ').replace(/^ · | · $/g, '')}</small>` : ''}</span>
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
    <h1>${e(ONDE(c))}</h1><p>${new Date(env).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${c.garcom ? ` · ${e(c.garcom)}` : ''}${c.cliente?.nome ? ` · ${e(c.cliente.nome)}` : ''}</p>${c.reserva?.restricoes ? `<em>RESTRIÇÕES: ${e(c.reserva.restricoes)}</em>` : ''}${c.reserva?.ocasiao ? `<p>${e(c.reserva.ocasiao)}</p>` : ''}
    <ul>${its.map((i) => `<li><b>${i.qtd}× ${e(i.nome)}</b>${i.etapa ? `<em>${e(NOME_ETAPA[i.etapa] || i.etapa)}</em>` : ''}${(i.combo || []).map((x) => `<em>${e(x.grupo)}: ${e(x.nome)}</em>`).join('')}${(i.adic || []).map((a) => `<em>${e(a.nome)}</em>`).join('')}${alergenos(i).length ? `<em>Contém ${e(alergenos(i).join(', '))}</em>` : ''}${i.obs ? `<em>${e(i.obs)}</em>` : ''}</li>`).join('')}</ul><script>print();setTimeout(()=>close(),400)<\/script>`);
  w.document.close();
});
const doTicket = (b) => { const c = comanda(b.dataset.c); const env = Number(b.dataset.env); return { c, itens: c ? c.itens.filter((i) => i.enviado === env && !i.cancelado && doSetor(i) && daEstacao(i)) : [] }; };
acao('setor', (b) => { setor = b.dataset.s; guarda('popina-setor', setor); dispatchEvent(new HashChangeEvent('hashchange')); });
acao('estacao', (b) => { estacao = b.dataset.e || ''; guarda('popina-estacao', estacao); dispatchEvent(new HashChangeEvent('hashchange')); });
// forno: pôr (começa a contar o tempo do tamanho) e tirar (pronto: o garçom ou o balcão é avisado)
const itemDe = (b) => { const c = comanda(b.dataset.c); return { c, i: c?.itens.find((x) => x.id === b.dataset.i) }; };
acao('forno-entrou', (b) => { const { c, i } = itemDe(b); if (i && i.status === 'novo') { mudarStatus(c, i, 'preparo'); toast(`${i.nome}: no forno`); } });
acao('forno-tirou', (b) => { const { c, i } = itemDe(b); if (i) { mudarStatus(c, i, 'pronto'); toast(`${i.nome}: saiu do forno`); } });
acao('comecar', (b) => { const { c, itens } = doTicket(b); itens.forEach((i) => i.status === 'novo' && mudarStatus(c, i, 'preparo')); });
acao('tudo-pronto', (b) => { const { c, itens } = doTicket(b); itens.forEach((i) => i.status !== 'pronto' && mudarStatus(c, i, 'pronto')); toast(`${c.tipo === 'mesa' ? 'Mesa ' + c.mesa : 'Pedido #' + c.num}: pronto. O garçom já foi avisado.`); });
acao('item-pronto', (b) => { const c = comanda(b.dataset.c); const i = c?.itens.find((x) => x.id === b.dataset.i); if (i) mudarStatus(c, i, 'pronto'); });
