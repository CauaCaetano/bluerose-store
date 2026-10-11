// Nexo Jurídico · escritórios de advocacia: processos, prazos e audiências, clientes e honorários
import { criarApp, esc, moeda, dataBR, diaMais, diasAte, hoje, iniciais, sorteio, kpi, cartao, progresso, graficoBarras, editar, modal, avisar } from '../base/nucleo.js';

const ADVOGADOS = [['ana', 'Dra. Ana Castro'], ['paulo', 'Dr. Paulo Moura'], ['lia', 'Dra. Lia Fontes']];
const nomeAdv = (id) => (ADVOGADOS.find((a) => a[0] === id) || [, id])[1];
const AREAS = ['Cível', 'Trabalhista', 'Família', 'Consumidor', 'Previdenciário', 'Tributário'];
const FASES = ['Inicial', 'Instrução', 'Sentença', 'Recurso', 'Execução', 'Arquivado'];
const COR_FASE = { Inicial: 'info', 'Instrução': 'acc', 'Sentença': 'al', Recurso: 'al', 'Execução': 'ok', Arquivado: '' };

const urgencia = (p) => {
  if (p.status === 'Cumprido') return '<span class="selo ok">cumprido</span>';
  const d = diasAte(p.data);
  if (d < 0) return `<span class="selo er">venceu há ${-d} dia${d === -1 ? '' : 's'}</span>`;
  if (d === 0) return '<span class="selo er">hoje</span>';
  if (d <= 3) return `<span class="selo al">em ${d} dia${d === 1 ? '' : 's'}</span>`;
  return `<span class="selo">em ${d} dias</span>`;
};

