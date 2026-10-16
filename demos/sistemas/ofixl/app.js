// Blue Rose Ofixl · serviços técnicos em campo: ar-condicionado, refrigeração, elétrica e hidráulica.
// Ordem de serviço do pedido à cobrança, modo do técnico no celular, equipamentos com preventiva automática,
// orçamento aprovado pelo link e cobrança com PIX.
import {
  criarApp, esc, moeda, moedaC, num, hoje, diaMais, mesMais, nomeMes, dataCurta, dataBR, relativo, diasAte, paraData,
  sorteio, soma, agrupar, av, ic, et, kpis, barras, barrasH, DIAS, telLink,
  modal, confirmar, avisar, editar, excluir, ficha, props, linhaDoTempo, vazio, imprimir,
} from '../base/nexo.js';
import { LADOS as FERR, ITENS as FERR_ITENS } from './ferramentas.js';
import { acoesLado, ferramentaPaginas, travarPro } from '../base/lado.js';
import { equipeViva, paginaEquipe } from '../base/equipe-viva.js';

const TIPOS_OS = ['Instalação', 'Manutenção preventiva', 'Manutenção corretiva', 'Higienização', 'Visita técnica / orçamento', 'Desinstalação', 'Reparo elétrico', 'Reparo hidráulico'];
const TIPOS_EQ = ['Split hi-wall', 'Split piso-teto', 'Cassete', 'Janela', 'Multi-split', 'VRF', 'Câmara fria', 'Geladeira / freezer', 'Bebedouro', 'Quadro elétrico', 'Aquecedor', 'Bomba d\'água', 'Outro'];
const TIPOS_CLI = ['Residência', 'Comércio', 'Escritório', 'Condomínio', 'Restaurante', 'Clínica', 'Indústria'];
const PERIODOS = [['0', 'Sem preventiva'], ['90', 'A cada 3 meses'], ['180', 'A cada 6 meses'], ['365', 'Uma vez por ano']];
const TECNICOS = [['t0', 'Rafael Lima'], ['t1', 'Carlos Souza'], ['t2', 'João Pedro']];
const EQUIPE = { colecao: 'tecnicos', rot: 'Técnicos', icone: 'user-gear', singular: 'técnico', plural: 'técnicos', vazio: 'os técnicos de campo', lista: TECNICOS,
  campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel' }],
  linha: (r) => [r.id, r.nome], registro: ([id, nome]) => ({ id, nome }) };
const padraoEquipe = (eu) => (TECNICOS.find((x) => x[0] === eu) || TECNICOS[0] || [''])[0];
const nomeT = (id) => (TECNICOS.find((t) => t[0] === id) || [, '—'])[1];
// caminho da OS: do orçamento até receber
const STATUS = [['orcamento', 'Orçamento', 'al'], ['agendada', 'Agendada', 'info'], ['caminho', 'A caminho', 'info'], ['atendimento', 'Em atendimento', 'al'], ['concluida', 'Concluída', 'ok'], ['cancelada', 'Cancelada', '']];
const stt = (id) => STATUS.find((s) => s[0] === id) || STATUS[0];
const ABERTAS = ['agendada', 'caminho', 'atendimento'];
const CHECKLIST = {
  'Manutenção preventiva': ['Limpar filtros', 'Limpar serpentina da evaporadora', 'Verificar dreno', 'Medir pressão do gás', 'Medir corrente do compressor', 'Conferir temperatura de saída'],
  'Instalação': ['Conferir ponto elétrico e disjuntor', 'Fixar suportes e unidades', 'Fazer vácuo na tubulação', 'Teste de vazamento', 'Testar funcionamento e dreno', 'Orientar o cliente sobre o uso'],
  'Higienização': ['Proteger a área', 'Aplicar bactericida', 'Lavar serpentina e bandeja', 'Limpar turbina', 'Testar funcionamento'],
  'Manutenção corretiva': ['Diagnóstico do defeito', 'Troca ou reparo da peça', 'Teste de funcionamento'],
};
const checklistDe = (tipo) => (CHECKLIST[tipo] || ['Diagnóstico', 'Serviço executado', 'Teste de funcionamento']).map((item) => ({ item, feito: false }));

// ---------------------------------------------------------------- dados de exemplo (fictícios)
function semente() {
  const r = sorteio(20261017), e1 = (l) => l[Math.floor(r() * l.length)], ent = (a, b) => a + Math.floor(r() * (b - a + 1));
  const servicos = [['Instalação de split até 12.000 BTUs', 550], ['Instalação de split 18.000 a 24.000 BTUs', 750], ['Manutenção preventiva (por aparelho)', 180], ['Higienização completa', 220], ['Carga de gás R-410A', 350], ['Visita técnica / diagnóstico', 120], ['Troca de capacitor (mão de obra)', 90], ['Desinstalação', 200]].map(([nome, preco], i) => ({ id: `sv${i}`, nome, preco }));
  const materiais = [['Capacitor 35+5 µF', 'un', 18, 45, 12, 5], ['Gás R-410A', 'kg', 62, 140, 8, 4], ['Tubulação de cobre 1/4 + 3/8', 'm', 28, 60, 30, 10], ['Suporte para condensadora', 'par', 35, 80, 6, 3], ['Bactericida para ar-condicionado', 'L', 22, 0, 4, 2], ['Fita PVC', 'rolo', 6, 15, 2, 4]].map(([nome, unidade, custo, preco, estoque, minimo], i) => ({ id: `mt${i}`, nome, unidade, custo, preco, estoque, minimo }));
  const nomes = [['Mariana Costa', 'Residência', 'Vila Mariana'], ['Clínica Vitta', 'Clínica', 'Moema'], ['Eduardo Martins', 'Residência', 'Pinheiros'], ['Padaria Pão da Vila', 'Restaurante', 'Itaim Bibi'], ['Fernanda Oliveira', 'Residência', 'Perdizes'], ['Escritório Lopes & Reis', 'Escritório', 'Centro'], ['Cond. Jardim das Flores', 'Condomínio', 'Santana'], ['Mercado Bom Dia', 'Comércio', 'Tatuapé'], ['Roberto Alves', 'Residência', 'Mooca'], ['Academia Força Total', 'Comércio', 'Lapa']];
  const clientes = nomes.map(([nome, tipo, bairro], i) => ({ id: `cl${i}`, nome, tipo, bairro, endereco: `${e1(['Rua Domingos de Morais', 'Av. Ibirapuera', 'Rua dos Pinheiros', 'Rua Augusta', 'Rua Cardeal Arcoverde', 'Av. Paulista'])}, ${ent(20, 1999)} · ${bairro} · São Paulo/SP`, telefone: `(11) 9${ent(8100, 9899)}-${ent(1000, 9999)}`, contato: tipo === 'Residência' ? '' : e1(['Sra. Rita', 'Sr. Paulo', 'Gerente Carla', 'Síndico Marcelo']) }));
  const equipamentos = [];
  clientes.forEach((c, i) => { const n = c.tipo === 'Residência' ? ent(1, 2) : ent(2, 4);
    for (let k = 0; k < n; k++) { const per = c.tipo === 'Residência' ? 365 : e1([90, 180]);
      equipamentos.push({ id: `eq${equipamentos.length}`, cliente: c.id, tipo: k === 0 && c.tipo === 'Restaurante' ? 'Câmara fria' : e1(['Split hi-wall', 'Split hi-wall', 'Split piso-teto', 'Cassete']), marca: e1(['LG', 'Samsung', 'Midea', 'Daikin', 'Gree', 'Elgin']), modelo: e1(['Dual Inverter', 'WindFree', 'Xtreme Save', 'Eco Garden']), btus: e1([9000, 12000, 18000, 24000]), local: e1(['Sala', 'Quarto', 'Recepção', 'Consultório 1', 'Salão', 'Cozinha']), periodicidade: String(per), instalado: diaMais(-ent(200, 1400)), ultima: diaMais(-(i === 1 || i === 6 ? per - ent(2, 10) : ent(10, per - 20))) }); } });
  const ordens = [];
  const nova = (c, data, hora, tipo, status, extra = {}) => {
    const eqs = equipamentos.filter((x) => x.cliente === c.id).slice(0, tipo === 'Instalação' ? 1 : 3);
    const base = servicos.find((s) => (tipo === 'Instalação' ? s.id === 'sv0' : tipo === 'Higienização' ? s.id === 'sv3' : tipo === 'Manutenção preventiva' ? s.id === 'sv2' : s.id === 'sv5'));
    const itens = [{ descricao: base.nome, qtd: tipo === 'Manutenção preventiva' ? Math.max(1, eqs.length) : 1, preco: base.preco, aprovado: status === 'orcamento' ? null : true }];
    if (tipo === 'Manutenção corretiva') itens.push({ descricao: 'Troca de capacitor (mão de obra)', qtd: 1, preco: 90, aprovado: status === 'orcamento' ? null : true }, { descricao: 'Capacitor 35+5 µF', qtd: 1, preco: 45, aprovado: status === 'orcamento' ? null : true, material: 'mt0' });
    ordens.push({ id: `os${ordens.length}`, numero: 0, cliente: c.id, equipamentos: eqs.map((x) => x.id), tipo, data, hora, tecnico: e1(TECNICOS)[0], status, itens, checklist: checklistDe(tipo).map((x) => ({ ...x, feito: status === 'concluida' })), relato: tipo === 'Manutenção corretiva' ? e1(['Aparelho não gela', 'Pingando água na sala', 'Fazendo barulho estranho', 'Desliga sozinho']) : '', garantia: 90, pago: status === 'concluida' && r() < 0.75, ...extra });
  };
  clientes.forEach((c, i) => {
    nova(c, diaMais(-ent(20, 160)), '09:00', i % 3 ? 'Manutenção preventiva' : 'Higienização', 'concluida', { recebido_por: c.contato || c.nome, concluida_em: diaMais(-ent(20, 160)) });
    if (i % 2) nova(c, diaMais(-ent(1, 15)), '14:00', 'Manutenção corretiva', 'concluida', { recebido_por: c.contato || c.nome, concluida_em: diaMais(-ent(1, 15)) });
  });
  [[0, 0, '08:30', 'Manutenção preventiva', 'atendimento'], [1, 0, '10:00', 'Instalação', 'caminho'], [2, 0, '13:30', 'Visita técnica / orçamento', 'agendada'], [3, 0, '15:00', 'Manutenção preventiva', 'agendada'], [5, 1, '09:00', 'Higienização', 'agendada'], [7, 2, '11:00', 'Manutenção corretiva', 'agendada'], [9, 3, '08:00', 'Instalação', 'agendada']]
    .forEach(([ci, d, h, t, s]) => nova(clientes[ci], diaMais(d), h, t, s));
  nova(clientes[4], diaMais(-4), '16:00', 'Manutenção corretiva', 'orcamento', { orcado_em: diaMais(-4), relato: 'Aparelho do quarto não liga' });
  nova(clientes[8], diaMais(-1), '10:00', 'Instalação', 'orcamento', { orcado_em: diaMais(-1) });
  ordens.sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora)).forEach((o, k) => { o.numero = 2800 + k; });
  return { _cfg: { empresa: 'Clima Certo Refrigeração', telefone: '(11) 4002-2280', endereco: 'Rua Vergueiro, 1200 · Paraíso · São Paulo/SP', cnpj: '33.120.554/0001-07' }, clientes, equipamentos, ordens, servicos, materiais };
}

