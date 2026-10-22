// Veltria Financeiro Essencial · app de celular do autônomo e do MEI.
// Cada real que entra é dividido em potes (imposto, contas, meu salário, reserva, livre), as cobranças saem por PIX
// com lembretes no WhatsApp, o limite do MEI e o DAS ficam à vista, recibo pronto, assistente, painel do dono,
// configurações e a assinatura (a mesma do site). Dados de exemplo neste aparelho (?novo recomeça).

const CHAVE = 'veltria-financeiro-essencial-v1';
const din = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const t = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nv = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const id = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const dia = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return o === 0 ? 'hoje' : o === -1 ? 'ontem' : o === 1 ? 'amanhã' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''); };
const zap = (tel, m) => `https://wa.me/55${String(tel).replace(/\D/g, '')}?text=${encodeURIComponent(m)}`;
const $ = (s) => document.querySelector(s);

const CORES = { imposto: '#9c7d3c', contas: '#1c5247', salario: '#6e9883', reserva: '#4f6e8a', livre: '#c9b995' };
function comeco() {
  const potes = [['imposto', 'Imposto (DAS)', 6, 81], ['contas', 'Contas fixas', 34, 1180], ['salario', 'Meu salário', 40, 2400], ['reserva', 'Reserva', 10, 6000], ['livre', 'Livre', 10, 0]]
    .map(([k, nome, pct, meta]) => ({ k, nome, pct, meta, saldo: 0 }));
  const db = { negocio: 'Ana Paula · Design de sobrancelhas', dono: 'Ana Paula', pix: 'ana.sobrancelhas@email.com', das: 81, cnpj: '41.226.908/0001-07', potes, movs: [], fatAno: 52340, cobrancas: [], fixas: [], plano: 'basico', ajudantes: [{ nome: 'Bruna (recepção)', ve: { potes: false, receber: true, mei: false } }], assinatura: { valor: 59, status: 'ativa', renova: true, proxima: 12, pagos: [-18, -48, -78] }, conversa: [] };
  const entra = (v, desc, d, cli) => { db.movs.push({ id: id(), tipo: 'entra', valor: v, desc, dia: d, cli }); potes.forEach((p) => { p.saldo += v * p.pct / 100; }); };
  const sai = (v, desc, d, pote) => { db.movs.push({ id: id(), tipo: 'sai', valor: v, desc, dia: d, pote }); potes.find((p) => p.k === pote).saldo -= v; };
  [[680, 'Design + henna (4 clientes)', -9], [1250, 'Micropigmentação · Carla', -7], [420, 'Design (3 clientes)', -5], [900, 'Curso de design · turma', -3], [360, 'Design + buço', -1], [540, 'Laminação (2 clientes)', 0]].forEach(([v, d, o]) => entra(v, d, o));
  [[650, 'Aluguel da sala', -8, 'contas'], [92, 'Internet e celular', -6, 'contas'], [180, 'Pigmentos e lâminas', -4, 'contas'], [1500, 'Meu salário (retirada)', -2, 'salario'], [76, 'Pizza com as meninas', -1, 'livre']].forEach(([v, d, o, p]) => sai(v, d, o, p));
  db.cobrancas = [{ id: id(), cli: 'Carla Menezes', tel: '31988871122', valor: 450, desc: 'Retoque da micropigmentação', vence: -3, status: 'aberta', avisos: [-4, -3] }, { id: id(), cli: 'Studio Bella (curso)', tel: '31991230987', valor: 1200, desc: 'Curso in company · 2ª parcela', vence: 2, status: 'aberta', avisos: [] }, { id: id(), cli: 'Juliana Prado', tel: '31996654433', valor: 180, desc: 'Design + henna', vence: 0, status: 'aberta', avisos: [-1] }, { id: id(), cli: 'Marina Lopes', tel: '31994412200', valor: 260, desc: 'Laminação', vence: -6, status: 'paga', avisos: [-7, -6] }];
  db.fixas = [{ id: id(), desc: 'DAS do MEI', valor: 81, dia: 20, pote: 'imposto', paga: false }, { id: id(), desc: 'Aluguel da sala', valor: 650, dia: 5, pote: 'contas', paga: true }, { id: id(), desc: 'Internet e celular', valor: 92, dia: 10, pote: 'contas', paga: true }, { id: id(), desc: 'Contador (opcional)', valor: 0, dia: 15, pote: 'contas', paga: true }];
  return db;
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || comeco(); } catch { return comeco(); } })();
const grava = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { aviso('Sem espaço no celular.'); } };
const pote = (k) => db.potes.find((p) => p.k === k);
const total = () => db.potes.reduce((s, p) => s + p.saldo, 0);
const doMes = (tipo) => db.movs.filter((m) => m.tipo === tipo && m.dia > -30).reduce((s, m) => s + m.valor, 0);
const estAss = () => { const a = db.assinatura; return a.status === 'vencida' ? 'vencida: pague para continuar' : a.renova ? `ativa · próxima ${dia(a.proxima)}` : `cancelada · usa até ${dia(a.proxima)}`; };
const atrasada = (c) => c.status === 'aberta' && c.vence < 0;

