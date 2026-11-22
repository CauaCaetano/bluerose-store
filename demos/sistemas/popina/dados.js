// Popina · exemplo da demonstração: a "Lanchonete Sabor da Praça", lanches e refeições numa cidade pequena do interior.
// Poucos dados (20 itens no cardápio, 7 dias de vendas) para não encher o navegador. Tudo inventado e marcado como exemplo.
// EXEMPLO: suba o número quando o exemplo mudar (quem tem a demonstração antiga recebe a nova).
export const EXEMPLO = 11;

export const CATEGORIAS = [
  { id: 'pratos', nome: 'Pratos' }, { id: 'lanches', nome: 'Lanches' }, { id: 'pizzas', nome: 'Pizzas' },
  { id: 'porcoes', nome: 'Porções' }, { id: 'bebidas', nome: 'Bebidas' }, { id: 'sobremesas', nome: 'Sobremesas' },
];

// estoque simples: nome, unidade, quanto tem, mínimo (abaixo disso vai para a lista de compras)
export const INSUMOS = [
  ['pao', 'Pão de hambúrguer', 'un', 46, 24], ['blend', 'Hambúrguer 150 g', 'un', 38, 20], ['queijo', 'Queijo muçarela', 'kg', 3.2, 2],
  ['bacon', 'Bacon', 'kg', 0.8, 1], ['batata', 'Batata pré-frita', 'kg', 7.5, 4], ['frango', 'Peito de frango', 'kg', 5.5, 3],
  ['massa', 'Massa de pizza', 'un', 9, 10], ['refri', 'Refrigerante lata', 'un', 41, 24], ['cerveja', 'Cerveja long neck', 'un', 30, 24],
  ['agua', 'Água mineral 500 ml', 'un', 18, 12], ['ovo', 'Ovo', 'un', 42, 30], ['gas', 'Botijão de gás', 'un', 1, 1],
].map(([id, nome, unid, estoque, minimo]) => ({ id, nome, unid, compra: unid, fator: 1, estoque, minimo, custo: 0 }));

