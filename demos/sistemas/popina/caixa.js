// Popina · caixa: contas abertas, fechar conta (serviço, desconto, dividir, pagar em partes), Pix com QR e o caixa do dia.
import { db, t, din, dinCurto, tempo, comanda, conta, valorItem, itensValidos, pagar, fechar, partes, novoPedido, venderDireto, caixaResumo, abrirCaixa, movimento, fecharCaixa, grava, r2 } from './loja.js?v=10';
import { registrar, acao, ir } from './nucleo.js?v=10';
import { ico, folha, toast, confirma, $, $$ } from './ui.js?v=10';
import { pix } from './pix.js?v=10';
import { qrSVG } from '../base/qr.js';
import { linhaItem, abrirSeletor } from './salao.js?v=10';

const FORMAS = [['Dinheiro', 'dinheiro'], ['Pix', 'pix'], ['Cartão de débito', 'cartao'], ['Cartão de crédito', 'cartao']];
const ONDE = (c) => (c.tipo === 'mesa' ? `Mesa ${c.mesa}` : c.tipo === 'delivery' ? `Delivery #${c.num}` : `Balcão #${c.num}`);
const abertas = () => db.comandas.slice().sort((a, b) => (b.pediuConta ? 1 : 0) - (a.pediuConta ? 1 : 0) || a.aberta - b.aberta);

