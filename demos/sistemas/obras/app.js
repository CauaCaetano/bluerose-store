// Canteiro · reformas e obras: etapas com pagamento, diário com fotos, equipe e diárias, compras, serviços extras e a página do dono da obra
import {
  criarApp, esc, moeda, moedaC, num, pct, hoje, diaMais, mesMais, nomeMes, dataCurta, dataBR, relativo, diasAte, diasEntre,
  sorteio, soma, agrupar, av, ic, et, prog, kpis, barras, barrasH, kanban, telLink,
  modal, confirmar, avisar, editar, excluir, ficha, props, linhaDoTempo, vazio, imprimir,
} from '../base/nexo.js';

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
  return { equipe, diarias, vales, _cfg: { empresa: 'Reforma Certa · Davi Nunes', telefone: '(31) 98877-4410', endereco: 'Belo Horizonte/MG', cnpj: '' }, clientes, obras, diario, gastos, compras, aditivos };
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
  a.kanbans.obras = (id, s) => { a.db.salvar('obras', { id, status: s }); a.db.registrar(`obras:${id}`, stt(s)[1], { icone: 'arrow-right', tom: 'acc' }); avisar(`${ob(a, id).titulo} → ${stt(s)[1]}`); };
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

// ---------------------------------------------------------------- documentos
function docOrcamento(a, o) {
  const c = cli(a, o.cliente), cfg = a.db.cfg;
  return `<div class="doc"><div class="entre" style="align-items:flex-start"><div><h1>${esc(a.empresa)}</h1><div style="color:#555">${esc(cfg.endereco || '')} · ${esc(cfg.telefone || '')}</div></div><div style="text-align:right"><b style="font-size:16px">${o.status === 'orcamento' ? 'Orçamento' : 'Contrato de obra'}</b><div style="color:#555">${dataBR(hoje())}</div></div></div>
    <h2>Cliente e obra</h2><table><tr><td>${esc(c?.nome || '')}</td><td>${esc(c?.telefone || '')}</td></tr><tr><td colspan="2"><b>${esc(o.titulo)}</b> · ${esc(o.endereco || '')}</td></tr><tr><td>Início: ${dataBR(o.inicio)}</td><td>Previsão de entrega: ${dataBR(o.previsao)}</td></tr></table>
    <h2>Etapas e pagamento</h2><table><thead><tr><th>Etapa</th><th class="n">Valor</th></tr></thead><tbody>${o.etapas.map((e) => `<tr><td>${esc(e.nome)}</td><td class="n">${moeda(e.valor)}</td></tr>`).join('')}<tr><td><b>Total</b></td><td class="n"><b>${moeda(o.valor)}</b></td></tr></tbody></table>
    <div style="margin-top:10px;color:#444;font-size:11px">Cada etapa é paga quando concluída, pelo PIX enviado no link de acompanhamento da obra. Material comprado pelo cliente não está incluso no valor. Garantia de 90 dias para a mão de obra.</div><div class="ass"><div>${esc(a.empresa)}</div><div>${esc(c?.nome || 'Cliente')}</div></div></div>`;
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
    if (aba === 'dados') corpo = `<div class="gav-sec">${props([['user', 'Cliente', c ? `${esc(c.nome)} · <a href="${telLink(c.telefone)}" target="_blank" rel="noopener">WhatsApp</a>` : null], ['map-pin', 'Endereço', esc(o.endereco || '')], ['calendar-blank', 'Início e entrega', `${dataCurta(o.inicio)} → <span class="${atrasada(o) ? 'er-tx' : ''}">${dataCurta(o.previsao)}</span>`], ['currency-circle-dollar', 'Valor fechado', moeda(o.valor)], ['eye', 'Gastos na página do cliente', o.mostrar_gastos ? 'aparecem' : 'escondidos']])}</div>
      <div class="gav-sec"><h4>Histórico</h4>${linhaDoTempo(a.db.historico(`obras:${id}`).map((h) => ({ quando: h.quando, icone: h.icone, tom: h.tom, html: esc(h.texto) })))}</div>`;
    return { html: ficha({ tipo: 'Obra', icone: 'house-line', titulo: esc(o.titulo), avatar: av(c?.nome || '?', 'g'), sub: `<span>${esc(c?.nome || '')}</span><b class="num" style="color:var(--tx)">· ${moeda(o.valor)}</b>${atrasada(o) ? et('Prazo vencido', 'al') : ''}`,
      extra: `<div class="etapas" style="margin-top:12px">${STATUS.map(([s, n], j) => `<button type="button" class="${j < i ? 'feita' : j === i ? 'atual' : ''}" data-acao="statusObra" data-id="${id}" data-s="${s}">${n}</button>`).join('')}</div>
        <div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn pri" data-acao="linkObra" data-id="${id}">${ic('link')}Página do cliente</button><button type="button" class="btn" data-acao="novoDiario" data-id="${id}">${ic('camera')}Registrar o dia</button><button type="button" class="btn" data-acao="imprimirObra" data-id="${id}">${ic('printer')}${o.status === 'orcamento' ? 'Orçamento' : 'Contrato'}</button>${o.status === 'concluida' || (o.etapas.length && o.etapas.every((e) => e.status === 'feita')) ? `<button type="button" class="btn" data-acao="imprimirTermo" data-id="${id}">${ic('seal-check')}Termo de entrega</button>` : ''}</div>`,
      aba, abas: [['etapas', 'Etapas e pagamento', o.etapas.length], ['diario', 'Diário', di.length], ['gastos', 'Gastos', ga.length], ['compras', 'Compras', cpDe(a, id).filter((x) => x.status === 'comprar').length || ''], ['extras', 'Extras', adDe(a, id).filter((x) => x.status === 'pendente').length || ''], ['dados', 'Dados']], corpo,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="obras" data-id="${id}">${ic('pencil-simple')}Editar</button><button type="button" class="btn fant peq ic-so" data-acao="excluirObra" data-id="${id}" aria-label="Excluir">${ic('trash')}</button>` }), montar: (g) => (g.dataset.aba = aba) };
  },
};

// ---------------------------------------------------------------- aplicativo
const app = criarApp({
  id: 'obras', nome: 'Canteiro', sub: 'Reformas e obras', marcaSub: 'Reformas e obras', logo: new URL('logo.svg', import.meta.url).href, produto: { mensal: 79 }, cor: '#c84a0c', icone: 'house-line', empresa: 'Reforma Certa · Davi Nunes', conta: 'Reformas residenciais · Belo Horizonte',
  semente, colecoes, fichas, buscaDica: 'obras e clientes',
  portal: {
    obra: {
      explica: 'O dono da obra acompanha as etapas, vê o diário com fotos e paga cada etapa concluída pelo PIX. Os gastos aparecem só se você ligar essa opção na obra.',
      montar: async (a, id, { fotos }) => {
        const o = ob(a, id); if (!o) return null;
        const dia = await Promise.all(diaDe(a, id).slice(0, 12).map(async (x) => ({ data: x.data, etapa: x.etapa, texto: x.texto, clima: x.clima, fotos: await fotos(x, 6) })));
        return { titulo: o.titulo, endereco: o.endereco, inicio: o.inicio, previsao: o.previsao, valor: o.valor, status: o.status, progresso: Math.round(progresso(o)),
          etapas: o.etapas.map((e, k) => ({ k, nome: e.nome, valor: e.valor, status: e.status, pago: !!e.pago, avisou: !!e.avisou_pago, txid: `OB${id}E${k}`.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) })),
          aditivos: adDe(a, id).map((x) => ({ id: x.id, descricao: x.descricao, motivo: x.motivo, valor: x.valor, prazo_dias: x.prazo_dias, status: x.status })),
          compras: cpDe(a, id).filter((x) => x.status === 'comprar').map((x) => ({ item: x.item, quantidade: x.quantidade, estimado: x.quem === 'cliente' ? x.estimado : 0, quem: x.quem })),
          diario: dia, gastos: o.mostrar_gastos ? gasDe(a, id).slice(0, 40).map((g) => ({ data: g.data, descricao: g.descricao, categoria: nomeCat(g.categoria), valor: g.valor, cliente_paga: !!g.cliente_paga })) : null, pix: a.pixDados() };
      },
      responder: (a, r) => {
        const o = ob(a, r.ref); if (!o) return '';
        if (r.acao === 'aditivo') { const x = a.db.obter('aditivos', r.dados.id); if (!x || x.obra !== o.id || x.status !== 'pendente') return ''; decidirExtra(a, x, !!r.dados.aprovado, 'pelo cliente'); return `${o.titulo}: o cliente ${r.dados.aprovado ? 'aprovou' : 'recusou'} o serviço extra "${x.descricao}" (${moeda(x.valor)})`; }
        if (r.acao !== 'paguei') return '';
        const k = Number(r.dados.k), e = o.etapas[k]; if (!e || e.pago) return '';
        a.db.salvar('obras', { id: o.id, etapas: o.etapas.map((x, j) => (j === k ? { ...x, avisou_pago: true } : x)) });
        a.db.registrar(`obras:${o.id}`, `Cliente avisou que pagou: ${e.nome} (${moeda(e.valor)})`, { icone: 'currency-circle-dollar', tom: 'ok' });
        return `${o.titulo}: o cliente avisou que pagou "${e.nome}". Confira e marque como recebido.`;
      },
    },
  },
  passos: (a) => [{ id: 'obra', rot: 'Cadastre a primeira obra', feito: obs(a).length > 0, acao: 'novaObra' }, { id: 'pix', rot: 'Cadastre a sua chave PIX', feito: a.temPix(), href: '#/config' }, { id: 'diario', rot: 'Registre o dia com fotos', feito: a.db.lista('diario').length > 0, acao: 'novoDiario' }],
  equipe: [['Davi Nunes', 'Dono'], ['Robson Silva', 'Pedreiro'], ['Elias Prado', 'Ajudante']],
  busca: [{ colecao: 'obras', grupo: 'Obras', icone: 'house-line', ficha: 'obra', rot: (o) => o.titulo, sub: (o, a) => cli(a, o.cliente)?.nome || '' }],
  comandos: [{ rot: 'Nova obra', icone: 'plus', acao: (a) => a.acoes.novaObra() }, { rot: 'Registrar o dia', icone: 'camera', acao: (a) => a.acoes.novoDiario({}) }, { rot: 'Lançar gasto', icone: 'receipt', acao: (a) => a.acoes.novoGasto({}) }],
  paginas: [
    { id: 'painel', rot: 'Painel', icone: 'house', titulo: 'Visão geral', render: painel, atalho: 'i' },
    { id: 'obras', rot: 'Obras', icone: 'kanban', titulo: 'Obras', render: obrasPag, cheio: true, atalho: 'o', novo: (a) => a.acoes.novaObra(), cont: (a) => obs(a).filter((o) => o.status === 'andamento').length },
    { id: 'diario', rot: 'Diário', titulo: 'Diário de obra', icone: 'camera', render: diarioPag, atalho: 'd' },
    { id: 'gastos', rot: 'Gastos', icone: 'receipt', render: gastosPag, atalho: 'g' },
    { id: 'equipe', rot: 'Equipe', icone: 'wrench', render: equipePag, cont: (a) => { const n = new Set(a.db.lista('diarias').filter((x) => !x.pago).map((x) => x.pessoa)).size; return n ? { n, tom: 'al' } : 0; } },
    { grupo: 'Gestão' },
    { id: 'clientes', rot: 'Clientes', icone: 'users', render: clientesPag },
    { id: 'relatorios', rot: 'Relatórios', icone: 'chart-bar', render: relatoriosPag },
  ],
});

const reab = () => { app.render(); app.reabrir(); };
const escolherObra = (atual) => `<label class="campo largo">Obra<select name="obra" required>${obs(app).filter((o) => o.status !== 'concluida' || o.id === atual).map((o) => `<option value="${o.id}" ${o.id === atual ? 'selected' : ''}>${esc(o.titulo)} · ${esc(cli(app, o.cliente)?.nome || '')}</option>`).join('')}</select></label>`;
const salvarEtapas = (o, etapas, msg) => { app.db.salvar('obras', { id: o.id, etapas }); if (msg) app.db.registrar(`obras:${o.id}`, msg, { icone: 'check', tom: 'ok' }); reab(); };
Object.assign(app.acoes, {
  novaObra: async () => { const o = await editar(app, 'obras'); if (o) { app.render(); app.abrir('obra', o.id); } },
  statusObra: (d) => { app.kanbans.obras ? app.kanbans.obras(d.id, d.s) : app.db.salvar('obras', { id: d.id, status: d.s }); reab(); },
  etapasModelo: (d) => { const o = ob(app, d.id), nomes = MODELOS_ETAPAS[d.m], cada = Math.round(o.valor / nomes.length / 10) * 10; salvarEtapas(o, nomes.map((nome, k) => ({ nome, valor: k === nomes.length - 1 ? o.valor - cada * (nomes.length - 1) : cada, status: 'pendente', pago: false })), `Etapas do modelo "${d.m}" criadas`); },
  novaEtapa: async (d) => { const o = ob(app, d.id); const r = await modal({ titulo: 'Nova etapa', largura: 420, corpo: '<form class="form-grade"><label class="campo largo">Etapa<input name="n" required placeholder="Ex.: Instalação elétrica"></label><label class="campo">Valor<input type="number" name="v" min="0" step="10" required></label></form>', botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Adicionar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return fm.reportValidity() ? Object.fromEntries(new FormData(fm)) : false; } }] }); if (!r) return; salvarEtapas(o, [...o.etapas, { nome: r.n, valor: Number(r.v), status: 'pendente', pago: false }]); },
  etapaFeita: (d) => { const o = ob(app, d.id), k = Number(d.k); const etapas = o.etapas.map((e, j) => (j === k ? { ...e, status: 'feita', feita_em: hoje() } : j === k + 1 && e.status === 'pendente' ? { ...e, status: 'andamento' } : e)); if (o.status === 'orcamento') app.db.salvar('obras', { id: o.id, status: 'andamento' }); salvarEtapas(o, etapas, `Etapa concluída: ${o.etapas[k].nome}`); if (etapas.every((e) => e.status === 'feita')) avisar('Todas as etapas concluídas. Marque a obra como concluída quando entregar.'); },
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
  novoCad: async (d) => { if (await editar(app, d.c)) app.render(); },
  editarCad: async (d) => { if (await editar(app, d.c, app.db.obter(d.c, d.id))) reab(); },
});