const P = (id, cat, nome, desc, preco, setor, extra = {}) => ({ id, cat, nome, desc, preco, setor, foto: `fotos/${id}.webp`, ativo: true, adicionais: [], ficha: [], ...extra });
const AD = [{ nome: 'Bacon', preco: 5 }, { nome: 'Ovo', preco: 3 }, { nome: 'Queijo extra', preco: 4 }, { nome: 'Cheddar', preco: 4 }];
const F = (...l) => ({ ficha: l.map(([insumo, qtd]) => ({ insumo, qtd })) });
const PIZZA = (p) => ({ ...p, pizza: true, tamanhos: [{ nome: 'Broto', preco: Math.round(p.preco * 0.6) - 0.1, fator: 0.5 }, { nome: 'Grande', preco: p.preco, fator: 1 }] });
export const PRODUTOS = [
  P('executivo', 'pratos', 'Prato feito de frango', 'Arroz, feijão, frango grelhado, salada e fritas.', 26.9, 'cozinha', { destaque: true, ...F(['frango', 0.18], ['batata', 0.1]), grupos: [{ id: 'salada', nome: 'Salada', min: 1, max: 1, opcoes: [{ nome: 'Com salada' }, { nome: 'Sem salada' }] }] }),
  P('parmegiana', 'pratos', 'Filé à parmegiana', 'Filé empanado com molho e muçarela, arroz e fritas.', 42.9, 'cozinha', { ...F(['queijo', 0.09], ['batata', 0.15]) }),
  P('feijoada', 'pratos', 'Feijoada (sábado)', 'Feijoada com arroz, couve, farofa e laranja.', 34.9, 'cozinha'),
  P('quilo', 'pratos', 'Comida por quilo', 'Buffet do almoço: pese o prato. Preço do quilo.', 59.9, 'cozinha', { porKg: true }),
  P('xburger', 'lanches', 'X-Burger', 'Hambúrguer 150 g, queijo, alface e tomate.', 22.9, 'cozinha', { adicionais: AD, ...F(['pao', 1], ['blend', 1], ['queijo', 0.04]) }),
  P('xbacon', 'lanches', 'X-Bacon', 'Hambúrguer 150 g, bacon crocante e queijo.', 27.9, 'cozinha', { destaque: true, adicionais: AD, ...F(['pao', 1], ['blend', 1], ['queijo', 0.04], ['bacon', 0.05]) }),
  P('xsalada', 'lanches', 'X-Salada', 'Hambúrguer 150 g, queijo, alface, tomate e milho.', 24.9, 'cozinha', { adicionais: AD, ...F(['pao', 1], ['blend', 1], ['queijo', 0.04]) }),
  P('frango_lanche', 'lanches', 'Lanche de frango', 'Frango empanado, maionese da casa e alface.', 23.9, 'cozinha', { adicionais: AD, ...F(['pao', 1], ['frango', 0.14]) }),
  PIZZA(P('pz_calabresa', 'pizzas', 'Pizza calabresa', 'Muçarela, calabresa e cebola.', 54.9, 'cozinha', { ...F(['massa', 1], ['queijo', 0.25]) })),
  PIZZA(P('pz_mucarela', 'pizzas', 'Pizza muçarela', 'Muçarela, tomate e orégano.', 49.9, 'cozinha', { ...F(['massa', 1], ['queijo', 0.35]) })),
  PIZZA(P('pz_frango', 'pizzas', 'Pizza frango com catupiry', 'Frango desfiado e catupiry.', 57.9, 'cozinha', { ...F(['massa', 1], ['queijo', 0.2], ['frango', 0.2]) })),
  PIZZA(P('pz_portuguesa', 'pizzas', 'Pizza portuguesa', 'Presunto, ovo, cebola e muçarela.', 57.9, 'cozinha', { ...F(['massa', 1], ['queijo', 0.25], ['ovo', 2]) })),
  P('fritas', 'porcoes', 'Batata frita', 'Porção de 400 g.', 24.9, 'cozinha', { adicionais: [{ nome: 'Cheddar e bacon', preco: 9 }], ...F(['batata', 0.4]),
    tamanhos: [{ nome: 'Meia', preco: 15.9, fator: 0.5 }, { nome: 'Inteira', preco: 24.9, fator: 1 }] }),
  P('isca', 'porcoes', 'Isca de frango', 'Tiras de frango empanadas, 500 g.', 36.9, 'cozinha', { ...F(['frango', 0.5]) }),
  P('calabresa_acebolada', 'porcoes', 'Calabresa acebolada', 'Calabresa na chapa com cebola e pão.', 29.9, 'cozinha'),
  P('refri', 'bebidas', 'Refrigerante lata', '350 ml.', 6.0, 'bar', { foto: '', ...F(['refri', 1]), grupos: [{ id: 'sabor', nome: 'Sabor', min: 1, max: 1, opcoes: [{ nome: 'Coca-Cola' }, { nome: 'Guaraná' }, { nome: 'Fanta laranja' }] }] }),
  P('suco', 'bebidas', 'Suco natural', 'Laranja, limão ou maracujá, 500 ml.', 9.9, 'bar', { grupos: [{ id: 'sabor', nome: 'Sabor', min: 1, max: 1, opcoes: [{ nome: 'Laranja' }, { nome: 'Limão' }, { nome: 'Maracujá' }] }] }),
  P('cerveja', 'bebidas', 'Cerveja long neck', '330 ml bem gelada.', 9.9, 'bar', { ...F(['cerveja', 1]) }),
  P('agua', 'bebidas', 'Água mineral', 'Com ou sem gás, 500 ml.', 4.0, 'bar', { foto: '', ...F(['agua', 1]) }),
  P('pudim', 'sobremesas', 'Pudim de leite', 'Pudim caseiro com calda.', 9.9, 'cozinha'),
  P('petit', 'sobremesas', 'Petit gâteau', 'Bolinho quente de chocolate com sorvete.', 18.9, 'cozinha'),
];

export const BAIRROS = [['Centro', 4], ['Jardim Boa Vista', 5], ['Vila Nova', 6], ['Parque dos Ipês', 7], ['Distrito Industrial', 10]].map(([nome, taxa]) => ({ nome, taxa }));

