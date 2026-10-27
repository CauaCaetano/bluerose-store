// VetNature (linha Vexorin) · sistema para clínica veterinária (demonstração: os dados ficam só neste navegador).
// Telas: Hoje, Agenda, Pacientes, Tutores, Vacinas, Internação, Estética, Exames, Estoque, Caixa e Relatórios.
// Código próprio, sem base compartilhada. Fotos de exemplo do Pexels (licença livre) em fotos/.
const CHAVE = 'vetnature-demo-v2';
// Sistema contratado: aberto pela porta app/vetnature/ (?conta=vetnature). O conta-nuvem.js guarda cada alteração na nuvem
// da clínica e cuida de equipe, convites, permissões e assinatura; aqui as telas só se ligam a isso.
const CONTA = document.documentElement.classList.contains('modo-conta');
const contaVc = (acao) => { const f = document.querySelector('.vc-faixa'); if (!f) return; let b = f.querySelector(`[data-vc="${acao}"]`); if (!b) { b = document.createElement('button'); b.type = 'button'; b.hidden = true; b.dataset.vc = acao; f.append(b); } b.click(); };
// a chave da IA da pessoa fica só neste navegador (nunca vai para a nuvem nem para a equipe)
const CHAVE_IA = 'vetnature-ia-chave';
const chaveIA = () => { try { return localStorage.getItem(CHAVE_IA) || ''; } catch { return ''; } };
const guardarChaveIA = (v) => { try { if (v) localStorage.setItem(CHAVE_IA, v); else localStorage.removeItem(CHAVE_IA); } catch { /* sem armazenamento */ } };
const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const reais = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const uid = () => Math.random().toString(36).slice(2, 10);
const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const maisDias = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const diasAte = (iso) => Math.round((new Date(`${iso}T12:00:00`) - new Date(`${hoje()}T12:00:00`)) / 864e5);
const diaSemana = (iso, f = 'short') => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: f });
const idade = (nasc) => { const m = Math.max(0, Math.round((new Date(`${hoje()}T12:00:00`) - new Date(`${nasc}T12:00:00`)) / (864e5 * 30.44))); return m < 12 ? `${m} ${m === 1 ? 'mês' : 'meses'}` : `${Math.floor(m / 12)} ${Math.floor(m / 12) === 1 ? 'ano' : 'anos'}`; };
const soDigitos = (s) => String(s || '').replace(/\D/g, '');
const telBR = (t) => String(t || '').replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
const horaAgora = () => new Date().toTimeString().slice(0, 5);
const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const primeiro = (n) => String(n || '').split(' ')[0];

// ---------------------------------------------------------------- ícones
const IC = {
  hoje: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  agenda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>',
  pacientes: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="10" r="2.2"/><circle cx="10" cy="5.8" r="2.2"/><circle cx="14" cy="5.8" r="2.2"/><circle cx="18" cy="10" r="2.2"/><path d="M12 11.5c-3 0-5.5 3.6-5.5 6.1 0 1.6 1.2 2.4 2.6 2.4 1.2 0 1.8-.6 2.9-.6s1.7.6 2.9.6c1.4 0 2.6-.8 2.6-2.4 0-2.5-2.5-6.1-5.5-6.1z"/></svg>',
  tutores: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.7.7 2.8 2.4 3 5.2"/></svg>',
  vacinas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m17 3 4 4M19 5l-9.5 9.5M14 6l4 4M4 20l3.5-3.5"/><path d="M9.5 10.5 13.5 14.5 9 19 5 15z"/></svg>',
  internacao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="2"/></svg>',
  estetica: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.6 7.5 20 18M8.6 16.5 20 6"/></svg>',
  exames: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 14h9"/></svg>',
  estoque: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3 4 7v10l8 4 8-4V7z"/><path d="m4 7 8 4 8-4M12 11v10"/></svg>',
  caixa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/></svg>',
  relatorios: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  cao: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="10" r="2.2"/><circle cx="10" cy="5.8" r="2.2"/><circle cx="14" cy="5.8" r="2.2"/><circle cx="18" cy="10" r="2.2"/><path d="M12 11.5c-3 0-5.5 3.6-5.5 6.1 0 1.6 1.2 2.4 2.6 2.4 1.2 0 1.8-.6 2.9-.6s1.7.6 2.9.6c1.4 0 2.6-.8 2.6-2.4 0-2.5-2.5-6.1-5.5-6.1z"/></svg>',
  gato: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3.5 8.6 8a8.6 8.6 0 0 1 6.8 0L19 3.5l.6 7.3A7.5 7.5 0 0 1 21 15c0 3.6-4 6-9 6s-9-2.4-9-6a7.5 7.5 0 0 1 1.4-4.2z"/></svg>',
  outro: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.4-7.5-10.2A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7.5 2.8C19.5 16.6 12 21 12 21z"/></svg>',
  config: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  ia: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9zM19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z"/></svg>',
  avisos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9M10 20a2.2 2.2 0 0 0 4 0"/></svg>',
  pacotes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16v11H4zM2.5 5.5h19V9h-19zM12 5.5V20M12 5.5S10.5 2 8 2.5 7 5.5 12 5.5zm0 0s1.5-3.5 4-3 1 3-4 3"/></svg>',
  clipe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m20 11.5-8.2 8.2a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.4 8.4a1.7 1.7 0 0 1-2.4-2.4l7.7-7.7"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
};
const SECOES = [['hoje', 'Hoje'], ['agenda', 'Agenda'], ['pacientes', 'Pacientes'], ['tutores', 'Tutores'], ['vacinas', 'Vacinas'], ['internacao', 'Internação'], ['estetica', 'Estética'], ['exames', 'Exames'], ['estoque', 'Estoque'], ['caixa', 'Caixa'], ['pacotes', 'Pacotes'], ['avisos', 'Avisos'], ['relatorios', 'Relatórios'], ['config', 'Configurações']];
const TIPOS = { Consulta: 160, Retorno: 0, Vacina: 0, 'Banho e tosa': 90, Cirurgia: 850, Exame: 120 };
const SERVICOS_PADRAO = [['Consulta clínica', 160], ['Retorno (até 15 dias)', 0], ['Consulta de emergência', 280], ['Banho', 60], ['Banho e tosa', 90], ['Tosa higiênica', 45], ['Aplicação de vacina', 25], ['Hemograma', 120], ['Bioquímico (função renal)', 140], ['Ultrassom', 220], ['Raio-x', 180], ['Castração', 850], ['Limpeza de tártaro', 480], ['Diária de internação', 180], ['Microchip', 120]];
const servicos = () => db.config.servicos;
const EXAMES = ['Hemograma completo', 'Bioquímico (ureia e creatinina)', 'Bioquímico (função hepática)', 'Urinálise', 'Parasitológico de fezes', 'Ultrassom abdominal', 'Raio-x de tórax', 'Teste rápido FIV/FeLV', 'Teste rápido de cinomose'];
const FORMAS = ['PIX', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Fiado (a receber)'];
const STATUS = { aguardando: ['Agendado', 'selo-aguardando'], chegou: ['Chegou', 'selo-chegou'], atendimento: ['Em atendimento', 'selo-atendimento'], pronto: ['Atendido', 'selo-pronto'] };
const ESTETICA = [['aguardando', 'Chegou'], ['banho', 'No banho'], ['secagem', 'Secagem e tosa'], ['pronto', 'Pronto para buscar']];
const EXAME_ST = { solicitado: ['Solicitado', 'selo-aguardando'], coletado: ['Coletado', 'selo-chegou'], pronto: ['Resultado pronto', 'selo-pronto'] };

// ---------------------------------------------------------------- dados de exemplo
function exemplo() {
  const h = hoje();
  const tutores = [
    ['t1', 'Mariana Lopes', '00900000011', 'Rua das Acácias, 120'], ['t2', 'Carlos Henrique Dias', '00900000012', 'Av. Brasil, 845'], ['t3', 'Fernanda Rocha', '00900000013', 'Rua São Paulo, 33'],
    ['t4', 'João Pedro Alves', '00900000014', 'Rua Goiás, 1.020'], ['t5', 'Beatriz Nogueira', '00900000015', 'Rua XV de Novembro, 77'], ['t6', 'Ricardo Santana', '00900000016', 'Av. Independência, 400'], ['t7', 'Luana Teixeira', '00900000017', 'Rua Minas Gerais, 512'],
  ].map(([id, nome, tel, end]) => ({ id, nome, tel, end }));
  const pet = (id, tutor, nome, especie, raca, sexo, diasNasc, castrado, pesos, extra = {}) => ({ id, tutor, nome, especie, raca, sexo, nasc: maisDias(h, diasNasc), castrado, alergias: '', pelagem: '', microchip: '', obs: '', foto: `fotos/${nome.toLowerCase()}.webp`, pesos: pesos.map(([d, kg]) => ({ data: maisDias(h, d), kg })), ...extra });
  const pets = [
    pet('p1', 't1', 'Thor', 'cao', 'Golden Retriever', 'Macho', -1460 + 3, true, [[-240, 31.2], [-150, 32.0], [-60, 32.8], [-10, 33.4]], { alergias: 'Dipirona', pelagem: 'Dourada', microchip: '000 000 000 000 001' }),
    pet('p2', 't1', 'Mel', 'gato', 'SRD', 'Fêmea', -900, true, [[-200, 3.9], [-90, 4.1], [-20, 4.2]], { pelagem: 'Laranja tigrada' }),
    pet('p3', 't2', 'Bob', 'cao', 'Shih Tzu', 'Macho', -2900, false, [[-300, 7.8], [-120, 8.4], [-15, 8.9]], { pelagem: 'Creme' }),
    pet('p4', 't3', 'Luna', 'cao', 'Border Collie', 'Fêmea', -220, false, [[-120, 6.2], [-60, 10.5], [-5, 13.1]], { pelagem: 'Tricolor' }),
    pet('p5', 't4', 'Nina', 'gato', 'Persa', 'Fêmea', -1800 + 5, true, [[-180, 4.8], [-30, 4.5]], { alergias: 'Ração com frango', pelagem: 'Branca' }),
    pet('p6', 't5', 'Pipoca', 'outro', 'Coelho anão', 'Fêmea', -500, false, [[-100, 1.6], [-30, 1.7]], { pelagem: 'Caramelo' }),
    pet('p7', 't6', 'Max', 'cao', 'Pastor Alemão', 'Macho', -3300, true, [[-200, 36.0], [-60, 34.2], [-3, 33.1]], { pelagem: 'Preta e castanha', microchip: '000 000 000 000 002' }),
    pet('p8', 't7', 'Frajola', 'gato', 'SRD', 'Macho', -120, false, [[-60, 1.2], [-20, 1.9]], { pelagem: 'Preta e branca' }),
    pet('p9', 't2', 'Amora', 'cao', 'Lhasa Apso', 'Fêmea', -1100, true, [[-90, 6.0], [-30, 6.1]], { pelagem: 'Marrom' }),
  ];
  const ag = (d, hora, p, tipo, vet, status = 'aguardando') => ({ id: uid(), data: maisDias(h, d), hora, pet: p, tipo, vet, status: d < 0 ? 'pronto' : status, valor: TIPOS[tipo] ?? 0 });
  const PA = 'Dra. Paula Andrade', RM = 'Dr. Rafael Mota';
  const agenda = [
    ag(0, '08:30', 'p3', 'Consulta', PA, 'pronto'), ag(0, '09:00', 'p4', 'Vacina', RM, 'pronto'), ag(0, '09:30', 'p1', 'Retorno', PA, 'atendimento'), ag(0, '10:00', 'p8', 'Vacina', RM, 'chegou'),
    ag(0, '11:00', 'p9', 'Consulta', PA), ag(0, '14:00', 'p6', 'Consulta', RM), ag(0, '15:30', 'p2', 'Exame', PA),
    ag(1, '09:00', 'p7', 'Retorno', RM), ag(1, '10:30', 'p5', 'Consulta', PA), ag(1, '14:00', 'p4', 'Cirurgia', RM), ag(2, '08:30', 'p9', 'Vacina', PA), ag(2, '16:00', 'p1', 'Consulta', RM),
    ag(3, '09:30', 'p2', 'Retorno', PA), ag(4, '11:00', 'p3', 'Exame', RM), ag(5, '10:00', 'p8', 'Vacina', PA),
  ];
  const pr = (p, d, vet, queixa, ex, diag, presc) => ({ id: uid(), pet: p, data: maisDias(h, d), vet, queixa, exame: ex, diagnostico: diag, prescricao: presc });
  const prontuarios = [
    pr('p1', -10, PA, 'Coceira intensa nas orelhas há 5 dias.', { peso: 33.4, temp: 38.6, fc: 96, fr: 24 }, 'Otite externa bilateral.', 'Limpeza auricular 2x ao dia por 10 dias. Otológico com antifúngico: 5 gotas em cada orelha, 2x ao dia, 7 dias. Retorno em 10 dias.'),
    pr('p1', -150, RM, 'Check-up anual.', { peso: 32.0, temp: 38.5, fc: 90, fr: 22 }, 'Saudável.', 'Manter vacinas em dia. Escovação dos dentes 3x por semana.'),
    pr('p3', 0, PA, 'Tosse seca há uma semana, pior à noite.', { peso: 8.9, temp: 38.9, fc: 120, fr: 32 }, 'Traqueobronquite infecciosa (suspeita).', 'Xarope antitussígeno 2 ml 2x ao dia por 7 dias. Evitar coleira; usar peitoral. Retorno se piorar.'),
    pr('p7', -3, RM, 'Perda de peso e muita sede.', { peso: 33.1, temp: 38.4, fc: 88, fr: 22 }, 'Investigação de doença renal; exames solicitados.', 'Hemograma, bioquímico (ureia, creatinina) e urinálise. Dieta renal até o resultado.'),
    pr('p5', -30, PA, 'Vômitos esporádicos depois de comer.', { peso: 4.5, temp: 38.7, fc: 180, fr: 28 }, 'Alergia alimentar provável.', 'Trocar para ração hipoalergênica sem frango. Reavaliar em 30 dias.'),
  ];
  const vc = (p, nome, d, prox, lote) => ({ id: uid(), pet: p, nome, data: maisDias(h, d), proxima: prox == null ? null : maisDias(h, prox), lote });
  const vacinas = [
    vc('p1', 'V10 (polivalente)', -358, 7, 'V10-2391'), vc('p1', 'Antirrábica', -340, 25, 'AR-7710'), vc('p2', 'V5 felina', -370, -5, 'V5F-1180'),
    vc('p3', 'V10 (polivalente)', -200, 165, 'V10-2391'), vc('p3', 'Gripe canina', -362, 3, 'GC-5502'), vc('p4', 'V10 (1ª dose)', -21, null, 'V10-2391'), vc('p4', 'V10 (2ª dose)', 0, 21, 'V10-2402'),
    vc('p5', 'V5 felina', -330, 35, 'V5F-1180'), vc('p7', 'Antirrábica', -400, -35, 'AR-7701'), vc('p8', 'V5 felina (1ª dose)', -21, 0, 'V5F-1192'),
    vc('p9', 'Vermífugo', -88, 2, 'VRM-310'), vc('p6', 'Vermífugo', -60, 30, 'VRM-310'),
  ];
  const dose = (hora, remedio, feita = false) => ({ hora, remedio, feita });
  const internados = [
    { id: uid(), pet: 'p7', baia: 'Baia 2', motivo: 'Desidratação; investigação renal', entrada: maisDias(h, -1), doses: [dose('06:00', 'Soro fisiológico 500 ml IV', true), dose('08:00', 'Omeprazol 20 mg', true), dose('12:00', 'Soro fisiológico 500 ml IV'), dose('14:00', 'Antiemético 1 ml SC'), dose('20:00', 'Omeprazol 20 mg')] },
    { id: uid(), pet: 'p3', baia: 'Baia 4', motivo: 'Observação pós-crise de tosse', entrada: h, doses: [dose('10:00', 'Nebulização com soro 10 min', true), dose('16:00', 'Nebulização com soro 10 min'), dose('22:00', 'Xarope 2 ml')] },
  ];
  const estetica = [
    { id: uid(), data: h, hora: '08:00', pet: 'p5', servico: 'Banho e tosa', status: 'secagem', obs: 'Tosa na tesoura; laço rosa' },
    { id: uid(), data: h, hora: '09:00', pet: 'p9', servico: 'Banho', status: 'banho', obs: 'Shampoo hipoalergênico' },
    { id: uid(), data: h, hora: '10:30', pet: 'p3', servico: 'Tosa higiênica', status: 'aguardando', obs: '' },
    { id: uid(), data: h, hora: '07:30', pet: 'p2', servico: 'Banho', status: 'pronto', obs: '' },
  ];
  const ex = (p, nome, d, status, resultado = '') => ({ id: uid(), pet: p, nome, data: maisDias(h, d), status, resultado, lab: 'Laboratório VetLab' });
  const exames = [
    ex('p7', 'Hemograma completo', -3, 'pronto', 'Anemia leve (hematócrito 34%). Leucócitos normais.'), ex('p7', 'Bioquímico (ureia e creatinina)', -3, 'pronto', 'Ureia 98 mg/dL (alta); creatinina 2,4 mg/dL (alta). Compatível com doença renal estágio 2.'),
    ex('p7', 'Urinálise', -3, 'coletado'), ex('p3', 'Raio-x de tórax', 0, 'solicitado'), ex('p2', 'Hemograma completo', 0, 'solicitado'),
  ];
  const it = (nome, tipo, qtd, minimo, lote, val, preco, custo) => ({ id: uid(), nome, tipo, qtd, minimo, lote, validade: maisDias(h, val), preco, custo });
  const estoque = [
    it('Vacina V10 (polivalente)', 'Vacina', 14, 10, 'V10-2402', 210, 95, 42), it('Vacina antirrábica', 'Vacina', 6, 8, 'AR-7710', 160, 70, 28), it('Vacina V5 felina', 'Vacina', 9, 6, 'V5F-1192', 18, 110, 51),
    it('Vacina gripe canina', 'Vacina', 4, 5, 'GC-5502', 95, 120, 55), it('Vermífugo comprimido (cães até 10 kg)', 'Medicamento', 32, 15, 'VRM-310', 420, 28, 11),
    it('Antipulgas mastigável 10–20 kg', 'Medicamento', 7, 10, 'APL-882', 300, 89, 52), it('Omeprazol 20 mg (caixa)', 'Medicamento', 3, 4, 'OMP-118', 12, 19, 8), it('Xarope antitussígeno', 'Medicamento', 8, 4, 'XAR-221', 280, 38, 16),
    it('Soro fisiológico 500 ml', 'Insumo', 26, 20, 'SF-4401', 510, 9, 4), it('Ração renal 2 kg', 'Produto', 5, 3, 'RR-2209', 140, 145, 92), it('Shampoo hipoalergênico', 'Produto', 11, 4, 'SH-075', 600, 49, 21),
  ];
  // um mês de movimento para os relatórios
  const vendas = [];
  const cardapio = [['Consulta clínica', 160], ['Banho e tosa', 90], ['Banho', 60], ['Hemograma', 120], ['Vacina V10 (polivalente)', 95], ['Aplicação de vacina', 25], ['Antipulgas mastigável 10–20 kg', 89], ['Ultrassom', 220], ['Ração renal 2 kg', 145]];
  let semente = 7; const rnd = () => (semente = (semente * 9301 + 49297) % 233280) / 233280;
  for (let d = -29; d <= -1; d++) {
    if (diaSemana(maisDias(h, d)) === 'dom.') continue;
    const n = 3 + Math.floor(rnd() * 5);
    for (let k = 0; k < n; k++) {
      const itens = [cardapio[Math.floor(rnd() * cardapio.length)]]; if (rnd() > .6) itens.push(cardapio[Math.floor(rnd() * cardapio.length)]);
      vendas.push({ id: uid(), data: maisDias(h, d), hora: `${String(8 + Math.floor(rnd() * 10)).padStart(2, '0')}:${rnd() > .5 ? '30' : '00'}`, pet: pets[Math.floor(rnd() * pets.length)].id, itens: itens.map(([nome, valor]) => ({ nome, valor, qtd: 1 })), forma: FORMAS[Math.floor(rnd() * 4)], recebido: true });
    }
  }
  vendas.push({ id: uid(), data: maisDias(h, -12), hora: '15:00', pet: 'p7', itens: [{ nome: 'Ultrassom', valor: 220, qtd: 1 }, { nome: 'Bioquímico (função renal)', valor: 140, qtd: 1 }], forma: 'Fiado (a receber)', recebido: false });
  vendas.push({ id: uid(), data: maisDias(h, -5), hora: '11:00', pet: 'p6', itens: [{ nome: 'Consulta clínica', valor: 160, qtd: 1 }], forma: 'Fiado (a receber)', recebido: false });
  vendas.push({ id: uid(), data: h, hora: '08:55', pet: 'p3', itens: [{ nome: 'Consulta clínica', valor: 160, qtd: 1 }, { nome: 'Xarope antitussígeno', valor: 38, qtd: 1 }], forma: 'PIX', recebido: true });
  vendas.push({ id: uid(), data: h, hora: '09:25', pet: 'p4', itens: [{ nome: 'Vacina V10 (polivalente)', valor: 95, qtd: 1 }, { nome: 'Aplicação de vacina', valor: 25, qtd: 1 }], forma: 'Cartão de crédito', recebido: true });
  return { clinica: 'Clínica Veterinária Bem-Estar Animal', config: configPadrao(), vets: [PA, RM, 'Equipe de estética'], tutores, pets, agenda, prontuarios, vacinas, internados, estetica, exames, estoque, vendas };
}
function configPadrao() {
  return { conta: { nome: 'Paula Andrade', email: 'paula@exemplo.com.br', cargo: 'Dona e veterinária responsável', plano: 'VetNature · teste de demonstração' },
    cnpj: '00.000.000/0001-00', telefone: '00900000000', endereco: 'Av. Brasil, 1.200 · Centro', cidade: 'Ribeirão Preto (SP)', crmv: 'CRMV-SP 00000',
    horario: 'Seg a sex, 8h às 18h · sáb, 8h às 12h', diaria: 180, servicos: SERVICOS_PADRAO.map((x) => [...x]),
    ia: { modo: 'nossa', provedor: 'openai', chave: '', modelo: '' } };
}
const MODELOS_AVISO = {
  vacina: 'Olá, {tutor}! Aqui é da {clinica}. A vacina {vacina} do(a) {pet} {situacao}. Quer agendar a aplicação? É só responder esta mensagem.',
  consulta: 'Olá, {tutor}! Lembrete da {clinica}: {tipo} do(a) {pet} em {data} ({dia}) às {hora}. Se não puder vir, avise por aqui.',
  aniversario: 'Olá, {tutor}! Toda a equipe da {clinica} deseja um feliz aniversário para o(a) {pet}! 🎉',
  exame: 'Olá, {tutor}! O resultado do exame {exame} do(a) {pet} ficou pronto. Quer marcar o retorno para a veterinária explicar?',
};
// acrescenta o que veio depois (avisos, pacotes, comissões, nota fiscal, agendamento online, anexos) sem apagar os dados de quem já usa
function completar(d) {
  if (!d.config) d.config = configPadrao();
  const c = d.config, h = hoje(), vets = d.vets.filter((v) => v.startsWith('Dr'));
  c.avisos ??= { ligado: true, hora: '09:00', vacina: 7, consulta: 1, aniversario: true, exame: true, modelos: { ...MODELOS_AVISO } };
  c.agendaOnline ??= { ligado: true, inicio: '08:00', fim: '18:00', intervalo: 30, sabado: true, tipos: ['Consulta', 'Vacina', 'Banho e tosa'] };
  c.comissoes ??= Object.fromEntries(d.vets.map((v) => [v, v.startsWith('Dr') ? 10 : 30]));
  c.fiscal ??= { im: '00.000-0', regime: 'Simples Nacional', codigo: '5.09 · Medicina veterinária', aliquota: 2, proxima: 1 };
  c.pacotes ??= [
    { id: 'pk1', tipo: 'pacote', nome: '4 banhos', servico: 'Banho', qtd: 4, valor: 200, dias: 60 },
    { id: 'pk2', tipo: 'pacote', nome: '4 banhos e tosa', servico: 'Banho e tosa', qtd: 4, valor: 320, dias: 60 },
    { id: 'pl1', tipo: 'plano', nome: 'Plano Saúde Essencial', valor: 89, desconto: 10, inclui: '1 consulta por mês e 10% de desconto em vacinas e exames' },
    { id: 'pl2', tipo: 'plano', nome: 'Plano Saúde Completo', valor: 149, desconto: 20, inclui: 'Consultas à vontade, 1 banho por mês e 20% de desconto em vacinas e exames' },
  ];
  if (!d.numerosDeExemplo && !CONTA) {
    d.numerosDeExemplo = true;
    d.tutores.forEach((t) => { if (/^169912300\d\d$/.test(t.tel)) t.tel = `009000000${t.tel.slice(-2)}`; });
    const troca = { telefone: ['16991230000', '00900000000'], cnpj: ['12.345.678/0001-90', '00.000.000/0001-00'], crmv: ['CRMV-SP 41.552', 'CRMV-SP 00000'] };
    Object.entries(troca).forEach(([k, [velho, novo]]) => { if (c[k] === velho) c[k] = novo; });
    if (c.conta.email === 'paula@clinicabemestar.com.br') c.conta.email = 'paula@exemplo.com.br';
    if (c.fiscal.im === '45.112-7') c.fiscal.im = '00.000-0';
    d.pets.forEach((p) => { p.microchip = { '963 001 234 567 890': '000 000 000 000 001', '963 001 998 112 004': '000 000 000 000 002' }[p.microchip] || p.microchip; });
  }
  if (c.ia?.chave) { guardarChaveIA(c.ia.chave); delete c.ia.chave; }
  d.avisosEnviados ??= []; d.pedidos ??= [];
  if (!d.contratos) {
    const m = (id) => c.pacotes.find((x) => x.id === id), ct = (p, id, extra) => d.pets.some((x) => x.id === p) && m(id) ? [{ id: uid(), pet: p, modelo: id, tipo: m(id).tipo, nome: m(id).nome, servico: m(id).servico, qtd: m(id).qtd, valor: m(id).valor, desconto: m(id).desconto, ativo: true, ...extra }] : [];
    d.contratos = [...ct('p5', 'pk2', { usados: 1, inicio: maisDias(h, -20), validade: maisDias(h, 40) }), ...ct('p9', 'pk1', { usados: 2, inicio: maisDias(h, -30), validade: maisDias(h, 30) }),
      ...ct('p1', 'pl1', { inicio: maisDias(h, -25), proxima: maisDias(h, 5) }), ...ct('p7', 'pl2', { inicio: maisDias(h, -40), proxima: maisDias(h, -10) })];
  }
  d.vendas.forEach((v, i) => { if (v.vet === undefined) v.vet = v.itens.some((x) => /banho|tosa/i.test(x.nome)) ? (d.vets.find((x) => !x.startsWith('Dr')) || '') : (vets[i % Math.max(1, vets.length)] || ''); });
  d.exames.forEach((e) => { e.anexos ??= []; });
  const hemo = d.exames.find((e) => e.pet === 'p7' && e.nome === 'Hemograma completo' && e.status === 'pronto');
  if (hemo && !hemo.anexos.length && !d.anexoExemplo) { d.anexoExemplo = true; hemo.anexos.push({ nome: 'laudo-hemograma-max.svg', dados: laudoExemplo() }); }
  return d;
}
function laudoExemplo() {
  const l = [['Hemácias', '5,9 milhões/µL', '5,5 a 8,5'], ['Hematócrito', '34%', '37 a 55'], ['Hemoglobina', '11,8 g/dL', '12 a 18'], ['Leucócitos', '9.800/µL', '6.000 a 17.000'], ['Plaquetas', '310.000/µL', '200.000 a 500.000']];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="420" viewBox="0 0 620 420" font-family="Arial"><rect width="620" height="420" fill="#fff"/><rect width="620" height="64" fill="#214e45"/><text x="24" y="40" fill="#fff" font-size="22" font-weight="bold">Laboratório VetLab · Laudo</text><text x="24" y="100" font-size="15">Paciente: Max · canino · Pastor Alemão · tutor Ricardo Santana</text><text x="24" y="124" font-size="15">Exame: Hemograma completo</text>${l.map(([n, v, r], i) => `<text x="24" y="${170 + i * 34}" font-size="15">${n}</text><text x="250" y="${170 + i * 34}" font-size="15" font-weight="bold">${v}</text><text x="420" y="${170 + i * 34}" font-size="13" fill="#666">ref. ${r}</text>`).join('')}<text x="24" y="370" font-size="14">Conclusão: anemia leve. Leucócitos normais.</text><text x="24" y="398" font-size="12" fill="#666">Documento de exemplo da demonstração</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}
let db = (() => { try { return JSON.parse(localStorage.getItem(CHAVE)) || exemplo(); } catch { return exemplo(); } })();
completar(db);
if (CONTA && window.veltriaConta?.empresa && db.clinica === 'Clínica Veterinária Bem-Estar Animal') db.clinica = window.veltriaConta.empresa;
window.veltriaDados = () => db;
window.veltriaResumoIA = () => contexto();
// "Começar do zero" da conta: tira pacientes, tutores e movimento; ficam serviços, pacotes, regras de aviso e de agendamento
window.veltriaZerarProprio = (atual, empresa) => {
  const d = completar(exemplo()), c = atual?.config || d.config;
  ['tutores', 'pets', 'agenda', 'prontuarios', 'vacinas', 'internados', 'estetica', 'exames', 'estoque', 'vendas', 'contratos', 'avisosEnviados', 'pedidos'].forEach((k) => { d[k] = []; });
  d.vets = ['Dr(a). Responsável', 'Equipe de estética']; d.clinica = empresa || d.clinica; d.numerosDeExemplo = true; d.anexoExemplo = true;
  d.config = { ...d.config, ...c, conta: { nome: '', email: '', cargo: 'Dono', plano: 'VetNature' }, cnpj: '', telefone: '', endereco: '', cidade: '', crmv: '', comissoes: { 'Dr(a). Responsável': 10, 'Equipe de estética': 30 } };
  return d;
};
const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { avisar('O navegador ficou sem espaço para guardar a demonstração. Use "Recomeçar" ou fotos menores.'); } };

