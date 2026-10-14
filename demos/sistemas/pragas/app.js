// Blue Rose Guard · controle de pragas: agenda, comprovante, pontos de isca, ocorrências, relatório mensal, garantia e renovações
import {
  criarApp, esc, moeda, moedaC, num, pct, hoje, diaMais, mesMais, nomeMes, dataCurta, dataBR, relativo, diasAte, paraData,
  sorteio, soma, agrupar, av, ic, et, kpis, barras, barrasH, DIAS, telLink,
  modal, confirmar, avisar, editar, excluir, ficha, props, linhaDoTempo, vazio, imprimir,
} from '../base/nexo.js';
import { LADOS as FERR, ITENS as FERR_ITENS } from './ferramentas.js';
import { acoesLado, ferramentaPaginas, travarPro } from '../base/lado.js';
import { equipeViva, paginaEquipe } from '../base/equipe-viva.js';

const SERVICOS = ['Desinsetização', 'Desratização', 'Descupinização', 'Limpeza de caixa d\'água', 'Controle de pombos', 'Sanitização de ambientes'];
const PRAGAS = ['Baratas', 'Formigas', 'Ratos', 'Cupins', 'Escorpiões', 'Mosquitos', 'Pulgas', 'Traças', 'Aranhas', 'Pombos'];
const TIPOS = ['Restaurante', 'Condomínio', 'Residência', 'Indústria', 'Escola', 'Comércio', 'Clínica'];
const PLANOS = [['avulso', 'Avulso', 0], ['mensal', 'Mensal', 30], ['bimestral', 'Bimestral', 60], ['trimestral', 'Trimestral', 90], ['semestral', 'Semestral', 180]];
const TECNICOS = [['te0', 'Anderson Lima'], ['te1', 'Rogério Batista'], ['te2', 'Wellington Sousa']];
const EQUIPE = { colecao: 'tecnicos', rot: 'Técnicos', icone: 'user-gear', singular: 'técnico', plural: 'técnicos', vazio: 'os técnicos de campo', lista: TECNICOS,
  campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel' }],
  linha: (r) => [r.id, r.nome], registro: ([id, nome]) => ({ id, nome }) };
const padraoEquipe = (eu) => (TECNICOS.find((x) => x[0] === eu) || TECNICOS[0] || [''])[0];
const freqP = (k) => (PLANOS.find((p) => p[0] === k) || PLANOS[0])[2];
const nomeT = (id) => (TECNICOS.find((t) => t[0] === id) || [, '—'])[1];
const STATUS = [['agendada', 'Agendada', 'info'], ['executada', 'Executada', 'ok'], ['cancelada', 'Cancelada', '']];
const stt = (id) => STATUS.find((s) => s[0] === id) || STATUS[0];
const LEITURAS = [['intacta', 'Intacta', 'ok'], ['consumida', 'Consumida', 'er'], ['substituida', 'Substituída', 'info'], ['ausente', 'Ausente', 'al']];
const nomeL = (k) => (LEITURAS.find((x) => x[0] === k) || [, k])[1];
const TIPOS_PONTO = ['Porta-isca', 'Armadilha adesiva', 'Armadilha luminosa'];
const OCORRENCIAS = ['Lixo exposto ou sem tampa', 'Frestas em portas ou rodapés', 'Ralos sem tela ou proteção', 'Acúmulo de caixas e materiais', 'Umidade ou infiltração', 'Alimento exposto ou mal armazenado', 'Vegetação encostada na parede', 'Sinais de roedor (fezes, roeduras)'];
const RECOMENDA = { 'Lixo exposto ou sem tampa': 'Manter o lixo em recipientes com tampa e retirar diariamente.', 'Frestas em portas ou rodapés': 'Instalar veda-portas e vedar frestas acima de 6 mm.', 'Ralos sem tela ou proteção': 'Instalar ralos com fechamento (abre e fecha) ou telas.', 'Acúmulo de caixas e materiais': 'Organizar o estoque sobre estrados, a 10 cm da parede e do piso.', 'Umidade ou infiltração': 'Corrigir vazamentos e pontos de umidade.', 'Alimento exposto ou mal armazenado': 'Guardar alimentos em recipientes fechados.', 'Vegetação encostada na parede': 'Manter faixa de 50 cm sem vegetação junto às paredes.', 'Sinais de roedor (fezes, roeduras)': 'Reforçar iscagem e verificar pontos de entrada.' };

