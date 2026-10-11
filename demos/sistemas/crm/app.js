// Nexo CRM · funil de vendas, contatos, empresas e atividades (demonstração no navegador)
import { criarApp, esc, moeda, num, dataBR, dataHoraBR, diaMais, diasAte, hoje, iniciais, sorteio, kpi, cartao, progresso, graficoBarras, kanban, editar, modal, avisar } from '../base/nucleo.js';

const ETAPAS = ['Prospecção', 'Qualificação', 'Proposta', 'Negociação', 'Ganho', 'Perdido'];
const ABERTAS = ETAPAS.slice(0, 4);
const VENDEDORES = [['ana', 'Ana Ribeiro', 60000], ['bruno', 'Bruno Lacerda', 45000], ['carla', 'Carla Menezes', 50000]];
const nomeVend = (id) => (VENDEDORES.find((v) => v[0] === id) || [, id])[1];
const ORIGENS = ['Site', 'Indicação', 'Instagram', 'Google', 'Evento', 'Prospecção ativa'];
const MOTIVOS = ['Preço', 'Escolheu concorrente', 'Sem orçamento agora', 'Sem resposta', 'Projeto adiado'];
const PROB = { 'Prospecção': 10, 'Qualificação': 25, 'Proposta': 50, 'Negociação': 75, 'Ganho': 100, 'Perdido': 0 };

// ---------------------------------------------------------------- dados de exemplo (fictícios)
function exemplo() {
  const r = sorteio(42), escolha = (l) => l[Math.floor(r() * l.length)];
  const empresas = [
    ['Atlas Distribuidora', 'Distribuição', 'Curitiba/PR'], ['Clínica Sorriso Pleno', 'Saúde', 'Campinas/SP'], ['Moura & Castro Advogados', 'Jurídico', 'Belo Horizonte/MG'],
    ['Padaria Trigo Bom', 'Alimentação', 'Londrina/PR'], ['Studio Bella Forma', 'Estética', 'Florianópolis/SC'], ['Construtora Horizonte', 'Construção', 'Goiânia/GO'],
    ['Auto Center Rota 116', 'Automotivo', 'Joinville/SC'], ['Escola Pequeno Saber', 'Educação', 'Recife/PE'], ['Mercado Bom Preço', 'Varejo', 'Fortaleza/CE'],
    ['TechNorte Soluções', 'Tecnologia', 'Manaus/AM'], ['Farmácia Vida Plena', 'Saúde', 'Salvador/BA'], ['Pet Shop Amigo Fiel', 'Varejo', 'Porto Alegre/RS'],
  ].map(([nome, segmento, cidade], i) => ({ id: `e${i}`, nome, segmento, cidade, telefone: `(${41 + i}) 3${200 + i * 7}-${1000 + i * 37}`, site: `www.${nome.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '').slice(0, 14)}.com.br` }));
  const pessoas = ['Mariana Costa', 'Rafael Nunes', 'Juliana Prado', 'Diego Martins', 'Patrícia Lima', 'Gustavo Rocha', 'Fernanda Alves', 'Thiago Barros', 'Camila Duarte', 'Lucas Teixeira', 'Renata Souza', 'Eduardo Pires', 'Beatriz Gomes', 'André Farias'];
  const cargos = ['Sócio(a)', 'Gerente', 'Diretor(a) comercial', 'Compras', 'Administrativo', 'Proprietário(a)'];
  const contatos = pessoas.map((nome, i) => {
    const em = empresas[i % empresas.length];
    return { id: `c${i}`, nome, empresa: em.id, cargo: escolha(cargos), email: `${nome.split(' ')[0].toLowerCase()}@${em.site.replace('www.', '')}`, telefone: `(${41 + i}) 9${8100 + i * 13}-${2000 + i * 41}`, origem: escolha(ORIGENS), status: i < 4 ? 'Cliente' : i > 12 ? 'Inativo' : 'Lead' };
  });
  const produtos = ['Implantação do sistema', 'Plano anual', 'Consultoria', 'Pacote de licenças', 'Projeto sob medida', 'Treinamento da equipe', 'Renovação de contrato'];
  const negocios = [];
  for (let i = 0; i < 26; i++) {
    const c = contatos[i % contatos.length];
    const etapa = i < 4 ? 'Prospecção' : i < 8 ? 'Qualificação' : i < 12 ? 'Proposta' : i < 15 ? 'Negociação' : i < 22 ? 'Ganho' : 'Perdido';
    const fechado = ['Ganho', 'Perdido'].includes(etapa);
    negocios.push({
      id: `n${i}`, titulo: `${escolha(produtos)} · ${empresas.find((e) => e.id === c.empresa).nome.split(' ')[0]}`, empresa: c.empresa, contato: c.id,
      valor: Math.round((1800 + r() * 22000) / 50) * 50, etapa, responsavel: VENDEDORES[i % 3][0], origem: c.origem,
      previsao: etapa === 'Ganho' && i < 19 ? diaMais(-Math.floor(r() * Math.max(1, new Date().getDate() - 1))) : fechado ? diaMais(-25 - Math.floor(r() * 150)) : diaMais(Math.floor(r() * 45) - 5), probabilidade: PROB[etapa],
      motivo_perda: etapa === 'Perdido' ? escolha(MOTIVOS) : '',
    });
  }
  const tipos = ['Ligação', 'Reunião', 'E-mail', 'WhatsApp', 'Visita'];
  const tarefas = negocios.filter((n) => ABERTAS.includes(n.etapa)).flatMap((n, i) => [
    { titulo: `${escolha(['Retornar sobre a proposta', 'Apresentar a demonstração', 'Enviar contrato', 'Confirmar reunião', 'Tirar dúvidas do orçamento'])}`, tipo: escolha(tipos), negocio: n.id, responsavel: n.responsavel,
      quando: `${diaMais(Math.floor(r() * 9) - 3)}T${String(9 + Math.floor(r() * 8)).padStart(2, '0')}:${r() > 0.5 ? '00' : '30'}`, feita: false },
    ...(i % 2 ? [{ titulo: 'Primeiro contato', tipo: 'Ligação', negocio: n.id, responsavel: n.responsavel, quando: `${diaMais(-10 - i)}T10:00`, feita: true }] : []),
  ]);
  return { empresas, contatos, negocios, tarefas };
}
let cache = null;
const seed = (nome) => () => { if (!cache) cache = exemplo(); return cache[nome]; };