// ---------------------------------------------------------------- estado e ajudas
const est = { cfg: 'conta', chat: [], secao: 'hoje', sel: null, aba: 'resumo', filtroVac: '30', busca: '', dia: hoje(), tutor: null };
const pet = (id) => db.pets.find((p) => p.id === id);
const tutorDe = (p) => db.tutores.find((t) => t.id === p?.tutor);
const pesoAtual = (p) => (p.pesos.length ? p.pesos[p.pesos.length - 1].kg : null);
const avatar = (p, cls = '') => `<div class="avatar ${cls}">${p?.foto ? `<img src="${esc(p.foto)}" alt="Foto de ${esc(p.nome)}" loading="lazy">` : IC[p?.especie] || IC.outro}</div>`;
const avisar = (t) => { const el = document.createElement('div'); el.className = 'aviso'; el.textContent = t; $('#avisos').append(el); setTimeout(() => el.remove(), 3400); };
const zap = (tel, msg) => `https://wa.me/55${soDigitos(tel)}?text=${encodeURIComponent(msg)}`;
const vacPendentes = () => db.vacinas.filter((v) => v.proxima && diasAte(v.proxima) <= 7);
const total = (v) => v.itens.reduce((s, i) => s + i.valor * i.qtd, 0);
const aReceber = (tutorId) => db.vendas.filter((v) => !v.recebido && (!tutorId || tutorDe(pet(v.pet))?.id === tutorId));
const aniversariantes = () => db.pets.map((p) => { const [, m, d] = p.nasc.split('-'); let a = `${hoje().slice(0, 4)}-${m}-${d}`; if (diasAte(a) < 0) a = `${Number(hoje().slice(0, 4)) + 1}-${m}-${d}`; return { p, data: a, dias: diasAte(a) }; }).filter((x) => x.dias <= 7).sort((a, b) => a.dias - b.dias);

