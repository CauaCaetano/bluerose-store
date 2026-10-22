// Veltria CRM Completo · protótipo "funil com temperatura" para equipe comercial pequena (energia solar de exemplo).
// Funil arrastável em que cada negócio esfria conforme os dias sem contato, atividades do dia, propostas com
// aceite online, sequências de retorno, contatos, relatórios de conversão e perda, metas, equipe, ajustes e IA.
// O índice das seções fica na borda direita. Dados de exemplo neste navegador (?novo recomeça).

const CHAVE = 'veltria-crm-completo-v1';
const R$ = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const h = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nv = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const uid = () => `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const $ = (s) => document.querySelector(s);
const ha = (d) => (d === 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`);
const ETAPAS = [['lead', 'Lead'], ['visita', 'Visita técnica'], ['proposta', 'Proposta'], ['negociacao', 'Negociação'], ['fechado', 'Fechado']];
// temperatura pelo tempo sem contato
const temp = (d) => (d <= 2 ? ['quente', 'var(--quente)'] : d <= 6 ? ['morno', 'var(--morno)'] : ['esfriando', 'var(--frio)']);

function base() {
  const vend = [['v1', 'Camila'], ['v2', 'Rodrigo'], ['v3', 'Tiago']].map(([id, nome]) => ({ id, nome, meta: 180000 }));
  const D = (cliente, contato, valor, etapa, dono, sem, origem, kwp) => ({ id: uid(), cliente, contato, tel: '3199' + String(Math.abs(cliente.length * 7919) % 10000000).padStart(7, '0'), valor, etapa, dono, sem, origem, kwp, hist: [{ d: sem, t: 'Último contato registrado' }] });
  const deals = [
    D('Supermercado Ideal', 'Wagner', 186000, 'negociacao', 'v1', 1, 'Indicação', 92), D('Fazenda Boa Esperança', 'Sr. Antônio', 142000, 'proposta', 'v2', 8, 'Google', 70), D('Condomínio Jardins', 'Síndica Lúcia', 98000, 'proposta', 'v1', 3, 'Site', 48),
    D('Padaria Pão de Mel', 'Rita', 38500, 'visita', 'v3', 2, 'Instagram', 18), D('Clínica OdontoMais', 'Dr. Felipe', 46200, 'negociacao', 'v2', 5, 'Indicação', 22), D('Residência Martins', 'Paula Martins', 27800, 'lead', 'v3', 0, 'Site', 12),
    D('Escola Caminho Feliz', 'Diretora Sônia', 64000, 'visita', 'v1', 9, 'Feira', 31), D('Oficina Turbo', 'Marcão', 31900, 'lead', 'v2', 4, 'WhatsApp', 15), D('Hotel Serra Azul', 'Gerente Paulo', 212000, 'lead', 'v1', 12, 'Google', 104),
    D('Laticínios Minas Leite', 'Eng. Bruno', 356000, 'proposta', 'v3', 6, 'Indicação', 175), D('Residência Costa', 'André Costa', 24300, 'fechado', 'v3', 0, 'Instagram', 11), D('Academia Força Total', 'Kelly', 52700, 'fechado', 'v2', 3, 'Site', 25),
    D('Igreja Batista Central', 'Pastor Júlio', 73400, 'negociacao', 'v3', 15, 'Feira', 36), D('Residência Freitas', 'Marina Freitas', 21900, 'visita', 'v2', 1, 'Instagram', 10),
  ];
  const perdidos = [['Mercearia São José', 'Preço'], ['Residência Lopes', 'Financiamento negado'], ['Posto Estrela', 'Comprou do concorrente'], ['Residência Neves', 'Preço'], ['Distribuidora Real', 'Sem resposta']].map(([cliente, motivo]) => ({ cliente, motivo }));
  const atividades = [['Ligar para o Sr. Antônio (fazenda)', 'v2', 0, 'ligar'], ['Visita técnica Padaria Pão de Mel 14h', 'v3', 0, 'visita'], ['Mandar simulação de financiamento ao Wagner', 'v1', 0, 'email'], ['Retorno da Síndica Lúcia', 'v1', -1, 'ligar'], ['Reunião com o Eng. Bruno', 'v3', 1, 'reuniao']].map(([t, dono, dia, tipo]) => ({ id: uid(), t, dono, dia, tipo, feito: false }));
  const propostas = [{ id: uid(), cliente: 'Fazenda Boa Esperança', valor: 142000, st: 'aberta', viu: 3, enviada: 8 }, { id: uid(), cliente: 'Condomínio Jardins', valor: 98000, st: 'aberta', viu: 1, enviada: 3 }, { id: uid(), cliente: 'Laticínios Minas Leite', valor: 356000, st: 'aberta', viu: 0, enviada: 6 }, { id: uid(), cliente: 'Academia Força Total', valor: 52700, st: 'aceita', viu: 4, enviada: 10 }];
  const sequencias = [{ id: 's1', nome: 'Depois da proposta', passos: [[1, 'WhatsApp: "Conseguiu olhar a proposta?"'], [3, 'Ligação: tirar dúvidas do financiamento'], [7, 'WhatsApp: estudo de economia na conta de luz'], [14, 'E-mail: última condição do mês']], ativos: 3, ligada: true }, { id: 's2', nome: 'Lead que não respondeu', passos: [[0, 'WhatsApp de boas-vindas'], [2, 'Ligação'], [5, 'WhatsApp com vídeo de instalação']], ativos: 2, ligada: true }];
  return { empresa: 'Solaris Energia Solar', vend, deals, perdidos, atividades, propostas, sequencias, filtro: 'todos', plano: 'basico', conversa: [] };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || base(); } catch { return base(); } })();