// ---------------------------------------------------------------- dados de exemplo (fictícios)
function semente() {
  const r = sorteio(20261118), e1 = (l) => l[Math.floor(r() * l.length)], ent = (a, b) => a + Math.floor(r() * (b - a + 1));
  const produtos = [['Insetix CS 2,5 (exemplo)', 'Lambda-cialotrina', 'Piretroide', '2,5%', '0000.0000.001', 'Líquido (L)', 3.2, 'Tratamento sintomático'], ['Baragel Pro (exemplo)', 'Hidrametilnona', 'Amidinohidrazona', '2,15%', '0000.0000.002', 'Gel (g)', 820, 'Tratamento sintomático'], ['Rodenblock (exemplo)', 'Brodifacoum', 'Cumarínico', '0,005%', '0000.0000.003', 'Bloco (kg)', 6.5, 'Vitamina K1'], ['Cupinil SC (exemplo)', 'Fipronil', 'Fenilpirazol', '2,5%', '0000.0000.004', 'Líquido (L)', 1.8, 'Tratamento sintomático'], ['Deltacid SC (exemplo)', 'Deltametrina', 'Piretroide', '2,5%', '0000.0000.005', 'Líquido (L)', 2.4, 'Tratamento sintomático'], ['Formicid Isca (exemplo)', 'Indoxacarbe', 'Oxadiazina', '0,05%', '0000.0000.006', 'Isca (g)', 140, 'Tratamento sintomático'], ['Clorobase 65 (exemplo)', 'Hipoclorito de cálcio', 'Clorado', '65%', '0000.0000.007', 'Pó (kg)', 9, 'Lavar com água em abundância']]
    .map(([nome, ingrediente, grupo, concentracao, registro, unidade, estoque, antidoto], i) => ({ id: `pr${i}`, nome, ingrediente, grupo, concentracao, registro, unidade, estoque, minimo: Math.ceil(estoque / 3), lote: `L${ent(2401, 2612)}-${ent(10, 99)}`, validade: diaMais(ent(40, 600)), antidoto }));
  const nomes = [['Restaurante Sabor Mineiro', 'Restaurante', 'mensal'], ['Cond. Residencial Parque das Águas', 'Condomínio', 'trimestral'], ['Escola Pequeno Saber', 'Escola', 'trimestral'], ['Padaria Pão Dourado', 'Restaurante', 'mensal'], ['Indústria Metalfix', 'Indústria', 'bimestral'], ['Clínica Vida Plena', 'Clínica', 'trimestral'], ['Supermercado Bom Preço', 'Comércio', 'mensal'], ['Ana Paula Ribeiro', 'Residência', 'avulso'], ['Cond. Edifício Solar', 'Condomínio', 'semestral'], ['Hamburgueria Brasa', 'Restaurante', 'mensal'], ['Marcos Vinícius Teles', 'Residência', 'avulso'], ['Pet Shop Amigo Fiel', 'Comércio', 'trimestral']];
  const clientes = nomes.map(([nome, tipo, plano], i) => ({ id: `cl${i}`, nome, tipo, plano, documento: tipo === 'Residência' ? '' : `${ent(10, 99)}.${ent(100, 999)}.${ent(100, 999)}/0001-${ent(10, 99)}`, endereco: `${e1(['Rua das Palmeiras', 'Av. Brasil', 'Rua XV de Novembro', 'Rua Goiás', 'Av. Independência'])}, ${ent(10, 1999)} · Campinas/SP`, contato: e1(['Sr. Paulo', 'D. Rita', 'Síndico Marcelo', 'Gerente Carla', 'Sr. Jorge']), telefone: `(19) 9${ent(8100, 9899)}-${ent(1000, 9999)}`, valor: { Restaurante: 380, Condomínio: 950, Escola: 720, Indústria: 1800, Clínica: 520, Comércio: 460, Residência: 290 }[tipo] }));
  const ordens = [];
  const nova = (c, data, status, extra = {}) => {
    const svc = ['Restaurante', 'Comércio'].includes(c.tipo) ? (r() < 0.7 ? 'Desinsetização' : 'Desratização') : c.tipo === 'Condomínio' ? e1(['Desinsetização', 'Desratização', "Limpeza de caixa d'água"]) : e1(['Desinsetização', 'Desinsetização', 'Descupinização']);
    const prods = (svc === 'Desratização' ? [produtos[2]] : svc === 'Descupinização' ? [produtos[3]] : svc.startsWith('Limpeza') ? [produtos[6]] : [e1([produtos[0], produtos[4]]), r() < 0.6 ? produtos[1] : produtos[5]]).map((pp) => ({ produto: pp.id, quantidade: pp.unidade.includes('(L)') ? Number((ent(2, 9) / 10).toFixed(1)) : pp.unidade.includes('kg') ? Number((ent(20, 120) / 100).toFixed(2)) : ent(20, 120) }));
    const pragas = svc === 'Desratização' ? ['Ratos'] : svc === 'Descupinização' ? ['Cupins'] : svc.startsWith('Limpeza') ? [] : [e1(['Baratas', 'Formigas']), e1(['Mosquitos', 'Aranhas', 'Escorpiões'])];
    ordens.push({ id: `os${ordens.length}`, numero: 0, cliente: c.id, data, hora: e1(['07:00', '08:30', '10:00', '14:00', '19:00']), tecnico: e1(TECNICOS)[0], servico: svc, pragas, areas: { Restaurante: 'Cozinha, estoque e área externa', Condomínio: 'Áreas comuns, garagem e casa de máquinas', Indústria: 'Galpão de produção e escritório' }[c.tipo] || 'Salas, banheiros e jardim',
      produtos: status === 'executada' ? prods : [], status, valor: c.valor, garantia: freqP(c.plano) || 90, recebido_por: status === 'executada' ? c.contato : '', pago: status === 'executada' && r() < 0.85, ...extra });
  };
  clientes.forEach((c, i) => {
    const f = freqP(c.plano);
    if (!f) { nova(c, diaMais(-ent(20, 140)), 'executada'); return; } // avulso: um serviço no passado
    let ultima = diaMais(-ent(1, Math.min(f - 1, 28))); // última visita dentro do ciclo (várias neste mês)
    if (i === 4 || i === 8) ultima = diaMais(-(f - ent(3, 10))); // dois contratos com a renovação chegando e sem agendamento
    for (let k = 3; k >= 0; k--) nova(c, diaMais(-k * f, ultima), 'executada');
    if (i !== 4 && i !== 8) nova(c, i % 5 === 0 ? hoje() : diaMais(f, ultima) < hoje() ? diaMais(ent(1, 6)) : diaMais(f, ultima), 'agendada');
  });
  ordens.sort((x, y) => x.data.localeCompare(y.data)).forEach((o, k) => { o.numero = 1500 + k; });
  const pontos = [], LOCAIS = { Restaurante: ['Doca de recebimento', 'Estoque seco', 'Cozinha (sob a pia)', 'Área de lixo', 'Câmara fria (externo)', 'Fundos (muro)', 'Vestiário'], Comércio: ['Doca de recebimento', 'Estoque', 'Área de lixo', 'Corredor de grãos', 'Fundos (muro)', 'Padaria', 'Estacionamento', 'Depósito'], Condomínio: ['Garagem G1', 'Garagem G2', 'Casa de lixo', 'Casa de máquinas', 'Jardim frontal', 'Salão de festas', 'Guarita'], Indústria: ['Portaria', 'Doca 1', 'Doca 2', 'Almoxarifado', 'Refeitório', 'Muro leste', 'Muro oeste', 'Área de resíduos', 'Galpão B'] };
  clientes.filter((c) => LOCAIS[c.tipo]).forEach((c) => LOCAIS[c.tipo].forEach((local, k) => pontos.push({ id: `pt${pontos.length}`, cliente: c.id, codigo: `PA-${String(k + 1).padStart(2, '0')}`, local, tipo: k % 4 === 3 ? 'Armadilha adesiva' : 'Porta-isca', instalado: diaMais(-ent(120, 400)) })));
  const ultimas = {};
  ordens.filter((o) => o.status === 'executada').forEach((o) => { ultimas[o.cliente] = o; });
  ordens.filter((o) => o.status === 'executada').forEach((o) => {
    const meus = pontos.filter((x) => x.cliente === o.cliente); if (!meus.length) return;
    const alto = o.cliente === 'cl6' && ultimas[o.cliente] === o;
    o.leituras = meus.map((x) => { const v = r(); return { ponto: x.id, status: v < (alto ? 0.45 : 0.1) ? 'consumida' : v < (alto ? 0.5 : 0.13) ? 'ausente' : v < (alto ? 0.58 : 0.18) ? 'substituida' : 'intacta' }; });
  });
  ordens.filter((o) => o.status === 'executada').forEach((o, k) => { if (k % 3 === 0) o.ocorrencias = [OCORRENCIAS[k % OCORRENCIAS.length], ...(k % 2 ? [OCORRENCIAS[(k + 3) % OCORRENCIAS.length]] : [])]; });
  if (ultimas.cl6) ultimas.cl6.ocorrencias = ['Sinais de roedor (fezes, roeduras)', 'Acúmulo de caixas e materiais', 'Frestas em portas ou rodapés'];
  const base = ultimas.cl3;
  if (base) { base.retorno = true; base.retorno_data = diaMais(1); ordens.push({ ...base, id: `os${ordens.length}`, numero: 1500 + ordens.length, data: diaMais(1), hora: '09:00', status: 'agendada', produtos: [], leituras: undefined, valor: 0, pago: true, recebido_por: '', retorno: false, retorno_de: base.id, motivo: 'Voltaram a aparecer baratas perto do forno.', confirmado: false }); }
  return { _cfg: { empresa: 'Escudo Controle de Pragas', telefone: '(19) 3232-4455', endereco: 'Rua Barão de Jaguara, 880 · Centro · Campinas/SP', cnpj: '27.441.903/0001-52', licenca_sanitaria: 'LF 1.234/2024 VISA Campinas', licenca_sanitaria_validade: diaMais(48), licenca_ambiental: 'CETESB 45-0091/2023', licenca_ambiental_validade: diaMais(410), responsavel: 'Larissa Duarte · Bióloga', conselho: 'CRBio 112233/01-D', emergencia: 'Disque-Intoxicação 0800 722 6001' }, clientes, produtos, ordens, pontos };
}

// ---------------------------------------------------------------- regras
const ords = (a) => a.db.lista('ordens');
const cli = (a, id) => a.db.obter('clientes', id);
const prod = (a, id) => a.db.obter('produtos', id);
const freqDe = (c) => (PLANOS.find((p) => p[0] === c?.plano) || PLANOS[0])[2];
const ultima = (a, id) => ords(a).filter((o) => o.cliente === id && o.status === 'executada').sort((x, y) => y.data.localeCompare(x.data))[0];
const proximaAg = (a, id) => ords(a).filter((o) => o.cliente === id && o.status === 'agendada').sort((x, y) => x.data.localeCompare(y.data))[0];
const vencimento = (a, c) => { const u = ultima(a, c.id), f = freqDe(c); return u && f ? diaMais(f, u.data) : null; };
const precisaAgendar = (a, c) => { const v = vencimento(a, c); return v && !proximaAg(a, c.id) && diasAte(v) <= 15; };
const validadeGarantia = (o) => diaMais(o.garantia || 90, o.data);
const nomeP = (a, x) => prod(a, x.produto)?.nome || '—';
const ptsDe = (a, id) => a.db.lista('pontos').filter((x) => x.cliente === id).sort((x, y) => x.codigo.localeCompare(y.codigo));
const consumo = (o) => { const l = o?.leituras || []; return l.length ? l.filter((x) => x.status === 'consumida').length / l.length : 0; };
const ultimaComLeitura = (a, id) => ords(a).filter((o) => o.cliente === id && o.status === 'executada' && o.leituras?.length).sort((x, y) => y.data.localeCompare(x.data))[0];
const consumoAlto = (a) => a.db.lista('clientes').map((c) => ({ c, o: ultimaComLeitura(a, c.id) })).filter(({ o }) => o && consumo(o) >= 0.3);

