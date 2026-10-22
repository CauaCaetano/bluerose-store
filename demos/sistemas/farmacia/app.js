// Veltria Farmácia · drogaria completa: balcão com lote e validade, receitas e controlados, cupom fiscal, convênios e serviços
// Base do Veltria Gestão (estoque, compras, XML do fornecedor, etiquetas, curva ABC, melhores fornecedores) + o que é de farmácia.
import {
  criarApp, esc, moeda, moedaC, num, pct, hoje, agoraISO, diaMais, mesMais, nomeMes, dataCurta, dataBR, relativo, diasAte, paraData,
  sorteio, soma, agrupar, av, ic, et, telLink, kpis, barras, linhas, rosca, barrasH, normal,
  modal, confirmar, avisar, editar, excluir, ficha, props, linhaDoTempo, vazio, pop, imprimir, fecharGaveta, baixar,
} from '../base/nexo.js';
import { LADOS as FERR, ITENS as FERR_ITENS } from './ferramentas.js';
import { acoesLado, ferramentaPaginas, travarPro } from '../base/lado.js';
import { equipeViva, paginaEquipe } from '../base/equipe-viva.js';
import { conferirNota } from '../base/nota-xml.js';

// ---------------------------------------------------------------- tabelas do ramo
const ATEND = [['ana', 'Ana Paula (farmacêutica)'], ['bruno', 'Bruno Costa (balconista)'], ['carla', 'Carla Mendes (balconista)']];
const EQUIPE = { colecao: 'atendentes', rot: 'Atendentes', icone: 'users-three', singular: 'atendente', plural: 'atendentes', vazio: 'os atendentes do balcão', lista: ATEND,
  campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel' }, { nome: 'crf', rotulo: 'CRF (se for farmacêutico)', tipo: 'texto' }],
  linha: (r) => [r.id, r.nome], registro: ([id, nome]) => ({ id, nome }) };
const nomeA = (id) => (ATEND.find((v) => v[0] === id) || [, '—'])[1];
const CATEG = ['Medicamentos', 'Controlados', 'Perfumaria', 'Higiene e bebê', 'Correlatos', 'Vitaminas e suplementos'];
const cats = (a) => [...new Set([...CATEG, ...a.db.lista('produtos').map((p) => p.categoria).filter(Boolean)])];
const COR_CAT = ['#0f766e', '#be123c', '#a855f7', '#0ea5e9', '#f59e0b', '#22a06b'];
const TIPOS = ['Referência', 'Genérico', 'Similar', 'Isento de prescrição (MIP)', 'Fitoterápico', 'Correlato', 'Perfumaria e higiene'];
const TARJAS = ['Sem tarja', 'Vermelha', 'Vermelha · retém receita', 'Preta'];
// listas da Portaria SVS/MS 344/98 e antimicrobianos (RDC 471/2021): tipo de receita e validade em dias
const CONTROLE = {
  A1: ['Entorpecente (A1)', 'Notificação de Receita A (amarela)', 30], A2: ['Entorpecente (A2)', 'Notificação de Receita A (amarela)', 30], A3: ['Psicotrópico (A3)', 'Notificação de Receita A (amarela)', 30],
  B1: ['Psicotrópico (B1)', 'Notificação de Receita B (azul)', 30], B2: ['Anorexígeno (B2)', 'Notificação de Receita B2 (azul)', 30],
  C1: ['Controle especial (C1)', 'Receita de Controle Especial (2 vias)', 30], C2: ['Retinoide (C2)', 'Notificação de Receita Especial de Retinoides', 30],
  C4: ['Antirretroviral (C4)', 'Receita de Controle Especial (2 vias)', 30], C5: ['Anabolizante (C5)', 'Receita de Controle Especial (2 vias)', 30],
  ATM: ['Antimicrobiano', 'Receita de antimicrobiano (2 vias)', 10],
};
// controle escrito à mão (fora das listas conhecidas) também exige receita retida, com validade de 30 dias
const infoCtrl = (c) => CONTROLE[c] || [`Controlado (${c})`, 'Receita retida (2 vias)', 30];
const pedeNotificacao = (c) => ['A1', 'A2', 'A3', 'B1', 'B2', 'C2'].includes(c);
const etControle = (c) => (c ? et(c === 'ATM' ? 'Antimicrobiano' : CONTROLE[c] ? `Controlado ${c}` : String(c).slice(0, 24), c === 'ATM' ? 'al' : 'er', 'sem-ponto') : '');
const PAG = { pix: ['PIX', 'qr-code', '17'], credito: ['Crédito', 'credit-card', '03'], debito: ['Débito', 'credit-card', '04'], dinheiro: ['Dinheiro', 'money', '01'], convenio: ['Convênio', 'buildings', '05'], crediario: ['Crediário', 'notebook', '05'], farmpop: ['Farmácia Popular', 'first-aid-kit', '99'] };
const SERVICOS = ['Aferição de pressão arterial', 'Glicemia capilar', 'Medição de temperatura', 'Aplicação de injetável', 'Perfuração de lóbulo auricular', 'Vacinação', 'Teste rápido', 'Nebulização'];
const ST_ENT = [['separando', 'Separando', 'al'], ['saiu', 'Saiu para entrega', 'info'], ['entregue', 'Entregue', 'ok']];

// código de barras EAN-13
const comDigito = (d12) => d12 + String((10 - (d12.split('').reduce((t, c, i) => t + Number(c) * (i % 2 ? 3 : 1), 0) % 10)) % 10);
const eanValido = (e) => /^\d{13}$/.test(e) && comDigito(e.slice(0, 12)) === e;
const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const EAN_R = EAN_L.map((x) => x.replace(/./g, (b) => (b === '0' ? '1' : '0')));
const PARIDADE = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
function codigoBarras(ean, { altura = 54, m = 2 } = {}) {
  if (!/^\d{13}$/.test(ean || '')) return '<span class="mute">sem código</span>';
  const d = ean.split('').map(Number), par = PARIDADE[d[0]];
  let bits = '101'; for (let i = 1; i <= 6; i++) bits += (par[i - 1] === 'L' ? EAN_L : EAN_G)[d[i]]; bits += '01010'; for (let i = 7; i <= 12; i++) bits += EAN_R[d[i]]; bits += '101';
  const guarda = (i) => i < 3 || (i >= 45 && i < 50) || i >= 92;
  let b = ''; for (let i = 0; i < bits.length; i++) if (bits[i] === '1') b += `<rect x="${(i + 9) * m}" y="2" width="${m}" height="${guarda(i) ? altura + 7 : altura}"/>`;
  return `<svg class="ean" viewBox="0 0 ${113 * m} ${altura + 22}" role="img" aria-label="Código de barras ${ean}"><rect width="100%" height="100%" fill="#fff"/><g fill="#111">${b}</g><g fill="#111" style="font:600 ${m * 6}px var(--mono)" text-anchor="middle"><text x="${4 * m}" y="${altura + 19}">${d[0]}</text><text x="${33 * m}" y="${altura + 19}">${ean.slice(1, 7)}</text><text x="${80 * m}" y="${altura + 19}">${ean.slice(7)}</text></g></svg>`;
}

// ---------------------------------------------------------------- dados de exemplo (fictícios)
function semente() {
  const r = sorteio(20261017), esc1 = (l) => l[Math.floor(r() * l.length)], ent = (a, b) => a + Math.floor(r() * (b - a + 1));
  const fornecedores = [['Distribuidora MedSul', 'Rogério', 1], ['Farmalog Distribuidora', 'Sandra', 2], ['Pharma Norte Atacado', 'Felipe', 3], ['Dermacos Perfumaria', 'Márcia', 5], ['Hospitalar Paulista', 'Tiago', 4]]
    .map(([nome, contato, prazo], i) => ({ id: `f${i}`, nome, contato, prazo, doc: `${41 + i}.${520 + i}.${630 + i}/0001-${31 + i}`, telefone: `(16) 3${310 + i * 7}-${4200 + i * 19}`, pontualidade: [0.96, 0.9, 0.84, 0.93, 0.88][i], avaliacao: [4.8, 4.4, 4.0, 4.5, 4.2][i] }));
  // nome, princípio ativo, apresentação, laboratório, tipo, tarja, controle, categoria, fornecedor, custo, preço, PMC, dias da caixa (uso contínuo), termolábil, NCM
  const base = [
    ['Losartana potássica 50 mg · 30 comp.', 'Losartana potássica', '50 mg · 30 comprimidos', 'Lab. Alfa Genéricos', 'Genérico', 'Vermelha', '', 'Medicamentos', 'f0', 6.9, 14.9, 21.4, 30, false, '30049069'],
    ['Pressolar 50 mg · 30 comp.', 'Losartana potássica', '50 mg · 30 comprimidos', 'Lab. Vitallis', 'Referência', 'Vermelha', '', 'Medicamentos', 'f0', 38.2, 64.9, 79.3, 30, false, '30049069'],
    ['Metformina 850 mg · 30 comp.', 'Cloridrato de metformina', '850 mg · 30 comprimidos', 'Lab. Alfa Genéricos', 'Genérico', 'Vermelha', '', 'Medicamentos', 'f0', 4.8, 11.9, 16.8, 30, false, '30049099'],
    ['Sinvastatina 20 mg · 30 comp.', 'Sinvastatina', '20 mg · 30 comprimidos', 'Lab. Prisma', 'Genérico', 'Vermelha', '', 'Medicamentos', 'f1', 5.4, 13.9, 19.9, 30, false, '30049099'],
    ['Omeprazol 20 mg · 28 cáps.', 'Omeprazol', '20 mg · 28 cápsulas', 'Lab. Prisma', 'Genérico', 'Vermelha', '', 'Medicamentos', 'f1', 6.1, 15.9, 22.5, 28, false, '30049099'],
    ['Dipirona 500 mg · 10 comp.', 'Dipirona monoidratada', '500 mg · 10 comprimidos', 'Lab. Alfa Genéricos', 'Isento de prescrição (MIP)', 'Sem tarja', '', 'Medicamentos', 'f0', 2.1, 5.49, 7.2, 0, false, '30049099'],
    ['Paracetamol 750 mg · 20 comp.', 'Paracetamol', '750 mg · 20 comprimidos', 'Lab. Prisma', 'Isento de prescrição (MIP)', 'Sem tarja', '', 'Medicamentos', 'f1', 3.2, 8.9, 11.5, 0, false, '30049099'],
    ['Loratadina 10 mg · 12 comp.', 'Loratadina', '10 mg · 12 comprimidos', 'Lab. Vitallis', 'Isento de prescrição (MIP)', 'Sem tarja', '', 'Medicamentos', 'f0', 3.9, 9.9, 13.4, 0, false, '30049099'],
    ['Ibuprofeno 600 mg · 20 comp.', 'Ibuprofeno', '600 mg · 20 comprimidos', 'Lab. Prisma', 'Genérico', 'Vermelha', '', 'Medicamentos', 'f1', 6.6, 16.9, 23.1, 0, false, '30049099'],
    ['Insulina humana NPH 100 UI/ml · 10 ml', 'Insulina humana NPH', '100 UI/ml · frasco 10 ml', 'Lab. Biovida', 'Referência', 'Vermelha', '', 'Medicamentos', 'f4', 28.5, 49.9, 62.0, 30, true, '30043100'],
    ['Amoxicilina 500 mg · 21 cáps.', 'Amoxicilina', '500 mg · 21 cápsulas', 'Lab. Alfa Genéricos', 'Genérico', 'Vermelha · retém receita', 'ATM', 'Controlados', 'f0', 9.8, 22.9, 31.2, 0, false, '30041019'],
    ['Azitromicina 500 mg · 3 comp.', 'Azitromicina', '500 mg · 3 comprimidos', 'Lab. Prisma', 'Genérico', 'Vermelha · retém receita', 'ATM', 'Controlados', 'f1', 8.4, 19.9, 27.4, 0, false, '30042099'],
    ['Sertralina 50 mg · 30 comp.', 'Cloridrato de sertralina', '50 mg · 30 comprimidos', 'Lab. Prisma', 'Genérico', 'Vermelha · retém receita', 'C1', 'Controlados', 'f1', 11.2, 29.9, 44.0, 30, false, '30049099'],
    ['Fluoxetina 20 mg · 30 cáps.', 'Cloridrato de fluoxetina', '20 mg · 30 cápsulas', 'Lab. Alfa Genéricos', 'Genérico', 'Vermelha · retém receita', 'C1', 'Controlados', 'f0', 7.9, 21.9, 30.5, 30, false, '30049099'],
    ['Clonazepam 2 mg · 30 comp.', 'Clonazepam', '2 mg · 30 comprimidos', 'Lab. Vitallis', 'Genérico', 'Preta', 'B1', 'Controlados', 'f0', 5.6, 15.9, 21.8, 30, false, '30049099'],
    ['Clonazepam gotas 2,5 mg/ml · 20 ml', 'Clonazepam', '2,5 mg/ml · 20 ml', 'Lab. Vitallis', 'Genérico', 'Preta', 'B1', 'Controlados', 'f0', 6.3, 17.9, 24.6, 0, false, '30049099'],
    ['Metilfenidato 10 mg · 30 comp.', 'Cloridrato de metilfenidato', '10 mg · 30 comprimidos', 'Lab. Biovida', 'Referência', 'Preta', 'A3', 'Controlados', 'f4', 24.0, 49.9, 63.7, 30, false, '30049099'],
    ['Isotretinoína 20 mg · 30 cáps.', 'Isotretinoína', '20 mg · 30 cápsulas', 'Lab. Biovida', 'Genérico', 'Vermelha · retém receita', 'C2', 'Controlados', 'f4', 62.0, 119.9, 151.0, 30, false, '30049099'],
    ['Vitamina C 1 g · 10 efervescentes', 'Ácido ascórbico', '1 g · 10 comprimidos efervescentes', 'Lab. Vitallis', 'Isento de prescrição (MIP)', 'Sem tarja', '', 'Vitaminas e suplementos', 'f1', 5.2, 12.9, 0, 0, false, '21069030'],
    ['Polivitamínico A-Z · 60 comp.', 'Polivitamínico', '60 comprimidos', 'Lab. Prisma', 'Isento de prescrição (MIP)', 'Sem tarja', '', 'Vitaminas e suplementos', 'f1', 14.5, 32.9, 0, 60, false, '21069030'],
    ['Protetor solar FPS 50 · 120 ml', '', '120 ml', 'Dermacos', 'Perfumaria e higiene', 'Sem tarja', '', 'Perfumaria', 'f3', 21.0, 44.9, 0, 0, false, '33049910'],
    ['Shampoo anticaspa · 200 ml', '', '200 ml', 'Dermacos', 'Perfumaria e higiene', 'Sem tarja', '', 'Perfumaria', 'f3', 9.8, 21.9, 0, 0, false, '33051000'],
    ['Fralda infantil G · 30 unidades', '', '30 unidades', 'Bebê Bem', 'Perfumaria e higiene', 'Sem tarja', '', 'Higiene e bebê', 'f3', 28.0, 49.9, 0, 0, false, '96190000'],
    ['Escova dental macia', '', 'unidade', 'Sorriso', 'Perfumaria e higiene', 'Sem tarja', '', 'Higiene e bebê', 'f3', 2.9, 7.9, 0, 0, false, '96032100'],
    ['Teste de gravidez', '', 'unidade', 'Hospitalar', 'Correlato', 'Sem tarja', '', 'Correlatos', 'f4', 4.5, 14.9, 0, 0, false, '38221990'],
    ['Seringa 3 ml com agulha', '', 'unidade', 'Hospitalar', 'Correlato', 'Sem tarja', '', 'Correlatos', 'f4', 0.6, 2.5, 0, 0, false, '90183119'],
    ['Soro fisiológico 0,9% · 500 ml', 'Cloreto de sódio', '0,9% · 500 ml', 'Lab. Biovida', 'Isento de prescrição (MIP)', 'Sem tarja', '', 'Medicamentos', 'f4', 3.1, 8.5, 10.9, 0, false, '30049099'],
  ];
  const lote = () => `${String.fromCharCode(65 + ent(0, 25))}${String.fromCharCode(65 + ent(0, 25))}${ent(1000, 9999)}`;
  const produtos = base.map(([nome, principio, apresentacao, laboratorio, tipo, tarja, controle, categoria, fornecedor, custo, preco, pmc, dias, termolabil, ncm], i) => {
    const giro = controle ? ent(1, 3) : categoria === 'Medicamentos' ? ent(2, 6) : ent(1, 3);
    const nLotes = ent(1, 3), lotes = Array.from({ length: nLotes }, (_, k) => { const val = diaMais(k === 0 && i % 6 === 0 ? ent(-12, 40) : ent(60, 720)); return { lote: lote(), validade: val, fab: diaMais(-ent(120, 400), val.slice(0, 10) < hoje() ? diaMais(-200) : hoje()), qtd: Math.max(0, giro * ent(4, 16)) }; });
    return { id: `p${i}`, sku: String(7000 + i), ean: comDigito(`789${String(5123000 + i * 41).padStart(9, '0')}`), nome, principio, apresentacao, laboratorio, tipo, tarja, controle, categoria, fornecedor, custo, preco, pmc, dias_caixa: dias, termolabil, ncm, cfop: '5102', csosn: controle || categoria === 'Medicamentos' ? '500' : '102',
      registro_ms: categoria === 'Medicamentos' || categoria === 'Controlados' ? `1${String(2345678 + i * 1371).padStart(8, '0')}${ent(1000, 9999)}`.slice(0, 13) : '', giro, minimo: giro * 7, localizacao: controle ? `ARM-${String(1 + (i % 4)).padStart(2, '0')}` : `${String.fromCharCode(65 + (i % 6))}-${String(1 + (i % 9)).padStart(2, '0')}`, lotes };
  });
  produtos[3].lotes = [{ lote: 'SV2291', validade: diaMais(-5), fab: diaMais(-700), qtd: 4 }, { lote: 'SV3410', validade: diaMais(380), fab: diaMais(-60), qtd: 22 }];
  produtos[7].lotes = [{ lote: 'LR1188', validade: diaMais(24), fab: diaMais(-690), qtd: 9 }];
  produtos[22].lotes = [{ lote: 'FR5520', validade: diaMais(900), fab: diaMais(-30), qtd: 3 }];
  const convenios = [['Metalúrgica Ribeirão Ltda', 10, 5, 400, 'Patrícia (RH)'], ['Construtora Horizonte', 8, 10, 300, 'Wagner (DP)']].map(([nome, desconto, dia, limite, contato], i) => ({ id: `cv${i}`, nome, desconto, dia_fechamento: dia, limite, contato, telefone: `(16) 3${620 + i * 9}-${5100 + i * 17}` }));
  const nomes = ['Maria das Graças Souza', 'José Carlos Pereira', 'Antônia Ribeiro', 'Francisco Almeida', 'Luciana Ferreira', 'Paulo Henrique Lima', 'Sebastiana Rocha', 'Ricardo Gomes', 'Helena Martins', 'Adriana Barbosa', 'Joaquim Teixeira', 'Fernanda Castro', 'Rosângela Dias', 'Marcelo Pinto'];
  const clientes = nomes.map((nome, i) => ({ id: `c${i}`, nome, cpf: `${String(100 + i * 37).padStart(3, '0')}.${String(200 + i * 13).slice(0, 3)}.${String(300 + i * 7).slice(0, 3)}-${String(10 + i).slice(-2)}`, nascimento: `19${45 + i * 3}-${String(1 + (i % 12)).padStart(2, '0')}-${String(3 + i).padStart(2, '0')}`, telefone: `(16) 9${8100 + i * 37}-${2300 + i * 41}`, convenio: i % 5 === 1 ? 'cv0' : i % 7 === 3 ? 'cv1' : '', limite: i % 4 === 0 ? 300 : 0, endereco: `${['Rua Amador Bueno', 'Av. Nove de Julho', 'Rua São Sebastião', 'Rua Duque de Caxias'][i % 4]}, ${100 + i * 23} · ${['Centro', 'Jardim Sumaré', 'Vila Tibério', 'Campos Elíseos'][i % 4]}` }));
  const prescritores = [['Dr. Henrique Salles', 'CRM', '123456', 'SP'], ['Dra. Beatriz Nogueira', 'CRM', '98765', 'SP'], ['Dr. Otávio Prado', 'CRM', '45127', 'SP'], ['Dra. Camila Reis', 'CRO', '77310', 'SP']];
  const vendas = [], movimentos = [], receitas = [];
  const continuo = { c0: ['p0', 'p2'], c1: ['p3'], c2: ['p12'], c4: ['p0'], c6: ['p9'], c8: ['p14'], c10: ['p2', 'p4'] };
  let nv = 52000, nf = 31800, nr = 1;
  for (let d = -62; d <= 0; d++) {
    const data = diaMais(d), dow = paraData(data).getDay(); const qtd = dow === 0 ? ent(3, 6) : dow === 6 ? ent(8, 12) : ent(9, 16);
    for (let k = 0; k < qtd; k++) {
      const cl = r() < 0.45 ? esc1(clientes) : null; let itens = [];
      const nIt = ent(1, 3);
      for (let j = 0; j < nIt; j++) { const p = esc1(r() < 0.06 ? produtos.filter((x) => x.controle) : produtos.filter((x) => !x.controle)); if (!itens.some((x) => x.produto === p.id)) itens.push({ produto: p.id, qtd: p.controle ? 1 : ent(1, 2), preco: p.preco, custo: p.custo, lotes: [{ lote: p.lotes[0].lote, qtd: 1 }] }); }
      // uso contínuo: compra todo mês
      if (cl && continuo[cl.id] && r() < 0.18) continuo[cl.id].forEach((pid) => { const p = produtos.find((x) => x.id === pid); if (!itens.some((x) => x.produto === pid)) itens.push({ produto: pid, qtd: 1, preco: p.preco, custo: p.custo, lotes: [{ lote: p.lotes[0].lote, qtd: 1 }] }); });
      itens.forEach((x) => { x.lotes[0].qtd = x.qtd; });
      const conv = cl?.convenio ? clientes.find((c) => c.id === cl.id).convenio : '';
      const pagamento = conv && r() < 0.7 ? 'convenio' : cl?.limite && r() < 0.3 ? 'crediario' : esc1(['pix', 'pix', 'credito', 'debito', 'dinheiro', 'credito']);
      const sub = soma(itens, (x) => x.qtd * x.preco), desconto = pagamento === 'convenio' ? Math.round(sub * (convenios.find((c) => c.id === conv).desconto / 100) * 100) / 100 : 0;
      const hora = `${String(ent(8, 20)).padStart(2, '0')}:${String(ent(0, 59)).padStart(2, '0')}`;
      const v = { id: `v${vendas.length}`, numero: nv++, data, hora, cliente: cl?.id || null, atendente: esc1(ATEND)[0], itens, desconto, pagamento, convenio: pagamento === 'convenio' ? conv : '', status: 'concluida', pago: !['convenio', 'crediario'].includes(pagamento) || d < -35,
        nfce: { numero: nf++, emissao: data } };
      if (r() < 0.07 && cl) v.entrega = { endereco: cl.endereco, taxa: 5, status: d < 0 ? 'entregue' : esc1(['separando', 'saiu']), entregador: 'Moto 1' };
      itens.forEach((x) => { const p = produtos.find((y) => y.id === x.produto); if (!p.controle) return;
        const [pn, cons, reg, uf] = esc1(prescritores), pac = cl?.nome || esc1(nomes);
        const rc = { id: `r${receitas.length}`, numero: nr++, data, venda: v.id, tipo: infoCtrl(p.controle)[1], controle: p.controle, notificacao: pedeNotificacao(p.controle) ? `SP${ent(1000000, 9999999)}` : '', data_prescricao: diaMais(-ent(0, CONTROLE[p.controle][2] - 1), data), prescritor: pn, conselho: cons, registro: reg, uf, paciente: pac, comprador: pac, comprador_doc: `${ent(10, 59)}.${ent(100, 999)}.${ent(100, 999)}-${ent(0, 9)}`, comprador_tel: cl?.telefone || '', comprador_end: cl?.endereco || 'Rua Visconde de Inhaúma, 40 · Centro', itens: [{ produto: p.id, lote: x.lotes[0].lote, qtd: x.qtd }] };
        receitas.push(rc); x.receita = rc.id;
        movimentos.push({ id: `m${movimentos.length}`, produto: p.id, lote: x.lotes[0].lote, tipo: 'saida', qtd: x.qtd, motivo: `Venda ${v.numero} · receita ${rc.numero}`, data: `${data}T${hora}`, receita: rc.id });
      });
      vendas.push(v);
    }
  }
  // entradas por nota do fornecedor (os controlados entram no livro com lote)
  const compras = []; let nc = 610;
  for (let i = 0; i < 18; i++) {
    const f = fornecedores[i % fornecedores.length], d = -ent(2, 70);
    const ps = produtos.filter((p) => p.fornecedor === f.id).slice(0, ent(3, 6));
    const st = d < -10 ? 'recebido' : esc1(['enviado', 'enviado', 'rascunho']);
    const itens = ps.map((p) => ({ produto: p.id, qtd: p.giro * ent(10, 20), custo: p.custo, recebido: st === 'recebido' ? p.giro * 10 : 0 }));
    itens.forEach((x) => { if (st === 'recebido') x.recebido = x.qtd; });
    if (itens.length) compras.push({ id: `oc${i}`, numero: nc++, fornecedor: f.id, data: diaMais(d), previsao: diaMais(d + f.prazo), status: st, itens, frete: 0, nf: st === 'recebido' ? String(ent(100000, 999999)) : '' });
  }
  compras.filter((c) => c.status === 'recebido').forEach((c) => c.itens.forEach((x) => { const p = produtos.find((y) => y.id === x.produto);
    movimentos.push({ id: `m${movimentos.length}`, produto: x.produto, lote: p.lotes[p.lotes.length - 1].lote, tipo: 'entrada', qtd: x.recebido, motivo: `NF-e ${c.nf} · ${fornecedores.find((f) => f.id === c.fornecedor).nome}`, data: `${c.previsao}T10:00`, custo: x.custo }); }));
  movimentos.push({ id: `m${movimentos.length}`, produto: 'p15', lote: produtos[15].lotes[0].lote, tipo: 'ajuste', qtd: -1, motivo: 'Perda: frasco quebrado (registrado no livro)', data: `${diaMais(-9)}T15:00` });
  // cotações de 2 a 3 distribuidoras por produto
  const r2 = sorteio(91), cotacoes = [];
  produtos.forEach((p) => { [p.fornecedor, ...['f0', 'f1', 'f2'].filter((x) => x !== p.fornecedor).slice(0, 1 + Math.floor(r2() * 2))].forEach((fid, k) => { const f = fornecedores.find((x) => x.id === fid);
    cotacoes.push({ id: `q${cotacoes.length}`, produto: p.id, fornecedor: fid, preco: Math.round(p.custo * (k ? 0.88 + r2() * 0.2 : 1) * 100) / 100, prazo: Math.max(1, f.prazo + Math.floor(r2() * 3) - 1), minimo: [1, 5, 10][Math.floor(r2() * 3)], atualizado: diaMais(-Math.floor(r2() * 30)) }); }); });
  // serviços farmacêuticos e temperatura da geladeira
  const servicos = Array.from({ length: 34 }, (_, i) => { const t = esc1(SERVICOS.slice(0, 5)), c = esc1(clientes);
    return { id: `s${i}`, data: diaMais(-ent(0, 40)), hora: `${String(ent(8, 19)).padStart(2, '0')}:${String(ent(0, 5))}0`, tipo: t, cliente: c.id, resultado: t.startsWith('Aferição') ? `${ent(11, 16)}x${ent(7, 10)} mmHg` : t === 'Glicemia capilar' ? `${ent(78, 190)} mg/dL` : t === 'Medição de temperatura' ? `${(36 + r() * 2).toFixed(1).replace('.', ',')} °C` : 'Realizado sem intercorrências', valor: t.startsWith('Aferição') ? 0 : t === 'Glicemia capilar' ? 8 : t === 'Aplicação de injetável' ? 10 : t.startsWith('Perfuração') ? 35 : 0, farmaceutico: 'ana' }; });
  const temperaturas = []; for (let d = -20; d <= 0; d++) ['08:00', '17:30'].forEach((h, k) => { const min = 2.4 + r() * 1.6, max = min + 1 + r() * 2.6 + (d === -6 && k ? 3.4 : 0); temperaturas.push({ id: `t${temperaturas.length}`, data: diaMais(d), hora: h, atual: Math.round((min + (max - min) * 0.4) * 10) / 10, minima: Math.round(min * 10) / 10, maxima: Math.round(max * 10) / 10, responsavel: esc1(ATEND)[0] }); });
  return { _cfg: { empresa: 'Drogaria Bem Viver', endereco: 'Rua General Osório, 812 · Centro · Ribeirão Preto/SP', cnpj: '41.520.630/0001-32', telefone: '(16) 3610-4400', farmaceutico: 'Ana Paula Moreira', crf: 'CRF-SP 54.321', afe: '1.12345.6', licenca: 'Licença sanitária 2026/0417' },
    produtos, fornecedores, clientes, convenios, vendas, compras, movimentos, cotacoes, receitas, servicos, temperaturas };
}

