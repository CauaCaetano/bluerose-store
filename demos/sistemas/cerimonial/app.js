// Blue Rose Eternize · assessoria de casamentos: eventos, checklist, orçamento, fornecedores, convidados com confirmação, roteiro do dia e a página do casal
import {
  criarApp, esc, moeda, moedaC, num, pct, hoje, diaMais, mesMais, nomeMes, dataCurta, dataBR, relativo, diasAte,
  sorteio, soma, agrupar, av, ic, et, prog, kpis, barrasH, kanban, calMes, telLink,
  modal, confirmar, avisar, editar, excluir, ficha, props, linhaDoTempo, vazio, imprimir,
} from '../base/nexo.js';
import { LADOS as FERR, ITENS as FERR_ITENS } from './ferramentas.js';
import { acoesLado, ferramentaPaginas, travarPro } from '../base/lado.js';
import { equipeViva, paginaEquipe } from '../base/equipe-viva.js';

const ETAPAS = [['negociacao', 'Em negociação', '#a39b86'], ['fechado', 'Contrato fechado', '#b08d4f'], ['planejamento', 'Planejamento', '#7c8a45'], ['reta', 'Reta final (30 dias)', '#c0692e'], ['realizado', 'Realizado', '#4f5a2e']];
const etp = (id) => ETAPAS.find((e) => e[0] === id) || ETAPAS[0];
const TIPOS = ['Casamento', 'Bodas', '15 anos', 'Corporativo', 'Batizado', 'Formatura'];
const CATEGORIAS = ['Local', 'Buffet', 'Decoração', 'Fotografia', 'Filmagem', 'Música / DJ', 'Banda', 'Bolo e doces', 'Bebidas', 'Convites', 'Vestido', 'Traje do noivo', 'Beleza', 'Celebrante', 'Iluminação', 'Lembrancinhas', 'Transporte'];
const ASSESSORAS = [['as0', 'Juliana Paiva'], ['as1', 'Camila Rocha'], ['as2', 'Bianca Moura']];
const EQUIPE = { colecao: 'assessoras', rot: 'Assessoras', icone: 'user-circle', singular: 'assessora', plural: 'assessoras', genero: 'f', vazio: 'as assessoras', lista: ASSESSORAS,
  campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel' }],
  linha: (r) => [r.id, r.nome], registro: ([id, nome]) => ({ id, nome }) };
const padraoEquipe = (eu) => (ASSESSORAS.find((x) => x[0] === eu) || ASSESSORAS[0] || [''])[0];
const nomeA = (id) => (ASSESSORAS.find((x) => x[0] === id) || [, '—'])[1];
// checklist padrão: [tarefa, dias antes do evento, quem faz]
const CHECK_PADRAO = [['Definir data e estimativa de convidados', 365, 'noivos'], ['Fechar o local da cerimônia e da festa', 330, 'assessoria'], ['Contratar buffet', 300, 'assessoria'], ['Contratar fotografia e filmagem', 290, 'assessoria'], ['Escolher a decoração', 240, 'assessoria'], ['Lista de convidados (primeira versão)', 210, 'noivos'], ['Contratar música (DJ ou banda)', 200, 'assessoria'], ['Escolher o vestido', 180, 'noivos'], ['Save the date', 160, 'noivos'], ['Degustação do buffet', 120, 'noivos'], ['Enviar os convites', 90, 'noivos'], ['Definir o roteiro da cerimônia', 60, 'assessoria'], ['Prova final do vestido', 30, 'noivos'], ['Confirmar presença dos convidados (RSVP)', 25, 'noivos'], ['Reunião final com todos os fornecedores', 15, 'assessoria'], ['Mapa de mesas', 10, 'noivos'], ['Entregar o roteiro aos fornecedores', 5, 'assessoria']];

// ---------------------------------------------------------------- dados de exemplo (fictícios)
function semente() {
  const r = sorteio(20261112), e1 = (l) => l[Math.floor(r() * l.length)], ent = (a, b) => a + Math.floor(r() * (b - a + 1));
  const forn = [['Espaço Jardim das Oliveiras', 'Local'], ['Villa Toscana Eventos', 'Local'], ['Sabor & Arte Buffet', 'Buffet'], ['Buffet Dona Célia', 'Buffet'], ['Flor de Lis Decorações', 'Decoração'], ['Ateliê Verde Decor', 'Decoração'], ['Lumière Fotografia', 'Fotografia'], ['Clique Eterno', 'Fotografia'], ['Cine Amor Filmes', 'Filmagem'], ['DJ Rafa Mendes', 'Música / DJ'], ['Banda Lua de Mel', 'Banda'], ['Doce Encanto Confeitaria', 'Bolo e doces'], ['Bar & Drinks Express', 'Bebidas'], ['Papelaria Afeto', 'Convites'], ['Noiva Bela Ateliê', 'Vestido'], ['Studio Beleza Real', 'Beleza'], ['Celebrante Marcos Aurélio', 'Celebrante'], ['Luz & Cena Iluminação', 'Iluminação']]
    .map(([nome, categoria], i) => ({ id: `fo${i}`, nome, categoria, telefone: `(11) 9${ent(8100, 9899)}-${ent(1000, 9999)}`, instagram: `@${nome.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '').slice(0, 14)}`, nota: ent(4, 5) }));
  const casais = [['Mariana & Thiago', 'Casamento'], ['Letícia & Gabriel', 'Casamento'], ['Fernanda & Ricardo', 'Casamento'], ['Júlia & Mateus', 'Casamento'], ['Isabela 15 anos', '15 anos'], ['Patrícia & Leonardo', 'Casamento'], ['Bodas de Prata · Sílvia & José', 'Bodas'], ['Carolina & Felipe', 'Casamento'], ['Convenção Grupo Vértice', 'Corporativo'], ['Amanda & Bruno', 'Casamento'], ['Beatriz & Lucas', 'Casamento']];
  const eventos = casais.map(([nome, tipo], i) => {
    const dias = [-40, -12, 9, 26, 38, 61, 95, 140, 175, 230, 300][i];
    const etapa = dias < 0 ? 'realizado' : dias <= 30 ? 'reta' : dias <= 200 ? 'planejamento' : i === 10 ? 'negociacao' : 'fechado';
    const convidados = tipo === 'Corporativo' ? 320 : ent(90, 260);
    return { id: `ev${i}`, nome, tipo, data: diaMais(dias), hora: e1(['16:00', '17:00', '19:00', '20:00']), local: e1(['Espaço Jardim das Oliveiras', 'Villa Toscana Eventos', 'Igreja Nossa Senhora do Brasil + Villa Toscana', 'Fazenda Santa Clara']), convidados,
      contratante: nome.split(' & ')[0].replace(/ 15 anos|Bodas de Prata · /, ''), telefone: `(11) 9${ent(8100, 9899)}-${ent(1000, 9999)}`, orcamento: Math.round(convidados * ent(380, 620) / 1000) * 1000,
      valor_assessoria: e1([6800, 8500, 9900, 12000]), assessora: ASSESSORAS[i % 3][0], etapa, assessoria_pago: dias < 0 ? 1 : etapa === 'negociacao' ? 0 : r() < 0.5 ? 0.5 : 0.3 };
  });
  const contratacoes = [], tarefas = [], roteiro = [];
  eventos.forEach((ev) => {
    if (ev.etapa === 'negociacao') return;
    const cats = ['Local', 'Buffet', 'Decoração', 'Fotografia', 'Música / DJ', 'Bolo e doces', 'Bebidas', 'Beleza', 'Celebrante'];
    cats.forEach((cat, k) => {
      const f = forn.filter((x) => x.categoria === cat), ja = diasAte(ev.data) < 330 - k * 25;
      if (!f.length || !ja) return;
      const valor = Math.round((ev.orcamento * { Local: 0.22, Buffet: 0.3, Decoração: 0.14, Fotografia: 0.07, 'Música / DJ': 0.05, 'Bolo e doces': 0.03, Bebidas: 0.06, Beleza: 0.02, Celebrante: 0.01 }[cat]) / 100) * 100;
      const pago = diasAte(ev.data) < 0 ? valor : Math.round(valor * e1([0.3, 0.5, 0.5, 0.7, 1]) / 10) * 10;
      contratacoes.push({ id: `ct${contratacoes.length}`, evento: ev.id, fornecedor: e1(f).id, categoria: cat, valor, pago, vencimento: diasAte(ev.data) < 0 ? null : diaMais(ent(-6, 40)), status: pago >= valor ? 'pago' : 'contratado' });
    });
    CHECK_PADRAO.forEach(([titulo, antes, quem]) => {
      const prazo = diaMais(-antes, ev.data);
      tarefas.push({ id: `ta${tarefas.length}`, evento: ev.id, titulo, prazo, quem, feita: prazo < diaMais(-3) ? r() < 0.93 : prazo < hoje() ? r() < 0.4 : false });
    });
    if (diasAte(ev.data) < 45) [['15:00', 'Chegada da equipe de decoração', 'Flor de Lis Decorações'], ['15:30', 'Making of da noiva', 'Lumière Fotografia'], [ev.hora, 'Início da cerimônia', 'Celebrante'], ['', 'Entrada dos padrinhos', 'Assessoria'], ['', 'Entrada da noiva', 'Assessoria'], ['', 'Fotos com a família', 'Fotografia'], ['', 'Abertura da pista', 'DJ'], ['', 'Corte do bolo', 'Assessoria'], ['', 'Saída dos noivos', 'Assessoria']]
      .forEach(([hora, atividade, resp], k) => { const h = Number(ev.hora.slice(0, 2)) + (k < 2 ? -2 + k * 0.5 : (k - 2) * 0.6); roteiro.push({ id: `ro${roteiro.length}`, evento: ev.id, hora: hora || `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`, atividade, responsavel: resp }); });
  });
  const NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabriela', 'Henrique', 'Isadora', 'João', 'Karina', 'Leandro', 'Mônica', 'Nelson', 'Olívia', 'Pedro', 'Quésia', 'Rafael', 'Sabrina', 'Túlio', 'Úrsula', 'Vítor', 'Wanda', 'Yuri'], SOBRE = ['Almeida', 'Barbosa', 'Cardoso', 'Duarte', 'Esteves', 'Freitas', 'Guimarães', 'Lacerda', 'Moraes', 'Nogueira', 'Pacheco', 'Queiroz', 'Ramos', 'Sampaio', 'Teixeira', 'Vasconcelos'];
  const convidados = [], usados = new Set(), nomeU = () => { let n; do n = `${e1(NOMES)} ${e1(SOBRE)}`; while (usados.has(n)); usados.add(n); return n; };
  eventos.filter((x) => diasAte(x.data) >= 0 && x.etapa !== 'negociacao').slice(0, 3).forEach((x) => {
    for (let k = 0; k < 64; k++) {
      const perto = diasAte(x.data) < 30;
      convidados.push({ id: `cv${convidados.length}`, evento: x.id, nome: nomeU(), lado: k % 9 === 0 ? 'ambos' : k % 2 ? 'noivo' : 'noiva', acompanhantes: e1([0, 0, 1, 1, 1, 2]), telefone: `(11) 9${ent(8100, 9899)}-${ent(1000, 9999)}`, rsvp: perto ? e1(['sim', 'sim', 'sim', 'sim', 'nao', 'pendente']) : e1(['sim', 'pendente', 'pendente']), mesa: perto && k % 4 !== 3 ? String(1 + Math.floor(k / 8)) : '' });
    }
  });
  return { convidados, _cfg: { empresa: 'Laços Assessoria & Cerimonial', telefone: '(11) 3456-7788', endereco: 'Rua Haddock Lobo, 1200 · São Paulo/SP', cnpj: '41.208.553/0001-60' }, fornecedores: forn, eventos, contratacoes, tarefas, roteiro };
}

