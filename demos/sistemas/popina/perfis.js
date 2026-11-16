// Popina · perfil de cada tipo de casa: quais funções o template liga e quais esconde.
// O template muda o visual E as funções; o dono pode ligar/desligar cada função em Gestão › Aparência.
// Funções comuns a todos (salão, cozinha, caixa, cardápio, estoque, relatórios, equipe) não aparecem aqui.

// catálogo das funções especiais: [nome curto, o que faz (1 linha, para o dono)]
export const MODULOS = {
  delivery: ['Delivery e retirada', 'Pedidos pelo link, taxa por bairro, entregadores e acompanhamento do pedido'],
  quilo: ['Venda por quilo', 'Prato pesado na balança, com tara do prato e preço do quilo'],
  meiaMeia: ['Pizza em frações', 'Meia a meia, 1/3 e 1/4 de sabores, com borda recheada por tamanho'],
  rodizio: ['Rodízio', 'Preço por pessoa (adulto e criança), itens inclusos e itens cobrados à parte'],
  cartaoRodizio: ['Cartão verde e vermelho', 'A mesa sinaliza se quer mais carne; o passador vê quem pediu'],
  rodadas: ['Pedido por rodada', 'Limite de peças por rodada no rodízio, para evitar desperdício'],
  senha: ['Senha de balcão', 'O pedido ganha um número e a tela de retirada chama o cliente quando fica pronto'],
  fidelidade: ['Cartão fidelidade', 'Carimbo a cada compra; ao completar, o cliente ganha o prêmio'],
  comandaIndividual: ['Comanda individual', 'Cada pessoa tem a própria comanda (cartão numerado), mesmo na mesma mesa'],
  happyHour: ['Happy hour', 'Preço especial automático por dia e horário'],
  portaria: ['Portaria e entrada', 'Ingresso na entrada, consumação mínima, lista e lotação da casa em tempo real'],
  reservas: ['Reservas e fila de espera', 'Reserva com data, hora e pessoas; fila na porta com aviso pelo WhatsApp'],
  etapas: ['Sequência de pratos', 'Entrada, principal e sobremesa: a cozinha só recebe a próxima etapa quando o garçom libera'],
  eventos: ['Eventos', 'Evento com pacote por pessoa, lista de convidados e couvert artístico'],
  couvert: ['Couvert', 'Couvert por pessoa cobrado na conta, com opção de couvert artístico'],
  combos: ['Combos', 'Lanche, acompanhamento e bebida com preço fechado'],
  picancia: ['Nível de pimenta', 'O cliente escolhe suave, médio, picante ou extra; a cozinha vê destacado'],
  pontoCarne: ['Ponto da carne', 'Mal passado, ao ponto ou bem passado no pedido, destacado na cozinha'],
  pontoMassa: ['Ponto da massa', 'Al dente ou mais macia, destacado na cozinha'],
  harmonizacao: ['Harmonização', 'Sugere o vinho ou a bebida certa para cada prato, no cardápio e na comanda'],
  porcoesFamilia: ['Porções para compartilhar', 'Pratos para 2, 3 ou 4 pessoas, com a quantidade na comanda'],
  pratoDoDia: ['Prato do dia', 'Prato com preço especial em cada dia da semana, destacado no cardápio'],
  encomendas: ['Encomendas', 'Pedido para data e hora futuras (bolos, massas, pizzas agendadas)'],
  vitrine: ['Vitrine', 'Itens prontos sem passar pela cozinha, com quantidade feita no dia'],
  alergenicos: ['Alergênicos', 'Marca glúten, lactose, vegano etc.; o cliente filtra o cardápio'],
};