// ---------------------------------------------------------------- regras
const prod = (a, id) => a.db.obter('produtos', id);
const cli = (a, id) => a.db.obter('clientes', id);
const forn = (a, id) => a.db.obter('fornecedores', id);
const conv = (a, id) => a.db.obter('convenios', id);
const estTotal = (p) => soma(p?.lotes || [], (l) => l.qtd);
const vendavel = (p) => soma((p?.lotes || []).filter((l) => l.validade >= hoje()), (l) => l.qtd);
const lotesFEFO = (p) => (p.lotes || []).filter((l) => l.qtd > 0 && l.validade >= hoje()).sort((x, y) => x.validade.localeCompare(y.validade));
const proxValidade = (p) => lotesFEFO(p)[0]?.validade || null;
const ehMedicamento = (p) => /^300[34]/.test(String(p.ncm || '').replace(/\D/g, ''));
const totalV = (v) => soma(v.itens, (x) => x.qtd * x.preco) - (v.desconto || 0) + (v.entrega?.taxa || 0);
const custoV = (v) => soma(v.itens, (x) => x.qtd * (x.custo || 0));
const validas = (a) => a.db.lista('vendas').filter((v) => v.status !== 'cancelada');
const totalC = (c) => soma(c.itens, (x) => x.qtd * x.custo) + (c.frete || 0);
const vendidoQtd = (a, pid, dias = 30) => soma(validas(a).filter((v) => diasAte(v.data) > -dias).flatMap((v) => v.itens).filter((x) => x.produto === pid), (x) => x.qtd);
const cobertura = (a, p) => { const dia = vendidoQtd(a, p.id, 30) / 30; return dia ? Math.floor(estTotal(p) / dia) : 999; };
const situacaoEst = (p) => (vendavel(p) <= 0 ? ['Sem estoque', 'er'] : vendavel(p) <= p.minimo ? ['Abaixo do mínimo', 'al'] : ['Normal', 'ok']);
const faixaVal = (s) => { const d = diasAte(s); return d < 0 ? ['Vencido', 'er'] : d <= 30 ? [`Vence em ${d} dias`, 'er'] : d <= 90 ? [`Vence em ${d} dias`, 'al'] : [dataBR(s).slice(3), '']; };
const nomeCurto = (p) => p?.nome || '—';
function ranking(a, pid) {
  const cs = a.db.lista('cotacoes').filter((c) => c.produto === pid); if (!cs.length) return [];
  const pmin = Math.min(...cs.map((c) => c.preco)), zmin = Math.min(...cs.map((c) => c.prazo));
  return cs.map((c) => { const f = forn(a, c.fornecedor); return { ...c, f, nota: Math.round(50 * (pmin / c.preco) + 25 * (zmin / Math.max(1, c.prazo)) + 25 * (f?.pontualidade || 0.85)) }; }).sort((x, y) => y.nota - x.nota);
}
const melhorForn = (a, pid) => ranking(a, pid)[0] || null;
const cotacaoAtual = (a, p) => a.db.lista('cotacoes').find((c) => c.produto === p.id && c.fornecedor === p.fornecedor);
// opções com o mesmo princípio ativo e a mesma apresentação (intercambiáveis), mais baratas
const equivalentes = (a, p) => (!p.principio ? [] : a.db.lista('produtos').filter((x) => x.id !== p.id && normal(x.principio) === normal(p.principio) && normal(x.apresentacao) === normal(p.apresentacao) && vendavel(x) > 0).sort((x, y) => x.preco - y.preco));

/** Movimenta o estoque por lote. Saída sem lote escolhido segue o FEFO (vence primeiro, sai primeiro). Devolve os lotes usados. */
function movimentar(a, { produto, lote, qtd, tipo, motivo, custo, validade, fab, receita }) {
  const p = prod(a, produto), lotes = (p.lotes || []).map((l) => ({ ...l })), usados = [];
  if (tipo === 'entrada') {
    const l = lotes.find((x) => x.lote === lote); if (l) l.qtd += qtd; else lotes.push({ lote: lote || `S/L-${hoje().replace(/-/g, '')}`, validade: validade || diaMais(365), fab: fab || hoje(), qtd });
    usados.push({ lote: lote || lotes[lotes.length - 1].lote, qtd });
  } else if (tipo === 'saida') {
    let resta = qtd; const fila = lote ? lotes.filter((x) => x.lote === lote) : lotes.filter((x) => x.qtd > 0 && x.validade >= hoje()).sort((x, y) => x.validade.localeCompare(y.validade));
    for (const l of fila) { if (resta <= 0) break; const t = Math.min(l.qtd, resta); if (t <= 0) continue; l.qtd -= t; resta -= t; usados.push({ lote: l.lote, qtd: t }); }
    if (resta > 0) { const l = fila[0] || lotes[0]; if (l) { l.qtd -= resta; usados.push({ lote: l.lote, qtd: resta }); } }
  } else { const l = lotes.find((x) => x.lote === lote) || lotes[0]; if (l) { l.qtd += qtd; usados.push({ lote: l.lote, qtd }); } }
  const est = estTotal(p);
  a.db.salvar('produtos', { id: produto, lotes: lotes.filter((l) => l.qtd !== 0 || l.validade >= diaMais(-60)), ...(custo && tipo === 'entrada' ? { custo: Math.round((((p.custo * Math.max(0, est)) + custo * qtd) / Math.max(1, est + qtd)) * 100) / 100 } : {}) });
  usados.forEach((u) => a.db.lista('movimentos').unshift({ id: `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`, produto, lote: u.lote, tipo, qtd: tipo === 'ajuste' ? u.qtd : Math.abs(u.qtd), motivo, data: agoraISO(), custo, receita }));
  a.db.gravar();
  return usados;
}
function curvaABC(a, dias = 90) {
  const rec = a.db.lista('produtos').map((p) => ({ p, v: soma(validas(a).filter((v) => diasAte(v.data) > -dias).flatMap((v) => v.itens).filter((x) => x.produto === p.id), (x) => x.qtd * x.preco) })).sort((x, y) => y.v - x.v);
  const tot = soma(rec, (x) => x.v) || 1; let acc = 0;
  return rec.map((x) => { acc += x.v; const pc = (acc / tot) * 100; return { ...x, part: (x.v / tot) * 100, acc: pc, classe: pc <= 80 ? 'A' : pc <= 95 ? 'B' : 'C' }; });
}
// uso contínuo: quando o cliente deve voltar, pela última compra e pela duração da caixa
function recompras(a) {
  const out = [], ult = {};
  validas(a).filter((v) => v.cliente).forEach((v) => v.itens.forEach((x) => { const p = prod(a, x.produto); if (!p?.dias_caixa) return; const k = `${v.cliente}|${x.produto}`; if (!ult[k] || ult[k].data < v.data) ult[k] = { data: v.data, qtd: x.qtd }; }));
  Object.entries(ult).forEach(([k, u]) => { const [c, pid] = k.split('|'), p = prod(a, pid), quando = diaMais(p.dias_caixa * u.qtd, u.data), d = diasAte(quando); if (d <= 7 && d >= -30) out.push({ id: k, cliente: c, produto: pid, ultima: u.data, quando, dias: d }); });
  return out.sort((x, y) => x.quando.localeCompare(y.quando));
}
const receitaVencida = (p, dataPresc) => diasAte(diaMais(infoCtrl(p.controle)[2], dataPresc)) < 0;
// a receber: convênios (fechamento mensal), crediário do cliente e Farmácia Popular
const emAberto = (a) => validas(a).filter((v) => ['convenio', 'crediario', 'farmpop'].includes(v.pagamento) && !v.pago);

// ---------------------------------------------------------------- coleções
const colecoes = {
  produtos: { singular: 'produto', plural: 'produtos', largura: 760, tres: true, campos: [
    { nome: 'nome', rotulo: 'Descrição (como sai no cupom)', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'principio', rotulo: 'Princípio ativo (DCB)', tipo: 'texto', ajuda: 'Usado para achar genéricos e similares' }, { nome: 'apresentacao', rotulo: 'Apresentação', tipo: 'texto', dica: 'Ex.: 50 mg · 30 comprimidos' },
    { nome: 'laboratorio', rotulo: 'Laboratório / fabricante', tipo: 'texto' }, { nome: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: TIPOS, padrao: 'Genérico' }, { nome: 'tarja', rotulo: 'Tarja', tipo: 'selecao', opcoes: TARJAS, padrao: 'Sem tarja' },
    { nome: 'controle', rotulo: 'Controle (Portaria 344 / antimicrobiano)', tipo: 'selecao', livre: true, dica: 'Em branco se não for controlado', opcoes: [['', 'Não é controlado'], ...Object.entries(CONTROLE).map(([k, v]) => [k, v[0]])], ajuda: 'Escolha a lista ou escreva. Controlados só saem no caixa com a receita registrada' },
    { nome: 'categoria', rotulo: 'Categoria', tipo: 'selecao', livre: true, opcoes: (a) => cats(a), obrigatorio: true }, { nome: 'registro_ms', rotulo: 'Registro na Anvisa (13 dígitos)', tipo: 'texto', ajuda: 'Vai no cupom fiscal de medicamentos' }, { nome: 'ean', rotulo: 'Código de barras (EAN-13)', tipo: 'texto', ajuda: 'Em branco: gera um código interno' },
    { nome: 'sku', rotulo: 'Código interno', tipo: 'texto', obrigatorio: true }, { nome: 'fornecedor', rotulo: 'Distribuidora', tipo: 'relacao', colecao: 'fornecedores' }, { nome: 'custo', rotulo: 'Custo', tipo: 'moeda', obrigatorio: true },
    { nome: 'preco', rotulo: 'Preço de venda', tipo: 'moeda', obrigatorio: true }, { nome: 'pmc', rotulo: 'PMC (preço máximo da CMED)', tipo: 'moeda', ajuda: 'O sistema não deixa vender acima' }, { nome: 'minimo', rotulo: 'Estoque mínimo', tipo: 'numero', padrao: 5 },
    { nome: 'dias_caixa', rotulo: 'Uso contínuo: a caixa dura (dias)', tipo: 'numero', padrao: 0, ajuda: '0 se não for de uso contínuo' }, { nome: 'localizacao', rotulo: 'Localização', tipo: 'texto', dica: 'Ex.: B-03 ou ARM-01' }, { nome: 'termolabil', rotulo: 'Termolábil (geladeira)', tipo: 'booleano', texto: 'Guardar entre 2 e 8 °C' },
    { nome: 'ncm', rotulo: 'NCM', tipo: 'texto', dica: '8 dígitos', ajuda: 'Medicamentos: 3003 ou 3004' }, { nome: 'cfop', rotulo: 'CFOP', tipo: 'texto', padrao: '5102' }, { nome: 'csosn', rotulo: 'CSOSN (Simples)', tipo: 'selecao', opcoes: [['102', '102 · sem ST'], ['500', '500 · ICMS já retido (ST)']], padrao: '102', ajuda: 'Confirme com o seu contador' }],
    validar: (d) => (d.preco < d.custo ? 'O preço de venda está abaixo do custo' : d.pmc && d.preco > d.pmc ? `O preço passa do PMC da CMED (${moeda(d.pmc)}): a lei não permite vender acima` : d.ean && !eanValido(d.ean) ? 'Código de barras inválido: confira os 13 dígitos' : d.registro_ms && !/^\d{9}$|^\d{11}$|^\d{13}$/.test(String(d.registro_ms).replace(/\D/g, '')) ? 'Registro na Anvisa: use 13 dígitos (ou 9 ou 11)' : null),
    antesDeSalvar: (d, a, antes) => ({ ...d, ean: d.ean || comDigito(`200${String(Date.now()).slice(-9)}`), lotes: antes?.lotes || [], giro: antes?.giro || 1 }) },
  clientes: { singular: 'cliente', plural: 'clientes', campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'cpf', rotulo: 'CPF', tipo: 'texto' }, { nome: 'nascimento', rotulo: 'Nascimento', tipo: 'data' }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel' },
    { nome: 'convenio', rotulo: 'Convênio da empresa', tipo: 'relacao', colecao: 'convenios' }, { nome: 'limite', rotulo: 'Limite do crediário', tipo: 'moeda', ajuda: '0 = não compra no crediário' }, { nome: 'endereco', rotulo: 'Endereço para entrega', tipo: 'texto', largo: true }, { nome: 'obs', rotulo: 'Observações (alergias, preferências)', tipo: 'texto-longo' }] },
  convenios: { singular: 'convênio', plural: 'convênios', campos: [{ nome: 'nome', rotulo: 'Empresa conveniada', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'desconto', rotulo: 'Desconto (%)', tipo: 'porcentagem', padrao: 10 }, { nome: 'dia_fechamento', rotulo: 'Dia do fechamento', tipo: 'numero', padrao: 5 }, { nome: 'limite', rotulo: 'Limite por pessoa no mês', tipo: 'moeda' }, { nome: 'contato', rotulo: 'Contato', tipo: 'texto' }, { nome: 'telefone', rotulo: 'Telefone', tipo: 'tel' }] },
  fornecedores: { singular: 'distribuidora', genero: 'f', plural: 'distribuidoras', campos: [{ nome: 'nome', rotulo: 'Razão social', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'doc', rotulo: 'CNPJ', tipo: 'texto' }, { nome: 'telefone', rotulo: 'Telefone', tipo: 'tel' }, { nome: 'contato', rotulo: 'Representante', tipo: 'texto' }, { nome: 'prazo', rotulo: 'Prazo de entrega (dias)', tipo: 'numero', padrao: 1 }] },
  cotacoes: { singular: 'cotação', genero: 'f', plural: 'cotações', campos: [{ nome: 'produto', rotulo: 'Produto', tipo: 'relacao', colecao: 'produtos', obrigatorio: true }, { nome: 'fornecedor', rotulo: 'Distribuidora', tipo: 'relacao', colecao: 'fornecedores', obrigatorio: true }, { nome: 'preco', rotulo: 'Preço unitário', tipo: 'moeda', obrigatorio: true }, { nome: 'prazo', rotulo: 'Prazo (dias)', tipo: 'numero', padrao: 1 }, { nome: 'minimo', rotulo: 'Pedido mínimo (un.)', tipo: 'numero', padrao: 1 }], antesDeSalvar: (d) => ({ ...d, atualizado: hoje() }) },
  servicos: { singular: 'atendimento', plural: 'atendimentos', campos: [{ nome: 'tipo', rotulo: 'Serviço', tipo: 'selecao', opcoes: SERVICOS, obrigatorio: true }, { nome: 'cliente', rotulo: 'Paciente', tipo: 'relacao', colecao: 'clientes', obrigatorio: true }, { nome: 'data', rotulo: 'Data', tipo: 'data', padrao: () => hoje() }, { nome: 'hora', rotulo: 'Hora', tipo: 'hora', padrao: () => agoraISO().slice(11, 16) },
    { nome: 'resultado', rotulo: 'Resultado', tipo: 'texto', dica: 'Ex.: 12x8 mmHg, 98 mg/dL', largo: true }, { nome: 'valor', rotulo: 'Valor cobrado', tipo: 'moeda', padrao: 0 }, { nome: 'farmaceutico', rotulo: 'Responsável', tipo: 'selecao', opcoes: () => ATEND.map((x) => [x[0], x[1]]) }, { nome: 'obs', rotulo: 'Orientação dada', tipo: 'texto-longo' }] },
  temperaturas: { singular: 'leitura', genero: 'f', plural: 'leituras', campos: [{ nome: 'data', rotulo: 'Data', tipo: 'data', padrao: () => hoje() }, { nome: 'hora', rotulo: 'Hora', tipo: 'hora', padrao: () => agoraISO().slice(11, 16) }, { nome: 'atual', rotulo: 'Temperatura agora (°C)', tipo: 'numero', obrigatorio: true }, { nome: 'minima', rotulo: 'Mínima (°C)', tipo: 'numero' }, { nome: 'maxima', rotulo: 'Máxima (°C)', tipo: 'numero' }, { nome: 'responsavel', rotulo: 'Responsável', tipo: 'selecao', opcoes: () => ATEND.map((x) => [x[0], x[1]]) }, { nome: 'acao', rotulo: 'Se saiu da faixa: o que foi feito', tipo: 'texto-longo' }] },
};

