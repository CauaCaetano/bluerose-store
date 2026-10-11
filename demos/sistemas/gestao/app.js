// Nexo Gestão · estoque, compras e vendas (referências: Bling, Tiny, Omie)
import {
  criarApp, esc, moeda, moedaC, num, pct, hoje, agoraISO, diaMais, mesMais, nomeMes, dataCurta, dataBR, relativo, diasAte, diasEntre, paraData,
  sorteio, soma, agrupar, av, ic, et, prog, telLink, kpis, barras, linhas, rosca, barrasH, DIAS, normal,
  modal, confirmar, avisar, editar, excluir, ficha, props, linhaDoTempo, vazio, pop, imprimir, fecharGaveta,
} from '../base/nexo.js';

const DEP = [['d0', 'CD Principal'], ['d1', 'Loja Centro']];
const nomeDep = (id) => (DEP.find((d) => d[0] === id) || [, '—'])[1];
const VEND = [['marcos', 'Marcos Vieira'], ['julia', 'Júlia Andrade'], ['loja', 'Balcão da loja']];
const nomeV = (id) => (VEND.find((v) => v[0] === id) || [, '—'])[1];
const CANAIS = { balcao: 'Balcão / PDV', representante: 'Representante', ecommerce: 'Loja virtual', marketplace: 'Marketplace' };
const ST_VENDA = [['orcamento', 'Orçamento', '#94a3b8'], ['aprovado', 'Aprovado', '#3b82f6'], ['separacao', 'Em separação', '#f59e0b'], ['faturado', 'Faturado', '#8b5cf6'], ['enviado', 'Enviado', '#0ea5e9'], ['entregue', 'Entregue', '#16a34a'], ['cancelado', 'Cancelado', '#a8a29e']];
const stV = (id) => ST_VENDA.find((x) => x[0] === id) || ST_VENDA[0];
const ST_COMPRA = { rascunho: ['Rascunho', ''], enviado: ['Enviado ao fornecedor', 'info'], parcial: ['Recebido parcial', 'al'], recebido: ['Recebido', 'ok'], cancelado: ['Cancelado', ''] };
const CATEG = ['Mercearia', 'Bebidas', 'Limpeza', 'Higiene', 'Descartáveis', 'Hortifrúti'];
const COR_CAT = ['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#e11d48', '#22a06b'];

// ---------------------------------------------------------------- dados de exemplo (fictícios)
function semente() {
  const r = sorteio(20261011), esc1 = (l) => l[Math.floor(r() * l.length)], ent = (a, b) => a + Math.floor(r() * (b - a + 1));
  const fornecedores = ['Cereais Paraná Ltda', 'Bebidas Sul Distribuidora', 'Química Limpa Ind.', 'Higiene Total Atacado', 'Embalagens Mais', 'Café Serra Azul', 'Laticínios Bom Leite'].map((nome, i) => ({ id: `f${i}`, nome, doc: `${40 + i}.${510 + i}.${620 + i}/0001-${30 + i}`, telefone: `(41) 3${330 + i * 7}-${4100 + i * 19}`, prazo: [7, 10, 14, 5, 7, 10, 3][i], contato: ['Rogério', 'Sandra', 'Felipe', 'Márcia', 'Tiago', 'Helena', 'Otávio'][i] }));
  const base = [
    ['Arroz tipo 1 5 kg', 'Mercearia', 'f0', 18.9, 26.9, 'UN'], ['Feijão carioca 1 kg', 'Mercearia', 'f0', 6.2, 9.49, 'UN'], ['Açúcar refinado 1 kg', 'Mercearia', 'f0', 3.4, 5.29, 'UN'], ['Óleo de soja 900 ml', 'Mercearia', 'f0', 5.1, 7.99, 'UN'], ['Café torrado 500 g', 'Mercearia', 'f5', 13.8, 21.9, 'UN'], ['Macarrão espaguete 500 g', 'Mercearia', 'f0', 2.9, 4.79, 'UN'], ['Farinha de trigo 1 kg', 'Mercearia', 'f0', 3.6, 5.89, 'UN'], ['Leite integral 1 L', 'Mercearia', 'f6', 3.9, 5.79, 'CX'],
    ['Refrigerante cola 2 L', 'Bebidas', 'f1', 5.8, 9.49, 'UN'], ['Água mineral 500 ml (fardo 12)', 'Bebidas', 'f1', 9.6, 16.9, 'FD'], ['Suco de uva 1 L', 'Bebidas', 'f1', 6.9, 11.9, 'UN'], ['Cerveja lata 350 ml (pack 12)', 'Bebidas', 'f1', 31.2, 45.9, 'PK'],
    ['Detergente neutro 500 ml', 'Limpeza', 'f2', 1.6, 2.99, 'UN'], ['Água sanitária 2 L', 'Limpeza', 'f2', 3.2, 5.99, 'UN'], ['Sabão em pó 1,6 kg', 'Limpeza', 'f2', 13.5, 21.9, 'UN'], ['Desinfetante 2 L', 'Limpeza', 'f2', 5.4, 9.9, 'UN'], ['Esponja multiuso (pack 4)', 'Limpeza', 'f2', 3.1, 5.99, 'PK'],
    ['Papel higiênico 12 rolos', 'Higiene', 'f3', 12.9, 19.9, 'PK'], ['Sabonete 90 g', 'Higiene', 'f3', 1.3, 2.49, 'UN'], ['Creme dental 90 g', 'Higiene', 'f3', 2.8, 4.99, 'UN'], ['Shampoo 350 ml', 'Higiene', 'f3', 8.9, 15.9, 'UN'],
    ['Copo descartável 200 ml (100 un)', 'Descartáveis', 'f4', 4.2, 7.49, 'PC'], ['Guardanapo (pacote 50)', 'Descartáveis', 'f4', 1.9, 3.49, 'PC'], ['Saco de lixo 100 L (pacote 10)', 'Descartáveis', 'f4', 5.6, 9.9, 'PC'],
  ];
  const produtos = base.map(([nome, categoria, fornecedor, custo, preco, unidade], i) => {
    const giro = [9, 6, 5, 6, 4, 5, 3, 8, 7, 5, 3, 4, 6, 4, 3, 3, 2, 5, 3, 3, 2, 2, 2, 3][i];
    return { id: `p${i}`, sku: `${categoria.slice(0, 3).toUpperCase()}-${String(100 + i)}`, ean: `789${String(1000000000 + i * 7919337).slice(0, 10)}`, nome, categoria, fornecedor, custo, preco, unidade, giro, minimo: giro * 8, localizacao: `${String.fromCharCode(65 + (i % 5))}-${String(1 + (i % 9)).padStart(2, '0')}`,
      estoque: { d0: Math.max(0, Math.round(giro * ent(4, 22) - (i === 5 || i === 16 ? 200 : 0))), d1: Math.max(0, Math.round(giro * ent(1, 5) - (i === 12 ? 60 : 0))) } };
  });
  const clientes = ['Mercado Bom Preço', 'Mercearia do Zé', 'Restaurante Sabor Caseiro', 'Padaria Trigo Bom', 'Hotel Alvorada', 'Lanchonete Ponto Certo', 'Escola Pequeno Saber', 'Condomínio Jardim das Flores', 'Supermercado Família', 'Cantina Universitária', 'Bar do Português', 'Empório Natural'].map((nome, i) => ({ id: `c${i}`, nome, doc: `${20 + i}.${310 + i}.${420 + i}/0001-${40 + i}`, telefone: `(41) 9${8500 + i * 31}-${2200 + i * 43}`, cidade: esc1(['Curitiba/PR', 'São José dos Pinhais/PR', 'Colombo/PR', 'Pinhais/PR']), vendedor: VEND[i % 2][0], limite: ent(5, 30) * 1000 }));
  const vendas = [], movimentos = [];
  let nv = 4100;
  for (let d = -120; d <= 0; d++) {
    const data = diaMais(d), dow = paraData(data).getDay(); if (dow === 0) continue;
    const qtd = dow === 6 ? ent(1, 3) : ent(2, 6);
    for (let k = 0; k < qtd; k++) {
      const canal = esc1(['representante', 'representante', 'balcao', 'balcao', 'ecommerce', 'marketplace']);
      const cli = canal === 'balcao' ? null : esc1(clientes);
      const itens = Array.from({ length: canal === 'representante' ? ent(3, 8) : ent(1, 4) }, () => { const p = esc1(produtos); return { produto: p.id, qtd: canal === 'representante' ? ent(12, 60) : ent(1, 6), preco: canal === 'representante' ? Math.round(p.preco * 0.92 * 100) / 100 : p.preco, custo: p.custo }; })
        .filter((x, i, l) => l.findIndex((y) => y.produto === x.produto) === i);
      let status = d < -6 ? (r() < 0.04 ? 'cancelado' : 'entregue') : d < -2 ? esc1(['entregue', 'enviado', 'faturado']) : esc1(['orcamento', 'aprovado', 'aprovado', 'separacao', 'faturado', 'entregue']);
      if (canal === 'balcao') status = 'entregue';
      const v = { id: `v${vendas.length}`, numero: nv++, cliente: cli?.id || null, canal, vendedor: canal === 'balcao' ? 'loja' : cli?.vendedor || 'marcos', data, itens, frete: canal === 'ecommerce' || canal === 'marketplace' ? ent(12, 35) : 0, desconto: 0, deposito: canal === 'balcao' ? 'd1' : 'd0', status, pagamento: esc1(['Boleto 28 dias', 'PIX', 'Cartão de crédito', 'Boleto 14/28 dias']) };
      if (['faturado', 'enviado', 'entregue'].includes(status)) { v.nfe = { numero: 18000 + vendas.length, chave: `4126${String(10).padStart(2, '0')}${String(2345678900 + vendas.length * 97).padStart(10, '0')}55001${String(18000 + vendas.length).padStart(9, '0')}`, emissao: data }; if (status !== 'faturado') v.rastreio = canal === 'ecommerce' || canal === 'marketplace' ? `BR${ent(100000000, 999999999)}BR` : 'Entrega própria'; }
      vendas.push(v);
    }
  }
  // estoque coerente com o giro real das vendas (cobertura de 2 a 6 semanas, alguns itens críticos)
  produtos.forEach((p, i) => {
    const vend = vendas.filter((v) => v.status !== 'cancelado' && diasAte(v.data) > -30).flatMap((v) => v.itens).filter((x) => x.produto === p.id);
    const dia = Math.max(0.3, vend.reduce((s, x) => s + x.qtd, 0) / 30);
    p.giro = Math.max(1, Math.round(dia)); p.minimo = Math.max(6, Math.ceil(dia * 7));
    p.estoque = { d0: Math.round(dia * ent(16, 42)), d1: Math.round(dia * ent(3, 7)) };
  });
  produtos[5].estoque = { d0: 0, d1: 0 }; produtos[16].estoque = { d0: Math.ceil(produtos[16].minimo * 0.4), d1: 0 }; produtos[12].estoque.d1 = 0; produtos[20].estoque = { d0: Math.ceil(produtos[20].minimo * 0.7), d1: 0 };
  const compras = []; let nc = 820;
  for (let i = 0; i < 26; i++) {
    const f = fornecedores[i % fornecedores.length], d = -ent(2, 120);
    const ps = produtos.filter((p) => p.fornecedor === f.id).slice(0, ent(2, 5));
    const st = d < -14 ? 'recebido' : esc1(['enviado', 'enviado', 'parcial', 'rascunho']);
    const itens = ps.map((p) => { const q = p.giro * ent(12, 25); return { produto: p.id, qtd: q, custo: p.custo, recebido: st === 'recebido' ? q : st === 'parcial' ? Math.floor(q / 2) : 0 }; });
    if (itens.length) compras.push({ id: `oc${i}`, numero: nc++, fornecedor: f.id, data: diaMais(d), previsao: diaMais(d + f.prazo), deposito: 'd0', status: st, itens, frete: ent(0, 1) ? ent(40, 180) : 0 });
  }
  // kardex: entradas de compras recebidas e saídas de vendas faturadas (resumido)
  compras.filter((c) => c.status !== 'rascunho').forEach((c) => c.itens.filter((x) => x.recebido).forEach((x) => movimentos.push({ produto: x.produto, deposito: c.deposito, tipo: 'entrada', qtd: x.recebido, motivo: `Compra #${c.numero}`, data: `${c.previsao}T10:00`, custo: x.custo })));
  vendas.filter((v) => v.nfe && diasAte(v.data) > -40).forEach((v) => v.itens.forEach((x) => movimentos.push({ produto: x.produto, deposito: v.deposito, tipo: 'saida', qtd: x.qtd, motivo: `${v.canal === 'balcao' ? 'Cupom' : 'NF-e'} ${v.nfe.numero} · pedido #${v.numero}`, data: `${v.data}T${String(ent(8, 18)).padStart(2, '0')}:${esc1(['05', '20', '40'])}` })));
  movimentos.push({ produto: 'p3', deposito: 'd0', tipo: 'ajuste', qtd: -3, motivo: 'Avaria (embalagem furada)', data: `${diaMais(-6)}T15:00` }, { produto: 'p9', deposito: 'd1', tipo: 'transferencia', qtd: 20, motivo: 'Transferência CD Principal → Loja Centro', data: `${diaMais(-3)}T09:30` });
  return { _cfg: { empresa: 'Atlas Distribuidora', endereco: 'Rod. BR-116, 15.400 · Barracão 3 · Curitiba/PR', cnpj: '45.678.901/0001-32', telefone: '(41) 3029-7700' }, produtos, fornecedores, clientes, vendas, compras, movimentos };
}

