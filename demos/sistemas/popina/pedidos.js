// Popina · balcão e delivery: pedidos por etapa, pedido novo (telefone, balcão ou cardápio online), taxa por bairro e WhatsApp pronto.
import { db, t, din, dinCurto, tempo, comanda, conta, novoPedido, enviar, grava, itensValidos, linkCardapio, clientePorTel, lojaCfg, tem, encomendaValida, antecedencia } from './loja.js?v=30';
import { ymd } from './precos.js?v=30';
import { registrar, acao, ir, ACOES } from './nucleo.js?v=30';
import { ico, folha, toast, $, $$ } from './ui.js?v=30';
import { linhaItem, abrirSeletor } from './salao.js?v=30';

const ETAPAS = [['novo', 'Recebidos'], ['preparo', 'Preparando'], ['saiu', 'Saiu para entrega'], ['pronto_retirar', 'Pronto para retirar']];
function etapa(c) {
  if (c.tipo === 'delivery' && c.entrega === 'saiu') return 'saiu';
  const it = itensValidos(c).filter((i) => i.status !== 'rascunho');
  if (!it.length || it.every((i) => i.status === 'novo')) return 'novo';
  if (it.every((i) => ['pronto', 'entregue'].includes(i.status))) return c.tipo === 'delivery' ? 'preparo_ok' : 'pronto_retirar';
  return 'preparo';
}
// encomenda para outro dia: fica fora do quadro até o dia (aparece em Encomendas)
export const encomendaFutura = (c) => !!c.encomenda?.para && ymd(c.encomenda.para) > ymd();
export const quandoEnc = (ts) => new Date(ts).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const zap = (tel, msg) => `https://wa.me/55${String(tel || '').replace(/\D/g, '').replace(/^55/, '')}?text=${encodeURIComponent(msg)}`;
function msgDe(c, tipo) {
  const v = conta(c), nome = (c.cliente?.nome || '').split(' ')[0];
  if (tipo === 'confirmado') return `Olá, ${nome}! Seu pedido #${c.num} na ${db.config.nome} foi confirmado e já está sendo preparado. Total ${dinCurto(v.total)}. Obrigado!`;
  if (tipo === 'saiu') return `${nome}, seu pedido #${c.num} saiu para entrega e chega em instantes! ${c.pagarNaEntrega ? `Pagamento na entrega: ${c.pagarNaEntrega}, ${dinCurto(v.falta)}.` : ''}`;
  return `${nome}, seu pedido #${c.num}${c.senha ? ` (senha ${c.senha})` : ''} está pronto para retirar na ${db.config.nome}. Total ${dinCurto(v.total)}.`;
}
// de onde veio o pedido: o cardápio online aparece como "Pelo site"
const origemDe = (c) => { const o = String(c.origem || ''); return /card[aá]pio online|^site/i.test(o) ? 'Pelo site' : o ? o[0].toUpperCase() + o.slice(1) : ''; };

