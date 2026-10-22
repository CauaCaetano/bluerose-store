// Veltria Gestão · ferramentas: markup e margem, preço com impostos, ponto de pedido e desconto máximo (Básico)
// e pedido ao fornecedor, clientes sem comprar, compras atrasadas e produtos parados (Pro).
import { esc, moeda, hoje, diasAte, dataCurta } from '../base/nexo.js';
import { bloco, ldLista, ldItem, campoN, calc, n0, fmtN, zap, registrarCalcs } from '../base/lado.js';

const primeiro = (n) => String(n || '').split(' ')[0];
const total = (p) => (p.estoque && typeof p.estoque === 'object' ? Object.values(p.estoque).reduce((s, v) => s + Number(v || 0), 0) : Number(p.estoque || 0));

registrarCalcs({
  markup: (f) => { const custo = n0(f.custo.value), preco = n0(f.preco.value); if (!custo || !preco) return 'Informe custo e preço.';
    return `Margem: <b>${fmtN((preco - custo) / preco * 100)}%</b> do preço · Markup: <b>${fmtN((preco - custo) / custo * 100)}%</b> sobre o custo.<br>Lucro bruto por unidade: <b>${moeda(preco - custo)}</b>`; },
  impostos: (f) => { const custo = n0(f.custo.value), imp = n0(f.imp.value), m = n0(f.margem.value), div = 1 - (imp + m) / 100;
    if (!custo) return 'Informe o custo.'; if (div <= 0) return 'Impostos e margem somam 100% ou mais.';
    return `Preço de venda: <b>${moeda(custo / div)}</b><br>Impostos: ${moeda(custo / div * imp / 100)} · Lucro: <b>${moeda(custo / div * m / 100)}</b>`; },
  pedido: (f) => { const giro = n0(f.giro.value), prazo = n0(f.prazo.value), seg = n0(f.seguranca.value), est = n0(f.estoque.value);
    if (!giro) return 'Informe quanto vende por dia.';
    const ponto = Math.ceil(giro * (prazo + seg));
    return `Ponto de pedido: <b>${ponto} un</b> (vende ${fmtN(giro)}/dia, ${fmtN(prazo, 0)} dias de entrega + ${fmtN(seg, 0)} de segurança).<br>${est <= ponto ? `<b>Hora de pedir:</b> o estoque (${fmtN(est, 0)}) já chegou no ponto.` : `Estoque dura ainda <b>${Math.floor((est - ponto) / giro)} dias</b> até o ponto de pedido.`}`; },
  desconto: (f) => { const preco = n0(f.preco.value), custo = n0(f.custo.value), mm = n0(f.margem.value);
    if (!preco) return 'Informe o preço.';
    const minimo = custo / (1 - mm / 100);
    return `Preço mínimo para ${fmtN(mm)}% de margem: <b>${moeda(minimo)}</b>.<br>Desconto máximo: <b>${fmtN(Math.max(0, (1 - minimo / preco) * 100))}%</b>.`; },
});