const salva = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { nota('Sem espaço no navegador.'); } };
const deal = (id) => db.deals.find((d) => d.id === id);
const vend = (id) => db.vend.find((v) => v.id === id) || { nome: '—' };
const visiveis = () => db.deals.filter((d) => db.filtro === 'todos' || d.dono === db.filtro);
const abertosV = () => visiveis().filter((d) => d.etapa !== 'fechado');

function nota(t) { const a = document.createElement('div'); a.className = 'nota'; a.textContent = t; $('#notas').append(a); setTimeout(() => a.remove(), 3300); }
function janela(html, liga) {
  const v = document.createElement('div'); v.className = 'sombra'; v.innerHTML = `<div class="janela" role="dialog" aria-modal="true">${html}</div>`;
  const ant = document.activeElement; document.body.append(v);
  const fecha = () => { v.remove(); ant?.focus?.(); };
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-sair]')) fecha(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); });
  setTimeout(() => (v.querySelector('textarea, input, select') || v.querySelector('button'))?.focus(), 30);
  liga?.(v.querySelector('.janela'), fecha);
}
function form(t, campos, ok, fn) { janela(`<h2>${t}</h2><form>${campos}<div class="pe"><button type="button" class="bt" data-sair>Cancelar</button><button class="bt o">${ok}</button></div></form>`, (j, fecha) => j.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); if (fn(new FormData(e.target)) !== false) { salva(); fecha(); tela(); } })); }
const filtroSel = () => `<select class="filtro" data-filtro aria-label="Vendedor"><option value="todos">Toda a equipe</option>${db.vend.map((v) => `<option value="${v.id}" ${db.filtro === v.id ? 'selected' : ''}>${h(v.nome)}</option>`).join('')}</select>`;
function moverPara(id, etapa) { const d = deal(id); if (!d || d.etapa === etapa) return; const de = d.etapa; d.etapa = etapa; d.sem = 0; d.hist.unshift({ d: 0, t: `Moveu de ${ETAPAS.find((e) => e[0] === de)[1]} para ${ETAPAS.find((e) => e[0] === etapa)[1]}` }); salva(); tela(); nota(etapa === 'fechado' ? `${d.cliente}: ${R$(d.valor)} fechados!` : `${d.cliente} em ${ETAPAS.find((e) => e[0] === etapa)[1]}.`); }

