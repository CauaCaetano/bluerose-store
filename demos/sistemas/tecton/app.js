// Tecton · liga tudo: o menu do ramo (lateral no computador, barra de baixo no celular), a busca, as cores, a marca,
// a faixa da demonstração (com "Ver como" para trocar de empresa de exemplo) e o primeiro uso.
import './dados.js?v=4';
import { db, CONTA, RAMOS, carregar, raiz, ramoAtual, abrirEmpresaDemo, recomecar, iniciarRotas, desenhar, ir, rota, ouvir, ico, t, $, $$, toast, confirma, definirInicial, dataBR } from './nucleo.js?v=4';
import { MENUS, BAIXO, FIM, menuAtual, buscar, aplicarEsquema, comoUsar, COMO } from './comum.js?v=4';
import './construtora.js?v=4';
import './loja.js?v=4';
import './imobiliaria.js?v=4';
import './importar.js?v=4';
import { menuDe, baixoDe, foraDe } from './ajuste.js?v=4';

carregar();
definirInicial(() => 'painel');

// ------------------------------------------------------------------ esqueleto
document.body.insertAdjacentHTML('afterbegin', `<aside class="lado" aria-label="Menu"><div class="lado-marca"><img data-logo src="simbolo-128.png?v=1" alt="" width="44" height="44"><div><b data-marca-nome>TECTON</b><small data-marca-sub></small></div></div><div class="lado-ramo" data-lado-ramo></div><nav data-nav aria-label="Telas"></nav><div class="lado-pe" data-lado-pe></div></aside>`);
const corpo = $('.corpo');
corpo.insertAdjacentHTML('afterbegin', `<header class="topo"><div class="topo-marca"><img data-logo src="simbolo-128.png?v=1" alt="" width="34" height="34"><b data-marca-nome>TECTON</b></div>
  <div class="busca" role="search"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" data-busca placeholder="Buscar obra, cliente, produto, imóvel…" aria-label="Buscar" autocomplete="off"><div class="busca-res" data-busca-res hidden></div></div>
  <div class="topo-bts"><button type="button" class="topo-bt" data-como-agora aria-label="Como usar esta tela" title="Como usar esta tela">${ico('ajuda')}<span>Como usar</span></button><button type="button" class="topo-bt" data-ir="config" aria-label="Configurações" title="Configurações">${ico('ajustes')}<span>Configurações</span></button></div></header>`);
document.body.insertAdjacentHTML('beforeend', '<nav class="baixo" data-baixo aria-label="Telas principais"></nav>');

