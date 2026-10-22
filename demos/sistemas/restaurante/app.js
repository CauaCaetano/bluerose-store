// Veltria Restaurante · mesas, comandas, delivery, cozinha e cardápio (referências: Saipos, Consumer, Goomer)
import {
  criarApp, esc, moeda, moedaC, num, pct, hoje, diaMais, mesMais, nomeMes, dataCurta, dataBR, relativo, diasAte, paraData, minutos, hhmm,
  sorteio, soma, agrupar, av, ic, et, kpis, barras, rosca, barrasH, kanban, DIAS, telLink, normal,
  modal, confirmar, avisar, editar, excluir, ficha, props, linhaDoTempo, vazio, imprimir,
} from '../base/nexo.js';
import { LADOS as FERR, ITENS as FERR_ITENS } from './ferramentas.js';
import { acoesLado, ferramentaPaginas, travarPro } from '../base/lado.js';
import { qrSVG } from '../base/qr.js';

const CATS = [['entradas', 'Entradas'], ['pratos', 'Pratos principais'], ['pizzas', 'Pizzas'], ['massas', 'Massas'], ['lanches', 'Lanches'], ['porcoes', 'Porções'], ['sobremesas', 'Sobremesas'], ['cafes', 'Cafés'], ['bebidas', 'Bebidas'], ['drinks', 'Drinks']];
const nomeCat = (k) => (CATS.find((c) => c[0] === k) || [, k])[1];
const ETAPAS = [['novo', 'Novo', '#3b82f6'], ['preparo', 'Em preparo', '#f59e0b'], ['pronto', 'Pronto', '#16a34a'], ['rota', 'Saiu para entrega', '#a855f7'], ['entregue', 'Entregue', '#64748b']];
const CANAIS = { salao: ['Salão', '#0ea5e9'], balcao: ['Balcão', '#64748b'], delivery: ['Delivery próprio', '#e11d48'], ifood: ['iFood', '#ea1d2c'], whatsapp: ['WhatsApp', '#16a34a'], site: ['Pedido online', '#7c3aed'] };
const FORMAS = ['PIX', 'Crédito', 'Débito', 'Dinheiro', 'Vale-refeição', 'Pago no app'];
const SERVICO = 0.1;

// ---------------------------------------------------------------- dados de exemplo (fictícios)
function semente() {
  const r = sorteio(20261103), esc1 = (l) => l[Math.floor(r() * l.length)], ent = (a, b) => a + Math.floor(r() * (b - a + 1));
  const insumos = [['Filé mignon', 'kg', 89.9, 6.2, 4], ['Frango (peito)', 'kg', 22.9, 9, 5], ['Salmão', 'kg', 98, 2.1, 3], ['Arroz arbóreo', 'kg', 32, 7, 3], ['Massa fresca', 'kg', 28, 5.5, 4], ['Queijo parmesão', 'kg', 89, 1.2, 1.5], ['Muçarela', 'kg', 42, 6, 3], ['Tomate', 'kg', 7.9, 12, 6], ['Batata', 'kg', 5.5, 25, 10], ['Pão brioche', 'un', 2.8, 60, 40], ['Carne moída (blend)', 'kg', 46, 8, 5], ['Creme de leite', 'L', 18, 6, 4], ['Chocolate 70%', 'kg', 75, 1.8, 1], ['Limão', 'kg', 6.9, 4, 3], ['Cerveja long neck', 'un', 4.9, 96, 48], ['Refrigerante lata', 'un', 2.9, 70, 48], ['Gin', 'L', 95, 2.5, 2]]
    .map(([nome, un, custo, estoque, minimo], i) => ({ id: `in${i}`, nome, un, custo, estoque, minimo }));
  const cardapio = [
    ['Bruschetta de tomate e manjericão', 'entradas', 32, [['in7', 0.12], ['in9', 1]]], ['Batata rústica com páprica', 'entradas', 29, [['in8', 0.35]]], ['Dadinho de tapioca', 'entradas', 34, [['in6', 0.08]]],
    ['Filé ao molho de mostarda com risoto', 'pratos', 89, [['in0', 0.22], ['in3', 0.1], ['in5', 0.02], ['in11', 0.05]]], ['Salmão grelhado com legumes', 'pratos', 84, [['in2', 0.2], ['in13', 0.03]]], ['Frango à parmegiana', 'pratos', 62, [['in1', 0.25], ['in6', 0.08], ['in7', 0.1]]], ['Risoto de parmesão', 'pratos', 58, [['in3', 0.12], ['in5', 0.04], ['in11', 0.05]]],
    ['Fettuccine ao funghi', 'massas', 64, [['in4', 0.18], ['in11', 0.08], ['in5', 0.02]]], ['Talharim à bolonhesa', 'massas', 56, [['in4', 0.18], ['in10', 0.12], ['in7', 0.12]]],
    ['Burger da casa (180 g)', 'lanches', 42, [['in10', 0.18], ['in9', 1], ['in6', 0.03]]], ['Burger duplo com cheddar', 'lanches', 52, [['in10', 0.36], ['in9', 1], ['in6', 0.05]]],
    ['Petit gâteau', 'sobremesas', 32, [['in12', 0.06], ['in11', 0.03]]], ['Pudim de leite', 'sobremesas', 22, []],
    ['Refrigerante lata', 'bebidas', 8, [['in15', 1]]], ['Suco natural', 'bebidas', 12, [['in13', 0.1]]], ['Cerveja long neck', 'bebidas', 14, [['in14', 1]]], ['Água mineral', 'bebidas', 6, []],
    ['Gin tônica', 'drinks', 34, [['in16', 0.06], ['in13', 0.02]]], ['Caipirinha de limão', 'drinks', 26, [['in13', 0.08]]]]
    .map(([nome, cat, preco, ficha_t], i) => ({ id: `it${i}`, nome, cat, preco, ficha: ficha_t.map(([insumo, qtd]) => ({ insumo, qtd })), ativo: true, tempo: ['entradas', 'bebidas', 'drinks'].includes(cat) ? 8 : cat === 'sobremesas' ? 10 : 22 }));
  const mesas = Array.from({ length: 16 }, (_, i) => ({ id: `m${i + 1}`, numero: i + 1, lugares: i < 4 ? 2 : i < 12 ? 4 : 6, area: i < 12 ? 'Salão' : 'Varanda' }));
  const garcons = ['Lucas', 'Renata', 'Diego', 'Paula'];
  const clientesN = ['Ana Paula Moura', 'Ricardo Neves', 'Fernanda Castro', 'Thiago Alves', 'Juliana Prado', 'Marcelo Dias', 'Camila Rezende', 'Pedro Henrique Sá', 'Larissa Gomes', 'Rafael Teixeira', 'Beatriz Lopes', 'Gustavo Farias'];
  const clientes = clientesN.map((nome, i) => ({ id: `cl${i}`, nome, telefone: `(21) 9${ent(7000, 9899)}-${ent(1000, 9999)}`, endereco: `${esc1(['Rua Voluntários da Pátria', 'Rua São Clemente', 'Rua Real Grandeza', 'Rua Humaitá', 'Rua Sorocaba'])}, ${ent(10, 480)} · Botafogo`, pedidos: 0 }));
  const pedido = (canal, data, hora, status) => {
    const n = canal === 'salao' ? ent(2, 6) : ent(1, 4), itens = [];
    for (let k = 0; k < n; k++) { const it = esc1(cardapio); const ex = itens.find((x) => x.item === it.id); if (ex) ex.qtd++; else itens.push({ item: it.id, nome: it.nome, qtd: 1, preco: it.preco, obs: r() < 0.1 ? esc1(['sem cebola', 'ponto da carne: mal passado', 'sem gelo', 'molho à parte']) : '' }); }
    return { canal, data, hora, status, itens };
  };
  const pedidos = [];
  for (let d = -45; d <= 0; d++) {
    const data = diaMais(d), dow = paraData(data).getDay(); if (dow === 1) continue; // fecha segunda
    const mov = [0.9, 0, 0.55, 0.6, 0.7, 1, 1.15][dow];
    const total = Math.round((d === 0 ? 0.6 : 1) * mov * ent(34, 46));
    for (let k = 0; k < total; k++) {
      const canal = esc1(['salao', 'salao', 'salao', 'salao', 'balcao', 'delivery', 'ifood', 'ifood', 'whatsapp']), almoco = r() < 0.45;
      const hora = hhmm((almoco ? 11.5 : 18.5) * 60 + ent(0, almoco ? 180 : 240));
      if (d === 0 && minutos(hora) > minutos(new Date().toTimeString().slice(0, 5)) + 60) continue;
      const p = pedido(canal, data, hora, 'entregue');
      p.id = `pd${pedidos.length}`; p.numero = 0;
      if (canal === 'salao') { p.mesa = `m${ent(1, 16)}`; p.garcom = esc1(garcons); p.pessoas = ent(1, 6); p.servico = true; }
      if (['delivery', 'whatsapp', 'ifood'].includes(canal)) { const c = esc1(clientes); p.cliente = c.id; p.taxa = canal === 'ifood' ? 0 : 7; c.pedidos++; }
      p.forma = canal === 'ifood' ? 'Pago no app' : esc1(FORMAS.slice(0, 5)); p.pago = true;
      pedidos.push(p);
    }
  }
  // agora: mesas abertas e pedidos em andamento
  const agoraM = minutos(new Date().toTimeString().slice(0, 5));
  ['m2', 'm5', 'm6', 'm9', 'm13', 'm14'].forEach((m, k) => { const p = pedido('salao', hoje(), hhmm(Math.max(11 * 60, agoraM - ent(10, 70))), 'aberta'); Object.assign(p, { id: `pd${pedidos.length}`, mesa: m, garcom: garcons[k % 4], pessoas: ent(2, 5), servico: true, pago: false, status: 'aberta', cozinha: k % 3 === 0 ? 'pendente' : 'pronto', enviado: hhmm(Math.max(11 * 60, agoraM - ent(4, 14))) }); pedidos.push(p); });
  [['delivery', 'novo'], ['ifood', 'novo'], ['ifood', 'preparo'], ['whatsapp', 'preparo'], ['delivery', 'pronto'], ['ifood', 'rota'], ['balcao', 'preparo']].forEach(([canal, etapa]) => { const p = pedido(canal, hoje(), hhmm(Math.max(11 * 60, agoraM - (etapa === 'novo' ? ent(1, 4) : etapa === 'preparo' ? ent(6, 16) : ent(18, 30)))), etapa); const c = esc1(clientes); Object.assign(p, { id: `pd${pedidos.length}`, etapa, cliente: canal === 'balcao' ? null : c.id, taxa: canal === 'delivery' || canal === 'whatsapp' ? 7 : 0, forma: canal === 'ifood' ? 'Pago no app' : esc1(['PIX', 'Crédito', 'Dinheiro']), pago: canal === 'ifood' }); pedidos.push(p); });
  pedidos.sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora)).forEach((p, k) => { p.numero = 1000 + k; });
  return { _cfg: { empresa: 'Bistrô Alecrim', endereco: 'Rua Voluntários da Pátria, 214 · Botafogo · Rio de Janeiro/RJ', cnpj: '37.441.920/0001-55', telefone: '(21) 2537-1188' }, cardapio, insumos, mesas, clientes, pedidos };
}

