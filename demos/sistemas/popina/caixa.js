// Popina · caixa: contas abertas, fechar conta (serviço, desconto, dividir, pagar em partes), Pix com QR e o caixa do dia.
import { db, t, din, dinCurto, tempo, comanda, conta, valorItem, itensValidos, pagar, fechar, partes, novoPedido, venderDireto, caixaResumo, abrirCaixa, movimento, fecharCaixa, grava, r2,
  temCouvert, lojaCfg, marcar, darDesconto, regras, temPin, quemAgora, cancelarVenda, reabrirVenda, vendaDeHoje, ondeComanda, couvertLigado, tem, fidelidade, clientePorTel, darPremio } from './loja.js?v=21';
import { registrar, acao, ir } from './nucleo.js?v=21';
import { ico, folha, toast, confirma, autorizar, $, $$ } from './ui.js?v=21';
import { pix } from './pix.js?v=21';
import { qrSVG } from '../base/qr.js';
import { linhaItem, abrirSeletor } from './salao.js?v=21';

const FORMAS = [['Dinheiro', 'dinheiro'], ['Pix', 'pix'], ['Cartão de débito', 'cartao'], ['Cartão de crédito', 'cartao']];
const ONDE = (c) => ondeComanda(c);
const ICO_TIPO = { mesa: 'mesa', delivery: 'moto', cartao: 'cartao', evento: 'coroa' };
// cartão fidelidade no fechamento: carimbos do cliente pelo telefone e o prêmio quando completa
function blocoFidelidade(c) {
  if (!tem('fidelidade')) return '';
  const F = fidelidade(), x = clientePorTel(c.cliente?.tel), n = x?.carimbos || 0;
  if (!x) return `<div class="fidel-cx"><b>${ico('etiqueta')}Cartão fidelidade</b><div class="fidel-tel"><input data-fidel-tel inputmode="tel" placeholder="WhatsApp do cliente" aria-label="WhatsApp do cliente para o cartão fidelidade" value="${t(c.cliente?.tel || '')}"><button type="button" class="bt" data-acao="fidel-tel" data-c="${c.id}">Usar</button></div><small class="mudo">Com o telefone, esta compra ganha carimbo${F.minimo ? ` (a partir de ${dinCurto(F.minimo)})` : ''}.</small></div>`;
  return `<div class="fidel-cx"><b>${ico('etiqueta')}Cartão fidelidade · ${t(x.nome || '')}</b><div class="carimbos" aria-label="${n} de ${F.compras} carimbos">${Array.from({ length: F.compras }, (_, k) => `<i class="${k < n ? 'on' : ''}"></i>`).join('')}</div>
    <small>${n} de ${F.compras} carimbos${n >= F.compras ? ` · prêmio liberado: ${t(F.premio)}` : ''}</small>${n >= F.compras ? `<button type="button" class="bt cheio" data-acao="dar-premio" data-tel="${t(x.tel)}">${ico('check')}Dar prêmio</button>` : ''}</div>`;
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
    <div class="cc-bts"><button type="button" class="bt" data-acao="mov" data-t="sangria">Sangria</button><button type="button" class="bt" data-acao="mov" data-t="suprimento">Suprimento</button><button type="button" class="bt escuro" data-acao="fechar-caixa">Fechar caixa</button></div>
    <div class="cc-formas">${Object.entries(r.porForma).map(([f, v]) => `<div>${ico(IF[f] || 'cartao')}<span>${t(f)}</span><b>${din(v)}</b></div>`).join('') || '<div><span>Sem vendas ainda</span></div>'}<div title="Troco ${dinCurto(db.caixa?.troco || 0)} + dinheiro ${dinCurto(r.porForma.Dinheiro || 0)}${r.suprimento ? ` + suprimento ${dinCurto(r.suprimento)}` : ''}${r.sangria ? ` − sangria ${dinCurto(r.sangria)}` : ''}">${ico('cofre')}<span>Na gaveta</span><b>${din(r.dinheiroNaGaveta)}</b></div></div></section>${hist}`;
}
function listaContas(sel) {
  return abertas().map((c) => { const v = conta(c);
    return `<a class="conta-linha ${c.id === sel ? 'on' : ''} ${c.pediuConta ? 'pediu' : ''}" href="#caixa/${c.id}"><i class="cl-ico">${ico(ICO_TIPO[c.tipo] || 'sacola')}</i><div><b>${ONDE(c)}</b><small>${c.tipo === 'mesa' ? `${c.pessoas} pessoas · ` : c.cliente?.nome ? t(c.cliente.nome) + ' · ' : ''}${tempo(c.aberta)}${c.pediuConta ? ' · pediu a conta' : ''}</small></div><span>${din(v.total)}</span>${ico('dir')}</a>`; }).join('') || '<div class="vazio">Nenhuma conta aberta.</div>';
}
function detalhe(c) {
  const v = conta(c), it = itensValidos(c);
  return `<div class="conta-det"><header class="cab-conta"><a class="bt-ico so-cel" href="#caixa" aria-label="Voltar">${ico('voltar')}</a><h1 class="fita">${ONDE(c)}</h1><p>${c.tipo === 'mesa' ? `${c.pessoas} pessoas · ` : ''}aberta há ${tempo(c.aberta)}</p><img class="cx-aqueduto" src="img/aqueduto.webp?v=2" alt="" width="340" height="88"></header>
    ${navigator.onLine ? '' : '<p class="aviso ouro">Sem internet: o pagamento fica guardado neste aparelho e vai para os outros quando a conexão voltar. Não cobre esta conta em outro caixa até lá.</p>'}
    <ul class="itens">${c.itens.map((i) => linhaItem(c, i, false)).join('')}</ul>
    <section class="totais">
      <div><span>Consumo (${it.reduce((s, i) => s + i.qtd, 0)} itens)</span><b>${din(v.sub)}</b></div>
      ${v.rodizio ? `<div><span>Rodízio (${c.pessoas} pessoas)</span><b>${din(v.rodizio)}</b></div>` : ''}
      ${v.pacote ? `<div><span>Pacote do evento (${v.presentes} convidados)</span><b>${din(v.pacote)}</b></div>` : ''}
      ${v.ingresso ? `<div><span>Entrada${c.ingresso?.nome ? ` · ${t(c.ingresso.nome)}` : ''}</span><b>${din(v.ingresso)}</b></div>` : ''}
      ${v.consumacao ? `<div><span>Consumação mínima (${dinCurto(c.consumacao)}; consumiu ${dinCurto(v.sub)})</span><b>${din(v.consumacao)}</b></div>` : ''}
      ${['mesa', 'cartao', 'evento'].includes(c.tipo) ? `<div><label class="interruptor"><input type="checkbox" data-acao="servico" data-c="${c.id}" ${c.servico ? 'checked' : ''}><span></span>Serviço ${db.config.servico}%</label><b>${din(v.servico)}</b></div>` : ''}
      ${c.evento && v.couvert ? `<div><span>Couvert artístico</span><b>${din(v.couvert)}</b></div>` : ''}
      ${(c.tipo === 'mesa' || c.tipo === 'cartao') && couvertLigado() && Number(lojaCfg().couvert) > 0 ? `<div><label class="interruptor"><input type="checkbox" data-acao="couvert" data-c="${c.id}" ${temCouvert(c) ? 'checked' : ''}><span></span>Couvert (${c.pessoas} × ${dinCurto(lojaCfg().couvert)})</label><b>${din(v.couvert)}</b></div>` : ''}
      ${v.entrega ? `<div><span>Entrega (${t(c.cliente?.bairro || '')})</span><b>${din(v.entrega)}</b></div>` : ''}
      <div><button type="button" class="link" data-acao="desconto" data-c="${c.id}">${v.desconto ? `Desconto${c.descontoInfo?.motivo ? ` (${t(c.descontoInfo.motivo)})` : c.cupom ? ` (${t(c.cupom)})` : ''}` : '+ Desconto'}</button><b>${v.desconto ? '− ' + din(v.desconto) : ''}</b></div>
      <div class="total"><span>Total</span><b>${din(v.total)}</b></div>
      ${v.pago ? `<div class="pago"><span>Já pago (${c.pagamentos.map((p) => t(p.forma)).join(', ')})</span><b>${din(v.pago)}</b></div><div class="total falta"><span>Falta</span><b>${din(v.falta)}</b></div>` : ''}
    </section>
    ${blocoFidelidade(c)}
    <div class="dividir"><button type="button" class="bt" data-acao="dividir" data-c="${c.id}">${ico('divide')}Dividir a conta</button><button type="button" class="bt" data-acao="imprimir-conta" data-c="${c.id}">${ico('impressora')}Pré-conta</button></div>
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
      <div class="caixa-det">${c ? detalhe(c) : '<div class="vazio grande">Escolha uma conta para fechar.</div>'}</div></div>`;
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
acao('dividir', (b) => {
  const c = comanda(b.dataset.c), v = conta(c); let n = c.pessoas || 2;
  folha({ titulo: 'Dividir a conta', corpo: `<div class="seg grande" role="group"><button type="button" aria-pressed="true" data-modo="igual">Igual</button><button type="button" aria-pressed="false" data-modo="itens">Por itens</button></div>
    <div data-igual><div class="qtd"><button type="button" class="bt-ico grande" data-menos>−</button><b data-n>${n}</b><button type="button" class="bt-ico grande" data-mais>+</button></div><p class="centro" data-parte></p></div>
    <div data-itens hidden><p class="mudo">Marque o que esta pessoa consumiu. O serviço entra proporcional.</p><ul class="itens marcar">${itensValidos(c).map((i) => `<li><label><input type="checkbox" data-it="${i.id}"><span>${i.qtd}× ${t(i.nome)}</span><b>${din(valorItem(i))}</b></label></li>`).join('')}</ul><p class="centro" data-sel></p></div>`,
  pe: '<button type="button" class="bt cheio grande" data-cobrar>Cobrar esta parte</button>',
  aoAbrir: (f, fechar) => {
    let modo = 'igual';
    const parteIgual = () => partes(v.falta, n)[0];
    const parteItens = () => { const ids = $$('[data-it]:checked', f).map((x) => x.dataset.it); const s = itensValidos(c).filter((i) => ids.includes(i.id)).reduce((a, i) => a + valorItem(i), 0); return r2(v.sub ? s * (v.total / v.sub) : s); };
    const atual = () => { $('[data-n]', f).textContent = n; $('[data-parte]', f).innerHTML = `${n} partes de <b>${din(parteIgual())}</b>`; $('[data-sel]', f).innerHTML = `Esta parte: <b>${din(parteItens())}</b>`; };
    $('[data-menos]', f).onclick = () => { n = Math.max(2, n - 1); atual(); }; $('[data-mais]', f).onclick = () => { n++; atual(); };
    $$('[data-it]', f).forEach((x) => { x.onchange = atual; });
    $$('[data-modo]', f).forEach((x) => { x.onclick = () => { modo = x.dataset.modo; $$('[data-modo]', f).forEach((y) => y.setAttribute('aria-pressed', y === x)); $('[data-igual]', f).hidden = modo !== 'igual'; $('[data-itens]', f).hidden = modo !== 'itens'; }; });
    $('[data-cobrar]', f).onclick = () => { const valor = modo === 'igual' ? parteIgual() : parteItens(); if (!(valor > 0)) return toast('Marque pelo menos um item'); fechar(); escolherForma(c, valor); };
    atual();
  } });
});
function escolherForma(c, valor) {
  folha({ titulo: `Receber ${din(valor)}`, corpo: `<div class="formas">${FORMAS.map(([f, i]) => `<button type="button" class="forma" data-f="${f}">${ico(i)}<span>${f}</span></button>`).join('')}</div>`,
    aoAbrir: (f, fechar) => $$('[data-f]', f).forEach((b) => { b.onclick = () => { fechar(); receber(c, b.dataset.f, valor); }; }) });
}
// já pago (ex.: Pix no pedido online): só fecha e tira da lista
acao('concluir', (b) => { const c = comanda(b.dataset.c); if (!c) return; fechar(c); ir('caixa'); toast(`${c.tipo === 'mesa' ? `Mesa ${c.mesa}` : `Pedido #${c.num}`} concluído`); });
acao('pagar', (b) => { const c = comanda(b.dataset.c); receber(c, b.dataset.f, conta(c).falta); });
function receber(c, forma, valor) {
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
    if (!cfg.pix?.chave) { toast('Cadastre a chave Pix do restaurante em Mais › Ajustes para gerar o QR'); return ir('mais/ajustes'); }
    const codigo = pix({ chave: cfg.pix.chave, nome: cfg.nome, cidade: cfg.cidade, valor, txid: `POPINA${(c.mesa || c.num || '')}${Date.now().toString(36)}`.slice(0, 25) });
    folha({ titulo: `Pix · ${din(valor)}`, corpo: `${cfg.pix.exemplo ? '<p class="aviso ouro">Chave de exemplo. Cadastre a chave do restaurante em Mais › Ajustes para o QR valer de verdade.</p>' : ''}
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
