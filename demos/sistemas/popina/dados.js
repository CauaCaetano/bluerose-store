// Popina · dados de exemplo da demonstração: a "Cantina Ferraz" (restaurante, lanches e pizzaria), com mesas abertas,
// pedidos de balcão e delivery e 30 dias de vendas para os relatórios. Tudo inventado e marcado como exemplo.

export const CATEGORIAS = [
  { id: 'pratos', nome: 'Pratos' }, { id: 'lanches', nome: 'Lanches' }, { id: 'pizzas', nome: 'Pizzas' },
  { id: 'porcoes', nome: 'Porções' }, { id: 'bebidas', nome: 'Bebidas' }, { id: 'sobremesas', nome: 'Sobremesas' },
];

// unidade de uso (g, ml, un), unidade de compra e quanto vale (kg = 1000 g), estoque em unidade de uso, custo por unidade de compra
export const INSUMOS = [
  ['carne', 'Contrafilé', 'g', 'kg', 1000, 9200, 4000, 64.9], ['frango', 'Peito de frango', 'g', 'kg', 1000, 6800, 3000, 24.9],
  ['blend', 'Blend de hambúrguer 150 g', 'un', 'cx 20', 20, 46, 20, 96.0], ['pao', 'Pão de brioche', 'un', 'pct 12', 12, 30, 24, 21.6],
  ['queijo', 'Queijo muçarela', 'g', 'kg', 1000, 7400, 3000, 42.9], ['presunto', 'Presunto', 'g', 'kg', 1000, 2100, 1500, 32.9],
  ['calabresa', 'Calabresa', 'g', 'kg', 1000, 1300, 1500, 29.9], ['massa', 'Massa de pizza 35 cm', 'un', 'un', 1, 22, 15, 4.2],
  ['molho', 'Molho de tomate', 'ml', 'L', 1000, 6200, 3000, 18.0], ['arroz', 'Arroz', 'g', 'kg', 1000, 14000, 5000, 6.2],
  ['feijao', 'Feijão', 'g', 'kg', 1000, 8000, 3000, 8.9], ['batata', 'Batata pré-frita', 'g', 'kg', 1000, 9500, 4000, 17.5],
  ['alface', 'Alface', 'un', 'un', 1, 9, 6, 3.5], ['tomate', 'Tomate', 'g', 'kg', 1000, 3200, 2000, 7.9],
  ['cebola', 'Cebola', 'g', 'kg', 1000, 4100, 2000, 5.4], ['bacon', 'Bacon', 'g', 'kg', 1000, 900, 1000, 39.9],
  ['ovo', 'Ovo', 'un', 'bdj 30', 30, 74, 30, 22.0], ['refri', 'Refrigerante lata', 'un', 'fardo 12', 12, 41, 24, 33.0],
  ['cerveja', 'Cerveja long neck', 'un', 'cx 24', 24, 66, 48, 129.0], ['suco', 'Polpa de fruta', 'g', 'kg', 1000, 3800, 2000, 19.0],
  ['chocolate', 'Chocolate meio amargo', 'g', 'kg', 1000, 1600, 1000, 52.0], ['leite_cond', 'Leite condensado', 'g', 'cx', 395, 2370, 1185, 7.5],
].map(([id, nome, unid, compra, fator, estoque, minimo, custo]) => ({ id, nome, unid, compra, fator, estoque, minimo, custo }));