// ---------------------------------------------------------------- topo
function topo() {
  $('#clinica').textContent = db.clinica;
  const contas = { vacinas: vacPendentes().length, internacao: db.internados.reduce((n, i) => n + i.doses.filter((d) => !d.feita && d.hora <= horaAgora()).length, 0), estoque: db.estoque.filter((x) => x.qtd < x.minimo || diasAte(x.validade) <= 30).length, exames: db.exames.filter((e) => e.status === 'pronto' && !e.avisado).length, estetica: db.estetica.filter((e) => e.data === hoje() && e.status === 'pronto').length, agenda: db.pedidos.filter((x) => x.status === 'novo').length, avisos: filaAvisos().length, pacotes: db.contratos.filter((x) => x.ativo && x.tipo === 'plano' && diasAte(x.proxima) < 0).length };
  $('#secoes').innerHTML = SECOES.map(([k, n]) => `<a href="#${k}" data-secao="${k}" ${est.secao === k ? 'aria-current="page"' : ''}>${IC[k]}${n}${contas[k] ? `<span class="conta">${contas[k]}</span>` : ''}</a>`).join('');
  $('.conta-bt').textContent = CONTA ? String(db.clinica || '?').trim()[0].toUpperCase() : (db.config.conta.nome || 'PA').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------- HOJE
function telaHoje() {
  const h = hoje(), ag = db.agenda.filter((a) => a.data === h).sort((a, b) => a.hora.localeCompare(b.hora));
  if (!est.sel || !ag.some((a) => a.pet === est.sel)) est.sel = (ag.find((a) => a.status === 'atendimento') || ag.find((a) => a.status !== 'pronto') || ag[0])?.pet || null;
  const espera = ag.filter((a) => a.status === 'chegou').length, feitos = ag.filter((a) => a.status === 'pronto').length;
  const caixa = db.vendas.filter((v) => v.data === h && v.recebido).reduce((s, v) => s + total(v), 0);
  let turnoAnt = '';
  const fila = ag.map((a) => {
    const p = pet(a.pet), turno = a.hora < '12:00' ? 'MANHÃ' : 'TARDE', st = STATUS[a.status];
    const cab = turno !== turnoAnt ? `<p class="fila-hora">${turno}</p>` : ''; turnoAnt = turno;
    return `${cab}<button type="button" class="vez" data-sel="${p.id}" aria-pressed="${est.sel === p.id}"><time>${a.hora}</time><span class="vez-pet">${avatar(p, 'mini')}<span><b>${esc(p.nome)}</b><small>${esc(tutorDe(p)?.nome)} · <span class="tipo">${esc(a.tipo)}</span></small></span></span><span class="selo ${st[1]}">${st[0]}</span></button>`;
  }).join('');
  const aniv = aniversariantes();
  return `<div class="cab"><div><h1>${saudacao()}, equipe</h1><p>${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} · ${ag.length} atendimentos na agenda</p></div></div>
  <div class="numeros"><div class="numero destaque"><span>Na sala de espera</span><b>${espera}</b></div><div class="numero"><span>Atendidos hoje</span><b>${feitos} de ${ag.length}</b></div><div class="numero"><span>Vacinas vencendo em 7 dias</span><b>${vacPendentes().length}</b></div><div class="numero"><span>Recebido hoje</span><b>${reais(caixa)}</b></div></div>
  ${aniv.length ? `<div class="faixa-aniv">${aniv.map(({ p, dias }) => `<div class="aniv">${avatar(p, 'mini')}<span><b>${esc(p.nome)}</b> faz ${idade(maisDias(p.nasc, -dias))} ${dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`}</span><a class="bt bt-peq bt-zap" target="_blank" rel="noopener" href="${zap(tutorDe(p)?.tel, `Olá, ${primeiro(tutorDe(p)?.nome)}! Toda a equipe da ${db.clinica} deseja um feliz aniversário para o(a) ${p.nome}! 🎉`)}">Parabéns</a></div>`).join('')}</div>` : ''}
  <div class="mesa"><section class="fila" aria-label="Fila do dia">${fila || '<p class="vazio">Nenhum atendimento hoje.</p>'}</section>${est.sel ? ficha(est.sel, ag.find((a) => a.pet === est.sel && a.status !== 'pronto') || ag.find((a) => a.pet === est.sel)) : ''}</div>`;
}

// ---------------------------------------------------------------- FICHA DO PET
function ficha(id, atend) {
  const p = pet(id); if (!p) return '';
  const t = tutorDe(p), int = db.internados.find((i) => i.pet === id);
  const vencidas = db.vacinas.filter((v) => v.pet === id && v.proxima && diasAte(v.proxima) < 0);
  const deve = aReceber(t?.id).reduce((s, v) => s + total(v), 0);
  const marc = [p.castrado ? '<span class="selo selo-aguardando">Castrado</span>' : '', p.alergias ? `<span class="selo selo-alerta">Alergia: ${esc(p.alergias)}</span>` : '', int ? `<span class="selo selo-atendimento">Internado · ${esc(int.baia)}</span>` : '', vencidas.length ? `<span class="selo selo-alerta">${vencidas.length} vacina${vencidas.length > 1 ? 's' : ''} vencida${vencidas.length > 1 ? 's' : ''}</span>` : '', deve ? `<span class="selo selo-chegou">Tutor deve ${reais(deve)}</span>` : '', ...contratosDo(id).map((x) => `<span class="selo selo-pronto">${x.tipo === 'plano' ? esc(x.nome) : `Pacote ${esc(x.nome)}: ${x.usados} de ${x.qtd} usados`}</span>`)].join('');
  const prox = atend && { aguardando: ['chegou', 'Marcar chegada'], chegou: ['atendimento', 'Iniciar atendimento'], atendimento: ['pronto', 'Finalizar e registrar'] }[atend.status];
  const abas = [['resumo', 'Resumo'], ['prontuario', 'Prontuário'], ['vacinas', 'Vacinas'], ['exames', 'Exames'], ['peso', 'Peso'], ['documentos', 'Documentos']];
  return `<section class="cartao ficha" aria-label="Ficha de ${esc(p.nome)}">
    <div class="ficha-topo"><button type="button" class="foto-pet" data-foto="${p.id}" title="Trocar a foto">${avatar(p, 'grande')}<span>${IC.camera}</span></button><div><h2>${esc(p.nome)}</h2><p>${esc(p.raca)} · ${esc(p.sexo)} · ${idade(p.nasc)} · ${pesoAtual(p) ?? '—'} kg</p><div class="marcadores">${marc}</div></div>
      <div class="acoes">${prox ? `<button class="bt bt-pri" data-avancar="${atend.id}" data-para="${prox[0]}">${prox[1]}</button>` : ''}<button class="bt" data-prontuario="${p.id}">Nova consulta</button><button class="bt" data-cobrar="${p.id}">Cobrar</button></div></div>
    <div class="abas" role="tablist">${abas.map(([k, n]) => `<button type="button" role="tab" data-aba="${k}" aria-selected="${est.aba === k}">${n}</button>`).join('')}</div>
    <div class="cartao-corpo">${({ resumo: abaResumo, prontuario: abaProntuario, vacinas: abaVacinas, exames: abaExames, peso: abaPeso, documentos: abaDocumentos })[est.aba](p, t)}</div></section>`;
}
function abaResumo(p, t) {
  const ult = db.prontuarios.filter((x) => x.pet === p.id).sort((a, b) => b.data.localeCompare(a.data))[0];
  const prox = db.vacinas.filter((v) => v.pet === p.id && v.proxima).sort((a, b) => a.proxima.localeCompare(b.proxima))[0];
  const proxAg = db.agenda.filter((a) => a.pet === p.id && a.data > hoje()).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))[0];
  return `<div class="dados"><div><span>Tutor</span><b><button class="link" data-ver-tutor="${t?.id}">${esc(t?.nome)}</button></b></div><div><span>WhatsApp</span><b>${esc(telBR(t?.tel))}</b></div><div><span>Espécie</span><b>${({ cao: 'Cão', gato: 'Gato' })[p.especie] || 'Outro'}</b></div>
    <div><span>Nascimento</span><b>${dataBR(p.nasc)}</b></div><div><span>Pelagem</span><b>${esc(p.pelagem || '—')}</b></div><div><span>Microchip</span><b>${esc(p.microchip || '—')}</b></div>
    <div><span>Última consulta</span><b>${ult ? dataBR(ult.data) : '—'}</b></div><div><span>Próxima vacina</span><b>${prox ? `${esc(prox.nome)} · ${dataBR(prox.proxima)}` : '—'}</b></div><div><span>Próximo horário</span><b>${proxAg ? `${dataBR(proxAg.data)} às ${proxAg.hora} · ${esc(proxAg.tipo)}` : '—'}</b></div></div>
    ${p.obs ? `<p class="nota">${esc(p.obs)}</p>` : ''}
    ${ult ? `<h3 class="sub-tit">Última anotação</h3><p style="margin:0;color:var(--texto-2)"><b style="color:var(--texto)">${esc(ult.diagnostico)}</b> ${esc(ult.prescricao)}</p>` : ''}
    <div class="acoes" style="margin-top:16px"><a class="bt bt-zap" target="_blank" rel="noopener" href="${zap(t?.tel, `Olá, ${primeiro(t?.nome)}! Aqui é da ${db.clinica}. Passando para falar sobre o(a) ${p.nome}.`)}">Mensagem ao tutor</a><button class="bt" data-editar-pet="${p.id}">Editar dados</button><button class="bt" data-agendar="${p.id}">Agendar</button><button class="bt" data-pedir-exame="${p.id}">Pedir exame</button><button class="bt" data-banho="${p.id}">Banho e tosa</button>${db.internados.some((i) => i.pet === p.id) ? '' : `<button class="bt" data-internar="${p.id}">Internar</button>`}</div>`;
}
function abaProntuario(p) {
  const l = db.prontuarios.filter((x) => x.pet === p.id).sort((a, b) => b.data.localeCompare(a.data));
  return l.length ? `<ol class="linha-tempo">${l.map((x) => `<li><time>${dataBR(x.data)}</time><div><b>${esc(x.diagnostico)}</b><p style="margin:2px 0 4px;color:var(--texto-2)">${esc(x.queixa)}</p><small style="color:var(--texto-3)">${esc(x.vet)} · ${x.exame.peso ?? '—'} kg · ${x.exame.temp ?? '—'} °C · FC ${x.exame.fc ?? '—'} · FR ${x.exame.fr ?? '—'}</small><p style="margin:6px 0 0;white-space:pre-wrap">${esc(x.prescricao)}</p><span class="acoes" style="margin-top:8px"><button class="bt bt-peq" data-receita="${x.id}">Imprimir receita</button><button class="bt bt-peq" data-receita-controle="${p.id}:${x.id}">Receita de controle especial</button></span></div></li>`).join('')}</ol>` : '<p class="vazio">Nenhuma consulta registrada ainda.</p>';
}
function abaVacinas(p, t) {
  const l = db.vacinas.filter((v) => v.pet === p.id).sort((a, b) => b.data.localeCompare(a.data));
  return `${l.length ? `<table class="tabela empilha"><thead><tr><th>Vacina</th><th>Aplicada</th><th>Lote</th><th>Próxima dose</th><th></th></tr></thead><tbody>${l.map((v) => `<tr><td><b>${esc(v.nome)}</b></td><td>${dataBR(v.data)}</td><td>${esc(v.lote)}</td><td>${v.proxima ? selVac(v) : '—'}</td><td>${v.proxima && diasAte(v.proxima) <= 30 ? `<a class="bt bt-peq bt-zap" target="_blank" rel="noopener" href="${zap(t?.tel, lembrete(v))}">Lembrar</a>` : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="vazio">Sem vacinas registradas.</p>'}
    <div class="acoes" style="margin-top:14px"><button class="bt bt-pri" data-aplicar="${p.id}">Registrar vacina aplicada</button><button class="bt" data-vacina-manual="${p.id}">Registrar vacina antiga ou de fora</button><button class="bt" data-carteira="${p.id}">Imprimir carteira de vacinação</button></div>`;
}
function abaExames(p) {
  const l = db.exames.filter((e) => e.pet === p.id).sort((a, b) => b.data.localeCompare(a.data));
  return `${l.length ? `<ul class="lista-exames">${l.map(linhaExame).join('')}</ul>` : '<p class="vazio">Nenhum exame pedido.</p>'}<div class="acoes" style="margin-top:14px"><button class="bt bt-pri" data-pedir-exame="${p.id}">Pedir exame</button></div>`;
}
function abaPeso(p) {
  if (p.pesos.length < 2) return '<p class="vazio">Registre pelo menos duas pesagens para ver a curva.</p>';
  const w = 560, hh = 130, pad = 26, kg = p.pesos.map((x) => x.kg), min = Math.min(...kg), max = Math.max(...kg), r = max - min || 1;
  const pts = p.pesos.map((x, i) => [pad + (i * (w - pad * 2)) / (p.pesos.length - 1), hh - pad - ((x.kg - min) / r) * (hh - pad * 2)]);
  const dif = kg[kg.length - 1] - kg[0];
  return `<p style="margin:0 0 8px">${dif >= 0 ? 'Ganhou' : 'Perdeu'} <b>${Math.abs(dif).toFixed(1)} kg</b> desde ${dataBR(p.pesos[0].data)}.</p>
    <svg class="peso-grafico" viewBox="0 0 ${w} ${hh}" role="img" aria-label="Curva de peso de ${esc(p.nome)}"><polyline points="${pts.map((x) => x.join(',')).join(' ')}"/>${pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4"/><text x="${x}" y="${y - 9}" text-anchor="middle">${kg[i]}</text><text x="${x}" y="${hh - 4}" text-anchor="middle">${dataBR(p.pesos[i].data).slice(0, 5)}</text>`).join('')}</svg>
    <div class="acoes" style="margin-top:10px"><button class="bt" data-pesar="${p.id}">Registrar pesagem</button></div>`;
}
function abaDocumentos(p) {
  return `<div class="docs"><button class="doc" data-carteira="${p.id}"><b>Carteira de vacinação</b><small>Todas as vacinas, lotes e próximas doses</small></button>
    <button class="doc" data-termo="${p.id}:cirurgia"><b>Termo de consentimento para cirurgia</b><small>Com riscos, autorização e assinatura do tutor</small></button>
    <button class="doc" data-termo="${p.id}:anestesia"><b>Termo de anestesia e sedação</b><small>Para procedimentos com sedação</small></button>
    <button class="doc" data-termo="${p.id}:internacao"><b>Termo de internação</b><small>Responsabilidade, visitas e diárias</small></button>
    <button class="doc" data-atestado="${p.id}"><b>Atestado de saúde</b><small>Para viagem, hotel ou creche</small></button>
    <button class="doc" data-receita-controle="${p.id}:"><b>Receita de controle especial</b><small>Para remédio controlado, em duas vias (farmácia e tutor)</small></button></div>`;
}
const linhaExame = (e) => { const p = pet(e.pet), st = EXAME_ST[e.status]; return `<li><div><b>${esc(e.nome)}</b><small>${esc(p?.nome)} · pedido em ${dataBR(e.data)} · ${esc(e.lab)}</small>${e.resultado ? `<p>${esc(e.resultado)}</p>` : ''}${e.anexos?.length ? `<div class="anexos">${e.anexos.map((x, k) => `<span class="anexo"><button type="button" class="link" data-ver-anexo="${e.id}:${k}">${IC.clipe}${esc(x.nome)}</button><button type="button" class="tirar-anexo" data-tirar-anexo="${e.id}:${k}" aria-label="Tirar o arquivo ${esc(x.nome)}">×</button></span>`).join('')}</div>` : ''}</div><div class="lado"><span class="selo ${st[1]}">${st[0]}</span><label class="bt bt-peq" title="Anexar PDF ou foto do laudo">${IC.clipe}Anexar<input type="file" accept="image/*,application/pdf" data-anexar="${e.id}" hidden></label>${e.status === 'solicitado' ? `<button class="bt bt-peq" data-coletar="${e.id}">Coletado</button>` : e.status === 'coletado' ? `<button class="bt bt-peq bt-pri" data-resultado="${e.id}">Lançar resultado</button>` : `<a class="bt bt-peq bt-zap" target="_blank" rel="noopener" data-avisado="${e.id}" href="${zap(tutorDe(p)?.tel, `Olá, ${primeiro(tutorDe(p)?.nome)}! O resultado do exame ${e.nome} do(a) ${p?.nome} ficou pronto. A veterinária vai te explicar no retorno; quer agendar?`)}">Avisar tutor</a>`}</div></li>`; };
const selVac = (v) => { const d = diasAte(v.proxima); return d < 0 ? `<span class="selo selo-alerta">Vencida há ${-d} dia${d === -1 ? '' : 's'}</span>` : d <= 7 ? `<span class="selo selo-chegou">${d === 0 ? 'Hoje' : `Em ${d} dia${d === 1 ? '' : 's'}`}</span>` : `<span class="selo selo-aguardando">${dataBR(v.proxima)}</span>`; };
const lembrete = (v) => { const p = pet(v.pet), t = tutorDe(p), d = diasAte(v.proxima); return `Olá, ${primeiro(t?.nome)}! Aqui é da ${db.clinica}. ${d < 0 ? `A vacina ${v.nome} do(a) ${p.nome} venceu em ${dataBR(v.proxima)}.` : `A vacina ${v.nome} do(a) ${p.nome} vence em ${dataBR(v.proxima)}.`} Quer que a gente agende a aplicação? É rapidinho.`; };

// ---------------------------------------------------------------- AGENDA (semana, por profissional)
function telaAgenda() {
  const ini = maisDias(est.dia, -((new Date(`${est.dia}T12:00:00`).getDay() + 6) % 7)); // segunda-feira
  const dias = Array.from({ length: 6 }, (_, i) => maisDias(ini, i));
  return `<div class="cab"><div><h1>Agenda</h1><p>Semana de ${dataBR(dias[0])} a ${dataBR(dias[5])}</p></div><div class="acoes"><button class="bt" data-semana="-7">‹ Semana anterior</button><button class="bt" data-semana="0">Hoje</button><button class="bt" data-semana="7">Próxima ›</button><button class="bt" data-link-agenda>Link para o tutor agendar</button><button class="bt bt-pri" data-agendar="">+ Agendar</button></div></div>${blocoPedidos()}
    <div class="semana">${dias.map((d) => { const l = db.agenda.filter((a) => a.data === d).sort((a, b) => a.hora.localeCompare(b.hora)); return `<section class="dia ${d === hoje() ? 'eh-hoje' : ''}"><h2>${diaSemana(d)} <b>${d.slice(8)}</b></h2>${l.map((a) => { const p = pet(a.pet); return `<button type="button" class="hor tipo-${a.tipo.split(' ')[0].toLowerCase()}" data-abrir-pet="${p.id}"><time>${a.hora}</time><span><b>${esc(p.nome)}</b><small>${esc(a.tipo)} · ${esc(a.vet.replace('Equipe de estética', 'Estética').replace(/^(Dra?\.) (\S+).*/, '$1 $2'))}</small></span></button>`; }).join('') || '<p class="vazio">Livre</p>'}</section>`; }).join('')}</div>`;
}

// ---------------------------------------------------------------- PACIENTES
function telaPacientes() {
  const q = est.busca.trim().toLowerCase();
  const l = db.pets.filter((p) => !q || `${p.nome} ${tutorDe(p)?.nome} ${p.raca} ${p.microchip}`.toLowerCase().includes(q)).sort((a, b) => a.nome.localeCompare(b.nome));
  return `<div class="cab"><div><h1>Pacientes</h1><p>${db.pets.length} pets de ${db.tutores.length} tutores${q ? ` · procurando por “${esc(est.busca)}”` : ''}</p></div><button class="bt bt-pri" data-novo-pet>+ Novo pet</button></div>
    <div class="mesa"><div class="pets">${l.map((p) => `<button type="button" class="pet" data-sel="${p.id}" aria-pressed="${est.sel === p.id}">${avatar(p)}<div><b>${esc(p.nome)}</b><small>${esc(p.raca)} · ${idade(p.nasc)}<br>${esc(tutorDe(p)?.nome)}</small></div></button>`).join('') || '<p class="vazio">Nenhum pet encontrado.</p>'}</div>
    ${est.sel && pet(est.sel) ? ficha(est.sel) : '<div class="cartao"><p class="vazio">Escolha um pet para ver a ficha completa.</p></div>'}</div>`;
}

// ---------------------------------------------------------------- TUTORES
function telaTutores() {
  const t = db.tutores.find((x) => x.id === est.tutor);
  return `<div class="cab"><div><h1>Tutores</h1><p>${db.tutores.length} tutores · ${reais(aReceber().reduce((s, v) => s + total(v), 0))} a receber</p></div><button class="bt bt-pri" data-novo-tutor>+ Novo tutor</button></div>
    <div class="duas"><section class="cartao"><table class="tabela empilha"><thead><tr><th>Tutor</th><th>Pets</th><th class="num">Deve</th></tr></thead><tbody>${db.tutores.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((x) => { const ps = db.pets.filter((p) => p.tutor === x.id), deve = aReceber(x.id).reduce((s, v) => s + total(v), 0); return `<tr class="clicavel ${est.tutor === x.id ? 'sel' : ''}" data-ver-tutor="${x.id}"><td><b>${esc(x.nome)}</b><br><small style="color:var(--texto-2)">${esc(telBR(x.tel))}</small></td><td><div class="mini-pets">${ps.map((p) => avatar(p, 'mini')).join('')}</div></td><td class="num">${deve ? `<b style="color:var(--atencao)">${reais(deve)}</b>` : '—'}</td></tr>`; }).join('')}</tbody></table></section>
    ${t ? fichaTutor(t) : '<div class="cartao"><p class="vazio">Escolha um tutor para ver os pets, o histórico e o que ele deve.</p></div>'}</div>`;
}
function fichaTutor(t) {
  const ps = db.pets.filter((p) => p.tutor === t.id), deve = aReceber(t.id), hist = db.vendas.filter((v) => tutorDe(pet(v.pet))?.id === t.id).sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora)).slice(0, 8);
  return `<section class="cartao"><div class="cartao-cab"><div><h2>${esc(t.nome)}</h2><small style="color:var(--texto-2)">${esc(telBR(t.tel))} · ${esc(t.end || '')}</small></div><div class="acoes"><button class="bt bt-peq" data-editar-tutor="${t.id}">Editar</button><a class="bt bt-peq bt-zap" target="_blank" rel="noopener" href="${zap(t.tel, `Olá, ${primeiro(t.nome)}! Aqui é da ${db.clinica}.`)}">WhatsApp</a></div></div>
    <div class="cartao-corpo"><div class="pets">${ps.map((p) => `<button type="button" class="pet" data-abrir-pet="${p.id}">${avatar(p)}<div><b>${esc(p.nome)}</b><small>${esc(p.raca)} · ${idade(p.nasc)}</small></div></button>`).join('')}</div>
    ${deve.length ? `<h3 class="sub-tit">A receber</h3><ul class="lista-simples">${deve.map((v) => `<li><span>${dataBR(v.data)} · ${v.itens.map((i) => esc(i.nome)).join(', ')}</span><b>${reais(total(v))}</b><button class="bt bt-peq" data-receber="${v.id}">Recebi</button></li>`).join('')}</ul><a class="bt bt-peq bt-zap" target="_blank" rel="noopener" href="${zap(t.tel, `Olá, ${primeiro(t.nome)}! Tudo bem? Aqui é da ${db.clinica}. Ficou em aberto ${reais(deve.reduce((s, v) => s + total(v), 0))} dos atendimentos de ${deve.map((v) => dataBR(v.data)).join(', ')}. Pode pagar por PIX quando puder. Obrigado!`)}">Lembrar do pagamento</a>` : ''}
    <h3 class="sub-tit">Últimos atendimentos</h3>${hist.length ? `<ul class="lista-simples">${hist.map((v) => `<li><span>${dataBR(v.data)} · ${esc(pet(v.pet)?.nome)} · ${v.itens.map((i) => esc(i.nome)).join(', ')}</span><b>${reais(total(v))}</b></li>`).join('')}</ul>` : '<p class="vazio">Sem histórico.</p>'}</div></section>`;
}

// ---------------------------------------------------------------- VACINAS
function telaVacinas() {
  const lim = { 7: 7, 30: 30, 90: 90 }[est.filtroVac];
  const l = db.vacinas.filter((v) => v.proxima && (est.filtroVac === 'vencidas' ? diasAte(v.proxima) < 0 : diasAte(v.proxima) <= lim)).sort((a, b) => a.proxima.localeCompare(b.proxima));
  const filtros = [['vencidas', 'Vencidas'], ['7', 'Próximos 7 dias'], ['30', 'Próximos 30 dias'], ['90', 'Próximos 90 dias']];
  return `<div class="cab"><div><h1>Vacinas e vermífugos</h1><p>Lembre o tutor com a mensagem pronta no WhatsApp. Um toque e ele já pode agendar.</p></div>
    <div class="acoes">${filtros.map(([k, n]) => `<button class="bt ${est.filtroVac === k ? 'bt-pri' : ''}" data-filtro-vac="${k}">${n}</button>`).join('')}<button class="bt" data-vacina-manual="">+ Registrar vacina</button></div></div>
    <section class="cartao">${l.length ? `<table class="tabela empilha"><thead><tr><th>Pet</th><th>Tutor</th><th>Vacina</th><th>Próxima dose</th><th></th></tr></thead><tbody>${l.map((v) => { const p = pet(v.pet), t = tutorDe(p); return `<tr><td><span class="com-foto">${avatar(p, 'mini')}<b>${esc(p.nome)}</b></span></td><td>${esc(t?.nome)}</td><td>${esc(v.nome)}</td><td>${selVac(v)}</td><td class="num"><a class="bt bt-peq bt-zap" target="_blank" rel="noopener" href="${zap(t?.tel, lembrete(v))}">Lembrar no WhatsApp</a> <button class="bt bt-peq" data-agendar-vac="${v.id}">Agendar</button></td></tr>`; }).join('')}</tbody></table>` : '<p class="vazio">Nada para lembrar neste período.</p>'}</section>`;
}

// ---------------------------------------------------------------- INTERNAÇÃO
function telaInternacao() {
  const agora = horaAgora();
  return `<div class="cab"><div><h1>Internação</h1><p>${db.internados.length} pet${db.internados.length === 1 ? '' : 's'} internado${db.internados.length === 1 ? '' : 's'} · marque cada dose na hora em que der</p></div><button class="bt bt-pri" data-internar="">+ Internar</button></div>
    ${db.internados.length ? `<div class="baias">${db.internados.map((i) => { const p = pet(i.pet), fe = i.doses.filter((d) => d.feita).length, diarias = Math.max(1, diasAte(hoje()) - diasAte(i.entrada) + 1); return `<section class="cartao"><div class="cartao-cab"><span class="com-foto">${avatar(p, 'mini')}<span><h3 class="baia">${esc(p.nome)}</h3><small style="color:var(--texto-2)">${esc(i.baia)} · desde ${dataBR(i.entrada)} · ${diarias} diária${diarias > 1 ? 's' : ''}</small></span></span><span class="selo selo-atendimento">${fe} de ${i.doses.length} doses</span></div>
      <div class="cartao-corpo"><p style="margin:0;color:var(--texto-2)">${esc(i.motivo)}</p><ul class="doses">${i.doses.map((d, k) => `<li class="${d.feita ? 'feita' : d.hora < agora ? 'atrasada' : ''}"><b>${d.hora}</b><span>${esc(d.remedio)}</span>${d.feita ? '<span class="selo selo-pronto">Feita</span>' : `<button class="bt bt-peq" data-dose="${i.id}:${k}">Dar agora</button>`}</li>`).join('')}</ul>
      <div class="acoes" style="margin-top:12px"><button class="bt bt-peq" data-nova-dose="${i.id}">+ Dose</button><button class="bt bt-peq" data-alta="${i.id}">Dar alta e cobrar</button><a class="bt bt-peq bt-zap" target="_blank" rel="noopener" href="${zap(tutorDe(p)?.tel, `Olá! Notícias do(a) ${p.nome}: está internado(a) na ${i.baia}, recebeu ${fe} de ${i.doses.length} medicações de hoje e segue em observação. Qualquer novidade avisamos.`)}">Notícias ao tutor</a></div></div></section>`; }).join('')}</div>` : '<div class="cartao"><p class="vazio">Nenhum pet internado agora.</p></div>'}`;
}

// ---------------------------------------------------------------- ESTÉTICA (banho e tosa)
function telaEstetica() {
  const l = db.estetica.filter((e) => e.data === hoje());
  return `<div class="cab"><div><h1>Banho e tosa</h1><p>${l.length} pets hoje · passe cada um para a próxima etapa; quando ficar pronto, avise o tutor</p></div><button class="bt bt-pri" data-banho="">+ Entrada</button></div>
    <div class="quadro">${ESTETICA.map(([k, n], i) => `<section class="coluna"><h2>${n} <small>${l.filter((e) => e.status === k).length}</small></h2>${l.filter((e) => e.status === k).sort((a, b) => a.hora.localeCompare(b.hora)).map((e) => { const p = pet(e.pet); return `<article class="ficha-banho">${avatar(p)}<div><b>${esc(p.nome)}</b><small>${e.hora} · ${esc(e.servico)}</small>${e.obs ? `<small class="obs">${esc(e.obs)}</small>` : ''}</div><div class="acoes">${i < ESTETICA.length - 1 ? `<button class="bt bt-peq bt-pri" data-etapa="${e.id}">${ESTETICA[i + 1][1]} ›</button>` : `<a class="bt bt-peq bt-zap" target="_blank" rel="noopener" href="${zap(tutorDe(p)?.tel, `Olá, ${primeiro(tutorDe(p)?.nome)}! O(a) ${p.nome} já está cheiroso(a) e pronto(a) para buscar aqui na ${db.clinica}. 🐾`)}">Pode buscar</a><button class="bt bt-peq" data-entregue="${e.id}">Entregue</button>`}</div></article>`; }).join('') || '<p class="vazio">—</p>'}</section>`).join('')}</div>`;
}

// ---------------------------------------------------------------- EXAMES
function telaExames() {
  const l = db.exames.slice().sort((a, b) => ['coletado', 'solicitado', 'pronto'].indexOf(a.status) - ['coletado', 'solicitado', 'pronto'].indexOf(b.status) || b.data.localeCompare(a.data));
  return `<div class="cab"><div><h1>Exames</h1><p>Do pedido ao resultado: marque a coleta, lance o laudo e avise o tutor.</p></div><button class="bt bt-pri" data-pedir-exame="">+ Pedir exame</button></div>
    <section class="cartao"><ul class="lista-exames">${l.map(linhaExame).join('') || '<p class="vazio">Nenhum exame.</p>'}</ul></section>`;
}

// ---------------------------------------------------------------- ESTOQUE
function telaEstoque() {
  const l = [...db.estoque].sort((a, b) => (alertaItem(b) ? 1 : 0) - (alertaItem(a) ? 1 : 0) || a.nome.localeCompare(b.nome));
  const valor = db.estoque.reduce((s, x) => s + x.qtd * (x.custo || 0), 0);
  return `<div class="cab"><div><h1>Estoque</h1><p>${db.estoque.length} itens · ${reais(valor)} em custo · o que está acabando ou vencendo aparece primeiro</p></div><button class="bt bt-pri" data-novo-item>+ Item</button></div>
    <section class="cartao"><table class="tabela empilha"><thead><tr><th>Item</th><th>Tipo</th><th>Lote</th><th>Validade</th><th class="num">Qtd.</th><th class="num">Custo / venda</th><th></th></tr></thead><tbody>${l.map((x) => `<tr><td><b>${esc(x.nome)}</b>${alertaItem(x) ? `<br>${alertaItem(x)}` : ''}</td><td>${esc(x.tipo)}</td><td>${esc(x.lote)}</td><td>${dataBR(x.validade)}</td><td class="num"><b>${x.qtd}</b> <small style="color:var(--texto-3)">mín. ${x.minimo}</small></td><td class="num">${reais(x.custo)} / ${reais(x.preco)}</td><td class="num"><button class="bt bt-peq" data-entrada="${x.id}">+ Entrada</button></td></tr>`).join('')}</tbody></table></section>`;
}
const alertaItem = (x) => { const d = diasAte(x.validade); return d < 0 ? '<span class="selo selo-alerta">Vencido</span>' : d <= 30 ? `<span class="selo selo-chegou">Vence em ${d} dias</span>` : x.qtd < x.minimo ? '<span class="selo selo-alerta">Abaixo do mínimo</span>' : ''; };

// ---------------------------------------------------------------- CAIXA
function telaCaixa() {
  const h = hoje(), l = db.vendas.filter((v) => v.data === h).sort((a, b) => b.hora.localeCompare(a.hora));
  const formas = {}; l.forEach((v) => { formas[v.forma] = (formas[v.forma] || 0) + total(v); });
  const pend = aReceber();
  return `<div class="cab"><div><h1>Caixa do dia</h1><p>${l.length} cobrança${l.length === 1 ? '' : 's'} hoje · ${reais(pend.reduce((s, v) => s + total(v), 0))} a receber no total</p></div><button class="bt bt-pri" data-cobrar="">+ Nova cobrança</button></div>
    <div class="duas"><section class="cartao"><div class="cartao-cab"><h2>Lançamentos de hoje</h2></div>${l.length ? `<table class="tabela empilha"><tbody>${l.map((v) => `<tr><td><b>${v.hora}</b> · ${esc(pet(v.pet)?.nome || 'Balcão')}<br><small style="color:var(--texto-2)">${v.itens.map((i) => `${esc(i.nome)}${i.qtd > 1 ? ` ×${i.qtd}` : ''}`).join(', ')}</small></td><td>${esc(v.forma)}</td><td class="num"><b>${reais(total(v))}</b></td><td class="num">${v.nfse ? `<button class="bt bt-peq" data-nfse="${v.id}">Nota nº ${v.nfse.numero}</button>` : `<button class="bt bt-peq" data-nfse="${v.id}">Emitir NFS-e</button>`}</td></tr>`).join('')}</tbody></table>` : '<p class="vazio">Nada cobrado ainda hoje.</p>'}</section>
    <div style="display:grid;gap:18px"><section class="cartao"><div class="cartao-cab"><h2>Fechamento</h2></div><div class="cartao-corpo">${Object.entries(formas).map(([f, v]) => `<div class="linha-valor"><span>${esc(f)}</span><b>${reais(v)}</b></div>`).join('') || '<p class="vazio">Sem valores.</p>'}</div><div class="total"><span>Recebido hoje</span><b>${reais(l.filter((v) => v.recebido).reduce((s, v) => s + total(v), 0))}</b></div></section>
    <section class="cartao"><div class="cartao-cab"><h2>A receber (fiado)</h2></div><div class="cartao-corpo">${pend.length ? `<ul class="lista-simples">${pend.map((v) => `<li><span>${dataBR(v.data)} · ${esc(tutorDe(pet(v.pet))?.nome || 'Balcão')}</span><b>${reais(total(v))}</b><button class="bt bt-peq" data-receber="${v.id}">Recebi</button></li>`).join('')}</ul>` : '<p class="vazio">Ninguém devendo.</p>'}</div></section></div></div>`;
}

// ---------------------------------------------------------------- RELATÓRIOS
function telaRelatorios() {
  const ini = maisDias(hoje(), -29), l = db.vendas.filter((v) => v.data >= ini && v.recebido);
  const dias = Array.from({ length: 30 }, (_, i) => maisDias(ini, i)), porDia = dias.map((d) => l.filter((v) => v.data === d).reduce((s, v) => s + total(v), 0));
  const fat = porDia.reduce((s, x) => s + x, 0), max = Math.max(...porDia, 1), ticket = l.length ? fat / l.length : 0;
  const serv = {}; l.forEach((v) => v.itens.forEach((i) => { serv[i.nome] = (serv[i.nome] || 0) + i.valor * i.qtd; }));
  const top = Object.entries(serv).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const formas = {}; l.forEach((v) => { formas[v.forma] = (formas[v.forma] || 0) + total(v); });
  const vacMes = db.vacinas.filter((v) => v.data >= ini).length, consMes = db.prontuarios.filter((p) => p.data >= ini).length;
  const W = 720, H = 160;
  return `<div class="cab"><div><h1>Relatórios</h1><p>Últimos 30 dias (${dataBR(ini)} a ${dataBR(hoje())})</p></div></div>
    <div class="numeros"><div class="numero destaque"><span>Faturamento recebido</span><b>${reais(fat)}</b></div><div class="numero"><span>Atendimentos cobrados</span><b>${l.length}</b></div><div class="numero"><span>Ticket médio</span><b>${reais(ticket)}</b></div><div class="numero"><span>Vacinas · consultas</span><b>${vacMes} · ${consMes}</b></div></div>
    <section class="cartao"><div class="cartao-cab"><h2>Faturamento por dia</h2></div><div class="cartao-corpo"><svg class="barras" viewBox="0 0 ${W} ${H + 22}" role="img" aria-label="Faturamento por dia nos últimos 30 dias">${porDia.map((v, i) => { const bw = W / 30 - 4, bh = Math.max(v ? 3 : 0, (v / max) * H), x = i * (W / 30) + 2; return `<rect x="${x}" y="${H - bh}" width="${bw}" height="${bh}" rx="3"><title>${dataBR(dias[i])}: ${reais(v)}</title></rect>${i % 5 === 0 ? `<text x="${i ? x + bw / 2 : x}" y="${H + 16}" text-anchor="${i ? 'middle' : 'start'}">${dataBR(dias[i]).slice(0, 5)}</text>` : ''}`; }).join('')}</svg></div></section>
    <div class="duas" style="margin-top:18px"><section class="cartao"><div class="cartao-cab"><h2>O que mais vende</h2></div><div class="cartao-corpo">${top.map(([n, v]) => `<div class="barra-h"><span>${esc(n)}</span><i style="--p:${(v / top[0][1]) * 100}%"></i><b>${reais(v)}</b></div>`).join('')}</div></section>
    <section class="cartao"><div class="cartao-cab"><h2>Formas de pagamento</h2></div><div class="cartao-corpo">${Object.entries(formas).sort((a, b) => b[1] - a[1]).map(([f, v]) => `<div class="linha-valor"><span>${esc(f)}</span><b>${reais(v)} <small style="color:var(--texto-3)">${Math.round((v / fat) * 100)}%</small></b></div>`).join('')}</div></section></div>
    ${cartaoComissoes(l)}`;
}


// ---------------------------------------------------------------- CONFIGURAÇÕES
const CFG = [['conta', 'Minha conta'], ['clinica', 'Clínica'], ['equipe', 'Equipe'], ['servicos', 'Serviços e preços'], ['agendamento', 'Agendamento online'], ['comissoes', 'Comissões'], ['fiscal', 'Nota fiscal'], ['ia', 'Assistente de IA'], ['dados', 'Cópia de segurança']];
function telaConfig() {
  const c = db.config;
  const corpo = {
    conta: () => CONTA ? `<div class="painel-conta"><p style="margin:0">Você está na conta da <b>${esc(window.veltriaConta?.empresa || db.clinica)}</b>. A mesma conta abre o sistema no computador e no celular, e cada pessoa da equipe entra com o próprio e-mail.</p>
      <div class="acoes"><button type="button" class="bt bt-pri" data-vc-ir="perfil">Perfil e painel do dono</button><button type="button" class="bt" data-vc-ir="equipe">Equipe e convites</button><button type="button" class="bt" data-vc-ir="assinatura">Assinatura</button><button type="button" class="bt" data-vc-ir="config">Dados da empresa</button><button type="button" class="bt" data-vc-ir="sair">Sair</button></div>
      <p class="nota">Convide pelo e-mail da pessoa e escolha o cargo, se ela pode alterar ou só ver e quais telas aparecem para ela. Equipe sem limite de pessoas.</p></div>` : `<form class="cfg-form" data-salvar-cfg="conta"><div class="grade-campos"><label class="campo">Seu nome<input name="nome" value="${esc(c.conta.nome)}"></label><label class="campo">E-mail de acesso<input name="email" type="email" value="${esc(c.conta.email)}"></label><label class="campo">Cargo<input name="cargo" value="${esc(c.conta.cargo)}"></label><label class="campo">Plano<input value="${esc(c.conta.plano)}" disabled></label></div>
      <p class="nota">Na versão de verdade, a conta fica no site da Blue Rose: o mesmo login abre o sistema no computador e no celular, e a equipe entra com o próprio acesso.</p><div class="acoes"><button class="bt bt-pri">Salvar</button></div></form>`,
    clinica: () => `<form class="cfg-form" data-salvar-cfg="clinica"><div class="grade-campos"><label class="campo largo">Nome da clínica<input name="clinica" value="${esc(db.clinica)}"></label><label class="campo">CNPJ<input name="cnpj" value="${esc(c.cnpj)}"></label><label class="campo">WhatsApp da clínica<input name="telefone" value="${esc(telBR(c.telefone))}"></label>
      <label class="campo largo">Endereço<input name="endereco" value="${esc(c.endereco)}"></label><label class="campo">Cidade<input name="cidade" value="${esc(c.cidade)}"></label><label class="campo">Responsável técnico (CRMV)<input name="crmv" value="${esc(c.crmv)}"></label>
      <label class="campo">Horário de atendimento<input name="horario" value="${esc(c.horario)}"></label><label class="campo">Valor da diária de internação (R$)<input name="diaria" inputmode="decimal" value="${c.diaria}"></label></div><p class="nota">O nome, o endereço e o CRMV saem nas receitas, termos, atestados e carteiras de vacinação.</p><div class="acoes"><button class="bt bt-pri">Salvar</button></div></form>`,
    equipe: () => `${CONTA ? '<p class="nota" style="margin:0 0 14px">Esta lista é de quem atende (aparece na agenda, nas receitas e nas comissões). Para dar acesso ao sistema a alguém, use <button type="button" class="link" data-vc-ir="equipe">Equipe e convites</button>.</p>' : ''}<ul class="lista-simples">${db.vets.map((v, i) => `<li><span><b>${esc(v)}</b></span><span class="selo selo-aguardando">${v.startsWith('Dr') ? 'Veterinário(a)' : 'Equipe'}</span><button class="bt bt-peq bt-perigo" data-tirar-vet="${i}">Tirar</button></li>`).join('')}</ul>
      <form class="cfg-form linha-form" data-salvar-cfg="vet"><label class="campo">Nome<input name="nome" placeholder="Ex.: Dra. Júlia Prado"></label><label class="campo">Função<select name="tipo"><option value="vet">Veterinário(a)</option><option value="equipe">Equipe (estética, recepção)</option></select></label><button class="bt bt-pri">Adicionar</button></form>`,
    servicos: () => `<form class="cfg-form" data-salvar-cfg="servicos"><table class="tabela tabela-servicos"><thead><tr><th>Serviço</th><th class="num">Preço (R$)</th><th></th></tr></thead><tbody>${servicos().map(([n, v], i) => `<tr><td><input class="cel-tab" name="n${i}" value="${esc(n)}"></td><td class="num"><input class="cel-tab num" name="v${i}" inputmode="decimal" value="${v}"></td><td class="num"><button type="button" class="bt bt-peq bt-perigo" data-tirar-serv="${i}">Tirar</button></td></tr>`).join('')}
      <tr><td><input class="cel-tab" name="novo_n" placeholder="Novo serviço"></td><td class="num"><input class="cel-tab num" name="novo_v" inputmode="decimal" placeholder="0,00"></td><td></td></tr></tbody></table><div class="acoes" style="margin-top:12px"><button class="bt bt-pri">Salvar preços</button></div></form>`,
    ia: () => `<form class="cfg-form" data-salvar-cfg="ia"><div class="opcoes-ia"><label class="op-ia"><input type="radio" name="modo" value="nossa" ${c.ia.modo !== 'propria' ? 'checked' : ''}><span><b>Assistente VetNature</b><small>Incluso no plano. Responde sobre a agenda, os pacientes, as vacinas, o caixa e o estoque da sua clínica.</small></span></label>
      <label class="op-ia"><input type="radio" name="modo" value="propria" ${c.ia.modo === 'propria' ? 'checked' : ''}><span><b>Usar a minha IA</b><small>Já paga o ChatGPT, o Gemini ou o Claude? Coloque a sua chave e o assistente passa a usar a sua conta.</small></span></label></div>
      <div class="grade-campos" data-propria ${c.ia.modo === 'propria' ? '' : 'hidden'}><label class="campo">Qual IA<select name="provedor">${[['openai', 'ChatGPT (OpenAI)'], ['gemini', 'Gemini (Google)'], ['claude', 'Claude (Anthropic)']].map(([k, n]) => `<option value="${k}" ${c.ia.provedor === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label class="campo">Modelo (opcional)<input name="modelo" value="${esc(c.ia.modelo)}" placeholder="padrão de cada IA"></label>
      <label class="campo largo">Chave da API<input name="chave" type="password" autocomplete="off" value="${esc(chaveIA())}" placeholder="Cole aqui a chave da sua conta"></label><p class="nota largo">A chave fica guardada só neste navegador e vai direto para a empresa da IA que você escolheu. Onde pegar: ChatGPT em platform.openai.com/api-keys · Gemini em aistudio.google.com/apikey · Claude em console.anthropic.com.</p></div>
      <div class="acoes"><button class="bt bt-pri">Salvar</button><button type="button" class="bt" data-ia>Abrir o assistente</button></div></form>`,
    agendamento: () => { const o = c.agendaOnline; return `<form class="cfg-form" data-salvar-cfg="agendamento"><label class="op-ia"><input type="checkbox" name="ligado" ${o.ligado ? 'checked' : ''}><span><b>Deixar o tutor pedir horário pelo link</b><small>O pedido cai na Agenda para alguém da clínica confirmar. Nada entra na agenda sem confirmação.</small></span></label>
      <div class="grade-campos"><label class="campo">Primeiro horário<input name="inicio" type="time" value="${o.inicio}"></label><label class="campo">Último horário<input name="fim" type="time" value="${o.fim}"></label><label class="campo">De quanto em quanto tempo<select name="intervalo">${[15, 20, 30, 60].map((m) => `<option value="${m}" ${o.intervalo === m ? 'selected' : ''}>${m} minutos</option>`).join('')}</select></label><label class="campo">Sábado<select name="sabado"><option value="1">Atende (até 12h)</option><option value="" ${o.sabado ? '' : 'selected'}>Não atende</option></select></label>
      <fieldset class="campo largo escolhas"><legend>O que o tutor pode pedir</legend>${Object.keys(TIPOS).filter((t) => t !== 'Cirurgia').map((t) => `<label><input type="checkbox" name="tipos" value="${t}" ${o.tipos.includes(t) ? 'checked' : ''}> ${t}</label>`).join('')}</fieldset></div>
      <p class="nota">Link da clínica: <b>${esc(linkAgendar())}</b> · coloque na bio do Instagram, no Google e na mensagem automática do WhatsApp.</p><div class="acoes"><button class="bt bt-pri">Salvar</button><a class="bt" href="${esc(linkAgendar())}" target="_blank" rel="noopener">Abrir a página do tutor</a></div></form>`; },
    comissoes: () => `<form class="cfg-form" data-salvar-cfg="comissoes"><table class="tabela"><thead><tr><th>Profissional</th><th class="num">Comissão sobre os serviços (%)</th></tr></thead><tbody>${db.vets.map((v, i) => `<tr><td><b>${esc(v)}</b></td><td class="num"><input class="cel-tab num" name="c${i}" inputmode="decimal" value="${c.comissoes[v] ?? 0}"></td></tr>`).join('')}</tbody></table>
      <p class="nota">A comissão conta só os serviços (consulta, banho, exame...). Produtos e descontos ficam de fora. O valor de cada um aparece em Relatórios.</p><div class="acoes"><button class="bt bt-pri">Salvar</button></div></form>`,
    fiscal: () => `<form class="cfg-form" data-salvar-cfg="fiscal"><div class="grade-campos"><label class="campo">Inscrição municipal<input name="im" value="${esc(c.fiscal.im)}"></label><label class="campo">Regime<input name="regime" list="lista-regime" value="${esc(c.fiscal.regime)}"><datalist id="lista-regime"><option value="Simples Nacional"><option value="MEI"><option value="Lucro presumido"><option value="Lucro real"></datalist></label>
      <label class="campo">Serviço (lista da LC 116)<input name="codigo" value="${esc(c.fiscal.codigo)}"></label><label class="campo">Alíquota do ISS (%)<input name="aliquota" inputmode="decimal" value="${c.fiscal.aliquota}"></label><label class="campo">Próximo número de nota<input name="proxima" type="number" min="1" value="${c.fiscal.proxima}"></label></div>
      <p class="nota">Na versão de verdade a nota vai direto para a prefeitura da sua cidade, com o certificado digital da clínica, e o tutor recebe o PDF por e-mail ou WhatsApp. ${CONTA ? 'Por enquanto a nota sai como prévia, sem valor fiscal: a emissão na prefeitura a nossa equipe ativa com você.' : 'Nesta demonstração a nota sai como prévia, sem valor fiscal.'}</p><div class="acoes"><button class="bt bt-pri">Salvar</button></div></form>`,
    dados: () => `<p style="margin-top:0">Baixe uma cópia de todos os cadastros (pets, tutores, prontuários, vacinas, caixa) ou volte uma cópia que você guardou.</p><div class="acoes"><button class="bt bt-pri" data-baixar-copia>Baixar cópia (.json)</button><label class="bt">Voltar uma cópia<input type="file" accept="application/json" data-voltar-copia hidden></label>${CONTA ? '<button class="bt bt-perigo" data-vc-ir="zerar">Começar do zero (apaga os dados da clínica)</button>' : '<button class="bt bt-perigo" data-recomecar>Apagar tudo e voltar aos dados de exemplo</button>'}</div>`,
  };
  return `<div class="cab"><div><h1>Configurações</h1><p>Sua conta, a clínica, a equipe, os preços e o assistente de IA.</p></div></div>
    <div class="cfg"><nav class="cfg-menu" aria-label="Configurações">${CFG.map(([k, n]) => `<button type="button" data-cfg="${k}" ${est.cfg === k ? 'aria-current="true"' : ''}>${n}</button>`).join('')}</nav><section class="cartao"><div class="cartao-cab"><h2>${CFG.find(([k]) => k === est.cfg)[1]}</h2></div><div class="cartao-corpo">${corpo[est.cfg]()}</div></section></div>`;
}
function salvarConfig(f) {
  const c = db.config, tipo = f.dataset.salvarCfg;
  if (tipo === 'conta') Object.assign(c.conta, { nome: f.nome.value.trim(), email: f.email.value.trim(), cargo: f.cargo.value.trim() });
  if (tipo === 'clinica') { db.clinica = f.clinica.value.trim() || db.clinica; Object.assign(c, { cnpj: f.cnpj.value.trim(), telefone: soDigitos(f.telefone.value), endereco: f.endereco.value.trim(), cidade: f.cidade.value.trim(), crmv: f.crmv.value.trim(), horario: f.horario.value.trim(), diaria: num(f.diaria.value) || 0 }); }
  if (tipo === 'vet') { const n = f.nome.value.trim(); if (!n) return avisar('Escreva o nome.'); const nome = f.tipo.value === 'vet' && !/^dra?\.?\s/i.test(n) ? `Dr(a). ${n}` : n; db.vets.push(nome); c.comissoes[nome] ??= f.tipo.value === 'vet' ? 10 : 30; }
  if (tipo === 'servicos') { c.servicos = servicos().map((_, i) => [f[`n${i}`].value.trim(), num(f[`v${i}`].value) || 0]).filter(([n]) => n); if (f.novo_n.value.trim()) c.servicos.push([f.novo_n.value.trim(), num(f.novo_v.value) || 0]); }
  if (tipo === 'avisos') { const m = {}; Object.keys(MODELOS_AVISO).forEach((k) => { m[k] = f[`m_${k}`].value.trim() || MODELOS_AVISO[k]; }); c.avisos = { ligado: c.avisos.ligado, hora: f.hora.value || '09:00', vacina: Math.max(0, Math.round(Number(f.vacina.value)) || 0), consulta: Math.max(0, Math.round(Number(f.consulta.value)) || 0), aniversario: f.aniversario.checked, exame: f.exame.checked, modelos: m }; }
  if (tipo === 'agendamento') { const tipos = [...f.querySelectorAll('[name=tipos]:checked')].map((x) => x.value); if (!tipos.length) return avisar('Escolha pelo menos uma coisa que o tutor pode pedir.'); if (f.inicio.value >= f.fim.value) return avisar('O último horário precisa ser depois do primeiro.'); c.agendaOnline = { ligado: f.ligado.checked, inicio: f.inicio.value, fim: f.fim.value, intervalo: Number(f.intervalo.value), sabado: !!f.sabado.value, tipos }; }
  if (tipo === 'comissoes') db.vets.forEach((v, i) => { c.comissoes[v] = Math.min(100, Math.max(0, num(f[`c${i}`].value) || 0)); });
  if (tipo === 'fiscal') Object.assign(c.fiscal, { im: f.im.value.trim(), regime: f.regime.value.trim(), codigo: f.codigo.value.trim(), aliquota: num(f.aliquota.value) || 0, proxima: Math.max(1, Math.round(Number(f.proxima.value)) || 1) });
  if (tipo === 'ia') { c.ia = { modo: f.modo.value, provedor: f.provedor.value, modelo: f.modelo.value.trim() }; guardarChaveIA(f.chave.value.trim()); if (c.ia.modo === 'propria' && !chaveIA()) avisar('Sem a chave, o assistente continua usando o Assistente VetNature.'); }
  salvar(); avisar('Salvo.'); desenhar();
}

// ---------------------------------------------------------------- ASSISTENTE DE IA
const SUGESTOES = ['Resumo do dia', 'Quais vacinas estão vencidas?', 'Quanto entrou hoje?', 'O que está acabando no estoque?', 'Quem está devendo?', 'Como está o Thor?'];
function abrirIA() {
  const p = $('#painel-ia'); p.hidden = false; desenharIA(); p.querySelector('input')?.focus();
}
function desenharIA() {
  const p = $('#painel-ia'), propria = db.config.ia.modo === 'propria' && chaveIA();
  p.innerHTML = `<div class="ia-cab"><div><b>${IC.ia} Assistente</b><small>${propria ? `Usando a sua IA (${({ openai: 'ChatGPT', gemini: 'Gemini', claude: 'Claude' })[db.config.ia.provedor]})` : 'Assistente VetNature'}</small></div><button type="button" class="fechar" data-fechar-ia aria-label="Fechar">×</button></div>
    <div class="ia-conversa" aria-live="polite">${est.chat.length ? est.chat.map((m) => `<div class="msg msg-${m.de}">${m.de === 'ia' ? m.texto : esc(m.texto)}</div>`).join('') : `<div class="msg msg-ia">Oi, ${esc(primeiro(db.config.conta.nome))}! Pergunte sobre a agenda, um paciente, as vacinas, o caixa ou o estoque.</div>`}</div>
    <div class="ia-sug">${SUGESTOES.map((s) => `<button type="button" data-perguntar="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    <form class="ia-form" data-ia-form><input name="q" placeholder="Escreva sua pergunta" autocomplete="off"><button class="bt bt-pri">Enviar</button></form>`;
  const conv = p.querySelector('.ia-conversa'); conv.scrollTop = conv.scrollHeight;
}
async function perguntar(q) {
  q = q.trim(); if (!q) return;
  est.chat.push({ de: 'eu', texto: q }, { de: 'ia', texto: '<span class="pensando">Pensando…</span>' }); desenharIA();
  let r;
  const c = db.config.ia;
  if (c.modo === 'propria' && chaveIA()) { try { r = esc(await iaPropria(q)).replace(/\n/g, '<br>'); } catch (e) { r = `Não consegui falar com a sua IA (${esc(e.message)}). Confira a chave em Configurações · Assistente de IA. Enquanto isso, respondo com o Assistente VetNature:<br><br>${iaNossa(q)}`; } }
  else if (CONTA && window.veltriaIA && !/dose|mg\/kg|posologia|quanto (de|dar)/.test(sem(q))) { r = esc(await window.veltriaIA(q)).replace(/\n/g, '<br>'); }
  else r = iaNossa(q);
  est.chat[est.chat.length - 1].texto = r; desenharIA();
}
const sem = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// resumo dos dados para a IA da pessoa (sem telefone nem chave)
function contexto() {
  const h = hoje();
  return JSON.stringify({ clinica: db.clinica, hoje: h, agenda_hoje: db.agenda.filter((a) => a.data === h).map((a) => ({ hora: a.hora, pet: pet(a.pet)?.nome, tipo: a.tipo, vet: a.vet, status: a.status })),
    pets: db.pets.map((p) => ({ nome: p.nome, especie: p.especie, raca: p.raca, idade: idade(p.nasc), peso: pesoAtual(p), alergias: p.alergias, tutor: tutorDe(p)?.nome })),
    vacinas_proximas: db.vacinas.filter((v) => v.proxima && diasAte(v.proxima) <= 30).map((v) => ({ pet: pet(v.pet)?.nome, vacina: v.nome, proxima: v.proxima })),
    internados: db.internados.map((i) => ({ pet: pet(i.pet)?.nome, motivo: i.motivo, doses_pendentes: i.doses.filter((d) => !d.feita).map((d) => `${d.hora} ${d.remedio}`) })),
    estoque_alerta: db.estoque.filter((x) => x.qtd < x.minimo || diasAte(x.validade) <= 30).map((x) => ({ item: x.nome, qtd: x.qtd, minimo: x.minimo, validade: x.validade })),
    caixa_hoje: db.vendas.filter((v) => v.data === h && v.recebido).reduce((s, v) => s + total(v), 0), a_receber: aReceber().reduce((s, v) => s + total(v), 0) });
}
async function iaPropria(q) {
  const c = db.config.ia, sistema = `Você é o assistente do sistema VetNature da ${db.clinica}. Responda em português do Brasil, curto e prático, só com base nos dados abaixo. Não invente dados. Não prescreva doses de medicamento: diga para confirmar com o veterinário.\nDados da clínica (JSON): ${contexto()}`;
  const pede = async (url, op) => { const r = await fetch(url, op); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error?.message || `erro ${r.status}`); return j; };
  if (c.provedor === 'gemini') { const j = await pede(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.modelo || 'gemini-2.0-flash')}:generateContent?key=${encodeURIComponent(chaveIA())}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: sistema }] }, contents: [{ role: 'user', parts: [{ text: q }] }] }) }); return j.candidates?.[0]?.content?.parts?.map((x) => x.text).join('') || 'Sem resposta.'; }
  if (c.provedor === 'claude') { const j = await pede('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': chaveIA(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: c.modelo || 'claude-haiku-5-5', max_tokens: 700, system: sistema, messages: [{ role: 'user', content: q }] }) }); return j.content?.map((x) => x.text || '').join('') || 'Sem resposta.'; }
  const j = await pede('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chaveIA()}` }, body: JSON.stringify({ model: c.modelo || 'gpt-4o-mini', messages: [{ role: 'system', content: sistema }, { role: 'user', content: q }] }) });
  return j.choices?.[0]?.message?.content || 'Sem resposta.';
}
// Assistente VetNature: responde direto dos dados da clínica (na demonstração roda no navegador)
function iaNossa(q) {
  const t = sem(q), h = hoje(), lista = (l) => `<ul>${l.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  const p = db.pets.find((x) => new RegExp(`\\b${sem(x.nome)}\\b`).test(t));
  if (/dose|mg\/kg|quanto (de|dar)|posologia/.test(t)) return 'Doses de medicamento eu não calculo: elas dependem do exame e da avaliação do veterinário. Posso mostrar o peso atual e o histórico do paciente, se quiser.';
  if (p) { const ult = db.prontuarios.filter((x) => x.pet === p.id).sort((a, b) => b.data.localeCompare(a.data))[0], vac = db.vacinas.filter((v) => v.pet === p.id && v.proxima).sort((a, b) => a.proxima.localeCompare(b.proxima))[0], int = db.internados.find((i) => i.pet === p.id), ag = db.agenda.filter((a) => a.pet === p.id && a.data >= h).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))[0];
    return `<b>${esc(p.nome)}</b> · ${esc(p.raca)}, ${idade(p.nasc)}, ${pesoAtual(p) ?? '—'} kg${p.alergias ? ` · <b>alergia a ${esc(p.alergias)}</b>` : ''}.${lista([ult ? `Última consulta em ${dataBR(ult.data)}: ${esc(ult.diagnostico)}` : 'Ainda sem consulta registrada', vac ? `Próxima vacina: ${esc(vac.nome)} em ${dataBR(vac.proxima)}` : 'Sem vacina pendente', int ? `Internado na ${esc(int.baia)} (${int.doses.filter((d) => !d.feita).length} doses pendentes)` : 'Não está internado', ag ? `Próximo horário: ${dataBR(ag.data)} às ${ag.hora} (${esc(ag.tipo)})` : 'Sem horário marcado'])}`; }
  if (/vacin|vermif/.test(t)) { const v = db.vacinas.filter((x) => x.proxima && (/venc|atras/.test(t) ? diasAte(x.proxima) < 0 : diasAte(x.proxima) <= 7)).sort((a, b) => a.proxima.localeCompare(b.proxima)); return v.length ? `${/venc|atras/.test(t) ? 'Vacinas vencidas' : 'Vacinas vencidas ou vencendo nos próximos 7 dias'}:${lista(v.map((x) => `<b>${esc(pet(x.pet).nome)}</b> · ${esc(x.nome)} · ${dataBR(x.proxima)}`))}Os lembretes prontos ficam em <b>Vacinas</b>.` : 'Nenhuma vacina vencida agora. 👍'; }
  if (/fatur|caixa|entrou|recebi|vend|dinheiro|lucro/.test(t) && !/deve|devendo|fiado/.test(t)) { const hj = db.vendas.filter((v) => v.data === h && v.recebido), mes = db.vendas.filter((v) => v.data >= maisDias(h, -29) && v.recebido); return `Hoje entraram <b>${reais(hj.reduce((s, v) => s + total(v), 0))}</b> em ${hj.length} cobrança${hj.length === 1 ? '' : 's'}. Nos últimos 30 dias: <b>${reais(mes.reduce((s, v) => s + total(v), 0))}</b>. Há ${reais(aReceber().reduce((s, v) => s + total(v), 0))} para receber no fiado.`; }
  if (/estoque|acaba|faltando|repor|validade/.test(t)) { const l = db.estoque.filter((x) => x.qtd < x.minimo || diasAte(x.validade) <= 30); return l.length ? `Precisa de atenção:${lista(l.map((x) => `<b>${esc(x.nome)}</b> · ${x.qtd} em estoque (mín. ${x.minimo})${diasAte(x.validade) <= 30 ? ` · vence ${dataBR(x.validade)}` : ''}`))}` : 'O estoque está em dia.'; }
  if (/deve|fiado|receber|pagar|divid/.test(t)) { const l = aReceber(); return l.length ? `A receber:${lista(l.map((v) => `<b>${esc(tutorDe(pet(v.pet))?.nome || 'Balcão')}</b> · ${reais(total(v))} desde ${dataBR(v.data)}`))}Dá para mandar o lembrete pelo WhatsApp em <b>Tutores</b>.` : 'Ninguém devendo. 👏'; }
  if (/internad|baia|medica/.test(t)) return db.internados.length ? `Internados:${lista(db.internados.map((i) => `<b>${esc(pet(i.pet).nome)}</b> · ${esc(i.baia)} · próxima dose: ${esc(i.doses.find((d) => !d.feita)?.hora || 'nenhuma')} ${esc(i.doses.find((d) => !d.feita)?.remedio || '')}`))}` : 'Nenhum pet internado.';
  if (/aniversar/.test(t)) { const l = aniversariantes(); return l.length ? `Aniversários da semana:${lista(l.map(({ p: x, data }) => `<b>${esc(x.nome)}</b> · ${dataBR(data)}`))}` : 'Nenhum aniversário nesta semana.'; }
  if (/exame|laudo|resultado/.test(t)) { const l = db.exames.filter((e) => e.status !== 'pronto' || !e.avisado); return l.length ? `Exames em andamento ou sem aviso ao tutor:${lista(l.map((e) => `<b>${esc(pet(e.pet)?.nome)}</b> · ${esc(e.nome)} · ${EXAME_ST[e.status][0].toLowerCase()}`))}` : 'Nenhum exame pendente.'; }
  if (/hoje|dia|agenda|atendiment|resumo|fila/.test(t)) { const ag = db.agenda.filter((x) => x.data === h).sort((x, y) => x.hora.localeCompare(y.hora)); return `Hoje são <b>${ag.length} atendimentos</b>: ${ag.filter((x) => x.status === 'pronto').length} já atendidos e ${ag.filter((x) => x.status === 'chegou').length} na sala de espera.${lista(ag.filter((x) => x.status !== 'pronto').map((x) => `${x.hora} · <b>${esc(pet(x.pet).nome)}</b> · ${esc(x.tipo)} com ${esc(x.vet)}`))}${vacPendentes().length ? `E ${vacPendentes().length} vacinas para lembrar nesta semana.` : ''}`; }
  return `Posso ajudar com:${lista(['o resumo do dia e a agenda', 'um paciente (escreva o nome, por exemplo “Thor”)', 'vacinas vencidas ou vencendo', 'o caixa e quem está devendo', 'o estoque', 'internados e exames'])}`;
}

// ---------------------------------------------------------------- janelas
function janela(titulo, corpo, botoes) {
  const fundo = $('#janela'), j = fundo.firstElementChild;
  j.innerHTML = `<div class="janela-cab"><h2 id="janela-t">${titulo}</h2><button type="button" class="fechar" data-fechar aria-label="Fechar">×</button></div><form class="janela-form" novalidate><div class="janela-corpo">${corpo}</div><div class="janela-pe"><button type="button" class="bt" data-fechar>Cancelar</button>${botoes}</div></form>`;
  fundo.hidden = false; j.querySelector('input:not([type=file]):not([type=hidden]), select, textarea')?.focus();
  const f = j.querySelector('form');
  // antes de qualquer janela salvar: o pet escrito precisa existir (ou ficar em branco quando pode)
  f.addEventListener('submit', (e) => { const b = f.querySelector('[data-pet-busca]'); if (!b || f.pet.value || (b.hasAttribute('data-vazio') && !b.value.trim())) return; e.preventDefault(); e.stopImmediatePropagation(); avisar(b.value.trim() ? `Não achei "${b.value.trim()}". Escolha da lista ou cadastre em Pacientes › + Novo pet.` : 'Escreva o nome do pet.'); b.focus(); });
  return f;
}
const fecharJanela = () => { $('#janela').hidden = true; };
const rotuloPet = (p) => `${p.nome} · ${tutorDe(p)?.nome || 'sem tutor'}`;
// campo de pet em que se escreve o nome (do pet ou do tutor) e a lista só sugere
const campoPet = (sel, vazio = '') => { const p = sel && pet(sel); return `<input type="hidden" name="pet" value="${p ? p.id : ''}"><input name="petbusca" list="lista-pets" data-pet-busca ${vazio ? 'data-vazio' : ''} autocomplete="off" placeholder="${vazio ? esc(vazio) : 'Escreva o nome do pet ou do tutor'}" value="${p ? esc(rotuloPet(p)) : ''}"><datalist id="lista-pets">${db.pets.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((x) => `<option value="${esc(rotuloPet(x))}">`).join('')}</datalist>`; };
function acharPet(texto) {
  const t = sem(texto.trim()); if (!t) return null;
  const exato = db.pets.find((p) => sem(rotuloPet(p)) === t); if (exato) return exato;
  const l = db.pets.filter((p) => sem(p.nome) === t || sem(p.nome).startsWith(t) || sem(tutorDe(p)?.nome || '').startsWith(t));
  return l.length === 1 ? l[0] : null;
}
const opcoesPets = (sel) => db.pets.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((p) => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.nome)} · ${esc(tutorDe(p)?.nome)}</option>`).join('');
const num = (v) => (String(v).trim() ? Number(String(v).replace(',', '.')) : null);