// ------------------------------------------------------------------ seções
const SECOES = [['funil', 'Funil'], ['atividades', 'Atividades'], ['propostas', 'Propostas'], ['sequencias', 'Sequências'], ['contatos', 'Contatos'], ['relatorios', 'Relatórios'], ['metas', 'Metas'], ['equipe', 'Equipe'], ['ajustes', 'Ajustes']];
const S = {
  funil() {
    const l = visiveis(), conta = ETAPAS.map(([k]) => l.filter((d) => d.etapa === k)), total = l.length || 1;
    return `<div class="cab"><div><h1>Funil</h1><p>Arraste o negócio para a próxima fase (ou use as setas). A cor da borda mostra a temperatura: há quantos dias ninguém fala com o cliente.</p></div><div class="grupo">${filtroSel()}<button class="bt o" data-a="novo">+ Negócio</button></div></div>
      <div class="funil-faixa" style="--n:${ETAPAS.length}">${ETAPAS.map(([, n], i) => `<div><small>${n}</small><b>${conta[i].length} · ${R$(conta[i].reduce((s, d) => s + d.valor, 0))}</b>${i ? `<small>${Math.round(conta.slice(i).reduce((s, c) => s + c.length, 0) / conta.slice(i - 1).reduce((s, c) => s + c.length, 0) * 100)}% passam</small>` : `<small>${Math.round(conta[0].length / total * 100)}% do total</small>`}</div>`).join('')}</div>
      <div class="legenda-t"><span style="--c:var(--quente)">quente: falou nos últimos 2 dias</span><span style="--c:var(--morno)">morno: 3 a 6 dias</span><span style="--c:var(--frio)">esfriando: 7 dias ou mais</span></div>
      <div class="quadro" style="--n:${ETAPAS.length}">${ETAPAS.map(([k, n], i) => `<section class="raia" data-raia="${k}" aria-label="${n}"><h2>${n}<small>${R$(conta[i].reduce((s, d) => s + d.valor, 0))}</small></h2>${conta[i].map((d) => { const [tn, tc] = temp(d.sem); return `<article class="negocio" draggable="true" data-deal="${d.id}" style="--temp:${d.etapa === 'fechado' ? 'var(--ganho)' : tc}"><b>${h(d.cliente)}</b><small>${h(d.contato)} · ${d.kwp} kWp · ${h(vend(d.dono).nome)}</small><div class="linha-n"><span class="m">${R$(d.valor)}</span>${d.etapa === 'fechado' ? '<span class="temp">ganho</span>' : `<span class="temp">${tn} · ${ha(d.sem)}</span>`}</div>${d.etapa === 'fechado' ? '' : `<div class="linha-n"><button class="bt x" data-abrir="${d.id}">Abrir</button><span class="mover">${i ? `<button type="button" data-mv="${d.id}" data-para="${ETAPAS[i - 1][0]}" aria-label="Voltar fase">‹</button>` : ''}<button type="button" data-mv="${d.id}" data-para="${ETAPAS[i + 1][0]}" aria-label="Avançar fase">›</button></span></div>`}</article>`; }).join('') || '<p class="vaz">Solte aqui.</p>'}</section>`).join('')}</div>`;
  },
  atividades() {
    const l = db.atividades.filter((a) => db.filtro === 'todos' || a.dono === db.filtro).sort((a, b) => a.feito - b.feito || a.dia - b.dia), ico = { ligar: 'Ligar', visita: 'Visita', email: 'E-mail', reuniao: 'Reunião' };
    return `<div class="cab"><div><h1>Atividades</h1><p>${l.filter((a) => !a.feito && a.dia <= 0).length} para hoje ou atrasadas.</p></div><div class="grupo">${filtroSel()}<button class="bt o" data-a="nova-ativ">+ Atividade</button></div></div>
      <section class="bl rolo"><table><thead><tr><th></th><th>O quê</th><th>Tipo</th><th>Quem</th><th>Quando</th></tr></thead><tbody>${l.map((a) => `<tr><td><input type="checkbox" data-ativ="${a.id}" ${a.feito ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--oc)" aria-label="Feito"></td><td>${a.feito ? `<s class="vaz">${h(a.t)}</s>` : h(a.t)}</td><td><span class="selo">${ico[a.tipo]}</span></td><td>${h(vend(a.dono).nome)}</td><td>${a.dia < 0 ? `<span class="selo ru">atrasada</span>` : a.dia === 0 ? '<span class="selo at">hoje</span>' : 'amanhã'}</td></tr>`).join('')}</tbody></table></section>`;
  },
  propostas() {
    return `<div class="cab"><div><h1>Propostas</h1><p>O cliente abre pelo link, vê a economia na conta de luz e aceita online. Você sabe quando ele abriu.</p></div><button class="bt o" data-a="nova-prop">+ Proposta</button></div>
      <section class="bl rolo"><table><thead><tr><th>Cliente</th><th class="dir">Valor</th><th>Enviada</th><th>Abriu</th><th>Situação</th><th></th></tr></thead><tbody>${db.propostas.map((p) => `<tr><td><b>${h(p.cliente)}</b></td><td class="dir">${R$(p.valor)}</td><td>${ha(p.enviada)}</td><td>${p.viu ? `${p.viu}× ${p.viu >= 3 ? '<span class="selo q">interessado</span>' : ''}` : '<span class="selo ru">não abriu</span>'}</td><td><span class="selo ${p.st === 'aceita' ? 'ok' : 'at'}">${p.st}</span></td><td>${p.st === 'aberta' ? `<button class="bt x" data-a="ver-prop" data-id="${p.id}">Ver como o cliente</button>` : ''}</td></tr>`).join('')}</tbody></table></section>`;
  },
  sequencias() {
    return `<div class="cab"><div><h1>Sequências de retorno</h1><p>Uma vez ligada, o sistema lembra o vendedor (ou manda sozinho, se você deixar) cada passo no dia certo.</p></div><button class="bt o" data-a="nova-seq">+ Sequência</button></div>
      <div class="grade">${db.sequencias.map((s) => `<section class="bl g6"><h2 style="display:flex;justify-content:space-between">${h(s.nome)}<label style="font-size:.82rem;font-weight:500"><input type="checkbox" data-seq="${s.id}" ${s.ligada ? 'checked' : ''} style="accent-color:var(--oc)"> ligada</label></h2><div class="passos-s">${s.passos.map(([d, t]) => `<span><b>D+${d}</b>${h(t)}</span>`).join('')}</div><p class="vaz" style="margin:10px 0 0">${s.ativos} negócio(s) dentro dela agora.</p></section>`).join('')}</div>`;
  },
  contatos() {
    return `<div class="cab"><div><h1>Contatos</h1><p>Toda a base, com a origem do contato.</p></div></div><section class="bl rolo"><table><thead><tr><th>Cliente</th><th>Contato</th><th>Origem</th><th>Vendedor</th><th class="dir">Negócio</th></tr></thead><tbody>${[...db.deals].sort((a, b) => a.cliente.localeCompare(b.cliente)).map((d) => `<tr><td><b>${h(d.cliente)}</b></td><td>${h(d.contato)}</td><td><span class="selo">${h(d.origem)}</span></td><td>${h(vend(d.dono).nome)}</td><td class="dir">${R$(d.valor)}</td></tr>`).join('')}</tbody></table></section>`;
  },
  relatorios() {
    const fech = db.deals.filter((d) => d.etapa === 'fechado'), perd = db.perdidos, conv = fech.length / (fech.length + perd.length), motivos = {}; perd.forEach((p) => { motivos[p.motivo] = (motivos[p.motivo] || 0) + 1; });
    const origem = {}; db.deals.forEach((d) => { origem[d.origem] = (origem[d.origem] || 0) + d.valor; }); const mo = Math.max(...Object.values(origem));
    return `<div class="cab"><div><h1>Relatórios</h1><p>Mês corrente.</p></div></div>
      <div class="grade"><div class="bl g3 kpi"><small>Fechado</small><b>${R$(fech.reduce((s, d) => s + d.valor, 0))}</b></div><div class="bl g3 kpi"><small>Taxa de fechamento</small><b>${Math.round(conv * 100)}%</b></div><div class="bl g3 kpi"><small>Ticket médio</small><b>${R$(fech.reduce((s, d) => s + d.valor, 0) / (fech.length || 1))}</b></div><div class="bl g3 kpi"><small>Esfriando</small><b>${db.deals.filter((d) => d.etapa !== 'fechado' && d.sem >= 7).length}</b></div>
      <section class="bl g6"><h2>Por que perdemos</h2><div class="barras">${Object.entries(motivos).sort((a, b) => b[1] - a[1]).map(([m, n]) => `<div class="l"><span>${h(m)}</span><span class="t"><i style="width:${n / perd.length * 100}%;--c:var(--perda)"></i></span><b class="dir">${n}</b></div>`).join('')}</div></section>
      <section class="bl g6"><h2>De onde vêm os negócios</h2><div class="barras">${Object.entries(origem).sort((a, b) => b[1] - a[1]).map(([o, v]) => `<div class="l"><span>${h(o)}</span><span class="t"><i style="width:${v / mo * 100}%"></i></span><b class="dir">${R$(v)}</b></div>`).join('')}</div></section></div>`;
  },
  metas() {
    return `<div class="cab"><div><h1>Metas do mês</h1><p>Fechado mais o que está em negociação, ponderado pela chance de cada fase.</p></div></div><section class="bl rolo"><table><thead><tr><th>Vendedor</th><th class="dir">Meta</th><th class="dir">Fechado</th><th class="dir">Em negociação</th><th style="width:30%">Andamento</th></tr></thead><tbody>${db.vend.map((v) => { const f = db.deals.filter((d) => d.dono === v.id && d.etapa === 'fechado').reduce((s, d) => s + d.valor, 0), ng = db.deals.filter((d) => d.dono === v.id && d.etapa === 'negociacao').reduce((s, d) => s + d.valor, 0); return `<tr><td><b>${h(v.nome)}</b></td><td class="dir"><input data-meta="${v.id}" value="${v.meta}" style="width:96px;text-align:right" aria-label="Meta de ${h(v.nome)}"></td><td class="dir">${R$(f)}</td><td class="dir">${R$(ng)}</td><td><div class="barras"><div class="l" style="grid-template-columns:1fr 50px"><span class="t"><i style="width:${Math.min(100, (f + ng * 0.6) / v.meta * 100)}%"></i></span><b class="dir">${Math.round((f + ng * 0.6) / v.meta * 100)}%</b></div></div></td></tr>`; }).join('')}</tbody></table></section>`;
  },
  equipe() {
    const pr = db.plano === 'pro' ? 159 : 99;
    return `<div class="cab"><div><h1>Equipe</h1><p>Painel do dono: vendedor vê os próprios negócios; a gestora vê todos.</p></div><button class="bt o" data-a="novo-vend">+ Vendedor</button></div>
      <div class="grade"><section class="bl g7 rolo"><table><thead><tr><th>Pessoa</th><th>Vê</th><th>Pode</th></tr></thead><tbody><tr><td><b>Você (gestora)</b></td><td>tudo</td><td>tudo, inclusive passar negócio de um vendedor para outro</td></tr>${db.vend.map((v) => `<tr><td>${h(v.nome)}</td><td>os próprios negócios</td><td>mover, propor, registrar atividades</td></tr>`).join('')}</tbody></table></section>
      <section class="bl g5"><h2>Plano</h2><p>${db.plano === 'pro' ? 'Pro' : 'Básico'} · <b>${R$(pr)}/mês</b></p><div class="grupo"><button class="bt ${db.plano === 'basico' ? 'o' : ''}" data-a="plano" data-v="basico">Básico · R$ 99</button><button class="bt ${db.plano === 'pro' ? 'o' : ''}" data-a="plano" data-v="pro">Pro · R$ 159</button></div><p class="vaz">Básico: você + 5 pessoas. Pro: sem limite, histórico de quem fez o quê e até 10 empresas. Anual com 20% a menos. Sem fidelidade.</p></section></div>`;
  },
  ajustes() { return `<div class="cab"><div><h1>Ajustes</h1></div></div><section class="bl" style="max-width:640px"><label class="cmp">Nome da empresa<input data-aj="empresa" value="${h(db.empresa)}"></label><p class="vaz">Fases do funil: ${ETAPAS.map((e) => e[1]).join(' → ')}. Na versão contratada você muda os nomes e a ordem, liga o WhatsApp da empresa e importa a planilha de contatos.</p></section>`; },
};

