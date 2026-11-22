// Popina · quadro de pedidos de balcão, retirada e entrega em 4 colunas: Novos → Na cozinha → Prontos e na rua → Concluídos.
// Pedido do cardápio online chega com som (toca até alguém aceitar ou recusar com o motivo). Cada cartão mostra a origem e o tempo.
// No celular, uma coluna por vez (as abas de cima trocam). O novo pedido (nome ou telefone do cliente, endereço, taxa por bairro e troco).
import { db, t, din, tempo, minutos, conta, novoPedido, itensValidos, ondeComanda, tipoNome, quemPediu, clientePorTel, soDig, num, vir, hora, lojaCfg, comanda,
  etapa, aguardaAceite, aceitarPedido, recusarPedido, MOTIVOS_RECUSA, marcarPronto, saiuEntrega, concluirPedido, enviar, inicioDoDia, zap, fone,
  lojaPausada, pausarLoja, voltarLoja, aceiteAuto, setLoja } from './loja.js?v=51';
import { registrar, acao, ir } from './nucleo.js?v=51';
import { ico, folha, toast, bip, autorizar, $, $$ } from './ui.js?v=51';
import { imprimirConta, imprimirCozinha } from './imprimir.js?v=51';

const ler = (k, pad) => { try { return localStorage.getItem(k) ?? pad; } catch { return pad; } };
const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* nada */ } };
export const somLigado = () => ler('popina-som-pedidos', '1') === '1';
let colSel = '';
const COLS = [['novo', 'Novos'], ['preparo', 'Na cozinha'], ['pronto', 'Prontos e na rua'], ['feito', 'Concluídos']];
const abertos = () => db.comandas.filter((c) => c.tipo !== 'mesa');
// origem curta para o cartão
const ORIGEM = { 'Cardápio online': ['Online', 'link'], 'Telefone ou WhatsApp': ['Telefone/WhatsApp', 'zap'], WhatsApp: ['WhatsApp', 'zap'], Telefone: ['Telefone', 'fala'], Balcão: ['Balcão', 'loja'] };
const origemDe = (c) => ORIGEM[c.origem] || [c.origem || (c.tipo === 'delivery' ? 'Telefone/WhatsApp' : 'Balcão'), c.tipo === 'delivery' ? 'zap' : 'loja'];
export function situacao(c) {
  const it = itensValidos(c), e = etapa(c);
  if (c.tipo === 'delivery' && c.entrega === 'entregue') return ['Entregue · falta receber', 'prep'];
  if (c.tipo === 'delivery' && c.entrega === 'saiu') return ['Saiu para entrega', 'saiu'];
  if (!it.length) return ['Sem itens', ''];
  if (aguardaAceite(c)) return ['Aceitar?', 'alerta'];
  if (e === 'novo') return ['Falta mandar', 'novo'];
  if (e === 'preparo') return [it.some((i) => i.status === 'preparo') ? 'Preparando' : 'Na cozinha', 'prep'];
  return [c.tipo === 'delivery' ? 'Pronto para sair' : 'Pronto', 'pronto'];
}
const itensTxt = (c) => { const l = itensValidos(c); const s = l.slice(0, 3).map((i) => `${i.kg ? '' : `${i.qtd}× `}${t(i.nome)}`).join('<br>'); return l.length > 3 ? `${s}<br><span class="mudo">+ ${l.length - 3} ${l.length - 3 === 1 ? 'item' : 'itens'}</span>` : s; };
function cartao(c) {
  const v = conta(c), e = etapa(c), [st, cl] = situacao(c), [org, oi] = origemDe(c), espera = aguardaAceite(c);
  // tempo: desde que chegou; amarelo e vermelho conforme o atraso (o novo do online fica vermelho em 3 min sem aceitar)
  const m = Math.floor(minutos(c.aberta)), cor = espera ? (m >= 3 ? 'atrasado' : 'medio') : m >= 40 ? 'atrasado' : m >= 25 ? 'medio' : '';
  const pago = v.falta <= 0.009 ? '<span class="etq livre">Pago</span>' : c.pagarNaEntrega ? `<span class="etq">Paga na entrega: ${t(c.pagarNaEntrega.replace(/ \(troco.*\)$/, ''))}</span>` : '<span class="etq">A pagar</span>';
  let bts = '';
  if (espera) bts = `<button type="button" class="bt perigo" data-acao="ped-recusar" data-id="${c.id}">Recusar</button><button type="button" class="bt cheio" data-acao="ped-aceitar" data-id="${c.id}">${ico('check')}Aceitar</button>`;
  else if (e === 'novo') bts = itensValidos(c).length ? `<button type="button" class="bt cheio" data-acao="ped-mandar" data-id="${c.id}">${ico('cozinha')}Mandar para a cozinha</button>` : `<button type="button" class="bt cheio" data-ir="lancar/${c.id}">${ico('mais2')}Lançar itens</button>`;
  else if (e === 'preparo') bts = `<button type="button" class="bt ok" data-acao="ped-pronto" data-id="${c.id}">${ico('check')}Está pronto</button>`;
  else if (c.tipo === 'delivery' && !['saiu', 'entregue'].includes(c.entrega)) bts = `<button type="button" class="bt cheio" data-acao="ped-saiu" data-id="${c.id}">${ico('moto')}Saiu para entrega</button>`;
  else bts = `<button type="button" class="bt ok" data-acao="ped-entregue" data-id="${c.id}">${ico('check')}${c.tipo === 'delivery' && c.entrega === 'entregue' ? 'Receber' : v.falta > 0.009 ? 'Entregue e cobrar' : 'Entregue'}</button>`;
  const entregador = c.entregador ? (db.entregadores || []).find((x) => x.id === c.entregador)?.nome : '';
  return `<article class="pc ${espera ? 'espera' : ''} ${cl === 'pronto' ? 'pronto' : ''}" aria-label="${t(quemPediu(c))}">
    <button type="button" class="pc-abre" data-ir="comanda/${c.id}" aria-label="Abrir o pedido de ${t(quemPediu(c))}">
      <span class="pc-l1">${c.senha ? `<span class="senha" title="Senha">${c.senha}</span>` : ''}<span class="pc-nome"><b>${t(c.cliente?.nome || ondeComanda(c))}</b><small>${tipoNome(c)} #${c.num ?? ''}${c.tipo === 'delivery' && c.cliente?.bairro ? ` · ${t(c.cliente.bairro)}` : ''}</small></span>
        <span class="pc-tempo ${cor}" title="Chegou às ${hora(c.aberta)}">${ico('relogio')}${tempo(c.aberta)}</span></span>
      ${c.agendado ? `<span class="etq saiu">${ico('relogio')}Agendado para ${new Date(c.agendado).toDateString() === new Date().toDateString() ? '' : `${new Date(c.agendado).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} `}${hora(c.agendado)}</span>` : ''}
      <span class="pc-org">${ico(oi)}${t(org)}${entregador ? ` · ${ico('moto')}${t(entregador)}` : ''}${c.cupom ? ` · cupom ${t(c.cupom)}` : ''}</span>
      <span class="pc-itens">${itensTxt(c) || '<span class="mudo">Nada lançado</span>'}</span>
      <span class="pc-l3"><span class="etq ${cl}">${st}</span>${pago}<b class="num">${din(v.total)}</b></span>
    </button>
    <div class="pc-bts"><button type="button" class="bt-ico" data-acao="ped-imp" data-id="${c.id}" aria-label="Imprimir">${ico('impressora')}</button>${bts}</div></article>`;
}
// concluídos de hoje: vendas fechadas de balcão, retirada e entrega, e os recusados
function concluidos() {
  const h = inicioDoDia();
  const v = db.vendas.filter((x) => x.ts >= h && x.tipo !== 'mesa' && !db.comandas.some((c) => c.vendaId === x.id)).map((x) => ({ ts: x.entregue || x.ts, x, rec: false }));
  const r = (db.recusados || []).filter((x) => x.ts >= h).map((x) => ({ ts: x.ts, x, rec: true }));
  return [...v, ...r].sort((a, b) => b.ts - a.ts);
}
const ondeV = (x) => x.onde || `${x.tipo === 'delivery' ? 'Entrega' : x.modo === 'retirada' ? 'Retirada' : 'Balcão'}${x.num ? ` #${x.num}` : ''}`;
const linhaFeito = ({ x, rec }) => `<li class="pf ${rec ? 'rec' : ''}"><div class="tx"><b>${t(x.nomeCliente || x.cliente?.nome || ondeV(x))}</b><small>${t(ondeV(x))} · ${hora(x.entregue || x.ts)}${rec ? ` · recusado: ${t(x.motivo || '')}` : x.cancelado ? ' · venda cancelada' : ''}</small></div><b class="num">${rec ? '—' : din(x.total)}</b></li>`;
registrar('pedidos', {
  titulo: 'Pedidos',
  html() {
    const l = abertos().sort((a, b) => (aguardaAceite(b) ? 1 : 0) - (aguardaAceite(a) ? 1 : 0) || a.aberta - b.aberta);
    const por = { novo: [], preparo: [], pronto: [] }; l.forEach((c) => por[etapa(c)].push(c));
    const feitos = concluidos(), cont = { ...Object.fromEntries(Object.entries(por).map(([k, x]) => [k, x.length])), feito: feitos.length };
    const sel = colSel || (por.novo.length ? 'novo' : por.preparo.length ? 'preparo' : por.pronto.length ? 'pronto' : 'novo');
    const P = lojaPausada(), esperando = por.novo.filter(aguardaAceite).length;
    return `<div class="cab"><div><h1>Pedidos</h1><p>${l.length ? `${l.length} ${l.length === 1 ? 'pedido aberto' : 'pedidos abertos'}` : 'Balcão, retirada e entrega'}${esperando ? ` · <b class="alerta-txt">${esperando} esperando aceitar</b>` : ''}</p></div>
      <div class="acoes"><button type="button" class="bt so-pc" data-acao="link-delivery">${ico('link')}Meu link de delivery</button><button type="button" class="bt ${P ? 'perigo cheio' : ''}" data-acao="ped-pausa">${ico(P ? 'alerta' : 'loja')}${P ? `Pausado${P.ate ? ` até ${hora(P.ate)}` : ''} · voltar` : 'Pausar pedidos online'}</button>
        <button type="button" class="bt-ico" data-acao="ped-ajustes" aria-label="Som e aceitar sozinho" title="Som e aceitar sozinho">${ico('ajustes')}</button>
        <button type="button" class="bt cheio grande" data-novo-ped>${ico('mais2')}Novo pedido</button></div></div>
    ${P ? `<p class="aviso perigo">O cardápio online está pausado${P.motivo ? ` (${t(P.motivo)})` : ''}: os clientes veem a loja fechada.</p>` : ''}
    <div class="chips quadro-abas" role="tablist" aria-label="Colunas">${COLS.map(([k, n]) => `<button type="button" class="chip" role="tab" data-col="${k}" aria-selected="${sel === k}" aria-pressed="${sel === k}">${n} <b>${cont[k]}</b></button>`).join('')}</div>
    <div class="quadro" data-sel="${sel}">${COLS.map(([k, n]) => `<section class="coluna" data-c="${k}" aria-label="${n}"><h2>${n} <b>${cont[k]}</b></h2>
      ${k === 'feito' ? (feitos.length ? `<ul class="lista-l pfs">${feitos.slice(0, 30).map(linhaFeito).join('')}</ul>` : '<p class="vazio">Os pedidos entregues hoje aparecem aqui.</p>')
        : por[k].map(cartao).join('') || `<p class="vazio">${{ novo: 'Nenhum pedido novo. Os do cardápio online chegam aqui com um aviso sonoro.', preparo: 'Nada na cozinha agora.', pronto: 'Nenhum pedido pronto ou na rua.' }[k]}</p>`}</section>`).join('')}</div>`;
  },
  montar(el) {
    $$('[data-col]', el).forEach((b) => { b.onclick = () => { colSel = b.dataset.col; ir('pedidos'); }; });
    $('[data-novo-ped]', el).onclick = () => novoPedidoFolha();
  },
});
const doId = (b) => comanda(b.dataset.id);
acao('ped-aceitar', (b) => { const c = doId(b); if (!c) return; aceitarPedido(c); toast(`Pedido #${c.num} aceito: foi para a cozinha`); });
acao('ped-mandar', (b) => { const c = doId(b); if (!c) return; const n = enviar(c); toast(n ? `${n} ${n === 1 ? 'item foi' : 'itens foram'} para a cozinha` : 'Nada para mandar'); });
acao('ped-pronto', (b) => { const c = doId(b); if (c && marcarPronto(c)) toast(`${quemPediu(c)}: pronto`); });
acao('ped-recusar', async (b) => {
  const c = doId(b); if (!c) return;
  const r = await autorizar({ titulo: `Recusar o pedido #${c.num} de ${c.cliente?.nome || 'cliente'}?`, texto: 'O pedido sai do quadro. Avise o cliente pelo WhatsApp no próximo passo.', motivos: MOTIVOS_RECUSA, sim: 'Recusar o pedido', perigo: true });
  if (!r) return;
  const cl = c.cliente || {}; recusarPedido(c, r.motivo);
  if (soDig(cl.tel).length >= 10) folha({ titulo: 'Pedido recusado', corpo: '<p class="aviso">Mande uma mensagem para o cliente não ficar esperando.</p>',
    pe: `<button type="button" class="bt" data-fechar>Agora não</button><a class="bt ok grande" target="_blank" rel="noopener" data-fechar href="${zap(cl.tel, `Olá, ${(cl.nome || '').split(' ')[0]}! Aqui é do ${db.config.nome}. Infelizmente não vamos conseguir fazer o seu pedido #${c.num} agora: ${r.motivo.toLowerCase()}. Desculpe!`)}">${ico('zap')}Avisar ${t(fone(cl.tel))}</a>` });
  else toast('Pedido recusado');
});
acao('ped-saiu', (b) => { const c = doId(b); if (c) escolherEntregador(c); });
export function escolherEntregador(c) {
  const l = db.entregadores || [];
  if (!l.length) { saiuEntrega(c, ''); toast('Saiu para entrega'); return; }
  folha({ titulo: `Quem vai levar o #${c.num}?`, corpo: `<p class="mudo" style="margin-bottom:10px">${t(c.cliente?.end || '')}${c.cliente?.bairro ? ` · ${t(c.cliente.bairro)}` : ''}</p>
    <div class="chips quebra">${l.map((e) => { const rua = db.comandas.filter((x) => x.entregador === e.id && x.entrega === 'saiu').length; return `<button type="button" class="chip grande" data-e="${e.id}">${ico('moto')}${t(e.nome)}${rua ? ` · ${rua} na rua` : ''}</button>`; }).join('')}</div>
    <label class="liga" style="margin-top:14px">Imprimir a via da entrega<input type="checkbox" data-via ${ler('popina-via-entrega', '1') === '1' ? 'checked' : ''}></label>`,
  pe: '<button type="button" class="bt" data-sem>Sair sem escolher</button>',
  aoAbrir: (f, fechar) => {
    const vai = (id) => { const via = $('[data-via]', f).checked; gravar('popina-via-entrega', via ? '1' : '0'); saiuEntrega(c, id); fechar(); toast('Saiu para entrega'); if (via) imprimirConta(c); };
    $$('[data-e]', f).forEach((x) => { x.onclick = () => vai(x.dataset.e); }); $('[data-sem]', f).onclick = () => vai('');
  } });
}
acao('ped-entregue', (b) => { const c = doId(b); if (!c) return; const r = concluirPedido(c); if (r === 'pagar') { toast('Agora receba o pagamento'); ir(`fechar/${c.id}`); } else if (r) toast(`#${c.num} entregue`); });
acao('ped-imp', (b) => { const c = doId(b); if (!c) return; if (etapa(c) === 'pronto' || c.tipo === 'delivery' && etapa(c) !== 'novo') imprimirConta(c); else imprimirCozinha(c, itensValidos(c)); });
acao('ped-pausa', () => {
  if (lojaPausada()) { voltarLoja(); toast('Cardápio online aberto de novo'); return; }
  let min = 30;
  folha({ titulo: 'Pausar os pedidos online', corpo: `<p class="mudo" style="margin-bottom:10px">O cardápio mostra a loja fechada e ninguém consegue pedir. Os pedidos do balcão e das mesas continuam normais.</p>
    <p class="campo"><span style="font-weight:700">Por quanto tempo?</span></p><div class="chips quebra">${[[15, '15 min'], [30, '30 min'], [60, '1 hora'], [0, 'Até eu voltar']].map(([k, n]) => `<button type="button" class="chip" data-min="${k}" aria-pressed="${k === min}">${n}</button>`).join('')}</div>
    <label class="campo" style="margin-top:12px"><span>Motivo (aparece para o cliente)</span><input data-mot maxlength="80" placeholder="Ex.: muito movimento, acabou o gás"></label>`,
  pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt perigo cheio grande" data-ok>Pausar</button>',
  aoAbrir: (f, fechar) => {
    $$('[data-min]', f).forEach((x) => { x.onclick = () => { min = Number(x.dataset.min); $$('[data-min]', f).forEach((y) => y.setAttribute('aria-pressed', y === x)); }; });
    $('[data-ok]', f).onclick = () => { pausarLoja(min, $('[data-mot]', f).value.trim()); fechar(); toast(min ? `Pausado por ${min} min` : 'Pausado até você voltar'); };
  } });
});
acao('ped-ajustes', () => {
  folha({ titulo: 'Avisos dos pedidos', corpo: `<label class="liga">Tocar enquanto tiver pedido para aceitar<small>Neste aparelho. Toca a cada 15 segundos, em qualquer tela.</small><input type="checkbox" data-som ${somLigado() ? 'checked' : ''}></label>
    <label class="liga">Aceitar sozinho os pedidos do cardápio online<small>Vão direto para a cozinha, sem tocar em Aceitar</small><input type="checkbox" data-auto ${aceiteAuto() ? 'checked' : ''}></label>`,
  aoAbrir: (f) => {
    $('[data-som]', f).onchange = (e) => { gravar('popina-som-pedidos', e.target.checked ? '1' : '0'); if (e.target.checked) bip(); };
    $('[data-auto]', f).onchange = (e) => { setLoja({ aceiteAuto: e.target.checked }); toast(e.target.checked ? 'Os pedidos online vão direto para a cozinha' : 'Você aceita cada pedido online'); };
  } });
});
// toca enquanto houver pedido do cardápio online esperando alguém aceitar
setInterval(() => { if (somLigado() && db.comandas.some(aguardaAceite)) { bip(988); setTimeout(() => bip(784), 200); } }, 15000);

// novo pedido: escolhe o tipo; no balcão basta o nome (ou nada: sai com a senha); na entrega, telefone, endereço e bairro
const ORIGENS = ['WhatsApp', 'Telefone', 'Balcão'];
export function novoPedidoFolha(tipoIni = 'balcao') {
  let tipo = tipoIni;
  const bairros = db.bairros || [];
  const corpo = () => `<div class="chips quebra" role="group" aria-label="Tipo">${[['balcao', 'Balcão'], ['retirada', 'Retirada'], ['delivery', 'Entrega']].map(([k, n]) => `<button type="button" class="chip" data-t="${k}" aria-pressed="${tipo === k}">${n}</button>`).join('')}</div>
    <div style="margin-top:14px">
    ${tipo !== 'balcao' ? `<p class="campo"><span>Pediu por</span></p><div class="chips quebra" role="group" aria-label="Pediu por">${ORIGENS.map((o, k) => `<button type="button" class="chip" data-org="${o}" aria-pressed="${k === 0}">${o}</button>`).join('')}</div>
      <label class="campo" style="margin-top:10px"><span>Telefone (WhatsApp)</span><input data-tel inputmode="tel" autocomplete="off" placeholder="16 99999-9999"></label><p class="mudo" data-cli-info></p>` : ''}
    <label class="campo"><span>Nome do cliente${tipo === 'balcao' ? ' (ou deixe em branco e use a senha)' : ''}</span><input data-nome maxlength="60" autocomplete="off" placeholder="Ex.: Juliana"></label>
    ${tipo === 'delivery' ? `<label class="campo"><span>Endereço</span><input data-end maxlength="160" autocomplete="off" placeholder="Rua, número e complemento"></label>
      <label class="campo"><span>Bairro</span><select data-bairro><option value="">Escolha o bairro</option>${bairros.map((b) => `<option value="${t(b.nome)}">${t(b.nome)} · entrega ${din(b.taxa)}</option>`).join('')}<option value="__outro">Outro bairro</option></select></label>
      <div class="grade2"><label class="campo"><span>Taxa de entrega</span><input data-taxa inputmode="decimal" placeholder="0,00"></label><label class="campo"><span>Troco para (se for dinheiro)</span><input data-troco inputmode="decimal" placeholder="Ex.: 50"></label></div>
      <label class="campo"><span>Como vai pagar</span><select data-pagar><option value="">Paga agora no caixa</option>${(lojaCfg().pagamentos || []).map((f) => `<option>${t(f)}</option>`).join('')}</select></label>` : ''}
    </div>`;
  folha({ titulo: 'Novo pedido', corpo: `<div data-c>${corpo()}</div>`, pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio grande" data-ok>Criar e lançar itens</button>',
    aoAbrir: (f, fechar) => {
      const ligar = () => {
        $$('[data-t]', f).forEach((b) => { b.onclick = () => { tipo = b.dataset.t; $('[data-c]', f).innerHTML = corpo(); ligar(); }; });
        $$('[data-org]', f).forEach((b) => { b.onclick = () => $$('[data-org]', f).forEach((x) => x.setAttribute('aria-pressed', x === b)); });
        const tel = $('[data-tel]', f);
        // cliente conhecido pelo telefone: nome, endereço, bairro e o último pedido
        if (tel) tel.oninput = () => {
          const x = clientePorTel(tel.value), info = $('[data-cli-info]', f); if (info) info.innerHTML = '';
          if (!x) return;
          const ult = [...db.vendas].reverse().find((v) => v.cliente === x.tel);
          if (info) info.innerHTML = `<b>${t(x.nome || 'Cliente')}</b> já pediu ${x.pedidos || 0} ${x.pedidos === 1 ? 'vez' : 'vezes'}${ult ? ` · último em ${new Date(ult.ts).toLocaleDateString('pt-BR')}: ${t((ult.itens || []).slice(0, 2).map((i) => `${i.qtd}× ${i.nome}`).join(', '))}` : ''}`;
          if (!$('[data-nome]', f).value) $('[data-nome]', f).value = x.nome || '';
          if ($('[data-end]', f) && !$('[data-end]', f).value) { $('[data-end]', f).value = x.end || ''; if (x.bairro && bairros.some((b) => b.nome === x.bairro)) { $('[data-bairro]', f).value = x.bairro; $('[data-taxa]', f).value = vir(bairros.find((b) => b.nome === x.bairro).taxa); } }
        };
        const bai = $('[data-bairro]', f); if (bai) bai.onchange = () => { const b = bairros.find((x) => x.nome === bai.value); if (b) $('[data-taxa]', f).value = vir(b.taxa); };
      };
      ligar();
      $('[data-ok]', f).onclick = () => {
        const nome = $('[data-nome]', f).value.trim(), tel = soDig($('[data-tel]', f)?.value);
        if (tipo === 'delivery' && !$('[data-end]', f).value.trim()) return toast('Escreva o endereço da entrega');
        if (tipo === 'retirada' && !nome) return toast('Escreva o nome de quem vai retirar');
        const origem = $('[data-org][aria-pressed=true]', f)?.dataset.org || 'Balcão';
        const bairro = $('[data-bairro]', f)?.value === '__outro' ? '' : $('[data-bairro]', f)?.value || '';
        const c = tipo === 'delivery'
          ? novoPedido('delivery', { nome, tel, end: $('[data-end]', f).value.trim(), bairro }, { origem, aceito: Date.now(), taxaEntrega: num($('[data-taxa]', f).value), ...(num($('[data-troco]', f).value) > 0 ? { trocoPara: num($('[data-troco]', f).value) } : {}), ...($('[data-pagar]', f).value ? { pagarNaEntrega: $('[data-pagar]', f).value } : {}) })
          : novoPedido('balcao', { nome, ...(tel ? { tel } : {}) }, { origem: tipo === 'retirada' ? origem : 'Balcão', aceito: Date.now(), ...(tipo === 'retirada' ? { modo: 'retirada' } : {}) });
        fechar(); toast(c.senha ? `Pedido criado · senha ${c.senha}` : 'Pedido criado'); ir(`lancar/${c.id}`);
      };
    } });
}
export { hora, quemPediu };
