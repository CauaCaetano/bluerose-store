// Veltria Jurídico Essencial · app de celular do advogado autônomo: "contagem dos prazos".
// Cada prazo mostra quantos dias ÚTEIS faltam (pula fins de semana, feriados nacionais e o recesso de 20/12 a 20/01, art. 220 do CPC).
// Intimações com explicação em linguagem simples, processos, honorários com cobrança no WhatsApp, audiências,
// calculadora de prazos, assistente, painel do dono, configurações e assinatura dentro do app.
// Dados de exemplo neste aparelho (?novo recomeça).

const CHAVE = 'veltria-juridico-essencial-v1';
const din = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const h = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nm = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const novo = () => Math.random().toString(36).slice(2, 9);
const el = (s) => document.querySelector(s);

// ------------------------------------------------------------------ dias úteis (forense)
const FERIADOS = new Set(['2026-01-01', '2026-02-16', '2026-02-17', '2026-04-03', '2026-04-21', '2026-05-01', '2026-06-04', '2026-09-07', '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25',
  '2027-01-01', '2027-02-08', '2027-02-09', '2027-03-26', '2027-04-21', '2027-05-01', '2027-05-27', '2027-09-07', '2027-10-12', '2027-11-02', '2027-11-15', '2027-11-20', '2027-12-25']);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const deIso = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); };
const hoje = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const recesso = (d) => { const m = d.getMonth() + 1, dia = d.getDate(); return (m === 12 && dia >= 20) || (m === 1 && dia <= 20); };
const util = (d) => d.getDay() !== 0 && d.getDay() !== 6 && !FERIADOS.has(iso(d)) && !recesso(d);
// art. 224 do CPC: exclui o dia do começo e inclui o do vencimento; só conta dia útil
function somarUteis(inicio, n) { const d = new Date(inicio); let c = 0; while (c < n) { d.setDate(d.getDate() + 1); if (util(d)) c++; } return d; }
function uteisAte(dataIso) { const fim = deIso(dataIso), d = hoje(); if (fim <= d) return iso(fim) === iso(d) ? 0 : -1; let c = 0; while (d < fim) { d.setDate(d.getDate() + 1); if (util(d)) c++; } return c; }
const dataBr = (s) => deIso(s).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '').replace('.', '');
const diaRel = (off) => { const d = hoje(); d.setDate(d.getDate() + off); return iso(d); };

// ------------------------------------------------------------------ dados de exemplo
function exemplo() {
  const clientes = [['k1', 'Marina Duarte', '31988001122'], ['k2', 'José Roberto Antunes', '31991117788'], ['k3', 'Padaria Doce Lar Ltda', '31932224455'], ['k4', 'Fernanda e Caio Lopes', '31997773344'], ['k5', 'Antônio Reis (espólio)', '31986669900']].map(([id, nome, tel]) => ({ id, nome, tel }));
  const processos = [
    { id: 'p1', cnj: '5012447-38.2026.8.13.0024', cli: 'k1', contra: 'Banco Horizonte S.A.', vara: '14ª Vara Cível de BH', tipo: 'Revisional de contrato', fase: 'Instrução', valor: 48300 },
    { id: 'p2', cnj: '0010922-61.2026.5.03.0011', cli: 'k2', contra: 'Transportadora Rota Sul Ltda', vara: '11ª Vara do Trabalho de BH', tipo: 'Reclamação trabalhista', fase: 'Sentença publicada', valor: 86200 },
    { id: 'p3', cnj: '5033810-12.2025.8.13.0024', cli: 'k3', contra: 'Município de Belo Horizonte', vara: '2ª Vara da Fazenda Pública', tipo: 'Anulatória de multa', fase: 'Aguardando contestação', valor: 12700 },
    { id: 'p4', cnj: '5101227-90.2026.8.13.0024', cli: 'k4', contra: 'Construtora Altos do Vale', vara: '3º JESP Cível de BH', tipo: 'Indenização por vício na obra', fase: 'Audiência de conciliação', valor: 31000 },
    { id: 'p5', cnj: '5008415-44.2026.8.13.0024', cli: 'k5', contra: '—', vara: '1ª Vara de Sucessões de BH', tipo: 'Inventário', fase: 'Primeiras declarações', valor: 640000 },
  ];
  const H = hoje(), pr = (proc, desc, uteis, feito = false) => ({ id: novo(), proc, desc, fatal: iso(somarUteis(H, uteis)), feito });
  const prazos = [pr('p2', 'Recurso ordinário contra a sentença', 1), pr('p1', 'Réplica à contestação do banco', 3), pr('p4', 'Juntar fotos e laudo antes da audiência', 5), pr('p5', 'Apresentar primeiras declarações', 9), pr('p3', 'Manifestar sobre documentos do Município', 12), pr('p1', 'Especificar provas', 0, true)];
  const intimacoes = [
    { id: novo(), proc: 'p2', dia: diaRel(-1), lida: false, tipo: 'sentenca', texto: 'Intimem-se as partes da r. sentença de ID 4471230, que julgou PARCIALMENTE PROCEDENTES os pedidos, condenando a reclamada ao pagamento de horas extras e reflexos, nos termos da fundamentação. Custas pela reclamada, no importe de R$ 860,00, calculadas sobre o valor provisoriamente arbitrado à condenação de R$ 43.000,00.' },
    { id: novo(), proc: 'p1', dia: diaRel(-2), lida: false, tipo: 'replica', texto: 'Vista à parte autora para, querendo, manifestar-se acerca da contestação e documentos de ID 9921145, no prazo legal (art. 350 e 351 do CPC).' },
    { id: novo(), proc: 'p4', dia: diaRel(-4), lida: true, tipo: 'audiencia', texto: 'Designo audiência de conciliação para o dia indicado no sistema, às 14h, a ser realizada por videoconferência. Intimem-se as partes, advertindo-as de que o não comparecimento injustificado é considerado ato atentatório à dignidade da justiça (art. 334, § 8º, CPC).' },
  ];
  const audiencias = [{ id: novo(), proc: 'p4', dia: diaRel(6), hora: '14:00', tipo: 'Conciliação', local: 'Videoconferência (link no processo)' }, { id: novo(), proc: 'p1', dia: diaRel(19), hora: '09:30', tipo: 'Instrução e julgamento', local: '14ª Vara Cível · sala 3' }];
  const parc = (n, valor, primeira, pagas) => Array.from({ length: n }, (_, i) => ({ venc: diaRel(primeira + i * 30), valor, pago: i < pagas }));
  const honorarios = [
    { id: novo(), cli: 'k1', proc: 'p1', desc: 'Revisional · contrato de honorários', exito: 20, parcelas: parc(6, 900, -95, 3) },
    { id: novo(), cli: 'k2', proc: 'p2', desc: 'Trabalhista · 30% do êxito + entrada', exito: 30, parcelas: parc(1, 1500, -60, 1) },
    { id: novo(), cli: 'k3', proc: 'p3', desc: 'Anulatória · valor fechado', exito: 0, parcelas: parc(4, 1250, -70, 2) },
    { id: novo(), cli: 'k5', proc: 'p5', desc: 'Inventário · 4% do monte', exito: 4, parcelas: parc(10, 2000, -15, 1) },
  ];
  return { eu: { nome: 'Dra. Luana Ferraz', oab: 'OAB/MG 187.204', antecedencia: 3, letra: 'normal', assinaturaZap: 'Luana Ferraz · Advocacia' }, clientes, processos, prazos, intimacoes, audiencias, honorarios,
    equipe: [{ id: 'e1', nome: 'Bruna (estagiária)', pode: { prazos: true, honorarios: false, intimacoes: true } }, { id: 'e2', nome: 'Sílvia (secretária)', pode: { prazos: false, honorarios: true, intimacoes: false } }],
    plano: 'basico', assinatura: assinaturaInicial(), conversa: [] };
}
function assinaturaInicial() { return { valor: 89, status: 'ativa', renova: true, proxima: diaRel(14), cobrancas: [{ dia: diaRel(-16), ok: true }, { dia: diaRel(-46), ok: true }] }; }
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || exemplo(); } catch { return exemplo(); } })();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { recado('Sem espaço no aparelho.'); } };
const cli = (id) => db.clientes.find((c) => c.id === id) || { nome: '—', tel: '' };
// processo apagado ou não escolhido: um vazio no lugar, para a tela não quebrar
const proc = (id) => db.processos.find((p) => p.id === id) || { id: '', cli: '', cnj: '—', tipo: '', vara: '', contra: '', fase: '', andamentos: [], docs: [] };
const zap = (tel, t) => `https://wa.me/55${String(tel).replace(/\D/g, '')}?text=${encodeURIComponent(t)}`;
const parcelasEmAberto = () => db.honorarios.flatMap((c) => c.parcelas.filter((p) => !p.pago).map((p) => ({ c, p })));