export const CONFIG = {
  nome: 'Sabor da Praça', cidade: 'Orlândia', servico: 10, mesas: 10, whatsapp: '16999990000', whatsappDono: '16999990000',
  pix: { tipo: 'aleatoria', chave: '1f3c2a8e-0000-4000-8000-00000000c0de', exemplo: true },
  garcons: ['Rafael', 'Bruna', 'Diego'],
  regras: { pin: '1234', limiteDesconto: 10 },
  fin: { limiteFiado: 300 },
  loja: { cor: '#6B2737', logo: '', capa: 'fotos/capa.webp', boasVindas: 'Lanches, pizzas e prato feito', endereco: 'Praça da Matriz, 45 · Centro', instagram: '', aviso: '',
    horarios: [[['18:00', '23:30']], [], [['11:00', '14:30'], ['18:00', '23:00']], [['11:00', '14:30'], ['18:00', '23:00']], [['11:00', '14:30'], ['18:00', '23:00']], [['11:00', '14:30'], ['18:00', '23:59']], [['11:00', '15:00'], ['18:00', '23:59']]],
    aceitaQR: true, delivery: true, retirada: true, pedidoMinimo: 20, tempoEntrega: '40 a 50 min', tempoRetirada: '20 min', pagamentos: ['Pix', 'Cartão na entrega', 'Dinheiro'], couvert: 0 },
  inicio: { feito: true },
};
export const CLIENTES = [['16991234567', 'Patrícia Lima', 'Rua das Acácias, 120', 'Jardim Boa Vista', 7, 312.6], ['16998887766', 'Marcos Andrade', 'Av. Brasil, 450', 'Centro', 4, 158.9], ['16997776655', 'Seu Antônio (oficina)', 'Rua Goiás, 88', 'Vila Nova', 21, 689.4]]
  .map(([tel, nome, end, bairro, pedidos, total], k) => ({ id: 't' + tel, tel, nome, end, bairro, pedidos, total, primeiro: Date.now() - (60 + k * 9) * 864e5, ultimo: Date.now() - (k * 2 + 1) * 864e5 }));
export const ENTREGADORES = [{ id: 'e1', nome: 'Júnior', tel: '16995554433' }, { id: 'e2', nome: 'Wellington', tel: '16994443322' }];

const MIN = 60e3;
// conta real nova: sem nada de exemplo (o primeiro uso guia: pratos, mesas e equipe)
export function estadoVazio(nome = 'Meu restaurante', agora = Date.now()) {
  return {
    versao: 1, criado: agora, config: { nome, cidade: '', servico: 10, mesas: 10, whatsapp: '', pix: { tipo: '', chave: '', exemplo: false }, garcons: [], loja: {} },
    clientes: [], entregadores: [],
    categorias: CATEGORIAS.map((c) => ({ ...c })), produtos: [], insumos: [], bairros: [],
    comandas: [], chamados: [], pedidosQR: [], vendas: [], numPedido: 1, caixa: null, compras: [],
  };
}
// cardápio de exemplo para quem quer começar por ele e ir editando
export const cardapioExemplo = () => ({ produtos: PRODUTOS.map((p) => JSON.parse(JSON.stringify(p))), insumos: [] });

