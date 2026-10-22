// Veltria Restaurante · ferramentas ao lado das telas: preço pelo CMV, rendimento da receita, pratos parados,
// divisão da conta, taxa de entrega, lista de compras para o fornecedor, mais vendidos e clientes sumidos.
import { esc, moeda, diasAte, dataCurta } from '../base/nexo.js';
import { bloco, ldLista, ldItem, ldNums, campoN, calc, n0, fmtN, zap, copiar, registrarCalcs } from '../base/lado.js';

const primeiro = (n) => String(n || '').split(' ')[0];
const pedidos = (a) => a.db.lista('pedidos');

registrarCalcs({
  cmv: (f) => { const custo = n0(f.custo.value), alvo = n0(f.alvo.value); if (!custo || !alvo) return 'Informe o custo da porção e o CMV desejado.';
    const preco = custo / (alvo / 100), redondo = Math.ceil(preco - 0.9) + 0.9;
    return `Preço sugerido: <b>${moeda(preco)}</b> (CMV de ${fmtN(alvo)}%).<br>Arredondado para o cardápio: <b>${moeda(redondo)}</b>.<br>Sobra para o resto da operação: <b>${moeda(preco - custo)}</b> por prato.`; },
  rendimento: (f) => { const total = n0(f.total.value), porcoes = Math.max(1, n0(f.porcoes.value)), alvo = n0(f.alvo.value); if (!total) return 'Informe o custo total da receita.';
    const pp = total / porcoes;
    return `Custo por porção: <b>${moeda(pp)}</b> (${fmtN(porcoes, 0)} porções).${alvo ? `<br>Preço com CMV de ${fmtN(alvo)}%: <b>${moeda(pp / (alvo / 100))}</b> por porção.` : ''}`; },
  conta: (f) => { const total = n0(f.total.value), pessoas = Math.max(1, n0(f.pessoas.value)), serv = n0(f.servico.value), couvert = n0(f.couvert.value);
    if (!total) return 'Informe o total consumido.';
    const tx = total * serv / 100, geral = total + tx + couvert * pessoas;
    return `Serviço (${fmtN(serv)}%): <b>${moeda(tx)}</b>${couvert ? `<br>Couvert: <b>${moeda(couvert * pessoas)}</b>` : ''}<br>Total da mesa: <b>${moeda(geral)}</b><br>Para cada um (${fmtN(pessoas, 0)}): <b>${moeda(geral / pessoas)}</b>`; },
  entrega: (f) => { const km = n0(f.km.value), fixa = n0(f.fixa.value), porKm = n0(f.porkm.value), gratis = n0(f.gratis.value), pedido = n0(f.pedido.value);
    if (!km) return 'Informe a distância.';
    const taxa = Math.ceil((fixa + km * porKm) * 2) / 2, isento = gratis && pedido >= gratis;
    return isento ? `Entrega <b>grátis</b>: o pedido passou de ${moeda(gratis)}.` : `Taxa de entrega: <b>${moeda(taxa)}</b> (${moeda(fixa)} + ${fmtN(km)} km × ${moeda(porKm)}).`; },
});

