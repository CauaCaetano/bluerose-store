// Popina · salão do garçom: a fila do que fazer agora (conceito C escolhido pelo dono) + as mesas, e a comanda da mesa.
import { db, t, din, dinCurto, tempo, minutos, prod, comanda, comandaDaMesa, fila, estadoMesa, conta, valorItem, abrirMesa, adicionarItem, enviar,
  mudarStatus, cancelarItem, atenderChamado, confirmarQR, recusarQR, transferir, grava, itensValidos } from './loja.js?v=1';
import { registrar, acao, ir } from './nucleo.js?v=1';
import { ico, folha, toast, confirma, $, $$ } from './ui.js?v=1';
import { OBS_RAPIDAS } from './dados.js?v=1';

const ROTULO = { conta: 'Levar a conta', chamou: 'Chamou o garçom', pronto: 'Prato pronto', qr: 'Pedido pelo QR' };
const COR = { conta: 'ouro', chamou: 'terra', pronto: 'oliva', qr: 'ouro' };
const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const resumoItens = (l) => l.map((i) => `${i.qtd > 1 ? i.qtd + ' ' : ''}${i.nome}`).join(', ');

function cartaoFila(f) {
  const quando = tempo(f.ts);
  if (f.tipo === 'conta') { const v = conta(f.c); return linha(f.tipo, `Mesa ${f.c.mesa}`, `${din(v.total)} · ${f.c.pessoas} pessoas · pediu há ${quando}`, 'Levar', `abrir-conta" data-id="${f.c.id}`); }
  if (f.tipo === 'chamou') return linha(f.tipo, `Mesa ${f.x.mesa}`, `${f.x.origem === 'QR' ? 'pelo cardápio do QR' : 'chamado'} · há ${quando}`, 'Fui', `atender" data-id="${f.x.id}`);
  if (f.tipo === 'pronto') { const onde = f.c.tipo === 'mesa' ? `Mesa ${f.c.mesa}` : `${f.c.tipo === 'delivery' ? 'Delivery' : 'Balcão'} #${f.c.num}`; return linha(f.tipo, onde, `${resumoItens(f.itens)} · pronto há ${quando}`, 'Levei', `levei" data-id="${f.c.id}`); }
  return linha(f.tipo, `Mesa ${f.q.mesa}`, `${resumoItens(f.q.itens.map((i) => ({ qtd: i.qtd, nome: prod(i.prod)?.nome || '' })))} · há ${quando}`, 'Ver', `ver-qr" data-id="${f.q.id}`);
}
const linha = (tipo, titulo, det, bt, acaoAttr) => `<article class="fila-item"><span class="faixa ${COR[tipo]}"></span>
  <div class="fila-txt"><small>${ROTULO[tipo]}</small><b>${t(titulo)}</b><span>${t(det)}</span></div>
  <button type="button" class="bt escuro" data-acao="${acaoAttr}">${bt}</button></article>`;

registrar('salao', {
  titulo: 'Salão', aba: 'salao',
  html() {
    const l = fila(); const n = db.config.mesas;
    const mesas = Array.from({ length: n }, (_, k) => {
      const m = k + 1, e = estadoMesa(m), c = comandaDaMesa(m);
      const det = c ? `<small>${tempo(c.aberta)}</small>` : '';
      return `<a class="mesa ${e}" href="#mesa/${m}" aria-label="Mesa ${m}, ${({ livre: 'livre', ocupada: 'ocupada', pronto: 'com prato pronto', conta: 'pediu a conta', chamou: 'chamou o garçom', qr: 'pedido pelo QR esperando' })[e]}"><b>${m}</b>${det}</a>`;
    }).join('');
    const ocup = db.comandas.filter((c) => c.tipo === 'mesa').length;
    return `<header class="cab-tela"><div><h1>${saudacao()}${db.config.garcons?.[0] ? '' : ''}</h1><p>${l.length ? `${l.length} ${l.length === 1 ? 'coisa' : 'coisas'} para agora` : 'Nada pendente agora. Bom trabalho.'}</p></div>
      <button type="button" class="bt cheio nova" data-acao="nova-comanda">${ico('mais2')}<span>Nova comanda</span></button><button type="button" class="bt-ico grande" data-acao="planta" aria-label="Ver a planta do salão">${ico('planta')}</button></header>
      <section class="fila" aria-label="O que fazer agora">${l.map(cartaoFila).join('') || '<div class="vazio">Quando uma mesa pedir a conta, chamar ou um prato ficar pronto, aparece aqui.</div>'}</section>
      <div class="sec-tit"><h2>Mesas</h2><span>${ocup} de ${n} ocupadas · toque para abrir</span></div>
      <section class="mesas">${mesas}</section>
      <div class="legenda"><span><i class="ocupada"></i>Ocupada</span><span><i class="pronto"></i>Prato pronto</span><span><i class="conta"></i>Conta</span><span><i class="chamou"></i>Chamou</span><span><i class="livre"></i>Livre</span></div>
`;
  },
});