// arrastar o pedido entre as colunas (ou deslizar para o lado no celular) muda a etapa
function moverPedido(c, destino) {
  const it = itensValidos(c).filter((i) => i.status !== 'rascunho' && !i.cancelado && !i.vitrine);
  if (!itensValidos(c).some((i) => i.status !== 'rascunho')) { toast('Envie o pedido para a cozinha primeiro'); return false; }
  const agora = Date.now();
  if (destino === 'saiu') {
    if (c.tipo !== 'delivery') { toast('"Saiu para entrega" é só para delivery'); return false; }
    it.forEach((i) => { if (i.status !== 'entregue') { i.status = 'pronto'; i.pronto ||= agora; } });
    grava(); ACOES.saiu?.({ dataset: { c: c.id } }); return true;
  }
  if (c.entrega === 'saiu') { delete c.entrega; delete c.saiu; }
  const st = destino === 'novo' ? 'novo' : destino === 'preparo' ? 'preparo' : 'pronto';
  it.forEach((i) => {
    i.status = st;
    if (st === 'novo') { delete i.inicio; delete i.pronto; }
    if (st === 'preparo') { i.inicio ||= agora; delete i.pronto; }
    if (st === 'pronto') i.pronto ||= agora;
  });
  grava();
  toast(st === 'novo' ? `#${c.num} voltou para Recebidos` : st === 'preparo' ? `#${c.num} em preparo` : c.tipo === 'delivery' ? `#${c.num} pronto: arraste para "Saiu para entrega"` : `#${c.num} pronto para retirar`);
  return true;
}
const ORDEM = ['novo', 'preparo', 'pronto_retirar', 'saiu'];
function arrastarPedidos(quadro) {
  let d = null;
  const colDe = (x, y) => document.elementsFromPoint(x, y).map((el) => el.closest?.('.kds-col[data-etapa]')).find(Boolean);
  const limpa = () => { if (!d) return; d.card.classList.remove('arrastando'); d.card.style.translate = ''; quadro.querySelectorAll('.kds-col.alvo').forEach((x) => x.classList.remove('alvo')); document.body.classList.remove('arrastando-pd'); d = null; };
  quadro.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.ticket.pd[data-pd]'); if (!card || e.target.closest('a,button,input,select') || e.button > 0) return;
    d = { card, x: e.clientX, y: e.clientY, de: card.closest('.kds-col')?.dataset.etapa, ativo: false, id: e.pointerId };
  });
  quadro.addEventListener('pointermove', (e) => {
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.ativo) { if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) { if (Math.abs(dy) > 12) limpa(); return; } d.ativo = true; d.card.setPointerCapture(e.pointerId); d.card.classList.add('arrastando'); document.body.classList.add('arrastando-pd'); }
    d.card.style.translate = `${dx}px ${dy}px`;
    const col = colDe(e.clientX, e.clientY); quadro.querySelectorAll('.kds-col.alvo').forEach((x) => x !== col && x.classList.remove('alvo'));
    if (col && col.dataset.etapa !== d.de) col.classList.add('alvo');
  });
  const solta = (e) => {
    if (!d || e.pointerId !== d.id) return;
    const { card, x, de, ativo } = d; if (!ativo) { d = null; return; }
    const c = comanda(card.dataset.pd), col = colDe(e.clientX, e.clientY);
    let para = col?.dataset.etapa;
    // sem coluna embaixo do dedo (celular, uma coluna por vez): deslizar para a direita avança, para a esquerda volta
    if (!para || para === de) { const k = ORDEM.indexOf(de) + (e.clientX - x > 70 ? 1 : e.clientX - x < -70 ? -1 : 0); para = ORDEM[k] && k !== ORDEM.indexOf(de) ? ORDEM[k] : ''; if (para === 'pronto_retirar' && c?.tipo === 'delivery' && e.clientX - x < 0) para = 'preparo'; }
    limpa();
    if (c && para && para !== de) { if (c.tipo === 'delivery' && para === 'pronto_retirar') para = 'pronto'; moverPedido(c, para === 'pronto' ? 'pronto_retirar' : para); }
  };
  quadro.addEventListener('pointerup', solta); quadro.addEventListener('pointercancel', limpa);
}