// ---------------------------------------------------------------- regras
const peds = (a) => a.db.lista('pedidos');
const item = (a, id) => a.db.obter('cardapio', id);
const insumo = (a, id) => a.db.obter('insumos', id);
const cli = (a, id) => a.db.obter('clientes', id);
const subtotal = (p) => soma(p.itens, (i) => i.qtd * i.preco);
const totalP = (p) => subtotal(p) * (p.servico ? 1 + SERVICO : 1) + (p.taxa || 0) - (p.desconto || 0);
const custoItem = (a, it) => soma(it.ficha || [], (f) => (insumo(a, f.insumo)?.custo || 0) * f.qtd);
const cmv = (a, it) => (it.preco ? (custoItem(a, it) / it.preco) * 100 : 0);
const fechados = (a, f = () => true) => peds(a).filter((p) => p.pago && f(p));
const mesaAberta = (a, mid) => peds(a).find((p) => p.mesa === mid && p.status === 'aberta');
const minDesde = (p) => Math.max(0, minutos(new Date().toTimeString().slice(0, 5)) - minutos(p.status === 'aberta' && p.enviado ? p.enviado : p.hora));
const emCurso = (p) => p.etapa && p.etapa !== 'entregue';

const colecoes = {
  cardapio: { singular: 'item do cardápio', plural: 'itens', campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'cat', rotulo: 'Categoria', tipo: 'selecao', opcoes: CATS, obrigatorio: true }, { nome: 'preco', rotulo: 'Preço de venda', tipo: 'moeda', obrigatorio: true }, { nome: 'tempo', rotulo: 'Tempo de preparo (min)', tipo: 'numero', padrao: 15 }],
    antesDeSalvar: (d, a, antes) => ({ ...d, ficha: antes?.ficha || [], ativo: antes ? antes.ativo : true }) },
  insumos: { singular: 'insumo', plural: 'insumos', campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true }, { nome: 'un', rotulo: 'Unidade', tipo: 'selecao', opcoes: ['kg', 'L', 'un'], padrao: 'kg' }, { nome: 'custo', rotulo: 'Custo por unidade', tipo: 'moeda', obrigatorio: true }, { nome: 'estoque', rotulo: 'Estoque atual', tipo: 'numero', padrao: 0 }, { nome: 'minimo', rotulo: 'Estoque mínimo', tipo: 'numero', padrao: 1 }] },
  clientes: { singular: 'cliente', plural: 'clientes', campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel', obrigatorio: true }, { nome: 'endereco', rotulo: 'Endereço de entrega', tipo: 'texto', largo: true }], antesDeSalvar: (d, a, antes) => ({ ...d, pedidos: antes?.pedidos || 0 }) },
};

// ---------------------------------------------------------------- páginas
function painel(a) {
  const hj = fechados(a, (p) => p.data === hoje()), ym = hoje().slice(0, 7), mes = fechados(a, (p) => p.data.startsWith(ym));
  const dias = Array.from({ length: 30 }, (_, i) => diaMais(i - 29));
  const abertas = peds(a).filter((p) => p.status === 'aberta'), curso = peds(a).filter(emCurso);
  const baixos = a.db.lista('insumos').filter((x) => x.estoque <= x.minimo);
  const top = Object.entries(agrupar(mes.flatMap((p) => p.itens), (i) => i.item)).map(([k, l]) => ({ rot: item(a, k)?.nome || '—', v: soma(l, (i) => i.qtd), extra: moedaC(soma(l, (i) => i.qtd * i.preco)) })).sort((x, y) => y.v - x.v).slice(0, 7);
  return `${kpis([{ rot: 'Vendido hoje', icone: 'cash-register', val: moeda(soma(hj, totalP)), nota: `${hj.length} pedidos · ${abertas.length} mesas abertas (${moedaC(soma(abertas, totalP))})` },
    { rot: `Faturamento de ${nomeMes(ym)}`, icone: 'coins', val: moeda(soma(mes, totalP)), spark: dias.map((d) => soma(fechados(a, (p) => p.data === d), totalP)) },
    { rot: 'Ticket médio', icone: 'receipt', val: moeda(soma(mes, totalP) / (mes.length || 1)), nota: `salão ${moeda(soma(mes.filter((p) => p.canal === 'salao'), totalP) / (mes.filter((p) => p.canal === 'salao').length || 1))}` },
    { rot: 'CMV do cardápio', icone: 'chart-pie-slice', val: pct(soma(a.db.lista('cardapio'), (it) => cmv(a, it)) / (a.db.lista('cardapio').filter((it) => it.ficha.length).length || 1), 1), nota: 'custo da mercadoria sobre o preço' }])}
    <div class="grade g21"><div class="cartao"><div class="cartao-cab"><div><h3>Vendas por canal</h3><div class="sub">Últimos 30 dias</div></div></div><div class="cartao-corpo">${barras({ dados: dias.map((d) => ({ rot: Number(d.slice(8)), v: Object.keys(CANAIS).map((c) => soma(fechados(a, (p) => p.data === d && p.canal === c), totalP)) })), series: Object.values(CANAIS).map(([n, c]) => ({ nome: n, cor: c })), empilhado: true, fmt: moedaC, altura: 220 })}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Agora</h3></div><a class="btn peq" href="#/cozinha">Cozinha</a></div><ul class="lista">
        <li class="clicavel" data-acao="ir" data-h="#/mesas">${ic('chair')}<div class="cresce t">Mesas abertas</div><b>${abertas.length} de ${a.db.lista('mesas').length}</b></li>
        <li class="clicavel" data-acao="ir" data-h="#/delivery">${ic('motorcycle')}<div class="cresce t">Pedidos de delivery em andamento</div><b>${curso.filter((p) => p.canal !== 'balcao').length}</b></li>
        <li class="clicavel" data-acao="ir" data-h="#/cozinha">${ic('cooking-pot')}<div class="cresce t">Na cozinha</div><b>${curso.filter((p) => ['novo', 'preparo'].includes(p.etapa)).length + abertas.filter((p) => p.cozinha === 'pendente').length}</b></li>
        <li class="clicavel" data-acao="ir" data-h="#/estoque">${ic('package')}<div class="cresce t">Insumos para comprar</div><b class="${baixos.length ? 'er-tx' : ''}">${baixos.length}</b></li></ul></div></div>
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Mais vendidos do mês</h3></div><a class="btn peq" href="#/cardapio">Cardápio</a></div><div class="cartao-corpo">${barrasH(top)}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Movimento por horário</h3><div class="sub">Pedidos dos últimos 30 dias</div></div></div><div class="cartao-corpo">${barras({ dados: Array.from({ length: 13 }, (_, i) => i + 11).map((h) => ({ rot: `${h}h`, v: [fechados(a, (p) => diasAte(p.data) > -30 && Number(p.hora.slice(0, 2)) === h).length] })), series: [{ nome: 'Pedidos', cor: 'var(--acc)' }], altura: 200 })}</div></div></div>`;
}