const P = (id, cat, nome, desc, preco, setor, extra = {}) => ({ id, cat, nome, desc, preco, setor, foto: `fotos/${id}.webp`, ativo: true, adicionais: [], ficha: [], ...extra });
const AD_LANCHE = [{ nome: 'Bacon', preco: 6 }, { nome: 'Ovo', preco: 3 }, { nome: 'Queijo extra', preco: 4 }, { nome: 'Cheddar', preco: 5 }];
const PONTO = { id: 'ponto', nome: 'Ponto da carne', min: 1, max: 1, opcoes: [{ nome: 'Mal passado' }, { nome: 'Ao ponto' }, { nome: 'Bem passado' }] };
const EXTRAS = {
  parmegiana: { destaque: true, tags: ['Mais pedido'], serve: 'Serve 1 pessoa bem', grupos: [PONTO, { id: 'acomp', nome: 'Trocar acompanhamento', min: 0, max: 1, opcoes: [{ nome: 'Purê no lugar da fritas', preco: 0 }, { nome: 'Salada no lugar do arroz', preco: 0 }] }] },
  executivo: { tags: ['Almoço'], grupos: [{ id: 'salada', nome: 'Salada', min: 1, max: 1, opcoes: [{ nome: 'Alface e tomate' }, { nome: 'Sem salada' }] }] },
  risoto: { tags: ['Vegetariano'] },
  feijoada: { tags: ['Só sábado'] },
  xburger: { grupos: [PONTO] },
  xbacon: { destaque: true, tags: ['Mais pedido'], grupos: [PONTO] },
  xsalada: { grupos: [PONTO], promoDe: 37.9 },
  pz_calabresa: { destaque: true, grupos: [{ id: 'borda', nome: 'Borda', min: 0, max: 1, opcoes: [{ nome: 'Catupiry', preco: 9 }, { nome: 'Cheddar', preco: 9 }, { nome: 'Chocolate', preco: 11 }] }] },
  pz_mucarela: { tags: ['Vegetariano'], grupos: [{ id: 'borda', nome: 'Borda', min: 0, max: 1, opcoes: [{ nome: 'Catupiry', preco: 9 }, { nome: 'Cheddar', preco: 9 }] }] },
  pz_portuguesa: { grupos: [{ id: 'borda', nome: 'Borda', min: 0, max: 1, opcoes: [{ nome: 'Catupiry', preco: 9 }, { nome: 'Cheddar', preco: 9 }] }] },
  pz_frango: { grupos: [{ id: 'borda', nome: 'Borda', min: 0, max: 1, opcoes: [{ nome: 'Catupiry', preco: 9 }, { nome: 'Cheddar', preco: 9 }] }] },
  fritas: { serve: 'Serve 2 pessoas' },
  isca: { serve: 'Serve 3 pessoas', grupos: [{ id: 'molho', nome: 'Molhos', min: 1, max: 2, opcoes: [{ nome: 'Barbecue' }, { nome: 'Mostarda e mel' }, { nome: 'Maionese da casa' }, { nome: 'Cheddar', preco: 4 }] }] },
  refri: { grupos: [{ id: 'sabor', nome: 'Sabor', min: 1, max: 1, opcoes: [{ nome: 'Coca-Cola' }, { nome: 'Coca-Cola sem açúcar' }, { nome: 'Guaraná' }, { nome: 'Fanta laranja' }] }] },
  suco: { grupos: [{ id: 'sabor', nome: 'Sabor', min: 1, max: 1, opcoes: [{ nome: 'Laranja' }, { nome: 'Limão' }, { nome: 'Maracujá' }, { nome: 'Abacaxi com hortelã' }] }, { id: 'acucar', nome: 'Açúcar', min: 1, max: 1, opcoes: [{ nome: 'Com açúcar' }, { nome: 'Sem açúcar' }, { nome: 'Com adoçante' }] }] },
  agua: { grupos: [{ id: 'gas', nome: 'Tipo', min: 1, max: 1, opcoes: [{ nome: 'Sem gás' }, { nome: 'Com gás' }] }] },
  caipirinha: { grupos: [{ id: 'fruta', nome: 'Fruta', min: 1, max: 1, opcoes: [{ nome: 'Limão' }, { nome: 'Morango', preco: 3 }, { nome: 'Maracujá', preco: 3 }] }] },
  petit: { destaque: true, tags: ['Novo'] },
};
export const PRODUTOS = [
  P('parmegiana', 'pratos', 'Filé à parmegiana', 'Contrafilé empanado, molho de tomate e muçarela gratinada. Acompanha arroz e fritas.', 64.9, 'cozinha', { ficha: [['carne', 220], ['molho', 80], ['queijo', 90], ['arroz', 150], ['batata', 150]] }),
  P('executivo', 'pratos', 'Prato executivo de frango', 'Peito de frango grelhado, arroz, feijão, salada e fritas.', 34.9, 'cozinha', { ficha: [['frango', 180], ['arroz', 150], ['feijao', 120], ['batata', 100], ['alface', 0.2], ['tomate', 40]] }),
  P('risoto', 'pratos', 'Risoto de cogumelos', 'Arroz arbóreo cremoso com mix de cogumelos e parmesão.', 52.9, 'cozinha', { ficha: [['arroz', 160], ['queijo', 40]] }),
  P('quilo', 'pratos', 'Comida por quilo', 'Buffet livre: pese o prato e o valor sai pelo peso. Preço por quilo.', 69.9, 'cozinha', { porKg: true, ficha: [['arroz', 250], ['feijao', 150], ['carne', 200], ['batata', 150]] }),
  P('feijoada', 'pratos', 'Feijoada (sábado)', 'Feijoada completa com arroz, couve, farofa e laranja. Serve 1 pessoa bem.', 49.9, 'cozinha', { ficha: [['feijao', 250], ['calabresa', 80], ['bacon', 40], ['arroz', 150]] }),
  P('xburger', 'lanches', 'X-Burger da casa', 'Blend 150 g, muçarela, alface, tomate e molho da casa no pão brioche.', 32.9, 'cozinha', { adicionais: AD_LANCHE, ficha: [['blend', 1], ['pao', 1], ['queijo', 40], ['alface', 0.1], ['tomate', 30]] }),
  P('xbacon', 'lanches', 'X-Bacon', 'Blend 150 g, bacon crocante, muçarela e cebola caramelizada.', 38.9, 'cozinha', { adicionais: AD_LANCHE, ficha: [['blend', 1], ['pao', 1], ['queijo', 40], ['bacon', 50], ['cebola', 40]] }),
  P('xsalada', 'lanches', 'X-Salada', 'Blend 150 g, muçarela, alface, tomate e cebola roxa.', 34.9, 'cozinha', { adicionais: AD_LANCHE, ficha: [['blend', 1], ['pao', 1], ['queijo', 40], ['alface', 0.15], ['tomate', 40], ['cebola', 20]] }),
  P('frango_lanche', 'lanches', 'Lanche de frango crocante', 'Frango empanado, maionese da casa, alface e tomate.', 31.9, 'cozinha', { adicionais: AD_LANCHE, ficha: [['frango', 140], ['pao', 1], ['alface', 0.1], ['tomate', 30]] }),
  P('pz_calabresa', 'pizzas', 'Pizza calabresa', 'Molho, muçarela, calabresa fatiada e cebola. 8 pedaços.', 59.9, 'cozinha', { pizza: true, ficha: [['massa', 1], ['molho', 120], ['queijo', 250], ['calabresa', 180], ['cebola', 60]] }),
  P('pz_mucarela', 'pizzas', 'Pizza muçarela', 'Molho, muçarela, tomate e orégano. 8 pedaços.', 54.9, 'cozinha', { pizza: true, ficha: [['massa', 1], ['molho', 120], ['queijo', 350], ['tomate', 60]] }),
  P('pz_portuguesa', 'pizzas', 'Pizza portuguesa', 'Presunto, ovo, cebola, ervilha e muçarela. 8 pedaços.', 64.9, 'cozinha', { pizza: true, ficha: [['massa', 1], ['molho', 120], ['queijo', 250], ['presunto', 120], ['ovo', 2], ['cebola', 50]] }),
  P('pz_frango', 'pizzas', 'Pizza frango com catupiry', 'Frango desfiado e catupiry original. 8 pedaços.', 64.9, 'cozinha', { pizza: true, ficha: [['massa', 1], ['molho', 100], ['queijo', 200], ['frango', 200]] }),
  P('fritas', 'porcoes', 'Batata frita', 'Porção de 400 g, crocante. Acompanha maionese da casa.', 29.9, 'cozinha', { adicionais: [{ nome: 'Cheddar e bacon', preco: 12 }], ficha: [['batata', 400]] }),
  P('isca', 'porcoes', 'Isca de frango', 'Tirinhas de frango empanadas, 500 g, com molho.', 44.9, 'cozinha', { ficha: [['frango', 500]] }),
  P('calabresa_acebolada', 'porcoes', 'Calabresa acebolada', 'Calabresa fatiada na chapa com cebola. Acompanha pão.', 36.9, 'cozinha', { ficha: [['calabresa', 350], ['cebola', 120]] }),
  P('refri', 'bebidas', 'Refrigerante lata', 'Coca-Cola, Guaraná ou Fanta, 350 ml.', 7.0, 'bar', { ficha: [['refri', 1]], foto: '' }),
  P('cerveja', 'bebidas', 'Cerveja long neck', 'Long neck 330 ml bem gelada.', 11.9, 'bar', { ficha: [['cerveja', 1]] }),
  P('suco', 'bebidas', 'Suco natural', 'Laranja, limão, maracujá ou abacaxi com hortelã, 500 ml.', 12.9, 'bar', { ficha: [['suco', 100]] }),
  P('caipirinha', 'bebidas', 'Caipirinha', 'Limão, açúcar e cachaça artesanal.', 19.9, 'bar'),
  P('agua', 'bebidas', 'Água mineral', 'Com ou sem gás, 500 ml.', 5.0, 'bar', { foto: '' }),
  P('petit', 'sobremesas', 'Petit gâteau', 'Bolinho de chocolate quente com sorvete de creme.', 24.9, 'cozinha', { ficha: [['chocolate', 60]] }),
  P('pudim', 'sobremesas', 'Pudim de leite', 'Pudim caseiro com calda de caramelo.', 14.9, 'cozinha', { ficha: [['leite_cond', 80], ['ovo', 1]] }),
].map((p) => ({ ...p, ficha: p.ficha.map(([insumo, qtd]) => ({ insumo, qtd })), ...(EXTRAS[p.id] || {}) }))
  // pizza: broto (4 pedaços, 60% do preço, metade da ficha) e grande (8 pedaços)
  .map((p) => (p.pizza ? { ...p, tamanhos: [{ nome: 'Broto · 4 pedaços', preco: Math.round(p.preco * 0.6 * 10) / 10 - 0.1, fator: 0.5 }, { nome: 'Grande · 8 pedaços', preco: p.preco, fator: 1 }] } : p));

