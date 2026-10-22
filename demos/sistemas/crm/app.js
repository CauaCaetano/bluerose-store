// Veltria CRM · funil de vendas (referências: Pipedrive, Attio, HubSpot)
import {
  criarApp, esc, moeda, moedaC, num, pct, hoje, agoraISO, diaMais, mesMais, nomeMes, dataCurta, dataHoraBR, relativo, horaBR, diasAte, diasEntre, iniciais,
  sorteio, soma, agrupar, av, ic, et, prog, telLink, kpis, barras, linhas, rosca, barrasH, funilH, kanban, calGrade, DIAS, paraData,
  modal, confirmar, avisar, editar, excluir, ficha, props, linhaDoTempo, vazio, pop, imprimir,
} from '../base/nexo.js';
import { LADOS as FERR, ITENS as FERR_ITENS } from './ferramentas.js';
import { acoesLado, ferramentaPaginas, travarPro } from '../base/lado.js';
import { equipeViva, paginaEquipe } from '../base/equipe-viva.js';

const ETAPAS = [
  { id: 'contato', nome: 'Contato feito', prob: 10, rot: 7, cor: '#a5b4fc' },
  { id: 'qualificado', nome: 'Qualificado', prob: 25, rot: 10, cor: '#818cf8' },
  { id: 'demo', nome: 'Demonstração', prob: 45, rot: 10, cor: '#6366f1' },
  { id: 'proposta', nome: 'Proposta enviada', prob: 65, rot: 12, cor: '#4f46e5' },
  { id: 'negociacao', nome: 'Negociação', prob: 85, rot: 14, cor: '#4338ca' },
];
const etapa = (id) => ETAPAS.find((e) => e.id === id) || ETAPAS[0];
const VEND = [['ana', 'Ana Ribeiro', 'Gerente comercial'], ['bruno', 'Bruno Lacerda', 'Executivo de vendas'], ['carla', 'Carla Menezes', 'Executiva de vendas']];
const EQUIPE = { colecao: 'vendedores', rot: 'Vendedores', icone: 'users-three', singular: 'vendedor', plural: 'vendedores', vazio: 'a equipe de vendas', lista: VEND,
  campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true }, { nome: 'cargo', rotulo: 'Cargo', tipo: 'texto' }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel' }],
  linha: (r) => [r.id, r.nome, r.cargo || ''], registro: ([id, nome, cargo]) => ({ id, nome, cargo }) };
const padraoEquipe = (eu) => (VEND.find((x) => x[0] === eu) || VEND[0] || [''])[0];
const nomeV = (id) => (VEND.find((v) => v[0] === id) || [, '—'])[1];
const EU = 'ana';
const ORIGENS = ['Site', 'Indicação', 'Instagram', 'Google Ads', 'Evento', 'Prospecção ativa', 'LinkedIn'];
const MOTIVOS = ['Preço acima do orçamento', 'Escolheu concorrente', 'Sem orçamento agora', 'Parou de responder', 'Projeto adiado', 'Não era o perfil'];
const TIPOS = { ligacao: ['Ligação', 'phone'], reuniao: ['Reunião', 'users'], email: ['E-mail', 'envelope-simple'], whatsapp: ['WhatsApp', 'whatsapp-logo'], tarefa: ['Tarefa', 'check-square'], visita: ['Visita', 'map-pin'] };
const COR_TIPO = { ligacao: '#0ea5e9', reuniao: '#6366f1', email: '#64748b', whatsapp: '#22a06b', tarefa: '#d97706', visita: '#e11d48' };

// ---------------------------------------------------------------- dados de exemplo (fictícios)
function semente() {
  const r = sorteio(20261011), esc1 = (l) => l[Math.floor(r() * l.length)], ent = (a, b) => a + Math.floor(r() * (b - a + 1));
  const produtos = [
    ['Licença Veltria Pro (anual)', 'LIC-PRO', 4800], ['Licença Veltria Equipe (anual)', 'LIC-EQ', 9600], ['Implantação e migração', 'IMP-01', 3500],
    ['Treinamento da equipe (8 h)', 'TRE-08', 1600], ['Consultoria de processos (mês)', 'CON-M', 2900], ['Integração com ERP', 'INT-ERP', 6200], ['Suporte prioritário (anual)', 'SUP-P', 2400],
  ].map(([nome, codigo, preco]) => ({ nome, codigo, preco }));
  const empresas = [
    ['Atlas Distribuidora', 'Distribuição', 'Curitiba/PR', 48], ['Clínica Sorriso Pleno', 'Saúde', 'Campinas/SP', 22], ['Moura & Castro Advogados', 'Jurídico', 'Belo Horizonte/MG', 15],
    ['Padaria Trigo Bom', 'Alimentação', 'Londrina/PR', 31], ['Studio Bella Forma', 'Estética', 'Florianópolis/SC', 12], ['Construtora Horizonte', 'Construção', 'Goiânia/GO', 140],
    ['Auto Center Rota 116', 'Automotivo', 'Joinville/SC', 26], ['Escola Pequeno Saber', 'Educação', 'Recife/PE', 64], ['Mercado Bom Preço', 'Varejo', 'Fortaleza/CE', 85],
    ['TechNorte Soluções', 'Tecnologia', 'Manaus/AM', 38], ['Farmácia Vida Plena', 'Saúde', 'Salvador/BA', 54], ['Pet Shop Amigo Fiel', 'Varejo', 'Porto Alegre/RS', 9],
    ['Grupo Alvorada Hotéis', 'Hotelaria', 'Natal/RN', 210], ['Laticínios Serra Verde', 'Indústria', 'Juiz de Fora/MG', 120], ['Ótica Visão Clara', 'Varejo', 'Vitória/ES', 18],
  ].map(([nome, segmento, cidade, func], i) => ({ id: `e${i}`, nome, segmento, cidade, funcionarios: func, telefone: `(${41 + (i % 50)}) 3${210 + i * 7}-${1100 + i * 37}`, site: `${nome.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '').slice(0, 16)}.com.br`, dono: VEND[i % 3][0] }));
  const pessoas = ['Mariana Costa', 'Rafael Nunes', 'Juliana Prado', 'Diego Martins', 'Patrícia Lima', 'Gustavo Rocha', 'Fernanda Alves', 'Thiago Barros', 'Camila Duarte', 'Lucas Teixeira', 'Renata Souza', 'Eduardo Pires', 'Beatriz Gomes', 'André Farias', 'Larissa Moreira', 'Henrique Campos', 'Vanessa Ramos', 'Otávio Mendes', 'Sabrina Lopes', 'Igor Carvalho'];
  const cargos = ['Sócio(a)-diretor(a)', 'Gerente geral', 'Diretor(a) comercial', 'Gerente de compras', 'Coordenador(a) administrativo', 'Proprietário(a)', 'Gerente de TI'];
  const contatos = pessoas.map((nome, i) => { const em = empresas[i % empresas.length]; return { id: `c${i}`, nome, empresa: em.id, cargo: esc1(cargos), email: `${nome.split(' ')[0].toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}@${em.site}`, telefone: `(${41 + (i % 50)}) 9${8100 + i * 13}-${2000 + i * 41}`, origem: esc1(ORIGENS), dono: em.dono }; });
  const titulos = ['Licenças para a equipe', 'Implantação completa', 'Expansão para filial', 'Renovação anual', 'Integração com ERP', 'Projeto piloto', 'Treinamento e licenças', 'Migração de sistema'];
  const negocios = [];
  const abrir = [['contato', 5], ['qualificado', 5], ['demo', 4], ['proposta', 4], ['negociacao', 3]];
  let k = 0;
  const novoNeg = (status, etapaId, i) => {
    const c = contatos[(k * 7 + 3) % contatos.length]; const em = empresas.find((e) => e.id === c.empresa);
    const itens = Array.from({ length: ent(1, 3) }, () => { const p = produtos[ent(0, produtos.length - 1)]; return { produto: p.nome, qtd: p.codigo.startsWith('LIC') ? ent(1, 4) : 1, preco: p.preco, desc: [0, 0, 5, 10][ent(0, 3)] }; });
    const valor = Math.round(soma(itens, (x) => x.qtd * x.preco * (1 - x.desc / 100)));
    const criado = diaMais(-ent(8, 70));
    const n = { id: `n${k}`, titulo: `${esc1(titulos)} · ${em.nome.split(' ').filter((w) => w !== '&').slice(0, 2).join(' ')}`, empresa: em.id, contato: c.id, valor, itens, etapa: etapaId, status, responsavel: VEND[k % 3][0], origem: c.origem, criado, etapa_desde: diaMais(-ent(1, 18)), previsao: diaMais(ent(-3, 60)) };
    if (status === 'ganho') { n.fechado = diaMais(-ent(0, 150)); n.etapa = 'negociacao'; if (i < 6) n.fechado = diaMais(-ent(0, Math.max(0, new Date().getDate() - 1))); n.previsao = n.fechado; }
    if (status === 'perdido') { n.fechado = diaMais(-ent(2, 140)); n.motivo = esc1(MOTIVOS); n.etapa = esc1(['qualificado', 'demo', 'proposta', 'negociacao']); }
    k++; negocios.push(n); return n;
  };
  for (const [et_, q] of abrir) for (let i = 0; i < q; i++) novoNeg('aberto', et_, i);
  for (let i = 0; i < 22; i++) novoNeg('ganho', 'negociacao', i);
  for (let i = 0; i < 11; i++) novoNeg('perdido', 'demo', i);
  const textos = { ligacao: ['Ligar para alinhar proposta', 'Retornar sobre o orçamento', 'Ligação de qualificação'], reuniao: ['Reunião de apresentação', 'Demonstração do sistema', 'Reunião com a diretoria'], email: ['Enviar proposta revisada', 'Mandar estudo de caso', 'Enviar contrato para assinatura'], whatsapp: ['Confirmar reunião pelo WhatsApp', 'Mandar resumo da conversa'], tarefa: ['Preparar proposta', 'Montar apresentação personalizada'], visita: ['Visita na sede do cliente'] };
  const atividades = [];
  negocios.filter((n) => n.status === 'aberto').forEach((n, i) => {
    if (i % 6 !== 5) { const tipo = esc1(Object.keys(textos)); const d = [-3, -1, 0, 0, 0, 1, 2, 3, 5, 8][i % 10]; atividades.push({ tipo, titulo: esc1(textos[tipo]), negocio: n.id, contato: n.contato, responsavel: n.responsavel, quando: `${diaMais(d)}T${String(ent(9, 17)).padStart(2, '0')}:${esc1(['00', '30'])}`, duracao: tipo === 'reuniao' || tipo === 'visita' ? 60 : 30, feita: false }); }
    for (let j = 0; j < ent(1, 3); j++) { const tipo = esc1(Object.keys(textos)); atividades.push({ tipo, titulo: esc1(textos[tipo]), negocio: n.id, contato: n.contato, responsavel: n.responsavel, quando: `${diaMais(-ent(2, 30))}T${String(ent(9, 17)).padStart(2, '0')}:00`, duracao: 30, feita: true, resultado: esc1(['Cliente pediu ajuste no prazo', 'Gostou da demonstração', 'Vai levar para o sócio', 'Pediu desconto à vista', '']) }); }
  });
  const notas = negocios.filter((n) => n.status === 'aberto').slice(0, 14).map((n, i) => ({ alvo: `negocios:${n.id}`, texto: ['Decisor é o sócio. Prefere reunião presencial às terças.', 'Usa planilha hoje e perde pedidos no fim do mês. Dor principal: previsibilidade.', 'Pediu proposta com pagamento em 3x. Concorrente cobrou 20% a mais.', 'Quer começar pela filial de Joinville e depois expandir.', 'Orçamento aprovado para o próximo trimestre.'][i % 5], autor: n.responsavel, quando: `${diaMais(-ent(1, 12))}T${String(ent(9, 18)).padStart(2, '0')}:15` }));
  const ym = hoje().slice(0, 7);
  const metas = VEND.flatMap(([id], i) => [-2, -1, 0, 1].map((m) => ({ vendedor: id, mes: mesMais(m, `${ym}-15`), valor: [60000, 45000, 50000][i] })));
  return { _cfg: { empresa: 'Solar Sistemas Ltda' }, produtos, empresas, contatos, negocios, atividades, notas, metas };
}

