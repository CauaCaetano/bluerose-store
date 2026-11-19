// Popina · salão (o que fazer agora e as mesas), a comanda de qualquer conta e o lançar itens do garçom.
import { db, t, din, tempo, comanda, comandaDaMesa, abrirMesa, adicionarItem, enviar, mudarStatus, cancelarItem, transferir, juntarMesas, conta, valorItem, itensValidos,
  fila, estadoMesa, atenderChamado, confirmarQR, recusarQR, ondeComanda, quemPediu, tipoNome, prod, ativos, aPartir, euSou, setEuSou, temPin, grava, marcar, fone, zap, hora, r2 } from './loja.js?v=40';
import { registrar, acao, ir } from './nucleo.js?v=40';
import { ico, folha, toast, confirma, autorizar, $, $$ } from './ui.js?v=40';
import { formOpcoes, temOpcoes } from './opcoes.js?v=40';
import { imprimirConta, imprimirCozinha } from './imprimir.js?v=40';

const ESTADO = { livre: 'Livre', ocupada: 'Ocupada', conta: 'Pediu a conta', pronto: 'Prato pronto', chamou: 'Chamou', qr: 'Pedido do QR' };
const nMesas = () => Math.max(1, Math.min(200, Number(db.config.mesas) || 10));
export const voltarPara = (c) => (c?.tipo === 'mesa' ? 'salao' : 'pedidos');
export const voltar = (h, txt) => `<button type="button" class="voltar" data-ir="${h}">${ico('voltar')}${t(txt)}</button>`;
export const rotaComanda = (c) => (c.tipo === 'mesa' ? `mesa/${c.mesa}` : `comanda/${c.id}`);

