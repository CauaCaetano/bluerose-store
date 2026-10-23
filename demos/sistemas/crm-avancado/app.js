// Veltria CRM Avançado · protótipo "torre de controle" para operação comercial com SDRs e closers (software B2B de exemplo).
// Previsão do trimestre contra a meta (cone de commit e melhor caso), cadências multicanal com a fila do SDR,
// pontuação de leads com regras editáveis, distribuição automática com prazo de primeiro contato, ganhos e perdas,
// times, playbook, auditoria, equipe e ajustes. Busca de comandos com Ctrl K, que também responde perguntas.

const CHAVE = 'veltria-crm-avancado-v1';
const R$ = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const k$ = (v) => `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;
const e = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nv = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const uid = () => `x${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const $ = (s) => document.querySelector(s);
const agora = () => new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function gerar() {
  const pessoas = [['s1', 'Bruna', 'SDR', 'Sudeste'], ['s2', 'Igor', 'SDR', 'Sul'], ['s3', 'Nathalia', 'SDR', 'Nordeste e Centro'], ['c1', 'Fernando', 'Closer', 'Grandes contas'], ['c2', 'Mariana', 'Closer', 'Médias'], ['c3', 'Otávio', 'Closer', 'Médias']].map(([id, nome, papel, area]) => ({ id, nome, papel, area }));
  const deals = [['Grupo Vitalle Saúde', 420000, 'nov', 'commit', 'c1', 80], ['Rede Farmapop', 186000, 'nov', 'commit', 'c2', 75], ['Construtora Pilar', 98000, 'nov', 'melhor', 'c3', 50], ['Cooperativa Agrovale', 264000, 'dez', 'melhor', 'c1', 45], ['Escolas Integra', 132000, 'nov', 'commit', 'c2', 70], ['Transportadora Rumo Sul', 154000, 'dez', 'pipeline', 'c3', 25], ['Hospital São Lucas', 380000, 'dez', 'pipeline', 'c1', 20], ['Atacado Bom Preço', 77000, 'nov', 'melhor', 'c2', 55], ['Imobiliária Lar Novo', 58000, 'dez', 'commit', 'c3', 70], ['Indústria Metalfix', 212000, 'dez', 'melhor', 'c1', 40]]
    .map(([conta, valor, mes, cat, dono, prob]) => ({ id: uid(), conta, valor, mes, cat, dono, prob }));
  const regras = [['decisor', 'Cargo de decisão (diretor, sócio, C-level)', 25], ['porte', 'Empresa com mais de 50 funcionários', 20], ['demo', 'Pediu demonstração', 30], ['preco', 'Visitou a página de preços', 15], ['email', 'Abriu 3 ou mais e-mails', 10], ['concorrente', 'Usa sistema concorrente', 10]].map(([k, nome, pts]) => ({ k, nome, pts }));
  const leads = [['Carla Diniz', 'Diretora financeira', 'Laboratório Vida', ['decisor', 'porte', 'preco', 'email']], ['Rafael Moura', 'Analista de TI', 'Metalúrgica Forte', ['porte', 'email']], ['Juliana Paes', 'Sócia', 'Contabilidade Paes', ['decisor', 'demo', 'preco']], ['Leandro Ávila', 'Coordenador', 'Rede Mais Saúde', ['porte', 'demo', 'concorrente']], ['Patrícia Gomes', 'CEO', 'Startup Fluxa', ['decisor', 'email']], ['Henrique Lima', 'Estagiário', 'Loja Lima', ['email']], ['Sílvia Rocha', 'Gerente de compras', 'Atacadão Rocha', ['porte', 'preco', 'email', 'concorrente']]]
    .map(([nome, cargo, empresa, sinais]) => ({ id: uid(), nome, cargo, empresa, sinais, st: 'novo' }));
  const cadencias = [{ id: 'k1', nome: 'Entrada pelo site', leads: 148, passos: [['D0', 'E-mail', 'Boas-vindas + caso de sucesso', 0.41], ['D1', 'Ligação', 'Diagnóstico de 10 min', 0.18], ['D3', 'WhatsApp', 'Vídeo de 90 s do produto', 0.27], ['D6', 'LinkedIn', 'Conexão + comentário', 0.12], ['D9', 'E-mail', 'Última tentativa', 0.09]] }, { id: 'k2', nome: 'Lista fria · indústria', leads: 312, passos: [['D0', 'LinkedIn', 'Conexão', 0.22], ['D2', 'E-mail', 'Problema do setor', 0.08], ['D5', 'Ligação', 'Abordagem', 0.06], ['D8', 'E-mail', 'Convite para webinar', 0.05]] }];
  const fila = [['Ligar para Carla Diniz (Laboratório Vida)', 's1', 'Ligação'], ['WhatsApp para Juliana Paes', 's1', 'WhatsApp'], ['E-mail D9 para 23 leads da cadência Site', 's2', 'E-mail'], ['Conectar no LinkedIn 14 contatos da indústria', 's3', 'LinkedIn'], ['Ligar para Sílvia Rocha (Atacadão)', 's2', 'Ligação']].map(([t, dono, canal]) => ({ id: uid(), t, dono, canal, feito: false }));
  const novos = [['Clínica Bem Estar', 'SP', 12], ['Fazenda Três Rios', 'GO', 80], ['Loja Moda Sul', 'RS', 8], ['Indústria Plastec', 'SP', 220], ['Restaurante Sabor', 'BA', 25]].map(([empresa, uf, func]) => ({ id: uid(), empresa, uf, func, para: null }));
  return { empresa: 'Nuvra Software B2B', meta: 1800000, realizado: 512000, pessoas, deals, regras, corte: 60, leads, cadencias, fila, novos, modo: 'territorio', sla: 15, audit: [[agora(), 'Sistema', 'distribuiu 41 leads por território'], [agora(), 'Fernando', 'mudou Grupo Vitalle de melhor caso para commit']].map(([q, quem, o]) => ({ q, quem, o })), plano: 'basico', conversa: [] };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || gerar(); } catch { return gerar(); } })();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
