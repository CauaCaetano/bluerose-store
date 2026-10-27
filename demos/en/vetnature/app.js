// VetNature (English demo) · veterinary clinic management. Sample data lives only in this browser.
// Same features as the Brazilian product, adapted to US clinics: USD, lb, °F, SMS reminders, invoices.
const CHAVE = 'vetnature-en-demo-v1';
const FOTOS = '../../sistemas/vetnature/fotos/';
const CHAVE_IA = 'vetnature-en-ai-key';
const chaveIA = () => { try { return localStorage.getItem(CHAVE_IA) || ''; } catch { return ''; } };
const guardarChaveIA = (v) => { try { if (v) localStorage.setItem(CHAVE_IA, v); else localStorage.removeItem(CHAVE_IA); } catch { /* no storage */ } };
const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const reais = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const uid = () => Math.random().toString(36).slice(2, 10);
const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const maisDias = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const dataBR = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
const diasAte = (iso) => Math.round((new Date(`${iso}T12:00:00`) - new Date(`${hoje()}T12:00:00`)) / 864e5);
const diaSemana = (iso, f = 'short') => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: f });
const idade = (nasc) => { const m = Math.max(0, Math.round((new Date(`${hoje()}T12:00:00`) - new Date(`${nasc}T12:00:00`)) / (864e5 * 30.44))); return m < 12 ? `${m} ${m === 1 ? 'month' : 'months'}` : `${Math.floor(m / 12)} ${Math.floor(m / 12) === 1 ? 'year' : 'years'}`; };
const soDigitos = (s) => String(s || '').replace(/\D/g, '');
const telBR = (t) => String(t || '').replace(/^1?(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3');
const horaAgora = () => new Date().toTimeString().slice(0, 5);
const hora12 = (h) => { if (!h) return ''; const [a, b] = h.split(':').map(Number); return `${((a + 11) % 12) + 1}:${String(b).padStart(2, '0')} ${a < 12 ? 'AM' : 'PM'}`; };
const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const primeiro = (n) => String(n || '').split(' ')[0];
const ehEstetica = (s) => /bath|groom|trim/i.test(s || '');

// ---------------------------------------------------------------- icons
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
const SECOES = [['hoje', 'Today'], ['agenda', 'Schedule'], ['pacientes', 'Patients'], ['tutores', 'Clients'], ['vacinas', 'Vaccines'], ['internacao', 'Hospital'], ['estetica', 'Grooming'], ['exames', 'Lab'], ['estoque', 'Inventory'], ['caixa', 'Checkout'], ['pacotes', 'Plans'], ['avisos', 'Reminders'], ['relatorios', 'Reports'], ['config', 'Settings']];
const TIPOS = { Consultation: 65, Recheck: 0, Vaccine: 0, 'Bath & grooming': 65, Surgery: 450, 'Lab test': 55 };
const SERVICOS_PADRAO = [['Wellness exam', 65], ['Recheck (within 15 days)', 0], ['Emergency exam', 120], ['Bath', 40], ['Bath & grooming', 65], ['Sanitary trim', 30], ['Vaccine administration', 15], ['CBC (blood count)', 55], ['Chemistry panel (kidney)', 80], ['Ultrasound', 250], ['X-ray', 150], ['Spay / neuter', 300], ['Dental cleaning', 400], ['Hospitalization (per day)', 95], ['Microchip', 45]];
const servicos = () => db.config.servicos;
const EXAMES = ['CBC (complete blood count)', 'Chemistry panel (kidney)', 'Chemistry panel (liver)', 'Urinalysis', 'Fecal exam', 'Abdominal ultrasound', 'Chest X-ray', 'FIV/FeLV snap test', 'Heartworm test'];
const FORMAS = ['Credit card', 'Debit card', 'Cash', 'Check', 'On account (to collect)'];
const fiadoForma = (f) => f.startsWith('On account');
const STATUS = { aguardando: ['Scheduled', 'selo-aguardando'], chegou: ['Checked in', 'selo-chegou'], atendimento: ['In exam', 'selo-atendimento'], pronto: ['Done', 'selo-pronto'] };
const ESTETICA = [['aguardando', 'Checked in'], ['banho', 'Bathing'], ['secagem', 'Drying & trim'], ['pronto', 'Ready for pickup']];
const EXAME_ST = { solicitado: ['Ordered', 'selo-aguardando'], coletado: ['Sample taken', 'selo-chegou'], pronto: ['Results ready', 'selo-pronto'] };

// ---------------------------------------------------------------- sample data (fictional people, 555-01xx phone numbers)
function exemplo() {
  const h = hoje();
  const tutores = [
    ['t1', 'Sarah Mitchell', '5125550111', '214 Maple Ave'], ['t2', 'Michael Carter', '5125550112', '845 Cedar Lane'], ['t3', 'Emily Rogers', '5125550113', '33 Pine Street'],
    ['t4', 'James Parker', '5125550114', '1020 Elm Drive'], ['t5', 'Olivia Bennett', '5125550115', '77 Willow Court'], ['t6', 'Robert Sanders', '5125550116', '400 Lakeview Blvd'], ['t7', 'Megan Taylor', '5125550117', '512 Birch Road'],
  ].map(([id, nome, tel, end]) => ({ id, nome, tel, end }));
  const pet = (id, tutor, nome, foto, especie, raca, sexo, diasNasc, castrado, pesos, extra = {}) => ({ id, tutor, nome, especie, raca, sexo, nasc: maisDias(h, diasNasc), castrado, alergias: '', pelagem: '', microchip: '', obs: '', foto: `${FOTOS}${foto}.webp`, pesos: pesos.map(([d, kg]) => ({ data: maisDias(h, d), kg })), ...extra });
  const pets = [
    pet('p1', 't1', 'Buddy', 'thor', 'cao', 'Golden Retriever', 'Male', -1460 + 3, true, [[-240, 68.8], [-150, 70.5], [-60, 72.3], [-10, 73.6]], { alergias: 'Metamizole', pelagem: 'Golden', microchip: '000 000 000 000 001' }),
    pet('p2', 't1', 'Ginger', 'mel', 'gato', 'Domestic shorthair', 'Female', -900, true, [[-200, 8.6], [-90, 9.0], [-20, 9.3]], { pelagem: 'Orange tabby' }),
    pet('p3', 't2', 'Teddy', 'bob', 'cao', 'Shih Tzu', 'Male', -2900, false, [[-300, 17.2], [-120, 18.5], [-15, 19.6]], { pelagem: 'Cream' }),
    pet('p4', 't3', 'Luna', 'luna', 'cao', 'Border Collie', 'Female', -220, false, [[-120, 13.7], [-60, 23.1], [-5, 28.9]], { pelagem: 'Tricolor' }),
    pet('p5', 't4', 'Snowball', 'nina', 'gato', 'Persian', 'Female', -1800 + 5, true, [[-180, 10.6], [-30, 9.9]], { alergias: 'Chicken-based food', pelagem: 'White' }),
    pet('p6', 't5', 'Clover', 'pipoca', 'outro', 'Dwarf rabbit', 'Female', -500, false, [[-100, 3.5], [-30, 3.7]], { pelagem: 'Caramel' }),
    pet('p7', 't6', 'Max', 'max', 'cao', 'German Shepherd', 'Male', -3300, true, [[-200, 79.4], [-60, 75.4], [-3, 73.0]], { pelagem: 'Black and tan', microchip: '000 000 000 000 002' }),
    pet('p8', 't7', 'Oreo', 'frajola', 'gato', 'Domestic shorthair', 'Male', -120, false, [[-60, 2.6], [-20, 4.2]], { pelagem: 'Black and white' }),
    pet('p9', 't2', 'Coco', 'amora', 'cao', 'Lhasa Apso', 'Female', -1100, true, [[-90, 13.2], [-30, 13.4]], { pelagem: 'Brown' }),
  ];
  const ag = (d, hora, p, tipo, vet, status = 'aguardando') => ({ id: uid(), data: maisDias(h, d), hora, pet: p, tipo, vet, status: d < 0 ? 'pronto' : status, valor: TIPOS[tipo] ?? 0 });
  const PA = 'Dr. Paula Andrews', RM = 'Dr. Ryan Moore';
  const agenda = [
    ag(0, '08:30', 'p3', 'Consultation', PA, 'pronto'), ag(0, '09:00', 'p4', 'Vaccine', RM, 'pronto'), ag(0, '09:30', 'p1', 'Recheck', PA, 'atendimento'), ag(0, '10:00', 'p8', 'Vaccine', RM, 'chegou'),
    ag(0, '11:00', 'p9', 'Consultation', PA), ag(0, '14:00', 'p6', 'Consultation', RM), ag(0, '15:30', 'p2', 'Lab test', PA),
    ag(1, '09:00', 'p7', 'Recheck', RM), ag(1, '10:30', 'p5', 'Consultation', PA), ag(1, '14:00', 'p4', 'Surgery', RM), ag(2, '08:30', 'p9', 'Vaccine', PA), ag(2, '16:00', 'p1', 'Consultation', RM),
    ag(3, '09:30', 'p2', 'Recheck', PA), ag(4, '11:00', 'p3', 'Lab test', RM), ag(5, '10:00', 'p8', 'Vaccine', PA),
  ];
  const pr = (p, d, vet, queixa, ex, diag, presc) => ({ id: uid(), pet: p, data: maisDias(h, d), vet, queixa, exame: ex, diagnostico: diag, prescricao: presc });
  const prontuarios = [
    pr('p1', -10, PA, 'Intense ear scratching for 5 days.', { peso: 73.6, temp: 101.5, fc: 96, fr: 24 }, 'Bilateral otitis externa.', 'Ear cleaning twice a day for 10 days. Antifungal ear drops: 5 drops in each ear, twice a day, for 7 days. Recheck in 10 days.'),
    pr('p1', -150, RM, 'Annual wellness exam.', { peso: 70.5, temp: 101.3, fc: 90, fr: 22 }, 'Healthy.', 'Keep vaccines up to date. Brush teeth 3 times a week.'),
    pr('p3', 0, PA, 'Dry cough for a week, worse at night.', { peso: 19.6, temp: 102.0, fc: 120, fr: 32 }, 'Suspected infectious tracheobronchitis (kennel cough).', 'Cough syrup 2 ml twice a day for 7 days. Use a harness instead of a collar. Come back if it gets worse.'),
    pr('p7', -3, RM, 'Weight loss and drinking a lot of water.', { peso: 73.0, temp: 101.1, fc: 88, fr: 22 }, 'Kidney disease work-up; lab tests ordered.', 'CBC, chemistry panel (BUN, creatinine) and urinalysis. Renal diet until results are in.'),
    pr('p5', -30, PA, 'Occasional vomiting after meals.', { peso: 9.9, temp: 101.7, fc: 180, fr: 28 }, 'Likely food allergy.', 'Switch to a hypoallergenic, chicken-free diet. Recheck in 30 days.'),
  ];
  const vc = (p, nome, d, prox, lote) => ({ id: uid(), pet: p, nome, data: maisDias(h, d), proxima: prox == null ? null : maisDias(h, prox), lote });
  const vacinas = [
    vc('p1', 'DHPP', -358, 7, 'DHPP-2391'), vc('p1', 'Rabies', -340, 25, 'RAB-7710'), vc('p2', 'FVRCP', -370, -5, 'FVR-1180'),
    vc('p3', 'DHPP', -200, 165, 'DHPP-2391'), vc('p3', 'Bordetella', -362, 3, 'BOR-5502'), vc('p4', 'DHPP (1st dose)', -21, null, 'DHPP-2391'), vc('p4', 'DHPP (2nd dose)', 0, 21, 'DHPP-2402'),
    vc('p5', 'FVRCP', -330, 35, 'FVR-1180'), vc('p7', 'Rabies', -400, -35, 'RAB-7701'), vc('p8', 'FVRCP (1st dose)', -21, 0, 'FVR-1192'),
    vc('p9', 'Dewormer', -88, 2, 'DWM-310'), vc('p6', 'Dewormer', -60, 30, 'DWM-310'),
  ];
  const dose = (hora, remedio, feita = false) => ({ hora, remedio, feita });
  const internados = [
    { id: uid(), pet: 'p7', baia: 'Kennel 2', motivo: 'Dehydration; kidney work-up', entrada: maisDias(h, -1), doses: [dose('06:00', 'IV saline 500 ml', true), dose('08:00', 'Omeprazole 20 mg', true), dose('12:00', 'IV saline 500 ml'), dose('14:00', 'Anti-nausea 1 ml SC'), dose('20:00', 'Omeprazole 20 mg')] },
    { id: uid(), pet: 'p3', baia: 'Kennel 4', motivo: 'Observation after coughing episode', entrada: h, doses: [dose('10:00', 'Saline nebulization 10 min', true), dose('16:00', 'Saline nebulization 10 min'), dose('22:00', 'Cough syrup 2 ml')] },
  ];
  const estetica = [
    { id: uid(), data: h, hora: '08:00', pet: 'p5', servico: 'Bath & grooming', status: 'secagem', obs: 'Scissor cut; pink bow' },
    { id: uid(), data: h, hora: '09:00', pet: 'p9', servico: 'Bath', status: 'banho', obs: 'Hypoallergenic shampoo' },
    { id: uid(), data: h, hora: '10:30', pet: 'p3', servico: 'Sanitary trim', status: 'aguardando', obs: '' },
    { id: uid(), data: h, hora: '07:30', pet: 'p2', servico: 'Bath', status: 'pronto', obs: '' },
  ];
  const ex = (p, nome, d, status, resultado = '') => ({ id: uid(), pet: p, nome, data: maisDias(h, d), status, resultado, lab: 'VetLab Diagnostics' });
  const exames = [
    ex('p7', 'CBC (complete blood count)', -3, 'pronto', 'Mild anemia (HCT 34%). White cells normal.'), ex('p7', 'Chemistry panel (kidney)', -3, 'pronto', 'BUN 98 mg/dL (high); creatinine 2.4 mg/dL (high). Consistent with stage 2 kidney disease.'),
    ex('p7', 'Urinalysis', -3, 'coletado'), ex('p3', 'Chest X-ray', 0, 'solicitado'), ex('p2', 'CBC (complete blood count)', 0, 'solicitado'),
  ];
  const it = (nome, tipo, qtd, minimo, lote, val, preco, custo) => ({ id: uid(), nome, tipo, qtd, minimo, lote, validade: maisDias(h, val), preco, custo });
  const estoque = [
    it('DHPP vaccine', 'Vaccine', 14, 10, 'DHPP-2402', 210, 35, 12), it('Rabies vaccine', 'Vaccine', 6, 8, 'RAB-7710', 160, 30, 9), it('FVRCP vaccine', 'Vaccine', 9, 6, 'FVR-1192', 18, 35, 11),
    it('Bordetella vaccine', 'Vaccine', 4, 5, 'BOR-5502', 95, 32, 10), it('Dewormer tablet (dogs up to 25 lb)', 'Medication', 32, 15, 'DWM-310', 420, 12, 4),
    it('Flea & tick chew 22–44 lb', 'Medication', 7, 10, 'FLT-882', 300, 25, 14), it('Omeprazole 20 mg (box)', 'Medication', 3, 4, 'OMP-118', 12, 18, 6), it('Cough syrup', 'Medication', 8, 4, 'CSY-221', 280, 16, 6),
    it('Saline 500 ml', 'Supply', 26, 20, 'SAL-4401', 510, 8, 3), it('Renal diet 4 lb bag', 'Product', 5, 3, 'RND-2209', 140, 42, 26), it('Hypoallergenic shampoo', 'Product', 11, 4, 'SHP-075', 600, 18, 7),
  ];
  // a month of activity for the reports
  const vendas = [];
  const cardapio = [['Wellness exam', 65], ['Bath & grooming', 65], ['Bath', 40], ['CBC (blood count)', 55], ['DHPP vaccine', 35], ['Vaccine administration', 15], ['Flea & tick chew 22–44 lb', 25], ['Ultrasound', 250], ['Renal diet 4 lb bag', 42]];
  let semente = 7; const rnd = () => (semente = (semente * 9301 + 49297) % 233280) / 233280;
  for (let d = -29; d <= -1; d++) {
    if (diaSemana(maisDias(h, d)) === 'Sun') continue;
    const n = 3 + Math.floor(rnd() * 5);
    for (let k = 0; k < n; k++) {
      const itens = [cardapio[Math.floor(rnd() * cardapio.length)]]; if (rnd() > .6) itens.push(cardapio[Math.floor(rnd() * cardapio.length)]);
      vendas.push({ id: uid(), data: maisDias(h, d), hora: `${String(8 + Math.floor(rnd() * 10)).padStart(2, '0')}:${rnd() > .5 ? '30' : '00'}`, pet: pets[Math.floor(rnd() * pets.length)].id, itens: itens.map(([nome, valor]) => ({ nome, valor, qtd: 1 })), forma: FORMAS[Math.floor(rnd() * 4)], recebido: true });
    }
  }
  vendas.push({ id: uid(), data: maisDias(h, -12), hora: '15:00', pet: 'p7', itens: [{ nome: 'Ultrasound', valor: 250, qtd: 1 }, { nome: 'Chemistry panel (kidney)', valor: 80, qtd: 1 }], forma: FORMAS[4], recebido: false });
  vendas.push({ id: uid(), data: maisDias(h, -5), hora: '11:00', pet: 'p6', itens: [{ nome: 'Wellness exam', valor: 65, qtd: 1 }], forma: FORMAS[4], recebido: false });
  vendas.push({ id: uid(), data: h, hora: '08:55', pet: 'p3', itens: [{ nome: 'Wellness exam', valor: 65, qtd: 1 }, { nome: 'Cough syrup', valor: 16, qtd: 1 }], forma: 'Credit card', recebido: true });
  vendas.push({ id: uid(), data: h, hora: '09:25', pet: 'p4', itens: [{ nome: 'DHPP vaccine', valor: 35, qtd: 1 }, { nome: 'Vaccine administration', valor: 15, qtd: 1 }], forma: 'Debit card', recebido: true });
  return { clinica: 'Riverside Animal Clinic', config: configPadrao(), vets: [PA, RM, 'Grooming team'], tutores, pets, agenda, prontuarios, vacinas, internados, estetica, exames, estoque, vendas };
}
function configPadrao() {
  return { conta: { nome: 'Paula Andrews', email: 'paula@example.com', cargo: 'Owner and medical director', plano: 'VetNature · demo' },
    cnpj: '00-0000000', telefone: '5125550100', endereco: '1200 Oak Street', cidade: 'Austin, TX', crmv: 'License #00000', dea: 'AB0000000',
    horario: 'Mon–Fri 8 AM–6 PM · Sat 8 AM–12 PM', diaria: 95, servicos: SERVICOS_PADRAO.map((x) => [...x]),
    ia: { modo: 'nossa', provedor: 'openai', modelo: '' } };
}
const MODELOS_AVISO = {
  vacina: "Hi {owner}, this is {clinic}. {pet}'s {vaccine} vaccine {status}. Reply to this text and we'll book a time.",
  consulta: "Hi {owner}, a reminder from {clinic}: {pet}'s {type} is on {day}, {date} at {time}. Can't make it? Just reply here.",
  aniversario: 'Hi {owner}! Everyone at {clinic} wishes {pet} a very happy birthday! 🎉',
  exame: "Hi {owner}, {pet}'s {test} results are in. Would you like to book a recheck so the doctor can go over them?",
};
function completar(d) {
  if (!d.config) d.config = configPadrao();
  const c = d.config, h = hoje(), vets = d.vets.filter((v) => v.startsWith('Dr'));
  c.avisos ??= { ligado: true, hora: '09:00', vacina: 7, consulta: 1, aniversario: true, exame: true, modelos: { ...MODELOS_AVISO } };
  c.agendaOnline ??= { ligado: true, inicio: '08:00', fim: '18:00', intervalo: 30, sabado: true, tipos: ['Consultation', 'Vaccine', 'Bath & grooming'] };
  c.comissoes ??= Object.fromEntries(d.vets.map((v) => [v, v.startsWith('Dr') ? 10 : 30]));
  c.fiscal ??= { taxa: 8.25, proxima: 1001 };
  c.pacotes ??= [
    { id: 'pk1', tipo: 'pacote', nome: '4 baths', servico: 'Bath', qtd: 4, valor: 140, dias: 60 },
    { id: 'pk2', tipo: 'pacote', nome: '4 baths & grooming', servico: 'Bath & grooming', qtd: 4, valor: 230, dias: 60 },
    { id: 'pl1', tipo: 'plano', nome: 'Wellness Plan Basic', valor: 39, desconto: 10, inclui: '1 exam per month and 10% off vaccines and lab tests' },
    { id: 'pl2', tipo: 'plano', nome: 'Wellness Plan Plus', valor: 69, desconto: 20, inclui: 'Unlimited exams, 1 bath per month and 20% off vaccines and lab tests' },
  ];
  d.avisosEnviados ??= []; d.pedidos ??= [];
  if (!d.contratos) {
    const m = (id) => c.pacotes.find((x) => x.id === id), ct = (p, id, extra) => d.pets.some((x) => x.id === p) && m(id) ? [{ id: uid(), pet: p, modelo: id, tipo: m(id).tipo, nome: m(id).nome, servico: m(id).servico, qtd: m(id).qtd, valor: m(id).valor, desconto: m(id).desconto, ativo: true, ...extra }] : [];
    d.contratos = [...ct('p5', 'pk2', { usados: 1, inicio: maisDias(h, -20), validade: maisDias(h, 40) }), ...ct('p9', 'pk1', { usados: 2, inicio: maisDias(h, -30), validade: maisDias(h, 30) }),
      ...ct('p1', 'pl1', { inicio: maisDias(h, -25), proxima: maisDias(h, 5) }), ...ct('p7', 'pl2', { inicio: maisDias(h, -40), proxima: maisDias(h, -10) })];
  }
  d.vendas.forEach((v, i) => { if (v.vet === undefined) v.vet = v.itens.some((x) => ehEstetica(x.nome)) ? (d.vets.find((x) => !x.startsWith('Dr')) || '') : (vets[i % Math.max(1, vets.length)] || ''); });
  d.exames.forEach((e) => { e.anexos ??= []; });
  const hemo = d.exames.find((e) => e.pet === 'p7' && e.nome.startsWith('CBC') && e.status === 'pronto');
  if (hemo && !hemo.anexos.length && !d.anexoExemplo) { d.anexoExemplo = true; hemo.anexos.push({ nome: 'cbc-report-max.svg', dados: laudoExemplo() }); }
  return d;
}
function laudoExemplo() {
  const l = [['Red blood cells', '5.9 M/µL', '5.5 – 8.5'], ['Hematocrit', '34%', '37 – 55'], ['Hemoglobin', '11.8 g/dL', '12 – 18'], ['White blood cells', '9,800/µL', '6,000 – 17,000'], ['Platelets', '310,000/µL', '200,000 – 500,000']];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="420" viewBox="0 0 620 420" font-family="Arial"><rect width="620" height="420" fill="#fff"/><rect width="620" height="64" fill="#214e45"/><text x="24" y="40" fill="#fff" font-size="22" font-weight="bold">VetLab Diagnostics · Report</text><text x="24" y="100" font-size="15">Patient: Max · canine · German Shepherd · owner Robert Sanders</text><text x="24" y="124" font-size="15">Test: CBC (complete blood count)</text>${l.map(([n, v, r], i) => `<text x="24" y="${170 + i * 34}" font-size="15">${n}</text><text x="250" y="${170 + i * 34}" font-size="15" font-weight="bold">${v}</text><text x="420" y="${170 + i * 34}" font-size="13" fill="#666">ref. ${r}</text>`).join('')}<text x="24" y="370" font-size="14">Conclusion: mild anemia. White cells normal.</text><text x="24" y="398" font-size="12" fill="#666">Sample document for the demo</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}
let db = (() => { try { return JSON.parse(localStorage.getItem(CHAVE)) || exemplo(); } catch { return exemplo(); } })();
completar(db);
const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { avisar('The browser ran out of space for the demo. Use "Reset" or smaller photos.'); } };

// ---------------------------------------------------------------- state and helpers
const est = { cfg: 'conta', chat: [], secao: 'hoje', sel: null, aba: 'resumo', filtroVac: '30', busca: '', dia: hoje(), tutor: null };
const pet = (id) => db.pets.find((p) => p.id === id);
const tutorDe = (p) => db.tutores.find((t) => t.id === p?.tutor);
const pesoAtual = (p) => (p.pesos.length ? p.pesos[p.pesos.length - 1].kg : null);
const avatar = (p, cls = '') => `<div class="avatar ${cls}">${p?.foto ? `<img src="${esc(p.foto)}" alt="Photo of ${esc(p.nome)}" loading="lazy">` : IC[p?.especie] || IC.outro}</div>`;
const avisar = (t) => { const el = document.createElement('div'); el.className = 'aviso'; el.textContent = t; $('#avisos').append(el); setTimeout(() => el.remove(), 3400); };
const zap = (tel, msg) => `sms:+1${soDigitos(tel).replace(/^1(?=\d{10}$)/, '')}?&body=${encodeURIComponent(msg)}`;
const vacPendentes = () => db.vacinas.filter((v) => v.proxima && diasAte(v.proxima) <= 7);
const total = (v) => v.itens.reduce((s, i) => s + i.valor * i.qtd, 0);
const aReceber = (tutorId) => db.vendas.filter((v) => !v.recebido && (!tutorId || tutorDe(pet(v.pet))?.id === tutorId));
const aniversariantes = () => db.pets.map((p) => { const [, m, d] = p.nasc.split('-'); let a = `${hoje().slice(0, 4)}-${m}-${d}`; if (diasAte(a) < 0) a = `${Number(hoje().slice(0, 4)) + 1}-${m}-${d}`; return { p, data: a, dias: diasAte(a) }; }).filter((x) => x.dias <= 7).sort((a, b) => a.dias - b.dias);
const s = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// ---------------------------------------------------------------- top bar
function topo() {
  $('#clinica').textContent = db.clinica;
  const contas = { vacinas: vacPendentes().length, internacao: db.internados.reduce((n, i) => n + i.doses.filter((d) => !d.feita && d.hora <= horaAgora()).length, 0), estoque: db.estoque.filter((x) => x.qtd < x.minimo || diasAte(x.validade) <= 30).length, exames: db.exames.filter((e) => e.status === 'pronto' && !e.avisado).length, estetica: db.estetica.filter((e) => e.data === hoje() && e.status === 'pronto').length, agenda: db.pedidos.filter((x) => x.status === 'novo').length, avisos: filaAvisos().length, pacotes: db.contratos.filter((x) => x.ativo && x.tipo === 'plano' && diasAte(x.proxima) < 0).length };
  $('#secoes').innerHTML = SECOES.map(([k, n]) => `<a href="#${k}" data-secao="${k}" ${est.secao === k ? 'aria-current="page"' : ''}>${IC[k]}${n}${contas[k] ? `<span class="conta">${contas[k]}</span>` : ''}</a>`).join('');
  $('.conta-bt').textContent = (db.config.conta.nome || 'PA').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------- TODAY
function telaHoje() {
  const h = hoje(), ag = db.agenda.filter((a) => a.data === h).sort((a, b) => a.hora.localeCompare(b.hora));
  if (!est.sel || !ag.some((a) => a.pet === est.sel)) est.sel = (ag.find((a) => a.status === 'atendimento') || ag.find((a) => a.status !== 'pronto') || ag[0])?.pet || null;
  const espera = ag.filter((a) => a.status === 'chegou').length, feitos = ag.filter((a) => a.status === 'pronto').length;
  const caixa = db.vendas.filter((v) => v.data === h && v.recebido).reduce((s2, v) => s2 + total(v), 0);
  let turnoAnt = '';
  const fila = ag.map((a) => {
    const p = pet(a.pet), turno = a.hora < '12:00' ? 'MORNING' : 'AFTERNOON', st = STATUS[a.status];
    const cab = turno !== turnoAnt ? `<p class="fila-hora">${turno}</p>` : ''; turnoAnt = turno;
    return `${cab}<button type="button" class="vez" data-sel="${p.id}" aria-pressed="${est.sel === p.id}"><time>${hora12(a.hora)}</time><span class="vez-pet">${avatar(p, 'mini')}<span><b>${esc(p.nome)}</b><small>${esc(tutorDe(p)?.nome)} · <span class="tipo">${esc(a.tipo)}</span></small></span></span><span class="selo ${st[1]}">${st[0]}</span></button>`;
  }).join('');
  const aniv = aniversariantes();
  return `<div class="cab"><div><h1>${saudacao()}, team</h1><p>${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · ${s(ag.length, 'appointment', 'appointments')} today</p></div></div>
  <div class="numeros"><div class="numero destaque"><span>In the waiting room</span><b>${espera}</b></div><div class="numero"><span>Seen today</span><b>${feitos} of ${ag.length}</b></div><div class="numero"><span>Vaccines due in 7 days</span><b>${vacPendentes().length}</b></div><div class="numero"><span>Collected today</span><b>${reais(caixa)}</b></div></div>
  ${aniv.length ? `<div class="faixa-aniv">${aniv.map(({ p, dias }) => `<div class="aniv">${avatar(p, 'mini')}<span><b>${esc(p.nome)}</b> turns ${idade(maisDias(p.nasc, -dias))} ${dias === 0 ? 'today' : dias === 1 ? 'tomorrow' : `in ${dias} days`}</span><a class="bt bt-peq bt-zap" href="${zap(tutorDe(p)?.tel, `Hi ${primeiro(tutorDe(p)?.nome)}! Everyone at ${db.clinica} wishes ${p.nome} a very happy birthday! 🎉`)}">Send wishes</a></div>`).join('')}</div>` : ''}
  <div class="mesa"><section class="fila" aria-label="Today's queue">${fila || '<p class="vazio">No appointments today.</p>'}</section>${est.sel ? ficha(est.sel, ag.find((a) => a.pet === est.sel && a.status !== 'pronto') || ag.find((a) => a.pet === est.sel)) : ''}</div>`;
}

// ---------------------------------------------------------------- PATIENT RECORD
function ficha(id, atend) {
  const p = pet(id); if (!p) return '';
  const t = tutorDe(p), int = db.internados.find((i) => i.pet === id);
  const vencidas = db.vacinas.filter((v) => v.pet === id && v.proxima && diasAte(v.proxima) < 0);
  const deve = aReceber(t?.id).reduce((s2, v) => s2 + total(v), 0);
  const marc = [p.castrado ? `<span class="selo selo-aguardando">${p.sexo === 'Female' ? 'Spayed' : 'Neutered'}</span>` : '', p.alergias ? `<span class="selo selo-alerta">Allergy: ${esc(p.alergias)}</span>` : '', int ? `<span class="selo selo-atendimento">Hospitalized · ${esc(int.baia)}</span>` : '', vencidas.length ? `<span class="selo selo-alerta">${s(vencidas.length, 'vaccine', 'vaccines')} overdue</span>` : '', deve ? `<span class="selo selo-chegou">Client owes ${reais(deve)}</span>` : '', ...contratosDo(id).map((x) => `<span class="selo selo-pronto">${x.tipo === 'plano' ? esc(x.nome) : `Package ${esc(x.nome)}: ${x.usados} of ${x.qtd} used`}</span>`)].join('');
  const prox = atend && { aguardando: ['chegou', 'Check in'], chegou: ['atendimento', 'Start exam'], atendimento: ['pronto', 'Finish and record'] }[atend.status];
  const abas = [['resumo', 'Summary'], ['prontuario', 'Medical record'], ['vacinas', 'Vaccines'], ['exames', 'Lab'], ['peso', 'Weight'], ['documentos', 'Documents']];
  return `<section class="cartao ficha" aria-label="Record of ${esc(p.nome)}">
    <div class="ficha-topo"><button type="button" class="foto-pet" data-foto="${p.id}" title="Change photo">${avatar(p, 'grande')}<span>${IC.camera}</span></button><div><h2>${esc(p.nome)}</h2><p>${esc(p.raca)} · ${esc(p.sexo)} · ${idade(p.nasc)} · ${pesoAtual(p) ?? '—'} lb</p><div class="marcadores">${marc}</div></div>
      <div class="acoes">${prox ? `<button class="bt bt-pri" data-avancar="${atend.id}" data-para="${prox[0]}">${prox[1]}</button>` : ''}<button class="bt" data-prontuario="${p.id}">New visit</button><button class="bt" data-cobrar="${p.id}">Check out</button></div></div>
    <div class="abas" role="tablist">${abas.map(([k, n]) => `<button type="button" role="tab" data-aba="${k}" aria-selected="${est.aba === k}">${n}</button>`).join('')}</div>
    <div class="cartao-corpo">${({ resumo: abaResumo, prontuario: abaProntuario, vacinas: abaVacinas, exames: abaExames, peso: abaPeso, documentos: abaDocumentos })[est.aba](p, t)}</div></section>`;
}
function abaResumo(p, t) {
  const ult = db.prontuarios.filter((x) => x.pet === p.id).sort((a, b) => b.data.localeCompare(a.data))[0];
  const prox = db.vacinas.filter((v) => v.pet === p.id && v.proxima).sort((a, b) => a.proxima.localeCompare(b.proxima))[0];
  const proxAg = db.agenda.filter((a) => a.pet === p.id && a.data > hoje()).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))[0];
  return `<div class="dados"><div><span>Owner</span><b><button class="link" data-ver-tutor="${t?.id}">${esc(t?.nome)}</button></b></div><div><span>Mobile</span><b>${esc(telBR(t?.tel))}</b></div><div><span>Species</span><b>${({ cao: 'Dog', gato: 'Cat' })[p.especie] || 'Other'}</b></div>
    <div><span>Date of birth</span><b>${dataBR(p.nasc)}</b></div><div><span>Coat</span><b>${esc(p.pelagem || '—')}</b></div><div><span>Microchip</span><b>${esc(p.microchip || '—')}</b></div>
    <div><span>Last visit</span><b>${ult ? dataBR(ult.data) : '—'}</b></div><div><span>Next vaccine</span><b>${prox ? `${esc(prox.nome)} · ${dataBR(prox.proxima)}` : '—'}</b></div><div><span>Next appointment</span><b>${proxAg ? `${dataBR(proxAg.data)} at ${hora12(proxAg.hora)} · ${esc(proxAg.tipo)}` : '—'}</b></div></div>
    ${p.obs ? `<p class="nota">${esc(p.obs)}</p>` : ''}
    ${ult ? `<h3 class="sub-tit">Latest note</h3><p style="margin:0;color:var(--texto-2)"><b style="color:var(--texto)">${esc(ult.diagnostico)}</b> ${esc(ult.prescricao)}</p>` : ''}
    <div class="acoes" style="margin-top:16px"><a class="bt bt-zap" href="${zap(t?.tel, `Hi ${primeiro(t?.nome)}, this is ${db.clinica}. Just checking in about ${p.nome}.`)}">Text the owner</a><button class="bt" data-editar-pet="${p.id}">Edit details</button><button class="bt" data-agendar="${p.id}">Book</button><button class="bt" data-pedir-exame="${p.id}">Order lab test</button><button class="bt" data-banho="${p.id}">Grooming</button>${db.internados.some((i) => i.pet === p.id) ? '' : `<button class="bt" data-internar="${p.id}">Hospitalize</button>`}</div>`;
}
function abaProntuario(p) {
  const l = db.prontuarios.filter((x) => x.pet === p.id).sort((a, b) => b.data.localeCompare(a.data));
  return l.length ? `<ol class="linha-tempo">${l.map((x) => `<li><time>${dataBR(x.data)}</time><div><b>${esc(x.diagnostico)}</b><p style="margin:2px 0 4px;color:var(--texto-2)">${esc(x.queixa)}</p><small style="color:var(--texto-3)">${esc(x.vet)} · ${x.exame.peso ?? '—'} lb · ${x.exame.temp ?? '—'} °F · HR ${x.exame.fc ?? '—'} · RR ${x.exame.fr ?? '—'}</small><p style="margin:6px 0 0;white-space:pre-wrap">${esc(x.prescricao)}</p><span class="acoes" style="margin-top:8px"><button class="bt bt-peq" data-receita="${x.id}">Print prescription</button><button class="bt bt-peq" data-receita-controle="${p.id}:${x.id}">Controlled substance Rx</button></span></div></li>`).join('')}</ol>` : '<p class="vazio">No visits recorded yet.</p>';
}
function abaVacinas(p, t) {
  const l = db.vacinas.filter((v) => v.pet === p.id).sort((a, b) => b.data.localeCompare(a.data));
  return `${l.length ? `<table class="tabela empilha"><thead><tr><th>Vaccine</th><th>Given</th><th>Lot</th><th>Next dose</th><th></th></tr></thead><tbody>${l.map((v) => `<tr><td><b>${esc(v.nome)}</b></td><td>${dataBR(v.data)}</td><td>${esc(v.lote)}</td><td>${v.proxima ? selVac(v) : '—'}</td><td>${v.proxima && diasAte(v.proxima) <= 30 ? `<a class="bt bt-peq bt-zap" href="${zap(t?.tel, lembrete(v))}">Remind</a>` : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="vazio">No vaccines recorded.</p>'}
    <div class="acoes" style="margin-top:14px"><button class="bt bt-pri" data-aplicar="${p.id}">Record vaccine given</button><button class="bt" data-vacina-manual="${p.id}">Add past or outside vaccine</button><button class="bt" data-carteira="${p.id}">Print vaccination record</button></div>`;
}
function abaExames(p) {
  const l = db.exames.filter((e) => e.pet === p.id).sort((a, b) => b.data.localeCompare(a.data));
  return `${l.length ? `<ul class="lista-exames">${l.map(linhaExame).join('')}</ul>` : '<p class="vazio">No lab tests ordered.</p>'}<div class="acoes" style="margin-top:14px"><button class="bt bt-pri" data-pedir-exame="${p.id}">Order lab test</button></div>`;
}
function abaPeso(p) {
  if (p.pesos.length < 2) return '<p class="vazio">Record at least two weights to see the curve.</p>';
  const w = 560, hh = 130, pad = 26, kg = p.pesos.map((x) => x.kg), min = Math.min(...kg), max = Math.max(...kg), r = max - min || 1;
  const pts = p.pesos.map((x, i) => [pad + (i * (w - pad * 2)) / (p.pesos.length - 1), hh - pad - ((x.kg - min) / r) * (hh - pad * 2)]);
  const dif = kg[kg.length - 1] - kg[0];
  return `<p style="margin:0 0 8px">${dif >= 0 ? 'Gained' : 'Lost'} <b>${Math.abs(dif).toFixed(1)} lb</b> since ${dataBR(p.pesos[0].data)}.</p>
    <svg class="peso-grafico" viewBox="0 0 ${w} ${hh}" role="img" aria-label="Weight curve of ${esc(p.nome)}"><polyline points="${pts.map((x) => x.join(',')).join(' ')}"/>${pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4"/><text x="${x}" y="${y - 9}" text-anchor="middle">${kg[i]}</text><text x="${x}" y="${hh - 4}" text-anchor="middle">${dataBR(p.pesos[i].data).slice(0, 5)}</text>`).join('')}</svg>
    <div class="acoes" style="margin-top:10px"><button class="bt" data-pesar="${p.id}">Record weight</button></div>`;
}
function abaDocumentos(p) {
  return `<div class="docs"><button class="doc" data-carteira="${p.id}"><b>Vaccination record</b><small>All vaccines, lots and next doses</small></button>
    <button class="doc" data-termo="${p.id}:cirurgia"><b>Surgery consent form</b><small>Risks, authorization and owner signature</small></button>
    <button class="doc" data-termo="${p.id}:anestesia"><b>Anesthesia and sedation consent</b><small>For procedures under sedation</small></button>
    <button class="doc" data-termo="${p.id}:internacao"><b>Hospitalization consent</b><small>Responsibility, visiting hours and daily rate</small></button>
    <button class="doc" data-atestado="${p.id}"><b>Health certificate</b><small>For travel, boarding or daycare</small></button>
    <button class="doc" data-receita-controle="${p.id}:"><b>Controlled substance prescription</b><small>With prescriber license and DEA number</small></button></div>`;
}
const linhaExame = (e) => { const p = pet(e.pet), st = EXAME_ST[e.status]; return `<li><div><b>${esc(e.nome)}</b><small>${esc(p?.nome)} · ordered ${dataBR(e.data)} · ${esc(e.lab)}</small>${e.resultado ? `<p>${esc(e.resultado)}</p>` : ''}${e.anexos?.length ? `<div class="anexos">${e.anexos.map((x, k) => `<span class="anexo"><button type="button" class="link" data-ver-anexo="${e.id}:${k}">${IC.clipe}${esc(x.nome)}</button><button type="button" class="tirar-anexo" data-tirar-anexo="${e.id}:${k}" aria-label="Remove file ${esc(x.nome)}">×</button></span>`).join('')}</div>` : ''}</div><div class="lado"><span class="selo ${st[1]}">${st[0]}</span><label class="bt bt-peq" title="Attach the lab PDF or a photo of the report">${IC.clipe}Attach<input type="file" accept="image/*,application/pdf" data-anexar="${e.id}" hidden></label>${e.status === 'solicitado' ? `<button class="bt bt-peq" data-coletar="${e.id}">Sample taken</button>` : e.status === 'coletado' ? `<button class="bt bt-peq bt-pri" data-resultado="${e.id}">Enter results</button>` : `<a class="bt bt-peq bt-zap" data-avisado="${e.id}" href="${zap(tutorDe(p)?.tel, `Hi ${primeiro(tutorDe(p)?.nome)}, ${p?.nome}'s ${e.nome} results are in. The doctor will go over them at the recheck. Would you like to book a time?`)}">Text the owner</a>`}</div></li>`; };
const selVac = (v) => { const d = diasAte(v.proxima); return d < 0 ? `<span class="selo selo-alerta">Overdue ${s(-d, 'day', 'days')}</span>` : d <= 7 ? `<span class="selo selo-chegou">${d === 0 ? 'Today' : `In ${s(d, 'day', 'days')}`}</span>` : `<span class="selo selo-aguardando">${dataBR(v.proxima)}</span>`; };
const lembrete = (v) => { const p = pet(v.pet), t = tutorDe(p), d = diasAte(v.proxima); return `Hi ${primeiro(t?.nome)}, this is ${db.clinica}. ${p.nome}'s ${v.nome} vaccine ${d < 0 ? `was due on ${dataBR(v.proxima)}` : `is due on ${dataBR(v.proxima)}`}. Would you like us to book a quick visit?`; };

// ---------------------------------------------------------------- SCHEDULE (week, by doctor)
function telaAgenda() {
  const ini = maisDias(est.dia, -((new Date(`${est.dia}T12:00:00`).getDay() + 6) % 7)); // Monday
  const dias = Array.from({ length: 6 }, (_, i) => maisDias(ini, i));
  return `<div class="cab"><div><h1>Schedule</h1><p>Week of ${dataBR(dias[0])} to ${dataBR(dias[5])}</p></div><div class="acoes"><button class="bt" data-semana="-7">‹ Previous week</button><button class="bt" data-semana="0">Today</button><button class="bt" data-semana="7">Next ›</button><button class="bt" data-link-agenda>Online booking link</button><button class="bt bt-pri" data-agendar="">+ Book</button></div></div>${blocoPedidos()}
    <div class="semana">${dias.map((d) => { const l = db.agenda.filter((a) => a.data === d).sort((a, b) => a.hora.localeCompare(b.hora)); return `<section class="dia ${d === hoje() ? 'eh-hoje' : ''}"><h2>${diaSemana(d)} <b>${d.slice(8)}</b></h2>${l.map((a) => { const p = pet(a.pet); return `<button type="button" class="hor tipo-${({ Consultation: 'consulta', Recheck: 'retorno', Vaccine: 'vacina', Surgery: 'cirurgia', 'Lab test': 'exame' })[a.tipo] || (ehEstetica(a.tipo) ? 'banho' : 'consulta')}" data-abrir-pet="${p.id}"><time>${hora12(a.hora).replace(' ', '')}</time><span><b>${esc(p.nome)}</b><small>${esc(a.tipo)} · ${esc(a.vet.replace('Grooming team', 'Grooming').replace(/^(Dr\.) (\S+) (\S+).*/, '$1 $3'))}</small></span></button>`; }).join('') || '<p class="vazio">Open</p>'}</section>`; }).join('')}</div>`;
}

// ---------------------------------------------------------------- PATIENTS
function telaPacientes() {
  const q = est.busca.trim().toLowerCase();
  const l = db.pets.filter((p) => !q || `${p.nome} ${tutorDe(p)?.nome} ${p.raca} ${p.microchip}`.toLowerCase().includes(q)).sort((a, b) => a.nome.localeCompare(b.nome));
  return `<div class="cab"><div><h1>Patients</h1><p>${s(db.pets.length, 'pet', 'pets')} from ${s(db.tutores.length, 'client', 'clients')}${q ? ` · searching for “${esc(est.busca)}”` : ''}</p></div><button class="bt bt-pri" data-novo-pet>+ New pet</button></div>
    <div class="mesa"><div class="pets">${l.map((p) => `<button type="button" class="pet" data-sel="${p.id}" aria-pressed="${est.sel === p.id}">${avatar(p)}<div><b>${esc(p.nome)}</b><small>${esc(p.raca)} · ${idade(p.nasc)}<br>${esc(tutorDe(p)?.nome)}</small></div></button>`).join('') || '<p class="vazio">No pets found.</p>'}</div>
    ${est.sel && pet(est.sel) ? ficha(est.sel) : '<div class="cartao"><p class="vazio">Pick a pet to see the full record.</p></div>'}</div>`;
}

// ---------------------------------------------------------------- CLIENTS
function telaTutores() {
  const t = db.tutores.find((x) => x.id === est.tutor);
  return `<div class="cab"><div><h1>Clients</h1><p>${s(db.tutores.length, 'client', 'clients')} · ${reais(aReceber().reduce((s2, v) => s2 + total(v), 0))} to collect</p></div><button class="bt bt-pri" data-novo-tutor>+ New client</button></div>
    <div class="duas"><section class="cartao"><table class="tabela empilha"><thead><tr><th>Client</th><th>Pets</th><th class="num">Owes</th></tr></thead><tbody>${db.tutores.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((x) => { const ps = db.pets.filter((p) => p.tutor === x.id), deve = aReceber(x.id).reduce((s2, v) => s2 + total(v), 0); return `<tr class="clicavel ${est.tutor === x.id ? 'sel' : ''}" data-ver-tutor="${x.id}"><td><b>${esc(x.nome)}</b><br><small style="color:var(--texto-2)">${esc(telBR(x.tel))}</small></td><td><div class="mini-pets">${ps.map((p) => avatar(p, 'mini')).join('')}</div></td><td class="num">${deve ? `<b style="color:var(--atencao)">${reais(deve)}</b>` : '—'}</td></tr>`; }).join('')}</tbody></table></section>
    ${t ? fichaTutor(t) : '<div class="cartao"><p class="vazio">Pick a client to see their pets, history and balance.</p></div>'}</div>`;
}
function fichaTutor(t) {
  const ps = db.pets.filter((p) => p.tutor === t.id), deve = aReceber(t.id), hist = db.vendas.filter((v) => tutorDe(pet(v.pet))?.id === t.id).sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora)).slice(0, 8);
  return `<section class="cartao"><div class="cartao-cab"><div><h2>${esc(t.nome)}</h2><small style="color:var(--texto-2)">${esc(telBR(t.tel))} · ${esc(t.end || '')}</small></div><div class="acoes"><button class="bt bt-peq" data-editar-tutor="${t.id}">Edit</button><a class="bt bt-peq bt-zap" href="${zap(t.tel, `Hi ${primeiro(t.nome)}, this is ${db.clinica}.`)}">Text</a></div></div>
    <div class="cartao-corpo"><div class="pets">${ps.map((p) => `<button type="button" class="pet" data-abrir-pet="${p.id}">${avatar(p)}<div><b>${esc(p.nome)}</b><small>${esc(p.raca)} · ${idade(p.nasc)}</small></div></button>`).join('')}</div>
    ${deve.length ? `<h3 class="sub-tit">To collect</h3><ul class="lista-simples">${deve.map((v) => `<li><span>${dataBR(v.data)} · ${v.itens.map((i) => esc(i.nome)).join(', ')}</span><b>${reais(total(v))}</b><button class="bt bt-peq" data-receber="${v.id}">Paid</button></li>`).join('')}</ul><a class="bt bt-peq bt-zap" href="${zap(t.tel, `Hi ${primeiro(t.nome)}, this is ${db.clinica}. There's an open balance of ${reais(deve.reduce((s2, v) => s2 + total(v), 0))} from the visits on ${deve.map((v) => dataBR(v.data)).join(', ')}. You can pay by card at the front desk or over the phone. Thank you!`)}">Payment reminder</a>` : ''}
    <h3 class="sub-tit">Recent visits</h3>${hist.length ? `<ul class="lista-simples">${hist.map((v) => `<li><span>${dataBR(v.data)} · ${esc(pet(v.pet)?.nome)} · ${v.itens.map((i) => esc(i.nome)).join(', ')}</span><b>${reais(total(v))}</b></li>`).join('')}</ul>` : '<p class="vazio">No history yet.</p>'}</div></section>`;
}