export const OBS_RAPIDAS = ['Sem cebola', 'Sem tomate', 'Bem passado', 'Ao ponto', 'Mal passado', 'Sem gelo', 'Com gelo e limão', 'Molho à parte', 'Pouco sal', 'Para viagem'];

export const BAIRROS = [['Centro', 5], ['Jardim Paulista', 6], ['Vila Nova', 7], ['Jardim Boa Vista', 8], ['Parque das Árvores', 9], ['Distrito Industrial', 12]].map(([nome, taxa]) => ({ nome, taxa }));

export const CONFIG = {
  nome: 'Cantina Ferraz', cidade: 'Orlândia', servico: 10, mesas: 12, whatsapp: '16999990000',
  pix: { tipo: 'aleatoria', chave: '1f3c2a8e-0000-4000-8000-00000000c0de', exemplo: true },
  garcons: ['Rafael', 'Bruna', 'Diego'],
  // o que o cliente vê no cardápio online (a cara do restaurante) e as regras do delivery
  loja: { cor: '#B4532F', tema: 'claro', template: 'taverna', estilo: 'rustico', logo: 'img/c-logo-exemplo.webp?v=1', capa: 'fotos/capa.webp', boasVindas: 'Pizzas · Massas · Grelhados', endereco: 'Rua das Palmeiras, 210 · Centro', instagram: 'cantinaferraz', aviso: 'Sábado tem feijoada completa no almoço',
    horarios: [[['11:00', '15:00'], ['18:00', '23:30']], [], [['11:00', '15:00'], ['18:00', '23:00']], [['11:00', '15:00'], ['18:00', '23:00']], [['11:00', '15:00'], ['18:00', '23:00']], [['11:00', '15:00'], ['18:00', '00:30']], [['11:00', '15:30'], ['18:00', '00:30']]],
    aceitaQR: true, delivery: true, retirada: true, pedidoMinimo: 30, tempoEntrega: '40 a 60 min', tempoRetirada: '20 a 30 min', pagamentos: ['Pix', 'Cartão na entrega', 'Dinheiro'],
    areas: [{ nome: 'Salão', de: 1, ate: 8 }, { nome: 'Varanda', de: 9, ate: 12 }], couvert: 0, comissao: 10 },
};
// exemplo: clientes do delivery, entregadores e cupons
export const CLIENTES = [['16991234567', 'Patrícia Lima', 'Rua das Acácias, 120', 'Jardim Paulista', 7, 412.6], ['16998887766', 'Marcos Andrade', 'Av. Brasil, 1450, ap 32', 'Centro', 4, 238.9], ['16997776655', 'Fernanda Rocha', 'Rua Goiás, 88', 'Vila Nova', 11, 689.4], ['16996665544', 'Lucas Prado', 'Rua Bahia, 301', 'Jardim Boa Vista', 2, 97.8]]
  .map(([tel, nome, end, bairro, pedidos, total], k) => ({ id: 't' + tel, tel, nome, end, bairro, pedidos, total, primeiro: Date.now() - (60 + k * 9) * 864e5, ultimo: Date.now() - (k * 3 + 1) * 864e5 }));