export const LADOS = {
  calculos: () => bloco('Markup e margem', 'percent', calc('markup', campoN('custo', 'Custo (R$)', 18.9) + campoN('preco', 'Preço de venda (R$)', 26.9)))
    + bloco('Preço com impostos', 'calculator', calc('impostos', campoN('custo', 'Custo (R$)', 18.9) + campoN('imp', 'Impostos (%)', 8) + campoN('margem', 'Lucro desejado (%)', 20)))
    + bloco('Ponto de pedido', 'package', calc('pedido', campoN('giro', 'Vende por dia (un)', 9) + campoN('prazo', 'Prazo do fornecedor (dias)', 7) + campoN('seguranca', 'Dias de segurança', 3) + campoN('estoque', 'Estoque atual (un)', 120)))
    + bloco('Desconto máximo', 'tag', calc('desconto', campoN('preco', 'Preço (R$)', 26.9) + campoN('custo', 'Custo (R$)', 18.9) + campoN('margem', 'Margem mínima (%)', 15))),
  avisos: (a) => {
    const forn = (id) => a.db.obter('fornecedores', id);
    const baixo = a.db.lista('produtos').filter((p) => total(p) <= Number(p.minimo || 0));
    const porForn = {}; baixo.forEach((p) => { (porForn[p.fornecedor] ||= []).push(p); });
    const vendas = a.db.lista('vendas').filter((v) => v.status !== 'cancelado');
    const ult = {}; vendas.forEach((v) => { if (!ult[v.cliente] || v.data > ult[v.cliente]) ult[v.cliente] = v.data; });
    const semComprar = a.db.lista('clientes').filter((c) => ult[c.id] && diasAte(ult[c.id]) < -60).sort((x, y) => ult[x.id].localeCompare(ult[y.id]));
    const atrasadas = a.db.lista('compras').filter((c) => ['enviado', 'parcial'].includes(c.status) && c.previsao && c.previsao < hoje());
    const vendeu = new Set(vendas.filter((v) => diasAte(v.data) >= -90).flatMap((v) => (v.itens || []).map((i) => i.produto)));
    const parados = a.db.lista('produtos').filter((p) => total(p) > 0 && !vendeu.has(p.id));
    return bloco('Pedido ao fornecedor', 'shopping-cart', `<p>Produtos no mínimo ou abaixo, separados por fornecedor. A quantidade repõe até o dobro do mínimo.</p>${ldLista(Object.entries(porForn).map(([fid, l]) => { const f = forn(fid) || {};
        const texto = `Olá, ${primeiro(f.contato || f.nome)}! Pedido da ${a.empresa}:\n${l.map((p) => `• ${p.nome} (${p.sku || ''}): ${Math.max(Number(p.minimo) * 2 - total(p), Number(p.minimo))} ${p.unidade || 'un'}`).join('\n')}\nObrigado!`;
        return ldItem(esc(f.nome || 'Sem fornecedor'), `${l.length} ${l.length === 1 ? 'produto' : 'produtos'} para pedir`, { dir: zap(f.telefone, texto, 'Pedir') }); }), 'Nenhum produto abaixo do mínimo.')}`)
      + bloco('Clientes sem comprar há 60 dias', 'megaphone', ldLista(semComprar.slice(0, 10).map((c) => ldItem(esc(c.nome), `última compra em ${dataCurta(ult[c.id])}`, {
        dir: zap(c.telefone, `Olá, ${primeiro(c.nome)}! Aqui é da ${a.empresa}. Faz um tempo desde o seu último pedido. Chegaram novidades e temos condição especial nesta semana. Posso te mandar a lista?`, 'Chamar') })), 'Todos os clientes compraram nos últimos 60 dias.'))
      + bloco('Compras atrasadas', 'truck', ldLista(atrasadas.map((c) => { const f = forn(c.fornecedor) || {};
        return ldItem(`Pedido ${c.numero} · ${esc(f.nome || '')}`, `previsão era ${dataCurta(c.previsao)}`, { dir: zap(f.telefone, `Olá, ${primeiro(f.contato || f.nome)}! O pedido ${c.numero} da ${a.empresa} tinha previsão de entrega em ${dataCurta(c.previsao)}. Consegue me passar a nova data?`, 'Cobrar') }); }), 'Nenhuma compra atrasada.'))
      + bloco('Produtos sem venda há 90 dias', 'hourglass', `<p>Dinheiro parado no estoque: vale promoção ou devolver ao fornecedor.</p>${ldLista(parados.slice(0, 10).map((p) => ldItem(esc(p.nome), `${fmtN(total(p), 0)} ${p.unidade || 'un'} em estoque`, { dir: `<b class="num">${moeda(total(p) * Number(p.custo || 0))}</b>` })), 'Todos os produtos venderam nos últimos 90 dias.')}`);
  },
};

export const ITENS = [
  ['markup', 'Markup e margem', 'percent', 'calculos', 'Markup e margem'],
  ['impostos', 'Preço com impostos', 'calculator', 'calculos', 'Preço com impostos'],
  ['pedido', 'Ponto de pedido', 'package', 'calculos', 'Ponto de pedido'],
  ['desconto', 'Desconto máximo', 'tag', 'calculos', 'Desconto máximo'],
  ['fornecedor', 'Pedido ao fornecedor', 'shopping-cart', 'avisos', 'Pedido ao fornecedor'],
  ['clientes', 'Clientes sem comprar', 'megaphone', 'avisos', 'Clientes sem comprar'],
  ['atrasadas', 'Compras atrasadas', 'truck', 'avisos', 'Compras atrasadas'],
  ['parados', 'Produtos parados', 'hourglass', 'avisos', 'Produtos sem venda'],
];
