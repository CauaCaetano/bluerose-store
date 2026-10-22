// Veltria Obras · gestão inteligente de obras: etapas com pagamento, diário com fotos, equipe e diárias, compras, serviços extras e a página do dono da obra.
// Gestão: orçamento por itens com aprovação do cliente, cronograma, checklist de qualidade, terceirizados, ferramentas, depósito de sobras e garantia pós-obra.
import {
  criarApp, esc, moeda, moedaC, num, pct, hoje, diaMais, mesMais, nomeMes, dataCurta, dataBR, relativo, diasAte, diasEntre,
  sorteio, soma, agrupar, av, ic, et, prog, kpis, barras, barrasH, kanban, telLink,
  modal, confirmar, avisar, editar, excluir, ficha, props, linhaDoTempo, vazio, imprimir, diaUtil, DIAS_L, paraData, normal,
} from '../base/nexo.js';
import { ferramentaPaginas, registrarCalcs } from '../base/lado.js';

const STATUS = [['orcamento', 'Orçamento', '#8a8478'], ['andamento', 'Em andamento', '#f26b1d'], ['pausada', 'Pausada', '#c9971c'], ['concluida', 'Concluída', '#2e7d4f']];
const stt = (id) => STATUS.find((s) => s[0] === id) || STATUS[0];
const CATS = [['material', 'Material'], ['mao', 'Mão de obra (ajudantes)'], ['frete', 'Frete e caçamba'], ['equipamento', 'Aluguel de equipamento'], ['outros', 'Outros']];
const nomeCat = (k) => (CATS.find((c) => c[0] === k) || [, k])[1];
const CLIMA = ['Sol', 'Nublado', 'Chuva'];
const MODELOS_ETAPAS = {
  banheiro: ['Demolição e retirada de entulho', 'Hidráulica', 'Elétrica', 'Impermeabilização', 'Contrapiso e reboco', 'Revestimento e piso', 'Louças, metais e box', 'Acabamento e limpeza'],
  cozinha: ['Demolição', 'Hidráulica e gás', 'Elétrica', 'Reboco', 'Piso e revestimento', 'Bancada e marcenaria', 'Pintura e acabamento'],
  pintura: ['Proteção de móveis e piso', 'Correção de trincas e massa', 'Lixamento', 'Primeira demão', 'Segunda demão e retoques', 'Limpeza final'],
  telhado: ['Retirada das telhas antigas', 'Troca do madeiramento', 'Manta e telhas novas', 'Calhas e rufos', 'Limpeza'],
};

// ---------------------------------------------------------------- dados de exemplo (fictícios)
function semente() {
  const r = sorteio(20261115), e1 = (l) => l[Math.floor(r() * l.length)], ent = (a, b) => a + Math.floor(r() * (b - a + 1));
  const clientes = ['Renata Albuquerque', 'Sérgio Matos', 'Condomínio Ed. Ipê', 'Aline Castro', 'Paulo Henrique Dias', 'Mirela Fontes', 'Clínica Sorriso Pleno', 'Hélio Barros', 'Tânia Rezende']
    .map((nome, i) => ({ id: `cl${i}`, nome, telefone: `(31) 9${ent(8100, 9899)}-${ent(1000, 9999)}`, endereco: `${e1(['Rua Pernambuco', 'Av. do Contorno', 'Rua Grão Mogol', 'Rua Alagoas', 'Rua Rio de Janeiro'])}, ${ent(100, 1999)} · ${e1(['Savassi', 'Funcionários', 'Sion', 'Lourdes', 'Santo Antônio'])} · BH` }));
  const planos = [['Reforma do banheiro social', 'banheiro', 'andamento', -24, 18500], ['Reforma da cozinha', 'cozinha', 'andamento', -9, 27400], ['Pintura do apartamento', 'pintura', 'concluida', -70, 9800], ['Troca do telhado', 'telhado', 'pausada', -15, 21600], ['Reforma da recepção', 'pintura', 'andamento', -3, 14200], ['Banheiro da suíte', 'banheiro', 'orcamento', 6, 16900], ['Pintura da fachada', 'pintura', 'concluida', -120, 12400], ['Cozinha americana', 'cozinha', 'orcamento', 12, 31800]];
  const obras = [], diario = [], gastos = [];
  planos.forEach(([titulo, modelo, status, inicio, valor], i) => {
    const nomes = MODELOS_ETAPAS[modelo], cada = Math.round(valor / nomes.length / 10) * 10;
    const feitas = status === 'concluida' ? nomes.length : status === 'orcamento' ? 0 : Math.min(nomes.length - 1, Math.max(1, Math.round((-inicio / 40) * nomes.length)));
    const etapas = nomes.map((nome, k) => ({ nome, valor: k === nomes.length - 1 ? valor - cada * (nomes.length - 1) : cada, status: k < feitas ? 'feita' : k === feitas && status === 'andamento' ? 'andamento' : 'pendente', pago: k < feitas - (status === 'andamento' ? 1 : 0) || status === 'concluida' }));
    etapas.forEach((e, k) => { if (e.pago) e.pago_em = diaMais(Math.min(-1, inicio + (k + 1) * 5)); });
    const o = { id: `ob${i}`, cliente: clientes[i % clientes.length].id, titulo, endereco: clientes[i % clientes.length].endereco, inicio: diaMais(inicio), previsao: diaMais(inicio + nomes.length * 6), valor, status, etapas, mostrar_gastos: i % 2 === 0, entrada: Math.round(valor * 0.2 / 100) * 100 };
    obras.push(o);
    if (status === 'orcamento') return;
    const dias = status === 'concluida' ? nomes.length * 5 : -inicio;
    for (let d = 0; d < dias; d += ent(1, 3)) {
      const data = diaMais(inicio + d); if (data > hoje()) break;
      const etapa = nomes[Math.min(nomes.length - 1, Math.floor((d / Math.max(1, dias)) * feitas))];
      diario.push({ id: `di${diario.length}`, obra: o.id, data, etapa, texto: e1([`${etapa}: avançamos bem hoje.`, `${etapa}: equipe completa, sem imprevistos.`, `${etapa}: aguardando material chegar amanhã cedo.`, `${etapa}: finalizamos a parte mais pesada.`, `${etapa}: cliente passou na obra e aprovou o andamento.`]), equipe: ent(1, 3), clima: e1(CLIMA) });
      if (r() < 0.55) { const [descricao, categoria, mn, mx] = e1([['Cimento CP-II (10 sacos)', 'material', 280, 420], ['Argamassa AC-III (10 sacos)', 'material', 320, 520], ['Porcelanato 60x60 (12 m²)', 'material', 700, 1400], ['Tubos e conexões PVC', 'material', 120, 480], ['Fios e disjuntores', 'material', 150, 650], ['Tinta acrílica 18 L', 'material', 290, 520], ['Rejunte e espaçadores', 'material', 60, 180], ['Diária de ajudante', 'mao', 150, 220], ['Caçamba de entulho', 'frete', 380, 520], ['Frete de material', 'frete', 80, 180], ['Aluguel de betoneira (semana)', 'equipamento', 160, 260]]);
        gastos.push({ id: `ga${gastos.length}`, obra: o.id, data, categoria, descricao, valor: ent(mn, mx), cliente_paga: categoria === 'material' && r() < 0.4 }); }
    }
  });
  const compras = [], aditivos = [];
  const LISTA = { banheiro: [['Porcelanato 60x60', '14 m²', 1290, 'cliente'], ['Argamassa AC-III', '8 sacos', 360, 'eu'], ['Rejunte epóxi cinza', '4 kg', 210, 'eu'], ['Registro de pressão', '2 un.', 180, 'eu'], ['Vaso sanitário com caixa acoplada', '1 un.', 890, 'cliente'], ['Box de vidro temperado', 'sob medida', 1450, 'cliente']], cozinha: [['Granito para bancada', '3,2 m', 2300, 'cliente'], ['Cuba inox', '1 un.', 420, 'cliente'], ['Tomadas 20A', '6 un.', 150, 'eu'], ['Cabo flexível 4 mm', '50 m', 260, 'eu'], ['Revestimento 30x60', '9 m²', 780, 'cliente']], pintura: [['Tinta acrílica fosca', '3 latas 18 L', 1080, 'eu'], ['Massa corrida', '2 latas', 190, 'eu'], ['Lixa 150 e 220', '30 folhas', 60, 'eu'], ['Fita crepe e lona', 'kit', 90, 'eu']], telhado: [['Telha cerâmica', '600 un.', 2700, 'eu'], ['Manta subcobertura', '2 rolos', 640, 'eu'], ['Calha galvanizada', '12 m', 780, 'eu']] };
  obras.filter((o) => o.status === 'andamento' || o.status === 'pausada' || o.status === 'orcamento').forEach((o) => {
    const modelo = planos[Number(o.id.slice(2))][1];
    LISTA[modelo].forEach(([item, quantidade, estimado, quem], k) => compras.push({ id: `cp${compras.length}`, obra: o.id, item, quantidade, estimado, quem, status: o.status !== 'orcamento' && k < 2 ? 'comprado' : 'comprar', criado: diaMais(-ent(1, 10)) }));
  });
  aditivos.push({ id: 'ad0', obra: 'ob0', descricao: 'Nicho embutido no box', motivo: 'A cliente pediu um nicho para shampoo na parede do box. Inclui recorte, impermeabilização e acabamento em porcelanato.', valor: 650, prazo_dias: 2, status: 'pendente', data: diaMais(-1) });
  aditivos.push({ id: 'ad1', obra: 'ob1', descricao: 'Troca da tubulação de gás', motivo: 'Ao abrir a parede encontramos a tubulação antiga corroída. Troca por cobre com teste de estanqueidade.', valor: 1380, prazo_dias: 3, status: 'pendente', data: diaMais(0) });
  aditivos.push({ id: 'ad2', obra: 'ob3', descricao: 'Reforço de duas tesouras do telhado', motivo: 'Madeira com cupim em duas tesouras.', valor: 2100, prazo_dias: 4, status: 'recusado', data: diaMais(-12) });
  const equipe = [['Robson Silva', 'Pedreiro', 250], ['Elias Prado', 'Ajudante', 150], ['Marcos Lima', 'Eletricista', 300], ['Jair Souza', 'Encanador', 280]].map(([nome, funcao, diaria], i) => ({ id: `eq${i}`, nome, funcao, diaria, telefone: `(31) 9${ent(8100, 9899)}-${ent(1000, 9999)}` }));
  const segunda = diaMais(-((new Date().getDay() + 6) % 7)), diarias = [];
  diario.filter((x) => x.data >= diaMais(-20)).forEach((x) => { const m = obras.find((o) => o.id === x.obra); const quem = m.titulo.includes('cozinha') || m.titulo.includes('Banheiro') ? [0, 1, 3] : [0, 1, 2];
    quem.slice(0, Math.max(1, x.equipe)).forEach((k) => !diarias.some((y) => y.pessoa === `eq${k}` && y.data === x.data) && diarias.push({ id: `dr${diarias.length}`, obra: x.obra, data: x.data, pessoa: `eq${k}`, valor: equipe[k].diaria, pago: x.data < diaMais(-7, segunda), pago_em: x.data < diaMais(-7, segunda) ? diaMais(-9, segunda) : null })); });
  diarias.forEach((x, k) => { if (k % 9 === 4) Object.assign(x, { tipo: 'meia', valor: x.valor / 2 }); else x.tipo = 'inteira'; });
  [['eq1', 3], ['eq2', 1]].forEach(([pid, n]) => { for (let k = n; k < n + 6; k++) { const data = diaMais(-k); if (diarias.some((x) => x.pessoa === pid && x.data === data)) continue; const o = diarias.find((x) => !x.pago && x.data >= diaMais(-7)); if (o) { diarias.push({ id: `dr${diarias.length}`, obra: o.obra, data, pessoa: pid, valor: 0, tipo: 'falta', pago: false }); break; } } });
  const vales = [{ id: 'va0', pessoa: 'eq0', data: diaMais(-3), valor: 200, obs: 'Adiantamento para material da casa', descontado: false }, { id: 'va1', pessoa: 'eq1', data: diaMais(-2), valor: 100, obs: '', descontado: false }];
  // orçamento por itens, datas das etapas, qualidade, terceiros, ferramentas, depósito e garantia
  const ITENS = { banheiro: [['Demolição e retirada de entulho', 'vb', 1, 1400, 'mao'], ['Porcelanato 60x60', 'm²', 14, 92, 'material'], ['Argamassa AC-III', 'sc', 8, 45, 'material'], ['Impermeabilização (manta líquida)', 'm²', 9, 68, 'material'], ['Mão de obra de revestimento', 'm²', 23, 95, 'mao'], ['Louças e metais (instalação)', 'vb', 1, 950, 'mao'], ['Hidráulica (pontos novos)', 'un.', 6, 260, 'mao']], cozinha: [['Demolição', 'vb', 1, 1600, 'mao'], ['Revestimento 30x60', 'm²', 18, 85, 'material'], ['Granito para bancada', 'm', 3.2, 720, 'material'], ['Elétrica (pontos e quadro)', 'un.', 10, 210, 'mao'], ['Hidráulica e gás', 'vb', 1, 2400, 'mao'], ['Marcenaria (instalação)', 'vb', 1, 3200, 'mao'], ['Pintura e acabamento', 'm²', 42, 38, 'mao']] };
  obras.forEach((o, i) => {
    const modelo = planos[i][1];
    if (o.status === 'orcamento' && ITENS[modelo]) { o.itens = ITENS[modelo].map(([desc, unidade, qtd, unit, tipo]) => ({ desc, unidade, qtd, unit, tipo })); o.margem = 18; o.validade = diaMais(i === 5 ? 9 : 2); o.enviado_em = diaMais(-3); o.valor = Math.round(soma(o.itens, (x) => x.qtd * x.unit) * 1.18); }
    o.etapas.forEach((e) => { if (e.status === 'feita') e.quali = Object.fromEntries(checklistDe(e.nome).map((t) => [t, true])); });
    if (o.status === 'concluida') o.entregue_em = diaMais(i === 2 ? -25 : -60);
  });
  const ob0 = obras[0], k0 = ob0.etapas.findIndex((e) => e.status === 'andamento'); if (k0 >= 0) Object.assign(ob0.etapas[k0], { quali: { [checklistDe(ob0.etapas[k0].nome)[0]]: true }, ini: diaMais(-9), fim: diaMais(-2) });
  const terceiros = [{ id: 'te0', nome: 'Gesso & Cia · Wanderson', servico: 'Forro de gesso da cozinha', obra: 'ob1', valor: 3200, telefone: '(31) 98450-2210', medicoes: [{ data: diaMais(-4), pct: 50, valor: 1600, pago: true, pago_em: diaMais(-3) }] },
    { id: 'te1', nome: 'Vidraçaria Cristal', servico: 'Box de vidro temperado', obra: 'ob0', valor: 1450, telefone: '(31) 99120-8877', medicoes: [] },
    { id: 'te2', nome: 'Marmoraria Pedra Fina', servico: 'Bancada de granito', obra: 'ob1', valor: 2300, telefone: '(31) 98711-4005', medicoes: [{ data: diaMais(-2), pct: 100, valor: 2300, pago: false }] }];
  const ferramentas = [['Betoneira 400 L', 'PAT-01', 3200, 'deposito'], ['Furadeira de impacto', 'PAT-02', 680, 'obra', 'ob0', 'eq0', -6], ['Serra mármore', 'PAT-03', 540, 'obra', 'ob1', 'eq3', -4], ['Andaime (2 peças)', 'PAT-04', 1900, 'obra', 'ob3', null, -22], ['Nível a laser', 'PAT-05', 1250, 'deposito'], ['Lixadeira de parede', 'PAT-06', 890, 'manutencao']].map(([nome, patrimonio, valor, local, obra, pes, d], i) => ({ id: `fe${i}`, nome, patrimonio, valor, local, obra: obra || null, pessoa: pes || null, desde: d ? diaMais(d) : null }));
  const deposito = [['Porcelanato 60x60', 3, 'm²', 92, 'ob2'], ['Argamassa AC-III', 4, 'sc', 45, 'ob2'], ['Tinta acrílica fosca 18 L', 1, 'lt', 360, 'ob6'], ['Cabo flexível 2,5 mm', 40, 'm', 3.2, 'ob6']].map(([item, qtd, unidade, unit, origem], i) => ({ id: `dp${i}`, item, qtd, unidade, unit, origem }));
  const chamadosL = [{ id: 'ch0', obra: 'ob2', descricao: 'Mancha de umidade perto do rodapé da sala', data: diaMais(-2), status: 'aberto', pelo_cliente: true }, { id: 'ch1', obra: 'ob6', descricao: 'Tinta descascando perto da janela da fachada', data: diaMais(-40), status: 'resolvido', resolvido_em: diaMais(-35) }];
  return { terceiros, ferramentas, deposito, chamados: chamadosL, equipe, diarias, vales, _cfg: { empresa: 'Reforma Certa · Davi Nunes', telefone: '(31) 98877-4410', endereco: 'Belo Horizonte/MG', cnpj: '' }, clientes, obras, diario, gastos, compras, aditivos };
}

// ---------------------------------------------------------------- regras
const obs = (a) => a.db.lista('obras');
const ob = (a, id) => a.db.obter('obras', id);
const cli = (a, id) => a.db.obter('clientes', id);
const diaDe = (a, id) => a.db.lista('diario').filter((x) => x.obra === id).sort((x, y) => y.data.localeCompare(x.data));
const gasDe = (a, id) => a.db.lista('gastos').filter((x) => x.obra === id).sort((x, y) => y.data.localeCompare(x.data));
const pessoa = (a, id) => a.db.obter('equipe', id);
const abertas = (a, pid) => a.db.lista('diarias').filter((x) => x.pessoa === pid && !x.pago).sort((x, y) => x.data.localeCompare(y.data));
const valesAbertos = (a, pid) => a.db.lista('vales').filter((x) => x.pessoa === pid && !x.descontado).sort((x, y) => x.data.localeCompare(y.data));
const TIPO_DIA = { inteira: 'Diária inteira', meia: 'Meia diária', falta: 'Falta' };
const saldoPessoa = (a, pid) => soma(abertas(a, pid), (x) => x.valor) - soma(valesAbertos(a, pid), (x) => x.valor);
const contaDias = (l) => { const i = l.filter((x) => (x.tipo || 'inteira') === 'inteira').length, m = l.filter((x) => x.tipo === 'meia').length, f = l.filter((x) => x.tipo === 'falta').length; return [i && `${i} ${i === 1 ? 'inteira' : 'inteiras'}`, m && `${m} ${m === 1 ? 'meia' : 'meias'}`, f && `${f} ${f === 1 ? 'falta' : 'faltas'}`].filter(Boolean).join(' · '); };
const cpDe = (a, id) => a.db.lista('compras').filter((x) => x.obra === id).sort((x, y) => (x.status === 'comprado') - (y.status === 'comprado') || x.item.localeCompare(y.item));
const adDe = (a, id) => a.db.lista('aditivos').filter((x) => x.obra === id).sort((x, y) => y.data.localeCompare(x.data));
const recebido = (o) => soma(o.etapas.filter((e) => e.pago), (e) => e.valor);
const aReceber = (o) => o.valor - recebido(o);
const meus = (a, id) => soma(gasDe(a, id).filter((g) => !g.cliente_paga), (g) => g.valor); // gastos que saem do bolso do empreiteiro
const lucro = (a, o) => o.valor - meus(a, o.id);
const progresso = (o) => (o.etapas.length ? (o.etapas.filter((e) => e.status === 'feita').length / o.etapas.length) * 100 : 0);
const atrasada = (o) => o.status === 'andamento' && o.previsao < hoje();
const stE = (o) => `<span class="et sem-ponto" style="background:color-mix(in srgb,${stt(o.status)[2]} 14%,var(--painel));color:${stt(o.status)[2]}">${stt(o.status)[1]}</span>`;