// foto: reduz no próprio navegador (480 px, JPEG) para caber no armazenamento da demonstração
function lerFoto(arquivo) {
  return new Promise((ok, erro) => {
    if (!arquivo || !arquivo.type.startsWith('image/')) return erro(new Error('Escolha uma imagem.'));
    const img = new Image(), url = URL.createObjectURL(arquivo);
    img.onload = () => { const s = Math.min(img.width, img.height), c = document.createElement('canvas'); const t = CONTA ? 320 : 480; c.width = c.height = t; c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, t, t); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', CONTA ? .72 : .8)); };
    img.onerror = () => erro(new Error('Não consegui abrir essa imagem.')); img.src = url;
  });
}
const campoFoto = (p) => `<div class="campo-foto largo"><div class="previa-foto">${avatar(p || {}, 'grande')}</div><div><label class="bt">${IC.camera} ${p?.foto ? 'Trocar foto' : 'Colocar foto'}<input type="file" name="foto" accept="image/*" capture="environment" hidden></label><small>Tire na hora pelo celular ou escolha da galeria.</small></div></div>`;
function ligarFoto(f, guardar) {
  f.foto.onchange = async () => { try { const d = await lerFoto(f.foto.files[0]); guardar(d); f.querySelector('.previa-foto').innerHTML = `<div class="avatar grande"><img src="${d}" alt=""></div>`; } catch (e) { avisar(e.message); } };
}

