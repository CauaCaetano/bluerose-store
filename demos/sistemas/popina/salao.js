// Popina · salão do garçom: a fila do que fazer agora (conceito C escolhido pelo dono) + as mesas, e a comanda da mesa.
import { db, t, din, dinCurto, tempo, minutos, prod, comanda, comandaDaMesa, fila, estadoMesa, conta, valorItem, abrirMesa, adicionarItem, enviar,
  mudarStatus, cancelarItem, atenderChamado, confirmarQR, recusarQR, transferir, grava, itensValidos, lojaCfg,
  temCouvert, juntarMesas, transferirItens, marcar, quemAgora, temPin, vendaDeHoje, tem, ondeComanda, couvertLigado, abrirCartao, cartaoAberto, proximoCartao, proximaEtapa, restaVitrine, ouvir, auditar } from './loja.js?v=31';
import { registrar, acao, ir } from './nucleo.js?v=31';
import { ico, folha, toast, confirma, autorizar, bip, $, $$ } from './ui.js?v=31';
import { OBS_RAPIDAS } from './dados.js?v=31';
import { formOpcoes, aPartir, nomeItem, precoTam, rotAdic, ofertaCombo, escolhasCombo, aplicarComboEtapas } from './opcoes.js?v=31';
import { modulosAtivos } from './perfis.js?v=31';
import { TIPOS_RODIZIO, valorRodizio, pessoasRodizio, inclusoRodizio, cabeNaRodadaCat, precoAgora, precoFracoes, ETAPAS, ordemEtapa, ALERGENOS, ymd, esquecidas, noTurno, turnoDe, TURNOS, precoKg,
  tiposRodizio, comemRodizio, linhasRodizio, limiteRodada, faixasDoKg } from './precos.js?v=31';

// a tela do salão segue o conceito do GPT aprovado pelo dono (relatorios/popina/conceitos-gpt/1-salao-pc.png)
const ROTULO = { conta: 'Levar a conta', chamou: 'Mesa chamou', pronto: 'Prato pronto', qr: 'Pedido pelo QR' };
const COR = { conta: 'ouro', chamou: 'terra', pronto: 'oliva', qr: 'amarelo' };
const nItens = (l) => { const n = l.reduce((s, i) => s + (i.qtd || 1), 0); return `${n} ${n === 1 ? 'item' : 'itens'}`; };
const onde = (c) => ondeComanda(c);