const guarda = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { toque('Sem espaço no navegador.'); } };
const regist = (o) => { db.audit.unshift({ q: agora(), quem: 'Você (diretor comercial)', o }); db.audit = db.audit.slice(0, 50); };
const pessoa = (id) => db.pessoas.find((p) => p.id === id) || { nome: '—' };
const pontos = (l) => db.regras.filter((r) => l.sinais.includes(r.k)).reduce((s, r) => s + r.pts, 0);
const soma = (cat) => db.deals.filter((d) => d.cat === cat).reduce((s, d) => s + d.valor, 0);

function toque(t) { const a = document.createElement('div'); a.textContent = t; $('#toques').append(a); setTimeout(() => a.remove(), 3300); }
function quadro(html, liga) {
  const v = document.createElement('div'); v.className = 'cortina'; v.innerHTML = `<div class="quadro-m" role="dialog" aria-modal="true">${html}</div>`;
  const ant = document.activeElement; document.body.append(v);
  const fecha = () => { v.remove(); ant?.focus?.(); };
  v.addEventListener('click', (ev) => { if (ev.target === v || ev.target.closest('[data-sair]')) fecha(); });
  v.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') fecha(); });
  setTimeout(() => (v.querySelector('input, select') || v.querySelector('button'))?.focus(), 30);
  liga?.(v.querySelector('.quadro-m'), fecha);
}

