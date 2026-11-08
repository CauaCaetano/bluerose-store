/*
 * Prisma Administração Imobiliária · dados de EXEMPLO da demonstração.
 * No site real, nada disto é digitado à mão: o portal lê contratos, extratos, boletos e chamados
 * direto do sistema da administradora (Superlógica, Jetimob, Vista, Imobzi… por API ou XML).
 * Aqui tudo é gerado no navegador e nada é gravado em servidor.
 */
(function () {
  'use strict';

  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var MES_C = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var TAXA_ADM = 0.08;

  // ---------- imóveis para alugar (catálogo) ----------
  var IMOVEIS = [
    { cod: 'PR-1021', tipo: 'Apartamento', titulo: 'Apartamento de 2 quartos com suíte', bairro: 'Nova Aliança', regiao: 'Zona Sul', area: 68, quartos: 2, suites: 1, banheiros: 2, vagas: 1, aluguel: 2300, cond: 540, iptu: 85, pet: true, mobiliado: false, usp: false, novo: true,
      fotos: [['pr1021-fachada', 1200, 799, 'Fachada do prédio com sacadas de vidro'], ['pr1021-cozinha', 1200, 801, 'Cozinha com mesa de madeira e armários claros']],
      desc: 'Prédio com portaria 24 horas, a duas quadras da Av. Professor João Fiúsa. Sala com sacada, cozinha com armários, suíte com box blindex e área de serviço separada.', itens: ['Portaria 24 h', 'Sacada', 'Armários na cozinha', 'Piscina no condomínio', 'Aceita pet'] },
    { cod: 'PR-1034', tipo: 'Apartamento', titulo: 'Apartamento de 3 quartos perto do parque', bairro: 'Jardim Botânico', regiao: 'Zona Sul', area: 96, quartos: 3, suites: 1, banheiros: 2, vagas: 2, aluguel: 3600, cond: 890, iptu: 160, pet: true, mobiliado: false, usp: false, novo: false,
      fotos: [['pr1034-fachada', 1200, 800, 'Prédio residencial com varandas e vegetação'], ['pr1034-sala', 1200, 800, 'Sala ampla com janelas grandes e sofá azul']],
      desc: 'Planta de 96 m² com sala para dois ambientes e varanda. Duas vagas cobertas, academia e salão de festas. A pé até o Parque Botânico.', itens: ['Varanda', '2 vagas cobertas', 'Academia', 'Salão de festas', 'Aceita pet'] },
    { cod: 'PR-1047', tipo: 'Studio', titulo: 'Studio mobiliado a 8 minutos da USP', bairro: 'Vila Amélia', regiao: 'Zona Oeste', area: 32, quartos: 1, suites: 0, banheiros: 1, vagas: 1, aluguel: 1450, cond: 320, iptu: 35, pet: false, mobiliado: true, usp: true, novo: true,
      fotos: [['pr1047-studio', 1200, 801, 'Studio com cozinha integrada e sofá'], ['pr1047-ambientes', 1200, 801, 'Studio com bancada e portas de correr']],
      desc: 'Pronto para morar: cama, armários, geladeira, fogão cooktop, micro-ondas e mesa de estudo. Internet do prédio inclusa no condomínio. Ideal para estudante ou residente.', itens: ['Mobiliado', 'Internet inclusa', 'Lavanderia coletiva', 'Perto da USP', 'Bicicletário'] },
    { cod: 'PR-1052', tipo: 'Apartamento', titulo: 'Apartamento de 2 quartos no Centro', bairro: 'Centro', regiao: 'Centro', area: 74, quartos: 2, suites: 0, banheiros: 1, vagas: 0, aluguel: 1650, cond: 480, iptu: 60, pet: true, mobiliado: false, usp: false, novo: false,
      fotos: [['pr1052-predio', 1200, 800, 'Prédio residencial com muitas janelas'], ['pr1052-cozinha', 1200, 800, 'Cozinha com mesa redonda e janela grande']],
      desc: 'Quartos amplos e pé-direito alto, a uma quadra da Rua General Osório. Ônibus na porta e comércio a pé. Prédio sem vaga, com estacionamento conveniado ao lado.', itens: ['Pé-direito alto', 'Comércio a pé', 'Portaria diurna', 'Aceita pet'] },
    { cod: 'PR-1066', tipo: 'Casa em condomínio', titulo: 'Casa em condomínio com 3 suítes', bairro: 'Vila do Golf', regiao: 'Zona Sul', area: 180, quartos: 3, suites: 3, banheiros: 4, vagas: 2, aluguel: 6900, cond: 780, iptu: 290, pet: true, mobiliado: false, usp: false, novo: false,
      fotos: [['pr1066-condominio', 1200, 801, 'Casas de condomínio com gramado e caminho de pedra'], ['pr1066-quarto', 1200, 800, 'Suíte com cama de casal e ventilador de teto']],
      desc: 'Condomínio fechado com segurança 24 horas, quadra e área verde. Três suítes, lavabo, espaço gourmet e quintal gramado.', itens: ['Condomínio fechado', 'Espaço gourmet', 'Quintal', '3 suítes', 'Aceita pet'] },
    { cod: 'PR-1073', tipo: 'Casa', titulo: 'Casa térrea com quintal e 2 vagas', bairro: 'Jardim Califórnia', regiao: 'Zona Sul', area: 140, quartos: 3, suites: 1, banheiros: 2, vagas: 2, aluguel: 4200, cond: 0, iptu: 180, pet: true, mobiliado: false, usp: false, novo: true,
      fotos: [['pr1073-casa', 1000, 1333, 'Casa moderna com jardim e entrada para carros'], ['pr1073-sala', 1200, 800, 'Sala integrada com cozinha e piso de madeira']],
      desc: 'Pintura nova, sala integrada à cozinha, suíte com closet e quintal com churrasqueira. Rua tranquila, perto do Shopping Iguatemi.', itens: ['Pintura nova', 'Churrasqueira', 'Quintal', 'Closet', 'Aceita pet'] },
    { cod: 'PR-1088', tipo: 'Sala comercial', titulo: 'Sala comercial com vista e vaga', bairro: 'Jardim Irajá', regiao: 'Zona Sul', area: 45, quartos: 0, suites: 0, banheiros: 1, vagas: 1, aluguel: 2100, cond: 450, iptu: 110, pet: false, mobiliado: false, usp: false, novo: false,
      fotos: [['pr1088-sala-comercial', 1200, 800, 'Sala comercial ampla com piso claro e iluminação'], ['pr1088-janela', 900, 1350, 'Janela grande com persiana e planta']],
      desc: 'Prédio comercial com recepção, controle de acesso e estacionamento rotativo. Pronta para consultório ou escritório, com ar-condicionado instalado.', itens: ['Ar-condicionado', 'Recepção no prédio', 'Controle de acesso', '1 vaga'] },
    { cod: 'PR-1091', tipo: 'Apartamento', titulo: 'Apartamento de 1 quarto com varanda', bairro: 'Ribeirânia', regiao: 'Zona Leste', area: 42, quartos: 1, suites: 0, banheiros: 1, vagas: 1, aluguel: 1350, cond: 310, iptu: 40, pet: true, mobiliado: false, usp: false, novo: false,
      fotos: [['pr1091-predio', 1000, 1250, 'Prédio claro com sacadas de ferro'], ['pr1091-sala', 1200, 801, 'Sala vazia com piso de madeira e janela grande']],
      desc: 'Bom para quem mora sozinho ou casal. Perto da UNAERP e da Av. Costábile Romano, com mercado e farmácia a pé.', itens: ['Varanda', 'Perto da UNAERP', 'Aceita pet'] },
    { cod: 'PR-1105', tipo: 'Apartamento', titulo: 'Apartamento de 3 quartos com 2 suítes', bairro: 'Jardim Irajá', regiao: 'Zona Sul', area: 118, quartos: 3, suites: 2, banheiros: 3, vagas: 2, aluguel: 4800, cond: 1050, iptu: 230, pet: false, mobiliado: false, usp: false, novo: false,
      fotos: [['pr1105-sacadas', 1200, 800, 'Sacadas de vidro de prédio moderno'], ['pr1105-suite', 1200, 801, 'Suíte com armários embutidos e banheiro']],
      desc: 'Andar alto, sol da manhã, varanda gourmet e armários planejados nos quartos. Condomínio com piscina aquecida e quadra.', itens: ['Varanda gourmet', 'Armários planejados', 'Piscina aquecida', 'Andar alto'] },
    { cod: 'PR-1112', tipo: 'Cobertura', titulo: 'Cobertura com terraço e 3 vagas', bairro: 'Santa Cruz do José Jacques', regiao: 'Zona Sul', area: 160, quartos: 3, suites: 2, banheiros: 3, vagas: 3, aluguel: 5900, cond: 1200, iptu: 260, pet: true, mobiliado: false, usp: false, novo: true,
      fotos: [['pr1112-fachada', 900, 1350, 'Fachada escura de prédio com janelas iluminadas'], ['pr1112-estar', 1100, 1100, 'Sala de estar cinza com mesa de jantar']],
      desc: 'Dois pavimentos, terraço com churrasqueira e vista para a cidade. Três vagas e depósito privativo.', itens: ['Terraço', 'Churrasqueira', 'Depósito', '3 vagas', 'Aceita pet'] },
    { cod: 'PR-1126', tipo: 'Sobrado', titulo: 'Sobrado de 3 quartos perto de escolas', bairro: 'Jardim Sumaré', regiao: 'Zona Oeste', area: 150, quartos: 3, suites: 1, banheiros: 3, vagas: 2, aluguel: 3900, cond: 0, iptu: 170, pet: true, mobiliado: false, usp: false, novo: false,
      fotos: [['pr1126-sobrado', 1200, 800, 'Sobrado de tijolos com cerca viva'], ['pr1126-sala', 1200, 800, 'Sala com piso de madeira e ventilador de teto']],
      desc: 'Sala com lareira, lavabo, três quartos no andar de cima e edícula nos fundos. Rua arborizada, perto de escolas.', itens: ['Edícula', 'Lavabo', 'Rua arborizada', 'Aceita pet'] },
    { cod: 'PR-1134', tipo: 'Apartamento', titulo: 'Apartamento de 2 quartos com planejados', bairro: 'Alto da Boa Vista', regiao: 'Zona Sul', area: 63, quartos: 2, suites: 1, banheiros: 2, vagas: 1, aluguel: 2450, cond: 590, iptu: 90, pet: false, mobiliado: true, usp: false, novo: false,
      fotos: [['pr1134-predio', 1200, 800, 'Prédio branco com sacadas e vasos de plantas'], ['pr1134-cozinha', 1200, 800, 'Cozinha branca com piso de madeira']],
      desc: 'Cozinha e quartos com planejados, ar-condicionado na suíte e varanda. Perto do Ribeirão Shopping.', itens: ['Planejados', 'Ar-condicionado', 'Varanda', 'Perto do shopping'] }
  ];
  IMOVEIS.forEach(function (i) { i.seguro = Math.round(i.area * 0.32 + 8); i.total = i.aluguel + i.cond + i.iptu + i.seguro; });

  // ---------- bairros (calculadora) · R$/m² de aluguel de EXEMPLO ----------
  var BAIRROS = [
    ['Alto da Boa Vista', 35], ['Bonfim Paulista', 29], ['Campos Elíseos', 22], ['Centro', 23], ['Ipiranga', 21], ['Jardim Botânico', 34],
    ['Jardim Califórnia', 29], ['Jardim Irajá', 36], ['Jardim Paulista', 26], ['Jardim Sumaré', 27], ['Lagoinha', 20], ['Nova Aliança', 33],
    ['Quinta da Primavera', 30], ['Ribeirânia', 30], ['Santa Cruz do José Jacques', 34], ['Vila Amélia', 36], ['Vila do Golf', 38], ['Vila Seixas', 27]
  ];

  // ---------- proprietário de exemplo ----------
  var PROP = {
    nome: 'Carlos Menezes', email: 'proprietario@exemplo.com.br', conta: 'Banco Exemplo · ag. 0000 · c/c ****-7', pix: 'CPF ***.482.***-**',
    imoveis: [
      { cod: 'PR-0412', nome: 'Apartamento 2 quartos', bairro: 'Nova Aliança', situacao: 'Alugado', inquilino: 'Inquilino PF (exemplo)', pj: false, inicio: '03/2024', fim: '02/2027', reajuste: 'IGP-M em março', garantia: 'Seguro fiança' },
      { cod: 'PR-0655', nome: 'Conjunto comercial 110 m²', bairro: 'Jardim Irajá', situacao: 'Alugado', inquilino: 'Clínica Exemplo Ltda (PJ)', pj: true, inicio: '01/2023', fim: '12/2027', reajuste: 'IPCA em janeiro', garantia: 'Título de capitalização' },
      { cod: 'PR-1073', nome: 'Casa térrea 3 quartos', bairro: 'Jardim Califórnia', situacao: 'Disponível', inquilino: 'Anunciada desde 05/08/2026', pj: false, inicio: '—', fim: '—', reajuste: '—', garantia: '—' }
    ]
  };

  // competências de jan/2025 a nov/2026 geradas com regras simples e coerentes
  function aluguelDe(cod, ano, mes) {
    if (cod === 'PR-0412') return (ano > 2026 || (ano === 2026 && mes >= 3)) ? 2650 : (ano === 2025 && mes < 3) ? 2460 : 2540;
    if (cod === 'PR-0655') return ano >= 2026 ? 5200 : 4980;
    if (cod === 'PR-1073') return (ano === 2025 || (ano === 2026 && mes <= 7)) ? 4000 : 0;
    return 0;
  }
  var DESPESAS = {
    '2025-4|PR-0412': ['Troca do sifão da pia (nota anexa)', 180],
    '2025-9|PR-1073': ['Conserto do portão eletrônico', 420],
    '2026-2|PR-0655': ['Manutenção do ar-condicionado (parte do proprietário)', 350],
    '2026-6|PR-0412': ['Reparo no registro do chuveiro', 260],
    '2026-8|PR-1073': ['IPTU do mês (imóvel vago)', 180],
    '2026-9|PR-1073': ['Pintura interna para novo anúncio', 2400],
    '2026-10|PR-1073': ['IPTU do mês (imóvel vago)', 180],
    '2026-11|PR-1073': ['IPTU do mês (imóvel vago)', 180]
  };
  function irrf(base) { // tabela progressiva de EXEMPLO (o real vem do sistema e segue a tabela vigente)
    if (base <= 2428.8) return 0;
    if (base <= 2826.65) return base * 0.075 - 182.16;
    if (base <= 3751.05) return base * 0.15 - 394.16;
    if (base <= 4664.68) return base * 0.225 - 675.49;
    return base * 0.275 - 908.73;
  }
  var r2 = function (n) { return Math.round(n * 100) / 100; };
  function competencia(ano, mes) {
    var linhas = PROP.imoveis.map(function (im) {
      var bruto = aluguelDe(im.cod, ano, mes), taxa = r2(bruto * TAXA_ADM), d = DESPESAS[ano + '-' + mes + '|' + im.cod];
      var desp = d ? d[1] : 0, imp = im.pj && bruto ? r2(irrf(bruto - taxa)) : 0;
      var liq = r2(bruto - taxa - desp - imp);
      var sit, data = '';
      var atual = ano === 2026 && mes === 11;
      if (!bruto && !desp) sit = 'sem';
      else if (!bruto) { sit = 'descontado'; }
      else if (atual && im.cod === 'PR-0655') { sit = 'aguardando'; }
      else if (atual) { sit = 'repassado'; data = '07/11/2026'; }
      else { sit = 'repassado'; var dd = im.cod === 'PR-0655' ? 12 : 13; data = String(dd).padStart(2, '0') + '/' + String(mes).padStart(2, '0') + '/' + ano; }
      return { cod: im.cod, nome: im.nome, bairro: im.bairro, bruto: bruto, taxa: taxa, despesa: desp, despesaDesc: d ? d[0] : '', imposto: imp, liquido: liq, situacao: sit, data: data };
    });
    var soma = function (k) { return r2(linhas.reduce(function (a, l) { return a + l[k]; }, 0)); };
    return { ano: ano, mes: mes, rotulo: MESES[mes - 1] + ' de ' + ano, curto: MES_C[mes - 1] + '/' + String(ano).slice(2), linhas: linhas,
      bruto: soma('bruto'), taxa: soma('taxa'), despesa: soma('despesa'), imposto: soma('imposto'), liquido: soma('liquido') };
  }
  var COMPETENCIAS = [];
  for (var a = 2025; a <= 2026; a++) for (var m = 1; m <= 12; m++) { if (a === 2026 && m > 11) break; COMPETENCIAS.push(competencia(a, m)); }

  function informe(ano) {
    var cs = COMPETENCIAS.filter(function (c) { return c.ano === ano; });
    return PROP.imoveis.map(function (im) {
      var t = { cod: im.cod, nome: im.nome, inquilino: im.inquilino, pj: im.pj, bruto: 0, taxa: 0, imposto: 0, despesa: 0 };
      cs.forEach(function (c) { c.linhas.forEach(function (l) { if (l.cod === im.cod) { t.bruto += l.bruto; t.taxa += l.taxa; t.imposto += l.imposto; t.despesa += l.despesa; } }); });
      ['bruto', 'taxa', 'imposto', 'despesa'].forEach(function (k) { t[k] = r2(t[k]); });
      if (im.cod === 'PR-1073') t.inquilino = 'Inquilino PF anterior (exemplo)';
      return t;
    });
  }

  // ---------- inquilino de exemplo ----------
  var INQ = {
    nome: 'Marina Alves', email: 'inquilino@exemplo.com.br', cod: 'PR-0874', imovel: 'Apartamento 2 quartos · Rua de Exemplo, 250, ap. 52 · Jardim Botânico',
    inicio: '15/03/2025', fim: '14/09/2027', meses: 30, reajuste: 'IGP-M, todo mês de março', garantia: 'Seguro fiança (seguradora parceira, exemplo)', vencimento: 10,
    valores: [['Aluguel', 2380], ['Condomínio', 610], ['IPTU (parcela)', 92], ['Seguro incêndio', 24]],
    chamados: [
      { prot: 'CH-2410', data: '04/11/2026', cat: 'Elétrica', comodo: 'Quarto 2', desc: 'Tomada da parede da janela sem energia.', urg: 'Média', status: 'Técnico agendado', etapa: 2, prev: '11/11/2026, das 9h às 12h' },
      { prot: 'CH-2291', data: '18/08/2026', cat: 'Hidráulica', comodo: 'Cozinha', desc: 'Vazamento no sifão embaixo da pia.', urg: 'Alta', status: 'Concluído', etapa: 4, prev: 'Resolvido em 19/08/2026' }
    ]
  };
  INQ.total = INQ.valores.reduce(function (a, v) { return a + v[1]; }, 0);
  INQ.historico = (function () {
    var h = [], ano = 2025, mes = 4; // primeiro boleto em abril/2025
    while (ano < 2026 || (ano === 2026 && mes <= 11)) {
      var aluguel = (ano === 2026 && mes >= 4) ? 2475 : 2380;
      var total = aluguel + 610 + 92 + 24, atual = ano === 2026 && mes === 11;
      var tardio = ano === 2026 && mes === 7;
      h.push({ ref: MES_C[mes - 1] + '/' + ano, venc: '10/' + String(mes).padStart(2, '0') + '/' + ano, valor: total,
        pago: atual ? null : (tardio ? '14/' + String(mes).padStart(2, '0') + '/' + ano : '0' + (5 + (mes % 4)) + '/' + String(mes).padStart(2, '0') + '/' + ano),
        multa: tardio ? r2(total * 0.02 + total * 0.00033 * 4) : 0, status: atual ? 'Em aberto' : (tardio ? 'Pago com atraso' : 'Pago') });
      mes++; if (mes > 12) { mes = 1; ano++; }
    }
    return h.reverse();
  })();
  // valores atuais após o reajuste de março/2026
  INQ.valores[0][1] = 2475; INQ.total = 2475 + 610 + 92 + 24;

  // ---------- painel da equipe (exemplo) ----------
  var PAINEL = {
    sistema: 'Superlógica', contratos: 812, vencendo60: 37, repassesPend: 46, nChamados: 23, nInteressados: 58, ocupacao: 94.2, inad: 2.8,
    inadSerie: [3.9, 3.6, 3.8, 3.4, 3.1, 3.3, 3.0, 2.9, 3.2, 2.7, 2.9, 2.8],
    ocupSerie: [91.0, 91.4, 92.1, 92.6, 92.2, 93.0, 93.4, 93.1, 93.8, 94.0, 93.9, 94.2],
    vencendo: [
      ['PR-0312', 'Apartamento · Jardim Paulista', 'Inquilino 0312 (exemplo)', '20/11/2026', 'Renovação proposta'],
      ['PR-0457', 'Casa · Ribeirânia', 'Inquilino 0457 (exemplo)', '30/11/2026', 'Aguardando proprietário'],
      ['PR-0519', 'Sala · Jardim Irajá', 'Empresa 0519 Ltda (exemplo)', '05/12/2026', 'Sem contato'],
      ['PR-0603', 'Apartamento · Centro', 'Inquilino 0603 (exemplo)', '12/12/2026', 'Renovação proposta'],
      ['PR-0688', 'Apartamento · Nova Aliança', 'Inquilino 0688 (exemplo)', '19/12/2026', 'Vai desocupar'],
      ['PR-0731', 'Sobrado · Jardim Sumaré', 'Inquilino 0731 (exemplo)', '03/01/2027', 'Sem contato']
    ],
    repasses: [
      ['PR-0102', 'Proprietário 0102 (exemplo)', 2384.6, '08/11/2026'], ['PR-0145', 'Proprietário 0145 (exemplo)', 1702.0, '08/11/2026'],
      ['PR-0233', 'Proprietário 0233 (exemplo)', 4012.5, '08/11/2026'], ['PR-0298', 'Proprietário 0298 (exemplo)', 1288.0, '09/11/2026'],
      ['PR-0376', 'Proprietário 0376 (exemplo)', 3150.4, '09/11/2026'], ['PR-0412', 'Carlos Menezes (exemplo)', 2438.0, '07/11/2026']
    ],
    chamados: [
      ['CH-2418', 'PR-0874', 'Hidráulica', 'Alta', 'Aberto', 'Chuveiro sem água quente'],
      ['CH-2416', 'PR-0533', 'Elétrica', 'Média', 'Técnico agendado', 'Disjuntor desarmando'],
      ['CH-2415', 'PR-0219', 'Portão e fechadura', 'Alta', 'Aberto', 'Fechadura da porta emperrada'],
      ['CH-2412', 'PR-0690', 'Infiltração', 'Média', 'Orçamento com proprietário', 'Mancha no teto do banheiro'],
      ['CH-2410', 'PR-0874', 'Elétrica', 'Média', 'Técnico agendado', 'Tomada sem energia'],
      ['CH-2407', 'PR-0341', 'Pintura', 'Baixa', 'Aberto', 'Retoque na parede da sala'],
      ['CH-2401', 'PR-0412', 'Hidráulica', 'Média', 'Orçamento com proprietário', 'Aquecedor com vazamento'],
      ['CH-2396', 'PR-0588', 'Ar-condicionado', 'Baixa', 'Concluído', 'Limpeza do filtro']
    ],
    interessados: [
      ['Interessado 1 (exemplo)', 'PR-1021', 'Documentos enviados', 'Site'], ['Interessado 2 (exemplo)', 'PR-1047', 'Análise cadastral', 'Portal parceiro'],
      ['Interessado 3 (exemplo)', 'PR-1073', 'Proposta ao proprietário', 'Site'], ['Interessado 4 (exemplo)', 'PR-1105', 'Visita agendada', 'WhatsApp'],
      ['Interessado 5 (exemplo)', 'PR-1134', 'Garantia escolhida', 'Site'], ['Interessado 6 (exemplo)', 'PR-1091', 'Assinatura', 'Indicação']
    ],
    inadimplentes: [['PR-0277', 'Inquilino 0277 (exemplo)', 3106, 12], ['PR-0490', 'Empresa 0490 Ltda (exemplo)', 5840, 6], ['PR-0612', 'Inquilino 0612 (exemplo)', 1980, 3]]
  };

  window.PRISMA = {
    MESES: MESES, MES_C: MES_C, TAXA_ADM: TAXA_ADM,
    carregarImoveis: function () { return IMOVEIS.slice(); },
    obterImovel: function (cod) { cod = String(cod || '').toUpperCase(); for (var i = 0; i < IMOVEIS.length; i++) if (IMOVEIS[i].cod === cod) return IMOVEIS[i]; return null; },
    bairros: function () { return BAIRROS.slice(); },
    proprietario: function () { return PROP; },
    competencias: function () { return COMPETENCIAS.slice(); },
    informe: informe,
    inquilino: function () { return INQ; },
    painel: function () { return PAINEL; }
  };
})();
