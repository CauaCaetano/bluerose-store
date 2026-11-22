// Popina · caixa: abrir e fechar, contas abertas, fechar a conta (10%, desconto, dividir, Pix, dinheiro com troco, cartão, fiado),
// sangria e suprimento, e o fechamento do dia com o resumo pronto para mandar no WhatsApp do dono.
import { db, t, din, r2, num, vir, tempo, hora, conta, comanda, pagar, partes, darDesconto, ondeComanda, quemPediu, caixaResumo, abrirCaixa, movimento, fecharCaixa,
  regras, temPin, euSou, setEuSou, quemAgora, grava, FORMA_FIADO, registrarFiado, receberFiado, clientesFiado, saldoFiado, nomeFiado, soDig, fone, zap, vendaDeHoje, cancelarVenda,
  inicioDoDia, pagamentosVenda, itensValidos, pagoPorItem, livreDoItem, valorDosItens, valorItem } from './loja.js?v=50';
import { registrar, acao, ir } from './nucleo.js?v=50';
import { ico, folha, toast, confirma, autorizar, $, $$ } from './ui.js?v=50';
import { pix } from './pix.js?v=50';
import { qrSVG } from '../base/qr.js';
import { blocoTotais, voltar, rotaComanda } from './salao.js?v=50';
import { novoPedidoFolha } from './pedidos.js?v=50';
import { precisaGerente, limiteDesconto, podeCancelar } from './equipe.js?v=50';
import { abrirImpressao, htmlRecibo, imprimirConta } from './imprimir.js?v=50';

const FORMAS = [['Pix', 'pix'], ['Dinheiro', 'dinheiro'], ['Cartão de débito', 'cartao'], ['Cartão de crédito', 'cartao'], [FORMA_FIADO, 'etiqueta']];
const rotuloForma = (f) => (f === FORMA_FIADO ? 'Fiado' : f.replace('Cartão de débito', 'Débito').replace('Cartão de crédito', 'Crédito'));