function recado(t) { const d = document.createElement('div'); d.className = 'recado'; d.textContent = t; el('#recados').append(d); setTimeout(() => d.remove(), 3200); }
function folha(html, depois) {
  const v = document.createElement('div'); v.className = 'veu'; v.innerHTML = `<div class="folha" role="dialog" aria-modal="true">${html}</div>`;
  const antes = document.activeElement; document.body.append(v);
  const fechar = () => { v.remove(); antes?.focus?.(); };
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-fechar]')) fechar(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });
  setTimeout(() => (v.querySelector('input, select, textarea, button') || v).focus(), 40);
  depois?.(v.querySelector('.folha'), fechar);
}
function formulario(titulo, campos, ok, salvarForm) {
  folha(`<h2>${titulo}</h2><form>${campos}<div class="linha-bts"><button class="bt cheio">${ok}</button><button type="button" class="bt" data-fechar>Cancelar</button></div></form>`, (f, fechar) => {
    f.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); if (salvarForm(new FormData(e.target)) !== false) { salvar(); fechar(); mostrar(); } });
  });
}
function cartaoPrazo(p) {
  const n = p.feito ? null : uteisAte(p.fatal), cls = p.feito ? 'feito' : n <= 1 ? 'vermelho' : n <= db.eu.antecedencia + 2 ? 'ouro' : '', pr = proc(p.proc);
  return `<div class="prazo ${cls}"><div class="dias">${p.feito ? '<b>✓</b><small>feito</small>' : n < 0 ? '<b>!</b><small>vencido</small>' : n === 0 ? '<b>Hoje</b><small>vence</small>' : `<b>${n}</b><small>${n === 1 ? 'dia útil' : 'dias úteis'}</small>`}</div>
    <a href="#processo/${p.proc}" style="text-decoration:none;color:inherit;padding-right:52px"><b class="t">${h(p.desc)}</b><span class="s">${h(cli(pr?.cli).nome)} · vence ${dataBr(p.fatal)}</span></a>
    <button type="button" class="feito-bt" data-acao="feito" data-id="${p.id}">${p.feito ? 'desfazer' : 'feito'}</button></div>`;
}

