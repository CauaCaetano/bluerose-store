// Popina · caixa: contas abertas, fechar conta (serviço, desconto, dividir, pagar em partes), Pix com QR e o caixa do dia.
import { db, t, din, dinCurto, tempo, comanda, conta, valorItem, itensValidos, pagar, fechar, partes, novoPedido, venderDireto, caixaResumo, abrirCaixa, movimento, fecharCaixa, grava, r2,
  temCouvert, lojaCfg, marcar, darDesconto, regras, temPin, quemAgora, cancelarVenda, reabrirVenda, vendaDeHoje, ondeComanda, couvertLigado, tem, fidelidade, clientePorTel, darPremio } from './loja.js?v=28';
import { registrar, acao, ir } from './nucleo.js?v=28';
import { ico, folha, toast, confirma, autorizar, $, $$ } from './ui.js?v=28';
import { pix } from './pix.js?v=28';
import { qrSVG } from '../base/qr.js';
import { linhaItem, abrirSeletor } from './salao.js?v=28';
import { vencePremio } from './loja.js?v=28';
import { dividirPorPessoa, linhasRodizio, cnpjValido, fmtCnpj, ymd } from './precos.js?v=28';
import { FORMA_FIADO, pedirFiado, novaConta } from './financeiro.js?v=28';

// conta faturada para empresa (função ligada): fecha com CNPJ e razão social e vira conta a receber
// (o fluxo de caixa deve tratar esta forma como o fiado: entra quando a conta a receber for paga, não na venda)
export const FORMA_FATURADO = 'Faturado (empresa)';
const FORMAS_BASE = [['Dinheiro', 'dinheiro'], ['Pix', 'pix'], ['Cartão de débito', 'cartao'], ['Cartão de crédito', 'cartao'], [FORMA_FIADO, 'conta']];
const FORMAS_ = () => (tem('faturado') ? [...FORMAS_BASE, [FORMA_FATURADO, 'conta']] : FORMAS_BASE);
const FORMAS = { map: (f) => FORMAS_().map(f) };
const ONDE = (c) => ondeComanda(c);
const ICO_TIPO = { mesa: 'mesa', delivery: 'moto', cartao: 'cartao', evento: 'coroa' };
// cartão fidelidade no fechamento: carimbos do cliente pelo telefone e o prêmio quando completa
function blocoFidelidade(c) {
  if (!tem('fidelidade')) return '';
  const F = fidelidade(), x = clientePorTel(c.cliente?.tel), n = x?.carimbos || 0;
  if (!x) return `<div class="fidel-cx"><b>${ico('etiqueta')}Cartão fidelidade</b><div class="fidel-tel"><input data-fidel-tel inputmode="tel" placeholder="WhatsApp do cliente" aria-label="WhatsApp do cliente para o cartão fidelidade" value="${t(c.cliente?.tel || '')}"><button type="button" class="bt" data-acao="fidel-tel" data-c="${c.id}">Usar</button></div><small class="mudo">Com o telefone, esta compra ganha carimbo${F.minimo ? ` (a partir de ${dinCurto(F.minimo)})` : ''}.</small></div>`;
  return `<div class="fidel-cx"><b>${ico('etiqueta')}Cartão fidelidade · ${t(x.nome || '')}</b><div class="carimbos" aria-label="${n} de ${F.compras} carimbos">${Array.from({ length: F.compras }, (_, k) => `<i class="${k < n ? 'on' : ''}"></i>`).join('')}</div>
    <small>${n} de ${F.compras} carimbos${n >= F.compras ? (vencePremio(x, F) && Date.now() > vencePremio(x, F) ? ` · o prêmio venceu em ${new Date(vencePremio(x, F)).toLocaleDateString('pt-BR')}` : ` · prêmio liberado: ${t(F.premio)}${vencePremio(x, F) ? ` (vale até ${new Date(vencePremio(x, F)).toLocaleDateString('pt-BR')})` : ''}`) : ''}</small>${n >= F.compras && !(vencePremio(x, F) && Date.now() > vencePremio(x, F)) ? `<button type="button" class="bt cheio" data-acao="dar-premio" data-tel="${t(x.tel)}">${ico('check')}Dar prêmio</button>` : ''}<button type="button" class="link" data-acao="fidel-hist" data-tel="${t(x.tel)}">Histórico</button></div>`;
}
acao('fidel-tel', (b) => { const c = comanda(b.dataset.c), tel = String($('[data-fidel-tel]')?.value || '').replace(/\D/g, ''); if (!c) return; if (tel.length < 10) return toast('Escreva o WhatsApp com DDD'); c.cliente = { ...(c.cliente || {}), tel, nome: c.cliente?.nome || clientePorTel(tel)?.nome || '' }; grava(); toast(clientePorTel(tel) ? 'Cliente encontrado' : 'Cliente novo: o cartão começa nesta compra'); });
acao('dar-premio', async (b) => { const x = clientePorTel(b.dataset.tel); if (!x) return; if (!(await confirma(`Entregar o prêmio (${fidelidade().premio}) e zerar o cartão de ${x.nome || 'cliente'}?`, 'Dar prêmio'))) return; if (darPremio(x)) toast('Prêmio entregue. O cartão recomeçou.'); });
const abertas = () => db.comandas.slice().sort((a, b) => (b.pediuConta ? 1 : 0) - (a.pediuConta ? 1 : 0) || a.aberta - b.aberta);