// ---------------------------------------------------------------- regras
const abertos = (a) => a.db.lista('negocios').filter((n) => n.status === 'aberto');
const ganhos = (a) => a.db.lista('negocios').filter((n) => n.status === 'ganho');
const perdidos = (a) => a.db.lista('negocios').filter((n) => n.status === 'perdido');
const doMes = (s, ym = hoje().slice(0, 7)) => String(s || '').startsWith(ym);
const empresaDe = (a, id) => a.db.obter('empresas', id);
const contatoDe = (a, id) => a.db.obter('contatos', id);
const proxAtiv = (a, n) => a.db.lista('atividades').filter((x) => x.negocio === n.id && !x.feita).sort((x, y) => x.quando.localeCompare(y.quando))[0];
const ultimaAtiv = (a, n) => a.db.lista('atividades').filter((x) => x.negocio === n.id && x.feita).sort((x, y) => y.quando.localeCompare(x.quando))[0];
function estadoAtiv(a, n) { const p = proxAtiv(a, n); if (!p) return ['nenhuma', 'warning', 'Sem próxima atividade agendada']; const d = diasAte(p.quando); return d < 0 ? ['atrasada', 'clock', `Atrasada: ${p.titulo}`] : d === 0 ? ['hoje', 'clock', `Hoje às ${horaBR(p.quando)}: ${p.titulo}`] : ['futura', 'clock', `${relativo(p.quando)}: ${p.titulo}`]; }
const diasParado = (a, n) => { const u = ultimaAtiv(a, n); const ref = [n.etapa_desde, u?.quando?.slice(0, 10)].filter(Boolean).sort().pop(); return -diasAte(ref || n.criado); };
const parado = (a, n) => n.status === 'aberto' && diasParado(a, n) > etapa(n.etapa).rot;
const ponderado = (n) => n.valor * (etapa(n.etapa).prob / 100);
const metaDe = (a, v, ym = hoje().slice(0, 7)) => a.db.lista('metas').find((m) => m.vendedor === v && m.mes === ym)?.valor || 0;
const vendidoMes = (a, ym = hoje().slice(0, 7), v = null) => soma(ganhos(a).filter((n) => doMes(n.fechado, ym) && (!v || n.responsavel === v)), (n) => n.valor);
const totalItens = (itens) => Math.round(soma(itens || [], (x) => x.qtd * x.preco * (1 - (x.desc || 0) / 100)));
const indAtiv = (a, n) => { const [cls, icone, t] = estadoAtiv(a, n); return `<span class="ind-ativ ${cls}" title="${esc(t)}">${ic(icone)}</span>`; };
const etStatus = (n) => (n.status === 'ganho' ? et('Ganho', 'ok') : n.status === 'perdido' ? et('Perdido', 'er') : et(etapa(n.etapa).nome, 'acc'));

// ---------------------------------------------------------------- coleções (formulários)
const numProposta = (id) => String(Math.abs(String(id).split('').reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7)) % 9000 + 1000);
const CONDICOES = 'Pagamento em até 3x no boleto ou PIX à vista. Implantação em até 10 dias úteis após o aceite. Suporte por e-mail e WhatsApp em horário comercial.';
const SEQUENCIAS = {
  posproposta: ['Depois da proposta', [[1, 'whatsapp', 'Perguntar se a proposta chegou e tirar dúvidas'], [3, 'ligacao', 'Ligar para entender a decisão'], [7, 'email', 'Enviar caso de sucesso parecido'], [12, 'ligacao', 'Última conversa antes de a proposta vencer']]],
  leadnovo: ['Contato novo', [[0, 'ligacao', 'Primeira ligação de qualificação'], [2, 'whatsapp', 'Mandar apresentação curta'], [5, 'email', 'Enviar material e convite para reunião'], [10, 'ligacao', 'Nova tentativa de contato']]],
  reativar: ['Reativar cliente parado', [[0, 'whatsapp', 'Mensagem de reaproximação'], [4, 'ligacao', 'Ligar para entender o momento'], [14, 'email', 'Enviar novidade ou condição especial']]],
};

const colecoes = {
  negocios: {
    singular: 'negócio', plural: 'negócios', largura: 640,
    campos: [
      { nome: 'titulo', rotulo: 'Título do negócio', tipo: 'texto', obrigatorio: true, largo: true, dica: 'Ex.: Licenças para a equipe · Atlas' },
      { nome: 'empresa', rotulo: 'Empresa', tipo: 'relacao', colecao: 'empresas', obrigatorio: true },
      { nome: 'contato', rotulo: 'Pessoa de contato', tipo: 'relacao', colecao: 'contatos' },
      { nome: 'valor', rotulo: 'Valor', tipo: 'moeda', obrigatorio: true, ajuda: 'Se você incluir produtos, o valor é calculado por eles' },
      { nome: 'previsao', rotulo: 'Previsão de fechamento', tipo: 'data', padrao: () => diaMais(21) },
      { nome: 'etapa', rotulo: 'Etapa', tipo: 'selecao', opcoes: ETAPAS.map((e) => [e.id, e.nome]), obrigatorio: true, padrao: 'contato' },
      { nome: 'responsavel', rotulo: 'Responsável', tipo: 'selecao', opcoes: () => VEND.map((v) => [v[0], v[1]]), get obrigatorio() { return VEND.length > 0; }, padrao: () => padraoEquipe(EU) },
      { nome: 'origem', rotulo: 'Origem', tipo: 'selecao', opcoes: ORIGENS },
    ],
    antesDeSalvar: (d, a, antes) => ({ ...d, status: antes?.status || 'aberto', etapa_desde: !antes || antes.etapa !== d.etapa ? hoje() : antes.etapa_desde, criado: antes?.criado || hoje(), itens: antes?.itens || [] }),
  },
  contatos: {
    singular: 'pessoa', genero: 'f', plural: 'pessoas',
    campos: [
      { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true },
      { nome: 'empresa', rotulo: 'Empresa', tipo: 'relacao', colecao: 'empresas' },
      { nome: 'cargo', rotulo: 'Cargo', tipo: 'texto' },
      { nome: 'email', rotulo: 'E-mail', tipo: 'email' },
      { nome: 'telefone', rotulo: 'Telefone / WhatsApp', tipo: 'tel' },
      { nome: 'origem', rotulo: 'Origem', tipo: 'selecao', opcoes: ORIGENS },
      { nome: 'dono', rotulo: 'Responsável', tipo: 'selecao', opcoes: () => VEND.map((v) => [v[0], v[1]]), padrao: () => padraoEquipe(EU) },
    ],
  },
  empresas: {
    singular: 'empresa', genero: 'f', plural: 'empresas',
    campos: [
      { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true },
      { nome: 'segmento', rotulo: 'Segmento', tipo: 'texto' },
      { nome: 'cidade', rotulo: 'Cidade/UF', tipo: 'texto' },
      { nome: 'funcionarios', rotulo: 'Funcionários', tipo: 'numero', min: 0 },
      { nome: 'telefone', rotulo: 'Telefone', tipo: 'tel' },
      { nome: 'site', rotulo: 'Site', tipo: 'texto' },
      { nome: 'dono', rotulo: 'Responsável', tipo: 'selecao', opcoes: () => VEND.map((v) => [v[0], v[1]]), padrao: () => padraoEquipe(EU) },
    ],
  },
  atividades: {
    singular: 'atividade', genero: 'f', plural: 'atividades',
    campos: [
      { nome: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: Object.entries(TIPOS).map(([k, [n]]) => [k, n]), obrigatorio: true, padrao: 'ligacao' },
      { nome: 'titulo', rotulo: 'Assunto', tipo: 'texto', obrigatorio: true },
      { nome: 'quando', rotulo: 'Quando', tipo: 'datahora', obrigatorio: true, padrao: () => `${diaMais(1)}T10:00` },
      { nome: 'duracao', rotulo: 'Duração (min)', tipo: 'numero', padrao: 30, min: 5 },
      { nome: 'negocio', rotulo: 'Negócio', tipo: 'relacao', colecao: 'negocios', mostrar: 'titulo', filtrar: (n) => n.status === 'aberto' },
      { nome: 'responsavel', rotulo: 'Responsável', tipo: 'selecao', opcoes: () => VEND.map((v) => [v[0], v[1]]), get obrigatorio() { return VEND.length > 0; }, padrao: () => padraoEquipe(EU) },
      { nome: 'nota', rotulo: 'Observação', tipo: 'texto-longo', dica: 'Pauta, contexto, o que levar…' },
    ],
    antesDeSalvar: (d, a) => ({ ...d, feita: d.feita ?? false, contato: d.contato || a.db.obter('negocios', d.negocio)?.contato }),
  },
  produtos: { singular: 'produto', plural: 'produtos', campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'codigo', rotulo: 'Código', tipo: 'texto' }, { nome: 'preco', rotulo: 'Preço', tipo: 'moeda', obrigatorio: true }] },
};