function mesas(a) {
  const ms = a.db.lista('mesas');
  return `<div class="entre"><span class="mute" style="font-size:12.5px">${ms.filter((m) => mesaAberta(a, m.id)).length} ocupadas · ${ms.filter((m) => !mesaAberta(a, m.id)).length} livres · clique numa mesa para abrir ou ver a comanda</span><div class="flex"><button type="button" class="btn" data-acao="qrMesas">${ic('qr-code')}QR codes das mesas</button><button type="button" class="btn" data-acao="novoBalcao">${ic('storefront')}Pedido no balcão</button></div></div>
    ${['Salão', 'Varanda'].map((area) => `<div class="cartao"><div class="cartao-cab"><h3>${area}</h3></div><div class="cartao-corpo" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">${ms.filter((m) => m.area === area).map((m) => { const p = mesaAberta(a, m.id), t = p ? minDesde(p) : 0; return `<button type="button" class="mesa-bt" data-acao="abrirMesa" data-id="${m.id}" style="text-align:left;padding:12px;border-radius:10px;border:1px solid ${p ? 'color-mix(in srgb,var(--acc) 45%,var(--borda))' : 'var(--borda)'};background:${p ? 'var(--acc-suave)' : 'var(--painel)'};cursor:pointer;min-height:92px;display:flex;flex-direction:column;gap:4px">
      <span class="entre"><b style="font-size:17px">Mesa ${m.numero}</b><span class="mute" style="font-size:11.5px">${m.lugares} lug.</span></span>${p ? `<span class="num" style="font-weight:600">${moeda(totalP(p))}</span><span class="mute" style="font-size:12px">${p.pessoas} pessoas · ${p.garcom} · <span class="${t > 90 ? 'al-tx' : ''}">${t} min</span></span>` : '<span class="ok-tx" style="font-size:12.5px">Livre</span>'}</button>`; }).join('')}</div></div>`).join('')}`;
}

function cozinha(a) {
  const fila = peds(a).filter((p) => (p.status === 'aberta' && p.cozinha === 'pendente') || ['novo', 'preparo'].includes(p.etapa)).sort((x, y) => x.hora.localeCompare(y.hora));
  return `<div class="entre"><span class="mute" style="font-size:12.5px">Tela da cozinha (KDS): pedidos por ordem de chegada. Atrasados ficam em vermelho.</span><span class="flex mute" style="font-size:12px;gap:12px">${Object.entries(CANAIS).map(([, [n, c]]) => `<span class="flex" style="gap:5px"><i style="width:9px;height:9px;border-radius:3px;background:${c}"></i>${n}</span>`).join('')}</span></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px">${fila.map((p) => { const t = minDesde(p), lim = Math.max(...p.itens.map((i) => item(a, i.item)?.tempo || 15)), atras = t > lim + 10; return `<div class="cartao" style="margin:0;border-top:4px solid ${CANAIS[p.canal][1]}${atras ? ';box-shadow:0 0 0 2px var(--er)' : ''}"><div class="cartao-cab" style="padding:10px 14px"><div><h3>#${p.numero} · ${p.mesa ? `Mesa ${a.db.obter('mesas', p.mesa)?.numero}` : CANAIS[p.canal][0]}</h3><div class="sub">${p.hora} · <span class="${atras ? 'er-tx' : ''}">${t} min</span></div></div>${p.status === 'aberta' ? et('Mesa', 'info') : et(ETAPAS.find((e) => e[0] === p.etapa)[1], p.etapa === 'novo' ? 'al' : 'info')}</div>
      <ul class="lista">${p.itens.map((i) => `<li style="min-height:34px;padding:6px 14px"><b class="num" style="width:26px">${i.qtd}×</b><div class="cresce"><div class="t">${esc(i.nome)}</div>${i.obs ? `<div class="s al-tx">${esc(i.obs)}</div>` : ''}</div></li>`).join('')}</ul>
      ${p.status === 'aberta' ? `<div style="padding:10px 14px"><button type="button" class="btn pri ok" style="width:100%" data-acao="mesaPronta" data-id="${p.id}">${ic('check')}Pronto, pode servir</button></div>` : p.etapa ? `<div style="padding:10px 14px">${p.etapa === 'novo' ? `<button type="button" class="btn pri" style="width:100%" data-acao="etapa" data-id="${p.id}" data-s="preparo">${ic('cooking-pot')}Começar preparo</button>` : `<button type="button" class="btn pri ok" style="width:100%" data-acao="etapa" data-id="${p.id}" data-s="pronto">${ic('check')}Pronto</button>`}</div>` : ''}</div>`; }).join('') || vazio('check-circle', 'Cozinha em dia', 'Nenhum pedido esperando.')}</div>`;
}

