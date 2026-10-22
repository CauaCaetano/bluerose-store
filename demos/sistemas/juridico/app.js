// Veltria Jurídico · escritórios de advocacia (referências: Astrea, ADVBOX, Projuris, Clio)
import {
  criarApp, esc, moeda, moedaC, num, pct, hoje, agoraISO, diaMais, mesMais, nomeMes, dataCurta, dataBR, dataHoraBR, relativo, horaBR, diasAte, diasEntre, paraData,
  sorteio, soma, agrupar, av, ic, et, prog, telLink, kpis, barras, rosca, barrasH, kanban, calMes, DIAS, DIAS_L, diaUtil, nomeFeriado, fimDeSemana, normal,
  modal, confirmar, avisar, editar, excluir, ficha, props, linhaDoTempo, vazio, pop, imprimir, fecharGaveta,
} from '../base/nexo.js';
import { LADOS as FERR, ITENS as FERR_ITENS } from './ferramentas.js';
import { acoesLado, ferramentaPaginas, travarPro } from '../base/lado.js';
import { equipeViva, paginaEquipe } from '../base/equipe-viva.js';

const ADV = [['paulo', 'Dr. Paulo Moura', 'Sócio · OAB/MG 98.412', 450], ['ana', 'Dra. Ana Castro', 'Sócia · OAB/MG 101.337', 450], ['lia', 'Dra. Lia Fontes', 'Associada · OAB/MG 187.205', 300], ['rafael', 'Rafael Teles', 'Estagiário · controladoria', 120]];
const EQUIPE = { colecao: 'advogados', rot: 'Advogados', icone: 'scales', singular: 'advogado', plural: 'advogados', vazio: 'os advogados do escritório', lista: ADV,
  campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true }, { nome: 'cargo', rotulo: 'Cargo e OAB', tipo: 'texto' }, { nome: 'valor_hora', rotulo: 'Valor da hora', tipo: 'moeda', padrao: 300 }],
  linha: (r) => [r.id, r.nome, r.cargo || '', Number(r.valor_hora || 0)], registro: ([id, nome, cargo, valor_hora]) => ({ id, nome, cargo, valor_hora }) };
const padraoEquipe = (eu) => (ADV.find((x) => x[0] === eu) || ADV[0] || [''])[0];
const nomeA = (id) => (ADV.find((x) => x[0] === id) || [, '—'])[1];
const valorHora = (id) => (ADV.find((x) => x[0] === id) || [, , , 300])[3];
const EU = 'ana';
const AREAS = ['Cível', 'Trabalhista', 'Família', 'Consumidor', 'Previdenciário', 'Tributário', 'Empresarial'];
const COR_AREA = { 'Cível': '#6366f1', 'Trabalhista': '#0ea5e9', 'Família': '#e11d48', 'Consumidor': '#f59e0b', 'Previdenciário': '#14b8a6', 'Tributário': '#64748b', 'Empresarial': '#8b5cf6' };
const FASES = ['Inicial', 'Conhecimento', 'Instrução', 'Sentença', 'Recursal', 'Execução', 'Encerrado'];
const TIPOS_PRAZO = { prazo: ['Prazo', 'hourglass', '#dc2626'], audiencia: ['Audiência', 'gavel', '#7c3aed'], pericia: ['Perícia', 'magnifying-glass', '#0ea5e9'], reuniao: ['Reunião', 'users', '#16a34a'] };
const COLUNAS_TAREFA = [['afazer', 'A fazer', '#94a3b8'], ['fazendo', 'Fazendo', '#3b82f6'], ['revisao', 'Em revisão', '#f59e0b'], ['feita', 'Concluída', '#16a34a']];

// ---------------------------------------------------------------- prazos processuais (CPC: dias úteis, art. 219; recesso forense, art. 220)
const recesso = (d) => { const md = d.slice(5); return md >= '12-20' || md <= '01-20'; };
const contaDia = (d) => diaUtil(d) && !recesso(d);
const proxUtil = (d) => { let x = d; while (!contaDia(x)) x = diaMais(1, x); return x; };
const motivo = (d) => (recesso(d) ? 'recesso forense' : nomeFeriado(d) || (fimDeSemana(d) ? DIAS_L[paraData(d).getDay()] : ''));
function calcPrazo(disp, dias, uteis = true) {
  const pub = proxUtil(diaMais(1, disp));
  let d = pub, n = 0; const pulados = [];
  while (n < dias) { d = diaMais(1, d); if (!uteis || contaDia(d)) n++; else pulados.push(d); }
  const ajustou = !contaDia(d); if (ajustou) { while (!contaDia(d)) { pulados.push(d); d = diaMais(1, d); } }
  return { disp, pub, inicio: uteis ? proxUtil(diaMais(1, pub)) : diaMais(1, pub), fim: d, pulados, uteis, dias };
}
const uteisAte = (d) => { if (d < hoje()) return -1; let n = 0, x = hoje(); while (x < d) { x = diaMais(1, x); if (contaDia(x)) n++; } return n; };