// ---------------------------------------------------------------- páginas
function painel(a) {
  const ym = hoje().slice(0, 7), vs = validas(a), mes = vs.filter((v) => v.data.startsWith(ym)), dia = vs.filter((v) => v.data === hoje());
  const vMes = soma(mes, totalV), marg = vMes ? ((vMes - soma(mes, custoV)) / vMes) * 100 : 0;
  const ps = a.db.lista('produtos'), lotes = ps.flatMap((p) => (p.lotes || []).filter((l) => l.qtd > 0).map((l) => ({ p, l })));
  const vencidos = lotes.filter((x) => x.l.validade < hoje()), em90 = lotes.filter((x) => x.l.validade >= hoje() && diasAte(x.l.validade) <= 90);
  const repor = ps.filter((p) => vendavel(p) <= p.minimo), rec = recompras(a), acimaPMC = ps.filter((p) => p.pmc && p.preco > p.pmc);
  const temps = a.db.lista('temperaturas').filter((t) => diasAte(t.data) >= -7), fora = temps.filter((t) => Number(t.maxima ?? t.atual) > 8 || Number(t.minima ?? t.atual) < 2);
  const dias = Array.from({ length: 30 }, (_, i) => diaMais(i - 29));
  const top = ps.map((p) => ({ p, v: soma(mes.flatMap((v) => v.itens).filter((x) => x.produto === p.id), (x) => x.qtd * x.preco) })).sort((x, y) => y.v - x.v).slice(0, 6);
  const alertas = [vencidos.length && [`${vencidos.length} lote${vencidos.length > 1 ? 's' : ''} vencido${vencidos.length > 1 ? 's' : ''} no estoque`, 'Separe da área de venda e dê baixa.', '#/validade', 'er'], fora.length && [`Geladeira fora de 2 a 8 °C em ${fora.length} leitura${fora.length > 1 ? 's' : ''} nos últimos 7 dias`, 'Confira os termolábeis e registre o que foi feito.', '#/geladeira', 'er'],
    acimaPMC.length && [`${acimaPMC.length} produto${acimaPMC.length > 1 ? 's' : ''} com preço acima do PMC`, 'Ajuste o preço: vender acima do PMC da CMED é proibido.', '#/produtos', 'er'], em90.length && [`${em90.length} lote${em90.length > 1 ? 's' : ''} vencendo em até 90 dias (${moeda(soma(em90, (x) => x.l.qtd * x.p.custo))} a custo)`, 'Coloque na frente da prateleira, faça promoção ou troque com a distribuidora.', '#/validade', 'al']].filter(Boolean);
  return `${a.cartaoAlertas ? a.cartaoAlertas() : ''}${kpis([
    { rot: 'Vendas hoje', icone: 'cash-register', val: moeda(soma(dia, totalV)), nota: `${dia.length} cupons · ticket ${moeda(soma(dia, totalV) / (dia.length || 1))}` },
    { rot: 'Vendas no mês', icone: 'shopping-cart', val: moeda(vMes), nota: `margem bruta ${pct(marg, 1)}`, spark: dias.map((d) => soma(vs.filter((v) => v.data === d), totalV)) },
    { rot: 'Validade', icone: 'calendar-x', val: num(vencidos.length + em90.length), alerta: vencidos.length > 0, nota: `${vencidos.length} vencidos · ${em90.length} em 90 dias` },
    { rot: 'Para repor', icone: 'warning', val: num(repor.length), alerta: repor.some((p) => vendavel(p) <= 0), nota: `${repor.filter((p) => vendavel(p) <= 0).length} sem estoque` },
  ])}
  ${alertas.length ? `<div class="cartao"><div class="cartao-cab"><div><h3>Atenção hoje</h3><div class="sub">O que a vigilância sanitária e o caixa cobram</div></div></div><ul class="lista">${alertas.map(([t, s, h, tom]) => `<li><a class="flex cresce" href="${h}" style="color:inherit;text-decoration:none;gap:10px"><span class="av p" style="background:var(--${tom})">${ic('warning', 'p')}</span><span class="cresce"><span class="t" style="display:block">${esc(t)}</span><span class="s" style="display:block">${esc(s)}</span></span>${ic('caret-right')}</a></li>`).join('')}</ul></div>` : ''}
  <div class="grade g21"><div class="cartao"><div class="cartao-cab"><div><h3>Vendas · últimos 30 dias</h3><div class="sub">Por forma de pagamento</div></div><a class="btn peq" href="#/relatorios">Relatórios</a></div><div class="cartao-corpo">${barras({ dados: dias.map((d) => ({ rot: String(Number(d.slice(8))), v: [['pix', 'dinheiro'], ['credito', 'debito'], ['convenio', 'crediario', 'farmpop']].map((g) => soma(vs.filter((v) => v.data === d && g.includes(v.pagamento)), totalV)) })), series: [{ nome: 'PIX e dinheiro', cor: '#0f766e' }, { nome: 'Cartão', cor: '#0ea5e9' }, { nome: 'Convênio e crediário', cor: '#f59e0b' }], empilhado: true, fmt: moedaC, altura: 220 })}</div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Uso contínuo</h3><div class="sub">${rec.length} clientes para voltar nesta semana</div></div><a class="btn peq" href="#/continuo">Ver todos</a></div>${rec.length ? `<ul class="lista">${rec.slice(0, 7).map((x) => `<li class="clicavel" data-abrir="cliente:${x.cliente}">${av(cli(a, x.cliente)?.nome || '?', 'p')}<div class="cresce"><div class="t corta">${esc(cli(a, x.cliente)?.nome || '')}</div><div class="s corta">${esc(nomeCurto(prod(a, x.produto)))}</div></div>${et(x.dias < 0 ? `${-x.dias} dias atrasado` : x.dias === 0 ? 'hoje' : `em ${x.dias} dias`, x.dias < 0 ? 'er' : 'al')}</li>`).join('')}</ul>` : vazio('check-circle', 'Ninguém para lembrar agora')}</div></div>
  <div class="grade g3"><div class="cartao"><div class="cartao-cab"><div><h3>Mais vendidos no mês</h3></div></div><div class="cartao-corpo">${barrasH(top.map(({ p, v }) => ({ rot: p.nome, v })), { fmt: moedaC })}</div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Receitas retidas no mês</h3><div class="sub">Livro de controlados em dia</div></div><a class="btn peq" href="#/receitas">Receitas</a></div><div class="cartao-corpo">${rosca({ itens: Object.entries(agrupar(a.db.lista('receitas').filter((r) => r.data.startsWith(ym)), (r) => (r.controle === 'ATM' ? 'Antimicrobianos' : r.controle[0] === 'C' ? 'Controle especial (C)' : `Notificação ${r.controle[0]}`))).map(([k, l], i) => ({ rot: k, v: l.length, cor: ['#be123c', '#f59e0b', '#0ea5e9', '#a855f7'][i % 4] })), centro: String(a.db.lista('receitas').filter((r) => r.data.startsWith(ym)).length), fmt: num })}</div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Repor estoque</h3><div class="sub">Sem estoque ou abaixo do mínimo</div></div><a class="btn peq" href="#/sugestao">Sugestão de compra</a></div>${repor.length ? `<ul class="lista">${repor.slice(0, 6).map((p) => `<li class="clicavel" data-abrir="produto:${p.id}"><div class="cresce"><div class="t corta">${esc(p.nome)}</div><div class="s">${esc(p.laboratorio || '')}</div></div>${et(`${vendavel(p)} un`, vendavel(p) <= 0 ? 'er' : 'al')}</li>`).join('')}</ul>` : vazio('check-circle', 'Estoque em dia')}</div></div>`;
}

function pdv(a) {
  const st = a.estado.pdv ||= { itens: [], desc: 0, pag: 'pix', cliente: '', cpf: '', autorizacao: '', entrega: false };
  const tb = a.estado['tab:pdvbusca'] ||= { busca: '', pagina: 0, filtros: {}, sel: [] };
  const q = normal(tb.busca);
  const ps = a.db.lista('produtos').filter((p) => !q || normal(`${p.nome} ${p.principio} ${p.sku} ${p.ean} ${p.laboratorio}`).includes(q)).sort((x, y) => (vendavel(y) > 0) - (vendavel(x) > 0) || x.preco - y.preco).slice(0, 24);
  const c = st.cliente ? cli(a, st.cliente) : null, cv = c?.convenio ? conv(a, c.convenio) : null;
  const sub = soma(st.itens, (x) => x.qtd * x.preco), descConv = st.pag === 'convenio' && cv ? Math.round(sub * (cv.desconto / 100) * 100) / 100 : 0, tot = Math.max(0, sub - st.desc - descConv);
  const sugest = st.itens.map((x) => { const p = prod(a, x.produto), e = equivalentes(a, p).filter((y) => y.preco < x.preco)[0]; return e ? { x, p, e } : null; }).filter(Boolean);
  const pedeReceita = st.itens.filter((x) => prod(a, x.produto).controle);
  return `<div class="pdv"><div class="col" style="gap:12px"><div class="cartao"><div class="cartao-corpo flex"><label class="caixa-busca cresce">${ic('barcode')}<input type="search" placeholder="Leia o código de barras ou digite o nome, o princípio ativo ou o laboratório" value="${esc(tb.busca)}" data-tab-busca="pdvbusca" data-pdv-busca autofocus style="height:40px;font-size:15px"></label></div></div>
      ${sugest.length ? `<div class="dica">${ic('lightning')}<span>${sugest.map(({ p, e }) => `<b>${esc(p.nome)}</b>: tem ${esc(e.tipo.toLowerCase())} com o mesmo princípio ativo por <b>${moeda(e.preco)}</b> (${esc(e.laboratorio)}). <a href="javascript:void 0" data-acao="pdvTrocar" data-de="${p.id}" data-para="${e.id}">Trocar</a>`).join('<br>')}</span></div>` : ''}
      <div class="prod-grade">${ps.map((p) => { const v = vendavel(p); return `<button type="button" class="prod-bt" data-acao="pdvAdd" data-id="${p.id}" ${v <= 0 ? 'style="opacity:.5"' : ''}><b>${esc(p.nome)}</b><span class="mono">${esc(p.laboratorio || p.sku)} · ${v} un${p.controle ? ` · ${p.controle === 'ATM' ? 'antimicrobiano' : p.controle}` : ''}</span><span class="pr">${moeda(p.preco)}</span></button>`; }).join('') || vazio('magnifying-glass', 'Nenhum produto encontrado')}</div></div>
    <div class="cartao carrinho"><div class="cartao-cab"><div><h3>Venda no balcão</h3><div class="sub">O lote que vence primeiro sai primeiro</div></div>${st.itens.length ? `<button type="button" class="btn fant peq" data-acao="pdvLimpar">${ic('trash')}Limpar</button>` : ''}</div>
      ${st.itens.length ? st.itens.map((x, i) => { const p = prod(a, x.produto); return `<div class="item"><div class="corta"><div style="font-weight:500" class="corta">${esc(p.nome)}</div><div class="mute" style="font-size:12px">${moeda(x.preco)} · lote ${esc(lotesFEFO(p)[0]?.lote || '—')}${p.controle ? ` · ${ic('prescription')} receita` : ''}</div></div><div class="qtd"><button type="button" data-acao="pdvQtd" data-i="${i}" data-d="-1" aria-label="Menos">−</button><span>${x.qtd}</span><button type="button" data-acao="pdvQtd" data-i="${i}" data-d="1" aria-label="Mais">+</button></div><b class="num" style="min-width:80px;text-align:right">${moeda(x.qtd * x.preco)}</b></div>`; }).join('') : `<div style="padding:16px">${vazio('barcode', 'Nenhum item', 'Leia um código de barras ou toque nos produtos.')}</div>`}
      <div class="cartao-corpo col" style="gap:10px;border-top:1px solid var(--borda)">
        <label class="campo">Cliente (opcional: convênio, crediário, uso contínuo)<select data-mudar="pdvCliente"><option value="">Consumidor</option>${a.db.lista('clientes').sort((x, y) => x.nome.localeCompare(y.nome)).map((x) => `<option value="${x.id}" ${x.id === st.cliente ? 'selected' : ''}>${esc(x.nome)}${x.convenio ? ` · ${esc(conv(a, x.convenio)?.nome || '')}` : ''}</option>`).join('')}</select></label>
        ${!c ? `<label class="campo">CPF na nota (opcional)<input value="${esc(st.cpf)}" data-mudar="pdvCpf" inputmode="numeric" placeholder="000.000.000-00"></label>` : ''}
        <div class="entre"><span class="mute-2">Subtotal (${soma(st.itens, (x) => x.qtd)} itens)</span><span class="num">${moeda(sub)}</span></div>
        <div class="entre"><span class="mute-2">Desconto</span><div class="prefixo" style="width:130px"><span>R$</span><input type="number" min="0" step="0.5" value="${st.desc}" data-mudar="pdvDesc" style="height:28px;text-align:right"></div></div>
        ${descConv ? `<div class="entre"><span class="mute-2">Convênio ${esc(cv.nome)} (${cv.desconto}%)</span><span class="num ok-tx">−${moeda(descConv)}</span></div>` : ''}
        <div class="entre"><b>Total</b><span class="total-grande">${moeda(tot)}</span></div>
        <div class="pagamentos">${Object.entries(PAG).filter(([k]) => (k !== 'convenio' || cv) && (k !== 'crediario' || c?.limite)).map(([k, [n, i]]) => `<button type="button" data-acao="pdvPag" data-p="${k}" aria-pressed="${st.pag === k}">${ic(i)}${n}</button>`).join('')}</div>
        ${st.pag === 'farmpop' ? `<label class="campo">Número da autorização do Farmácia Popular<input value="${esc(st.autorizacao)}" data-mudar="pdvAut" placeholder="dado pelo sistema autorizador"></label>` : ''}
        ${c?.endereco ? `<label class="flex" style="font-size:13px"><input type="checkbox" data-mudar="pdvEntrega" ${st.entrega ? 'checked' : ''}> Entregar em ${esc(c.endereco)} (taxa R$ 5)</label>` : ''}
        ${pedeReceita.length ? `<div class="dica">${ic('prescription')}<span>${pedeReceita.length} item controlado: ao finalizar, o sistema pede os dados da receita para o livro.</span></div>` : ''}
        <button type="button" class="btn pri ok" style="height:44px;font-size:14.5px" data-acao="pdvFinalizar" ${st.itens.length ? '' : 'disabled'}>${ic('check-circle')}Finalizar e emitir cupom · ${moeda(tot + (st.entrega ? 5 : 0))}</button></div></div></div>`;
}

function vendas(a) {
  return a.tab({ id: 'vendas', colecao: 'vendas', singular: 'cupom', plural: 'cupons', ordem: 'numero', desc: true, buscaDica: 'Buscar por número, cliente ou cupom fiscal…',
    visoes: [{ id: 'hoje', rot: 'Hoje', filtro: (v) => v.data === hoje() }, { id: 'mes', rot: 'Este mês', filtro: (v) => v.data.startsWith(hoje().slice(0, 7)) }, { id: 'controlados', rot: 'Com receita', filtro: (v) => v.itens.some((x) => x.receita) }, { id: 'todos', rot: 'Todos' }],
    filtros: [{ k: 'pagamento', rot: 'Pagamento', opcoes: Object.entries(PAG).map(([k, v]) => [k, v[0]]) }, { k: 'atendente', rot: 'Atendente', opcoes: () => ATEND.map((x) => [x[0], x[1]]) }],
    textoBusca: (v) => `${v.numero} ${cli(a, v.cliente)?.nome || ''} ${v.nfce?.numero || ''}`, total: (l) => moeda(soma(l.filter((v) => v.status !== 'cancelada'), totalV)), aoClicar: (id) => a.abrir('venda', id),
    novo: { rot: 'Abrir o caixa', attrs: 'data-acao="irCaixa"' },
    colunas: [{ k: 'numero', rot: 'Venda', render: (v) => `<span class="mono prim">#${v.numero}</span><span class="sub">${dataCurta(v.data)} ${esc(v.hora || '')}</span>` },
      { k: 'cliente', rot: 'Cliente', valor: (v) => cli(a, v.cliente)?.nome || 'Consumidor', render: (v) => `<span class="prim corta" style="max-width:220px;display:block">${esc(cli(a, v.cliente)?.nome || 'Consumidor')}</span><span class="sub">${v.itens.length} ${v.itens.length > 1 ? 'itens' : 'item'}${v.itens.some((x) => x.receita) ? ' · com receita' : ''}${v.entrega ? ' · entrega' : ''}</span>` },
      { k: 'pagamento', rot: 'Pagamento', oc: true, valor: (v) => PAG[v.pagamento]?.[0], render: (v) => `${esc(PAG[v.pagamento]?.[0] || v.pagamento)}${['convenio', 'crediario', 'farmpop'].includes(v.pagamento) ? `<span class="sub">${v.pago ? 'recebido' : 'a receber'}</span>` : ''}` },
      { k: 'nfce', rot: 'Cupom fiscal', oc: true, valor: (v) => v.nfce?.numero || 0, render: (v) => (v.status === 'cancelada' ? et('Cancelado', '') : v.nfce ? `<span class="mono">${v.nfce.numero}</span>` : '<span class="mute">—</span>') },
      { k: 'total', rot: 'Total', n: true, valor: totalV, render: (v) => moeda(totalV(v)) }] });
}

function receitasPag(a) {
  return `<div class="dica">${ic('prescription')}<span>Toda venda de controlado (Portaria 344/98) e de antimicrobiano (RDC 471/2021) fica registrada com a receita, o prescritor, o comprador e o lote. A receita original fica retida na farmácia e arquivada.</span></div>` + a.tab({ id: 'receitas', colecao: 'receitas', singular: 'receita', plural: 'receitas', ordem: 'numero', desc: true, buscaDica: 'Buscar por paciente, prescritor, notificação…',
    visoes: [{ id: 'mes', rot: 'Este mês', filtro: (r) => r.data.startsWith(hoje().slice(0, 7)) }, { id: 'atm', rot: 'Antimicrobianos', filtro: (r) => r.controle === 'ATM' }, { id: 'not', rot: 'Notificações A e B', filtro: (r) => /^[AB]/.test(r.controle) }, { id: 'todas', rot: 'Todas' }],
    textoBusca: (r) => `${r.paciente} ${r.prescritor} ${r.notificacao} ${r.registro}`, aoClicar: (id) => a.abrir('receita', id),
    colunas: [{ k: 'numero', rot: 'Nº', render: (r) => `<span class="mono prim">${r.numero}</span><span class="sub">${dataCurta(r.data)}</span>` }, { k: 'paciente', rot: 'Paciente', render: (r) => `<span class="prim">${esc(r.paciente)}</span><span class="sub">${esc(r.itens.map((x) => nomeCurto(prod(a, x.produto))).join(', '))}</span>` },
      { k: 'tipo', rot: 'Receita', oc: true, render: (r) => `${etControle(r.controle)}<span class="sub">${esc(r.notificacao || r.tipo)}</span>` }, { k: 'prescritor', rot: 'Prescritor', oc: true, render: (r) => `${esc(r.prescritor)}<span class="sub">${esc(r.conselho)} ${esc(r.registro)}/${esc(r.uf)}</span>` }] });
}

function livro(a) {
  const st = a.estado.livro ||= { mes: hoje().slice(0, 7) };
  const ini = `${st.mes}-01`, fim = `${mesMais(1, ini)}-01`;
  const ctrl = a.db.lista('produtos').filter((p) => p.controle);
  const sinal = (m) => (m.tipo === 'saida' ? -m.qtd : m.qtd);
  const linhasL = ctrl.map((p) => { const ms = a.db.lista('movimentos').filter((m) => m.produto === p.id), dep = ms.filter((m) => m.data.slice(0, 10) >= fim), no = ms.filter((m) => m.data.slice(0, 10) >= ini && m.data.slice(0, 10) < fim);
    const final = estTotal(p) - soma(dep, sinal), entradas = soma(no.filter((m) => m.tipo === 'entrada'), (m) => m.qtd), saidas = soma(no.filter((m) => m.tipo === 'saida'), (m) => m.qtd), perdas = -soma(no.filter((m) => m.tipo === 'ajuste'), (m) => m.qtd);
    return { p, inicial: final - entradas + saidas + perdas, entradas, saidas, perdas, final, no }; });
  const meses = Array.from({ length: 6 }, (_, i) => mesMais(-i));
  return `<div class="entre"><select data-mudar="livroMes" style="width:auto">${meses.map((m) => `<option value="${m}" ${m === st.mes ? 'selected' : ''}>${nomeMes(m, true)}</option>`).join('')}</select><div class="flex"><button type="button" class="btn" data-acao="livroCsv">${ic('download-simple')}Planilha do mês</button><button type="button" class="btn pri" data-acao="livroImprimir">${ic('printer')}Imprimir o livro</button></div></div>
    <div class="dica">${ic('book-open')}<span>Escrituração dos controlados e antimicrobianos por produto: saldo do início do mês, entradas por nota, saídas com receita e perdas. Use esta planilha para conferir e transmitir a movimentação no sistema da Anvisa (SNGPC), quando a sua farmácia for obrigada.</span></div>
    <div class="cartao"><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Produto</th><th>Lista</th><th class="n">Saldo inicial</th><th class="n">Entradas</th><th class="n">Saídas</th><th class="n">Perdas</th><th class="n">Saldo final</th></tr></thead><tbody>
      ${linhasL.map((x) => `<tr class="clicavel" data-abrir="produto:${x.p.id}:livro"><td><span class="prim">${esc(x.p.nome)}</span><span class="sub">${esc(x.p.principio)} · ${esc(x.p.laboratorio)}</span></td><td>${etControle(x.p.controle)}</td><td class="n">${num(x.inicial)}</td><td class="n ok-tx">${x.entradas ? `+${num(x.entradas)}` : '—'}</td><td class="n er-tx">${x.saidas ? `−${num(x.saidas)}` : '—'}</td><td class="n">${x.perdas ? `<b class="er-tx">−${num(x.perdas)}</b>` : '—'}</td><td class="n"><b>${num(x.final)}</b></td></tr>`).join('')}
    </tbody></table></div></div>`;
}

