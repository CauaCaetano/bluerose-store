// Veltria Gestão · protótipo do layout "caderno da loja"
// Cinco divisórias (Hoje, Vender, Estoque, Dinheiro, Fiado) e uma caixa "O que você quer fazer?" que leva a qualquer lugar.
// Dados de exemplo guardados só neste navegador (?novo no endereço recomeça).

const textoItens = (l) => l.map((x) => `${x.qtd}× ${x.nome}`).join(', ');
const R = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const hora = (d = new Date()) => d.toTimeString().slice(0, 5);
const CORES = { Mercearia: '#1e4fd8', Bebidas: '#1f97e6', Limpeza: '#1a7a8c', Higiene: '#6b4fc4', Descartáveis: '#c06a1a' };
const CHAVE = 'veltria-gestao-proto-v2';

// ---------------------------------------------------------------- dados de exemplo
function semente() {
  const P = [
    ['Arroz tipo 1 5 kg', 'Mercearia', 18.9, 26.9, 46, 30, 41], ['Feijão carioca 1 kg', 'Mercearia', 6.2, 9.49, 12, 25, 38], ['Açúcar refinado 1 kg', 'Mercearia', 3.4, 5.29, 58, 20, 26],
    ['Óleo de soja 900 ml', 'Mercearia', 5.1, 7.99, 34, 20, 33], ['Café torrado 500 g', 'Mercearia', 13.8, 21.9, 9, 15, 29], ['Macarrão espaguete 500 g', 'Mercearia', 2.9, 4.79, 71, 20, 22],
    ['Leite integral 1 L', 'Mercearia', 3.9, 5.79, 96, 48, 64], ['Refrigerante cola 2 L', 'Bebidas', 5.8, 9.49, 40, 24, 47], ['Água mineral 500 ml', 'Bebidas', 0.9, 2.5, 140, 60, 72],
    ['Suco de uva 1 L', 'Bebidas', 6.9, 11.9, 18, 10, 9], ['Cerveja lata 350 ml', 'Bebidas', 2.6, 4.29, 4, 48, 58], ['Detergente neutro 500 ml', 'Limpeza', 1.6, 2.99, 63, 24, 31],
    ['Água sanitária 2 L', 'Limpeza', 3.2, 5.99, 27, 12, 14], ['Sabão em pó 1,6 kg', 'Limpeza', 13.5, 21.9, 7, 10, 11], ['Desinfetante 2 L', 'Limpeza', 5.4, 9.9, 22, 10, 0],
    ['Papel higiênico 12 rolos', 'Higiene', 12.9, 19.9, 15, 12, 18], ['Sabonete 90 g', 'Higiene', 1.3, 2.49, 88, 30, 24], ['Creme dental 90 g', 'Higiene', 2.8, 4.99, 41, 20, 17],
    ['Shampoo 350 ml', 'Higiene', 8.9, 15.9, 13, 8, 0], ['Copo descartável 200 ml', 'Descartáveis', 4.2, 7.49, 30, 10, 6], ['Saco de lixo 100 L', 'Descartáveis', 5.6, 9.9, 0, 10, 12],
  ].map(([nome, cat, custo, preco, tem, minimo, vendidos30], i) => ({ id: `p${i}`, nome, cat, custo, preco, tem, minimo, vendidos30, ean: `78945${String(10000 + i * 37).padStart(8, '0')}` }));
  const clientes = [
    { id: 'c0', nome: 'Dona Cida', tel: '16991110001', deve: 86.4, desde: 3 }, { id: 'c1', nome: 'Seu Jorge da oficina', tel: '16991110002', deve: 212.9, desde: 19 },
    { id: 'c2', nome: 'Padaria Trigo Bom', tel: '16991110003', deve: 540, desde: 34 }, { id: 'c3', nome: 'Marcelo (vizinho)', tel: '16991110004', deve: 37.5, desde: 8 },
  ];
  const pagar = [
    { id: 'b0', nome: 'Bebidas Sul Distribuidora', valor: 1380.6, vence: 1 }, { id: 'b1', nome: 'Conta de luz', valor: 412.35, vence: 4 }, { id: 'b2', nome: 'Cereais Paraná', valor: 2290, vence: 9 },
  ];
  // vendas de hoje até agora (horários espalhados desde as 7h)
  const agora = new Date(), mins = agora.getHours() * 60 + agora.getMinutes(), diario = [];
  let r = 7, s = 0;
  const rnd = () => ((r = (r * 16807) % 2147483647) - 1) / 2147483646;
  const passo = Math.round(Math.max(6, Math.min(34, (Math.min(mins, 21 * 60) - 432) / 16)));   // cedo: vendas mais juntas, para a demonstração não abrir vazia
  for (let m = 7 * 60 + 12; m < Math.min(mins, 21 * 60); m += passo + Math.floor(rnd() * passo)) {
    const n = 1 + Math.floor(rnd() * 4), itens = Array.from({ length: n }, () => { const p = P[Math.floor(rnd() * P.length)]; return { id: p.id, nome: p.nome, qtd: 1 + Math.floor(rnd() * 3), preco: p.preco }; });
    const total = itens.reduce((t, x) => t + x.qtd * x.preco, 0), forma = ['Pix', 'Pix', 'Dinheiro', 'Cartão', 'Cartão'][Math.floor(rnd() * 5)];
    diario.push({ tipo: 'venda', hora: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, texto: textoItens(itens), itens: itens.map(({ nome, qtd }) => ({ nome, qtd })), forma, valor: total, lucro: itens.reduce((t, x) => t + x.qtd * (x.preco - P.find((p) => p.id === x.id).custo), 0) });
    s++;
  }
  if (mins > 10 * 60) diario.push({ tipo: 'entrada', hora: '10:05', texto: 'Chegou mercadoria: 24 Refrigerante cola 2 L', valor: 139.2 });
  diario.sort((a, b) => a.hora.localeCompare(b.hora));
  return { produtos: P, clientes, pagar, diario, caixaInicial: 350, ontemAteAgora: 0.86, comanda: [], forma: 'Pix', fiadoDe: '' };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || semente(); } catch { return semente(); } })();