function abrirFoto(id) {
  const p = pet(id); let nova = null;
  const f = janela(`Foto de ${esc(p.nome)}`, campoFoto(p), `${p.foto ? '<button type="button" class="bt bt-perigo" data-tirar-foto>Tirar foto</button>' : ''}<button class="bt bt-pri">Salvar</button>`);
  ligarFoto(f, (d) => { nova = d; });
  f.querySelector('[data-tirar-foto]')?.addEventListener('click', () => { p.foto = ''; salvar(); fecharJanela(); desenhar(); });
  f.onsubmit = (e) => { e.preventDefault(); if (!nova) return avisar('Escolha uma foto primeiro.'); p.foto = nova; salvar(); fecharJanela(); avisar('Foto salva.'); desenhar(); };
}
function abrirProntuario(id) {
  const p = pet(id);
  const f = janela(`Consulta de ${esc(p.nome)}`, `<div class="grade-campos"><label class="campo largo">Queixa do tutor<textarea name="queixa" placeholder="O que o tutor contou"></textarea></label>
    <label class="campo">Peso (kg)<input name="peso" inputmode="decimal" value="${pesoAtual(p) ?? ''}"></label><label class="campo">Temperatura (°C)<input name="temp" inputmode="decimal" placeholder="38,5"></label>
    <label class="campo">Freq. cardíaca (bpm)<input name="fc" inputmode="numeric"></label><label class="campo">Freq. respiratória (mpm)<input name="fr" inputmode="numeric"></label>
    <label class="campo largo">Diagnóstico<input name="diag"></label><label class="campo largo">Prescrição e orientações<textarea name="presc" placeholder="Remédio, dose, horário e por quantos dias"></textarea></label>
    <label class="campo">Veterinário<input name="vet" list="lista-vets" value="${esc(db.vets.find((v) => v.startsWith('Dr')) || '')}"><datalist id="lista-vets">${db.vets.map((x) => `<option value="${esc(x)}">`).join('')}</datalist></label><label class="campo">Retorno em quantos dias<input name="retorno" type="number" min="1" max="365" inputmode="numeric" list="lista-retorno" placeholder="Em branco = sem retorno"><datalist id="lista-retorno"><option value="7"><option value="10"><option value="15"><option value="30"></datalist></label></div>`, '<button class="bt bt-pri">Salvar consulta</button>');
  f.onsubmit = (e) => {
    e.preventDefault(); if (!f.queixa.value.trim() || !f.diag.value.trim()) return avisar('Preencha a queixa e o diagnóstico.'); if (!f.vet.value.trim()) return avisar('Escreva quem atendeu.');
    const peso = num(f.peso.value);
    db.prontuarios.push({ id: uid(), pet: id, data: hoje(), vet: f.vet.value, queixa: f.queixa.value.trim(), exame: { peso, temp: num(f.temp.value), fc: num(f.fc.value), fr: num(f.fr.value) }, diagnostico: f.diag.value.trim(), prescricao: f.presc.value.trim() });
    if (peso && peso !== pesoAtual(p)) p.pesos.push({ data: hoje(), kg: peso });
    const a = db.agenda.find((x) => x.pet === id && x.data === hoje() && x.status !== 'pronto'); if (a) a.status = 'pronto';
    if (f.retorno.value) db.agenda.push({ id: uid(), data: maisDias(hoje(), Number(f.retorno.value)), hora: a?.hora || '10:00', pet: id, tipo: 'Retorno', vet: f.vet.value, status: 'aguardando', valor: 0 });
    salvar(); fecharJanela(); est.aba = 'prontuario'; avisar(`Consulta de ${p.nome} registrada${f.retorno.value ? ` e retorno marcado para ${dataBR(maisDias(hoje(), Number(f.retorno.value)))}` : ''}.`); desenhar();
  };
}
function abrirPesar(id) {
  const p = pet(id);
  const f = janela(`Pesagem de ${esc(p.nome)}`, `<label class="campo">Peso (kg)<input name="peso" inputmode="decimal" value="${pesoAtual(p) ?? ''}"></label>`, '<button class="bt bt-pri">Salvar</button>');
  f.onsubmit = (e) => { e.preventDefault(); const kg = num(f.peso.value); if (!(kg > 0)) return avisar('Peso inválido.'); p.pesos.push({ data: hoje(), kg }); salvar(); fecharJanela(); desenhar(); };
}
function imprimir(titulo, corpo) {
  const w = window.open('', '_blank'); if (!w) return avisar('Libere as janelas do navegador para imprimir.');
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>body{font:15px/1.6 Georgia,serif;color:#1d2b27;max-width:720px;margin:36px auto;padding:0 24px}h1{font-size:22px;margin:0;color:#214e45}h2{font-size:16px;margin:22px 0 6px;color:#214e45}small{color:#555}.cab{display:flex;justify-content:space-between;border-bottom:2px solid #214e45;padding-bottom:12px;margin-bottom:18px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd;font-size:14px}.assin{margin-top:70px;display:flex;gap:40px}.assin div{flex:1;border-top:1px solid #333;text-align:center;padding-top:6px;font-size:13px}</style></head><body>
    <div class="cab"><div><h1>${esc(db.clinica)}</h1><small>${esc(titulo)} · ${esc(db.config.endereco)} · ${esc(db.config.cidade)} · ${esc(telBR(db.config.telefone))}</small></div><small>${dataBR(hoje())}</small></div>${corpo}<script>print()<\/script></body></html>`);
  w.document.close();
}
const cabPet = (p) => { const t = tutorDe(p); return `<p><b>Paciente:</b> ${esc(p.nome)} · ${({ cao: 'canino', gato: 'felino' })[p.especie] || 'outro'} · ${esc(p.raca)} · ${esc(p.sexo.toLowerCase())} · ${idade(p.nasc)} · ${pesoAtual(p) ?? '—'} kg${p.microchip ? ` · microchip ${esc(p.microchip)}` : ''}<br><b>Tutor:</b> ${esc(t?.nome)} · ${esc(telBR(t?.tel))}${t?.end ? ` · ${esc(t.end)}` : ''}</p>`; };
function imprimirReceita(idPr) {
  const x = db.prontuarios.find((r) => r.id === idPr), p = pet(x.pet);
  imprimir(`Receita · ${p.nome}`, `${cabPet(p)}<h2>Diagnóstico</h2><p>${esc(x.diagnostico)}</p><h2>Prescrição</h2><p style="white-space:pre-wrap">${esc(x.prescricao)}</p><div class="assin"><div>${esc(x.vet)}<br>Médico(a)-veterinário(a) · ${esc(db.config.crmv)}</div></div>`);
}
function imprimirCarteira(id) {
  const p = pet(id), l = db.vacinas.filter((v) => v.pet === id).sort((a, b) => a.data.localeCompare(b.data));
  imprimir(`Carteira de vacinação · ${p.nome}`, `${cabPet(p)}<h2>Vacinas e vermífugos</h2><table><tr><th>Vacina</th><th>Aplicada em</th><th>Lote</th><th>Próxima dose</th></tr>${l.map((v) => `<tr><td>${esc(v.nome)}</td><td>${dataBR(v.data)}</td><td>${esc(v.lote)}</td><td>${dataBR(v.proxima)}</td></tr>`).join('')}</table><div class="assin"><div>Médico(a)-veterinário(a) responsável · ${esc(db.config.crmv)}</div></div>`);
}
const TERMOS = {
  cirurgia: ['Termo de consentimento para cirurgia', 'Autorizo a equipe a realizar o procedimento cirúrgico indicado no meu animal. Fui informado(a) sobre o diagnóstico, o procedimento, os riscos (inclusive anestésicos, que podem levar a complicações e, em casos raros, ao óbito), os cuidados pós-operatórios e os custos estimados. Declaro que o animal está em jejum conforme orientado e que informei todas as doenças e medicamentos de que tenho conhecimento.'],
  anestesia: ['Termo de anestesia e sedação', 'Autorizo a sedação ou anestesia do meu animal para o procedimento indicado. Fui informado(a) de que todo procedimento anestésico tem riscos, que foram explicados pela equipe, e de que exames prévios podem ser recomendados para reduzi-los.'],
  internacao: ['Termo de internação', 'Autorizo a internação do meu animal para tratamento, com medicações e procedimentos indicados pela equipe. Estou ciente do valor da diária, dos horários de visita e de que serei avisado(a) sobre a evolução do quadro e antes de qualquer procedimento não previsto.'],
};
function imprimirTermo(id, tipo) {
  const p = pet(id), t = tutorDe(p), [tit, texto] = TERMOS[tipo];
  imprimir(`${tit} · ${p.nome}`, `${cabPet(p)}<h2>${tit}</h2><p>${texto}</p><p>Procedimento: ____________________________________________ Valor estimado: R$ ____________</p><div class="assin"><div>${esc(t?.nome)}<br>Tutor(a) · CPF ______________</div><div>Médico(a)-veterinário(a) · ${esc(db.config.crmv)}</div></div>`);
}
function imprimirAtestado(id) {
  const p = pet(id), vac = db.vacinas.filter((v) => v.pet === id && v.data >= maisDias(hoje(), -365));
  imprimir(`Atestado de saúde · ${p.nome}`, `${cabPet(p)}<h2>Atestado de saúde</h2><p>Atesto, para os devidos fins, que examinei o animal acima nesta data e que ele se encontra clinicamente saudável, sem sinais de doença infectocontagiosa ou parasitária, apto a viajar e a conviver com outros animais.</p><p>Vacinas aplicadas nos últimos 12 meses: ${vac.map((v) => `${esc(v.nome)} (${dataBR(v.data)})`).join(', ') || 'nenhuma registrada'}.</p><div class="assin"><div>Médico(a)-veterinário(a) · ${esc(db.config.crmv)}</div></div>`);
}
function abrirAplicarVacina(id) {
  const vacinasEst = db.estoque.filter((x) => x.tipo === 'Vacina' || /vermífugo/i.test(x.nome));
  const f = janela(`Vacina aplicada em ${esc(pet(id).nome)}`, `<div class="grade-campos"><label class="campo largo">Vacina<select name="item">${vacinasEst.map((x) => `<option value="${x.id}">${esc(x.nome)} · lote ${esc(x.lote)} · ${x.qtd} em estoque</option>`).join('')}</select></label>
    <label class="campo">Próxima dose (em branco = não repete)<input name="prox" type="date" value="${maisDias(hoje(), 365)}"></label><label class="campo">Cobrar<select name="cobrar"><option value="1">Sim, lançar no caixa</option><option value="">Não</option></select></label></div>
    <p style="margin:0;color:var(--texto-2);font-size:13px">Sai 1 unidade do estoque e a próxima dose entra nos lembretes.</p>`, '<button class="bt bt-pri">Registrar</button>');
  f.onsubmit = (e) => {
    e.preventDefault(); const it = db.estoque.find((x) => x.id === f.item.value); if (!it) return;
    if (it.qtd < 1) return avisar('Essa vacina acabou no estoque. Dê entrada antes.');
    it.qtd -= 1;
    const nome = it.nome.replace(/^Vacina /, ''), chave = nome.split(' ')[0].toLowerCase();
    db.vacinas.filter((v) => v.pet === id && v.proxima && v.nome.toLowerCase().startsWith(chave)).forEach((v) => { v.proxima = null; }); // a dose pendente sai dos lembretes
    db.vacinas.push({ id: uid(), pet: id, nome, data: hoje(), proxima: f.prox.value || null, lote: it.lote });
    if (f.cobrar.value) db.vendas.push({ id: uid(), data: hoje(), hora: horaAgora(), pet: id, itens: [{ nome: it.nome, valor: it.preco, qtd: 1 }, { nome: 'Aplicação de vacina', valor: 25, qtd: 1 }], forma: 'PIX', recebido: true });
    salvar(); fecharJanela(); avisar(`Vacina registrada${f.cobrar.value ? ' e lançada no caixa' : ''}.`); desenhar();
  };
}
function abrirAgendar(petSel, tipo = 'Consulta') {
  const f = janela('Agendar', `<div class="grade-campos"><label class="campo largo">Pet${campoPet(petSel)}</label>
    <label class="campo">Tipo<input name="tipo" list="lista-tipos" value="${esc(tipo)}"><datalist id="lista-tipos">${Object.keys(TIPOS).map((x) => `<option value="${esc(x)}">`).join('')}</datalist></label><label class="campo">Data<input name="data" type="date" value="${est.secao === 'agenda' ? est.dia : hoje()}"></label>
    <label class="campo">Horário<input name="hora" type="time" value="17:00" step="900"></label><label class="campo">Com<input name="vet" list="lista-vets" value="${esc(db.vets[0] || '')}"><datalist id="lista-vets">${db.vets.map((x) => `<option value="${esc(x)}">`).join('')}</datalist></label></div>`, '<button class="bt bt-pri">Agendar</button>');
  f.onsubmit = (e) => {
    e.preventDefault(); if (!f.tipo.value.trim() || !f.vet.value.trim() || !f.data.value || !f.hora.value) return avisar('Preencha o tipo, a data, o horário e com quem.');
    if (db.agenda.some((a) => a.data === f.data.value && a.hora === f.hora.value && a.vet === f.vet.value)) return avisar(`${f.vet.value} já tem atendimento às ${f.hora.value} nesse dia.`);
    db.agenda.push({ id: uid(), data: f.data.value, hora: f.hora.value, pet: f.pet.value, tipo: f.tipo.value.trim(), vet: f.vet.value.trim(), status: 'aguardando', valor: TIPOS[f.tipo.value.trim()] ?? 0 });
    const p = pet(f.pet.value), t = tutorDe(p);
    salvar(); fecharJanela(); desenhar();
    avisar(`Agendado: ${p.nome} · ${dataBR(f.data.value)} às ${f.hora.value}.`);
    simularZap(zap(t?.tel, `Olá, ${primeiro(t?.nome)}! Confirmando: ${f.tipo.value} do(a) ${p.nome} na ${db.clinica} em ${dataBR(f.data.value)} (${diaSemana(f.data.value, 'long')}) às ${f.hora.value}. Até lá!`));
  };
}
function abrirPet(id) {
  const p = id ? pet(id) : null; let foto = p?.foto || '';
  const f = janela(p ? `Editar ${esc(p.nome)}` : 'Novo pet', `<div class="grade-campos">${campoFoto(p)}<label class="campo">Nome do pet<input name="nome" value="${esc(p?.nome || '')}"></label><label class="campo">Espécie<select name="especie">${[['cao', 'Cão'], ['gato', 'Gato'], ['outro', 'Outro']].map(([v, n]) => `<option value="${v}" ${p?.especie === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="campo">Raça<input name="raca" value="${esc(p?.raca || '')}" placeholder="SRD"></label><label class="campo">Sexo<select name="sexo">${['Macho', 'Fêmea'].map((s) => `<option ${p?.sexo === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
    <label class="campo">Nascimento (aprox.)<input name="nasc" type="date" value="${p?.nasc || maisDias(hoje(), -365)}"></label><label class="campo">Pelagem<input name="pelagem" value="${esc(p?.pelagem || '')}"></label>
    <label class="campo">Microchip<input name="microchip" value="${esc(p?.microchip || '')}"></label><label class="campo">Castrado<select name="castrado"><option value="">Não</option><option value="1" ${p?.castrado ? 'selected' : ''}>Sim</option></select></label>
    ${p ? '' : `<label class="campo">Peso (kg)<input name="peso" inputmode="decimal"></label><label class="campo largo">Tutor<select name="tutor"><option value="">Tutor novo (preencha abaixo)</option>${db.tutores.map((t) => `<option value="${t.id}">${esc(t.nome)}</option>`).join('')}</select></label>
    <label class="campo">Nome do tutor novo<input name="tnome"></label><label class="campo">WhatsApp do tutor<input name="ttel" inputmode="tel" placeholder="(00) 90000-0000"></label>`}
    <label class="campo largo">Alergias<input name="alergias" value="${esc(p?.alergias || '')}" placeholder="Deixe em branco se não tiver"></label><label class="campo largo">Observações<textarea name="obs" placeholder="Temperamento, cuidados no manejo...">${esc(p?.obs || '')}</textarea></label></div>`, `<button class="bt bt-pri">${p ? 'Salvar' : 'Cadastrar'}</button>`);
  ligarFoto(f, (d) => { foto = d; });
  f.onsubmit = (e) => {
    e.preventDefault(); if (!f.nome.value.trim()) return avisar('Falta o nome do pet.');
    const dados = { nome: f.nome.value.trim(), especie: f.especie.value, raca: f.raca.value.trim() || 'SRD', sexo: f.sexo.value, nasc: f.nasc.value, pelagem: f.pelagem.value.trim(), microchip: f.microchip.value.trim(), castrado: !!f.castrado.value, alergias: f.alergias.value.trim(), obs: f.obs.value.trim(), foto };
    if (p) { Object.assign(p, dados); salvar(); fecharJanela(); avisar('Dados salvos.'); return desenhar(); }
    let tutor = f.tutor.value;
    if (!tutor) { if (!f.tnome.value.trim()) return avisar('Escolha o tutor ou preencha o nome do tutor novo.'); tutor = uid(); db.tutores.push({ id: tutor, nome: f.tnome.value.trim(), tel: soDigitos(f.ttel.value), end: '' }); }
    const id = uid(), kg = num(f.peso.value);
    db.pets.push({ id, tutor, ...dados, pesos: kg ? [{ data: hoje(), kg }] : [] });
    salvar(); fecharJanela(); est.secao = 'pacientes'; est.sel = id; est.aba = 'resumo'; avisar(`${dados.nome} cadastrado(a).`); desenhar();
  };
}
function abrirCobrar(petSel, itensIniciais = []) {
  const itens = [...itensIniciais];
  const f = janela('Cobrança', `<div class="grade-campos"><label class="campo largo">Pet${campoPet(petSel, 'Em branco = venda de balcão, sem pet')}</label>
    <label class="campo">Serviço<select name="serv"><option value="">Escolher…</option>${servicos().map(([n, v], i) => `<option value="${i}">${esc(n)} · ${reais(v)}</option>`).join('')}</select></label>
    <label class="campo">Produto do estoque<select name="prod"><option value="">Escolher…</option>${db.estoque.filter((x) => x.qtd > 0).map((x) => `<option value="${x.id}">${esc(x.nome)} · ${reais(x.preco)}</option>`).join('')}</select></label>
    <div class="largo avulso"><label class="campo">Outro item (escreva)<input name="av_nome" placeholder="Ex.: Curativo"></label><label class="campo">Valor (R$)<input name="av_valor" inputmode="decimal" placeholder="0,00"></label><button type="button" class="bt" data-avulso>Pôr na conta</button></div>
    <div class="largo" data-itens></div>
    <label class="campo">Desconto (R$)<input name="desc" inputmode="decimal" value="0"></label><label class="campo">Forma de pagamento<select name="forma">${FORMAS.map((x) => `<option>${x}</option>`).join('')}</select></label>
    <label class="campo largo">Quem atendeu (para a comissão)<input name="vet" list="lista-vets" placeholder="Em branco = ninguém" value="${esc(profissionalPadrao(petSel, itensIniciais) || '')}"><datalist id="lista-vets">${db.vets.map((x) => `<option value="${esc(x)}">`).join('')}</datalist></label></div>`, '<button class="bt bt-pri">Receber</button>');
  const lista = f.querySelector('[data-itens]');
  const soma = () => itens.reduce((s, i) => s + i.valor * i.qtd, 0) - (num(f.desc.value) || 0);
  const desenhaItens = () => { lista.innerHTML = itens.length ? `<table class="tabela">${itens.map((i, k) => `<tr><td>${esc(i.nome)}</td><td class="num">${reais(i.valor)}</td><td class="num"><button type="button" class="bt bt-peq bt-perigo" data-tirar="${k}">Tirar</button></td></tr>`).join('')}<tr><td><b>Total</b></td><td class="num"><b>${reais(soma())}</b></td><td></td></tr></table>` : '<p class="vazio" style="padding:8px">Escolha os serviços e produtos acima.</p>'; const pl = contratosDo(f.pet.value).find((x) => x.tipo === 'plano'); if (pl && itens.length) lista.insertAdjacentHTML('beforeend', `<p class="nota">${esc(pet(f.pet.value).nome)} tem o ${esc(pl.nome)}: ${pl.desconto}% de desconto. <button type="button" class="bt bt-peq" data-desc-plano="${pl.desconto}">Aplicar ${reais(itens.reduce((s, i) => s + i.valor * i.qtd, 0) * pl.desconto / 100)} de desconto</button></p>`); };
  f.pet.onchange = desenhaItens;
  f.serv.onchange = () => { if (f.serv.value === '') return; const [n, v] = servicos()[Number(f.serv.value)]; itens.push({ nome: n, valor: v, qtd: 1 }); f.serv.value = ''; desenhaItens(); };
  f.prod.onchange = () => { const x = db.estoque.find((y) => y.id === f.prod.value); if (!x) return; itens.push({ nome: x.nome, valor: x.preco, qtd: 1, item: x.id }); f.prod.value = ''; desenhaItens(); };
  f.desc.oninput = desenhaItens;
  f.querySelector('[data-avulso]').onclick = () => { const n = f.av_nome.value.trim(), v = num(f.av_valor.value); if (!n || !(v > 0)) return avisar('Escreva o item e o valor.'); itens.push({ nome: n, valor: v, qtd: 1 }); f.av_nome.value = ''; f.av_valor.value = ''; desenhaItens(); };
  lista.onclick = (e) => { const b = e.target.closest('[data-tirar]'); if (b) { itens.splice(Number(b.dataset.tirar), 1); desenhaItens(); } const dp = e.target.closest('[data-desc-plano]'); if (dp) { f.desc.value = (itens.reduce((s, i) => s + i.valor * i.qtd, 0) * Number(dp.dataset.descPlano) / 100).toFixed(2).replace('.', ','); desenhaItens(); } };
  const a = !itensIniciais.length && petSel && db.agenda.find((x) => x.pet === petSel && x.data === hoje()); // o atendimento de hoje já entra na conta
  if (a && a.valor) itens.push({ nome: a.tipo === 'Consulta' ? 'Consulta clínica' : a.tipo, valor: a.valor, qtd: 1 });
  desenhaItens();
  f.onsubmit = (e) => {
    e.preventDefault(); if (!itens.length) return avisar('Escolha pelo menos um serviço ou produto.');
    const fiado = f.forma.value.startsWith('Fiado'); if (fiado && !f.pet.value) return avisar('Fiado precisa de um pet (para saber quem deve).');
    for (const i of itens) if (i.item) { const x = db.estoque.find((y) => y.id === i.item); if (x) x.qtd = Math.max(0, x.qtd - 1); }
    const desc = num(f.desc.value) || 0, lin = itens.map(({ nome, valor, qtd }) => ({ nome, valor, qtd })); if (desc > 0) lin.push({ nome: 'Desconto', valor: -desc, qtd: 1 });
    db.vendas.push({ id: uid(), data: hoje(), hora: horaAgora(), pet: f.pet.value || null, itens: lin, forma: f.forma.value, recebido: !fiado, vet: f.vet.value.trim() });
    salvar(); fecharJanela(); avisar(fiado ? `Anotado no fiado: ${reais(soma())}.` : `Recebido: ${reais(soma())} no ${f.forma.value}.`); desenhar();
  };
}
function abrirInternar(id) {
  if (!id) { const f0 = janela('Internar', `<label class="campo">Pet${campoPet(est.sel)}</label>`, '<button class="bt bt-pri">Continuar</button>'); f0.onsubmit = (e) => { e.preventDefault(); abrirInternar(f0.pet.value); }; return; }
  const livres = ['Baia 1', 'Baia 2', 'Baia 3', 'Baia 4', 'Baia 5'].filter((b) => !db.internados.some((i) => i.baia === b));

  const f = janela(`Internar ${esc(pet(id).nome)}`, `<div class="grade-campos"><label class="campo">Baia<input name="baia" list="lista-baias" value="${esc(livres[0] || '')}" placeholder="Ex.: Baia 6"><datalist id="lista-baias">${livres.map((x) => `<option value="${esc(x)}">`).join('')}</datalist></label>
    <label class="campo">Primeira medicação às<input name="hora" type="time" value="${horaAgora()}"></label><label class="campo largo">Motivo<input name="motivo"></label><label class="campo largo">Medicação<input name="remedio" placeholder="Ex.: Soro fisiológico 500 ml IV"></label></div>`, '<button class="bt bt-pri">Internar</button>');
  f.onsubmit = (e) => {
    e.preventDefault(); if (!f.motivo.value.trim() || !f.baia.value.trim()) return avisar('Informe a baia e o motivo.'); if (db.internados.some((i) => sem(i.baia) === sem(f.baia.value))) return avisar(`A ${f.baia.value.trim()} já está ocupada.`);
    db.internados.push({ id: uid(), pet: id, baia: f.baia.value.trim(), motivo: f.motivo.value.trim(), entrada: hoje(), doses: f.remedio.value.trim() ? [{ hora: f.hora.value, remedio: f.remedio.value.trim(), feita: false }] : [] });
    salvar(); fecharJanela(); est.secao = 'internacao'; avisar(`${pet(id).nome} internado(a) na ${f.baia.value.trim()}.`); desenhar();
  };
}
function abrirNovaDose(idInt) {
  const f = janela('Nova dose', '<div class="grade-campos"><label class="campo">Horário<input name="hora" type="time"></label><label class="campo">Medicação<input name="remedio"></label></div>', '<button class="bt bt-pri">Adicionar</button>');
  f.onsubmit = (e) => { e.preventDefault(); if (!f.hora.value || !f.remedio.value.trim()) return avisar('Preencha horário e medicação.'); const i = db.internados.find((x) => x.id === idInt); i.doses.push({ hora: f.hora.value, remedio: f.remedio.value.trim(), feita: false }); i.doses.sort((a, b) => a.hora.localeCompare(b.hora)); salvar(); fecharJanela(); desenhar(); };
}
function abrirBanho(petSel) {
  const f = janela('Banho e tosa', `<div class="grade-campos"><label class="campo largo">Pet${campoPet(petSel)}</label><label class="campo">Serviço<input name="serv" list="lista-banho" value="Banho"><datalist id="lista-banho"><option value="Banho"><option value="Banho e tosa"><option value="Tosa higiênica"><option value="Hidratação"></datalist></label><label class="campo">Chegou às<input name="hora" type="time" value="${horaAgora()}"></label><label class="campo largo">Observações<input name="obs" placeholder="Tipo de tosa, shampoo, laço..."></label></div>`, '<button class="bt bt-pri">Dar entrada</button>');
  f.onsubmit = (e) => { e.preventDefault(); if (!f.serv.value.trim()) return avisar('Escreva o serviço.'); db.estetica.push({ id: uid(), data: hoje(), hora: f.hora.value || horaAgora(), pet: f.pet.value, servico: f.serv.value.trim(), status: 'aguardando', obs: f.obs.value.trim() }); salvar(); fecharJanela(); est.secao = 'estetica'; desenhar(); };
}
function abrirPedirExame(petSel) {
  const f = janela('Pedir exame', `<div class="grade-campos"><label class="campo largo">Pet${campoPet(petSel)}</label><label class="campo largo">Exame<input name="nome" list="lista-exames" placeholder="Escolha ou escreva o exame"><datalist id="lista-exames">${EXAMES.map((x) => `<option value="${x}">`).join('')}</datalist></label><label class="campo largo">Laboratório<input name="lab" value="Laboratório VetLab"></label></div>`, '<button class="bt bt-pri">Pedir</button>');
  f.onsubmit = (e) => { e.preventDefault(); if (!f.nome.value.trim()) return avisar('Escreva o nome do exame.'); db.exames.push({ id: uid(), pet: f.pet.value, nome: f.nome.value.trim(), data: hoje(), status: 'solicitado', resultado: '', lab: f.lab.value.trim() || 'Laboratório' }); salvar(); fecharJanela(); avisar('Exame pedido.'); desenhar(); };
}
function abrirResultado(idEx) {
  const x = db.exames.find((e) => e.id === idEx);
  const f = janela(`Resultado · ${esc(x.nome)}`, '<div class="grade-campos"><label class="campo largo">Laudo<textarea name="res" placeholder="Valores e conclusão do laboratório"></textarea></label><label class="campo largo">Arquivo do laboratório (opcional)<input type="file" name="arq" accept="image/*,application/pdf"></label></div><p class="nota">Pode ser o PDF que o laboratório mandou ou uma foto do laudo. Se anexar o arquivo, o texto pode ser só a conclusão.</p>', '<button class="bt bt-pri">Salvar resultado</button>');
  f.onsubmit = async (e) => {
    e.preventDefault(); const arq = f.arq.files[0]; if (!f.res.value.trim() && !arq) return avisar('Escreva o resultado ou anexe o arquivo do laboratório.');
    if (arq) { try { x.anexos.push(await lerAnexo(arq)); } catch (er) { return avisar(er.message); } }
    x.resultado = f.res.value.trim(); x.status = 'pronto'; salvar(); fecharJanela(); avisar('Resultado salvo. Avise o tutor pelo WhatsApp.'); desenhar();
  };
}
function abrirEntrada(idItem) {
  const x = db.estoque.find((y) => y.id === idItem);
  const f = janela(`Entrada · ${esc(x.nome)}`, `<div class="grade-campos"><label class="campo">Quantidade<input name="qtd" type="number" min="1" value="10"></label><label class="campo">Custo unitário (R$)<input name="custo" inputmode="decimal" value="${x.custo ?? ''}"></label><label class="campo">Lote<input name="lote" value="${esc(x.lote)}"></label><label class="campo">Validade<input name="val" type="date" value="${x.validade}"></label></div>`, '<button class="bt bt-pri">Dar entrada</button>');
  f.onsubmit = (e) => { e.preventDefault(); const q = Math.round(Number(f.qtd.value)); if (!(q > 0)) return avisar('Quantidade inválida.'); x.qtd += q; x.custo = num(f.custo.value) ?? x.custo; x.lote = f.lote.value.trim() || x.lote; x.validade = f.val.value || x.validade; salvar(); fecharJanela(); avisar(`+${q} ${x.nome}.`); desenhar(); };
}
function abrirNovoItem() {
  const f = janela('Novo item no estoque', `<div class="grade-campos"><label class="campo largo">Nome<input name="nome"></label><label class="campo">Tipo<input name="tipo" list="lista-tipo-item" value="Medicamento"><datalist id="lista-tipo-item"><option value="Vacina"><option value="Medicamento"><option value="Insumo"><option value="Produto"></datalist></label>
    <label class="campo">Quantidade<input name="qtd" type="number" min="0" value="0"></label><label class="campo">Mínimo<input name="min" type="number" min="0" value="5"></label><label class="campo">Custo (R$)<input name="custo" inputmode="decimal" value="0"></label><label class="campo">Preço de venda (R$)<input name="preco" inputmode="decimal" value="0"></label>
    <label class="campo">Lote<input name="lote"></label><label class="campo">Validade<input name="val" type="date" value="${maisDias(hoje(), 365)}"></label></div>`, '<button class="bt bt-pri">Salvar</button>');
  f.onsubmit = (e) => { e.preventDefault(); if (!f.nome.value.trim()) return avisar('Falta o nome.'); db.estoque.push({ id: uid(), nome: f.nome.value.trim(), tipo: f.tipo.value.trim() || 'Produto', qtd: Number(f.qtd.value) || 0, minimo: Number(f.min.value) || 0, lote: f.lote.value.trim() || '—', validade: f.val.value, preco: num(f.preco.value) || 0, custo: num(f.custo.value) || 0 }); salvar(); fecharJanela(); desenhar(); };
}


function abrirTutor(id) {
  const t = id ? db.tutores.find((x) => x.id === id) : null;
  const f = janela(t ? `Editar ${esc(t.nome)}` : 'Novo tutor', `<div class="grade-campos"><label class="campo largo">Nome completo<input name="nome" value="${esc(t?.nome || '')}"></label><label class="campo">WhatsApp<input name="tel" inputmode="tel" value="${esc(telBR(t?.tel || ''))}" placeholder="(00) 90000-0000"></label><label class="campo">CPF<input name="cpf" value="${esc(t?.cpf || '')}"></label><label class="campo largo">Endereço<input name="end" value="${esc(t?.end || '')}"></label><label class="campo largo">E-mail<input name="email" type="email" value="${esc(t?.email || '')}"></label></div>`, `<button class="bt bt-pri">${t ? 'Salvar' : 'Cadastrar'}</button>`);
  f.onsubmit = (e) => {
    e.preventDefault(); if (!f.nome.value.trim()) return avisar('Falta o nome do tutor.');
    const dados = { nome: f.nome.value.trim(), tel: soDigitos(f.tel.value), cpf: f.cpf.value.trim(), end: f.end.value.trim(), email: f.email.value.trim() };
    if (t) Object.assign(t, dados); else { const nid = uid(); db.tutores.push({ id: nid, ...dados }); est.tutor = nid; }
    salvar(); fecharJanela(); avisar(t ? 'Tutor atualizado.' : 'Tutor cadastrado. Agora é só cadastrar o pet dele em Pacientes.'); desenhar();
  };
}
function abrirVacinaManual(petSel) {
  const f = janela('Registrar vacina', `<div class="grade-campos"><label class="campo largo">Pet${campoPet(petSel)}</label><label class="campo largo">Vacina ou vermífugo<input name="nome" list="lista-vacinas" placeholder="Ex.: V10, Antirrábica, V5 felina"><datalist id="lista-vacinas">${['V10 (polivalente)', 'V8 (polivalente)', 'Antirrábica', 'Gripe canina', 'Giardíase', 'Leishmaniose', 'V3 felina', 'V4 felina', 'V5 felina', 'Vermífugo'].map((x) => `<option value="${x}">`).join('')}</datalist></label>
    <label class="campo">Aplicada em<input name="data" type="date" value="${hoje()}"></label><label class="campo">Próxima dose<input name="prox" type="date" value="${maisDias(hoje(), 365)}"></label><label class="campo">Lote<input name="lote"></label><label class="campo">Onde foi aplicada<select name="onde"><option value="aqui">Aqui na clínica (sem baixar estoque)</option><option value="fora">Em outra clínica</option></select></label></div>
    <p class="nota">Use para vacinas antigas da carteirinha ou aplicadas em outro lugar. Para aplicar agora e baixar do estoque, use "Registrar vacina aplicada" na ficha do pet.</p>`, '<button class="bt bt-pri">Registrar</button>');
  f.onsubmit = (e) => { e.preventDefault(); if (!f.nome.value.trim()) return avisar('Escreva o nome da vacina.'); db.vacinas.push({ id: uid(), pet: f.pet.value, nome: f.nome.value.trim() + (f.onde.value === 'fora' ? ' (outra clínica)' : ''), data: f.data.value, proxima: f.prox.value || null, lote: f.lote.value.trim() || '—' }); salvar(); fecharJanela(); avisar('Vacina registrada.'); desenhar(); };
}


// ---------------------------------------------------------------- AVISOS AUTOMÁTICOS
const TIPO_AVISO = { vacina: 'Vacina', consulta: 'Lembrete de horário', aniversario: 'Aniversário', exame: 'Resultado de exame' };
const preencher = (m, x) => m.replace(/\{(\w+)\}/g, (_, k) => x[k] ?? '');
function filaAvisos() {
  const c = db.config.avisos, h = hoje(), l = [], feito = new Set(db.avisosEnviados.map((x) => x.chave));
  const add = (tipo, chave, p, dados) => { const t = tutorDe(p); if (!p || !t?.tel || feito.has(chave)) return; l.push({ tipo, chave, pet: p.id, tel: t.tel, texto: preencher(c.modelos[tipo] || MODELOS_AVISO[tipo], { tutor: primeiro(t.nome), pet: p.nome, clinica: db.clinica, ...dados }) }); };
  if (c.vacina) db.vacinas.filter((v) => v.proxima && diasAte(v.proxima) <= c.vacina && diasAte(v.proxima) >= -30).forEach((v) => add('vacina', `vacina:${v.id}:${v.proxima}`, pet(v.pet), { vacina: v.nome, data: dataBR(v.proxima), situacao: diasAte(v.proxima) < 0 ? `venceu em ${dataBR(v.proxima)}` : `vence em ${dataBR(v.proxima)}` }));
  if (c.consulta) { const d = maisDias(h, c.consulta); db.agenda.filter((a) => a.data === d && a.status === 'aguardando').sort((a, b) => a.hora.localeCompare(b.hora)).forEach((a) => add('consulta', `consulta:${a.id}:${a.data}${a.hora}`, pet(a.pet), { tipo: a.tipo, data: dataBR(a.data), dia: diaSemana(a.data, 'long'), hora: a.hora })); }
  if (c.aniversario) aniversariantes().filter((x) => x.dias === 0).forEach(({ p }) => add('aniversario', `aniv:${p.id}:${h.slice(0, 4)}`, p, {}));
  if (c.exame) db.exames.filter((e) => e.status === 'pronto' && !e.avisado).forEach((e) => add('exame', `exame:${e.id}`, pet(e.pet), { exame: e.nome }));
  return l;
}
function registrarAviso(x, auto) {
  db.avisosEnviados.push({ id: uid(), chave: x.chave, tipo: x.tipo, pet: x.pet, data: hoje(), hora: horaAgora(), auto });
  if (x.tipo === 'exame') { const e = db.exames.find((y) => `exame:${y.id}` === x.chave); if (e) e.avisado = true; }
}
function telaAvisos() {
  const c = db.config.avisos, fila = filaAvisos(), env = db.avisosEnviados.slice(-40).reverse();
  return `<div class="cab"><div><h1>Avisos automáticos</h1><p>${c.ligado ? (CONTA ? `Ligado · a fila do dia fica pronta às ${c.hora}` : `Ligado · os avisos do dia saem às ${c.hora} pelo WhatsApp da clínica`) : 'Desligado · nenhum aviso sai sozinho'}</p></div><div class="acoes"><button class="bt" data-ligar-avisos>${c.ligado ? 'Desligar' : 'Ligar'}</button>${fila.length && c.ligado && !CONTA ? `<button class="bt bt-pri" data-simular-envio>Simular o envio de hoje (${fila.length})</button>` : ''}</div></div>
    <p class="nota aviso-demo">${CONTA ? 'Todo dia a fila se monta sozinha: toque em Enviar e a mensagem abre pronta no WhatsApp da clínica. O envio sem ninguém tocar, pela API oficial do WhatsApp, a nossa equipe ativa com você (a Meta cobra alguns centavos por mensagem).' : 'Na versão de verdade estes avisos saem sozinhos, sem ninguém clicar, pela API oficial do WhatsApp (a Meta cobra alguns centavos por mensagem). Nesta demonstração você vê a fila do dia, pode mandar um por um pelo seu WhatsApp ou simular o envio automático.'}</p>
    <div class="duas"><section class="cartao"><div class="cartao-cab"><h2>Na fila de hoje</h2><span class="selo selo-aguardando">${fila.length}</span></div>${fila.length ? `<ul class="lista-avisos">${fila.map((x, i) => `<li>${avatar(pet(x.pet), 'mini')}<div><b>${esc(pet(x.pet).nome)} · ${TIPO_AVISO[x.tipo]}</b><p>${esc(x.texto)}</p></div><a class="bt bt-peq bt-zap" target="_blank" rel="noopener" data-enviar-aviso="${i}" href="${zap(x.tel, x.texto)}">Enviar</a></li>`).join('')}</ul>` : '<p class="vazio">Nada para avisar hoje. Tudo em dia.</p>'}</section>
    <section class="cartao"><div class="cartao-cab"><h2>Já enviados</h2></div>${env.length ? `<ul class="lista-avisos">${env.map((x) => `<li>${avatar(pet(x.pet), 'mini')}<div><b>${esc(pet(x.pet)?.nome || '—')} · ${TIPO_AVISO[x.tipo]}</b><small>${dataBR(x.data)} às ${x.hora} · ${x.auto ? 'envio automático (simulação)' : 'mandado pelo WhatsApp'}</small></div></li>`).join('')}</ul>` : '<p class="vazio">Nenhum aviso enviado ainda.</p>'}</section></div>
    <section class="cartao" style="margin-top:18px"><div class="cartao-cab"><h2>Quando e o que avisar</h2></div><div class="cartao-corpo"><form class="cfg-form" data-salvar-cfg="avisos"><div class="grade-campos">
      <label class="campo">Horário de envio<input name="hora" type="time" value="${c.hora}"></label><label class="campo">Avisar vacina quantos dias antes (0 = não avisa)<input name="vacina" type="number" min="0" max="60" inputmode="numeric" value="${c.vacina}"></label><label class="campo">Lembrar consulta, retorno e banho quantos dias antes (0 = não avisa)<input name="consulta" type="number" min="0" max="15" inputmode="numeric" value="${c.consulta}"></label>
      <fieldset class="campo escolhas"><legend>Também avisar</legend><label><input type="checkbox" name="aniversario" ${c.aniversario ? 'checked' : ''}> Aniversário do pet</label><label><input type="checkbox" name="exame" ${c.exame ? 'checked' : ''}> Resultado de exame pronto</label></fieldset>
      ${Object.keys(MODELOS_AVISO).map((k) => `<label class="campo largo">Mensagem · ${TIPO_AVISO[k]}<textarea name="m_${k}">${esc(c.modelos[k] || MODELOS_AVISO[k])}</textarea></label>`).join('')}</div>
      <p class="nota">Palavras trocadas na hora do envio: {tutor}, {pet}, {clinica}, {vacina}, {situacao}, {tipo}, {data}, {dia}, {hora} e {exame}.</p><div class="acoes"><button class="bt bt-pri">Salvar</button></div></form></div></section>`;
}

// ---------------------------------------------------------------- PACOTES E PLANOS
const contratosDo = (idPet) => (db.contratos || []).filter((x) => x.pet === idPet && x.ativo && (x.tipo === 'plano' || (x.usados < x.qtd && x.validade >= hoje())));
const usarPacote = (ct) => { ct.usados += 1; ct.usos = [...(ct.usos || []), hoje()]; if (ct.usados >= ct.qtd) ct.ativo = false; };
function telaPacotes() {
  const ativos = db.contratos.filter((x) => x.ativo), planos = ativos.filter((x) => x.tipo === 'plano'), pacs = ativos.filter((x) => x.tipo === 'pacote'), atrasados = planos.filter((x) => diasAte(x.proxima) < 0);
  const linha = (x) => { const p = pet(x.pet); return `<tr><td><span class="com-foto">${avatar(p, 'mini')}<span><b>${esc(p?.nome)}</b><br><small style="color:var(--texto-2)">${esc(tutorDe(p)?.nome)}</small></span></span></td><td><b>${esc(x.nome)}</b><br><small style="color:var(--texto-2)">${x.tipo === 'plano' ? `${reais(x.valor)} por mês · desde ${dataBR(x.inicio)}` : `vale até ${dataBR(x.validade)}`}</small></td>
    <td>${x.tipo === 'plano' ? (diasAte(x.proxima) < 0 ? `<span class="selo selo-alerta">Mensalidade atrasada desde ${dataBR(x.proxima)}</span>` : `<span class="selo selo-aguardando">Próxima cobrança ${dataBR(x.proxima)}</span>`) : `<div class="uso" title="${x.usados} de ${x.qtd} usados">${Array.from({ length: x.qtd }, (_, i) => `<i class="${i < x.usados ? 'usado' : ''}"></i>`).join('')}<small>${x.usados} de ${x.qtd} usados</small></div>`}</td>
    <td class="num">${x.tipo === 'plano' ? `<button class="bt bt-peq ${diasAte(x.proxima) <= 3 ? 'bt-pri' : ''}" data-mensalidade="${x.id}">Cobrar mensalidade</button>` : `<button class="bt bt-peq" data-usar-pacote="${x.id}">Usar 1</button>`} <button class="bt bt-peq bt-perigo" data-cancelar-contrato="${x.id}">Encerrar</button></td></tr>`; };
  return `<div class="cab"><div><h1>Pacotes e planos</h1><p>Venda pacotes de banho e planos de saúde mensais. O banho do pacote é descontado sozinho quando o pet é entregue.</p></div><div class="acoes"><button class="bt" data-novo-modelo>+ Criar pacote ou plano</button><button class="bt bt-pri" data-vender-pacote="">Vender para um cliente</button></div></div>
    <div class="numeros"><div class="numero destaque"><span>Mensalidades por mês</span><b>${reais(planos.reduce((s, x) => s + x.valor, 0))}</b></div><div class="numero"><span>Planos ativos</span><b>${planos.length}</b></div><div class="numero"><span>Pacotes em uso</span><b>${pacs.length}</b></div><div class="numero"><span>Mensalidades atrasadas</span><b>${atrasados.length}</b></div></div>
    <section class="cartao"><div class="cartao-cab"><h2>Clientes com pacote ou plano</h2></div>${ativos.length ? `<table class="tabela empilha tabela-pacotes"><thead><tr><th>Pet</th><th>Pacote ou plano</th><th>Situação</th><th></th></tr></thead><tbody>${ativos.sort((a, b) => (a.tipo === 'plano' ? a.proxima : a.validade).localeCompare(b.tipo === 'plano' ? b.proxima : b.validade)).map(linha).join('')}</tbody></table>` : '<p class="vazio">Nenhum cliente com pacote ou plano ainda.</p>'}</section>
    <h2 class="sub-tit" style="margin-top:24px">O que a clínica oferece</h2><div class="modelos">${db.config.pacotes.map((m) => `<article class="modelo"><span class="selo ${m.tipo === 'plano' ? 'selo-atendimento' : 'selo-chegou'}">${m.tipo === 'plano' ? 'Plano mensal' : 'Pacote'}</span><h3>${esc(m.nome)}</h3><b class="preco">${reais(m.valor)}${m.tipo === 'plano' ? '<small>/mês</small>' : ''}</b><p>${m.tipo === 'plano' ? esc(m.inclui) : `${m.qtd}× ${esc(m.servico)} · vale ${m.dias} dias · sai a ${reais(m.valor / m.qtd)} cada`}</p><div class="acoes"><button class="bt bt-peq bt-pri" data-vender-pacote="${m.id}">Vender</button><button class="bt bt-peq bt-perigo" data-tirar-modelo="${m.id}">Tirar</button></div></article>`).join('')}</div>`;
}
function abrirVenderPacote(idModelo) {
  const f = janela('Vender pacote ou plano', `<div class="grade-campos"><label class="campo largo">Pet${campoPet(est.sel)}</label><label class="campo largo">Pacote ou plano<select name="modelo">${db.config.pacotes.map((m) => `<option value="${m.id}" ${m.id === idModelo ? 'selected' : ''}>${esc(m.nome)} · ${reais(m.valor)}${m.tipo === 'plano' ? ' por mês' : ''}</option>`).join('')}</select></label>
    <label class="campo">Forma de pagamento<select name="forma">${FORMAS.map((x) => `<option>${x}</option>`).join('')}</select></label></div><p class="nota">O pacote é pago agora e cada uso é descontado. No plano, a primeira mensalidade é cobrada agora e a próxima fica marcada para daqui a 30 dias.</p>`, '<button class="bt bt-pri">Vender e receber</button>');
  f.onsubmit = (e) => {
    e.preventDefault(); const m = db.config.pacotes.find((x) => x.id === f.modelo.value), h = hoje(); if (!m) return;
    if (db.contratos.some((x) => x.ativo && x.pet === f.pet.value && x.modelo === m.id && (x.tipo === 'plano' || x.usados < x.qtd))) return avisar(`${pet(f.pet.value).nome} já tem ${m.nome} ativo.`);
    db.contratos.push({ id: uid(), pet: f.pet.value, modelo: m.id, tipo: m.tipo, nome: m.nome, servico: m.servico, qtd: m.qtd, valor: m.valor, desconto: m.desconto, ativo: true, inicio: h, ...(m.tipo === 'plano' ? { proxima: maisDias(h, 30) } : { usados: 0, validade: maisDias(h, m.dias) }) });
    const fiado = f.forma.value.startsWith('Fiado');
    db.vendas.push({ id: uid(), data: h, hora: horaAgora(), pet: f.pet.value, itens: [{ nome: m.tipo === 'plano' ? `${m.nome} (1ª mensalidade)` : `Pacote ${m.nome}`, valor: m.valor, qtd: 1 }], forma: f.forma.value, recebido: !fiado, vet: '' });
    salvar(); fecharJanela(); est.secao = 'pacotes'; avisar(`${m.nome} vendido para ${pet(f.pet.value).nome}.`); desenhar();
  };
}
function abrirNovoModelo() {
  const f = janela('Criar pacote ou plano', `<div class="grade-campos"><label class="campo">Tipo<select name="tipo"><option value="pacote">Pacote (ex.: 4 banhos)</option><option value="plano">Plano mensal</option></select></label><label class="campo">Nome<input name="nome" placeholder="Ex.: 8 banhos"></label>
    <label class="campo" data-so="pacote">Serviço<input name="servico" list="lista-servicos" value="Banho"><datalist id="lista-servicos">${servicos().map(([n]) => n).map((x) => `<option value="${esc(x)}">`).join('')}</datalist></label><label class="campo" data-so="pacote">Quantidade<input name="qtd" type="number" min="1" value="4"></label><label class="campo" data-so="pacote">Vale por (dias)<input name="dias" type="number" min="1" value="60"></label>
    <label class="campo" data-so="plano" hidden>Desconto nos serviços (%)<input name="desconto" inputmode="decimal" value="10"></label><label class="campo largo" data-so="plano" hidden>O que inclui<input name="inclui" placeholder="Ex.: 1 consulta por mês e 10% de desconto"></label>
    <label class="campo">Preço (R$)<input name="valor" inputmode="decimal"></label></div>`, '<button class="bt bt-pri">Criar</button>');
  f.tipo.onchange = () => f.querySelectorAll('[data-so]').forEach((x) => { x.hidden = x.dataset.so !== f.tipo.value; });
  f.onsubmit = (e) => {
    e.preventDefault(); const valor = num(f.valor.value); if (!f.nome.value.trim() || !(valor > 0)) return avisar('Preencha o nome e o preço.');
    db.config.pacotes.push(f.tipo.value === 'plano' ? { id: uid(), tipo: 'plano', nome: f.nome.value.trim(), valor, desconto: num(f.desconto.value) || 0, inclui: f.inclui.value.trim() || `${num(f.desconto.value) || 0}% de desconto nos serviços` } : { id: uid(), tipo: 'pacote', nome: f.nome.value.trim(), servico: f.servico.value.trim() || 'Banho', qtd: Math.max(1, Math.round(Number(f.qtd.value)) || 1), valor, dias: Math.max(1, Math.round(Number(f.dias.value)) || 60) });
    salvar(); fecharJanela(); avisar('Criado. Já dá para vender.'); desenhar();
  };
}

// ---------------------------------------------------------------- COMISSÕES
const ehServico = (i) => i.valor > 0 && !db.estoque.some((x) => x.nome === i.nome);
function cartaoComissoes(l) {
  const por = {}; l.forEach((v) => { if (!v.vet) return; por[v.vet] = (por[v.vet] || 0) + v.itens.filter(ehServico).reduce((s, i) => s + i.valor * i.qtd, 0); });
  const linhas = db.vets.map((v) => [v, por[v] || 0, db.config.comissoes[v] ?? 0]);
  return `<section class="cartao" style="margin-top:18px"><div class="cartao-cab"><h2>Comissões dos últimos 30 dias</h2><button class="bt bt-peq" data-cfg-ir="comissoes">Mudar porcentagens</button></div><table class="tabela empilha"><thead><tr><th>Profissional</th><th class="num">Serviços feitos</th><th class="num">Comissão</th><th class="num">A pagar</th></tr></thead><tbody>${linhas.map(([v, s, p]) => `<tr><td><b>${esc(v)}</b></td><td class="num">${reais(s)}</td><td class="num">${p}%</td><td class="num"><b>${reais(s * p / 100)}</b></td></tr>`).join('')}<tr><td><b>Total</b></td><td class="num">${reais(linhas.reduce((s, x) => s + x[1], 0))}</td><td></td><td class="num"><b>${reais(linhas.reduce((s, x) => s + x[1] * x[2] / 100, 0))}</b></td></tr></tbody></table></section>`;
}
const profissionalPadrao = (idPet, itens = []) => itens.some((i) => /banho|tosa/i.test(i.nome)) ? db.vets.find((v) => !v.startsWith('Dr')) : (db.agenda.find((a) => a.pet === idPet && a.data === hoje())?.vet || db.vets.find((v) => v.startsWith('Dr')));

// ---------------------------------------------------------------- NOTA FISCAL DE SERVIÇO (prévia)
function abrirNFSe(idVenda) {
  const v = db.vendas.find((x) => x.id === idVenda); if (v.nfse) return imprimirNFSe(v);
  const serv = v.itens.filter(ehServico), base = serv.reduce((s, i) => s + i.valor * i.qtd, 0) + v.itens.filter((i) => i.valor < 0).reduce((s, i) => s + i.valor * i.qtd, 0);
  if (!(base > 0)) return avisar('Este lançamento só tem produtos. Produto sai em cupom ou NF-e, não em nota de serviço.');
  const t = tutorDe(pet(v.pet));
  const f = janela('Emitir nota fiscal de serviço', `<div class="grade-campos"><label class="campo largo">Tomador (quem recebe a nota)<input name="nome" value="${esc(t?.nome || '')}"></label><label class="campo">CPF ou CNPJ<input name="doc" value="${esc(t?.cpf || '')}" placeholder="Opcional para pessoa física"></label><label class="campo">E-mail para enviar<input name="email" type="email" value="${esc(t?.email || '')}"></label></div>
    <table class="tabela" style="margin-top:12px">${serv.map((i) => `<tr><td>${esc(i.nome)}${i.qtd > 1 ? ` ×${i.qtd}` : ''}</td><td class="num">${reais(i.valor * i.qtd)}</td></tr>`).join('')}<tr><td><b>Valor da nota</b></td><td class="num"><b>${reais(base)}</b></td></tr><tr><td>ISS (${db.config.fiscal.aliquota}%)</td><td class="num">${reais(base * db.config.fiscal.aliquota / 100)}</td></tr></table>
    <p class="nota">Demonstração: a nota sai como prévia, sem valor fiscal. Na versão de verdade ela vai para a prefeitura e o tutor recebe o PDF.</p>`, '<button class="bt bt-pri">Emitir</button>');
  f.onsubmit = (e) => {
    e.preventDefault(); if (!f.nome.value.trim()) return avisar('Falta o nome do tomador.');
    const fis = db.config.fiscal; v.nfse = { numero: fis.proxima, data: hoje(), hora: horaAgora(), tomador: f.nome.value.trim(), doc: f.doc.value.trim(), email: f.email.value.trim(), base, iss: base * fis.aliquota / 100, itens: serv.map(({ nome, valor, qtd }) => ({ nome, valor, qtd })), codigo: `${uid()}${uid()}`.toUpperCase().slice(0, 12) };
    fis.proxima += 1; if (t && f.doc.value.trim() && !t.cpf) t.cpf = f.doc.value.trim();
    salvar(); fecharJanela(); avisar(`Nota nº ${v.nfse.numero} emitida (prévia).`); desenhar(); imprimirNFSe(v);
  };
}
function imprimirNFSe(v) {
  const n = v.nfse, fis = db.config.fiscal;
  imprimir(`NFS-e nº ${n.numero}`, `<p style="background:#fbe4e5;color:#8a1f27;padding:8px 12px;border-radius:6px"><b>Prévia da demonstração · sem valor fiscal</b></p>
    <table><tr><th>Número</th><td>${n.numero}</td><th>Emissão</th><td>${dataBR(n.data)} ${n.hora}</td></tr><tr><th>Código de verificação</th><td colspan="3">${n.codigo}</td></tr></table>
    <h2>Prestador</h2><p>${esc(db.clinica)} · CNPJ ${esc(db.config.cnpj)} · Inscrição municipal ${esc(fis.im)}<br>${esc(db.config.endereco)} · ${esc(db.config.cidade)} · ${esc(fis.regime)}</p>
    <h2>Tomador</h2><p>${esc(n.tomador)}${n.doc ? ` · ${esc(n.doc)}` : ''}${n.email ? ` · ${esc(n.email)}` : ''}</p>
    <h2>Discriminação dos serviços</h2><table><tr><th>Serviço</th><th>Qtd.</th><th>Valor</th></tr>${n.itens.map((i) => `<tr><td>${esc(i.nome)}</td><td>${i.qtd}</td><td>${reais(i.valor * i.qtd)}</td></tr>`).join('')}</table>
    <p>Serviço: ${esc(fis.codigo)}</p><table><tr><th>Valor dos serviços</th><td>${reais(n.base)}</td><th>Alíquota ISS</th><td>${fis.aliquota}%</td><th>Valor do ISS</th><td>${reais(n.iss)}</td></tr></table>`);
}

// ---------------------------------------------------------------- RECEITA DE CONTROLE ESPECIAL
function abrirReceitaControle(idPet, idPr) {
  const p = pet(idPet), pr = db.prontuarios.find((x) => x.id === idPr);
  const f = janela(`Receita de controle especial · ${esc(p.nome)}`, `<div class="grade-campos"><label class="campo largo">Medicamento e concentração<input name="med" placeholder="Ex.: Tramadol 50 mg"></label><label class="campo">Quantidade (número e por extenso)<input name="qtd" placeholder="Ex.: 10 (dez) comprimidos"></label>
    <label class="campo">Veterinário<input name="vet" list="lista-vets" value="${esc(pr?.vet || db.vets.find((v) => v.startsWith('Dr')) || '')}"><datalist id="lista-vets">${db.vets.map((x) => `<option value="${esc(x)}">`).join('')}</datalist></label><label class="campo largo">Modo de usar<textarea name="uso" placeholder="Dose, horário e por quantos dias">${esc(pr?.prescricao || '')}</textarea></label></div>
    <p class="nota">Sai em duas vias: a 1ª fica na farmácia e a 2ª com o tutor. A farmácia preenche a parte do comprador e do fornecedor.</p>`, '<button class="bt bt-pri">Imprimir as duas vias</button>');
  f.onsubmit = (e) => {
    e.preventDefault(); if (!f.med.value.trim() || !f.qtd.value.trim() || !f.uso.value.trim() || !f.vet.value.trim()) return avisar('Preencha o medicamento, a quantidade e o modo de usar.');
    const t = tutorDe(p), c = db.config, linha = (r) => `<tr><td style="width:38%">${r}</td><td>&nbsp;</td></tr>`;
    const via = (n, quem) => `<section style="border:1.5px solid #214e45;border-radius:8px;padding:16px 18px;margin-bottom:22px;page-break-inside:avoid"><h2 style="margin-top:0">Receituário de controle especial · ${n}ª via (${quem})</h2>
      <table><tr><th colspan="2">Identificação do emitente</th></tr><tr><td>Nome</td><td>${esc(f.vet.value)}</td></tr><tr><td>CRMV</td><td>${esc(c.crmv)}</td></tr><tr><td>Endereço</td><td>${esc(db.clinica)} · ${esc(c.endereco)} · ${esc(c.cidade)}</td></tr><tr><td>Telefone</td><td>${esc(telBR(c.telefone))}</td></tr></table>
      ${cabPet(p)}<p><b>Endereço do tutor:</b> ${esc(t?.end || '________________________________')}</p>
      <h2>Prescrição</h2><p><b>${esc(f.med.value.trim())}</b> · ${esc(f.qtd.value.trim())}</p><p style="white-space:pre-wrap">${esc(f.uso.value.trim())}</p>
      <div class="assin" style="margin-top:44px"><div>${esc(f.vet.value)} · ${esc(c.crmv)}<br>Data: ${dataBR(hoje())}</div></div>
      <div style="display:flex;gap:16px;margin-top:22px"><table style="flex:1"><tr><th colspan="2">Identificação do comprador</th></tr>${['Nome', 'RG', 'Endereço', 'Cidade', 'Telefone'].map(linha).join('')}</table><table style="flex:1"><tr><th colspan="2">Identificação do fornecedor</th></tr>${['Farmacêutico(a)', 'Assinatura', 'Data'].map(linha).join('')}</table></div></section>`;
    fecharJanela(); imprimir(`Receita de controle especial · ${p.nome}`, `${via(1, 'farmácia')}${via(2, 'tutor')}`);
  };
}

// ---------------------------------------------------------------- ANEXOS DE EXAME (PDF ou foto)
function lerAnexo(arq) {
  return new Promise((ok, erro) => {
    if (!arq) return erro(new Error('Escolha um arquivo.'));
    if (arq.type === 'application/pdf') { if (arq.size > (CONTA ? 8e5 : 1.5e6)) return erro(new Error(CONTA ? 'PDF grande demais (até 800 KB). Tire uma foto do laudo ou peça ao laboratório o PDF compactado.' : 'PDF grande demais para a demonstração (até 1,5 MB).')); const r = new FileReader(); r.onload = () => ok({ nome: arq.name, dados: r.result }); r.onerror = () => erro(new Error('Não consegui ler o PDF.')); return r.readAsDataURL(arq); }
    if (!arq.type.startsWith('image/')) return erro(new Error('Anexe um PDF ou uma foto.'));
    const img = new Image(), url = URL.createObjectURL(arq);
    img.onload = () => { const k = Math.min(1, (CONTA ? 1200 : 1600) / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok({ nome: arq.name.replace(/\.\w+$/, '.jpg'), dados: c.toDataURL('image/jpeg', .82) }); };
    img.onerror = () => erro(new Error('Não consegui abrir essa imagem.')); img.src = url;
  });
}
function verAnexo(x) {
  const [cab, b64] = x.dados.split(','), tipo = cab.match(/:(.*?);/)[1], bin = atob(b64), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  if (!window.open(URL.createObjectURL(new Blob([u8], { type: tipo })), '_blank')) avisar('Libere as janelas do navegador para ver o arquivo.');
}

// ---------------------------------------------------------------- AGENDAMENTO ONLINE
const FILA_PEDIDOS = 'vetnature-pedidos-demo';
const linkAgendar = () => new URL(CONTA && window.veltriaConta?.espaco ? `agendar.html?e=${window.veltriaConta.espaco}` : 'agendar.html', location.href).href;
function trazerPedidos() {
  let novos = []; try { novos = JSON.parse(localStorage.getItem(FILA_PEDIDOS)) || []; localStorage.removeItem(FILA_PEDIDOS); } catch { /* sem armazenamento */ }
  if (novos.length) { db.pedidos.push(...novos); salvar(); }
  return novos.length;
}
// conta: pedidos feitos pelo link público (tabela vetnature_pedidos) entram nos dados da clínica e saem da fila
function trazerPedidosNuvem() {
  if (!CONTA || !window.veltriaCliente || window.veltriaPermissoes?.so_leitura) return;
  window.veltriaCliente().then((sb) => sb.from('vetnature_pedidos').select('id,nome,tel,pet,especie,tipo,data,hora,obs').eq('espaco', window.veltriaConta.espaco).order('criado').then((r) => {
    if (r.error || !r.data?.length) return;
    let novos = 0;
    r.data.forEach((x) => { if (db.pedidos.some((y) => y.id === `w${x.id}`)) return; db.pedidos.push({ id: `w${x.id}`, nome: x.nome, tel: x.tel, pet: x.pet, especie: x.especie, tipo: x.tipo, data: x.data, hora: x.hora, obs: x.obs || '', status: 'novo', criado: new Date().toISOString() }); novos += 1; });
    salvar();
    return sb.from('vetnature_pedidos').delete().in('id', r.data.map((x) => x.id)).then(() => { if (novos) { avisar(novos === 1 ? 'Chegou um pedido de horário pelo link.' : `Chegaram ${novos} pedidos de horário pelo link.`); desenhar(); } });
  })).catch(() => {});
}
function blocoPedidos() {
  const l = db.pedidos.filter((x) => x.status === 'novo').sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  if (!l.length) return '';
  return `<section class="cartao pedidos"><div class="cartao-cab"><h2>Pedidos pelo link · ${l.length} esperando confirmação</h2></div><ul class="lista-avisos">${l.map((x) => `<li><div class="avatar mini">${IC[x.especie] || IC.outro}</div><div><b>${esc(x.pet)} · ${esc(x.tipo)} · ${dataBR(x.data)} (${diaSemana(x.data)}) às ${x.hora}</b><small>${esc(x.nome)} · ${esc(telBR(x.tel))}${x.obs ? ` · “${esc(x.obs)}”` : ''}</small></div><span class="acoes"><button class="bt bt-peq bt-pri" data-confirmar-pedido="${x.id}">Confirmar</button><button class="bt bt-peq" data-recusar-pedido="${x.id}">Recusar</button></span></li>`).join('')}</ul></section>`;
}
function confirmarPedido(id) {
  const x = db.pedidos.find((y) => y.id === id);
  let t = db.tutores.find((y) => soDigitos(y.tel) === soDigitos(x.tel));
  if (!t) { t = { id: uid(), nome: x.nome, tel: soDigitos(x.tel), end: '' }; db.tutores.push(t); }
  let p = db.pets.find((y) => y.tutor === t.id && sem(y.nome) === sem(x.pet));
  if (!p) { p = { id: uid(), tutor: t.id, nome: x.pet, especie: x.especie, raca: 'SRD', sexo: 'Não informado', nasc: maisDias(hoje(), -365), castrado: false, alergias: '', pelagem: '', microchip: '', obs: 'Cadastro feito pelo agendamento online: confirme raça, sexo e idade na chegada.', foto: '', pesos: [] }; db.pets.push(p); }
  const estetica = /banho|tosa/i.test(x.tipo), opcoes = db.vets.filter((v) => (estetica ? !v.startsWith('Dr') : v.startsWith('Dr')));
  const vet = opcoes.find((v) => !db.agenda.some((a) => a.data === x.data && a.hora === x.hora && a.vet === v)) || opcoes[0] || db.vets[0];
  db.agenda.push({ id: uid(), data: x.data, hora: x.hora, pet: p.id, tipo: x.tipo, vet, status: 'aguardando', valor: TIPOS[x.tipo] ?? 0 });
  x.status = 'confirmado'; salvar(); desenhar(); avisar(`Confirmado: ${p.nome} em ${dataBR(x.data)} às ${x.hora} com ${vet}.`);
  simularZap(zap(x.tel, `Olá, ${primeiro(x.nome)}! Seu pedido está confirmado: ${x.tipo} do(a) ${x.pet} na ${db.clinica} em ${dataBR(x.data)} (${diaSemana(x.data, 'long')}) às ${x.hora}. Até lá!`));
}
function recusarPedido(id) {
  const x = db.pedidos.find((y) => y.id === id); if (!confirm(`Recusar o pedido de ${x.nome}?`)) return;
  x.status = 'recusado'; salvar(); desenhar();
  simularZap(zap(x.tel, `Olá, ${primeiro(x.nome)}! Aqui é da ${db.clinica}. Infelizmente não temos ${x.hora} livre em ${dataBR(x.data)}. Podemos ver outro horário para o(a) ${x.pet}?`));
}
function abrirLinkAgenda() {
  const url = linkAgendar(), msg = `Agora dá para marcar horário na ${db.clinica} pelo celular, a qualquer hora: ${url}`;
  const f = janela('Link para o tutor agendar', `<p style="margin-top:0">O tutor escolhe o dia e o horário livre; o pedido aparece aqui na Agenda para vocês confirmarem.</p><label class="campo">Link<input name="link" value="${esc(url)}" readonly></label>
    ${db.config.agendaOnline.ligado ? '' : '<p class="nota">O agendamento online está desligado. Ligue em Configurações · Agendamento online.</p>'}`, `<a class="bt" href="${esc(linkAgendar())}" target="_blank" rel="noopener">Abrir a página</a><a class="bt bt-zap" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">Mandar no WhatsApp</a><button class="bt bt-pri">Copiar link</button>`);
  f.onsubmit = async (e) => { e.preventDefault(); try { await navigator.clipboard.writeText(url); avisar('Link copiado.'); } catch { f.link.select(); avisar('Selecionei o link: é só copiar.'); } };
}

// ---------------------------------------------------------------- WHATSAPP SIMULADO (demonstração: nada sai de verdade)
function simularZap(url) {
  if (CONTA) { window.open(url, '_blank', 'noopener'); return; }
  const u = new URL(url), tel = u.pathname.replace(/\D/g, '').replace(/^55/, ''), msg = u.searchParams.get('text') || '';
  const t = db.tutores.find((x) => soDigitos(x.tel) === tel);
  let el = $('#zap-sim');
  if (!el) { el = document.createElement('div'); el.id = 'zap-sim'; el.className = 'zap-fundo'; document.body.append(el); el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-fechar-zap]')) el.hidden = true; }); }
  el.innerHTML = `<div class="zap" role="dialog" aria-modal="true" aria-label="Simulação do WhatsApp"><div class="zap-cab"><span class="zap-foto">${esc((t?.nome || '?')[0])}</span><span><b>${esc(t?.nome || (tel ? telBR(tel) : 'Escolher contato'))}</b><small>${tel ? `${esc(telBR(tel))} · número de exemplo` : 'você escolhe para quem mandar'}</small></span><button type="button" class="fechar" data-fechar-zap aria-label="Fechar">×</button></div>
    <div class="zap-conversa"><div class="zap-msg">${esc(msg).replace(/\n/g, '<br>')}<span class="zap-hora">${horaAgora()} <span aria-label="entregue">✓✓</span></span></div></div>
    <p class="zap-nota"><b>Simulação.</b> Nada foi enviado. No sistema de verdade esta mensagem abre pronta no WhatsApp da clínica, é só tocar em enviar.</p>
    <div class="zap-pe"><button type="button" class="bt" data-copiar-zap>Copiar mensagem</button><button type="button" class="bt bt-pri" data-fechar-zap>Fechar</button></div></div>`;
  el.hidden = false; el.querySelector('.zap .bt-pri').focus();
  el.querySelector('[data-copiar-zap]').onclick = async () => { try { await navigator.clipboard.writeText(msg); avisar('Mensagem copiada.'); } catch { avisar('Não deu para copiar neste navegador.'); } };
}
// qualquer link de WhatsApp da demonstração abre a simulação
document.addEventListener('click', (e) => { const l = e.target.closest('a[href*="wa.me/"]'); if (!l || CONTA) return; e.preventDefault(); simularZap(l.href); }, true);

// ---------------------------------------------------------------- desenho e cliques
function desenhar() {
  if (location.hash.slice(1) !== est.secao) history.replaceState(null, '', `${location.pathname}${location.search}#${est.secao}`);
  topo();
  $('#tela').innerHTML = ({ hoje: telaHoje, agenda: telaAgenda, pacientes: telaPacientes, tutores: telaTutores, vacinas: telaVacinas, internacao: telaInternacao, estetica: telaEstetica, exames: telaExames, estoque: telaEstoque, caixa: telaCaixa, relatorios: telaRelatorios, config: telaConfig, avisos: telaAvisos, pacotes: telaPacotes })[est.secao]();
}
const irPet = (id) => { est.secao = 'pacientes'; est.sel = id; est.aba = 'resumo'; est.busca = ''; desenhar(); scrollTo({ top: 0 }); };
document.addEventListener('click', (e) => {
  const b = e.target.closest('button, a, tr[data-ver-tutor]'); if (!b) return;
  const d = b.dataset;
  if (d.fechar !== undefined) return fecharJanela();
  if (d.secao) { est.secao = d.secao; est.aba = 'resumo'; if (d.secao !== 'pacientes') est.busca = ''; desenhar(); $('#tela').focus(); return; }
  if (d.sel) { est.sel = d.sel; est.aba = 'resumo'; return desenhar(); }
  if (d.abrirPet) return irPet(d.abrirPet);
  if (d.verTutor) { est.secao = 'tutores'; est.tutor = d.verTutor; return desenhar(); }
  if (d.aba) { est.aba = d.aba; return desenhar(); }
  if (d.foto) return abrirFoto(d.foto);
  if (d.avancar) { const a = db.agenda.find((x) => x.id === d.avancar); if (d.para === 'pronto') return abrirProntuario(a.pet); a.status = d.para; salvar(); avisar(d.para === 'chegou' ? `${pet(a.pet).nome} chegou.` : `Atendimento de ${pet(a.pet).nome} iniciado.`); return desenhar(); }
  if (d.prontuario) return abrirProntuario(d.prontuario);
  if (d.pesar) return abrirPesar(d.pesar);
  if (d.receita) return imprimirReceita(d.receita);
  if (d.carteira) return imprimirCarteira(d.carteira);
  if (d.termo) { const [id, t] = d.termo.split(':'); return imprimirTermo(id, t); }
  if (d.atestado) return imprimirAtestado(d.atestado);
  if (d.aplicar) return abrirAplicarVacina(d.aplicar);
  if (d.cobrar !== undefined) return abrirCobrar(d.cobrar || null);
  if (d.internar !== undefined) return abrirInternar(d.internar || null);
  if (d.agendar !== undefined) return abrirAgendar(d.agendar || est.sel);
  if (d.novoAtendimento !== undefined) return abrirAgendar(est.sel);
  if (d.novoPet !== undefined) return abrirPet(null);
  if (d.editarPet) return abrirPet(d.editarPet);
  if (d.filtroVac) { est.filtroVac = d.filtroVac; return desenhar(); }
  if (d.agendarVac) { const v = db.vacinas.find((x) => x.id === d.agendarVac); return abrirAgendar(v.pet, 'Vacina'); }
  if (d.semana) { est.dia = d.semana === '0' ? hoje() : maisDias(est.dia, Number(d.semana)); return desenhar(); }
  if (d.dose) { const [i, k] = d.dose.split(':'); const int = db.internados.find((x) => x.id === i); int.doses[Number(k)].feita = true; salvar(); avisar(`Dose dada: ${int.doses[Number(k)].remedio}.`); return desenhar(); }
  if (d.novaDose) return abrirNovaDose(d.novaDose);
  if (d.alta) { const i = db.internados.find((x) => x.id === d.alta); if (!confirm(`Dar alta para ${pet(i.pet).nome}?`)) return; const diarias = Math.max(1, diasAte(hoje()) - diasAte(i.entrada) + 1); db.internados = db.internados.filter((x) => x.id !== d.alta); salvar(); desenhar(); return abrirCobrar(i.pet, [{ nome: 'Diária de internação', valor: db.config.diaria || 180, qtd: diarias }]); }
  if (d.banho !== undefined) return abrirBanho(d.banho || est.sel);
  if (d.etapa) { const x = db.estetica.find((y) => y.id === d.etapa); x.status = ESTETICA[ESTETICA.findIndex(([k]) => k === x.status) + 1][0]; salvar(); return desenhar(); }
  if (d.entregue) { const x = db.estetica.find((y) => y.id === d.entregue); db.estetica = db.estetica.filter((y) => y.id !== d.entregue); const ct = contratosDo(x.pet).find((c) => c.tipo === 'pacote' && c.servico === x.servico); if (ct) { usarPacote(ct); salvar(); desenhar(); return avisar(`${pet(x.pet).nome}: usado 1 do pacote ${ct.nome} (${ct.qtd - ct.usados} restante${ct.qtd - ct.usados === 1 ? '' : 's'}). Nada a cobrar.`); } salvar(); desenhar(); return abrirCobrar(x.pet, [{ nome: x.servico, valor: (servicos().find(([n]) => n === x.servico) || [0, 60])[1], qtd: 1 }]); }
  if (d.pedirExame !== undefined) return abrirPedirExame(d.pedirExame || est.sel);
  if (d.coletar) { db.exames.find((x) => x.id === d.coletar).status = 'coletado'; salvar(); return desenhar(); }
  if (d.resultado) return abrirResultado(d.resultado);
  if (d.avisado) { db.exames.find((x) => x.id === d.avisado).avisado = true; salvar(); setTimeout(desenhar, 50); return; }
  if (d.receber) { const v = db.vendas.find((x) => x.id === d.receber); v.recebido = true; v.forma = 'PIX'; v.recebidoEm = hoje(); salvar(); avisar(`Recebido: ${reais(total(v))}.`); return desenhar(); }
  if (d.entrada) return abrirEntrada(d.entrada);
  if (d.novoItem !== undefined) return abrirNovoItem();
  if (d.novoTutor !== undefined) return abrirTutor(null);
  if (d.editarTutor) return abrirTutor(d.editarTutor);
  if (d.vacinaManual !== undefined) return abrirVacinaManual(d.vacinaManual || est.sel);
  if (d.cfg) { est.cfg = d.cfg; return desenhar(); }
  if (d.cfgIr) { est.secao = 'config'; est.cfg = d.cfgIr; return desenhar(); }
  if (d.receitaControle) { const [id, pr] = d.receitaControle.split(':'); return abrirReceitaControle(id, pr); }
  if (d.verAnexo) { const [id, k] = d.verAnexo.split(':'); return verAnexo(db.exames.find((x) => x.id === id).anexos[Number(k)]); }
  if (d.tirarAnexo) { const [id, k] = d.tirarAnexo.split(':'), x = db.exames.find((y) => y.id === id); if (!confirm(`Tirar o arquivo ${x.anexos[Number(k)].nome}?`)) return; x.anexos.splice(Number(k), 1); salvar(); return desenhar(); }
  if (d.nfse) return abrirNFSe(d.nfse);
  if (d.enviarAviso !== undefined) { const x = filaAvisos()[Number(d.enviarAviso)]; if (x) { registrarAviso(x, false); salvar(); setTimeout(desenhar, 50); } return; }
  if (d.simularEnvio !== undefined) { const l = filaAvisos(); l.forEach((x) => registrarAviso(x, true)); salvar(); avisar(`${l.length} aviso${l.length === 1 ? '' : 's'} enviado${l.length === 1 ? '' : 's'} (simulação).`); return desenhar(); }
  if (d.ligarAvisos !== undefined) { db.config.avisos.ligado = !db.config.avisos.ligado; salvar(); return desenhar(); }
  if (d.venderPacote !== undefined) return abrirVenderPacote(d.venderPacote);
  if (d.novoModelo !== undefined) return abrirNovoModelo();
  if (d.tirarModelo) { if (!confirm('Tirar este pacote ou plano da lista? Quem já comprou continua com ele.')) return; db.config.pacotes = db.config.pacotes.filter((x) => x.id !== d.tirarModelo); salvar(); return desenhar(); }
  if (d.usarPacote) { const ct = db.contratos.find((x) => x.id === d.usarPacote); usarPacote(ct); salvar(); avisar(`Usado 1 de ${ct.nome} (${ct.qtd - ct.usados} restante${ct.qtd - ct.usados === 1 ? '' : 's'}).`); return desenhar(); }
  if (d.mensalidade) { const ct = db.contratos.find((x) => x.id === d.mensalidade); db.vendas.push({ id: uid(), data: hoje(), hora: horaAgora(), pet: ct.pet, itens: [{ nome: `${ct.nome} (mensalidade)`, valor: ct.valor, qtd: 1 }], forma: 'PIX', recebido: true, vet: '' }); ct.proxima = maisDias(diasAte(ct.proxima) < -30 ? hoje() : ct.proxima, 30); salvar(); avisar(`Mensalidade recebida: ${reais(ct.valor)}. Próxima em ${dataBR(ct.proxima)}.`); return desenhar(); }
  if (d.cancelarContrato) { const ct = db.contratos.find((x) => x.id === d.cancelarContrato); if (!confirm(`Encerrar ${ct.nome} de ${pet(ct.pet)?.nome}?`)) return; ct.ativo = false; salvar(); return desenhar(); }
  if (d.linkAgenda !== undefined) return abrirLinkAgenda();
  if (d.confirmarPedido) return confirmarPedido(d.confirmarPedido);
  if (d.recusarPedido) return recusarPedido(d.recusarPedido);
  if (d.conta !== undefined) { if (CONTA) return contaVc('perfil'); est.secao = 'config'; est.cfg = 'conta'; return desenhar(); }
  if (d.vcIr) return contaVc(d.vcIr);
  if (d.ia !== undefined) return abrirIA();
  if (d.fecharIa !== undefined) { $('#painel-ia').hidden = true; return; }
  if (d.perguntar) return perguntar(d.perguntar);
  if (d.tirarVet) { db.vets.splice(Number(d.tirarVet), 1); salvar(); return desenhar(); }
  if (d.tirarServ) { db.config.servicos.splice(Number(d.tirarServ), 1); salvar(); return desenhar(); }
  if (d.baixarCopia !== undefined) { const u = URL.createObjectURL(new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' })); const l = document.createElement('a'); l.href = u; l.download = `vetnature-copia-${hoje()}.json`; l.click(); URL.revokeObjectURL(u); return; }
  if (d.recomecar !== undefined) { if (CONTA) return; if (!confirm('Apagar as mudanças e voltar aos dados de exemplo?')) return; db = completar(exemplo()); salvar(); est.sel = null; est.secao = 'hoje'; est.tutor = null; return desenhar(); }
});
document.addEventListener('submit', (e) => {
  const f = e.target;
  if (f.matches('[data-salvar-cfg]')) { e.preventDefault(); return salvarConfig(f); }
  if (f.matches('[data-ia-form]')) { e.preventDefault(); const q = f.q.value; f.q.value = ''; perguntar(q); }
});
document.addEventListener('input', (e) => {
  if (!e.target.matches('[data-pet-busca]')) return;
  const f = e.target.form, p = acharPet(e.target.value), antes = f.pet.value;
  f.pet.value = p ? p.id : '';
  if (p && e.target.value !== rotuloPet(p) && sem(e.target.value) === sem(rotuloPet(p))) e.target.value = rotuloPet(p);
  if (f.pet.value !== antes) f.pet.dispatchEvent(new Event('change'));
});
document.addEventListener('change', (e) => {
  if (e.target.name === 'modo' && e.target.closest('[data-salvar-cfg="ia"]')) e.target.form.querySelector('[data-propria]').hidden = e.target.value !== 'propria';
  if (e.target.matches('[data-anexar]')) { const x = db.exames.find((y) => y.id === e.target.dataset.anexar); lerAnexo(e.target.files[0]).then((an) => { x.anexos.push(an); salvar(); avisar(`Arquivo anexado ao exame ${x.nome}.`); desenhar(); }).catch((er) => avisar(er.message)); return; }
  if (e.target.matches('[data-voltar-copia]')) { const r = new FileReader(); r.onload = () => { try { const n = JSON.parse(r.result); if (!n.pets || !n.tutores) throw 0; db = completar(n); salvar(); avisar('Cópia de segurança restaurada.'); desenhar(); } catch { avisar('Esse arquivo não é uma cópia do VetNature.'); } }; r.readAsText(e.target.files[0]); }
});
$('#janela').addEventListener('click', (e) => { if (e.target.id === 'janela') fecharJanela(); });
document.addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; const z = $('#zap-sim'); if (z && !z.hidden) { z.hidden = true; return; } if (!$('#janela').hidden) fecharJanela(); });
$('#busca').addEventListener('input', (e) => { est.busca = e.target.value; est.secao = 'pacientes'; const l = db.pets.filter((p) => `${p.nome} ${tutorDe(p)?.nome}`.toLowerCase().includes(est.busca.toLowerCase())); est.sel = l.length === 1 ? l[0].id : est.sel; desenhar(); });
// pedido feito na página do tutor (outra aba) aparece na hora
addEventListener('storage', (e) => { if (e.key === FILA_PEDIDOS && e.newValue && trazerPedidos()) { avisar('Chegou um pedido de agendamento pelo link.'); desenhar(); } });
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h !== est.secao && SECOES.some(([k]) => k === h)) { est.secao = h; desenhar(); } });
{ const h = location.hash.slice(1); if (SECOES.some(([k]) => k === h)) est.secao = h; }
trazerPedidos();
if (CONTA) { setTimeout(trazerPedidosNuvem, 2500); setInterval(trazerPedidosNuvem, 30000); }
desenhar();
