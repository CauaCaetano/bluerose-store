// Popina · salão do garçom: a fila do que fazer agora (conceito C escolhido pelo dono) + as mesas, e a comanda da mesa.
import { db, t, din, dinCurto, tempo, minutos, prod, comanda, comandaDaMesa, fila, estadoMesa, conta, valorItem, abrirMesa, adicionarItem, enviar,
  mudarStatus, cancelarItem, atenderChamado, confirmarQR, recusarQR, transferir, grava, itensValidos, lojaCfg } from './loja.js?v=16';
import { registrar, acao, ir } from './nucleo.js?v=16';
import { ico, folha, toast, confirma, $, $$ } from './ui.js?v=16';
import { OBS_RAPIDAS } from './dados.js?v=16';
import { formOpcoes, aPartir, nomeItem, precoTam, rotAdic } from './opcoes.js?v=16';

// a tela do salão segue o conceito do GPT aprovado pelo dono (relatorios/popina/conceitos-gpt/1-salao-pc.png)
const ROTULO = { conta: 'Levar a conta', chamou: 'Mesa chamou', pronto: 'Prato pronto', qr: 'Pedido pelo QR' };
const COR = { conta: 'ouro', chamou: 'terra', pronto: 'oliva', qr: 'amarelo' };
const nItens = (l) => { const n = l.reduce((s, i) => s + (i.qtd || 1), 0); return `${n} ${n === 1 ? 'item' : 'itens'}`; };
const onde = (c) => c.tipo === 'mesa' ? `Mesa ${c.mesa}` : `${c.tipo === 'delivery' ? 'Delivery' : 'Balcão'} #${c.num}`;

function cartaoFila(f) {
  if (f.tipo === 'conta') return linha(f.tipo, `Mesa ${f.c.mesa}`, din(conta(f.c).total), 'Levar', `abrir-conta" data-id="${f.c.id}`);
  if (f.tipo === 'chamou') return linha(f.tipo, `Mesa ${f.x.mesa}`, `há ${tempo(f.ts)}`, 'Ir', `atender" data-id="${f.x.id}`);
  if (f.tipo === 'pronto') return linha(f.tipo, onde(f.c), nItens(f.itens), 'Levei', `levei" data-id="${f.c.id}`);
  return linha(f.tipo, `Mesa ${f.q.mesa}`, nItens(f.q.itens), 'Ver', `ver-qr" data-id="${f.q.id}`);
}
// cada pendência é um papelzinho preso na prancheta: faixa de cor, ícone, o que fazer, onde, e o botão
const ICO_FILA = { conta: 'conta', chamou: 'sino', pronto: 'cloche', qr: 'qr' };
const linha = (tipo, titulo, det, bt, acaoAttr) => `<article class="fila-item ${tipo}"><span class="faixa ${COR[tipo]}"></span><i class="fila-ico">${ico(ICO_FILA[tipo])}</i>
  <div class="fila-txt"><b>${ROTULO[tipo]}</b><span>${t(titulo)} • ${t(det)}</span></div>
  <button type="button" class="bt ${tipo === 'pronto' || tipo === 'qr' ? 'oliva' : 'cheio'}" data-acao="${acaoAttr}">${bt}</button></article>`;
// ramo de louro (o mesmo do logo), usado nos títulos
export const LOURO = '<svg class="louro" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20C9 15 12 10 13 3"/><path d="M8 15c-2.5 0-4-1.2-4.5-3 2.4-.4 4 .6 4.5 3zM10 11.5c-2.2-.6-3.3-2.1-3.3-3.9 2.2.2 3.4 1.6 3.3 3.9zM12 7.5c-1.6-1.1-2.1-2.8-1.7-4.4 1.9.8 2.5 2.4 1.7 4.4zM9.5 14.5c1-2.2 2.8-3.1 4.7-2.8-.9 2-2.6 3-4.7 2.8zM11.5 10.5c1.3-1.9 3-2.4 4.8-1.8-1.2 1.7-2.9 2.3-4.8 1.8z"/></svg>';