// comanda de papel pendurada no trilho (conceito do GPT: relatorios/popina/conceitos-gpt/4-pedidos-pc.png)
function cartao(c) {
  const v = conta(c), e = etapa(c);
  const ok = (r) => `${ico('check')}${r}`;
  const bt = c.tipo === 'delivery'
    ? (e === 'saiu' ? `<button type="button" class="bt cheio" data-acao="entregue" data-c="${c.id}">${ok('Entregue')}</button>` : e === 'preparo_ok' ? `<button type="button" class="bt claro" data-acao="saiu" data-c="${c.id}">${ok('Saiu')}</button>` : '')
    : (e === 'pronto_retirar' ? `<a class="bt oliva" href="#caixa/${c.id}">${ok('Retirado')}</a>` : '');
  const pg = v.falta <= 0 ? ['pago', 'Pago'] : c.pagarNaEntrega ? ['entrega', `Paga na entrega: ${t(c.pagarNaEntrega)}`] : ['apagar', 'A pagar'];
  const onde = c.tipo === 'delivery' ? `${ico('pino')}${t([c.cliente?.end, c.cliente?.bairro].filter(Boolean).join(' · '))}` : `${ico('loja')}Retirada no balcão`;
  const org = origemDe(c);
  return `<article class="ticket pd ${e === 'preparo_ok' ? 'preparo' : e === 'pronto_retirar' ? 'pronto' : e}" data-pd="${c.id}" title="Arraste para outra coluna para mudar a etapa"><header><i class="tk-ico">${ico(c.tipo === 'delivery' ? 'moto' : 'sacola')}</i><div class="tk-tit"><b>#${c.num} · ${t(c.cliente?.nome || 'Cliente')}</b><small>${onde}</small>${org ? `<em class="pd-origem ${org === 'Pelo site' ? 'site' : ''}">${t(org)}</em>` : ''}</div>${c.senha ? `<span class="senha-mini" title="Senha">${c.senha}</span>` : ''}<span class="relogio"><b>${tempo(c.aberta)}</b></span></header>
    ${c.encomenda?.para ? `<p class="pg entrega">${ico('calendario')}Encomenda para ${quandoEnc(c.encomenda.para)}</p>` : ''}
    <p class="pd-itens">${itensValidos(c).map((i) => `${i.qtd}× ${t(i.nome)}`).join(', ') || '<em>sem itens</em>'}</p>
    <p class="pg ${pg[0]}">${pg[1]}</p>
    <footer><b>${dinCurto(v.total)}</b><span></span>${bt || `<a class="bt-ico" href="#pedidos/ver/${c.id}" aria-label="Abrir pedido">${ico('dir')}</a>`}</footer></article>`;
}
registrar('pedidos', {
  titulo: 'Pedidos', aba: 'pedidos',
  html(modo, x) {
    if (modo === 'novo') return formNovo(x || 'delivery');
    if (modo === 'ver') { const c = comanda(x); return c ? verPedido(c) : '<div class="vazio">Pedido não encontrado (talvez já tenha sido fechado).</div>'; }
    const ps = db.comandas.filter((c) => (c.tipo === 'delivery' || c.tipo === 'balcao') && !encomendaFutura(c));
    const futuras = db.comandas.filter(encomendaFutura).length;
    const grupos = { novo: [], preparo: [], saiu: [], pronto_retirar: [] };
    ps.forEach((c) => { const e = etapa(c); (grupos[e === 'preparo_ok' ? 'preparo' : e] ||= []).push(c); });
    const COL = { novo: 'novo', preparo: 'preparo', saiu: 'saiu', pronto_retirar: 'pronto' };
    return `<header class="cab-pedidos"><h1><img src="img/k-louro-esq.webp?v=1" alt="" width="56" height="74">Pedidos<img src="img/k-louro-dir.webp?v=1" alt="" width="56" height="74"></h1><img class="aqueduto-img" src="img/aqueduto.webp?v=2" alt="" width="340" height="88">
      <div class="linha-bts">${tem('senha') ? `<a class="bt claro" href="#senhas">${ico('telacheia')}Painel de retirada</a>` : ''}${tem('encomendas') ? `<a class="bt claro" href="#mais/encomendas">${ico('calendario')}Encomendas${futuras ? ` (${futuras})` : ''}</a>` : ''}<a class="bt claro" href="#pedidos/novo/balcao">${ico('mais2')}Balcão</a>${tem('delivery') ? `<a class="bt cheio" href="#pedidos/novo/delivery">${ico('moto')}Delivery</a>` : ''}</div></header>
      ${tem('delivery') ? `<div class="link-cardapio">${ico('qr')}<div><b>Cardápio online para delivery</b><span>Os clientes pedem pelo link e o pedido cai aqui sozinho.</span></div><button type="button" class="bt oliva" data-acao="copiar-link">${ico('link')}Copiar link</button></div>` : ''}
      <p class="pd-dica mudo">${ico('dir')}Arraste o pedido para outra coluna para mudar a etapa. No celular, deslize o pedido para o lado.</p>
      <section class="kds quadro pd-quadro">${ETAPAS.map(([e, r]) => `<div class="kds-col ${COL[e]}" data-etapa="${e}"><h2 class="placa">${r.toUpperCase()} <span>(${grupos[e]?.length || 0})</span></h2><div class="trilho" aria-hidden="true"></div>${(grupos[e] || []).map(cartao).join('') || '<div class="vazio-quadro">Nada aqui.</div>'}</div>`).join('')}</section>`;
  },
  montar(el, modo, x) {
    if (!modo) { const q = $('.pd-quadro', el); if (q) arrastarPedidos(q); return; }
    if (modo !== 'novo') return;
    if (x === 'delivery' && !tem('delivery')) { el.innerHTML = `<div class="vazio">O delivery está desligado. Ligue em Gestão › Aparência e templates.</div>`; return; }
    const f = $('form', el); const tipo = f.dataset.tipo;
    const taxa = () => { const b = db.bairros.find((x) => x.nome === f.bairro?.value); $('[data-taxa]', el) && ($('[data-taxa]', el).textContent = b ? `Taxa de entrega: ${din(b.taxa)}` : ''); };
    f.bairro?.addEventListener('change', taxa); taxa();
    f.tel.addEventListener('input', () => {
      const x = clientePorTel(f.tel.value), info = $('[data-cli]', el);
      if (!x) { info.textContent = ''; return; }
      info.textContent = `${x.nome} · ${x.pedidos} pedidos, ${din(x.total)} no total${x.obs ? ` · ${x.obs}` : ''}`;
      if (!f.nome.value) f.nome.value = x.nome || '';
      if (f.end && !f.end.value && x.end) f.end.value = x.end;
      if (f.bairro && !f.bairro.value && x.bairro) { f.bairro.value = x.bairro; taxa(); }
    });
    f.onsubmit = (e) => {
      e.preventDefault();
      if (!f.nome.value.trim()) return toast('Escreva o nome do cliente');
      if (tipo === 'delivery' && (!f.end.value.trim() || !f.bairro.value)) return toast('Endereço e bairro são obrigatórios na entrega');
      // encomenda: data e hora futuras, com a antecedência mínima do restaurante
      let enc = null;
      if (f.para?.value) { const ts = encomendaValida(f.para.value); if (!ts) return toast(`A encomenda precisa de pelo menos ${antecedencia()} horas de antecedência`); enc = { para: ts }; }
      const c = novoPedido(tipo, { nome: f.nome.value.trim(), tel: f.tel?.value || '', end: f.end?.value || '', bairro: f.bairro?.value || '' }, { origem: f.origem.value, pagarNaEntrega: f.pagar?.value || '', ...(enc ? { encomenda: enc } : {}) });
      ir(`pedidos/ver/${c.id}`); setTimeout(() => abrirSeletor(c), 80);
    };
  },
});
function formNovo(tipo) {
  return `<header class="cab-tela"><a class="bt-ico" href="#pedidos" aria-label="Voltar">${ico('voltar')}</a><div><h1>${tipo === 'delivery' ? 'Novo delivery' : 'Novo pedido de balcão'}</h1><p>Depois do cliente, você escolhe os itens</p></div></header>
    <form class="form" data-tipo="${tipo}" novalidate>
      <label class="campo"><span>WhatsApp do cliente</span><input name="tel" inputmode="tel" placeholder="(16) 99999-0000" autocomplete="off"><small data-cli class="mudo"></small></label>
      <label class="campo"><span>Nome do cliente</span><input name="nome" autocomplete="off" required></label>
      ${tipo === 'delivery' ? `
      <label class="campo"><span>Endereço (rua, número, complemento)</span><input name="end" required></label>
      <label class="campo"><span>Bairro</span><select name="bairro" required><option value="">Escolha</option>${db.bairros.map((b) => `<option>${t(b.nome)}</option>`).join('')}</select><small data-taxa class="mudo"></small></label>
      <label class="campo"><span>Paga na entrega com</span><select name="pagar"><option value="">Já pagou / pagar no balcão</option><option>Pix</option><option>Dinheiro</option><option>Cartão (maquininha)</option></select></label>` : ''}
      ${tem('encomendas') ? `<label class="campo"><span>Encomenda para (opcional: deixe vazio se é para agora)</span><input name="para" type="datetime-local"><small class="mudo">Antecedência mínima de ${antecedencia()} horas. A encomenda entra no quadro no dia.</small></label>` : ''}
      <label class="campo"><span>Pedido feito por</span><select name="origem"><option>${tipo === 'delivery' ? 'telefone' : 'balcão'}</option><option>WhatsApp</option><option>Instagram</option><option value="Site">Site (cardápio online)</option>${tipo === 'balcao' ? '<option>telefone</option>' : ''}</select></label>
      <button class="bt cheio grande">Escolher os itens</button></form>`;
}
function verPedido(c) {
  const v = conta(c), rasc = c.itens.filter((i) => i.status === 'rascunho');
  return `<header class="cab-tela"><a class="bt-ico" href="#pedidos" aria-label="Voltar">${ico('voltar')}</a><div><h1>#${c.num} · ${t(c.cliente?.nome || '')}</h1><p>${c.tipo === 'delivery' ? `${t(c.cliente?.end || '')} · ${t(c.cliente?.bairro || '')}` : 'Retirada no balcão'}</p></div></header>
    ${c.senha ? `<div class="senha-grande"><small>Senha</small><b>${c.senha}</b><span>Diga ao cliente: quando aparecer no painel, é só retirar</span>${tem('senha') ? `<button type="button" class="bt" data-acao="chamar-senha" data-c="${c.id}">${ico('sino')}${c.chamada ? 'Chamar de novo no painel' : 'Chamar no painel'}</button>` : ''}</div>` : ''}
    ${c.encomenda?.para ? `<p class="aviso ouro">${ico('calendario')}Encomenda para ${quandoEnc(c.encomenda.para)}${encomendaFutura(c) ? '. Entra no quadro da cozinha no dia.' : ''}</p>` : ''}
    <ul class="itens">${c.itens.map((i) => linhaItem(c, i)).join('')}</ul>
    ${c.emb && tem('embalagem') ? `<p class="mudo emb-saiu">${ico('sacola')}Embalagem que saiu do estoque: ${Object.entries(c.emb).map(([id, q]) => `${q}× ${t(db.insumos.find((x) => x.id === id)?.nome || id)}`).join(', ')}</p>` : ''}
    <section class="totais"><div><span>Itens</span><b>${din(v.sub)}</b></div>${v.entrega ? `<div><span>Entrega</span><b>${din(v.entrega)}</b></div>` : ''}<div class="total"><span>Total</span><b>${din(v.total)}</b></div></section>
    <div class="barra-acoes"><button type="button" class="bt" data-acao="cardapio-pick" data-c="${c.id}">${ico('mais2')}Itens</button>
      ${rasc.length ? `<button type="button" class="bt cheio grande" data-acao="enviar-pedido" data-c="${c.id}">Enviar para a cozinha</button>` : `<a class="bt cheio grande" href="#caixa/${c.id}">Cobrar · ${dinCurto(v.falta)}</a>`}</div>
    <div class="linha-bts" style="margin-top:12px"><button type="button" class="bt" data-acao="via-entrega" data-c="${c.id}">${ico('impressora')}Imprimir a via${c.tipo === 'delivery' ? ' de entrega' : ''}</button></div>
    ${c.cliente?.tel ? `<div class="linha-bts" style="margin-top:12px"><a class="bt zap" href="${zap(c.cliente.tel, msgDe(c, 'confirmado'))}" target="_blank" rel="noopener">${ico('zap')}Confirmar no WhatsApp</a></div>` : ''}`;
}
// chama a senha na TV do balcão: o painel mostra o número grande, toca e fala "Senha 12"
acao('chamar-senha', (b) => { const c = comanda(b.dataset.c); if (!c?.senha) return; c.chamada = Date.now(); grava(); toast(`Senha ${c.senha} chamada no painel`); });
acao('enviar-pedido', (b) => { const c = comanda(b.dataset.c); enviar(c); toast('Enviado para a cozinha'); ir('pedidos'); });
acao('saiu', (b) => {
  const c = comanda(b.dataset.c); if (etapa(c) !== 'preparo_ok') return toast('A cozinha ainda não marcou o pedido como pronto');
  const ents = db.entregadores || [];
  const sair = (eid) => { c.entrega = 'saiu'; c.saiu = Date.now(); c.entregador = eid || ''; c.itens.forEach((i) => { if (i.status === 'pronto') i.status = 'entregue'; }); grava(); };
  if (ents.length && !b.dataset.e) {
    folha({ titulo: `#${c.num}: quem vai levar?`, corpo: `<div class="papeis">${ents.map((e) => `<button type="button" class="papel" data-e="${e.id}"><b>${t(e.nome)}</b><small>${t(e.tel || '')}</small></button>`).join('')}<button type="button" class="papel" data-e="-"><b>Outro / sem anotar</b></button></div>`,
      aoAbrir: (f, fechar) => { f.querySelectorAll('[data-e]').forEach((x) => { x.onclick = () => { fechar(); b.dataset.e = x.dataset.e; sair(x.dataset.e === '-' ? '' : x.dataset.e); aviso(); }; }); } });
    return;
  }
  sair('');
  aviso();
  function aviso() {
  if (c.cliente?.tel) folha({ titulo: `#${c.num} saiu para entrega`, corpo: '<p>Avise o cliente pelo WhatsApp:</p>', pe: `<a class="bt zap grande" href="${zap(c.cliente.tel, msgDe(c, 'saiu'))}" target="_blank" rel="noopener" data-fechar>${ico('zap')}Avisar ${t(c.cliente.nome.split(' ')[0])}</a>` });
  }
});
acao('entregue', (b) => { const c = comanda(b.dataset.c); ir(`caixa/${c.id}`); toast('Confirme o pagamento para fechar o pedido'); });

