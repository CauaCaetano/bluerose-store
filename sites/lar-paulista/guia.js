// Lar Paulista · guia editorial dos bairros. Pontos de interesse por categoria para o mapa ilustrativo.
// x e y em % do mapa (sem escala). Tempos a pé são aproximados e marcados como exemplo.
// "verde": true coloca o ponto sobre a mancha verde do mapa (parque ou praça).
(function (w) {
  'use strict';
  w.LP_GUIA = {
    CATS: {
      escola: { nome: 'Escolas', curto: 'Escola' },
      cafe: { nome: 'Cafés e comércio', curto: 'Café e comércio' },
      parque: { nome: 'Parques e praças', curto: 'Parque e praça' },
      imovel: { nome: 'Imóveis', curto: 'Imóvel' }
    },
    bairros: {
      'Cambuí': [
        { cat: 'parque', nome: 'Centro de Convivência Cultural', det: 'Praça, teatro e feira de artesanato aos domingos', min: 6, verde: true },
        { cat: 'parque', nome: 'Praças arborizadas do bairro', det: 'Sombra, bancos e parquinho', min: 4, x: 74, y: 70 },
        { cat: 'cafe', nome: 'Rua Coronel Quirino', det: 'Bares, cafés e restaurantes', min: 5, x: 46, y: 46 },
        { cat: 'cafe', nome: 'Rua Maria Monteiro', det: 'Comércio de rua, padarias e farmácias', min: 3, x: 60, y: 36 },
        { cat: 'cafe', nome: 'Avenida Júlio de Mesquita', det: 'Serviços, bancos e mercados', min: 7, x: 30, y: 72 },
        { cat: 'escola', nome: 'Colégio Progresso Campineiro', det: 'Ensino infantil ao médio', min: 8, x: 84, y: 30 },
        { cat: 'escola', nome: 'Escolas de idiomas e cursinhos', det: 'Concentradas nas ruas centrais', min: 6, x: 18, y: 44 }
      ],
      'Taquaral': [
        { cat: 'parque', nome: 'Lagoa do Taquaral e Parque Portugal', det: 'Pista de caminhada, ciclovia e pedalinhos', min: 5, verde: true },
        { cat: 'parque', nome: 'Planetário de Campinas', det: 'Dentro do parque, sessões aos fins de semana', min: 9, x: 70, y: 28 },
        { cat: 'cafe', nome: 'Avenida Heitor Penteado', det: 'Cafés, padarias e restaurantes', min: 4, x: 36, y: 70 },
        { cat: 'cafe', nome: 'Quiosques da lagoa', det: 'Água de coco e lanches no fim de semana', min: 6, x: 58, y: 54 },
        { cat: 'escola', nome: 'Escolas da região', det: 'Infantil, fundamental e médio', min: 7, x: 20, y: 40 },
        { cat: 'escola', nome: 'Clubes com escolinhas de esporte', det: 'Natação, tênis e futebol', min: 10, x: 86, y: 74 }
      ],
      'Barão Geraldo': [
        { cat: 'escola', nome: 'Unicamp', det: 'Universidade e centros de pesquisa', min: 12, x: 78, y: 30 },
        { cat: 'escola', nome: 'Escolas do distrito', det: 'Particulares e públicas, do infantil ao médio', min: 6, x: 26, y: 66 },
        { cat: 'cafe', nome: 'Avenida Albino J. B. de Oliveira', det: 'Comércio do distrito, mercados e serviços', min: 4, x: 46, y: 50 },
        { cat: 'cafe', nome: 'Bares e cafés universitários', det: 'Movimento o ano todo', min: 7, x: 62, y: 70 },
        { cat: 'parque', nome: 'Ciclovia e áreas verdes', det: 'Caminhada e bicicleta até a Unicamp', min: 3, verde: true },
        { cat: 'parque', nome: 'Feira e praças do distrito', det: 'Feira livre e encontros de fim de semana', min: 8, x: 18, y: 36 }
      ],
      'Guanabara': [
        { cat: 'parque', nome: 'Estação Guanabara', det: 'Antiga estação, hoje espaço cultural', min: 6, verde: true },
        { cat: 'cafe', nome: 'Avenida Brasil', det: 'Comércio, serviços e ônibus para o Centro', min: 4, x: 42, y: 62 },
        { cat: 'cafe', nome: 'Padarias tradicionais', det: 'Café da manhã de bairro', min: 3, x: 66, y: 40 },
        { cat: 'escola', nome: 'Escolas de bairro', det: 'Infantil e fundamental', min: 7, x: 22, y: 42 },
        { cat: 'parque', nome: 'Ruas residenciais tranquilas', det: 'Arborizadas, boas para caminhar', min: 2, x: 82, y: 72 }
      ],
      'Nova Campinas': [
        { cat: 'cafe', nome: 'Shopping Iguatemi Campinas', det: 'Ao lado do bairro: lojas, cinema e serviços', min: 10, x: 80, y: 34 },
        { cat: 'cafe', nome: 'Divisa com o Cambuí', det: 'Cafés e restaurantes a poucas quadras', min: 8, x: 24, y: 70 },
        { cat: 'parque', nome: 'Ruas residenciais arborizadas', det: 'Calçadas largas e pouco movimento', min: 2, verde: true },
        { cat: 'escola', nome: 'Escolas particulares da região', det: 'Infantil ao médio, com transporte escolar', min: 9, x: 54, y: 68 },
        { cat: 'escola', nome: 'Escolas de idiomas e música', det: 'No caminho para o Cambuí', min: 7, x: 30, y: 42 }
      ],
      'Centro': [
        { cat: 'parque', nome: 'Largo da Catedral Metropolitana', det: 'Praça, igreja e eventos culturais', min: 4, verde: true },
        { cat: 'cafe', nome: 'Mercado Municipal', det: 'Frutas, temperos e pastel de feira', min: 7, x: 70, y: 36 },
        { cat: 'cafe', nome: 'Rua 13 de Maio, o calçadão', det: 'Comércio popular e serviços', min: 3, x: 44, y: 56 },
        { cat: 'cafe', nome: 'Terminal Central de ônibus', det: 'Linhas para toda a cidade', min: 9, x: 82, y: 72 },
        { cat: 'escola', nome: 'Escolas técnicas e cursinhos', det: 'Perto do terminal e das avenidas', min: 8, x: 22, y: 72 }
      ],
      'Sousas': [
        { cat: 'parque', nome: 'Rio Atibaia', det: 'Margens para caminhada e piquenique', min: 6, verde: true },
        { cat: 'parque', nome: 'Praça central e igreja de Sousas', det: 'Coração do distrito', min: 4, x: 44, y: 42 },
        { cat: 'cafe', nome: 'Restaurantes e cafés de fim de semana', det: 'Comida caseira e cafés coloniais', min: 5, x: 62, y: 64 },
        { cat: 'cafe', nome: 'Joaquim Egídio, logo adiante', det: 'Estrada bonita e restaurantes rurais', min: 15, x: 86, y: 30 },
        { cat: 'escola', nome: 'Escolas do distrito', det: 'Infantil e fundamental', min: 8, x: 20, y: 70 }
      ],
      'Mansões Santo Antônio': [
        { cat: 'escola', nome: 'Escolas particulares da região', det: 'Infantil ao médio, com transporte escolar', min: 10, x: 30, y: 64 },
        { cat: 'cafe', nome: 'Comércio da região', det: 'Mercados, padarias e farmácias', min: 8, x: 62, y: 38 },
        { cat: 'cafe', nome: 'Acesso à Rodovia Dom Pedro I', det: 'Saída rápida para outras cidades', min: 6, x: 86, y: 72 },
        { cat: 'parque', nome: 'Clubes e áreas verdes', det: 'Academias, quadras e trilhas', min: 7, verde: true },
        { cat: 'parque', nome: 'Condomínios com portaria 24 horas', det: 'Ruas internas para caminhar e pedalar', min: 2, x: 52, y: 62 }
      ]
    }
  };
})(window);