// ---------------------------------------------------------------- regras
const evs = (a) => a.db.lista('eventos');
const ev = (a, id) => a.db.obter('eventos', id);
const forn = (a, id) => a.db.obter('fornecedores', id);
const ctsDe = (a, id) => a.db.lista('contratacoes').filter((c) => c.evento === id);
const tarDe = (a, id) => a.db.lista('tarefas').filter((t) => t.evento === id).sort((x, y) => x.prazo.localeCompare(y.prazo));
const cvDe = (a, id) => a.db.lista('convidados').filter((x) => x.evento === id).sort((x, y) => x.nome.localeCompare(y.nome));
const pessoas = (l) => soma(l, (c) => 1 + (Number(c.acompanhantes) || 0));
const resumoRSVP = (a, id) => { const l = cvDe(a, id); return { total: pessoas(l), sim: pessoas(l.filter((c) => c.rsvp === 'sim')), nao: pessoas(l.filter((c) => c.rsvp === 'nao')), pend: pessoas(l.filter((c) => c.rsvp === 'pendente')), convites: l.length }; };
const rotDe = (a, id) => a.db.lista('roteiro').filter((x) => x.evento === id).sort((x, y) => x.hora.localeCompare(y.hora));
const progresso = (a, id) => { const t = tarDe(a, id); return t.length ? (t.filter((x) => x.feita).length / t.length) * 100 : 0; };
const atrasadas = (a, id) => tarDe(a, id).filter((t) => !t.feita && t.prazo < hoje());
const contratado = (a, id) => soma(ctsDe(a, id), (c) => c.valor);
const aPagar = (a, id) => soma(ctsDe(a, id), (c) => c.valor - (c.pago || 0));
const contagem = (d) => { const n = diasAte(d); return n < 0 ? 'realizado' : n === 0 ? 'é hoje!' : `faltam ${n} ${n === 1 ? 'dia' : 'dias'}`; };
const etE = (e) => `<span class="et sem-ponto" style="background:color-mix(in srgb,${etp(e.etapa)[2]} 14%,var(--painel));color:${etp(e.etapa)[2]}">${etp(e.etapa)[1]}</span>`;