function validade(a) {
  const itens = () => a.db.lista('produtos').flatMap((p) => (p.lotes || []).filter((l) => l.qtd > 0).map((l) => ({ id: `${p.id}|${l.lote}`, p, l, dias: diasAte(l.validade) })));
  const todos = itens(), soma90 = soma(todos.filter((x) => x.dias <= 90), (x) => x.l.qtd * x.p.custo);
  return `${kpis([{ rot: 'Vencidos no estoque', icone: 'calendar-x', val: num(todos.filter((x) => x.dias < 0).length), alerta: todos.some((x) => x.dias < 0), nota: `${moeda(soma(todos.filter((x) => x.dias < 0), (x) => x.l.qtd * x.p.custo))} a custo` }, { rot: 'Vencem em 30 dias', icone: 'hourglass', val: num(todos.filter((x) => x.dias >= 0 && x.dias <= 30).length) }, { rot: 'Em risco (90 dias)', icone: 'coins', val: moeda(soma90), nota: 'valor a custo dos lotes' }])}
    <div class="dica">${ic('info')}<span>Vencido não pode ficar na área de venda: separe, identifique e dê baixa. O caixa nunca vende lote vencido e sempre tira primeiro o que vence antes.</span></div>
    ${a.tab({ id: 'validade', itens, singular: 'lote', plural: 'lotes', ordem: 'dias', aoClicar: (id) => a.abrir('produto', id.split('|')[0], 'lotes'), textoBusca: (x) => `${x.p.nome} ${x.l.lote} ${x.p.principio}`,
      visoes: [{ id: 'risco', rot: 'Até 90 dias', filtro: (x) => x.dias <= 90 }, { id: 'venc', rot: 'Vencidos', filtro: (x) => x.dias < 0 }, { id: 'v30', rot: 'Até 30 dias', filtro: (x) => x.dias >= 0 && x.dias <= 30 }, { id: 'todos', rot: 'Todos os lotes' }],
      filtros: [{ k: 'cat', rot: 'Categoria', opcoes: (aa) => cats(aa), valor: (x) => x.p.categoria }],
      colunas: [{ k: 'nome', rot: 'Produto', valor: (x) => x.p.nome, render: (x) => `<span class="prim">${esc(x.p.nome)}</span><span class="sub">${esc(x.p.laboratorio || '')}${x.p.controle ? ' · controlado' : ''}</span>` }, { k: 'lote', rot: 'Lote', valor: (x) => x.l.lote, render: (x) => `<span class="mono">${esc(x.l.lote)}</span>` },
        { k: 'dias', rot: 'Validade', valor: (x) => x.dias, render: (x) => { const [t, tom] = faixaVal(x.l.validade); return `${dataBR(x.l.validade)}${tom ? `<span class="sub">${et(t, tom, 'sem-ponto')}</span>` : ''}`; } }, { k: 'qtd', rot: 'Qtd.', n: true, valor: (x) => x.l.qtd, render: (x) => num(x.l.qtd) }, { k: 'valor', rot: 'A custo', n: true, oc: true, valor: (x) => x.l.qtd * x.p.custo, render: (x) => moeda(x.l.qtd * x.p.custo) },
        { k: 'acao', rot: '', ord: false, csv: false, render: (x) => (x.dias < 0 ? `<button type="button" class="btn peq perigo" data-acao="baixaLote" data-p="${x.p.id}" data-l="${esc(x.l.lote)}">Dar baixa</button>` : x.dias <= 90 ? `<button type="button" class="btn peq" data-acao="devolverLote" data-p="${x.p.id}" data-l="${esc(x.l.lote)}">Devolver</button>` : '') }] })}`;
}

function continuo(a) {
  const l = recompras(a);
  return `<div class="dica">${ic('heart')}<span>Clientes de uso contínuo (pressão, diabetes, colesterol, tireoide…): o sistema calcula quando a caixa acaba pela última compra. Lembrar o cliente antes evita que ele compre em outra farmácia. As mensagens prontas no WhatsApp ficam em Avisos e mensagens (plano Pro).</span></div>
    ${a.tab({ id: 'continuo', itens: () => l, singular: 'lembrete', plural: 'lembretes', ordem: 'quando', aoClicar: (id) => a.abrir('cliente', id.split('|')[0]), textoBusca: (x) => `${cli(a, x.cliente)?.nome} ${prod(a, x.produto)?.nome}`,
      colunas: [{ k: 'cliente', rot: 'Cliente', valor: (x) => cli(a, x.cliente)?.nome, render: (x) => `<span class="flex">${av(cli(a, x.cliente)?.nome || '?', 'p')}<span><span class="prim">${esc(cli(a, x.cliente)?.nome || '')}</span><span class="sub">${esc(cli(a, x.cliente)?.telefone || '')}</span></span></span>` },
        { k: 'produto', rot: 'Remédio', valor: (x) => prod(a, x.produto)?.nome, render: (x) => `${esc(nomeCurto(prod(a, x.produto)))}<span class="sub">última compra ${dataCurta(x.ultima)}</span>` },
        { k: 'quando', rot: 'Acaba', render: (x) => `${dataCurta(x.quando)}<span class="sub">${et(x.dias < 0 ? `${-x.dias} dias atrás` : x.dias === 0 ? 'hoje' : `em ${x.dias} dias`, x.dias < 0 ? 'er' : 'al', 'sem-ponto')}</span>` }] })}`;
}

function areceber(a) {
  const ab = emAberto(a), porConv = agrupar(ab.filter((v) => v.pagamento === 'convenio'), (v) => v.convenio), cred = agrupar(ab.filter((v) => v.pagamento === 'crediario'), (v) => v.cliente), fp = ab.filter((v) => v.pagamento === 'farmpop');
  return `${kpis([{ rot: 'Convênios', icone: 'buildings', val: moeda(soma(ab.filter((v) => v.pagamento === 'convenio'), totalV)), nota: `${Object.keys(porConv).length} empresas` }, { rot: 'Crediário', icone: 'notebook', val: moeda(soma(ab.filter((v) => v.pagamento === 'crediario'), totalV)), nota: `${Object.keys(cred).length} clientes` }, { rot: 'Farmácia Popular', icone: 'first-aid-kit', val: moeda(soma(fp, totalV)), nota: `${fp.length} vendas a receber do programa` }])}
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Convênios</h3><div class="sub">Feche o mês e mande o extrato para a empresa descontar em folha</div></div><button type="button" class="btn peq" data-acao="novoCad" data-c="convenios">${ic('plus')}Convênio</button></div>
      ${a.db.lista('convenios').length ? `<ul class="lista">${a.db.lista('convenios').map((c) => { const l = porConv[c.id] || []; return `<li>${av(c.nome, 'p')}<div class="cresce"><div class="t corta">${esc(c.nome)}</div><div class="s">${c.desconto}% de desconto · fecha dia ${c.dia_fechamento} · ${l.length} compras em aberto</div></div><b class="num">${moeda(soma(l, totalV))}</b>${l.length ? `<button type="button" class="btn peq" data-acao="fecharConv" data-id="${c.id}">Fechar</button>` : ''}</li>`; }).join('')}</ul>` : vazio('buildings', 'Nenhum convênio', 'Cadastre as empresas cujos funcionários compram e pagam pela folha.')}</div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Crediário</h3><div class="sub">Clientes que levaram para pagar depois</div></div></div>
      ${Object.keys(cred).length ? `<ul class="lista">${Object.entries(cred).map(([cid, l]) => { const c = cli(a, cid); return `<li>${av(c?.nome || '?', 'p')}<div class="cresce"><div class="t corta">${esc(c?.nome || '')}</div><div class="s">${l.length} compras · desde ${dataCurta(l.map((v) => v.data).sort()[0])} · limite ${moeda(c?.limite)}</div></div><b class="num">${moeda(soma(l, totalV))}</b><button type="button" class="btn peq" data-acao="receberCred" data-id="${cid}">Receber</button></li>`; }).join('')}</ul>` : vazio('check-circle', 'Ninguém devendo')}</div></div>
    ${fp.length ? `<div class="cartao"><div class="cartao-cab"><div><h3>Farmácia Popular</h3><div class="sub">Vendas com autorização, a receber do programa</div></div><button type="button" class="btn peq" data-acao="receberFP">Marcar como recebido</button></div><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Venda</th><th>Autorização</th><th class="n">Valor</th></tr></thead><tbody>${fp.map((v) => `<tr class="clicavel" data-abrir="venda:${v.id}"><td>#${v.numero} · ${dataCurta(v.data)}</td><td class="mono">${esc(v.autorizacao || '—')}</td><td class="n">${moeda(totalV(v))}</td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
}

function entregas(a) {
  const l = validas(a).filter((v) => v.entrega);
  return `<div class="dica">${ic('motorcycle')}<span>Para entregar: marque "Entregar" no caixa (precisa do cliente com endereço). Quando sair, avise o cliente pelo WhatsApp.</span></div>` + a.tab({ id: 'entregas', itens: () => l, singular: 'entrega', plural: 'entregas', ordem: 'numero', desc: true, aoClicar: (id) => a.abrir('venda', id),
    visoes: [{ id: 'abertas', rot: 'Em andamento', filtro: (v) => v.entrega.status !== 'entregue' }, { id: 'todas', rot: 'Todas' }],
    colunas: [{ k: 'numero', rot: 'Venda', render: (v) => `<span class="mono prim">#${v.numero}</span><span class="sub">${dataCurta(v.data)} ${esc(v.hora || '')}</span>` }, { k: 'cliente', rot: 'Cliente', valor: (v) => cli(a, v.cliente)?.nome, render: (v) => `<span class="prim">${esc(cli(a, v.cliente)?.nome || '')}</span><span class="sub corta" style="max-width:260px;display:block">${esc(v.entrega.endereco)}</span>` },
      { k: 'st', rot: 'Situação', valor: (v) => ST_ENT.findIndex((x) => x[0] === v.entrega.status), render: (v) => { const s = ST_ENT.find((x) => x[0] === v.entrega.status) || ST_ENT[0]; return et(s[1], s[2]); } }, { k: 'total', rot: 'Total', n: true, valor: totalV, render: (v) => moeda(totalV(v)) },
      { k: 'acao', rot: '', ord: false, csv: false, render: (v) => (v.entrega.status === 'separando' ? `<button type="button" class="btn peq" data-acao="entregaSaiu" data-id="${v.id}">Saiu</button>` : v.entrega.status === 'saiu' ? `<button type="button" class="btn peq pri" data-acao="entregaOk" data-id="${v.id}">Entregue</button>` : '') }] });
}

function servicosPag(a) {
  return `<div class="dica">${ic('first-aid')}<span>Serviços farmacêuticos (RDC 44/2009): cada atendimento fica registrado e você imprime a Declaração de Serviço Farmacêutico para o paciente.</span></div>` + a.tab({ id: 'servicos', colecao: 'servicos', singular: 'atendimento', plural: 'atendimentos', ordem: 'data', desc: true, novo: { rot: 'Novo atendimento', attrs: 'data-acao="novoCad" data-c="servicos"' },
    filtros: [{ k: 'tipo', rot: 'Serviço', opcoes: SERVICOS }], textoBusca: (s) => `${cli(a, s.cliente)?.nome} ${s.tipo}`, total: (l) => `${moeda(soma(l, (s) => s.valor))} cobrados`, aoClicar: (id) => a.abrir('servico', id),
    colunas: [{ k: 'data', rot: 'Data', render: (s) => `${dataCurta(s.data)}<span class="sub">${esc(s.hora || '')}</span>` }, { k: 'cliente', rot: 'Paciente', valor: (s) => cli(a, s.cliente)?.nome, render: (s) => `<span class="prim">${esc(cli(a, s.cliente)?.nome || '')}</span>` }, { k: 'tipo', rot: 'Serviço', render: (s) => `${esc(s.tipo)}<span class="sub">${esc(s.resultado || '')}</span>` }, { k: 'valor', rot: 'Valor', n: true, render: (s) => (s.valor ? moeda(s.valor) : '<span class="mute">grátis</span>') }] });
}

function geladeira(a) {
  const l = a.db.lista('temperaturas').slice().sort((x, y) => `${x.data}${x.hora}`.localeCompare(`${y.data}${y.hora}`)).slice(-28);
  const fora = (t) => Number(t.maxima ?? t.atual) > 8 || Number(t.minima ?? t.atual) < 2;
  const termo = a.db.lista('produtos').filter((p) => p.termolabil);
  return `<div class="entre"><div class="dica" style="flex:1">${ic('thermometer')}<span>Termolábeis (insulinas, vacinas, alguns colírios) ficam entre 2 e 8 °C. Registre a temperatura atual, a mínima e a máxima do termômetro pelo menos duas vezes por dia.</span></div><button type="button" class="btn pri" data-acao="novoCad" data-c="temperaturas">${ic('plus')}Registrar leitura</button></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Últimas leituras</h3><div class="sub">${termo.length} produtos termolábeis no estoque</div></div><button type="button" class="btn peq" data-acao="imprimirTemp">${ic('printer')}Planilha do mês</button></div><div class="cartao-corpo">${linhas({ rotulos: l.map((t) => `${t.data.slice(8)}/${t.data.slice(5, 7)}`), series: [{ nome: 'Máxima', cor: '#be123c', v: l.map((t) => Number(t.maxima ?? t.atual)) }, { nome: 'Mínima', cor: '#0ea5e9', v: l.map((t) => Number(t.minima ?? t.atual)) }], fmt: (v) => `${num(v, 1)} °C`, altura: 220, area: false, zero: true })}</div></div>
    ${a.tab({ id: 'temperaturas', colecao: 'temperaturas', singular: 'leitura', plural: 'leituras', ordem: 'data', desc: true, porPagina: 20, aoClicar: (id) => editar(a, 'temperaturas', a.db.obter('temperaturas', id)).then((x) => x && a.render()),
      colunas: [{ k: 'data', rot: 'Data', render: (t) => `${dataCurta(t.data)} <span class="mute">${esc(t.hora)}</span>` }, { k: 'atual', rot: 'Agora', n: true, render: (t) => `${num(t.atual, 1)} °C` }, { k: 'minima', rot: 'Mín.', n: true, render: (t) => `${num(t.minima, 1)} °C` }, { k: 'maxima', rot: 'Máx.', n: true, render: (t) => `${num(t.maxima, 1)} °C` },
        { k: 'ok', rot: 'Faixa', valor: (t) => (fora(t) ? 1 : 0), render: (t) => (fora(t) ? et('Fora de 2 a 8 °C', 'er') : et('Ok', 'ok')) }, { k: 'resp', rot: 'Responsável', oc: true, render: (t) => esc(nomeA(t.responsavel)) }] })}`;
}

function compras(a) {
  return `<div class="entre"><span class="mute" style="font-size:12.5px">Chegou a nota da distribuidora? Importe o XML: o sistema confere os produtos, cadastra os novos e dá entrada com lote, validade e registro da Anvisa.</span><span class="flex"><button type="button" class="btn fant peq" data-acao="xmlExemplo">${ic('download-simple')}XML de exemplo</button><label class="btn pri">${ic('file-arrow-up')}Importar XML da nota<input type="file" accept=".xml,text/xml" hidden data-mudar="importarXML"></label></span></div>` + a.tab({ id: 'compras', colecao: 'compras', singular: 'pedido de compra', plural: 'pedidos de compra', ordem: 'numero', desc: true,
    visoes: [{ id: 'abertas', rot: 'A receber', filtro: (c) => c.status === 'enviado' }, { id: 'rasc', rot: 'Rascunhos', filtro: (c) => c.status === 'rascunho' }, { id: 'todas', rot: 'Todas' }],
    filtros: [{ k: 'fornecedor', rot: 'Distribuidora', opcoes: (aa) => aa.db.lista('fornecedores').map((f) => [f.id, f.nome]) }], textoBusca: (c) => `${c.numero} ${forn(a, c.fornecedor)?.nome} ${c.nf || ''}`, total: (l) => moeda(soma(l, totalC)),
    novo: { rot: 'Nova compra', attrs: 'data-acao="novaCompra"' }, aoClicar: (id) => a.abrir('compra', id),
    colunas: [{ k: 'numero', rot: 'Pedido', render: (c) => `<span class="mono prim">#${c.numero}</span><span class="sub">${dataCurta(c.data)}${c.nf ? ` · NF ${esc(c.nf)}` : ''}</span>` }, { k: 'fornecedor', rot: 'Distribuidora', valor: (c) => forn(a, c.fornecedor)?.nome, render: (c) => esc(forn(a, c.fornecedor)?.nome || '—') },
      { k: 'status', rot: 'Situação', render: (c) => ({ rascunho: et('Rascunho', ''), enviado: et('Enviado', 'info'), recebido: et('Recebido', 'ok') })[c.status] || et(c.status, '') }, { k: 'total', rot: 'Total', n: true, valor: totalC, render: (c) => moeda(totalC(c)) }] });
}

function sugestao(a) {
  const ps = a.db.lista('produtos').map((p) => { const dia = vendidoQtd(a, p.id, 30) / 30; const chegando = soma(a.db.lista('compras').filter((c) => c.status === 'enviado').flatMap((c) => c.itens).filter((x) => x.produto === p.id), (x) => x.qtd - x.recebido); return { p, dia, chegando, sugerido: Math.max(0, Math.ceil(dia * 15 + p.minimo) - vendavel(p) - chegando) }; }).filter((x) => x.sugerido > 0 && (vendavel(x.p) <= x.p.minimo || cobertura(a, x.p) < 10));
  ps.forEach((x) => { const m = melhorForn(a, x.p.id); x.fid = m?.fornecedor || x.p.fornecedor; x.custo = m?.preco || x.p.custo; });
  const porF = agrupar(ps, (x) => x.fid);
  return `<div class="dica">${ic('lightning')}<span>Farmácia compra pouco e sempre: a sugestão cobre 15 dias de venda mais o estoque mínimo, já descontando o que está a caminho e os lotes vencidos.</span></div>
    ${Object.keys(porF).length ? Object.entries(porF).map(([fid, l]) => `<div class="cartao"><div class="cartao-cab"><div><h3>${esc(forn(a, fid)?.nome || 'Sem distribuidora')}</h3><div class="sub">${l.length} produtos · ${moeda(soma(l, (x) => x.sugerido * x.custo))}</div></div><button type="button" class="btn pri" data-acao="gerarCompra" data-f="${fid}">${ic('shopping-cart')}Gerar pedido</button></div>
      <div class="tabela-caixa"><table class="tabela"><thead><tr><th>Produto</th><th class="n">Estoque</th><th class="n oc">Venda/dia</th><th class="n">Comprar</th><th class="n">Custo</th></tr></thead><tbody>${l.map((x) => `<tr><td><span class="prim">${esc(x.p.nome)}</span><span class="sub">${esc(x.p.laboratorio || '')}</span></td><td class="n">${vendavel(x.p) <= 0 ? et('0', 'er') : vendavel(x.p)}</td><td class="n oc">${num(x.dia, 1)}</td><td class="n"><b>${x.sugerido}</b></td><td class="n">${moeda(x.sugerido * x.custo)}</td></tr>`).join('')}</tbody></table></div></div>`).join('') : `<div class="cartao">${vazio('check-circle', 'Nada para comprar agora')}</div>`}`;
}

function melhoresForn(a) {
  const lf = a.db.lista('produtos').map((p) => { const m = melhorForn(a, p.id), at = cotacaoAtual(a, p), vm = vendidoQtd(a, p.id, 30); return { id: p.id, p, m, at, vm, eco: m && at && m.fornecedor !== p.fornecedor ? Math.max(0, (at.preco - m.preco) * vm) : 0 }; });
  return `${kpis([{ rot: 'Economia possível por mês', icone: 'coins', val: moeda(soma(lf, (x) => x.eco)), nota: `trocando a distribuidora de ${lf.filter((x) => x.eco > 0).length} produtos` }, { rot: 'Cotações registradas', icone: 'clipboard-text', val: num(a.db.lista('cotacoes').length) }])}
    ${a.tab({ id: 'melhores', itens: () => lf, singular: 'produto', plural: 'produtos', ordem: 'eco', desc: true, aoClicar: (id) => a.abrir('produto', id, 'forn'), textoBusca: (x) => x.p.nome,
      colunas: [{ k: 'nome', rot: 'Produto', valor: (x) => x.p.nome, render: (x) => `<span class="prim">${esc(x.p.nome)}</span><span class="sub">${num(x.vm)} un por mês</span>` }, { k: 'melhor', rot: 'Melhor opção', valor: (x) => x.m?.f?.nome, render: (x) => (x.m ? `<span class="prim">${esc(x.m.f?.nome || '')}</span><span class="sub">${moeda(x.m.preco)} · ${x.m.prazo} dias · nota ${x.m.nota}</span>` : '—') },
        { k: 'eco', rot: 'Economia/mês', n: true, valor: (x) => x.eco, render: (x) => (x.eco > 0 ? `<b class="ok-tx">${moeda(x.eco)}</b>` : '<span class="mute">—</span>') }, { k: 'acao', rot: '', ord: false, csv: false, render: (x) => (x.eco > 0 ? `<button type="button" class="btn peq" data-acao="usarForn" data-p="${x.p.id}" data-f="${x.m.fornecedor}">Trocar</button>` : '') }] })}`;
}

function produtos(a) {
  return a.tab({ id: 'produtos', colecao: 'produtos', singular: 'produto', plural: 'produtos', ordem: 'nome', buscaDica: 'Buscar por nome, princípio ativo, laboratório ou código de barras…',
    visoes: [{ id: 'todos', rot: 'Todos' }, { id: 'repor', rot: 'Repor', filtro: (p) => vendavel(p) <= p.minimo }, { id: 'ctrl', rot: 'Controlados', filtro: (p) => !!p.controle }, { id: 'gen', rot: 'Genéricos', filtro: (p) => p.tipo === 'Genérico' }, { id: 'pmc', rot: 'Acima do PMC', filtro: (p) => p.pmc && p.preco > p.pmc }, { id: 'termo', rot: 'Geladeira', filtro: (p) => p.termolabil }],
    filtros: [{ k: 'categoria', rot: 'Categoria', opcoes: (aa) => cats(aa) }, { k: 'tipo', rot: 'Tipo', opcoes: TIPOS }, { k: 'fornecedor', rot: 'Distribuidora', opcoes: (aa) => aa.db.lista('fornecedores').map((f) => [f.id, f.nome]) }],
    textoBusca: (p) => `${p.nome} ${p.principio} ${p.laboratorio} ${p.sku} ${p.ean}`, novo: { rot: 'Novo produto', attrs: 'data-acao="novoProduto"' }, aoClicar: (id) => a.abrir('produto', id), total: (l) => `${moedaC(soma(l, (p) => p.custo * estTotal(p)))} em estoque`,
    colunas: [{ k: 'nome', rot: 'Produto', render: (p) => `<span class="prim">${esc(p.nome)}</span><span class="sub">${esc(p.laboratorio || '')} · ${esc(p.tipo || '')} ${p.controle ? etControle(p.controle) : ''}</span>` },
      { k: 'preco', rot: 'Preço', n: true, render: (p) => `${moeda(p.preco)}${p.pmc ? `<span class="sub ${p.preco > p.pmc ? 'er-tx' : ''}">PMC ${moeda(p.pmc)}</span>` : ''}` }, { k: 'margem', rot: 'Margem', n: true, oc: true, valor: (p) => (p.preco - p.custo) / p.preco, render: (p) => pct(((p.preco - p.custo) / p.preco) * 100) },
      { k: 'val', rot: 'Próx. validade', oc: true, valor: (p) => proxValidade(p) || '9999', render: (p) => { const v = proxValidade(p); if (!v) return '<span class="mute">—</span>'; const [t, tom] = faixaVal(v); return tom ? et(t, tom) : dataBR(v); } },
      { k: 'total', rot: 'Estoque', n: true, valor: vendavel, render: (p) => { const [, tom] = situacaoEst(p); return tom === 'ok' ? `${num(vendavel(p))} un` : et(`${num(vendavel(p))} un`, tom); } }] });
}