// ---------------------------------------------------------------- coleções
const colecoes = {
  negocios: {
    singular: 'negócio', plural: 'negócios', seed: seed('negocios'),
    subtitulo: (x, app) => app.db.obter('empresas', x.empresa)?.nome || '',
    campos: [
      { nome: 'titulo', rotulo: 'Negócio', tipo: 'texto', obrigatorio: true, lista: true, largo: true },
      { nome: 'empresa', rotulo: 'Empresa', tipo: 'relacao', colecao: 'empresas', obrigatorio: true },
      { nome: 'contato', rotulo: 'Contato', tipo: 'relacao', colecao: 'contatos' },
      { nome: 'valor', rotulo: 'Valor', tipo: 'moeda', obrigatorio: true, lista: true },
      { nome: 'etapa', rotulo: 'Etapa', tipo: 'selecao', opcoes: ETAPAS, obrigatorio: true, lista: true, filtro: true, padrao: 'Prospecção',
        cores: { 'Ganho': 'ok', 'Perdido': 'er', 'Negociação': 'al', 'Proposta': 'info', 'Qualificação': 'acc', 'Prospecção': '' } },
      { nome: 'responsavel', rotulo: 'Responsável', tipo: 'selecao', opcoes: VENDEDORES.map((v) => [v[0], v[1]]), obrigatorio: true, lista: true, filtro: true, exibir: (x) => esc(nomeVend(x.responsavel)), ocultaCel: true },
      { nome: 'previsao', rotulo: 'Previsão de fechamento', tipo: 'data', lista: true, ocultaCel: true, padrao: () => diaMais(15) },
      { nome: 'origem', rotulo: 'Origem', tipo: 'selecao', opcoes: ORIGENS },
      { nome: 'motivo_perda', rotulo: 'Motivo da perda (se perdido)', tipo: 'selecao', opcoes: MOTIVOS },
    ],
    aoSalvar: (x, app) => { app.db.salvar('negocios', { id: x.id, probabilidade: PROB[x.etapa] ?? 10 }); },
  },
  contatos: {
    singular: 'contato', plural: 'contatos', seed: seed('contatos'),
    subtitulo: (x, app) => [x.cargo, app.db.obter('empresas', x.empresa)?.nome].filter(Boolean).join(' · '),
    campos: [
      { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, lista: true },
      { nome: 'empresa', rotulo: 'Empresa', tipo: 'relacao', colecao: 'empresas' },
      { nome: 'cargo', rotulo: 'Cargo', tipo: 'texto' },
      { nome: 'email', rotulo: 'E-mail', tipo: 'email', lista: true, ocultaCel: true },
      { nome: 'telefone', rotulo: 'Telefone / WhatsApp', tipo: 'tel', lista: true },
      { nome: 'origem', rotulo: 'Origem', tipo: 'selecao', opcoes: ORIGENS, lista: true, filtro: true, ocultaCel: true },
      { nome: 'status', rotulo: 'Situação', tipo: 'selecao', opcoes: ['Lead', 'Cliente', 'Inativo'], lista: true, filtro: true, padrao: 'Lead', cores: { Cliente: 'ok', Lead: 'info', Inativo: '' } },
    ],
  },
  empresas: {
    singular: 'empresa', plural: 'empresas', seed: seed('empresas'),
    subtitulo: (x) => x.cidade || '',
    campos: [
      { nome: 'nome', rotulo: 'Empresa', tipo: 'texto', obrigatorio: true, lista: true },
      { nome: 'segmento', rotulo: 'Segmento', tipo: 'texto', lista: true, filtro: false },
      { nome: 'cidade', rotulo: 'Cidade/UF', tipo: 'texto' },
      { nome: 'telefone', rotulo: 'Telefone', tipo: 'tel', lista: true, ocultaCel: true },
      { nome: 'site', rotulo: 'Site', tipo: 'texto', lista: true, ocultaCel: true },
    ],
  },
  tarefas: {
    singular: 'atividade', plural: 'atividades', seed: seed('tarefas'), botaoNovo: 'Nova atividade',
    subtitulo: (x, app) => app.db.obter('negocios', x.negocio)?.titulo || '',
    campos: [
      { nome: 'titulo', rotulo: 'Atividade', tipo: 'texto', obrigatorio: true, lista: true, largo: true },
      { nome: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: ['Ligação', 'Reunião', 'E-mail', 'WhatsApp', 'Visita'], obrigatorio: true, lista: true, filtro: true, padrao: 'Ligação' },
      { nome: 'negocio', rotulo: 'Negócio', tipo: 'relacao', colecao: 'negocios', mostrar: 'titulo' },
      { nome: 'quando', rotulo: 'Quando', tipo: 'datahora', obrigatorio: true, lista: true, padrao: () => `${diaMais(1)}T10:00`,
        exibir: (x) => { const d = diasAte(x.quando); return `${dataHoraBR(x.quando)}${!x.feita && d < 0 ? ' <span class="selo er">atrasada</span>' : !x.feita && d === 0 ? ' <span class="selo al">hoje</span>' : ''}`; } },
      { nome: 'responsavel', rotulo: 'Responsável', tipo: 'selecao', opcoes: VENDEDORES.map((v) => [v[0], v[1]]), obrigatorio: true, lista: true, filtro: true, exibir: (x) => esc(nomeVend(x.responsavel)), ocultaCel: true },
      { nome: 'feita', rotulo: 'Concluída', tipo: 'booleano', lista: true, exibir: (x) => (x.feita ? '<span class="selo ok">feita</span>' : '<span class="selo">a fazer</span>') },
    ],
  },
};
// ---------------------------------------------------------------- páginas
const abertos = (app) => app.db.lista('negocios').filter((n) => ABERTAS.includes(n.etapa));
const doMes = (iso) => String(iso || '').slice(0, 7) === hoje().slice(0, 7);