// ---------------------------------------------------------------- páginas
function inicio(a) {
  const ym = hoje().slice(0, 7), ab = abertos(a), at = a.db.lista('atividades').filter((x) => !x.feita);
  const meus = ab.filter((n) => n.responsavel === EU);
  const vend = vendidoMes(a), metaT = soma(VEND, ([v]) => metaDe(a, v));
  const ant = vendidoMes(a, mesMais(-1));
  const hojeL = at.filter((x) => diasAte(x.quando) === 0).sort((x, y) => x.quando.localeCompare(y.quando));
  const atras = at.filter((x) => diasAte(x.quando) < 0);
  const par = ab.filter((n) => parado(a, n)).sort((x, y) => diasParado(a, y) - diasParado(a, x));
  const semAtiv = ab.filter((n) => !proxAtiv(a, n));
  const spark = Array.from({ length: 6 }, (_, i) => vendidoMes(a, mesMais(i - 5)));
  const hora = new Date().getHours();
  const linhaAtiv = (x) => { const n = a.db.obter('negocios', x.negocio); const [nomeT, icone] = TIPOS[x.tipo] || TIPOS.tarefa; const d = diasAte(x.quando);
    return `<li><input type="checkbox" data-mudar="concluirAtiv" data-id="${x.id}" aria-label="Concluir"><span class="av" style="background:${COR_TIPO[x.tipo]}">${ic(icone, 'p')}</span><div class="cresce"><div class="t corta">${esc(x.titulo)}</div><div class="s corta">${n ? `<a href="javascript:void 0" data-abrir="negocio:${n.id}">${esc(n.titulo)}</a>` : esc(nomeT)}</div></div><div class="dir"><div class="${d < 0 ? 'er-tx' : ''}" style="font-size:12.5px">${d < 0 ? relativo(x.quando.slice(0, 10)) : horaBR(x.quando)}</div><div class="s">${esc(nomeV(x.responsavel).split(' ')[0])}</div></div></li>`; };
  return `<div class="cab-pag"><div><h2>${hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'}, Ana</h2><p>${esc(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))} · ${hojeL.length} atividades hoje${atras.length ? `, ${atras.length} atrasadas` : ''}</p></div>
      <div class="flex"><button type="button" class="btn" data-acao="novaAtividade">${ic('calendar-plus')}Agendar atividade</button><button type="button" class="btn pri" data-acao="novoNegocio">${ic('plus')}Novo negócio</button></div></div>
    ${kpis([
      { rot: 'Vendido em ' + nomeMes(ym, true).split(' ')[0], icone: 'trophy', val: moeda(vend), var: ant ? ((vend - ant) / ant) * 100 : null, nota: `${pct((vend / (metaT || 1)) * 100)} da meta de ${moedaC(metaT)}`, spark },
      { rot: 'Em negociação', icone: 'funnel', val: moeda(soma(ab, (n) => n.valor)), nota: `${ab.length} negócios · ${moedaC(soma(ab, ponderado))} ponderado` },
      { rot: 'Taxa de ganho (90 dias)', icone: 'target', val: (() => { const g = ganhos(a).filter((n) => diasAte(n.fechado) > -90).length, p = perdidos(a).filter((n) => diasAte(n.fechado) > -90).length; return pct((g / (g + p || 1)) * 100); })(), nota: 'negócios ganhos ÷ fechados' },
      { rot: 'Precisam de atenção', icone: 'warning', val: num(par.length + semAtiv.length), alerta: par.length + semAtiv.length > 0, nota: `${par.length} parados · ${semAtiv.length} sem próxima atividade` },
    ])}
    <div class="grade g21">
      <div class="cartao"><div class="cartao-cab"><div><h3>Sua agenda</h3><div class="sub">Atividades de hoje e atrasadas da equipe</div></div><a class="btn peq" href="#/atividades">Ver todas</a></div>
        ${atras.length + hojeL.length ? `<ul class="lista">${[...atras.sort((x, y) => x.quando.localeCompare(y.quando)), ...hojeL].slice(0, 9).map(linhaAtiv).join('')}</ul>` : vazio('check-circle', 'Nada pendente para hoje', 'Aproveite para prospectar.')}</div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Meta do mês</h3><div class="sub">${esc(nomeMes(ym, true))}</div></div><a class="btn peq" href="#/metas">Ajustar</a></div><div class="cartao-corpo col" style="gap:14px">
        ${VEND.map(([id, nome]) => { const v = vendidoMes(a, ym, id), m = metaDe(a, id); const p = (v / (m || 1)) * 100; return `<div><div class="entre" style="font-size:13px"><span class="flex">${av(nome, 'p')}${esc(nome)}</span><b class="num">${moedaC(v)}</b></div><div style="margin:6px 0 3px">${prog(p, p >= 100 ? 'ok' : '')}</div><small class="mute">${pct(p)} de ${moedaC(m)}</small></div>`; }).join('')}</div></div>
    </div>
    <div class="grade g2">
      <div class="cartao"><div class="cartao-cab"><div><h3>Negócios parados</h3><div class="sub">Sem movimento além do prazo da etapa</div></div><a class="btn peq" href="#/funil">Abrir funil</a></div>
        ${par.length ? `<ul class="lista">${par.slice(0, 6).map((n) => `<li class="clicavel" data-abrir="negocio:${n.id}">${av(empresaDe(a, n.empresa)?.nome || '?')}<div class="cresce"><div class="t corta">${esc(n.titulo)}</div><div class="s">${esc(etapa(n.etapa).nome)} · ${esc(nomeV(n.responsavel))}</div></div><div class="dir"><div class="num" style="font-weight:550">${moedaC(n.valor)}</div><div class="s er-tx">parado há ${diasParado(a, n)} dias</div></div></li>`).join('')}</ul>` : vazio('check-circle', 'Nenhum negócio parado')}</div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Funil agora</h3><div class="sub">Valor por etapa e chance de fechar</div></div></div><div class="cartao-corpo">
        ${funilH(ETAPAS.map((e) => { const l = ab.filter((n) => n.etapa === e.id); return { rot: e.nome, v: soma(l, (n) => n.valor), r: `${l.length} · ${e.prob}%` }; }), { fmt: moedaC })}</div></div>
    </div>`;
}

function funil(a) {
  const st = a.estado.funil ||= { vend: '' };
  const ns = abertos(a).filter((n) => !st.vend || n.responsavel === st.vend);
  a.kanbans.funil = (id, et_) => {
    const n = a.db.obter('negocios', id); if (!n || n.etapa === et_) return;
    const de = etapa(n.etapa).nome;
    a.db.salvar('negocios', { id, etapa: et_, etapa_desde: hoje() });
    a.db.registrar(`negocios:${id}`, `Etapa: ${de} → ${etapa(et_).nome}`, { icone: 'arrow-right', tom: 'acc' });
    avisar(`${n.titulo} → ${etapa(et_).nome}`, { desfazer: () => { a.db.salvar('negocios', { id, etapa: n.etapa, etapa_desde: n.etapa_desde }); a.render(); } });
  };
  a.kanbans['funil:abrir'] = (id) => a.abrir('negocio', id);
  const tot = soma(ns, (n) => n.valor);
  return `<div class="entre" style="flex-wrap:wrap">
      <div class="grupo-btn" role="group" aria-label="Responsável"><button type="button" data-acao="filtroVend" data-v="" aria-pressed="${!st.vend}">Todos</button>${VEND.map(([id, n]) => `<button type="button" data-acao="filtroVend" data-v="${id}" aria-pressed="${st.vend === id}">${av(n, 'p')}${esc(n.split(' ')[0])}</button>`).join('')}</div>
      <div class="flex mute" style="font-size:12.5px"><span><b class="num" style="color:var(--tx)">${moeda(tot)}</b> em ${ns.length} negócios</span><span>·</span><span>${moeda(soma(ns, ponderado))} ponderado</span></div></div>
    ${kanban({ id: 'funil', itens: ns, campo: 'etapa',
      colunas: ETAPAS.map((e) => ({ id: e.id, nome: e.nome, cor: e.cor, sub: (l) => `${moeda(soma(l, (n) => n.valor))} · ${e.prob}% de chance`, classe: (n) => (parado(a, n) ? 'parado' : '') })),
      ficha: (n) => { const em = empresaDe(a, n.empresa); return `<div class="t">${esc(n.titulo)}</div><div class="s corta">${esc(em?.nome || '')}${n.contato ? ` · ${esc(contatoDe(a, n.contato)?.nome || '')}` : ''}</div>
        <div class="linha"><span class="flex" style="gap:6px">${av(nomeV(n.responsavel), 'p')}<b class="num" style="color:var(--tx)">${moeda(n.valor)}</b></span><span class="flex" style="gap:6px">${parado(a, n) ? `<span class="er-tx" title="Parado">${diasParado(a, n)}d</span>` : ''}${indAtiv(a, n)}</span></div>`; } })}
    <div class="flex mute" style="font-size:12px;gap:14px;flex-wrap:wrap"><span class="flex" style="gap:5px"><span class="ind-ativ atrasada">${ic('clock')}</span>atividade atrasada</span><span class="flex" style="gap:5px"><span class="ind-ativ hoje">${ic('clock')}</span>hoje</span><span class="flex" style="gap:5px"><span class="ind-ativ futura">${ic('clock')}</span>agendada</span><span class="flex" style="gap:5px"><span class="ind-ativ nenhuma">${ic('warning')}</span>sem próxima atividade</span><span class="flex" style="gap:5px"><i style="width:3px;height:14px;background:var(--er);border-radius:2px"></i>parado além do prazo da etapa</span></div>`;
}

function negocios(a) {
  return a.tab({
    id: 'negocios', colecao: 'negocios', singular: 'negócio', plural: 'negócios', ordem: 'previsao', buscaDica: 'Buscar por título, empresa ou pessoa…',
    visoes: [{ id: 'abertos', rot: 'Em aberto', filtro: (n) => n.status === 'aberto' }, { id: 'parados', rot: 'Parados', filtro: (n) => parado(a, n) }, { id: 'ganhos', rot: 'Ganhos', filtro: (n) => n.status === 'ganho' }, { id: 'perdidos', rot: 'Perdidos', filtro: (n) => n.status === 'perdido' }, { id: 'todos', rot: 'Todos' }],
    filtros: [{ k: 'responsavel', rot: 'Responsável', opcoes: () => VEND.map((v) => [v[0], v[1]]) }, { k: 'etapa', rot: 'Etapa', opcoes: ETAPAS.map((e) => [e.id, e.nome]) }, { k: 'origem', rot: 'Origem', opcoes: ORIGENS }],
    textoBusca: (n) => `${n.titulo} ${empresaDe(a, n.empresa)?.nome} ${contatoDe(a, n.contato)?.nome}`,
    total: (l) => moeda(soma(l, (n) => n.valor)),
    novo: { rot: 'Novo negócio', attrs: 'data-acao="novoNegocio"' },
    aoClicar: (id) => a.abrir('negocio', id),
    massa: [
      { rot: 'Passar para…', icone: 'user-switch', acao: async (ids) => { const v = await escolher('Passar negócios para', VEND.map((x) => [x[0], x[1]])); if (!v) return false; ids.forEach((id) => a.db.salvar('negocios', { id, responsavel: v })); avisar(`${ids.length} negócios agora com ${nomeV(v)}`); } },
      { rot: 'Marcar como perdido', icone: 'x-circle', acao: async (ids) => { const m = await escolher('Motivo da perda', MOTIVOS.map((x) => [x, x])); if (!m) return false; ids.forEach((id) => a.db.salvar('negocios', { id, status: 'perdido', motivo: m, fechado: hoje() })); avisar(`${ids.length} negócios marcados como perdidos`); } },
    ],
    colunas: [
      { k: 'titulo', rot: 'Negócio', render: (n) => `<span class="prim">${esc(n.titulo)}</span><span class="sub">${esc(empresaDe(a, n.empresa)?.nome || '')}</span>` },
      { k: 'valor', rot: 'Valor', n: true, render: (n) => moeda(n.valor) },
      { k: 'etapa', rot: 'Etapa', valor: (n) => (n.status === 'aberto' ? ETAPAS.findIndex((e) => e.id === n.etapa) : n.status), render: etStatus, csv: (n) => (n.status === 'aberto' ? etapa(n.etapa).nome : n.status) },
      { k: 'ativ', rot: 'Próxima atividade', oc: true, valor: (n) => proxAtiv(a, n)?.quando || 'z', render: (n) => { if (n.status !== 'aberto') return '<span class="mute">—</span>'; const p = proxAtiv(a, n); return p ? `<span class="flex" style="gap:6px">${indAtiv(a, n)}<span class="corta" style="max-width:190px">${esc(relativo(p.quando))} · ${esc(p.titulo)}</span></span>` : `<span class="flex al-tx" style="gap:6px">${indAtiv(a, n)}Nenhuma</span>`; }, csv: (n) => proxAtiv(a, n)?.titulo || '' },
      { k: 'responsavel', rot: 'Responsável', oc: true, valor: (n) => nomeV(n.responsavel), render: (n) => `<span class="flex">${av(nomeV(n.responsavel), 'p')}${esc(nomeV(n.responsavel).split(' ')[0])}</span>` },
      { k: 'previsao', rot: 'Fechamento', valor: (n) => n.fechado || n.previsao, render: (n) => { const d = n.fechado || n.previsao; const atr = n.status === 'aberto' && diasAte(d) < 0; return `<span class="${atr ? 'er-tx' : ''}">${dataCurta(d)}</span>`; } },
    ],
  });
}

