// Veltria Obras Avançado · protótipo "central de obras" para construtora com várias obras.
// Obra em foco + camadas (teclas 1 a 0): carteira, orçamento analítico com insumos, BDI e curva ABC,
// físico-financeiro com curva S, RDO, cotações e almoxarifado, contratos de empreiteiros com retenções,
// DRE e contas por obra, qualidade e segurança, documentos com vencimento, acessos e auditoria.
// Painel fixo à direita: Raio-X da obra (semáforo de prazo, custo, caixa e qualidade) e Copiloto IA.
// Dados fictícios neste navegador (?novo recomeça).

const CHAVE = 'veltria-obras-avancado-v1';
const BRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const BRL2 = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MI = (v) => (Math.abs(v) >= 1e6 ? `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi` : Math.abs(v) >= 1e3 ? `R$ ${(v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil` : BRL(v));
const P = (v, c = 0) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: c })}%`;
const E = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const N = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const NORM = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const ID = () => `i${Date.now().toString(36)}${Math.floor(Math.random() * 1e5).toString(36)}`;
const DATA = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toLocaleDateString('pt-BR'); };
const MES = (m) => { const x = new Date(); x.setDate(1); x.setMonth(x.getMonth() + m); return x.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('. de ', '/').replace('.', ''); };
const $ = (s, r = document) => r.querySelector(s);
const MESES = [-3, -2, -1, 0, 1, 2, 3, 4, 5]; // índice 3 é o mês atual

// ------------------------------------------------------------------ dados fictícios
function semear() {
  const ins = (l) => l.map(([nome, tipo, un, coef, preco]) => ({ nome, tipo, un, coef, preco }));
  const composicoesResidencial = [
    { cod: 'SIN-96995', serv: 'Fundação: estaca hélice contínua d=40 cm', un: 'm', qtd: 1680, ins: ins([['Concreto usinado fck 30', 'MAT', 'm³', 0.135, 520], ['Aço CA-50', 'MAT', 'kg', 4.2, 8.9], ['Equipamento hélice contínua', 'EQ', 'h', 0.06, 980], ['Armador', 'MO', 'h', 0.25, 31.4], ['Servente', 'MO', 'h', 0.4, 21.1]]) },
    { cod: 'SIN-92915', serv: 'Estrutura: pilares, vigas e lajes em concreto armado', un: 'm³', qtd: 960, ins: ins([['Concreto usinado fck 30', 'MAT', 'm³', 1.05, 520], ['Aço CA-50', 'MAT', 'kg', 95, 8.9], ['Forma de compensado', 'MAT', 'm²', 9.5, 58], ['Carpinteiro', 'MO', 'h', 9, 31.4], ['Armador', 'MO', 'h', 8, 31.4], ['Servente', 'MO', 'h', 14, 21.1]]) },
    { cod: 'SIN-87292', serv: 'Alvenaria de vedação bloco cerâmico 14 cm', un: 'm²', qtd: 9400, ins: ins([['Bloco cerâmico 14x19x29', 'MAT', 'un', 17.5, 2.15], ['Argamassa de assentamento', 'MAT', 'm³', 0.014, 420], ['Pedreiro', 'MO', 'h', 0.75, 31.4], ['Servente', 'MO', 'h', 0.5, 21.1]]) },
    { cod: 'SIN-87879', serv: 'Revestimento: chapisco, emboço e reboco', un: 'm²', qtd: 21800, ins: ins([['Argamassa de revestimento', 'MAT', 'm³', 0.025, 410], ['Pedreiro', 'MO', 'h', 0.55, 31.4], ['Servente', 'MO', 'h', 0.45, 21.1]]) },
    { cod: 'SIN-89356', serv: 'Instalações hidrossanitárias', un: 'vb', qtd: 1, ins: ins([['Tubos e conexões', 'MAT', 'vb', 1, 412000], ['Encanador', 'MO', 'h', 3100, 32]]) },
    { cod: 'SIN-91926', serv: 'Instalações elétricas e SPDA', un: 'vb', qtd: 1, ins: ins([['Cabos, quadros e eletrodutos', 'MAT', 'vb', 1, 538000], ['Eletricista', 'MO', 'h', 3900, 33]]) },
    { cod: 'SIN-87263', serv: 'Piso porcelanato 60x60 com rodapé', un: 'm²', qtd: 6100, ins: ins([['Porcelanato 60x60', 'MAT', 'm²', 1.1, 64], ['Argamassa AC-III', 'MAT', 'kg', 5, 1.4], ['Azulejista', 'MO', 'h', 0.6, 31.4]]) },
    { cod: 'SIN-88489', serv: 'Pintura acrílica interna e externa', un: 'm²', qtd: 30500, ins: ins([['Tinta acrílica', 'MAT', 'l', 0.33, 21], ['Massa corrida', 'MAT', 'kg', 0.4, 4.8], ['Pintor', 'MO', 'h', 0.32, 30.2]]) },
  ];
  const obras = [
    { id: 'm1', nome: 'Residencial Vista do Vale · Torre A', cli: 'Vale Incorporações SPE Ltda', cidade: 'Nova Lima/MG', tipo: 'Residencial vertical · 14 pav.', area: 9800, contrato: 18900000, custoOrc: 14760000, custoReal: 5410000, medido: 6450000, recebido: 5780000,
      plan: [.05, .11, .19, .28, .37, .47, .58, .7, .82], real: [.05, .1, .17, .24], cor: '#858d68', composicoes: composicoesResidencial,
      docs: [['Alvará de construção', 210], ['ART de execução (CREA)', 410], ['Seguro risco de engenharia', 24], ['PCMAT / PGR', 9], ['Licença ambiental (LAS)', -6]],
      ncs: [{ id: ID(), desc: 'Guarda-corpo provisório incompleto no 6º pavimento', local: 'Torre A · 6º pav.', grav: 'Alta', aberta: true, dia: -2 }, { id: ID(), desc: 'Desaprumo de 1,2 cm em pilar P14', local: 'Torre A · 4º pav.', grav: 'Média', aberta: true, dia: -5 }, { id: ID(), desc: 'Bloco com trinca descartado fora da caçamba', local: 'Canteiro', grav: 'Baixa', aberta: false, dia: -12 }],
      checklists: [['FVS Estrutura (formas e armação)', 42, 39], ['FVS Alvenaria', 30, 28], ['NR-18 Proteção coletiva', 26, 22], ['NR-35 Trabalho em altura', 18, 18]],
      almox: [['Cimento CP-II 50 kg', 'sc', 340, 200, 38.5], ['Aço CA-50 10 mm', 'kg', 4100, 6000, 8.9], ['Bloco cerâmico 14x19x29', 'un', 12800, 15000, 2.15], ['Areia média', 'm³', 46, 30, 118], ['Brita 1', 'm³', 22, 25, 132], ['EPI: luvas de raspa', 'par', 64, 40, 9.9]] },
    { id: 'm2', nome: 'Centro Logístico Betim · Galpão 3', cli: 'LogMinas Armazéns S.A.', cidade: 'Betim/MG', tipo: 'Galpão industrial · 12.000 m²', area: 12000, contrato: 11400000, custoOrc: 8950000, custoReal: 6900000, medido: 7980000, recebido: 7980000,
      plan: [.3, .42, .54, .66, .78, .88, .96, 1, 1], real: [.29, .4, .5, .6], cor: '#a77a1e',
      docs: [['Alvará de construção', 140], ['ART de execução (CREA)', 300], ['Seguro risco de engenharia', 95], ['Projeto de prevenção de incêndio (AVCB)', 31]],
      ncs: [{ id: ID(), desc: 'Junta de dilatação do piso fora de esquadro', local: 'Galpão 3 · eixo C', grav: 'Média', aberta: true, dia: -3 }],
      checklists: [['FVS Piso industrial', 24, 21], ['FVS Estrutura metálica', 36, 35], ['NR-18 Proteção coletiva', 26, 25]],
      almox: [['Fibra de aço para piso', 'kg', 2200, 1500, 11.4], ['Parafuso estrutural A325', 'un', 1300, 800, 4.2], ['Telha termoacústica', 'm²', 480, 300, 96]] },
    { id: 'm3', nome: 'Escola Municipal Sol Nascente', cli: 'Prefeitura de Contagem', cidade: 'Contagem/MG', tipo: 'Obra pública · licitação 041/2026', area: 3400, contrato: 6200000, custoOrc: 5050000, custoReal: 1130000, medido: 1240000, recebido: 930000,
      plan: [0, .04, .1, .18, .28, .4, .53, .66, .78], real: [0, .04, .09, .16], cor: '#5e6548',
      docs: [['Ordem de serviço', 400], ['ART de execução (CREA)', 380], ['Seguro garantia (5% do contrato)', 58], ['Diário de obra entregue à fiscalização', 2]],
      ncs: [], checklists: [['FVS Fundação', 20, 20], ['NR-18 Proteção coletiva', 26, 24]],
      almox: [['Cimento CP-II 50 kg', 'sc', 120, 150, 38.5], ['Aço CA-50 8 mm', 'kg', 1800, 1500, 8.9]] },
    { id: 'm4', nome: 'Retrofit Edifício Guaicurus', cli: 'Condomínio Ed. Guaicurus', cidade: 'Belo Horizonte/MG', tipo: 'Retrofit de fachada e elevadores', area: 5200, contrato: 3850000, custoOrc: 3010000, custoReal: 2540000, medido: 2690000, recebido: 2420000,
      plan: [.45, .58, .7, .8, .9, 1, 1, 1, 1], real: [.44, .55, .63, .69], cor: '#a0442e',
      docs: [['Alvará de reforma', 60], ['ART de execução (CREA)', 220], ['Autorização do patrimônio histórico', -14]],
      ncs: [{ id: ID(), desc: 'Balancim sem trava-quedas reserva', local: 'Fachada leste', grav: 'Alta', aberta: true, dia: -1 }, { id: ID(), desc: 'Pastilha descolando no 9º andar', local: 'Fachada norte', grav: 'Média', aberta: true, dia: -7 }],
      checklists: [['FVS Fachada (pastilha)', 30, 24], ['NR-35 Trabalho em altura', 18, 15]],
      almox: [['Pastilha cerâmica 5x5', 'm²', 90, 150, 112], ['Argamassa AC-III', 'sc', 60, 80, 42]] },
  ];
  obras.forEach((o) => { o.docs = o.docs.map(([nome, vence]) => ({ id: ID(), nome, vence })); o.checklists = o.checklists.map(([nome, itens, ok]) => ({ id: ID(), nome, itens, ok })); o.almox = o.almox.map(([nome, un, saldo, minimo, preco]) => ({ id: ID(), nome, un, saldo, minimo, preco })); o.composicoes ||= composicoesResidencial.slice(0, 4).map((c) => ({ ...c, qtd: Math.round(c.qtd * o.area / 9800) || 1 })); });
  const cotacoes = [
    { id: ID(), obra: 'm1', item: 'Aço CA-50 10 mm', qtd: 18000, un: 'kg', propostas: [['Gerdau (distribuidor)', 8.72, 5], ['Aço Forte BH', 8.55, 9], ['ArcelorMittal Comercial', 8.9, 3]], escolhido: null },
    { id: ID(), obra: 'm1', item: 'Concreto usinado fck 30', qtd: 240, un: 'm³', propostas: [['Concreteira Horizonte', 518, 2], ['Supermix', 529, 1], ['Polimix', 511, 4]], escolhido: null },
    { id: ID(), obra: 'm4', item: 'Pastilha cerâmica 5x5', qtd: 300, un: 'm²', propostas: [['Atlas Revestimentos', 108, 12], ['Jatobá', 114, 6], ['Cerâmica Elizabeth', 121, 8]], escolhido: 1 },
  ];
  const contratos = [
    { id: ID(), obra: 'm1', emp: 'Fôrmas Ideal Ltda', serv: 'Formas e escoramento da estrutura', valor: 1460000, medido: 520000, ret: 5, inss: true },
    { id: ID(), obra: 'm1', emp: 'Hidrotec Instalações', serv: 'Hidrossanitário (mão de obra)', valor: 640000, medido: 96000, ret: 5, inss: true },
    { id: ID(), obra: 'm2', emp: 'Pisos Brasil Industrial', serv: 'Piso de concreto polido', valor: 1980000, medido: 1260000, ret: 5, inss: true },
    { id: ID(), obra: 'm4', emp: 'Altura Segura Serviços', serv: 'Montagem e operação de balancins', valor: 380000, medido: 290000, ret: 5, inss: false },
  ];
  const contas = [
    ['m1', 'pagar', 'Concreteira Horizonte · NF 33190', 186400, 6], ['m1', 'pagar', 'Fôrmas Ideal · medição 5', 98000, 2], ['m1', 'receber', 'Vale Incorporações · medição 9', 670000, 11], ['m2', 'pagar', 'Pisos Brasil · medição 4', 142000, -1],
    ['m2', 'receber', 'LogMinas · medição 12', 820000, 18], ['m3', 'receber', 'Prefeitura de Contagem · BM 03', 310000, 25], ['m4', 'pagar', 'Atlas Revestimentos · pastilha', 32400, 4], ['m4', 'receber', 'Condomínio Guaicurus · parcela 14', 270000, 9],
  ].map(([obra, tipo, desc, valor, vence]) => ({ id: ID(), obra, tipo, desc, valor, vence, pago: false }));
  const rdos = [
    { id: ID(), obra: 'm1', dia: -1, manha: 'Sol', tarde: 'Nublado', efetivo: { Pedreiro: 14, Servente: 18, Carpinteiro: 9, Armador: 7, Eletricista: 2 }, equip: 'Grua, betoneira 400 L, guincho', ativ: 'Concretagem da laje do 7º pavimento (68 m³). Montagem de formas do 8º pavimento iniciada.', ocorr: 'Atraso de 40 min do caminhão de concreto.', fotos: ['Concretagem laje 7º', 'Formas 8º pav.'] },
    { id: ID(), obra: 'm1', dia: -2, manha: 'Sol', tarde: 'Sol', efetivo: { Pedreiro: 15, Servente: 17, Carpinteiro: 10, Armador: 8 }, equip: 'Grua, vibradores', ativ: 'Armação da laje do 7º pavimento conferida pelo engenheiro.', ocorr: '', fotos: ['Armação conferida'] },
    { id: ID(), obra: 'm4', dia: -1, manha: 'Chuva', tarde: 'Nublado', efetivo: { Pedreiro: 6, Servente: 5 }, equip: 'Balancins (3)', ativ: 'Trabalho na fachada suspenso de manhã pela chuva. À tarde, rejunte da fachada oeste.', ocorr: 'NC aberta: balancim sem trava-quedas reserva.', fotos: [] },
  ];
  return { empresa: { nome: 'Grupo Monólito Engenharia', cnpj: '24.118.390/0001-02' }, eu: { nome: 'Ricardo Bastos', cargo: 'Diretor de engenharia', letra: 'normal', abrir: 'carteira', lateral: 'raio' },
    obras, cotacoes, contratos, contas, rdos, foco: 'm1', camada: 'carteira', supAba: 'cotacoes', finAba: 'dre', plano: 'basico',
    acessos: [{ id: 'u1', nome: 'Larissa Pimenta', email: 'larissa@monolito.eng.br', cargo: 'Engenheira de obra' }, { id: 'u2', nome: 'Otávio Reis', email: 'otavio@monolito.eng.br', cargo: 'Suprimentos' }, { id: 'u3', nome: 'Helena Duarte', email: 'helena@monolito.eng.br', cargo: 'Controladoria' }, { id: 'u4', nome: 'Sebastião Cruz', email: 'sebastiao@monolito.eng.br', cargo: 'Mestre de obras' }],
    auditoria: [{ dia: -1, hora: '17:42', quem: 'Larissa Pimenta', oque: 'Registrou o RDO da Torre A' }, { dia: -1, hora: '11:05', quem: 'Otávio Reis', oque: 'Abriu cotação de concreto usinado (240 m³)' }, { dia: -2, hora: '09:31', quem: 'Helena Duarte', oque: 'Baixou o recebimento da medição 11 da LogMinas' }],
    conversa: [] };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || semear(); } catch { return semear(); } })();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { toast('Sem espaço no navegador para guardar.'); } };
const registrar = (oque) => { const h = new Date(); db.auditoria.unshift({ dia: 0, hora: h.toTimeString().slice(0, 5), quem: db.eu.nome, oque }); db.auditoria = db.auditoria.slice(0, 200); };
const foco = () => db.obras.find((o) => o.id === db.foco) || db.obras[0];

// ------------------------------------------------------------------ indicadores
const fisicoReal = (o) => o.real[o.real.length - 1], fisicoPlan = (o) => o.plan[3];
const unit = (c) => c.ins.reduce((t, i) => t + i.coef * i.preco, 0);
const BDI = { adm: 4.0, seguro: 0.8, risco: 1.2, fin: 1.0, lucro: 7.4, imp: 8.65 };
const bdiTotal = () => ((1 + (BDI.adm + BDI.seguro + BDI.risco) / 100) * (1 + BDI.fin / 100) * (1 + BDI.lucro / 100)) / (1 - BDI.imp / 100) - 1;
function saude(o) {
  const prazo = fisicoReal(o) - fisicoPlan(o), custo = o.custoReal / o.custoOrc - fisicoReal(o), caixa = o.recebido - o.custoReal, ncs = o.ncs.filter((n) => n.aberta);
  const cor = (ruim, atencao) => (ruim ? 'var(--vermelho)' : atencao ? 'var(--ambar)' : 'var(--verde)');
  return { prazo, custo, caixa, ncs,
    luzes: [['Prazo', cor(prazo < -0.05, prazo < -0.02)], ['Custo', cor(custo > 0.06, custo > 0.02)], ['Caixa', cor(caixa < 0, caixa < o.contrato * 0.03)], ['Qualidade', cor(ncs.some((n) => n.grav === 'Alta'), ncs.length > 0)]] };
}
const docsAlerta = (o) => o.docs.filter((d) => d.vence <= 30);

function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; $('#toasts').append(d); setTimeout(() => d.remove(), 3500); }
function modal(html, ao) {
  const v = document.createElement('div'); v.className = 'veu'; v.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  const antes = document.activeElement; document.body.append(v);
  const fechar = () => { v.remove(); antes?.focus?.(); };
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-x]')) fechar(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });
  setTimeout(() => (v.querySelector('input, select, textarea') || v.querySelector('button'))?.focus(), 30);
  ao?.(v.querySelector('.modal'), fechar);
}
function ficha(titulo, campos, botao, salvar) {
  modal(`<h2>${titulo}</h2><form>${campos}<div class="pe-m"><button type="button" class="bt" data-x>Cancelar</button><button class="bt forte">${botao}</button></div></form>`, (m, fechar) => {
    m.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); if (salvar(new FormData(e.target)) !== false) { gravar(); fechar(); render(); } });
  });
}

// ------------------------------------------------------------------ camadas
const CAMADAS = [['carteira', 'Carteira', '1'], ['orcamento', 'Orçamento', '2'], ['planejamento', 'Físico-financeiro', '3'], ['rdo', 'Diário (RDO)', '4'], ['suprimentos', 'Suprimentos', '5'], ['contratos', 'Contratos', '6'], ['financeiro', 'Financeiro', '7'], ['qualidade', 'Qualidade e SST', '8'], ['documentos', 'Documentos', '9'], ['acesso', 'Acesso e auditoria', '0'], ['ajustes', 'Ajustes', '']];
const V = {
  carteira() {
    const tot = db.obras.reduce((a, o) => ({ c: a.c + o.contrato, m: a.m + o.medido, r: a.r + o.recebido, cr: a.cr + o.custoReal, co: a.co + o.custoOrc }), { c: 0, m: 0, r: 0, cr: 0, co: 0 });
    return `<div class="topo-c"><div><h1>Carteira de obras</h1><p>${db.obras.length} obras · ${MI(tot.c)} contratados · clique numa obra para pôr em foco</p></div><div class="acoes"><button class="bt forte" data-a="nova-obra">+ Obra</button></div></div>
      <div class="grade"><div class="bloco s3 kpi escuro"><h2>Contratado</h2><b>${MI(tot.c)}</b><span>saldo a executar ${MI(tot.c - tot.m)}</span></div><div class="bloco s3 kpi"><h2>Medido</h2><b>${MI(tot.m)}</b><span>${P(tot.m / tot.c)} da carteira</span></div><div class="bloco s3 kpi"><h2>A receber</h2><b>${MI(tot.m - tot.r)}</b><span>medições faturadas em aberto</span></div><div class="bloco s3 kpi"><h2>Margem projetada</h2><b>${P(1 - tot.co / tot.c, 1)}</b><span>custo real ${MI(tot.cr)}</span></div>
      <div class="bloco"><div class="carteira">${db.obras.map((o) => { const s = saude(o); return `<button class="cartao-obra" style="--c:${o.cor}" data-foco="${o.id}"><h3>${E(o.nome)}</h3><small>${E(o.cliente || o.cli)} · ${E(o.cidade)}</small>
        <div class="medidor"><div class="rot"><span>Físico ${P(fisicoReal(o))} de ${P(fisicoPlan(o))} planejado</span><b>${s.prazo >= 0 ? '+' : ''}${P(s.prazo, 1)}</b></div><div class="trilho ${s.prazo < -0.05 ? 'ruim' : ''}" style="background:var(--osso-2)"><i style="width:${fisicoReal(o) * 100}%"></i><em style="left:${fisicoPlan(o) * 100}%"></em></div></div>
        <div class="luzes">${s.luzes.map(([t, c]) => `<span style="--c:${c}">${t}</span>`).join('')}</div><small>Contrato ${MI(o.contrato)} · custo ${P(o.custoReal / o.custoOrc)} do orçado</small></button>`; }).join('')}</div></div></div>`;
  },
  orcamento() {
    const o = foco(), abc = {}; let direto = 0;
    o.composicoes.forEach((c) => { const t = c.qtd * unit(c); direto += t; c.ins.forEach((i) => { const k = i.nome; abc[k] ||= { nome: k, tipo: i.tipo, v: 0 }; abc[k].v += c.qtd * i.coef * i.preco; }); });
    let acc = 0; const curva = Object.values(abc).sort((a, b) => b.v - a.v).map((x) => { acc += x.v; return { ...x, acc: acc / direto, cls: acc / direto <= 0.8 ? 'A' : acc / direto <= 0.95 ? 'B' : 'C' }; });
    const porTipo = ['MAT', 'MO', 'EQ'].map((t) => [t, curva.filter((x) => x.tipo === t).reduce((s, x) => s + x.v, 0)]);
    return `<div class="topo-c"><div><h1>Orçamento analítico</h1><p>${E(o.nome)} · composições com insumos (base SINAPI) e BDI pela fórmula do TCU</p></div><div class="acoes"><button class="bt" data-a="exportar-orc">Exportar planilha</button><button class="bt forte" data-a="nova-comp">+ Composição</button></div></div>
      <div class="grade"><div class="bloco s3 kpi escuro"><h2>Custo direto</h2><b>${MI(direto)}</b><span>${porTipo.map(([t, v]) => `${t} ${P(v / direto)}`).join(' · ')}</span></div><div class="bloco s3 kpi"><h2>BDI</h2><b>${P(bdiTotal(), 2)}</b><span>adm ${BDI.adm}% · lucro ${BDI.lucro}% · tributos ${BDI.imp}%</span></div><div class="bloco s3 kpi"><h2>Preço de venda</h2><b>${MI(direto * (1 + bdiTotal()))}</b><span>${BRL2(direto * (1 + bdiTotal()) / o.area)}/m²</span></div><div class="bloco s3 kpi"><h2>Itens curva A</h2><b>${curva.filter((x) => x.cls === 'A').length} de ${curva.length}</b><span>concentram 80% do custo</span></div>
      <div class="bloco s8"><h2>Composições</h2><div class="tb"><table><thead><tr><th>Código</th><th>Serviço / insumo</th><th>Un.</th><th class="n">Coef.</th><th class="n">Preço</th><th class="n">Qtd</th><th class="n">Total</th></tr></thead><tbody>
        ${o.composicoes.map((c, ci) => `<tr class="grupo"><td class="mono">${E(c.cod)}</td><td>${E(c.serv)}</td><td>${c.un}</td><td></td><td class="n">${BRL2(unit(c))}</td><td class="n"><input class="n" data-qtd="${ci}" value="${String(c.qtd).replace('.', ',')}" aria-label="Quantidade de ${E(c.serv)}"></td><td class="n">${BRL(c.qtd * unit(c))}</td></tr>
          ${c.ins.map((i) => `<tr><td></td><td><span class="tag ${i.tipo === 'MAT' ? '' : i.tipo === 'MO' ? 'a' : 'v'}">${i.tipo}</span> ${E(i.nome)}</td><td>${i.un}</td><td class="n">${i.coef.toLocaleString('pt-BR')}</td><td class="n">${BRL2(i.preco)}</td><td></td><td class="n">${BRL(c.qtd * i.coef * i.preco)}</td></tr>`).join('')}`).join('')}
        <tr class="soma"><td colspan="6">Custo direto</td><td class="n">${BRL(direto)}</td></tr><tr><td colspan="6">BDI ${P(bdiTotal(), 2)}</td><td class="n">${BRL(direto * bdiTotal())}</td></tr><tr class="soma"><td colspan="6">Preço global</td><td class="n">${BRL(direto * (1 + bdiTotal()))}</td></tr></tbody></table></div></div>
      <div class="bloco s4"><h2>Curva ABC de insumos</h2><div class="tb"><table><thead><tr><th></th><th>Insumo</th><th class="n">Valor</th><th class="n">Acum.</th></tr></thead><tbody>${curva.map((x) => `<tr><td><span class="tag ${x.cls === 'A' ? 'o' : x.cls === 'B' ? 'a' : ''}">${x.cls}</span></td><td>${E(x.nome)}</td><td class="n">${MI(x.v)}</td><td class="n">${P(x.acc)}</td></tr>`).join('')}</tbody></table></div></div></div>`;
  },
  planejamento() {
    const o = foco(), W = 640, H = 210, x = (i) => 40 + i * (W - 60) / 8, y = (v) => 15 + (1 - v) * (H - 40);
    const linha = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const desvio = fisicoReal(o) - fisicoPlan(o), tendencia = fisicoReal(o) / (fisicoPlan(o) || 1);
    return `<div class="topo-c"><div><h1>Físico-financeiro</h1><p>${E(o.nome)} · curva S planejada x realizada, mês a mês</p></div><div class="acoes"><button class="bt forte" data-a="apontar">Apontar avanço do mês</button></div></div>
      <div class="grade"><div class="bloco s3 kpi ${desvio < -0.03 ? 'escuro' : ''}"><h2>Desvio de prazo</h2><b>${desvio >= 0 ? '+' : ''}${P(desvio, 1)}</b><span>${desvio < 0 ? 'atrás do planejado' : 'em dia'}</span></div><div class="bloco s3 kpi"><h2>Índice de desempenho</h2><b>${tendencia.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</b><span>abaixo de 1,00: obra mais lenta que o plano</span></div><div class="bloco s3 kpi"><h2>Término projetado</h2><b>${MES(Math.round(5 + (1 / tendencia - 1) * 9))}</b><span>planejado ${MES(5)}</span></div><div class="bloco s3 kpi"><h2>Faturar no mês</h2><b>${MI(o.contrato * (o.plan[3] - o.plan[2]))}</b><span>pelo planejado</span></div>
      <div class="bloco s7 curva"><h2>Curva S</h2><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Curva S planejada e realizada">${[0, .25, .5, .75, 1].map((v) => `<line x1="40" x2="${W - 20}" y1="${y(v)}" y2="${y(v)}" stroke="#ddd"/><text x="4" y="${y(v) + 4}">${v * 100}%</text>`).join('')}
        <line x1="${x(3)}" x2="${x(3)}" y1="10" y2="${H - 25}" stroke="#a0442e" stroke-dasharray="4 3"/><path d="${linha(o.plan)}" fill="none" stroke="#a8aaa0" stroke-width="2.5" stroke-dasharray="6 4"/><path d="${linha(o.real)}" fill="none" stroke="#5e6548" stroke-width="3.5"/>
        ${MESES.map((m, i) => `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${MES(m)}</text>`).join('')}</svg><p class="vz">— realizado · - - planejado · linha vermelha: mês atual</p></div>
      <div class="bloco s5"><h2>Cronograma físico-financeiro</h2><div class="tb"><table><thead><tr><th>Mês</th><th class="n">Plan. mês</th><th class="n">Real mês</th><th class="n">Plan. acum.</th><th class="n">Valor plan.</th></tr></thead><tbody>
        ${MESES.map((m, i) => `<tr ${i === 3 ? 'class="grupo"' : ''}><td>${MES(m)}</td><td class="n">${P(o.plan[i] - (o.plan[i - 1] || 0), 1)}</td><td class="n">${o.real[i] != null ? P(o.real[i] - (o.real[i - 1] || 0), 1) : '—'}</td><td class="n">${P(o.plan[i])}</td><td class="n">${MI(o.contrato * (o.plan[i] - (o.plan[i - 1] || 0)))}</td></tr>`).join('')}</tbody></table></div></div></div>`;
  },
  rdo() {
    const o = foco(), l = db.rdos.filter((r) => r.obra === o.id).sort((a, b) => b.dia - a.dia);
    return `<div class="topo-c"><div><h1>Relatório diário de obra</h1><p>${E(o.nome)} · clima, efetivo por função, equipamentos, atividades e ocorrências</p></div><div class="acoes"><label class="bt forte" style="cursor:pointer">+ RDO com fotos<input type="file" accept="image/*" multiple hidden id="rdo-fotos"></label><button class="bt" data-a="novo-rdo">+ RDO</button></div></div>
      ${l.map((r) => { const ef = Object.values(r.efetivo).reduce((a, b) => a + b, 0); return `<article class="rdo"><div class="lado"><b>${DATA(r.dia)}</b><small>manhã: ${E(r.manha)}<br>tarde: ${E(r.tarde)}</small><br><small>${ef} pessoas</small></div><div><div class="chips-rdo">${Object.entries(r.efetivo).map(([f, n]) => `<span class="tag">${E(f)} ${n}</span>`).join('')}${r.equip ? `<span class="tag v">${E(r.equip)}</span>` : ''}</div><p style="margin:4px 0">${E(r.ativ)}</p>${r.ocorr ? `<p style="margin:4px 0;color:var(--vermelho)"><b>Ocorrência:</b> ${E(r.ocorr)}</p>` : ''}${r.fotos.length ? `<div class="fts">${r.fotos.map((f) => (f.startsWith('data:') ? `<img src="${f}" alt="Foto do RDO">` : `<span>${E(f)}</span>`)).join('')}</div>` : ''}</div></article>`; }).join('') || '<p class="vz">Nenhum RDO desta obra. Obra pública exige RDO diário entregue à fiscalização.</p>'}`;
  },
  suprimentos() {
    const o = foco(), aba = db.supAba;
    const seg = `<div class="seg" role="group" aria-label="Suprimentos"><button data-a="sup-aba" data-v="cotacoes" aria-pressed="${aba === 'cotacoes'}">Cotações</button><button data-a="sup-aba" data-v="almox" aria-pressed="${aba === 'almox'}">Almoxarifado</button></div>`;
    if (aba === 'almox') return `<div class="topo-c"><div><h1>Almoxarifado</h1><p>${E(o.nome)} · saldo por insumo, mínimo e movimentações</p></div><div class="acoes">${seg}</div></div>
      <div class="bloco"><div class="tb"><table><thead><tr><th>Insumo</th><th>Un.</th><th class="n">Saldo</th><th class="n">Mínimo</th><th class="n">Valor em estoque</th><th>Situação</th><th></th></tr></thead><tbody>
      ${o.almox.map((a) => `<tr><td>${E(a.nome)}</td><td>${a.un}</td><td class="n">${a.saldo.toLocaleString('pt-BR')}</td><td class="n">${a.minimo.toLocaleString('pt-BR')}</td><td class="n">${BRL(a.saldo * a.preco)}</td><td>${a.saldo < a.minimo ? '<span class="tag r">abaixo do mínimo</span>' : '<span class="tag v">ok</span>'}</td><td class="n"><button class="bt mini" data-a="mov" data-t="entrada" data-i="${a.id}">Entrada</button> <button class="bt mini" data-a="mov" data-t="saida" data-i="${a.id}">Saída</button> <button class="bt mini" data-a="mov" data-t="transf" data-i="${a.id}">Transferir</button></td></tr>`).join('')}
      <tr class="soma"><td colspan="4">Total em estoque</td><td class="n">${BRL(o.almox.reduce((t, a) => t + a.saldo * a.preco, 0))}</td><td colspan="2"></td></tr></tbody></table></div></div>`;
    const l = db.cotacoes.filter((c) => c.obra === o.id);
    return `<div class="topo-c"><div><h1>Cotações</h1><p>${E(o.nome)} · três fornecedores lado a lado, a melhor proposta destacada</p></div><div class="acoes">${seg}<button class="bt forte" data-a="nova-cot">+ Cotação</button></div></div>
      ${l.map((c) => { const melhor = c.propostas.reduce((m, p, i) => (p[1] < c.propostas[m][1] ? i : m), 0); return `<div class="bloco" style="margin-bottom:12px"><h2><span>${E(c.item)} · ${c.qtd.toLocaleString('pt-BR')} ${c.un}</span>${c.escolhido != null ? '<span class="tag v">aprovada</span>' : '<span class="tag a">aguardando decisão</span>'}</h2><div class="tb"><table><thead><tr><th>Fornecedor</th><th class="n">Preço unit.</th><th class="n">Total</th><th class="n">Prazo (dias)</th><th></th></tr></thead><tbody>
        ${c.propostas.map((p, i) => `<tr class="${i === melhor ? 'melhor' : ''}"><td>${E(p[0])}${i === melhor ? ' <span class="tag o">menor preço</span>' : ''}</td><td class="n">${BRL2(p[1])}</td><td class="n">${BRL(p[1] * c.qtd)}</td><td class="n">${p[2]}</td><td class="n">${c.escolhido == null ? `<button class="bt mini ${i === melhor ? 'oliva' : ''}" data-a="aprovar-cot" data-c="${c.id}" data-i="${i}">Aprovar</button>` : c.escolhido === i ? '<span class="tag v">pedido emitido</span>' : ''}</td></tr>`).join('')}</tbody></table></div>${c.escolhido == null ? `<p class="vz">Economia escolhendo a menor: ${BRL((Math.max(...c.propostas.map((p) => p[1])) - c.propostas[melhor][1]) * c.qtd)} contra a mais cara.</p>` : ''}</div>`; }).join('') || '<p class="vz">Nenhuma cotação desta obra.</p>'}`;
  },
  contratos() {
    const o = foco(), l = db.contratos.filter((c) => c.obra === o.id);
    return `<div class="topo-c"><div><h1>Contratos de empreiteiros</h1><p>${E(o.nome)} · medição, retenção técnica e INSS retido (11% sobre a mão de obra)</p></div><div class="acoes"><button class="bt forte" data-a="novo-contrato">+ Contrato</button></div></div>
      <div class="bloco"><div class="tb"><table><thead><tr><th>Empreiteiro</th><th>Serviço</th><th class="n">Contrato</th><th>Medido</th><th class="n">Retenção</th><th class="n">INSS retido</th><th class="n">Saldo</th><th></th></tr></thead><tbody>
      ${l.map((c) => `<tr><td><b>${E(c.emp)}</b></td><td>${E(c.serv)}</td><td class="n">${BRL(c.valor)}</td><td><div class="barrinha"><i style="width:${c.medido / c.valor * 100}%"></i></div><small class="mono">${BRL(c.medido)} (${P(c.medido / c.valor)})</small></td><td class="n">${BRL(c.medido * c.ret / 100)}</td><td class="n">${c.inss ? BRL(c.medido * 0.5 * 0.11) : '—'}</td><td class="n">${BRL(c.valor - c.medido)}</td><td><button class="bt mini" data-a="medir-contrato" data-c="${c.id}">Medir</button></td></tr>`).join('') || '<tr><td colspan="8" class="vz">Nenhum contrato nesta obra.</td></tr>'}</tbody></table></div></div>`;
  },
  financeiro() {
    const o = foco(), aba = db.finAba, seg = `<div class="seg"><button data-a="fin-aba" data-v="dre" aria-pressed="${aba === 'dre'}">DRE da obra</button><button data-a="fin-aba" data-v="contas" aria-pressed="${aba === 'contas'}">Contas</button></div>`;
    if (aba === 'contas') { const l = db.contas.filter((c) => c.obra === o.id).sort((a, b) => a.pago - b.pago || a.vence - b.vence); return `<div class="topo-c"><div><h1>Contas da obra</h1><p>${E(o.nome)}</p></div><div class="acoes">${seg}<button class="bt forte" data-a="nova-conta">+ Conta</button></div></div>
      <div class="bloco"><div class="tb"><table><thead><tr><th>Tipo</th><th>Descrição</th><th class="n">Vencimento</th><th class="n">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${l.map((c) => `<tr><td><span class="tag ${c.tipo === 'receber' ? 'v' : 'r'}">${c.tipo}</span></td><td>${E(c.desc)}</td><td class="n">${DATA(c.vence)}</td><td class="n">${BRL2(c.valor)}</td><td>${c.pago ? '<span class="tag v">baixada</span>' : c.vence < 0 ? '<span class="tag r">vencida</span>' : '<span class="tag">aberta</span>'}</td><td>${c.pago ? '' : `<button class="bt mini" data-a="baixar" data-c="${c.id}">Baixar</button>`}</td></tr>`).join('')}</tbody></table></div></div>`; }
    const imp = o.medido * 0.0673, contr = db.contratos.filter((c) => c.obra === o.id).reduce((t, c) => t + c.medido, 0), proprio = o.custoReal - contr, res = o.medido - imp - o.custoReal;
    const linha = (t, v, f = '') => `<tr class="${f}"><td>${t}</td><td class="n">${BRL(v)}</td><td class="n">${P(v / o.medido, 1)}</td></tr>`;
    return `<div class="topo-c"><div><h1>DRE da obra</h1><p>${E(o.nome)} · resultado sobre o que já foi medido</p></div><div class="acoes">${seg}</div></div>
      <div class="grade"><div class="bloco s6"><div class="tb"><table><thead><tr><th>Conta</th><th class="n">Valor</th><th class="n">% da receita</th></tr></thead><tbody>${linha('Receita medida', o.medido, 'grupo')}${linha('(−) Tributos sobre faturamento (6,73%)', -imp)}${linha('(−) Custo com equipe própria e materiais', -proprio)}${linha('(−) Empreiteiros contratados', -contr)}${linha('= Resultado da obra até aqui', res, 'soma')}</tbody></table></div></div>
      <div class="bloco s6"><h2>Projeção no fim da obra</h2><div class="tb"><table><tbody><tr><td>Contrato</td><td class="n">${BRL(o.contrato)}</td></tr><tr><td>Custo orçado</td><td class="n">${BRL(o.custoOrc)}</td></tr><tr><td>Custo projetado (ritmo atual)</td><td class="n">${BRL(o.custoReal / fisicoReal(o))}</td></tr><tr class="soma"><td>Margem projetada</td><td class="n">${P(1 - o.custoReal / fisicoReal(o) / o.contrato - 0.0673, 1)}</td></tr></tbody></table></div><p class="vz">Projeção = custo gasto ÷ avanço físico. Se passar do orçado, o Raio-X acende o custo.</p></div></div>`;
  },
  qualidade() {
    const o = foco();
    return `<div class="topo-c"><div><h1>Qualidade e segurança</h1><p>${E(o.nome)} · fichas de verificação (FVS), NR-18 / NR-35 e não conformidades</p></div><div class="acoes"><button class="bt forte" data-a="nova-nc">+ Não conformidade</button></div></div>
      <div class="grade"><div class="bloco s5"><h2>Checklists</h2><ul class="lat-lista" style="color:var(--tx)">${o.checklists.map((c) => `<li><span>${E(c.nome)}</span><span class="mono">${P(c.ok / c.itens)} <span class="tag ${c.ok / c.itens < 0.9 ? 'a' : 'v'}">${c.ok}/${c.itens}</span></span></li>`).join('')}</ul></div>
      <div class="bloco s7"><h2>Não conformidades</h2><div class="tb"><table><thead><tr><th>Gravidade</th><th>O que</th><th>Onde</th><th class="n">Aberta em</th><th></th></tr></thead><tbody>${o.ncs.map((n) => `<tr><td><span class="tag ${n.grav === 'Alta' ? 'r' : n.grav === 'Média' ? 'a' : ''}">${n.grav}</span></td><td>${E(n.desc)}</td><td>${E(n.local)}</td><td class="n">${DATA(n.dia)}</td><td>${n.aberta ? `<button class="bt mini" data-a="fechar-nc" data-n="${n.id}">Encerrar</button>` : '<span class="tag v">encerrada</span>'}</td></tr>`).join('') || '<tr><td colspan="5" class="vz">Nenhuma não conformidade.</td></tr>'}</tbody></table></div></div></div>`;
  },
  documentos() {
    const todos = db.obras.flatMap((o) => o.docs.map((d) => ({ o, d }))).sort((a, b) => a.d.vence - b.d.vence);
    return `<div class="topo-c"><div><h1>Documentos e licenças</h1><p>De todas as obras · avisamos 30 dias antes de vencer</p></div></div>
      <div class="bloco"><div class="tb"><table><thead><tr><th>Documento</th><th>Obra</th><th class="n">Vence</th><th>Situação</th><th></th></tr></thead><tbody>${todos.map(({ o, d }) => `<tr><td>${E(d.nome)}</td><td>${E(o.nome)}</td><td class="n">${DATA(d.vence)}</td><td>${d.vence < 0 ? '<span class="tag r">vencido</span>' : d.vence <= 30 ? `<span class="tag a">vence em ${d.vence} dias</span>` : '<span class="tag v">válido</span>'}</td><td><button class="bt mini" data-a="renovar" data-o="${o.id}" data-d="${d.id}">Renovar</button></td></tr>`).join('')}</tbody></table></div></div>`;
  },
  acesso() {
    const CAM = CAMADAS.slice(1, 9), CARGOS = { 'Engenheira de obra': 'eeeeevee', 'Mestre de obras': '-vev---e', Suprimentos: 'v--e-v--', Controladoria: 'vv-vee-v', 'Fiscal do cliente': '-vv---v-' };
    const nivel = { e: ['editar', 'v'], v: ['ver', 'a'], '-': ['—', ''] }, preco = db.plano === 'pro' ? 309 : 249;
    return `<div class="topo-c"><div><h1>Acesso e auditoria</h1><p>Painel do dono: quem entra, o que cada cargo pode em cada camada e o registro de tudo o que muda</p></div><div class="acoes"><button class="bt forte" data-a="convidar">+ Convidar</button></div></div>
      <div class="grade"><div class="bloco s3 kpi escuro"><h2>Plano</h2><b>Assinatura</b><span>${BRL(preco)}/mês · sem fidelidade</span></div><div class="bloco s3 kpi"><h2>Usuários</h2><b>${db.acessos.length + 1}</b><span>sem limite</span></div>
        <div class="bloco s6"><h2>Plano</h2><div class="acoes"><button class="bt ${db.plano === 'basico' ? 'forte' : ''}" data-a="plano" data-v="basico">Assinatura · R$ 249/mês</button></div><p class="vz">Anual com 20% a menos. Na contratada, a troca é confirmada no Mercado Pago.</p></div>
        <div class="bloco s5"><h2>Usuários</h2><div class="tb"><table><tbody><tr><td><b>${E(db.eu.nome)}</b><br><small>${E(db.eu.cargo)} · dono</small></td><td>acesso total</td><td></td></tr>${db.acessos.map((a) => `<tr><td><b>${E(a.nome)}</b><br><small>${E(a.email)}</small></td><td><select data-cargo="${a.id}" aria-label="Cargo de ${E(a.nome)}">${Object.keys(CARGOS).map((c) => `<option ${c === a.cargo ? 'selected' : ''}>${c}</option>`).join('')}</select></td><td><button class="bt mini" data-a="tirar" data-u="${a.id}">Tirar</button></td></tr>`).join('')}</tbody></table></div></div>
        <div class="bloco s7"><h2>Permissões por camada</h2><div class="tb"><table><thead><tr><th>Cargo</th>${CAM.map(([, t]) => `<th>${t}</th>`).join('')}</tr></thead><tbody>${Object.entries(CARGOS).map(([c, s]) => `<tr><td><b>${c}</b></td>${[...s].map((x) => `<td><span class="tag ${nivel[x][1]}">${nivel[x][0]}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="vz">O fiscal do cliente vê o avanço e os RDOs pelo link dele, sem ver custos.</p></div>
        <div class="bloco"><h2>Auditoria</h2><div class="tb" style="max-height:280px"><table><thead><tr><th>Quando</th><th>Quem</th><th>O que mudou</th></tr></thead><tbody>${db.auditoria.map((a) => `<tr><td class="mono">${DATA(a.dia)} ${a.hora}</td><td>${E(a.quem)}</td><td>${E(a.oque)}</td></tr>`).join('')}</tbody></table></div></div></div>`;
  },
  ajustes() {
    const e = db.eu;
    return `<div class="topo-c"><div><h1>Ajustes</h1><p>Preferências pessoais e dados da empresa</p></div></div><div class="grade">
      <div class="bloco s6"><h2>Você</h2><label class="cp">Nome<input data-eu="nome" value="${E(e.nome)}"></label><label class="cp">Cargo exibido<input data-eu="cargo" value="${E(e.cargo)}"></label>
        <div class="l2"><label class="cp">Abrir em<select data-eu="abrir">${CAMADAS.slice(0, 10).map(([k, t]) => `<option value="${k}" ${e.abrir === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label class="cp">Letras<select data-eu="letra"><option value="normal" ${e.letra === 'normal' ? 'selected' : ''}>Normal</option><option value="grande" ${e.letra === 'grande' ? 'selected' : ''}>Grande</option></select></label></div>
        <label class="cp">Painel da direita começa em<select data-eu="lateral"><option value="raio" ${e.lateral === 'raio' ? 'selected' : ''}>Raio-X da obra</option><option value="ia" ${e.lateral === 'ia' ? 'selected' : ''}>Copiloto IA</option></select></label></div>
      <div class="bloco s6"><h2>Empresa</h2><label class="cp">Razão social<input data-emp="nome" value="${E(db.empresa.nome)}"></label><label class="cp">CNPJ<input data-emp="cnpj" value="${E(db.empresa.cnpj)}"></label><p class="vz">Atalhos: teclas 1 a 9 e 0 trocam de camada; R abre um RDO novo.</p></div></div>`;
  },
};

// ------------------------------------------------------------------ painel lateral: Raio-X e Copiloto
function lateral() {
  // começou do zero: sem obra em foco, a lateral só convida a cadastrar
  if (!foco()) return '<div class="lat-vazio" style="padding:18px;opacity:.8">Cadastre a primeira obra na Carteira para ver o Raio-X e o Copiloto.</div>';
  const o = foco(), s = saude(o), aba = db.latAba || db.eu.lateral || 'raio';
  const abas = `<div class="lat-abas"><button data-a="lat" data-v="raio" aria-pressed="${aba === 'raio'}">Raio-X</button><button data-a="lat" data-v="ia" aria-pressed="${aba === 'ia'}">Copiloto IA</button></div>`;
  if (aba === 'ia') {
    const sug = ['Onde esta obra está perdendo dinheiro?', 'Qual cotação aprovar?', 'O que vence nos próximos 30 dias?', 'Resuma o último RDO para o cliente', 'Quanto faturar este mês?'];
    return `${abas}<div class="copiloto"><div class="msgs">${(db.conversa.length ? db.conversa : [{ ia: true, t: `Copiloto pronto. Estou olhando "${o.nome}". Pergunte sobre custo, prazo, compras, contratos ou documentos.` }]).map((m) => `<div class="msg ${m.ia ? 'ia' : 'voce'}">${E(m.t)}</div>`).join('')}</div>
      <div class="atalhos-ia">${sug.map((x) => `<button data-sug="${E(x)}">${E(x)}</button>`).join('')}</div><form id="f-ia"><input id="q-ia" placeholder="Pergunte ao copiloto" aria-label="Pergunta ao copiloto"><button>Enviar</button></form><small style="color:var(--cinza)">Exemplo da demonstração. Na contratada, 20 perguntas grátis por dia; a IA vê só números, nunca documentos de pessoas.</small></div>`;
  }
  const custoPct = o.custoReal / o.custoOrc;
  return `${abas}<div class="raio"><div><h3>${E(o.nome)}</h3><small>${E(o.tipo)} · ${E(o.cidade)}</small></div>
    <div class="semaforo">${s.luzes.map(([t, c]) => `<div style="--c:${c}"><b></b>${t}</div>`).join('')}</div>
    <div class="medidor"><div class="rot"><span>Físico (real x plano)</span><b>${P(fisicoReal(o))} / ${P(fisicoPlan(o))}</b></div><div class="trilho ${s.prazo < -0.03 ? 'ruim' : ''}"><i style="width:${fisicoReal(o) * 100}%"></i><em style="left:${fisicoPlan(o) * 100}%"></em></div></div>
    <div class="medidor"><div class="rot"><span>Custo usado x avanço</span><b>${P(custoPct)} / ${P(fisicoReal(o))}</b></div><div class="trilho ${custoPct > fisicoReal(o) + 0.04 ? 'ruim' : ''}"><i style="width:${Math.min(100, custoPct * 100)}%"></i><em style="left:${fisicoReal(o) * 100}%"></em></div></div>
    <div class="medidor"><div class="rot"><span>Medido x recebido</span><b>${MI(o.medido)} / ${MI(o.recebido)}</b></div><div class="trilho"><i style="width:${o.recebido / o.medido * 100}%"></i></div></div>
    <ul class="lat-lista"><li><span>Contrato</span><b class="mono">${MI(o.contrato)}</b></li><li><span>Caixa da obra (recebido − gasto)</span><b class="mono" style="color:${s.caixa < 0 ? '#e3907a' : 'inherit'}">${MI(s.caixa)}</b></li><li><span>Não conformidades abertas</span><b class="mono">${s.ncs.length}</b></li><li><span>Documentos vencendo</span><b class="mono">${docsAlerta(o).length}</b></li></ul>
    ${docsAlerta(o).length ? `<ul class="lat-lista">${docsAlerta(o).map((d) => `<li><span>${E(d.nome)}</span><span style="color:${d.vence < 0 ? '#e3907a' : 'var(--cascalho)'}">${d.vence < 0 ? 'vencido' : `${d.vence} d`}</span></li>`).join('')}</ul>` : ''}</div>`;
}
function copiloto(p) {
  const o = foco(), t = NORM(p), s = saude(o);
  if (/perd|dinheiro|custo|estour/.test(t)) return `Em "${o.nome}" o custo já está em ${P(o.custoReal / o.custoOrc)} do orçado com ${P(fisicoReal(o))} de avanço físico (${s.custo > 0 ? `${P(s.custo, 1)} acima do ritmo` : 'dentro do ritmo'}).\nOnde olhar: insumos da curva A (concreto e aço) e as medições de empreiteiros contra o executado. Projeção de custo final: ${MI(o.custoReal / fisicoReal(o))}.`;
  if (/cotac|aprovar|fornecedor|compra/.test(t)) { const c = db.cotacoes.find((x) => x.obra === o.id && x.escolhido == null); if (!c) return 'Nenhuma cotação esperando decisão nesta obra.'; const m = c.propostas.reduce((a, b) => (b[1] < a[1] ? b : a)); return `Para "${c.item}": ${m[0]} tem o menor preço (${BRL2(m[1])}/${c.un}), entrega em ${m[2]} dias. Se o prazo de ${m[2]} dias não atrasa a frente de serviço, aprove essa. Total ${BRL(m[1] * c.qtd)}.`; }
  if (/venc|documento|licen|alvar/.test(t)) { const l = db.obras.flatMap((x) => x.docs.filter((d) => d.vence <= 30).map((d) => `• ${d.nome} (${x.nome}): ${d.vence < 0 ? 'VENCIDO' : `${d.vence} dias`}`)); return l.length ? l.join('\n') : 'Nada vence nos próximos 30 dias.'; }
  if (/rdo|resum|cliente/.test(t)) { const r = db.rdos.filter((x) => x.obra === o.id).sort((a, b) => b.dia - a.dia)[0]; return r ? `Resumo para o cliente (${DATA(r.dia)}):\n${r.ativ}${r.ocorr ? `\nObservação: ${r.ocorr}` : ''}\nEquipe em campo: ${Object.values(r.efetivo).reduce((a, b) => a + b, 0)} profissionais.` : 'Ainda não há RDO desta obra.'; }
  if (/fatur|medir|mes/.test(t)) return `Pelo planejado, faturar ${MI(o.contrato * (o.plan[3] - o.plan[2]))} este mês. Pelo realizado até agora, o avanço permite medir ${MI(o.contrato * (fisicoReal(o) - o.real[2]))}.`;
  return `${o.nome}: físico ${P(fisicoReal(o))} (plano ${P(fisicoPlan(o))}), custo ${P(o.custoReal / o.custoOrc)} do orçado, ${s.ncs.length} NCs abertas e ${docsAlerta(o).length} documentos vencendo.`;
}

// ------------------------------------------------------------------ desenho
function render() {
  const c = foco() && CAMADAS.find(([k]) => k === db.camada) ? db.camada : 'carteira';
  $('#foco').innerHTML = db.obras.map((o) => `<option value="${o.id}" ${o.id === db.foco ? 'selected' : ''}>${E(o.nome)}</option>`).join('');
  const contagem = { qualidade: foco() ? foco().ncs.filter((n) => n.aberta).length : 0, documentos: db.obras.reduce((t, o) => t + o.docs.filter((d) => d.vence < 0).length, 0), suprimentos: db.cotacoes.filter((x) => x.escolhido == null).length };
  $('#camadas').innerHTML = CAMADAS.map(([k, t, n]) => `<button data-camada="${k}" ${k === c ? 'aria-current="page"' : ''}>${n ? `<kbd>${n}</kbd>` : '<kbd>⚙</kbd>'}${t}${contagem[k] ? ` <span class="q">${contagem[k]}</span>` : ''}</button>`).join('');
  $('#area').innerHTML = V[c]();
  $('#lateral').innerHTML = lateral();
  $('#empresa-c').textContent = db.empresa.nome;
  $('#relogio').textContent = `${db.eu.nome} · ${new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}`;
  document.documentElement.style.fontSize = db.eu.letra === 'grande' ? '112%' : '';
  document.title = `${CAMADAS.find(([k]) => k === c)[1]} · Veltria Obras Avançado`;
}

// ------------------------------------------------------------------ ações
const A = {
  'sup-aba': (d) => { db.supAba = d.v; render(); }, 'fin-aba': (d) => { db.finAba = d.v; render(); }, lat: (d) => { db.latAba = d.v; render(); },
  'nova-obra': () => ficha('Nova obra', '<label class="cp">Nome<input name="n" required></label><div class="l2"><label class="cp">Cliente<input name="c" required></label><label class="cp">Cidade<input name="ci" value="Belo Horizonte/MG"></label></div><div class="l3"><label class="cp">Contrato (R$)<input name="v" inputmode="decimal" required></label><label class="cp">Custo orçado (R$)<input name="o" inputmode="decimal" required></label><label class="cp">Área (m²)<input name="a" inputmode="decimal" value="1000"></label></div>', 'Criar obra', (f) => {
    const id = ID(); db.obras.push({ id, nome: f.get('n'), cli: f.get('c'), cidade: f.get('ci'), tipo: 'Nova obra', area: N(f.get('a')) || 1000, contrato: N(f.get('v')), custoOrc: N(f.get('o')), custoReal: 0, medido: 0, recebido: 0, plan: [0, 0, 0, 0.02, 0.1, 0.22, 0.38, 0.55, 0.72], real: [0, 0, 0, 0.01], cor: '#a8aaa0', composicoes: foco().composicoes.slice(0, 3).map((c) => ({ ...c, qtd: 1 })), docs: [{ id: ID(), nome: 'Alvará de construção', vence: 365 }], ncs: [], checklists: [], almox: [] });
    db.foco = id; registrar(`Cadastrou a obra ${f.get('n')}`); toast('Obra criada e posta em foco.'); }),
  'nova-comp': () => ficha('Nova composição', '<div class="l2"><label class="cp">Código<input name="c" placeholder="SIN-00000"></label><label class="cp">Unidade<input name="u" value="m²"></label></div><label class="cp">Serviço<input name="s" required></label><div class="l3"><label class="cp">Quantidade<input name="q" inputmode="decimal" required></label><label class="cp">Material por un. (R$)<input name="m" inputmode="decimal" required></label><label class="cp">Mão de obra por un. (R$)<input name="mo" inputmode="decimal" required></label></div>', 'Incluir', (f) => {
    foco().composicoes.push({ cod: f.get('c') || 'PRÓPRIA', serv: f.get('s'), un: f.get('u'), qtd: N(f.get('q')), ins: [{ nome: `Material: ${f.get('s')}`, tipo: 'MAT', un: f.get('u'), coef: 1, preco: N(f.get('m')) }, { nome: `Mão de obra: ${f.get('s')}`, tipo: 'MO', un: f.get('u'), coef: 1, preco: N(f.get('mo')) }] }); registrar(`Incluiu a composição ${f.get('s')} no orçamento de ${foco().nome}`); }),
  'exportar-orc': () => { const o = foco(), linhas = [['Código', 'Serviço', 'Un', 'Qtd', 'Custo unitário', 'Total']]; o.composicoes.forEach((c) => linhas.push([c.cod, c.serv, c.un, c.qtd, unit(c).toFixed(2).replace('.', ','), (c.qtd * unit(c)).toFixed(2).replace('.', ',')])); const csv = '﻿' + linhas.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `orcamento-${NORM(o.nome).replace(/[^a-z0-9]+/g, '-')}.csv`; a.click(); URL.revokeObjectURL(a.href); registrar(`Exportou o orçamento de ${o.nome}`); },
  apontar: () => { const o = foco(); ficha('Apontar avanço do mês', `<p>${E(o.nome)} · ${MES(0)}</p><label class="cp">Avanço físico acumulado (%)<input name="v" inputmode="decimal" value="${(fisicoReal(o) * 100).toLocaleString('pt-BR')}"></label><label class="cp">Custo realizado acumulado (R$)<input name="c" inputmode="decimal" value="${o.custoReal}"></label>`, 'Salvar apontamento', (f) => { o.real[3] = Math.min(1, N(f.get('v')) / 100); o.custoReal = N(f.get('c')); registrar(`Apontou ${f.get('v')}% de avanço em ${o.nome}`); toast('Avanço apontado. Curva S e Raio-X atualizados.'); }); },
  'novo-rdo': () => novoRdo([]),
  'aprovar-cot': (d) => { const c = db.cotacoes.find((x) => x.id === d.c), p = c.propostas[Number(d.i)]; c.escolhido = Number(d.i); const o = db.obras.find((x) => x.id === c.obra);
    db.contas.push({ id: ID(), obra: c.obra, tipo: 'pagar', desc: `${p[0]} · ${c.item}`, valor: p[1] * c.qtd, vence: p[2] + 28, pago: false });
    const it = o.almox.find((a) => NORM(a.nome) === NORM(c.item)); if (it) it.saldo += c.qtd; else o.almox.push({ id: ID(), nome: c.item, un: c.un, saldo: c.qtd, minimo: 0, preco: p[1] });
    registrar(`Aprovou a cotação de ${c.item} com ${p[0]} (${BRL(p[1] * c.qtd)})`); gravar(); render(); toast('Pedido emitido: conta a pagar lançada e entrada prevista no almoxarifado.'); },
  'nova-cot': () => ficha('Nova cotação', '<div class="l3"><label class="cp">Insumo<input name="i" required></label><label class="cp">Quantidade<input name="q" inputmode="decimal" required></label><label class="cp">Unidade<input name="u" value="un"></label></div>' + [1, 2, 3].map((n) => `<div class="l3"><label class="cp">Fornecedor ${n}<input name="f${n}" required></label><label class="cp">Preço unit.<input name="p${n}" inputmode="decimal" required></label><label class="cp">Prazo (dias)<input name="d${n}" type="number" value="5"></label></div>`).join(''), 'Abrir cotação', (f) => { db.cotacoes.push({ id: ID(), obra: db.foco, item: f.get('i'), qtd: N(f.get('q')), un: f.get('u'), propostas: [1, 2, 3].map((n) => [f.get(`f${n}`), N(f.get(`p${n}`)), Number(f.get(`d${n}`))]), escolhido: null }); registrar(`Abriu cotação de ${f.get('i')}`); }),
  mov: (d) => { const o = foco(), it = o.almox.find((a) => a.id === d.i), tit = { entrada: 'Entrada', saida: 'Saída para a frente de serviço', transf: 'Transferir para outra obra' }[d.t];
    ficha(`${tit} · ${E(it.nome)}`, `<p>Saldo: ${it.saldo.toLocaleString('pt-BR')} ${it.un}</p><label class="cp">Quantidade<input name="q" inputmode="decimal" required></label>${d.t === 'transf' ? `<label class="cp">Para<select name="o">${db.obras.filter((x) => x.id !== o.id).map((x) => `<option value="${x.id}">${E(x.nome)}</option>`).join('')}</select></label>` : ''}`, 'Confirmar', (f) => {
      const q = N(f.get('q')); if (!(q > 0)) return false; if (d.t !== 'entrada' && q > it.saldo) { toast('Quantidade maior que o saldo.'); return false; }
      it.saldo += d.t === 'entrada' ? q : -q;
      if (d.t === 'transf') { const dst = db.obras.find((x) => x.id === f.get('o')), a = dst.almox.find((x) => NORM(x.nome) === NORM(it.nome)); if (a) a.saldo += q; else dst.almox.push({ ...it, id: ID(), saldo: q }); }
      registrar(`${tit}: ${q} ${it.un} de ${it.nome} (${o.nome})`); }); },
  'novo-contrato': () => ficha('Contrato de empreiteiro', '<div class="l2"><label class="cp">Empreiteiro<input name="e" required></label><label class="cp">Valor (R$)<input name="v" inputmode="decimal" required></label></div><label class="cp">Serviço<input name="s" required></label><div class="l2"><label class="cp">Retenção técnica (%)<input name="r" inputmode="decimal" value="5"></label><label class="cp">Reter INSS 11%<select name="i"><option value="1">Sim</option><option value="">Não (Simples sem cessão)</option></select></label></div>', 'Cadastrar', (f) => { db.contratos.push({ id: ID(), obra: db.foco, emp: f.get('e'), serv: f.get('s'), valor: N(f.get('v')), medido: 0, ret: N(f.get('r')), inss: !!f.get('i') }); registrar(`Cadastrou contrato com ${f.get('e')}`); }),
  'medir-contrato': (d) => { const c = db.contratos.find((x) => x.id === d.c); ficha(`Medir · ${E(c.emp)}`, `<p>${E(c.serv)} · medido ${P(c.medido / c.valor)} de ${BRL(c.valor)}</p><label class="cp">Valor desta medição (R$)<input name="v" inputmode="decimal" required></label>`, 'Lançar medição', (f) => {
    const v = Math.min(N(f.get('v')), c.valor - c.medido); if (!(v > 0)) return false; c.medido += v; const liquido = v - v * c.ret / 100 - (c.inss ? v * 0.5 * 0.11 : 0);
    db.contas.push({ id: ID(), obra: c.obra, tipo: 'pagar', desc: `${c.emp} · medição (líquido)`, valor: liquido, vence: 10, pago: false }); db.obras.find((o) => o.id === c.obra).custoReal += v;
    registrar(`Mediu ${BRL(v)} do contrato ${c.emp}`); toast(`Medição lançada. A pagar líquido: ${BRL2(liquido)} (com retenções).`); }); },
  'nova-conta': () => ficha('Nova conta', '<div class="l2"><label class="cp">Tipo<select name="t"><option value="pagar">A pagar</option><option value="receber">A receber</option></select></label><label class="cp">Valor (R$)<input name="v" inputmode="decimal" required></label></div><label class="cp">Descrição<input name="d" required></label><label class="cp">Vence em (dias)<input name="p" type="number" value="15"></label>', 'Lançar', (f) => { db.contas.push({ id: ID(), obra: db.foco, tipo: f.get('t'), desc: f.get('d'), valor: N(f.get('v')), vence: Number(f.get('p')), pago: false }); registrar(`Lançou conta a ${f.get('t')}: ${f.get('d')}`); }),
  baixar: (d) => { const c = db.contas.find((x) => x.id === d.c), o = db.obras.find((x) => x.id === c.obra); c.pago = true; if (c.tipo === 'receber') o.recebido += c.valor; else o.custoReal += 0; registrar(`Baixou ${c.desc} (${BRL2(c.valor)})`); gravar(); render(); toast('Baixa registrada.'); },
  'nova-nc': () => ficha('Não conformidade', '<label class="cp">O que foi encontrado<textarea name="d" required></textarea></label><div class="l2"><label class="cp">Onde<input name="l" required></label><label class="cp">Gravidade<select name="g"><option>Alta</option><option selected>Média</option><option>Baixa</option></select></label></div>', 'Abrir NC', (f) => { foco().ncs.unshift({ id: ID(), desc: f.get('d'), local: f.get('l'), grav: f.get('g'), aberta: true, dia: 0 }); registrar(`Abriu NC (${f.get('g')}) em ${foco().nome}`); }),
  'fechar-nc': (d) => { const n = foco().ncs.find((x) => x.id === d.n); n.aberta = false; registrar(`Encerrou a NC "${n.desc}"`); gravar(); render(); },
  renovar: (d) => { const o = db.obras.find((x) => x.id === d.o), doc = o.docs.find((x) => x.id === d.d); ficha(`Renovar · ${E(doc.nome)}`, `<p>${E(o.nome)}</p><label class="cp">Nova validade (dias a partir de hoje)<input name="v" type="number" value="365"></label><label class="cp">Arquivo (PDF)<input type="file" accept="application/pdf"></label>`, 'Salvar', (f) => { doc.vence = Number(f.get('v')); registrar(`Renovou ${doc.nome} de ${o.nome}`); }); },
  convidar: () => { ficha('Convidar usuário', '<div class="l2"><label class="cp">Nome<input name="n" required></label><label class="cp">E-mail<input name="e" type="email" required></label></div><label class="cp">Cargo<select name="c"><option>Engenheira de obra</option><option>Mestre de obras</option><option>Suprimentos</option><option>Controladoria</option><option>Fiscal do cliente</option></select></label>', 'Enviar convite', (f) => { db.acessos.push({ id: ID(), nome: f.get('n'), email: f.get('e'), cargo: f.get('c') }); registrar(`Convidou ${f.get('e')} como ${f.get('c')}`); toast('Convite enviado.'); }); },
  tirar: (d) => { const u = db.acessos.find((x) => x.id === d.u); db.acessos = db.acessos.filter((x) => x !== u); registrar(`Removeu o acesso de ${u.nome}`); gravar(); render(); },
  plano: (d) => { if (d.v === 'basico' && db.acessos.length > 5) return toast('Para o Básico, deixe no máximo 5 usuários.'); db.plano = d.v; registrar(`Mudou o plano para ${d.v}`); gravar(); render(); },
};
function novoRdo(fotos) {
  const funcs = ['Pedreiro', 'Servente', 'Carpinteiro', 'Armador', 'Eletricista', 'Encanador'];
  ficha(`RDO · ${DATA(0)}`, `${fotos.length ? `<div class="fts" style="margin-bottom:10px">${fotos.map((f) => `<img src="${f}" alt="">`).join('')}</div>` : ''}<div class="l2"><label class="cp">Clima manhã<select name="m"><option>Sol</option><option>Nublado</option><option>Chuva</option></select></label><label class="cp">Clima tarde<select name="t"><option>Sol</option><option>Nublado</option><option>Chuva</option></select></label></div>
    <div class="l3">${funcs.map((f) => `<label class="cp">${f}<input name="ef-${f}" type="number" min="0" value="0"></label>`).join('')}</div><label class="cp">Equipamentos<input name="eq" placeholder="Ex.: grua, betoneira"></label><label class="cp">Atividades executadas<textarea name="a" required></textarea></label><label class="cp">Ocorrências<textarea name="o" placeholder="Atrasos, acidentes, visitas da fiscalização…"></textarea></label>`, 'Salvar RDO', (f) => {
    const ef = Object.fromEntries(funcs.map((x) => [x, Number(f.get(`ef-${x}`))]).filter(([, n]) => n > 0));
    db.rdos.push({ id: ID(), obra: db.foco, dia: 0, manha: f.get('m'), tarde: f.get('t'), efetivo: ef, equip: f.get('eq'), ativ: f.get('a'), ocorr: f.get('o'), fotos }); registrar(`Registrou o RDO de ${foco().nome}`); toast('RDO salvo. O fiscal do cliente já vê pelo link.'); });
}

document.addEventListener('click', (e) => {
  const cam = e.target.closest('[data-camada]'); if (cam) { db.camada = cam.dataset.camada; gravar(); render(); $('#area').focus({ preventScroll: true }); return; }
  const fo = e.target.closest('[data-foco]'); if (fo) { db.foco = fo.dataset.foco; db.camada = 'orcamento'; gravar(); render(); toast(`Em foco: ${foco().nome}`); return; }
  const sg = e.target.closest('[data-sug]'); if (sg) { $('#q-ia').value = sg.dataset.sug; $('#f-ia').requestSubmit(); return; }
  const a = e.target.closest('[data-a]'); if (a && A[a.dataset.a]) A[a.dataset.a](a.dataset);
});
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'f-ia') return; e.preventDefault(); const p = $('#q-ia').value.trim(); if (p.length < 3) return;
  const resp = { ia: true, t: window.veltriaIA ? 'Pensando…' : copiloto(p) }; db.conversa.push({ t: p }); db.conversa.push(resp); db.conversa = db.conversa.slice(-10); gravar(); render(); $('#q-ia')?.focus();
  if (window.veltriaIA) window.veltriaIA(p).then((t) => { resp.t = t; gravar(); render(); });
});
document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.id === 'foco') { db.foco = t.value; gravar(); render(); }
  if (t.dataset.cargo) { const u = db.acessos.find((x) => x.id === t.dataset.cargo); u.cargo = t.value; registrar(`Mudou o cargo de ${u.nome} para ${t.value}`); gravar(); render(); }
  if (t.dataset.eu) { db.eu[t.dataset.eu] = t.value; if (t.dataset.eu === 'lateral') db.latAba = t.value; gravar(); render(); }
  if (t.dataset.qtd != null) { foco().composicoes[Number(t.dataset.qtd)].qtd = N(t.value); registrar(`Alterou quantitativo em ${foco().nome}`); gravar(); render(); }
  if (t.id === 'rdo-fotos' && t.files.length) { const fotos = []; for (const arq of [...t.files].slice(0, 6)) { try { const b = await createImageBitmap(arq), k = Math.min(1, 800 / Math.max(b.width, b.height)), cv = document.createElement('canvas'); cv.width = b.width * k; cv.height = b.height * k; cv.getContext('2d').drawImage(b, 0, 0, cv.width, cv.height); fotos.push(cv.toDataURL('image/jpeg', 0.7)); } catch { /* não é imagem */ } } novoRdo(fotos); }
});
document.addEventListener('input', (e) => { const t = e.target; if (t.dataset.emp) { db.empresa[t.dataset.emp] = t.value; gravar(); $('#empresa-c').textContent = db.empresa.nome; } if (t.dataset.eu === 'nome' || t.dataset.eu === 'cargo') { db.eu[t.dataset.eu] = t.value; gravar(); } });
document.addEventListener('keydown', (e) => {
  if (!e.target.closest || e.target.closest('input, textarea, select') || document.querySelector('.veu') || e.ctrlKey || e.metaKey || e.altKey) return;
  const c = CAMADAS.find(([, , n]) => n === e.key); if (c) { db.camada = c[0]; gravar(); render(); return; }
  if (e.key === 'r' || e.key === 'R') { e.preventDefault(); db.camada = 'rdo'; render(); novoRdo([]); }
});
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = semear(); render(); toast('Demonstração recomeçada.'); });
if (!db.camadaIniciada) { db.camada = db.eu.abrir || 'carteira'; db.camadaIniciada = true; }
render();
