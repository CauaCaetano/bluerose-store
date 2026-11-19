// Popina · impressão pelo navegador: pedido da cozinha e recibo na impressora térmica de 80 mm, ou em folha A4.
// Usa o window.print() do navegador com CSS de impressão (@page de 80 mm ou A4). Não precisa instalar nada.
import { db, t, din, conta, itensValidos, valorItem, ondeComanda, quemPediu, hora, lojaCfg, fone } from './loja.js?v=41';
import { folha, toast, $, $$, ico } from './ui.js?v=41';

const ler = (k, pad) => { try { return localStorage.getItem(k) ?? pad; } catch { return pad; } };
const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* nada */ } };
export const formatoPadrao = () => (ler('popina-papel-impressao', '80') === 'a4' ? 'a4' : '80');
export const setFormato = (f) => gravar('popina-papel-impressao', f === 'a4' ? 'a4' : '80');
export const autoImprimir = () => ler('popina-auto-imprimir', '') === '1';
export const setAutoImprimir = (on) => gravar('popina-auto-imprimir', on ? '1' : '');

const data = (ts = Date.now()) => new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const adicTxt = (i) => (i.adic || []).map((a) => a.nome.replace(/^[^:]+: /, '') + (a.preco ? ` (+${din(a.preco)})` : '')).join(', ');
const cabLoja = () => {
  const L = lojaCfg(), c = db.config;
  return `<h1>${t(c.nome || 'Restaurante')}</h1>${L.endereco ? `<p class="c">${t(L.endereco)}</p>` : ''}${c.whatsapp ? `<p class="c">${t(fone(c.whatsapp))}</p>` : ''}`;
};
// pedido da cozinha: letras grandes, só o que importa para preparar (sem preço)
export function htmlCozinha(c, itens, f = formatoPadrao()) {
  const cli = c.cliente || {};
  return `<div class="tk cozinha ${f === 'a4' ? 'a4' : ''}">
    <h2>${t(quemPediu(c))}</h2>
    <p class="c">${c.tipo === 'mesa' ? `${c.pessoas || 1} pessoas` : t(ondeComanda(c))}${c.senha ? ` · senha ${c.senha}` : ''} · ${hora(itens[0]?.enviado || Date.now())}${c.garcom ? ` · ${t(c.garcom)}` : ''}</p>
    ${c.tipo === 'delivery' ? '<p class="c"><b>ENTREGA</b></p>' : c.modo === 'retirada' ? '<p class="c"><b>RETIRADA</b></p>' : ''}
    <hr><table>${itens.map((i) => `<tr><td>${i.kg ? '' : `${i.qtd}×`}</td><td>${t(i.nome)}${adicTxt(i) ? `<br><small>${t(adicTxt(i).replace(/ \(\+[^)]*\)/g, ''))}</small>` : ''}${i.obs ? `<br><span class="obs">» ${t(i.obs)}</span>` : ''}</td></tr>`).join('')}</table>
    <hr>${cli.nome && c.tipo !== 'mesa' ? `<p class="c">${t(cli.nome)}</p>` : ''}</div>`;
}
// recibo / conta: itens, serviço, entrega, desconto, total, o que foi pago e o troco
export function htmlRecibo(c, f = formatoPadrao(), { titulo = '' } = {}) {
  const v = conta(c), cli = c.cliente || {}, pg = c.pagamentos || [];
  const troco = pg.reduce((s, p) => s + (Number(p.troco) || 0), 0);
  return `<div class="tk ${f === 'a4' ? 'a4' : ''}">${cabLoja()}<hr>
    <p class="c"><b>${t(titulo || (v.falta > 0.009 ? 'CONTA (não é documento fiscal)' : 'RECIBO (não é documento fiscal)'))}</b></p>
    <p class="c">${t(ondeComanda(c))}${c.pessoas && c.tipo === 'mesa' ? ` · ${c.pessoas} pessoas` : ''} · ${data()}</p>
    ${cli.nome ? `<p class="c">${t(cli.nome)}${cli.tel ? ` · ${t(fone(cli.tel))}` : ''}</p>` : ''}${c.tipo === 'delivery' && cli.end ? `<p class="c">${t(cli.end)}${cli.bairro ? ` · ${t(cli.bairro)}` : ''}</p>` : ''}
    <hr><table>${itensValidos(c).map((i) => `<tr><td>${i.kg ? '' : `${i.qtd}× `}${t(i.nome)}${adicTxt(i) ? `<br><small>${t(adicTxt(i))}</small>` : ''}</td><td class="n">${din(valorItem(i))}</td></tr>`).join('')}</table><hr>
    <table><tr><td>Subtotal</td><td class="n">${din(v.sub)}</td></tr>
      ${v.servico ? `<tr><td>Serviço (${v.pctServ}%)</td><td class="n">${din(v.servico)}</td></tr>` : ''}${v.couvert ? `<tr><td>Couvert</td><td class="n">${din(v.couvert)}</td></tr>` : ''}
      ${v.entrega ? `<tr><td>Entrega</td><td class="n">${din(v.entrega)}</td></tr>` : ''}${v.desconto ? `<tr><td>Desconto</td><td class="n">− ${din(v.desconto)}</td></tr>` : ''}
      <tr class="grande"><td>TOTAL</td><td class="n">${din(v.total)}</td></tr>
      ${pg.map((p) => `<tr><td>${t(p.forma)}</td><td class="n">${din(p.valor)}</td></tr>`).join('')}
      ${troco ? `<tr><td>Troco</td><td class="n">${din(troco)}</td></tr>` : ''}${c.trocoPara && v.falta > 0.009 ? `<tr><td>Levar troco para</td><td class="n">${din(c.trocoPara)}</td></tr>` : ''}
      ${v.falta > 0.009 && pg.length ? `<tr class="grande"><td>FALTA</td><td class="n">${din(v.falta)}</td></tr>` : ''}</table>
    ${v.falta > 0.009 && c.tipo === 'mesa' && pg.length === 0 && c.pessoas > 1 ? `<p class="c">Por pessoa (${c.pessoas}): ${din(v.total / c.pessoas)}</p>` : ''}
    ${c.pagarNaEntrega && v.falta > 0.009 ? `<p class="c"><b>Pagar na entrega: ${t(c.pagarNaEntrega)}</b></p>` : ''}
    <hr><p class="c">Obrigado pela preferência!</p></div>`;
}
// imprime agora: a página vira só o ticket (o resto some no @media print)
export function imprimir(html, f = formatoPadrao()) {
  const area = document.getElementById('impressao'); if (!area) return;
  let pg = document.getElementById('pagina-impressao'); if (!pg) { pg = document.createElement('style'); pg.id = 'pagina-impressao'; document.head.append(pg); }
  pg.textContent = f === 'a4' ? '@page{size:A4;margin:12mm}' : '@page{size:80mm auto;margin:3mm 2mm}';
  area.innerHTML = html;
  setTimeout(() => { try { window.print(); } catch { toast('Este navegador não deixou imprimir'); } }, 30);
}
// folha com a prévia, a escolha do papel (80 mm ou A4) e o botão Imprimir
export function abrirImpressao(titulo, gerar) {
  let f = formatoPadrao();
  const prev = () => `<div class="previa"><div class="papel ${f === 'a4' ? 'a4' : ''}">${gerar(f)}</div></div>`;
  folha({ titulo, larga: true, corpo: `<div class="chips" role="group" aria-label="Papel">
      <button type="button" class="chip" data-f="80" aria-pressed="${f === '80'}">Térmica 80 mm</button><button type="button" class="chip" data-f="a4" aria-pressed="${f === 'a4'}">Folha A4</button></div>
    <div data-prev>${prev()}</div>
    <p class="mudo" style="margin-top:12px">Na janela do navegador, escolha a impressora e toque em Imprimir. Na térmica, deixe as margens em "Nenhuma".</p>`,
  pe: `<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio grande" data-imp>${ico('impressora')}Imprimir</button>`,
  aoAbrir: (el, fechar) => {
    $$('[data-f]', el).forEach((b) => { b.onclick = () => { f = b.dataset.f; setFormato(f); $$('[data-f]', el).forEach((x) => x.setAttribute('aria-pressed', x === b)); $('[data-prev]', el).innerHTML = prev(); }; });
    $('[data-imp]', el).onclick = () => { imprimir(gerar(f), f); fechar(); };
  } });
}
export const imprimirConta = (c) => abrirImpressao(`Imprimir · ${ondeComanda(c)}`, (f) => htmlRecibo(c, f));
export const imprimirCozinha = (c, itens) => abrirImpressao(`Pedido da cozinha · ${quemPediu(c)}`, (f) => htmlCozinha(c, itens, f));