function exemplo() {
  const r = sorteio(11), escolha = (l) => l[Math.floor(r() * l.length)];
  const nomes = [['Marcos Antônio Silva', 'PF'], ['Supermercado Boa Compra Ltda', 'PJ'], ['Juliana Ferreira Lopes', 'PF'], ['Construtora Alicerce S/A', 'PJ'], ['Roberto Carlos Nunes', 'PF'],
    ['Clínica Odonto Vida Ltda', 'PJ'], ['Fernanda Oliveira Ramos', 'PF'], ['Transportes Rodobem Ltda', 'PJ'], ['Cláudia Regina Prates', 'PF'], ['José Pereira da Costa', 'PF'], ['Padaria Pão Nosso ME', 'PJ'], ['Simone Albuquerque', 'PF']];
  const clientes = nomes.map(([nome, tipo], i) => ({ id: `c${i}`, nome, tipo, documento: tipo === 'PF' ? `${100 + i * 37}.${200 + i * 11}.${300 + i * 7}-${10 + i}` : `${10 + i}.${300 + i * 13}.${400 + i * 9}/0001-${20 + i}`,
    telefone: `(31) 9${8400 + i * 23}-${1200 + i * 31}`, email: `${nome.split(' ')[0].toLowerCase()}@exemplo.com.br` }));
  const contrarias = ['Banco Horizonte S/A', 'Operadora Telecom Brasil', 'INSS', 'Fazenda Nacional', 'Empresa Aérea Voar', 'Seguradora Proteção', 'ex-cônjuge', 'Condomínio Jardim das Águas', 'Loja Magazine Central'];
  const processos = Array.from({ length: 18 }, (_, i) => {
    const area = AREAS[i % AREAS.length];
    return { id: `p${i}`, numero: `${String(5000000 + i * 137713).slice(0, 7)}-${10 + (i * 7) % 89}.20${22 + (i % 4)}.8.13.${String(24 + i).padStart(4, '0')}`, cliente: `c${i % clientes.length}`, area,
      parte_contraria: area === 'Previdenciário' ? 'INSS' : area === 'Tributário' ? 'Fazenda Nacional' : escolha(contrarias), vara: `${1 + (i % 9)}ª Vara ${area === 'Trabalhista' ? 'do Trabalho' : area === 'Família' ? 'de Família' : 'Cível'} de Belo Horizonte`,
      fase: i < 15 ? escolha(FASES.slice(0, 5)) : 'Arquivado', valor_causa: Math.round((8000 + r() * 180000) / 100) * 100, responsavel: ADVOGADOS[i % 3][0] };
  });
  const tiposPrazo = [['Contestação', 'Prazo'], ['Réplica', 'Prazo'], ['Recurso de apelação', 'Prazo'], ['Manifestação sobre laudo', 'Prazo'], ['Embargos de declaração', 'Prazo'], ['Audiência de conciliação', 'Audiência'], ['Audiência de instrução', 'Audiência'], ['Reunião com o cliente', 'Reunião']];
  const prazos = [];
  processos.filter((p) => p.fase !== 'Arquivado').forEach((p, i) => {
    for (let k = 0; k < 2; k++) {
      const [titulo, tipo] = escolha(tiposPrazo), d = Math.floor(r() * 24) - 5 + k * 6;
      prazos.push({ titulo, tipo, processo: p.id, data: diaMais(d), hora: tipo === 'Prazo' ? '' : `${9 + Math.floor(r() * 8)}:${r() > 0.5 ? '00' : '30'}`, responsavel: p.responsavel, status: d < -1 ? 'Cumprido' : 'Pendente' });
    }
  });
  const honorarios = [];
  processos.slice(0, 14).forEach((p, i) => {
    const total = Math.round((2500 + r() * 9000) / 100) * 100, parcelas = 1 + (i % 3);
    for (let k = 0; k < parcelas; k++) {
      const venc = diaMais(-40 + k * 30 + Math.floor(r() * 10));
      const st = diasAte(venc) < -5 ? (r() < 0.8 ? 'Recebido' : 'Atrasado') : diasAte(venc) < 0 ? 'Atrasado' : 'A receber';
      honorarios.push({ cliente: p.cliente, processo: p.id, descricao: parcelas > 1 ? `Honorários contratuais · parcela ${k + 1}/${parcelas}` : 'Honorários contratuais', valor: Math.round(total / parcelas), vencimento: venc, status: st });
    }
  });
  honorarios.push({ cliente: 'c1', processo: 'p1', descricao: 'Honorários de êxito (20%)', valor: 14200, vencimento: diaMais(12), status: 'A receber' });
  return { clientes, processos, prazos, honorarios };
}
let cache = null;
const seed = (n) => () => { if (!cache) cache = exemplo(); return cache[n]; };

