// Veltria Gestão · protótipo do layout "caderno da loja"
// Cinco divisórias (Hoje, Vender, Estoque, Dinheiro, Fiado) e uma caixa "O que você quer fazer?" que leva a qualquer lugar.
// Dados de exemplo guardados só neste navegador (?novo no endereço recomeça).
// Caixa de mercado: leitor de código de barras (USB ou câmera), pesáveis pela etiqueta da balança, desconto, troco, NFC-e e fechamento de caixa.

const textoItens = (l) => l.map((x) => (x.kg ? `${Number(x.qtd).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg de ${x.nome}` : `${x.qtd}× ${x.nome}`)).join(', ');
const R = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const hora = (d = new Date()) => d.toTimeString().slice(0, 5);
const CORES = { Mercearia: '#526d62', Bebidas: '#34485a', Limpeza: '#6f8a7f', Higiene: '#8a7f6c', Descartáveis: '#a0663f', Hortifrúti: '#5f7d4e', Padaria: '#9a7b55' };
const CHAVE = 'veltria-gestao-simples-v1';

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
  P.push(...[['Banana prata', 'Hortifrúti', 3.2, 6.98, 38.5, 15, 120, '0101'], ['Tomate italiano', 'Hortifrúti', 4.9, 8.99, 21.2, 10, 64, '0102'], ['Pão francês', 'Padaria', 6.5, 16.9, 9.4, 6, 180, '0201'], ['Queijo muçarela fatiado', 'Padaria', 31, 54.9, 4.1, 3, 22, '0202']]
    .map(([nome, cat, custo, preco, tem, minimo, vendidos30, plu], i) => ({ id: `k${i}`, nome, cat, custo, preco, tem, minimo, vendidos30, kg: true, plu, ean: '' })));
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
  return { produtos: P, clientes, pagar, diario, caixaInicial: 350, ontemAteAgora: 0.86, eu: { nome: 'Marquinhos', letra: 'normal', som: true, abrir: 'hoje', imprimir: false, cpf: false, confirmarFiado: true }, comanda: [], forma: 'Pix', fiadoDe: '', desconto: 0, recebido: '', cpf: '', proxNfce: 18431 };
}
const EU_PADRAO = { nome: 'Marquinhos', letra: 'normal', som: true, abrir: 'hoje', imprimir: false, cpf: false, confirmarFiado: true };
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || semente(); } catch { return semente(); } })();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
db.eu = { ...EU_PADRAO, ...(db.eu || {}) };
db.equipe ||= [{ id: 'q1', nome: 'Dona Lurdes', cargo: 'Gerente', ve: { vender: true, estoque: true, dinheiro: true, fiado: true } }, { id: 'q2', nome: 'Marquinhos', cargo: 'Caixa', ve: { vender: true, estoque: false, dinheiro: false, fiado: true } }, { id: 'q3', nome: 'Júlia', cargo: 'Caixa', ve: { vender: true, estoque: false, dinheiro: false, fiado: true } }, { id: 'q4', nome: 'Seu Zé', cargo: 'Repositor', ve: { vender: false, estoque: true, dinheiro: false, fiado: false } }];
db.plano ||= 'basico';
const dataCurta = (d) => { if (d === 0) return 'hoje'; const x = new Date(); x.setDate(x.getDate() + d); return x.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''); };
const assinaturaPadrao = () => ({ valor: 59, status: 'ativa', renova: true, proxima: 11, pagamentos: [{ dia: -19, ok: true }, { dia: -49, ok: true }] });
db.assinatura ||= assinaturaPadrao();
const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { /* sem espaço: segue na memória */ } };