acao('atender', (b) => { const x = db.chamados.find((y) => y.id === b.dataset.id); if (x) { atenderChamado(x); toast(`Mesa ${x.mesa} atendida`); } });
acao('levei', (b) => { const c = comanda(b.dataset.id); if (!c) return; c.itens.filter((i) => i.status === 'pronto').forEach((i) => mudarStatus(c, i, 'entregue')); toast('Marcado como entregue'); });
acao('abrir-conta', (b) => { const c = comanda(b.dataset.id); if (c) ir(`caixa/${c.id}`); });
acao('ver-qr', (b) => {
  const q = db.pedidosQR.find((x) => x.id === b.dataset.id); if (!q) return;
  // mostra o item como vai para a comanda: meia a meia, adicionais e observação
  const itens = q.itens.map((i) => { const p = prod(i.prod), b = i.meia && prod(i.meia.b), ad = i.adic || [];
    const nome = b ? `Pizza meia ${p.nome.replace(/^Pizza /, '')} / meia ${b.nome.replace(/^Pizza /, '')}` : p?.nome || '';
    const preco = (b ? Math.max(p.preco, b.preco) : p?.preco || 0) + ad.reduce((s, a) => s + a.preco, 0);
    return `<li><b>${i.qtd}×</b><span style="margin:0;font-weight:400;flex:1">${t(nome)}${ad.length ? `<small>+ ${ad.map((a) => t(a.nome)).join(', ')}</small>` : ''}${i.obs ? `<small>${t(i.obs)}</small>` : ''}</span><span>${din(preco * i.qtd)}</span></li>`; }).join('');
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
const STATUS = { rascunho: ['A enviar', 'rasc'], novo: ['Na fila', 'novo'], preparo: ['Preparando', 'prep'], pronto: ['Pronto', 'pronto'], entregue: ['Entregue', 'ok'] };
export function linhaItem(c, i, editavel = true) {
  const [rot, cls] = STATUS[i.status] || ['', ''];
  const extras = [i.obs, ...(i.adic || []).map((a) => `+ ${a.nome}`)].filter(Boolean).join(' · ');
  return `<li class="item ${i.cancelado ? 'cancelado' : ''}"><div class="item-q">${i.qtd}×</div><div class="item-txt"><b>${t(i.nome)}</b>${extras ? `<small>${t(extras)}</small>` : ''}${i.cancelado ? `<small class="erro">Cancelado${i.cancelado.motivo ? ': ' + t(i.cancelado.motivo) : ''}</small>` : ''}</div>
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
    return `<header class="cab-tela"><a class="bt-ico" href="#salao" aria-label="Voltar">${ico('voltar')}</a><div><h1>Mesa ${n}</h1><p>${c.pessoas} pessoas · aberta há ${tempo(c.aberta)}${c.garcom ? ` · ${t(c.garcom)}` : ''}</p></div>
        <button type="button" class="bt-ico" data-acao="mesa-menu" data-c="${c.id}" aria-label="Mais opções da mesa">${ico('mais')}</button></header>
      ${c.pediuConta ? `<div class="aviso ouro">${ico('conta')}Pediu a conta há ${tempo(c.pediuConta)}</div>` : ''}
      ${rasc.length ? `<section class="bloco"><div class="sec-tit"><h2>A enviar</h2><span>${rasc.length} ${rasc.length === 1 ? 'item' : 'itens'}</span></div><ul class="itens">${rasc.map((i) => linhaItem(c, i)).join('')}</ul></section>` : ''}
      <section class="bloco"><div class="sec-tit"><h2>Já pedido</h2><span>${enviados.length ? '' : 'nada ainda'}</span></div><ul class="itens">${enviados.map((i) => linhaItem(c, i)).join('')}</ul></section>
      <section class="totais"><div><span>Consumo</span><b>${din(v.sub)}</b></div>${c.servico ? `<div><span>Serviço ${db.config.servico}%</span><b>${din(v.servico)}</b></div>` : ''}<div class="total"><span>Total</span><b>${din(v.total)}</b></div></section>
      <div class="barra-acoes">
        <button type="button" class="bt" data-acao="cardapio-pick" data-c="${c.id}">${ico('mais2')}Itens</button>
        ${rasc.length ? `<button type="button" class="bt cheio grande" data-acao="enviar" data-c="${c.id}">Enviar para a cozinha (${rasc.reduce((s, i) => s + i.qtd, 0)})</button>`
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
      ${p.foto ? `<img src="${t(p.foto)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span><b>${t(p.nome)}</b><em>${p.ativo ? din(p.preco) : 'Esgotado'}</em></span></button>`).join('');
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
  let qtd = 1, adic = [], obs = [], meiaB = '';
  const pizzas = db.produtos.filter((x) => x.pizza && x.ativo && x.id !== p.id);
  folha({ titulo: p.nome, corpo: `${p.desc ? `<p class="mudo">${t(p.desc)}</p>` : ''}
    ${p.pizza ? `<div class="campo"><span>Meia a meia (opcional)</span><div class="chips quebra">${pizzas.map((x) => `<button type="button" class="chip" data-meia="${x.id}">½ ${t(x.nome.replace(/^Pizza /, ''))}</button>`).join('')}</div><small class="mudo">Cobra o sabor mais caro.</small></div>` : ''}
    ${p.adicionais?.length ? `<div class="campo"><span>Adicionais</span><div class="chips quebra">${p.adicionais.map((a, k) => `<button type="button" class="chip" data-ad="${k}">${t(a.nome)} +${din(a.preco)}</button>`).join('')}</div></div>` : ''}
    <div class="campo"><span>Observação</span><div class="chips quebra">${OBS_RAPIDAS.map((o) => `<button type="button" class="chip" data-obs="${t(o)}">${t(o)}</button>`).join('')}</div>
      <input data-obs-livre placeholder="Outra observação" aria-label="Outra observação"></div>
    <div class="qtd"><button type="button" class="bt-ico grande" data-menos aria-label="Menos">−</button><b data-q>1</b><button type="button" class="bt-ico grande" data-mais aria-label="Mais">+</button></div>`,
  pe: `<button type="button" class="bt cheio grande" data-add>Adicionar · ${din(p.preco)}</button>`,
  aoAbrir: (f, fechar) => {
    const preco = () => { const base = meiaB ? Math.max(p.preco, prod(meiaB).preco) : p.preco; return (base + adic.reduce((s, a) => s + a.preco, 0)) * qtd; };
    const atual = () => { $('[data-q]', f).textContent = qtd; $('[data-add]', f).textContent = `Adicionar · ${din(preco())}`; };
    $('[data-menos]', f).onclick = () => { qtd = Math.max(1, qtd - 1); atual(); };
    $('[data-mais]', f).onclick = () => { qtd++; atual(); };
    $$('[data-meia]', f).forEach((b) => { b.onclick = () => { meiaB = meiaB === b.dataset.meia ? '' : b.dataset.meia; $$('[data-meia]', f).forEach((x) => x.classList.toggle('on', x.dataset.meia === meiaB)); atual(); }; });
    $$('[data-ad]', f).forEach((b) => { b.onclick = () => { const a = p.adicionais[b.dataset.ad]; const on = b.classList.toggle('on'); adic = on ? [...adic, a] : adic.filter((x) => x !== a); atual(); }; });
    $$('[data-obs]', f).forEach((b) => { b.onclick = () => { const on = b.classList.toggle('on'); obs = on ? [...obs, b.dataset.obs] : obs.filter((x) => x !== b.dataset.obs); }; });
    $('[data-add]', f).onclick = () => {
      const livre = $('[data-obs-livre]', f).value.trim();
      adicionarItem(c, { prodId: p.id, qtd, adic, obs: [...obs, livre].filter(Boolean).join(', '), meia: meiaB ? { a: p.id, b: meiaB } : null });
      fechar(); toast(`${qtd}× ${p.nome} na comanda`); depois?.();
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
