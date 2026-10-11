// Nexo Agenda · salão, estética e clínicas: agenda por profissional, clientes, serviços, pacotes e comissões
import { criarApp, esc, moeda, dataBR, diaMais, diasAte, hoje, iniciais, sorteio, kpi, cartao, progresso, graficoBarras, editar, modal, avisar } from '../base/nucleo.js';

const STATUS = ['Agendado', 'Confirmado', 'Concluído', 'Faltou', 'Cancelado'];
const COR_STATUS = { Agendado: '', Confirmado: 'info', 'Concluído': 'ok', Faltou: 'er', Cancelado: 'al' };
const PAGAMENTOS = ['PIX', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Pacote'];
const ABRE = 8, FECHA = 20;

function exemplo() {
  const r = sorteio(7), escolha = (l) => l[Math.floor(r() * l.length)];
  const profissionais = [['p0', 'Larissa Mendes', 'Cabelo', 40, '#db2777'], ['p1', 'Tainá Rocha', 'Unhas', 50, '#7c3aed'], ['p2', 'Bruna Vieira', 'Estética facial', 35, '#0891b2'], ['p3', 'Marcos Lima', 'Barbearia', 45, '#ea580c']]
    .map(([id, nome, especialidade, comissao, cor]) => ({ id, nome, especialidade, comissao, cor }));
  const servicos = [
    ['s0', 'Corte feminino', 'Cabelo', 60, 90, 'p0'], ['s1', 'Escova', 'Cabelo', 45, 60, 'p0'], ['s2', 'Coloração', 'Cabelo', 120, 220, 'p0'], ['s3', 'Hidratação', 'Cabelo', 45, 80, 'p0'],
    ['s4', 'Manicure', 'Unhas', 45, 40, 'p1'], ['s5', 'Pedicure', 'Unhas', 50, 45, 'p1'], ['s6', 'Esmaltação em gel', 'Unhas', 60, 85, 'p1'],
    ['s7', 'Limpeza de pele', 'Estética facial', 75, 150, 'p2'], ['s8', 'Design de sobrancelha', 'Estética facial', 30, 55, 'p2'], ['s9', 'Drenagem linfática', 'Corporal', 60, 130, 'p2'],
    ['s10', 'Corte masculino', 'Barbearia', 30, 50, 'p3'], ['s11', 'Barba', 'Barbearia', 30, 40, 'p3'], ['s12', 'Corte + barba', 'Barbearia', 60, 80, 'p3'],
  ].map(([id, nome, categoria, duracao, preco, prof]) => ({ id, nome, categoria, duracao, preco, profissional: prof }));
  const nomes = ['Aline Ferraz', 'Bianca Moreira', 'Carolina Dias', 'Daniela Paiva', 'Elaine Cardoso', 'Fabiana Reis', 'Gabriela Torres', 'Helena Campos', 'Isabela Freitas', 'Joana Matos', 'Karina Neves', 'Letícia Pacheco', 'Mônica Sales', 'Natália Brito', 'Olívia Antunes', 'Paula Siqueira', 'Rodrigo Alves', 'Sérgio Monteiro', 'Vinícius Prado', 'Yasmin Leal'];
  const clientes = nomes.map((nome, i) => {
    const mes = String(i % 3 === 0 ? new Date().getMonth() + 1 : ((i * 5) % 12) + 1).padStart(2, '0');
    return { id: `c${i}`, nome, telefone: `(11) 9${8200 + i * 17}-${3100 + i * 29}`, nascimento: `${1975 + (i * 3) % 30}-${mes}-${String(3 + (i * 7) % 25).padStart(2, '0')}`,
      observacoes: i % 6 === 0 ? 'Alergia a amônia — usar coloração sem amônia.' : i % 7 === 0 ? 'Prefere horários no fim da tarde.' : '' };
  });
  const agendamentos = [];
  for (let d = -40; d <= 6; d++) {
    const data = diaMais(d);
    for (const p of profissionais) {
      let h = ABRE * 60 + Math.floor(r() * 3) * 30;
      const n = d === 0 ? 7 + Math.floor(r() * 3) : 3 + Math.floor(r() * 4);
      for (let k = 0; k < n && h < (FECHA - 1) * 60; k++) {
        const s = escolha(servicos.filter((x) => x.profissional === p.id));
        const status = d < 0 ? (r() < 0.08 ? 'Faltou' : r() < 0.05 ? 'Cancelado' : 'Concluído') : d === 0 && h < new Date().getHours() * 60 ? 'Concluído' : r() < 0.55 ? 'Confirmado' : 'Agendado';
        agendamentos.push({ cliente: escolha(clientes).id, servico: s.id, profissional: p.id, data, hora: `${String(Math.floor(h / 60)).padStart(2, '0')}:${String(h % 60).padStart(2, '0')}`,
          duracao: s.duracao, valor: s.preco, status, pagamento: status === 'Concluído' ? escolha(PAGAMENTOS.slice(0, 4)) : '' });
        h += s.duracao + (d === 0 ? 30 + Math.floor(r() * 2) * 30 : Math.floor(r() * 4) * 30);
      }
    }
  }
  const pacotes = [
    { cliente: 'c1', servico: 's9', sessoes: 10, usadas: 6, valor: 1100, validade: diaMais(60) },
    { cliente: 'c4', servico: 's7', sessoes: 5, usadas: 2, valor: 650, validade: diaMais(90) },
    { cliente: 'c8', servico: 's6', sessoes: 4, usadas: 4, valor: 300, validade: diaMais(-5) },
    { cliente: 'c12', servico: 's3', sessoes: 6, usadas: 1, valor: 420, validade: diaMais(120) },
  ];
  return { profissionais, servicos, clientes, agendamentos, pacotes };
}
let cache = null;
const seed = (n) => () => { if (!cache) cache = exemplo(); return cache[n]; };

const colecoes = {
  agendamentos: {
    singular: 'agendamento', plural: 'agendamentos', seed: seed('agendamentos'),
    campos: [
      { nome: 'cliente', rotulo: 'Cliente', tipo: 'relacao', colecao: 'clientes', obrigatorio: true, lista: true },
      { nome: 'servico', rotulo: 'Serviço', tipo: 'relacao', colecao: 'servicos', obrigatorio: true, lista: true },
      { nome: 'profissional', rotulo: 'Profissional', tipo: 'relacao', colecao: 'profissionais', obrigatorio: true, lista: true, filtro: true },
      { nome: 'data', rotulo: 'Data', tipo: 'data', obrigatorio: true, lista: true, padrao: hoje },
      { nome: 'hora', rotulo: 'Hora', tipo: 'hora', obrigatorio: true, lista: true, padrao: '10:00' },
      { nome: 'status', rotulo: 'Situação', tipo: 'selecao', opcoes: STATUS, obrigatorio: true, lista: true, filtro: true, padrao: 'Agendado', cores: COR_STATUS },
      { nome: 'valor', rotulo: 'Valor', tipo: 'moeda', lista: true },
      { nome: 'pagamento', rotulo: 'Pagamento', tipo: 'selecao', opcoes: PAGAMENTOS },
    ],
    validar: (d) => (d.hora < `${String(ABRE).padStart(2, '0')}:00` || d.hora >= `${FECHA}:00` ? `O salão atende das ${ABRE}h às ${FECHA}h.` : null),
    aoSalvar: (x, app) => { const s = app.db.obter('servicos', x.servico); app.db.salvar('agendamentos', { id: x.id, duracao: s?.duracao || 60, ...(x.valor == null ? { valor: s?.preco || 0 } : {}) }); },
  },
  clientes: {
    singular: 'cliente', plural: 'clientes', seed: seed('clientes'),
    subtitulo: (x) => x.observacoes || '',
    campos: [
      { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, lista: true },
      { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel', obrigatorio: true, lista: true },
      { nome: 'nascimento', rotulo: 'Nascimento', tipo: 'data', lista: true, ocultaCel: true },
      { nome: 'observacoes', rotulo: 'Observações (alergias, preferências)', tipo: 'texto-longo' },
      { nome: 'ultima', rotulo: 'Última visita', tipo: 'data', somenteLista: true, lista: true, ocultaCel: true,
        exibir: (x, app) => { const v = app.db.lista('agendamentos').filter((a) => a.cliente === x.id && a.status === 'Concluído').map((a) => a.data).sort().pop(); return v ? `${dataBR(v)}${diasAte(v) < -45 ? ' <span class="selo al">sumida</span>' : ''}` : '<span class="muted">—</span>'; } },
    ],
  },
  servicos: {
    singular: 'serviço', plural: 'serviços', seed: seed('servicos'),
    campos: [
      { nome: 'nome', rotulo: 'Serviço', tipo: 'texto', obrigatorio: true, lista: true },
      { nome: 'categoria', rotulo: 'Categoria', tipo: 'selecao', opcoes: ['Cabelo', 'Unhas', 'Estética facial', 'Corporal', 'Barbearia'], lista: true, filtro: true },
      { nome: 'duracao', rotulo: 'Duração (min)', tipo: 'numero', obrigatorio: true, lista: true },
      { nome: 'preco', rotulo: 'Preço', tipo: 'moeda', obrigatorio: true, lista: true },
      { nome: 'profissional', rotulo: 'Profissional principal', tipo: 'relacao', colecao: 'profissionais', lista: true, ocultaCel: true },
    ],
  },
  profissionais: {
    singular: 'profissional', plural: 'profissionais', seed: seed('profissionais'),
    campos: [
      { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, lista: true },
      { nome: 'especialidade', rotulo: 'Especialidade', tipo: 'texto', lista: true },
      { nome: 'comissao', rotulo: 'Comissão (%)', tipo: 'numero', obrigatorio: true, lista: true },
      { nome: 'cor', rotulo: 'Cor na agenda', tipo: 'texto', padrao: '#4f46e5', exibir: (x) => `<span class="selo" style="color:${esc(x.cor)}">${esc(x.cor)}</span>` },
    ],
  },
  pacotes: {
    singular: 'pacote', plural: 'pacotes', seed: seed('pacotes'),
    campos: [
      { nome: 'cliente', rotulo: 'Cliente', tipo: 'relacao', colecao: 'clientes', obrigatorio: true, lista: true },
      { nome: 'servico', rotulo: 'Serviço', tipo: 'relacao', colecao: 'servicos', obrigatorio: true, lista: true },
      { nome: 'sessoes', rotulo: 'Sessões', tipo: 'numero', obrigatorio: true, lista: true, exibir: (x) => `${x.usadas || 0} de ${x.sessoes} ${progresso(((x.usadas || 0) / x.sessoes) * 100)}` },
      { nome: 'usadas', rotulo: 'Sessões usadas', tipo: 'numero', padrao: 0 },
      { nome: 'valor', rotulo: 'Valor pago', tipo: 'moeda', obrigatorio: true, lista: true },
      { nome: 'validade', rotulo: 'Validade', tipo: 'data', lista: true, padrao: () => diaMais(90),
        exibir: (x) => `${dataBR(x.validade)}${diasAte(x.validade) < 0 ? ' <span class="selo er">vencido</span>' : (x.usadas >= x.sessoes ? ' <span class="selo">usado</span>' : diasAte(x.validade) < 15 ? ' <span class="selo al">vence logo</span>' : '')}` },
    ],
  },
};

// ---------------------------------------------------------------- páginas
const nome = (app, col, id, campo = 'nome') => app.db.obter(col, id)?.[campo] || '—';
const doMes = (d) => d.slice(0, 7) === hoje().slice(0, 7);

function painel(app) {
  const ag = app.db.lista('agendamentos');
  const hojeL = ag.filter((a) => a.data === hoje() && a.status !== 'Cancelado').sort((a, b) => a.hora.localeCompare(b.hora));
  const mes = ag.filter((a) => doMes(a.data));
  const fatMes = mes.filter((a) => a.status === 'Concluído').reduce((s, a) => s + (a.valor || 0), 0);
  const fatHoje = hojeL.filter((a) => a.status === 'Concluído').reduce((s, a) => s + (a.valor || 0), 0);
  const passados = mes.filter((a) => a.data < hoje() && ['Concluído', 'Faltou'].includes(a.status));
  const faltas = passados.length ? Math.round((passados.filter((a) => a.status === 'Faltou').length / passados.length) * 100) : 0;
  const aniv = app.db.lista('clientes').filter((c) => c.nascimento?.slice(5, 7) === hoje().slice(5, 7)).sort((a, b) => a.nascimento.slice(8).localeCompare(b.nascimento.slice(8)));
  const semanas = Array.from({ length: 6 }, (_, i) => { const fim = diaMais(-7 * (5 - i)); const ini = diaMais(-6, new Date(`${fim}T12:00`)); return { rotulo: dataBR(ini).slice(0, 5), v: ag.filter((a) => a.data >= ini && a.data <= fim && a.status === 'Concluído').reduce((s, a) => s + a.valor, 0) }; });
  const porServ = {}; mes.filter((a) => a.status === 'Concluído').forEach((a) => { porServ[a.servico] = (porServ[a.servico] || 0) + 1; });
  const top = Object.entries(porServ).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return `<div class="kpis">
      ${kpi({ icone: '◷', rotulo: 'Atendimentos hoje', valor: hojeL.length, nota: `${hojeL.filter((a) => a.status === 'Confirmado').length} confirmados` })}
      ${kpi({ icone: '$', rotulo: 'Faturado hoje', valor: moeda(fatHoje), tom: 'ok', nota: 'atendimentos concluídos' })}
      ${kpi({ icone: '▲', rotulo: 'Faturado no mês', valor: moeda(fatMes), nota: `${mes.filter((a) => a.status === 'Concluído').length} atendimentos` })}
      ${kpi({ icone: '!', rotulo: 'Faltas no mês', valor: `${faltas}%`, tom: faltas > 8 ? 'er' : 'ok', nota: 'confirmar por WhatsApp reduz faltas' })}
    </div>
    <div class="grade g-21">
      ${cartao('Agenda de hoje', hojeL.length ? `<ul class="lista-simples">${hojeL.map((a) => { const p = app.db.obter('profissionais', a.profissional); return `<li><span class="avatar" style="background:${p?.cor}22;color:${p?.cor}">${esc(a.hora)}</span><div><b>${esc(nome(app, 'clientes', a.cliente))}</b><div class="muted" style="font-size:12.5px">${esc(nome(app, 'servicos', a.servico))} · ${esc(p?.nome || '')}</div></div><div class="dir"><span class="selo ${COR_STATUS[a.status]}">${a.status}</span></div></li>`; }).join('')}</ul>` : '<div class="vazio">Nenhum atendimento hoje.</div>', { acoes: '<a class="btn peq" href="#/agenda">Abrir agenda</a>' })}
      ${cartao('Aniversariantes do mês', aniv.length ? `<ul class="lista-simples">${aniv.map((c) => `<li><span class="avatar">${iniciais(c.nome)}</span><div><b>${esc(c.nome)}</b><div class="muted" style="font-size:12.5px">${dataBR(c.nascimento).slice(0, 5)}</div></div><div class="dir"><button type="button" class="btn peq" data-acao="parabens" data-id="${c.id}">Mensagem</button></div></li>`).join('')}</ul>` : '<div class="vazio">Ninguém este mês.</div>', { sub: 'uma mensagem traz a cliente de volta' })}
    </div>
    <div class="grade g2">
      ${cartao('Faturamento por semana', graficoBarras({ dados: semanas.map((s) => ({ rotulo: s.rotulo, valores: [s.v] })), series: [{ nome: 'Faturado', cor: 'var(--acc)' }], formato: (v) => `R$ ${(v / 1000).toFixed(1)}k` }), { sub: 'atendimentos concluídos' })}
      ${cartao('Serviços mais feitos no mês', top.length ? top.map(([sid, n]) => `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:13px"><span>${esc(nome(app, 'servicos', sid))}</span><b>${n}</b></div><div style="margin-top:5px">${progresso((n / top[0][1]) * 100)}</div></div>`).join('') : '<div class="vazio">Sem atendimentos no mês.</div>')}
    </div>`;
}

function agenda(app) {
  const dia = app.estado.dia ||= hoje();
  const profs = app.db.lista('profissionais');
  const ag = app.db.lista('agendamentos').filter((a) => a.data === dia && a.status !== 'Cancelado');
  const horas = Array.from({ length: FECHA - ABRE }, (_, i) => ABRE + i);
  const px = 48 / 60;
  const titulo = new Date(`${dia}T12:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  return `<div class="barra-ferr"><button type="button" class="btn" data-acao="dia" data-id="-1" aria-label="Dia anterior">‹</button><button type="button" class="btn" data-acao="dia" data-id="0">Hoje</button><button type="button" class="btn" data-acao="dia" data-id="1" aria-label="Próximo dia">›</button>
      <b style="font-size:15px;text-transform:capitalize">${esc(titulo)}</b><span class="muted">${ag.length} atendimentos · ${moeda(ag.reduce((s, a) => s + (a.valor || 0), 0))} previstos</span>
      <span class="muted" style="margin-left:auto">Clique num horário vago para agendar</span></div>
    <div class="cal" style="--cols:${profs.length}">
      <div class="cal-cab"></div>${profs.map((p) => `<div class="cal-cab"><span class="avatar" style="display:inline-grid;width:22px;height:22px;font-size:10px;background:${p.cor}22;color:${p.cor}">${iniciais(p.nome)}</span> ${esc(p.nome.split(' ')[0])}<div class="muted" style="font-weight:400;font-size:11.5px">${esc(p.especialidade)}</div></div>`).join('')}
      <div class="cal-hora">${horas.map((h) => `<div class="cal-faixa" style="border:0;padding-top:2px">${h}:00</div>`).join('')}</div>
      ${profs.map((p) => `<div class="cal-col" data-id="${p.id}">${horas.map(() => '<div class="cal-faixa"></div>').join('')}
        ${ag.filter((a) => a.profissional === p.id).map((a) => { const [hh, mm] = a.hora.split(':').map(Number); const top = ((hh - ABRE) * 60 + mm) * px; return `<div class="cal-evento ${a.status === 'Concluído' ? 'feito' : a.status === 'Faltou' ? 'falta' : ''}" style="top:${top}px;height:${Math.max(22, (a.duracao || 60) * px - 3)}px;${['Agendado', 'Confirmado'].includes(a.status) ? `border-left-color:${p.cor};background:${p.cor}14` : ''}" data-acao="evento" data-id="${a.id}"><b>${esc(a.hora)} ${esc(nome(app, 'clientes', a.cliente))}</b>${esc(nome(app, 'servicos', a.servico))}${a.status === 'Confirmado' ? ' · ✓' : ''}</div>`; }).join('')}
      </div>`).join('')}
    </div>`;
}

function comissoes(app) {
  const mes = app.db.lista('agendamentos').filter((a) => doMes(a.data) && a.status === 'Concluído');
  const linhas = app.db.lista('profissionais').map((p) => { const l = mes.filter((a) => a.profissional === p.id); const fat = l.reduce((s, a) => s + (a.valor || 0), 0); return { p, n: l.length, fat, com: (fat * (p.comissao || 0)) / 100 }; });
  const t = linhas.reduce((s, x) => ({ n: s.n + x.n, fat: s.fat + x.fat, com: s.com + x.com }), { n: 0, fat: 0, com: 0 });
  return cartao(`Comissões de ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`, `<table class="tabela"><thead><tr><th>Profissional</th><th class="num">Atendimentos</th><th class="num">Faturado</th><th class="num">Comissão</th><th class="num">A pagar</th></tr></thead>
    <tbody>${linhas.map((x) => `<tr><td><b>${esc(x.p.nome)}</b><span class="sub">${esc(x.p.especialidade)}</span></td><td class="num">${x.n}</td><td class="num">${moeda(x.fat)}</td><td class="num">${x.p.comissao}%</td><td class="num"><b>${moeda(x.com)}</b></td></tr>`).join('')}
    <tr><td><b>Total</b></td><td class="num"><b>${t.n}</b></td><td class="num"><b>${moeda(t.fat)}</b></td><td></td><td class="num"><b>${moeda(t.com)}</b></td></tr></tbody></table>`, { semPad: true, sub: 'atendimentos concluídos no mês', acoes: '<button type="button" class="btn" data-acao="imprimir">Imprimir</button>' });
}

const app = criarApp({
  id: 'agenda', nome: 'Nexo Agenda', sub: 'Salão & estética', cor: '#db2777', inicial: 'A', empresa: 'Studio Lumière', empresaSub: '4 profissionais · Rua das Flores, 120',
  produto: { compra: 2990, mensal: 149 },
  colecoes,
  menu: [
    { grupo: 'Atendimento' },
    { id: 'painel', rotulo: 'Painel', icone: '◧', titulo: 'Painel do salão', sub: () => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }), pagina: painel },
    { id: 'agenda', rotulo: 'Agenda', icone: '▦', titulo: 'Agenda', pagina: agenda, acoes: () => '<button type="button" class="btn pri" data-novo="agendamentos">+ Agendar</button>' },
    { id: 'agendamentos', rotulo: 'Agendamentos', icone: '☰', crud: 'agendamentos', opcoes: { ordem: 'data', desc: true } },
    { id: 'clientes', rotulo: 'Clientes', icone: '☺', crud: 'clientes', opcoes: { ordem: 'nome' } },
    { id: 'pacotes', rotulo: 'Pacotes', icone: '◫', crud: 'pacotes' },
    { grupo: 'Cadastros' },
    { id: 'servicos', rotulo: 'Serviços', icone: '✂', crud: 'servicos', opcoes: { ordem: 'categoria' } },
    { id: 'profissionais', rotulo: 'Profissionais', icone: '★', crud: 'profissionais' },
    { grupo: 'Gestão' },
    { id: 'comissoes', rotulo: 'Comissões', icone: '%', titulo: 'Comissões', pagina: comissoes },
  ],
});
app.acoes = {
  dia: (n) => { app.estado.dia = Number(n) === 0 ? hoje() : diaMais(Number(n), new Date(`${app.estado.dia}T12:00`)); },
  imprimir: () => { window.print(); return false; },
  parabens: async (id) => {
    const c = app.db.obter('clientes', id);
    await modal({ titulo: `Mensagem para ${c.nome.split(' ')[0]}`, largura: 480, corpo: `<p class="muted" style="margin-top:0">No sistema real, o botão abre o WhatsApp com a mensagem pronta.</p><div class="cartao" style="padding:14px;background:#e7fbe9">Oi, ${esc(c.nome.split(' ')[0])}! Feliz aniversário 🎉 Para comemorar, você ganha 15% em qualquer serviço este mês aqui no Studio Lumière. É só responder para agendar.</div>`, botoes: [{ rotulo: 'Fechar', classe: 'pri' }] });
    return false;
  },
  evento: async (id) => {
    const a = app.db.obter('agendamentos', id), c = app.db.obter('clientes', a.cliente);
    const r = await modal({ titulo: `${a.hora} · ${c?.nome || ''}`, largura: 520,
      corpo: `<p style="margin-top:0"><b>${esc(nome(app, 'servicos', a.servico))}</b> com ${esc(nome(app, 'profissionais', a.profissional))} · ${moeda(a.valor)}</p>${c?.observacoes ? `<p class="selo al" style="white-space:normal">${esc(c.observacoes)}</p>` : ''}<p class="muted">Situação atual: <span class="selo ${COR_STATUS[a.status]}">${a.status}</span></p>`,
      botoes: [{ rotulo: 'Editar', valor: 'editar' }, { rotulo: 'Faltou', valor: 'Faltou' }, { rotulo: 'Lembrete WhatsApp', valor: 'lembrete' }, { rotulo: 'Confirmar', valor: 'Confirmado' }, { rotulo: 'Concluir', classe: 'pri', valor: 'Concluído' }] });
    if (!r) return false;
    if (r === 'editar') { await editar(app, 'agendamentos', a); return; }
    if (r === 'lembrete') { await modal({ titulo: 'Lembrete', largura: 460, corpo: `<div class="cartao" style="padding:14px;background:#e7fbe9">Oi, ${esc(c.nome.split(' ')[0])}! Lembrando do seu horário ${a.data === hoje() ? 'hoje' : `em ${dataBR(a.data)}`} às ${a.hora} (${esc(nome(app, 'servicos', a.servico))}). Responda 1 para confirmar ou 2 para remarcar.</div><p class="muted">No sistema real, vai automático pelo WhatsApp um dia antes.</p>`, botoes: [{ rotulo: 'Fechar', classe: 'pri' }] }); return false; }
    app.db.salvar('agendamentos', { id, status: r, ...(r === 'Concluído' && !a.pagamento ? { pagamento: 'PIX' } : {}) });
    avisar(`Marcado como ${r.toLowerCase()}`);
  },
};
// clicar num horário vago da agenda abre o agendamento já com profissional, dia e hora
document.addEventListener('click', async (e) => {
  const col = e.target.closest('.cal-col');
  if (!col || e.target.closest('.cal-evento')) return;
  const r = col.getBoundingClientRect(), min = Math.floor(((e.clientY - r.top) / 48) * 2) * 30 + ABRE * 60;
  const hora = `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  if (await editar(app, 'agendamentos', null, { profissional: col.dataset.id, data: app.estado.dia || hoje(), hora })) app.render();
}, true);