const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { /* sem espaço: segue na memória */ } };

// contas do dia
const vendasHoje = () => db.diario.filter((x) => x.tipo === 'venda');
const vendidoHoje = () => vendasHoje().reduce((t, x) => t + x.valor, 0);
const lucroHoje = () => vendasHoje().reduce((t, x) => t + (x.lucro || 0), 0);
const saiuHoje = () => db.diario.filter((x) => x.tipo === 'entrada' || x.tipo === 'pagamento').reduce((t, x) => t + x.valor, 0);
const recebidoNoCaixa = () => vendasHoje().filter((x) => x.forma !== 'Fiado').reduce((t, x) => t + x.valor, 0) + db.diario.filter((x) => x.tipo === 'recebido').reduce((t, x) => t + x.valor, 0);
const noCaixa = () => db.caixaInicial + recebidoNoCaixa() - saiuHoje();
const acabando = () => db.produtos.filter((p) => p.tem <= p.minimo).sort((a, b) => a.tem / a.minimo - b.tem / b.minimo);
const parados = () => db.produtos.filter((p) => p.vendidos30 === 0 && p.tem > 0);
const fiadoTotal = () => db.clientes.reduce((t, c) => t + c.deve, 0);
const prod = (id) => db.produtos.find((p) => p.id === id);
const ini = (nome) => nome.split(' ').slice(0, 2).map((x) => x[0]).join('').toUpperCase();
const zap = (tel, txt) => `https://wa.me/55${tel}?text=${encodeURIComponent(txt)}`;