// por template: liga = funções especiais ligadas por padrão; esconde = funções comuns que saem; tela = foco da tela inicial
export const PERFIS = {
  basico: { tipo: 'Restaurante', liga: ['delivery', 'quilo', 'pratoDoDia', 'alergenicos'], esconde: [], destaque: 'O essencial para qualquer restaurante: salão, cozinha, caixa, delivery e prato do dia.' },
  taverna: { tipo: 'Cantina e comida caseira', liga: ['delivery', 'pratoDoDia', 'porcoesFamilia', 'etapas', 'alergenicos'], esconde: [], destaque: 'Prato do dia, porções para a família dividir e a sequência entrada, principal e sobremesa.' },
  luxo: { tipo: 'Restaurante fino', liga: ['reservas', 'etapas', 'harmonizacao', 'couvert', 'alergenicos'], esconde: ['delivery'], destaque: 'Reservas, menu em etapas que a cozinha recebe na hora certa, couvert e harmonização de vinhos.' },
  realeza: { tipo: 'Casa clássica e eventos', liga: ['reservas', 'eventos', 'couvert', 'etapas', 'alergenicos'], esconde: ['delivery'], destaque: 'Eventos com pacote e lista de convidados, reservas e couvert artístico.' },
  japones: { tipo: 'Japonês', liga: ['delivery', 'rodizio', 'rodadas', 'combos', 'alergenicos'], esconde: [], destaque: 'Rodízio por pessoa com limite por rodada, combinados e delivery.' },
  italiano: { tipo: 'Italiano e trattoria', liga: ['delivery', 'pontoMassa', 'etapas', 'harmonizacao', 'reservas', 'couvert', 'alergenicos'], esconde: [], destaque: 'Ponto da massa, sequência de pratos, harmonização de vinhos e reservas.' },
  churrascaria: { tipo: 'Churrascaria', liga: ['rodizio', 'cartaoRodizio', 'pontoCarne', 'quilo', 'alergenicos'], esconde: ['delivery'], destaque: 'Rodízio adulto e criança, cartão verde e vermelho na mesa e ponto da carne.' },
  mexicano: { tipo: 'Mexicano', liga: ['delivery', 'picancia', 'combos', 'happyHour', 'alergenicos'], esconde: [], destaque: 'Nível de pimenta, combos de tacos e burritos e happy hour.' },
  pizzaria: { tipo: 'Pizzaria', liga: ['delivery', 'meiaMeia', 'combos', 'encomendas', 'fidelidade', 'alergenicos'], esconde: [], destaque: 'Pizza em frações e bordas, combos, pizza agendada e cartão fidelidade.' },
  hamburgueria: { tipo: 'Hamburgueria', liga: ['delivery', 'combos', 'pontoCarne', 'senha', 'fidelidade', 'alergenicos'], esconde: [], destaque: 'Combos, ponto da carne, senha de balcão e cartão fidelidade.' },
  pub: { tipo: 'Bar e pub', liga: ['comandaIndividual', 'happyHour', 'couvert', 'porcoesFamilia', 'alergenicos'], esconde: ['delivery'], destaque: 'Comanda individual por pessoa, happy hour, couvert artístico e porções.' },
  chines: { tipo: 'Chinês', liga: ['delivery', 'porcoesFamilia', 'picancia', 'combos', 'quilo', 'alergenicos'], esconde: [], destaque: 'Porções para compartilhar, nível de pimenta, combos e buffet por quilo.' },
  balada: { tipo: 'Balada e casa noturna', liga: ['portaria', 'comandaIndividual', 'happyHour', 'reservas'], esconde: ['delivery'], destaque: 'Portaria com ingresso e consumação mínima, comanda individual, camarotes e lotação.' },
  cafeteria: { tipo: 'Cafeteria e padaria', liga: ['delivery', 'senha', 'fidelidade', 'vitrine', 'encomendas', 'pratoDoDia', 'alergenicos'], esconde: [], destaque: 'Senha de balcão, cartão fidelidade de carimbo, vitrine do dia e encomendas.' },
};

// funções ligadas de fato: o padrão do template, com o que o dono ligou/desligou à mão por cima
export function modulosAtivos(loja = {}) {
  const p = PERFIS[loja.template] || PERFIS.basico, m = loja.modulos || {};
  const ativos = new Set(p.liga);
  if (!p.esconde.includes('delivery') && !ativos.has('delivery')) ativos.add('delivery');
  Object.entries(m).forEach(([k, v]) => { if (v) ativos.add(k); else ativos.delete(k); });
  return ativos;
}
export const temModulo = (loja, k) => modulosAtivos(loja).has(k);

// o que muda ao trocar de template (para o aviso antes da troca)
export function diferenca(de, para) {
  const a = new Set((PERFIS[de] || PERFIS.basico).liga), b = new Set((PERFIS[para] || PERFIS.basico).liga);
  return { entram: [...b].filter((k) => !a.has(k)), saem: [...a].filter((k) => !b.has(k)) };
}