function estoque(a) {
  return `<div class="entre"><div class="dica" style="flex:1">${ic('info')}<span>Toda entrada, venda, perda e ajuste fica registrado com o lote, a data e o motivo.</span></div><div class="flex"><button type="button" class="btn" data-acao="ajustar">${ic('pencil-simple')}Ajuste ou perda</button><a class="btn pri" href="#/inventario">${ic('list-checks')}Inventário</a></div></div>`
    + a.tab({ id: 'movimentos', colecao: 'movimentos', singular: 'movimento', plural: 'movimentos', ordem: 'data', desc: true, porPagina: 30,
      visoes: [{ id: 'todos', rot: 'Todos' }, { id: 'entrada', rot: 'Entradas', filtro: (m) => m.tipo === 'entrada' }, { id: 'saida', rot: 'Saídas', filtro: (m) => m.tipo === 'saida' }, { id: 'ajuste', rot: 'Perdas e ajustes', filtro: (m) => m.tipo === 'ajuste' }],
      textoBusca: (m) => `${prod(a, m.produto)?.nome} ${m.motivo} ${m.lote}`, aoClicar: (id) => a.abrir('produto', a.db.obter('movimentos', id).produto, 'kardex'),
      colunas: [{ k: 'data', rot: 'Data', render: (m) => `${dataCurta(m.data)} <span class="mute">${m.data.slice(11, 16)}</span>` }, { k: 'produto', rot: 'Produto', valor: (m) => prod(a, m.produto)?.nome, render: (m) => `<span class="prim">${esc(prod(a, m.produto)?.nome || '—')}</span><span class="sub mono">lote ${esc(m.lote || '—')}</span>` },
        { k: 'tipo', rot: 'Tipo', render: (m) => ({ entrada: et('Entrada', 'ok'), saida: et('Saída', 'er'), ajuste: et('Ajuste', 'al') })[m.tipo] }, { k: 'qtd', rot: 'Qtd.', n: true, valor: (m) => (m.tipo === 'saida' ? -m.qtd : m.qtd), render: (m) => `<b class="${m.tipo === 'saida' || m.qtd < 0 ? 'er-tx' : 'ok-tx'}">${m.tipo === 'saida' ? '−' : m.qtd > 0 ? '+' : ''}${num(m.qtd)}</b>` },
        { k: 'motivo', rot: 'Motivo', oc: true, render: (m) => `<span class="mute-2">${esc(m.motivo)}</span>` }] });
}

function inventario(a) {
  const st = a.estado.inv ||= { cat: 'Controlados', cont: {} };
  const ls = a.db.lista('produtos').filter((p) => p.categoria === st.cat).flatMap((p) => (p.lotes || []).filter((l) => l.qtd !== 0).map((l) => ({ p, l, k: `${p.id}|${l.lote}` })));
  const difs = ls.filter((x) => st.cont[x.k] !== undefined && st.cont[x.k] !== '' && Number(st.cont[x.k]) !== x.l.qtd);
  return `<div class="entre"><select data-mudar="invCat" style="width:auto">${cats(a).map((c) => `<option ${c === st.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select><div class="flex"><button type="button" class="btn" data-acao="imprimirInv">${ic('printer')}Folha de contagem</button><button type="button" class="btn pri" data-acao="aplicarInv" ${difs.length ? '' : 'disabled'}>${ic('check')}Aplicar ${difs.length} ajustes</button></div></div>
    <div class="dica">${ic('info')}<span>Conte por lote. Nos controlados, toda diferença vira perda ou sobra no livro: confira duas vezes antes de aplicar.</span></div>
    <div class="cartao"><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Produto</th><th>Lote</th><th class="oc">Validade</th><th class="n">No sistema</th><th class="n" style="width:130px">Contado</th><th class="n">Diferença</th></tr></thead><tbody>
      ${ls.map((x) => { const c = st.cont[x.k]; const d = c === undefined || c === '' ? null : Number(c) - x.l.qtd; return `<tr><td><span class="prim">${esc(x.p.nome)}</span><span class="sub mono">${esc(x.p.localizacao || '')}</span></td><td class="mono">${esc(x.l.lote)}</td><td class="oc">${dataBR(x.l.validade)}</td><td class="n">${num(x.l.qtd)}</td><td class="n"><input type="number" min="0" value="${c ?? ''}" data-mudar="invCont" data-id="${esc(x.k)}" style="height:28px;text-align:right" placeholder="—"></td><td class="n">${d === null ? '<span class="mute">—</span>' : d === 0 ? et('confere', 'ok') : `<b class="${d < 0 ? 'er-tx' : 'ok-tx'}">${d > 0 ? '+' : ''}${d}</b>`}</td></tr>`; }).join('')}
    </tbody></table></div></div>`;
}

function abc(a) {
  const l = curvaABC(a), cl = (c) => l.filter((x) => x.classe === c);
  return `${kpis(['A', 'B', 'C'].map((c) => ({ rot: `Classe ${c}`, icone: c === 'A' ? 'star' : c === 'B' ? 'circle' : 'dot-outline', val: `${cl(c).length} produtos`, nota: `${pct(soma(cl(c), (x) => x.part))} do faturamento` })))}
    <div class="dica">${ic('info')}<span>Os itens <b>A</b> trazem 80% do faturamento dos últimos 90 dias e nunca podem faltar no balcão.</span></div>
    <div class="cartao"><div class="tabela-caixa"><table class="tabela"><thead><tr><th>#</th><th>Produto</th><th class="n">Faturamento</th><th class="n oc">Acumulado</th><th>Classe</th><th class="n oc">Estoque</th></tr></thead><tbody>${l.map((x, i) => `<tr class="clicavel" data-abrir="produto:${x.p.id}"><td class="mute">${i + 1}</td><td><span class="prim">${esc(x.p.nome)}</span></td><td class="n">${moeda(x.v)}</td><td class="n oc">${pct(x.acc, 1)}</td><td>${et(x.classe, x.classe === 'A' ? 'ok' : x.classe === 'B' ? 'info' : '', 'sem-ponto')}</td><td class="n oc">${x.classe === 'A' && vendavel(x.p) <= x.p.minimo ? et(`${vendavel(x.p)}`, 'er') : num(vendavel(x.p))}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function etiquetas(a) {
  const st = a.estado.etq ||= { cat: 'Medicamentos', qtd: {} };
  const ps = a.db.lista('produtos').filter((p) => p.categoria === st.cat);
  return `<div class="entre"><select data-mudar="etqCat" style="width:auto">${cats(a).map((c) => `<option ${c === st.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select><button type="button" class="btn pri" data-acao="imprimirEtq">${ic('printer')}Imprimir etiquetas</button></div>
    <div class="dica">${ic('barcode')}<span>Etiqueta de gôndola com nome, preço, código de barras e, nos medicamentos, o PMC (o consumidor tem direito de ver).</span></div>
    <div class="grade g3">${ps.map((p) => `<div class="cartao"><div class="cartao-corpo col" style="gap:8px"><b class="corta">${esc(p.nome)}</b><div class="entre" style="align-items:flex-end"><div style="width:170px">${codigoBarras(p.ean, { altura: 40 })}</div><div style="text-align:right"><b style="font-size:20px" class="num">${moeda(p.preco)}</b>${p.pmc ? `<div class="mute" style="font-size:11px">PMC ${moeda(p.pmc)}</div>` : ''}</div></div><label class="campo" style="flex-direction:row;align-items:center;justify-content:space-between">Quantidade<input type="number" min="0" value="${st.qtd[p.id] ?? 1}" data-mudar="etqQtd" data-id="${p.id}" style="width:90px;height:28px;text-align:right"></label></div></div>`).join('')}</div>`;
}

function cadastroPag(colecao, sing, plur, ficha_) {
  return (a) => a.tab({ id: colecao, colecao, singular: sing, plural: plur, ordem: 'nome', novo: { rot: `${colecao === 'fornecedores' ? 'Nova' : 'Novo'} ${sing}`, attrs: `data-acao="novoCad" data-c="${colecao}"` }, aoClicar: (id) => a.abrir(ficha_, id),
    textoBusca: (x) => `${x.nome} ${x.cpf || x.doc || ''} ${x.telefone || ''}`,
    colunas: [{ k: 'nome', rot: 'Nome', render: (x) => `<span class="flex" style="gap:9px">${av(x.nome)}<span><span class="prim">${esc(x.nome)}</span><span class="sub mono">${esc(x.cpf || x.doc || '')}</span></span></span>` }, { k: 'telefone', rot: 'Telefone', oc: true },
      colecao === 'clientes' ? { k: 'convenio', rot: 'Convênio', oc: true, valor: (x) => conv(a, x.convenio)?.nome || '', render: (x) => esc(conv(a, x.convenio)?.nome || '—') } : { k: 'prazo', rot: 'Prazo', n: true, render: (x) => `${x.prazo} dias` },
      colecao === 'clientes' ? { k: 'comprado', rot: 'Comprou (90 dias)', n: true, valor: (x) => soma(validas(a).filter((v) => v.cliente === x.id && diasAte(v.data) > -90), totalV), render: (x) => moeda(soma(validas(a).filter((v) => v.cliente === x.id && diasAte(v.data) > -90), totalV)) }
        : { k: 'comprado', rot: 'Compramos (90 dias)', n: true, valor: (x) => soma(a.db.lista('compras').filter((c) => c.fornecedor === x.id && diasAte(c.data) > -90), totalC), render: (x) => moeda(soma(a.db.lista('compras').filter((c) => c.fornecedor === x.id && diasAte(c.data) > -90), totalC)) }] });
}

function relatorios(a) {
  const st = a.estado.rel ||= { dias: 30 };
  const vs = validas(a).filter((v) => diasAte(v.data) > -st.dias), meses = Array.from({ length: 3 }, (_, i) => mesMais(i - 2));
  const porCat = cats(a).map((c, i) => ({ rot: c, v: soma(vs.flatMap((v) => v.itens).filter((x) => prod(a, x.produto)?.categoria === c), (x) => x.qtd * x.preco), cor: COR_CAT[i % COR_CAT.length] }));
  const gen = soma(vs.flatMap((v) => v.itens).filter((x) => prod(a, x.produto)?.tipo === 'Genérico'), (x) => x.qtd * x.preco), med = soma(vs.flatMap((v) => v.itens).filter((x) => ['Medicamentos', 'Controlados'].includes(prod(a, x.produto)?.categoria)), (x) => x.qtd * x.preco);
  return `<div class="grupo-btn">${[7, 30, 60].map((d) => `<button type="button" data-acao="relDias" data-d="${d}" aria-pressed="${st.dias === d}">${d} dias</button>`).join('')}</div>
    ${kpis([{ rot: 'Faturamento', icone: 'shopping-cart', val: moeda(soma(vs, totalV)), nota: `${vs.length} cupons` }, { rot: 'Ticket médio', icone: 'receipt', val: moeda(soma(vs, totalV) / (vs.length || 1)) }, { rot: 'Margem bruta', icone: 'percent', val: pct(((soma(vs, totalV) - soma(vs, custoV)) / (soma(vs, totalV) || 1)) * 100, 1) }, { rot: 'Genéricos', icone: 'pill', val: pct((gen / (med || 1)) * 100), nota: 'dos medicamentos vendidos' }])}
    <div class="grade g21"><div class="cartao"><div class="cartao-cab"><h3>Faturamento por mês</h3></div><div class="cartao-corpo">${barras({ dados: meses.map((m) => ({ rot: nomeMes(m), v: [soma(validas(a).filter((v) => v.data.startsWith(m)), totalV)] })), series: [{ nome: 'Vendas', cor: 'var(--acc)' }], fmt: moedaC })}</div></div>
      <div class="cartao"><div class="cartao-cab"><h3>Por categoria</h3></div><div class="cartao-corpo">${rosca({ itens: porCat, centro: moedaC(soma(porCat, (x) => x.v)), fmt: moedaC })}</div></div></div>
    <div class="cartao"><div class="cartao-cab"><h3>Por atendente</h3></div><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Atendente</th><th class="n">Cupons</th><th class="n">Vendido</th><th class="n">Ticket médio</th></tr></thead><tbody>${ATEND.map(([id, n]) => { const l = vs.filter((v) => v.atendente === id), f = soma(l, totalV); return `<tr><td><span class="flex">${av(n, 'p')}${esc(n)}</span></td><td class="n">${l.length}</td><td class="n"><b>${moeda(f)}</b></td><td class="n">${moeda(f / (l.length || 1))}</td></tr>`; }).join('')}</tbody></table></div></div>`;
}

// ---------------------------------------------------------------- cupom fiscal (NFC-e)
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
function cupomSimulado(a, v) { const numero = Math.max(31800, ...a.db.lista('vendas').map((x) => x.nfce?.numero || 0)) + 1; return { numero, serie: 1, chave: `3526${hoje().slice(2, 4)}${hoje().slice(5, 7)}41520630000132650010${String(numero).padStart(9, '0')}1${String(Date.now()).slice(-7)}`, emissao: hoje() }; }
async function emitirNFCe(a, v) {
  const cfg = a.db.cfg, cnpj = String(cfg.cnpj || '').replace(/\D/g, ''), c = cli(a, v.cliente), cpf = String(c?.cpf || v.cpf || '').replace(/\D/g, '');
  if (cnpj.length !== 14) throw new Error('Para emitir o cupom falta o CNPJ da farmácia (Configurações › Empresa)');
  const sub = soma(v.itens, (x) => x.qtd * x.preco), desc = v.desconto || 0;
  const items = v.itens.map((x, i) => { const p = prod(a, x.produto), bruto = Math.round(x.qtd * x.preco * 100) / 100, ncm = String(p.ncm || '').replace(/\D/g, '');
    if (ncm.length !== 8) throw new Error(`Falta o NCM de ${p.nome}`);
    const it = { numero_item: i + 1, codigo_produto: p.sku, descricao: p.nome, codigo_ncm: ncm, cfop: p.cfop || '5102', unidade_comercial: 'UN', quantidade_comercial: x.qtd, valor_unitario_comercial: x.preco, valor_bruto: bruto, unidade_tributavel: 'UN', quantidade_tributavel: x.qtd, valor_unitario_tributavel: x.preco, icms_origem: 0, icms_situacao_tributaria: p.csosn || '102', pis_situacao_tributaria: '07', cofins_situacao_tributaria: '07', ...(desc ? { valor_desconto: Math.round((desc * bruto / (sub || 1)) * 100) / 100 } : {}) };
    if (/^\d{13}$/.test(p.ean || '')) Object.assign(it, { codigo_barras_comercial: p.ean, codigo_barras_tributavel: p.ean });
    if (ehMedicamento(p)) {
      const reg = String(p.registro_ms || '').replace(/\D/g, '');
      Object.assign(it, reg ? { medicamento_codigo_anvisa: reg } : { medicamento_codigo_anvisa: 'ISENTO', medicamento_motivo_isencao: 'Produto dispensado de registro' }, { medicamento_preco_maximo_consumidor: p.pmc || x.preco });
      it.rastros = (x.lotes || []).map((l) => { const lt = (p.lotes || []).find((y) => y.lote === l.lote) || {}; return { numero_lote: l.lote, quantidade_lote: l.qtd, data_fabricacao: lt.fab || diaMais(-365, lt.validade || hoje()), data_validade: lt.validade || diaMais(365) }; });
    }
    return it; });
  const nfce = { natureza_operacao: 'Venda ao consumidor', data_emissao: new Date().toISOString(), presenca_comprador: v.entrega ? 4 : 1, modalidade_frete: 9, local_destino: 1, consumidor_final: 1, cnpj_emitente: cnpj,
    ...(cpf.length === 11 ? { cpf_destinatario: cpf, nome_destinatario: c?.nome || '' } : {}), items, ...(v.entrega?.taxa ? { valor_frete: v.entrega.taxa } : {}),
    formas_pagamento: [{ forma_pagamento: PAG[v.pagamento]?.[2] || '99', valor_pagamento: Math.round(totalV(v) * 100) / 100 }] };
  const ref = `${a.sessao.espaco.id.slice(0, 8)}-c${v.numero}`;
  let r = await a.sessao.funcao('nexo-nfe', { acao: 'emitir', modelo: 'nfce', ref, nfe: nfce });
  for (let i = 0; i < 10 && /processando/.test(r.status || ''); i++) { await espera(2500); r = await a.sessao.funcao('nexo-nfe', { acao: 'consultar', modelo: 'nfce', ref }); }
  if (r.status !== 'autorizado') throw new Error(`Cupom não autorizado: ${r.mensagem_sefaz || r.mensagem || (r.erros || []).map((e) => e.mensagem).join('; ') || r.status || 'erro'}`);
  return { numero: Number(r.numero), serie: r.serie, chave: r.chave_nfe, emissao: hoje(), danfe: r.caminho_danfe, qr: r.qrcode_url, real: true, ambiente: r.ambiente, ref };
}
function cupomHTML(a, v) {
  const c = cli(a, v.cliente), cfg = a.db.cfg;
  return `<div class="doc" style="max-width:340px;margin:0 auto;font-family:monospace;font-size:12px"><div style="text-align:center"><b style="font-size:14px">${esc(a.empresa)}</b><br>${esc(cfg.endereco || '')}<br>CNPJ ${esc(cfg.cnpj || '')}<br>Farm. resp.: ${esc(cfg.farmaceutico || '')} ${esc(cfg.crf || '')}</div>
    ${v.nfce?.real ? '' : '<div style="border:1px solid #111;text-align:center;margin:8px 0;padding:4px;font-weight:700">DEMONSTRAÇÃO · SEM VALOR FISCAL</div>'}
    <div style="text-align:center;margin:6px 0"><b>Documento Auxiliar da NFC-e</b></div><table style="width:100%"><tbody>${v.itens.map((x) => { const p = prod(a, x.produto); return `<tr><td colspan="3">${esc(p.nome)}${x.lotes?.length ? `<br><span style="color:#555">lote ${x.lotes.map((l) => esc(l.lote)).join(', ')}</span>` : ''}</td></tr><tr><td>${x.qtd} x ${moeda(x.preco)}</td><td></td><td style="text-align:right">${moeda(x.qtd * x.preco)}</td></tr>`; }).join('')}</tbody></table>
    <hr>${v.desconto ? `<div class="entre"><span>Desconto</span><span>−${moeda(v.desconto)}</span></div>` : ''}${v.entrega ? `<div class="entre"><span>Entrega</span><span>${moeda(v.entrega.taxa)}</span></div>` : ''}<div class="entre"><b>TOTAL</b><b>${moeda(totalV(v))}</b></div><div class="entre"><span>${esc(PAG[v.pagamento]?.[0] || '')}</span><span>${moeda(totalV(v))}</span></div><hr>
    <div>NFC-e nº ${v.nfce?.numero || '—'} série ${v.nfce?.serie || 1} · ${dataBR(v.data)} ${esc(v.hora || '')}</div><div style="word-break:break-all">Chave: ${esc(v.nfce?.chave || `3526${String(v.data).slice(2, 4)}${String(v.data).slice(5, 7)}${String(a.db.cfg.cnpj || '').replace(/\D/g, '').padStart(14, '0')}65001${String(v.nfce?.numero || 0).padStart(9, '0')}1${String(v.numero).padStart(8, '0')}`)}</div><div>Consumidor: ${esc(c?.nome || (v.cpf ? `CPF ${v.cpf}` : 'não identificado'))}</div></div>`;
}

// ---------------------------------------------------------------- fichas
const fichas = {
  venda(a, id) {
    const v = a.db.obter('vendas', id); if (!v) return null; const c = cli(a, v.cliente);
    return { html: ficha({ tipo: 'Venda no balcão', icone: 'cash-register', titulo: `Venda #${v.numero}`, avatar: av(c?.nome || 'Consumidor', 'g'), sub: `${v.status === 'cancelada' ? et('Cancelada', '') : et('Concluída', 'ok')}<span>${esc(c?.nome || 'Consumidor')}</span><b class="num" style="color:var(--tx)">· ${moeda(totalV(v))}</b>`,
      extra: `<div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn" data-acao="cupom" data-id="${id}">${ic('receipt')}Cupom fiscal</button>${v.entrega && c?.telefone ? `<a class="btn" target="_blank" rel="noopener" href="${telLink(c.telefone)}?text=${encodeURIComponent(`Olá, ${c.nome.split(' ')[0]}! O seu pedido da ${a.empresa} saiu para entrega. Total: ${moeda(totalV(v))} (${PAG[v.pagamento]?.[0]}).`)}">${ic('whatsapp-logo')}Avisar cliente</a>` : ''}</div>`,
      corpo: `<div class="gav-sec"><table class="tabela"><thead><tr><th>Produto</th><th class="n">Qtd.</th><th class="n">Total</th></tr></thead><tbody>${v.itens.map((x) => { const p = prod(a, x.produto); return `<tr><td><span class="prim">${esc(p?.nome || '')}</span><span class="sub mono">lote ${(x.lotes || []).map((l) => esc(l.lote)).join(', ') || '—'}${x.receita ? ` · <a href="javascript:void 0" data-abrir="receita:${x.receita}">receita ${a.db.obter('receitas', x.receita)?.numero || ''}</a>` : ''}</span></td><td class="n">${x.qtd}</td><td class="n">${moeda(x.qtd * x.preco)}</td></tr>`; }).join('')}</tbody><tfoot>${v.desconto ? `<tr><td colspan="2">Desconto</td><td class="n">−${moeda(v.desconto)}</td></tr>` : ''}${v.entrega ? `<tr><td colspan="2">Entrega</td><td class="n">${moeda(v.entrega.taxa)}</td></tr>` : ''}<tr><td colspan="2">Total</td><td class="n">${moeda(totalV(v))}</td></tr></tfoot></table></div>
        <div class="gav-sec">${props([['calendar-blank', 'Data', `${dataBR(v.data)} ${esc(v.hora || '')}`], ['user-circle', 'Atendente', esc(nomeA(v.atendente))], ['credit-card', 'Pagamento', `${esc(PAG[v.pagamento]?.[0] || '')}${v.convenio ? ` · ${esc(conv(a, v.convenio)?.nome || '')}` : ''}${v.autorizacao ? ` · autorização ${esc(v.autorizacao)}` : ''}${['convenio', 'crediario', 'farmpop'].includes(v.pagamento) ? ` · ${v.pago ? 'recebido' : 'a receber'}` : ''}`], v.nfce ? ['receipt', 'NFC-e', `<span class="mono">${v.nfce.numero}</span>${v.nfce.real ? '' : ' · demonstração'}`] : null, v.entrega ? ['motorcycle', 'Entrega', `${esc(v.entrega.endereco)} · ${esc((ST_ENT.find((s) => s[0] === v.entrega.status) || [])[1] || '')}`] : null])}</div>`,
      acoes: v.status === 'cancelada' ? '' : `<button type="button" class="btn fant peq ic-so" data-acao="menuV" data-id="${id}" aria-label="Mais">${ic('dots-three')}</button>` }), estreita: true };
  },
  receita(a, id) {
    const r = a.db.obter('receitas', id); if (!r) return null;
    return { estreita: true, html: ficha({ tipo: 'Receita retida', icone: 'prescription', titulo: `Receita ${r.numero}`, sub: `${etControle(r.controle)}<span>${esc(r.paciente)}</span>`,
      extra: `<div class="flex" style="margin-top:12px"><button type="button" class="btn" data-acao="imprimirReceita" data-id="${id}">${ic('printer')}Registro de dispensação</button>${r.venda ? `<button type="button" class="btn" data-abrir="venda:${r.venda}">${ic('cash-register')}Ver a venda</button>` : ''}</div>`,
      corpo: `<div class="gav-sec">${props([['file-text', 'Tipo', esc(r.tipo)], r.notificacao ? ['hash', 'Notificação', `<span class="mono">${esc(r.notificacao)}</span>`] : null, ['calendar-blank', 'Prescrita em', dataBR(r.data_prescricao)], ['calendar-check', 'Dispensada em', dataBR(r.data)], ['stethoscope', 'Prescritor', `${esc(r.prescritor)} · ${esc(r.conselho)} ${esc(r.registro)}/${esc(r.uf)}`], ['user', 'Paciente', esc(r.paciente)], ['identification-card', 'Comprador', `${esc(r.comprador)} · RG ${esc(r.comprador_doc)}`], ['map-pin', 'Endereço do comprador', esc(r.comprador_end || '—')], ['phone', 'Telefone', esc(r.comprador_tel || '—')]])}</div>
        <div class="gav-sec"><h4>Medicamentos dispensados</h4><table class="tabela"><thead><tr><th>Produto</th><th>Lote</th><th class="n">Qtd.</th></tr></thead><tbody>${r.itens.map((x) => `<tr><td>${esc(nomeCurto(prod(a, x.produto)))}</td><td class="mono">${esc(x.lote)}</td><td class="n">${x.qtd}</td></tr>`).join('')}</tbody></table></div>` }) };
  },
  servico(a, id) {
    const s = a.db.obter('servicos', id); if (!s) return null; const c = cli(a, s.cliente);
    return { estreita: true, html: ficha({ tipo: 'Serviço farmacêutico', icone: 'first-aid', titulo: esc(s.tipo), avatar: av(c?.nome || '?', 'g'), sub: `<span>${esc(c?.nome || '')}</span><span>· ${dataBR(s.data)} ${esc(s.hora || '')}</span>`,
      extra: `<div class="flex" style="margin-top:12px"><button type="button" class="btn pri" data-acao="declaracao" data-id="${id}">${ic('printer')}Declaração de serviço</button></div>`,
      corpo: `<div class="gav-sec">${props([['heartbeat', 'Resultado', esc(s.resultado || '—')], ['currency-circle-dollar', 'Valor', s.valor ? moeda(s.valor) : 'grátis'], ['user-circle', 'Responsável', esc(nomeA(s.farmaceutico))], ['chat-text', 'Orientação', esc(s.obs || '—')]])}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="servicos" data-id="${id}">${ic('pencil-simple')}Editar</button>` }) };
  },
  compra(a, id) {
    const c = a.db.obter('compras', id); if (!c) return null; const f = forn(a, c.fornecedor);
    return { html: ficha({ tipo: 'Pedido de compra', icone: 'truck', titulo: `Compra #${c.numero}`, avatar: av(f?.nome || '?', 'g'), sub: `<span>${esc(f?.nome || '')}</span><b class="num" style="color:var(--tx)">· ${moeda(totalC(c))}</b>`,
      extra: `<div class="flex" style="margin-top:12px;flex-wrap:wrap">${c.status === 'rascunho' ? `<button type="button" class="btn pri" data-acao="enviarCompra" data-id="${id}">${ic('envelope-simple')}Marcar como enviado</button>` : ''}${c.status === 'enviado' ? `<button type="button" class="btn pri ok" data-acao="receberCompra" data-id="${id}">${ic('package')}Receber (com lote e validade)</button>` : ''}${f?.telefone ? `<a class="btn" target="_blank" rel="noopener" href="${telLink(f.telefone)}?text=${encodeURIComponent(`Olá, ${f.contato}! Pedido da ${a.empresa}:\n${c.itens.map((x) => `• ${x.qtd} un ${prod(a, x.produto).nome}`).join('\n')}\nObrigado!`)}">${ic('whatsapp-logo')}Mandar pelo WhatsApp</a>` : ''}</div>`,
      corpo: `<div class="gav-sec"><table class="tabela"><thead><tr><th>Produto</th><th class="n">Pedido</th><th class="n">Recebido</th><th class="n">Custo</th></tr></thead><tbody>${c.itens.map((x) => `<tr><td>${esc(prod(a, x.produto)?.nome || '')}</td><td class="n">${x.qtd}</td><td class="n">${x.recebido}</td><td class="n">${moeda(x.custo)}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="3">Total</td><td class="n">${moeda(totalC(c))}</td></tr></tfoot></table></div>`,
      acoes: c.status === 'rascunho' ? `<button type="button" class="btn fant peq ic-so" data-acao="excluirCompra" data-id="${id}" aria-label="Excluir">${ic('trash')}</button>` : '' }) };
  },
  produto(a, id, aba = 'resumo') {
    const p = prod(a, id); if (!p) return null; const [sit, tom] = situacaoEst(p);
    const movs = a.db.lista('movimentos').filter((m) => m.produto === id).sort((x, y) => y.data.localeCompare(x.data));
    let corpo = '';
    if (aba === 'resumo') corpo = `<div class="gav-sec"><div class="grade g4" style="gap:8px">${[['Vendável', `${num(vendavel(p))} un`], ['Venda (30 dias)', `${num(vendidoQtd(a, id, 30))} un`], ['Cobertura', cobertura(a, p) >= 999 ? 'sem giro' : `${cobertura(a, p)} dias`], ['Margem', pct(((p.preco - p.custo) / p.preco) * 100)]].map(([t, v]) => `<div style="padding:10px;border:1px solid var(--borda);border-radius:8px"><div class="mute" style="font-size:12px">${t}</div><b class="num" style="font-size:15px">${v}</b></div>`).join('')}</div></div>
      <div class="gav-sec">${props([['flask', 'Princípio ativo', esc(p.principio || '—')], ['package', 'Apresentação', esc(p.apresentacao || '—')], ['buildings', 'Laboratório', esc(p.laboratorio || '—')], ['tag', 'Tipo e tarja', `${esc(p.tipo || '')} · ${esc(p.tarja || '')}`], p.controle ? ['prescription', 'Controle', `${esc(infoCtrl(p.controle)[0])} · exige ${esc(infoCtrl(p.controle)[1])}`] : null, ['seal-check', 'Registro Anvisa', `<span class="mono">${esc(p.registro_ms || '—')}</span>`], ['receipt', 'Preço · PMC', `${moeda(p.preco)} · ${p.pmc ? moeda(p.pmc) : '—'}`], ['currency-circle-dollar', 'Custo médio', moeda(p.custo)], p.dias_caixa ? ['heart', 'Uso contínuo', `a caixa dura ${p.dias_caixa} dias`] : null, p.termolabil ? ['thermometer', 'Armazenagem', 'Geladeira, entre 2 e 8 °C'] : null, ['map-pin', 'Localização', `<span class="mono">${esc(p.localizacao || '—')}</span>`], ['barcode', 'EAN', `<span class="mono">${esc(p.ean)}</span>`]])}</div>
      ${equivalentes(a, p).length ? `<div class="gav-sec"><h4>Mesmo princípio ativo e apresentação</h4><ul class="lista" style="margin:0 -20px">${equivalentes(a, p).map((e) => `<li class="clicavel" data-abrir="produto:${e.id}"><div class="cresce"><div class="t">${esc(e.nome)}</div><div class="s">${esc(e.tipo)} · ${esc(e.laboratorio)}</div></div><b class="num">${moeda(e.preco)}</b></li>`).join('')}</ul></div>` : ''}`;
    if (aba === 'lotes') corpo = `<div class="gav-sec">${(p.lotes || []).length ? `<table class="tabela"><thead><tr><th>Lote</th><th>Fabricação</th><th>Validade</th><th class="n">Qtd.</th><th></th></tr></thead><tbody>${[...p.lotes].sort((x, y) => x.validade.localeCompare(y.validade)).map((l) => { const [t, tm] = faixaVal(l.validade); return `<tr><td class="mono">${esc(l.lote)}</td><td>${dataBR(l.fab)}</td><td>${dataBR(l.validade)}${tm ? `<span class="sub">${et(t, tm, 'sem-ponto')}</span>` : ''}</td><td class="n">${num(l.qtd)}</td><td class="acoes">${l.qtd > 0 && diasAte(l.validade) < 0 ? `<button type="button" class="btn peq perigo" data-acao="baixaLote" data-p="${id}" data-l="${esc(l.lote)}">Baixa</button>` : ''}</td></tr>`; }).join('')}</tbody></table>` : vazio('stack', 'Sem lotes', 'Os lotes entram pela nota da distribuidora ou pelo recebimento da compra.')}
      <div class="flex" style="margin-top:12px"><button type="button" class="btn peq" data-acao="entradaManual" data-id="${id}">${ic('plus')}Entrada manual de lote</button></div></div>`;
    if (aba === 'forn') { const rk = ranking(a, id); corpo = `<div class="gav-sec">${rk.length ? `<table class="tabela"><thead><tr><th>Distribuidora</th><th class="n">Preço</th><th class="n">Prazo</th><th class="n">Nota</th><th></th></tr></thead><tbody>${rk.map((c, k) => `<tr><td><span class="prim">${esc(c.f?.nome || '—')}</span><span class="sub">${k === 0 ? et('Melhor opção', 'ok', 'sem-ponto') : ''}${c.fornecedor === p.fornecedor ? ` ${et('Atual', 'info', 'sem-ponto')}` : ''}</span></td><td class="n"><b>${moeda(c.preco)}</b></td><td class="n">${c.prazo} d</td><td class="n">${c.nota}</td><td class="acoes">${c.fornecedor === p.fornecedor ? '' : `<button type="button" class="btn peq" data-acao="usarForn" data-p="${id}" data-f="${c.fornecedor}">Usar</button>`}</td></tr>`).join('')}</tbody></table>` : vazio('truck', 'Sem cotações')}<div class="flex" style="margin-top:12px"><button type="button" class="btn" data-acao="novaCotacao" data-id="${id}">${ic('plus')}Registrar cotação</button></div></div>`; }
    if (aba === 'kardex' || aba === 'livro') corpo = `<div class="gav-sec">${movs.length ? `<table class="tabela"><thead><tr><th>Data</th><th>Movimento</th><th class="n">Qtd.</th></tr></thead><tbody>${movs.slice(0, 60).map((m) => `<tr><td>${dataCurta(m.data)}</td><td>${esc(m.motivo)}<span class="sub mono">lote ${esc(m.lote || '—')}</span></td><td class="n"><b class="${m.tipo === 'saida' || m.qtd < 0 ? 'er-tx' : 'ok-tx'}">${m.tipo === 'saida' ? '−' : m.qtd > 0 ? '+' : ''}${m.qtd}</b></td></tr>`).join('')}</tbody></table>` : vazio('stack', 'Sem movimentações')}</div>`;
    return { html: ficha({ tipo: 'Produto', icone: 'pill', titulo: esc(p.nome), sub: `${et(sit, tom)}${p.controle ? etControle(p.controle) : ''}<span>· ${moeda(p.preco)}</span>`,
      extra: `<div class="flex" style="margin-top:12px"><button type="button" class="btn peq" data-acao="ajustar" data-id="${id}">${ic('pencil-simple')}Ajuste ou perda</button><button type="button" class="btn peq" data-acao="etiquetaProd" data-id="${id}">${ic('printer')}Etiquetas</button></div>`,
      aba: aba === 'livro' ? 'kardex' : aba, abas: [['resumo', 'Resumo'], ['lotes', 'Lotes e validade', (p.lotes || []).filter((l) => l.qtd > 0).length], ['forn', 'Distribuidoras', ranking(a, id).length], ['kardex', 'Movimentações', movs.length]], corpo,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="produtos" data-id="${id}">${ic('pencil-simple')}Editar</button>` }), estreita: true, montar: (g) => (g.dataset.aba = aba) };
  },
  cliente(a, id) {
    const c = cli(a, id); if (!c) return null; const vs = validas(a).filter((v) => v.cliente === id).sort((x, y) => y.numero - x.numero), rc = recompras(a).filter((x) => x.cliente === id);
    return { estreita: true, html: ficha({ tipo: 'Cliente', icone: 'user', titulo: esc(c.nome), avatar: av(c.nome, 'gg'), sub: `<span class="mono">${esc(c.cpf || '')}</span>${c.convenio ? `<span>· ${esc(conv(a, c.convenio)?.nome || '')}</span>` : ''}`,
      corpo: `<div class="gav-sec">${props([['phone', 'WhatsApp', c.telefone ? `${esc(c.telefone)} · <a href="${telLink(c.telefone)}" target="_blank" rel="noopener">abrir</a>` : '—'], ['cake', 'Nascimento', c.nascimento ? dataBR(c.nascimento) : '—'], ['map-pin', 'Endereço', esc(c.endereco || '—')], ['notebook', 'Crediário', c.limite ? `limite ${moeda(c.limite)} · em aberto ${moeda(soma(emAberto(a).filter((v) => v.cliente === id && v.pagamento === 'crediario'), totalV))}` : 'não usa'], c.obs ? ['warning', 'Observações', esc(c.obs)] : null])}</div>
        ${rc.length ? `<div class="gav-sec"><h4>Uso contínuo</h4><ul class="lista" style="margin:0 -20px">${rc.map((x) => `<li><div class="cresce"><div class="t">${esc(nomeCurto(prod(a, x.produto)))}</div><div class="s">acaba ${dataCurta(x.quando)}</div></div></li>`).join('')}</ul></div>` : ''}
        <div class="gav-sec"><h4>Compras</h4>${vs.length ? `<ul class="lista" style="margin:0 -20px">${vs.slice(0, 12).map((v) => `<li class="clicavel" data-abrir="venda:${v.id}"><span class="mono mute-2">#${v.numero}</span><div class="cresce"><div class="s corta">${dataCurta(v.data)} · ${esc(v.itens.map((x) => nomeCurto(prod(a, x.produto))).join(', '))}</div></div><b class="num" style="min-width:80px;text-align:right">${moeda(totalV(v))}</b></li>`).join('')}</ul>` : vazio('shopping-cart', 'Sem compras')}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="clientes" data-id="${id}">${ic('pencil-simple')}Editar</button>` }) };
  },
  fornecedor(a, id) {
    const f = forn(a, id); if (!f) return null;
    return { estreita: true, html: ficha({ tipo: 'Distribuidora', icone: 'truck', titulo: esc(f.nome), avatar: av(f.nome, 'gg'), sub: `<span class="mono">${esc(f.doc || '')}</span>`,
      corpo: `<div class="gav-sec">${props([['user', 'Representante', esc(f.contato || '—')], ['phone', 'Telefone', esc(f.telefone || '—')], ['truck', 'Prazo', `${f.prazo} dias`], ['package', 'Produtos', String(a.db.lista('produtos').filter((p) => p.fornecedor === id).length)]])}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="fornecedores" data-id="${id}">${ic('pencil-simple')}Editar</button>` }) };
  },
};