// ---------------------------------------------------------------- telas
const pag = document.getElementById('pagina');
const TELAS = {
  hoje() {
    const v = vendasHoje(), ac = acabando(), venc = db.clientes.filter((c) => c.desde > 15), conta = db.pagar.filter((b) => b.vence <= 2);
    const lembretes = [
      ac.length && `<li class="al"><svg viewBox="0 0 24 24"><path d="M4 8l8-4 8 4v8l-8 4-8-4z"/></svg><div><b>${ac.length} produtos estão acabando</b><p>${esc(ac.slice(0, 3).map((p) => p.nome).join(', '))}${ac.length > 3 ? ' e outros' : ''}</p></div><a class="btn peq" href="#estoque/acabando">Ver o que repor</a></li>`,
      venc.length && `<li class="er"><svg viewBox="0 0 24 24"><path d="M6 4h10l2 2v14H6z"/><path d="M9 9h6M9 13h6"/></svg><div><b>${R(venc.reduce((t, c) => t + c.deve, 0))} de fiado atrasado</b><p>${esc(venc.map((c) => c.nome).join(' e '))}, há mais de 15 dias</p></div><a class="btn peq" href="#fiado">Cobrar</a></li>`,
      conta.length && `<li><svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/></svg><div><b>${esc(conta[0].nome)}: ${R(conta[0].valor)}</b><p>Vence ${conta[0].vence === 1 ? 'amanhã' : `em ${conta[0].vence} dias`}</p></div><a class="btn peq" href="#dinheiro">Ver contas</a></li>`,
    ].filter(Boolean).join('');
    const top = Object.values(v.flatMap((x) => x.itens || []).reduce((m, i) => { (m[i.nome] ||= { n: i.nome, q: 0 }).q += i.qtd; return m; }, {})).sort((a, b) => b.q - a.q).slice(0, 5);
    return `<div class="cabeca"><h1 class="frase">Hoje você vendeu <span class="mt">${R(vendidoHoje())}</span> em ${v.length} vendas.<small>Lucro de ${R(lucroHoje())} até agora. No mesmo horário de ontem: ${R(vendidoHoje() * db.ontemAteAgora)}.</small></h1><a class="btn pri" href="#vender">Nova venda</a></div>
      ${lembretes ? `<ul class="lembretes">${lembretes}</ul>` : ''}
      <div class="duas"><section><h2>Caderno de hoje</h2><p class="sub">Tudo o que aconteceu na loja, na ordem.</p>
        <ol class="diario">${[...db.diario].reverse().map((x, i) => `<li${i === 0 && x.novo ? ' class="novo"' : ''}><time>${x.hora}</time><span>${x.tipo === 'venda' ? `Venda no ${x.forma.toLowerCase()}: ` : ''}${esc(x.texto)}</span><span class="v ${x.tipo === 'venda' || x.tipo === 'recebido' ? '' : 'sai'}">${x.tipo === 'venda' || x.tipo === 'recebido' ? '+' : '−'} ${R(x.valor)}</span></li>`).join('') || '<li class="vazio">Nenhuma venda ainda hoje. Toque em Nova venda para começar.</li>'}</ol></section>
        <section><h2>O que mais saiu hoje</h2><p class="sub">Contando todas as vendas do dia.</p><ol class="lista">${top.map((t) => `<li><span>${esc(t.n)}</span><span></span><span class="v">${t.q} un.</span></li>`).join('')}</ol></section></div>`;
  },
  vender() {
    const cats = ['Mais vendidos', ...Object.keys(CORES)], f = estado.cat || 'Mais vendidos', b = norm(estado.busca);
    let lista = b ? db.produtos.filter((p) => norm(p.nome).includes(b) || p.ean.includes(b)) : f === 'Mais vendidos' ? [...db.produtos].sort((x, y) => y.vendidos30 - x.vendidos30).slice(0, 12) : db.produtos.filter((p) => p.cat === f);
    const q = (id) => db.comanda.find((x) => x.id === id)?.qtd || 0, total = db.comanda.reduce((t, x) => t + x.qtd * prod(x.id).preco, 0), n = db.comanda.reduce((t, x) => t + x.qtd, 0);
    return `<div class="vender"><section>
        <label class="busca-pdv"><svg viewBox="0 0 24 24"><path d="M4 6v12M7 6v12M11 6v12M14 6v12M18 6v12M20 6v12"/></svg><input data-busca placeholder="Bipe o código ou digite o produto" value="${esc(estado.busca || '')}" autocomplete="off" aria-label="Buscar produto"></label>
        <div class="chips" role="group" aria-label="Categorias">${cats.map((c) => `<button type="button" class="chip" data-cat="${c}" aria-pressed="${!b && c === f}">${c}</button>`).join('')}</div>
        <div class="produtos">${lista.map((p) => `<button type="button" class="prod" data-add="${p.id}" ${p.tem <= 0 ? 'aria-disabled="true"' : ''}><span class="ini" style="background:${CORES[p.cat]}">${ini(p.nome)}</span><b>${esc(p.nome)}</b>${p.tem <= 0 ? '<span class="sem">Sem estoque</span>' : ''}<span class="p">${R(p.preco)}</span>${q(p.id) ? `<span class="q">${q(p.id)}</span>` : ''}</button>`).join('') || '<p class="sub">Nenhum produto com esse nome.</p>'}</div></section>
      <aside class="comanda" id="comanda"><h2>Comanda <small>${n ? `${n} ${n === 1 ? 'item' : 'itens'}` : ''}</small></h2>
        ${db.comanda.length ? `<ul class="itens">${db.comanda.map((x) => { const p = prod(x.id); return `<li><span>${esc(p.nome)}</span><span class="lv">${R(x.qtd * p.preco)}</span><span class="qtd"><button type="button" data-menos="${x.id}" aria-label="Tirar um">−</button><span>${x.qtd}</span><button type="button" data-add="${x.id}" aria-label="Pôr mais um">+</button></span></li>`; }).join('')}</ul>
          <div class="total"><span>Total</span>${R(total)}</div>
          <div class="pagamentos" role="group" aria-label="Forma de pagamento">${['Pix', 'Dinheiro', 'Cartão', 'Fiado'].map((x) => `<button type="button" data-forma="${x}" aria-pressed="${db.forma === x}">${x}</button>`).join('')}</div>
          ${db.forma === 'Fiado' ? `<label class="campo">Pôr no fiado de<select data-fiado><option value="">Escolha o cliente</option>${db.clientes.map((c) => `<option value="${c.id}" ${db.fiadoDe === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>` : ''}
          <button type="button" class="btn pri grande" data-fechar ${db.forma === 'Fiado' && !db.fiadoDe ? 'disabled' : ''}>Fechar venda de ${R(total)}</button>`
        : '<p class="vazio">Toque nos produtos para pôr na comanda.</p>'}</aside></div>
      ${db.comanda.length ? `<div class="barra-comanda so-cel"><span>${n} ${n === 1 ? 'item' : 'itens'} <b>${R(total)}</b></span><a class="btn peq" href="#comanda" data-ir-comanda>Ver comanda</a></div>` : ''}`;
  },
  estoque() {
    const f = estado.filtro || 'todos', ac = acabando(), pa = parados();
    const lista = f === 'acabando' ? ac : f === 'parado' ? pa : [...db.produtos].sort((a, b) => a.nome.localeCompare(b.nome));
    const valor = db.produtos.reduce((t, p) => t + p.tem * p.custo, 0);
    return `<div class="cabeca"><h1 class="frase">${ac.length ? `<span class="mt ambar">${ac.length} produtos</span> estão acabando.` : 'Nada acabando no estoque.'}<small>${db.produtos.length} produtos, ${R(valor)} em mercadoria (pelo custo).</small></h1><button type="button" class="btn pri" data-chegou>Chegou mercadoria</button></div>
      <div class="chips" role="group" aria-label="Mostrar">${[['todos', 'Todos'], ['acabando', `Acabando (${ac.length})`], ['parado', `Parados há 30 dias (${pa.length})`]].map(([k, t]) => `<button type="button" class="chip" data-filtro="${k}" aria-pressed="${f === k}">${t}</button>`).join('')}</div>
      <p class="leg"><span>A barra mostra quanto tem. O risquinho é o mínimo que você quer ter.</span></p>
      <ul class="tabela">${lista.map((p) => { const max = Math.max(p.minimo * 3, p.tem, 1), cls = p.tem <= 0 ? 'er' : p.tem <= p.minimo ? 'al' : ''; return `<li><span class="nome"><b>${esc(p.nome)}</b><small>${p.cat}, vende uns ${Math.round(p.vendidos30 / 4)} por semana</small></span><span class="regua ${cls}" style="--min:${(p.minimo / max) * 100}%"><i style="width:${(p.tem / max) * 100}%"></i></span><span class="qtd-est"><button type="button" data-est="${p.id}" data-d="-1" aria-label="Tirar um de ${esc(p.nome)}">−</button><b>${p.tem}</b><button type="button" data-est="${p.id}" data-d="1" aria-label="Pôr mais um de ${esc(p.nome)}">+</button></span></li>`; }).join('') || '<li><span class="sub">Nenhum produto aqui.</span></li>'}</ul>`;
  },
  dinheiro() {
    return `<div class="cabeca"><h1 class="frase">No caixa agora: <span class="mt">${R(noCaixa())}</span><small>Começou o dia com ${R(db.caixaInicial)}. O fiado só entra quando o cliente pagar.</small></h1><button type="button" class="btn" data-despesa>Lançar despesa</button></div>
      <div class="contas"><div><span>Entrou hoje</span><b>${R(recebidoNoCaixa())}</b></div><div><span>Saiu hoje</span><b class="sai">${R(saiuHoje())}</b></div><div><span>Lucro das vendas de hoje</span><b>${R(lucroHoje())}</b></div></div>
      <div class="duas"><section><h2>Contas para pagar</h2><p class="sub">Da que vence primeiro para a última.</p>
        <ul class="lista">${db.pagar.sort((a, b) => a.vence - b.vence).map((b) => `<li><span>${esc(b.nome)}<small>${b.vence <= 1 ? 'Vence amanhã' : `Vence em ${b.vence} dias`}</small></span><span class="v ${b.vence <= 1 ? 'er' : ''}">${R(b.valor)}</span><button type="button" class="btn peq" data-pagar="${b.id}">Paguei</button></li>`).join('') || '<li><span class="sub">Nenhuma conta para pagar.</span></li>'}</ul></section>
        <section><h2>Para receber</h2><p class="sub">Fiado dos clientes.</p><ul class="lista"><li><span>Total no fiado<small>${db.clientes.length} clientes</small></span><span class="v">${R(fiadoTotal())}</span><a class="btn peq" href="#fiado">Abrir o fiado</a></li></ul></section></div>`;
  },
  fiado() {
    const l = [...db.clientes].sort((a, b) => b.desde - a.desde);
    return `<div class="cabeca"><h1 class="frase">Seus clientes devem <span class="mt">${R(fiadoTotal())}</span> no fiado.<small>Os mais antigos estão em cima. Cobre pelo WhatsApp com um toque.</small></h1></div>
      <ul class="lista">${l.map((c) => `<li><span><b>${esc(c.nome)}</b><small>${c.deve ? `Deve há ${c.desde} dias` : 'Em dia'}</small></span><span class="v ${c.desde > 15 && c.deve ? 'er' : ''}">${R(c.deve)}</span><span style="display:flex;gap:8px">${c.deve ? `<a class="btn peq" target="_blank" rel="noopener" href="${zap(c.tel, `Olá, ${c.nome.split(' ')[0]}! Tudo bem? Aqui é do Mercado Bom Preço. Ficou ${R(c.deve)} no fiado. Pode acertar pelo Pix quando der? Obrigado!`)}">Cobrar no WhatsApp</a><button type="button" class="btn peq" data-recebi="${c.id}">Recebi</button>` : ''}</span></li>`).join('')}</ul>`;
  },
};
const estado = { busca: '', cat: '', filtro: '' };

// ---------------------------------------------------------------- navegação pelas divisórias
function mostrar() {
  const [aba, extra] = (location.hash.slice(1) || 'hoje').split('/');
  const tela = TELAS[aba] ? aba : 'hoje';
  if (tela === 'estoque' && extra) estado.filtro = extra;
  pag.classList.remove('entrou'); pag.innerHTML = TELAS[tela](); void pag.offsetWidth; pag.classList.add('entrou');
  document.querySelectorAll('.divisorias a').forEach((a) => (a.dataset.aba === tela ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  document.title = `${tela[0].toUpperCase()}${tela.slice(1)} · Veltria Gestão`;
}
function redesenhar(foco) { const sel = foco && document.activeElement?.matches(foco) ? foco : null, pos = sel && document.activeElement.selectionStart; mostrar(); if (sel) { const el = pag.querySelector(sel); el?.focus(); if (el && pos != null) el.setSelectionRange(pos, pos); } }
addEventListener('hashchange', () => { if (location.hash !== '#comanda') { estado.busca = ''; mostrar(); pag.focus({ preventScroll: true }); scrollTo({ top: 0 }); } });

function avisar(t) { const a = document.createElement('div'); a.className = 'aviso'; a.textContent = t; document.getElementById('avisos').append(a); setTimeout(() => a.remove(), 3200); }
function janela(html, aoSalvar) {
  const f = document.createElement('div'); f.className = 'fundo'; f.innerHTML = `<form class="janela" method="dialog">${html}<div class="acoes"><button type="button" class="btn" data-x>Cancelar</button><button class="btn pri">Salvar</button></div></form>`;
  document.body.append(f); f.querySelector('input, select')?.focus();
  const fechar = () => f.remove();
  f.addEventListener('click', (e) => { if (e.target === f || e.target.closest('[data-x]')) fechar(); });
  f.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });
  f.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); if (aoSalvar(new FormData(e.target)) !== false) fechar(); });
}

// ---------------------------------------------------------------- ações
pag.addEventListener('click', (e) => {
  const t = e.target.closest('button, a'); if (!t) return;
  const d = t.dataset;
  if (d.add) { const p = prod(d.add); if (p.tem <= 0) return avisar(`${p.nome} está sem estoque`); const x = db.comanda.find((i) => i.id === d.add); x ? x.qtd++ : db.comanda.push({ id: d.add, qtd: 1 }); gravar(); redesenhar(); }
  else if (d.menos) { const x = db.comanda.find((i) => i.id === d.menos); if (--x.qtd <= 0) db.comanda = db.comanda.filter((i) => i !== x); gravar(); redesenhar(); }
  else if (d.cat) { estado.cat = d.cat; estado.busca = ''; redesenhar(); }
  else if (d.forma) { db.forma = d.forma; gravar(); redesenhar(); }
  else if ('fechar' in d) fecharVenda();
  else if ('irComanda' in d) { e.preventDefault(); document.getElementById('comanda')?.scrollIntoView({ behavior: 'smooth' }); }
  else if (d.filtro) { estado.filtro = d.filtro; history.replaceState(null, '', `#estoque/${d.filtro}`); redesenhar(); }
  else if (d.est) { const p = prod(d.est); p.tem = Math.max(0, p.tem + Number(d.d)); gravar(); redesenhar(); }
  else if ('chegou' in d) chegou();
  else if ('despesa' in d) despesa();
  else if (d.pagar) { const b = db.pagar.find((x) => x.id === d.pagar); db.pagar = db.pagar.filter((x) => x !== b); db.diario.push({ tipo: 'pagamento', hora: hora(), texto: `Pagou ${b.nome}`, valor: b.valor, novo: true }); gravar(); avisar(`Pago: ${b.nome}`); redesenhar(); }
  else if (d.recebi) { const c = db.clientes.find((x) => x.id === d.recebi); db.diario.push({ tipo: 'recebido', hora: hora(), texto: `Recebeu o fiado de ${c.nome}`, valor: c.deve, novo: true }); avisar(`Recebido: ${R(c.deve)} de ${c.nome}`); c.deve = 0; c.desde = 0; gravar(); redesenhar(); }
});
pag.addEventListener('input', (e) => { if (e.target.matches('[data-busca]')) { estado.busca = e.target.value; redesenhar('[data-busca]'); } });
pag.addEventListener('change', (e) => { if (e.target.matches('[data-fiado]')) { db.fiadoDe = e.target.value; gravar(); redesenhar(); } });
// leitor de código de barras: Enter na busca põe o produto na comanda
pag.addEventListener('keydown', (e) => {
  if (!e.target.matches('[data-busca]') || e.key !== 'Enter') return;
  const b = norm(e.target.value), p = db.produtos.find((x) => x.ean === b) || db.produtos.find((x) => norm(x.nome).includes(b));
  if (!p) return avisar('Produto não encontrado');
  estado.busca = ''; pag.querySelector(`[data-add="${p.id}"]`)?.click() ?? (db.comanda.push({ id: p.id, qtd: 1 }), gravar(), redesenhar()); pag.querySelector('[data-busca]')?.focus();
});

function fecharVenda() {
  const total = db.comanda.reduce((t, x) => t + x.qtd * prod(x.id).preco, 0), lucro = db.comanda.reduce((t, x) => t + x.qtd * (prod(x.id).preco - prod(x.id).custo), 0);
  db.comanda.forEach((x) => { prod(x.id).tem -= x.qtd; prod(x.id).vendidos30 += x.qtd; });
  const cli = db.clientes.find((c) => c.id === db.fiadoDe);
  if (db.forma === 'Fiado' && cli) { if (!cli.deve) cli.desde = 0; cli.deve += total; }
  const itens = db.comanda.map((x) => ({ nome: prod(x.id).nome, qtd: x.qtd }));
  db.diario.push({ tipo: 'venda', hora: hora(), texto: textoItens(itens) + (cli && db.forma === 'Fiado' ? ` (fiado de ${cli.nome})` : ''), itens, forma: db.forma, valor: total, lucro, novo: true });
  db.comanda = []; db.fiadoDe = ''; db.forma = 'Pix'; gravar();
  avisar(`Venda fechada: ${R(total)}`); location.hash = '#hoje';
}
function chegou() {
  janela(`<h2>Chegou mercadoria</h2><p class="sub">O estoque sobe e o valor entra como saída do caixa.</p>
    <label class="campo">Produto<select name="p" required>${[...db.produtos].sort((a, b) => a.tem / a.minimo - b.tem / b.minimo).map((p) => `<option value="${p.id}">${esc(p.nome)} (tem ${p.tem})</option>`).join('')}</select></label>
    <label class="campo">Quantas unidades chegaram<input name="q" type="number" min="1" inputmode="numeric" required value="24"></label>
    <label class="campo">Quanto pagou em cada uma<input name="c" type="number" min="0" step="0.01" inputmode="decimal" required></label>`, (f) => {
    const p = prod(f.get('p')), q = Number(f.get('q')), c = Number(f.get('c')) || p.custo;
    p.tem += q; p.custo = c; db.diario.push({ tipo: 'entrada', hora: hora(), texto: `Chegou mercadoria: ${q} ${p.nome}`, valor: q * c, novo: true }); gravar();
    avisar(`${p.nome}: agora tem ${p.tem}`); redesenhar();
  });
  const sel = document.querySelector('.janela select'), custo = document.querySelector('.janela [name=c]'); const pre = () => (custo.placeholder = `Última vez: ${R(prod(sel.value).custo)}`); sel.addEventListener('change', pre); pre();
}
function despesa() {
  janela(`<h2>Lançar despesa</h2><label class="campo">O que foi<input name="t" required placeholder="Ex.: frete, almoço da equipe"></label><label class="campo">Valor<input name="v" type="number" min="0.01" step="0.01" inputmode="decimal" required></label>`, (f) => {
    db.diario.push({ tipo: 'pagamento', hora: hora(), texto: f.get('t'), valor: Number(f.get('v')), novo: true }); gravar(); avisar('Despesa lançada'); redesenhar();
  });
}

// ---------------------------------------------------------------- "O que você quer fazer?": leva a qualquer lugar
const cmd = document.getElementById('comando'), sug = document.getElementById('sugestoes');
const ACOES = [
  ['vender venda comanda caixa pdv', 'Nova venda', () => (location.hash = '#vender')],
  ['chegou entrada mercadoria compra repor fornecedor', 'Chegou mercadoria', () => { location.hash = '#estoque'; setTimeout(chegou, 60); }],
  ['acabando repor falta estoque baixo', 'Ver o que está acabando', () => (location.hash = '#estoque/acabando')],
  ['fiado cobrar deve devendo receber', 'Cobrar o fiado', () => (location.hash = '#fiado')],
  ['quanto vendi hoje resumo lucro dia', 'Quanto vendi hoje', () => (location.hash = '#hoje')],
  ['dinheiro caixa pagar conta boleto despesa', 'Ver o dinheiro e as contas', () => (location.hash = '#dinheiro')],
  ['despesa gasto saida frete', 'Lançar despesa', () => { location.hash = '#dinheiro'; setTimeout(despesa, 60); }],
];
let opcoes = [], sel = 0;
function sugerir() {
  const t = norm(cmd.value.trim()); if (!t) { sug.hidden = true; return; }
  const palavras = t.split(/\s+/);
  const acoes = ACOES.filter(([k, nome]) => palavras.some((w) => w.length > 2 && (norm(k).includes(w) || norm(nome).includes(w)))).map(([, nome, f]) => ({ nome, dica: '', f }));
  const prods = db.produtos.filter((p) => palavras.every((w) => ['vender', 'vende', 'estoque', 'de', 'do'].includes(w) || norm(p.nome).includes(w))).slice(0, 4);
  const querEstoque = palavras.includes('estoque');
  opcoes = [...prods.map((p) => querEstoque ? { nome: `Estoque de ${p.nome}`, dica: `tem ${p.tem}`, f: () => { location.hash = '#estoque'; } } : { nome: `Vender ${p.nome}`, dica: R(p.preco), f: () => { const x = db.comanda.find((i) => i.id === p.id); x ? x.qtd++ : db.comanda.push({ id: p.id, qtd: 1 }); gravar(); location.hash === '#vender' ? mostrar() : (location.hash = '#vender'); avisar(`${p.nome} na comanda`); } }), ...acoes].slice(0, 6);
  sel = 0;
  sug.innerHTML = opcoes.map((o, i) => `<li role="option" data-i="${i}" aria-selected="${i === sel}">${esc(o.nome)}<small>${esc(o.dica)}</small></li>`).join('') || '<li aria-disabled="true">Não achei. Tente "vender", "chegou mercadoria" ou o nome de um produto.</li>';
  sug.hidden = false;
}
const escolher = (i) => { const o = opcoes[i]; if (!o) return; cmd.value = ''; sug.hidden = true; cmd.blur(); o.f(); };
cmd.addEventListener('input', sugerir);
cmd.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + opcoes.length) % Math.max(opcoes.length, 1); sug.querySelectorAll('li').forEach((li, i) => li.setAttribute('aria-selected', i === sel)); }
  else if (e.key === 'Enter') { e.preventDefault(); escolher(sel); }
  else if (e.key === 'Escape') { sug.hidden = true; cmd.blur(); }
});
sug.addEventListener('mousedown', (e) => { const li = e.target.closest('[data-i]'); if (li) { e.preventDefault(); escolher(Number(li.dataset.i)); } });
cmd.addEventListener('blur', () => setTimeout(() => (sug.hidden = true), 120));
addEventListener('keydown', (e) => { if (e.key === '/' && !e.target.closest('input, select, textarea')) { e.preventDefault(); cmd.focus(); } });

mostrar();
document.getElementById('recomecar')?.addEventListener('click', () => { localStorage.removeItem(CHAVE); location.replace(location.pathname); });