export const LADOS = {
  cardapio: (a) => {
    const desde = (d) => -diasAte(d), vendeu = new Set(pedidos(a).filter((p) => desde(p.data) <= 30).flatMap((p) => (p.itens || []).map((i) => i.item)));
    const parados = a.db.lista('cardapio').filter((i) => i.ativo !== false && !vendeu.has(i.id));
    return bloco('Preço pelo CMV', 'calculator', `<p>Do custo da ficha técnica ao preço do cardápio.</p>${calc('cmv', campoN('custo', 'Custo da porção (R$)', 18) + campoN('alvo', 'CMV desejado (%)', 30))}`)
      + bloco('Rendimento da receita', 'cooking-pot', calc('rendimento', campoN('total', 'Custo total da receita (R$)', 120) + campoN('porcoes', 'Rende quantas porções', 10) + campoN('alvo', 'CMV desejado (%)', 30)))
      + bloco('Sem venda nos últimos 30 dias', 'hourglass', `<p>Vale promover, trocar a foto ou tirar do cardápio.</p>${ldLista(parados.slice(0, 8).map((i) => ldItem(esc(i.nome), `${moeda(i.preco)} · ${esc(i.cat || '')}`)), 'Todos os pratos venderam no mês.')}`);
  },
  mesas: () => bloco('Dividir a conta', 'users-three', calc('conta', campoN('total', 'Total consumido (R$)', 320) + campoN('pessoas', 'Pessoas', 4) + campoN('servico', 'Serviço (%)', 10) + campoN('couvert', 'Couvert por pessoa (R$)', 0))),
  delivery: () => bloco('Taxa de entrega', 'motorcycle', calc('entrega', campoN('km', 'Distância (km)', 4) + campoN('fixa', 'Taxa fixa (R$)', 4) + campoN('porkm', 'Por km (R$)', 1.5) + campoN('pedido', 'Valor do pedido (R$)', 80) + campoN('gratis', 'Grátis acima de (R$)', 0))),
  estoque: (a) => {
    const baixo = a.db.lista('insumos').filter((i) => Number(i.estoque) <= Number(i.minimo)).sort((x, y) => x.nome.localeCompare(y.nome));
    const lista = baixo.map((i) => `• ${i.nome}: ${fmtN(Math.max(Number(i.minimo) * 2 - Number(i.estoque), Number(i.minimo)), 1)} ${i.un}`).join('\n');
    const texto = `Olá! Pedido da ${a.empresa} para entrega:\n${lista}\nObrigado!`;
    return bloco('Lista de compras para o fornecedor', 'shopping-cart', baixo.length
      ? `<p>${baixo.length} ${baixo.length === 1 ? 'insumo está' : 'insumos estão'} no mínimo ou abaixo. A quantidade sugerida repõe até o dobro do mínimo.</p><pre class="ld-pre">${esc(lista)}</pre><div class="ld-atalhos">${copiar(texto, 'Copiar o pedido')}<a class="btn peq" href="https://wa.me/?text=${encodeURIComponent(texto)}" target="_blank" rel="noopener">Mandar no WhatsApp</a></div>`
      : ldLista([], 'Estoque em dia: nada abaixo do mínimo.'));
  },
  relatorios: (a) => {
    const soma = {};
    pedidos(a).filter((p) => -diasAte(p.data) <= 7 && p.status !== 'cancelado').forEach((p) => (p.itens || []).forEach((i) => { const s = (soma[i.item] ||= { nome: i.nome, qtd: 0, valor: 0 }); s.qtd += Number(i.qtd || 1); s.valor += Number(i.qtd || 1) * Number(i.preco || 0); }));
    const top = Object.values(soma).sort((x, y) => y.qtd - x.qtd).slice(0, 8);
    return bloco('Mais vendidos nos últimos 7 dias', 'trophy', ldLista(top.map((s, k) => ldItem(`${k + 1}. ${esc(s.nome)}`, `${fmtN(s.qtd, 0)} vendidos`, { dir: `<b class="num">${moeda(s.valor)}</b>` })), 'Sem vendas nos últimos 7 dias.'));
  },
  clientes: (a) => {
    const ult = {}; pedidos(a).forEach((p) => { if (p.cliente && (!ult[p.cliente] || p.data > ult[p.cliente])) ult[p.cliente] = p.data; });
    const sumidos = a.db.lista('clientes').filter((c) => ult[c.id] && diasAte(ult[c.id]) < -30).sort((x, y) => ult[x.id].localeCompare(ult[y.id]));
    return bloco('Clientes sumidos (30+ dias)', 'megaphone', `<p>Uma mensagem com um mimo traz o cliente de volta.</p>${ldLista(sumidos.slice(0, 10).map((c) => ldItem(esc(c.nome), `último pedido em ${dataCurta(ult[c.id])}`, {
      dir: zap(c.telefone, `Oi, ${primeiro(c.nome)}! Aqui é do ${a.empresa}. Faz tempo que você não pede com a gente, e a gente sente falta! No seu próximo pedido pelo WhatsApp, a sobremesa é por nossa conta. É só responder esta mensagem.`, 'Convidar') })), 'Nenhum cliente sumido.')}`);
  },
};

// cada ferramenta como item próprio no menu da esquerda: [id, rótulo, ícone, aba de origem, começo do título do bloco]
export const ITENS = [
  ['cmv', 'Preço pelo CMV', 'calculator', 'cardapio', 'Preço pelo CMV'],
  ['rendimento', 'Rendimento da receita', 'cooking-pot', 'cardapio', 'Rendimento'],
  ['conta', 'Dividir a conta', 'users-three', 'mesas', 'Dividir a conta'],
  ['entrega', 'Taxa de entrega', 'motorcycle', 'delivery', 'Taxa de entrega'],
  ['compras', 'Lista de compras', 'shopping-cart', 'estoque', 'Lista de compras'],
  ['vendidos', 'Mais vendidos', 'trophy', 'relatorios', 'Mais vendidos'],
  ['parados', 'Pratos sem venda', 'hourglass', 'cardapio', 'Sem venda'],
  ['sumidos', 'Clientes sumidos', 'megaphone', 'clientes', 'Clientes sumidos'],
];