// ------------------------------------------------------------------ tela do caixa
registrar('caixa', {
  titulo: 'Caixa',
  html() {
    const abertas = db.comandas.filter((c) => !c.quitado).sort((a, b) => (b.pediuConta ? 1 : 0) - (a.pediuConta ? 1 : 0) || a.aberta - b.aberta);
    const lista = `<div class="sec"><h2>Contas abertas (${abertas.length})</h2><button type="button" class="bt" data-acao="venda-rapida">${ico('mais2')}Venda no balcão</button></div>
      <div class="contas-ab">${abertas.map((c) => { const v = conta(c);
        return `<button type="button" class="conta-linha ${c.pediuConta ? 'pediu' : ''}" data-ir="fechar/${c.id}"><span><b>${t(c.tipo === 'mesa' ? `Mesa ${c.mesa}` : quemPediu(c))}</b><small>${c.tipo === 'mesa' ? `${c.pessoas || 1} ${c.pessoas === 1 ? 'pessoa' : 'pessoas'}` : t(ondeComanda(c))} · ${tempo(c.aberta)}${c.pediuConta ? ' · pediu a conta' : ''}${v.pago ? ` · pago ${din(v.pago)}` : ''}</small></span><span class="v">${din(v.falta || v.total)}</span></button>`; }).join('') || '<p class="vazio">Nenhuma conta aberta.</p>'}</div>`;
    if (!db.caixa) {
      return `<div class="cab"><div><h1>Caixa</h1><p>O caixa está fechado</p></div></div>
        <div class="cartao"><h2>Abrir o caixa</h2><p class="mudo" style="margin-bottom:12px">Conte o dinheiro do troco que está na gaveta.</p>
          <div class="grade2"><label class="campo"><span>Troco na gaveta (R$)</span><input data-troco inputmode="decimal" placeholder="0,00"></label>
          <label class="campo"><span>Quem está no caixa</span><input data-op maxlength="30" value="${t(euSou())}" placeholder="Seu nome"></label></div>
          <button type="button" class="bt cheio grande" data-abrir-cx>${ico('cofre')}Abrir o caixa</button></div>
        <div class="linha-bts" style="margin-top:14px"><button type="button" class="bt" data-ir="fechamento">${ico('grafico')}Resumo de hoje</button></div>${lista}`;
    }
    const r = caixaResumo();
    return `<div class="cab"><div><h1>Caixa</h1><p>Aberto às ${hora(db.caixa.aberto)}${db.caixa.operador ? ` por ${t(db.caixa.operador)}` : ''}</p></div>
      <div class="acoes"><button type="button" class="bt escuro grande" data-ir="fechamento">${ico('conta')}Fechar o dia</button></div></div>
    <div class="kpis"><div><small>Vendido no caixa</small><b>${din(r.total)}</b><span>${r.vendas.length} ${r.vendas.length === 1 ? 'venda' : 'vendas'}</span></div>
      <div><small>Dinheiro na gaveta</small><b>${din(r.dinheiroNaGaveta)}</b><span>troco ${din(db.caixa.troco)}${r.sangria ? ` · sangria ${din(r.sangria)}` : ''}</span></div>
      <div><small>No Pix</small><b>${din(r.porForma.Pix || 0)}</b><span>cartão ${din((r.porForma['Cartão de débito'] || 0) + (r.porForma['Cartão de crédito'] || 0))}</span></div></div>
    <div class="linha-bts" style="margin-top:14px"><button type="button" class="bt" data-acao="mov" data-t="sangria">${ico('moedas')}Sangria (tirar)</button><button type="button" class="bt" data-acao="mov" data-t="suprimento">${ico('moedas')}Suprimento (pôr)</button>
      <button type="button" class="bt" data-acao="receber-fiado">${ico('etiqueta')}Receber fiado</button><button type="button" class="bt" data-ir="vendas">${ico('relogio')}Vendas de hoje</button></div>
    ${lista}`;
  },
  montar(el) {
    const b = $('[data-abrir-cx]', el); if (!b) return;
    b.onclick = () => { const op = $('[data-op]', el).value.trim(); if (!op) return toast('Escreva quem está no caixa'); setEuSou(op); abrirCaixa(num($('[data-troco]', el).value), op); toast('Caixa aberto'); };
  },
});
acao('venda-rapida', () => novoPedidoFolha('balcao'));
acao('mov', (b) => {
  const tipo = b.dataset.t;
  folha({ titulo: tipo === 'sangria' ? 'Sangria: tirar dinheiro da gaveta' : 'Suprimento: pôr dinheiro na gaveta', corpo: `<label class="campo"><span>Valor (R$)</span><input data-v inputmode="decimal" placeholder="0,00"></label>
    <label class="campo"><span>Motivo</span><input data-m maxlength="80" placeholder="${tipo === 'sangria' ? 'Ex.: depósito no banco, pagar o gás' : 'Ex.: mais troco'}"></label>`,
  pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio grande" data-ok>Registrar</button>',
  aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = async () => { const v = num($('[data-v]', f).value); if (!(v > 0)) return toast('Escreva o valor');
    if (tipo === 'sangria' && precisaGerente('sangria')) { const r = await autorizar({ titulo: `Sangria de ${din(v)}`, texto: 'Quem está no aparelho não faz sangria sozinho.', pedirPin: true, sim: 'Autorizar' }); if (!r) return; }
    movimento(tipo, v, $('[data-m]', f).value.trim() || (tipo === 'sangria' ? 'Sangria' : 'Suprimento')); fechar(); toast(`${tipo === 'sangria' ? 'Sangria' : 'Suprimento'} de ${din(v)} registrado`); }; } });
});
acao('receber-fiado', () => receberFiadoFolha());
export function receberFiadoFolha(cidIni = '') {
  const devem = clientesFiado().filter((x) => x.saldo > 0.009);
  if (!devem.length) return toast('Ninguém está devendo no fiado');
  let cid = cidIni || devem[0].cid;
  folha({ titulo: 'Receber fiado', corpo: `<div class="chips quebra">${devem.map((x) => `<button type="button" class="chip" data-cid="${x.cid}" aria-pressed="${x.cid === cid}">${t(x.nome || fone(x.tel))} · ${din(x.saldo)}</button>`).join('')}</div>
    <label class="campo" style="margin-top:14px"><span>Valor recebido (R$)</span><input data-v inputmode="decimal" value="${vir(saldoFiado(cid).toFixed(2))}"></label>
    <div class="chips quebra">${['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito'].map((f, k) => `<button type="button" class="chip" data-fm="${f}" aria-pressed="${k === 0}">${rotuloForma(f)}</button>`).join('')}</div>`,
  pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio grande" data-ok>Receber</button>',
  aoAbrir: (f, fechar) => {
    let forma = 'Dinheiro';
    $$('[data-cid]', f).forEach((b) => { b.onclick = () => { cid = b.dataset.cid; $$('[data-cid]', f).forEach((x) => x.setAttribute('aria-pressed', x === b)); $('[data-v]', f).value = vir(saldoFiado(cid).toFixed(2)); }; });
    $$('[data-fm]', f).forEach((b) => { b.onclick = () => { forma = b.dataset.fm; $$('[data-fm]', f).forEach((x) => x.setAttribute('aria-pressed', x === b)); }; });
    $('[data-ok]', f).onclick = () => { const v = receberFiado(cid, num($('[data-v]', f).value), forma); if (!v) return toast('Confira o valor'); fechar(); toast(`Recebido ${din(v)} de ${nomeFiado(cid) || 'cliente'}`); };
  } });
}