function aviso(m) { const a = document.createElement('div'); a.className = 'aviso'; a.textContent = m; $('#avisos').append(a); setTimeout(() => a.remove(), 3200); }
function folha(html, liga) {
  const v = document.createElement('div'); v.className = 'veu'; v.innerHTML = `<div class="folha" role="dialog" aria-modal="true">${html}</div>`;
  const antes = document.activeElement; document.body.append(v);
  const fecha = () => { v.remove(); antes?.focus?.(); };
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-fecha]')) fecha(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); });
  setTimeout(() => (v.querySelector('input, select') || v.querySelector('button'))?.focus(), 40);
  liga?.(v.querySelector('.folha'), fecha);
}

// ------------------------------------------------------------------ telas
let rascunho = { tipo: 'entra', valor: '', pote: 'contas', desc: '' };
const T = {
  potes() {
    const abertas = db.cobrancas.filter((c) => c.status === 'aberta'), das = db.fixas.find((f) => f.pote === 'imposto');
    return `<section class="saldo"><small>Dinheiro guardado nos potes</small><span class="num">${din(total())}</span><div class="mes"><span>Entrou no mês <b>${din(doMes('entra'))}</b></span><span>Saiu <b>${din(doMes('sai'))}</b></span></div></section>
      <div class="prateleira">${db.potes.map((p) => { const ch = p.meta ? Math.max(0, Math.min(1, p.saldo / p.meta)) : Math.min(1, p.saldo / 800); return `<button type="button" class="pote ${p.saldo < 0 ? 'baixo' : ''}" data-ir="pote/${p.k}" style="--c:${CORES[p.k]}"><div class="vidro"><i style="height:${Math.max(4, ch * 100)}%"></i><span>${p.pct}%</span></div><b>${t(p.nome)}</b><span class="num">${din(p.saldo)}</span>${p.meta ? `<small>meta ${din(p.meta)}</small>` : '<small>gaste sem culpa</small>'}</button>`; }).join('')}</div>
      <div class="miolo">${das && !das.paga ? `<div class="cartao"><b>DAS de ${din(db.das)} vence dia ${das.dia}</b><p class="mini" style="margin:2px 0 8px">${pote('imposto').saldo >= db.das ? 'O pote do imposto já tem o dinheiro.' : `Faltam ${din(db.das - pote('imposto').saldo)} no pote do imposto.`}</p><button type="button" class="bt pq cheio" data-acao="pagar-das">Paguei o DAS</button></div>` : ''}
      ${abertas.length ? `<div class="cartao"><b>${din(abertas.reduce((s, c) => s + c.valor, 0))} para receber</b><p class="mini" style="margin:2px 0 8px">${abertas.filter(atrasada).length} atrasada(s). Os lembretes saem pelo seu WhatsApp.</p><a class="bt pq" href="#receber">Ver cobranças</a></div>` : ''}
      <h2>Últimos movimentos</h2><div class="cartao">${[...db.movs].reverse().slice(0, 6).map(linhaMov).join('')}</div><a href="#extrato">Ver o extrato todo</a></div>`;
  },
  pote(k) {
    const p = pote(k); if (!p) return T.potes();
    const ms = db.movs.filter((m) => m.tipo === 'entra' || m.pote === k).reverse();
    return `<div class="miolo"><a href="#potes">← Potes</a><h1>${t(p.nome)}</h1><p class="sub">${p.pct}% de tudo que entra vem para cá. Saldo: <b class="num">${din(p.saldo)}</b>${p.meta ? ` de ${din(p.meta)}` : ''}.</p>
      <label class="campo">Quanto de cada entrada vai para este pote (%)<input type="number" min="0" max="100" data-pct="${p.k}" value="${p.pct}"></label>
      <div class="linha"><button type="button" class="bt pq" data-acao="mover" data-de="${p.k}">Passar para outro pote</button></div>
      <h2>Movimentos</h2><div class="cartao">${ms.map((m) => m.tipo === 'entra' ? linhaMov({ ...m, valor: m.valor * p.pct / 100, desc: `${m.desc} (parte do pote)` }) : linhaMov(m)).join('') || '<p class="mini">Nada ainda.</p>'}</div></div>`;
  },
  extrato() { return `<div class="miolo"><a href="#potes">← Potes</a><h1>Extrato</h1><p class="sub">Tudo que entrou e saiu, do mais novo ao mais antigo.</p><div class="cartao">${[...db.movs].reverse().map(linhaMov).join('')}</div></div>`; },
  lancar() {
    const r = rascunho, v = nv(r.valor) / 100;
    return `<div class="miolo"><h1>${r.tipo === 'entra' ? 'Entrou dinheiro' : 'Saiu dinheiro'}</h1>
      <div class="alterna" role="group" aria-label="Tipo"><button type="button" data-tipo="entra" aria-pressed="${r.tipo === 'entra'}">Entrou</button><button type="button" class="sai" data-tipo="sai" aria-pressed="${r.tipo === 'sai'}">Saiu</button></div>
      <div class="visor-valor" aria-live="polite">${din(v)}</div>
      <div class="teclado">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'].map((k) => `<button type="button" data-tecla="${k}" aria-label="${k === '⌫' ? 'Apagar' : k}">${k}</button>`).join('')}</div>
      ${r.tipo === 'entra' ? `<p class="mini">Vai ser dividido assim:</p><div class="divisao">${db.potes.map((p) => `<div style="--c:${CORES[p.k]}"><span>${t(p.nome)}</span><b class="num">${din(v * p.pct / 100)}</b></div>`).join('')}</div>` : `<p class="mini">Sai de qual pote?</p><div class="chips">${db.potes.map((p) => `<button type="button" data-pote-sai="${p.k}" aria-pressed="${r.pote === p.k}">${t(p.nome)}</button>`).join('')}</div>`}
      <label class="campo">${r.tipo === 'entra' ? 'De quê? (cliente, serviço)' : 'Com quê?'}<input id="desc-l" value="${t(r.desc)}" placeholder="${r.tipo === 'entra' ? 'Design + henna' : 'Pigmentos'}"></label>
      <button type="button" class="bt cheio largo" data-acao="salvar-mov" ${v ? '' : 'disabled'}>Guardar ${din(v)}</button>${r.tipo === 'entra' ? '<p class="mini" style="text-align:center">Quer o recibo? Depois de guardar, toque no movimento.</p>' : ''}</div>`;
  },
  receber() {
    const l = [...db.cobrancas].sort((a, b) => (a.status === 'paga') - (b.status === 'paga') || a.vence - b.vence);
    return `<div class="miolo"><h1>A receber</h1><p class="sub">Mande a cobrança com o PIX. O app avisa o cliente 1 dia antes, no dia e 3 dias depois, sempre pelo seu WhatsApp.</p><button type="button" class="bt cheio largo" data-acao="nova-cob">+ Nova cobrança</button>
      <h2>Cobranças</h2>${l.map((c) => { const marcos = [c.vence - 1, c.vence, c.vence + 3]; return `<div class="cartao"><div style="display:flex;justify-content:space-between;gap:8px"><div><b>${t(c.cli)}</b><small class="mini" style="display:block">${t(c.desc)}</small></div><span class="num" style="font-size:1.25rem">${din(c.valor)}</span></div>
        <p class="mini" style="margin:6px 0 0">${c.status === 'paga' ? '<span class="etq ok">recebido</span>' : atrasada(c) ? `<span class="etq ru">atrasada ${-c.vence} dia(s)</span>` : c.vence === 0 ? '<span class="etq at">vence hoje</span>' : `<span class="etq">vence ${dia(c.vence)}</span>`}</p>
        <div class="regua" aria-label="Lembretes">${['1 dia antes', 'no dia', '3 dias depois'].map((n, i) => `<span class="${c.avisos.includes(marcos[i]) ? 'feito' : marcos[i] === 0 ? 'hoje' : ''}">${n}</span>`).join('')}</div>
        ${c.status === 'aberta' ? `<div class="linha"><a class="bt pq cheio" target="_blank" rel="noopener" data-lembrou="${c.id}" href="${zap(c.tel, `Oi, ${c.cli.split(' ')[0]}! ${atrasada(c) ? 'Passando para lembrar do' : 'Segue o'} pagamento de ${din(c.valor)} (${c.desc}). PIX: ${db.pix}. Obrigada!`)}">Lembrar no WhatsApp</a><button type="button" class="bt pq" data-acao="recebi" data-c="${c.id}">Recebi</button></div>` : ''}</div>`; }).join('')}</div>`;
  },
  mei() {
    const lim = 81000, uso = db.fatAno / lim, mes = new Date().getMonth() + 1, proj = db.fatAno / mes * 12;
    return `<div class="miolo"><h1>Meu MEI</h1><p class="sub">${t(db.cnpj)} · o que o governo olha, sem complicação.</p>
      <div class="cartao"><b>Faturamento do ano</b><p class="num" style="font-size:1.8rem;margin:4px 0 0">${din(db.fatAno)}</p><div class="medidor"><i class="${uso > 0.8 ? 'perto' : ''}" style="width:${Math.min(100, uso * 100)}%"></i></div><p class="mini" style="margin:0">${Math.round(uso * 100)}% do limite de ${din(lim)}. No ritmo atual você fecha o ano com ${din(proj)}${proj > lim ? ': <b style="color:var(--vermelho)">passa do limite</b>. Fale com um contador sobre virar ME antes de dezembro.' : ', dentro do limite.'}</p></div>
      <div class="cartao"><b>DAS do mês</b><p class="mini" style="margin:2px 0 8px">${din(db.das)} · vence dia 20. ${db.fixas.find((f) => f.pote === 'imposto')?.paga ? '<span class="etq ok">pago</span>' : '<span class="etq at">a pagar</span>'}</p><a class="bt pq" target="_blank" rel="noopener" href="https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao">Gerar a guia no site do governo</a></div>
      <div class="cartao"><b>Declaração anual (DASN)</b><p class="mini" style="margin:2px 0 8px">Até 31 de maio. O app já soma o que você precisa informar: ${din(db.fatAno)} de serviços.</p><button type="button" class="bt pq" data-acao="dasn">Ver o resumo da declaração</button></div>
      <div class="cartao"><b>Recibo</b><p class="mini" style="margin:2px 0 8px">Para cliente que pede comprovante. Nota fiscal de serviço (NFS-e) sai na versão contratada.</p><button type="button" class="bt pq" data-acao="recibo">Fazer um recibo</button></div></div>`;
  },
  mais() {
    const l = [['ia', 'Assistente', 'pergunte sobre o seu dinheiro'], ['contas', 'Contas fixas', 'aluguel, internet, DAS: o que vence quando'], ['assinatura', 'Minha assinatura', estAss()], ['dono', 'Painel do dono', 'quem ajuda e o que cada um vê'], ['config', 'Configurações', 'nome, PIX, CNPJ, valor do DAS']];
    return `<div class="miolo"><h1>Mais</h1><div class="lista-mais">${l.map(([k, n, s]) => `<a href="#${k}"><span><b>${n}</b><small>${t(s)}</small></span><span aria-hidden="true">›</span></a>`).join('')}</div></div>`;
  },
  contas() {
    return `<div class="miolo"><a href="#mais">← Mais</a><h1>Contas fixas</h1><p class="sub">Saem do pote certo quando você marca como paga.</p>${db.fixas.filter((f) => f.valor).map((f) => `<div class="cartao" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><b>${t(f.desc)}</b><small class="mini" style="display:block">dia ${f.dia} · pote ${t(pote(f.pote).nome)}</small></div><div style="text-align:right"><span class="num">${din(f.valor)}</span><br>${f.paga ? '<span class="etq ok">paga</span>' : `<button type="button" class="bt pq" data-acao="pagar-fixa" data-f="${f.id}">Paguei</button>`}</div></div>`).join('')}<button type="button" class="bt largo" data-acao="nova-fixa">+ Conta fixa</button></div>`;
  },
  ia() {
    const conv = db.conversa.length ? db.conversa : [{ ia: 1, t: `Oi, ${db.dono.split(' ')[0]}! Eu vejo seus potes, cobranças e o MEI. Pergunte do seu jeito. Na versão contratada são 20 perguntas grátis por dia.` }];
    return `<div class="miolo"><a href="#mais">← Mais</a><h1>Assistente</h1><div class="chat">${conv.map((m) => `<div class="bolha ${m.ia ? 'ia' : 'eu'}">${t(m.t)}</div>`).join('')}</div>
      <div class="chips">${['Quanto posso gastar este mês?', 'Quem está me devendo?', 'Vou estourar o MEI?', 'Quanto tirei de salário?'].map((s) => `<button type="button" data-sug="${t(s)}">${t(s)}</button>`).join('')}</div>
      <form class="form-ia" id="f-ia"><input id="q-ia" placeholder="Pergunte" aria-label="Pergunta"><button class="bt cheio">Enviar</button></form></div>`;
  },
  assinatura() {
    const a = db.assinatura;
    const topo = a.status === 'vencida' ? `<div class="cartao" style="border-color:var(--vermelho)"><b style="color:var(--vermelho)">Assinatura vencida</b><p class="mini" style="margin:4px 0 0">O pagamento de ${din(a.valor)} não foi aprovado. Seus potes e cobranças estão guardados.</p></div>`
      : a.renova ? `<div class="cartao"><b>Ativa</b><p class="mini" style="margin:4px 0 0">Plano ${db.plano === 'pro' ? 'Pro' : 'Básico'} · ${din(a.valor)} por mês · próxima cobrança ${dia(a.proxima)}.</p></div>`
        : `<div class="cartao" style="border-color:var(--palha)"><b>Cancelada</b><p class="mini" style="margin:4px 0 0">Você usa tudo até ${dia(a.proxima)}. Depois disso nada mais é cobrado.</p></div>`;
    return `<div class="miolo"><a href="#mais">← Mais</a><h1>Minha assinatura</h1><p class="sub">A mesma da sua conta no site. Sem fidelidade.</p>${topo}
      <div class="linha">${a.status === 'vencida' ? '<button type="button" class="bt cheio" data-acao="pagar">Pagar aqui no app</button><a class="bt" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a>' : a.renova ? '<button type="button" class="bt" data-acao="cancelar">Cancelar assinatura</button>' : '<button type="button" class="bt cheio" data-acao="reativar">Reativar</button>'}</div>
      <h2>Pagamentos</h2><div class="cartao">${a.pagos.map((d) => `<div class="mov"><span class="ic">✓</span><span>Mensalidade<small>${dia(d)}</small></span><span class="num">${din(a.valor)}</span></div>`).join('')}</div></div>`;
  },
  dono() {
    return `<div class="miolo"><a href="#mais">← Mais</a><h1>Painel do dono</h1><p class="sub">Quem te ajuda entra com o próprio celular e só vê o que você deixar.</p>
      ${db.ajudantes.map((p, i) => `<div class="cartao"><b>${t(p.nome)}</b>${[['potes', 'Ver os potes e o saldo'], ['receber', 'Cobrar clientes'], ['mei', 'Ver o MEI']].map(([k, n]) => `<label style="display:flex;justify-content:space-between;padding:8px 0">${n}<input type="checkbox" data-ve="${i}.${k}" ${p.ve[k] ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--esm)"></label>`).join('')}</div>`).join('')}
      <button type="button" class="bt largo" data-acao="ajudante">+ Convidar ajudante</button>
      <h2>Plano</h2><div class="chips"><button type="button" data-plano="basico" aria-pressed="${db.plano === 'basico'}">Básico · R$ 59</button><button type="button" data-plano="pro" aria-pressed="${db.plano === 'pro'}">Pro · R$ 119</button></div><p class="mini">Básico: você + 5 pessoas. Pro: sem limite e histórico de quem fez o quê. Anual com 20% a menos.</p></div>`;
  },
  config() {
    return `<div class="miolo"><a href="#mais">← Mais</a><h1>Configurações</h1>${[['negocio', 'Seu nome e negócio'], ['dono', 'Como te chamo'], ['pix', 'Chave PIX das cobranças'], ['cnpj', 'CNPJ do MEI']].map(([k, n]) => `<label class="campo">${n}<input data-cfg="${k}" value="${t(db[k])}"></label>`).join('')}<label class="campo">Valor do DAS (R$)<input data-cfg="das" inputmode="decimal" value="${db.das}"></label><label class="campo">Faturamento do ano até hoje (R$)<input data-cfg="fatAno" inputmode="decimal" value="${db.fatAno}"></label><p class="mini">Os dados ficam no seu celular e na sua conta. Funciona sem internet: o que você lançar sobe quando a conexão voltar.</p></div>`;
  },
};
function linhaMov(m) { const sai = m.tipo === 'sai'; return `<div class="mov" ${sai ? '' : `data-recibo-mov="${m.id}" role="button" tabindex="0"`}><span class="ic ${sai ? 'sai' : ''}">${sai ? '↑' : '↓'}</span><span>${t(m.desc)}<small>${dia(m.dia)}${sai && m.pote ? ` · pote ${t(pote(m.pote)?.nome || '')}` : ''}</small></span><span class="num ${sai ? 'sai' : ''}">${sai ? '−' : '+'}${din(m.valor)}</span></div>`; }

