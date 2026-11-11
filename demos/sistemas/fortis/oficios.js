// Fortis · os ofícios da construção e da reforma. O app se personaliza pelos ofícios que a pessoa marca:
// materiais sugeridos, jeito de cobrar no orçamento, buscas do "Achar trabalho", mensagens, dicas e ferramentas.
// Quem faz mais de uma coisa vê tudo junto; a tela de início puxa pelo ofício principal.

// ic: nome do ícone (base.js); mats: [material, unidade]; cobra: modos de cobrar mais usados; busca: frases que o cliente escreve;
// ferr: ferramentas que aparecem primeiro; modelos: listas prontas (ferramentas.js); dica: conselhos do ofício
export const OFICIOS = {
  pedreiro: { nome: 'Pedreiro', ic: 'tijolo', area: 'Alvenaria',
    mats: [['Cimento CP-II 50 kg', 'saco'], ['Areia média (m³)', 'm³'], ['Brita 1 (m³)', 'm³'], ['Bloco de concreto 14x19x39', 'un'], ['Tijolo baiano 9x19x29', 'un'], ['Cal hidratada 20 kg', 'saco'], ['Ferro 3/8 CA-50 (barra 12 m)', 'barra'], ['Arame recozido (kg)', 'kg']],
    cobra: ['m2', 'diaria', 'empreitada'], busca: ['preciso de pedreiro', 'procuro pedreiro', 'orçamento reforma', 'construir muro'],
    ferr: ['blocos', 'traco'], modelos: ['parede', 'contrapiso', 'concreto'],
    dica: ['Na parede de bloco, conte 12,5 blocos por m² mais 5% de quebra.', 'Traço 1:3 de argamassa de assentamento rende mais com cal: 1 de cimento, 1/2 de cal e 5 de areia.', 'Registre cada saco de cimento comprado na obra: no fim você sabe o custo real do m².'] },
  azulejista: { nome: 'Azulejista', ic: 'piso', area: 'Pisos e revestimentos',
    mats: [['Porcelanato 60x60 (m²)', 'm²'], ['Piso cerâmico 45x45 (m²)', 'm²'], ['Argamassa AC-II 20 kg', 'saco'], ['Argamassa AC-III 20 kg', 'saco'], ['Rejunte 5 kg', 'saco'], ['Espaçador 2 mm (pacote 100)', 'pacote'], ['Cunha niveladora (pacote 100)', 'pacote']],
    cobra: ['m2', 'empreitada'], busca: ['preciso de azulejista', 'assentar piso', 'colocar porcelanato', 'reforma banheiro'],
    ferr: ['piso'], modelos: ['piso'],
    dica: ['Porcelanato acima de 60 cm pede argamassa AC-III e dupla colagem.', 'Some 10% de perda no piso reto e 15% na diagonal.', 'Foto do contrapiso antes de assentar vale ouro no antes e depois.'] },
  carpinteiro: { nome: 'Carpinteiro', ic: 'serrote', area: 'Carpintaria',
    mats: [['Tábua de cumaru 10 cm (metro)', 'm'], ['Viga de eucalipto tratado 6x12 (metro)', 'm'], ['Caibro de eucalipto 5x10 (metro)', 'm'], ['Prego 18x27 (kg)', 'kg'], ['Lambri de pinus 10 cm (m²)', 'm²'], ['Verniz marítimo (galão 3,6 L)', 'galão']],
    cobra: ['empreitada', 'diaria', 'metro'], busca: ['preciso de carpinteiro', 'fazer deck', 'pergolado', 'telhado de madeira'],
    ferr: ['corte'], modelos: ['deck', 'pergolado', 'forro', 'porta'],
    dica: ['No deck, deixe 5 mm entre as tábuas para a água escorrer.', 'Madeira tratada em contato com o chão: sempre eucalipto autoclavado.'] },
  marceneiro: { nome: 'Marceneiro', ic: 'chapa', area: 'Marcenaria',
    mats: [['Chapa MDF 15 mm branco 2750x1840', 'chapa'], ['Chapa MDF 6 mm branco (fundo)', 'chapa'], ['Dobradiça curva 35 mm (un)', 'un'], ['Corrediça telescópica 45 cm (par)', 'par'], ['Fita de borda branca 22 mm (rolo 20 m)', 'rolo'], ['Parafuso 4,0x40 (cento)', 'cento'], ['Puxador perfil alumínio (metro)', 'm']],
    cobra: ['empreitada', 'metro'], busca: ['preciso de marceneiro', 'móveis planejados', 'guarda-roupa sob medida', 'cozinha planejada'],
    ferr: ['corte'], modelos: ['guarda-roupa', 'prateleira'],
    dica: ['Rode o plano de corte antes de comprar: cada chapa salva paga o almoço da semana.', 'Fita de borda: compre 20% a mais que a soma dos perímetros.'] },
  mestre: { nome: 'Mestre de obras', ic: 'capacete', area: 'Obra completa',
    mats: [['Cimento CP-II 50 kg', 'saco'], ['Areia média (m³)', 'm³'], ['Brita 1 (m³)', 'm³'], ['Bloco de concreto 14x19x39', 'un'], ['Ferro 3/8 CA-50 (barra 12 m)', 'barra']],
    cobra: ['empreitada', 'diaria'], busca: ['mestre de obras', 'construir casa', 'reforma completa', 'ampliação'],
    ferr: ['traco', 'blocos'], modelos: ['parede', 'concreto', 'contrapiso'],
    dica: ['Combine por escrito as etapas e o que está incluso: evita briga no fim da obra.'] },
  servente: { nome: 'Servente / ajudante', ic: 'carrinho', area: 'Apoio na obra', mats: [], cobra: ['diaria'], busca: ['preciso de ajudante', 'servente de pedreiro', 'diarista obra'], ferr: [], modelos: [], dica: ['Anote cada diária no app: no fim do mês você vê quanto rendeu cada obra.'] },
  eletricista: { nome: 'Eletricista', ic: 'raio', area: 'Elétrica',
    mats: [['Fio flexível 2,5 mm (rolo 100 m)', 'rolo'], ['Fio flexível 4 mm (rolo 100 m)', 'rolo'], ['Disjuntor DIN 20 A', 'un'], ['Tomada 10 A com placa', 'un'], ['Eletroduto corrugado 3/4 (rolo 50 m)', 'rolo'], ['Caixa 4x2', 'un'], ['DR 40 A 30 mA', 'un']],
    cobra: ['ponto', 'empreitada', 'hora'], busca: ['preciso de eletricista', 'instalar chuveiro', 'trocar tomadas', 'quadro de luz'],
    ferr: ['eletrica'], modelos: ['eletrica'],
    dica: ['Chuveiro de 7500 W em 220 V pede fio de 6 mm e disjuntor de 40 A.', 'Cobrar por ponto deixa o orçamento claro para o cliente.'] },
  encanador: { nome: 'Encanador', ic: 'gota', area: 'Hidráulica',
    mats: [['Tubo PVC soldável 25 mm (barra 6 m)', 'barra'], ['Tubo PVC esgoto 100 mm (barra 6 m)', 'barra'], ['Joelho 90° 25 mm', 'un'], ['Registro de gaveta 3/4', 'un'], ['Cola PVC 175 g', 'un'], ['Fita veda-rosca 18 mm', 'un']],
    cobra: ['ponto', 'empreitada', 'hora'], busca: ['preciso de encanador', 'vazamento', 'desentupir', 'trocar registro'],
    ferr: [], modelos: ['hidraulica'], dica: ['Teste a pressão por 30 minutos antes de fechar a parede.'] },
  pintor: { nome: 'Pintor', ic: 'rolo', area: 'Pintura',
    mats: [['Tinta acrílica fosca 18 L', 'lata'], ['Massa corrida 25 kg', 'balde'], ['Selador acrílico 18 L', 'lata'], ['Lixa 150 (folha)', 'un'], ['Rolo de lã 23 cm', 'un'], ['Fita crepe 48 mm', 'un']],
    cobra: ['m2', 'empreitada', 'diaria'], busca: ['preciso de pintor', 'pintar casa', 'pintura de apartamento', 'textura parede'],
    ferr: ['tinta'], modelos: ['pintura'], dica: ['Uma lata de 18 L rende cerca de 300 m² por demão: confira o rendimento no rótulo.'] },
  gesseiro: { nome: 'Gesseiro / drywall', ic: 'placa', area: 'Gesso e drywall',
    mats: [['Placa de drywall ST 1,20x1,80', 'placa'], ['Perfil montante 48 mm (3 m)', 'barra'], ['Guia 48 mm (3 m)', 'barra'], ['Parafuso drywall (cento)', 'cento'], ['Massa para drywall 5 kg', 'balde'], ['Fita telada (rolo 90 m)', 'rolo']],
    cobra: ['m2', 'empreitada'], busca: ['preciso de gesseiro', 'forro de gesso', 'parede de drywall', 'sanca'], ferr: [], modelos: ['drywall'], dica: ['Montante a cada 60 cm; em parede com TV, a cada 40 cm e reforço de madeira.'] },
  serralheiro: { nome: 'Serralheiro', ic: 'solda', area: 'Serralheria', mats: [['Metalon 30x30 (barra 6 m)', 'barra'], ['Chapa galvanizada nº 18', 'chapa'], ['Eletrodo 2,5 mm (kg)', 'kg'], ['Fundo zarcão (galão)', 'galão']], cobra: ['metro', 'empreitada'], busca: ['preciso de serralheiro', 'portão', 'grade', 'corrimão'], ferr: [], modelos: [], dica: ['Passe fundo anticorrosivo no mesmo dia da solda.'] },
  vidraceiro: { nome: 'Vidraceiro', ic: 'vidro', area: 'Vidros', mats: [['Vidro temperado 8 mm (m²)', 'm²'], ['Silicone neutro 280 g', 'un'], ['Kit box de banheiro', 'kit']], cobra: ['m2', 'empreitada'], busca: ['preciso de vidraceiro', 'box de banheiro', 'janela de vidro'], ferr: [], modelos: [], dica: ['Meça o vão em 3 pontos: parede nunca é reta.'] },
  telhadista: { nome: 'Telhadista', ic: 'telhado', area: 'Telhados', mats: [['Telha cerâmica (milheiro)', 'milheiro'], ['Telha fibrocimento 2,44 m', 'un'], ['Cumeeira (un)', 'un'], ['Manta subcobertura (rolo)', 'rolo']], cobra: ['m2', 'empreitada'], busca: ['preciso de telhadista', 'conserto de telhado', 'goteira', 'trocar telhas'], ferr: [], modelos: ['telhado'], dica: ['Telha cerâmica: cerca de 16 por m²; some 5% de quebra.'] },
  montador: { nome: 'Montador de móveis', ic: 'chave', area: 'Montagem', mats: [['Cavilha 8 mm (pacote)', 'pacote'], ['Parafuso 3,5x16 (cento)', 'cento'], ['Bucha 6 com parafuso (cento)', 'cento']], cobra: ['empreitada', 'hora'], busca: ['montador de móveis', 'montar guarda-roupa', 'montagem de móveis'], ferr: [], modelos: [], dica: ['Fotografe a nota e as caixas fechadas antes de abrir: evita discussão sobre peça faltando.'] },
  arcondicionado: { nome: 'Instalador de ar-condicionado', ic: 'neve', area: 'Climatização', mats: [['Tubo de cobre 1/4 + 3/8 (metro)', 'm'], ['Suporte para condensadora', 'par'], ['Cabo PP 3x2,5 (metro)', 'm']], cobra: ['empreitada'], busca: ['instalar ar condicionado', 'instalação split', 'manutenção ar condicionado'], ferr: [], modelos: [], dica: ['Faça vácuo de pelo menos 15 minutos antes de abrir as válvulas.'] },
  jardineiro: { nome: 'Jardineiro / paisagista', ic: 'folha', area: 'Jardim', mats: [['Grama esmeralda (m²)', 'm²'], ['Terra vegetal (saco 20 kg)', 'saco'], ['Pedra decorativa (saco)', 'saco']], cobra: ['m2', 'diaria'], busca: ['preciso de jardineiro', 'paisagismo', 'plantar grama'], ferr: [], modelos: [], dica: ['Grama plantada no fim da tarde pega melhor.'] },
  impermeabilizador: { nome: 'Impermeabilizador', ic: 'escudo', area: 'Impermeabilização', mats: [['Manta asfáltica 3 mm (rolo 10 m²)', 'rolo'], ['Impermeabilizante flexível 18 kg', 'balde'], ['Primer asfáltico 18 L', 'lata']], cobra: ['m2', 'empreitada'], busca: ['impermeabilização', 'laje vazando', 'infiltração'], ferr: [], modelos: [], dica: ['Suba a impermeabilização 30 cm nas paredes da área molhada.'] },
  fazutudo: { nome: 'Marido de aluguel / faz-tudo', ic: 'ferramenta', area: 'Pequenos reparos', mats: [['Bucha 8 com parafuso (cento)', 'cento'], ['Silicone neutro 280 g', 'un'], ['Lâmpada LED 9 W', 'un']], cobra: ['hora', 'empreitada'], busca: ['marido de aluguel', 'pequenos reparos', 'instalar prateleira', 'trocar resistência'], ferr: [], modelos: [], dica: ['Tenha preço fixo para os 10 serviços mais pedidos: o cliente decide na hora.'] },
  calheiro: { nome: 'Calheiro', ic: 'calha', area: 'Calhas e rufos', mats: [['Calha galvanizada (metro)', 'm'], ['Rufo galvanizado (metro)', 'm'], ['Condutor PVC 100 mm (barra 6 m)', 'barra']], cobra: ['metro', 'empreitada'], busca: ['preciso de calheiro', 'calha', 'rufo'], ferr: [], modelos: [], dica: ['Caimento da calha: 0,5 cm por metro.'] },
  armador: { nome: 'Armador', ic: 'grade', area: 'Armação de ferro', mats: [['Ferro 3/8 CA-50 (barra 12 m)', 'barra'], ['Ferro 5/16 CA-50 (barra 12 m)', 'barra'], ['Estribo pronto 7x17 (un)', 'un'], ['Arame recozido (kg)', 'kg']], cobra: ['empreitada', 'diaria'], busca: ['armador de ferragem', 'armação de coluna', 'ferragem de laje'], ferr: ['traco'], modelos: ['concreto'], dica: ['Cobrimento mínimo do ferro em fundação: 3 cm.'] },
};
export const ORDEM_OFICIOS = Object.keys(OFICIOS);

