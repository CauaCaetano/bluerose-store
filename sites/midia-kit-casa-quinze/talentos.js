// Casa Quinze · elenco de demonstração (08/11/2026).
// Os 15 talentos são FICTÍCIOS. Seguidores e faixas são ilustrativos, coerentes com o porte de cada perfil;
// no kit de verdade, cada faixa sai do Instagram Insights do criador (últimos 90 dias).
// Faixas: [mínimo, máximo] em números inteiros; engajamento em % sobre o alcance.
window.CQ_NICHOS = [
  { id: 'moda', nome: 'Moda' },
  { id: 'beleza', nome: 'Beleza' },
  { id: 'fitness', nome: 'Fitness' },
  { id: 'gastronomia', nome: 'Gastronomia' },
  { id: 'lifestyle', nome: 'Lifestyle' },
  { id: 'negocios', nome: 'Negócios e educação' }
];

window.CQ_TALENTOS = [
  {
    id: 'luisa-moraes', n: 1, nome: 'Luísa Moraes', nicho: 'moda', tema: 'Moda feminina acessível', seguidores: 150000,
    cidade: 'Belo Horizonte, MG', frase: 'Peça boa é a que aparece na foto e no dia a dia.',
    apresentacao: 'Monta looks de trabalho e de fim de semana com peças de loja de shopping e de marcas pequenas. A comunidade pede onde comprar e quanto custou, e ela sempre responde.',
    alcance: [300000, 540000], reel: [33000, 80000], stories: [7500, 14000], eng: [3.5, 6.5],
    publico: { genero: 'Mulheres, 82% a 90%', idade: '25 a 34 anos, 48% a 60%', regiao: 'Sudeste, 58% a 70%' },
    formatos: ['Reel de provador', 'Carrossel de looks', 'Stories com link', 'Fotos para e-commerce'],
    pautas: ['5 looks com 8 peças', 'Provador honesto: veste ou não veste', 'Mala de 3 dias'],
    foto: 'img/t-luisa.webp', foto2: 'img/g-luisa.webp', alt: 'Caneca, calça jeans e blusa branca arrumadas sobre um banco', alt2: 'Cabides com casacos claros em loja de roupas'
  },
  {
    id: 'caio-fontes', n: 2, nome: 'Caio Fontes', nicho: 'moda', tema: 'Moda masculina e cuidados', seguidores: 85000,
    cidade: 'Curitiba, PR', frase: 'Homem também quer saber o que combina com o quê.',
    apresentacao: 'Ensina o básico bem feito: caimento, sapato certo para cada ocasião e como montar um guarda-roupa enxuto. Público masculino que compra pela internet e quer errar menos.',
    alcance: [190000, 340000], reel: [19000, 46000], stories: [4000, 7500], eng: [4, 7.5],
    publico: { genero: 'Homens, 70% a 82%', idade: '25 a 34 anos, 45% a 58%', regiao: 'Sul e Sudeste, 65% a 78%' },
    formatos: ['Reel de antes e depois', 'Carrossel de guia', 'Stories com enquete', 'Unboxing'],
    pautas: ['Um sapato, quatro ocasiões', 'Guarda-roupa com 20 peças', 'O erro de caimento mais comum'],
    foto: 'img/t-caio.webp', foto2: 'img/g-caio.webp', alt: 'Sapatos de couro marrom sobre tapete de palha', alt2: 'Mocassins coloridos apoiados num corrimão de madeira'
  },
  {
    id: 'nina-alencar', n: 3, nome: 'Nina Alencar', nicho: 'moda', tema: 'Moda autoral e brechó', seguidores: 220000,
    cidade: 'São Paulo, SP', frase: 'Estilo não vem com etiqueta, vem com repertório.',
    apresentacao: 'Garimpa brechós e marcas autorais e transforma peças antigas em looks atuais. A comunidade é jovem, criativa e gosta de saber a história de cada peça.',
    alcance: [420000, 770000], reel: [48000, 130000], stories: [11000, 22000], eng: [3, 6],
    publico: { genero: 'Mulheres, 72% a 84%', idade: '18 a 29 anos, 55% a 68%', regiao: 'Sudeste, 55% a 66%' },
    formatos: ['Reel de garimpo', 'Série semanal', 'Carrossel editorial', 'Live de bazar'],
    pautas: ['Garimpo com R$ 100', 'Uma peça, três épocas', 'Visita a ateliê de marca pequena'],
    foto: 'img/t-nina.webp', foto2: 'img/g-nina.webp', alt: 'Arara com roupas em tons claros e plantas numa loja', alt2: 'Tecidos coloridos dobrados e empilhados'
  },
  {
    id: 'maera-beauty', n: 4, nome: 'Maëra Beauty', nicho: 'beleza', tema: 'Maquiagem e resenhas', seguidores: 300000,
    cidade: 'Rio de Janeiro, RJ', frase: 'Resenha boa mostra a textura, não só o resultado.',
    apresentacao: 'Faz tutoriais e resenhas com close na pele, mostra o produto no primeiro uso e depois de horas. Público que pesquisa antes de comprar maquiagem e skincare.',
    alcance: [600000, 1100000], reel: [70000, 180000], stories: [18000, 35000], eng: [3, 6],
    publico: { genero: 'Mulheres, 75% a 90%', idade: '18 a 34 anos, 65% a 80%', regiao: 'Brasil, 85% a 95%' },
    formatos: ['Tutorial em Reel', 'Resenha de 7 dias', 'Swatch em Stories', 'Rotina de skincare'],
    pautas: ['Base em pele real, 8 horas depois', 'Swatch de 6 tons', 'Rotina de manhã em 5 minutos'],
    foto: 'img/t-maera.webp', foto2: 'img/g-maera.webp', alt: 'Quatro batons abertos em tons de nude e vinho', alt2: 'Pincéis de maquiagem e sombras sobre fundo bege'
  },
  {
    id: 'clara-vieira', n: 5, nome: 'Clara Vieira', nicho: 'beleza', tema: 'Skincare sem complicação', seguidores: 110000,
    cidade: 'Recife, PE', frase: 'Rotina que cabe no banheiro e no bolso.',
    apresentacao: 'Explica ativos e rotinas de pele em linguagem simples, com produtos de farmácia e de marcas novas. A comunidade manda foto da própria rotina para ela comentar.',
    alcance: [220000, 400000], reel: [24000, 60000], stories: [5500, 11000], eng: [3.5, 6.5],
    publico: { genero: 'Mulheres, 80% a 90%', idade: '22 a 34 anos, 50% a 62%', regiao: 'Nordeste e Sudeste, 70% a 82%' },
    formatos: ['Reel explicativo', 'Rotina em Stories', 'Carrossel de ativos', 'Teste de 30 dias'],
    pautas: ['O que vem antes, o sérum ou o hidratante?', 'Rotina de R$ 80', 'Diário de 30 dias'],
    foto: 'img/t-clara.webp', foto2: 'img/g-clara.webp', alt: 'Frascos de sérum com conta-gotas sobre móvel de madeira', alt2: 'Potes e frascos brancos de skincare sem rótulo'
  },
  {
    id: 'sofia-mendes', n: 6, nome: 'Sofia Mendes', nicho: 'beleza', tema: 'Cabelos e unhas', seguidores: 65000,
    cidade: 'Salvador, BA', frase: 'Cuidado de salão, feito em casa, sem enrolação.',
    apresentacao: 'Mostra finalização de cachos, cronograma capilar e unhas feitas em casa. Perfil menor, com comunidade muito próxima, que comenta e pede indicação.',
    alcance: [145000, 260000], reel: [14000, 36000], stories: [3000, 6000], eng: [4.5, 8],
    publico: { genero: 'Mulheres, 85% a 94%', idade: '18 a 34 anos, 60% a 74%', regiao: 'Nordeste, 45% a 60%' },
    formatos: ['Reel de finalização', 'Cronograma em série', 'Stories de dúvidas', 'Resenha curta'],
    pautas: ['Finalização em 10 minutos', 'Cronograma de 4 semanas', 'Unha em casa que dura 7 dias'],
    foto: 'img/t-sofia.webp', foto2: 'img/g-sofia.webp', alt: 'Vidro de esmalte sobre fundo branco', alt2: 'Escova de cabelo de madeira sobre fundo branco'
  },
  {
    id: 'rafa-treina', n: 7, nome: 'Rafa Treina', nicho: 'fitness', tema: 'Treino em casa de 30 minutos', seguidores: 60000,
    cidade: 'Campinas, SP', frase: 'Treino que cabe entre o trabalho e o jantar.',
    apresentacao: 'Monta treinos curtos para quem tem pouco tempo e pouco equipamento. A comunidade treina junto e manda o print do treino feito.',
    alcance: [130000, 240000], reel: [13000, 33000], stories: [3000, 5500], eng: [4.5, 8],
    publico: { genero: 'Mulheres, 58% a 70%', idade: '25 a 40 anos, 55% a 68%', regiao: 'Sudeste, 55% a 68%' },
    formatos: ['Treino em Reel', 'Desafio de 21 dias', 'Stories de treino ao vivo', 'Carrossel de exercícios'],
    pautas: ['30 minutos com um halter', 'Desafio de 21 dias', 'Alongamento para quem fica sentado'],
    foto: 'img/t-rafa.webp', foto2: 'img/g-rafa.webp', alt: 'Tapete de treino, halteres, corda e garrafa sobre piso de madeira', alt2: 'Halteres, corda de pular e garrafa sobre tapete de treino'
  },
  {
    id: 'gabriel-costa', n: 8, nome: 'Gabriel Costa', nicho: 'fitness', tema: 'Corrida de rua', seguidores: 180000,
    cidade: 'Florianópolis, SC', frase: 'Do primeiro 5 km à primeira meia maratona.',
    apresentacao: 'Corre e mostra a planilha, o tênis, a alimentação e os dias ruins também. Público que está começando a correr e quer chegar à primeira prova.',
    alcance: [360000, 650000], reel: [40000, 100000], stories: [9000, 17000], eng: [3.5, 6],
    publico: { genero: 'Homens, 52% a 64%', idade: '25 a 44 anos, 62% a 75%', regiao: 'Sul e Sudeste, 68% a 80%' },
    formatos: ['Reel de treino', 'Diário de prova', 'Teste de tênis', 'Stories de planilha'],
    pautas: ['10 semanas até os 10 km', 'Tênis testado por 100 km', 'O que comer antes da prova'],
    foto: 'img/t-gabriel.webp', foto2: 'img/g-gabriel.webp', alt: 'Tênis de corrida pretos sobre ponte de madeira', alt2: 'Sola de tênis de corrida sobre a pista de atletismo'
  },
  {
    id: 'lara-moves', n: 9, nome: 'Lara Moves', nicho: 'fitness', tema: 'Pilates, yoga e mobilidade', seguidores: 95000,
    cidade: 'Porto Alegre, RS', frase: 'Movimento é para todo corpo, todo dia.',
    apresentacao: 'Aulas curtas de mobilidade, pilates de solo e respiração. A comunidade é adulta, busca bem-estar e valoriza explicação clara dos movimentos.',
    alcance: [210000, 380000], reel: [21000, 52000], stories: [4500, 8500], eng: [4, 7.5],
    publico: { genero: 'Mulheres, 76% a 88%', idade: '28 a 45 anos, 58% a 70%', regiao: 'Sul e Sudeste, 62% a 75%' },
    formatos: ['Aula curta em Reel', 'Série de mobilidade', 'Carrossel de posturas', 'Live semanal'],
    pautas: ['Mobilidade para quem trabalha sentado', '7 dias de respiração', 'Pilates de solo para iniciantes'],
    foto: 'img/t-lara.webp', foto2: 'img/g-lara.webp', alt: 'Tapetes de yoga enrolados num cesto', alt2: 'Bloco de cortiça sobre tapete de yoga'
  },
  {
    id: 'bia-na-cozinha', n: 10, nome: 'Bia na Cozinha', nicho: 'gastronomia', tema: 'Receitas de rotina', seguidores: 80000,
    cidade: 'Ribeirão Preto, SP', frase: 'Receita que cabe na rotina e no orçamento.',
    apresentacao: 'Receitas do dia a dia, marmita da semana e testes de utensílios. A comunidade salva as receitas e volta para contar como ficou.',
    alcance: [180000, 320000], reel: [18000, 45000], stories: [3500, 7000], eng: [4, 8],
    publico: { genero: 'Mulheres, 74% a 86%', idade: '25 a 44 anos, 60% a 72%', regiao: 'Brasil, 90% a 97%' },
    formatos: ['Receita em Reel', 'Carrossel de receitas', 'Teste de utensílio', 'Série de marmitas'],
    pautas: ['Marmita da semana em 1 hora', 'Teste honesto de panela', 'Receita com 5 ingredientes'],
    foto: 'img/t-bia.webp', foto2: 'img/g-bia.webp', alt: 'Mãos fatiando abobrinha sobre tábua de madeira', alt2: 'Tomates, alho e alho-poró sobre tábua preta'
  },
  {
    id: 'pedro-na-brasa', n: 11, nome: 'Pedro na Brasa', nicho: 'gastronomia', tema: 'Churrasco e fogo', seguidores: 130000,
    cidade: 'Goiânia, GO', frase: 'Ponto certo se aprende vendo, não lendo.',
    apresentacao: 'Ensina cortes, ponto da carne e churrasco para família e amigos. Público que compra carne, carvão, acessórios e bebidas para o fim de semana.',
    alcance: [260000, 470000], reel: [29000, 72000], stories: [6500, 12000], eng: [3.5, 6.5],
    publico: { genero: 'Homens, 62% a 75%', idade: '25 a 44 anos, 60% a 72%', regiao: 'Centro-Oeste e Sudeste, 60% a 74%' },
    formatos: ['Reel de corte', 'Churrasco ao vivo', 'Teste de acessório', 'Receita de acompanhamento'],
    pautas: ['Picanha do jeito certo', 'Churrasco para 10 com R$ 300', 'Acompanhamentos em 20 minutos'],
    foto: 'img/t-pedro.webp', foto2: 'img/g-pedro.webp', alt: 'Carne e linguiça assando na grelha com chama', alt2: 'Carvão em brasa na churrasqueira'
  },
  {
    id: 'marina-luz', n: 12, nome: 'Marina Luz', nicho: 'lifestyle', tema: 'Casa, rotina e organização', seguidores: 250000,
    cidade: 'São Paulo, SP', frase: 'Casa bonita é casa que funciona.',
    apresentacao: 'Mostra a rotina da casa, organização, decoração com pouco dinheiro e manhãs sem pressa. Público adulto que compra para a casa pela internet.',
    alcance: [480000, 880000], reel: [55000, 150000], stories: [13000, 25000], eng: [3, 6],
    publico: { genero: 'Mulheres, 78% a 88%', idade: '25 a 44 anos, 62% a 74%', regiao: 'Sudeste, 55% a 68%' },
    formatos: ['Reel de rotina', 'Antes e depois', 'Carrossel de achados', 'Stories com link'],
    pautas: ['Organizar a cozinha em 1 tarde', 'Sala nova com R$ 500', 'Minha manhã de domingo'],
    foto: 'img/t-marina.webp', foto2: 'img/g-marina.webp', alt: 'Sala clara com sofá verde-água, almofadas e manta', alt2: 'Xícara de café e livro aberto sob luz da manhã'
  },
  {
    id: 'theo-vasconcelos', n: 13, nome: 'Theo Vasconcelos', nicho: 'lifestyle', tema: 'Viagem e bons lugares', seguidores: 90000,
    cidade: 'Fortaleza, CE', frase: 'Viagem boa começa no planejamento.',
    apresentacao: 'Roteiros curtos pelo Brasil, hospedagens, cafés e o quanto custou cada viagem. Público que viaja de 2 a 4 vezes por ano e planeja tudo pelo celular.',
    alcance: [200000, 360000], reel: [20000, 50000], stories: [4500, 8000], eng: [4, 7.5],
    publico: { genero: 'Mulheres, 55% a 66%', idade: '25 a 39 anos, 58% a 70%', regiao: 'Nordeste e Sudeste, 65% a 78%' },
    formatos: ['Reel de roteiro', 'Stories de viagem', 'Carrossel de custos', 'Visita a hospedagem'],
    pautas: ['3 dias em uma cidade com R$ 1.500', 'Hospedagem testada', 'O que levar na mala de mão'],
    foto: 'img/t-theo.webp', foto2: 'img/g-theo.webp', alt: 'Mapa rodoviário com estradas e cidades', alt2: 'Caminho de terra entre dunas e vegetação'
  },
  {
    id: 'ana-clara-educa', n: 14, nome: 'Ana Clara Educa', nicho: 'negocios', tema: 'Estudos e concursos', seguidores: 75000,
    cidade: 'Brasília, DF', frase: 'Estudar menos horas e lembrar mais.',
    apresentacao: 'Métodos de estudo, organização da semana e dicas para vestibular e concurso. Comunidade de estudantes que compra cursos, livros e material de papelaria.',
    alcance: [165000, 300000], reel: [16000, 41000], stories: [3500, 6500], eng: [4, 8],
    publico: { genero: 'Mulheres, 60% a 72%', idade: '17 a 29 anos, 68% a 80%', regiao: 'Brasil, 90% a 96%' },
    formatos: ['Reel de método', 'Carrossel de resumo', 'Stories de rotina', 'Aula ao vivo'],
    pautas: ['Semana de estudos em 1 folha', 'Método de revisão em 15 minutos', 'Material que vale a pena'],
    foto: 'img/t-ana.webp', foto2: 'img/g-ana.webp', alt: 'Caderno quadriculado aberto com óculos e lápis sobre a mesa', alt2: 'Pilha de livros antigos de capa dura'
  },
  {
    id: 'bruno-digital', n: 15, nome: 'Bruno Digital', nicho: 'negocios', tema: 'Negócios digitais e tecnologia', seguidores: 160000,
    cidade: 'Belo Horizonte, MG', frase: 'Ferramenta boa é a que você usa amanhã cedo.',
    apresentacao: 'Testa aplicativos, ferramentas e equipamentos para quem trabalha por conta própria ou tem um negócio pequeno. Público que decide compra de software e eletrônicos.',
    alcance: [320000, 580000], reel: [35000, 88000], stories: [8000, 15000], eng: [3.5, 6],
    publico: { genero: 'Homens, 58% a 70%', idade: '25 a 44 anos, 64% a 76%', regiao: 'Sudeste, 52% a 65%' },
    formatos: ['Reel de teste', 'Tutorial de tela', 'Carrossel comparativo', 'Stories de bastidor'],
    pautas: ['Meu setup de trabalho', '3 aplicativos que economizam 1 hora por dia', 'Vale a pena trocar?'],
    foto: 'img/t-bruno.webp', foto2: 'img/g-bruno.webp', alt: 'Mesa de trabalho vista de cima com celular, notebook e planta', alt2: 'Teclado, fone sem fio e planta sobre mesa de madeira'
  }
];