// ------------------------------------------------------------------ telas
let filtro = 'abertos';
const T = {
  prazos() {
    const ab = db.prazos.filter((p) => !p.feito).sort((a, b) => a.fatal.localeCompare(b.fatal)), urg = ab.filter((p) => uteisAte(p.fatal) <= 1);
    const l = filtro === 'feitos' ? db.prazos.filter((p) => p.feito) : filtro === 'semana' ? ab.filter((p) => uteisAte(p.fatal) <= 5) : ab;
    return `<h1>${urg.length ? `${urg.length} ${urg.length === 1 ? 'prazo vence' : 'prazos vencem'} até amanhã` : 'Nenhum prazo apertado'}</h1><p class="sub">Contagem em dias úteis, já sem fins de semana, feriados e recesso forense.</p>
      <div class="faixa-dia" role="group" aria-label="Mostrar">${[['abertos', `Abertos (${ab.length})`], ['semana', 'Próximos 5 dias úteis'], ['feitos', 'Feitos']].map(([k, t]) => `<button type="button" data-filtro="${k}" aria-pressed="${filtro === k}">${t}</button>`).join('')}</div>
      <div class="contagem">${l.map(cartaoPrazo).join('') || '<p class="vazio">Nada aqui.</p>'}</div>
      <p style="margin-top:14px"><button type="button" class="bt cheio largo" data-acao="novo-prazo">+ Prazo</button></p>`;
  },
  intimacoes() {
    const l = [...db.intimacoes].sort((a, b) => b.dia.localeCompare(a.dia)), novas = l.filter((i) => !i.lida).length;
    return `<h1>Intimações</h1><p class="sub">${novas ? `${novas} novas. ` : ''}Na versão contratada elas chegam sozinhas do Diário de Justiça Eletrônico pelo seu número da OAB.</p>
      ${l.map((i) => `<article class="cartao ${i.lida ? '' : 'nova'}"><div style="display:flex;justify-content:space-between;gap:8px"><b>${h(cli(proc(i.proc)?.cli).nome)}</b><span class="etiq ${i.lida ? '' : 'ouro'}">${i.lida ? 'lida' : 'nova'}</span></div>
        <span class="mini">${h(proc(i.proc)?.cnj)} · ${dataBr(i.dia)}</span><div class="juridiques">${h(i.texto)}</div><div data-simples="${i.id}"></div>
        <div class="linha-bts"><button type="button" class="bt peq ouro" data-acao="explicar" data-id="${i.id}">Explicar em português simples</button><button type="button" class="bt peq" data-acao="prazo-da-int" data-id="${i.id}">Criar prazo</button>${i.lida ? '' : `<button type="button" class="bt peq" data-acao="lida" data-id="${i.id}">Marcar lida</button>`}</div></article>`).join('')}`;
  },
  processos() {
    return `<h1>Processos</h1><p class="sub">${db.processos.length} em andamento.</p><ul class="lista">${db.processos.map((p) => { const pz = db.prazos.filter((x) => x.proc === p.id && !x.feito).sort((a, b) => a.fatal.localeCompare(b.fatal))[0];
      return `<li><a class="cresce" href="#processo/${p.id}"><b>${h(cli(p.cli).nome)}</b><small>${h(p.tipo)} · ${h(p.fase)}</small></a>${pz ? `<span class="etiq ${uteisAte(pz.fatal) <= 1 ? 'verm' : 'ouro'}">${uteisAte(pz.fatal)} d.ú.</span>` : ''}</li>`; }).join('')}</ul>
      <p style="margin-top:12px"><button type="button" class="bt cheio largo" data-acao="novo-processo">+ Processo</button></p>`;
  },
  processo(id) {
    const p = proc(id); if (!p.id) return T.processos(); const c = cli(p.cli);
    const pz = db.prazos.filter((x) => x.proc === id).sort((a, b) => a.feito - b.feito || a.fatal.localeCompare(b.fatal)), au = db.audiencias.filter((a) => a.proc === id), hn = db.honorarios.filter((x) => x.proc === id);
    return `<a href="#processos">← Processos</a><h1>${h(c.nome)}</h1><p class="sub">${h(p.tipo)} contra ${h(p.contra)}</p>
      <div class="cartao escuro"><span class="mini">Número (CNJ)</span><div style="font-family:ui-monospace,monospace;font-size:.95rem">${h(p.cnj)}</div><div class="mini" style="margin-top:6px">${h(p.vara)} · valor da causa ${din(p.valor)}</div><div class="mini">Fase: <b style="color:var(--ouro)">${h(p.fase)}</b></div></div>
      <div class="linha-bts"><a class="bt peq ouro" target="_blank" rel="noopener" href="${zap(c.tel, `Olá, ${c.nome.split(' ')[0]}! Novidade no seu processo: ${p.fase}. Qualquer dúvida, me chame. ${db.eu.assinaturaZap}`)}">Avisar o cliente</a><button type="button" class="bt peq" data-acao="mudar-fase" data-id="${id}">Mudar fase</button></div>
      <h2>Prazos</h2><div class="contagem">${pz.map(cartaoPrazo).join('') || '<p class="vazio">Sem prazos.</p>'}</div>
      <h2>Audiências</h2><ul class="lista">${au.map((a) => `<li><div class="cresce"><b>${h(a.tipo)} · ${dataBr(a.dia)} às ${a.hora}</b><small>${h(a.local)}</small></div></li>`).join('') || '<li class="vazio">Nenhuma marcada.</li>'}</ul>
      <h2>Honorários</h2><ul class="lista">${hn.map((x) => `<li><div class="cresce"><b>${h(x.desc)}</b><small>${x.parcelas.filter((y) => y.pago).length} de ${x.parcelas.length} parcelas pagas${x.exito ? ` · êxito ${x.exito}%` : ''}</small></div></li>`).join('') || '<li class="vazio">Sem contrato.</li>'}</ul>`;
  },
  honorarios() {
    const ab = parcelasEmAberto(), atras = ab.filter(({ p }) => p.venc < iso(hoje())), mes = ab.filter(({ p }) => p.venc >= iso(hoje()) && p.venc <= diaRel(30));
    const recebido = db.honorarios.flatMap((c) => c.parcelas).filter((p) => p.pago && p.venc >= diaRel(-30)).reduce((t, p) => t + p.valor, 0);
    return `<h1>Honorários</h1><p class="sub">O que entra nos próximos 30 dias e quem está atrasado.</p>
      <div class="numeros"><div class="escuro"><small>Atrasado</small><b>${din(atras.reduce((t, x) => t + x.p.valor, 0))}</b></div><div><small>Próximos 30 dias</small><b>${din(mes.reduce((t, x) => t + x.p.valor, 0))}</b></div><div><small>Recebido (30 dias)</small><b>${din(recebido)}</b></div><div><small>Contratos ativos</small><b>${db.honorarios.length}</b></div></div>
      <h2>Para cobrar</h2><ul class="lista">${[...atras, ...mes].map(({ c, p }) => `<li><div class="cresce"><b>${h(cli(c.cli).nome)}</b><small>${din(p.valor)} · vence ${dataBr(p.venc)}</small></div>${p.venc < iso(hoje()) ? '<span class="etiq verm">atrasada</span>' : ''}<a class="bt peq" target="_blank" rel="noopener" href="${zap(cli(c.cli).tel, `Olá, ${cli(c.cli).nome.split(' ')[0]}! Lembrete da parcela de honorários de ${din(p.valor)} (vencimento ${dataBr(p.venc)}). Pode pagar por PIX. Obrigada! ${db.eu.assinaturaZap}`)}">Lembrar</a><button type="button" class="bt peq cheio" data-acao="pago" data-c="${c.id}" data-v="${p.venc}">Pago</button></li>`).join('') || '<li class="vazio">Nada para cobrar.</li>'}</ul>
      <p style="margin-top:12px"><button type="button" class="bt cheio largo" data-acao="novo-contrato">+ Contrato de honorários</button></p>`;
  },
  mais() {
    const it = [['agenda', 'Audiências', `${db.audiencias.length} marcadas`], ['clientes', 'Clientes', `${db.clientes.length} cadastrados`], ['calculadora', 'Calculadora de prazos', 'dias úteis, feriados e recesso'], ['ia', 'Assistente', 'pergunte sobre seus prazos e peça textos'], ['assinatura', 'Minha assinatura', estadoAss()], ['dono', 'Painel do dono', 'estagiária, secretária e o que cada uma vê'], ['config', 'Configurações', 'seu nome, OAB, avisos e letras']];
    return `<h1>Mais</h1><ul class="lista">${it.map(([k, t, s]) => `<li><a class="cresce" href="#${k}"><b>${t}</b><small>${h(s)}</small></a><span aria-hidden="true">›</span></li>`).join('')}</ul>`;
  },
  agenda() {
    return `<a href="#mais">← Mais</a><h1>Audiências</h1><ul class="lista">${[...db.audiencias].sort((a, b) => a.dia.localeCompare(b.dia)).map((a) => `<li><div class="cresce"><b>${dataBr(a.dia)} às ${a.hora} · ${h(a.tipo)}</b><small>${h(cli(proc(a.proc)?.cli).nome)} · ${h(a.local)}</small></div><a class="bt peq" target="_blank" rel="noopener" href="${zap(cli(proc(a.proc)?.cli).tel, `Olá! Lembrete: audiência de ${a.tipo.toLowerCase()} em ${dataBr(a.dia)} às ${a.hora} (${a.local}). Chegue 15 minutos antes, com documento com foto.`)}">Avisar cliente</a></li>`).join('')}</ul>
      <p style="margin-top:12px"><button type="button" class="bt cheio largo" data-acao="nova-aud">+ Audiência</button></p>`;
  },
  clientes() {
    return `<a href="#mais">← Mais</a><h1>Clientes</h1><ul class="lista">${db.clientes.map((c) => `<li><div class="cresce"><b>${h(c.nome)}</b><small>${db.processos.filter((p) => p.cli === c.id).length} processo(s)</small></div><a class="bt peq" target="_blank" rel="noopener" href="${zap(c.tel, `Olá, ${c.nome.split(' ')[0]}!`)}">WhatsApp</a></li>`).join('')}</ul>
      <p style="margin-top:12px"><button type="button" class="bt cheio largo" data-acao="novo-cliente">+ Cliente</button></p>`;
  },
  calculadora() {
    return `<a href="#mais">← Mais</a><h1>Calculadora de prazos</h1><p class="sub">Conta como o CPC: começa no primeiro dia útil depois da intimação e só conta dias úteis.</p>
      <div class="dupla"><label class="campo">Intimado em<input type="date" id="c-ini" value="${iso(hoje())}"></label><label class="campo">Prazo (dias úteis)<input id="c-n" inputmode="numeric" value="15"></label></div>
      <div class="chips">${[['5', 'Embargos de declaração'], ['15', 'Contestação, apelação, réplica'], ['8', 'Recurso ordinário (CLT)'], ['30', 'Fazenda Pública (em dobro)']].map(([n, t]) => `<button type="button" data-dias="${n}">${t} · ${n}</button>`).join('')}</div>
      <div class="calc-res" id="c-res"></div>`;
  },
  ia() {
    const sug = ['O que eu faço primeiro hoje?', 'Quem está atrasado nos honorários?', 'Explique a última intimação para o cliente', 'Escreva uma mensagem de cobrança gentil', 'Quantos dias úteis até o fim do mês?'];
    return `<h1>Assistente</h1><p class="sub">Ele vê os seus prazos, intimações e honorários (nunca documentos dos clientes). Na versão contratada: 20 perguntas grátis por dia. Aqui as respostas são de exemplo.</p>
      <div class="conversa">${(db.conversa.length ? db.conversa : [{ ela: true, t: 'Olá, doutora! Posso dizer o que fazer primeiro, explicar intimações ou escrever mensagens para os clientes.' }]).map((m) => `<div class="fala ${m.ela ? 'ela' : 'eu'}">${h(m.t)}</div>`).join('')}</div>
      <div class="chips">${sug.map((s) => `<button type="button" data-sug="${h(s)}">${h(s)}</button>`).join('')}</div>
      <form id="f-ia" class="dupla" style="grid-template-columns:1fr auto"><input class="campo" id="q-ia" style="margin:0;min-height:46px;border:1px solid var(--linho);border-radius:12px;padding:0 12px" placeholder="Sua pergunta" aria-label="Sua pergunta"><button class="bt cheio">Enviar</button></form>`;
  },
  assinatura() {
    const a = db.assinatura;
    const topo = a.status === 'vencida' ? `<div class="cartao" style="border-color:var(--urgente)"><b style="color:var(--urgente)">Assinatura vencida</b><p class="sub" style="margin:4px 0 0">A cobrança de ${din(a.valor)} não foi aprovada. Seus processos e prazos estão guardados.</p></div>`
      : a.renova ? `<div class="cartao escuro"><span class="mini">Assinatura ativa</span><div style="font:700 1.5rem var(--serif)">Assinatura · ${din(a.valor)}/mês</div><span class="mini">próxima cobrança ${dataBr(a.proxima)}, no cartão</span></div>`
      : `<div class="cartao"><b>Assinatura cancelada</b><p class="sub" style="margin:4px 0 0">Você usa o app até ${dataBr(a.proxima)}. Nada mais será cobrado.</p></div>`;
    return `<a href="#mais">← Mais</a><h1>Minha assinatura</h1><p class="sub">É a mesma assinatura da sua conta no site. Sem fidelidade.</p>${topo}
      <div class="linha-bts">${a.status === 'vencida' ? '<button type="button" class="bt ouro" data-acao="pagar-ass">Pagar aqui no app</button><a class="bt" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a>'
        : a.renova ? '<a class="bt peq" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Trocar cartão ou plano</a><button type="button" class="bt peq" data-acao="cancelar-ass">Cancelar assinatura</button>' : '<button type="button" class="bt cheio" data-acao="reativar">Reativar</button>'}</div>
      <h2>Cobranças</h2><ul class="lista">${[...a.cobrancas].sort((x, y) => y.dia.localeCompare(x.dia)).map((c) => `<li><div class="cresce"><b>${din(a.valor)}</b><small>${dataBr(c.dia)}</small></div><span class="etiq ${c.ok ? 'ok' : 'verm'}">${c.ok ? 'paga' : 'recusada'}</span></li>`).join('')}</ul>`;
  },
  dono() {
    const PODE = [['prazos', 'Criar e marcar prazos'], ['intimacoes', 'Ver intimações'], ['honorarios', 'Ver honorários e cobrar']];
    return `<a href="#mais">← Mais</a><h1>Painel do dono</h1><p class="sub">Quem trabalha com você entra pelo celular dela e só vê o que você liberar.</p>
      <div class="numeros"><div class="escuro"><small>Plano</small><b>Assinatura</b></div><div><small>Equipe</small><b>${db.equipe.length + 1} pessoas</b></div></div>
      ${db.equipe.map((p) => `<div class="cartao"><div style="display:flex;justify-content:space-between;align-items:center"><b>${h(p.nome)}</b><button type="button" class="bt peq" data-acao="tirar" data-id="${p.id}">Tirar</button></div>${PODE.map(([k, t]) => `<label style="display:flex;gap:10px;align-items:center;margin-top:8px"><input type="checkbox" data-pode="${p.id}:${k}" ${p.pode[k] ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--marinho)">${t}</label>`).join('')}</div>`).join('')}
      <p><button type="button" class="bt cheio largo" data-acao="convidar">+ Chamar alguém</button></p>
      <h2>Plano</h2><div class="linha-bts"><button type="button" class="bt ${db.plano === 'basico' ? 'cheio' : ''}" data-acao="plano" data-v="basico">Assinatura · R$ 89/mês</button></div><p class="mini">Equipe sem limite, histórico de quem fez o quê e até 10 empresas. Anual com 20% a menos.</p>`;
  },
  config() {
    const e = db.eu;
    return `<a href="#mais">← Mais</a><h1>Configurações</h1><label class="campo">Seu nome<input data-eu="nome" value="${h(e.nome)}"></label><label class="campo">OAB<input data-eu="oab" value="${h(e.oab)}"><small class="mini">As intimações do Diário de Justiça chegam por este número.</small></label>
      <label class="campo">Avisar prazo com antecedência de<select data-eu="antecedencia">${[1, 2, 3, 5].map((n) => `<option value="${n}" ${e.antecedencia == n ? 'selected' : ''}>${n} dia${n > 1 ? 's' : ''} útil${n > 1 ? 'eis' : ''}</option>`).join('')}</select></label>
      <label class="campo">Assinatura das mensagens<input data-eu="assinaturaZap" value="${h(e.assinaturaZap)}"></label>
      <label class="campo">Tamanho das letras<select data-eu="letra"><option value="normal" ${e.letra === 'normal' ? 'selected' : ''}>Normal</option><option value="grande" ${e.letra === 'grande' ? 'selected' : ''}>Grande</option></select></label>`;
  },
};
const estadoAss = () => { const a = db.assinatura; return a.status === 'vencida' ? 'vencida: pague para continuar' : a.renova ? `ativa · próxima ${dataBr(a.proxima)}` : `cancelada · usa até ${dataBr(a.proxima)}`; };

