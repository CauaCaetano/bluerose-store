// Veltria Agenda · salões, estética, barbearias e clínicas (referências: Fresha, Booksy, Trinks, Avec)
import {
  criarApp, esc, moeda, moedaC, num, pct, hoje, agoraISO, diaMais, mesMais, nomeMes, dataCurta, dataBR, relativo, diasAte, diasEntre, paraData, minutos, hhmm,
  sorteio, soma, agrupar, av, ic, et, prog, telLink, kpis, barras, linhas, rosca, barrasH, calGrade, DIAS, DIAS_L, normal,
  modal, confirmar, avisar, editar, excluir, ficha, props, linhaDoTempo, vazio, pop, imprimir, campoHTML, lerCampos, fecharGaveta,
  corSegura,
} from '../base/nexo.js';
import { LADOS as FERR, ITENS as FERR_ITENS } from './ferramentas.js';
import { acoesLado, ferramentaPaginas, travarPro } from '../base/lado.js';

const STATUS = {
  agendado: ['Agendado', '#94a3b8', 'info'], confirmado: ['Confirmado', '#3b82f6', 'info'], chegou: ['Chegou', '#8b5cf6', 'roxo'], atendimento: ['Em atendimento', '#f59e0b', 'al'],
  concluido: ['Concluído', '#16a34a', 'ok'], faltou: ['Faltou', '#dc2626', 'er'], cancelado: ['Cancelado', '#a8a29e', ''],
};
const FLUXO = ['agendado', 'confirmado', 'chegou', 'atendimento', 'concluido'];
const METODOS = { pix: ['PIX', 'qr-code'], credito: ['Crédito', 'credit-card'], debito: ['Débito', 'credit-card'], dinheiro: ['Dinheiro', 'money'], pacote: ['Pacote', 'ticket'] };
const ORIGENS = { balcao: 'Balcão/telefone', whatsapp: 'WhatsApp', online: 'Agendamento online', instagram: 'Instagram' };
const ABRE = 8, FECHA = 20;

// ---------------------------------------------------------------- dados de exemplo (fictícios)
function semente() {
  const r = sorteio(20261011), esc1 = (l) => l[Math.floor(r() * l.length)], ent = (a, b) => a + Math.floor(r() * (b - a + 1));
  const profissionais = [
    ['p0', 'Larissa Mendes', 'Cabeleireira', '#db2777', 40, [1, 2, 3, 4, 5, 6, 0]], ['p1', 'Tainá Rocha', 'Manicure e pedicure', '#8b5cf6', 50, [2, 3, 4, 5, 6, 0]],
    ['p2', 'Bruna Vieira', 'Esteticista', '#0891b2', 35, [1, 2, 3, 4, 5, 0]], ['p3', 'Marcos Lima', 'Barbeiro', '#ea580c', 45, [1, 2, 3, 4, 5, 6]],
  ].map(([id, nome, funcao, cor, comissao, dias]) => ({ id, nome, funcao, cor, comissao, dias, ini: '09:00', fim: '19:00', almoco: ['12:00', '13:00'] }));
  const servicos = [
    ['s0', 'Corte feminino', 'Cabelo', 60, 110, 'p0'], ['s1', 'Escova modelada', 'Cabelo', 45, 75, 'p0'], ['s2', 'Coloração', 'Cabelo', 120, 240, 'p0'], ['s3', 'Hidratação profunda', 'Cabelo', 45, 95, 'p0'], ['s4', 'Mechas / luzes', 'Cabelo', 180, 420, 'p0'],
    ['s5', 'Manicure', 'Unhas', 45, 45, 'p1'], ['s6', 'Pedicure', 'Unhas', 50, 50, 'p1'], ['s7', 'Esmaltação em gel', 'Unhas', 60, 95, 'p1'], ['s8', 'Pé e mão', 'Unhas', 90, 85, 'p1'],
    ['s9', 'Limpeza de pele', 'Estética', 75, 170, 'p2'], ['s10', 'Design de sobrancelha', 'Estética', 30, 60, 'p2'], ['s11', 'Drenagem linfática', 'Corporal', 60, 140, 'p2'], ['s12', 'Peeling de diamante', 'Estética', 45, 150, 'p2'],
    ['s13', 'Corte masculino', 'Barbearia', 30, 55, 'p3'], ['s14', 'Barba completa', 'Barbearia', 30, 45, 'p3'], ['s15', 'Corte + barba', 'Barbearia', 60, 90, 'p3'],
  ].map(([id, nome, categoria, duracao, preco, prof]) => ({ id, nome, categoria, duracao, preco, profissional: prof }));
  const produtos = [['Shampoo reconstrutor 300 ml', 'Lumière Pro', 89, 41, 14, 5], ['Máscara de hidratação 250 g', 'Lumière Pro', 119, 52, 3, 4], ['Óleo finalizador 60 ml', 'Argan Gold', 79, 33, 9, 4], ['Esmalte em gel', 'Nail Lab', 39, 14, 26, 10], ['Pomada modeladora', 'Barba Brava', 49, 19, 2, 4], ['Protetor solar facial FPS 50', 'Derma+', 98, 45, 11, 4], ['Sérum vitamina C', 'Derma+', 129, 58, 6, 3]]
    .map(([nome, marca, preco, custo, estoque, minimo]) => ({ nome, marca, preco, custo, estoque, minimo }));
  const nomes = ['Aline Ferraz', 'Bianca Moreira', 'Carolina Dias', 'Daniela Paiva', 'Elaine Cardoso', 'Fabiana Reis', 'Gabriela Torres', 'Helena Campos', 'Isabela Freitas', 'Joana Matos', 'Karina Neves', 'Letícia Pacheco', 'Mônica Sales', 'Natália Brito', 'Olívia Antunes', 'Paula Siqueira', 'Rodrigo Alves', 'Sérgio Monteiro', 'Vinícius Prado', 'Yasmin Leal', 'Amanda Rezende', 'Beatriz Lacerda', 'Clara Fontes', 'Débora Saraiva', 'Eduarda Pinheiro', 'Flávia Quintela', 'Giovana Teles', 'Heloísa Bastos', 'Ingrid Valadares', 'Júlia Rangel', 'Lívia Ataíde', 'Marina Cunha', 'Nicole Prates', 'Priscila Faro', 'Renan Dutra', 'Samuel Coutinho', 'Tatiane Ruas', 'Vanessa Godoy', 'Wesley Martins', 'Thalita Couto'];
  const clientes = nomes.map((nome, i) => {
    const m = i % 5 === 0 ? new Date().getMonth() + 1 : ((i * 5) % 12) + 1, d = i % 5 === 0 ? Math.min(28, new Date().getDate() + (i % 7) - 1) : 3 + ((i * 7) % 25);
    return { id: `c${i}`, nome, telefone: `(11) 9${8200 + i * 17}-${3100 + i * 29}`, email: `${normal(nome.split(' ')[0])}${i}@email.com`, nascimento: `${1972 + ((i * 3) % 32)}-${String(m).padStart(2, '0')}-${String(Math.max(1, d)).padStart(2, '0')}`,
      alergias: i % 6 === 0 ? 'Alergia a amônia: usar coloração sem amônia.' : i % 9 === 0 ? 'Pele sensível a ácidos.' : '', preferencias: i % 7 === 0 ? 'Prefere horários no fim da tarde. Café sem açúcar.' : i % 4 === 0 ? 'Gosta de conversar pouco durante o atendimento.' : '',
      origem: esc1(['Instagram', 'Indicação', 'Google', 'Passou na frente', 'Instagram']), tags: i % 8 === 0 ? ['VIP'] : [], criado: diaMais(-ent(30, 700)) };
  });
  // agenda dos últimos 120 dias e próximos 10
  const agendamentos = [], comandas = [];
  const agoraMin = new Date().getHours() * 60 + new Date().getMinutes();
  const sumidos = new Set(['c3', 'c11', 'c19', 'c27', 'c33']);
  for (let d = -120; d <= 10; d++) {
    const data = diaMais(d), dow = paraData(data).getDay();
    for (const p of profissionais) {
      if (!p.dias.includes(dow)) continue;
      const lotacao = d === 0 ? 0.9 : d > 0 ? 0.62 - d * 0.04 : 0.7;
      let h = minutos(p.ini) + esc1([0, 0, 30]);
      while (h < minutos(p.fim) - 30) {
        if (h >= 12 * 60 && h < 13 * 60) { h = 13 * 60; continue; }
        const s = esc1(servicos.filter((x) => x.profissional === p.id));
        if (h + s.duracao > minutos(p.fim)) break;
        if (r() < lotacao) {
          let c = esc1(clientes); if (d > -45 && sumidos.has(c.id)) c = clientes[(Number(c.id.slice(1)) + 1) % clientes.length];
          const fimMin = h + s.duracao;
          let status;
          if (d < 0) status = r() < 0.06 ? 'faltou' : r() < 0.04 ? 'cancelado' : 'concluido';
          else if (d === 0) status = fimMin <= agoraMin ? (r() < 0.07 ? 'faltou' : 'concluido') : h <= agoraMin ? 'atendimento' : h - agoraMin < 40 ? esc1(['chegou', 'confirmado']) : r() < 0.7 ? 'confirmado' : 'agendado';
          else status = d === 1 && r() < 0.6 ? 'confirmado' : 'agendado';
          const extra = r() < 0.12 && s.categoria === 'Cabelo' ? servicos.find((x) => x.id === 's3') : null;
          const itens = extra && h + s.duracao + extra.duracao <= minutos(p.fim) ? [s.id, extra.id] : [s.id];
          const dur = soma(itens, (id) => servicos.find((x) => x.id === id).duracao), valor = soma(itens, (id) => servicos.find((x) => x.id === id).preco);
          const ag = { id: `a${agendamentos.length}`, cliente: c.id, profissional: p.id, data, ini: hhmm(h), duracao: dur, servicos: itens, valor, status, origem: esc1(['balcao', 'whatsapp', 'online', 'online', 'instagram']), criado: diaMais(-ent(1, 12), data) };
          agendamentos.push(ag);
          if (status === 'concluido') {
            const its = itens.map((id) => { const sv = servicos.find((x) => x.id === id); return { tipo: 'servico', ref: id, nome: sv.nome, qtd: 1, preco: sv.preco, profissional: p.id }; });
            if (r() < 0.18) { const pr = esc1(produtos); its.push({ tipo: 'produto', ref: pr.nome, nome: pr.nome, qtd: 1, preco: pr.preco, profissional: p.id }); }
            const total = soma(its, (x) => x.qtd * x.preco), desc = r() < 0.08 ? Math.round(total * 0.1) : 0;
            comandas.push({ id: `k${comandas.length}`, numero: 1000 + comandas.length, cliente: c.id, agendamento: ag.id, data, itens: its, desconto: desc, pagamentos: [{ metodo: esc1(['pix', 'pix', 'credito', 'debito', 'dinheiro']), valor: total - desc }], status: 'fechada', fechada_em: `${data}T${hhmm(Math.min(fimMin, 20 * 60))}` });
            ag.comanda = `k${comandas.length - 1}`;
          }
          h += dur + esc1([0, 0, 15, 30]);
        } else h += 30;
      }
    }
  }
  const pacotes = [
    { cliente: 'c1', servico: 's11', sessoes: 10, usadas: 6, valor: 1190, validade: diaMais(60), compra: diaMais(-70) },
    { cliente: 'c4', servico: 's9', sessoes: 5, usadas: 2, valor: 720, validade: diaMais(90), compra: diaMais(-40) },
    { cliente: 'c8', servico: 's7', sessoes: 4, usadas: 4, valor: 330, validade: diaMais(-5), compra: diaMais(-120) },
    { cliente: 'c12', servico: 's3', sessoes: 6, usadas: 1, valor: 480, validade: diaMais(120), compra: diaMais(-12) },
    { cliente: 'c20', servico: 's12', sessoes: 4, usadas: 3, valor: 520, validade: diaMais(25), compra: diaMais(-60) },
  ];
  return { _cfg: { empresa: 'Studio Lumière', endereco: 'Rua Oscar Freire, 1020 · Jardins · São Paulo/SP', telefone: '(11) 3062-4410' }, profissionais, servicos, produtos, clientes, agendamentos, comandas, pacotes };
}

// ---------------------------------------------------------------- regras
const SEM_PROF = { nome: 'Profissional removido', funcao: '', comissao: 0, ini: '09:00', fim: '19:00', dias: [], almoco: ['12:00', '13:00'], cor: '' };
const prof = (a, id) => a.db.obter('profissionais', id) || SEM_PROF;
const serv = (a, id) => a.db.obter('servicos', id);
const cli = (a, id) => a.db.obter('clientes', id);
const fimDe = (ag) => hhmm(minutos(ag.ini) + (ag.duracao || 30));
const nomesServ = (a, ag) => (ag.servicos || []).map((id) => serv(a, id)?.nome).filter(Boolean).join(' + ');
const ags = (a) => a.db.lista('agendamentos');
const doDia = (a, data) => ags(a).filter((x) => x.data === data);
const ativos = (x) => !['cancelado', 'faltou'].includes(x.status);
const fechadas = (a) => a.db.lista('comandas').filter((k) => k.status === 'fechada');
const totalK = (k) => soma(k.itens, (x) => x.qtd * x.preco) - (k.desconto || 0);
const faturamento = (a, filtro) => soma(fechadas(a).filter(filtro), totalK);
const trabalha = (p, data) => p.dias.includes(paraData(data).getDay());
function livre(a, profId, data, ini, dur, ignorar = null) {
  const p = prof(a, profId); if (!p || !trabalha(p, data)) return 'não trabalha neste dia';
  const i = minutos(ini), f = i + dur;
  if (i < minutos(p.ini) || f > minutos(p.fim)) return 'fora do horário de trabalho';
  if (p.almoco && i < minutos(p.almoco[1]) && f > minutos(p.almoco[0])) return 'horário de almoço';
  const choque = doDia(a, data).find((x) => x.id !== ignorar && x.profissional === profId && ativos(x) && minutos(x.ini) < f && minutos(fimDe(x)) > i);
  return choque ? `conflita com ${cli(a, choque.cliente)?.nome} às ${choque.ini}` : '';
}
function horariosLivres(a, profId, data, dur) {
  const p = prof(a, profId); if (!p || !trabalha(p, data)) return [];
  const out = [], agora = data === hoje() ? new Date().getHours() * 60 + new Date().getMinutes() + 30 : 0;
  for (let m = minutos(p.ini); m + dur <= minutos(p.fim); m += 30) if (m >= agora && !livre(a, profId, data, hhmm(m), dur)) out.push(hhmm(m));
  return out;
}
const historicoCli = (a, id) => ags(a).filter((x) => x.cliente === id).sort((x, y) => `${y.data}${y.ini}`.localeCompare(`${x.data}${x.ini}`));
function resumoCli(a, id) {
  const h = historicoCli(a, id), feitos = h.filter((x) => x.status === 'concluido'), gasto = soma(fechadas(a).filter((k) => k.cliente === id), totalK);
  const ultima = feitos[0]?.data, prox = h.filter((x) => x.data >= hoje() && ['agendado', 'confirmado'].includes(x.status)).sort((x, y) => `${x.data}${x.ini}`.localeCompare(`${y.data}${y.ini}`))[0];
  const datas = feitos.map((x) => x.data).sort(); const freq = datas.length > 1 ? Math.round(diasEntre(datas[0], datas.at(-1)) / (datas.length - 1)) : null;
  return { visitas: feitos.length, gasto, ticket: feitos.length ? gasto / feitos.length : 0, ultima, prox, freq, faltas: h.filter((x) => x.status === 'faltou').length };
}
const profsDoServ = (a, s) => a.db.lista('profissionais').filter((p) => !s.profissional || p.id === s.profissional || (s.categoria === 'Unhas' && p.id === 'p1'));
const fidel = (a) => ({ a_cada: 10, premio: 'um serviço de até R$ 60', ...(a.db.cfg.fidelidade || {}) });
const selos = (a, c) => { const n = fechadas(a).filter((k) => k.cliente === c.id).length - (c.resgates || 0) * fidel(a).a_cada; return Math.max(0, n); };
const esperaPara = (a, x) => a.db.lista('espera').filter((e) => !e.atendida && (x.servicos || []).includes(e.servico));
const aniversario = (c, dias = 7) => { if (!c.nascimento) return false; for (let i = 0; i < dias; i++) if (diaMais(i).slice(5) === c.nascimento.slice(5)) return i + 1; return false; };
const etStatus = (s) => { const [n, , t] = STATUS[s] || STATUS.agendado; return et(n, t); };
const msgConfirma = (a, ag) => { const c = cli(a, ag.cliente); return `Olá, ${c.nome.split(' ')[0]}! Passando para confirmar seu horário no ${a.empresa}: ${DIAS_L[paraData(ag.data).getDay()]}, ${dataBR(ag.data)}, às ${ag.ini}, com ${prof(a, ag.profissional)?.nome.split(' ')[0]} (${nomesServ(a, ag)}). Responda SIM para confirmar ou nos avise se precisar remarcar.`; };

