// Veltria Agenda Avançado · protótipo "mapa de ocupação" para rede de salões e clínicas de estética.
// Lentes numa doca flutuante: ocupação (dias x horas) com preço menor nos horários vazios, clube de assinatura,
// reativação por segmento de cliente, metas da equipe, ficha técnica (custo real de cada serviço), unidades,
// avaliações, auditoria, equipe e ajustes. Conselheira com IA. Dados de exemplo neste navegador (?novo recomeça).

const CHAVE = 'veltria-agenda-avancado-v1';
const R$ = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const R2 = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const x = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nv = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const pc = (v) => `${Math.round(v * 100)}%`;
const $ = (s) => document.querySelector(s);
const quando = () => new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const UN = { sav: { nome: 'Savassi', cadeiras: 6 }, lou: { nome: 'Lourdes', cadeiras: 4 }, pam: { nome: 'Pampulha', cadeiras: 5 } };
const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'], HORAS = Array.from({ length: 12 }, (_, i) => 8 + i), TICKET = 128;
// ocupação de exemplo: fim de semana e fim de tarde cheios, segunda e terça de manhã vazias
function ocup(u, d, h) {
  const bd = [0.38, 0.42, 0.55, 0.6, 0.82, 0.93, 0.2][d], bh = [-0.22, -0.12, -0.02, 0.04, -0.1, -0.14, 0, 0.06, 0.12, 0.18, 0.14, -0.04][h - 8];
  const ru = ((u.charCodeAt(0) * 31 + d * 17 + h * 13) % 23) / 100 - 0.1, fu = { sav: 0.06, lou: -0.04, pam: -0.1 }[u];
  return d === 6 && h > 13 ? 0 : Math.max(0.03, Math.min(1, bd + bh + ru + fu));
}

function semear() {
  return {
    un: 'todas', rede: 'Maison Íris', ofertas: [], desconto: 15, celSel: null,
    planos: [{ id: 'esc', nome: 'Escova ilimitada', preco: 189, assin: 142, uso: 5.2, custoUso: 14 }, { id: 'unh', nome: 'Unhas do mês (4 mãos + 2 pés)', preco: 129, assin: 96, uso: 5.1, custoUso: 9 }, { id: 'bar', nome: 'Barba e cabelo ilimitado', preco: 109, assin: 61, uso: 3.4, custoUso: 11 }],
    recusados: [{ id: 'r1', nome: 'Paula Siqueira', plano: 'Escova ilimitada', tentativas: 1 }, { id: 'r2', nome: 'Diego Moraes', plano: 'Barba e cabelo ilimitado', tentativas: 2 }, { id: 'r3', nome: 'Ingrid Lacerda', plano: 'Unhas do mês', tentativas: 1 }],
    rfm: [{ k: 'camp', nome: 'Campeãs', c: '#39283f', n: 312, v: 214000, dica: 'vêm todo mês e gastam muito', msg: 'Convite para o lançamento antes de todo mundo', env: false }, { k: 'fieis', nome: 'Fiéis', c: '#4d3755', n: 688, v: 251000, dica: 'vêm sempre, ticket médio', msg: 'Oferta do clube de assinatura', env: false }, { k: 'risco', nome: 'Em risco', c: '#9c7a9e', n: 241, v: 88000, dica: 'eram fiéis, não vêm há 60 dias', msg: 'Sentimos sua falta: hidratação de cortesia na próxima escova', env: false }, { k: 'sumidas', nome: 'Sumidas', c: '#858a9b', n: 905, v: 0, dica: 'mais de 120 dias sem vir', msg: '20% em qualquer serviço de segunda a quarta', env: false }, { k: 'novas', nome: 'Novas', c: '#b68b45', n: 134, v: 31000, dica: 'vieram uma vez este mês', msg: 'Volte em 30 dias e ganhe a escova', env: false }],
    equipe: [['Rose', 'sav', 'Coloração', 24000, 21800, 182, 0.14], ['Kátia', 'sav', 'Escova e corte', 16000, 17350, 96, 0.22], ['Amanda', 'lou', 'Unhas', 9000, 7420, 61, 0.08], ['Júlio', 'lou', 'Barbearia', 11000, 11900, 74, 0.18], ['Patrícia', 'pam', 'Estética facial', 18000, 13100, 210, 0.05], ['Lúcia', 'pam', 'Depilação a laser', 22000, 23900, 240, 0.02]].map(([nome, un, area, meta, real, ticket, prod]) => ({ nome, un, area, meta, real, ticket, prod })),
    fichas: [{ id: 'f1', serv: 'Coloração raiz', preco: 180, min: 90, insumos: [['Tinta 60 g', 0.6, 38], ['Oxidante 90 ml', 0.9, 9], ['Luvas e papel', 1, 2.5], ['Shampoo pós-química 20 ml', 0.2, 28]] }, { id: 'f2', serv: 'Escova', preco: 60, min: 45, insumos: [['Shampoo 15 ml', 0.15, 28], ['Condicionador 15 ml', 0.15, 32], ['Protetor térmico 5 ml', 0.05, 90]] }, { id: 'f3', serv: 'Limpeza de pele', preco: 160, min: 75, insumos: [['Gel de limpeza 10 ml', 0.1, 120], ['Esfoliante 8 g', 0.08, 180], ['Máscara 15 g', 0.15, 210], ['Descartáveis', 1, 7]] }, { id: 'f4', serv: 'Unha em gel', preco: 150, min: 120, insumos: [['Gel 4 g', 0.4, 95], ['Primer e base', 1, 6], ['Lixas e palitos', 1, 3.2]] }],
    avaliacoes: [{ id: 'a1', nome: 'Carolina B.', un: 'sav', nota: 5, texto: 'Coloração perfeita, atendimento impecável.', resp: true }, { id: 'a2', nome: 'Renata M.', un: 'pam', nota: 2, texto: 'Esperei 35 minutos mesmo com horário marcado.', resp: false }, { id: 'a3', nome: 'Fábio T.', un: 'lou', nota: 4, texto: 'Barba ótima, só o estacionamento que é difícil.', resp: false }, { id: 'a4', nome: 'Luíza P.', un: 'sav', nota: 5, texto: 'Melhor escova de BH.', resp: true }],
    log: [[quando(), 'Sistema', 'cobrou 297 mensalidades do clube (3 recusadas)'], [quando(), 'Gerente Pampulha', 'deu 20% de desconto fora da regra numa limpeza de pele']].map(([q, quem, o]) => ({ q, quem, o })),
    plano: 'basico', conversa: [],
  };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || semear(); } catch { return semear(); } })();