export const ENTREGADORES = [{ id: 'e1', nome: 'Júnior', tel: '16995554433' }, { id: 'e2', nome: 'Wellington', tel: '16994443322' }];
export const CUPONS = [{ id: 'cp1', codigo: 'BEMVINDO10', tipo: '%', valor: 10, minimo: 40, ate: '', limite: 0, usos: 3, ativo: true, desc: '10% no primeiro pedido pelo link' }, { id: 'cp2', codigo: 'FRETEZERO', tipo: 'R$', valor: 6, minimo: 60, ate: '', limite: 50, usos: 12, ativo: true, desc: 'R$ 6 de desconto (paga a entrega)' }];

const MIN = 60e3;
// conta real nova: sem nada de exemplo (o cardápio de exemplo pode ser carregado em Mais › Cardápio)
export function estadoVazio(nome = 'Meu restaurante', agora = Date.now()) {
  return {
    versao: 1, criado: agora, config: { nome, cidade: '', servico: 10, mesas: 10, whatsapp: '', pix: { tipo: '', chave: '', exemplo: false }, garcons: [], loja: {} },
    clientes: [], entregadores: [], cupons: [],
    categorias: CATEGORIAS.map((c) => ({ ...c })), produtos: [], insumos: [], bairros: [],
    comandas: [], chamados: [], pedidosQR: [], vendas: [], numPedido: 1, caixa: null, compras: [],
  };
}
// o cardápio de exemplo (pratos, fotos e fichas técnicas) para quem quer começar por ele e ir editando
export const cardapioExemplo = () => ({ produtos: PRODUTOS.map((p) => JSON.parse(JSON.stringify(p))), insumos: INSUMOS.map((i) => ({ ...i, estoque: 0 })) });
// estado inicial da demonstração (os horários são relativos a "agora")
export function estadoInicial(agora = Date.now()) {
  const it = (prod, qtd, status, minAtras, extra = {}) => {
    const p = PRODUTOS.find((x) => x.id === prod);
    return { id: Math.random().toString(36).slice(2, 10), prod, nome: p.nome, qtd, preco: p.preco, setor: p.setor, obs: '', adic: [], status, enviado: agora - minAtras * MIN, ...(status === 'pronto' ? { pronto: agora - 1 * MIN } : {}), ...extra };
  };
  const mesa = (n, pessoas, minAtras, garcom, itens, extra = {}) => ({ id: `m${n}-${agora}`, tipo: 'mesa', mesa: n, pessoas, aberta: agora - minAtras * MIN, garcom, itens, pagamentos: [], servico: true, ...extra });
  const comandas = [
    mesa(1, 2, 38, 'Rafael', [it('executivo', 2, 'entregue', 30), it('suco', 2, 'entregue', 34), it('pudim', 1, 'preparo', 3)]),
    mesa(3, 4, 52, 'Bruna', [it('parmegiana', 2, 'pronto', 18), it('risoto', 1, 'pronto', 18), it('cerveja', 4, 'entregue', 45), it('fritas', 1, 'entregue', 40)]),
    mesa(5, 3, 70, 'Rafael', [it('pz_calabresa', 1, 'entregue', 50, { meia: { a: 'pz_calabresa', b: 'pz_portuguesa' }, nome: 'Pizza meia calabresa / meia portuguesa', preco: 64.9 }), it('refri', 3, 'entregue', 60), it('petit', 2, 'entregue', 15)], { pediuConta: agora - 2 * MIN }),
    mesa(6, 6, 12, 'Diego', [it('isca', 1, 'preparo', 6), it('cerveja', 6, 'entregue', 10), it('calabresa_acebolada', 1, 'novo', 1)]),
    mesa(8, 2, 25, 'Bruna', [it('xbacon', 1, 'preparo', 9, { obs: 'Sem cebola', adic: [{ nome: 'Ovo', preco: 3 }] }), it('xburger', 1, 'preparo', 9), it('refri', 2, 'entregue', 20)]),
    mesa(10, 4, 41, 'Diego', [it('feijoada', 3, 'entregue', 30), it('caipirinha', 2, 'entregue', 35), it('agua', 1, 'entregue', 35)]),
    mesa(11, 2, 19, 'Rafael', [it('pz_mucarela', 1, 'pronto', 16, { meia: { a: 'pz_mucarela', b: 'pz_frango' }, nome: 'Pizza meia muçarela / meia frango com catupiry', preco: 64.9 })]),
    { id: `b1-${agora}`, tipo: 'delivery', num: 41, aberta: agora - 22 * MIN, cliente: { nome: 'Patrícia Lima', tel: '16991234567', end: 'Rua das Acácias, 120', bairro: 'Jardim Paulista' }, taxaEntrega: 6, entrega: 'preparo', itens: [it('xbacon', 2, 'preparo', 20), it('fritas', 1, 'preparo', 20), it('refri', 2, 'novo', 20)], pagamentos: [], pagarNaEntrega: 'Pix', servico: false, origem: 'cardápio online' },
    { id: `b2-${agora}`, tipo: 'delivery', num: 40, aberta: agora - 35 * MIN, cliente: { nome: 'Marcos Andrade', tel: '16998887766', end: 'Av. Brasil, 1450, ap 32', bairro: 'Centro' }, taxaEntrega: 5, entrega: 'saiu', saiu: agora - 6 * MIN, itens: [it('pz_portuguesa', 1, 'entregue', 33), it('cerveja', 2, 'entregue', 33)], pagamentos: [{ forma: 'Cartão de crédito', valor: 93.7 }], servico: false, origem: 'telefone' },
    { id: `b3-${agora}`, tipo: 'balcao', num: 42, aberta: agora - 4 * MIN, cliente: { nome: 'Juliana' }, itens: [it('xsalada', 1, 'novo', 3), it('suco', 1, 'novo', 3)], pagamentos: [], servico: false, origem: 'balcão' },
  ];
  const chamados = [{ id: 'c1', mesa: 8, tipo: 'garcom', ts: agora - 1 * MIN, origem: 'QR' }];
  const pedidosQR = [{ id: 'q1', mesa: 2, ts: agora - 3 * MIN, itens: [{ prod: 'xburger', qtd: 2, obs: '' }, { prod: 'refri', qtd: 2, obs: '' }], nome: 'Mesa 2 (QR)' }];
  return {
    versao: 1, exemplo: 4, criado: agora, config: JSON.parse(JSON.stringify(CONFIG)), categorias: CATEGORIAS.map((c) => ({ ...c })),
    produtos: PRODUTOS.map((p) => JSON.parse(JSON.stringify(p))), insumos: INSUMOS.map((i) => ({ ...i })), bairros: BAIRROS.map((b) => ({ ...b })),
    comandas, chamados, pedidosQR, vendas: historico(agora), numPedido: 43,
    clientes: CLIENTES.map((c) => ({ ...c })), entregadores: ENTREGADORES.map((e) => ({ ...e })), cupons: CUPONS.map((c) => ({ ...c })),
    caixa: { aberto: agora - 5 * 3600e3, troco: 200, movimentos: [{ tipo: 'sangria', valor: 100, motivo: 'Depósito no banco', ts: agora - 2 * 3600e3 }], operador: 'Bruna' },
    compras: [],
  };
}