function painelCaixa() {
  if (!db.caixa) return `<section class="cartao-caixa fechado"><div><b>Caixa fechado</b><p>Abra o caixa com o troco para começar o dia.</p></div><button type="button" class="bt cheio" data-acao="abrir-caixa">Abrir caixa</button></section>`;
  const r = caixaResumo();
  const IF = { Dinheiro: 'dinheiro', Pix: 'pix' };
  return `<section class="cartao-caixa"><div class="cc-topo"><img class="cx-louro" src="img/k-louro-esq.webp?v=1" alt="" width="56" height="74"><div><small>Caixa aberto há ${tempo(db.caixa.aberto)}${db.caixa.operador ? ` · ${t(db.caixa.operador)}` : ''}</small><b>${din(r.total)}</b><span>${r.vendas.length} vendas hoje</span></div><img class="cx-louro" src="img/k-louro-dir.webp?v=1" alt="" width="56" height="74"></div>
    <div class="cc-bts"><button type="button" class="bt" data-acao="mov" data-t="sangria">Sangria</button><button type="button" class="bt" data-acao="mov" data-t="suprimento">Suprimento</button><button type="button" class="bt escuro" data-acao="fechar-caixa">Fechar caixa</button></div>
    <div class="cc-formas">${Object.entries(r.porForma).map(([f, v]) => `<div>${ico(IF[f] || 'cartao')}<span>${t(f)}</span><b>${din(v)}</b></div>`).join('') || '<div><span>Sem vendas ainda</span></div>'}<div title="Troco ${dinCurto(db.caixa?.troco || 0)} + dinheiro ${dinCurto(r.porForma.Dinheiro || 0)}${r.suprimento ? ` + suprimento ${dinCurto(r.suprimento)}` : ''}${r.sangria ? ` − sangria ${dinCurto(r.sangria)}` : ''}">${ico('cofre')}<span>Na gaveta</span><b>${din(r.dinheiroNaGaveta)}</b></div></div></section>`;
}
function listaContas(sel) {
  return abertas().map((c) => { const v = conta(c);
    return `<a class="conta-linha ${c.id === sel ? 'on' : ''} ${c.pediuConta ? 'pediu' : ''}" href="#caixa/${c.id}"><i class="cl-ico">${ico(c.tipo === 'mesa' ? 'mesa' : c.tipo === 'delivery' ? 'moto' : 'sacola')}</i><div><b>${ONDE(c)}</b><small>${c.tipo === 'mesa' ? `${c.pessoas} pessoas · ` : c.cliente?.nome ? t(c.cliente.nome) + ' · ' : ''}${tempo(c.aberta)}${c.pediuConta ? ' · pediu a conta' : ''}</small></div><span>${din(v.total)}</span>${ico('dir')}</a>`; }).join('') || '<div class="vazio">Nenhuma conta aberta.</div>';
}
function detalhe(c) {
  const v = conta(c), it = itensValidos(c);
  return `<div class="conta-det"><header class="cab-conta"><a class="bt-ico so-cel" href="#caixa" aria-label="Voltar">${ico('voltar')}</a><h1 class="fita">${ONDE(c)}</h1><p>${c.tipo === 'mesa' ? `${c.pessoas} pessoas · ` : ''}aberta há ${tempo(c.aberta)}</p><img class="cx-aqueduto" src="img/aqueduto.webp?v=2" alt="" width="340" height="88"></header>
    ${navigator.onLine ? '' : '<p class="aviso ouro">Sem internet: o pagamento fica guardado neste aparelho e vai para os outros quando a conexão voltar. Não cobre esta conta em outro caixa até lá.</p>'}
    <ul class="itens">${c.itens.map((i) => linhaItem(c, i, false)).join('')}</ul>
    <section class="totais">
      <div><span>Consumo (${it.reduce((s, i) => s + i.qtd, 0)} itens)</span><b>${din(v.sub)}</b></div>
      ${c.tipo === 'mesa' ? `<div><label class="interruptor"><input type="checkbox" data-acao="servico" data-c="${c.id}" ${c.servico ? 'checked' : ''}><span></span>Serviço ${db.config.servico}%</label><b>${din(v.servico)}</b></div>` : ''}
      ${v.entrega ? `<div><span>Entrega (${t(c.cliente?.bairro || '')})</span><b>${din(v.entrega)}</b></div>` : ''}
      <div><button type="button" class="link" data-acao="desconto" data-c="${c.id}">${v.desconto ? 'Desconto' : '+ Desconto'}</button><b>${v.desconto ? '− ' + din(v.desconto) : ''}</b></div>
      <div class="total"><span>Total</span><b>${din(v.total)}</b></div>
      ${v.pago ? `<div class="pago"><span>Já pago (${c.pagamentos.map((p) => t(p.forma)).join(', ')})</span><b>${din(v.pago)}</b></div><div class="total falta"><span>Falta</span><b>${din(v.falta)}</b></div>` : ''}
    </section>
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
acao('servico', (b) => { const c = comanda(b.dataset.c); c.servico = b.checked ?? !c.servico; grava(); });
acao('desconto', (b) => {
  const c = comanda(b.dataset.c);
  folha({ titulo: 'Desconto', corpo: `<label class="campo"><span>Valor do desconto (R$)</span><input data-v inputmode="decimal" value="${c.desconto ? String(c.desconto).replace('.', ',') : ''}" placeholder="0,00"></label>
    <div class="chips">${[5, 10, 15].map((p) => `<button type="button" class="chip" data-p="${p}">${p}% (${din(conta(c).sub * p / 100)})</button>`).join('')}</div>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Aplicar</button>',
  aoAbrir: (f, fechar) => {
    $$('[data-p]', f).forEach((x) => { x.onclick = () => { $('[data-v]', f).value = String(r2(conta(c).sub * x.dataset.p / 100)).replace('.', ','); }; });
    $('[data-ok]', f).onclick = () => { c.desconto = r2(Number(String($('[data-v]', f).value).replace(',', '.')) || 0); grava(); fechar(); };
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
    ${v.servico ? `<tr class="t"><td>Serviço ${db.config.servico}%</td><td>${dinCurto(v.servico)}</td></tr>` : ''}${v.entrega ? `<tr><td>Entrega</td><td>${dinCurto(v.entrega)}</td></tr>` : ''}${v.desconto ? `<tr><td>Desconto</td><td>-${dinCurto(v.desconto)}</td></tr>` : ''}
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
    aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => { const v = Number($('[data-v]', f).value.replace(',', '.')); if (!(v > 0)) return toast('Informe o valor'); movimento(tipo, v, $('[data-m]', f).value); fechar(); toast('Registrado'); }; } });
});
acao('fechar-caixa', () => {
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
      fecharCaixa(cont(), mot, db.caixa?.operador || ''); fechar(); toast('Caixa fechado. O resumo fica em Relatórios.');
    };
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