// ---------------------------------------------------------------- regras
const prod = (a, id) => a.db.obter('produtos', id);
const cli = (a, id) => a.db.obter('clientes', id);
const forn = (a, id) => a.db.obter('fornecedores', id);
const estTotal = (p) => soma(Object.values(p.estoque || {}));
const totalV = (v) => soma(v.itens, (x) => x.qtd * x.preco) - (v.desconto || 0) + (v.frete || 0);
const custoV = (v) => soma(v.itens, (x) => x.qtd * (x.custo || 0));
const faturadas = (a) => a.db.lista('vendas').filter((v) => ['faturado', 'enviado', 'entregue'].includes(v.status));
const totalC = (c) => soma(c.itens, (x) => x.qtd * x.custo) + (c.frete || 0);
const vendidoQtd = (a, pid, dias = 30) => soma(faturadas(a).filter((v) => diasAte(v.data) > -dias).flatMap((v) => v.itens).filter((x) => x.produto === pid), (x) => x.qtd);
const cobertura = (a, p) => { const dia = vendidoQtd(a, p.id, 30) / 30; return dia ? Math.floor(estTotal(p) / dia) : 999; };
const situacaoEst = (a, p) => (estTotal(p) <= 0 ? ['Sem estoque', 'er'] : estTotal(p) <= p.minimo ? ['Abaixo do mínimo', 'al'] : ['Normal', 'ok']);
const etV = (v) => { const [, n, c] = stV(v.status); return `<span class="et sem-ponto" style="background:color-mix(in srgb,${c} 14%,var(--painel));color:${c}">${n}</span>`; };
function movimentar(a, { produto, deposito, qtd, tipo, motivo, custo }) {
  const p = prod(a, produto); const est = { ...p.estoque }; est[deposito] = (est[deposito] || 0) + (tipo === 'saida' ? -qtd : qtd);
  a.db.salvar('produtos', { id: produto, estoque: est, ...(custo && tipo === 'entrada' ? { custo: Math.round((((p.custo * Math.max(0, estTotal(p))) + custo * qtd) / Math.max(1, estTotal(p) + qtd)) * 100) / 100 } : {}) });
  a.db.lista('movimentos').unshift({ id: `m${Date.now()}${Math.random().toString(36).slice(2, 5)}`, produto, deposito, tipo, qtd: tipo === 'ajuste' ? qtd : Math.abs(qtd), motivo, data: agoraISO(), custo }); a.db.gravar();
}
function curvaABC(a, dias = 90) {
  const rec = a.db.lista('produtos').map((p) => ({ p, v: soma(faturadas(a).filter((v) => diasAte(v.data) > -dias).flatMap((v) => v.itens).filter((x) => x.produto === p.id), (x) => x.qtd * x.preco) })).sort((x, y) => y.v - x.v);
  const tot = soma(rec, (x) => x.v) || 1; let acc = 0;
  return rec.map((x) => { acc += x.v; const pc = (acc / tot) * 100; return { ...x, part: (x.v / tot) * 100, acc: pc, classe: pc <= 80 ? 'A' : pc <= 95 ? 'B' : 'C' }; });
}

// ---------------------------------------------------------------- coleções
const colecoes = {
  produtos: { singular: 'produto', plural: 'produtos', largura: 680, tres: true, campos: [
    { nome: 'nome', rotulo: 'Descrição', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'sku', rotulo: 'Código (SKU)', tipo: 'texto', obrigatorio: true }, { nome: 'ean', rotulo: 'Código de barras (EAN)', tipo: 'texto' },
    { nome: 'categoria', rotulo: 'Categoria', tipo: 'selecao', opcoes: CATEG, obrigatorio: true }, { nome: 'unidade', rotulo: 'Unidade', tipo: 'selecao', opcoes: ['UN', 'CX', 'PK', 'FD', 'PC', 'KG'], padrao: 'UN' }, { nome: 'fornecedor', rotulo: 'Fornecedor', tipo: 'relacao', colecao: 'fornecedores' },
    { nome: 'custo', rotulo: 'Custo', tipo: 'moeda', obrigatorio: true }, { nome: 'preco', rotulo: 'Preço de venda', tipo: 'moeda', obrigatorio: true }, { nome: 'minimo', rotulo: 'Estoque mínimo', tipo: 'numero', padrao: 10 }, { nome: 'localizacao', rotulo: 'Localização', tipo: 'texto', dica: 'Ex.: A-03' }],
    validar: (d) => (d.preco < d.custo ? 'O preço de venda está abaixo do custo' : null), antesDeSalvar: (d, a, antes) => ({ ...d, estoque: antes?.estoque || { d0: 0, d1: 0 }, giro: antes?.giro || 2 }) },
  clientes: { singular: 'cliente', plural: 'clientes', campos: [{ nome: 'nome', rotulo: 'Razão social / nome', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'doc', rotulo: 'CNPJ / CPF', tipo: 'texto' }, { nome: 'telefone', rotulo: 'Telefone', tipo: 'tel' }, { nome: 'cidade', rotulo: 'Cidade', tipo: 'texto' }, { nome: 'vendedor', rotulo: 'Vendedor', tipo: 'selecao', opcoes: VEND.slice(0, 2).map((v) => [v[0], v[1]]) }, { nome: 'limite', rotulo: 'Limite de crédito', tipo: 'moeda' }] },
  fornecedores: { singular: 'fornecedor', plural: 'fornecedores', campos: [{ nome: 'nome', rotulo: 'Razão social', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'doc', rotulo: 'CNPJ', tipo: 'texto' }, { nome: 'telefone', rotulo: 'Telefone', tipo: 'tel' }, { nome: 'contato', rotulo: 'Contato', tipo: 'texto' }, { nome: 'prazo', rotulo: 'Prazo de entrega (dias)', tipo: 'numero', padrao: 7 }] },
};

// ---------------------------------------------------------------- páginas
function painel(a) {
  const ym = hoje().slice(0, 7), fat = faturadas(a), mes = fat.filter((v) => v.data.startsWith(ym)), ant = fat.filter((v) => v.data.startsWith(mesMais(-1)) && Number(v.data.slice(8)) <= new Date().getDate());
  const vMes = soma(mes, totalV), marg = vMes ? ((vMes - soma(mes, custoV)) / vMes) * 100 : 0;
  const ps = a.db.lista('produtos'), ruptura = ps.filter((p) => estTotal(p) <= 0), baixo = ps.filter((p) => estTotal(p) > 0 && estTotal(p) <= p.minimo);
  const separar = a.db.lista('vendas').filter((v) => ['aprovado', 'separacao'].includes(v.status));
  const dias = Array.from({ length: 30 }, (_, i) => diaMais(i - 29));
  const top = ps.map((p) => ({ p, v: soma(mes.flatMap((v) => v.itens).filter((x) => x.produto === p.id), (x) => x.qtd * x.preco) })).sort((x, y) => y.v - x.v).slice(0, 6);
  const chegando = a.db.lista('compras').filter((c) => ['enviado', 'parcial'].includes(c.status)).sort((x, y) => x.previsao.localeCompare(y.previsao));
  return `${kpis([
    { rot: 'Vendas no mês', icone: 'shopping-cart', val: moeda(vMes), var: soma(ant, totalV) ? ((vMes - soma(ant, totalV)) / soma(ant, totalV)) * 100 : null, nota: `${mes.length} pedidos faturados`, spark: dias.map((d) => soma(fat.filter((v) => v.data === d), totalV)) },
    { rot: 'Margem bruta', icone: 'percent', val: pct(marg, 1), nota: `lucro bruto ${moedaC(vMes - soma(mes, custoV))}` },
    { rot: 'Estoque (a custo)', icone: 'warehouse', val: moeda(soma(ps, (p) => p.custo * estTotal(p))), nota: `${num(soma(ps, estTotal))} unidades em ${DEP.length} depósitos` },
    { rot: 'Itens para repor', icone: 'warning', val: num(ruptura.length + baixo.length), alerta: ruptura.length > 0, nota: `${ruptura.length} sem estoque · ${baixo.length} abaixo do mínimo` },
  ])}
  <div class="grade g21"><div class="cartao"><div class="cartao-cab"><div><h3>Vendas · últimos 30 dias</h3><div class="sub">Por canal</div></div><a class="btn peq" href="#/relatorios">Relatórios</a></div><div class="cartao-corpo">${barras({ dados: dias.filter((_, i) => i % 1 === 0).map((d) => ({ rot: String(Number(d.slice(8))), v: Object.keys(CANAIS).map((c) => soma(fat.filter((v) => v.data === d && v.canal === c), totalV)) })), series: Object.values(CANAIS).map((n, i) => ({ nome: n, cor: ['#4f46e5', '#0ea5e9', '#14b8a6', '#f59e0b'][i] })), empilhado: true, fmt: moedaC, altura: 220 })}</div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Para separar e faturar</h3><div class="sub">${separar.length} pedidos aprovados</div></div><a class="btn peq" href="#/vendas">Pedidos</a></div>${separar.length ? `<ul class="lista">${separar.slice(0, 7).map((v) => `<li class="clicavel" data-abrir="venda:${v.id}"><span class="mono mute-2">#${v.numero}</span><div class="cresce"><div class="t corta">${esc(cli(a, v.cliente)?.nome || 'Consumidor')}</div><div class="s">${v.itens.length} itens · ${esc(CANAIS[v.canal])}</div></div>${etV(v)}<b class="num" style="font-size:12.5px">${moedaC(totalV(v))}</b></li>`).join('')}</ul>` : vazio('check-circle', 'Nada para separar')}</div></div>
  <div class="grade g3"><div class="cartao"><div class="cartao-cab"><div><h3>Mais vendidos no mês</h3></div></div><div class="cartao-corpo">${barrasH(top.map(({ p, v }) => ({ rot: p.nome, v })), { fmt: moedaC })}</div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Repor estoque</h3><div class="sub">Sem estoque ou abaixo do mínimo</div></div><a class="btn peq" href="#/sugestao">Sugestão de compra</a></div>${ruptura.length + baixo.length ? `<ul class="lista">${[...ruptura, ...baixo].slice(0, 6).map((p) => `<li class="clicavel" data-abrir="produto:${p.id}"><div class="cresce"><div class="t corta">${esc(p.nome)}</div><div class="s mono">${esc(p.sku)}</div></div>${et(`${estTotal(p)} ${p.unidade}`, estTotal(p) <= 0 ? 'er' : 'al')}</li>`).join('')}</ul>` : vazio('check-circle', 'Estoque em dia')}</div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Compras a caminho</h3></div><a class="btn peq" href="#/compras">Compras</a></div>${chegando.length ? `<ul class="lista">${chegando.slice(0, 6).map((c) => `<li class="clicavel" data-abrir="compra:${c.id}"><span class="mono mute-2">#${c.numero}</span><div class="cresce"><div class="t corta">${esc(forn(a, c.fornecedor)?.nome || '')}</div><div class="s ${c.previsao < hoje() ? 'er-tx' : ''}">previsão ${relativo(c.previsao)}</div></div><b class="num" style="font-size:12.5px">${moedaC(totalC(c))}</b></li>`).join('')}</ul>` : vazio('truck', 'Nenhuma compra a caminho')}</div></div>`;
}