registrar('salao', {
  titulo: 'Salão', aba: 'salao',
  html() {
    const l = fila(), n = db.config.mesas, L = lojaCfg();
    const areas = (L.areas.length ? L.areas : [{ nome: 'Salão', de: 1, ate: n }]).map((a) => ({ ...a, ate: Math.min(a.ate, n) })).filter((a) => a.de <= n);
    const fora = Array.from({ length: n }, (_, k) => k + 1).filter((m) => !areas.some((a) => m >= a.de && m <= a.ate));
    if (fora.length) areas.push({ nome: 'Outras mesas', de: fora[0], ate: fora.at(-1), lista: fora });
    const ICO = { qr: 'qr', pronto: 'cloche', conta: 'conta', chamou: 'sino' };
    const tile = (m) => {
      const e = estadoMesa(m), c = comandaDaMesa(m);
      return `<a class="mesa ${e}" href="#mesa/${m}" aria-label="Mesa ${m}, ${({ livre: 'livre', ocupada: 'ocupada', pronto: 'com prato pronto', conta: 'pediu a conta', chamou: 'chamou o garçom', qr: 'pedido pelo QR esperando' })[e]}">${ICO[e] ? `<i class="mesa-sinal">${ico(ICO[e])}</i>` : ''}<b>${m}</b>${c ? `<small>${tempo(c.aberta)}</small>` : ''}</a>`;
    };
    const ocup = (lst) => lst.reduce((s, m) => s + (comandaDaMesa(m) ? 1 : 0), 0);
    const est = Array.from({ length: n }, (_, k) => estadoMesa(k + 1)), contaE = (...e) => est.filter((x) => e.includes(x)).length;
    // resumo do dia: vendas sem o serviço, o serviço, o delivery e a soma
    const ini = new Date(); ini.setHours(0, 0, 0, 0);
    const vh = db.vendas.filter((v) => v.ts >= ini.getTime() && !v.cancelado), soma = (lst, f) => lst.reduce((s, v) => s + (f(v) || 0), 0);
    const del = vh.filter((v) => v.tipo === 'delivery'), loja = vh.filter((v) => v.tipo !== 'delivery');
    const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '').replace(' de ', ' ');
    return `<img class="folhas-img" src="img/folhas.webp?v=2" alt="" width="228" height="88">
      <div class="salao-grade">
        <div class="salao-esq">
          <section class="prancheta" aria-label="O que fazer agora">
            <div class="prancheta-cab"><img class="louro-p" src="img/louro-esq.webp?v=1" alt="" width="44" height="60"><div><h2>O que fazer agora</h2><p class="prancheta-sub">${l.length} ${l.length === 1 ? 'pendência' : 'pendências'} • em tempo real</p></div><img class="louro-p" src="img/louro-dir.webp?v=1" alt="" width="44" height="60"></div>
            <div class="fila">${l.map(cartaoFila).join('') || '<div class="fila-vazia">Quando uma mesa pedir a conta, chamar ou um prato ficar pronto, aparece aqui.</div>'}</div></section>
          <section class="ticket-dia" aria-label="Resumo do dia"><div class="ticket-cab"><h2>Resumo do dia</h2><span>${ico('calendario')}Hoje, ${hoje}</span></div>
            <div class="ticket-linha"><span>${ico('moedas')}Vendas (bruto)</span><b>${din(soma(loja, (v) => v.total - (v.servico || 0)))}</b></div>
            <div class="ticket-linha"><span>${ico('etiqueta')}Serviço (${db.config.servico}%)</span><b>${din(soma(loja, (v) => v.servico))}</b></div>
            <div class="ticket-linha"><span>${ico('moto')}Delivery (${del.length} ${del.length === 1 ? 'pedido' : 'pedidos'})</span><b>${din(soma(del, (v) => v.total))}</b></div>
            <div class="ticket-total"><span>${ico('grafico')}Total do dia</span><b>${din(soma(vh, (v) => v.total))}</b></div>
            <img class="louro-img" src="img/louro.webp?v=2" alt="" width="162" height="50"></section>
        </div>
        <div class="salao-dir">
          <header class="cab-salao"><h1>Salão</h1><img class="aqueduto-img" src="img/aqueduto.webp?v=2" alt="" width="340" height="88"></header>
          <div class="legenda"><span><i class="ocupada"></i>Ocupada (${contaE('ocupada')})</span><span><i class="pronto"></i>Prato pronto (${contaE('pronto', 'qr')})</span><span><i class="conta"></i>Conta (${contaE('conta')})</span><span><i class="chamou"></i>Chamada (${contaE('chamou')})</span><span><i class="livre"></i>Livre (${contaE('livre')})</span></div>
          ${areas.map((a, k) => { const lst = a.lista || Array.from({ length: a.ate - a.de + 1 }, (_, j) => a.de + j), o = ocup(lst); return `<section class="area"><div class="area-cab"><h2 class="fita ${k % 2 ? 'verde' : ''}">${t(a.nome)}</h2><span>${lst.length} ${lst.length === 1 ? 'mesa' : 'mesas'} • ${o} ${o === 1 ? 'ocupada' : 'ocupadas'}</span></div><div class="mesas">${lst.map(tile).join('')}</div></section>`; }).join('')}
        </div>
      </div>`;
  },
});