const colecoes = {
  clientes: { singular: 'cliente', plural: 'clientes', campos: [{ nome: 'nome', rotulo: 'Nome / empresa', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'tipo', rotulo: 'Tipo de local', tipo: 'selecao', opcoes: TIPOS }, { nome: 'documento', rotulo: 'CNPJ / CPF', tipo: 'texto' }, { nome: 'endereco', rotulo: 'Endereço', tipo: 'texto', largo: true }, { nome: 'contato', rotulo: 'Responsável no local', tipo: 'texto' }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel', obrigatorio: true }, { nome: 'plano', rotulo: 'Contrato', tipo: 'selecao', opcoes: PLANOS.map(([k, n]) => [k, n]), padrao: 'avulso' }, { nome: 'valor', rotulo: 'Valor por visita', tipo: 'moeda' }] },
  pontos: { singular: 'ponto', plural: 'pontos', campos: [{ nome: 'codigo', rotulo: 'Código (ex.: PA-08)', tipo: 'texto', obrigatorio: true }, { nome: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: TIPOS_PONTO, padrao: 'Porta-isca' }, { nome: 'local', rotulo: 'Onde fica', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'instalado', rotulo: 'Instalado em', tipo: 'data', padrao: () => hoje() }] },
  produtos: { singular: 'produto', plural: 'produtos', campos: [{ nome: 'nome', rotulo: 'Nome comercial', tipo: 'texto', obrigatorio: true }, { nome: 'ingrediente', rotulo: 'Ingrediente ativo', tipo: 'texto', obrigatorio: true }, { nome: 'grupo', rotulo: 'Grupo químico', tipo: 'texto' }, { nome: 'concentracao', rotulo: 'Concentração', tipo: 'texto' }, { nome: 'registro', rotulo: 'Registro no Ministério da Saúde', tipo: 'texto' }, { nome: 'unidade', rotulo: 'Unidade (ex.: Líquido (L))', tipo: 'texto' }, { nome: 'lote', rotulo: 'Lote', tipo: 'texto' }, { nome: 'validade', rotulo: 'Validade', tipo: 'data' }, { nome: 'estoque', rotulo: 'Estoque', tipo: 'numero', passo: '0.01' }, { nome: 'minimo', rotulo: 'Mínimo', tipo: 'numero', passo: '0.01' }, { nome: 'antidoto', rotulo: 'Antídoto / primeiros socorros', tipo: 'texto', largo: true }] },
};

// ---------------------------------------------------------------- páginas
function painel(a) {
  const ym = hoje().slice(0, 7), cfg = a.db.cfg;
  const exec = ords(a).filter((o) => o.status === 'executada' && o.data.startsWith(ym));
  const renovar = a.db.lista('clientes').filter((c) => precisaAgendar(a, c));
  const prodAlerta = a.db.lista('produtos').filter((p) => p.estoque <= p.minimo || diasAte(p.validade) <= 60);
  const ret = ords(a).filter((o) => o.retorno_de && o.status === 'agendada');
  const prox = ords(a).filter((o) => o.status === 'agendada' && diasAte(o.data) >= 0).sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora)).slice(0, 8);
  const selo = (n, v) => { const d = v ? diasAte(v) : -1; return `<span class="is-selo ${d < 0 ? 'er' : d <= 60 ? 'al' : ''}"><i></i>${n} · ${d < 0 ? 'vencida' : `até ${dataCurta(v)}`}</span>`; };
  const comPontos = a.db.lista('clientes').filter((c) => ptsDe(a, c.id).length).map((c) => ({ c, o: ultimaComLeitura(a, c.id) })).sort((x, y) => consumo(y.o) - consumo(x.o));
  const DS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  return `<div class="is-cab"><div><div class="s">Relatório do dia · ${DS[new Date().getDay()]}, ${dataBR(hoje())}</div><h2>${num(prox.filter((o) => o.data === hoje()).length)} serviços hoje · ${num(exec.length)} feitos em ${nomeMes(ym)}</h2></div>
      <div class="is-selos">${selo('Licença sanitária', cfg.licenca_sanitaria_validade)}${selo('Licença ambiental', cfg.licenca_ambiental_validade)}</div></div>
    <div class="is-grade"><div style="display:flex;flex-direction:column;gap:12px">
      <div class="is-tit"><span>Mapa de iscas · última leitura de cada cliente</span><span class="is-leg"><span><i style="background:#1b7a48"></i>intacta</span><span><i style="background:#d0463b"></i>consumida</span><span><i style="background:#3f6fb5"></i>substituída</span><span><i style="background:#d8941d"></i>ausente</span></span></div>
      ${comPontos.length ? `<div class="is-mapa">${comPontos.map(({ c, o }) => { const pts = ptsDe(a, c.id), alto = o && consumo(o) >= 0.3;
        return `<article class="is-cli ${alto ? 'alto' : ''}" data-abrir="cliente:${c.id}"><div class="t corta">${esc(c.nome)}</div><div class="s">${esc(c.tipo)} · ${pts.length} pontos${o ? ` · lido ${dataCurta(o.data)}` : ''}</div>
          <div class="is-pts">${pts.map((pt) => { const l = o?.leituras.find((x) => x.ponto === pt.id); return `<span class="is-pt ${l ? l.status : 'sem'}" title="${esc(pt.codigo)} · ${esc(pt.local)}${l ? ` · ${esc(nomeL(l.status))}` : ''}">${esc(pt.codigo.replace(/^[A-Z]+-/, ''))}</span>`; }).join('')}</div>
          <div class="pe"><span class="mute">${alto ? '<b class="er-tx">Reforçar tratamento</b>' : 'Consumo'}</span><span class="pc ${alto ? 'er-tx' : ''}">${o ? pct(consumo(o) * 100) : '—'}</span></div></article>`; }).join('')}</div>` : vazio('target', 'Nenhum ponto de isca cadastrado', 'Cadastre os porta-iscas na ficha de cada cliente.')}
      <div class="grade g2">${renovar.length ? `<div class="cartao"><div class="cartao-cab"><div><h3>Renovações a agendar</h3></div></div><ul class="lista">${renovar.map((c) => `<li><div class="cresce"><div class="t corta">${esc(c.nome)}</div><div class="s corta">${esc((PLANOS.find((p) => p[0] === c.plano) || [])[1] || '')} · vence ${relativo(vencimento(a, c))}</div></div><button type="button" class="btn peq" data-acao="agendar" data-c="${c.id}">${ic('calendar-plus')}Agendar</button></li>`).join('')}</ul></div>` : ''}
        ${prodAlerta.length ? `<div class="cartao"><div class="cartao-cab"><div><h3>Estoque e validade</h3></div><a class="btn peq" href="#/produtos">Produtos</a></div><ul class="lista">${prodAlerta.map((p) => `<li><div class="cresce"><div class="t corta">${esc(p.nome)}</div><div class="s corta">${esc(p.ingrediente)} · lote ${esc(p.lote)}</div></div>${p.estoque <= p.minimo ? et(`${num(p.estoque, 2)} em estoque`, 'er') : ''}${diasAte(p.validade) <= 60 ? et(`vence ${dataCurta(p.validade)}`, 'al') : ''}</li>`).join('')}</ul></div>` : ''}</div></div>
    <aside style="display:flex;flex-direction:column;gap:12px">
      <div class="is-dia"><h3>Próximos serviços</h3>${prox.length ? prox.map((o) => `<div class="is-lin" data-abrir="os:${o.id}"><div><div class="h">${o.hora}</div><div class="mute" style="font-size:11px">${o.data === hoje() ? 'hoje' : dataCurta(o.data)}</div></div><div><div class="t corta">${esc(cli(a, o.cliente)?.nome || '')}${o.retorno_de ? ` ${et('Garantia', 'al')}` : ''}</div><div class="s corta">${esc(o.servico)} · ${esc(nomeT(o.tecnico))}</div></div></div>`).join('') : `<div style="padding:14px">${vazio('calendar-blank', 'Nada agendado')}</div>`}
        <div style="padding:10px 14px;border-top:1px solid var(--borda)"><button type="button" class="btn pri" style="width:100%" data-acao="agendar">${ic('calendar-plus')}Agendar serviço</button></div></div>
      ${ret.length ? `<div class="is-dia"><h3>Retornos em garantia</h3>${ret.map((o) => `<div class="is-lin" data-abrir="os:${o.id}"><div class="h">${dataCurta(o.data)}</div><div><div class="t corta">${esc(cli(a, o.cliente)?.nome || '')}</div><div class="s">${esc(o.motivo || o.servico)}</div></div></div>`).join('')}</div>` : ''}
      <div class="is-dia"><h3>Números do mês</h3><div class="is-lin" style="cursor:default"><div class="h">${num(exec.length)}</div><div class="s">serviços executados · ${moeda(soma(exec, (o) => o.valor))}</div></div><div class="is-lin" style="cursor:default"><div class="h">${num(a.db.lista('clientes').filter((c) => c.plano !== 'avulso').length)}</div><div class="s">contratos ativos · ${moeda(soma(a.db.lista('clientes').filter((c) => c.plano !== 'avulso'), (c) => (c.valor * 30) / (freqDe(c) || 30)))} por mês</div></div></div>
    </aside></div>`;
}

function agendaPag(a) {
  const dias = Array.from({ length: 14 }, (_, i) => diaMais(i)), ags = ords(a).filter((o) => o.status === 'agendada' && o.data >= hoje() && o.data <= dias[13]).sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora));
  const deHoje = ags.filter((o) => o.data === hoje());
  return `<div class="entre"><span class="mute" style="font-size:12.5px">Próximas duas semanas. Depois do serviço, toque em “Executar” para gerar o comprovante.</span><span class="flex">${deHoje.length ? `<a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/${[a.db.cfg.endereco, ...deHoje.map((o) => cli(a, o.cliente)?.endereco)].filter(Boolean).map((x) => encodeURIComponent(x.replace(/·/g, ','))).join('/')}">${ic('map-pin')}Rota de hoje (${deHoje.length})</a>` : ''}<button type="button" class="btn pri" data-acao="agendar">${ic('calendar-plus')}Agendar</button></span></div>
    ${dias.filter((d) => ags.some((o) => o.data === d)).map((d) => `<div class="cartao"><div class="cartao-cab"><h3>${DIAS[paraData(d).getDay()]}, ${dataCurta(d)} <span class="mute">${relativo(d)}</span></h3></div><ul class="lista">${ags.filter((o) => o.data === d).map((o) => { const c = cli(a, o.cliente); return `<li class="clicavel" data-abrir="os:${o.id}"><b class="num" style="width:48px">${o.hora}</b><div class="cresce"><div class="t corta">${esc(c?.nome || '')}</div><div class="s corta">${esc(o.servico)} · ${esc(nomeT(o.tecnico))} · ${esc(c?.endereco || '')}</div></div><button type="button" class="btn peq" data-acao="executar" data-id="${o.id}">${ic('seal-check')}Executar</button></li>`; }).join('')}</ul></div>`).join('') || vazio('calendar-blank', 'Nenhum serviço nas próximas duas semanas')}`;
}

function ordensPag(a) {
  return a.tab({ id: 'ordens', colecao: 'ordens', singular: 'serviço', plural: 'serviços', ordem: 'data', desc: true, buscaDica: 'Cliente, serviço ou nº…', aoClicar: (id) => a.abrir('os', id), total: (l) => moeda(soma(l.filter((o) => o.status === 'executada'), (o) => o.valor)),
    visoes: [{ id: 'mes', rot: 'Este mês', filtro: (o) => o.data.startsWith(hoje().slice(0, 7)) }, { id: 'apagar', rot: 'A receber', filtro: (o) => o.status === 'executada' && !o.pago }, { id: 'todas', rot: 'Todos' }],
    filtros: [{ k: 'status', rot: 'Situação', opcoes: STATUS.map(([k, n]) => [k, n]) }, { k: 'servico', rot: 'Serviço', opcoes: SERVICOS.map((s) => [s, s]) }, { k: 'tecnico', rot: 'Técnico', opcoes: () => TECNICOS }],
    textoBusca: (o) => `${o.numero} ${cli(a, o.cliente)?.nome} ${o.servico}`,
    colunas: [{ k: 'numero', rot: 'Nº', render: (o) => `<span class="mono prim">#${o.numero}</span>` }, { k: 'data', rot: 'Data', render: (o) => `${dataCurta(o.data)}<span class="sub">${o.hora}</span>` }, { k: 'cliente', rot: 'Cliente', valor: (o) => cli(a, o.cliente)?.nome, render: (o) => `<span class="prim">${esc(cli(a, o.cliente)?.nome || '')}</span><span class="sub">${esc(o.servico)}</span>` }, { k: 'tecnico', rot: 'Técnico', oc: true, valor: (o) => nomeT(o.tecnico) }, { k: 'valor', rot: 'Valor', n: true, render: (o) => `${moeda(o.valor)}${o.status === 'executada' && !o.pago ? '<span class="sub er-tx">a receber</span>' : ''}` }, { k: 'status', rot: 'Situação', render: (o) => et(stt(o.status)[1], stt(o.status)[2]) }] });
}