// ------------------------------------------------------------------ fechar a conta
const estado = {}; // por comanda: { dividir: n, parte: k }
export function fiadoFolha(c, valor, concluir) {
  const cl = c?.cliente || {};
  folha({ titulo: `Fiado · ${din(valor)}`, corpo: `<p class="mudo" style="margin-bottom:12px">Fica na conta do cliente para receber depois (Caixa › Receber fiado).</p>
    <label class="campo"><span>Telefone do cliente (com DDD)</span><input data-tel inputmode="tel" autocomplete="off" value="${t(cl.tel || '')}" placeholder="16 99999-9999"></label>
    <label class="campo"><span>Nome do cliente</span><input data-nome maxlength="80" value="${t(cl.nome || '')}"></label><p data-info class="mudo"></p>`,
  pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio grande" data-ok>Pôr na conta do cliente</button>',
  aoAbrir: (f, fechar) => {
    const info = () => { const d = soDig($('[data-tel]', f).value); if (d.length < 10) { $('[data-info]', f).textContent = ''; return; } const cid = 't' + d, s = saldoFiado(cid), nm = nomeFiado(cid); if (nm && !$('[data-nome]', f).value) $('[data-nome]', f).value = nm; $('[data-info]', f).textContent = `Já deve ${din(s)}. Vai ficar devendo ${din(s + valor)}.`; };
    $('[data-tel]', f).oninput = info; info();
    $('[data-ok]', f).onclick = () => { const r = registrarFiado(c, { tel: $('[data-tel]', f).value, nome: $('[data-nome]', f).value }, valor); if (r.erro) return toast(r.erro); fechar(); concluir(r.cid); };
  } });
}
function pixFolha(c, valor, concluir) {
  const P = db.config.pix || {}, tem = !!P.chave;
  const cod = tem ? pix({ chave: P.chave, nome: db.config.nome, cidade: db.config.cidade, valor, txid: String(c.num || c.mesa || 'POPINA') }) : '';
  folha({ titulo: `Pix · ${din(valor)}`, corpo: tem ? `<div class="pix-box">${qrSVG(cod, 220)}<p>Mostre para o cliente ler com o app do banco.</p><code>${t(cod)}</code>${P.exemplo ? '<p class="aviso">Chave de exemplo da demonstração.</p>' : ''}</div>`
    : '<p class="aviso">Cadastre a chave Pix do restaurante em Gestão › Restaurante para aparecer o QR com o valor. Se o cliente já pagou por outra chave, confirme abaixo.</p>',
  pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt ok grande" data-ok>Recebi o Pix</button>',
  aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => { fechar(); concluir(); }; } });
}
function dinheiroFolha(valor, concluir) {
  folha({ titulo: `Dinheiro · ${din(valor)}`, corpo: `<label class="campo"><span>Quanto o cliente deu (R$)</span><input data-dado inputmode="decimal" placeholder="${vir(valor.toFixed(2))}"></label>
    <div class="chips quebra">${[...new Set([Math.ceil(valor / 5) * 5, Math.ceil(valor / 10) * 10, Math.ceil(valor / 50) * 50, Math.ceil(valor / 100) * 100])].filter((x) => x >= valor).map((x) => `<button type="button" class="chip" data-nota="${x}">${din(x)}</button>`).join('')}</div>
    <p class="troco" data-troco style="margin-top:14px">Troco: ${din(0)}</p>`,
  pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt ok grande" data-ok>Recebi</button>',
  aoAbrir: (f, fechar) => {
    const inp = $('[data-dado]', f), calc = () => { const d = num(inp.value) || valor; $('[data-troco]', f).textContent = d < valor - 0.009 ? `Faltam ${din(valor - d)}` : `Troco: ${din(d - valor)}`; };
    inp.oninput = calc; $$('[data-nota]', f).forEach((b) => { b.onclick = () => { inp.value = vir(b.dataset.nota); calc(); }; });
    $('[data-ok]', f).onclick = () => { const d = num(inp.value) || valor; if (d < valor - 0.009) return toast('O valor dado é menor que o da conta'); fechar(); concluir(r2(d - valor), d); };
  } });
}
registrar('fechar', {
  aba: 'caixa', titulo: 'Fechar conta',
  html(id) {
    const c0 = comanda(id), c = c0?.quitado ? null : c0;
    if (!c) {
      const v = c0?.vendaId ? db.vendas.find((x) => x.id === c0.vendaId) : db.vendas.find((x) => x.id === id || x.id.startsWith(`${id}-`));
      return `${voltar('caixa', 'Caixa')}<div class="cartao" style="text-align:center;max-width:560px;margin:20px auto"><div style="display:grid;place-items:center;margin-bottom:10px;color:var(--ok)">${ico('okcirc', 'style="width:64px;height:64px"')}</div>
        <h1 style="font-size:28px;margin-bottom:6px">${v ? 'Conta fechada' : 'Esta conta não está mais aberta'}</h1>${v ? `<p class="mudo">${t(v.onde || '')} · ${din(v.total)}${(v.pagamentos || []).reduce((s, p) => s + (p.troco || 0), 0) ? ` · troco ${din(v.pagamentos.reduce((s, p) => s + (p.troco || 0), 0))}` : ''}</p>` : ''}
        <div class="linha-bts" style="justify-content:center;margin-top:16px">${v ? `<button type="button" class="bt grande" data-acao="recibo-venda" data-id="${t(v.id)}">${ico('impressora')}Imprimir recibo</button>` : ''}<button type="button" class="bt cheio grande" data-ir="${v?.tipo === 'mesa' ? 'salao' : c0 ? 'pedidos' : 'caixa'}">${c0 ? 'Voltar aos pedidos' : 'Pronto'}</button></div>
        ${c0 ? '<p class="mudo" style="margin-top:12px">Pago. O pedido continua no quadro de Pedidos até você tocar em Entregue.</p>' : ''}</div>`;
    }
    const v = conta(c), e = (estado[c.id] ||= { dividir: 1 });
    const n = e.dividir, porItem = n === 'item', pt = !porItem && n > 1 ? partes(v.total, n) : null, pagas = (c.pagamentos || []).length;
    const sugestao = porItem ? 0 : pt ? Math.min(v.falta, pt[Math.min(pagas, n - 1)]) : v.falta;
    const pg = pagoPorItem(c);
    const selItem = (i) => { const l = livreDoItem(c, i, pg); if (l <= 0) return '<span class="etq livre">Pago</span>';
      return i.kg || l <= 1 ? `<input type="checkbox" data-it="${i.id}" data-max="${i.kg ? i.qtd : l}" aria-label="Pagar ${t(i.nome)}">`
        : `<select data-it="${i.id}" aria-label="Quantos ${t(i.nome)}">${Array.from({ length: l + 1 }, (_, k) => `<option value="${k}">${k}</option>`).join('')}</select>`; };
    return `${voltar(rotaComanda(c), c.tipo === 'mesa' ? `Mesa ${c.mesa}` : 'Pedido')}
    <div class="cab"><div><h1>Fechar conta · ${t(c.tipo === 'mesa' ? `Mesa ${c.mesa}` : quemPediu(c))}</h1><p>${t(ondeComanda(c))}${c.pessoas && c.tipo === 'mesa' ? ` · ${c.pessoas} pessoas` : ''}${c.garcom ? ` · ${t(c.garcom)}` : ''}</p></div></div>
    <div class="duas lado"><div class="cartao"><h2>Consumo</h2>
      <ul class="itens">${itensValidos(c).map((i) => `<li><span class="q">${i.kg ? '' : `${i.qtd}×`}</span><div class="nm"><b>${t(i.nome)}</b>${(i.adic || []).length ? `<small>${t(i.adic.map((a) => a.nome.replace(/^[^:]+: /, '')).join(', '))}</small>` : ''}</div><span class="v">${din(r2(i.qtd * (i.preco + (i.adic || []).reduce((s, a) => s + (a.preco || 0), 0))))}</span></li>`).join('') || '<li class="mudo">Sem itens.</li>'}</ul>
      ${blocoTotais(c)}
      <div style="margin-top:12px">${['mesa', 'cartao', 'evento'].includes(c.tipo) ? `<label class="liga">Taxa de serviço (${v.pctServ}%)<input type="checkbox" data-serv ${c.servico ? 'checked' : ''}></label>` : ''}
        <div class="linha-bts" style="margin-top:10px"><button type="button" class="bt" data-acao="desconto" data-id="${c.id}">${ico('etiqueta')}${v.desconto ? 'Mudar desconto' : 'Desconto'}</button>
        <button type="button" class="bt" data-acao="imp-conta" data-id="${c.id}">${ico('impressora')}Imprimir conta</button></div></div>
    </div>
    <div class="cartao"><h2>Pagamento</h2>
      <p class="campo"><span style="font-weight:700">Dividir a conta</span></p>
      <div class="chips quebra" role="group" aria-label="Dividir">${[1, 2, 3, 4, 5, 6].map((k) => `<button type="button" class="chip" data-div="${k}" aria-pressed="${n === k}">${k === 1 ? 'Não dividir' : `${k} pessoas`}</button>`).join('')}<button type="button" class="chip" data-div="item" aria-pressed="${porItem}">Por item</button></div>
      ${porItem ? `<p class="mudo" style="margin:6px 0">Marque o que esta pessoa consumiu. O valor já leva ${v.servico ? `os ${v.pctServ}% e ` : ''}o desconto na mesma proporção.</p>
        <ul class="itens">${itensValidos(c).map((i) => `<li><span class="q">${i.kg ? '' : `${i.qtd}×`}</span><div class="nm"><b>${t(i.nome)}</b></div><span class="v">${din(valorItem(i))}</span><label style="margin-left:10px">${selItem(i)}</label></li>`).join('')}</ul>` : ''}
      ${pt ? `<p class="aviso ok" style="margin:6px 0 12px">Cada pessoa paga <b>${din(pt[0])}</b>${pt[n - 1] !== pt[0] ? ` (a última, ${din(pt[n - 1])})` : ''}. Já pagaram ${Math.min(pagas, n)} de ${n}.</p>` : ''}
      <label class="campo"><span>Valor deste pagamento (R$)</span><input data-valor inputmode="decimal" value="${vir(sugestao.toFixed(2))}"></label>
      <div class="formas">${FORMAS.map(([f, i]) => `<button type="button" class="forma" data-forma="${t(f)}">${ico(i)}${rotuloForma(f)}</button>`).join('')}</div>
      ${(c.pagamentos || []).length ? `<ul class="pago-l">${c.pagamentos.map((p) => `<li><span>${ico('check', 'style="width:18px;height:18px;vertical-align:-3px"')} ${t(rotuloForma(p.forma))}${p.troco ? ` · troco ${din(p.troco)}` : ''}</span><span>${din(p.valor)}</span></li>`).join('')}</ul>` : ''}
      <div class="totais"><div class="total"><span>Falta pagar</span><span class="num">${din(v.falta)}</span></div></div>
    </div></div>`;
  },
  montar(el, id) {
    const c = comanda(id); if (!c || c.quitado) return;
    const serv = $('[data-serv]', el); if (serv) serv.onchange = () => { c.servico = serv.checked; grava(); };
    $$('[data-div]', el).forEach((b) => { b.onclick = () => { estado[c.id].dividir = b.dataset.div === 'item' ? 'item' : Number(b.dataset.div); ir(`fechar/${id}`); }; });
    const selDe = () => { const s = {}; $$('[data-it]', el).forEach((x) => { const q = x.type === 'checkbox' ? (x.checked ? Number(x.dataset.max) || 1 : 0) : Number(x.value); if (q > 0) s[x.dataset.it] = q; }); return s; };
    $$('[data-it]', el).forEach((x) => { x.onchange = () => { $('[data-valor]', el).value = vir(valorDosItens(c, selDe()).toFixed(2)); }; });
    $$('[data-forma]', el).forEach((b) => { b.onclick = () => {
      const valor = r2(Math.min(num($('[data-valor]', el).value), conta(c).falta));
      if (!(valor > 0)) return toast('Escreva o valor do pagamento');
      const f = b.dataset.forma, fim = (extra = {}) => { const fechou = valor >= conta(c).falta - 0.009; const s = estado[c.id]?.dividir === 'item' ? selDe() : null; pagar(c, f, valor, s && Object.keys(s).length ? { ...extra, itens: s } : extra); toast(fechou ? 'Conta fechada' : `${din(valor)} recebido`); if (fechou) ir(`fechar/${id}`); };
      if (f === 'Pix') pixFolha(c, valor, () => fim());
      else if (f === 'Dinheiro') dinheiroFolha(valor, (troco, dado) => fim(troco ? { troco, dado } : {}));
      else if (f === FORMA_FIADO) fiadoFolha(c, valor, (cid) => fim({ fiado: cid }));
      else fim();
    }; });
  },
});
acao('desconto', async (b) => {
  const c = comanda(b.dataset.id); if (!c) return; const v = conta(c), lim = Number(limiteDesconto()) || 0;
  folha({ titulo: 'Desconto', corpo: `<div class="grade2"><label class="campo"><span>Em reais (R$)</span><input data-r inputmode="decimal" value="${c.desconto ? vir(c.desconto) : ''}" placeholder="0,00"></label><label class="campo"><span>Ou em %</span><input data-p inputmode="decimal" placeholder="Ex.: 10"></label></div>
    <label class="campo"><span>Motivo</span><input data-m maxlength="80" value="${t(c.descontoInfo?.motivo || '')}" placeholder="Ex.: cliente de sempre, demora"></label>
    ${temPin() ? `<p class="mudo">Acima de ${lim}% pede a senha do gerente.</p>` : ''}`,
  pe: `${c.desconto ? '<button type="button" class="bt" data-tirar>Tirar desconto</button>' : '<button type="button" class="bt" data-fechar>Voltar</button>'}<button type="button" class="bt cheio grande" data-ok>Dar desconto</button>`,
  aoAbrir: (f, fechar) => {
    $('[data-p]', f).oninput = () => { $('[data-r]', f).value = vir(r2(v.sub * num($('[data-p]', f).value) / 100).toFixed(2)); };
    $('[data-tirar]', f)?.addEventListener('click', () => { darDesconto(c, 0); fechar(); });
    $('[data-ok]', f).onclick = async () => {
      const val = r2(num($('[data-r]', f).value)), mot = $('[data-m]', f).value.trim(); if (!(val > 0)) return toast('Escreva o valor');
      if (val > v.sub) return toast('O desconto é maior que o consumo');
      fechar();
      if (temPin() && v.sub && val / v.sub * 100 > lim + 0.01) { const r = await autorizar({ titulo: `Desconto de ${din(val)}`, texto: `Passa de ${lim}% do consumo.`, pedirPin: true, sim: 'Autorizar' }); if (!r) return; darDesconto(c, val, mot, `${quemAgora(c)} · senha do gerente`); }
      else darDesconto(c, val, mot);
      toast('Desconto aplicado');
    };
  } });
});
// recibo de venda já fechada (reimpressão)
export function comandaDaVenda(v) {
  return { tipo: v.tipo, mesa: v.mesa, num: v.num, pessoas: v.pessoas, cliente: v.cliente ? { tel: v.cliente, nome: v.nomeCliente || '' } : {}, servico: v.servicoOn ?? !!v.servico, taxaEntrega: v.entrega || 0, desconto: v.desconto || 0,
    itens: (v.itens || []).map((i, k) => ({ id: `r${k}`, prod: i.prod, nome: i.nome, qtd: i.qtd, preco: i.preco, adic: [], status: 'entregue', ...(i.kg ? { kg: i.kg } : {}) })), pagamentos: pagamentosVenda(v), modo: v.modo };
}
acao('recibo-venda', (b) => { const v = db.vendas.find((x) => x.id === b.dataset.id); if (v) abrirImpressao(`Recibo · ${v.onde || ''}`, (f) => htmlRecibo(comandaDaVenda(v), f, { titulo: 'RECIBO (não é documento fiscal)' })); });