acao('atender', (b) => { const x = db.chamados.find((y) => y.id === b.dataset.id); if (x) { atenderChamado(x); toast(`Mesa ${x.mesa} atendida`); } });
acao('levei', (b) => { const c = comanda(b.dataset.id); if (!c) return; c.itens.filter((i) => i.status === 'pronto').forEach((i) => mudarStatus(c, i, 'entregue')); toast('Marcado como entregue'); });
acao('abrir-conta', (b) => { const c = comanda(b.dataset.id); if (c) ir(`caixa/${c.id}`); });
acao('ver-qr', (b) => {
  const q = db.pedidosQR.find((x) => x.id === b.dataset.id); if (!q) return;
  // mostra o item como vai para a comanda: meia a meia, adicionais e observação
  const itens = q.itens.map((i) => { const p = prod(i.prod), b = i.meia && prod(i.meia.b), ad = i.adic || [];
    if (!p) return '';
    const nome = nomeItem(p, { tam: i.tam, meia: i.meia }, b);
    const preco = (b ? Math.max(precoTam(p, i.tam), precoTam(b, i.tam)) : precoTam(p, i.tam)) + ad.reduce((s, a) => s + a.preco, 0);
    return `<li><b>${i.qtd}×</b><span style="margin:0;font-weight:400;flex:1">${t(nome)}${ad.length ? `<small>${ad.map(rotAdic).join(' · ')}</small>` : ''}${i.obs ? `<small>${t(i.obs)}</small>` : ''}</span><span>${din(preco * i.qtd)}</span></li>`; }).join('');
  folha({ titulo: `Pedido pelo QR · mesa ${q.mesa}`, corpo: `<p class="mudo">O cliente pediu pelo cardápio no celular. Confirme para mandar para a cozinha (evita pedido de brincadeira).</p><ul class="lista-itens">${itens}</ul>`,
    pe: `<button type="button" class="bt" data-recusar>Recusar</button><button type="button" class="bt cheio" data-ok>Confirmar e enviar</button>`,
    aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => { confirmarQR(q); fechar(); toast(`Mesa ${q.mesa}: pedido enviado para a cozinha`); };
      $('[data-recusar]', f).onclick = () => { recusarQR(q); fechar(); toast('Pedido recusado'); }; } });
});
acao('nova-comanda', () => {
  const livres = Array.from({ length: db.config.mesas }, (_, k) => k + 1).filter((m) => !comandaDaMesa(m));
  folha({ titulo: 'Nova comanda', corpo: `<p class="mudo">Escolha a mesa ou abra um pedido de balcão ou delivery.</p>
    <div class="grade-mesas">${livres.map((m) => `<button type="button" class="mesa livre" data-m="${m}"><b>${m}</b></button>`).join('') || '<p>Todas as mesas estão ocupadas.</p>'}</div>
    <div class="linha-bts"><a class="bt" href="#pedidos/novo/balcao" data-fechar>${ico('sacola')}Balcão</a><a class="bt" href="#pedidos/novo/delivery" data-fechar>${ico('moto')}Delivery</a></div>`,
  aoAbrir: (f, fechar) => $$('[data-m]', f).forEach((b) => { b.onclick = () => { fechar(); ir(`mesa/${b.dataset.m}`); }; }) });
});

