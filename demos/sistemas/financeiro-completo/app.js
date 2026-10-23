// Veltria Financeiro Completo · protótipo "fluxo do mês" para pequena empresa de serviços (climatização, manutenção).
// A tela principal é a régua dos próximos 30 dias com o saldo projetado; a receber com régua de cobrança e PIX,
// a pagar, conciliação do extrato do banco, contratos recorrentes (PMOC), orçamentos aprovados pelo celular,
// resultado com imposto estimado e pacote do contador, equipe, ajustes e assistente. Dados de exemplo (?novo recomeça).

const CHAVE = 'veltria-financeiro-completo-v1';
const R$ = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const R0 = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const h = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nv = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const uid = () => `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const $ = (s) => document.querySelector(s);
const data = (o, curto) => { const d = new Date(); d.setDate(d.getDate() + o); return o === 0 && !curto ? 'hoje' : o === 1 && !curto ? 'amanhã' : d.toLocaleDateString('pt-BR', curto ? { day: '2-digit' } : { day: '2-digit', month: '2-digit' }); };
const semana = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toLocaleDateString('pt-BR', { weekday: 'long' }); };

function base() {
  const L = (tipo, desc, quem, valor, venc, status, cat, extra = {}) => ({ id: uid(), tipo, desc, quem, valor, venc, status, cat, avisos: [], ...extra });
  const lancs = [
    L('r', 'Instalação split 12.000 BTUs (3 un.)', 'Clínica Sorriso Pleno', 3840, -6, 'aberto', 'Instalação', { tel: '31991230001' }),
    L('r', 'PMOC mensal · outubro', 'Escritório Andrade & Lima', 1450, -2, 'aberto', 'Contratos', { tel: '31991230002', avisos: [-3, -2] }),
    L('r', 'Manutenção corretiva VRF', 'Hotel Savassi', 6200, 0, 'aberto', 'Manutenção', { tel: '31991230003', avisos: [-3] }),
    L('r', 'PMOC mensal · outubro', 'Colégio Horizonte', 2300, 3, 'aberto', 'Contratos', { tel: '31991230004' }),
    L('r', 'Higienização 8 aparelhos', 'Academia Forma', 1280, 5, 'aberto', 'Manutenção', { tel: '31991230005' }),
    L('r', 'Projeto de climatização (50%)', 'Restaurante Dom Tempero', 9500, 12, 'aberto', 'Projetos', { tel: '31991230006' }),
    L('r', 'PMOC mensal · novembro', 'Escritório Andrade & Lima', 1450, 28, 'aberto', 'Contratos', { tel: '31991230002' }),
    L('r', 'Instalação cassete', 'Loja Bem Vestir', 4100, 18, 'aberto', 'Instalação', { tel: '31991230007' }),
    L('r', 'Manutenção preventiva', 'Farmácia Central', 890, -12, 'pago', 'Manutenção'),
    L('r', 'Instalação split (2 un.)', 'Ana Ribeiro', 2150, -9, 'pago', 'Instalação'),
    L('p', 'Folha de pagamento (5 técnicos)', 'Equipe', 14200, 6, 'aberto', 'Pessoal'),
    L('p', 'Aluguel do galpão', 'Imobiliária Lar', 4300, 9, 'aberto', 'Estrutura'),
    L('p', 'Compra de evaporadoras', 'Frigelar Distribuidora', 19800, 4, 'aberto', 'Material'),
    L('p', 'Simples Nacional (DAS)', 'Receita Federal', 3180, 19, 'aberto', 'Impostos'),
    L('p', 'Combustível e pedágio', 'Posto Rota', 1640, 2, 'aberto', 'Veículos'),
    L('p', 'Gás refrigerante R410A', 'Dufrio', 2380, 14, 'aberto', 'Material'),
    L('p', 'Parcela da van', 'Banco Mercantil', 2190, 21, 'aberto', 'Veículos'),
    L('p', 'Contador', 'Contabilidade Exata', 980, 10, 'aberto', 'Estrutura'),
    L('p', 'Energia e internet', 'Cemig / Vivo', 760, -4, 'pago', 'Estrutura'),
    L('p', 'Ferramentas', 'Leroy Merlin', 1320, -8, 'pago', 'Material'),
  ];
  const extrato = [[-1, 'PIX RECEBIDO SAVASSI HOTEL LTDA', 2000], [-2, 'PIX RECEB ANDRADE LIMA ADV', 1450], [-4, 'PAG CEMIG DISTRIBUICAO', -486], [-4, 'PAG VIVO S/A', -274], [-3, 'TARIFA PACOTE SERVICOS', -79.9], [-1, 'PIX RECEB MARCELO SOUZA', 350]].map(([dia, desc, valor]) => ({ id: uid(), dia, desc, valor, ok: null }));
  const contratos = [['Escritório Andrade & Lima', 'PMOC · 14 aparelhos', 1450, 5], ['Colégio Horizonte', 'PMOC · 32 aparelhos', 2300, 10], ['Hotel Savassi', 'Preventiva trimestral VRF', 3900, 15], ['Clínica Sorriso Pleno', 'PMOC · 9 aparelhos', 980, 20]].map(([cli, plano, valor, dia]) => ({ id: uid(), cli, plano, valor, dia, gerado: false }));
  const orcs = [['Supermercado Bom Preço', 'Câmara fria · manutenção', 5600, 'enviado', -2], ['Igreja Batista Centro', '6 splits 24.000 BTUs instalados', 21400, 'enviado', -5], ['Dra. Paula Mendes', 'Split 9.000 BTUs', 2350, 'aprovado', -1]].map(([cli, desc, valor, st, dia]) => ({ id: uid(), cli, desc, valor, st, dia }));
  return { empresa: 'Climatiza BH Refrigeração', saldo: 18430, lancs, extrato, contratos, orcs, regua: [-3, 0, 3, 10], imposto: 6, equipe: [['Rafael (dono)', 'tudo'], ['Cíntia (financeiro)', 'receber, pagar, conciliar'], ['Juninho (técnico)', 'orçamentos e OS']], plano: 'basico', conversa: [] };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || base(); } catch { return base(); } })();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
const salva = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { nota('Sem espaço no navegador.'); } };
const lanc = (id) => db.lancs.find((l) => l.id === id);
const abertos = (tipo) => db.lancs.filter((l) => l.tipo === tipo && l.status === 'aberto');
let diaSel = 0;

function nota(t) { const a = document.createElement('div'); a.className = 'nota'; a.textContent = t; $('#notas').append(a); setTimeout(() => a.remove(), 3300); }
function caixa(html, liga) {
  const v = document.createElement('div'); v.className = 'veu-f'; v.innerHTML = `<div class="cx-f" role="dialog" aria-modal="true">${html}</div>`;
  const ant = document.activeElement; document.body.append(v);
  const fecha = () => { v.remove(); ant?.focus?.(); };
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-sai]')) fecha(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); });
  setTimeout(() => (v.querySelector('input, select') || v.querySelector('button'))?.focus(), 30);
  liga?.(v.querySelector('.cx-f'), fecha);
}
function formulario(titulo, campos, ok, fn) { caixa(`<h2>${titulo}</h2><form>${campos}<div class="rod"><button type="button" class="bt" data-sai>Cancelar</button><button class="bt p">${ok}</button></div></form>`, (c, fecha) => c.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); if (fn(new FormData(e.target)) !== false) { salva(); fecha(); tela(); } })); }

// projeção: saldo do banco hoje + o que vence em cada um dos próximos 30 dias (atrasados entram hoje)
function projecao() {
  let s = db.saldo;
  return Array.from({ length: 30 }, (_, d) => {
    const ent = db.lancs.filter((l) => l.status === 'aberto' && l.tipo === 'r' && (d === 0 ? l.venc <= 0 : l.venc === d)).reduce((a, l) => a + l.valor, 0);
    const sai = db.lancs.filter((l) => l.status === 'aberto' && l.tipo === 'p' && (d === 0 ? l.venc <= 0 : l.venc === d)).reduce((a, l) => a + l.valor, 0);
    s += ent - sai; return { d, ent, sai, saldo: s };
  });
}

const ICONES = { fluxo: '<path d="M3 17l5-5 4 3 8-8"/><path d="M15 7h5v5"/>', receber: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>', pagar: '<path d="M12 20V8M7 13l5-5 5 5"/><path d="M4 4h16"/>', conciliar: '<rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/><path d="M10 9h4M10 15h4"/>', contratos: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7M14 3v4h4"/>', orcamentos: '<path d="M4 6h16v12H4z"/><path d="M8 10h8M8 14h5"/>', resultado: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', equipe: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.8-3.6 3.2-5.5 6-5.5s5.2 1.9 6 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.6c2.6.2 4.2 2 4.8 4.9"/>', ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>' };
const SECOES = [['fluxo', 'Fluxo do mês'], ['receber', 'A receber'], ['pagar', 'A pagar'], ['conciliar', 'Conciliar'], ['contratos', 'Contratos'], ['orcamentos', 'Orçamentos'], ['resultado', 'Resultado'], ['equipe', 'Equipe'], ['ajustes', 'Ajustes']];

const V = {
  fluxo() {
    const p = projecao(), min = p.reduce((a, x) => (x.saldo < a.saldo ? x : a), p[0]), maxS = Math.max(...p.map((x) => Math.abs(x.saldo)), 1), maxB = Math.max(...p.map((x) => Math.max(x.ent, x.sai)), 1);
    const W = 900, cw = W / 30, yS = (v) => 70 - v / maxS * 58, bar = (v) => v / maxB * 52;
    const linha = p.map((x, i) => `${i ? 'L' : 'M'}${(i + 0.5) * cw},${yS(x.saldo)}`).join(' ');
    const sel = p[diaSel] || p[0], doDia = db.lancs.filter((l) => l.status === 'aberto' && (diaSel === 0 ? l.venc <= 0 : l.venc === diaSel));
    const aRec = abertos('r'), aPag = abertos('p'), atras = aRec.filter((l) => l.venc < 0), fim = p[p.length - 1];
    return `<div class="titulo"><div><h1>Fluxo do mês</h1><p>O saldo de hoje mais tudo que vence nos próximos 30 dias. Clique num dia do gráfico para ver o que entra e sai.</p></div><div class="grupo"><button class="bt" data-a="novo" data-t="r">+ A receber</button><button class="bt p" data-a="novo" data-t="p">+ A pagar</button></div></div>
      ${min.saldo < 0 ? `<div class="alerta-neg"><span aria-hidden="true">!</span><div><b>O caixa fica negativo em ${data(min.d)}: ${R$(min.saldo)}.</b><small>Cobre os atrasados (${R$(atras.reduce((a, l) => a + l.valor, 0))}) ou adie a compra de material. Pergunte ao assistente.</small></div></div>` : ''}
      <div class="numeros">
        <div class="num destaque"><small>Saldo no fim de hoje</small><b class="m">${R0(p[0].saldo)}</b><span>banco + o que vence hoje e os atrasados</span></div>
        <div class="num"><small>Daqui a 30 dias</small><b class="m ${fim.saldo < 0 ? 'v-sai' : ''}">${R0(fim.saldo)}</b><span>menor saldo ${R0(min.saldo)} em ${data(min.d)}</span></div>
        <div class="num"><small>A receber em 30 dias</small><b class="m v-entra">${R0(aRec.reduce((a, l) => a + l.valor, 0))}</b><span>${aRec.length} cobranças · ${atras.length} atrasada(s)</span></div>
        <div class="num"><small>A pagar em 30 dias</small><b class="m v-sai">${R0(aPag.reduce((a, l) => a + l.valor, 0))}</b><span>${aPag.length} contas</span></div>
      </div>
      <div class="fluxo-corpo"><section class="pl grafico"><h2>Saldo dia a dia <small>· próximos 30 dias</small></h2><div class="regua-mes"><svg viewBox="0 0 ${W} 210" role="img" aria-label="Saldo projetado e movimentos dos próximos 30 dias">
        <line x1="0" x2="${W}" y1="${yS(0)}" y2="${yS(0)}" stroke="#a5533f" stroke-dasharray="4 4" stroke-width="1"/>
        ${p.map((x, i) => `<g class="dia-col" data-dia="${i}"><rect class="fundo" x="${i * cw + 1}" y="0" width="${cw - 2}" height="210" rx="4" fill="${i === diaSel ? '#ece5d4' : 'transparent'}"/>
          ${x.ent ? `<rect x="${i * cw + cw * 0.22}" y="${150 - bar(x.ent)}" width="${cw * 0.56}" height="${bar(x.ent)}" rx="2" fill="#3f7a5f"/>` : ''}${x.sai ? `<rect x="${i * cw + cw * 0.22}" y="150" width="${cw * 0.56}" height="${bar(x.sai)}" rx="2" fill="#c08a73"/>` : ''}
          <text x="${(i + 0.5) * cw}" y="${i % 2 ? 206 : 196}" text-anchor="middle">${data(i, true)}</text></g>`).join('')}
        <line x1="0" x2="${W}" y1="150" y2="150" stroke="#d8d0c1"/>
        <path d="${linha}" fill="none" stroke="#203b32" stroke-width="2.5" stroke-linejoin="round"/>
        ${p.filter((x) => x.saldo < 0).map((x) => `<circle cx="${(x.d + 0.5) * cw}" cy="${yS(x.saldo)}" r="3.5" fill="#a5533f"/>`).join('')}
      </svg></div><div class="legenda"><span style="--c:#203b32">saldo projetado</span><span style="--c:#3f7a5f">entra</span><span style="--c:#c08a73">sai</span><span style="--c:#a5533f">linha do zero</span></div></section>
      <section class="pl dia-escolhido"><h2>${diaSel === 0 ? 'Hoje' : data(diaSel)} <small>· ${semana(diaSel)}${diaSel === 0 ? ' · com atrasados' : ''}</small></h2><p class="fim-dia">Saldo no fim do dia <b class="m ${sel.saldo < 0 ? 'v-sai' : ''}">${R$(sel.saldo)}</b></p>
        <ul class="movs">${doDia.map((l) => `<li><span class="sinal ${l.tipo === 'r' ? 'e' : 's'}" aria-hidden="true">${l.tipo === 'r' ? '↓' : '↑'}</span><div><b>${h(l.desc)}</b><small>${h(l.quem)}${l.venc < 0 ? ` · atrasado ${-l.venc} dia(s)` : ''}</small></div><div class="lado"><span class="m ${l.tipo === 'r' ? 'v-entra' : 'v-sai'}">${l.tipo === 'r' ? '+' : '−'}${R$(l.valor)}</span><button class="bt x" data-a="baixa" data-id="${l.id}">${l.tipo === 'r' ? 'Recebi' : 'Paguei'}</button></div></li>`).join('') || '<li class="vazio">Nada vence neste dia. Escolha outro dia no gráfico.</li>'}</ul></section></div>`;
  },
  receber() {
    const l = [...db.lancs.filter((x) => x.tipo === 'r')].sort((a, b) => (a.status === 'pago') - (b.status === 'pago') || a.venc - b.venc);
    return `<div class="titulo"><div><h1>A receber</h1><p>Cada cobrança sai com link de PIX. A régua manda lembrete pelo WhatsApp ${db.regua.map((d) => (d < 0 ? `${-d} dia(s) antes` : d === 0 ? 'no dia' : `${d} dias depois`)).join(', ')}.</p></div><button class="bt p" data-a="novo" data-t="r">+ A receber</button></div>
      <section class="pl tab-wrap"><table><thead><tr><th>Vence</th><th>Cliente</th><th>O quê</th><th class="dir">Valor</th><th>Régua de cobrança</th><th></th></tr></thead><tbody>${l.map((x) => `<tr><td>${x.status === 'pago' ? '<span class="tag ok">recebido</span>' : x.venc < 0 ? `<span class="tag ru">${-x.venc} dia(s) atrasado</span>` : `<span class="tag ${x.venc === 0 ? 'at' : ''}">${data(x.venc)}</span>`}</td><td><b>${h(x.quem)}</b></td><td>${h(x.desc)}<br><small class="vazio">${h(x.cat)}</small></td><td class="dir">${R$(x.valor)}</td>
        <td>${x.status === 'pago' ? '' : `<div class="passos">${db.regua.map((d) => { const dd = x.venc + d; return `<span class="${x.avisos.includes(dd) ? 'ok' : dd === 0 ? 'prox' : ''}" title="${d < 0 ? `${-d}d antes` : d === 0 ? 'no dia' : `${d}d depois`}">${data(dd, true)}</span>`; }).join('')}</div>`}</td>
        <td>${x.status === 'pago' ? '' : `<div class="grupo"><button class="bt x" data-a="cobrar" data-id="${x.id}">Cobrar</button><button class="bt x" data-a="baixa" data-id="${x.id}">Recebi</button></div>`}</td></tr>`).join('')}</tbody></table></section>`;
  },
  pagar() {
    const l = [...db.lancs.filter((x) => x.tipo === 'p')].sort((a, b) => (a.status === 'pago') - (b.status === 'pago') || a.venc - b.venc);
    return `<div class="titulo"><div><h1>A pagar</h1><p>${abertos('p').length} contas abertas · ${R$(abertos('p').filter((x) => x.venc <= 7).reduce((a, x) => a + x.valor, 0))} nos próximos 7 dias.</p></div><div class="grupo"><button class="bt" data-a="ler-boleto">Ler código de boleto</button><button class="bt p" data-a="novo" data-t="p">+ A pagar</button></div></div>
      <section class="pl tab-wrap"><table><thead><tr><th>Vence</th><th>Fornecedor</th><th>O quê</th><th>Categoria</th><th class="dir">Valor</th><th></th></tr></thead><tbody>${l.map((x) => `<tr><td>${x.status === 'pago' ? '<span class="tag ok">pago</span>' : `<span class="tag ${x.venc <= 2 ? 'at' : ''}">${data(x.venc)}</span>`}</td><td>${h(x.quem)}</td><td>${h(x.desc)}</td><td><span class="tag ch">${h(x.cat)}</span></td><td class="dir">${R$(x.valor)}</td><td>${x.status === 'pago' ? '' : `<div class="grupo"><button class="bt x" data-a="adiar" data-id="${x.id}">Adiar 7 dias</button><button class="bt x" data-a="baixa" data-id="${x.id}">Paguei</button></div>`}</td></tr>`).join('')}</tbody></table></section>`;
  },
  conciliar() {
    const pend = db.extrato.filter((e) => !e.ok), feitos = db.extrato.filter((e) => e.ok);
    const sugere = (e) => db.lancs.find((l) => l.status === 'aberto' && (e.valor > 0 ? l.tipo === 'r' : l.tipo === 'p') && Math.abs(l.valor - Math.abs(e.valor)) < 0.01);
    return `<div class="titulo"><div><h1>Conciliar com o banco</h1><p>O extrato do banco à esquerda, os lançamentos do sistema à direita. Quando o valor bate, o sistema já sugere o par.</p></div><button class="bt" data-a="importar">Importar extrato (OFX)</button></div>
      <section class="pl"><h2>${pend.length} movimento(s) do banco para conferir</h2>${pend.map((e) => { const s = sugere(e); return `<div class="par"><div class="lado"><b class="m ${e.valor > 0 ? 'v-entra' : 'v-sai'}">${e.valor > 0 ? '+' : '−'}${R$(Math.abs(e.valor))}</b><br>${h(e.desc)}<br><small class="vazio">${data(e.dia)}</small></div><div class="meio">${s ? `<button class="bt x c" data-a="parear" data-e="${e.id}" data-l="${s.id}">Bate</button>` : '<span class="vazio">?</span>'}</div>${s ? `<div class="lado"><b class="m">${R$(s.valor)}</b><br>${h(s.desc)}<br><small class="vazio">${h(s.quem)} · vence ${data(s.venc)}</small></div>` : `<div class="lado falta">Nada no sistema com esse valor.<br><button class="bt x" data-a="criar-do-extrato" data-e="${e.id}">Criar lançamento</button></div>`}</div>`; }).join('') || '<p class="vazio">Tudo conciliado. O saldo do sistema é o mesmo do banco.</p>'}</section>
      ${feitos.length ? `<section class="pl" style="margin-top:14px"><h2>Conciliados</h2><table><tbody>${feitos.map((e) => `<tr><td>${h(e.desc)}</td><td class="dir">${R$(e.valor)}</td><td><span class="tag ok">ok</span></td></tr>`).join('')}</tbody></table></section>` : ''}`;
  },
  contratos() {
    return `<div class="titulo"><div><h1>Contratos</h1><p>Cobranças que se repetem todo mês: PMOC, preventivas, mensalidades. Gere todas de uma vez.</p></div><div class="grupo"><button class="bt" data-a="novo-contrato">+ Contrato</button><button class="bt p" data-a="gerar" ${db.contratos.some((c) => !c.gerado) ? '' : 'disabled'}>Gerar cobranças de novembro</button></div></div>
      <section class="pl tab-wrap"><table><thead><tr><th>Cliente</th><th>Plano</th><th>Dia</th><th class="dir">Valor</th><th></th></tr></thead><tbody>${db.contratos.map((c) => `<tr><td><b>${h(c.cli)}</b></td><td>${h(c.plano)}</td><td>todo dia ${c.dia}</td><td class="dir">${R$(c.valor)}</td><td>${c.gerado ? '<span class="tag ok">gerada</span>' : '<span class="tag">a gerar</span>'}</td></tr>`).join('')}<tr><td colspan="3"><b>Receita recorrente</b></td><td class="dir"><b>${R$(db.contratos.reduce((a, c) => a + c.valor, 0))}</b></td><td></td></tr></tbody></table></section>`;
  },
  orcamentos() {
    return `<div class="titulo"><div><h1>Orçamentos</h1><p>O cliente aprova pelo celular, pelo link. Aprovado vira cobrança com entrada e saldo.</p></div><button class="bt p" data-a="novo-orc">+ Orçamento</button></div>
      <section class="pl tab-wrap"><table><thead><tr><th>Cliente</th><th>Serviço</th><th class="dir">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${db.orcs.map((o) => `<tr><td><b>${h(o.cli)}</b><br><small class="vazio">enviado ${data(o.dia)}</small></td><td>${h(o.desc)}</td><td class="dir">${R$(o.valor)}</td><td>${o.st === 'aprovado' ? '<span class="tag ok">aprovado</span>' : o.st === 'cobrado' ? '<span class="tag ch">virou cobrança</span>' : '<span class="tag at">esperando o cliente</span>'}</td><td>${o.st === 'enviado' ? `<button class="bt x" data-a="aprovar-orc" data-id="${o.id}">Ver como o cliente</button>` : o.st === 'aprovado' ? `<button class="bt x c" data-a="cobrar-orc" data-id="${o.id}">Gerar cobrança</button>` : ''}</td></tr>`).join('')}</tbody></table></section>`;
  },
  resultado() {
    const pagos = db.lancs.filter((l) => l.status === 'pago' || l.venc <= 30), rec = pagos.filter((l) => l.tipo === 'r'), des = pagos.filter((l) => l.tipo === 'p');
    const porCat = (l) => { const o = {}; l.forEach((x) => { o[x.cat] = (o[x.cat] || 0) + x.valor; }); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
    const tr = rec.reduce((a, l) => a + l.valor, 0), td = des.filter((l) => l.cat !== 'Impostos').reduce((a, l) => a + l.valor, 0), imp = tr * db.imposto / 100, lucro = tr - td - imp, mx = Math.max(...porCat(rec).map((x) => x[1]), ...porCat(des).map((x) => x[1]), 1);
    return `<div class="titulo"><div><h1>Resultado</h1><p>Mês corrente pelo regime de competência: o que foi vendido e gasto, recebido ou não.</p></div><button class="bt" data-a="contador">Pacote do contador</button></div>
      <div class="grade"><div class="pl s3 kpi"><small>Receita</small><b class="v-entra">${R0(tr)}</b></div><div class="pl s3 kpi"><small>Despesas</small><b class="v-sai">${R0(td)}</b></div><div class="pl s3 kpi"><small>Imposto estimado (${db.imposto}%)</small><b>${R0(imp)}</b><span>Simples Nacional, anexo III</span></div><div class="pl s3 kpi"><small>Lucro</small><b class="${lucro < 0 ? 'v-sai' : ''}">${R0(lucro)}</b><span>${Math.round(lucro / (tr || 1) * 100)}% da receita</span></div>
      <section class="pl s6"><h2>De onde vem o dinheiro</h2><div class="barras-h">${porCat(rec).map(([c, v]) => `<div class="l"><span>${h(c)}</span><span class="t"><i style="width:${v / mx * 100}%;--c:#3f7a5f"></i></span><b class="dir">${R0(v)}</b></div>`).join('')}</div></section>
      <section class="pl s6"><h2>Para onde vai</h2><div class="barras-h">${porCat(des).map(([c, v]) => `<div class="l"><span>${h(c)}</span><span class="t"><i style="width:${v / mx * 100}%;--c:#c08a73"></i></span><b class="dir">${R0(v)}</b></div>`).join('')}</div></section></div>`;
  },
  equipe() {
    const pr = db.plano === 'pro' ? 169 : 109;
    return `<div class="titulo"><div><h1>Equipe</h1><p>Painel do dono: quem entra e o que cada um vê.</p></div><button class="bt p" data-a="convidar">+ Convidar</button></div>
      <div class="grade"><section class="pl s7"><table><thead><tr><th>Pessoa</th><th>Pode mexer em</th></tr></thead><tbody>${db.equipe.map(([n, v]) => `<tr><td><b>${h(n)}</b></td><td>${h(v)}</td></tr>`).join('')}</tbody></table><p class="vazio">Técnico não vê saldo nem resultado. Só o dono apaga lançamento pago.</p></section>
      <section class="pl s5"><h2>Plano</h2><p>Assinatura · <b>${R$(pr)}/mês</b></p><div class="grupo"><button class="bt ${db.plano === 'basico' ? 'p' : ''}" data-a="plano" data-v="basico">Assinatura · R$ 109/mês</button></div><p class="vazio">Equipe sem limite, histórico de quem fez o quê e até 10 empresas. Anual com 20% a menos. Sem fidelidade.</p></section></div>`;
  },
  ajustes() {
    return `<div class="titulo"><div><h1>Ajustes</h1></div></div><div class="grade"><section class="pl s6"><h2>Empresa</h2><label class="cmp">Nome<input data-aj="empresa" value="${h(db.empresa)}"></label><label class="cmp">Saldo do banco hoje (R$)<input data-aj="saldo" inputmode="decimal" value="${db.saldo}"></label><label class="cmp">Alíquota do Simples (%)<input data-aj="imposto" type="number" step="0.1" value="${db.imposto}"></label></section>
      <section class="pl s6"><h2>Régua de cobrança</h2><p class="vazio">Dias em relação ao vencimento (negativo = antes).</p><label class="cmp">Lembretes<input data-aj="regua" value="${db.regua.join(', ')}"></label><p class="vazio">Na versão contratada: boleto e PIX com baixa automática, NFS-e e importação do extrato pelo banco (algumas integrações têm custo à parte).</p></section></div>`;
  },
};

function tela() {
  const r = location.hash.slice(1) || 'fluxo', atrasados = abertos('r').filter((l) => l.venc < 0).length, pend = db.extrato.filter((e) => !e.ok).length;
  const n = { receber: atrasados, conciliar: pend, orcamentos: db.orcs.filter((o) => o.st === 'aprovado').length };
  $('#trilho').innerHTML = `<div class="marca"><img class="v-logo" src="../../../img/logos/veltria-financeiro-simbolo.png?v=2" alt="Veltria Financeiro" width="256" height="180" style="height:auto;width:62px;margin:0 auto"></div>${SECOES.map(([k, t]) => `<a href="#${k}" ${k === r ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[k]}</svg>${t}${n[k] ? `<span class="n">${n[k]}</span>` : ''}</a>`).join('')}`;
  const p = projecao(), fim = p[29].saldo;
  $('#saldos').innerHTML = `<div><small>No banco hoje</small><b>${R0(db.saldo)}</b></div><div class="${fim < 0 ? 'neg' : ''}"><small>Em 30 dias</small><b>${R0(fim)}</b></div>`;
  $('#empresa').textContent = db.empresa; $('#hoje').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  $('#conteudo').innerHTML = (V[r] || V.fluxo)();
  document.title = `${(SECOES.find(([k]) => k === r) || SECOES[0])[1]} · Veltria Financeiro Completo`;
}
addEventListener('hashchange', () => { tela(); $('#conteudo').focus({ preventScroll: true }); scrollTo(0, 0); });

function gaveta() {
  const g = $('#gaveta'); g.hidden = false;
  const msgs = db.conversa.length ? db.conversa : [{ ia: 1, t: 'Leio o fluxo, as contas, os contratos e o extrato. Na versão contratada, 20 perguntas grátis por dia; aqui as respostas são de exemplo.' }];
  g.innerHTML = `<header><b>Assistente financeiro</b><button type="button" data-fecha-g aria-label="Fechar">×</button></header><div class="msgs">${msgs.map((m) => `<div class="msg ${m.ia ? 'ia' : 'eu'}">${h(m.t)}</div>`).join('')}<div class="sug">${['O caixa vai aguentar o mês?', 'Quem está me devendo?', 'Qual despesa mais pesa?', 'Escreva a cobrança do Hotel Savassi'].map((s) => `<button type="button" data-sug="${h(s)}">${h(s)}</button>`).join('')}</div></div><form id="f-g"><input id="q-g" placeholder="Pergunte" aria-label="Pergunta"><button class="bt p">Enviar</button></form>`;
  g.querySelector('.msgs').scrollTop = 1e6; $('#q-g').focus();
}
function responde(p) {
  const x = sa(p), pr = projecao(), min = pr.reduce((a, y) => (y.saldo < a.saldo ? y : a), pr[0]);
  if (/caixa|aguent|negativ|fluxo/.test(x)) return min.saldo < 0 ? `Não sem ajuste: o saldo fica em ${R$(min.saldo)} em ${data(min.d)}.\nO que resolve:\n• cobrar os atrasados: ${R$(abertos('r').filter((l) => l.venc < 0).reduce((a, l) => a + l.valor, 0))}\n• pedir 15 dias à Frigelar na compra de evaporadoras (${R$(19800)})\nCom as duas coisas o menor saldo vira positivo.` : `Aguenta. O menor saldo do mês é ${R$(min.saldo)}, em ${data(min.d)}.`;
  if (/deve|devend|atras|receber/.test(x)) return abertos('r').filter((l) => l.venc <= 0).map((l) => `• ${l.quem}: ${R$(l.valor)} ${l.venc < 0 ? `(${-l.venc} dia(s) atrasado)` : '(vence hoje)'}`).join('\n') || 'Ninguém atrasado.';
  if (/despesa|pesa|gasto/.test(x)) return 'Pessoal (folha dos técnicos) é a maior despesa, seguida de material. Material subiu 18% em relação à média: vale cotar o gás R410A em mais um fornecedor.';
  if (/savassi|escrev|cobranc|mensag/.test(x)) return 'Mensagem pronta:\n\n"Olá! Aqui é da Climatiza BH. A manutenção corretiva do VRF (R$ 6.200,00) vence hoje. Segue o PIX pelo link: https://bluerose-store.com/pix/demo. Qualquer dúvida, estou à disposição."';
  return `No banco hoje: ${R$(db.saldo)}. Em 30 dias: ${R$(pr[29].saldo)}.`;
}

const A = {
  novo: (d) => formulario(d.t === 'r' ? 'Nova conta a receber' : 'Nova conta a pagar', `<label class="cmp">${d.t === 'r' ? 'Cliente' : 'Fornecedor'}<input name="q" required></label><label class="cmp">O quê<input name="d" required></label><div class="dois"><label class="cmp">Valor (R$)<input name="v" inputmode="decimal" required></label><label class="cmp">Vence em (dias)<input name="o" type="number" value="7"></label></div><label class="cmp">Categoria<select name="c">${(d.t === 'r' ? ['Instalação', 'Manutenção', 'Contratos', 'Projetos'] : ['Material', 'Pessoal', 'Estrutura', 'Veículos', 'Impostos']).map((c) => `<option>${c}</option>`).join('')}</select></label><label class="cmp">Repetir<select name="rep"><option value="1">só uma vez</option><option value="3">3 meses</option><option value="12">12 meses</option></select></label>`, 'Lançar', (f) => { const rep = Number(f.get('rep')); for (let i = 0; i < rep; i++) db.lancs.push({ id: uid(), tipo: d.t, quem: f.get('q'), desc: f.get('d') + (rep > 1 ? ` (${i + 1}/${rep})` : ''), valor: nv(f.get('v')), venc: Number(f.get('o')) + i * 30, status: 'aberto', cat: f.get('c'), avisos: [], tel: '' }); nota(rep > 1 ? `${rep} lançamentos criados.` : 'Lançado.'); }),
  baixa: (d) => { const l = lanc(d.id); l.status = 'pago'; db.saldo += l.tipo === 'r' ? l.valor : -l.valor; salva(); tela(); nota(`${l.tipo === 'r' ? 'Recebido' : 'Pago'}: ${R$(l.valor)}. Saldo atualizado.`); },
  adiar: (d) => { lanc(d.id).venc += 7; salva(); tela(); nota('Vencimento adiado 7 dias. Avise o fornecedor.'); },
  cobrar: (d) => { const l = lanc(d.id); l.avisos.push(0); salva(); window.open(`https://wa.me/55${l.tel || ''}?text=${encodeURIComponent(`Olá! Aqui é da ${db.empresa}. ${l.venc < 0 ? 'Passando para lembrar do' : 'Segue o'} pagamento de ${R$(l.valor)} (${l.desc}). PIX pelo link: https://bluerose-store.com/pix/demo`)}`, '_blank', 'noopener'); tela(); },
  'ler-boleto': () => formulario('Ler código de boleto', '<label class="cmp">Linha digitável<input name="c" placeholder="23793.38128 60000.000003 ..." required></label><p class="vazio">Na versão contratada o celular lê o código de barras pela câmera e preenche valor, vencimento e fornecedor.</p>', 'Ler', (f) => { db.lancs.push({ id: uid(), tipo: 'p', quem: 'Boleto lido', desc: `Boleto ${String(f.get('c')).slice(0, 11)}…`, valor: 1234.5, venc: 8, status: 'aberto', cat: 'Material', avisos: [] }); nota('Boleto lido: R$ 1.234,50 vence em 8 dias (exemplo).'); }),
  importar: () => { db.extrato.push({ id: uid(), dia: 0, desc: 'PIX RECEB ACADEMIA FORMA', valor: 1280, ok: null }, { id: uid(), dia: 0, desc: 'PAG POSTO ROTA COMBUSTIVEIS', valor: -1640, ok: null }); salva(); tela(); nota('Extrato importado: 2 movimentos novos.'); },
  parear: (d) => { const e = db.extrato.find((x) => x.id === d.e), l = lanc(d.l); e.ok = l.id; l.status = 'pago'; salva(); tela(); nota('Conciliado.'); },
  'criar-do-extrato': (d) => { const e = db.extrato.find((x) => x.id === d.e); const l = { id: uid(), tipo: e.valor > 0 ? 'r' : 'p', quem: e.desc.split(' ').slice(-2).join(' '), desc: e.desc, valor: Math.abs(e.valor), venc: e.dia, status: 'pago', cat: e.valor > 0 ? 'Manutenção' : 'Estrutura', avisos: [] }; db.lancs.push(l); e.ok = l.id; salva(); tela(); nota('Lançamento criado a partir do extrato.'); },
  gerar: () => { db.contratos.filter((c) => !c.gerado).forEach((c) => { db.lancs.push({ id: uid(), tipo: 'r', quem: c.cli, desc: `${c.plano} · novembro`, valor: c.valor, venc: c.dia + 9, status: 'aberto', cat: 'Contratos', avisos: [], tel: '' }); c.gerado = true; }); salva(); tela(); nota('Cobranças de novembro geradas, com PIX e régua de lembretes.'); },
  'novo-contrato': () => formulario('Novo contrato', '<label class="cmp">Cliente<input name="c" required></label><label class="cmp">Plano<input name="p" value="PMOC" required></label><div class="dois"><label class="cmp">Valor mensal (R$)<input name="v" inputmode="decimal" required></label><label class="cmp">Dia da cobrança<input name="d" type="number" value="10"></label></div>', 'Criar', (f) => { db.contratos.push({ id: uid(), cli: f.get('c'), plano: f.get('p'), valor: nv(f.get('v')), dia: Number(f.get('d')), gerado: false }); }),
  'novo-orc': () => formulario('Novo orçamento', '<label class="cmp">Cliente<input name="c" required></label><label class="cmp">Serviço<input name="d" required></label><label class="cmp">Valor (R$)<input name="v" inputmode="decimal" required></label>', 'Enviar pelo WhatsApp', (f) => { db.orcs.unshift({ id: uid(), cli: f.get('c'), desc: f.get('d'), valor: nv(f.get('v')), st: 'enviado', dia: 0 }); nota('Orçamento enviado com link de aprovação.'); }),
  'aprovar-orc': (d) => { const o = db.orcs.find((x) => x.id === d.id); caixa(`<p class="vazio">Assim o cliente vê no celular, sem senha:</p><h2>${h(db.empresa)}</h2><p><b>${h(o.desc)}</b></p><p class="m" style="font-size:1.4rem">${R$(o.valor)}</p><p class="vazio">Entrada de 50% no PIX e o restante na entrega.</p><div class="rod"><button class="bt" data-sai>Fechar</button><button class="bt p" data-ok>Aprovar como o cliente</button></div>`, (c, fecha) => c.querySelector('[data-ok]').addEventListener('click', () => { o.st = 'aprovado'; salva(); fecha(); tela(); nota(`${o.cli} aprovou ${R$(o.valor)}.`); })); },
  'cobrar-orc': (d) => { const o = db.orcs.find((x) => x.id === d.id); o.st = 'cobrado'; [[0.5, 'entrada', 0], [0.5, 'saldo na entrega', 15]].forEach(([k, n, v]) => db.lancs.push({ id: uid(), tipo: 'r', quem: o.cli, desc: `${o.desc} · ${n}`, valor: o.valor * k, venc: v, status: 'aberto', cat: 'Instalação', avisos: [], tel: '' })); salva(); tela(); nota('Duas cobranças criadas: entrada hoje e saldo em 15 dias.'); },
  contador: () => caixa(`<h2>Pacote do contador</h2><p>Mês corrente: ${db.lancs.length} lançamentos, ${db.extrato.length} linhas de extrato, notas emitidas e comprovantes anexados.</p><p class="vazio">Na versão contratada sai uma planilha e um ZIP com os comprovantes, e vai por e-mail para o contador no dia 5.</p><div class="rod"><button class="bt p" data-sai>Certo</button></div>`),
  convidar: () => formulario('Convidar pessoa', '<label class="cmp">Nome<input name="n" required></label><label class="cmp">Pode mexer em<select name="v"><option>receber, pagar, conciliar</option><option>orçamentos e OS</option><option>só ver relatórios</option></select></label>', 'Convidar', (f) => { db.equipe.push([f.get('n'), f.get('v')]); nota('Convite enviado.'); }),
  plano: (d) => { db.plano = d.v; salva(); tela(); },
};