// ---------------------------------------------------------------- VACCINES
function telaVacinas() {
  const lim = { 7: 7, 30: 30, 90: 90 }[est.filtroVac];
  const l = db.vacinas.filter((v) => v.proxima && (est.filtroVac === 'vencidas' ? diasAte(v.proxima) < 0 : diasAte(v.proxima) <= lim)).sort((a, b) => a.proxima.localeCompare(b.proxima));
  const filtros = [['vencidas', 'Overdue'], ['7', 'Next 7 days'], ['30', 'Next 30 days'], ['90', 'Next 90 days']];
  return `<div class="cab"><div><h1>Vaccines and dewormers</h1><p>Remind the owner with a ready-made text. One tap and they can book.</p></div>
    <div class="acoes">${filtros.map(([k, n]) => `<button class="bt ${est.filtroVac === k ? 'bt-pri' : ''}" data-filtro-vac="${k}">${n}</button>`).join('')}<button class="bt" data-vacina-manual="">+ Add vaccine</button></div></div>
    <section class="cartao">${l.length ? `<table class="tabela empilha"><thead><tr><th>Pet</th><th>Owner</th><th>Vaccine</th><th>Next dose</th><th></th></tr></thead><tbody>${l.map((v) => { const p = pet(v.pet), t = tutorDe(p); return `<tr><td><span class="com-foto">${avatar(p, 'mini')}<b>${esc(p.nome)}</b></span></td><td>${esc(t?.nome)}</td><td>${esc(v.nome)}</td><td>${selVac(v)}</td><td class="num"><a class="bt bt-peq bt-zap" href="${zap(t?.tel, lembrete(v))}">Text reminder</a> <button class="bt bt-peq" data-agendar-vac="${v.id}">Book</button></td></tr>`; }).join('')}</tbody></table>` : '<p class="vazio">Nothing to remind in this period.</p>'}</section>`;
}