function atividades(a) {
  const st = a.estado.ativ ||= { modo: 'lista', semana: 0 };
  const topo = `<div class="entre"><div class="grupo-btn"><button type="button" data-acao="modoAtiv" data-m="lista" aria-pressed="${st.modo === 'lista'}">${ic('list', 'p')}Lista</button><button type="button" data-acao="modoAtiv" data-m="semana" aria-pressed="${st.modo === 'semana'}">${ic('calendar-blank', 'p')}Semana</button></div>
    <button type="button" class="btn pri" data-acao="novaAtividade">${ic('plus')}Agendar atividade</button></div>`;
  if (st.modo === 'semana') {
    const seg = diaMais(-((paraData(hoje()).getDay() + 6) % 7) + st.semana * 7);
    const dias = Array.from({ length: 7 }, (_, i) => diaMais(i, seg));
    a.cals.ativ = {
      aoClicar: (id) => a.abrir('atividade', id),
      aoMover: (id, dia, hora) => { const x = a.db.obter('atividades', id); a.db.salvar('atividades', { id, quando: `${dia}T${hora}` }); avisar(`${x.titulo} → ${dataCurta(dia)}, ${hora}`); a.render(); },
      aoClicarVazio: (dia, hora) => novaAtividade(a, { quando: `${dia}T${hora}` }),
    };
    const ev = a.db.lista('atividades').filter((x) => dias.includes(x.quando.slice(0, 10))).map((x) => { const ini = horaBR(x.quando), fimM = Math.min(21 * 60, Number(ini.slice(0, 2)) * 60 + Number(ini.slice(3)) + (x.duracao || 30)); return { id: x.id, col: x.quando.slice(0, 10), ini, fim: `${String(Math.floor(fimM / 60)).padStart(2, '0')}:${String(fimM % 60).padStart(2, '0')}`, titulo: x.titulo, sub: nomeV(x.responsavel).split(' ')[0], cor: COR_TIPO[x.tipo], cls: x.feita ? 'feito' : '' }; });
    return `${topo}<div class="cal"><div class="cal-barra"><div class="grupo-btn"><button type="button" data-acao="semanaAtiv" data-d="-1" aria-label="Semana anterior">${ic('caret-left', 'p')}</button><button type="button" data-acao="semanaAtiv" data-d="0">Hoje</button><button type="button" data-acao="semanaAtiv" data-d="1" aria-label="Próxima semana">${ic('caret-right', 'p')}</button></div><h3>${dataCurta(dias[0])} – ${dataCurta(dias[6])}</h3><span class="mute" style="margin-left:auto;font-size:12px">Arraste para remarcar · clique duas vezes num horário vazio para agendar</span></div>
      ${calGrade({ id: 'ativ', inicio: 8, fim: 19, hh: 52, larguraCol: 128, agora: { col: hoje(), hora: new Date().toTimeString().slice(0, 5) }, colunas: dias.map((d) => ({ id: d, rot: `${DIAS[paraData(d).getDay()]} ${Number(d.slice(8))}`, hoje: d === hoje(), fora: [['12:00', '13:00']] })), eventos: ev })}</div>`;
  }
  return topo + a.tab({
    id: 'atividades', colecao: 'atividades', singular: 'atividade', plural: 'atividades', ordem: 'quando',
    visoes: [{ id: 'pend', rot: 'A fazer', filtro: (x) => !x.feita }, { id: 'atras', rot: 'Atrasadas', filtro: (x) => !x.feita && diasAte(x.quando) < 0 }, { id: 'hoje', rot: 'Hoje', filtro: (x) => !x.feita && diasAte(x.quando) === 0 }, { id: 'semana', rot: 'Próximos 7 dias', filtro: (x) => !x.feita && diasAte(x.quando) > 0 && diasAte(x.quando) <= 7 }, { id: 'feitas', rot: 'Concluídas', filtro: (x) => x.feita }],
    filtros: [{ k: 'tipo', rot: 'Tipo', opcoes: Object.entries(TIPOS).map(([k, [n]]) => [k, n]) }, { k: 'responsavel', rot: 'Responsável', opcoes: () => VEND.map((v) => [v[0], v[1]]) }],
    textoBusca: (x) => `${x.titulo} ${a.db.obter('negocios', x.negocio)?.titulo || ''}`,
    aoClicar: (id) => a.abrir('atividade', id),
    massa: [{ rot: 'Concluir', icone: 'check', acao: (ids) => { ids.forEach((id) => a.db.salvar('atividades', { id, feita: true, feita_em: agoraISO() })); avisar(`${ids.length} atividades concluídas`); } }, { rot: 'Adiar 1 dia', icone: 'clock', acao: (ids) => { ids.forEach((id) => { const x = a.db.obter('atividades', id); a.db.salvar('atividades', { id, quando: `${diaMais(Math.max(1, diasAte(x.quando) + 1))}T${horaBR(x.quando)}` }); }); avisar(`${ids.length} atividades adiadas`); } }],
    colunas: [
      { k: 'feita', rot: '', w: '34px', ord: false, csv: (x) => (x.feita ? 'sim' : 'não'), render: (x) => `<input type="checkbox" data-mudar="concluirAtiv" data-id="${x.id}" ${x.feita ? 'checked' : ''} aria-label="Concluir">` },
      { k: 'titulo', rot: 'Assunto', render: (x) => { const [n, i] = TIPOS[x.tipo] || TIPOS.tarefa; return `<span class="flex" style="gap:9px"><span class="av p" style="background:${COR_TIPO[x.tipo]}">${ic(i, 'p')}</span><span><span class="prim" style="${x.feita ? 'text-decoration:line-through;color:var(--tx-3)' : ''}">${esc(x.titulo)}</span><span class="sub">${esc(n)}</span></span></span>`; } },
      { k: 'negocio', rot: 'Negócio', oc: true, valor: (x) => a.db.obter('negocios', x.negocio)?.titulo || '', render: (x) => { const n = a.db.obter('negocios', x.negocio); return n ? `<a href="javascript:void 0" data-abrir="negocio:${n.id}">${esc(n.titulo)}</a>` : '<span class="mute">—</span>'; } },
      { k: 'quando', rot: 'Quando', render: (x) => { const d = diasAte(x.quando); return `<span class="${!x.feita && d < 0 ? 'er-tx' : !x.feita && d === 0 ? 'ok-tx' : ''}">${esc(relativo(x.quando))}</span>`; } },
      { k: 'responsavel', rot: 'Responsável', oc: true, valor: (x) => nomeV(x.responsavel), render: (x) => `<span class="flex">${av(nomeV(x.responsavel), 'p')}${esc(nomeV(x.responsavel).split(' ')[0])}</span>` },
    ],
  });
}

function pessoas(a) {
  return a.tab({
    id: 'contatos', colecao: 'contatos', singular: 'pessoa', plural: 'pessoas', ordem: 'nome', buscaDica: 'Buscar por nome, e-mail ou empresa…',
    filtros: [{ k: 'origem', rot: 'Origem', opcoes: ORIGENS }, { k: 'dono', rot: 'Responsável', opcoes: () => VEND.map((v) => [v[0], v[1]]) }],
    textoBusca: (c) => `${c.nome} ${c.email} ${empresaDe(a, c.empresa)?.nome}`,
    novo: { rot: 'Nova pessoa', attrs: 'data-acao="novaPessoa"' }, aoClicar: (id) => a.abrir('pessoa', id),
    colunas: [
      { k: 'nome', rot: 'Nome', render: (c) => `<span class="flex" style="gap:9px">${av(c.nome)}<span><span class="prim">${esc(c.nome)}</span><span class="sub">${esc(c.cargo || '')}</span></span></span>` },
      { k: 'empresa', rot: 'Empresa', valor: (c) => empresaDe(a, c.empresa)?.nome || '', render: (c) => esc(empresaDe(a, c.empresa)?.nome || '—') },
      { k: 'email', rot: 'E-mail', oc: true, render: (c) => `<span class="mute-2">${esc(c.email || '—')}</span>` },
      { k: 'telefone', rot: 'Telefone', oc: true, render: (c) => `<span class="num">${esc(c.telefone || '—')}</span>` },
      { k: 'abertos', rot: 'Negócios abertos', n: true, valor: (c) => abertos(a).filter((n) => n.contato === c.id).length, render: (c) => { const l = abertos(a).filter((n) => n.contato === c.id); return l.length ? `${l.length} · ${moedaC(soma(l, (n) => n.valor))}` : '<span class="mute">—</span>'; } },
    ],
  });
}

function empresas(a) {
  return a.tab({
    id: 'empresas', colecao: 'empresas', singular: 'empresa', plural: 'empresas', ordem: 'nome',
    filtros: [{ k: 'segmento', rot: 'Segmento', opcoes: (aa) => [...new Set(aa.db.lista('empresas').map((e) => e.segmento))].sort() }],
    novo: { rot: 'Nova empresa', attrs: 'data-acao="novaEmpresa"' }, aoClicar: (id) => a.abrir('empresa', id),
    colunas: [
      { k: 'nome', rot: 'Empresa', render: (e) => `<span class="flex" style="gap:9px">${av(e.nome)}<span><span class="prim">${esc(e.nome)}</span><span class="sub">${esc(e.site || '')}</span></span></span>` },
      { k: 'segmento', rot: 'Segmento', render: (e) => et(e.segmento || '—', '', 'sem-ponto') },
      { k: 'cidade', rot: 'Cidade', oc: true },
      { k: 'pessoas', rot: 'Pessoas', n: true, oc: true, valor: (e) => a.db.lista('contatos').filter((c) => c.empresa === e.id).length, render: (e) => num(a.db.lista('contatos').filter((c) => c.empresa === e.id).length) },
      { k: 'ganho', rot: 'Já comprou', n: true, valor: (e) => soma(ganhos(a).filter((n) => n.empresa === e.id), (n) => n.valor), render: (e) => { const v = soma(ganhos(a).filter((n) => n.empresa === e.id), (n) => n.valor); return v ? moeda(v) : '<span class="mute">—</span>'; } },
      { k: 'aberto', rot: 'Em aberto', n: true, valor: (e) => soma(abertos(a).filter((n) => n.empresa === e.id), (n) => n.valor), render: (e) => { const v = soma(abertos(a).filter((n) => n.empresa === e.id), (n) => n.valor); return v ? moeda(v) : '<span class="mute">—</span>'; } },
    ],
  });
}

function previsao(a) {
  const meses = [0, 1, 2, 3].map((m) => mesMais(m));
  const ab = abertos(a);
  const col = (ym, i) => {
    const l = ab.filter((n) => (i === 0 ? n.previsao <= `${ym}-31` : n.previsao.startsWith(ym))).sort((x, y) => y.valor - x.valor);
    const g = ganhos(a).filter((n) => doMes(n.fechado, ym));
    const meta = soma(VEND, ([v]) => metaDe(a, v, ym));
    return `<section class="coluna" style="min-height:420px"><div class="coluna-cab"><div class="t" style="text-transform:capitalize">${esc(nomeMes(ym, true))}</div>
      <div class="v" style="margin-top:6px;display:grid;gap:3px"><span class="entre"><span>Ganho</span><b class="ok-tx num">${moeda(soma(g, (n) => n.valor))}</b></span><span class="entre"><span>Ponderado</span><b class="num" style="color:var(--tx)">${moeda(soma(l, ponderado))}</b></span><span class="entre"><span>Total em aberto</span><span class="num">${moeda(soma(l, (n) => n.valor))}</span></span>${meta ? `<span class="entre"><span>Meta</span><span class="num">${moeda(meta)}</span></span><div style="margin-top:4px">${prog(((soma(g, (n) => n.valor) + soma(l, ponderado)) / meta) * 100, 'ok')}</div>` : ''}</div></div>
      <div class="coluna-corpo">${g.map((n) => `<article class="ficha" data-abrir="negocio:${n.id}" style="cursor:pointer;border-left:3px solid var(--ok)"><div class="t">${esc(n.titulo)}</div><div class="linha"><span class="ok-tx">Ganho ${dataCurta(n.fechado)}</span><b class="num">${moeda(n.valor)}</b></div></article>`).join('')}
        ${l.map((n) => `<article class="ficha ${diasAte(n.previsao) < 0 ? 'parado' : ''}" data-abrir="negocio:${n.id}" style="cursor:pointer"><div class="t">${esc(n.titulo)}</div><div class="s">${esc(etapa(n.etapa).nome)} · ${etapa(n.etapa).prob}% · previsão ${dataCurta(n.previsao)}</div><div class="linha"><span class="flex">${av(nomeV(n.responsavel), 'p')}${indAtiv(a, n)}</span><b class="num" style="color:var(--tx)">${moeda(n.valor)}</b></div></article>`).join('') || '<div class="mute" style="padding:14px;text-align:center;font-size:12px">Nada previsto</div>'}</div></section>`;
  };
  return `<div class="dica">${ic('info')}<span>Previsão no estilo Pipedrive: cada negócio aparece no mês da data prevista de fechamento. O <b>ponderado</b> multiplica o valor pela chance da etapa. Negócios com previsão vencida entram no mês atual, em vermelho.</span></div>
    <div class="kanban" style="grid-auto-columns:minmax(270px,1fr)">${meses.map(col).join('')}</div>`;
}

