/* VETRAX Engenharia · dados de exemplo (obras ilustrativas, números fictícios).
   Fotos de banco livre (Pexels) usadas só para ilustrar: não são obras da empresa. */
window.VX = {
  categorias: [
    { id: 'industriais', nome: 'Industriais' },
    { id: 'logisticas', nome: 'Logísticas' },
    { id: 'comerciais', nome: 'Comerciais' },
    { id: 'estruturas-metalicas', nome: 'Estruturas metálicas' },
    { id: 'infraestrutura', nome: 'Infraestrutura' }
  ],
  obras: [
    {
      id: 'horizonte', cod: 'VX-OB-031', nome: 'Centro Logístico Horizonte', tag: 'Logística',
      cats: ['logisticas', 'estruturas-metalicas', 'infraestrutura'],
      local: 'Região de Campinas, SP (local ilustrativo)', cliente: 'Operador logístico (nome preservado, exemplo)',
      area: 42000, aco: 1380, prazo: 11, sistema: 'Estrutura metálica com cobertura termoacústica', modelo: 'Turnkey',
      resumo: 'Centro de distribuição com 48 docas, piso industrial de alta planicidade e pátio de manobras para carretas.',
      escopo: ['Terraplenagem e drenagem de 96.000 m² de terreno', 'Fundações profundas em estacas hélice contínua', 'Estrutura metálica de 1.380 t com vãos de 30 m', 'Piso industrial FF/FL classe superplano para porta-paletes de 12 m', '48 docas com niveladoras e abrigos', 'Pavimentação do pátio em concreto e acessos em asfalto', 'Combate a incêndio com sprinklers e reservatório'],
      desafios: [['Operar sem parar o vizinho', 'O terreno ao lado era o CD antigo do cliente, em plena operação. Acessos de obra separados e janelas de entrega de material à noite.'], ['Planicidade do piso', 'Porta-paletes de 12 m pedem piso superplano. Concretagem em faixas com régua vibratória a laser e medição de cada faixa antes de liberar.'], ['Chuva no verão', 'Cronograma montado para fechar cobertura antes de dezembro e concretar o piso já protegido.']],
      fotos: [['cd-aereo', 'Vista aérea de centro logístico com carretas no pátio'], ['docas', 'Docas de carga com carretas encostadas'], ['cd-porta-paletes', 'Corredor de porta-paletes em armazém'], ['obra-aerea', 'Vista aérea de obra de galpão com máquinas no terreno']],
      planta: { comp: 280, larg: 150, vaos: 5, modulos: 14, docas: 48, docasLados: 2, mezanino: false }
    },
    {
      id: 'atlas', cod: 'VX-OB-027', nome: 'Unidade Industrial Atlas', tag: 'Industrial',
      cats: ['industriais', 'estruturas-metalicas'],
      local: 'Região de Ribeirão Preto, SP (local ilustrativo)', cliente: 'Indústria de autopeças (exemplo)',
      area: 18500, aco: 920, prazo: 9, sistema: 'Estrutura metálica com pontes rolantes de 20 t', modelo: 'Empreitada global (EPC)',
      resumo: 'Fábrica com duas naves de produção, pontes rolantes, mezanino técnico e bloco administrativo.',
      escopo: ['Projeto executivo de estrutura com caminho de rolamento para pontes de 20 t', 'Fundações diretas e blocos sobre estacas', 'Estrutura metálica de 920 t e fechamento em telha sanduíche', 'Mezanino técnico para utilidades', 'Bloco administrativo de 1.200 m² em pré-moldado', 'Subestação e infraestrutura elétrica de força'],
      desafios: [['Cargas das pontes rolantes', 'Vigas de rolamento dimensionadas para fadiga e montadas com tolerância de 3 mm, conferida por topografia.'], ['Prazo de início da produção', 'Montagem da nave 1 antes da nave 2, liberando a instalação das máquinas com a obra ainda em curso.']],
      fotos: [['galpao-pontes', 'Interior de galpão industrial com pontes rolantes'], ['vigas-laranja', 'Pilares e vigas metálicas laranja em galpão'], ['solda-noite', 'Soldador trabalhando em estrutura metálica à noite'], ['galpao-concreto', 'Fachada de galpão industrial em concreto com escada metálica']],
      planta: { comp: 185, larg: 100, vaos: 4, modulos: 10, docas: 6, docasLados: 1, mezanino: true }
    },
    {
      id: 'norte', cod: 'VX-OB-024', nome: 'Complexo Comercial Norte', tag: 'Comercial',
      cats: ['comerciais', 'estruturas-metalicas'],
      local: 'Região de São José do Rio Preto, SP (local ilustrativo)', cliente: 'Grupo varejista regional (exemplo)',
      area: 9800, aco: 410, prazo: 8, sistema: 'Estrutura mista: pré-moldado e metálica', modelo: 'Build to suit',
      resumo: 'Centro comercial com loja âncora, 22 lojas-satélite, praça de alimentação e estacionamento para 380 carros.',
      escopo: ['Aprovações na prefeitura e no Corpo de Bombeiros', 'Estrutura pré-moldada nas lojas e metálica na cobertura da praça', 'Fachada em pele de vidro e painéis metálicos', 'Estacionamento pavimentado com drenagem e iluminação', 'Entrega das lojas em casca para o lojista'],
      desafios: [['Abertura com data marcada', 'Inauguração fixada em contrato com a loja âncora. Plano de ataque por frentes simultâneas e controle semanal do caminho crítico.'], ['Vãos livres na praça', 'Cobertura metálica com vãos de 24 m sem pilares intermediários.']],
      fotos: [['comercial-aco', 'Área comercial com estrutura metálica aparente e iluminação'], ['fachada-vidro', 'Edifício com fachada de vidro e estrutura metálica'], ['estrutura-baixo', 'Estrutura metálica vista de baixo contra o céu']],
      planta: { comp: 140, larg: 70, vaos: 3, modulos: 7, docas: 3, docasLados: 1, mezanino: true }
    },
    {
      id: 'delta', cod: 'VX-OB-019', nome: 'Galpão Operacional Delta', tag: 'Estrutura metálica',
      cats: ['estruturas-metalicas', 'industriais'],
      local: 'Região de Sorocaba, SP (local ilustrativo)', cliente: 'Empresa de manutenção industrial (exemplo)',
      area: 6200, aco: 285, prazo: 5, sistema: 'Pórticos metálicos de alma cheia', modelo: 'Fornecimento e montagem de estrutura',
      resumo: 'Galpão de manutenção com pé-direito de 12 m, portões de 8 m e cobertura com iluminação natural.',
      escopo: ['Projeto, fabricação e montagem de 285 t de estrutura', 'Cobertura em telha zipada com faixas translúcidas', 'Fechamento lateral em telha trapezoidal', 'Portões industriais de 8 x 8 m'],
      desafios: [['Montagem em área urbana', 'Peças entregues em sequência de montagem, sem estoque no canteiro, e içamento com guindaste de 90 t em janelas de fim de semana.']],
      fotos: [['quadro-metalico', 'Quadro de pórticos metálicos em montagem'], ['estrutura-ceu', 'Treliças metálicas de cobertura contra o céu azul'], ['solda-estrutura', 'Montador soldando vigas metálicas no alto da estrutura'], ['cobertura', 'Cobertura metálica com estrutura aparente vista por dentro']],
      planta: { comp: 103, larg: 60, vaos: 3, modulos: 7, docas: 2, docasLados: 1, mezanino: false }
    },
    {
      id: 'vale', cod: 'VX-OB-015', nome: 'CD Vale', tag: 'Logística',
      cats: ['logisticas', 'infraestrutura'],
      local: 'Região de São José dos Campos, SP (local ilustrativo)', cliente: 'Distribuidora de alimentos (exemplo)',
      area: 27000, aco: 860, prazo: 10, sistema: 'Pré-moldado com cobertura metálica', modelo: 'Turnkey',
      resumo: 'Centro de distribuição com câmara refrigerada, 30 docas e sistema viário interno pavimentado.',
      escopo: ['Terraplenagem com contenção em talude de 8 m', 'Estrutura pré-moldada de pilares e vigas', 'Cobertura metálica com 860 t de aço', 'Câmara refrigerada de 3.200 m²', 'Pavimentação viária de 18.000 m² com sinalização', 'Rede de drenagem e bacia de retenção'],
      desafios: [['Talude e drenagem', 'Terreno em desnível de 11 m. Contenção, drenagem profunda e bacia de retenção dimensionadas para chuvas intensas.'], ['Câmara refrigerada', 'Piso com aquecimento sob a câmara para evitar congelamento do solo e painéis isotérmicos instalados antes do fechamento.']],
      fotos: [['galpao-fachada', 'Fachada de galpão logístico com portões fechados'], ['obra-maquinas', 'Máquinas preparando o terreno em frente a galpão em construção'], ['doca-empilhadeira', 'Empilhadeira parada na doca de um armazém'], ['cd-interno', 'Interior de armazém com porta-paletes e mercadorias']],
      planta: { comp: 225, larg: 120, vaos: 5, modulos: 12, docas: 30, docasLados: 2, mezanino: false }
    }
  ],
  etapas: [
    ['Diagnóstico', 'Entendemos a operação antes do prédio: fluxo de carga, equipamentos, turnos, expansão prevista e prazo de início.', ['Visita técnica ao terreno e à operação atual', 'Levantamento de premissas e restrições', 'Primeira estimativa de prazo e investimento'], 'Relatório de premissas'],
    ['Viabilidade', 'Checamos terreno, legislação e custo antes de qualquer compromisso maior.', ['Sondagem e topografia', 'Consulta de zoneamento e licenças', 'Estudo de massa e estimativa paramétrica'], 'Estudo de viabilidade'],
    ['Engenharia', 'Projetos de todas as disciplinas desenvolvidos juntos e compatibilizados em modelo único.', ['Arquitetura, estrutura, fundações e instalações', 'Compatibilização em BIM', 'Memoriais e quantitativos'], 'Projeto executivo compatibilizado'],
    ['Planejamento', 'Cronograma físico-financeiro com caminho crítico e plano de ataque por frentes.', ['Cronograma em linha de balanço', 'Curva S de desembolso', 'Plano de suprimentos e logística de canteiro'], 'Linha de base do contrato'],
    ['Suprimentos', 'Compra e fabricação programadas para chegar na hora certa, sem estoque parado no canteiro.', ['Fabricação de estrutura metálica e pré-moldados', 'Inspeção na fábrica', 'Entregas em sequência de montagem'], 'Mapa de compras e fabricação'],
    ['Execução', 'Obra com equipe própria de engenharia, segurança e qualidade, e relatório para o cliente toda semana.', ['Frentes simultâneas controladas por prazo', 'Inspeção por etapa com fichas de verificação', 'Relatório semanal com fotos e avanço físico'], 'Relatórios semanais e medições'],
    ['Entrega', 'Comissionamento, documentação completa e acompanhamento depois que a operação começa.', ['Testes e comissionamento de sistemas', 'Data book com projetos as built, ARTs e manuais', 'Assistência pós-obra'], 'Termo de entrega e data book']
  ]
};