// ------------------------------------------------------------------ vendas de hoje (reimprimir e cancelar)
registrar('vendas', {
  aba: 'caixa', titulo: 'Vendas de hoje',
  html() {
    const l = db.vendas.filter(vendaDeHoje).sort((a, b) => b.ts - a.ts);
    return `${voltar('caixa', 'Caixa')}<div class="cab"><div><h1>Vendas de hoje</h1><p>${l.filter((v) => !v.cancelado).length} vendas · ${din(l.filter((v) => !v.cancelado).reduce((s, v) => s + v.total, 0))}</p></div></div>
    <div class="rolo"><table class="tabela"><thead><tr><th>Hora</th><th>Onde</th><th>Pagamento</th><th class="n">Total</th><th></th></tr></thead><tbody>
    ${l.map((v) => `<tr${v.cancelado ? ' style="opacity:.55"' : ''}><td>${hora(v.ts)}</td><td><b>${t(v.onde || v.tipo)}</b>${v.cancelado ? `<small>Cancelada: ${t(v.cancelado.motivo || '')}</small>` : ''}</td><td>${t(pagamentosVenda(v).map((p) => rotuloForma(p.forma)).join(' + '))}</td><td class="n">${din(v.total)}</td>
      <td class="n"><button type="button" class="bt-ico" data-acao="recibo-venda" data-id="${t(v.id)}" aria-label="Imprimir recibo">${ico('impressora')}</button>${v.cancelado ? '' : `<button type="button" class="bt-ico" data-acao="cancelar-venda" data-id="${t(v.id)}" aria-label="Cancelar venda">${ico('lixo')}</button>`}</td></tr>`).join('') || '<tr><td colspan="5" class="mudo">Nenhuma venda hoje ainda.</td></tr>'}
    </tbody></table></div>`;
  },
});
acao('cancelar-venda', async (b) => {
  const v = db.vendas.find((x) => x.id === b.dataset.id); if (!v) return;
  if (!podeCancelar()) return toast('Você não pode cancelar. Chame o gerente para entrar no topo.');
  const r = await autorizar({ titulo: `Cancelar a venda de ${din(v.total)}?`, texto: 'A venda fica marcada como cancelada e sai do faturamento. Devolva o dinheiro ao cliente se for o caso.', motivos: ['Cobrado em dobro', 'Lançado errado', 'Cliente desistiu'], pedirPin: precisaGerente('cancelar'), sim: 'Cancelar a venda', perigo: true });
  if (!r) return; cancelarVenda(v, r.motivo, r.pin ? `${quemAgora()} · senha do gerente` : quemAgora()); toast('Venda cancelada');
});