// ------------------------------------------------------------------ comanda da mesa
const STATUS = { rascunho: ['A enviar', 'rasc'], novo: ['Na cozinha', 'novo'], preparo: ['Na cozinha', 'prep'], pronto: ['Pronto', 'pronto'], entregue: ['Entregue', 'ok'] };
export function linhaItem(c, i, editavel = true) {
  const [rot, cls] = STATUS[i.status] || ['', ''];
  const extras = [...(i.adic || []).map(rotAdic), i.obs ? t(i.obs) : ""].filter(Boolean).join(" · ");
  return `<li class="item ${i.cancelado ? 'cancelado' : ''}"><div class="item-q">${i.qtd}×</div><div class="item-txt"><b>${t(i.nome)}</b>${extras ? `<small>${extras}</small>` : ''}${i.cancelado ? `<small class="erro">Cancelado${i.cancelado.motivo ? ': ' + t(i.cancelado.motivo) : ''}</small>` : ''}</div>
    <div class="item-dir"><span>${din(valorItem(i))}</span>${i.cancelado ? '' : `<em class="st ${cls}">${rot}</em>`}</div>
    ${editavel && !i.cancelado && i.status !== 'entregue' ? `<button type="button" class="bt-ico" data-acao="item-menu" data-c="${c.id}" data-i="${i.id}" aria-label="Opções de ${t(i.nome)}">${ico('mais')}</button>` : ''}</li>`;
}
registrar('mesa', {
  titulo: 'Comanda', aba: 'salao',
  html(n) {
    n = Number(n); const c = comandaDaMesa(n);
    if (!c) return `<header class="cab-tela"><a class="bt-ico" href="#salao" aria-label="Voltar">${ico('voltar')}</a><div><h1>Mesa ${n}</h1><p>Livre</p></div></header>
      <div class="abrir-mesa"><p>Quantas pessoas?</p><div class="pessoas">${[1, 2, 3, 4, 5, 6, 8, 10].map((p) => `<button type="button" class="chip" data-acao="abrir-mesa" data-n="${n}" data-p="${p}">${p}</button>`).join('')}</div></div>`;
    const v = conta(c), rasc = c.itens.filter((i) => i.status === 'rascunho');
    const enviados = c.itens.filter((i) => i.status !== 'rascunho');
    return `<header class="cab-tela cab-comanda"><a class="bt-ico" href="#salao" aria-label="Voltar">${ico('voltar')}</a><div><h1 class="fita-mesa"><img src="img/c-louro-esq.webp?v=1" alt="" width="30" height="31">Mesa ${n}<img src="img/c-louro-dir.webp?v=1" alt="" width="30" height="31"></h1><p>${c.pessoas} pessoas · aberta há ${tempo(c.aberta)}${c.garcom ? ` · ${t(c.garcom)}` : ''}</p></div>
        <button type="button" class="bt-ico" data-acao="mesa-menu" data-c="${c.id}" aria-label="Mais opções da mesa">${ico('mais')}</button></header><div class="comanda-papel">
      ${c.pediuConta ? `<div class="aviso ouro">${ico('conta')}Pediu a conta há ${tempo(c.pediuConta)}</div>` : ''}
      ${rasc.length ? `<section class="bloco"><div class="sec-tit"><h2><img src="img/c-louro-esq.webp?v=1" alt="" width="30" height="31">A enviar<img src="img/c-louro-dir.webp?v=1" alt="" width="30" height="31"></h2><span>${rasc.length} ${rasc.length === 1 ? 'item' : 'itens'}</span></div><ul class="itens">${rasc.map((i) => linhaItem(c, i)).join('')}</ul></section>` : ''}
      <section class="bloco"><div class="sec-tit"><h2><img src="img/c-louro-esq.webp?v=1" alt="" width="30" height="31">Já pedido<img src="img/c-louro-dir.webp?v=1" alt="" width="30" height="31"></h2><span>${enviados.length ? '' : 'nada ainda'}</span></div><ul class="itens">${enviados.map((i) => linhaItem(c, i)).join('')}</ul></section>
      <section class="totais"><div><span>Consumo</span><b>${din(v.sub)}</b></div>${c.servico ? `<div><span>Serviço ${db.config.servico}%</span><b>${din(v.servico)}</b></div>` : ''}<div class="total"><span>Total</span><b>${din(v.total)}</b></div></section></div>
      <div class="barra-acoes">
        <button type="button" class="bt" data-acao="cardapio-pick" data-c="${c.id}">${ico('mais2')}Itens</button>
        ${rasc.length ? `<button type="button" class="bt cheio grande" data-acao="enviar" data-c="${c.id}">${ico('chef')}Enviar para a cozinha (${rasc.reduce((s, i) => s + i.qtd, 0)})</button>`
          : `<button type="button" class="bt cheio grande" data-acao="pre-conta" data-c="${c.id}">${ico('conta')}Conta · ${dinCurto(v.total)}</button>`}
      </div>`;
  },
});
acao('abrir-mesa', (b) => { const c = abrirMesa(Number(b.dataset.n), Number(b.dataset.p), db.config.garcons?.[0] || ''); abrirSeletor(c); });
acao('enviar', (b) => { const c = comanda(b.dataset.c); const n = enviar(c); toast(`${n} ${n === 1 ? 'item enviado' : 'itens enviados'} para a cozinha e o bar`); });
acao('pre-conta', (b) => { const c = comanda(b.dataset.c); if (c) ir(`caixa/${c.id}`); });
acao('cardapio-pick', (b) => abrirSeletor(comanda(b.dataset.c)));
acao('item-menu', (b) => {
  const c = comanda(b.dataset.c), i = c?.itens.find((x) => x.id === b.dataset.i); if (!i) return;
  folha({ titulo: i.nome, corpo: `<div class="lista-bts">
      ${i.status === 'pronto' ? `<button type="button" class="bt" data-st="entregue">${ico('check')}Entreguei na mesa</button>` : ''}
      ${i.status === 'rascunho' ? `<button type="button" class="bt" data-mais>Mais um (${i.qtd + 1})</button>` : ''}
      <button type="button" class="bt perigo" data-cancela>${ico('lixo')}${i.status === 'rascunho' ? 'Tirar da comanda' : 'Cancelar item'}</button></div>
      ${i.status !== 'rascunho' ? `<label class="campo"><span>Motivo do cancelamento</span><input data-motivo placeholder="Ex.: cliente desistiu, saiu errado"></label>` : ''}`,
  aoAbrir: (f, fechar) => {
    $('[data-st]', f)?.addEventListener('click', () => { mudarStatus(c, i, 'entregue'); fechar(); });
    $('[data-mais]', f)?.addEventListener('click', () => { i.qtd++; grava(); fechar(); });
    $('[data-cancela]', f).onclick = () => { cancelarItem(c, i, $('[data-motivo]', f)?.value || ''); fechar(); toast(i.status === 'rascunho' ? 'Tirado' : 'Item cancelado (fica registrado no relatório)'); };
  } });
});
acao('mesa-menu', (b) => {
  const c = comanda(b.dataset.c); if (!c) return;
  const livres = Array.from({ length: db.config.mesas }, (_, k) => k + 1).filter((m) => !comandaDaMesa(m));
  folha({ titulo: `Mesa ${c.mesa}`, corpo: `<div class="lista-bts">
      <button type="button" class="bt" data-servico>${c.servico ? 'Tirar' : 'Cobrar'} os ${db.config.servico}% de serviço</button>
      <button type="button" class="bt" data-pessoas>Mudar número de pessoas (${c.pessoas})</button></div>
      <p class="mudo" style="margin-top:14px">Trocar de mesa</p><div class="grade-mesas">${livres.map((m) => `<button type="button" class="mesa livre" data-m="${m}"><b>${m}</b></button>`).join('')}</div>`,
  aoAbrir: (f, fechar) => {
    $('[data-servico]', f).onclick = () => { c.servico = !c.servico; grava(); fechar(); };
    $('[data-pessoas]', f).onclick = () => { const p = Number(prompt('Quantas pessoas na mesa?', c.pessoas)); if (p > 0) { c.pessoas = p; grava(); } fechar(); };
    $$('[data-m]', f).forEach((x) => { x.onclick = () => { const de = c.mesa; if (transferir(c, Number(x.dataset.m))) { fechar(); toast(`Mesa ${de} foi para a ${x.dataset.m}`); ir(`mesa/${x.dataset.m}`); } }; });
  } });
});