function vendas(a) {
  return a.tab({ id: 'vendas', colecao: 'vendas', singular: 'pedido', plural: 'pedidos', ordem: 'numero', desc: true, buscaDica: 'Buscar por número, cliente ou NF-e…',
    visoes: [{ id: 'abertos', rot: 'Em andamento', filtro: (v) => ['orcamento', 'aprovado', 'separacao', 'faturado', 'enviado'].includes(v.status) }, { id: 'separar', rot: 'Para separar', filtro: (v) => ['aprovado', 'separacao'].includes(v.status) }, { id: 'orc', rot: 'Orçamentos', filtro: (v) => v.status === 'orcamento' }, { id: 'mes', rot: 'Faturados no mês', filtro: (v) => v.nfe && v.data.startsWith(hoje().slice(0, 7)) }, { id: 'todos', rot: 'Todos' }],
    filtros: [{ k: 'canal', rot: 'Canal', opcoes: Object.entries(CANAIS) }, { k: 'vendedor', rot: 'Vendedor', opcoes: VEND.map((v) => [v[0], v[1]]) }, { k: 'status', rot: 'Situação', opcoes: ST_VENDA.map(([k, n]) => [k, n]) }],
    textoBusca: (v) => `${v.numero} ${cli(a, v.cliente)?.nome || ''} ${v.nfe?.numero || ''}`, total: (l) => moeda(soma(l, totalV)),
    novo: { rot: 'Novo pedido', attrs: 'data-acao="novoPedido"' }, aoClicar: (id) => a.abrir('venda', id),
    massa: [{ rot: 'Faturar (emitir NF-e)', icone: 'receipt', acao: (ids) => { let n = 0; ids.forEach((id) => { if (faturar(a, id, true)) n++; }); avisar(`${n} pedidos faturados`); } }],
    colunas: [{ k: 'numero', rot: 'Pedido', render: (v) => `<span class="mono prim">#${v.numero}</span><span class="sub">${dataCurta(v.data)}</span>` }, { k: 'cliente', rot: 'Cliente', valor: (v) => cli(a, v.cliente)?.nome || 'Consumidor', render: (v) => `<span class="prim corta" style="max-width:220px;display:block">${esc(cli(a, v.cliente)?.nome || 'Consumidor final')}</span><span class="sub">${esc(CANAIS[v.canal])}</span>` },
      { k: 'itens', rot: 'Itens', n: true, oc: true, valor: (v) => v.itens.length, render: (v) => num(v.itens.length) }, { k: 'vendedor', rot: 'Vendedor', oc: true, valor: (v) => nomeV(v.vendedor), render: (v) => `<span class="flex">${av(nomeV(v.vendedor), 'p')}${esc(nomeV(v.vendedor).split(' ')[0])}</span>` },
      { k: 'nfe', rot: 'NF-e', oc: true, valor: (v) => v.nfe?.numero || 0, render: (v) => (v.nfe ? `<span class="mono">${v.nfe.numero}</span>` : '<span class="mute">—</span>') },
      { k: 'status', rot: 'Situação', valor: (v) => ST_VENDA.findIndex((x) => x[0] === v.status), render: etV, csv: (v) => stV(v.status)[1] }, { k: 'total', rot: 'Total', n: true, valor: totalV, render: (v) => moeda(totalV(v)) }] });
}

function pdv(a) {
  const st = a.estado.pdv ||= { itens: [], desc: 0, pag: 'pix', busca: '' };
  const tb = a.estado['tab:pdvbusca'] ||= { busca: '', pagina: 0, filtros: {}, sel: [] };
  const ps = a.db.lista('produtos').filter((p) => !tb.busca || normal(`${p.nome} ${p.sku} ${p.ean}`).includes(normal(tb.busca))).slice(0, 24);
  const sub = soma(st.itens, (x) => x.qtd * x.preco), tot = Math.max(0, sub - st.desc);
  return `<div class="pdv"><div class="col" style="gap:12px"><div class="cartao"><div class="cartao-corpo flex"><label class="caixa-busca cresce">${ic('barcode')}<input type="search" placeholder="Leia o código de barras ou digite o nome / SKU e Enter" value="${esc(tb.busca)}" data-tab-busca="pdvbusca" data-pdv-busca autofocus style="height:40px;font-size:15px"></label></div></div>
      <div class="prod-grade">${ps.map((p) => `<button type="button" class="prod-bt" data-acao="pdvAdd" data-id="${p.id}" ${a.db.obter('produtos', p.id).estoque.d1 <= 0 ? 'style="opacity:.55"' : ''}><b>${esc(p.nome)}</b><span class="mono">${esc(p.sku)} · loja: ${p.estoque.d1 || 0}</span><span class="pr">${moeda(p.preco)}</span></button>`).join('') || vazio('magnifying-glass', 'Nenhum produto encontrado')}</div></div>
    <div class="cartao carrinho"><div class="cartao-cab"><div><h3>Venda no balcão</h3><div class="sub">Loja Centro · saída do estoque da loja</div></div>${st.itens.length ? `<button type="button" class="btn fant peq" data-acao="pdvLimpar">${ic('trash')}Limpar</button>` : ''}</div>
      ${st.itens.length ? st.itens.map((x, i) => `<div class="item"><div class="corta"><div style="font-weight:500" class="corta">${esc(prod(a, x.produto).nome)}</div><div class="mute" style="font-size:12px">${moeda(x.preco)} / ${esc(prod(a, x.produto).unidade)}</div></div><div class="qtd"><button type="button" data-acao="pdvQtd" data-i="${i}" data-d="-1" aria-label="Menos">−</button><span>${x.qtd}</span><button type="button" data-acao="pdvQtd" data-i="${i}" data-d="1" aria-label="Mais">+</button></div><b class="num" style="min-width:80px;text-align:right">${moeda(x.qtd * x.preco)}</b></div>`).join('') : `<div style="padding:16px">${vazio('barcode', 'Nenhum item', 'Leia um código de barras ou toque nos produtos.')}</div>`}
      <div class="cartao-corpo col" style="gap:10px;border-top:1px solid var(--borda)"><div class="entre"><span class="mute-2">Subtotal (${soma(st.itens, (x) => x.qtd)} itens)</span><span class="num">${moeda(sub)}</span></div>
        <div class="entre"><span class="mute-2">Desconto</span><div class="prefixo" style="width:130px"><span>R$</span><input type="number" min="0" step="0.5" value="${st.desc}" data-mudar="pdvDesc" style="height:28px;text-align:right"></div></div>
        <div class="entre"><b>Total</b><span class="total-grande">${moeda(tot)}</span></div>
        <div class="pagamentos">${[['pix', 'PIX', 'qr-code'], ['credito', 'Crédito', 'credit-card'], ['debito', 'Débito', 'credit-card'], ['dinheiro', 'Dinheiro', 'money']].map(([k, n, i]) => `<button type="button" data-acao="pdvPag" data-p="${k}" aria-pressed="${st.pag === k}">${ic(i)}${n}</button>`).join('')}</div>
        <button type="button" class="btn pri ok" style="height:44px;font-size:14.5px" data-acao="pdvFinalizar" ${st.itens.length ? '' : 'disabled'}>${ic('check-circle')}Finalizar venda · ${moeda(tot)}</button></div></div></div>`;
}

function compras(a) {
  return a.tab({ id: 'compras', colecao: 'compras', singular: 'pedido de compra', plural: 'pedidos de compra', ordem: 'numero', desc: true,
    visoes: [{ id: 'abertas', rot: 'A receber', filtro: (c) => ['enviado', 'parcial'].includes(c.status) }, { id: 'rasc', rot: 'Rascunhos', filtro: (c) => c.status === 'rascunho' }, { id: 'atrasadas', rot: 'Atrasadas', filtro: (c) => ['enviado', 'parcial'].includes(c.status) && c.previsao < hoje() }, { id: 'todas', rot: 'Todas' }],
    filtros: [{ k: 'fornecedor', rot: 'Fornecedor', opcoes: (aa) => aa.db.lista('fornecedores').map((f) => [f.id, f.nome]) }],
    textoBusca: (c) => `${c.numero} ${forn(a, c.fornecedor)?.nome}`, total: (l) => moeda(soma(l, totalC)),
    novo: { rot: 'Nova compra', attrs: 'data-acao="novaCompra"' }, aoClicar: (id) => a.abrir('compra', id),
    colunas: [{ k: 'numero', rot: 'Pedido', render: (c) => `<span class="mono prim">#${c.numero}</span><span class="sub">${dataCurta(c.data)}</span>` }, { k: 'fornecedor', rot: 'Fornecedor', valor: (c) => forn(a, c.fornecedor)?.nome, render: (c) => esc(forn(a, c.fornecedor)?.nome || '—') },
      { k: 'previsao', rot: 'Previsão', render: (c) => `<span class="${['enviado', 'parcial'].includes(c.status) && c.previsao < hoje() ? 'er-tx' : ''}">${dataCurta(c.previsao)}</span>` },
      { k: 'receb', rot: 'Recebido', oc: true, valor: (c) => soma(c.itens, (x) => x.recebido) / (soma(c.itens, (x) => x.qtd) || 1), render: (c) => `<div style="min-width:110px">${prog((soma(c.itens, (x) => x.recebido) / (soma(c.itens, (x) => x.qtd) || 1)) * 100, c.status === 'recebido' ? 'ok' : '')}</div>` },
      { k: 'status', rot: 'Situação', valor: (c) => c.status, render: (c) => et(...ST_COMPRA[c.status]), csv: (c) => ST_COMPRA[c.status][0] }, { k: 'total', rot: 'Total', n: true, valor: totalC, render: (c) => moeda(totalC(c)) }] });
}