export const MODOS_COBRAR = {
  empreitada: { nome: 'Empreitada', rot: 'Valor fechado do serviço', un: '' },
  diaria: { nome: 'Diária', rot: 'Valor da diária', un: 'diárias' },
  hora: { nome: 'Hora', rot: 'Valor da hora', un: 'horas' },
  m2: { nome: 'Por m²', rot: 'Valor do m²', un: 'm²' },
  ponto: { nome: 'Por ponto', rot: 'Valor do ponto', un: 'pontos' },
  metro: { nome: 'Por metro', rot: 'Valor do metro', un: 'metros' },
};

// ofícios da pessoa (o primeiro é o principal); "outro:..." é texto livre
export const meusOficios = (perfil) => (perfil.oficios || []).map((id) => (OFICIOS[id] ? { id, ...OFICIOS[id] } : { id, nome: String(id).replace(/^outro:/, ''), ic: 'ferramenta', area: String(id).replace(/^outro:/, ''), mats: [], cobra: ['empreitada', 'diaria'], busca: [`preciso de ${String(id).replace(/^outro:/, '').toLowerCase()}`], ferr: [], modelos: [], dica: [] }));
export const principal = (perfil) => meusOficios(perfil)[0] || { id: 'fazutudo', ...OFICIOS.fazutudo };
export const nomeOficios = (perfil) => { const l = meusOficios(perfil).map((o) => o.nome.split(' /')[0]); return l.length > 1 ? `${l.slice(0, -1).join(', ')} e ${l[l.length - 1].toLowerCase()}` : (l[0] || 'Profissional'); };
export const juntar = (perfil, campo) => [...new Set(meusOficios(perfil).flatMap((o) => o[campo] || []))];
export const materiaisSugeridos = (perfil) => { const vistos = new Set(); return meusOficios(perfil).flatMap((o) => o.mats).filter(([n]) => !vistos.has(n) && vistos.add(n)); };