// ------------------------------------------------------------------ módulos
const MOD = [['previsao', 'Previsão'], ['cadencias', 'Cadências'], ['pontuacao', 'Pontuação de leads'], ['distribuicao', 'Distribuição'], ['ganhos', 'Ganhos e perdas'], ['times', 'Times'], ['playbook', 'Playbook'], ['auditoria', 'Auditoria'], ['equipe', 'Equipe'], ['ajustes', 'Ajustes']];
const M = {
  previsao() {
    const c = soma('commit'), m = soma('melhor'), p = soma('pipeline'), W = 760, H = 240, sem = 13, hoje = 7, x = (i) => 40 + i / sem * (W - 60), y = (v) => H - 24 - v / (db.meta * 1.25) * (H - 40);
    const real = Array.from({ length: hoje + 1 }, (_, i) => db.realizado * (i / hoje) ** 1.1), bx = x(hoje), fimBaixo = db.realizado + c, fimAlto = db.realizado + c + m;
    return `<div class="titulo"><div><h1>Previsão do trimestre</h1><p>Meta de ${R$(db.meta)}. Cada closer classifica os negócios: commit (fecha com certeza), melhor caso e pipeline. O cone mostra onde o trimestre termina.</p></div><button class="bt" data-a="exportar">Exportar para a diretoria</button></div>
      <div class="grade" style="margin-bottom:14px"><div class="cx k3 ind"><small>Realizado</small><b>${k$(db.realizado)}</b><span>${Math.round(db.realizado / db.meta * 100)}% da meta</span></div><div class="cx k3 ind"><small>Realizado + commit</small><b class="${fimBaixo >= db.meta ? 'bom' : 'mau'}">${k$(fimBaixo)}</b><span>${fimBaixo >= db.meta ? 'meta garantida' : `faltam ${k$(db.meta - fimBaixo)}`}</span></div><div class="cx k3 ind"><small>Com melhor caso</small><b>${k$(fimAlto)}</b><span>${Math.round(fimAlto / db.meta * 100)}% da meta</span></div><div class="cx k3 ind"><small>Pipeline restante</small><b>${k$(p)}</b><span>cobertura ${(p + m + c) / Math.max(1, db.meta - db.realizado) >= 3 ? 'boa' : 'baixa'}: ${((p + m + c) / Math.max(1, db.meta - db.realizado)).toFixed(1).replace('.', ',')}×</span></div></div>
      <div class="grade"><section class="cx k7"><h2>Cone do trimestre <small>· semanas</small></h2><svg class="cone" viewBox="0 0 ${W} ${H}" role="img" aria-label="Realizado e projeção contra a meta">
        <line x1="40" x2="${W - 20}" y1="${y(db.meta)}" y2="${y(db.meta)}" stroke="#a5503f" stroke-dasharray="5 4"/><text x="${W - 20}" y="${y(db.meta) - 6}" text-anchor="end">meta ${k$(db.meta)}</text>
        <path d="M${bx},${y(db.realizado)} L${x(sem)},${y(fimAlto)} L${x(sem)},${y(fimBaixo)} Z" fill="#83a8a0" opacity=".35"/>
        <line x1="${bx}" y1="${y(db.realizado)}" x2="${x(sem)}" y2="${y(fimBaixo)}" stroke="#215a60" stroke-width="2" stroke-dasharray="4 3"/><line x1="${bx}" y1="${y(db.realizado)}" x2="${x(sem)}" y2="${y(fimAlto)}" stroke="#83a8a0" stroke-width="2" stroke-dasharray="4 3"/>
        <polyline fill="none" stroke="#16454a" stroke-width="3" points="${real.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/><circle cx="${bx}" cy="${y(db.realizado)}" r="4" fill="#16454a"/>
        ${Array.from({ length: sem + 1 }, (_, i) => (i % 2 ? '' : `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">S${i}</text>`)).join('')}</svg>
        <div class="legenda"><span style="--c:#16454a">realizado</span><span style="--c:#215a60">só commit</span><span style="--c:#83a8a0">com melhor caso</span><span style="--c:#a5503f">meta</span></div></section>
      <section class="cx k5 rolo"><h2>Negócios do trimestre</h2><table><thead><tr><th>Conta</th><th class="dir">Valor</th><th>Mês</th><th>Categoria</th></tr></thead><tbody>${[...db.deals].sort((a, b) => b.valor - a.valor).map((d) => `<tr><td><b>${e(d.conta)}</b><br><small style="color:var(--tx-3)">${e(pessoa(d.dono).nome)} · ${d.prob}%</small></td><td class="dir">${k$(d.valor)}</td><td>${d.mes}</td><td><select class="cat" data-cat="${d.id}" aria-label="Categoria de ${e(d.conta)}">${[['commit', 'commit'], ['melhor', 'melhor caso'], ['pipeline', 'pipeline'], ['ganho', 'ganho']].map(([v, t]) => `<option value="${v}" ${d.cat === v ? 'selected' : ''}>${t}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></section></div>`;
  },
  cadencias() {
    const minha = db.fila;
    return `<div class="titulo"><div><h1>Cadências</h1><p>Sequências de toques em vários canais. A taxa de cada passo mostra onde o lead responde e onde a cadência morre.</p></div><button class="bt p" data-a="nova-cad">+ Cadência</button></div>
      ${db.cadencias.map((c) => `<section class="cx" style="margin-bottom:14px"><h2>${e(c.nome)} <small>· ${c.leads} leads dentro</small></h2><div class="etapas-c" style="--n:${c.passos.length}">${c.passos.map(([d, canal, t, tx]) => `<div class="etapa-c"><small>${d} · ${canal}</small><b>${e(t)}</b><span class="tx">${Math.round(tx * 100)}% respondem</span></div>`).join('')}</div></section>`).join('')}
      <section class="cx"><h2>Fila dos SDRs hoje <small>· gerada pelas cadências</small></h2><table><tbody>${minha.map((f) => `<tr><td><input type="checkbox" data-fila="${f.id}" ${f.feito ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--pt)" aria-label="Feito"></td><td>${f.feito ? `<s style="color:var(--tx-3)">${e(f.t)}</s>` : e(f.t)}</td><td><span class="tag ag">${f.canal}</span></td><td>${e(pessoa(f.dono).nome)}</td></tr>`).join('')}</tbody></table></section>`;
  },
  pontuacao() {
    const l = db.leads.map((x) => ({ ...x, p: pontos(x) })).sort((a, b) => b.p - a.p);
    return `<div class="titulo"><div><h1>Pontuação de leads</h1><p>Cada sinal vale pontos. Acima de <b>${db.corte}</b> o lead está quente e vai direto para um closer; abaixo, continua na cadência do SDR.</p></div><label class="cp" style="margin:0">Corte<input type="number" data-corte value="${db.corte}" style="width:80px"></label></div>
      <div class="grade"><section class="cx k5"><h2>Regras</h2><table><tbody>${db.regras.map((r) => `<tr><td>${e(r.nome)}</td><td class="dir"><input class="peso" data-peso="${r.k}" value="${r.pts}" aria-label="Pontos de ${e(r.nome)}"></td></tr>`).join('')}</tbody></table></section>
      <section class="cx k7 rolo"><h2>Leads</h2><table><thead><tr><th class="dir">Pontos</th><th>Lead</th><th>Empresa</th><th></th></tr></thead><tbody>${l.map((x) => `<tr><td class="dir"><span class="pontos" style="--c:${x.p >= db.corte ? '#3f7a5e' : x.p >= db.corte * 0.6 ? '#b88a35' : '#6d7e83'}">${x.p}</span></td><td><b>${e(x.nome)}</b><br><small style="color:var(--tx-3)">${e(x.cargo)}</small></td><td>${e(x.empresa)}</td><td>${x.st === 'closer' ? '<span class="tag ok">com closer</span>' : x.p >= db.corte ? `<button class="bt x a" data-a="passar" data-id="${x.id}">Passar para closer</button>` : '<span class="tag">na cadência</span>'}</td></tr>`).join('')}</tbody></table></section></div>`;
  },
  distribuicao() {
    const sdrs = db.pessoas.filter((p) => p.papel === 'SDR');
    return `<div class="titulo"><div><h1>Distribuição de leads</h1><p>Lead novo cai na fila e o sistema entrega para alguém na hora. Prazo de primeiro contato: ${db.sla} minutos. Depois disso, passa para o próximo da fila.</p></div><button class="bt p" data-a="distribuir" ${db.novos.some((n) => !n.para) ? '' : 'disabled'}>Distribuir agora</button></div>
      <div class="grade"><section class="cx k4"><h2>Regra</h2>${[['rodizio', 'Rodízio', 'um para cada, na ordem'], ['territorio', 'Território', 'pelo estado do lead'], ['porte', 'Porte', 'empresa grande vai para o SDR sênior']].map(([k, n, d]) => `<label class="chave" style="display:flex;padding:6px 0"><input type="radio" name="modo" data-modo="${k}" ${db.modo === k ? 'checked' : ''}><span><b>${n}</b><br><small style="color:var(--tx-3)">${d}</small></span></label>`).join('')}<label class="cp" style="margin-top:10px">Prazo de primeiro contato (min)<input type="number" data-sla value="${db.sla}"></label></section>
      <section class="cx k8 rolo"><h2>Fila de entrada</h2><table><thead><tr><th>Empresa</th><th>UF</th><th class="dir">Funcionários</th><th>Para</th></tr></thead><tbody>${db.novos.map((n) => `<tr><td><b>${e(n.empresa)}</b></td><td>${n.uf}</td><td class="dir">${n.func}</td><td>${n.para ? `<span class="tag ok">${e(pessoa(n.para).nome)}</span>` : '<span class="tag at">aguardando</span>'}</td></tr>`).join('')}</tbody></table>
        <h2 style="margin-top:16px">Tempo de primeiro contato</h2><div class="barras">${sdrs.map((s, i) => { const m = [7, 22, 11][i]; return `<div class="l"><span>${e(s.nome)} · ${e(s.area)}</span><span class="t"><i style="width:${Math.min(100, m / 30 * 100)}%;--c:${m > db.sla ? '#a5503f' : '#3f7a5e'}"></i></span><b class="dir">${m} min</b></div>`; }).join('')}</div></section></div>`;
  },
  ganhos() {
    const motivos = [['Preço acima do orçamento', 14, 'mau'], ['Escolheu concorrente (Contaflux)', 9, 'mau'], ['Sem decisor na conversa', 7, 'mau'], ['Timing: projeto adiado', 6, 'at']], venc = [['Integração com o ERP', 18], ['Atendimento na implantação', 15], ['Relatórios prontos', 11]];
    return `<div class="titulo"><div><h1>Ganhos e perdas</h1><p>Últimos 90 dias: 52 ganhos, 36 perdidos. Taxa de 59%. Ciclo médio: 41 dias nos ganhos, 63 nos perdidos.</p></div></div>
      <div class="grade"><section class="cx k6"><h2>Por que perdemos</h2><div class="barras">${motivos.map(([m, n, c]) => `<div class="l"><span>${m}</span><span class="t"><i style="width:${n / 14 * 100}%;--c:${c === 'mau' ? '#a5503f' : '#b88a35'}"></i></span><b class="dir">${n}</b></div>`).join('')}</div></section>
      <section class="cx k6"><h2>Por que ganhamos</h2><div class="barras">${venc.map(([m, n]) => `<div class="l"><span>${m}</span><span class="t"><i style="width:${n / 18 * 100}%;--c:#3f7a5e"></i></span><b class="dir">${n}</b></div>`).join('')}</div></section>
      <section class="cx k12"><h2>Leitura</h2><p style="margin:0">Quando o decisor não participa da demonstração, a taxa cai de 59% para 22%. O playbook já pede o decisor como critério para sair de "Diagnóstico".</p></section></div>`;
  },
  times() {
    return `<div class="titulo"><div><h1>Times</h1><p>SDRs marcam reuniões; closers fecham. Mês corrente.</p></div></div>
      <div class="grade"><section class="cx k6 rolo"><h2>SDRs</h2><table><thead><tr><th>Pessoa</th><th class="dir">Toques</th><th class="dir">Reuniões</th><th class="dir">Compareceram</th></tr></thead><tbody>${[['Bruna', 812, 34, 0.82], ['Igor', 655, 21, 0.71], ['Nathalia', 704, 27, 0.78]].map(([n, t, r, s]) => `<tr><td>${n}</td><td class="dir">${t}</td><td class="dir">${r}</td><td class="dir">${Math.round(s * 100)}%</td></tr>`).join('')}</tbody></table></section>
      <section class="cx k6 rolo"><h2>Closers</h2><table><thead><tr><th>Pessoa</th><th class="dir">Reuniões</th><th class="dir">Ganhos</th><th class="dir">Receita</th></tr></thead><tbody>${[['Fernando', 28, 9, 286000], ['Mariana', 31, 12, 154000], ['Otávio', 23, 6, 72000]].map(([n, r, g, v]) => `<tr><td>${n}</td><td class="dir">${r}</td><td class="dir">${g} (${Math.round(g / r * 100)}%)</td><td class="dir">${k$(v)}</td></tr>`).join('')}</tbody></table></section></div>`;
  },
  playbook() {
    const et = [['Diagnóstico', ['Dor confirmada pelo cliente', 'Decisor identificado e convidado', 'Orçamento aproximado conhecido']], ['Demonstração', ['Decisor presente', 'Casos de uso do cliente mostrados', 'Próximo passo com data']], ['Proposta', ['Escopo aprovado por e-mail', 'Concorrentes mapeados', 'Prazo de decisão definido']], ['Negociação', ['Jurídico do cliente envolvido', 'Condição comercial dentro da alçada']]];
    const obj = [['"Está caro"', 'Mostre o custo de não resolver: horas da equipe por mês × salário. Ofereça começar com um módulo.'], ['"Já usamos o Contaflux"', 'Pergunte o que falta nele. Nossa integração com o ERP ganha 18 em cada 52 vendas.'], ['"Agora não é o momento"', 'Combine uma data e mande o estudo de retorno até lá. Deixe na cadência de nutrição.']];
    return `<div class="titulo"><div><h1>Playbook</h1><p>O que precisa ser verdade para o negócio mudar de fase, e como responder às objeções mais comuns.</p></div></div>
      <div class="grade">${et.map(([n, c]) => `<section class="cx k3"><h2>${n}</h2><ul class="check">${c.map((x) => `<li>${x}</li>`).join('')}</ul></section>`).join('')}
      <section class="cx k12"><h2>Objeções</h2><table><tbody>${obj.map(([o, r]) => `<tr><td style="width:28%"><b>${o}</b></td><td>${r}</td></tr>`).join('')}</tbody></table></section></div>`;
  },
  auditoria() { return `<div class="titulo"><div><h1>Auditoria</h1><p>Mudanças de categoria, regras, distribuição e descontos: quem, quando e o quê.</p></div></div><section class="cx rolo"><table><thead><tr><th>Quando</th><th>Quem</th><th>O quê</th></tr></thead><tbody>${db.audit.map((a) => `<tr><td class="mn">${e(a.q)}</td><td>${e(a.quem)}</td><td>${e(a.o)}</td></tr>`).join('')}</tbody></table></section>`; },
  equipe() {
    const pr = db.plano === 'pro' ? 289 : 229;
    return `<div class="titulo"><div><h1>Equipe</h1><p>Painel do dono: papéis, áreas e quem vê o quê.</p></div></div>
      <div class="grade"><section class="cx k7 rolo"><table><thead><tr><th>Pessoa</th><th>Papel</th><th>Área</th><th>Vê</th></tr></thead><tbody>${db.pessoas.map((p) => `<tr><td><b>${e(p.nome)}</b></td><td>${p.papel}</td><td>${e(p.area)}</td><td>${p.papel === 'SDR' ? 'leads e cadências dela' : 'os próprios negócios e a previsão dele'}</td></tr>`).join('')}<tr><td><b>Você</b></td><td>Diretor</td><td>tudo</td><td>tudo, inclusive mudar a meta</td></tr></tbody></table></section>
      <section class="cx k5"><h2>Plano</h2><p>Assinatura · <b>${R$(pr)}/mês</b></p><div class="bar"><button class="bt ${db.plano === 'basico' ? 'p' : ''}" data-a="plano" data-v="basico">Assinatura · R$ 229/mês</button></div><p style="color:var(--tx-3);font-size:.85rem">Equipe sem limite, histórico de quem fez o quê e até 10 empresas. Anual com 20% a menos. Sem fidelidade.</p></section></div>`;
  },
  ajustes() { return `<div class="titulo"><div><h1>Ajustes</h1></div></div><section class="cx" style="max-width:640px"><label class="cp">Empresa<input data-aj="empresa" value="${e(db.empresa)}"></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label class="cp">Meta do trimestre (R$)<input data-aj="meta" inputmode="decimal" value="${db.meta}"></label><label class="cp">Realizado até hoje (R$)<input data-aj="realizado" inputmode="decimal" value="${db.realizado}"></label></div><p style="color:var(--tx-3);font-size:.86rem">Na versão contratada: discador e gravação de ligações, e-mail e WhatsApp oficial nas cadências, formulários do site, LinkedIn e integração com o ERP (algumas têm custo à parte).</p></section>`; },
};

function render() {
  const r = location.hash.slice(1) || 'previsao', n = { pontuacao: db.leads.filter((l) => l.st !== 'closer' && pontos(l) >= db.corte).length, distribuicao: db.novos.filter((x) => !x.para).length, cadencias: db.fila.filter((f) => !f.feito).length };
  $('#trilhos').innerHTML = MOD.map(([k, t]) => `<a href="#${k}" ${k === r ? 'aria-current="page"' : ''}>${t}${n[k] ? `<span class="n">${n[k]}</span>` : ''}</a>`).join('');
  $('#area').innerHTML = (M[r] || M.previsao)();
  $('#empresa').textContent = db.empresa; $('#periodo').textContent = `4º trimestre · semana 7 de 13`;
  document.title = `${(MOD.find(([k]) => k === r) || MOD[0])[1]} · Veltria CRM Avançado`;
}
addEventListener('hashchange', () => { render(); $('#area').focus({ preventScroll: true }); scrollTo(0, 0); });

// ------------------------------------------------------------------ busca de comandos (Ctrl K)
const ACOES_P = [...MOD.map(([k, t]) => ({ t: `Ir para ${t}`, d: 'módulo', f: () => { location.hash = `#${k}`; } })), { t: 'Distribuir os leads novos', d: 'ação', f: () => A.distribuir() }, { t: 'Passar leads quentes para closers', d: 'ação', f: () => { db.leads.filter((l) => l.st !== 'closer' && pontos(l) >= db.corte).forEach((l) => { l.st = 'closer'; }); regist('passou os leads quentes para closers'); guarda(); render(); toque('Leads quentes entregues aos closers.'); } }, { t: 'Exportar a previsão para a diretoria', d: 'ação', f: () => A.exportar() }];
let pSel = 0;
function abrePaleta() { $('#paleta').hidden = false; $('#p-in').value = ''; $('#p-resp').hidden = true; pSel = 0; listaPaleta(); $('#p-in').focus(); }
function fechaPaleta() { $('#paleta').hidden = true; }
function filtrados() { const q = sa($('#p-in').value); return ACOES_P.filter((a) => !q || sa(a.t).includes(q)); }
function listaPaleta() { const l = filtrados(), q = $('#p-in').value.trim(); $('#p-lista').innerHTML = l.map((a, i) => `<li role="option" data-pi="${i}" aria-selected="${i === pSel}">${e(a.t)}<small>${a.d}</small></li>`).join('') + (q.length > 2 ? `<li role="option" data-pi="${l.length}" aria-selected="${pSel === l.length}">Perguntar à IA: “${e(q)}”<small>pergunta</small></li>` : ''); }
function executa(i) { const l = filtrados(); if (i < l.length) { fechaPaleta(); l[i].f(); return; } const q = $('#p-in').value.trim(); const r = responde(q); const resp = { ia: 1, t: window.veltriaIA ? 'Pensando…' : r }; db.conversa.push({ t: q }, resp); db.conversa = db.conversa.slice(-10); guarda(); if (window.veltriaIA) window.veltriaIA(q).then((t) => { resp.t = t; guarda(); }); $('#p-resp').hidden = false; $('#p-resp').textContent = `${r}\n\n(Resposta de exemplo da demonstração. Na versão contratada, 20 perguntas grátis por dia.)`; }
function responde(q) {
  const x = sa(q);
  if (/meta|bater|trimestre|previs/.test(x)) { const b = db.realizado + soma('commit'), a = b + soma('melhor'); return `Só com commit fechamos em ${k$(b)} (${Math.round(b / db.meta * 100)}% da meta). Com o melhor caso, ${k$(a)}. Para garantir, puxe a Cooperativa Agrovale (${k$(264000)}) para commit: ela depende de uma reunião com o diretor financeiro.`; }
  if (/lead|quente|closer/.test(x)) { const l = db.leads.filter((y) => y.st !== 'closer' && pontos(y) >= db.corte); return l.length ? `${l.length} lead(s) quente(s) esperando closer: ${l.map((y) => `${y.nome} (${pontos(y)} pts)`).join(', ')}.` : 'Nenhum lead quente parado.'; }
  if (/perd|motivo|preco/.test(x)) return 'Preço é o motivo nº 1 (14 perdas), mas 9 delas foram sem o decisor na demonstração. Exigir o decisor antes da demo deve recuperar parte disso.';
  if (/sdr|demor|primeiro contato|sla/.test(x)) return `Igor está levando 22 min para o primeiro contato, acima do prazo de ${db.sla}. Leads respondidos em até 5 min convertem 3× mais: vale dividir a fila do Sul com a Bruna à tarde.`;
  return `Trimestre: realizado ${k$(db.realizado)}, commit ${k$(soma('commit'))}, melhor caso ${k$(soma('melhor'))}.`;
}

const A = {
  exportar: () => toque('Resumo da previsão gerado (demonstração): vai por e-mail para a diretoria toda segunda.'),
  'nova-cad': () => quadro('<h2>Nova cadência</h2><form><label class="cp">Nome<input name="n" required value="Reativação de clientes antigos"></label><p style="color:var(--tx-3);font-size:.86rem">Começa com 4 passos (e-mail, ligação, WhatsApp, e-mail) que você edita depois.</p><div class="pe"><button type="button" class="bt" data-sair>Cancelar</button><button class="bt p">Criar</button></div></form>', (q, fecha) => q.querySelector('form').addEventListener('submit', (ev) => { ev.preventDefault(); db.cadencias.push({ id: uid(), nome: new FormData(ev.target).get('n'), leads: 0, passos: [['D0', 'E-mail', 'Abertura', 0], ['D2', 'Ligação', 'Contato', 0], ['D4', 'WhatsApp', 'Lembrete', 0], ['D7', 'E-mail', 'Última', 0]] }); regist('criou uma cadência'); guarda(); fecha(); render(); })),
  passar: (d) => { const l = db.leads.find((y) => y.id === d.id); l.st = 'closer'; regist(`passou ${l.nome} (${pontos(l)} pts) para closer`); guarda(); render(); toque(`${l.nome} entregue para ${pessoa('c2').nome}, com o histórico.`); },
  distribuir: () => { const sdrs = db.pessoas.filter((p) => p.papel === 'SDR'), mapaUF = { SP: 's1', RJ: 's1', MG: 's1', RS: 's2', PR: 's2', SC: 's2' }; let i = 0; db.novos.filter((n) => !n.para).forEach((n) => { n.para = db.modo === 'territorio' ? (mapaUF[n.uf] || 's3') : db.modo === 'porte' ? (n.func > 50 ? 's1' : sdrs[1 + (i++ % 2)].id) : sdrs[i++ % sdrs.length].id; }); regist(`distribuiu leads por ${db.modo}`); guarda(); render(); toque('Leads distribuídos. Cada SDR recebeu aviso no celular.'); },
  plano: (d) => { db.plano = d.v; guarda(); render(); },
};

document.addEventListener('keydown', (ev) => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); $('#paleta').hidden ? abrePaleta() : fechaPaleta(); return; }
  if ($('#paleta').hidden) return;
  const tot = filtrados().length + ($('#p-in').value.trim().length > 2 ? 1 : 0);
  if (ev.key === 'Escape') fechaPaleta();
  else if (ev.key === 'ArrowDown') { ev.preventDefault(); pSel = Math.min(tot - 1, pSel + 1); listaPaleta(); }
  else if (ev.key === 'ArrowUp') { ev.preventDefault(); pSel = Math.max(0, pSel - 1); listaPaleta(); }
  else if (ev.key === 'Enter') { ev.preventDefault(); executa(pSel); }
});
$('#p-in').addEventListener('input', () => { pSel = 0; listaPaleta(); });
document.addEventListener('click', (ev) => {
  const t = ev.target;
  if (t.closest('[data-paleta]')) { abrePaleta(); return; }
  if (t.id === 'paleta') { fechaPaleta(); return; }
  const pi = t.closest('[data-pi]'); if (pi) { executa(Number(pi.dataset.pi)); return; }
  const a = t.closest('[data-a]'); if (a && A[a.dataset.a]) A[a.dataset.a](a.dataset);
});
document.addEventListener('change', (ev) => {
  const t = ev.target, d = t.dataset;
  if (d.cat) { const x = db.deals.find((y) => y.id === d.cat), ant = x.cat; if (t.value === 'ganho') { db.realizado += x.valor; db.deals = db.deals.filter((y) => y !== x); toque(`${x.conta}: ${k$(x.valor)} ganhos.`); } else x.cat = t.value; regist(`mudou ${x.conta} de ${ant} para ${t.value}`); guarda(); render(); }
  if (d.peso) { db.regras.find((r) => r.k === d.peso).pts = nv(t.value); regist('mudou os pesos da pontuação'); guarda(); render(); }
  if ('corte' in d) { db.corte = nv(t.value); guarda(); render(); }
  if (d.fila) { db.fila.find((f) => f.id === d.fila).feito = t.checked; guarda(); render(); }
  if (d.modo) { db.modo = d.modo; regist(`mudou a distribuição para ${d.modo}`); guarda(); render(); }
  if ('sla' in d) { db.sla = nv(t.value); guarda(); render(); }
  if (d.aj) { db[d.aj] = d.aj === 'empresa' ? t.value : nv(t.value); guarda(); render(); }
});
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = gerar(); location.hash = '#previsao'; render(); toque('Demonstração recomeçada.'); });
render();