document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-ia]')) { gaveta(); return; }
  if (t.closest('[data-fecha-g]')) { $('#gaveta').hidden = true; return; }
  const s = t.closest('[data-sug]'); if (s) { $('#q-g').value = s.dataset.sug; $('#f-g').requestSubmit(); return; }
  const dd = t.closest('[data-dia]'); if (dd) { diaSel = Number(dd.dataset.dia); tela(); return; }
  const a = t.closest('[data-a]'); if (a && A[a.dataset.a]) A[a.dataset.a](a.dataset);
});
document.addEventListener('submit', (e) => { if (e.target.id !== 'f-g') return; e.preventDefault(); const p = $('#q-g').value.trim(); if (p.length < 3) return; const resp = { ia: 1, t: window.veltriaIA ? 'Pensando…' : `${responde(p)}\n\n(Exemplo da demonstração.)` }; db.conversa.push({ t: p }, resp); db.conversa = db.conversa.slice(-10); salva(); gaveta(); if (window.veltriaIA) window.veltriaIA(p).then((t) => { resp.t = t; salva(); gaveta(); }); });
document.addEventListener('change', (e) => {
  const k = e.target.dataset.aj; if (!k) return;
  if (k === 'regua') db.regua = e.target.value.split(',').map((x) => Number(x.trim())).filter((x) => !Number.isNaN(x)).sort((a, b) => a - b);
  else db[k] = k === 'empresa' ? e.target.value : nv(e.target.value);
  salva(); tela(); nota('Ajuste salvo.');
});
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = base(); diaSel = 0; location.hash = '#fluxo'; tela(); nota('Demonstração recomeçada.'); });
tela();