function tela() {
  const r = location.hash.slice(1) || 'funil', n = { atividades: db.atividades.filter((a) => !a.feito && a.dia <= 0).length, funil: db.deals.filter((d) => d.etapa !== 'fechado' && d.sem >= 7).length };
  $('#indice').innerHTML = SECOES.map(([k, t]) => `<a href="#${k}" ${k === r ? 'aria-current="page"' : ''}>${t}${n[k] ? `<span class="n">${n[k]}</span>` : ''}</a>`).join('') + '<button type="button" class="ia-ind" data-ia>Assistente</button>';
  const ab = abertosV();
  $('#resumo-c').innerHTML = `<div><small>Em aberto</small><b>${R$(ab.reduce((s, d) => s + d.valor, 0))}</b></div><div><small>Fechado no mês</small><b>${R$(visiveis().filter((d) => d.etapa === 'fechado').reduce((s, d) => s + d.valor, 0))}</b></div>`;
  $('#empresa').textContent = db.empresa; $('#quem').textContent = db.filtro === 'todos' ? 'visão da gestora' : `vendo como ${vend(db.filtro).nome}`;
  $('#obra').innerHTML = (S[r] || S.funil)();
  document.title = `${(SECOES.find(([k]) => k === r) || SECOES[0])[1]} · Veltria CRM Completo`;
}
addEventListener('hashchange', () => { tela(); $('#obra').focus({ preventScroll: true }); scrollTo(0, 0); });

