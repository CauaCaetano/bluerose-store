// Veltria Jurídico Avançado · protótipo "central de filas" para escritório com muitos processos e advogados.
// Modo Filas: intimações a triar, prazos com dupla checagem (minuta > revisão > protocolo), tarefas, horas a aprovar
// e conflitos de interesse, em três painéis com atalhos (J/K anda, E conclui, / busca).
// Modo Painéis: jurimetria, provisões de risco (CPC 25), faturamento e rateio entre sócios, contencioso em massa
// (importa planilha), equipe e acesso, auditoria e ajustes. Copiloto IA flutuante. Dados fictícios (?novo recomeça).

const CHAVE = 'veltria-juridico-avancado-v1';
const RS = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const MIL = (v) => (Math.abs(v) >= 1e6 ? `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi` : Math.abs(v) >= 1e4 ? `R$ ${Math.round(v / 1e3).toLocaleString('pt-BR')} mil` : RS(v));
const PC = (v) => `${Math.round(v * 100)}%`;
const X = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const LIMPA = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const NUM = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const NID = () => `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const $ = (s) => document.querySelector(s);
const DIA = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); };
const HORA = () => new Date().toTimeString().slice(0, 5);

// ------------------------------------------------------------------ banca fictícia
function banca() {
  let s = 41; const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const advs = [['a1', 'Dra. Helena Monteiro', 'Sócia', 650, 40], ['a2', 'Dr. Otávio Bastos', 'Sócio', 650, 35], ['a3', 'Dr. Felipe Arantes', 'Sócio', 600, 25], ['a4', 'Dra. Júlia Castro', 'Associada sênior', 420, 0], ['a5', 'Dr. Marcos Lemos', 'Associado', 320, 0], ['a6', 'Dra. Bianca Prado', 'Associada', 320, 0], ['a7', 'Lucas Ferreira', 'Estagiário', 0, 0], ['a8', 'Paula Nogueira', 'Controladoria', 0, 0]].map(([id, nome, cargo, hora, rateio]) => ({ id, nome, cargo, hora, rateio }));
  const clientes = [['k1', 'Banco Meridional S.A.', 'corporativo'], ['k2', 'Rede Bom Lar Varejo Ltda', 'corporativo'], ['k3', 'Construtora Pedra Alta', 'corporativo'], ['k4', 'Hospital Santa Clara', 'corporativo'], ['k5', 'Pessoas físicas (diversos)', 'varejo']].map(([id, nome, tipo]) => ({ id, nome, tipo }));
  const tipos = ['Indenização por danos morais', 'Revisional de contrato', 'Reclamação trabalhista', 'Execução de título', 'Ação de cobrança', 'Erro médico'], varas = ['1ª Vara Cível de BH', '7ª Vara Cível de BH', '22ª Vara Cível de BH', '3ª Vara do Trabalho de BH', '11ª Vara do Trabalho de BH', 'JESP Cível de Contagem'];
  const processos = Array.from({ length: 64 }, (_, i) => {
    const cli = clientes[i < 22 ? 0 : i < 38 ? 1 : i < 48 ? 2 : i < 56 ? 3 : 4], tipo = cli.id === 'k4' ? 'Erro médico' : cli.id === 'k1' ? tipos[r() < .5 ? 0 : 1] : cli.id === 'k2' ? tipos[r() < .6 ? 2 : 0] : tipos[3 + Math.floor(r() * 2)];
    const enc = r() < .35, exito = enc ? (r() < (tipo === 'Revisional de contrato' ? .72 : tipo === 'Reclamação trabalhista' ? .41 : .58)) : null;
    return { id: `p${i}`, cnj: `${String(5000000 + Math.floor(r() * 999999)).padStart(7, '0')}-${String(10 + Math.floor(r() * 89))}.2026.${tipo.includes('trabalhista') ? '5.03' : '8.13'}.${String(Math.floor(r() * 9999)).padStart(4, '0')}`, cli: cli.id, tipo, vara: tipo.includes('trabalhista') ? varas[3 + Math.floor(r() * 2)] : varas[Math.floor(r() * 3)] , resp: advs[3 + Math.floor(r() * 3)].id,
      polo: cli.id === 'k5' ? 'ativo' : 'passivo', valor: Math.round((5 + r() * 180) * 1000), risco: ['provavel', 'possivel', 'remota'][Math.floor(r() * 3)], enc, exito, meses: Math.round(6 + r() * 30), parte: ['Carlos A. Souza', 'Maria L. Pinto', 'Sindicato dos Comerciários', 'Auto Posto Via Norte', 'Rafael T. Moura', 'Joana P. Lima'][Math.floor(r() * 6)] };
  });
  const ativos = processos.filter((p) => !p.enc);
  const intimacoes = [
    ['Manifeste-se o réu sobre o laudo pericial, no prazo comum de 15 dias.', 'alta'], ['Designada audiência de instrução para o dia 18, às 13h30.', 'media'], ['Intime-se o executado para pagamento em 15 dias, sob pena de multa de 10% (art. 523 CPC).', 'alta'],
    ['Vista à parte autora sobre os embargos de declaração opostos.', 'media'], ['Publicada a sentença de improcedência. Intimem-se.', 'alta'], ['Cumpra-se o v. acórdão. Arquivem-se oportunamente.', 'baixa'], ['Especifiquem as partes as provas que pretendem produzir, em 5 dias.', 'media'],
  ].map(([texto, urg], i) => ({ id: NID(), proc: ativos[i * 3].id, dia: -(i % 3), texto, urg, resp: i < 2 ? ativos[i * 3].resp : '', triada: i < 2 }));
  const prazos = [['Contestação', 2, 'minuta'], ['Recurso de apelação', 5, 'aberto'], ['Contrarrazões', 1, 'revisao'], ['Impugnação ao laudo', 8, 'aberto'], ['Embargos de declaração', 0, 'revisao'], ['Manifestação sobre penhora', 3, 'minuta'], ['Recurso ordinário', 6, 'aberto'], ['Réplica', 11, 'aberto']]
    .map(([desc, d, st], i) => ({ id: NID(), proc: ativos[i * 2 + 1].id, desc, fatal: d, resp: ativos[i * 2 + 1].resp, revisor: ['a1', 'a2', 'a3'][i % 3], status: st }));
  const tarefas = [['Ligar para o preposto do Banco Meridional sobre a audiência', 'a5', 1], ['Atualizar relatório mensal da Rede Bom Lar', 'a4', 3], ['Conferir guias de custas do lote de execuções', 'a7', 2], ['Reunião de pauta com sócios', 'a1', 0], ['Pedir certidões negativas da Construtora Pedra Alta', 'a7', 4]].map(([desc, resp, vence]) => ({ id: NID(), desc, resp, vence, feita: false }));
  const horas = [['a4', 'k1', 3.5, 'Audiência e relatório pós-audiência'], ['a5', 'k2', 6, 'Defesa em 3 reclamações trabalhistas'], ['a6', 'k3', 2, 'Análise de contrato de empreitada'], ['a4', 'k4', 4, 'Parecer sobre risco de erro médico'], ['a5', 'k1', 1.5, 'Acordo extrajudicial']].map(([adv, cli, h, desc], i) => ({ id: NID(), adv, cli, h, desc, dia: -i, status: 'pendente' }));
  const conflitos = [{ id: NID(), nome: 'Auto Posto Via Norte', motivo: 'Já é parte contrária em 2 processos do Banco Meridional', status: 'pendente' }, { id: NID(), nome: 'Dr. Ricardo Salles (médico)', motivo: 'Médico citado em processo do Hospital Santa Clara', status: 'pendente' }];
  return { banca: { nome: 'Monteiro Bastos Sociedade de Advogados', oab: 'OAB/MG 4.418' }, eu: 'a1', advs, clientes, processos, intimacoes, prazos, tarefas, horas, conflitos,
    fixos: { k1: 38000, k2: 22000, k3: 9000, k4: 15000 }, ajustes: { abrir: 'filas', letra: 'normal', fila: 'intimacoes' }, plano: 'basico',
    auditoria: [{ dia: -1, hora: '18:02', quem: 'Dr. Otávio Bastos', oque: 'Revisou e liberou a contestação do processo do Banco Meridional' }, { dia: -1, hora: '10:14', quem: 'Paula Nogueira', oque: 'Aprovou 12,5 h da Rede Bom Lar' }], conversa: [] };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || banca(); } catch { return banca(); } })();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
const SALVA = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { NOTA('Sem espaço no navegador.'); } };
const LOG = (oque) => { db.auditoria.unshift({ dia: 0, hora: HORA(), quem: ADV(db.eu).nome, oque }); db.auditoria = db.auditoria.slice(0, 300); };
const ADV = (id) => db.advs.find((a) => a.id === id) || { nome: '—', hora: 0 };
const CLI = (id) => db.clientes.find((c) => c.id === id) || { nome: '—' };
// processo apagado ou não escolhido: um vazio no lugar, para a tela não quebrar
const PROC = (id) => db.processos.find((p) => p.id === id) || { id: '', cli: '', cnj: '—', tipo: '', vara: '', contra: '', fase: '', andamentos: [], docs: [] };
function NOTA(t) { const n = document.createElement('div'); n.className = 'nota'; n.textContent = t; $('#notas').append(n); setTimeout(() => n.remove(), 3400); }
function MODAL(html, fn) {
  const c = document.createElement('div'); c.className = 'cortina'; c.innerHTML = `<div class="caixa-m" role="dialog" aria-modal="true">${html}</div>`;
  const a = document.activeElement; document.body.append(c);
  const fecha = () => { c.remove(); a?.focus?.(); };
  c.addEventListener('click', (e) => { if (e.target === c || e.target.closest('[data-x]')) fecha(); });
  c.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); });
  setTimeout(() => (c.querySelector('input, select, textarea') || c.querySelector('button'))?.focus(), 30);
  fn?.(c.querySelector('.caixa-m'), fecha);
}
function FORM(t, campos, ok, fn) { MODAL(`<h2>${t}</h2><form>${campos}<div class="rod"><button type="button" class="bj" data-x>Cancelar</button><button class="bj gr">${ok}</button></div></form>`, (m, fecha) => m.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); if (fn(new FormData(e.target)) !== false) { SALVA(); fecha(); DESENHA(); } })); }
const opAdv = (sel, filtro = () => true) => db.advs.filter(filtro).map((a) => `<option value="${a.id}" ${a.id === sel ? 'selected' : ''}>${X(a.nome)}</option>`).join('');

// ------------------------------------------------------------------ filas
const FILAS = {
  intimacoes: { nome: 'Intimações a triar', itens: () => [...db.intimacoes].sort((a, b) => a.triada - b.triada || b.dia - a.dia), conta: () => db.intimacoes.filter((i) => !i.triada).length, alerta: () => db.intimacoes.some((i) => !i.triada && i.urg === 'alta'),
    linha: (i) => [`${X(CLI(PROC(i.proc).cli).nome)}`, `<span class="tg ${i.urg === 'alta' ? 'r' : i.urg === 'media' ? 'a' : ''}">${i.urg}</span>`, X(i.texto)], feito: (i) => i.triada,
    detalhe: (i) => { const p = PROC(i.proc); return `<h2>${X(CLI(p.cli).nome)}</h2><div class="meta">${p.cnj} · ${X(p.tipo)} · ${X(p.vara)} · publicada ${DIA(i.dia)}</div><div class="texto-int">${X(i.texto)}</div>
      <div class="acoes-d"><label>Responsável <select class="campo-s" data-int-resp="${i.id}"><option value="">—</option>${opAdv(i.resp || p.resp, (a) => /Assoc|Sóci/.test(a.cargo))}</select></label><button class="bj" data-f="int-prazo" data-id="${i.id}">Gerar prazo</button><button class="bj gr" data-f="triar" data-id="${i.id}">Triada <kbd>E</kbd></button></div>
      <p class="meta">Sugestão automática: ${/sentença|acórdão/i.test(i.texto) ? 'prazo recursal de 15 dias úteis' : /audiência/i.test(i.texto) ? 'incluir na agenda e avisar o preposto' : /provas|5 dias/i.test(i.texto) ? 'prazo de 5 dias úteis' : 'prazo de 15 dias úteis'}.</p>`; },
    concluir: (i) => { i.triada = true; i.resp ||= PROC(i.proc).resp; LOG(`Triou intimação do processo ${PROC(i.proc).cnj}`); } },
  prazos: { nome: 'Prazos (dupla checagem)', itens: () => [...db.prazos].sort((a, b) => (a.status === 'protocolado') - (b.status === 'protocolado') || a.fatal - b.fatal), conta: () => db.prazos.filter((p) => p.status !== 'protocolado').length, alerta: () => db.prazos.some((p) => p.status !== 'protocolado' && p.fatal <= 1),
    linha: (p) => [X(p.desc), `<span class="tg ${p.status === 'protocolado' ? 'v' : p.fatal <= 1 ? 'r' : 'a'}">${p.status === 'protocolado' ? 'protocolado' : p.fatal === 0 ? 'vence hoje' : `${p.fatal} d.ú.`}</span>`, `${X(CLI(PROC(p.proc).cli).nome)} · ${X(ADV(p.resp).nome)}`], feito: (p) => p.status === 'protocolado',
    detalhe: (p) => { const pr = PROC(p.proc), passos = ['aberto', 'minuta', 'revisao', 'protocolado'], k = passos.indexOf(p.status); return `<h2>${X(p.desc)}</h2><div class="meta">${X(CLI(pr.cli).nome)} · ${pr.cnj} · fatal em ${DIA(p.fatal)}</div>
      <div class="fluxo">${['Em elaboração', 'Minuta pronta', 'Em revisão', 'Protocolado'].map((t, i) => `<span class="${i <= k ? 'ok' : ''}">${t}</span>`).join('')}</div>
      <p>Responsável: <b>${X(ADV(p.resp).nome)}</b> · Revisor: <b>${X(ADV(p.revisor).nome)}</b></p>
      <div class="acoes-d">${k < 3 ? `<button class="bj gr" data-f="avancar-prazo" data-id="${p.id}">${['Minuta pronta', 'Mandar para revisão', 'Revisado: protocolar'][k]} <kbd>E</kbd></button>` : '<span class="tg v">Cumprido</span>'}${p.status === 'revisao' ? `<button class="bj" data-f="devolver" data-id="${p.id}">Devolver com ajustes</button>` : ''}</div>
      <p class="meta">Dupla checagem: nada é protocolado sem o revisor. Fica registrado na auditoria quem fez e quem revisou.</p>`; },
    concluir: (p) => { const passos = ['aberto', 'minuta', 'revisao', 'protocolado'], k = passos.indexOf(p.status); if (k < 3) { p.status = passos[k + 1]; LOG(`${['Concluiu minuta', 'Enviou para revisão', 'Revisou e protocolou'][k]}: ${p.desc} (${PROC(p.proc).cnj})`); } } },
  tarefas: { nome: 'Tarefas', itens: () => [...db.tarefas].sort((a, b) => a.feita - b.feita || a.vence - b.vence), conta: () => db.tarefas.filter((t) => !t.feita).length, alerta: () => db.tarefas.some((t) => !t.feita && t.vence <= 0),
    linha: (t) => [X(t.desc), `<span class="tg ${t.vence <= 0 && !t.feita ? 'r' : ''}">${t.feita ? 'feita' : DIA(t.vence)}</span>`, X(ADV(t.resp).nome)], feito: (t) => t.feita,
    detalhe: (t) => `<h2>${X(t.desc)}</h2><div class="meta">Para ${DIA(t.vence)}</div><div class="acoes-d"><label>Com <select class="campo-s" data-tar-resp="${t.id}">${opAdv(t.resp)}</select></label><button class="bj gr" data-f="concluir" data-id="${t.id}">Feita <kbd>E</kbd></button></div>`,
    concluir: (t) => { t.feita = true; LOG(`Concluiu a tarefa "${t.desc}"`); } },
  horas: { nome: 'Horas a aprovar', itens: () => [...db.horas].sort((a, b) => (a.status !== 'pendente') - (b.status !== 'pendente')), conta: () => db.horas.filter((h) => h.status === 'pendente').length, alerta: () => false,
    linha: (h) => [`${h.h.toLocaleString('pt-BR')} h · ${X(ADV(h.adv).nome)}`, `<span class="tg ${h.status === 'aprovada' ? 'v' : h.status === 'glosada' ? 'r' : 'a'}">${h.status}</span>`, `${X(CLI(h.cli).nome)} · ${X(h.desc)}`], feito: (h) => h.status !== 'pendente',
    detalhe: (h) => `<h2>${h.h.toLocaleString('pt-BR')} horas · ${X(CLI(h.cli).nome)}</h2><div class="meta">${X(ADV(h.adv).nome)} · ${DIA(h.dia)} · ${RS(h.h * ADV(h.adv).hora)} pelo valor da hora</div><div class="texto-int">${X(h.desc)}</div><div class="acoes-d"><button class="bj gr" data-f="aprovar-h" data-id="${h.id}">Aprovar <kbd>E</kbd></button><button class="bj" data-f="glosar" data-id="${h.id}">Glosar</button></div><p class="meta">Só horas aprovadas entram no faturamento do cliente.</p>`,
    concluir: (h) => { h.status = 'aprovada'; LOG(`Aprovou ${h.h} h de ${ADV(h.adv).nome} para ${CLI(h.cli).nome}`); } },
  conflitos: { nome: 'Conflito de interesses', itens: () => db.conflitos, conta: () => db.conflitos.filter((c) => c.status === 'pendente').length, alerta: () => db.conflitos.some((c) => c.status === 'pendente'),
    linha: (c) => [X(c.nome), `<span class="tg ${c.status === 'pendente' ? 'r' : 'v'}">${c.status}</span>`, X(c.motivo)], feito: (c) => c.status !== 'pendente',
    detalhe: (c) => `<h2>${X(c.nome)}</h2><div class="texto-int">${X(c.motivo)}</div><p class="meta">A checagem compara o novo cliente com todas as partes contrárias e pessoas citadas nos processos da banca.</p><div class="acoes-d"><button class="bj gr" data-f="liberar" data-id="${c.id}">Liberar com termo de ciência</button><button class="bj" data-f="recusar" data-id="${c.id}">Recusar o caso</button><button class="bj" data-f="nova-checagem">+ Nova checagem</button></div>`,
    concluir: (c) => { c.status = 'liberado'; LOG(`Liberou o cliente ${c.nome} após checagem de conflito`); } },
};
let selecionado = null;

// ------------------------------------------------------------------ painéis
const PAINEIS = {
  jurimetria: ['Jurimetria', () => {
    const enc = db.processos.filter((p) => p.enc), porTipo = {}, porVara = {};
    enc.forEach((p) => { (porTipo[p.tipo] ||= { n: 0, ok: 0, meses: 0 }); porTipo[p.tipo].n++; porTipo[p.tipo].ok += p.exito ? 1 : 0; porTipo[p.tipo].meses += p.meses; (porVara[p.vara] ||= { n: 0, ok: 0 }); porVara[p.vara].n++; porVara[p.vara].ok += p.exito ? 1 : 0; });
    const taxa = enc.filter((p) => p.exito).length / (enc.length || 1);
    return `<div class="cab-p"><div><h1>Jurimetria</h1><p>${enc.length} processos encerrados analisados. Use para precificar e para dizer ao cliente a chance real.</p></div></div>
      <div class="blocos"><div class="bl s3 cifra esc"><h3>Taxa de êxito geral</h3><b>${PC(taxa)}</b><span>decisões favoráveis</span></div><div class="bl s3 cifra"><h3>Tempo médio</h3><b>${Math.round(enc.reduce((t, p) => t + p.meses, 0) / (enc.length || 1))} meses</b><span>da distribuição ao fim</span></div><div class="bl s3 cifra"><h3>Processos ativos</h3><b>${db.processos.length - enc.length}</b><span>na carteira</span></div><div class="bl s3 cifra"><h3>Valor em discussão</h3><b>${MIL(db.processos.filter((p) => !p.enc).reduce((t, p) => t + p.valor, 0))}</b><span>soma dos valores da causa</span></div>
      <div class="bl s7"><h3>Êxito por tipo de ação</h3><table><thead><tr><th>Tipo</th><th class="n">Casos</th><th>Êxito</th><th class="n">Meses</th></tr></thead><tbody>${Object.entries(porTipo).sort((a, b) => b[1].n - a[1].n).map(([t, v]) => `<tr><td>${X(t)}</td><td class="n">${v.n}</td><td><div class="barra-j ${v.ok / v.n >= .6 ? 'bom' : v.ok / v.n < .45 ? 'ruim' : ''}"><i style="width:${v.ok / v.n * 100}%"></i></div><small>${PC(v.ok / v.n)}</small></td><td class="n">${Math.round(v.meses / v.n)}</td></tr>`).join('')}</tbody></table></div>
      <div class="bl s5"><h3>Êxito por vara</h3><table><tbody>${Object.entries(porVara).sort((a, b) => b[1].ok / b[1].n - a[1].ok / a[1].n).map(([vara, v]) => `<tr><td>${X(vara)}</td><td class="n">${PC(v.ok / v.n)}</td><td class="n">${v.n} casos</td></tr>`).join('')}</tbody></table></div></div>`;
  }],
  provisoes: ['Provisões de risco', () => {
    const corp = db.clientes.filter((c) => c.tipo === 'corporativo');
    const linha = (c) => { const l = db.processos.filter((p) => p.cli === c.id && !p.enc && p.polo === 'passivo'), s = (r) => l.filter((p) => p.risco === r).reduce((t, p) => t + p.valor, 0); return { c, n: l.length, pv: s('provavel'), ps: s('possivel'), rm: s('remota') }; };
    const ls = corp.map(linha), tot = ls.reduce((a, x) => ({ pv: a.pv + x.pv, ps: a.ps + x.ps, rm: a.rm + x.rm }), { pv: 0, ps: 0, rm: 0 });
    return `<div class="cab-p"><div><h1>Provisões de risco</h1><p>Classificação de cada processo em que o cliente é réu, como pede a norma contábil (CPC 25): provável é provisionado no balanço, possível vai para as notas explicativas.</p></div><button class="bj" data-f="relatorio-prov">Relatório para o cliente</button></div>
      <div class="blocos"><div class="bl s4 cifra esc"><h3>Provável (provisionar)</h3><b>${MIL(tot.pv)}</b></div><div class="bl s4 cifra"><h3>Possível (divulgar)</h3><b>${MIL(tot.ps)}</b></div><div class="bl s4 cifra"><h3>Remota</h3><b>${MIL(tot.rm)}</b></div>
      <div class="bl"><table><thead><tr><th>Cliente</th><th class="n">Processos</th><th class="n">Provável</th><th class="n">Possível</th><th class="n">Remota</th></tr></thead><tbody>${ls.map((x) => `<tr><td><b>${X(x.c.nome)}</b></td><td class="n">${x.n}</td><td class="n">${RS(x.pv)}</td><td class="n">${RS(x.ps)}</td><td class="n">${RS(x.rm)}</td></tr>`).join('')}<tr class="soma"><td>Total</td><td class="n">${ls.reduce((t, x) => t + x.n, 0)}</td><td class="n">${RS(tot.pv)}</td><td class="n">${RS(tot.ps)}</td><td class="n">${RS(tot.rm)}</td></tr></tbody></table></div>
      <div class="bl"><h3>Reclassificar processo</h3><div class="rolagem" style="max-height:280px"><table><tbody>${db.processos.filter((p) => !p.enc && p.polo === 'passivo').slice(0, 30).map((p) => `<tr><td class="n" style="text-align:left">${p.cnj}</td><td>${X(CLI(p.cli).nome)}</td><td>${X(p.tipo)}</td><td class="n">${RS(p.valor)}</td><td><select class="campo-s" data-risco="${p.id}" aria-label="Risco">${['provavel', 'possivel', 'remota'].map((r) => `<option value="${r}" ${p.risco === r ? 'selected' : ''}>${{ provavel: 'Provável', possivel: 'Possível', remota: 'Remota' }[r]}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div></div></div>`;
  }],
  faturamento: ['Faturamento e rateio', () => {
    const porCli = db.clientes.filter((c) => db.fixos[c.id]).map((c) => { const hs = db.horas.filter((h) => h.cli === c.id && h.status === 'aprovada'), vh = hs.reduce((t, h) => t + h.h * ADV(h.adv).hora, 0); return { c, fixo: db.fixos[c.id], vh, h: hs.reduce((t, h) => t + h.h, 0) }; });
    const total = porCli.reduce((t, x) => t + x.fixo + x.vh, 0), socios = db.advs.filter((a) => a.rateio), custos = 96000, lucro = total - custos;
    const exito = db.processos.filter((p) => !p.enc && p.polo === 'ativo').reduce((t, p) => t + p.valor * 0.2 * 0.58, 0);
    return `<div class="cab-p"><div><h1>Faturamento e rateio</h1><p>Mês atual: partido mensal fixo + horas aprovadas. O lucro é dividido pelo percentual de cada sócio.</p></div><button class="bj gr" data-f="emitir-fat">Emitir faturas do mês</button></div>
      <div class="blocos"><div class="bl s3 cifra esc"><h3>Faturamento do mês</h3><b>${MIL(total)}</b><span>${porCli.length} clientes</span></div><div class="bl s3 cifra"><h3>Custos do escritório</h3><b>${MIL(custos)}</b><span>folha, aluguel e sistemas</span></div><div class="bl s3 cifra"><h3>Lucro a ratear</h3><b>${MIL(lucro)}</b></div><div class="bl s3 cifra"><h3>Êxito provisionado</h3><b>${MIL(exito)}</b><span>20% × chance histórica de 58%</span></div>
      <div class="bl s7"><h3>Por cliente</h3><table><thead><tr><th>Cliente</th><th class="n">Partido fixo</th><th class="n">Horas aprovadas</th><th class="n">Total</th></tr></thead><tbody>${porCli.map((x) => `<tr><td>${X(x.c.nome)}</td><td class="n">${RS(x.fixo)}</td><td class="n">${x.h.toLocaleString('pt-BR')} h · ${RS(x.vh)}</td><td class="n"><b>${RS(x.fixo + x.vh)}</b></td></tr>`).join('')}</tbody></table></div>
      <div class="bl s5"><h3>Rateio entre sócios</h3><table><tbody>${socios.map((a) => `<tr><td>${X(a.nome)}</td><td class="n"><input data-rateio="${a.id}" value="${a.rateio}" style="width:56px;text-align:right" aria-label="Percentual de ${X(a.nome)}">%</td><td class="n"><b>${RS(lucro * a.rateio / 100)}</b></td></tr>`).join('')}<tr class="soma"><td>Total</td><td class="n">${socios.reduce((t, a) => t + a.rateio, 0)}%</td><td class="n">${RS(lucro * socios.reduce((t, a) => t + a.rateio, 0) / 100)}</td></tr></tbody></table>${socios.reduce((t, a) => t + a.rateio, 0) !== 100 ? '<p class="meta" style="color:var(--risco)">Os percentuais precisam somar 100%.</p>' : ''}</div></div>`;
  }],
  massa: ['Contencioso em massa', () => {
    const porCli = {}; db.processos.forEach((p) => { (porCli[p.cli] ||= { ativos: 0, enc: 0, valor: 0 }); p.enc ? porCli[p.cli].enc++ : porCli[p.cli].ativos++; porCli[p.cli].valor += p.valor; });
    return `<div class="cab-p"><div><h1>Contencioso em massa</h1><p>Importe centenas de processos de uma vez pela planilha do cliente (CSV com número CNJ, parte, tipo e valor). O sistema distribui por responsável e acompanha em lote.</p></div><label class="bj gr" style="cursor:pointer">Importar planilha (CSV)<input type="file" accept=".csv,text/csv" hidden id="csv-massa"></label></div>
      <div class="blocos"><div class="bl s4 cifra esc"><h3>Processos na carteira</h3><b>${db.processos.length}</b></div><div class="bl s4 cifra"><h3>Ativos</h3><b>${db.processos.filter((p) => !p.enc).length}</b></div><div class="bl s4 cifra"><h3>Média por advogado</h3><b>${Math.round(db.processos.filter((p) => !p.enc).length / db.advs.filter((a) => /Assoc/.test(a.cargo)).length)}</b><span>processos ativos</span></div>
      <div class="bl"><table><thead><tr><th>Cliente</th><th class="n">Ativos</th><th class="n">Encerrados</th><th class="n">Valor total</th></tr></thead><tbody>${Object.entries(porCli).map(([k, v]) => `<tr><td>${X(CLI(k).nome)}</td><td class="n">${v.ativos}</td><td class="n">${v.enc}</td><td class="n">${MIL(v.valor)}</td></tr>`).join('')}</tbody></table>
        <p class="meta">Modelo de planilha: <code>cnj;parte_contraria;tipo;valor</code>. Ações em lote: trocar responsável, gerar prazo para todos, exportar relatório.</p><div class="acoes-d"><button class="bj" data-f="lote-resp">Redistribuir em lote</button><button class="bj" data-f="exportar">Exportar carteira (CSV)</button></div></div></div>`;
  }],
  equipe: ['Equipe e acesso', () => {
    const MOD = ['Intimações', 'Prazos', 'Horas', 'Jurimetria', 'Provisões', 'Faturamento', 'Equipe'], CARGO = { 'Sócio(a)': 'eeeeeee', 'Associado(a)': 'eeevv--', Estagiário: 'ev-----', Controladoria: '--evvev' }, n = { e: ['edita', 'v'], v: ['vê', 'a'], '-': ['—', ''] }, preco = db.plano === 'pro' ? 359 : 299;
    return `<div class="cab-p"><div><h1>Equipe e acesso</h1><p>Painel do dono: usuários, cargos e o que cada cargo pode em cada módulo.</p></div><button class="bj gr" data-f="convidar">+ Convidar</button></div>
      <div class="blocos"><div class="bl s4 cifra esc"><h3>Plano</h3><b>${db.plano === 'pro' ? 'Pro' : 'Básico'}</b><span>${RS(preco)}/mês · sem fidelidade</span></div><div class="bl s8"><h3>Plano</h3><div class="acoes-d"><button class="bj ${db.plano === 'basico' ? 'gr' : ''}" data-f="plano" data-v="basico">Básico · R$ 299 · até 6 usuários</button><button class="bj ${db.plano === 'pro' ? 'gr' : ''}" data-f="plano" data-v="pro">Pro · R$ 359 · sem limite</button></div><p class="meta">Anual com 20% a menos. Troca confirmada no Mercado Pago.</p></div>
      <div class="bl s6"><h3>Usuários (${db.advs.length})</h3><table><tbody>${db.advs.map((a) => `<tr><td><b>${X(a.nome)}</b></td><td>${X(a.cargo)}</td><td class="n">${a.hora ? `${RS(a.hora)}/h` : ''}</td></tr>`).join('')}</tbody></table></div>
      <div class="bl s6"><h3>Permissões</h3><table><thead><tr><th>Cargo</th>${MOD.map((m) => `<th>${m}</th>`).join('')}</tr></thead><tbody>${Object.entries(CARGO).map(([c, s]) => `<tr><td><b>${c}</b></td>${[...s].map((x) => `<td><span class="tg ${n[x][1]}">${n[x][0]}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  }],
  auditoria: ['Auditoria', () => `<div class="cab-p"><div><h1>Auditoria</h1><p>Quem triou, minutou, revisou, protocolou, aprovou horas ou mudou riscos. Ninguém apaga este registro.</p></div></div><div class="bl"><div class="rolagem"><table><thead><tr><th>Quando</th><th>Quem</th><th>O que</th></tr></thead><tbody>${db.auditoria.map((a) => `<tr><td>${DIA(a.dia)} ${a.hora}</td><td>${X(a.quem)}</td><td>${X(a.oque)}</td></tr>`).join('')}</tbody></table></div></div>`],
  ajustes: ['Ajustes', () => `<div class="cab-p"><div><h1>Ajustes</h1></div></div><div class="blocos"><div class="bl s6"><h3>Você</h3><label class="cpo">Nome<input data-meu value="${X(ADV(db.eu).nome)}"></label><label class="cpo">Abrir em<select data-aj="abrir"><option value="filas" ${db.ajustes.abrir === 'filas' ? 'selected' : ''}>Filas</option><option value="paineis" ${db.ajustes.abrir === 'paineis' ? 'selected' : ''}>Painéis</option></select></label><label class="cpo">Fila inicial<select data-aj="fila">${Object.entries(FILAS).map(([k, f]) => `<option value="${k}" ${db.ajustes.fila === k ? 'selected' : ''}>${f.nome}</option>`).join('')}</select></label><label class="cpo">Letras<select data-aj="letra"><option value="normal" ${db.ajustes.letra === 'normal' ? 'selected' : ''}>Normal</option><option value="grande" ${db.ajustes.letra === 'grande' ? 'selected' : ''}>Grande</option></select></label></div>
    <div class="bl s6"><h3>Banca</h3><label class="cpo">Razão social<input data-banca="nome" value="${X(db.banca.nome)}"></label><label class="cpo">Registro OAB<input data-banca="oab" value="${X(db.banca.oab)}"></label><p class="meta">Atalhos: J e K andam pela fila, E conclui o item, / vai para a busca, C abre o copiloto.</p></div></div>`],
};
let modo = db.ajustes.abrir || 'filas', painel = 'jurimetria';

// ------------------------------------------------------------------ desenho
function DESENHA() {
  document.querySelectorAll('[data-modo]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.modo === modo));
  $('#banca').textContent = db.banca.nome;
  document.documentElement.style.fontSize = db.ajustes.letra === 'grande' ? '112%' : '';
  const q = LIMPA($('#busca-j').value);
  if (modo === 'filas') {
    const fk = db.ajustes.fila, f = FILAS[fk];
    let lista = f.itens(); if (q) lista = lista.filter((i) => LIMPA(JSON.stringify(i) + (i.proc ? `${PROC(i.proc).cnj} ${CLI(PROC(i.proc).cli).nome}` : '')).includes(q));
    if (!lista.find((i) => i.id === selecionado)) selecionado = (lista.find((i) => !f.feito(i)) || lista[0])?.id;
    const atual = lista.find((i) => i.id === selecionado);
    $('#area').innerHTML = `<div class="tres"><nav class="filas" aria-label="Filas"><h2>Filas</h2>${Object.entries(FILAS).map(([k, x]) => `<button data-fila="${k}" aria-current="${k === fk}">${x.nome}<span class="n ${x.alerta() ? 'alerta' : ''}">${x.conta()}</span></button>`).join('')}<h2 style="margin-top:18px">Atalhos</h2><p class="meta" style="padding:0 10px">J/K anda · E conclui · / busca · C copiloto</p></nav>
      <section class="itens" aria-label="${f.nome}"><div class="itens-cab"><h1>${f.nome}</h1>${fk === 'tarefas' ? '<button class="bj mini" data-f="nova-tarefa">+ Tarefa</button>' : fk === 'horas' ? '<button class="bj mini" data-f="lancar-h">+ Horas</button>' : ''}</div>${lista.map((i) => { const [a, b, c] = f.linha(i); return `<button class="item ${f.feito(i) ? 'feito' : ''}" data-sel="${i.id}" aria-current="${i.id === selecionado}"><div class="l1"><span>${a}</span>${b}</div><div class="l2">${c}</div></button>`; }).join('') || '<p class="vazio-j">Fila vazia.</p>'}</section>
      <article class="detalhe" aria-live="polite">${atual ? f.detalhe(atual) : '<p class="vazio-j">Nada selecionado.</p>'}</article></div>`;
  } else {
    $('#area').innerHTML = `<div class="paineis"><nav class="painel-nav" aria-label="Painéis"><h2>Painéis</h2>${Object.entries(PAINEIS).map(([k, [t]]) => `<button data-painel="${k}" aria-current="${k === painel}">${t}</button>`).join('')}</nav><section class="painel">${PAINEIS[painel][1]()}</section></div>`;
  }
  document.title = `${modo === 'filas' ? FILAS[db.ajustes.fila].nome : PAINEIS[painel][0]} · Veltria Jurídico Avançado`;
}
function concluirAtual() { const f = FILAS[db.ajustes.fila], i = f.itens().find((x) => x.id === selecionado); if (!i || f.feito(i)) return; f.concluir(i); SALVA(); DESENHA(); NOTA('Feito. Próximo item da fila.'); }
function mover(d) { const f = FILAS[db.ajustes.fila], l = f.itens(), k = l.findIndex((i) => i.id === selecionado); const n = l[Math.max(0, Math.min(l.length - 1, k + d))]; if (n) { selecionado = n.id; DESENHA(); document.querySelector('.item[aria-current="true"]')?.scrollIntoView({ block: 'nearest' }); } }

// ------------------------------------------------------------------ copiloto
function COPILOTO() {
  const c = $('#copiloto'), sug = ['O que vence hoje e está sem revisão?', 'Qual tipo de ação mais perdemos?', 'Quanto o Banco Meridional precisa provisionar?', 'Quem está sobrecarregado?', 'Resuma a semana para os sócios'];
  c.hidden = false;
  c.innerHTML = `<header><b>Copiloto</b><button data-fecha-cop aria-label="Fechar">×</button></header><div class="conv">${(db.conversa.length ? db.conversa : [{ ia: 1, t: 'Leio as filas, a jurimetria, as provisões e o faturamento. Na versão contratada, 20 perguntas grátis por dia por usuário; aqui as respostas são de exemplo.' }]).map((m) => `<div class="m ${m.ia ? 'ia' : 'voce'}">${X(m.t)}</div>`).join('')}<div class="sugs">${sug.map((s) => `<button data-sug="${X(s)}">${X(s)}</button>`).join('')}</div></div><form id="f-cop"><input id="q-cop" placeholder="Pergunte" aria-label="Pergunta ao copiloto"><button class="bj ch">Enviar</button></form>`;
  c.querySelector('.conv').scrollTop = 1e6; $('#q-cop').focus();
}
function RESP(p) {
  const q = LIMPA(p);
  if (/vence|revis|hoje/.test(q)) { const l = db.prazos.filter((x) => x.status !== 'protocolado' && x.fatal <= 1); return l.length ? l.map((x) => `• ${x.desc} (${CLI(PROC(x.proc).cli).nome}) · ${x.status === 'revisao' ? `com ${ADV(x.revisor).nome} para revisar` : `ainda com ${ADV(x.resp).nome}, sem revisão`}`).join('\n') : 'Nada vence até amanhã.'; }
  if (/perd|tipo|exito/.test(q)) { const t = {}; db.processos.filter((x) => x.enc).forEach((x) => { (t[x.tipo] ||= [0, 0]); t[x.tipo][0]++; t[x.tipo][1] += x.exito ? 1 : 0; }); const pior = Object.entries(t).sort((a, b) => a[1][1] / a[1][0] - b[1][1] / b[1][0])[0]; return `O pior desempenho é em "${pior[0]}": ${PC(pior[1][1] / pior[1][0])} de êxito em ${pior[1][0]} casos. Vale rever a tese ou propor acordo cedo nesses processos.`; }
  if (/provis|meridional|banco/.test(q)) { const l = db.processos.filter((x) => x.cli === 'k1' && !x.enc && x.polo === 'passivo'); return `Banco Meridional: provisionar ${RS(l.filter((x) => x.risco === 'provavel').reduce((t, x) => t + x.valor, 0))} (provável) e divulgar ${RS(l.filter((x) => x.risco === 'possivel').reduce((t, x) => t + x.valor, 0))} (possível), em ${l.length} processos.`; }
  if (/sobrecarreg|carga|quem/.test(q)) { const c = db.advs.filter((a) => /Assoc/.test(a.cargo)).map((a) => [a, db.processos.filter((x) => !x.enc && x.resp === a.id).length]).sort((a, b) => b[1] - a[1]); return c.map(([a, n]) => `• ${a.nome}: ${n} processos ativos`).join('\n') + `\n\nSugestão: passar parte dos processos de ${c[0][0].nome} para ${c[c.length - 1][0].nome}.`; }
  if (/semana|resum|socio/.test(q)) return `Resumo: ${db.intimacoes.filter((i) => !i.triada).length} intimações a triar, ${db.prazos.filter((x) => x.status !== 'protocolado').length} prazos abertos (${db.prazos.filter((x) => x.status === 'revisao').length} em revisão), ${db.horas.filter((h) => h.status === 'pendente').length} lançamentos de horas a aprovar e ${db.conflitos.filter((c) => c.status === 'pendente').length} checagens de conflito pendentes.`;
  return 'Posso falar de prazos, jurimetria, provisões, carga da equipe ou faturamento.';
}

// ------------------------------------------------------------------ ações
const FAZ = {
  triar: (d) => { selecionado = d.id; concluirAtual(); },
  'int-prazo': (d) => { const i = db.intimacoes.find((x) => x.id === d.id); FORM('Gerar prazo', `<label class="cpo">O que fazer<input name="d" value="${/sentença/i.test(i.texto) ? 'Recurso de apelação' : /laudo/i.test(i.texto) ? 'Manifestação sobre o laudo' : 'Manifestação'}" required></label><div class="dois"><label class="cpo">Dias úteis<input name="n" type="number" value="${/5 dias/.test(i.texto) ? 5 : 15}"></label><label class="cpo">Revisor<select name="r">${opAdv('a1', (a) => /Sóci/.test(a.cargo))}</select></label></div>`, 'Criar prazo', (f) => { db.prazos.push({ id: NID(), proc: i.proc, desc: f.get('d'), fatal: Number(f.get('n')), resp: i.resp || PROC(i.proc).resp, revisor: f.get('r'), status: 'aberto' }); i.triada = true; LOG(`Criou prazo "${f.get('d')}" a partir de intimação`); NOTA('Prazo criado e intimação triada.'); }); },
  'avancar-prazo': (d) => { selecionado = d.id; concluirAtual(); },
  devolver: (d) => { const p = db.prazos.find((x) => x.id === d.id); p.status = 'aberto'; LOG(`Devolveu com ajustes: ${p.desc}`); SALVA(); DESENHA(); NOTA('Devolvido ao responsável com ajustes.'); },
  concluir: (d) => { selecionado = d.id; concluirAtual(); },
  'aprovar-h': (d) => { selecionado = d.id; concluirAtual(); },
  glosar: (d) => { const h = db.horas.find((x) => x.id === d.id); h.status = 'glosada'; LOG(`Glosou ${h.h} h de ${ADV(h.adv).nome}`); SALVA(); DESENHA(); },
  liberar: (d) => { selecionado = d.id; concluirAtual(); },
  recusar: (d) => { const c = db.conflitos.find((x) => x.id === d.id); c.status = 'recusado'; LOG(`Recusou o caso de ${c.nome} por conflito`); SALVA(); DESENHA(); },
  'nova-checagem': () => FORM('Checar conflito de interesses', '<label class="cpo">Nome ou CNPJ do possível cliente<input name="n" required></label>', 'Checar', (f) => { const n = LIMPA(f.get('n')), achou = db.processos.filter((p) => LIMPA(p.parte).includes(n)); db.conflitos.unshift({ id: NID(), nome: f.get('n'), motivo: achou.length ? `Aparece como parte contrária em ${achou.length} processo(s): ${achou.slice(0, 3).map((p) => p.cnj).join(', ')}` : 'Nenhum conflito encontrado nos processos da banca.', status: achou.length ? 'pendente' : 'liberado' }); db.ajustes.fila = 'conflitos'; NOTA(achou.length ? 'Atenção: possível conflito.' : 'Sem conflito.'); }),
  'nova-tarefa': () => FORM('Nova tarefa', `<label class="cpo">O que fazer<input name="d" required></label><div class="dois"><label class="cpo">Com quem<select name="r">${opAdv('a5')}</select></label><label class="cpo">Para daqui a (dias)<input name="v" type="number" value="2"></label></div>`, 'Criar', (f) => { db.tarefas.push({ id: NID(), desc: f.get('d'), resp: f.get('r'), vence: Number(f.get('v')), feita: false }); }),
  'lancar-h': () => FORM('Lançar horas', `<div class="dois"><label class="cpo">Quem<select name="a">${opAdv('a5', (a) => a.hora)}</select></label><label class="cpo">Cliente<select name="c">${db.clientes.map((c) => `<option value="${c.id}">${X(c.nome)}</option>`).join('')}</select></label></div><div class="dois"><label class="cpo">Horas<input name="h" inputmode="decimal" value="1"></label><label class="cpo">Atividade<input name="d" required></label></div>`, 'Lançar', (f) => { db.horas.push({ id: NID(), adv: f.get('a'), cli: f.get('c'), h: NUM(f.get('h')), desc: f.get('d'), dia: 0, status: 'pendente' }); }),
  'relatorio-prov': () => MODAL(`<h2>Relatório de contingências</h2><p class="meta">Pronto para o contador do cliente, com a classificação de cada processo.</p><div class="texto-int">${db.clientes.filter((c) => c.tipo === 'corporativo').map((c) => { const l = db.processos.filter((p) => p.cli === c.id && !p.enc && p.polo === 'passivo'); return `${X(c.nome)}: ${l.length} processos · provável ${RS(l.filter((p) => p.risco === 'provavel').reduce((t, p) => t + p.valor, 0))} · possível ${RS(l.filter((p) => p.risco === 'possivel').reduce((t, p) => t + p.valor, 0))}`; }).join('<br>')}</div><div class="rod"><button class="bj" data-x>Fechar</button><button class="bj gr" onclick="print()">Imprimir</button></div>`),
  'emitir-fat': () => { LOG('Emitiu as faturas do mês'); SALVA(); NOTA('Faturas geradas com o detalhe das horas. Na versão contratada saem com NFS-e e boleto/PIX.'); },
  'lote-resp': () => FORM('Redistribuir em lote', `<div class="dois"><label class="cpo">De<select name="de">${opAdv('a4', (a) => /Assoc/.test(a.cargo))}</select></label><label class="cpo">Para<select name="para">${opAdv('a6', (a) => /Assoc/.test(a.cargo))}</select></label></div><label class="cpo">Quantos processos<input name="n" type="number" value="5"></label>`, 'Redistribuir', (f) => { const l = db.processos.filter((p) => !p.enc && p.resp === f.get('de')).slice(0, Number(f.get('n'))); l.forEach((p) => { p.resp = f.get('para'); }); LOG(`Redistribuiu ${l.length} processos de ${ADV(f.get('de')).nome} para ${ADV(f.get('para')).nome}`); NOTA(`${l.length} processos redistribuídos.`); }),
  exportar: () => { const linhas = [['cnj', 'cliente', 'tipo', 'parte_contraria', 'valor', 'responsavel', 'risco', 'situacao'], ...db.processos.map((p) => [p.cnj, CLI(p.cli).nome, p.tipo, p.parte, p.valor, ADV(p.resp).nome, p.risco, p.enc ? 'encerrado' : 'ativo'])]; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + linhas.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })); a.download = 'carteira-processos.csv'; a.click(); URL.revokeObjectURL(a.href); LOG('Exportou a carteira de processos'); },
  convidar: () => { if (db.plano !== 'pro' && db.advs.length >= 12) return NOTA('No Básico são até 12 usuários neste exemplo. O Pro libera sem limite.'); FORM('Convidar usuário', '<div class="dois"><label class="cpo">Nome<input name="n" required></label><label class="cpo">E-mail<input name="e" type="email" required></label></div><label class="cpo">Cargo<select name="c"><option>Associado</option><option>Associada</option><option>Estagiário</option><option>Controladoria</option></select></label>', 'Convidar', (f) => { db.advs.push({ id: NID(), nome: f.get('n'), cargo: f.get('c'), hora: /Assoc/.test(f.get('c')) ? 320 : 0, rateio: 0 }); LOG(`Convidou ${f.get('e')} (${f.get('c')})`); NOTA('Convite enviado.'); }); },
  plano: (d) => { db.plano = d.v; LOG(`Mudou o plano para ${d.v}`); SALVA(); DESENHA(); },
};