export function estadoInicial(agora = Date.now()) {
  const pr = (id) => PRODUTOS.find((x) => x.id === id);
  const it = (id, qtd, status, minAtras, extra = {}) => {
    const p = pr(id);
    return { id: Math.random().toString(36).slice(2, 10), prod: id, nome: p.nome, qtd, preco: p.preco, setor: p.setor, obs: '', adic: [], status,
      ...(status !== 'rascunho' ? { enviado: agora - minAtras * MIN } : {}), ...(status === 'preparo' ? { inicio: agora - Math.max(1, minAtras - 2) * MIN } : {}), ...(status === 'pronto' ? { pronto: agora - MIN } : {}), ...extra };
  };
  const mesa = (n, pessoas, minAtras, garcom, itens, extra = {}) => ({ id: `m${n}-${agora}`, tipo: 'mesa', mesa: n, pessoas, aberta: agora - minAtras * MIN, garcom, itens, pagamentos: [], servico: true, ...extra });
  const comandas = [
    mesa(1, 2, 34, 'Rafael', [it('executivo', 2, 'entregue', 28, { adic: [{ nome: 'Salada: Com salada', preco: 0 }] }), it('suco', 2, 'entregue', 30, { adic: [{ nome: 'Sabor: Laranja', preco: 0 }] }), it('pudim', 1, 'preparo', 4)]),
    mesa(3, 4, 46, 'Bruna', [it('parmegiana', 2, 'pronto', 16), it('fritas', 1, 'entregue', 35, { tam: 'Inteira', fator: 1, nome: 'Batata frita (Inteira)' }), it('cerveja', 4, 'entregue', 40)]),
    mesa(5, 3, 58, 'Rafael', [it('pz_calabresa', 1, 'entregue', 40, { meia: { a: 'pz_calabresa', b: 'pz_frango' }, tam: 'Grande', fator: 1, nome: 'Pizza meia calabresa / meia frango com catupiry (Grande)', preco: 57.9 }), it('refri', 3, 'entregue', 50, { adic: [{ nome: 'Sabor: Coca-Cola', preco: 0 }] })], { pediuConta: agora - 2 * MIN }),
    mesa(7, 2, 9, 'Diego', [it('xbacon', 1, 'preparo', 6, { obs: 'Sem cebola', adic: [{ nome: 'Ovo', preco: 3 }] }), it('xsalada', 1, 'novo', 2), it('cerveja', 2, 'entregue', 7)]),
    { id: `b1-${agora}`, tipo: 'delivery', num: 27, aberta: agora - 18 * MIN, cliente: { nome: 'Patrícia Lima', tel: '16991234567', end: 'Rua das Acácias, 120', bairro: 'Jardim Boa Vista' }, taxaEntrega: 5, entrega: 'preparo',
      itens: [it('xbacon', 2, 'preparo', 16), it('fritas', 1, 'pronto', 16, { tam: 'Inteira', fator: 1, nome: 'Batata frita (Inteira)' }), it('refri', 2, 'entregue', 16, { adic: [{ nome: 'Sabor: Guaraná', preco: 0 }] })],
      pagamentos: [], pagarNaEntrega: 'Dinheiro', trocoPara: 100, servico: false, origem: 'Cardápio online' },
    { id: `b2-${agora}`, tipo: 'delivery', num: 26, aberta: agora - 38 * MIN, cliente: { nome: 'Marcos Andrade', tel: '16998887766', end: 'Av. Brasil, 450', bairro: 'Centro' }, taxaEntrega: 4, entrega: 'saiu', saiu: agora - 6 * MIN, entregador: 'e1',
      itens: [it('pz_portuguesa', 1, 'entregue', 34, { tam: 'Grande', fator: 1, nome: 'Pizza portuguesa (Grande)' }), it('cerveja', 2, 'entregue', 34)], pagamentos: [{ id: 'pgx1', forma: 'Pix', valor: 81.7, ts: agora - 37 * MIN }], servico: false, origem: 'WhatsApp' },
    { id: `b3-${agora}`, tipo: 'balcao', num: 28, senha: 12, aberta: agora - 5 * MIN, cliente: { nome: 'Juliana' }, itens: [it('xsalada', 1, 'novo', 4), it('suco', 1, 'novo', 4, { adic: [{ nome: 'Sabor: Maracujá', preco: 0 }] })], pagamentos: [{ id: 'pgx2', forma: 'Cartão de débito', valor: 34.8, ts: agora - 5 * MIN }], servico: false, origem: 'Balcão' },
    { id: `b4-${agora}`, tipo: 'balcao', modo: 'retirada', num: 29, senha: 13, aberta: agora - 3 * MIN, cliente: { nome: 'Carlos', tel: '16992223344' }, itens: [it('pz_mucarela', 1, 'novo', 2, { tam: 'Grande', fator: 1, nome: 'Pizza muçarela (Grande)' })], pagamentos: [], servico: false, origem: 'Cardápio online' },
  ];
  const chamados = [{ id: 'c1', mesa: 7, tipo: 'garcom', ts: agora - 1 * MIN, origem: 'QR' }];
  const pedidosQR = [{ id: 'q1', mesa: 2, ts: agora - 2 * MIN, itens: [{ prod: 'xburger', qtd: 2, obs: '' }, { prod: 'refri', qtd: 2, obs: '', adic: [{ nome: 'Sabor: Coca-Cola', preco: 0 }] }], nome: 'Mesa 2 (QR)' }];
  const vendas = historico(agora);
  const fechamentos = fechamentosExemplo(vendas, agora);
  const fiado = { lanc: [
    { id: 'fd1', cliente: 't16997776655', nome: 'Seu Antônio (oficina)', tel: '16997776655', tipo: 'compra', valor: 58.4, ts: agora - 6 * 864e5, onde: 'Balcão #14', quem: 'Bruna' },
    { id: 'fd2', cliente: 't16997776655', nome: 'Seu Antônio (oficina)', tel: '16997776655', tipo: 'compra', valor: 41.8, ts: agora - 3 * 864e5, onde: 'Balcão #19', quem: 'Bruna' },
    { id: 'fd3', cliente: 't16997776655', nome: 'Seu Antônio (oficina)', tel: '16997776655', tipo: 'receb', valor: 50, forma: 'Pix', ts: agora - 1 * 864e5, quem: 'Bruna' },
  ], limites: {} };
  const insumos = INSUMOS.map((i) => ({ ...i }));
  return {
    versao: 1, exemplo: EXEMPLO, criado: agora, config: JSON.parse(JSON.stringify(CONFIG)), categorias: CATEGORIAS.map((c) => ({ ...c })),
    produtos: PRODUTOS.map((p) => JSON.parse(JSON.stringify(p))), insumos, bairros: BAIRROS.map((b) => ({ ...b })),
    comandas, chamados, pedidosQR, vendas, numPedido: 30, senha: { dia: ymdEx(agora), n: 13 },
    clientes: CLIENTES.map((c) => ({ ...c })), entregadores: ENTREGADORES.map((e) => ({ ...e })), fiado,
    caixa: { aberto: agora - 5 * 3600e3, troco: 150, movimentos: [{ tipo: 'sangria', valor: 100, motivo: 'Depósito no banco', ts: agora - 2 * 3600e3, quem: 'Bruna' }], operador: 'Bruna' },
    compras: [], fechamentos, auditoria: [], movEstoque: [],
  };
}
const ymdEx = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// 7 dias de vendas: mais movimento na sexta e no sábado, almoço e noite
function historico(agora) {
  const v = []; let seed = 11;
  const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const formas = ['Pix', 'Pix', 'Pix', 'Cartão de débito', 'Cartão de crédito', 'Dinheiro', 'Dinheiro'];
  const vendaveis = PRODUTOS.filter((p) => !p.porKg);
  for (let d = 7; d >= 0; d--) {
    const dia = new Date(agora - d * 864e5); const sem = dia.getDay();
    const qtd = sem === 1 ? 0 : Math.round((sem === 5 || sem === 6 ? 13 : sem === 0 ? 9 : 6) * (0.8 + r() * 0.4));
    for (let k = 0; k < qtd; k++) {
      const h = r() < 0.4 ? 11.5 + r() * 2.5 : 18.5 + r() * 4; const ts = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), Math.floor(h), Math.floor((h % 1) * 60)).getTime();
      if (ts > agora - 10 * MIN) continue;
      const itens = []; const n = 1 + Math.floor(r() * 3);
      for (let j = 0; j < n; j++) { const p = vendaveis[Math.floor(r() * vendaveis.length)]; itens.push({ prod: p.id, nome: p.nome, qtd: 1 + Math.floor(r() * 2), preco: p.preco, setor: p.setor }); }
      const sub = itens.reduce((s, i) => s + i.qtd * i.preco, 0); const tipo = r() < 0.55 ? 'mesa' : r() < 0.5 ? 'delivery' : 'balcao';
      const servico = tipo === 'mesa' ? Math.round(sub * 10) / 100 : 0, entrega = tipo === 'delivery' ? 5 : 0;
      const total = Math.round((sub + servico + entrega) * 100) / 100, forma = formas[Math.floor(r() * formas.length)];
      v.push({ id: `h${d}-${k}`, ts, tipo, itens, total, servico, entrega, desconto: 0, forma, pagamentos: [{ forma, valor: total }], ...(tipo === 'mesa' ? { mesa: 1 + (k % 10), pessoas: 2 + (k % 3) } : { num: 100 + k }),
        garcom: tipo === 'mesa' ? ['Rafael', 'Bruna', 'Diego'][Math.floor(r() * 3)] : '', entregador: tipo === 'delivery' ? (r() < 0.6 ? 'e1' : 'e2') : '', exemplo: true });
    }
  }
  return v;
}
function fechamentosExemplo(v, agora) {
  const l = [], H = 3600e3;
  for (let d = 1; d <= 7 && l.length < 2; d++) {
    const dia = new Date(agora - d * 864e5), vd = v.filter((x) => new Date(x.ts).toDateString() === dia.toDateString()); if (!vd.length) continue;
    const base = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate()).getTime(), porForma = {};
    vd.forEach((x) => { porForma[x.forma] = Math.round(((porForma[x.forma] || 0) + x.total) * 100) / 100; });
    const gaveta = Math.round((150 + (porForma.Dinheiro || 0)) * 100) / 100;
    l.push({ id: `f${l.length + 1}`, aberto: base + 10.5 * H, troco: 150, movimentos: [], operador: 'Bruna', fechado: base + 23.5 * H, fechadoPor: 'Bruna', motivo: '', abertas: [],
      resumo: { total: Math.round(vd.reduce((s, x) => s + x.total, 0) * 100) / 100, vendas: vd.length, porForma, sangria: 0, suprimento: 0, servico: Math.round(vd.reduce((s, x) => s + (x.servico || 0), 0) * 100) / 100, gaveta, contado: gaveta, diferenca: 0 } });
  }
  return l.reverse();
}