function sugestao(a) {
  const ps = a.db.lista('produtos').map((p) => { const dia = vendidoQtd(a, p.id, 30) / 30; const chegando = soma(a.db.lista('compras').filter((c) => ['enviado', 'parcial'].includes(c.status)).flatMap((c) => c.itens).filter((x) => x.produto === p.id), (x) => x.qtd - x.recebido); const alvo = Math.ceil(dia * 30 + p.minimo); return { p, dia, chegando, sugerido: Math.max(0, alvo - estTotal(p) - chegando) }; }).filter((x) => x.sugerido > 0 && (estTotal(x.p) <= x.p.minimo || cobertura(a, x.p) < 15));
  const porF = agrupar(ps, (x) => x.p.fornecedor);
  return `<div class="dica">${ic('lightning')}<span>A sugestão olha a venda média dos últimos 30 dias, o estoque atual, o que já está a caminho e o estoque mínimo, e calcula quanto comprar para cobrir os próximos 30 dias.</span></div>
    ${Object.keys(porF).length ? Object.entries(porF).map(([fid, l]) => `<div class="cartao"><div class="cartao-cab"><div><h3>${esc(forn(a, fid)?.nome || 'Sem fornecedor')}</h3><div class="sub">Entrega em ${forn(a, fid)?.prazo || '—'} dias · ${l.length} produtos · ${moeda(soma(l, (x) => x.sugerido * x.p.custo))}</div></div><button type="button" class="btn pri" data-acao="gerarCompra" data-f="${fid}">${ic('shopping-cart')}Gerar pedido de compra</button></div>
      <div class="tabela-caixa"><table class="tabela"><thead><tr><th>Produto</th><th class="n">Estoque</th><th class="n oc">Mínimo</th><th class="n oc">Venda/dia</th><th class="n oc">Chegando</th><th class="n">Comprar</th><th class="n">Custo</th></tr></thead><tbody>${l.map((x) => `<tr><td><span class="prim">${esc(x.p.nome)}</span><span class="sub mono">${esc(x.p.sku)}</span></td><td class="n">${estTotal(x.p) <= 0 ? et('0', 'er') : estTotal(x.p)}</td><td class="n oc">${x.p.minimo}</td><td class="n oc">${num(x.dia, 1)}</td><td class="n oc">${x.chegando || '—'}</td><td class="n"><b>${x.sugerido} ${esc(x.p.unidade)}</b></td><td class="n">${moeda(x.sugerido * x.p.custo)}</td></tr>`).join('')}</tbody></table></div></div>`).join('') : `<div class="cartao">${vazio('check-circle', 'Nada para comprar agora', 'O estoque cobre os próximos 30 dias.')}</div>`}`;
}

function produtos(a) {
  return a.tab({ id: 'produtos', colecao: 'produtos', singular: 'produto', plural: 'produtos', ordem: 'nome', buscaDica: 'Buscar por nome, SKU ou código de barras…',
    visoes: [{ id: 'todos', rot: 'Todos' }, { id: 'repor', rot: 'Repor', filtro: (p) => estTotal(p) <= p.minimo }, { id: 'zerado', rot: 'Sem estoque', filtro: (p) => estTotal(p) <= 0 }, { id: 'parado', rot: 'Parados (sem venda 30 dias)', filtro: (p) => vendidoQtd(a, p.id, 30) === 0 }],
    filtros: [{ k: 'categoria', rot: 'Categoria', opcoes: CATEG }, { k: 'fornecedor', rot: 'Fornecedor', opcoes: (aa) => aa.db.lista('fornecedores').map((f) => [f.id, f.nome]) }],
    textoBusca: (p) => `${p.nome} ${p.sku} ${p.ean}`, novo: { rot: 'Novo produto', attrs: 'data-acao="novoProduto"' }, aoClicar: (id) => a.abrir('produto', id),
    total: (l) => `${moedaC(soma(l, (p) => p.custo * estTotal(p)))} em estoque`,
    colunas: [{ k: 'nome', rot: 'Produto', render: (p) => `<span class="prim">${esc(p.nome)}</span><span class="sub"><span class="mono">${esc(p.sku)}</span> · ${esc(p.categoria)}</span>` },
      { k: 'preco', rot: 'Preço', n: true, render: (p) => moeda(p.preco) }, { k: 'margem', rot: 'Margem', n: true, oc: true, valor: (p) => (p.preco - p.custo) / p.preco, render: (p) => pct(((p.preco - p.custo) / p.preco) * 100) },
      ...DEP.map(([id, n]) => ({ k: `e_${id}`, rot: n.split(' ')[0] === 'CD' ? 'CD' : 'Loja', n: true, oc: true, valor: (p) => p.estoque[id] || 0, render: (p) => num(p.estoque[id] || 0) })),
      { k: 'total', rot: 'Estoque', n: true, valor: estTotal, render: (p) => { const [t, tom] = situacaoEst(a, p); return tom === 'ok' ? `${num(estTotal(p))} ${esc(p.unidade)}` : et(`${num(estTotal(p))} ${p.unidade}`, tom); } },
      { k: 'cob', rot: 'Cobertura', n: true, oc: true, valor: (p) => cobertura(a, p), render: (p) => { const c = cobertura(a, p); return c >= 999 ? '<span class="mute">sem giro</span>' : `<span class="${c < 10 ? 'er-tx' : c < 20 ? 'al-tx' : ''}">${c} dias</span>`; } }] });
}

function estoque(a) {
  const st = a.estado.mov ||= {};
  return `<div class="entre"><div class="dica" style="flex:1">${ic('info')}<span>Kardex: toda entrada, saída, ajuste e transferência fica registrada com data, motivo e responsável.</span></div><div class="flex"><button type="button" class="btn" data-acao="transferir">${ic('arrows-left-right')}Transferir</button><button type="button" class="btn" data-acao="ajustar">${ic('pencil-simple')}Ajuste</button><a class="btn pri" href="#/inventario">${ic('list-checks')}Inventário</a></div></div>`
    + a.tab({ id: 'movimentos', colecao: 'movimentos', singular: 'movimento', plural: 'movimentos', ordem: 'data', desc: true, porPagina: 30,
      visoes: [{ id: 'todos', rot: 'Todos' }, { id: 'entrada', rot: 'Entradas', filtro: (m) => m.tipo === 'entrada' }, { id: 'saida', rot: 'Saídas', filtro: (m) => m.tipo === 'saida' }, { id: 'ajuste', rot: 'Ajustes e transferências', filtro: (m) => ['ajuste', 'transferencia'].includes(m.tipo) }],
      filtros: [{ k: 'deposito', rot: 'Depósito', opcoes: DEP }], textoBusca: (m) => `${prod(a, m.produto)?.nome} ${m.motivo}`, aoClicar: (id) => a.abrir('produto', a.db.obter('movimentos', id).produto, 'kardex'),
      colunas: [{ k: 'data', rot: 'Data', render: (m) => `${dataCurta(m.data)} <span class="mute">${m.data.slice(11, 16)}</span>` }, { k: 'produto', rot: 'Produto', valor: (m) => prod(a, m.produto)?.nome, render: (m) => `<span class="prim">${esc(prod(a, m.produto)?.nome || '—')}</span>` },
        { k: 'tipo', rot: 'Tipo', render: (m) => ({ entrada: et('Entrada', 'ok'), saida: et('Saída', 'er'), ajuste: et('Ajuste', 'al'), transferencia: et('Transferência', 'info') })[m.tipo] },
        { k: 'qtd', rot: 'Qtd.', n: true, valor: (m) => (m.tipo === 'saida' ? -m.qtd : m.qtd), render: (m) => `<b class="${m.tipo === 'saida' || m.qtd < 0 ? 'er-tx' : 'ok-tx'}">${m.tipo === 'saida' ? '−' : m.qtd > 0 ? '+' : ''}${num(m.qtd)}</b>` },
        { k: 'deposito', rot: 'Depósito', oc: true, valor: (m) => nomeDep(m.deposito), render: (m) => esc(nomeDep(m.deposito)) }, { k: 'motivo', rot: 'Motivo', oc: true, render: (m) => `<span class="mute-2">${esc(m.motivo)}</span>` }] });
}

