/* Basalto Advocacia Criminal · dados de EXEMPLO (equipe e publicações).
   Nomes, registros na OAB e formações são fictícios. Os artigos são informativos e não substituem a análise de um caso. */
window.BASALTO = {
  areas: {
    'flagrante-custodia': 'Prisão em flagrante e audiência de custódia',
    'investigacao': 'Investigação e inquérito',
    'busca-e-apreensao': 'Busca e apreensão',
    'juri': 'Tribunal do Júri',
    'execucao-penal': 'Execução penal',
    'crimes-empresariais': 'Crimes empresariais'
  },

  equipe: [
    { id: 'rafael-tavares', nome: 'Rafael Moura Tavares', ini: 'RT', cargo: 'Sócio', oab: 'OAB/RJ 000.101 (exemplo)',
      areas: ['juri', 'flagrante-custodia', 'investigacao'],
      formacao: ['Graduação em Direito (instituição de exemplo)', 'Especialização em Direito Penal e Processo Penal (exemplo)'],
      idiomas: 'Português, inglês', foto: 'img/concreto-pb.webp',
      bio: ['Atua na advocacia criminal desde a graduação, com dedicação ao Tribunal do Júri e à defesa em procedimentos de investigação.', 'Coordena a equipe de plantão do escritório e a revisão técnica das peças de maior complexidade.'] },
    { id: 'livia-costa', nome: 'Lívia Andrade Costa', ini: 'LC', cargo: 'Sócia', oab: 'OAB/RJ 000.102 (exemplo)',
      areas: ['crimes-empresariais', 'investigacao', 'busca-e-apreensao'],
      formacao: ['Graduação em Direito (instituição de exemplo)', 'Mestrado em Direito Penal Econômico (exemplo)'],
      idiomas: 'Português, inglês, espanhol', foto: 'img/grade-fachada.webp',
      bio: ['Responsável pela área de crimes empresariais e pela atuação preventiva junto a empresas, conselhos e dirigentes.', 'Acompanha investigações que envolvem documentos contábeis, tributários e societários, em conjunto com assistentes técnicos.'] },
    { id: 'marcos-vilela', nome: 'Marcos Vilela Rocha', ini: 'MV', cargo: 'Advogado', oab: 'OAB/RJ 000.103 (exemplo)',
      areas: ['execucao-penal', 'flagrante-custodia'],
      formacao: ['Graduação em Direito (instituição de exemplo)', 'Especialização em Execução Penal (exemplo)'],
      idiomas: 'Português', foto: 'img/faixas-concreto.webp',
      bio: ['Acompanha a execução da pena, pedidos de benefícios previstos em lei e a comunicação com familiares durante o cumprimento.', 'Integra a escala de plantão para prisões em flagrante e audiências de custódia.'] },
    { id: 'beatriz-sampaio', nome: 'Beatriz Sampaio Lins', ini: 'BS', cargo: 'Advogada', oab: 'OAB/RJ 000.104 (exemplo)',
      areas: ['juri', 'investigacao'],
      formacao: ['Graduação em Direito (instituição de exemplo)', 'Especialização em Ciências Criminais (exemplo)'],
      idiomas: 'Português, francês', foto: 'img/colunas-luz.webp',
      bio: ['Atua na preparação de processos do Tribunal do Júri, da análise das provas à organização dos quesitos.', 'Acompanha depoimentos e interrogatórios na fase de investigação.'] },
    { id: 'tomas-rezende', nome: 'Tomás Rezende Prado', ini: 'TR', cargo: 'Advogado associado', oab: 'OAB/RJ 000.105 (exemplo)',
      areas: ['busca-e-apreensao', 'crimes-empresariais'],
      formacao: ['Graduação em Direito (instituição de exemplo)', 'Especialização em Direito Digital e Provas Eletrônicas (exemplo)'],
      idiomas: 'Português, inglês', foto: 'img/escada-claraboia.webp',
      bio: ['Dedica-se a questões de cadeia de custódia, perícia em aparelhos eletrônicos e limites de mandados de busca.', 'Apoia a área empresarial na análise de documentos apreendidos.'] }
  ],

  artigos: [
    { id: 'audiencia-de-custodia', cat: 'Prisão e flagrante', area: 'flagrante-custodia',
      titulo: 'Audiência de custódia: o que acontece depois de uma prisão em flagrante',
      resumo: 'O que a lei prevê para a apresentação da pessoa presa ao juiz e quais decisões podem ser tomadas nessa audiência.',
      autor: 'rafael-tavares', data: '2026-10-21', min: 6, img: 'img/galeria-luz.webp',
      corpo: [
        ['p', 'Quando alguém é preso em flagrante, o Código de Processo Penal determina que a prisão seja comunicada imediatamente ao juiz, ao Ministério Público e à família ou a pessoa indicada pelo preso. A partir daí começa uma etapa curta e importante: a audiência de custódia.'],
        ['h2', 'O que é a audiência de custódia'],
        ['p', 'É a apresentação da pessoa presa a um juiz. A lei prevê que ela ocorra em até 24 horas após a prisão, com a presença do Ministério Público e da defesa, seja advogado constituído pela família, seja a Defensoria Pública.'],
        ['p', 'Nessa audiência o juiz não julga se a pessoa é culpada. Ele examina a legalidade da prisão e decide se ela deve ou não continuar enquanto o caso é investigado.'],
        ['h2', 'Quais decisões são possíveis'],
        ['p', 'O artigo 310 do Código de Processo Penal lista as alternativas: relaxar a prisão, se ela for ilegal; converter o flagrante em prisão preventiva, quando presentes os requisitos legais e se outras medidas forem insuficientes; ou conceder liberdade provisória, com ou sem fiança, podendo impor medidas cautelares diversas da prisão, como comparecimento periódico em juízo.'],
        ['p', 'Qual dessas decisões será tomada depende das circunstâncias concretas, da documentação apresentada e da análise do juiz. Não há resultado previsível de antemão.'],
        ['h2', 'O papel da defesa nessa etapa'],
        ['p', 'A defesa conversa reservadamente com a pessoa presa antes da audiência, verifica se houve alguma irregularidade na prisão e reúne documentos que ajudem o juiz a conhecer a situação pessoal, como comprovante de residência e de trabalho.'],
        ['p', 'Também cabe à defesa orientar sobre o direito de permanecer em silêncio quanto aos fatos e acompanhar todas as perguntas feitas durante a audiência.']
      ],
      refs: [['Constituição Federal', 'art. 5º, incisos LXII, LXIII e LXV'], ['Código de Processo Penal', 'arts. 306 e 310 (redação da Lei 13.964/2019)'], ['Código de Processo Penal', 'art. 319 (medidas cautelares diversas da prisão)'], ['Resolução CNJ 213/2015', 'regulamenta a apresentação da pessoa presa']] },

    { id: 'direito-ao-silencio', cat: 'Garantias', area: 'flagrante-custodia',
      titulo: 'Direito ao silêncio: o que diz a Constituição',
      resumo: 'Permanecer calado é um direito, não uma confissão. Entenda o alcance dessa garantia na delegacia e em juízo.',
      autor: 'beatriz-sampaio', data: '2026-10-08', min: 5, img: 'img/sala-escura.webp',
      corpo: [
        ['p', 'A Constituição garante à pessoa presa o direito de permanecer calada e de ter assistência da família e de advogado. A mesma lógica vale para quem é investigado ou acusado, mesmo sem estar preso.'],
        ['h2', 'Silêncio não é confissão'],
        ['p', 'O Código de Processo Penal estabelece que o silêncio não importa confissão e não pode ser interpretado em prejuízo da defesa. Quem é ouvido deve ser informado desse direito antes do interrogatório.'],
        ['h2', 'Na prática'],
        ['p', 'Exercer o direito ao silêncio não significa deixar de se identificar quando isso é exigido. A garantia diz respeito aos fatos investigados. Também não impede que a pessoa fale mais tarde, depois de conversar com seu advogado e conhecer o que existe nos autos.'],
        ['p', 'A decisão de falar ou não, e sobre quais pontos, é tomada caso a caso, com orientação técnica.'],
        ['h2', 'Assistência de advogado'],
        ['p', 'O Estatuto da Advocacia assegura ao advogado o direito de assistir seus clientes investigados durante a apuração de infrações, inclusive em depoimentos e interrogatórios, sob pena de nulidade do ato e dos elementos dele decorrentes.']
      ],
      refs: [['Constituição Federal', 'art. 5º, inciso LXIII'], ['Código de Processo Penal', 'art. 186, parágrafo único'], ['Lei 8.906/1994 (Estatuto da Advocacia)', 'art. 7º, inciso XXI']] },

    { id: 'acesso-ao-inquerito', cat: 'Investigação', area: 'investigacao',
      titulo: 'Inquérito policial: o investigado pode ter acesso aos autos?',
      resumo: 'O que a Súmula Vinculante 14 garante à defesa e quais diligências podem continuar em sigilo.',
      autor: 'livia-costa', data: '2026-09-24', min: 7, img: 'img/lombadas.webp',
      corpo: [
        ['p', 'Receber uma intimação para depor ou descobrir que existe uma investigação em andamento costuma gerar a mesma pergunta: é possível saber o que está sendo apurado?'],
        ['h2', 'O que diz a Súmula Vinculante 14'],
        ['p', 'O Supremo Tribunal Federal fixou que é direito do defensor, no interesse do representado, ter acesso amplo aos elementos de prova que, já documentados em procedimento investigatório realizado por órgão com competência de polícia judiciária, digam respeito ao exercício do direito de defesa.'],
        ['h2', 'O que pode continuar em sigilo'],
        ['p', 'A súmula fala em elementos já documentados. Diligências em andamento, cuja eficácia dependa do sigilo, como uma interceptação ainda em curso, podem ser preservadas até a conclusão. Depois de documentadas, devem ser disponibilizadas à defesa.'],
        ['h2', 'O Estatuto da Advocacia'],
        ['p', 'O Estatuto assegura ao advogado examinar, em qualquer instituição responsável por conduzir investigação, autos de flagrante e de investigações de qualquer natureza, findos ou em andamento, podendo copiar peças e tomar apontamentos. Nos autos sob sigilo, exige-se procuração.'],
        ['h2', 'Por que isso importa'],
        ['p', 'Conhecer o que já existe na investigação permite avaliar com responsabilidade se é o caso de prestar esclarecimentos, apresentar documentos ou requerer diligências, como prevê o artigo 14 do Código de Processo Penal.']
      ],
      refs: [['Súmula Vinculante 14', 'Supremo Tribunal Federal'], ['Lei 8.906/1994', 'art. 7º, inciso XIV e §§ 10 a 12'], ['Código de Processo Penal', 'arts. 4º a 23 e art. 14']] },

    { id: 'mandado-de-busca', cat: 'Busca e apreensão', area: 'busca-e-apreensao',
      titulo: 'Mandado de busca e apreensão: requisitos e limites',
      resumo: 'O que o mandado precisa conter, em que horário pode ser cumprido em uma residência e o que acontece com o material apreendido.',
      autor: 'tomas-rezende', data: '2026-09-10', min: 6, img: 'img/pilares.webp',
      corpo: [
        ['p', 'A casa é asilo inviolável do indivíduo, diz a Constituição. Uma das exceções é a entrada, durante o dia, por determinação judicial. É nesse contexto que se insere o mandado de busca e apreensão.'],
        ['h2', 'O que o mandado deve conter'],
        ['p', 'O artigo 243 do Código de Processo Penal exige que o mandado indique, o mais precisamente possível, a casa em que será realizada a diligência e o nome do proprietário ou morador, mencione o motivo e os fins da diligência e seja assinado pela autoridade que o expediu.'],
        ['h2', 'Como deve ser cumprido'],
        ['p', 'As buscas domiciliares são executadas de dia, salvo consentimento do morador. Antes de entrar, os executores devem mostrar e ler o mandado a quem estiver no imóvel. Ao final, lavra-se um auto circunstanciado, assinado por testemunhas.'],
        ['h2', 'O material apreendido'],
        ['p', 'Documentos, aparelhos e outros objetos apreendidos devem ser descritos no auto. Em aparelhos eletrônicos, a preservação da cadeia de custódia, disciplinada nos artigos 158-A a 158-F do Código de Processo Penal, é relevante para a confiabilidade da prova.'],
        ['h2', 'Depois da diligência'],
        ['p', 'A defesa pode pedir cópia do auto, examinar a decisão que autorizou a busca e, quando cabível, requerer a restituição de bens que não interessem ao processo. Cada medida depende da análise do caso.']
      ],
      refs: [['Constituição Federal', 'art. 5º, inciso XI'], ['Código de Processo Penal', 'arts. 240 a 250'], ['Código de Processo Penal', 'arts. 158-A a 158-F (cadeia de custódia)'], ['Código de Processo Penal', 'arts. 118 a 124 (restituição de coisas apreendidas)']] },

    { id: 'fases-do-juri', cat: 'Júri', area: 'juri',
      titulo: 'Tribunal do Júri: as duas fases do procedimento',
      resumo: 'Da denúncia à sessão plenária, como funciona o julgamento dos crimes dolosos contra a vida.',
      autor: 'rafael-tavares', data: '2026-08-27', min: 8, img: 'img/colunata.webp',
      corpo: [
        ['p', 'A Constituição reconhece a instituição do júri, com a plenitude de defesa, o sigilo das votações, a soberania dos veredictos e a competência para julgar os crimes dolosos contra a vida.'],
        ['h2', 'Primeira fase: a admissibilidade'],
        ['p', 'Recebida a denúncia, há resposta da defesa, audiência de instrução e alegações. Ao final, o juiz pode pronunciar o acusado, se houver prova da materialidade e indícios suficientes de autoria; impronunciá-lo, se esses requisitos não estiverem presentes; absolvê-lo sumariamente, nas hipóteses do artigo 415; ou desclassificar a infração para outra que não seja da competência do júri.'],
        ['h2', 'Segunda fase: o plenário'],
        ['p', 'Com a pronúncia, o processo segue para a sessão de julgamento. Sete jurados, sorteados entre os alistados, ouvem as testemunhas, o interrogatório e os debates entre acusação e defesa. Depois respondem, em sala especial e por votação sigilosa, aos quesitos formulados pelo juiz.'],
        ['h2', 'Preparação'],
        ['p', 'A preparação envolve o estudo integral dos autos, a análise de laudos, a escolha das testemunhas a serem ouvidas em plenário e atenção à formulação dos quesitos. É um trabalho de meses, feito com a pessoa acusada e, quando ela autoriza, com a família.']
      ],
      refs: [['Constituição Federal', 'art. 5º, inciso XXXVIII'], ['Código de Processo Penal', 'arts. 406 a 497'], ['Código de Processo Penal', 'arts. 413 a 419 (pronúncia, impronúncia, absolvição sumária e desclassificação)']] },

    { id: 'progressao-de-regime', cat: 'Execução penal', area: 'execucao-penal',
      titulo: 'Progressão de regime: como a Lei de Execução Penal trata o tema',
      resumo: 'Requisitos objetivos e subjetivos, remição pelo trabalho e pelo estudo, e o papel do acompanhamento da execução.',
      autor: 'marcos-vilela', data: '2026-08-12', min: 7, img: 'img/escada-luz.webp',
      corpo: [
        ['p', 'A pena privativa de liberdade é executada de forma progressiva. A Lei de Execução Penal prevê a transferência para regime menos rigoroso quando cumpridos os requisitos legais.'],
        ['h2', 'Requisito objetivo'],
        ['p', 'Desde a Lei 13.964/2019, o artigo 112 da Lei de Execução Penal fixa percentuais de cumprimento da pena que variam conforme a natureza do crime, a existência de violência ou grave ameaça e a reincidência. O cálculo considera a data-base correta e eventuais interrupções.'],
        ['h2', 'Requisito subjetivo'],
        ['p', 'Além do tempo, exige-se boa conduta carcerária, comprovada pelo diretor do estabelecimento, respeitadas as normas que vedam a progressão. Alterações legislativas recentes também trataram do exame criminológico, o que reforça a necessidade de acompanhamento atualizado.'],
        ['h2', 'Remição'],
        ['p', 'O artigo 126 permite descontar dias de pena pelo trabalho e pelo estudo: um dia a cada três de trabalho, e um dia a cada doze horas de frequência escolar, distribuídas em pelo menos três dias. A leitura também tem sido reconhecida, conforme regulamentação do Conselho Nacional de Justiça.'],
        ['h2', 'Acompanhamento'],
        ['p', 'Conferir o cálculo da pena, reunir certidões e formular os pedidos no momento adequado faz parte da atuação na execução. Cada pedido é analisado pelo juízo da execução, que decide conforme o caso concreto.']
      ],
      refs: [['Lei 7.210/1984 (Lei de Execução Penal)', 'arts. 112 e 126'], ['Lei 13.964/2019', 'alterou o art. 112 da LEP'], ['Resolução CNJ 391/2021', 'remição pela leitura e por atividades educacionais']] },

    { id: 'acordo-de-nao-persecucao', cat: 'Crimes empresariais', area: 'crimes-empresariais',
      titulo: 'Acordo de não persecução penal: requisitos gerais',
      resumo: 'O que é o ANPP, quando pode ser proposto pelo Ministério Público e quais condições costumam ser ajustadas.',
      autor: 'livia-costa', data: '2026-07-29', min: 6, img: 'img/quina-concreto.webp',
      corpo: [
        ['p', 'Introduzido no Código de Processo Penal pela Lei 13.964/2019, o acordo de não persecução penal é um instrumento pelo qual o Ministério Público deixa de oferecer denúncia mediante o cumprimento de condições ajustadas com a pessoa investigada.'],
        ['h2', 'Requisitos'],
        ['p', 'O artigo 28-A prevê o acordo quando não for caso de arquivamento, a infração tiver sido praticada sem violência ou grave ameaça e com pena mínima inferior a quatro anos, e a pessoa investigada confessar formal e circunstanciadamente a prática. A lei também lista situações em que o acordo não é cabível.'],
        ['h2', 'Condições'],
        ['p', 'Entre as condições previstas estão a reparação do dano, quando possível, a prestação de serviços à comunidade e o pagamento de prestação pecuniária. O acordo é homologado pelo juiz, que verifica sua voluntariedade e legalidade em audiência.'],
        ['h2', 'Avaliação cuidadosa'],
        ['p', 'Como o acordo exige confissão, a decisão de aceitá-lo deve ser tomada depois de conhecer a investigação e avaliar alternativas. Em empresas, a análise costuma envolver também as esferas tributária, administrativa e cível.']
      ],
      refs: [['Código de Processo Penal', 'art. 28-A'], ['Lei 13.964/2019', 'introduziu o acordo no CPP'], ['Lei 12.846/2013', 'responsabilização administrativa e civil de pessoas jurídicas']] }
  ]
};
