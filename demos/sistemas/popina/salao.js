// Popina · salão do garçom: a fila do que fazer agora (conceito C escolhido pelo dono) + as mesas, e a comanda da mesa.
import { db, t, din, dinCurto, tempo, minutos, prod, comanda, comandaDaMesa, fila, estadoMesa, conta, valorItem, abrirMesa, adicionarItem, enviar,
  mudarStatus, cancelarItem, atenderChamado, confirmarQR, recusarQR, transferir, grava, itensValidos, lojaCfg,
  temCouvert, juntarMesas, transferirItens, marcar, quemAgora, temPin, vendaDeHoje, tem, ondeComanda, couvertLigado, abrirCartao, cartaoAberto, proximoCartao, proximaEtapa, restaVitrine } from './loja.js?v=20';
import { registrar, acao, ir } from './nucleo.js?v=20';
import { ico, folha, toast, confirma, autorizar, $, $$ } from './ui.js?v=20';
import { OBS_RAPIDAS } from './dados.js?v=20';
import { formOpcoes, aPartir, nomeItem, precoTam, rotAdic } from './opcoes.js?v=20';
import { modulosAtivos } from './perfis.js?v=20';
import { TIPOS_RODIZIO, valorRodizio, pessoasRodizio, inclusoRodizio, cabeNaRodada, precoAgora, precoFracoes, ETAPAS, ordemEtapa, ALERGENOS, ymd } from './precos.js?v=20';