function cartaoFila(f) {
  if (f.tipo === 'conta') return linha(f.tipo, `Mesa ${f.c.mesa}`, din(conta(f.c).total), 'Ver', `abrir-conta" data-id="${f.c.id}`);
  if (f.tipo === 'chamou') return linha(f.tipo, `Mesa ${f.x.mesa}`, `há ${tempo(f.ts)}`, 'Atendi', `atender" data-id="${f.x.id}`);
  if (f.tipo === 'pronto') return linha(f.tipo, onde(f.c), nItens(f.itens), 'Entreguei', `levei" data-id="${f.c.id}`);
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
      const off = !c && db.config.planta?.[m]?.off, pausa = c?.pausaRod;
      return `<a class="mesa ${e}${off ? ' indisp' : ''}${pausa ? ' pausada' : ''}" href="#mesa/${m}" aria-label="Mesa ${m}, ${off ? 'indisponível' : ({ livre: 'livre', ocupada: 'ocupada', pronto: 'com prato pronto', conta: 'pediu a conta', chamou: 'chamou o garçom', qr: 'pedido pelo QR esperando' })[e]}${cr ? (c.cartaoVerde ? ', cartão verde' : ', cartão vermelho') : ''}${pausa ? ', rodízio pausado' : ''}">${ICO[e] ? `<i class="mesa-sinal">${ico(ICO[e])}</i>` : ''}${cr}<b>${m}</b>${c ? `<small>${tempo(c.aberta)}</small>` : ''}</a>`;
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
            <div class="fila">${l.map(cartaoFila).join('') || '<div class="fila-vazia">Tudo em dia. Quando uma mesa pedir a conta, chamar ou um prato ficar pronto, aparece aqui. Para abrir uma mesa, toque nela no mapa.</div>'}</div></section>
          <section class="ticket-dia" aria-label="Resumo do dia"><div class="ticket-cab"><h2>Resumo do dia</h2><span>${ico('calendario')}Hoje, ${hoje}</span></div>
            <div class="ticket-linha"><span>${ico('moedas')}Vendas (bruto)</span><b>${din(soma(loja, (v) => v.total - (v.servico || 0)))}</b></div>
            <div class="ticket-linha"><span>${ico('etiqueta')}Serviço (${db.config.servico}%)</span><b>${din(soma(loja, (v) => v.servico))}</b></div>
            <div class="ticket-linha"><span>${ico('moto')}Delivery (${del.length} ${del.length === 1 ? 'pedido' : 'pedidos'})</span><b>${din(soma(del, (v) => v.total))}</b></div>
            <div class="ticket-total"><span>${ico('grafico')}Total do dia</span><b>${din(soma(vh, (v) => v.total))}</b></div>
            <img class="louro-img" src="img/louro.webp?v=2" alt="" width="162" height="50"></section>
        </div>
        <div class="salao-dir">
          <header class="cab-salao"><h1>Salão</h1><img class="aqueduto-img" src="img/aqueduto.webp?v=2" alt="" width="340" height="88"></header>
          ${alertasSalao()}${barraFuncoes()}
          <div class="legenda"><span><i class="ocupada"></i>Ocupada (${contaE('ocupada')})</span><span><i class="pronto"></i>Prato pronto (${contaE('pronto', 'qr')})</span><span><i class="conta"></i>Conta (${contaE('conta')})</span><span><i class="chamou"></i>Chamada (${contaE('chamou')})</span><span><i class="livre"></i>Livre (${contaE('livre')})</span></div>
          ${areas.map((a, k) => { const lst = a.lista || Array.from({ length: a.ate - a.de + 1 }, (_, j) => a.de + j), o = ocup(lst); return `<section class="area"><div class="area-cab"><h2 class="fita ${k % 2 ? 'verde' : ''}">${t(a.nome)}</h2><span>${lst.length} ${lst.length === 1 ? 'mesa' : 'mesas'} • ${o} ${o === 1 ? 'ocupada' : 'ocupadas'}</span></div><div class="mesas">${lst.map(tile).join('')}</div></section>`; }).join('')}
          ${cartoesAbertos()}
        </div>
      </div>`;
  },
});

// alertas: mesa sem item novo e sem atenção há X minutos e comanda atrasada na cozinha (Gestão › Caixa e regras)
function alertasSalao() {
  const A = lojaCfg().alertas || {}, kds = Number(A.kds) || 10, agora = Date.now();
  const mesas = esquecidas(db.comandas, Number(A.mesa ?? 25), agora);
  const atras = [];
  db.comandas.forEach((c) => { const env = {}; c.itens.filter((i) => !i.cancelado && ['novo', 'preparo'].includes(i.status) && i.enviado).forEach((i) => { env[i.enviado] = 1; });
    Object.keys(env).forEach((ts) => { const m = Math.floor((agora - Number(ts)) / 60e3); if (m >= kds) atras.push({ c, m }); }); });
  atras.sort((a, b) => b.m - a.m);
  if (!mesas.length && !atras.length) return '';
  return `<div class="alertas-salao" role="status">${mesas.length ? `<p class="aviso alerta-mesa">${ico('relogio')}<span>Sem atenção: ${mesas.slice(0, 6).map((x) => `<a href="#mesa/${x.c.mesa}">mesa ${x.c.mesa} há ${x.min} min</a>`).join(', ')}</span></p>` : ''}
    ${atras.length ? `<p class="aviso alerta-kds">${ico('chef')}<span>Cozinha atrasada: ${[...new Map(atras.map((x) => [x.c.id, x])).values()].slice(0, 6).map((x) => `${t(ondeComanda(x.c))} há ${x.m} min`).join(', ')}</span></p>` : ''}</div>`;
}
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
    <div class="cartoes-abertos">${l.map((c) => `<a class="cartao-ind ${c.pediuConta ? 'conta' : ''} ${c.perdido ? 'perdido' : ''}" href="#cartao/${c.cartao}"><b>${c.cartao}</b><small>${c.perdido ? 'perdido' : t(c.nome || (c.naMesa ? `mesa ${c.naMesa}` : ''))}</small><em>${dinCurto(conta(c).total)}</em></a>`).join('')}</div></section>`;
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
  const quem = tem('consumoMesa') && c.tipo === 'mesa' ? (i.daMesa ? '<em class="marca-item fam">Da mesa</em>' : i.pessoa ? `<em class="marca-item etapa">Pessoa ${i.pessoa}</em>` : '') : '';
  const marcas = [i.rodizio ? '<em class="marca-item rod">Rodízio</em>' : '', i.promo ? `<em class="marca-item promo">${t(i.promo)}</em>` : '', i.etapa ? `<em class="marca-item etapa">${t(NOME_ETAPA[i.etapa] || i.etapa)}</em>` : '', quem].join('');
  return `<li class="item ${i.cancelado ? 'cancelado' : ''}"><div class="item-q">${i.qtd}×</div><div class="item-txt"><b>${t(i.nome)}</b>${marcas}${extras ? `<small>${extras}</small>` : ''}${i.cancelado ? `<small class="erro">Cancelado${i.cancelado.motivo ? ': ' + t(i.cancelado.motivo) : ''}</small>` : ''}</div>
    <div class="item-dir"><span>${din(valorItem(i))}</span>${i.cancelado ? '' : `<em class="st ${cls}">${rot}</em>`}</div>
    ${editavel && !i.cancelado && i.status !== 'entregue' ? `<button type="button" class="bt-ico" data-acao="item-menu" data-c="${c.id}" data-i="${i.id}" aria-label="Opções de ${t(i.nome)}">${ico('mais')}</button>` : ''}</li>`;
}
// linhas de totais da comanda (consumo, rodízio, evento, portaria, serviço, couvert, desconto)
export function linhasTotais(c, v = conta(c)) {
  const L = lojaCfg(), R = L.rodizio || {};
  const rod = c.rodizio ? linhasRodizio(R, c.rodizio).map((x) => `${x.qtd} ${x.nome} × ${x.preco ? dinCurto(x.preco) : 'sem cobrança'}`).join(' + ') : '';
  return `<div><span>Consumo</span><b>${din(v.sub)}</b></div>
    ${v.rodizio ? `<div><span>Rodízio (${rod})</span><b>${din(v.rodizio)}</b></div>` : ''}
    ${v.pacote ? `<div><span>Pacote do evento (${v.presentes} convidados)</span><b>${din(v.pacote)}</b></div>` : ''}
    ${v.ingresso ? `<div><span>Entrada${c.ingresso?.nome ? ` · ${t(c.ingresso.nome)}` : ''}</span><b>${din(v.ingresso)}</b></div>` : ''}
    ${c.consumacao ? `<div class="cons-linha"><span>Crédito de consumação</span><b>${din(c.consumacao)}</b></div><div class="cons-linha"><span>Consumido</span><b>${din(Math.min(v.sub, c.consumacao))}</b></div><div class="cons-linha"><span>${v.consumacao ? 'Saldo a cobrar (não consumido)' : 'Consumação mínima atingida'}</span><b>${v.consumacao ? din(v.consumacao) : ''}</b></div>` : ''}
    ${v.perdido ? `<div><span>Taxa do cartão perdido</span><b>${din(v.perdido)}</b></div>` : ''}
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
      ${c.perdido ? `<div class="aviso perdido">${ico('alerta')}Cartão perdido: nada novo entra nesta conta. Cobre no caixa${Number(lojaCfg().taxaCartaoPerdido) > 0 ? ` com a taxa de ${din(lojaCfg().taxaCartaoPerdido)}` : ''}.</div>` : ''}
      ${c.reserva ? `<div class="aviso reserva-mesa">${ico(c.reserva.restricoes ? 'alerta' : 'coroa')}<span>Reserva de ${t(c.reserva.nome)}${c.reserva.ocasiao ? ` · <b>${t(c.reserva.ocasiao)}</b>` : ''}${c.reserva.restricoes ? `<br><b>Restrições: ${t(c.reserva.restricoes)}</b>` : ''}</span></div>` : ''}
      ${c.rodizio ? avisoPausa(c) : ''}
      ${c.tipo === 'mesa' && tem('cartaoRodizio') ? `<div class="cartao-rod-mesa"><span>Cartão da mesa</span><button type="button" class="cartao-rod ${c.cartaoVerde ? 'verde' : 'vermelho'}" data-acao="cartao-rod" data-c="${c.id}" aria-pressed="${!!c.cartaoVerde}">${c.cartaoVerde ? 'Verde: quer mais' : 'Vermelho: pausa'}</button>${c.passou ? `<small>Último passe há ${tempo(c.passou)}</small>` : ''}</div>` : ''}
      ${rasc.length ? `<section class="bloco"><div class="sec-tit"><h2>${lt('A enviar')}</h2><span>${rasc.length} ${rasc.length === 1 ? 'item' : 'itens'}</span></div>${livres.length ? '<p class="mudo a-enviar-dica">Ainda não foram para a cozinha. Toque em “Enviar para a cozinha” lá embaixo.</p>' : ''}<ul class="itens">${rasc.map((i) => linhaItem(c, i)).join('')}</ul></section>` : ''}
      <section class="bloco"><div class="sec-tit"><h2>${lt('Já pedido')}</h2><span>${enviados.length ? '' : 'nada ainda'}</span></div><ul class="itens">${enviados.map((i) => linhaItem(c, i)).join('')}</ul></section>
      ${c.tipo === 'mesa' && tem('comandaIndividual') ? `<section class="bloco"><div class="sec-tit"><h2>${lt('Cartões nesta mesa')}</h2><span>cada pessoa paga o seu</span></div>
        <div class="cartoes-abertos">${cartoes.map((x) => `<a class="cartao-ind" href="#cartao/${x.cartao}"><b>${x.cartao}</b><small>${t(x.nome || '')}</small><em>${dinCurto(conta(x).total)}</em></a>`).join('')}<button type="button" class="cartao-ind novo" data-acao="abrir-cartao" data-mesa="${c.mesa}"><b>+</b><small>Abrir cartão</small></button></div></section>` : ''}
      <section class="totais">${linhasTotais(c, v)}</section></div>
      <div class="barra-acoes">
        ${c.perdido ? '' : `<button type="button" class="bt" data-acao="cardapio-pick" data-c="${c.id}">${ico('mais2')}Adicionar</button>`}
        ${livres.length ? `<button type="button" class="bt cheio grande" data-acao="enviar" data-c="${c.id}">${ico('chef')}Enviar para a cozinha (${livres.reduce((s, i) => s + i.qtd, 0)})</button>`
          : prox >= 0 ? `<button type="button" class="bt cheio grande" data-acao="liberar-etapa" data-c="${c.id}">${ico('chef')}Liberar próxima etapa: ${ETAPAS[prox][1]}</button>`
            : `<button type="button" class="bt cheio grande" data-acao="pre-conta" data-c="${c.id}">${ico('conta')}Conta · ${dinCurto(v.total)}</button>`}
      </div>`;
}
// rodízio pausado: quanto tempo e quantas pessoas; as pausas anteriores somam no total
const minPausa = (c) => Math.round(((c.pausasRod || []).reduce((s, p) => s + (p.ate - p.de), 0) + (c.pausaRod ? Date.now() - c.pausaRod.ts : 0)) / 60e3);
function avisoPausa(c) {
  const tot = minPausa(c);
  if (c.pausaRod) return `<div class="aviso pausa-rod">${ico('relogio')}<span>Rodízio pausado há <b>${tempo(c.pausaRod.ts)}</b>${c.pausaRod.pessoas < pessoasRodizio(c.rodizio) ? ` (${c.pausaRod.pessoas} de ${pessoasRodizio(c.rodizio)} pessoas)` : ''}${tot > Math.round((Date.now() - c.pausaRod.ts) / 60e3) ? ` · ${tot} min no total` : ''}</span><button type="button" class="bt" data-acao="rod-retomar" data-c="${c.id}">Retomar</button></div>`;
  return tot ? `<p class="mudo pausa-tot">Rodízio já ficou pausado ${tot} min</p>` : '';
}
// pessoas que estão comendo agora (as pausadas não contam no limite da rodada)
// quem come as peças do rodízio agora (só buffet e "não come" não contam no limite por rodada)
const pessoasAtivas = (c) => Math.max(1, (c.rodizio ? comemRodizio(c.rodizio) || c.pessoas || 1 : c.pessoas || 1) - (c.pausaRod?.pessoas || 0));
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
      ${res.map((r) => `<p class="aviso ouro">${ico('calendario')}Reservada às ${t(r.hora)} para ${t(r.nome)} (${r.pessoas} pessoas)${r.restricoes ? ` · restrições: ${t(r.restricoes)}` : ''}</p>`).join('')}
      ${db.config.planta?.[n]?.off ? `<p class="aviso perdido">${ico('alerta')}Mesa marcada como indisponível na planta. <button type="button" class="link" data-acao="mesa-disp" data-m="${n}">Liberar a mesa</button></p>` : ''}
      <div class="abrir-mesa">${gs.length ? `<p>Garçom</p><div class="pessoas" style="margin-bottom:16px">${gs.map((x) => `<button type="button" class="chip ${x === g ? 'on' : ''}" data-acao="escolher-garcom" data-g="${t(x)}" aria-pressed="${x === g}">${t(x)}</button>`).join('')}</div>` : ''}
        ${tem('rodizio') ? `<div class="rodizio-abrir" data-rodizio="${n}"><p>Rodízio: quantas pessoas de cada?</p>
          ${tiposRodizio(R).map(([k, nome]) => `<div class="rod-linha"><span><b>${nome}</b><small>${Number(R[k]) ? `${din(R[k])} por pessoa` : 'sem cobrança'}</small></span><div class="qtd"><button type="button" class="bt-ico" data-rmenos="${k}" aria-label="Menos ${nome}">−</button><b data-rq="${k}">${k === 'adulto' ? 2 : 0}</b><button type="button" class="bt-ico" data-rmais="${k}" aria-label="Mais ${nome}">+</button></div></div>`).join('')}
          <p class="rod-total" data-rtotal></p>
          <div class="linha-bts"><button type="button" class="bt cheio grande" data-acao="abrir-rodizio" data-n="${n}">Abrir no rodízio</button></div>
          <p class="mudo" style="margin-top:14px">Ou sem rodízio (à la carte): quantas pessoas?</p></div>` : '<p>Quantas pessoas? <small class="mudo">Toque no número e a mesa abre na hora.</small></p>'}
        <div class="pessoas">${[1, 2, 3, 4, 5, 6, 8, 10].map((p) => `<button type="button" class="chip" data-acao="abrir-mesa" data-n="${n}" data-p="${p}">${p}</button>`).join('')}</div></div>
      ${fechadas.length ? `<section class="bloco"><div class="sec-tit"><h2>Fechadas hoje nesta mesa</h2></div><div class="lista-bts">${fechadas.slice(0, 3).map((v) => `<button type="button" class="bt" data-acao="ver-venda" data-v="${t(v.id)}">${ico('relogio')}${new Date(v.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${din(v.total)}${v.garcom ? ` · ${t(v.garcom)}` : ''}</button>`).join('')}</div></section>` : ''}`;
    }
    return telaComanda(c, `Mesa ${n}`, 'salao');
  },
  montar(el) {
    // rodízio: + e − por tipo de pessoa, com o total por pessoa na hora
    const box = $('[data-rodizio]', el); if (!box) return;
    const R = lojaCfg().rodizio || {}, q = Object.fromEntries(TIPOS_RODIZIO.map(([k]) => [k, k === 'adulto' ? 2 : 0]));
    const atual = () => { Object.keys(q).forEach((k) => { const e = $(`[data-rq="${k}"]`, box); if (e) e.textContent = q[k]; }); const fora = pessoasRodizio(q) - comemRodizio(q); $('[data-rtotal]', box).textContent = `${pessoasRodizio(q)} pessoas${fora ? ` (${fora} fora do rodízio)` : ''} · ${din(valorRodizio(R, q))}`; box.dataset.q = JSON.stringify(q); };
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
    const desde = (c) => c.passou || c.aberta, verdes = ocup.filter((c) => c.cartaoVerde && !c.pausaRod).sort((a, b) => desde(a) - desde(b));
    return `<header class="cab-tela"><a class="bt-ico" href="#salao" aria-label="Voltar">${ico('voltar')}</a><div><h1>Passador</h1><p>${verdes.length} ${verdes.length === 1 ? 'mesa quer' : 'mesas querem'} mais · a que espera há mais tempo vem primeiro</p></div></header>
      ${tem('cartaoRodizio') ? '' : '<p class="aviso ouro">O cartão verde e vermelho está desligado. Ligue em Gestão › Aparência e templates.</p>'}
      <ul class="passador">${verdes.map((c) => `<li><b>Mesa ${c.mesa}</b><span>${c.pessoas} pessoas · sem passar há <strong>${tempo(desde(c))}</strong></span><button type="button" class="bt cheio grande" data-acao="passei" data-c="${c.id}">${ico('check')}Passei</button></li>`).join('') || '<li class="vazio">Nenhuma mesa com o cartão verde agora.</li>'}</ul>
      <div class="sec-tit"><h2>Todas as mesas</h2><span>toque para virar o cartão</span></div>
      <div class="cartoes-abertos">${ocup.map((c) => `<button type="button" class="cartao-ind ${c.pausaRod ? 'pausada' : c.cartaoVerde ? 'verde' : 'vermelho'}" data-acao="cartao-rod" data-c="${c.id}" aria-pressed="${!!c.cartaoVerde}"><b>${c.mesa}</b><small>${c.pausaRod ? 'pausada' : c.cartaoVerde ? 'verde' : 'vermelho'}</small></button>`).join('') || '<div class="vazio">Nenhuma mesa ocupada.</div>'}</div>`;
  },
});
// o cartão sincroniza entre os aparelhos (grava → nuvem/abas → ouvir redesenha a tela); o passador toca quando uma mesa nova fica verde
let verdesVistos = null;
ouvir(() => {
  const v = new Set(db.comandas.filter((c) => c.tipo === 'mesa' && c.cartaoVerde && !c.pausaRod).map((c) => c.id));
  if (verdesVistos && location.hash.startsWith('#passador') && [...v].some((id) => !verdesVistos.has(id)) && document.body.dataset.tocou) bip(1040);
  verdesVistos = v;
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
acao('mesa-disp', (b) => { const x = db.config.planta?.[b.dataset.m]; if (x) { delete x.off; grava(); toast(`Mesa ${b.dataset.m} liberada`); } });
acao('abrir-mesa', (b) => { if (db.config.planta?.[b.dataset.n]?.off) return toast('Mesa indisponível: libere antes de abrir'); const c = abrirMesa(Number(b.dataset.n), Number(b.dataset.p), garcomEscolhido()); abrirSeletor(c); });
acao('abrir-rodizio', (b) => { if (db.config.planta?.[b.dataset.n]?.off) return toast('Mesa indisponível: libere antes de abrir');
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
      ${ehMesa && c.rodizio && tem('rodizio') ? `<button type="button" class="bt" data-pausa>${ico('relogio')}${c.pausaRod ? 'Retomar o rodízio' : 'Pausar o rodízio'}${minPausa(c) ? ` (${minPausa(c)} min pausado)` : ''}</button>` : ''}
      ${c.tipo === 'cartao' ? `<button type="button" class="bt ${c.perdido ? '' : 'perigo'}" data-perdido>${ico('alerta')}${c.perdido ? 'Cartão encontrado: liberar' : 'Cartão perdido: bloquear'}</button>` : ''}
      ${ehMesa && c.rodizio && tem('rodizio') ? `<button type="button" class="bt" data-rodizio>${ico('pessoas')}Pessoas no rodízio (${pessoasRodizio(c.rodizio)})</button>` : ehMesa ? `<button type="button" class="bt" data-pessoas>${ico('pessoas')}Mudar número de pessoas (${c.pessoas})</button>` : ''}
      <button type="button" class="bt" data-garcom>${ico('pessoas')}Garçom: ${t(c.garcom || 'nenhum')} · trocar</button>
      ${ehMesa && outras.length ? `<button type="button" class="bt" data-juntar>${ico('mesa')}Juntar outra mesa nesta</button>` : ''}
      ${ehMesa && itensValidos(c).length ? `<button type="button" class="bt" data-passar>${ico('troca')}Passar itens para outra mesa</button>` : ''}</div>
      ${ehMesa ? `<p class="mudo" style="margin-top:14px">Trocar de mesa</p><div class="grade-mesas">${livres.map((m) => `<button type="button" class="mesa livre" data-m="${m}"><b>${m}</b></button>`).join('')}</div>` : ''}
      <div class="sec-tit"><h2>Histórico</h2></div>${linhaTempo(c)}`,
  aoAbrir: (f, fechar) => {
    $('[data-rodizio]', f)?.addEventListener('click', () => { fechar(); mudarRodizio(c); });
    $('[data-pausa]', f)?.addEventListener('click', () => { fechar(); if (c.pausaRod) retomarRodizio(c); else pausarRodizio(c); });
    $('[data-perdido]', f)?.addEventListener('click', async () => {
      fechar();
      if (c.perdido) { delete c.perdido; marcar(c, 'perdido', 'Cartão encontrado: liberado'); grava(); return toast(`Cartão ${c.cartao} liberado`); }
      if (!(await confirma(`Marcar o cartão ${c.cartao} como perdido? Nada novo entra nele e o caixa cobra${Number(lojaCfg().taxaCartaoPerdido) > 0 ? ` a taxa de ${din(lojaCfg().taxaCartaoPerdido)}` : ''}.`, 'Bloquear o cartão', true))) return;
      c.perdido = { ts: Date.now(), quem: quemAgora(c) }; marcar(c, 'perdido', 'Cartão perdido: bloqueado'); auditar('cartao-perdido', { item: `Cartão ${c.cartao}`, valor: Number(lojaCfg().taxaCartaoPerdido) || 0, motivo: 'Cartão perdido' }); grava(); toast(`Cartão ${c.cartao} bloqueado`);
    });
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

// pausar o rodízio (a mesa saiu para fumar, criança dormiu...): o passador pula a mesa e a rodada conta só quem está comendo
function pausarRodizio(c) {
  const n = pessoasRodizio(c.rodizio) || c.pessoas || 1; let q = n;
  folha({ titulo: `Pausar o rodízio · mesa ${c.mesa}`, corpo: `<p class="mudo">Quantas pessoas param agora? O tempo pausado fica registrado na mesa.</p><div class="qtd"><button type="button" class="bt-ico grande" data-menos aria-label="Menos">−</button><b data-q>${q}</b><button type="button" class="bt-ico grande" data-mais aria-label="Mais">+</button></div><p class="centro mudo" data-txt></p>`,
    pe: '<button type="button" class="bt cheio grande" data-ok>Pausar</button>',
    aoAbrir: (f, fechar) => {
      const at = () => { $('[data-q]', f).textContent = q; $('[data-txt]', f).textContent = q >= n ? 'A mesa toda pausa' : `${n - q} ${n - q === 1 ? 'continua' : 'continuam'} comendo`; };
      $('[data-menos]', f).onclick = () => { q = Math.max(1, q - 1); at(); }; $('[data-mais]', f).onclick = () => { q = Math.min(n, q + 1); at(); }; at();
      $('[data-ok]', f).onclick = () => { c.pausaRod = { ts: Date.now(), pessoas: q }; if (q >= n) c.cartaoVerde = false; marcar(c, 'pausa', `Rodízio pausado (${q} de ${n} pessoas)`); grava(); fechar(); toast(`Mesa ${c.mesa}: rodízio pausado`); };
    } });
}
function retomarRodizio(c) {
  if (!c.pausaRod) return; const min = Math.round((Date.now() - c.pausaRod.ts) / 60e3);
  (c.pausasRod ||= []).push({ de: c.pausaRod.ts, ate: Date.now(), pessoas: c.pausaRod.pessoas }); delete c.pausaRod;
  marcar(c, 'pausa', `Rodízio retomado depois de ${min} min`); grava(); toast(`Mesa ${c.mesa}: rodízio retomado`);
}
acao('rod-retomar', (b) => { const c = comanda(b.dataset.c); if (c) retomarRodizio(c); });
// mudar as pessoas do rodízio depois de aberta (chegou mais alguém, criança que não vai comer…)
function mudarRodizio(c) {
  const R = lojaCfg().rodizio || {}, q = { ...Object.fromEntries(TIPOS_RODIZIO.map(([k]) => [k, 0])), ...c.rodizio };
  folha({ titulo: `Rodízio · mesa ${c.mesa}`, corpo: '<p class="mudo">Quem come o rodízio e quem não come: cada um paga o seu preço na conta.</p>' + tiposRodizio(R, q).map(([k, nome]) => `<div class="rod-linha"><span><b>${nome}</b><small>${Number(R[k]) ? `${din(R[k])} por pessoa` : 'sem cobrança'}</small></span><div class="qtd"><button type="button" class="bt-ico" data-rmenos="${k}" aria-label="Menos ${nome}">−</button><b data-rq="${k}">${q[k]}</b><button type="button" class="bt-ico" data-rmais="${k}" aria-label="Mais ${nome}">+</button></div></div>`).join('') + '<p class="rod-total" data-rtotal></p>',
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
  if (p.tamanhos?.length || p.porKg) { const pk = p.porKg ? precoKg(p) : null; return pk ? { txt: `${din(pk.preco)}/kg${pk.ate ? ` até ${pk.ate}` : ''}`, ...(pk.desde ? { marca: `Desde ${pk.desde}`, cls: 'promo' } : {}) } : { txt: `a partir de ${din(aPartir(p))}` }; }
  const a = precoAgora(p, p.preco, { loja: L, mods: M });
  return a.motivo ? { txt: `<s>${din(p.preco)}</s> ${din(a.preco)}`, marca: a.motivo, cls: a.motivo === 'Prato do dia' ? 'dia' : 'promo' } : { txt: din(p.preco) };
}
export function abrirSeletor(c, aoTerminar) {
  const L = lojaCfg(), M = modulosAtivos(L), dia = M.has('pratoDoDia') ? (L.pratoDoDia || [])[new Date().getDay()] : null;
  const foraTurno = (p) => !noTurno(p, db.categorias, L.turnos), nomeTurno = (p) => (TURNOS.find((x) => x[0] === turnoDe(p, db.categorias))?.[1] || '').toLowerCase();
  let cat = db.categorias[0].id, busca = '';
  const lista = () => db.produtos.filter((p) => (busca ? p.nome.toLowerCase().includes(busca.toLowerCase()) : p.cat === cat));
  const marcasProd = (p, pr) => {
    const l = [pr.marca ? `<i class="marca-item ${pr.cls || ''}">${t(pr.marca)}</i>` : ''];
    const v = M.has('vitrine') && p.vitrine ? restaVitrine(p.id) : null; if (v != null) l.push(`<i class="marca-item vit">${v ? `Vitrine: ${v}` : 'Esgotou na vitrine'}</i>`);
    if (M.has('porcoesFamilia') && p.serve) l.push(`<i class="marca-item fam">${t(p.serve)}</i>`);
    if (M.has('alergenicos') && p.alergenos?.length) l.push(`<i class="marca-item alg" title="${t(p.alergenos.map((a) => ALERGENOS.find((x) => x[0] === a)?.[1] || a).join(', '))}">${t(p.alergenos.map((a) => ALERGENOS.find((x) => x[0] === a)?.[1] || a).join(' · '))}</i>`);
    return l.join('');
  };
  const grade = () => lista().map((p) => { const pr = precoNaComanda(c, p), hoje = dia?.prod === p.id, ft = foraTurno(p), ok = p.ativo && !ft;
    return `<button type="button" class="prod ${p.ativo ? '' : 'esgotado'} ${ft ? 'fora-turno' : ''} ${hoje ? 'prato-dia' : ''}" data-p="${p.id}" ${ok ? '' : 'disabled'}>
      ${p.foto ? `<img src="${t(p.foto)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span><b>${t(p.nome)}</b><em>${ft ? `Só no ${nomeTurno(p)}` : p.ativo ? pr.txt : p.esgotouVitrine === ymd() ? 'Esgotou na vitrine' : 'Esgotado'}</em>${marcasProd(p, pr)}</span></button>`; }).join('');
  const naMesa = ['mesa', 'cartao', 'evento'].includes(c.tipo);
  const contagem = () => { const n = c.itens.filter((i) => i.status === 'rascunho').reduce((s, i) => s + i.qtd, 0); return naMesa ? (n ? 'Voltar à comanda' : 'Pronto') : n ? `Pronto · ${n} a enviar` : 'Pronto'; };
  // na mesa, o garçom já manda para a cozinha daqui, sem precisar voltar à comanda
  const aEnviar = () => c.itens.filter((i) => i.status === 'rascunho' && !i.segura).reduce((s, i) => s + i.qtd, 0);
  const btEnviar = () => `${ico('chef')}Enviar para a cozinha (${aEnviar()})`;
  const pd = dia?.prod && db.produtos.find((x) => x.id === dia.prod && !foraTurno(x));
  // rodízio com pedido por rodada: o garçom vê quantas peças ainda cabem nesta rodada (geral e por categoria)
  const rodada = () => { if (!(c.rodizio && M.has('rodizio') && M.has('rodadas'))) return ''; const R = L.rodizio || {}, n = pessoasAtivas(c), its = itensRodada(c), g = cabeNaRodadaCat(R, n, its, '', 0);
    const cats = Object.entries(R.rodadaCat || {}).filter(([, v]) => Number(v) > 0).map(([k]) => { const r = cabeNaRodadaCat(R, n, its, k, 0); return `${t(db.categorias.find((x) => x.id === k)?.nome || k)}: ${r.limite - r.resta} de ${r.limite}`; });
    return g.limite ? `<p class="aviso rodada-aviso ${g.resta ? '' : 'cheia'}" data-rodada>${ico('relogio')}<span><b>Rodada: ${g.limite - g.resta} de ${g.limite} peças${g.resta ? ` · cabem mais ${g.resta}` : ' · limite atingido'}</b><small>${limiteRodada(R).porPessoa} por pessoa × ${n} ${n === 1 ? 'pessoa' : 'pessoas'} comendo${cats.length ? ` · ${cats.join(' · ')}` : ''}. A rodada libera quando as peças chegam à mesa.</small></span></p>` : ''; };
  folha({ titulo: `Itens · ${c.tipo === 'mesa' || c.tipo === 'cartao' || c.tipo === 'evento' ? ondeComanda(c).toLowerCase() : `pedido #${c.num}`}`, larga: true,
    corpo: `${rodada()}${pd ? `<button type="button" class="prato-dia-faixa" data-p="${pd.id}">${ico('coroa')}<span><b>Prato do dia: ${t(pd.nome)}</b><small>${din(dia.preco)} só hoje</small></span></button>` : ''}
      <label class="busca">${ico('busca')}<input type="search" data-busca placeholder="Buscar no cardápio" aria-label="Buscar no cardápio"></label>
      <div class="chips" role="tablist">${db.categorias.map((k) => `<button type="button" class="chip ${k.id === cat ? 'on' : ''}" data-cat="${k.id}">${t(k.nome)}</button>`).join('')}</div>
      <div class="grade-prod" data-grade>${grade()}</div>`,
    pe: naMesa ? `<button type="button" class="bt grande" data-fechar data-pronto>${contagem()}</button><button type="button" class="bt cheio grande" data-enviar-ja ${aEnviar() ? '' : 'style="display:none"'}>${btEnviar()}</button>`
      : `<button type="button" class="bt cheio grande" data-fechar data-pronto>${contagem()}</button>`,
    aoFechar: aoTerminar,
    aoAbrir: (f, fechar) => {
      const ej = $('[data-enviar-ja]', f);
      if (ej) ej.onclick = () => { const n = enviar(c); fechar(); avisoEnvio(c, n); };
      const redesenha = () => { $('[data-grade]', f).innerHTML = grade(); $('[data-pronto]', f).textContent = contagem(); if (ej) { ej.style.display = aEnviar() ? '' : 'none'; ej.innerHTML = btEnviar(); } const r = $('[data-rodada]', f); if (r) r.outerHTML = rodada(); };
      $('[data-busca]', f).oninput = (e) => { busca = e.target.value; redesenha(); };
      $$('[data-cat]', f).forEach((b) => { b.onclick = () => { cat = b.dataset.cat; busca = ''; $('[data-busca]', f).value = ''; $$('[data-cat]', f).forEach((x) => x.classList.toggle('on', x === b)); redesenha(); }; });
      f.addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b && f.contains(b) && !b.disabled) detalheItem(c, prod(b.dataset.p), () => redesenha()); });
    } });
}
// pedido por rodada (rodízio): peças inclusas ainda não entregues contam na rodada atual
export function rodadaAtual(c) { return c.itens.filter((i) => i.rodizio && !i.cancelado && i.status !== 'entregue').reduce((s, i) => s + i.qtd, 0); }
// as peças da rodada com a categoria (o limite pode ser por categoria)
export const itensRodada = (c) => c.itens.filter((i) => i.rodizio && !i.cancelado && i.status !== 'entregue').map((i) => ({ cat: prod(i.prod)?.cat || '', qtd: i.qtd }));
function detalheItem(c, p, depois) {
  if (!p) return;
  if (p.porKg) return pesarItem(c, p, depois);
  const L = lojaCfg(), M = modulosAtivos(L), inc = !!(c.rodizio && M.has('rodizio') && inclusoRodizio(L.rodizio, p.id));
  const op = formOpcoes(p, { produtos: db.produtos, din, t, obsRapidas: OBS_RAPIDAS, mods: M, loja: L, incluso: inc });
  // harmonização: a bebida sugerida para o prato, com um toque para pôr na comanda
  const hp = M.has('harmonizacao') && p.harmoniza ? prod(p.harmoniza) : null;
  const alg = M.has('alergenicos') && p.alergenos?.length ? `<p class="aviso-alg">${ico('alerta')}${t(p.alergenos.map((a) => ALERGENOS.find((x) => x[0] === a)?.[1] || a).join(' · '))}</p>` : '';
  // consumo da mesa e individual: o item é da mesa (divide entre todos na conta) ou de uma pessoa
  const quemOn = M.has('consumoMesa') && c.tipo === 'mesa', np = Math.min(12, Math.max(1, c.pessoas || 2)); let dono = quemOn && p.serve ? 'mesa' : '';
  const htmlQuem = quemOn ? `<fieldset class="op-grupo quem-item"><legend>De quem é? <em>a divisão da conta já vem pronta</em></legend><div class="chips quebra">${[['mesa', 'Da mesa (divide entre todos)'], ...Array.from({ length: np }, (_, k) => [String(k + 1), `Pessoa ${k + 1}`]), ['', 'Não marcar']].map(([v, n]) => `<button type="button" class="chip ${dono === v ? 'on' : ''}" data-dono="${v}" aria-pressed="${dono === v}">${n}</button>`).join('')}</div></fieldset>` : '';
  folha({ titulo: p.nome, corpo: `${p.desc ? `<p class="mudo">${t(p.desc)}</p>` : ''}${M.has('porcoesFamilia') && p.serve ? `<p class="serve-grande">${ico('pessoas')}${t(p.serve)}</p>` : ''}${alg}${inc ? '<p class="aviso ouro">Incluso no rodízio: entra sem custo na conta.</p>' : ''}${htmlQuem}${op.html}
    ${hp && hp.ativo !== false ? `<div class="harmoniza"><span>${ico('taca')}<b>Combina com ${t(hp.nome)}</b><small>${din(hp.preco)}</small></span><button type="button" class="bt" data-harm>Pôr junto</button></div>` : ''}`,
  pe: `<button type="button" class="bt cheio grande" data-add>Adicionar · ${din(p.preco)}</button>`,
  aoAbrir: (f, fechar) => {
    const bt = $('[data-add]', f);
    op.ligar(f, () => { const fl = op.falta(); bt.textContent = fl || `Adicionar · ${din(op.unit() * op.s.qtd)}`; bt.classList.toggle('pendente', !!fl); });
    $('[data-harm]', f)?.addEventListener('click', () => { fechar(); detalheItem(c, hp, depois); });
    $$('[data-dono]', f).forEach((x) => { x.onclick = () => { dono = x.dataset.dono; $$('[data-dono]', f).forEach((y) => { y.classList.toggle('on', y === x); y.setAttribute('aria-pressed', String(y === x)); }); }; });
    bt.onclick = () => {
      const fl = op.falta(); if (fl) { toast(fl); f.querySelector('.op-grupo [type=radio]:not(:checked), .op-grupo [type=checkbox]')?.closest('.op-grupo')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      const it = op.item(f);
      // pedido por rodada: não deixa passar do limite de peças inclusas por pessoa
      if (inc && M.has('rodadas')) {
        const r = cabeNaRodadaCat(L.rodizio, pessoasAtivas(c), itensRodada(c), p.cat, it.qtd), onde = r.cat ? ` de ${db.categorias.find((x) => x.id === r.cat)?.nome.toLowerCase() || 'esta categoria'}` : '';
        if (!r.ok) return toast(r.resta ? `Nesta rodada cabem só mais ${r.resta} ${r.resta === 1 ? 'peça' : 'peças'}${onde} (limite ${r.limite}). Envie e espere chegar para pedir mais.` : `Limite da rodada${onde} atingido (${r.limite} peças). Espere esta rodada chegar à mesa para pedir mais.`);
      }
      if (adicionarItem(c, it) === false) return toast(c.perdido ? 'Cartão perdido: libere o cartão antes de lançar' : 'Não deu para lançar este item');
      if (quemOn && dono) { const novo = c.itens.at(-1); if (dono === 'mesa') novo.daMesa = true; else novo.pessoa = Number(dono); grava(); }
      fechar(); toast(`${it.qtd}× ${p.nome} na comanda`);
      // combo em etapas: depois do lanche, oferece o acompanhamento e a bebida com desconto
      const of = !inc && ofertaCombo(p, L, M, db.produtos);
      if (of) return setTimeout(() => oferecerCombo(c, of, depois), 260);
      depois?.();
    };
  } });
}
// "Quer transformar em combo?" → acompanhamento → bebida; o desconto entra no acompanhamento (conferido por aplicarComboEtapas)
export function oferecerCombo(c, of, depois) {
  const bebidas = of.bebida.flatMap((b) => escolhasCombo(b).map((x) => ({ ...x, prod: b.id }))); let acomp = null;
  const passo1 = () => `<p class="combo-oferta">${ico('cloche')}<span><b>Acompanhamento + bebida com ${din(of.desconto)} de desconto</b><small>O combo sai a partir de + ${din(of.aPartir)}</small></span></p>`;
  const passo2 = () => `<p class="combo-passo">1 de 2 · Escolha o acompanhamento</p><div class="papeis">${of.acomp.map((a) => `<button type="button" class="papel" data-ac="${a.id}"><b>${t(a.nome)}</b><small>${din(a.preco)}</small></button>`).join('')}</div>`;
  const passo3 = () => `<p class="combo-passo">2 de 2 · Escolha a bebida <em>${t(acomp.nome)} já está no combo</em></p><div class="papeis">${bebidas.map((x, k) => `<button type="button" class="papel" data-be="${k}"><b>${t(x.rot)}</b><small>${din(x.preco)}</small></button>`).join('')}</div>`;
  folha({ titulo: 'Quer transformar em combo?', corpo: `<div data-combo>${passo1()}</div>`,
    pe: '<button type="button" class="bt" data-fechar data-so>Só o lanche</button><button type="button" class="bt cheio grande" data-quero>Quero o combo</button>', aoFechar: depois,
    aoAbrir: (f, fechar) => {
      const box = $('[data-combo]', f), pe = f.querySelector('[data-quero]');
      pe.onclick = () => { box.innerHTML = passo2(); pe.hidden = true; f.querySelector('[data-so]').textContent = 'Desistir do combo'; };
      box.addEventListener('click', (e) => {
        const a = e.target.closest('[data-ac]'), b = e.target.closest('[data-be]');
        if (a) { acomp = prod(a.dataset.ac); box.innerHTML = passo3(); return; }
        if (b && acomp) {
          const x = bebidas[Number(b.dataset.be)];
          if (adicionarItem(c, { prodId: acomp.id }) !== false) c.itens.at(-1).comboUp = 'acomp';
          if (adicionarItem(c, { prodId: x.prod, adic: x.adic }) !== false) c.itens.at(-1).comboUp = 'bebida';
          const n = aplicarComboEtapas(c.itens, lojaCfg(), prod); grava(); fechar();
          toast(n ? `Combo montado: ${acomp.nome} e ${x.rot} · − ${din(of.desconto)}` : 'Acompanhamento e bebida na comanda');
        }
      });
    } });
}

// prato por quilo: digita o peso da balança (em gramas) e o valor aparece na hora
export function pesarItem(c, p, depois) {
  const pk = precoKg(p), kgPreco = pk.preco, L = lojaCfg();
  // tara em um toque: cada tipo de prato tem o seu peso (Regras das funções); sem a lista, vale a tara única dos Ajustes
  const taras = tem('quilo') && (L.taras || []).length ? L.taras : db.config.tara ? [{ nome: 'Prato', g: Number(db.config.tara) }] : [];
  let tara = taras[0]?.g || 0;
  const fx = faixasDoKg(p);
  folha({ titulo: p.nome, corpo: `<p class="mudo">${din(kgPreco)} o quilo${pk.desde ? ` (preço desde ${pk.desde})` : pk.ate ? ` até ${pk.ate}` : ''}. Digite o peso que a balança mostrou; o prato escolhido é descontado.</p>
    ${fx.length > 1 ? `<div class="kg-faixas">${fx.map((x) => `<span class="${x.preco === kgPreco && (x.de || '') === (pk.desde || '') ? 'on' : ''}"><small>${x.de ? `a partir das ${x.de}` : 'na abertura'}${x.ate ? ` até ${x.ate}` : ''}</small><b>${din(x.preco)}/kg</b></span>`).join('')}</div>` : ''}
    ${taras.length ? `<div class="campo"><span>Tara: o prato vazio (um toque)</span><div class="chips quebra taras">${[...taras, { nome: 'Sem prato', g: 0 }].map((x, k) => `<button type="button" class="chip ${k === 0 ? 'on' : ''}" data-tara="${x.g}" aria-pressed="${k === 0}">${t(x.nome)}${x.g ? ` · ${x.g} g` : ''}</button>`).join('')}</div></div>` : ''}
    <label class="campo peso"><span>Peso que a balança mostrou (gramas)</span><input data-g inputmode="numeric" placeholder="Ex.: 452" autocomplete="off"></label>
    <div class="chips quebra">${[300, 400, 500, 600].map((g) => `<button type="button" class="chip" data-gr="${g}">${g} g</button>`).join('')}</div>
    <p class="peso-valor" data-v>R$ 0,00</p><p class="peso-conta" data-conta>Aceita de 20 g a 5 kg</p>`,
  pe: '<button type="button" class="bt cheio grande" data-add disabled>Adicionar</button>',
  aoAbrir: (f, fechar) => {
    $$('[data-tara]', f).forEach((b) => { b.onclick = () => { tara = Number(b.dataset.tara) || 0; $$('[data-tara]', f).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); }); atual(); g.focus(); }; });
    const g = $('[data-g]', f); const kg = () => Math.max(0, (Number(String(g.value).replace(/\D/g, '')) - tara) / 1000);
    const atual = () => { const k = kg(), bruto = Number(String(g.value).replace(/\D/g, '')) || 0; $('[data-v]', f).textContent = k ? `${din(kgPreco * k)}` : 'R$ 0,00'; $('[data-conta]', f).textContent = bruto ? (tara ? `${bruto} g na balança − ${tara} g do prato = ${Math.max(0, bruto - tara)} g` : `${bruto} g`) + ` × ${din(kgPreco)}/kg` : 'Aceita de 20 g a 5 kg'; $('[data-add]', f).disabled = !(k > 0.02 && k < 5); };
    g.oninput = atual; $$('[data-gr]', f).forEach((b) => { b.onclick = () => { g.value = b.dataset.gr; atual(); g.focus(); }; });
    $('[data-add]', f).onclick = () => { const k = kg(); if (!(k > 0.02 && k < 5)) return toast('Confira o peso: entre 20 g e 5 kg'); if (adicionarItem(c, { prodId: p.id, kg: k }) === false) return toast('Cartão perdido: libere o cartão antes de lançar'); fechar(); toast(`${p.nome}: ${din(precoKg(p).preco * k)}`); depois?.(); };
    setTimeout(() => g.focus(), 80);
  } });
}

// ------------------------------------------------------------------ planta do salão: ver o estado das mesas e, no modo editar, arrastar (mouse e toque)
// db.config.planta[mesa] = { x, y, lugares, nome, off, forma }: posição numa grade de 24 × 16 (cada mesa ocupa 3 × 3)
const PW = 24, PH = 16, PT = 3;
function posPlanta(m) {
  const x = db.config.planta?.[m];
  if (x && Number.isFinite(x.x) && Number.isFinite(x.y)) return x;
  const k = m - 1; return { x: (k % 6) * 4 + 0.5, y: Math.floor(k / 6) * 4 + 0.5 }; // sem posição salva: em fileiras de 6
}
function htmlPlanta(editar) {
  const n = db.config.mesas, P = db.config.planta || {}, linhas = Math.max(PH, ...Array.from({ length: n }, (_, k) => posPlanta(k + 1).y + PT + 0.5));
  const mesas = Array.from({ length: n }, (_, k) => {
    const m = k + 1, e = estadoMesa(m), c = comandaDaMesa(m), x = P[m] || {}, pos = posPlanta(m);
    const est = `left:${(pos.x / PW) * 100}%;top:${(pos.y / linhas) * 100}%;width:${(PT / PW) * 100}%;height:${(PT / linhas) * 100}%`;
    const txt = `<b>${t(x.nome || m)}</b><small>${x.off ? 'indisponível' : c ? dinCurto(conta(c).total) : `${x.lugares || 4} lugares`}</small>`;
    return editar ? `<button type="button" class="mesa-planta ${x.forma === 'quadrada' || (!x.forma && m % 3 === 2) ? 'quadrada' : ''} ${x.off ? 'off' : ''}" data-pm="${m}" style="${est}" aria-label="Mesa ${m}: arraste para mover, toque para ajustar">${txt}</button>`
      : `<a class="mesa-planta ${e} ${x.forma === 'quadrada' || (!x.forma && m % 3 === 2) ? 'quadrada' : ''} ${x.off ? 'off' : ''}" href="#mesa/${m}" data-fechar style="${est}">${txt}</a>`;
  }).join('');
  return `<div class="planta-livre ${editar ? 'editando' : ''}" data-planta style="aspect-ratio:${PW}/${linhas}">${mesas}</div>
    <p class="mudo" style="margin-top:10px">${editar ? 'Arraste as mesas na grade. Toque numa mesa para mudar o nome, os lugares, o formato ou marcar como indisponível.' : 'Toque numa mesa para abrir. Use “Editar a planta” para arrumar as mesas como no salão.'}</p>`;
}
acao('planta', () => {
  let editar = false;
  folha({ titulo: 'Planta do salão', larga: true, corpo: `<div data-pl>${htmlPlanta(false)}</div>`, pe: '<button type="button" class="bt" data-ed>Editar a planta</button>',
    aoAbrir: (f) => {
      const box = $('[data-pl]', f), bt = $('[data-ed]', f);
      const desenha = () => { box.innerHTML = htmlPlanta(editar); bt.textContent = editar ? 'Pronto' : 'Editar a planta'; bt.classList.toggle('cheio', editar); if (editar) ligarArraste(box, desenha); };
      bt.onclick = () => { editar = !editar; desenha(); if (!editar) toast('Planta salva'); };
    } });
});
// arrastar com o dedo ou o mouse (pointer events), encaixando na grade; toque sem arrastar abre o ajuste da mesa
function ligarArraste(box, desenha) {
  const area = $('[data-planta]', box); let ativo = null;
  area.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('[data-pm]'); if (!el) return;
    e.preventDefault(); el.setPointerCapture(e.pointerId);
    const r = area.getBoundingClientRect(), m = Number(el.dataset.pm), pos = posPlanta(m);
    ativo = { el, m, r, x0: e.clientX, y0: e.clientY, px: pos.x, py: pos.y, moveu: false, linhas: r.height / (r.width / PW) };
  });
  area.addEventListener('pointermove', (e) => {
    if (!ativo) return; const dx = e.clientX - ativo.x0, dy = e.clientY - ativo.y0;
    if (!ativo.moveu && Math.hypot(dx, dy) < 6) return; ativo.moveu = true; ativo.el.classList.add('arrastando');
    const cel = ativo.r.width / PW, nx = Math.max(0, Math.min(PW - PT, Math.round((ativo.px + dx / cel) * 2) / 2)), ny = Math.max(0, Math.min(ativo.linhas - PT, Math.round((ativo.py + dy / cel) * 2) / 2));
    ativo.nx = nx; ativo.ny = ny; ativo.el.style.left = `${(nx / PW) * 100}%`; ativo.el.style.top = `${(ny / ativo.linhas) * 100}%`;
  });
  const solta = () => {
    if (!ativo) return; const a = ativo; ativo = null;
    if (!a.moveu) return ajustarMesa(a.m, desenha);
    db.config.planta ||= {}; db.config.planta[a.m] = { ...(db.config.planta[a.m] || {}), x: a.nx ?? a.px, y: a.ny ?? a.py }; grava(); desenha();
  };
  area.addEventListener('pointerup', solta); area.addEventListener('pointercancel', () => { ativo = null; desenha(); });
}
function ajustarMesa(m, depois) {
  const x = db.config.planta?.[m] || {};
  folha({ titulo: `Mesa ${m}`, corpo: `<div class="duas-c"><label class="campo"><span>Nome na planta (opcional)</span><input data-n value="${t(x.nome || '')}" maxlength="16" placeholder="${m}"></label><label class="campo"><span>Lugares</span><input data-l inputmode="numeric" value="${x.lugares || 4}"></label></div>
    <div class="campo"><span>Formato</span><div class="seg" role="group">${[['redonda', 'Redonda'], ['quadrada', 'Quadrada']].map(([k, n]) => `<button type="button" data-fm="${k}" aria-pressed="${(x.forma || (m % 3 === 2 ? 'quadrada' : 'redonda')) === k}">${n}</button>`).join('')}</div></div>
    <label class="interruptor bloco-int"><input type="checkbox" data-off ${x.off ? 'checked' : ''}><span></span>Indisponível (quebrada, reservada para evento, área fechada)</label>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Salvar a mesa</button>',
  aoAbrir: (f, fechar) => {
    let forma = x.forma || (m % 3 === 2 ? 'quadrada' : 'redonda');
    $$('[data-fm]', f).forEach((b) => { b.onclick = () => { forma = b.dataset.fm; $$('[data-fm]', f).forEach((y) => y.setAttribute('aria-pressed', String(y === b))); }; });
    $('[data-ok]', f).onclick = () => {
      const pos = posPlanta(m); db.config.planta ||= {};
      db.config.planta[m] = { ...x, x: pos.x, y: pos.y, nome: $('[data-n]', f).value.trim(), lugares: Math.max(1, Math.min(40, Math.round(Number($('[data-l]', f).value)) || 4)), forma, off: $('[data-off]', f).checked };
      if (!db.config.planta[m].off) delete db.config.planta[m].off;
      grava(); fechar(); depois?.();
    };
  } });
}