// ------------------------------------------------------------------ o que fazer agora
function linhaFila(x) {
  if (x.tipo === 'qr') return `<div class="agora-item qr"><span class="ico-g">${ico('qr')}</span><div class="tx"><b>Mesa ${x.q.mesa} pediu pelo QR</b><small>${x.q.itens.map((i) => `${i.qtd}× ${t(prod(i.prod)?.nome || 'item')}`).join(', ')} · ${tempo(x.ts)}</small></div>
    <div class="bts"><button type="button" class="bt pq" data-acao="qr-recusar" data-id="${t(x.q.id)}">Recusar</button><button type="button" class="bt pq cheio" data-acao="qr-ok" data-id="${t(x.q.id)}">Mandar para a cozinha</button></div></div>`;
  if (x.tipo === 'conta') return `<div class="agora-item conta"><span class="ico-g">${ico('conta')}</span><div class="tx"><b>${t(ondeComanda(x.c))} pediu a conta</b><small>${din(conta(x.c).total)} · ${tempo(x.ts)}</small></div>
    <div class="bts"><button type="button" class="bt pq" data-acao="imp-conta" data-id="${x.c.id}">${ico('impressora')}Imprimir</button><button type="button" class="bt pq cheio" data-ir="fechar/${x.c.id}">Fechar conta</button></div></div>`;
  if (x.tipo === 'chamou') return `<div class="agora-item chamou"><span class="ico-g">${ico('sino')}</span><div class="tx"><b>Mesa ${x.x.mesa} chamou o garçom</b><small>${tempo(x.ts)}${x.x.origem === 'QR' ? ' · pelo QR da mesa' : ''}</small></div>
    <div class="bts"><button type="button" class="bt pq cheio" data-acao="atender" data-id="${t(x.x.id)}">Já fui</button></div></div>`;
  return `<div class="agora-item pronto"><span class="ico-g">${ico('cloche')}</span><div class="tx"><b>Pronto: ${t(quemPediu(x.c))}</b><small>${x.itens.map((i) => `${i.qtd}× ${t(i.nome)}`).join(', ')}</small></div>
    <div class="bts"><button type="button" class="bt pq ok" data-acao="entregar" data-id="${x.c.id}">${ico('check')}Entreguei</button></div></div>`;
}
registrar('salao', {
  titulo: 'Salão',
  html() {
    const f = fila(), n = nMesas();
    const ocup = db.comandas.filter((c) => c.tipo === 'mesa').length;
    return `<div class="cab"><div><h1>Salão</h1><p>${ocup} de ${n} mesas ocupadas${euSou() ? ` · você é ${t(euSou())}` : ''}</p></div>
      <div class="acoes"><button type="button" class="bt" data-acao="quem-sou">${ico('pessoas')}${euSou() ? 'Trocar garçom' : 'Quem é você?'}</button></div></div>
    ${f.length ? `<h2 class="sr">O que fazer agora</h2><div class="agora">${f.slice(0, verTudo ? 30 : LIM()).map(linhaFila).join('')}${f.length > LIM() ? `<button type="button" class="bt" data-acao="ver-fila">${verTudo ? 'Mostrar menos' : `Ver mais ${f.length - LIM()} ${f.length - LIM() === 1 ? 'aviso' : 'avisos'}`}</button>` : ''}</div>` : ''}
    <div class="mesas">${Array.from({ length: n }, (_, k) => k + 1).map((m) => { const e = estadoMesa(m), c = comandaDaMesa(m);
      return `<button type="button" class="mesa ${e}" data-acao="mesa" data-n="${m}" aria-label="Mesa ${m}, ${ESTADO[e]}"><span class="n">${m}</span><span class="s">${ESTADO[e]}</span>${c ? `<span class="d">${din(conta(c).total)} · ${tempo(c.aberta)}</span>` : ''}</button>`; }).join('')}</div>
    <div class="legenda">${Object.entries(ESTADO).map(([k, v]) => `<span><i class="mesa ${k}"></i>${v}</span>`).join('')}</div>`;
  },
});
acao('mesa', (b) => { const n = Number(b.dataset.n); if (comandaDaMesa(n)) ir(`mesa/${n}`); else abrirMesaFolha(n); });
acao('quem-sou', () => escolherGarcom());
let verTudo = false;
const LIM = () => (innerWidth >= 1000 ? 6 : 3); // no celular, os 3 mais urgentes; o resto num toque
acao('ver-fila', () => { verTudo = !verTudo; ir('salao'); });
acao('atender', (b) => { const x = db.chamados.find((y) => y.id === b.dataset.id); if (x) { atenderChamado(x); toast('Chamado atendido'); } });
acao('qr-ok', (b) => { const q = db.pedidosQR.find((x) => x.id === b.dataset.id); if (!q) return; const c = confirmarQR(q); toast(`Pedido da mesa ${c.mesa} foi para a cozinha`); });
acao('qr-recusar', async (b) => { const q = db.pedidosQR.find((x) => x.id === b.dataset.id); if (q && await confirma(`Recusar o pedido da mesa ${q.mesa}? Avise o cliente na mesa.`, 'Recusar', true)) recusarQR(q); });
acao('entregar', (b) => { const c = comanda(b.dataset.id); if (!c) return; c.itens.filter((i) => i.status === 'pronto').forEach((i) => { i.status = 'entregue'; i.entregue = Date.now(); }); marcar(c, 'entregou', 'Entregou os pratos prontos'); grava(); toast('Marcado como entregue'); });
acao('imp-conta', (b) => { const c = comanda(b.dataset.id); if (c) imprimirConta(c); });