function clientesPag(a) {
  return a.tab({ id: 'clientes', colecao: 'clientes', singular: 'cliente', plural: 'clientes', ordem: 'nome', buscaDica: 'Nome, endereço ou contato…', novo: { rot: 'Novo cliente', attrs: 'data-acao="novoCad" data-c="clientes"' }, aoClicar: (id) => a.abrir('cliente', id),
    visoes: [{ id: 'todos', rot: 'Todos' }, { id: 'contrato', rot: 'Com contrato', filtro: (c) => c.plano !== 'avulso' }, { id: 'agendar', rot: 'Para agendar', filtro: (c) => precisaAgendar(a, c) }],
    filtros: [{ k: 'tipo', rot: 'Tipo', opcoes: TIPOS.map((t) => [t, t]) }],
    colunas: [{ k: 'nome', rot: 'Cliente', render: (c) => `<span class="prim">${esc(c.nome)}</span><span class="sub">${esc(c.tipo)} · ${esc(c.endereco || '')}</span>` }, { k: 'plano', rot: 'Contrato', valor: (c) => (PLANOS.find((p) => p[0] === c.plano) || [])[1] }, { k: 'ultima', rot: 'Última visita', valor: (c) => ultima(a, c.id)?.data || '', render: (c) => (ultima(a, c.id) ? dataCurta(ultima(a, c.id).data) : '—') }, { k: 'proxima', rot: 'Próxima', valor: (c) => proximaAg(a, c.id)?.data || vencimento(a, c) || '', render: (c) => (proximaAg(a, c.id) ? `${dataCurta(proximaAg(a, c.id).data)}<span class="sub">agendada</span>` : vencimento(a, c) ? `<span class="${precisaAgendar(a, c) ? 'er-tx' : ''}">${dataCurta(vencimento(a, c))}</span><span class="sub">a agendar</span>` : '—') }] });
}

function produtosPag(a) {
  const ps = a.db.lista('produtos');
  return `<div class="dica">${ic('info')}<span>Os produtos usados em cada serviço saem do estoque e vão para o comprovante com ingrediente ativo, grupo químico, concentração, registro e antídoto.</span></div>`
    + a.tab({ id: 'produtos', colecao: 'produtos', singular: 'produto', plural: 'produtos', ordem: 'nome', novo: { rot: 'Novo produto', attrs: 'data-acao="novoCad" data-c="produtos"' }, aoClicar: async (id) => { if (await editar(a, 'produtos', prod(a, id))) a.render(); },
      visoes: [{ id: 'todos', rot: 'Todos' }, { id: 'repor', rot: 'Repor ou vencendo', filtro: (p) => p.estoque <= p.minimo || diasAte(p.validade) <= 60 }],
      colunas: [{ k: 'nome', rot: 'Produto', render: (p) => `<span class="prim">${esc(p.nome)}</span><span class="sub">${esc(p.ingrediente)} ${esc(p.concentracao || '')} · ${esc(p.grupo || '')}</span>` }, { k: 'registro', rot: 'Registro MS', oc: true, render: (p) => `<span class="mono">${esc(p.registro || '—')}</span>` }, { k: 'validade', rot: 'Validade', render: (p) => `<span class="${diasAte(p.validade) <= 60 ? 'al-tx' : ''}">${dataCurta(p.validade)}</span><span class="sub">lote ${esc(p.lote || '')}</span>` }, { k: 'estoque', rot: 'Estoque', n: true, render: (p) => (p.estoque <= p.minimo ? et(`${num(p.estoque, 2)} · mín. ${num(p.minimo, 2)}`, 'er') : `${num(p.estoque, 2)} ${esc(String(p.unidade || '').replace(/.*\((.*)\)/, '$1'))}`) }, { k: 'acao', rot: '', ord: false, csv: false, render: (p) => `<button type="button" class="btn peq" data-acao="entradaProd" data-id="${p.id}">${ic('plus')}Entrada</button>` }] });
}

function relatoriosPag(a) {
  const meses = Array.from({ length: 6 }, (_, i) => mesMais(i - 5)), ex = ords(a).filter((o) => o.status === 'executada');
  return `${kpis([{ rot: 'Serviços executados (6 meses)', icone: 'seal-check', val: num(ex.filter((o) => o.data >= `${meses[0]}-01`).length) }, { rot: 'A receber', icone: 'hand-coins', val: moeda(soma(ex.filter((o) => !o.pago), (o) => o.valor)) }, { rot: 'Ticket médio', icone: 'receipt', val: moeda(soma(ex, (o) => o.valor) / (ex.length || 1)) }])}
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Faturamento por mês</h3></div></div><div class="cartao-corpo">${barras({ dados: meses.map((m) => ({ rot: nomeMes(m), v: [soma(ex.filter((o) => o.data.startsWith(m)), (o) => o.valor)] })), series: [{ nome: 'Executado', cor: 'var(--acc)' }], fmt: moedaC, altura: 210 })}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Serviços mais feitos</h3></div></div><div class="cartao-corpo">${barrasH(Object.entries(agrupar(ex, (o) => o.servico)).map(([k, l]) => ({ rot: k, v: l.length, extra: moedaC(soma(l, (o) => o.valor)) })).sort((x, y) => y.v - x.v))}</div></div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Consumo de produtos (6 meses)</h3><div class="sub">Para o controle exigido pela vigilância sanitária</div></div></div><div class="cartao-corpo">${barrasH(Object.entries(agrupar(ex.filter((o) => o.data >= `${meses[0]}-01`).flatMap((o) => o.produtos), (x) => x.produto)).map(([k, l]) => ({ rot: prod(a, k)?.nome || k, v: soma(l, (x) => x.quantidade), extra: String(prod(a, k)?.unidade || '').replace(/.*\((.*)\)/, '$1') })).sort((x, y) => y.v - x.v), { fmt: (v) => num(v, 2) })}</div></div>`;
}

// ---------------------------------------------------------------- comprovante de execução do serviço
function docComprovante(a, o) {
  const c = cli(a, o.cliente), cfg = a.db.cfg;
  return `<div class="doc"><div class="entre" style="align-items:flex-start"><div><h1>${esc(a.empresa)}</h1><div style="color:#555">CNPJ ${esc(cfg.cnpj || '')} · ${esc(cfg.endereco || '')} · ${esc(cfg.telefone || '')}</div><div style="color:#555">Licença sanitária ${esc(cfg.licenca_sanitaria || '—')} (válida até ${dataBR(cfg.licenca_sanitaria_validade)}) · Licença ambiental ${esc(cfg.licenca_ambiental || '—')} (válida até ${dataBR(cfg.licenca_ambiental_validade)})</div></div><div style="text-align:right"><b style="font-size:15px">Comprovante de execução</b><div style="color:#555">Nº ${o.numero}</div></div></div>
    <h2>Contratante</h2><table><tr><td>${esc(c?.nome || '')}</td><td>${esc(c?.documento || '')}</td></tr><tr><td colspan="2">${esc(c?.endereco || '')}</td></tr></table>
    <h2>Serviço</h2><table><tr><td>${esc(o.servico)}</td><td>Data: ${dataBR(o.data)} às ${esc(o.hora)}</td></tr><tr><td>Pragas-alvo: ${esc((o.pragas || []).join(', '))}</td><td>Áreas tratadas: ${esc(o.areas || '')}</td></tr><tr><td>Técnico: ${esc(nomeT(o.tecnico))}</td><td>Garantia: ${o.garantia} dias (até ${dataBR(validadeGarantia(o))})</td></tr></table>
    <h2>Produtos utilizados</h2><table><thead><tr><th>Produto</th><th>Ingrediente ativo · grupo químico</th><th>Concentração</th><th>Registro MS</th><th>Lote</th><th class="n">Quantidade</th></tr></thead><tbody>${(o.produtos || []).map((x) => { const p = prod(a, x.produto); return `<tr><td>${esc(p?.nome || '')}</td><td>${esc(p?.ingrediente || '')} · ${esc(p?.grupo || '')}</td><td>${esc(p?.concentracao || '')}</td><td>${esc(p?.registro || '')}</td><td>${esc(p?.lote || '')}</td><td class="n">${num(x.quantidade, 2)} ${esc(String(p?.unidade || '').replace(/.*\((.*)\)/, '$1'))}</td></tr>`; }).join('')}</tbody></table>
    ${(o.leituras || []).length ? `<h2>Pontos de monitoramento (${o.leituras.filter((x) => x.status === 'consumida').length} de ${o.leituras.length} com consumo)</h2><table><thead><tr><th>Ponto</th><th>Local</th><th>Situação</th></tr></thead><tbody>${o.leituras.map((x) => { const pt = a.db.obter('pontos', x.ponto); return `<tr><td>${esc(pt?.codigo || '')}</td><td>${esc(pt?.local || '')}</td><td>${esc(nomeL(x.status))}</td></tr>`; }).join('')}</tbody></table>` : ''}
    ${(o.ocorrencias || []).length ? `<h2>Ocorrências e recomendações</h2><table><tbody>${o.ocorrencias.map((x) => `<tr><td>${esc(x)}</td><td>${esc(RECOMENDA[x] || '')}</td></tr>`).join('')}</tbody></table>` : ''}
    <h2>Em caso de acidente</h2><table><tr><td>Antídoto / tratamento: ${esc([...new Set((o.produtos || []).map((x) => prod(a, x.produto)?.antidoto).filter(Boolean))].join('; '))}</td><td>Emergência toxicológica: ${esc(cfg.emergencia || 'Disque-Intoxicação 0800 722 6001')}</td></tr></table>
    <div style="margin-top:10px;color:#444;font-size:11px">Responsável técnico: ${esc(cfg.responsavel || '')} · ${esc(cfg.conselho || '')}. Mantenha as áreas tratadas desocupadas pelo tempo indicado pelo técnico. Este comprovante deve ficar disponível para a fiscalização sanitária. Confira com a vigilância sanitária do seu município se há exigências adicionais.</div>
    <div class="ass"><div>${esc(nomeT(o.tecnico))} · técnico</div><div>${esc(o.recebido_por || 'Responsável no local')}</div></div></div>`;
}