// ------------------------------------------------------------------ navegação
const tela = el('#tela');
function mostrar() {
  const [r, a] = (location.hash.slice(1) || 'prazos').split('/');
  tela.innerHTML = (T[r] || T.prazos)(a);
  const aba = { processo: 'processos', agenda: 'mais', clientes: 'mais', calculadora: 'mais', ia: 'mais', assinatura: 'mais', dono: 'mais', config: 'mais' }[r] || r;
  document.querySelectorAll('.menu a').forEach((x) => (x.dataset.aba === aba ? x.setAttribute('aria-current', 'page') : x.removeAttribute('aria-current')));
  el('#nome-adv').textContent = db.eu.nome; el('#oab').textContent = db.eu.oab;
  document.documentElement.style.fontSize = db.eu.letra === 'grande' ? '112%' : '';
  if (r === 'calculadora') calcular();
  if (!db.assinatura.renova && db.assinatura.status !== 'vencida' && r !== 'assinatura') tela.insertAdjacentHTML('afterbegin', `<p class="etiq verm" style="display:block;padding:8px 12px;border-radius:12px;margin-bottom:12px">Assinatura cancelada: você usa até ${dataBr(db.assinatura.proxima)}. <a href="#assinatura">Reativar</a></p>`);
  travar(r);
  document.title = `${{ prazos: 'Prazos', intimacoes: 'Intimações', processos: 'Processos', processo: 'Processo', honorarios: 'Honorários', mais: 'Mais', agenda: 'Audiências', clientes: 'Clientes', calculadora: 'Calculadora', ia: 'Assistente', assinatura: 'Minha assinatura', dono: 'Painel do dono', config: 'Configurações' }[r] || 'Prazos'} · Veltria Jurídico Essencial`;
}
addEventListener('hashchange', () => { mostrar(); tela.focus({ preventScroll: true }); scrollTo(0, 0); });
function travar(r) {
  document.querySelector('.trava')?.remove();
  if (db.assinatura.status !== 'vencida' || r === 'assinatura') return;
  const t = document.createElement('div'); t.className = 'veu trava';
  t.innerHTML = `<div class="folha" role="alertdialog" aria-modal="true" aria-labelledby="tv"><h2 id="tv">Sua assinatura venceu</h2><p class="sub">O pagamento não foi aprovado. Seus prazos continuam sendo contados e guardados: renove para voltar a ver e receber os avisos.</p>
    <div style="display:grid;gap:8px"><button type="button" class="bt ouro largo" data-acao="pagar-ass">Pagar aqui no app</button><a class="bt largo" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a><a class="bt largo" href="#assinatura" style="border-style:dashed">Ver minha assinatura</a></div></div>`;
  document.body.append(t);
}
function calcular() {
  const i = el('#c-ini')?.value, n = Math.max(0, Math.floor(nm(el('#c-n')?.value)));
  if (!i) return; const fim = somarUteis(deIso(i), n), pulados = [];
  for (let d = new Date(deIso(i)); d < fim;) { d.setDate(d.getDate() + 1); if (!util(d) && d.getDay() !== 0 && d.getDay() !== 6) pulados.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })); }
  el('#c-res').innerHTML = `<span class="mini" style="color:var(--nevoa)">O prazo termina em</span><b>${fim.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</b><span>${pulados.length ? `Pulou ${pulados.length} dia(s) sem expediente: ${pulados.slice(0, 6).join(', ')}${pulados.length > 6 ? '…' : ''}.` : 'Sem feriados no meio.'}</span>`;
}
const EXPLICA = {
  sentenca: (i) => `O juiz deu a sentença: você ganhou parte do que pediu. A empresa foi condenada a pagar as horas extras e o que vem junto delas. O valor estimado da condenação é de R$ 43.000,00.\n\nPróximo passo: se quiser recorrer do que não foi aceito, o prazo é de 8 dias úteis.`,
  replica: () => 'O banco respondeu à ação (contestação) e juntou documentos. Agora é a sua vez de rebater o que eles disseram: isso se chama réplica.\n\nPrazo: 15 dias úteis.',
  audiencia: () => 'Foi marcada uma audiência de conciliação por vídeo, às 14h. É uma conversa para tentar um acordo. É obrigatório participar: faltar sem motivo pode gerar multa.',
};
const PRAZO_INT = { sentenca: ['Recurso ordinário contra a sentença', 8], replica: ['Réplica à contestação', 15], audiencia: ['Preparar documentos para a audiência', 5] };
function pagarAss() {
  const a = db.assinatura;
  folha(`<h2>Pagar ${din(a.valor)}</h2><p class="sub">PIX libera na hora. Cartão abre o pagamento seguro do Mercado Pago.</p><div class="pix" aria-hidden="true"></div>
    <label class="campo">PIX copia e cola<input readonly value="00020126580014BR.GOV.BCB.PIX0136adv-${Date.now().toString(16)}5303986540${a.valor}.005802BR"></label>
    <div class="linha-bts"><button type="button" class="bt" data-copiar>Copiar código</button><a class="bt" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Pagar com cartão</a></div>
    <div class="linha-bts"><button type="button" class="bt ouro" data-pago-ok>Simular pagamento aprovado</button><button type="button" class="bt" data-fechar>Voltar</button></div>`, (f, fechar) => {
    f.addEventListener('click', (e) => {
      if (e.target.closest('[data-copiar]')) { navigator.clipboard?.writeText(f.querySelector('input').value).catch(() => {}); recado('Código PIX copiado'); }
      if (e.target.closest('[data-pago-ok]')) { a.status = 'ativa'; a.renova = true; a.proxima = diaRel(30); a.cobrancas.push({ dia: iso(hoje()), ok: true }); salvar(); fechar(); mostrar(); recado('Pagamento aprovado. Prazos liberados.'); }
    });
  });
}
function responder(p) {
  const q = sa(p), ab = db.prazos.filter((x) => !x.feito).sort((a, b) => a.fatal.localeCompare(b.fatal)), atr = parcelasEmAberto().filter(({ p: x }) => x.venc < iso(hoje()));
  if (/primeiro|hoje|prioriz|fazer/.test(q)) return `Comece por: ${ab.slice(0, 3).map((x) => `${x.desc} (${cli(proc(x.proc)?.cli).nome}, ${uteisAte(x.fatal)} dia(s) útil(eis))`).join('; ')}.\n\nTem ${db.intimacoes.filter((i) => !i.lida).length} intimação(ões) nova(s) para ler.`;
  if (/atras|honor|deve/.test(q)) return atr.length ? `Atrasados: ${atr.map(({ c, p: x }) => `${cli(c.cli).nome} (${din(x.valor)}, venceu ${dataBr(x.venc)})`).join('; ')}.` : 'Ninguém atrasado nos honorários.';
  if (/expli|intima/.test(q)) { const i = [...db.intimacoes].sort((a, b) => b.dia.localeCompare(a.dia))[0]; return `Para mandar a ${cli(proc(i.proc)?.cli).nome.split(' ')[0]}:\n\n"${EXPLICA[i.tipo](i)}"`; }
  if (/mensag|cobran|gentil/.test(q)) return `"Olá! Tudo bem? Passando para lembrar da parcela dos honorários que venceu. Se já pagou, desconsidere. Posso mandar o PIX? Obrigada! ${db.eu.assinaturaZap}"`;
  if (/uteis|mes|dias/.test(q)) { const f = hoje(); f.setMonth(f.getMonth() + 1, 0); return `Até ${f.toLocaleDateString('pt-BR')} são ${uteisAte(iso(f))} dias úteis (já sem feriados).`; }
  return `Você tem ${ab.length} prazos abertos; o mais próximo vence em ${uteisAte(ab[0]?.fatal || iso(hoje()))} dia(s) útil(eis).`;
}