function escolherGarcom(depois) {
  const l = db.config.garcons || [];
  folha({ titulo: 'Quem está usando este celular?', corpo: `<p class="mudo" style="margin-bottom:12px">O nome vai nas mesas que você abrir e no relatório de garçons.</p>
    ${l.length ? `<div class="chips quebra">${l.map((n) => `<button type="button" class="chip" data-g="${t(n)}" aria-pressed="${n === euSou()}">${t(n)}</button>`).join('')}</div>` : ''}
    <label class="campo" style="margin-top:12px"><span>${l.length ? 'Outro nome' : 'Seu nome'}</span><input data-novo maxlength="30" placeholder="Ex.: Rafael"></label>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Pronto</button>',
  aoAbrir: (f, fechar) => {
    const ok = (n) => { n = String(n || '').trim(); if (!n) return toast('Escolha ou escreva o nome'); setEuSou(n); if (!l.includes(n)) { db.config.garcons = [...l, n]; grava(); } fechar(); depois?.(n); if (!depois) ir(location.hash.slice(1) || 'salao'); };
    $$('[data-g]', f).forEach((b) => { b.onclick = () => ok(b.dataset.g); });
    $('[data-ok]', f).onclick = () => ok($('[data-novo]', f).value || euSou());
  } });
}
function abrirMesaFolha(n) {
  let p = 2;
  folha({ titulo: `Abrir a mesa ${n}`, corpo: `<p class="campo"><span style="font-weight:700">Quantas pessoas?</span></p>
    <div class="chips quebra" role="group" aria-label="Pessoas">${[1, 2, 3, 4, 5, 6, 8, 10].map((x) => `<button type="button" class="chip" data-p="${x}" aria-pressed="${x === p}">${x}</button>`).join('')}</div>
    ${(db.config.garcons || []).length ? `<p class="campo" style="margin-top:14px"><span style="font-weight:700">Garçom</span></p><div class="chips quebra">${db.config.garcons.map((g) => `<button type="button" class="chip" data-gar="${t(g)}" aria-pressed="${g === euSou()}">${t(g)}</button>`).join('')}</div>` : ''}`,
  pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio grande" data-ok>Abrir e lançar</button>',
  aoAbrir: (f, fechar) => {
    $$('[data-p]', f).forEach((b) => { b.onclick = () => { p = Number(b.dataset.p); $$('[data-p]', f).forEach((x) => x.setAttribute('aria-pressed', x === b)); }; });
    $$('[data-gar]', f).forEach((b) => { b.onclick = () => { setEuSou(b.dataset.gar); $$('[data-gar]', f).forEach((x) => x.setAttribute('aria-pressed', x === b)); }; });
    $('[data-ok]', f).onclick = () => { const c = abrirMesa(n, p, euSou()); fechar(); ir(`lancar/${c.id}`); };
  } });
}

// ------------------------------------------------------------------ a comanda (mesa, balcão, retirada ou entrega)
const STATUS = { rascunho: ['A mandar', 'novo'], novo: ['Na cozinha', 'novo'], preparo: ['Preparando', 'prep'], pronto: ['Pronto', 'pronto'], entregue: ['Entregue', 'livre'] };
const adicTxt = (i) => (i.adic || []).map((a) => a.nome.replace(/^[^:]+: /, '')).join(', ');
function linhaItem(c, i) {
  const [st, cl] = STATUS[i.status] || ['', ''];
  return `<li class="${i.cancelado ? 'cancelado' : ''}"><span class="q">${i.kg ? '' : `${i.qtd}×`}</span><div class="nm"><b>${t(i.nome)}</b>${adicTxt(i) ? `<small>${t(adicTxt(i))}</small>` : ''}${i.obs ? `<small class="obs">${t(i.obs)}</small>` : ''}
    <small>${i.cancelado ? `Cancelado${i.cancelado.motivo ? `: ${t(i.cancelado.motivo)}` : ''}` : `<span class="etq ${cl}">${st}</span>${i.enviado && i.status !== 'entregue' ? ` · ${tempo(i.enviado)}` : ''}`}</small></div>
    <span class="v">${din(valorItem(i))}</span>${i.cancelado ? '' : `<button type="button" class="bt-ico" data-acao="item-tirar" data-c="${c.id}" data-i="${i.id}" aria-label="Tirar ${t(i.nome)}">${ico('lixo')}</button>`}</li>`;
}
export function blocoTotais(c) {
  const v = conta(c);
  return `<div class="totais"><div><span>Subtotal</span><span class="num">${din(v.sub)}</span></div>
    ${v.servico ? `<div><span>Serviço (${v.pctServ}%)</span><span class="num">${din(v.servico)}</span></div>` : ''}${v.couvert ? `<div><span>Couvert</span><span class="num">${din(v.couvert)}</span></div>` : ''}
    ${v.rodizio ? `<div><span>Rodízio</span><span class="num">${din(v.rodizio)}</span></div>` : ''}${v.ingresso ? `<div><span>Entrada</span><span class="num">${din(v.ingresso)}</span></div>` : ''}${v.consumacao ? `<div><span>Consumação mínima</span><span class="num">${din(v.consumacao)}</span></div>` : ''}
    ${v.entrega ? `<div><span>Entrega</span><span class="num">${din(v.entrega)}</span></div>` : ''}${v.desconto ? `<div><span>Desconto</span><span class="num">− ${din(v.desconto)}</span></div>` : ''}
    <div class="total"><span>Total</span><span class="num">${din(v.total)}</span></div>
    ${v.pago ? `<div style="color:var(--ok-tinta)"><span>Já pago</span><span class="num">${din(v.pago)}</span></div><div class="total" style="font-size:20px"><span>Falta</span><span class="num">${din(v.falta)}</span></div>` : ''}</div>`;
}
function infoCliente(c) {
  const cl = c.cliente || {}; if (c.tipo === 'mesa') return '';
  const ent = { novo: 'Recebido', preparo: 'Preparando', saiu: 'Saiu para entrega' }[c.entrega] || '';
  const entregador = c.entregador ? (db.entregadores || []).find((e) => e.id === c.entregador)?.nome || '' : '';
  return `<div class="cartao"><h2>${t(cl.nome || 'Cliente')}</h2>
    ${cl.tel ? `<p><a href="${zap(cl.tel, `Olá, ${(cl.nome || '').split(' ')[0]}! Aqui é do ${db.config.nome}.`)}" target="_blank" rel="noopener" class="bt pq">${ico('zap')}${t(fone(cl.tel))}</a></p>` : ''}
    ${c.tipo === 'delivery' ? `<p style="margin-top:8px"><b>Entregar em:</b> ${t(cl.end || 'sem endereço')}${cl.bairro ? ` · ${t(cl.bairro)}` : ''}</p>` : ''}
    ${c.pagarNaEntrega ? `<p><b>Paga na entrega:</b> ${t(c.pagarNaEntrega)}${c.trocoPara ? ` · levar troco para ${din(c.trocoPara)} (troco de ${din(Math.max(0, c.trocoPara - conta(c).falta))})` : ''}</p>` : c.trocoPara ? `<p><b>Troco para:</b> ${din(c.trocoPara)}</p>` : ''}
    ${c.tipo === 'delivery' ? `<p style="margin-top:8px"><span class="etq ${c.entrega === 'saiu' ? 'saiu' : 'prep'}">${ent}</span>${entregador ? ` com ${t(entregador)}` : ''}${c.saiu ? ` às ${hora(c.saiu)}` : ''}</p>` : ''}
    ${c.origem ? `<p class="mudo" style="margin-top:6px">Pedido feito: ${t(c.origem)} · ${hora(c.aberta)}</p>` : ''}</div>`;
}
export function telaComanda(c) {
  const v = conta(c), rasc = c.itens.filter((i) => i.status === 'rascunho'), vivos = itensValidos(c);
  const grupos = [['A mandar para a cozinha', rasc], ['Na cozinha', vivos.filter((i) => ['novo', 'preparo'].includes(i.status))], ['Prontos', vivos.filter((i) => i.status === 'pronto')], ['Entregues', vivos.filter((i) => i.status === 'entregue')], ['Cancelados', c.itens.filter((i) => i.cancelado)]];
  const prontos = vivos.filter((i) => i.status === 'pronto').length;
  return `${voltar(voltarPara(c), c.tipo === 'mesa' ? 'Salão' : 'Pedidos')}
    <div class="com-cab"><h1>${t(c.tipo === 'mesa' ? `Mesa ${c.mesa}` : quemPediu(c))}</h1>${c.senha ? `<span class="etq novo">Senha ${c.senha}</span>` : ''}
      <span class="info">${c.tipo === 'mesa' ? `${c.pessoas || 1} ${c.pessoas === 1 ? 'pessoa' : 'pessoas'}${c.garcom ? ` · ${t(c.garcom)}` : ''}` : t(ondeComanda(c))} · aberta há ${tempo(c.aberta)}</span>${c.pediuConta ? '<span class="etq prep">Pediu a conta</span>' : ''}</div>
    <div class="duas lado"><div>
      ${infoCliente(c)}
      <div class="cartao">${vivos.length || c.itens.length ? grupos.filter(([, l]) => l.length).map(([n, l]) => `<p class="grupo-tit">${n}</p><ul class="itens">${l.map((i) => linhaItem(c, i)).join('')}</ul>`).join('') : '<p class="vazio">Nada lançado ainda. Toque em “Lançar itens”.</p>'}
        ${blocoTotais(c)}</div>
    </div><div>
      <div class="cartao"><h2>Ações</h2><div class="linha-bts">
        ${prontos ? `<button type="button" class="bt ok" data-acao="entregar" data-id="${c.id}">${ico('check')}Entreguei os prontos</button>` : ''}
        ${c.tipo === 'delivery' && c.entrega !== 'saiu' ? `<button type="button" class="bt" data-acao="saiu" data-id="${c.id}">${ico('moto')}Saiu para entrega</button>` : ''}
        ${c.tipo === 'balcao' && prontos ? `<button type="button" class="bt" data-acao="chamar-cli" data-id="${c.id}">${ico('fala')}Chamar ${c.senha ? `senha ${c.senha}` : 'cliente'}</button>` : ''}
        <button type="button" class="bt" data-acao="imp-conta" data-id="${c.id}">${ico('impressora')}Imprimir conta</button>
        ${vivos.some((i) => i.status !== 'rascunho') ? `<button type="button" class="bt" data-acao="imp-coz" data-id="${c.id}">${ico('cozinha')}Imprimir pedido da cozinha</button>` : ''}
        ${c.tipo === 'mesa' ? `<button type="button" class="bt" data-acao="pediu-conta" data-id="${c.id}">${ico('conta')}${c.pediuConta ? 'Tirar “pediu a conta”' : 'Pediu a conta'}</button>
          <button type="button" class="bt" data-acao="trocar-mesa" data-id="${c.id}">${ico('troca')}Trocar de mesa</button>
          <button type="button" class="bt" data-acao="juntar" data-id="${c.id}">${ico('mais2')}Juntar outra mesa</button>
          <button type="button" class="bt" data-acao="pessoas" data-id="${c.id}">${ico('pessoas')}Pessoas: ${c.pessoas || 1}</button>` : ''}
        <button type="button" class="bt" data-acao="hist" data-id="${c.id}">${ico('relogio')}O que aconteceu</button>
      </div></div>
    </div></div>
    <div class="barra-fixa"><button type="button" class="bt grande" data-ir="lancar/${c.id}">${ico('mais2')}Lançar itens</button>
      ${rasc.length ? `<button type="button" class="bt cheio grande" data-acao="mandar" data-id="${c.id}">${ico('cozinha')}Mandar (${rasc.reduce((s, i) => s + i.qtd, 0)})</button>`
        : `<button type="button" class="bt cheio grande" data-ir="fechar/${c.id}" ${v.total <= 0 && !c.itens.length ? 'disabled' : ''}>${ico('conta')}Fechar conta</button>`}</div>`;
}
registrar('mesa', {
  aba: 'salao', titulo: (n) => `Mesa ${n}`,
  html(n) {
    const c = comandaDaMesa(Number(n));
    if (!c) return `${voltar('salao', 'Salão')}<div class="cab"><div><h1>Mesa ${t(n)}</h1><p>Mesa livre</p></div></div><button type="button" class="bt cheio grande" data-acao="mesa" data-n="${Number(n)}">${ico('mais2')}Abrir a mesa</button>`;
    return telaComanda(c);
  },
});
registrar('comanda', {
  aba: 'pedidos', titulo: (id) => { const c = comanda(id); return c ? ondeComanda(c) : 'Pedido'; },
  html(id) { const c = comanda(id); if (!c) return `${voltar('pedidos', 'Pedidos')}<p class="vazio">Este pedido já foi fechado.</p>`; return telaComanda(c); },
});
acao('mandar', (b) => { const c = comanda(b.dataset.id); if (!c) return; const n = enviar(c); toast(n ? `${n} ${n === 1 ? 'item foi' : 'itens foram'} para a cozinha` : 'Nada para mandar'); if (n && c.tipo === 'mesa') ir('salao'); });
acao('imp-coz', (b) => { const c = comanda(b.dataset.id); if (!c) return; const l = itensValidos(c).filter((i) => !['rascunho', 'entregue'].includes(i.status)); imprimirCozinha(c, l.length ? l : itensValidos(c).filter((i) => i.status !== 'rascunho')); });
acao('pediu-conta', (b) => { const c = comanda(b.dataset.id); if (!c) return; c.pediuConta = c.pediuConta ? 0 : Date.now(); if (!c.pediuConta) delete c.pediuConta; grava(); });
acao('chamar-cli', (b) => { const c = comanda(b.dataset.id); if (!c) return; c.itens.filter((i) => i.status === 'pronto').forEach((i) => { i.status = 'entregue'; i.entregue = Date.now(); }); c.chamada = Date.now(); grava(); toast(`Chame: ${c.senha ? `senha ${c.senha}` : ''} ${c.cliente?.nome || ''}`.trim()); });
acao('saiu', (b) => {
  const c = comanda(b.dataset.id); if (!c) return; const l = db.entregadores || [];
  const sai = (id) => { c.entrega = 'saiu'; c.saiu = Date.now(); if (id) c.entregador = id; c.itens.filter((i) => ['pronto', 'novo', 'preparo'].includes(i.status) && !i.cancelado).forEach((i) => { i.status = 'entregue'; i.entregue = Date.now(); }); marcar(c, 'saiu', 'Saiu para entrega'); grava(); toast('Saiu para entrega'); };
  if (!l.length) return sai('');
  folha({ titulo: 'Quem vai levar?', corpo: `<div class="chips quebra">${l.map((e) => `<button type="button" class="chip" data-e="${e.id}">${t(e.nome)}</button>`).join('')}</div>`,
    aoAbrir: (f, fechar) => $$('[data-e]', f).forEach((x) => { x.onclick = () => { sai(x.dataset.e); fechar(); }; }) });
});
acao('item-tirar', async (b) => {
  const c = comanda(b.dataset.c), i = c?.itens.find((x) => x.id === b.dataset.i); if (!i) return;
  if (i.status === 'rascunho') { cancelarItem(c, i); toast('Item tirado'); return; }
  const r = await autorizar({ titulo: `Cancelar ${i.qtd}× ${i.nome}?`, texto: i.status === 'novo' ? 'A cozinha ainda não começou.' : 'Este item já foi para a cozinha.', motivos: ['Lançado errado', 'Cliente desistiu', 'Demorou demais', 'Saiu errado'], pedirPin: temPin(), sim: 'Cancelar o item', perigo: true });
  if (!r) return; cancelarItem(c, i, r.motivo, r.pin ? `${euSou() || 'Equipe'} · senha do gerente` : undefined); toast('Item cancelado');
});
acao('trocar-mesa', (b) => {
  const c = comanda(b.dataset.id); if (!c) return;
  const livres = Array.from({ length: nMesas() }, (_, k) => k + 1).filter((m) => !comandaDaMesa(m));
  folha({ titulo: `Mesa ${c.mesa} vai para qual mesa?`, corpo: livres.length ? `<div class="chips quebra">${livres.map((m) => `<button type="button" class="chip" data-m="${m}">Mesa ${m}</button>`).join('')}</div>` : '<p class="vazio">Nenhuma mesa livre.</p>',
    aoAbrir: (f, fechar) => $$('[data-m]', f).forEach((x) => { x.onclick = () => { const m = Number(x.dataset.m); if (transferir(c, m)) { fechar(); toast(`Agora é a mesa ${m}`); ir(`mesa/${m}`); } }; }) });
});
acao('juntar', (b) => {
  const c = comanda(b.dataset.id); if (!c) return;
  const outras = db.comandas.filter((x) => x.tipo === 'mesa' && x !== c);
  folha({ titulo: `Juntar qual mesa na ${c.mesa}?`, corpo: outras.length ? `<p class="mudo" style="margin-bottom:10px">Os itens e as pessoas da outra mesa vêm para esta, e ela fica livre.</p><div class="chips quebra">${outras.map((x) => `<button type="button" class="chip" data-m="${x.id}">Mesa ${x.mesa} · ${din(conta(x).total)}</button>`).join('')}</div>` : '<p class="vazio">Não há outra mesa ocupada.</p>',
    aoAbrir: (f, fechar) => $$('[data-m]', f).forEach((x) => { x.onclick = () => { const o = comanda(x.dataset.m); if (juntarMesas(c, o)) { fechar(); toast(`Mesa ${o.mesa} juntada`); } }; }) });
});
acao('pessoas', (b) => {
  const c = comanda(b.dataset.id); if (!c) return;
  folha({ titulo: 'Quantas pessoas na mesa?', corpo: `<div class="chips quebra">${[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((x) => `<button type="button" class="chip" data-p="${x}" aria-pressed="${x === c.pessoas}">${x}</button>`).join('')}</div>`,
    aoAbrir: (f, fechar) => $$('[data-p]', f).forEach((x) => { x.onclick = () => { c.pessoas = Number(x.dataset.p); grava(); fechar(); }; }) });
});
acao('hist', (b) => {
  const c = comanda(b.dataset.id); if (!c) return;
  folha({ titulo: `O que aconteceu · ${ondeComanda(c)}`, corpo: `<ul class="lista-l">${[...(c.hist || [])].reverse().map((h) => `<li><div class="tx"><b>${t(h.txt)}</b><small>${hora(h.t)} · ${t(h.quem || '')}</small></div></li>`).join('') || '<li>Nada registrado.</li>'}</ul>` });
});

// ------------------------------------------------------------------ lançar itens
let catSel = '', busca = '';
const noRasc = (c, id) => c.itens.filter((i) => i.status === 'rascunho' && i.prod === id).reduce((s, i) => s + i.qtd, 0);
const iniciais = (n) => String(n).trim()[0]?.toUpperCase() || '?';
export function fotoProd(p) { return p.foto ? `<img class="foto" src="${t(p.foto)}" alt="" loading="lazy" width="72" height="72">` : `<span class="foto sem" aria-hidden="true">${t(iniciais(p.nome))}</span>`; }
registrar('lancar', {
  titulo: 'Lançar itens',
  aba: '', // a aba certa vem da comanda
  html(id) {
    const c = comanda(id); if (!c) return `${voltar('salao', 'Salão')}<p class="vazio">Esta conta já foi fechada.</p>`;
    this.aba = c.tipo === 'mesa' ? 'salao' : 'pedidos';
    const cats = db.categorias.filter((k) => ativos().some((p) => p.cat === k.id));
    const q = busca.trim().toLowerCase();
    const l = ativos().filter((p) => (!catSel || p.cat === catSel) && (!q || `${p.nome} ${p.desc || ''}`.toLowerCase().includes(q)));
    const rasc = c.itens.filter((i) => i.status === 'rascunho'), n = rasc.reduce((s, i) => s + i.qtd, 0);
    return `${voltar(rotaComanda(c), `Voltar para ${c.tipo === 'mesa' ? `a mesa ${c.mesa}` : 'o pedido'}`)}
      <div class="cab"><div><h1>${t(c.tipo === 'mesa' ? `Mesa ${c.mesa}` : quemPediu(c))}</h1><p>Toque no + para pôr na comanda</p></div></div>
      <label class="busca">${ico('busca')}<input type="search" data-busca value="${t(busca)}" placeholder="Buscar prato ou bebida" aria-label="Buscar prato ou bebida" autocomplete="off"></label>
      <div class="chips" role="group" aria-label="Categorias"><button type="button" class="chip" data-cat="" aria-pressed="${!catSel}">Todos</button>${cats.map((k) => `<button type="button" class="chip" data-cat="${t(k.id)}" aria-pressed="${catSel === k.id}">${t(k.nome)}</button>`).join('')}</div>
      <div class="prods">${l.map((p) => { const k = noRasc(c, p.id);
        return `<div class="prod">${fotoProd(p)}<div class="tx"><b>${t(p.nome)}</b>${p.desc ? `<small>${t(p.desc)}</small>` : ''}<span class="preco">${p.porKg ? `${din(p.preco)} o quilo` : `${p.tamanhos?.length ? 'a partir de ' : ''}${din(aPartir(p))}`}</span></div>
          <button type="button" class="prod-add" data-acao="add" data-c="${c.id}" data-p="${t(p.id)}" aria-label="Pôr ${t(p.nome)}">+${k ? `<em>${k}</em>` : ''}</button></div>`; }).join('') || '<p class="vazio">Nada encontrado.</p>'}</div>
      ${n ? `<div class="barra-fixa"><button type="button" class="bt grande" data-ir="${rotaComanda(c)}">Ver comanda</button><button type="button" class="bt cheio grande" data-acao="mandar" data-id="${c.id}">${ico('cozinha')}Mandar para a cozinha (${n})</button></div>` : ''}`;
  },
  montar(el, id) {
    const i = $('[data-busca]', el);
    if (i) { i.oninput = () => { busca = i.value; const pos = i.selectionStart; ir(`lancar/${id}`); const n = $('[data-busca]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }; }
    $$('[data-cat]', el).forEach((b) => { b.onclick = () => { catSel = b.dataset.cat; ir(`lancar/${id}`); }; });
  },
});
document.addEventListener('popina-tela', (e) => { if (e.detail.nome !== 'lancar') { busca = ''; } });
acao('add', (b) => {
  const c = comanda(b.dataset.c), p = prod(b.dataset.p); if (!c || !p) return;
  if (!temOpcoes(p)) { adicionarItem(c, { prodId: p.id, qtd: 1 }); toast(`+1 ${p.nome}`); return; }
  abrirOpcoes(c, p);
});
export function abrirOpcoes(c, p, aoPor) {
  const fo = formOpcoes(p, { produtos: ativos(), garcom: true });
  folha({ titulo: p.nome, corpo: `${p.desc ? `<p class="mudo" style="margin-bottom:12px">${t(p.desc)}</p>` : ''}${fo.html}`,
    pe: '<button type="button" class="bt cheio grande" data-ok>Pôr na comanda</button>',
    aoAbrir: (f, fechar) => {
      const bt = $('[data-ok]', f);
      fo.ligar($('.folha-corpo', f), () => { bt.textContent = `Pôr na comanda · ${din(fo.total())}`; });
      bt.onclick = () => { const falta = fo.falta(); if (falta) return toast(falta); const v = fo.valor(); adicionarItem(c, v); fechar(); toast(`+${v.qtd} ${p.nome}`); aoPor?.(); };
    } });
}
export { r2 };