function docRelatorio(a, c, ym) {
  const cfg = a.db.cfg, os = ords(a).filter((o) => o.cliente === c.id && o.status === 'executada' && o.data.startsWith(ym)).sort((x, y) => x.data.localeCompare(y.data));
  const hist = ords(a).filter((o) => o.cliente === c.id && o.status === 'executada' && o.leituras?.length).sort((x, y) => x.data.localeCompare(y.data)).slice(-6), pts = ptsDe(a, c.id);
  const ultimaL = hist[hist.length - 1], ocs = [...new Set(os.flatMap((o) => o.ocorrencias || []))];
  return `<div class="doc"><div class="entre" style="align-items:flex-start"><div><h1>${esc(a.empresa)}</h1><div style="color:#555">CNPJ ${esc(cfg.cnpj || '')} · ${esc(cfg.telefone || '')} · Resp. técnico ${esc(cfg.responsavel || '')} (${esc(cfg.conselho || '')})</div></div><div style="text-align:right"><b style="font-size:15px">Relatório de controle de pragas</b><div style="color:#555">${nomeMes(ym, true)}</div></div></div>
    <h2>Cliente</h2><table><tr><td>${esc(c.nome)}</td><td>${esc(c.documento || '')}</td></tr><tr><td colspan="2">${esc(c.endereco || '')} · contrato ${esc(((PLANOS.find((x) => x[0] === c.plano) || [])[1] || '').toLowerCase())}</td></tr></table>
    <h2>Visitas no mês (${os.length})</h2><table><thead><tr><th>Nº</th><th>Data</th><th>Serviço</th><th>Pragas-alvo</th><th>Técnico</th></tr></thead><tbody>${os.map((o) => `<tr><td>${o.numero}</td><td>${dataBR(o.data)}</td><td>${esc(o.servico)}</td><td>${esc((o.pragas || []).join(', '))}</td><td>${esc(nomeT(o.tecnico))}</td></tr>`).join('') || '<tr><td colspan="5">Nenhuma visita executada neste mês.</td></tr>'}</tbody></table>
    <h2>Produtos aplicados</h2><table><thead><tr><th>Produto</th><th>Ingrediente ativo</th><th>Registro MS</th><th class="n">Quantidade</th></tr></thead><tbody>${Object.entries(agrupar(os.flatMap((o) => o.produtos || []), (x) => x.produto)).map(([k, l]) => { const pr = prod(a, k); return `<tr><td>${esc(pr?.nome || '')}</td><td>${esc(pr?.ingrediente || '')} ${esc(pr?.concentracao || '')}</td><td>${esc(pr?.registro || '')}</td><td class="n">${num(soma(l, (x) => x.quantidade), 2)} ${esc(String(pr?.unidade || '').replace(/.*\((.*)\)/, '$1'))}</td></tr>`; }).join('') || '<tr><td colspan="4">—</td></tr>'}</tbody></table>
    ${pts.length ? `<h2>Monitoramento de iscas · evolução do consumo</h2><table><thead><tr><th>Visita</th>${hist.map((o) => `<th class="n">${dataCurta(o.data)}</th>`).join('')}</tr></thead><tbody><tr><td>Pontos com consumo</td>${hist.map((o) => `<td class="n">${o.leituras.filter((x) => x.status === 'consumida').length} de ${o.leituras.length} (${pct(consumo(o) * 100)})</td>`).join('')}</tr></tbody></table>
      ${ultimaL ? `<table style="margin-top:8px"><thead><tr><th>Ponto</th><th>Local</th><th>Última leitura</th></tr></thead><tbody>${pts.map((pt) => `<tr><td>${esc(pt.codigo)}</td><td>${esc(pt.local)}</td><td>${esc(nomeL(ultimaL.leituras.find((x) => x.ponto === pt.id)?.status || '—'))}</td></tr>`).join('')}</tbody></table>` : ''}` : ''}
    <h2>Ocorrências e recomendações</h2><table><tbody>${ocs.map((x) => `<tr><td>${esc(x)}</td><td>${esc(RECOMENDA[x] || '')}</td></tr>`).join('') || '<tr><td>Nenhuma ocorrência registrada no mês.</td></tr>'}</tbody></table>
    <div style="margin-top:10px;color:#444;font-size:11px">Licença sanitária ${esc(cfg.licenca_sanitaria || '—')} (até ${dataBR(cfg.licenca_sanitaria_validade)}) · Licença ambiental ${esc(cfg.licenca_ambiental || '—')} (até ${dataBR(cfg.licenca_ambiental_validade)}). Guarde este relatório com os comprovantes de execução para apresentar à vigilância sanitária e em auditorias.</div>
    <div class="ass"><div>${esc(cfg.responsavel || '')} · responsável técnico</div><div>${esc(c.contato || c.nome)}</div></div></div>`;
}

function docProposta(a, c) {
  const cfg = a.db.cfg, f = freqDe(c) || 90, visitas = Math.round(365 / f), pts = ptsDe(a, c.id);
  return `<div class="doc"><div class="entre" style="align-items:flex-start"><div><h1>${esc(a.empresa)}</h1><div style="color:#555">CNPJ ${esc(cfg.cnpj || '')} · ${esc(cfg.endereco || '')} · ${esc(cfg.telefone || '')}</div></div><div style="text-align:right"><b style="font-size:15px">Proposta de contrato</b><div style="color:#555">${dataBR(hoje())}</div></div></div>
    <h2>Cliente</h2><table><tr><td>${esc(c.nome)}</td><td>${esc(c.documento || '')}</td></tr><tr><td colspan="2">${esc(c.endereco || '')} · ${esc(c.tipo)}</td></tr></table>
    <h2>O que está incluso</h2><table><tbody>${[`Visitas ${c.plano === 'avulso' ? 'sob demanda' : `a cada ${f} dias (${visitas} por ano)`} com desinsetização e desratização conforme a necessidade`, pts.length ? `Monitoramento de ${pts.length} pontos de isca e armadilhas, com leitura em todas as visitas` : 'Instalação e monitoramento de pontos de isca nas áreas críticas', 'Comprovante de execução digital em cada visita, com produtos, lotes, licenças e responsável técnico', `Garantia de ${f} dias: se a praga voltar, o retorno é sem custo`, 'Relatório de consumo de iscas para a vigilância sanitária e auditorias'].map((x) => `<tr><td>${x}</td></tr>`).join('')}</tbody></table>
    <h2>Investimento</h2><table><tbody><tr><td>Valor por visita</td><td class="n"><b>${moeda(c.valor)}</b></td></tr>${c.plano !== 'avulso' ? `<tr><td>Equivale a, por mês</td><td class="n">${moeda((c.valor * 30) / f)}</td></tr><tr><td>Total em 12 meses (${visitas} visitas)</td><td class="n">${moeda(c.valor * visitas)}</td></tr>` : ''}</tbody></table>
    <div style="margin-top:10px;color:#444;font-size:11px">Licença sanitária ${esc(cfg.licenca_sanitaria || '—')} · Licença ambiental ${esc(cfg.licenca_ambiental || '—')} · Responsável técnico ${esc(cfg.responsavel || '')} (${esc(cfg.conselho || '')}). Proposta válida por 15 dias. Contrato de 12 meses com renovação automática; pode ser encerrado com 30 dias de aviso.</div>
    <div class="ass"><div>${esc(a.empresa)}</div><div>${esc(c.contato || c.nome)}</div></div></div>`;
}

