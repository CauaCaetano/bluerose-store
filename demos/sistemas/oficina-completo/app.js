// Veltria Oficina Completo · protótipo "quadro do chefe de oficina" para oficina com vários mecânicos.
// Linha do tempo do dia por mecânico, agendamentos que chegam pelo link, ordens de serviço com tempo padrão e
// código de peça, estoque com compra do que falta, clientes com lembrete de revisão em massa, financeiro com
// comissões, notas fiscais, relatórios de produtividade, equipe, ajustes e IA. Dados de exemplo (?novo recomeça).

const CHAVE = 'veltria-oficina-completo-v1';
const R$ = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const e = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const plano = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nv = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const novoId = () => `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const el = (s) => document.querySelector(s);
const hh = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
const dt = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return o === 0 ? 'hoje' : o === 1 ? 'amanhã' : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', ''); };
const agoraH = () => { const d = new Date(); return Math.min(18, Math.max(8, d.getHours() + d.getMinutes() / 60)); };

// tempo padrão de cada serviço (horas), como nas tabelas de tempo das montadoras
const TEMPOS = { 'Troca de óleo e filtro': 0.5, 'Troca de pastilhas (eixo)': 1, 'Troca de discos e pastilhas (eixo)': 1.6, 'Troca de embreagem': 4, 'Correia dentada e tensor': 3, 'Alinhamento e balanceamento': 0.8, 'Diagnóstico eletrônico': 0.7, 'Troca de amortecedores (par)': 2, 'Limpeza de bicos injetores': 1.2, 'Revisão completa': 3 };

function patio() {
  const mec = [{ id: 'm1', nome: 'Robson', esp: 'Motor e câmbio', comissao: 30 }, { id: 'm2', nome: 'Diego', esp: 'Freios e suspensão', comissao: 25 }, { id: 'm3', nome: 'Fábio', esp: 'Elétrica e injeção', comissao: 30 }, { id: 'm4', nome: 'Kauã', esp: 'Rápidos e alinhamento', comissao: 20 }];
  const sv = (nome, valor) => ({ nome, tempo: TEMPOS[nome], valor });
  const OS = (num, placa, modelo, cliente, tel, mec, ini, status, servs, pecas, real) => ({ id: `o${num}`, num, placa, modelo, cliente, tel, mec, ini, status, servicos: servs, pecas, real, pago: false, nota: null, km: 40000 + num * 1213 % 90000 });
  const os = [
    OS(512, 'RJK4A11', 'Jeep Compass 2020', 'Lívia Campos', '31988004411', 'm1', 8, 'em-servico', [sv('Correia dentada e tensor', 680), sv('Revisão completa', 520)], [{ cod: 'CT1201K2', nome: 'Kit correia dentada', qtd: 1, valor: 845 }, { cod: 'W712/95', nome: 'Filtro de óleo', qtd: 1, valor: 48 }], 3.5),
    OS(513, 'PLM7C30', 'Fiat Argo 2022', 'Jorge Teixeira', '31991110022', 'm2', 8.5, 'feito', [sv('Troca de discos e pastilhas (eixo)', 260)], [{ cod: 'BD1745', nome: 'Discos de freio (par)', qtd: 1, valor: 420 }, { cod: 'PD/1043', nome: 'Pastilhas dianteiras', qtd: 1, valor: 198 }], 1.4),
    OS(514, 'QAB2D88', 'Chevrolet S10 2018', 'Transportes Lima', '31932227788', 'm2', 11, 'esperando-peca', [sv('Troca de amortecedores (par)', 380)], [{ cod: 'GP32988', nome: 'Amortecedores dianteiros (par)', qtd: 1, valor: 1260 }], 0),
    OS(515, 'SDX9E21', 'Toyota Yaris 2021', 'Carla Nogueira', '31996663355', 'm3', 9, 'em-servico', [sv('Diagnóstico eletrônico', 140), sv('Limpeza de bicos injetores', 260)], [], 1.1),
    OS(516, 'OPQ1F45', 'VW Polo 2019', 'Marcos Paiva', '31993332211', 'm4', 8, 'feito', [sv('Troca de óleo e filtro', 80), sv('Alinhamento e balanceamento', 140)], [{ cod: '5W40-VW', nome: 'Óleo 5W40 (4 L)', qtd: 1, valor: 236 }, { cod: 'W712/95', nome: 'Filtro de óleo', qtd: 1, valor: 48 }], 1.6),
    OS(517, 'MNB3G67', 'Honda HR-V 2017', 'Priscila Moura', '31994445566', 'm4', 10, 'aguardando-aprov', [sv('Troca de pastilhas (eixo)', 160)], [{ cod: 'PD/1180', nome: 'Pastilhas dianteiras', qtd: 1, valor: 236 }], 0),
    OS(518, 'KJH5H09', 'Renault Duster 2016', 'Antônio Freitas', '31987776655', 'm1', 14, 'agendado', [sv('Troca de embreagem', 620)], [{ cod: 'KIT-EMB-DU', nome: 'Kit embreagem Duster', qtd: 1, valor: 1180 }], 0),
    OS(519, 'LKP8J12', 'Hyundai Creta 2023', 'Beatriz Reis', '31991239876', 'm3', 14, 'agendado', [sv('Revisão completa', 520)], [], 0),
  ];
  const estoque = [['W712/95', 'Filtro de óleo', 'VW/Fiat/GM 1.0-1.6', 3, 10, 21, 48, 'Distribuidora Autopeças BH'], ['PD/1043', 'Pastilhas dianteiras', 'Argo/Cronos', 2, 4, 88, 198, 'Freios Center'], ['BD1745', 'Discos de freio (par)', 'Argo/Cronos/Mobi', 1, 2, 210, 420, 'Freios Center'], ['5W40-VW', 'Óleo 5W40 (4 L)', 'VW TSI', 6, 6, 128, 236, 'Lubrificantes Minas'], ['CT1201K2', 'Kit correia dentada', 'Compass/Renegade 2.0', 0, 1, 470, 845, 'Distribuidora Autopeças BH'], ['GP32988', 'Amortecedores dianteiros (par)', 'S10/Trailblazer', 0, 1, 690, 1260, 'Suspensão Forte'], ['PD/1180', 'Pastilhas dianteiras', 'HR-V/City/Fit', 5, 4, 104, 236, 'Freios Center'], ['VELA-NGK-6', 'Jogo de velas', '1.0/1.6 flex', 12, 6, 64, 148, 'Distribuidora Autopeças BH']]
    .map(([cod, nome, apl, qtd, min, custo, preco, forn]) => ({ cod, nome, apl, qtd, min, custo, preco, forn }));
  const agenda = [{ id: novoId(), nome: 'Rodrigo Alves', tel: '31992221100', placa: 'TYU6K45', modelo: 'Nissan Kicks 2021', servico: 'Revisão completa', dia: 1, hora: 9, status: 'pedido', origem: 'link do Instagram' }, { id: novoId(), nome: 'Sandra Melo', tel: '31998887766', placa: 'GHJ2L33', modelo: 'Fiat Toro 2019', servico: 'Troca de óleo e filtro', dia: 1, hora: 14, status: 'pedido', origem: 'Google' }, { id: novoId(), nome: 'Paulo Henrique', tel: '31993334455', placa: 'BNM1M22', modelo: 'Corolla 2018', servico: 'Alinhamento e balanceamento', dia: 2, hora: 10, status: 'confirmado', origem: 'WhatsApp' }];
  const historico = [['Lucas Andrade', '31991112233', 'ZXC7N88', 'Gol 2015', -200], ['Fernanda Lopes', '31994443322', 'VBN9P11', 'Onix 2019', -175], ['Ricardo Silva', '31996661199', 'ASD3Q44', 'HB20 2018', -40], ['Mônica Prado', '31997775533', 'QWE5R66', 'Kwid 2020', -380]].map(([nome, tel, placa, modelo, ultima]) => ({ nome, tel, placa, modelo, ultima }));
  return { oficina: { nome: 'Centro Automotivo Rota Certa', cnpj: '28.004.911/0001-63', abre: 8, fecha: 18 }, mecanicos: mec, os, estoque, agenda, historico, proxOs: 520, proxNota: 2041, pagar: [{ id: novoId(), desc: 'Freios Center (boleto)', valor: 1840, vence: 3, pago: false }, { id: novoId(), desc: 'Aluguel do galpão', valor: 6500, vence: 8, pago: false }], plano: 'basico', ajustes: { abrir: 'quadro', letra: 'normal', lembrarDias: 180 }, conversa: [] };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || patio(); } catch { return patio(); } })();
const salva = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { toast('Sem espaço no navegador.'); } };
const mec = (id) => db.mecanicos.find((m) => m.id === id) || { nome: '—', comissao: 0 };
const ordem = (id) => db.os.find((o) => o.id === id);
const tempoPadrao = (o) => o.servicos.reduce((s, x) => s + x.tempo, 0);
const valorOs = (o) => o.servicos.reduce((s, x) => s + x.valor, 0) + o.pecas.reduce((s, p) => s + p.qtd * p.valor, 0);
const STATUS = { agendado: ['Agendado', ''], 'aguardando-aprov': ['Esperando o cliente', 'a'], 'esperando-peca': ['Esperando peça', 'a'], 'em-servico': ['No serviço', 'e'], feito: ['Pronto', 'v'], entregue: ['Entregue', 'v'] };

function toast(t) { const a = document.createElement('div'); a.className = 'toast-o'; a.textContent = t; el('#toasts').append(a); setTimeout(() => a.remove(), 3300); }
function modal(html, fn) {
  const f = document.createElement('div'); f.className = 'fundo-o'; f.innerHTML = `<div class="modal-o" role="dialog" aria-modal="true">${html}</div>`;
  const a = document.activeElement; document.body.append(f);
  const fecha = () => { f.remove(); a?.focus?.(); };
  f.addEventListener('click', (ev) => { if (ev.target === f || ev.target.closest('[data-x]')) fecha(); });
  f.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') fecha(); });
  setTimeout(() => (f.querySelector('input, select, textarea') || f.querySelector('button'))?.focus(), 30);
  fn?.(f.querySelector('.modal-o'), fecha);
}
function form(t, campos, ok, fn) { modal(`<h2>${t}</h2><form>${campos}<div class="rodape-m"><button type="button" class="bo" data-x>Cancelar</button><button class="bo esc">${ok}</button></div></form>`, (m, fecha) => m.querySelector('form').addEventListener('submit', (ev) => { ev.preventDefault(); if (fn(new FormData(ev.target)) !== false) { salva(); fecha(); tela(); } })); }

// ------------------------------------------------------------------ seções
const SECOES = [['quadro', 'Quadro do dia'], ['ordens', 'Ordens de serviço'], ['agenda', 'Agendamentos'], ['pecas', 'Peças'], ['clientes', 'Clientes'], ['financeiro', 'Financeiro'], ['notas', 'Notas'], ['relatorios', 'Relatórios'], ['equipe', 'Equipe'], ['ajustes', 'Ajustes']];
const S = {
  quadro() {
    const hoje = db.os.filter((o) => o.status !== 'entregue'), ini = db.oficina.abre, fim = db.oficina.fecha, x = (h) => (h - ini) / (fim - ini) * 100;
    const prontos = hoje.filter((o) => o.status === 'feito'), faturar = prontos.reduce((s, o) => s + valorOs(o), 0);
    return `<div class="cabeca-o"><div><h1>Quadro do dia</h1><p>${hoje.length} carros no pátio · ${prontos.length} prontos · ${hoje.filter((o) => o.status === 'esperando-peca').length} esperando peça · ${db.agenda.filter((a) => a.status === 'pedido').length} agendamentos para confirmar</p></div><div class="lado"><button class="bo esc" data-a="nova-os">+ Ordem de serviço</button><a class="bo" href="#agenda">Agendamentos</a></div></div>
      <div class="grade-o" style="margin-bottom:14px"><div class="cx g3 ind esc"><small>Pronto para faturar</small><b>${R$(faturar)}</b><span>${prontos.length} carros</span></div><div class="cx g3 ind"><small>Horas vendidas hoje</small><b>${hoje.reduce((s, o) => s + tempoPadrao(o), 0).toLocaleString('pt-BR')} h</b><span>pelo tempo padrão</span></div><div class="cx g3 ind"><small>Ocupação dos mecânicos</small><b>${Math.round(hoje.reduce((s, o) => s + tempoPadrao(o), 0) / (db.mecanicos.length * (fim - ini)) * 100)}%</b><span>do dia</span></div><div class="cx g3 ind"><small>Peças em falta</small><b>${db.estoque.filter((p) => p.qtd < p.min).length}</b><span>abaixo do mínimo</span></div></div>
      <section class="cx quadro"><div class="q-regua"><div></div><div>${Array.from({ length: fim - ini }, (_, i) => `<span>${ini + i}h</span>`).join('')}</div></div>
      ${db.mecanicos.map((m) => `<div class="q-faixa"><div class="q-nome"><b>${e(m.nome)}</b><small>${e(m.esp)}</small></div><div class="q-trilho">${x(agoraH()) > 0 && x(agoraH()) < 100 ? `<span class="q-agora" style="left:${x(agoraH())}%"></span>` : ''}
        ${hoje.filter((o) => o.mec === m.id).map((o) => { const d = Math.max(o.real, tempoPadrao(o)) || tempoPadrao(o), cls = o.status === 'feito' ? 'feito' : ['esperando-peca', 'aguardando-aprov', 'agendado'].includes(o.status) ? 'esperando' : o.real > tempoPadrao(o) ? 'atrasado' : ''; return `<button class="q-os ${cls}" style="left:${x(o.ini)}%;width:${Math.max(4, x(o.ini + d) - x(o.ini))}%" data-abre="${o.id}" title="${e(o.modelo)} · ${STATUS[o.status][0]}"><b>${e(o.placa)}</b>${e(o.modelo)} · ${STATUS[o.status][0]}</button>`; }).join('')}</div></div>`).join('')}</section>`;
  },
  ordens() {
    const l = [...db.os].sort((a, b) => b.num - a.num);
    return `<div class="cabeca-o"><div><h1>Ordens de serviço</h1><p>${l.filter((o) => o.status !== 'entregue').length} abertas.</p></div><button class="bo esc" data-a="nova-os">+ Ordem de serviço</button></div>
      <div class="cx rol-o"><table><thead><tr><th>OS</th><th>Placa</th><th>Carro</th><th>Cliente</th><th>Mecânico</th><th>Situação</th><th class="n">Valor</th></tr></thead><tbody>${l.map((o) => `<tr class="cl" data-abre="${o.id}"><td class="n" style="text-align:left">${o.num}</td><td><span class="placa-o">${e(o.placa)}</span></td><td>${e(o.modelo)}</td><td>${e(o.cliente)}</td><td>${e(mec(o.mec).nome)}</td><td><span class="et-o ${STATUS[o.status][1]}">${STATUS[o.status][0]}</span></td><td class="n">${R$(valorOs(o))}</td></tr>`).join('')}</tbody></table></div>`;
  },
  os(id) {
    const o = ordem(id); if (!o) return S.ordens(); const tp = tempoPadrao(o), uso = tp ? o.real / tp : 0;
    const prox = { agendado: ['Carro chegou: começar', 'em-servico'], 'aguardando-aprov': ['Cliente aprovou', 'em-servico'], 'esperando-peca': ['Peça chegou: continuar', 'em-servico'], 'em-servico': ['Serviço pronto', 'feito'], feito: ['Entregar e receber', 'entregue'] }[o.status];
    return `<a href="#ordens">← Ordens de serviço</a><section class="os-topo"><div><span class="placa-o">${e(o.placa)}</span><h1>${e(o.modelo)} · OS ${o.num}</h1><p>${e(o.cliente)} · ${o.km.toLocaleString('pt-BR')} km · mecânico ${e(mec(o.mec).nome)} · começa ${hh(o.ini)}</p></div><span class="et-o ${STATUS[o.status][1]}" style="font-size:.85rem">${STATUS[o.status][0]}</span></section>
      <div class="grade-o"><section class="cx g7"><h2>Serviços (tempo padrão)</h2><table><thead><tr><th>Serviço</th><th class="n">Tempo</th><th class="n">Valor</th></tr></thead><tbody>${o.servicos.map((s) => `<tr><td>${e(s.nome)}</td><td class="n">${s.tempo.toLocaleString('pt-BR')} h</td><td class="n">${R$(s.valor)}</td></tr>`).join('')}</tbody></table><button class="bo mini" style="margin-top:8px" data-a="add-serv" data-o="${o.id}">+ Serviço</button>
        <h2 style="margin-top:16px">Peças</h2><table><thead><tr><th>Código</th><th>Peça</th><th class="n">Qtd</th><th class="n">Valor</th><th>Estoque</th></tr></thead><tbody>${o.pecas.map((p) => { const s = db.estoque.find((x) => x.cod === p.cod); return `<tr><td class="n" style="text-align:left">${e(p.cod)}</td><td>${e(p.nome)}</td><td class="n">${p.qtd}</td><td class="n">${R$(p.qtd * p.valor)}</td><td>${s ? (s.qtd >= p.qtd ? `<span class="et-o v">tem ${s.qtd}</span>` : '<span class="et-o r">em falta</span>') : '<span class="et-o">fora do estoque</span>'}</td></tr>`; }).join('') || '<tr><td colspan="5" class="vazio-o">Sem peças.</td></tr>'}</tbody></table><button class="bo mini" style="margin-top:8px" data-a="add-peca" data-o="${o.id}">+ Peça do estoque</button></section>
      <section class="cx g5"><h2>Tempo</h2><p>Padrão: <b>${tp.toLocaleString('pt-BR')} h</b> · gasto até agora: <b>${o.real.toLocaleString('pt-BR')} h</b></p><div class="tempo-bar ${uso > 1 ? 'estourou' : ''}"><i style="width:${Math.min(100, uso * 100)}%"></i></div><p class="vazio-o">${uso > 1 ? 'Passou do tempo padrão: o serviço está dando menos lucro que o previsto.' : 'Dentro do tempo padrão.'}</p>
        <h2>Total</h2><p style="font:700 1.6rem var(--mono);margin:0">${R$(valorOs(o))}</p><p class="vazio-o">Comissão de ${e(mec(o.mec).nome)} (${mec(o.mec).comissao}% da mão de obra): ${R$(o.servicos.reduce((s, x) => s + x.valor, 0) * mec(o.mec).comissao / 100)}</p>
        <div class="lado">${prox ? `<button class="bo esc" data-a="avanca" data-o="${o.id}">${prox[0]}</button>` : ''}${o.status === 'em-servico' ? `<button class="bo" data-a="horas" data-o="${o.id}">Lançar tempo</button><button class="bo" data-a="esperar-peca" data-o="${o.id}">Esperando peça</button>` : ''}<a class="bo" target="_blank" rel="noopener" href="https://wa.me/55${o.tel}?text=${encodeURIComponent(`Olá, ${o.cliente.split(' ')[0]}! Atualização do seu ${o.modelo}: ${STATUS[o.status][0].toLowerCase()}. Acompanhe pelo link: https://bluerose-store.com/os/${o.id}`)}">Avisar cliente</a>${o.status === 'entregue' && !o.nota ? `<button class="bo couro" data-a="emitir" data-o="${o.id}">Emitir notas</button>` : ''}</div>
        <label class="cmp" style="margin-top:12px">Mecânico<select data-mec-os="${o.id}">${db.mecanicos.map((m) => `<option value="${m.id}" ${m.id === o.mec ? 'selected' : ''}>${e(m.nome)} · ${e(m.esp)}</option>`).join('')}</select></label></section></div>`;
  },
  agenda() {
    return `<div class="cabeca-o"><div><h1>Agendamentos</h1><p>Chegam pelo link da oficina (Instagram, Google, WhatsApp). Confirme e o carro já entra no quadro.</p></div><button class="bo" data-a="copiar-link">Copiar link de agendamento</button></div>
      <div class="cx rol-o"><table><thead><tr><th>Quando</th><th>Cliente</th><th>Carro</th><th>Serviço</th><th>Origem</th><th></th></tr></thead><tbody>${db.agenda.map((a) => `<tr><td>${dt(a.dia)} · ${hh(a.hora)}</td><td>${e(a.nome)}</td><td><span class="placa-o">${e(a.placa)}</span> ${e(a.modelo)}</td><td>${e(a.servico)}</td><td>${e(a.origem)}</td><td>${a.status === 'pedido' ? `<button class="bo mini esc" data-a="confirmar-ag" data-id="${a.id}">Confirmar</button>` : '<span class="et-o v">confirmado</span>'}</td></tr>`).join('')}</tbody></table></div>`;
  },
  pecas() {
    const falta = db.estoque.filter((p) => p.qtd < p.min);
    return `<div class="cabeca-o"><div><h1>Peças</h1><p>${db.estoque.length} itens · ${R$(db.estoque.reduce((s, p) => s + p.qtd * p.custo, 0))} em estoque (custo) · ${falta.length} abaixo do mínimo</p></div><div class="lado"><button class="bo" data-a="nova-peca">+ Peça</button><button class="bo esc" data-a="comprar" ${falta.length ? '' : 'disabled'}>Pedir o que falta</button></div></div>
      <div class="cx rol-o"><table><thead><tr><th>Código</th><th>Peça</th><th>Aplicação</th><th class="n">Tem</th><th class="n">Mínimo</th><th class="n">Custo</th><th class="n">Venda</th><th class="n">Margem</th><th>Fornecedor</th></tr></thead><tbody>${db.estoque.map((p) => `<tr><td class="n" style="text-align:left">${e(p.cod)}</td><td>${e(p.nome)}</td><td>${e(p.apl)}</td><td class="n">${p.qtd < p.min ? `<span class="et-o r">${p.qtd}</span>` : p.qtd}</td><td class="n">${p.min}</td><td class="n">${R$(p.custo)}</td><td class="n">${R$(p.preco)}</td><td class="n">${Math.round((p.preco - p.custo) / p.preco * 100)}%</td><td>${e(p.forn)}</td></tr>`).join('')}</tbody></table></div>`;
  },
  clientes() {
    const lim = db.ajustes.lembrarDias, sumidos = db.historico.filter((c) => -c.ultima >= lim);
    return `<div class="cabeca-o"><div><h1>Clientes</h1><p>${sumidos.length} clientes sem vir há mais de ${lim} dias: é hora de lembrar da revisão.</p></div><button class="bo esc" data-a="lembrar-todos" ${sumidos.length ? '' : 'disabled'}>Lembrar todos no WhatsApp</button></div>
      <div class="cx rol-o"><table><thead><tr><th>Cliente</th><th>Placa</th><th>Carro</th><th>Última visita</th><th></th></tr></thead><tbody>${[...db.historico, ...db.os.map((o) => ({ nome: o.cliente, tel: o.tel, placa: o.placa, modelo: o.modelo, ultima: 0 }))].map((c) => `<tr><td><b>${e(c.nome)}</b></td><td><span class="placa-o">${e(c.placa)}</span></td><td>${e(c.modelo)}</td><td>${c.ultima === 0 ? 'agora' : `há ${-c.ultima} dias`} ${-c.ultima >= lim ? '<span class="et-o a">revisão</span>' : ''}</td><td><a class="bo mini" target="_blank" rel="noopener" href="https://wa.me/55${c.tel}?text=${encodeURIComponent(`Olá, ${c.nome.split(' ')[0]}! Aqui é do ${db.oficina.nome}. Está na hora da revisão do seu ${c.modelo}. Agende pelo link: https://bluerose-store.com/agendar`)}">Lembrar</a></td></tr>`).join('')}</tbody></table></div>`;
  },
  financeiro() {
    const feitos = db.os.filter((o) => o.status === 'feito'), entregues = db.os.filter((o) => o.status === 'entregue'), com = db.mecanicos.map((m) => ({ m, v: db.os.filter((o) => o.mec === m.id && ['feito', 'entregue'].includes(o.status)).reduce((s, o) => s + o.servicos.reduce((t, x) => t + x.valor, 0), 0) * m.comissao / 100 }));
    return `<div class="cabeca-o"><div><h1>Financeiro</h1><p>Recebido, a receber, contas e comissões do período.</p></div></div>
      <div class="grade-o"><div class="cx g4 ind esc"><small>Recebido</small><b>${R$(entregues.reduce((s, o) => s + valorOs(o), 0))}</b><span>${entregues.length} carros entregues</span></div><div class="cx g4 ind"><small>A receber (prontos)</small><b>${R$(feitos.reduce((s, o) => s + valorOs(o), 0))}</b><span>${feitos.length} carros</span></div><div class="cx g4 ind"><small>Contas a pagar</small><b>${R$(db.pagar.filter((p) => !p.pago).reduce((s, p) => s + p.valor, 0))}</b><span>próximos 10 dias</span></div>
      <section class="cx g6"><h2>Comissões dos mecânicos</h2><table><tbody>${com.map(({ m, v }) => `<tr><td><b>${e(m.nome)}</b> <small>${m.comissao}% da mão de obra</small></td><td class="n">${R$(v)}</td></tr>`).join('')}<tr><td><b>Total</b></td><td class="n"><b>${R$(com.reduce((s, x) => s + x.v, 0))}</b></td></tr></tbody></table></section>
      <section class="cx g6"><h2>Contas a pagar</h2><table><tbody>${db.pagar.map((p) => `<tr><td>${e(p.desc)}<br><small>vence ${dt(p.vence)}</small></td><td class="n">${R$(p.valor)}</td><td>${p.pago ? '<span class="et-o v">paga</span>' : `<button class="bo mini" data-a="pagar-conta" data-id="${p.id}">Paguei</button>`}</td></tr>`).join('')}</tbody></table></section></div>`;
  },
  notas() {
    const ns = db.os.filter((o) => o.nota);
    return `<div class="cabeca-o"><div><h1>Notas fiscais</h1><p>Mão de obra sai em NFS-e (prefeitura) e peças em NF-e. Na versão contratada as notas vão direto para a prefeitura e a SEFAZ.</p></div></div>
      <div class="cx rol-o"><table><thead><tr><th>OS</th><th>Cliente</th><th>NFS-e (serviços)</th><th>NF-e (peças)</th><th class="n">Total</th></tr></thead><tbody>${ns.map((o) => `<tr><td>${o.num}</td><td>${e(o.cliente)}</td><td>nº ${o.nota.nfse} · ${R$(o.servicos.reduce((s, x) => s + x.valor, 0))}</td><td>${o.nota.nfe ? `nº ${o.nota.nfe} · ${R$(o.pecas.reduce((s, p) => s + p.qtd * p.valor, 0))}` : '—'}</td><td class="n">${R$(valorOs(o))}</td></tr>`).join('') || '<tr><td colspan="5" class="vazio-o">Nenhuma nota ainda. Entregue um carro e clique em Emitir notas.</td></tr>'}</tbody></table></div>`;
  },
  relatorios() {
    const fechados = db.os.filter((o) => ['feito', 'entregue'].includes(o.status)), vendidos = {}; db.os.forEach((o) => o.servicos.forEach((s) => { vendidos[s.nome] = (vendidos[s.nome] || 0) + s.valor; }));
    const top = Object.entries(vendidos).sort((a, b) => b[1] - a[1]).slice(0, 6), max = top[0]?.[1] || 1;
    const efic = db.mecanicos.map((m) => { const os = db.os.filter((o) => o.mec === m.id && o.real > 0); const p = os.reduce((s, o) => s + tempoPadrao(o), 0), r = os.reduce((s, o) => s + o.real, 0); return { m, ef: r ? p / r : 0 }; });
    return `<div class="cabeca-o"><div><h1>Relatórios</h1><p>O que mais vende e quem produz mais.</p></div></div>
      <div class="grade-o"><div class="cx g4 ind esc"><small>Ticket médio</small><b>${R$(fechados.reduce((s, o) => s + valorOs(o), 0) / (fechados.length || 1))}</b><span>por ordem de serviço</span></div><div class="cx g4 ind"><small>Peças no faturamento</small><b>${Math.round(fechados.reduce((s, o) => s + o.pecas.reduce((t, p) => t + p.qtd * p.valor, 0), 0) / (fechados.reduce((s, o) => s + valorOs(o), 0) || 1) * 100)}%</b><span>o resto é mão de obra</span></div><div class="cx g4 ind"><small>Carros por dia</small><b>${(db.os.length / 3).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</b><span>média recente</span></div>
      <section class="cx g7"><h2>Serviços que mais faturam</h2><div class="hbarras">${top.map(([n, v]) => `<div class="l"><span>${e(n)}</span><span class="t"><i style="width:${v / max * 100}%"></i></span><b class="n" style="text-align:right;font-family:var(--mono)">${R$(v)}</b></div>`).join('')}</div></section>
      <section class="cx g5"><h2>Eficiência dos mecânicos</h2><table><tbody>${efic.map(({ m, ef }) => `<tr><td>${e(m.nome)}</td><td class="n">${ef ? `${Math.round(ef * 100)}%` : '—'}</td><td>${ef ? (ef >= 1 ? '<span class="et-o v">no tempo</span>' : '<span class="et-o a">mais lento</span>') : ''}</td></tr>`).join('')}</tbody></table><p class="vazio-o">Tempo padrão ÷ tempo gasto. Acima de 100%: termina antes do previsto.</p></section></div>`;
  },
  equipe() {
    const preco = db.plano === 'pro' ? 149 : 89;
    return `<div class="cabeca-o"><div><h1>Equipe</h1><p>Painel do dono: mecânicos, especialidade, comissão e acesso.</p></div><button class="bo esc" data-a="novo-mec">+ Mecânico</button></div>
      <div class="grade-o"><section class="cx g7"><table><thead><tr><th>Mecânico</th><th>Especialidade</th><th class="n">Comissão</th><th>Acesso</th></tr></thead><tbody>${db.mecanicos.map((m) => `<tr><td><b>${e(m.nome)}</b></td><td>${e(m.esp)}</td><td class="n"><input data-comissao="${m.id}" value="${m.comissao}" style="width:60px;text-align:right" aria-label="Comissão de ${e(m.nome)}">%</td><td><span class="et-o">vê as próprias OS e o quadro</span></td></tr>`).join('')}</tbody></table></section>
      <section class="cx g5"><h2>Plano</h2><p>${db.plano === 'pro' ? 'Pro' : 'Básico'} · <b>${R$(preco)}/mês</b></p><div class="lado"><button class="bo ${db.plano === 'basico' ? 'esc' : ''}" data-a="plano" data-v="basico">Básico · R$ 89</button><button class="bo ${db.plano === 'pro' ? 'esc' : ''}" data-a="plano" data-v="pro">Pro · R$ 149</button></div><p class="vazio-o">Básico: você + 5 usuários. Pro: sem limite. Anual com 20% a menos. Sem fidelidade.</p>
        <h2>Quem vê o quê</h2><table><tbody><tr><td>Dono</td><td>tudo</td></tr><tr><td>Recepção</td><td>quadro, OS, agendamentos, clientes, caixa</td></tr><tr><td>Mecânico</td><td>as próprias OS, quadro e tempo</td></tr><tr><td>Estoquista</td><td>peças e compras</td></tr></tbody></table></section></div>`;
  },
  ajustes() {
    const a = db.ajustes;
    return `<div class="cabeca-o"><div><h1>Ajustes</h1></div></div><div class="grade-o"><section class="cx g6"><h2>Você</h2><label class="cmp">Abrir em<select data-aj="abrir">${SECOES.slice(0, 8).map(([k, t]) => `<option value="${k}" ${a.abrir === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label class="cmp">Letras<select data-aj="letra"><option value="normal" ${a.letra === 'normal' ? 'selected' : ''}>Normal</option><option value="grande" ${a.letra === 'grande' ? 'selected' : ''}>Grande</option></select></label></section>
      <section class="cx g6"><h2>Oficina</h2><label class="cmp">Nome<input data-of="nome" value="${e(db.oficina.nome)}"></label><label class="cmp">CNPJ<input data-of="cnpj" value="${e(db.oficina.cnpj)}"></label><div class="dois-o"><label class="cmp">Abre às<input data-of="abre" type="number" value="${db.oficina.abre}"></label><label class="cmp">Fecha às<input data-of="fecha" type="number" value="${db.oficina.fecha}"></label></div><label class="cmp">Lembrar revisão depois de (dias)<input data-aj="lembrarDias" type="number" value="${a.lembrarDias}"></label></section></div>`;
  },
};

function tela() {
  const [s, a] = (location.hash.slice(1) || db.ajustes.abrir || 'quadro').split('/'), atual = s === 'os' ? 'ordens' : s;
  const bolhas = { agenda: db.agenda.filter((x) => x.status === 'pedido').length, pecas: db.estoque.filter((p) => p.qtd < p.min).length };
  el('#segmentos').innerHTML = SECOES.map(([k, t]) => `<a href="#${k}" ${k === atual ? 'aria-current="page"' : ''}>${t}${bolhas[k] ? `<span class="bolha">${bolhas[k]}</span>` : ''}</a>`).join('');
  el('#conteudo').innerHTML = (S[s] || S.quadro)(a);
  el('#nome-of').textContent = db.oficina.nome; el('#dia-of').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  document.documentElement.style.fontSize = db.ajustes.letra === 'grande' ? '112%' : '';
  document.title = `${(SECOES.find(([k]) => k === atual) || ['', 'OS'])[1]} · Veltria Oficina Completo`;
}
addEventListener('hashchange', () => { tela(); el('#conteudo').focus({ preventScroll: true }); scrollTo(0, 0); });

function painelIA() {
  const p = el('#painel-ia'), sug = ['Qual carro está atrasando o quadro?', 'O que eu preciso comprar hoje?', 'Quanto vou faturar hoje?', 'Qual mecânico está mais lento?', 'Escreva a mensagem de orçamento da HR-V'];
  p.hidden = false;
  p.innerHTML = `<header><b>Assistente da oficina</b><button class="bo mini" data-fecha-ia aria-label="Fechar">×</button></header><div class="conv">${(db.conversa.length ? db.conversa : [{ ia: 1, t: 'Leio o quadro, as OS, as peças e o financeiro. Na versão contratada, 20 perguntas grátis por dia; aqui as respostas são de exemplo.' }]).map((m) => `<div class="msg-o ${m.ia ? 'ia' : 'eu'}">${e(m.t)}</div>`).join('')}<div class="sug-o">${sug.map((x) => `<button data-sug="${e(x)}">${e(x)}</button>`).join('')}</div></div><form id="f-ia"><input id="q-ia" placeholder="Pergunte" aria-label="Pergunta"><button class="bo esc">Enviar</button></form>`;
  p.querySelector('.conv').scrollTop = 1e6; el('#q-ia').focus();
}
function responde(p) {
  const x = plano(p);
  if (/atras|quadro|demor/.test(x)) { const l = db.os.filter((o) => o.status === 'em-servico' && o.real > tempoPadrao(o)); const esp = db.os.filter((o) => o.status === 'esperando-peca'); return `${l.length ? `Passaram do tempo padrão: ${l.map((o) => `${o.modelo} com ${mec(o.mec).nome}`).join(', ')}.` : 'Ninguém passou do tempo padrão.'}${esp.length ? `\nTravados por peça: ${esp.map((o) => `${o.modelo} (${o.pecas.map((q) => q.nome).join(', ')})`).join('; ')}.` : ''}`; }
  if (/compr|falta|peca/.test(x)) return db.estoque.filter((q) => q.qtd < q.min).map((q) => `• ${q.nome} (${q.cod}): tem ${q.qtd}, mínimo ${q.min} · ${q.forn}`).join('\n') || 'Nada em falta.';
  if (/fatur|hoje|receb/.test(x)) { const f = db.os.filter((o) => ['feito', 'em-servico'].includes(o.status)); return `Se os carros em serviço ficarem prontos: ${R$(f.reduce((s, o) => s + valorOs(o), 0))} hoje (${f.length} carros).`; }
  if (/lento|mecanic|eficien/.test(x)) return S.relatorios().includes('mais lento') ? 'Veja Relatórios > Eficiência: quem está abaixo de 100% está levando mais tempo que o padrão. Vale conferir se falta ferramenta ou treino.' : 'Todos dentro do tempo padrão.';
  if (/hr-v|mensag|orcament/.test(x)) return 'Mensagem pronta:\n\n"Olá, Priscila! As pastilhas dianteiras da sua HR-V estão no limite. A troca fica em R$ 396,00 (peças e mão de obra) e o carro fica pronto em 1 hora. Posso seguir? Aprove pelo link da OS."';
  return `Hoje: ${db.os.filter((o) => o.status !== 'entregue').length} carros no pátio e ${db.agenda.filter((a) => a.status === 'pedido').length} agendamentos para confirmar.`;
}
const F = {
  'nova-os': () => form('Nova ordem de serviço', `<div class="dois-o"><label class="cmp">Placa<input name="p" required style="text-transform:uppercase"></label><label class="cmp">Carro<input name="m" required></label></div><div class="dois-o"><label class="cmp">Cliente<input name="c" required></label><label class="cmp">WhatsApp<input name="t" required></label></div><div class="tres-o"><label class="cmp">Serviço<select name="s">${Object.keys(TEMPOS).map((k) => `<option>${k}</option>`).join('')}</select></label><label class="cmp">Mecânico<select name="mec">${db.mecanicos.map((m) => `<option value="${m.id}">${e(m.nome)}</option>`).join('')}</select></label><label class="cmp">Começa às<input name="h" type="number" step="0.5" value="${Math.ceil(agoraH())}"></label></div>`, 'Abrir OS', (f) => { const s = f.get('s'); db.os.push({ id: novoId(), num: db.proxOs++, placa: String(f.get('p')).toUpperCase(), modelo: f.get('m'), cliente: f.get('c'), tel: String(f.get('t')).replace(/\D/g, ''), mec: f.get('mec'), ini: nv(f.get('h')), status: 'agendado', servicos: [{ nome: s, tempo: TEMPOS[s], valor: Math.round(TEMPOS[s] * 180) }], pecas: [], real: 0, pago: false, nota: null, km: 0 }); toast('OS aberta e posta no quadro.'); }),
  'add-serv': (d) => form('Adicionar serviço', `<label class="cmp">Serviço<select name="s">${Object.keys(TEMPOS).map((k) => `<option>${k}</option>`).join('')}</select></label><label class="cmp">Valor (R$)<input name="v" inputmode="decimal" placeholder="vazio = R$ 180 por hora padrão"></label>`, 'Adicionar', (f) => { const s = f.get('s'); ordem(d.o).servicos.push({ nome: s, tempo: TEMPOS[s], valor: nv(f.get('v')) || Math.round(TEMPOS[s] * 180) }); }),
  'add-peca': (d) => form('Peça do estoque', `<label class="cmp">Peça<select name="c">${db.estoque.map((p) => `<option value="${p.cod}">${e(p.cod)} · ${e(p.nome)} (tem ${p.qtd})</option>`).join('')}</select></label><label class="cmp">Quantidade<input name="q" type="number" value="1" min="1"></label>`, 'Adicionar', (f) => { const p = db.estoque.find((x) => x.cod === f.get('c')), q = Number(f.get('q')) || 1; ordem(d.o).pecas.push({ cod: p.cod, nome: p.nome, qtd: q, valor: p.preco }); if (p.qtd >= q) p.qtd -= q; else toast('Peça em falta: entra na lista de compra.'); }),
  avanca: (d) => { const o = ordem(d.o), prox = { agendado: 'em-servico', 'aguardando-aprov': 'em-servico', 'esperando-peca': 'em-servico', 'em-servico': 'feito', feito: 'entregue' }[o.status]; o.status = prox; if (prox === 'entregue') o.pago = true; if (prox === 'feito' && !o.real) o.real = tempoPadrao(o); salva(); tela(); toast(prox === 'entregue' ? `${R$(valorOs(o))} recebidos. Emita as notas.` : `Agora: ${STATUS[prox][0].toLowerCase()}.`); },
  'esperar-peca': (d) => { ordem(d.o).status = 'esperando-peca'; salva(); tela(); },
  horas: (d) => form('Tempo gasto', '<label class="cmp">Horas trabalhadas até agora<input name="h" inputmode="decimal" required></label>', 'Salvar', (f) => { ordem(d.o).real = nv(f.get('h')); }),
  emitir: (d) => { const o = ordem(d.o); o.nota = { nfse: db.proxNota++, nfe: o.pecas.length ? db.proxNota++ : null }; salva(); tela(); toast(`NFS-e ${o.nota.nfse}${o.nota.nfe ? ` e NF-e ${o.nota.nfe}` : ''} emitidas (demonstração).`); },
  'confirmar-ag': (d) => { const a = db.agenda.find((x) => x.id === d.id); a.status = 'confirmado'; db.os.push({ id: novoId(), num: db.proxOs++, placa: a.placa, modelo: a.modelo, cliente: a.nome, tel: a.tel, mec: db.mecanicos[3].id, ini: a.hora, status: 'agendado', servicos: [{ nome: a.servico, tempo: TEMPOS[a.servico] || 1, valor: Math.round((TEMPOS[a.servico] || 1) * 180) }], pecas: [], real: 0, pago: false, nota: null, km: 0 }); salva(); tela(); toast(`${a.nome} confirmado. Mensagem de confirmação enviada.`); },
  'copiar-link': () => { navigator.clipboard?.writeText('https://bluerose-store.com/agendar/rota-certa').catch(() => {}); toast('Link copiado. Cole na bio do Instagram e no Google.'); },
  'nova-peca': () => form('Nova peça', '<div class="dois-o"><label class="cmp">Código do fabricante<input name="c" required></label><label class="cmp">Nome<input name="n" required></label></div><label class="cmp">Aplicação (carros)<input name="a"></label><div class="tres-o"><label class="cmp">Quantidade<input name="q" type="number" value="1"></label><label class="cmp">Custo<input name="cu" inputmode="decimal" required></label><label class="cmp">Venda<input name="v" inputmode="decimal" required></label></div><div class="dois-o"><label class="cmp">Mínimo<input name="m" type="number" value="2"></label><label class="cmp">Fornecedor<input name="f"></label></div>', 'Cadastrar', (f) => { db.estoque.push({ cod: f.get('c'), nome: f.get('n'), apl: f.get('a'), qtd: Number(f.get('q')), min: Number(f.get('m')), custo: nv(f.get('cu')), preco: nv(f.get('v')), forn: f.get('f') || '—' }); }),
  comprar: () => { const l = db.estoque.filter((p) => p.qtd < p.min), porF = {}; l.forEach((p) => { (porF[p.forn] ||= []).push(p); }); modal(`<h2>Pedido de compra</h2>${Object.entries(porF).map(([f, ps]) => `<p><b>${e(f)}</b></p><table><tbody>${ps.map((p) => `<tr><td>${e(p.cod)} · ${e(p.nome)}</td><td class="n">${p.min * 2 - p.qtd} un.</td><td class="n">${R$((p.min * 2 - p.qtd) * p.custo)}</td></tr>`).join('')}</tbody></table>`).join('')}<div class="rodape-m"><button class="bo" data-x>Fechar</button><button class="bo esc" data-chegou>Mandar pedidos e dar entrada</button></div>`, (m, fecha) => m.querySelector('[data-chegou]').addEventListener('click', () => { l.forEach((p) => { p.qtd = p.min * 2; }); salva(); fecha(); tela(); toast('Pedidos enviados aos fornecedores pelo WhatsApp; estoque atualizado quando chegar.'); })); },
  'lembrar-todos': () => { const n = db.historico.filter((c) => -c.ultima >= db.ajustes.lembrarDias).length; toast(`${n} lembretes de revisão prontos: na versão contratada saem um a um pelo WhatsApp da oficina.`); },
  'pagar-conta': (d) => { db.pagar.find((p) => p.id === d.id).pago = true; salva(); tela(); },
  'novo-mec': () => { if (db.plano !== 'pro' && db.mecanicos.length >= 6) return toast('No Básico são até 6 usuários. O Pro libera sem limite.'); form('Novo mecânico', '<label class="cmp">Nome<input name="n" required></label><div class="dois-o"><label class="cmp">Especialidade<input name="e" required></label><label class="cmp">Comissão (%)<input name="c" type="number" value="25"></label></div>', 'Cadastrar', (f) => { db.mecanicos.push({ id: novoId(), nome: f.get('n'), esp: f.get('e'), comissao: Number(f.get('c')) }); toast('Mecânico cadastrado e convite enviado.'); }); },
  plano: (d) => { db.plano = d.v; salva(); tela(); },
};

document.addEventListener('click', (ev) => {
  const t = ev.target;
  if (t.closest('[data-ia]')) { painelIA(); return; }
  if (t.closest('[data-fecha-ia]')) { el('#painel-ia').hidden = true; return; }
  const s = t.closest('[data-sug]'); if (s) { el('#q-ia').value = s.dataset.sug; el('#f-ia').requestSubmit(); return; }
  const ab = t.closest('[data-abre]'); if (ab) { location.hash = `#os/${ab.dataset.abre}`; return; }
  const a = t.closest('[data-a]'); if (a && F[a.dataset.a]) F[a.dataset.a](a.dataset);
});
document.addEventListener('submit', (ev) => { if (ev.target.id !== 'f-ia') return; ev.preventDefault(); const p = el('#q-ia').value.trim(); if (p.length < 3) return; db.conversa.push({ t: p }, { ia: 1, t: `${responde(p)}\n\n(Exemplo da demonstração.)` }); db.conversa = db.conversa.slice(-10); salva(); painelIA(); });
document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.dataset.mecOs) { ordem(t.dataset.mecOs).mec = t.value; salva(); toast(`Passou para ${mec(t.value).nome}.`); }
  if (t.dataset.comissao) { mec(t.dataset.comissao).comissao = nv(t.value); salva(); toast('Comissão salva.'); }
  if (t.dataset.aj) { db.ajustes[t.dataset.aj] = t.dataset.aj === 'lembrarDias' ? Number(t.value) : t.value; salva(); tela(); }
  if (t.dataset.of) { db.oficina[t.dataset.of] = ['abre', 'fecha'].includes(t.dataset.of) ? Number(t.value) : t.value; salva(); tela(); }
});
el('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = patio(); location.hash = '#quadro'; tela(); toast('Demonstração recomeçada.'); });
tela();