const A = {
  feito: (d) => { const p = db.prazos.find((x) => x.id === d.id); p.feito = !p.feito; salvar(); mostrar(); if (p.feito) recado('Prazo cumprido.'); },
  'novo-prazo': () => formulario('Novo prazo', `<label class="campo">Processo<select name="p">${db.processos.map((p) => `<option value="${p.id}">${h(cli(p.cli).nome)} · ${h(p.tipo)}</option>`).join('')}</select></label><label class="campo">O que fazer<input name="d" required placeholder="Ex.: contrarrazões"></label><div class="dupla"><label class="campo">Intimado em<input name="i" type="date" value="${iso(hoje())}"></label><label class="campo">Dias úteis<input name="n" inputmode="numeric" value="15"></label></div>`, 'Contar prazo', (f) => { const fim = somarUteis(deIso(f.get('i')), Math.floor(nm(f.get('n')))); db.prazos.push({ id: novo(), proc: f.get('p'), desc: f.get('d'), fatal: iso(fim), feito: false }); recado(`Vence em ${fim.toLocaleDateString('pt-BR')}`); }),
  explicar: (d) => { const i = db.intimacoes.find((x) => x.id === d.id), alvo = document.querySelector(`[data-simples="${d.id}"]`); alvo.innerHTML = `<div class="simples">${h(EXPLICA[i.tipo](i))}</div><a class="bt peq ouro" target="_blank" rel="noopener" href="${zap(cli(proc(i.proc).cli).tel, `Olá! Novidade no seu processo:\n\n${EXPLICA[i.tipo](i)}\n\n${db.eu.assinaturaZap}`)}">Mandar essa explicação ao cliente</a>`; i.lida = true; salvar(); },
  'prazo-da-int': (d) => { const i = db.intimacoes.find((x) => x.id === d.id), [desc, n] = PRAZO_INT[i.tipo], fim = somarUteis(deIso(i.dia), n); db.prazos.push({ id: novo(), proc: i.proc, desc, fatal: iso(fim), feito: false }); i.lida = true; salvar(); mostrar(); recado(`Prazo criado: ${n} dias úteis, vence ${fim.toLocaleDateString('pt-BR')}`); },
  lida: (d) => { db.intimacoes.find((x) => x.id === d.id).lida = true; salvar(); mostrar(); },
  'novo-processo': () => formulario('Novo processo', `<label class="campo">Cliente<select name="c" data-livre="clientes">${db.clientes.map((c) => `<option value="${c.id}">${h(c.nome)}</option>`).join('')}</select></label><label class="campo">Número (CNJ)<input name="n" required placeholder="0000000-00.0000.0.00.0000"></label><label class="campo">Contra quem<input name="x"></label><div class="dupla"><label class="campo">Tipo de ação<input name="t" required></label><label class="campo">Vara<input name="v"></label></div>`, 'Cadastrar', (f) => { db.processos.push({ id: novo(), cli: f.get('c'), cnj: f.get('n'), contra: f.get('x') || '—', tipo: f.get('t'), vara: f.get('v') || '—', fase: 'Inicial', valor: 0 }); }),
  'mudar-fase': (d) => { const p = proc(d.id); formulario('Fase do processo', `<label class="campo">Fase<select name="f">${['Inicial', 'Aguardando contestação', 'Instrução', 'Audiência de conciliação', 'Sentença publicada', 'Recurso', 'Execução', 'Arquivado'].map((x) => `<option ${x === p.fase ? 'selected' : ''}>${x}</option>`).join('')}</select></label>`, 'Salvar', (f) => { p.fase = f.get('f'); }); },
  pago: (d) => { const c = db.honorarios.find((x) => x.id === d.c), p = c.parcelas.find((x) => x.venc === d.v && !x.pago); p.pago = true; salvar(); mostrar(); recado(`${din(p.valor)} recebidos de ${cli(c.cli).nome}.`); },
  'novo-contrato': () => formulario('Contrato de honorários', `<label class="campo">Cliente<select name="c" data-livre="clientes">${db.clientes.map((c) => `<option value="${c.id}">${h(c.nome)}</option>`).join('')}</select></label><label class="campo">Descrição<input name="d" required></label><div class="dupla"><label class="campo">Parcelas<input name="n" inputmode="numeric" value="3"></label><label class="campo">Valor de cada (R$)<input name="v" inputmode="decimal" required></label></div><label class="campo">Êxito (%)<input name="e" inputmode="decimal" value="0"></label>`, 'Salvar', (f) => { const n = Math.max(1, Math.floor(nm(f.get('n')))); db.honorarios.push({ id: novo(), cli: f.get('c'), proc: '', desc: f.get('d'), exito: nm(f.get('e')), parcelas: Array.from({ length: n }, (_, i) => ({ venc: diaRel(10 + i * 30), valor: nm(f.get('v')), pago: false })) }); }),
  'nova-aud': () => formulario('Nova audiência', `<label class="campo">Processo<select name="p">${db.processos.map((p) => `<option value="${p.id}">${h(cli(p.cli).nome)}</option>`).join('')}</select></label><div class="dupla"><label class="campo">Dia<input name="d" type="date" required></label><label class="campo">Hora<input name="h" type="time" value="14:00"></label></div><label class="campo">Tipo<input name="t" value="Conciliação"></label><label class="campo">Local<input name="l" value="Videoconferência"></label>`, 'Marcar', (f) => { db.audiencias.push({ id: novo(), proc: f.get('p'), dia: f.get('d'), hora: f.get('h'), tipo: f.get('t'), local: f.get('l') }); }),
  'novo-cliente': () => formulario('Novo cliente', '<label class="campo">Nome<input name="n" required></label><label class="campo">WhatsApp<input name="t" inputmode="tel" required></label>', 'Cadastrar', (f) => { db.clientes.push({ id: novo(), nome: f.get('n'), tel: f.get('t') }); }),
  convidar: () => { formulario('Chamar para a equipe', '<label class="campo">Nome<input name="n" required></label><label class="campo">WhatsApp<input name="t" inputmode="tel" required></label>', 'Mandar convite', (f) => { db.equipe.push({ id: novo(), nome: f.get('n'), pode: { prazos: true, intimacoes: true, honorarios: false } }); recado('Convite mandado pelo WhatsApp.'); }); },
  tirar: (d) => { db.equipe = db.equipe.filter((x) => x.id !== d.id); salvar(); mostrar(); },
  plano: (d) => { db.plano = d.v; db.assinatura.valor = d.v === 'pro' ? 149 : 89; salvar(); mostrar(); },
  'pagar-ass': () => pagarAss(),
  'cancelar-ass': () => { if (confirm(`Cancelar? Nada mais é cobrado e você usa até ${dataBr(db.assinatura.proxima)}.`)) { db.assinatura.renova = false; salvar(); mostrar(); } },
  reativar: () => { db.assinatura.renova = true; salvar(); mostrar(); recado('Assinatura reativada.'); },
};