// a tela do salão segue o conceito do GPT aprovado pelo dono (relatorios/popina/conceitos-gpt/1-salao-pc.png)
const ROTULO = { conta: 'Levar a conta', chamou: 'Mesa chamou', pronto: 'Prato pronto', qr: 'Pedido pelo QR' };
const COR = { conta: 'ouro', chamou: 'terra', pronto: 'oliva', qr: 'amarelo' };
const nItens = (l) => { const n = l.reduce((s, i) => s + (i.qtd || 1), 0); return `${n} ${n === 1 ? 'item' : 'itens'}`; };
const onde = (c) => ondeComanda(c);

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
      // cartão verde e vermelho (churrascaria): a bolinha mostra o que a mesa sinalizou
      const cr = c && tem('cartaoRodizio') ? `<i class="mesa-cartao ${c.cartaoVerde ? 'verde' : 'vermelho'}" title="${c.cartaoVerde ? 'Cartão verde: quer mais' : 'Cartão vermelho: pausa'}"></i>` : '';
      return `<a class="mesa ${e}" href="#mesa/${m}" aria-label="Mesa ${m}, ${({ livre: 'livre', ocupada: 'ocupada', pronto: 'com prato pronto', conta: 'pediu a conta', chamou: 'chamou o garçom', qr: 'pedido pelo QR esperando' })[e]}${cr ? (c.cartaoVerde ? ', cartão verde' : ', cartão vermelho') : ''}">${ICO[e] ? `<i class="mesa-sinal">${ico(ICO[e])}</i>` : ''}${cr}<b>${m}</b>${c ? `<small>${tempo(c.aberta)}</small>` : ''}</a>`;
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
          ${barraFuncoes()}
          <div class="legenda"><span><i class="ocupada"></i>Ocupada (${contaE('ocupada')})</span><span><i class="pronto"></i>Prato pronto (${contaE('pronto', 'qr')})</span><span><i class="conta"></i>Conta (${contaE('conta')})</span><span><i class="chamou"></i>Chamada (${contaE('chamou')})</span><span><i class="livre"></i>Livre (${contaE('livre')})</span></div>
          ${areas.map((a, k) => { const lst = a.lista || Array.from({ length: a.ate - a.de + 1 }, (_, j) => a.de + j), o = ocup(lst); return `<section class="area"><div class="area-cab"><h2 class="fita ${k % 2 ? 'verde' : ''}">${t(a.nome)}</h2><span>${lst.length} ${lst.length === 1 ? 'mesa' : 'mesas'} • ${o} ${o === 1 ? 'ocupada' : 'ocupadas'}</span></div><div class="mesas">${lst.map(tile).join('')}</div></section>`; }).join('')}
          ${cartoesAbertos()}
        </div>
      </div>`;
  },
});

// atalhos das funções da casa no salão (só as ligadas): reservas e fila, passador, cartões, portaria, eventos
function barraFuncoes() {
  const hoje = ymd(), res = (db.reservas || []).filter((r) => r.data === hoje && ['pendente', 'confirmada'].includes(r.status)).length, fila = (db.fila || []).length;
  const verdes = db.comandas.filter((c) => c.tipo === 'mesa' && c.cartaoVerde).length;
  const l = [
    tem('reservas') && `<a class="bt" href="#mais/reservas">${ico('calendario')}Reservas${res ? ` (${res})` : ''}${fila ? ` · fila ${fila}` : ''}</a>`,
    tem('cartaoRodizio') && `<a class="bt" href="#passador">${ico('cloche')}Passador${verdes ? ` (${verdes})` : ''}</a>`,
    tem('comandaIndividual') && `<button type="button" class="bt" data-acao="abrir-cartao">${ico('cartao')}Abrir cartão</button>`,
    tem('portaria') && `<a class="bt" href="#portaria">${ico('pessoas')}Portaria</a>`,
    tem('eventos') && `<a class="bt" href="#mais/eventos">${ico('coroa')}Eventos</a>`,
  ].filter(Boolean);
  return l.length ? `<div class="linha-bts salao-funcoes">${l.join('')}</div>` : '';
}
// comandas individuais abertas (cartão numerado), fora ou dentro das mesas
function cartoesAbertos() {
  if (!tem('comandaIndividual') && !tem('portaria')) return '';
  const l = db.comandas.filter((c) => c.tipo === 'cartao').sort((a, b) => a.cartao - b.cartao);
  if (!l.length) return '';
  return `<section class="area"><div class="area-cab"><h2 class="fita">Cartões</h2><span>${l.length} ${l.length === 1 ? 'aberto' : 'abertos'}</span></div>
    <div class="cartoes-abertos">${l.map((c) => `<a class="cartao-ind ${c.pediuConta ? 'conta' : ''}" href="#cartao/${c.cartao}"><b>${c.cartao}</b><small>${t(c.nome || (c.naMesa ? `mesa ${c.naMesa}` : ''))}</small><em>${dinCurto(conta(c).total)}</em></a>`).join('')}</div></section>`;
}
// abre um cartão numerado (o próximo livre já vem sugerido); naMesa liga o cartão a uma mesa
function pedirCartao(naMesa = 0) {
  folha({ titulo: naMesa ? `Cartão na mesa ${naMesa}` : 'Abrir cartão', corpo: `<p class="mudo">Cada pessoa com a própria comanda. O número é o do cartão que ela recebeu.</p>
    <div class="duas-c"><label class="campo"><span>Número do cartão</span><input data-n inputmode="numeric" value="${proximoCartao()}"></label><label class="campo"><span>Nome (opcional)</span><input data-nome maxlength="40"></label></div>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Abrir cartão</button>',
  aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => {
    const n = Math.round(Number($('[data-n]', f).value)); if (!(n > 0)) return toast('Escreva o número do cartão');
    if (cartaoAberto(n)) { fechar(); toast(`O cartão ${n} já está aberto`); return ir(`cartao/${n}`); }
    abrirCartao(n, { nome: $('[data-nome]', f).value.trim(), ...(naMesa ? { naMesa } : {}), garcom: garcomEscolhido() }); fechar(); ir(`cartao/${n}`);
  }; } });
}
acao('abrir-cartao', (b) => pedirCartao(Number(b.dataset.mesa) || 0));
acao('atender', (b) => { const x = db.chamados.find((y) => y.id === b.dataset.id); if (x) { atenderChamado(x); toast(`Mesa ${x.mesa} atendida`); } });
acao('levei', (b) => { const c = comanda(b.dataset.id); if (!c) return; c.itens.filter((i) => i.status === 'pronto').forEach((i) => mudarStatus(c, i, 'entregue')); toast('Marcado como entregue'); });
acao('abrir-conta', (b) => { const c = comanda(b.dataset.id); if (c) ir(`caixa/${c.id}`); });
acao('ver-qr', (b) => {
  const q = db.pedidosQR.find((x) => x.id === b.dataset.id); if (!q) return;
  // mostra o item como vai para a comanda: meia a meia, adicionais e observação
  const itens = q.itens.map((i) => { const p = prod(i.prod), b = i.meia && prod(i.meia.b), ad = i.adic || [];
    if (!p) return '';
    const nome = nomeItem(p, { tam: i.tam, meia: i.meia, sabores: i.sabores }, b, db.produtos), sab = (i.sabores || []).map(prod).filter(Boolean);
    const c0 = comandaDaMesa(q.mesa), L = lojaCfg(), inc = c0?.rodizio && tem('rodizio') && inclusoRodizio(L.rodizio, p.id);
    const preco = (inc ? 0 : sab.length > 1 ? precoFracoes(sab.map((x) => precoTam(x, i.tam)), tem('meiaMeia') ? L.fracoes?.regra : 'caro') : b ? Math.max(precoTam(p, i.tam), precoTam(b, i.tam)) : precoAgora(p, precoTam(p, i.tam), { loja: L, mods: modulosAtivos(L), tam: i.tam }).preco) + ad.reduce((s, a) => s + a.preco, 0);
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
    <div class="linha-bts"><a class="bt" href="#pedidos/novo/balcao" data-fechar>${ico('sacola')}Balcão</a>${tem('delivery') ? `<a class="bt" href="#pedidos/novo/delivery" data-fechar>${ico('moto')}Delivery</a>` : ''}${tem('comandaIndividual') ? `<button type="button" class="bt" data-cartao>${ico('cartao')}Cartão</button>` : ''}</div>`,
  aoAbrir: (f, fechar) => { $$('[data-m]', f).forEach((b) => { b.onclick = () => { fechar(); ir(`mesa/${b.dataset.m}`); }; }); $('[data-cartao]', f)?.addEventListener('click', () => { fechar(); pedirCartao(); }); } });
});

// ------------------------------------------------------------------ comanda da mesa
const STATUS = { rascunho: ['A enviar', 'rasc'], novo: ['Na cozinha', 'novo'], preparo: ['Na cozinha', 'prep'], pronto: ['Pronto', 'pronto'], entregue: ['Entregue', 'ok'] };
const NOME_ETAPA = Object.fromEntries(ETAPAS);
export function linhaItem(c, i, editavel = true) {
  let [rot, cls] = STATUS[i.status] || ['', ''];
  if (i.status === 'rascunho' && i.segura) [rot, cls] = [`Espera: ${NOME_ETAPA[i.etapa] || 'etapa'}`, 'rasc'];
  if (i.vitrine && i.status === 'entregue') rot = 'Da vitrine';
  const extras = [...(i.combo || []).map((x) => `${t(x.grupo)}: ${t(x.nome)}`), ...(i.adic || []).map(rotAdic), i.obs ? t(i.obs) : ""].filter(Boolean).join(" · ");
  // marcas das funções da casa: rodízio (preço zero), happy hour e prato do dia, etapa do prato
  const marcas = [i.rodizio ? '<em class="marca-item rod">Rodízio</em>' : '', i.promo ? `<em class="marca-item promo">${t(i.promo)}</em>` : '', i.etapa ? `<em class="marca-item etapa">${t(NOME_ETAPA[i.etapa] || i.etapa)}</em>` : ''].join('');
  return `<li class="item ${i.cancelado ? 'cancelado' : ''}"><div class="item-q">${i.qtd}×</div><div class="item-txt"><b>${t(i.nome)}</b>${marcas}${extras ? `<small>${extras}</small>` : ''}${i.cancelado ? `<small class="erro">Cancelado${i.cancelado.motivo ? ': ' + t(i.cancelado.motivo) : ''}</small>` : ''}</div>
    <div class="item-dir"><span>${din(valorItem(i))}</span>${i.cancelado ? '' : `<em class="st ${cls}">${rot}</em>`}</div>
    ${editavel && !i.cancelado && i.status !== 'entregue' ? `<button type="button" class="bt-ico" data-acao="item-menu" data-c="${c.id}" data-i="${i.id}" aria-label="Opções de ${t(i.nome)}">${ico('mais')}</button>` : ''}</li>`;
}
// linhas de totais da comanda (consumo, rodízio, evento, portaria, serviço, couvert, desconto)
export function linhasTotais(c, v = conta(c)) {
  const L = lojaCfg(), R = L.rodizio || {};
  const rod = c.rodizio ? TIPOS_RODIZIO.filter(([k]) => c.rodizio[k]).map(([k, n]) => `${c.rodizio[k]} ${n.split(' ')[0].toLowerCase()}${c.rodizio[k] > 1 && k !== 'meia' ? (k === 'crianca' ? 's' : 's') : ''} × ${dinCurto(R[k] || 0)}`).join(' + ') : '';
  return `<div><span>Consumo</span><b>${din(v.sub)}</b></div>
    ${v.rodizio ? `<div><span>Rodízio (${rod})</span><b>${din(v.rodizio)}</b></div>` : ''}
    ${v.pacote ? `<div><span>Pacote do evento (${v.presentes} convidados)</span><b>${din(v.pacote)}</b></div>` : ''}
    ${v.ingresso ? `<div><span>Entrada${c.ingresso?.nome ? ` · ${t(c.ingresso.nome)}` : ''}</span><b>${din(v.ingresso)}</b></div>` : ''}
    ${c.consumacao ? `<div><span>Consumação mínima ${dinCurto(c.consumacao)}${v.consumacao ? ' · falta consumir' : ' · atingida'}</span><b>${v.consumacao ? din(v.consumacao) : ''}</b></div>` : ''}
    ${v.servico ? `<div><span>Serviço ${db.config.servico}%</span><b>${din(v.servico)}</b></div>` : ''}${v.couvert ? `<div><span>${c.evento ? 'Couvert artístico' : `Couvert (${c.pessoas} × ${din(lojaCfg().couvert)})`}</span><b>${din(v.couvert)}</b></div>` : ''}${v.desconto ? `<div><span>Desconto</span><b>− ${din(v.desconto)}</b></div>` : ''}<div class="total"><span>Total</span><b>${din(v.total)}</b></div>`;
}
// a comanda aberta (mesa ou cartão individual): o que enviar, o que já foi, os totais e as ações
function telaComanda(c, titulo, voltar) {
  const v = conta(c), rasc = c.itens.filter((i) => i.status === 'rascunho'), livres = rasc.filter((i) => !i.segura);
  const enviados = c.itens.filter((i) => i.status !== 'rascunho'), prox = proximaEtapa(c);
  const cartoes = c.tipo === 'mesa' && tem('comandaIndividual') ? db.comandas.filter((x) => x.tipo === 'cartao' && x.naMesa === c.mesa) : [];
  const lt = (s) => `<img src="img/c-louro-esq.webp?v=1" alt="" width="30" height="31">${s}<img src="img/c-louro-dir.webp?v=1" alt="" width="30" height="31">`;
  const sub = c.tipo === 'mesa' ? `${c.pessoas} pessoas${c.rodizio ? ' no rodízio' : ''}` : t(c.nome || (c.naMesa ? `na mesa ${c.naMesa}` : 'comanda individual'));
  return `<header class="cab-tela cab-comanda"><a class="bt-ico" href="#${voltar}" aria-label="Voltar">${ico('voltar')}</a><div><h1 class="fita-mesa">${lt(t(titulo))}</h1><p>${sub} · aberta há ${tempo(c.aberta)}${c.garcom ? ` · ${t(c.garcom)}` : ''}</p></div>
        <button type="button" class="bt-ico" data-acao="mesa-menu" data-c="${c.id}" aria-label="Mais opções">${ico('mais')}</button></header><div class="comanda-papel">
      ${c.pediuConta ? `<div class="aviso ouro">${ico('conta')}Pediu a conta há ${tempo(c.pediuConta)}</div>` : ''}
      ${c.tipo === 'mesa' && tem('cartaoRodizio') ? `<div class="cartao-rod-mesa"><span>Cartão da mesa</span><button type="button" class="cartao-rod ${c.cartaoVerde ? 'verde' : 'vermelho'}" data-acao="cartao-rod" data-c="${c.id}" aria-pressed="${!!c.cartaoVerde}">${c.cartaoVerde ? 'Verde: quer mais' : 'Vermelho: pausa'}</button>${c.passou ? `<small>Último passe há ${tempo(c.passou)}</small>` : ''}</div>` : ''}
      ${rasc.length ? `<section class="bloco"><div class="sec-tit"><h2>${lt('A enviar')}</h2><span>${rasc.length} ${rasc.length === 1 ? 'item' : 'itens'}</span></div><ul class="itens">${rasc.map((i) => linhaItem(c, i)).join('')}</ul></section>` : ''}
      <section class="bloco"><div class="sec-tit"><h2>${lt('Já pedido')}</h2><span>${enviados.length ? '' : 'nada ainda'}</span></div><ul class="itens">${enviados.map((i) => linhaItem(c, i)).join('')}</ul></section>
      ${c.tipo === 'mesa' && tem('comandaIndividual') ? `<section class="bloco"><div class="sec-tit"><h2>${lt('Cartões nesta mesa')}</h2><span>cada pessoa paga o seu</span></div>
        <div class="cartoes-abertos">${cartoes.map((x) => `<a class="cartao-ind" href="#cartao/${x.cartao}"><b>${x.cartao}</b><small>${t(x.nome || '')}</small><em>${dinCurto(conta(x).total)}</em></a>`).join('')}<button type="button" class="cartao-ind novo" data-acao="abrir-cartao" data-mesa="${c.mesa}"><b>+</b><small>Abrir cartão</small></button></div></section>` : ''}
      <section class="totais">${linhasTotais(c, v)}</section></div>
      <div class="barra-acoes">
        <button type="button" class="bt" data-acao="cardapio-pick" data-c="${c.id}">${ico('mais2')}Itens</button>
        ${livres.length ? `<button type="button" class="bt cheio grande" data-acao="enviar" data-c="${c.id}">${ico('chef')}Enviar para a cozinha (${livres.reduce((s, i) => s + i.qtd, 0)})</button>`
          : prox >= 0 ? `<button type="button" class="bt cheio grande" data-acao="liberar-etapa" data-c="${c.id}">${ico('chef')}Liberar próxima etapa: ${ETAPAS[prox][1]}</button>`
            : `<button type="button" class="bt cheio grande" data-acao="pre-conta" data-c="${c.id}">${ico('conta')}Conta · ${dinCurto(v.total)}</button>`}
      </div>`;
}
registrar('mesa', {
  titulo: 'Comanda', aba: 'salao',
  html(n) {
    n = Number(n); const c = comandaDaMesa(n);
    if (!c) {
      const gs = db.config.garcons || [], g = garcomEscolhido();
      const fechadas = db.vendas.filter((v) => v.tipo === 'mesa' && v.mesa === n && !v.cancelado && vendaDeHoje(v)).sort((a, b) => b.ts - a.ts);
      const res = tem('reservas') ? (db.reservas || []).filter((r) => r.data === ymd() && Number(r.mesa) === n && ['pendente', 'confirmada'].includes(r.status)) : [];
      const R = lojaCfg().rodizio || {};
      return `<header class="cab-tela"><a class="bt-ico" href="#salao" aria-label="Voltar">${ico('voltar')}</a><div><h1>Mesa ${n}</h1><p>Livre</p></div></header>
      ${res.map((r) => `<p class="aviso ouro">${ico('calendario')}Reservada às ${t(r.hora)} para ${t(r.nome)} (${r.pessoas} pessoas)</p>`).join('')}
      <div class="abrir-mesa">${gs.length ? `<p>Garçom</p><div class="pessoas" style="margin-bottom:16px">${gs.map((x) => `<button type="button" class="chip ${x === g ? 'on' : ''}" data-acao="escolher-garcom" data-g="${t(x)}" aria-pressed="${x === g}">${t(x)}</button>`).join('')}</div>` : ''}
        ${tem('rodizio') ? `<div class="rodizio-abrir" data-rodizio="${n}"><p>Rodízio: quantas pessoas de cada?</p>
          ${TIPOS_RODIZIO.filter(([k]) => k !== 'meia' || Number(R.meia) > 0).map(([k, nome]) => `<div class="rod-linha"><span><b>${nome}</b><small>${din(R[k] || 0)} por pessoa</small></span><div class="qtd"><button type="button" class="bt-ico" data-rmenos="${k}" aria-label="Menos ${nome}">−</button><b data-rq="${k}">${k === 'adulto' ? 2 : 0}</b><button type="button" class="bt-ico" data-rmais="${k}" aria-label="Mais ${nome}">+</button></div></div>`).join('')}
          <p class="rod-total" data-rtotal></p>
          <div class="linha-bts"><button type="button" class="bt cheio grande" data-acao="abrir-rodizio" data-n="${n}">Abrir no rodízio</button></div>
          <p class="mudo" style="margin-top:14px">Ou sem rodízio (à la carte): quantas pessoas?</p></div>` : '<p>Quantas pessoas?</p>'}
        <div class="pessoas">${[1, 2, 3, 4, 5, 6, 8, 10].map((p) => `<button type="button" class="chip" data-acao="abrir-mesa" data-n="${n}" data-p="${p}">${p}</button>`).join('')}</div></div>
      ${fechadas.length ? `<section class="bloco"><div class="sec-tit"><h2>Fechadas hoje nesta mesa</h2></div><div class="lista-bts">${fechadas.slice(0, 3).map((v) => `<button type="button" class="bt" data-acao="ver-venda" data-v="${t(v.id)}">${ico('relogio')}${new Date(v.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${din(v.total)}${v.garcom ? ` · ${t(v.garcom)}` : ''}</button>`).join('')}</div></section>` : ''}`;
    }
    return telaComanda(c, `Mesa ${n}`, 'salao');
  },
  montar(el) {
    // rodízio: + e − por tipo de pessoa, com o total por pessoa na hora
    const box = $('[data-rodizio]', el); if (!box) return;
    const R = lojaCfg().rodizio || {}, q = { adulto: 2, crianca: 0, meia: 0 };
    const atual = () => { Object.keys(q).forEach((k) => { const e = $(`[data-rq="${k}"]`, box); if (e) e.textContent = q[k]; }); $('[data-rtotal]', box).textContent = `${pessoasRodizio(q)} pessoas · ${din(valorRodizio(R, q))}`; box.dataset.q = JSON.stringify(q); };
    $$('[data-rmais]', box).forEach((b) => { b.onclick = () => { q[b.dataset.rmais]++; atual(); }; });
    $$('[data-rmenos]', box).forEach((b) => { b.onclick = () => { q[b.dataset.rmenos] = Math.max(0, q[b.dataset.rmenos] - 1); atual(); }; });
    atual();
  },
});
// comanda individual (cartão numerado): mesma tela da mesa, fechada à parte no caixa
registrar('cartao', {
  titulo: 'Cartão', aba: 'salao',
  html(n) {
    const c = cartaoAberto(n);
    if (!c) return `<header class="cab-tela"><a class="bt-ico" href="#salao" aria-label="Voltar">${ico('voltar')}</a><div><h1>Cartão ${t(n)}</h1><p>Fechado</p></div></header>
      <div class="vazio">Este cartão não está aberto.${tem('comandaIndividual') ? ` <button type="button" class="link" data-acao="abrir-cartao">Abrir um cartão</button>` : ''}</div>`;
    return telaComanda(c, `Cartão ${c.cartao}`, c.naMesa ? `mesa/${c.naMesa}` : 'salao');
  },
});
// passador (churrascaria): só as mesas com o cartão verde, da que espera há mais tempo para a mais recente
registrar('passador', {
  titulo: 'Passador', aba: 'salao',
  html() {
    const ocup = db.comandas.filter((c) => c.tipo === 'mesa').sort((a, b) => a.mesa - b.mesa);
    const desde = (c) => c.passou || c.aberta, verdes = ocup.filter((c) => c.cartaoVerde).sort((a, b) => desde(a) - desde(b));
    return `<header class="cab-tela"><a class="bt-ico" href="#salao" aria-label="Voltar">${ico('voltar')}</a><div><h1>Passador</h1><p>${verdes.length} ${verdes.length === 1 ? 'mesa quer' : 'mesas querem'} mais · a que espera há mais tempo vem primeiro</p></div></header>
      ${tem('cartaoRodizio') ? '' : '<p class="aviso ouro">O cartão verde e vermelho está desligado. Ligue em Gestão › Aparência e templates.</p>'}
      <ul class="passador">${verdes.map((c) => `<li><b>Mesa ${c.mesa}</b><span>${c.pessoas} pessoas · sem passar há <strong>${tempo(desde(c))}</strong></span><button type="button" class="bt cheio grande" data-acao="passei" data-c="${c.id}">${ico('check')}Passei</button></li>`).join('') || '<li class="vazio">Nenhuma mesa com o cartão verde agora.</li>'}</ul>
      <div class="sec-tit"><h2>Todas as mesas</h2><span>toque para virar o cartão</span></div>
      <div class="cartoes-abertos">${ocup.map((c) => `<button type="button" class="cartao-ind ${c.cartaoVerde ? 'verde' : 'vermelho'}" data-acao="cartao-rod" data-c="${c.id}" aria-pressed="${!!c.cartaoVerde}"><b>${c.mesa}</b><small>${c.cartaoVerde ? 'verde' : 'vermelho'}</small></button>`).join('') || '<div class="vazio">Nenhuma mesa ocupada.</div>'}</div>`;
  },
});
acao('cartao-rod', (b) => { const c = comanda(b.dataset.c); if (!c) return; c.cartaoVerde = !c.cartaoVerde; if (c.cartaoVerde && !c.passou) c.passou = Date.now(); marcar(c, 'cartao', c.cartaoVerde ? 'Virou o cartão para o verde' : 'Virou o cartão para o vermelho'); grava(); });
acao('passei', (b) => { const c = comanda(b.dataset.c); if (!c) return; c.passou = Date.now(); grava(); toast(`Mesa ${c.mesa}: passe registrado`); });
// garçom de quem abre a mesa: o último escolhido neste aparelho (ou o primeiro da lista)
function garcomEscolhido() {
  const gs = db.config.garcons || []; let g = ''; try { g = localStorage.getItem('popina-garcom') || ''; } catch { /* sem acesso */ }
  return gs.includes(g) ? g : gs[0] || '';
}
acao('escolher-garcom', (b) => {
  try { localStorage.setItem('popina-garcom', b.dataset.g); } catch { /* sem acesso */ }
  $$('[data-acao="escolher-garcom"]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
});
acao('abrir-mesa', (b) => { const c = abrirMesa(Number(b.dataset.n), Number(b.dataset.p), garcomEscolhido()); abrirSeletor(c); });
acao('abrir-rodizio', (b) => {
  let q = {}; try { q = JSON.parse(b.closest('[data-rodizio]').dataset.q || '{}'); } catch { /* nada */ }
  const n = pessoasRodizio(q); if (!n) return toast('Escolha quantas pessoas');
  const c = abrirMesa(Number(b.dataset.n), n, garcomEscolhido(), Object.fromEntries(Object.entries(q).filter(([, x]) => x > 0))); abrirSeletor(c);
});
const avisoEnvio = (c, n) => { const esp = c.itens.filter((i) => i.status === 'rascunho' && i.segura).length; toast(`${n} ${n === 1 ? 'item enviado' : 'itens enviados'} para a cozinha e o bar${esp ? `. ${esp} ${esp === 1 ? 'espera' : 'esperam'} a próxima etapa` : ''}`); };
acao('enviar', (b) => { const c = comanda(b.dataset.c); const n = enviar(c); avisoEnvio(c, n); });
acao('liberar-etapa', (b) => { const c = comanda(b.dataset.c); if (!c) return; const e = proximaEtapa(c); const n = enviar(c, true); if (n) { marcar(c, 'etapa', `Liberou a etapa: ${ETAPAS[e]?.[1] || ''}`); grava(); } avisoEnvio(c, n); });
acao('pre-conta', (b) => { const c = comanda(b.dataset.c); if (c) ir(`caixa/${c.id}`); });
acao('cardapio-pick', (b) => abrirSeletor(comanda(b.dataset.c)));
acao('item-menu', (b) => {
  const c = comanda(b.dataset.c), i = c?.itens.find((x) => x.id === b.dataset.i); if (!i) return;
  folha({ titulo: i.nome, corpo: `<div class="lista-bts">
      ${i.status === 'pronto' ? `<button type="button" class="bt" data-st="entregue">${ico('check')}Entreguei na mesa</button>` : ''}
      ${i.status === 'rascunho' ? `<button type="button" class="bt" data-mais>Mais um (${i.qtd + 1})</button>` : ''}
      <button type="button" class="bt perigo" data-cancela>${ico('lixo')}${i.status === 'rascunho' ? 'Tirar da comanda' : 'Cancelar item'}</button></div>`,
  aoAbrir: (f, fechar) => {
    $('[data-st]', f)?.addEventListener('click', () => { mudarStatus(c, i, 'entregue'); fechar(); });
    $('[data-mais]', f)?.addEventListener('click', () => { i.qtd++; grava(); fechar(); });
    $('[data-cancela]', f).onclick = async () => {
      fechar();
      if (i.status === 'rascunho') { cancelarItem(c, i); return toast('Tirado'); }
      // já foi para a cozinha: motivo sempre, PIN do gerente quando configurado
      const r = await autorizar({ titulo: `Cancelar ${i.qtd}× ${i.nome}`, texto: 'O item já foi para a cozinha. O cancelamento fica registrado no relatório.', motivos: MOTIVOS_CANCELA, pedirPin: temPin(), sim: 'Cancelar item', perigo: true });
      if (!r) return;
      cancelarItem(c, i, r.motivo, quemAgora(c, r.pin)); toast('Item cancelado e registrado');
    };
  } });
});
export const MOTIVOS_CANCELA = ['Cliente desistiu', 'Saiu errado', 'Demorou demais', 'Lançado errado'];

// linha do tempo da mesa; mesas antigas (sem histórico) mostram o que dá para saber pelos itens
function linhaTempo(c) {
  const h = [...(c.hist || [])];
  if (!h.some((x) => x.tipo === 'abriu')) h.push({ t: c.aberta, tipo: 'abriu', txt: `Mesa aberta com ${c.pessoas} ${c.pessoas === 1 ? 'pessoa' : 'pessoas'}`, quem: c.garcom || '' });
  if (!h.some((x) => x.tipo === 'enviou')) {
    const env = {}; c.itens.filter((i) => i.enviado).forEach((i) => { env[i.enviado] = (env[i.enviado] || 0) + i.qtd; });
    Object.entries(env).forEach(([ts, n]) => h.push({ t: Number(ts), tipo: 'enviou', txt: `Enviou ${n} ${n === 1 ? 'item' : 'itens'} para a cozinha e o bar`, quem: c.garcom || '' }));
  }
  const hora = (ts) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `<ol class="linha-tempo">${h.sort((a, b) => a.t - b.t).map((x) => `<li class="lt-${t(x.tipo)}"><time>${hora(x.t)}</time><div><b>${t(x.txt)}</b>${x.quem ? `<small>${t(x.quem)}</small>` : ''}</div></li>`).join('')}</ol>`;
}
acao('mesa-menu', (b) => {
  const c = comanda(b.dataset.c); if (!c) return;
  const todas = Array.from({ length: db.config.mesas }, (_, k) => k + 1);
  const livres = todas.filter((m) => !comandaDaMesa(m)), outras = db.comandas.filter((x) => x.tipo === 'mesa' && x !== c).sort((x, y) => x.mesa - y.mesa);
  const cv = couvertLigado() ? Number(lojaCfg().couvert) || 0 : 0, ehMesa = c.tipo === 'mesa';
  folha({ titulo: ondeComanda(c), corpo: `<div class="lista-bts">
      <button type="button" class="bt" data-servico>${c.servico ? 'Tirar' : 'Cobrar'} os ${db.config.servico}% de serviço</button>
      ${cv ? `<button type="button" class="bt" data-couvert>${temCouvert(c) ? 'Tirar' : 'Cobrar'} o couvert (${din(cv)} por pessoa)</button>` : ''}
      ${ehMesa && c.rodizio && tem('rodizio') ? `<button type="button" class="bt" data-rodizio>${ico('pessoas')}Pessoas no rodízio (${pessoasRodizio(c.rodizio)})</button>` : ehMesa ? `<button type="button" class="bt" data-pessoas>${ico('pessoas')}Mudar número de pessoas (${c.pessoas})</button>` : ''}
      <button type="button" class="bt" data-garcom>${ico('pessoas')}Garçom: ${t(c.garcom || 'nenhum')} · trocar</button>
      ${ehMesa && outras.length ? `<button type="button" class="bt" data-juntar>${ico('mesa')}Juntar outra mesa nesta</button>` : ''}
      ${ehMesa && itensValidos(c).length ? `<button type="button" class="bt" data-passar>${ico('troca')}Passar itens para outra mesa</button>` : ''}</div>
      ${ehMesa ? `<p class="mudo" style="margin-top:14px">Trocar de mesa</p><div class="grade-mesas">${livres.map((m) => `<button type="button" class="mesa livre" data-m="${m}"><b>${m}</b></button>`).join('')}</div>` : ''}
      <div class="sec-tit"><h2>Histórico</h2></div>${linhaTempo(c)}`,
  aoAbrir: (f, fechar) => {
    $('[data-rodizio]', f)?.addEventListener('click', () => { fechar(); mudarRodizio(c); });
    $('[data-servico]', f).onclick = () => { c.servico = !c.servico; marcar(c, 'servico', c.servico ? 'Voltou a cobrar o serviço' : 'Tirou o serviço'); grava(); fechar(); };
    $('[data-couvert]', f)?.addEventListener('click', () => { c.couvert = !temCouvert(c); marcar(c, 'couvert', c.couvert ? 'Voltou a cobrar o couvert' : 'Tirou o couvert'); grava(); fechar(); });
    $('[data-pessoas]', f)?.addEventListener('click', () => { const p = Number(prompt('Quantas pessoas na mesa?', c.pessoas)); if (p > 0 && p !== c.pessoas) { marcar(c, 'pessoas', `Pessoas: ${c.pessoas} → ${p}`); c.pessoas = p; grava(); } fechar(); });
    $('[data-garcom]', f).onclick = () => { fechar(); trocarGarcom(c); };
    $('[data-juntar]', f)?.addEventListener('click', () => { fechar(); escolherJuntar(c, outras); });
    $('[data-passar]', f)?.addEventListener('click', () => { fechar(); passarItens(c); });
    $$('[data-m]', f).forEach((x) => { x.onclick = () => { const de = c.mesa; if (transferir(c, Number(x.dataset.m))) { fechar(); toast(`Mesa ${de} foi para a ${x.dataset.m}`); ir(`mesa/${x.dataset.m}`); } }; });
  } });
});
function trocarGarcom(c) {
  const gs = db.config.garcons || [];
  if (!gs.length) return toast('Cadastre os garçons em Gestão › Caixa e regras');
  folha({ titulo: `Garçom · ${ondeComanda(c)}`, corpo: `<div class="pessoas">${gs.map((g) => `<button type="button" class="chip ${g === c.garcom ? 'on' : ''}" data-g="${t(g)}">${t(g)}</button>`).join('')}</div>`,
    aoAbrir: (f, fechar) => $$('[data-g]', f).forEach((x) => { x.onclick = () => {
      const g = x.dataset.g; if (g !== c.garcom) { marcar(c, 'garcom', `Garçom: ${c.garcom || 'nenhum'} → ${g}`); c.garcom = g; grava(); toast(`${ondeComanda(c)} agora é do ${g}`); } fechar();
    }; }) });
}
function escolherJuntar(c, outras) {
  folha({ titulo: `Juntar na mesa ${c.mesa}`, corpo: `<p class="mudo">Escolha a mesa que vem para cá. Os itens, as pessoas e o que já foi pago passam para a mesa ${c.mesa}, e a outra fica livre.</p>
    <div class="grade-mesas">${outras.map((x) => `<button type="button" class="mesa ocupada" data-m="${x.mesa}"><b>${x.mesa}</b></button>`).join('')}</div>`,
  aoAbrir: (f, fechar) => $$('[data-m]', f).forEach((x) => { x.onclick = async () => {
    const o = comandaDaMesa(Number(x.dataset.m)); fechar(); if (!o) return;
    if (!(await confirma(`Juntar a mesa ${o.mesa} (${din(conta(o).total)}) na mesa ${c.mesa}?`, 'Juntar'))) return;
    if (juntarMesas(c, o)) { toast(`Mesa ${o.mesa} juntada na ${c.mesa}`); ir(`mesa/${c.mesa}`); }
  }; }) });
}
function passarItens(c) {
  const outras = Array.from({ length: db.config.mesas }, (_, k) => k + 1).filter((m) => m !== c.mesa);
  folha({ titulo: `Passar itens da mesa ${c.mesa}`, corpo: `<p class="mudo">Marque os itens e toque na mesa de destino. Mesa livre abre na hora.</p>
    <ul class="itens marcar">${itensValidos(c).map((i) => `<li><label><input type="checkbox" data-it="${i.id}"><span>${i.qtd}× ${t(i.nome)}</span><b>${din(valorItem(i))}</b></label></li>`).join('')}</ul>
    <p class="mudo" style="margin-top:14px">Para a mesa</p><div class="grade-mesas">${outras.map((m) => `<button type="button" class="mesa ${comandaDaMesa(m) ? 'ocupada' : 'livre'}" data-m="${m}"><b>${m}</b></button>`).join('')}</div>`,
  aoAbrir: (f, fechar) => $$('[data-m]', f).forEach((x) => { x.onclick = () => {
    const ids = $$('[data-it]:checked', f).map((y) => y.dataset.it); if (!ids.length) return toast('Marque pelo menos um item');
    const m = Number(x.dataset.m), r = transferirItens(c, ids, m); if (!r) return;
    fechar(); toast(`${ids.length} ${ids.length === 1 ? 'item foi' : 'itens foram'} para a mesa ${m}${r.liberou ? `. A mesa ${c.mesa} ficou livre` : ''}`);
    if (r.liberou) ir(`mesa/${m}`);
  }; }) });
}

// mudar as pessoas do rodízio depois de aberta (chegou mais alguém, criança que não vai comer…)
function mudarRodizio(c) {
  const R = lojaCfg().rodizio || {}, q = { adulto: 0, crianca: 0, meia: 0, ...c.rodizio };
  folha({ titulo: `Rodízio · mesa ${c.mesa}`, corpo: TIPOS_RODIZIO.filter(([k]) => k !== 'meia' || Number(R.meia) > 0 || q.meia).map(([k, nome]) => `<div class="rod-linha"><span><b>${nome}</b><small>${din(R[k] || 0)} por pessoa</small></span><div class="qtd"><button type="button" class="bt-ico" data-rmenos="${k}" aria-label="Menos ${nome}">−</button><b data-rq="${k}">${q[k]}</b><button type="button" class="bt-ico" data-rmais="${k}" aria-label="Mais ${nome}">+</button></div></div>`).join('') + '<p class="rod-total" data-rtotal></p>',
    pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
    aoAbrir: (f, fechar) => {
      const atual = () => { Object.keys(q).forEach((k) => { const e = $(`[data-rq="${k}"]`, f); if (e) e.textContent = q[k]; }); $('[data-rtotal]', f).textContent = `${pessoasRodizio(q)} pessoas · ${din(valorRodizio(R, q))}`; };
      $$('[data-rmais]', f).forEach((b) => { b.onclick = () => { q[b.dataset.rmais]++; atual(); }; });
      $$('[data-rmenos]', f).forEach((b) => { b.onclick = () => { q[b.dataset.rmenos] = Math.max(0, q[b.dataset.rmenos] - 1); atual(); }; });
      $('[data-ok]', f).onclick = () => { const n = pessoasRodizio(q); if (!n) return toast('Pelo menos uma pessoa no rodízio');
        marcar(c, 'pessoas', `Rodízio: ${pessoasRodizio(c.rodizio)} → ${n} pessoas`); c.rodizio = Object.fromEntries(Object.entries(q).filter(([, x]) => x > 0)); c.pessoas = n; grava(); fechar(); };
      atual();
    } });
}

// ------------------------------------------------------------------ seletor de itens (cardápio do garçom)
// o preço que vale agora para este prato nesta comanda (rodízio, prato do dia, happy hour) e a marca que aparece
function precoNaComanda(c, p) {
  const L = lojaCfg(), M = modulosAtivos(L);
  if (c.rodizio && M.has('rodizio') && inclusoRodizio(L.rodizio, p.id)) return { txt: 'Incluso no rodízio', marca: 'Rodízio', cls: 'rod' };
  if (p.tamanhos?.length || p.porKg) return { txt: p.porKg ? `${din(p.preco)}/kg` : `a partir de ${din(aPartir(p))}` };
  const a = precoAgora(p, p.preco, { loja: L, mods: M });
  return a.motivo ? { txt: `<s>${din(p.preco)}</s> ${din(a.preco)}`, marca: a.motivo, cls: a.motivo === 'Prato do dia' ? 'dia' : 'promo' } : { txt: din(p.preco) };
}
export function abrirSeletor(c, aoTerminar) {
  const L = lojaCfg(), M = modulosAtivos(L), dia = M.has('pratoDoDia') ? (L.pratoDoDia || [])[new Date().getDay()] : null;
  let cat = db.categorias[0].id, busca = '';
  const lista = () => db.produtos.filter((p) => (busca ? p.nome.toLowerCase().includes(busca.toLowerCase()) : p.cat === cat));
  const marcasProd = (p, pr) => {
    const l = [pr.marca ? `<i class="marca-item ${pr.cls || ''}">${t(pr.marca)}</i>` : ''];
    const v = M.has('vitrine') && p.vitrine ? restaVitrine(p.id) : null; if (v != null) l.push(`<i class="marca-item vit">${v ? `Vitrine: ${v}` : 'Esgotou na vitrine'}</i>`);
    if (M.has('porcoesFamilia') && p.serve) l.push(`<i class="marca-item fam">${t(p.serve)}</i>`);
    if (M.has('alergenicos') && p.alergenos?.length) l.push(`<i class="marca-item alg" title="${t(p.alergenos.map((a) => ALERGENOS.find((x) => x[0] === a)?.[1] || a).join(', '))}">${t(p.alergenos.map((a) => ALERGENOS.find((x) => x[0] === a)?.[1] || a).join(' · '))}</i>`);
    return l.join('');
  };
  const grade = () => lista().map((p) => { const pr = precoNaComanda(c, p), hoje = dia?.prod === p.id;
    return `<button type="button" class="prod ${p.ativo ? '' : 'esgotado'} ${hoje ? 'prato-dia' : ''}" data-p="${p.id}" ${p.ativo ? '' : 'disabled'}>
      ${p.foto ? `<img src="${t(p.foto)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span><b>${t(p.nome)}</b><em>${p.ativo ? pr.txt : p.esgotouVitrine === ymd() ? 'Esgotou na vitrine' : 'Esgotado'}</em>${marcasProd(p, pr)}</span></button>`; }).join('');
  const contagem = () => { const n = c.itens.filter((i) => i.status === 'rascunho').reduce((s, i) => s + i.qtd, 0); return n ? `Pronto · ${n} a enviar` : 'Pronto'; };
  const pd = dia?.prod && db.produtos.find((x) => x.id === dia.prod);
  folha({ titulo: `Itens · ${c.tipo === 'mesa' || c.tipo === 'cartao' || c.tipo === 'evento' ? ondeComanda(c).toLowerCase() : `pedido #${c.num}`}`, larga: true,
    corpo: `${pd ? `<button type="button" class="prato-dia-faixa" data-p="${pd.id}">${ico('coroa')}<span><b>Prato do dia: ${t(pd.nome)}</b><small>${din(dia.preco)} só hoje</small></span></button>` : ''}
      <label class="busca">${ico('busca')}<input type="search" data-busca placeholder="Buscar no cardápio" aria-label="Buscar no cardápio"></label>
      <div class="chips" role="tablist">${db.categorias.map((k) => `<button type="button" class="chip ${k.id === cat ? 'on' : ''}" data-cat="${k.id}">${t(k.nome)}</button>`).join('')}</div>
      <div class="grade-prod" data-grade>${grade()}</div>`,
    pe: `<button type="button" class="bt cheio grande" data-fechar data-pronto>${contagem()}</button>`,
    aoFechar: aoTerminar,
    aoAbrir: (f) => {
      const redesenha = () => { $('[data-grade]', f).innerHTML = grade(); $('[data-pronto]', f).textContent = contagem(); };
      $('[data-busca]', f).oninput = (e) => { busca = e.target.value; redesenha(); };
      $$('[data-cat]', f).forEach((b) => { b.onclick = () => { cat = b.dataset.cat; busca = ''; $('[data-busca]', f).value = ''; $$('[data-cat]', f).forEach((x) => x.classList.toggle('on', x === b)); redesenha(); }; });
      f.addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b && f.contains(b) && !b.disabled) detalheItem(c, prod(b.dataset.p), () => redesenha()); });
    } });
}
// pedido por rodada (rodízio): peças inclusas ainda não entregues contam na rodada atual
export function rodadaAtual(c) { return c.itens.filter((i) => i.rodizio && !i.cancelado && i.status !== 'entregue').reduce((s, i) => s + i.qtd, 0); }
function detalheItem(c, p, depois) {
  if (!p) return;
  if (p.porKg) return pesarItem(c, p, depois);
  const L = lojaCfg(), M = modulosAtivos(L), inc = !!(c.rodizio && M.has('rodizio') && inclusoRodizio(L.rodizio, p.id));
  const op = formOpcoes(p, { produtos: db.produtos, din, t, obsRapidas: OBS_RAPIDAS, mods: M, loja: L, incluso: inc });
  // harmonização: a bebida sugerida para o prato, com um toque para pôr na comanda
  const hp = M.has('harmonizacao') && p.harmoniza ? prod(p.harmoniza) : null;
  const alg = M.has('alergenicos') && p.alergenos?.length ? `<p class="aviso-alg">${ico('alerta')}${t(p.alergenos.map((a) => ALERGENOS.find((x) => x[0] === a)?.[1] || a).join(' · '))}</p>` : '';
  folha({ titulo: p.nome, corpo: `${p.desc ? `<p class="mudo">${t(p.desc)}</p>` : ''}${M.has('porcoesFamilia') && p.serve ? `<p class="serve-grande">${ico('pessoas')}${t(p.serve)}</p>` : ''}${alg}${inc ? '<p class="aviso ouro">Incluso no rodízio: entra sem custo na conta.</p>' : ''}${op.html}
    ${hp && hp.ativo !== false ? `<div class="harmoniza"><span>${ico('taca')}<b>Combina com ${t(hp.nome)}</b><small>${din(hp.preco)}</small></span><button type="button" class="bt" data-harm>Pôr junto</button></div>` : ''}`,
  pe: `<button type="button" class="bt cheio grande" data-add>Adicionar · ${din(p.preco)}</button>`,
  aoAbrir: (f, fechar) => {
    const bt = $('[data-add]', f);
    op.ligar(f, () => { const fl = op.falta(); bt.textContent = fl || `Adicionar · ${din(op.unit() * op.s.qtd)}`; bt.classList.toggle('pendente', !!fl); });
    $('[data-harm]', f)?.addEventListener('click', () => { fechar(); detalheItem(c, hp, depois); });
    bt.onclick = () => {
      const fl = op.falta(); if (fl) { toast(fl); f.querySelector('.op-grupo [type=radio]:not(:checked), .op-grupo [type=checkbox]')?.closest('.op-grupo')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      const it = op.item(f);
      // pedido por rodada: não deixa passar do limite de peças inclusas por pessoa
      if (inc && M.has('rodadas')) {
        const r = cabeNaRodada(L.rodizio, c.pessoas, rodadaAtual(c), it.qtd);
        if (!r.ok) return toast(r.resta ? `Nesta rodada cabem só mais ${r.resta} ${r.resta === 1 ? 'peça' : 'peças'} (limite ${r.limite}). Envie e espere chegar para pedir mais.` : `Limite da rodada atingido (${r.limite} peças). Espere esta rodada chegar à mesa para pedir mais.`);
      }
      adicionarItem(c, it);
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