// ---------------------------------------------------------------- DJEN: captura das intimações (API pública do CNJ, sem chave)
// a consulta passa por uma função do Supabase (o DJEN não aceita chamadas direto do navegador)
const DJEN = 'https://yihnfzwtkqdfnwziutqa.supabase.co/functions/v1/nexo-djen';
const soDigitos = (s) => String(s || '').replace(/\D/g, '');
const limparTexto = (html) => { const d = new DOMParser().parseFromString(String(html || '').replace(/<br\s*\/?>/gi, '\n'), 'text/html'); return (d.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim(); };
async function capturarDJEN(a, { silencioso = false } = {}) {
  const oabs = a.db.cfg.oabs || [];
  if (!oabs.length) { if (!silencioso) avisar('Cadastre as OABs da equipe em Configurações para capturar as intimações', { tipo: 'erro' }); return 0; }
  const fim = hoje(), ini = [a.db.cfg.djen_ultima ? diaMais(-2, a.db.cfg.djen_ultima) : diaMais(-15), diaMais(-60)].sort().pop();
  const pubs = a.db.lista('publicacoes'), ja = new Set(pubs.map((x) => x.djen_id).filter(Boolean));
  const porNumero = new Map(a.db.lista('processos').map((p) => [soDigitos(p.numero), p.id]));
  let novas = 0;
  for (const o of oabs) {
    for (let pag = 1; pag <= 20; pag++) {
      const q = new URLSearchParams({ numeroOab: soDigitos(o.numero), ufOab: o.uf, dataDisponibilizacaoInicio: ini, dataDisponibilizacaoFim: fim, pagina: String(pag) });
      const r = await fetch(`${DJEN}?${q}`); if (!r.ok) throw new Error(`DJEN respondeu ${r.status}`);
      const d = await r.json(); const itens = d.items || [];
      for (const it of itens) {
        if (ja.has(it.id)) continue; ja.add(it.id);
        pubs.unshift({ id: `djen${it.id}`, djen_id: it.id, processo: porNumero.get(soDigitos(it.numero_processo)) || null, numero: it.numeroprocessocommascara || it.numero_processo, data: it.data_disponibilizacao,
          diario: `DJEN · ${it.siglaTribunal} · ${it.nomeOrgao || ''}`.trim(), tipo: it.tipoComunicacao, texto: limparTexto(it.texto).slice(0, 6000), link: it.link || '', status: 'nova', advogado: o.advogado || '' });
        novas++;
      }
      if (itens.length < 100) break;
    }
  }
  a.db.cfg.djen_ultima = fim; a.db.gravar();
  if (!silencioso || novas) avisar(novas ? `${novas} intimações novas capturadas do DJEN` : 'Nenhuma intimação nova no DJEN');
  return novas;
}

// ---------------------------------------------------------------- dados de exemplo (fictícios)
function semente() {
  const r = sorteio(20261011), esc1 = (l) => l[Math.floor(r() * l.length)], ent = (a, b) => a + Math.floor(r() * (b - a + 1));
  const clientes = [
    ['Marcos Antônio Silva', 'PF'], ['Supermercado Boa Compra Ltda', 'PJ'], ['Juliana Ferreira Lopes', 'PF'], ['Roberto Carlos Nunes', 'PF'], ['Construtora Alicerce S/A', 'PJ'], ['Clínica Odonto Vida Ltda', 'PJ'],
    ['Fernanda Oliveira Ramos', 'PF'], ['Transportes Rodovale Ltda', 'PJ'], ['José Pereira da Costa', 'PF'], ['Cláudia Regina Fausto', 'PF'], ['Auto Peças Minas Ltda', 'PJ'], ['Antônio Sérgio Barbosa', 'PF'],
    ['Padaria Pão Nosso ME', 'PJ'], ['Luciana Martins Campos', 'PF'], ['Indústria Metalúrgica Forte', 'PJ'],
  ].map(([nome, tipo], i) => ({ id: `cl${i}`, nome, tipo, doc: tipo === 'PF' ? `${String(100 + i * 37).padStart(3, '0')}.${String(200 + i * 11).slice(0, 3)}.${String(300 + i * 7).slice(0, 3)}-${String(10 + i).slice(-2)}` : `${10 + i}.${String(345 + i * 3).slice(0, 3)}.${String(678 + i).slice(0, 3)}/0001-${String(20 + i * 3).slice(-2)}`,
    telefone: `(31) 9${8400 + i * 23}-${1200 + i * 47}`, email: `${normal(nome.split(' ')[0])}@${tipo === 'PJ' ? normal(nome.split(' ').slice(0, 2).join('')).replace(/[^a-z]/g, '') + '.com.br' : 'email.com'}`, cidade: esc1(['Belo Horizonte/MG', 'Contagem/MG', 'Betim/MG', 'Nova Lima/MG']), origem: esc1(['Indicação de cliente', 'Google', 'Instagram', 'Indicação de colega', 'Site']), responsavel: ADV[i % 3][0], desde: diaMais(-ent(60, 1400)) }));
  const acoes = {
    'Cível': ['Ação de cobrança', 'Indenização por danos materiais', 'Rescisão contratual', 'Ação monitória'], 'Trabalhista': ['Reclamação trabalhista', 'Defesa em reclamatória', 'Ação de horas extras'],
    'Família': ['Divórcio consensual', 'Ação de alimentos', 'Guarda compartilhada', 'Inventário'], 'Consumidor': ['Indenização por negativação indevida', 'Revisão de contrato bancário', 'Vício do produto'],
    'Previdenciário': ['Aposentadoria por tempo de contribuição', 'Auxílio por incapacidade', 'Revisão de benefício'], 'Tributário': ['Mandado de segurança', 'Execução fiscal (defesa)', 'Repetição de indébito'], 'Empresarial': ['Recuperação de crédito', 'Dissolução parcial de sociedade'],
  };
  const varas = { 'Cível': 'ª Vara Cível de Belo Horizonte', 'Trabalhista': 'ª Vara do Trabalho de Belo Horizonte', 'Família': 'ª Vara de Família de Belo Horizonte', 'Consumidor': 'º Juizado Especial Cível', 'Previdenciário': 'ª Vara Federal Previdenciária', 'Tributário': 'ª Vara de Fazenda Pública', 'Empresarial': 'ª Vara Empresarial' };
  const contrarias = ['Banco Atlântico S/A', 'INSS', 'Município de Belo Horizonte', 'Operadora Telefônica Brasil S/A', 'Seguradora Proteção', 'Comercial Vale Verde Ltda', 'Estado de Minas Gerais', 'João Batista Ramos', 'Fazenda Nacional', 'Loja Magazine Central'];
  const processos = [];
  for (let i = 0; i < 30; i++) {
    const area = AREAS[i % AREAS.length], c = clientes[(i * 4 + 1) % clientes.length], ano = 2021 + (i % 5);
    const tr = area === 'Trabalhista' ? '5.03' : ['Previdenciário', 'Tributário'].includes(area) && i % 2 ? '4.01' : '8.13';
    const fase = i > 25 ? 'Encerrado' : esc1(FASES.slice(0, 6));
    processos.push({ id: `p${i}`, numero: `${String(5000000 + ent(1000, 999999)).slice(0, 7)}-${String(ent(10, 99))}.${ano}.${tr}.${String(ent(20, 990)).padStart(4, '0')}`, acao: esc1(acoes[area]), area, cliente: c.id,
      contraria: area === 'Previdenciário' ? 'INSS' : esc1(contrarias), polo: esc1(['Autor', 'Autor', 'Réu']), vara: `${ent(1, 34)}${varas[area]}`, fase, status: fase === 'Encerrado' ? 'encerrado' : i % 13 === 0 ? 'suspenso' : 'ativo',
      valor: Math.round(ent(8, 480) * 1000), responsavel: ADV[i % 3][0], distribuido: diaMais(-ent(90, 1500)), resultado: fase === 'Encerrado' ? esc1(['Procedente', 'Procedente', 'Acordo', 'Improcedente']) : '', exito: esc1([0, 20, 30]) });
  }
  const textosAnd = ['Juntada de petição da parte contrária', 'Conclusos para despacho', 'Despacho: intimem-se as partes para especificarem provas', 'Audiência de conciliação designada', 'Juntada de laudo pericial', 'Sentença publicada', 'Recebido o recurso de apelação', 'Expedido alvará', 'Decisão: deferida a tutela de urgência', 'Citação realizada'];
  const andamentos = processos.flatMap((p) => Array.from({ length: ent(3, 7) }, (_, j) => ({ processo: p.id, data: diaMais(-ent(2, 380)), texto: esc1(textosAnd), fonte: esc1(['Tribunal', 'Diário Oficial', 'Interno']) })));
  const prazos = [];
  const ativos = processos.filter((p) => p.status === 'ativo');
  const titulosP = ['Contestação', 'Réplica', 'Manifestação sobre laudo', 'Recurso de apelação', 'Contrarrazões', 'Embargos de declaração', 'Especificação de provas', 'Memoriais finais', 'Impugnação ao cálculo'];
  ativos.forEach((p, i) => {
    const d = [-2, 0, 0, 1, 1, 2, 3, 4, 6, 8, 11, 15, 20, 25][i % 14];
    prazos.push({ processo: p.id, tipo: 'prazo', titulo: esc1(titulosP), data: proxUtil(diaMais(d)), responsavel: p.responsavel, status: d < -1 && i % 3 ? 'cumprido' : 'pendente', dias: esc1([5, 15, 15, 15]) });
    if (i % 3 === 0) prazos.push({ processo: p.id, tipo: 'audiencia', titulo: esc1(['Audiência de conciliação', 'Audiência de instrução e julgamento', 'Audiência UNA']), data: proxUtil(diaMais(ent(1, 30))), hora: esc1(['09:00', '10:30', '13:30', '14:00', '15:30']), responsavel: p.responsavel, status: 'pendente', local: p.vara });
    if (i % 7 === 2) prazos.push({ processo: p.id, tipo: 'pericia', titulo: 'Perícia médica', data: proxUtil(diaMais(ent(5, 40))), hora: '08:30', responsavel: p.responsavel, status: 'pendente', local: 'Consultório do perito' });
  });
  for (let i = 0; i < 12; i++) { const p = esc1(processos); prazos.push({ processo: p.id, tipo: 'prazo', titulo: esc1(titulosP), data: diaMais(-ent(5, 90)), responsavel: p.responsavel, status: 'cumprido', dias: 15 }); }
  const publicacoes = ativos.slice(0, 7).map((p, i) => ({ processo: p.id, numero: p.numero, data: diaMais(-[0, 0, 1, 1, 2, 3, 4][i]), diario: p.numero.includes('.5.03.') ? 'DEJT · TRT da 3ª Região' : p.numero.includes('.4.01.') ? 'DJe · TRF da 1ª Região' : 'DJe · TJMG', status: i < 5 ? 'nova' : 'tratada',
    texto: [`Fica a parte autora intimada para, no prazo de 15 (quinze) dias, manifestar-se sobre a contestação e documentos juntados.`, `Intimem-se as partes para, no prazo comum de 15 (quinze) dias, especificarem as provas que pretendem produzir, justificando sua pertinência.`, `Ficam as partes intimadas do laudo pericial juntado aos autos, podendo manifestar-se no prazo comum de 15 (quinze) dias.`, `Intime-se a parte ré para, querendo, apresentar contrarrazões ao recurso de apelação no prazo legal de 15 (quinze) dias.`, `Designo audiência de conciliação para o dia ${dataBR(diaMais(24))}, às 14h00, a ser realizada por videoconferência.`, 'Defiro o pedido de dilação de prazo por mais 10 (dez) dias.', 'Vista à parte autora sobre os embargos de declaração opostos, no prazo de 5 (cinco) dias.'][i] }));
  const tarefas = [
    ['Redigir contestação', 'fazendo', 'lia', 2], ['Revisar petição inicial do inventário', 'revisao', 'paulo', 1], ['Calcular atualização do débito', 'afazer', 'rafael', 4], ['Reunião com cliente sobre acordo', 'afazer', 'ana', 3],
    ['Protocolar recurso de apelação', 'fazendo', 'ana', 6], ['Juntar procuração atualizada', 'afazer', 'rafael', 2], ['Preparar quesitos para perícia', 'revisao', 'lia', 5], ['Pesquisar jurisprudência STJ', 'afazer', 'lia', 9],
    ['Enviar relatório mensal ao cliente', 'feita', 'paulo', -1], ['Emitir guia de custas', 'feita', 'rafael', -2], ['Montar memoriais', 'afazer', 'paulo', 12],
  ].map(([titulo, status, responsavel, d], i) => ({ titulo, status, responsavel, prazo: diaMais(d), processo: ativos[i % ativos.length].id, prioridade: esc1(['alta', 'média', 'média', 'baixa']) }));
  const horas = [];
  for (let d = -45; d <= 0; d++) { const data = diaMais(d); if (!diaUtil(data)) continue; for (const [id] of ADV) { for (let k = 0; k < ent(1, 3); k++) { const p = esc1(ativos); horas.push({ processo: p.id, cliente: p.cliente, advogado: id, data, minutos: esc1([30, 45, 60, 90, 120, 150]), descricao: esc1(['Elaboração de petição', 'Análise de documentos', 'Reunião com cliente', 'Pesquisa de jurisprudência', 'Acompanhamento processual', 'Despacho com o juiz', 'Audiência']), faturavel: r() < 0.75, faturado: d < -30 } ); } } }
  const honorarios = [];
  clientes.forEach((c, i) => {
    if (c.tipo === 'PJ') for (let m = -3; m <= 1; m++) { const v = diaMais(0, `${mesMais(m)}-10`); honorarios.push({ cliente: c.id, descricao: 'Partido mensal (consultoria)', tipo: 'mensal', valor: [2500, 3200, 4800, 1800][i % 4], vencimento: v, status: v < hoje() ? (r() < 0.12 ? 'aberto' : 'recebido') : 'aberto', recebido_em: v < hoje() ? diaMais(ent(0, 4), v) : null }); }
    else { const total = [4500, 6000, 3600, 9000][i % 4], parc = 3; for (let k = 0; k < parc; k++) { const v = diaMais(-60 + k * 30 + i); honorarios.push({ cliente: c.id, descricao: `Honorários contratuais · parcela ${k + 1}/${parc}`, tipo: 'contrato', valor: Math.round(total / parc), vencimento: v, status: v < hoje() ? (r() < 0.18 ? 'aberto' : 'recebido') : 'aberto', recebido_em: v < hoje() ? v : null }); } }
  });
  processos.filter((p) => p.resultado === 'Procedente').forEach((p) => honorarios.push({ cliente: p.cliente, processo: p.id, descricao: `Êxito (${p.exito || 20}%) · ${p.acao}`, tipo: 'exito', valor: Math.round(p.valor * ((p.exito || 20) / 100) * 0.4), vencimento: diaMais(-ent(5, 80)), status: 'recebido', recebido_em: diaMais(-ent(5, 80)) }));
  honorarios.forEach((h) => { if (h.status === 'recebido' && !h.recebido_em) h.recebido_em = h.vencimento; });
  return { _cfg: { empresa: 'Castro & Moura Advogados', endereco: 'Av. Afonso Pena, 1500, sala 1204 · Centro · Belo Horizonte/MG', cnpj: '23.456.789/0001-10', telefone: '(31) 3224-8800' }, clientes, processos, andamentos, prazos, publicacoes, tarefas, horas, honorarios };
}

// ---------------------------------------------------------------- regras
/** Explica uma intimação ou andamento em linguagem simples, para mandar ao cliente. */
function explicar(texto) {
  const t = normal(texto), dt = String(texto).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/), hr = String(texto).match(/(\d{1,2})[:h](\d{2})/);
  const prazo = t.match(/prazo de (\d{1,3})/)?.[1], quando = dt ? `${dt[1].padStart(2, '0')}/${dt[2].padStart(2, '0')}/${dt[3]}${hr ? ` às ${hr[1].padStart(2, '0')}h${hr[2]}` : ''}` : '';
  if (/sentenca/.test(t) && /parcialmente procedente/.test(t)) return 'Saiu a sentença: o juiz deu razão em parte ao pedido. Vamos analisar se vale recorrer da parte que não foi aceita e explicamos os próximos passos.';
  if (/sentenca/.test(t) && /improcedente/.test(t)) return 'Saiu a sentença e, desta vez, o juiz não aceitou o pedido. Ainda cabe recurso: vamos avaliar e conversar com você sobre recorrer.';
  if (/sentenca/.test(t) && /procedente/.test(t)) return 'Boa notícia: saiu a sentença e o juiz deu razão ao pedido. A outra parte ainda pode recorrer; acompanhamos tudo.';
  if (/sentenca/.test(t)) return 'Saiu a sentença do processo. Vamos ler com atenção e explicar o que foi decidido.';
  if (/homolog/.test(t) && /acordo/.test(t)) return 'O juiz aprovou o acordo. Agora é cumprir o que foi combinado; avisamos sobre os pagamentos.';
  if (/audiencia/.test(t) && /(design|marcad|redesign)/.test(t)) return `Foi marcada uma audiência${quando ? ` para ${quando}` : ''}. Vamos combinar com você os detalhes e o que levar.`;
  if (/pericia|perito/.test(t) && /laudo/.test(t)) return 'O perito entregou o laudo. Vamos analisar e, se for o caso, contestar os pontos que não estiverem corretos.';
  if (/pericia|perito/.test(t)) return `Foi determinada uma perícia${quando ? ` (${quando})` : ''}. Avisaremos onde e quando você precisa comparecer, se for necessário.`;
  if (/alvara/.test(t)) return 'Foi expedido o alvará: o dinheiro do processo foi liberado para saque. Vamos orientar você sobre o recebimento.';
  if (/cite-se|citacao/.test(t)) return 'O juiz mandou avisar oficialmente a outra parte sobre o processo (citação). É um passo normal do início.';
  if (/apelac|recurso|agravo/.test(t)) return 'Houve um recurso no processo. Ele vai ser analisado pelo tribunal; acompanhamos e respondemos no prazo.';
  if (/arquiv/.test(t)) return 'O processo foi arquivado. Se tiver alguma dúvida sobre o encerramento, fale com a gente.';
  if (/(intime-se|intimem-se|intimad|manifest|especifi|querendo)/.test(t)) return `O juiz pediu uma manifestação nossa${prazo ? ` em ${prazo} dias` : ''}. Já estamos cuidando disso: você não precisa fazer nada agora.`;
  if (/conclus/.test(t)) return 'O processo foi para o juiz analisar. É uma etapa normal e não depende de você.';
  if (/juntad/.test(t)) return 'Um documento foi anexado ao processo. É uma movimentação de rotina.';
  return 'Houve uma movimentação de rotina no processo. Não há nada que você precise fazer agora.';
}
const proc = (a, id) => a.db.obter('processos', id);
const cli = (a, id) => a.db.obter('clientes', id);
const pend = (a) => a.db.lista('prazos').filter((p) => p.status === 'pendente');
const rotProc = (a, p) => (p ? `${p.acao} · ${cli(a, p.cliente)?.nome.split(' ').slice(0, 2).join(' ') || ''}` : '—');
const urg = (d) => { const u = diasAte(d); return u < 0 ? ['vencido', 'er'] : u === 0 ? ['vence hoje', 'er'] : u === 1 ? ['amanhã', 'al'] : uteisAte(d) <= 3 ? [uteisAte(d) === 1 ? '1 dia útil' : `${uteisAte(d)} dias úteis`, 'al'] : [`em ${u} dias`, '']; };
const etUrg = (p) => (p.status === 'cumprido' ? et('Cumprido', 'ok') : (([t, tom]) => et(t, tom))(urg(p.data)));
const proxPrazo = (a, pid) => pend(a).filter((x) => x.processo === pid).sort((x, y) => x.data.localeCompare(y.data))[0];
const ultAnd = (a, pid) => a.db.lista('andamentos').filter((x) => x.processo === pid).sort((x, y) => y.data.localeCompare(x.data))[0];
const hrs = (min) => `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
const honStatus = (h) => (h.status === 'recebido' ? 'recebido' : h.vencimento < hoje() ? 'atrasado' : 'aberto');
const etHon = (h) => ({ recebido: et('Recebido', 'ok'), atrasado: et('Atrasado', 'er'), aberto: et('A receber', 'info') })[honStatus(h)];
const etArea = (area) => `<span class="et sem-ponto" style="background:color-mix(in srgb,${COR_AREA[area]} 13%,var(--painel));color:${COR_AREA[area]}">${esc(area)}</span>`;

// ---------------------------------------------------------------- coleções
const colecoes = {
  processos: { singular: 'processo', plural: 'processos', largura: 680, campos: [
    { nome: 'numero', rotulo: 'Número (CNJ)', tipo: 'texto', obrigatorio: true, dica: '0000000-00.0000.0.00.0000' }, { nome: 'cliente', rotulo: 'Cliente', tipo: 'relacao', colecao: 'clientes', obrigatorio: true },
    { nome: 'acao', rotulo: 'Tipo de ação', tipo: 'texto', obrigatorio: true }, { nome: 'area', rotulo: 'Área', tipo: 'selecao', opcoes: AREAS, obrigatorio: true },
    { nome: 'contraria', rotulo: 'Parte contrária', tipo: 'texto' }, { nome: 'polo', rotulo: 'Nosso cliente é', tipo: 'selecao', opcoes: ['Autor', 'Réu', 'Terceiro'], padrao: 'Autor' },
    { nome: 'vara', rotulo: 'Vara / tribunal', tipo: 'texto', largo: true }, { nome: 'fase', rotulo: 'Fase', tipo: 'selecao', opcoes: FASES, padrao: 'Inicial' },
    { nome: 'valor', rotulo: 'Valor da causa', tipo: 'moeda' }, { nome: 'responsavel', rotulo: 'Responsável', tipo: 'selecao', opcoes: () => ADV.map((x) => [x[0], x[1]]), padrao: () => padraoEquipe(EU) }, { nome: 'exito', rotulo: 'Honorários de êxito (%)', tipo: 'porcentagem', padrao: 20 }],
    antesDeSalvar: (d, a, antes) => ({ ...d, status: antes?.status || 'ativo', distribuido: antes?.distribuido || hoje() }) },
  clientes: { singular: 'cliente', plural: 'clientes', campos: [
    { nome: 'nome', rotulo: 'Nome / razão social', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: [['PF', 'Pessoa física'], ['PJ', 'Pessoa jurídica']], padrao: 'PF' }, { nome: 'doc', rotulo: 'CPF / CNPJ', tipo: 'texto' },
    { nome: 'telefone', rotulo: 'Telefone', tipo: 'tel' }, { nome: 'email', rotulo: 'E-mail', tipo: 'email' }, { nome: 'cidade', rotulo: 'Cidade', tipo: 'texto' }, { nome: 'responsavel', rotulo: 'Responsável', tipo: 'selecao', opcoes: () => ADV.map((x) => [x[0], x[1]]), padrao: () => padraoEquipe(EU) }],
    antesDeSalvar: (d, a, antes) => ({ ...d, desde: antes?.desde || hoje() }) },
  prazos: { singular: 'compromisso', plural: 'compromissos', campos: [
    { nome: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: Object.entries(TIPOS_PRAZO).map(([k, [n]]) => [k, n]), padrao: 'prazo', obrigatorio: true }, { nome: 'titulo', rotulo: 'Descrição', tipo: 'texto', obrigatorio: true },
    { nome: 'processo', rotulo: 'Processo', tipo: 'relacao', colecao: 'processos', mostrar: (p, a) => `${p.numero} · ${rotProc(a, p)}`, filtrar: (p) => p.status !== 'encerrado' }, { nome: 'data', rotulo: 'Data (fatal)', tipo: 'data', obrigatorio: true, padrao: () => diaMais(7) },
    { nome: 'hora', rotulo: 'Hora (audiências)', tipo: 'hora' }, { nome: 'responsavel', rotulo: 'Responsável', tipo: 'selecao', opcoes: () => ADV.map((x) => [x[0], x[1]]), padrao: () => padraoEquipe(EU) }, { nome: 'local', rotulo: 'Local / link', tipo: 'texto', largo: true }],
    antesDeSalvar: (d, a, antes) => ({ ...d, status: antes?.status || 'pendente' }) },
  tarefas: { singular: 'tarefa', genero: 'f', plural: 'tarefas', campos: [
    { nome: 'titulo', rotulo: 'Tarefa', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'processo', rotulo: 'Processo', tipo: 'relacao', colecao: 'processos', mostrar: (p, a) => `${p.numero} · ${rotProc(a, p)}`, filtrar: (p) => p.status !== 'encerrado' },
    { nome: 'responsavel', rotulo: 'Responsável', tipo: 'selecao', opcoes: () => ADV.map((x) => [x[0], x[1]]), padrao: () => padraoEquipe(EU) }, { nome: 'prazo', rotulo: 'Prazo interno', tipo: 'data', padrao: () => diaMais(3) },
    { nome: 'prioridade', rotulo: 'Prioridade', tipo: 'selecao', fixo: true, opcoes: ['alta', 'média', 'baixa'], padrao: 'média' }, { nome: 'status', rotulo: 'Situação', tipo: 'selecao', opcoes: COLUNAS_TAREFA.map(([k, n]) => [k, n]), padrao: 'afazer' }] },
  horas: { singular: 'lançamento de horas', plural: 'horas', campos: [
    { nome: 'processo', rotulo: 'Processo', tipo: 'relacao', colecao: 'processos', mostrar: (p, a) => `${p.numero} · ${rotProc(a, p)}`, obrigatorio: true }, { nome: 'data', rotulo: 'Data', tipo: 'data', padrao: hoje },
    { nome: 'minutos', rotulo: 'Tempo (minutos)', tipo: 'numero', obrigatorio: true, padrao: 60, min: 5 }, { nome: 'advogado', rotulo: 'Quem', tipo: 'selecao', opcoes: () => ADV.map((x) => [x[0], x[1]]), padrao: () => padraoEquipe(EU) },
    { nome: 'descricao', rotulo: 'O que foi feito', tipo: 'texto', largo: true, obrigatorio: true }, { nome: 'faturavel', rotulo: 'Faturável', tipo: 'booleano', texto: 'Cobrar do cliente', padrao: true }],
    antesDeSalvar: (d, a) => ({ ...d, cliente: proc(a, d.processo)?.cliente, faturado: false }) },
  honorarios: { singular: 'lançamento', plural: 'lançamentos', campos: [
    { nome: 'cliente', rotulo: 'Cliente', tipo: 'relacao', colecao: 'clientes', obrigatorio: true }, { nome: 'descricao', rotulo: 'Descrição', tipo: 'texto', obrigatorio: true },
    { nome: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: [['contrato', 'Honorários contratuais'], ['mensal', 'Partido mensal'], ['exito', 'Êxito'], ['horas', 'Horas trabalhadas'], ['avulso', 'Avulso / despesas']], padrao: 'contrato' },
    { nome: 'valor', rotulo: 'Valor', tipo: 'moeda', obrigatorio: true }, { nome: 'vencimento', rotulo: 'Vencimento', tipo: 'data', padrao: () => diaMais(10) }],
    antesDeSalvar: (d, a, antes) => ({ ...d, status: antes?.status || 'aberto' }) },
};

// ---------------------------------------------------------------- páginas
function painel(a) {
  const ps = pend(a), prz = ps.filter((x) => x.tipo === 'prazo');
  const vencidos = prz.filter((x) => x.data < hoje()), hojeL = prz.filter((x) => x.data === hoje()), semana = prz.filter((x) => diasAte(x.data) >= 0 && diasAte(x.data) <= 7);
  const aud = ps.filter((x) => x.tipo !== 'prazo' && diasAte(x.data) >= 0 && diasAte(x.data) <= 14).sort((x, y) => `${x.data}${x.hora}`.localeCompare(`${y.data}${y.hora}`));
  const pubs = a.db.lista('publicacoes').filter((x) => x.status === 'nova');
  const ym = hoje().slice(0, 7), hMes = a.db.lista('horas').filter((h) => h.data.startsWith(ym));
  const hon = a.db.lista('honorarios'), atras = hon.filter((h) => honStatus(h) === 'atrasado');
  return `${vencidos.length ? `<div class="alerta-linha">${ic('warning')}${vencidos.length} prazo${vencidos.length > 1 ? 's' : ''} vencido${vencidos.length > 1 ? 's' : ''} sem baixa. Confira se foi cumprido.<a href="#/prazos">Revisar agora</a></div>` : ''}
    ${kpis([
      { rot: 'Prazos que vencem hoje', icone: 'hourglass', val: num(hojeL.length), alerta: hojeL.length > 0, nota: `${semana.length} nos próximos 7 dias` },
      { rot: 'Intimações para tratar', icone: 'tray', val: num(pubs.length), alerta: pubs.length > 0, nota: 'publicadas nos diários' },
      { rot: 'Horas no mês', icone: 'timer', val: hrs(soma(hMes, (h) => h.minutos)), nota: `${hrs(soma(hMes.filter((h) => h.faturavel), (h) => h.minutos))} faturáveis` },
      { rot: 'Honorários a receber', icone: 'hand-coins', val: moeda(soma(hon.filter((h) => h.status !== 'recebido'), (h) => h.valor)), nota: atras.length ? `<span class="er-tx">${moeda(soma(atras, (h) => h.valor))} em atraso</span>` : 'nada em atraso' },
    ])}
    <div class="grade g21">
      <div class="cartao"><div class="cartao-cab"><div><h3>Prazos mais urgentes</h3><div class="sub">Contagem em dias úteis, já descontando feriados</div></div><a class="btn peq" href="#/prazos">Todos os prazos</a></div>
        ${prz.length ? `<ul class="lista">${prz.sort((x, y) => x.data.localeCompare(y.data)).slice(0, 8).map((x) => { const p = proc(a, x.processo); return `<li class="clicavel" data-abrir="processo:${x.processo}:prazos"><input type="checkbox" data-mudar="cumprir" data-id="${x.id}" aria-label="Marcar como cumprido"><div class="cresce"><div class="t corta">${esc(x.titulo)}</div><div class="s corta"><span class="mono">${esc(p?.numero || '')}</span> · ${esc(rotProc(a, p))}</div></div><div class="dir"><div class="num" style="font-size:12.5px">${dataCurta(x.data)}</div>${etUrg(x)}</div>${av(nomeA(x.responsavel), 'p')}</li>`; }).join('')}</ul>` : vazio('check-circle', 'Nenhum prazo pendente')}</div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Intimações novas</h3><div class="sub">Diários oficiais · captura diária</div></div><a class="btn peq" href="#/intimacoes">Tratar</a></div>
        ${pubs.length ? `<ul class="lista">${pubs.map((x) => `<li class="clicavel" data-acao="irPub" data-id="${x.id}"><span class="av" style="background:var(--info)">${ic('envelope-open', 'p')}</span><div class="cresce"><div class="t corta mono" style="font-size:12px">${esc(x.numero)}</div><div class="s corta">${esc(x.texto)}</div></div><span class="s">${relativo(x.data)}</span></li>`).join('')}</ul>` : vazio('tray', 'Caixa de intimações vazia')}</div>
    </div>
    <div class="grade g2">
      <div class="cartao"><div class="cartao-cab"><div><h3>Audiências e perícias</h3><div class="sub">Próximos 14 dias</div></div><a class="btn peq" href="#/agenda">Agenda</a></div>
        ${aud.length ? `<ul class="lista">${aud.slice(0, 6).map((x) => { const [n, i, c] = TIPOS_PRAZO[x.tipo]; return `<li class="clicavel" data-abrir="processo:${x.processo}:prazos"><div style="width:52px;text-align:center"><div class="mute" style="font-size:11px;text-transform:uppercase">${DIAS[paraData(x.data).getDay()]}</div><b class="num" style="font-size:17px">${Number(x.data.slice(8))}</b></div><span class="av p" style="background:${c}">${ic(i, 'p')}</span><div class="cresce"><div class="t corta">${esc(x.titulo)}</div><div class="s corta">${esc(x.hora || '')} · ${esc(x.local || '')}</div></div>${av(nomeA(x.responsavel), 'p')}</li>`; }).join('')}</ul>` : vazio('gavel', 'Sem audiências marcadas')}</div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Carga da equipe</h3><div class="sub">Prazos e tarefas em aberto por pessoa</div></div></div><div class="cartao-corpo">
        ${barrasH(ADV.map(([id, n]) => ({ html: `<span class="flex">${av(n, 'p')}${esc(n)}</span>`, v: ps.filter((x) => x.responsavel === id).length + a.db.lista('tarefas').filter((t) => t.responsavel === id && t.status !== 'feita').length, extra: `${ps.filter((x) => x.responsavel === id && x.tipo === 'prazo').length} prazos` })))}</div></div>
    </div>`;
}

function intimacoes(a) {
  const st = a.estado.pub ||= { sel: null, filtro: 'nova' };
  const lista = a.db.lista('publicacoes').filter((x) => st.filtro === 'todas' || x.status === st.filtro).sort((x, y) => y.data.localeCompare(x.data));
  if (!st.sel || !lista.find((x) => x.id === st.sel)) st.sel = lista[0]?.id || null;
  const pub = a.db.obter('publicacoes', st.sel), p = pub ? proc(a, pub.processo) : null;
  const dias = st.dias ?? 15, uteis = st.uteis ?? true, c = pub ? calcPrazo(pub.data, dias, uteis) : null;
  const oabs = a.db.cfg.oabs || [];
  return `<div class="entre"><div class="dica" style="flex:1">${ic('envelope-open')}<span>${oabs.length ? `Captura automática no <b>DJEN</b> (Diário de Justiça Eletrônico Nacional) para ${oabs.map((o) => `OAB ${esc(o.numero)}/${esc(o.uf)}`).join(', ')}${a.db.cfg.djen_ultima ? ` · última busca ${relativo(a.db.cfg.djen_ultima)}` : ''}.` : 'Cadastre as OABs da equipe em <a href="#/config">Configurações</a> e as intimações do DJEN chegam aqui sozinhas.'}</span></div><button type="button" class="btn pri" data-acao="capturarDJEN">${ic('arrows-clockwise')}Buscar no DJEN</button></div>
  <div class="grade g12" style="align-items:start">
    <div class="cartao"><div class="visoes">${[['nova', 'Novas'], ['tratada', 'Tratadas'], ['todas', 'Todas']].map(([k, n]) => `<button type="button" data-acao="filtroPub" data-f="${k}" aria-selected="${st.filtro === k}">${n}<span class="n">${a.db.lista('publicacoes').filter((x) => k === 'todas' || x.status === k).length}</span></button>`).join('')}</div>
      ${lista.length ? `<ul class="lista">${lista.map((x) => `<li class="clicavel" data-acao="selPub" data-id="${x.id}" style="${x.id === st.sel ? 'background:var(--acc-suave)' : ''};align-items:flex-start"><span class="av p" style="background:${x.status === 'nova' ? 'var(--info)' : 'var(--tx-3)'};margin-top:2px">${ic('envelope-open', 'p')}</span><div class="cresce"><div class="entre"><span class="mono" style="font-size:12px">${esc(x.numero)}</span><span class="s">${dataCurta(x.data)}</span></div><div class="s" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(x.texto)}</div></div></li>`).join('')}</ul>` : vazio('tray', 'Nada por aqui')}</div>
    ${pub ? `<div class="col" style="gap:16px"><div class="cartao"><div class="cartao-cab"><div><h3>${esc(pub.diario)}</h3><div class="sub">Disponibilizada em ${dataBR(pub.data)} · ${p ? `<a href="javascript:void 0" data-abrir="processo:${p.id}">${esc(pub.numero)}</a>` : `<span class="mono">${esc(pub.numero)}</span>`}${pub.link ? ` · <a href="${esc(pub.link)}" target="_blank" rel="noopener">ver no tribunal</a>` : ''}</div></div>${pub.status === 'nova' ? et('Nova', 'info') : et('Tratada', 'ok')}</div>
        <div class="cartao-corpo col" style="gap:12px"><div style="font-size:14px;line-height:1.6;padding:12px 14px;background:var(--painel-2);border:1px solid var(--borda);border-radius:8px;white-space:pre-wrap;max-height:320px;overflow:auto">${esc(pub.texto)}</div>
        ${p ? '' : `<div class="alerta-linha al">${ic('warning')}Este processo ainda não está cadastrado no escritório.<a href="javascript:void 0" data-acao="cadastrarDaPub" data-id="${pub.id}">Cadastrar processo</a></div>`}
        ${props([['scales', 'Processo', esc(rotProc(a, p))], ['user', 'Cliente', esc(cli(a, p?.cliente)?.nome || '—')], ['user-circle', 'Responsável', esc(nomeA(p?.responsavel))]])}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Para o cliente, em linguagem simples</h3><div class="sub">Revise o texto e mande, ou publique no portal do processo</div></div></div><div class="cartao-corpo col" style="gap:10px">
        <textarea data-simples style="min-height:70px">${esc(pub.simples || explicar(pub.texto))}</textarea>
        <div class="flex" style="justify-content:flex-end;flex-wrap:wrap">${p ? `<button type="button" class="btn" data-acao="publicarSimples" data-id="${pub.id}">${ic('share-network')}Publicar no portal do cliente</button>` : ''}<button type="button" class="btn pri" data-acao="zapSimples" data-id="${pub.id}">${ic('whatsapp-logo')}Mandar ao cliente</button></div></div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Calcular prazo e agendar</h3><div class="sub">CPC: contagem em dias úteis (art. 219), excluindo feriados e o recesso forense (art. 220)</div></div></div>
        <div class="cartao-corpo col" style="gap:14px"><div class="form-grade tres"><label class="campo">Prazo<input type="number" min="1" value="${dias}" data-mudar="diasPub"></label><label class="campo">Contagem<select data-mudar="uteisPub"><option value="1" ${uteis ? 'selected' : ''}>Dias úteis</option><option value="0" ${uteis ? '' : 'selected'}>Dias corridos</option></select></label><label class="campo">Atalhos<div class="flex">${[5, 10, 15, 30].map((n) => `<button type="button" class="btn peq" data-acao="atalhoPub" data-n="${n}">${n}</button>`).join('')}</div></label></div>
          <div class="grade g4" style="gap:8px">${[['Disponibilização', c.disp], ['Publicação', c.pub], ['Início da contagem', c.inicio], ['Prazo final', c.fim]].map(([t, d], i) => `<div style="padding:10px;border:1px solid ${i === 3 ? 'var(--acc-borda)' : 'var(--borda)'};border-radius:8px;background:${i === 3 ? 'var(--acc-suave)' : 'var(--painel)'}"><div class="mute" style="font-size:12px">${t}</div><b class="num" style="font-size:15px">${dataBR(d)}</b><div class="mute" style="font-size:11.5px">${DIAS_L[paraData(d).getDay()]}</div></div>`).join('')}</div>
          ${c.pulados.length ? `<div class="mute-2" style="font-size:12.5px">${ic('info', 'p')} Não contados: ${c.pulados.filter((d) => !fimDeSemana(d) || recesso(d)).map((d) => `${dataCurta(d)} (${esc(motivo(d))})`).join(', ') || 'apenas fins de semana'}${c.pulados.filter((d) => fimDeSemana(d)).length ? ` · ${c.pulados.filter((d) => fimDeSemana(d)).length} dias de fim de semana` : ''}.</div>` : ''}
          <div class="flex" style="justify-content:flex-end;gap:8px">${pub.status === 'nova' ? `<button type="button" class="btn" data-acao="tratarPub" data-id="${pub.id}">Só marcar como tratada</button><button type="button" class="btn pri" data-acao="criarPrazoPub" data-id="${pub.id}">${ic('calendar-plus')}Agendar prazo para ${dataBR(c.fim)}</button>` : `<span class="ok-tx flex">${ic('check-circle')}Intimação tratada</span>`}</div></div></div></div>` : `<div class="cartao">${vazio('tray', 'Selecione uma intimação')}</div>`}
  </div>`;
}

function prazosPag(a) {
  const st = a.estado.prz ||= { modo: 'lista', mes: hoje().slice(0, 7) };
  const topo = `<div class="entre"><div class="grupo-btn"><button type="button" data-acao="modoPrz" data-m="lista" aria-pressed="${st.modo === 'lista'}">${ic('list', 'p')}Lista</button><button type="button" data-acao="modoPrz" data-m="mes" aria-pressed="${st.modo === 'mes'}">${ic('calendar-blank', 'p')}Mês</button></div><button type="button" class="btn pri" data-acao="novoPrazo">${ic('plus')}Novo compromisso</button></div>`;
  if (st.modo === 'mes') return `${topo}<div class="cal"><div class="cal-barra"><div class="grupo-btn"><button type="button" data-acao="mesPrz" data-d="-1" aria-label="Mês anterior">${ic('caret-left', 'p')}</button><button type="button" data-acao="mesPrz" data-d="0">Hoje</button><button type="button" data-acao="mesPrz" data-d="1" aria-label="Próximo mês">${ic('caret-right', 'p')}</button></div><h3>${esc(nomeMes(st.mes, true))}</h3></div>
    ${calMes({ ym: st.mes, aoClicar: 'abrirPrazo', itens: a.db.lista('prazos').filter((x) => x.data.startsWith(st.mes)).map((x) => ({ id: x.id, data: x.data, titulo: `${x.hora ? `${x.hora} ` : ''}${x.titulo}`, cor: x.status === 'cumprido' ? 'var(--tx-3)' : TIPOS_PRAZO[x.tipo][2] })) })}</div>`;
  return topo + a.tab({
    id: 'prazos', colecao: 'prazos', singular: 'compromisso', plural: 'compromissos', ordem: 'data',
    visoes: [{ id: 'pend', rot: 'Pendentes', filtro: (x) => x.status === 'pendente' }, { id: 'venc', rot: 'Vencidos', filtro: (x) => x.status === 'pendente' && x.data < hoje() }, { id: 'hoje', rot: 'Hoje', filtro: (x) => x.status === 'pendente' && x.data === hoje() }, { id: 'sem', rot: 'Próximos 7 dias', filtro: (x) => x.status === 'pendente' && diasAte(x.data) > 0 && diasAte(x.data) <= 7 }, { id: 'aud', rot: 'Audiências', filtro: (x) => x.tipo === 'audiencia' && x.status === 'pendente' }, { id: 'feitos', rot: 'Cumpridos', filtro: (x) => x.status === 'cumprido' }],
    filtros: [{ k: 'tipo', rot: 'Tipo', opcoes: Object.entries(TIPOS_PRAZO).map(([k, [n]]) => [k, n]) }, { k: 'responsavel', rot: 'Responsável', opcoes: () => ADV.map((x) => [x[0], x[1]]) }],
    textoBusca: (x) => `${x.titulo} ${proc(a, x.processo)?.numero} ${rotProc(a, proc(a, x.processo))}`,
    aoClicar: (id) => a.abrir('processo', a.db.obter('prazos', id).processo, 'prazos'),
    massa: [{ rot: 'Marcar como cumprido', icone: 'check', acao: (ids) => { ids.forEach((id) => a.db.salvar('prazos', { id, status: 'cumprido', cumprido_em: hoje() })); avisar(`${ids.length} compromissos cumpridos`); } }],
    colunas: [
      { k: 'ok', rot: '', w: '34px', ord: false, csv: false, render: (x) => `<input type="checkbox" data-mudar="cumprir" data-id="${x.id}" ${x.status === 'cumprido' ? 'checked' : ''} aria-label="Cumprido">` },
      { k: 'titulo', rot: 'Compromisso', render: (x) => { const [n, i, c] = TIPOS_PRAZO[x.tipo]; return `<span class="flex" style="gap:9px"><span class="av p" style="background:${c}">${ic(i, 'p')}</span><span><span class="prim">${esc(x.titulo)}</span><span class="sub">${esc(n)}${x.hora ? ` · ${esc(x.hora)}` : ''}${x.dias ? ` · ${x.dias} dias úteis` : ''}</span></span></span>`; } },
      { k: 'processo', rot: 'Processo', oc: true, valor: (x) => proc(a, x.processo)?.numero, render: (x) => { const p = proc(a, x.processo); return `<span class="mono" style="font-size:12px">${esc(p?.numero || '—')}</span><span class="sub">${esc(rotProc(a, p))}</span>`; } },
      { k: 'data', rot: 'Data', render: (x) => `${dataCurta(x.data)} <span class="mute">${DIAS[paraData(x.data).getDay()]}</span>` },
      { k: 'urg', rot: 'Situação', valor: (x) => (x.status === 'cumprido' ? 9999 : diasAte(x.data)), render: etUrg, csv: (x) => (x.status === 'cumprido' ? 'cumprido' : urg(x.data)[0]) },
      { k: 'responsavel', rot: 'Responsável', oc: true, valor: (x) => nomeA(x.responsavel), render: (x) => `<span class="flex">${av(nomeA(x.responsavel), 'p')}${esc(nomeA(x.responsavel).replace(/^Dr[a]?\. /, '').split(' ')[0])}</span>` },
    ],
  });
}

function processos(a) {
  return a.tab({
    id: 'processos', colecao: 'processos', singular: 'processo', plural: 'processos', ordem: 'proximo', buscaDica: 'Buscar por número, cliente ou parte…',
    visoes: [{ id: 'ativos', rot: 'Ativos', filtro: (p) => p.status === 'ativo' }, { id: 'meus', rot: 'Meus', filtro: (p) => p.responsavel === EU && p.status !== 'encerrado' }, { id: 'susp', rot: 'Suspensos', filtro: (p) => p.status === 'suspenso' }, { id: 'enc', rot: 'Encerrados', filtro: (p) => p.status === 'encerrado' }, { id: 'todos', rot: 'Todos' }],
    filtros: [{ k: 'area', rot: 'Área', opcoes: AREAS }, { k: 'fase', rot: 'Fase', opcoes: FASES }, { k: 'responsavel', rot: 'Responsável', opcoes: () => ADV.map((x) => [x[0], x[1]]) }],
    textoBusca: (p) => `${p.numero} ${p.acao} ${cli(a, p.cliente)?.nome} ${p.contraria} ${p.vara}`,
    total: (l) => `${moedaC(soma(l, (p) => p.valor))} em causas`,
    novo: { rot: 'Novo processo', attrs: 'data-acao="novoProcesso"' }, aoClicar: (id) => a.abrir('processo', id),
    colunas: [
      { k: 'numero', rot: 'Processo', render: (p) => `<span class="mono prim" style="font-size:12.5px">${esc(p.numero)}</span><span class="sub">${esc(p.acao)}</span>` },
      { k: 'cliente', rot: 'Cliente', valor: (p) => cli(a, p.cliente)?.nome, render: (p) => `<span class="corta" style="max-width:200px;display:block">${esc(cli(a, p.cliente)?.nome || '—')}</span><span class="sub">× ${esc(p.contraria || '')}</span>` },
      { k: 'area', rot: 'Área', oc: true, render: (p) => etArea(p.area) },
      { k: 'fase', rot: 'Fase', oc: true, valor: (p) => FASES.indexOf(p.fase), render: (p) => (p.status === 'suspenso' ? et('Suspenso', 'al') : p.status === 'encerrado' ? et(`Encerrado · ${p.resultado}`, p.resultado === 'Improcedente' ? 'er' : 'ok') : et(p.fase, '', 'contorno')), csv: (p) => p.fase },
      { k: 'proximo', rot: 'Próximo prazo', valor: (p) => proxPrazo(a, p.id)?.data || '9999', render: (p) => { const x = proxPrazo(a, p.id); return x ? `<span class="corta" style="max-width:170px;display:block">${esc(x.titulo)}</span><span class="sub">${dataCurta(x.data)} · ${urg(x.data)[0]}</span>` : '<span class="mute">—</span>'; }, csv: (p) => proxPrazo(a, p.id)?.data || '' },
      { k: 'responsavel', rot: 'Resp.', oc: true, valor: (p) => nomeA(p.responsavel), render: (p) => av(nomeA(p.responsavel), 'p') },
    ],
  });
}

function tarefas(a) {
  a.kanbans.tarefas = (id, col) => { const t = a.db.obter('tarefas', id); a.db.salvar('tarefas', { id, status: col }); avisar(`${t.titulo} → ${COLUNAS_TAREFA.find((c) => c[0] === col)[1]}`); };
  a.kanbans['tarefas:abrir'] = async (id) => { if (await editar(a, 'tarefas', a.db.obter('tarefas', id))) a.render(); };
  const st = a.estado.tar ||= { quem: '' };
  const ts = a.db.lista('tarefas').filter((t) => !st.quem || t.responsavel === st.quem);
  const corP = { alta: 'er', 'média': 'al', baixa: '' };
  return `<div class="entre"><div class="grupo-btn"><button type="button" data-acao="quemTar" data-q="" aria-pressed="${!st.quem}">Todos</button>${ADV.map(([id, n]) => `<button type="button" data-acao="quemTar" data-q="${id}" aria-pressed="${st.quem === id}">${av(n, 'p')}${esc(n.replace(/^Dr[a]?\. /, '').split(' ')[0])}</button>`).join('')}</div><button type="button" class="btn pri" data-acao="novaTarefa">${ic('plus')}Nova tarefa</button></div>
    ${kanban({ id: 'tarefas', itens: ts, campo: 'status', colunas: COLUNAS_TAREFA.map(([id, nome, cor]) => ({ id, nome, cor })),
      ficha: (t) => { const p = proc(a, t.processo), d = diasAte(t.prazo); return `<div class="t">${esc(t.titulo)}</div>${p ? `<div class="s corta mono" style="font-size:11.5px">${esc(p.numero)}</div>` : ''}<div class="linha"><span class="flex" style="gap:6px">${av(nomeA(t.responsavel), 'p')}${et(t.prioridade, corP[t.prioridade], 'sem-ponto')}</span><span class="${t.status !== 'feita' && d < 0 ? 'er-tx' : t.status !== 'feita' && d <= 1 ? 'al-tx' : ''}">${ic('calendar-blank', 'p')} ${dataCurta(t.prazo)}</span></div>`; } })}`;
}

function timesheet(a) {
  const st = a.estado.ts ||= { mes: hoje().slice(0, 7) };
  const cron = a.db.cfg.cronometro;
  const hs = a.db.lista('horas').filter((h) => h.data.startsWith(st.mes));
  const meses = [0, -1, -2].map((m) => mesMais(m));
  const naoFat = agrupar(a.db.lista('horas').filter((h) => h.faturavel && !h.faturado), (h) => h.cliente);
  return `${cron ? `<div class="cartao"><div class="cartao-corpo entre"><div class="flex"><span class="cronometro"><i class="ponto"></i><span data-cron="${cron.inicio}">00:00:00</span></span><div><b>${esc(cron.descricao || 'Trabalhando')}</b><div class="mute" style="font-size:12.5px">${esc(rotProc(a, proc(a, cron.processo)))}</div></div></div><button type="button" class="btn pri" data-acao="pararCron">${ic('stop')}Parar e lançar</button></div></div>` : ''}
    <div class="entre"><div class="flex"><select data-mudar="mesTs" style="width:auto">${meses.map((m) => `<option value="${m}" ${m === st.mes ? 'selected' : ''}>${esc(nomeMes(m, true))}</option>`).join('')}</select></div><div class="flex">${cron ? '' : `<button type="button" class="btn" data-acao="iniciarCron">${ic('play')}Iniciar cronômetro</button>`}<button type="button" class="btn pri" data-acao="novaHora">${ic('plus')}Lançar horas</button></div></div>
    ${kpis([{ rot: 'Horas lançadas', icone: 'timer', val: hrs(soma(hs, (h) => h.minutos)) }, { rot: 'Faturáveis', icone: 'currency-circle-dollar', val: hrs(soma(hs.filter((h) => h.faturavel), (h) => h.minutos)), nota: `${pct((soma(hs.filter((h) => h.faturavel), (h) => h.minutos) / (soma(hs, (h) => h.minutos) || 1)) * 100)} do total` }, { rot: 'Valor a faturar (todos os meses)', icone: 'hand-coins', val: moeda(soma(Object.values(naoFat).flat(), (h) => (h.minutos / 60) * valorHora(h.advogado))) }])}
    <div class="grade g21">${a.tab({ id: 'horas', itens: () => hs, singular: 'lançamento', plural: 'lançamentos', ordem: 'data', desc: true, porPagina: 20,
      filtros: [{ k: 'advogado', rot: 'Quem', opcoes: () => ADV.map((x) => [x[0], x[1]]) }],
      aoClicar: async (id) => { if (await editar(a, 'horas', a.db.obter('horas', id))) a.render(); },
      total: (l) => hrs(soma(l, (h) => h.minutos)),
      colunas: [{ k: 'data', rot: 'Data', render: (h) => dataCurta(h.data) }, { k: 'descricao', rot: 'Atividade', render: (h) => `<span class="prim">${esc(h.descricao)}</span><span class="sub corta" style="max-width:260px">${esc(rotProc(a, proc(a, h.processo)))}</span>` },
        { k: 'advogado', rot: 'Quem', oc: true, valor: (h) => nomeA(h.advogado), render: (h) => av(nomeA(h.advogado), 'p') }, { k: 'minutos', rot: 'Tempo', n: true, render: (h) => hrs(h.minutos) },
        { k: 'fat', rot: 'Cobrança', valor: (h) => (h.faturado ? 2 : h.faturavel ? 1 : 0), render: (h) => (h.faturado ? et('Faturado', 'ok') : h.faturavel ? et('A faturar', 'info') : et('Interno', '', 'sem-ponto')), csv: (h) => (h.faturado ? 'faturado' : h.faturavel ? 'a faturar' : 'interno') }] })}
      <div class="cartao"><div class="cartao-cab"><div><h3>A faturar por cliente</h3><div class="sub">Horas faturáveis ainda não cobradas</div></div></div>
        ${Object.keys(naoFat).length ? `<ul class="lista">${Object.entries(naoFat).map(([cid, l]) => ({ cid, l, v: soma(l, (h) => (h.minutos / 60) * valorHora(h.advogado)) })).sort((x, y) => y.v - x.v).map(({ cid, l, v }) => `<li><div class="cresce"><div class="t corta">${esc(cli(a, cid)?.nome || '—')}</div><div class="s">${hrs(soma(l, (h) => h.minutos))} · ${l.length} lançamentos</div></div><b class="num" style="font-size:12.5px">${moedaC(v)}</b><button type="button" class="btn peq" data-acao="faturarHoras" data-c="${cid}">Cobrar</button></li>`).join('')}</ul>` : vazio('check-circle', 'Tudo faturado')}</div></div>`;
}

function clientes(a) {
  return a.tab({ id: 'clientes', colecao: 'clientes', singular: 'cliente', plural: 'clientes', ordem: 'nome',
    filtros: [{ k: 'tipo', rot: 'Tipo', opcoes: [['PF', 'Pessoa física'], ['PJ', 'Pessoa jurídica']] }, { k: 'responsavel', rot: 'Responsável', opcoes: () => ADV.map((x) => [x[0], x[1]]) }],
    textoBusca: (c) => `${c.nome} ${c.doc} ${c.email}`, novo: { rot: 'Novo cliente', attrs: 'data-acao="novoCliente"' }, aoClicar: (id) => a.abrir('cliente', id),
    colunas: [{ k: 'nome', rot: 'Cliente', render: (c) => `<span class="flex" style="gap:9px">${av(c.nome)}<span><span class="prim">${esc(c.nome)}</span><span class="sub mono">${esc(c.doc || '')}</span></span></span>` }, { k: 'tipo', rot: 'Tipo', render: (c) => et(c.tipo === 'PJ' ? 'Empresa' : 'Pessoa física', c.tipo === 'PJ' ? 'roxo' : '', 'sem-ponto') },
      { k: 'proc', rot: 'Processos ativos', n: true, valor: (c) => a.db.lista('processos').filter((p) => p.cliente === c.id && p.status !== 'encerrado').length, render: (c) => num(a.db.lista('processos').filter((p) => p.cliente === c.id && p.status !== 'encerrado').length) },
      { k: 'aberto', rot: 'A receber', n: true, valor: (c) => soma(a.db.lista('honorarios').filter((h) => h.cliente === c.id && h.status !== 'recebido'), (h) => h.valor), render: (c) => { const l = a.db.lista('honorarios').filter((h) => h.cliente === c.id && h.status !== 'recebido'); const at = l.some((h) => honStatus(h) === 'atrasado'); return l.length ? `<span class="${at ? 'er-tx' : ''}">${moeda(soma(l, (h) => h.valor))}</span>` : '<span class="mute">—</span>'; } },
      { k: 'responsavel', rot: 'Resp.', oc: true, valor: (c) => nomeA(c.responsavel), render: (c) => av(nomeA(c.responsavel), 'p') }] });
}

function financeiro(a) {
  const hon = a.db.lista('honorarios'), ym = hoje().slice(0, 7);
  const meses = Array.from({ length: 6 }, (_, i) => mesMais(i - 4));
  return `${kpis([
    { rot: 'Recebido no mês', icone: 'check-circle', val: moeda(soma(hon.filter((h) => h.status === 'recebido' && h.recebido_em?.startsWith(ym)), (h) => h.valor)) },
    { rot: 'A receber no mês', icone: 'calendar-blank', val: moeda(soma(hon.filter((h) => h.status !== 'recebido' && h.vencimento.startsWith(ym)), (h) => h.valor)) },
    { rot: 'Em atraso', icone: 'warning', val: moeda(soma(hon.filter((h) => honStatus(h) === 'atrasado'), (h) => h.valor)), alerta: hon.some((h) => honStatus(h) === 'atrasado'), nota: `${hon.filter((h) => honStatus(h) === 'atrasado').length} lançamentos` },
    { rot: 'Partidos mensais ativos', icone: 'arrows-clockwise', val: moeda(soma(hon.filter((h) => h.tipo === 'mensal' && h.vencimento.startsWith(ym)), (h) => h.valor)), nota: 'receita recorrente por mês' },
  ])}
  <div class="cartao"><div class="cartao-cab"><div><h3>Honorários por mês</h3><div class="sub">Recebido e a receber</div></div></div><div class="cartao-corpo">${barras({ dados: meses.map((m) => ({ rot: nomeMes(m), v: [soma(hon.filter((h) => h.status === 'recebido' && (h.recebido_em || '').startsWith(m)), (h) => h.valor), soma(hon.filter((h) => h.status !== 'recebido' && h.vencimento.startsWith(m)), (h) => h.valor)] })), series: [{ nome: 'Recebido', cor: 'var(--acc)' }, { nome: 'A receber', cor: '#cbd5e1' }], empilhado: true, fmt: moedaC, altura: 240, largura: 1150 })}</div></div>
  ${a.tab({ id: 'honorarios', colecao: 'honorarios', singular: 'lançamento', plural: 'lançamentos', ordem: 'vencimento',
    visoes: [{ id: 'aberto', rot: 'A receber', filtro: (h) => h.status !== 'recebido' }, { id: 'atraso', rot: 'Atrasados', filtro: (h) => honStatus(h) === 'atrasado' }, { id: 'rec', rot: 'Recebidos', filtro: (h) => h.status === 'recebido' }, { id: 'todos', rot: 'Todos' }],
    filtros: [{ k: 'tipo', rot: 'Tipo', opcoes: [['contrato', 'Contratuais'], ['mensal', 'Partido mensal'], ['exito', 'Êxito'], ['horas', 'Horas'], ['avulso', 'Avulso']] }],
    textoBusca: (h) => `${h.descricao} ${cli(a, h.cliente)?.nome}`, total: (l) => moeda(soma(l, (h) => h.valor)),
    novo: { rot: 'Novo lançamento', attrs: 'data-acao="novoHon"' },
    aoClicar: async (id) => { if (await editar(a, 'honorarios', a.db.obter('honorarios', id))) a.render(); },
    massa: [{ rot: 'Marcar como recebido', icone: 'check', acao: (ids) => { ids.forEach((id) => a.db.salvar('honorarios', { id, status: 'recebido', recebido_em: hoje() })); avisar(`${ids.length} lançamentos recebidos`); } }],
    colunas: [{ k: 'cliente', rot: 'Cliente', valor: (h) => cli(a, h.cliente)?.nome, render: (h) => `<span class="prim">${esc(cli(a, h.cliente)?.nome || '—')}</span><span class="sub">${esc(h.descricao)}</span>` },
      { k: 'vencimento', rot: 'Vencimento', render: (h) => `<span class="${honStatus(h) === 'atrasado' ? 'er-tx' : ''}">${dataCurta(h.vencimento)}</span>` }, { k: 'valor', rot: 'Valor', n: true, render: (h) => moeda(h.valor) },
      { k: 'st', rot: 'Situação', valor: (h) => honStatus(h), render: etHon, csv: (h) => honStatus(h) },
      { k: 'acao', rot: '', ord: false, csv: false, render: (h) => (h.status === 'recebido' ? `<span class="mute" style="font-size:12px">${dataCurta(h.recebido_em)}</span>` : `<button type="button" class="btn peq" data-acao="receber" data-id="${h.id}">${ic('check')}Recebido</button>${honStatus(h) === 'atrasado' ? ` <a class="btn peq ic-so" target="_blank" rel="noopener" title="Cobrar no WhatsApp" href="${telLink(cli(a, h.cliente)?.telefone)}?text=${encodeURIComponent(`Olá! Tudo bem? Consta em aberto o pagamento de ${moeda(h.valor)} (${h.descricao}), vencido em ${dataBR(h.vencimento)}. Podemos enviar o PIX? ${a.empresa}`)}">${ic('whatsapp-logo')}</a>` : ''}`) }] })}`;
}

function calculadora(a) {
  const st = a.estado.calc ||= { disp: hoje(), dias: 15, uteis: true };
  const c = calcPrazo(st.disp, st.dias, st.uteis);
  const lista = []; let d = c.pub, n = 0; while (d <= c.fim && lista.length < 60) { d = diaMais(1, d); const conta = !st.uteis || contaDia(d); if (conta) n++; lista.push({ d, conta, n: conta ? n : null }); }
  return `<div class="grade g12" style="align-items:start"><div class="cartao"><div class="cartao-cab"><div><h3>Dados da intimação</h3><div class="sub">Novo CPC · prazos em dias úteis</div></div></div><div class="cartao-corpo col" style="gap:12px">
      <label class="campo">Data da disponibilização no diário<input type="date" value="${st.disp}" data-mudar="calcDisp"></label>
      <label class="campo">Prazo (dias)<input type="number" min="1" value="${st.dias}" data-mudar="calcDias"></label>
      <label class="campo">Contagem<select data-mudar="calcUteis"><option value="1" ${st.uteis ? 'selected' : ''}>Dias úteis (CPC, art. 219)</option><option value="0" ${st.uteis ? '' : 'selected'}>Dias corridos (penal, material)</option></select></label>
      <div class="flex">${[5, 8, 10, 15, 30].map((x) => `<button type="button" class="btn peq" data-acao="calcAtalho" data-n="${x}">${x} dias</button>`).join('')}</div>
      <div class="dica">${ic('info')}<span>A publicação é o primeiro dia útil depois da disponibilização (Lei 11.419/06), e a contagem começa no dia útil seguinte. Feriados nacionais e o recesso de 20/12 a 20/01 não contam. Feriados locais podem ser adicionados na versão contratada.</span></div></div></div>
    <div class="col" style="gap:16px"><div class="cartao"><div class="cartao-corpo"><div class="grade g4" style="gap:8px">${[['Disponibilização', c.disp], ['Publicação', c.pub], ['Início da contagem', c.inicio], ['Prazo final', c.fim]].map(([t, x], i) => `<div style="padding:12px;border:1px solid ${i === 3 ? 'var(--acc-borda)' : 'var(--borda)'};border-radius:8px;background:${i === 3 ? 'var(--acc-suave)' : 'var(--painel)'}"><div class="mute" style="font-size:12px">${t}</div><b class="num" style="font-size:${i === 3 ? 19 : 15}px">${dataBR(x)}</b><div class="mute" style="font-size:11.5px">${DIAS_L[paraData(x).getDay()]}</div></div>`).join('')}</div></div></div>
      <div class="cartao"><div class="cartao-cab"><h3>Dia a dia</h3><span class="mute" style="font-size:12.5px">${lista.filter((x) => !x.conta).length} dias não contados</span></div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:6px;padding:12px 16px">${lista.map((x) => `<div style="padding:7px 9px;border-radius:6px;border:1px solid var(--borda);background:${x.conta ? 'var(--painel)' : 'var(--painel-2)'};${x.d === c.fim ? 'border-color:var(--acc);box-shadow:0 0 0 1px var(--acc) inset' : ''}"><div class="entre" style="font-size:12px"><b class="num">${dataCurta(x.d)}</b><span class="mute">${DIAS[paraData(x.d).getDay()]}</span></div><div style="font-size:11.5px" class="${x.conta ? '' : 'mute'}">${x.conta ? `dia ${x.n}` : esc(motivo(x.d) || 'não conta')}</div></div>`).join('')}</div></div></div></div>`;
}