function delivery(a) {
  a.kanbans.dlv = (id, s) => { const p = a.db.obter('pedidos', id); a.db.salvar('pedidos', { id, etapa: s, ...(s === 'entregue' ? { status: 'entregue', pago: true } : {}) }); a.db.registrar(`pedidos:${id}`, ETAPAS.find((e) => e[0] === s)[1], { icone: 'arrow-right' }); avisar(`#${p.numero} → ${ETAPAS.find((e) => e[0] === s)[1]}`); if (s === 'rota' && p.cliente) { const c = cli(a, p.cliente); window.open(`${telLink(c.telefone)}?text=${encodeURIComponent(`Oi, ${c.nome.split(' ')[0]}! Seu pedido #${p.numero} da ${a.empresa} saiu para entrega e chega em uns 20 minutos. Bom apetite!`)}`, '_blank', 'noopener'); } };
  a.kanbans['dlv:abrir'] = (id) => a.abrir('pedido', id);
  const l = peds(a).filter((p) => p.etapa && (p.etapa !== 'entregue' || (p.data === hoje())));
  return `<div class="entre"><span class="mute" style="font-size:12.5px">Delivery próprio, WhatsApp, iFood e balcão no mesmo quadro. Ao marcar “Saiu para entrega”, o cliente recebe aviso no WhatsApp.</span><div class="flex"><button type="button" class="btn" data-acao="linkCardapio">${ic('link')}Link do pedido online</button><button type="button" class="btn pri" data-acao="novoDelivery">${ic('plus')}Novo pedido</button></div></div>`
    + kanban({ id: 'dlv', itens: l, campo: 'etapa', colunas: ETAPAS.map(([id, nome, cor]) => ({ id, nome, cor, sub: (x) => moeda(soma(x, totalP)), classe: (p) => (emCurso(p) && minDesde(p) > 45 ? 'parado' : '') })),
      ficha: (p) => `<div class="entre"><span class="mono" style="font-size:12px;color:var(--tx-3)">#${p.numero}</span><span class="et sem-ponto" style="background:color-mix(in srgb,${CANAIS[p.canal][1]} 14%,var(--painel));color:${CANAIS[p.canal][1]}">${CANAIS[p.canal][0]}</span></div><div class="t">${esc(cli(a, p.cliente)?.nome || 'Balcão')}</div><div class="s corta">${p.itens.map((i) => `${i.qtd}× ${esc(i.nome)}`).join(', ')}</div><div class="linha"><span class="mute" style="font-size:11.5px">${p.hora}${emCurso(p) ? ` · ${minDesde(p)} min` : ''}</span><b class="num" style="color:var(--tx)">${moeda(totalP(p))}</b></div>` });
}

function cardapioPag(a) {
  return a.tab({ id: 'cardapio', colecao: 'cardapio', singular: 'item', plural: 'itens', ordem: 'cat', buscaDica: 'Buscar prato ou bebida…',
    visoes: [{ id: 'todos', rot: 'Todos' }, ...CATS.map(([k, n]) => ({ id: k, rot: n, filtro: (it) => it.cat === k })), { id: 'caro', rot: 'CMV acima de 35%', filtro: (it) => cmv(a, it) > 35 }],
    novo: { rot: 'Novo item', attrs: 'data-acao="novoCad" data-c="cardapio"' }, aoClicar: (id) => a.abrir('item', id),
    colunas: [{ k: 'nome', rot: 'Item', render: (it) => `<span class="prim">${esc(it.nome)}</span><span class="sub">${nomeCat(it.cat)}${it.ativo ? '' : ' · <span class="er-tx">pausado</span>'}</span>` }, { k: 'preco', rot: 'Preço', n: true, render: (it) => moeda(it.preco) },
      { k: 'custo', rot: 'Custo (ficha técnica)', n: true, oc: true, valor: (it) => custoItem(a, it), render: (it) => (it.ficha.length ? moeda(custoItem(a, it)) : '<span class="mute">sem ficha</span>') },
      { k: 'cmv', rot: 'CMV', n: true, valor: (it) => cmv(a, it), render: (it) => (it.ficha.length ? `<span class="${cmv(a, it) > 35 ? 'er-tx' : cmv(a, it) > 28 ? 'al-tx' : 'ok-tx'}">${pct(cmv(a, it), 1)}</span>` : '<span class="mute">—</span>') },
      { k: 'vendas', rot: 'Vendidos (30 dias)', n: true, valor: (it) => soma(fechados(a, (p) => diasAte(p.data) > -30).flatMap((p) => p.itens).filter((i) => i.item === it.id), (i) => i.qtd), render: (it) => num(soma(fechados(a, (p) => diasAte(p.data) > -30).flatMap((p) => p.itens).filter((i) => i.item === it.id), (i) => i.qtd)) }] });
}

function estoque(a) {
  const ins = a.db.lista('insumos');
  return kpis([{ rot: 'Valor em estoque', icone: 'package', val: moeda(soma(ins, (x) => x.custo * x.estoque)) }, { rot: 'Para comprar', icone: 'shopping-cart', val: num(ins.filter((x) => x.estoque <= x.minimo).length), alerta: ins.some((x) => x.estoque <= x.minimo) }])
    + `<div class="dica">${ic('info')}<span>A cada pedido fechado, o sistema baixa os insumos pela ficha técnica de cada prato. Assim o estoque e o CMV ficam certos sem contar tudo na mão.</span></div>`
    + a.tab({ id: 'insumos', colecao: 'insumos', singular: 'insumo', plural: 'insumos', ordem: 'nome', novo: { rot: 'Novo insumo', attrs: 'data-acao="novoCad" data-c="insumos"' }, aoClicar: async (id) => { if (await editar(a, 'insumos', insumo(a, id))) a.render(); },
      visoes: [{ id: 'todos', rot: 'Todos' }, { id: 'comprar', rot: 'Comprar', filtro: (x) => x.estoque <= x.minimo }],
      colunas: [{ k: 'nome', rot: 'Insumo', render: (x) => `<span class="prim">${esc(x.nome)}</span>` }, { k: 'custo', rot: 'Custo', n: true, render: (x) => `${moeda(x.custo)}/${x.un}` }, { k: 'estoque', rot: 'Estoque', n: true, render: (x) => (x.estoque <= x.minimo ? et(`${num(x.estoque, 2)} ${x.un} · mín. ${x.minimo}`, 'er') : `${num(x.estoque, 2)} ${x.un}`) }, { k: 'usa', rot: 'Usado em', oc: true, valor: (x) => a.db.lista('cardapio').filter((it) => it.ficha.some((f) => f.insumo === x.id)).length, render: (x) => `${a.db.lista('cardapio').filter((it) => it.ficha.some((f) => f.insumo === x.id)).length} pratos` },
        { k: 'acao', rot: '', ord: false, csv: false, render: (x) => `<button type="button" class="btn peq" data-acao="entradaIns" data-id="${x.id}">${ic('plus')}Entrada</button>` }] });
}

function caixa(a) {
  const st = a.estado.cx ||= { data: hoje() };
  const l = fechados(a, (p) => p.data === st.data), porForma = agrupar(l, (p) => p.forma);
  return `<div class="entre"><div class="flex"><input type="date" value="${st.data}" data-mudar="dataCx" style="width:160px" aria-label="Dia"><span class="mute" style="font-size:12.5px">${l.length} pedidos fechados</span></div><button type="button" class="btn" data-acao="imprimirFechamento">${ic('printer')}Fechamento do dia</button></div>
    ${kpis([{ rot: 'Total do dia', icone: 'cash-register', val: moeda(soma(l, totalP)) }, { rot: 'Taxa de serviço (10%)', icone: 'hand-coins', val: moeda(soma(l.filter((p) => p.servico), (p) => subtotal(p) * SERVICO)), nota: 'para dividir com a equipe' }, { rot: 'Taxas de entrega', icone: 'motorcycle', val: moeda(soma(l, (p) => p.taxa || 0)) }])}
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><h3>Por forma de pagamento</h3></div><div class="cartao-corpo">${rosca({ itens: Object.entries(porForma).map(([f, x], i) => ({ rot: f, v: soma(x, totalP), cor: ['var(--acc)', '#0ea5e9', '#16a34a', '#a855f7', '#f59e0b', '#ea1d2c'][i % 6] })), centro: moedaC(soma(l, totalP)), fmt: moedaC })}</div></div>
      <div class="cartao"><div class="cartao-cab"><h3>Por canal</h3></div><div class="cartao-corpo">${barrasH(Object.entries(CANAIS).map(([k, [n]]) => ({ rot: n, v: soma(l.filter((p) => p.canal === k), totalP), extra: `${l.filter((p) => p.canal === k).length} pedidos` })), { fmt: moedaC })}</div></div></div>
    ${a.tab({ id: 'cx', itens: () => l, singular: 'pedido', plural: 'pedidos', ordem: 'hora', desc: true, aoClicar: (id) => a.abrir('pedido', id), colunas: [{ k: 'numero', rot: 'Pedido', render: (p) => `<span class="mono prim">#${p.numero}</span>` }, { k: 'hora', rot: 'Hora' }, { k: 'canal', rot: 'Canal', valor: (p) => CANAIS[p.canal][0] }, { k: 'forma', rot: 'Pagamento', oc: true }, { k: 'total', rot: 'Total', n: true, valor: totalP, render: (p) => moeda(totalP(p)) }] })}`;
}

function relatorios(a) {
  const ult = fechados(a, (p) => diasAte(p.data) > -30), its = ult.flatMap((p) => p.itens);
  const porCat = CATS.map(([k, n]) => ({ rot: n, v: soma(its.filter((i) => item(a, i.item)?.cat === k), (i) => i.qtd * i.preco) })).filter((x) => x.v).sort((x, y) => y.v - x.v);
  const custoVend = soma(its, (i) => { const it = item(a, i.item); return it ? custoItem(a, it) * i.qtd : 0; });
  return `${kpis([{ rot: 'Faturamento (30 dias)', icone: 'coins', val: moeda(soma(ult, totalP)) }, { rot: 'Pedidos', icone: 'receipt', val: num(ult.length) }, { rot: 'CMV real (30 dias)', icone: 'chart-pie-slice', val: pct((custoVend / (soma(its, (i) => i.qtd * i.preco) || 1)) * 100, 1), nota: moeda(custoVend) }, { rot: 'Clientes de delivery', icone: 'users', val: num(new Set(ult.filter((p) => p.cliente).map((p) => p.cliente)).size) }])}
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Faturamento por dia da semana</h3><div class="sub">Média dos últimos 30 dias</div></div></div><div class="cartao-corpo">${barras({ dados: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ rot: DIAS[d], v: [soma(ult.filter((p) => paraData(p.data).getDay() === d), totalP) / 4.3] })), series: [{ nome: 'Média', cor: 'var(--acc)' }], fmt: moedaC, altura: 200 })}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Por categoria</h3></div></div><div class="cartao-corpo">${barrasH(porCat, { fmt: moedaC })}</div></div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Engenharia de cardápio</h3><div class="sub">Quanto cada prato vende e quanto ele deixa de margem</div></div></div><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Item</th><th class="n">Vendidos</th><th class="n">Margem unit.</th><th class="n">Margem total</th><th>Classificação</th></tr></thead><tbody>${(() => { const l = a.db.lista('cardapio').filter((it) => it.ficha.length).map((it) => { const q = soma(its.filter((i) => i.item === it.id), (i) => i.qtd), m = it.preco - custoItem(a, it); return { it, q, m }; }); const mq = soma(l, (x) => x.q) / (l.length || 1), mm = soma(l, (x) => x.m) / (l.length || 1); return l.sort((x, y) => y.q * y.m - x.q * x.m).map((x) => { const c = x.q >= mq ? (x.m >= mm ? ['Estrela', 'ok'] : ['Burro de carga', 'info']) : x.m >= mm ? ['Quebra-cabeça', 'al'] : ['Abacaxi', 'er']; return `<tr><td>${esc(x.it.nome)}</td><td class="n">${x.q}</td><td class="n">${moeda(x.m)}</td><td class="n">${moeda(x.m * x.q)}</td><td>${et(c[0], c[1])}</td></tr>`; }).join(''); })()}</tbody></table></div></div>`;
}

// ---------------------------------------------------------------- comanda
async function lancar(a, pid) {
  const p = a.db.obter('pedidos', pid), its = a.db.lista('cardapio').filter((it) => it.ativo);
  const sel = {};
  const r = await modal({ titulo: `Lançar itens · ${p.mesa ? `Mesa ${a.db.obter('mesas', p.mesa).numero}` : `#${p.numero}`}`, largura: 680, corpo: `<label class="caixa-busca" style="max-width:none;margin-bottom:10px">${ic('magnifying-glass')}<input type="search" data-busca-it placeholder="Buscar no cardápio…" aria-label="Buscar no cardápio"></label>
    <div data-lista-it style="max-height:52vh;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px">${its.map((it) => `<button type="button" class="btn" data-add-it="${it.id}" data-nome="${esc(normal(it.nome))}" style="height:auto;min-height:58px;flex-direction:column;align-items:flex-start;padding:8px 10px;white-space:normal;text-align:left"><b style="font-weight:500">${esc(it.nome)}</b><span class="mute" style="font-size:12px">${moeda(it.preco)} <span data-q="${it.id}" class="acc-tx"></span></span></button>`).join('')}</div>
    <label class="campo" style="margin-top:10px">Observação para a cozinha<input data-obs placeholder="Ex.: sem cebola, ponto da carne"></label>`,
    aoAbrir: (f) => {
      f.querySelector('[data-busca-it]').addEventListener('input', (e) => { const b = normal(e.target.value); f.querySelectorAll('[data-add-it]').forEach((x) => { x.hidden = b && !x.dataset.nome.includes(b); }); });
      f.querySelectorAll('[data-add-it]').forEach((x) => x.addEventListener('click', () => { const id = x.dataset.addIt; sel[id] = (sel[id] || 0) + 1; f.querySelector(`[data-q="${id}"]`).textContent = `· ${sel[id]}×`; }));
    },
    botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Mandar para a cozinha', classe: 'pri', acao: (f) => (Object.keys(sel).length ? { obs: f.querySelector('[data-obs]').value } : (avisar('Toque nos itens para adicionar', { tipo: 'erro' }), false)) }] });
  if (!r) return;
  const itens = [...p.itens]; Object.entries(sel).forEach(([id, q]) => { const it = item(a, id); itens.push({ item: id, nome: it.nome, qtd: q, preco: it.preco, obs: r.obs }); });
  a.db.salvar('pedidos', { id: pid, itens, ...(p.status === 'aberta' ? { cozinha: 'pendente', enviado: new Date().toTimeString().slice(0, 5) } : {}) }); a.db.registrar(`pedidos:${pid}`, `${soma(Object.values(sel))} itens lançados`, { icone: 'plus' }); avisar(`${soma(Object.values(sel))} itens enviados para a cozinha`); a.render(); a.reabrir();
}
function baixarInsumos(a, p) { p.itens.forEach((i) => (item(a, i.item)?.ficha || []).forEach((f) => { const x = insumo(a, f.insumo); if (x) a.db.salvar('insumos', { id: x.id, estoque: Math.max(0, Math.round((x.estoque - f.qtd * i.qtd) * 1000) / 1000) }); })); }

// ---------------------------------------------------------------- fichas
const fichas = {
  pedido(a, id) {
    const p = a.db.obter('pedidos', id); if (!p) return null; const c = cli(a, p.cliente), m = p.mesa ? a.db.obter('mesas', p.mesa) : null;
    return { estreita: true, html: ficha({ tipo: m ? 'Comanda' : 'Pedido', icone: m ? 'chair' : 'motorcycle', titulo: `${m ? `Mesa ${m.numero}` : esc(c?.nome || CANAIS[p.canal][0])} · #${p.numero}`, sub: `<span class="et sem-ponto" style="color:${CANAIS[p.canal][1]}">${CANAIS[p.canal][0]}</span><span>${dataCurta(p.data)}, ${p.hora}</span>${p.pago ? et('Pago', 'ok') : et('Em aberto', 'al')}`,
      extra: p.status === 'aberta' ? `<div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn pri" data-acao="lancarItens" data-id="${id}">${ic('plus')}Lançar itens</button><button type="button" class="btn" data-acao="imprimirConta" data-id="${id}">${ic('printer')}Prévia da conta</button><button type="button" class="btn pri ok" data-acao="fecharConta" data-id="${id}">${ic('currency-circle-dollar')}Fechar conta</button></div>` : !p.pago ? `<div class="flex" style="margin-top:12px"><button type="button" class="btn pri ok" data-acao="fecharConta" data-id="${id}">${ic('currency-circle-dollar')}Receber</button></div>` : '',
      corpo: `<div class="gav-sec"><table class="tabela"><tbody>${p.itens.map((i, k) => `<tr><td><b class="num">${i.qtd}×</b> ${esc(i.nome)}${i.obs ? `<span class="sub al-tx">${esc(i.obs)}</span>` : ''}</td><td class="n">${moeda(i.qtd * i.preco)}</td><td class="acoes">${p.status === 'aberta' ? `<button type="button" class="btn fant peq ic-so" data-acao="tirarItem" data-id="${id}" data-i="${k}" aria-label="Remover">${ic('trash')}</button>` : ''}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Subtotal</td><td class="n">${moeda(subtotal(p))}</td><td></td></tr>${p.servico ? `<tr><td>Serviço (10%)</td><td class="n">${moeda(subtotal(p) * SERVICO)}</td><td></td></tr>` : ''}${p.taxa ? `<tr><td>Taxa de entrega</td><td class="n">${moeda(p.taxa)}</td><td></td></tr>` : ''}<tr><td><b>Total</b></td><td class="n"><b>${moeda(totalP(p))}</b></td><td></td></tr>${p.pessoas > 1 ? `<tr><td class="mute">Por pessoa (${p.pessoas})</td><td class="n mute">${moeda(totalP(p) / p.pessoas)}</td><td></td></tr>` : ''}</tfoot></table></div>
        <div class="gav-sec">${props([m ? ['user', 'Garçom', esc(p.garcom || '')] : null, m ? ['users', 'Pessoas', String(p.pessoas || 1)] : null, c ? ['user', 'Cliente', `${esc(c.nome)} · <a href="${telLink(c.telefone)}" target="_blank" rel="noopener">WhatsApp</a>`] : null, c?.endereco ? ['map-pin', 'Entrega', esc(c.endereco)] : null, ['credit-card', 'Pagamento', esc(p.forma || '—')]])}</div>` }) };
  },
  item(a, id) {
    const it = item(a, id); if (!it) return null; const c = custoItem(a, it);
    return { estreita: true, html: ficha({ tipo: 'Item do cardápio', icone: 'fork-knife', titulo: esc(it.nome), sub: `<span>${nomeCat(it.cat)}</span><b class="num" style="color:var(--tx)">${moeda(it.preco)}</b>${it.ativo ? '' : et('Pausado', 'er')}`,
      extra: `<div class="flex" style="margin-top:12px"><button type="button" class="btn" data-acao="pausarItem" data-id="${id}">${ic(it.ativo ? 'pause' : 'play')}${it.ativo ? 'Pausar (acabou)' : 'Voltar a vender'}</button></div>`,
      corpo: `<div class="gav-sec"><div class="entre"><h4>Ficha técnica</h4><button type="button" class="btn peq" data-acao="addFicha" data-id="${id}">${ic('plus')}Insumo</button></div>${it.ficha.length ? `<table class="tabela"><thead><tr><th>Insumo</th><th class="n">Qtd.</th><th class="n">Custo</th><th></th></tr></thead><tbody>${it.ficha.map((f, k) => { const x = insumo(a, f.insumo); return `<tr><td>${esc(x?.nome || '—')}</td><td class="n">${num(f.qtd, 3)} ${x?.un || ''}</td><td class="n">${moeda((x?.custo || 0) * f.qtd)}</td><td class="acoes"><button type="button" class="btn fant peq ic-so" data-acao="tirarFicha" data-id="${id}" data-i="${k}" aria-label="Remover">${ic('trash')}</button></td></tr>`; }).join('')}</tbody><tfoot><tr><td colspan="2">Custo do prato</td><td class="n">${moeda(c)}</td><td></td></tr></tfoot></table>
        <div class="${cmv(a, it) > 35 ? 'alerta-linha' : 'dica'}" style="margin-top:10px">${ic(cmv(a, it) > 35 ? 'warning' : 'info')}<span>CMV de ${pct(cmv(a, it), 1)} · margem de ${moeda(it.preco - c)} por prato. ${cmv(a, it) > 35 ? `Para CMV de 30%, o preço seria ${moeda(c / 0.3)}.` : ''}</span></div>` : vazio('list-checks', 'Sem ficha técnica', 'Cadastre os insumos para saber o custo real.')}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="cardapio" data-id="${id}">${ic('pencil-simple')}Editar</button>` }) };
  },
};

// ---------------------------------------------------------------- aplicativo
const app = criarApp({
  id: 'restaurante', nome: 'Veltria Restaurante', sub: 'Restaurantes e delivery', cor: '#b45309', icone: 'fork-knife', empresa: 'Bistrô Alecrim', conta: 'Salão e delivery · Rio de Janeiro',
  produto: { mensal: 89 }, semente, colecoes, fichas, buscaDica: 'pratos e clientes',
  portal: {
    cardapio: {
      explica: 'Cardápio no celular do cliente. Na mesa (pelo QR code), o pedido vai direto para a cozinha. Fora dela, vira pedido de entrega ou retirada, sem a taxa dos aplicativos.',
      montar: (a) => ({ cats: CATS, itens: a.db.lista('cardapio').filter((it) => it.ativo).map((it) => ({ id: it.id, nome: it.nome, preco: it.preco, cat: it.cat, tempo: it.tempo })), taxa: a.db.cfg.taxa_entrega ?? 7, delivery: true }),
      responder: (a, r) => {
        if (r.acao !== 'pedido') return '';
        const d = r.dados, itens = (d.itens || []).map((x) => { const it = item(a, x.id); return it ? { item: it.id, nome: it.nome, qtd: Math.max(1, Math.min(50, Number(x.qtd) || 1)), preco: it.preco, obs: String(d.obs || '').slice(0, 120) } : null; }).filter(Boolean);
        if (!itens.length) return '';
        const agora = new Date().toTimeString().slice(0, 5), numero = Math.max(1000, ...peds(a).map((x) => x.numero)) + 1;
        if (d.mesa) {
          const m = a.db.lista('mesas').find((x) => String(x.numero) === String(d.mesa)); if (!m) return '';
          const ab = mesaAberta(a, m.id);
          if (ab) a.db.salvar('pedidos', { id: ab.id, itens: [...ab.itens, ...itens], cozinha: 'pendente', enviado: agora });
          else a.db.salvar('pedidos', { numero, canal: 'salao', mesa: m.id, data: hoje(), hora: agora, itens, status: 'aberta', pessoas: 1, garcom: 'QR code', servico: true, pago: false, cozinha: 'pendente', enviado: agora });
          return `Mesa ${m.numero} pediu pelo QR code: ${itens.map((x) => `${x.qtd}× ${x.nome}`).join(', ')}`;
        }
        const tel = String(d.telefone || '').replace(/\D/g, '');
        let c = a.db.lista('clientes').find((x) => String(x.telefone).replace(/\D/g, '') === tel && tel);
        if (!c) c = a.db.salvar('clientes', { nome: String(d.nome || 'Cliente').slice(0, 80), telefone: d.telefone || '', endereco: String(d.endereco || '').slice(0, 160), pedidos: 0 });
        else if (d.endereco) a.db.salvar('clientes', { id: c.id, endereco: String(d.endereco).slice(0, 160) });
        a.db.salvar('pedidos', { numero, canal: 'site', data: hoje(), hora: agora, itens, etapa: 'novo', cliente: c.id, taxa: d.retirada ? 0 : a.db.cfg.taxa_entrega ?? 7, forma: d.pagamento || 'PIX', pago: false, retirada: !!d.retirada });
        return `Pedido online #${numero} de ${c.nome.split(' ')[0]} (${d.retirada ? 'retirada' : 'entrega'})`;
      },
    },
  },
  modelos: [
    { id: 'restaurante', nome: 'Restaurante', desc: 'Pratos executivos, à la carte e bebidas', dados: { cardapio: [['Prato executivo do dia', 'pratos', 34], ['Filé à parmegiana', 'pratos', 69], ['Salada Caesar', 'entradas', 36]].map(([nome, cat, preco]) => ({ nome, cat, preco, ficha: [], ativo: true, tempo: 20 })) } },
    { id: 'pizzaria', nome: 'Pizzaria', desc: 'Pizzas, bordas e bebidas', dados: { cardapio: [['Pizza margherita (grande)', 'pizzas', 64], ['Pizza calabresa (grande)', 'pizzas', 62], ['Pizza quatro queijos (grande)', 'pizzas', 72], ['Pizza portuguesa (grande)', 'pizzas', 69], ['Borda recheada de catupiry', 'pizzas', 12], ['Refrigerante 2 L', 'bebidas', 14]].map(([nome, cat, preco]) => ({ nome, cat, preco, ficha: [], ativo: true, tempo: 25 })) } },
    { id: 'hamburgueria', nome: 'Hamburgueria', desc: 'Burgers, porções e milk-shakes', dados: { cardapio: [['Smash burger', 'lanches', 32], ['Burger bacon e cheddar', 'lanches', 42], ['Batata frita com cheddar e bacon', 'porcoes', 34], ['Onion rings', 'porcoes', 28], ['Milk-shake de Ovomaltine', 'sobremesas', 24]].map(([nome, cat, preco]) => ({ nome, cat, preco, ficha: [], ativo: true, tempo: 15 })) } },
    { id: 'cafe', nome: 'Cafeteria e padaria', desc: 'Cafés, salgados, doces e lanches rápidos', dados: { cardapio: [['Espresso', 'cafes', 7], ['Cappuccino', 'cafes', 12], ['Pão de queijo (porção)', 'porcoes', 14], ['Misto quente', 'lanches', 16], ['Bolo de cenoura (fatia)', 'sobremesas', 12]].map(([nome, cat, preco]) => ({ nome, cat, preco, ficha: [], ativo: true, tempo: 6 })) } },
    { id: 'bar', nome: 'Bar e petiscaria', desc: 'Petiscos, porções e drinks', dados: { cardapio: [['Porção de fritas', 'porcoes', 32], ['Isca de frango', 'porcoes', 46], ['Bolinho de bacalhau (10 un.)', 'porcoes', 48], ['Chopp 300 ml', 'bebidas', 12], ['Caipirinha', 'drinks', 24]].map(([nome, cat, preco]) => ({ nome, cat, preco, ficha: [], ativo: true, tempo: 12 })) } },
  ],
  passos: (a) => [{ id: 'qr', rot: 'Imprima os QR codes das mesas', feito: !!a.db.cfg.qr_impresso, acao: 'qrMesas' }, { id: 'online', rot: 'Divulgue o link do pedido online', feito: !!a.db.cfg.links?.['cardapio:'], acao: 'linkCardapio' }],
  equipe: [['Sofia Almeida', 'Dona'], ['Chef Bruno Leal', 'Cozinha'], ['Lucas', 'Garçom'], ['Renata', 'Garçonete'], ['Diego', 'Garçom'], ['Paula', 'Caixa']],
  busca: [{ colecao: 'cardapio', grupo: 'Cardápio', icone: 'fork-knife', ficha: 'item', rot: (it) => it.nome, sub: (it) => moeda(it.preco) }],
  comandos: [{ rot: 'Novo pedido de delivery', icone: 'motorcycle', acao: (a) => a.acoes.novoDelivery() }, { rot: 'Pedido no balcão', icone: 'storefront', acao: (a) => a.acoes.novoBalcao() }],
  paginas: [
    { id: 'painel', rot: 'Painel', icone: 'house', titulo: 'Visão geral', render: painel, atalho: 'i' },
    { id: 'mesas', lado: FERR.mesas, rot: 'Mesas e comandas', icone: 'chair', render: mesas, atalho: 'm', cont: (a) => peds(a).filter((p) => p.status === 'aberta').length },
    { id: 'delivery', rot: 'Delivery e balcão', icone: 'motorcycle', render: delivery, cheio: true, atalho: 'd', cont: (a) => { const n = peds(a).filter((p) => p.etapa === 'novo').length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'cozinha', rot: 'Tela da cozinha', icone: 'cooking-pot', render: cozinha, atalho: 'k' },
    { grupo: 'Gestão' },
    { id: 'cardapio', lado: FERR.cardapio, rot: 'Cardápio e fichas técnicas', icone: 'fork-knife', render: cardapioPag, atalho: 'c' },
    { id: 'estoque', lado: FERR.estoque, rot: 'Estoque de insumos', icone: 'package', render: estoque, cont: (a) => { const n = a.db.lista('insumos').filter((x) => x.estoque <= x.minimo).length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'caixa', rot: 'Caixa do dia', icone: 'cash-register', render: caixa },
    { id: 'relatorios', lado: FERR.relatorios, rot: 'Relatórios', icone: 'chart-bar', render: relatorios },
    { id: 'clientes', lado: (a) => FERR.clientes(a) + FERR.delivery(a), rot: 'Clientes do delivery', icone: 'users', render: (a) => a.tab({ id: 'clientes', colecao: 'clientes', singular: 'cliente', plural: 'clientes', ordem: 'nome', novo: { rot: 'Novo cliente', attrs: 'data-acao="novoCad" data-c="clientes"' }, aoClicar: async (id) => { if (await editar(a, 'clientes', cli(a, id))) a.render(); }, colunas: [{ k: 'nome', rot: 'Cliente', render: (c) => `<span class="flex" style="gap:9px">${av(c.nome)}<span class="prim">${esc(c.nome)}</span></span>` }, { k: 'telefone', rot: 'WhatsApp' }, { k: 'endereco', rot: 'Endereço', oc: true }, { k: 'pedidos', rot: 'Pedidos', n: true, valor: (c) => peds(a).filter((p) => p.cliente === c.id).length }, { k: 'gasto', rot: 'Gasto total', n: true, valor: (c) => soma(peds(a).filter((p) => p.cliente === c.id), totalP), render: (c) => moeda(soma(peds(a).filter((p) => p.cliente === c.id), totalP)) }] }) },
    ...ferramentaPaginas(FERR, FERR_ITENS),
  ],
});

const reab = () => { app.render(); app.reabrir(); };
async function fechar(p) {
  const r = await modal({ titulo: `Fechar conta · ${moeda(totalP(p))}`, largura: 440, corpo: `<form class="form-grade"><label class="campo">Forma de pagamento<select name="f">${FORMAS.map((f) => `<option ${f === p.forma ? 'selected' : ''}>${f}</option>`).join('')}</select></label>${p.mesa ? `<label class="campo">Taxa de serviço<select name="s"><option value="1">Com 10%</option><option value="0">Sem taxa</option></select></label><label class="campo">Dividir por<input type="number" name="n" min="1" value="${p.pessoas || 1}"></label>` : ''}</form>`,
    botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Confirmar pagamento', classe: 'pri ok', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
  if (!r) return;
  const servico = p.mesa ? r.s === '1' : p.servico;
  app.db.salvar('pedidos', { id: p.id, forma: r.f, pago: true, servico, ...(p.status === 'aberta' ? { status: 'entregue' } : {}) });
  baixarInsumos(app, p); app.db.registrar(`pedidos:${p.id}`, `Pago (${r.f})`, { icone: 'currency-circle-dollar', tom: 'ok' });
  const t = totalP({ ...p, servico }); avisar(`Conta fechada: ${moeda(t)}${r.n > 1 ? ` · ${moeda(t / r.n)} por pessoa` : ''}`);
}
function docConta(p) {
  const m = p.mesa ? app.db.obter('mesas', p.mesa) : null;
  return `<div class="doc" style="max-width:300px;font-family:monospace;font-size:12px"><div style="text-align:center"><b>${esc(app.empresa)}</b><br>${esc(app.db.cfg.endereco)}<br>CNPJ ${esc(app.db.cfg.cnpj)}<br>--------------------------------<br>${m ? `MESA ${m.numero}` : CANAIS[p.canal][0].toUpperCase()} · PEDIDO #${p.numero}<br>${dataBR(p.data)} ${p.hora}<br>--------------------------------</div>
    ${p.itens.map((i) => `<div class="entre"><span>${i.qtd}x ${esc(i.nome)}</span><span>${moeda(i.qtd * i.preco)}</span></div>`).join('')}--------------------------------<div class="entre"><span>Subtotal</span><span>${moeda(subtotal(p))}</span></div>${p.servico ? `<div class="entre"><span>Serviço 10% (opcional)</span><span>${moeda(subtotal(p) * SERVICO)}</span></div>` : ''}${p.taxa ? `<div class="entre"><span>Entrega</span><span>${moeda(p.taxa)}</span></div>` : ''}<div class="entre"><b>TOTAL</b><b>${moeda(totalP(p))}</b></div>${p.pessoas > 1 ? `<div class="entre"><span>Por pessoa (${p.pessoas})</span><span>${moeda(totalP(p) / p.pessoas)}</span></div>` : ''}<div style="text-align:center;margin-top:10px">Não é documento fiscal · Obrigado!</div></div>`;
}
async function novoPedido(canal) {
  const ehBalcao = canal === 'balcao';
  const r = ehBalcao ? { c: '', canal: 'balcao' } : await modal({ titulo: 'Novo pedido de delivery', largura: 520, corpo: `<form class="form-grade"><label class="campo largo">Cliente<select name="c"><option value="">Novo cliente…</option>${app.db.lista('clientes').sort((x, y) => x.nome.localeCompare(y.nome)).map((c) => `<option value="${c.id}">${esc(c.nome)} · ${esc(c.telefone)}</option>`).join('')}</select></label><label class="campo">Canal<select name="canal"><option value="whatsapp">WhatsApp</option><option value="delivery">Telefone / site</option><option value="ifood">iFood</option></select></label><label class="campo">Nome (se novo)<input name="nome"></label><label class="campo">WhatsApp (se novo)<input name="tel" type="tel"></label><label class="campo largo">Endereço (se novo)<input name="end"></label></form>`,
    botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Continuar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
  if (!r) return;
  let cid = r.c || null;
  if (!ehBalcao && !cid) { if (!r.nome) { avisar('Informe o cliente', { tipo: 'erro' }); return; } cid = app.db.salvar('clientes', { nome: r.nome, telefone: r.tel, endereco: r.end, pedidos: 0 }).id; }
  const numero = Math.max(1000, ...peds(app).map((p) => p.numero)) + 1;
  const p = app.db.salvar('pedidos', { numero, canal: r.canal, data: hoje(), hora: new Date().toTimeString().slice(0, 5), itens: [], etapa: 'novo', cliente: cid, taxa: ['whatsapp', 'delivery'].includes(r.canal) ? 7 : 0, pago: r.canal === 'ifood', forma: r.canal === 'ifood' ? 'Pago no app' : 'PIX' });
  await lancar(app, p.id);
  const salvo = app.db.obter('pedidos', p.id);
  if (!salvo.itens.length) { app.db.apagar('pedidos', p.id); app.render(); return; }
  app.render(); app.abrir('pedido', p.id);
}
Object.assign(app.acoes, {
  ir: (d) => app.ir(d.h),
  linkCardapio: () => app.portal.compartilhar('cardapio', '', { titulo: 'Pedido online, sem taxa de aplicativo', qr: true, texto: `Faça o seu pedido na ${app.empresa} direto pelo nosso cardápio:` }),
  qrMesas: async () => {
    const base = await app.portal.link('cardapio', '', { curto: true }), [antes, depois] = base.split('#');
    const url = (n) => `${antes}?mesa=${n}#${depois}`;
    app.db.cfg.qr_impresso = true; app.db.gravar();
    imprimir(`<div class="doc"><h1 style="text-align:center">${esc(app.empresa)} · QR codes das mesas</h1><p style="text-align:center;color:#555">Recorte e cole em cada mesa. O cliente aponta a câmera, escolhe e o pedido vai direto para a cozinha.</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:18px">${app.db.lista('mesas').map((m) => `<div style="border:1px dashed #999;border-radius:12px;padding:14px;text-align:center;page-break-inside:avoid">${qrSVG(url(m.numero), 170)}<div style="font-size:20px;font-weight:700;margin-top:6px">Mesa ${m.numero}</div><div style="font-size:12px;color:#555">Aponte a câmera para pedir</div></div>`).join('')}</div></div>`);
    app.render();
  },
  abrirMesa: async (d) => {
    const p = mesaAberta(app, d.id); if (p) { app.abrir('pedido', p.id); return; }
    const m = app.db.obter('mesas', d.id);
    const r = await modal({ titulo: `Abrir mesa ${m.numero}`, largura: 400, corpo: `<form class="form-grade"><label class="campo">Pessoas<input type="number" name="n" min="1" value="2"></label><label class="campo">Garçom<select name="g">${['Lucas', 'Renata', 'Diego', 'Paula'].map((g) => `<option>${g}</option>`).join('')}</select></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Abrir mesa', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
    if (!r) return; const novo = app.db.salvar('pedidos', { numero: Math.max(1000, ...peds(app).map((x) => x.numero)) + 1, canal: 'salao', mesa: d.id, data: hoje(), hora: new Date().toTimeString().slice(0, 5), itens: [], status: 'aberta', pessoas: Number(r.n), garcom: r.g, servico: true, pago: false });
    app.render(); await lancar(app, novo.id); app.abrir('pedido', novo.id);
  },
  lancarItens: (d) => lancar(app, d.id),
  mesaPronta: (d) => { const p = app.db.obter('pedidos', d.id); app.db.salvar('pedidos', { id: d.id, cozinha: 'pronto' }); avisar(`Mesa ${app.db.obter('mesas', p.mesa).numero}: pode servir`); app.render(); },
  tirarItem: (d) => { const p = app.db.obter('pedidos', d.id); app.db.salvar('pedidos', { id: d.id, itens: p.itens.filter((_, k) => k !== Number(d.i)) }); reab(); },
  fecharConta: async (d) => { await fechar(app.db.obter('pedidos', d.id)); reab(); },
  imprimirConta: (d) => imprimir(docConta(app.db.obter('pedidos', d.id))),
  etapa: (d) => { const p = app.db.obter('pedidos', d.id); app.db.salvar('pedidos', { id: d.id, etapa: d.s }); avisar(`#${p.numero}: ${ETAPAS.find((e) => e[0] === d.s)[1].toLowerCase()}`); app.render(); },
  novoDelivery: () => novoPedido('delivery'),
  novoBalcao: () => novoPedido('balcao'),
  pausarItem: (d) => { const it = item(app, d.id); app.db.salvar('cardapio', { id: d.id, ativo: !it.ativo }); avisar(it.ativo ? `${it.nome} pausado no cardápio` : `${it.nome} voltou ao cardápio`); reab(); },
  addFicha: async (d) => { const r = await modal({ titulo: 'Adicionar insumo à ficha', largura: 440, corpo: `<form class="form-grade"><label class="campo largo">Insumo<select name="i">${app.db.lista('insumos').map((x) => `<option value="${x.id}">${esc(x.nome)} (${x.un})</option>`).join('')}</select></label><label class="campo">Quantidade por prato<input type="number" name="q" step="0.001" min="0" value="0.1"></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Adicionar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] }); if (!r) return; const it = item(app, d.id); app.db.salvar('cardapio', { id: d.id, ficha: [...it.ficha, { insumo: r.i, qtd: Number(r.q) }] }); reab(); },
  tirarFicha: (d) => { const it = item(app, d.id); app.db.salvar('cardapio', { id: d.id, ficha: it.ficha.filter((_, k) => k !== Number(d.i)) }); reab(); },
  entradaIns: async (d) => { const x = insumo(app, d.id); const r = await modal({ titulo: `Entrada · ${x.nome}`, largura: 400, corpo: `<form class="form-grade"><label class="campo">Quantidade (${x.un})<input type="number" name="q" step="0.01" value="5"></label><label class="campo">Custo por ${x.un}<input type="number" name="c" step="0.01" value="${x.custo}"></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Dar entrada', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] }); if (!r) return; app.db.salvar('insumos', { id: d.id, estoque: x.estoque + Number(r.q), custo: Number(r.c) }); avisar(`+${r.q} ${x.un} de ${x.nome}`); app.render(); },
  dataCx: (d, el) => { app.estado.cx.data = el.value || hoje(); app.render(); },
  imprimirFechamento: () => { const l = fechados(app, (p) => p.data === app.estado.cx.data); imprimir(`<div class="doc"><h1>${esc(app.empresa)} · fechamento de ${dataBR(app.estado.cx.data)}</h1><table><thead><tr><th>Forma</th><th class="n">Pedidos</th><th class="n">Total</th></tr></thead><tbody>${Object.entries(agrupar(l, (p) => p.forma)).map(([f, x]) => `<tr><td>${esc(f)}</td><td class="n">${x.length}</td><td class="n">${moeda(soma(x, totalP))}</td></tr>`).join('')}</tbody><tfoot><tr><td><b>Total</b></td><td class="n">${l.length}</td><td class="n"><b>${moeda(soma(l, totalP))}</b></td></tr></tfoot></table><p>Taxa de serviço a distribuir: ${moeda(soma(l.filter((p) => p.servico), (p) => subtotal(p) * SERVICO))}</p></div>`); },
  novoCad: async (d) => { if (await editar(app, d.c)) app.render(); },
  editarCad: async (d) => { if (await editar(app, d.c, app.db.obter(d.c, d.id))) reab(); },
});

// ferramentas do painel ao lado das telas (WhatsApp e copiar)
Object.assign(app.acoes, acoesLado());
app.travarLado = travarPro;   // avisos e mensagens prontas: plano Pro (calculadoras: Básico)