function relatorios(a) {
  const st = a.estado.rel ||= { periodo: 6 };
  const meses = Array.from({ length: st.periodo }, (_, i) => mesMais(i - st.periodo + 1));
  const g = ganhos(a), p = perdidos(a), todos = a.db.lista('negocios');
  const noPer = (n) => n.fechado && n.fechado >= `${meses[0]}-01`;
  const gp = g.filter(noPer), pp = p.filter(noPer);
  const ciclo = gp.length ? Math.round(soma(gp, (n) => Math.max(1, diasEntre(n.criado, n.fechado))) / gp.length) : 0;
  const motivos = MOTIVOS.map((m, i) => ({ rot: m, v: pp.filter((n) => n.motivo === m).length, cor: ['#e11d48', '#f97316', '#eab308', '#64748b', '#0ea5e9', '#a855f7'][i] })).filter((x) => x.v);
  const alcan = ETAPAS.map((e, i) => ({ rot: e.nome, v: todos.filter((n) => n.status === 'ganho' || ETAPAS.findIndex((x) => x.id === n.etapa) >= i).length }));
  return `<div class="entre"><div class="grupo-btn">${[3, 6, 12].map((m) => `<button type="button" data-acao="periodoRel" data-m="${m}" aria-pressed="${st.periodo === m}">${m} meses</button>`).join('')}</div><button type="button" class="btn" data-acao="imprimirPagina">${ic('printer')}Imprimir</button></div>
    ${kpis([
      { rot: 'Vendido no período', icone: 'trophy', val: moeda(soma(gp, (n) => n.valor)), nota: `${gp.length} negócios ganhos` },
      { rot: 'Ticket médio', icone: 'receipt', val: moeda(gp.length ? soma(gp, (n) => n.valor) / gp.length : 0) },
      { rot: 'Taxa de ganho', icone: 'target', val: pct((gp.length / (gp.length + pp.length || 1)) * 100), nota: `${gp.length} ganhos · ${pp.length} perdidos` },
      { rot: 'Ciclo médio de venda', icone: 'hourglass', val: `${ciclo} dias`, nota: 'da criação ao fechamento' },
    ])}
    <div class="grade g21">
      <div class="cartao"><div class="cartao-cab"><div><h3>Vendas por mês</h3><div class="sub">Ganhos fechados e meta da equipe</div></div></div><div class="cartao-corpo">${barras({ dados: meses.map((m) => ({ rot: nomeMes(m), v: VEND.map(([v]) => vendidoMes(a, m, v)) })), series: VEND.map(([, n], i) => ({ nome: n, cor: ['#4f46e5', '#0ea5e9', '#14b8a6'][i] })), empilhado: true, fmt: moedaC, linhaMeta: soma(VEND, ([v]) => metaDe(a, v)) })}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Por que perdemos</h3><div class="sub">Motivos registrados no período</div></div></div><div class="cartao-corpo">${motivos.length ? rosca({ itens: motivos, centro: String(pp.length), sub: 'perdidos' }) : vazio('smiley', 'Nenhum negócio perdido')}</div></div>
    </div>
    <div class="grade g2">
      <div class="cartao"><div class="cartao-cab"><div><h3>Conversão por etapa</h3><div class="sub">Quantos negócios chegaram a cada etapa</div></div></div><div class="cartao-corpo">${funilH(alcan.map((x, i) => ({ ...x, r: i ? pct((x.v / (alcan[0].v || 1)) * 100) : '100%' })))}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>De onde vêm as vendas</h3><div class="sub">Valor ganho por origem</div></div></div><div class="cartao-corpo">${barrasH(ORIGENS.map((o) => { const l = gp.filter((n) => n.origem === o); const t = todos.filter((n) => n.origem === o && noPer(n)); return { rot: o, v: soma(l, (n) => n.valor), extra: `${l.length}/${t.length || 0} ganhos` }; }).filter((x) => x.v).sort((x, y) => y.v - x.v), { fmt: moedaC })}</div></div>
    </div>
    <div class="cartao"><div class="cartao-cab"><h3>Desempenho por vendedor</h3></div><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Vendedor</th><th class="n">Em aberto</th><th class="n">Ganhos</th><th class="n">Perdidos</th><th class="n">Taxa de ganho</th><th class="n oc">Ticket médio</th><th class="n">Vendido</th><th class="n oc">Atividades feitas</th></tr></thead><tbody>
      ${VEND.map(([id, nome]) => { const gg = gp.filter((n) => n.responsavel === id), pe = pp.filter((n) => n.responsavel === id), ab = abertos(a).filter((n) => n.responsavel === id); const v = soma(gg, (n) => n.valor); return `<tr><td><span class="flex">${av(nome, 'p')}${esc(nome)}</span></td><td class="n">${ab.length} · ${moedaC(soma(ab, (n) => n.valor))}</td><td class="n">${gg.length}</td><td class="n">${pe.length}</td><td class="n">${pct((gg.length / (gg.length + pe.length || 1)) * 100)}</td><td class="n oc">${moeda(gg.length ? v / gg.length : 0)}</td><td class="n"><b>${moeda(v)}</b></td><td class="n oc">${a.db.lista('atividades').filter((x) => x.feita && x.responsavel === id).length}</td></tr>`; }).join('')}</tbody></table></div></div>`;
}

function metas(a) {
  const meses = [-2, -1, 0, 1].map((m) => mesMais(m));
  return `<div class="dica">${ic('info')}<span>Defina quanto cada pessoa precisa vender por mês. O painel e os relatórios comparam o vendido com a meta.</span></div>
    <div class="cartao"><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Vendedor</th>${meses.map((m) => `<th class="n" style="text-transform:capitalize">${esc(nomeMes(m, true))}</th>`).join('')}</tr></thead><tbody>
    ${VEND.map(([id, nome]) => `<tr><td><span class="flex">${av(nome, 'p')}${esc(nome)}</span></td>${meses.map((m) => { const meta = metaDe(a, id, m), v = vendidoMes(a, m, id), p = (v / (meta || 1)) * 100; return `<td class="n" style="min-width:170px;padding:8px 12px"><div class="prefixo"><span>R$</span><input type="number" step="1000" min="0" value="${meta}" data-mudar="salvarMeta" data-v="${id}" data-m="${m}" style="height:28px;text-align:right" aria-label="Meta"></div><div style="margin-top:6px">${prog(p, p >= 100 ? 'ok' : '')}</div><small class="mute">${moedaC(v)} · ${pct(p)}</small></td>`; }).join('')}</tr>`).join('')}
    </tbody></table></div></div>`;
}

function produtos(a) {
  return a.tab({ id: 'produtos', colecao: 'produtos', singular: 'produto', plural: 'produtos', ordem: 'nome', novo: { rot: 'Novo produto', attrs: 'data-acao="novoProduto"' },
    aoClicar: async (id) => { if (await editar(a, 'produtos', a.db.obter('produtos', id))) a.render(); },
    colunas: [{ k: 'nome', rot: 'Produto', render: (p) => `<span class="prim">${esc(p.nome)}</span>` }, { k: 'codigo', rot: 'Código', render: (p) => `<span class="mono mute-2">${esc(p.codigo || '—')}</span>` }, { k: 'preco', rot: 'Preço', n: true, render: (p) => moeda(p.preco) },
      { k: 'vendas', rot: 'Vendido (unid.)', n: true, valor: (p) => soma(ganhos(a).flatMap((n) => n.itens || []).filter((i) => i.produto === p.nome), (i) => i.qtd), render: (p) => num(soma(ganhos(a).flatMap((n) => n.itens || []).filter((i) => i.produto === p.nome), (i) => i.qtd)) }] });
}

// ---------------------------------------------------------------- fichas (painel lateral)
function linhaDoTempoDe(a, alvo, filtroAtiv) {
  const notas = a.db.lista('notas').filter((n) => n.alvo === alvo).map((n) => ({ quando: n.quando, icone: 'note-pencil', tom: 'al', html: `<b>${esc(nomeV(n.autor))}</b> escreveu uma nota`, nota: n.texto }));
  const ativ = a.db.lista('atividades').filter(filtroAtiv).filter((x) => x.feita).map((x) => ({ quando: x.feita_em || x.quando, icone: (TIPOS[x.tipo] || TIPOS.tarefa)[1], tom: 'ok', html: `<b>${esc((TIPOS[x.tipo] || TIPOS.tarefa)[0])}</b> · ${esc(x.titulo)}${x.resultado ? ` <span class="mute">— ${esc(x.resultado)}</span>` : ''}` }));
  const log = a.db.historico(alvo).map((l) => ({ quando: l.quando, icone: l.icone || 'dot-outline', tom: l.tom || '', html: esc(l.texto) }));
  return [...notas, ...ativ, ...log].sort((x, y) => String(y.quando).localeCompare(String(x.quando)));
}
const compositor = (alvo) => `<div class="compositor"><textarea placeholder="Escreva uma nota… (fica visível para a equipe)" data-nota-txt></textarea><div class="pe"><span class="mute" style="font-size:12px">Ctrl + Enter para salvar</span><button type="button" class="btn pri peq" data-acao="salvarNota" data-alvo="${alvo}" style="margin-left:auto">Salvar nota</button></div></div>`;
const listaAtiv = (a, l) => (l.length ? `<ul class="lista" style="margin:0 -20px">${l.map((x) => { const [nomeT, icone] = TIPOS[x.tipo] || TIPOS.tarefa; const d = diasAte(x.quando); return `<li><input type="checkbox" data-mudar="concluirAtiv" data-id="${x.id}" ${x.feita ? 'checked' : ''} aria-label="Concluir"><span class="av p" style="background:${COR_TIPO[x.tipo]}">${ic(icone, 'p')}</span><div class="cresce"><div class="t" style="${x.feita ? 'text-decoration:line-through;color:var(--tx-3)' : ''}">${esc(x.titulo)}</div><div class="s">${esc(nomeT)} · ${esc(nomeV(x.responsavel))}</div></div><div class="dir ${!x.feita && d < 0 ? 'er-tx' : ''}" style="font-size:12.5px">${esc(relativo(x.quando))}</div></li>`; }).join('')}</ul>` : vazio('calendar-blank', 'Nenhuma atividade'));

