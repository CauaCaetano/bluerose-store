/*
 * Maison Élora · dados do salão (exemplo).
 * Para trocar um preço ou uma duração, altere só este arquivo: a tabela de preços, as páginas
 * de cada departamento, a página de profissionais e o agendamento leem tudo daqui.
 * Valores, nomes e durações são ILUSTRATIVOS (site de demonstração da Blue Rose).
 */
window.ELORA = {
  whatsapp: '(31) 90000-0000',
  departamentos: [
    { id: 'cabelo', nome: 'Cabelo', pagina: 'cabelo.html', foto: 'img/cab-escova.webp',
      cats: [['corte', 'Corte'], ['escova', 'Escova'], ['coloracao', 'Coloração'], ['mechas', 'Mechas'], ['tratamentos', 'Tratamentos'], ['penteados', 'Penteados']] },
    { id: 'unhas', nome: 'Unhas', pagina: 'unhas.html', foto: 'img/unh-nude.webp',
      cats: [['manicure', 'Manicure'], ['pedicure', 'Pedicure'], ['gel', 'Gel'], ['alongamento', 'Alongamento'], ['nailart', 'Nail art']] },
    { id: 'olhar', nome: 'Olhar', pagina: 'olhar.html', foto: 'img/olh-sobrancelha.webp',
      cats: [['design', 'Design'], ['henna', 'Henna e coloração'], ['extensao', 'Extensão de cílios'], ['lifting', 'Lash lifting'], ['lamination', 'Brow lamination']] },
    { id: 'estetica', nome: 'Estética', pagina: 'estetica.html', foto: 'img/est-facial2.webp',
      cats: [['limpeza', 'Limpeza de pele'], ['facial', 'Facial'], ['corporal', 'Corporal'], ['maquiagem', 'Maquiagem']] },
    { id: 'spa', nome: 'Spa', pagina: 'spa.html', foto: 'img/spa-pedras.webp',
      cats: [['massagens', 'Massagens'], ['rituais', 'Rituais'], ['combinacoes', 'Combinações']] }
  ],
  // [id, departamento, categoria, nome, descrição curta, duração em minutos, preço em reais, "a partir de"?]
  servicos: [
    ['corte-fem', 'cabelo', 'corte', 'Corte feminino', 'Conversa sobre rotina e formato do rosto, lavagem e finalização simples.', 60, 180],
    ['corte-escova', 'cabelo', 'corte', 'Corte e escova', 'Corte com escova modelada no final.', 90, 240],
    ['corte-masc', 'cabelo', 'corte', 'Corte masculino', 'Tesoura ou máquina, com lavagem.', 40, 110],
    ['franja', 'cabelo', 'corte', 'Franja', 'Ajuste de franja entre um corte e outro.', 20, 60],
    ['escova-lisa', 'cabelo', 'escova', 'Escova lisa', 'Lavagem, protetor térmico e escova.', 50, 95],
    ['escova-ondas', 'cabelo', 'escova', 'Escova modelada', 'Ondas largas feitas na escova redonda.', 60, 120],
    ['babyliss', 'cabelo', 'escova', 'Babyliss', 'Cachos definidos com modelador.', 60, 130],
    ['cor-raiz', 'cabelo', 'coloracao', 'Coloração de raiz', 'Retoque de até 3 cm de raiz.', 90, 220],
    ['cor-global', 'cabelo', 'coloracao', 'Coloração global', 'Cor nova do comprimento às pontas.', 120, 320, true],
    ['tonalizacao', 'cabelo', 'coloracao', 'Tonalização', 'Corrige o tom amarelado e devolve brilho.', 60, 180],
    ['mechas', 'cabelo', 'mechas', 'Mechas tradicionais', 'Mechas finas com papel, com tonalização.', 180, 520, true],
    ['morena', 'cabelo', 'mechas', 'Morena iluminada', 'Clareamento à mão livre, efeito natural de sol.', 240, 690, true],
    ['retoque-mechas', 'cabelo', 'mechas', 'Retoque de mechas', 'Manutenção de raiz das mechas.', 150, 420],
    ['hidratacao', 'cabelo', 'tratamentos', 'Hidratação', 'Máscara escolhida para o seu tipo de fio.', 45, 140],
    ['reconstrucao', 'cabelo', 'tratamentos', 'Reconstrução', 'Para fios quebradiços depois de química.', 60, 190],
    ['ritual-fios', 'cabelo', 'tratamentos', 'Ritual dos fios', 'Diagnóstico, tratamento, massagem e escova.', 90, 230],
    ['penteado-social', 'cabelo', 'penteados', 'Penteado social', 'Para festa, formatura ou evento.', 75, 280],
    ['semipreso', 'cabelo', 'penteados', 'Semipreso', 'Ondas com parte do cabelo preso.', 60, 240],

    ['manicure', 'unhas', 'manicure', 'Manicure', 'Cutilagem, lixa e esmaltação.', 45, 55],
    ['manicure-spa', 'unhas', 'manicure', 'Manicure spa', 'Com esfoliação, máscara e massagem nas mãos.', 60, 85],
    ['pedicure', 'unhas', 'pedicure', 'Pedicure', 'Cutilagem, lixa e esmaltação dos pés.', 50, 65],
    ['pedicure-spa', 'unhas', 'pedicure', 'Pedicure spa', 'Escalda-pés, esfoliação, lixa nos calcanhares e massagem.', 75, 110],
    ['pe-mao', 'unhas', 'pedicure', 'Pé e mão', 'Manicure e pedicure no mesmo horário.', 90, 110],
    ['gel', 'unhas', 'gel', 'Esmaltação em gel', 'Brilho que dura de duas a três semanas.', 60, 120],
    ['gel-manut', 'unhas', 'gel', 'Manutenção do gel', 'Remoção e nova aplicação.', 60, 110],
    ['fibra', 'unhas', 'alongamento', 'Alongamento em fibra de vidro', 'Unha longa, fina e resistente.', 150, 260],
    ['gel-moldado', 'unhas', 'alongamento', 'Alongamento em gel moldado', 'Formato amendoado, quadrado ou bailarina.', 150, 240],
    ['along-manut', 'unhas', 'alongamento', 'Manutenção do alongamento', 'A cada 21 dias, em média.', 90, 160],
    ['francesinha', 'unhas', 'nailart', 'Francesinha ou baby boomer', 'Acabamento clássico, feito à mão.', 30, 40],
    ['nailart', 'unhas', 'nailart', 'Nail art (por unha)', 'Desenho, pedraria ou foil, por unha decorada.', 10, 15],

    ['design', 'olhar', 'design', 'Design de sobrancelhas', 'Mapeamento do rosto e pinça.', 40, 75],
    ['design-linha', 'olhar', 'design', 'Design com pinça e linha', 'Acabamento mais limpo nos pelos finos.', 45, 85],
    ['henna', 'olhar', 'henna', 'Design com henna', 'Preenche falhas por até 15 dias na pele.', 60, 110],
    ['coloracao-sobr', 'olhar', 'henna', 'Coloração de sobrancelhas', 'Tinta para escurecer os pelos claros.', 40, 80],
    ['fio-a-fio', 'olhar', 'extensao', 'Extensão fio a fio', 'Efeito natural, um fio sintético para cada fio seu.', 150, 280],
    ['volume', 'olhar', 'extensao', 'Volume brasileiro', 'Mais densidade, com fios em leque.', 150, 320],
    ['cilios-manut', 'olhar', 'extensao', 'Manutenção de cílios', 'Entre 15 e 21 dias depois da aplicação.', 90, 170],
    ['lash-lifting', 'olhar', 'lifting', 'Lash lifting', 'Curvatura nos seus próprios cílios.', 60, 180],
    ['lifting-tintura', 'olhar', 'lifting', 'Lash lifting com tintura', 'Curvatura e cor mais escura nos fios.', 75, 210],
    ['brow-lam', 'olhar', 'lamination', 'Brow lamination', 'Pelos alinhados para cima, efeito penteado.', 60, 190],

    ['limpeza', 'estetica', 'limpeza', 'Limpeza de pele', 'Higienização, esfoliação, extração e máscara calmante.', 75, 220],
    ['limpeza-prof', 'estetica', 'limpeza', 'Limpeza de pele profunda', 'Para pele oleosa, com mais tempo de extração.', 90, 260],
    ['facial-hidra', 'estetica', 'facial', 'Facial hidratante', 'Máscaras e massagem facial para pele seca.', 60, 240],
    ['facial-vitc', 'estetica', 'facial', 'Facial iluminador', 'Com vitamina C, para pele opaca.', 70, 280],
    ['drenagem', 'estetica', 'corporal', 'Drenagem linfática', 'Movimentos leves e ritmados no corpo todo.', 60, 190],
    ['esfoliacao', 'estetica', 'corporal', 'Esfoliação corporal', 'Pele mais macia, com hidratação no fim.', 50, 160],
    ['make-social', 'estetica', 'maquiagem', 'Maquiagem social', 'Para eventos de dia ou fotos.', 60, 260],
    ['make-noite', 'estetica', 'maquiagem', 'Maquiagem para a noite', 'Pele de longa duração e olho marcado.', 75, 300],
    ['automake', 'estetica', 'maquiagem', 'Aula de automaquiagem', 'Com os seus próprios produtos.', 120, 420],

    ['massagem-60', 'spa', 'massagens', 'Massagem relaxante 60 min', 'Óleo morno, pressão que você escolhe.', 60, 230],
    ['massagem-90', 'spa', 'massagens', 'Massagem relaxante 90 min', 'Com mais tempo para costas, pernas e pés.', 90, 320],
    ['pedras', 'spa', 'massagens', 'Massagem com pedras quentes', 'Pedras aquecidas sobre as costas e os ombros.', 80, 290],
    ['reflexo', 'spa', 'massagens', 'Massagem nos pés', 'Para depois de um dia longo em pé.', 30, 110],
    ['ritual-elora', 'spa', 'rituais', 'Ritual Élora', 'Esfoliação, massagem de 60 min e facial hidratante.', 150, 520],
    ['ritual-maos-pes', 'spa', 'rituais', 'Ritual mãos e pés', 'Parafina, massagem e esmaltação.', 90, 220],
    ['ritual-detox', 'spa', 'rituais', 'Ritual detox', 'Esfoliação, envoltório e drenagem.', 100, 360],
    ['spa-moments', 'spa', 'combinacoes', 'Spa Moments', 'Massagem de 60 min e facial hidratante.', 120, 420],
    ['spa-dupla', 'spa', 'combinacoes', 'Massagem a dois', 'Duas macas lado a lado na mesma sala.', 60, 440],
    ['beauty-day', 'spa', 'combinacoes', 'Beauty Day', 'Massagem, pé e mão, escova e almoço leve na Maison.', 300, 690]
  ],
  // profissionais de exemplo (nomes fictícios, fotos de banco livre)
  profissionais: [
    { id: 'helena', nome: 'Helena Duarte', deps: ['cabelo'], cargo: 'Cabeleireira · corte e coloração', foto: 'img/pro-helena.webp', pos: '50% 20%',
      esp: ['Corte', 'Coloração', 'Cachos'], bio: 'Quinze anos de salão. Corta a seco quando o cabelo é cacheado e explica cada escolha antes de pegar na tesoura.' },
    { id: 'marina', nome: 'Marina Lopes', deps: ['cabelo'], cargo: 'Colorista · mechas e morena iluminada', foto: 'img/pro-marina.webp', pos: '60% 25%',
      esp: ['Mechas', 'Morena iluminada', 'Tonalização'], bio: 'Faz teste de mecha antes de clarear e prefere chegar no loiro em duas sessões a quebrar o fio numa só.' },
    { id: 'thiago', nome: 'Thiago Reis', deps: ['cabelo'], cargo: 'Cabeleireiro · escova e penteados', foto: 'img/pro-thiago.webp', pos: '70% 30%',
      esp: ['Escova', 'Penteados', 'Noivas'], bio: 'Responsável pelos penteados de noiva da Maison. Faz a prova com o véu e o acessório que a noiva vai usar.' },
    { id: 'julia', nome: 'Júlia Campos', deps: ['unhas'], cargo: 'Manicure · alongamento e gel', foto: 'img/pro-julia.webp', pos: '50% 25%',
      esp: ['Alongamento', 'Gel', 'Manutenção'], bio: 'Especialista em unha fina e natural. Material esterilizado em autoclave e lixa nova para cada cliente.' },
    { id: 'camila', nome: 'Camila Prado', deps: ['unhas'], cargo: 'Manicure · nail art e pedicure spa', foto: 'img/pro-camila.webp', pos: '62% 40%',
      esp: ['Nail art', 'Pedicure spa', 'Francesinha'], bio: 'Desenha à mão livre e traz uma cartela de cores nova a cada estação.' },
    { id: 'renata', nome: 'Renata Alves', deps: ['olhar'], cargo: 'Lash designer · cílios e sobrancelhas', foto: 'img/pro-renata.webp', pos: '50% 22%',
      esp: ['Extensão de cílios', 'Lash lifting', 'Brow lamination'], bio: 'Faz o mapeamento do rosto antes de cada design e indica o fio de cílio que combina com o seu olhar.' },
    { id: 'beatriz', nome: 'Beatriz Nogueira', deps: ['estetica', 'noivas'], cargo: 'Maquiadora · social e noivas', foto: 'img/pro-beatriz.webp', pos: '55% 30%',
      esp: ['Maquiagem social', 'Noivas', 'Automaquiagem'], bio: 'Maquiagem que aguenta a festa inteira e aparece bem na foto. Dá aula de automaquiagem com os produtos da cliente.' },
    { id: 'luiza', nome: 'Luiza Martins', deps: ['estetica'], cargo: 'Esteticista · faciais e corporal', foto: 'img/pro-luiza.webp', pos: '50% 20%',
      esp: ['Limpeza de pele', 'Facial', 'Drenagem'], bio: 'Esteticista e responsável técnica de exemplo. Avalia a pele antes de indicar o protocolo e não promete milagre.' },
    { id: 'ana', nome: 'Ana Paula Rocha', deps: ['spa'], cargo: 'Massoterapeuta · massagens e rituais', foto: 'img/pro-ana.webp', pos: '50% 25%',
      esp: ['Relaxante', 'Pedras quentes', 'Rituais'], bio: 'Pergunta a pressão que você prefere e respeita o silêncio de quem só quer descansar.' }
  ],
  // horários de exemplo por dia da semana (0 = domingo)
  funcionamento: { 0: null, 1: [10, 19], 2: [9, 20], 3: [9, 20], 4: [9, 20], 5: [9, 20], 6: [8, 18] }
};