document.addEventListener('click', (e) => {
  const t = e.target;
  const m = t.closest('[data-modo]'); if (m) { modo = m.dataset.modo; DESENHA(); return; }
  const fl = t.closest('[data-fila]'); if (fl) { db.ajustes.fila = fl.dataset.fila; selecionado = null; SALVA(); DESENHA(); return; }
  const pn = t.closest('[data-painel]'); if (pn) { painel = pn.dataset.painel; DESENHA(); return; }
  const sl = t.closest('[data-sel]'); if (sl) { selecionado = sl.dataset.sel; DESENHA(); return; }
  if (t.closest('[data-copiloto]')) { COPILOTO(); return; }
  if (t.closest('[data-fecha-cop]')) { $('#copiloto').hidden = true; return; }
  const sg = t.closest('[data-sug]'); if (sg) { $('#q-cop').value = sg.dataset.sug; $('#f-cop').requestSubmit(); return; }
  const f = t.closest('[data-f]'); if (f && FAZ[f.dataset.f]) FAZ[f.dataset.f](f.dataset);
});
document.addEventListener('submit', (e) => { if (e.target.id !== 'f-cop') return; e.preventDefault(); const p = $('#q-cop').value.trim(); if (p.length < 3) return; const resp = { ia: 1, t: window.veltriaIA ? 'Pensando…' : `${RESP(p)}\n\n(Exemplo da demonstração.)` }; db.conversa.push({ t: p }, resp); db.conversa = db.conversa.slice(-10); SALVA(); COPILOTO(); if (window.veltriaIA) window.veltriaIA(p).then((t) => { resp.t = t; SALVA(); COPILOTO(); }); });
document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.dataset.intResp) { const i = db.intimacoes.find((x) => x.id === t.dataset.intResp); i.resp = t.value; LOG(`Distribuiu intimação para ${ADV(t.value).nome}`); SALVA(); DESENHA(); NOTA(`Com ${ADV(t.value).nome}.`); }
  if (t.dataset.tarResp) { db.tarefas.find((x) => x.id === t.dataset.tarResp).resp = t.value; SALVA(); DESENHA(); }
  if (t.dataset.risco) { const p = PROC(t.dataset.risco); LOG(`Reclassificou o risco de ${p.cnj} de ${p.risco} para ${t.value}`); p.risco = t.value; SALVA(); DESENHA(); }
  if (t.dataset.rateio) { db.advs.find((a) => a.id === t.dataset.rateio).rateio = NUM(t.value); LOG('Alterou o rateio entre sócios'); SALVA(); DESENHA(); }
  if (t.dataset.aj) { db.ajustes[t.dataset.aj] = t.value; SALVA(); DESENHA(); }
  if (t.id === 'csv-massa' && t.files[0]) {
    const txt = await t.files[0].text(), linhas = txt.split(/\r?\n/).map((l) => l.split(/[;,]/)).filter((l) => l.length >= 2 && /\d{7}-\d{2}/.test(l[0]));
    linhas.forEach((l, i) => db.processos.push({ id: NID(), cnj: l[0].trim(), cli: 'k5', tipo: l[2]?.trim() || 'Ação de cobrança', vara: '—', resp: ['a4', 'a5', 'a6'][i % 3], polo: 'ativo', valor: NUM(l[3]), risco: 'possivel', enc: false, exito: null, meses: 0, parte: l[1]?.trim() || '—' }));
    LOG(`Importou ${linhas.length} processos por planilha`); SALVA(); DESENHA(); NOTA(linhas.length ? `${linhas.length} processos importados e distribuídos.` : 'Nenhuma linha com número CNJ válido na planilha.');
  }
});
document.addEventListener('input', (e) => { const t = e.target; if (t.id === 'busca-j') DESENHA(); if (t.dataset.banca) { db.banca[t.dataset.banca] = t.value; SALVA(); $('#banca').textContent = db.banca.nome; } if (t.dataset.meu !== undefined) { ADV(db.eu).nome = t.value; SALVA(); } });
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !e.target.closest('input, textarea, select')) { e.preventDefault(); $('#busca-j').focus(); return; }
  if (!e.target.closest || e.target.closest('input, textarea, select') || document.querySelector('.cortina') || e.ctrlKey || e.metaKey) return;
  if (modo === 'filas' && (e.key === 'j' || e.key === 'ArrowDown')) { e.preventDefault(); mover(1); }
  if (modo === 'filas' && (e.key === 'k' || e.key === 'ArrowUp')) { e.preventDefault(); mover(-1); }
  if (modo === 'filas' && (e.key === 'e' || e.key === 'E')) concluirAtual();
  if (e.key === 'c' || e.key === 'C') COPILOTO();
});
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = banca(); modo = 'filas'; selecionado = null; DESENHA(); NOTA('Demonstração recomeçada.'); });
DESENHA();
