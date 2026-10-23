// Veltria Obras Completo · protótipo "prancheta do engenheiro" para empreiteira com equipe.
// Trena lateral como menu; orçamento por composição com BDI, cronograma em barras com régua de semanas,
// medição da etapa executada que vira cobrança e boletim, compras por obra, presença e diárias da equipe,
// caixa das próximas 8 semanas, orçado x realizado, diário de obra, painel do dono, configurações e IA.
// Dados de exemplo neste navegador (?novo recomeça).

const CHAVE = 'veltria-obras-completo-v1';
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const mil = (v) => (Math.abs(v) >= 10000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : brl(v));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const tira = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const num = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const uid = () => `x${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const dia = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); };
const pct = (v) => `${Math.round(v * 100)}%`;
const q = (s, r = document) => r.querySelector(s);

// ------------------------------------------------------------------ dados de exemplo
function base() {
  const clientes = [
    { id: 'k1', nome: 'Condomínio Jardim das Acácias', doc: '12.334.556/0001-20', tel: '31930001122', contato: 'Síndico Jorge' },
    { id: 'k2', nome: 'Dra. Camila Rocha (clínica)', doc: '088.442.116-30', tel: '31988776655', contato: 'Camila' },
    { id: 'k3', nome: 'Família Tavares', doc: '102.338.917-04', tel: '31991234567', contato: 'Heitor Tavares' },
    { id: 'k4', nome: 'Loja Bem-Te-Vi Calçados', doc: '41.229.008/0001-77', tel: '31934445566', contato: 'Marina' },
  ];
  const et = (l) => l.map(([nome, ini, fim, valor, custo, exec, medido]) => ({ id: uid(), nome, ini, fim, valor, custo, exec, medido }));
  const obras = [
    { id: 'b1', nome: 'Reforma da fachada e hall', cli: 'k1', end: 'Rua das Acácias, 450 · Castelo', status: 'andamento',
      etapas: et([['Andaime e proteção', -24, -18, 6800, 4300, 100, 100], ['Recuperação estrutural das trincas', -18, -4, 18400, 11900, 100, 60], ['Textura e pintura da fachada', -6, 16, 26300, 15800, 35, 0], ['Piso do hall em porcelanato', 8, 24, 21900, 14600, 0, 0], ['Iluminação e acabamento', 22, 32, 9600, 6100, 0, 0]]) },
    { id: 'b2', nome: 'Clínica odontológica (adequação)', cli: 'k2', end: 'Av. do Contorno, 7300, sala 504', status: 'andamento',
      etapas: et([['Demolição de divisórias', -12, -8, 4200, 2600, 100, 100], ['Drywall e forro', -8, 6, 15800, 10100, 70, 50], ['Elétrica e lógica', -2, 12, 13900, 9200, 30, 0], ['Hidráulica dos consultórios', 4, 14, 9800, 6500, 0, 0], ['Pintura e piso vinílico', 14, 26, 12600, 8300, 0, 0]]) },
    { id: 'b3', nome: 'Casa Tavares: ampliação', cli: 'k3', end: 'Rua Itajubá, 77 · Sagrada Família', status: 'andamento',
      etapas: et([['Fundação', -34, -20, 22500, 15200, 100, 100], ['Alvenaria', -20, -2, 19800, 13300, 100, 100], ['Laje', -4, 6, 16400, 11500, 40, 0], ['Telhado', 8, 20, 18200, 12600, 0, 0], ['Reboco e contrapiso', 20, 36, 14700, 9600, 0, 0]]) },
  ];
  const orcamentos = [
    { id: 'q1', num: 112, cli: 'k4', titulo: 'Reforma da loja (vitrine e piso)', status: 'enviado', criado: -3, bdi: 22, servicos: [{ desc: 'Piso vinílico em régua', un: 'm²', qtd: 86, mat: 89, mo: 28 }, { desc: 'Forro de gesso com sanca', un: 'm²', qtd: 86, mat: 34, mo: 31 }, { desc: 'Vitrine em vidro temperado', un: 'vb', qtd: 1, mat: 7800, mo: 1200 }] },
    { id: 'q2', num: 111, cli: 'k3', titulo: 'Área gourmet com churrasqueira', status: 'negociando', criado: -9, bdi: 20, servicos: [{ desc: 'Churrasqueira pré-moldada', un: 'un', qtd: 1, mat: 2900, mo: 900 }, { desc: 'Bancada em granito', un: 'm', qtd: 4.2, mat: 680, mo: 160 }, { desc: 'Revestimento cerâmico', un: 'm²', qtd: 22, mat: 64, mo: 38 }] },
    { id: 'q3', num: 110, cli: 'k1', titulo: 'Impermeabilização da cobertura', status: 'rascunho', criado: -1, bdi: 22, servicos: [{ desc: 'Manta asfáltica 4 mm', un: 'm²', qtd: 320, mat: 48, mo: 22 }] },
    { id: 'q4', num: 108, cli: 'k2', titulo: 'Adequação da clínica', status: 'aprovado', criado: -20, bdi: 20, servicos: [{ desc: 'Conforme projeto', un: 'vb', qtd: 1, mat: 34000, mo: 13500 }] },
    { id: 'q5', num: 105, cli: 'k4', titulo: 'Pintura do depósito', status: 'perdido', criado: -40, bdi: 18, servicos: [{ desc: 'Pintura acrílica', un: 'm²', qtd: 410, mat: 9, mo: 14 }] },
  ];
  const compras = [
    { id: uid(), obra: 'b1', forn: 'Depósito São Jorge', desc: 'Argamassa polimérica e tela', valor: 3480, dia: -6, status: 'entregue', pagoEm: null, vence: 4 },
    { id: uid(), obra: 'b1', forn: 'Tintas Minas', desc: 'Textura acrílica 25 kg (40 un.)', valor: 6940, dia: -2, status: 'pedido', pagoEm: null, vence: 12 },
    { id: uid(), obra: 'b2', forn: 'Gesso Forte', desc: 'Placas drywall e perfis', valor: 7310, dia: -9, status: 'entregue', pagoEm: -3, vence: -3 },
    { id: uid(), obra: 'b2', forn: 'Elétrica Central', desc: 'Cabos, eletrodutos e quadro', valor: 4860, dia: -1, status: 'pedido', pagoEm: null, vence: 20 },
    { id: uid(), obra: 'b3', forn: 'Concreteira Horizonte', desc: 'Concreto usinado 12 m³', valor: 6120, dia: 1, status: 'pedido', pagoEm: null, vence: 15 },
    { id: uid(), obra: 'b3', forn: 'Aço Forte', desc: 'Vergalhões e telas', valor: 5230, dia: -15, status: 'entregue', pagoEm: -10, vence: -10 },
  ];
  const equipe = [
    { id: 'p1', nome: 'Gilmar Souza', funcao: 'Mestre de obras', diaria: 280, vinculo: 'próprio', hoje: 'b3' },
    { id: 'p2', nome: 'Fabrício Lima', funcao: 'Pedreiro', diaria: 220, vinculo: 'próprio', hoje: 'b3' },
    { id: 'p3', nome: 'Rogério Dias', funcao: 'Pedreiro', diaria: 220, vinculo: 'próprio', hoje: 'b1' },
    { id: 'p4', nome: 'Wesley Santos', funcao: 'Servente', diaria: 150, vinculo: 'próprio', hoje: 'b1' },
    { id: 'p5', nome: 'Anderson (pintor)', funcao: 'Pintor', diaria: 240, vinculo: 'terceiro', hoje: 'b1' },
    { id: 'p6', nome: 'Elétrica Silva', funcao: 'Eletricista', diaria: 320, vinculo: 'terceiro', hoje: 'b2' },
    { id: 'p7', nome: 'Diego Prado', funcao: 'Gesseiro', diaria: 260, vinculo: 'terceiro', hoje: '' },
  ];
  const presencas = [];
  for (let d = -6; d <= -1; d++) equipe.forEach((p, i) => { if ((i + d) % 5 !== 0 && p.hoje) presencas.push({ p: p.id, dia: d, obra: p.hoje }); });
  const medicoes = [
    { id: uid(), num: 7, obra: 'b1', dia: -10, valor: 6800 + 18400 * 0.6, status: 'recebida', itens: [] },
    { id: uid(), num: 8, obra: 'b3', dia: -2, valor: 22500 + 19800, status: 'a receber', vence: 8, itens: [] },
    { id: uid(), num: 9, obra: 'b2', dia: -4, valor: 4200 + 15800 * 0.5, status: 'a receber', vence: 3, itens: [] },
  ];
  const diario = [
    { id: uid(), obra: 'b1', dia: -1, clima: 'Ensolarado', efetivo: 4, texto: 'Textura aplicada na face norte (35%). Andaime da face leste remontado.', fotos: ['Face norte com textura'] },
    { id: uid(), obra: 'b3', dia: -1, clima: 'Nublado', efetivo: 3, texto: 'Escoramento da laje conferido. Concretagem marcada para amanhã às 7 h.', fotos: ['Escoramento', 'Armação da laje'] },
    { id: uid(), obra: 'b2', dia: -2, clima: 'Chuva à tarde', efetivo: 2, texto: 'Forro dos consultórios 1 e 2 fechado. Faltam pontos de lógica da recepção.', fotos: [] },
  ];
  return { empresa: { nome: 'Construtora Alicerce', resp: 'Eng. Patrícia Moura', registro: 'CREA-MG 118.447', cnpj: '33.902.118/0001-45', pix: 'financeiro@alicerce.com.br' },
    eu: { nome: 'Patrícia Moura', letra: 'normal', assinatura: true, abrir: 'painel' },
    clientes, obras, orcamentos, compras, equipe, presencas, medicoes, diario, outras: [{ id: uid(), desc: 'Aluguel do escritório e depósito', valor: 3200, vence: 6, pago: false }, { id: uid(), desc: 'Seguro de responsabilidade civil', valor: 890, vence: 18, pago: false }],
    proxOrc: 113, proxMed: 10, obraSel: 'b1', plano: 'basico',
    acessos: [{ id: 'a1', nome: 'Gilmar Souza', email: 'gilmar@alicerce.com.br', cargo: 'Mestre de obras' }, { id: 'a2', nome: 'Beatriz Antunes', email: 'beatriz@alicerce.com.br', cargo: 'Financeiro' }] };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || base(); } catch { return base(); } })();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
const guardar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { avisar('O navegador ficou sem espaço para guardar.'); } };

const cli = (id) => db.clientes.find((c) => c.id === id) || { nome: '—', tel: '' };
const obra = (id) => db.obras.find((o) => o.id === id);
const valor = (o) => o.etapas.reduce((t, e) => t + e.valor, 0);
const custoPrev = (o) => o.etapas.reduce((t, e) => t + e.custo, 0);
// sem obra cadastrada (começou do zero): as telas da obra pedem a primeira
const semObra = (t) => `<div class="titulo"><div><h1>${t}</h1><p>Aprove um orçamento em Orçamentos e ele vira a primeira obra.</p></div></div>`;
const executado = (o) => o.etapas.reduce((t, e) => t + e.valor * e.exec / 100, 0);
const medido = (o) => o.etapas.reduce((t, e) => t + e.valor * e.medido / 100, 0);
const maoObra = (o) => db.presencas.filter((p) => p.obra === o.id).reduce((t, p) => t + (db.equipe.find((x) => x.id === p.p)?.diaria || 0), 0);
const gastoReal = (o) => db.compras.filter((c) => c.obra === o.id).reduce((t, c) => t + c.valor, 0) + maoObra(o);
const atrasadas = (o) => o.etapas.filter((e) => e.fim < 0 && e.exec < 100);
const totalServ = (s) => s.qtd * (s.mat + s.mo);
const totalOrc = (r) => r.servicos.reduce((t, s) => t + totalServ(s), 0) * (1 + r.bdi / 100);

function avisar(t) { const a = document.createElement('div'); a.className = 'aviso'; a.textContent = t; q('#avisos').append(a); setTimeout(() => a.remove(), 3400); }
function janela(conteudo, depois) {
  const f = document.createElement('div'); f.className = 'fundo';
  f.innerHTML = `<div class="janela" role="dialog" aria-modal="true">${conteudo}</div>`;
  const volta = document.activeElement; document.body.append(f);
  const fechar = () => { f.remove(); volta?.focus?.(); };
  f.addEventListener('click', (e) => { if (e.target === f || e.target.closest('[data-fecha]')) fechar(); });
  f.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });
  setTimeout(() => (f.querySelector('input, select, textarea') || f.querySelector('button'))?.focus(), 30);
  depois?.(f.querySelector('.janela'), fechar);
}
function formulario(titulo, campos, ok, salvar) {
  janela(`<h2>${titulo}</h2><form>${campos}<div class="rodape-j"><button type="button" class="b" data-fecha>Cancelar</button><button class="b cafe">${ok}</button></div></form>`, (j, fechar) => {
    j.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); if (salvar(new FormData(e.target)) !== false) { guardar(); fechar(); desenhar(); } });
  });
}
const seletorObra = () => `<div class="escolha"><label for="sel-obra"><b>Obra</b></label><select id="sel-obra">${db.obras.filter((o) => o.status === 'andamento').map((o) => `<option value="${o.id}" ${o.id === db.obraSel ? 'selected' : ''}>${esc(o.nome)}</option>`).join('')}</select></div>`;

// ------------------------------------------------------------------ seções
const SECOES = [
  ['painel', 'Painel'], ['orcamentos', 'Orçamentos'], ['cronograma', 'Cronograma'], ['medicoes', 'Medições'], ['compras', 'Compras'],
  ['equipe', 'Equipe'], ['financeiro', 'Financeiro'], ['diario', 'Diário'], ['clientes', 'Clientes'], ['dono', 'Dono'], ['config', 'Ajustes'], ['ia', 'IA'],
];
const TELA = {
  painel() {
    const ativas = db.obras.filter((o) => o.status === 'andamento');
    const receber = db.medicoes.filter((m) => m.status === 'a receber'), pagar = db.compras.filter((c) => !c.pagoEm && c.vence <= 30);
    const atr = ativas.flatMap((o) => atrasadas(o).map((e) => ({ o, e }))), hoje = db.equipe.filter((p) => p.hoje);
    const aMedir = ativas.map((o) => ({ o, v: executado(o) - medido(o) })).filter((x) => x.v > 500);
    return `<div class="titulo"><div><h1>Painel da construtora</h1><p>${ativas.length} obras em andamento · ${hoje.length} pessoas trabalhando hoje</p></div><div class="botoes"><button class="b cafe" data-acao="novo-orc">+ Orçamento</button><a class="b" href="#medicoes">Medir etapas</a></div></div>
      <div class="folhas">
        <div class="f f3 cota escura"><small>A receber (medições)</small><b>${mil(receber.reduce((t, m) => t + m.valor, 0))}</b><span>${receber.length} medições em aberto</span></div>
        <div class="f f3 cota"><small>Executado e não medido</small><b>${mil(aMedir.reduce((t, x) => t + x.v, 0))}</b><span>dinheiro parado: meça e cobre</span></div>
        <div class="f f3 cota"><small>A pagar em 30 dias</small><b>${mil(pagar.reduce((t, c) => t + c.valor, 0))}</b><span>${pagar.length} compras de material</span></div>
        <div class="f f3 cota"><small>Margem prevista</small><b>${pct(1 - ativas.reduce((t, o) => t + custoPrev(o), 0) / (ativas.reduce((t, o) => t + valor(o), 0) || 1))}</b><span>sobre ${mil(ativas.reduce((t, o) => t + valor(o), 0))} contratados</span></div>
        <section class="f f8"><h2>Obras na régua</h2>${regua(ativas.map((o) => ({ nome: o.nome, sub: cli(o.cli).nome, ini: Math.min(...o.etapas.map((e) => e.ini)), fim: Math.max(...o.etapas.map((e) => e.fim)), feito: executado(o) / valor(o), atrasada: atrasadas(o).length > 0, ir: 'cronograma', id: o.id })))}</section>
        <section class="f f4"><h2>Atenção hoje</h2><ul class="lista">
          ${atr.map(({ o, e }) => `<li><span class="selo at">atraso</span><div class="cresce"><b>${esc(e.nome)}</b><small>${esc(o.nome)} · era até ${dia(e.fim)} · ${e.exec}% feito</small></div></li>`).join('')}
          ${aMedir.map(({ o, v }) => `<li><span class="selo mo">medir</span><div class="cresce"><b>${esc(o.nome)}</b><small>${brl(v)} executados e ainda não cobrados</small></div><button class="b mini" data-acao="medir" data-o="${o.id}">Medir</button></li>`).join('')}
          ${db.compras.filter((c) => c.status === 'pedido' && c.dia <= 1).map((c) => `<li><span class="selo">entrega</span><div class="cresce"><b>${esc(c.desc)}</b><small>${esc(c.forn)} · ${c.dia <= 0 ? 'era para chegar' : 'chega amanhã'}</small></div></li>`).join('') || ''}
        </ul></section>
      </div>`;
  },
  orcamentos() {
    const cols = [['rascunho', 'Rascunho'], ['enviado', 'Enviado'], ['negociando', 'Negociando'], ['aprovado', 'Aprovado']];
    const fechados = db.orcamentos.filter((r) => ['aprovado', 'perdido'].includes(r.status)), taxa = fechados.length ? db.orcamentos.filter((r) => r.status === 'aprovado').length / fechados.length : 0;
    return `<div class="titulo"><div><h1>Orçamentos</h1><p>Composição de material e mão de obra com BDI. Taxa de fechamento: <b>${pct(taxa)}</b>.</p></div><div class="botoes"><button class="b cafe" data-acao="novo-orc">+ Novo orçamento</button></div></div>
      <div class="funil">${cols.map(([k, t]) => { const l = db.orcamentos.filter((r) => r.status === k); return `<section class="coluna"><h3>${t}<span>${mil(l.reduce((s, r) => s + totalOrc(r), 0))}</span></h3>${l.map((r) => `<a class="ficha" href="#orcamento/${r.id}"><b>Nº ${r.num} · ${esc(r.titulo)}</b><small>${esc(cli(r.cli).nome)} · ${dia(r.criado)}</small><span class="v">${brl(totalOrc(r))}</span></a>`).join('') || '<p class="vazio">—</p>'}</section>`; }).join('')}</div>
      ${db.orcamentos.some((r) => r.status === 'perdido') ? `<p class="vazio">Perdidos: ${db.orcamentos.filter((r) => r.status === 'perdido').map((r) => `nº ${r.num} (${esc(r.titulo)})`).join(', ')}</p>` : ''}`;
  },
  orcamento(id) {
    const r = db.orcamentos.find((x) => x.id === id); if (!r) return TELA.orcamentos();
    const direto = r.servicos.reduce((t, s) => t + totalServ(s), 0), mat = r.servicos.reduce((t, s) => t + s.qtd * s.mat, 0);
    return `<div class="titulo"><div><a href="#orcamentos">← Orçamentos</a><h1>Orçamento nº ${r.num}</h1><p>${esc(cli(r.cli).nome)}</p></div><div class="botoes"><button class="b" data-acao="doc-orc" data-id="${r.id}">Proposta em PDF</button><a class="b" target="_blank" rel="noopener" href="https://wa.me/55${cli(r.cli).tel}?text=${encodeURIComponent(`Olá! Segue a proposta nº ${r.num} da ${db.empresa.nome}: ${r.titulo}, total de ${brl(totalOrc(r))}. Para aprovar pelo link: https://bluerose-store.com/p/${r.id}`)}">Mandar pelo WhatsApp</a>${r.status !== 'aprovado' ? `<button class="b musgo" data-acao="aprovar" data-id="${r.id}">Aprovado: virar obra</button>` : ''}</div></div>
      <div class="f" data-orc="${r.id}">
        <div class="duas"><label class="campo">Serviço<input data-o="titulo" value="${esc(r.titulo)}"></label><label class="campo">Situação<select data-o="status">${['rascunho', 'enviado', 'negociando', 'aprovado', 'perdido'].map((s) => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label></div>
        <div class="tab"><table><thead><tr><th>Serviço</th><th>Un.</th><th class="n">Qtd</th><th class="n">Material/un</th><th class="n">Mão de obra/un</th><th class="n">Total</th><th></th></tr></thead><tbody>
          ${r.servicos.map((s, i) => `<tr data-i="${i}"><td><input data-s="desc" value="${esc(s.desc)}"></td><td><select data-s="un">${['m²', 'm', 'm³', 'un', 'vb', 'kg', 'h'].map((u) => `<option ${u === s.un ? 'selected' : ''}>${u}</option>`).join('')}</select></td><td><input class="n" data-s="qtd" inputmode="decimal" value="${String(s.qtd).replace('.', ',')}"></td><td><input class="n" data-s="mat" inputmode="decimal" value="${String(s.mat).replace('.', ',')}"></td><td><input class="n" data-s="mo" inputmode="decimal" value="${String(s.mo).replace('.', ',')}"></td><td class="n" data-tot>${brl(totalServ(s))}</td><td><button class="b mini" data-acao="tira-serv" data-i="${i}" aria-label="Tirar serviço">×</button></td></tr>`).join('')}
          <tr><td colspan="7"><button class="b mini" data-acao="mais-serv">+ Serviço</button></td></tr>
          <tr><td colspan="5">Custo direto <small>(material ${brl(mat)} · mão de obra ${brl(direto - mat)})</small></td><td class="n" data-direto>${brl(direto)}</td><td></td></tr>
          <tr><td colspan="4">BDI (administração, impostos e lucro)</td><td><input class="n" data-o="bdi" inputmode="decimal" value="${r.bdi}" aria-label="BDI em porcentagem"></td><td class="n" data-bdi>${brl(direto * r.bdi / 100)}</td><td>%</td></tr>
          <tr class="total"><td colspan="5">Preço de venda</td><td class="n" data-total>${brl(totalOrc(r))}</td><td></td></tr>
        </tbody></table></div></div>`;
  },
  cronograma() {
    const o = obra(db.obraSel) || db.obras[0];
    if (!o) return semObra('Cronograma');
    return `<div class="titulo"><div><h1>Cronograma</h1><p>Clique na barra para mudar as datas ou o quanto foi feito. A linha vermelha é hoje.</p></div><div class="botoes"><button class="b" data-acao="nova-etapa">+ Etapa</button></div></div>
      ${seletorObra()}<div class="f">${regua(o.etapas.map((e) => ({ nome: e.nome, sub: `${brl(e.valor)} · ${e.exec}% feito`, ini: e.ini, fim: e.fim, feito: e.exec / 100, atrasada: e.fim < 0 && e.exec < 100, etapa: e.id })))}</div>`;
  },
  medicoes() {
    const o = obra(db.obraSel) || db.obras[0];
    if (!o) return semObra('Medições');
    const novo = executado(o) - medido(o);
    return `<div class="titulo"><div><h1>Medições</h1><p>Meça o que foi executado e cobre só isso. O boletim vai para o cliente aprovar.</p></div></div>${seletorObra()}
      <div class="folhas"><section class="f f7"><h2>${esc(o.nome)}</h2><div class="tab"><table><thead><tr><th>Etapa</th><th class="n">Valor</th><th class="n">Executado</th><th class="n">Já medido</th><th class="n">A medir</th></tr></thead><tbody>
        ${o.etapas.map((e) => `<tr><td>${esc(e.nome)}</td><td class="n">${brl(e.valor)}</td><td class="n">${e.exec}%</td><td class="n">${e.medido}%</td><td class="n"><b>${brl(e.valor * (e.exec - e.medido) / 100)}</b></td></tr>`).join('')}
        <tr class="total"><td>Total</td><td class="n">${brl(valor(o))}</td><td class="n">${pct(executado(o) / valor(o))}</td><td class="n">${pct(medido(o) / valor(o))}</td><td class="n">${brl(novo)}</td></tr></tbody></table></div>
        <div class="botoes" style="margin-top:12px"><button class="b cafe" data-acao="medir" data-o="${o.id}" ${novo < 1 ? 'disabled' : ''}>Gerar medição de ${brl(novo)}</button></div></section>
      <section class="f f5"><h2>Medições da construtora</h2><ul class="lista">${[...db.medicoes].sort((a, b) => b.num - a.num).map((m) => `<li><div class="cresce"><b>Medição nº ${m.num} · ${esc(obra(m.obra)?.nome)}</b><small>${dia(m.dia)}${m.status === 'a receber' ? ` · vence ${dia(m.vence)}` : ''}</small></div><b>${brl(m.valor)}</b>${m.status === 'a receber' ? `<button class="b mini musgo" data-acao="recebi-med" data-id="${m.id}">Recebi</button>` : '<span class="selo ok">recebida</span>'}</li>`).join('')}</ul></section></div>`;
  },
  compras() {
    const f = db.filtroCompra || 'todas', l = db.compras.filter((c) => f === 'todas' || c.obra === f).sort((a, b) => b.dia - a.dia);
    return `<div class="titulo"><div><h1>Compras</h1><p>Cada compra fica na obra certa: o custo real aparece sozinho no financeiro.</p></div><div class="botoes"><button class="b cafe" data-acao="nova-compra">+ Pedido de compra</button></div></div>
      <div class="escolha"><label for="filtro-compra"><b>Mostrar</b></label><select id="filtro-compra"><option value="todas">Todas as obras</option>${db.obras.map((o) => `<option value="${o.id}" ${f === o.id ? 'selected' : ''}>${esc(o.nome)}</option>`).join('')}</select></div>
      <div class="f tab"><table><thead><tr><th>Data</th><th>Obra</th><th>Fornecedor</th><th>O que</th><th class="n">Valor</th><th>Entrega</th><th>Pagamento</th></tr></thead><tbody>
        ${l.map((c) => `<tr><td>${dia(c.dia)}</td><td>${esc(obra(c.obra)?.nome)}</td><td>${esc(c.forn)}</td><td>${esc(c.desc)}</td><td class="n">${brl(c.valor)}</td><td>${c.status === 'entregue' ? '<span class="selo ok">entregue</span>' : `<button class="b mini" data-acao="chegou" data-id="${c.id}">Chegou</button>`}</td><td>${c.pagoEm != null ? '<span class="selo ok">pago</span>' : `<button class="b mini" data-acao="paguei" data-id="${c.id}">Pagar (${dia(c.vence)})</button>`}</td></tr>`).join('')}
        <tr class="total"><td colspan="4">Total</td><td class="n">${brl(l.reduce((t, c) => t + c.valor, 0))}</td><td colspan="2"></td></tr></tbody></table></div>`;
  },
  equipe() {
    const semana = db.equipe.map((p) => { const d = db.presencas.filter((x) => x.p === p.id && x.dia >= -6).length; return { p, d, v: d * p.diaria }; });
    return `<div class="titulo"><div><h1>Equipe</h1><p>Marque onde cada um está hoje. A semana fecha sozinha com as diárias.</p></div><div class="botoes"><button class="b" data-acao="nova-pessoa">+ Pessoa</button><button class="b cafe" data-acao="fechar-semana">Fechar a semana</button></div></div>
      <div class="f tab"><table><thead><tr><th>Pessoa</th><th>Função</th><th>Vínculo</th><th class="n">Diária</th><th>Hoje está em</th><th class="n">Dias (7)</th><th class="n">A pagar</th></tr></thead><tbody>
        ${semana.map(({ p, d, v }) => `<tr><td><b>${esc(p.nome)}</b></td><td>${esc(p.funcao)}</td><td><span class="selo ${p.vinculo === 'terceiro' ? 'mo' : ''}">${p.vinculo}</span></td><td class="n">${brl(p.diaria)}</td><td><select data-hoje="${p.id}" aria-label="Onde ${esc(p.nome)} está hoje"><option value="">Folga / não veio</option>${db.obras.filter((o) => o.status === 'andamento').map((o) => `<option value="${o.id}" ${p.hoje === o.id ? 'selected' : ''}>${esc(o.nome)}</option>`).join('')}</select></td><td class="n">${d}</td><td class="n">${brl(v)}</td></tr>`).join('')}
        <tr class="total"><td colspan="6">Total da semana</td><td class="n">${brl(semana.reduce((t, x) => t + x.v, 0))}</td></tr></tbody></table></div>`;
  },
  financeiro() {
    const semanas = Array.from({ length: 8 }, (_, i) => {
      const a = i * 7, b = a + 6;
      const ent = db.medicoes.filter((m) => m.status === 'a receber' && m.vence >= a && m.vence <= b).reduce((t, m) => t + m.valor, 0);
      const sai = db.compras.filter((c) => c.pagoEm == null && Math.max(0, c.vence) >= a && Math.max(0, c.vence) <= b).reduce((t, c) => t + c.valor, 0) + db.equipe.filter((p) => p.hoje).reduce((t, p) => t + p.diaria * 5, 0) + db.outras.filter((x) => !x.pago && x.vence >= a && x.vence <= b).reduce((t, x) => t + x.valor, 0);
      return { i, ent, sai };
    }), max = Math.max(...semanas.flatMap((s) => [s.ent, s.sai]), 1);
    return `<div class="titulo"><div><h1>Financeiro</h1><p>Próximas 8 semanas e o resultado de cada obra: orçado contra realizado.</p></div><div class="botoes"><button class="b" data-acao="nova-conta">+ Conta a pagar</button></div></div>
      <div class="folhas"><section class="f f7"><h2>Caixa das próximas semanas</h2><div class="caixa">${semanas.map((s) => `<div class="sem"><div class="par"><i class="ent" style="height:${s.ent / max * 150}px" title="Entra ${brl(s.ent)}"></i><i class="sai" style="height:${s.sai / max * 150}px" title="Sai ${brl(s.sai)}"></i></div><span>${s.i === 0 ? 'esta' : `+${s.i} sem`}</span></div>`).join('')}</div>
        <div class="legenda"><span style="--c:var(--musgo-esc)">Entra (medições)</span><span style="--c:var(--mocha)">Sai (compras, equipe e contas)</span></div></section>
      <section class="f f5"><h2>Contas da empresa</h2><ul class="lista">${db.outras.map((x) => `<li><div class="cresce"><b>${esc(x.desc)}</b><small>vence ${dia(x.vence)}</small></div><b>${brl(x.valor)}</b>${x.pago ? '<span class="selo ok">paga</span>' : `<button class="b mini" data-acao="paga-conta" data-id="${x.id}">Paguei</button>`}</li>`).join('')}</ul></section>
      <section class="f"><h2>Orçado x realizado</h2><div class="tab"><table><thead><tr><th>Obra</th><th class="n">Contrato</th><th class="n">Custo previsto</th><th class="n">Gasto até agora</th><th>Uso do previsto</th><th class="n">Executado</th><th class="n">Lucro previsto</th></tr></thead><tbody>
        ${db.obras.map((o) => { const uso = gastoReal(o) / (custoPrev(o) || 1), ex = executado(o) / valor(o); return `<tr><td><b>${esc(o.nome)}</b></td><td class="n">${brl(valor(o))}</td><td class="n">${brl(custoPrev(o))}</td><td class="n">${brl(gastoReal(o))}</td><td><div class="barra ${uso > ex + 0.08 ? 'mocha' : ''}"><i style="width:${Math.min(100, uso * 100)}%"></i></div><small>${pct(uso)} gasto com ${pct(ex)} feito${uso > ex + 0.08 ? ' · <b style="color:var(--atraso)">gastando rápido</b>' : ''}</small></td><td class="n">${pct(ex)}</td><td class="n">${brl(valor(o) - custoPrev(o))}</td></tr>`; }).join('')}
      </tbody></table></div></section></div>`;
  },
  diario() {
    const o = obra(db.obraSel) || db.obras[0];
    if (!o) return semObra('Diário de obra');
    const l = db.diario.filter((d) => d.obra === o.id).sort((a, b) => b.dia - a.dia);
    return `<div class="titulo"><div><h1>Diário de obra</h1><p>Clima, efetivo, o que foi feito e fotos. O cliente vê no link da obra.</p></div><div class="botoes"><label class="b cafe" style="cursor:pointer">+ Registro com fotos<input type="file" accept="image/*" multiple hidden id="foto-diario"></label><button class="b" data-acao="registro">+ Registro sem foto</button></div></div>
      ${seletorObra()}<div class="f"><ul class="lista">${l.map((d) => `<li style="align-items:flex-start"><div style="min-width:70px"><b>${dia(d.dia)}</b><br><small>${esc(d.clima)}</small></div><div class="cresce"><b>${d.efetivo} ${d.efetivo === 1 ? 'pessoa' : 'pessoas'} na obra</b><span>${esc(d.texto)}</span>${d.fotos.length ? `<div class="fotos">${d.fotos.map((f) => (f.startsWith('data:') ? `<img src="${f}" alt="Foto do diário">` : `<span class="ff">${esc(f)}</span>`)).join('')}</div>` : ''}</div></li>`).join('') || '<li class="vazio">Nada registrado nesta obra.</li>'}</ul></div>`;
  },
  clientes() {
    return `<div class="titulo"><div><h1>Clientes</h1></div><div class="botoes"><button class="b cafe" data-acao="novo-cliente">+ Cliente</button></div></div>
      <div class="f tab"><table><thead><tr><th>Cliente</th><th>CPF/CNPJ</th><th>Contato</th><th class="n">Obras</th><th class="n">Contratado</th><th></th></tr></thead><tbody>
      ${db.clientes.map((c) => { const os = db.obras.filter((o) => o.cli === c.id); return `<tr><td><b>${esc(c.nome)}</b></td><td>${esc(c.doc)}</td><td>${esc(c.contato || '')}</td><td class="n">${os.length}</td><td class="n">${brl(os.reduce((t, o) => t + valor(o), 0))}</td><td><a class="b mini" target="_blank" rel="noopener" href="https://wa.me/55${c.tel}">WhatsApp</a></td></tr>`; }).join('')}</tbody></table></div>`;
  },
  dono() {
    const AREAS = [['orcamentos', 'Orçamentos'], ['cronograma', 'Cronograma'], ['medicoes', 'Medições e cobrança'], ['compras', 'Compras'], ['equipe', 'Equipe e diárias'], ['financeiro', 'Financeiro'], ['diario', 'Diário de obra']];
    const CARGOS = { 'Mestre de obras': ['ver', 'editar', 'ver', 'editar', 'editar', 'nada', 'editar'], Comprador: ['nada', 'ver', 'nada', 'editar', 'nada', 'ver', 'ver'], Financeiro: ['ver', 'ver', 'editar', 'editar', 'editar', 'editar', 'ver'], Engenheiro: ['editar', 'editar', 'editar', 'editar', 'editar', 'ver', 'editar'] };
    const preco = db.plano === 'pro' ? 179 : 119;
    return `<div class="titulo"><div><h1>Painel do dono</h1><p>Quem entra no sistema e o que cada cargo pode fazer. Só você e quem for administrador veem esta prancha.</p></div><div class="botoes"><button class="b cafe" data-acao="convidar">+ Convidar pessoa</button></div></div>
      <div class="folhas"><div class="f f3 cota escura"><small>Plano</small><b>${db.plano === 'pro' ? 'Pro' : 'Básico'}</b><span>${brl(preco)}/mês · sem fidelidade</span></div><div class="f f3 cota"><small>Acessos</small><b>${db.acessos.length + 1}</b><span>${db.plano === 'pro' ? 'sem limite' : `você + ${db.acessos.length} de 5`}</span></div>
        <div class="f f6"><h2>Plano</h2><div class="botoes"><button class="b ${db.plano === 'basico' ? 'cafe' : ''}" data-acao="plano" data-v="basico">Básico · R$ 119</button><button class="b ${db.plano === 'pro' ? 'cafe' : ''}" data-acao="plano" data-v="pro">Pro · R$ 179 (equipe sem limite)</button></div><p class="vazio">Anual: 20% a menos. A troca é confirmada no Mercado Pago na versão contratada.</p></div>
        <section class="f f5"><h2>Quem entra</h2><ul class="lista"><li><div class="cresce"><b>${esc(db.eu.nome)}</b><small>dona · acesso total</small></div></li>${db.acessos.map((a) => `<li><div class="cresce"><b>${esc(a.nome)}</b><small>${esc(a.email)}</small></div><select data-cargo="${a.id}" aria-label="Cargo de ${esc(a.nome)}">${Object.keys(CARGOS).map((c) => `<option ${c === a.cargo ? 'selected' : ''}>${c}</option>`).join('')}</select><button class="b mini" data-acao="tira-acesso" data-id="${a.id}">Tirar</button></li>`).join('')}</ul></section>
        <section class="f f7"><h2>O que cada cargo pode</h2><div class="tab"><table><thead><tr><th>Área</th>${Object.keys(CARGOS).map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${AREAS.map(([, t], i) => `<tr><td>${t}</td>${Object.values(CARGOS).map((v) => `<td><span class="selo ${v[i] === 'editar' ? 'ok' : v[i] === 'ver' ? 'mo' : ''}">${v[i]}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div></section></div>`;
  },
  config() {
    const e = db.eu;
    return `<div class="titulo"><div><h1>Ajustes</h1><p>Valem para você. Os dados da empresa saem nas propostas e nos boletins.</p></div></div>
      <div class="folhas"><section class="f f6"><h2>Você</h2><label class="campo">Seu nome<input data-eu="nome" value="${esc(e.nome)}"></label>
        <label class="campo">Abrir o sistema em<select data-eu="abrir">${SECOES.slice(0, 8).map(([k, t]) => `<option value="${k}" ${e.abrir === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="campo">Tamanho das letras<select data-eu="letra"><option value="normal" ${e.letra === 'normal' ? 'selected' : ''}>Normal</option><option value="grande" ${e.letra === 'grande' ? 'selected' : ''}>Grande</option></select></label>
        <label class="campo" style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-eu="assinatura" ${e.assinatura ? 'checked' : ''}> Assinar propostas e boletins com o meu nome e registro</label></section>
      <section class="f f6"><h2>Empresa</h2><label class="campo">Nome<input data-emp="nome" value="${esc(db.empresa.nome)}"></label><div class="duas"><label class="campo">Responsável técnico<input data-emp="resp" value="${esc(db.empresa.resp)}"></label><label class="campo">CREA / CAU<input data-emp="registro" value="${esc(db.empresa.registro)}"></label></div><div class="duas"><label class="campo">CNPJ<input data-emp="cnpj" value="${esc(db.empresa.cnpj)}"></label><label class="campo">Chave PIX<input data-emp="pix" value="${esc(db.empresa.pix)}"></label></div></section></div>`;
  },
  ia() {
    db.conversa ||= [];
    const sug = ['Qual obra está gastando mais rápido do que avança?', 'Quanto posso medir esta semana?', 'O caixa aperta em alguma semana?', 'Quais etapas estão atrasadas?', 'Escreva o e-mail do boletim de medição para o cliente'];
    return `<div class="titulo"><div><h1>Pergunte à IA</h1><p>Ela lê os números das obras (nunca documentos ou telefones de clientes). Na demonstração as respostas são de exemplo; na contratada são 20 perguntas grátis por dia.</p></div></div>
      <div class="f"><div class="conversa" id="conversa">${db.conversa.map((m) => `<div class="balao ${m.eu ? 'eu' : 'ela'}">${esc(m.t)}</div>`).join('') || '<div class="balao ela">Olá! Sou a assistente da prancheta. Pergunte sobre medições, atrasos, caixa ou peça um texto pronto.</div>'}</div>
        <div class="sugestoes" style="margin:12px 0">${sug.map((s) => `<button data-sug="${esc(s)}">${esc(s)}</button>`).join('')}</div>
        <form id="form-ia" class="duas" style="grid-template-columns:1fr auto"><label class="sr" for="perg">Pergunta</label><input id="perg" class="campo" style="margin:0;border:1px solid var(--linho);border-radius:8px;padding:10px" placeholder="Escreva a sua pergunta"><button class="b cafe">Perguntar</button></form></div>`;
  },
};

// régua de semanas: janela de 10 semanas começando 3 semanas atrás
function regua(linhas) {
  const ini = -21, dias = 70, x = (d) => Math.max(0, Math.min(100, (d - ini) / dias * 100));
  const sem = Array.from({ length: 10 }, (_, i) => dia(ini + i * 7));
  return `<div class="gantt"><div class="g-regua"><div></div><div>${sem.map((s) => `<span>${s}</span>`).join('')}</div></div>
    ${linhas.map((l) => `<div class="g-linha"><div class="g-nome">${l.ir ? `<a href="#${l.ir}" data-sel="${l.id}">${esc(l.nome)}</a>` : esc(l.nome)}<small>${esc(l.sub)}</small></div><div class="g-trilho"><span class="g-hoje" style="left:${x(0)}%"></span>
      <button class="g-barra ${l.atrasada ? 'atrasada' : ''}" style="left:${x(l.ini)}%;width:${Math.max(2, x(l.fim) - x(l.ini))}%" ${l.etapa ? `data-acao="editar-etapa" data-e="${l.etapa}"` : `data-sel="${l.id}"`} aria-label="${esc(l.nome)}: ${dia(l.ini)} a ${dia(l.fim)}, ${Math.round(l.feito * 100)}% feito"><i style="width:${l.feito * 100}%"></i><span>${Math.round(l.feito * 100)}%</span></button></div></div>`).join('')}</div>`;
}

// ------------------------------------------------------------------ desenho e navegação
const folha = q('#folha');
function desenhar() {
  const [s, a] = (location.hash.slice(1) || db.eu.abrir || 'painel').split('/');
  folha.innerHTML = (TELA[s] || TELA.painel)(a);
  const atual = s === 'orcamento' ? 'orcamentos' : s;
  const alertas = { cronograma: db.obras.reduce((t, o) => t + (o.status === 'andamento' ? atrasadas(o).length : 0), 0), medicoes: db.medicoes.filter((m) => m.status === 'a receber' && m.vence < 0).length, compras: db.compras.filter((c) => c.status === 'pedido' && c.dia <= 0).length };
  q('#trena').innerHTML = SECOES.map(([k, t], i) => `<a href="#${k}" ${k === atual ? 'aria-current="page"' : ''}><b>${i + 1}</b>${t}${alertas[k] ? `<i>${alertas[k]}</i>` : ''}</a>`).join('');
  q('#empresa').textContent = db.empresa.nome; q('#resp').textContent = `${db.eu.assinatura ? db.empresa.resp : db.eu.nome} · ${db.empresa.registro}`;
  document.documentElement.style.fontSize = db.eu.letra === 'grande' ? '112%' : '';
  document.title = `${(SECOES.find(([k]) => k === atual) || ['', 'Orçamento'])[1]} · Veltria Obras Completo`;
}
addEventListener('hashchange', () => { desenhar(); folha.focus({ preventScroll: true }); scrollTo(0, 0); });

// ------------------------------------------------------------------ ações
const FAZ = {
  'novo-orc': () => { const r = { id: uid(), num: db.proxOrc++, cli: db.clientes[0].id, titulo: 'Novo orçamento', status: 'rascunho', criado: 0, bdi: 22, servicos: [{ desc: '', un: 'm²', qtd: 1, mat: 0, mo: 0 }] }; db.orcamentos.push(r); guardar(); location.hash = `#orcamento/${r.id}`; },
  'mais-serv': () => { const r = orcAtual(); r.servicos.push({ desc: '', un: 'm²', qtd: 1, mat: 0, mo: 0 }); guardar(); desenhar(); },
  'tira-serv': (d) => { const r = orcAtual(); r.servicos.splice(Number(d.i), 1); guardar(); desenhar(); },
  aprovar: (d) => {
    const r = db.orcamentos.find((x) => x.id === d.id); r.status = 'aprovado'; let ini = 2;
    const id = uid(); db.obras.push({ id, nome: r.titulo, cli: r.cli, end: '', status: 'andamento', etapas: r.servicos.map((s) => { const dur = Math.max(5, Math.round(s.qtd * (s.mat + s.mo) / 1500)); const e = { id: uid(), nome: s.desc || 'Serviço', ini, fim: ini + dur, valor: totalServ(s) * (1 + r.bdi / 100), custo: totalServ(s), exec: 0, medido: 0 }; ini += dur; return e; }) });
    db.obraSel = id; guardar(); location.hash = '#cronograma'; avisar('Proposta aprovada: a obra entrou no cronograma com as etapas do orçamento.');
  },
  'doc-orc': (d) => { const r = db.orcamentos.find((x) => x.id === d.id), c = cli(r.cli); janela(`<div class="documento"><header><b>${esc(db.empresa.nome)}</b><span>Proposta nº ${r.num}</span></header><p><b>${esc(r.titulo)}</b><br>${esc(c.nome)} · ${esc(c.doc)}</p><table><thead><tr><th>Serviço</th><th class="n">Qtd</th><th class="n">Valor</th></tr></thead><tbody>${r.servicos.map((s) => `<tr><td>${esc(s.desc)}</td><td class="n">${String(s.qtd).replace('.', ',')} ${s.un}</td><td class="n">${brl(totalServ(s) * (1 + r.bdi / 100))}</td></tr>`).join('')}<tr class="total"><td colspan="2">Total</td><td class="n">${brl(totalOrc(r))}</td></tr></tbody></table><p style="font-size:.85rem">Pagamento por medição da etapa executada. Validade: 15 dias.</p>${db.eu.assinatura ? `<p style="margin-top:28px;border-top:1px solid #999;padding-top:4px;width:260px">${esc(db.empresa.resp)} · ${esc(db.empresa.registro)}</p>` : ''}</div><div class="rodape-j"><button class="b" data-fecha>Fechar</button><button class="b cafe" onclick="print()">Imprimir ou salvar PDF</button></div>`); },
  medir: (d) => {
    const o = obra(d.o), itens = o.etapas.filter((e) => e.exec > e.medido).map((e) => ({ nome: e.nome, de: e.medido, ate: e.exec, v: e.valor * (e.exec - e.medido) / 100 })), total = itens.reduce((t, i) => t + i.v, 0);
    if (!itens.length) return avisar('Nada novo para medir nesta obra.');
    janela(`<h2>Boletim de medição nº ${db.proxMed}</h2><div class="documento"><header><b>${esc(db.empresa.nome)}</b><span>${esc(o.nome)} · ${dia(0)}</span></header><table><thead><tr><th>Etapa</th><th class="n">Medido antes</th><th class="n">Medido agora</th><th class="n">Valor</th></tr></thead><tbody>${itens.map((i) => `<tr><td>${esc(i.nome)}</td><td class="n">${i.de}%</td><td class="n">${i.ate}%</td><td class="n">${brl(i.v)}</td></tr>`).join('')}<tr class="total"><td colspan="3">Total desta medição</td><td class="n">${brl(total)}</td></tr></tbody></table><p style="font-size:.85rem">Pagamento por PIX (${esc(db.empresa.pix)}) em até 7 dias da aprovação.</p></div>
      <div class="rodape-j"><button class="b" data-fecha>Cancelar</button><button class="b cafe" data-confirma>Emitir e mandar ao cliente</button></div>`, (j, fechar) => j.querySelector('[data-confirma]').addEventListener('click', () => {
      o.etapas.forEach((e) => { e.medido = e.exec; }); db.medicoes.push({ id: uid(), num: db.proxMed++, obra: o.id, dia: 0, valor: total, status: 'a receber', vence: 7 }); guardar(); fechar(); desenhar(); avisar(`Medição de ${brl(total)} emitida. O cliente aprova pelo link.`);
    }));
  },
  'recebi-med': (d) => { const m = db.medicoes.find((x) => x.id === d.id); m.status = 'recebida'; guardar(); desenhar(); avisar(`${brl(m.valor)} recebidos.`); },
  'editar-etapa': (d) => {
    const o = db.obras.find((x) => x.etapas.some((e) => e.id === d.e)), e = o.etapas.find((x) => x.id === d.e);
    formulario(esc(e.nome), `<div class="duas"><label class="campo">Começa (dias a partir de hoje)<input name="ini" type="number" value="${e.ini}"><small>${dia(e.ini)}</small></label><label class="campo">Termina<input name="fim" type="number" value="${e.fim}"><small>${dia(e.fim)}</small></label></div><label class="campo">Quanto já foi feito: <output id="sai">${e.exec}%</output><input name="exec" type="range" min="0" max="100" step="5" value="${e.exec}" oninput="document.getElementById('sai').textContent=this.value+'%'"></label>`, 'Salvar', (f) => { e.ini = Number(f.get('ini')); e.fim = Math.max(e.ini + 1, Number(f.get('fim'))); e.exec = Math.max(e.medido, Number(f.get('exec'))); });
  },
  'nova-etapa': () => formulario('Nova etapa', '<label class="campo">Nome<input name="n" required></label><div class="tres"><label class="campo">Começa em (dias)<input name="i" type="number" value="7"></label><label class="campo">Dura (dias)<input name="d" type="number" value="10"></label><label class="campo">Valor (R$)<input name="v" inputmode="decimal" required></label></div>', 'Pôr no cronograma', (f) => { const i = Number(f.get('i')); obra(db.obraSel).etapas.push({ id: uid(), nome: f.get('n'), ini: i, fim: i + Number(f.get('d')), valor: num(f.get('v')), custo: num(f.get('v')) * 0.68, exec: 0, medido: 0 }); }),
  'nova-compra': () => formulario('Pedido de compra', `<label class="campo">Obra<select name="o">${db.obras.filter((o) => o.status === 'andamento').map((o) => `<option value="${o.id}" ${o.id === db.obraSel ? 'selected' : ''}>${esc(o.nome)}</option>`).join('')}</select></label><div class="duas"><label class="campo">Fornecedor<input name="f" required></label><label class="campo">Valor (R$)<input name="v" inputmode="decimal" required></label></div><label class="campo">O que foi pedido<input name="d" required></label><div class="duas"><label class="campo">Entrega em (dias)<input name="e" type="number" value="2"></label><label class="campo">Paga em (dias)<input name="p" type="number" value="28"></label></div>`, 'Registrar pedido', (f) => { db.compras.push({ id: uid(), obra: f.get('o'), forn: f.get('f'), desc: f.get('d'), valor: num(f.get('v')), dia: Number(f.get('e')), status: 'pedido', pagoEm: null, vence: Number(f.get('p')) }); avisar('Pedido registrado na obra.'); }),
  chegou: (d) => { db.compras.find((c) => c.id === d.id).status = 'entregue'; guardar(); desenhar(); },
  paguei: (d) => { db.compras.find((c) => c.id === d.id).pagoEm = 0; guardar(); desenhar(); avisar('Pagamento registrado.'); },
  'nova-pessoa': () => formulario('Nova pessoa', '<label class="campo">Nome<input name="n" required></label><div class="tres"><label class="campo">Função<input name="f" required placeholder="Pedreiro"></label><label class="campo">Diária (R$)<input name="d" inputmode="decimal" required></label><label class="campo">Vínculo<select name="v"><option>próprio</option><option>terceiro</option></select></label></div>', 'Cadastrar', (f) => { db.equipe.push({ id: uid(), nome: f.get('n'), funcao: f.get('f'), diaria: num(f.get('d')), vinculo: f.get('v'), hoje: '' }); }),
  'fechar-semana': () => { const l = db.equipe.map((p) => ({ p, d: db.presencas.filter((x) => x.p === p.id && x.dia >= -6).length })).filter((x) => x.d); janela(`<h2>Pagamento da semana</h2><table><thead><tr><th>Pessoa</th><th class="n">Dias</th><th class="n">Valor</th></tr></thead><tbody>${l.map(({ p, d }) => `<tr><td>${esc(p.nome)}</td><td class="n">${d}</td><td class="n">${brl(d * p.diaria)}</td></tr>`).join('')}<tr class="total"><td colspan="2">Total</td><td class="n">${brl(l.reduce((t, x) => t + x.d * x.p.diaria, 0))}</td></tr></tbody></table><p class="vazio">Cada valor já foi lançado no custo da obra em que a pessoa trabalhou.</p><div class="rodape-j"><button class="b" data-fecha>Fechar</button><button class="b cafe" onclick="print()">Imprimir recibos</button></div>`); },
  'nova-conta': () => formulario('Conta a pagar', '<label class="campo">Descrição<input name="d" required></label><div class="duas"><label class="campo">Valor (R$)<input name="v" inputmode="decimal" required></label><label class="campo">Vence em (dias)<input name="p" type="number" value="10"></label></div>', 'Lançar', (f) => { db.outras.push({ id: uid(), desc: f.get('d'), valor: num(f.get('v')), vence: Number(f.get('p')), pago: false }); }),
  'paga-conta': (d) => { db.outras.find((x) => x.id === d.id).pago = true; guardar(); desenhar(); },
  registro: () => novoRegistro([]),
  'novo-cliente': () => formulario('Novo cliente', '<label class="campo">Nome ou razão social<input name="n" required></label><div class="duas"><label class="campo">CPF ou CNPJ<input name="d"></label><label class="campo">WhatsApp<input name="t" inputmode="tel" required></label></div><label class="campo">Contato<input name="c"></label>', 'Cadastrar', (f) => { db.clientes.push({ id: uid(), nome: f.get('n'), doc: f.get('d') || '—', tel: String(f.get('t')).replace(/\D/g, ''), contato: f.get('c') }); }),
  convidar: () => { if (db.plano !== 'pro' && db.acessos.length >= 5) return avisar('No Básico são você e mais 5 pessoas. O Pro libera sem limite.'); formulario('Convidar pessoa', '<label class="campo">Nome<input name="n" required></label><label class="campo">E-mail<input name="e" type="email" required></label><label class="campo">Cargo<select name="c"><option>Mestre de obras</option><option>Comprador</option><option>Financeiro</option><option>Engenheiro</option></select></label>', 'Mandar convite', (f) => { db.acessos.push({ id: uid(), nome: f.get('n'), email: f.get('e'), cargo: f.get('c') }); avisar(`Convite enviado para ${f.get('e')}.`); }); },
  'tira-acesso': (d) => { db.acessos = db.acessos.filter((a) => a.id !== d.id); guardar(); desenhar(); avisar('Acesso removido.'); },
  plano: (d) => { if (d.v === 'basico' && db.acessos.length > 5) return avisar('Para o Básico, deixe no máximo 5 acessos.'); db.plano = d.v; guardar(); desenhar(); },
};
const orcAtual = () => db.orcamentos.find((x) => x.id === q('[data-orc]').dataset.orc);
function novoRegistro(fotos) {
  formulario('Registro do dia', `${fotos.length ? `<div class="fotos" style="margin-bottom:10px">${fotos.map((f) => `<img src="${f}" alt="">`).join('')}</div>` : ''}<div class="duas"><label class="campo">Clima<select name="c"><option>Ensolarado</option><option>Nublado</option><option>Chuva à tarde</option><option>Chuva o dia todo</option></select></label><label class="campo">Pessoas na obra<input name="e" type="number" value="${db.equipe.filter((p) => p.hoje === db.obraSel).length}"></label></div><label class="campo">O que foi feito<textarea name="t" required></textarea></label>`, 'Salvar no diário', (f) => { db.diario.push({ id: uid(), obra: db.obraSel, dia: 0, clima: f.get('c'), efetivo: Number(f.get('e')), texto: f.get('t'), fotos }); avisar('Registro salvo. O cliente já vê pelo link.'); });
}
function responder(p) {
  const t = tira(p), ativas = db.obras.filter((o) => o.status === 'andamento');
  if (/gast|rapid|estour|custo/.test(t)) { const l = ativas.map((o) => ({ o, d: gastoReal(o) / (custoPrev(o) || 1) - executado(o) / valor(o) })).sort((a, b) => b.d - a.d)[0]; return `"${l.o.nome}" já usou ${pct(gastoReal(l.o) / custoPrev(l.o))} do custo previsto com ${pct(executado(l.o) / valor(l.o))} da obra feita. ${l.d > 0.08 ? 'Está gastando mais rápido do que avança: confira as compras e a produtividade da equipe.' : 'Está dentro do esperado.'}`; }
  if (/medir|medic|cobrar/.test(t)) return ativas.map((o) => `• ${o.nome}: ${brl(executado(o) - medido(o))} executados e não medidos`).join('\n') + '\n\nEmitir as medições hoje adianta o caixa em até 7 dias.';
  if (/caixa|aperta|semana|fluxo/.test(t)) return 'Na semana que vem as saídas (compras de textura e concreto, mais as diárias) passam das entradas. Antecipe a medição da Casa Tavares ou negocie 28 dias na Concreteira Horizonte.';
  if (/atras|prazo/.test(t)) { const l = ativas.flatMap((o) => atrasadas(o).map((e) => `• ${e.nome} (${o.nome}): ${e.exec}% feito, era até ${dia(e.fim)}`)); return l.length ? `Etapas atrasadas:\n${l.join('\n')}\n\nSugestão: reforce a equipe e mande ao cliente uma nova data com foto do andamento.` : 'Nenhuma etapa atrasada.'; }
  if (/email|e-mail|boletim|texto/.test(t)) return `Assunto: Boletim de medição nº ${db.proxMed - 1} · ${ativas[0]?.nome}\n\nPrezado(a),\nsegue o boletim de medição referente aos serviços executados no período, com fotos no diário de obra. O valor pode ser pago por PIX (${db.empresa.pix}) em até 7 dias.\n\nAtenciosamente,\n${db.empresa.resp} · ${db.empresa.nome}`;
  return `Hoje: ${ativas.length} obras, ${brl(ativas.reduce((s, o) => s + executado(o) - medido(o), 0))} para medir e ${db.medicoes.filter((m) => m.status === 'a receber').length} medições a receber.`;
}

document.addEventListener('click', (e) => {
  const sel = e.target.closest('[data-sel]'); if (sel) { db.obraSel = sel.dataset.sel; guardar(); if (sel.tagName === 'BUTTON') location.hash = '#cronograma'; }
  const sg = e.target.closest('[data-sug]'); if (sg) { q('#perg').value = sg.dataset.sug; q('#form-ia').requestSubmit(); return; }
  const ir = e.target.closest('[data-ir]'); if (ir) { location.hash = `#${ir.dataset.ir}`; return; }
  const a = e.target.closest('[data-acao]'); if (!a) return;
  FAZ[a.dataset.acao]?.(a.dataset);
});
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'form-ia') return; e.preventDefault();
  const p = q('#perg').value.trim(); if (p.length < 3) return;
  db.conversa.push({ eu: true, t: p }); desenhar(); const c = q('#conversa'); c.insertAdjacentHTML('beforeend', '<div class="balao ela">Pensando…</div>');
  const fala = (t) => { db.conversa.push({ eu: false, t }); db.conversa = db.conversa.slice(-12); guardar(); desenhar(); };
  if (window.veltriaIA) window.veltriaIA(p).then(fala); else setTimeout(() => fala(`${responder(p)}\n\n(Exemplo da demonstração.)`), 800);
});
document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.id === 'sel-obra') { db.obraSel = t.value; guardar(); desenhar(); }
  if (t.id === 'filtro-compra') { db.filtroCompra = t.value; desenhar(); }
  if (t.dataset.hoje !== undefined && t.dataset.hoje) { const p = db.equipe.find((x) => x.id === t.dataset.hoje); p.hoje = t.value; db.presencas = db.presencas.filter((x) => !(x.p === p.id && x.dia === 0)); if (t.value) db.presencas.push({ p: p.id, dia: 0, obra: t.value }); guardar(); avisar(t.value ? `${p.nome} está hoje em ${obra(t.value).nome}.` : `${p.nome}: folga hoje.`); }
  if (t.dataset.cargo) { db.acessos.find((a) => a.id === t.dataset.cargo).cargo = t.value; guardar(); avisar('Cargo atualizado.'); }
  if (t.dataset.eu) { db.eu[t.dataset.eu] = t.type === 'checkbox' ? t.checked : t.value; guardar(); desenhar(); }
  if (t.dataset.o === 'status') { orcAtual().status = t.value; guardar(); }
  if (t.dataset.s === 'un') { orcAtual().servicos[Number(t.closest('[data-i]').dataset.i)].un = t.value; guardar(); }
  if (t.id === 'foto-diario' && t.files.length) {
    const fotos = [];
    for (const arq of [...t.files].slice(0, 4)) { try { const img = await createImageBitmap(arq), k = Math.min(1, 720 / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = img.width * k; cv.height = img.height * k; cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); fotos.push(cv.toDataURL('image/jpeg', 0.7)); } catch { /* não é imagem */ } }
    novoRegistro(fotos);
  }
});
document.addEventListener('input', (e) => {
  const t = e.target, caixa = t.closest('[data-orc]');
  if (caixa) {
    const r = orcAtual();
    if (t.dataset.o === 'titulo') r.titulo = t.value;
    if (t.dataset.o === 'bdi') r.bdi = num(t.value);
    if (t.dataset.s && t.dataset.s !== 'un') { const s = r.servicos[Number(t.closest('[data-i]').dataset.i)]; s[t.dataset.s] = t.dataset.s === 'desc' ? t.value : num(t.value); t.closest('tr').querySelector('[data-tot]').textContent = brl(totalServ(s)); }
    const direto = r.servicos.reduce((s, x) => s + totalServ(x), 0);
    caixa.querySelector('[data-direto]').textContent = brl(direto); caixa.querySelector('[data-bdi]').textContent = brl(direto * r.bdi / 100); caixa.querySelector('[data-total]').textContent = brl(totalOrc(r));
    guardar();
  }
  if (t.dataset.emp) { db.empresa[t.dataset.emp] = t.value; guardar(); q('#empresa').textContent = db.empresa.nome; }
  if (t.dataset.eu === 'nome') { db.eu.nome = t.value; guardar(); }
  if (t.id === 'busca') {
    const v = tira(t.value); if (v.length < 2) return;
    const o = db.obras.find((x) => tira(`${x.nome} ${cli(x.cli).nome}`).includes(v));
    if (o) { db.obraSel = o.id; if (!location.hash.match(/cronograma|medicoes|diario/)) location.hash = '#cronograma'; else desenhar(); return; }
    if (db.compras.some((c) => tira(c.forn).includes(v))) location.hash = '#compras';
    else if (db.clientes.some((c) => tira(c.nome).includes(v))) location.hash = '#clientes';
  }
});
q('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = base(); location.hash = '#painel'; desenhar(); avisar('Demonstração recomeçada.'); });
desenhar();