// contas do dia
const vendasHoje = () => db.diario.filter((x) => x.tipo === 'venda');
const vendidoHoje = () => vendasHoje().reduce((t, x) => t + x.valor, 0);
const lucroHoje = () => vendasHoje().reduce((t, x) => t + (x.lucro || 0), 0);
const saiuHoje = () => db.diario.filter((x) => x.tipo === 'entrada' || x.tipo === 'pagamento' || x.tipo === 'sangria').reduce((t, x) => t + x.valor, 0);
const recebidoNoCaixa = () => vendasHoje().filter((x) => x.forma !== 'Fiado').reduce((t, x) => t + x.valor, 0) + db.diario.filter((x) => x.tipo === 'recebido').reduce((t, x) => t + x.valor, 0);
const gaveta = () => db.caixaInicial + vendasHoje().filter((x) => x.forma === 'Dinheiro').reduce((t, x) => t + x.valor, 0) + db.diario.filter((x) => x.tipo === 'suprimento').reduce((t, x) => t + x.valor, 0) - db.diario.filter((x) => x.tipo === 'sangria' || x.tipo === 'pagamento').reduce((t, x) => t + x.valor, 0);
const porForma = () => ['Dinheiro', 'Pix', 'Cartão', 'Fiado'].map((f) => [f, vendasHoje().filter((x) => x.forma === f).reduce((t, x) => t + x.valor, 0)]);
const qtdTxt = (p, q) => (p.kg ? `${Number(q).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg` : `${q}`);
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
    const top = Object.values(v.flatMap((x) => x.itens || []).reduce((m, i) => { (m[i.nome] ||= { n: i.nome, q: 0, kg: i.kg }).q += i.qtd; return m; }, {})).sort((a, b) => b.q - a.q).slice(0, 5);
    return `<div class="cabeca"><h1 class="frase">Hoje você vendeu <span class="mt">${R(vendidoHoje())}</span> em ${v.length} ${v.length === 1 ? 'venda' : 'vendas'}.<small>Lucro de ${R(lucroHoje())} até agora. No mesmo horário de ontem: ${R(vendidoHoje() * db.ontemAteAgora)}.</small></h1><a class="btn pri" href="#vender">Nova venda</a></div>
      ${lembretes ? `<ul class="lembretes">${lembretes}</ul>` : ''}
      <div class="duas"><section><h2>Caderno de hoje</h2><p class="sub">Tudo o que aconteceu na loja, na ordem.</p>
        <ol class="diario">${[...db.diario].reverse().map((x, i) => `<li${i === 0 && x.novo ? ' class="novo"' : ''}><time>${x.hora}</time><span>${x.tipo === 'venda' ? `Venda no ${x.forma.toLowerCase()}: ` : ''}${esc(x.texto)}</span><span class="v ${['venda', 'recebido', 'suprimento'].includes(x.tipo) ? '' : 'sai'}">${x.valor ? `${['venda', 'recebido', 'suprimento'].includes(x.tipo) ? '+' : '−'} ${R(x.valor)}` : ''}</span></li>`).join('') || '<li class="vazio">Nenhuma venda ainda hoje. Toque em Nova venda para começar.</li>'}</ol></section>
        <section><h2>O que mais saiu hoje</h2><p class="sub">Contando todas as vendas do dia.</p><ol class="lista">${top.map((t) => `<li><span>${esc(t.n)}</span><span></span><span class="v">${t.kg ? `${t.q.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg` : `${t.q} un.`}</span></li>`).join('')}</ol></section></div>`;
  },
  vender() {
    const cats = ['Mais vendidos', ...Object.keys(CORES)], f = estado.cat || 'Mais vendidos', b = norm(estado.busca);
    let lista = b ? db.produtos.filter((p) => norm(p.nome).includes(b) || p.ean.includes(b)) : f === 'Mais vendidos' ? [...db.produtos].sort((x, y) => y.vendidos30 - x.vendidos30).slice(0, 12) : db.produtos.filter((p) => p.cat === f);
    const q = (id) => db.comanda.find((x) => x.id === id)?.qtd || 0, sub = subtotal(), desc = Math.min(db.desconto || 0, sub), total = sub - desc, n = db.comanda.reduce((t, x) => t + (prod(x.id).kg ? 1 : x.qtd), 0), troco = db.forma === 'Dinheiro' && num(db.recebido) >= total ? num(db.recebido) - total : null;
    return `<div class="vender"><section>
        <div class="linha-pdv"><label class="busca-pdv"><svg viewBox="0 0 24 24"><path d="M4 6v12M7 6v12M11 6v12M14 6v12M18 6v12M20 6v12"/></svg><input data-busca placeholder="Bipe o código, digite o produto ou 3*código" value="${esc(estado.busca || '')}" autocomplete="off" aria-label="Buscar produto ou ler código de barras"></label><button type="button" class="btn camera" data-camera aria-label="Abrir o scanner de código de barras"><svg viewBox="0 0 24 24"><path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3"/><path d="M7 8v8M10 8v8M13 8v8M16 8v8"/></svg><span>Scanner</span></button></div>
        <p class="dica-pdv">Leitor de código de barras ligado: é só bipar, mesmo sem clicar aqui. Produto por peso: bipe a etiqueta da balança. <kbd>F2</kbd> busca · <kbd>F9</kbd> fecha a venda</p>
        <div class="chips" role="group" aria-label="Categorias">${cats.map((c) => `<button type="button" class="chip" data-cat="${c}" aria-pressed="${!b && c === f}">${c}</button>`).join('')}</div>
        <div class="produtos">${lista.map((p) => `<button type="button" class="prod" data-add="${p.id}" ${p.tem <= 0 ? 'aria-disabled="true"' : ''}><span class="ini" style="background:${CORES[p.cat]}">${ini(p.nome)}</span><b>${esc(p.nome)}</b>${p.tem <= 0 ? '<span class="sem">Sem estoque</span>' : p.kg ? '<span class="sem peso">por peso</span>' : ''}<span class="p">${R(p.preco)}${p.kg ? '<small>/kg</small>' : ''}</span>${q(p.id) ? `<span class="q">${p.kg ? '✓' : q(p.id)}</span>` : ''}</button>`).join('') || '<p class="sub">Nenhum produto com esse nome.</p>'}</div></section>
      <aside class="comanda" id="comanda"><h2>Comanda <small>${n ? `${n} ${n === 1 ? 'item' : 'itens'}` : ''}</small></h2>
        ${db.comanda.length ? `<ul class="itens">${db.comanda.map((x) => { const p = prod(x.id); return `<li><span>${esc(p.nome)}${p.kg ? `<small>${qtdTxt(p, x.qtd)} × ${R(p.preco)}/kg</small>` : ''}</span><span class="lv">${R(x.qtd * p.preco)}</span>${p.kg ? `<span class="qtd"><button type="button" data-menos="${x.id}" aria-label="Tirar ${esc(p.nome)}">×</button></span>` : `<span class="qtd"><button type="button" data-menos="${x.id}" aria-label="Tirar um">−</button><span>${x.qtd}</span><button type="button" data-add="${x.id}" aria-label="Pôr mais um">+</button></span>`}</li>`; }).join('')}</ul>
          ${desc ? `<div class="subt"><span>Subtotal</span><span>${R(sub)}</span></div><div class="subt"><span>Desconto</span><span>− ${R(desc)}</span></div>` : ''}<div class="total"><span>Total</span>${R(total)}</div>
          <div class="extras-cupom"><button type="button" class="btn peq" data-desconto>${desc ? 'Mudar desconto' : 'Dar desconto'}</button><label class="cpf">CPF na nota<input data-cpf inputmode="numeric" maxlength="14" placeholder="opcional" value="${esc(db.cpf || '')}"></label></div>
          <div class="pagamentos" role="group" aria-label="Forma de pagamento">${['Pix', 'Dinheiro', 'Cartão', 'Fiado'].map((x) => `<button type="button" data-forma="${x}" aria-pressed="${db.forma === x}">${x}</button>`).join('')}</div>
          ${db.forma === 'Fiado' ? `<label class="campo">Pôr no fiado de<select data-fiado><option value="">Escolha o cliente</option>${db.clientes.map((c) => `<option value="${c.id}" ${db.fiadoDe === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>` : ''}
          ${db.forma === 'Dinheiro' ? `<label class="campo">Quanto o cliente deu<input data-recebido inputmode="decimal" placeholder="${R(Math.ceil(total / 10) * 10)}" value="${esc(db.recebido || '')}"></label>${troco != null ? `<p class="troco">Troco: <b>${R(troco)}</b></p>` : ''}` : ''}
          <button type="button" class="btn pri grande" data-fechar ${db.forma === 'Fiado' && !db.fiadoDe ? 'disabled' : ''}>Fechar venda de ${R(total)}</button><button type="button" class="btn fant peq cancelar" data-cancelar-venda>Cancelar esta venda</button>`
        : '<p class="vazio">Bipe um produto ou toque nele para pôr na comanda.</p>'}</aside></div>
      ${db.comanda.length ? `<div class="barra-comanda so-cel"><span>${n} ${n === 1 ? 'item' : 'itens'} <b>${R(total)}</b></span><a class="btn peq" href="#comanda" data-ir-comanda>Ver comanda</a></div>` : ''}`;
  },
  estoque() {
    const f = estado.filtro || 'todos', ac = acabando(), pa = parados();
    const lista = f === 'acabando' ? ac : f === 'parado' ? pa : [...db.produtos].sort((a, b) => a.nome.localeCompare(b.nome));
    const valor = db.produtos.reduce((t, p) => t + p.tem * p.custo, 0);
    return `<div class="cabeca"><h1 class="frase">${ac.length ? `<span class="mt ambar">${ac.length} produtos</span> estão acabando.` : 'Nada acabando no estoque.'}<small>${db.produtos.length} produtos, ${R(valor)} em mercadoria (pelo custo).</small></h1><span class="botoes"><button type="button" class="btn" data-novo-prod>Novo produto</button><button type="button" class="btn pri" data-chegou>Chegou mercadoria</button></span></div>
      <div class="chips" role="group" aria-label="Mostrar">${[['todos', 'Todos'], ['acabando', `Acabando (${ac.length})`], ['parado', `Parados há 30 dias (${pa.length})`]].map(([k, t]) => `<button type="button" class="chip" data-filtro="${k}" aria-pressed="${f === k}">${t}</button>`).join('')}</div>
      <p class="leg"><span>A barra mostra quanto tem. O risquinho é o mínimo que você quer ter. Toque no nome para mudar preço, código ou mínimo.</span></p>
      <ul class="tabela">${lista.map((p) => { const max = Math.max(p.minimo * 3, p.tem, 1), cls = p.tem <= 0 ? 'er' : p.tem <= p.minimo ? 'al' : ''; return `<li><span class="nome"><button type="button" class="nome-btn" data-editar="${p.id}"><b>${esc(p.nome)}</b></button><span class="cod-barras ${p.ean || p.kg ? '' : 'sem'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6v12M7 6v12M11 6v12M14 6v12M18 6v12M20 6v12"/></svg>${p.kg ? `Balança · PLU ${p.plu}` : p.ean ? p.ean : 'sem código: toque no nome para cadastrar'}</span><small>${p.cat} · ${R(p.preco)}${p.kg ? '/kg' : ''} · vende uns ${p.kg ? qtdTxt(p, Math.round(p.vendidos30 / 4 * 10) / 10) : Math.round(p.vendidos30 / 4)} por semana</small></span><span class="regua ${cls}" style="--min:${(p.minimo / max) * 100}%"><i style="width:${(p.tem / max) * 100}%"></i></span><span class="qtd-est"><button type="button" data-est="${p.id}" data-d="-1" aria-label="Tirar um de ${esc(p.nome)}">−</button><b>${p.kg ? qtdTxt(p, p.tem) : p.tem}</b><button type="button" data-est="${p.id}" data-d="1" aria-label="Pôr mais um de ${esc(p.nome)}">+</button></span></li>`; }).join('') || '<li><span class="sub">Nenhum produto aqui.</span></li>'}</ul>`;
  },
  dinheiro() {
    return `<div class="cabeca"><h1 class="frase">No caixa agora: <span class="mt">${R(noCaixa())}</span><small>Começou o dia com ${R(db.caixaInicial)}. O fiado só entra quando o cliente pagar.</small></h1><span class="botoes"><button type="button" class="btn" data-despesa>Lançar despesa</button><button type="button" class="btn" data-sangria>Sangria</button><button type="button" class="btn" data-suprimento>Suprimento</button><button type="button" class="btn pri" data-fechar-caixa>Fechar o caixa</button></span></div>
      <div class="contas"><div><span>Dinheiro na gaveta</span><b>${R(gaveta())}</b></div>${porForma().map(([f, v]) => `<div><span>Vendas no ${f.toLowerCase()}</span><b>${R(v)}</b></div>`).join('')}</div>
      <div class="contas"><div><span>Entrou hoje</span><b>${R(recebidoNoCaixa())}</b></div><div><span>Saiu hoje</span><b class="sai">${R(saiuHoje())}</b></div><div><span>Lucro das vendas de hoje</span><b>${R(lucroHoje())}</b></div></div>
      <div class="duas"><section><h2>Contas para pagar</h2><p class="sub">Da que vence primeiro para a última.</p>
        <ul class="lista">${db.pagar.sort((a, b) => a.vence - b.vence).map((b) => `<li><span>${esc(b.nome)}<small>${b.vence <= 1 ? 'Vence amanhã' : `Vence em ${b.vence} dias`}</small></span><span class="v ${b.vence <= 1 ? 'er' : ''}">${R(b.valor)}</span><button type="button" class="btn peq" data-pagar="${b.id}">Paguei</button></li>`).join('') || '<li><span class="sub">Nenhuma conta para pagar.</span></li>'}</ul></section>
        <section><h2>Para receber</h2><p class="sub">Fiado dos clientes.</p><ul class="lista"><li><span>Total no fiado<small>${db.clientes.length} clientes</small></span><span class="v">${R(fiadoTotal())}</span><a class="btn peq" href="#fiado">Abrir o fiado</a></li></ul></section></div>`;
  },
  config() {
    const e = db.eu, op = (n, v, t) => `<option value="${v}" ${e[n] === v ? 'selected' : ''}>${t}</option>`, ch = (n, t, d) => `<label class="cfg-ch"><input type="checkbox" data-eu="${n}" ${e[n] ? 'checked' : ''}><span><b>${t}</b><small>${d}</small></span></label>`;
    return `<div class="cabeca"><h1 class="frase">Suas configurações<small>Valem só para você, neste aparelho e na sua conta. O que é da loja inteira fica no Painel do dono.</small></h1></div>
      <div class="cfg">
        <section><h2>Você</h2>
          <label class="campo">Seu nome<input data-eu="nome" maxlength="40" value="${esc(e.nome)}" placeholder="Como você quer ser chamado"><span class="sub">Aparece no topo, no cupom e no caderno de cada dia.</span></label>
          <label class="campo">E-mail de entrada<input value="${esc(norm(e.nome).split(' ')[0] || 'voce')}@mercadobompreco.com.br" disabled><span class="sub">Para trocar o e-mail ou a senha, use Minha conta no site.</span></label></section>
        <section><h2>Tela</h2>
          <label class="campo">Tamanho das letras<select data-eu="letra">${op('letra', 'normal', 'Normal')}${op('letra', 'grande', 'Grande')}${op('letra', 'maior', 'Bem grande')}</select></label>
          <label class="campo">Abrir o sistema em<select data-eu="abrir">${op('abrir', 'hoje', 'Hoje (resumo do dia)')}${op('abrir', 'vender', 'Vender (direto no caixa)')}</select></label></section>
        <section><h2>Caixa</h2>
          ${ch('som', 'Bipe ao ler o código', 'Toca um bipe curto a cada produto lido; um som grave quando o código não existe.')}
          ${ch('imprimir', 'Imprimir o cupom sozinho', 'Ao fechar a venda, já abre a impressão do cupom.')}
          ${ch('cpf', 'Perguntar o CPF na nota', 'Antes de fechar, pergunta se o cliente quer CPF na nota.')}
          ${ch('confirmarFiado', 'Confirmar antes de pôr no fiado', 'Evita lançar no fiado da pessoa errada.')}</section>
        <section><h2>Assinatura e equipe</h2><p class="sub">Plano, cobranças e quem trabalha com você.</p><div class="botoes"><a class="btn" href="#assinatura">Minha assinatura</a><a class="btn" href="#dono">Painel do dono</a></div></section>
        <section><h2>Seus dados</h2><p class="sub">Baixe a lista de produtos com códigos, preços e estoque, para abrir no Excel.</p><button type="button" class="btn" data-exportar>Baixar planilha de produtos</button>
          <p class="sub" style="margin-top:14px">Teste do leitor: bipe qualquer produto agora para conferir se o leitor está funcionando.</p><p class="troco" data-teste-leitor>Esperando a leitura…</p></section>
      </div>`;
  },
  ia() {
    const sug = ['O que eu compro esta semana?', 'Quem eu cobro do fiado primeiro?', 'Como foi o dia hoje?', 'Qual produto está parado?', 'Escreva um aviso de promoção para o WhatsApp'];
    return `<div class="cabeca"><h1 class="frase">Pergunte ao caderno<small>O assistente lê os números do mercado (nunca o telefone dos clientes). Na versão contratada são 20 perguntas grátis por dia; aqui as respostas são de exemplo.</small></h1></div>
      <div class="chips" role="group" aria-label="Perguntas prontas">${sug.map((x) => `<button type="button" class="chip" data-sug="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <label class="campo">Sua pergunta<input data-pergunta placeholder="Ex.: o que está acabando?"></label><button type="button" class="btn pri grande" data-perguntar>Perguntar</button>
      <div class="resposta-ia" data-resposta hidden aria-live="polite"></div>`;
  },
  assinatura() {
    const a = db.assinatura, preco = db.plano === 'pro' ? 119 : 59;
    const topo = a.status === 'vencida' ? `<span class="mt" style="background:#f2d3c4">venceu</span>. O pagamento de ${R(preco)} não foi aprovado.<small>Pague para o caixa voltar a funcionar. Nenhuma venda foi perdida.</small>`
      : a.renova ? `<span class="mt">ativa</span>.<small>Plano Assinatura, ${R(preco)} por mês. Próxima cobrança ${dataCurta(a.proxima)}, no cartão.</small>`
      : `cancelada.<small>Nada mais é cobrado. Você usa o app até ${dataCurta(a.proxima)}.</small>`;
    return `<div class="cabeca"><h1 class="frase">Sua assinatura está ${topo}</h1></div>
      <div class="botoes" style="margin-bottom:18px">${a.status === 'vencida' ? '<button type="button" class="btn pri" data-pagar-ass>Pagar aqui no app</button><a class="btn" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a>'
        : a.renova ? '<a class="btn" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Trocar cartão no site</a><button type="button" class="btn" data-cancelar-ass>Cancelar assinatura</button>' : '<button type="button" class="btn pri" data-reativar>Reativar</button>'}</div>
      <h2>Pagamentos</h2><ul class="lista">${[...a.pagamentos].sort((x, y) => y.dia - x.dia).map((p) => `<li><span>${dataCurta(p.dia)}<small>${p.ok ? 'pago no cartão' : 'recusado pelo banco'}</small></span><span class="v ${p.ok ? '' : 'er'}">${R(preco)}</span></li>`).join('')}</ul>
      <p class="sub" style="margin-top:12px">A assinatura do app é a mesma da sua conta no site. Sem fidelidade: cancelando, você usa até o fim do mês já pago.</p>`;
  },
  dono() {
    const AREAS = [['vender', 'Caixa'], ['estoque', 'Estoque'], ['dinheiro', 'Dinheiro'], ['fiado', 'Fiado']], preco = db.plano === 'pro' ? 119 : 59;
    return `<div class="cabeca"><h1 class="frase">Painel do dono<small>Quem trabalha no mercado e o que cada um pode abrir. Só você vê esta divisória.</small></h1><button type="button" class="btn pri" data-convidar>Pôr alguém na equipe</button></div>
      <div class="contas"><div><span>Seu plano</span><b>Assinatura · ${R(preco)}/mês</b></div><div><span>Equipe</span><b>${db.equipe.length + 1} pessoas</b></div><div><span>Vagas no plano</span><b>sem limite</b></div></div>
      <h2>Quem pode abrir o quê</h2><p class="sub">Marque as divisórias de cada pessoa. O caixa não vê quanto o mercado lucra se você não deixar.</p>
      <div class="tabela-dono"><div class="linha-dono topo"><span>Pessoa</span>${AREAS.map(([, t]) => `<span>${t}</span>`).join('')}<span></span></div>
        <div class="linha-dono"><span><b>${esc(db.eu.nome)}</b><small>dono</small></span>${AREAS.map(() => '<span>✓</span>').join('')}<span></span></div>
        ${db.equipe.map((p) => `<div class="linha-dono"><span><b>${esc(p.nome)}</b><small>${esc(p.cargo)}</small></span>${AREAS.map(([k, t]) => `<label><input type="checkbox" data-ve="${p.id}:${k}" ${p.ve[k] ? 'checked' : ''} aria-label="${esc(p.nome)} abre ${t}"></label>`).join('')}<button type="button" class="btn peq" data-tirar="${p.id}">Tirar</button></div>`).join('')}</div>
      <h2>Plano</h2><div class="botoes"><button type="button" class="btn ${db.plano === 'basico' ? 'pri' : ''}" data-plano="basico">Assinatura · R$ 59/mês</button></div>
      <p class="sub" style="margin-top:10px">A assinatura e a troca de plano ficam em <a href="#assinatura">Minha assinatura</a>.</p>`;
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
  const [aba, extra] = (location.hash.slice(1) || db.eu.abrir || 'hoje').split('/');
  const tela = TELAS[aba] ? aba : 'hoje';
  if (tela === 'estoque' && extra) estado.filtro = extra;
  pag.classList.remove('entrou'); pag.innerHTML = TELAS[tela](); void pag.offsetWidth; pag.classList.add('entrou');
  aplicarEu();
  document.querySelectorAll('.divisorias a').forEach((a) => (a.dataset.aba === tela ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  document.title = `${{ dono: 'Painel do dono', config: 'Configurações', ia: 'Assistente', assinatura: 'Minha assinatura' }[tela] || tela[0].toUpperCase() + tela.slice(1)} · Veltria Gestão Essencial`;
  if (!db.assinatura.renova && db.assinatura.status !== 'vencida' && tela !== 'assinatura') pag.insertAdjacentHTML('afterbegin', `<p class="aviso-ass">Assinatura cancelada: você usa até ${dataCurta(db.assinatura.proxima)}. <a href="#assinatura">Reativar</a></p>`);
  travar(tela);
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
  if (d.add) { const p = prod(d.add); if (p.kg) pedirPeso(p); else porNaComanda(p, 1); }
  else if (d.menos) { const x = db.comanda.find((i) => i.id === d.menos); x.qtd = prod(x.id).kg ? 0 : x.qtd - 1; if (x.qtd <= 0) db.comanda = db.comanda.filter((i) => i !== x); gravar(); redesenhar(); }
  else if ('camera' in d) camera();
  else if ('desconto' in d) darDesconto();
  else if ('cancelarVenda' in d) { if (confirm('Cancelar esta venda? Os itens saem da comanda.')) { db.comanda = []; db.desconto = 0; db.recebido = ''; db.cpf = ''; gravar(); redesenhar(); avisar('Venda cancelada'); } }
  else if ('novoProd' in d) editarProduto(null);
  else if (d.editar) editarProduto(prod(d.editar));
  else if ('sangria' in d) movimentoCaixa('sangria');
  else if ('suprimento' in d) movimentoCaixa('suprimento');
  else if ('fecharCaixa' in d) fecharCaixa();
  else if ('exportar' in d) {
    const linhas = [['Código de barras', 'PLU balança', 'Produto', 'Categoria', 'Custo', 'Preço', 'Por kg', 'Estoque', 'Mínimo'], ...db.produtos.map((p) => [p.ean, p.plu || '', p.nome, p.cat, p.custo, p.preco, p.kg ? 'sim' : 'não', p.tem, p.minimo].map((v) => (typeof v === 'number' ? String(v).replace('.', ',') : v)))];
    const csv = '\ufeff' + linhas.map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'produtos-mercado.csv'; a.click(); URL.revokeObjectURL(a.href);
  }
  else if (d.cat) { estado.cat = d.cat; estado.busca = ''; redesenhar(); }
  else if (d.forma) { db.forma = d.forma; gravar(); redesenhar(); }
  else if ('fechar' in d) fecharVenda();
  else if ('irComanda' in d) { e.preventDefault(); document.getElementById('comanda')?.scrollIntoView({ behavior: 'smooth' }); }
  else if (d.filtro) { estado.filtro = d.filtro; history.replaceState(null, '', `#estoque/${d.filtro}`); redesenhar(); }
  else if (d.est) { const p = prod(d.est); p.tem = Math.max(0, p.tem + Number(d.d)); gravar(); redesenhar(); }
  else if ('chegou' in d) chegou();
  else if ('despesa' in d) despesa();
  else if (d.pagar) { const b = db.pagar.find((x) => x.id === d.pagar); db.pagar = db.pagar.filter((x) => x !== b); db.diario.push({ tipo: 'conta', hora: hora(), texto: `Pagou ${b.nome} (pelo banco)`, valor: b.valor, novo: true }); gravar(); avisar(`Pago: ${b.nome}`); redesenhar(); }
  else if (d.recebi) { const c = db.clientes.find((x) => x.id === d.recebi); db.diario.push({ tipo: 'recebido', hora: hora(), texto: `Recebeu o fiado de ${c.nome}`, valor: c.deve, novo: true }); avisar(`Recebido: ${R(c.deve)} de ${c.nome}`); c.deve = 0; c.desde = 0; gravar(); redesenhar(); }
});
pag.addEventListener('input', (e) => {
  if (e.target.matches('[data-busca]')) { estado.busca = e.target.value; redesenhar('[data-busca]'); }
  if (e.target.matches('[data-recebido]')) { db.recebido = e.target.value; gravar(); redesenhar('[data-recebido]'); }
  if (e.target.matches('[data-cpf]')) { db.cpf = e.target.value; gravar(); }
  if (e.target.matches('[data-eu="nome"]')) { db.eu.nome = e.target.value.trim() || 'Você'; gravar(); aplicarEu(); }
});
function aplicarEu() {
  document.documentElement.style.fontSize = { normal: '', grande: '112.5%', maior: '125%' }[db.eu.letra] || '';
  const q = document.getElementById('quem'); if (q) q.textContent = `Caixa: ${db.eu.nome}`;
}
pag.addEventListener('change', (e) => {
  const k = e.target.dataset?.eu;
  if (k) { db.eu[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; gravar(); aplicarEu(); avisar('Configuração salva'); return; } if (e.target.matches('[data-fiado]')) { db.fiadoDe = e.target.value; gravar(); redesenhar(); } });
// leitor de código de barras: Enter na busca põe o produto na comanda
pag.addEventListener('keydown', (e) => {
  if (!e.target.matches('[data-busca]') || e.key !== 'Enter') return;
  e.preventDefault(); const v = e.target.value.trim(); if (!v) return;
  estado.busca = ''; lerCodigo(v, true);
});

function fecharVenda() {
  if (!db.comanda.length) return;
  if (db.forma === 'Fiado' && !db.fiadoDe) return avisar('Escolha o cliente do fiado');
  if (db.eu.cpf && !db.cpf && !confirm('O cliente quer CPF na nota? Clique em Cancelar para voltar e digitar, ou OK para seguir sem CPF.')) { pag.querySelector('[data-cpf]')?.focus(); return; }
  if (db.forma === 'Fiado' && db.eu.confirmarFiado && !confirm(`Pôr ${R(subtotal() - Math.min(db.desconto || 0, subtotal()))} no fiado de ${db.clientes.find((c) => c.id === db.fiadoDe)?.nome}?`)) return;
  const sub = subtotal(), desc = Math.min(db.desconto || 0, sub), total = sub - desc, lucro = db.comanda.reduce((t, x) => t + x.qtd * (prod(x.id).preco - prod(x.id).custo), 0) - desc;
  if (db.forma === 'Dinheiro' && db.recebido && num(db.recebido) < total) return avisar('O valor recebido é menor que o total');
  const troco = db.forma === 'Dinheiro' && num(db.recebido) > total ? num(db.recebido) - total : 0;
  const cupom = { n: db.proxNfce++, hora: hora(), itens: db.comanda.map((x) => ({ nome: prod(x.id).nome, q: qtdTxt(prod(x.id), x.qtd), v: x.qtd * prod(x.id).preco })), sub, desc, total, forma: db.forma, troco, cpf: db.cpf };
  db.comanda.forEach((x) => { const p = prod(x.id); p.tem = Math.max(0, Math.round((p.tem - x.qtd) * 1000) / 1000); p.vendidos30 += x.qtd; });
  const cli = db.clientes.find((c) => c.id === db.fiadoDe);
  if (db.forma === 'Fiado' && cli) { if (!cli.deve) cli.desde = 0; cli.deve += total; }
  const itens = db.comanda.map((x) => ({ nome: prod(x.id).nome, qtd: x.qtd, kg: !!prod(x.id).kg }));
  db.diario.push({ tipo: 'venda', hora: hora(), texto: textoItens(itens) + (cli && db.forma === 'Fiado' ? ` (fiado de ${cli.nome})` : ''), itens, forma: db.forma, valor: total, lucro, novo: true });
  db.comanda = []; db.fiadoDe = ''; db.forma = 'Pix'; db.desconto = 0; db.recebido = ''; db.cpf = ''; gravar();
  redesenhar(); mostrarCupom(cupom);
}
const num = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const subtotal = () => db.comanda.reduce((t, x) => t + x.qtd * prod(x.id).preco, 0);
let audio;
function bipe(ok = true) { if (!db.eu.som) return; try { audio ||= new AudioContext(); const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = ok ? 1650 : 320; g.gain.value = .06; o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + (ok ? .08 : .25)); } catch { /* sem som */ } }
function porNaComanda(p, qtd) {
  const x = db.comanda.find((i) => i.id === p.id), ja = x?.qtd || 0;
  if (p.tem <= 0 || ja + qtd > p.tem + 1e-9) { bipe(false); return avisar(p.tem <= 0 ? `${p.nome} está sem estoque` : `Só tem ${qtdTxt(p, p.tem)} de ${p.nome}`); }
  x ? (x.qtd = Math.round((x.qtd + qtd) * 1000) / 1000) : db.comanda.push({ id: p.id, qtd });
  bipe(); gravar(); redesenhar(); pag.querySelector('[data-busca]')?.focus();
}
// código lido: "3*789..." (quantidade), etiqueta da balança (2 + PLU de 4 + 0 + valor em centavos + dígito) ou código/nome do produto
function lerCodigo(texto, digitado = false) {
  const teste = location.hash === '#config' && pag.querySelector('[data-teste-leitor]');
  if (teste) { const p = db.produtos.find((x) => x.ean === String(texto).trim()); teste.textContent = p ? `Leitor funcionando: ${p.nome} (${texto})` : `Leitor funcionando. Código ${texto} não está cadastrado.`; bipe(!!p); return; }
  const m = String(texto).trim().match(/^(\d+(?:[.,]\d+)?)\s*[*x]\s*(.+)$/i), mult = m ? num(m[1]) : 1, cod = (m ? m[2] : String(texto)).trim();
  if (/^2\d{12}$/.test(cod)) {
    const p = db.produtos.find((x) => x.kg && x.plu === cod.slice(1, 5));
    if (!p) { bipe(false); return avisar('Etiqueta da balança sem produto cadastrado'); }
    const valor = Number(cod.slice(6, 12)) / 100; location.hash = '#vender';
    return porNaComanda(p, Math.round(valor / p.preco * 1000) / 1000);
  }
  const p = db.produtos.find((x) => x.ean && x.ean === cod) || (digitado && db.produtos.find((x) => norm(x.nome).includes(norm(cod))));
  if (!p) { bipe(false); return avisar(/^\d{6,}$/.test(cod) ? `Código ${cod} não cadastrado. Cadastre em Estoque › Novo produto.` : 'Produto não encontrado'); }
  if (location.hash !== '#vender') location.hash = '#vender';
  if (p.kg) return pedirPeso(p);
  porNaComanda(p, mult);
}
function pedirPeso(p) {
  janela(`<h2>${esc(p.nome)}</h2><p class="sub">${R(p.preco)} o quilo. Digite o peso da balança ou bipe a etiqueta dela.</p>
    <label class="campo">Peso em kg<input name="kg" inputmode="decimal" required placeholder="Ex.: 0,850"></label><p class="troco" data-peso-valor></p>`, (f) => {
    const kg = num(f.get('kg')); if (!(kg > 0)) return false;
    porNaComanda(p, Math.round(kg * 1000) / 1000);
  });
  const i = document.querySelector('.janela [name=kg]'), out = document.querySelector('[data-peso-valor]');
  i.addEventListener('input', () => { const kg = num(i.value); out.textContent = kg > 0 ? `Valor: ${R(kg * p.preco)}` : ''; });
}
function darDesconto() {
  const sub = subtotal();
  janela(`<h2>Desconto</h2><p class="sub">Subtotal de ${R(sub)}. Use reais ou porcentagem.</p><label class="campo">Em reais<input name="r" inputmode="decimal" value="${db.desconto ? String(db.desconto).replace('.', ',') : ''}"></label><label class="campo">Ou em %<input name="p" inputmode="decimal" placeholder="Ex.: 5"></label>`, (f) => {
    const p = num(f.get('p')), r = num(f.get('r')); db.desconto = Math.min(sub, p > 0 ? Math.round(sub * p) / 100 : r); gravar(); redesenhar();
  });
}
function mostrarCupom(c) {
  const f = document.createElement('div'); f.className = 'fundo';
  f.innerHTML = `<div class="janela cupom" role="dialog" aria-modal="true" aria-label="Cupom da venda"><div class="cupom-papel" id="cupom-papel"><b>MERCADO BOM PREÇO</b><small>CNPJ 12.345.678/0001-90 · Rua das Flores, 120</small><hr><small>NFC-e nº ${c.n} · série 1 · ${new Date().toLocaleDateString('pt-BR')} ${c.hora}</small><small>Caixa: ${esc(db.eu.nome)}</small><hr>
    ${c.itens.map((i) => `<div class="cl"><span>${esc(i.nome)}<small>${esc(String(i.q))}</small></span><span>${R(i.v)}</span></div>`).join('')}<hr>
    ${c.desc ? `<div class="cl"><span>Subtotal</span><span>${R(c.sub)}</span></div><div class="cl"><span>Desconto</span><span>− ${R(c.desc)}</span></div>` : ''}<div class="cl tot"><span>TOTAL</span><span>${R(c.total)}</span></div><div class="cl"><span>${esc(c.forma)}</span><span>${R(c.total + c.troco)}</span></div>${c.troco ? `<div class="cl"><span>Troco</span><span>${R(c.troco)}</span></div>` : ''}<hr>
    <small>${c.cpf ? `CPF do consumidor: ${esc(c.cpf)}` : 'Consumidor não identificado'}</small><small>Autorizada (demonstração). Na versão contratada a NFC-e sai pela SEFAZ do seu estado, com QR Code de consulta.</small></div>
    <div class="acoes"><button type="button" class="btn" data-imprimir>Imprimir cupom</button><button type="button" class="btn pri" data-x>Próxima venda</button></div></div>`;
  document.body.append(f); f.querySelector('[data-x]').focus();
  if (db.eu.imprimir) setTimeout(print, 200);
  const fechar = () => { f.remove(); pag.querySelector('[data-busca]')?.focus(); };
  f.addEventListener('click', (e) => { if (e.target === f || e.target.closest('[data-x]')) fechar(); if (e.target.closest('[data-imprimir]')) print(); });
  f.addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); fechar(); } });
  avisar(`Venda fechada: ${R(c.total)}${c.troco ? ` · troco ${R(c.troco)}` : ''}`);
}
function editarProduto(p) {
  const novo = !p; p ||= { nome: '', cat: 'Mercearia', custo: '', preco: '', tem: 0, minimo: 10, ean: '', kg: false, plu: '' };
  janela(`<h2>${novo ? 'Novo produto' : 'Editar produto'}</h2>
    <label class="campo">Código de barras<input name="ean" inputmode="numeric" value="${esc(p.ean || '')}" placeholder="Bipe o produto aqui"></label>
    <label class="campo">Nome<input name="nome" required value="${esc(p.nome)}"></label>
    <label class="campo">Categoria<select name="cat">${Object.keys(CORES).map((c) => `<option ${c === p.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <div class="dupla"><label class="campo">Custo<input name="custo" inputmode="decimal" value="${p.custo === '' ? '' : String(p.custo).replace('.', ',')}" required></label><label class="campo">Preço de venda<input name="preco" inputmode="decimal" value="${p.preco === '' ? '' : String(p.preco).replace('.', ',')}" required></label></div>
    <div class="dupla"><label class="campo">Estoque${novo ? ' inicial' : ''}<input name="tem" inputmode="decimal" value="${String(p.tem).replace('.', ',')}"></label><label class="campo">Avisar quando chegar a<input name="minimo" inputmode="decimal" value="${String(p.minimo).replace('.', ',')}"></label></div>
    <label class="campo check"><input type="checkbox" name="kg" ${p.kg ? 'checked' : ''}> Vendido por peso (preço por kg)</label>
    <label class="campo">Código na balança (PLU)<input name="plu" inputmode="numeric" maxlength="4" value="${esc(p.plu || '')}" placeholder="4 números, só para produto por peso"></label><p class="sub" data-margem></p>`, (f) => {
    const dados = { nome: String(f.get('nome')).trim(), cat: f.get('cat'), custo: num(f.get('custo')), preco: num(f.get('preco')), tem: num(f.get('tem')), minimo: num(f.get('minimo')), ean: String(f.get('ean')).replace(/\D/g, ''), kg: !!f.get('kg'), plu: String(f.get('plu')).replace(/\D/g, '').padStart(4, '0') };
    if (!dados.nome || !(dados.preco > 0)) { avisar('Coloque o nome e o preço'); return false; }
    if (dados.ean && db.produtos.some((x) => x !== p && x.ean === dados.ean)) { avisar('Esse código já está em outro produto'); return false; }
    if (!dados.kg) dados.plu = '';
    if (novo) db.produtos.unshift({ id: `p${Date.now()}`, vendidos30: 0, ...dados }); else Object.assign(p, dados);
    gravar(); avisar(novo ? 'Produto cadastrado' : 'Produto salvo'); redesenhar();
  });
  const fm = document.querySelector('.janela'), mg = fm.querySelector('[data-margem]');
  const calc = () => { const c = num(fm.querySelector('[name=custo]').value), v = num(fm.querySelector('[name=preco]').value); mg.textContent = c > 0 && v > 0 ? `Lucro de ${R(v - c)} por ${fm.querySelector('[name=kg]').checked ? 'kg' : 'unidade'} (margem de ${Math.round((v - c) / v * 100)}%).` : ''; };
  fm.addEventListener('input', calc); calc();
  // o leitor digita no campo e aperta Enter: segura o Enter para não salvar antes de preencher o resto
  fm.querySelector('[name=ean]').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fm.querySelector('[name=nome]').focus(); } });
}
function movimentoCaixa(tipo) {
  janela(`<h2>${tipo === 'sangria' ? 'Sangria' : 'Suprimento'}</h2><p class="sub">${tipo === 'sangria' ? 'Tirar dinheiro da gaveta (ex.: levar ao cofre ou ao banco).' : 'Pôr dinheiro na gaveta (ex.: troco que chegou).'} Na gaveta agora: ${R(gaveta())}.</p>
    <label class="campo">Valor<input name="v" inputmode="decimal" required></label><label class="campo">Motivo<input name="t" placeholder="${tipo === 'sangria' ? 'Ex.: depósito no banco' : 'Ex.: troco do cofre'}"></label>`, (f) => {
    const v = num(f.get('v')); if (!(v > 0)) return false;
    if (tipo === 'sangria' && v > gaveta()) { avisar('Não tem tudo isso na gaveta'); return false; }
    db.diario.push({ tipo, hora: hora(), texto: `${tipo === 'sangria' ? 'Sangria' : 'Suprimento'}${f.get('t') ? `: ${f.get('t')}` : ''}`, valor: v, novo: true }); gravar(); avisar(`${tipo === 'sangria' ? 'Sangria' : 'Suprimento'} de ${R(v)} registrado`); redesenhar();
  });
}
function fecharCaixa() {
  const esperado = gaveta();
  janela(`<h2>Fechar o caixa</h2><p class="sub">Conte o dinheiro da gaveta e digite abaixo. O sistema compara com o que deveria ter.</p>
    <ul class="lista">${porForma().map(([f, v]) => `<li><span>Vendas no ${f.toLowerCase()}</span><span class="v">${R(v)}</span></li>`).join('')}<li><span><b>Deveria ter na gaveta</b><small>abertura ${R(db.caixaInicial)} + dinheiro + suprimentos − sangrias e despesas</small></span><span class="v">${R(esperado)}</span></li></ul>
    <label class="campo">Quanto tem na gaveta (contado)<input name="c" inputmode="decimal" required></label><p class="troco" data-dif></p>`, (f) => {
    const c = num(f.get('c')), dif = c - esperado;
    db.diario.push({ tipo: 'fechamento', hora: hora(), texto: `Caixa fechado: contado ${R(c)}, ${Math.abs(dif) < 0.01 ? 'sem diferença' : dif > 0 ? `sobrou ${R(dif)}` : `faltou ${R(-dif)}`}`, valor: 0, novo: true });
    db.caixaInicial = c; gravar(); avisar(Math.abs(dif) < 0.01 ? 'Caixa fechado, sem diferença' : `Caixa fechado com diferença de ${R(dif)}`); redesenhar();
  });
  const i = document.querySelector('.janela [name=c]'), o = document.querySelector('[data-dif]');
  i.addEventListener('input', () => { const d = num(i.value) - esperado; o.textContent = i.value ? (Math.abs(d) < 0.01 ? 'Bateu certinho.' : d > 0 ? `Sobrando ${R(d)}` : `Faltando ${R(-d)}`) : ''; });
}
// câmera do celular: lê o código de barras com o leitor do navegador (Chrome no Android e no computador)
async function camera() {
  if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) return avisar('O scanner pela câmera funciona no Chrome do Android. No computador, use um leitor USB: é só bipar.');
  const f = document.createElement('div'); f.className = 'fundo';
  f.innerHTML = '<div class="janela camera-caixa"><h2>Scanner: aponte a câmera para o código de barras</h2><video playsinline muted></video><div class="acoes"><button type="button" class="btn" data-x>Fechar</button></div></div>';
  document.body.append(f);
  let stream, ligado = true;
  const fechar = () => { ligado = false; stream?.getTracks().forEach((t) => t.stop()); f.remove(); };
  f.addEventListener('click', (e) => { if (e.target === f || e.target.closest('[data-x]')) fechar(); });
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const v = f.querySelector('video'); v.srcObject = stream; await v.play();
    const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'code_128'] });
    const ler = async () => { if (!ligado) return; try { const r = await det.detect(v); if (r[0]) { fechar(); lerCodigo(r[0].rawValue); return; } } catch { /* tenta de novo */ } requestAnimationFrame(ler); };
    ler();
  } catch { fechar(); avisar('Não foi possível abrir a câmera. Libere o acesso nas permissões do navegador.'); }
}
// leitor USB: digita muito rápido e termina com Enter. Funciona em qualquer tela, sem precisar clicar na busca.
let buf = '', ultimo = 0;
addEventListener('keydown', (e) => {
  if (document.querySelector('.fundo')) return;
  if (e.key === 'F2') { e.preventDefault(); if (location.hash !== '#vender') location.hash = '#vender'; setTimeout(() => pag.querySelector('[data-busca]')?.focus(), 30); return; }
  if (e.key === 'F9' && location.hash === '#vender') { e.preventDefault(); fecharVenda(); return; }
  if (e.target.closest?.('input, select, textarea')) return;
  const agora = performance.now();
  if (e.key === 'Enter') { if (buf.length >= 6 && /^[\d*]+$/.test(buf)) { e.preventDefault(); lerCodigo(buf); } buf = ''; return; }
  if (e.key.length === 1) { buf = agora - ultimo > 60 ? e.key : buf + e.key; ultimo = agora; }
});
function ia() { location.hash = '#ia'; }
function respostaIA(p) {
  const q = norm(p), ac = acabando(), par = parados(), dev = [...db.clientes].filter((c) => c.deve).sort((a, b) => b.desde - a.desde);
  if (/compr|repor|acab|falta/.test(q)) return ac.length ? `Para esta semana, repor:\n${ac.slice(0, 6).map((x) => `• ${x.nome}: tem ${qtdTxt(x, x.tem)}, vende uns ${qtdTxt(x, Math.round(x.vendidos30 / 4))} por semana`).join('\n')}\n\nCompre o suficiente para 2 semanas: menos dinheiro parado na prateleira.` : 'Nada abaixo do mínimo. Bom momento para negociar preço com o fornecedor.';
  if (/fiado|cobr|deve/.test(q)) return dev.length ? `Cobre primeiro quem deve há mais tempo:\n${dev.slice(0, 4).map((c) => `• ${c.nome}: ${R(c.deve)} há ${c.desde} dias`).join('\n')}\n\nNa divisória Fiado tem o botão para cobrar no WhatsApp.` : 'Ninguém devendo no fiado.';
  if (/dia|hoje|vend/.test(q)) return `Hoje: ${R(vendidoHoje())} em ${vendasHoje().length} vendas, lucro de ${R(lucroHoje())}. Na gaveta: ${R(gaveta())}. O que mais saiu: ${Object.values(vendasHoje().flatMap((x) => x.itens || []).reduce((m, i) => { (m[i.nome] ||= { n: i.nome, q: 0 }).q += i.qtd; return m; }, {})).sort((a, b) => b.q - a.q).slice(0, 3).map((x) => x.n).join(', ') || 'ainda nada'}.`;
  if (/parad|encalh|promo/.test(q)) return par.length ? `Parados há 30 dias: ${par.map((x) => x.nome).join(', ')}.\n\nAviso pronto para o WhatsApp:\n"Promoção no Mercado Bom Preço: ${par[0].nome} com 15% de desconto só esta semana!"` : 'Nenhum produto parado. Tudo girando.';
  return `Resumo: vendeu ${R(vendidoHoje())} hoje, ${ac.length} produtos acabando e ${R(fiadoTotal())} no fiado.`;
}
document.getElementById('abrir-ia')?.addEventListener('click', ia);
// assinatura vencida: trava o caixa (os dados ficam guardados) até pagar
function travar(tela) {
  document.querySelector('.trava')?.remove();
  if (db.assinatura.status !== 'vencida' || tela === 'assinatura') return;
  const t = document.createElement('div'); t.className = 'fundo trava';
  t.innerHTML = `<div class="janela" role="alertdialog" aria-modal="true" aria-labelledby="trava-t"><h2 id="trava-t">Sua assinatura venceu</h2><p class="sub">O pagamento não foi aprovado pelo banco. Seus produtos, vendas e fiado estão guardados: renove para o caixa voltar a funcionar.</p>
    <div class="botoes" style="flex-direction:column"><button type="button" class="btn pri grande" data-pagar-ass>Pagar aqui no app</button><a class="btn grande" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a><a class="btn" href="#assinatura">Ver minha assinatura</a></div></div>`;
  document.body.append(t);
}
function pagarAqui() {
  const preco = db.plano === 'pro' ? 119 : 59, f = document.createElement('div'); f.className = 'fundo';
  f.innerHTML = `<div class="janela" role="dialog" aria-modal="true"><h2>Pagar ${R(preco)}</h2><p class="sub">PIX libera na hora. No cartão abre o pagamento seguro do Mercado Pago.</p>
    <div class="pix-falso" aria-hidden="true"></div><label class="campo">PIX copia e cola<input readonly value="00020126580014BR.GOV.BCB.PIX0136mercado-${Date.now().toString(16)}520400005303986540${preco}.005802BR"></label>
    <div class="botoes"><button type="button" class="btn" data-copiar>Copiar código</button><a class="btn" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Pagar com cartão</a></div>
    <div class="acoes"><button type="button" class="btn" data-x>Voltar</button><button type="button" class="btn pri" data-pago>Simular pagamento aprovado</button></div></div>`;
  document.body.append(f);
  f.addEventListener('click', (e) => {
    if (e.target === f || e.target.closest('[data-x]')) f.remove();
    if (e.target.closest('[data-copiar]')) { navigator.clipboard?.writeText(f.querySelector('input').value).catch(() => {}); avisar('Código PIX copiado'); }
    if (e.target.closest('[data-pago]')) { const a = db.assinatura; a.status = 'ativa'; a.renova = true; a.proxima = 30; a.pagamentos.push({ dia: 0, ok: true }); gravar(); f.remove(); redesenhar(); avisar('Pagamento aprovado. O caixa voltou.'); }
  });
}
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data?.simular) return;
  const a = db.assinatura;
  if (e.data.simular === 'cancelar') { a.renova = false; a.status = 'ativa'; }
  if (e.data.simular === 'recusado') { a.status = 'vencida'; a.renova = true; a.proxima = 0; a.pagamentos.push({ dia: 0, ok: false }); }
  if (e.data.simular === 'normal') db.assinatura = assinaturaPadrao();
  gravar(); redesenhar();
});
document.addEventListener('click', (e) => {
  const t = e.target.closest('button, a'); if (!t) return;
  const d = t.dataset;
  if ('pagarAss' in d) pagarAqui();
  else if ('cancelarAss' in d) { if (confirm(`Cancelar? Nada mais é cobrado e você usa até ${dataCurta(db.assinatura.proxima)}.`)) { db.assinatura.renova = false; gravar(); redesenhar(); avisar('Assinatura cancelada'); } }
  else if ('reativar' in d) { db.assinatura.renova = true; gravar(); redesenhar(); avisar('Assinatura reativada'); }
  else if ('sug' in d) { pag.querySelector('[data-pergunta]').value = d.sug; pag.querySelector('[data-perguntar]').click(); }
  else if ('perguntar' in d) { const p = pag.querySelector('[data-pergunta]').value.trim(); if (p.length < 3) return; const r = pag.querySelector('[data-resposta]'); r.hidden = false; r.textContent = 'Pensando…'; if (window.veltriaIA) window.veltriaIA(p).then((t) => { r.textContent = t; }); else setTimeout(() => { r.textContent = `${respostaIA(p)}\n\n(Resposta de exemplo da demonstração.)`; }, 700); }
  else if ('convidar' in d) { janela('<h2>Pôr alguém na equipe</h2><label class="campo">Nome<input name="n" required></label><label class="campo">Cargo<select name="c"><option>Caixa</option><option>Repositor</option><option>Gerente</option></select></label><p class="sub">A pessoa recebe um convite no WhatsApp para entrar pelo celular dela.</p>', (f) => { const c = f.get('c'); db.equipe.push({ id: `q${Date.now()}`, nome: f.get('n'), cargo: c, ve: { vender: c !== 'Repositor', estoque: c !== 'Caixa', dinheiro: c === 'Gerente', fiado: c !== 'Repositor' } }); gravar(); avisar('Convite mandado'); redesenhar(); }); }
  else if (d.tirar) { db.equipe = db.equipe.filter((p) => p.id !== d.tirar); gravar(); redesenhar(); avisar('Pessoa tirada da equipe'); }
  else if (d.plano) { if (d.plano === 'basico' && db.equipe.length > 5) return avisar('Para o Básico, deixe no máximo 5 pessoas.'); db.plano = d.plano; gravar(); redesenhar(); }
});
document.addEventListener('change', (e) => { const v = e.target.dataset?.ve; if (v) { const [id, k] = v.split(':'); db.equipe.find((p) => p.id === id).ve[k] = e.target.checked; gravar(); avisar('Permissão salva'); } });
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches?.('[data-pergunta]')) { e.preventDefault(); pag.querySelector('[data-perguntar]').click(); } });
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
  ['novo produto cadastrar codigo barras', 'Cadastrar produto', () => { location.hash = '#estoque'; setTimeout(() => editarProduto(null), 60); }],
  ['fechar caixa fechamento conferir gaveta', 'Fechar o caixa', () => { location.hash = '#dinheiro'; setTimeout(fecharCaixa, 60); }],
  ['sangria retirar tirar dinheiro cofre', 'Fazer sangria', () => { location.hash = '#dinheiro'; setTimeout(() => movimentoCaixa('sangria'), 60); }],
  ['ia assistente perguntar ajuda', 'Perguntar ao assistente', () => ia()],
  ['assinatura plano pagar cobranca cancelar', 'Minha assinatura', () => (location.hash = '#assinatura')],
  ['dono equipe funcionario cargo permissao plano convidar', 'Painel do dono', () => (location.hash = '#dono')],
  ['configuracoes config meu nome letra som bipe imprimir ajustes', 'Minhas configurações', () => (location.hash = '#config')],
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
if (window !== window.top) document.documentElement.classList.add('no-celular');
if ('serviceWorker' in navigator && window === window.top) navigator.serviceWorker.register('sw.js').catch(() => {});
