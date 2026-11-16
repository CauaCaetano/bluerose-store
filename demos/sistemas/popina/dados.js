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
  ['whisky', 'Whisky 12 anos (garrafa de 1 L)', 'dose', 'garrafa', 20, 66, 20, 189.0],
].map(([id, nome, unid, compra, fator, estoque, minimo, custo]) => ({ id, nome, unid, compra, fator, estoque, minimo, custo }));

const P = (id, cat, nome, desc, preco, setor, extra = {}) => ({ id, cat, nome, desc, preco, setor, foto: `fotos/${id}.webp`, ativo: true, adicionais: [], ficha: [], ...extra });
const AD_LANCHE = [{ nome: 'Bacon', preco: 6 }, { nome: 'Ovo', preco: 3 }, { nome: 'Queijo extra', preco: 4 }, { nome: 'Cheddar', preco: 5 }];
const PONTO = { id: 'ponto', nome: 'Ponto da carne', min: 1, max: 1, opcoes: [{ nome: 'Mal passado' }, { nome: 'Ao ponto' }, { nome: 'Bem passado' }] };
// funções da casa no exemplo (aparecem quando o template liga a função): etapa, pimenta, ponto, harmonização, alergênicos, vitrine, combo
const AL = (...a) => ({ alergenos: a });
const EXTRAS = {
  parmegiana: { destaque: true, tags: ['Mais pedido'], serve: 'Serve 1 pessoa bem', etapa: 'principal', harmoniza: 'vinho', ...AL('gluten', 'lactose', 'ovo'), grupos: [PONTO, { id: 'acomp', nome: 'Trocar acompanhamento', min: 0, max: 1, opcoes: [{ nome: 'Purê no lugar da fritas', preco: 0 }, { nome: 'Salada no lugar do arroz', preco: 0 }] }] },
  executivo: { tags: ['Almoço'], turno: 'almoco', etapa: 'principal', grupos: [{ id: 'salada', nome: 'Salada', min: 1, max: 1, opcoes: [{ nome: 'Alface e tomate' }, { nome: 'Sem salada' }] }] },
  risoto: { tags: ['Vegetariano'], etapa: 'principal', harmoniza: 'vinho', ...AL('lactose', 'vegetariano') },
  feijoada: { tags: ['Só sábado'], turno: 'almoco', etapa: 'principal', harmoniza: 'caipirinha' },
  quilo: { faixasKg: [{ de: '14:30', preco: 49.9 }] },
  xburger: { grupos: [PONTO], ...AL('gluten', 'lactose') },
  xbacon: { destaque: true, tags: ['Mais pedido'], grupos: [PONTO], ...AL('gluten', 'lactose') },
  xsalada: { grupos: [PONTO], promoDe: 37.9, ...AL('gluten', 'lactose') },
  frango_lanche: { picancia: true, ...AL('gluten', 'ovo') },
  pz_calabresa: { destaque: true, harmoniza: 'cerveja', ...AL('gluten', 'lactose'), grupos: [{ id: 'borda', nome: 'Borda', min: 0, max: 1, opcoes: [{ nome: 'Catupiry', preco: 9 }, { nome: 'Cheddar', preco: 9 }, { nome: 'Chocolate', preco: 11 }] }] },
  pz_mucarela: { tags: ['Vegetariano'], ...AL('gluten', 'lactose', 'vegetariano'), grupos: [{ id: 'borda', nome: 'Borda', min: 0, max: 1, opcoes: [{ nome: 'Catupiry', preco: 9 }, { nome: 'Cheddar', preco: 9 }] }] },
  pz_portuguesa: { ...AL('gluten', 'lactose', 'ovo'), grupos: [{ id: 'borda', nome: 'Borda', min: 0, max: 1, opcoes: [{ nome: 'Catupiry', preco: 9 }, { nome: 'Cheddar', preco: 9 }] }] },
  pz_frango: { ...AL('gluten', 'lactose'), grupos: [{ id: 'borda', nome: 'Borda', min: 0, max: 1, opcoes: [{ nome: 'Catupiry', preco: 9 }, { nome: 'Cheddar', preco: 9 }] }] },
  fritas: { serve: 'Serve 2 pessoas', ...AL('vegano') },
  isca: { serve: 'Serve 3 pessoas', picancia: true, ...AL('gluten'), grupos: [{ id: 'molho', nome: 'Molhos', min: 1, max: 2, opcoes: [{ nome: 'Barbecue' }, { nome: 'Mostarda e mel' }, { nome: 'Maionese da casa' }, { nome: 'Cheddar', preco: 4 }] }] },
  refri: { grupos: [{ id: 'sabor', nome: 'Sabor', min: 1, max: 1, opcoes: [{ nome: 'Coca-Cola' }, { nome: 'Coca-Cola sem açúcar' }, { nome: 'Guaraná' }, { nome: 'Fanta laranja' }] }] },
  suco: { grupos: [{ id: 'sabor', nome: 'Sabor', min: 1, max: 1, opcoes: [{ nome: 'Laranja' }, { nome: 'Limão' }, { nome: 'Maracujá' }, { nome: 'Abacaxi com hortelã' }] }, { id: 'acucar', nome: 'Açúcar', min: 1, max: 1, opcoes: [{ nome: 'Com açúcar' }, { nome: 'Sem açúcar' }, { nome: 'Com adoçante' }] }] },
  agua: { grupos: [{ id: 'gas', nome: 'Tipo', min: 1, max: 1, opcoes: [{ nome: 'Sem gás' }, { nome: 'Com gás' }] }] },
  caipirinha: { grupos: [{ id: 'fruta', nome: 'Fruta', min: 1, max: 1, opcoes: [{ nome: 'Limão' }, { nome: 'Morango', preco: 3 }, { nome: 'Maracujá', preco: 3 }] }] },
  petit: { destaque: true, tags: ['Novo'], etapa: 'sobremesa', ...AL('gluten', 'lactose', 'ovo') },
  pudim: { etapa: 'sobremesa', ...AL('lactose', 'ovo') },
  suco: { ...AL('vegano') },
  calabresa_acebolada: { serve: 'Para 2 ou para 4 pessoas', picancia: 'opcional', tamanhos: [{ nome: 'Para 2 pessoas', preco: 36.9, fator: 1 }, { nome: 'Para 4 pessoas', preco: 64.9, fator: 2 }] },
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
  // itens das funções da casa (entrada, massa com ponto, vinho, carne com ponto, combo e vitrine)
  P('bruschetta', 'porcoes', 'Bruschetta de tomate', 'Pão italiano tostado, tomate, manjericão e azeite. 4 unidades.', 24.9, 'cozinha', { foto: '', etapa: 'entrada', alergenos: ['gluten', 'vegano'], ficha: [['tomate', 120]] }),
  P('espaguete', 'pratos', 'Espaguete à bolonhesa', 'Massa fresca com molho de carne cozido devagar e parmesão.', 46.9, 'cozinha', { foto: '', pontoMassa: true, etapa: 'principal', harmoniza: 'vinho', alergenos: ['gluten', 'lactose', 'ovo'], ficha: [['carne', 120], ['molho', 150], ['queijo', 30]] }),
  P('picanha', 'porcoes', 'Picanha na chapa', 'Picanha fatiada na chapa com cebola, farofa e vinagrete.', 89.9, 'cozinha', { foto: '', pontoCarne: true, serve: 'Serve 2 pessoas', harmoniza: 'cerveja', ficha: [['carne', 400], ['cebola', 80]] }),
  P('vinho', 'bebidas', 'Vinho tinto (taça)', 'Taça de 150 ml do tinto da casa.', 24.9, 'bar', { foto: '' }),
  P('combo_burger', 'lanches', 'Combo da casa', 'Escolha o lanche, o acompanhamento e a bebida, com preço fechado.', 54.9, 'cozinha', { foto: 'fotos/xburger.webp', tags: ['Combo'], combo: [{ nome: 'Lanche', itens: ['xburger', 'xsalada', 'frango_lanche'] }, { nome: 'Acompanhamento', itens: ['fritas', 'pao_queijo'] }, { nome: 'Bebida', itens: ['refri', 'cerveja', 'agua'] }] }),
  P('pao_queijo', 'lanches', 'Pão de queijo (6 unidades)', 'Feito aqui todo dia, sai quentinho da vitrine.', 12.9, 'cozinha', { foto: '', vitrine: true, alergenos: ['lactose', 'ovo'] }),
  P('chopp', 'bebidas', 'Chopp pilsen 300 ml', 'Tirado na hora, do barril.', 12.9, 'bar', { foto: '', ml: 300 }),
  P('dose_whisky', 'bebidas', 'Dose de whisky 12 anos', 'Dose de 50 ml, pura ou com gelo.', 29.9, 'bar', { foto: '', ficha: [['whisky', 1]] }),
  P('bolo', 'sobremesas', 'Bolo de cenoura com chocolate', 'Fatia generosa do bolo do dia, da vitrine.', 11.9, 'cozinha', { foto: '', vitrine: true, etapa: 'sobremesa', alergenos: ['gluten', 'lactose', 'ovo'] }),
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
    areas: [{ nome: 'Salão', de: 1, ate: 8 }, { nome: 'Varanda', de: 9, ate: 12 }], couvert: 0, comissao: 10,
    // regras das funções da casa (cada uma só vale com a função ligada pelo template ou pelo dono)
    rodizio: { adulto: 69.9, crianca: 34.9, meia: 49.9, porRodada: 4, rodadaCat: { pizzas: 2, sobremesas: 0 }, inclusos: ['pz_calabresa', 'pz_mucarela', 'pz_portuguesa', 'pz_frango', 'fritas', 'isca', 'bruschetta', 'pudim'] },
    fracoes: { regra: 'caro', bordas: [{ nome: 'Catupiry', precos: [6, 9] }, { nome: 'Cheddar', precos: [6, 9] }, { nome: 'Chocolate', precos: [8, 11] }] },
    happyHour: [{ id: 'hh1', nome: 'Happy hour', dias: [1, 2, 3, 4, 5], de: '17:00', ate: '19:00', alvo: 'prod', ids: ['cerveja', 'caipirinha', 'fritas'], tipo: '%', valor: 30, ativo: true }],
    pratoDoDia: [{ prod: 'parmegiana', preco: 54.9 }, { prod: 'executivo', preco: 29.9 }, { prod: 'executivo', preco: 29.9 }, { prod: 'espaguete', preco: 39.9 }, { prod: 'risoto', preco: 44.9 }, { prod: 'parmegiana', preco: 56.9 }, { prod: 'feijoada', preco: 42.9 }],
    fidelidade: { compras: 8, premio: 'Uma pizza broto de muçarela', minimo: 30, alvo: '', ids: [], validade: 30 },
    turnos: { ligado: true, almoco: ['11:00', '15:00'], jantar: ['18:00', '23:30'] },
    taxaCartaoPerdido: 30, alertas: { mesa: 25, kds: 10 },
    encomendas: { antecedencia: 24 },
    portaria: { capacidade: 180, vipConsumacao: 0, promoters: [{ codigo: 'ANA', nome: 'Ana Clara' }, { codigo: 'LEO', nome: 'Léo Martins' }],
      ingressos: [{ nome: 'Pista', preco: 40, consumacao: 30, lotes: [{ nome: '1º lote', preco: 30, qtd: 5 }, { nome: '2º lote', preco: 40, qtd: 100 }, { nome: 'Na porta', preco: 50, qtd: 0 }] }, { nome: 'Camarote', preco: 120, consumacao: 100 }, { nome: 'Nome na lista', preco: 0, consumacao: 20 }] } },
};
// exemplo: clientes do delivery, entregadores e cupons
export const CLIENTES = [['16991234567', 'Patrícia Lima', 'Rua das Acácias, 120', 'Jardim Paulista', 7, 412.6], ['16998887766', 'Marcos Andrade', 'Av. Brasil, 1450, ap 32', 'Centro', 4, 238.9], ['16997776655', 'Fernanda Rocha', 'Rua Goiás, 88', 'Vila Nova', 11, 689.4], ['16996665544', 'Lucas Prado', 'Rua Bahia, 301', 'Jardim Boa Vista', 2, 97.8]]
  .map(([tel, nome, end, bairro, pedidos, total], k) => ({ id: 't' + tel, tel, nome, end, bairro, pedidos, total, carimbos: [6, 3, 8, 1][k], primeiro: Date.now() - (60 + k * 9) * 864e5, ultimo: Date.now() - (k * 3 + 1) * 864e5 }));