const colecoes = {
  processos: {
    singular: 'processo', plural: 'processos', seed: seed('processos'),
    subtitulo: (x, app) => `${app.db.obter('clientes', x.cliente)?.nome || ''} × ${x.parte_contraria || ''}`,
    campos: [
      { nome: 'numero', rotulo: 'Número (CNJ)', tipo: 'texto', obrigatorio: true, lista: true, largo: true },
      { nome: 'cliente', rotulo: 'Cliente', tipo: 'relacao', colecao: 'clientes', obrigatorio: true },
      { nome: 'parte_contraria', rotulo: 'Parte contrária', tipo: 'texto' },
      { nome: 'area', rotulo: 'Área', tipo: 'selecao', opcoes: AREAS, obrigatorio: true, lista: true, filtro: true },
      { nome: 'vara', rotulo: 'Vara / tribunal', tipo: 'texto', lista: true, ocultaCel: true },
      { nome: 'fase', rotulo: 'Fase', tipo: 'selecao', opcoes: FASES, obrigatorio: true, lista: true, filtro: true, padrao: 'Inicial', cores: COR_FASE },
      { nome: 'valor_causa', rotulo: 'Valor da causa', tipo: 'moeda', lista: true, ocultaCel: true },
      { nome: 'responsavel', rotulo: 'Responsável', tipo: 'selecao', opcoes: ADVOGADOS, obrigatorio: true, lista: true, filtro: true, exibir: (x) => esc(nomeAdv(x.responsavel)), ocultaCel: true },
    ],
  },
  prazos: {
    singular: 'prazo', plural: 'prazos e audiências', seed: seed('prazos'), botaoNovo: 'Novo prazo ou audiência',
    subtitulo: (x, app) => { const p = app.db.obter('processos', x.processo); return p ? `${p.numero} · ${app.db.obter('clientes', p.cliente)?.nome || ''}` : ''; },
    campos: [
      { nome: 'titulo', rotulo: 'O que é', tipo: 'texto', obrigatorio: true, lista: true, largo: true },
      { nome: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: ['Prazo', 'Audiência', 'Reunião', 'Perícia'], obrigatorio: true, lista: true, filtro: true, padrao: 'Prazo', cores: { 'Audiência': 'acc', Prazo: 'info', 'Reunião': '', 'Perícia': 'al' } },
      { nome: 'processo', rotulo: 'Processo', tipo: 'relacao', colecao: 'processos', mostrar: 'numero', obrigatorio: true },
      { nome: 'data', rotulo: 'Data', tipo: 'data', obrigatorio: true, lista: true, padrao: () => diaMais(5), exibir: (x) => `${dataBR(x.data)}${x.hora ? ` · ${esc(x.hora)}` : ''} ${urgencia(x)}` },
      { nome: 'hora', rotulo: 'Hora (audiência)', tipo: 'hora' },
      { nome: 'responsavel', rotulo: 'Responsável', tipo: 'selecao', opcoes: ADVOGADOS, obrigatorio: true, lista: true, filtro: true, exibir: (x) => esc(nomeAdv(x.responsavel)), ocultaCel: true },
      { nome: 'status', rotulo: 'Situação', tipo: 'selecao', opcoes: ['Pendente', 'Cumprido'], obrigatorio: true, filtro: true, padrao: 'Pendente' },
    ],
  },
  clientes: {
    singular: 'cliente', plural: 'clientes', seed: seed('clientes'),
    subtitulo: (x) => `${x.tipo === 'PJ' ? 'CNPJ' : 'CPF'} ${x.documento || ''}`,
    campos: [
      { nome: 'nome', rotulo: 'Nome / razão social', tipo: 'texto', obrigatorio: true, lista: true, largo: true },
      { nome: 'tipo', rotulo: 'Pessoa', tipo: 'selecao', opcoes: [['PF', 'Física'], ['PJ', 'Jurídica']], obrigatorio: true, lista: true, filtro: true, padrao: 'PF' },
      { nome: 'documento', rotulo: 'CPF / CNPJ', tipo: 'texto' },
      { nome: 'telefone', rotulo: 'Telefone', tipo: 'tel', lista: true },
      { nome: 'email', rotulo: 'E-mail', tipo: 'email', lista: true, ocultaCel: true },
      { nome: 'qtd', rotulo: 'Processos', tipo: 'numero', somenteLista: true, lista: true, exibir: (x, app) => String(app.db.lista('processos').filter((p) => p.cliente === x.id && p.fase !== 'Arquivado').length) },
    ],
  },
  honorarios: {
    singular: 'lançamento', plural: 'honorários', seed: seed('honorarios'), botaoNovo: 'Novo honorário',
    subtitulo: (x, app) => app.db.obter('clientes', x.cliente)?.nome || '',
    campos: [
      { nome: 'descricao', rotulo: 'Descrição', tipo: 'texto', obrigatorio: true, lista: true, largo: true },
      { nome: 'cliente', rotulo: 'Cliente', tipo: 'relacao', colecao: 'clientes', obrigatorio: true },
      { nome: 'processo', rotulo: 'Processo', tipo: 'relacao', colecao: 'processos', mostrar: 'numero' },
      { nome: 'valor', rotulo: 'Valor', tipo: 'moeda', obrigatorio: true, lista: true },
      { nome: 'vencimento', rotulo: 'Vencimento', tipo: 'data', obrigatorio: true, lista: true, padrao: () => diaMais(30) },
      { nome: 'status', rotulo: 'Situação', tipo: 'selecao', opcoes: ['A receber', 'Recebido', 'Atrasado'], obrigatorio: true, lista: true, filtro: true, padrao: 'A receber', cores: { Recebido: 'ok', Atrasado: 'er', 'A receber': 'info' } },
    ],
  },
};