function abrir(id) {
  const d = deal(id), [tn] = temp(d.sem);
  janela(`<h2>${h(d.cliente)}</h2><p class="vaz">${h(d.contato)} · ${d.kwp} kWp · ${R$(d.valor)} · ${h(vend(d.dono).nome)} · ${tn}</p><div class="grupo" style="margin-bottom:12px"><a class="bt s" target="_blank" rel="noopener" href="https://wa.me/55${d.tel}?text=${encodeURIComponent(`Olá, ${d.contato}! Aqui é da ${db.empresa}. Tudo certo para seguirmos com o projeto?`)}" data-contato>WhatsApp</a><button class="bt" data-reg>Registrar contato</button><label class="cmp" style="margin:0">Vendedor<select data-dono>${db.vend.map((v) => `<option value="${v.id}" ${v.id === d.dono ? 'selected' : ''}>${h(v.nome)}</option>`).join('')}</select></label></div>
    <h2 style="font-size:1rem">Histórico</h2><ul class="linha-tempo">${d.hist.map((x) => `<li>${h(x.t)} <span class="vaz">· ${ha(x.d)}</span></li>`).join('')}</ul><div class="pe"><button class="bt" data-perder>Perdemos</button><button class="bt o" data-sair>Fechar</button></div>`, (j, fecha) => {
    const contato = (t) => { d.sem = 0; d.hist.unshift({ d: 0, t }); salva(); fecha(); tela(); nota('Contato registrado: o negócio esquentou.'); };
    j.querySelector('[data-contato]').addEventListener('click', () => setTimeout(() => contato('Mensagem no WhatsApp'), 100));
    j.querySelector('[data-reg]').addEventListener('click', () => contato('Ligação registrada'));
    j.querySelector('[data-dono]').addEventListener('change', (e) => { d.dono = e.target.value; d.hist.unshift({ d: 0, t: `Passou para ${vend(d.dono).nome}` }); salva(); tela(); });
    j.querySelector('[data-perder]').addEventListener('click', () => { j.innerHTML = `<h2>Por que perdemos ${h(d.cliente)}?</h2><div class="grupo">${['Preço', 'Financiamento negado', 'Comprou do concorrente', 'Sem resposta', 'Desistiu'].map((m) => `<button class="bt" data-m="${m}">${m}</button>`).join('')}</div>`; j.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { db.perdidos.push({ cliente: d.cliente, motivo: b.dataset.m }); db.deals = db.deals.filter((x) => x !== d); salva(); fecha(); tela(); nota('Registrado nos motivos de perda.'); })); });
  });
}
function painel() {
  const p = $('#painel-ia'); p.hidden = false;
  const ms = db.conversa.length ? db.conversa : [{ ia: 1, t: 'Vejo o funil, as atividades, as propostas e as metas. Na versão contratada, 20 perguntas grátis por dia; aqui as respostas são de exemplo.' }];
  p.innerHTML = `<header><b>Assistente comercial</b><button type="button" data-fecha-p aria-label="Fechar">×</button></header><div class="msgs">${ms.map((m) => `<div class="msg ${m.ia ? 'ia' : 'eu'}">${h(m.t)}</div>`).join('')}<div class="sug">${['O que está esfriando?', 'Vamos bater a meta?', 'Por que estamos perdendo?', 'Escreva o retorno da Fazenda Boa Esperança'].map((s) => `<button type="button" data-sug="${h(s)}">${h(s)}</button>`).join('')}</div></div><form id="f-p"><input id="q-p" placeholder="Pergunte" aria-label="Pergunta"><button class="bt o">Enviar</button></form>`;
  p.querySelector('.msgs').scrollTop = 1e6; $('#q-p').focus();
}
function responde(q) {
  const x = sa(q);
  if (/esfri|frio|parad/.test(x)) { const l = db.deals.filter((d) => d.etapa !== 'fechado' && d.sem >= 7).sort((a, b) => b.valor - a.valor); return l.length ? `Esfriando (7+ dias sem contato):\n${l.map((d) => `• ${d.cliente}: ${R$(d.valor)}, ${d.sem} dias, com ${vend(d.dono).nome}`).join('\n')}\nO maior é ${l[0].cliente}: vale a gestora ligar.` : 'Nada esfriando.'; }
  if (/meta|bater/.test(x)) { const f = db.deals.filter((d) => d.etapa === 'fechado').reduce((s, d) => s + d.valor, 0), ng = db.deals.filter((d) => d.etapa === 'negociacao').reduce((s, d) => s + d.valor, 0), m = db.vend.reduce((s, v) => s + v.meta, 0); return `Meta da equipe: ${R$(m)}. Fechado: ${R$(f)}. Em negociação: ${R$(ng)}. Fechando 60% da negociação, chega a ${Math.round((f + ng * 0.6) / m * 100)}% da meta. O Laticínios (${R$(356000)}) em proposta decide o mês.`; }
  if (/perd|motivo/.test(x)) return 'Preço é o motivo número 1. Duas das perdas por preço foram residências pequenas: ofereça o financiamento em 60 vezes já na primeira proposta, e mostre a economia por mês em vez do valor total.';
  if (/fazenda|retorno|escrev|mensag/.test(x)) return 'Mensagem pronta:\n\n"Sr. Antônio, bom dia! Vi que o senhor abriu a proposta três vezes. Ficou alguma dúvida sobre o financiamento rural? Consigo passar aí na quinta com o engenheiro para mostrar o projeto no telhado do galpão."';
  return `Em aberto: ${R$(db.deals.filter((d) => d.etapa !== 'fechado').reduce((s, d) => s + d.valor, 0))} em ${db.deals.filter((d) => d.etapa !== 'fechado').length} negócios.`;
}