// ---------------------------------------------------------------- coleções (formulários de cadastro)
const colecoes = {
  clientes: {
    singular: 'cliente', genero: 'f', plural: 'clientes',
    campos: [
      { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true },
      { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel', obrigatorio: true, dica: '(11) 90000-0000' },
      { nome: 'email', rotulo: 'E-mail', tipo: 'email' },
      { nome: 'nascimento', rotulo: 'Nascimento', tipo: 'data' },
      { nome: 'origem', rotulo: 'Como conheceu', tipo: 'selecao', opcoes: ['Instagram', 'Indicação', 'Google', 'Passou na frente', 'Outro'] },
      { nome: 'alergias', rotulo: 'Alergias e restrições', tipo: 'texto-longo', dica: 'Ex.: alergia a amônia, pele sensível…' },
      { nome: 'preferencias', rotulo: 'Preferências', tipo: 'texto-longo', dica: 'Ex.: prefere fim da tarde, café sem açúcar…' },
    ],
    antesDeSalvar: (d, a, antes) => ({ ...d, criado: antes?.criado || hoje(), tags: antes?.tags || [] }),
  },
  servicos: { singular: 'serviço', plural: 'serviços', campos: (a) => [
    { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'categoria', rotulo: 'Categoria', tipo: 'selecao', opcoes: ['Cabelo', 'Unhas', 'Estética', 'Corporal', 'Barbearia'], obrigatorio: true },
    { nome: 'profissional', rotulo: 'Profissional principal', tipo: 'relacao', colecao: 'profissionais' }, { nome: 'duracao', rotulo: 'Duração (min)', tipo: 'numero', obrigatorio: true, passo: 5, padrao: 60 }, { nome: 'preco', rotulo: 'Preço', tipo: 'moeda', obrigatorio: true }] },
  produtos: { singular: 'produto', plural: 'produtos', campos: [
    { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'marca', rotulo: 'Marca', tipo: 'texto' }, { nome: 'preco', rotulo: 'Preço de venda', tipo: 'moeda', obrigatorio: true },
    { nome: 'custo', rotulo: 'Custo', tipo: 'moeda' }, { nome: 'estoque', rotulo: 'Estoque', tipo: 'numero', padrao: 0 }, { nome: 'minimo', rotulo: 'Estoque mínimo', tipo: 'numero', padrao: 2 }] },
  profissionais: { singular: 'profissional', plural: 'profissionais', campos: [
    { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true }, { nome: 'funcao', rotulo: 'Função', tipo: 'texto' }, { nome: 'comissao', rotulo: 'Comissão (%)', tipo: 'porcentagem', padrao: 40 },
    { nome: 'ini', rotulo: 'Começa às', tipo: 'hora', padrao: '09:00' }, { nome: 'fim', rotulo: 'Termina às', tipo: 'hora', padrao: '19:00' }, { nome: 'dias', rotulo: 'Dias de trabalho', tipo: 'dias', padrao: [1, 2, 3, 4, 5, 6], ajuda: 'Nos outros dias a agenda mostra folga.' }, { nome: 'cor', rotulo: 'Cor na agenda', tipo: 'selecao', opcoes: [['#db2777', 'Rosa'], ['#8b5cf6', 'Roxo'], ['#0891b2', 'Azul-petróleo'], ['#ea580c', 'Laranja'], ['#16a34a', 'Verde'], ['#2563eb', 'Azul']] }],
    antesDeSalvar: (d, a, antes) => ({ ...d, dias: Array.isArray(d.dias) && d.dias.length ? d.dias : antes?.dias || [1, 2, 3, 4, 5, 6], almoco: antes?.almoco || ['12:00', '13:00'] }) },
  pacotes: { singular: 'pacote', plural: 'pacotes', campos: [
    { nome: 'cliente', rotulo: 'Cliente', tipo: 'relacao', colecao: 'clientes', obrigatorio: true }, { nome: 'servico', rotulo: 'Serviço', tipo: 'relacao', colecao: 'servicos', obrigatorio: true },
    { nome: 'sessoes', rotulo: 'Sessões', tipo: 'numero', obrigatorio: true, padrao: 5, min: 1 }, { nome: 'valor', rotulo: 'Valor do pacote', tipo: 'moeda', obrigatorio: true }, { nome: 'validade', rotulo: 'Validade', tipo: 'data', padrao: () => diaMais(90) }],
    antesDeSalvar: (d, a, antes) => ({ ...d, usadas: antes?.usadas || 0, compra: antes?.compra || hoje() }) },
};

// ---------------------------------------------------------------- agendar (formulário próprio)
async function agendar(a, inicial = {}) {
  if (!a.db.lista('profissionais').length) { avisar('Cadastre um profissional antes de agendar.', { tipo: 'erro' }); if (await editar(a, 'profissionais')) a.render(); return; }
  const ag = inicial.id ? a.db.obter('agendamentos', inicial.id) : null;
  const v = { cliente: '', profissional: a.db.lista('profissionais')[0]?.id || '', data: hoje(), ini: '10:00', servicos: [], origem: 'balcao', obs: '', ...(ag || {}), ...inicial };
  const ps = a.db.lista('profissionais'), ss = a.db.lista('servicos'), cs = [...a.db.lista('clientes')].sort((x, y) => x.nome.localeCompare(y.nome));
  const corpo = `<form class="form-grade" onsubmit="return false" data-ag>
    <label class="campo largo">Cliente <span class="er-tx">*</span><div class="flex"><select name="cliente" required class="cresce"><option value="">Selecione…</option>${cs.map((c) => `<option value="${c.id}" ${c.id === v.cliente ? 'selected' : ''}>${esc(c.nome)} · ${esc(c.telefone)}</option>`).join('')}</select><button type="button" class="btn" data-nova-cli>${ic('user-plus')}Nova</button></div></label>
    <div class="campo largo" data-nova-box hidden><div class="form-grade" style="padding:10px;border:1px dashed var(--borda-2);border-radius:8px"><label class="campo">Nome da nova cliente<input name="nc_nome"></label><label class="campo">WhatsApp<input name="nc_tel" type="tel"></label></div></div>
    <label class="campo">Profissional<select name="profissional">${ps.map((p) => `<option value="${p.id}" ${p.id === v.profissional ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></label>
    <label class="campo">Origem<select name="origem">${Object.entries(ORIGENS).map(([k, n]) => `<option value="${k}" ${k === v.origem ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
    <div class="campo largo">Serviços <span class="er-tx">*</span><div data-servs style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;max-height:210px;overflow:auto;padding:2px"></div></div>
    <label class="campo">Data<input type="date" name="data" value="${v.data}" required></label>
    <label class="campo">Horário<select name="ini" data-horas></select></label>
    <label class="campo largo">Observação<input name="obs" value="${esc(v.obs || '')}" placeholder="Ex.: trazer foto da referência"></label>
    <div class="campo largo"><div class="dica" data-resumo>${ic('info')}<span></span></div></div></form>`;
  let estado = { servicos: [...v.servicos] };
  const r = await modal({ titulo: ag ? 'Editar agendamento' : 'Novo agendamento', largura: 640, corpo,
    aoAbrir: (f) => {
      const form = f.querySelector('[data-ag]'), $ = (n) => form.querySelector(`[name="${n}"]`);
      f.querySelector('[data-nova-cli]').onclick = () => { const b = f.querySelector('[data-nova-box]'); b.hidden = !b.hidden; $('cliente').required = b.hidden; if (!b.hidden) $('nc_nome').focus(); };
      const desenha = () => {
        const pid = $('profissional').value;
        const lista = [...ss].sort((x, y) => (x.profissional === pid ? 0 : 1) - (y.profissional === pid ? 0 : 1) || x.categoria.localeCompare(y.categoria));
        form.querySelector('[data-servs]').innerHTML = lista.map((s) => `<label class="flex" style="gap:8px;padding:7px 9px;border:1px solid var(--borda);border-radius:7px;font-weight:400;color:var(--tx);cursor:pointer;${s.profissional !== pid ? 'opacity:.55' : ''}"><input type="checkbox" value="${s.id}" ${estado.servicos.includes(s.id) ? 'checked' : ''}><span class="cresce corta">${esc(s.nome)}</span><span class="mute num" style="font-size:12px">${s.duracao}min · ${moedaC(s.preco)}</span></label>`).join('');
        horas();
      };
      const horas = () => {
        const dur = soma(estado.servicos, (id) => serv(a, id)?.duracao || 0) || 30, pid = $('profissional').value, data = $('data').value;
        const livres = horariosLivres(a, pid, data, dur); const atual = ag && ag.data === data && ag.profissional === pid ? ag.ini : null;
        const ops = [...new Set([...(atual ? [atual] : []), ...livres])].sort();
        const sel = $('ini'); const antes = sel.value || v.ini;
        sel.innerHTML = ops.length ? ops.map((h) => `<option ${h === antes ? 'selected' : ''}>${h}</option>`).join('') : '<option value="">Sem horário livre</option>';
        const p = prof(a, pid), tot = soma(estado.servicos, (id) => serv(a, id)?.preco || 0);
        form.querySelector('[data-resumo] span').innerHTML = !trabalha(p, data) ? `${esc(p.nome.split(' ')[0])} não atende ${DIAS_L[paraData(data).getDay()]}.` : estado.servicos.length ? `<b>${dur} min</b> · <b>${moeda(tot)}</b> · ${livres.length} horários livres com ${esc(p.nome.split(' ')[0])} neste dia` : 'Escolha os serviços para ver os horários livres.';
      };
      form.addEventListener('change', (e) => { if (e.target.matches('[data-servs] input')) { estado.servicos = [...form.querySelectorAll('[data-servs] input:checked')].map((x) => x.value); horas(); } if (['profissional'].includes(e.target.name)) desenha(); if (e.target.name === 'data') horas(); });
      desenha();
    },
    botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: ag ? 'Salvar' : 'Agendar', classe: 'pri', acao: (f) => {
      const form = f.querySelector('[data-ag]'); const d = Object.fromEntries(new FormData(form));
      if (!f.querySelector('[data-nova-box]').hidden) { if (!d.nc_nome?.trim()) { avisar('Informe o nome da nova cliente', { tipo: 'erro' }); return false; } const c = a.db.salvar('clientes', { nome: d.nc_nome.trim(), telefone: d.nc_tel || '', criado: hoje(), tags: [], origem: 'Outro' }); d.cliente = c.id; }
      if (!d.cliente) { avisar('Escolha a cliente', { tipo: 'erro' }); return false; }
      if (!estado.servicos.length) { avisar('Escolha pelo menos um serviço', { tipo: 'erro' }); return false; }
      if (!d.ini) { avisar('Sem horário livre neste dia. Tente outra data ou profissional.', { tipo: 'erro' }); return false; }
      return { cliente: d.cliente, profissional: d.profissional, data: d.data, ini: d.ini, origem: d.origem, obs: d.obs, servicos: estado.servicos };
    } }] });
  if (!r) return null;
  const dur = soma(r.servicos, (id) => serv(a, id).duracao), valor = soma(r.servicos, (id) => serv(a, id).preco);
  const choque = livre(a, r.profissional, r.data, r.ini, dur, ag?.id);
  if (choque && !(await confirmar(`Atenção: ${choque}. Agendar mesmo assim (encaixe)?`, { rotulo: 'Agendar encaixe' }))) return null;
  const salvo = a.db.salvar('agendamentos', { ...(ag ? { id: ag.id } : { status: 'agendado', criado: hoje() }), ...r, duracao: dur, valor });
  a.db.registrar(`agendamentos:${salvo.id}`, ag ? `Remarcado para ${dataCurta(r.data)}, ${r.ini}` : `Agendado (${ORIGENS[r.origem]})`, { icone: 'calendar-plus' });
  avisar(ag ? 'Agendamento atualizado' : `${cli(a, r.cliente).nome.split(' ')[0]} agendada para ${dataCurta(r.data)}, ${r.ini}`);
  a.render(); return salvo;
}

// ---------------------------------------------------------------- páginas
const semProf = (a) => vazio('identification-card', 'Cadastre a sua equipe', 'Adicione quem atende no salão para a agenda ganhar uma coluna por profissional.', `<button type="button" class="btn pri" data-acao="novoProf">${ic('plus')}Adicionar profissional</button>`);
function agenda(a) {
  const st = a.estado.agenda ||= { data: hoje(), modo: 'dia' };
  const ps = a.db.lista('profissionais'), lista = doDia(a, st.data);
  if (!ps.length) return semProf(a);
  a.cals.agenda = {
    aoClicar: (id) => a.abrir('agendamento', id),
    aoMover: (id, col, hora) => {
      const ag = a.db.obter('agendamentos', id);
      const [pid, data] = st.modo === 'dia' ? [col, st.data] : [ag.profissional, col];
      const choque = livre(a, pid, data, hora, ag.duracao, id);
      a.db.salvar('agendamentos', { id, profissional: pid, data, ini: hora });
      a.db.registrar(`agendamentos:${id}`, `Remarcado para ${dataCurta(data)}, ${hora} com ${prof(a, pid).nome.split(' ')[0]}`, { icone: 'arrows-left-right' });
      avisar(`${cli(a, ag.cliente).nome.split(' ')[0]} → ${hora}${pid !== ag.profissional ? ` com ${prof(a, pid).nome.split(' ')[0]}` : ''}${choque ? ` (atenção: ${choque})` : ''}`, { tipo: choque ? 'erro' : 'ok', desfazer: () => { a.db.salvar('agendamentos', { id, profissional: ag.profissional, data: ag.data, ini: ag.ini }); a.render(); } });
      a.render();
    },
    aoClicarVazio: (col, hora) => agendar(a, st.modo === 'dia' ? { profissional: col, data: st.data, ini: hora } : { profissional: st.prof || ps[0].id, data: col, ini: hora }),
  };
  const agoraH = new Date().toTimeString().slice(0, 5);
  let grade;
  if (st.modo === 'dia') {
    grade = calGrade({ id: 'agenda', inicio: ABRE, fim: FECHA, hh: 64, larguraCol: 190, agora: st.data === hoje() ? { col: '*', hora: agoraH } : null,
      colunas: ps.map((p) => ({ id: p.id, rot: p.nome, sub: trabalha(p, st.data) ? `${p.funcao} · ${lista.filter((x) => x.profissional === p.id && ativos(x)).length} atend.` : 'folga', avatar: `<span class="av" style="background:${corSegura(p.cor)}">${esc(p.nome.split(' ').map((x) => x[0]).join(''))}</span>`,
        fora: trabalha(p, st.data) ? [[`${String(ABRE).padStart(2, '0')}:00`, p.ini], [p.almoco[0], p.almoco[1]], [p.fim, `${FECHA}:00`]] : [[`${String(ABRE).padStart(2, '0')}:00`, `${FECHA}:00`]] })),
      eventos: lista.filter((x) => x.status !== 'cancelado').map((x) => ({ id: x.id, col: x.profissional, ini: x.ini, fim: fimDe(x), titulo: cli(a, x.cliente)?.nome || '—', sub: nomesServ(a, x), sub2: STATUS[x.status][0], cor: STATUS[x.status][1], cls: x.status === 'faltou' ? 'cancelado' : x.status === 'concluido' ? 'feito' : '' })) });
    if (st.data === hoje()) grade = grade.replace(/<div class="cal-dia" data-cal-col="([^"]+)" style="height:(\d+)px">/g, (m) => `${m}<div class="agora" style="top:${((minutos(agoraH) - ABRE * 60) / 60) * 64}px"></div>`);
  } else {
    const pid = st.prof || ps[0].id, p = prof(a, pid);
    const seg = diaMais(-((paraData(st.data).getDay() + 6) % 7), st.data), dias = Array.from({ length: 7 }, (_, i) => diaMais(i, seg));
    grade = calGrade({ id: 'agenda', inicio: ABRE, fim: FECHA, hh: 56, larguraCol: 132, agora: { col: hoje(), hora: agoraH },
      colunas: dias.map((d) => ({ id: d, rot: `${DIAS[paraData(d).getDay()]} ${Number(d.slice(8))}`, hoje: d === hoje(), sub: trabalha(p, d) ? '' : 'folga', fora: trabalha(p, d) ? [[`${String(ABRE).padStart(2, '0')}:00`, p.ini], [p.almoco[0], p.almoco[1]], [p.fim, `${FECHA}:00`]] : [[`${String(ABRE).padStart(2, '0')}:00`, `${FECHA}:00`]] })),
      eventos: ags(a).filter((x) => x.profissional === pid && dias.includes(x.data) && x.status !== 'cancelado').map((x) => ({ id: x.id, col: x.data, ini: x.ini, fim: fimDe(x), titulo: cli(a, x.cliente)?.nome || '—', sub: nomesServ(a, x), cor: STATUS[x.status][1], cls: x.status === 'faltou' ? 'cancelado' : x.status === 'concluido' ? 'feito' : '' })) });
  }
  const at = lista.filter(ativos), prev = soma(at, (x) => x.valor), feito = faturamento(a, (k) => k.data === st.data);
  const cap = soma(ps.filter((p) => trabalha(p, st.data)), (p) => minutos(p.fim) - minutos(p.ini) - 60), ocup = (soma(at, (x) => x.duracao) / (cap || 1)) * 100;
  const d = paraData(st.data);
  return `<div class="cal"><div class="cal-barra">
      <div class="grupo-btn"><button type="button" data-acao="diaAg" data-d="-1" aria-label="Anterior">${ic('caret-left', 'p')}</button><button type="button" data-acao="diaAg" data-d="0">Hoje</button><button type="button" data-acao="diaAg" data-d="1" aria-label="Próximo">${ic('caret-right', 'p')}</button></div>
      <h3>${st.modo === 'dia' ? `${DIAS_L[d.getDay()]}, ${d.getDate()} de ${nomeMes(st.data.slice(0, 7), true)}` : `Semana de ${dataCurta(diaMais(-((d.getDay() + 6) % 7), st.data))}`}</h3>
      <input type="date" value="${st.data}" data-mudar="dataAg" style="width:150px;height:28px" aria-label="Escolher data">
      <div class="flex" style="margin-left:auto;gap:14px;flex-wrap:wrap">
        ${st.modo === 'dia' ? `<span class="mute" style="font-size:12.5px"><b class="num" style="color:var(--tx)">${at.length}</b> atendimentos · <b class="num" style="color:var(--tx)">${moedaC(prev)}</b> previsto${feito ? ` · <b class="ok-tx num">${moedaC(feito)}</b> recebido` : ''} · ocupação <b style="color:var(--tx)">${pct(ocup)}</b></span>` : `<select data-mudar="profAg" style="width:auto;height:28px">${ps.map((p) => `<option value="${p.id}" ${p.id === (st.prof || ps[0].id) ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>`}
        <div class="grupo-btn"><button type="button" data-acao="modoAg" data-m="dia" aria-pressed="${st.modo === 'dia'}">Dia</button><button type="button" data-acao="modoAg" data-m="semana" aria-pressed="${st.modo === 'semana'}">Semana</button></div>
      </div></div>${grade}
      <div class="flex mute nao-imprime" style="font-size:12px;gap:14px;padding:9px 12px;border-top:1px solid var(--borda);flex-wrap:wrap">${Object.entries(STATUS).filter(([k]) => k !== 'cancelado').map(([, [n, c]]) => `<span class="flex" style="gap:5px"><i style="width:10px;height:10px;border-radius:3px;background:${c}"></i>${n}</span>`).join('')}<span style="margin-left:auto">Arraste para remarcar · clique duas vezes num horário vazio para agendar</span></div></div>`;
}

function painel(a) {
  const hojeL = doDia(a, hoje()), at = hojeL.filter(ativos), ym = hoje().slice(0, 7);
  const fatHoje = faturamento(a, (k) => k.data === hoje()), fatMes = faturamento(a, (k) => k.data.startsWith(ym)), fatAnt = faturamento(a, (k) => k.data.startsWith(mesMais(-1)) && Number(k.data.slice(8)) <= new Date().getDate());
  const ksMes = fechadas(a).filter((k) => k.data.startsWith(ym));
  const dias30 = Array.from({ length: 30 }, (_, i) => diaMais(i - 29));
  const semana = Array.from({ length: 7 }, (_, i) => diaMais(i - 6));
  const agsSem = ags(a).filter((x) => semana.includes(x.data));
  const faltas = agsSem.filter((x) => x.status === 'faltou').length, base = agsSem.filter((x) => ['concluido', 'faltou'].includes(x.status)).length;
  const prox = hojeL.filter((x) => ['agendado', 'confirmado', 'chegou', 'atendimento'].includes(x.status)).sort((x, y) => x.ini.localeCompare(y.ini));
  const amanhaSemConf = doDia(a, diaMais(1)).filter((x) => x.status === 'agendado');
  const aniver = a.db.lista('clientes').filter((c) => aniversario(c)).sort((x, y) => aniversario(x) - aniversario(y));
  const sumidas = a.db.lista('clientes').map((c) => ({ c, r: resumoCli(a, c.id) })).filter(({ r }) => r.visitas >= 2 && r.ultima && -diasAte(r.ultima) > 45 && !r.prox).sort((x, y) => y.r.gasto - x.r.gasto);
  const baixo = a.db.lista('produtos').filter((p) => p.estoque <= p.minimo);
  return `${amanhaSemConf.length ? `<div class="alerta-linha al">${ic('whatsapp-logo')}${amanhaSemConf.length} clientes de amanhã ainda não confirmaram.<a href="#/lembretes">Enviar confirmações</a></div>` : ''}
    ${kpis([
      { rot: 'Faturamento hoje', icone: 'cash-register', val: moeda(fatHoje), nota: `previsto ${moedaC(soma(at, (x) => x.valor))}` },
      { rot: 'Faturamento do mês', icone: 'coins', val: moeda(fatMes), var: fatAnt ? ((fatMes - fatAnt) / fatAnt) * 100 : null, nota: 'vs mesmo período do mês passado', spark: dias30.map((d) => faturamento(a, (k) => k.data === d)) },
      { rot: 'Ticket médio', icone: 'receipt', val: moeda(ksMes.length ? fatMes / ksMes.length : 0), nota: `${ksMes.length} comandas no mês` },
      { rot: 'Faltas (7 dias)', icone: 'user-focus', val: pct((faltas / (base || 1)) * 100, 1), alerta: faltas / (base || 1) > 0.08, nota: `${faltas} de ${base} atendimentos` },
    ])}
    <div class="grade g21">
      <div class="cartao"><div class="cartao-cab"><div><h3>Próximos atendimentos de hoje</h3><div class="sub">${at.length} no dia · clique para abrir</div></div><a class="btn peq" href="#/agenda">Abrir agenda</a></div>
        ${prox.length ? `<ul class="lista">${prox.slice(0, 8).map((x) => { const c = cli(a, x.cliente), p = prof(a, x.profissional); return `<li class="clicavel" data-abrir="agendamento:${x.id}"><b class="num" style="width:44px">${x.ini}</b>${av(c.nome)}<div class="cresce"><div class="t corta">${esc(c.nome)}${c.alergias ? ` <span title="${esc(c.alergias)}" class="er-tx">${ic('warning', 'p')}</span>` : ''}</div><div class="s corta">${esc(nomesServ(a, x))} · ${esc(p.nome.split(' ')[0])}</div></div><div class="dir">${etStatus(x.status)}</div></li>`; }).join('')}</ul>` : vazio('coffee', 'Nenhum atendimento pendente hoje')}</div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Ocupação da semana</h3><div class="sub">Horas agendadas ÷ horas disponíveis</div></div></div><div class="cartao-corpo">
        ${barrasH(a.db.lista('profissionais').map((p) => { const dias = Array.from({ length: 7 }, (_, i) => diaMais(i - 3)).filter((d) => trabalha(p, d)); const cap = dias.length * (minutos(p.fim) - minutos(p.ini) - 60); const uso = soma(ags(a).filter((x) => x.profissional === p.id && dias.includes(x.data) && ativos(x)), (x) => x.duracao); return { html: `<span class="flex">${`<span class="av p" style="background:${corSegura(p.cor)}">${esc(p.nome[0])}</span>`}${esc(p.nome)}</span>`, v: Math.round((uso / (cap || 1)) * 100) }; }), { fmt: (v) => `${v}%` })}</div></div>
    </div>
    <div class="grade g3">
      <div class="cartao"><div class="cartao-cab"><div><h3>Aniversariantes</h3><div class="sub">Próximos 7 dias</div></div></div>${aniver.length ? `<ul class="lista">${aniver.slice(0, 5).map((c) => { const dd = aniversario(c) - 1; return `<li>${av(c.nome)}<div class="cresce"><div class="t corta">${esc(c.nome)}</div><div class="s">${dd === 0 ? 'hoje' : dd === 1 ? 'amanhã' : `em ${dd} dias`} · ${esc(dataCurta(diaMais(dd)))}</div></div><a class="btn peq" target="_blank" rel="noopener" href="${telLink(c.telefone)}?text=${encodeURIComponent(`Feliz aniversário, ${c.nome.split(' ')[0]}! 🎉 Para comemorar, você ganhou 15% de desconto em qualquer serviço este mês no ${a.empresa}.`)}">${ic('whatsapp-logo')}Parabéns</a></li>`; }).join('')}</ul>` : vazio('cake', 'Ninguém fazendo aniversário')}</div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Clientes para reativar</h3><div class="sub">Vinham sempre e sumiram há +45 dias</div></div></div>${sumidas.length ? `<ul class="lista">${sumidas.slice(0, 5).map(({ c, r }) => `<li class="clicavel" data-abrir="cliente:${c.id}">${av(c.nome)}<div class="cresce"><div class="t corta">${esc(c.nome)}</div><div class="s">última visita há ${-diasAte(r.ultima)} dias · ${r.visitas} visitas</div></div><b class="num" style="font-size:12.5px">${moedaC(r.gasto)}</b></li>`).join('')}</ul>` : vazio('heart', 'Nenhuma cliente sumida')}</div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Estoque baixo</h3><div class="sub">Produtos de revenda</div></div><a class="btn peq" href="#/produtos">Produtos</a></div>${baixo.length ? `<ul class="lista">${baixo.map((p) => `<li><span class="av" style="background:var(--al)">${ic('package', 'p')}</span><div class="cresce"><div class="t corta">${esc(p.nome)}</div><div class="s">${esc(p.marca)}</div></div><span class="et er">${p.estoque} un.</span></li>`).join('')}</ul>` : vazio('package', 'Estoque em dia')}</div>
    </div>`;
}

function caixa(a, [id]) {
  if (id) return pdv(a, id);
  const hojeL = doDia(a, hoje());
  const abertas = hojeL.filter((x) => ['chegou', 'atendimento', 'concluido'].includes(x.status) && !x.comanda).sort((x, y) => x.ini.localeCompare(y.ini));
  const ksHoje = fechadas(a).filter((k) => k.data === hoje());
  const porMet = Object.keys(METODOS).map((m) => ({ m, v: soma(ksHoje.flatMap((k) => k.pagamentos).filter((p) => p.metodo === m), (p) => p.valor) }));
  return `<div class="grade g21">
    <div class="col" style="gap:16px">
      <div class="cartao"><div class="cartao-cab"><div><h3>Comandas abertas</h3><div class="sub">Clientes que chegaram ou estão em atendimento</div></div><button type="button" class="btn pri" data-acao="vendaAvulsa">${ic('shopping-cart')}Venda avulsa</button></div>
        ${abertas.length ? `<ul class="lista">${abertas.map((x) => { const c = cli(a, x.cliente); return `<li class="clicavel" data-acao="irPdv" data-id="${x.id}"><b class="num" style="width:44px">${x.ini}</b>${av(c.nome)}<div class="cresce"><div class="t">${esc(c.nome)}</div><div class="s corta">${esc(nomesServ(a, x))} · ${esc(prof(a, x.profissional).nome.split(' ')[0])}</div></div>${etStatus(x.status)}<b class="num" style="min-width:86px;text-align:right">${moeda(x.valor)}</b><span class="btn peq">Fechar conta${ic('arrow-right', 'p')}</span></li>`; }).join('')}</ul>` : vazio('receipt', 'Nenhuma comanda aberta', 'Quando a cliente chegar, marque "Chegou" na agenda e a comanda aparece aqui.')}</div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Fechadas hoje</h3><div class="sub">${ksHoje.length} comandas</div></div></div>
        ${ksHoje.length ? `<div class="tabela-caixa"><table class="tabela"><thead><tr><th>Nº</th><th>Cliente</th><th class="oc">Itens</th><th>Pagamento</th><th class="n">Total</th></tr></thead><tbody>${ksHoje.sort((x, y) => y.fechada_em.localeCompare(x.fechada_em)).map((k) => `<tr class="clicavel" data-abrir="comanda:${k.id}"><td class="mono">#${k.numero}</td><td>${esc(cli(a, k.cliente)?.nome || 'Venda avulsa')}</td><td class="oc mute-2 corta" style="max-width:240px">${esc(k.itens.map((i) => i.nome).join(', '))}</td><td>${k.pagamentos.map((p) => et(METODOS[p.metodo][0], '', 'sem-ponto')).join(' ')}</td><td class="n"><b>${moeda(totalK(k))}</b></td></tr>`).join('')}</tbody></table></div>` : vazio('receipt', 'Nenhuma comanda fechada hoje')}</div>
    </div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Caixa de hoje</h3><div class="sub">${esc(dataCurta(hoje()))}</div></div><button type="button" class="btn peq" data-acao="fecharCaixa">${ic('printer')}Fechamento</button></div><div class="cartao-corpo col" style="gap:12px">
      <div class="total-grande">${moeda(soma(ksHoje, totalK))}</div>
      ${porMet.map(({ m, v }) => `<div class="entre"><span class="flex mute-2">${ic(METODOS[m][1])}${METODOS[m][0]}</span><b class="num">${moeda(v)}</b></div>`).join('')}
      <div class="dica">${ic('info')}<span>Comissões são calculadas sobre os serviços de cada comanda fechada.</span></div></div></div></div>`;
}

function pdv(a, id) {
  const st = a.estado.pdv;
  if (!st || st.id !== id) {
    const ag = a.db.obter('agendamentos', id);
    a.estado.pdv = { id, cliente: ag?.cliente || '', itens: ag ? ag.servicos.map((sid) => { const s = serv(a, sid); return { tipo: 'servico', ref: sid, nome: s.nome, qtd: 1, preco: s.preco, profissional: ag.profissional }; }) : [], desconto: 0, pagamentos: [], aba: 'servicos' };
  }
  const p = a.estado.pdv, c = cli(a, p.cliente), ag = a.db.obter('agendamentos', id);
  const sub = soma(p.itens, (x) => x.qtd * x.preco), total = Math.max(0, sub - (p.desconto || 0)), pago = soma(p.pagamentos, (x) => x.valor), falta = Math.round((total - pago) * 100) / 100;
  const pacotesCli = a.db.lista('pacotes').filter((k) => k.cliente === p.cliente && k.usadas < k.sessoes && k.validade >= hoje());
  const catalogo = p.aba === 'servicos' ? a.db.lista('servicos').map((s, i) => `<button type="button" class="prod-bt" data-acao="pdvAdd" data-t="servico" data-ref="${s.id}"><b>${esc(s.nome)}</b><span>${esc(s.categoria)} · ${s.duracao} min</span><span class="pr">${moeda(s.preco)}</span></button>`).join('')
    : a.db.lista('produtos').map((pr) => `<button type="button" class="prod-bt" data-acao="pdvAdd" data-t="produto" data-ref="${pr.id}" ${pr.estoque <= 0 ? 'disabled style="opacity:.5"' : ''}><b>${esc(pr.nome)}</b><span>${esc(pr.marca)} · ${pr.estoque} em estoque</span><span class="pr">${moeda(pr.preco)}</span></button>`).join('');
  return `<div class="entre"><a class="btn fant" href="#/caixa">${ic('arrow-left')}Voltar ao caixa</a>${ag ? `<span class="mute">Atendimento das ${ag.ini} com ${esc(prof(a, ag.profissional).nome)}</span>` : ''}</div>
    <div class="pdv">
      <div class="cartao"><div class="abas-pag" style="padding:0 12px"><button type="button" data-acao="pdvAba" data-a="servicos" aria-selected="${p.aba === 'servicos'}">${ic('scissors')}Serviços</button><button type="button" data-acao="pdvAba" data-a="produtos" aria-selected="${p.aba === 'produtos'}">${ic('package')}Produtos</button></div><div class="cartao-corpo"><div class="prod-grade">${catalogo}</div></div></div>
      <div class="cartao carrinho"><div class="cartao-cab"><div class="flex">${c ? av(c.nome) : `<span class="av" style="background:var(--tx-3)">${ic('user', 'p')}</span>`}<div><h3>${esc(c?.nome || 'Venda avulsa')}</h3><div class="sub">Comanda ${ag ? `do atendimento` : 'de balcão'}</div></div></div>
        ${c ? '' : `<select data-mudar="pdvCliente" style="width:auto;height:28px"><option value="">Identificar cliente…</option>${a.db.lista('clientes').map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join('')}</select>`}</div>
        ${c?.alergias ? `<div style="padding:8px 16px 0"><div class="alerta-linha" style="font-size:12.5px">${ic('warning')}${esc(c.alergias)}</div></div>` : ''}
        ${p.itens.length ? p.itens.map((x, i) => `<div class="item"><div class="corta"><div style="font-weight:500" class="corta">${esc(x.nome)}</div><div class="mute" style="font-size:12px">${x.tipo === 'servico' ? `${esc(prof(a, x.profissional)?.nome.split(' ')[0] || '')}${x.pacote ? ' · sessão do pacote' : ''}` : 'produto'} · ${moeda(x.preco)}</div></div><div class="qtd"><button type="button" data-acao="pdvQtd" data-i="${i}" data-d="-1" aria-label="Menos">−</button><span>${x.qtd}</span><button type="button" data-acao="pdvQtd" data-i="${i}" data-d="1" aria-label="Mais">+</button></div><b class="num" style="min-width:80px;text-align:right">${moeda(x.qtd * x.preco)}</b></div>`).join('') : `<div style="padding:16px">${vazio('shopping-cart', 'Comanda vazia', 'Toque nos serviços e produtos para adicionar.')}</div>`}
        ${pacotesCli.length ? `<div style="padding:10px 16px;border-top:1px solid var(--borda)">${pacotesCli.map((k) => `<button type="button" class="btn peq" data-acao="pdvPacote" data-k="${k.id}">${ic('ticket')}Usar sessão: ${esc(serv(a, k.servico)?.nome)} (${k.sessoes - k.usadas} restantes)</button>`).join(' ')}</div>` : ''}
        <div class="cartao-corpo col" style="gap:10px;border-top:1px solid var(--borda)">
          <div class="entre"><span class="mute-2">Subtotal</span><span class="num">${moeda(sub)}</span></div>
          <div class="entre"><span class="mute-2">Desconto</span><div class="prefixo" style="width:130px"><span>R$</span><input type="number" min="0" step="1" value="${p.desconto || 0}" data-mudar="pdvDesc" style="height:28px;text-align:right"></div></div>
          <div class="entre"><b>Total</b><span class="total-grande">${moeda(total)}</span></div>
          <div class="pagamentos">${Object.entries(METODOS).filter(([m]) => m !== 'pacote').map(([m, [n, i]]) => `<button type="button" data-acao="pdvPagar" data-m="${m}">${ic(i)}${n}</button>`).join('')}</div>
          ${p.pagamentos.length ? `<div class="col" style="gap:6px">${p.pagamentos.map((x, i) => `<div class="entre" style="font-size:13px"><span class="flex">${ic(METODOS[x.metodo][1])}${METODOS[x.metodo][0]}</span><span class="flex"><b class="num">${moeda(x.valor)}</b><button type="button" class="btn fant peq ic-so" data-acao="pdvTiraPag" data-i="${i}" aria-label="Remover">${ic('x')}</button></span></div>`).join('')}</div>` : ''}
          <div class="entre"><span class="${falta > 0 ? 'al-tx' : 'ok-tx'}" style="font-weight:600">${falta > 0 ? `Falta receber ${moeda(falta)}` : falta < 0 ? `Troco ${moeda(-falta)}` : 'Pagamento completo'}</span></div>
          <button type="button" class="btn pri ok" style="height:42px;font-size:14px" data-acao="pdvFechar" ${p.itens.length && falta <= 0 ? '' : 'disabled'}>${ic('check-circle')}Fechar comanda</button>
        </div></div></div>`;
}

function clientes(a) {
  return a.tab({
    id: 'clientes', colecao: 'clientes', singular: 'cliente', plural: 'clientes', ordem: 'nome', buscaDica: 'Buscar por nome ou telefone…',
    visoes: [{ id: 'todas', rot: 'Todas' }, { id: 'vip', rot: 'VIP', filtro: (c) => (c.tags || []).includes('VIP') }, { id: 'aniver', rot: 'Aniversariantes do mês', filtro: (c) => c.nascimento?.slice(5, 7) === hoje().slice(5, 7) }, { id: 'sumidas', rot: 'Sumidas +45 dias', filtro: (c) => { const r = resumoCli(a, c.id); return r.ultima && -diasAte(r.ultima) > 45 && !r.prox; } }, { id: 'novas', rot: 'Novas (30 dias)', filtro: (c) => c.criado && diasAte(c.criado) > -30 }],
    filtros: [{ k: 'origem', rot: 'Origem', opcoes: ['Instagram', 'Indicação', 'Google', 'Passou na frente', 'Outro'] }],
    textoBusca: (c) => `${c.nome} ${c.telefone} ${c.email}`,
    novo: { rot: 'Nova cliente', attrs: 'data-acao="novaCliente"' }, aoClicar: (id) => a.abrir('cliente', id),
    colunas: [
      { k: 'nome', rot: 'Cliente', render: (c) => `<span class="flex" style="gap:9px">${av(c.nome)}<span><span class="prim">${esc(c.nome)}</span>${(c.tags || []).map((t) => ` ${et(t, 'roxo', 'sem-ponto')}`).join('')}${c.alergias ? ` <span class="er-tx" title="${esc(c.alergias)}">${ic('warning', 'p')}</span>` : ''}<span class="sub">${esc(c.telefone)}</span></span></span>` },
      { k: 'visitas', rot: 'Visitas', n: true, valor: (c) => resumoCli(a, c.id).visitas, render: (c) => num(resumoCli(a, c.id).visitas) },
      { k: 'ultima', rot: 'Última visita', oc: true, valor: (c) => resumoCli(a, c.id).ultima || '', render: (c) => { const u = resumoCli(a, c.id).ultima; return u ? `<span class="${-diasAte(u) > 45 ? 'al-tx' : ''}">${relativo(u)}</span>` : '<span class="mute">—</span>'; } },
      { k: 'prox', rot: 'Próximo horário', oc: true, valor: (c) => resumoCli(a, c.id).prox?.data || 'z', render: (c) => { const p = resumoCli(a, c.id).prox; return p ? `${relativo(p.data)}, ${p.ini}` : '<span class="mute">—</span>'; } },
      { k: 'gasto', rot: 'Total gasto', n: true, valor: (c) => resumoCli(a, c.id).gasto, render: (c) => moeda(resumoCli(a, c.id).gasto) },
    ],
  });
}

function catalogoPag(a) {
  return a.tab({ id: 'servicos', colecao: 'servicos', singular: 'serviço', plural: 'serviços', ordem: 'categoria', novo: { rot: 'Novo serviço', attrs: 'data-acao="novoServico"' },
    filtros: [{ k: 'categoria', rot: 'Categoria', opcoes: ['Cabelo', 'Unhas', 'Estética', 'Corporal', 'Barbearia'] }, { k: 'profissional', rot: 'Profissional', opcoes: (aa) => aa.db.lista('profissionais').map((p) => [p.id, p.nome]) }],
    aoClicar: async (id) => { if (await editar(a, 'servicos', a.db.obter('servicos', id))) a.render(); },
    colunas: [{ k: 'nome', rot: 'Serviço', render: (s) => `<span class="prim">${esc(s.nome)}</span>` }, { k: 'categoria', rot: 'Categoria', render: (s) => et(s.categoria, '', 'sem-ponto') }, { k: 'profissional', rot: 'Profissional', oc: true, valor: (s) => prof(a, s.profissional)?.nome || '', render: (s) => esc(prof(a, s.profissional)?.nome || '—') },
      { k: 'duracao', rot: 'Duração', n: true, render: (s) => `${s.duracao} min` }, { k: 'preco', rot: 'Preço', n: true, render: (s) => moeda(s.preco) },
      { k: 'vendas', rot: 'Feitos (30 dias)', n: true, oc: true, valor: (s) => ags(a).filter((x) => x.status === 'concluido' && diasAte(x.data) > -30 && x.servicos.includes(s.id)).length, render: (s) => num(ags(a).filter((x) => x.status === 'concluido' && diasAte(x.data) > -30 && x.servicos.includes(s.id)).length) }] });
}
function produtosPag(a) {
  return a.tab({ id: 'produtos', colecao: 'produtos', singular: 'produto', plural: 'produtos', ordem: 'nome', novo: { rot: 'Novo produto', attrs: 'data-acao="novoProduto"' },
    visoes: [{ id: 'todos', rot: 'Todos' }, { id: 'baixo', rot: 'Estoque baixo', filtro: (p) => p.estoque <= p.minimo }],
    aoClicar: async (id) => { if (await editar(a, 'produtos', a.db.obter('produtos', id))) a.render(); },
    colunas: [{ k: 'nome', rot: 'Produto', render: (p) => `<span class="prim">${esc(p.nome)}</span><span class="sub">${esc(p.marca || '')}</span>` }, { k: 'preco', rot: 'Preço', n: true, render: (p) => moeda(p.preco) }, { k: 'custo', rot: 'Custo', n: true, oc: true, render: (p) => moeda(p.custo) },
      { k: 'margem', rot: 'Margem', n: true, oc: true, valor: (p) => (p.preco - p.custo) / (p.preco || 1), render: (p) => pct(((p.preco - (p.custo || 0)) / (p.preco || 1)) * 100) },
      { k: 'estoque', rot: 'Estoque', n: true, render: (p) => (p.estoque <= p.minimo ? et(`${p.estoque} un.`, 'er') : `${p.estoque} un.`) }] });
}
function pacotesPag(a) {
  return a.tab({ id: 'pacotes', colecao: 'pacotes', singular: 'pacote', plural: 'pacotes', ordem: 'validade', novo: { rot: 'Vender pacote', attrs: 'data-acao="novoPacote"' },
    visoes: [{ id: 'ativos', rot: 'Ativos', filtro: (k) => k.usadas < k.sessoes && k.validade >= hoje() }, { id: 'vencendo', rot: 'Vencendo em 30 dias', filtro: (k) => k.usadas < k.sessoes && diasAte(k.validade) >= 0 && diasAte(k.validade) <= 30 }, { id: 'encerrados', rot: 'Encerrados', filtro: (k) => k.usadas >= k.sessoes || k.validade < hoje() }],
    aoClicar: (id) => a.abrir('cliente', a.db.obter('pacotes', id).cliente, 'pacotes'),
    colunas: [{ k: 'cliente', rot: 'Cliente', valor: (k) => cli(a, k.cliente)?.nome, render: (k) => `<span class="flex">${av(cli(a, k.cliente)?.nome || '?', 'p')}<span class="prim">${esc(cli(a, k.cliente)?.nome || '—')}</span></span>` }, { k: 'servico', rot: 'Serviço', valor: (k) => serv(a, k.servico)?.nome, render: (k) => esc(serv(a, k.servico)?.nome || '—') },
      { k: 'uso', rot: 'Sessões', valor: (k) => k.usadas / k.sessoes, render: (k) => `<div style="min-width:130px"><div class="entre" style="font-size:12px"><span>${k.usadas} de ${k.sessoes}</span><span class="mute">${k.sessoes - k.usadas} restam</span></div>${prog((k.usadas / k.sessoes) * 100, k.usadas >= k.sessoes ? 'ok' : '')}</div>` },
      { k: 'valor', rot: 'Valor', n: true, oc: true, render: (k) => moeda(k.valor) }, { k: 'validade', rot: 'Validade', render: (k) => `<span class="${k.validade < hoje() ? 'er-tx' : diasAte(k.validade) <= 30 ? 'al-tx' : ''}">${dataCurta(k.validade)}</span>` }] });
}
function profissionaisPag(a) {
  if (!a.db.lista('profissionais').length) return semProf(a);
  return `<div class="grade g2">${a.db.lista('profissionais').map((p) => { const ym = hoje().slice(0, 7); const feitos = ags(a).filter((x) => x.profissional === p.id && x.status === 'concluido' && x.data.startsWith(ym)); const fat = soma(feitos, (x) => x.valor);
    return `<div class="cartao"><div class="cartao-cab"><div class="flex"><span class="av g" style="background:${corSegura(p.cor)}">${esc(p.nome.split(' ').map((x) => x[0]).join(''))}</span><div><h3>${esc(p.nome)}</h3><div class="sub">${esc(p.funcao)} · comissão ${p.comissao}%</div></div></div><button type="button" class="btn peq" data-acao="editarProf" data-id="${p.id}">${ic('pencil-simple')}Editar</button></div>
      <div class="cartao-corpo col" style="gap:12px"><div class="flex" style="gap:4px">${DIAS.map((d, i) => `<span class="et ${p.dias.includes(i) ? 'acc' : ''} sem-ponto" style="width:38px;justify-content:center">${d}</span>`).join('')}</div>
      <div class="mute-2" style="font-size:12.5px">${ic('clock', 'p')} ${p.ini}–${p.fim} · almoço ${p.almoco[0]}–${p.almoco[1]}</div>
      <div class="grade g3" style="gap:8px"><div><div class="mute" style="font-size:12px">Atendimentos no mês</div><b class="num" style="font-size:17px">${feitos.length}</b></div><div><div class="mute" style="font-size:12px">Produção</div><b class="num" style="font-size:17px">${moedaC(fat)}</b></div><div><div class="mute" style="font-size:12px">Comissão</div><b class="num ok-tx" style="font-size:17px">${moedaC((fat * p.comissao) / 100)}</b></div></div></div></div>`; }).join('')}</div>`;
}
function comissoes(a) {
  const st = a.estado.com ||= { mes: hoje().slice(0, 7) };
  const ks = fechadas(a).filter((k) => k.data.startsWith(st.mes));
  const linhasP = a.db.lista('profissionais').map((p) => { const its = ks.flatMap((k) => k.itens.filter((i) => i.profissional === p.id && i.tipo === 'servico' && !i.pacote)); const prodIts = ks.flatMap((k) => k.itens.filter((i) => i.profissional === p.id && i.tipo === 'produto')); const base = soma(its, (i) => i.qtd * i.preco), baseP = soma(prodIts, (i) => i.qtd * i.preco); return { p, n: its.length, base, com: (base * p.comissao) / 100, baseP, comP: baseP * 0.1 }; });
  const meses = [0, -1, -2, -3].map((m) => mesMais(m));
  return `<div class="entre"><select data-mudar="mesCom" style="width:auto">${meses.map((m) => `<option value="${m}" ${m === st.mes ? 'selected' : ''}>${esc(nomeMes(m, true))}</option>`).join('')}</select><button type="button" class="btn" data-acao="imprimirCom">${ic('printer')}Imprimir extrato</button></div>
    ${kpis([{ rot: 'Produção em serviços', icone: 'scissors', val: moeda(soma(linhasP, (l) => l.base)) }, { rot: 'Comissões a pagar', icone: 'hand-coins', val: moeda(soma(linhasP, (l) => l.com + l.comP)), nota: 'serviços + 10% dos produtos vendidos' }, { rot: 'Atendimentos', icone: 'calendar-check', val: num(soma(linhasP, (l) => l.n)) }])}
    <div class="cartao"><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Profissional</th><th class="n">Serviços</th><th class="n">Produção</th><th class="n">%</th><th class="n">Comissão serviços</th><th class="n oc">Venda de produtos</th><th class="n oc">Comissão produtos</th><th class="n">Total a pagar</th></tr></thead><tbody>
      ${linhasP.map((l) => `<tr><td><span class="flex"><span class="av p" style="background:${corSegura(l.p.cor)}">${esc(l.p.nome[0])}</span>${esc(l.p.nome)}</span></td><td class="n">${l.n}</td><td class="n">${moeda(l.base)}</td><td class="n">${l.p.comissao}%</td><td class="n">${moeda(l.com)}</td><td class="n oc">${moeda(l.baseP)}</td><td class="n oc">${moeda(l.comP)}</td><td class="n"><b>${moeda(l.com + l.comP)}</b></td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td><td class="n">${soma(linhasP, (l) => l.n)}</td><td class="n">${moeda(soma(linhasP, (l) => l.base))}</td><td></td><td class="n">${moeda(soma(linhasP, (l) => l.com))}</td><td class="n oc">${moeda(soma(linhasP, (l) => l.baseP))}</td><td class="n oc">${moeda(soma(linhasP, (l) => l.comP))}</td><td class="n">${moeda(soma(linhasP, (l) => l.com + l.comP))}</td></tr></tfoot></table></div></div>`;
}
function lembretes(a) {
  const d = diaMais(1), l = doDia(a, d).filter((x) => ['agendado', 'confirmado'].includes(x.status)).sort((x, y) => x.ini.localeCompare(y.ini));
  return `<div class="dica">${ic('whatsapp-logo')}<span>Confirmar na véspera reduz as faltas pela metade. Clique em <b>Enviar</b> para abrir o WhatsApp com a mensagem pronta e depois marque como confirmado. Na versão contratada, isso pode ser automático pela API oficial do WhatsApp.</span></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Atendimentos de amanhã</h3><div class="sub">${esc(DIAS_L[paraData(d).getDay()])}, ${dataCurta(d)} · ${l.filter((x) => x.status === 'confirmado').length} de ${l.length} confirmados</div></div></div>
      ${l.length ? `<ul class="lista">${l.map((x) => { const c = cli(a, x.cliente); return `<li><b class="num" style="width:44px">${x.ini}</b>${av(c.nome)}<div class="cresce"><div class="t">${esc(c.nome)}</div><div class="s corta">${esc(nomesServ(a, x))} · ${esc(prof(a, x.profissional).nome.split(' ')[0])}</div></div>${etStatus(x.status)}
        <a class="btn peq" target="_blank" rel="noopener" href="${telLink(c.telefone)}?text=${encodeURIComponent(msgConfirma(a, x))}" data-acao="marcarEnviado" data-id="${x.id}">${ic('whatsapp-logo')}Enviar</a>${x.status !== 'confirmado' ? `<button type="button" class="btn peq" data-acao="statusAg" data-id="${x.id}" data-s="confirmado">${ic('check')}Confirmado</button>` : ''}</li>`; }).join('')}</ul>` : vazio('calendar-blank', 'Nenhum atendimento amanhã')}</div>
    <div class="cartao"><div class="cartao-cab"><h3>Modelo da mensagem</h3></div><div class="cartao-corpo"><div class="nota-box" style="background:var(--ok-bg);border:0;padding:12px 14px;border-radius:12px 12px 12px 4px;max-width:520px;white-space:pre-wrap">${esc(l[0] ? msgConfirma(a, l[0]) : 'Olá, Maria! Passando para confirmar seu horário…')}</div></div></div>`;
}
function online(a) {
  const st = a.estado.online ||= { passo: 1, servico: '', prof: '', data: diaMais(1), hora: '' };
  const ss = a.db.lista('servicos'), s = serv(a, st.servico), ps = a.db.lista('profissionais').filter((p) => !s || p.id === s.profissional || s.categoria === 'Unhas' && p.id === 'p1');
  const dias = Array.from({ length: 10 }, (_, i) => diaMais(i));
  const horas = s && st.prof ? horariosLivres(a, st.prof, st.data, s.duracao) : [];
  const telaCel = `<div style="width:min(390px,100%);margin:0 auto;border:8px solid #1b1b19;border-radius:34px;background:var(--painel);overflow:hidden;box-shadow:var(--sombra-3)">
    <div style="padding:18px 18px 12px;background:var(--acc);color:#fff"><div style="font-size:12px;opacity:.85">Agendamento online</div><div style="font-size:19px;font-weight:650">${esc(a.empresa)}</div><div style="font-size:12px;opacity:.85">${esc(a.db.cfg.endereco || '')}</div></div>
    <div style="padding:14px 16px;display:flex;flex-direction:column;gap:12px;min-height:470px">
      <div class="flex" style="gap:6px">${[1, 2, 3, 4].map((n) => `<i style="flex:1;height:4px;border-radius:2px;background:${n <= st.passo ? 'var(--acc)' : 'var(--neutro-bg)'}"></i>`).join('')}</div>
      ${st.passo === 1 ? `<b>1. Escolha o serviço</b><div class="col" style="gap:6px;max-height:390px;overflow:auto">${ss.map((x) => `<button type="button" class="prod-bt" style="min-height:0;flex-direction:row;align-items:center" data-acao="onlineEscolhe" data-k="servico" data-v="${x.id}"><span class="cresce" style="text-align:left"><b style="display:block">${esc(x.nome)}</b><span>${x.duracao} min</span></span><span class="pr" style="margin:0">${moeda(x.preco)}</span></button>`).join('')}</div>` : ''}
      ${st.passo === 2 ? `<b>2. Com quem?</b>${ps.map((p) => `<button type="button" class="prod-bt" style="min-height:0;flex-direction:row;align-items:center;gap:10px" data-acao="onlineEscolhe" data-k="prof" data-v="${p.id}"><span class="av g" style="background:${corSegura(p.cor)}">${esc(p.nome[0])}</span><span style="text-align:left"><b style="display:block">${esc(p.nome)}</b><span>${esc(p.funcao)}</span></span></button>`).join('')}<button type="button" class="btn fant" data-acao="onlineVolta">${ic('arrow-left')}Voltar</button>` : ''}
      ${st.passo === 3 ? `<b>3. Dia e horário</b><div class="flex" style="overflow-x:auto;gap:6px;padding-bottom:4px">${dias.map((d) => `<button type="button" class="btn ${d === st.data ? 'pri' : ''}" style="flex-direction:column;height:54px;min-width:52px;gap:0" data-acao="onlineDia" data-v="${d}" ${trabalha(prof(a, st.prof), d) ? '' : 'disabled title="Folga"'}><small style="font-size:11px">${DIAS[paraData(d).getDay()]}</small><b>${Number(d.slice(8))}</b></button>`).join('')}</div>
        ${horas.length ? `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${horas.map((h) => `<button type="button" class="btn" data-acao="onlineEscolhe" data-k="hora" data-v="${h}">${h}</button>`).join('')}</div>` : vazio('calendar-blank', 'Sem horários neste dia', 'Escolha outro dia.')}<button type="button" class="btn fant" data-acao="onlineVolta">${ic('arrow-left')}Voltar</button>` : ''}
      ${st.passo === 4 ? `<b>4. Seus dados</b><div class="dica" style="font-size:12.5px">${ic('calendar-check')}<span>${esc(s.nome)} com ${esc(prof(a, st.prof).nome.split(' ')[0])}<br>${esc(DIAS_L[paraData(st.data).getDay()])}, ${dataCurta(st.data)} às ${st.hora} · ${moeda(s.preco)}</span></div>
        <label class="campo">Nome<input data-on="nome" value="Marina Teste"></label><label class="campo">WhatsApp<input data-on="tel" value="(11) 98888-1234" type="tel"></label>
        <button type="button" class="btn pri" style="height:42px" data-acao="onlineConfirma">Confirmar agendamento</button><button type="button" class="btn fant" data-acao="onlineVolta">${ic('arrow-left')}Voltar</button>` : ''}
      ${st.passo === 5 ? `<div class="vazio" style="padding-top:70px">${ic('check-circle')}<b style="font-size:16px">Agendado!</b><span>Você vai receber a confirmação pelo WhatsApp.</span><button type="button" class="btn" data-acao="onlineNovo" style="margin-top:10px">Fazer outro agendamento</button><a class="btn fant" href="#/agenda">Ver na agenda do salão</a></div>` : ''}
    </div></div>`;
  return `<div class="grade g12" style="align-items:start"><div class="col" style="gap:12px"><div class="cartao"><div class="cartao-corpo col" style="gap:10px"><h3>Sua página de agendamento</h3><p class="mute-2">As clientes escolhem serviço, profissional e horário sozinhas, 24 horas por dia, só entre os horários realmente livres. O agendamento cai direto na agenda.</p>
      <div class="flex" style="flex-wrap:wrap"><button type="button" class="btn pri" data-acao="linkAgendar">${ic('link')}Link e QR code da página</button></div>
      <div class="form-grade" style="margin-top:6px"><label class="campo">Sinal para garantir o horário<select data-mudar="sinalPct">${[0, 20, 30, 50, 100].map((v) => `<option value="${v}" ${Number(a.db.cfg.sinal_pct || 0) === v ? 'selected' : ''}>${v ? `${v}% do serviço pelo PIX` : 'Sem sinal'}</option>`).join('')}</select><span class="ajuda">${a.temPix() ? 'A cliente paga pelo PIX da empresa e o valor é descontado no dia.' : 'Cadastre a chave PIX em Configurações para usar o sinal.'}</span></label></div>
      <div class="dica">${ic('info')}<span>Coloque o link na bio do Instagram e no WhatsApp Business. Teste ao lado: o agendamento aparece na agenda.</span></div></div></div>
      ${kpis([{ rot: 'Agendados online (30 dias)', icone: 'globe', val: num(ags(a).filter((x) => x.origem === 'online' && diasAte(x.criado || x.data) > -30).length) }])}</div>${telaCel}</div>`;
}
function esperaPag(a) {
  return `<div class="dica">${ic('info')}<span>Quem queria um horário que estava cheio fica aqui. Quando alguém cancela, o sistema mostra quem chamar para ocupar a vaga.</span></div>` + a.tab({ id: 'espera', colecao: 'espera', singular: 'pessoa', plural: 'pessoas', ordem: 'criado',
    visoes: [{ id: 'aguardando', rot: 'Aguardando', filtro: (e) => !e.atendida }, { id: 'todas', rot: 'Todas' }], novo: { rot: 'Adicionar', attrs: 'data-acao="novaEspera"' }, aoClicar: false,
    colunas: [{ k: 'cliente', rot: 'Cliente', valor: (e) => cli(a, e.cliente)?.nome, render: (e) => `<span class="prim">${esc(cli(a, e.cliente)?.nome || '')}</span><span class="sub">${esc(cli(a, e.cliente)?.telefone || '')}</span>` }, { k: 'servico', rot: 'Serviço', valor: (e) => serv(a, e.servico)?.nome }, { k: 'preferencia', rot: 'Preferência', oc: true }, { k: 'criado', rot: 'Desde', render: (e) => relativo(e.criado) },
      { k: 'acao', rot: '', ord: false, csv: false, render: (e) => (e.atendida ? et('Atendida', 'ok') : `<span class="flex" style="gap:6px;justify-content:flex-end"><a class="btn peq" target="_blank" rel="noopener" href="${telLink(cli(a, e.cliente)?.telefone)}?text=${encodeURIComponent(`Oi, ${cli(a, e.cliente)?.nome.split(' ')[0]}! Abriu um horário para ${serv(a, e.servico)?.nome} no ${a.empresa}. Quer que eu reserve para você?`)}">${ic('whatsapp-logo')}Chamar</a><button type="button" class="btn peq" data-acao="esperaFeita" data-id="${e.id}">${ic('check')}Agendada</button></span>`) }] });
}
function relatorios(a) {
  const meses = Array.from({ length: 4 }, (_, i) => mesMais(i - 3));
  const ks = fechadas(a);
  const porServ = a.db.lista('servicos').map((s) => ({ rot: s.nome, v: soma(ks.filter((k) => diasAte(k.data) > -90).flatMap((k) => k.itens).filter((i) => i.ref === s.id), (i) => i.qtd * i.preco) })).sort((x, y) => y.v - x.v).slice(0, 7);
  const ult = ags(a).filter((x) => diasAte(x.data) > -90 && x.data <= hoje());
  const origem = Object.entries(ORIGENS).map(([k, n], i) => ({ rot: n, v: ult.filter((x) => x.origem === k).length, cor: ['#64748b', '#22a06b', '#6366f1', '#e11d48'][i] }));
  const ativasL = a.db.lista('clientes').map((c) => resumoCli(a, c.id)).filter((r) => r.ultima && diasAte(r.ultima) > -90);
  const ativas = ativasL.length, freqMed = Math.round(soma(ativasL.filter((r) => r.freq), (r) => r.freq) / (ativasL.filter((r) => r.freq).length || 1));
  return `${kpis([
    { rot: 'Faturamento (4 meses)', icone: 'coins', val: moeda(faturamento(a, (k) => k.data >= `${meses[0]}-01`)) },
    { rot: 'Serviços × produtos', icone: 'chart-pie-slice', val: pct((soma(ks.flatMap((k) => k.itens).filter((i) => i.tipo === 'produto'), (i) => i.qtd * i.preco) / (soma(ks, totalK) || 1)) * 100, 1), nota: 'da receita vem de produtos' },
    { rot: 'Taxa de faltas (90 dias)', icone: 'user-focus', val: pct((ult.filter((x) => x.status === 'faltou').length / (ult.filter((x) => ['concluido', 'faltou'].includes(x.status)).length || 1)) * 100, 1) },
    { rot: 'Clientes ativas', icone: 'heart', val: num(ativas), nota: `vieram nos últimos 90 dias · retorno médio a cada ${freqMed} dias` },
  ])}
  <div class="grade g21"><div class="cartao"><div class="cartao-cab"><div><h3>Faturamento por mês</h3><div class="sub">Serviços e produtos</div></div></div><div class="cartao-corpo">${barras({ dados: meses.map((m) => { const km = ks.filter((k) => k.data.startsWith(m)); return { rot: nomeMes(m), v: [soma(km.flatMap((k) => k.itens).filter((i) => i.tipo === 'servico'), (i) => i.qtd * i.preco), soma(km.flatMap((k) => k.itens).filter((i) => i.tipo === 'produto'), (i) => i.qtd * i.preco)] }; }), series: [{ nome: 'Serviços', cor: 'var(--acc)' }, { nome: 'Produtos', cor: '#f59e0b' }], empilhado: true, fmt: moedaC })}</div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Como as clientes agendam</h3><div class="sub">Últimos 90 dias</div></div></div><div class="cartao-corpo">${rosca({ itens: origem, centro: num(ult.length), sub: 'agendamentos' })}</div></div></div>
  <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Serviços que mais faturam</h3><div class="sub">Últimos 90 dias</div></div></div><div class="cartao-corpo">${barrasH(porServ, { fmt: moedaC })}</div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Movimento por dia da semana</h3><div class="sub">Média de atendimentos</div></div></div><div class="cartao-corpo">${barras({ dados: [1, 2, 3, 4, 5, 6, 0].map((d) => { const l = ult.filter((x) => paraData(x.data).getDay() === d && x.status === 'concluido'); const nd = new Set(l.map((x) => x.data)).size || 1; return { rot: DIAS[d], v: [Math.round(l.length / nd)] }; }), series: [{ nome: 'Atendimentos', cor: 'var(--acc)' }], altura: 200 })}</div></div></div>`;
}

// ---------------------------------------------------------------- fichas
const fichas = {
  agendamento(a, id) {
    const x = a.db.obter('agendamentos', id); if (!x) return null;
    const c = cli(a, x.cliente), p = prof(a, x.profissional), r = resumoCli(a, x.cliente), i = FLUXO.indexOf(x.status);
    const prox = { agendado: ['confirmado', 'Confirmar', 'check'], confirmado: ['chegou', 'Cliente chegou', 'door-open'], chegou: ['atendimento', 'Iniciar atendimento', 'play'], atendimento: ['concluido', 'Finalizar e cobrar', 'cash-register'] }[x.status];
    return { estreita: true, html: ficha({ tipo: 'Agendamento', icone: 'calendar-check', titulo: esc(c?.nome || '—'), avatar: av(c?.nome || '?', 'gg'),
      sub: `${etStatus(x.status)}<span>${esc(DIAS_L[paraData(x.data).getDay()])}, ${dataCurta(x.data)} · ${x.ini}–${fimDe(x)}</span>`,
      extra: `${i >= 0 ? `<div class="etapas" style="margin-top:12px">${FLUXO.map((s, j) => `<button type="button" class="${j < i ? 'feita' : j === i ? 'atual' : ''}" data-acao="statusAg" data-id="${id}" data-s="${s}">${STATUS[s][0]}</button>`).join('')}</div>` : ''}
        <div class="flex" style="margin-top:12px;flex-wrap:wrap">${prox ? `<button type="button" class="btn pri" data-acao="${prox[0] === 'concluido' ? 'cobrar' : 'statusAg'}" data-id="${id}" data-s="${prox[0]}">${ic(prox[2])}${prox[1]}</button>` : ''}${x.status === 'concluido' && !x.comanda ? `<button type="button" class="btn pri" data-acao="cobrar" data-id="${id}">${ic('cash-register')}Fechar conta</button>` : ''}${c ? `<a class="btn" target="_blank" rel="noopener" href="${telLink(c.telefone)}?text=${encodeURIComponent(msgConfirma(a, x))}">${ic('whatsapp-logo')}Confirmar</a>` : ''}</div>`,
      corpo: `${c?.alergias ? `<div class="gav-sec"><div class="alerta-linha">${ic('warning')}${esc(c.alergias)}</div></div>` : ''}
        <div class="gav-sec">${props([['scissors', 'Serviços', x.servicos.map((sid) => `${esc(serv(a, sid)?.nome)} <span class="mute">${serv(a, sid)?.duracao} min</span>`).join('<br>')], ['user-circle', 'Profissional', `<span class="flex"><span class="av p" style="background:${corSegura(p.cor)}">${esc(p.nome[0])}</span>${esc(p.nome)}</span>`], ['currency-circle-dollar', 'Valor', moeda(x.valor)], ['globe', 'Origem', esc(ORIGENS[x.origem] || '—')], ['note-pencil', 'Observação', x.obs ? esc(x.obs) : null], x.comanda ? ['receipt', 'Comanda', `<a href="javascript:void 0" data-abrir="comanda:${x.comanda}">#${a.db.obter('comandas', x.comanda)?.numero}</a>`] : null])}</div>
        <div class="gav-sec"><h4>Sobre a cliente</h4>${props([['phone', 'WhatsApp', esc(c?.telefone || '—')], ['calendar-check', 'Visitas', `${r.visitas}${r.freq ? ` · volta a cada ${r.freq} dias` : ''}`], ['coins', 'Total gasto', moeda(r.gasto)], ['heart', 'Preferências', c?.preferencias ? esc(c.preferencias) : null]])}<button type="button" class="btn peq" style="margin-top:10px" data-abrir="cliente:${x.cliente}">Abrir ficha completa${ic('arrow-right', 'p')}</button></div>
        <div class="gav-sec"><h4>Histórico</h4>${linhaDoTempo(a.db.historico(`agendamentos:${id}`).map((l) => ({ quando: l.quando, icone: l.icone, tom: l.tom, html: esc(l.texto) })))}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="remarcar" data-id="${id}">${ic('calendar-blank')}Remarcar</button><button type="button" class="btn fant peq ic-so" data-acao="menuAg" data-id="${id}" aria-label="Mais">${ic('dots-three')}</button>` }) };
  },
  cliente(a, id, aba = 'resumo') {
    const c = cli(a, id); if (!c) return null;
    const r = resumoCli(a, id), h = historicoCli(a, id), pacs = a.db.lista('pacotes').filter((k) => k.cliente === id), ks = fechadas(a).filter((k) => k.cliente === id).sort((x, y) => y.data.localeCompare(x.data));
    let corpo = '';
    if (aba === 'resumo') corpo = `${c.alergias ? `<div class="gav-sec"><div class="alerta-linha">${ic('warning')}${esc(c.alergias)}</div></div>` : ''}<div class="gav-sec"><div class="grade g4" style="gap:8px">${[['Visitas', num(r.visitas)], ['Total gasto', moedaC(r.gasto)], ['Ticket médio', moedaC(r.ticket)], ['Volta a cada', r.freq ? `${r.freq} dias` : '—']].map(([t, v]) => `<div style="padding:10px;border:1px solid var(--borda);border-radius:8px"><div class="mute" style="font-size:12px">${t}</div><b class="num" style="font-size:16px">${v}</b></div>`).join('')}</div></div>
      <div class="gav-sec">${props([['phone', 'WhatsApp', `${esc(c.telefone)} · <a href="${telLink(c.telefone)}" target="_blank" rel="noopener">abrir conversa</a>`], ['envelope-simple', 'E-mail', c.email ? esc(c.email) : null], ['cake', 'Aniversário', c.nascimento ? `${dataCurta(`${hoje().slice(0, 4)}${c.nascimento.slice(4)}`).replace(/ \d{4}$/, '')} · ${new Date().getFullYear() - Number(c.nascimento.slice(0, 4))} anos` : null], ['heart', 'Preferências', c.preferencias ? esc(c.preferencias) : null], ['globe', 'Como conheceu', esc(c.origem || '—')], ['calendar-blank', 'Próximo horário', r.prox ? `${relativo(r.prox.data)}, ${r.prox.ini} · ${esc(nomesServ(a, r.prox))}` : null], ['clock', 'Cliente desde', dataCurta(c.criado)], ['user-focus', 'Faltas', String(r.faltas)]])}</div>`;
    if (aba === 'resumo') { const f = fidel(a), n = selos(a, c); corpo += `<div class="gav-sec"><div class="entre"><h4>Cartão fidelidade</h4><span class="mute" style="font-size:12.5px">${Math.min(n, f.a_cada)} de ${f.a_cada} · prêmio: ${esc(f.premio)}</span></div><div class="selos">${Array.from({ length: f.a_cada }, (_, i) => `<i class="${i < n ? 'on' : ''}">${i < n ? ic('star') : ''}</i>`).join('')}</div>${n >= f.a_cada ? `<button type="button" class="btn pri peq" style="margin-top:10px" data-acao="resgatar" data-id="${id}">${ic('gift')}Resgatar prêmio</button>` : ''}</div>`; }
    if (aba === 'hist') corpo = `<div class="gav-sec">${h.length ? `<ul class="lista" style="margin:0 -20px">${h.slice(0, 40).map((x) => `<li class="clicavel" data-abrir="agendamento:${x.id}"><div style="width:62px"><b class="num" style="font-size:12.5px">${dataBR(x.data).slice(0, 5)}</b><div class="s">${x.ini}</div></div><div class="cresce"><div class="t corta">${esc(nomesServ(a, x))}</div><div class="s">${esc(prof(a, x.profissional)?.nome || '')}</div></div>${etStatus(x.status)}<b class="num" style="min-width:76px;text-align:right">${moeda(x.valor)}</b></li>`).join('')}</ul>` : vazio('calendar-blank', 'Sem atendimentos')}</div>`;
    if (aba === 'pacotes') corpo = `<div class="gav-sec">${pacs.length ? pacs.map((k) => `<div style="padding:12px;border:1px solid var(--borda);border-radius:8px;margin-bottom:8px"><div class="entre"><b>${esc(serv(a, k.servico)?.nome)}</b><span class="${k.validade < hoje() ? 'er-tx' : 'mute'}" style="font-size:12.5px">válido até ${dataCurta(k.validade)}</span></div><div style="margin:8px 0 4px">${prog((k.usadas / k.sessoes) * 100, k.usadas >= k.sessoes ? 'ok' : '')}</div><div class="entre mute" style="font-size:12.5px"><span>${k.usadas} de ${k.sessoes} sessões usadas</span><span>${moeda(k.valor)}</span></div></div>`).join('') : vazio('ticket', 'Nenhum pacote')}<button type="button" class="btn" data-acao="novoPacote" data-cliente="${id}">${ic('plus')}Vender pacote</button></div>`;
    if (aba === 'compras') corpo = `<div class="gav-sec">${ks.length ? `<ul class="lista" style="margin:0 -20px">${ks.slice(0, 30).map((k) => `<li class="clicavel" data-abrir="comanda:${k.id}"><span class="mono mute-2">#${k.numero}</span><div class="cresce"><div class="t corta">${esc(k.itens.map((i) => i.nome).join(', '))}</div><div class="s">${dataCurta(k.data)}</div></div><b class="num">${moeda(totalK(k))}</b></li>`).join('')}</ul>` : vazio('receipt', 'Nenhuma compra')}</div>`;
    return { html: ficha({ tipo: 'Cliente', icone: 'user', titulo: esc(c.nome), avatar: av(c.nome, 'gg'), sub: `${(c.tags || []).map((t) => et(t, 'roxo', 'sem-ponto')).join(' ')}<span>${esc(c.telefone)}</span>${r.ultima ? `<span>· última visita ${relativo(r.ultima)}</span>` : ''}`,
      extra: `<div class="flex" style="margin-top:12px"><button type="button" class="btn pri peq" data-acao="agendarCli" data-id="${id}">${ic('calendar-plus')}Agendar</button><a class="btn peq" href="${telLink(c.telefone)}" target="_blank" rel="noopener">${ic('whatsapp-logo')}WhatsApp</a><button type="button" class="btn peq" data-acao="vip" data-id="${id}">${ic('crown')}${(c.tags || []).includes('VIP') ? 'Tirar VIP' : 'Marcar VIP'}</button></div>`,
      aba, abas: [['resumo', 'Resumo'], ['hist', 'Atendimentos', h.length], ['pacotes', 'Pacotes', pacs.length], ['compras', 'Compras', ks.length]], corpo,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCli" data-id="${id}">${ic('pencil-simple')}Editar</button><button type="button" class="btn fant peq ic-so" data-acao="excluirCli" data-id="${id}" aria-label="Excluir">${ic('trash')}</button>` }), montar: (g) => (g.dataset.aba = aba) };
  },
  comanda(a, id) {
    const k = a.db.obter('comandas', id); if (!k) return null; const c = cli(a, k.cliente);
    return { estreita: true, html: ficha({ tipo: 'Comanda', icone: 'receipt', titulo: `Comanda #${k.numero}`, sub: `${esc(c?.nome || 'Venda avulsa')} · ${dataCurta(k.data)} ${k.fechada_em ? `às ${k.fechada_em.slice(11, 16)}` : ''}`,
      corpo: `<div class="gav-sec"><table class="tabela"><thead><tr><th>Item</th><th class="n">Qtd.</th><th class="n">Valor</th></tr></thead><tbody>${k.itens.map((i) => `<tr><td>${esc(i.nome)}<span class="sub">${i.tipo === 'servico' ? esc(prof(a, i.profissional)?.nome || '') : 'produto'}${i.pacote ? ' · pacote' : ''}</span></td><td class="n">${i.qtd}</td><td class="n">${moeda(i.qtd * i.preco)}</td></tr>`).join('')}</tbody>
        <tfoot>${k.desconto ? `<tr><td colspan="2">Desconto</td><td class="n">− ${moeda(k.desconto)}</td></tr>` : ''}<tr><td colspan="2">Total</td><td class="n">${moeda(totalK(k))}</td></tr></tfoot></table></div>
        <div class="gav-sec"><h4>Pagamento</h4>${k.pagamentos.map((p) => `<div class="entre" style="padding:4px 0"><span class="flex">${ic(METODOS[p.metodo][1])}${METODOS[p.metodo][0]}</span><b class="num">${moeda(p.valor)}</b></div>`).join('')}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="recibo" data-id="${id}">${ic('printer')}Recibo</button>` }) };
  },
};

// ---------------------------------------------------------------- aplicativo
const app = criarApp({
  id: 'agenda', nome: 'Veltria Agenda', sub: 'Salão e estética', cor: '#c2417a', icone: 'scissors', empresa: 'Studio Lumière', conta: '4 profissionais · Jardins, SP',
  produto: { mensal: 79 }, semente, colecoes, fichas, buscaDica: 'clientes',
  portal: {
    agendar: {
      explica: 'A página de agendamento do salão: a cliente escolhe serviço, profissional e horário livre. Se o sinal estiver ligado, ela paga pelo PIX para garantir o horário.',
      montar: (a) => {
        const ss = a.db.lista('servicos'), ps = a.db.lista('profissionais');
        const livres = Object.fromEntries(ps.map((pr) => [pr.id, Object.fromEntries(Array.from({ length: 14 }, (_, i) => diaMais(i)).map((d) => [d, horariosLivres(a, pr.id, d, 30)]))]));
        const pix = a.pixDados();
        return { servicos: ss.map((x) => ({ id: x.id, nome: x.nome, duracao: x.duracao, preco: x.preco })), profissionais: ps.map((pr) => ({ id: pr.id, nome: pr.nome, servicos: ss.filter((x) => profsDoServ(a, x).some((y) => y.id === pr.id)).map((x) => x.id) })), livres,
          sinal: { pct: Number(a.db.cfg.sinal_pct || 0), regra: 'Se não puder vir, avise com 24 horas de antecedência para remarcar sem perder o sinal.' }, pix };
      },
      responder: (a, r) => {
        if (r.acao !== 'agendar') return '';
        const d = r.dados, x = serv(a, d.servico), pr = prof(a, d.profissional); if (!x || !pr || !/^\d{4}-\d{2}-\d{2}$/.test(d.data || '') || !/^\d{2}:\d{2}$/.test(d.hora || '')) return '';
        const tel = String(d.telefone || '').replace(/\D/g, '');
        let c = a.db.lista('clientes').find((y) => tel && String(y.telefone).replace(/\D/g, '') === tel);
        if (!c) c = a.db.salvar('clientes', { nome: String(d.nome || 'Cliente').slice(0, 80), telefone: d.telefone || '', origem: 'Instagram', criado: hoje(), tags: [] });
        const choque = livre(a, pr.id, d.data, d.hora, x.duracao);
        const ag = a.db.salvar('agendamentos', { cliente: c.id, profissional: pr.id, data: d.data, ini: d.hora, servicos: [x.id], duracao: x.duracao, valor: x.preco, origem: 'online', status: 'agendado', criado: hoje(), sinal: d.sinal ? 'informado' : null, obs: d.sinal ? `Sinal de ${moeda((x.preco * Number(a.db.cfg.sinal_pct || 0)) / 100)} informado pelo PIX: conferir` : '' });
        a.db.registrar(`agendamentos:${ag.id}`, `Agendado pela página online${d.sinal ? ' · sinal pago pelo PIX (conferir)' : ''}`, { icone: 'globe', tom: 'acc' });
        return `${c.nome.split(' ')[0]} agendou ${x.nome} com ${pr.nome.split(' ')[0]} · ${dataCurta(d.data)} às ${d.hora}${choque ? ` (atenção: ${choque})` : ''}${d.sinal ? ' · sinal informado' : ''}`;
      },
    },
  },
  modelos: [
    { id: 'salao', nome: 'Salão de beleza', desc: 'Cabelo, unhas e estética', dados: {} },
    { id: 'barbearia', nome: 'Barbearia', desc: 'Corte, barba, pigmentação e combos', dados: { servicos: [['Corte degradê', 'Barbearia', 40, 50], ['Barba na toalha quente', 'Barbearia', 30, 40], ['Corte + barba', 'Barbearia', 60, 80], ['Pigmentação de barba', 'Barbearia', 30, 35], ['Sobrancelha na navalha', 'Barbearia', 15, 20]].map(([nome, categoria, duracao, preco]) => ({ nome, categoria, duracao, preco })) } },
    { id: 'estetica', nome: 'Clínica de estética', desc: 'Faciais, corporais e depilação', dados: { servicos: [['Limpeza de pele profunda', 'Estética', 80, 180], ['Microagulhamento', 'Estética', 60, 350], ['Drenagem linfática', 'Corporal', 60, 140], ['Depilação a laser (axila)', 'Estética', 20, 120], ['Massagem modeladora', 'Corporal', 50, 130]].map(([nome, categoria, duracao, preco]) => ({ nome, categoria, duracao, preco })) } },
    { id: 'unhas', nome: 'Esmalteria e nail design', desc: 'Mão, pé, gel e alongamento', dados: { servicos: [['Alongamento em fibra', 'Unhas', 120, 180], ['Manutenção de alongamento', 'Unhas', 90, 120], ['Blindagem', 'Unhas', 60, 70], ['Spa dos pés', 'Unhas', 60, 80]].map(([nome, categoria, duracao, preco]) => ({ nome, categoria, duracao, preco })) } },
    { id: 'cilios', nome: 'Cílios e sobrancelhas', desc: 'Extensão de cílios, lash lifting e design', dados: { servicos: [['Extensão de cílios fio a fio', 'Estética', 120, 180], ['Manutenção de cílios', 'Estética', 60, 100], ['Lash lifting', 'Estética', 60, 130], ['Brow lamination', 'Estética', 50, 120], ['Design com henna', 'Estética', 40, 55]].map(([nome, categoria, duracao, preco]) => ({ nome, categoria, duracao, preco })) } },
  ],
  passos: (a) => [{ id: 'online', rot: 'Coloque o link de agendamento na bio do Instagram', feito: !!a.db.cfg.links?.['agendar:'], acao: 'linkAgendar' }, { id: 'sinal', rot: 'Ligue o sinal por PIX para diminuir faltas', feito: !!Number(a.db.cfg.sinal_pct || 0) && a.temPix(), href: '#/online' }],
  configExtra: (a) => { const f = fidel(a); return `<div class="cartao"><div class="cartao-cab"><div><h3>Cartão fidelidade</h3><div class="sub">A cada atendimento pago a cliente ganha um selo</div></div></div><div class="cartao-corpo"><form class="form-grade" data-fidel><label class="campo">Selos para ganhar o prêmio<input type="number" name="a_cada" min="3" max="30" value="${f.a_cada}"></label><label class="campo">Prêmio<input name="premio" value="${esc(f.premio)}"></label><div class="campo largo" style="flex-direction:row;justify-content:flex-end"><button type="button" class="btn pri" data-acao="salvarFidel">Salvar</button></div></form></div></div>`; },
  equipe: [['Patrícia Duarte', 'Dona do salão'], ['Larissa Mendes', 'Cabeleireira'], ['Tainá Rocha', 'Manicure'], ['Bruna Vieira', 'Esteticista'], ['Marcos Lima', 'Barbeiro']],
  busca: [{ colecao: 'clientes', grupo: 'Clientes', icone: 'user', ficha: 'cliente', rot: (c) => c.nome, sub: (c) => c.telefone }],
  comandos: [{ rot: 'Novo agendamento', icone: 'calendar-plus', acao: (a) => agendar(a) }, { rot: 'Nova cliente', icone: 'user-plus', acao: (a) => a.acoes.novaCliente() }, { rot: 'Venda avulsa no caixa', icone: 'shopping-cart', acao: (a) => a.acoes.vendaAvulsa() }],
  paginas: [
    { id: 'agenda', rot: 'Agenda', icone: 'calendar-blank', titulo: 'Agenda', render: agenda, cheio: true, atalho: 'a', novo: (a) => agendar(a, { data: a.estado.agenda?.data || hoje() }), acoes: () => `<button type="button" class="btn pri" data-acao="novoAg">${ic('plus')}<span class="so-larga">Agendar</span></button>`,
      cont: (a) => doDia(a, hoje()).filter((x) => ['agendado', 'confirmado', 'chegou'].includes(x.status)).length },
    { id: 'inicio', rot: 'Painel', icone: 'squares-four', titulo: 'Painel do salão', render: painel, atalho: 'p' },
    { id: 'caixa', rot: 'Caixa', icone: 'cash-register', titulo: (a, [id]) => (id ? 'Fechar comanda' : 'Caixa e comandas'), render: caixa, atalho: 'c', cont: (a) => { const n = doDia(a, hoje()).filter((x) => ['chegou', 'atendimento', 'concluido'].includes(x.status) && !x.comanda).length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'lembretes', rot: 'Confirmações', icone: 'whatsapp-logo', titulo: 'Confirmações por WhatsApp', render: lembretes, cont: (a) => doDia(a, diaMais(1)).filter((x) => x.status === 'agendado').length },
    { grupo: 'Clientes' },
    { id: 'clientes', rot: 'Clientes', icone: 'users', render: clientes, atalho: 'l', novo: (a) => a.acoes.novaCliente() },
    { id: 'pacotes', rot: 'Pacotes', icone: 'ticket', render: pacotesPag },
    { id: 'online', rot: 'Agendamento online', icone: 'globe', render: online },
    { id: 'espera', rot: 'Lista de espera', icone: 'list-plus', render: esperaPag, cont: (a) => a.db.lista('espera').filter((e) => !e.atendida).length },
    { grupo: 'Salão' },
    { id: 'servicos', rot: 'Serviços', icone: 'scissors', render: catalogoPag },
    { id: 'produtos', rot: 'Produtos', icone: 'package', titulo: 'Produtos de revenda', render: produtosPag, cont: (a) => { const n = a.db.lista('produtos').filter((p) => p.estoque <= p.minimo).length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'equipe', rot: 'Profissionais', icone: 'identification-card', render: profissionaisPag, novo: (a) => a.acoes.novoProf(), acoes: () => `<button type="button" class="btn pri" data-acao="novoProf">${ic('plus')}<span class="so-larga">Adicionar profissional</span></button>` },
    { id: 'comissoes', rot: 'Comissões', icone: 'hand-coins', render: comissoes },
    { id: 'relatorios', rot: 'Relatórios', icone: 'chart-bar', render: relatorios, atalho: 'r' },
    ...ferramentaPaginas(FERR, FERR_ITENS),
  ],
});

const reab = () => { app.render(); app.reabrir(); };
Object.assign(app.acoes, {
  novoAg: () => agendar(app, { data: app.estado.agenda?.data || hoje() }),
  agendarCli: (d) => { fecharGaveta(); agendar(app, { cliente: d.id }); },
  remarcar: (d) => { fecharGaveta(); agendar(app, { id: d.id }); },
  diaAg: (d) => { const st = app.estado.agenda; st.data = Number(d.d) === 0 ? hoje() : diaMais(Number(d.d) * (st.modo === 'semana' ? 7 : 1), st.data); app.render(); },
  dataAg: (d, el) => { if (el.value) { app.estado.agenda.data = el.value; app.render(); } },
  modoAg: (d) => { app.estado.agenda.modo = d.m; app.render(); },
  profAg: (d, el) => { app.estado.agenda.prof = el.value; app.render(); },
  statusAg: (d) => { const x = app.db.obter('agendamentos', d.id); if (d.s === 'concluido' && !x.comanda) return app.acoes.cobrar(d); app.db.salvar('agendamentos', { id: d.id, status: d.s }); if (d.s === 'cancelado' && x.data >= hoje() && esperaPara(app, x).length) setTimeout(() => app.acoes.oferecerVaga({ id: d.id }), 400); app.db.registrar(`agendamentos:${d.id}`, `Situação: ${STATUS[d.s][0]}`, { icone: 'check', tom: STATUS[d.s][2] === 'er' ? 'er' : 'ok' }); avisar(`${cli(app, x.cliente).nome.split(' ')[0]}: ${STATUS[d.s][0].toLowerCase()}`); reab(); },
  marcarEnviado: (d) => { setTimeout(() => { app.db.registrar(`agendamentos:${d.id}`, 'Confirmação enviada por WhatsApp', { icone: 'whatsapp-logo' }); }, 100); },
  cobrar: (d) => { fecharGaveta(); app.estado.pdv = null; app.ir(`#/caixa/${d.id}`); },
  irPdv: (d) => { app.estado.pdv = null; app.ir(`#/caixa/${d.id}`); },
  vendaAvulsa: () => { app.estado.pdv = null; app.ir('#/caixa/avulsa'); },
  pdvAba: (d) => { app.estado.pdv.aba = d.a; app.render(); },
  pdvAdd: (d) => { const p = app.estado.pdv; const ag = app.db.obter('agendamentos', p.id); if (d.t === 'servico') { const s = serv(app, d.ref); p.itens.push({ tipo: 'servico', ref: s.id, nome: s.nome, qtd: 1, preco: s.preco, profissional: ag?.profissional || s.profissional }); } else { const pr = app.db.obter('produtos', d.ref); const ex = p.itens.find((i) => i.tipo === 'produto' && i.ref === pr.id); if (ex) ex.qtd++; else p.itens.push({ tipo: 'produto', ref: pr.id, nome: pr.nome, qtd: 1, preco: pr.preco, profissional: ag?.profissional || '' }); } app.render(); },
  pdvQtd: (d) => { const p = app.estado.pdv; const it = p.itens[Number(d.i)]; it.qtd += Number(d.d); if (it.qtd <= 0) p.itens.splice(Number(d.i), 1); app.render(); },
  pdvDesc: (d, el) => { app.estado.pdv.desconto = Math.max(0, Number(el.value) || 0); app.render(); },
  pdvCliente: (d, el) => { app.estado.pdv.cliente = el.value; app.render(); },
  pdvPacote: (d) => { const p = app.estado.pdv, k = app.db.obter('pacotes', d.k); const it = p.itens.find((i) => i.tipo === 'servico' && i.ref === k.servico && !i.pacote); if (it) { it.preco = 0; it.pacote = k.id; } else { const s = serv(app, k.servico); p.itens.push({ tipo: 'servico', ref: s.id, nome: s.nome, qtd: 1, preco: 0, pacote: k.id, profissional: s.profissional }); } avisar('Sessão do pacote aplicada'); app.render(); },
  pdvPagar: (d) => { const p = app.estado.pdv; const total = Math.max(0, soma(p.itens, (x) => x.qtd * x.preco) - (p.desconto || 0)); const falta = Math.round((total - soma(p.pagamentos, (x) => x.valor)) * 100) / 100; if (falta <= 0) return avisar('O valor já está pago', { tipo: 'erro' }); p.pagamentos.push({ metodo: d.m, valor: falta }); app.render(); },
  pdvTiraPag: (d) => { app.estado.pdv.pagamentos.splice(Number(d.i), 1); app.render(); },
  pdvFechar: () => {
    const p = app.estado.pdv, total = Math.max(0, soma(p.itens, (x) => x.qtd * x.preco) - (p.desconto || 0)), pago = soma(p.pagamentos, (x) => x.valor);
    const pagamentos = pago > total && p.pagamentos.length ? p.pagamentos.map((x, i) => (i === p.pagamentos.length - 1 ? { ...x, valor: x.valor - (pago - total) } : x)) : p.pagamentos;
    if (!pagamentos.length && total === 0) pagamentos.push({ metodo: 'pacote', valor: 0 });
    const numero = 1000 + app.db.lista('comandas').length;
    const k = app.db.salvar('comandas', { numero, cliente: p.cliente, agendamento: p.id !== 'avulsa' ? p.id : null, data: hoje(), itens: p.itens, desconto: p.desconto || 0, pagamentos, status: 'fechada', fechada_em: agoraISO() });
    p.itens.filter((i) => i.tipo === 'produto').forEach((i) => { const pr = app.db.obter('produtos', i.ref); if (pr) app.db.salvar('produtos', { id: pr.id, estoque: Math.max(0, pr.estoque - i.qtd) }); });
    p.itens.filter((i) => i.pacote).forEach((i) => { const pk = app.db.obter('pacotes', i.pacote); app.db.salvar('pacotes', { id: pk.id, usadas: pk.usadas + 1 }); });
    if (p.id !== 'avulsa') { app.db.salvar('agendamentos', { id: p.id, status: 'concluido', comanda: k.id }); app.db.registrar(`agendamentos:${p.id}`, `Concluído e pago · comanda #${numero}`, { icone: 'cash-register', tom: 'ok' }); }
    app.estado.pdv = null; avisar(`Comanda #${numero} fechada · ${moeda(total)}`); app.ir('#/caixa');
  },
  recibo: (d) => { const k = app.db.obter('comandas', d.id), c = cli(app, k.cliente); imprimir(`<div class="doc" style="max-width:360px;font-size:12px"><h1 style="font-size:15px">${esc(app.empresa)}</h1><div style="color:#555">${esc(app.db.cfg.endereco || '')}</div><h2>Recibo · comanda #${k.numero}</h2><div>${esc(c?.nome || 'Cliente')} · ${dataBR(k.data)}</div><table style="margin-top:8px">${k.itens.map((i) => `<tr><td>${i.qtd}× ${esc(i.nome)}</td><td class="n">${moeda(i.qtd * i.preco)}</td></tr>`).join('')}${k.desconto ? `<tr><td>Desconto</td><td class="n">− ${moeda(k.desconto)}</td></tr>` : ''}<tr><td><b>Total</b></td><td class="n"><b>${moeda(totalK(k))}</b></td></tr></table><div style="margin-top:8px">${k.pagamentos.map((p) => `${METODOS[p.metodo][0]}: ${moeda(p.valor)}`).join(' · ')}</div><p style="margin-top:14px;color:#555">Obrigado pela visita!</p></div>`); },
  fecharCaixa: () => { const ks = fechadas(app).filter((k) => k.data === hoje()); imprimir(`<div class="doc"><h1>Fechamento de caixa</h1><div style="color:#555">${esc(app.empresa)} · ${dataBR(hoje())}</div><h2>Por forma de pagamento</h2><table>${Object.entries(METODOS).map(([m, [n]]) => `<tr><td>${n}</td><td class="n">${moeda(soma(ks.flatMap((k) => k.pagamentos).filter((p) => p.metodo === m), (p) => p.valor))}</td></tr>`).join('')}<tr><td><b>Total</b></td><td class="n"><b>${moeda(soma(ks, totalK))}</b></td></tr></table><h2>Comandas (${ks.length})</h2><table>${ks.map((k) => `<tr><td>#${k.numero}</td><td>${esc(cli(app, k.cliente)?.nome || 'Avulsa')}</td><td class="n">${moeda(totalK(k))}</td></tr>`).join('')}</table></div>`); },
  novaCliente: async () => { const c = await editar(app, 'clientes'); if (c) { app.render(); app.abrir('cliente', c.id); } },
  editarCli: async (d) => { if (await editar(app, 'clientes', cli(app, d.id))) reab(); },
  excluirCli: (d) => excluir(app, 'clientes', d.id),
  vip: (d) => { const c = cli(app, d.id); const t = new Set(c.tags || []); t.has('VIP') ? t.delete('VIP') : t.add('VIP'); app.db.salvar('clientes', { id: d.id, tags: [...t] }); reab(); },
  novoServico: async () => { if (await editar(app, 'servicos')) app.render(); },
  novoProduto: async () => { if (await editar(app, 'produtos')) app.render(); },
  novoPacote: async (d = {}) => { if (await editar(app, 'pacotes', null, d.cliente ? { cliente: d.cliente } : {})) reab(); },
  novoProf: async () => { if (await editar(app, 'profissionais')) app.render(); },
  editarProf: async (d) => { if (await editar(app, 'profissionais', prof(app, d.id))) app.render(); },
  mesCom: (d, el) => { app.estado.com.mes = el.value; app.render(); },
  imprimirCom: () => window.print(),
  menuAg: (d, el) => pop(el, [
    { rotulo: 'Remarcar', icone: 'calendar-blank', acao: () => app.acoes.remarcar(d) },
    { rotulo: 'Marcar falta', icone: 'user-focus', acao: () => app.acoes.statusAg({ id: d.id, s: 'faltou' }) },
    { sep: true },
    { rotulo: 'Cancelar agendamento', icone: 'x-circle', perigo: true, acao: async () => { if (await confirmar('Cancelar este agendamento? O horário fica livre na agenda.', { rotulo: 'Cancelar agendamento', perigo: true })) app.acoes.statusAg({ id: d.id, s: 'cancelado' }); } },
  ]),
  onlineEscolhe: (d) => { const st = app.estado.online; st[d.k] = d.v; st.passo = { servico: 2, prof: 3, hora: 4 }[d.k]; if (d.k === 'servico') st.prof = ''; if (d.k === 'prof') { const s = serv(app, st.servico); st.data = Array.from({ length: 10 }, (_, i) => diaMais(i)).find((dd) => horariosLivres(app, d.v, dd, s.duracao).length) || diaMais(1); } app.render(); },
  onlineDia: (d) => { app.estado.online.data = d.v; app.render(); },
  onlineVolta: () => { app.estado.online.passo = Math.max(1, app.estado.online.passo - 1); app.render(); },
  onlineNovo: () => { app.estado.online = null; app.render(); },
  onlineConfirma: () => {
    const st = app.estado.online, nome = document.querySelector('[data-on="nome"]').value.trim() || 'Cliente online', tel = document.querySelector('[data-on="tel"]').value;
    let c = app.db.lista('clientes').find((x) => x.telefone === tel); if (!c) c = app.db.salvar('clientes', { nome, telefone: tel, criado: hoje(), tags: [], origem: 'Instagram' });
    const s = serv(app, st.servico);
    const ag = app.db.salvar('agendamentos', { cliente: c.id, profissional: st.prof, data: st.data, ini: st.hora, duracao: s.duracao, servicos: [s.id], valor: s.preco, status: 'agendado', origem: 'online', criado: hoje() });
    app.db.registrar(`agendamentos:${ag.id}`, 'Agendado pela página online', { icone: 'globe' });
    st.passo = 5; avisar(`Novo agendamento online: ${nome.split(' ')[0]}, ${dataCurta(st.data)} às ${st.hora}`); app.render();
  },
  copiarLink: () => app.acoes.linkAgendar(),
  linkAgendar: () => app.portal.compartilhar('agendar', '', { titulo: 'Página de agendamento online', qr: true, texto: `Agende o seu horário no ${app.empresa} pelo link:` }),
  sinalPct: async (d, el) => { if (Number(el.value) && !(await app.pedirPix('Para cobrar o sinal no agendamento online, cadastre a chave PIX do salão.'))) { el.value = '0'; return; } app.db.cfg.sinal_pct = Number(el.value); app.db.gravar(); app.portal.publicar(); avisar(Number(el.value) ? `Sinal de ${el.value}% ligado` : 'Sinal desligado'); app.render(); },
  salvarFidel: () => { const f = document.querySelector('[data-fidel]'); app.db.cfg.fidelidade = { a_cada: Math.max(3, Number(f.a_cada.value) || 10), premio: f.premio.value }; app.db.gravar(); avisar('Cartão fidelidade salvo'); },
  resgatar: (d) => { const c = cli(app, d.id); app.db.salvar('clientes', { id: d.id, resgates: (c.resgates || 0) + 1 }); app.db.registrar(`clientes:${d.id}`, `Prêmio do cartão fidelidade resgatado: ${fidel(app).premio}`, { icone: 'gift', tom: 'ok' }); avisar('Prêmio resgatado · cartão zerado'); reab(); },
  novaEspera: async () => {
    const r = await modal({ titulo: 'Adicionar à lista de espera', largura: 480, corpo: `<form class="form-grade"><label class="campo largo">Cliente<select name="c">${app.db.lista('clientes').sort((x, y) => x.nome.localeCompare(y.nome)).map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select></label><label class="campo largo">Serviço<select name="s">${app.db.lista('servicos').map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join('')}</select></label><label class="campo largo">Preferência de dia e horário<input name="p" placeholder="Ex.: sábado de manhã"></label></form>`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Adicionar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
    if (!r) return; app.db.salvar('espera', { cliente: r.c, servico: r.s, preferencia: r.p, criado: hoje(), atendida: false }); avisar('Adicionada à lista de espera'); app.render();
  },
  esperaFeita: (d) => { app.db.salvar('espera', { id: d.id, atendida: true }); app.render(); },
  oferecerVaga: (d) => {
    const x = app.db.obter('agendamentos', d.id), l = esperaPara(app, x);
    modal({ titulo: 'Horário liberado', largura: 520, corpo: `<p class="mute-2">${esc(nomesServ(app, x))} · ${dataCurta(x.data)} às ${x.ini} com ${esc(prof(app, x.profissional)?.nome || '')}. Quem está na lista de espera:</p><ul class="lista" style="margin:8px -18px 0">${l.map((e) => { const c = cli(app, e.cliente); return `<li>${av(c?.nome || '?')}<div class="cresce"><div class="t">${esc(c?.nome || '')}</div><div class="s">${esc(e.preferencia || 'qualquer horário')}</div></div><a class="btn peq pri" target="_blank" rel="noopener" href="${telLink(c?.telefone)}?text=${encodeURIComponent(`Oi, ${c?.nome.split(' ')[0]}! Abriu um horário para ${serv(app, e.servico)?.nome}: ${dataBR(x.data)} às ${x.ini}. Quer que eu reserve para você?`)}">${ic('whatsapp-logo')}Oferecer</a></li>`; }).join('')}</ul>`, botoes: [{ rotulo: 'Fechar', valor: null, classe: 'fant' }] });
  },
});

// ferramentas no menu da esquerda (WhatsApp e copiar); avisos e mensagens prontas: plano Pro
Object.assign(app.acoes, acoesLado());
app.travarLado = travarPro;
