// Popina · liga tudo: telas, navegação, faixa da demonstração e o papel deste aparelho.
import './salao.js?v=2';
import './cozinha.js?v=2';
import './caixa.js?v=2';
import './pedidos.js?v=2';
import './mais.js?v=2';
import './gestao.js?v=2';
import { db, recomecar, ouvir, linkCardapio, CONTA } from './loja.js?v=2';
import { iniciarRotas, PAPEIS, papel, setPapel, ir } from './nucleo.js?v=2';
import { ico, folha, $, $$, toast, bip } from './ui.js?v=2';

const q = new URLSearchParams(location.search);
if (q.get('papel') && PAPEIS[q.get('papel')]) setPapel(q.get('papel'), true);
const real = !!CONTA;
// pedido, chamado ou conta que chegou pelo cardápio online: som e aviso em todos os aparelhos ligados
addEventListener('popina-chegou', (e) => { bip(); toast(e.detail === 1 ? 'Chegou um pedido pelo cardápio online' : `Chegaram ${e.detail} pedidos pelo cardápio online`); });

// navegação: barra de baixo no celular, trilho à esquerda no tablet/computador
const ABAS = [['salao', 'Salão', 'salao'], ['pedidos', 'Pedidos', 'pedidos'], ['cozinha', 'Cozinha', 'cozinha'], ['caixa', 'Caixa', 'caixa'], ['mais', 'Gestão', 'mais']];
// o menu mora dentro do topo: no computador fica no meio da barra; no celular vira a barra de baixo
document.querySelector('.topo').insertBefore($('#nav'), document.querySelector('.ao-vivo'));
$('#nav').innerHTML = ABAS.map(([h, n, i]) => `<a href="#${h}" data-aba="${h}">${ico(i)}<span>${n}</span><em class="contador" data-cont="${h}"></em></a>`).join('');
function contadores() {
  const fila = db.comandas.reduce((s, c) => s + c.itens.filter((i) => i.status === 'pronto').length, 0) + db.chamados.filter((x) => !x.atendido).length + db.pedidosQR.length + db.comandas.filter((c) => c.pediuConta).length;
  const coz = db.comandas.reduce((s, c) => s + c.itens.filter((i) => i.status === 'novo' && !i.cancelado).length, 0);
  const ped = db.comandas.filter((c) => c.tipo !== 'mesa').length;
  [['salao', fila], ['cozinha', coz], ['pedidos', ped]].forEach(([k, n]) => { const e = $(`[data-cont="${k}"]`); if (e) e.textContent = n ? n : ''; });
  $('#topo-nome').textContent = db.config.nome;
}
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