// ---------------------------------------------------------------- regras
const ords = (a) => a.db.lista('ordens');
const cli = (a, id) => a.db.obter('clientes', id);
const eqp = (a, id) => a.db.obter('equipamentos', id);
const eqsDe = (a, cid) => a.db.lista('equipamentos').filter((x) => x.cliente === cid);
const totalOS = (o) => soma((o.itens || []).filter((x) => x.aprovado !== false), (x) => Number(x.qtd || 1) * Number(x.preco || 0)) - Number(o.desconto || 0);
const nomeEq = (x) => `${x.tipo}${x.btus ? ` ${num(x.btus)} BTUs` : ''}${x.local ? ` · ${x.local}` : ''}`;
const proxPrev = (x) => (Number(x.periodicidade) && x.ultima ? diaMais(Number(x.periodicidade), x.ultima) : null);
const prevAberta = (a, x) => ords(a).some((o) => ABERTAS.includes(o.status) && (o.equipamentos || []).includes(x.id));
const prevVencendo = (a) => a.db.lista('equipamentos').filter((x) => { const p = proxPrev(x); return p && diasAte(p) <= 15 && !prevAberta(a, x); });
const orcParados = (a) => ords(a).filter((o) => o.status === 'orcamento' && diasAte(o.orcado_em || o.data) <= -3);
const aReceber = (a) => ords(a).filter((o) => o.status === 'concluida' && !o.pago && totalOS(o) > 0);
const proxNumero = (a) => Math.max(2800, ...ords(a).map((x) => x.numero || 0)) + 1;
const primeiro = (n) => String(n || '').split(' ')[0];
const mapsDe = (end) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(end || '').replace(/·/g, ','))}`;
const zapCli = (a, c, texto) => `${telLink(c?.telefone)}?text=${encodeURIComponent(texto)}`;

const colecoes = {
  clientes: { singular: 'cliente', plural: 'clientes', campos: [{ nome: 'nome', rotulo: 'Nome / empresa', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: TIPOS_CLI, padrao: 'Residência' }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel', obrigatorio: true }, { nome: 'contato', rotulo: 'Responsável no local', tipo: 'texto' }, { nome: 'endereco', rotulo: 'Endereço completo', tipo: 'texto', largo: true, obrigatorio: true }, { nome: 'bairro', rotulo: 'Bairro', tipo: 'texto' }, { nome: 'documento', rotulo: 'CPF / CNPJ', tipo: 'texto' }] },
  equipamentos: { singular: 'equipamento', plural: 'equipamentos', campos: [{ nome: 'cliente', rotulo: 'Cliente', tipo: 'relacao', colecao: 'clientes', obrigatorio: true }, { nome: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: TIPOS_EQ, padrao: 'Split hi-wall' }, { nome: 'marca', rotulo: 'Marca', tipo: 'texto' }, { nome: 'modelo', rotulo: 'Modelo', tipo: 'texto' }, { nome: 'btus', rotulo: 'Capacidade (BTUs)', tipo: 'numero' }, { nome: 'local', rotulo: 'Onde fica (ex.: sala, quarto 2)', tipo: 'texto' }, { nome: 'periodicidade', rotulo: 'Manutenção preventiva', tipo: 'selecao', opcoes: PERIODOS, padrao: '180' }, { nome: 'ultima', rotulo: 'Última manutenção', tipo: 'data' }, { nome: 'instalado', rotulo: 'Instalado em', tipo: 'data' }] },
  servicos: { singular: 'serviço', plural: 'serviços', campos: [{ nome: 'nome', rotulo: 'Serviço', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'preco', rotulo: 'Preço', tipo: 'moeda', obrigatorio: true }] },
  materiais: { singular: 'material', plural: 'materiais', campos: [{ nome: 'nome', rotulo: 'Material', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'unidade', rotulo: 'Unidade (un, m, kg)', tipo: 'texto', padrao: 'un' }, { nome: 'custo', rotulo: 'Custo', tipo: 'moeda' }, { nome: 'preco', rotulo: 'Preço de venda', tipo: 'moeda' }, { nome: 'estoque', rotulo: 'Estoque', tipo: 'numero', padrao: 0 }, { nome: 'minimo', rotulo: 'Estoque mínimo', tipo: 'numero', padrao: 2 }] },
};

// ---------------------------------------------------------------- páginas
function linhaOS(a, o, botao = true) {
  const c = cli(a, o.cliente);
  return `<li class="clicavel" data-abrir="os:${o.id}"><b class="num" style="width:48px">${esc(o.hora || '')}</b><div class="cresce"><div class="t corta">${esc(c?.nome || '')}</div><div class="s corta">${esc(o.tipo)} · ${esc(nomeT(o.tecnico))} · ${esc(c?.bairro || c?.endereco || '')}</div></div>${et(stt(o.status)[1], stt(o.status)[2])}${botao && ABERTAS.includes(o.status) ? `<button type="button" class="btn peq" data-acao="avancar" data-id="${o.id}">${ic(o.status === 'agendada' ? 'car' : o.status === 'caminho' ? 'play' : 'check')}${o.status === 'agendada' ? 'A caminho' : o.status === 'caminho' ? 'Iniciar' : 'Concluir'}</button>` : ''}</li>`;
}

function painel(a) {
  const ym = hoje().slice(0, 7), deHoje = ords(a).filter((o) => o.data === hoje() && o.status !== 'cancelada').sort((x, y) => String(x.hora).localeCompare(String(y.hora)));
  const feitas = ords(a).filter((o) => o.status === 'concluida' && (o.concluida_em || o.data).startsWith(ym));
  const prev = prevVencendo(a), parados = orcParados(a), receber = aReceber(a);
  return `${kpis([{ rot: 'Atendimentos hoje', icone: 'calendar-check', val: num(deHoje.length), nota: `${deHoje.filter((o) => o.status === 'concluida').length} concluídos` }, { rot: `Faturado em ${nomeMes(ym)}`, icone: 'currency-circle-dollar', val: moeda(soma(feitas, totalOS)), nota: `${feitas.length} serviços` }, { rot: 'A receber', icone: 'hand-coins', val: moeda(soma(receber, totalOS)), nota: `${receber.length} serviços` }, { rot: 'Preventivas vencendo', icone: 'arrows-clockwise', val: num(prev.length), nota: 'nos próximos 15 dias' }])}
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Hoje</h3><div class="sub">${DIAS[new Date().getDay()]}, ${dataBR(hoje())}</div></div><span class="flex">${deHoje.length ? `<a class="btn peq" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/${[a.db.cfg.endereco, ...deHoje.map((o) => cli(a, o.cliente)?.endereco)].filter(Boolean).map((x) => encodeURIComponent(x.replace(/·/g, ','))).join('/')}">${ic('map-pin')}Rota do dia</a>` : ''}<button type="button" class="btn peq pri" data-acao="novaOS">${ic('plus')}Nova OS</button></span></div>
      ${deHoje.length ? `<ul class="lista">${deHoje.map((o) => linhaOS(a, o)).join('')}</ul>` : vazio('calendar-blank', 'Nenhum atendimento hoje', 'Agende uma OS ou ofereça as preventivas que estão vencendo.')}</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="cartao"><div class="cartao-cab"><div><h3>Automático: preventivas a oferecer</h3><div class="sub">O sistema calcula a próxima manutenção de cada aparelho. Mande a mensagem pronta.</div></div></div>${prev.length ? `<ul class="lista">${prev.slice(0, 8).map((x) => { const c = cli(a, x.cliente); return `<li><div class="cresce"><div class="t corta">${esc(c?.nome || '')}</div><div class="s corta">${esc(nomeEq(x))} · ${diasAte(proxPrev(x)) < 0 ? 'venceu' : 'vence'} ${relativo(proxPrev(x))}</div></div><a class="btn peq" target="_blank" rel="noopener" href="${zapCli(a, c, `Olá, ${primeiro(c?.contato || c?.nome)}! Aqui é da ${a.empresa}. Está chegando a hora da manutenção preventiva do seu ${x.tipo.toLowerCase()} (${x.local || 'ar-condicionado'}). Ela evita quebra, economiza energia e mantém o ar limpo. Posso agendar para esta semana?`)}">${ic('whatsapp-logo')}Oferecer</a><button type="button" class="btn peq" data-acao="novaOS" data-c="${x.cliente}" data-tipo="Manutenção preventiva">${ic('calendar-plus')}Agendar</button></li>`; }).join('')}</ul>` : `<div class="cartao-corpo">${vazio('check-circle', 'Nenhuma preventiva vencendo')}</div>`}</div>
        ${parados.length ? `<div class="cartao"><div class="cartao-cab"><div><h3>Automático: orçamentos sem resposta</h3><div class="sub">Há 3 dias ou mais. Um lembrete simples fecha muita venda.</div></div></div><ul class="lista">${parados.map((o) => { const c = cli(a, o.cliente); return `<li class="clicavel" data-abrir="os:${o.id}"><div class="cresce"><div class="t corta">${esc(c?.nome || '')}</div><div class="s corta">#${o.numero} · ${esc(o.tipo)} · enviado ${relativo(o.orcado_em || o.data)}</div></div><b class="num">${moeda(totalOS(o))}</b><button type="button" class="btn peq" data-acao="lembrarOrc" data-id="${o.id}">${ic('whatsapp-logo')}Lembrar</button></li>`; }).join('')}</ul></div>` : ''}
        ${receber.length ? `<div class="cartao"><div class="cartao-cab"><div><h3>A receber</h3><div class="sub">Cobre com PIX e QR code pelo WhatsApp</div></div><a class="btn peq" href="#/financeiro">Financeiro</a></div><ul class="lista">${receber.slice(0, 6).map((o) => `<li class="clicavel" data-abrir="os:${o.id}"><div class="cresce"><div class="t corta">${esc(cli(a, o.cliente)?.nome || '')}</div><div class="s corta">#${o.numero} · concluída ${relativo(o.concluida_em || o.data)}</div></div><b class="num">${moeda(totalOS(o))}</b><button type="button" class="btn peq" data-acao="cobrar" data-id="${o.id}">${ic('qr-code')}Cobrar</button></li>`).join('')}</ul></div>` : ''}
      </div></div>`;
}

// modo do técnico: o dia dele, um botão por vez
function meuDia(a) {
  const st = a.estado.md ||= { t: TECNICOS[0]?.[0] || '' };
  const lista = ords(a).filter((o) => o.tecnico === st.t && o.data === hoje() && o.status !== 'cancelada').sort((x, y) => String(x.hora).localeCompare(String(y.hora)));
  const amanha = ords(a).filter((o) => o.tecnico === st.t && o.data === diaMais(1) && ABERTAS.includes(o.status)).length;
  return `<div class="entre"><label class="campo" style="max-width:260px">Técnico<select data-mudar="mdTec">${TECNICOS.map(([id, n]) => `<option value="${id}" ${id === st.t ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label><span class="mute" style="font-size:12.5px">${lista.filter((o) => o.status === 'concluida').length} de ${lista.length} concluídos hoje${amanha ? ` · ${amanha} amanhã` : ''}</span></div>
    ${lista.length ? lista.map((o) => { const c = cli(a, o.cliente), eqs = (o.equipamentos || []).map((id) => eqp(a, id)).filter(Boolean);
      return `<div class="cartao of-visita ${o.status}"><div class="cartao-cab"><div><h3>${esc(o.hora || '')} · ${esc(c?.nome || '')}</h3><div class="sub">${esc(o.tipo)} · OS #${o.numero}</div></div>${et(stt(o.status)[1], stt(o.status)[2])}</div>
        <div class="cartao-corpo">${props([['map-pin', 'Endereço', `<a target="_blank" rel="noopener" href="${mapsDe(c?.endereco)}">${esc(c?.endereco || '—')}</a>`], ['user', 'Falar com', `${esc(c?.contato || c?.nome || '')}${c?.telefone ? ` · <a target="_blank" rel="noopener" href="${telLink(c.telefone)}">${esc(c.telefone)}</a>` : ''}`], eqs.length ? ['gauge', 'Aparelhos', esc(eqs.map(nomeEq).join('; '))] : null, o.relato ? ['chat-circle-text', 'O que o cliente disse', esc(o.relato)] : null])}
          <div class="flex" style="flex-wrap:wrap;margin-top:12px">${o.status === 'agendada' ? `<button type="button" class="btn pri" data-acao="avancar" data-id="${o.id}">${ic('car')}Estou a caminho</button>` : o.status === 'caminho' ? `<button type="button" class="btn pri" data-acao="avancar" data-id="${o.id}">${ic('play')}Cheguei · iniciar</button>` : o.status === 'atendimento' ? `<button type="button" class="btn pri ok" data-acao="avancar" data-id="${o.id}">${ic('check')}Concluir serviço</button>` : ''}<button type="button" class="btn" data-abrir="os:${o.id}">${ic('camera')}Fotos e detalhes</button><a class="btn" target="_blank" rel="noopener" href="${mapsDe(c?.endereco)}">${ic('map-pin')}Rota</a></div></div></div>`; }).join('')
      : vazio('coffee', 'Nenhum atendimento hoje para este técnico')}`;
}

function agendaPag(a) {
  const dias = Array.from({ length: 14 }, (_, i) => diaMais(i)), ags = ords(a).filter((o) => ABERTAS.includes(o.status) && o.data >= hoje() && o.data <= dias[13]).sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora));
  const atrasadas = ords(a).filter((o) => ABERTAS.includes(o.status) && o.data < hoje());
  return `<div class="entre"><span class="mute" style="font-size:12.5px">Próximas duas semanas. Arraste o dia com o botão Remarcar, dentro da OS.</span><button type="button" class="btn pri" data-acao="novaOS">${ic('calendar-plus')}Agendar</button></div>
    ${atrasadas.length ? `<div class="cartao"><div class="cartao-cab"><h3 class="er-tx">Ficaram para trás (${atrasadas.length})</h3></div><ul class="lista">${atrasadas.map((o) => linhaOS(a, o)).join('')}</ul></div>` : ''}
    ${dias.filter((d) => ags.some((o) => o.data === d)).map((d) => `<div class="cartao"><div class="cartao-cab"><h3>${DIAS[paraData(d).getDay()]}, ${dataCurta(d)} <span class="mute">${relativo(d)}</span></h3></div><ul class="lista">${ags.filter((o) => o.data === d).map((o) => linhaOS(a, o)).join('')}</ul></div>`).join('') || vazio('calendar-blank', 'Nada agendado nas próximas duas semanas')}`;
}

function ordensPag(a) {
  return a.tab({ id: 'ordens', colecao: 'ordens', singular: 'ordem de serviço', plural: 'ordens de serviço', ordem: 'data', desc: true, buscaDica: 'Cliente, tipo ou nº…', aoClicar: (id) => a.abrir('os', id),
    novo: { rot: 'Nova OS', attrs: 'data-acao="novaOS"' }, total: (l) => moeda(soma(l.filter((o) => o.status === 'concluida'), totalOS)),
    visoes: [{ id: 'abertas', rot: 'Em aberto', filtro: (o) => ABERTAS.includes(o.status) }, { id: 'orc', rot: 'Orçamentos', filtro: (o) => o.status === 'orcamento' }, { id: 'receber', rot: 'A receber', filtro: (o) => o.status === 'concluida' && !o.pago }, { id: 'todas', rot: 'Todas' }],
    filtros: [{ k: 'status', rot: 'Situação', opcoes: STATUS.map(([k, n]) => [k, n]) }, { k: 'tipo', rot: 'Tipo', opcoes: TIPOS_OS.map((s) => [s, s]) }, { k: 'tecnico', rot: 'Técnico', opcoes: () => TECNICOS }],
    textoBusca: (o) => `${o.numero} ${cli(a, o.cliente)?.nome} ${o.tipo}`,
    massa: [{ rot: 'Marcar como pagas', icone: 'check', acao: (ids) => { ids.forEach((x) => { const o = a.db.obter('ordens', x); if (o?.status === 'concluida') a.db.salvar('ordens', { id: x, pago: true, pago_em: hoje() }); }); avisar('Pagamentos registrados'); } }],
    colunas: [{ k: 'numero', rot: 'Nº', render: (o) => `<span class="mono prim">#${o.numero}</span>` }, { k: 'data', rot: 'Data', render: (o) => `${dataCurta(o.data)}<span class="sub">${esc(o.hora || '')}</span>` }, { k: 'cliente', rot: 'Cliente', valor: (o) => cli(a, o.cliente)?.nome, render: (o) => `<span class="prim">${esc(cli(a, o.cliente)?.nome || '')}</span><span class="sub">${esc(o.tipo)}</span>` }, { k: 'tecnico', rot: 'Técnico', oc: true, valor: (o) => nomeT(o.tecnico) }, { k: 'valor', rot: 'Valor', n: true, valor: totalOS, render: (o) => `${moeda(totalOS(o))}${o.status === 'concluida' && !o.pago ? '<span class="sub er-tx">a receber</span>' : ''}` }, { k: 'status', rot: 'Situação', render: (o) => et(stt(o.status)[1], stt(o.status)[2]) }] });
}

function clientesPag(a) {
  return a.tab({ id: 'clientes', colecao: 'clientes', singular: 'cliente', plural: 'clientes', ordem: 'nome', buscaDica: 'Nome, bairro ou telefone…', novo: { rot: 'Novo cliente', attrs: 'data-acao="novoCad" data-c="clientes"' }, aoClicar: (id) => a.abrir('cliente', id),
    filtros: [{ k: 'tipo', rot: 'Tipo', opcoes: TIPOS_CLI.map((t) => [t, t]) }],
    colunas: [{ k: 'nome', rot: 'Cliente', render: (c) => `<span class="prim">${esc(c.nome)}</span><span class="sub">${esc(c.tipo || '')} · ${esc(c.bairro || '')}</span>` }, { k: 'eqs', rot: 'Aparelhos', n: true, valor: (c) => eqsDe(a, c.id).length }, { k: 'ultima', rot: 'Último serviço', valor: (c) => ords(a).filter((o) => o.cliente === c.id && o.status === 'concluida').map((o) => o.data).sort().pop() || '', render: (c) => { const d = ords(a).filter((o) => o.cliente === c.id && o.status === 'concluida').map((o) => o.data).sort().pop(); return d ? dataCurta(d) : '—'; } }, { k: 'total', rot: 'Total gasto', n: true, valor: (c) => soma(ords(a).filter((o) => o.cliente === c.id && o.status === 'concluida'), totalOS), render: (c) => moeda(soma(ords(a).filter((o) => o.cliente === c.id && o.status === 'concluida'), totalOS)) }] });
}

function equipamentosPag(a) {
  return `<div class="dica">${ic('info')}<span>Automático: quando uma OS é concluída, a data da última manutenção de cada aparelho atendido é atualizada e a próxima preventiva é calculada sozinha.</span></div>`
    + a.tab({ id: 'equipamentos', colecao: 'equipamentos', singular: 'aparelho', plural: 'aparelhos', ordem: 'prox', buscaDica: 'Cliente, marca ou local…', novo: { rot: 'Novo aparelho', attrs: 'data-acao="novoCad" data-c="equipamentos"' }, aoClicar: (id) => a.abrir('cliente', eqp(a, id)?.cliente),
      visoes: [{ id: 'vencendo', rot: 'Preventiva vencendo', filtro: (x) => { const p = proxPrev(x); return p && diasAte(p) <= 15; } }, { id: 'todos', rot: 'Todos' }],
      filtros: [{ k: 'tipo', rot: 'Tipo', opcoes: TIPOS_EQ.map((t) => [t, t]) }],
      textoBusca: (x) => `${cli(a, x.cliente)?.nome} ${x.marca} ${x.modelo} ${x.local}`,
      colunas: [{ k: 'cliente', rot: 'Cliente', valor: (x) => cli(a, x.cliente)?.nome, render: (x) => `<span class="prim">${esc(cli(a, x.cliente)?.nome || '')}</span><span class="sub">${esc(nomeEq(x))}</span>` }, { k: 'marca', rot: 'Marca e modelo', oc: true, valor: (x) => `${x.marca || ''} ${x.modelo || ''}` }, { k: 'ultima', rot: 'Última', render: (x) => (x.ultima ? dataCurta(x.ultima) : '—') }, { k: 'prox', rot: 'Próxima preventiva', valor: (x) => proxPrev(x) || '9999', render: (x) => { const p = proxPrev(x); return p ? `<span class="${diasAte(p) <= 15 ? 'er-tx' : ''}">${dataCurta(p)}</span><span class="sub">${relativo(p)}</span>` : '—'; } }] });
}

function catalogoPag(a) {
  const mt = a.db.lista('materiais');
  return a.tab({ id: 'servicos', colecao: 'servicos', singular: 'serviço', plural: 'serviços', ordem: 'nome', novo: { rot: 'Novo serviço', attrs: 'data-acao="novoCad" data-c="servicos"' }, aoClicar: async (id) => { if (await editar(a, 'servicos', a.db.obter('servicos', id))) a.render(); },
    colunas: [{ k: 'nome', rot: 'Serviço', render: (s) => `<span class="prim">${esc(s.nome)}</span>` }, { k: 'preco', rot: 'Preço', n: true, render: (s) => moeda(s.preco) }] })
    + a.tab({ id: 'materiais', colecao: 'materiais', singular: 'material', plural: 'materiais', ordem: 'nome', novo: { rot: 'Novo material', attrs: 'data-acao="novoCad" data-c="materiais"' }, aoClicar: async (id) => { if (await editar(a, 'materiais', a.db.obter('materiais', id))) a.render(); },
      visoes: [{ id: 'todos', rot: 'Todos' }, { id: 'repor', rot: 'Repor', filtro: (m) => Number(m.estoque) <= Number(m.minimo) }],
      colunas: [{ k: 'nome', rot: 'Material', render: (m) => `<span class="prim">${esc(m.nome)}</span><span class="sub">${esc(m.unidade || '')}</span>` }, { k: 'preco', rot: 'Preço', n: true, render: (m) => moeda(m.preco) }, { k: 'estoque', rot: 'Estoque', n: true, render: (m) => (Number(m.estoque) <= Number(m.minimo) ? et(`${num(m.estoque, 2)} · mín. ${num(m.minimo)}`, 'er') : num(m.estoque, 2)) }, { k: 'acao', rot: '', ord: false, csv: false, render: (m) => `<button type="button" class="btn peq" data-acao="entradaMat" data-id="${m.id}">${ic('plus')}Entrada</button>` }] })
    + (mt.length ? '' : '');
}

function financeiroPag(a) {
  const conc = ords(a).filter((o) => o.status === 'concluida'), rec = conc.filter((o) => !o.pago), ym = hoje().slice(0, 7);
  const recebidoMes = conc.filter((o) => o.pago && (o.pago_em || o.concluida_em || o.data).startsWith(ym));
  return `${kpis([{ rot: 'A receber', icone: 'hand-coins', val: moeda(soma(rec, totalOS)), nota: `${rec.length} serviços` }, { rot: `Recebido em ${nomeMes(ym)}`, icone: 'currency-circle-dollar', val: moeda(soma(recebidoMes, totalOS)) }, { rot: 'Ticket médio', icone: 'receipt', val: moeda(soma(conc, totalOS) / (conc.length || 1)) }])}
    <div class="cartao"><div class="cartao-cab"><div><h3>Serviços a receber</h3><div class="sub">Cada cobrança vai com PIX copia e cola e QR code. Quando o cliente avisa que pagou, aparece aqui.</div></div></div>${rec.length ? `<ul class="lista">${rec.sort((x, y) => (x.concluida_em || x.data).localeCompare(y.concluida_em || y.data)).map((o) => `<li>${av(cli(a, o.cliente)?.nome || '?')}<div class="cresce"><div class="t corta">${esc(cli(a, o.cliente)?.nome || '')}</div><div class="s corta">#${o.numero} · ${esc(o.tipo)} · concluída ${relativo(o.concluida_em || o.data)}${o.informado ? ' · <b class="ok-tx">cliente avisou que pagou</b>' : ''}</div></div><b class="num">${moeda(totalOS(o))}</b><button type="button" class="btn peq" data-acao="cobrar" data-id="${o.id}">${ic('qr-code')}Cobrar</button><button type="button" class="btn peq" data-acao="receber" data-id="${o.id}">${ic('check')}Recebi</button></li>`).join('')}</ul>` : `<div class="cartao-corpo">${vazio('check-circle', 'Nada a receber')}</div>`}</div>`;
}

function relatoriosPag(a) {
  const meses = Array.from({ length: 6 }, (_, i) => mesMais(i - 5)), ex = ords(a).filter((o) => o.status === 'concluida');
  return `${kpis([{ rot: 'Serviços concluídos (6 meses)', icone: 'check-circle', val: num(ex.filter((o) => o.data >= `${meses[0]}-01`).length) }, { rot: 'Orçamentos aprovados', icone: 'thumbs-up', val: num(ords(a).filter((o) => o.aprovado_em).length) }, { rot: 'Aparelhos cuidados', icone: 'gauge', val: num(a.db.lista('equipamentos').length) }])}
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Faturamento por mês</h3></div></div><div class="cartao-corpo">${barras({ dados: meses.map((m) => ({ rot: nomeMes(m), v: [soma(ex.filter((o) => (o.concluida_em || o.data).startsWith(m)), totalOS)] })), series: [{ nome: 'Concluído', cor: 'var(--acc)' }], fmt: moedaC, altura: 210 })}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Serviços mais feitos</h3></div></div><div class="cartao-corpo">${barrasH(Object.entries(agrupar(ex, (o) => o.tipo)).map(([k, l]) => ({ rot: k, v: l.length, extra: moedaC(soma(l, totalOS)) })).sort((x, y) => y.v - x.v))}</div></div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Serviços por técnico</h3></div></div><div class="cartao-corpo">${barrasH(Object.entries(agrupar(ex, (o) => nomeT(o.tecnico))).map(([k, l]) => ({ rot: k, v: l.length, extra: moedaC(soma(l, totalOS)) })).sort((x, y) => y.v - x.v))}</div></div>`;
}

// ---------------------------------------------------------------- documentos
function docOS(a, o) {
  const c = cli(a, o.cliente), cfg = a.db.cfg, eqs = (o.equipamentos || []).map((id) => eqp(a, id)).filter(Boolean), itens = (o.itens || []).filter((x) => x.aprovado !== false);
  return `<div class="doc"><div class="entre" style="align-items:flex-start"><div><h1>${esc(a.empresa)}</h1><div style="color:#555">${cfg.cnpj ? `CNPJ ${esc(cfg.cnpj)} · ` : ''}${esc(cfg.endereco || '')} · ${esc(cfg.telefone || '')}</div></div><div style="text-align:right"><b style="font-size:15px">${o.status === 'orcamento' ? 'Orçamento' : 'Ordem de serviço'}</b><div style="color:#555">Nº ${o.numero} · ${dataBR(o.data)}</div></div></div>
    <h2>Cliente</h2><table><tr><td>${esc(c?.nome || '')}${c?.documento ? ` · ${esc(c.documento)}` : ''}</td><td>${esc(c?.telefone || '')}</td></tr><tr><td colspan="2">${esc(c?.endereco || '')}</td></tr></table>
    <h2>Serviço</h2><table><tr><td>${esc(o.tipo)}</td><td>Técnico: ${esc(nomeT(o.tecnico))}</td></tr>${eqs.length ? `<tr><td colspan="2">Aparelhos: ${esc(eqs.map((x) => `${nomeEq(x)}${x.marca ? ` (${x.marca})` : ''}`).join('; '))}</td></tr>` : ''}${o.relato ? `<tr><td colspan="2">Relato: ${esc(o.relato)}</td></tr>` : ''}${o.diagnostico ? `<tr><td colspan="2">Diagnóstico: ${esc(o.diagnostico)}</td></tr>` : ''}</table>
    <h2>Itens</h2><table><thead><tr><th>Descrição</th><th class="n">Qtd.</th><th class="n">Valor</th><th class="n">Total</th></tr></thead><tbody>${itens.map((x) => `<tr><td>${esc(x.descricao)}</td><td class="n">${num(x.qtd)}</td><td class="n">${moeda(x.preco)}</td><td class="n">${moeda(x.qtd * x.preco)}</td></tr>`).join('')}${o.desconto ? `<tr><td colspan="3">Desconto</td><td class="n">− ${moeda(o.desconto)}</td></tr>` : ''}<tr><td colspan="3"><b>Total</b></td><td class="n"><b>${moeda(totalOS(o))}</b></td></tr></tbody></table>
    ${o.status === 'concluida' ? `<h2>Checklist executado</h2><table><tbody>${(o.checklist || []).map((x) => `<tr><td>${x.feito ? '✔' : '—'} ${esc(x.item)}</td></tr>`).join('')}</tbody></table><div style="margin-top:8px;color:#444;font-size:11px">Garantia do serviço: ${o.garantia || 90} dias, até ${dataBR(diaMais(o.garantia || 90, o.concluida_em || o.data))}.</div>` : '<div style="margin-top:8px;color:#444;font-size:11px">Orçamento válido por 15 dias.</div>'}
    <div class="ass"><div>${esc(nomeT(o.tecnico))} · técnico</div><div>${esc(o.recebido_por || c?.contato || c?.nome || 'Cliente')}</div></div></div>`;
}

// ---------------------------------------------------------------- fichas
const fichas = {
  os(a, id, aba = 'servico') {
    const o = a.db.obter('ordens', id); if (!o) return null; const c = cli(a, o.cliente), eqs = (o.equipamentos || []).map((x) => eqp(a, x)).filter(Boolean);
    let corpo = '';
    if (aba === 'servico') corpo = `<div class="gav-sec">${props([['wrench', 'Tipo', esc(o.tipo)], ['calendar-blank', 'Quando', `${dataBR(o.data)} às ${esc(o.hora || '')}`], ['user-gear', 'Técnico', esc(nomeT(o.tecnico))], ['map-pin', 'Endereço', `<a target="_blank" rel="noopener" href="${mapsDe(c?.endereco)}">${esc(c?.endereco || '')}</a>`], eqs.length ? ['gauge', 'Aparelhos', esc(eqs.map(nomeEq).join('; '))] : null, o.relato ? ['chat-circle-text', 'Relato do cliente', esc(o.relato)] : null, o.diagnostico ? ['stethoscope', 'Diagnóstico', esc(o.diagnostico)] : null, ['currency-circle-dollar', 'Total', `${moeda(totalOS(o))} ${o.status === 'concluida' ? (o.pago ? et('Pago', 'ok') : et('A receber', 'er')) : ''}`], o.recebido_por ? ['user', 'Recebido por', esc(o.recebido_por)] : null, o.avaliacao ? ['star', 'Avaliação do cliente', `${'★'.repeat(o.avaliacao)}${'☆'.repeat(5 - o.avaliacao)}${o.comentario ? ` · ${esc(o.comentario)}` : ''}`] : null])}</div>
      <div class="gav-sec"><div class="entre"><h4 style="margin:0">Itens</h4>${o.status !== 'concluida' ? `<button type="button" class="btn peq" data-acao="addItem" data-id="${id}">${ic('plus')}Item</button>` : ''}</div><table class="tabela"><thead><tr><th>Descrição</th><th class="n">Qtd.</th><th class="n">Total</th><th></th></tr></thead><tbody>${(o.itens || []).map((x, k) => `<tr><td>${esc(x.descricao)}</td><td class="n">${num(x.qtd)}</td><td class="n">${moeda(x.qtd * x.preco)}</td><td>${x.aprovado == null ? et('Aguardando', 'al') : x.aprovado ? '' : et('Recusado', '')}${o.status !== 'concluida' ? `<button type="button" class="btn fant peq ic-so" data-acao="tirarItem" data-id="${id}" data-k="${k}" aria-label="Tirar">${ic('x')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
    if (aba === 'check') corpo = `<div class="gav-sec"><p class="mute" style="font-size:12.5px;margin:0 0 8px">Marque o que foi feito. O checklist vai para o comprovante do cliente.</p>${(o.checklist || []).map((x, k) => `<label class="flex" style="gap:8px;padding:6px 0;border-bottom:1px solid var(--borda)"><input type="checkbox" data-mudar="check" data-id="${id}" data-k="${k}" ${x.feito ? 'checked' : ''}>${esc(x.item)}</label>`).join('')}</div>`;
    if (aba === 'fotos') corpo = a.anexos.html('ordens', id, { titulo: 'Fotos do antes e depois', dica: 'Fotografe o aparelho antes e depois, a etiqueta com o modelo e o que foi trocado.' });
    if (aba === 'hist') corpo = `<div class="gav-sec">${linhaDoTempo(a.db.historico(`ordens:${id}`).map((h) => ({ quando: h.quando, icone: h.icone, tom: h.tom, html: esc(h.texto) })))}</div>`;
    const prox = o.status === 'orcamento' ? `<button type="button" class="btn pri" data-acao="enviarOrc" data-id="${id}">${ic('paper-plane-tilt')}Enviar orçamento</button><button type="button" class="btn" data-acao="aprovarManual" data-id="${id}">${ic('check')}Cliente aprovou</button>`
      : ABERTAS.includes(o.status) ? `<button type="button" class="btn pri" data-acao="avancar" data-id="${id}">${ic(o.status === 'agendada' ? 'car' : o.status === 'caminho' ? 'play' : 'check')}${o.status === 'agendada' ? 'A caminho' : o.status === 'caminho' ? 'Iniciar atendimento' : 'Concluir serviço'}</button><button type="button" class="btn" data-acao="acompanhar" data-id="${id}">${ic('link')}Link de acompanhamento</button><button type="button" class="btn" data-acao="remarcar" data-id="${id}">${ic('calendar-dots')}Remarcar</button>`
        : o.status === 'concluida' ? `<button type="button" class="btn pri" data-acao="acompanhar" data-id="${id}">${ic('link')}Enviar comprovante</button>${o.pago ? '' : `<button type="button" class="btn" data-acao="cobrar" data-id="${id}">${ic('qr-code')}Cobrar com PIX</button><button type="button" class="btn" data-acao="receber" data-id="${id}">${ic('check')}Recebi</button>`}` : '';
    return { html: ficha({ tipo: o.status === 'orcamento' ? 'Orçamento' : 'Ordem de serviço', icone: 'wrench', titulo: `#${o.numero} · ${esc(c?.nome || '')}`, avatar: av(c?.nome || '?', 'g'), sub: `<span>${esc(o.tipo)} · ${dataCurta(o.data)}</span>${et(stt(o.status)[1], stt(o.status)[2])}`,
      extra: `<div class="flex" style="margin-top:12px;flex-wrap:wrap">${prox}<button type="button" class="btn" data-acao="imprimirOS" data-id="${id}">${ic('printer')}Imprimir</button>${c?.telefone ? `<a class="btn" target="_blank" rel="noopener" href="${telLink(c.telefone)}">${ic('whatsapp-logo')}WhatsApp</a>` : ''}</div>`,
      aba, abas: [['servico', 'Serviço'], ['check', 'Checklist', (o.checklist || []).filter((x) => x.feito).length || ''], ['fotos', 'Fotos', (o._anexos || []).length || ''], ['hist', 'Histórico']], corpo,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarOS" data-id="${id}">${ic('pencil-simple')}Editar</button><button type="button" class="btn fant peq ic-so" data-acao="excluirOS" data-id="${id}" aria-label="Excluir">${ic('trash')}</button>` }), montar: (g) => (g.dataset.aba = aba) };
  },
  cliente(a, id) {
    const c = cli(a, id); if (!c) return null; const os = ords(a).filter((o) => o.cliente === id).sort((x, y) => y.data.localeCompare(x.data)), eqs = eqsDe(a, id);
    return { estreita: true, html: ficha({ tipo: 'Cliente', icone: 'user', titulo: esc(c.nome), sub: `<span>${esc(c.tipo || '')} · ${esc(c.bairro || '')}</span>`,
      extra: `<div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn pri" data-acao="novaOS" data-c="${id}">${ic('plus')}Nova OS</button><a class="btn" target="_blank" rel="noopener" href="${telLink(c.telefone)}">${ic('whatsapp-logo')}WhatsApp</a><a class="btn" target="_blank" rel="noopener" href="${mapsDe(c.endereco)}">${ic('map-pin')}Mapa</a></div>`,
      corpo: `<div class="gav-sec">${props([['map-pin', 'Endereço', esc(c.endereco || '')], ['user', 'Responsável', esc(c.contato || '')], ['identification-card', 'CPF / CNPJ', esc(c.documento || '')], ['currency-circle-dollar', 'Total em serviços', moeda(soma(os.filter((o) => o.status === 'concluida'), totalOS))]])}</div>
        <div class="gav-sec"><div class="entre"><h4 style="margin:0">Aparelhos (${eqs.length})</h4><button type="button" class="btn peq" data-acao="novoEq" data-c="${id}">${ic('plus')}Aparelho</button></div>${eqs.length ? `<ul class="lista" style="margin:0 -20px">${eqs.map((x) => { const p = proxPrev(x); return `<li><div class="cresce"><div class="t">${esc(nomeEq(x))}</div><div class="s">${esc(`${x.marca || ''} ${x.modelo || ''}`.trim())}${x.ultima ? ` · última ${dataCurta(x.ultima)}` : ''}</div></div>${p ? et(`preventiva ${dataCurta(p)}`, diasAte(p) <= 15 ? 'er' : '') : ''}<button type="button" class="btn fant peq ic-so" data-acao="editarCad" data-c="equipamentos" data-id="${x.id}" aria-label="Editar">${ic('pencil-simple')}</button></li>`; }).join('')}</ul>` : '<p class="mute" style="font-size:12.5px">Cadastre os aparelhos do cliente. O sistema avisa quando chegar a hora da preventiva de cada um.</p>'}</div>
        <div class="gav-sec"><h4>Serviços (${os.length})</h4>${os.length ? `<ul class="lista" style="margin:0 -20px">${os.map((o) => `<li class="clicavel" data-abrir="os:${o.id}"><span class="mono mute-2">#${o.numero}</span><div class="cresce"><div class="t">${esc(o.tipo)}</div><div class="s">${dataCurta(o.data)} · ${moeda(totalOS(o))}</div></div>${et(stt(o.status)[1], stt(o.status)[2])}</li>`).join('')}</ul>` : vazio('wrench', 'Nenhum serviço ainda')}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="clientes" data-id="${id}">${ic('pencil-simple')}Editar</button>` }) };
  },
};

// ---------------------------------------------------------------- aplicativo
const app = criarApp({
  id: 'ofixl', paginaSite: 'ofixl.html', nome: 'Blue Rose Ofixl', sub: 'Serviços técnicos em campo', marcaSub: 'Serviços técnicos em campo', logo: new URL('logo.png', import.meta.url).href, produto: { mensal: 49.9 }, cor: '#1f6feb', icone: 'wrench', empresa: 'Clima Certo Refrigeração', conta: 'Ar-condicionado e refrigeração · São Paulo',
  semente, colecoes, fichas, buscaDica: 'clientes e ordens de serviço',
  portal: {
    atendimento: {
      explica: 'O cliente acompanha a visita pelo celular (agendada, técnico a caminho, em atendimento, concluída), aprova o orçamento item por item, vê as fotos e o checklist, paga com PIX e avalia o serviço.',
      montar: async (a, id, { fotos }) => {
        const o = a.db.obter('ordens', id); if (!o) return null; const c = cli(a, o.cliente);
        return { numero: o.numero, tipo: o.tipo, data: o.data, hora: o.hora, status: o.status, etapas: STATUS.filter(([k]) => k !== 'cancelada').map(([k, n]) => [k, n]), tecnico: nomeT(o.tecnico), cliente: c?.nome || '', endereco: c?.endereco || '', relato: o.relato || '', diagnostico: o.diagnostico || '', desconto: o.desconto || 0,
          itens: (o.itens || []).map((x, k) => ({ k, descricao: x.descricao, qtd: x.qtd, preco: x.preco, aprovado: x.aprovado ?? null })), checklist: o.status === 'concluida' ? (o.checklist || []) : [], aparelhos: (o.equipamentos || []).map((x) => eqp(a, x)).filter(Boolean).map(nomeEq),
          garantia: o.garantia || 90, garantia_ate: o.status === 'concluida' ? diaMais(o.garantia || 90, o.concluida_em || o.data) : '', pago: !!o.pago, informado: !!o.informado, avaliacao: o.avaliacao || 0, total: totalOS(o), pix: o.status === 'concluida' && !o.pago ? a.pixDados() : null, txid: `OS${o.numero}`, fotos: await fotos(o) };
      },
      responder: (a, r) => {
        const o = a.db.obter('ordens', r.ref); if (!o) return '';
        const nome = cli(a, o.cliente)?.nome || 'O cliente';
        if (r.acao === 'aprovar') {
          const resp = r.dados.itens || {}; let sim = 0, nao = 0;
          const itens = o.itens.map((x, k) => { if (x.aprovado != null || !(k in resp)) return x; resp[k] ? sim++ : nao++; return { ...x, aprovado: !!resp[k] }; });
          a.db.salvar('ordens', { id: o.id, itens, aprovado_em: hoje(), ...(o.status === 'orcamento' && sim ? { status: 'agendada' } : {}) });
          a.db.registrar(`ordens:${o.id}`, `Cliente respondeu o orçamento pelo link: ${sim} aprovado(s)${nao ? `, ${nao} recusado(s)` : ''}`, { icone: 'check', tom: 'ok' });
          return `${nome} aprovou o orçamento #${o.numero} (${sim} ${sim === 1 ? 'item' : 'itens'})${o.status === 'orcamento' && sim ? ': confira a data e o técnico' : ''}`;
        }
        if (r.acao === 'paguei') { if (o.pago) return ''; a.db.salvar('ordens', { id: o.id, informado: hoje() }); a.db.registrar(`ordens:${o.id}`, 'Cliente avisou que pagou pelo PIX', { icone: 'currency-circle-dollar' }); return `${nome} avisou que pagou ${moeda(totalOS(o))} (OS #${o.numero}): confira e dê baixa`; }
        if (r.acao === 'avaliar') { const n = Math.max(1, Math.min(5, Number(r.dados.nota) || 0)); const comentario = String(r.dados.comentario || '').slice(0, 300); a.db.salvar('ordens', { id: o.id, avaliacao: n, comentario }); a.db.registrar(`ordens:${o.id}`, `Cliente avaliou com ${n} estrela(s)${comentario ? `: ${comentario}` : ''}`, { icone: 'star', tom: n >= 4 ? 'ok' : 'al' }); return `${nome} avaliou o serviço #${o.numero} com ${n} estrela${n === 1 ? '' : 's'}`; }
        return '';
      },
    },
  },
  modelos: [
    { id: 'ar', nome: 'Ar-condicionado e refrigeração', desc: 'Instalação, preventiva, higienização e carga de gás', dados: {} },
    { id: 'eletrica', nome: 'Elétrica residencial e comercial', desc: 'Visitas, reparos, quadros e instalações', dados: { servicos: [['Visita técnica elétrica', 120], ['Troca de disjuntor', 90], ['Instalação de chuveiro', 120], ['Instalação de tomada', 60], ['Revisão de quadro elétrico', 250]].map(([nome, preco]) => ({ nome, preco })), materiais: [['Disjuntor 20A', 'un', 18, 40, 10, 4], ['Fio 2,5 mm (rolo 100 m)', 'rolo', 180, 260, 3, 1]].map(([nome, unidade, custo, preco, estoque, minimo]) => ({ nome, unidade, custo, preco, estoque, minimo })) } },
    { id: 'hidraulica', nome: 'Hidráulica e manutenção predial', desc: 'Vazamentos, desentupimento e caixas d\'água', dados: { servicos: [['Visita técnica hidráulica', 120], ['Conserto de vazamento', 180], ['Desentupimento', 220], ['Limpeza de caixa d\'água', 250]].map(([nome, preco]) => ({ nome, preco })) } },
  ],
  passos: (a) => [{ id: 'pix', rot: 'Cadastre a chave PIX da empresa', feito: a.temPix(), href: '#/config' }, { id: 'os', rot: 'Abra a primeira ordem de serviço', feito: ords(a).length > 0, acao: 'novaOS' }],
  equipe: [['Rodrigo Martins', 'Dono'], ['Cláudia Neves', 'Escritório'], ...TECNICOS.map(([, n]) => [n, 'Técnico'])],
  busca: [{ colecao: 'clientes', grupo: 'Clientes', icone: 'user', ficha: 'cliente', rot: (c) => c.nome, sub: (c) => c.bairro || c.tipo }, { colecao: 'ordens', grupo: 'Ordens de serviço', icone: 'wrench', ficha: 'os', rot: (o, a) => `#${o.numero} · ${cli(a, o.cliente)?.nome || ''}`, sub: (o) => `${o.tipo} · ${dataCurta(o.data)}` }],
  comandos: [{ rot: 'Nova ordem de serviço', icone: 'wrench', acao: (a) => a.acoes.novaOS({}) }, { rot: 'Novo orçamento', icone: 'file-text', acao: (a) => a.acoes.novaOS({ orc: '1' }) }],
  paginas: [
    { id: 'painel', rot: 'Painel', icone: 'house', titulo: 'Visão geral', render: painel, atalho: 'i' },
    { id: 'meudia', rot: 'Meu dia (técnico)', icone: 'user-gear', titulo: 'O dia do técnico', render: meuDia, atalho: 'd' },
    { id: 'agenda', rot: 'Agenda', icone: 'calendar-blank', render: agendaPag, atalho: 'a', cont: (a) => ords(a).filter((o) => ABERTAS.includes(o.status) && o.data === hoje()).length },
    { id: 'ordens', rot: 'Ordens de serviço', icone: 'clipboard-text', render: ordensPag, atalho: 'o', novo: (a) => a.acoes.novaOS({}), cont: (a) => { const n = orcParados(a).length; return n ? { n, tom: 'al' } : 0; } },
    { id: 'clientes', rot: 'Clientes', icone: 'users', render: clientesPag, atalho: 'c' },
    { id: 'equipamentos', rot: 'Aparelhos e preventivas', icone: 'gauge', render: equipamentosPag, cont: (a) => { const n = prevVencendo(a).length; return n ? { n, tom: 'al' } : 0; } },
    { grupo: 'Gestão' },
    { id: 'financeiro', rot: 'Financeiro', icone: 'wallet', render: financeiroPag, cont: (a) => { const n = aReceber(a).filter((o) => o.informado).length; return n ? { n, tom: 'ok' } : 0; } },
    { id: 'catalogo', rot: 'Serviços e materiais', icone: 'package', render: catalogoPag, cont: (a) => { const n = a.db.lista('materiais').filter((m) => Number(m.estoque) <= Number(m.minimo)).length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'relatorios', rot: 'Relatórios', icone: 'chart-bar', render: relatoriosPag },
    paginaEquipe(EQUIPE),
    ...ferramentaPaginas(FERR, FERR_ITENS),
  ],
});

const reab = () => { app.render(); app.reabrir(); };
const somarItensDe = (tipo, qtdEq) => { const s = app.db.lista('servicos').find((x) => (tipo === 'Instalação' ? /instala/i.test(x.nome) : tipo === 'Higienização' ? /higien/i.test(x.nome) : tipo === 'Manutenção preventiva' ? /preventiva/i.test(x.nome) : tipo === 'Desinstalação' ? /desinstala/i.test(x.nome) : /visita|diagn/i.test(x.nome)));
  return s ? [{ descricao: s.nome, qtd: tipo === 'Manutenção preventiva' ? Math.max(1, qtdEq) : 1, preco: Number(s.preco) || 0, aprovado: true }] : []; };

Object.assign(app.acoes, {
  novaOS: async (d = {}) => {
    const cls = app.db.lista('clientes').sort((x, y) => x.nome.localeCompare(y.nome));
    if (!cls.length) { avisar('Cadastre o primeiro cliente para abrir a OS'); if (await editar(app, 'clientes')) app.render(); return; }
    const orc = d.orc === '1';
    const r = await modal({ titulo: orc ? 'Novo orçamento' : 'Nova ordem de serviço', largura: 580, corpo: `<form class="form-grade"><label class="campo largo">Cliente<select name="c" required>${cls.map((c) => `<option value="${c.id}" ${c.id === d.c ? 'selected' : ''}>${esc(c.nome)}${c.bairro ? ` · ${esc(c.bairro)}` : ''}</option>`).join('')}</select></label><label class="campo">Tipo<select name="tipo">${TIPOS_OS.map((t) => `<option ${t === (d.tipo || (orc ? 'Visita técnica / orçamento' : '')) ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label class="campo">Técnico<select name="t">${TECNICOS.map(([id, n]) => `<option value="${id}" ${id === padraoEquipe() ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label><label class="campo">Data<input type="date" name="data" value="${orc ? hoje() : diaMais(1)}" required></label><label class="campo">Hora<input type="time" name="hora" value="09:00"></label><label class="campo largo">O que o cliente relatou<input name="relato" placeholder="Ex.: o ar da sala está pingando"></label><label class="campo largo flex" style="flex-direction:row;gap:8px;align-items:center;font-weight:400;color:var(--tx)"><input type="checkbox" name="orc" ${orc ? 'checked' : ''}> É um orçamento (o cliente aprova pelo link antes de agendar)</label></form>`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: orc ? 'Criar orçamento' : 'Agendar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return fm.reportValidity() ? { ...Object.fromEntries(new FormData(fm)), orc: fm.orc.checked } : false; } }] });
    if (!r) return; const c = cli(app, r.c), eqs = eqsDe(app, c.id);
    const o = app.db.salvar('ordens', { numero: proxNumero(app), cliente: c.id, equipamentos: (r.tipo === 'Instalação' ? [] : eqs.map((x) => x.id)), tipo: r.tipo, data: r.data, hora: r.hora, tecnico: r.t, status: r.orc ? 'orcamento' : 'agendada', itens: somarItensDe(r.tipo, eqs.length).map((x) => ({ ...x, aprovado: r.orc ? null : true })), checklist: checklistDe(r.tipo), relato: r.relato, garantia: 90, pago: false, ...(r.orc ? { orcado_em: hoje() } : {}) });
    app.db.registrar(`ordens:${o.id}`, r.orc ? 'Orçamento criado' : 'OS agendada', { icone: 'calendar-plus' }); avisar(r.orc ? 'Orçamento criado: confira os itens e envie ao cliente' : `Agendada: ${c.nome} · ${dataCurta(r.data)} ${r.hora}`); app.render(); app.abrir('os', o.id);
  },
  avancar: async (d) => {
    const o = app.db.obter('ordens', d.id), c = cli(app, o.cliente);
    if (o.status === 'agendada') {
      app.db.salvar('ordens', { id: o.id, status: 'caminho', saiu_em: new Date().toISOString() }); app.db.registrar(`ordens:${o.id}`, `${nomeT(o.tecnico)} saiu para o atendimento`, { icone: 'car' });
      // automático: o cliente recebe o aviso com o link para acompanhar
      const url = await app.portal.link('atendimento', o.id);
      if (c?.telefone) window.open(zapCli(app, c, `Olá, ${primeiro(c.contato || c.nome)}! Aqui é da ${app.empresa}. O técnico ${nomeT(o.tecnico)} está a caminho para o serviço de ${o.tipo.toLowerCase()}. Acompanhe por aqui: ${url}`), '_blank', 'noopener');
      app.render(); return;
    }
    if (o.status === 'caminho') { app.db.salvar('ordens', { id: o.id, status: 'atendimento', inicio: new Date().toISOString() }); app.db.registrar(`ordens:${o.id}`, 'Atendimento iniciado', { icone: 'play' }); app.render(); app.abrir('os', o.id, 'check'); return; }
    if (o.status !== 'atendimento') return;
    const mats = app.db.lista('materiais');
    const r = await modal({ titulo: `Concluir · ${c?.nome || ''}`, largura: 600, corpo: `<form class="form-grade"><fieldset class="campo largo" style="border:0;padding:0"><legend style="margin-bottom:6px">Checklist</legend>${(o.checklist || []).map((x, k) => `<label class="flex" style="font-weight:400;color:var(--tx);gap:8px"><input type="checkbox" name="ck" value="${k}" ${x.feito ? 'checked' : ''}>${esc(x.item)}</label>`).join('')}</fieldset>${mats.length ? `<fieldset class="campo largo" style="border:0;padding:0"><legend style="margin-bottom:6px">Materiais usados (saem do estoque e entram na OS)</legend><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px">${mats.map((m) => `<label class="campo">${esc(m.nome)} <span class="mute" style="font-weight:400">${esc(m.unidade || '')} · ${num(m.estoque, 2)} em estoque</span><input type="number" name="m_${m.id}" min="0" step="0.01" placeholder="0"></label>`).join('')}</div></fieldset>` : ''}<label class="campo largo">Diagnóstico e o que foi feito<input name="diag" value="${esc(o.diagnostico || '')}" placeholder="Ex.: capacitor queimado, trocado e testado"></label><label class="campo">Quem recebeu<input name="quem" value="${esc(c?.contato || c?.nome || '')}"></label><label class="campo">Garantia (dias)<input type="number" name="g" min="0" value="${o.garantia || 90}"></label><label class="campo largo flex" style="flex-direction:row;gap:8px;align-items:center;font-weight:400;color:var(--tx)"><input type="checkbox" name="pago"> Já recebi o pagamento</label></form>`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Concluir serviço', classe: 'pri ok', acao: (f) => { const fm = f.querySelector('form'); return { ...Object.fromEntries(new FormData(fm)), ck: [...fm.querySelectorAll('[name=ck]:checked')].map((x) => Number(x.value)), pago: fm.pago.checked }; } }] });
    if (!r) return;
    const usados = mats.map((m) => ({ m, q: Number(r[`m_${m.id}`]) || 0 })).filter((x) => x.q > 0);
    usados.forEach(({ m, q }) => app.db.salvar('materiais', { id: m.id, estoque: Math.max(0, Number((Number(m.estoque) - q).toFixed(2))) }));
    const itens = [...(o.itens || []), ...usados.filter(({ m }) => Number(m.preco) > 0).map(({ m, q }) => ({ descricao: m.nome, qtd: q, preco: Number(m.preco), aprovado: true, material: m.id }))];
    app.db.salvar('ordens', { id: o.id, status: 'concluida', concluida_em: hoje(), fim: new Date().toISOString(), checklist: (o.checklist || []).map((x, k) => ({ ...x, feito: r.ck.includes(k) })), diagnostico: r.diag, recebido_por: r.quem, garantia: Number(r.g) || 90, itens, pago: r.pago, ...(r.pago ? { pago_em: hoje() } : {}) });
    // automático: a última manutenção de cada aparelho vira hoje, e a próxima preventiva é recalculada
    if (['Manutenção preventiva', 'Higienização', 'Instalação', 'Manutenção corretiva'].includes(o.tipo)) (o.equipamentos || []).forEach((id) => app.db.salvar('equipamentos', { id, ultima: hoje() }));
    app.db.registrar(`ordens:${o.id}`, 'Serviço concluído', { icone: 'check-circle', tom: 'ok' });
    if (o.tipo === 'Instalação' && await confirmar('Instalação concluída. Cadastrar o aparelho instalado para o sistema lembrar das preventivas?', { rotulo: 'Cadastrar' })) {
      const eq = await editar(app, 'equipamentos', null, { cliente: o.cliente, ultima: hoje(), instalado: hoje(), periodicidade: '180' }); if (eq) app.db.salvar('ordens', { id: o.id, equipamentos: [eq.id] });
    }
    avisar(r.pago ? 'Serviço concluído e pago' : 'Serviço concluído. Envie o comprovante e a cobrança com PIX.'); app.render(); app.abrir('os', o.id);
  },
  acompanhar: async (d) => { const o = app.db.obter('ordens', d.id), c = cli(app, o.cliente);
    if (o.status === 'concluida' && !o.pago) await app.pedirPix('Para o comprovante já ir com o PIX copia e cola e o QR code, cadastre a chave da empresa.');
    app.portal.compartilhar('atendimento', d.id, { titulo: `OS #${o.numero} · ${c?.nome || ''}`, telefone: c?.telefone, texto: o.status === 'concluida' ? `Olá! Aqui é da ${app.empresa}. Segue o comprovante do serviço de ${o.tipo.toLowerCase()}, com o checklist, as fotos e a garantia${o.pago ? '' : ', e o PIX para pagamento'}:` : `Olá! Aqui é da ${app.empresa}. Acompanhe o seu atendimento por este link:`, qr: true }); },
  enviarOrc: (d) => { const o = app.db.obter('ordens', d.id), c = cli(app, o.cliente); if (!(o.itens || []).length) { avisar('Adicione os itens do orçamento antes de enviar', { tipo: 'erro' }); return; }
    app.db.salvar('ordens', { id: o.id, orcado_em: hoje() }); app.db.registrar(`ordens:${o.id}`, 'Orçamento enviado', { icone: 'paper-plane-tilt' });
    app.portal.compartilhar('atendimento', d.id, { titulo: `Orçamento #${o.numero}`, telefone: c?.telefone, texto: `Olá! Aqui é da ${app.empresa}. Segue o orçamento de ${o.tipo.toLowerCase()} (${moeda(totalOS(o))}). Você aprova item por item pelo link:`, qr: true }); },
  lembrarOrc: async (d) => { const o = app.db.obter('ordens', d.id), c = cli(app, o.cliente), url = await app.portal.link('atendimento', o.id);
    window.open(zapCli(app, c, `Olá, ${primeiro(c?.contato || c?.nome)}! Aqui é da ${app.empresa}. Conseguiu ver o orçamento de ${o.tipo.toLowerCase()} (${moeda(totalOS(o))})? Se quiser, aprovo a data ainda esta semana. Link: ${url}`), '_blank', 'noopener');
    app.db.salvar('ordens', { id: o.id, orcado_em: hoje() }); app.db.registrar(`ordens:${o.id}`, 'Lembrete do orçamento enviado', { icone: 'whatsapp-logo' }); app.render(); },
  aprovarManual: (d) => { const o = app.db.obter('ordens', d.id); app.db.salvar('ordens', { id: o.id, status: 'agendada', aprovado_em: hoje(), itens: (o.itens || []).map((x) => ({ ...x, aprovado: x.aprovado ?? true })) }); app.db.registrar(`ordens:${o.id}`, 'Orçamento aprovado', { icone: 'check', tom: 'ok' }); avisar('Orçamento aprovado: confira a data e o técnico'); reab(); },
  cobrar: async (d) => { const o = app.db.obter('ordens', d.id), c = cli(app, o.cliente);
    await app.pedirPix('Para a cobrança já ir com o PIX copia e cola e o QR code, cadastre a chave da empresa.');
    const url = await app.portal.link('atendimento', o.id);
    window.open(zapCli(app, c, `Olá, ${primeiro(c?.contato || c?.nome)}! Aqui é da ${app.empresa}. Segue o comprovante do serviço de ${o.tipo.toLowerCase()} (${moeda(totalOS(o))}) com o PIX para pagamento: ${url}`), '_blank', 'noopener');
    app.db.registrar(`ordens:${o.id}`, 'Cobrança enviada com PIX', { icone: 'qr-code' }); app.render(); },
  receber: (d) => { app.db.salvar('ordens', { id: d.id, pago: true, pago_em: hoje() }); app.db.registrar(`ordens:${d.id}`, 'Pagamento recebido', { icone: 'currency-circle-dollar', tom: 'ok' }); avisar('Recebido'); reab(); },
  remarcar: async (d) => { const o = app.db.obter('ordens', d.id);
    const r = await modal({ titulo: `Remarcar OS #${o.numero}`, largura: 400, corpo: `<form class="form-grade"><label class="campo">Data<input type="date" name="data" value="${o.data}" required></label><label class="campo">Hora<input type="time" name="hora" value="${esc(o.hora || '09:00')}"></label><label class="campo largo">Técnico<select name="t">${TECNICOS.map(([id, n]) => `<option value="${id}" ${id === o.tecnico ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Salvar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
    if (!r) return; app.db.salvar('ordens', { id: o.id, data: r.data, hora: r.hora, tecnico: r.t, status: o.status === 'caminho' ? 'agendada' : o.status }); app.db.registrar(`ordens:${o.id}`, `Remarcada para ${dataBR(r.data)} ${r.hora}`, { icone: 'calendar-dots' }); reab(); },
  addItem: async (d) => { const o = app.db.obter('ordens', d.id), sv = app.db.lista('servicos'), mt = app.db.lista('materiais');
    const r = await modal({ titulo: 'Adicionar item', largura: 480, corpo: `<form class="form-grade"><label class="campo largo">Do catálogo<select name="cat"><option value="">— digitar abaixo —</option><optgroup label="Serviços">${sv.map((s) => `<option value="s:${s.id}">${esc(s.nome)} · ${moeda(s.preco)}</option>`).join('')}</optgroup><optgroup label="Materiais">${mt.map((m) => `<option value="m:${m.id}">${esc(m.nome)} · ${moeda(m.preco)}</option>`).join('')}</optgroup></select></label><label class="campo largo">Ou descrição<input name="desc"></label><label class="campo">Quantidade<input type="number" name="q" min="0.01" step="0.01" value="1"></label><label class="campo">Valor unitário<input type="number" name="p" min="0" step="0.01" placeholder="do catálogo"></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Adicionar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
    if (!r) return; let desc = r.desc, preco = Number(r.p) || 0, material;
    if (r.cat) { const [t, id] = r.cat.split(':'); const x = app.db.obter(t === 's' ? 'servicos' : 'materiais', id); desc = desc || x?.nome; preco = r.p ? preco : Number(x?.preco) || 0; if (t === 'm') material = id; }
    if (!desc) { avisar('Escolha do catálogo ou digite a descrição', { tipo: 'erro' }); return; }
    app.db.salvar('ordens', { id: o.id, itens: [...(o.itens || []), { descricao: desc, qtd: Number(r.q) || 1, preco, aprovado: o.status === 'orcamento' ? null : true, ...(material ? { material } : {}) }] }); reab(); },
  tirarItem: (d) => { const o = app.db.obter('ordens', d.id); app.db.salvar('ordens', { id: o.id, itens: (o.itens || []).filter((_, k) => k !== Number(d.k)) }); reab(); },
  editarOS: async (d) => { const o = app.db.obter('ordens', d.id);
    const r = await modal({ titulo: `Editar OS #${o.numero}`, largura: 520, corpo: `<form class="form-grade"><label class="campo">Tipo<select name="tipo">${TIPOS_OS.map((t) => `<option ${t === o.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label class="campo">Desconto (R$)<input type="number" name="desc" min="0" step="0.01" value="${o.desconto || 0}"></label><label class="campo largo">Relato do cliente<input name="relato" value="${esc(o.relato || '')}"></label><fieldset class="campo largo" style="border:0;padding:0"><legend style="margin-bottom:6px">Aparelhos atendidos</legend>${eqsDe(app, o.cliente).map((x) => `<label class="flex" style="font-weight:400;color:var(--tx);gap:8px"><input type="checkbox" name="eq" value="${x.id}" ${(o.equipamentos || []).includes(x.id) ? 'checked' : ''}>${esc(nomeEq(x))}</label>`).join('') || '<span class="mute">Nenhum aparelho cadastrado para este cliente.</span>'}</fieldset><label class="campo largo flex" style="flex-direction:row;gap:8px;align-items:center;font-weight:400;color:var(--tx)"><input type="checkbox" name="cancelar" ${o.status === 'cancelada' ? 'checked' : ''}> OS cancelada</label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Salvar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return { ...Object.fromEntries(new FormData(fm)), eq: [...fm.querySelectorAll('[name=eq]:checked')].map((x) => x.value), cancelar: fm.cancelar.checked }; } }] });
    if (!r) return; app.db.salvar('ordens', { id: o.id, tipo: r.tipo, desconto: Number(r.desc) || 0, relato: r.relato, equipamentos: r.eq, ...(r.cancelar ? { status: 'cancelada' } : o.status === 'cancelada' ? { status: 'agendada' } : {}) }); reab(); },
  imprimirOS: (d) => imprimir(docOS(app, app.db.obter('ordens', d.id))),
  excluirOS: (d) => excluir(app, 'ordens', d.id),
  novoEq: async (d) => { if (await editar(app, 'equipamentos', null, { cliente: d.c })) reab(); },
  entradaMat: async (d) => { const m = app.db.obter('materiais', d.id); const r = await modal({ titulo: `Entrada · ${m.nome}`, largura: 360, corpo: `<form class="form-grade"><label class="campo">Quantidade<input type="number" name="q" min="0" step="0.01" value="1"></label><label class="campo">Custo unitário<input type="number" name="c" min="0" step="0.01" value="${m.custo || 0}"></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Dar entrada', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] }); if (!r) return; app.db.salvar('materiais', { id: m.id, estoque: Number((Number(m.estoque) + Number(r.q)).toFixed(2)), custo: Number(r.c) || m.custo }); avisar(`+${r.q} ${m.nome}`); app.render(); },
  mdTec: (d, el) => { app.estado.md = { t: el.value }; app.render(); },
  check: (d, el) => { const o = app.db.obter('ordens', el.dataset.id); app.db.salvar('ordens', { id: o.id, checklist: (o.checklist || []).map((x, k) => (k === Number(el.dataset.k) ? { ...x, feito: el.checked } : x)) }); },
  novoCad: async (d) => { if (await editar(app, d.c)) app.render(); },
  editarCad: async (d) => { if (await editar(app, d.c, app.db.obter(d.c, d.id))) reab(); },
});

// ferramentas no menu da esquerda (WhatsApp e copiar); avisos e mensagens prontas: plano Pro
equipeViva(app, EQUIPE);
Object.assign(app.acoes, acoesLado());
app.travarLado = travarPro;
