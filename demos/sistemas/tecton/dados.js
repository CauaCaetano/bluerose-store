// Tecton · empresas de exemplo da demonstração (uma por ramo, em Orlândia/SP, cerca de 30 dias de movimento).
// As datas são contadas a partir do dia em que a pessoa abre a demonstração. Nomes e números são inventados.
import { vazia, hoje, somaDias, somaMeses, dias, uid, usarSemente } from './nucleo.js?v=2';

// sorteio repetível (a mesma demonstração para todo mundo)
function sorteio(s) { return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
const H = () => hoje();
const D = (n) => somaDias(H(), n);
const F = (n) => `fotos/${n}-p.webp?v=1`;
const pes = (tipo, nome, fone, extra = {}) => ({ id: uid('p'), tipo, nome, fone, email: '', doc: '', cidade: 'Orlândia/SP', obs: '', ...extra });

// ================================================================== construtora
function construtora() {
  const e = vazia(), c = e.config;
  Object.assign(c, { nome: 'Alicerce Construções', cidade: 'Orlândia', uf: 'SP', ramos: ['construtora'], ramo: 'construtora', cnpj: '12.345.678/0001-90', fone: '(16) 99812-4410', email: 'obras@alicerce.exemplo', endereco: 'Rua 7, 418 · Centro', saldoInicial: 48200 });
  const cli = [pes('cliente', 'Ricardo e Marina Martins', '(16) 99701-2233'), pes('cliente', 'Agro Orlândia Ltda', '(16) 3826-4100', { doc: '22.333.444/0001-55' }), pes('cliente', 'Clínica Santa Rita', '(16) 99655-1020'), pes('cliente', 'Paulo e Beatriz Rezende', '(16) 99133-8790')];
  const forn = [pes('fornecedor', 'Depósito São Bento', '(16) 3826-1515'), pes('fornecedor', 'Concreteira Mogiana', '(16) 3820-7700'), pes('fornecedor', 'Ferro e Aço Orlândia', '(16) 3826-3030'), pes('fornecedor', 'Elétrica Nova Luz', '(16) 99210-4545'), pes('fornecedor', 'Locadora Andaime Forte', '(16) 99876-1200')];
  e.pessoas = [...cli, ...forn];
  e.trab = [['Sebastião Lima', 'Mestre de obras', 280], ['Antônio Ferreira', 'Pedreiro', 220], ['José Carlos', 'Pedreiro', 220], ['Wellington Souza', 'Armador', 210], ['Lucas Prado', 'Carpinteiro', 210], ['Diego Alves', 'Servente', 140], ['Renan Costa', 'Servente', 140], ['Marcos Vieira', 'Eletricista', 240]]
    .map(([nome, funcao, diaria], i) => ({ id: uid('t'), nome, funcao, diaria, fone: `(16) 99${String(400 + i * 37).padStart(3, '0')}-${String(1000 + i * 211)}` }));
  const etapas = (ini, lista) => { let d = ini; return lista.map(([nome, dur, pct]) => { const et = { id: uid('e'), nome, ini: d, fim: somaDias(d, dur), pct }; d = somaDias(d, Math.round(dur * 0.8)); return et; }); };
  const item = (etapa, tipo, desc, un, qtd, unit) => ({ id: uid('i'), etapa, tipo, desc, un, qtd, unit });
  // obra 1: Residência Martins (em andamento)
  const e1 = etapas(D(-120), [['Serviços preliminares', 10, 100], ['Fundação', 25, 100], ['Estrutura', 45, 80], ['Alvenaria', 40, 65], ['Cobertura', 25, 20], ['Instalações', 45, 15], ['Acabamento', 50, 0]]);
  const o1 = { id: uid('o'), nome: 'Residência Martins', cliente: cli[0].id, endereco: 'Rua das Acácias, 120 · Jardim Boa Vista', inicio: e1[0].ini, fim: e1[6].fim, status: 'andamento', tipo: 'residencial', multaDia: 150, horario: 'seg a sex, 7h às 17h; sábado até 12h', foto: F('muro-antes'), token: uid('k'),
    etapas: e1, bdi: 22, valor: 0, medicoes: [], aditivos: [], diario: [], docs: [] };
  o1.orc = [
    item(e1[0].id, 'material', 'Tapume e barracão', 'verba', 1, 3800), item(e1[0].id, 'mao', 'Limpeza e locação da obra', 'dia', 6, 180),
    item(e1[1].id, 'material', 'Concreto usinado fck 25', 'm³', 18, 520), item(e1[1].id, 'material', 'Aço CA-50', 'kg', 1200, 8.9), item(e1[1].id, 'mao', 'Equipe de fundação', 'dia', 40, 220),
    item(e1[2].id, 'material', 'Concreto usinado fck 25', 'm³', 32, 520), item(e1[2].id, 'material', 'Aço CA-50', 'kg', 2600, 8.9), item(e1[2].id, 'equip', 'Escoras metálicas (aluguel)', 'mês', 3, 900), item(e1[2].id, 'mao', 'Armação e forma', 'dia', 70, 215),
    item(e1[3].id, 'material', 'Bloco cerâmico 14x19x39', 'pç', 6800, 1.65), item(e1[3].id, 'material', 'Argamassa de assentamento', 'sc', 160, 24), item(e1[3].id, 'mao', 'Pedreiro e servente', 'dia', 90, 180),
    item(e1[4].id, 'material', 'Telha cerâmica e madeiramento', 'm²', 210, 118), item(e1[4].id, 'mao', 'Carpinteiro de telhado', 'dia', 24, 230),
    item(e1[5].id, 'material', 'Material elétrico e hidráulico', 'verba', 1, 21500), item(e1[5].id, 'mao', 'Eletricista e encanador', 'dia', 40, 240),
    item(e1[6].id, 'material', 'Porcelanato 60x60', 'm²', 190, 72), item(e1[6].id, 'material', 'Tinta e massa', 'verba', 1, 9800), item(e1[6].id, 'mao', 'Acabamento', 'dia', 75, 210),
  ];
  // obra 2: Galpão Agro Orlândia
  const e2 = etapas(D(-55), [['Terraplenagem', 12, 100], ['Fundação', 25, 70], ['Estrutura metálica', 40, 25], ['Cobertura', 25, 0], ['Piso industrial', 20, 0]]);
  const o2 = { id: uid('o'), nome: 'Galpão Agro Orlândia', cliente: cli[1].id, endereco: 'Rodovia Anhanguera, km 372 · Distrito Industrial', inicio: e2[0].ini, fim: e2[4].fim, status: 'andamento', tipo: 'galpao', multaDia: 800, horario: 'seg a sáb, 7h às 17h', foto: F('piso-antes'), token: uid('k'), etapas: e2, bdi: 20, valor: 0, medicoes: [], aditivos: [], diario: [], docs: [] };
  o2.orc = [item(e2[0].id, 'equip', 'Máquina e caminhão', 'h', 120, 260), item(e2[1].id, 'material', 'Concreto usinado fck 30', 'm³', 64, 560), item(e2[1].id, 'material', 'Aço CA-50', 'kg', 4200, 8.9), item(e2[1].id, 'mao', 'Equipe de fundação', 'dia', 60, 220),
    item(e2[2].id, 'material', 'Estrutura metálica (fornecimento)', 'kg', 18000, 14.5), item(e2[2].id, 'mao', 'Montagem da estrutura', 'verba', 1, 52000), item(e2[3].id, 'material', 'Telha metálica termoacústica', 'm²', 1200, 96),
    item(e2[3].id, 'mao', 'Montagem da cobertura', 'verba', 1, 28000), item(e2[4].id, 'material', 'Concreto e fibra para piso', 'm³', 150, 590), item(e2[4].id, 'mao', 'Piso polido', 'm²', 1200, 32)];
  // obra 3: reforma da clínica
  const e3 = etapas(D(-40), [['Demolição', 6, 100], ['Instalações', 15, 100], ['Drywall e forro', 12, 90], ['Revestimentos', 14, 70], ['Pintura', 8, 30]]);
  const o3 = { id: uid('o'), nome: 'Reforma Clínica Santa Rita', cliente: cli[2].id, endereco: 'Av. 3, 905 · Centro', inicio: e3[0].ini, fim: e3[4].fim, status: 'andamento', tipo: 'reforma', multaDia: 300, horario: 'seg a sáb, das 18h às 6h (a clínica atende de dia)', foto: F('painel-antes'), token: uid('k'), etapas: e3, bdi: 25, valor: 0, medicoes: [], aditivos: [], diario: [], docs: [] };
  o3.orc = [item(e3[0].id, 'mao', 'Demolição e caçamba', 'verba', 1, 4200), item(e3[1].id, 'material', 'Elétrica e lógica', 'verba', 1, 9800), item(e3[1].id, 'mao', 'Eletricista', 'dia', 18, 240),
    item(e3[2].id, 'material', 'Drywall e forro de gesso', 'm²', 180, 68), item(e3[2].id, 'mao', 'Montador', 'm²', 180, 28), item(e3[3].id, 'material', 'Porcelanato e rodapé', 'm²', 140, 82), item(e3[3].id, 'mao', 'Assentamento', 'm²', 140, 35),
    item(e3[4].id, 'material', 'Tinta lavável', 'verba', 1, 3900), item(e3[4].id, 'mao', 'Pintor', 'dia', 12, 200)];
  // obra 4: sobrado em orçamento
  const e4 = etapas(D(20), [['Fundação', 25, 0], ['Estrutura', 45, 0], ['Alvenaria', 40, 0], ['Cobertura', 20, 0], ['Acabamento', 45, 0]]);
  const o4 = { id: uid('o'), nome: 'Sobrado Rezende', cliente: cli[3].id, endereco: 'Rua 22, 77 · Jardim Europa', inicio: e4[0].ini, fim: e4[4].fim, status: 'orcamento', tipo: 'residencial', multaDia: 0, foto: '', token: uid('k'), etapas: e4, bdi: 22, valor: 0, medicoes: [], aditivos: [], diario: [], docs: [] };
  o4.orc = [item(e4[0].id, 'material', 'Concreto e aço', 'verba', 1, 24000), item(e4[0].id, 'mao', 'Equipe de fundação', 'dia', 30, 220), item(e4[1].id, 'material', 'Concreto e aço', 'verba', 1, 41000), item(e4[1].id, 'mao', 'Armação e forma', 'dia', 55, 215),
    item(e4[2].id, 'material', 'Blocos e argamassa', 'verba', 1, 16500), item(e4[2].id, 'mao', 'Pedreiro e servente', 'dia', 70, 180), item(e4[3].id, 'material', 'Telhado', 'm²', 160, 118), item(e4[4].id, 'material', 'Revestimentos e pintura', 'verba', 1, 38000), item(e4[4].id, 'mao', 'Acabamento', 'dia', 60, 210)];
  const custo = (o) => o.orc.reduce((s, i) => s + i.qtd * i.unit, 0);
  [o1, o2, o3, o4].forEach((o) => { o.valor = Math.round(custo(o) * (1 + o.bdi / 100) / 100) * 100; });
  // medições
  const med = (o, dia, pcts, status) => { const m = { id: uid('m'), dia, pcts, status, valor: 0 }; o.medicoes.push(m); return m; };
  const pctsDe = (o, f) => Object.fromEntries(o.etapas.map((x) => [x.id, f(x)]));
  const m1 = med(o1, D(-60), pctsDe(o1, (x) => Math.min(x.pct, x.nome === 'Estrutura' ? 40 : x.nome === 'Alvenaria' ? 10 : x.pct > 0 && x.nome !== 'Cobertura' && x.nome !== 'Instalações' ? x.pct : 0)), 'paga');
  const m2 = med(o1, D(-5), pctsDe(o1, (x) => x.pct), 'aprovada');
  const m3 = med(o2, D(-12), pctsDe(o2, (x) => Math.min(x.pct, x.nome === 'Fundação' ? 50 : x.nome === 'Terraplenagem' ? 100 : 0)), 'paga');
  const m4 = med(o3, D(-2), pctsDe(o3, (x) => x.pct), 'aberta');
  // valor de cada medição: preço de venda da etapa × (% desta medição − % da anterior)
  [o1, o2, o3].forEach((o) => { const venda = (et) => o.orc.filter((i) => i.etapa === et).reduce((s, i) => s + i.qtd * i.unit, 0) * (1 + o.bdi / 100); let ant = {}; o.medicoes.forEach((m) => { m.valor = Math.round(o.etapas.reduce((s, et) => s + venda(et.id) * Math.max(0, (m.pcts[et.id] || 0) - (ant[et.id] || 0)) / 100, 0)); ant = m.pcts; }); });
  // comprovantes de exemplo (desenhos leves: print de conversa, boletim assinado, e-mail)
  const svg = (fundo, corpo) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" font-family="Arial,sans-serif"><rect width="320" height="240" fill="${fundo}"/>${corpo}</svg>`);
  const zap = (nome, txt, hora) => svg('#ECE5DD', `<rect width="320" height="34" fill="#075E54"/><text x="14" y="22" fill="#fff" font-size="14" font-weight="bold">${nome}</text><rect x="14" y="56" width="250" height="70" rx="8" fill="#fff"/><text x="24" y="80" font-size="13" fill="#111">${txt[0]}</text><text x="24" y="98" font-size="13" fill="#111">${txt[1]}</text><text x="226" y="118" font-size="10" fill="#777">${hora}</text><rect x="120" y="146" width="186" height="40" rx="8" fill="#DCF8C6"/><text x="130" y="171" font-size="13" fill="#111">Obrigado! Já lançamos.</text>`);
  const papel = (tit, nome) => svg('#F4F1EA', `<rect x="24" y="14" width="272" height="212" fill="#fff" stroke="#ccc"/><text x="40" y="42" font-size="14" font-weight="bold" fill="#222">${tit}</text><g stroke="#bbb">${[62, 78, 94, 110, 126].map((y) => `<line x1="40" y1="${y}" x2="280" y2="${y}"/>`).join('')}</g><text x="40" y="160" font-size="12" fill="#222">Aprovado. Pode faturar.</text><path d="M60 196c14-22 22 10 34-6s18-14 26 2 20-8 30 0" fill="none" stroke="#1a3a8a" stroke-width="2"/><line x1="40" y1="204" x2="200" y2="204" stroke="#555"/><text x="40" y="218" font-size="11" fill="#555">${nome}</text>`);
  const mail = (de, txt) => svg('#fff', `<rect width="320" height="40" fill="#F1F3F4"/><text x="14" y="25" font-size="13" fill="#222">De: ${de}</text><text x="14" y="66" font-size="14" font-weight="bold" fill="#222">Re: Medição da obra</text><text x="14" y="98" font-size="13" fill="#222">${txt[0]}</text><text x="14" y="118" font-size="13" fill="#222">${txt[1]}</text><text x="14" y="150" font-size="13" fill="#222">Att.,</text><text x="14" y="170" font-size="13" fill="#222">${de}</text>`);
  m1.aprov = { por: 'Ricardo Martins', como: 'WhatsApp', em: D(-58), hora: '18:42', prova: zap('Ricardo Martins', ['Conferi a medição 1, está', 'aprovada. Pode mandar a cobrança.'], '18:42') };
  m2.aprov = { por: 'Marina Martins', como: 'Papel assinado', em: D(-4), hora: '10:15', prova: papel('Boletim de medição 2', 'Marina Martins') };
  m3.aprov = { por: 'Eduardo Lopes (Agro Orlândia)', como: 'E-mail', em: D(-10), hora: '09:03', prova: mail('Eduardo Lopes', ['Medição 1 conferida pela nossa', 'engenharia. Aprovada.']) };
  // aditivos
  o1.aditivos.push({ id: uid('a'), dia: D(-18), desc: 'Churrasqueira e área gourmet nos fundos', valor: 18600, prazo: 15, status: 'aprovado', aprovadoEm: D(-15), aprovadoPor: 'Ricardo Martins', aprov: { por: 'Ricardo Martins', como: 'WhatsApp', em: D(-15) } });
  o1.aditivos.push({ id: uid('a'), dia: D(-1), desc: 'Troca do piso dos quartos por porcelanato amadeirado', valor: 6200, prazo: 0, status: 'enviado' });
  o3.aditivos.push({ id: uid('a'), dia: D(-8), desc: 'Pontos extras de tomada nos consultórios', valor: 2350, prazo: 3, status: 'aprovado', aprovadoEm: D(-6), aprovadoPor: 'Dra. Helena Couto', aprov: { por: 'Dra. Helena Couto', como: 'E-mail', em: D(-6) } });
  // diário
  const di = (o, dia, clima, pessoas, texto, fotos) => o.diario.push({ id: uid('d'), dia, clima, pessoas, texto, fotos });
  di(o1, D(0), 'sol', 6, 'Alvenaria do pavimento superior: paredes dos quartos 2 e 3 levantadas até a meia altura.', [F('muro-antes')]);
  di(o1, D(-2), 'sol', 7, 'Concretagem das vigas do 1º piso, 6 m³. Desforma da laje prevista para a semana que vem.', [F('piso-antes'), F('quadro-antes')]);
  di(o1, D(-5), 'chuva', 3, 'Chuva forte à tarde: equipe reduzida, só organização do canteiro e corte de ferro.', []);
  di(o1, D(-9), 'sol', 7, 'Armação das vigas do 1º piso e fôrmas conferidas pelo engenheiro.', [F('muro-depois')]);
  di(o2, D(-1), 'sol', 8, 'Blocos de fundação do eixo C concretados. Chegou a primeira carga da estrutura metálica.', [F('fachada-antes')]);
  di(o2, D(-6), 'nublado', 6, 'Escavação dos blocos do eixo D e conferência do gabarito.', []);
  di(o3, D(-1), 'sol', 4, 'Porcelanato da recepção assentado; pintura começou pelos consultórios.', [F('cozinha-antes'), F('painel-antes')]);
  // documentos
  o1.docs.push({ id: uid('doc'), nome: 'Contrato de empreitada (gerado pelo Tecton)', tipo: 'contrato', dia: o1.inicio });
  o1.docs.push({ id: uid('doc'), nome: 'ART do engenheiro responsável', tipo: 'nota', dia: o1.inicio, texto: 'ART nº 2620251234567 · Eng. Civil Carlos Alberto Nunes · CREA-SP 5061234567' });
  o1.docs.push({ id: uid('doc'), nome: 'Alvará de construção', tipo: 'nota', dia: somaDias(o1.inicio, -10), texto: 'Alvará 482/2026 · Prefeitura de Orlândia · válido por 24 meses' });
  e.obras = [o1, o2, o3, o4];
  // apontamento das equipes nos últimos dias úteis
  const r = sorteio(7);
  for (let k = 13; k >= 0; k--) {
    const d = D(-k), sem = new Date(d + 'T12:00:00Z').getUTCDay(); if (sem === 0) continue; // domingo não tem obra
    e.trab.forEach((tb, i) => { if (r() < 0.12) return; const obra = i < 4 ? o1 : i < 7 ? o2 : o3; e.apont.push({ id: uid('ap'), dia: d, obra: obra.id, trab: tb.id, dias: sem === 6 ? 0.5 : 1 }); });
  }
  // pedidos de compra
  e.pedidos = [
    { id: uid('pc'), obra: o1.id, forn: forn[0].id, dia: D(-3), prev: D(1), status: 'pedido', itens: [{ desc: 'Bloco cerâmico 14x19x39', un: 'pç', qtd: 1500, unit: 1.65, chegou: 0 }, { desc: 'Argamassa de assentamento', un: 'sc', qtd: 40, unit: 24, chegou: 0 }] },
    { id: uid('pc'), obra: o1.id, forn: forn[2].id, dia: D(-10), prev: D(-6), status: 'chegou', itens: [{ desc: 'Aço CA-50 10 mm', un: 'kg', qtd: 800, unit: 8.9, chegou: 800, perda: 15 }] },
    { id: uid('pc'), obra: o2.id, forn: forn[1].id, dia: D(-2), prev: D(2), status: 'parcial', itens: [{ desc: 'Concreto usinado fck 30', un: 'm³', qtd: 24, unit: 560, chegou: 12 }, { desc: 'Bomba lança', un: 'h', qtd: 4, unit: 380, chegou: 0 }] },
    { id: uid('pc'), obra: o3.id, forn: forn[3].id, dia: D(-12), prev: D(-9), status: 'chegou', itens: [{ desc: 'Cabos, tomadas e disjuntores', un: 'verba', qtd: 1, unit: 6400, chegou: 1 }] },
  ];
  // financeiro
  const fin = (tipo, desc, valor, venc, pago, extra = {}) => e.fin.push({ id: uid('f'), tipo, desc, valor, venc, pago: pago || '', forma: pago ? 'Pix' : '', pessoa: '', cat: '', obra: '', ...extra });
  fin('receber', `Medição 1 · ${o1.nome}`, m1.valor, D(-55), D(-54), { pessoa: cli[0].id, obra: o1.id, cat: 'Medição', medicao: m1.id });
  fin('receber', `Medição 2 · ${o1.nome}`, m2.valor, D(5), '', { pessoa: cli[0].id, obra: o1.id, cat: 'Medição', medicao: m2.id });
  fin('receber', `Aditivo · churrasqueira · ${o1.nome}`, 18600, D(10), '', { pessoa: cli[0].id, obra: o1.id, cat: 'Aditivo' });
  fin('receber', `Medição 1 · ${o2.nome}`, m3.valor, D(-8), D(-7), { pessoa: cli[1].id, obra: o2.id, cat: 'Medição', medicao: m3.id });
  fin('receber', `Sinal · ${o3.nome}`, Math.round(o3.valor * 0.3), D(-38), D(-38), { pessoa: cli[2].id, obra: o3.id, cat: 'Sinal' });
  fin('pagar', 'Bloco e argamassa · Residência Martins', 1500 * 1.65 + 40 * 24, D(25), '', { pessoa: forn[0].id, obra: o1.id, cat: 'Material', pedido: e.pedidos[0].id });
  fin('pagar', 'Aço CA-50 · Residência Martins', 7120, D(-4), D(-4), { pessoa: forn[2].id, obra: o1.id, cat: 'Material', pedido: e.pedidos[1].id });
  fin('pagar', 'Concreto · Galpão Agro', 24 * 560 + 4 * 380, D(12), '', { pessoa: forn[1].id, obra: o2.id, cat: 'Material', pedido: e.pedidos[2].id });
  fin('pagar', 'Aluguel de escoras · Residência Martins', 900, D(3), '', { pessoa: forn[4].id, obra: o1.id, cat: 'Equipamento' });
  fin('pagar', 'Diárias da semana passada', 9820, D(-6), D(-6), { cat: 'Mão de obra' });
  fin('pagar', 'Contador', 650, D(8), '', { cat: 'Escritório' });
  fin('pagar', 'Aluguel do escritório', 1800, D(-10), D(-10), { cat: 'Escritório' });
  fin('pagar', 'Combustível da caminhonete', 780, D(-1), D(-1), { cat: 'Veículos' });
  fin('pagar', 'Seguro de obra · Galpão Agro', 2350, D(-3), '', { obra: o2.id, cat: 'Seguro' });
  // o que já foi gasto em cada obra, coerente com o quanto cada etapa andou (custo orçado da etapa × % feito, com a variação de obra real)
  const r2 = sorteio(19), forns = [forn[0], forn[1], forn[2], forn[3]];
  [o1, o2, o3].forEach((o) => o.etapas.forEach((et) => { if (!et.pct) return; o.orc.filter((i) => i.etapa === et.id).forEach((i) => {
    const v = Math.round(i.qtd * i.unit * et.pct / 100 * (0.84 + r2() * 0.08) * 100) / 100, ate = Math.min(dias(et.ini, H()) - 1, dias(et.ini, et.fim)), dia = somaDias(et.ini, Math.max(0, Math.floor(r2() * Math.max(1, ate)))), pago = dia < D(-5);
    const mao = i.tipo === 'mao', eqp = i.tipo === 'equip';
    e.fin.push({ id: uid('f'), tipo: 'pagar', desc: `${mao ? 'Mão de obra' : i.desc} · ${et.nome} · ${o.nome}`, valor: v, venc: pago ? dia : somaDias(dia, 20), pago: pago ? dia : '', forma: pago ? 'Pix' : '', pessoa: mao || eqp ? '' : forns[Math.floor(r2() * forns.length)].id, cat: mao ? 'Mão de obra' : eqp ? 'Equipamento' : 'Material', obra: o.id });
  }); }));
  e.apont.forEach((a) => { if (a.dia < D(-6)) a.fechado = true; });
  e.vales = [{ id: uid('vl'), trab: e.trab[1].id, dia: D(-2), valor: 200, obs: 'Adiantamento de quarta', obra: o1.id }, { id: uid('vl'), trab: e.trab[4].id, dia: D(-1), valor: 150, obs: 'Remédio do filho', obra: o2.id }];
  // empreiteiros
  e.empreitas = [{ id: uid('ep'), obra: o1.id, nome: 'Valdemar Rodrigues', servico: 'Reboco interno e externo, 620 m²', valor: 18600, ret: 5, pct: 40, ini: D(-24), fim: D(21), multa: 150, movs: [{ dia: D(-20), tipo: 'adiant', valor: 2000 }, { dia: D(-6), tipo: 'medicao', valor: 5068, bruto: 7440, ret: 372, abat: 2000, pct: 40 }] },
    { id: uid('ep'), obra: o2.id, nome: 'Metalúrgica Santos', servico: 'Montagem da cobertura metálica', valor: 28000, ret: 5, pct: 0, ini: D(-3), fim: D(27), movs: [{ dia: D(-3), tipo: 'adiant', valor: 5000 }] }];
  e.fin.push({ id: uid('f'), tipo: 'pagar', desc: `Adiantamento · Valdemar Rodrigues · ${o1.nome}`, valor: 2000, venc: D(-20), pago: D(-20), forma: 'Pix', pessoa: '', cat: 'Empreitada', obra: o1.id },
    { id: uid('f'), tipo: 'pagar', desc: `Medição 40% · Valdemar Rodrigues · ${o1.nome}`, valor: 5068, venc: D(-6), pago: D(-5), forma: 'Pix', pessoa: '', cat: 'Empreitada', obra: o1.id },
    { id: uid('f'), tipo: 'pagar', desc: `Adiantamento · Metalúrgica Santos · ${o2.nome}`, valor: 5000, venc: D(-3), pago: D(-3), forma: 'Pix', pessoa: '', cat: 'Empreitada', obra: o2.id });
  e.equipe = [{ id: uid('u'), email: 'sebastiao.mestre@exemplo.com', nome: 'Sebastião', cargo: 'Mestre de obras', telas: ['#painel', '#obras', '#diario', '#equipes'], soVer: false, aceito: true }];
  return e;
}

// ================================================================== loja de material
function loja() {
  const e = vazia(), c = e.config;
  Object.assign(c, { pinDono: '1234', nome: 'Depósito São Bento', cidade: 'Orlândia', uf: 'SP', ramos: ['loja'], ramo: 'loja', cnpj: '23.456.789/0001-10', fone: '(16) 3826-1515', endereco: 'Av. 9, 1200 · Vila São Bento', saldoInicial: 31500,
    tabelas: [{ id: 'balcao', nome: 'Balcão', desc: 0 }, { id: 'prof', nome: 'Profissional', desc: 6 }, { id: 'constr', nome: 'Construtora', desc: 9 }] });
  const ean = (n) => { const b = '789' + String(1234500000 + n * 7919).slice(0, 9); const s = [...b].reduce((a, d, i) => a + Number(d) * (i % 2 ? 3 : 1), 0); return b + ((10 - (s % 10)) % 10); };
  const P = [
    ['Cimento CP-II 50 kg', 'sc', 38.9, 31.2, 420, 80, [[50, 3], [100, 5]]], ['Cimento CP-V ARI 40 kg', 'sc', 41.5, 33.9, 160, 40], ['Cal hidratada CH-III 20 kg', 'sc', 18.9, 13.4, 210, 50, [[50, 4]]],
    ['Argamassa AC-I 20 kg', 'sc', 16.9, 11.2, 260, 60, [[40, 5]]], ['Argamassa AC-III 20 kg', 'sc', 42.9, 30.5, 64, 20], ['Areia média lavada', 'm³', 145, 98, 38, 10], ['Areia fina', 'm³', 150, 102, 14, 8],
    ['Pedra brita 1', 'm³', 160, 112, 22, 8], ['Bloco de concreto 14x19x39', 'pç', 3.6, 2.4, 5200, 1500, [[1000, 4]]], ['Bloco cerâmico 9 furos', 'pç', 1.25, 0.78, 9800, 3000, [[2000, 5]]],
    ['Vergalhão CA-50 3/8 (12 m)', 'br', 68.5, 51, 180, 40, [[50, 3]]], ['Vergalhão CA-50 5/16 (12 m)', 'br', 49.9, 37, 140, 40], ['Arame recozido 18', 'kg', 18.5, 12.9, 85, 20],
    ['Tubo PVC esgoto 100 mm (6 m)', 'br', 89.9, 62, 46, 12], ['Tubo PVC soldável 25 mm (6 m)', 'br', 27.9, 18.4, 96, 24], ['Joelho PVC soldável 25 mm', 'pç', 2.4, 1.1, 340, 80],
    ['Fio flexível 2,5 mm', 'm', 3.15, 2.05, 1240, 300, null, 'rolo', 100], ['Fio flexível 4 mm', 'm', 4.9, 3.25, 380, 200, null, 'rolo', 100], ['Disjuntor DIN 20 A', 'pç', 19.9, 11.5, 64, 20],
    ['Caixa d\'água 1.000 L', 'pç', 489, 368, 9, 3], ['Telha fibrocimento 2,44 x 1,10', 'pç', 64.9, 47, 120, 30], ['Piso cerâmico 60x60 PEI 4', 'm²', 39.9, 26.5, 310, 80],
    ['Porcelanato 60x60 acetinado', 'm²', 69.9, 47.8, 180, 60], ['Rejunte flexível 1 kg', 'kg', 11.9, 6.8, 92, 30], ['Tinta acrílica fosca 18 L', 'lata', 289, 205, 26, 8],
    ['Massa corrida 25 kg', 'bd', 79.9, 54, 40, 10], ['Prego 18x27 com cabeça', 'kg', 21.9, 15.2, 48, 15], ['Manta asfáltica 3 mm (10 m)', 'rolo', 189, 139, 12, 4],
    ['Impermeabilizante 18 L', 'bd', 249, 178, 3, 6], ['Lona plástica preta 4x100 m', 'rolo', 329, 238, 4, 2], ['Carrinho de mão reforçado', 'pç', 289, 196, 6, 2], ['Escora metálica 3 m', 'pç', 119, 82, 18, 0],
  ];
  e.produtos = P.map(([nome, un, preco, custo, estoque, minimo, faixas, compra, fator], i) => ({ id: uid('pr'), cod: ean(i + 1), nome, un, preco, custo, estoque, minimo, faixas: (faixas || []).map(([min, desc]) => ({ min, desc })), compra: compra || '', fator: fator || 1, ult: '' }));
  const pr = (n) => e.produtos.find((p) => p.nome.startsWith(n));
  Object.assign(pr('Piso cerâmico'), { porCaixa: 2.5, lote: 'C1108 · tom A' }); Object.assign(pr('Porcelanato'), { porCaixa: 2.16, lote: 'P2309 · tom B' });
  // última venda dos produtos que não giram nesta demonstração (alguns parados de verdade)
  ['Cimento CP-V', 'Areia fina', 'Argamassa AC-III', 'Vergalhão CA-50 5/16', 'Tubo PVC esgoto', 'Fio flexível 4', 'Disjuntor', 'Caixa d', 'Telha', 'Porcelanato', 'Tinta', 'Massa corrida', 'Manta', 'Impermeabilizante', 'Lona', 'Carrinho'].forEach((n, k) => { pr(n).ult = D(-[12, 20, 35, 41, 18, 52, 9, 66, 27, 15, 22, 88, 143, 5, 47, 61][k]); });
  e.config.caixas = ['Caixa 1', 'Caixa 2']; e.config.prazoFiado = 30;
  const cli = [pes('cliente', 'Construtora Alicerce', '(16) 99812-4410', { tabela: 'constr', limite: 0 }), pes('cliente', 'José Carlos (pedreiro)', '(16) 99455-1871', { tabela: 'prof', limite: 1500 }), pes('cliente', 'Marcos Eletricista', '(16) 99623-0098', { tabela: 'prof', limite: 1200 }),
    pes('cliente', 'João Encanador', '(16) 99188-2207', { tabela: 'prof', limite: 800 }), pes('cliente', 'Eng. Paulo Souza', '(16) 99334-6612', { tabela: 'constr' }), pes('cliente', 'Família Ramos', '(16) 99201-5544'), pes('cliente', 'Dona Cida Pereira', '(16) 99712-0081'), pes('cliente', 'Sítio Boa Esperança', '(16) 99600-7171')];
  const forn = [pes('fornecedor', 'Votoran Distribuição', '(11) 4004-1234'), pes('fornecedor', 'Areial Rio Pardo', '(16) 99781-2020'), pes('fornecedor', 'Gerdau Revenda', '(11) 3094-6600'), pes('fornecedor', 'Tigre Distribuidor', '(16) 3610-4400'), pes('fornecedor', 'Cerâmica Bela Vista', '(16) 3826-9090')];
  e.pessoas = [...cli, ...forn];
  e.caminhoes = [{ id: uid('cm'), nome: 'Mercedes 1113 (toco)', placa: 'DSB-4A21', motorista: 'Valdir', km: 412380, revKm: 412700, docVence: D(48), seguroVence: D(120) }, { id: uid('cm'), nome: 'Caminhonete Strada', placa: 'FJK-2B07', motorista: 'Igor', km: 88410, revKm: 95000, docVence: D(19), seguroVence: D(200) }];
  // frota: abastecimentos e uma manutenção do mês
  [[0, -12, 180, 1080, 411650], [0, -5, 160, 960, 412020], [0, -1, 120, 726, 412380], [1, -9, 45, 279, 87900], [1, -2, 40, 248, 88410]].forEach(([k, d, l, v, km]) => { const c = e.caminhoes[k]; (c.gastos ||= []).unshift({ id: uid('fg'), dia: D(d), tipo: 'combustivel', desc: `${k ? 'Gasolina' : 'Diesel'} · ${l} L`, valor: v, litros: l, km }); });
  e.caminhoes[0].gastos.unshift({ id: uid('fg'), dia: D(-3), tipo: 'manutencao', desc: 'Troca de óleo e filtros', valor: 640, litros: 0, km: 412100 }); e.caminhoes[0].gastos.sort((a, b) => b.dia.localeCompare(a.dia));
  e.contasObra = [
    { id: uid('co'), cliente: cli[0].id, obra: 'Residência Martins', limite: 15000, aberta: true, autorizados: ['Sebastião (mestre de obras)', 'Ricardo Martins'], pagamentos: [{ dia: D(-15), valor: 4200, forma: 'Pix' }] },
    { id: uid('co'), cliente: cli[4].id, obra: 'Casa Jardim Europa', limite: 10000, prazo: 7, aberta: true, autorizados: ['Eng. Paulo Souza', 'Zé Pedreiro'], pagamentos: [] },
    { id: uid('co'), cliente: cli[5].id, obra: 'Reforma da cozinha', limite: 4000, aberta: true, autorizados: ['Família Ramos'], pagamentos: [{ dia: D(-4), valor: 1000, forma: 'Dinheiro' }] },
  ];
  // vendas dos últimos 30 dias
  const r = sorteio(11), giram = ['Cimento CP-II', 'Areia média', 'Pedra brita', 'Bloco de concreto', 'Bloco cerâmico', 'Argamassa AC-I', 'Cal hidratada', 'Vergalhão CA-50 3/8', 'Fio flexível 2,5', 'Tubo PVC soldável', 'Joelho PVC', 'Piso cerâmico', 'Rejunte', 'Arame', 'Prego'];
  const qtdDe = (p) => ({ sc: 2 + Math.floor(r() * 20), 'm³': 1 + Math.floor(r() * 3), pç: p.preco < 5 ? 100 * (1 + Math.floor(r() * 10)) : 1 + Math.floor(r() * 8), br: 2 + Math.floor(r() * 12), m: 10 * (2 + Math.floor(r() * 8)), 'm²': 10 + Math.floor(r() * 40), kg: 1 + Math.floor(r() * 5) }[p.un] || 1);
  for (let k = 29; k >= 0; k--) {
    const d = D(-k); if (k && new Date(d + 'T12:00:00Z').getUTCDay() === 0) continue; // domingo fecha (menos hoje: o exemplo sempre tem vendas do dia)
    const n = k === 0 ? 3 : 2 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) {
      const itens = []; const q = 1 + Math.floor(r() * 3);
      for (let x = 0; x < q; x++) { const p = pr(giram[Math.floor(r() * giram.length)]); if (itens.some((i) => i.prod === p.id)) continue; itens.push({ prod: p.id, nome: p.nome, un: p.un, qtd: qtdDe(p), unit: p.preco, desc: 0 }); p.ult = d; }
      const total = Math.round(itens.reduce((s, i) => s + i.qtd * i.unit, 0) * 100) / 100;
      const fr = r(), forma = fr < 0.35 ? 'Pix' : fr < 0.6 ? 'Cartão de débito' : fr < 0.78 ? 'Cartão de crédito' : fr < 0.9 ? 'Dinheiro' : 'Conta da obra';
      const v = { id: uid('v'), dia: d, itens, total, forma, cliente: '', tabela: 'balcao', caixa: r() < 0.6 ? 'Caixa 1' : 'Caixa 2' };
      if (forma === 'Conta da obra') { const co = e.contasObra[Math.floor(r() * 3)]; v.conta = co.id; v.cliente = co.cliente; }
      e.vendas.push(v);
    }
  }
  // fiado dos profissionais
  e.fiado = [{ id: uid('fi'), pessoa: cli[1].id, dia: D(-44), valor: 640, desc: 'Argamassa e rejunte' }, { id: uid('fi'), pessoa: cli[1].id, dia: D(-9), valor: -400, desc: 'Pagamento em dinheiro' }, { id: uid('fi'), pessoa: cli[1].id, dia: D(-3), valor: 512.5, desc: 'Cimento e cal' },
    { id: uid('fi'), pessoa: cli[2].id, dia: D(-26), valor: 1090, desc: 'Fio 2,5 e disjuntores' }, { id: uid('fi'), pessoa: cli[3].id, dia: D(-6), valor: 287.4, desc: 'Tubos e conexões' }];
  // pagamentos das contas da obra coerentes com o que compraram (paga uma parte, sobra o saldo)
  e.contasObra.forEach((c, k) => { const tot = e.vendas.filter((v) => v.conta === c.id).reduce((s, v) => s + v.total, 0); c.pagamentos = tot > 0 ? [{ dia: D(-[12, 8, 4][k]), valor: Math.round(tot * [0.45, 0.3, 0.6][k] / 10) * 10, forma: ['Pix', 'Transferência', 'Dinheiro'][k] }] : []; });
  e.caixasDia = [{ id: uid('cx'), caixa: 'Caixa 1', dia: D(0), abertura: 200, abertoAs: '07:30', quem: '', movs: [{ tipo: 'suprimento', valor: 50, motivo: 'Troco em notas de 5', hora: '08:10' }], fechado: null },
    { id: uid('cx'), caixa: 'Caixa 2', dia: D(0), abertura: 150, abertoAs: '07:45', quem: '', movs: [{ tipo: 'suprimento', valor: 100, motivo: 'Troco em moedas', hora: '09:10' }], fechado: null }];
  e.espera = [{ id: uid('es'), nome: 'Toninho (foi buscar o cartão)', dia: D(0), caixa: 'Caixa 2', total: 0, cart: { itens: [{ prod: pr('Cimento CP-II').id, nome: pr('Cimento CP-II').nome, un: 'sc', qtd: 8, unit: pr('Cimento CP-II').preco, desc: 0 }, { prod: pr('Areia média').id, nome: pr('Areia média').nome, un: 'm³', qtd: 1, unit: pr('Areia média').preco, desc: 0 }], cliente: '', tabela: 'balcao', orc: '', frete: 0 } }];
  e.espera[0].total = Math.round(e.espera[0].cart.itens.reduce((s, i) => s + i.qtd * i.unit, 0) * 100) / 100;
  // orçamentos
  const orc = (cliente, nome, fone, dia, status, lista) => { const itens = lista.map(([n, q]) => { const p = pr(n); return { prod: p.id, nome: p.nome, un: p.un, qtd: q, unit: p.preco, desc: 0 }; }); e.orcs.push({ id: uid('oc'), dia, cliente, nome, fone, itens, total: Math.round(itens.reduce((s, i) => s + i.qtd * i.unit, 0) * 100) / 100, validade: somaDias(dia, 7), status }); };
  orc(cli[4].id, 'Eng. Paulo Souza', '(16) 99334-6612', D(-1), 'enviado', [['Cimento CP-II', 60], ['Areia média', 6], ['Pedra brita', 4], ['Vergalhão CA-50 3/8', 40]]);
  orc('', 'Cláudio (balcão)', '(16) 99812-3344', D(0), 'enviado', [['Piso cerâmico', 42], ['Argamassa AC-I', 14], ['Rejunte', 6]]);
  orc(cli[6].id, 'Dona Cida Pereira', '(16) 99712-0081', D(-4), 'aceito', [['Tinta acrílica', 3], ['Massa corrida', 2]]);
  orc('', 'Rafael (muro)', '(16) 99001-4521', D(-9), 'perdido', [['Bloco de concreto', 600], ['Cimento CP-II', 15]]);
  // entregas
  const vendaEntrega = (k, cliente) => { const v = e.vendas.filter((x) => x.dia === D(k))[0] || e.vendas[e.vendas.length - 1]; if (cliente) v.cliente = cliente; return v.id; };
  const ent = (k, cliente, end, bairro, cm, ordem, status, itens) => e.entregas.push({ itens: itens.map(([n, un, q]) => ({ nome: n, un, qtd: q, ok: status === 'entregue' ? q : 0 })), recebeu: status === 'entregue' ? 'Recebido na obra' : '', id: uid('en'), venda: vendaEntrega(Math.min(0, k), cliente), dia: D(k), cliente, endereco: end, bairro, caminhao: cm, ordem, status, obs: '' });
  ent(0, cli[0].id, 'Rua das Acácias, 120', 'Jardim Boa Vista', e.caminhoes[0].id, 1, 'saiu', [['Bloco cerâmico 9 furos', 'pç', 1500], ['Argamassa AC-I 20 kg', 'sc', 40], ['Cimento CP-II 50 kg', 'sc', 25]]);
  ent(0, cli[5].id, 'Rua 14, 233', 'Centro', e.caminhoes[0].id, 2, 'entregue', [['Piso cerâmico 60x60 PEI 4', 'm²', 30], ['Argamassa AC-I 20 kg', 'sc', 8], ['Rejunte flexível 1 kg', 'kg', 5]]);
  Object.assign(e.entregas[e.entregas.length - 1], { recebeu: 'Sr. Antônio Ramos', saiuAs: '07:40' });
  ent(0, cli[7].id, 'Estrada Municipal ORL-10, km 4', 'Zona rural', e.caminhoes[1].id, 1, 'agendada', [['Caixa d\'água 1.000 L', 'pç', 1], ['Tubo PVC soldável 25 mm (6 m)', 'br', 10], ['Joelho PVC soldável 25 mm', 'pç', 20]]);
  ent(1, cli[4].id, 'Rua 22, 77', 'Jardim Europa', e.caminhoes[0].id, 1, 'agendada', [['Areia média lavada', 'm³', 6], ['Pedra brita 1', 'm³', 4], ['Cimento CP-II 50 kg', 'sc', 60]]);
  ent(-1, cli[6].id, 'Av. 5, 1440', 'Vila Rodrigues', e.caminhoes[1].id, 2, 'entregue', [['Tinta acrílica fosca 18 L', 'lata', 3], ['Massa corrida 25 kg', 'bd', 2]]);
  ent(-2, cli[1].id, 'Rua 3, 58', 'Jardim Paulista', e.caminhoes[0].id, 1, 'entregue', [['Vergalhão CA-50 3/8 (12 m)', 'br', 20], ['Arame recozido 18', 'kg', 3]]);
  e.entregas.filter((x) => x.status === 'entregue' && x.recebeu === 'Recebido na obra').forEach((x, k) => { x.recebeu = ['Dona Cida', 'José Carlos'][k % 2]; });
  e.entregas.push({ id: uid('en'), modo: 'entrega', venda: '', dia: D(0), cliente: cli[4].id, endereco: 'Rua 9, 410', bairro: 'Jardim Itamaraty', caminhao: e.caminhoes[1].id, ordem: 0, status: 'parcial', recebeu: 'Sebastião (mestre)', ocorr: 'quebraram 40 blocos no caminhão', perda: true, saiuAs: '07:15', obs: '', itens: [{ nome: 'Bloco de concreto 14x19x39', un: 'pç', qtd: 500, ok: 460 }, { nome: 'Cimento CP-II 50 kg', un: 'sc', qtd: 20, ok: 20 }] });
  e.entregas.push({ id: uid('en'), modo: 'retira', venda: '', dia: D(-1), cliente: cli[2].id, endereco: 'Retira no depósito', bairro: '', caminhao: '', ordem: 0, status: 'agendada', obs: '', itens: [{ nome: 'Fio flexível 2,5 mm', un: 'm', qtd: 100, ok: 0 }, { nome: 'Disjuntor 20 A', un: 'pç', qtd: 6, ok: 0 }] });
  e.entregas.push({ id: uid('en'), modo: 'retira', venda: '', dia: D(0), cliente: cli[6].id, endereco: 'Retira no depósito', bairro: '', caminhao: '', ordem: 0, status: 'agendada', obs: '', itens: [{ nome: 'Argamassa AC-III 20 kg', un: 'sc', qtd: 10, ok: 0 }, { nome: 'Rejunte flexível 1 kg', un: 'kg', qtd: 4, ok: 0 }] });
  e.entregas.push({ id: uid('en'), modo: 'retira', venda: '', dia: D(0), cliente: cli[3].id, endereco: 'Retira no depósito', bairro: '', caminhao: '', ordem: 0, status: 'entregue', recebeu: 'João Encanador', obs: '', itens: [{ nome: 'Tubo PVC soldável 25 mm (6 m)', un: 'br', qtd: 4, ok: 4 }] });
  // compras dos fornecedores
  const cp = (forn, dia, status, lista) => e.compras.push({ id: uid('cp'), forn, dia, status, itens: lista.map(([n, q]) => { const p = pr(n); return { prod: p.id, nome: p.nome, qtd: q, custo: p.custo, un: p.compra || p.un }; }) });
  cp(forn[0].id, D(-1), 'pedido', [['Cimento CP-II', 300], ['Cimento CP-V', 80]]);
  cp(forn[3].id, D(-8), 'recebido', [['Tubo PVC soldável', 60], ['Joelho PVC', 200]]);
  // financeiro
  const fin = (tipo, desc, valor, venc, pago, extra = {}) => e.fin.push({ id: uid('f'), tipo, desc, valor, venc, pago: pago || '', forma: pago ? 'Boleto' : '', pessoa: '', cat: '', ...extra });
  e.caminhoes.forEach((cm) => (cm.gastos || []).forEach((g) => fin('pagar', `${g.desc} · ${cm.nome} (${cm.placa})`, g.valor, g.dia, g.dia, { cat: g.tipo === 'combustivel' ? 'Frota · combustível' : 'Frota · manutenção' })));
  fin('pagar', 'Votoran · cimento (pedido)', 300 * 31.2 + 80 * 33.9, D(27), '', { pessoa: forn[0].id, cat: 'Mercadoria' });
  fin('pagar', 'Tigre · tubos e conexões', 60 * 18.4 + 200 * 1.1, D(-1), D(-1), { pessoa: forn[3].id, cat: 'Mercadoria' });
  fin('pagar', 'Areial Rio Pardo · 3 carretas', 5880, D(4), '', { pessoa: forn[1].id, cat: 'Mercadoria' });
  fin('pagar', 'Gerdau · vergalhões', 9180, D(-12), D(-12), { pessoa: forn[2].id, cat: 'Mercadoria' });
  fin('pagar', 'Energia elétrica', 690, D(6), '', { cat: 'Despesas fixas' });
  fin('pagar', 'Diesel do caminhão', 1240, D(-3), D(-3), { cat: 'Entregas' });
  fin('pagar', 'Salários', 14800, D(-15), D(-15), { cat: 'Pessoal' });
  fin('pagar', 'Contador', 750, D(9), '', { cat: 'Despesas fixas' });
  fin('receber', 'Cartão de crédito · repasse da maquininha', 6120, D(2), '', { cat: 'Cartão' });
  e.equipe = [{ id: uid('u'), email: 'marcos.caixa@exemplo.com', nome: 'Marcos', cargo: 'Caixa', telas: ['#painel', '#balcao', '#orcamentos', '#entregas'], soVer: false, aceito: true }];
  return e;
}