// ------------------------------------------------------------------ seletor de itens (cardápio do garçom)
export function abrirSeletor(c, aoTerminar) {
  let cat = db.categorias[0].id, busca = '';
  const lista = () => db.produtos.filter((p) => (busca ? p.nome.toLowerCase().includes(busca.toLowerCase()) : p.cat === cat));
  const grade = () => lista().map((p) => `<button type="button" class="prod ${p.ativo ? '' : 'esgotado'}" data-p="${p.id}" ${p.ativo ? '' : 'disabled'}>
      ${p.foto ? `<img src="${t(p.foto)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span><b>${t(p.nome)}</b><em>${p.ativo ? (p.tamanhos?.length ? `a partir de ${din(aPartir(p))}` : din(p.preco) + (p.porKg ? '/kg' : '')) : 'Esgotado'}</em></span></button>`).join('');
  const contagem = () => { const n = c.itens.filter((i) => i.status === 'rascunho').reduce((s, i) => s + i.qtd, 0); return n ? `Pronto · ${n} a enviar` : 'Pronto'; };
  folha({ titulo: c.tipo === 'mesa' ? `Itens · mesa ${c.mesa}` : `Itens · pedido #${c.num}`, larga: true,
    corpo: `<label class="busca">${ico('busca')}<input type="search" data-busca placeholder="Buscar no cardápio" aria-label="Buscar no cardápio"></label>
      <div class="chips" role="tablist">${db.categorias.map((k) => `<button type="button" class="chip ${k.id === cat ? 'on' : ''}" data-cat="${k.id}">${t(k.nome)}</button>`).join('')}</div>
      <div class="grade-prod" data-grade>${grade()}</div>`,
    pe: `<button type="button" class="bt cheio grande" data-fechar data-pronto>${contagem()}</button>`,
    aoFechar: aoTerminar,
    aoAbrir: (f) => {
      const redesenha = () => { $('[data-grade]', f).innerHTML = grade(); $('[data-pronto]', f).textContent = contagem(); };
      $('[data-busca]', f).oninput = (e) => { busca = e.target.value; redesenha(); };
      $$('[data-cat]', f).forEach((b) => { b.onclick = () => { cat = b.dataset.cat; busca = ''; $('[data-busca]', f).value = ''; $$('[data-cat]', f).forEach((x) => x.classList.toggle('on', x === b)); redesenha(); }; });
      $('[data-grade]', f).addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b) detalheItem(c, prod(b.dataset.p), () => redesenha()); });
    } });
}
function detalheItem(c, p, depois) {
  if (p.porKg) return pesarItem(c, p, depois);
  const op = formOpcoes(p, { produtos: db.produtos, din, t, obsRapidas: OBS_RAPIDAS });
  folha({ titulo: p.nome, corpo: `${p.desc ? `<p class="mudo">${t(p.desc)}</p>` : ''}${op.html}`,
  pe: `<button type="button" class="bt cheio grande" data-add>Adicionar · ${din(p.preco)}</button>`,
  aoAbrir: (f, fechar) => {
    const bt = $('[data-add]', f);
    op.ligar(f, () => { const fl = op.falta(); bt.textContent = fl || `Adicionar · ${din(op.unit() * op.s.qtd)}`; bt.classList.toggle('pendente', !!fl); });
    bt.onclick = () => {
      const fl = op.falta(); if (fl) { toast(fl); f.querySelector('.op-grupo [type=radio]:not(:checked), .op-grupo [type=checkbox]')?.closest('.op-grupo')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      const it = op.item(f); adicionarItem(c, it);
      fechar(); toast(`${it.qtd}× ${p.nome} na comanda`); depois?.();
    };
  } });
}

// prato por quilo: digita o peso da balança (em gramas) e o valor aparece na hora
export function pesarItem(c, p, depois) {
  folha({ titulo: p.nome, corpo: `<p class="mudo">${din(p.preco)} o quilo. Digite o peso que a balança mostrou${db.config.tara ? `; o prato vazio (${db.config.tara} g) já é descontado` : ''}.</p>
    <label class="campo peso"><span>Peso que a balança mostrou (gramas)</span><input data-g inputmode="numeric" placeholder="Ex.: 452" autocomplete="off"></label>
    <div class="chips quebra">${[300, 400, 500, 600].map((g) => `<button type="button" class="chip" data-gr="${g}">${g} g</button>`).join('')}</div>
    <p class="peso-valor" data-v>R$ 0,00</p><p class="peso-conta" data-conta>Aceita de 20 g a 5 kg</p>`,
  pe: '<button type="button" class="bt cheio grande" data-add disabled>Adicionar</button>',
  aoAbrir: (f, fechar) => {
    const g = $('[data-g]', f); const tara = Number(db.config.tara || 0); const kg = () => Math.max(0, (Number(String(g.value).replace(/\D/g, '')) - tara) / 1000);
    const atual = () => { const k = kg(), bruto = Number(String(g.value).replace(/\D/g, '')) || 0; $('[data-v]', f).textContent = k ? `${din(p.preco * k)}` : 'R$ 0,00'; $('[data-conta]', f).textContent = bruto ? (tara ? `${bruto} g na balança − ${tara} g do prato = ${Math.max(0, bruto - tara)} g` : `${bruto} g`) + ` × ${din(p.preco)}/kg` : 'Aceita de 20 g a 5 kg'; $('[data-add]', f).disabled = !(k > 0.02 && k < 5); };
    g.oninput = atual; $$('[data-gr]', f).forEach((b) => { b.onclick = () => { g.value = b.dataset.gr; atual(); g.focus(); }; });
    $('[data-add]', f).onclick = () => { const k = kg(); if (!(k > 0.02 && k < 5)) return toast('Confira o peso: entre 20 g e 5 kg'); adicionarItem(c, { prodId: p.id, kg: k }); fechar(); toast(`${p.nome}: ${din(p.preco * k)}`); depois?.(); };
    setTimeout(() => g.focus(), 80);
  } });
}

// ------------------------------------------------------------------ planta do salão (visão opcional, tablet e caixa)
acao('planta', () => {
  const n = db.config.mesas;
  const mesas = Array.from({ length: n }, (_, k) => { const m = k + 1, e = estadoMesa(m), c = comandaDaMesa(m);
    return `<a class="mesa-planta ${e} ${m % 3 === 2 ? 'quadrada' : ''}" href="#mesa/${m}" data-fechar><b>${m}</b><small>${c ? dinCurto(conta(c).total) : 'livre'}</small></a>`; }).join('');
  folha({ titulo: 'Planta do salão', larga: true, corpo: `<div class="planta">${mesas}</div><p class="mudo" style="margin-top:10px">A posição das mesas pode ser ajustada em Mais › Ajustes (na conta real).</p>` });
});