function responde(p) {
  const x = sa(p), livre = pote('livre').saldo, sal = pote('salario').saldo;
  if (/gastar|posso|sobra/.test(x)) return `Sem mexer em imposto, contas e reserva, você pode gastar ${din(livre)} (pote Livre). Se quiser tirar mais salário, o pote Meu salário tem ${din(sal)}.`;
  if (/devend|deve|receber|cobr/.test(x)) { const a = db.cobrancas.filter((c) => c.status === 'aberta'); return a.length ? a.map((c) => `• ${c.cli}: ${din(c.valor)} ${atrasada(c) ? `(atrasada ${-c.vence} dia(s))` : `(vence ${dia(c.vence)})`}`).join('\n') + '\n\nQuer que eu prepare a mensagem de lembrete?' : 'Ninguém está te devendo.'; }
  if (/mei|limite|estour/.test(x)) { const proj = db.fatAno / (new Date().getMonth() + 1) * 12; return `Você faturou ${din(db.fatAno)} no ano. No ritmo atual fecha em ${din(proj)}; o limite é R$ 81.000,00. ${proj > 81000 ? 'Vai passar: converse com um contador sobre virar ME.' : `Sobra uma folga de ${din(81000 - proj)}.`}`; }
  if (/salario|tirei|retir/.test(x)) { const r = db.movs.filter((m) => m.pote === 'salario' && m.dia > -30).reduce((s, m) => s + m.valor, 0); return `Você tirou ${din(r)} de salário nos últimos 30 dias, e ainda tem ${din(sal)} no pote.`; }
  return `Hoje você tem ${din(total())} nos potes e ${din(db.cobrancas.filter((c) => c.status === 'aberta').reduce((s, c) => s + c.valor, 0))} para receber.`;
}