window.veltriaDados = () => db;
// nota da avaliação entre 0 e 5 (digitada no editor de Dados pode vir fora disso)
const estrelas = (n) => Math.max(0, Math.min(5, Math.round(Number(n) || 0))); // modo conta: começar do zero e resumo para a IA
const salva = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { recado('Sem espaço no navegador.'); } };
const anota = (o) => { db.log.unshift({ q: quando(), quem: 'Você (dona)', o }); db.log = db.log.slice(0, 50); };
const unidades = () => (db.un === 'todas' ? Object.keys(UN) : [db.un]);
const occ = (d, h) => unidades().reduce((s, u) => s + ocup(u, d, h) * UN[u].cadeiras, 0) / unidades().reduce((s, u) => s + UN[u].cadeiras, 0);
const nomeUn = () => (db.un === 'todas' ? 'toda a rede' : UN[db.un].nome);

function recado(t) { const a = document.createElement('div'); a.textContent = t; $('#recados').append(a); setTimeout(() => a.remove(), 3300); }
function cartao(html, liga) {
  const v = document.createElement('div'); v.className = 'veu-a'; v.innerHTML = `<div class="cartao-a" role="dialog" aria-modal="true">${html}</div>`;
  const ant = document.activeElement; document.body.append(v);
  const fecha = () => { v.remove(); ant?.focus?.(); };
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-sair]')) fecha(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); });
  setTimeout(() => (v.querySelector('input, select') || v.querySelector('button'))?.focus(), 30);
  liga?.(v.querySelector('.cartao-a'), fecha);
}
// cor da célula: do areia claro (vazio) à berinjela (cheio)
function cor(o) { const p = [[241, 230, 220], [209, 189, 166], [156, 122, 158], [57, 40, 63]], k = Math.min(2.999, o * 3), i = Math.floor(k), f = k - i; return `rgb(${p[i].map((c, j) => Math.round(c + (p[i + 1][j] - c) * f)).join(',')})`; }
const ganhoOferta = (d, h) => unidades().reduce((s, u) => s + UN[u].cadeiras * (1 - ocup(u, d, h)) * 0.3 * TICKET * (1 - db.desconto / 100), 0) * 4;