// 30 dias de vendas fechadas (para relatórios): mais movimento na sexta e no sábado, almoço e jantar
function historico(agora) {
  const v = []; let seed = 7;
  const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const formas = ['Pix', 'Pix', 'Cartão de débito', 'Cartão de crédito', 'Cartão de crédito', 'Dinheiro'];
  for (let d = 30; d >= 0; d--) {
    const dia = new Date(agora - d * 864e5); const sem = dia.getDay();
    const qtd = sem === 1 ? 0 : Math.round((sem === 5 || sem === 6 ? 34 : sem === 0 ? 26 : 16) * (0.8 + r() * 0.4));
    for (let k = 0; k < qtd; k++) {
      const h = r() < 0.4 ? 12 + r() * 2 : 19 + r() * 3.5; const ts = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), Math.floor(h), Math.floor((h % 1) * 60)).getTime();
      if (ts > agora - 10 * 60e3) continue; // hoje: só o que já passou
      const itens = []; const n = 1 + Math.floor(r() * 4);
      for (let j = 0; j < n; j++) { const p = PRODUTOS[Math.floor(r() * PRODUTOS.length)]; itens.push({ prod: p.id, nome: p.nome, qtd: 1 + Math.floor(r() * 2), preco: p.preco }); }
      const sub = itens.reduce((s, i) => s + i.qtd * i.preco, 0); const tipo = r() < 0.6 ? 'mesa' : r() < 0.5 ? 'delivery' : 'balcao';
      const total = Math.round((sub * (tipo === 'mesa' ? 1.1 : 1) + (tipo === 'delivery' ? 6 : 0)) * 100) / 100;
      v.push({ id: `h${d}-${k}`, ts, tipo, itens, total, servico: tipo === 'mesa' ? Math.round(sub * 10) / 100 : 0, forma: formas[Math.floor(r() * formas.length)], cancelado: r() < 0.02, garcom: tipo === 'mesa' ? ['Rafael', 'Bruna', 'Diego'][Math.floor(r() * 3)] : '' });
    }
  }
  return v;
}