// ---------------------------------------------------------------- XML da nota da distribuidora (com lote, validade, Anvisa e PMC)
function lerNFe(xml) {
  const d = new DOMParser().parseFromString(xml, 'application/xml');
  if (d.querySelector('parsererror')) throw new Error('arquivo não é um XML válido');
  const t = (el, tag) => el?.getElementsByTagName(tag)[0]?.textContent?.trim() || '';
  const inf = d.getElementsByTagName('infNFe')[0]; if (!inf) throw new Error('não é o XML de uma NF-e');
  const emit = inf.getElementsByTagName('emit')[0], ide = inf.getElementsByTagName('ide')[0], tot = inf.getElementsByTagName('ICMSTot')[0];
  const itens = [...inf.getElementsByTagName('det')].map((det) => { const pr = det.getElementsByTagName('prod')[0], ean = t(pr, 'cEAN'), med = pr.getElementsByTagName('med')[0];
    return { codigo: t(pr, 'cProd'), ean: /^\d{8,14}$/.test(ean) ? ean : '', nome: t(pr, 'xProd'), ncm: t(pr, 'NCM'), un: t(pr, 'uCom').toUpperCase(), qtd: Number(t(pr, 'qCom')) || 0, custo: Number(t(pr, 'vUnCom')) || 0, anvisa: med ? t(med, 'cProdANVISA') : '', pmc: med ? Number(t(med, 'vPMC')) || 0 : 0,
      lotes: [...pr.getElementsByTagName('rastro')].map((r) => ({ lote: t(r, 'nLote'), qtd: Number(t(r, 'qLote')) || 0, fab: t(r, 'dFab'), validade: t(r, 'dVal') })) }; });
  return { cnpj: t(emit, 'CNPJ'), fornecedor: t(emit, 'xNome'), fantasia: t(emit, 'xFant'), numero: t(ide, 'nNF'), data: (t(ide, 'dhEmi') || t(ide, 'dEmi')).slice(0, 10), frete: Number(t(tot, 'vFrete')) || 0, total: Number(t(tot, 'vNF')) || 0, itens };
}
const casarProduto = (a, it) => a.db.lista('produtos').find((x) => (it.ean && x.ean === it.ean) || (it.codigo && normal(x.sku) === normal(it.codigo))) || a.db.lista('produtos').find((x) => normal(x.nome) === normal(it.nome));
function xmlExemplo(a) {
  const f = a.db.lista('fornecedores')[0], ps = a.db.lista('produtos').filter((x) => x.fornecedor === f.id).slice(0, 3);
  const l = [...ps.map((x) => ({ c: x.sku, e: x.ean, n: x.nome, q: 20, v: x.custo, a: x.registro_ms, pmc: x.pmc, ncm: x.ncm })), { c: 'NOVO-77', e: '7891234567895', n: 'Atenolol 25 mg · 30 comp.', q: 30, v: 4.1, a: '1234567890123', pmc: 12.4, ncm: '30049069' }, { c: 'SORO-CX', e: '', n: 'Soro fisiológico 0,9% 500 ml CX C/24', q: 2, v: 74.4, a: '', pmc: 0, ncm: '30049099', u: 'CX' }];
  return `<?xml version="1.0" encoding="UTF-8"?><nfeProc><NFe><infNFe Id="NFe35261000000000000155550010000456781000045678" versao="4.00"><ide><nNF>45678</nNF><serie>1</serie><dhEmi>${hoje()}T08:10:00-03:00</dhEmi></ide>
<emit><CNPJ>${String(f.doc).replace(/\D/g, '')}</CNPJ><xNome>${f.nome}</xNome></emit>${l.map((x, i) => `<det nItem="${i + 1}"><prod><cProd>${x.c}</cProd><cEAN>${x.e}</cEAN><xProd>${x.n}</xProd><NCM>${x.ncm}</NCM><uCom>${x.u || 'UN'}</uCom><qCom>${x.q}.0000</qCom><vUnCom>${x.v.toFixed(2)}</vUnCom>
<rastro><nLote>EX${4100 + i}</nLote><qLote>${x.q}.000</qLote><dFab>${diaMais(-40)}</dFab><dVal>${diaMais(540 + i * 30)}</dVal></rastro>${x.a ? `<med><cProdANVISA>${x.a}</cProdANVISA><vPMC>${(x.pmc || 0).toFixed(2)}</vPMC></med>` : ''}</prod></det>`).join('')}
<total><ICMSTot><vFrete>0.00</vFrete><vNF>${l.reduce((s, x) => s + x.q * x.v, 0).toFixed(2)}</vNF></ICMSTot></total></infNFe></NFe></nfeProc>`;
}