function painelCaixa() {
  const hist = (db.fechamentos || []).length ? `<button type="button" class="link cx-hist" data-acao="historico-caixas">${ico('relogio')}Histórico de caixas (${db.fechamentos.length})</button>` : '';
  if (!db.caixa) return `<section class="cartao-caixa fechado"><div><b>Caixa fechado</b><p>Abra o caixa com o troco para começar o dia.</p></div><button type="button" class="bt cheio" data-acao="abrir-caixa">Abrir caixa</button></section>${hist}`;
  const r = caixaResumo();
  const IF = { Dinheiro: 'dinheiro', Pix: 'pix' };
  return `<section class="cartao-caixa"><div class="cc-topo"><img class="cx-louro" src="img/k-louro-esq.webp?v=1" alt="" width="56" height="74"><div><small>Caixa aberto há ${tempo(db.caixa.aberto)}${db.caixa.operador ? ` · ${t(db.caixa.operador)}` : ''}</small><b>${din(r.total)}</b><span>${r.vendas.length} vendas hoje</span></div><img class="cx-louro" src="img/k-louro-dir.webp?v=1" alt="" width="56" height="74"></div>
    <div class="cc-bts"><button type="button" class="bt" data-acao="mov" data-t="sangria" title="Sangria: tirar dinheiro da gaveta">Tirar dinheiro</button><button type="button" class="bt" data-acao="mov" data-t="suprimento" title="Suprimento: pôr dinheiro (troco) na gaveta">Pôr dinheiro</button><button type="button" class="bt escuro" data-acao="fechar-caixa">Fechar caixa</button></div>
    <div class="cc-formas">${Object.entries(r.porForma).map(([f, v]) => `<div>${ico(IF[f] || 'cartao')}<span>${t(f)}</span><b>${din(v)}</b></div>`).join('') || '<div><span>Sem vendas ainda</span></div>'}<div title="Troco ${dinCurto(db.caixa?.troco || 0)} + dinheiro ${dinCurto(r.porForma.Dinheiro || 0)}${r.suprimento ? ` + suprimento ${dinCurto(r.suprimento)}` : ''}${r.sangria ? ` − sangria ${dinCurto(r.sangria)}` : ''}">${ico('cofre')}<span>Na gaveta</span><b>${din(r.dinheiroNaGaveta)}</b></div></div></section>${hist}`;
}
function listaContas(sel) {
  return abertas().map((c) => { const v = conta(c);
    return `<a class="conta-linha ${c.id === sel ? 'on' : ''} ${c.pediuConta ? 'pediu' : ''}" href="#caixa/${c.id}"><i class="cl-ico">${ico(ICO_TIPO[c.tipo] || 'sacola')}</i><div><b>${ONDE(c)}</b><small>${c.tipo === 'mesa' ? `${c.pessoas} pessoas · ` : c.cliente?.nome ? t(c.cliente.nome) + ' · ' : ''}${tempo(c.aberta)}${c.pediuConta ? ' · pediu a conta' : ''}</small></div><span>${din(v.total)}</span>${ico('dir')}</a>`; }).join('') || '<div class="vazio">Nenhuma conta aberta agora. As mesas abertas pelo garçom aparecem aqui sozinhas.</div>';
}
function detalhe(c) {
  const v = conta(c), it = itensValidos(c);
  return `<div class="conta-det"><header class="cab-conta"><a class="bt-ico so-cel" href="#caixa" aria-label="Voltar">${ico('voltar')}</a><h1 class="fita">${ONDE(c)}</h1><p>${c.tipo === 'mesa' ? `${c.pessoas} pessoas · ` : ''}aberta há ${tempo(c.aberta)}</p><img class="cx-aqueduto" src="img/aqueduto.webp?v=2" alt="" width="340" height="88"></header>
    ${c.perdido ? `<p class="aviso perdido">${ico('alerta')}Cartão ${c.cartao} perdido: bloqueado para novos lançamentos${v.perdido ? `; a taxa de ${din(v.perdido)} já está na conta` : ''}.</p>` : ''}
    ${navigator.onLine ? '' : '<p class="aviso ouro">Sem internet: o pagamento fica guardado neste aparelho e vai para os outros quando a conexão voltar. Não cobre esta conta em outro caixa até lá.</p>'}
    <ul class="itens">${c.itens.map((i) => linhaItem(c, i, false)).join('')}</ul>
    <section class="totais">
      <div><span>Consumo (${it.reduce((s, i) => s + i.qtd, 0)} itens)</span><b>${din(v.sub)}</b></div>
      ${v.rodizio ? `<div><span>Rodízio (${c.pessoas} pessoas)</span><b>${din(v.rodizio)}</b></div>${linhasRodizio(lojaCfg().rodizio, c.rodizio).map((x) => `<div class="rod-detalhe"><span>${x.qtd} ${x.nome} × ${x.preco ? dinCurto(x.preco) : 'sem cobrança'}</span><b>${dinCurto(x.total)}</b></div>`).join('')}` : ''}
      ${v.pacote ? `<div><span>Pacote do evento (${v.presentes} convidados)</span><b>${din(v.pacote)}</b></div>` : ''}
      ${v.ingresso ? `<div><span>Entrada${c.ingresso?.nome ? ` · ${t(c.ingresso.nome)}` : ''}</span><b>${din(v.ingresso)}</b></div>` : ''}
      ${c.consumacao ? `<div><span>Crédito de consumação</span><b>${din(c.consumacao)}</b></div><div><span>Consumido</span><b>${din(Math.min(v.sub, c.consumacao))}</b></div><div><span>${v.consumacao ? 'Saldo a cobrar (não consumido)' : 'Consumação mínima atingida'}</span><b>${v.consumacao ? din(v.consumacao) : ''}</b></div>` : ''}
      ${v.perdido ? `<div><span>Taxa do cartão perdido</span><b>${din(v.perdido)}</b></div>` : ''}
      ${['mesa', 'cartao', 'evento'].includes(c.tipo) ? `<div><label class="interruptor"><input type="checkbox" data-acao="servico" data-c="${c.id}" ${c.servico ? 'checked' : ''}><span></span>Serviço ${db.config.servico}%</label><b>${din(v.servico)}</b></div>` : ''}
      ${c.evento && v.couvert ? `<div><span>Couvert artístico</span><b>${din(v.couvert)}</b></div>` : ''}
      ${(c.tipo === 'mesa' || c.tipo === 'cartao') && couvertLigado() && Number(lojaCfg().couvert) > 0 ? `<div><label class="interruptor"><input type="checkbox" data-acao="couvert" data-c="${c.id}" ${temCouvert(c) ? 'checked' : ''}><span></span>Couvert (${c.pessoas} × ${dinCurto(lojaCfg().couvert)})</label><b>${din(v.couvert)}</b></div>` : ''}
      ${v.entrega ? `<div><span>Entrega (${t(c.cliente?.bairro || '')})</span><b>${din(v.entrega)}</b></div>` : ''}
      <div><button type="button" class="link" data-acao="desconto" data-c="${c.id}">${v.desconto ? `Desconto${c.descontoInfo?.motivo ? ` (${t(c.descontoInfo.motivo)})` : c.cupom ? ` (${t(c.cupom)})` : ''}` : '+ Desconto'}</button><b>${v.desconto ? '− ' + din(v.desconto) : ''}</b></div>
      <div class="total"><span>Total</span><b>${din(v.total)}</b></div>
      ${v.pago ? `<div class="pago"><span>Já pago (${c.pagamentos.map((p) => t(p.forma)).join(', ')})</span><b>${din(v.pago)}</b></div><div class="total falta"><span>Falta</span><b>${din(v.falta)}</b></div>` : ''}
    </section>
    ${blocoFidelidade(c)}
    <div class="dividir"><button type="button" class="bt" data-acao="dividir" data-c="${c.id}">${ico('divide')}Dividir a conta</button><button type="button" class="bt" data-acao="imprimir-conta" data-c="${c.id}">${ico('impressora')}Imprimir a conta</button></div>
    ${v.falta <= 0.009 ? `<h2 class="h2-pagar">Tudo pago</h2><button type="button" class="bt cheio grande" style="width:100%" data-acao="concluir" data-c="${c.id}">${ico('check')}Concluir ${c.tipo === 'mesa' ? 'e liberar a mesa' : 'o pedido'}</button></div>` : `<h2 class="h2-pagar"><img src="img/c-louro-esq.webp?v=1" alt="" width="30" height="31">Receber ${din(v.falta)}<img src="img/c-louro-dir.webp?v=1" alt="" width="30" height="31"></h2>
    <div class="formas">${FORMAS.map(([f, i]) => `<button type="button" class="forma" data-acao="pagar" data-c="${c.id}" data-f="${f}">${ico(i)}<span>${f}</span></button>`).join('')}</div></div>`}`;
}
registrar('caixa', {
  titulo: 'Caixa', aba: 'caixa',
  html(id) {
    const c = id ? comanda(id) : null;
    return `<div class="caixa ${c ? 'com-det' : ''}"><div class="caixa-lista">
        <header class="cab-tela cab-caixa"><div><h1><img src="img/k-louro-esq.webp?v=1" alt="" width="56" height="74">Caixa<img src="img/k-louro-dir.webp?v=1" alt="" width="56" height="74"></h1><p>${db.comandas.length} contas abertas</p></div><button type="button" class="bt cheio" data-acao="venda-rapida">${ico('mais2')}Venda rápida</button></header>
        ${painelCaixa()}<h2 class="cx-h2" title="Quem pediu a conta aparece primeiro"><img src="img/c-louro-esq.webp?v=1" alt="" width="30" height="31">Contas abertas<img src="img/c-louro-dir.webp?v=1" alt="" width="30" height="31"></h2><nav class="contas">${listaContas(c?.id)}</nav></div>
      <div class="caixa-det">${c ? detalhe(c) : '<div class="vazio grande"><b>Toque numa conta para cobrar.</b><br>Quem pediu a conta aparece primeiro na lista. Para vender sem mesa, use “Venda rápida”.</div>'}</div></div>`;
  },
});
acao('servico', (b) => { const c = comanda(b.dataset.c); c.servico = b.checked ?? !c.servico; marcar(c, 'servico', c.servico ? 'Voltou a cobrar o serviço' : 'Tirou o serviço'); grava(); });
acao('couvert', (b) => { const c = comanda(b.dataset.c); c.couvert = b.checked ?? !temCouvert(c); marcar(c, 'couvert', c.couvert ? 'Voltou a cobrar o couvert' : 'Tirou o couvert'); grava(); });
export const MOTIVOS_DESCONTO = ['Cortesia da casa', 'Cliente frequente', 'Demora no pedido', 'Prato com problema', 'Aniversário'];
// desconto: motivo obrigatório; acima do limite (padrão 10%) pede o PIN do gerente, se houver
acao('desconto', (b) => {
  const c = comanda(b.dataset.c); if (!c) return;
  const lim = Number(regras().limiteDesconto) || 0, sub = conta(c).sub, motAtual = c.descontoInfo?.motivo || '';
  folha({ titulo: 'Desconto', corpo: `<label class="campo"><span>Valor do desconto (R$)</span><input data-v inputmode="decimal" value="${c.desconto ? String(c.desconto).replace('.', ',') : ''}" placeholder="0,00"></label>
    <div class="chips">${[5, 10, 15].map((p) => `<button type="button" class="chip" data-p="${p}">${p}% (${din(sub * p / 100)})</button>`).join('')}</div>
    <div class="campo" style="margin-top:14px"><span>Motivo (obrigatório)</span><div class="chips quebra">${MOTIVOS_DESCONTO.map((m) => `<button type="button" class="chip ${m === motAtual ? 'on' : ''}" data-mot="${t(m)}">${t(m)}</button>`).join('')}</div>
      <input data-motivo maxlength="140" value="${t(motAtual)}" placeholder="Ou escreva o motivo" aria-label="Motivo do desconto"></div>
    <p class="mudo" data-lim>${temPin() ? `Acima de ${lim}% pede o PIN do gerente.` : ''}</p>`,
  pe: `${c.desconto ? '<button type="button" class="bt" data-tira>Tirar desconto</button>' : ''}<button type="button" class="bt cheio grande" data-ok>Aplicar</button>`,
  aoAbrir: (f, fechar) => {
    $$('[data-p]', f).forEach((x) => { x.onclick = () => { $('[data-v]', f).value = String(r2(sub * x.dataset.p / 100)).replace('.', ','); }; });
    $$('[data-mot]', f).forEach((x) => { x.onclick = () => { $$('[data-mot]', f).forEach((y) => y.classList.toggle('on', y === x)); $('[data-motivo]', f).value = x.dataset.mot; }; });
    $('[data-tira]', f)?.addEventListener('click', () => { darDesconto(c, 0); fechar(); toast('Desconto tirado'); });
    $('[data-ok]', f).onclick = async () => {
      const valor = r2(Number(String($('[data-v]', f).value).replace(',', '.')) || 0), motivo = $('[data-motivo]', f).value.trim();
      if (!valor) { if (c.desconto) darDesconto(c, 0); return fechar(); }
      if (valor > sub) return toast('O desconto é maior que o consumo');
      if (motivo.length < 3) { toast('Escolha ou escreva o motivo do desconto'); return $('[data-motivo]', f).focus(); }
      const pct = sub ? (valor / sub) * 100 : 100; let pin = false;
      if (pct > lim + 0.001 && temPin()) {
        fechar();
        const r = await autorizar({ titulo: 'PIN do gerente', texto: `Desconto de ${Math.round(pct * 10) / 10}% (${din(valor)}) passa do limite de ${lim}%.`, pedirPin: true, sim: 'Autorizar' });
        if (!r) return; pin = true;
      } else fechar();
      darDesconto(c, valor, motivo, quemAgora(c, pin)); toast(`Desconto de ${din(valor)} aplicado`);
    };
  } });
});
// dividir: igual entre N pessoas, ou por pessoa (os itens de cada um, um item dividido entre várias, valor livre, gorjeta e a forma de cada um)
// o que cada pessoa pagou fica no pagamento (pessoa, itens); item já pago não muda de dono, e quem pagou não é cobrado de novo
const FORMAS_DIV = ['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito'];
acao('dividir', (b) => abrirDivisao(comanda(b.dataset.c)));
function abrirDivisao(c) {
  if (!c || !db.comandas.includes(c)) return;
  const v = conta(c), its = itensValidos(c), D = c.divisao ? JSON.parse(JSON.stringify(c.divisao)) : { id: Date.now().toString(36), n: c.pessoas || 2, atrib: {}, livre: {}, gorjeta: {}, formas: {} };
  let n = Math.max(2, D.n || 2), modo = c.divisao ? 'pessoas' : 'igual';
  // consumo da mesa e individual: o que o garçom marcou já vem dividido (da mesa = todos; de uma pessoa = só ela)
  const marcados = tem('consumoMesa') && its.some((i) => i.daMesa || i.pessoa);
  if (marcados && !c.divisao) { modo = 'pessoas'; its.forEach((i) => { if (i.daMesa) D.atrib[i.id] = Array.from({ length: n }, (_, k) => k); else if (i.pessoa && i.pessoa <= n) D.atrib[i.id] = [i.pessoa - 1]; }); }
  const pagoDe = (k) => (c.pagamentos || []).filter((p) => p.divisao === D.id && p.pessoa === k + 1);
  const travados = new Set((c.pagamentos || []).flatMap((p) => p.itens || []));
  const minN = Math.max(2, ...(c.pagamentos || []).filter((p) => p.divisao === D.id).map((p) => p.pessoa || 0));
  const fator = v.sub > 0 ? v.total / v.sub : 1;
  const calc = () => dividirPorPessoa({ itens: its.map((i) => ({ id: i.id, valor: valorItem(i) })), atrib: D.atrib, n, fator, livre: D.livre, gorjeta: D.gorjeta });
  const htmlItens = () => its.map((i) => { const tr = travados.has(i.id), sel = D.atrib[i.id] || [];
    return `<li><div><span>${i.qtd}× ${t(i.nome)}</span><b>${din(valorItem(i))}</b>${tr ? '<small class="mudo">já pago</small>' : sel.length === n && n > 1 ? '<small class="mudo">da mesa: dividido entre todos</small>' : sel.length > 1 ? `<small class="mudo">dividido em ${sel.length}</small>` : ''}</div>
      <div class="chips div-ps" role="group" aria-label="Quem consumiu ${t(i.nome)}"><button type="button" class="chip todos ${sel.length === n ? 'on' : ''}" data-it="${i.id}" data-k="todos" ${tr ? 'disabled' : ''} aria-pressed="${sel.length === n}">Mesa</button>${Array.from({ length: n }, (_, k) => `<button type="button" class="chip ${sel.includes(k) ? 'on' : ''}" data-it="${i.id}" data-k="${k}" ${tr ? 'disabled' : ''} aria-pressed="${sel.includes(k)}">${k + 1}</button>`).join('')}</div></li>`; }).join('');
  const htmlPessoas = () => { const R = calc(); return R.pessoas.map((p) => { const pg = pagoDe(p.k), forma = D.formas[p.k] || 'Pix';
    return `<div class="div-pessoa ${pg.length ? 'pago' : ''}"><div class="div-cab"><b>Pessoa ${p.k + 1}</b><small>${p.itens.length ? `${p.itens.length} ${p.itens.length === 1 ? 'item' : 'itens'} · ${dinCurto(p.base)} com serviço` : 'sem itens marcados'}</small></div>
      ${pg.length ? `<p class="ok-txt">${ico('check')}Pagou ${pg.map((x) => `${dinCurto(x.valor)}${x.gorjeta ? ` + ${dinCurto(x.gorjeta)} de gorjeta` : ''} em ${t(x.forma)}`).join(', ')}</p>` : `
      <div class="duas-c"><label class="campo"><span>Valor livre (R$)</span><input data-livre="${p.k}" inputmode="decimal" value="${D.livre[p.k] != null && D.livre[p.k] !== '' ? String(D.livre[p.k]).replace('.', ',') : ''}" placeholder="${dinCurto(p.base)}"></label>
        <label class="campo"><span>Gorjeta (R$)</span><input data-gorj="${p.k}" inputmode="decimal" value="${D.gorjeta[p.k] ? String(D.gorjeta[p.k]).replace('.', ',') : ''}" placeholder="0,00"></label></div>
      <div class="chips quebra">${FORMAS_DIV.map((f) => `<button type="button" class="chip ${f === forma ? 'on' : ''}" data-fk="${p.k}" data-f="${t(f)}">${t(f)}</button>`).join('')}</div>
      <button type="button" class="bt cheio" data-cobrar="${p.k}">Cobrar ${din(p.cobrar)}</button>`}</div>`; }).join(''); };
  const resto = () => { const R = calc(), falta = conta(c).falta, aPagar = r2(R.pessoas.filter((p) => !pagoDe(p.k).length).reduce((s, p) => s + p.valor, 0));
    return `Falta na conta: <b>${din(falta)}</b>${R.semDono.length ? ` · sem dono: <b>${din(R.semDonoValor)}</b> (${R.semDono.length} ${R.semDono.length === 1 ? 'item' : 'itens'})` : ''}${Math.abs(aPagar - falta) > 0.009 && !R.semDono.length ? ` · as partes somam ${din(aPagar)}` : ''}`; };
  folha({ titulo: 'Dividir a conta', larga: true, corpo: `<div class="seg grande" role="group"><button type="button" aria-pressed="${modo === 'igual'}" data-modo="igual">Igual</button><button type="button" aria-pressed="${modo === 'pessoas'}" data-modo="pessoas">Por pessoa</button></div>
    <div data-igual ${modo === 'igual' ? '' : 'hidden'}><div class="qtd"><button type="button" class="bt-ico grande" data-menos>−</button><b data-n>${n}</b><button type="button" class="bt-ico grande" data-mais>+</button></div><p class="centro" data-parte></p>
      <button type="button" class="bt cheio grande" style="width:100%" data-cobrar-igual>Cobrar uma parte</button></div>
    <div data-pessoas ${modo === 'pessoas' ? '' : 'hidden'}><div class="qtd"><button type="button" class="bt-ico grande" data-pmenos>−</button><b data-pn>${n} pessoas</b><button type="button" class="bt-ico grande" data-pmais>+</button></div>
      <p class="mudo">Toque no número de quem consumiu cada item. Marcar mais de um divide o item entre eles. Serviço e couvert entram na proporção.</p>
      ${v.sub > 0 ? '' : '<p class="aviso ouro">Esta conta não tem itens com preço: use “Igual” ou o valor livre de cada pessoa.</p>'}
      <ul class="itens div-itens" data-lista>${htmlItens()}</ul><div class="div-pessoas" data-cards>${htmlPessoas()}</div><p class="centro div-resto" data-resto>${resto()}</p></div>`,
  aoFechar: () => { if (db.comandas.includes(c) && Object.keys(D.atrib).length) { D.n = n; c.divisao = D; grava(); } },
  aoAbrir: (f, fechar) => {
    const igual = () => { $('[data-n]', f).textContent = n; $('[data-parte]', f).innerHTML = `${n} partes de <b>${din(partes(conta(c).falta, n)[0])}</b>`; };
    const tudo = () => { $('[data-pn]', f).textContent = `${n} pessoas`; $('[data-lista]', f).innerHTML = htmlItens(); $('[data-cards]', f).innerHTML = htmlPessoas(); $('[data-resto]', f).innerHTML = resto(); };
    const totais = () => { const R = calc(); R.pessoas.forEach((p) => { const bt = $(`[data-cobrar="${p.k}"]`, f); if (bt) bt.textContent = `Cobrar ${din(p.cobrar)}`; }); $('[data-resto]', f).innerHTML = resto(); };
    $('[data-menos]', f).onclick = () => { n = Math.max(2, n - 1); igual(); }; $('[data-mais]', f).onclick = () => { n++; igual(); };
    $('[data-pmenos]', f).onclick = () => { if (n <= minN) return toast('Quem já pagou continua na divisão'); n--; Object.keys(D.atrib).forEach((id) => { D.atrib[id] = D.atrib[id].filter((k) => k < n); }); tudo(); };
    $('[data-pmais]', f).onclick = () => { if (n >= 30) return; n++; if (marcados) its.forEach((i) => { if (i.daMesa && (D.atrib[i.id] || []).length === n - 1) D.atrib[i.id] = Array.from({ length: n }, (_, k) => k); }); tudo(); };
    $$('[data-modo]', f).forEach((x) => { x.onclick = () => { modo = x.dataset.modo; $$('[data-modo]', f).forEach((y) => y.setAttribute('aria-pressed', String(y === x))); $('[data-igual]', f).hidden = modo !== 'igual'; $('[data-pessoas]', f).hidden = modo !== 'pessoas'; if (modo === 'igual') igual(); else tudo(); }; });
    f.addEventListener('click', (e) => {
      const it = e.target.closest('[data-it]');
      if (it && !it.disabled) {
        const id = it.dataset.it, l = D.atrib[id] || [];
        // "Mesa": o item é de todos (divide igual); tocar de novo tira
        if (it.dataset.k === 'todos') { D.atrib[id] = l.length === n ? [] : Array.from({ length: n }, (_, k) => k); return tudo(); }
        const k = Number(it.dataset.k); D.atrib[id] = l.includes(k) ? l.filter((x) => x !== k) : [...l, k].sort((a, b) => a - b); return tudo();
      }
      const fk = e.target.closest('[data-fk]');
      if (fk) { D.formas[fk.dataset.fk] = fk.dataset.f; $$(`[data-fk="${fk.dataset.fk}"]`, f).forEach((y) => y.classList.toggle('on', y === fk)); return; }
      const cb = e.target.closest('[data-cobrar]');
      if (cb) {
        const k = Number(cb.dataset.cobrar), R = calc(), p = R.pessoas[k], falta = conta(c).falta; if (pagoDe(k).length) return;
        const abertas = R.pessoas.filter((x) => !pagoDe(x.k).length && x.valor > 0);
        // a última pessoa, com tudo dividido e sem valor livre, paga exatamente o que falta (os centavos não sobram)
        let valor = abertas.length === 1 && abertas[0].k === k && !R.semDono.length && p.livre == null ? falta : Math.min(p.valor, falta);
        valor = r2(valor); if (!(valor > 0)) return toast('Nada a cobrar desta pessoa');
        D.n = n; c.divisao = D; grava(); fechar();
        receberParte(c, D.formas[k] || 'Pix', valor, { pessoa: k + 1, divisao: D.id, itens: p.itens.map((x) => x.id), ...(p.gorjeta ? { gorjeta: p.gorjeta } : {}) }, () => abrirDivisao(c));
      }
    });
    f.addEventListener('input', (e) => {
      const x = e.target, val = String(x.value).trim(), nr = r2(Number(val.replace(/\./g, '').replace(',', '.')) || 0);
      if (x.dataset.livre != null) { if (val === '') delete D.livre[x.dataset.livre]; else D.livre[x.dataset.livre] = nr; totais(); }
      if (x.dataset.gorj != null) { D.gorjeta[x.dataset.gorj] = nr; totais(); }
    });
    $('[data-cobrar-igual]', f).onclick = () => { const valor = partes(conta(c).falta, n)[0]; if (!(valor > 0)) return toast('Nada a cobrar'); fechar(); escolherForma(c, valor); };
    igual();
  } });
}
// recebe a parte de uma pessoa (com a gorjeta à parte) e volta para a divisão enquanto faltar alguém
function receberParte(c, forma, valor, extra, depois) {
  const total = r2(valor + (extra.gorjeta || 0)), gj = extra.gorjeta ? ` (${din(valor)} + ${din(extra.gorjeta)} de gorjeta)` : '';
  const fim = (mais = {}) => { concluir(c, forma, valor, { ...extra, ...mais }); if (db.comandas.includes(c) && depois) setTimeout(depois, 260); };
  if (forma === 'Dinheiro') {
    folha({ titulo: `Dinheiro · ${din(total)}${gj}`, corpo: `<label class="campo"><span>Quanto a pessoa deu</span><input data-dado inputmode="decimal" placeholder="${String(total.toFixed(2)).replace('.', ',')}"></label><p class="troco" data-troco>Troco: ${din(0)}</p>`,
      pe: '<button type="button" class="bt cheio grande" data-ok>Recebido</button>',
      aoAbrir: (f, fechar) => {
        const dado = () => Number(String($('[data-dado]', f).value || total).replace(',', '.')) || 0;
        $('[data-dado]', f).oninput = () => { const tr = dado() - total; $('[data-troco]', f).innerHTML = tr >= 0 ? `Troco: <b>${din(tr)}</b>` : `<span class="erro">Faltam ${din(-tr)}</span>`; };
        $('[data-ok]', f).onclick = () => { if (dado() < total - 0.009) return toast('O valor dado é menor que a parte'); fechar(); fim({ dado: dado(), troco: r2(dado() - total) }); };
      } });
    return;
  }
  if (forma === 'Pix') {
    const cfg = db.config; if (!cfg.pix?.chave) { toast('Cadastre a chave Pix do restaurante em Gestão › Caixa e regras para gerar o QR'); return ir('mais/ajustes'); }
    const codigo = pix({ chave: cfg.pix.chave, nome: cfg.nome, cidade: cfg.cidade, valor: total, txid: `POPINA${(c.mesa || c.num || '')}P${extra.pessoa || ''}${Date.now().toString(36)}`.slice(0, 25) });
    folha({ titulo: `Pix · ${din(total)}${gj}`, corpo: `${cfg.pix.exemplo ? '<p class="aviso ouro">Chave de exemplo. Cadastre a chave do restaurante em Gestão › Caixa e regras para o QR valer de verdade.</p>' : ''}<div class="qr-pix">${qrSVG(codigo, 240)}</div>`,
      pe: '<button type="button" class="bt cheio grande" data-ok>Recebi o Pix</button>', aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => { fechar(); fim(); }; } });
    return;
  }
  fim();
}
function escolherForma(c, valor) {
  folha({ titulo: `Receber ${din(valor)}`, corpo: `<div class="formas">${FORMAS.map(([f, i]) => `<button type="button" class="forma" data-f="${f}">${ico(i)}<span>${f}</span></button>`).join('')}</div>`,
    aoAbrir: (f, fechar) => $$('[data-f]', f).forEach((b) => { b.onclick = () => { fechar(); receber(c, b.dataset.f, valor); }; }) });
}
// já pago (ex.: Pix no pedido online): só fecha e tira da lista
acao('concluir', (b) => { const c = comanda(b.dataset.c); if (!c) return; fechar(c); ir('caixa'); toast(`${c.tipo === 'mesa' ? `Mesa ${c.mesa}` : `Pedido #${c.num}`} concluído`); });
acao('pagar', (b) => { const c = comanda(b.dataset.c); receber(c, b.dataset.f, conta(c).falta); });
function receber(c, forma, valor) {
  // fiado: pede o cliente, confere o limite e lança na conta dele (financeiro.js) antes de fechar
  if (forma === FORMA_FIADO) return pedirFiado(c, valor, (extra) => concluir(c, forma, valor, extra));
  if (forma === FORMA_FATURADO) return faturar(c, valor);
  if (forma === 'Dinheiro') {
    folha({ titulo: `Dinheiro · ${din(valor)}`, corpo: `<label class="campo"><span>Quanto o cliente deu</span><input data-dado inputmode="decimal" placeholder="${String(valor.toFixed(2)).replace('.', ',')}"></label>
      <div class="chips">${[valor, Math.ceil(valor / 10) * 10, Math.ceil(valor / 50) * 50, Math.ceil(valor / 100) * 100].filter((x, k, a) => a.indexOf(x) === k).map((x) => `<button type="button" class="chip" data-v="${x}">${dinCurto(x)}</button>`).join('')}</div>
      <p class="troco" data-troco>Troco: ${din(0)}</p>`,
    pe: '<button type="button" class="bt cheio grande" data-ok>Recebido</button>',
    aoAbrir: (f, fechar) => {
      const dado = () => Number(String($('[data-dado]', f).value || valor).replace(',', '.')) || 0;
      const atual = () => { const tr = dado() - valor; $('[data-troco]', f).innerHTML = tr >= 0 ? `Troco: <b>${din(tr)}</b>` : `<span class="erro">Faltam ${din(-tr)}</span>`; };
      $('[data-dado]', f).oninput = atual; $$('[data-v]', f).forEach((x) => { x.onclick = () => { $('[data-dado]', f).value = String(x.dataset.v).replace('.', ','); atual(); }; });
      $('[data-ok]', f).onclick = () => { if (dado() < valor - 0.009) return toast('O valor dado é menor que a conta'); fechar(); concluir(c, forma, valor, { dado: dado(), troco: r2(dado() - valor) }); };
    } });
    return;
  }
  if (forma === 'Pix') {
    const cfg = db.config;
    if (!cfg.pix?.chave) { toast('Cadastre a chave Pix do restaurante em Gestão › Caixa e regras para gerar o QR'); return ir('mais/ajustes'); }
    const codigo = pix({ chave: cfg.pix.chave, nome: cfg.nome, cidade: cfg.cidade, valor, txid: `POPINA${(c.mesa || c.num || '')}${Date.now().toString(36)}`.slice(0, 25) });
    folha({ titulo: `Pix · ${din(valor)}`, corpo: `${cfg.pix.exemplo ? '<p class="aviso ouro">Chave de exemplo. Cadastre a chave do restaurante em Gestão › Caixa e regras para o QR valer de verdade.</p>' : ''}
      <div class="qr-pix">${qrSVG(codigo, 240)}</div><label class="campo"><span>Pix copia e cola</span><textarea readonly rows="3">${codigo}</textarea></label>
      <p class="mudo">O dinheiro cai direto na conta do restaurante. Confira no app do banco antes de confirmar.</p>`,
    pe: '<button type="button" class="bt" data-copiar>Copiar código</button><button type="button" class="bt cheio" data-ok>Recebi o Pix</button>',
    aoAbrir: (f, fechar) => {
      $('[data-copiar]', f).onclick = () => { navigator.clipboard?.writeText(codigo).then(() => toast('Código copiado')).catch(() => {}); };
      $('[data-ok]', f).onclick = () => { fechar(); concluir(c, forma, valor); };
    } });
    return;
  }
  concluir(c, forma, valor);
}
// faturar para a empresa: CNPJ conferido, razão social, vencimento; entra nas contas a receber (Gestão › Contas)
function faturar(c, valor) {
  const emps = db.empresas || [], prazo = Number(lojaCfg().faturadoPrazo ?? 30), venc = ymd(Date.now() + prazo * 864e5);
  folha({ titulo: `Faturar ${din(valor)} para empresa`, corpo: `<p class="mudo">A conta fecha agora e o valor vai para as contas a receber, com o vencimento.</p>
    ${emps.length ? `<div class="campo"><span>Empresas que já faturaram</span><div class="chips quebra">${emps.map((e, k) => `<button type="button" class="chip" data-emp="${k}">${t(e.razao)}</button>`).join('')}</div></div>` : ''}
    <div class="duas-c"><label class="campo"><span>CNPJ</span><input data-cnpj inputmode="numeric" placeholder="00.000.000/0000-00" maxlength="18"></label><label class="campo"><span>Vencimento</span><input data-venc type="date" value="${venc}"></label></div>
    <label class="campo"><span>Razão social</span><input data-razao maxlength="100" placeholder="Ex.: Empresa Exemplo Ltda"></label>
    <div class="duas-c"><label class="campo"><span>Contato (opcional)</span><input data-contato maxlength="60"></label><label class="campo"><span>Telefone (opcional)</span><input data-tel inputmode="tel"></label></div><p class="erro" data-erro role="alert"></p>`,
  pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio" data-ok>Faturar e fechar a conta</button>',
  aoAbrir: (f, fechar) => {
    $$('[data-emp]', f).forEach((b) => { b.onclick = () => { const e = emps[Number(b.dataset.emp)]; $('[data-cnpj]', f).value = e.cnpj; $('[data-razao]', f).value = e.razao; $('[data-contato]', f).value = e.contato || ''; $('[data-tel]', f).value = e.tel || ''; if (e.prazo) $('[data-venc]', f).value = ymd(Date.now() + e.prazo * 864e5); }; });
    $('[data-ok]', f).onclick = () => {
      const cnpj = fmtCnpj($('[data-cnpj]', f).value), razao = $('[data-razao]', f).value.trim(), vc = $('[data-venc]', f).value || venc, er = $('[data-erro]', f);
      if (!cnpjValido(cnpj)) { er.textContent = 'Confira o CNPJ: os números não batem.'; return $('[data-cnpj]', f).focus(); }
      if (razao.length < 3) { er.textContent = 'Escreva a razão social da empresa.'; return $('[data-razao]', f).focus(); }
      if (!db.comandas.includes(c)) { fechar(); return toast('Esta conta já foi fechada em outro aparelho'); }
      const onde = ONDE(c), conta1 = novaConta({ tipo: 'receber', desc: `Faturado · ${razao} · ${onde}`, categoria: 'clientes', valor, venc: vc, obs: `CNPJ ${cnpj}${$('[data-contato]', f).value.trim() ? ` · ${$('[data-contato]', f).value.trim()}` : ''}` });
      const emp = { cnpj, razao: razao.slice(0, 100), contato: $('[data-contato]', f).value.trim().slice(0, 60), tel: $('[data-tel]', f).value.replace(/\D/g, ''), prazo: Math.max(0, Math.round((new Date(`${vc}T12:00`) - Date.now()) / 864e5)) };
      db.empresas = [emp, ...emps.filter((e) => e.cnpj !== cnpj)].slice(0, 100);
      (db.faturados ||= []).push({ id: conta1.id, ts: Date.now(), cnpj, razao: emp.razao, valor: r2(valor), onde, venc: vc }); if (db.faturados.length > 500) db.faturados.splice(0, db.faturados.length - 500);
      c.empresa = { cnpj, razao: emp.razao }; marcar(c, 'faturado', `Faturado para ${emp.razao} (CNPJ ${cnpj}), vence ${new Date(`${vc}T12:00`).toLocaleDateString('pt-BR')}`);
      fechar(); concluir(c, FORMA_FATURADO, valor, { empresa: { cnpj, razao: emp.razao }, conta: conta1.id });
    };
  } });
}
function concluir(c, forma, valor, extra = {}) {
  const onde = ONDE(c); const fecha = conta(c).falta - valor <= 0.009;
  if (pagar(c, forma, valor, extra) === false) { toast(`${onde} já foi fechada em outro aparelho`); return ir('caixa'); }
  toast(fecha ? `${onde} fechada${extra.troco ? ` · troco ${din(extra.troco)}` : ''}` : `Recebido ${din(valor)} em ${forma}. Falta ${din(conta(c).falta)}`);
  if (fecha) ir('caixa');
}
acao('imprimir-conta', (b) => {
  const c = comanda(b.dataset.c), v = conta(c);
  const w = window.open('', '_blank', 'width=380,height=640'); if (!w) return toast('Libere as janelas para imprimir');
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Pré-conta</title><style>body{font:13px/1.4 monospace;width:72mm;margin:0 auto;padding:8px}h1{font-size:15px;text-align:center;margin:0 0 4px}p{margin:0;text-align:center}table{width:100%;border-collapse:collapse;margin:8px 0}td{padding:2px 0}td:last-child{text-align:right}.t td{border-top:1px dashed #000;font-weight:700}</style>
    <h1>${t(db.config.nome)}</h1><p>${ONDE(c)} · ${new Date().toLocaleString('pt-BR')}</p><p>** NÃO É DOCUMENTO FISCAL **</p>
    <table>${itensValidos(c).map((i) => `<tr><td>${i.qtd}x ${t(i.nome)}</td><td>${dinCurto(valorItem(i))}</td></tr>`).join('')}
    ${v.rodizio ? `<tr class="t"><td>Rodízio (${c.pessoas} pessoas)</td><td>${dinCurto(v.rodizio)}</td></tr>` : ''}${v.pacote ? `<tr><td>Pacote do evento (${v.presentes})</td><td>${dinCurto(v.pacote)}</td></tr>` : ''}${v.ingresso ? `<tr><td>Entrada</td><td>${dinCurto(v.ingresso)}</td></tr>` : ''}${v.consumacao ? `<tr><td>Consumação mínima</td><td>${dinCurto(v.consumacao)}</td></tr>` : ''}
    ${v.servico ? `<tr class="t"><td>Serviço ${db.config.servico}%</td><td>${dinCurto(v.servico)}</td></tr>` : ''}${v.couvert ? `<tr><td>Couvert (${c.pessoas} x ${dinCurto(lojaCfg().couvert)})</td><td>${dinCurto(v.couvert)}</td></tr>` : ''}${v.entrega ? `<tr><td>Entrega</td><td>${dinCurto(v.entrega)}</td></tr>` : ''}${v.desconto ? `<tr><td>Desconto</td><td>-${dinCurto(v.desconto)}</td></tr>` : ''}
    <tr class="t"><td>TOTAL</td><td>${dinCurto(v.total)}</td></tr>${c.pessoas > 1 ? `<tr><td>Por pessoa (${c.pessoas})</td><td>${dinCurto(v.total / c.pessoas)}</td></tr>` : ''}</table><p>Obrigado pela preferência!</p><script>print()<\/script>`);
  w.document.close();
});
acao('abrir-caixa', () => {
  folha({ titulo: 'Abrir caixa', corpo: `<label class="campo"><span>Troco na gaveta (R$)</span><input data-v inputmode="decimal" value="200,00"></label><label class="campo"><span>Quem está no caixa</span><input data-op value="${t(db.config.garcons?.[1] || '')}"></label>`,
    pe: '<button type="button" class="bt cheio grande" data-ok>Abrir</button>',
    aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => { abrirCaixa(Number($('[data-v]', f).value.replace(',', '.')) || 0, $('[data-op]', f).value); fechar(); toast('Caixa aberto'); }; } });
});
acao('mov', (b) => {
  const tipo = b.dataset.t;
  folha({ titulo: tipo === 'sangria' ? 'Sangria (tirar dinheiro)' : 'Suprimento (pôr dinheiro)', corpo: `<label class="campo"><span>Valor (R$)</span><input data-v inputmode="decimal" placeholder="0,00"></label><label class="campo"><span>Motivo</span><input data-m placeholder="${tipo === 'sangria' ? 'Ex.: depósito, pagar fornecedor' : 'Ex.: troco extra'}"></label>`,
    pe: '<button type="button" class="bt cheio grande" data-ok>Registrar</button>',
    aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = async () => {
      const v = Number($('[data-v]', f).value.replace(',', '.')), m = $('[data-m]', f).value.trim(); if (!(v > 0)) return toast('Informe o valor');
      if (tipo === 'sangria' && m.length < 3) { toast('Escreva o motivo da sangria'); return $('[data-m]', f).focus(); }
      fechar(); let pin = false;
      // sangria tira dinheiro da gaveta: pede o PIN do gerente quando ele existe
      if (tipo === 'sangria' && temPin()) { const r = await autorizar({ titulo: 'PIN do gerente', texto: `Sangria de ${din(v)}: ${t(m)}`, pedirPin: true, sim: 'Autorizar' }); if (!r) return; pin = true; }
      movimento(tipo, v, m, quemAgora(null, pin)); toast('Registrado');
    }; } });
});
acao('fechar-caixa', () => {
  if (regras().conferenciaCega) return fecharCega();
  const r = caixaResumo();
  folha({ titulo: 'Fechar caixa', corpo: `<div class="resumo">${Object.entries(r.porForma).map(([f, v]) => `<div><span>${t(f)}</span><b>${din(v)}</b></div>`).join('')}
      <div><span>Sangrias</span><b>− ${din(r.sangria)}</b></div><div><span>Suprimentos</span><b>${din(r.suprimento)}</b></div><div class="total"><span>Deve ter na gaveta</span><b>${din(r.dinheiroNaGaveta)}</b></div></div>
    <label class="campo"><span>Quanto tem na gaveta (contado)</span><input data-v inputmode="decimal" placeholder="${String(r.dinheiroNaGaveta.toFixed(2)).replace('.', ',')}"></label><p data-dif class="mudo"></p><label class="campo" data-mot hidden><span>Por que não bateu? (obrigatório)</span><input data-motivo maxlength="140" placeholder="Ex.: troco a mais para a mesa 7"></label>
    ${db.comandas.length ? `<p class="aviso ouro">Ainda há ${db.comandas.length} contas abertas. Elas continuam abertas para o próximo caixa.</p>` : ''}`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Fechar o caixa</button>',
  aoAbrir: (f, fechar) => {
    const cont = () => Number(String($('[data-v]', f).value || r.dinheiroNaGaveta).replace(',', '.')) || 0;
    const dif = () => r2(cont() - r.dinheiroNaGaveta);
    $('[data-v]', f).oninput = () => { const d = dif(); $('[data-dif]', f).innerHTML = d === 0 ? '<b class="ok-txt">Bateu certinho.</b>' : d > 0 ? `<b class="sobra">Sobrando ${din(d)}</b>` : `<b class="erro">Faltando ${din(-d)}</b>`; $('[data-mot]', f).hidden = d === 0; };
    $('[data-ok]', f).onclick = () => {
      const d = dif(), mot = $('[data-motivo]', f).value.trim();
      if (d !== 0 && mot.length < 3) { toast('Escreva por que o dinheiro não bateu'); return $('[data-motivo]', f).focus(); }
      fecharCaixa(cont(), mot, db.caixa?.operador || ''); fechar(); toast('Caixa fechado. O resumo fica no Histórico de caixas.');
    };
  } });
});
// conferência cega: quem fecha conta cada forma de pagamento sem ver o esperado; só depois o sistema compara
const FORMAS_CEGA = ['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito'];
function fecharCega() {
  const r = caixaResumo(), formas = [...new Set([...FORMAS_CEGA, ...Object.keys(r.porForma)])];
  const esperado = (f) => (f === 'Dinheiro' ? r.dinheiroNaGaveta : r.porForma[f] || 0);
  folha({ titulo: 'Fechar caixa · conferência', corpo: `<p class="mudo">Conte o dinheiro da gaveta e some os comprovantes de cada forma. O valor esperado só aparece depois de conferir.</p>
    <div data-cont>${formas.map((f, k) => `<label class="campo"><span>${f === 'Dinheiro' ? 'Dinheiro na gaveta (com o troco)' : t(f)}</span><input data-f="${k}" inputmode="decimal" placeholder="0,00"></label>`).join('')}</div>
    <div data-res hidden></div><label class="campo" data-mot hidden><span>Por que não bateu? (obrigatório)</span><input data-motivo maxlength="140" placeholder="Ex.: comprovante de cartão perdido"></label>
    ${db.comandas.length ? `<p class="aviso ouro">Ainda há ${db.comandas.length} contas abertas. Elas continuam abertas para o próximo caixa.</p>` : ''}`,
  pe: '<button type="button" class="bt" data-volta hidden>Corrigir a contagem</button><button type="button" class="bt cheio grande" data-ok>Conferir</button>',
  aoAbrir: (f, fechar) => {
    let conferido = false;
    const lido = () => Object.fromEntries(formas.map((x, k) => [x, r2(Number(String($(`[data-f="${k}"]`, f).value || 0).replace(',', '.')) || 0)]));
    const modo = (on) => { conferido = on; $$('[data-f]', f).forEach((i) => { i.readOnly = on; }); $('[data-res]', f).hidden = !on; $('[data-volta]', f).hidden = !on; $('[data-ok]', f).textContent = on ? 'Fechar o caixa' : 'Conferir'; };
    $('[data-volta]', f).onclick = () => { modo(false); $('[data-mot]', f).hidden = true; };
    $('[data-ok]', f).onclick = () => {
      const c = lido(), difs = formas.map((x) => [x, r2(c[x] - esperado(x))]);
      if (!conferido) {
        $('[data-res]', f).innerHTML = `<div class="tabela-rolo"><table class="tabela"><thead><tr><th>Forma</th><th class="num">Esperado</th><th class="num">Contado</th><th class="num">Diferença</th></tr></thead><tbody>
          ${difs.map(([x, d]) => `<tr><td>${t(x)}</td><td class="num">${dinCurto(esperado(x))}</td><td class="num">${dinCurto(c[x])}</td><td class="num"><b class="${d === 0 ? 'ok-txt' : d > 0 ? 'sobra' : 'erro'}">${d === 0 ? 'ok' : (d > 0 ? '+ ' : '− ') + dinCurto(Math.abs(d))}</b></td></tr>`).join('')}</tbody></table></div>`;
        $('[data-mot]', f).hidden = difs.every(([, d]) => d === 0); modo(true); return;
      }
      const mot = $('[data-motivo]', f).value.trim();
      if (difs.some(([, d]) => d !== 0) && mot.length < 3) { toast('Escreva por que não bateu'); return $('[data-motivo]', f).focus(); }
      fecharCaixa(c.Dinheiro, mot, db.caixa?.operador || '', { cega: true, contadoPorForma: c, esperadoPorForma: Object.fromEntries(formas.map((x) => [x, r2(esperado(x))])) });
      fechar(); toast('Caixa fechado. O resumo fica no Histórico de caixas.');
    };
  } });
}

// ------------------------------------------------------------------ histórico de caixas (fechamentos)
const dataHora = (ts) => (ts ? new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
const hora = (ts) => (ts ? new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—');
const difTxt = (d) => `<b class="${!d ? 'ok-txt' : d > 0 ? 'sobra' : 'erro'}">${!d ? 'Bateu' : (d > 0 ? 'Sobra ' : 'Falta ') + dinCurto(Math.abs(d))}</b>`;
acao('historico-caixas', () => {
  const l = (db.fechamentos || []).map((x, k) => [x, k]).sort((a, b) => (b[0].fechado || 0) - (a[0].fechado || 0));
  folha({ titulo: 'Histórico de caixas', larga: true, corpo: l.length ? `<div class="tabela-rolo"><table class="tabela tab-caixas"><thead><tr><th>Dia</th><th>Operador</th><th>Aberto</th><th class="num">Vendas</th><th class="num">Gaveta</th><th class="num">Diferença</th><th></th></tr></thead><tbody>
    ${l.map(([x, k]) => { const r = x.resumo || {}; return `<tr data-f="${k}" tabindex="0" role="button" aria-label="Ver caixa de ${dataHora(x.fechado)}"><td><b>${new Date(x.aberto || x.fechado).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</b></td><td>${t(x.operador || x.fechadoPor || '—')}</td><td>${hora(x.aberto)} às ${hora(x.fechado)}</td>
      <td class="num">${dinCurto(r.total)}</td><td class="num">${dinCurto(r.gaveta)}<small>contado ${dinCurto(r.contado)}</small></td><td class="num">${difTxt(r.diferenca)}</td><td class="acoes">${ico('dir')}</td></tr>`; }).join('')}</tbody></table></div>`
    : '<div class="vazio">Nenhum caixa fechado ainda.</div>',
  aoAbrir: (f) => $$('[data-f]', f).forEach((tr) => { const ver = () => detalheCaixa(db.fechamentos[Number(tr.dataset.f)]); tr.onclick = ver; tr.onkeydown = (e) => { if (e.key === 'Enter') ver(); }; }) });
});
function linhasCaixa(x) {
  const r = x.resumo || {}, mov = x.movimentos || [], pf = r.porForma || {}, cont = r.contadoPorForma;
  const formas = [...new Set([...Object.keys(pf), ...Object.keys(cont || {})])];
  return [
    ['Aberto', `${dataHora(x.aberto)}${x.operador ? ` · ${x.operador}` : ''}`], ['Fechado', `${dataHora(x.fechado)}${x.fechadoPor ? ` · ${x.fechadoPor}` : ''}`],
    ['Troco inicial', dinCurto(x.troco)], [`Vendas${r.vendas != null ? ` (${r.vendas})` : ''}`, dinCurto(r.total)],
    ...formas.map((f) => [f, cont ? `${dinCurto(r.esperadoPorForma?.[f] ?? pf[f] ?? 0)} esperado · ${dinCurto(cont[f] || 0)} contado` : dinCurto(pf[f])]),
    ...mov.map((m) => [`${m.tipo === 'sangria' ? 'Sangria' : 'Suprimento'} ${hora(m.ts)}${m.motivo ? ` · ${m.motivo}` : ''}${m.quem ? ` · ${m.quem}` : ''}`, `${m.tipo === 'sangria' ? '− ' : '+ '}${dinCurto(m.valor)}`]),
    ['Deve ter na gaveta', dinCurto(r.gaveta)], ['Contado na gaveta', dinCurto(r.contado)], ['Diferença', !r.diferenca ? 'Bateu' : (r.diferenca > 0 ? 'Sobra ' : 'Falta ') + dinCurto(Math.abs(r.diferenca))],
    ...(x.motivo ? [['Motivo', x.motivo]] : []), ...(x.abertas?.length ? [['Contas que ficaram abertas', String(x.abertas.length)]] : []), ...(r.cega ? [['Conferência', 'Cega']] : []),
  ];
}
function detalheCaixa(x) {
  if (!x) return;
  folha({ titulo: `Caixa de ${new Date(x.aberto || x.fechado).toLocaleDateString('pt-BR')}`, corpo: `<div class="resumo">${linhasCaixa(x).map(([a, b]) => `<div><span>${t(a)}</span><b>${t(b)}</b></div>`).join('')}</div>`,
    pe: '<button type="button" class="bt cheio grande" data-imp>' + ico('impressora') + 'Imprimir</button>',
    aoAbrir: (f) => { $('[data-imp]', f).onclick = () => imprimirCaixa(x); } });
}
function imprimirCaixa(x) {
  const w = window.open('', '_blank', 'width=380,height=640'); if (!w) return toast('Libere as janelas para imprimir');
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Fechamento de caixa</title><style>body{font:13px/1.4 monospace;width:72mm;margin:0 auto;padding:8px}h1{font-size:15px;text-align:center;margin:0 0 4px}p{margin:0;text-align:center}table{width:100%;border-collapse:collapse;margin:8px 0}td{padding:2px 0;vertical-align:top}td:last-child{text-align:right}</style>
    <h1>${t(db.config.nome)}</h1><p>Fechamento de caixa</p><p>${new Date(x.aberto || x.fechado).toLocaleDateString('pt-BR')}</p>
    <table>${linhasCaixa(x).map(([a, b]) => `<tr><td>${t(a)}</td><td>${t(b)}</td></tr>`).join('')}</table><p>Conferido por: ____________</p><script>print()<\/script>`);
  w.document.close();
}

// ------------------------------------------------------------------ venda fechada: ver, reabrir e cancelar (estorno)
export const MOTIVOS_ESTORNO = ['Cobrado em duplicidade', 'Cliente desistiu', 'Lançado errado', 'Pagamento recusado'];
const MOTIVOS_REABRIR = ['Cliente voltou a pedir', 'Fechou a mesa errada', 'Forma de pagamento errada'];
const ONDE_V = (v) => v.onde || (v.tipo === 'mesa' ? `Mesa ${v.mesa ?? ''}` : v.tipo === 'delivery' ? `Delivery #${v.num ?? ''}` : `Balcão${v.num ? ' #' + v.num : ''}`);
acao('ver-venda', (b) => {
  const v = db.vendas.find((x) => x.id === b.dataset.v); if (!v) return toast('Venda não encontrada');
  const cx = v.cancelado, podeReabrir = !cx && v.tipo === 'mesa' && vendaDeHoje(v);
  const l = (a, val) => (val ? `<div><span>${a}</span><b>${val}</b></div>` : '');
  folha({ titulo: `${ONDE_V(v)} · ${dataHora(v.ts)}`, corpo: `${cx ? `<p class="aviso ouro">${cx.reaberta ? 'Conta reaberta' : 'Venda cancelada'}${cx.motivo ? `: ${t(cx.motivo)}` : ''}${cx.quem ? ` · ${t(cx.quem)}` : ''}${cx.ts ? ` · ${dataHora(cx.ts)}` : ''}</p>` : ''}
    <ul class="lista-itens">${(v.itens || []).map((i) => `<li><b>${i.qtd}×</b><span style="margin:0;font-weight:400;flex:1">${t(i.nome)}</span><span>${din(i.qtd * i.preco)}</span></li>`).join('')}</ul>
    <div class="resumo">${l('Rodízio', v.rodizio ? din(v.rodizio) : '')}${l('Pacote do evento', v.pacote ? din(v.pacote) : '')}${l('Entrada', v.ingresso ? din(v.ingresso) : '')}${l('Consumação mínima', v.consumacao ? din(v.consumacao) : '')}${l(`Serviço`, v.servico ? din(v.servico) : '')}${l('Couvert', v.couvert ? din(v.couvert) : '')}${l('Entrega', v.entrega ? din(v.entrega) : '')}${l(`Desconto${v.descontoMotivo ? ` (${t(v.descontoMotivo)})` : ''}`, v.desconto ? '− ' + din(v.desconto) : '')}
      ${l('Pagamento', t((v.pagamentos?.length ? v.pagamentos.map((p) => `${p.forma} ${dinCurto(p.valor)}`).join(', ') : v.forma) || ''))}${l('Garçom', t(v.garcom || ''))}<div class="total"><span>Total</span><b>${din(v.total)}</b></div></div>`,
  pe: cx ? '' : `<button type="button" class="bt perigo" data-cancelar>Cancelar venda</button>${podeReabrir ? '<button type="button" class="bt cheio" data-reabrir>Reabrir conta</button>' : ''}`,
  aoAbrir: (f, fechar) => {
    $('[data-cancelar]', f)?.addEventListener('click', async () => {
      fechar();
      const r = await autorizar({ titulo: `Cancelar venda de ${din(v.total)}`, texto: 'A venda fica marcada como cancelada (não é apagada) e sai do faturamento.', motivos: MOTIVOS_ESTORNO, pedirPin: temPin(), sim: 'Cancelar venda', perigo: true,
        extra: '<label class="interruptor bloco-int"><input type="checkbox" data-estoque><span></span>Devolver os itens ao estoque (não foram preparados)</label>' });
      if (!r) return;
      if (cancelarVenda(v, r.motivo, $('[data-estoque]', r.el)?.checked, quemAgora(null, r.pin))) toast('Venda cancelada e registrada');
    });
    $('[data-reabrir]', f)?.addEventListener('click', async () => {
      fechar();
      const r = await autorizar({ titulo: `Reabrir a conta da mesa ${v.mesa}`, texto: 'A conta volta para a mesa com os itens e o que já foi pago.', motivos: MOTIVOS_REABRIR, pedirPin: temPin(), sim: 'Reabrir' });
      if (!r) return;
      const x = reabrirVenda(v, r.motivo, quemAgora(null, r.pin)); if (x.erro) return toast(x.erro);
      toast(`Mesa ${v.mesa} reaberta`); ir(`mesa/${v.mesa}`);
    });
  } });
});

// venda no balcão sem mesa e sem cozinha (prato por quilo, bebida, sobremesa): escolhe, já cobra
acao('venda-rapida', () => {
  if (!db.caixa) return toast('Abra o caixa primeiro');
  const c = novoPedido('balcao', { nome: 'Balcão' }, { origem: 'Caixa' });
  abrirSeletor(c, () => {
    if (!venderDireto(c)) { db.comandas = db.comandas.filter((x) => x !== c); grava(); return; }
    ir(`caixa/${c.id}`);
  });
});