function painel(app) {
  const ns = app.db.lista('negocios'), ab = abertos(app);
  const ganhos = ns.filter((n) => n.etapa === 'Ganho'), perdidos = ns.filter((n) => n.etapa === 'Perdido');
  const ganhoMes = ganhos.filter((n) => doMes(n.previsao)).reduce((s, n) => s + n.valor, 0);
  const pipeline = ab.reduce((s, n) => s + n.valor, 0), ponderado = ab.reduce((s, n) => s + n.valor * (PROB[n.etapa] / 100), 0);
  const conv = ganhos.length + perdidos.length ? Math.round((ganhos.length / (ganhos.length + perdidos.length)) * 100) : 0;
  const ts = app.db.lista('tarefas'), atrasadas = ts.filter((t) => !t.feita && diasAte(t.quando) < 0).length;
  const meses = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); return d.toISOString().slice(0, 7); });
  const nomeMes = (m) => new Date(`${m}-15`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const grafico = graficoBarras({ dados: meses.map((m) => ({ rotulo: nomeMes(m), valores: [ganhos.filter((n) => n.previsao.startsWith(m)).reduce((s, n) => s + n.valor, 0)] })), series: [{ nome: 'Vendas', cor: 'var(--acc)' }], formato: (v) => `R$ ${(v / 1000).toFixed(0)}k` });
  const ranking = VENDEDORES.map(([id, nome, meta]) => { const v = ganhos.filter((n) => n.responsavel === id && doMes(n.previsao)).reduce((s, n) => s + n.valor, 0); return { nome, v, meta }; }).sort((a, b) => b.v - a.v);
  const proximas = ts.filter((t) => !t.feita).sort((a, b) => a.quando.localeCompare(b.quando)).slice(0, 6);
  return `<div class="kpis">
      ${kpi({ icone: '◎', rotulo: 'Em negociação', valor: moeda(pipeline), nota: `${ab.length} negócios · ${moeda(ponderado)} ponderado` })}
      ${kpi({ icone: '✓', rotulo: 'Vendido no mês', valor: moeda(ganhoMes), tom: 'ok', nota: `${ganhos.filter((n) => doMes(n.previsao)).length} negócios ganhos` })}
      ${kpi({ icone: '%', rotulo: 'Taxa de conversão', valor: `${conv}%`, nota: `${ganhos.length} ganhos · ${perdidos.length} perdidos` })}
      ${kpi({ icone: '!', rotulo: 'Atividades atrasadas', valor: atrasadas, tom: atrasadas ? 'er' : 'ok', nota: atrasadas ? 'precisam de retorno' : 'tudo em dia' })}
    </div>
    <div class="grade g-21">
      ${cartao('Vendas fechadas', grafico, { sub: 'últimos 6 meses' })}
      ${cartao('Metas do mês', ranking.map((x) => `<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;font-size:13px"><span><span class="avatar" style="display:inline-grid;width:24px;height:24px;font-size:10px;margin-right:6px">${iniciais(x.nome)}</span>${esc(x.nome)}</span><b>${moeda(x.v)}</b></div><div style="margin-top:6px">${progresso((x.v / x.meta) * 100)}</div><small class="muted">${Math.round((x.v / x.meta) * 100)}% de ${moeda(x.meta)}</small></div>`).join(''), { sub: 'por vendedor' })}
    </div>
    <div class="grade g2">
      ${cartao('Funil', ABERTAS.map((e) => { const l = ab.filter((n) => n.etapa === e), v = l.reduce((s, n) => s + n.valor, 0); return `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:13px"><span>${e} <span class="muted">· ${l.length}</span></span><b>${moeda(v)}</b></div><div style="margin-top:5px">${progresso(pipeline ? (v / pipeline) * 100 : 0)}</div></div>`; }).join(''), { acoes: '<a class="btn peq" href="#/funil">Abrir funil</a>' })}
      ${cartao('Próximas atividades', proximas.length ? `<ul class="lista-simples">${proximas.map((t) => { const d = diasAte(t.quando); return `<li><span class="avatar">${esc(t.tipo[0])}</span><div><b>${esc(t.titulo)}</b><div class="muted" style="font-size:12.5px">${esc(app.db.obter('negocios', t.negocio)?.titulo || '')}</div></div><div class="dir"><div style="font-size:12.5px">${dataHoraBR(t.quando)}</div>${d < 0 ? '<span class="selo er">atrasada</span>' : d === 0 ? '<span class="selo al">hoje</span>' : ''}</div></li>`; }).join('')}</ul>` : '<div class="vazio">Sem atividades pendentes.</div>', { acoes: '<a class="btn peq" href="#/atividades">Ver todas</a>' })}
    </div>`;
}

function funil(app) {
  const ns = app.db.lista('negocios').filter((n) => app.estado.funilTodos || ABERTAS.includes(n.etapa) || (n.etapa === 'Ganho' && diasAte(n.previsao) > -30));
  app.kanbans.funil = (id, etapa) => { const n = app.db.obter('negocios', id); app.db.salvar('negocios', { id, etapa, probabilidade: PROB[etapa] }); avisar(`${n.titulo} → ${etapa}`); };
  return `<p class="muted" style="margin:0">Arraste os cartões entre as colunas (no celular, toque no cartão para mudar a etapa).</p>
    ${kanban({ chave: 'funil', colunas: ETAPAS.slice(0, 5).map((e) => ({ id: e, nome: e })), itens: ns, campo: 'etapa',
      rodape: (l) => moeda(l.reduce((s, n) => s + n.valor, 0)),
      cartao: (n) => `<b>${esc(n.titulo)}</b><div class="muted" style="font-size:12.5px">${esc(app.db.obter('empresas', n.empresa)?.nome || '')}</div>
        <div class="linha"><b style="color:var(--tx)">${moeda(n.valor)}</b><span>${dataBR(n.previsao)}</span></div>
        <div class="linha"><span><span class="avatar" style="display:inline-grid;width:20px;height:20px;font-size:9px">${iniciais(nomeVend(n.responsavel))}</span> ${esc(nomeVend(n.responsavel).split(' ')[0])}</span><button type="button" class="btn peq" data-acao="abrirNegocio" data-id="${n.id}">Abrir</button></div>` })}`;
}

function relatorios(app) {
  const ns = app.db.lista('negocios');
  const porOrigem = ORIGENS.map((o) => { const l = ns.filter((n) => n.origem === o); const g = l.filter((n) => n.etapa === 'Ganho'); return { o, total: l.length, ganhos: g.length, valor: g.reduce((s, n) => s + n.valor, 0) }; }).filter((x) => x.total);
  const perdas = MOTIVOS.map((m) => ({ m, n: ns.filter((n) => n.etapa === 'Perdido' && n.motivo_perda === m).length })).filter((x) => x.n);
  const totalPerdas = perdas.reduce((s, x) => s + x.n, 0) || 1;
  return `<div class="grade g2">
    ${cartao('De onde vêm as vendas', `<table class="tabela"><thead><tr><th>Origem</th><th class="num">Negócios</th><th class="num">Ganhos</th><th class="num">Conversão</th><th class="num">Vendido</th></tr></thead><tbody>${porOrigem.sort((a, b) => b.valor - a.valor).map((x) => `<tr><td>${esc(x.o)}</td><td class="num">${x.total}</td><td class="num">${x.ganhos}</td><td class="num">${Math.round((x.ganhos / x.total) * 100)}%</td><td class="num">${moeda(x.valor)}</td></tr>`).join('')}</tbody></table>`, { semPad: true, sub: 'origem do contato' })}
    ${cartao('Por que perdemos', perdas.length ? perdas.sort((a, b) => b.n - a.n).map((x) => `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:13px"><span>${esc(x.m)}</span><b>${x.n}</b></div><div style="margin-top:5px">${progresso((x.n / totalPerdas) * 100, 'var(--er)')}</div></div>`).join('') : '<div class="vazio">Nenhum negócio perdido.</div>', { sub: 'motivos registrados' })}
  </div>
  ${cartao('Desempenho por vendedor', `<table class="tabela"><thead><tr><th>Vendedor</th><th class="num">Em aberto</th><th class="num">Ganhos</th><th class="num">Perdidos</th><th class="num">Ticket médio</th><th class="num">Vendido</th></tr></thead><tbody>${VENDEDORES.map(([id, nome]) => { const l = ns.filter((n) => n.responsavel === id); const g = l.filter((n) => n.etapa === 'Ganho'); const v = g.reduce((s, n) => s + n.valor, 0); return `<tr><td>${esc(nome)}</td><td class="num">${l.filter((n) => ABERTAS.includes(n.etapa)).length}</td><td class="num">${g.length}</td><td class="num">${l.filter((n) => n.etapa === 'Perdido').length}</td><td class="num">${moeda(g.length ? v / g.length : 0)}</td><td class="num">${moeda(v)}</td></tr>`; }).join('')}</tbody></table>`, { semPad: true })}`;
}

const app = criarApp({
  id: 'crm', nome: 'Nexo CRM', sub: 'Vendas', cor: '#7c3aed', inicial: 'C', empresa: 'Solar Sistemas Ltda', empresaSub: 'Equipe comercial · 3 vendedores',
  produto: { compra: 2290, mensal: 99 },
  colecoes,
  menu: [
    { grupo: 'Vendas' },
    { id: 'painel', rotulo: 'Painel', icone: '◧', titulo: 'Painel de vendas', sub: () => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }), pagina: painel },
    { id: 'funil', rotulo: 'Funil', icone: '▥', titulo: 'Funil de vendas', pagina: funil, acoes: () => '<button type="button" class="btn pri" data-novo="negocios">+ Novo negócio</button>' },
    { id: 'negocios', rotulo: 'Negócios', icone: '◎', crud: 'negocios', opcoes: { ordem: 'previsao', total: (l) => moeda(l.reduce((s, n) => s + (n.valor || 0), 0)) } },
    { id: 'atividades', rotulo: 'Atividades', icone: '☑', crud: 'tarefas', opcoes: { ordem: 'quando', acoesExtra: (t) => (t.feita ? '' : `<button type="button" class="btn peq" data-acao="concluir" data-id="${t.id}">Concluir</button>`) },
      contador: (a) => a.db.lista('tarefas').filter((t) => !t.feita && diasAte(t.quando) < 0).length },
    { grupo: 'Cadastros' },
    { id: 'contatos', rotulo: 'Contatos', icone: '☺', crud: 'contatos', opcoes: { ordem: 'nome' } },
    { id: 'empresas', rotulo: 'Empresas', icone: '▦', crud: 'empresas', opcoes: { ordem: 'nome' } },
    { grupo: 'Gestão' },
    { id: 'relatorios', rotulo: 'Relatórios', icone: '▤', titulo: 'Relatórios', pagina: relatorios },
  ],
});
app.acoes = {
  concluir: (id) => { app.db.salvar('tarefas', { id, feita: true }); avisar('Atividade concluída'); },
  abrirNegocio: async (id) => { await editar(app, 'negocios', app.db.obter('negocios', id)); },
};
