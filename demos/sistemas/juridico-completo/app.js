// Veltria Jurídico Completo · protótipo "pasta de processos" para escritório pequeno (2 a 10 pessoas).
// Abas de fichário: pauta da semana, processos com capa, prazos com responsável (interno e fatal), intimações para
// distribuir, atendimentos (funil de consultas), horas, financeiro (honorários e despesas), modelos de peças
// preenchidos, equipe e permissões, ajustes. A IA abre numa gaveta lateral. Dados de exemplo neste navegador (?novo).

const CHAVE = 'veltria-juridico-completo-v1';
const rs = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const sx = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const base = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const valor = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const gid = () => `j${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const qs = (s) => document.querySelector(s);

// calendário forense: fins de semana, feriados nacionais de 2026/2027 e recesso de 20/12 a 20/01
const SEM_EXPEDIENTE = ['2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25', '2027-01-01', '2027-02-08', '2027-02-09', '2027-03-26', '2027-04-21', '2027-05-01', '2027-05-27'];
const zero = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const forense = (d) => { const m = d.getMonth() + 1, x = d.getDate(); return d.getDay() % 6 !== 0 && !SEM_EXPEDIENTE.includes(isoDe(d)) && !((m === 12 && x >= 20) || (m === 1 && x <= 20)); };
const avancaUteis = (de, n) => { const d = new Date(de); let k = 0; const passo = n >= 0 ? 1 : -1; while (k < Math.abs(n)) { d.setDate(d.getDate() + passo); if (forense(d)) k++; } return d; };
const emDias = (d) => Math.round((d - zero()) / 864e5);
const quando = (off) => { const d = zero(); d.setDate(d.getDate() + off); return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', ''); };
const uteisFaltam = (off) => { const fim = zero(); fim.setDate(fim.getDate() + off); if (off < 0) return -1; let k = 0; const d = zero(); while (d < fim) { d.setDate(d.getDate() + 1); if (forense(d)) k++; } return k; };

// ------------------------------------------------------------------ escritório de exemplo
function escritorio() {
  const equipe = [{ id: 'a1', nome: 'Dra. Luana Ferraz', cargo: 'Sócia', hora: 450 }, { id: 'a2', nome: 'Dr. Rafael Albuquerque', cargo: 'Sócio', hora: 450 }, { id: 'a3', nome: 'Dra. Camila Neves', cargo: 'Associada', hora: 300 }, { id: 'a4', nome: 'Bruna Lima', cargo: 'Estagiária', hora: 0 }];
  const clientes = [['c1', 'Marina Duarte', '31988001122'], ['c2', 'Transportes Ágil Ltda', '31932215500'], ['c3', 'José Roberto Antunes', '31991117788'], ['c4', 'Clínica Sorriso Pleno', '31930012299'], ['c5', 'Condomínio Ed. Aurora', '31934449900'], ['c6', 'Helena e Paulo Vasques', '31996663311']].map(([id, nome, tel]) => ({ id, nome, tel }));
  const P = (id, cnj, cli, resp, tipo, contra, vara, fase, valorCausa, andamentos) => ({ id, cnj, cli, resp, tipo, contra, vara, fase, valorCausa, andamentos: andamentos.map(([d, t]) => ({ dia: d, texto: t })), docs: ['Procuração.pdf', 'Petição inicial.pdf', 'Documentos pessoais.pdf'] });
  const processos = [
    P('p1', '5012447-38.2026.8.13.0024', 'c1', 'a1', 'Revisional de contrato bancário', 'Banco Horizonte S.A.', '14ª Vara Cível de BH', 'Réplica', 48300, [[-2, 'Juntada da contestação do réu'], [-30, 'Citação do réu'], [-41, 'Distribuição']]),
    P('p2', '0010922-61.2026.5.03.0011', 'c3', 'a3', 'Reclamação trabalhista', 'Transportadora Rota Sul Ltda', '11ª Vara do Trabalho de BH', 'Sentença', 86200, [[-1, 'Sentença: procedência parcial'], [-25, 'Audiência de instrução'], [-90, 'Distribuição']]),
    P('p3', '5021108-77.2026.8.13.0024', 'c2', 'a2', 'Cobrança de frete', 'Distribuidora Minas Norte', '22ª Vara Cível de BH', 'Citação', 132400, [[-6, 'Expedido mandado de citação'], [-15, 'Distribuição']]),
    P('p4', '5003317-05.2026.8.13.0024', 'c4', 'a1', 'Defesa em ação de indenização', 'Paciente A.S.M.', '9ª Vara Cível de BH', 'Contestação', 60000, [[-3, 'Citação da clínica'], [-20, 'Distribuição']]),
    P('p5', '5098822-14.2025.8.13.0024', 'c5', 'a2', 'Execução de cotas condominiais', 'Unidade 1102', '5ª Vara Cível de BH', 'Penhora', 23900, [[-8, 'Deferida penhora on-line'], [-120, 'Distribuição']]),
    P('p6', '5110063-28.2026.8.13.0024', 'c6', 'a3', 'Divórcio consensual com partilha', '—', '3ª Vara de Família de BH', 'Audiência', 0, [[-5, 'Designada audiência'], [-32, 'Distribuição']]),
  ];
  const pz = (proc, desc, resp, uteis, status = 'aberto') => { const f = avancaUteis(zero(), uteis); return { id: gid(), proc, desc, resp, fatal: emDias(f), interno: emDias(avancaUteis(f, -2)), status }; };
  const prazos = [pz('p2', 'Recurso ordinário', 'a3', 4), pz('p1', 'Réplica à contestação', 'a1', 6), pz('p4', 'Contestação', 'a1', 11), pz('p5', 'Manifestar sobre a penhora', 'a2', 2), pz('p6', 'Juntar plano de partilha', 'a4', 3), pz('p3', 'Emenda à inicial', 'a2', -1, 'protocolado')];
  const intimacoes = [
    { id: gid(), proc: 'p2', dia: -1, texto: 'Intimem-se as partes da sentença de ID 4471230 (procedência parcial).', resp: 'a3', tratada: true },
    { id: gid(), proc: 'p5', dia: 0, texto: 'Manifeste-se o exequente sobre o bloqueio de R$ 8.912,40 via SISBAJUD, no prazo de 5 dias.', resp: '', tratada: false },
    { id: gid(), proc: 'p6', dia: 0, texto: 'Ficam as partes intimadas da audiência designada para o dia 12, às 15h, na modalidade presencial.', resp: '', tratada: false },
    { id: gid(), proc: 'p4', dia: -3, texto: 'Cite-se a ré para, querendo, apresentar contestação no prazo de 15 dias (art. 335, CPC).', resp: 'a1', tratada: true },
  ];
  const audiencias = [{ id: gid(), proc: 'p6', dia: 2, hora: '15:00', tipo: 'Conciliação (Família)' }, { id: gid(), proc: 'p1', dia: 9, hora: '09:30', tipo: 'Instrução e julgamento' }, { id: gid(), proc: 'p3', dia: 1, hora: '10:00', tipo: 'Reunião com o cliente' }];
  const atendimentos = [
    { id: gid(), nome: 'Ricardo Menezes', tel: '31988882211', area: 'Trabalhista', etapa: 'contato', valor: 0, origem: 'Instagram' },
    { id: gid(), nome: 'Imobiliária Casa Nova', tel: '31933330099', area: 'Despejo', etapa: 'consulta', valor: 0, origem: 'Indicação' },
    { id: gid(), nome: 'Patrícia Gomes', tel: '31997776655', area: 'Inventário', etapa: 'proposta', valor: 18000, origem: 'Google' },
    { id: gid(), nome: 'Auto Peças Lider', tel: '31932221100', area: 'Tributário', etapa: 'proposta', valor: 9600, origem: 'Indicação' },
    { id: gid(), nome: 'Clínica Sorriso Pleno', tel: '31930012299', area: 'Cível', etapa: 'contratado', valor: 12000, origem: 'Indicação' },
  ];
  const horas = [[-1, 'a1', 'p1', 2.5, 'Análise da contestação e documentos'], [-1, 'a3', 'p2', 3, 'Leitura da sentença e minuta do recurso'], [-2, 'a2', 'p5', 1, 'Pesquisa de bens do devedor'], [-3, 'a1', 'p4', 1.5, 'Reunião com a clínica'], [-4, 'a3', 'p6', 2, 'Minuta do acordo de partilha']].map(([dia, adv, proc, h, desc]) => ({ id: gid(), dia, adv, proc, h, desc, fatura: true }));
  const parcelas = (n, v, de, pagas) => Array.from({ length: n }, (_, i) => ({ dia: de + i * 30, v, pago: i < pagas }));
  const contratos = [{ id: gid(), cli: 'c1', proc: 'p1', tipo: 'Parcelado + 20% do êxito', parcelas: parcelas(6, 900, -95, 3) }, { id: gid(), cli: 'c2', proc: 'p3', tipo: 'Mensal (partido)', parcelas: parcelas(12, 2500, -200, 6) }, { id: gid(), cli: 'c4', proc: 'p4', tipo: 'Valor fechado', parcelas: parcelas(3, 4000, -12, 1) }, { id: gid(), cli: 'c5', proc: 'p5', tipo: '20% do recuperado', parcelas: parcelas(1, 1780, 9, 0) }];
  const despesas = [{ id: gid(), proc: 'p3', desc: 'Custas iniciais', v: 1324, reemb: false }, { id: gid(), proc: 'p5', desc: 'Certidão do cartório de imóveis', v: 84.6, reemb: true }, { id: gid(), proc: 'p4', desc: 'Cópias autenticadas', v: 46, reemb: false }];
  return { esc: { nome: 'Ferraz & Albuquerque Advogados', cidade: 'Belo Horizonte/MG', oab: 'OAB/MG 9.112 (sociedade)' }, eu: 'a1', ajustes: { abrir: 'pauta', letra: 'normal', alertaInterno: 2 },
    equipe, clientes, processos, prazos, intimacoes, audiencias, atendimentos, horas, contratos, despesas, plano: 'basico', conversa: [],
    permissoes: { Sócia: 'tudo', Sócio: 'tudo', Associada: 'sem financeiro', Estagiária: 'prazos e intimações' } };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || escritorio(); } catch { return escritorio(); } })();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
const guarda = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { aviso('Sem espaço no navegador.'); } };
const pessoa = (id) => db.equipe.find((x) => x.id === id) || { nome: '—', hora: 0, cargo: '' };
const cliente = (id) => db.clientes.find((x) => x.id === id) || { nome: '—', tel: '' };
// processo apagado ou não escolhido (cadastro pelo editor de Dados): um vazio no lugar, para a tela não quebrar
const processo = (id) => db.processos.find((x) => x.id === id) || { id: '', cli: '', cnj: '—', tipo: '', vara: '', contra: '', fase: '', andamentos: [], docs: [] };
const parcAberto = () => db.contratos.flatMap((c) => c.parcelas.filter((p) => !p.pago).map((p) => ({ c, p })));

function aviso(t) { const a = document.createElement('div'); a.className = 'av'; a.textContent = t; qs('#avisos').append(a); setTimeout(() => a.remove(), 3200); }
function janela(html, depois) {
  const v = document.createElement('div'); v.className = 'veu'; v.innerHTML = `<div class="janela" role="dialog" aria-modal="true">${html}</div>`;
  const ant = document.activeElement; document.body.append(v);
  const fecha = () => { v.remove(); ant?.focus?.(); };
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-fecha]')) fecha(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); });
  setTimeout(() => (v.querySelector('input, select, textarea') || v.querySelector('button'))?.focus(), 30);
  depois?.(v.querySelector('.janela'), fecha);
}
function ficha(t, campos, ok, fazer) {
  janela(`<h2>${t}</h2><form>${campos}<div class="pe"><button type="button" class="b" data-fecha>Cancelar</button><button class="b bordo">${ok}</button></div></form>`, (j, fecha) => j.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); if (fazer(new FormData(e.target)) !== false) { guarda(); fecha(); abre(); } }));
}
const opcoesEquipe = (sel) => db.equipe.map((a) => `<option value="${a.id}" ${a.id === sel ? 'selected' : ''}>${sx(a.nome)}</option>`).join('');
const opcoesProc = (sel) => db.processos.map((p) => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${sx(cliente(p.cli).nome)} · ${sx(p.tipo)}</option>`).join('');
function seloPrazo(p) { if (p.status === 'protocolado') return '<span class="et ok">protocolado</span>'; const u = uteisFaltam(p.fatal); return u < 0 ? '<span class="et v">vencido</span>' : u <= 1 ? `<span class="et v">${u === 0 ? 'vence hoje' : '1 dia útil'}</span>` : p.interno <= 0 ? `<span class="et a">passou do interno · ${u} d.ú.</span>` : `<span class="et">${u} dias úteis</span>`; }