// ================================================================== imobiliária e incorporadora
function imobiliaria() {
  const e = vazia(), c = e.config;
  Object.assign(c, { nome: 'Vale Imóveis', cidade: 'Orlândia', uf: 'SP', ramos: ['imobiliaria'], ramo: 'imobiliaria', cnpj: '34.567.890/0001-21', creci: 'CRECI-J 29.871', fone: '(16) 99777-3000', endereco: 'Av. do Café, 455 · Centro', saldoInicial: 86000, indices: { INCC: 0.42, 'IGP-M': 0.31, IPCA: 0.38 } });
  e.corretores = [{ id: uid('cr'), nome: 'Ana Paula Moreira', creci: '123.456-F', fone: '(16) 99702-1111', pct: 5, pctCapt: 1 }, { id: uid('cr'), nome: 'Rafael Tavares', creci: '134.890-F', fone: '(16) 99702-2222', pct: 5, pctCapt: 1 }, { id: uid('cr'), nome: 'Beatriz Lemos', creci: '141.002-F', fone: '(16) 99702-3333', pct: 4, pctCapt: 1.5 }];
  const [ana, rafa, bia] = e.corretores;
  const pp = [pes('cliente', 'Fernanda Oliveira', '(16) 99821-4040'), pes('cliente', 'Gustavo e Lívia Prado', '(16) 99210-5050'), pes('cliente', 'Carlos Henrique Dias', '(16) 99355-6060'), pes('cliente', 'Juliana Matos', '(16) 99466-7070'),
    pes('cliente', 'Roberto Silveira', '(16) 99577-8080'), pes('cliente', 'Helena Campos', '(16) 99688-9090'), pes('cliente', 'Thiago Rocha', '(16) 99799-0101'), pes('cliente', 'Patrícia Nunes', '(16) 99800-1212'),
    pes('cliente', 'Marcelo Andrade', '(16) 99911-2323'), pes('cliente', 'Sandra Vieira', '(16) 99022-3434')];
  const forn = [pes('fornecedor', 'Alicerce Construções', '(16) 99812-4410', { doc: '12.345.678/0001-90' }), pes('fornecedor', 'Gráfica Orlândia', '(16) 3826-2020')];
  e.pessoas = [...pp, ...forn];
  // lançamentos
  const tabela = { entrada: 10, mensais: 36, mensaisPct: 20, inter: 3, interPct: 15, indice: 'INCC' };
  const emp = (nome, endereco, blocos, andares, porAndar, area, base, porAndarPct, status, entrega, extra = {}) => {
    const x = { id: uid('em'), nome, endereco, blocos, andares, porAndar, area, status, entrega, tabela: { ...tabela }, foto: extra.foto || '', obra: extra.obra || null };
    e.emps.push(x);
    blocos.forEach((b) => { for (let a = 1; a <= andares; a++) for (let u = 1; u <= porAndar; u++) e.imoveis.push({ id: uid('im'), emp: x.id, bloco: b, andar: a, num: `${a}0${u}`, titulo: `${nome} · ${b} ${a}0${u}`, tipo: 'Apartamento', fin: 'venda', area: area + (u === 1 || u === porAndar ? 4 : 0), quartos: u === 1 || u === porAndar ? 3 : 2, preco: Math.round(base * (1 + (a - 1) * porAndarPct / 100) * (u === 1 || u === porAndar ? 1.08 : 1) / 500) * 500, status: 'livre', proprietario: '', bairro: '', foto: '' }); });
    return x;
  };
  const jat = emp('Residencial Jatobá', 'Rua 30, 1200 · Jardim Itamaraty', ['Bloco A', 'Bloco B'], 6, 4, 62, 312000, 1.5, 'obra', D(540), { foto: F('fachada-antes'),
    obra: { construtora: forn[0].id, valor: 6200000, pct: 38, atualizado: D(-3), nota: 'Estrutura do Bloco B no 4º pavimento; Bloco A com alvenaria até o 3º.', pagamentos: [] } });
  const ipe = emp('Villa Ipê', 'Rua 12, 340 · Centro', ['Único'], 4, 2, 78, 398000, 1, 'pronto', D(-60), { foto: F('fachada-depois') });
  ipe.captador = rafa.id; // o Villa Ipê foi captado pelo Rafael: venda lá paga também a captação
  const r = sorteio(23);
  e.imoveis.filter((u) => u.emp === jat.id).forEach((u) => { const x = r(); u.status = x < 0.42 ? 'vendida' : x < 0.52 ? 'reservada' : x < 0.56 ? 'permuta' : 'livre'; });
  e.imoveis.filter((u) => u.emp === ipe.id).forEach((u, i) => { u.status = i < 5 ? 'vendida' : 'livre'; });
  const u304 = e.imoveis.find((u) => u.emp === jat.id && u.bloco === 'Bloco A' && u.num === '304'); u304.status = 'livre';
  // imóveis avulsos
  const av = (titulo, tipo, fin, bairro, area, quartos, preco, prop, status, foto) => { const x = { id: uid('im'), emp: '', bloco: '', andar: 0, num: '', titulo, tipo, fin, area, quartos, preco, status, proprietario: prop, bairro, foto: foto ? F(foto) : '' }; e.imoveis.push(x); return x; };
  const casa1 = av('Casa térrea com edícula', 'Casa', 'aluguel', 'Jardim Paulista', 140, 3, 2300, pp[4].id, 'alugada', 'fachada-depois');
  const apto1 = av('Apartamento 2 quartos mobiliado', 'Apartamento', 'aluguel', 'Centro', 68, 2, 1650, pp[5].id, 'alugada', 'cozinha-depois');
  const sala1 = av('Sala comercial térrea', 'Sala comercial', 'aluguel', 'Centro', 45, 0, 1900, pp[4].id, 'alugada', 'piso-depois');
  const casa2 = av('Casa com piscina', 'Casa', 'aluguel', 'Jardim Europa', 210, 3, 3900, pp[4].id, 'alugada', 'deck-depois');
  av('Casa de 3 quartos reformada', 'Casa', 'venda', 'Vila Rodrigues', 160, 3, 465000, pp[9].id, 'livre', 'banheiro-depois');
  av('Terreno 360 m²', 'Terreno', 'venda', 'Jardim Itamaraty', 360, 0, 145000, pp[5].id, 'livre', '');
  av('Apartamento térreo', 'Apartamento', 'aluguel', 'Vila São Bento', 58, 2, 1350, pp[9].id, 'livre', 'piso-depois');
  // pagamentos à construtora (obra contratada)
  [[-120, 620000, 1], [-90, 465000, 1], [-60, 465000, 1], [-30, 372000, 1], [0, 434000, 0], [30, 434000, 0]].forEach(([k, v, pg], i) => jat.obra.pagamentos.push({ id: uid('pg'), dia: D(k), valor: v, desc: `Parcela ${i + 1} da obra`, pago: !!pg }));
  // interessados e funil
  const unLivres = e.imoveis.filter((u) => u.emp === jat.id && u.status === 'livre');
  const lead = (p, nome, fone, interesse, imovel, etapa, cor, origem, dia) => e.leads.push({ id: uid('ld'), pessoa: p, nome, fone, interesse, imovel, etapa, corretor: cor.id, origem, dia, obs: '' });
  lead('', 'Larissa Teixeira', '(16) 99101-2020', 'Apartamento 2 quartos até R$ 330 mil', unLivres[0].id, 'novo', ana, 'Instagram', D(0));
  lead('', 'Diego Martins', '(16) 99101-3030', 'Casa para alugar até R$ 2.500', '', 'novo', rafa, 'Placa', D(-1));
  lead(pp[6].id, 'Thiago Rocha', '(16) 99799-0101', 'Apartamento na planta, andar alto', u304.id, 'visita', ana, 'Site', D(-6));
  lead(pp[7].id, 'Patrícia Nunes', '(16) 99800-1212', 'Casa de 3 quartos', e.imoveis.find((x) => x.titulo.startsWith('Casa de 3')).id, 'contato', bia, 'Indicação', D(-4));
  lead(pp[8].id, 'Marcelo Andrade', '(16) 99911-2323', 'Investimento: 2 apartamentos', unLivres[2].id, 'proposta', rafa, 'Instagram', D(-12));
  lead(pp[0].id, 'Fernanda Oliveira', '(16) 99821-4040', 'Apartamento 3 quartos', '', 'fechado', ana, 'Site', D(-40));
  lead('', 'Rogério Lima', '(16) 99101-5050', 'Terreno para construir', e.imoveis.find((x) => x.tipo === 'Terreno').id, 'contato', bia, 'WhatsApp', D(-2));
  lead('', 'Camila Duarte', '(16) 99101-6060', 'Sala comercial', '', 'perdido', rafa, 'Site', D(-20));
  lead('', 'Paulo Henrique Sales', '(16) 99101-7070', 'Apartamento 2 quartos no Jatobá', unLivres[3].id, 'perdido', ana, 'Plantão', D(-15));
  Object.assign(e.leads.find((l) => l.nome === 'Camila Duarte'), { motivo: 'Achou mais barato em outro lugar', motivoObs: 'alugou sala no Centro por R$ 1.500', perdidoEm: D(-12) });
  Object.assign(e.leads.find((l) => l.nome === 'Paulo Henrique Sales'), { motivo: 'Financiamento negado', motivoObs: 'banco não aprovou a renda; voltar a falar em março', perdidoEm: D(-6) });
  // visitas
  const vis = (k, hora, ld, im, cor, status, nota) => e.visitas.push({ id: uid('vi'), dia: D(k), hora, lead: e.leads.find((l) => l.nome === ld).id, imovel: im, corretor: cor.id, status, nota: nota || '' });
  vis(0, '10:00', 'Thiago Rocha', u304.id, ana, 'marcada'); vis(0, '16:30', 'Patrícia Nunes', e.imoveis.find((x) => x.titulo.startsWith('Casa de 3')).id, bia, 'marcada');
  vis(1, '09:30', 'Rogério Lima', e.imoveis.find((x) => x.tipo === 'Terreno').id, bia, 'marcada'); vis(-5, '14:00', 'Marcelo Andrade', unLivres[2].id, rafa, 'feita', 'Gostou da planta; quer proposta para 2 unidades.');
  // propostas e contratos
  e.propostas.push({ id: uid('pp'), lead: e.leads.find((l) => l.nome === 'Marcelo Andrade').id, imovel: unLivres[2].id, valor: unLivres[2].preco - 8000, entrada: Math.round((unLivres[2].preco - 8000) * 0.1), mensais: 36, mensal: 1650, inter: 3, interValor: 14000, chaves: 0, indice: 'INCC', dia: D(-3), status: 'enviada', corretor: rafa.id });
  e.propostas[0].chaves = e.propostas[0].valor - e.propostas[0].entrada - 36 * 1650 - 3 * 14000;
  const vendida = e.imoveis.find((u) => u.emp === jat.id && u.status === 'vendida');
  const contrato = (comprador, im, valor, dia, cor, plano) => {
    const parc = []; let k = 0;
    parc.push({ id: uid('pa'), n: ++k, tipo: 'Entrada', venc: dia, valor: plano.entrada, pago: dia });
    for (let i = 1; i <= plano.mensais; i++) { const v = somaMeses(dia, i); parc.push({ id: uid('pa'), n: ++k, tipo: `Mensal ${i}/${plano.mensais}`, venc: v, valor: plano.mensal, pago: v < H() ? v : '' }); }
    for (let i = 1; i <= plano.inter; i++) { const v = somaMeses(dia, i * 12); parc.push({ id: uid('pa'), n: ++k, tipo: `Intermediária ${i}/${plano.inter}`, venc: v, valor: plano.interValor, pago: v < H() ? v : '' }); }
    if (plano.chaves) parc.push({ id: uid('pa'), n: ++k, tipo: 'Chaves', venc: plano.chavesDia || somaMeses(dia, plano.mensais + 1), valor: plano.chaves, pago: '' });
    parc.sort((a, b) => a.venc.localeCompare(b.venc));
    const ct = { id: uid('ct'), comprador, imovel: im.id, valor, dia, indice: plano.indice || 'INCC', corretor: cor.id, comissaoPct: cor.pct, parcelas: parc, correcoes: [] };
    e.contratos.push(ct); im.status = 'vendida'; return ct;
  };
  const ct1 = contrato(pp[0].id, vendida, vendida.preco, D(-40), ana, { entrada: Math.round(vendida.preco * 0.1), mensais: 36, mensal: Math.round(vendida.preco * 0.2 / 36), inter: 3, interValor: Math.round(vendida.preco * 0.05), chaves: vendida.preco - Math.round(vendida.preco * 0.1) - 36 * Math.round(vendida.preco * 0.2 / 36) - 3 * Math.round(vendida.preco * 0.05), chavesDia: jat.entrega });
  ct1.correcoes.push({ dia: D(-40 + 30), indice: 'INCC', pct: 0.39 });
  ct1.etapas = { assinado: D(-40), itbi: D(-31) };
  { const atr = ct1.parcelas.filter((p) => p.pago && p.tipo.startsWith('Mensal') && p.venc < H()).pop(); if (atr) atr.pago = ''; }
  const ipeV = e.imoveis.find((u) => u.emp === ipe.id && u.status === 'vendida');
  const ct2 = contrato(pp[1].id, ipeV, ipeV.preco, D(-25), bia, { entrada: Math.round(ipeV.preco * 0.3), mensais: 0, mensal: 0, inter: 0, interValor: 0, chaves: ipeV.preco - Math.round(ipeV.preco * 0.3), chavesDia: D(35) });
  // a venda da Bia passou por visita e proposta (o desempenho do corretor conta as duas)
  lead(pp[1].id, pp[1].nome, pp[1].fone, 'Apartamento pronto no Centro', ipeV.id, 'fechado', bia, 'Indicação', D(-33)); const ldV = e.leads[e.leads.length - 1].id;
  e.visitas.push({ id: uid('vi'), dia: D(-29), hora: '10:30', lead: ldV, imovel: ipeV.id, corretor: bia.id, status: 'feita', nota: 'Comprador gostou; pediu proposta à vista + chaves.' });
  e.propostas.push({ id: uid('pp'), lead: ldV, pessoa: pp[1].id, imovel: ipeV.id, valor: ipeV.preco, entrada: Math.round(ipeV.preco * 0.3), mensais: 0, mensal: 0, inter: 0, interValor: 0, chaves: ipeV.preco - Math.round(ipeV.preco * 0.3), indice: 'INCC', dia: D(-27), status: 'aceita', corretor: bia.id });
  ct2.etapas = { assinado: D(-25), itbi: D(-19), escritura: D(-6) };
  // aluguéis
  const alu = (im, inq, prop, valor, diaVenc, taxa, ini, meses, ex = {}) => {
    const a = { id: uid('al'), imovel: im.id, inquilino: inq, proprietario: prop, valor, diaVenc, taxa, inicio: ini, meses, indice: 'IGP-M', garantia: 'Seguro-fiança', ...ex, cobrancas: [] };
    for (let m = 2; m >= 0; m--) { const ref = somaMeses(H(), -m).slice(0, 7), venc = `${ref}-${String(diaVenc).padStart(2, '0')}`; const pago = m > 0 || venc < H() && r() < 0.6; a.cobrancas.push({ id: uid('cb'), ref, venc, valor, extras: { ...ex }, pago: pago ? venc : '', repasse: pago && m > 0 ? somaDias(venc, 3) : '', extrasPago: pago && m > 0 ? somaDias(venc, 3) : '' }); }
    e.alugueis.push(a); return a;
  };
  const alu1 = alu(casa1, pp[2].id, pp[4].id, 2300, 5, 10, D(-300), 30, { iptu: 95, seguro: 28 }); const alu2 = alu(apto1, pp[3].id, pp[5].id, 1650, 10, 10, D(-160), 30, { condominio: 420, iptu: 62, seguro: 22 }); const alu3 = alu(sala1, pp[6].id, pp[4].id, 1900, 15, 8, D(-420), 36, { condominio: 310, iptu: 140, seguro: 35 }); const alu4 = alu(casa2, pp[8].id, pp[4].id, 3900, 20, 10, D(-90), 30, { iptu: 180, seguro: 40 });
  { const c = alu4.cobrancas[alu4.cobrancas.length - 1]; c.pago = D(-1); c.repasse = ''; c.extrasPago = ''; const s3 = alu3.cobrancas[alu3.cobrancas.length - 1]; s3.pago = s3.venc < H() ? s3.venc : D(-2); s3.repasse = ''; s3.extrasPago = ''; s3.descontos = [{ desc: 'Troca da fechadura da porta de vidro', valor: 180 }]; } // pagou adiantado: o repasse do Roberto soma os dois imóveis
  { const c = alu2.cobrancas.find((x) => x.repasse); if (c) c.descontos = [{ desc: 'Conserto hidráulico (vazamento no banheiro)', valor: 280 }]; }
  // mais contratos de aluguel: a carteira de exemplo fica com 14, com proprietários de vários imóveis
  const donoNovo = [pes('cliente', 'Antônio Bertolucci', '(16) 99133-4411'), pes('cliente', 'Maria Inês Garcia', '(16) 99244-5522')]; e.pessoas.push(...donoNovo);
  [['Casa 2 quartos', 'Casa', 'Vila Rodrigues', 82, 2, 1450, pp[5], 'Rodrigo Teixeira', 8, 'fachada-depois'], ['Kitnet perto da faculdade', 'Apartamento', 'Centro', 32, 1, 850, donoNovo[0], 'Ana Beatriz Lopes', 5, 'cozinha-depois'], ['Kitnet 2 (mesmo prédio)', 'Apartamento', 'Centro', 32, 1, 850, donoNovo[0], 'Felipe Moura', 5, 'cozinha-depois'],
    ['Kitnet 3 (mesmo prédio)', 'Apartamento', 'Centro', 30, 1, 820, donoNovo[0], 'Lara Cristina Souza', 5, ''], ['Ponto comercial na Av. 9', 'Sala comercial', 'Centro', 90, 0, 3200, donoNovo[1], 'Farmácia Bem Estar', 10, 'piso-depois'], ['Galpão pequeno', 'Galpão', 'Distrito Industrial', 300, 0, 4800, donoNovo[1], 'Serralheria Orlândia', 15, ''],
    ['Casa com quintal', 'Casa', 'Jardim Europa', 120, 3, 2100, pp[9], 'Wagner e Paula Reis', 20, 'deck-depois'], ['Apartamento 3 quartos', 'Apartamento', 'Jardim Paulista', 95, 3, 2400, pp[9], 'Luciana Prado', 25, 'banheiro-depois'], ['Sobrado geminado', 'Casa', 'Vila São Bento', 110, 3, 1950, pp[5], 'Ricardo Alves', 10, ''], ['Sala no 2º andar', 'Sala comercial', 'Centro', 40, 0, 1100, donoNovo[1], 'Contabilidade Exata', 10, '']]
    .forEach(([tit, tipo, bairro, area, q, valor, dono, inq, dia, foto], k) => { const im = av(tit, tipo, 'aluguel', bairro, area, q, valor, dono.id, 'alugada', foto); const p = pes('cliente', inq, `(16) 99${String(310 + k)}-${String(1000 + k * 37).slice(0, 4)}`); e.pessoas.push(p);
      alu(im, p.id, dono.id, valor, dia, k % 3 ? 10 : 8, D(-100 - k * 40), 30, tipo === 'Apartamento' && area > 50 ? { condominio: 380, iptu: 70, seguro: 25 } : { iptu: Math.round(valor * 0.04), seguro: 20 });
      const c = e.alugueis[e.alugueis.length - 1].cobrancas[2]; if (c.venc < H()) { c.pago = k === 1 ? '' : c.venc; c.repasse = k === 1 || k % 2 ? '' : somaDias(c.venc, 3) < H() ? somaDias(c.venc, 3) : ''; c.extrasPago = c.repasse; } else { c.pago = ''; c.repasse = ''; } });
  e.imoveis.filter((u) => u.status === 'reservada').forEach((u, k) => { u.reservaPara = ['Marcos Vieira', 'Juliana Prado', 'Sr. Antônio Reis', 'Camila Rocha', 'Diego Martins', 'Patrícia Nunes'][k % 6]; u.reservaCor = e.corretores[k % e.corretores.length].id; u.reservaAte = D([3, -2, 6, 1, 9, -4][k % 6]); });
  { const c = alu1.cobrancas.find((x) => x.venc < H() && x.ref === H().slice(0, 7)); if (c) { c.pago = ''; c.repasse = ''; const d1 = somaDias(c.venc, 3) < H() ? somaDias(c.venc, 3) : H(); c.cobrado = d1; c.hist = [{ dia: H(), txt: 'Liguei: disse que recebe dia 25 e paga no mesmo dia' }, { dia: d1, txt: 'Cobrado no WhatsApp' }]; c.acordo = { ate: somaDias(H(), 5), isenta: false, obs: 'paga quando receber o salário', feito: H() }; } }
  e.leads.forEach((l) => { l.hist = [{ dia: l.dia, txt: `Chegou pelo ${l.origem}` }]; if (l.etapa !== 'novo') l.hist.unshift({ dia: somaDias(l.dia, 1), txt: 'Primeiro contato pelo WhatsApp' }); });
  // comissões
  e.comissoes = [{ id: uid('cm'), corretor: ana.id, origem: `Venda · ${vendida.titulo}`, valor: Math.round(ct1.valor * ana.pct / 100), dia: D(-40), pago: D(-30) },
    { id: uid('cm'), corretor: bia.id, origem: `Venda · ${ipeV.titulo}`, valor: Math.round(ct2.valor * bia.pct / 100), dia: D(-25), pago: '' },
    { id: uid('cm'), corretor: rafa.id, tipo: 'captacao', origem: `Captação · ${ipeV.titulo}`, valor: Math.round(ct2.valor * 1 / 100), dia: D(-25), pago: '' },
    { id: uid('cm'), corretor: rafa.id, origem: 'Locação · Casa com piscina (1º aluguel)', valor: 1950, dia: D(-90), pago: D(-80) }];
  // financeiro
  const fin = (tipo, desc, valor, venc, pago, extra = {}) => e.fin.push({ id: uid('f'), tipo, desc, valor, venc, pago: pago || '', forma: pago ? 'Pix' : '', pessoa: '', cat: '', ...extra });
  jat.obra.pagamentos.forEach((p) => fin('pagar', `${p.desc} · ${jat.nome}`, p.valor, p.dia, p.pago ? p.dia : '', { pessoa: forn[0].id, cat: 'Obra contratada', obraPg: p.id }));
  fin('pagar', 'Anúncios nos portais', 890, D(5), '', { cat: 'Marketing' }); fin('pagar', 'Folhetos do Residencial Jatobá', 1450, D(-7), D(-7), { pessoa: forn[1].id, cat: 'Marketing' });
  fin('pagar', 'Aluguel do plantão de vendas', 2200, D(-12), D(-12), { cat: 'Plantão' }); fin('pagar', 'Contador', 900, D(10), '', { cat: 'Despesas fixas' });
  e.equipe = [{ id: uid('u'), email: 'ana.corretora@exemplo.com', nome: 'Ana Paula', cargo: 'Corretora', telas: ['#painel', '#imoveis', '#funil', '#visitas'], soVer: false, aceito: true }];
  return e;
}

usarSemente((ramo) => ({ construtora, loja, imobiliaria }[ramo] || construtora)());