export const ENTREGADORES = [{ id: 'e1', nome: 'Júnior', tel: '16995554433' }, { id: 'e2', nome: 'Wellington', tel: '16994443322' }];
export const CUPONS = [{ id: 'cp1', codigo: 'BEMVINDO10', tipo: '%', valor: 10, minimo: 40, ate: '', limite: 0, usos: 3, ativo: true, desc: '10% no primeiro pedido pelo link' }, { id: 'cp2', codigo: 'FRETEZERO', tipo: 'R$', valor: 6, minimo: 60, ate: '', limite: 50, usos: 12, ativo: true, desc: 'R$ 6 de desconto (paga a entrega)' }];

const MIN = 60e3;
const ymdEx = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const amanha15 = (agora) => { const d = new Date(agora + 864e5); d.setHours(15, 0, 0, 0); return d.getTime(); };
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
    // encomenda para amanhã às 15h (entra no quadro de pedidos no dia)
    { id: `b4-${agora}`, tipo: 'balcao', num: 39, aberta: agora - 26 * 60 * MIN, cliente: { nome: 'Sônia Prado', tel: '16992223344' }, encomenda: { para: amanha15(agora) }, itens: [it('pz_calabresa', 2, 'rascunho', 0, { enviado: undefined }), it('bolo', 4, 'rascunho', 0, { enviado: undefined })], pagamentos: [{ forma: 'Pix', valor: 167.4, ts: agora - 26 * 60 * MIN }], servico: false, origem: 'WhatsApp' },
  ];
  const hoje = ymdEx(agora);
  const reservas = [{ id: 'r1', data: hoje, hora: '20:00', nome: 'Carla Mendes', tel: '16991112233', pessoas: 4, mesa: 7, obs: 'Mesa perto da janela', restricoes: 'Alergia a camarão e amendoim', ocasiao: 'Aniversário', status: 'confirmada', origem: 'Balcão', criado: agora - 2 * 864e5 },
    { id: 'r0', data: ymdEx(agora - 9 * 864e5), hora: '20:30', nome: 'Roberto Lima', tel: '16995556677', pessoas: 2, mesa: 0, obs: '', status: 'naoveio', origem: 'Cardápio online', criado: agora - 10 * 864e5 },
    { id: 'r2', data: hoje, hora: '21:30', nome: 'Roberto Lima', tel: '16995556677', pessoas: 2, mesa: 0, obs: '', status: 'pendente', origem: 'Cardápio online', criado: agora - 90 * MIN }];
  const fila = [{ id: 'f1', nome: 'Família Souza', pessoas: 5, tel: '16993334455', ts: agora - 12 * MIN }];
  const eventos = [{ id: 'ev1', nome: 'Aniversário de 15 anos da Laura', data: ymdEx(agora + 5 * 864e5), hora: '20:00', pacote: 89.9, couvert: 15, obs: 'Buffet de massas e pizzas, refrigerante e suco à vontade',
    status: 'confirmado', previstos: 60, cliente: 'Marta Ferraz', tel: '16992224455',
    orcamento: [{ id: 'o1', desc: 'Decoração (flores e painel)', valor: 1800 }, { id: 'o2', desc: 'DJ e som (5 horas)', valor: 1200 }, { id: 'o3', desc: 'Aluguel do salão', valor: 1500 }],
    sinal: { valor: 2500, ts: agora - 20 * 864e5, forma: 'Pix' },
    parcelas: [{ id: 'pa1', venc: ymdEx(agora - 5 * 864e5), valor: 2000, pago: agora - 5 * 864e5 }, { id: 'pa2', venc: ymdEx(agora + 3 * 864e5), valor: 3000, pago: null }],
    convidados: ['Laura Ferraz', 'Marta Ferraz', 'João Ferraz', 'Beatriz Lima', 'Gabriel Souza', 'Sofia Andrade', 'Pedro Rocha', 'Helena Prado', 'Lucas Martins', 'Alice Costa'].map((nome, k) => ({ id: `g${k + 1}`, nome })) }];
  const vitrine = { dia: hoje, feito: { pao_queijo: 24, bolo: 8 }, qtd: { pao_queijo: 17, bolo: 5 } };
  // barril de 50 L na torneira, com 31 L restantes (19 L vendidos em copos de 300 ml)
  const barris = [{ id: 'br1', nome: 'Chopp pilsen', prods: ['chopp'], litros: 50, custo: 520, inicio: agora - 2 * 864e5, usado: { ex: 19000 } },
    { id: 'br0', nome: 'Chopp pilsen', prods: ['chopp'], litros: 50, custo: 520, inicio: agora - 6 * 864e5, fim: agora - 2 * 864e5, usado: { ex: 47100 }, perdaMl: 2900, rendimento: 94.2 }];
  // portaria da noite: 1º lote quase no fim, entradas por promoter, uma saída com volta e a lista VIP
  const nt = ymdEx(agora - 12 * 3600e3), ent = (min, ingresso, lote, preco, promoter, extra = {}) => ({ id: `pt${min}`, t: agora - min * MIN, nome: '', ingresso, ...(lote ? { lote } : {}), preco, cartao: 0, ...(promoter ? { promoter } : {}), ...extra });
  const portaria = { dia: nt, entradas: [ent(95, 'Pista', '1º lote', 30, 'ANA'), ent(88, 'Pista', '1º lote', 30, 'ANA', { saidas: 1, voltas: 1 }), ent(80, 'Pista', '1º lote', 30, 'LEO'), ent(71, 'Pista', '1º lote', 30, ''),
    ent(64, 'Camarote', '', 120, 'LEO'), ent(52, 'Lista VIP', '', 0, 'LEO', { nome: 'Rafaela Nunes', vip: 'v3' })] };
  const vip = [{ id: 'v1', nome: 'Bruno Tavares', noite: nt, ate: '00:30', promoter: 'ANA' }, { id: 'v2', nome: 'Camila Duarte', noite: nt, ate: '00:30', promoter: 'ANA' },
    { id: 'v3', nome: 'Rafaela Nunes', noite: nt, ate: '23:59', promoter: 'LEO', entrou: agora - 52 * MIN }];
  const chamados = [{ id: 'c1', mesa: 8, tipo: 'garcom', ts: agora - 1 * MIN, origem: 'QR' }];
  const pedidosQR = [{ id: 'q1', mesa: 2, ts: agora - 3 * MIN, itens: [{ prod: 'xburger', qtd: 2, obs: '' }, { prod: 'refri', qtd: 2, obs: '' }], nome: 'Mesa 2 (QR)' }];
  const vendas = historico(agora), ctl = controleExemplo(vendas, agora);
  return {
    versao: 1, exemplo: 7, criado: agora, reservas, fila, eventos, vitrine, barris, portaria, vip, config: JSON.parse(JSON.stringify(CONFIG)), categorias: CATEGORIAS.map((c) => ({ ...c })),
    produtos: PRODUTOS.map((p) => JSON.parse(JSON.stringify(p))), insumos: INSUMOS.map((i) => ({ ...i })), bairros: BAIRROS.map((b) => ({ ...b })),
    comandas, chamados, pedidosQR, vendas, numPedido: 43,
    clientes: CLIENTES.map((c) => ({ ...c })), entregadores: ENTREGADORES.map((e) => ({ ...e })), cupons: CUPONS.map((c) => ({ ...c })),
    caixa: { aberto: agora - 5 * 3600e3, troco: 200, movimentos: [{ tipo: 'sangria', valor: 100, motivo: 'Depósito no banco', ts: agora - 2 * 3600e3, quem: 'Bruna' }], operador: 'Bruna' },
    compras: [], ...ctl,
  };
}