// ---------------------------------------------------------------- HOSPITAL
function telaInternacao() {
  const agora = horaAgora();
  return `<div class="cab"><div><h1>Hospital</h1><p>${s(db.internados.length, 'pet', 'pets')} hospitalized · check off each dose as it's given</p></div><button class="bt bt-pri" data-internar="">+ Admit</button></div>
    ${db.internados.length ? `<div class="baias">${db.internados.map((i) => { const p = pet(i.pet), fe = i.doses.filter((d) => d.feita).length, diarias = Math.max(1, diasAte(hoje()) - diasAte(i.entrada) + 1); return `<section class="cartao"><div class="cartao-cab"><span class="com-foto">${avatar(p, 'mini')}<span><h3 class="baia">${esc(p.nome)}</h3><small style="color:var(--texto-2)">${esc(i.baia)} · since ${dataBR(i.entrada)} · ${s(diarias, 'day', 'days')}</small></span></span><span class="selo selo-atendimento">${fe} of ${i.doses.length} doses</span></div>
      <div class="cartao-corpo"><p style="margin:0;color:var(--texto-2)">${esc(i.motivo)}</p><ul class="doses">${i.doses.map((d, k) => `<li class="${d.feita ? 'feita' : d.hora < agora ? 'atrasada' : ''}"><b>${hora12(d.hora)}</b><span>${esc(d.remedio)}</span>${d.feita ? '<span class="selo selo-pronto">Given</span>' : `<button class="bt bt-peq" data-dose="${i.id}:${k}">Give now</button>`}</li>`).join('')}</ul>
      <div class="acoes" style="margin-top:12px"><button class="bt bt-peq" data-nova-dose="${i.id}">+ Dose</button><button class="bt bt-peq" data-alta="${i.id}">Discharge and bill</button><a class="bt bt-peq bt-zap" href="${zap(tutorDe(p)?.tel, `Hi! An update on ${p.nome}: still with us in ${i.baia}, received ${fe} of ${i.doses.length} medications today and resting under observation. We'll let you know of any change.`)}">Update the owner</a></div></div></section>`; }).join('')}</div>` : '<div class="cartao"><p class="vazio">No pets hospitalized right now.</p></div>'}`;
}

// ---------------------------------------------------------------- GROOMING
function telaEstetica() {
  const l = db.estetica.filter((e) => e.data === hoje());
  return `<div class="cab"><div><h1>Grooming</h1><p>${s(l.length, 'pet', 'pets')} today · move each one to the next step; when ready, text the owner</p></div><button class="bt bt-pri" data-banho="">+ Check in</button></div>
    <div class="quadro">${ESTETICA.map(([k, n], i) => `<section class="coluna"><h2>${n} <small>${l.filter((e) => e.status === k).length}</small></h2>${l.filter((e) => e.status === k).sort((a, b) => a.hora.localeCompare(b.hora)).map((e) => { const p = pet(e.pet); return `<article class="ficha-banho">${avatar(p)}<div><b>${esc(p.nome)}</b><small>${hora12(e.hora)} · ${esc(e.servico)}</small>${e.obs ? `<small class="obs">${esc(e.obs)}</small>` : ''}</div><div class="acoes">${i < ESTETICA.length - 1 ? `<button class="bt bt-peq bt-pri" data-etapa="${e.id}">${ESTETICA[i + 1][1]} ›</button>` : `<a class="bt bt-peq bt-zap" href="${zap(tutorDe(p)?.tel, `Hi ${primeiro(tutorDe(p)?.nome)}! ${p.nome} is all clean and ready for pickup at ${db.clinica}. 🐾`)}">Ready text</a><button class="bt bt-peq" data-entregue="${e.id}">Picked up</button>`}</div></article>`; }).join('') || '<p class="vazio">—</p>'}</section>`).join('')}</div>`;
}

// ---------------------------------------------------------------- LAB
function telaExames() {
  const l = db.exames.slice().sort((a, b) => ['coletado', 'solicitado', 'pronto'].indexOf(a.status) - ['coletado', 'solicitado', 'pronto'].indexOf(b.status) || b.data.localeCompare(a.data));
  return `<div class="cab"><div><h1>Lab tests</h1><p>From order to result: mark the sample, enter the report and text the owner.</p></div><button class="bt bt-pri" data-pedir-exame="">+ Order lab test</button></div>
    <section class="cartao"><ul class="lista-exames">${l.map(linhaExame).join('') || '<p class="vazio">No lab tests.</p>'}</ul></section>`;
}

// ---------------------------------------------------------------- INVENTORY
function telaEstoque() {
  const l = [...db.estoque].sort((a, b) => (alertaItem(b) ? 1 : 0) - (alertaItem(a) ? 1 : 0) || a.nome.localeCompare(b.nome));
  const valor = db.estoque.reduce((s2, x) => s2 + x.qtd * (x.custo || 0), 0);
  return `<div class="cab"><div><h1>Inventory</h1><p>${s(db.estoque.length, 'item', 'items')} · ${reais(valor)} at cost · low stock and expiring items come first</p></div><button class="bt bt-pri" data-novo-item>+ Item</button></div>
    <section class="cartao"><table class="tabela empilha"><thead><tr><th>Item</th><th>Type</th><th>Lot</th><th>Expires</th><th class="num">Qty</th><th class="num">Cost / price</th><th></th></tr></thead><tbody>${l.map((x) => `<tr><td><b>${esc(x.nome)}</b>${alertaItem(x) ? `<br>${alertaItem(x)}` : ''}</td><td>${esc(x.tipo)}</td><td>${esc(x.lote)}</td><td>${dataBR(x.validade)}</td><td class="num"><b>${x.qtd}</b> <small style="color:var(--texto-3)">min. ${x.minimo}</small></td><td class="num">${reais(x.custo)} / ${reais(x.preco)}</td><td class="num"><button class="bt bt-peq" data-entrada="${x.id}">+ Receive</button></td></tr>`).join('')}</tbody></table></section>`;
}
const alertaItem = (x) => { const d = diasAte(x.validade); return d < 0 ? '<span class="selo selo-alerta">Expired</span>' : d <= 30 ? `<span class="selo selo-chegou">Expires in ${s(d, 'day', 'days')}</span>` : x.qtd < x.minimo ? '<span class="selo selo-alerta">Below minimum</span>' : ''; };

// ---------------------------------------------------------------- CHECKOUT
function telaCaixa() {
  const h = hoje(), l = db.vendas.filter((v) => v.data === h).sort((a, b) => b.hora.localeCompare(a.hora));
  const formas = {}; l.forEach((v) => { formas[v.forma] = (formas[v.forma] || 0) + total(v); });
  const pend = aReceber();
  return `<div class="cab"><div><h1>Today's checkout</h1><p>${s(l.length, 'sale', 'sales')} today · ${reais(pend.reduce((s2, v) => s2 + total(v), 0))} to collect in total</p></div><button class="bt bt-pri" data-cobrar="">+ New sale</button></div>
    <div class="duas"><section class="cartao"><div class="cartao-cab"><h2>Today's sales</h2></div>${l.length ? `<table class="tabela empilha"><tbody>${l.map((v) => `<tr><td><b>${hora12(v.hora)}</b> · ${esc(pet(v.pet)?.nome || 'Walk-in')}<br><small style="color:var(--texto-2)">${v.itens.map((i) => `${esc(i.nome)}${i.qtd > 1 ? ` ×${i.qtd}` : ''}`).join(', ')}</small></td><td>${esc(v.forma)}</td><td class="num"><b>${reais(total(v))}</b></td><td class="num"><button class="bt bt-peq" data-nfse="${v.id}">${v.nfse ? `Invoice #${v.nfse.numero}` : 'Invoice'}</button></td></tr>`).join('')}</tbody></table>` : '<p class="vazio">No sales yet today.</p>'}</section>
    <div style="display:grid;gap:18px"><section class="cartao"><div class="cartao-cab"><h2>End of day</h2></div><div class="cartao-corpo">${Object.entries(formas).map(([f, v]) => `<div class="linha-valor"><span>${esc(f)}</span><b>${reais(v)}</b></div>`).join('') || '<p class="vazio">No amounts yet.</p>'}</div><div class="total"><span>Collected today</span><b>${reais(l.filter((v) => v.recebido).reduce((s2, v) => s2 + total(v), 0))}</b></div></section>
    <section class="cartao"><div class="cartao-cab"><h2>Open balances</h2></div><div class="cartao-corpo">${pend.length ? `<ul class="lista-simples">${pend.map((v) => `<li><span>${dataBR(v.data)} · ${esc(tutorDe(pet(v.pet))?.nome || 'Walk-in')}</span><b>${reais(total(v))}</b><button class="bt bt-peq" data-receber="${v.id}">Paid</button></li>`).join('')}</ul>` : '<p class="vazio">Nobody owes anything.</p>'}</div></section></div></div>`;
}

// ---------------------------------------------------------------- REPORTS
function telaRelatorios() {
  const ini = maisDias(hoje(), -29), l = db.vendas.filter((v) => v.data >= ini && v.recebido);
  const dias = Array.from({ length: 30 }, (_, i) => maisDias(ini, i)), porDia = dias.map((d) => l.filter((v) => v.data === d).reduce((s2, v) => s2 + total(v), 0));
  const fat = porDia.reduce((s2, x) => s2 + x, 0), max = Math.max(...porDia, 1), ticket = l.length ? fat / l.length : 0;
  const serv = {}; l.forEach((v) => v.itens.forEach((i) => { serv[i.nome] = (serv[i.nome] || 0) + i.valor * i.qtd; }));
  const top = Object.entries(serv).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const formas = {}; l.forEach((v) => { formas[v.forma] = (formas[v.forma] || 0) + total(v); });
  const vacMes = db.vacinas.filter((v) => v.data >= ini).length, consMes = db.prontuarios.filter((p) => p.data >= ini).length;
  const W = 720, H = 160;
  return `<div class="cab"><div><h1>Reports</h1><p>Last 30 days (${dataBR(ini)} to ${dataBR(hoje())})</p></div></div>
    <div class="numeros"><div class="numero destaque"><span>Revenue collected</span><b>${reais(fat)}</b></div><div class="numero"><span>Paid visits</span><b>${l.length}</b></div><div class="numero"><span>Average ticket</span><b>${reais(ticket)}</b></div><div class="numero"><span>Vaccines · visits</span><b>${vacMes} · ${consMes}</b></div></div>
    <section class="cartao"><div class="cartao-cab"><h2>Revenue per day</h2></div><div class="cartao-corpo"><svg class="barras" viewBox="0 0 ${W} ${H + 22}" role="img" aria-label="Revenue per day for the last 30 days">${porDia.map((v, i) => { const bw = W / 30 - 4, bh = Math.max(v ? 3 : 0, (v / max) * H), x = i * (W / 30) + 2; return `<rect x="${x}" y="${H - bh}" width="${bw}" height="${bh}" rx="3"><title>${dataBR(dias[i])}: ${reais(v)}</title></rect>${i % 5 === 0 ? `<text x="${i ? x + bw / 2 : x}" y="${H + 16}" text-anchor="${i ? 'middle' : 'start'}">${dataBR(dias[i]).slice(0, 5)}</text>` : ''}`; }).join('')}</svg></div></section>
    <div class="duas" style="margin-top:18px"><section class="cartao"><div class="cartao-cab"><h2>Top sellers</h2></div><div class="cartao-corpo">${top.map(([n, v]) => `<div class="barra-h"><span>${esc(n)}</span><i style="--p:${(v / top[0][1]) * 100}%"></i><b>${reais(v)}</b></div>`).join('')}</div></section>
    <section class="cartao"><div class="cartao-cab"><h2>Payment methods</h2></div><div class="cartao-corpo">${Object.entries(formas).sort((a, b) => b[1] - a[1]).map(([f, v]) => `<div class="linha-valor"><span>${esc(f)}</span><b>${reais(v)} <small style="color:var(--texto-3)">${Math.round((v / fat) * 100)}%</small></b></div>`).join('')}</div></section></div>
    ${cartaoComissoes(l)}`;
}

// ---------------------------------------------------------------- SETTINGS
const CFG = [['conta', 'My account'], ['clinica', 'Clinic'], ['equipe', 'Team'], ['servicos', 'Services and prices'], ['agendamento', 'Online booking'], ['comissoes', 'Commissions'], ['fiscal', 'Invoices and tax'], ['ia', 'AI assistant'], ['dados', 'Backup']];
function telaConfig() {
  const c = db.config;
  const corpo = {
    conta: () => `<form class="cfg-form" data-salvar-cfg="conta"><div class="grade-campos"><label class="campo">Your name<input name="nome" value="${esc(c.conta.nome)}"></label><label class="campo">Login email<input name="email" type="email" value="${esc(c.conta.email)}"></label><label class="campo">Role<input name="cargo" value="${esc(c.conta.cargo)}"></label><label class="campo">Plan<input value="${esc(c.conta.plano)}" disabled></label></div>
      <p class="nota">In the live version every team member signs in with their own email, from computer or phone, and the owner chooses what each person can see or change.</p><div class="acoes"><button class="bt bt-pri">Save</button></div></form>`,
    clinica: () => `<form class="cfg-form" data-salvar-cfg="clinica"><div class="grade-campos"><label class="campo largo">Clinic name<input name="clinica" value="${esc(db.clinica)}"></label><label class="campo">EIN<input name="cnpj" value="${esc(c.cnpj)}"></label><label class="campo">Clinic phone (texts)<input name="telefone" value="${esc(telBR(c.telefone))}"></label>
      <label class="campo largo">Address<input name="endereco" value="${esc(c.endereco)}"></label><label class="campo">City, state<input name="cidade" value="${esc(c.cidade)}"></label><label class="campo">Veterinary license<input name="crmv" value="${esc(c.crmv)}"></label>
      <label class="campo">DEA number<input name="dea" value="${esc(c.dea || '')}"></label><label class="campo">Opening hours<input name="horario" value="${esc(c.horario)}"></label><label class="campo">Hospitalization daily rate ($)<input name="diaria" inputmode="decimal" value="${c.diaria}"></label></div><p class="nota">Name, address and license number are printed on prescriptions, consent forms, certificates and vaccination records.</p><div class="acoes"><button class="bt bt-pri">Save</button></div></form>`,
    equipe: () => `<ul class="lista-simples">${db.vets.map((v, i) => `<li><span><b>${esc(v)}</b></span><span class="selo selo-aguardando">${v.startsWith('Dr') ? 'Veterinarian' : 'Staff'}</span><button class="bt bt-peq bt-perigo" data-tirar-vet="${i}">Remove</button></li>`).join('')}</ul>
      <form class="cfg-form linha-form" data-salvar-cfg="vet"><label class="campo">Name<input name="nome" placeholder="e.g. Dr. Julia Price"></label><label class="campo">Role<select name="tipo"><option value="vet">Veterinarian</option><option value="equipe">Staff (grooming, front desk)</option></select></label><button class="bt bt-pri">Add</button></form>`,
    servicos: () => `<form class="cfg-form" data-salvar-cfg="servicos"><table class="tabela tabela-servicos"><thead><tr><th>Service</th><th class="num">Price ($)</th><th></th></tr></thead><tbody>${servicos().map(([n, v], i) => `<tr><td><input class="cel-tab" name="n${i}" value="${esc(n)}"></td><td class="num"><input class="cel-tab num" name="v${i}" inputmode="decimal" value="${v}"></td><td class="num"><button type="button" class="bt bt-peq bt-perigo" data-tirar-serv="${i}">Remove</button></td></tr>`).join('')}
      <tr><td><input class="cel-tab" name="novo_n" placeholder="New service"></td><td class="num"><input class="cel-tab num" name="novo_v" inputmode="decimal" placeholder="0.00"></td><td></td></tr></tbody></table><div class="acoes" style="margin-top:12px"><button class="bt bt-pri">Save prices</button></div></form>`,
    ia: () => `<form class="cfg-form" data-salvar-cfg="ia"><div class="opcoes-ia"><label class="op-ia"><input type="radio" name="modo" value="nossa" ${c.ia.modo !== 'propria' ? 'checked' : ''}><span><b>VetNature assistant</b><small>Included. Answers questions about your schedule, patients, vaccines, sales and inventory.</small></span></label>
      <label class="op-ia"><input type="radio" name="modo" value="propria" ${c.ia.modo === 'propria' ? 'checked' : ''}><span><b>Use my own AI</b><small>Already paying for ChatGPT, Gemini or Claude? Paste your API key and the assistant runs on your account.</small></span></label></div>
      <div class="grade-campos" data-propria ${c.ia.modo === 'propria' ? '' : 'hidden'}><label class="campo">Provider<select name="provedor">${[['openai', 'ChatGPT (OpenAI)'], ['gemini', 'Gemini (Google)'], ['claude', 'Claude (Anthropic)']].map(([k, n]) => `<option value="${k}" ${c.ia.provedor === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label class="campo">Model (optional)<input name="modelo" value="${esc(c.ia.modelo)}" placeholder="provider default"></label>
      <label class="campo largo">API key<input name="chave" type="password" autocomplete="off" value="${esc(chaveIA())}" placeholder="Paste your key here"></label><p class="nota largo">The key stays in this browser only and goes straight to the AI provider you chose. Where to get it: ChatGPT at platform.openai.com/api-keys · Gemini at aistudio.google.com/apikey · Claude at console.anthropic.com.</p></div>
      <div class="acoes"><button class="bt bt-pri">Save</button><button type="button" class="bt" data-ia>Open the assistant</button></div></form>`,
    agendamento: () => { const o = c.agendaOnline; return `<form class="cfg-form" data-salvar-cfg="agendamento"><label class="op-ia"><input type="checkbox" name="ligado" ${o.ligado ? 'checked' : ''}><span><b>Let clients request appointments from a link</b><small>Requests land in the Schedule for the front desk to confirm. Nothing is booked without confirmation.</small></span></label>
      <div class="grade-campos"><label class="campo">First slot<input name="inicio" type="time" value="${o.inicio}"></label><label class="campo">Last slot<input name="fim" type="time" value="${o.fim}"></label><label class="campo">Slot length<select name="intervalo">${[15, 20, 30, 60].map((m) => `<option value="${m}" ${o.intervalo === m ? 'selected' : ''}>${m} minutes</option>`).join('')}</select></label><label class="campo">Saturday<select name="sabado"><option value="1">Open (until noon)</option><option value="" ${o.sabado ? '' : 'selected'}>Closed</option></select></label>
      <fieldset class="campo largo escolhas"><legend>What clients can request</legend>${Object.keys(TIPOS).filter((t) => t !== 'Surgery').map((t) => `<label><input type="checkbox" name="tipos" value="${t}" ${o.tipos.includes(t) ? 'checked' : ''}> ${t}</label>`).join('')}</fieldset></div>
      <p class="nota">Your booking link: <b>${esc(linkAgendar())}</b> · add it to your website, Google Business profile and social bios.</p><div class="acoes"><button class="bt bt-pri">Save</button><a class="bt" href="${esc(linkAgendar())}" target="_blank" rel="noopener">Open the client page</a></div></form>`; },
    comissoes: () => `<form class="cfg-form" data-salvar-cfg="comissoes"><table class="tabela"><thead><tr><th>Team member</th><th class="num">Commission on services (%)</th></tr></thead><tbody>${db.vets.map((v, i) => `<tr><td><b>${esc(v)}</b></td><td class="num"><input class="cel-tab num" name="c${i}" inputmode="decimal" value="${c.comissoes[v] ?? 0}"></td></tr>`).join('')}</tbody></table>
      <p class="nota">Commission counts services only (exams, grooming, lab tests...). Products and discounts are left out. Each person's amount shows in Reports.</p><div class="acoes"><button class="bt bt-pri">Save</button></div></form>`,
    fiscal: () => `<form class="cfg-form" data-salvar-cfg="fiscal"><div class="grade-campos"><label class="campo">Sales tax on products (%)<input name="taxa" inputmode="decimal" value="${c.fiscal.taxa}"></label><label class="campo">Next invoice number<input name="proxima" type="number" min="1" value="${c.fiscal.proxima}"></label></div>
      <p class="nota">Services are invoiced without sales tax; products use the rate above. In the live version invoices are emailed to the client as a PDF.</p><div class="acoes"><button class="bt bt-pri">Save</button></div></form>`,
    dados: () => `<p style="margin-top:0">Download a copy of everything (pets, clients, records, vaccines, sales) or restore a copy you saved.</p><div class="acoes"><button class="bt bt-pri" data-baixar-copia>Download backup (.json)</button><label class="bt">Restore a backup<input type="file" accept="application/json" data-voltar-copia hidden></label><button class="bt bt-perigo" data-recomecar>Reset to sample data</button></div>`,
  };
  return `<div class="cab"><div><h1>Settings</h1><p>Your account, the clinic, the team, prices and the AI assistant.</p></div></div>
    <div class="cfg"><nav class="cfg-menu" aria-label="Settings">${CFG.map(([k, n]) => `<button type="button" data-cfg="${k}" ${est.cfg === k ? 'aria-current="true"' : ''}>${n}</button>`).join('')}</nav><section class="cartao"><div class="cartao-cab"><h2>${CFG.find(([k]) => k === est.cfg)[1]}</h2></div><div class="cartao-corpo">${corpo[est.cfg]()}</div></section></div>`;
}
function salvarConfig(f) {
  const c = db.config, tipo = f.dataset.salvarCfg;
  if (tipo === 'conta') Object.assign(c.conta, { nome: f.nome.value.trim(), email: f.email.value.trim(), cargo: f.cargo.value.trim() });
  if (tipo === 'clinica') { db.clinica = f.clinica.value.trim() || db.clinica; Object.assign(c, { cnpj: f.cnpj.value.trim(), telefone: soDigitos(f.telefone.value), endereco: f.endereco.value.trim(), cidade: f.cidade.value.trim(), crmv: f.crmv.value.trim(), dea: f.dea.value.trim(), horario: f.horario.value.trim(), diaria: num(f.diaria.value) || 0 }); }
  if (tipo === 'vet') { const n = f.nome.value.trim(); if (!n) return avisar('Type a name.'); const nome = f.tipo.value === 'vet' && !/^dr\.?\s/i.test(n) ? `Dr. ${n}` : n; db.vets.push(nome); c.comissoes[nome] ??= f.tipo.value === 'vet' ? 10 : 30; }
  if (tipo === 'servicos') { c.servicos = servicos().map((_, i) => [f[`n${i}`].value.trim(), num(f[`v${i}`].value) || 0]).filter(([n]) => n); if (f.novo_n.value.trim()) c.servicos.push([f.novo_n.value.trim(), num(f.novo_v.value) || 0]); }
  if (tipo === 'avisos') { const m = {}; Object.keys(MODELOS_AVISO).forEach((k) => { m[k] = f[`m_${k}`].value.trim() || MODELOS_AVISO[k]; }); c.avisos = { ligado: c.avisos.ligado, hora: f.hora.value || '09:00', vacina: Math.max(0, Math.round(Number(f.vacina.value)) || 0), consulta: Math.max(0, Math.round(Number(f.consulta.value)) || 0), aniversario: f.aniversario.checked, exame: f.exame.checked, modelos: m }; }
  if (tipo === 'agendamento') { const tipos = [...f.querySelectorAll('[name=tipos]:checked')].map((x) => x.value); if (!tipos.length) return avisar('Pick at least one thing clients can request.'); if (f.inicio.value >= f.fim.value) return avisar('The last slot must be after the first one.'); c.agendaOnline = { ligado: f.ligado.checked, inicio: f.inicio.value, fim: f.fim.value, intervalo: Number(f.intervalo.value), sabado: !!f.sabado.value, tipos }; }
  if (tipo === 'comissoes') db.vets.forEach((v, i) => { c.comissoes[v] = Math.min(100, Math.max(0, num(f[`c${i}`].value) || 0)); });
  if (tipo === 'fiscal') Object.assign(c.fiscal, { taxa: num(f.taxa.value) || 0, proxima: Math.max(1, Math.round(Number(f.proxima.value)) || 1) });
  if (tipo === 'ia') { c.ia = { modo: f.modo.value, provedor: f.provedor.value, modelo: f.modelo.value.trim() }; guardarChaveIA(f.chave.value.trim()); if (c.ia.modo === 'propria' && !chaveIA()) avisar('Without a key, the assistant keeps using the VetNature assistant.'); }
  salvar(); avisar('Saved.'); desenhar();
}

// ---------------------------------------------------------------- AI ASSISTANT
const SUGESTOES = ["Today's summary", 'Which vaccines are overdue?', 'How much came in today?', 'What is running low?', 'Who owes us money?', 'How is Buddy doing?'];
function abrirIA() {
  const p = $('#painel-ia'); p.hidden = false; desenharIA(); p.querySelector('input')?.focus();
}
function desenharIA() {
  const p = $('#painel-ia'), propria = db.config.ia.modo === 'propria' && chaveIA();
  p.innerHTML = `<div class="ia-cab"><div><b>${IC.ia} Assistant</b><small>${propria ? `Using your AI (${({ openai: 'ChatGPT', gemini: 'Gemini', claude: 'Claude' })[db.config.ia.provedor]})` : 'VetNature assistant'}</small></div><button type="button" class="fechar" data-fechar-ia aria-label="Close">×</button></div>
    <div class="ia-conversa" aria-live="polite">${est.chat.length ? est.chat.map((m) => `<div class="msg msg-${m.de}">${m.de === 'ia' ? m.texto : esc(m.texto)}</div>`).join('') : `<div class="msg msg-ia">Hi ${esc(primeiro(db.config.conta.nome))}! Ask about the schedule, a patient, vaccines, sales or inventory.</div>`}</div>
    <div class="ia-sug">${SUGESTOES.map((x) => `<button type="button" data-perguntar="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    <form class="ia-form" data-ia-form><input name="q" placeholder="Type your question" autocomplete="off"><button class="bt bt-pri">Send</button></form>`;
  const conv = p.querySelector('.ia-conversa'); conv.scrollTop = conv.scrollHeight;
}
async function perguntar(q) {
  q = q.trim(); if (!q) return;
  est.chat.push({ de: 'eu', texto: q }, { de: 'ia', texto: '<span class="pensando">Thinking…</span>' }); desenharIA();
  let r;
  const c = db.config.ia;
  if (c.modo === 'propria' && chaveIA()) { try { r = esc(await iaPropria(q)).replace(/\n/g, '<br>'); } catch (e) { r = `I couldn't reach your AI (${esc(e.message)}). Check the key in Settings · AI assistant. Meanwhile, here's the VetNature assistant:<br><br>${iaNossa(q)}`; } }
  else r = iaNossa(q);
  est.chat[est.chat.length - 1].texto = r; desenharIA();
}
const sem = (x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// summary of the clinic data for the user's own AI (no phone numbers, no keys)
function contexto() {
  const h = hoje();
  return JSON.stringify({ clinic: db.clinica, today: h, schedule_today: db.agenda.filter((a) => a.data === h).map((a) => ({ time: a.hora, pet: pet(a.pet)?.nome, type: a.tipo, vet: a.vet, status: a.status })),
    pets: db.pets.map((p) => ({ name: p.nome, species: p.especie, breed: p.raca, age: idade(p.nasc), weight_lb: pesoAtual(p), allergies: p.alergias, owner: tutorDe(p)?.nome })),
    vaccines_due: db.vacinas.filter((v) => v.proxima && diasAte(v.proxima) <= 30).map((v) => ({ pet: pet(v.pet)?.nome, vaccine: v.nome, due: v.proxima })),
    hospitalized: db.internados.map((i) => ({ pet: pet(i.pet)?.nome, reason: i.motivo, pending_doses: i.doses.filter((d) => !d.feita).map((d) => `${d.hora} ${d.remedio}`) })),
    inventory_alerts: db.estoque.filter((x) => x.qtd < x.minimo || diasAte(x.validade) <= 30).map((x) => ({ item: x.nome, qty: x.qtd, min: x.minimo, expires: x.validade })),
    collected_today: db.vendas.filter((v) => v.data === h && v.recebido).reduce((s2, v) => s2 + total(v), 0), open_balances: aReceber().reduce((s2, v) => s2 + total(v), 0) });
}
async function iaPropria(q) {
  const c = db.config.ia, sistema = `You are the assistant inside VetNature for ${db.clinica}. Answer in English, short and practical, only from the data below. Do not invent data. Never give medication doses: say the veterinarian must confirm.\nClinic data (JSON): ${contexto()}`;
  const pede = async (url, op) => { const r = await fetch(url, op); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error?.message || `error ${r.status}`); return j; };
  if (c.provedor === 'gemini') { const j = await pede(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.modelo || 'gemini-2.0-flash')}:generateContent?key=${encodeURIComponent(chaveIA())}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: sistema }] }, contents: [{ role: 'user', parts: [{ text: q }] }] }) }); return j.candidates?.[0]?.content?.parts?.map((x) => x.text).join('') || 'No answer.'; }
  if (c.provedor === 'claude') { const j = await pede('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': chaveIA(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: c.modelo || 'claude-haiku-5-5', max_tokens: 700, system: sistema, messages: [{ role: 'user', content: q }] }) }); return j.content?.map((x) => x.text || '').join('') || 'No answer.'; }
  const j = await pede('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chaveIA()}` }, body: JSON.stringify({ model: c.modelo || 'gpt-4o-mini', messages: [{ role: 'system', content: sistema }, { role: 'user', content: q }] }) });
  return j.choices?.[0]?.message?.content || 'No answer.';
}
// VetNature assistant: answers straight from the clinic data (runs in the browser in this demo)
function iaNossa(q) {
  const t = sem(q), h = hoje(), lista = (l) => `<ul>${l.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  const p = db.pets.find((x) => new RegExp(`\\b${sem(x.nome)}\\b`).test(t));
  if (/dose|dosage|mg\/kg|how much (to give|should i give)/.test(t)) return "I don't calculate medication doses: they depend on the exam and the veterinarian's judgment. I can show the patient's current weight and history if that helps.";
  if (p) { const ult = db.prontuarios.filter((x) => x.pet === p.id).sort((a, b) => b.data.localeCompare(a.data))[0], vac = db.vacinas.filter((v) => v.pet === p.id && v.proxima).sort((a, b) => a.proxima.localeCompare(b.proxima))[0], int = db.internados.find((i) => i.pet === p.id), ag = db.agenda.filter((a) => a.pet === p.id && a.data >= h).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))[0];
    return `<b>${esc(p.nome)}</b> · ${esc(p.raca)}, ${idade(p.nasc)}, ${pesoAtual(p) ?? '—'} lb${p.alergias ? ` · <b>allergic to ${esc(p.alergias)}</b>` : ''}.${lista([ult ? `Last visit ${dataBR(ult.data)}: ${esc(ult.diagnostico)}` : 'No visits recorded yet', vac ? `Next vaccine: ${esc(vac.nome)} on ${dataBR(vac.proxima)}` : 'No vaccine due', int ? `Hospitalized in ${esc(int.baia)} (${s(int.doses.filter((d) => !d.feita).length, 'dose', 'doses')} pending)` : 'Not hospitalized', ag ? `Next appointment: ${dataBR(ag.data)} at ${hora12(ag.hora)} (${esc(ag.tipo)})` : 'No appointment booked'])}`; }
  if (/vaccin|deworm|shot/.test(t)) { const atr = /overdue|expired|late|past due/.test(t), v = db.vacinas.filter((x) => x.proxima && (atr ? diasAte(x.proxima) < 0 : diasAte(x.proxima) <= 7)).sort((a, b) => a.proxima.localeCompare(b.proxima)); return v.length ? `${atr ? 'Overdue vaccines' : 'Vaccines overdue or due in the next 7 days'}:${lista(v.map((x) => `<b>${esc(pet(x.pet).nome)}</b> · ${esc(x.nome)} · ${dataBR(x.proxima)}`))}Ready-made reminders are in <b>Vaccines</b>.` : 'No overdue vaccines right now. 👍'; }
  if (/owe|owing|unpaid|balance|collect|debt/.test(t)) { const l = aReceber(); return l.length ? `Open balances:${lista(l.map((v) => `<b>${esc(tutorDe(pet(v.pet))?.nome || 'Walk-in')}</b> · ${reais(total(v))} since ${dataBR(v.data)}`))}You can text a payment reminder from <b>Clients</b>.` : 'Nobody owes anything. 👏'; }
  if (/revenue|came in|cash|sales|money|income|earn|made today/.test(t)) { const hj = db.vendas.filter((v) => v.data === h && v.recebido), mes = db.vendas.filter((v) => v.data >= maisDias(h, -29) && v.recebido); return `Today you collected <b>${reais(hj.reduce((s2, v) => s2 + total(v), 0))}</b> from ${s(hj.length, 'sale', 'sales')}. Last 30 days: <b>${reais(mes.reduce((s2, v) => s2 + total(v), 0))}</b>. Open balances: ${reais(aReceber().reduce((s2, v) => s2 + total(v), 0))}.`; }
  if (/stock|inventory|running (low|out)|reorder|expir/.test(t)) { const l = db.estoque.filter((x) => x.qtd < x.minimo || diasAte(x.validade) <= 30); return l.length ? `Needs attention:${lista(l.map((x) => `<b>${esc(x.nome)}</b> · ${x.qtd} in stock (min. ${x.minimo})${diasAte(x.validade) <= 30 ? ` · expires ${dataBR(x.validade)}` : ''}`))}` : 'Inventory is in good shape.'; }
  if (/hospital|kennel|inpatient|medicat/.test(t)) return db.internados.length ? `Hospitalized:${lista(db.internados.map((i) => `<b>${esc(pet(i.pet).nome)}</b> · ${esc(i.baia)} · next dose: ${esc(hora12(i.doses.find((d) => !d.feita)?.hora) || 'none')} ${esc(i.doses.find((d) => !d.feita)?.remedio || '')}`))}` : 'No pets hospitalized.';
  if (/birthday/.test(t)) { const l = aniversariantes(); return l.length ? `Birthdays this week:${lista(l.map(({ p: x, data }) => `<b>${esc(x.nome)}</b> · ${dataBR(data)}`))}` : 'No birthdays this week.'; }
  if (/lab|result|test|report/.test(t)) { const l = db.exames.filter((e) => e.status !== 'pronto' || !e.avisado); return l.length ? `Lab tests in progress or not yet shared with the owner:${lista(l.map((e) => `<b>${esc(pet(e.pet)?.nome)}</b> · ${esc(e.nome)} · ${EXAME_ST[e.status][0].toLowerCase()}`))}` : 'No pending lab tests.'; }
  if (/today|day|schedule|summary|queue|appointment/.test(t)) { const ag = db.agenda.filter((x) => x.data === h).sort((x, y) => x.hora.localeCompare(y.hora)); return `Today there are <b>${s(ag.length, 'appointment', 'appointments')}</b>: ${ag.filter((x) => x.status === 'pronto').length} done and ${ag.filter((x) => x.status === 'chegou').length} in the waiting room.${lista(ag.filter((x) => x.status !== 'pronto').map((x) => `${hora12(x.hora)} · <b>${esc(pet(x.pet).nome)}</b> · ${esc(x.tipo)} with ${esc(x.vet)}`))}${vacPendentes().length ? `Plus ${s(vacPendentes().length, 'vaccine', 'vaccines')} to remind this week.` : ''}`; }
  return `I can help with:${lista(["today's summary and schedule", 'a patient (type the name, e.g. “Buddy”)', 'overdue or upcoming vaccines', 'sales and open balances', 'inventory', 'hospitalized pets and lab tests'])}`;
}

// ---------------------------------------------------------------- dialogs
function janela(titulo, corpo, botoes) {
  const fundo = $('#janela'), j = fundo.firstElementChild;
  j.innerHTML = `<div class="janela-cab"><h2 id="janela-t">${titulo}</h2><button type="button" class="fechar" data-fechar aria-label="Close">×</button></div><form class="janela-form" novalidate><div class="janela-corpo">${corpo}</div><div class="janela-pe"><button type="button" class="bt" data-fechar>Cancel</button>${botoes}</div></form>`;
  fundo.hidden = false; j.querySelector('input:not([type=file]):not([type=hidden]), select, textarea')?.focus();
  const f = j.querySelector('form');
  // before any dialog saves: the typed pet must exist (or be blank where allowed)
  f.addEventListener('submit', (e) => { const b = f.querySelector('[data-pet-busca]'); if (!b || f.pet.value || (b.hasAttribute('data-vazio') && !b.value.trim())) return; e.preventDefault(); e.stopImmediatePropagation(); avisar(b.value.trim() ? `Couldn't find "${b.value.trim()}". Pick from the list or add it in Patients › + New pet.` : 'Type the pet name.'); b.focus(); });
  return f;
}
const fecharJanela = () => { $('#janela').hidden = true; };
const rotuloPet = (p) => `${p.nome} · ${tutorDe(p)?.nome || 'no owner'}`;
// pet field: type the pet or owner name; the list only suggests
const campoPet = (sel, vazio = '') => { const p = sel && pet(sel); return `<input type="hidden" name="pet" value="${p ? p.id : ''}"><input name="petbusca" list="lista-pets" data-pet-busca ${vazio ? 'data-vazio' : ''} autocomplete="off" placeholder="${vazio ? esc(vazio) : 'Type the pet or owner name'}" value="${p ? esc(rotuloPet(p)) : ''}"><datalist id="lista-pets">${db.pets.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((x) => `<option value="${esc(rotuloPet(x))}">`).join('')}</datalist>`; };
function acharPet(texto) {
  const t = sem(texto.trim()); if (!t) return null;
  const exato = db.pets.find((p) => sem(rotuloPet(p)) === t); if (exato) return exato;
  const l = db.pets.filter((p) => sem(p.nome) === t || sem(p.nome).startsWith(t) || sem(tutorDe(p)?.nome || '').startsWith(t));
  return l.length === 1 ? l[0] : null;
}
const num = (v) => (String(v).trim() ? Number(String(v).replace(/,/g, '')) : null);
const listaVets = () => `<datalist id="lista-vets">${db.vets.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>`;