// ------------------------------------------------------------------ navegação, trava e pagamento
function mostra() {
  const [r, a] = (location.hash.slice(1) || 'potes').split('/');
  const tela = $('#tela'); tela.innerHTML = (T[r] || T.potes)(a);
  const aba = { pote: 'potes', extrato: 'potes', lancar: '', ia: 'mais', contas: 'mais', assinatura: 'mais', dono: 'mais', config: 'mais' }[r] ?? r;
  document.querySelectorAll('.doca a').forEach((l) => { if (l.dataset.aba === aba) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current'); });
  $('.fab').hidden = r === 'lancar';
  $('#nome-neg').textContent = db.negocio;
  const h = new Date().getHours(); $('#saudacao').textContent = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  if (!db.assinatura.renova && db.assinatura.status !== 'vencida' && r !== 'assinatura') tela.insertAdjacentHTML('afterbegin', `<p class="cartao" style="margin:12px 18px 0;padding:8px 12px;background:#f1e5c8">Assinatura cancelada: você usa até ${dia(db.assinatura.proxima)}. <a href="#assinatura">Reativar</a></p>`);
  trava(r);
  document.title = `${{ potes: 'Potes', pote: 'Pote', extrato: 'Extrato', lancar: 'Lançar', receber: 'A receber', mei: 'Meu MEI', mais: 'Mais', contas: 'Contas fixas', ia: 'Assistente', assinatura: 'Minha assinatura', dono: 'Painel do dono', config: 'Configurações' }[r] || 'Potes'} · Veltria Financeiro Essencial`;
}
addEventListener('hashchange', () => { mostra(); $('#tela').focus({ preventScroll: true }); scrollTo(0, 0); });
function trava(r) {
  document.querySelector('.trava')?.remove();
  if (db.assinatura.status !== 'vencida' || r === 'assinatura') return;
  const v = document.createElement('div'); v.className = 'veu trava';
  v.innerHTML = `<div class="folha" role="alertdialog" aria-modal="true" aria-labelledby="tr-t"><h2 id="tr-t">Sua assinatura venceu</h2><p class="sub">O pagamento não foi aprovado. Seus potes, cobranças e o histórico estão guardados: renove para continuar.</p><div style="display:grid;gap:8px"><button type="button" class="bt cheio largo" data-acao="pagar">Pagar aqui no app</button><a class="bt largo" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a><a class="bt largo" href="#assinatura" style="border-style:dashed">Ver minha assinatura</a></div></div>`;
  document.body.append(v);
}
const ACOES = {
  'salvar-mov': () => {
    const r = rascunho, v = nv(r.valor) / 100, desc = $('#desc-l').value.trim() || (r.tipo === 'entra' ? 'Entrada' : 'Saída');
    if (!v) return;
    if (r.tipo === 'entra') { db.movs.push({ id: id(), tipo: 'entra', valor: v, desc, dia: 0 }); db.potes.forEach((p) => { p.saldo += v * p.pct / 100; }); db.fatAno += v; }
    else { db.movs.push({ id: id(), tipo: 'sai', valor: v, desc, dia: 0, pote: r.pote }); pote(r.pote).saldo -= v; if (pote(r.pote).saldo < 0) aviso(`O pote ${pote(r.pote).nome} ficou negativo.`); }
    rascunho = { tipo: r.tipo, valor: '', pote: r.pote, desc: '' }; grava(); location.hash = '#potes'; aviso(r.tipo === 'entra' ? `${din(v)} dividido nos potes.` : `${din(v)} saiu do pote.`);
  },
  'pagar-das': () => { const f = db.fixas.find((x) => x.pote === 'imposto'); f.paga = true; db.movs.push({ id: id(), tipo: 'sai', valor: db.das, desc: 'DAS do MEI', dia: 0, pote: 'imposto' }); pote('imposto').saldo -= db.das; grava(); mostra(); aviso('DAS pago. Imposto em dia.'); },
  'pagar-fixa': (d) => { const f = db.fixas.find((x) => x.id === d.f); f.paga = true; db.movs.push({ id: id(), tipo: 'sai', valor: f.pote === 'imposto' ? db.das : f.valor, desc: f.desc, dia: 0, pote: f.pote }); pote(f.pote).saldo -= f.valor; grava(); mostra(); },
  'nova-fixa': () => folha(`<h2>Nova conta fixa</h2><form><label class="campo">O que é<input name="d" required></label><label class="campo">Valor (R$)<input name="v" inputmode="decimal" required></label><label class="campo">Vence todo dia<input name="dia" type="number" min="1" max="31" value="10"></label><label class="campo">Sai do pote<select name="p">${db.potes.map((p) => `<option value="${p.k}" ${p.k === 'contas' ? 'selected' : ''}>${t(p.nome)}</option>`).join('')}</select></label><button class="bt cheio largo">Guardar</button></form>`, (f, fecha) => f.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const x = new FormData(e.target); db.fixas.push({ id: id(), desc: x.get('d'), valor: nv(x.get('v')), dia: Number(x.get('dia')), pote: x.get('p'), paga: false }); grava(); fecha(); mostra(); })),
  mover: (d) => folha(`<h2>Passar dinheiro entre potes</h2><form><label class="campo">Para o pote<select name="p">${db.potes.filter((p) => p.k !== d.de).map((p) => `<option value="${p.k}">${t(p.nome)}</option>`).join('')}</select></label><label class="campo">Quanto (R$)<input name="v" inputmode="decimal" required></label><button class="bt cheio largo">Passar</button></form>`, (f, fecha) => f.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const x = new FormData(e.target), v = nv(x.get('v')); pote(d.de).saldo -= v; pote(x.get('p')).saldo += v; grava(); fecha(); mostra(); aviso(`${din(v)} passou para ${pote(x.get('p')).nome}.`); })),
  'nova-cob': () => folha(`<h2>Nova cobrança</h2><form><label class="campo">Cliente<input name="c" required></label><label class="campo">WhatsApp<input name="t" inputmode="tel" required></label><label class="campo">Valor (R$)<input name="v" inputmode="decimal" required></label><label class="campo">O que foi<input name="d"></label><label class="campo">Vence em (dias)<input name="o" type="number" value="0"></label><button class="bt cheio largo">Criar e mandar PIX</button></form>`, (f, fecha) => f.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const x = new FormData(e.target); db.cobrancas.push({ id: id(), cli: x.get('c'), tel: x.get('t'), valor: nv(x.get('v')), desc: x.get('d') || 'Serviço', vence: Number(x.get('o')), status: 'aberta', avisos: [] }); grava(); fecha(); mostra(); aviso('Cobrança criada. Os lembretes já estão programados.'); })),
  recebi: (d) => { const c = db.cobrancas.find((x) => x.id === d.c); c.status = 'paga'; db.movs.push({ id: id(), tipo: 'entra', valor: c.valor, desc: `${c.desc} · ${c.cli}`, dia: 0 }); db.potes.forEach((p) => { p.saldo += c.valor * p.pct / 100; }); db.fatAno += c.valor; grava(); mostra(); aviso(`${din(c.valor)} recebido e dividido nos potes.`); },
  dasn: () => folha(`<h2>Resumo da declaração anual</h2><div class="cartao"><p>Receita bruta com serviços: <b class="num">${din(db.fatAno)}</b></p><p>Receita com comércio/indústria: <b class="num">${din(0)}</b></p><p>Teve empregado? <b>Não</b></p></div><p class="mini">Copie esses números no site do Simples Nacional (DASN-SIMEI) até 31 de maio.</p><button type="button" class="bt cheio largo" data-fecha>Entendi</button>`),
  recibo: (d) => { const m = d?.m ? db.movs.find((x) => x.id === d.m) : null; folha(`<h2>Recibo</h2><form id="f-rec"><label class="campo">Recebi de<input name="c" value="${t(m?.cli || '')}" required></label><label class="campo">Valor (R$)<input name="v" inputmode="decimal" value="${m ? String(m.valor).replace('.', ',') : ''}" required></label><label class="campo">Referente a<input name="r" value="${t(m?.desc || '')}" required></label><button class="bt cheio largo">Gerar recibo</button></form>`, (f) => f.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const x = new FormData(e.target), txt = `Recebi de ${x.get('c')} a quantia de ${din(nv(x.get('v')))}, referente a ${x.get('r')}. ${db.negocio} · CNPJ ${db.cnpj} · ${new Date().toLocaleDateString('pt-BR')}`; f.innerHTML = `<h2>Recibo pronto</h2><div class="recibo"><h3>Recibo · ${din(nv(x.get('v')))}</h3><p>${t(txt)}</p><p style="margin-top:28px;border-top:1px solid #999;padding-top:4px;width:70%">${t(db.dono)}</p></div><div class="linha"><a class="bt cheio" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">Mandar no WhatsApp</a><button type="button" class="bt" onclick="print()">Imprimir ou PDF</button><button type="button" class="bt" data-fecha>Fechar</button></div>`; })); },
  ajudante: () => folha('<h2>Convidar ajudante</h2><form><label class="campo">Nome<input name="n" required></label><button class="bt cheio largo">Mandar convite</button></form>', (f, fecha) => f.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); db.ajudantes.push({ nome: new FormData(e.target).get('n'), ve: { potes: false, receber: true, mei: false } }); grava(); fecha(); mostra(); aviso('Convite enviado. A pessoa entra com o próprio celular.'); })),
  pagar: () => folha(`<h2>Pagar ${din(db.assinatura.valor)}</h2><p class="sub">Escolha como pagar. Libera na hora.</p><div class="chips"><button type="button" aria-pressed="true">PIX</button><button type="button" aria-pressed="false">Cartão</button></div><div class="cartao"><p class="mini">PIX copia e cola (demonstração):</p><code style="word-break:break-all;font-size:.78rem">00020126580014BR.GOV.BCB.PIX0136bluerose-demo520400005303986540${db.assinatura.valor}.005802BR</code></div><button type="button" class="bt cheio largo" data-pago>Simular pagamento aprovado</button>`, (f, fecha) => f.querySelector('[data-pago]').addEventListener('click', () => { const a = db.assinatura; a.status = 'ativa'; a.renova = true; a.pagos.unshift(0); a.proxima = 30; grava(); fecha(); mostra(); aviso('Pagamento aprovado. Tudo liberado.'); })),
  cancelar: () => { if (confirm(`Cancelar? Você usa até ${dia(db.assinatura.proxima)} e nada mais é cobrado.`)) { db.assinatura.renova = false; grava(); mostra(); } },
  reativar: () => { db.assinatura.renova = true; grava(); mostra(); aviso('Assinatura reativada.'); },
};

