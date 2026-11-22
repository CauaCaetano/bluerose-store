// Popina · tela da cozinha: os pedidos na ordem em que chegaram, com o tempo de cada um bem grande.
// Começar → Pronto. Imprime o pedido (80 mm ou A4) num toque, e pode imprimir sozinho quando o pedido chega.
import { db, t, comanda, mudarStatus, quemPediu, tipoNome, minutos, hora, grava } from './loja.js?v=53';
import { registrar, acao, ir } from './nucleo.js?v=53';
import { ico, toast, folha, novidades, $, $$ } from './ui.js?v=53';
import * as som from './som.js?v=53';
import { htmlCozinha, imprimir, imprimirCozinha, autoImprimir, setAutoImprimir, formatoPadrao } from './imprimir.js?v=53';

const ler = (k, pad) => { try { return localStorage.getItem(k) ?? pad; } catch { return pad; } };
let setor = ler('popina-setor', ''), aba = 'fazer';
// cada envio de uma comanda vira um ticket (o que foi mandado junto)
export function tickets() {
  const l = [];
  db.comandas.forEach((c) => {
    const m = new Map();
    c.itens.filter((i) => !i.cancelado && ['novo', 'preparo', 'pronto'].includes(i.status) && i.enviado && (!setor || (i.setor || 'cozinha') === setor))
      .forEach((i) => { const k = i.enviado; if (!m.has(k)) m.set(k, []); m.get(k).push(i); });
    m.forEach((itens, enviado) => l.push({ c, enviado, itens, chave: `${c.id}:${enviado}`, feito: itens.every((i) => i.status === 'pronto'), comecou: itens.some((i) => i.status !== 'novo') }));
  });
  return l.sort((a, b) => a.enviado - b.enviado);
}
const adicTxt = (i) => (i.adic || []).map((a) => a.nome.replace(/^[^:]+: /, '')).join(', ');
function ticket(x) {
  const m = Math.floor(minutos(x.enviado)), cl = x.feito ? '' : m >= 20 ? 'atrasado' : m >= 10 ? 'medio' : '';
  return `<article data-k="${t(x.chave)}" class="ko ${cl}" aria-label="${t(quemPediu(x.c))}"><header class="ko-cab"><div><b>${t(quemPediu(x.c))}</b><small>${tipoNome(x.c)}${x.c.senha ? ` · senha ${x.c.senha}` : ''} · chegou ${hora(x.enviado)}${x.c.garcom ? ` · ${t(x.c.garcom)}` : ''}</small></div>
    <span class="tempo">${ico('relogio')}${m} min</span></header>
    <ul>${x.itens.map((i) => `<li class="${i.status === 'pronto' ? 'feito' : ''}"><span class="q">${i.kg ? '' : `${i.qtd}×`}</span><div>${t(i.nome)}${adicTxt(i) ? `<small>${t(adicTxt(i))}</small>` : ''}${i.obs ? `<small class="obs">» ${t(i.obs)}</small>` : ''}</div></li>`).join('')}</ul>
    <footer class="ko-pe"><button type="button" class="bt-ico" data-acao="koz-imp" data-k="${t(x.chave)}" aria-label="Imprimir o pedido">${ico('impressora')}</button>
      ${x.feito ? `<button type="button" class="bt" data-acao="koz-volta" data-k="${t(x.chave)}">Voltar para preparo</button>`
        : x.comecou ? `<button type="button" class="bt ok grande" data-acao="koz-pronto" data-k="${t(x.chave)}">${ico('check')}Pronto</button>`
          : `<button type="button" class="bt cheio grande" data-acao="koz-comecar" data-k="${t(x.chave)}">Começar</button>`}</footer></article>`;
}
registrar('cozinha', {
  titulo: 'Cozinha',
  html() {
    const l = tickets(), fazer = l.filter((x) => !x.feito), prontos = l.filter((x) => x.feito);
    const mostra = aba === 'fazer' ? fazer : prontos;
    return `<div class="coz-topo"><div class="cab" style="margin:0"><div><h1>Cozinha</h1><p>${fazer.length} ${fazer.length === 1 ? 'pedido' : 'pedidos'} para fazer</p></div></div>
      <div class="linha-bts"><button type="button" class="bt" data-acao="koz-auto">${ico('impressora')}${autoImprimir() ? 'Imprimir sozinho: ligado' : 'Imprimir sozinho'}</button>
      <button type="button" class="bt" data-acao="koz-tela">${ico('telacheia')}Tela cheia</button></div></div>
    <div class="chips" role="group" aria-label="O que mostrar">
      <button type="button" class="chip" data-aba-k="fazer" aria-pressed="${aba === 'fazer'}">Para fazer <b>${fazer.length}</b></button>
      <button type="button" class="chip" data-aba-k="prontos" aria-pressed="${aba === 'prontos'}">Prontos <b>${prontos.length}</b></button>
      <span style="width:8px"></span>
      ${[['', 'Tudo'], ['cozinha', 'Só cozinha'], ['bar', 'Só bar']].map(([k, n]) => `<button type="button" class="chip" data-setor="${k}" aria-pressed="${setor === k}">${n}</button>`).join('')}</div>
    <div class="kds">${mostra.map(ticket).join('') || `<p class="vazio">${aba === 'fazer' ? 'Nenhum pedido para fazer. Quando o garçom mandar, aparece aqui com um aviso sonoro.' : 'Nenhum pedido pronto esperando.'}</p>`}</div>`;
  },
  montar(el) {
    $$('[data-aba-k]', el).forEach((b) => { b.onclick = () => { aba = b.dataset.abaK; ir('cozinha'); }; });
    $$('[data-setor]', el).forEach((b) => { b.onclick = () => { setor = b.dataset.setor; try { localStorage.setItem('popina-setor', setor); } catch { /* nada */ } ir('cozinha'); }; });
    novidades(el, '.kds .ko', { estado: (e) => e.className, ctx: aba + setor });
  },
});
const doTicket = (k) => tickets().find((x) => x.chave === k);
acao('koz-comecar', (b) => { const x = doTicket(b.dataset.k); if (!x) return; x.itens.forEach((i) => { if (i.status === 'novo') { i.status = 'preparo'; i.inicio = Date.now(); } }); grava(); });
acao('koz-pronto', (b) => { const x = doTicket(b.dataset.k); if (!x) return; x.itens.forEach((i) => { i.status = 'pronto'; i.pronto = Date.now(); }); grava(); toast(`${quemPediu(x.c)}: pronto`); });
acao('koz-volta', (b) => { const x = doTicket(b.dataset.k); if (!x) return; x.itens.forEach((i) => mudarStatus(x.c, i, 'preparo')); });
acao('koz-imp', (b) => { const x = doTicket(b.dataset.k); if (x) imprimirCozinha(x.c, x.itens); });
acao('koz-tela', () => { const d = document.documentElement; if (document.fullscreenElement) document.exitFullscreen?.(); else d.requestFullscreen?.().catch(() => toast('Este navegador não deixou abrir em tela cheia')); });
acao('koz-auto', () => {
  const on = autoImprimir();
  folha({ titulo: 'Imprimir sozinho quando o pedido chega', corpo: `<label class="liga">Ligado neste aparelho<input type="checkbox" data-auto ${on ? 'checked' : ''}></label>
    <div class="aviso azul" style="margin-top:14px"><b>Como funciona:</b> quando um pedido novo chega nesta tela, o Popina manda imprimir na hora (${formatoPadrao() === 'a4' ? 'folha A4' : 'térmica de 80 mm'}).
    Por segurança, o navegador mostra a janela de impressão e alguém precisa tocar em <b>Imprimir</b>.</div>
    <p style="margin-top:12px"><b>Para sair direto, sem a janela</b> (computador da cozinha com Windows): crie um atalho do Chrome com <code>--kiosk-printing</code> no fim do destino e abra o Popina por ele. A impressora padrão do Windows deve ser a térmica.</p>
    <p class="mudo" style="margin-top:10px">No celular e no tablet o navegador sempre pede a confirmação. A tela e o aviso sonoro continuam funcionando normalmente.</p>`,
  aoAbrir: (f) => { $('[data-auto]', f).onchange = (e) => { setAutoImprimir(e.target.checked); if (e.target.checked) marcarTodos(); toast(e.target.checked ? 'Vai imprimir os próximos pedidos' : 'Impressão automática desligada'); ir('cozinha'); }; } });
});

// aviso de pedido novo (som) e impressão automática: guarda os tickets já vistos neste aparelho
const vistos = new Set(JSON.parse(ler('popina-impressos', '[]') || '[]'));
let primeira = true;
function marcarTodos() { tickets().forEach((x) => vistos.add(x.chave)); salvarVistos(); }
function salvarVistos() { try { localStorage.setItem('popina-impressos', JSON.stringify([...vistos].slice(-300))); } catch { /* nada */ } }
export function conferirNovos() {
  const novos = tickets().filter((x) => !x.feito && !x.comecou && !vistos.has(x.chave));
  if (primeira) { primeira = false; novos.forEach((x) => vistos.add(x.chave)); salvarVistos(); return; }
  if (!novos.length) return;
  novos.forEach((x) => vistos.add(x.chave)); salvarVistos();
  if (location.hash.startsWith('#cozinha')) som.novo();
  if (autoImprimir() && location.hash.startsWith('#cozinha')) imprimir(novos.map((x) => htmlCozinha(x.c, x.itens)).join('<div style="break-after:page"></div>'));
}
export { comanda };