// photo: resized in the browser (480 px JPEG) to fit the demo storage
function lerFoto(arquivo) {
  return new Promise((ok, erro) => {
    if (!arquivo || !arquivo.type.startsWith('image/')) return erro(new Error('Choose an image.'));
    const img = new Image(), url = URL.createObjectURL(arquivo);
    img.onload = () => { const m = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = 480; c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 480, 480); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', .8)); };
    img.onerror = () => erro(new Error("Couldn't open that image.")); img.src = url;
  });
}
const campoFoto = (p) => `<div class="campo-foto largo"><div class="previa-foto">${avatar(p || {}, 'grande')}</div><div><label class="bt">${IC.camera} ${p?.foto ? 'Change photo' : 'Add photo'}<input type="file" name="foto" accept="image/*" capture="environment" hidden></label><small>Take it with the phone camera or pick from the gallery.</small></div></div>`;
function ligarFoto(f, guardar) {
  f.foto.onchange = async () => { try { const d = await lerFoto(f.foto.files[0]); guardar(d); f.querySelector('.previa-foto').innerHTML = `<div class="avatar grande"><img src="${d}" alt=""></div>`; } catch (e) { avisar(e.message); } };
}
function abrirFoto(id) {
  const p = pet(id); let nova = null;
  const f = janela(`Photo of ${esc(p.nome)}`, campoFoto(p), `${p.foto ? '<button type="button" class="bt bt-perigo" data-tirar-foto>Remove photo</button>' : ''}<button class="bt bt-pri">Save</button>`);
  ligarFoto(f, (d) => { nova = d; });
  f.querySelector('[data-tirar-foto]')?.addEventListener('click', () => { p.foto = ''; salvar(); fecharJanela(); desenhar(); });
  f.onsubmit = (e) => { e.preventDefault(); if (!nova) return avisar('Choose a photo first.'); p.foto = nova; salvar(); fecharJanela(); avisar('Photo saved.'); desenhar(); };
}
function abrirProntuario(id) {
  const p = pet(id);
  const f = janela(`Visit · ${esc(p.nome)}`, `<div class="grade-campos"><label class="campo largo">Reason for visit<textarea name="queixa" placeholder="What the owner reported"></textarea></label>
    <label class="campo">Weight (lb)<input name="peso" inputmode="decimal" value="${pesoAtual(p) ?? ''}"></label><label class="campo">Temperature (°F)<input name="temp" inputmode="decimal" placeholder="101.5"></label>
    <label class="campo">Heart rate (bpm)<input name="fc" inputmode="numeric"></label><label class="campo">Respiratory rate (bpm)<input name="fr" inputmode="numeric"></label>
    <label class="campo largo">Diagnosis<input name="diag"></label><label class="campo largo">Treatment and instructions<textarea name="presc" placeholder="Medication, dose, schedule and duration"></textarea></label>
    <label class="campo">Veterinarian<input name="vet" list="lista-vets" value="${esc(db.vets.find((v) => v.startsWith('Dr')) || '')}">${listaVets()}</label><label class="campo">Recheck in how many days<input name="retorno" type="number" min="1" max="365" inputmode="numeric" list="lista-retorno" placeholder="Blank = no recheck"><datalist id="lista-retorno"><option value="7"><option value="10"><option value="15"><option value="30"></datalist></label></div>`, '<button class="bt bt-pri">Save visit</button>');
  f.onsubmit = (e) => {
    e.preventDefault(); if (!f.queixa.value.trim() || !f.diag.value.trim()) return avisar('Fill in the reason and the diagnosis.'); if (!f.vet.value.trim()) return avisar('Type who saw the patient.');
    const peso = num(f.peso.value);
    db.prontuarios.push({ id: uid(), pet: id, data: hoje(), vet: f.vet.value, queixa: f.queixa.value.trim(), exame: { peso, temp: num(f.temp.value), fc: num(f.fc.value), fr: num(f.fr.value) }, diagnostico: f.diag.value.trim(), prescricao: f.presc.value.trim() });
    if (peso && peso !== pesoAtual(p)) p.pesos.push({ data: hoje(), kg: peso });
    const a = db.agenda.find((x) => x.pet === id && x.data === hoje() && x.status !== 'pronto'); if (a) a.status = 'pronto';
    if (f.retorno.value) db.agenda.push({ id: uid(), data: maisDias(hoje(), Number(f.retorno.value)), hora: a?.hora || '10:00', pet: id, tipo: 'Recheck', vet: f.vet.value, status: 'aguardando', valor: 0 });
    salvar(); fecharJanela(); est.aba = 'prontuario'; avisar(`Visit for ${p.nome} saved${f.retorno.value ? ` and recheck booked for ${dataBR(maisDias(hoje(), Number(f.retorno.value)))}` : ''}.`); desenhar();
  };
}
function abrirPesar(id) {
  const p = pet(id);
  const f = janela(`Weight · ${esc(p.nome)}`, `<label class="campo">Weight (lb)<input name="peso" inputmode="decimal" value="${pesoAtual(p) ?? ''}"></label>`, '<button class="bt bt-pri">Save</button>');
  f.onsubmit = (e) => { e.preventDefault(); const kg = num(f.peso.value); if (!(kg > 0)) return avisar('Invalid weight.'); p.pesos.push({ data: hoje(), kg }); salvar(); fecharJanela(); desenhar(); };
}
function imprimir(titulo, corpo) {
  const w = window.open('', '_blank'); if (!w) return avisar('Allow pop-ups to print.');
  w.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>body{font:15px/1.6 Georgia,serif;color:#1d2b27;max-width:720px;margin:36px auto;padding:0 24px}h1{font-size:22px;margin:0;color:#214e45}h2{font-size:16px;margin:22px 0 6px;color:#214e45}small{color:#555}.cab{display:flex;justify-content:space-between;border-bottom:2px solid #214e45;padding-bottom:12px;margin-bottom:18px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd;font-size:14px}.assin{margin-top:70px;display:flex;gap:40px}.assin div{flex:1;border-top:1px solid #333;text-align:center;padding-top:6px;font-size:13px}</style></head><body>
    <div class="cab"><div><h1>${esc(db.clinica)}</h1><small>${esc(titulo)} · ${esc(db.config.endereco)} · ${esc(db.config.cidade)} · ${esc(telBR(db.config.telefone))}</small></div><small>${dataBR(hoje())}</small></div>${corpo}<script>print()<\/script></body></html>`);
  w.document.close();
}
const cabPet = (p) => { const t = tutorDe(p); return `<p><b>Patient:</b> ${esc(p.nome)} · ${({ cao: 'canine', gato: 'feline' })[p.especie] || 'other'} · ${esc(p.raca)} · ${esc(p.sexo.toLowerCase())} · ${idade(p.nasc)} · ${pesoAtual(p) ?? '—'} lb${p.microchip ? ` · microchip ${esc(p.microchip)}` : ''}<br><b>Owner:</b> ${esc(t?.nome)} · ${esc(telBR(t?.tel))}${t?.end ? ` · ${esc(t.end)}` : ''}</p>`; };
function imprimirReceita(idPr) {
  const x = db.prontuarios.find((r) => r.id === idPr), p = pet(x.pet);
  imprimir(`Prescription · ${p.nome}`, `${cabPet(p)}<h2>Diagnosis</h2><p>${esc(x.diagnostico)}</p><h2>Prescription</h2><p style="white-space:pre-wrap">${esc(x.prescricao)}</p><div class="assin"><div>${esc(x.vet)}<br>Veterinarian · ${esc(db.config.crmv)}</div></div>`);
}
function imprimirCarteira(id) {
  const p = pet(id), l = db.vacinas.filter((v) => v.pet === id).sort((a, b) => a.data.localeCompare(b.data));
  imprimir(`Vaccination record · ${p.nome}`, `${cabPet(p)}<h2>Vaccines and dewormers</h2><table><tr><th>Vaccine</th><th>Given on</th><th>Lot</th><th>Next dose</th></tr>${l.map((v) => `<tr><td>${esc(v.nome)}</td><td>${dataBR(v.data)}</td><td>${esc(v.lote)}</td><td>${dataBR(v.proxima)}</td></tr>`).join('')}</table><div class="assin"><div>Attending veterinarian · ${esc(db.config.crmv)}</div></div>`);
}
const TERMOS = {
  cirurgia: ['Surgery consent form', 'I authorize the veterinary team to perform the surgical procedure recommended for my pet. I have been informed of the diagnosis, the procedure, the risks (including anesthetic risks, which can lead to complications and, in rare cases, death), the post-operative care and the estimated costs. I confirm my pet has fasted as instructed and that I have disclosed all known illnesses and medications.'],
  anestesia: ['Anesthesia and sedation consent', 'I authorize sedation or anesthesia of my pet for the recommended procedure. I understand that every anesthetic procedure carries risks, which the team has explained, and that pre-anesthetic tests may be recommended to reduce them.'],
  internacao: ['Hospitalization consent', 'I authorize the hospitalization of my pet for treatment, with the medications and procedures recommended by the team. I am aware of the daily rate and visiting hours, and that I will be updated on my pet\'s condition and contacted before any unplanned procedure.'],
};
function imprimirTermo(id, tipo) {
  const p = pet(id), t = tutorDe(p), [tit, texto] = TERMOS[tipo];
  imprimir(`${tit} · ${p.nome}`, `${cabPet(p)}<h2>${tit}</h2><p>${texto}</p><p>Procedure: ____________________________________________ Estimated cost: $ ____________</p><div class="assin"><div>${esc(t?.nome)}<br>Owner signature · date</div><div>Veterinarian · ${esc(db.config.crmv)}</div></div>`);
}
function imprimirAtestado(id) {
  const p = pet(id), vac = db.vacinas.filter((v) => v.pet === id && v.data >= maisDias(hoje(), -365));
  imprimir(`Health certificate · ${p.nome}`, `${cabPet(p)}<h2>Health certificate</h2><p>I certify that I examined the animal above on this date and found it clinically healthy, with no signs of infectious, contagious or parasitic disease, and fit to travel and be around other animals.</p><p>Vaccines given in the last 12 months: ${vac.map((v) => `${esc(v.nome)} (${dataBR(v.data)})`).join(', ') || 'none recorded'}.</p><div class="assin"><div>Veterinarian · ${esc(db.config.crmv)}</div></div>`);
}
function abrirAplicarVacina(id) {
  const vacinasEst = db.estoque.filter((x) => x.tipo === 'Vaccine' || /dewormer/i.test(x.nome));
  const f = janela(`Vaccine given · ${esc(pet(id).nome)}`, `<div class="grade-campos"><label class="campo largo">Vaccine<select name="item">${vacinasEst.map((x) => `<option value="${x.id}">${esc(x.nome)} · lot ${esc(x.lote)} · ${x.qtd} in stock</option>`).join('')}</select></label>
    <label class="campo">Next dose (blank = no booster)<input name="prox" type="date" value="${maisDias(hoje(), 365)}"></label><label class="campo">Charge<select name="cobrar"><option value="1">Yes, add to checkout</option><option value="">No</option></select></label></div>
    <p style="margin:0;color:var(--texto-2);font-size:13px">1 unit leaves inventory and the next dose goes into the reminders.</p>`, '<button class="bt bt-pri">Record</button>');
  f.onsubmit = (e) => {
    e.preventDefault(); const it = db.estoque.find((x) => x.id === f.item.value); if (!it) return;
    if (it.qtd < 1) return avisar('This vaccine is out of stock. Receive more first.');
    it.qtd -= 1;
    const nome = it.nome.replace(/ vaccine$/i, ''), chave = nome.split(' ')[0].toLowerCase();
    db.vacinas.filter((v) => v.pet === id && v.proxima && v.nome.toLowerCase().startsWith(chave)).forEach((v) => { v.proxima = null; }); // the pending dose leaves the reminders
    db.vacinas.push({ id: uid(), pet: id, nome, data: hoje(), proxima: f.prox.value || null, lote: it.lote });
    if (f.cobrar.value) db.vendas.push({ id: uid(), data: hoje(), hora: horaAgora(), pet: id, itens: [{ nome: it.nome, valor: it.preco, qtd: 1 }, { nome: 'Vaccine administration', valor: 15, qtd: 1 }], forma: 'Credit card', recebido: true });
    salvar(); fecharJanela(); avisar(`Vaccine recorded${f.cobrar.value ? ' and added to checkout' : ''}.`); desenhar();
  };
}
function abrirAgendar(petSel, tipo = 'Consultation') {
  const f = janela('Book an appointment', `<div class="grade-campos"><label class="campo largo">Pet${campoPet(petSel)}</label>
    <label class="campo">Type<input name="tipo" list="lista-tipos" value="${esc(tipo)}"><datalist id="lista-tipos">${Object.keys(TIPOS).map((x) => `<option value="${esc(x)}">`).join('')}</datalist></label><label class="campo">Date<input name="data" type="date" value="${est.secao === 'agenda' ? est.dia : hoje()}"></label>
    <label class="campo">Time<input name="hora" type="time" value="17:00" step="900"></label><label class="campo">With<input name="vet" list="lista-vets" value="${esc(db.vets[0] || '')}">${listaVets()}</label></div>`, '<button class="bt bt-pri">Book</button>');
  f.onsubmit = (e) => {
    e.preventDefault(); if (!f.tipo.value.trim() || !f.vet.value.trim() || !f.data.value || !f.hora.value) return avisar('Fill in the type, date, time and doctor.');
    if (db.agenda.some((a) => a.data === f.data.value && a.hora === f.hora.value && a.vet === f.vet.value)) return avisar(`${f.vet.value} already has an appointment at ${hora12(f.hora.value)} that day.`);
    db.agenda.push({ id: uid(), data: f.data.value, hora: f.hora.value, pet: f.pet.value, tipo: f.tipo.value.trim(), vet: f.vet.value.trim(), status: 'aguardando', valor: TIPOS[f.tipo.value.trim()] ?? 0 });
    const p = pet(f.pet.value), t = tutorDe(p);
    salvar(); fecharJanela(); desenhar();
    avisar(`Booked: ${p.nome} · ${dataBR(f.data.value)} at ${hora12(f.hora.value)}.`);
    simularZap(zap(t?.tel, `Hi ${primeiro(t?.nome)}, this confirms ${p.nome}'s ${f.tipo.value.toLowerCase()} at ${db.clinica} on ${diaSemana(f.data.value, 'long')}, ${dataBR(f.data.value)} at ${hora12(f.hora.value)}. See you then!`));
  };
}
function abrirPet(id) {
  const p = id ? pet(id) : null; let foto = p?.foto || '';
  const f = janela(p ? `Edit ${esc(p.nome)}` : 'New pet', `<div class="grade-campos">${campoFoto(p)}<label class="campo">Pet name<input name="nome" value="${esc(p?.nome || '')}"></label><label class="campo">Species<select name="especie">${[['cao', 'Dog'], ['gato', 'Cat'], ['outro', 'Other']].map(([v, n]) => `<option value="${v}" ${p?.especie === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="campo">Breed<input name="raca" value="${esc(p?.raca || '')}" placeholder="Mixed breed"></label><label class="campo">Sex<select name="sexo">${['Male', 'Female'].map((x) => `<option ${p?.sexo === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    <label class="campo">Date of birth (approx.)<input name="nasc" type="date" value="${p?.nasc || maisDias(hoje(), -365)}"></label><label class="campo">Coat<input name="pelagem" value="${esc(p?.pelagem || '')}"></label>
    <label class="campo">Microchip<input name="microchip" value="${esc(p?.microchip || '')}"></label><label class="campo">Spayed / neutered<select name="castrado"><option value="">No</option><option value="1" ${p?.castrado ? 'selected' : ''}>Yes</option></select></label>
    ${p ? '' : `<label class="campo">Weight (lb)<input name="peso" inputmode="decimal"></label><label class="campo largo">Owner<select name="tutor"><option value="">New owner (fill in below)</option>${db.tutores.map((t) => `<option value="${t.id}">${esc(t.nome)}</option>`).join('')}</select></label>
    <label class="campo">New owner name<input name="tnome"></label><label class="campo">Owner mobile<input name="ttel" inputmode="tel" placeholder="(555) 010-0000"></label>`}
    <label class="campo largo">Allergies<input name="alergias" value="${esc(p?.alergias || '')}" placeholder="Leave blank if none"></label><label class="campo largo">Notes<textarea name="obs" placeholder="Temperament, handling notes...">${esc(p?.obs || '')}</textarea></label></div>`, `<button class="bt bt-pri">${p ? 'Save' : 'Add pet'}</button>`);
  ligarFoto(f, (d) => { foto = d; });
  f.onsubmit = (e) => {
    e.preventDefault(); if (!f.nome.value.trim()) return avisar('Type the pet name.');
    const dados = { nome: f.nome.value.trim(), especie: f.especie.value, raca: f.raca.value.trim() || 'Mixed breed', sexo: f.sexo.value, nasc: f.nasc.value, pelagem: f.pelagem.value.trim(), microchip: f.microchip.value.trim(), castrado: !!f.castrado.value, alergias: f.alergias.value.trim(), obs: f.obs.value.trim(), foto };
    if (p) { Object.assign(p, dados); salvar(); fecharJanela(); avisar('Details saved.'); return desenhar(); }
    let tutor = f.tutor.value;
    if (!tutor) { if (!f.tnome.value.trim()) return avisar('Pick the owner or type the new owner name.'); tutor = uid(); db.tutores.push({ id: tutor, nome: f.tnome.value.trim(), tel: soDigitos(f.ttel.value), end: '' }); }
    const nid = uid(), kg = num(f.peso.value);
    db.pets.push({ id: nid, tutor, ...dados, pesos: kg ? [{ data: hoje(), kg }] : [] });
    salvar(); fecharJanela(); est.secao = 'pacientes'; est.sel = nid; est.aba = 'resumo'; avisar(`${dados.nome} added.`); desenhar();
  };
}
function abrirCobrar(petSel, itensIniciais = []) {
  const itens = [...itensIniciais];
  const f = janela('Check out', `<div class="grade-campos"><label class="campo largo">Pet${campoPet(petSel, 'Blank = walk-in sale, no pet')}</label>
    <label class="campo">Service<select name="serv"><option value="">Choose…</option>${servicos().map(([n, v], i) => `<option value="${i}">${esc(n)} · ${reais(v)}</option>`).join('')}</select></label>
    <label class="campo">Product from inventory<select name="prod"><option value="">Choose…</option>${db.estoque.filter((x) => x.qtd > 0).map((x) => `<option value="${x.id}">${esc(x.nome)} · ${reais(x.preco)}</option>`).join('')}</select></label>
    <div class="largo avulso"><label class="campo">Other item (type it)<input name="av_nome" placeholder="e.g. Bandage change"></label><label class="campo">Price ($)<input name="av_valor" inputmode="decimal" placeholder="0.00"></label><button type="button" class="bt" data-avulso>Add to bill</button></div>
    <div class="largo" data-itens></div>
    <label class="campo">Discount ($)<input name="desc" inputmode="decimal" value="0"></label><label class="campo">Payment method<select name="forma">${FORMAS.map((x) => `<option>${x}</option>`).join('')}</select></label>
    <label class="campo largo">Seen by (for commission)<input name="vet" list="lista-vets" placeholder="Blank = nobody" value="${esc(profissionalPadrao(petSel, itensIniciais) || '')}">${listaVets()}</label></div>`, '<button class="bt bt-pri">Take payment</button>');
  const lista = f.querySelector('[data-itens]');
  const soma = () => itens.reduce((s2, i) => s2 + i.valor * i.qtd, 0) - (num(f.desc.value) || 0);
  const desenhaItens = () => { lista.innerHTML = itens.length ? `<table class="tabela">${itens.map((i, k) => `<tr><td>${esc(i.nome)}${i.qtd > 1 ? ` ×${i.qtd}` : ''}</td><td class="num">${reais(i.valor * i.qtd)}</td><td class="num"><button type="button" class="bt bt-peq bt-perigo" data-tirar="${k}">Remove</button></td></tr>`).join('')}<tr><td><b>Total</b></td><td class="num"><b>${reais(soma())}</b></td><td></td></tr></table>` : '<p class="vazio" style="padding:8px">Pick services and products above.</p>'; const pl = contratosDo(f.pet.value).find((x) => x.tipo === 'plano'); if (pl && itens.length) lista.insertAdjacentHTML('beforeend', `<p class="nota">${esc(pet(f.pet.value).nome)} is on the ${esc(pl.nome)}: ${pl.desconto}% off. <button type="button" class="bt bt-peq" data-desc-plano="${pl.desconto}">Apply ${reais(itens.reduce((s2, i) => s2 + i.valor * i.qtd, 0) * pl.desconto / 100)} discount</button></p>`); };
  f.pet.onchange = desenhaItens;
  f.serv.onchange = () => { if (f.serv.value === '') return; const [n, v] = servicos()[Number(f.serv.value)]; itens.push({ nome: n, valor: v, qtd: 1 }); f.serv.value = ''; desenhaItens(); };
  f.prod.onchange = () => { const x = db.estoque.find((y) => y.id === f.prod.value); if (!x) return; itens.push({ nome: x.nome, valor: x.preco, qtd: 1, item: x.id }); f.prod.value = ''; desenhaItens(); };
  f.desc.oninput = desenhaItens;
  f.querySelector('[data-avulso]').onclick = () => { const n = f.av_nome.value.trim(), v = num(f.av_valor.value); if (!n || !(v > 0)) return avisar('Type the item and the price.'); itens.push({ nome: n, valor: v, qtd: 1 }); f.av_nome.value = ''; f.av_valor.value = ''; desenhaItens(); };
  lista.onclick = (e) => { const b = e.target.closest('[data-tirar]'); if (b) { itens.splice(Number(b.dataset.tirar), 1); desenhaItens(); } const dp = e.target.closest('[data-desc-plano]'); if (dp) { f.desc.value = (itens.reduce((s2, i) => s2 + i.valor * i.qtd, 0) * Number(dp.dataset.descPlano) / 100).toFixed(2); desenhaItens(); } };
  const a = !itensIniciais.length && petSel && db.agenda.find((x) => x.pet === petSel && x.data === hoje()); // today's appointment goes on the bill
  if (a && a.valor) itens.push({ nome: a.tipo === 'Consultation' ? 'Wellness exam' : a.tipo, valor: a.valor, qtd: 1 });
  desenhaItens();
  f.onsubmit = (e) => {
    e.preventDefault(); if (!itens.length) return avisar('Add at least one service or product.');
    const fiado = fiadoForma(f.forma.value); if (fiado && !f.pet.value) return avisar('An open balance needs a pet (so we know who owes it).');
    for (const i of itens) if (i.item) { const x = db.estoque.find((y) => y.id === i.item); if (x) x.qtd = Math.max(0, x.qtd - 1); }
    const desc = num(f.desc.value) || 0, lin = itens.map(({ nome, valor, qtd }) => ({ nome, valor, qtd })); if (desc > 0) lin.push({ nome: 'Discount', valor: -desc, qtd: 1 });
    db.vendas.push({ id: uid(), data: hoje(), hora: horaAgora(), pet: f.pet.value || null, itens: lin, forma: f.forma.value, recebido: !fiado, vet: f.vet.value.trim() });
    salvar(); fecharJanela(); avisar(fiado ? `Added to open balance: ${reais(soma())}.` : `Paid: ${reais(soma())} by ${f.forma.value.toLowerCase()}.`); desenhar();
  };
}
function abrirInternar(id) {
  if (!id) { const f0 = janela('Admit', `<label class="campo">Pet${campoPet(est.sel)}</label>`, '<button class="bt bt-pri">Continue</button>'); f0.onsubmit = (e) => { e.preventDefault(); abrirInternar(f0.pet.value); }; return; }
  const livres = ['Kennel 1', 'Kennel 2', 'Kennel 3', 'Kennel 4', 'Kennel 5'].filter((b) => !db.internados.some((i) => i.baia === b));
  const f = janela(`Admit ${esc(pet(id).nome)}`, `<div class="grade-campos"><label class="campo">Kennel<input name="baia" list="lista-baias" value="${esc(livres[0] || '')}" placeholder="e.g. Kennel 6"><datalist id="lista-baias">${livres.map((x) => `<option value="${esc(x)}">`).join('')}</datalist></label>
    <label class="campo">First medication at<input name="hora" type="time" value="${horaAgora()}"></label><label class="campo largo">Reason<input name="motivo"></label><label class="campo largo">Medication<input name="remedio" placeholder="e.g. IV saline 500 ml"></label></div>`, '<button class="bt bt-pri">Admit</button>');
  f.onsubmit = (e) => {
    e.preventDefault(); if (!f.motivo.value.trim() || !f.baia.value.trim()) return avisar('Fill in the kennel and the reason.'); if (db.internados.some((i) => sem(i.baia) === sem(f.baia.value))) return avisar(`${f.baia.value.trim()} is already taken.`);
    db.internados.push({ id: uid(), pet: id, baia: f.baia.value.trim(), motivo: f.motivo.value.trim(), entrada: hoje(), doses: f.remedio.value.trim() ? [{ hora: f.hora.value, remedio: f.remedio.value.trim(), feita: false }] : [] });
    salvar(); fecharJanela(); est.secao = 'internacao'; avisar(`${pet(id).nome} admitted to ${f.baia.value.trim()}.`); desenhar();
  };
}
function abrirNovaDose(idInt) {
  const f = janela('New dose', '<div class="grade-campos"><label class="campo">Time<input name="hora" type="time"></label><label class="campo">Medication<input name="remedio"></label></div>', '<button class="bt bt-pri">Add</button>');
  f.onsubmit = (e) => { e.preventDefault(); if (!f.hora.value || !f.remedio.value.trim()) return avisar('Fill in time and medication.'); const i = db.internados.find((x) => x.id === idInt); i.doses.push({ hora: f.hora.value, remedio: f.remedio.value.trim(), feita: false }); i.doses.sort((a, b) => a.hora.localeCompare(b.hora)); salvar(); fecharJanela(); desenhar(); };
}
function abrirBanho(petSel) {
  const f = janela('Grooming check-in', `<div class="grade-campos"><label class="campo largo">Pet${campoPet(petSel)}</label><label class="campo">Service<input name="serv" list="lista-banho" value="Bath"><datalist id="lista-banho"><option value="Bath"><option value="Bath & grooming"><option value="Sanitary trim"><option value="Deep conditioning"></datalist></label><label class="campo">Arrived at<input name="hora" type="time" value="${horaAgora()}"></label><label class="campo largo">Notes<input name="obs" placeholder="Cut style, shampoo, bow..."></label></div>`, '<button class="bt bt-pri">Check in</button>');
  f.onsubmit = (e) => { e.preventDefault(); if (!f.serv.value.trim()) return avisar('Type the service.'); db.estetica.push({ id: uid(), data: hoje(), hora: f.hora.value || horaAgora(), pet: f.pet.value, servico: f.serv.value.trim(), status: 'aguardando', obs: f.obs.value.trim() }); salvar(); fecharJanela(); est.secao = 'estetica'; desenhar(); };
}
function abrirPedirExame(petSel) {
  const f = janela('Order lab test', `<div class="grade-campos"><label class="campo largo">Pet${campoPet(petSel)}</label><label class="campo largo">Test<input name="nome" list="lista-exames" placeholder="Pick or type the test"><datalist id="lista-exames">${EXAMES.map((x) => `<option value="${x}">`).join('')}</datalist></label><label class="campo largo">Lab<input name="lab" value="VetLab Diagnostics"></label></div>`, '<button class="bt bt-pri">Order</button>');
  f.onsubmit = (e) => { e.preventDefault(); if (!f.nome.value.trim()) return avisar('Type the test name.'); db.exames.push({ id: uid(), pet: f.pet.value, nome: f.nome.value.trim(), data: hoje(), status: 'solicitado', resultado: '', lab: f.lab.value.trim() || 'Lab', anexos: [] }); salvar(); fecharJanela(); avisar('Lab test ordered.'); desenhar(); };
}
function abrirResultado(idEx) {
  const x = db.exames.find((e) => e.id === idEx);
  const f = janela(`Results · ${esc(x.nome)}`, '<div class="grade-campos"><label class="campo largo">Report<textarea name="res" placeholder="Values and the lab\'s conclusion"></textarea></label><label class="campo largo">Lab file (optional)<input type="file" name="arq" accept="image/*,application/pdf"></label></div><p class="nota">It can be the PDF the lab sent or a photo of the report. If you attach the file, the text can be just the conclusion.</p>', '<button class="bt bt-pri">Save results</button>');
  f.onsubmit = async (e) => {
    e.preventDefault(); const arq = f.arq.files[0]; if (!f.res.value.trim() && !arq) return avisar('Type the result or attach the lab file.');
    if (arq) { try { x.anexos.push(await lerAnexo(arq)); } catch (er) { return avisar(er.message); } }
    x.resultado = f.res.value.trim(); x.status = 'pronto'; salvar(); fecharJanela(); avisar('Results saved. Text the owner.'); desenhar();
  };
}
function abrirEntrada(idItem) {
  const x = db.estoque.find((y) => y.id === idItem);
  const f = janela(`Receive · ${esc(x.nome)}`, `<div class="grade-campos"><label class="campo">Quantity<input name="qtd" type="number" min="1" value="10"></label><label class="campo">Unit cost ($)<input name="custo" inputmode="decimal" value="${x.custo ?? ''}"></label><label class="campo">Lot<input name="lote" value="${esc(x.lote)}"></label><label class="campo">Expires<input name="val" type="date" value="${x.validade}"></label></div>`, '<button class="bt bt-pri">Receive</button>');
  f.onsubmit = (e) => { e.preventDefault(); const q = Math.round(Number(f.qtd.value)); if (!(q > 0)) return avisar('Invalid quantity.'); x.qtd += q; x.custo = num(f.custo.value) ?? x.custo; x.lote = f.lote.value.trim() || x.lote; x.validade = f.val.value || x.validade; salvar(); fecharJanela(); avisar(`+${q} ${x.nome}.`); desenhar(); };
}
function abrirNovoItem() {
  const f = janela('New inventory item', `<div class="grade-campos"><label class="campo largo">Name<input name="nome"></label><label class="campo">Type<input name="tipo" list="lista-tipo-item" value="Medication"><datalist id="lista-tipo-item"><option value="Vaccine"><option value="Medication"><option value="Supply"><option value="Product"></datalist></label>
    <label class="campo">Quantity<input name="qtd" type="number" min="0" value="0"></label><label class="campo">Minimum<input name="min" type="number" min="0" value="5"></label><label class="campo">Cost ($)<input name="custo" inputmode="decimal" value="0"></label><label class="campo">Sale price ($)<input name="preco" inputmode="decimal" value="0"></label>
    <label class="campo">Lot<input name="lote"></label><label class="campo">Expires<input name="val" type="date" value="${maisDias(hoje(), 365)}"></label></div>`, '<button class="bt bt-pri">Save</button>');
  f.onsubmit = (e) => { e.preventDefault(); if (!f.nome.value.trim()) return avisar('Type the name.'); db.estoque.push({ id: uid(), nome: f.nome.value.trim(), tipo: f.tipo.value.trim() || 'Product', qtd: Number(f.qtd.value) || 0, minimo: Number(f.min.value) || 0, lote: f.lote.value.trim() || '—', validade: f.val.value, preco: num(f.preco.value) || 0, custo: num(f.custo.value) || 0 }); salvar(); fecharJanela(); desenhar(); };
}
function abrirTutor(id) {
  const t = id ? db.tutores.find((x) => x.id === id) : null;
  const f = janela(t ? `Edit ${esc(t.nome)}` : 'New client', `<div class="grade-campos"><label class="campo largo">Full name<input name="nome" value="${esc(t?.nome || '')}"></label><label class="campo">Mobile<input name="tel" inputmode="tel" value="${esc(telBR(t?.tel || ''))}" placeholder="(555) 010-0000"></label><label class="campo">Email<input name="email" type="email" value="${esc(t?.email || '')}"></label><label class="campo largo">Address<input name="end" value="${esc(t?.end || '')}"></label></div>`, `<button class="bt bt-pri">${t ? 'Save' : 'Add client'}</button>`);
  f.onsubmit = (e) => {
    e.preventDefault(); if (!f.nome.value.trim()) return avisar('Type the client name.');
    const dados = { nome: f.nome.value.trim(), tel: soDigitos(f.tel.value), end: f.end.value.trim(), email: f.email.value.trim() };
    if (t) Object.assign(t, dados); else { const nid = uid(); db.tutores.push({ id: nid, ...dados }); est.tutor = nid; }
    salvar(); fecharJanela(); avisar(t ? 'Client updated.' : 'Client added. Now add their pet in Patients.'); desenhar();
  };
}
function abrirVacinaManual(petSel) {
  const f = janela('Add vaccine', `<div class="grade-campos"><label class="campo largo">Pet${campoPet(petSel)}</label><label class="campo largo">Vaccine or dewormer<input name="nome" list="lista-vacinas" placeholder="e.g. DHPP, Rabies, FVRCP"><datalist id="lista-vacinas">${['DHPP', 'Rabies', 'Bordetella', 'Leptospirosis', 'Canine influenza', 'Lyme', 'FVRCP', 'FeLV', 'Dewormer'].map((x) => `<option value="${x}">`).join('')}</datalist></label>
    <label class="campo">Given on<input name="data" type="date" value="${hoje()}"></label><label class="campo">Next dose<input name="prox" type="date" value="${maisDias(hoje(), 365)}"></label><label class="campo">Lot<input name="lote"></label><label class="campo">Where it was given<select name="onde"><option value="aqui">Here (no inventory change)</option><option value="fora">At another clinic</option></select></label></div>
    <p class="nota">Use this for past vaccines from the pet's record or shots given elsewhere. To give a vaccine now and take it from inventory, use "Record vaccine given" in the pet's record.</p>`, '<button class="bt bt-pri">Record</button>');
  f.onsubmit = (e) => { e.preventDefault(); if (!f.nome.value.trim()) return avisar('Type the vaccine name.'); db.vacinas.push({ id: uid(), pet: f.pet.value, nome: f.nome.value.trim() + (f.onde.value === 'fora' ? ' (other clinic)' : ''), data: f.data.value, proxima: f.prox.value || null, lote: f.lote.value.trim() || '—' }); salvar(); fecharJanela(); avisar('Vaccine recorded.'); desenhar(); };
}

// ---------------------------------------------------------------- AUTOMATIC REMINDERS (SMS)
const TIPO_AVISO = { vacina: 'Vaccine', consulta: 'Appointment reminder', aniversario: 'Birthday', exame: 'Lab results' };
const preencher = (m, x) => m.replace(/\{(\w+)\}/g, (_, k) => x[k] ?? '');
function filaAvisos() {
  const c = db.config.avisos, h = hoje(), l = [], feito = new Set(db.avisosEnviados.map((x) => x.chave));
  const add = (tipo, chave, p, dados) => { const t = tutorDe(p); if (!p || !t?.tel || feito.has(chave)) return; l.push({ tipo, chave, pet: p.id, tel: t.tel, texto: preencher(c.modelos[tipo] || MODELOS_AVISO[tipo], { owner: primeiro(t.nome), pet: p.nome, clinic: db.clinica, ...dados }) }); };
  if (c.vacina) db.vacinas.filter((v) => v.proxima && diasAte(v.proxima) <= c.vacina && diasAte(v.proxima) >= -30).forEach((v) => add('vacina', `vacina:${v.id}:${v.proxima}`, pet(v.pet), { vaccine: v.nome, date: dataBR(v.proxima), status: diasAte(v.proxima) < 0 ? `was due on ${dataBR(v.proxima)}` : `is due on ${dataBR(v.proxima)}` }));
  if (c.consulta) { const d = maisDias(h, c.consulta); db.agenda.filter((a) => a.data === d && a.status === 'aguardando').sort((a, b) => a.hora.localeCompare(b.hora)).forEach((a) => add('consulta', `consulta:${a.id}:${a.data}${a.hora}`, pet(a.pet), { type: a.tipo.toLowerCase(), date: dataBR(a.data), day: diaSemana(a.data, 'long'), time: hora12(a.hora) })); }
  if (c.aniversario) aniversariantes().filter((x) => x.dias === 0).forEach(({ p }) => add('aniversario', `aniv:${p.id}:${h.slice(0, 4)}`, p, {}));
  if (c.exame) db.exames.filter((e) => e.status === 'pronto' && !e.avisado).forEach((e) => add('exame', `exame:${e.id}`, pet(e.pet), { test: e.nome }));
  return l;
}
function registrarAviso(x, auto) {
  db.avisosEnviados.push({ id: uid(), chave: x.chave, tipo: x.tipo, pet: x.pet, data: hoje(), hora: horaAgora(), auto });
  if (x.tipo === 'exame') { const e = db.exames.find((y) => `exame:${y.id}` === x.chave); if (e) e.avisado = true; }
}
function telaAvisos() {
  const c = db.config.avisos, fila = filaAvisos(), env = db.avisosEnviados.slice(-40).reverse();
  return `<div class="cab"><div><h1>Automatic reminders</h1><p>${c.ligado ? `On · today's reminders go out at ${hora12(c.hora)} by text message` : 'Off · no reminders go out on their own'}</p></div><div class="acoes"><button class="bt" data-ligar-avisos>${c.ligado ? 'Turn off' : 'Turn on'}</button>${fila.length && c.ligado ? `<button class="bt bt-pri" data-simular-envio>Simulate today's send (${fila.length})</button>` : ''}</div></div>
    <p class="nota aviso-demo">In the live version these reminders go out on their own by text message, with no one clicking. In this demo you see today's queue, can send them one by one, or simulate the automatic send.</p>
    <div class="duas"><section class="cartao"><div class="cartao-cab"><h2>Today's queue</h2><span class="selo selo-aguardando">${fila.length}</span></div>${fila.length ? `<ul class="lista-avisos">${fila.map((x, i) => `<li>${avatar(pet(x.pet), 'mini')}<div><b>${esc(pet(x.pet).nome)} · ${TIPO_AVISO[x.tipo]}</b><p>${esc(x.texto)}</p></div><a class="bt bt-peq bt-zap" data-enviar-aviso="${i}" href="${zap(x.tel, x.texto)}">Send</a></li>`).join('')}</ul>` : '<p class="vazio">Nothing to send today. All caught up.</p>'}</section>
    <section class="cartao"><div class="cartao-cab"><h2>Sent</h2></div>${env.length ? `<ul class="lista-avisos">${env.map((x) => `<li>${avatar(pet(x.pet), 'mini')}<div><b>${esc(pet(x.pet)?.nome || '—')} · ${TIPO_AVISO[x.tipo]}</b><small>${dataBR(x.data)} at ${hora12(x.hora)} · ${x.auto ? 'automatic send (simulated)' : 'sent by text'}</small></div></li>`).join('')}</ul>` : '<p class="vazio">No reminders sent yet.</p>'}</section></div>
    <section class="cartao" style="margin-top:18px"><div class="cartao-cab"><h2>When and what to send</h2></div><div class="cartao-corpo"><form class="cfg-form" data-salvar-cfg="avisos"><div class="grade-campos">
      <label class="campo">Send time<input name="hora" type="time" value="${c.hora}"></label><label class="campo">Vaccine reminder, days before (0 = off)<input name="vacina" type="number" min="0" max="60" inputmode="numeric" value="${c.vacina}"></label><label class="campo">Appointment reminder, days before (0 = off)<input name="consulta" type="number" min="0" max="15" inputmode="numeric" value="${c.consulta}"></label>
      <fieldset class="campo escolhas"><legend>Also send</legend><label><input type="checkbox" name="aniversario" ${c.aniversario ? 'checked' : ''}> Pet birthdays</label><label><input type="checkbox" name="exame" ${c.exame ? 'checked' : ''}> Lab results ready</label></fieldset>
      ${Object.keys(MODELOS_AVISO).map((k) => `<label class="campo largo">Message · ${TIPO_AVISO[k]}<textarea name="m_${k}">${esc(c.modelos[k] || MODELOS_AVISO[k])}</textarea></label>`).join('')}</div>
      <p class="nota">Filled in at send time: {owner}, {pet}, {clinic}, {vaccine}, {status}, {type}, {date}, {day}, {time} and {test}.</p><div class="acoes"><button class="bt bt-pri">Save</button></div></form></div></section>`;
}

// ---------------------------------------------------------------- PACKAGES AND PLANS
const contratosDo = (idPet) => (db.contratos || []).filter((x) => x.pet === idPet && x.ativo && (x.tipo === 'plano' || (x.usados < x.qtd && x.validade >= hoje())));
const usarPacote = (ct) => { ct.usados += 1; ct.usos = [...(ct.usos || []), hoje()]; if (ct.usados >= ct.qtd) ct.ativo = false; };
function telaPacotes() {
  const ativos = db.contratos.filter((x) => x.ativo), planos = ativos.filter((x) => x.tipo === 'plano'), pacs = ativos.filter((x) => x.tipo === 'pacote'), atrasados = planos.filter((x) => diasAte(x.proxima) < 0);
  const linha = (x) => { const p = pet(x.pet); return `<tr><td><span class="com-foto">${avatar(p, 'mini')}<span><b>${esc(p?.nome)}</b><br><small style="color:var(--texto-2)">${esc(tutorDe(p)?.nome)}</small></span></span></td><td><b>${esc(x.nome)}</b><br><small style="color:var(--texto-2)">${x.tipo === 'plano' ? `${reais(x.valor)} per month · since ${dataBR(x.inicio)}` : `valid until ${dataBR(x.validade)}`}</small></td>
    <td>${x.tipo === 'plano' ? (diasAte(x.proxima) < 0 ? `<span class="selo selo-alerta">Payment overdue since ${dataBR(x.proxima)}</span>` : `<span class="selo selo-aguardando">Next charge ${dataBR(x.proxima)}</span>`) : `<div class="uso" title="${x.usados} of ${x.qtd} used">${Array.from({ length: x.qtd }, (_, i) => `<i class="${i < x.usados ? 'usado' : ''}"></i>`).join('')}<small>${x.usados} of ${x.qtd} used</small></div>`}</td>
    <td class="num">${x.tipo === 'plano' ? `<button class="bt bt-peq ${diasAte(x.proxima) <= 3 ? 'bt-pri' : ''}" data-mensalidade="${x.id}">Charge monthly fee</button>` : `<button class="bt bt-peq" data-usar-pacote="${x.id}">Use 1</button>`} <button class="bt bt-peq bt-perigo" data-cancelar-contrato="${x.id}">End</button></td></tr>`; };
  return `<div class="cab"><div><h1>Packages and plans</h1><p>Sell grooming packages and monthly wellness plans. A packaged bath is deducted on its own when the pet is picked up.</p></div><div class="acoes"><button class="bt" data-novo-modelo>+ Create package or plan</button><button class="bt bt-pri" data-vender-pacote="">Sell to a client</button></div></div>
    <div class="numeros"><div class="numero destaque"><span>Monthly recurring</span><b>${reais(planos.reduce((s2, x) => s2 + x.valor, 0))}</b></div><div class="numero"><span>Active plans</span><b>${planos.length}</b></div><div class="numero"><span>Packages in use</span><b>${pacs.length}</b></div><div class="numero"><span>Overdue payments</span><b>${atrasados.length}</b></div></div>
    <section class="cartao"><div class="cartao-cab"><h2>Clients with a package or plan</h2></div>${ativos.length ? `<table class="tabela empilha tabela-pacotes"><thead><tr><th>Pet</th><th>Package or plan</th><th>Status</th><th></th></tr></thead><tbody>${ativos.sort((a, b) => (a.tipo === 'plano' ? a.proxima : a.validade).localeCompare(b.tipo === 'plano' ? b.proxima : b.validade)).map(linha).join('')}</tbody></table>` : '<p class="vazio">No clients with a package or plan yet.</p>'}</section>
    <h2 class="sub-tit" style="margin-top:24px">What the clinic offers</h2><div class="modelos">${db.config.pacotes.map((m) => `<article class="modelo"><span class="selo ${m.tipo === 'plano' ? 'selo-atendimento' : 'selo-chegou'}">${m.tipo === 'plano' ? 'Monthly plan' : 'Package'}</span><h3>${esc(m.nome)}</h3><b class="preco">${reais(m.valor)}${m.tipo === 'plano' ? '<small>/mo</small>' : ''}</b><p>${m.tipo === 'plano' ? esc(m.inclui) : `${m.qtd}× ${esc(m.servico)} · valid ${m.dias} days · ${reais(m.valor / m.qtd)} each`}</p><div class="acoes"><button class="bt bt-peq bt-pri" data-vender-pacote="${m.id}">Sell</button><button class="bt bt-peq bt-perigo" data-tirar-modelo="${m.id}">Remove</button></div></article>`).join('')}</div>`;
}
function abrirVenderPacote(idModelo) {
  const f = janela('Sell a package or plan', `<div class="grade-campos"><label class="campo largo">Pet${campoPet(est.sel)}</label><label class="campo largo">Package or plan<select name="modelo">${db.config.pacotes.map((m) => `<option value="${m.id}" ${m.id === idModelo ? 'selected' : ''}>${esc(m.nome)} · ${reais(m.valor)}${m.tipo === 'plano' ? ' per month' : ''}</option>`).join('')}</select></label>
    <label class="campo">Payment method<select name="forma">${FORMAS.map((x) => `<option>${x}</option>`).join('')}</select></label></div><p class="nota">A package is paid now and each use is deducted. For a plan, the first month is charged now and the next charge is set for 30 days from today.</p>`, '<button class="bt bt-pri">Sell and take payment</button>');
  f.onsubmit = (e) => {
    e.preventDefault(); const m = db.config.pacotes.find((x) => x.id === f.modelo.value), h = hoje(); if (!m) return;
    if (db.contratos.some((x) => x.ativo && x.pet === f.pet.value && x.modelo === m.id && (x.tipo === 'plano' || x.usados < x.qtd))) return avisar(`${pet(f.pet.value).nome} already has ${m.nome}.`);
    db.contratos.push({ id: uid(), pet: f.pet.value, modelo: m.id, tipo: m.tipo, nome: m.nome, servico: m.servico, qtd: m.qtd, valor: m.valor, desconto: m.desconto, ativo: true, inicio: h, ...(m.tipo === 'plano' ? { proxima: maisDias(h, 30) } : { usados: 0, validade: maisDias(h, m.dias) }) });
    const fiado = fiadoForma(f.forma.value);
    db.vendas.push({ id: uid(), data: h, hora: horaAgora(), pet: f.pet.value, itens: [{ nome: m.tipo === 'plano' ? `${m.nome} (first month)` : `Package ${m.nome}`, valor: m.valor, qtd: 1 }], forma: f.forma.value, recebido: !fiado, vet: '' });
    salvar(); fecharJanela(); est.secao = 'pacotes'; avisar(`${m.nome} sold to ${pet(f.pet.value).nome}.`); desenhar();
  };
}
function abrirNovoModelo() {
  const f = janela('Create a package or plan', `<div class="grade-campos"><label class="campo">Type<select name="tipo"><option value="pacote">Package (e.g. 4 baths)</option><option value="plano">Monthly plan</option></select></label><label class="campo">Name<input name="nome" placeholder="e.g. 8 baths"></label>
    <label class="campo" data-so="pacote">Service<input name="servico" list="lista-servicos" value="Bath"><datalist id="lista-servicos">${servicos().map(([n]) => `<option value="${esc(n)}">`).join('')}</datalist></label><label class="campo" data-so="pacote">Quantity<input name="qtd" type="number" min="1" value="4"></label><label class="campo" data-so="pacote">Valid for (days)<input name="dias" type="number" min="1" value="60"></label>
    <label class="campo" data-so="plano" hidden>Discount on services (%)<input name="desconto" inputmode="decimal" value="10"></label><label class="campo largo" data-so="plano" hidden>What's included<input name="inclui" placeholder="e.g. 1 exam per month and 10% off"></label>
    <label class="campo">Price ($)<input name="valor" inputmode="decimal"></label></div>`, '<button class="bt bt-pri">Create</button>');
  f.tipo.onchange = () => f.querySelectorAll('[data-so]').forEach((x) => { x.hidden = x.dataset.so !== f.tipo.value; });
  f.onsubmit = (e) => {
    e.preventDefault(); const valor = num(f.valor.value); if (!f.nome.value.trim() || !(valor > 0)) return avisar('Fill in the name and the price.');
    db.config.pacotes.push(f.tipo.value === 'plano' ? { id: uid(), tipo: 'plano', nome: f.nome.value.trim(), valor, desconto: num(f.desconto.value) || 0, inclui: f.inclui.value.trim() || `${num(f.desconto.value) || 0}% off services` } : { id: uid(), tipo: 'pacote', nome: f.nome.value.trim(), servico: f.servico.value.trim() || 'Bath', qtd: Math.max(1, Math.round(Number(f.qtd.value)) || 1), valor, dias: Math.max(1, Math.round(Number(f.dias.value)) || 60) });
    salvar(); fecharJanela(); avisar('Created. Ready to sell.'); desenhar();
  };
}

// ---------------------------------------------------------------- COMMISSIONS
const ehServico = (i) => i.valor > 0 && !db.estoque.some((x) => x.nome === i.nome);
function cartaoComissoes(l) {
  const por = {}; l.forEach((v) => { if (!v.vet) return; por[v.vet] = (por[v.vet] || 0) + v.itens.filter(ehServico).reduce((s2, i) => s2 + i.valor * i.qtd, 0); });
  const linhas = db.vets.map((v) => [v, por[v] || 0, db.config.comissoes[v] ?? 0]);
  return `<section class="cartao" style="margin-top:18px"><div class="cartao-cab"><h2>Commissions, last 30 days</h2><button class="bt bt-peq" data-cfg-ir="comissoes">Change rates</button></div><table class="tabela empilha"><thead><tr><th>Team member</th><th class="num">Services performed</th><th class="num">Rate</th><th class="num">To pay</th></tr></thead><tbody>${linhas.map(([v, sv, p]) => `<tr><td><b>${esc(v)}</b></td><td class="num">${reais(sv)}</td><td class="num">${p}%</td><td class="num"><b>${reais(sv * p / 100)}</b></td></tr>`).join('')}<tr><td><b>Total</b></td><td class="num">${reais(linhas.reduce((a, x) => a + x[1], 0))}</td><td></td><td class="num"><b>${reais(linhas.reduce((a, x) => a + x[1] * x[2] / 100, 0))}</b></td></tr></tbody></table></section>`;
}
const profissionalPadrao = (idPet, itens = []) => itens.some((i) => ehEstetica(i.nome)) ? db.vets.find((v) => !v.startsWith('Dr')) : (db.agenda.find((a) => a.pet === idPet && a.data === hoje())?.vet || db.vets.find((v) => v.startsWith('Dr')));

// ---------------------------------------------------------------- INVOICE
function abrirNFSe(idVenda) {
  const v = db.vendas.find((x) => x.id === idVenda); if (v.nfse) return imprimirNFSe(v);
  const t = tutorDe(pet(v.pet)), fis = db.config.fiscal;
  const prod = v.itens.filter((i) => i.valor > 0 && !ehServico(i)).reduce((a, i) => a + i.valor * i.qtd, 0), sub = total(v), imp = Math.round(prod * fis.taxa) / 100;
  const f = janela('Create invoice', `<div class="grade-campos"><label class="campo largo">Bill to<input name="nome" value="${esc(t?.nome || '')}"></label><label class="campo largo">Email the invoice to<input name="email" type="email" value="${esc(t?.email || '')}"></label></div>
    <table class="tabela" style="margin-top:12px">${v.itens.map((i) => `<tr><td>${esc(i.nome)}${i.qtd > 1 ? ` ×${i.qtd}` : ''}</td><td class="num">${reais(i.valor * i.qtd)}</td></tr>`).join('')}<tr><td>Sales tax on products (${fis.taxa}%)</td><td class="num">${reais(imp)}</td></tr><tr><td><b>Total</b></td><td class="num"><b>${reais(sub + imp)}</b></td></tr></table>
    <p class="nota">Demo: the invoice opens for printing. In the live version it's emailed to the client as a PDF.</p>`, '<button class="bt bt-pri">Create invoice</button>');
  f.onsubmit = (e) => {
    e.preventDefault(); if (!f.nome.value.trim()) return avisar('Type who the invoice is for.');
    v.nfse = { numero: fis.proxima, data: hoje(), hora: horaAgora(), tomador: f.nome.value.trim(), email: f.email.value.trim(), sub, imp, itens: v.itens.map(({ nome, valor, qtd }) => ({ nome, valor, qtd })) };
    fis.proxima += 1; if (t && f.email.value.trim() && !t.email) t.email = f.email.value.trim();
    salvar(); fecharJanela(); avisar(`Invoice #${v.nfse.numero} created.`); desenhar(); imprimirNFSe(v);
  };
}
function imprimirNFSe(v) {
  const n = v.nfse;
  imprimir(`Invoice #${n.numero}`, `<table><tr><th>Invoice</th><td>#${n.numero}</td><th>Date</th><td>${dataBR(n.data)} ${hora12(n.hora)}</td></tr></table>
    <h2>From</h2><p>${esc(db.clinica)} · EIN ${esc(db.config.cnpj)}<br>${esc(db.config.endereco)} · ${esc(db.config.cidade)}</p>
    <h2>Bill to</h2><p>${esc(n.tomador)}${n.email ? ` · ${esc(n.email)}` : ''}</p>
    <h2>Items</h2><table><tr><th>Description</th><th>Qty</th><th>Amount</th></tr>${n.itens.map((i) => `<tr><td>${esc(i.nome)}</td><td>${i.qtd}</td><td>${reais(i.valor * i.qtd)}</td></tr>`).join('')}<tr><td>Sales tax</td><td></td><td>${reais(n.imp)}</td></tr><tr><th>Total</th><td></td><th>${reais(n.sub + n.imp)}</th></tr></table>
    <p style="margin-top:24px">Paid by ${esc(v.forma.toLowerCase())}${v.recebido ? '' : ' · balance due'}. Thank you for trusting us with your pet's care.</p>`);
}

// ---------------------------------------------------------------- CONTROLLED SUBSTANCE PRESCRIPTION
function abrirReceitaControle(idPet, idPr) {
  const p = pet(idPet), pr = db.prontuarios.find((x) => x.id === idPr);
  const f = janela(`Controlled substance Rx · ${esc(p.nome)}`, `<div class="grade-campos"><label class="campo largo">Drug and strength<input name="med" placeholder="e.g. Tramadol 50 mg"></label><label class="campo">Quantity (number and words)<input name="qtd" placeholder="e.g. 10 (ten) tablets"></label><label class="campo">Refills<input name="refil" type="number" min="0" max="5" value="0"></label>
    <label class="campo">Prescriber<input name="vet" list="lista-vets" value="${esc(pr?.vet || db.vets.find((v) => v.startsWith('Dr')) || '')}">${listaVets()}</label><label class="campo largo">Directions<textarea name="uso" placeholder="Dose, frequency and duration">${esc(pr?.prescricao || '')}</textarea></label></div>
    <p class="nota">Printed with the clinic's address, the prescriber's license and DEA number, and a signature line.</p>`, '<button class="bt bt-pri">Print prescription</button>');
  f.onsubmit = (e) => {
    e.preventDefault(); if (!f.med.value.trim() || !f.qtd.value.trim() || !f.uso.value.trim() || !f.vet.value.trim()) return avisar('Fill in the drug, quantity, directions and prescriber.');
    const t = tutorDe(p), c = db.config;
    fecharJanela(); imprimir(`Controlled substance prescription · ${p.nome}`, `<table><tr><th colspan="2">Prescriber</th></tr><tr><td>Name</td><td>${esc(f.vet.value)}</td></tr><tr><td>License</td><td>${esc(c.crmv)}</td></tr><tr><td>DEA #</td><td>${esc(c.dea || '__________')}</td></tr><tr><td>Address</td><td>${esc(db.clinica)} · ${esc(c.endereco)} · ${esc(c.cidade)}</td></tr><tr><td>Phone</td><td>${esc(telBR(c.telefone))}</td></tr></table>
      ${cabPet(p)}<p><b>Owner address:</b> ${esc(t?.end || '________________________________')}</p>
      <h2>Rx</h2><p><b>${esc(f.med.value.trim())}</b> · ${esc(f.qtd.value.trim())} · Refills: ${Number(f.refil.value) || 0}</p><p style="white-space:pre-wrap">${esc(f.uso.value.trim())}</p>
      <div class="assin"><div>${esc(f.vet.value)} · signature<br>Date: ${dataBR(hoje())}</div></div>`);
  };
}

// ---------------------------------------------------------------- LAB ATTACHMENTS (PDF or photo)
function lerAnexo(arq) {
  return new Promise((ok, erro) => {
    if (!arq) return erro(new Error('Choose a file.'));
    if (arq.type === 'application/pdf') { if (arq.size > 1.5e6) return erro(new Error('PDF too large for the demo (up to 1.5 MB).')); const r = new FileReader(); r.onload = () => ok({ nome: arq.name, dados: r.result }); r.onerror = () => erro(new Error("Couldn't read the PDF.")); return r.readAsDataURL(arq); }
    if (!arq.type.startsWith('image/')) return erro(new Error('Attach a PDF or a photo.'));
    const img = new Image(), url = URL.createObjectURL(arq);
    img.onload = () => { const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok({ nome: arq.name.replace(/\.\w+$/, '.jpg'), dados: c.toDataURL('image/jpeg', .82) }); };
    img.onerror = () => erro(new Error("Couldn't open that image.")); img.src = url;
  });
}
function verAnexo(x) {
  const [cab, b64] = x.dados.split(','), tipo = cab.match(/:(.*?);/)[1], bin = atob(b64), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  if (!window.open(URL.createObjectURL(new Blob([u8], { type: tipo })), '_blank')) avisar('Allow pop-ups to view the file.');
}

// ---------------------------------------------------------------- ONLINE BOOKING
const FILA_PEDIDOS = 'vetnature-en-requests-demo';
const linkAgendar = () => new URL('book.html', location.href).href;
function trazerPedidos() {
  let novos = []; try { novos = JSON.parse(localStorage.getItem(FILA_PEDIDOS)) || []; localStorage.removeItem(FILA_PEDIDOS); } catch { /* no storage */ }
  if (novos.length) { db.pedidos.push(...novos); salvar(); }
  return novos.length;
}
function blocoPedidos() {
  const l = db.pedidos.filter((x) => x.status === 'novo').sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  if (!l.length) return '';
  return `<section class="cartao pedidos"><div class="cartao-cab"><h2>Online requests · ${l.length} waiting for confirmation</h2></div><ul class="lista-avisos">${l.map((x) => `<li><div class="avatar mini">${IC[x.especie] || IC.outro}</div><div><b>${esc(x.pet)} · ${esc(x.tipo)} · ${diaSemana(x.data)} ${dataBR(x.data)} at ${hora12(x.hora)}</b><small>${esc(x.nome)} · ${esc(telBR(x.tel))}${x.obs ? ` · “${esc(x.obs)}”` : ''}</small></div><span class="acoes"><button class="bt bt-peq bt-pri" data-confirmar-pedido="${x.id}">Confirm</button><button class="bt bt-peq" data-recusar-pedido="${x.id}">Decline</button></span></li>`).join('')}</ul></section>`;
}
function confirmarPedido(id) {
  const x = db.pedidos.find((y) => y.id === id);
  let t = db.tutores.find((y) => soDigitos(y.tel) === soDigitos(x.tel));
  if (!t) { t = { id: uid(), nome: x.nome, tel: soDigitos(x.tel), end: '' }; db.tutores.push(t); }
  let p = db.pets.find((y) => y.tutor === t.id && sem(y.nome) === sem(x.pet));
  if (!p) { p = { id: uid(), tutor: t.id, nome: x.pet, especie: x.especie, raca: 'Mixed breed', sexo: 'Unknown', nasc: maisDias(hoje(), -365), castrado: false, alergias: '', pelagem: '', microchip: '', obs: 'Added from an online booking: confirm breed, sex and age at check-in.', foto: '', pesos: [] }; db.pets.push(p); }
  const opcoes = db.vets.filter((v) => (ehEstetica(x.tipo) ? !v.startsWith('Dr') : v.startsWith('Dr')));
  const vet = opcoes.find((v) => !db.agenda.some((a) => a.data === x.data && a.hora === x.hora && a.vet === v)) || opcoes[0] || db.vets[0];
  db.agenda.push({ id: uid(), data: x.data, hora: x.hora, pet: p.id, tipo: x.tipo, vet, status: 'aguardando', valor: TIPOS[x.tipo] ?? 0 });
  x.status = 'confirmado'; salvar(); desenhar(); avisar(`Confirmed: ${p.nome} on ${dataBR(x.data)} at ${hora12(x.hora)} with ${vet}.`);
  simularZap(zap(x.tel, `Hi ${primeiro(x.nome)}, your request is confirmed: ${x.pet}'s ${x.tipo.toLowerCase()} at ${db.clinica} on ${diaSemana(x.data, 'long')}, ${dataBR(x.data)} at ${hora12(x.hora)}. See you then!`));
}
function recusarPedido(id) {
  const x = db.pedidos.find((y) => y.id === id); if (!confirm(`Decline ${x.nome}'s request?`)) return;
  x.status = 'recusado'; salvar(); desenhar();
  simularZap(zap(x.tel, `Hi ${primeiro(x.nome)}, this is ${db.clinica}. Unfortunately ${hora12(x.hora)} on ${dataBR(x.data)} is no longer available. Can we find another time for ${x.pet}?`));
}
function abrirLinkAgenda() {
  const url = linkAgendar();
  const f = janela('Online booking link', `<p style="margin-top:0">Clients pick a day and a free time slot; the request shows up here in the Schedule for you to confirm.</p><label class="campo">Link<input name="link" value="${esc(url)}" readonly></label>
    ${db.config.agendaOnline.ligado ? '' : '<p class="nota">Online booking is off. Turn it on in Settings · Online booking.</p>'}`, `<a class="bt" href="${esc(url)}" target="_blank" rel="noopener">Open the page</a><button class="bt bt-pri">Copy link</button>`);
  f.onsubmit = async (e) => { e.preventDefault(); try { await navigator.clipboard.writeText(url); avisar('Link copied.'); } catch { f.link.select(); avisar('Link selected: copy it.'); } };
}

// ---------------------------------------------------------------- TEXT MESSAGE PREVIEW (demo: nothing is actually sent)
function simularZap(url) {
  const u = new URL(url), tel = soDigitos(u.pathname).replace(/^1(?=\d{10}$)/, ''), msg = u.searchParams.get('body') || '';
  const t = db.tutores.find((x) => soDigitos(x.tel) === tel);
  let el = $('#zap-sim');
  if (!el) { el = document.createElement('div'); el.id = 'zap-sim'; el.className = 'zap-fundo'; document.body.append(el); el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-fechar-zap]')) el.hidden = true; }); }
  el.innerHTML = `<div class="zap" role="dialog" aria-modal="true" aria-label="Text message preview"><div class="zap-cab"><span class="zap-foto">${esc((t?.nome || '?')[0])}</span><span><b>${esc(t?.nome || (tel ? telBR(tel) : 'Choose a contact'))}</b><small>${tel ? `${esc(telBR(tel))} · sample number` : 'you pick who to send it to'}</small></span><button type="button" class="fechar" data-fechar-zap aria-label="Close">×</button></div>
    <div class="zap-conversa"><div class="zap-msg">${esc(msg).replace(/\n/g, '<br>')}<span class="zap-hora">${hora12(horaAgora())} <span aria-label="delivered">✓✓</span></span></div></div>
    <p class="zap-nota"><b>Preview only.</b> Nothing was sent. In the live version this text goes out from the clinic's number.</p>
    <div class="zap-pe"><button type="button" class="bt" data-copiar-zap>Copy message</button><button type="button" class="bt bt-pri" data-fechar-zap>Close</button></div></div>`;
  el.hidden = false; el.querySelector('.zap .bt-pri').focus();
  el.querySelector('[data-copiar-zap]').onclick = async () => { try { await navigator.clipboard.writeText(msg); avisar('Message copied.'); } catch { avisar("Couldn't copy in this browser."); } };
}
// every text-message link in the demo opens the preview
document.addEventListener('click', (e) => { const l = e.target.closest('a[href^="sms:"]'); if (!l) return; e.preventDefault(); simularZap(l.href); }, true);

// ---------------------------------------------------------------- rendering and clicks
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
  if (d.avancar) { const a = db.agenda.find((x) => x.id === d.avancar); if (d.para === 'pronto') return abrirProntuario(a.pet); a.status = d.para; salvar(); avisar(d.para === 'chegou' ? `${pet(a.pet).nome} checked in.` : `Exam started for ${pet(a.pet).nome}.`); return desenhar(); }
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
  if (d.agendarVac) { const v = db.vacinas.find((x) => x.id === d.agendarVac); return abrirAgendar(v.pet, 'Vaccine'); }
  if (d.semana) { est.dia = d.semana === '0' ? hoje() : maisDias(est.dia, Number(d.semana)); return desenhar(); }
  if (d.dose) { const [i, k] = d.dose.split(':'); const int = db.internados.find((x) => x.id === i); int.doses[Number(k)].feita = true; salvar(); avisar(`Dose given: ${int.doses[Number(k)].remedio}.`); return desenhar(); }
  if (d.novaDose) return abrirNovaDose(d.novaDose);
  if (d.alta) { const i = db.internados.find((x) => x.id === d.alta); if (!confirm(`Discharge ${pet(i.pet).nome}?`)) return; const diarias = Math.max(1, diasAte(hoje()) - diasAte(i.entrada) + 1); db.internados = db.internados.filter((x) => x.id !== d.alta); salvar(); desenhar(); return abrirCobrar(i.pet, [{ nome: 'Hospitalization (per day)', valor: db.config.diaria || 95, qtd: diarias }]); }
  if (d.banho !== undefined) return abrirBanho(d.banho || est.sel);
  if (d.etapa) { const x = db.estetica.find((y) => y.id === d.etapa); x.status = ESTETICA[ESTETICA.findIndex(([k]) => k === x.status) + 1][0]; salvar(); return desenhar(); }
  if (d.entregue) { const x = db.estetica.find((y) => y.id === d.entregue); db.estetica = db.estetica.filter((y) => y.id !== d.entregue); const ct = contratosDo(x.pet).find((c) => c.tipo === 'pacote' && c.servico === x.servico); if (ct) { usarPacote(ct); salvar(); desenhar(); return avisar(`${pet(x.pet).nome}: 1 used from package ${ct.nome} (${ct.qtd - ct.usados} left). Nothing to charge.`); } salvar(); desenhar(); return abrirCobrar(x.pet, [{ nome: x.servico, valor: (servicos().find(([n]) => n === x.servico) || [0, 40])[1], qtd: 1 }]); }
  if (d.pedirExame !== undefined) return abrirPedirExame(d.pedirExame || est.sel);
  if (d.coletar) { db.exames.find((x) => x.id === d.coletar).status = 'coletado'; salvar(); return desenhar(); }
  if (d.resultado) return abrirResultado(d.resultado);
  if (d.avisado) { db.exames.find((x) => x.id === d.avisado).avisado = true; salvar(); setTimeout(desenhar, 50); return; }
  if (d.receber) { const v = db.vendas.find((x) => x.id === d.receber); v.recebido = true; v.forma = 'Credit card'; v.recebidoEm = hoje(); salvar(); avisar(`Paid: ${reais(total(v))}.`); return desenhar(); }
  if (d.entrada) return abrirEntrada(d.entrada);
  if (d.novoItem !== undefined) return abrirNovoItem();
  if (d.novoTutor !== undefined) return abrirTutor(null);
  if (d.editarTutor) return abrirTutor(d.editarTutor);
  if (d.vacinaManual !== undefined) return abrirVacinaManual(d.vacinaManual || est.sel);
  if (d.cfg) { est.cfg = d.cfg; return desenhar(); }
  if (d.cfgIr) { est.secao = 'config'; est.cfg = d.cfgIr; return desenhar(); }
  if (d.receitaControle) { const [id, pr] = d.receitaControle.split(':'); return abrirReceitaControle(id, pr); }
  if (d.verAnexo) { const [id, k] = d.verAnexo.split(':'); return verAnexo(db.exames.find((x) => x.id === id).anexos[Number(k)]); }
  if (d.tirarAnexo) { const [id, k] = d.tirarAnexo.split(':'), x = db.exames.find((y) => y.id === id); if (!confirm(`Remove the file ${x.anexos[Number(k)].nome}?`)) return; x.anexos.splice(Number(k), 1); salvar(); return desenhar(); }
  if (d.nfse) return abrirNFSe(d.nfse);
  if (d.enviarAviso !== undefined) { const x = filaAvisos()[Number(d.enviarAviso)]; if (x) { registrarAviso(x, false); salvar(); setTimeout(desenhar, 50); } return; }
  if (d.simularEnvio !== undefined) { const l = filaAvisos(); l.forEach((x) => registrarAviso(x, true)); salvar(); avisar(`${s(l.length, 'reminder', 'reminders')} sent (simulated).`); return desenhar(); }
  if (d.ligarAvisos !== undefined) { db.config.avisos.ligado = !db.config.avisos.ligado; salvar(); return desenhar(); }
  if (d.venderPacote !== undefined) return abrirVenderPacote(d.venderPacote);
  if (d.novoModelo !== undefined) return abrirNovoModelo();
  if (d.tirarModelo) { if (!confirm('Remove this package or plan from the list? Clients who bought it keep it.')) return; db.config.pacotes = db.config.pacotes.filter((x) => x.id !== d.tirarModelo); salvar(); return desenhar(); }
  if (d.usarPacote) { const ct = db.contratos.find((x) => x.id === d.usarPacote); usarPacote(ct); salvar(); avisar(`1 used from ${ct.nome} (${ct.qtd - ct.usados} left).`); return desenhar(); }
  if (d.mensalidade) { const ct = db.contratos.find((x) => x.id === d.mensalidade); db.vendas.push({ id: uid(), data: hoje(), hora: horaAgora(), pet: ct.pet, itens: [{ nome: `${ct.nome} (monthly fee)`, valor: ct.valor, qtd: 1 }], forma: 'Credit card', recebido: true, vet: '' }); ct.proxima = maisDias(diasAte(ct.proxima) < -30 ? hoje() : ct.proxima, 30); salvar(); avisar(`Monthly fee collected: ${reais(ct.valor)}. Next on ${dataBR(ct.proxima)}.`); return desenhar(); }
  if (d.cancelarContrato) { const ct = db.contratos.find((x) => x.id === d.cancelarContrato); if (!confirm(`End ${ct.nome} for ${pet(ct.pet)?.nome}?`)) return; ct.ativo = false; salvar(); return desenhar(); }
  if (d.linkAgenda !== undefined) return abrirLinkAgenda();
  if (d.confirmarPedido) return confirmarPedido(d.confirmarPedido);
  if (d.recusarPedido) return recusarPedido(d.recusarPedido);
  if (d.conta !== undefined) { est.secao = 'config'; est.cfg = 'conta'; return desenhar(); }
  if (d.ia !== undefined) return abrirIA();
  if (d.fecharIa !== undefined) { $('#painel-ia').hidden = true; return; }
  if (d.perguntar) return perguntar(d.perguntar);
  if (d.tirarVet) { db.vets.splice(Number(d.tirarVet), 1); salvar(); return desenhar(); }
  if (d.tirarServ) { db.config.servicos.splice(Number(d.tirarServ), 1); salvar(); return desenhar(); }
  if (d.baixarCopia !== undefined) { const u = URL.createObjectURL(new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' })); const l = document.createElement('a'); l.href = u; l.download = `vetnature-backup-${hoje()}.json`; l.click(); URL.revokeObjectURL(u); return; }
  if (d.recomecar !== undefined) { if (!confirm('Discard your changes and reload the sample data?')) return; db = completar(exemplo()); salvar(); est.sel = null; est.secao = 'hoje'; est.tutor = null; return desenhar(); }
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
  if (e.target.matches('[data-anexar]')) { const x = db.exames.find((y) => y.id === e.target.dataset.anexar); lerAnexo(e.target.files[0]).then((an) => { x.anexos.push(an); salvar(); avisar(`File attached to ${x.nome}.`); desenhar(); }).catch((er) => avisar(er.message)); return; }
  if (e.target.matches('[data-voltar-copia]')) { const r = new FileReader(); r.onload = () => { try { const n = JSON.parse(r.result); if (!n.pets || !n.tutores) throw 0; db = completar(n); salvar(); avisar('Backup restored.'); desenhar(); } catch { avisar("That file isn't a VetNature backup."); } }; r.readAsText(e.target.files[0]); }
});
$('#janela').addEventListener('click', (e) => { if (e.target.id === 'janela') fecharJanela(); });
document.addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; const z = $('#zap-sim'); if (z && !z.hidden) { z.hidden = true; return; } if (!$('#janela').hidden) fecharJanela(); });
$('#busca').addEventListener('input', (e) => { est.busca = e.target.value; est.secao = 'pacientes'; const l = db.pets.filter((p) => `${p.nome} ${tutorDe(p)?.nome}`.toLowerCase().includes(est.busca.toLowerCase())); est.sel = l.length === 1 ? l[0].id : est.sel; desenhar(); });
// a request made on the client page (another tab) shows up right away
addEventListener('storage', (e) => { if (e.key === FILA_PEDIDOS && e.newValue && trazerPedidos()) { avisar('A new online booking request arrived.'); desenhar(); } });
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h !== est.secao && SECOES.some(([k]) => k === h)) { est.secao = h; desenhar(); } });
{ const h = location.hash.slice(1); if (SECOES.some(([k]) => k === h)) est.secao = h; }
trazerPedidos();
desenhar();
