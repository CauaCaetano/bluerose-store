// Popina · liga tudo: telas, navegação, faixa da demonstração e o papel deste aparelho.
import './salao.js?v=11';
import './cozinha.js?v=11';
import './caixa.js?v=11';
import './pedidos.js?v=11';
import './mais.js?v=11';
import './gestao.js?v=11';
import { db, recomecar, ouvir, linkCardapio, CONTA, lojaCfg } from './loja.js?v=11';
import { iniciarRotas, PAPEIS, papel, setPapel, ir } from './nucleo.js?v=11';
import { ico, folha, $, $$, toast, bip } from './ui.js?v=11';

const q = new URLSearchParams(location.search);
if (q.get('papel') && PAPEIS[q.get('papel')]) setPapel(q.get('papel'), true);
const real = !!CONTA;
// pedido, chamado ou conta que chegou pelo cardápio online: som e aviso em todos os aparelhos ligados
addEventListener('popina-chegou', (e) => { bip(); toast(e.detail === 1 ? 'Chegou um pedido pelo cardápio online' : `Chegaram ${e.detail} pedidos pelo cardápio online`); });

// navegação: barra de baixo no celular, trilho à esquerda no tablet/computador
const ABAS = [['salao', 'Salão', 'salao'], ['pedidos', 'Pedidos', 'pedidos'], ['cozinha', 'Cozinha', 'cozinha'], ['caixa', 'Caixa', 'caixa'], ['mais', 'Gestão', 'mais']];
// o menu mora dentro do topo: no computador fica no meio da barra; no celular vira a barra de baixo
document.querySelector('.topo').insertBefore($('#nav'), document.querySelector('.ao-vivo'));
const ICO_ABA = { salao: 'mesa', pedidos: 'pedidos', cozinha: 'cozinha', caixa: 'cartao', mais: 'louro' };
$('#nav').innerHTML = ABAS.map(([h, n]) => `<a href="#${h}" data-aba="${h}">${ico(ICO_ABA[h])}<span>${n}</span><em class="contador" data-cont="${h}"></em></a>`).join('');
// à direita do topo (como no conceito do salão): sino com as pendências, e o perfil com as iniciais do restaurante
const dirTopo = document.createElement('div'); dirTopo.className = 'topo-dir';
dirTopo.innerHTML = `<a class="topo-sino" href="#salao" aria-label="Pendências do salão">${ico('sino')}<em data-sino></em></a><span class="topo-div" aria-hidden="true"></span>
  <button type="button" class="topo-perfil" aria-label="Conta e opções"><span data-iniciais></span>${ico('chevron')}</button>`;
document.querySelector('.topo').append(dirTopo);
$('.topo-perfil').onclick = () => folha({ titulo: db.config.nome || 'Conta', corpo: `<div class="lista-bts">
  <button type="button" class="bt" data-m="nova">${ico('mais2')}Nova comanda</button>
  <button type="button" class="bt" data-m="planta">${ico('planta')}Planta do salão</button>
  ${real ? '' : `<a class="bt" href="app.html?papel=cozinha#cozinha" target="_blank" rel="noopener">${ico('cozinha')}Abrir a cozinha em outra aba</a>
  <a class="bt" href="${linkCardapio('mesa=4')}" target="_blank" rel="noopener">${ico('qr')}Cardápio do cliente</a>`}
  <a class="bt" href="#mais/conta" data-fechar>${ico('pessoas')}Minha conta e equipe</a>
  ${real ? '' : `<button type="button" class="bt" data-m="recomecar">${ico('troca')}Recomeçar a demonstração</button>`}</div>`,
aoAbrir: (f, fechar) => $$('[data-m]', f).forEach((b) => { b.onclick = () => { fechar(); const m = b.dataset.m;
  if (m === 'recomecar') { recomecar(); ir('salao'); toast('Demonstração recomeçada'); }
  else { const x = document.createElement('button'); x.dataset.acao = m === 'nova' ? 'nova-comanda' : 'planta'; x.hidden = true; document.body.append(x); x.click(); x.remove(); } }; }) });