const colecoes = {
  eventos: { singular: 'evento', plural: 'eventos', campos: [{ nome: 'nome', rotulo: 'Nome do evento (ex.: Ana & Pedro)', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: TIPOS }, { nome: 'data', rotulo: 'Data', tipo: 'data', obrigatorio: true }, { nome: 'hora', rotulo: 'Horário', tipo: 'texto', padrao: '17:00' }, { nome: 'local', rotulo: 'Local', tipo: 'texto', largo: true }, { nome: 'convidados', rotulo: 'Convidados', tipo: 'numero' }, { nome: 'orcamento', rotulo: 'Orçamento total dos clientes', tipo: 'moeda' }, { nome: 'contratante', rotulo: 'Contato principal', tipo: 'texto', obrigatorio: true }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel', obrigatorio: true }, { nome: 'valor_assessoria', rotulo: 'Valor da assessoria', tipo: 'moeda' }, { nome: 'assessora', rotulo: 'Assessora responsável', tipo: 'selecao', opcoes: () => ASSESSORAS.map(([id, n]) => [id, n]) }],
    antesDeSalvar: (d, _a, antigo) => ({ etapa: antigo?.etapa || 'negociacao', assessoria_pago: antigo?.assessoria_pago || 0, ...d }) },
  convidados: { singular: 'convidado', plural: 'convidados', campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'lado', rotulo: 'Lado', tipo: 'selecao', opcoes: [['noiva', 'Noiva / família 1'], ['noivo', 'Noivo / família 2'], ['ambos', 'Amigos do casal']] }, { nome: 'acompanhantes', rotulo: 'Acompanhantes', tipo: 'numero', padrao: 0 }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel' }, { nome: 'mesa', rotulo: 'Mesa', tipo: 'texto' }, { nome: 'rsvp', rotulo: 'Presença', tipo: 'selecao', opcoes: [['pendente', 'Sem resposta'], ['sim', 'Confirmado'], ['nao', 'Não vai']], padrao: 'pendente' }] },
  fornecedores: { singular: 'fornecedor', plural: 'fornecedores', campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'categoria', rotulo: 'Categoria', tipo: 'selecao', opcoes: CATEGORIAS }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel' }, { nome: 'instagram', rotulo: 'Instagram', tipo: 'texto' }, { nome: 'nota', rotulo: 'Avaliação (1 a 5)', tipo: 'numero', padrao: 5 }] },
};

// ---------------------------------------------------------------- páginas
function painel(a) {
  const prox = evs(a).filter((e) => e.etapa !== 'realizado' && e.etapa !== 'negociacao').sort((x, y) => x.data.localeCompare(y.data));
  const ano = hoje().slice(0, 4), doAno = evs(a).filter((e) => e.data.startsWith(ano) && e.etapa !== 'negociacao');
  const tarefasAtras = prox.flatMap((e) => atrasadas(a, e.id).map((t) => ({ ...t, e })));
  const vencendo = a.db.lista('contratacoes').filter((c) => c.status !== 'pago' && c.vencimento && diasAte(c.vencimento) <= 15).sort((x, y) => x.vencimento.localeCompare(y.vencimento));
  const e0 = prox.find((e) => diasAte(e.data) >= 0), dias = e0 ? diasAte(e0.data) : 0, pr = e0 ? Math.round(progresso(a, e0.id)) : 0;
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const hero = e0 ? `<section class="sa-hero"><div style="position:relative;z-index:1"><div class="rot">Próximo grande dia · ${esc(e0.tipo)}</div><h2>${esc(e0.nome)}</h2><div class="onde">${dataBR(e0.data)} às ${esc(e0.hora)}${e0.local ? ` · ${esc(e0.local)}` : ''} · ${num(e0.convidados)} convidados</div>
      <div class="acoes"><button type="button" class="btn pri" data-acao="abrirEv" data-id="${e0.id}">${ic('arrow-right')}Abrir o casamento</button><button type="button" class="btn" data-acao="linkNoivos" data-id="${e0.id}">${ic('heart')}Página do casal</button></div></div>
    <div class="sa-cont"><div class="n">${dias === 0 ? 'Hoje' : dias}</div><div class="d">${dias === 0 ? 'é o grande dia' : dias === 1 ? 'dia para o sim' : 'dias para o sim'}</div><div class="sa-anel" style="--p:${pr}"><i></i></div><div class="sa-anel-tx">${pr}% do planejamento pronto${atrasadas(a, e0.id).length ? ` · ${atrasadas(a, e0.id).length} tarefas atrasadas` : ''}</div></div></section>`
    : `<section class="sa-hero"><div style="position:relative;z-index:1"><div class="rot">Agenda livre</div><h2>Nenhum casamento marcado</h2><div class="acoes"><button type="button" class="btn pri" data-acao="novoEvento">${ic('plus')}Novo evento</button></div></div></section>`;
  const fila = prox.filter((e) => e !== e0 && diasAte(e.data) >= 0).slice(0, 8);
  return `${hero}
    <div class="sa-nums"><div><b>${num(prox.length)}</b><span>eventos a caminho</span></div><div><b>${moedaC(soma(doAno, (e) => e.valor_assessoria))}</b><span>em assessorias em ${ano}</span></div><div><b>${moedaC(soma(prox, (e) => e.valor_assessoria * (1 - (e.assessoria_pago || 0))))}</b><span>a receber</span></div><div><b class="${tarefasAtras.length ? 'er-tx' : ''}">${num(tarefasAtras.length)}</b><span>tarefas atrasadas</span></div></div>
    ${fila.length ? `<div class="sa-sec-tit"><h3>Depois dele</h3><a href="#/eventos">Ver todos os eventos</a></div><div class="sa-fila">${fila.map((e) => `<article class="sa-ev" data-abrir="evento:${e.id}"><div class="q"><span><span class="dia">${e.data.slice(8, 10)}</span> <span class="mes">${MES[Number(e.data.slice(5, 7)) - 1]} ${e.data.slice(0, 4) !== ano ? e.data.slice(0, 4) : ''}</span></span><span class="mute" style="font-size:11.5px">${esc(contagem(e.data))}</span></div><div class="nm">${esc(e.nome)}</div><div class="s corta">${esc(e.tipo)} · ${esc(e.local || 'local a definir')}</div><div class="pr"><i style="width:${Math.round(progresso(a, e.id))}%"></i></div></article>`).join('')}</div>` : ''}
    <div class="sa-duas"><div class="cartao"><div class="cartao-cab"><div><h3>Pagamentos a fornecedores</h3><div class="sub">Vencendo nos próximos 15 dias</div></div></div>${vencendo.length ? `<ul class="lista">${vencendo.slice(0, 7).map((c) => `<li class="clicavel" data-abrir="evento:${c.evento}"><div class="cresce"><div class="t corta">${esc(forn(a, c.fornecedor)?.nome || c.categoria)}</div><div class="s corta">${esc(ev(a, c.evento)?.nome || '')} · vence ${relativo(c.vencimento)}</div></div><b class="num ${diasAte(c.vencimento) < 0 ? 'er-tx' : ''}">${moeda(c.valor - (c.pago || 0))}</b></li>`).join('')}</ul>` : vazio('check-circle', 'Nada vencendo')}</div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Tarefas atrasadas</h3><div class="sub">Lembre a equipe ou os clientes</div></div></div>${tarefasAtras.length ? `<ul class="lista">${tarefasAtras.slice(0, 8).map((t) => `<li><button type="button" class="btn fant peq ic-so" data-acao="marcarTarefa" data-id="${t.id}" aria-label="Concluir">${ic('circle')}</button><div class="cresce"><div class="t corta">${esc(t.titulo)}</div><div class="s corta">${esc(t.e.nome)} · ${t.quem === 'noivos' ? 'com os clientes' : 'com a assessoria'} · prazo ${dataCurta(t.prazo)}</div></div>${t.quem === 'noivos' ? `<a class="btn peq" target="_blank" rel="noopener" href="${telLink(t.e.telefone)}?text=${encodeURIComponent(`Oi, ${t.e.contratante.split(' ')[0]}! Passando para lembrar: "${t.titulo}". Qualquer dúvida, me chama!`)}">${ic('whatsapp-logo')}Lembrar</a>` : ''}</li>`).join('')}</ul>` : vazio('check-circle', 'Tudo em dia')}</div></div>`;
}

function eventosPag(a) {
  a.kanbans.eventos = (id, s) => { a.db.salvar('eventos', { id, etapa: s }); a.db.registrar(`eventos:${id}`, etp(s)[1], { icone: 'arrow-right', tom: 'acc' }); avisar(`${ev(a, id).nome} → ${etp(s)[1]}`); };
  a.kanbans['eventos:abrir'] = (id) => a.abrir('evento', id);
  return `<div class="entre"><span class="mute" style="font-size:12.5px">Arraste os eventos conforme avançam. Toque num cartão para abrir checklist, fornecedores e roteiro.</span><button type="button" class="btn pri" data-acao="novoEvento">${ic('plus')}Novo evento</button></div>`
    + kanban({ id: 'eventos', itens: evs(a).filter((e) => e.etapa !== 'realizado' || diasAte(e.data) > -30), campo: 'etapa', colunas: ETAPAS.map(([id, nome, cor]) => ({ id, nome, cor, sub: (l) => moedaC(soma(l, (e) => e.valor_assessoria)), classe: (e) => (atrasadas(a, e.id).length > 2 ? 'parado' : '') })),
      ficha: (e) => `<div class="entre"><span class="mute" style="font-size:11.5px">${esc(e.tipo)}</span><span class="mute" style="font-size:11.5px">${dataCurta(e.data)}</span></div><div class="t">${esc(e.nome)}</div><div class="s corta">${esc(e.local || '')} · ${num(e.convidados)} convidados</div>${prog(progresso(a, e.id), atrasadas(a, e.id).length ? 'al' : '')}<div class="linha"><span class="flex" style="gap:5px">${av(nomeA(e.assessora), 'p')}<span class="mute" style="font-size:11.5px">${contagem(e.data)}</span></span><b class="num" style="color:var(--tx)">${moedaC(e.valor_assessoria)}</b></div>` });
}

function agendaPag(a) {
  const st = a.estado.ag ||= { ym: hoje().slice(0, 7) };
  return `<div class="entre"><span class="flex"><button type="button" class="btn ic-so" data-acao="mesAg" data-n="-1" aria-label="Mês anterior">${ic('caret-left')}</button><b style="min-width:150px;text-align:center">${nomeMes(st.ym, true)}</b><button type="button" class="btn ic-so" data-acao="mesAg" data-n="1" aria-label="Próximo mês">${ic('caret-right')}</button></span><button type="button" class="btn pri" data-acao="novoEvento">${ic('plus')}Novo evento</button></div>
    <div class="cartao">${calMes({ ym: st.ym, itens: evs(a).map((e) => ({ id: e.id, data: e.data, titulo: `${e.hora} ${e.nome}`, cor: etp(e.etapa)[2] })), aoClicar: 'abrirEv' })}</div>`;
}

function tarefasPag(a) {
  return a.tab({ id: 'tarefas', colecao: 'tarefas', singular: 'tarefa', plural: 'tarefas', ordem: 'prazo', buscaDica: 'Tarefa ou evento…', aoClicar: (id) => a.abrir('evento', a.db.obter('tarefas', id).evento, 'checklist'),
    visoes: [{ id: 'abertas', rot: 'Em aberto', filtro: (t) => !t.feita && ev(a, t.evento)?.etapa !== 'realizado' }, { id: 'atrasadas', rot: 'Atrasadas', filtro: (t) => !t.feita && t.prazo < hoje() }, { id: 'semana', rot: 'Esta semana', filtro: (t) => !t.feita && diasAte(t.prazo) >= 0 && diasAte(t.prazo) <= 7 }, { id: 'todas', rot: 'Todas' }],
    filtros: [{ k: 'quem', rot: 'Quem faz', opcoes: [['assessoria', 'Assessoria'], ['noivos', 'Clientes']] }],
    textoBusca: (t) => `${t.titulo} ${ev(a, t.evento)?.nome}`,
    colunas: [{ k: 'feita', rot: '', ord: false, csv: false, render: (t) => `<button type="button" class="btn fant peq ic-so" data-acao="marcarTarefa" data-id="${t.id}" aria-label="${t.feita ? 'Reabrir' : 'Concluir'}">${ic(t.feita ? 'check-circle' : 'circle')}</button>` }, { k: 'titulo', rot: 'Tarefa', render: (t) => `<span class="prim" style="${t.feita ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(t.titulo)}</span><span class="sub">${esc(ev(a, t.evento)?.nome || '')}</span>` }, { k: 'quem', rot: 'Quem', render: (t) => (t.quem === 'noivos' ? et('Clientes', 'info') : et('Assessoria', '')) }, { k: 'prazo', rot: 'Prazo', render: (t) => `<span class="${!t.feita && t.prazo < hoje() ? 'er-tx' : ''}">${dataCurta(t.prazo)}</span>` }] });
}

function fornecedoresPag(a) {
  return a.tab({ id: 'forn', colecao: 'fornecedores', singular: 'fornecedor', plural: 'fornecedores', ordem: 'nome', buscaDica: 'Nome ou categoria…', novo: { rot: 'Novo fornecedor', attrs: 'data-acao="novoCad" data-c="fornecedores"' }, aoClicar: (id) => a.abrir('fornecedor', id),
    filtros: [{ k: 'categoria', rot: 'Categoria', opcoes: CATEGORIAS.map((c) => [c, c]) }],
    colunas: [{ k: 'nome', rot: 'Fornecedor', render: (f) => `<span class="prim">${esc(f.nome)}</span><span class="sub">${esc(f.instagram || '')}</span>` }, { k: 'categoria', rot: 'Categoria' }, { k: 'nota', rot: 'Avaliação', render: (f) => '★'.repeat(f.nota || 0) }, { k: 'eventos', rot: 'Eventos', n: true, valor: (f) => a.db.lista('contratacoes').filter((c) => c.fornecedor === f.id).length }, { k: 'total', rot: 'Contratado', n: true, valor: (f) => soma(a.db.lista('contratacoes').filter((c) => c.fornecedor === f.id), (c) => c.valor), render: (f) => moeda(soma(a.db.lista('contratacoes').filter((c) => c.fornecedor === f.id), (c) => c.valor)) }] });
}

function financeiroPag(a) {
  const cts = a.db.lista('contratacoes'), abertos = cts.filter((c) => c.status !== 'pago');
  const ano = hoje().slice(0, 4), meses = Array.from({ length: 6 }, (_, i) => mesMais(i - 1));
  return `${kpis([{ rot: 'Contratado com fornecedores', icone: 'handshake', val: moeda(soma(cts, (c) => c.valor)), nota: 'em nome dos clientes' }, { rot: 'Falta pagar aos fornecedores', icone: 'wallet', val: moeda(soma(abertos, (c) => c.valor - (c.pago || 0))) }, { rot: `Faturamento da assessoria ${ano}`, icone: 'coins', val: moeda(soma(evs(a).filter((e) => e.data.startsWith(ano) && e.etapa !== 'negociacao'), (e) => e.valor_assessoria)) }])}
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Eventos por mês</h3><div class="sub">Valor da assessoria</div></div></div><div class="cartao-corpo">${barrasH(meses.map((m) => { const l = evs(a).filter((e) => e.data.startsWith(m) && e.etapa !== 'negociacao'); return { rot: nomeMes(m), v: soma(l, (e) => e.valor_assessoria), extra: `${l.length} ev.` }; }), { fmt: moedaC })}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Onde o dinheiro dos clientes vai</h3><div class="sub">Por categoria de fornecedor</div></div></div><div class="cartao-corpo">${barrasH(Object.entries(agrupar(cts, (c) => c.categoria)).map(([k, l]) => ({ rot: k, v: soma(l, (c) => c.valor) })).sort((x, y) => y.v - x.v).slice(0, 8), { fmt: moedaC })}</div></div></div>
    ${a.tab({ id: 'pagtos', itens: () => cts, singular: 'pagamento', plural: 'pagamentos', ordem: 'vencimento', aoClicar: (id) => a.abrir('evento', a.db.obter('contratacoes', id).evento, 'fornecedores'),
      visoes: [{ id: 'abertos', rot: 'A pagar', filtro: (c) => c.status !== 'pago' }, { id: 'todos', rot: 'Todos' }],
      colunas: [{ k: 'fornecedor', rot: 'Fornecedor', valor: (c) => forn(a, c.fornecedor)?.nome, render: (c) => `<span class="prim">${esc(forn(a, c.fornecedor)?.nome || '')}</span><span class="sub">${esc(c.categoria)}</span>` }, { k: 'evento', rot: 'Evento', valor: (c) => ev(a, c.evento)?.nome }, { k: 'vencimento', rot: 'Vence', render: (c) => (c.vencimento ? `<span class="${c.status !== 'pago' && c.vencimento < hoje() ? 'er-tx' : ''}">${dataCurta(c.vencimento)}</span>` : '—') }, { k: 'saldo', rot: 'Falta', n: true, valor: (c) => c.valor - (c.pago || 0), render: (c) => (c.status === 'pago' ? et('Pago', 'ok') : moeda(c.valor - (c.pago || 0))) }] })}`;
}

// ---------------------------------------------------------------- documentos
function docMesas(a, e) {
  const l = cvDe(a, e.id).filter((c) => c.rsvp !== 'nao'), mesas = agrupar(l, (c) => c.mesa || 'Sem mesa');
  const ordem = Object.keys(mesas).sort((x, y) => (x === 'Sem mesa') - (y === 'Sem mesa') || Number(x) - Number(y) || x.localeCompare(y));
  return `<div class="doc"><h1>${esc(e.nome)} · mapa de mesas</h1><div style="color:#555">${dataBR(e.data)} · ${esc(e.local || '')} · ${num(pessoas(l))} pessoas</div>
    ${ordem.map((m) => `<h2>${m === 'Sem mesa' ? 'Sem mesa definida' : `Mesa ${esc(m)}`} · ${num(pessoas(mesas[m]))} lugares</h2><table><tbody>${mesas[m].map((c) => `<tr><td>${esc(c.nome)}${c.acompanhantes ? ` + ${c.acompanhantes}` : ''}</td><td>${c.rsvp === 'sim' ? 'confirmado' : 'sem resposta'}</td></tr>`).join('')}</tbody></table>`).join('')}</div>`;
}
function docProposta(a, e) {
  const cfg = a.db.cfg, v = e.valor_assessoria || 0;
  return `<div class="doc"><div class="entre" style="align-items:flex-start"><div><h1>${esc(a.empresa)}</h1><div style="color:#555">${esc(cfg.endereco || '')} · ${esc(cfg.telefone || '')}${cfg.cnpj ? ` · CNPJ ${esc(cfg.cnpj)}` : ''}</div></div><div style="text-align:right"><b style="font-size:16px">Proposta de assessoria</b><div style="color:#555">${dataBR(hoje())}</div></div></div>
    <h2>Evento</h2><table><tr><td>${esc(e.nome)} · ${esc(e.tipo)}</td><td>${dataBR(e.data)} às ${esc(e.hora)}</td></tr><tr><td>${esc(e.local || 'Local a definir')}</td><td>${num(e.convidados)} convidados</td></tr></table>
    <h2>O que está incluso</h2><table><tbody>${['Reuniões de planejamento e checklist completo até o dia', 'Indicação, orçamento e negociação com fornecedores', 'Acompanhamento de contratos e pagamentos', 'Página do casal com tarefas, fornecedores e roteiro', 'Lista de convidados com confirmação de presença e mapa de mesas', 'Roteiro do dia entregue a todos os fornecedores', 'Coordenação no dia do evento com a equipe da assessoria'].map((x) => `<tr><td>${x}</td></tr>`).join('')}</tbody></table>
    <h2>Investimento</h2><table><tbody><tr><td>Valor total da assessoria</td><td class="n"><b>${moeda(v)}</b></td></tr><tr><td>30% na assinatura do contrato</td><td class="n">${moeda(v * 0.3)}</td></tr><tr><td>40% em 90 dias</td><td class="n">${moeda(v * 0.4)}</td></tr><tr><td>30% até 15 dias antes do evento</td><td class="n">${moeda(v * 0.3)}</td></tr></tbody></table>
    <div style="margin-top:10px;color:#444;font-size:11px">Os valores dos fornecedores são pagos pelos contratantes diretamente a cada fornecedor. Proposta válida por 15 dias.</div><div class="ass"><div>${esc(a.empresa)}</div><div>${esc(e.contratante)}</div></div></div>`;
}
function docRoteiro(a, e) {
  const cts = ctsDe(a, e.id);
  return `<div class="doc"><div class="entre" style="align-items:flex-start"><div><h1>${esc(e.nome)}</h1><div style="color:#555">${esc(e.tipo)} · ${dataBR(e.data)} às ${esc(e.hora)} · ${esc(e.local || '')} · ${num(e.convidados)} convidados</div></div><div style="text-align:right"><b>${esc(a.empresa)}</b><div style="color:#555">${esc(a.db.cfg.telefone || '')}</div></div></div>
    <h2>Roteiro do dia</h2><table><thead><tr><th style="width:70px">Hora</th><th>Atividade</th><th>Responsável</th></tr></thead><tbody>${rotDe(a, e.id).map((x) => `<tr><td><b>${esc(x.hora)}</b></td><td>${esc(x.atividade)}</td><td>${esc(x.responsavel || '')}</td></tr>`).join('') || '<tr><td colspan="3">Roteiro ainda não montado</td></tr>'}</tbody></table>
    <h2>Fornecedores</h2><table><thead><tr><th>Categoria</th><th>Fornecedor</th><th>Contato</th></tr></thead><tbody>${cts.map((c) => { const f = forn(a, c.fornecedor); return `<tr><td>${esc(c.categoria)}</td><td>${esc(f?.nome || '')}</td><td>${esc(f?.telefone || '')}</td></tr>`; }).join('')}</tbody></table>
    <div style="margin-top:10px;color:#444;font-size:11px">Assessora responsável: ${esc(nomeA(e.assessora))}. Contato dos clientes: ${esc(e.contratante)} · ${esc(e.telefone)}.</div></div>`;
}

// ---------------------------------------------------------------- fichas
const fichas = {
  evento(a, id, aba = 'checklist') {
    const e = ev(a, id); if (!e) return null;
    const t = tarDe(a, id), cts = ctsDe(a, id), rot = rotDe(a, id), i = ETAPAS.findIndex((x) => x[0] === e.etapa);
    let corpo = '';
    if (aba === 'checklist') corpo = `<div class="gav-sec">${prog(progresso(a, id))}<p class="mute" style="font-size:12.5px;margin:6px 0 10px">${t.filter((x) => x.feita).length} de ${t.length} tarefas feitas · ${atrasadas(a, id).length} atrasadas</p>${t.length ? `<ul class="lista" style="margin:0 -20px">${t.map((x) => `<li><button type="button" class="btn fant peq ic-so" data-acao="marcarTarefa" data-id="${x.id}" aria-label="${x.feita ? 'Reabrir' : 'Concluir'}">${ic(x.feita ? 'check-circle' : 'circle')}</button><div class="cresce"><div class="t" style="${x.feita ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(x.titulo)}</div><div class="s">${x.quem === 'noivos' ? 'Clientes' : 'Assessoria'} · <span class="${!x.feita && x.prazo < hoje() ? 'er-tx' : ''}">${dataCurta(x.prazo)}</span></div></div><button type="button" class="btn fant peq ic-so" data-acao="tirarTarefa" data-id="${x.id}" aria-label="Remover">${ic('trash')}</button></li>`).join('')}</ul>` : vazio('list-checks', 'Checklist vazio')}
      <div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn" data-acao="novaTarefa" data-id="${id}">${ic('plus')}Tarefa</button>${t.length ? '' : `<button type="button" class="btn pri" data-acao="checklistPadrao" data-id="${id}">${ic('list-checks')}Usar o checklist padrão</button>`}</div></div>`;
    if (aba === 'fornecedores') corpo = `<div class="gav-sec">${cts.length ? `<table class="tabela"><thead><tr><th>Categoria</th><th>Fornecedor</th><th class="n">Valor</th><th class="n">Falta</th><th></th></tr></thead><tbody>${cts.map((c) => { const f = forn(a, c.fornecedor); return `<tr><td>${esc(c.categoria)}</td><td><span class="prim">${esc(f?.nome || '')}</span>${c.vencimento && c.status !== 'pago' ? `<span class="sub">próximo pagamento ${dataCurta(c.vencimento)}</span>` : ''}</td><td class="n">${moeda(c.valor)}</td><td class="n">${c.status === 'pago' ? et('Pago', 'ok') : moeda(c.valor - (c.pago || 0))}</td><td class="acoes">${c.status !== 'pago' ? `<button type="button" class="btn peq" data-acao="pagarForn" data-id="${c.id}">${ic('currency-circle-dollar')}Pagar</button>` : ''}${f?.telefone ? `<a class="btn fant peq ic-so" target="_blank" rel="noopener" href="${telLink(f.telefone)}" aria-label="WhatsApp">${ic('whatsapp-logo')}</a>` : ''}</td></tr>`; }).join('')}</tbody><tfoot><tr><td colspan="2">Total contratado · orçamento ${moeda(e.orcamento)}</td><td class="n">${moeda(contratado(a, id))}</td><td class="n">${moeda(aPagar(a, id))}</td><td></td></tr></tfoot></table>` : vazio('handshake', 'Nenhum fornecedor contratado')}
      <div class="flex" style="margin-top:12px"><button type="button" class="btn" data-acao="contratar" data-id="${id}">${ic('plus')}Fornecedor contratado</button></div></div>`;
    if (aba === 'orcamento') {
      const orc = e.orcamento || 0, contr = contratado(a, id), pago = soma(cts, (c) => c.pago || 0), livre = orc - contr, cats = Object.entries(agrupar(cts, (c) => c.categoria)).map(([k, l]) => ({ rot: k, v: soma(l, (c) => c.valor), extra: `${pct((soma(l, (c) => c.pago || 0) / (soma(l, (c) => c.valor) || 1)) * 100)} pago` })).sort((x, y) => y.v - x.v);
      corpo = `<div class="gav-sec">${kpis([{ rot: 'Orçamento do casal', icone: 'wallet', val: moeda(orc) }, { rot: 'Já contratado', icone: 'handshake', val: moeda(contr), nota: pct((contr / (orc || 1)) * 100) + ' do orçamento' }, { rot: livre >= 0 ? 'Ainda livre' : 'Acima do orçamento', icone: livre >= 0 ? 'wallet' : 'warning', val: moeda(Math.abs(livre)), alerta: livre < 0 }, { rot: 'Já pago', icone: 'check-circle', val: moeda(pago), nota: `falta ${moeda(contr - pago)}` }])}
        ${livre < 0 ? `<div class="dica" style="margin-top:12px">${ic('warning')}<span>Os contratos passaram ${moeda(-livre)} do orçamento combinado com o casal. Vale conversar antes de fechar mais fornecedores.</span></div>` : ''}</div>
        <div class="gav-sec"><h4>Por categoria</h4>${cats.length ? barrasH(cats, { fmt: moedaC }) : vazio('chart-bar', 'Nenhum fornecedor contratado ainda')}
        <p class="mute" style="font-size:12.5px;margin-top:10px">Faltam: ${CATEGORIAS.filter((c) => !cts.some((x) => x.categoria === c)).slice(0, 8).map(esc).join(', ') || 'nada, todas as categorias principais foram contratadas'}.</p></div>`;
    }
    if (aba === 'roteiro') {
      const hojeEv = e.data === hoje(), agora = new Date().toTimeString().slice(0, 5), atual = hojeEv ? rot.filter((x) => !x.feito && x.hora <= agora).slice(-1)[0] || rot.find((x) => !x.feito) : null;
      corpo = `<div class="gav-sec">${hojeEv ? `<div class="dica" style="margin-bottom:10px">${ic('sparkle')}<span><b>É hoje.</b> Marque cada momento quando acontecer: o casal acompanha pela página deles.</span></div>` : ''}${rot.length ? `<ul class="lista" style="margin:0 -20px">${rot.map((x) => `<li style="${x === atual ? 'background:var(--acc-suave)' : ''}"><button type="button" class="btn fant peq ic-so" data-acao="marcarRoteiro" data-id="${x.id}" aria-label="${x.feito ? 'Desmarcar' : 'Feito'}">${ic(x.feito ? 'check-circle' : 'circle')}</button><b class="num" style="width:52px">${esc(x.hora)}</b><div class="cresce"><div class="t" style="${x.feito ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(x.atividade)}${x === atual ? ` ${et('Agora', 'info')}` : ''}</div><div class="s">${esc(x.responsavel || '')}</div></div><button type="button" class="btn fant peq ic-so" data-acao="tirarRoteiro" data-id="${x.id}" aria-label="Remover">${ic('trash')}</button></li>`).join('')}</ul>` : vazio('clock', 'Roteiro do dia ainda não montado', 'Monte a sequência da cerimônia e da festa. Ela vai para os clientes e para os fornecedores.')}
      <div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn" data-acao="novoRoteiro" data-id="${id}">${ic('plus')}Item do roteiro</button><button type="button" class="btn" data-acao="imprimirRoteiro" data-id="${id}">${ic('printer')}Imprimir roteiro</button>${rot.length && cts.length ? `<button type="button" class="btn" data-acao="roteiroFornecedores" data-id="${id}">${ic('whatsapp-logo')}Mandar aos fornecedores</button>` : ''}</div></div>`;
    }
    if (aba === 'convidados') {
      const cv = cvDe(a, id), rs = resumoRSVP(a, id);
      corpo = `<div class="gav-sec">${kpis([{ rot: 'Confirmados', icone: 'check-circle', val: num(rs.sim), nota: `de ${num(rs.total)} pessoas` }, { rot: 'Sem resposta', icone: 'hourglass', val: num(rs.pend), alerta: rs.pend > 0 && diasAte(e.data) < 30 }, { rot: 'Não vão', icone: 'x-circle', val: num(rs.nao) }])}
      <div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn" data-acao="novoConvidado" data-id="${id}">${ic('user-plus')}Convidado</button><button type="button" class="btn" data-acao="colarConvidados" data-id="${id}">${ic('list-plus')}Colar lista</button><button type="button" class="btn" data-acao="imprimirMesas" data-id="${id}">${ic('printer')}Mapa de mesas</button>${rs.pend ? `<button type="button" class="btn pri" data-acao="lembrarRSVP" data-id="${id}">${ic('bell-ringing')}Lembrar quem não respondeu</button>` : ''}</div></div>
      <div class="gav-sec">${cv.length ? `<table class="tabela"><thead><tr><th>Convidado</th><th>Mesa</th><th>Presença</th><th></th></tr></thead><tbody>${cv.map((c) => `<tr><td><span class="prim">${esc(c.nome)}${c.acompanhantes ? ` <span class="mute">+${c.acompanhantes}</span>` : ''}</span><span class="sub">${{ noiva: 'Noiva / família 1', noivo: 'Noivo / família 2', ambos: 'Amigos do casal' }[c.lado] || ''}</span></td><td>${esc(c.mesa || '—')}</td><td>${c.rsvp === 'sim' ? et('Confirmado', 'ok') : c.rsvp === 'nao' ? et('Não vai', '') : et('Sem resposta', 'al')}</td><td class="acoes"><button type="button" class="btn peq" data-acao="conviteRSVP" data-id="${c.id}">${ic('paper-plane-tilt')}Convite</button><button type="button" class="btn fant peq ic-so" data-acao="editarCad" data-c="convidados" data-id="${c.id}" aria-label="Editar">${ic('pencil-simple')}</button></td></tr>`).join('')}</tbody></table>` : vazio('users-three', 'Nenhum convidado', 'Cole a lista (um nome por linha) e mande o convite com confirmação de presença.')}</div>`;
    }
    if (aba === 'dados') corpo = `<div class="gav-sec">${props([['heart', 'Tipo', esc(e.tipo)], ['calendar-blank', 'Data', `${dataBR(e.data)} às ${esc(e.hora)} · ${contagem(e.data)}`], ['map-pin', 'Local', esc(e.local || '')], ['users-three', 'Convidados', num(e.convidados)], ['user', 'Contato', `${esc(e.contratante)} · <a href="${telLink(e.telefone)}" target="_blank" rel="noopener">WhatsApp</a>`], ['wallet', 'Orçamento dos clientes', `${moeda(e.orcamento)} · contratado ${moeda(contratado(a, id))} (${pct((contratado(a, id) / (e.orcamento || 1)) * 100)})`], ['coins', 'Assessoria', `${moeda(e.valor_assessoria)} · recebido ${pct((e.assessoria_pago || 0) * 100)}`], ['user-gear', 'Assessora', esc(nomeA(e.assessora))]])}</div>
      <div class="gav-sec"><h4>Histórico</h4>${linhaDoTempo(a.db.historico(`eventos:${id}`).map((h) => ({ quando: h.quando, icone: h.icone, tom: h.tom, html: esc(h.texto) })))}</div>`;
    return { html: ficha({ tipo: esc(e.tipo), icone: 'heart', titulo: esc(e.nome), avatar: av(e.nome, 'g'), sub: `<span>${dataCurta(e.data)} · ${contagem(e.data)}</span>${atrasadas(a, id).length ? et(`${atrasadas(a, id).length} tarefas atrasadas`, 'al') : ''}`,
      extra: `<div class="etapas" style="margin-top:12px">${ETAPAS.map(([s, n], j) => `<button type="button" class="${j < i ? 'feita' : j === i ? 'atual' : ''}" data-acao="etapaEv" data-id="${id}" data-s="${s}">${n}</button>`).join('')}</div>
        <div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn pri" data-acao="linkNoivos" data-id="${id}">${ic('link')}Página dos clientes</button><button type="button" class="btn" data-acao="receberAssessoria" data-id="${id}">${ic('hand-coins')}Receber assessoria</button><button type="button" class="btn" data-acao="imprimirProposta" data-id="${id}">${ic('file-text')}Proposta</button><a class="btn" target="_blank" rel="noopener" href="${telLink(e.telefone)}">${ic('whatsapp-logo')}WhatsApp</a></div>`,
      aba, abas: [['checklist', 'Checklist', t.filter((x) => !x.feita).length], ['fornecedores', 'Fornecedores', cts.length], ['orcamento', 'Orçamento', contratado(a, id) > (e.orcamento || Infinity) ? '!' : ''], ['convidados', 'Convidados', cvDe(a, id).length || ''], ['roteiro', 'Roteiro do dia', rot.length || ''], ['dados', 'Dados']], corpo,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="eventos" data-id="${id}">${ic('pencil-simple')}Editar</button><button type="button" class="btn fant peq ic-so" data-acao="excluirEv" data-id="${id}" aria-label="Excluir">${ic('trash')}</button>` }), montar: (g) => (g.dataset.aba = aba) };
  },
  fornecedor(a, id) {
    const f = forn(a, id); if (!f) return null; const cts = a.db.lista('contratacoes').filter((c) => c.fornecedor === id);
    return { estreita: true, html: ficha({ tipo: 'Fornecedor', icone: 'storefront', titulo: esc(f.nome), sub: `<span>${esc(f.categoria)}</span><span>${'★'.repeat(f.nota || 0)}</span>`,
      extra: f.telefone ? `<div class="flex" style="margin-top:12px"><a class="btn pri" target="_blank" rel="noopener" href="${telLink(f.telefone)}">${ic('whatsapp-logo')}WhatsApp</a></div>` : '',
      corpo: `<div class="gav-sec">${props([['phone', 'Telefone', esc(f.telefone || '')], ['globe', 'Instagram', esc(f.instagram || '')], ['handshake', 'Eventos juntos', `${cts.length} · ${moeda(soma(cts, (c) => c.valor))}`]])}</div><div class="gav-sec"><h4>Eventos</h4>${cts.length ? `<ul class="lista" style="margin:0 -20px">${cts.map((c) => `<li class="clicavel" data-abrir="evento:${c.evento}"><div class="cresce"><div class="t">${esc(ev(a, c.evento)?.nome || '')}</div><div class="s">${dataCurta(ev(a, c.evento)?.data)}</div></div><b class="num">${moeda(c.valor)}</b></li>`).join('')}</ul>` : vazio('heart', 'Nenhum evento ainda')}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="fornecedores" data-id="${id}">${ic('pencil-simple')}Editar</button>` }) };
  },
};

// ---------------------------------------------------------------- aplicativo
const app = criarApp({
  id: 'cerimonial', paginaSite: 'eternize.html', nome: 'Blue Rose Eternize', sub: 'Do planejamento ao sim', marcaSub: 'Do planejamento ao sim', logo: new URL('logo.webp', import.meta.url).href, produto: { mensal: 89 }, cor: '#1d3f9e', icone: 'heart', empresa: 'Laços Assessoria & Cerimonial', conta: 'Casamentos e eventos · São Paulo',
  semente, colecoes, fichas, buscaDica: 'eventos e fornecedores',
  portal: {
    noivos: {
      explica: 'Os clientes acompanham a contagem regressiva, marcam as tarefas deles, veem os fornecedores e o que falta pagar, e o roteiro do dia. Tudo com o nome da sua assessoria.',
      montar: async (a, id) => {
        const e = ev(a, id); if (!e) return null;
        return { nome: e.nome, tipo: e.tipo, data: e.data, hora: e.hora, local: e.local, convidados: e.convidados, assessora: nomeA(e.assessora), progresso: Math.round(progresso(a, id)),
          tarefas: tarDe(a, id).map((t) => ({ id: t.id, titulo: t.titulo, prazo: t.prazo, quem: t.quem, feita: !!t.feita })),
          fornecedores: ctsDe(a, id).map((c) => { const f = forn(a, c.fornecedor); return { categoria: c.categoria, nome: f?.nome || '', telefone: f?.telefone || '', instagram: f?.instagram || '', valor: c.valor, falta: c.valor - (c.pago || 0), vencimento: c.status === 'pago' ? null : c.vencimento }; }),
          roteiro: rotDe(a, id).map((x) => ({ hora: x.hora, atividade: x.atividade, feito: !!x.feito })), rsvp: cvDe(a, id).length ? resumoRSVP(a, id) : null };
      },
      responder: (a, r) => {
        if (r.acao !== 'tarefa') return '';
        const t = a.db.obter('tarefas', r.dados.id); if (!t || t.evento !== r.ref || t.quem !== 'noivos') return '';
        a.db.salvar('tarefas', { id: t.id, feita: !!r.dados.feita }); a.db.registrar(`eventos:${t.evento}`, `Clientes ${r.dados.feita ? 'concluíram' : 'reabriram'}: ${t.titulo}`, { icone: 'check', tom: 'ok' });
        return `${ev(a, t.evento)?.nome}: os clientes ${r.dados.feita ? 'concluíram' : 'reabriram'} "${t.titulo}"`;
      },
    },
    convite: {
      explica: 'O convidado abre o convite no celular, vê data, hora e local e confirma se vai e com quantos acompanhantes. A resposta entra direto na lista.',
      montar: async (a, id) => {
        const c = a.db.obter('convidados', id); if (!c) return null; const e = ev(a, c.evento); if (!e) return null;
        return { convidado: c.nome, evento: e.nome, tipo: e.tipo, data: e.data, hora: e.hora, local: e.local, rsvp: c.rsvp, acompanhantes: c.acompanhantes || 0 };
      },
      responder: (a, r) => {
        const c = a.db.obter('convidados', r.ref); if (!c || r.acao !== 'rsvp') return '';
        const vai = r.dados.vai === true || r.dados.vai === 'sim', ac = Math.max(0, Math.min(10, Number(r.dados.acompanhantes) || 0));
        a.db.salvar('convidados', { id: c.id, rsvp: vai ? 'sim' : 'nao', acompanhantes: vai ? ac : c.acompanhantes });
        a.db.registrar(`eventos:${c.evento}`, `${c.nome} ${vai ? `confirmou presença${ac ? ` (+${ac})` : ''}` : 'avisou que não vai'}`, { icone: vai ? 'check' : 'x', tom: vai ? 'ok' : '' });
        return `${ev(a, c.evento)?.nome}: ${c.nome} ${vai ? 'confirmou presença' : 'não vai'}`;
      },
    },
  },
  passos: (a) => [{ id: 'ev', rot: 'Cadastre o primeiro evento', feito: evs(a).length > 0, acao: 'novoEvento' }, { id: 'link', rot: 'Mande a página dos clientes', feito: Object.keys(a.db.cfg.links || {}).length > 0, href: '#/eventos' }],
  equipe: [['Juliana Paiva', 'Dona'], ['Camila Rocha', 'Assessora'], ['Bianca Moura', 'Assessora']],
  busca: [{ colecao: 'eventos', grupo: 'Eventos', icone: 'heart', ficha: 'evento', rot: (e) => e.nome, sub: (e) => `${dataCurta(e.data)} · ${etp(e.etapa)[1]}` }, { colecao: 'fornecedores', grupo: 'Fornecedores', icone: 'storefront', ficha: 'fornecedor', rot: (f) => f.nome, sub: (f) => f.categoria }],
  comandos: [{ rot: 'Novo evento', icone: 'plus', acao: (a) => a.acoes.novoEvento() }],
  paginas: [
    { id: 'painel', rot: 'Painel', icone: 'house', titulo: 'Visão geral', render: painel, atalho: 'i' },
    { id: 'eventos', rot: 'Eventos', icone: 'kanban', titulo: 'Eventos', render: eventosPag, cheio: true, atalho: 'e', novo: (a) => a.acoes.novoEvento(), cont: (a) => evs(a).filter((e) => e.etapa !== 'realizado' && diasAte(e.data) <= 30 && diasAte(e.data) >= 0).length },
    { id: 'agenda', rot: 'Agenda', icone: 'calendar-blank', render: agendaPag },
    { id: 'tarefas', rot: 'Tarefas', icone: 'list-checks', render: tarefasPag, atalho: 't', cont: (a) => { const n = a.db.lista('tarefas').filter((t) => !t.feita && t.prazo < hoje() && ev(a, t.evento)?.etapa !== 'realizado').length; return n ? { n, tom: 'al' } : 0; } },
    { grupo: 'Gestão' },
    { id: 'fornecedores', rot: 'Fornecedores', icone: 'storefront', render: fornecedoresPag },
    { id: 'financeiro', rot: 'Financeiro', icone: 'coins', render: financeiroPag },
    paginaEquipe(EQUIPE),
    ...ferramentaPaginas(FERR, FERR_ITENS),
  ],
});

const reab = () => { app.render(); app.reabrir(); };
Object.assign(app.acoes, {
  novoEvento: async () => { const r = await editar(app, 'eventos'); if (!r) return; if (await confirmar('Criar o checklist padrão para este evento?', { rotulo: 'Criar checklist' })) app.acoes.checklistPadrao({ id: r.id }, true); app.render(); app.abrir('evento', r.id); },
  abrirEv: (d) => app.abrir('evento', d.id),
  mesAg: (d) => { const st = app.estado.ag; st.ym = mesMais(Number(d.n), `${st.ym}-01`); app.render(); },
  checklistPadrao: (d, quieto = false) => { const e = ev(app, d.id); CHECK_PADRAO.forEach(([titulo, antes, quem]) => { const prazo = diaMais(-antes, e.data); app.db.salvar('tarefas', { evento: e.id, titulo, prazo: prazo < hoje() ? diaMais(7) : prazo, quem, feita: false }); }); if (!quieto) { avisar('Checklist criado'); reab(); } },
  marcarTarefa: (d) => { const t = app.db.obter('tarefas', d.id); app.db.salvar('tarefas', { id: t.id, feita: !t.feita }); if (!t.feita) avisar(`Feito: ${t.titulo}`); reab(); },
  tirarTarefa: (d) => { app.db.apagar('tarefas', d.id); reab(); },
  novaTarefa: async (d) => { const r = await modal({ titulo: 'Nova tarefa', largura: 460, corpo: `<form class="form-grade"><label class="campo largo">Tarefa<input name="t" required></label><label class="campo">Prazo<input type="date" name="p" value="${diaMais(14)}" required></label><label class="campo">Quem faz<select name="q"><option value="assessoria">Assessoria</option><option value="noivos">Clientes</option></select></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Adicionar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return fm.reportValidity() ? Object.fromEntries(new FormData(fm)) : false; } }] }); if (!r) return; app.db.salvar('tarefas', { evento: d.id, titulo: r.t, prazo: r.p, quem: r.q, feita: false }); reab(); },
  contratar: async (d) => {
    const fs = app.db.lista('fornecedores').sort((x, y) => x.categoria.localeCompare(y.categoria));
    const r = await modal({ titulo: 'Fornecedor contratado', largura: 520, corpo: `<form class="form-grade"><label class="campo largo">Fornecedor<select name="f" required>${fs.map((f) => `<option value="${f.id}">${esc(f.categoria)} · ${esc(f.nome)}</option>`).join('')}</select></label><label class="campo">Valor total<input type="number" name="v" min="0" step="1" required></label><label class="campo">Já pago (sinal)<input type="number" name="p" min="0" step="1" value="0"></label><label class="campo">Próximo pagamento<input type="date" name="d" value="${diaMais(30)}"></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Adicionar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return fm.reportValidity() ? Object.fromEntries(new FormData(fm)) : false; } }] });
    if (!r) return; const f = forn(app, r.f), v = Number(r.v), p = Math.min(v, Number(r.p) || 0);
    app.db.salvar('contratacoes', { evento: d.id, fornecedor: f.id, categoria: f.categoria, valor: v, pago: p, vencimento: p >= v ? null : r.d, status: p >= v ? 'pago' : 'contratado' }); app.db.registrar(`eventos:${d.id}`, `Contratado: ${f.nome} (${moeda(v)})`, { icone: 'handshake', tom: 'ok' }); reab();
  },
  pagarForn: async (d) => { const c = app.db.obter('contratacoes', d.id), falta = c.valor - (c.pago || 0); const r = await modal({ titulo: `Pagamento · ${forn(app, c.fornecedor)?.nome}`, largura: 420, corpo: `<form class="form-grade"><label class="campo">Valor pago agora<input type="number" name="v" min="1" max="${falta}" value="${falta}"></label><label class="campo">Próximo vencimento<input type="date" name="d" value="${diaMais(30)}"></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Registrar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] }); if (!r) return; const pago = Math.min(c.valor, (c.pago || 0) + Number(r.v)); app.db.salvar('contratacoes', { id: c.id, pago, status: pago >= c.valor ? 'pago' : 'contratado', vencimento: pago >= c.valor ? null : r.d }); avisar(`${moeda(Number(r.v))} registrado`); reab(); },
  novoRoteiro: async (d) => { const r = await modal({ titulo: 'Item do roteiro', largura: 460, corpo: `<form class="form-grade"><label class="campo">Hora<input type="time" name="h" required value="${ev(app, d.id).hora}"></label><label class="campo">Responsável<input name="r" placeholder="Ex.: Fotografia"></label><label class="campo largo">Atividade<input name="a" required placeholder="Ex.: Entrada da noiva"></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Adicionar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return fm.reportValidity() ? Object.fromEntries(new FormData(fm)) : false; } }] }); if (!r) return; app.db.salvar('roteiro', { evento: d.id, hora: r.h, atividade: r.a, responsavel: r.r }); reab(); },
  tirarRoteiro: (d) => { app.db.apagar('roteiro', d.id); reab(); },
  imprimirRoteiro: (d) => imprimir(docRoteiro(app, ev(app, d.id))),
  etapaEv: (d) => { app.kanbans.eventos ? app.kanbans.eventos(d.id, d.s) : app.db.salvar('eventos', { id: d.id, etapa: d.s }); reab(); },
  receberAssessoria: async (d) => { const e = ev(app, d.id), falta = e.valor_assessoria * (1 - (e.assessoria_pago || 0)); if (falta <= 0) { avisar('A assessoria deste evento já está paga'); return; } const r = await modal({ titulo: `Receber · ${e.nome}`, largura: 420, corpo: `<label class="campo">Valor recebido<input type="number" data-v min="1" value="${Math.round(falta)}"></label><p class="mute" style="font-size:12.5px;margin-top:8px">Falta receber ${moeda(falta)} de ${moeda(e.valor_assessoria)}.</p>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Registrar', classe: 'pri ok', acao: (f) => Number(f.querySelector('[data-v]').value) || 0 }] }); if (!r) return; const pago = Math.min(1, (e.assessoria_pago || 0) + r / (e.valor_assessoria || 1)); app.db.salvar('eventos', { id: e.id, assessoria_pago: pago }); app.db.registrar(`eventos:${e.id}`, `Recebido ${moeda(r)} da assessoria`, { icone: 'hand-coins', tom: 'ok' }); avisar(`${moeda(r)} recebido`); reab(); },
  linkNoivos: (d) => { const e = ev(app, d.id); app.portal.compartilhar('noivos', d.id, { titulo: `Página dos clientes · ${e.nome}`, telefone: e.telefone, texto: `Oi, ${e.contratante.split(' ')[0]}! Esta é a página do seu ${e.tipo.toLowerCase()} aqui na ${app.empresa}. Acompanhe as tarefas, os fornecedores e o roteiro do grande dia:` }); },
  excluirEv: (d) => excluir(app, 'eventos', d.id),
  novoConvidado: async (d) => { if (await editar(app, 'convidados', null, { evento: d.id })) reab(); },
  colarConvidados: async (d) => {
    const r = await modal({ titulo: 'Colar lista de convidados', largura: 520, corpo: '<p class="mute-2" style="font-size:13px;margin-bottom:8px">Um convidado por linha. Para acompanhantes, escreva "+1" ou "+2" no fim do nome.</p><textarea data-l style="width:100%;min-height:220px" placeholder="Maria Souza +1&#10;João Lima&#10;Família Andrade +3"></textarea>', botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Adicionar', classe: 'pri', acao: (f) => f.querySelector('[data-l]').value }] });
    if (!r) return; let n = 0;
    r.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).forEach((linha) => { const m = linha.match(/^(.*?)\s*\+\s*(\d+)$/); app.db.salvar('convidados', { evento: d.id, nome: (m ? m[1] : linha).slice(0, 80), acompanhantes: m ? Number(m[2]) : 0, lado: 'ambos', rsvp: 'pendente', mesa: '' }); n++; });
    avisar(`${n} convidados adicionados`); reab();
  },
  conviteRSVP: (d) => { const c = app.db.obter('convidados', d.id), e = ev(app, c.evento); app.portal.compartilhar('convite', d.id, { titulo: `Convite · ${c.nome}`, telefone: c.telefone, texto: `Olá, ${c.nome.split(' ')[0]}! Você está convidado(a) para ${e.nome} em ${dataBR(e.data)}. Confirme sua presença por aqui:` }); },
  marcarRoteiro: (d) => { const x = app.db.obter('roteiro', d.id); app.db.salvar('roteiro', { id: x.id, feito: !x.feito }); if (!x.feito) app.db.registrar(`eventos:${x.evento}`, `${x.hora} · ${x.atividade}`, { icone: 'check', tom: 'ok' }); reab(); },
  lembrarRSVP: async (d) => {
    const e = ev(app, d.id), l = cvDe(app, d.id).filter((c) => c.rsvp === 'pendente');
    const linhas = await Promise.all(l.map(async (c) => { const url = await app.portal.link('convite', c.id); const txt = `Oi, ${c.nome.split(' ')[0]}! Passando para lembrar: ${e.nome} é em ${dataBR(e.data)}. Você consegue confirmar se vai? É só tocar aqui: ${url}`; return `<li><div class="cresce"><div class="t">${esc(c.nome)}</div><div class="s">${esc(c.telefone || 'sem WhatsApp cadastrado')}</div></div>${c.telefone ? `<a class="btn peq" target="_blank" rel="noopener" href="${telLink(c.telefone)}?text=${encodeURIComponent(txt)}" data-enviado>${ic('whatsapp-logo')}Lembrar</a>` : ''}</li>`; }));
    modal({ titulo: `Sem resposta · ${l.length} convidados`, largura: 520, corpo: `<p class="mute-2" style="font-size:13px;margin-bottom:8px">Cada botão abre o WhatsApp com a mensagem e o link de confirmação daquele convidado.</p><ul class="lista" style="margin:0 -20px;max-height:56vh;overflow:auto">${linhas.join('')}</ul>`, botoes: [{ rotulo: 'Fechar', valor: null, classe: 'fant' }] });
    document.querySelectorAll('[data-enviado]').forEach((b) => b.addEventListener('click', () => { b.classList.add('fant'); b.innerHTML = `${ic('check')}Enviado`; }));
  },
  roteiroFornecedores: async (d) => {
    const e = ev(app, d.id), txt = `${e.nome} · ${dataBR(e.data)} · ${e.local || ''}\n\nRoteiro do dia:\n${rotDe(app, d.id).map((x) => `${x.hora} · ${x.atividade}`).join('\n')}\n\nQualquer ajuste, fale com a assessoria (${app.db.cfg.telefone || ''}).`;
    const fs = ctsDe(app, d.id).map((c) => ({ c, f: forn(app, c.fornecedor) })).filter(({ f }) => f?.telefone);
    modal({ titulo: 'Mandar o roteiro aos fornecedores', largura: 520, corpo: `<ul class="lista" style="margin:0 -20px;max-height:56vh;overflow:auto">${fs.map(({ c, f }) => `<li><div class="cresce"><div class="t">${esc(f.nome)}</div><div class="s">${esc(c.categoria)}</div></div><a class="btn peq" target="_blank" rel="noopener" href="${telLink(f.telefone)}?text=${encodeURIComponent(txt)}">${ic('whatsapp-logo')}Enviar</a></li>`).join('')}</ul>`, botoes: [{ rotulo: 'Fechar', valor: null, classe: 'fant' }] });
  },
  imprimirMesas: (d) => imprimir(docMesas(app, ev(app, d.id))),
  imprimirProposta: (d) => imprimir(docProposta(app, ev(app, d.id))),
  novoCad: async (d) => { if (await editar(app, d.c)) app.render(); },
  editarCad: async (d) => { if (await editar(app, d.c, app.db.obter(d.c, d.id))) reab(); },
});

// ferramentas no menu da esquerda (WhatsApp e copiar); avisos e mensagens prontas: plano Pro
equipeViva(app, EQUIPE);
Object.assign(app.acoes, acoesLado());
app.travarLado = travarPro;