// ---------------------------------------------------------------- fichas
const fichas = {
  os(a, id, aba = 'servico') {
    const o = a.db.obter('ordens', id); if (!o) return null; const c = cli(a, o.cliente);
    let corpo = '';
    if (aba === 'servico') corpo = `<div class="gav-sec">${props([['flask', 'Serviço', esc(o.servico)], ['calendar-blank', 'Data', `${dataBR(o.data)} às ${esc(o.hora)}`], ['warning-circle', 'Pragas-alvo', (o.pragas || []).map((p) => et(p, '', 'sem-ponto')).join(' ')], ['map-pin', 'Áreas', esc(o.areas || '')], ['user-gear', 'Técnico', esc(nomeT(o.tecnico))], ['seal-check', 'Garantia', `${o.garantia} dias · até ${dataCurta(validadeGarantia(o))}`], ['currency-circle-dollar', 'Valor', `${moeda(o.valor)} ${o.status === 'executada' ? (o.pago ? et('Pago', 'ok') : et('A receber', 'er')) : ''}`], o.recebido_por ? ['user', 'Recebido por', esc(o.recebido_por)] : null, o.motivo ? ['chat-circle-text', 'Pedido do cliente', esc(o.motivo)] : null])}</div>
      ${(o.ocorrencias || []).length ? `<div class="gav-sec"><h4>Ocorrências e recomendações</h4><ul class="lista" style="margin:0 -20px">${o.ocorrencias.map((x) => `<li>${ic('warning')}<div class="cresce"><div class="t">${esc(x)}</div><div class="s">${esc(RECOMENDA[x] || '')}</div></div></li>`).join('')}</ul></div>` : ''}
      <div class="gav-sec"><h4>Produtos</h4>${(o.produtos || []).length ? `<table class="tabela"><thead><tr><th>Produto</th><th>Ingrediente ativo</th><th class="n">Qtd.</th></tr></thead><tbody>${o.produtos.map((x) => { const p = prod(a, x.produto); return `<tr><td>${esc(p?.nome || '')}</td><td>${esc(p?.ingrediente || '')} ${esc(p?.concentracao || '')}</td><td class="n">${num(x.quantidade, 2)}</td></tr>`; }).join('')}</tbody></table>` : vazio('flask', 'Sem produtos')}</div>`;
    if (aba === 'pontos') corpo = `<div class="gav-sec">${(o.leituras || []).length ? `<p class="mute" style="font-size:12.5px;margin:0 0 10px">${o.leituras.filter((x) => x.status === 'consumida').length} de ${o.leituras.length} pontos com consumo (${pct(consumo(o) * 100)})</p><table class="tabela"><thead><tr><th>Ponto</th><th>Local</th><th>Situação</th></tr></thead><tbody>${o.leituras.map((x) => { const pt = a.db.obter('pontos', x.ponto); return `<tr><td class="mono">${esc(pt?.codigo || '')}</td><td>${esc(pt?.local || '')}</td><td>${et(nomeL(x.status), (LEITURAS.find((l) => l[0] === x.status) || [])[2])}</td></tr>`; }).join('')}</tbody></table>` : vazio('target', 'Sem leituras', o.status === 'agendada' ? 'As leituras dos pontos são feitas ao executar o serviço.' : 'Este cliente não tem pontos de monitoramento.')}</div>`;
    if (aba === 'fotos') corpo = a.anexos.html('ordens', id, { titulo: 'Fotos do serviço', dica: 'Fotografe as iscas, os pontos tratados e os focos encontrados.' });
    if (aba === 'hist') corpo = `<div class="gav-sec">${linhaDoTempo(a.db.historico(`ordens:${id}`).map((h) => ({ quando: h.quando, icone: h.icone, tom: h.tom, html: esc(h.texto) })))}</div>`;
    return { html: ficha({ tipo: 'Serviço', icone: 'flask', titulo: `#${o.numero} · ${esc(c?.nome || '')}`, avatar: av(c?.nome || '?', 'g'), sub: `<span>${esc(o.servico)} · ${dataCurta(o.data)}</span>${et(stt(o.status)[1], stt(o.status)[2])}${o.retorno_de ? et('Retorno em garantia', 'al') : ''}${o.retorno ? et('Cliente pediu retorno', 'al') : ''}`,
      extra: `<div class="flex" style="margin-top:12px;flex-wrap:wrap">${o.status === 'agendada' ? `<button type="button" class="btn pri" data-acao="executar" data-id="${id}">${ic('seal-check')}Executar e gerar comprovante</button><a class="btn" target="_blank" rel="noopener" href="${telLink(c?.telefone)}?text=${encodeURIComponent(`Olá! Aqui é da ${a.empresa}. Confirmando o serviço de ${o.servico.toLowerCase()} em ${dataBR(o.data)} às ${o.hora}. Por favor, deixe as áreas liberadas.`)}">${ic('whatsapp-logo')}Confirmar</a>` : ''}${o.status === 'executada' ? `<button type="button" class="btn pri" data-acao="linkComprovante" data-id="${id}">${ic('link')}Enviar comprovante</button><button type="button" class="btn" data-acao="imprimirComp" data-id="${id}">${ic('printer')}Imprimir</button>${o.pago ? '' : `<button type="button" class="btn" data-acao="receber" data-id="${id}">${ic('currency-circle-dollar')}Recebi</button>`}` : ''}</div>`,
      aba, abas: [['servico', 'Serviço'], ...(ptsDe(a, o.cliente).length ? [['pontos', 'Pontos de isca', (o.leituras || []).filter((x) => x.status === 'consumida').length || '']] : []), ['fotos', 'Fotos', (o._anexos || []).length || ''], ['hist', 'Histórico']], corpo,
      acoes: `<button type="button" class="btn fant peq ic-so" data-acao="excluirOS" data-id="${id}" aria-label="Excluir">${ic('trash')}</button>` }), montar: (g) => (g.dataset.aba = aba) };
  },
  cliente(a, id) {
    const c = cli(a, id); if (!c) return null; const os = ords(a).filter((o) => o.cliente === id).sort((x, y) => y.data.localeCompare(x.data));
    return { estreita: true, html: ficha({ tipo: 'Cliente', icone: 'buildings', titulo: esc(c.nome), sub: `<span>${esc(c.tipo)} · ${esc((PLANOS.find((p) => p[0] === c.plano) || [])[1] || '')}</span>${precisaAgendar(a, c) ? et('Renovação a agendar', 'al') : ''}`,
      extra: `<div class="flex" style="margin-top:12px"><button type="button" class="btn pri" data-acao="agendar" data-c="${id}">${ic('calendar-plus')}Agendar</button><a class="btn" target="_blank" rel="noopener" href="${telLink(c.telefone)}">${ic('whatsapp-logo')}WhatsApp</a><button type="button" class="btn" data-acao="imprimirProposta" data-c="${id}">${ic('file-text')}Proposta</button><button type="button" class="btn" data-acao="relatorioMes" data-c="${id}">${ic('chart-bar')}Relatório do mês</button></div>`,
      corpo: `<div class="gav-sec">${props([['map-pin', 'Endereço', esc(c.endereco || '')], ['user', 'Responsável', esc(c.contato || '')], ['identification-card', 'CNPJ / CPF', esc(c.documento || '')], ['currency-circle-dollar', 'Valor por visita', moeda(c.valor)], ['calendar-check', 'Próxima visita', proximaAg(a, id) ? dataCurta(proximaAg(a, id).data) : vencimento(a, c) ? `vence ${dataCurta(vencimento(a, c))}` : '—']])}</div>
        <div class="gav-sec"><div class="entre"><h4 style="margin:0">Pontos de monitoramento (${ptsDe(a, id).length})</h4><button type="button" class="btn peq" data-acao="novoPonto" data-c="${id}">${ic('plus')}Ponto</button></div>${(() => { const pts = ptsDe(a, id), vis = os.filter((o) => o.leituras?.length).slice(0, 4);
          return pts.length ? `${vis.length ? `<p class="mute" style="font-size:12.5px;margin:8px 0">Consumo nas últimas visitas: ${vis.slice().reverse().map((o) => `<b class="${consumo(o) >= 0.3 ? 'er-tx' : ''}">${pct(consumo(o) * 100)}</b> <span class="mute">(${dataCurta(o.data)})</span>`).join(' → ')}</p>` : ''}<table class="tabela"><thead><tr><th>Ponto</th><th>Local</th><th>Última leitura</th><th></th></tr></thead><tbody>${pts.map((pt) => { const l = vis[0]?.leituras.find((x) => x.ponto === pt.id); return `<tr><td class="mono">${esc(pt.codigo)}</td><td>${esc(pt.local)}<span class="sub">${esc(pt.tipo || '')}</span></td><td>${l ? et(nomeL(l.status), (LEITURAS.find((x) => x[0] === l.status) || [])[2]) : '—'}</td><td class="acoes"><button type="button" class="btn fant peq ic-so" data-acao="editarCad" data-c="pontos" data-id="${pt.id}" aria-label="Editar">${ic('pencil-simple')}</button></td></tr>`; }).join('')}</tbody></table>` : `<p class="mute" style="font-size:12.5px;margin:8px 0 0">Cadastre os porta-iscas e armadilhas do local. Em cada visita o técnico marca a situação de cada ponto e ela vai para o comprovante.</p>`; })()}</div>
        <div class="gav-sec"><h4>Serviços (${os.length})</h4>${os.length ? `<ul class="lista" style="margin:0 -20px">${os.map((o) => `<li class="clicavel" data-abrir="os:${o.id}"><span class="mono mute-2">#${o.numero}</span><div class="cresce"><div class="t">${esc(o.servico)}</div><div class="s">${dataCurta(o.data)} · ${esc(nomeT(o.tecnico))}</div></div>${et(stt(o.status)[1], stt(o.status)[2])}</li>`).join('')}</ul>` : vazio('flask', 'Nenhum serviço ainda')}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="clientes" data-id="${id}">${ic('pencil-simple')}Editar</button>` }) };
  },
};