const A = {
  novo: () => form('Novo negócio', `<div class="duas"><label class="cmp">Cliente<input name="c" required></label><label class="cmp">Contato<input name="p" required></label></div><div class="duas"><label class="cmp">Valor (R$)<input name="v" inputmode="decimal" required></label><label class="cmp">Potência (kWp)<input name="k" type="number" value="10"></label></div><div class="duas"><label class="cmp">Vendedor<select name="d">${db.vend.map((v) => `<option value="${v.id}">${h(v.nome)}</option>`).join('')}</select></label><label class="cmp">Origem<select name="o"><option>Site</option><option>Instagram</option><option>Google</option><option>Indicação</option><option>WhatsApp</option><option>Feira</option></select></label></div>`, 'Criar', (f) => { db.deals.push({ id: uid(), cliente: f.get('c'), contato: f.get('p'), tel: '', valor: nv(f.get('v')), etapa: 'lead', dono: f.get('d'), sem: 0, origem: f.get('o'), kwp: Number(f.get('k')), hist: [{ d: 0, t: 'Negócio criado' }] }); nota('Negócio criado e sequência "Lead que não respondeu" ligada.'); }),
  'nova-ativ': () => form('Nova atividade', `<label class="cmp">O quê<input name="t" required></label><div class="duas"><label class="cmp">Tipo<select name="y"><option value="ligar">Ligar</option><option value="visita">Visita</option><option value="email">E-mail</option><option value="reuniao">Reunião</option></select></label><label class="cmp">Quem<select name="d">${db.vend.map((v) => `<option value="${v.id}">${h(v.nome)}</option>`).join('')}</select></label></div>`, 'Criar', (f) => { db.atividades.push({ id: uid(), t: f.get('t'), tipo: f.get('y'), dono: f.get('d'), dia: 0, feito: false }); }),
  'nova-prop': () => form('Nova proposta', `<label class="cmp">Negócio<select name="d">${db.deals.filter((d) => d.etapa !== 'fechado').map((d) => `<option value="${d.id}">${h(d.cliente)} · ${R$(d.valor)}</option>`).join('')}</select></label><p class="vaz">A proposta sai com o desenho do sistema, a economia por mês e a simulação de financiamento.</p>`, 'Gerar e enviar link', (f) => { const d = deal(f.get('d')); db.propostas.unshift({ id: uid(), cliente: d.cliente, valor: d.valor, st: 'aberta', viu: 0, enviada: 0 }); if (['lead', 'visita'].includes(d.etapa)) d.etapa = 'proposta'; d.sem = 0; nota('Proposta enviada. Você é avisado quando o cliente abrir.'); }),
  'ver-prop': (dd) => { const p = db.propostas.find((x) => x.id === dd.id); janela(`<p class="vaz">Assim o cliente vê pelo link, sem senha:</p><h2>${h(db.empresa)} · proposta</h2><p><b>${h(p.cliente)}</b></p><p class="m" style="font-size:1.5rem;margin:0">${R$(p.valor)}</p><p class="vaz">ou 60× de ${R$(p.valor / 60 * 1.35)} · economia estimada de ${R$(p.valor / 60 * 1.6)} por mês na conta de luz</p><div class="pe"><button class="bt" data-sair>Fechar</button><button class="bt o" data-aceita>Aceitar como o cliente</button></div>`, (j, fecha) => j.querySelector('[data-aceita]').addEventListener('click', () => { p.st = 'aceita'; const d = db.deals.find((x) => x.cliente === p.cliente); if (d) { d.etapa = 'fechado'; d.sem = 0; d.hist.unshift({ d: 0, t: 'Proposta aceita online' }); } salva(); fecha(); tela(); nota(`${p.cliente} aceitou ${R$(p.valor)}!`); })); },
  'nova-seq': () => form('Nova sequência', '<label class="cmp">Nome<input name="n" required value="Pós-visita técnica"></label><p class="vaz">Começa com 3 passos (D+1 WhatsApp, D+3 ligação, D+7 e-mail) que você edita depois.</p>', 'Criar', (f) => { db.sequencias.push({ id: uid(), nome: f.get('n'), passos: [[1, 'WhatsApp'], [3, 'Ligação'], [7, 'E-mail']], ativos: 0, ligada: false }); }),
  'novo-vend': () => form('Novo vendedor', '<label class="cmp">Nome<input name="n" required></label><label class="cmp">Meta do mês (R$)<input name="m" inputmode="decimal" value="150000"></label>', 'Convidar', (f) => { if (db.plano !== 'pro' && db.vend.length >= 5) { nota('No Básico são até 6 pessoas. O Pro libera sem limite.'); return false; } db.vend.push({ id: uid(), nome: f.get('n'), meta: nv(f.get('m')) }); nota('Convite enviado.'); }),
  plano: (d) => { db.plano = d.v; salva(); tela(); },
};