document.addEventListener('click', (e) => {
  const ir = e.target.closest('[data-ir]'); if (ir) { location.hash = `#${ir.dataset.ir}`; return; }
  const f = e.target.closest('[data-filtro]'); if (f) { filtro = f.dataset.filtro; mostrar(); return; }
  const dd = e.target.closest('[data-dias]'); if (dd) { el('#c-n').value = dd.dataset.dias; calcular(); return; }
  const s = e.target.closest('[data-sug]'); if (s) { el('#q-ia').value = s.dataset.sug; el('#f-ia').requestSubmit(); return; }
  const a = e.target.closest('[data-acao]'); if (a && A[a.dataset.acao]) { e.preventDefault(); A[a.dataset.acao](a.dataset); }
});
document.addEventListener('submit', (e) => { if (e.target.id !== 'f-ia') return; e.preventDefault(); const p = el('#q-ia').value.trim(); if (p.length < 3) return; const resp = { ela: true, t: window.veltriaIA ? 'Pensando…' : `${responder(p)}\n\n(Exemplo da demonstração.)` }; db.conversa.push({ t: p }, resp); db.conversa = db.conversa.slice(-10); salvar(); mostrar(); if (window.veltriaIA) window.veltriaIA(p).then((t) => { resp.t = t; salvar(); mostrar(); }); });
document.addEventListener('input', (e) => { if (e.target.id === 'c-ini' || e.target.id === 'c-n') calcular(); if (e.target.dataset.eu) { db.eu[e.target.dataset.eu] = e.target.dataset.eu === 'antecedencia' ? Number(e.target.value) : e.target.value; salvar(); el('#nome-adv').textContent = db.eu.nome; el('#oab').textContent = db.eu.oab; } });
document.addEventListener('change', (e) => { const t = e.target; if (t.dataset.pode) { const [id, k] = t.dataset.pode.split(':'); db.equipe.find((x) => x.id === id).pode[k] = t.checked; salvar(); recado('Permissão salva'); } if (t.dataset.eu === 'letra') mostrar(); });
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data?.simular) return; const a = db.assinatura;
  if (e.data.simular === 'cancelar') { a.renova = false; a.status = 'ativa'; }
  if (e.data.simular === 'recusado') { a.status = 'vencida'; a.renova = true; a.cobrancas.push({ dia: iso(hoje()), ok: false }); }
  if (e.data.simular === 'normal') { db.assinatura = assinaturaInicial(); db.plano = 'basico'; }
  salvar(); mostrar();
});
el('#recomecar')?.addEventListener('click', () => { localStorage.removeItem(CHAVE); db = exemplo(); location.hash = '#prazos'; mostrar(); recado('Demonstração recomeçada.'); });
if (window !== window.top) document.documentElement.classList.add('no-celular');
if ('serviceWorker' in navigator && window === window.top) navigator.serviceWorker.register('sw.js').catch(() => {});
mostrar();

/* veltria: campos livres */
// Nome escrito à mão num campo de lista (js/campos-livres.js): vira cadastro novo nesta lista do db,
// no mesmo formato dos que já existem. O formulário grava como sempre.
window.veltriaNovoCadastro = (tipo, nome) => {
  const lista = db && db[tipo];
  if (!Array.isArray(lista)) return '';
  const ja = lista.find((x) => String(x.nome || '').trim().toLowerCase() === nome.trim().toLowerCase());
  if (ja) return ja.id;
  const mod = lista[0] || {}, n = {};
  Object.keys(mod).forEach((k) => { const v = mod[k]; n[k] = Array.isArray(v) ? [] : typeof v === 'number' ? 0 : typeof v === 'boolean' ? false : v && typeof v === 'object' ? {} : ''; });
  n.id = typeof mod.id === 'number' ? Math.max(0, ...lista.map((x) => Number(x.id) || 0)) + 1 : `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  n.nome = nome.trim();
  lista.push(n);
  return n.id;
};
