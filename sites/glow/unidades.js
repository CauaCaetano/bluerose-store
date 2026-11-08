// Glow · dados de exemplo das 11 unidades e dos tratamentos. Endereços, telefones, faixas de CEP e coordenadas são ilustrativos.
// No site real, esta lista vem do cadastro da rede (ou da agenda da clínica: Trinks, Avec, Belle Software…).
(function () {
  'use strict';
  // cep: [início, fim] dos 5 primeiros dígitos (faixa ilustrativa)
  var UNIDADES = [
    { id: 'moema', nome: 'Glow Moema', bairro: 'Moema', regiao: 'Zona Sul', endereco: 'Rua de Exemplo, 100 · Moema', cep: [4077, 4094], lat: -23.6005, lng: -46.6650, horario: 'Seg a sex, 8h às 21h · sáb, 8h às 18h', tel: '(11) 3000-0101', wa: '(11) 9 0000-0101', servicos: ['Facial', 'Injetáveis', 'Laser', 'Corpo'], chegar: 'Metrô Eucaliptos, 6 min a pé', carro: 'Estacionamento conveniado ao lado' },
    { id: 'pinheiros', nome: 'Glow Pinheiros', bairro: 'Pinheiros', regiao: 'Zona Oeste', endereco: 'Rua de Exemplo, 200 · Pinheiros', cep: [5401, 5429], lat: -23.5660, lng: -46.6910, horario: 'Seg a sex, 8h às 21h · sáb, 8h às 18h', tel: '(11) 3000-0102', wa: '(11) 9 0000-0102', servicos: ['Facial', 'Injetáveis', 'Laser'], chegar: 'Metrô Fradique Coutinho, 5 min a pé', carro: 'Zona Azul na rua' },
    { id: 'jardins', nome: 'Glow Jardins', bairro: 'Jardins', regiao: 'Centro-Sul', endereco: 'Alameda de Exemplo, 300 · Jardins', cep: [1401, 1455], lat: -23.5650, lng: -46.6640, horario: 'Seg a sex, 8h às 21h · sáb, 8h às 18h', tel: '(11) 3000-0103', wa: '(11) 9 0000-0103', servicos: ['Facial', 'Injetáveis', 'Laser', 'Corpo'], chegar: 'Metrô Consolação, 8 min a pé', carro: 'Valet na porta' },
    { id: 'vila-mariana', nome: 'Glow Vila Mariana', bairro: 'Vila Mariana', regiao: 'Zona Sul', endereco: 'Rua de Exemplo, 400 · Vila Mariana', cep: [4101, 4128], lat: -23.5890, lng: -46.6340, horario: 'Seg a sex, 8h às 21h · sáb, 8h às 18h', tel: '(11) 3000-0104', wa: '(11) 9 0000-0104', servicos: ['Facial', 'Injetáveis', 'Corpo'], chegar: 'Metrô Vila Mariana, 5 min a pé', carro: 'Estacionamento na rua de trás' },
    { id: 'itaim', nome: 'Glow Itaim Bibi', bairro: 'Itaim Bibi', regiao: 'Zona Sul', endereco: 'Rua de Exemplo, 500 · Itaim Bibi', cep: [4530, 4548], lat: -23.5850, lng: -46.6760, horario: 'Seg a sex, 7h às 21h · sáb, 8h às 18h', tel: '(11) 3000-0105', wa: '(11) 9 0000-0105', servicos: ['Facial', 'Injetáveis', 'Laser', 'Corpo'], chegar: 'Ônibus na Av. de Exemplo, 3 min a pé', carro: 'Estacionamento no prédio' },
    { id: 'perdizes', nome: 'Glow Perdizes', bairro: 'Perdizes', regiao: 'Zona Oeste', endereco: 'Rua de Exemplo, 600 · Perdizes', cep: [5001, 5039], lat: -23.5370, lng: -46.6780, horario: 'Seg a sex, 8h às 21h · sáb, 8h às 18h', tel: '(11) 3000-0106', wa: '(11) 9 0000-0106', servicos: ['Facial', 'Injetáveis', 'Corpo'], chegar: 'Metrô Perdizes, 7 min a pé', carro: 'Estacionamento conveniado' },
    { id: 'tatuape', nome: 'Glow Tatuapé', bairro: 'Tatuapé', regiao: 'Zona Leste', endereco: 'Rua de Exemplo, 700 · Tatuapé', cep: [3301, 3349], lat: -23.5400, lng: -46.5760, horario: 'Seg a sex, 8h às 21h · sáb, 8h às 18h', tel: '(11) 3000-0107', wa: '(11) 9 0000-0107', servicos: ['Facial', 'Injetáveis', 'Laser'], chegar: 'Metrô Tatuapé, 6 min a pé', carro: 'Estacionamento no prédio' },
    { id: 'santana', nome: 'Glow Santana', bairro: 'Santana', regiao: 'Zona Norte', endereco: 'Rua de Exemplo, 800 · Santana', cep: [2011, 2099], lat: -23.5020, lng: -46.6250, horario: 'Seg a sex, 8h às 21h · sáb, 8h às 18h', tel: '(11) 3000-0108', wa: '(11) 9 0000-0108', servicos: ['Facial', 'Injetáveis', 'Laser', 'Corpo'], chegar: 'Metrô Santana, 10 min a pé', carro: 'Zona Azul e estacionamento conveniado' },
    { id: 'morumbi', nome: 'Glow Morumbi', bairro: 'Morumbi', regiao: 'Zona Oeste', endereco: 'Avenida de Exemplo, 900 · Morumbi', cep: [5601, 5699], lat: -23.6090, lng: -46.7210, horario: 'Seg a sex, 8h às 21h · sáb, 8h às 18h', tel: '(11) 3000-0109', wa: '(11) 9 0000-0109', servicos: ['Facial', 'Injetáveis'], chegar: 'Ônibus na própria avenida', carro: 'Estacionamento do centro comercial' },
    { id: 'alphaville', nome: 'Glow Alphaville', bairro: 'Alphaville (Barueri)', regiao: 'Grande SP', endereco: 'Alameda de Exemplo, 1000 · Alphaville', cep: [6453, 6474], lat: -23.4990, lng: -46.8490, horario: 'Seg a sex, 8h às 21h · sáb, 8h às 18h', tel: '(11) 3000-0110', wa: '(11) 9 0000-0110', servicos: ['Facial', 'Injetáveis', 'Laser', 'Corpo'], chegar: 'Fretados da alameda, parada a 3 min', carro: 'Estacionamento no prédio' },
    { id: 'santo-andre', nome: 'Glow Santo André', bairro: 'Santo André (ABC)', regiao: 'Grande SP', endereco: 'Rua de Exemplo, 1100 · Centro', cep: [9000, 9299], lat: -23.6640, lng: -46.5340, horario: 'Seg a sex, 8h às 21h · sáb, 8h às 18h', tel: '(11) 3000-0111', wa: '(11) 9 0000-0111', servicos: ['Facial', 'Injetáveis', 'Laser', 'Corpo'], chegar: 'Estação Santo André, 12 min a pé', carro: 'Estacionamento conveniado' }
  ];

  // [id, nome, linha, área, quem faz, preço avulso, duração, descrição, página]
  var TRATAMENTOS = [
    ['laser-lavieen', 'Laser LaVieen', 'manchas', 'rosto', 'medica', 590, '40 min', 'Laser para manchas de sol e melasma, com anestésico em creme.', 'tratamento-manchas.html'],
    ['peeling-acidos', 'Peeling de ácidos', 'manchas', 'rosto', 'biomedica', 320, '30 min', 'Renova a camada de cima da pele. Descamação leve por 3 a 7 dias.', 'tratamento-manchas.html'],
    ['clareador', 'Clareador home care', 'manchas', 'rosto', 'medica', 189, '20 min', 'Protocolo para casa, prescrito pela médica, com retorno em 30 dias.', 'tratamento-manchas.html'],
    ['toxina', 'Toxina botulínica', 'linhas', 'rosto', 'medica', 1090, '30 min', 'Testa, glabela e pés de galinha, com retorno em 15 dias.', 'tratamento-linhas.html'],
    ['bioestimulador', 'Bioestimulador', 'linhas', 'rosto', 'medica', 2290, '45 min', 'Estimula o colágeno da própria pele. Efeito gradual, que varia de pessoa para pessoa.', 'tratamento-linhas.html'],
    ['ultraformer', 'Ultrassom microfocado', 'linhas', 'rosto', 'medica', 1890, '60 min', 'Aquece camadas profundas da pele, sem cortes e sem afastamento.', 'tratamento-linhas.html'],
    ['limpeza', 'Limpeza de pele profunda', 'poros', 'rosto', 'biomedica', 189, '60 min', 'Higienização, extração, alta frequência e máscara calmante.', 'tratamento-poros.html'],
    ['co2', 'Laser de CO2 fracionado', 'poros', 'rosto', 'medica', 990, '50 min', 'Para cicatrizes de acne. Pede de 5 a 7 dias de pele avermelhada.', 'tratamento-poros.html'],
    ['salicilico', 'Peeling de ácido salicílico', 'poros', 'rosto', 'biomedica', 260, '30 min', 'Ajuda a controlar oleosidade e espinhas ativas.', 'tratamento-poros.html'],
    ['skinbooster', 'Skinbooster', 'vico', 'rosto', 'medica', 1290, '40 min', 'Ácido hialurônico em microgotas para hidratar a pele por dentro.', 'tratamento-vico.html'],
    ['hydrafacial', 'Hydrafacial', 'vico', 'rosto', 'biomedica', 450, '45 min', 'Limpeza, esfoliação suave e sérum, em sequência no mesmo aparelho.', 'tratamento-vico.html'],
    ['drenagem-facial', 'Drenagem facial', 'vico', 'rosto', 'biomedica', 160, '40 min', 'Massagem manual que desincha e relaxa, boa antes de eventos.', 'tratamento-vico.html'],
    ['criolipolise', 'Criolipólise', 'corpo', 'corpo', 'medica', 790, '60 min', 'Resfriamento controlado de gordura localizada, só após avaliação médica. Não é tratamento para emagrecer.', 'tratamento-corpo.html'],
    ['modeladora', 'Massagem modeladora', 'corpo', 'corpo', 'biomedica', 140, '50 min', 'Com drenagem linfática. Preço por sessão, em pacote de 10.', 'tratamento-corpo.html'],
    ['radiofrequencia', 'Radiofrequência corporal', 'corpo', 'corpo', 'biomedica', 220, '40 min', 'Aquecimento da pele com aparelho, usado em flacidez e celulite.', 'tratamento-corpo.html']
  ];
  var LINHAS = { manchas: 'Glow Manchas', linhas: 'Glow Linhas', poros: 'Glow Poros', vico: 'Glow Viço', corpo: 'Glow Corpo' };

  // planos do Clube Glow (valores ilustrativos)
  var PLANOS = [
    { id: 'essential', nome: 'Essential', preco: 199, creditos: 230, desconto: 20, itens: ['R$ 230 em créditos todo mês', '20% de desconto no que passar dos créditos', 'Avaliação de retorno sem custo', 'Agenda com prioridade'] },
    { id: 'plus', nome: 'Plus', preco: 389, creditos: 460, desconto: 20, itens: ['R$ 460 em créditos todo mês', '20% de desconto no que passar dos créditos', '1 drenagem facial de presente por mês', 'Agenda com prioridade'] },
    { id: 'signature', nome: 'Signature', preco: 790, creditos: 950, desconto: 25, itens: ['R$ 950 em créditos todo mês', '25% de desconto no que passar dos créditos', 'Consulta médica a cada 3 meses', 'Créditos acumulam por até 3 meses'] }
  ];

  window.GLOW = { unidades: UNIDADES, tratamentos: TRATAMENTOS, linhas: LINHAS, planos: PLANOS };
})();