let arrastado = null;
document.addEventListener('dragstart', (e) => { const c = e.target.closest?.('[data-deal]'); if (!c) return; arrastado = c.dataset.deal; c.classList.add('arrastando'); e.dataTransfer.setData('text/plain', arrastado); e.dataTransfer.effectAllowed = 'move'; });
document.addEventListener('dragend', (e) => { e.target.closest?.('[data-deal]')?.classList.remove('arrastando'); document.querySelectorAll('.raia.sobre').forEach((r) => r.classList.remove('sobre')); });
document.addEventListener('dragover', (e) => { const r = e.target.closest?.('[data-raia]'); if (!r || !arrastado) return; e.preventDefault(); document.querySelectorAll('.raia.sobre').forEach((x) => x !== r && x.classList.remove('sobre')); r.classList.add('sobre'); });
document.addEventListener('drop', (e) => { const r = e.target.closest?.('[data-raia]'); if (!r || !arrastado) return; e.preventDefault(); const id = arrastado; arrastado = null; moverPara(id, r.dataset.raia); });
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-ia]')) { painel(); return; }
  if (t.closest('[data-fecha-p]')) { $('#painel-ia').hidden = true; return; }
  const sg = t.closest('[data-sug]'); if (sg) { $('#q-p').value = sg.dataset.sug; $('#f-p').requestSubmit(); return; }
  const mv = t.closest('[data-mv]'); if (mv) { moverPara(mv.dataset.mv, mv.dataset.para); return; }
  const ab = t.closest('[data-abrir]'); if (ab) { abrir(ab.dataset.abrir); return; }
  const a = t.closest('[data-a]'); if (a && A[a.dataset.a]) A[a.dataset.a](a.dataset);
});
document.addEventListener('submit', (e) => { if (e.target.id !== 'f-p') return; e.preventDefault(); const q = $('#q-p').value.trim(); if (q.length < 3) return; db.conversa.push({ t: q }, { ia: 1, t: `${responde(q)}\n\n(Exemplo da demonstração.)` }); db.conversa = db.conversa.slice(-10); salva(); painel(); });
document.addEventListener('change', (e) => {
  const t = e.target, d = t.dataset;
  if ('filtro' in d) { db.filtro = t.value; salva(); tela(); }
  if (d.ativ) { db.atividades.find((a) => a.id === d.ativ).feito = t.checked; salva(); tela(); }
  if (d.seq) { db.sequencias.find((s) => s.id === d.seq).ligada = t.checked; salva(); nota(t.checked ? 'Sequência ligada.' : 'Sequência desligada.'); }
  if (d.meta) { db.vend.find((v) => v.id === d.meta).meta = nv(t.value); salva(); tela(); }
  if (d.aj) { db[d.aj] = t.value; salva(); tela(); }
});
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = base(); location.hash = '#funil'; $('#painel-ia').hidden = true; tela(); nota('Demonstração recomeçada.'); });
tela();