const MODELOS = {
  procuracao: ['Procuração ad judicia', (a, c, p) => `<p><b>OUTORGANTE:</b> ${esc(c.nome)}, ${c.tipo === 'PJ' ? 'pessoa jurídica inscrita no CNPJ' : 'inscrito(a) no CPF'} sob o nº ${esc(c.doc)}, residente/sediado(a) em ${esc(c.cidade)}.</p><p><b>OUTORGADOS:</b> ${ADV.slice(0, 3).map((x) => `${esc(x[1])} (${esc(x[2].split('· ')[1] || '')})`).join(', ')}, integrantes de ${esc(a.empresa)}, com escritório em ${esc(a.db.cfg.endereco)}.</p><p><b>PODERES:</b> amplos poderes para o foro em geral, com a cláusula <i>ad judicia et extra</i>, em qualquer juízo, instância ou tribunal, podendo propor ações, contestar, recorrer, transigir, desistir, firmar compromissos, receber e dar quitação${p ? `, especialmente para atuar no processo nº ${esc(p.numero)} (${esc(p.acao)})` : ''}.</p>`],
  contrato: ['Contrato de honorários advocatícios', (a, c, p) => `<p><b>CONTRATANTE:</b> ${esc(c.nome)}, ${esc(c.doc)}.</p><p><b>CONTRATADO:</b> ${esc(a.empresa)}, CNPJ ${esc(a.db.cfg.cnpj)}.</p><p><b>Cláusula 1ª · Objeto.</b> Prestação de serviços advocatícios ${p ? `no processo nº ${esc(p.numero)} (${esc(p.acao)}, ${esc(p.vara)})` : 'conforme proposta anexa'}.</p><p><b>Cláusula 2ª · Honorários.</b> Honorários contratuais de R$ ________, em ___ parcelas, e honorários de êxito de ${p?.exito || 20}% sobre o proveito econômico obtido.</p><p><b>Cláusula 3ª · Despesas.</b> Custas, emolumentos e despesas processuais correm por conta do contratante.</p><p><b>Cláusula 4ª · Foro.</b> Fica eleito o foro da comarca de Belo Horizonte/MG.</p>`],
  hipossuficiencia: ['Declaração de hipossuficiência', (a, c) => `<p>Eu, <b>${esc(c.nome)}</b>, inscrito(a) no CPF sob o nº ${esc(c.doc)}, declaro, para os fins do art. 99 do Código de Processo Civil, que não tenho condições de arcar com as custas processuais e honorários advocatícios sem prejuízo do meu sustento e de minha família, razão pela qual requeiro os benefícios da gratuidade da justiça.</p>`],
};
function modelos(a) {
  // escritório novo, sem clientes: os modelos são preenchidos com os dados de um cliente, então pede o primeiro cadastro
  if (!a.db.lista('clientes').length) return `<div class="cartao">${vazio('file-text', 'Cadastre um cliente para gerar documentos', 'Procuração, contrato de honorários e declaração saem preenchidos com os dados do cliente.', '<button type="button" class="btn pri" data-acao="novoCliente">Cadastrar cliente</button>')}</div>`;
  const st = a.estado.mod ||= { modelo: 'procuracao', cliente: a.db.lista('clientes')[0].id, processo: '' };
  if (!cli(a, st.cliente)) st.cliente = a.db.lista('clientes')[0].id; // o cliente escolhido foi excluído
  const c = cli(a, st.cliente), p = st.processo ? proc(a, st.processo) : null, [titulo, fn] = MODELOS[st.modelo];
  const doc = `<div class="doc"><div style="text-align:center"><b style="font-size:13px">${esc(a.empresa.toUpperCase())}</b><div style="color:#555;font-size:11px">${esc(a.db.cfg.endereco)}</div></div><h1 style="text-align:center;margin:22px 0 14px;font-size:16px">${esc(titulo.toUpperCase())}</h1><div style="line-height:1.7;text-align:justify;display:flex;flex-direction:column;gap:10px">${fn(a, c, p)}</div><p style="margin-top:22px">Belo Horizonte, ${new Date().getDate()} de ${nomeMes(hoje().slice(0, 7), true).replace(/ de \d+$/, '')} de ${new Date().getFullYear()}.</p><div class="ass" style="grid-template-columns:1fr;max-width:320px;margin:46px auto 0"><div>${esc(c.nome)}</div></div></div>`;
  return `<div class="grade g12" style="align-items:start"><div class="cartao"><div class="cartao-cab"><div><h3>Gerar documento</h3><div class="sub">Preenchido com os dados do cadastro</div></div></div><div class="cartao-corpo col" style="gap:12px">
    <label class="campo">Modelo<select data-mudar="modModelo">${Object.entries(MODELOS).map(([k, [n]]) => `<option value="${k}" ${k === st.modelo ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
    <label class="campo">Cliente<select data-mudar="modCliente">${a.db.lista('clientes').map((x) => `<option value="${x.id}" ${x.id === st.cliente ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></label>
    <label class="campo">Processo (opcional)<select data-mudar="modProc"><option value="">Nenhum</option>${a.db.lista('processos').filter((x) => x.cliente === st.cliente).map((x) => `<option value="${x.id}" ${x.id === st.processo ? 'selected' : ''}>${esc(x.numero)}</option>`).join('')}</select></label>
    <button type="button" class="btn pri" data-acao="imprimirModelo">${ic('printer')}Imprimir ou salvar PDF</button>
    <div class="dica">${ic('info')}<span>Na versão contratada, os modelos são os do seu escritório, com o seu timbre.</span></div></div></div>
    <div style="background:var(--lateral);padding:16px;border-radius:10px;border:1px solid var(--borda)" data-doc>${doc}</div></div>`;
}

function relatorios(a) {
  const ps = a.db.lista('processos'), enc = ps.filter((p) => p.status === 'encerrado');
  const meses = Array.from({ length: 6 }, (_, i) => mesMais(i - 5));
  const hs = a.db.lista('horas').filter((h) => diasAte(h.data) > -30);
  return `${kpis([{ rot: 'Processos ativos', icone: 'scales', val: num(ps.filter((p) => p.status === 'ativo').length), nota: `${ps.filter((p) => p.status === 'suspenso').length} suspensos` }, { rot: 'Valor das causas ativas', icone: 'currency-circle-dollar', val: moedaC(soma(ps.filter((p) => p.status !== 'encerrado'), (p) => p.valor)) }, { rot: 'Taxa de êxito', icone: 'trophy', val: pct((enc.filter((p) => p.resultado !== 'Improcedente').length / (enc.length || 1)) * 100), nota: `${enc.length} encerrados` }, { rot: 'Prazos cumpridos em dia (90 dias)', icone: 'seal-check', val: '100%', nota: 'nenhum prazo perdido' }])}
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Processos por área</h3><div class="sub">Ativos e suspensos</div></div></div><div class="cartao-corpo">${rosca({ itens: AREAS.map((ar) => ({ rot: ar, v: ps.filter((p) => p.area === ar && p.status !== 'encerrado').length, cor: COR_AREA[ar] })), centro: num(ps.filter((p) => p.status !== 'encerrado').length), sub: 'processos' })}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Por fase</h3></div></div><div class="cartao-corpo">${barrasH(FASES.slice(0, 6).map((f) => ({ rot: f, v: ps.filter((p) => p.fase === f && p.status !== 'encerrado').length })))}</div></div></div>
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Honorários recebidos</h3><div class="sub">Últimos 6 meses</div></div></div><div class="cartao-corpo">${barras({ dados: meses.map((m) => ({ rot: nomeMes(m), v: [soma(a.db.lista('honorarios').filter((h) => h.status === 'recebido' && (h.recebido_em || '').startsWith(m)), (h) => h.valor)] })), series: [{ nome: 'Recebido', cor: 'var(--acc)' }], fmt: moedaC, altura: 200 })}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Horas por pessoa</h3><div class="sub">Últimos 30 dias</div></div></div><div class="cartao-corpo">${barrasH(ADV.map(([id, n]) => ({ html: `<span class="flex">${av(n, 'p')}${esc(n)}</span>`, v: soma(hs.filter((h) => h.advogado === id), (h) => h.minutos), extra: `${pct((soma(hs.filter((h) => h.advogado === id && h.faturavel), (h) => h.minutos) / (soma(hs.filter((h) => h.advogado === id), (h) => h.minutos) || 1)) * 100)} faturável` })), { fmt: hrs })}</div></div></div>`;
}

// ---------------------------------------------------------------- fichas
const fichas = {
  processo(a, id, aba = 'resumo') {
    const p = proc(a, id); if (!p) return null;
    const c = cli(a, p.cliente), ands = a.db.lista('andamentos').filter((x) => x.processo === id).sort((x, y) => y.data.localeCompare(x.data));
    const przs = a.db.lista('prazos').filter((x) => x.processo === id).sort((x, y) => (x.status === y.status ? x.data.localeCompare(y.data) : x.status === 'pendente' ? -1 : 1));
    const ts = a.db.lista('tarefas').filter((x) => x.processo === id), hs = a.db.lista('horas').filter((x) => x.processo === id);
    let corpo = '';
    if (aba === 'resumo') corpo = `<div class="gav-sec">${props([['user', 'Cliente', `<a href="javascript:void 0" data-abrir="cliente:${c?.id}">${esc(c?.nome || '—')}</a> <span class="mute">(${esc(p.polo)})</span>`], ['users', 'Parte contrária', esc(p.contraria || '—')], ['scales', 'Ação', esc(p.acao)], ['tag', 'Área', etArea(p.area)], ['buildings', 'Vara / tribunal', esc(p.vara)], ['flag', 'Fase', esc(p.fase)], ['currency-circle-dollar', 'Valor da causa', moeda(p.valor)], ['percent', 'Êxito contratado', p.exito ? `${p.exito}% · estimado ${moeda((p.valor * p.exito) / 100)}` : null], ['calendar-blank', 'Distribuído em', `${dataCurta(p.distribuido)} · há ${Math.round(-diasAte(p.distribuido) / 30)} meses`], ['user-circle', 'Responsável', esc(nomeA(p.responsavel))], p.resultado ? ['trophy', 'Resultado', esc(p.resultado)] : null])}</div>
      <div class="gav-sec"><h4>Último andamento</h4>${ands[0] ? `<div><b>${esc(ands[0].texto)}</b><div class="mute" style="font-size:12.5px">${dataCurta(ands[0].data)} · ${esc(ands[0].fonte)}</div></div>` : '<span class="mute">—</span>'}</div>`;
    if (aba === 'and') corpo = `<div class="gav-sec"><div class="compositor"><textarea placeholder="Registrar andamento ou anotação interna…" data-and-txt></textarea><div class="pe"><button type="button" class="btn pri peq" data-acao="addAnd" data-id="${id}" style="margin-left:auto">Registrar</button></div></div></div><div class="gav-sec">${linhaDoTempo(ands.map((x) => ({ quando: x.data, icone: x.fonte === 'Interno' ? 'note-pencil' : x.fonte === 'Diário Oficial' ? 'envelope-open' : 'gavel', tom: x.fonte === 'Interno' ? 'al' : 'acc', html: `${esc(x.texto)} <span class="mute">· ${esc(x.fonte)}</span>` })))}</div>`;
    if (aba === 'prazos') corpo = `<div class="gav-sec"><div class="entre" style="margin-bottom:8px"><h4 style="margin:0">Prazos e audiências</h4><button type="button" class="btn peq" data-acao="novoPrazo" data-processo="${id}">${ic('plus')}Novo</button></div>${przs.length ? `<ul class="lista" style="margin:0 -20px">${przs.map((x) => { const [n, i, cor] = TIPOS_PRAZO[x.tipo]; return `<li><input type="checkbox" data-mudar="cumprir" data-id="${x.id}" ${x.status === 'cumprido' ? 'checked' : ''} aria-label="Cumprido"><span class="av p" style="background:${cor}">${ic(i, 'p')}</span><div class="cresce"><div class="t" style="${x.status === 'cumprido' ? 'text-decoration:line-through;color:var(--tx-3)' : ''}">${esc(x.titulo)}</div><div class="s">${esc(n)} · ${dataCurta(x.data)}${x.hora ? ` às ${x.hora}` : ''} · ${esc(nomeA(x.responsavel))}</div></div>${etUrg(x)}</li>`; }).join('')}</ul>` : vazio('hourglass', 'Nenhum prazo')}</div>`;
    if (aba === 'tarefas') corpo = `<div class="gav-sec"><div class="entre" style="margin-bottom:8px"><h4 style="margin:0">Tarefas</h4><button type="button" class="btn peq" data-acao="novaTarefa" data-processo="${id}">${ic('plus')}Nova</button></div>${ts.length ? `<ul class="lista" style="margin:0 -20px">${ts.map((t) => `<li>${av(nomeA(t.responsavel), 'p')}<div class="cresce"><div class="t">${esc(t.titulo)}</div><div class="s">prazo ${dataCurta(t.prazo)}</div></div>${et(COLUNAS_TAREFA.find((c2) => c2[0] === t.status)[1], t.status === 'feita' ? 'ok' : '')}</li>`).join('')}</ul>` : vazio('list-checks', 'Nenhuma tarefa')}</div>`;
    if (aba === 'horas') corpo = `<div class="gav-sec"><div class="entre" style="margin-bottom:8px"><h4 style="margin:0">${hrs(soma(hs, (h) => h.minutos))} trabalhadas</h4><button type="button" class="btn peq" data-acao="novaHora" data-processo="${id}">${ic('plus')}Lançar</button></div>${hs.length ? `<ul class="lista" style="margin:0 -20px">${hs.sort((x, y) => y.data.localeCompare(x.data)).slice(0, 25).map((h) => `<li>${av(nomeA(h.advogado), 'p')}<div class="cresce"><div class="t">${esc(h.descricao)}</div><div class="s">${dataCurta(h.data)}</div></div><b class="num">${hrs(h.minutos)}</b></li>`).join('')}</ul>` : vazio('timer', 'Nenhuma hora lançada')}</div>`;
    return { html: ficha({ tipo: 'Processo', icone: 'scales', titulo: `<span class="mono" style="font-size:17px">${esc(p.numero)}</span>`, sub: `${etArea(p.area)}<span>${esc(p.acao)}</span><span>· ${esc(c?.nome || '')} × ${esc(p.contraria || '')}</span>`,
      extra: `<div class="flex" style="margin-top:12px;flex-wrap:wrap">${p.status === 'encerrado' ? et(`Encerrado · ${p.resultado}`, 'ok') : `<select data-mudar="faseProc" data-id="${id}" style="width:auto;height:28px">${FASES.map((f) => `<option ${f === p.fase ? 'selected' : ''}>${f}</option>`).join('')}</select>`}${p.status === 'suspenso' ? et('Suspenso', 'al') : ''}<button type="button" class="btn peq" data-acao="iniciarCron" data-processo="${id}">${ic('play')}Cronômetro</button><button type="button" class="btn peq" data-acao="linkProcesso" data-id="${id}">${ic('link')}Portal do cliente</button></div>`,
      aba, abas: [['resumo', 'Resumo'], ['and', 'Andamentos', ands.length], ['prazos', 'Prazos', przs.filter((x) => x.status === 'pendente').length], ['tarefas', 'Tarefas', ts.length], ['horas', 'Horas']], corpo,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarProc" data-id="${id}">${ic('pencil-simple')}Editar</button><button type="button" class="btn fant peq ic-so" data-acao="menuProc" data-id="${id}" aria-label="Mais">${ic('dots-three')}</button>` }), montar: (g) => (g.dataset.aba = aba) };
  },
  cliente(a, id) {
    const c = cli(a, id); if (!c) return null;
    const ps = a.db.lista('processos').filter((p) => p.cliente === id), hon = a.db.lista('honorarios').filter((h) => h.cliente === id).sort((x, y) => y.vencimento.localeCompare(x.vencimento));
    return { estreita: true, html: ficha({ tipo: 'Cliente', icone: c.tipo === 'PJ' ? 'buildings' : 'user', titulo: esc(c.nome), avatar: av(c.nome, 'gg'), sub: `<span class="mono">${esc(c.doc)}</span><span>· cliente desde ${dataCurta(c.desde)}</span>`,
      extra: `<div class="flex" style="margin-top:12px"><a class="btn peq" href="${telLink(c.telefone)}" target="_blank" rel="noopener">${ic('whatsapp-logo')}WhatsApp</a><a class="btn peq" href="mailto:${esc(c.email)}">${ic('envelope-simple')}E-mail</a><button type="button" class="btn peq" data-acao="docCliente" data-id="${id}">${ic('file-text')}Gerar documento</button></div>`,
      corpo: `<div class="gav-sec">${props([['phone', 'Telefone', esc(c.telefone)], ['envelope-simple', 'E-mail', esc(c.email)], ['map-pin', 'Cidade', esc(c.cidade)], ['globe', 'Origem', esc(c.origem || '—')], ['user-circle', 'Responsável', esc(nomeA(c.responsavel))]])}</div>
        <div class="gav-sec"><h4>Processos (${ps.length})</h4>${ps.length ? `<ul class="lista" style="margin:0 -20px">${ps.map((p) => `<li class="clicavel" data-abrir="processo:${p.id}"><div class="cresce"><div class="t mono" style="font-size:12.5px">${esc(p.numero)}</div><div class="s corta">${esc(p.acao)}</div></div>${etArea(p.area)}</li>`).join('')}</ul>` : vazio('scales', 'Nenhum processo')}</div>
        <div class="gav-sec"><h4>Financeiro</h4>${hon.length ? `<ul class="lista" style="margin:0 -20px">${hon.slice(0, 8).map((h) => `<li><div class="cresce"><div class="t corta">${esc(h.descricao)}</div><div class="s">venc. ${dataCurta(h.vencimento)}</div></div>${etHon(h)}<b class="num" style="min-width:84px;text-align:right">${moeda(h.valor)}</b></li>`).join('')}</ul>` : vazio('hand-coins', 'Sem lançamentos')}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCli" data-id="${id}">${ic('pencil-simple')}Editar</button>` }) };
  },
};

// ---------------------------------------------------------------- aplicativo
const app = criarApp({
  id: 'juridico', nome: 'Veltria Jurídico', sub: 'Gestão do escritório', cor: '#0f766e', icone: 'scales', empresa: 'Castro & Moura Advogados', conta: '4 pessoas · Belo Horizonte, MG',
  produto: { mensal: 149 }, semente, colecoes, fichas, buscaDica: 'processos (número), clientes',
  portal: {
    processo: {
      explica: 'O cliente acompanha o processo pelo celular, com cada andamento explicado em linguagem simples, as próximas audiências e um canal para mandar dúvidas.',
      montar: (a, id) => {
        const pr = proc(a, id); if (!pr) return null;
        const ands = a.db.lista('andamentos').filter((x) => x.processo === id && x.fonte !== 'Interno').sort((x, y) => y.data.localeCompare(x.data)).slice(0, 20);
        const prox = a.db.lista('prazos').filter((x) => x.processo === id && x.status === 'pendente' && x.tipo !== 'prazo' && x.data >= hoje()).sort((x, y) => x.data.localeCompare(y.data));
        return { numero: pr.numero, cliente: cli(a, pr.cliente)?.nome || '', assunto: pr.acao, vara: pr.vara, advogado: nomeA(pr.responsavel), situacao: pr.status === 'encerrado' ? `Encerrado · ${pr.resultado || ''}` : `${pr.status === 'suspenso' ? 'Suspenso' : 'Em andamento'} · fase: ${pr.fase}`,
          andamentos: ands.map((x) => ({ data: x.data, texto: x.simples || explicar(x.texto) })), proximos: prox.map((x) => ({ data: x.data, hora: x.hora || '', titulo: TIPOS_PRAZO[x.tipo]?.[0] || x.titulo })) };
      },
      responder: (a, r) => {
        const pr = proc(a, r.ref); if (!pr || r.acao !== 'mensagem') return '';
        const c = cli(a, pr.cliente), txt = String(r.dados.texto || '').slice(0, 1500);
        a.db.salvar('tarefas', { titulo: `Responder ${c?.nome.split(' ')[0] || 'cliente'}: ${txt.slice(0, 80)}`, processo: pr.id, responsavel: pr.responsavel, status: 'afazer', prazo: diaMais(1), descricao: txt, criado: hoje() });
        a.db.salvar('andamentos', { processo: pr.id, data: hoje(), texto: `Mensagem do cliente pelo portal: ${txt}`, fonte: 'Interno' });
        return `${c?.nome.split(' ')[0] || 'Cliente'} mandou uma dúvida pelo portal do processo ${pr.numero}: virou tarefa para ${nomeA(pr.responsavel)}`;
      },
    },
  },
  modelos: [
    { id: 'generalista', nome: 'Escritório generalista', desc: 'Cível, família, consumidor e contratos', dados: {} },
    { id: 'trabalhista', nome: 'Trabalhista', desc: 'Reclamações, cálculos e audiências na Justiça do Trabalho', dados: {}, aoAplicar: (a) => { a.db.cfg.prazo_padrao = 8; } },
    { id: 'previdenciario', nome: 'Previdenciário', desc: 'INSS, aposentadorias, benefícios e perícias', dados: {} },
    { id: 'empresarial', nome: 'Empresarial', desc: 'Contratos, societário e cobranças de empresas', dados: {} },
  ],
  passos: (a) => [{ id: 'oab', rot: 'Cadastre as OABs para receber as intimações sozinho', feito: (a.db.cfg.oabs || []).length > 0, href: '#/config' }, { id: 'portal', rot: 'Mande o portal do processo para um cliente', feito: Object.keys(a.db.cfg.links || {}).some((k) => k.startsWith('processo:')) }],
  configExtra: (a) => { const oabs = a.db.cfg.oabs || []; return `<div class="cartao"><div class="cartao-cab"><div><h3>Captura de intimações (DJEN)</h3><div class="sub">Diário de Justiça Eletrônico Nacional · busca diária pelas OABs</div></div></div>
    <ul class="lista">${oabs.map((o, i) => `<li>${av(nomeA(o.advogado) === '—' ? `OAB ${o.numero}` : nomeA(o.advogado))}<div class="cresce"><div class="t">OAB ${esc(o.numero)}/${esc(o.uf)}</div><div class="s">${esc(nomeA(o.advogado))}</div></div><button type="button" class="btn fant peq" data-acao="tirarOAB" data-i="${i}">Remover</button></li>`).join('') || `<li><span class="mute">Nenhuma OAB cadastrada</span></li>`}</ul>
    <div class="cartao-corpo" style="border-top:1px solid var(--borda)"><form class="flex" data-oab style="flex-wrap:wrap"><input name="numero" placeholder="Nº da OAB" inputmode="numeric" required style="width:120px"><select name="uf" style="width:90px">${'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ').map((u) => `<option ${u === 'MG' ? 'selected' : ''}>${u}</option>`).join('')}</select><select name="advogado" style="flex:1;min-width:150px">${ADV.slice(0, 3).map(([id, n]) => `<option value="${id}">${esc(n)}</option>`).join('')}</select><button type="button" class="btn pri" data-acao="addOAB">${ic('plus')}Adicionar</button></form></div></div>`; },
  equipe: ADV.map(([, n, p]) => [n, p]),
  busca: [{ colecao: 'processos', grupo: 'Processos', icone: 'scales', ficha: 'processo', rot: (p) => p.numero, sub: (p, a) => rotProc(a, p) }, { colecao: 'clientes', grupo: 'Clientes', icone: 'user', ficha: 'cliente', rot: (c) => c.nome, sub: (c) => c.doc }],
  comandos: [{ rot: 'Novo processo', icone: 'plus', acao: (a) => a.acoes.novoProcesso() }, { rot: 'Novo prazo ou audiência', icone: 'calendar-plus', acao: (a) => a.acoes.novoPrazo({}) }, { rot: 'Calcular prazo', icone: 'calculator', acao: (a) => a.ir('#/calculadora') }, { rot: 'Lançar horas', icone: 'timer', acao: (a) => a.acoes.novaHora({}) }],
  paginas: [
    { id: 'painel', lado: FERR.tarefas, rot: 'Painel', icone: 'house', titulo: 'Painel do escritório', render: painel, atalho: 'i' },
    { id: 'intimacoes', rot: 'Intimações', icone: 'tray', render: intimacoes, cheio: true, atalho: 'm', cont: (a) => { const n = a.db.lista('publicacoes').filter((x) => x.status === 'nova').length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'prazos', lado: FERR.prazos, rot: 'Prazos e agenda', icone: 'hourglass', titulo: 'Prazos e agenda', render: prazosPag, atalho: 'p', novo: (a) => a.acoes.novoPrazo({}), cont: (a) => { const n = pend(a).filter((x) => x.tipo === 'prazo' && diasAte(x.data) <= 1).length; return n ? { n, tom: 'er' } : 0; } },
    { grupo: 'Escritório' },
    { id: 'processos', lado: FERR.processos, rot: 'Processos', icone: 'scales', render: processos, atalho: 'r', novo: (a) => a.acoes.novoProcesso() },
    { id: 'clientes', rot: 'Clientes', icone: 'users', render: clientes, atalho: 'c', novo: (a) => a.acoes.novoCliente() },
    { id: 'tarefas', rot: 'Tarefas', icone: 'kanban', render: tarefas, cheio: true, atalho: 't', novo: (a) => a.acoes.novaTarefa({}) },
    { id: 'horas', rot: 'Horas (timesheet)', icone: 'timer', titulo: 'Horas trabalhadas', render: timesheet, cont: (a) => (a.db.cfg.cronometro ? { n: '●', tom: 'er' } : 0) },
    { grupo: 'Gestão' },
    { id: 'financeiro', lado: FERR.financeiro, rot: 'Honorários', icone: 'hand-coins', render: financeiro, atalho: 'h', cont: (a) => { const n = a.db.lista('honorarios').filter((h) => honStatus(h) === 'atrasado').length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'calculadora', lado: FERR.calculadora, rot: 'Calculadora de prazos', icone: 'calculator', render: calculadora },
    { id: 'modelos', rot: 'Modelos de documentos', icone: 'file-text', render: modelos },
    { id: 'relatorios', rot: 'Relatórios', icone: 'chart-bar', render: relatorios },
    paginaEquipe(EQUIPE),
    ...ferramentaPaginas(FERR, FERR_ITENS),
  ],
});

const reab = () => { app.render(); app.reabrir(); };
let tCron;
const tickCron = () => { clearInterval(tCron); tCron = setInterval(() => { const el = document.querySelector('[data-cron]'); if (!el) return; const s = Math.floor((Date.now() - Number(el.dataset.cron)) / 1000); el.textContent = `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }, 1000); };
tickCron();
Object.assign(app.acoes, {
  linkProcesso: (d) => { const pr = proc(app, d.id), c = cli(app, pr.cliente); app.portal.compartilhar('processo', d.id, { titulo: `Portal do cliente · ${pr.numero}`, telefone: c?.telefone, texto: `Olá, ${c?.nome.split(' ')[0]}! Acompanhe o seu processo por aqui, com cada novidade explicada de forma simples:` }); },
  zapSimples: (d) => { const pub = app.db.obter('publicacoes', d.id), pr = proc(app, pub.processo), c = cli(app, pr?.cliente), txt = document.querySelector('[data-simples]')?.value || explicar(pub.texto); app.db.salvar('publicacoes', { id: d.id, simples: txt }); window.open(`${telLink(c?.telefone)}?text=${encodeURIComponent(`Olá, ${c?.nome.split(' ')[0] || ''}! Novidade no seu processo ${pub.numero}:\n\n${txt}\n\n${app.empresa}`)}`, '_blank', 'noopener'); },
  publicarSimples: (d) => { const pub = app.db.obter('publicacoes', d.id), txt = document.querySelector('[data-simples]')?.value || explicar(pub.texto); app.db.salvar('publicacoes', { id: d.id, simples: txt }); app.db.salvar('andamentos', { processo: pub.processo, data: pub.data, texto: pub.texto.slice(0, 300), simples: txt, fonte: 'Diário Oficial' }); app.portal.publicar(); avisar('Publicado no portal do cliente'); },
  novoProcesso: async () => { const p = await editar(app, 'processos'); if (p) { app.render(); app.abrir('processo', p.id); } },
  editarProc: async (d) => { if (await editar(app, 'processos', proc(app, d.id))) reab(); },
  novoCliente: async () => { const c = await editar(app, 'clientes'); if (c) { app.render(); app.abrir('cliente', c.id); } },
  editarCli: async (d) => { if (await editar(app, 'clientes', cli(app, d.id))) reab(); },
  novoPrazo: async (d = {}) => { if (await editar(app, 'prazos', null, d.processo ? { processo: d.processo, responsavel: proc(app, d.processo)?.responsavel } : {})) reab(); },
  abrirPrazo: (d) => { const x = app.db.obter('prazos', d.id); app.abrir('processo', x.processo, 'prazos'); },
  novaTarefa: async (d = {}) => { if (await editar(app, 'tarefas', null, d.processo ? { processo: d.processo } : {})) reab(); },
  novaHora: async (d = {}) => { if (await editar(app, 'horas', null, d.processo ? { processo: d.processo } : {})) reab(); },
  novoHon: async () => { if (await editar(app, 'honorarios')) app.render(); },
  cumprir: (d, el) => { const x = app.db.obter('prazos', d.id); app.db.salvar('prazos', { id: d.id, status: el.checked ? 'cumprido' : 'pendente', cumprido_em: el.checked ? hoje() : null }); if (el.checked) { app.db.lista('andamentos').unshift({ id: `and${Date.now()}`, processo: x.processo, data: hoje(), texto: `${TIPOS_PRAZO[x.tipo][0]} cumprido: ${x.titulo}`, fonte: 'Interno' }); app.db.gravar(); avisar(`${x.titulo}: cumprido`, { desfazer: () => { app.db.salvar('prazos', { id: d.id, status: 'pendente' }); reab(); } }); } reab(); },
  modoPrz: (d) => { app.estado.prz.modo = d.m; app.render(); },
  mesPrz: (d) => { app.estado.prz.mes = Number(d.d) === 0 ? hoje().slice(0, 7) : mesMais(Number(d.d), `${app.estado.prz.mes}-15`); app.render(); },
  filtroPub: (d) => { app.estado.pub.filtro = d.f; app.estado.pub.sel = null; app.render(); },
  selPub: (d) => { app.estado.pub.sel = d.id; app.render(); },
  irPub: (d) => { app.estado.pub = { sel: d.id, filtro: 'nova' }; app.ir('#/intimacoes'); },
  diasPub: (d, el) => { app.estado.pub.dias = Math.max(1, Number(el.value) || 15); app.render(); },
  uteisPub: (d, el) => { app.estado.pub.uteis = el.value === '1'; app.render(); },
  atalhoPub: (d) => { app.estado.pub.dias = Number(d.n); app.render(); },
  tratarPub: (d) => { app.db.salvar('publicacoes', { id: d.id, status: 'tratada' }); avisar('Intimação tratada'); app.estado.pub.sel = null; app.render(); },
  criarPrazoPub: async (d) => {
    const pub = app.db.obter('publicacoes', d.id), p = proc(app, pub.processo), st = app.estado.pub, c = calcPrazo(pub.data, st.dias ?? 15, st.uteis ?? true);
    if (!p) return avisar('Cadastre o processo antes de agendar o prazo', { tipo: 'erro' });
    const titulo = /audi[eê]ncia/i.test(pub.texto) ? 'Audiência de conciliação' : /contrarraz/i.test(pub.texto) ? 'Contrarrazões' : /laudo/i.test(pub.texto) ? 'Manifestação sobre laudo' : /provas/i.test(pub.texto) ? 'Especificação de provas' : /contesta/i.test(pub.texto) ? 'Réplica à contestação' : 'Manifestação';
    const x = app.db.salvar('prazos', { processo: p.id, tipo: 'prazo', titulo, data: c.fim, responsavel: p.responsavel, status: 'pendente', dias: c.dias, origem: pub.id });
    app.db.salvar('publicacoes', { id: d.id, status: 'tratada', prazo: x.id });
    app.db.lista('andamentos').unshift({ id: `and${Date.now()}`, processo: p.id, data: pub.data, texto: `Intimação: ${pub.texto.slice(0, 90)}…`, fonte: 'Diário Oficial' }); app.db.gravar();
    avisar(`Prazo "${titulo}" agendado para ${dataBR(c.fim)} · ${nomeA(p.responsavel)}`); app.estado.pub.sel = null; app.render();
  },
  quemTar: (d) => { app.estado.tar.quem = d.q; app.render(); },
  capturarDJEN: async (d, el) => { el.disabled = true; try { await capturarDJEN(app); app.estado.pub = { sel: null, filtro: 'nova' }; } catch (e) { avisar(`Não foi possível consultar o DJEN agora (${e.message})`, { tipo: 'erro' }); } app.render(); },
  addOAB: () => { const f = document.querySelector('[data-oab]'); const n = soDigitos(f.numero.value); if (!n) return f.numero.focus(); app.db.cfg.oabs = [...(app.db.cfg.oabs || []), { numero: n, uf: f.uf.value, advogado: f.advogado.value }]; app.db.gravar(); avisar(`OAB ${n}/${f.uf.value} cadastrada`); app.render(); },
  tirarOAB: (d) => { app.db.cfg.oabs = (app.db.cfg.oabs || []).filter((_, i) => i !== Number(d.i)); app.db.gravar(); app.render(); },
  cadastrarDaPub: async (d) => { const pub = app.db.obter('publicacoes', d.id); const p = await editar(app, 'processos', null, { numero: pub.numero }); if (p) { app.db.salvar('publicacoes', { id: pub.id, processo: p.id }); app.render(); } },
  iniciarCron: async (d = {}) => {
    let pid = d.processo;
    if (!pid) { const r = await modal({ titulo: 'Iniciar cronômetro', largura: 480, corpo: `<form class="form-grade" onsubmit="return false"><label class="campo largo">Processo<select name="p">${app.db.lista('processos').filter((p) => p.status !== 'encerrado').map((p) => `<option value="${p.id}">${esc(p.numero)} · ${esc(rotProc(app, p))}</option>`).join('')}</select></label><label class="campo largo">O que você vai fazer<input name="d" value="Elaboração de petição"></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Iniciar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] }); if (!r) return; pid = r.p; app.db.cfg.cronometro = { processo: pid, inicio: Date.now(), descricao: r.d }; } else app.db.cfg.cronometro = { processo: pid, inicio: Date.now(), descricao: 'Trabalho no processo' };
    app.db.gravar(); fecharGaveta(); avisar('Cronômetro iniciado'); app.ir('#/horas'); tickCron();
  },
  pararCron: () => { const c = app.db.cfg.cronometro; if (!c) return; const min = Math.max(5, Math.round((Date.now() - c.inicio) / 60000 / 5) * 5); app.db.salvar('horas', { processo: c.processo, cliente: proc(app, c.processo)?.cliente, advogado: EU, data: hoje(), minutos: min, descricao: c.descricao, faturavel: true, faturado: false }); app.db.cfg.cronometro = null; app.db.gravar(); avisar(`${hrs(min)} lançadas`); app.render(); },
  mesTs: (d, el) => { app.estado.ts.mes = el.value; app.render(); },
  faturarHoras: async (d) => { const l = app.db.lista('horas').filter((h) => h.cliente === d.c && h.faturavel && !h.faturado); const v = Math.round(soma(l, (h) => (h.minutos / 60) * valorHora(h.advogado))); if (!(await confirmar(`Gerar cobrança de ${moeda(v)} para ${cli(app, d.c).nome} (${hrs(soma(l, (h) => h.minutos))} trabalhadas)?`, { rotulo: 'Gerar cobrança' }))) return; l.forEach((h) => app.db.salvar('horas', { id: h.id, faturado: true })); app.db.salvar('honorarios', { cliente: d.c, descricao: `Horas trabalhadas · ${hrs(soma(l, (h) => h.minutos))}`, tipo: 'horas', valor: v, vencimento: diaMais(10), status: 'aberto' }); avisar(`Cobrança de ${moeda(v)} criada em Honorários`); app.render(); },
  receber: (d) => { app.db.salvar('honorarios', { id: d.id, status: 'recebido', recebido_em: hoje() }); avisar('Pagamento registrado', { desfazer: () => { app.db.salvar('honorarios', { id: d.id, status: 'aberto', recebido_em: null }); app.render(); } }); app.render(); },
  addAnd: (d) => { const t = document.querySelector('[data-and-txt]'); if (!t.value.trim()) return t.focus(); app.db.lista('andamentos').unshift({ id: `and${Date.now()}`, processo: d.id, data: hoje(), texto: t.value.trim(), fonte: 'Interno' }); app.db.gravar(); avisar('Andamento registrado'); reab(); },
  faseProc: (d, el) => { app.db.salvar('processos', { id: d.id, fase: el.value, status: el.value === 'Encerrado' ? 'encerrado' : 'ativo', resultado: el.value === 'Encerrado' ? 'Procedente' : '' }); app.db.lista('andamentos').unshift({ id: `and${Date.now()}`, processo: d.id, data: hoje(), texto: `Fase alterada para ${el.value}`, fonte: 'Interno' }); app.db.gravar(); avisar(`Fase: ${el.value}`); reab(); },
  menuProc: (d, el) => pop(el, [
    { rotulo: 'Novo prazo ou audiência', icone: 'calendar-plus', acao: () => app.acoes.novoPrazo({ processo: d.id }) },
    { rotulo: 'Lançar horas', icone: 'timer', acao: () => app.acoes.novaHora({ processo: d.id }) },
    { rotulo: proc(app, d.id).status === 'suspenso' ? 'Reativar processo' : 'Suspender processo', icone: 'pause', acao: () => { const p = proc(app, d.id); app.db.salvar('processos', { id: d.id, status: p.status === 'suspenso' ? 'ativo' : 'suspenso' }); reab(); } },
    { sep: true }, { rotulo: 'Excluir processo', icone: 'trash', perigo: true, acao: () => excluir(app, 'processos', d.id) },
  ]),
  calcDisp: (d, el) => { app.estado.calc.disp = el.value || hoje(); app.render(); },
  calcDias: (d, el) => { app.estado.calc.dias = Math.max(1, Number(el.value) || 15); app.render(); },
  calcUteis: (d, el) => { app.estado.calc.uteis = el.value === '1'; app.render(); },
  calcAtalho: (d) => { app.estado.calc.dias = Number(d.n); app.render(); },
  modModelo: (d, el) => { app.estado.mod.modelo = el.value; app.render(); },
  modCliente: (d, el) => { app.estado.mod.cliente = el.value; app.estado.mod.processo = ''; app.render(); },
  modProc: (d, el) => { app.estado.mod.processo = el.value; app.render(); },
  imprimirModelo: () => imprimir(document.querySelector('[data-doc]').innerHTML),
  docCliente: (d) => { fecharGaveta(); app.estado.mod = { modelo: 'procuracao', cliente: d.id, processo: '' }; app.ir('#/modelos'); },
});

// busca automática no DJEN uma vez por dia ao abrir o sistema
setTimeout(() => { if (app.db?.cfg?.oabs?.length && app.db.cfg.djen_ultima !== hoje()) capturarDJEN(app, { silencioso: true }).then((n) => { if (n) app.render(); }).catch(() => {}); }, 2500);

// ferramentas do painel ao lado das telas (WhatsApp e copiar)
equipeViva(app, EQUIPE);
Object.assign(app.acoes, acoesLado());
app.travarLado = travarPro;   // avisos e mensagens prontas: plano Pro (calculadoras: Básico)