document.addEventListener('click', (e) => {
  const el = e.target;
  const ir = el.closest('[data-ir]'); if (ir) { location.hash = `#${ir.dataset.ir}`; return; }
  const tc = el.closest('[data-tecla]'); if (tc) { const k = tc.dataset.tecla; rascunho.desc = $('#desc-l')?.value || rascunho.desc; rascunho.valor = k === '⌫' ? rascunho.valor.slice(0, -1) : (rascunho.valor + k).replace(/^0+/, '').slice(0, 9); mostra(); return; }
  const tp = el.closest('[data-tipo]'); if (tp) { rascunho.desc = $('#desc-l')?.value || ''; rascunho.tipo = tp.dataset.tipo; mostra(); return; }
  const ps = el.closest('[data-pote-sai]'); if (ps) { rascunho.desc = $('#desc-l')?.value || ''; rascunho.pote = ps.dataset.poteSai; mostra(); return; }
  const lb = el.closest('[data-lembrou]'); if (lb) { const c = db.cobrancas.find((x) => x.id === lb.dataset.lembrou); if (!c.avisos.includes(0)) c.avisos.push(0); grava(); setTimeout(mostra, 300); return; }
  const rm = el.closest('[data-recibo-mov]'); if (rm) { ACOES.recibo({ m: rm.dataset.reciboMov }); return; }
  const sg = el.closest('[data-sug]'); if (sg) { $('#q-ia').value = sg.dataset.sug; $('#f-ia').requestSubmit(); return; }
  const pl = el.closest('[data-plano]'); if (pl) { db.plano = pl.dataset.plano; db.assinatura.valor = db.plano === 'pro' ? 119 : 59; grava(); mostra(); return; }
  const ac = el.closest('[data-acao]'); if (ac && ACOES[ac.dataset.acao]) ACOES[ac.dataset.acao](ac.dataset);
});
document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset?.reciboMov) { e.preventDefault(); ACOES.recibo({ m: e.target.dataset.reciboMov }); } });
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'f-ia') return; e.preventDefault();
  const p = $('#q-ia').value.trim(); if (p.length < 3) return;
  db.conversa.push({ t: p }, { ia: 1, t: responde(p) }); db.conversa = db.conversa.slice(-12); grava(); mostra(); scrollTo(0, document.body.scrollHeight);
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.pct) { pote(el.dataset.pct).pct = Math.max(0, Math.min(100, Number(el.value))); const soma = db.potes.reduce((s, p) => s + p.pct, 0); grava(); aviso(soma === 100 ? 'Divisão salva.' : `A soma dos potes está em ${soma}%. Ajuste para dar 100%.`); }
  if (el.dataset.cfg) { db[el.dataset.cfg] = ['das', 'fatAno'].includes(el.dataset.cfg) ? nv(el.value) : el.value; grava(); mostra(); aviso('Salvo.'); }
  if (el.dataset.ve) { const [i, k] = el.dataset.ve.split('.'); db.ajudantes[i].ve[k] = el.checked; grava(); }
});
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data?.simular) return; const a = db.assinatura;
  if (e.data.simular === 'cancelar') { a.renova = false; a.status = 'ativa'; }
  if (e.data.simular === 'recusado') { a.status = 'vencida'; a.renova = true; }
  if (e.data.simular === 'normal') { db.assinatura = comeco().assinatura; db.plano = 'basico'; }
  grava(); mostra();
});
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = comeco(); location.hash = '#potes'; mostra(); aviso('Demonstração recomeçada.'); });
if (window !== window.top) document.documentElement.classList.add('no-celular');
if ('serviceWorker' in navigator && window === window.top) navigator.serviceWorker.register('sw.js').catch(() => {});
mostra();