const fichas = {
  negocio(a, id, aba = 'tempo') {
    const n = a.db.obter('negocios', id); if (!n) return null;
    const em = empresaDe(a, n.empresa), c = contatoDe(a, n.contato), ativs = a.db.lista('atividades').filter((x) => x.negocio === id).sort((x, y) => y.quando.localeCompare(x.quando));
    const pend = ativs.filter((x) => !x.feita).sort((x, y) => x.quando.localeCompare(y.quando));
    const iEt = ETAPAS.findIndex((e) => e.id === n.etapa);
    let corpo = '';
    if (aba === 'tempo') corpo = `<div class="gav-sec">${compositor(`negocios:${id}`)}</div>
      ${pend.length ? `<div class="gav-sec"><h4>Planejado</h4>${listaAtiv(a, pend)}</div>` : `<div class="gav-sec"><div class="alerta-linha al">${ic('warning')}Nenhuma próxima atividade. Todo negócio aberto precisa de um próximo passo.<a href="javascript:void 0" data-acao="novaAtividade" data-negocio="${id}">Agendar</a></div></div>`}
      <div class="gav-sec"><h4>Histórico</h4>${linhaDoTempo(linhaDoTempoDe(a, `negocios:${id}`, (x) => x.negocio === id))}</div>`;
    if (aba === 'ativ') corpo = `<div class="gav-sec"><div class="entre" style="margin-bottom:10px"><h4 style="margin:0">Atividades</h4><span class="flex"><button type="button" class="btn peq" data-acao="sequencia" data-id="${id}">${ic('list-plus')}Sequência de retornos</button><button type="button" class="btn peq" data-acao="novaAtividade" data-negocio="${id}">${ic('plus')}Agendar</button></span></div>${listaAtiv(a, ativs)}</div>`;
    if (aba === 'prod') {
      const itens = n.itens || [];
      corpo = `<div class="gav-sec"><table class="tabela" style="margin:0 -8px;width:calc(100% + 16px)"><thead><tr><th>Produto</th><th class="n">Qtd.</th><th class="n">Preço</th><th class="n">Desc.</th><th class="n">Total</th><th></th></tr></thead><tbody>
        ${itens.map((x, i) => `<tr><td>${esc(x.produto)}</td><td class="n">${x.qtd}</td><td class="n">${moeda(x.preco)}</td><td class="n">${x.desc ? pct(x.desc) : '—'}</td><td class="n"><b>${moeda(x.qtd * x.preco * (1 - (x.desc || 0) / 100))}</b></td><td class="acoes"><button type="button" class="btn fant peq ic-so" data-acao="tirarItem" data-id="${id}" data-i="${i}" aria-label="Remover">${ic('trash')}</button></td></tr>`).join('') || `<tr><td colspan="6">${vazio('package', 'Sem produtos', 'Adicione itens para montar a proposta e calcular o valor.')}</td></tr>`}</tbody>
        ${itens.length ? `<tfoot><tr><td colspan="4">Total</td><td class="n">${moeda(totalItens(itens))}</td><td></td></tr></tfoot>` : ''}</table>
        <div class="flex" style="margin-top:12px"><button type="button" class="btn" data-acao="addItem" data-id="${id}">${ic('plus')}Adicionar produto</button><button type="button" class="btn" data-acao="proposta" data-id="${id}" ${itens.length ? '' : 'disabled'}>${ic('printer')}Gerar proposta</button><button type="button" class="btn pri" data-acao="propostaOnline" data-id="${id}">${ic('link')}Proposta online</button></div>
        ${n.proposta_aberta ? `<div class="dica" style="margin-top:10px">${ic('eye')}<span>O cliente abriu a proposta ${n.proposta_aberturas > 1 ? `${n.proposta_aberturas} vezes · a última ` : ''}${relativo(n.proposta_aberta.slice(0, 10))}, às ${n.proposta_aberta.slice(11, 16)}.</span></div>` : ''}${n.aceite ? `<div class="dica" style="margin-top:10px">${ic('seal-check')}<span>Aceita online por <b>${esc(n.aceite.nome)}</b> (${esc(n.aceite.documento)}) em ${dataCurta(n.aceite.quando.slice(0, 10))}.</span></div>` : ''}</div>`;
    }
    if (aba === 'det') corpo = `<div class="gav-sec">${props([
      ['buildings', 'Empresa', em ? `<a href="javascript:void 0" data-abrir="empresa:${em.id}">${esc(em.nome)}</a>` : null],
      ['user', 'Pessoa', c ? `<a href="javascript:void 0" data-abrir="pessoa:${c.id}">${esc(c.nome)}</a>` : null],
      ['currency-circle-dollar', 'Valor', moeda(n.valor)],
      ['percent', 'Chance da etapa', n.status === 'aberto' ? `${etapa(n.etapa).prob}% · ponderado ${moeda(ponderado(n))}` : null],
      ['calendar-blank', 'Previsão de fechamento', dataCurta(n.previsao)],
      ['user-circle', 'Responsável', esc(nomeV(n.responsavel))],
      ['globe', 'Origem', esc(n.origem || '—')],
      ['clock', 'Criado em', `${dataCurta(n.criado)} · há ${-diasAte(n.criado)} dias`],
      ['flag', 'Na etapa desde', n.status === 'aberto' ? `${dataCurta(n.etapa_desde)}${parado(a, n) ? ` · ${et(`parado há ${diasParado(a, n)} dias`, 'er')}` : ''}` : null],
      n.status === 'perdido' ? ['x-circle', 'Motivo da perda', esc(n.motivo || '—')] : null,
    ])}</div>`;
    const extra = n.status === 'aberto' ? `<div class="etapas" role="group" aria-label="Etapa">${ETAPAS.map((e, i) => `<button type="button" class="${i < iEt ? 'feita' : i === iEt ? 'atual' : ''}" data-acao="mudarEtapa" data-id="${id}" data-e="${e.id}" title="${esc(e.nome)} · ${e.prob}%">${esc(e.nome)}</button>`).join('')}</div>` : `<div style="margin-top:12px">${n.status === 'ganho' ? `<div class="alerta-linha" style="background:var(--ok-bg);color:var(--ok);border-color:transparent">${ic('trophy')}Ganho em ${dataCurta(n.fechado)}<a href="javascript:void 0" data-acao="reabrir" data-id="${id}">Reabrir</a></div>` : `<div class="alerta-linha">${ic('x-circle')}Perdido em ${dataCurta(n.fechado)} · ${esc(n.motivo || '')}<a href="javascript:void 0" data-acao="reabrir" data-id="${id}">Reabrir</a></div>`}</div>`;
    return { html: ficha({ tipo: 'Negócio', icone: 'handshake', titulo: esc(n.titulo), avatar: av(em?.nome || '?', 'g'),
      sub: `<b class="num" style="color:var(--tx);font-size:15px">${moeda(n.valor)}</b>${n.proposta_aberta && n.status === 'aberto' ? et('Abriu a proposta', 'info') : ''}${em ? `<span>${esc(em.nome)}</span>` : ''}${c ? `<span>· ${esc(c.nome)}</span>` : ''}<span class="flex" style="gap:5px">· ${av(nomeV(n.responsavel), 'p')}${esc(nomeV(n.responsavel))}</span>`,
      extra, aba, abas: [['tempo', 'Linha do tempo'], ['ativ', 'Atividades', ativs.length], ['prod', 'Produtos', (n.itens || []).length], ['det', 'Detalhes']], corpo,
      acoes: `${n.status === 'aberto' ? `<button type="button" class="btn ok pri peq" data-acao="ganhar" data-id="${id}">${ic('trophy')}Ganho</button><button type="button" class="btn perigo peq" data-acao="perder" data-id="${id}">Perdido</button>` : ''}<button type="button" class="btn fant peq ic-so" data-acao="menuNegocio" data-id="${id}" aria-label="Mais ações">${ic('dots-three')}</button>` }),
      montar: (g) => { g.dataset.aba = aba; const t = g.querySelector('[data-nota-txt]'); t?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) g.querySelector('[data-acao="salvarNota"]').click(); }); } };
  },
  pessoa(a, id, aba = 'resumo') {
    const c = contatoDe(a, id); if (!c) return null;
    const em = empresaDe(a, c.empresa), ns = a.db.lista('negocios').filter((n) => n.contato === id);
    const corpo = aba === 'resumo' ? `<div class="gav-sec">${props([['envelope-simple', 'E-mail', c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : null], ['phone', 'Telefone', c.telefone ? `${esc(c.telefone)} · <a href="${telLink(c.telefone)}" target="_blank" rel="noopener">WhatsApp</a>` : null], ['buildings', 'Empresa', em ? `<a href="javascript:void 0" data-abrir="empresa:${em.id}">${esc(em.nome)}</a>` : null], ['identification-card', 'Cargo', esc(c.cargo || '—')], ['globe', 'Origem', esc(c.origem || '—')], ['user-circle', 'Responsável', esc(nomeV(c.dono))]])}</div>
      <div class="gav-sec"><h4>Negócios</h4>${ns.length ? `<ul class="lista" style="margin:0 -20px">${ns.map((n) => `<li class="clicavel" data-abrir="negocio:${n.id}"><div class="cresce"><div class="t corta">${esc(n.titulo)}</div><div class="s">${dataCurta(n.fechado || n.previsao)}</div></div>${etStatus(n)}<b class="num" style="min-width:90px;text-align:right">${moeda(n.valor)}</b></li>`).join('')}</ul>` : vazio('handshake', 'Nenhum negócio')}</div>`
      : `<div class="gav-sec">${compositor(`contatos:${id}`)}</div><div class="gav-sec">${linhaDoTempo(linhaDoTempoDe(a, `contatos:${id}`, (x) => x.contato === id))}</div>`;
    return { html: ficha({ tipo: 'Pessoa', icone: 'user', titulo: esc(c.nome), avatar: av(c.nome, 'gg'), sub: `${esc(c.cargo || '')}${em ? ` · ${esc(em.nome)}` : ''}`, aba, abas: [['resumo', 'Resumo'], ['tempo', 'Linha do tempo']], corpo,
      extra: `<div class="flex" style="margin-top:12px">${c.telefone ? `<a class="btn peq" href="${telLink(c.telefone)}" target="_blank" rel="noopener">${ic('whatsapp-logo')}WhatsApp</a>` : ''}${c.email ? `<a class="btn peq" href="mailto:${esc(c.email)}">${ic('envelope-simple')}E-mail</a>` : ''}<button type="button" class="btn peq" data-acao="novoNegocio" data-contato="${id}">${ic('plus')}Negócio</button></div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarReg" data-c="contatos" data-id="${id}">${ic('pencil-simple')}Editar</button><button type="button" class="btn fant peq ic-so" data-acao="excluirReg" data-c="contatos" data-id="${id}" aria-label="Excluir">${ic('trash')}</button>` }), estreita: true };
  },
  empresa(a, id, aba = 'resumo') {
    const e = empresaDe(a, id); if (!e) return null;
    const pes = a.db.lista('contatos').filter((c) => c.empresa === id), ns = a.db.lista('negocios').filter((n) => n.empresa === id);
    const corpo = aba === 'resumo' ? `<div class="gav-sec">${props([['tag', 'Segmento', esc(e.segmento || '—')], ['map-pin', 'Cidade', esc(e.cidade || '—')], ['users', 'Funcionários', e.funcionarios ? num(e.funcionarios) : null], ['phone', 'Telefone', esc(e.telefone || '—')], ['globe', 'Site', e.site ? `<a href="https://${esc(e.site)}" target="_blank" rel="noopener">${esc(e.site)}</a>` : null], ['user-circle', 'Responsável', esc(nomeV(e.dono))], ['trophy', 'Já comprou', moeda(soma(ns.filter((n) => n.status === 'ganho'), (n) => n.valor))]])}</div>
      <div class="gav-sec"><h4>Pessoas</h4>${pes.length ? `<ul class="lista" style="margin:0 -20px">${pes.map((c) => `<li class="clicavel" data-abrir="pessoa:${c.id}">${av(c.nome)}<div><div class="t">${esc(c.nome)}</div><div class="s">${esc(c.cargo || '')}</div></div></li>`).join('')}</ul>` : vazio('user', 'Ninguém cadastrado')}</div>
      <div class="gav-sec"><h4>Negócios</h4>${ns.length ? `<ul class="lista" style="margin:0 -20px">${ns.map((n) => `<li class="clicavel" data-abrir="negocio:${n.id}"><div class="cresce"><div class="t corta">${esc(n.titulo)}</div><div class="s">${dataCurta(n.fechado || n.previsao)}</div></div>${etStatus(n)}<b class="num" style="min-width:90px;text-align:right">${moeda(n.valor)}</b></li>`).join('')}</ul>` : vazio('handshake', 'Nenhum negócio')}</div>`
      : `<div class="gav-sec">${compositor(`empresas:${id}`)}</div><div class="gav-sec">${linhaDoTempo(linhaDoTempoDe(a, `empresas:${id}`, (x) => ns.some((n) => n.id === x.negocio)))}</div>`;
    return { html: ficha({ tipo: 'Empresa', icone: 'buildings', titulo: esc(e.nome), avatar: av(e.nome, 'gg'), sub: `${esc(e.segmento || '')} · ${esc(e.cidade || '')}`, aba, abas: [['resumo', 'Resumo'], ['tempo', 'Linha do tempo']], corpo,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarReg" data-c="empresas" data-id="${id}">${ic('pencil-simple')}Editar</button><button type="button" class="btn fant peq ic-so" data-acao="excluirReg" data-c="empresas" data-id="${id}" aria-label="Excluir">${ic('trash')}</button>` }), estreita: true };
  },
  atividade(a, id) {
    const x = a.db.obter('atividades', id); if (!x) return null;
    const n = a.db.obter('negocios', x.negocio); const [nomeT, icone] = TIPOS[x.tipo] || TIPOS.tarefa;
    return { estreita: true, html: ficha({ tipo: nomeT, icone, titulo: esc(x.titulo), sub: `${esc(dataHoraBR(x.quando))} · ${x.duracao || 30} min`, corpo: `<div class="gav-sec">${props([['handshake', 'Negócio', n ? `<a href="javascript:void 0" data-abrir="negocio:${n.id}">${esc(n.titulo)}</a>` : null], ['user-circle', 'Responsável', esc(nomeV(x.responsavel))], ['check-circle', 'Situação', x.feita ? et('Concluída', 'ok') : diasAte(x.quando) < 0 ? et('Atrasada', 'er') : et('A fazer', 'info')], ['note-pencil', 'Observação', x.nota ? esc(x.nota) : null], x.resultado ? ['chat-circle-text', 'Resultado', esc(x.resultado)] : null])}</div>`,
      acoes: `${x.feita ? '' : `<button type="button" class="btn ok pri peq" data-acao="concluirFicha" data-id="${id}">${ic('check')}Concluir</button>`}<button type="button" class="btn fant peq" data-acao="editarReg" data-c="atividades" data-id="${id}">${ic('pencil-simple')}Editar</button><button type="button" class="btn fant peq ic-so" data-acao="excluirReg" data-c="atividades" data-id="${id}" aria-label="Excluir">${ic('trash')}</button>` }) };
  },
};

// ---------------------------------------------------------------- ações
async function escolher(titulo, opcoes) {
  return modal({ titulo, largura: 400, corpo: `<label class="campo">${esc(titulo)}<select data-esc>${opcoes.map(([v, r]) => `<option value="${esc(v)}">${esc(r)}</option>`).join('')}</select></label>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Confirmar', classe: 'pri', acao: (f) => f.querySelector('[data-esc]').value }] });
}
async function novaAtividade(a, extra = {}) { const x = await editar(a, 'atividades', null, extra); if (x) { if (x.negocio) a.db.registrar(`negocios:${x.negocio}`, `Atividade agendada: ${x.titulo}`, { icone: 'calendar-plus' }); a.render(); a.reabrir(); } }

const app = criarApp({
  id: 'crm', nome: 'Veltria CRM', sub: 'Vendas', cor: '#5b4fe0', icone: 'handshake', empresa: 'Solar Sistemas Ltda', conta: 'Equipe comercial · 3 pessoas',
  produto: { mensal: 99 }, semente, colecoes, fichas, buscaDica: 'negócios, pessoas, empresas',
  portal: {
    proposta: {
      explica: 'A proposta abre no celular do cliente, com os itens, o total e o botão de aceite. Você recebe aviso quando ele abre e quando aceita.',
      montar: (a, id) => {
        const n = a.db.obter('negocios', id); if (!n) return null; const em = empresaDe(a, n.empresa), c = contatoDe(a, n.contato);
        const itens = (n.itens || []).map((x) => ({ nome: x.produto, qtd: x.qtd, preco: Math.round(x.preco * (1 - (x.desc || 0) / 100) * 100) / 100 }));
        return { numero: numProposta(id), titulo: n.titulo, cliente: em?.nome || c?.nome || '', itens: itens.length ? itens : [{ nome: n.titulo, qtd: 1, preco: n.valor }], desconto: 0, total: itens.length ? totalItens(n.itens) : n.valor,
          validade: n.proposta_validade || diaMais(15), condicoes: a.db.cfg.condicoes || CONDICOES, vendedor: nomeV(n.responsavel), status: n.status === 'ganho' ? 'aceita' : 'aberta' };
      },
      responder: (a, r) => {
        const n = a.db.obter('negocios', r.ref); if (!n) return '';
        const quem = contatoDe(a, n.contato)?.nome?.split(' ')[0] || empresaDe(a, n.empresa)?.nome || 'O cliente';
        if (r.acao === 'abriu') { a.db.salvar('negocios', { id: n.id, proposta_aberta: r.criado.slice(0, 16), proposta_aberturas: (n.proposta_aberturas || 0) + 1 }); a.db.registrar(`negocios:${n.id}`, 'Cliente abriu a proposta online', { icone: 'eye', tom: 'acc' }); return `${quem} abriu a proposta "${n.titulo}"`; }
        if (r.acao === 'aceitar' && n.status === 'aberto') {
          a.db.salvar('negocios', { id: n.id, status: 'ganho', fechado: hoje(), aceite: { nome: String(r.dados.nome || '').slice(0, 120), documento: String(r.dados.documento || '').slice(0, 30), quando: r.criado.slice(0, 16) } });
          a.db.registrar(`negocios:${n.id}`, `Proposta aceita online por ${String(r.dados.nome || '').slice(0, 80)} (${String(r.dados.documento || '').slice(0, 30)})`, { icone: 'trophy', tom: 'ok' });
          return `Proposta aceita! ${n.titulo} · ${moeda(n.valor)}`;
        }
        if (r.acao === 'duvida') {
          a.db.salvar('atividades', { tipo: 'whatsapp', titulo: `Responder dúvida da proposta: ${String(r.dados.texto || '').slice(0, 90)}`, negocio: n.id, contato: n.contato, responsavel: n.responsavel, quando: agoraISO(), duracao: 15, feita: false });
          a.db.registrar(`negocios:${n.id}`, `Dúvida enviada pela proposta online: ${String(r.dados.texto || '').slice(0, 300)}`, { icone: 'chat-circle', tom: 'acc' });
          return `${quem} mandou uma dúvida sobre a proposta "${n.titulo}"`;
        }
        return '';
      },
    },
  },
  modelos: [
    { id: 'servicos', nome: 'Serviços B2B', desc: 'Consultoria, manutenção, terceirização', dados: { produtos: [['Diagnóstico inicial', 'SRV-01', 1500], ['Pacote mensal de serviços', 'SRV-02', 3200], ['Hora técnica extra', 'SRV-03', 180]].map(([nome, codigo, preco]) => ({ nome, codigo, preco })) } },
    { id: 'agencia', nome: 'Agência de marketing', desc: 'Gestão de redes, tráfego pago e sites', dados: { produtos: [['Gestão de redes sociais (mensal)', 'AG-01', 1800], ['Gestão de tráfego pago (mensal)', 'AG-02', 1500], ['Site institucional', 'AG-03', 3900], ['Identidade visual', 'AG-04', 2400]].map(([nome, codigo, preco]) => ({ nome, codigo, preco })) } },
    { id: 'software', nome: 'Software e assinaturas', desc: 'Planos mensais, implantação e treinamento', dados: { produtos: [['Plano Essencial (mensal)', 'SW-01', 299], ['Plano Profissional (mensal)', 'SW-02', 599], ['Implantação', 'SW-03', 2500], ['Treinamento da equipe', 'SW-04', 900]].map(([nome, codigo, preco]) => ({ nome, codigo, preco })) } },
    { id: 'industria', nome: 'Indústria e distribuição', desc: 'Pedidos recorrentes, tabelas e representantes', dados: { produtos: [['Lote padrão', 'IND-01', 12000], ['Frete dedicado', 'IND-02', 1800]].map(([nome, codigo, preco]) => ({ nome, codigo, preco })) } },
  ],
  passos: (a) => [{ id: 'proposta', rot: 'Mande uma proposta online para um cliente', feito: Object.keys(a.db.cfg.links || {}).some((k) => k.startsWith('proposta:')) }, { id: 'seq', rot: 'Crie uma sequência de retornos num negócio', feito: !!a.db.cfg.usou_sequencia }],
  equipe: VEND.map(([, n, p]) => [n, p]),
  busca: [
    { colecao: 'negocios', grupo: 'Negócios', icone: 'handshake', ficha: 'negocio', rot: (n) => n.titulo, sub: (n) => moeda(n.valor) },
    { colecao: 'contatos', grupo: 'Pessoas', icone: 'user', ficha: 'pessoa', rot: (c) => c.nome, sub: (c, a) => empresaDe(a, c.empresa)?.nome || '' },
    { colecao: 'empresas', grupo: 'Empresas', icone: 'buildings', ficha: 'empresa', rot: (e) => e.nome, sub: (e) => e.cidade },
  ],
  comandos: [{ rot: 'Novo negócio', icone: 'plus', acao: (a) => a.acoes.novoNegocio({}) }, { rot: 'Agendar atividade', icone: 'calendar-plus', acao: (a) => novaAtividade(a) }, { rot: 'Nova pessoa', icone: 'user-plus', acao: (a) => a.acoes.novaPessoa() }],
  paginas: [
    { id: 'inicio', rot: 'Início', icone: 'house', titulo: 'Início', render: inicio, atalho: 'i' },
    { grupo: 'Vendas' },
    { id: 'funil', rot: 'Funil', icone: 'kanban', titulo: 'Funil de vendas', render: funil, cheio: true, atalho: 'f', novo: (a) => a.acoes.novoNegocio({}), acoes: () => `<button type="button" class="btn pri" data-acao="novoNegocio">${ic('plus')}<span class="so-larga">Novo negócio</span></button>`,
      cont: (a) => { const n = abertos(a).filter((x) => parado(a, x)).length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'negocios', rot: 'Negócios', icone: 'handshake', render: negocios, atalho: 'n', novo: (a) => a.acoes.novoNegocio({}) },
    { id: 'atividades', rot: 'Atividades', icone: 'calendar-check', render: atividades, atalho: 'a', novo: (a) => novaAtividade(a), cont: (a) => { const n = a.db.lista('atividades').filter((x) => !x.feita && diasAte(x.quando) <= 0).length; return n ? { n, tom: a.db.lista('atividades').some((x) => !x.feita && diasAte(x.quando) < 0) ? 'er' : '' } : 0; } },
    { id: 'previsao', rot: 'Previsão', icone: 'chart-line-up', titulo: 'Previsão de vendas', render: previsao, cheio: true },
    { grupo: 'Clientes' },
    { id: 'pessoas', rot: 'Pessoas', icone: 'users', render: pessoas, atalho: 'p', novo: (a) => a.acoes.novaPessoa() },
    { id: 'empresas', rot: 'Empresas', icone: 'buildings', render: empresas, atalho: 'e', novo: (a) => a.acoes.novaEmpresa() },
    { grupo: 'Gestão' },
    { id: 'relatorios', rot: 'Relatórios', icone: 'chart-bar', render: relatorios, atalho: 'r' },
    { id: 'metas', rot: 'Metas', icone: 'target', titulo: 'Metas de vendas', render: metas },
    { id: 'produtos', rot: 'Produtos', icone: 'package', titulo: 'Produtos e serviços', render: produtos },
    paginaEquipe(EQUIPE),
    ...ferramentaPaginas(FERR, FERR_ITENS),
  ],
});

Object.assign(app.acoes, {
  novoNegocio: async (d = {}) => { const extra = {}; if (d.contato) { const c = contatoDe(app, d.contato); extra.contato = c.id; extra.empresa = c.empresa; } const n = await editar(app, 'negocios', null, extra); if (n) { app.render(); app.abrir('negocio', n.id); } },
  novaPessoa: async () => { if (await editar(app, 'contatos')) app.render(); },
  novaEmpresa: async () => { if (await editar(app, 'empresas')) app.render(); },
  novoProduto: async () => { if (await editar(app, 'produtos')) app.render(); },
  novaAtividade: (d = {}) => novaAtividade(app, d.negocio ? { negocio: d.negocio } : {}),
  filtroVend: (d) => { app.estado.funil.vend = d.v; app.render(); },
  modoAtiv: (d) => { app.estado.ativ.modo = d.m; app.render(); },
  semanaAtiv: (d) => { app.estado.ativ.semana = Number(d.d) === 0 ? 0 : app.estado.ativ.semana + Number(d.d); app.render(); },
  periodoRel: (d) => { app.estado.rel.periodo = Number(d.m); app.render(); },
  imprimirPagina: () => window.print(),
  concluirAtiv: (d, el) => { const x = app.db.obter('atividades', d.id); app.db.salvar('atividades', { id: d.id, feita: el.checked, feita_em: el.checked ? agoraISO() : null }); if (el.checked) { avisar('Atividade concluída', { desfazer: () => { app.db.salvar('atividades', { id: d.id, feita: false }); app.render(); app.reabrir(); } }); if (x.negocio && !app.db.lista('atividades').some((y) => y.negocio === x.negocio && !y.feita)) setTimeout(() => avisar('Esse negócio ficou sem próximo passo. Agende a próxima atividade.', { tipo: 'erro' }), 400); } app.render(); app.reabrir(); },
  concluirFicha: (d) => { app.db.salvar('atividades', { id: d.id, feita: true, feita_em: agoraISO() }); avisar('Atividade concluída'); app.render(); app.reabrir(); },
  salvarNota: (d) => { const t = document.querySelector('.gaveta [data-nota-txt]'); const v = t?.value.trim(); if (!v) return t?.focus(); app.db.salvar('notas', { alvo: d.alvo, texto: v, autor: EU, quando: agoraISO() }); avisar('Nota salva'); app.reabrir(); },
  mudarEtapa: (d) => { const n = app.db.obter('negocios', d.id); if (n.etapa === d.e) return; if (app.kanbans.funil) app.kanbans.funil(d.id, d.e); else app.db.salvar('negocios', { id: d.id, etapa: d.e, etapa_desde: hoje() }); app.render(); app.reabrir(); },
  ganhar: (d) => { const n = app.db.obter('negocios', d.id); app.db.salvar('negocios', { id: d.id, status: 'ganho', fechado: hoje() }); app.db.registrar(`negocios:${d.id}`, 'Negócio ganho', { icone: 'trophy', tom: 'ok' }); avisar(`Ganho! ${moeda(n.valor)} somados ao mês`, { desfazer: () => { app.db.salvar('negocios', { id: d.id, status: 'aberto', fechado: null }); app.render(); } }); app.render(); app.reabrir(); },
  perder: async (d) => { const m = await escolher('Por que perdemos este negócio?', MOTIVOS.map((x) => [x, x])); if (!m) return; app.db.salvar('negocios', { id: d.id, status: 'perdido', motivo: m, fechado: hoje() }); app.db.registrar(`negocios:${d.id}`, `Negócio perdido: ${m}`, { icone: 'x-circle', tom: 'er' }); avisar('Negócio marcado como perdido'); app.render(); app.reabrir(); },
  reabrir: (d) => { app.db.salvar('negocios', { id: d.id, status: 'aberto', fechado: null, motivo: null, etapa_desde: hoje() }); app.db.registrar(`negocios:${d.id}`, 'Negócio reaberto', { icone: 'arrow-counter-clockwise' }); app.render(); app.reabrir(); },
  addItem: async (d) => {
    const ps = app.db.lista('produtos');
    const r = await modal({ titulo: 'Adicionar produto', largura: 480, corpo: `<form class="form-grade" onsubmit="return false"><label class="campo largo">Produto<select name="p">${ps.map((p, i) => `<option value="${i}">${esc(p.nome)} · ${moeda(p.preco)}</option>`).join('')}</select></label><label class="campo">Quantidade<input name="q" type="number" min="1" value="1"></label><label class="campo">Desconto (%)<input name="d" type="number" min="0" max="100" value="0"></label></form>`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Adicionar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
    if (!r) return;
    const n = app.db.obter('negocios', d.id), p = ps[Number(r.p)];
    const itens = [...(n.itens || []), { produto: p.nome, qtd: Number(r.q) || 1, preco: p.preco, desc: Number(r.d) || 0 }];
    app.db.salvar('negocios', { id: d.id, itens, valor: totalItens(itens) }); avisar('Produto adicionado · valor atualizado'); app.render(); app.reabrir();
  },
  tirarItem: (d) => { const n = app.db.obter('negocios', d.id); const itens = (n.itens || []).filter((_, i) => i !== Number(d.i)); app.db.salvar('negocios', { id: d.id, itens, valor: itens.length ? totalItens(itens) : n.valor }); app.render(); app.reabrir(); },
  propostaOnline: (d) => { const n = app.db.obter('negocios', d.id), c = contatoDe(app, n.contato); if (!n.proposta_validade) app.db.salvar('negocios', { id: d.id, proposta_validade: diaMais(15) }); app.portal.compartilhar('proposta', d.id, { titulo: `Proposta online · ${n.titulo}`, telefone: c?.telefone, texto: `Olá, ${c?.nome?.split(' ')[0] || ''}! Segue a proposta da ${app.empresa}. Você pode ver os detalhes e aceitar por aqui:` }); },
  sequencia: async (d) => {
    const n = app.db.obter('negocios', d.id);
    const r = await modal({ titulo: 'Sequência de retornos', largura: 520, corpo: `<p class="mute-2" style="margin-bottom:10px">Cria as próximas atividades de uma vez, com as datas certas, para ninguém esquecer de voltar ao cliente.</p>${Object.entries(SEQUENCIAS).map(([k, [nm, passos]], i) => `<label class="opcao-inicio"><input type="radio" name="seq" value="${k}" ${i === 0 ? 'checked' : ''}><span><b>${nm}</b><small>${passos.map(([dd, t, tt]) => `dia ${dd}: ${tt}`).join(' · ')}</small></span></label>`).join('')}`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Criar atividades', classe: 'pri', acao: (f) => f.querySelector('[name=seq]:checked').value }] });
    if (!r) return; const [, passos] = SEQUENCIAS[r];
    passos.forEach(([dd, tipo, titulo]) => app.db.salvar('atividades', { tipo, titulo, negocio: n.id, contato: n.contato, responsavel: n.responsavel, quando: `${diaMais(dd)}T10:00`, duracao: 30, feita: false }));
    app.db.cfg.usou_sequencia = true; app.db.gravar(); app.db.registrar(`negocios:${n.id}`, `Sequência "${SEQUENCIAS[r][0]}" criada (${passos.length} atividades)`, { icone: 'list-plus' });
    avisar(`${passos.length} atividades agendadas`); app.render(); app.reabrir();
  },
  proposta: async (d) => {
    const n = app.db.obter('negocios', d.id), em = empresaDe(app, n.empresa), c = contatoDe(app, n.contato), cfg = app.db.cfg;
    const doc = `<div class="doc"><div class="entre" style="align-items:flex-start"><div><h1>Proposta comercial</h1><div style="color:#555;margin-top:4px">Nº ${String(Math.abs(d.id.split('').reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7)) % 9000 + 1000)} · ${dataCurta(hoje())} · válida por 15 dias</div></div><div style="text-align:right"><b>${esc(app.empresa)}</b><div style="color:#555">${esc(cfg.cnpj || '12.345.678/0001-90')}<br>${esc(cfg.telefone || '(11) 4002-8922')}</div></div></div>
      <h2>Para</h2><div><b>${esc(em?.nome || '')}</b>${c ? `<br>A/C ${esc(c.nome)} · ${esc(c.cargo || '')}<br>${esc(c.email || '')}` : ''}</div>
      <h2>Itens</h2><table><thead><tr><th>Descrição</th><th class="n">Qtd.</th><th class="n">Unitário</th><th class="n">Desconto</th><th class="n">Total</th></tr></thead><tbody>${(n.itens || []).map((x) => `<tr><td>${esc(x.produto)}</td><td class="n">${x.qtd}</td><td class="n">${moeda(x.preco)}</td><td class="n">${x.desc ? pct(x.desc) : '—'}</td><td class="n">${moeda(x.qtd * x.preco * (1 - (x.desc || 0) / 100))}</td></tr>`).join('')}<tr><td colspan="4" style="text-align:right"><b>Total</b></td><td class="n"><b>${moeda(totalItens(n.itens))}</b></td></tr></tbody></table>
      <h2>Condições</h2><div>Pagamento em até 3x no boleto ou PIX à vista. Implantação em até 10 dias úteis após o aceite. Suporte por e-mail e WhatsApp em horário comercial.</div>
      <div class="ass"><div>${esc(nomeV(n.responsavel))}<br>${esc(app.empresa)}</div><div>${esc(c?.nome || 'Cliente')}<br>${esc(em?.nome || '')}</div></div></div>`;
    await modal({ titulo: 'Proposta comercial', largura: 860, corpo: `<div style="background:var(--lateral);padding:16px;border-radius:8px;max-height:62vh;overflow:auto">${doc}</div>`, botoes: [{ rotulo: 'Fechar', valor: null, classe: 'fant' }, { rotulo: 'Imprimir ou salvar PDF', icone: 'printer', classe: 'pri', acao: () => { imprimir(doc); app.db.registrar(`negocios:${d.id}`, 'Proposta gerada', { icone: 'file-text', tom: 'acc' }); return true; } }] });
    app.reabrir();
  },
  menuNegocio: (d, el) => pop(el, [
    { rotulo: 'Editar', icone: 'pencil-simple', acao: async () => { if (await editar(app, 'negocios', app.db.obter('negocios', d.id))) { app.render(); app.reabrir(); } } },
    { rotulo: 'Agendar atividade', icone: 'calendar-plus', acao: () => novaAtividade(app, { negocio: d.id }) },
    { rotulo: 'Gerar proposta', icone: 'file-text', acao: () => app.acoes.proposta(d) },
    { sep: true },
    { rotulo: 'Excluir negócio', icone: 'trash', perigo: true, acao: () => excluir(app, 'negocios', d.id) },
  ]),
  editarReg: async (d) => { if (await editar(app, d.c, app.db.obter(d.c, d.id))) { app.render(); app.reabrir(); } },
  excluirReg: (d) => excluir(app, d.c, d.id),
  salvarMeta: (d, el) => { const l = app.db.lista('metas'); const m = l.find((x) => x.vendedor === d.v && x.mes === d.m); if (m) app.db.salvar('metas', { id: m.id, valor: Number(el.value) || 0 }); else app.db.salvar('metas', { vendedor: d.v, mes: d.m, valor: Number(el.value) || 0 }); avisar(`Meta de ${nomeV(d.v)} salva`); app.render(); },
});

// ferramentas no menu da esquerda (WhatsApp e copiar); avisos e mensagens prontas: plano Pro
equipeViva(app, EQUIPE);
Object.assign(app.acoes, acoesLado());
app.travarLado = travarPro;