// ---------------------------------------------------------------- aplicativo
const app = criarApp({
  id: 'pragas', paginaSite: 'guard.html', nome: 'Blue Rose Guard', sub: 'Controle inteligente de pragas', marcaSub: 'Controle inteligente de pragas', logo: new URL('logo.webp', import.meta.url).href, produto: { mensal: 99 }, cor: '#1a47a8', icone: 'flask', empresa: 'Escudo Controle de Pragas', conta: 'Controle de pragas · Campinas',
  semente, colecoes, fichas, buscaDica: 'clientes e serviços',
  portal: {
    comprovante: {
      explica: 'O cliente recebe o comprovante de execução no celular, com os produtos, a garantia e as licenças, e pode guardar ou imprimir para a fiscalização.',
      montar: async (a, id, { fotos }) => {
        const o = a.db.obter('ordens', id); if (!o) return null; const c = cli(a, o.cliente), cfg = a.db.cfg;
        return { numero: o.numero, cliente: c?.nome || '', documento: c?.documento || '', endereco: c?.endereco || '', servico: o.servico, data: o.data, hora: o.hora, pragas: o.pragas || [], areas: o.areas || '', tecnico: nomeT(o.tecnico), garantia: o.garantia, garantia_ate: validadeGarantia(o), recebido_por: o.recebido_por || '', confirmado: !!o.confirmado,
          produtos: (o.produtos || []).map((x) => { const p = prod(a, x.produto) || {}; return { nome: p.nome, ingrediente: p.ingrediente, grupo: p.grupo, concentracao: p.concentracao, registro: p.registro, lote: p.lote, quantidade: x.quantidade, unidade: String(p.unidade || '').replace(/.*\((.*)\)/, '$1'), antidoto: p.antidoto }; }),
          licencas: [['Licença sanitária', cfg.licenca_sanitaria, cfg.licenca_sanitaria_validade], ['Licença ambiental', cfg.licenca_ambiental, cfg.licenca_ambiental_validade]], cnpj: cfg.cnpj || '', responsavel: cfg.responsavel || '', conselho: cfg.conselho || '', emergencia: cfg.emergencia || '', fotos: await fotos(o),
          pontos: (o.leituras || []).map((x) => { const pt = a.db.obter('pontos', x.ponto) || {}; return { codigo: pt.codigo, local: pt.local, status: x.status }; }), retorno: !!o.retorno, retorno_data: o.retorno_data || '', ocorrencias: (o.ocorrencias || []).map((x) => ({ problema: x, recomendacao: RECOMENDA[x] || '' })) };
      },
      responder: (a, r) => {
        const o = a.db.obter('ordens', r.ref); if (!o) return '';
        if (r.acao === 'retorno') {
          if (o.retorno || validadeGarantia(o) < hoje()) return '';
          const motivo = String(r.dados.motivo || '').slice(0, 300), data = diaMais(2);
          const novo = a.db.salvar('ordens', { numero: Math.max(1500, ...ords(a).map((x) => x.numero)) + 1, cliente: o.cliente, data, hora: '09:00', tecnico: o.tecnico, servico: o.servico, pragas: o.pragas, areas: o.areas, produtos: [], status: 'agendada', valor: 0, garantia: o.garantia, pago: true, retorno_de: o.id, motivo });
          a.db.salvar('ordens', { id: o.id, retorno: true, retorno_data: data });
          a.db.registrar(`ordens:${o.id}`, `Cliente pediu retorno em garantia: ${motivo}`, { icone: 'arrow-counter-clockwise', tom: 'al' });
          a.db.registrar(`ordens:${novo.id}`, 'Retorno em garantia agendado pelo pedido do cliente', { icone: 'calendar-plus' });
          return `${cli(a, o.cliente)?.nome} pediu retorno em garantia (serviço #${o.numero}). Pré-agendado para ${dataBR(data)} 09:00: confirme o horário.`;
        }
        if (r.acao !== 'confirmar') return '';
        const nome = String(r.dados.nome || '').slice(0, 80); a.db.salvar('ordens', { id: o.id, confirmado: true, recebido_por: nome || o.recebido_por });
        a.db.registrar(`ordens:${o.id}`, `Cliente confirmou o recebimento do comprovante${nome ? ` (${nome})` : ''}`, { icone: 'seal-check', tom: 'ok' });
        return `Serviço #${o.numero}: ${cli(a, o.cliente)?.nome} confirmou o comprovante`;
      },
    },
  },
  configExtra: (a) => { const c = a.db.cfg; return `<div class="cartao"><div class="cartao-cab"><div><h3>Licenças e responsável técnico</h3><div class="sub">Vão para todos os comprovantes</div></div><button type="button" class="btn peq" data-acao="editarLicencas">${ic('pencil-simple')}Editar</button></div><div class="cartao-corpo">${props([['seal-check', 'Licença sanitária', `${esc(c.licenca_sanitaria || '—')} · até ${dataBR(c.licenca_sanitaria_validade)}`], ['seal-check', 'Licença ambiental', `${esc(c.licenca_ambiental || '—')} · até ${dataBR(c.licenca_ambiental_validade)}`], ['user-gear', 'Responsável técnico', `${esc(c.responsavel || '—')} · ${esc(c.conselho || '')}`], ['phone', 'Emergência', esc(c.emergencia || '')]])}</div></div>`; },
  passos: (a) => [{ id: 'lic', rot: 'Preencha as licenças e o responsável técnico', feito: !!a.db.cfg.licenca_sanitaria, href: '#/config' }, { id: 'os', rot: 'Agende o primeiro serviço', feito: ords(a).length > 0, acao: 'agendar' }],
  equipe: [['Larissa Duarte', 'Responsável técnica'], ...TECNICOS.map(([, n]) => [n, 'Técnico'])],
  busca: [{ colecao: 'clientes', grupo: 'Clientes', icone: 'buildings', ficha: 'cliente', rot: (c) => c.nome, sub: (c) => c.tipo }, { colecao: 'ordens', grupo: 'Serviços', icone: 'flask', ficha: 'os', rot: (o, a) => `#${o.numero} · ${cli(a, o.cliente)?.nome || ''}`, sub: (o) => `${o.servico} · ${dataCurta(o.data)}` }],
  comandos: [{ rot: 'Agendar serviço', icone: 'calendar-plus', acao: (a) => a.acoes.agendar({}) }],
  paginas: [
    { id: 'painel', rot: 'Painel', icone: 'house', titulo: 'Visão geral', render: painel, atalho: 'i' },
    { id: 'agenda', rot: 'Agenda', icone: 'calendar-blank', render: agendaPag, atalho: 'a', cont: (a) => ords(a).filter((o) => o.status === 'agendada' && o.data === hoje()).length },
    { id: 'ordens', rot: 'Serviços', icone: 'clipboard-text', render: ordensPag, atalho: 's' },
    { id: 'clientes', rot: 'Clientes e contratos', icone: 'buildings', render: clientesPag, atalho: 'c', cont: (a) => { const n = a.db.lista('clientes').filter((c) => precisaAgendar(a, c)).length; return n ? { n, tom: 'al' } : 0; } },
    { grupo: 'Gestão' },
    { id: 'produtos', rot: 'Produtos e estoque', icone: 'flask', render: produtosPag, cont: (a) => { const n = a.db.lista('produtos').filter((p) => p.estoque <= p.minimo).length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'relatorios', rot: 'Relatórios', icone: 'chart-bar', render: relatoriosPag },
    paginaEquipe(EQUIPE),
    ...ferramentaPaginas(FERR, FERR_ITENS),
  ],
});

const reab = () => { app.render(); app.reabrir(); };
Object.assign(app.acoes, {
  agendar: async (d = {}) => {
    const r = await modal({ titulo: 'Agendar serviço', largura: 560, corpo: `<form class="form-grade"><label class="campo largo">Cliente<select name="c" required>${app.db.lista('clientes').sort((x, y) => x.nome.localeCompare(y.nome)).map((c) => `<option value="${c.id}" ${c.id === d.c ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label><label class="campo">Serviço<select name="s">${SERVICOS.map((s) => `<option>${s}</option>`).join('')}</select></label><label class="campo">Técnico<select name="t">${TECNICOS.map(([id, n]) => `<option value="${id}">${n}</option>`).join('')}</select></label><label class="campo">Data<input type="date" name="data" value="${diaMais(1)}" required></label><label class="campo">Hora<input type="time" name="hora" value="08:00"></label>
      <fieldset class="campo largo" style="border:0;padding:0"><legend style="margin-bottom:6px">Pragas-alvo</legend><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px">${PRAGAS.map((p) => `<label class="flex" style="font-weight:400;color:var(--tx);gap:6px"><input type="checkbox" name="pr" value="${p}">${p}</label>`).join('')}</div></fieldset><label class="campo largo">Áreas a tratar<input name="areas" placeholder="Ex.: cozinha, estoque e área externa"></label></form>`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Agendar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return fm.reportValidity() ? { ...Object.fromEntries(new FormData(fm)), pr: [...fm.querySelectorAll('[name=pr]:checked')].map((x) => x.value) } : false; } }] });
    if (!r) return; const c = cli(app, r.c);
    const o = app.db.salvar('ordens', { numero: Math.max(1500, ...ords(app).map((x) => x.numero)) + 1, cliente: c.id, data: r.data, hora: r.hora, tecnico: r.t, servico: r.s, pragas: r.pr, areas: r.areas, produtos: [], status: 'agendada', valor: c.valor || 0, garantia: freqDe(c) || 90, pago: false });
    app.db.registrar(`ordens:${o.id}`, 'Agendado', { icone: 'calendar-plus' }); avisar(`Agendado: ${c.nome} · ${dataCurta(r.data)} ${r.hora}`); reab();
  },
  executar: async (d) => {
    const o = app.db.obter('ordens', d.id), ps = app.db.lista('produtos');
    const r = await modal({ titulo: `Executar · ${cli(app, o.cliente)?.nome}`, largura: 600, corpo: `<form class="form-grade"><p class="mute-2 largo" style="font-size:13px">Informe os produtos aplicados. Eles saem do estoque e vão para o comprovante.</p>${ps.map((p) => `<label class="campo">${esc(p.nome)} <span class="mute" style="font-weight:400">${esc(String(p.unidade || '').replace(/.*\((.*)\)/, '$1'))} · ${num(p.estoque, 2)} em estoque</span><input type="number" name="p_${p.id}" min="0" step="0.01" placeholder="0"></label>`).join('')}${ptsDe(app, o.cliente).length ? `<fieldset class="campo largo" style="border:0;padding:0"><legend style="margin-bottom:6px">Leitura dos pontos de monitoramento</legend><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px">${ptsDe(app, o.cliente).map((pt) => `<label class="flex" style="font-weight:400;color:var(--tx);gap:8px;justify-content:space-between"><span><b class="mono">${esc(pt.codigo)}</b> ${esc(pt.local)}</span><select name="pt_${pt.id}">${LEITURAS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>`).join('')}</div></fieldset>` : ''}<fieldset class="campo largo" style="border:0;padding:0"><legend style="margin-bottom:6px">Ocorrências encontradas (vão com recomendação no comprovante)</legend><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px">${OCORRENCIAS.map((x) => `<label class="flex" style="font-weight:400;color:var(--tx);gap:6px"><input type="checkbox" name="oc" value="${esc(x)}">${esc(x)}</label>`).join('')}</div></fieldset><label class="campo largo">Quem recebeu no local<input name="quem" value="${esc(cli(app, o.cliente)?.contato || '')}"></label><label class="campo">Garantia (dias)<input type="number" name="g" min="0" value="${o.garantia || 90}"></label></form>`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Concluir serviço', classe: 'pri ok', acao: (f) => ({ ...Object.fromEntries(new FormData(f.querySelector('form'))), oc: [...f.querySelectorAll('[name=oc]:checked')].map((x) => x.value) }) }] });
    if (!r) return;
    const usados = ps.map((p) => ({ produto: p.id, quantidade: Number(r[`p_${p.id}`]) || 0 })).filter((x) => x.quantidade > 0);
    if (!usados.length && !(await confirmar('Nenhum produto informado. O comprovante sai sem a lista de produtos. Continuar?'))) return;
    usados.forEach((x) => { const p = prod(app, x.produto); app.db.salvar('produtos', { id: p.id, estoque: Math.max(0, Number((p.estoque - x.quantidade).toFixed(2))) }); });
    const leituras = ptsDe(app, o.cliente).map((pt) => ({ ponto: pt.id, status: r[`pt_${pt.id}`] || 'intacta' }));
    app.db.salvar('ordens', { id: o.id, status: 'executada', produtos: usados, leituras, ocorrencias: r.oc, recebido_por: r.quem, garantia: Number(r.g) || 90, executado_em: hoje() });
    if (leituras.length && consumo({ leituras }) >= 0.3) avisar(`Consumo alto: ${leituras.filter((x) => x.status === 'consumida').length} de ${leituras.length} pontos. Avalie reforçar o tratamento.`, { tipo: 'erro' });
    app.db.registrar(`ordens:${o.id}`, 'Serviço executado', { icone: 'seal-check', tom: 'ok' });
    const c = cli(app, o.cliente), f = freqDe(c);
    if (f && !proximaAg(app, c.id) && await confirmar(`Contrato ${(PLANOS.find((p) => p[0] === c.plano) || [])[1].toLowerCase()}: agendar a próxima visita para ${dataBR(diaMais(f, o.data))}?`, { rotulo: 'Agendar' })) {
      app.db.salvar('ordens', { numero: Math.max(1500, ...ords(app).map((x) => x.numero)) + 1, cliente: c.id, data: diaMais(f, o.data), hora: o.hora, tecnico: o.tecnico, servico: o.servico, pragas: o.pragas, areas: o.areas, produtos: [], status: 'agendada', valor: c.valor || 0, garantia: f, pago: false });
    }
    avisar('Serviço concluído. Envie o comprovante ao cliente.'); app.render(); app.abrir('os', o.id);
  },
  receber: (d) => { app.db.salvar('ordens', { id: d.id, pago: true }); app.db.registrar(`ordens:${d.id}`, 'Pagamento recebido', { icone: 'currency-circle-dollar', tom: 'ok' }); avisar('Recebido'); reab(); },
  linkComprovante: (d) => { const o = app.db.obter('ordens', d.id), c = cli(app, o.cliente); app.portal.compartilhar('comprovante', d.id, { titulo: `Comprovante · serviço #${o.numero}`, telefone: c?.telefone, texto: `Olá! Aqui é da ${app.empresa}. Segue o comprovante do serviço de ${o.servico.toLowerCase()} realizado em ${dataBR(o.data)}, com os produtos, a garantia e as licenças:`, qr: true }); },
  imprimirComp: (d) => imprimir(docComprovante(app, app.db.obter('ordens', d.id))),
  excluirOS: (d) => excluir(app, 'ordens', d.id),
  novoPonto: async (d) => { const n = ptsDe(app, d.c).length + 1; if (await editar(app, 'pontos', null, { cliente: d.c, codigo: `PA-${String(n).padStart(2, '0')}` })) reab(); },
  imprimirProposta: (d) => imprimir(docProposta(app, cli(app, d.c))),
  relatorioMes: async (d) => {
    const meses = Array.from({ length: 6 }, (_, i) => mesMais(-i));
    const r = await modal({ titulo: 'Relatório do mês', largura: 380, corpo: `<form class="form-grade"><label class="campo largo">Mês<select name="m">${meses.map((m) => `<option value="${m}">${nomeMes(m, true)}</option>`).join('')}</select></label></form><p class="mute" style="font-size:12.5px;margin-top:8px">Visitas, produtos, evolução das iscas e recomendações, pronto para a vigilância sanitária e auditorias.</p>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Gerar', classe: 'pri', acao: (f) => f.querySelector('[name=m]').value }] });
    if (r) imprimir(docRelatorio(app, cli(app, d.c), r));
  },
  entradaProd: async (d) => { const p = prod(app, d.id); const r = await modal({ titulo: `Entrada · ${p.nome}`, largura: 400, corpo: `<form class="form-grade"><label class="campo">Quantidade<input type="number" name="q" min="0" step="0.01" value="1"></label><label class="campo">Lote<input name="l" value="${esc(p.lote || '')}"></label><label class="campo">Validade<input type="date" name="v" value="${p.validade || ''}"></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Dar entrada', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] }); if (!r) return; app.db.salvar('produtos', { id: p.id, estoque: Number((p.estoque + Number(r.q)).toFixed(2)), lote: r.l, validade: r.v }); avisar(`+${r.q} ${p.nome}`); app.render(); },
  editarLicencas: async () => { const c = app.db.cfg; const r = await modal({ titulo: 'Licenças e responsável técnico', largura: 560, corpo: `<form class="form-grade"><label class="campo">Licença sanitária (nº e órgão)<input name="licenca_sanitaria" value="${esc(c.licenca_sanitaria || '')}"></label><label class="campo">Válida até<input type="date" name="licenca_sanitaria_validade" value="${c.licenca_sanitaria_validade || ''}"></label><label class="campo">Licença ambiental (nº e órgão)<input name="licenca_ambiental" value="${esc(c.licenca_ambiental || '')}"></label><label class="campo">Válida até<input type="date" name="licenca_ambiental_validade" value="${c.licenca_ambiental_validade || ''}"></label><label class="campo">Responsável técnico<input name="responsavel" value="${esc(c.responsavel || '')}"></label><label class="campo">Conselho e registro<input name="conselho" value="${esc(c.conselho || '')}" placeholder="Ex.: CRQ, CRBio"></label><label class="campo largo">Telefone de emergência toxicológica<input name="emergencia" value="${esc(c.emergencia || 'Disque-Intoxicação 0800 722 6001')}"></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Salvar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] }); if (!r) return; Object.assign(app.db.cfg, r); app.db.gravar(); app.portal.publicar?.(); avisar('Licenças salvas'); app.render(); },
  novoCad: async (d) => { if (await editar(app, d.c)) app.render(); },
  editarCad: async (d) => { if (await editar(app, d.c, app.db.obter(d.c, d.id))) reab(); },
});

// ferramentas no menu da esquerda (WhatsApp e copiar); avisos e mensagens prontas: plano Pro
equipeViva(app, EQUIPE);
Object.assign(app.acoes, acoesLado());
app.travarLado = travarPro;