// ------------------------------------------------------------------ lentes
const ICO = { ocupacao: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>', clube: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>', reativar: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>', metas: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8"/>', fichas: '<path d="M7 3h10v18H7z"/><path d="M10 7h4M10 11h4M10 15h2"/>', unidades: '<path d="M3 21V9l6-4 6 4v12M15 21V12l6 3v6"/><path d="M7 13h4M7 17h4"/>', avaliacoes: '<path d="M4 5h16v11H9l-5 4z"/><path d="M9 10h6"/>', auditoria: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>', equipe: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.8-3.6 3.2-5.5 6-5.5s5.2 1.9 6 5.5"/><path d="M16 4.5a3 3 0 0 1 0 6M18 14.5c1.8.6 2.9 2.4 3.3 5.5"/>', ajustes: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>', ia: '<path d="M12 3c.6 3.8 2.2 5.4 6 6-3.8.6-5.4 2.2-6 6-.6-3.8-2.2-5.4-6-6 3.8-.6 5.4-2.2 6-6z"/>' };
const LENTES = [['ocupacao', 'Ocupação'], ['clube', 'Clube'], ['reativar', 'Reativação'], ['metas', 'Metas'], ['fichas', 'Ficha técnica'], ['unidades', 'Unidades'], ['avaliacoes', 'Avaliações'], ['auditoria', 'Auditoria'], ['equipe', 'Equipe'], ['ajustes', 'Ajustes']];
const L = {
  ocupacao() {
    const media = DIAS.reduce((s, _, d) => s + HORAS.reduce((t, h) => t + occ(d, h), 0), 0) / 84, vazias = [];
    DIAS.forEach((_, d) => HORAS.forEach((h) => { const o = occ(d, h); if (o < 0.4 && !(d === 6 && h > 13)) vazias.push({ d, h, o }); }));
    const ganho = db.ofertas.reduce((s, k) => { const [d, h] = k.split('|').map(Number); return s + ganhoOferta(d, h); }, 0), sel = db.celSel?.split('|').map(Number);
    return `<div class="abre"><div><h1>Onde a agenda <i>sobra</i></h1><p>Ocupação média das cadeiras nas últimas 4 semanas, em ${x(nomeUn())}. Toque num horário claro para oferecer ${db.desconto}% a menos nele: o preço aparece no link de agendamento e nas campanhas.</p></div><div class="bts"><button class="bt m" data-a="ofertar-vazios" ${vazias.length ? '' : 'disabled'}>Oferecer nos ${vazias.length} horários vazios</button>${db.ofertas.length ? '<button class="bt" data-a="limpar-ofertas">Tirar as ofertas</button>' : ''}</div></div>
      <div class="mosaico"><section class="peca m8"><div class="rolar"><div class="calor" role="grid" aria-label="Ocupação por dia e hora"><span></span>${HORAS.map((h) => `<span class="h">${h}h</span>`).join('')}${DIAS.map((dn, d) => `<span class="d">${dn}</span>${HORAS.map((h) => { const o = occ(d, h), k = `${d}|${h}`, fechado = d === 6 && h > 13; return fechado ? '<span></span>' : `<button type="button" data-cel="${k}" class="${db.ofertas.includes(k) ? 'oferta' : ''}" aria-pressed="${db.celSel === k}" style="background:${cor(o)};color:${o > 0.62 ? '#fff' : '#2b2230'}" aria-label="${dn} ${h}h: ${pc(o)} ocupado${db.ofertas.includes(k) ? ', com oferta' : ''}">${Math.round(o * 100)}</button>`; }).join('')}`).join('')}</div></div>
        <div class="escala">vazio <i></i> cheio · <b style="color:var(--malva-esc)">−</b> = horário com ${db.desconto}% a menos</div></section>
      <div class="m4" style="display:grid;gap:16px;align-content:start"><section class="peca"><span class="leve">Ocupação média</span><p class="grande">${pc(media)}</p><span class="leve">${x(nomeUn())} · cada 10 pontos valem ${R$(unidades().reduce((s, u) => s + UN[u].cadeiras, 0) * 0.1 * 84 * 4 * TICKET)} por mês</span></section>
        <section class="peca"><span class="leve">Ofertas ativas</span><p class="grande">${db.ofertas.length}</p><span class="leve">ganho estimado: <b class="sobe">${R$(ganho)}/mês</b></span></section>
        ${sel ? `<section class="peca"><h2>${DIAS[sel[0]]} às ${sel[1]}h</h2><ul class="lista">${unidades().map((u) => `<li><span>${UN[u].nome}<small>${UN[u].cadeiras} cadeiras</small></span><span class="pilha ${ocup(u, sel[0], sel[1]) < 0.4 ? 'ru' : 'ok'}">${pc(ocup(u, sel[0], sel[1]))}</span></li>`).join('')}</ul><button class="bt mini ${db.ofertas.includes(db.celSel) ? '' : 'm'}" data-a="alterna-oferta" style="margin-top:8px">${db.ofertas.includes(db.celSel) ? 'Tirar oferta' : `Oferecer ${db.desconto}% a menos`}</button></section>` : ''}</div></div>`;
  },
  clube() {
    const mrr = db.planos.reduce((s, p) => s + p.preco * p.assin, 0), ass = db.planos.reduce((s, p) => s + p.assin, 0);
    return `<div class="abre"><div><h1>Clube de <i>assinatura</i></h1><p>Cliente paga todo mês no cartão e vem quantas vezes o plano deixa. Receita garantida antes do mês começar.</p></div><button class="bt b" data-a="novo-plano">+ Plano</button></div>
      <div class="mosaico"><section class="peca m4"><span class="leve">Receita recorrente</span><p class="grande">${R$(mrr)}</p><span class="leve">${ass} assinantes · cancelamento de 3,8% ao mês</span></section><section class="peca m4"><span class="leve">Ticket do assinante</span><p class="grande">${R$(mrr / ass)}</p><span class="leve">avulso: ${R$(TICKET)} por visita</span></section><section class="peca m4"><span class="leve">Cobranças recusadas</span><p class="grande ${db.recusados.length ? 'desce' : ''}">${db.recusados.length}</p><span class="leve">${R$(db.recusados.length * 150)} parados</span></section>
      <section class="peca m8 rolar"><h2>Planos <small>· o custo de cada uso entra na margem</small></h2><table><thead><tr><th>Plano</th><th class="dir">Preço</th><th class="dir">Assinantes</th><th class="dir">Usos/mês</th><th class="dir">Custo</th><th class="dir">Margem</th></tr></thead><tbody>${db.planos.map((p) => { const custo = p.uso * p.custoUso, m = (p.preco - custo) / p.preco; return `<tr><td><b>${x(p.nome)}</b></td><td class="dir">${R$(p.preco)}</td><td class="dir">${p.assin}</td><td class="dir">${p.uso.toLocaleString('pt-BR')}</td><td class="dir">${R2(custo)}</td><td class="dir"><span class="pilha ${m > 0.6 ? 'ok' : 'at'}">${pc(m)}</span></td></tr>`; }).join('')}</tbody></table></section>
      <section class="peca m4"><h2>Recusadas</h2><ul class="lista">${db.recusados.map((r) => `<li><span>${x(r.nome)}<small>${x(r.plano)} · ${r.tentativas} tentativa(s)</small></span><button class="bt mini" data-a="recobrar" data-id="${r.id}">Cobrar de novo</button></li>`).join('') || '<li>Nenhuma.</li>'}</ul></section></div>`;
  },
  reativar() {
    return `<div class="abre"><div><h1>Quem <i>parou</i> de vir</h1><p>Clientes (${x(nomeUn())}) separadas pelo tempo desde a última visita, pela frequência e pelo quanto gastam. Cada grupo recebe uma mensagem diferente.</p></div></div>
      <div class="segmentos-rfm">${db.rfm.map((s) => `<div class="seg" style="--c:${s.c}"><div><b>${s.nome}</b><small>${x(s.dica)}</small></div><p class="grande">${s.n.toLocaleString('pt-BR')}</p><div>${s.v ? `<small>${R$(s.v)} no ano</small>` : ''}${s.env ? '<small>campanha enviada ✓</small>' : `<button type="button" data-a="campanha" data-k="${s.k}">Mandar campanha</button>`}</div></div>`).join('')}</div>
      <section class="peca" style="margin-top:16px"><h2>Resultados das últimas campanhas</h2><table><thead><tr><th>Campanha</th><th>Grupo</th><th class="dir">Enviadas</th><th class="dir">Voltaram</th><th class="dir">Faturou</th></tr></thead><tbody><tr><td>Hidratação de cortesia</td><td>Em risco</td><td class="dir">228</td><td class="dir">41 (18%)</td><td class="dir">${R$(6150)}</td></tr><tr><td>Aniversário com 10%</td><td>Todas</td><td class="dir">96</td><td class="dir">38 (40%)</td><td class="dir">${R$(5320)}</td></tr><tr><td>Segunda a quarta com 20%</td><td>Sumidas</td><td class="dir">870</td><td class="dir">52 (6%)</td><td class="dir">${R$(5410)}</td></tr></tbody></table></section>`;
  },
  metas() {
    const l = db.equipe.filter((p) => db.un === 'todas' || p.un === db.un).sort((a, b) => b.real / b.meta - a.real / a.meta);
    return `<div class="abre"><div><h1>Metas do <i>mês</i></h1><p>Faltam ${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()} dias. A linha escura é onde cada uma deveria estar hoje.</p></div></div>
      <section class="peca rolar"><table><thead><tr><th>Profissional</th><th>Unidade</th><th class="dir">Meta</th><th class="dir">Feito</th><th style="width:26%">Andamento</th><th class="dir">Ticket</th><th class="dir">Produtos</th></tr></thead><tbody>${l.map((p) => { const r = p.real / p.meta, ideal = new Date().getDate() / 30; return `<tr><td><b>${x(p.nome)}</b><br><small class="leve">${x(p.area)}</small></td><td>${UN[p.un].nome}</td><td class="dir">${R$(p.meta)}</td><td class="dir">${R$(p.real)}</td><td><div class="trilho"><i style="width:${Math.min(100, r * 100)}%;background:${r >= ideal ? 'var(--bom)' : 'var(--malva)'}"></i><b style="left:${Math.min(100, ideal * 100)}%"></b></div></td><td class="dir">${R$(p.ticket)}</td><td class="dir"><span class="pilha ${p.prod >= 0.15 ? 'ok' : 'at'}">${pc(p.prod)}</span></td></tr>`; }).join('')}</tbody></table><p class="leve">Produtos = parte do faturamento que veio de produto vendido. Acima de 15% é bom.</p></section>`;
  },
  fichas() {
    return `<div class="abre"><div><h1>Quanto cada serviço <i>custa</i></h1><p>Ficha técnica: o que cada atendimento gasta de produto. O estoque de consumo baixa sozinho a cada serviço feito.</p></div></div>
      <div class="mosaico">${db.fichas.map((f) => { const custo = f.insumos.reduce((s, [, q, c]) => s + q * c, 0), comissao = f.preco * 0.4, sobra = f.preco - custo - comissao; return `<section class="peca m6"><h2>${x(f.serv)} <small>· ${f.min} min</small></h2><table><tbody>${f.insumos.map(([n, q, c]) => `<tr><td>${x(n)}</td><td class="dir">${R2(q * c)}</td></tr>`).join('')}<tr><td>Comissão (40%)</td><td class="dir">${R2(comissao)}</td></tr><tr><td><b>Sobra para a casa</b></td><td class="dir"><b class="${sobra / f.preco < 0.35 ? 'desce' : 'sobe'}">${R2(sobra)} (${pc(sobra / f.preco)})</b></td></tr></tbody></table><label class="cp" style="margin-top:10px">Preço (R$)<input data-preco="${f.id}" inputmode="decimal" value="${f.preco}"></label></section>`; }).join('')}</div>`;
  },
  unidades() {
    const l = Object.entries(UN).map(([k, u]) => { const o = DIAS.reduce((s, _, d) => s + HORAS.reduce((t, h) => t + ocup(k, d, h), 0), 0) / 84, eq = db.equipe.filter((p) => p.un === k), av = db.avaliacoes.filter((a) => a.un === k); return { k, u, o, fat: eq.reduce((s, p) => s + p.real, 0), meta: eq.reduce((s, p) => s + p.meta, 0), nota: av.length ? av.reduce((s, a) => s + a.nota, 0) / av.length : 0 }; });
    return `<div class="abre"><div><h1>As três <i>casas</i></h1><p>Lado a lado no mês.</p></div></div>
      <div class="mosaico">${l.map((x1) => `<section class="peca m4"><h2>${x1.u.nome} <small>· ${x1.u.cadeiras} cadeiras</small></h2><p class="grande">${R$(x1.fat)}</p><p class="leve" style="margin:0 0 8px">${pc(x1.fat / x1.meta)} da meta · ocupação ${pc(x1.o)} · nota ${x1.nota.toFixed(1).replace('.', ',')}</p><div class="trilho"><i style="width:${x1.o * 100}%"></i></div></section>`).join('')}</div>`;
  },
  avaliacoes() {
    const pend = db.avaliacoes.filter((a) => !a.resp);
    return `<div class="abre"><div><h1>O que dizem no <i>Google</i></h1><p>Depois de cada atendimento a cliente recebe o pedido de avaliação. Nota baixa vai primeiro para a gerente, antes de virar pública.</p></div></div>
      <section class="peca"><ul class="lista">${db.avaliacoes.filter((a) => db.un === 'todas' || a.un === db.un).map((a) => `<li><span><b>${'★'.repeat(estrelas(a.nota))}${'☆'.repeat(5 - estrelas(a.nota))}</b> ${x(a.nome)} · ${UN[a.un].nome}<small>“${x(a.texto)}”</small></span>${a.resp ? '<span class="pilha ok">respondida</span>' : `<button class="bt mini ${a.nota <= 3 ? 'm' : ''}" data-a="responder" data-id="${a.id}">Responder</button>`}</li>`).join('')}</ul><p class="leve">${pend.length} sem resposta.</p></section>`;
  },
  auditoria() { return `<div class="abre"><div><h1>Auditoria</h1><p>Descontos fora da regra, ofertas, preços, campanhas e cobranças: quem, quando e o quê.</p></div></div><section class="peca rolar"><table><thead><tr><th>Quando</th><th>Quem</th><th>O quê</th></tr></thead><tbody>${db.log.map((l) => `<tr><td>${x(l.q)}</td><td>${x(l.quem)}</td><td>${x(l.o)}</td></tr>`).join('')}</tbody></table></section>`; },
  equipe() {
    const pr = db.plano === 'pro' ? 259 : 199;
    return `<div class="abre"><div><h1>Equipe e <i>acessos</i></h1><p>Painel da dona: cada gerente vê a própria casa; desconto acima de 10% pede sua aprovação.</p></div></div>
      <div class="mosaico"><section class="peca m7"><table><tbody><tr><td><b>Dona</b></td><td>todas as casas, preços, clube, auditoria</td></tr><tr><td><b>Gerente de unidade</b></td><td>agenda, metas e avaliações da casa dela</td></tr><tr><td><b>Recepção</b></td><td>agenda, comanda e caixa</td></tr><tr><td><b>Profissional</b></td><td>a própria agenda, meta e comissão</td></tr></tbody></table></section>
      <section class="peca m5"><h2>Plano</h2><p>Assinatura · <b>${R$(pr)}/mês</b> por unidade</p><div class="bts"><button class="bt ${db.plano === 'basico' ? 'b' : ''}" data-a="plano" data-v="basico">Assinatura · R$ 199/mês</button></div><p class="leve">Equipe sem limite, histórico de quem fez o quê e até 10 empresas. Anual com 20% a menos. Sem fidelidade.</p></section></div>`;
  },
  ajustes() { return `<div class="abre"><div><h1>Ajustes</h1></div></div><section class="peca" style="max-width:620px"><label class="cp">Nome da rede<input data-aj="rede" value="${x(db.rede)}"></label><label class="cp">Desconto dos horários vazios (%)<input data-aj="desconto" type="number" value="${db.desconto}"></label><p class="leve">Na versão contratada: link de agendamento com preço por horário, cobrança recorrente do clube no cartão, WhatsApp oficial para campanhas e pedido de avaliação no Google (algumas integrações têm custo à parte).</p></section>`; },
};

function monta() {
  const r = location.hash.slice(1) || 'ocupacao', n = { clube: db.recusados.length, avaliacoes: db.avaliacoes.filter((a) => !a.resp && a.nota <= 3).length };
  $('#unidades').innerHTML = [['todas', 'Rede toda'], ...Object.entries(UN).map(([k, u]) => [k, u.nome])].map(([k, nm]) => `<button type="button" data-un="${k}" aria-pressed="${db.un === k}">${nm}</button>`).join('');
  $('#doca').innerHTML = LENTES.map(([k, nm], i) => `${i === 7 ? '<span class="sep"></span>' : ''}<a href="#${k}" ${k === r ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>${nm}${n[k] ? `<span class="n">${n[k]}</span>` : ''}</a>`).join('') + `<span class="sep"></span><button type="button" data-ia><svg viewBox="0 0 24 24" aria-hidden="true">${ICO.ia}</svg>Conselheira</button>`;
  $('#palco').innerHTML = (L[r] || L.ocupacao)();
  $('#rede').textContent = db.rede;
  document.title = `${(LENTES.find(([k]) => k === r) || LENTES[0])[1]} · Veltria Agenda Avançado`;
}
addEventListener('hashchange', () => { monta(); $('#palco').focus({ preventScroll: true }); scrollTo(0, 0); });

function conselheira() {
  const c = $('#conselheira'); c.hidden = false;
  const fs = db.conversa.length ? db.conversa : [{ ia: 1, t: 'Olho a ocupação, o clube, as metas e as avaliações das três casas. Na versão contratada, 20 perguntas grátis por dia; aqui as respostas são de exemplo.' }];
  c.innerHTML = `<header><b>Conselheira</b><button type="button" data-fecha-c aria-label="Fechar">×</button></header><div class="fluxo">${fs.map((m) => `<div class="bal ${m.ia ? 'ia' : 'eu'}">${x(m.t)}</div>`).join('')}<div class="ideias">${['Onde estou perdendo dinheiro?', 'Qual serviço tem margem ruim?', 'Quem está abaixo da meta?', 'Responda a avaliação da Renata'].map((s) => `<button type="button" data-ideia="${x(s)}">${x(s)}</button>`).join('')}</div></div><form id="f-c"><input id="q-c" placeholder="Pergunte" aria-label="Pergunta"><button class="bt b">Enviar</button></form>`;
  c.querySelector('.fluxo').scrollTop = 1e6; $('#q-c').focus();
}
function responde(p) {
  const q = sa(p);
  if (/perd|dinheiro|sobra|vazi/.test(q)) { let v = 0, n = 0; DIAS.forEach((_, d) => HORAS.forEach((h) => { if (occ(d, h) < 0.4 && !(d === 6 && h > 13)) { v += ganhoOferta(d, h); n++; } })); return `O maior vazamento é cadeira vazia: ${n} horários da semana ficam abaixo de 40% (segunda e terça de manhã, sobretudo na Pampulha). Com ${db.desconto}% a menos neles, o ganho estimado é ${R$(v)} por mês.\nDepois: ${db.recusados.length} mensalidades recusadas no clube e 241 clientes em risco.`; }
  if (/margem|servico|custo/.test(q)) { const l = db.fichas.map((f) => { const c = f.insumos.reduce((s, [, qq, cc]) => s + qq * cc, 0); return [f.serv, (f.preco - c - f.preco * 0.4) / f.preco]; }).sort((a, b) => a[1] - b[1]); return `Pior margem: ${l[0][0]} (${pc(l[0][1])} sobra para a casa). Melhor: ${l[l.length - 1][0]} (${pc(l[l.length - 1][1])}).\nSubir a coloração para R$ 195 leva a sobra a 39% sem sair do preço da concorrência do bairro.`; }
  if (/meta|abaixo/.test(q)) return db.equipe.filter((e) => e.real / e.meta < new Date().getDate() / 30).map((e) => `• ${e.nome} (${UN[e.un].nome}): ${pc(e.real / e.meta)} da meta`).join('\n') || 'Todas no ritmo.';
  if (/renata|avalia|respond/.test(q)) return 'Resposta pronta:\n\n"Renata, obrigada por avisar e desculpe pela espera. Não é o padrão da Maison Íris: já ajustamos o intervalo entre os horários na Pampulha. Queremos te receber de novo com uma hidratação por nossa conta. Pode nos chamar no WhatsApp?"';
  return `Ocupação de ${nomeUn()}: ${pc(DIAS.reduce((s, _, d) => s + HORAS.reduce((t, h) => t + occ(d, h), 0), 0) / 84)}. Clube: ${db.planos.reduce((s, pl) => s + pl.assin, 0)} assinantes.`;
}

const A = {
  'ofertar-vazios': () => { DIAS.forEach((_, d) => HORAS.forEach((h) => { const k = `${d}|${h}`; if (occ(d, h) < 0.4 && !(d === 6 && h > 13) && !db.ofertas.includes(k)) db.ofertas.push(k); })); anota(`ativou ${db.desconto}% a menos em ${db.ofertas.length} horários vazios`); salva(); monta(); recado('Ofertas publicadas no link de agendamento.'); },
  'limpar-ofertas': () => { db.ofertas = []; anota('tirou todas as ofertas de horário'); salva(); monta(); },
  'alterna-oferta': () => { const k = db.celSel; db.ofertas = db.ofertas.includes(k) ? db.ofertas.filter((o) => o !== k) : [...db.ofertas, k]; salva(); monta(); },
  recobrar: (d) => { const r = db.recusados.find((y) => y.id === d.id); db.recusados = db.recusados.filter((y) => y !== r); anota(`cobrou de novo a mensalidade de ${r.nome}`); salva(); monta(); recado(`Cobrança de ${r.nome} aprovada na segunda tentativa (demonstração).`); },
  'novo-plano': () => cartao('<h2>Novo plano do clube</h2><form><label class="cp">Nome<input name="n" required placeholder="Hidratação semanal"></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label class="cp">Preço por mês (R$)<input name="p" inputmode="decimal" required></label><label class="cp">Custo de cada uso (R$)<input name="c" inputmode="decimal" value="10"></label></div><div class="rodape"><button type="button" class="bt" data-sair>Cancelar</button><button class="bt b">Criar</button></div></form>', (c, fecha) => c.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const f = new FormData(e.target); db.planos.push({ id: `p${Date.now()}`, nome: f.get('n'), preco: nv(f.get('p')), assin: 0, uso: 0, custoUso: nv(f.get('c')) }); anota(`criou o plano ${f.get('n')}`); salva(); fecha(); monta(); })),
  campanha: (d) => { const s = db.rfm.find((y) => y.k === d.k); cartao(`<h2>Campanha para ${x(s.nome)}</h2><p>${s.n.toLocaleString('pt-BR')} clientes · ${x(s.dica)}</p><label class="cp">Mensagem<input id="msg-c" value="${x(s.msg)}"></label><p class="leve">Sai aos poucos pelo WhatsApp oficial de cada casa, só para quem aceitou receber.</p><div class="rodape"><button class="bt" data-sair>Cancelar</button><button class="bt m" data-ok>Mandar</button></div>`, (c, fecha) => c.querySelector('[data-ok]').addEventListener('click', () => { s.env = true; s.msg = c.querySelector('#msg-c').value; anota(`mandou campanha para ${s.nome} (${s.n})`); salva(); fecha(); monta(); recado(`Campanha programada para ${s.n.toLocaleString('pt-BR')} clientes.`); })); },
  responder: (d) => { const a = db.avaliacoes.find((y) => y.id === d.id); cartao(`<h2>Responder ${x(a.nome)}</h2><p class="leve">“${x(a.texto)}”</p><label class="cp">Resposta<input id="resp" value="${a.nota <= 3 ? 'Obrigada por avisar e desculpe. Queremos te receber de novo: pode nos chamar no WhatsApp?' : 'Muito obrigada! Esperamos você de novo.'}"></label><div class="rodape"><button class="bt" data-sair>Cancelar</button><button class="bt b" data-ok>Publicar resposta</button></div>`, (c, fecha) => c.querySelector('[data-ok]').addEventListener('click', () => { a.resp = true; anota(`respondeu a avaliação de ${a.nome}`); salva(); fecha(); monta(); })); },
  plano: (d) => { db.plano = d.v; salva(); monta(); },
};