// ------------------------------------------------------------------ abas
const ABAS = [['pauta', 'Pauta'], ['processos', 'Processos'], ['prazos', 'Prazos'], ['intimacoes', 'Intimações'], ['atendimentos', 'Atendimentos'], ['horas', 'Horas'], ['financeiro', 'Financeiro'], ['modelos', 'Modelos de peças'], ['equipe', 'Equipe'], ['ajustes', 'Ajustes']];
let sub = 'andamentos';
const V = {
  pauta() {
    // os próximos 5 dias úteis a partir de hoje (na sexta, a semana do calendário já tinha passado quase toda)
    const dias = []; for (const d = zero(); dias.length < 5; d.setDate(d.getDate() + 1)) if (d.getDay() % 6) dias.push(emDias(d));
    const abertos = db.prazos.filter((p) => p.status === 'aberto'), novos = db.intimacoes.filter((i) => !i.resp);
    return `<div class="titulo"><div><h1>Pauta dos próximos dias</h1><p>${abertos.length} prazos abertos · ${novos.length} intimações esperando responsável · ${db.audiencias.filter((a) => a.dia >= 0 && a.dia <= 7).length} audiências em 7 dias</p></div><div class="bts"><button class="b bordo" data-a="novo-prazo">+ Prazo</button><button class="b" data-a="nova-aud">+ Audiência</button></div></div>
      <div class="grade" style="margin-bottom:16px">
        <div class="ficha num bordo c3"><small>Vencem em até 2 dias úteis</small><b>${abertos.filter((p) => uteisFaltam(p.fatal) <= 2).length}</b><span>prazos fatais</span></div>
        <div class="ficha num c3"><small>Passaram do prazo interno</small><b>${abertos.filter((p) => p.interno <= 0).length}</b><span>revisar hoje</span></div>
        <div class="ficha num c3"><small>Horas da semana</small><b>${db.horas.filter((h) => h.dia >= -6).reduce((t, h) => t + h.h, 0).toLocaleString('pt-BR')} h</b><span>${rs(db.horas.filter((h) => h.dia >= -6 && h.fatura).reduce((t, h) => t + h.h * pessoa(h.adv).hora, 0))} faturáveis</span></div>
        <div class="ficha num c3"><small>Honorários atrasados</small><b>${rs(parcAberto().filter(({ p }) => p.dia < 0).reduce((t, x) => t + x.p.v, 0))}</b><span>${parcAberto().filter(({ p }) => p.dia < 0).length} parcelas</span></div></div>
      <div class="semana">${dias.map((d) => { const ev = [...abertos.filter((p) => p.fatal === d).map((p) => `<div class="ev prazo"><b>${sx(p.desc)}</b>${sx(cliente(processo(p.proc).cli).nome)} · ${sx(pessoa(p.resp).nome.split(' ').slice(-1)[0])}</div>`), ...db.audiencias.filter((a) => a.dia === d).map((a) => `<div class="ev aud"><b>${a.hora} ${sx(a.tipo)}</b>${sx(cliente(processo(a.proc).cli).nome)}</div>`), ...abertos.filter((p) => p.interno === d && p.fatal !== d).map((p) => `<div class="ev"><b>Interno: ${sx(p.desc)}</b>${sx(cliente(processo(p.proc).cli).nome)}</div>`)];
        return `<section class="dia-p ${d === 0 ? 'hoje' : ''}"><header><span>${quando(d)}</span><span>${ev.length || ''}</span></header>${ev.join('') || '<p class="vazio" style="padding:8px">Livre</p>'}</section>`; }).join('')}</div>`;
  },
  processos() {
    const q = base(qs('#procura').value);
    const l = db.processos.filter((p) => !q || base(`${p.cnj} ${cliente(p.cli).nome} ${p.tipo} ${p.contra}`).includes(q));
    return `<div class="titulo"><div><h1>Processos</h1><p>${db.processos.length} ativos. Clique para abrir a capa.</p></div><button class="b bordo" data-a="novo-processo">+ Processo</button></div>
      <div class="rol"><table><thead><tr><th>Cliente</th><th>Número CNJ</th><th>Ação</th><th>Responsável</th><th>Fase</th><th>Próximo prazo</th></tr></thead><tbody>
      ${l.map((p) => { const pz = db.prazos.filter((x) => x.proc === p.id && x.status === 'aberto').sort((a, b) => a.fatal - b.fatal)[0]; return `<tr class="linha-click" data-abre="${p.id}"><td><b>${sx(cliente(p.cli).nome)}</b></td><td class="mono">${p.cnj}</td><td>${sx(p.tipo)}</td><td>${sx(pessoa(p.resp).nome)}</td><td><span class="et">${sx(p.fase)}</span></td><td>${pz ? `${seloPrazo(pz)} ${sx(pz.desc)}` : '—'}</td></tr>`; }).join('')}</tbody></table></div>`;
  },
  processo(id) {
    const p = processo(id); if (!p.id) return V.processos(); const c = cliente(p.cli);
    const corpo = {
      andamentos: () => `<ol class="linha-tempo">${p.andamentos.map((a) => `<li><time>${quando(a.dia)}</time><div>${sx(a.texto)}</div></li>`).join('')}</ol><button class="b" data-a="andamento" data-p="${id}">+ Andamento</button>`,
      prazos: () => `<table><thead><tr><th>Prazo</th><th>Responsável</th><th>Interno</th><th>Fatal</th><th></th></tr></thead><tbody>${db.prazos.filter((x) => x.proc === id).map((x) => `<tr><td>${sx(x.desc)}</td><td>${sx(pessoa(x.resp).nome)}</td><td>${quando(x.interno)}</td><td>${quando(x.fatal)}</td><td>${seloPrazo(x)}</td></tr>`).join('')}</tbody></table>`,
      documentos: () => `<ul class="linha-tempo">${p.docs.map((d) => `<li>📄 ${sx(d)}</li>`).join('')}</ul><label class="b" style="cursor:pointer">+ Anexar documento<input type="file" hidden data-anexo="${id}"></label>`,
      honorarios: () => { const cs = db.contratos.filter((x) => x.proc === id); return cs.map((x) => `<p><b>${sx(x.tipo)}</b></p><table><tbody>${x.parcelas.map((y) => `<tr><td>${quando(y.dia)}</td><td class="n">${rs(y.v)}</td><td>${y.pago ? '<span class="et ok">pago</span>' : y.dia < 0 ? '<span class="et v">atrasado</span>' : '<span class="et">a vencer</span>'}</td></tr>`).join('')}</tbody></table>`).join('') || '<p class="vazio">Sem contrato vinculado.</p>'; },
      horas: () => { const hs = db.horas.filter((x) => x.proc === id); return `<table><thead><tr><th>Dia</th><th>Quem</th><th>O que</th><th class="n">Horas</th></tr></thead><tbody>${hs.map((x) => `<tr><td>${quando(x.dia)}</td><td>${sx(pessoa(x.adv).nome)}</td><td>${sx(x.desc)}</td><td class="n">${x.h.toLocaleString('pt-BR')}</td></tr>`).join('')}</tbody></table>`; },
    };
    return `<div class="titulo"><div><a href="#processos">← Processos</a><h1>${sx(c.nome)}</h1><p>${sx(p.tipo)}</p></div><div class="bts"><a class="b" target="_blank" rel="noopener" href="https://wa.me/55${c.tel}?text=${encodeURIComponent(`Olá! Atualização do seu processo (${p.tipo}): fase atual ${p.fase}. Qualquer dúvida, estamos à disposição. ${db.esc.nome}`)}">Atualizar o cliente</a><button class="b" data-a="portal" data-p="${id}">Portal do cliente</button><button class="b bordo" data-a="novo-prazo" data-p="${id}">+ Prazo</button></div></div>
      <section class="capa"><div><span class="cnj">${p.cnj}</span><dl><dt>Autor/cliente</dt><dd>${sx(c.nome)}</dd><dt>Parte contrária</dt><dd>${sx(p.contra)}</dd><dt>Juízo</dt><dd>${sx(p.vara)}</dd><dt>Valor da causa</dt><dd>${rs(p.valorCausa)}</dd><dt>Responsável</dt><dd>${sx(pessoa(p.resp).nome)}</dd></dl></div><div><span class="et b">${sx(p.fase)}</span></div></section>
      <div class="sub-abas" role="group" aria-label="Partes do processo">${[['andamentos', 'Andamentos'], ['prazos', 'Prazos'], ['documentos', 'Documentos'], ['honorarios', 'Honorários'], ['horas', 'Horas']].map(([k, t]) => `<button data-sub="${k}" aria-pressed="${sub === k}">${t}</button>`).join('')}</div>${(corpo[sub] || corpo.andamentos)()}`;
  },
  prazos() {
    const l = [...db.prazos].sort((a, b) => (a.status === 'protocolado') - (b.status === 'protocolado') || a.fatal - b.fatal);
    return `<div class="titulo"><div><h1>Prazos</h1><p>Prazo interno ${db.ajustes.alertaInterno} dias úteis antes do fatal, para revisar com calma. Contagem forense (sem feriados e recesso).</p></div><button class="b bordo" data-a="novo-prazo">+ Prazo</button></div>
      <div class="rol"><table><thead><tr><th>Situação</th><th>Prazo</th><th>Cliente</th><th>Responsável</th><th>Interno</th><th>Fatal</th><th></th></tr></thead><tbody>
      ${l.map((p) => `<tr><td>${seloPrazo(p)}</td><td><b>${sx(p.desc)}</b></td><td>${sx(cliente(processo(p.proc)?.cli).nome)}</td><td><select data-resp="${p.id}" aria-label="Responsável">${opcoesEquipe(p.resp)}</select></td><td>${quando(p.interno)}</td><td>${quando(p.fatal)}</td><td>${p.status === 'aberto' ? `<button class="b mini" data-a="protocolar" data-id="${p.id}">Protocolado</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
  },
  intimacoes() {
    const l = [...db.intimacoes].sort((a, b) => a.tratada - b.tratada || b.dia - a.dia);
    return `<div class="titulo"><div><h1>Intimações</h1><p>Chegam sozinhas do Diário de Justiça Eletrônico (DJEN) pelos números de OAB do escritório. Distribua para alguém e crie o prazo.</p></div></div>
      ${l.map((i) => { const p = processo(i.proc); return `<article class="ficha" style="margin-bottom:10px;${i.tratada ? 'opacity:.7' : 'border-left:4px solid var(--bordo)'}"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>${sx(cliente(p.cli).nome)} · <span class="mono">${p.cnj}</span></b><span>${quando(i.dia)} ${i.tratada ? '<span class="et ok">tratada</span>' : '<span class="et a">nova</span>'}</span></div><p style="margin:8px 0;font-family:var(--serif)">${sx(i.texto)}</p>
        <div class="bts"><select data-int-resp="${i.id}" aria-label="Responsável pela intimação"><option value="">Distribuir para…</option>${opcoesEquipe(i.resp)}</select><button class="b mini" data-a="prazo-int" data-id="${i.id}">Criar prazo</button>${i.tratada ? '' : `<button class="b mini" data-a="tratar" data-id="${i.id}">Marcar tratada</button>`}</div></article>`; }).join('')}`;
  },
  atendimentos() {
    const etapas = [['contato', 'Primeiro contato'], ['consulta', 'Consulta marcada'], ['proposta', 'Proposta enviada'], ['contratado', 'Contratou']];
    return `<div class="titulo"><div><h1>Atendimentos</h1><p>De onde vêm os clientes e quantos fecham. Propostas abertas: ${rs(db.atendimentos.filter((x) => x.etapa === 'proposta').reduce((t, x) => t + x.valor, 0))}.</p></div><button class="b bordo" data-a="novo-atend">+ Atendimento</button></div>
      <div class="funil">${etapas.map(([k, t], i) => `<section class="etapa-f"><h3>${t} (${db.atendimentos.filter((x) => x.etapa === k).length})</h3>${db.atendimentos.filter((x) => x.etapa === k).map((x) => `<div class="lead"><b>${sx(x.nome)}</b>${sx(x.area)} · ${sx(x.origem)}${x.valor ? ` · ${rs(x.valor)}` : ''}<div class="bts">${i < 3 ? `<button class="b mini" data-a="avanca" data-id="${x.id}">${['Marcar consulta', 'Mandar proposta', 'Contratou'][i]} →</button>` : ''}<a class="b mini" target="_blank" rel="noopener" href="https://wa.me/55${x.tel}">WhatsApp</a></div></div>`).join('')}</section>`).join('')}</div>`;
  },
  horas() {
    const sem = db.horas.filter((h) => h.dia >= -6), porAdv = db.equipe.map((a) => ({ a, h: sem.filter((x) => x.adv === a.id).reduce((t, x) => t + x.h, 0) }));
    return `<div class="titulo"><div><h1>Horas</h1><p>Quanto tempo cada processo consome. Serve para cobrar por hora e para saber se o valor fechado compensa.</p></div><button class="b bordo" data-a="nova-hora">+ Lançar horas</button></div>
      <div class="grade" style="margin-bottom:14px">${porAdv.map(({ a, h }) => `<div class="ficha num c3"><small>${sx(a.nome)}</small><b>${h.toLocaleString('pt-BR')} h</b><span>nesta semana${a.hora ? ` · ${rs(h * a.hora)}` : ''}</span></div>`).join('')}</div>
      <div class="rol"><table><thead><tr><th>Dia</th><th>Quem</th><th>Processo</th><th>Atividade</th><th class="n">Horas</th><th class="n">Valor</th><th>Faturável</th></tr></thead><tbody>${[...db.horas].sort((a, b) => b.dia - a.dia).map((h) => `<tr><td>${quando(h.dia)}</td><td>${sx(pessoa(h.adv).nome)}</td><td>${sx(cliente(processo(h.proc)?.cli).nome)}</td><td>${sx(h.desc)}</td><td class="n">${h.h.toLocaleString('pt-BR')}</td><td class="n">${rs(h.h * pessoa(h.adv).hora)}</td><td><input type="checkbox" data-fatura="${h.id}" ${h.fatura ? 'checked' : ''} aria-label="Faturável"></td></tr>`).join('')}</tbody></table></div>`;
  },
  financeiro() {
    const ab = parcAberto(), atras = ab.filter(({ p }) => p.dia < 0), prox = ab.filter(({ p }) => p.dia >= 0 && p.dia <= 30);
    const meses = Array.from({ length: 6 }, (_, i) => { const a = -150 + i * 30; return { i, v: db.contratos.flatMap((c) => c.parcelas).filter((p) => p.pago && p.dia >= a && p.dia < a + 30).reduce((t, p) => t + p.v, 0) }; }), max = Math.max(...meses.map((m) => m.v), 1);
    return `<div class="titulo"><div><h1>Financeiro</h1><p>Honorários, despesas dos processos e o que cobrar.</p></div><div class="bts"><button class="b" data-a="nova-despesa">+ Despesa</button><button class="b bordo" data-a="novo-contrato">+ Contrato</button></div></div>
      <div class="grade" style="margin-bottom:14px"><div class="ficha num bordo c4"><small>Atrasado</small><b>${rs(atras.reduce((t, x) => t + x.p.v, 0))}</b><span>${atras.length} parcelas</span></div><div class="ficha num c4"><small>Entra em 30 dias</small><b>${rs(prox.reduce((t, x) => t + x.p.v, 0))}</b><span>${prox.length} parcelas</span></div><div class="ficha num c4"><small>Despesas a reembolsar</small><b>${rs(db.despesas.filter((d) => !d.reemb).reduce((t, d) => t + d.v, 0))}</b><span>cobrar dos clientes</span></div></div>
      <div class="grade"><section class="ficha c7"><h2>Para cobrar</h2><table><tbody>${[...atras, ...prox].map(({ c, p }) => `<tr><td><b>${sx(cliente(c.cli).nome)}</b><br><small>${sx(c.tipo)}</small></td><td>${quando(p.dia)}</td><td class="n">${rs(p.v)}</td><td>${p.dia < 0 ? '<span class="et v">atrasado</span>' : ''}</td><td><a class="b mini" target="_blank" rel="noopener" href="https://wa.me/55${cliente(c.cli).tel}?text=${encodeURIComponent(`Olá! Lembrete da parcela de honorários de ${rs(p.v)} com vencimento em ${quando(p.dia)}. Segue o PIX do escritório. Obrigado!`)}">Cobrar</a> <button class="b mini bordo" data-a="recebi" data-c="${c.id}" data-d="${p.dia}">Recebi</button></td></tr>`).join('')}</tbody></table></section>
      <section class="ficha c5"><h2>Recebido por mês</h2><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;align-items:end;height:160px">${meses.map((m) => `<div style="display:flex;flex-direction:column;justify-content:flex-end;height:100%;text-align:center;font-size:.72rem"><div style="height:${m.v / max * 120}px;background:${m.i === 5 ? 'var(--bordo)' : 'var(--rosa)'};border-radius:3px 3px 0 0" title="${rs(m.v)}"></div>${m.i === 5 ? 'este' : `-${5 - m.i}`}</div>`).join('')}</div>
        <h2 style="margin-top:14px">Despesas dos processos</h2><table><tbody>${db.despesas.map((d) => `<tr><td>${sx(d.desc)}<br><small>${sx(cliente(processo(d.proc)?.cli).nome)}</small></td><td class="n">${rs(d.v)}</td><td>${d.reemb ? '<span class="et ok">reembolsada</span>' : `<button class="b mini" data-a="reemb" data-id="${d.id}">Reembolsada</button>`}</td></tr>`).join('')}</tbody></table></section></div>`;
  },
  modelos() {
    const M = [['procuracao', 'Procuração ad judicia'], ['honorarios', 'Contrato de honorários'], ['notificacao', 'Notificação extrajudicial'], ['juntada', 'Petição de juntada de documentos'], ...(db.modelosProprios || []).map((m) => [`u:${m.id}`, `${m.nome} (do escritório)`])];
    return `<div class="titulo"><div><h1>Modelos de peças</h1><p>Escolha o modelo e o processo: o texto sai preenchido com os dados do cliente. Cadastre também os modelos do seu escritório.</p></div><div class="bts"><button class="b bordo" data-a="novo-modelo">+ Novo modelo</button></div></div>
      <div class="grade"><section class="ficha c4"><label class="cp">Modelo<select id="m-tipo">${M.map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label><label class="cp">Processo<select id="m-proc">${opcoesProc()}</select></label><button class="b bordo" data-a="gerar">Gerar peça</button>${(db.modelosProprios || []).length ? `<p class="vazio" style="margin-top:12px">Modelos do escritório: ${db.modelosProprios.map((m) => `<button class="b" style="margin:4px 4px 0 0" data-a="edita-modelo" data-id="${m.id}">Editar ${sx(m.nome)}</button>`).join('')}</p>` : ''}</section>
      <section class="c8"><div class="peca" id="peca">Escolha o modelo e clique em Gerar peça.</div><div class="bts" style="margin-top:8px"><button class="b" data-a="copiar-peca">Copiar texto</button><button class="b" onclick="print()">Imprimir</button></div></section></div>`;
  },
  equipe() {
    const preco = db.plano === 'pro' ? 209 : 149;
    return `<div class="titulo"><div><h1>Equipe</h1><p>Painel do dono: quem acessa, o cargo e o que cada cargo vê. Só sócios veem esta aba.</p></div><button class="b bordo" data-a="convidar">+ Convidar</button></div>
      <div class="grade"><section class="ficha c7"><table><thead><tr><th>Pessoa</th><th>Cargo</th><th class="n">Valor da hora</th><th>Acesso</th></tr></thead><tbody>${db.equipe.map((a) => `<tr><td><b>${sx(a.nome)}</b></td><td><select data-cargo="${a.id}" aria-label="Cargo">${['Sócia', 'Sócio', 'Associada', 'Associado', 'Estagiária', 'Estagiário', 'Secretária'].map((c) => `<option ${c === a.cargo ? 'selected' : ''}>${c}</option>`).join('')}</select></td><td class="n"><input data-hora="${a.id}" value="${a.hora}" style="width:80px;text-align:right" aria-label="Valor da hora"></td><td><span class="et">${sx(db.permissoes[a.cargo] || 'prazos e processos')}</span></td></tr>`).join('')}</tbody></table></section>
      <section class="ficha c5"><h2>Plano</h2><p>Assinatura · <b>${rs(preco)}/mês</b> · equipe sem limite</p><div class="bts"><button class="b ${db.plano === 'basico' ? 'bordo' : ''}" data-a="plano" data-v="basico">Assinatura · R$ 149/mês</button></div><p class="vazio">Anual com 20% a menos. Sem fidelidade. A troca é confirmada no Mercado Pago.</p>
        <h2>O que cada cargo vê</h2><table><tbody>${Object.entries({ 'Sócio(a)': 'Tudo, inclusive financeiro e equipe', 'Associado(a)': 'Processos, prazos, horas e modelos; sem financeiro', 'Estagiário(a)': 'Prazos, intimações e documentos', 'Secretária': 'Pauta, atendimentos e cobrança' }).map(([c, t]) => `<tr><td><b>${c}</b></td><td>${t}</td></tr>`).join('')}</tbody></table></section></div>`;
  },
  ajustes() {
    const a = db.ajustes;
    return `<div class="titulo"><div><h1>Ajustes</h1><p>Seus e do escritório.</p></div></div><div class="grade"><section class="ficha c6"><h2>Você</h2><label class="cp">Seu nome<input data-meu-nome value="${sx(pessoa(db.eu).nome)}"></label><label class="cp">Abrir em<select data-aj="abrir">${ABAS.slice(0, 8).map(([k, t]) => `<option value="${k}" ${a.abrir === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label class="cp">Letras<select data-aj="letra"><option value="normal" ${a.letra === 'normal' ? 'selected' : ''}>Normal</option><option value="grande" ${a.letra === 'grande' ? 'selected' : ''}>Grande</option></select></label></section>
      <section class="ficha c6"><h2>Escritório</h2><label class="cp">Nome<input data-esc="nome" value="${sx(db.esc.nome)}"></label><label class="cp">OAB da sociedade<input data-esc="oab" value="${sx(db.esc.oab)}"></label><label class="cp">Prazo interno (dias úteis antes do fatal)<select data-aj="alertaInterno">${[1, 2, 3, 5].map((n) => `<option ${a.alertaInterno == n ? 'selected' : ''}>${n}</option>`).join('')}</select></label></section></div>`;
  },
};
// modelos do escritório: o texto usa {cliente}, {processo}, {tipo}, {vara}, {parte_contraria}, {escritorio}, {oab} e {data}
const CAMPOS_MODELO = '{cliente}, {processo}, {tipo}, {vara}, {parte_contraria}, {escritorio}, {oab}, {data}';
function preencheModelo(m, p) {
  if (!m) return '';
  const c = cliente(p.cli), v = { cliente: c.nome, processo: p.cnj, tipo: p.tipo, vara: p.vara, parte_contraria: p.contra, escritorio: db.esc.nome, oab: db.esc.oab, data: new Date().toLocaleDateString('pt-BR') };
  return m.texto.replace(/\{(\w+)\}/g, (x, k) => (k in v ? v[k] || '' : x));
}
function formModelo(m) {
  ficha(m ? 'Editar modelo' : 'Novo modelo do escritório', `<label class="cp">Nome do modelo<input name="n" required value="${m ? sx(m.nome) : ''}" placeholder="Ex.: Recurso inominado"></label><label class="cp">Texto<textarea name="t" required rows="12" placeholder="Use os campos que se preenchem sozinhos: ${CAMPOS_MODELO}">${m ? sx(m.texto) : ''}</textarea></label><p class="vazio">Campos que se preenchem sozinhos: ${CAMPOS_MODELO}.</p>${m ? '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="apagar"> Apagar este modelo</label>' : ''}`, m ? 'Salvar' : 'Criar modelo', (f) => {
    db.modelosProprios = db.modelosProprios || [];
    if (m && f.get('apagar')) { db.modelosProprios = db.modelosProprios.filter((x) => x !== m); aviso('Modelo apagado.'); return; }
    if (m) Object.assign(m, { nome: String(f.get('n')).trim(), texto: String(f.get('t')) });
    else db.modelosProprios.push({ id: `mp${Date.now().toString(36)}`, nome: String(f.get('n')).trim(), texto: String(f.get('t')) });
    aviso(m ? 'Modelo salvo.' : 'Modelo criado. Ele aparece na lista de modelos.');
  });
}
const MODELOS = {
  procuracao: (p, c) => `PROCURAÇÃO AD JUDICIA\n\nOUTORGANTE: ${c.nome}.\nOUTORGADOS: ${db.equipe.filter((a) => /Sóci|Associad/.test(a.cargo)).map((a) => a.nome).join(', ')}, integrantes de ${db.esc.nome}, ${db.esc.oab}.\n\nPODERES: os da cláusula ad judicia et extra, para o foro em geral, em especial para atuar no processo nº ${p.cnj} (${p.tipo}), em trâmite perante ${p.vara}, podendo propor ações, contestar, recorrer, transigir, desistir, receber e dar quitação.\n\n${db.esc.cidade.split('/')[0]}, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.\n\n_____________________________\n${c.nome}`,
  honorarios: (p, c) => `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS\n\nCONTRATANTE: ${c.nome}.\nCONTRATADA: ${db.esc.nome}, ${db.esc.oab}.\n\nCLÁUSULA 1ª – OBJETO: atuação no processo nº ${p.cnj} (${p.tipo}) contra ${p.contra}.\nCLÁUSULA 2ª – HONORÁRIOS: conforme combinado, pagos por PIX nas datas de vencimento, sem prejuízo dos honorários de sucumbência, que pertencem à contratada (art. 23 da Lei 8.906/94).\nCLÁUSULA 3ª – DESPESAS: custas e despesas do processo correm por conta do contratante.\nCLÁUSULA 4ª – FORO: ${db.esc.cidade}.\n\n${new Date().toLocaleDateString('pt-BR')}`,
  notificacao: (p, c) => `NOTIFICAÇÃO EXTRAJUDICIAL\n\nNOTIFICANTE: ${c.nome}, por seus advogados (${db.esc.nome}).\nNOTIFICADO(A): ${p.contra}.\n\nPela presente, fica V.Sa. NOTIFICADA a, no prazo de 10 (dez) dias, regularizar a situação objeto de ${p.tipo.toLowerCase()}, sob pena de adoção das medidas judiciais cabíveis, inclusive com pedido de indenização pelos danos causados.\n\n${db.esc.cidade.split('/')[0]}, ${new Date().toLocaleDateString('pt-BR')}.`,
  juntada: (p, c) => `EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DE DIREITO DA ${p.vara.toUpperCase()}\n\nProcesso nº ${p.cnj}\n\n${c.nome}, já qualificado(a) nos autos da ${p.tipo} que move em face de ${p.contra}, vem, por seus advogados, requerer a JUNTADA dos documentos anexos, para os devidos fins.\n\nNestes termos, pede deferimento.\n\n${db.esc.cidade.split('/')[0]}, ${new Date().toLocaleDateString('pt-BR')}.\n\n${pessoa(p.resp).nome}`,
};

// ------------------------------------------------------------------ montar a tela
function abre() {
  const [s, a] = (location.hash.slice(1) || db.ajustes.abrir || 'pauta').split('/');
  const cont = { prazos: db.prazos.filter((p) => p.status === 'aberto' && uteisFaltam(p.fatal) <= 2).length, intimacoes: db.intimacoes.filter((i) => !i.tratada).length, financeiro: parcAberto().filter(({ p }) => p.dia < 0).length };
  const atual = s === 'processo' ? 'processos' : s;
  qs('#fichario').innerHTML = ABAS.map(([k, t]) => `<a href="#${k}" ${k === atual ? 'aria-current="page"' : ''}>${t}${cont[k] ? `<span class="cont">${cont[k]}</span>` : ''}</a>`).join('');
  qs('#pasta').innerHTML = (V[s] || V.pauta)(a);
  qs('#esc-nome').textContent = db.esc.nome; qs('#esc-usuario').textContent = `${pessoa(db.eu).nome} · ${pessoa(db.eu).cargo.toLowerCase()}`;
  document.documentElement.style.fontSize = db.ajustes.letra === 'grande' ? '112%' : '';
  document.title = `${(ABAS.find(([k]) => k === atual) || ['', 'Processo'])[1]} · Veltria Jurídico Completo`;
}
addEventListener('hashchange', () => { sub = 'andamentos'; abre(); qs('#pasta').focus({ preventScroll: true }); scrollTo(0, 0); });

// ------------------------------------------------------------------ IA na gaveta
function gavetaIA() {
  const g = qs('#gaveta-ia'), sug = ['O que vence nesta semana e com quem está?', 'Resuma as intimações novas', 'Quanto o escritório tem a receber?', 'Qual atendimento está mais perto de fechar?', 'Escreva a atualização do processo para a Marina'];
  g.hidden = false;
  g.innerHTML = `<header><h2>Pergunte à IA</h2><button class="b mini" data-fecha-ia aria-label="Fechar">×</button></header><div class="corpo">${(db.conversa.length ? db.conversa : [{ ia: 1, t: 'Leio a pauta, os prazos, as intimações e o financeiro do escritório. Na versão contratada, 20 perguntas grátis por dia; aqui as respostas são de exemplo.' }]).map((m) => `<div class="bal ${m.ia ? 'ela' : 'eu'}">${sx(m.t)}</div>`).join('')}<div class="atalhos">${sug.map((x) => `<button data-sug="${sx(x)}">${sx(x)}</button>`).join('')}</div></div><form id="f-ia"><input id="q-ia" placeholder="Sua pergunta" aria-label="Pergunta"><button class="b bordo">Enviar</button></form>`;
  g.querySelector('.corpo').scrollTop = 1e6; qs('#q-ia').focus();
}
function resposta(p) {
  const q = base(p), ab = db.prazos.filter((x) => x.status === 'aberto').sort((a, b) => a.fatal - b.fatal);
  if (/vence|semana|prazo/.test(q)) return ab.filter((x) => x.fatal <= 7).map((x) => `• ${x.desc} (${cliente(processo(x.proc).cli).nome}) · ${pessoa(x.resp).nome} · fatal ${quando(x.fatal)}`).join('\n') || 'Nada vence em 7 dias.';
  if (/intima/.test(q)) return db.intimacoes.filter((i) => !i.tratada).map((i) => `• ${cliente(processo(i.proc).cli).nome}: ${i.texto.slice(0, 90)}… ${i.resp ? `(com ${pessoa(i.resp).nome})` : '(sem responsável: distribua)'}`).join('\n') || 'Nenhuma intimação nova.';
  if (/receber|financ|dinheiro/.test(q)) { const a = parcAberto(); return `A receber: ${rs(a.reduce((t, x) => t + x.p.v, 0))}, sendo ${rs(a.filter(({ p: x }) => x.dia < 0).reduce((t, x) => t + x.p.v, 0))} atrasados. Mais as despesas a reembolsar: ${rs(db.despesas.filter((d) => !d.reemb).reduce((t, d) => t + d.v, 0))}.`; }
  if (/atendimento|fechar|proposta/.test(q)) { const x = db.atendimentos.filter((y) => y.etapa === 'proposta').sort((a, b) => b.valor - a.valor)[0]; return x ? `${x.nome} (${x.area}, ${rs(x.valor)}) está com a proposta. Ligue hoje: proposta sem retorno em 3 dias costuma esfriar.` : 'Nenhuma proposta aberta.'; }
  if (/atualiza|marina|cliente/.test(q)) return 'Mensagem pronta:\n\n"Olá, Marina! O banco apresentou a defesa no seu processo e agora estamos preparando a resposta (réplica), que será protocolada nos próximos dias. Seguimos confiantes. Qualquer dúvida, estou à disposição."';
  return `Hoje: ${ab.length} prazos abertos, ${db.intimacoes.filter((i) => !i.tratada).length} intimações novas e ${db.atendimentos.filter((x) => x.etapa === 'proposta').length} propostas aguardando.`;
}

// ------------------------------------------------------------------ ações
const F = {
  'novo-prazo': (d) => ficha('Novo prazo', `<label class="cp">Processo<select name="p">${opcoesProc(d.p)}</select></label><label class="cp">O que fazer<input name="d" required></label><div class="par"><label class="cp">Responsável<select name="r">${opcoesEquipe(db.eu)}</select></label><label class="cp">Dias úteis a partir de hoje<input name="n" inputmode="numeric" value="15"></label></div>`, 'Contar e salvar', (f) => { const fim = avancaUteis(zero(), Math.floor(valor(f.get('n')))); db.prazos.push({ id: gid(), proc: f.get('p'), desc: f.get('d'), resp: f.get('r'), fatal: emDias(fim), interno: emDias(avancaUteis(fim, -db.ajustes.alertaInterno)), status: 'aberto' }); aviso(`Fatal em ${fim.toLocaleDateString('pt-BR')}`); }),
  'nova-aud': () => ficha('Nova audiência', `<label class="cp">Processo<select name="p">${opcoesProc()}</select></label><div class="par"><label class="cp">Daqui a quantos dias<input name="d" type="number" value="7"></label><label class="cp">Hora<input name="h" type="time" value="14:00"></label></div><label class="cp">Tipo<input name="t" value="Conciliação"></label>`, 'Marcar', (f) => { db.audiencias.push({ id: gid(), proc: f.get('p'), dia: Number(f.get('d')), hora: f.get('h'), tipo: f.get('t') }); }),
  'novo-processo': () => ficha('Novo processo', `<div class="par"><label class="cp">Cliente<select name="c">${db.clientes.map((c) => `<option value="${c.id}">${sx(c.nome)}</option>`).join('')}</select></label><label class="cp">Responsável<select name="r">${opcoesEquipe(db.eu)}</select></label></div><label class="cp">Número CNJ<input name="n" required></label><div class="par"><label class="cp">Ação<input name="t" required></label><label class="cp">Parte contrária<input name="x"></label></div><label class="cp">Juízo<input name="v"></label>`, 'Cadastrar', (f) => { db.processos.push({ id: gid(), cnj: f.get('n'), cli: f.get('c'), resp: f.get('r'), tipo: f.get('t'), contra: f.get('x') || '—', vara: f.get('v') || '—', fase: 'Inicial', valorCausa: 0, andamentos: [{ dia: 0, texto: 'Cadastro do processo' }], docs: [] }); }),
  andamento: (d) => ficha('Novo andamento', '<label class="cp">O que aconteceu<textarea name="t" required></textarea></label>', 'Salvar', (f) => { processo(d.p).andamentos.unshift({ dia: 0, texto: f.get('t') }); }),
  protocolar: (d) => { db.prazos.find((x) => x.id === d.id).status = 'protocolado'; guarda(); abre(); aviso('Prazo cumprido e protocolado.'); },
  'prazo-int': (d) => { const i = db.intimacoes.find((x) => x.id === d.id); F['novo-prazo']({ p: i.proc }); },
  tratar: (d) => { db.intimacoes.find((x) => x.id === d.id).tratada = true; guarda(); abre(); },
  'novo-atend': () => ficha('Novo atendimento', '<div class="par"><label class="cp">Nome<input name="n" required></label><label class="cp">WhatsApp<input name="t" required></label></div><div class="par"><label class="cp">Área<input name="a" value="Cível"></label><label class="cp">Como chegou<select name="o"><option>Indicação</option><option>Instagram</option><option>Google</option><option>Site</option></select></label></div>', 'Salvar', (f) => { db.atendimentos.push({ id: gid(), nome: f.get('n'), tel: String(f.get('t')).replace(/\D/g, ''), area: f.get('a'), origem: f.get('o'), etapa: 'contato', valor: 0 }); }),
  avanca: (d) => { const x = db.atendimentos.find((y) => y.id === d.id), ordem = ['contato', 'consulta', 'proposta', 'contratado']; const prox = ordem[ordem.indexOf(x.etapa) + 1];
    if (prox === 'proposta') return ficha(`Proposta para ${sx(x.nome)}`, '<label class="cp">Valor dos honorários (R$)<input name="v" inputmode="decimal" required></label>', 'Registrar proposta', (f) => { x.valor = valor(f.get('v')); x.etapa = 'proposta'; });
    x.etapa = prox; if (prox === 'contratado' && !db.clientes.some((c) => c.nome === x.nome)) db.clientes.push({ id: gid(), nome: x.nome, tel: x.tel }); guarda(); abre(); aviso(prox === 'contratado' ? `${x.nome} virou cliente.` : 'Atendimento avançou.'); },
  'nova-hora': () => ficha('Lançar horas', `<div class="par"><label class="cp">Quem<select name="a">${opcoesEquipe(db.eu)}</select></label><label class="cp">Horas<input name="h" inputmode="decimal" value="1"></label></div><label class="cp">Processo<select name="p">${opcoesProc()}</select></label><label class="cp">Atividade<input name="d" required></label>`, 'Lançar', (f) => { db.horas.push({ id: gid(), dia: 0, adv: f.get('a'), proc: f.get('p'), h: valor(f.get('h')), desc: f.get('d'), fatura: true }); }),
  recebi: (d) => { const c = db.contratos.find((x) => x.id === d.c), p = c.parcelas.find((x) => x.dia === Number(d.d) && !x.pago); p.pago = true; guarda(); abre(); aviso(`${rs(p.v)} recebidos.`); },
  reemb: (d) => { db.despesas.find((x) => x.id === d.id).reemb = true; guarda(); abre(); },
  'nova-despesa': () => ficha('Despesa do processo', `<label class="cp">Processo<select name="p">${opcoesProc()}</select></label><div class="par"><label class="cp">Descrição<input name="d" required></label><label class="cp">Valor (R$)<input name="v" inputmode="decimal" required></label></div>`, 'Lançar', (f) => { db.despesas.push({ id: gid(), proc: f.get('p'), desc: f.get('d'), v: valor(f.get('v')), reemb: false }); }),
  'novo-contrato': () => ficha('Contrato de honorários', `<label class="cp">Processo<select name="p">${opcoesProc()}</select></label><label class="cp">Tipo<input name="t" value="Parcelado"></label><div class="par"><label class="cp">Parcelas<input name="n" type="number" value="3"></label><label class="cp">Valor de cada<input name="v" inputmode="decimal" required></label></div>`, 'Salvar', (f) => { const p = processo(f.get('p')); db.contratos.push({ id: gid(), cli: p.cli, proc: p.id, tipo: f.get('t'), parcelas: Array.from({ length: Number(f.get('n')) || 1 }, (_, i) => ({ dia: 10 + i * 30, v: valor(f.get('v')), pago: false })) }); }),
  gerar: () => { const p = processo(qs('#m-proc').value), t = qs('#m-tipo').value; if (!p.id) return aviso('Cadastre um processo primeiro.'); qs('#peca').textContent = t.startsWith('u:') ? preencheModelo((db.modelosProprios || []).find((m) => `u:${m.id}` === t), p) : MODELOS[t](p, cliente(p.cli)); aviso('Peça gerada com os dados do processo.'); },
  'novo-modelo': () => formModelo(),
  'edita-modelo': (d) => formModelo((db.modelosProprios || []).find((m) => m.id === d.id)),
  'copiar-peca': () => { navigator.clipboard?.writeText(qs('#peca').textContent).catch(() => {}); aviso('Texto copiado.'); },
  portal: (d) => { const p = processo(d.p), c = cliente(p.cli); janela(`<h2>Portal do cliente</h2><p class="vazio">Assim ${sx(c.nome.split(' ')[0])} vê o processo pelo link, sem senha e sem juridiquês:</p><div class="ficha"><b>${sx(p.tipo)}</b><p>Fase atual: <span class="et b">${sx(p.fase)}</span></p><ol class="linha-tempo">${p.andamentos.slice(0, 4).map((a) => `<li><time>${quando(a.dia)}</time><div>${sx(a.texto)}</div></li>`).join('')}</ol><p class="vazio">Próxima audiência: ${(() => { const a = db.audiencias.find((x) => x.proc === p.id && x.dia >= 0); return a ? `${quando(a.dia)} às ${a.hora}` : 'nenhuma marcada'; })()}</p></div><div class="pe"><button class="b" data-fecha>Fechar</button><a class="b bordo" target="_blank" rel="noopener" href="https://wa.me/55${c.tel}?text=${encodeURIComponent(`Olá! Acompanhe o seu processo por este link: https://bluerose-store.com/p/${p.id}`)}">Mandar o link</a></div>`); },
  convidar: () => { ficha('Convidar para o escritório', '<div class="par"><label class="cp">Nome<input name="n" required></label><label class="cp">E-mail<input name="e" type="email" required></label></div><label class="cp">Cargo<select name="c"><option>Associada</option><option>Associado</option><option>Estagiária</option><option>Estagiário</option><option>Secretária</option></select></label>', 'Enviar convite', (f) => { db.equipe.push({ id: gid(), nome: f.get('n'), cargo: f.get('c'), hora: /Associad/.test(f.get('c')) ? 300 : 0 }); aviso(`Convite enviado para ${f.get('e')}.`); }); },
  plano: (d) => { db.plano = d.v; guarda(); abre(); },
};

document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-ia]')) { gavetaIA(); return; }
  if (t.closest('[data-fecha-ia]')) { qs('#gaveta-ia').hidden = true; return; }
  const sg = t.closest('[data-sug]'); if (sg) { qs('#q-ia').value = sg.dataset.sug; qs('#f-ia').requestSubmit(); return; }
  const ab = t.closest('[data-abre]'); if (ab) { location.hash = `#processo/${ab.dataset.abre}`; return; }
  const sb = t.closest('[data-sub]'); if (sb) { sub = sb.dataset.sub; abre(); return; }
  const a = t.closest('[data-a]'); if (a && F[a.dataset.a]) F[a.dataset.a](a.dataset);
});
document.addEventListener('submit', (e) => { if (e.target.id !== 'f-ia') return; e.preventDefault(); const p = qs('#q-ia').value.trim(); if (p.length < 3) return; const resp = { ia: 1, t: window.veltriaIA ? 'Pensando…' : `${resposta(p)}\n\n(Exemplo da demonstração.)` }; db.conversa.push({ t: p }, resp); db.conversa = db.conversa.slice(-10); guarda(); gavetaIA(); if (window.veltriaIA) window.veltriaIA(p).then((t) => { resp.t = t; guarda(); gavetaIA(); }); });
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.resp) { db.prazos.find((x) => x.id === t.dataset.resp).resp = t.value; guarda(); aviso('Responsável trocado.'); }
  if (t.dataset.intResp !== undefined && t.dataset.intResp) { const i = db.intimacoes.find((x) => x.id === t.dataset.intResp); i.resp = t.value; guarda(); abre(); aviso(t.value ? `Distribuída para ${pessoa(t.value).nome}.` : 'Sem responsável.'); }
  if (t.dataset.fatura) { db.horas.find((x) => x.id === t.dataset.fatura).fatura = t.checked; guarda(); }
  if (t.dataset.cargo) { db.equipe.find((x) => x.id === t.dataset.cargo).cargo = t.value; guarda(); abre(); }
  if (t.dataset.hora) { db.equipe.find((x) => x.id === t.dataset.hora).hora = valor(t.value); guarda(); }
  if (t.dataset.aj) { db.ajustes[t.dataset.aj] = t.dataset.aj === 'alertaInterno' ? Number(t.value) : t.value; guarda(); abre(); }
  if (t.dataset.anexo && t.files[0]) { processo(t.dataset.anexo).docs.push(t.files[0].name); guarda(); abre(); aviso('Documento anexado.'); }
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'procura') { if (!location.hash.startsWith('#processos')) location.hash = '#processos'; else abre(); setTimeout(() => qs('#procura').focus(), 0); }
  if (t.dataset.esc) { db.esc[t.dataset.esc] = t.value; guarda(); qs('#esc-nome').textContent = db.esc.nome; }
  if (t.dataset.meuNome !== undefined) { pessoa(db.eu).nome = t.value; guarda(); qs('#esc-usuario').textContent = `${t.value} · ${pessoa(db.eu).cargo.toLowerCase()}`; }
});
qs('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = escritorio(); location.hash = '#pauta'; abre(); aviso('Demonstração recomeçada.'); });
abre();