function contadores() {
  const fila = db.comandas.reduce((s, c) => s + c.itens.filter((i) => i.status === 'pronto').length, 0) + db.chamados.filter((x) => !x.atendido).length + db.pedidosQR.length + db.comandas.filter((c) => c.pediuConta).length;
  const coz = db.comandas.reduce((s, c) => s + c.itens.filter((i) => i.status === 'novo' && !i.cancelado).length, 0);
  const ped = db.comandas.filter((c) => c.tipo !== 'mesa').length;
  [['salao', fila], ['cozinha', coz], ['pedidos', ped]].forEach(([k, n]) => { const e = $(`[data-cont="${k}"]`); if (e) e.textContent = n ? n : ''; });
  marcaTopo();
  $('[data-sino]').textContent = fila || '';
  $('[data-iniciais]').textContent = (db.config.nome || 'P').split(/\s+/).filter((w) => w.length > 2 || /^[A-ZÀ-Ú]/.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'P';
}
// plano "Popina com a sua marca": o topo mostra o logo e o nome do restaurante no lugar do Popina
function marcaTopo() {
  const m = window.popinaPlano === 'marca', L = lojaCfg(), img = document.querySelector('.topo > img'), b = document.querySelector('.topo > div > b');
  window.popinaNome = db.config.nome;
  if (img) { const src = m && L.logo ? L.logo : 'simbolo.png?v=1'; if (img.getAttribute('src') !== src) img.src = src; }
  if (b) b.textContent = m ? db.config.nome : 'POPINA';
  $('#topo-nome').textContent = m ? (db.config.cidade || '') : db.config.nome;
  document.body.classList.toggle('marca-propria', m);
  // template escolhido em Gestão › Aparência (Taverna é o visual de base; Luxo e Realeza vêm por cima)
  const tp = ['luxo', 'realeza'].includes(L.template) ? L.template : 'taverna';
  ['taverna', 'luxo', 'realeza'].forEach((x) => document.body.classList.toggle(`tpl-${x}`, x === tp));
}
addEventListener('popina-plano', () => { marcaTopo(); dispatchEvent(new HashChangeEvent('hashchange')); });
ouvir(contadores);
// conexão: sem internet, cada aparelho guarda o que foi feito e envia quando ela voltar
function conexao() {
  const on = navigator.onLine, el = $('.ao-vivo'); if (!el) return;
  el.classList.toggle('off', !on);
  el.innerHTML = on ? '<i></i>Ao vivo' : '<i></i>Sem internet';
  el.title = on ? 'Os aparelhos do restaurante se atualizam sozinhos' : 'O que você fizer fica guardado neste aparelho e vai para os outros assim que a internet voltar';
  if (!on) toast('Sem internet: o que você fizer fica guardado aqui e sobe quando a conexão voltar');
}
addEventListener('online', conexao); addEventListener('offline', conexao); conexao();

// faixa da demonstração (some na conta real)
if (!real) {
  const f = document.createElement('div'); f.className = 'demo-faixa';
  f.innerHTML = `<span><b>Demonstração</b> · restaurante de exemplo</span>
    <a href="app.html?papel=cozinha#cozinha" target="_blank" rel="noopener">${ico('cozinha')}Abrir a cozinha em outra aba</a>
    <a href="${linkCardapio('mesa=4')}" target="_blank" rel="noopener">${ico('qr')}Cardápio do cliente</a>
    <button type="button" data-recomecar>Recomeçar</button>`;
  document.body.prepend(f);
  $('[data-recomecar]', f).onclick = () => { recomecar(); ir('salao'); toast('Demonstração recomeçada'); };
}
document.body.addEventListener('pointerdown', () => { document.body.dataset.tocou = '1'; }, { once: true });

// primeira vez neste aparelho: perguntar o papel
if (!papel() && !q.get('papel')) {
  setTimeout(() => folha({ titulo: 'Quem vai usar este aparelho?', corpo: `<p class="mudo">Cada celular, tablet ou computador do restaurante abre direto na tela que precisa. Dá para trocar depois em Mais › Este aparelho.</p>
    <div class="papeis">${Object.entries(PAPEIS).map(([k, [nome]]) => `<button type="button" class="papel" data-p="${k}"><b>${nome}</b><small>${{ garcom: 'Celular do garçom: fila do que fazer e as mesas', cozinha: 'Tela da cozinha e do bar', caixa: 'Computador do caixa: fechar contas', dono: 'Vê tudo, relatórios e ajustes' }[k]}</small></button>`).join('')}</div>`,
  aoAbrir: (fo, fechar) => $$('[data-p]', fo).forEach((b) => { b.onclick = () => { setPapel(b.dataset.p); fechar(); ir(PAPEIS[b.dataset.p][1]); }; }) }), 300);
}
iniciarRotas(); contadores();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