function montarMenus() {
  const r = ramoAtual(), lado = $('[data-nav]'), baixo = $('[data-baixo]'), on = !!(db && r);
  document.body.classList.toggle('sem-ramo', !on);
  if (!on) { lado.innerHTML = ''; baixo.innerHTML = ''; $('[data-lado-ramo]').innerHTML = ''; return; }
  // o menu do ajuste (só as telas escolhidas, na ordem do que importa); o resto fica em "Mais funções"
  const m = menuDe(r), fora = foraDe(r), cfg = FIM[FIM.length - 1];
  lado.innerHTML = m.map(([h, n, i]) => `<a href="#${h}" data-aba="${h}">${ico(i)}<span>${t(n)}</span><em data-cont="${h}"></em></a>`).join('') + '<div class="lado-sep"></div>' + (fora.length ? `<a href="#funcoes" data-aba="funcoes">${ico('mais2')}<span>Mais funções</span><em class="em-mudo" title="${fora.length} telas fora do menu">${fora.length}</em></a>` : '') + `<a href="#${cfg[0]}" data-aba="${cfg[0]}">${ico(cfg[2])}<span>${t(cfg[1])}</span></a>`;
  baixo.innerHTML = [...baixoDe(r).map((h) => MENUS[r].find((x) => x[0] === h)).filter(Boolean), ['mais', 'Mais', 'mais']].map(([h, n, i]) => `<a href="#${h}" data-aba="${h}">${ico(i)}<span>${t(n.split(' ')[0])}</span><em data-cont="${h}"></em></a>`).join('');
  const rs = db.config.ramos;
  $('[data-lado-ramo]').innerHTML = rs.length > 1 ? rs.map((k) => `<button type="button" data-troca-ramo="${k}" aria-pressed="${k === r}">${t(RAMOS[k].curto)}</button>`).join('') : '';
  $('[data-lado-pe]').textContent = '';
  $('[data-busca]').placeholder = { construtora: 'Buscar obra, cliente, fornecedor…', loja: 'Buscar produto, cliente…', imobiliaria: 'Buscar imóvel, cliente…' }[r];
  marca(); aplicarEsquema(); contadores(); marcarAba();
}
function marca() {
  if (!db) return; const M = db.config.marca || {}, propria = M.topo && db.config.nome;
  $$('[data-marca-nome]').forEach((b) => { b.textContent = propria ? db.config.nome : 'TECTON'; });
  $('[data-marca-sub]').textContent = propria ? 'Tecton' : db.config.nome || '';
  $$('[data-logo]').forEach((i) => { const s = propria && M.logo ? M.logo : 'simbolo-128.png?v=1'; if (i.getAttribute('src') !== s) i.src = s; });
}
function contadores() {
  if (!db || !ramoAtual()) return; const h = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const n = { entregas: db.entregas.filter((e) => (e.dia === h || e.modo === 'retira') && ['agendada', 'saiu'].includes(e.status)).length, visitas: db.visitas.filter((v) => v.dia === h && v.status === 'marcada').length,
    compras: db.pedidos.filter((p) => p.status !== 'chegou' && p.prev <= h).length, funil: db.leads.filter((l) => l.etapa === 'novo').length };
  // o número do menu diz o que conta (a banca estranhava o "4" sem explicação)
  const oque = { entregas: 'entregas e retiradas ainda por fazer hoje', visitas: 'visitas marcadas para hoje', compras: 'pedidos de material para chegar até hoje', funil: 'interessados novos, ainda sem contato' };
  $$('[data-cont]').forEach((e) => { const v = n[e.dataset.cont]; e.textContent = v ? v : ''; e.title = v ? `${v} ${oque[e.dataset.cont]}` : ''; });
}
function marcarAba(aba) {
  aba = aba || (TELA_ABA() || 'painel');
  $$('[data-aba]').forEach((a) => { const ok = a.dataset.aba === aba || (a.dataset.aba === 'mais' && !$(`.baixo [data-aba="${aba}"]`) && aba !== 'painel'); a.classList.toggle('on', ok); if (ok) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
}
let abaAtual = '';
const TELA_ABA = () => abaAtual;
document.addEventListener('tecton-tela', (e) => { abaAtual = e.detail.aba || e.detail.nome; marcarAba(); fecharBusca(); });
document.addEventListener('click', (e) => { const b = e.target.closest('[data-troca-ramo]'); if (!b) return; db.config.ramo = b.dataset.trocaRamo; import('./nucleo.js?v=4').then((m) => m.grava()); montarMenus(); ir('painel'); });
addEventListener('tecton-ramo', () => { montarMenus(); faixa(); });
addEventListener('tecton-marca', marca);
ouvir(() => { contadores(); marca(); });

// ------------------------------------------------------------------ busca
const ib = $('[data-busca]'), res = $('[data-busca-res]');
function fecharBusca() { res.hidden = true; }
ib.addEventListener('input', () => {
  if (!db || !ramoAtual()) return; const l = buscar(ib.value);
  if (ib.value.trim().length < 2) { fecharBusca(); return; }
  res.innerHTML = l.length ? l.map(([a, b, h]) => `<button type="button" data-ir="${t(h)}"><span><b>${t(a)}</b><small>${t(b)}</small></span></button>`).join('') : '<p class="vazio">Nada encontrado.</p>'; res.hidden = false;
});
ib.addEventListener('keydown', (e) => { if (e.key === 'Escape') { ib.value = ''; fecharBusca(); } if (e.key === 'Enter') { const b = res.querySelector('button'); if (b) b.click(); } if (e.key === 'ArrowDown') { e.preventDefault(); res.querySelector('button')?.focus(); } });
res.addEventListener('click', () => { ib.value = ''; setTimeout(fecharBusca, 0); });
document.addEventListener('click', (e) => { if (!e.target.closest('.busca')) fecharBusca(); });
$('[data-como-agora]').addEventListener('click', () => { const { nome, args } = rota(); comoUsar(COMO[nome] ? nome : nome === 'obra' ? 'obras' : nome === 'emp' ? 'imoveis' : nome === 'contrato' ? 'contratos' : nome === 'pessoa' ? 'clientes' : 'painel'); });

// ------------------------------------------------------------------ faixa da demonstração (some na conta)
function faixa() {
  if (CONTA) return;
  document.body.classList.add('demo');
  let f = $('.demo-faixa'); if (!f) { f = document.createElement('div'); f.className = 'demo-faixa'; $('.corpo').prepend(f); }
  const a = raiz()?.ativa;
  f.innerHTML = `<span class="demo-rot"><b>Demonstração</b> com dados de exemplo · esta faixa não aparece no sistema assinado</span><a target="_top" href="../../../tecton.html">← Voltar ao site</a><button type="button" data-recomecar>Recomeçar</button>
    <label class="ver-como"><span>Ver outro ramo:</span><select data-ver-como aria-label="Ver a demonstração de outro ramo">${Object.entries(RAMOS).map(([k, r]) => `<option value="${k}" ${k === a ? 'selected' : ''}>${t(r.curto)}${matchMedia('(max-width:700px)').matches ? '' : ` · ${t({ construtora: 'Alicerce Construções', loja: 'Depósito São Bento', imobiliaria: 'Vale Imóveis' }[k])}`}</option>`).join('')}${a ? '' : '<option value="" selected>escolha</option>'}</select></label>`;
  f.querySelector('[data-recomecar]').onclick = async () => { if (!(await confirma('Recomeçar a demonstração? Tudo o que você fez volta ao exemplo do início.', 'Recomeçar', true))) return; recomecar(); montarMenus(); faixa(); ir('painel'); toast('Demonstração recomeçada'); };
  $('[data-ver-como]', f).onchange = (e) => { const k = e.target.value; if (!k) return; abrirEmpresaDemo(k); montarMenus(); faixa(); location.hash = 'painel'; desenhar(true); toast(`Agora: ${RAMOS[k].nome.toLowerCase()}`); };
}
faixa();
montarMenus();
iniciarRotas();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.tectonPronto = true;
// sem internet no canteiro: o sistema continua e guarda tudo neste aparelho
const avisoRede = () => { let a = document.getElementById('sem-rede'); if (navigator.onLine) { a?.remove(); return; } if (!a) { a = document.createElement('div'); a.id = 'sem-rede'; a.setAttribute('role', 'status'); a.textContent = 'Sem internet: pode continuar. O que você lançar fica salvo neste aparelho.'; document.body.append(a); } };
addEventListener('online', avisoRede); addEventListener('offline', avisoRede); avisoRede();