// exemplo do controle: descontos com motivo, venda cancelada, itens cancelados, perdas e 3 caixas fechados
function controleExemplo(v, agora) {
  const auditoria = [], H = 3600e3, DIA = 864e5;
  const aud = (t, tipo, d) => auditoria.push({ id: `a${auditoria.length + 1}`, t, tipo, ...d });
  const MOT_D = ['Cliente frequente', 'Demora no pedido', 'Cortesia da casa', 'Aniversário'], MOT_C = ['Cobrado em duplicidade', 'Lançado errado', 'Cliente desistiu'];
  v.forEach((x, k) => {
    if (x.tipo === 'mesa') { x.mesa = 1 + (k % 12); x.pessoas = 2 + (k % 4); }
    // um desconto a cada 23 contas do salão
    if (x.tipo === 'mesa' && k % 23 === 5 && !x.cancelado) {
      const sub = x.itens.reduce((s, i) => s + i.qtd * i.preco, 0); x.desconto = Math.round(sub * 10) / 100; x.total = Math.round((x.total - x.desconto) * 100) / 100;
      x.descontoMotivo = MOT_D[k % MOT_D.length]; x.descontoQuem = x.garcom;
      aud(x.ts - 5 * MIN, 'desconto', { quem: x.garcom, mesa: x.mesa, valor: x.desconto, motivo: x.descontoMotivo, pct: 10 });
    }
    if (x.cancelado) { x.cancelado = { ts: x.ts + 20 * MIN, motivo: MOT_C[k % MOT_C.length], quem: 'Bruna · PIN do gerente', estoque: false }; aud(x.cancelado.ts, 'estorno', { quem: x.cancelado.quem, venda: x.id, mesa: x.mesa, valor: x.total, motivo: x.cancelado.motivo }); }
  });
  // garante uma venda cancelada ontem
  const ontem = new Date(agora - DIA).toDateString(), vc = v.filter((x) => new Date(x.ts).toDateString() === ontem && !x.cancelado).at(-1);
  if (vc) { vc.cancelado = { ts: vc.ts + 15 * MIN, motivo: 'Cobrado em duplicidade', quem: 'Bruna · PIN do gerente', estoque: false }; aud(vc.cancelado.ts, 'estorno', { quem: vc.cancelado.quem, venda: vc.id, mesa: vc.mesa, valor: vc.total, motivo: vc.cancelado.motivo }); }
  // itens cancelados depois de enviados
  [[1, 3, 'Rafael', 'Filé à parmegiana', 64.9, 'Saiu errado'], [2, 6, 'Diego', 'Cerveja long neck', 23.8, 'Lançado errado'], [4, 8, 'Bruna', 'Batata frita', 29.9, 'Cliente desistiu'], [6, 2, 'Rafael', 'Pizza calabresa', 59.9, 'Demorou demais']]
    .forEach(([d, mesa, quem, item, valor, motivo]) => aud(agora - d * DIA - 3 * H, 'cancelar-item', { quem: `${quem} · PIN do gerente`, mesa, item, qtd: valor > 20 && item.startsWith('Cerveja') ? 2 : 1, valor, motivo }));
  // perdas de estoque e um ajuste de inventário (custo na mesma conta do sistema: quantidade ÷ fator × preço)
  const movEstoque = [['tomate', -400, 'perda', 'Vencido', 1], ['cerveja', -2, 'perda', 'Quebra: caixa caiu na entrega', 2], ['carne', -220, 'perda', 'Erro de preparo', 3], ['refri', -3, 'perda', 'Consumo interno', 4], ['alface', -2, 'perda', 'Vencido', 5], ['queijo', -150, 'ajuste', 'Inventário', 6]]
    .map(([id, qtd, tipo, motivo, d], k) => { const i = INSUMOS.find((x) => x.id === id); return { id: `e${k + 1}`, t: agora - d * DIA - 2 * H, insumo: id, tipo, qtd, motivo, quem: k % 2 ? 'Diego' : 'Bruna', custo: Math.round((qtd / i.fator) * i.custo * 100) / 100 }; });
  movEstoque.filter((m) => m.tipo === 'perda').forEach((m) => aud(m.t, 'perda', { quem: m.quem, item: INSUMOS.find((i) => i.id === m.insumo).nome, qtd: -m.qtd, valor: m.custo, motivo: m.motivo }));
  // 3 caixas fechados (os últimos dias com venda)
  const fechamentos = [], difs = [[0, ''], [-12.5, 'Troco a mais para a mesa 7'], [3, 'Moedas não contadas na abertura']];
  for (let d = 1; d <= 10 && fechamentos.length < 3; d++) {
    const dia = new Date(agora - d * DIA), vd = v.filter((x) => new Date(x.ts).toDateString() === dia.toDateString() && !x.cancelado); if (!vd.length) continue;
    const n = fechamentos.length, base = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate()).getTime(), aberto = base + 10.5 * H, fechado = base + 23.75 * H;
    const porForma = {}; vd.forEach((x) => { porForma[x.forma] = Math.round(((porForma[x.forma] || 0) + x.total) * 100) / 100; });
    const movimentos = n === 0 ? [{ tipo: 'sangria', valor: 300, motivo: 'Depósito no banco', ts: base + 16 * H, quem: 'Bruna' }] : n === 1 ? [{ tipo: 'suprimento', valor: 50, motivo: 'Troco extra', ts: base + 18 * H, quem: 'Diego' }] : [];
    const sang = movimentos.filter((m) => m.tipo === 'sangria').reduce((s, m) => s + m.valor, 0), sup = movimentos.filter((m) => m.tipo === 'suprimento').reduce((s, m) => s + m.valor, 0);
    const gaveta = Math.round((200 + (porForma.Dinheiro || 0) - sang + sup) * 100) / 100, [dif, motivo] = difs[n], op = n % 2 ? 'Diego' : 'Bruna';
    const cega = n === 1 ? { cega: true, contadoPorForma: { ...porForma, Dinheiro: gaveta + dif }, esperadoPorForma: { ...porForma, Dinheiro: gaveta } } : {};
    fechamentos.push({ id: `f${n + 1}`, aberto, troco: 200, movimentos, operador: op, fechado, fechadoPor: op, motivo, abertas: [],
      resumo: { total: Math.round(vd.reduce((s, x) => s + x.total, 0) * 100) / 100, vendas: vd.length, porForma, sangria: sang, suprimento: sup, servico: Math.round(vd.reduce((s, x) => s + (x.servico || 0), 0) * 100) / 100, gaveta, contado: Math.round((gaveta + dif) * 100) / 100, diferenca: dif, ...cega } });
    if (dif) aud(fechado, 'caixa-diferenca', { quem: op, valor: dif, motivo });
  }
  aud(agora - 2 * H, 'sangria', { quem: 'Bruna', valor: 100, motivo: 'Depósito no banco' });
  return { fechamentos: fechamentos.reverse(), auditoria: auditoria.sort((a, b) => a.t - b.t), movEstoque };
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