const pendentes = (app) => app.db.lista('prazos').filter((p) => p.status !== 'Cumprido');

function painel(app) {
  const pr = pendentes(app), proc = app.db.lista('processos').filter((p) => p.fase !== 'Arquivado'), h = app.db.lista('honorarios');
  const semana = pr.filter((p) => diasAte(p.data) >= 0 && diasAte(p.data) <= 7).sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')));
  const vencidos = pr.filter((p) => diasAte(p.data) < 0);
  const aReceber = h.filter((x) => x.status !== 'Recebido').reduce((s, x) => s + x.valor, 0), atrasado = h.filter((x) => x.status === 'Atrasado').reduce((s, x) => s + x.valor, 0);
  const recebidoMes = h.filter((x) => x.status === 'Recebido' && x.vencimento.slice(0, 7) === hoje().slice(0, 7)).reduce((s, x) => s + x.valor, 0);
  const porArea = AREAS.map((a) => ({ a, n: proc.filter((p) => p.area === a).length })).filter((x) => x.n);
  const meses = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 4 + i); return d.toISOString().slice(0, 7); });
  return `${vencidos.length ? `<div class="cartao" style="border-color:var(--er);background:var(--er-s);padding:12px 16px"><b style="color:#b42318">⚠ ${vencidos.length} prazo(s) vencido(s) sem baixa.</b> <a href="#/prazos">Revisar agora</a></div>` : ''}
    <div class="kpis">
      ${kpi({ icone: '§', rotulo: 'Processos ativos', valor: proc.length, nota: `${app.db.lista('clientes').length} clientes` })}
      ${kpi({ icone: '◷', rotulo: 'Prazos em 7 dias', valor: semana.filter((p) => p.tipo === 'Prazo').length, tom: 'al', nota: `${semana.filter((p) => p.tipo === 'Audiência').length} audiências na semana` })}
      ${kpi({ icone: '$', rotulo: 'Honorários a receber', valor: moeda(aReceber), tom: atrasado ? 'er' : '', nota: atrasado ? `${moeda(atrasado)} em atraso` : 'nada em atraso' })}
      ${kpi({ icone: '✓', rotulo: 'Recebido no mês', valor: moeda(recebidoMes), tom: 'ok' })}
    </div>
    <div class="grade g-21">
      ${cartao('Próximos 7 dias', semana.length ? `<ul class="lista-simples">${semana.map((p) => { const pc = app.db.obter('processos', p.processo); return `<li><span class="avatar" style="${p.tipo === 'Audiência' ? 'background:var(--acc-suave)' : 'background:var(--info-s);color:#175cd3'}">${p.tipo === 'Audiência' ? '⚖' : '§'}</span><div><b>${esc(p.titulo)}</b><div class="muted" style="font-size:12.5px">${esc(app.db.obter('clientes', pc?.cliente)?.nome || '')} · ${esc(nomeAdv(p.responsavel))}</div></div><div class="dir"><div style="font-size:12.5px">${dataBR(p.data)}${p.hora ? ` ${esc(p.hora)}` : ''}</div>${urgencia(p)}</div></li>`; }).join('')}</ul>` : '<div class="vazio">Nada nos próximos 7 dias.</div>', { acoes: '<a class="btn peq" href="#/prazos">Todos os prazos</a>' })}
      ${cartao('Processos por área', porArea.map((x) => `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:13px"><span>${esc(x.a)}</span><b>${x.n}</b></div><div style="margin-top:5px">${progresso((x.n / Math.max(...porArea.map((y) => y.n))) * 100)}</div></div>`).join(''))}
    </div>
    ${cartao('Honorários', graficoBarras({ dados: meses.map((m) => ({ rotulo: new Date(`${m}-15`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), valores: [h.filter((x) => x.status === 'Recebido' && x.vencimento.startsWith(m)).reduce((s, x) => s + x.valor, 0), h.filter((x) => x.status !== 'Recebido' && x.vencimento.startsWith(m)).reduce((s, x) => s + x.valor, 0)] })),
      series: [{ nome: 'Recebido', cor: 'var(--acc)' }, { nome: 'A receber / atrasado', cor: '#cbd5e1' }], formato: (v) => `R$ ${(v / 1000).toFixed(0)}k` }), { sub: 'por mês de vencimento' })}`;
}

function semanaPagina(app) {
  const dias = Array.from({ length: 7 }, (_, i) => diaMais(i));
  const pr = pendentes(app);
  return `<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">${dias.map((d) => { const l = pr.filter((p) => p.data === d).sort((a, b) => (a.hora || '').localeCompare(b.hora || '')); return `<div class="cartao"><div class="cartao-cab"><div><h2 style="text-transform:capitalize">${new Date(`${d}T12:00`).toLocaleDateString('pt-BR', { weekday: 'long' })}</h2><div class="sub">${dataBR(d)}</div></div></div><div class="cartao-corpo">${l.length ? l.map((p) => `<div style="padding:8px 10px;margin-bottom:8px;border-radius:8px;background:${p.tipo === 'Audiência' ? 'var(--acc-suave)' : 'var(--sup2)'}"><b style="font-size:13px">${p.hora ? `${esc(p.hora)} · ` : ''}${esc(p.titulo)}</b><div class="muted" style="font-size:12px">${esc(app.db.obter('clientes', app.db.obter('processos', p.processo)?.cliente)?.nome || '')}</div><div class="muted" style="font-size:12px">${esc(nomeAdv(p.responsavel))}</div></div>`).join('') : '<span class="muted">Livre</span>'}</div></div>`; }).join('')}</div>`;
}