function inventario(a) {
  const st = a.estado.inv ||= { dep: 'd0', cat: 'Limpeza', cont: {} };
  const ps = a.db.lista('produtos').filter((p) => p.categoria === st.cat);
  const difs = ps.filter((p) => st.cont[p.id] !== undefined && st.cont[p.id] !== '' && Number(st.cont[p.id]) !== (p.estoque[st.dep] || 0));
  return `<div class="entre"><div class="flex"><select data-mudar="invDep" style="width:auto">${DEP.map(([id, n]) => `<option value="${id}" ${id === st.dep ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><select data-mudar="invCat" style="width:auto">${CATEG.map((c) => `<option ${c === st.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="flex"><button type="button" class="btn" data-acao="imprimirInv">${ic('printer')}Folha de contagem</button><button type="button" class="btn pri" data-acao="aplicarInv" ${difs.length ? '' : 'disabled'}>${ic('check')}Aplicar ${difs.length} ajustes</button></div></div>
    <div class="dica">${ic('info')}<span>Conte fisicamente as prateleiras e digite a quantidade encontrada. O sistema mostra a diferença em unidades e em reais antes de ajustar.</span></div>
    <div class="cartao"><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Produto</th><th class="oc">Local</th><th class="n">No sistema</th><th class="n" style="width:140px">Contado</th><th class="n">Diferença</th><th class="n oc">Valor</th></tr></thead><tbody>
      ${ps.map((p) => { const sis = p.estoque[st.dep] || 0, c = st.cont[p.id]; const d = c === undefined || c === '' ? null : Number(c) - sis; return `<tr><td><span class="prim">${esc(p.nome)}</span><span class="sub mono">${esc(p.sku)}</span></td><td class="oc mono">${esc(p.localizacao)}</td><td class="n">${num(sis)}</td><td class="n"><input type="number" min="0" value="${c ?? ''}" data-mudar="invCont" data-id="${p.id}" style="height:28px;text-align:right" placeholder="—"></td><td class="n">${d === null ? '<span class="mute">—</span>' : d === 0 ? et('confere', 'ok') : `<b class="${d < 0 ? 'er-tx' : 'ok-tx'}">${d > 0 ? '+' : ''}${d}</b>`}</td><td class="n oc">${d ? `<span class="${d < 0 ? 'er-tx' : ''}">${moeda(d * p.custo)}</span>` : ''}</td></tr>`; }).join('')}
    </tbody>${difs.length ? `<tfoot><tr><td colspan="4">Impacto dos ajustes</td><td class="n">${soma(difs, (p) => Number(st.cont[p.id]) - (p.estoque[st.dep] || 0))}</td><td class="n oc">${moeda(soma(difs, (p) => (Number(st.cont[p.id]) - (p.estoque[st.dep] || 0)) * p.custo))}</td></tr></tfoot>` : ''}</table></div></div>`;
}

function abc(a) {
  const l = curvaABC(a);
  const cl = (c) => l.filter((x) => x.classe === c);
  return `${kpis(['A', 'B', 'C'].map((c) => ({ rot: `Classe ${c}`, icone: c === 'A' ? 'star' : c === 'B' ? 'circle' : 'dot-outline', val: `${cl(c).length} produtos`, nota: `${pct(soma(cl(c), (x) => x.part))} do faturamento · ${pct((cl(c).length / l.length) * 100)} dos itens` })))}
    <div class="dica">${ic('info')}<span>Curva ABC dos últimos 90 dias: os itens <b>A</b> trazem 80% do faturamento e nunca podem faltar. Os <b>C</b> giram pouco: avalie comprar menos ou fazer promoção.</span></div>
    <div class="cartao"><div class="cartao-corpo">${linhas({ rotulos: l.map((_, i) => String(i + 1)), series: [{ nome: '% acumulado do faturamento', cor: 'var(--acc)', v: l.map((x) => Math.round(x.acc)) }], fmt: (v) => `${v}%`, altura: 260, largura: 1150 })}</div></div>
    <div class="cartao"><div class="tabela-caixa"><table class="tabela"><thead><tr><th>#</th><th>Produto</th><th class="n">Faturamento</th><th class="n oc">Participação</th><th class="n oc">Acumulado</th><th>Classe</th><th class="n oc">Estoque</th></tr></thead><tbody>${l.map((x, i) => `<tr class="clicavel" data-abrir="produto:${x.p.id}"><td class="mute">${i + 1}</td><td><span class="prim">${esc(x.p.nome)}</span></td><td class="n">${moeda(x.v)}</td><td class="n oc">${pct(x.part, 1)}</td><td class="n oc">${pct(x.acc, 1)}</td><td>${et(x.classe, x.classe === 'A' ? 'ok' : x.classe === 'B' ? 'info' : '', 'sem-ponto')}</td><td class="n oc">${x.classe === 'A' && estTotal(x.p) <= x.p.minimo ? et(`${estTotal(x.p)}`, 'er') : num(estTotal(x.p))}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function cadastroPag(colecao, sing, plur, ficha_) {
  return (a) => a.tab({ id: colecao, colecao, singular: sing, plural: plur, ordem: 'nome', novo: { rot: `Novo ${sing}`, attrs: `data-acao="novoCad" data-c="${colecao}"` }, aoClicar: (id) => a.abrir(ficha_, id),
    colunas: [{ k: 'nome', rot: 'Nome', render: (x) => `<span class="flex" style="gap:9px">${av(x.nome)}<span><span class="prim">${esc(x.nome)}</span><span class="sub mono">${esc(x.doc || '')}</span></span></span>` }, { k: 'telefone', rot: 'Telefone', oc: true },
      colecao === 'clientes' ? { k: 'cidade', rot: 'Cidade', oc: true } : { k: 'prazo', rot: 'Prazo de entrega', n: true, render: (x) => `${x.prazo} dias` },
      colecao === 'clientes' ? { k: 'comprado', rot: 'Comprou (90 dias)', n: true, valor: (x) => soma(faturadas(a).filter((v) => v.cliente === x.id && diasAte(v.data) > -90), totalV), render: (x) => moeda(soma(faturadas(a).filter((v) => v.cliente === x.id && diasAte(v.data) > -90), totalV)) }
        : { k: 'comprado', rot: 'Compramos (90 dias)', n: true, valor: (x) => soma(a.db.lista('compras').filter((c) => c.fornecedor === x.id && diasAte(c.data) > -90), totalC), render: (x) => moeda(soma(a.db.lista('compras').filter((c) => c.fornecedor === x.id && diasAte(c.data) > -90), totalC)) }] });
}

function relatorios(a) {
  const st = a.estado.rel ||= { dias: 90 };
  const fat = faturadas(a).filter((v) => diasAte(v.data) > -st.dias);
  const meses = Array.from({ length: 4 }, (_, i) => mesMais(i - 3));
  const porCat = CATEG.map((c, i) => ({ rot: c, v: soma(fat.flatMap((v) => v.itens).filter((x) => prod(a, x.produto)?.categoria === c), (x) => x.qtd * x.preco), cor: COR_CAT[i] }));
  return `<div class="grupo-btn">${[30, 90].map((d) => `<button type="button" data-acao="relDias" data-d="${d}" aria-pressed="${st.dias === d}">${d} dias</button>`).join('')}</div>
    ${kpis([{ rot: 'Faturamento', icone: 'shopping-cart', val: moeda(soma(fat, totalV)), nota: `${fat.length} pedidos` }, { rot: 'Ticket médio', icone: 'receipt', val: moeda(soma(fat, totalV) / (fat.length || 1)) }, { rot: 'Margem bruta', icone: 'percent', val: pct(((soma(fat, totalV) - soma(fat, custoV)) / (soma(fat, totalV) || 1)) * 100, 1) }, { rot: 'Giro do estoque', icone: 'arrows-clockwise', val: `${num((soma(fat, custoV) / (soma(a.db.lista('produtos'), (p) => p.custo * estTotal(p)) || 1)) * (365 / st.dias), 1)}× ao ano` }])}
    <div class="grade g21"><div class="cartao"><div class="cartao-cab"><div><h3>Faturamento por mês e canal</h3></div></div><div class="cartao-corpo">${barras({ dados: meses.map((m) => ({ rot: nomeMes(m), v: Object.keys(CANAIS).map((c) => soma(faturadas(a).filter((v) => v.data.startsWith(m) && v.canal === c), totalV)) })), series: Object.values(CANAIS).map((n, i) => ({ nome: n, cor: ['#4f46e5', '#0ea5e9', '#14b8a6', '#f59e0b'][i] })), empilhado: true, fmt: moedaC })}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Por categoria</h3></div></div><div class="cartao-corpo">${rosca({ itens: porCat, centro: moedaC(soma(porCat, (x) => x.v)), fmt: moedaC })}</div></div></div>
    <div class="cartao"><div class="cartao-cab"><h3>Por vendedor</h3></div><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Vendedor</th><th class="n">Pedidos</th><th class="n">Faturado</th><th class="n">Ticket médio</th><th class="n">Margem</th></tr></thead><tbody>${VEND.map(([id, n]) => { const l = fat.filter((v) => v.vendedor === id); const f = soma(l, totalV); return `<tr><td><span class="flex">${av(n, 'p')}${esc(n)}</span></td><td class="n">${l.length}</td><td class="n"><b>${moeda(f)}</b></td><td class="n">${moeda(f / (l.length || 1))}</td><td class="n">${pct(((f - soma(l, custoV)) / (f || 1)) * 100, 1)}</td></tr>`; }).join('')}</tbody></table></div></div>`;
}

// ---------------------------------------------------------------- faturamento (NF-e simulada) e documentos
function faturar(a, id, silencioso = false) {
  const v = a.db.obter('vendas', id); if (!v || v.nfe || !['aprovado', 'separacao', 'orcamento'].includes(v.status)) return false;
  const falta = v.itens.filter((x) => (prod(a, x.produto).estoque[v.deposito] || 0) < x.qtd);
  if (falta.length && !silencioso) avisar(`Atenção: estoque insuficiente de ${prod(a, falta[0].produto).nome} em ${nomeDep(v.deposito)}`, { tipo: 'erro' });
  const numero = Math.max(18000, ...a.db.lista('vendas').map((x) => x.nfe?.numero || 0)) + 1;
  v.itens.forEach((x) => movimentar(a, { produto: x.produto, deposito: v.deposito, qtd: x.qtd, tipo: 'saida', motivo: `NF-e ${numero} · pedido #${v.numero}` }));
  a.db.salvar('vendas', { id, status: 'faturado', nfe: { numero, chave: `4126${hoje().slice(2, 4)}${hoje().slice(5, 7)}45678901000132550010${String(numero).padStart(9, '0')}1${String(Date.now()).slice(-7)}`, emissao: hoje() } });
  a.db.registrar(`vendas:${id}`, `NF-e ${numero} emitida (homologação) e estoque baixado`, { icone: 'receipt', tom: 'ok' });
  return true;
}
function danfe(a, v) {
  const c = cli(a, v.cliente), cfg = a.db.cfg;
  return `<div class="doc"><div style="border:2px solid #111;padding:10px;text-align:center;margin-bottom:10px;font-weight:700;letter-spacing:.04em">DOCUMENTO SEM VALOR FISCAL · DEMONSTRAÇÃO (AMBIENTE DE HOMOLOGAÇÃO)</div>
    <div class="entre" style="align-items:flex-start;border:1px solid #333;padding:10px"><div><b style="font-size:15px">${esc(a.empresa)}</b><div style="color:#444">${esc(cfg.endereco)}<br>CNPJ ${esc(cfg.cnpj)} · ${esc(cfg.telefone)}</div></div><div style="text-align:right"><b style="font-size:16px">DANFE</b><div>Nº ${v.nfe.numero} · Série 1</div><div>Emissão ${dataBR(v.nfe.emissao)}</div></div></div>
    <div style="border:1px solid #333;border-top:0;padding:8px;font-family:monospace;font-size:11px">CHAVE DE ACESSO<br><b>${v.nfe.chave.replace(/(\d{4})/g, '$1 ')}</b></div>
    <h2>Destinatário</h2><div>${esc(c?.nome || 'Consumidor final')} ${c ? `· CNPJ ${esc(c.doc)} · ${esc(c.cidade)}` : ''}</div>
    <h2>Produtos</h2><table><thead><tr><th>Código</th><th>Descrição</th><th>Un.</th><th class="n">Qtd.</th><th class="n">Unitário</th><th class="n">Total</th></tr></thead><tbody>${v.itens.map((x) => { const p = prod(a, x.produto); return `<tr><td>${esc(p.sku)}</td><td>${esc(p.nome)}</td><td>${esc(p.unidade)}</td><td class="n">${x.qtd}</td><td class="n">${moeda(x.preco)}</td><td class="n">${moeda(x.qtd * x.preco)}</td></tr>`; }).join('')}</tbody></table>
    <table style="margin-top:8px"><tr><td>Frete</td><td class="n">${moeda(v.frete || 0)}</td><td>Desconto</td><td class="n">${moeda(v.desconto || 0)}</td><td><b>Total da nota</b></td><td class="n"><b>${moeda(totalV(v))}</b></td></tr></table>
    <div style="margin-top:10px;color:#555;font-size:11px">Pedido #${v.numero} · ${esc(CANAIS[v.canal])} · Pagamento: ${esc(v.pagamento || '—')} · Vendedor: ${esc(nomeV(v.vendedor))}</div></div>`;
}

// ---------------------------------------------------------------- fichas
const fichas = {
  venda(a, id, aba = 'itens') {
    const v = a.db.obter('vendas', id); if (!v) return null; const c = cli(a, v.cliente), i = ST_VENDA.findIndex((x) => x[0] === v.status);
    const sub = soma(v.itens, (x) => x.qtd * x.preco), marg = ((totalV(v) - (v.frete || 0) - custoV(v)) / (sub || 1)) * 100;
    let corpo = '';
    if (aba === 'itens') corpo = `<div class="gav-sec"><table class="tabela"><thead><tr><th>Produto</th><th class="n">Qtd.</th><th class="n">Unit.</th><th class="n">Total</th>${v.nfe ? '' : '<th></th>'}</tr></thead><tbody>${v.itens.map((x, k) => { const p = prod(a, x.produto); const disp = p.estoque[v.deposito] || 0; return `<tr><td><span class="prim">${esc(p.nome)}</span><span class="sub"><span class="mono">${esc(p.sku)}</span>${!v.nfe && disp < x.qtd ? ` · <span class="er-tx">só ${disp} em estoque</span>` : ''}</span></td><td class="n">${x.qtd}</td><td class="n">${moeda(x.preco)}</td><td class="n"><b>${moeda(x.qtd * x.preco)}</b></td>${v.nfe ? '' : `<td class="acoes"><button type="button" class="btn fant peq ic-so" data-acao="tirarItemV" data-id="${id}" data-i="${k}" aria-label="Remover">${ic('trash')}</button></td>`}</tr>`; }).join('')}</tbody>
      <tfoot>${v.frete ? `<tr><td colspan="3">Frete</td><td class="n">${moeda(v.frete)}</td>${v.nfe ? '' : '<td></td>'}</tr>` : ''}<tr><td colspan="3">Total</td><td class="n">${moeda(totalV(v))}</td>${v.nfe ? '' : '<td></td>'}</tr></tfoot></table>
      ${v.nfe ? '' : `<div class="flex" style="margin-top:12px"><button type="button" class="btn" data-acao="addItemV" data-id="${id}">${ic('plus')}Adicionar produto</button></div>`}
      <div class="mute" style="margin-top:12px;font-size:12.5px">Margem bruta do pedido: <b style="color:var(--tx)">${pct(marg, 1)}</b> · lucro ${moeda(sub - custoV(v))}</div></div>`;
    if (aba === 'sep') corpo = `<div class="gav-sec"><h4>Lista de separação · ${esc(nomeDep(v.deposito))}</h4><ul class="lista" style="margin:0 -20px">${[...v.itens].sort((x, y) => prod(a, x.produto).localizacao.localeCompare(prod(a, y.produto).localizacao)).map((x) => { const p = prod(a, x.produto); return `<li><input type="checkbox" ${v.status !== 'aprovado' && v.status !== 'separacao' ? 'checked disabled' : ''} aria-label="Separado"><span class="mono" style="width:44px">${esc(p.localizacao)}</span><div class="cresce"><div class="t">${esc(p.nome)}</div><div class="s mono">${esc(p.sku)} · EAN ${esc(p.ean)}</div></div><b class="num">${x.qtd} ${esc(p.unidade)}</b></li>`; }).join('')}</ul><div class="mute" style="font-size:12.5px;margin-top:10px">Ordenada pela localização no depósito, para o separador fazer um caminho só.</div></div>`;
    if (aba === 'det') corpo = `<div class="gav-sec">${props([['user', 'Cliente', c ? `<a href="javascript:void 0" data-abrir="cliente:${c.id}">${esc(c.nome)}</a>` : 'Consumidor final'], ['storefront', 'Canal', esc(CANAIS[v.canal])], ['user-circle', 'Vendedor', esc(nomeV(v.vendedor))], ['warehouse', 'Depósito', esc(nomeDep(v.deposito))], ['credit-card', 'Pagamento', esc(v.pagamento || '—')], ['calendar-blank', 'Data', dataCurta(v.data)], v.nfe ? ['receipt', 'NF-e', `<span class="mono">${v.nfe.numero}</span> · ${dataCurta(v.nfe.emissao)}`] : null, v.rastreio ? ['truck', 'Envio', `<span class="mono">${esc(v.rastreio)}</span>`] : null])}</div><div class="gav-sec"><h4>Histórico</h4>${linhaDoTempo(a.db.historico(`vendas:${id}`).map((h) => ({ quando: h.quando, icone: h.icone, tom: h.tom, html: esc(h.texto) })))}</div>`;
    const prox = { orcamento: ['aprovado', 'Aprovar pedido', 'check'], aprovado: ['separacao', 'Iniciar separação', 'package'], separacao: ['faturar', 'Faturar (emitir NF-e)', 'receipt'], faturado: ['enviado', 'Marcar como enviado', 'truck'], enviado: ['entregue', 'Confirmar entrega', 'seal-check'] }[v.status];
    return { html: ficha({ tipo: 'Pedido de venda', icone: 'shopping-cart', titulo: `Pedido #${v.numero}`, avatar: av(c?.nome || 'Consumidor', 'g'), sub: `${etV(v)}<span>${esc(c?.nome || 'Consumidor final')}</span><b class="num" style="color:var(--tx)">· ${moeda(totalV(v))}</b>`,
      extra: `${v.status !== 'cancelado' ? `<div class="etapas" style="margin-top:12px">${ST_VENDA.slice(0, 6).map(([s, n], j) => `<button type="button" class="${j < i ? 'feita' : j === i ? 'atual' : ''}" tabindex="-1">${n}</button>`).join('')}</div>` : ''}
        <div class="flex" style="margin-top:12px;flex-wrap:wrap">${prox ? `<button type="button" class="btn pri" data-acao="avancarV" data-id="${id}" data-s="${prox[0]}">${ic(prox[2])}${prox[1]}</button>` : ''}${v.nfe ? `<button type="button" class="btn" data-acao="danfe" data-id="${id}">${ic('printer')}DANFE</button>` : ''}<button type="button" class="btn" data-acao="imprimirPedido" data-id="${id}">${ic('file-text')}Pedido</button></div>`,
      aba, abas: [['itens', 'Itens', v.itens.length], ['sep', 'Separação'], ['det', 'Detalhes']], corpo,
      acoes: v.nfe || v.status === 'cancelado' ? '' : `<button type="button" class="btn fant peq ic-so" data-acao="menuV" data-id="${id}" aria-label="Mais">${ic('dots-three')}</button>` }), montar: (g) => (g.dataset.aba = aba) };
  },
  compra(a, id) {
    const c = a.db.obter('compras', id); if (!c) return null; const f = forn(a, c.fornecedor);
    return { html: ficha({ tipo: 'Pedido de compra', icone: 'truck', titulo: `Compra #${c.numero}`, avatar: av(f?.nome || '?', 'g'), sub: `${et(...ST_COMPRA[c.status])}<span>${esc(f?.nome || '')}</span><b class="num" style="color:var(--tx)">· ${moeda(totalC(c))}</b>`,
      extra: `<div class="flex" style="margin-top:12px;flex-wrap:wrap">${c.status === 'rascunho' ? `<button type="button" class="btn pri" data-acao="enviarCompra" data-id="${id}">${ic('envelope-simple')}Enviar ao fornecedor</button>` : ''}${['enviado', 'parcial'].includes(c.status) ? `<button type="button" class="btn pri ok" data-acao="receberCompra" data-id="${id}">${ic('package')}Receber mercadoria</button>` : ''}${f?.telefone ? `<a class="btn" target="_blank" rel="noopener" href="${telLink(f.telefone)}?text=${encodeURIComponent(`Olá, ${f.contato}! Segue o pedido de compra #${c.numero} da ${a.empresa}:\n${c.itens.map((x) => `• ${x.qtd} ${prod(a, x.produto).unidade} ${prod(a, x.produto).nome}`).join('\n')}\nPrevisão de entrega: ${dataBR(c.previsao)}. Obrigado!`)}">${ic('whatsapp-logo')}Mandar pelo WhatsApp</a>` : ''}</div>`,
      corpo: `<div class="gav-sec"><table class="tabela"><thead><tr><th>Produto</th><th class="n">Pedido</th><th class="n">Recebido</th><th class="n">Custo</th><th class="n">Total</th></tr></thead><tbody>${c.itens.map((x) => { const p = prod(a, x.produto); return `<tr><td><span class="prim">${esc(p.nome)}</span><span class="sub mono">${esc(p.sku)}</span></td><td class="n">${x.qtd}</td><td class="n ${x.recebido >= x.qtd ? 'ok-tx' : x.recebido ? 'al-tx' : ''}">${x.recebido}</td><td class="n">${moeda(x.custo)}</td><td class="n">${moeda(x.qtd * x.custo)}</td></tr>`; }).join('')}</tbody><tfoot>${c.frete ? `<tr><td colspan="4">Frete</td><td class="n">${moeda(c.frete)}</td></tr>` : ''}<tr><td colspan="4">Total</td><td class="n">${moeda(totalC(c))}</td></tr></tfoot></table></div>
        <div class="gav-sec">${props([['calendar-blank', 'Data do pedido', dataCurta(c.data)], ['truck', 'Previsão de entrega', `<span class="${['enviado', 'parcial'].includes(c.status) && c.previsao < hoje() ? 'er-tx' : ''}">${dataCurta(c.previsao)}</span>`], ['warehouse', 'Entrega em', esc(nomeDep(c.deposito))], ['user', 'Contato', esc(`${f?.contato || ''} · ${f?.telefone || ''}`)]])}</div>`,
      acoes: c.status === 'rascunho' ? `<button type="button" class="btn fant peq ic-so" data-acao="excluirCompra" data-id="${id}" aria-label="Excluir">${ic('trash')}</button>` : '' }) };
  },
  produto(a, id, aba = 'resumo') {
    const p = prod(a, id); if (!p) return null; const [sit, tom] = situacaoEst(a, p);
    const movs = a.db.lista('movimentos').filter((m) => m.produto === id).sort((x, y) => y.data.localeCompare(x.data));
    let corpo = '';
    if (aba === 'resumo') corpo = `<div class="gav-sec"><div class="grade g4" style="gap:8px">${[['Estoque', `${num(estTotal(p))} ${p.unidade}`], ['Venda (30 dias)', `${num(vendidoQtd(a, id, 30))} ${p.unidade}`], ['Cobertura', cobertura(a, p) >= 999 ? 'sem giro' : `${cobertura(a, p)} dias`], ['Margem', pct(((p.preco - p.custo) / p.preco) * 100)]].map(([t, v]) => `<div style="padding:10px;border:1px solid var(--borda);border-radius:8px"><div class="mute" style="font-size:12px">${t}</div><b class="num" style="font-size:15px">${v}</b></div>`).join('')}</div></div>
      <div class="gav-sec">${props([['barcode', 'SKU / EAN', `<span class="mono">${esc(p.sku)} · ${esc(p.ean)}</span>`], ['tag', 'Categoria', esc(p.categoria)], ['truck', 'Fornecedor', esc(forn(a, p.fornecedor)?.nome || '—')], ['currency-circle-dollar', 'Custo médio', moeda(p.custo)], ['receipt', 'Preço de venda', moeda(p.preco)], ['map-pin', 'Localização', `<span class="mono">${esc(p.localizacao)}</span>`], ['warning', 'Estoque mínimo', `${p.minimo} ${p.unidade}`]])}</div>
      <div class="gav-sec"><h4>Por depósito</h4>${DEP.map(([d, n]) => `<div class="entre" style="padding:5px 0"><span>${esc(n)}</span><b class="num">${num(p.estoque[d] || 0)} ${esc(p.unidade)}</b></div>`).join('')}</div>`;
    if (aba === 'kardex') corpo = `<div class="gav-sec">${movs.length ? `<table class="tabela"><thead><tr><th>Data</th><th>Movimento</th><th class="n">Qtd.</th></tr></thead><tbody>${movs.slice(0, 40).map((m) => `<tr><td>${dataCurta(m.data)}</td><td>${esc(m.motivo)}<span class="sub">${esc(nomeDep(m.deposito))}</span></td><td class="n"><b class="${m.tipo === 'saida' || m.qtd < 0 ? 'er-tx' : 'ok-tx'}">${m.tipo === 'saida' ? '−' : m.qtd > 0 ? '+' : ''}${m.qtd}</b></td></tr>`).join('')}</tbody></table>` : vazio('stack', 'Sem movimentações')}</div>`;
    return { html: ficha({ tipo: 'Produto', icone: 'package', titulo: esc(p.nome), sub: `${et(sit, tom)}<span class="mono">${esc(p.sku)}</span><span>· ${moeda(p.preco)}</span>`,
      extra: `<div class="flex" style="margin-top:12px"><button type="button" class="btn peq" data-acao="ajustar" data-id="${id}">${ic('pencil-simple')}Ajustar estoque</button><button type="button" class="btn peq" data-acao="transferir" data-id="${id}">${ic('arrows-left-right')}Transferir</button></div>`,
      aba, abas: [['resumo', 'Resumo'], ['kardex', 'Movimentações', movs.length]], corpo,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="produtos" data-id="${id}">${ic('pencil-simple')}Editar</button>` }), estreita: true, montar: (g) => (g.dataset.aba = aba) };
  },
  cliente(a, id) {
    const c = cli(a, id); if (!c) return null; const vs = a.db.lista('vendas').filter((v) => v.cliente === id).sort((x, y) => y.numero - x.numero);
    return { estreita: true, html: ficha({ tipo: 'Cliente', icone: 'storefront', titulo: esc(c.nome), avatar: av(c.nome, 'gg'), sub: `<span class="mono">${esc(c.doc)}</span><span>· ${esc(c.cidade)}</span>`,
      corpo: `<div class="gav-sec">${props([['phone', 'Telefone', `${esc(c.telefone)} · <a href="${telLink(c.telefone)}" target="_blank" rel="noopener">WhatsApp</a>`], ['user-circle', 'Vendedor', esc(nomeV(c.vendedor))], ['credit-card', 'Limite de crédito', moeda(c.limite)], ['shopping-cart', 'Comprou (90 dias)', moeda(soma(faturadas(a).filter((v) => v.cliente === id && diasAte(v.data) > -90), totalV))]])}</div>
        <div class="gav-sec"><h4>Pedidos</h4>${vs.length ? `<ul class="lista" style="margin:0 -20px">${vs.slice(0, 12).map((v) => `<li class="clicavel" data-abrir="venda:${v.id}"><span class="mono mute-2">#${v.numero}</span><div class="cresce"><div class="s">${dataCurta(v.data)} · ${v.itens.length} itens</div></div>${etV(v)}<b class="num" style="min-width:86px;text-align:right">${moeda(totalV(v))}</b></li>`).join('')}</ul>` : vazio('shopping-cart', 'Sem pedidos')}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="clientes" data-id="${id}">${ic('pencil-simple')}Editar</button>` }) };
  },
  fornecedor(a, id) {
    const f = forn(a, id); if (!f) return null; const cs = a.db.lista('compras').filter((c) => c.fornecedor === id).sort((x, y) => y.numero - x.numero);
    return { estreita: true, html: ficha({ tipo: 'Fornecedor', icone: 'truck', titulo: esc(f.nome), avatar: av(f.nome, 'gg'), sub: `<span class="mono">${esc(f.doc)}</span>`,
      corpo: `<div class="gav-sec">${props([['user', 'Contato', esc(f.contato)], ['phone', 'Telefone', esc(f.telefone)], ['truck', 'Prazo de entrega', `${f.prazo} dias`], ['package', 'Produtos', String(a.db.lista('produtos').filter((p) => p.fornecedor === id).length)]])}</div>
        <div class="gav-sec"><h4>Compras</h4>${cs.length ? `<ul class="lista" style="margin:0 -20px">${cs.slice(0, 10).map((c) => `<li class="clicavel" data-abrir="compra:${c.id}"><span class="mono mute-2">#${c.numero}</span><div class="cresce"><div class="s">${dataCurta(c.data)}</div></div>${et(...ST_COMPRA[c.status])}<b class="num" style="min-width:86px;text-align:right">${moeda(totalC(c))}</b></li>`).join('')}</ul>` : vazio('truck', 'Sem compras')}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="fornecedores" data-id="${id}">${ic('pencil-simple')}Editar</button>` }) };
  },
};

// ---------------------------------------------------------------- aplicativo
const app = criarApp({
  id: 'gestao', nome: 'Nexo Gestão', sub: 'Estoque, compras e vendas', cor: '#4646d8', icone: 'warehouse', empresa: 'Atlas Distribuidora', conta: '2 depósitos · Curitiba, PR',
  produto: { compra: 2790, mensal: 129 }, semente, colecoes, fichas, buscaDica: 'produtos (nome, SKU, EAN), pedidos, clientes',
  equipe: [['Ricardo Tavares', 'Dono'], ['Marcos Vieira', 'Vendedor externo'], ['Júlia Andrade', 'Vendedora interna'], ['Everton Lima', 'Estoquista']],
  busca: [{ colecao: 'produtos', grupo: 'Produtos', icone: 'package', ficha: 'produto', rot: (p) => p.nome, sub: (p) => `${p.sku} · ${p.ean}` }, { colecao: 'vendas', grupo: 'Pedidos', icone: 'shopping-cart', ficha: 'venda', rot: (v) => `Pedido #${v.numero}`, sub: (v, a) => cli(a, v.cliente)?.nome || 'Consumidor' }, { colecao: 'clientes', grupo: 'Clientes', icone: 'storefront', ficha: 'cliente', rot: (c) => c.nome, sub: (c) => c.cidade }],
  comandos: [{ rot: 'Novo pedido de venda', icone: 'shopping-cart', acao: (a) => a.acoes.novoPedido() }, { rot: 'Abrir frente de caixa (PDV)', icone: 'cash-register', acao: (a) => a.ir('#/pdv') }, { rot: 'Nova compra', icone: 'truck', acao: (a) => a.acoes.novaCompra() }, { rot: 'Novo produto', icone: 'package', acao: (a) => a.acoes.novoProduto() }],
  paginas: [
    { id: 'painel', rot: 'Painel', icone: 'house', titulo: 'Visão geral', render: painel, atalho: 'i' },
    { grupo: 'Vendas' },
    { id: 'vendas', rot: 'Pedidos de venda', icone: 'shopping-cart', render: vendas, atalho: 'v', novo: (a) => a.acoes.novoPedido(), cont: (a) => a.db.lista('vendas').filter((v) => ['aprovado', 'separacao'].includes(v.status)).length },
    { id: 'pdv', rot: 'Frente de caixa', icone: 'cash-register', titulo: 'Frente de caixa (PDV)', render: pdv, cheio: true, atalho: 'x' },
    { id: 'clientes', rot: 'Clientes', icone: 'storefront', render: cadastroPag('clientes', 'cliente', 'clientes', 'cliente') },
    { grupo: 'Estoque' },
    { id: 'produtos', rot: 'Produtos', icone: 'package', render: produtos, atalho: 'p', novo: (a) => a.acoes.novoProduto(), cont: (a) => { const n = a.db.lista('produtos').filter((p) => estTotal(p) <= 0).length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'estoque', rot: 'Movimentações', icone: 'stack', render: estoque },
    { id: 'inventario', rot: 'Inventário', icone: 'list-checks', render: inventario },
    { id: 'abc', rot: 'Curva ABC', icone: 'chart-pie-slice', render: abc },
    { grupo: 'Compras' },
    { id: 'compras', rot: 'Pedidos de compra', icone: 'truck', render: compras, atalho: 'c', novo: (a) => a.acoes.novaCompra(), cont: (a) => a.db.lista('compras').filter((c) => ['enviado', 'parcial'].includes(c.status) && c.previsao < hoje()).length },
    { id: 'sugestao', rot: 'Sugestão de compra', icone: 'lightning', render: sugestao },
    { id: 'fornecedores', rot: 'Fornecedores', icone: 'buildings', render: cadastroPag('fornecedores', 'fornecedor', 'fornecedores', 'fornecedor') },
    { grupo: 'Gestão' },
    { id: 'relatorios', rot: 'Relatórios', icone: 'chart-bar', render: relatorios, atalho: 'r' },
  ],
});

const reab = () => { app.render(); app.reabrir(); };
async function escolherProduto(titulo, { qtd = 1, preco = true } = {}) {
  const ps = app.db.lista('produtos');
  return modal({ titulo, largura: 520, corpo: `<form class="form-grade" onsubmit="return false"><label class="campo largo">Produto<select name="p">${ps.map((p) => `<option value="${p.id}">${esc(p.nome)} · ${esc(p.sku)} · estoque ${estTotal(p)}</option>`).join('')}</select></label><label class="campo">Quantidade<input name="q" type="number" min="1" value="${qtd}"></label>${preco ? '<label class="campo">Preço (opcional)<input name="v" type="number" step="0.01" placeholder="do cadastro"></label>' : ''}</form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Adicionar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
}
Object.assign(app.acoes, {
  novoPedido: async () => {
    const r = await modal({ titulo: 'Novo pedido de venda', largura: 560, corpo: `<form class="form-grade" onsubmit="return false"><label class="campo largo">Cliente<select name="c">${app.db.lista('clientes').map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select></label><label class="campo">Canal<select name="canal">${Object.entries(CANAIS).filter(([k]) => k !== 'balcao').map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label><label class="campo">Pagamento<select name="pg">${['Boleto 28 dias', 'Boleto 14/28 dias', 'PIX', 'Cartão de crédito'].map((x) => `<option>${x}</option>`).join('')}</select></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Criar e adicionar produtos', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
    if (!r) return; const c = cli(app, r.c);
    const v = app.db.salvar('vendas', { numero: Math.max(...app.db.lista('vendas').map((x) => x.numero)) + 1, cliente: r.c, canal: r.canal, vendedor: c.vendedor || 'marcos', data: hoje(), itens: [], frete: 0, desconto: 0, deposito: 'd0', status: 'orcamento', pagamento: r.pg });
    app.db.registrar(`vendas:${v.id}`, 'Pedido criado', { icone: 'plus' }); app.render(); app.abrir('venda', v.id); app.acoes.addItemV({ id: v.id });
  },
  addItemV: async (d) => { const r = await escolherProduto('Adicionar produto ao pedido', { qtd: 12 }); if (!r) return; const v = app.db.obter('vendas', d.id), p = prod(app, r.p); const ex = v.itens.find((x) => x.produto === p.id); const itens = ex ? v.itens.map((x) => (x.produto === p.id ? { ...x, qtd: x.qtd + Number(r.q) } : x)) : [...v.itens, { produto: p.id, qtd: Number(r.q) || 1, preco: r.v ? Number(r.v) : p.preco, custo: p.custo }]; app.db.salvar('vendas', { id: d.id, itens }); reab(); },
  tirarItemV: (d) => { const v = app.db.obter('vendas', d.id); app.db.salvar('vendas', { id: d.id, itens: v.itens.filter((_, k) => k !== Number(d.i)) }); reab(); },
  avancarV: (d) => {
    const v = app.db.obter('vendas', d.id);
    if (d.s === 'faturar') { if (!v.itens.length) return avisar('Pedido sem itens', { tipo: 'erro' }); faturar(app, d.id); avisar(`NF-e emitida para o pedido #${v.numero} · estoque baixado`); return reab(); }
    if (d.s === 'aprovado' && !v.itens.length) return avisar('Adicione produtos antes de aprovar', { tipo: 'erro' });
    app.db.salvar('vendas', { id: d.id, status: d.s, ...(d.s === 'enviado' ? { rastreio: v.canal === 'ecommerce' || v.canal === 'marketplace' ? `BR${String(Date.now()).slice(-9)}BR` : 'Entrega própria' } : {}) });
    app.db.registrar(`vendas:${d.id}`, `Situação: ${stV(d.s)[1]}`, { icone: 'arrow-right', tom: 'acc' }); avisar(`Pedido #${v.numero}: ${stV(d.s)[1]}`); reab();
  },
  menuV: (d, el) => pop(el, [{ rotulo: 'Cancelar pedido', icone: 'x-circle', perigo: true, acao: async () => { if (await confirmar('Cancelar este pedido?', { rotulo: 'Cancelar pedido', perigo: true })) { app.db.salvar('vendas', { id: d.id, status: 'cancelado' }); reab(); } } }]),
  danfe: (d) => imprimir(danfe(app, app.db.obter('vendas', d.id))),
  imprimirPedido: (d) => { const v = app.db.obter('vendas', d.id), c = cli(app, v.cliente); imprimir(`<div class="doc"><div class="entre"><h1>${esc(app.empresa)}</h1><b>Pedido #${v.numero}</b></div><div style="color:#555">${dataBR(v.data)} · ${esc(c?.nome || 'Consumidor')} · ${esc(v.pagamento)}</div><table style="margin-top:12px"><thead><tr><th>Produto</th><th class="n">Qtd.</th><th class="n">Unit.</th><th class="n">Total</th></tr></thead><tbody>${v.itens.map((x) => `<tr><td>${esc(prod(app, x.produto).nome)}</td><td class="n">${x.qtd}</td><td class="n">${moeda(x.preco)}</td><td class="n">${moeda(x.qtd * x.preco)}</td></tr>`).join('')}<tr><td colspan="3"><b>Total</b></td><td class="n"><b>${moeda(totalV(v))}</b></td></tr></tbody></table><div class="ass"><div>${esc(nomeV(v.vendedor))}</div><div>${esc(c?.nome || 'Cliente')}</div></div></div>`); },
  pdvAdd: (d) => { const st = app.estado.pdv, p = prod(app, d.id); const ex = st.itens.find((x) => x.produto === p.id); if (ex) ex.qtd++; else st.itens.push({ produto: p.id, qtd: 1, preco: p.preco, custo: p.custo }); app.render(); },
  pdvQtd: (d) => { const st = app.estado.pdv, it = st.itens[Number(d.i)]; it.qtd += Number(d.d); if (it.qtd <= 0) st.itens.splice(Number(d.i), 1); app.render(); },
  pdvLimpar: () => { app.estado.pdv.itens = []; app.estado.pdv.desc = 0; app.render(); },
  pdvDesc: (d, el) => { app.estado.pdv.desc = Math.max(0, Number(el.value) || 0); app.render(); },
  pdvPag: (d) => { app.estado.pdv.pag = d.p; app.render(); },
  pdvFinalizar: () => {
    const st = app.estado.pdv; const pag = { pix: 'PIX', credito: 'Cartão de crédito', debito: 'Cartão de débito', dinheiro: 'Dinheiro' }[st.pag];
    const v = app.db.salvar('vendas', { numero: Math.max(...app.db.lista('vendas').map((x) => x.numero)) + 1, cliente: null, canal: 'balcao', vendedor: 'loja', data: hoje(), itens: st.itens, frete: 0, desconto: st.desc, deposito: 'd1', status: 'aprovado', pagamento: pag });
    faturar(app, v.id, true); app.db.salvar('vendas', { id: v.id, status: 'entregue' });
    const tot = totalV(app.db.obter('vendas', v.id)); app.estado.pdv = { itens: [], desc: 0, pag: 'pix', busca: '' };
    avisar(`Venda #${v.numero} finalizada · ${moeda(tot)} · ${pag}`); app.render();
  },
  novaCompra: async () => {
    const r = await modal({ titulo: 'Novo pedido de compra', largura: 480, corpo: `<form class="form-grade" onsubmit="return false"><label class="campo largo">Fornecedor<select name="f">${app.db.lista('fornecedores').map((f) => `<option value="${f.id}">${esc(f.nome)}</option>`).join('')}</select></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Criar', classe: 'pri', acao: (f) => f.querySelector('select').value }] });
    if (!r) return; const f = forn(app, r);
    const ps = app.db.lista('produtos').filter((p) => p.fornecedor === r);
    const c = app.db.salvar('compras', { numero: Math.max(...app.db.lista('compras').map((x) => x.numero)) + 1, fornecedor: r, data: hoje(), previsao: diaMais(f.prazo), deposito: 'd0', status: 'rascunho', frete: 0, itens: ps.slice(0, 3).map((p) => ({ produto: p.id, qtd: p.giro * 20, custo: p.custo, recebido: 0 })) });
    app.render(); app.abrir('compra', c.id);
  },
  gerarCompra: (d) => {
    const f = forn(app, d.f); const ps = app.db.lista('produtos').filter((p) => p.fornecedor === d.f).map((p) => { const dia = vendidoQtd(app, p.id, 30) / 30; const chegando = soma(app.db.lista('compras').filter((c) => ['enviado', 'parcial'].includes(c.status)).flatMap((c) => c.itens).filter((x) => x.produto === p.id), (x) => x.qtd - x.recebido); return { p, q: Math.max(0, Math.ceil(dia * 30 + p.minimo) - estTotal(p) - chegando) }; }).filter((x) => x.q > 0 && (estTotal(x.p) <= x.p.minimo || cobertura(app, x.p) < 15));
    const c = app.db.salvar('compras', { numero: Math.max(...app.db.lista('compras').map((x) => x.numero)) + 1, fornecedor: d.f, data: hoje(), previsao: diaMais(f.prazo), deposito: 'd0', status: 'rascunho', frete: 0, itens: ps.map((x) => ({ produto: x.p.id, qtd: x.q, custo: x.p.custo, recebido: 0 })) });
    avisar(`Pedido de compra #${c.numero} criado com ${ps.length} produtos`); app.ir('#/compras'); setTimeout(() => app.abrir('compra', c.id), 50);
  },
  enviarCompra: (d) => { app.db.salvar('compras', { id: d.id, status: 'enviado', data: hoje() }); avisar('Pedido enviado ao fornecedor'); reab(); },
  excluirCompra: (d) => excluir(app, 'compras', d.id),
  receberCompra: async (d) => {
    const c = app.db.obter('compras', d.id);
    const r = await modal({ titulo: `Receber compra #${c.numero}`, largura: 560, corpo: `<div class="dica" style="margin-bottom:12px">${ic('info')}<span>Confira a nota do fornecedor e digite o que chegou. O estoque e o custo médio são atualizados.</span></div><table class="tabela"><thead><tr><th>Produto</th><th class="n">Falta</th><th class="n" style="width:110px">Chegou</th></tr></thead><tbody>${c.itens.map((x, k) => `<tr><td>${esc(prod(app, x.produto).nome)}</td><td class="n">${x.qtd - x.recebido}</td><td class="n"><input type="number" min="0" max="${x.qtd - x.recebido}" value="${x.qtd - x.recebido}" data-k="${k}" style="height:28px;text-align:right"></td></tr>`).join('')}</tbody></table>`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Dar entrada no estoque', classe: 'pri ok', acao: (f) => [...f.querySelectorAll('[data-k]')].map((i) => Number(i.value) || 0) }] });
    if (!r) return;
    const itens = c.itens.map((x, k) => { const q = Math.min(r[k], x.qtd - x.recebido); if (q > 0) movimentar(app, { produto: x.produto, deposito: c.deposito, qtd: q, tipo: 'entrada', motivo: `Compra #${c.numero}`, custo: x.custo }); return { ...x, recebido: x.recebido + q }; });
    const completo = itens.every((x) => x.recebido >= x.qtd);
    app.db.salvar('compras', { id: d.id, itens, status: completo ? 'recebido' : 'parcial' }); avisar(completo ? `Compra #${c.numero} recebida · estoque atualizado` : `Recebimento parcial registrado`); reab();
  },
  novoProduto: async () => { const p = await editar(app, 'produtos'); if (p) { app.render(); app.abrir('produto', p.id); } },
  novoCad: async (d) => { if (await editar(app, d.c)) app.render(); },
  editarCad: async (d) => { if (await editar(app, d.c, app.db.obter(d.c, d.id))) reab(); },
  ajustar: async (d = {}) => {
    const ps = app.db.lista('produtos');
    const r = await modal({ titulo: 'Ajuste de estoque', largura: 520, corpo: `<form class="form-grade" onsubmit="return false"><label class="campo largo">Produto<select name="p">${ps.map((p) => `<option value="${p.id}" ${p.id === d.id ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></label><label class="campo">Depósito<select name="d">${DEP.map(([id, n]) => `<option value="${id}">${n}</option>`).join('')}</select></label><label class="campo">Quantidade (+ entra, − sai)<input type="number" name="q" value="-1"></label><label class="campo largo">Motivo<select name="m"><option>Avaria</option><option>Vencimento</option><option>Uso interno</option><option>Correção de contagem</option><option>Bonificação do fornecedor</option></select></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Ajustar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
    if (!r || !Number(r.q)) return; movimentar(app, { produto: r.p, deposito: r.d, qtd: Number(r.q), tipo: 'ajuste', motivo: r.m }); avisar('Estoque ajustado'); reab();
  },
  transferir: async (d = {}) => {
    const ps = app.db.lista('produtos');
    const r = await modal({ titulo: 'Transferir entre depósitos', largura: 520, corpo: `<form class="form-grade" onsubmit="return false"><label class="campo largo">Produto<select name="p">${ps.map((p) => `<option value="${p.id}" ${p.id === d.id ? 'selected' : ''}>${esc(p.nome)} · CD ${p.estoque.d0 || 0} · Loja ${p.estoque.d1 || 0}</option>`).join('')}</select></label><label class="campo">De<select name="de">${DEP.map(([id, n]) => `<option value="${id}">${n}</option>`).join('')}</select></label><label class="campo">Quantidade<input type="number" min="1" name="q" value="10"></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Transferir', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
    if (!r) return; const p = prod(app, r.p), para = r.de === 'd0' ? 'd1' : 'd0', q = Number(r.q);
    if ((p.estoque[r.de] || 0) < q) return avisar(`Só há ${p.estoque[r.de] || 0} em ${nomeDep(r.de)}`, { tipo: 'erro' });
    movimentar(app, { produto: r.p, deposito: r.de, qtd: q, tipo: 'saida', motivo: `Transferência para ${nomeDep(para)}` }); movimentar(app, { produto: r.p, deposito: para, qtd: q, tipo: 'entrada', motivo: `Transferência de ${nomeDep(r.de)}` });
    avisar(`${q} ${p.unidade} transferidos para ${nomeDep(para)}`); reab();
  },
  invDep: (d, el) => { app.estado.inv.dep = el.value; app.estado.inv.cont = {}; app.render(); },
  invCat: (d, el) => { app.estado.inv.cat = el.value; app.render(); },
  invCont: (d, el) => { app.estado.inv.cont[d.id] = el.value; app.render(); },
  aplicarInv: async () => {
    const st = app.estado.inv; const difs = app.db.lista('produtos').filter((p) => st.cont[p.id] !== undefined && st.cont[p.id] !== '' && Number(st.cont[p.id]) !== (p.estoque[st.dep] || 0));
    if (!(await confirmar(`Aplicar ${difs.length} ajustes de inventário em ${nomeDep(st.dep)}?`, { rotulo: 'Aplicar ajustes' }))) return;
    difs.forEach((p) => movimentar(app, { produto: p.id, deposito: st.dep, qtd: Number(st.cont[p.id]) - (p.estoque[st.dep] || 0), tipo: 'ajuste', motivo: `Inventário ${dataBR(hoje())}` }));
    st.cont = {}; avisar(`${difs.length} ajustes aplicados`); app.render();
  },
  imprimirInv: () => { const st = app.estado.inv; imprimir(`<div class="doc"><h1>Folha de contagem · ${esc(nomeDep(st.dep))} · ${esc(st.cat)}</h1><div style="color:#555">${dataBR(hoje())} · conferente: ______________________</div><table style="margin-top:12px"><thead><tr><th>Local</th><th>SKU</th><th>Produto</th><th>Un.</th><th style="width:120px">Contado</th></tr></thead><tbody>${app.db.lista('produtos').filter((p) => p.categoria === st.cat).sort((x, y) => x.localizacao.localeCompare(y.localizacao)).map((p) => `<tr><td>${esc(p.localizacao)}</td><td>${esc(p.sku)}</td><td>${esc(p.nome)}</td><td>${esc(p.unidade)}</td><td style="border-bottom:1px solid #999"></td></tr>`).join('')}</tbody></table></div>`); },
  relDias: (d) => { app.estado.rel.dias = Number(d.d); app.render(); },
});

// leitor de código de barras no PDV: Enter adiciona o produto com EAN/SKU exato
document.addEventListener('keydown', (e) => {
  const el = e.target.closest?.('[data-pdv-busca]'); if (!el || e.key !== 'Enter') return;
  e.preventDefault(); const t = normal(el.value.trim()); el.value = ''; if (!t) return;
  const p = app.db.lista('produtos').find((x) => normal(x.ean) === t || normal(x.sku) === t) || app.db.lista('produtos').find((x) => normal(x.nome).includes(t));
  if (!p) return avisar('Produto não encontrado', { tipo: 'erro' });
  app.estado.pdv.busca = ''; const st = app.estado['tab:pdvbusca']; if (st) st.busca = ''; app.acoes.pdvAdd({ id: p.id }); setTimeout(() => document.querySelector('[data-pdv-busca]')?.focus(), 30);
});