// via para o entregador (ou para o balcão): endereço, itens, total e como paga
acao('via-entrega', (b) => {
  const c = comanda(b.dataset.c); if (!c) return; const v = conta(c), L = lojaCfg();
  const w = window.open('', '_blank', 'width=380,height=640'); if (!w) return toast('Libere as janelas para imprimir');
  const e = (x) => String(x ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Pedido #${c.num}</title><style>@page{size:80mm auto;margin:4mm}body{font:13px/1.4 system-ui,sans-serif;width:72mm;margin:0}h1{font-size:20px;margin:0}h2{font-size:14px;margin:8px 0 2px}.l{display:flex;justify-content:space-between;gap:6px}hr{border:0;border-top:1px dashed #000;margin:6px 0}small{display:block;color:#333}</style>
    <h1>${e(db.config.nome)}</h1><small>${e(L.endereco || '')}</small><hr><h1>Pedido #${c.num}</h1><small>${new Date(c.aberta).toLocaleString('pt-BR')}</small>
    <h2>${e(c.cliente?.nome || '')}${c.cliente?.tel ? ` · ${e(c.cliente.tel)}` : ''}</h2>${c.tipo === 'delivery' ? `<div>${e(c.cliente?.end || '')}<br>${e(c.cliente?.bairro || '')}</div>` : '<div>Retirada no balcão</div>'}<hr>
    ${itensValidos(c).map((i) => `<div class="l"><span>${i.qtd}× ${e(i.nome)}</span><span>${din(i.qtd * i.preco + (i.adic || []).reduce((s2, a) => s2 + a.preco, 0) * i.qtd)}</span></div>${(i.adic || []).map((a) => `<small>  ${e(a.nome)}</small>`).join('')}${i.obs ? `<small>  ${e(i.obs)}</small>` : ''}`).join('')}<hr>
    ${v.entrega ? `<div class="l"><span>Entrega</span><span>${din(v.entrega)}</span></div>` : ''}${v.desconto ? `<div class="l"><span>Desconto${c.cupom ? ` (${e(c.cupom)})` : ''}</span><span>− ${din(v.desconto)}</span></div>` : ''}<div class="l"><b>Total</b><b>${din(v.total)}</b></div>
    <div class="l"><span>${v.falta <= 0 ? 'Pago' : `A receber${c.pagarNaEntrega ? ': ' + e(c.pagarNaEntrega) : ''}`}</span><span>${v.falta > 0 ? din(v.falta) : ''}</span></div><script>print();setTimeout(()=>close(),400)<\/script>`);
  w.document.close();
});

acao('copiar-link', async () => { const u = new URL(linkCardapio('delivery=1'), location.href).href; try { await navigator.clipboard.writeText(u); toast('Link do cardápio copiado'); } catch { window.open(u, '_blank', 'noopener'); } });