// ------------------------------------------------------------------ fechamento do dia
const FORMA_ORDEM = ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', FORMA_FIADO];
export function resumoDia() {
  const desde = db.caixa?.aberto || inicioDoDia(), r = caixaResumo(desde);
  const formas = Object.keys(r.porForma).sort((a, b) => (FORMA_ORDEM.indexOf(a) + 99) % 99 - (FORMA_ORDEM.indexOf(b) + 99) % 99);
  const tipos = {}; r.vendas.forEach((v) => { const k = v.tipo === 'mesa' ? 'Salão' : v.tipo === 'delivery' ? 'Entrega' : 'Balcão e retirada'; tipos[k] = r2((tipos[k] || 0) + v.total); });
  const garc = {}; r.vendas.filter((v) => v.garcom).forEach((v) => { garc[v.garcom] = r2((garc[v.garcom] || 0) + (v.servico || 0)); });
  const top = {}; r.vendas.forEach((v) => (v.itens || []).forEach((i) => { const k = i.nome.replace(/ \(.*\)$/, '').replace(/ · .*$/, ''); top[k] = (top[k] || 0) + (i.kg ? 1 : i.qtd); }));
  return { ...r, desde, formas, tipos, garc, top: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5), abertas: db.comandas.filter((c) => !c.quitado).length, ticket: r.vendas.length ? r2(r.total / r.vendas.length) : 0 };
}
// formas que dá para conferir fora do sistema (maquininha e extrato do Pix)
const conferiveis = (x) => x.formas.filter((f) => f !== 'Dinheiro' && f !== FORMA_FIADO && (x.porForma[f] || 0) > 0);
export function textoResumo(x, contado = null, conf = null) {
  const d = new Date(), L = [];
  L.push(`*${db.config.nome} · fechamento de ${d.toLocaleDateString('pt-BR')}*`);
  L.push(`Vendido: *${din(x.total)}* em ${x.vendas.length} ${x.vendas.length === 1 ? 'venda' : 'vendas'} (média ${din(x.ticket)})`);
  L.push('', '*Por forma de pagamento*'); x.formas.forEach((f) => L.push(`• ${rotuloForma(f)}: ${din(x.porForma[f])}`));
  if (Object.keys(x.tipos).length) { L.push('', '*Por tipo*'); Object.entries(x.tipos).forEach(([k, v]) => L.push(`• ${k}: ${din(v)}`)); }
  if (x.servico) L.push('', `Taxa de serviço (10%): ${din(x.servico)}${Object.keys(x.garc).length ? ` · ${Object.entries(x.garc).map(([g, v]) => `${g} ${din(v)}`).join(', ')}` : ''}`);
  if (x.entregas) L.push(`Taxas de entrega: ${din(x.entregas)}`);
  if (db.caixa) { L.push('', '*Gaveta*', `Troco inicial: ${din(db.caixa.troco)}`); if (x.sangria) L.push(`Sangrias: − ${din(x.sangria)}`); if (x.suprimento) L.push(`Suprimentos: + ${din(x.suprimento)}`); L.push(`Dinheiro esperado: ${din(x.dinheiroNaGaveta)}`); if (contado != null) L.push(`Contado: ${din(contado)} (${contado - x.dinheiroNaGaveta === 0 ? 'bateu' : `diferença ${din(contado - x.dinheiroNaGaveta)}`})`); }
  if (conf) { L.push('', '*Conferência*'); Object.entries(conf).forEach(([f, v]) => { const d = r2(v - (x.porForma[f] || 0)); L.push(`• ${rotuloForma(f)}: ${din(v)} (${Math.abs(d) < 0.01 ? 'bateu' : `diferença ${din(d)}`})`); }); }
  if (x.fiadoRec) L.push(`Fiado recebido: ${din(x.fiadoRec)}`);
  if (x.cancelados) L.push(`Vendas canceladas: ${x.cancelados}`);
  if (x.abertas) L.push(`Contas ainda abertas: ${x.abertas}`);
  if (x.top.length) { L.push('', '*Mais vendidos*'); x.top.forEach(([n, q]) => L.push(`• ${q}× ${n}`)); }
  L.push('', '_Enviado pelo Popina_');
  return L.join('\n');
}
function htmlFechamento(x, contado, f) {
  return `<div class="tk ${f === 'a4' ? 'a4' : ''}"><h1>${t(db.config.nome)}</h1><p class="c"><b>FECHAMENTO DO DIA</b></p><p class="c">${new Date().toLocaleString('pt-BR')}</p><hr>
    <table><tr class="grande"><td>Vendido</td><td class="n">${din(x.total)}</td></tr><tr><td>Vendas</td><td class="n">${x.vendas.length}</td></tr>
    ${x.formas.map((k) => `<tr><td>${t(rotuloForma(k))}</td><td class="n">${din(x.porForma[k])}</td></tr>`).join('')}</table><hr>
    <table>${x.servico ? `<tr><td>Serviço (10%)</td><td class="n">${din(x.servico)}</td></tr>` : ''}${x.entregas ? `<tr><td>Entregas</td><td class="n">${din(x.entregas)}</td></tr>` : ''}
    ${db.caixa ? `<tr><td>Troco inicial</td><td class="n">${din(db.caixa.troco)}</td></tr><tr><td>Sangrias</td><td class="n">${din(x.sangria)}</td></tr><tr><td>Suprimentos</td><td class="n">${din(x.suprimento)}</td></tr><tr class="grande"><td>Gaveta</td><td class="n">${din(x.dinheiroNaGaveta)}</td></tr>` : ''}
    ${contado != null ? `<tr><td>Contado</td><td class="n">${din(contado)}</td></tr><tr><td>Diferença</td><td class="n">${din(contado - x.dinheiroNaGaveta)}</td></tr>` : ''}</table><hr><p class="c">Popina</p></div>`;
}
registrar('fechamento', {
  aba: 'caixa', titulo: 'Fechamento do dia',
  html() {
    const x = resumoDia(), zapDono = db.config.whatsappDono || db.config.whatsapp || '';
    const ult = (db.fechamentos || []).slice(-5).reverse();
    return `${voltar('caixa', 'Caixa')}<div class="cab"><div><h1>Fechamento do dia</h1><p>Desde ${hora(x.desde)}${db.caixa ? ` · caixa de ${t(db.caixa.operador || '')}` : ' · caixa fechado'}</p></div></div>
    <div class="duas lado"><div>
      <div class="kpis"><div><small>Vendido</small><b>${din(x.total)}</b><span>${x.vendas.length} vendas · média ${din(x.ticket)}</span></div>${db.caixa ? `<div><small>Dinheiro esperado na gaveta</small><b>${din(x.dinheiroNaGaveta)}</b><span>troco ${din(db.caixa.troco)} + dinheiro − sangrias</span></div>` : ''}</div>
      <div class="cartao" style="margin-top:14px"><h2>Por forma de pagamento</h2><ul class="lista-l">${x.formas.map((f) => `<li><div class="tx"><b>${t(rotuloForma(f))}</b></div><b class="num">${din(x.porForma[f])}</b></li>`).join('') || '<li class="mudo">Nenhuma venda ainda.</li>'}</ul></div>
      <div class="cartao"><h2>Outros números</h2><ul class="lista-l">
        ${Object.entries(x.tipos).map(([k, v]) => `<li><div class="tx">${k}</div><b class="num">${din(v)}</b></li>`).join('')}
        <li><div class="tx">Taxa de serviço (10%)</div><b class="num">${din(x.servico)}</b></li><li><div class="tx">Taxas de entrega</div><b class="num">${din(x.entregas)}</b></li>
        ${x.sangria ? `<li><div class="tx">Sangrias</div><b class="num">− ${din(x.sangria)}</b></li>` : ''}${x.suprimento ? `<li><div class="tx">Suprimentos</div><b class="num">${din(x.suprimento)}</b></li>` : ''}
        ${x.fiadoRec ? `<li><div class="tx">Fiado recebido</div><b class="num">${din(x.fiadoRec)}</b></li>` : ''}${x.cancelados ? `<li><div class="tx">Vendas canceladas</div><b>${x.cancelados}</b></li>` : ''}</ul></div>
    </div><div>
      ${x.abertas ? `<p class="aviso" style="margin-bottom:14px">Ainda há ${x.abertas} ${x.abertas === 1 ? 'conta aberta' : 'contas abertas'}. Elas continuam abertas para amanhã se você fechar o caixa agora.</p>` : ''}
      <div class="cartao"><h2>Conferir e fechar</h2>
        ${db.caixa ? `<label class="campo"><span>Dinheiro contado na gaveta (R$)</span><input data-contado inputmode="decimal" placeholder="${vir(x.dinheiroNaGaveta.toFixed(2))}"></label><p data-dif class="mudo" style="margin:-6px 0 12px"></p>
          ${conferiveis(x).length ? `<p class="grupo-tit">Confira também (opcional)</p><p class="mudo" style="margin-bottom:8px">Escreva o que a maquininha e o extrato do Pix mostram.</p>
          <div class="conf">${conferiveis(x).map((f) => `<label class="campo"><span>${t(rotuloForma(f))} · no sistema ${din(x.porForma[f])}</span><input data-conf="${t(f)}" inputmode="decimal" placeholder="${vir(x.porForma[f].toFixed(2))}"><small data-cdif></small></label>`).join('')}</div>` : ''}` : ''}
        <div class="linha-bts">
          <a class="bt ok grande largo" data-zap target="_blank" rel="noopener" href="${zap(zapDono, textoResumo(x))}">${ico('zap')}Mandar no WhatsApp${zapDono ? '' : ' (escolha o contato)'}</a>
          <button type="button" class="bt grande" data-imp-fech>${ico('impressora')}Imprimir</button>
          ${db.caixa ? `<button type="button" class="bt escuro grande" data-fechar-cx>${ico('cofre')}Fechar o caixa</button>` : ''}</div>
        <p class="mudo" style="margin-top:10px">${zapDono ? `Vai para o WhatsApp do dono: ${t(fone(zapDono))}. Troque em Gestão › Restaurante.` : 'Cadastre o WhatsApp do dono em Gestão › Restaurante para o resumo ir direto.'}</p></div>
      ${ult.length ? `<div class="cartao"><h2>Caixas fechados</h2><ul class="lista-l">${ult.map((f) => `<li><div class="tx"><b>${new Date(f.fechado).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} · ${din(f.resumo?.total)}</b><small>${f.resumo?.vendas || 0} vendas · ${t(f.fechadoPor || f.operador || '')}${f.resumo?.diferenca ? ` · diferença ${din(f.resumo.diferenca)}` : ' · gaveta bateu'}${f.conferencia && Object.entries(f.conferencia).some(([k, v]) => Math.abs(v - (f.resumo?.porForma?.[k] || 0)) >= 0.01) ? ' · maquininha ou Pix com diferença' : ''}</small></div></li>`).join('')}</ul></div>` : ''}
    </div></div>`;
  },
  montar(el) {
    const x = resumoDia(), inp = $('[data-contado]', el), zapDono = db.config.whatsappDono || db.config.whatsapp || '';
    const contado = () => (inp && inp.value.trim() ? num(inp.value) : null);
    const conf = () => { const o = {}; $$('[data-conf]', el).forEach((i) => { if (i.value.trim()) o[i.dataset.conf] = num(i.value); }); return Object.keys(o).length ? o : null; };
    if (inp) inp.oninput = () => { const c = contado(); $('[data-dif]', el).textContent = c == null ? '' : Math.abs(c - x.dinheiroNaGaveta) < 0.01 ? 'Bateu certinho.' : `Diferença de ${din(c - x.dinheiroNaGaveta)}.`; $('[data-zap]', el).href = zap(zapDono, textoResumo(x, c, conf())); };
    $$('[data-conf]', el).forEach((i) => { i.oninput = () => { const f = i.dataset.conf, d = r2(num(i.value) - (x.porForma[f] || 0)), s = i.parentElement.querySelector('[data-cdif]');
      s.textContent = !i.value.trim() ? '' : Math.abs(d) < 0.01 ? 'Bateu.' : `Diferença de ${din(d)}${d < 0 ? ' (veio menos)' : ''}.`; s.className = !i.value.trim() || Math.abs(d) < 0.01 ? '' : 'alerta-txt'; $('[data-zap]', el).href = zap(zapDono, textoResumo(x, contado(), conf())); }; });
    $('[data-imp-fech]', el).onclick = () => abrirImpressao('Fechamento do dia', (f) => htmlFechamento(x, contado(), f));
    $('[data-fechar-cx]', el)?.addEventListener('click', async () => {
      const c = contado(); if (c == null) { toast('Conte o dinheiro da gaveta e escreva o valor'); inp.focus(); return; }
      if (!(await confirma(`Fechar o caixa com ${din(c)} na gaveta?`, 'Fechar o caixa'))) return;
      const cf = conf(), txt = textoResumo(x, c, cf);
      const difForma = cf && Object.entries(cf).some(([f, v]) => Math.abs(v - (x.porForma[f] || 0)) >= 0.01);
      fecharCaixa(c, Math.abs(c - x.dinheiroNaGaveta) >= 0.01 || difForma ? 'Diferença na conferência' : '', quemAgora(), cf);
      folha({ titulo: 'Caixa fechado', corpo: `<p class="aviso ok">Caixa fechado com ${din(c)} na gaveta. Mande o resumo para o dono:</p><pre style="white-space:pre-wrap;font:15px/1.45 var(--fonte);background:var(--papel);border:1px solid var(--linha);border-radius:12px;padding:12px;margin-top:12px">${t(txt.replace(/[*_]/g, ''))}</pre>`,
        pe: `<a class="bt ok grande" target="_blank" rel="noopener" href="${zap(zapDono, txt)}" data-fechar>${ico('zap')}Mandar no WhatsApp</a>` });
    });
  },
});
export { imprimirConta };