// ---------------------------------------------------------------- aplicativo
const app = criarApp({
  id: 'farmacia', nome: 'Veltria Farmácia', sub: 'Drogaria completa', cor: '#0f766e', icone: 'pill', empresa: 'Drogaria Bem Viver', conta: 'Ribeirão Preto, SP',
  produto: { mensal: 149 }, semente, colecoes, fichas, buscaDica: 'remédios (nome, princípio ativo, EAN), clientes, receitas',
  modelos: [
    { id: 'drogaria', nome: 'Drogaria de bairro', desc: 'Balcão, convênios, uso contínuo e entregas', dados: {} },
    { id: 'manipulacao', nome: 'Farmácia com manipulação', desc: 'Inclui fórmulas como produto e o livro de controlados', dados: {} },
    { id: 'perfumaria', nome: 'Drogaria com perfumaria forte', desc: 'Etiquetas, curva ABC e promoções', dados: {} },
  ],
  passos: (a) => [{ id: 'xml', rot: 'Dê entrada em uma nota da distribuidora pelo XML (com lote e validade)', feito: a.db.lista('compras').some((c) => c.nf_cnpj), href: '#/compras' }, { id: 'resp', rot: 'Informe o farmacêutico responsável e o CRF em Configurações', feito: !!a.db.cfg.crf, href: '#/config' }],
  configExtra: (a) => {
    const cfg = a.db.cfg;
    const resp = `<div class="cartao"><div class="cartao-cab"><div><h3>Farmácia</h3><div class="sub">Aparece no cupom, nas receitas e na declaração de serviço</div></div></div><div class="cartao-corpo"><form class="form-grade" data-form-farm>
      <label class="campo">Farmacêutico responsável<input name="farmaceutico" value="${esc(cfg.farmaceutico || '')}"></label><label class="campo">CRF<input name="crf" value="${esc(cfg.crf || '')}" placeholder="CRF-SP 00.000"></label>
      <label class="campo">AFE (Anvisa)<input name="afe" value="${esc(cfg.afe || '')}"></label><label class="campo">Licença sanitária<input name="licenca" value="${esc(cfg.licenca || '')}"></label>
      <div class="campo largo" style="flex-direction:row;justify-content:flex-end"><button type="button" class="btn pri" data-acao="salvarFarm">Salvar</button></div></form></div></div>`;
    if (!a.nuvem) return `${resp}<div class="cartao"><div class="cartao-cab"><div><h3>Cupom fiscal (NFC-e)</h3><div class="sub">Autorizado pela SEFAZ</div></div></div><div class="cartao-corpo"><div class="dica">${ic('receipt')}<span>Na versão contratada, o caixa emite NFC-e de verdade pela Focus NFe, com código da Anvisa, PMC, lote e validade de cada medicamento. Nesta demonstração, os cupons são simulados.</span></div></div></div>`;
    if (!a.estado.nfeCarregando && !a.estado.nfe) { a.estado.nfeCarregando = true; a.sessao.funcao('nexo-nfe', { acao: 'status' }).then((r) => { a.estado.nfe = r; a.render(); }).catch(() => { a.estado.nfe = { configurado: false }; a.render(); }); }
    const n = a.estado.nfe || {};
    return `${resp}<div class="cartao"><div class="cartao-cab"><div><h3>Cupom fiscal (NFC-e pela Focus NFe)</h3><div class="sub">${n.configurado ? `Configurado · ${n.ambiente === 'producao' ? 'produção' : 'homologação (testes, sem valor fiscal)'}` : 'Não configurado: os cupons são simulados'}</div></div>${n.configurado ? et('Ativo', 'ok') : et('Pendente', 'al')}</div>
      <div class="cartao-corpo col" style="gap:12px">${a.sessao.dono ? `<div class="dica">${ic('info')}<span>Crie a conta da farmácia na <a href="https://focusnfe.com.br" target="_blank" rel="noopener">Focus NFe</a>, envie o certificado digital A1 e o CSC da NFC-e (pedido na SEFAZ) por lá e cole aqui o token. O token fica num cofre: nem a equipe consegue ver.</span></div>
        <form class="form-grade" data-nfe><label class="campo largo">Token da Focus NFe<input name="token" type="password" autocomplete="off" placeholder="${n.configurado ? '•••••••• (deixe em branco para manter)' : 'cole o token'}"></label>
        <label class="campo">Ambiente<select name="ambiente"><option value="homologacao" ${n.ambiente !== 'producao' ? 'selected' : ''}>Homologação (testes)</option><option value="producao" ${n.ambiente === 'producao' ? 'selected' : ''}>Produção (vale de verdade)</option></select></label>
        <div class="campo largo" style="flex-direction:row;justify-content:flex-end;gap:8px">${n.configurado ? '<button type="button" class="btn fant perigo" data-acao="desligarNFe">Desligar</button>' : ''}<button type="button" class="btn pri" data-acao="salvarNFe">Salvar</button></div></form>` : '<p class="mute-2">Só o dono configura a emissão de cupons.</p>'}
        <p class="mute" style="font-size:12.5px">Regime: Simples Nacional. O CSOSN (102 ou 500 com ST) fica no cadastro de cada produto: confirme com o seu contador. Comece em homologação e só passe para produção depois do primeiro cupom autorizado.</p></div></div>`;
  },
  equipe: [['Ana Paula Moreira', 'Farmacêutica responsável'], ['Bruno Costa', 'Balconista'], ['Carla Mendes', 'Balconista'], ['Diego Alves', 'Entregador']],
  busca: [{ colecao: 'produtos', grupo: 'Produtos', icone: 'pill', ficha: 'produto', rot: (p) => p.nome, sub: (p) => `${p.principio || ''} · ${p.laboratorio || ''}` }, { colecao: 'clientes', grupo: 'Clientes', icone: 'user', ficha: 'cliente', rot: (c) => c.nome, sub: (c) => c.cpf || '' }, { colecao: 'receitas', grupo: 'Receitas', icone: 'prescription', ficha: 'receita', rot: (r) => `Receita ${r.numero} · ${r.paciente}`, sub: (r) => r.prescritor }],
  comandos: [{ rot: 'Abrir o caixa', icone: 'cash-register', acao: (a) => a.ir('#/pdv') }, { rot: 'Novo atendimento farmacêutico', icone: 'first-aid', acao: (a) => a.acoes.novoCad({ c: 'servicos' }) }, { rot: 'Registrar temperatura da geladeira', icone: 'thermometer', acao: (a) => a.acoes.novoCad({ c: 'temperaturas' }) }, { rot: 'Novo produto', icone: 'pill', acao: (a) => a.acoes.novoProduto() }],
  paginas: [
    { id: 'painel', rot: 'Painel', icone: 'house', titulo: 'Visão geral', render: painel, atalho: 'i' },
    { grupo: 'Balcão' },
    { id: 'pdv', rot: 'Caixa', icone: 'cash-register', titulo: 'Caixa (frente de loja)', render: pdv, cheio: true, atalho: 'x' },
    { id: 'vendas', rot: 'Vendas', icone: 'receipt', render: vendas, atalho: 'v' },
    { id: 'clientes', rot: 'Clientes', icone: 'user', render: cadastroPag('clientes', 'cliente', 'clientes', 'cliente') },
    { id: 'continuo', rot: 'Uso contínuo', icone: 'heart', titulo: 'Uso contínuo: quem precisa voltar', render: continuo, cont: (a) => recompras(a).filter((x) => x.dias <= 0).length },
    { id: 'areceber', rot: 'Convênios e crediário', icone: 'buildings', render: areceber },
    { id: 'entregas', rot: 'Entregas', icone: 'motorcycle', render: entregas, cont: (a) => validas(a).filter((v) => v.entrega && v.entrega.status !== 'entregue').length },
    { grupo: 'Farmacêutico' },
    { id: 'receitas', rot: 'Receitas retidas', icone: 'prescription', render: receitasPag },
    { id: 'livro', rot: 'Livro de controlados', icone: 'book-open', titulo: 'Livro de controlados e antimicrobianos', render: livro },
    { id: 'validade', rot: 'Lotes e validade', icone: 'calendar-x', render: validade, cont: (a) => { const n = a.db.lista('produtos').flatMap((p) => p.lotes || []).filter((l) => l.qtd > 0 && l.validade < hoje()).length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'servicos', rot: 'Serviços farmacêuticos', icone: 'first-aid', render: servicosPag },
    { id: 'geladeira', rot: 'Geladeira', icone: 'thermometer', titulo: 'Temperatura da geladeira (termolábeis)', render: geladeira },
    { grupo: 'Estoque' },
    { id: 'produtos', rot: 'Produtos', icone: 'pill', render: produtos, atalho: 'p', novo: (a) => a.acoes.novoProduto() },
    { id: 'estoque', rot: 'Movimentações', icone: 'stack', render: estoque },
    { id: 'inventario', rot: 'Inventário', icone: 'list-checks', render: inventario },
    { id: 'abc', rot: 'Curva ABC', icone: 'chart-pie-slice', render: abc },
    { id: 'etiquetas', rot: 'Etiquetas', icone: 'barcode', titulo: 'Etiquetas de gôndola', render: etiquetas },
    { grupo: 'Compras' },
    { id: 'compras', rot: 'Pedidos e notas', icone: 'truck', render: compras, atalho: 'c' },
    { id: 'sugestao', rot: 'Sugestão de compra', icone: 'lightning', render: sugestao },
    { id: 'melhores', rot: 'Melhores distribuidoras', icone: 'seal-check', render: melhoresForn },
    { id: 'fornecedores', rot: 'Distribuidoras', icone: 'buildings', render: cadastroPag('fornecedores', 'distribuidora', 'distribuidoras', 'fornecedor') },
    { grupo: 'Gestão' },
    { id: 'relatorios', rot: 'Relatórios', icone: 'chart-bar', render: relatorios, atalho: 'r' },
    paginaEquipe(EQUIPE),
    ...ferramentaPaginas(FERR, FERR_ITENS),
  ],
});

const reab = () => { app.render(); app.reabrir(); };
const formModal = (titulo, corpo, rot = 'Salvar', largura = 560) => modal({ titulo, largura, corpo: `<form class="form-grade" onsubmit="return false">${corpo}</form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: rot, classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); if (!fm.reportValidity()) return false; return Object.fromEntries(new FormData(fm)); } }] });
const proxNumero = (col, campo = 'numero', min = 1) => Math.max(min, ...app.db.lista(col).map((x) => Number(x[campo]) || 0)) + 1;

/** Pede a receita de um item controlado. Devolve os dados ou null. */
async function pedirReceita(p, qtd, anterior = {}) {
  const [, tipo, dias] = infoCtrl(p.controle);
  const r = await modal({ titulo: `Receita · ${p.nome}`, largura: 640, corpo: `<div class="dica" style="margin-bottom:10px">${ic('prescription')}<span>${esc(infoCtrl(p.controle)[0])}: exige <b>${esc(tipo)}</b>, válida por ${dias} dias a partir da data da prescrição. A receita fica retida na farmácia.</span></div>
    <form class="form-grade" onsubmit="return false">${pedeNotificacao(p.controle) ? '<label class="campo">Número da notificação *<input name="notificacao" required></label>' : ''}<label class="campo">Data da prescrição *<input name="data_prescricao" type="date" required max="${hoje()}"></label>
    <label class="campo">Prescritor *<input name="prescritor" required value="${esc(anterior.prescritor || '')}"></label><label class="campo">Conselho<select name="conselho">${['CRM', 'CRO', 'CRMV', 'COREN'].map((c) => `<option ${c === anterior.conselho ? 'selected' : ''}>${c}</option>`).join('')}</select></label><label class="campo">Nº do registro *<input name="registro" required value="${esc(anterior.registro || '')}"></label><label class="campo">UF *<input name="uf" required maxlength="2" value="${esc(anterior.uf || 'SP')}"></label>
    <label class="campo largo">Paciente *<input name="paciente" required value="${esc(anterior.paciente || '')}"></label>
    <label class="campo">Comprador *<input name="comprador" required value="${esc(anterior.comprador || '')}"></label><label class="campo">RG do comprador *<input name="comprador_doc" required value="${esc(anterior.comprador_doc || '')}"></label><label class="campo">Telefone<input name="comprador_tel" value="${esc(anterior.comprador_tel || '')}"></label><label class="campo largo">Endereço do comprador *<input name="comprador_end" required value="${esc(anterior.comprador_end || '')}"></label></form>`,
    botoes: [{ rotulo: 'Cancelar a venda', valor: null, classe: 'fant' }, { rotulo: 'Registrar receita', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); if (!fm.reportValidity()) return false; const d = Object.fromEntries(new FormData(fm)); if (receitaVencida(p, d.data_prescricao)) { avisar(`Receita vencida: a validade é de ${dias} dias`, { tipo: 'erro' }); return false; } return d; } }] });
  return r ? { ...r, tipo, controle: p.controle } : null;
}

Object.assign(app.acoes, {
  // ------------------------------------------------ caixa
  irCaixa: () => app.ir('#/pdv'),
  pdvAdd: (d) => { const st = app.estado.pdv, p = prod(app, d.id); const ex = st.itens.find((x) => x.produto === p.id); const ja = ex?.qtd || 0;
    if (vendavel(p) <= ja) return avisar(estTotal(p) > vendavel(p) ? `${p.nome}: só há lote vencido, não pode ser vendido` : `${p.nome}: sem estoque`, { tipo: 'erro' });
    if (ex) ex.qtd++; else st.itens.push({ produto: p.id, qtd: 1, preco: p.pmc ? Math.min(p.preco, p.pmc) : p.preco, custo: p.custo }); app.render(); },
  pdvQtd: (d) => { const st = app.estado.pdv, it = st.itens[Number(d.i)], p = prod(app, it.produto); if (Number(d.d) > 0 && it.qtd >= vendavel(p)) return avisar(`Só há ${vendavel(p)} un vendáveis`, { tipo: 'erro' }); it.qtd += Number(d.d); if (it.qtd <= 0) st.itens.splice(Number(d.i), 1); app.render(); },
  pdvTrocar: (d) => { const st = app.estado.pdv, it = st.itens.find((x) => x.produto === d.de), p = prod(app, d.para); if (!it) return; Object.assign(it, { produto: p.id, preco: p.preco, custo: p.custo }); avisar(`Trocado por ${p.nome}`); app.render(); },
  pdvLimpar: () => { app.estado.pdv = { itens: [], desc: 0, pag: 'pix', cliente: '', cpf: '', autorizacao: '', entrega: false }; app.render(); },
  pdvDesc: (d, el) => { app.estado.pdv.desc = Math.max(0, Number(el.value) || 0); app.render(); },
  pdvPag: (d) => { app.estado.pdv.pag = d.p; app.render(); },
  pdvCliente: (d, el) => { const st = app.estado.pdv; st.cliente = el.value; const c = cli(app, el.value); if (!c?.convenio && st.pag === 'convenio') st.pag = 'pix'; if (!c?.limite && st.pag === 'crediario') st.pag = 'pix'; if (!c?.endereco) st.entrega = false; app.render(); },
  pdvCpf: (d, el) => { app.estado.pdv.cpf = el.value; },
  pdvAut: (d, el) => { app.estado.pdv.autorizacao = el.value; },
  pdvEntrega: (d, el) => { app.estado.pdv.entrega = el.checked; app.render(); },
  pdvFinalizar: async () => {
    const st = app.estado.pdv; if (!st.itens.length) return;
    if (st.pag === 'farmpop' && !st.autorizacao.trim()) return avisar('Informe o número da autorização do Farmácia Popular', { tipo: 'erro' });
    const c = st.cliente ? cli(app, st.cliente) : null, cv = st.pag === 'convenio' && c?.convenio ? conv(app, c.convenio) : null;
    const sub = soma(st.itens, (x) => x.qtd * x.preco), descConv = cv ? Math.round(sub * (cv.desconto / 100) * 100) / 100 : 0;
    if (st.pag === 'crediario') { const aberto = soma(emAberto(app).filter((v) => v.cliente === c.id && v.pagamento === 'crediario'), totalV); if (aberto + sub - st.desc > c.limite) return avisar(`Passa do limite do crediário: em aberto ${moeda(aberto)} de ${moeda(c.limite)}`, { tipo: 'erro' }); }
    // receitas dos controlados (uma por item; os dados do comprador se repetem)
    const recs = {}; let ant = c ? { paciente: c.nome, comprador: c.nome, comprador_tel: c.telefone, comprador_end: c.endereco } : {};
    for (const x of st.itens) { const p = prod(app, x.produto); if (!p.controle) continue; const r = await pedirReceita(p, x.qtd, ant); if (!r) return avisar('Venda não finalizada: falta a receita', { tipo: 'erro' }); recs[x.produto] = r; ant = r; }
    const numero = proxNumero('vendas', 'numero', 52000), hora = agoraISO().slice(11, 16);
    const itens = st.itens.map((x) => ({ ...x }));
    const v = app.db.salvar('vendas', { numero, data: hoje(), hora, cliente: c?.id || null, cpf: c ? '' : st.cpf, atendente: app.nuvem ? (ATEND[0]?.[0] || '') : 'bruno', itens, desconto: Math.round((st.desc + descConv) * 100) / 100, pagamento: st.pag, convenio: cv?.id || '', autorizacao: st.pag === 'farmpop' ? st.autorizacao.trim() : '', status: 'concluida', pago: !['convenio', 'crediario', 'farmpop'].includes(st.pag), ...(st.entrega && c?.endereco ? { entrega: { endereco: c.endereco, taxa: 5, status: 'separando', entregador: '' } } : {}) });
    // baixa por lote (FEFO) e livro de controlados
    itens.forEach((x) => { const p = prod(app, x.produto); let rid = null;
      if (recs[x.produto]) { const rr = recs[x.produto]; const rc = app.db.salvar('receitas', { numero: proxNumero('receitas'), data: hoje(), venda: v.id, ...rr, itens: [] }); rid = rc.id; }
      x.lotes = movimentar(app, { produto: x.produto, qtd: x.qtd, tipo: 'saida', motivo: `Venda ${numero}${rid ? ` · receita ${app.db.obter('receitas', rid).numero}` : ''}`, receita: rid });
      if (rid) { x.receita = rid; app.db.salvar('receitas', { id: rid, itens: x.lotes.map((l) => ({ produto: p.id, lote: l.lote, qtd: l.qtd })) }); } });
    app.db.salvar('vendas', { id: v.id, itens });
    // cupom fiscal
    let nfce = null;
    if (app.nuvem && app.estado.nfe?.configurado) { try { avisar('Emitindo o cupom fiscal…', { tempo: 2500 }); nfce = await emitirNFCe(app, app.db.obter('vendas', v.id)); } catch (e) { avisar(`${e.message}. A venda ficou salva: emita o cupom de novo pela venda.`, { tipo: 'erro', tempo: 12000 }); } }
    else nfce = cupomSimulado(app, v);
    if (nfce) app.db.salvar('vendas', { id: v.id, nfce });
    app.estado.pdv = { itens: [], desc: 0, pag: 'pix', cliente: '', cpf: '', autorizacao: '', entrega: false };
    avisar(`Venda #${numero} · ${moeda(totalV(app.db.obter('vendas', v.id)))} · ${PAG[st.pag][0]}${nfce ? ` · NFC-e ${nfce.numero}` : ''}`, { tempo: 6000 }); app.render();
  },
  cupom: async (d) => { const v = app.db.obter('vendas', d.id);
    if (!v.nfce && app.nuvem && app.estado.nfe?.configurado) { try { const n = await emitirNFCe(app, v); app.db.salvar('vendas', { id: v.id, nfce: n }); reab(); } catch (e) { return avisar(e.message, { tipo: 'erro', tempo: 10000 }); } }
    const vv = app.db.obter('vendas', d.id); if (vv.nfce?.danfe) window.open(vv.nfce.danfe, '_blank', 'noopener'); else imprimir(cupomHTML(app, vv)); },
  menuV: (d, el) => pop(el, [{ rotulo: 'Cancelar venda (devolve ao estoque)', icone: 'x-circle', perigo: true, acao: async () => {
    if (!(await confirmar('Cancelar esta venda? Os produtos voltam para os mesmos lotes. Se o cupom já foi autorizado, cancele também na Focus NFe (até 30 minutos).', { rotulo: 'Cancelar venda', perigo: true }))) return;
    const v = app.db.obter('vendas', d.id); v.itens.forEach((x) => (x.lotes || []).forEach((l) => movimentar(app, { produto: x.produto, lote: l.lote, qtd: l.qtd, tipo: 'entrada', motivo: `Cancelamento da venda ${v.numero}` })));
    app.db.salvar('vendas', { id: d.id, status: 'cancelada' }); app.db.registrar(`vendas:${d.id}`, 'Venda cancelada', { icone: 'x-circle', tom: 'er' }); reab(); } }]),
  // ------------------------------------------------ farmacêutico
  livroMes: (d, el) => { app.estado.livro.mes = el.value; app.render(); },
  livroCsv: () => { const st = app.estado.livro, ini = `${st.mes}-01`, fim = `${mesMais(1, ini)}-01`;
    const ms = app.db.lista('movimentos').filter((m) => prod(app, m.produto)?.controle && m.data.slice(0, 10) >= ini && m.data.slice(0, 10) < fim).sort((x, y) => x.data.localeCompare(y.data));
    const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const linhasCsv = [['Data', 'Produto', 'Princípio ativo', 'Lista', 'Registro Anvisa', 'Lote', 'Tipo', 'Quantidade', 'Motivo', 'Receita', 'Notificação', 'Prescritor', 'Conselho', 'Registro', 'UF', 'Paciente', 'Comprador', 'RG do comprador'].map(q).join(';'),
      ...ms.map((m) => { const p = prod(app, m.produto), r = m.receita ? app.db.obter('receitas', m.receita) : null; return [dataBR(m.data), p.nome, p.principio, p.controle, p.registro_ms, m.lote, m.tipo, m.tipo === 'saida' ? -m.qtd : m.qtd, m.motivo, r?.numero, r?.notificacao, r?.prescritor, r?.conselho, r?.registro, r?.uf, r?.paciente, r?.comprador, r?.comprador_doc].map(q).join(';'); })];
    baixar(`livro-controlados-${st.mes}.csv`, `﻿${linhasCsv.join('\n')}`, 'text/csv'); avisar(`${ms.length} movimentações exportadas`); },
  livroImprimir: () => { const st = app.estado.livro; const el = document.querySelector('.tabela'); imprimir(`<div class="doc"><h1>Livro de controlados · ${esc(nomeMes(st.mes, true))}</h1><div style="color:#555">${esc(app.empresa)} · ${esc(app.db.cfg.cnpj || '')} · Farmacêutico responsável: ${esc(app.db.cfg.farmaceutico || '')} ${esc(app.db.cfg.crf || '')} · AFE ${esc(app.db.cfg.afe || '')}</div>${el ? el.outerHTML : ''}<div class="ass"><div>${esc(app.db.cfg.farmaceutico || 'Farmacêutico responsável')}</div></div></div>`); },
  imprimirReceita: (d) => { const r = app.db.obter('receitas', d.id), cfg = app.db.cfg; imprimir(`<div class="doc"><h1>Registro de dispensação · receita ${r.numero}</h1><div style="color:#555">${esc(app.empresa)} · ${esc(cfg.cnpj || '')} · ${esc(cfg.endereco || '')}</div>
    <table style="margin-top:10px"><tbody>${[['Tipo de receita', r.tipo], ['Notificação', r.notificacao || '—'], ['Data da prescrição', dataBR(r.data_prescricao)], ['Data da dispensação', dataBR(r.data)], ['Prescritor', `${r.prescritor} · ${r.conselho} ${r.registro}/${r.uf}`], ['Paciente', r.paciente], ['Comprador', `${r.comprador} · RG ${r.comprador_doc}`], ['Endereço do comprador', r.comprador_end], ['Telefone', r.comprador_tel || '—']].map(([k, v]) => `<tr><td style="width:200px"><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
    <h2>Medicamentos</h2><table><thead><tr><th>Produto</th><th>Registro Anvisa</th><th>Lote</th><th class="n">Qtd.</th></tr></thead><tbody>${r.itens.map((x) => { const p = prod(app, x.produto); return `<tr><td>${esc(p?.nome || '')}</td><td>${esc(p?.registro_ms || '')}</td><td>${esc(x.lote)}</td><td class="n">${x.qtd}</td></tr>`; }).join('')}</tbody></table>
    <div class="ass"><div>${esc(cfg.farmaceutico || 'Farmacêutico responsável')} · ${esc(cfg.crf || '')}</div><div>${esc(r.comprador)}</div></div></div>`); },
  declaracao: (d) => { const s = app.db.obter('servicos', d.id), c = cli(app, s.cliente), cfg = app.db.cfg; imprimir(`<div class="doc"><h1>Declaração de Serviço Farmacêutico</h1><div style="color:#555">${esc(app.empresa)} · CNPJ ${esc(cfg.cnpj || '')} · ${esc(cfg.endereco || '')} · ${esc(cfg.licenca || '')}</div>
    <table style="margin-top:12px"><tbody>${[['Paciente', c?.nome || ''], ['Data e hora', `${dataBR(s.data)} ${s.hora || ''}`], ['Serviço', s.tipo], ['Resultado', s.resultado || '—'], ['Orientação farmacêutica', s.obs || '—'], ['Valor', s.valor ? moeda(s.valor) : 'gratuito']].map(([k, v]) => `<tr><td style="width:200px"><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
    <p style="margin-top:12px;color:#444">Este serviço não substitui a consulta médica. Em caso de valores alterados, procure o seu médico.</p><div class="ass"><div>${esc(cfg.farmaceutico || '')} · ${esc(cfg.crf || '')}</div><div>${esc(c?.nome || 'Paciente')}</div></div></div>`); },
  imprimirTemp: () => { const ym = hoje().slice(0, 7), l = app.db.lista('temperaturas').filter((t) => t.data.startsWith(ym)).sort((x, y) => `${x.data}${x.hora}`.localeCompare(`${y.data}${y.hora}`));
    imprimir(`<div class="doc"><h1>Controle de temperatura · ${esc(nomeMes(ym, true))}</h1><div style="color:#555">${esc(app.empresa)} · faixa 2 °C a 8 °C</div><table style="margin-top:10px"><thead><tr><th>Data</th><th>Hora</th><th class="n">Atual</th><th class="n">Mín.</th><th class="n">Máx.</th><th>Responsável</th><th>Ação</th></tr></thead><tbody>${l.map((t) => `<tr><td>${dataBR(t.data)}</td><td>${esc(t.hora)}</td><td class="n">${num(t.atual, 1)}</td><td class="n">${num(t.minima, 1)}</td><td class="n">${num(t.maxima, 1)}</td><td>${esc(nomeA(t.responsavel))}</td><td>${esc(t.acao || '')}</td></tr>`).join('')}</tbody></table><div class="ass"><div>${esc(app.db.cfg.farmaceutico || 'Farmacêutico responsável')}</div></div></div>`); },
  baixaLote: async (d) => { const p = prod(app, d.p), l = p.lotes.find((x) => x.lote === d.l); if (!l) return;
    if (!(await confirmar(`Dar baixa de ${l.qtd} un do lote ${l.lote} (${p.nome}) por vencimento?${p.controle ? ' Como é controlado, a perda entra no livro.' : ''}`, { rotulo: 'Dar baixa', perigo: true }))) return;
    movimentar(app, { produto: p.id, lote: l.lote, qtd: -l.qtd, tipo: 'ajuste', motivo: `Perda por vencimento (validade ${dataBR(l.validade)})` }); avisar('Baixa registrada'); reab(); },
  devolverLote: async (d) => { const p = prod(app, d.p), l = p.lotes.find((x) => x.lote === d.l); const r = await formModal(`Devolver à distribuidora · ${p.nome}`, `<label class="campo">Quantidade<input name="q" type="number" min="1" max="${l.qtd}" value="${l.qtd}" required></label><label class="campo largo">Motivo<input name="m" value="Troca por validade curta"></label>`, 'Registrar devolução');
    if (!r) return; movimentar(app, { produto: p.id, lote: l.lote, qtd: Math.min(l.qtd, Number(r.q)), tipo: 'saida', motivo: `Devolução a ${forn(app, p.fornecedor)?.nome || 'distribuidora'}: ${r.m}` }); avisar('Devolução registrada'); reab(); },
  entradaManual: async (d) => { const p = prod(app, d.id); const r = await formModal(`Entrada de lote · ${p.nome}`, `<label class="campo">Lote<input name="lote" required></label><label class="campo">Quantidade<input name="q" type="number" min="1" required></label><label class="campo">Fabricação<input name="fab" type="date" required></label><label class="campo">Validade<input name="val" type="date" required></label><label class="campo largo">Motivo<input name="m" value="Entrada manual"></label>`, 'Dar entrada');
    if (!r) return; if (r.val <= r.fab) return avisar('A validade precisa ser depois da fabricação', { tipo: 'erro' }); movimentar(app, { produto: p.id, lote: r.lote.trim(), qtd: Number(r.q), tipo: 'entrada', motivo: r.m, validade: r.val, fab: r.fab }); avisar('Lote lançado'); reab(); },
  salvarFarm: () => { const f = document.querySelector('[data-form-farm]'); Object.assign(app.db.cfg, Object.fromEntries(new FormData(f))); app.db.gravar(); avisar('Dados da farmácia salvos'); app.render(); },
  // ------------------------------------------------ a receber e entregas
  fecharConv: async (d) => { const c = conv(app, d.id), l = emAberto(app).filter((v) => v.convenio === d.id);
    if (!(await confirmar(`Fechar ${l.length} compras de ${c.nome} (${moeda(soma(l, totalV))})? O extrato abre para imprimir e mandar à empresa.`, { rotulo: 'Fechar e imprimir' }))) return;
    imprimir(`<div class="doc"><h1>Extrato do convênio · ${esc(c.nome)}</h1><div style="color:#555">${esc(app.empresa)} · fechamento em ${dataBR(hoje())} · desconto de ${c.desconto}% já aplicado</div><table style="margin-top:10px"><thead><tr><th>Data</th><th>Funcionário</th><th>Venda</th><th class="n">Valor</th></tr></thead><tbody>${l.map((v) => `<tr><td>${dataBR(v.data)}</td><td>${esc(cli(app, v.cliente)?.nome || '')}</td><td>#${v.numero}</td><td class="n">${moeda(totalV(v))}</td></tr>`).join('')}<tr><td colspan="3"><b>Total</b></td><td class="n"><b>${moeda(soma(l, totalV))}</b></td></tr></tbody></table></div>`);
    l.forEach((v) => app.db.salvar('vendas', { id: v.id, pago: true, fechado_em: hoje() })); avisar('Convênio fechado'); app.render(); },
  receberCred: async (d) => { const c = cli(app, d.id), l = emAberto(app).filter((v) => v.cliente === d.id && v.pagamento === 'crediario');
    if (!(await confirmar(`Receber ${moeda(soma(l, totalV))} de ${c.nome}?`, { rotulo: 'Recebido' }))) return; l.forEach((v) => app.db.salvar('vendas', { id: v.id, pago: true, recebido_em: hoje() })); avisar('Crediário quitado'); app.render(); },
  receberFP: async () => { const l = emAberto(app).filter((v) => v.pagamento === 'farmpop'); if (!(await confirmar(`Marcar ${l.length} vendas do Farmácia Popular como recebidas (${moeda(soma(l, totalV))})?`, { rotulo: 'Recebido' }))) return; l.forEach((v) => app.db.salvar('vendas', { id: v.id, pago: true, recebido_em: hoje() })); app.render(); },
  entregaSaiu: (d) => { const v = app.db.obter('vendas', d.id); app.db.salvar('vendas', { id: d.id, entrega: { ...v.entrega, status: 'saiu' } }); const c = cli(app, v.cliente);
    if (c?.telefone) window.open(`${telLink(c.telefone)}?text=${encodeURIComponent(`Olá, ${c.nome.split(' ')[0]}! O seu pedido da ${app.empresa} saiu para entrega agora. Total: ${moeda(totalV(v))}.`)}`, '_blank', 'noopener'); app.render(); },
  entregaOk: (d) => { const v = app.db.obter('vendas', d.id); app.db.salvar('vendas', { id: d.id, entrega: { ...v.entrega, status: 'entregue' } }); avisar(`Entrega da venda #${v.numero} concluída`); app.render(); },
  // ------------------------------------------------ compras
  xmlExemplo: () => { baixar('nfe-distribuidora-exemplo.xml', xmlExemplo(app), 'application/xml'); avisar('XML de exemplo baixado. Agora clique em "Importar XML da nota".'); },
  importarXML: (d, el) => {
    const arq = el.files?.[0]; if (!arq) return; const rd = new FileReader();
    rd.onload = async () => {
      let nf; try { nf = lerNFe(String(rd.result)); } catch (e) { avisar(`Não deu para ler a nota: ${e.message}`, { tipo: 'erro' }); return; }
      if (app.db.lista('compras').some((c) => c.nf === nf.numero && c.nf_cnpj === nf.cnpj)) { avisar(`A nota ${nf.numero} já foi lançada`, { tipo: 'erro' }); return; }
      const f = app.db.lista('fornecedores').find((x) => String(x.doc).replace(/\D/g, '') === nf.cnpj), ls = nf.itens.map((it) => ({ it, p: casarProduto(app, it) }));
      const todos = app.db.lista('produtos').sort((x, y) => x.nome.localeCompare(y.nome));
      const r = await conferirNota(app, { titulo: `Nota ${nf.numero} · ${nf.fantasia || nf.fornecedor}`, cnpj: nf.cnpj, margem: 45,
        dica: `${f ? `Distribuidora <b>${esc(f.nome)}</b>` : `Distribuidora nova: <b>${esc(nf.fornecedor)}</b> (será cadastrada)`} · ${dataBR(nf.data)} · ${moeda(nf.total)}. Lote e validade vêm da própria nota.`,
        linhas: ls.map(({ it, p: pr }) => ({ nome: it.nome, codigo: it.codigo, ean: it.ean, qtd: it.qtd, un: it.un, custo: it.custo, pmc: it.pmc || pr?.pmc || 0, preco: pr?.preco || 0, unidadeVenda: 'un',
          extra: it.lotes.length ? it.lotes.map((l) => `lote ${esc(l.lote)} · ${dataBR(l.validade)}`).join(', ') : '<span class="al-tx">sem lote na nota</span>',
          produtos: `${pr ? '' : '<option value="novo">+ Cadastrar como produto novo</option>'}${todos.map((x) => `<option value="${x.id}" ${pr?.id === x.id ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}${pr ? '<option value="novo">+ Cadastrar como produto novo</option>' : ''}` })) });
      if (!r) return;
      const fo = f || app.db.salvar('fornecedores', { nome: nf.fantasia || nf.fornecedor, doc: nf.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'), telefone: '', contato: '', prazo: 1 });
      let novos = 0;
      const itens = ls.map(({ it }, i) => {
        const c = r[i]; let pid = c.produto;
        if (pid === 'novo') { pid = app.db.salvar('produtos', { nome: it.nome, sku: it.codigo, ean: it.ean, ncm: it.ncm, registro_ms: it.anvisa, pmc: it.pmc || 0, categoria: /^300[34]/.test(it.ncm) ? 'Medicamentos' : 'Perfumaria', tipo: /^300[34]/.test(it.ncm) ? 'Genérico' : 'Perfumaria e higiene', tarja: 'Sem tarja', controle: '', fornecedor: fo.id, custo: c.custo, preco: c.preco, minimo: 3, lotes: [], cfop: '5102', csosn: '102' }).id; novos++; }
        else app.db.salvar('produtos', { id: pid, ...(it.anvisa ? { registro_ms: it.anvisa } : {}), ...(it.pmc ? { pmc: it.pmc } : {}), ...(c.preco ? { preco: c.preco } : {}) });
        const lotes = it.lotes.length ? it.lotes : [{ lote: '', qtd: it.qtd, validade: '', fab: '' }];
        lotes.forEach((l) => movimentar(app, { produto: pid, lote: l.lote, qtd: (l.qtd || it.qtd) * c.fator, tipo: 'entrada', motivo: `NF-e ${nf.numero} · ${fo.nome}${c.fator > 1 ? ` (${c.fator} un por embalagem)` : ''}`, custo: c.custo, validade: l.validade, fab: l.fab }));
        return { produto: pid, qtd: c.entra, custo: c.custo, recebido: c.entra };
      });
      app.db.salvar('compras', { numero: proxNumero('compras', 'numero', 100), fornecedor: fo.id, data: nf.data || hoje(), previsao: nf.data || hoje(), status: 'recebido', itens, frete: nf.frete, nf: nf.numero, nf_cnpj: nf.cnpj });
      avisar(`Nota ${nf.numero} lançada: ${itens.length} itens com lote e validade${novos ? `, ${novos} produto${novos > 1 ? 's' : ''} novo${novos > 1 ? 's' : ''} (confira tarja e controle)` : ''}`, { tempo: 7000 }); app.render();
    };
    rd.readAsText(arq); el.value = '';
  },
  novaCompra: async () => { const r = await formModal('Novo pedido de compra', `<label class="campo largo">Distribuidora<select name="f">${app.db.lista('fornecedores').map((f) => `<option value="${f.id}">${esc(f.nome)}</option>`).join('')}</select></label>`, 'Criar', 480);
    if (!r) return; const f = forn(app, r.f); const c = app.db.salvar('compras', { numero: proxNumero('compras', 'numero', 100), fornecedor: r.f, data: hoje(), previsao: diaMais(f.prazo), status: 'rascunho', frete: 0, itens: app.db.lista('produtos').filter((p) => p.fornecedor === r.f && vendavel(p) <= p.minimo).map((p) => ({ produto: p.id, qtd: Math.max(1, p.minimo * 2 - vendavel(p)), custo: p.custo, recebido: 0 })) });
    app.render(); app.abrir('compra', c.id); },
  gerarCompra: (d) => { const f = forn(app, d.f); const ps = app.db.lista('produtos').filter((p) => (melhorForn(app, p.id)?.fornecedor || p.fornecedor) === d.f).map((p) => ({ p, q: Math.max(0, Math.ceil((vendidoQtd(app, p.id, 30) / 30) * 15 + p.minimo) - vendavel(p)) })).filter((x) => x.q > 0 && vendavel(x.p) <= x.p.minimo + 2);
    const c = app.db.salvar('compras', { numero: proxNumero('compras', 'numero', 100), fornecedor: d.f, data: hoje(), previsao: diaMais(f.prazo), status: 'rascunho', frete: 0, itens: ps.map((x) => ({ produto: x.p.id, qtd: x.q, custo: app.db.lista('cotacoes').find((q) => q.produto === x.p.id && q.fornecedor === d.f)?.preco || x.p.custo, recebido: 0 })) });
    avisar(`Pedido #${c.numero} criado com ${ps.length} produtos`); app.ir('#/compras'); setTimeout(() => app.abrir('compra', c.id), 50); },
  enviarCompra: (d) => { app.db.salvar('compras', { id: d.id, status: 'enviado', data: hoje() }); avisar('Pedido marcado como enviado'); reab(); },
  excluirCompra: (d) => excluir(app, 'compras', d.id),
  receberCompra: async (d) => { const c = app.db.obter('compras', d.id);
    const r = await modal({ titulo: `Receber compra #${c.numero}`, largura: 760, corpo: `<div class="dica" style="margin-bottom:12px">${ic('info')}<span>Prefira importar o XML da nota: lote e validade vêm sozinhos. Aqui, digite o lote e as datas que estão na caixa.</span></div><table class="tabela"><thead><tr><th>Produto</th><th class="n" style="width:80px">Chegou</th><th>Lote</th><th>Fabricação</th><th>Validade</th></tr></thead><tbody>${c.itens.map((x, k) => `<tr><td>${esc(prod(app, x.produto).nome)}</td><td><input type="number" min="0" value="${x.qtd - x.recebido}" data-k="${k}" data-c="q" style="height:28px;text-align:right"></td><td><input data-k="${k}" data-c="lote" style="height:28px"></td><td><input type="date" data-k="${k}" data-c="fab" style="height:28px"></td><td><input type="date" data-k="${k}" data-c="val" style="height:28px"></td></tr>`).join('')}</tbody></table>`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Dar entrada', classe: 'pri ok', acao: (f) => { const o = c.itens.map(() => ({})); f.querySelectorAll('[data-k]').forEach((i) => { o[Number(i.dataset.k)][i.dataset.c] = i.value; }); const ruim = o.find((x) => Number(x.q) > 0 && (!x.lote || !x.val || !x.fab)); if (ruim) { avisar('Preencha lote, fabricação e validade dos itens que chegaram', { tipo: 'erro' }); return false; } return o; } }] });
    if (!r) return;
    const itens = c.itens.map((x, k) => { const q = Math.min(Number(r[k].q) || 0, x.qtd - x.recebido); if (q > 0) movimentar(app, { produto: x.produto, lote: r[k].lote.trim(), qtd: q, tipo: 'entrada', motivo: `Compra #${c.numero}`, custo: x.custo, validade: r[k].val, fab: r[k].fab }); return { ...x, recebido: x.recebido + q }; });
    app.db.salvar('compras', { id: d.id, itens, status: itens.every((x) => x.recebido >= x.qtd) ? 'recebido' : 'enviado' }); avisar('Mercadoria recebida'); reab(); },
  usarForn: (d) => { const p = prod(app, d.p), f = forn(app, d.f); app.db.salvar('produtos', { id: d.p, fornecedor: d.f }); avisar(`${p.nome}: agora com ${f.nome}`); reab(); },
  novaCotacao: async (d) => { if (await editar(app, 'cotacoes', null, { produto: d.id })) reab(); },
  // ------------------------------------------------ estoque
  novoProduto: async () => { const p = await editar(app, 'produtos'); if (p) { app.render(); app.abrir('produto', p.id, 'lotes'); } },
  novoCad: async (d) => { if (await editar(app, d.c)) app.render(); },
  editarCad: async (d) => { if (await editar(app, d.c, app.db.obter(d.c, d.id))) reab(); },
  ajustar: async (d = {}) => { const ps = app.db.lista('produtos'), p0 = prod(app, d.id) || ps[0];
    const r = await formModal('Ajuste ou perda de estoque', `<label class="campo largo">Produto<select name="p">${ps.map((p) => `<option value="${p.id}" ${p.id === p0.id ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></label><label class="campo">Lote<input name="l" value="${esc(lotesFEFO(p0)[0]?.lote || p0.lotes?.[0]?.lote || '')}" required></label><label class="campo">Quantidade (+ entra, − sai)<input type="number" name="q" value="-1" required></label><label class="campo largo">Motivo<select name="m"><option>Perda: avaria ou quebra</option><option>Perda: vencimento</option><option>Furto ou extravio</option><option>Correção de contagem</option><option>Uso em serviço farmacêutico</option></select></label>`, 'Registrar');
    if (!r || !Number(r.q)) return; const p = prod(app, r.p); if (!p.lotes.some((l) => l.lote === r.l)) return avisar('Lote não encontrado neste produto', { tipo: 'erro' });
    movimentar(app, { produto: r.p, lote: r.l, qtd: Number(r.q), tipo: 'ajuste', motivo: r.m }); avisar(p.controle ? 'Registrado (entra no livro de controlados)' : 'Estoque ajustado'); reab(); },
  invCat: (d, el) => { app.estado.inv.cat = el.value; app.estado.inv.cont = {}; app.render(); },
  invCont: (d, el) => { app.estado.inv.cont[d.id] = el.value; app.render(); },
  aplicarInv: async () => { const st = app.estado.inv; const ls = Object.entries(st.cont).filter(([, v]) => v !== '').map(([k, v]) => { const [pid, lote] = k.split('|'); const l = prod(app, pid).lotes.find((x) => x.lote === lote); return { pid, lote, d: Number(v) - (l?.qtd || 0) }; }).filter((x) => x.d);
    if (!(await confirmar(`Aplicar ${ls.length} ajustes de inventário?`, { rotulo: 'Aplicar' }))) return; ls.forEach((x) => movimentar(app, { produto: x.pid, lote: x.lote, qtd: x.d, tipo: 'ajuste', motivo: `Inventário ${dataBR(hoje())}` })); st.cont = {}; avisar(`${ls.length} ajustes aplicados`); app.render(); },
  imprimirInv: () => { const st = app.estado.inv; imprimir(`<div class="doc"><h1>Folha de contagem · ${esc(st.cat)}</h1><div style="color:#555">${dataBR(hoje())} · conferente: ______________________</div><table style="margin-top:12px"><thead><tr><th>Local</th><th>Produto</th><th>Lote</th><th>Validade</th><th style="width:110px">Contado</th></tr></thead><tbody>${app.db.lista('produtos').filter((p) => p.categoria === st.cat).flatMap((p) => (p.lotes || []).filter((l) => l.qtd > 0).map((l) => `<tr><td>${esc(p.localizacao || '')}</td><td>${esc(p.nome)}</td><td>${esc(l.lote)}</td><td>${dataBR(l.validade)}</td><td style="border-bottom:1px solid #999"></td></tr>`)).join('')}</tbody></table></div>`); },
  etiquetaProd: (d) => { const p = prod(app, d.id); app.estado.etq = { cat: p.categoria, qtd: { [d.id]: 6 } }; app.db.lista('produtos').filter((x) => x.categoria === p.categoria && x.id !== d.id).forEach((x) => (app.estado.etq.qtd[x.id] = 0)); fecharGaveta(); app.ir('#/etiquetas'); },
  etqCat: (d, el) => { app.estado.etq.cat = el.value; app.render(); },
  etqQtd: (d, el) => { app.estado.etq.qtd[d.id] = Math.max(0, Number(el.value) || 0); },
  imprimirEtq: () => { const st = app.estado.etq; const l = app.db.lista('produtos').filter((p) => p.categoria === st.cat).flatMap((p) => Array.from({ length: st.qtd[p.id] ?? 1 }, () => p));
    if (!l.length) return avisar('Defina a quantidade de etiquetas', { tipo: 'erro' });
    imprimir(`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${l.map((p) => `<div style="border:1px dashed #999;padding:8px 10px;page-break-inside:avoid;font-family:sans-serif"><div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.nome)}</div><div style="display:flex;justify-content:space-between;align-items:flex-end;gap:6px"><div style="width:58%">${codigoBarras(p.ean, { altura: 36 })}</div><div style="text-align:right"><div style="font-size:19px;font-weight:800">${moeda(p.preco)}</div>${p.pmc ? `<div style="font-size:10px">PMC ${moeda(p.pmc)}</div>` : ''}</div></div></div>`).join('')}</div>`); },
  relDias: (d) => { app.estado.rel.dias = Number(d.d); app.render(); },
  salvarNFe: async () => { const f = document.querySelector('[data-nfe]'); try { if (f.token.value.trim()) await app.sessao.salvarSegredo('focus_token', f.token.value.trim()); await app.sessao.salvarSegredo('focus_ambiente', f.ambiente.value); app.estado.nfe = null; app.estado.nfeCarregando = false; avisar('Cupom fiscal configurado'); app.render(); } catch (e) { avisar(e.message, { tipo: 'erro' }); } },
  desligarNFe: async () => { if (!(await confirmar('Desligar a emissão de cupons? O token é apagado do cofre.', { rotulo: 'Desligar', perigo: true }))) return; await app.sessao.salvarSegredo('focus_token', ''); app.estado.nfe = null; app.estado.nfeCarregando = false; app.render(); },
});

// leitor de código de barras no caixa: Enter adiciona o produto com EAN ou código exato
document.addEventListener('keydown', (e) => {
  const el = e.target.closest?.('[data-pdv-busca]'); if (!el || e.key !== 'Enter') return;
  e.preventDefault(); const t = normal(el.value.trim()); el.value = ''; if (!t) return;
  const p = app.db.lista('produtos').find((x) => normal(x.ean) === t || normal(x.sku) === t) || app.db.lista('produtos').find((x) => normal(`${x.nome} ${x.principio}`).includes(t));
  if (!p) return avisar('Produto não encontrado', { tipo: 'erro' });
  const st = app.estado['tab:pdvbusca']; if (st) st.busca = ''; app.acoes.pdvAdd({ id: p.id }); setTimeout(() => document.querySelector('[data-pdv-busca]')?.focus(), 30);
});

equipeViva(app, EQUIPE);
Object.assign(app.acoes, acoesLado());
app.travarLado = travarPro;