document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-ia]')) { conselheira(); return; }
  if (t.closest('[data-fecha-c]')) { $('#conselheira').hidden = true; return; }
  const i = t.closest('[data-ideia]'); if (i) { $('#q-c').value = i.dataset.ideia; $('#f-c').requestSubmit(); return; }
  const u = t.closest('[data-un]'); if (u) { db.un = u.dataset.un; salva(); monta(); return; }
  const c = t.closest('[data-cel]'); if (c) { db.celSel = c.dataset.cel; salva(); monta(); return; }
  const a = t.closest('[data-a]'); if (a && A[a.dataset.a]) A[a.dataset.a](a.dataset);
});
document.addEventListener('submit', (e) => { if (e.target.id !== 'f-c') return; e.preventDefault(); const p = $('#q-c').value.trim(); if (p.length < 3) return; const resp = { ia: 1, t: window.veltriaIA ? 'Pensando…' : `${responde(p)}\n\n(Exemplo da demonstração.)` }; db.conversa.push({ t: p }, resp); db.conversa = db.conversa.slice(-10); salva(); conselheira(); if (window.veltriaIA) window.veltriaIA(p).then((t) => { resp.t = t; salva(); conselheira(); }); });
document.addEventListener('change', (e) => {
  const d = e.target.dataset;
  if (d.preco) { const f = db.fichas.find((y) => y.id === d.preco), ant = f.preco; f.preco = nv(e.target.value); anota(`mudou o preço de ${f.serv} de ${R$(ant)} para ${R$(f.preco)}`); salva(); monta(); }
  if (d.aj) { db[d.aj] = d.aj === 'rede' ? e.target.value : Number(e.target.value); salva(); monta(); recado('Ajuste salvo.'); }
});
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = semear(); location.hash = '#ocupacao'; $('#conselheira').hidden = true; monta(); recado('Demonstração recomeçada.'); });
monta();