const colecoes = {
  clientes: { singular: 'cliente', plural: 'clientes', campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel', obrigatorio: true }, { nome: 'endereco', rotulo: 'Endereço', tipo: 'texto', largo: true }] },
  equipe: { singular: 'pessoa da equipe', genero: 'f', plural: 'equipe', campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'funcao', rotulo: 'Função', tipo: 'texto', padrao: 'Ajudante' }, { nome: 'diaria', rotulo: 'Valor da diária', tipo: 'moeda', obrigatorio: true }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel' }] },
  vales: { singular: 'vale', plural: 'vales', campos: [{ nome: 'valor', rotulo: 'Valor', tipo: 'moeda', obrigatorio: true }, { nome: 'data', rotulo: 'Data', tipo: 'data', padrao: () => hoje() }, { nome: 'obs', rotulo: 'Observação', tipo: 'texto', largo: true }] },
  terceiros: { singular: 'terceirizado', plural: 'terceirizados', campos: [{ nome: 'servico', rotulo: 'Serviço', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'nome', rotulo: 'Quem faz (empresa ou pessoa)', tipo: 'texto', obrigatorio: true }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel' }, { nome: 'obra', rotulo: 'Obra', tipo: 'relacao', colecao: 'obras', mostrar: 'titulo', obrigatorio: true }, { nome: 'valor', rotulo: 'Valor combinado', tipo: 'moeda', obrigatorio: true }], antesDeSalvar: (d, a, antigo) => ({ medicoes: antigo?.medicoes || [], ...d }) },
  ferramentas: { singular: 'ferramenta', genero: 'f', plural: 'ferramentas', campos: [{ nome: 'nome', rotulo: 'Ferramenta', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'patrimonio', rotulo: 'Patrimônio ou etiqueta', tipo: 'texto' }, { nome: 'valor', rotulo: 'Valor', tipo: 'moeda' }], antesDeSalvar: (d, a, antigo) => ({ local: antigo?.local || 'deposito', ...d }) },
  deposito: { singular: 'material do depósito', plural: 'materiais', campos: [{ nome: 'item', rotulo: 'Material', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'qtd', rotulo: 'Quantidade', tipo: 'numero', obrigatorio: true }, { nome: 'unidade', rotulo: 'Unidade', tipo: 'texto', padrao: 'un.' }, { nome: 'unit', rotulo: 'Valor por unidade', tipo: 'moeda' }, { nome: 'origem', rotulo: 'Sobrou de', tipo: 'relacao', colecao: 'obras', mostrar: 'titulo' }] },
  obras: { singular: 'obra', genero: 'f', plural: 'obras', campos: [{ nome: 'cliente', rotulo: 'Cliente', tipo: 'relacao', colecao: 'clientes', obrigatorio: true }, { nome: 'titulo', rotulo: 'O que é (ex.: Reforma do banheiro)', tipo: 'texto', obrigatorio: true }, { nome: 'endereco', rotulo: 'Endereço da obra', tipo: 'texto', largo: true }, { nome: 'valor', rotulo: 'Valor fechado', tipo: 'moeda', obrigatorio: true }, { nome: 'inicio', rotulo: 'Início', tipo: 'data', padrao: () => hoje() }, { nome: 'previsao', rotulo: 'Previsão de entrega', tipo: 'data', padrao: () => diaMais(30) }, { nome: 'mostrar_gastos', rotulo: 'Mostrar os gastos ao cliente', tipo: 'booleano', texto: 'Sim, na página do cliente' }],
    antesDeSalvar: (d, a, antigo) => ({ status: antigo?.status || 'orcamento', etapas: antigo?.etapas || [], ...d, endereco: d.endereco || cli(a, d.cliente)?.endereco || '' }) },
};

// ---------------------------------------------------------------- páginas
function painel(a) {
  const and = obs(a).filter((o) => o.status === 'andamento' || o.status === 'pausada'), ym = hoje().slice(0, 7);
  const gMes = a.db.lista('gastos').filter((g) => g.data.startsWith(ym) && !g.cliente_paga);
  const cobrar = obs(a).flatMap((o) => o.etapas.map((e, k) => ({ o, e, k }))).filter(({ e }) => e.status === 'feita' && !e.pago);
  const ultimoDia = (o) => diaDe(a, o.id)[0];
  const semDiario = and.filter((o) => o.status === 'andamento' && (!ultimoDia(o) || diasAte(ultimoDia(o).data) < -2));
  const pend = a.db.lista('aditivos').filter((x) => x.status === 'pendente'), falta = a.db.lista('compras').filter((x) => x.status === 'comprar' && ob(a, x.obra)?.status === 'andamento');
  const DS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const capa = (o) => { const ag = o.etapas.find((e) => e.status === 'andamento'), u = ultimoDia(o);
    return `<div class="cn-capa"><div class="entre"><span class="agora">${o.status === 'pausada' ? 'Pausada' : ag ? esc(ag.nome) : 'Próxima etapa a definir'}</span>${atrasada(o) ? et('Atrasada', 'er') : u && diasAte(u.data) < -2 ? et('Sem diário', 'al') : ''}</div><div class="pc">${Math.round(progresso(o))}<small>%</small></div></div>`; };
  const cartaoObra = (o) => { const c = cli(a, o.cliente), u = ultimoDia(o);
    return `<article class="cn-obra" data-abrir="obra:${o.id}">${capa(o)}<div class="cn-corpo"><div><div class="t">${esc(o.titulo)}</div><div class="s corta">${esc(c?.nome || '')} · ${esc(o.endereco?.split('·')[1]?.trim() || '')}</div></div>
      <div class="cn-etapas" title="${o.etapas.filter((e) => e.status === 'feita').length} de ${o.etapas.length} etapas">${o.etapas.map((e) => `<i class="${e.pago ? 'p' : e.status === 'feita' ? 'f' : e.status === 'andamento' ? 'a' : ''}"></i>`).join('')}</div>
      <div class="cn-pe"><span class="mute">Entrega <b class="${atrasada(o) ? 'er-tx' : ''}">${dataCurta(o.previsao)}</b></span><span class="mute">${u ? `diário ${relativo(u.data)}` : 'sem diário'}</span><b>${moedaC(aReceber(o))} a receber</b></div></div></article>`; };
  return `<div class="cn-hoje"><h2>${DS[new Date().getDay()]}, ${dataCurta(hoje())}<small>${and.filter((o) => o.status === 'andamento').length} obras rodando · ${cobrar.length} etapas prontas para cobrar</small></h2>
      <button type="button" class="btn pri" data-acao="novoDiario">${ic('camera')}Registrar o dia</button><button type="button" class="btn sec" data-acao="novoGasto">${ic('receipt')}Lançar gasto</button><button type="button" class="btn sec" data-acao="novaObra">${ic('plus')}Nova obra</button></div>
    <div class="cn-num"><div><b>${moedaC(soma(obs(a).filter((o) => o.status !== 'orcamento'), aReceber))}</b><span>a receber</span></div><div class="${cobrar.length ? 'al' : ''}"><b>${moedaC(soma(cobrar, ({ e }) => e.valor))}</b><span>pronto para cobrar</span></div><div><b>${moedaC(soma(gMes, (g) => g.valor))}</b><span>gasto em ${nomeMes(ym)}</span></div><div><b>${moedaC(soma(and, (o) => lucro(a, o)))}</b><span>lucro previsto</span></div></div>
    ${semDiario.length ? `<div class="dica">${ic('camera')}<span><b>Diário parado:</b> ${semDiario.map((o) => esc(o.titulo)).join(', ')} ${semDiario.length === 1 ? 'está' : 'estão'} sem foto há mais de 2 dias. Cliente que vê a obra andando confia e paga em dia.</span></div>` : ''}
    ${and.length ? `<div class="cn-mural">${and.map(cartaoObra).join('')}</div>` : vazio('house-line', 'Nenhuma obra rodando', '', `<button type="button" class="btn pri" data-acao="novaObra">${ic('plus')}Nova obra</button>`)}
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Pronto para cobrar</h3><div class="sub">Mande o PIX da etapa pelo link do cliente</div></div></div>${cobrar.length ? `<ul class="lista">${cobrar.map(({ o, e }) => `<li class="clicavel" data-abrir="obra:${o.id}"><div class="cresce"><div class="t corta">${esc(e.nome)}</div><div class="s corta">${esc(o.titulo)} · ${esc(cli(a, o.cliente)?.nome || '')}</div></div><b class="num">${moeda(e.valor)}</b></li>`).join('')}</ul>` : vazio('check-circle', 'Nada para cobrar agora')}</div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Esperando o cliente</h3><div class="sub">Serviços extras para aprovar</div></div></div>${pend.length ? `<ul class="lista">${pend.map((x) => `<li class="clicavel" data-abrir="obra:${x.obra}:extras"><div class="cresce"><div class="t corta">${esc(x.descricao)}</div><div class="s corta">${esc(ob(a, x.obra)?.titulo || '')} · pedido ${relativo(x.data)}</div></div><b class="num">${moeda(x.valor)}</b></li>`).join('')}</ul>` : vazio('check-circle', 'Nada esperando')}</div></div>
    ${falta.length ? `<div class="cartao"><div class="cartao-cab"><div><h3>Material a comprar</h3><div class="sub">${falta.length} itens nas obras rodando</div></div></div><ul class="lista">${Object.entries(agrupar(falta, (x) => x.obra)).map(([oid, l]) => `<li class="clicavel" data-abrir="obra:${oid}:compras"><div class="cresce"><div class="t corta">${esc(ob(a, oid)?.titulo || '')}</div><div class="s corta">${l.map((x) => esc(x.item)).join(', ')}</div></div><b class="num">${moedaC(soma(l, (x) => x.estimado || 0))}</b></li>`).join('')}</ul></div>` : ''}
    <button type="button" class="cn-fab" data-acao="novoDiario">${ic('camera')}Registrar o dia</button>`;
}

function obrasPag(a) {
  a.kanbans.obras = (id, s) => { a.db.salvar('obras', { id, status: s, ...(s === 'concluida' && !ob(a, id)?.entregue_em ? { entregue_em: hoje() } : {}) }); a.db.registrar(`obras:${id}`, stt(s)[1], { icone: 'arrow-right', tom: 'acc' }); avisar(`${ob(a, id).titulo} → ${stt(s)[1]}`); };
  a.kanbans['obras:abrir'] = (id) => a.abrir('obra', id);
  return `<div class="entre"><span class="mute" style="font-size:12.5px">Arraste as obras conforme avançam. Abra uma obra para lançar o diário, os gastos e cobrar as etapas.</span><button type="button" class="btn pri" data-acao="novaObra">${ic('plus')}Nova obra</button></div>`
    + kanban({ id: 'obras', itens: obs(a).filter((o) => o.status !== 'concluida' || diasAte(o.previsao) > -45), campo: 'status', colunas: STATUS.map(([id, nome, cor]) => ({ id, nome, cor, sub: (l) => moedaC(soma(l, (o) => o.valor)), classe: (o) => (atrasada(o) ? 'parado' : '') })),
      ficha: (o) => `<div class="t">${esc(o.titulo)}</div><div class="s corta">${esc(cli(a, o.cliente)?.nome || '')}</div>${prog(progresso(o), atrasada(o) ? 'al' : '')}<div class="linha"><span class="mute" style="font-size:11.5px">entrega ${dataCurta(o.previsao)}</span><b class="num" style="color:var(--tx)">${moedaC(o.valor)}</b></div>` });
}

function diarioPag(a) {
  const l = a.db.lista('diario').sort((x, y) => y.data.localeCompare(x.data)).slice(0, 60);
  return `<div class="entre"><span class="mute" style="font-size:12.5px">O dia a dia de todas as obras. Cada registro (com as fotos) aparece na página do cliente.</span><button type="button" class="btn pri" data-acao="novoDiario">${ic('camera')}Registrar o dia</button></div>
    <div class="cartao">${l.length ? `<ul class="lista">${l.map((x) => { const o = ob(a, x.obra); return `<li class="clicavel" data-abrir="obra:${x.obra}:diario"><b class="num" style="width:58px">${dataCurta(x.data)}</b><div class="cresce"><div class="t corta">${esc(x.texto)}</div><div class="s corta">${esc(o?.titulo || '')} · ${num(x.equipe)} na equipe · ${esc(x.clima)}${(x._anexos || []).length ? ` · ${x._anexos.length} fotos` : ''}</div></div></li>`; }).join('')}</ul>` : vazio('camera', 'Nenhum registro ainda')}</div>`;
}

function gastosPag(a) {
  return a.tab({ id: 'gastos', colecao: 'gastos', singular: 'gasto', plural: 'gastos', ordem: 'data', desc: true, buscaDica: 'Descrição ou obra…', novo: { rot: 'Lançar gasto', attrs: 'data-acao="novoGasto"' }, aoClicar: (id) => a.abrir('obra', a.db.obter('gastos', id).obra, 'gastos'), total: (l) => moeda(soma(l, (g) => g.valor)),
    visoes: [{ id: 'mes', rot: 'Este mês', filtro: (g) => g.data.startsWith(hoje().slice(0, 7)) }, { id: 'todos', rot: 'Todos' }],
    filtros: [{ k: 'categoria', rot: 'Categoria', opcoes: CATS }, { k: 'obra', rot: 'Obra', opcoes: obs(a).map((o) => [o.id, o.titulo]) }],
    textoBusca: (g) => `${g.descricao} ${ob(a, g.obra)?.titulo}`,
    colunas: [{ k: 'data', rot: 'Data', render: (g) => dataCurta(g.data) }, { k: 'descricao', rot: 'Gasto', render: (g) => `<span class="prim">${esc(g.descricao)}</span><span class="sub">${esc(nomeCat(g.categoria))}</span>` }, { k: 'obra', rot: 'Obra', oc: true, valor: (g) => ob(a, g.obra)?.titulo }, { k: 'quem', rot: 'Quem pagou', valor: (g) => (g.cliente_paga ? 'Cliente' : 'Você'), render: (g) => (g.cliente_paga ? et('Cliente', 'info') : et('Você', '')) }, { k: 'valor', rot: 'Valor', n: true, render: (g) => moeda(g.valor) }] });
}

function equipePag(a) {
  const eq = a.db.lista('equipe').sort((x, y) => x.nome.localeCompare(y.nome)), seg = diaMais(-((new Date().getDay() + 6) % 7));
  const semana = a.db.lista('diarias').filter((x) => x.data >= seg && x.tipo !== 'falta'), aberto = a.db.lista('diarias').filter((x) => !x.pago), vales = a.db.lista('vales').filter((x) => !x.descontado);
  return `<div class="entre"><span class="mute" style="font-size:12.5px">Marque a presença do dia (inteira, meia ou falta) e lance os vales. O saldo de cada um já sai com os vales descontados.</span><span class="flex"><button type="button" class="btn" data-acao="novoCad" data-c="equipe">${ic('user-plus')}Pessoa</button><button type="button" class="btn pri" data-acao="marcarPresenca">${ic('check-circle')}Marcar presença</button></span></div>
    ${kpis([{ rot: 'Saldo a pagar à equipe', icone: 'hand-coins', val: moeda(soma(aberto, (x) => x.valor) - soma(vales, (x) => x.valor)), nota: `${moeda(soma(aberto, (x) => x.valor))} em diárias − ${moeda(soma(vales, (x) => x.valor))} em vales`, alerta: aberto.length > 0 }, { rot: 'Diárias nesta semana', icone: 'calendar-check', val: num(semana.length), nota: moeda(soma(semana, (x) => x.valor)) }, { rot: 'Vales em aberto', icone: 'money', val: moeda(soma(vales, (x) => x.valor)), nota: `${vales.length} ${vales.length === 1 ? 'vale' : 'vales'}` }])}
    <div class="cartao" style="overflow-x:auto">${eq.length ? `<table class="tabela"><thead><tr><th>Pessoa</th><th>Diária</th><th>Dias em aberto</th><th class="n">Diárias</th><th class="n">Vales</th><th class="n">Saldo</th><th></th></tr></thead><tbody>${eq.map((p) => { const ab = abertas(a, p.id), vl = valesAbertos(a, p.id); return `<tr><td><span class="prim">${esc(p.nome)}</span><span class="sub">${esc(p.funcao || '')}</span></td><td>${moeda(p.diaria)}</td><td>${ab.length ? `${contaDias(ab)}<span class="sub">${[...new Set(ab.map((x) => ob(a, x.obra)?.titulo).filter(Boolean))].map(esc).join(', ')}</span>` : '<span class="mute">tudo pago</span>'}</td><td class="n">${moeda(soma(ab, (x) => x.valor))}</td><td class="n" style="white-space:nowrap">${vl.length ? `− ${moeda(soma(vl, (x) => x.valor))}` : '—'}</td><td class="n"><b>${moeda(saldoPessoa(a, p.id))}</b></td><td class="acoes"><button type="button" class="btn peq" data-acao="novoVale" data-id="${p.id}">${ic('money')}Vale</button><button type="button" class="btn peq" data-acao="comprovanteEquipe" data-id="${p.id}">${ic('receipt')}Comprovante</button>${ab.length || vl.length ? `<button type="button" class="btn peq pri" data-acao="pagarEquipe" data-id="${p.id}">${ic('currency-circle-dollar')}Pagar</button>` : ''}<button type="button" class="btn fant peq ic-so" data-acao="editarCad" data-c="equipe" data-id="${p.id}" aria-label="Editar">${ic('pencil-simple')}</button></td></tr>`; }).join('')}</tbody></table>` : vazio('users-three', 'Cadastre a sua equipe', 'Pedreiro, ajudantes, eletricista: com a diária de cada um.')}</div>`;
}

function docComprovanteEquipe(a, p, ab, vl, pago = false) {
  const cfg = a.db.cfg, tot = soma(ab, (x) => x.valor), tv = soma(vl, (x) => x.valor);
  return `<div class="doc"><div class="entre" style="align-items:flex-start"><div><h1>${esc(a.empresa)}</h1><div style="color:#555">${esc(cfg.endereco || '')} · ${esc(cfg.telefone || '')}</div></div><div style="text-align:right"><b style="font-size:16px">${pago ? 'Recibo de pagamento' : 'Fechamento de diárias'}</b><div style="color:#555">${dataBR(hoje())}</div></div></div>
    <h2>${esc(p.nome)} · ${esc(p.funcao || '')}</h2><p style="margin:0 0 8px;color:#555">Diária combinada: ${moeda(p.diaria)}${ab.length ? ` · período de ${dataBR(ab[0].data)} a ${dataBR(ab[ab.length - 1].data)}` : ''}</p>
    <table><thead><tr><th>Data</th><th>Obra</th><th>Presença</th><th class="n">Valor</th></tr></thead><tbody>${ab.map((x) => `<tr><td>${dataBR(x.data)}</td><td>${esc(ob(a, x.obra)?.titulo || '')}</td><td>${TIPO_DIA[x.tipo || 'inteira']}</td><td class="n">${moeda(x.valor)}</td></tr>`).join('') || '<tr><td colspan="4">Nenhuma diária em aberto</td></tr>'}<tr><td colspan="3"><b>Total de diárias</b> (${contaDias(ab) || '0'})</td><td class="n"><b>${moeda(tot)}</b></td></tr></tbody></table>
    ${vl.length ? `<h2>Vales (adiantamentos)</h2><table><tbody>${vl.map((x) => `<tr><td>${dataBR(x.data)}</td><td>${esc(x.obs || 'Vale')}</td><td class="n">− ${moeda(x.valor)}</td></tr>`).join('')}<tr><td colspan="2"><b>Total de vales</b></td><td class="n"><b>− ${moeda(tv)}</b></td></tr></tbody></table>` : ''}
    <h2>Saldo ${pago ? 'pago' : 'a pagar'}</h2><table><tbody><tr><td>${moeda(tot)} em diárias − ${moeda(tv)} em vales</td><td class="n"><b style="font-size:16px">${moeda(tot - tv)}</b></td></tr></tbody></table>
    <div class="ass"><div>${esc(a.empresa)}</div><div>${esc(p.nome)} · ${pago ? 'recebi' : 'conferi'}</div></div></div>`;
}
const textoFechamento = (a, p, ab, vl) => [`*Fechamento · ${p.nome}*`, ...ab.map((x) => `${dataCurta(x.data)} · ${TIPO_DIA[x.tipo || 'inteira']}${x.valor ? ` · ${moeda(x.valor)}` : ''}`), `Total de diárias: ${moeda(soma(ab, (x) => x.valor))}`, ...(vl.length ? [`Vales: − ${moeda(soma(vl, (x) => x.valor))}`] : []), `*Saldo: ${moeda(soma(ab, (x) => x.valor) - soma(vl, (x) => x.valor))}*`].join('\n');

function clientesPag(a) {
  return a.tab({ id: 'clientes', colecao: 'clientes', singular: 'cliente', plural: 'clientes', ordem: 'nome', novo: { rot: 'Novo cliente', attrs: 'data-acao="novoCad" data-c="clientes"' }, aoClicar: async (id) => { if (await editar(a, 'clientes', cli(a, id))) a.render(); },
    colunas: [{ k: 'nome', rot: 'Cliente', render: (c) => `<span class="prim">${esc(c.nome)}</span><span class="sub">${esc(c.endereco || '')}</span>` }, { k: 'telefone', rot: 'WhatsApp', render: (c) => `<a href="${telLink(c.telefone)}" target="_blank" rel="noopener">${esc(c.telefone)}</a>` }, { k: 'obras', rot: 'Obras', n: true, valor: (c) => obs(a).filter((o) => o.cliente === c.id).length }, { k: 'total', rot: 'Total fechado', n: true, valor: (c) => soma(obs(a).filter((o) => o.cliente === c.id && o.status !== 'orcamento'), (o) => o.valor), render: (c) => moeda(soma(obs(a).filter((o) => o.cliente === c.id && o.status !== 'orcamento'), (o) => o.valor)) }] });
}

function relatoriosPag(a) {
  const meses = Array.from({ length: 6 }, (_, i) => mesMais(i - 5)), fech = obs(a).filter((o) => o.status !== 'orcamento');
  return `${kpis([{ rot: 'Obras fechadas', icone: 'house-line', val: num(fech.length), nota: moeda(soma(fech, (o) => o.valor)) }, { rot: 'Margem média', icone: 'percent', val: pct((soma(fech, (o) => lucro(a, o)) / (soma(fech, (o) => o.valor) || 1)) * 100) }, { rot: 'Orçamentos aprovados', icone: 'thumbs-up', val: pct((fech.length / (obs(a).length || 1)) * 100) }])}
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Recebido x gasto por mês</h3></div></div><div class="cartao-corpo">${barras({ dados: meses.map((m) => ({ rot: nomeMes(m), v: [soma(obs(a).flatMap((o) => o.etapas.filter((e) => e.pago && e.pago_em?.startsWith(m))), (e) => e.valor), soma(a.db.lista('gastos').filter((g) => g.data.startsWith(m) && !g.cliente_paga), (g) => g.valor)] })), series: [{ nome: 'Recebido', cor: 'var(--acc)' }, { nome: 'Gastos', cor: '#94a3b8' }], fmt: moedaC, altura: 210 })}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Para onde vão os gastos</h3></div></div><div class="cartao-corpo">${barrasH(Object.entries(agrupar(a.db.lista('gastos').filter((g) => !g.cliente_paga), (g) => g.categoria)).map(([k, l]) => ({ rot: nomeCat(k), v: soma(l, (g) => g.valor) })).sort((x, y) => y.v - x.v), { fmt: moedaC })}</div></div></div>`;
}

// ---------------------------------------------------------------- funções de gestão (orçamento, cronograma, qualidade, terceiros, ferramentas, depósito, garantia)
const UNIDADES = ['un.', 'm²', 'm', 'sc', 'lt', 'kg', 'dia', 'vb'];
const totalItens = (o) => soma(o.itens || [], (x) => (Number(x.qtd) || 0) * (Number(x.unit) || 0));
const totalOrc = (o) => Math.round(totalItens(o) * (1 + (Number(o.margem) || 0) / 100));
// etapas com datas: as que não têm data dividem o prazo da obra em partes iguais
function planoEtapas(o) {
  const n = o.etapas.length || 1, ini = o.inicio || hoje(), dur = Math.max(n, diasEntre(ini, o.previsao || diaMais(30, ini)));
  return o.etapas.map((e, k) => ({ ...e, k, ini: e.ini || diaMais(Math.round((dur * k) / n), ini), fim: e.fim || diaMais(Math.round((dur * (k + 1)) / n) - 1, ini) }));
}
const atrasoEtapa = (e) => e.status !== 'feita' && e.fim < hoje();
// checklist de qualidade sugerido pelo nome da etapa
const CHECK = [
  [/hidr|encan|gás/i, ['Teste de pressão sem vazamento', 'Registros e ralos funcionando', 'Caimento para o ralo conferido']],
  [/el[eé]tri/i, ['Disjuntores identificados no quadro', 'Tomadas e interruptores testados', 'Fios dentro do padrão de bitola']],
  [/imperme/i, ['Teste de estanqueidade de 72 horas', 'Rodapé impermeabilizado até 30 cm', 'Fotos antes de cobrir']],
  [/revest|piso|porcel|cer[aâ]m/i, ['Nível e prumo conferidos', 'Sem peças ocas (teste do toque)', 'Rejunte uniforme e limpo']],
  [/pintur|dem[aã]o|massa/i, ['Cobertura uniforme, sem manchas', 'Recortes limpos em rodapés e tomadas', 'Piso e móveis protegidos e limpos']],
  [/telh|madeir|calha|rufo/i, ['Telhas alinhadas e travadas', 'Teste com água nas calhas', 'Sem goteiras após chuva ou teste']],
  [/demol|entulho/i, ['Entulho retirado da obra', 'Instalações escondidas protegidas']],
];
const checklistDe = (nome) => (CHECK.find(([re]) => re.test(nome)) || [, ['Serviço conferido com o projeto', 'Local limpo ao fim da etapa']])[1].concat('Conferido com o cliente');
const qualiDe = (o, k) => { const e = o.etapas[k]; const itens = checklistDe(e.nome); return itens.map((t) => ({ t, ok: !!(e.quali || {})[t] })); };
const LOCAIS_F = [['deposito', 'No depósito'], ['obra', 'Em obra'], ['manutencao', 'Na manutenção']];
const ferr = (a) => a.db.lista('ferramentas').sort((x, y) => x.nome.localeCompare(y.nome));
const foraHa = (f) => (f.local === 'obra' && f.desde ? -diasAte(f.desde) : 0);
const terc = (a) => a.db.lista('terceiros');
const pagoTerc = (t) => soma(t.medicoes || [], (m) => (m.pago ? m.valor : 0));
const medidoTerc = (t) => soma(t.medicoes || [], (m) => m.valor);
const chamados = (a) => a.db.lista('chamados').sort((x, y) => (x.status === 'resolvido') - (y.status === 'resolvido') || y.data.localeCompare(x.data));
const emGarantia = (o) => o.status === 'concluida' && o.entregue_em && diasAte(diaMais(90, o.entregue_em)) >= 0;

function orcamentosPag(a) {
  const l = obs(a).filter((o) => o.status === 'orcamento'), feitos = obs(a).filter((o) => o.itens?.length), aprov = feitos.filter((o) => o.status !== 'orcamento');
  return `<div class="entre"><span class="mute" style="font-size:12.5px">Monte o orçamento por itens (material e mão de obra), coloque a sua margem e mande o link: o cliente aprova pelo celular e a obra já começa com as etapas prontas.</span><button type="button" class="btn pri" data-acao="novaObra">${ic('plus')}Novo orçamento</button></div>
    ${kpis([{ rot: 'Orçamentos em aberto', icone: 'clipboard-text', val: num(l.length), nota: moeda(soma(l, (o) => o.valor)) }, { rot: 'Taxa de aprovação', icone: 'thumbs-up', val: pct((aprov.length / (feitos.length || 1)) * 100), nota: `${aprov.length} de ${feitos.length} por itens` }, { rot: 'Margem média', icone: 'percent', val: pct(feitos.length ? soma(feitos, (o) => Number(o.margem) || 0) / feitos.length : 0) }])}
    <div class="cartao">${l.length ? `<ul class="lista">${l.map((o) => { const vence = o.validade ? diasAte(o.validade) : null; return `<li class="clicavel" data-abrir="obra:${o.id}:orcamento"><div class="cresce"><div class="t corta">${esc(o.titulo)}</div><div class="s corta">${esc(cli(a, o.cliente)?.nome || '')} · ${(o.itens || []).length} itens${o.margem ? ` · margem ${o.margem}%` : ''}${o.enviado_em ? ` · enviado ${relativo(o.enviado_em)}` : ''}</div></div>${vence != null ? (vence < 0 ? et('Vencido', 'er') : vence <= 3 ? et(`Vence em ${vence} d`, 'al') : '') : ''}<b class="num">${moeda(o.valor)}</b></li>`; }).join('')}</ul>` : vazio('clipboard-text', 'Nenhum orçamento em aberto', 'Crie uma obra: ela começa como orçamento até o cliente aprovar.')}</div>`;
}

function cronogramaPag(a) {
  const l = obs(a).filter((o) => ['andamento', 'pausada', 'orcamento'].includes(o.status) && o.etapas.length).sort((x, y) => x.inicio.localeCompare(y.inicio));
  if (!l.length) return vazio('chart-bar-horizontal', 'Nada no cronograma', 'As obras com etapas aparecem aqui, com o prazo de cada etapa.');
  const ini = l.reduce((m, o) => (o.inicio < m ? o.inicio : m), diaMais(-7)), fim = l.reduce((m, o) => (o.previsao > m ? o.previsao : m), diaMais(21));
  const dias = Math.max(14, diasEntre(ini, fim) + 1), x = (d) => `${(Math.max(0, diasEntre(ini, d)) / dias) * 100}%`, w = (d1, d2) => `${(Math.max(1, diasEntre(d1, d2) + 1) / dias) * 100}%`;
  const semanas = Array.from({ length: Math.ceil(dias / 7) }, (_, i) => diaMais(i * 7, ini));
  const atrasos = l.flatMap((o) => planoEtapas(o).filter(atrasoEtapa).map((e) => ({ o, e })));
  return `${atrasos.length ? `<div class="dica">${ic('warning')}<span><b>${atrasos.length} ${atrasos.length === 1 ? 'etapa atrasada' : 'etapas atrasadas'}:</b> ${atrasos.slice(0, 4).map(({ o, e }) => `${esc(e.nome)} (${esc(o.titulo)})`).join(', ')}${atrasos.length > 4 ? '…' : ''}. Avise o cliente pelo link da obra antes que ele pergunte.</span></div>` : `<div class="dica">${ic('check-circle')}<span>Todas as etapas dentro do prazo.</span></div>`}
    <div class="cartao cn-gantt" style="--hoje:${x(hoje())}"><div class="cn-g-cab"><span></span><div class="cn-g-escala">${semanas.map((d) => `<span style="left:${x(d)}">${dataCurta(d)}</span>`).join('')}</div></div>
      ${l.map((o) => `<div class="cn-g-obra clicavel" data-abrir="obra:${o.id}:cronograma"><span class="t corta">${esc(o.titulo)}</span><div class="cn-g-trilho"><i class="cn-g-hoje"></i><b style="left:${x(o.inicio)};width:${w(o.inicio, o.previsao)}" class="cn-g-total ${atrasada(o) ? 'er' : ''}"></b></div></div>
        ${planoEtapas(o).map((e) => `<div class="cn-g-etapa"><span class="corta">${esc(e.nome)}</span><div class="cn-g-trilho"><i class="cn-g-hoje"></i><b style="left:${x(e.ini)};width:${w(e.ini, e.fim)}" class="${e.status === 'feita' ? 'ok' : atrasoEtapa(e) ? 'er' : e.status === 'andamento' ? 'and' : ''}" title="${esc(e.nome)}: ${dataCurta(e.ini)} a ${dataCurta(e.fim)}"></b></div></div>`).join('')}`).join('')}
      <div class="cn-g-leg"><span><i class="ok"></i>Concluída</span><span><i class="and"></i>Em andamento</span><span><i></i>A fazer</span><span><i class="er"></i>Atrasada</span><span><i class="hj"></i>Hoje</span></div></div>`;
}

function terceirosPag(a) {
  const l = terc(a), aberto = soma(l, (t) => medidoTerc(t) - pagoTerc(t)), contratado = soma(l, (t) => t.valor);
  return `<div class="entre"><span class="mute" style="font-size:12.5px">Gesseiro, vidraceiro, marmoraria: combine o valor do serviço e pague por medição (o quanto foi feito). O pago entra nos gastos da obra.</span><button type="button" class="btn pri" data-acao="novoCad" data-c="terceiros">${ic('plus')}Terceirizado</button></div>
    ${kpis([{ rot: 'Contratado', icone: 'handshake', val: moeda(contratado), nota: `${l.length} serviços` }, { rot: 'Medido e não pago', icone: 'hand-coins', val: moeda(aberto), alerta: aberto > 0 }, { rot: 'Falta medir', icone: 'ruler', val: moeda(soma(l, (t) => t.valor - medidoTerc(t))) }])}
    <div class="cartao" style="overflow-x:auto">${l.length ? `<table class="tabela"><thead><tr><th>Serviço</th><th>Obra</th><th style="width:170px">Executado</th><th class="n">Contratado</th><th class="n">Pago</th><th></th></tr></thead><tbody>${l.map((t) => { const pc = t.valor ? (medidoTerc(t) / t.valor) * 100 : 0, devo = medidoTerc(t) - pagoTerc(t); return `<tr><td><span class="prim">${esc(t.servico)}</span><span class="sub">${esc(t.nome)}${t.telefone ? ` · <a href="${telLink(t.telefone)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</span></td><td>${esc(ob(a, t.obra)?.titulo || '')}</td><td>${prog(pc, pc >= 100 ? 'ok' : '')}<span class="sub">${pct(pc)}</span></td><td class="n">${moeda(t.valor)}</td><td class="n">${moeda(pagoTerc(t))}${devo > 0 ? `<span class="sub al-tx">${moeda(devo)} a pagar</span>` : ''}</td><td class="acoes">${medidoTerc(t) < t.valor ? `<button type="button" class="btn peq" data-acao="medir" data-id="${t.id}">${ic('ruler')}Medição</button>` : ''}${devo > 0 ? `<button type="button" class="btn peq pri" data-acao="pagarTerc" data-id="${t.id}">${ic('currency-circle-dollar')}Pagar</button>` : ''}<button type="button" class="btn fant peq ic-so" data-acao="editarCad" data-c="terceiros" data-id="${t.id}" aria-label="Editar">${ic('pencil-simple')}</button></td></tr>`; }).join('')}</tbody></table>` : vazio('handshake', 'Nenhum terceirizado', 'Cadastre os serviços que você contrata de parceiros.')}</div>`;
}

function ferramentasPag(a) {
  const l = ferr(a), fora = l.filter((f) => f.local === 'obra'), esquecidas = fora.filter((f) => foraHa(f) > 15);
  return `<div class="entre"><span class="mute" style="font-size:12.5px">Saiba onde está cada ferramenta e com quem. Ferramenta parada em obra há mais de 15 dias aparece em destaque.</span><button type="button" class="btn pri" data-acao="novoCad" data-c="ferramentas">${ic('plus')}Ferramenta</button></div>
    ${kpis([{ rot: 'Ferramentas', icone: 'toolbox', val: num(l.length), nota: moeda(soma(l, (f) => f.valor || 0)) + ' em patrimônio' }, { rot: 'Em obra', icone: 'house-line', val: num(fora.length) }, { rot: 'Há mais de 15 dias fora', icone: 'warning', val: num(esquecidas.length), alerta: esquecidas.length > 0 }])}
    <div class="cartao" style="overflow-x:auto">${l.length ? `<table class="tabela"><thead><tr><th>Ferramenta</th><th>Onde está</th><th>Com quem</th><th class="n">Valor</th><th></th></tr></thead><tbody>${l.map((f) => `<tr><td><span class="prim">${esc(f.nome)}</span><span class="sub">${esc(f.patrimonio || '')}</span></td><td>${f.local === 'obra' ? `${esc(ob(a, f.obra)?.titulo || 'Obra')}<span class="sub ${foraHa(f) > 15 ? 'al-tx' : ''}">há ${foraHa(f)} dias</span>` : f.local === 'manutencao' ? et('Na manutenção', 'al') : et('No depósito', 'ok')}</td><td>${esc(pessoa(a, f.pessoa)?.nome || '—')}</td><td class="n">${f.valor ? moeda(f.valor) : '—'}</td><td class="acoes">${f.local === 'obra' ? `<button type="button" class="btn peq" data-acao="devolverFerr" data-id="${f.id}">${ic('arrow-u-down-left')}Voltou</button>` : `<button type="button" class="btn peq" data-acao="levarFerr" data-id="${f.id}">${ic('truck')}Levar para obra</button>`}<button type="button" class="btn fant peq ic-so" data-acao="editarCad" data-c="ferramentas" data-id="${f.id}" aria-label="Editar">${ic('pencil-simple')}</button></td></tr>`).join('')}</tbody></table>` : vazio('toolbox', 'Nenhuma ferramenta', 'Cadastre betoneira, andaime, furadeira e o que mais você leva para as obras.')}</div>`;
}

function depositoPag(a) {
  const l = a.db.lista('deposito').filter((x) => Number(x.qtd) > 0).sort((x, y) => x.item.localeCompare(y.item));
  return `<div class="entre"><span class="mute" style="font-size:12.5px">Sobrou material numa obra? Guarde aqui e use na próxima. O que sai do depósito entra na lista de compras da obra como já comprado, sem gastar de novo.</span><button type="button" class="btn pri" data-acao="novoCad" data-c="deposito">${ic('plus')}Material</button></div>
    ${kpis([{ rot: 'Itens guardados', icone: 'warehouse', val: num(l.length) }, { rot: 'Valor guardado', icone: 'piggy-bank', val: moeda(soma(l, (x) => (Number(x.qtd) || 0) * (Number(x.unit) || 0))), nota: 'dinheiro parado que pode virar lucro' }])}
    <div class="cartao" style="overflow-x:auto">${l.length ? `<table class="tabela"><thead><tr><th>Material</th><th>Quantidade</th><th>Sobrou de</th><th class="n">Valor</th><th></th></tr></thead><tbody>${l.map((x) => `<tr><td><span class="prim">${esc(x.item)}</span></td><td>${num(x.qtd)} ${esc(x.unidade || '')}</td><td>${esc(ob(a, x.origem)?.titulo || '—')}</td><td class="n">${x.unit ? moeda(x.qtd * x.unit) : '—'}</td><td class="acoes"><button type="button" class="btn peq pri" data-acao="usarDeposito" data-id="${x.id}">${ic('truck')}Usar em obra</button><button type="button" class="btn fant peq ic-so" data-acao="editarCad" data-c="deposito" data-id="${x.id}" aria-label="Editar">${ic('pencil-simple')}</button></td></tr>`).join('')}</tbody></table>` : vazio('warehouse', 'Depósito vazio', 'Guarde as sobras das obras para usar nas próximas.')}</div>`;
}

function garantiaPag(a) {
  const l = chamados(a), abertos = l.filter((x) => x.status !== 'resolvido'), garantia = obs(a).filter(emGarantia);
  return `<div class="entre"><span class="mute" style="font-size:12.5px">Depois da entrega, o cliente abre o chamado pelo link da obra. Atender rápido vira indicação.</span><button type="button" class="btn pri" data-acao="novoChamado">${ic('plus')}Chamado</button></div>
    ${kpis([{ rot: 'Chamados abertos', icone: 'lifebuoy', val: num(abertos.length), alerta: abertos.length > 0 }, { rot: 'Obras na garantia', icone: 'shield-check', val: num(garantia.length), nota: '90 dias depois da entrega' }, { rot: 'Resolvidos', icone: 'check-circle', val: num(l.length - abertos.length) }])}
    <div class="cartao">${l.length ? `<ul class="lista">${l.map((x) => { const o = ob(a, x.obra); return `<li><div class="cresce"><div class="t corta">${esc(x.descricao)}</div><div class="s corta">${esc(o?.titulo || '')} · ${esc(cli(a, o?.cliente)?.nome || '')} · aberto ${relativo(x.data)}${x.pelo_cliente ? ' pelo cliente' : ''}${x.agendado ? ` · visita ${dataCurta(x.agendado)}` : ''}</div></div>${x.status === 'resolvido' ? et('Resolvido', 'ok') : x.status === 'agendado' ? et('Visita marcada', 'info') : et('Aberto', 'al')}${x.status !== 'resolvido' ? `<button type="button" class="btn peq" data-acao="agendarChamado" data-id="${x.id}">${ic('calendar-blank')}Marcar visita</button><button type="button" class="btn peq pri" data-acao="resolverChamado" data-id="${x.id}">${ic('check')}Resolvido</button>` : ''}</li>`; }).join('')}</ul>` : vazio('lifebuoy', 'Nenhum chamado', 'Quando o cliente pedir um reparo pelo link da obra, ele aparece aqui.')}</div>`;
}

// ---------------------------------------------------------------- painel lateral de cada aba: atalhos, alertas e calculadoras daquela área
const bloco = (titulo, icone, corpo) => `<section class="ld-bloco"><h3>${ic(icone)}${esc(titulo)}</h3>${corpo}</section>`;
const atalhos = (l) => `<div class="ld-atalhos">${l.map(([rot, icone, attrs, pri]) => `<button type="button" class="btn ${pri ? 'pri' : 'sec'} peq" ${attrs}>${ic(icone)}${esc(rot)}</button>`).join('')}</div>`;
const ldLista = (itens, vazioTxt) => (itens.length ? `<ul class="ld-lista">${itens.join('')}</ul>` : `<div class="ld-vazio">${ic('check-circle')}${esc(vazioTxt)}</div>`);
const ldItem = (t, s, { attrs = '', dir = '' } = {}) => `<li ${attrs ? `class="clicavel" ${attrs}` : ''}><div class="cresce" style="min-width:0"><div class="t corta">${t}</div><div class="s corta">${s}</div></div>${dir}</li>`;
const ldNums = (l) => `<div class="ld-num">${l.map(([v, r]) => `<div><b>${v}</b><span>${esc(r)}</span></div>`).join('')}</div>`;
const campoN = (nome, rot, valor, extra = '') => `<label>${esc(rot)}<input type="number" name="${nome}" value="${valor}" min="0" step="any" inputmode="decimal" ${extra}></label>`;
const calc = (tipo, campos) => `<form class="ld-calc" data-calc="${tipo}" onsubmit="return false">${campos}<div class="ld-res" aria-live="polite"></div></form>`;
const n0 = (v) => Number(String(v).replace(',', '.')) || 0;
const fmtN = (v, d = 1) => num(v, d);

// contas das calculadoras (estimativas médias de obra; o resultado lembra de conferir com o fabricante)
const CALCS = {
  piso: (f) => { const area = n0(f.area.value), perda = n0(f.perda.value), cx = n0(f.caixa.value), cons = f.colagem.value === 'dupla' ? 8 : 5;
    const comPerda = area * (1 + perda / 100), arg = Math.ceil((area * cons) / 20), rej = Math.ceil((area * 0.3) / 1) ;
    return area ? `Comprar <b>${fmtN(comPerda)} m²</b> de piso${cx ? ` (<b>${Math.ceil(comPerda / cx)} caixas</b> de ${fmtN(cx, 2)} m²)` : ''}.<br>Argamassa: <b>${arg} sacos de 20 kg</b> (${f.colagem.value === 'dupla' ? 'colagem dupla' : 'colagem simples'}).<br>Rejunte: cerca de <b>${fmtN(rej, 0)} kg</b>.<br><span class="mute">Estimativa média: confira o consumo na embalagem.</span>` : 'Informe a área.'; },
  tinta: (f) => { const area = n0(f.area.value), dem = Math.max(1, n0(f.demaos.value)), rend = Math.max(1, n0(f.rend.value)), litros = (area * dem) / rend;
    return area ? `Precisa de <b>${fmtN(litros)} litros</b> de tinta (${dem} ${dem === 1 ? 'demão' : 'demãos'}).<br>Em latas: <b>${Math.ceil(litros / 18)} lata(s) de 18 L</b> ou <b>${Math.ceil(litros / 3.6)} galão(ões) de 3,6 L</b>.<br><span class="mute">O rendimento muda com a tinta e a parede: confira na lata.</span>` : 'Informe a área das paredes.'; },
  concreto: (f) => { const v = n0(f.comp.value) * n0(f.larg.value) * (n0(f.esp.value) / 100);
    return v ? `Volume: <b>${fmtN(v, 2)} m³</b> de concreto.<br>Traço 1:2:3 (aprox.): <b>${Math.ceil(v * 7)} sacos de cimento</b> de 50 kg, <b>${fmtN(v * 0.55, 2)} m³</b> de areia e <b>${fmtN(v * 0.8, 2)} m³</b> de brita.<br><span class="mute">Para estrutura, siga o projeto do engenheiro.</span>` : 'Informe as medidas.'; },
  preco: (f) => { const custo = n0(f.custo.value), m = n0(f.margem.value), preco = custo * (1 + m / 100);
    return custo ? `Preço para o cliente: <b>${moeda(preco)}</b>.<br>Lucro bruto: <b>${moeda(preco - custo)}</b> (${pct(preco ? ((preco - custo) / preco) * 100 : 0, 1)} do preço).` : 'Informe o custo.'; },
  prazo: (f) => { let d = f.ini.value || hoje(), n = Math.round(n0(f.dias.value)), uteis = f.uteis.checked; if (!n) return 'Informe quantos dias de serviço.';
    let k = 0; while (k < n) { if (!uteis || diaUtil(d)) k++; if (k < n) d = diaMais(1, d); }
    return `Entrega em <b>${dataBR(d)}</b> (${DIAS_L[paraData(d).getDay()]}).${uteis ? '<br><span class="mute">Pulando sábados, domingos e feriados nacionais.</span>' : ''}`; },
  diarias: (f) => { const v = n0(f.diaria.value), t = v * n0(f.inteiras.value) + (v / 2) * n0(f.meias.value) - n0(f.vales.value);
    return v ? `Saldo a pagar: <b>${moeda(t)}</b>.<br>${fmtN(n0(f.inteiras.value), 0)} inteira(s) e ${fmtN(n0(f.meias.value), 0)} meia(s), menos ${moeda(n0(f.vales.value))} em vales.` : 'Informe o valor da diária.'; },
};
function montarLado(a, c) {
  // celular: a barra de abas de baixo rola até a aba aberta
  const lat = document.querySelector('.lat'), at = lat?.querySelector('a.item.ativo');
  if (lat && at && lat.scrollWidth > lat.clientWidth) lat.scrollLeft = at.offsetLeft - (lat.clientWidth - at.offsetWidth) / 2;
  c.querySelectorAll('[data-calc]').forEach((f) => { const r = () => { f.querySelector('.ld-res').innerHTML = CALCS[f.dataset.calc](f); }; f.addEventListener('input', r); f.addEventListener('change', r); r(); });
}

const msgZap = (tel, texto) => (tel ? `${telLink(tel)}?text=${encodeURIComponent(texto)}` : '');
const proxEntregas = (a, dias) => obs(a).filter((o) => o.status === 'andamento' && diasAte(o.previsao) >= 0 && diasAte(o.previsao) <= dias).sort((x, y) => x.previsao.localeCompare(y.previsao));

const ITENS_MENU = [
  ['preco', 'Calcular o preço', 'calculator', 'orcamentos', 'Calcular o preço'],
  ['piso', 'Material de piso', 'ruler', 'orcamentos', 'Calcular material de piso'],
  ['tinta', 'Tinta', 'drop', 'orcamentos', 'Calcular tinta'],
  ['concreto', 'Concreto', 'stack', 'orcamentos', 'Calcular concreto'],
  ['prazo', 'Data de entrega', 'calendar-check', 'cronograma', 'Calcular data de entrega'],
  ['pagamento', 'Pagamento da equipe', 'hand-coins', 'equipe', 'Calcular o pagamento'],
  ['atrasadas', 'Etapas atrasadas', 'warning', 'cronograma', 'Etapas atrasadas'],
  ['estouro', 'Gasto perto do valor', 'receipt', 'gastos', 'Gasto perto do valor'],
  ['terceiros', 'Medido e não pago', 'hand-coins', 'terceiros', 'Medido e não pago'],
  ['voltar', 'Chamar clientes de volta', 'megaphone', 'clientes', 'Chamar de volta'],
];

const LADOS = {
  painel: (a) => {
    const ent = proxEntregas(a, 30), etapasSemana = obs(a).filter((o) => o.status === 'andamento').flatMap((o) => planoEtapas(o).filter((e) => e.status !== 'feita' && diasAte(e.fim) >= 0 && diasAte(e.fim) <= 7).map((e) => ({ o, e })));
    return bloco('Atalhos do dia', 'lightning', atalhos([['Registrar o dia', 'camera', 'data-acao="novoDiario"', true], ['Marcar presença', 'check-circle', 'data-acao="marcarPresenca"'], ['Lançar gasto', 'receipt', 'data-acao="novoGasto"'], ['Nova obra', 'plus', 'data-acao="novaObra"'], ['Resumo do dia', 'notepad', 'data-acao="resumoDia"']]))
      + bloco('Próximas entregas (30 dias)', 'calendar-check', ldLista(ent.map((o) => ldItem(esc(o.titulo), `${esc(cli(a, o.cliente)?.nome || '')} · ${Math.round(progresso(o))}% pronto`, { attrs: `data-abrir="obra:${o.id}"`, dir: `<b class="num">${dataCurta(o.previsao)}</b>` })), 'Nenhuma entrega nos próximos 30 dias'))
      + bloco('Etapas que terminam nesta semana', 'list-checks', ldLista(etapasSemana.slice(0, 6).map(({ o, e }) => ldItem(esc(e.nome), esc(o.titulo), { attrs: `data-abrir="obra:${o.id}:cronograma"`, dir: `<b class="num">${dataCurta(e.fim)}</b>` })), 'Nenhuma etapa vence nesta semana'));
  },
  obras: (a) => {
    const l = obs(a), atr = l.filter(atrasada), parado = l.filter((o) => o.status === 'andamento' && (!diaDe(a, o.id)[0] || diasAte(diaDe(a, o.id)[0].data) < -2));
    return bloco('Resumo', 'kanban', ldNums(STATUS.map(([id, nome]) => [num(l.filter((o) => o.status === id).length), nome])))
      + bloco('Atrasadas', 'warning', ldLista(atr.map((o) => ldItem(esc(o.titulo), `entrega era ${dataCurta(o.previsao)}`, { attrs: `data-abrir="obra:${o.id}"`, dir: `<button type="button" class="btn peq" data-acao="avisarAtraso" data-id="${o.id}" title="Avisar o cliente">${ic('whatsapp-logo')}</button>` })), 'Nenhuma obra atrasada'))
      + bloco('Sem diário há mais de 2 dias', 'camera', ldLista(parado.map((o) => ldItem(esc(o.titulo), esc(cli(a, o.cliente)?.nome || ''), { dir: `<button type="button" class="btn peq" data-acao="novoDiario" data-id="${o.id}">${ic('camera')}Registrar</button>` })), 'Todas com registro recente'))
      + bloco('Atalhos', 'lightning', atalhos([['Nova obra', 'plus', 'data-acao="novaObra"', true], ['Exportar lista (planilha)', 'download-simple', 'data-acao="exportarCSV" data-t="obras"']]));
  },
  orcamentos: (a) => {
    const vencendo = obs(a).filter((o) => o.status === 'orcamento' && o.validade && diasAte(o.validade) <= 3).sort((x, y) => x.validade.localeCompare(y.validade));
    const semResposta = obs(a).filter((o) => o.status === 'orcamento' && o.enviado_em && diasAte(o.enviado_em) <= -3);
    return bloco('Calcular o preço', 'calculator', `<p>Do custo ao preço final com a sua margem.</p>${calc('preco', campoN('custo', 'Custo (R$)', 10000) + campoN('margem', 'Margem (%)', Number(a.db.cfg.margem_padrao) || 15))}`)
      + bloco('Calcular material de piso', 'ruler', calc('piso', campoN('area', 'Área (m²)', 20) + campoN('perda', 'Perda (%)', 10) + campoN('caixa', 'm² por caixa', 2.3) + `<label>Colagem<select name="colagem"><option value="simples">Simples</option><option value="dupla">Dupla (peças grandes)</option></select></label>`))
      + bloco('Calcular tinta', 'drop', calc('tinta', campoN('area', 'Paredes (m²)', 60) + campoN('demaos', 'Demãos', 2) + campoN('rend', 'Rende m²/litro', 10)))
      + bloco('Calcular concreto', 'stack', calc('concreto', campoN('comp', 'Comprimento (m)', 4) + campoN('larg', 'Largura (m)', 3) + campoN('esp', 'Espessura (cm)', 8, 'class="largo"')))
      + bloco('Vencendo ou sem resposta', 'hourglass', ldLista([...vencendo.map((o) => ldItem(esc(o.titulo), diasAte(o.validade) < 0 ? 'proposta vencida' : `vence ${dataCurta(o.validade)}`, { attrs: `data-abrir="obra:${o.id}:orcamento"` })), ...semResposta.filter((o) => !vencendo.includes(o)).map((o) => ldItem(esc(o.titulo), `enviado ${relativo(o.enviado_em)}, sem resposta`, { dir: `<button type="button" class="btn peq" data-acao="enviarOrc" data-id="${o.id}" title="Mandar de novo">${ic('whatsapp-logo')}</button>` }))], 'Nenhum orçamento parado'));
  },
  cronograma: (a) => {
    const atr = obs(a).filter((o) => ['andamento', 'pausada'].includes(o.status)).flatMap((o) => planoEtapas(o).filter(atrasoEtapa).map((e) => ({ o, e })));
    return bloco('Calcular data de entrega', 'calendar-check', `<p>Some dias de serviço a partir do início.</p>${calc('prazo', `<label>Início<input type="date" name="ini" value="${hoje()}"></label>${campoN('dias', 'Dias de serviço', 20)}<label class="largo" style="flex-direction:row;align-items:center;gap:6px;font-weight:500;color:var(--tx)"><input type="checkbox" name="uteis" checked style="height:auto"> Só dias úteis</label>`)}`)
      + bloco('Etapas atrasadas', 'warning', ldLista(atr.map(({ o, e }) => ldItem(esc(e.nome), `${esc(o.titulo)} · era até ${dataCurta(e.fim)}`, { attrs: `data-abrir="obra:${o.id}:cronograma"`, dir: `<button type="button" class="btn peq" data-acao="avisarAtraso" data-id="${o.id}" title="Avisar o cliente">${ic('whatsapp-logo')}</button>` })), 'Tudo dentro do prazo'))
      + bloco('Entregas no mês', 'flag', ldLista(proxEntregas(a, 31).map((o) => ldItem(esc(o.titulo), `${Math.round(progresso(o))}% pronto`, { attrs: `data-abrir="obra:${o.id}"`, dir: `<b class="num">${dataCurta(o.previsao)}</b>` })), 'Nenhuma entrega nos próximos 30 dias'));
  },
  diario: (a) => {
    const rodando = obs(a).filter((o) => o.status === 'andamento'), semHoje = rodando.filter((o) => !diaDe(a, o.id).some((x) => x.data === hoje()));
    const semana = a.db.lista('diario').filter((x) => diasAte(x.data) >= -6);
    return bloco('Ainda sem registro hoje', 'camera', ldLista(semHoje.map((o) => ldItem(esc(o.titulo), esc(cli(a, o.cliente)?.nome || ''), { dir: `<button type="button" class="btn peq pri" data-acao="novoDiario" data-id="${o.id}">${ic('camera')}Registrar</button>` })), 'Todas as obras rodando já têm o registro de hoje'))
      + bloco('Últimos 7 dias', 'chart-bar', ldNums([[num(semana.length), 'registros'], [num(soma(semana, (x) => (x._anexos || []).length)), 'fotos'], [num(semana.filter((x) => x.clima === 'Chuva').length), 'dias de chuva'], [num(new Set(semana.map((x) => x.obra)).size), 'obras com registro']]))
      + bloco('Dica', 'sparkle', '<p>Registre o dia com 2 ou 3 fotos: elas aparecem na página do cliente, e o cliente que vê a obra andando paga as etapas em dia.</p>');
  },
  gastos: (a) => {
    const ym = hoje().slice(0, 7), mes = a.db.lista('gastos').filter((g) => g.data.startsWith(ym) && !g.cliente_paga);
    const porObra = Object.entries(agrupar(mes, (g) => g.obra)).map(([id, l]) => ({ o: ob(a, id), v: soma(l, (g) => g.valor) })).sort((x, y) => y.v - x.v);
    const estouro = obs(a).filter((o) => o.status === 'andamento' && meus(a, o.id) > o.valor * 0.7);
    return bloco(`Gastos de ${nomeMes(ym)}`, 'receipt', ldNums([[moedaC(soma(mes, (g) => g.valor)), 'total do mês'], [num(mes.length), 'lançamentos']]) + `<div style="margin-top:10px">${barrasH(CATS.map(([k, n]) => ({ rot: n, v: soma(mes.filter((g) => g.categoria === k), (g) => g.valor) })).filter((x) => x.v).sort((x, y) => y.v - x.v), { fmt: moedaC })}</div>`)
      + bloco('Por obra no mês', 'house-line', ldLista(porObra.slice(0, 6).map(({ o, v }) => ldItem(esc(o?.titulo || 'Obra'), '', { attrs: o ? `data-abrir="obra:${o.id}:gastos"` : '', dir: `<b class="num">${moedaC(v)}</b>` })), 'Nenhum gasto neste mês'))
      + bloco('Gasto perto do valor da obra', 'warning', ldLista(estouro.map((o) => ldItem(esc(o.titulo), `${pct((meus(a, o.id) / o.valor) * 100)} do valor já gasto`, { attrs: `data-abrir="obra:${o.id}:gastos"` })), 'Nenhuma obra passou de 70% do valor em gastos'))
      + bloco('Atalhos', 'lightning', atalhos([['Lançar gasto', 'receipt', 'data-acao="novoGasto"', true], ['Exportar gastos do mês', 'download-simple', 'data-acao="exportarCSV" data-t="gastos"']]));
  },
  equipe: (a) => {
    const hojeL = a.db.lista('diarias').filter((x) => x.data === hoje()), eq = a.db.lista('equipe'), semPres = eq.filter((p) => !hojeL.some((x) => x.pessoa === p.id));
    const p0 = eq[0];
    return bloco('Presença de hoje', 'check-circle', `${ldNums([[num(hojeL.filter((x) => x.tipo !== 'falta').length), 'trabalhando'], [num(hojeL.filter((x) => x.tipo === 'falta').length), 'faltas']])}<div style="margin-top:8px">${semPres.length ? `<p>Sem marcação hoje: ${semPres.map((p) => esc(p.nome.split(' ')[0])).join(', ')}.</p>` : ''}${atalhos([['Marcar presença', 'check-circle', 'data-acao="marcarPresenca"', true]])}</div>`)
      + bloco('Calcular o pagamento', 'calculator', calc('diarias', campoN('diaria', 'Diária (R$)', p0?.diaria || 180) + campoN('inteiras', 'Diárias inteiras', 5) + campoN('meias', 'Meias diárias', 0) + campoN('vales', 'Vales (R$)', 0)))
      + bloco('Maiores saldos a pagar', 'hand-coins', ldLista(eq.map((p) => ({ p, s: saldoPessoa(a, p.id) })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, 5).map(({ p, s }) => ldItem(esc(p.nome), esc(p.funcao || ''), { dir: `<button type="button" class="btn peq pri" data-acao="pagarEquipe" data-id="${p.id}">${moedaC(s)}</button>` })), 'Ninguém com saldo a receber'))
      + bloco('Atalhos', 'lightning', atalhos([['Nova pessoa', 'user-plus', 'data-acao="novoCad" data-c="equipe"']]));
  },
  terceiros: (a) => {
    const l = terc(a), devo = l.filter((t) => medidoTerc(t) > pagoTerc(t)), falta = l.filter((t) => medidoTerc(t) < t.valor);
    return bloco('Medido e não pago', 'hand-coins', ldLista(devo.map((t) => ldItem(esc(t.servico), esc(t.nome), { dir: `<button type="button" class="btn peq pri" data-acao="pagarTerc" data-id="${t.id}">${moedaC(medidoTerc(t) - pagoTerc(t))}</button>` })), 'Nada a pagar agora'))
      + bloco('Falta medir', 'ruler', ldLista(falta.map((t) => ldItem(esc(t.servico), `${esc(ob(a, t.obra)?.titulo || '')} · ${pct(t.valor ? (medidoTerc(t) / t.valor) * 100 : 0)} feito`, { dir: `<button type="button" class="btn peq" data-acao="medir" data-id="${t.id}">${ic('ruler')}Medir</button>` })), 'Todos os serviços medidos'))
      + bloco('Atalhos', 'lightning', atalhos([['Novo terceirizado', 'plus', 'data-acao="novoCad" data-c="terceiros"', true]]))
      + bloco('Dica', 'sparkle', '<p>Pague por medição: só o que ficou pronto. Assim o serviço não para no meio com o dinheiro todo adiantado.</p>');
  },
  ferramentas: (a) => {
    const l = ferr(a), esquecidas = l.filter((f) => foraHa(f) > 15), porObra = Object.entries(agrupar(l.filter((f) => f.local === 'obra'), (f) => f.obra));
    return bloco('Fora há mais de 15 dias', 'warning', ldLista(esquecidas.map((f) => ldItem(esc(f.nome), `${esc(ob(a, f.obra)?.titulo || '')} · há ${foraHa(f)} dias`, { dir: `<button type="button" class="btn peq" data-acao="devolverFerr" data-id="${f.id}">${ic('arrow-u-down-left')}Voltou</button>` })), 'Nenhuma ferramenta esquecida'))
      + bloco('Em cada obra', 'house-line', ldLista(porObra.map(([oid, fs]) => ldItem(esc(ob(a, oid)?.titulo || 'Obra'), fs.map((f) => esc(f.nome)).join(', '), { dir: `<b class="num">${fs.length}</b>` })), 'Todas no depósito'))
      + bloco('Atalhos', 'lightning', atalhos([['Nova ferramenta', 'plus', 'data-acao="novoCad" data-c="ferramentas"', true]]));
  },
  deposito: (a) => {
    const dep = a.db.lista('deposito').filter((x) => Number(x.qtd) > 0), compras = a.db.lista('compras').filter((c) => c.status === 'comprar');
    const palavra = (s) => normal(s).split(/\s+/).find((w) => w.length > 3) || '';
    const usar = dep.flatMap((x) => compras.filter((c) => palavra(x.item) && normal(c.item).includes(palavra(x.item))).map((c) => ({ x, c })));
    return bloco('Dá para usar agora', 'piggy-bank', `<p>Itens do depósito parecidos com o que as obras precisam comprar.</p>${ldLista(usar.map(({ x, c }) => ldItem(esc(x.item), `pedido em ${esc(ob(a, c.obra)?.titulo || '')}: ${esc(c.item)}`, { dir: `<button type="button" class="btn peq pri" data-acao="usarDeposito" data-id="${x.id}">${ic('truck')}Usar</button>` })), 'Nenhuma compra pendente bate com o depósito')}`)
      + bloco('Valor parado', 'warehouse', ldNums([[moedaC(soma(dep, (x) => (Number(x.qtd) || 0) * (Number(x.unit) || 0))), 'em material'], [num(dep.length), 'itens']]))
      + bloco('Atalhos', 'lightning', atalhos([['Guardar material', 'plus', 'data-acao="novoCad" data-c="deposito"', true]]));
  },
  garantia: (a) => {
    const venc = obs(a).filter((o) => emGarantia(o)).map((o) => ({ o, fim: diaMais(90, o.entregue_em) })).sort((x, y) => x.fim.localeCompare(y.fim));
    const recentes = obs(a).filter((o) => o.status === 'concluida' && o.entregue_em && diasAte(o.entregue_em) >= -30);
    return bloco('Garantias em vigor', 'shield-check', ldLista(venc.map(({ o, fim }) => ldItem(esc(o.titulo), `até ${dataCurta(fim)} · ${diasAte(fim)} dias`, { attrs: `data-abrir="obra:${o.id}"` })), 'Nenhuma obra na garantia'))
      + bloco('Pedir avaliação e indicação', 'star', `<p>Obras entregues nos últimos 30 dias. Cliente satisfeito indica: peça enquanto a obra está fresca.</p>${ldLista(recentes.map((o) => ldItem(esc(o.titulo), esc(cli(a, o.cliente)?.nome || ''), { dir: `<button type="button" class="btn peq" data-acao="pedirIndicacao" data-id="${o.id}">${ic('whatsapp-logo')}Pedir</button>` })), 'Nenhuma entrega recente')}`)
      + bloco('Atalhos', 'lightning', atalhos([['Abrir chamado', 'plus', 'data-acao="novoChamado"', true]]));
  },
  clientes: (a) => {
    const fech = (c) => obs(a).filter((o) => o.cliente === c.id && o.status !== 'orcamento');
    const top = a.db.lista('clientes').map((c) => ({ c, v: soma(fech(c), (o) => o.valor) })).filter((x) => x.v).sort((x, y) => y.v - x.v).slice(0, 5);
    const voltar = a.db.lista('clientes').filter((c) => { const l = obs(a).filter((o) => o.cliente === c.id); return l.length && l.every((o) => o.status === 'concluida' && o.entregue_em && diasAte(o.entregue_em) <= -120); });
    return bloco('Quem mais fechou', 'trend-up', ldLista(top.map(({ c, v }) => ldItem(esc(c.nome), `${fech(c).length} ${fech(c).length === 1 ? 'obra' : 'obras'}`, { dir: `<b class="num">${moedaC(v)}</b>` })), 'Nenhuma obra fechada ainda'))
      + bloco('Chamar de volta', 'chat-circle-text', `<p>Clientes com obra entregue há mais de 4 meses: uma mensagem pode virar a próxima reforma.</p>${ldLista(voltar.map((c) => ldItem(esc(c.nome), esc(c.endereco || ''), { dir: `<button type="button" class="btn peq" data-acao="chamarDeVolta" data-id="${c.id}">${ic('whatsapp-logo')}Mandar</button>` })), 'Ninguém para chamar agora')}`)
      + bloco('Atalhos', 'lightning', atalhos([['Novo cliente', 'user-plus', 'data-acao="novoCad" data-c="clientes"', true], ['Exportar clientes', 'download-simple', 'data-acao="exportarCSV" data-t="clientes"']]));
  },
  relatorios: (a) => {
    const ym = hoje().slice(0, 7), rec = soma(obs(a).flatMap((o) => o.etapas.filter((e) => e.pago && e.pago_em?.startsWith(ym))), (e) => e.valor), gas = soma(a.db.lista('gastos').filter((g) => g.data.startsWith(ym) && !g.cliente_paga), (g) => g.valor);
    return bloco(`Resultado de ${nomeMes(ym)}`, 'chart-bar', ldNums([[moedaC(rec), 'recebido'], [moedaC(gas), 'gasto'], [moedaC(rec - gas), 'sobrou'], [num(obs(a).filter((o) => o.entregue_em?.startsWith(ym)).length), 'obras entregues']]))
      + bloco('Levar para o contador', 'printer', atalhos([['Imprimir o mês (PDF)', 'printer', 'data-acao="imprimirMes"', true], ['Exportar gastos (planilha)', 'download-simple', 'data-acao="exportarCSV" data-t="gastos-todos"'], ['Exportar obras (planilha)', 'download-simple', 'data-acao="exportarCSV" data-t="obras"']]));
  },
};

// ---------------------------------------------------------------- documentos
function docOrcamento(a, o) {
  const c = cli(a, o.cliente), cfg = a.db.cfg;
  return `<div class="doc"><div class="entre" style="align-items:flex-start"><div><h1>${esc(a.empresa)}</h1><div style="color:#555">${esc(cfg.endereco || '')} · ${esc(cfg.telefone || '')}</div></div><div style="text-align:right"><b style="font-size:16px">${o.status === 'orcamento' ? 'Orçamento' : 'Contrato de obra'}</b><div style="color:#555">${dataBR(hoje())}</div></div></div>
    <h2>Cliente e obra</h2><table><tr><td>${esc(c?.nome || '')}</td><td>${esc(c?.telefone || '')}</td></tr><tr><td colspan="2"><b>${esc(o.titulo)}</b> · ${esc(o.endereco || '')}</td></tr><tr><td>Início: ${dataBR(o.inicio)}</td><td>Previsão de entrega: ${dataBR(o.previsao)}</td></tr></table>
    ${o.itens?.length ? `<h2>Itens do orçamento</h2><table><thead><tr><th>Item</th><th class="n">Qtd.</th><th class="n">Unitário</th><th class="n">Total</th></tr></thead><tbody>${o.itens.map((x) => `<tr><td>${esc(x.desc)}</td><td class="n">${num(x.qtd)} ${esc(x.unidade || '')}</td><td class="n">${moeda(x.unit * (1 + (Number(o.margem) || 0) / 100))}</td><td class="n">${moeda(x.qtd * x.unit * (1 + (Number(o.margem) || 0) / 100))}</td></tr>`).join('')}<tr><td colspan="3"><b>Total</b>${o.validade ? ` · proposta válida até ${dataBR(o.validade)}` : ''}</td><td class="n"><b>${moeda(o.valor)}</b></td></tr></tbody></table>` : ''}
    ${o.etapas.length ? `<h2>Etapas e pagamento</h2><table><thead><tr><th>Etapa</th><th class="n">Valor</th></tr></thead><tbody>${o.etapas.map((e) => `<tr><td>${esc(e.nome)}</td><td class="n">${moeda(e.valor)}</td></tr>`).join('')}<tr><td><b>Total</b></td><td class="n"><b>${moeda(o.valor)}</b></td></tr></tbody></table>` : ''}
    <div style="margin-top:10px;color:#444;font-size:11px">Cada etapa é paga quando concluída, pelo PIX enviado no link de acompanhamento da obra. Material comprado pelo cliente não está incluso no valor. Garantia de 90 dias para a mão de obra.</div><div class="ass"><div>${esc(a.empresa)}</div><div>${esc(c?.nome || 'Cliente')}</div></div></div>`;
}

function aprovarOrcamento(a, o, quem) {
  const etapas = o.etapas.length ? o.etapas : (o.itens || []).filter((x) => x.tipo !== 'material').map((x) => ({ nome: x.desc, valor: Math.round(x.qtd * x.unit * (1 + (Number(o.margem) || 0) / 100)), status: 'pendente', pago: false }));
  const resto = o.valor - soma(etapas, (e) => e.valor);
  if (!o.etapas.length && resto > 0) etapas.unshift({ nome: 'Entrada para material', valor: resto, status: 'pendente', pago: false });
  if (etapas[0]) etapas[0] = { ...etapas[0], status: 'andamento' };
  a.db.salvar('obras', { id: o.id, status: 'andamento', etapas, aprovado_em: hoje(), aprovado_por: quem === 'manualmente' ? '' : quem });
  a.db.registrar(`obras:${o.id}`, `Orçamento aprovado ${quem === 'manualmente' ? 'manualmente' : `pelo cliente (${quem})`}: ${moeda(o.valor)}`, { icone: 'check', tom: 'ok' });
}

function decidirExtra(a, x, aprovado, quem) {
  a.db.salvar('aditivos', { id: x.id, status: aprovado ? 'aprovado' : 'recusado', decidido_em: hoje() });
  const o = ob(a, x.obra);
  if (aprovado) a.db.salvar('obras', { id: o.id, valor: o.valor + x.valor, previsao: x.prazo_dias ? diaMais(Number(x.prazo_dias), o.previsao) : o.previsao, etapas: [...o.etapas, { nome: `Extra: ${x.descricao}`, valor: x.valor, status: 'pendente', pago: false }] });
  a.db.registrar(`obras:${o.id}`, `Serviço extra ${aprovado ? 'aprovado' : 'recusado'} ${quem}: ${x.descricao} (${moeda(x.valor)})`, { icone: aprovado ? 'check' : 'x', tom: aprovado ? 'ok' : '' });
}

function docTermo(a, o) {
  const c = cli(a, o.cliente), cfg = a.db.cfg;
  return `<div class="doc"><div class="entre" style="align-items:flex-start"><div><h1>${esc(a.empresa)}</h1><div style="color:#555">${esc(cfg.endereco || '')} · ${esc(cfg.telefone || '')}</div></div><div style="text-align:right"><b style="font-size:16px">Termo de entrega de obra</b><div style="color:#555">${dataBR(hoje())}</div></div></div>
    <h2>Obra</h2><table><tr><td><b>${esc(o.titulo)}</b></td><td>${esc(o.endereco || '')}</td></tr><tr><td>Cliente: ${esc(c?.nome || '')}</td><td>Período: ${dataBR(o.inicio)} a ${dataBR(o.status === 'concluida' && o.previsao < hoje() ? o.previsao : hoje())}</td></tr></table>
    <h2>Serviços executados</h2><table><tbody>${o.etapas.map((e) => `<tr><td>${esc(e.nome)}</td><td>${e.status === 'feita' ? 'concluído' : 'não executado'}</td><td class="n">${moeda(e.valor)}</td></tr>`).join('')}<tr><td colspan="2"><b>Valor total</b></td><td class="n"><b>${moeda(o.valor)}</b></td></tr><tr><td colspan="2">Recebido</td><td class="n">${moeda(recebido(o))}</td></tr></tbody></table>
    <h2>Vistoria de entrega</h2><table><tbody>${['Limpeza final feita e entulho retirado', 'Instalações elétricas testadas', 'Instalações hidráulicas testadas, sem vazamentos', 'Acabamentos conferidos com o cliente', 'Sobras de material entregues ao cliente'].map((x) => `<tr><td style="width:24px">☐</td><td>${x}</td></tr>`).join('')}</tbody></table>
    <div style="margin-top:10px;color:#444;font-size:11px">Garantia de 90 dias para a mão de obra a partir desta data, sem prejuízo das garantias previstas em lei. Problemas causados por mau uso, falta de manutenção ou intervenção de terceiros não estão cobertos. Pendências anotadas na vistoria serão resolvidas no prazo combinado.</div>
    <div class="ass"><div>${esc(a.empresa)}</div><div>${esc(c?.nome || 'Cliente')} · recebi a obra</div></div></div>`;
}

// ---------------------------------------------------------------- fichas
const fichas = {
  obra(a, id, aba = 'etapas') {
    const o = ob(a, id); if (!o) return null; const c = cli(a, o.cliente), di = diaDe(a, id), ga = gasDe(a, id), i = STATUS.findIndex((s) => s[0] === o.status);
    if (aba === 'etapas' && o.status === 'orcamento' && o.itens?.length) aba = 'orcamento';
    let corpo = '';
    if (aba === 'etapas') corpo = `<div class="gav-sec">${prog(progresso(o))}<p class="mute" style="font-size:12.5px;margin:6px 0 10px">${o.etapas.filter((e) => e.status === 'feita').length} de ${o.etapas.length} etapas concluídas · recebido ${moeda(recebido(o))} de ${moeda(o.valor)}</p>
      ${o.etapas.length ? `<table class="tabela"><thead><tr><th>Etapa</th><th class="n">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${o.etapas.map((e, k) => `<tr><td>${esc(e.nome)}</td><td class="n">${moeda(e.valor)}</td><td>${e.status === 'feita' ? et('Concluída', 'ok') : e.status === 'andamento' ? et('Em andamento', 'info') : et('A fazer', '')} ${e.pago ? et('Paga', 'ok', 'sem-ponto') : ''}</td><td class="acoes">${e.status !== 'feita' ? `<button type="button" class="btn peq" data-acao="etapaFeita" data-id="${id}" data-k="${k}">${ic('check')}Concluir</button>` : !e.pago ? `<button type="button" class="btn peq pri" data-acao="cobrarEtapa" data-id="${id}" data-k="${k}">${ic('qr-code')}Cobrar</button><button type="button" class="btn peq" data-acao="etapaPaga" data-id="${id}" data-k="${k}">${ic('check')}Recebi</button>` : ''}</td></tr>`).join('')}</tbody></table>` : vazio('list-checks', 'Sem etapas', 'Divida a obra em etapas: o cliente paga cada uma quando ela fica pronta.')}
      <div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn" data-acao="novaEtapa" data-id="${id}">${ic('plus')}Etapa</button>${o.etapas.length ? '' : Object.keys(MODELOS_ETAPAS).map((m) => `<button type="button" class="btn" data-acao="etapasModelo" data-id="${id}" data-m="${m}">${ic('list-checks')}Modelo: ${m}</button>`).join('')}</div></div>`;
    if (aba === 'diario') corpo = `<div class="gav-sec"><button type="button" class="btn pri" data-acao="novoDiario" data-id="${id}">${ic('camera')}Registrar o dia</button></div>${di.length ? di.map((x) => `<div class="gav-sec"><div class="entre"><b>${dataCurta(x.data)} · ${esc(x.etapa || '')}</b><span class="mute" style="font-size:12px">${num(x.equipe)} na equipe · ${esc(x.clima)}</span></div><p style="margin:6px 0">${esc(x.texto)}</p>${a.anexos.html('diario', x.id, { titulo: 'Fotos', dica: 'Tire fotos do avanço: elas vão para a página do cliente.' })}</div>`).join('') : `<div class="gav-sec">${vazio('camera', 'Nenhum registro', 'Registre o dia com fotos. O cliente acompanha pelo link.')}</div>`}`;
    if (aba === 'gastos') corpo = `<div class="gav-sec">${kpis([{ rot: 'Seus gastos', icone: 'receipt', val: moeda(meus(a, id)) }, { rot: 'Pagos pelo cliente', icone: 'user', val: moeda(soma(ga.filter((g) => g.cliente_paga), (g) => g.valor)) }, { rot: 'Lucro previsto', icone: 'trend-up', val: moeda(lucro(a, o)), nota: pct((lucro(a, o) / (o.valor || 1)) * 100) + ' do valor' }])}
      ${ga.length ? `<table class="tabela" style="margin-top:12px"><thead><tr><th>Data</th><th>Gasto</th><th>Quem pagou</th><th class="n">Valor</th><th></th></tr></thead><tbody>${ga.map((g) => `<tr><td>${dataCurta(g.data)}</td><td>${esc(g.descricao)}<span class="sub">${esc(nomeCat(g.categoria))}</span></td><td>${g.cliente_paga ? et('Cliente', 'info') : et('Você', '')}</td><td class="n">${moeda(g.valor)}</td><td class="acoes"><button type="button" class="btn fant peq ic-so" data-acao="tirarGasto" data-id="${g.id}" aria-label="Remover">${ic('trash')}</button></td></tr>`).join('')}</tbody></table>` : vazio('receipt', 'Nenhum gasto lançado')}
      <div class="flex" style="margin-top:12px"><button type="button" class="btn" data-acao="novoGasto" data-id="${id}">${ic('plus')}Lançar gasto</button></div></div>`;
    if (aba === 'compras') {
      const cp = cpDe(a, id), falta = cp.filter((x) => x.status === 'comprar');
      corpo = `<div class="gav-sec">${kpis([{ rot: 'A comprar', icone: 'shopping-cart', val: num(falta.length), nota: moeda(soma(falta, (x) => x.estimado || 0)) + ' estimado' }, { rot: 'Você compra', icone: 'user', val: moeda(soma(falta.filter((x) => x.quem !== 'cliente'), (x) => x.estimado || 0)) }, { rot: 'O cliente compra', icone: 'users', val: moeda(soma(falta.filter((x) => x.quem === 'cliente'), (x) => x.estimado || 0)) }])}
        <div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn" data-acao="novaCompra" data-id="${id}">${ic('plus')}Item</button>${falta.some((x) => x.quem === 'cliente') ? `<button type="button" class="btn" data-acao="listaCliente" data-id="${id}">${ic('whatsapp-logo')}Mandar lista ao cliente</button>` : ''}</div></div>
        <div class="gav-sec">${cp.length ? `<table class="tabela"><thead><tr><th>Item</th><th>Quem compra</th><th class="n">Estimado</th><th></th></tr></thead><tbody>${cp.map((x) => `<tr style="${x.status === 'comprado' ? 'opacity:.55' : ''}"><td><span class="prim" style="${x.status === 'comprado' ? 'text-decoration:line-through' : ''}">${esc(x.item)}</span><span class="sub">${esc(x.quantidade || '')}</span></td><td>${x.quem === 'cliente' ? et('Cliente', 'info') : et('Você', '')}</td><td class="n">${x.estimado ? moeda(x.estimado) : '—'}</td><td class="acoes">${x.status === 'comprar' ? `<button type="button" class="btn peq" data-acao="comprei" data-id="${x.id}">${ic('check')}Comprado</button>` : et('Comprado', 'ok')}<button type="button" class="btn fant peq ic-so" data-acao="tirarCompra" data-id="${x.id}" aria-label="Remover">${ic('trash')}</button></td></tr>`).join('')}</tbody></table>` : vazio('shopping-cart', 'Lista vazia', 'Anote o material que falta. Ao marcar como comprado, o gasto entra na obra.')}</div>`;
    }
    if (aba === 'extras') {
      const ad = adDe(a, id);
      corpo = `<div class="gav-sec"><p class="mute" style="font-size:12.5px;margin:0 0 10px">Apareceu um serviço fora do combinado? Registre aqui e o cliente aprova pelo link da obra. Aprovado, ele vira uma etapa e o valor da obra aumenta.</p><button type="button" class="btn pri" data-acao="novoExtra" data-id="${id}">${ic('plus')}Serviço extra</button></div>
        ${ad.length ? ad.map((x) => `<div class="gav-sec"><div class="entre"><b>${esc(x.descricao)}</b><b class="num">${moeda(x.valor)}</b></div><p class="mute" style="font-size:12.5px;margin:4px 0 8px">${esc(x.motivo || '')}${x.prazo_dias ? ` · +${x.prazo_dias} dias de prazo` : ''} · ${dataCurta(x.data)}</p>
          <div class="flex" style="flex-wrap:wrap">${x.status === 'pendente' ? `${et('Esperando o cliente', 'al')}<button type="button" class="btn peq pri" data-acao="pedirAprovacao" data-id="${x.id}">${ic('paper-plane-tilt')}Pedir aprovação</button><button type="button" class="btn peq" data-acao="aprovarExtra" data-id="${x.id}">${ic('check')}Aprovado</button><button type="button" class="btn fant peq" data-acao="recusarExtra" data-id="${x.id}">Recusado</button>` : x.status === 'aprovado' ? et('Aprovado · virou etapa', 'ok') : et('Recusado', '')}</div></div>`).join('') : `<div class="gav-sec">${vazio('plus-circle', 'Nenhum serviço extra')}</div>`}`;
    }
    if (aba === 'orcamento') {
      const it = o.itens || [], mat = soma(it.filter((x) => x.tipo === 'material'), (x) => x.qtd * x.unit), mao = soma(it.filter((x) => x.tipo !== 'material'), (x) => x.qtd * x.unit);
      corpo = `<div class="gav-sec">${kpis([{ rot: 'Material', icone: 'package', val: moeda(mat) }, { rot: 'Mão de obra', icone: 'hammer', val: moeda(mao) }, { rot: `Total com margem de ${Number(o.margem) || 0}%`, icone: 'currency-circle-dollar', val: moeda(totalOrc(o)), nota: o.validade ? `vale até ${dataCurta(o.validade)}` : '' }])}</div>
        <div class="gav-sec">${it.length ? `<table class="tabela"><thead><tr><th>Item</th><th class="n">Qtd.</th><th class="n">Unitário</th><th class="n">Total</th><th></th></tr></thead><tbody>${it.map((x, k) => `<tr><td>${esc(x.desc)}<span class="sub">${x.tipo === 'material' ? 'Material' : 'Mão de obra'}</span></td><td class="n">${num(x.qtd)} ${esc(x.unidade || '')}</td><td class="n">${moeda(x.unit)}</td><td class="n">${moeda(x.qtd * x.unit)}</td><td class="acoes">${o.status === 'orcamento' ? `<button type="button" class="btn fant peq ic-so" data-acao="tirarItem" data-id="${id}" data-k="${k}" aria-label="Remover">${ic('trash')}</button>` : ''}</td></tr>`).join('')}</tbody></table>` : vazio('clipboard-text', 'Orçamento sem itens', 'Liste material e mão de obra: o total já sai com a sua margem.')}
          ${o.status === 'orcamento' ? `<div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn" data-acao="novoItem" data-id="${id}">${ic('plus')}Item</button><button type="button" class="btn" data-acao="margemOrc" data-id="${id}">${ic('percent')}Margem e validade</button>${it.length ? `<button type="button" class="btn pri" data-acao="enviarOrc" data-id="${id}">${ic('paper-plane-tilt')}Mandar para aprovar</button><button type="button" class="btn" data-acao="aprovarOrc" data-id="${id}">${ic('check')}Cliente aprovou</button>` : ''}</div>` : `<p class="mute" style="font-size:12.5px;margin-top:10px">${o.aprovado_em ? `Aprovado em ${dataCurta(o.aprovado_em)}${o.aprovado_por ? ` por ${esc(o.aprovado_por)}` : ''}.` : 'Orçamento fechado.'}</p>`}</div>`;
    }
    if (aba === 'cronograma') corpo = `<div class="gav-sec"><p class="mute" style="font-size:12.5px;margin:0 0 10px">Datas de cada etapa. Sem data, a etapa divide o prazo da obra em partes iguais.</p><table class="tabela"><thead><tr><th>Etapa</th><th>Início</th><th>Fim</th><th></th></tr></thead><tbody>${planoEtapas(o).map((e) => `<tr><td>${esc(e.nome)}${atrasoEtapa(e) ? ` ${et('Atrasada', 'er')}` : ''}</td><td>${dataCurta(e.ini)}</td><td>${dataCurta(e.fim)}</td><td class="acoes"><button type="button" class="btn fant peq" data-acao="datasEtapa" data-id="${id}" data-k="${e.k}">${ic('calendar-blank')}Datas</button></td></tr>`).join('')}</tbody></table></div>`;
    if (aba === 'qualidade') corpo = o.etapas.length ? o.etapas.map((e, k) => { const q = qualiDe(o, k), ok = q.filter((x) => x.ok).length; return `<div class="gav-sec"><div class="entre"><b>${esc(e.nome)}</b>${ok === q.length ? et('Conferida', 'ok') : et(`${ok} de ${q.length}`, e.status === 'feita' ? 'al' : '')}</div><div class="col" style="gap:4px;margin-top:8px">${q.map((x, j) => `<label class="flex" style="gap:8px;font-size:13px"><input type="checkbox" data-mudar="quali" data-id="${id}" data-k="${k}" data-j="${j}" ${x.ok ? 'checked' : ''}>${esc(x.t)}</label>`).join('')}</div></div>`; }).join('') : `<div class="gav-sec">${vazio('list-checks', 'Sem etapas', 'Crie as etapas para ter o checklist de qualidade de cada uma.')}</div>`;
    if (aba === 'dados') corpo = `<div class="gav-sec">${props([['user', 'Cliente', c ? `${esc(c.nome)} · <a href="${telLink(c.telefone)}" target="_blank" rel="noopener">WhatsApp</a>` : null], ['map-pin', 'Endereço', esc(o.endereco || '')], ['calendar-blank', 'Início e entrega', `${dataCurta(o.inicio)} → <span class="${atrasada(o) ? 'er-tx' : ''}">${dataCurta(o.previsao)}</span>`], ['currency-circle-dollar', 'Valor fechado', moeda(o.valor)], ['eye', 'Gastos na página do cliente', o.mostrar_gastos ? 'aparecem' : 'escondidos']])}</div>
      <div class="gav-sec"><h4>Histórico</h4>${linhaDoTempo(a.db.historico(`obras:${id}`).map((h) => ({ quando: h.quando, icone: h.icone, tom: h.tom, html: esc(h.texto) })))}</div>`;
    return { html: ficha({ tipo: 'Obra', icone: 'house-line', titulo: esc(o.titulo), avatar: av(c?.nome || '?', 'g'), sub: `<span>${esc(c?.nome || '')}</span><b class="num" style="color:var(--tx)">· ${moeda(o.valor)}</b>${atrasada(o) ? et('Prazo vencido', 'al') : ''}`,
      extra: `<div class="etapas" style="margin-top:12px">${STATUS.map(([s, n], j) => `<button type="button" class="${j < i ? 'feita' : j === i ? 'atual' : ''}" data-acao="statusObra" data-id="${id}" data-s="${s}">${n}</button>`).join('')}</div>
        <div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn pri" data-acao="linkObra" data-id="${id}">${ic('link')}Página do cliente</button><button type="button" class="btn" data-acao="novoDiario" data-id="${id}">${ic('camera')}Registrar o dia</button><button type="button" class="btn" data-acao="imprimirObra" data-id="${id}">${ic('printer')}${o.status === 'orcamento' ? 'Orçamento' : 'Contrato'}</button>${o.status === 'concluida' || (o.etapas.length && o.etapas.every((e) => e.status === 'feita')) ? `<button type="button" class="btn" data-acao="imprimirTermo" data-id="${id}">${ic('seal-check')}Termo de entrega</button>` : ''}</div>`,
      aba, abas: [...(o.status === 'orcamento' || o.itens?.length ? [['orcamento', 'Orçamento', (o.itens || []).length || '']] : []), ['etapas', 'Etapas e pagamento', o.etapas.length], ['cronograma', 'Cronograma', planoEtapas(o).filter(atrasoEtapa).length || ''], ['qualidade', 'Qualidade', ''], ['diario', 'Diário', di.length], ['gastos', 'Gastos', ga.length], ['compras', 'Compras', cpDe(a, id).filter((x) => x.status === 'comprar').length || ''], ['extras', 'Extras', adDe(a, id).filter((x) => x.status === 'pendente').length || ''], ['dados', 'Dados']], corpo,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="obras" data-id="${id}">${ic('pencil-simple')}Editar</button><button type="button" class="btn fant peq ic-so" data-acao="excluirObra" data-id="${id}" aria-label="Excluir">${ic('trash')}</button>` }), montar: (g) => (g.dataset.aba = aba) };
  },
};

// ---------------------------------------------------------------- aplicativo
const app = criarApp({
  id: 'obras', paginaSite: 'veltria-obras.html', nome: 'Veltria Obras', sub: 'Gestão inteligente de obras', marcaSub: 'Gestão inteligente de obras', logo: new URL('logo.png', import.meta.url).href, produto: { mensal: 119, unico: true }, cor: '#c84a0c', icone: 'house-line', empresa: 'Reforma Certa · Davi Nunes', conta: 'Reformas residenciais · Belo Horizonte',
  semente, colecoes, fichas, buscaDica: 'obras e clientes',
  portal: {
    obra: {
      explica: 'O dono da obra acompanha as etapas, vê o diário com fotos e paga cada etapa concluída pelo PIX. Os gastos aparecem só se você ligar essa opção na obra.',
      montar: async (a, id, { fotos }) => {
        const o = ob(a, id); if (!o) return null;
        const dia = await Promise.all(diaDe(a, id).slice(0, 12).map(async (x) => ({ data: x.data, etapa: x.etapa, texto: x.texto, clima: x.clima, fotos: await fotos(x, 6) })));
        return { titulo: o.titulo, endereco: o.endereco, inicio: o.inicio, previsao: o.previsao, valor: o.valor, status: o.status, progresso: Math.round(progresso(o)),
          orcamento: o.status === 'orcamento' && o.itens?.length ? { itens: o.itens.map((x) => ({ desc: x.desc, qtd: x.qtd, unidade: x.unidade, total: Math.round(x.qtd * x.unit * (1 + (Number(o.margem) || 0) / 100) * 100) / 100 })), validade: o.validade || null } : null,
          qualidade: o.etapas.filter((e) => e.status === 'feita').map((e) => ({ nome: e.nome, itens: checklistDe(e.nome).filter((t) => (e.quali || {})[t]) })).filter((x) => x.itens.length),
          garantia: emGarantia(o) ? { ate: diaMais(90, o.entregue_em), chamados: a.db.lista('chamados').filter((x) => x.obra === id).map((x) => ({ descricao: x.descricao, status: x.status, agendado: x.agendado || null })) } : null,
          etapas: o.etapas.map((e, k) => ({ k, nome: e.nome, valor: e.valor, status: e.status, pago: !!e.pago, avisou: !!e.avisou_pago, txid: `OB${id}E${k}`.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) })),
          aditivos: adDe(a, id).map((x) => ({ id: x.id, descricao: x.descricao, motivo: x.motivo, valor: x.valor, prazo_dias: x.prazo_dias, status: x.status })),
          compras: cpDe(a, id).filter((x) => x.status === 'comprar').map((x) => ({ item: x.item, quantidade: x.quantidade, estimado: x.quem === 'cliente' ? x.estimado : 0, quem: x.quem })),
          diario: dia, gastos: o.mostrar_gastos ? gasDe(a, id).slice(0, 40).map((g) => ({ data: g.data, descricao: g.descricao, categoria: nomeCat(g.categoria), valor: g.valor, cliente_paga: !!g.cliente_paga })) : null, pix: a.pixDados() };
      },
      responder: (a, r) => {
        const o = ob(a, r.ref); if (!o) return '';
        if (r.acao === 'aditivo') { const x = a.db.obter('aditivos', r.dados.id); if (!x || x.obra !== o.id || x.status !== 'pendente') return ''; decidirExtra(a, x, !!r.dados.aprovado, 'pelo cliente'); return `${o.titulo}: o cliente ${r.dados.aprovado ? 'aprovou' : 'recusou'} o serviço extra "${x.descricao}" (${moeda(x.valor)})`; }
        if (r.acao === 'aprovar_orc') { if (o.status !== 'orcamento') return ''; aprovarOrcamento(a, o, String(r.dados.nome || '').slice(0, 80)); return `${o.titulo}: ${r.dados.nome || 'o cliente'} aprovou o orçamento de ${moeda(o.valor)} pelo link. A obra já está em andamento.`; }
        if (r.acao === 'chamado') { const d = String(r.dados.descricao || '').trim().slice(0, 500); if (!d || !emGarantia(o)) return ''; a.db.salvar('chamados', { obra: o.id, descricao: d, data: hoje(), status: 'aberto', pelo_cliente: true }); return `${o.titulo}: o cliente abriu um chamado de garantia: "${d}"`; }
        if (r.acao !== 'paguei') return '';
        const k = Number(r.dados.k), e = o.etapas[k]; if (!e || e.pago) return '';
        a.db.salvar('obras', { id: o.id, etapas: o.etapas.map((x, j) => (j === k ? { ...x, avisou_pago: true } : x)) });
        a.db.registrar(`obras:${o.id}`, `Cliente avisou que pagou: ${e.nome} (${moeda(e.valor)})`, { icone: 'currency-circle-dollar', tom: 'ok' });
        return `${o.titulo}: o cliente avisou que pagou "${e.nome}". Confira e marque como recebido.`;
      },
    },
  },
  passos: (a) => [{ id: 'obra', rot: 'Cadastre a primeira obra', feito: obs(a).length > 0, acao: 'novaObra' }, { id: 'pix', rot: 'Cadastre a sua chave PIX', feito: a.temPix(), href: '#/config' }, { id: 'diario', rot: 'Registre o dia com fotos', feito: a.db.lista('diario').length > 0, acao: 'novoDiario' }],
  equipe: [['Davi Nunes', 'Dono'], ['Robson Silva', 'Mestre de obras'], ['Elias Prado', 'Pedreiro ou ajudante'], ['Carla Menezes', 'Financeiro']],
  // cargos de obra: o que cada um pode fazer em cada área (o dono ajusta no Painel do dono)
  cargos: [
    ['Mestre de obras', (id) => (['gastos', 'relatorios', 'orcamentos', 'terceiros'].includes(id) ? 'ver' : 'editar')],
    ['Encarregado', (id) => (['painel', 'obras', 'diario', 'equipe', 'cronograma', 'ferramentas', 'deposito'].includes(id) ? 'editar' : ['gastos', 'relatorios', 'orcamentos', 'terceiros'].includes(id) ? 'nenhum' : 'ver')],
    ['Pedreiro ou ajudante', (id) => (id === 'diario' ? 'editar' : ['painel', 'obras', 'cronograma'].includes(id) ? 'ver' : 'nenhum')],
    ['Engenheiro ou arquiteto', (id) => (['obras', 'diario', 'cronograma', 'orcamentos', 'garantia'].includes(id) ? 'editar' : 'ver')],
    ['Comprador', (id) => (['gastos', 'deposito', 'ferramentas'].includes(id) ? 'editar' : ['relatorios', 'terceiros'].includes(id) ? 'nenhum' : 'ver')],
  ],
  busca: [{ colecao: 'obras', grupo: 'Obras', icone: 'house-line', ficha: 'obra', rot: (o) => o.titulo, sub: (o, a) => cli(a, o.cliente)?.nome || '' }],
  comandos: [{ rot: 'Nova obra', icone: 'plus', acao: (a) => a.acoes.novaObra() }, { rot: 'Registrar o dia', icone: 'camera', acao: (a) => a.acoes.novoDiario({}) }, { rot: 'Lançar gasto', icone: 'receipt', acao: (a) => a.acoes.novoGasto({}) }],
  paginas: [
    { id: 'painel', lado: LADOS.painel, montar: montarLado, rot: 'Painel', icone: 'house', titulo: 'Visão geral', render: painel, atalho: 'i' },
    { id: 'obras', lado: LADOS.obras, montar: montarLado, rot: 'Obras', icone: 'kanban', titulo: 'Obras', render: obrasPag, cheio: true, atalho: 'o', novo: (a) => a.acoes.novaObra(), cont: (a) => obs(a).filter((o) => o.status === 'andamento').length },
    { id: 'orcamentos', lado: LADOS.orcamentos, montar: montarLado, rot: 'Orçamentos', icone: 'clipboard-text', render: orcamentosPag, cont: (a) => obs(a).filter((o) => o.status === 'orcamento').length },
    { id: 'cronograma', lado: LADOS.cronograma, montar: montarLado, rot: 'Cronograma', icone: 'chart-bar-horizontal', render: cronogramaPag, cont: (a) => { const n = obs(a).filter((o) => ['andamento', 'pausada'].includes(o.status)).flatMap(planoEtapas).filter(atrasoEtapa).length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'diario', lado: LADOS.diario, montar: montarLado, rot: 'Diário', titulo: 'Diário de obra', icone: 'camera', render: diarioPag, atalho: 'd' },
    { id: 'gastos', lado: LADOS.gastos, montar: montarLado, rot: 'Gastos', icone: 'receipt', render: gastosPag, atalho: 'g' },
    { id: 'equipe', lado: LADOS.equipe, montar: montarLado, rot: 'Equipe', icone: 'wrench', render: equipePag, cont: (a) => { const n = new Set(a.db.lista('diarias').filter((x) => !x.pago).map((x) => x.pessoa)).size; return n ? { n, tom: 'al' } : 0; } },
    { grupo: 'Gestão' },
    { id: 'terceiros', lado: LADOS.terceiros, montar: montarLado, rot: 'Terceiros', titulo: 'Terceirizados', icone: 'handshake', render: terceirosPag, cont: (a) => { const n = terc(a).filter((t) => medidoTerc(t) > pagoTerc(t)).length; return n ? { n, tom: 'al' } : 0; } },
    { id: 'ferramentas', lado: LADOS.ferramentas, montar: montarLado, rot: 'Ferramentas', icone: 'toolbox', render: ferramentasPag, cont: (a) => { const n = ferr(a).filter((f) => foraHa(f) > 15).length; return n ? { n, tom: 'al' } : 0; } },
    { id: 'deposito', lado: LADOS.deposito, montar: montarLado, rot: 'Depósito', titulo: 'Depósito de sobras', icone: 'warehouse', render: depositoPag },
    { id: 'garantia', lado: LADOS.garantia, montar: montarLado, rot: 'Garantia', titulo: 'Garantia pós-obra', icone: 'lifebuoy', render: garantiaPag, cont: (a) => { const n = chamados(a).filter((x) => x.status !== 'resolvido').length; return n ? { n, tom: 'al' } : 0; } },
    { id: 'clientes', lado: LADOS.clientes, montar: montarLado, rot: 'Clientes', icone: 'users', render: clientesPag },
    { id: 'relatorios', lado: LADOS.relatorios, montar: montarLado, rot: 'Relatórios', icone: 'chart-bar', render: relatoriosPag },
    ...ferramentaPaginas(LADOS, ITENS_MENU, { semPro: true }),
  ],
});

const reab = () => { app.render(); app.reabrir(); };
const escolherObra = (atual) => `<label class="campo largo">Obra<select name="obra" required>${obs(app).filter((o) => o.status !== 'concluida' || o.id === atual).map((o) => `<option value="${o.id}" ${o.id === atual ? 'selected' : ''}>${esc(o.titulo)} · ${esc(cli(app, o.cliente)?.nome || '')}</option>`).join('')}</select></label>`;
const salvarEtapas = (o, etapas, msg) => { app.db.salvar('obras', { id: o.id, etapas }); if (msg) app.db.registrar(`obras:${o.id}`, msg, { icone: 'check', tom: 'ok' }); reab(); };
Object.assign(app.acoes, {
  novaObra: async () => { const o = await editar(app, 'obras'); if (o) { app.render(); app.abrir('obra', o.id); } },
  statusObra: (d) => { app.kanbans.obras ? app.kanbans.obras(d.id, d.s) : app.db.salvar('obras', { id: d.id, status: d.s }); if (d.s === 'concluida' && !ob(app, d.id).entregue_em) app.db.salvar('obras', { id: d.id, entregue_em: hoje() }); reab(); },
  etapasModelo: (d) => { const o = ob(app, d.id), nomes = MODELOS_ETAPAS[d.m], cada = Math.round(o.valor / nomes.length / 10) * 10; salvarEtapas(o, nomes.map((nome, k) => ({ nome, valor: k === nomes.length - 1 ? o.valor - cada * (nomes.length - 1) : cada, status: 'pendente', pago: false })), `Etapas do modelo "${d.m}" criadas`); },
  novaEtapa: async (d) => { const o = ob(app, d.id); const r = await modal({ titulo: 'Nova etapa', largura: 420, corpo: '<form class="form-grade"><label class="campo largo">Etapa<input name="n" required placeholder="Ex.: Instalação elétrica"></label><label class="campo">Valor<input type="number" name="v" min="0" step="10" required></label></form>', botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Adicionar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return fm.reportValidity() ? Object.fromEntries(new FormData(fm)) : false; } }] }); if (!r) return; salvarEtapas(o, [...o.etapas, { nome: r.n, valor: Number(r.v), status: 'pendente', pago: false }]); },
  etapaFeita: async (d) => { const o = ob(app, d.id), k = Number(d.k), q = qualiDe(o, k), falta = q.filter((x) => !x.ok);
    if (falta.length && !(await confirmar(`O checklist de qualidade desta etapa tem ${falta.length} ${falta.length === 1 ? 'item' : 'itens'} sem conferir: ${falta.map((x) => x.t).join('; ')}. Concluir mesmo assim?`, { rotulo: 'Concluir', titulo: 'Qualidade' }))) { app.abrir('obra', d.id, 'qualidade'); return; } const etapas = o.etapas.map((e, j) => (j === k ? { ...e, status: 'feita', feita_em: hoje() } : j === k + 1 && e.status === 'pendente' ? { ...e, status: 'andamento' } : e)); if (o.status === 'orcamento') app.db.salvar('obras', { id: o.id, status: 'andamento' }); salvarEtapas(o, etapas, `Etapa concluída: ${o.etapas[k].nome}`); if (etapas.every((e) => e.status === 'feita')) avisar('Todas as etapas concluídas. Marque a obra como concluída quando entregar.'); },
  etapaPaga: (d) => { const o = ob(app, d.id), k = Number(d.k); salvarEtapas(o, o.etapas.map((e, j) => (j === k ? { ...e, pago: true, pago_em: hoje() } : e)), `Recebido: ${o.etapas[k].nome} (${moeda(o.etapas[k].valor)})`); avisar(`${moeda(o.etapas[k].valor)} recebido`); },
  cobrarEtapa: async (d) => { const o = ob(app, d.id), e = o.etapas[Number(d.k)], c = cli(app, o.cliente); if (!(await app.pedirPix('Para o cliente pagar a etapa pelo PIX, cadastre a sua chave.'))) return; app.portal.compartilhar('obra', d.id, { titulo: `Cobrar · ${e.nome}`, telefone: c?.telefone, texto: `Olá, ${c?.nome.split(' ')[0]}! A etapa "${e.nome}" da ${o.titulo.toLowerCase()} ficou pronta. Veja as fotos e pague ${moeda(e.valor)} pelo PIX aqui:` }); },
  novoDiario: async (d = {}) => {
    if (!obs(app).some((o) => o.status !== 'concluida')) { avisar('Cadastre uma obra primeiro', { tipo: 'erro' }); return; }
    const r = await modal({ titulo: 'Registrar o dia', largura: 520, corpo: `<form class="form-grade">${escolherObra(d.id)}<label class="campo">Data<input type="date" name="data" value="${hoje()}"></label><label class="campo">Pessoas na obra<input type="number" name="equipe" min="0" value="2"></label><label class="campo">Clima<select name="clima">${CLIMA.map((c) => `<option>${c}</option>`).join('')}</select></label>${app.db.lista('equipe').length ? `<fieldset class="campo largo" style="border:0;padding:0"><legend style="margin-bottom:6px">Quem trabalhou hoje (conta a diária)</legend><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:6px">${app.db.lista('equipe').map((p) => `<label class="flex" style="font-weight:400;color:var(--tx);gap:6px"><input type="checkbox" name="eq" value="${p.id}">${esc(p.nome)} <span class="mute">${esc(p.funcao || '')}</span></label>`).join('')}</div></fieldset>` : ''}<label class="campo largo">O que foi feito<textarea name="texto" required placeholder="Ex.: terminamos o contrapiso e começamos o revestimento da parede do box"></textarea></label></form><p class="mute" style="font-size:12.5px;margin-top:8px">Depois de salvar, adicione as fotos no registro.</p>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Salvar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return fm.reportValidity() ? { ...Object.fromEntries(new FormData(fm)), eq: [...fm.querySelectorAll('[name=eq]:checked')].map((x) => x.value) } : false; } }] });
    if (!r) return; const o = ob(app, r.obra);
    r.eq.forEach((pid) => { const pe = pessoa(app, pid); if (pe && !app.db.lista('diarias').some((x) => x.pessoa === pid && x.data === r.data)) app.db.salvar('diarias', { obra: o.id, data: r.data, pessoa: pid, valor: pe.diaria, pago: false }); });
    if (r.eq.length) r.equipe = Math.max(Number(r.equipe) || 0, r.eq.length);
    app.db.salvar('diario', { obra: o.id, data: r.data, texto: r.texto, equipe: Number(r.equipe), clima: r.clima, etapa: o.etapas.find((e) => e.status === 'andamento')?.nome || '' }); avisar('Dia registrado. Agora adicione as fotos.'); app.render(); app.abrir('obra', o.id, 'diario');
  },
  novoGasto: async (d = {}) => {
    if (!obs(app).length) { avisar('Cadastre uma obra primeiro', { tipo: 'erro' }); return; }
    const r = await modal({ titulo: 'Lançar gasto', largura: 520, corpo: `<form class="form-grade">${escolherObra(d.id)}<label class="campo largo">Descrição<input name="descricao" required placeholder="Ex.: Porcelanato 60x60 (12 m²)"></label><label class="campo">Categoria<select name="categoria">${CATS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label><label class="campo">Valor<input type="number" name="valor" min="0" step="0.01" required></label><label class="campo">Data<input type="date" name="data" value="${hoje()}"></label><label class="campo flex" style="flex-direction:row;gap:8px;align-items:center;font-weight:400;color:var(--tx)"><input type="checkbox" name="cliente_paga"> O cliente pagou</label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Lançar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return fm.reportValidity() ? { ...Object.fromEntries(new FormData(fm)), cliente_paga: fm.cliente_paga.checked } : false; } }] });
    if (!r) return; app.db.salvar('gastos', { ...r, valor: Number(r.valor) }); avisar(`Gasto de ${moeda(Number(r.valor))} lançado`); reab();
  },
  tirarGasto: (d) => { app.db.apagar('gastos', d.id); reab(); },
  imprimirTermo: (d) => imprimir(docTermo(app, ob(app, d.id))),
  pagarEquipe: async (d) => {
    const p = pessoa(app, d.id), ab = abertas(app, d.id), vl = valesAbertos(app, d.id), tot = soma(ab, (x) => x.valor), tv = soma(vl, (x) => x.valor), saldo = tot - tv;
    if (!(await confirmar(`Pagar ${p.nome}: ${moeda(tot)} em diárias${tv ? ` − ${moeda(tv)} em vales` : ''} = ${moeda(saldo)}. As diárias entram nos gastos de cada obra.`, { rotulo: 'Paguei', titulo: 'Pagar a equipe' }))) return;
    Object.entries(agrupar(ab.filter((x) => x.valor), (x) => x.obra)).forEach(([oid, l]) => app.db.salvar('gastos', { obra: oid, data: hoje(), categoria: 'mao', descricao: `Diárias · ${p.nome} (${contaDias(l)})`, valor: soma(l, (x) => x.valor), cliente_paga: false }));
    const texto = textoFechamento(app, p, ab, vl), doc = docComprovanteEquipe(app, p, ab, vl, true);
    ab.forEach((x) => app.db.salvar('diarias', { id: x.id, pago: true, pago_em: hoje() }));
    vl.forEach((x) => app.db.salvar('vales', { id: x.id, descontado: true, descontado_em: hoje() }));
    avisar(`${moeda(saldo)} pagos a ${p.nome}`); app.render();
    const r = await modal({ titulo: 'Recibo pronto', largura: 440, corpo: `<p class="mute-2">Mande o fechamento para ${esc(p.nome.split(' ')[0])} ou imprima o recibo para assinar.</p>`, botoes: [{ rotulo: 'Imprimir recibo', classe: 'fant', valor: 'imprimir' }, ...(p.telefone ? [{ rotulo: 'Mandar no WhatsApp', classe: 'pri', valor: 'zap' }] : [])] });
    if (r === 'imprimir') imprimir(doc);
    if (r === 'zap') window.open(`${telLink(p.telefone)}?text=${encodeURIComponent(`${texto}\n\nPago em ${dataBR(hoje())}. Valeu pelo trabalho!`)}`, '_blank', 'noopener');
  },
  novoVale: async (d) => { const p = pessoa(app, d.id); if (await editar(app, 'vales', null, { pessoa: p.id })) { avisar(`Vale lançado para ${p.nome}: sai do próximo pagamento`); app.render(); } },
  comprovanteEquipe: async (d) => {
    const p = pessoa(app, d.id), ab = abertas(app, d.id), vl = valesAbertos(app, d.id);
    const r = await modal({ titulo: `Fechamento · ${esc(p.nome)}`, largura: 480, corpo: `<pre style="white-space:pre-wrap;font:13px/1.5 var(--mono);background:var(--painel-2);border:1px solid var(--borda);border-radius:8px;padding:12px;margin:0">${esc(textoFechamento(app, p, ab, vl).replace(/\*/g, ''))}</pre>`, botoes: [{ rotulo: 'Imprimir (PDF)', classe: 'fant', valor: 'imprimir' }, ...(p.telefone ? [{ rotulo: 'Mandar no WhatsApp', classe: 'pri', valor: 'zap' }] : [])] });
    if (r === 'imprimir') imprimir(docComprovanteEquipe(app, p, ab, vl));
    if (r === 'zap') window.open(`${telLink(p.telefone)}?text=${encodeURIComponent(textoFechamento(app, p, ab, vl))}`, '_blank', 'noopener');
  },
  marcarPresenca: async () => {
    const eq = app.db.lista('equipe').sort((x, y) => x.nome.localeCompare(y.nome)); if (!eq.length) return avisar('Cadastre a equipe primeiro', { tipo: 'erro' });
    const r = await modal({ titulo: 'Marcar presença', largura: 560, corpo: `<form class="form-grade">${escolherObra()}<label class="campo">Data<input type="date" name="data" value="${hoje()}"></label>
      <div class="campo largo"><span style="margin-bottom:6px">Quem veio</span><div style="display:grid;gap:6px">${eq.map((p) => `<div class="entre" style="gap:8px"><span>${esc(p.nome)} <span class="mute">${esc(p.funcao || '')} · ${moeda(p.diaria)}</span></span><select name="p_${p.id}" style="width:auto;height:30px"><option value="">Não estava</option><option value="inteira">Diária inteira</option><option value="meia">Meia diária</option><option value="falta">Falta</option></select></div>`).join('')}</div></div></form>`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Salvar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
    if (!r) return; let n = 0;
    eq.forEach((p) => { const tipo = r[`p_${p.id}`]; if (!tipo) return; const ja = app.db.lista('diarias').find((x) => x.pessoa === p.id && x.data === r.data);
      const reg = { obra: r.obra, data: r.data, pessoa: p.id, tipo, valor: tipo === 'inteira' ? p.diaria : tipo === 'meia' ? p.diaria / 2 : 0, pago: false };
      if (ja && ja.pago) return; app.db.salvar('diarias', ja ? { ...reg, id: ja.id } : reg); n++; });
    avisar(`Presença de ${n} ${n === 1 ? 'pessoa' : 'pessoas'} marcada`); app.render();
  },
  novaCompra: async (d) => {
    const r = await modal({ titulo: 'Item para comprar', largura: 460, corpo: '<form class="form-grade"><label class="campo largo">Item<input name="item" required placeholder="Ex.: Argamassa AC-III"></label><label class="campo">Quantidade<input name="quantidade" placeholder="Ex.: 8 sacos"></label><label class="campo">Valor estimado<input type="number" name="estimado" min="0" step="0.01"></label><label class="campo largo">Quem compra<select name="quem"><option value="eu">Eu (entra nos meus gastos)</option><option value="cliente">O cliente</option></select></label></form>', botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Adicionar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return fm.reportValidity() ? Object.fromEntries(new FormData(fm)) : false; } }] });
    if (!r) return; app.db.salvar('compras', { ...r, obra: d.id, estimado: Number(r.estimado) || 0, status: 'comprar', criado: hoje() }); reab();
  },
  comprei: async (d) => {
    const x = app.db.obter('compras', d.id);
    const r = await modal({ titulo: `Comprado: ${esc(x.item)}`, largura: 420, corpo: `<form class="form-grade"><label class="campo">Valor pago<input type="number" name="valor" min="0" step="0.01" value="${x.estimado || ''}" required></label><label class="campo">Data<input type="date" name="data" value="${hoje()}"></label></form><p class="mute" style="font-size:12.5px;margin-top:8px">O valor entra nos gastos da obra${x.quem === 'cliente' ? ' como pago pelo cliente' : ''}.</p>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Confirmar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return fm.reportValidity() ? Object.fromEntries(new FormData(fm)) : false; } }] });
    if (!r) return; app.db.salvar('compras', { id: x.id, status: 'comprado', comprado_em: r.data });
    if (Number(r.valor) > 0) app.db.salvar('gastos', { obra: x.obra, data: r.data, categoria: 'material', descricao: `${x.item}${x.quantidade ? ` (${x.quantidade})` : ''}`, valor: Number(r.valor), cliente_paga: x.quem === 'cliente' });
    avisar('Item comprado e gasto lançado'); reab();
  },
  tirarCompra: (d) => { app.db.apagar('compras', d.id); reab(); },
  listaCliente: (d) => { const o = ob(app, d.id), c = cli(app, o.cliente), l = cpDe(app, d.id).filter((x) => x.status === 'comprar' && x.quem === 'cliente'); window.open(`${telLink(c?.telefone)}?text=${encodeURIComponent(`Olá, ${c?.nome.split(' ')[0]}! Para a ${o.titulo.toLowerCase()} seguir no prazo, precisamos destes materiais:\n\n${l.map((x) => `• ${x.item}${x.quantidade ? ` (${x.quantidade})` : ''}`).join('\n')}\n\nQualquer dúvida sobre modelo ou medida, me chame.`)}`, '_blank', 'noopener'); },
  novoExtra: async (d) => {
    const r = await modal({ titulo: 'Serviço extra', largura: 500, corpo: '<form class="form-grade"><label class="campo largo">Serviço<input name="descricao" required placeholder="Ex.: Troca da tubulação de gás"></label><label class="campo largo">Por que é necessário<textarea name="motivo" placeholder="Explique para o cliente em poucas palavras"></textarea></label><label class="campo">Valor<input type="number" name="valor" min="0" step="10" required></label><label class="campo">Dias a mais no prazo<input type="number" name="prazo_dias" min="0" value="0"></label></form>', botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Salvar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return fm.reportValidity() ? Object.fromEntries(new FormData(fm)) : false; } }] });
    if (!r) return; const x = app.db.salvar('aditivos', { ...r, obra: d.id, valor: Number(r.valor), prazo_dias: Number(r.prazo_dias) || 0, status: 'pendente', data: hoje() });
    app.db.registrar(`obras:${d.id}`, `Serviço extra proposto: ${r.descricao} (${moeda(Number(r.valor))})`, { icone: 'plus', tom: 'acc' }); reab();
    if (x && (await confirmar('O cliente recebe o link da obra pelo WhatsApp e aprova ou recusa por lá.', { rotulo: 'Mandar', titulo: 'Pedir aprovação agora?' }))) app.acoes.pedirAprovacao({ id: x.id });
  },
  pedirAprovacao: (d) => { const x = app.db.obter('aditivos', d.id), o = ob(app, x.obra), c = cli(app, o.cliente); app.portal.compartilhar('obra', o.id, { titulo: `Aprovar · ${x.descricao}`, telefone: c?.telefone, texto: `Olá, ${c?.nome.split(' ')[0]}! Na ${o.titulo.toLowerCase()} apareceu um serviço extra: "${x.descricao}" (${moeda(x.valor)}). Veja o motivo e aprove ou recuse por aqui:` }); },
  aprovarExtra: (d) => { decidirExtra(app, app.db.obter('aditivos', d.id), true, 'manualmente'); avisar('Serviço extra virou etapa da obra'); reab(); },
  recusarExtra: (d) => { decidirExtra(app, app.db.obter('aditivos', d.id), false, 'manualmente'); reab(); },
  linkObra: (d) => { const o = ob(app, d.id), c = cli(app, o.cliente); app.portal.compartilhar('obra', d.id, { titulo: `Página do cliente · ${o.titulo}`, telefone: c?.telefone, texto: `Olá, ${c?.nome.split(' ')[0]}! Acompanhe a sua obra por aqui: etapas, fotos do dia a dia e pagamentos.` }); },
  imprimirObra: (d) => imprimir(docOrcamento(app, ob(app, d.id))),
  excluirObra: (d) => excluir(app, 'obras', d.id),
  // orçamento por itens
  novoItem: async (d) => {
    const o = ob(app, d.id);
    const r = await modal({ titulo: 'Item do orçamento', largura: 480, corpo: `<form class="form-grade"><label class="campo largo">Descrição<input name="desc" required placeholder="Ex.: Porcelanato 60x60"></label><label class="campo">Tipo<select name="tipo"><option value="material">Material</option><option value="mao">Mão de obra</option></select></label><label class="campo">Unidade<select name="unidade">${UNIDADES.map((u) => `<option>${u}</option>`).join('')}</select></label><label class="campo">Quantidade<input type="number" name="qtd" min="0" step="0.01" value="1" required></label><label class="campo">Valor unitário (custo)<input type="number" name="unit" min="0" step="0.01" required></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Adicionar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return fm.reportValidity() ? Object.fromEntries(new FormData(fm)) : false; } }] });
    if (!r) return; const itens = [...(o.itens || []), { ...r, qtd: Number(r.qtd), unit: Number(r.unit) }];
    app.db.salvar('obras', { id: o.id, itens, margem: o.margem ?? 15, validade: o.validade || diaMais(10), valor: totalOrc({ ...o, itens, margem: o.margem ?? 15 }) }); reab();
  },
  tirarItem: (d) => { const o = ob(app, d.id), itens = (o.itens || []).filter((_, k) => k !== Number(d.k)); app.db.salvar('obras', { id: o.id, itens, valor: totalOrc({ ...o, itens }) }); reab(); },
  margemOrc: async (d) => {
    const o = ob(app, d.id);
    const r = await modal({ titulo: 'Margem e validade', largura: 420, corpo: `<form class="form-grade"><label class="campo">Margem (lucro e impostos)<input type="number" name="margem" min="0" max="200" step="0.5" value="${Number(o.margem) || 15}"><span class="ajuda">Somada ao custo de todos os itens</span></label><label class="campo">Proposta válida até<input type="date" name="validade" value="${o.validade || diaMais(10)}"></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Salvar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
    if (!r) return; const margem = Number(r.margem) || 0; app.db.salvar('obras', { id: o.id, margem, validade: r.validade, valor: totalOrc({ ...o, margem }) }); reab();
  },
  enviarOrc: async (d) => { const o = ob(app, d.id), c = cli(app, o.cliente); app.db.salvar('obras', { id: o.id, enviado_em: hoje() }); app.portal.compartilhar('obra', o.id, { titulo: `Orçamento · ${o.titulo}`, telefone: c?.telefone, texto: `Olá, ${c?.nome.split(' ')[0]}! Segue o orçamento da ${o.titulo.toLowerCase()}: ${moeda(o.valor)}, com todos os itens. Você aprova por aqui mesmo:` }); },
  aprovarOrc: (d) => { aprovarOrcamento(app, ob(app, d.id), 'manualmente'); avisar('Orçamento aprovado: a obra está em andamento'); reab(); },
  // cronograma e qualidade
  datasEtapa: async (d) => {
    const o = ob(app, d.id), k = Number(d.k), e = planoEtapas(o)[k];
    const r = await modal({ titulo: `Datas · ${esc(e.nome)}`, largura: 400, corpo: `<form class="form-grade"><label class="campo">Início<input type="date" name="ini" value="${e.ini}" required></label><label class="campo">Fim<input type="date" name="fim" value="${e.fim}" required></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Salvar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); if (!fm.reportValidity()) return false; const v = Object.fromEntries(new FormData(fm)); if (v.fim < v.ini) { avisar('O fim precisa ser depois do início', { tipo: 'erro' }); return false; } return v; } }] });
    if (!r) return; salvarEtapas(o, o.etapas.map((x, j) => (j === k ? { ...x, ini: r.ini, fim: r.fim } : x)));
  },
  quali: (d, el) => { const o = ob(app, d.id), k = Number(d.k), t = qualiDe(o, k)[Number(d.j)].t; app.db.salvar('obras', { id: o.id, etapas: o.etapas.map((x, j) => (j === k ? { ...x, quali: { ...(x.quali || {}), [t]: el.checked } } : x)) }); setTimeout(reab, 0); },
  // terceirizados
  medir: async (d) => {
    const t = app.db.obter('terceiros', d.id), feito = medidoTerc(t), falta = t.valor - feito;
    const r = await modal({ titulo: `Medição · ${esc(t.servico)}`, largura: 440, corpo: `<p class="mute-2" style="margin-bottom:10px">Contratado ${moeda(t.valor)} · já medido ${moeda(feito)}. Informe quanto do serviço ficou pronto nesta medição.</p><form class="form-grade"><label class="campo">Porcentagem desta medição<input type="number" name="pct" min="1" max="${Math.max(1, Math.round((falta / (t.valor || 1)) * 100))}" value="${Math.min(50, Math.round((falta / (t.valor || 1)) * 100))}" required></label><label class="campo">Data<input type="date" name="data" value="${hoje()}"></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Registrar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return fm.reportValidity() ? Object.fromEntries(new FormData(fm)) : false; } }] });
    if (!r) return; const valor = Math.min(falta, Math.round((t.valor * Number(r.pct)) / 100));
    app.db.salvar('terceiros', { id: t.id, medicoes: [...(t.medicoes || []), { data: r.data, pct: Number(r.pct), valor, pago: false }] }); avisar(`Medição de ${moeda(valor)} registrada`); app.render();
  },
  pagarTerc: async (d) => {
    const t = app.db.obter('terceiros', d.id), devo = medidoTerc(t) - pagoTerc(t);
    if (!(await confirmar(`Pagar ${moeda(devo)} a ${t.nome}? O valor entra nos gastos da obra.`, { rotulo: 'Paguei', titulo: 'Pagar terceirizado' }))) return;
    app.db.salvar('terceiros', { id: t.id, medicoes: (t.medicoes || []).map((m) => (m.pago ? m : { ...m, pago: true, pago_em: hoje() })) });
    app.db.salvar('gastos', { obra: t.obra, data: hoje(), categoria: 'mao', descricao: `${t.servico} · ${t.nome}`, valor: devo, cliente_paga: false }); avisar(`${moeda(devo)} pagos a ${t.nome}`); app.render();
  },
  // ferramentas
  levarFerr: async (d) => {
    const f = app.db.obter('ferramentas', d.id), eq = app.db.lista('equipe');
    const r = await modal({ titulo: `Levar · ${esc(f.nome)}`, largura: 460, corpo: `<form class="form-grade">${escolherObra()}<label class="campo largo">Com quem fica<select name="pessoa"><option value="">Ninguém em especial</option>${eq.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Levar', classe: 'pri', acao: (fm) => Object.fromEntries(new FormData(fm.querySelector('form'))) }] });
    if (!r) return; app.db.salvar('ferramentas', { id: f.id, local: 'obra', obra: r.obra, pessoa: r.pessoa || null, desde: hoje() }); avisar(`${f.nome} foi para ${ob(app, r.obra)?.titulo}`); app.render();
  },
  devolverFerr: (d) => { const f = app.db.obter('ferramentas', d.id); app.db.salvar('ferramentas', { id: f.id, local: 'deposito', obra: null, pessoa: null, desde: null }); avisar(`${f.nome} voltou para o depósito`); app.render(); },
  // depósito de sobras
  usarDeposito: async (d) => {
    const x = app.db.obter('deposito', d.id);
    const r = await modal({ titulo: `Usar · ${esc(x.item)}`, largura: 440, corpo: `<form class="form-grade">${escolherObra()}<label class="campo">Quantidade<input type="number" name="qtd" min="0.01" max="${x.qtd}" step="0.01" value="${x.qtd}" required><span class="ajuda">Disponível: ${num(x.qtd)} ${esc(x.unidade || '')}</span></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Usar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return fm.reportValidity() ? Object.fromEntries(new FormData(fm)) : false; } }] });
    if (!r) return; const q = Math.min(Number(r.qtd), Number(x.qtd));
    app.db.salvar('deposito', { id: x.id, qtd: Math.round((x.qtd - q) * 100) / 100 });
    app.db.salvar('compras', { obra: r.obra, item: `${x.item} (do depósito)`, quantidade: `${num(q)} ${x.unidade || ''}`.trim(), estimado: 0, quem: 'eu', status: 'comprado', comprado_em: hoje(), criado: hoje() });
    app.db.registrar(`obras:${r.obra}`, `Material do depósito: ${x.item} (${num(q)} ${x.unidade || ''})${x.unit ? `, economia de ${moeda(q * x.unit)}` : ''}`, { icone: 'warehouse', tom: 'ok' });
    avisar(x.unit ? `Economia de ${moeda(q * x.unit)}: o material saiu do depósito` : 'Material saiu do depósito'); app.render();
  },
  // garantia pós-obra
  novoChamado: async () => {
    const lo = obs(app).filter((o) => o.status === 'concluida'); if (!lo.length) return avisar('Nenhuma obra entregue ainda', { tipo: 'erro' });
    const r = await modal({ titulo: 'Chamado de garantia', largura: 480, corpo: `<form class="form-grade"><label class="campo largo">Obra<select name="obra">${lo.map((o) => `<option value="${o.id}">${esc(o.titulo)} · ${esc(cli(app, o.cliente)?.nome || '')}</option>`).join('')}</select></label><label class="campo largo">O que aconteceu<textarea name="descricao" required></textarea></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Abrir', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return fm.reportValidity() ? Object.fromEntries(new FormData(fm)) : false; } }] });
    if (!r) return; app.db.salvar('chamados', { ...r, data: hoje(), status: 'aberto' }); app.render();
  },
  agendarChamado: async (d) => {
    const x = app.db.obter('chamados', d.id), o = ob(app, x.obra), c = cli(app, o?.cliente);
    const r = await modal({ titulo: 'Marcar visita', largura: 380, corpo: `<form class="form-grade"><label class="campo largo">Dia da visita<input type="date" name="dia" value="${diaMais(2)}" required></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Marcar e avisar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
    if (!r) return; app.db.salvar('chamados', { id: x.id, status: 'agendado', agendado: r.dia }); app.render();
    if (c?.telefone) window.open(`${telLink(c.telefone)}?text=${encodeURIComponent(`Olá, ${c.nome.split(' ')[0]}! Recebemos o seu chamado ("${x.descricao}") e vamos passar aí no dia ${dataBR(r.dia)} para resolver.`)}`, '_blank', 'noopener');
  },
  resolverChamado: (d) => { app.db.salvar('chamados', { id: d.id, status: 'resolvido', resolvido_em: hoje() }); avisar('Chamado resolvido'); app.render(); },
  // painéis laterais
  avisarAtraso: (d) => { const o = ob(app, d.id), c = cli(app, o.cliente), e = planoEtapas(o).find(atrasoEtapa) || o.etapas.find((x) => x.status !== 'feita');
    const url = msgZap(c?.telefone, `Olá, ${c?.nome.split(' ')[0]}! Passando para dar uma posição da ${o.titulo.toLowerCase()}: ${e ? `a etapa "${e.nome}" atrasou um pouco` : 'tivemos um atraso'} e já estamos ajustando o cronograma. Qualquer dúvida, me chame. Você acompanha tudo pelo link da obra.`);
    if (url) window.open(url, '_blank', 'noopener'); else avisar('O cliente não tem WhatsApp cadastrado', { tipo: 'erro' }); },
  pedirIndicacao: (d) => { const o = ob(app, d.id), c = cli(app, o.cliente);
    const url = msgZap(c?.telefone, `Olá, ${c?.nome.split(' ')[0]}! Obrigado por confiar a ${o.titulo.toLowerCase()} à ${app.empresa}. Se gostou do serviço, poderia deixar uma avaliação e indicar a gente para algum conhecido? Isso ajuda muito o nosso trabalho. Lembrando: a mão de obra tem garantia de 90 dias.`);
    if (url) window.open(url, '_blank', 'noopener'); else avisar('O cliente não tem WhatsApp cadastrado', { tipo: 'erro' }); },
  chamarDeVolta: (d) => { const c = cli(app, d.id);
    const url = msgZap(c?.telefone, `Olá, ${c?.nome.split(' ')[0]}! Aqui é da ${app.empresa}. Como está a obra que fizemos aí? Se estiver pensando em outra reforma ou precisar de algum reparo, é só me chamar que eu passo para fazer o orçamento.`);
    if (url) window.open(url, '_blank', 'noopener'); else avisar('O cliente não tem WhatsApp cadastrado', { tipo: 'erro' }); },
  exportarCSV: (d) => {
    const csv = (cab, linhas) => '\ufeff' + [cab, ...linhas].map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const ym = hoje().slice(0, 7), dinheiro = (v) => String(Math.round(Number(v || 0) * 100) / 100).replace('.', ',');
    let nome, conteudo;
    if (d.t === 'obras') { nome = 'obras.csv'; conteudo = csv(['Obra', 'Cliente', 'Situação', 'Valor', 'Recebido', 'A receber', 'Gastos', 'Início', 'Entrega'], obs(app).map((o) => [o.titulo, cli(app, o.cliente)?.nome, stt(o.status)[1], dinheiro(o.valor), dinheiro(recebido(o)), dinheiro(aReceber(o)), dinheiro(meus(app, o.id)), dataBR(o.inicio), dataBR(o.previsao)])); }
    else if (d.t === 'clientes') { nome = 'clientes.csv'; conteudo = csv(['Cliente', 'WhatsApp', 'Endereço', 'Obras'], app.db.lista('clientes').map((c) => [c.nome, c.telefone, c.endereco, obs(app).filter((o) => o.cliente === c.id).length])); }
    else { const todos = d.t === 'gastos-todos'; nome = todos ? 'gastos.csv' : `gastos-${ym}.csv`; conteudo = csv(['Data', 'Gasto', 'Categoria', 'Obra', 'Quem pagou', 'Valor'], app.db.lista('gastos').filter((g) => todos || g.data.startsWith(ym)).sort((x, y) => x.data.localeCompare(y.data)).map((g) => [dataBR(g.data), g.descricao, nomeCat(g.categoria), ob(app, g.obra)?.titulo, g.cliente_paga ? 'Cliente' : 'Empresa', dinheiro(g.valor)])); }
    const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' })); el.download = nome; document.body.appendChild(el); el.click(); setTimeout(() => { URL.revokeObjectURL(el.href); el.remove(); }, 500);
    avisar(`${nome} baixado: abre no Excel`); },
  imprimirMes: () => {
    const ym = hoje().slice(0, 7), cfg = app.db.cfg;
    const receb = obs(app).flatMap((o) => o.etapas.filter((e) => e.pago && e.pago_em?.startsWith(ym)).map((e) => ({ o, e })));
    const gastos = app.db.lista('gastos').filter((g) => g.data.startsWith(ym) && !g.cliente_paga).sort((x, y) => x.data.localeCompare(y.data));
    const tr = soma(receb, ({ e }) => e.valor), tg = soma(gastos, (g) => g.valor);
    imprimir(`<div class="doc"><div class="entre" style="align-items:flex-start"><div><h1>${esc(app.empresa)}</h1><div style="color:#555">${esc(cfg.endereco || '')}</div></div><div style="text-align:right"><b style="font-size:16px">Resumo de ${nomeMes(ym, true)}</b><div style="color:#555">emitido em ${dataBR(hoje())}</div></div></div>
      <h2>Resultado</h2><table><tbody><tr><td>Recebido dos clientes</td><td class="n">${moeda(tr)}</td></tr><tr><td>Gastos da empresa</td><td class="n">${moeda(tg)}</td></tr><tr><td><b>Sobrou no mês</b></td><td class="n"><b>${moeda(tr - tg)}</b></td></tr></tbody></table>
      <h2>Recebimentos</h2><table><thead><tr><th>Data</th><th>Obra</th><th>Etapa</th><th class="n">Valor</th></tr></thead><tbody>${receb.map(({ o, e }) => `<tr><td>${dataBR(e.pago_em)}</td><td>${esc(o.titulo)}</td><td>${esc(e.nome)}</td><td class="n">${moeda(e.valor)}</td></tr>`).join('') || '<tr><td colspan="4">Nenhum recebimento no mês</td></tr>'}</tbody></table>
      <h2>Gastos</h2><table><thead><tr><th>Data</th><th>Gasto</th><th>Obra</th><th class="n">Valor</th></tr></thead><tbody>${gastos.map((g) => `<tr><td>${dataBR(g.data)}</td><td>${esc(g.descricao)} <span style="color:#777">(${esc(nomeCat(g.categoria))})</span></td><td>${esc(ob(app, g.obra)?.titulo || '')}</td><td class="n">${moeda(g.valor)}</td></tr>`).join('') || '<tr><td colspan="4">Nenhum gasto no mês</td></tr>'}</tbody></table></div>`); },
  novoCad: async (d) => { if (await editar(app, d.c)) app.render(); },
  editarCad: async (d) => { if (await editar(app, d.c, app.db.obter(d.c, d.id))) reab(); },
});

// as calculadoras das abas também funcionam nos itens do menu
registrarCalcs(CALCS);