const app = criarApp({
  id: 'juridico', nome: 'Nexo Jurídico', sub: 'Advocacia', cor: '#0f766e', inicial: 'J', empresa: 'Castro & Moura Advogados', empresaSub: '3 advogados · Belo Horizonte/MG',
  produto: { compra: 2990, mensal: 149 },
  colecoes,
  menu: [
    { grupo: 'Escritório' },
    { id: 'painel', rotulo: 'Painel', icone: '◧', titulo: 'Painel do escritório', sub: () => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }), pagina: painel },
    { id: 'semana', rotulo: 'Agenda da semana', icone: '▦', titulo: 'Agenda da semana', pagina: semanaPagina },
    { id: 'prazos', rotulo: 'Prazos e audiências', icone: '◷', crud: 'prazos', opcoes: { ordem: 'data', acoesExtra: (p) => (p.status === 'Cumprido' ? '' : `<button type="button" class="btn peq" data-acao="cumprir" data-id="${p.id}">Dar baixa</button>`) },
      contador: (a) => pendentes(a).filter((p) => diasAte(p.data) <= 1).length },
    { id: 'processos', rotulo: 'Processos', icone: '§', crud: 'processos' },
    { id: 'clientes', rotulo: 'Clientes', icone: '☺', crud: 'clientes', opcoes: { ordem: 'nome' } },
    { grupo: 'Financeiro' },
    { id: 'honorarios', rotulo: 'Honorários', icone: '$', crud: 'honorarios', opcoes: { ordem: 'vencimento', total: (l) => moeda(l.reduce((s, x) => s + (x.valor || 0), 0)), acoesExtra: (h) => (h.status === 'Recebido' ? '' : `<button type="button" class="btn peq" data-acao="receber" data-id="${h.id}">Recebido</button>`) },
      contador: (a) => a.db.lista('honorarios').filter((h) => h.status === 'Atrasado').length },
  ],
});
app.acoes = {
  cumprir: (id) => { app.db.salvar('prazos', { id, status: 'Cumprido' }); avisar('Prazo cumprido'); },
  receber: (id) => { app.db.salvar('honorarios', { id, status: 'Recebido' }); avisar('Honorário recebido'); },
};
