// Veltria Obras Essencial · protótipo "parede de tijolos" para o empreiteiro que trabalha pelo celular.
// Cada obra é uma parede: cada tijolo é um pedaço do valor; sobe quando a etapa fica pronta e escurece quando o cliente paga.
// Orçamento pelo WhatsApp que vira obra, cobrança da etapa por PIX, diário com fotos, gastos, calculadoras de material,
// assistente, painel do dono e configurações. Dados de exemplo só neste aparelho (?novo no endereço recomeça).

const CHAVE = 'veltria-obras-essencial-v1';
const real = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const realCurto = (v) => (v >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : real(v));
const html = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const numero = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const novoId = () => Math.random().toString(36).slice(2, 9);
const quando = (d) => { if (d === 0) return 'hoje'; if (d === -1) return 'ontem'; if (d === 1) return 'amanhã'; const x = new Date(); x.setDate(x.getDate() + d); return x.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''); };
const zap = (tel, msg) => `https://wa.me/55${String(tel).replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
const $ = (s, r = document) => r.querySelector(s);

// ------------------------------------------------------------------ obras de exemplo
function exemplo() {
  const clientes = [
    { id: 'c1', nome: 'Renata Albuquerque', tel: '31988120044', end: 'Rua Pernambuco, 1200, ap 302 · Savassi' },
    { id: 'c2', nome: 'Marcos e Júlia Teixeira', tel: '31991557720', end: 'Rua dos Timbiras, 88 · Funcionários' },
    { id: 'c3', nome: 'Padaria Pão Nosso', tel: '31933004411', end: 'Av. Amazonas, 4021 · Prado' },
    { id: 'c4', nome: 'Sônia Ribeiro', tel: '31987652100', end: 'Rua Ouro Preto, 310 · Barro Preto' },
  ];
  const etapas = (l) => l.map(([nome, valor, feito, pago]) => ({ id: novoId(), nome, valor, feito, pago }));
  const obras = [
    { id: 'o1', nome: 'Banheiro social', cli: 'c1', inicio: -18, entrega: 9, status: 'andamento',
      etapas: etapas([['Demolição e retirada de entulho', 1800, true, true], ['Hidráulica nova', 2600, true, true], ['Impermeabilização', 1400, true, false], ['Revestimento de piso e parede', 3900, false, false], ['Louças, metais e acabamento', 2300, false, false]]),
      gastos: [{ id: novoId(), dia: -16, tipo: 'Material', desc: 'Tubos e conexões PVC', valor: 486.3 }, { id: novoId(), dia: -12, tipo: 'Diária', desc: 'Ajudante (3 dias)', valor: 450 }, { id: novoId(), dia: -6, tipo: 'Material', desc: 'Manta líquida e argamassa', valor: 389.9 }, { id: novoId(), dia: -2, tipo: 'Material', desc: 'Porcelanato 60x60 (18 m²)', valor: 1296 }],
      diario: [{ id: novoId(), dia: -2, texto: 'Impermeabilização pronta. Teste de estanqueidade de 72 h começou hoje.', fotos: ['Teste de estanqueidade'] }, { id: novoId(), dia: -9, texto: 'Hidráulica nova passada e testada, sem vazamento.', fotos: ['Tubulação nova', 'Registro do chuveiro'] }] },
    { id: 'o2', nome: 'Cozinha planejada', cli: 'c2', inicio: -6, entrega: 24, status: 'andamento',
      etapas: etapas([['Retirada da bancada antiga', 900, true, true], ['Elétrica: tomadas e iluminação', 2200, false, false], ['Bancada de granito e cuba', 3800, false, false], ['Revestimento e rejunte', 2700, false, false], ['Pintura e limpeza final', 1400, false, false]]),
      gastos: [{ id: novoId(), dia: -5, tipo: 'Material', desc: 'Fios, caixas e disjuntores', valor: 742.5 }, { id: novoId(), dia: -1, tipo: 'Diária', desc: 'Eletricista', valor: 380 }],
      diario: [{ id: novoId(), dia: -5, texto: 'Bancada antiga retirada. Parede com umidade atrás da pia: avisei a dona Júlia.', fotos: ['Parede atrás da pia'] }] },
    { id: 'o3', nome: 'Fachada da padaria', cli: 'c3', inicio: -40, entrega: -3, status: 'concluida',
      etapas: etapas([['Lavagem e reparo de trincas', 1600, true, true], ['Textura e pintura', 3400, true, true], ['Letreiro e iluminação', 2100, true, false]]),
      gastos: [{ id: novoId(), dia: -35, tipo: 'Material', desc: 'Tinta acrílica e textura', valor: 1180 }, { id: novoId(), dia: -20, tipo: 'Diária', desc: 'Pintor (5 dias)', valor: 1000 }],
      diario: [{ id: novoId(), dia: -4, texto: 'Obra entregue. Cliente gostou do letreiro.', fotos: ['Fachada pronta'] }] },
  ];
  const orcamentos = [
    { id: 'r1', num: 41, cli: 'c4', titulo: 'Troca de piso da sala e quarto', criado: -2, validade: 15, status: 'enviado', mao: 2400, desconto: 0, itens: [{ desc: 'Porcelanato 60x60', qtd: 38, un: 'm²', preco: 72 }, { desc: 'Argamassa AC-III', qtd: 16, un: 'saco', preco: 39.9 }, { desc: 'Rodapé', qtd: 32, un: 'm', preco: 18 }] },
    { id: 'r2', num: 40, cli: 'c1', titulo: 'Pintura do apartamento', criado: -9, validade: 15, status: 'rascunho', mao: 3200, desconto: 200, itens: [{ desc: 'Tinta acrílica 18 L', qtd: 4, un: 'lata', preco: 389 }, { desc: 'Massa corrida', qtd: 3, un: 'lata', preco: 89 }] },
  ];
  return { empresa: { nome: 'Reforma Certa', dono: 'Davi Nunes', pix: 'davi@reformacerta.com.br', tel: '31999990000' }, eu: { nome: 'Davi Nunes', letra: 'normal', cobranca: 'Olá, {cliente}! A etapa "{etapa}" da sua obra ficou pronta. O valor é {valor}. Pode pagar pelo PIX {pix}. Obrigado!' },
    clientes, obras, orcamentos, proxOrc: 42, assinatura: assinaturaNova(), equipe: [{ id: 'e1', nome: 'Toninho', tel: '31991230000', funcao: 'Encarregado', pode: { valores: false, gastos: true, diario: true, orcar: false } }, { id: 'e2', nome: 'Lucas', tel: '31994560000', funcao: 'Ajudante', pode: { valores: false, gastos: false, diario: true, orcar: false } }], plano: 'basico' };
}
// assinatura do app: ligada à conta no site (Mercado Pago). Cancelada = usa até a próxima cobrança; pagamento recusado = app bloqueia até pagar.
function assinaturaNova() { return { plano: 'Básico', valor: 69, status: 'ativa', proxima: 18, renova: true, historico: [{ dia: -12, valor: 69, ok: true }, { dia: -42, valor: 69, ok: true }, { dia: -72, valor: 69, ok: true }] }; }
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || exemplo(); } catch { return exemplo(); } })();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
db.assinatura ||= assinaturaNova();
function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { aviso('A memória do aparelho encheu: apague fotos antigas do diário.'); } }

const cliente = (id) => db.clientes.find((c) => c.id === id) || { nome: 'Cliente', tel: '' };
const obraPor = (id) => db.obras.find((o) => o.id === id);
const valorObra = (o) => o.etapas.reduce((t, e) => t + e.valor, 0);
const prontoObra = (o) => o.etapas.filter((e) => e.feito).reduce((t, e) => t + e.valor, 0);
const pagoObra = (o) => o.etapas.filter((e) => e.pago).reduce((t, e) => t + e.valor, 0);
const gastoObra = (o) => o.gastos.reduce((t, g) => t + g.valor, 0);
const cobrarAgora = () => db.obras.flatMap((o) => o.etapas.filter((e) => e.feito && !e.pago).map((e) => ({ o, e })));
const totalOrc = (r) => r.itens.reduce((t, i) => t + i.qtd * i.preco, 0) + Number(r.mao || 0) - Number(r.desconto || 0);

function aviso(t) { const a = document.createElement('div'); a.className = 'aviso'; a.textContent = t; $('#avisos').append(a); setTimeout(() => a.remove(), 3200); }
function janela(conteudo, aoAbrir) {
  const f = document.createElement('div'); f.className = 'fundo';
  f.innerHTML = `<div class="janela" role="dialog" aria-modal="true">${conteudo}</div>`;
  const antes = document.activeElement; document.body.append(f);
  const fechar = () => { f.remove(); antes?.focus?.(); };
  f.addEventListener('click', (e) => { if (e.target === f || e.target.closest('[data-fechar]')) fechar(); });
  f.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });
  setTimeout(() => (f.querySelector('input, select, textarea, button') || f).focus(), 40);
  aoAbrir?.(f.querySelector('.janela'), fechar);
  return fechar;
}

// a parede: 32 tijolos; cada um vale 1/32 da obra
function parede(o, grande = false) {
  const n = 32, total = valorObra(o) || 1, pos = Math.round(prontoObra(o) / total * n), pago = Math.round(pagoObra(o) / total * n);
  return `<div class="parede ${grande ? 'grande' : ''}" role="img" aria-label="${Math.round(prontoObra(o) / total * 100)}% pronta, ${Math.round(pagoObra(o) / total * 100)}% paga">${Array.from({ length: n }, (_, i) => `<i class="${i < pago ? 'pago' : i < pos ? 'pos' : ''}"></i>`).join('')}</div>`;
}
const legenda = '<div class="leg-parede"><span style="--c:var(--tijolo)">Pronto e pago</span><span style="--c:var(--barro)">Pronto, falta receber</span><span style="--c:#fff">Falta fazer</span></div>';

// ------------------------------------------------------------------ telas
const TELAS = {
  obras() {
    const ativas = db.obras.filter((o) => o.status === 'andamento'), feitas = db.obras.filter((o) => o.status !== 'andamento');
    const cobrar = cobrarAgora(), somaCobrar = cobrar.reduce((t, x) => t + x.e.valor, 0);
    return `<h1>Suas obras</h1><p class="sub">${ativas.length} em andamento. Cada tijolo é um pedaço do valor da obra.</p>
      ${cobrar.length ? `<div class="numeros"><div class="forte"><small>Pronto para cobrar</small><b>${real(somaCobrar)}</b><small>${cobrar.length} ${cobrar.length === 1 ? 'etapa' : 'etapas'} terminadas e não pagas</small></div></div><p><a class="btn barro largo" href="#dinheiro">Cobrar agora</a></p>` : ''}
      ${ativas.map(cartaoObra).join('') || '<p class="vazio">Nenhuma obra rodando. Faça um orçamento: quando o cliente aprovar, ele vira obra aqui.</p>'}
      <div class="acoes" style="margin:6px 0 4px"><button type="button" class="btn cheio" data-acao="nova-obra">+ Nova obra</button><a class="btn" href="#orcar">Fazer orçamento</a></div>
      ${feitas.length ? `<h2>Entregues</h2>${feitas.map(cartaoObra).join('')}` : ''}`;
  },
  obra(id, aba = 'etapas') {
    const o = obraPor(id); if (!o) return TELAS.obras();
    const c = cliente(o.cli), falta = valorObra(o) - pagoObra(o), atrasada = o.status === 'andamento' && o.entrega < 0;
    const corpo = {
      etapas: () => `<ul class="lista">${o.etapas.map((e) => `<li><button type="button" class="marca ${e.feito ? 'feito' : ''}" data-acao="etapa" data-o="${o.id}" data-e="${e.id}" aria-label="${e.feito ? 'Desmarcar' : 'Marcar como pronta'}: ${html(e.nome)}">${e.feito ? '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>' : ''}</button><div class="cresce"><b>${html(e.nome)}</b><small>${e.pago ? 'paga' : e.feito ? 'pronta, falta receber' : 'a fazer'}</small></div><span class="v">${real(e.valor)}</span>${e.feito && !e.pago ? `<button type="button" class="btn peq barro" data-acao="cobrar" data-o="${o.id}" data-e="${e.id}">Cobrar</button>` : ''}</li>`).join('')}</ul>
        <p style="margin-top:12px"><button type="button" class="btn peq" data-acao="nova-etapa" data-o="${o.id}">+ Etapa</button></p>`,
      diario: () => `<p><label class="btn cheio largo" style="cursor:pointer">📷 Registrar o dia com foto<input type="file" accept="image/*" capture="environment" multiple hidden data-foto="${o.id}"></label></p>
        <p><button type="button" class="btn largo" data-acao="anotar" data-o="${o.id}">Só escrever uma anotação</button></p>
        <div class="diario">${o.diario.map((d) => `<article class="dia"><time>${quando(d.dia)}</time><p>${html(d.texto)}</p>${d.fotos.length ? `<div class="fotos">${d.fotos.map((f) => (f.startsWith('data:') ? `<img src="${f}" alt="Foto da obra">` : `<span class="foto-falsa">${html(f)}</span>`)).join('')}</div>` : ''}</article>`).join('') || '<p class="vazio">Nada registrado ainda. Cliente que vê a obra andando confia e paga em dia.</p>'}</div>`,
      gastos: () => `<div class="numeros"><div><small>Gasto até agora</small><b>${real(gastoObra(o))}</b></div><div><small>Sobra prevista</small><b>${real(valorObra(o) - gastoObra(o))}</b></div></div>
        <p><button type="button" class="btn cheio largo" data-acao="gasto" data-o="${o.id}">+ Lançar gasto</button></p>
        <ul class="lista">${[...o.gastos].sort((a, b) => b.dia - a.dia).map((g) => `<li><div class="cresce"><b>${html(g.desc)}</b><small>${g.tipo} · ${quando(g.dia)}</small></div><span class="v">${real(g.valor)}</span></li>`).join('') || '<li class="vazio">Nenhum gasto lançado.</li>'}</ul>`,
      cliente: () => `<ul class="lista"><li><div class="cresce"><b>${html(c.nome)}</b><small>${html(c.end || '')}</small></div><a class="btn peq verde" target="_blank" rel="noopener" href="${zap(c.tel, `Olá, ${c.nome.split(' ')[0]}! Tudo certo por aí?`)}">WhatsApp</a></li></ul>
        <h2>Link da obra para o cliente</h2><p class="sub">O cliente acompanha a parede subindo, vê as fotos e paga as etapas pelo PIX, sem precisar de senha.</p>
        <div class="acoes"><button type="button" class="btn cheio" data-acao="ver-cliente" data-o="${o.id}">Ver como o cliente vê</button><a class="btn" target="_blank" rel="noopener" href="${zap(c.tel, `Olá, ${c.nome.split(' ')[0]}! Este é o link para acompanhar a sua obra (${o.nome}): https://bluerose-store.com/obra/${o.id}`)}">Mandar o link</a></div>`,
    };
    return `<a class="voltar" href="#obras">← Obras</a><h1>${html(o.nome)}</h1><p class="sub">${html(c.nome)} · entrega ${o.status === 'concluida' ? 'feita' : quando(o.entrega)} ${atrasada ? '<span class="selo al">atrasada</span>' : ''}</p>
      ${parede(o, true)}${legenda}
      <div class="numeros" style="margin-top:12px"><div><small>Valor da obra</small><b>${realCurto(valorObra(o))}</b></div><div><small>Já recebeu</small><b>${realCurto(pagoObra(o))}</b></div><div><small>Falta receber</small><b>${realCurto(falta)}</b></div></div>
      <div class="abas" role="group" aria-label="Partes da obra">${[['etapas', 'Etapas'], ['diario', 'Diário'], ['gastos', 'Gastos'], ['cliente', 'Cliente']].map(([k, t]) => `<button type="button" data-ir="obra/${o.id}/${k}" aria-pressed="${aba === k}">${t}</button>`).join('')}</div>
      ${(corpo[aba] || corpo.etapas)()}
      ${o.status === 'andamento' && o.etapas.every((e) => e.feito) ? `<p style="margin-top:16px"><button type="button" class="btn verde largo" data-acao="entregar" data-o="${o.id}">Marcar obra como entregue</button></p>` : ''}`;
  },
  orcar() {
    const st = { rascunho: ['Rascunho', ''], enviado: ['Esperando o cliente', 'al'], aprovado: ['Aprovado', 'ok'], perdido: ['Não fechou', ''] };
    const env = db.orcamentos.filter((r) => r.status === 'enviado'), aprov = db.orcamentos.filter((r) => r.status === 'aprovado').length, decid = db.orcamentos.filter((r) => ['aprovado', 'perdido'].includes(r.status)).length;
    return `<h1>Orçamentos</h1><p class="sub">${env.length} esperando resposta${decid ? ` · você fecha ${Math.round(aprov / decid * 100)}% dos orçamentos` : ''}.</p>
      <p><button type="button" class="btn cheio largo" data-acao="novo-orc">+ Novo orçamento</button></p>
      <ul class="lista">${[...db.orcamentos].sort((a, b) => b.num - a.num).map((r) => `<li><a class="cresce" href="#orcamento/${r.id}" style="text-decoration:none;color:inherit"><b>Nº ${r.num} · ${html(r.titulo)}</b><small>${html(cliente(r.cli).nome)} · ${quando(r.criado)}</small></a><span class="v">${real(totalOrc(r))}</span><span class="selo ${st[r.status][1]}">${st[r.status][0]}</span></li>`).join('') || '<li class="vazio">Nenhum orçamento ainda.</li>'}</ul>`;
  },
  orcamento(id) {
    const r = db.orcamentos.find((x) => x.id === id); if (!r) return TELAS.orcar();
    const linhas = r.itens.map((i, k) => `<div class="item-orc" data-k="${k}"><input aria-label="Descrição" value="${html(i.desc)}" data-campo="desc" placeholder="Material ou serviço"><input aria-label="Quantidade" inputmode="decimal" value="${String(i.qtd).replace('.', ',')}" data-campo="qtd"><select aria-label="Unidade" data-campo="un">${['m²', 'm', 'un', 'saco', 'lata', 'kg', 'dia', 'vb'].map((u) => `<option ${u === i.un ? 'selected' : ''}>${u}</option>`).join('')}</select><input aria-label="Preço unitário" inputmode="decimal" value="${String(i.preco).replace('.', ',')}" data-campo="preco"><button type="button" data-acao="tira-item" data-k="${k}" aria-label="Tirar item">×</button></div>`).join('');
    return `<a class="voltar" href="#orcar">← Orçamentos</a><h1>Orçamento nº ${r.num}</h1>
      <div data-orc="${r.id}">
      <label class="campo">O que é<input data-orc-campo="titulo" value="${html(r.titulo)}"></label>
      <label class="campo">Cliente<select data-orc-campo="cli" data-livre="clientes">${db.clientes.map((c) => `<option value="${c.id}" ${c.id === r.cli ? 'selected' : ''}>${html(c.nome)}</option>`).join('')}</select></label>
      <h2>Material</h2><p class="mini">Descrição · quantidade · unidade · preço de cada</p>${linhas}
      <button type="button" class="btn peq" data-acao="mais-item">+ Item</button>
      <div class="dupla" style="margin-top:14px"><label class="campo">Mão de obra (R$)<input data-orc-campo="mao" inputmode="decimal" value="${String(r.mao).replace('.', ',')}"></label><label class="campo">Desconto (R$)<input data-orc-campo="desconto" inputmode="decimal" value="${String(r.desconto).replace('.', ',')}"></label></div>
      <div class="total-orc"><span>Total</span><span data-total>${real(totalOrc(r))}</span></div>
      <div class="acoes">
        <a class="btn barro" target="_blank" rel="noopener" data-acao="enviar-orc" data-id="${r.id}" href="${zap(cliente(r.cli).tel, textoOrc(r))}">Mandar no WhatsApp</a>
        <button type="button" class="btn" data-acao="imprimir-orc" data-id="${r.id}">Ver em PDF</button>
        ${r.status !== 'aprovado' ? `<button type="button" class="btn verde" data-acao="aprovar" data-id="${r.id}">Cliente aprovou: virar obra</button>` : '<span class="selo ok">Já virou obra</span>'}
        ${r.status === 'enviado' ? `<button type="button" class="btn peq" data-acao="perdido" data-id="${r.id}">Não fechou</button>` : ''}
      </div></div>`;
  },
  dinheiro() {
    const cobrar = cobrarAgora(), mes = db.obras.flatMap((o) => o.gastos).filter((g) => g.dia > -30).reduce((t, g) => t + g.valor, 0);
    const recebido = db.obras.reduce((t, o) => t + pagoObra(o), 0), futuro = db.obras.filter((o) => o.status === 'andamento').reduce((t, o) => t + valorObra(o) - prontoObra(o), 0);
    return `<h1>Dinheiro</h1><p class="sub">Quanto entrou, quanto falta e quanto cada obra está deixando de lucro.</p>
      <div class="numeros"><div class="forte"><small>Pronto para cobrar</small><b>${real(cobrar.reduce((t, x) => t + x.e.valor, 0))}</b></div><div><small>Ainda vai entrar</small><b>${realCurto(futuro)}</b></div><div><small>Já recebido</small><b>${realCurto(recebido)}</b></div><div><small>Gastos (30 dias)</small><b>${realCurto(mes)}</b></div></div>
      <h2>Cobrar agora</h2><ul class="lista">${cobrar.map(({ o, e }) => `<li><div class="cresce"><b>${html(e.nome)}</b><small>${html(o.nome)} · ${html(cliente(o.cli).nome)}</small></div><span class="v">${real(e.valor)}</span><button type="button" class="btn peq barro" data-acao="cobrar" data-o="${o.id}" data-e="${e.id}">Cobrar</button></li>`).join('') || '<li class="vazio">Nada para cobrar: todas as etapas prontas já foram pagas.</li>'}</ul>
      <h2>Lucro de cada obra</h2><ul class="lista">${db.obras.map((o) => { const l = valorObra(o) - gastoObra(o); return `<li><div class="cresce"><b>${html(o.nome)}</b><small>valor ${real(valorObra(o))} · gasto ${real(gastoObra(o))}</small></div><span class="v" style="color:${l < 0 ? 'var(--alerta)' : 'inherit'}">${real(l)}</span><span class="selo">${Math.round(l / (valorObra(o) || 1) * 100)}%</span></li>`; }).join('')}</ul>`;
  },
  contas() {
    return `<h1>Calculadoras</h1><p class="sub">Quanto material comprar, já com a sobra para perda e corte.</p><div class="calcs">
      <section class="calc" data-calc="piso"><h3>Piso e revestimento</h3><div class="dupla"><label class="campo">Largura (m)<input inputmode="decimal" data-v="a" value="3"></label><label class="campo">Comprimento (m)<input inputmode="decimal" data-v="b" value="4"></label></div><label class="campo">Caixa tem quantos m²<input inputmode="decimal" data-v="cx" value="2,16"></label><div class="resultado" data-res></div></section>
      <section class="calc" data-calc="tinta"><h3>Tinta</h3><div class="dupla"><label class="campo">Área das paredes (m²)<input inputmode="decimal" data-v="a" value="60"></label><label class="campo">Demãos<input inputmode="numeric" data-v="d" value="2"></label></div><label class="campo">Rende quantos m² por litro<input inputmode="decimal" data-v="r" value="10"></label><div class="resultado" data-res></div></section>
      <section class="calc" data-calc="concreto"><h3>Concreto (laje ou contrapiso)</h3><div class="dupla"><label class="campo">Área (m²)<input inputmode="decimal" data-v="a" value="20"></label><label class="campo">Espessura (cm)<input inputmode="decimal" data-v="e" value="8"></label></div><div class="resultado" data-res></div></section>
      <section class="calc" data-calc="tijolo"><h3>Tijolos e blocos</h3><div class="dupla"><label class="campo">Área da parede (m²)<input inputmode="decimal" data-v="a" value="15"></label><label class="campo">Tipo<select data-v="t"><option value="25">Bloco cerâmico 9x19x29 (25/m²)</option><option value="12.5">Bloco de concreto 14x19x39 (12,5/m²)</option><option value="40">Tijolinho maciço (40/m²)</option></select></label></div><div class="resultado" data-res></div></section>
    </div>`;
  },
  mais() {
    return `<h1>Mais</h1><ul class="lista">
      <li><a class="cresce" href="#clientes" style="text-decoration:none;color:inherit"><b>Clientes</b><small>${db.clientes.length} cadastrados</small></a><span aria-hidden="true">›</span></li>
      <li><a class="cresce" href="#dono" style="text-decoration:none;color:inherit"><b>Painel do dono</b><small>sua equipe, o que cada um pode ver e o seu plano</small></a><span aria-hidden="true">›</span></li>
      <li><a class="cresce" href="#config" style="text-decoration:none;color:inherit"><b>Minhas configurações</b><small>seu nome, chave PIX, mensagem de cobrança, letras</small></a><span aria-hidden="true">›</span></li>
      <li><a class="cresce" href="#assinatura" style="text-decoration:none;color:inherit"><b>Minha assinatura</b><small>${rotuloAss()}</small></a><span aria-hidden="true">›</span></li>
      <li><a class="cresce" href="#ia" style="text-decoration:none;color:inherit"><b>Assistente</b><small>pergunte sobre as suas obras, grátis</small></a><span aria-hidden="true">›</span></li></ul>`;
  },
  clientes() {
    return `<a class="voltar" href="#mais">← Mais</a><h1>Clientes</h1><p><button type="button" class="btn cheio largo" data-acao="novo-cliente">+ Novo cliente</button></p>
      <ul class="lista">${db.clientes.map((c) => { const os = db.obras.filter((o) => o.cli === c.id); return `<li><div class="cresce"><b>${html(c.nome)}</b><small>${os.length ? `${os.length} ${os.length === 1 ? 'obra' : 'obras'}` : 'sem obra ainda'} · ${html(c.end || '')}</small></div><a class="btn peq verde" target="_blank" rel="noopener" href="${zap(c.tel, `Olá, ${c.nome.split(' ')[0]}!`)}">WhatsApp</a></li>`; }).join('')}</ul>`;
  },
  dono() {
    const PODE = [['valores', 'Ver valores e quanto falta receber'], ['gastos', 'Lançar gastos'], ['diario', 'Registrar o diário com fotos'], ['orcar', 'Fazer orçamentos']];
    const limite = db.plano === 'pro' ? Infinity : 5, preco = db.plano === 'pro' ? 129 : 69;
    return `<a class="voltar" href="#mais">← Mais</a><h1>Painel do dono</h1><p class="sub">Só você vê esta parte. A equipe entra pelo celular de cada um e só faz o que você deixar.</p>
      <div class="numeros"><div class="forte"><small>Seu plano</small><b>Assinatura</b><small>${real(preco)} por mês · sem fidelidade</small></div><div><small>Equipe</small><b>${db.equipe.length + 1} pessoas</b><small>${limite === Infinity ? 'sem limite' : `você + ${db.equipe.length} de 5`}</small></div></div>
      <h2>Sua equipe</h2>
      ${db.equipe.map((p) => `<div class="calc" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><b>${html(p.nome)}</b><br><small class="mini">${html(p.funcao)}</small></div><button type="button" class="btn peq" data-acao="tira-equipe" data-id="${p.id}">Tirar</button></div>
        <div style="margin-top:10px;display:grid;gap:8px">${PODE.map(([k, t]) => `<label style="display:flex;gap:10px;align-items:center"><input type="checkbox" data-pode="${p.id}:${k}" ${p.pode[k] ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--tijolo)">${t}</label>`).join('')}</div></div>`).join('')}
      <p><button type="button" class="btn cheio largo" data-acao="convidar">+ Chamar alguém para a equipe</button></p>
      <h2>Plano</h2><div class="acoes"><button type="button" class="btn ${db.plano === 'basico' ? 'cheio' : ''}" data-acao="plano" data-v="basico">Assinatura · R$ 69/mês</button></div>
      <p class="mini">Equipe sem limite, histórico de quem fez o quê e até 10 empresas. Pagando por ano você economiza 20%. Na versão contratada a troca é confirmada no Mercado Pago.</p>`;
  },
  config() {
    const e = db.eu;
    return `<a class="voltar" href="#mais">← Mais</a><h1>Minhas configurações</h1><p class="sub">Muda só para você.</p>
      <label class="campo">Seu nome<input data-eu="nome" value="${html(e.nome)}"></label>
      <label class="campo">Nome da empresa<input data-emp="nome" value="${html(db.empresa.nome)}"></label>
      <label class="campo">Sua chave PIX<input data-emp="pix" value="${html(db.empresa.pix)}"><small>Vai na mensagem de cobrança de cada etapa.</small></label>
      <label class="campo">Mensagem de cobrança<textarea data-eu="cobranca">${html(e.cobranca)}</textarea><small>Use {cliente}, {etapa}, {valor} e {pix}: o sistema troca pelo certo.</small></label>
      <label class="campo">Tamanho das letras<select data-eu="letra">${[['normal', 'Normal'], ['grande', 'Grande'], ['maior', 'Bem grande']].map(([v, t]) => `<option value="${v}" ${e.letra === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <p><button type="button" class="btn largo" data-acao="backup">Baixar cópia dos meus dados</button></p>`;
  },
  assinatura() {
    const a = db.assinatura, h = [...a.historico].sort((x, y) => y.dia - x.dia);
    const estado = a.status === 'vencida' ? `<div class="numeros"><div class="forte" style="background:var(--alerta);border-color:var(--alerta)"><small>Assinatura vencida</small><b>Pagamento não aprovado</b><small>A cobrança de ${quando(a.proxima)} não caiu. Pague para voltar a usar.</small></div></div>`
      : a.renova ? `<div class="numeros"><div class="forte"><small>Assinatura ativa</small><b>${a.plano} · ${real(a.valor)}/mês</b><small>próxima cobrança ${quando(a.proxima)}, no cartão</small></div></div>`
      : `<div class="numeros"><div><small>Assinatura cancelada</small><b>Você usa até ${quando(a.proxima)}</b><small>depois disso o app pede para assinar de novo</small></div></div>`;
    return `<a class="voltar" href="#mais">← Mais</a><h1>Minha assinatura</h1><p class="sub">A assinatura do app é a mesma da sua conta no site. Sem fidelidade.</p>${estado}
      <div class="acoes" style="margin:14px 0">${a.status === 'vencida' ? '<button type="button" class="btn barro" data-acao="pagar-app">Pagar aqui no app</button><a class="btn" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a>'
        : a.renova ? '<button type="button" class="btn" data-acao="cancelar-ass">Cancelar a assinatura</button><a class="btn" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Trocar cartão ou plano no site</a>'
        : '<button type="button" class="btn cheio" data-acao="reativar">Reativar a assinatura</button>'}</div>
      <h2>Pagamentos</h2><ul class="lista">${h.map((x) => `<li><div class="cresce"><b>${real(x.valor)}</b><small>${quando(x.dia)} · ${x.ok ? 'pago no cartão' : 'recusado pelo banco'}</small></div><span class="selo ${x.ok ? 'ok' : 'al'}">${x.ok ? 'pago' : 'recusado'}</span></li>`).join('')}</ul>
      <p class="mini" style="margin-top:12px">Ao cancelar, nada mais é cobrado e você continua usando até o fim do mês já pago. Seus dados ficam guardados por 90 dias caso volte.</p>`;
  },
  ia() {
    const perguntas = ['Quanto eu tenho para receber?', 'Qual obra está dando mais lucro?', 'Alguma obra atrasada?', 'Escreva uma mensagem para cobrar com educação', 'Como faço um orçamento que fecha mais?'];
    return `<h1>Assistente</h1><p class="sub">Pergunte sobre as suas obras. Ele olha os seus números, nunca o telefone ou o endereço dos clientes. Na versão contratada são 20 perguntas grátis por dia; aqui as respostas são de exemplo.</p>
      <div class="chips">${perguntas.map((p) => `<button type="button" data-pergunta="${html(p)}">${html(p)}</button>`).join('')}</div>
      <label class="campo">Sua pergunta<textarea id="pergunta" placeholder="Ex.: o que eu cobro primeiro?"></textarea></label>
      <button type="button" class="btn cheio largo" data-acao="perguntar">Perguntar</button><div class="ia-resp" id="resposta" hidden aria-live="polite"></div>`;
  },
};
function cartaoObra(o) {
  const c = cliente(o.cli), pct = Math.round(prontoObra(o) / (valorObra(o) || 1) * 100), prox = o.etapas.find((e) => !e.feito);
  return `<a class="obra" href="#obra/${o.id}"><div class="obra-cab"><b>${html(o.nome)}</b><span>${pct}%</span></div>${parede(o)}
    <div class="obra-pe"><span>${html(c.nome)}</span><span>${o.status === 'andamento' ? (prox ? `agora: <b>${html(prox.nome)}</b>` : '<b>pronta para entregar</b>') : '<span class="selo ok">entregue</span>'}</span><span>${o.status === 'andamento' ? `entrega <b>${quando(o.entrega)}</b>${o.entrega < 0 ? ' <span class="selo al">atrasada</span>' : ''}` : ''}</span></div></a>`;
}
const textoOrc = (r) => `Olá, ${cliente(r.cli).nome.split(' ')[0]}! Segue o orçamento nº ${r.num} da ${db.empresa.nome}:\n${r.titulo}\n\n${r.itens.map((i) => `• ${i.desc}: ${String(i.qtd).replace('.', ',')} ${i.un} × ${real(i.preco)}`).join('\n')}\n• Mão de obra: ${real(r.mao)}${r.desconto ? `\n• Desconto: − ${real(r.desconto)}` : ''}\n\nTotal: ${real(totalOrc(r))}\nVálido por ${r.validade} dias. Para aprovar, é só responder "aprovado".`;

// ------------------------------------------------------------------ navegação
const rotuloAss = () => { const a = db.assinatura; return a.status === 'vencida' ? 'vencida: pague para continuar' : a.renova ? `ativa · próxima cobrança ${quando(a.proxima)}` : `cancelada · usa até ${quando(a.proxima)}`; };
const tela = $('#tela');
function mostrar() {
  const [rota, a, b] = (location.hash.slice(1) || 'obras').split('/');
  const f = TELAS[rota] || TELAS.obras;
  tela.innerHTML = f(a, b);
  const abaBarra = { obra: 'obras', orcamento: 'orcar', clientes: 'mais', dono: 'mais', config: 'mais', ia: 'mais', assinatura: 'mais' }[rota] || rota;
  document.querySelectorAll('.barra a').forEach((x) => (x.dataset.aba === abaBarra ? x.setAttribute('aria-current', 'page') : x.removeAttribute('aria-current')));
  document.title = `${{ assinatura: 'Minha assinatura', obras: 'Obras', obra: 'Obra', orcar: 'Orçamentos', orcamento: 'Orçamento', dinheiro: 'Dinheiro', contas: 'Calculadoras', mais: 'Mais', clientes: 'Clientes', dono: 'Painel do dono', config: 'Configurações', ia: 'Assistente' }[rota] || 'Obras'} · Veltria Obras Essencial`;
  if (rota === 'contas') tela.querySelectorAll('[data-calc]').forEach(calcular);
  if (!db.assinatura.renova && db.assinatura.status !== 'vencida' && rota !== 'assinatura') tela.insertAdjacentHTML('afterbegin', `<p class="selo al" style="display:block;padding:8px 12px;margin-bottom:12px;border-radius:12px">Assinatura cancelada: você usa até ${quando(db.assinatura.proxima)}. <a href="#assinatura">Reativar</a></p>`);
  bloqueio(rota);
  pintarTopo();
}
function pintarTopo() {
  $('#empresa-nome').textContent = db.empresa.nome; $('#quem-sou').textContent = `${db.eu.nome} · empreiteiro`;
  document.documentElement.style.fontSize = { grande: '112%', maior: '125%' }[db.eu.letra] || '';
}
addEventListener('hashchange', () => { mostrar(); tela.focus({ preventScroll: true }); scrollTo(0, 0); });

// ------------------------------------------------------------------ ações
// assinatura vencida: o app fica bloqueado (os dados continuam guardados) até a pessoa pagar
function bloqueio(rota) {
  document.querySelector('.bloqueio')?.remove();
  if (db.assinatura.status !== 'vencida' || rota === 'assinatura') return;
  const b = document.createElement('div'); b.className = 'fundo bloqueio';
  b.innerHTML = `<div class="janela" role="alertdialog" aria-modal="true" aria-labelledby="bl-t"><h2 id="bl-t">Sua assinatura venceu</h2><p class="sub">O pagamento de ${real(db.assinatura.valor)} não foi aprovado pelo banco. Suas obras, fotos e orçamentos estão guardados: é só renovar para voltar a usar.</p>
    <div class="acoes" style="flex-direction:column"><button type="button" class="btn barro largo" data-acao="pagar-app">Pagar aqui no app</button><a class="btn largo" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a><a class="btn largo" href="#assinatura" style="border-style:dashed">Ver minha assinatura</a></div></div>`;
  document.body.append(b);
}
function pagarNoApp() {
  const a = db.assinatura, codigo = `00020126580014BR.GOV.BCB.PIX0136bluerose-${Math.random().toString(16).slice(2, 10)}5204000053039865406${a.valor.toFixed(2)}5802BR6009BH`;
  janela(`<h2>Pagar ${real(a.valor)}</h2><p class="sub">Escolha como pagar. A liberação é na hora.</p>
    <div class="abas" role="group" aria-label="Forma de pagamento"><button type="button" aria-pressed="true" data-forma-p="pix">PIX</button><button type="button" aria-pressed="false" data-forma-p="cartao">Cartão de crédito</button></div>
    <div data-p="pix"><div class="cliente-vista" style="display:grid;place-items:center;gap:10px"><div aria-hidden="true" style="width:180px;height:180px;background:repeating-conic-gradient(var(--texto) 0 25%, #fff 0 50%) 0 0/24px 24px;border:10px solid #fff;outline:2px solid var(--texto)"></div><small class="mini">QR Code de exemplo</small></div>
      <label class="campo" style="margin-top:12px">PIX copia e cola<input readonly value="${codigo}" onclick="this.select()"></label><button type="button" class="btn largo" data-copiar="${codigo}">Copiar código</button></div>
    <div data-p="cartao" hidden><label class="campo">Número do cartão<input inputmode="numeric" placeholder="Na versão contratada abre o pagamento seguro do Mercado Pago" disabled></label><a class="btn largo" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Pagar com cartão (Mercado Pago)</a></div>
    <div class="acoes" style="margin-top:14px"><button type="button" class="btn verde" data-pago>Simular pagamento aprovado</button><button type="button" class="btn" data-fechar>Voltar</button></div>`, (j, fechar) => {
    j.addEventListener('click', (e) => {
      const f = e.target.closest('[data-forma-p]'); if (f) { j.querySelectorAll('[data-forma-p]').forEach((x) => x.setAttribute('aria-pressed', x === f)); j.querySelectorAll('[data-p]').forEach((x) => { x.hidden = x.dataset.p !== f.dataset.formaP; }); }
      const c = e.target.closest('[data-copiar]'); if (c) { navigator.clipboard?.writeText(c.dataset.copiar).catch(() => {}); aviso('Código PIX copiado'); }
      if (e.target.closest('[data-pago]')) { a.status = 'ativa'; a.renova = true; a.historico.push({ dia: 0, valor: a.valor, ok: true }); a.proxima = 30; salvar(); fechar(); mostrar(); aviso('Pagamento aprovado. Bem-vindo de volta!'); }
    });
  });
}
// a demonstração no "celular" do site manda simular os casos da assinatura
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data?.simular) return;
  const a = db.assinatura;
  if (e.data.simular === 'cancelar') { a.renova = false; a.status = 'ativa'; }
  if (e.data.simular === 'recusado') { a.status = 'vencida'; a.renova = true; a.proxima = 0; a.historico.push({ dia: 0, valor: a.valor, ok: false }); }
  if (e.data.simular === 'normal') { db.assinatura = assinaturaNova(); }
  salvar(); mostrar();
});
function cobrar(o, e) {
  const c = cliente(o.cli), msg = db.eu.cobranca.replace('{cliente}', c.nome.split(' ')[0]).replace('{etapa}', e.nome).replace('{valor}', real(e.valor)).replace('{pix}', db.empresa.pix);
  janela(`<h2>Cobrar ${html(e.nome)}</h2><p class="sub">${html(o.nome)} · ${html(c.nome)}</p><div class="cliente-vista" style="white-space:pre-wrap">${html(msg)}</div>
    <div class="acoes" style="margin-top:14px"><a class="btn barro" target="_blank" rel="noopener" href="${zap(c.tel, msg)}">Mandar no WhatsApp</a><button type="button" class="btn verde" data-pagou>O cliente já pagou</button><button type="button" class="btn" data-fechar>Depois</button></div>`, (j, fechar) => {
    j.querySelector('[data-pagou]').addEventListener('click', () => { e.pago = true; salvar(); fechar(); mostrar(); aviso(`${real(e.valor)} recebidos. Mais um tijolo pago.`); });
  });
}
function formulario(titulo, campos, botao, aoSalvar) {
  janela(`<h2>${titulo}</h2><form>${campos}<div class="acoes"><button type="submit" class="btn cheio">${botao}</button><button type="button" class="btn" data-fechar>Cancelar</button></div></form>`, (j, fechar) => {
    j.querySelector('form').addEventListener('submit', (ev) => { ev.preventDefault(); if (aoSalvar(new FormData(ev.target)) !== false) { salvar(); fechar(); mostrar(); } });
  });
}
async function fotoPequena(arq) {
  const img = await createImageBitmap(arq), lado = 640, k = Math.min(1, lado / Math.max(img.width, img.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); return cv.toDataURL('image/jpeg', 0.7);
}
const ACOES = {
  etapa: (d) => { const o = obraPor(d.o), e = o.etapas.find((x) => x.id === d.e); e.feito = !e.feito; if (!e.feito) e.pago = false; salvar(); mostrar(); if (e.feito) { aviso('Etapa pronta. A parede subiu.'); if (!e.pago) setTimeout(() => cobrar(o, e), 350); } },
  cobrar: (d) => { const o = obraPor(d.o); cobrar(o, o.etapas.find((x) => x.id === d.e)); },
  'nova-etapa': (d) => formulario('Nova etapa', '<label class="campo">Nome da etapa<input name="n" required placeholder="Ex.: Gesso e sanca"></label><label class="campo">Valor (R$)<input name="v" inputmode="decimal" required></label>', 'Pôr na obra', (f) => { obraPor(d.o).etapas.push({ id: novoId(), nome: f.get('n'), valor: numero(f.get('v')), feito: false, pago: false }); }),
  anotar: (d) => formulario('Anotação do dia', '<label class="campo">O que aconteceu hoje<textarea name="t" required placeholder="Ex.: chegou o porcelanato, começamos o assentamento"></textarea></label>', 'Salvar no diário', (f) => { obraPor(d.o).diario.unshift({ id: novoId(), dia: 0, texto: f.get('t'), fotos: [] }); }),
  gasto: (d) => formulario('Lançar gasto', '<label class="campo">O que foi<input name="d" required placeholder="Ex.: 10 sacos de cimento"></label><div class="dupla"><label class="campo">Valor (R$)<input name="v" inputmode="decimal" required></label><label class="campo">Tipo<select name="t"><option>Material</option><option>Diária</option><option>Frete</option><option>Outro</option></select></label></div>', 'Lançar', (f) => { obraPor(d.o).gastos.push({ id: novoId(), dia: 0, tipo: f.get('t'), desc: f.get('d'), valor: numero(f.get('v')) }); aviso('Gasto lançado'); }),
  'ver-cliente': (d) => { const o = obraPor(d.o), prox = o.etapas.find((e) => e.feito && !e.pago); janela(`<p class="mini nao-imprime">Assim o cliente vê, pelo link, sem senha:</p><div class="cliente-vista"><header><b>${html(db.empresa.nome)}</b><span class="selo">${Math.round(prontoObra(o) / valorObra(o) * 100)}% pronta</span></header><h2 style="margin:4px 0 8px">${html(o.nome)}</h2>${parede(o, true)}${legenda}
      <ul class="lista" style="margin-top:12px">${o.etapas.map((e) => `<li><div class="cresce"><b>${html(e.nome)}</b><small>${e.pago ? 'paga' : e.feito ? 'pronta' : 'a fazer'}</small></div><span class="v">${real(e.valor)}</span></li>`).join('')}</ul>
      ${prox ? `<p style="margin-top:12px"><span class="btn barro largo">Pagar "${html(prox.nome)}" pelo PIX · ${real(prox.valor)}</span></p>` : ''}
      ${o.diario[0] ? `<p class="mini" style="margin-top:12px">Última novidade (${quando(o.diario[0].dia)}): ${html(o.diario[0].texto)}</p>` : ''}</div><p style="margin-top:12px"><button type="button" class="btn largo" data-fechar>Fechar</button></p>`); },
  entregar: (d) => { const o = obraPor(d.o); o.status = 'concluida'; salvar(); location.hash = '#obras'; aviso(`${o.nome} entregue. Peça uma indicação para esse cliente!`); },
  'nova-obra': () => formulario('Nova obra', `<label class="campo">Nome da obra<input name="n" required placeholder="Ex.: Reforma da área de serviço"></label><label class="campo">Cliente<select name="c" data-livre="clientes">${db.clientes.map((c) => `<option value="${c.id}">${html(c.nome)}</option>`).join('')}</select></label><label class="campo">Entrega em quantos dias<input name="e" inputmode="numeric" value="30"></label><p class="mini">Depois você põe as etapas e o valor de cada uma.</p>`, 'Criar obra', (f) => { const id = novoId(); db.obras.unshift({ id, nome: f.get('n'), cli: f.get('c'), inicio: 0, entrega: Number(f.get('e')) || 30, status: 'andamento', etapas: [], gastos: [], diario: [] }); setTimeout(() => (location.hash = `#obra/${id}`), 0); }),
  'novo-orc': () => { const r = { id: novoId(), num: db.proxOrc++, cli: db.clientes[0].id, titulo: 'Novo orçamento', criado: 0, validade: 15, status: 'rascunho', mao: 0, desconto: 0, itens: [{ desc: '', qtd: 1, un: 'm²', preco: 0 }] }; db.orcamentos.unshift(r); salvar(); location.hash = `#orcamento/${r.id}`; },
  'mais-item': () => { const r = db.orcamentos.find((x) => x.id === $('[data-orc]').dataset.orc); r.itens.push({ desc: '', qtd: 1, un: 'un', preco: 0 }); salvar(); mostrar(); },
  'tira-item': (d) => { const r = db.orcamentos.find((x) => x.id === $('[data-orc]').dataset.orc); r.itens.splice(Number(d.k), 1); salvar(); mostrar(); },
  'enviar-orc': (d) => { const r = db.orcamentos.find((x) => x.id === d.id); if (r.status === 'rascunho') { r.status = 'enviado'; salvar(); setTimeout(mostrar, 300); } return true; },
  'imprimir-orc': (d) => { const r = db.orcamentos.find((x) => x.id === d.id), c = cliente(r.cli); janela(`<div class="cliente-vista"><header><b>${html(db.empresa.nome)}</b><span>Orçamento nº ${r.num}</span></header><p><b>${html(r.titulo)}</b><br>${html(c.nome)} · ${html(c.end || '')}</p><ul class="lista">${r.itens.map((i) => `<li><div class="cresce">${html(i.desc)}<small> ${String(i.qtd).replace('.', ',')} ${i.un} × ${real(i.preco)}</small></div><span class="v">${real(i.qtd * i.preco)}</span></li>`).join('')}<li><div class="cresce">Mão de obra</div><span class="v">${real(r.mao)}</span></li>${r.desconto ? `<li><div class="cresce">Desconto</div><span class="v">− ${real(r.desconto)}</span></li>` : ''}</ul><div class="total-orc"><span>Total</span><span>${real(totalOrc(r))}</span></div><p class="mini">Válido por ${r.validade} dias. Pagamento por etapa, conforme o andamento da obra.</p></div><div class="acoes nao-imprime" style="margin-top:12px"><button type="button" class="btn cheio" data-imprimir>Imprimir ou salvar em PDF</button><button type="button" class="btn" data-fechar>Fechar</button></div>`, (j) => j.querySelector('[data-imprimir]').addEventListener('click', () => print())); },
  aprovar: (d) => { const r = db.orcamentos.find((x) => x.id === d.id); r.status = 'aprovado'; const total = totalOrc(r), id = novoId();
    const partes = [['Entrada para começar', 0.3], ['Metade da obra', 0.4], ['Entrega e acabamento', 0.3]];
    db.obras.unshift({ id, nome: r.titulo, cli: r.cli, inicio: 0, entrega: 30, status: 'andamento', etapas: partes.map(([n, p]) => ({ id: novoId(), nome: n, valor: Math.round(total * p * 100) / 100, feito: false, pago: false })), gastos: [], diario: [] });
    salvar(); location.hash = `#obra/${id}`; aviso('Orçamento aprovado e virou obra. Ajuste as etapas se quiser.'); },
  perdido: (d) => { db.orcamentos.find((x) => x.id === d.id).status = 'perdido'; salvar(); mostrar(); },
  'novo-cliente': () => formulario('Novo cliente', '<label class="campo">Nome<input name="n" required></label><label class="campo">WhatsApp<input name="t" inputmode="tel" required placeholder="(31) 99999-9999"></label><label class="campo">Endereço da obra<input name="e"></label>', 'Cadastrar', (f) => { db.clientes.push({ id: novoId(), nome: f.get('n'), tel: f.get('t'), end: f.get('e') }); aviso('Cliente cadastrado'); }),
  convidar: () => { formulario('Chamar para a equipe', '<label class="campo">Nome<input name="n" required></label><label class="campo">WhatsApp<input name="t" inputmode="tel" required></label><label class="campo">Função<select name="f"><option>Encarregado</option><option>Pedreiro</option><option>Ajudante</option><option>Escritório</option></select></label><p class="mini">A pessoa recebe um link no WhatsApp para entrar pelo celular.</p>', 'Mandar convite', (f) => { db.equipe.push({ id: novoId(), nome: f.get('n'), tel: f.get('t'), funcao: f.get('f'), pode: { valores: f.get('f') === 'Escritório', gastos: f.get('f') !== 'Ajudante', diario: true, orcar: f.get('f') === 'Escritório' } }); aviso(`Convite mandado para ${f.get('n')}`); }); },
  'tira-equipe': (d) => { db.equipe = db.equipe.filter((p) => p.id !== d.id); salvar(); mostrar(); aviso('Pessoa tirada da equipe. O acesso dela acabou.'); },
  plano: (d) => { if (d.v === 'basico' && db.equipe.length > 5) return aviso('Para voltar ao Básico, deixe no máximo 5 pessoas na equipe.'); db.plano = d.v; salvar(); mostrar(); },
  backup: () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })); a.download = 'minhas-obras.json'; a.click(); URL.revokeObjectURL(a.href); },
  'pagar-app': () => pagarNoApp(),
  'cancelar-ass': () => { if (!confirm(`Cancelar a assinatura? Nada mais será cobrado e você usa até ${quando(db.assinatura.proxima)}.`)) return; db.assinatura.renova = false; salvar(); mostrar(); aviso(`Assinatura cancelada. Você usa até ${quando(db.assinatura.proxima)}.`); },
  reativar: () => { db.assinatura.renova = true; salvar(); mostrar(); aviso('Assinatura reativada. Nada muda na cobrança.'); },
  perguntar: () => { const p = $('#pergunta').value.trim(); if (p.length < 3) return $('#pergunta').focus(); const r = $('#resposta'); r.hidden = false; r.textContent = 'Pensando…'; if (window.veltriaIA) window.veltriaIA(p).then((t) => { r.textContent = t; }); else setTimeout(() => { r.textContent = responder(p); }, 800); },
};
function responder(p) {
  const q = semAcento(p), cobrar = cobrarAgora(), soma = cobrar.reduce((t, x) => t + x.e.valor, 0);
  const lucros = db.obras.map((o) => ({ o, l: valorObra(o) - gastoObra(o), m: (valorObra(o) - gastoObra(o)) / (valorObra(o) || 1) })).sort((a, b) => b.m - a.m);
  const atrasadas = db.obras.filter((o) => o.status === 'andamento' && o.entrega < 0);
  let t;
  if (/receb|cobrar|devend|falta/.test(q)) t = soma ? `Você tem ${real(soma)} pronto para cobrar agora:\n${cobrar.map(({ o, e }) => `• ${e.nome} (${o.nome}): ${real(e.valor)}`).join('\n')}\n\nCobre hoje: etapa pronta e não cobrada vira esquecimento.` : 'Nada pendente: todas as etapas prontas já foram pagas.';
  else if (/lucro|margem|rend/.test(q)) t = `A obra com melhor margem é "${lucros[0].o.nome}" (${Math.round(lucros[0].m * 100)}%, sobra de ${real(lucros[0].l)}).\nA mais apertada é "${lucros[lucros.length - 1].o.nome}" (${Math.round(lucros[lucros.length - 1].m * 100)}%). Confira se todos os gastos dela foram lançados.`;
  else if (/atras|prazo|entrega/.test(q)) t = atrasadas.length ? `Atrasada: ${atrasadas.map((o) => `${o.nome} (era ${quando(o.entrega)})`).join(', ')}. Mande uma foto do andamento e uma nova data para o cliente hoje.` : 'Nenhuma obra atrasada. As próximas entregas: ' + db.obras.filter((o) => o.status === 'andamento').map((o) => `${o.nome} (${quando(o.entrega)})`).join(', ') + '.';
  else if (/mensag|educa|cobran/.test(q)) t = 'Mensagem pronta:\n\n"Olá! A etapa da sua obra ficou pronta e já pode conferir pelas fotos no link. Quando puder, o PIX é ' + db.empresa.pix + '. Qualquer dúvida, estou à disposição. Obrigado!"';
  else if (/orcament|fecha/.test(q)) t = 'Três dicas para fechar mais:\n1. Mande o orçamento no mesmo dia da visita.\n2. Separe material e mão de obra: o cliente entende o preço.\n3. Divida em etapas (entrada, meio e entrega): fica mais fácil de aprovar.';
  else t = `Resumo agora: ${db.obras.filter((o) => o.status === 'andamento').length} obras rodando, ${real(soma)} para cobrar, ${atrasadas.length} atrasada(s).`;
  return `${t}\n\n(Resposta de exemplo da demonstração.)`;
}
function calcular(sec) {
  const v = (k) => numero(sec.querySelector(`[data-v="${k}"]`).value), out = sec.querySelector('[data-res]');
  const tipo = sec.dataset.calc;
  if (tipo === 'piso') { const area = v('a') * v('b'), comPerda = area * 1.1, cx = Math.ceil(comPerda / (v('cx') || 1)); out.innerHTML = `Área ${area.toLocaleString('pt-BR')} m² + 10% de perda = <b>${cx} caixas</b> (${(cx * v('cx')).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m²). Argamassa: uns ${Math.ceil(area / 4)} sacos de 20 kg.`; }
  if (tipo === 'tinta') { const l = v('a') * v('d') / (v('r') || 1); out.innerHTML = `<b>${Math.ceil(l)} litros</b>: ${Math.floor(l / 18)} lata(s) de 18 L ${l % 18 > 0 ? `e ${Math.ceil((l % 18) / 3.6)} galão(ões) de 3,6 L` : ''}.`; }
  if (tipo === 'concreto') { const m3 = v('a') * v('e') / 100; out.innerHTML = `<b>${m3.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m³</b> de concreto. Traço 1:2:3: uns ${Math.ceil(m3 * 7)} sacos de cimento, ${(m3 * 0.5).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m³ de areia e ${(m3 * 0.75).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m³ de brita.`; }
  if (tipo === 'tijolo') { const n = Math.ceil(v('a') * Number(sec.querySelector('[data-v="t"]').value) * 1.05); out.innerHTML = `<b>${n} unidades</b> (já com 5% de quebra).`; }
}

document.addEventListener('click', (e) => {
  const ir = e.target.closest('[data-ir]'); if (ir) { location.hash = `#${ir.dataset.ir}`; return; }
  const p = e.target.closest('[data-pergunta]'); if (p) { $('#pergunta').value = p.dataset.pergunta; ACOES.perguntar(); return; }
  const a = e.target.closest('[data-acao]'); if (!a) return;
  const f = ACOES[a.dataset.acao]; if (!f) return;
  if (f(a.dataset) !== true && a.tagName === 'A') e.preventDefault();
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.closest('[data-calc]')) calcular(t.closest('[data-calc]'));
  const box = t.closest('[data-orc]');
  if (box) {
    const r = db.orcamentos.find((x) => x.id === box.dataset.orc);
    if (t.dataset.orcCampo) r[t.dataset.orcCampo] = ['mao', 'desconto'].includes(t.dataset.orcCampo) ? numero(t.value) : t.value;
    const li = t.closest('[data-k]'); if (li && t.dataset.campo) r.itens[Number(li.dataset.k)][t.dataset.campo] = ['qtd', 'preco'].includes(t.dataset.campo) ? numero(t.value) : t.value;
    salvar(); box.querySelector('[data-total]').textContent = real(totalOrc(r));
    const z = box.querySelector('[data-acao="enviar-orc"]'); if (z) z.href = zap(cliente(r.cli).tel, textoOrc(r));
  }
  if (t.dataset.eu) { db.eu[t.dataset.eu] = t.value; salvar(); pintarTopo(); }
  if (t.dataset.emp) { db.empresa[t.dataset.emp] = t.value; salvar(); pintarTopo(); }
});
document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.dataset.pode) { const [id, k] = t.dataset.pode.split(':'); db.equipe.find((x) => x.id === id).pode[k] = t.checked; salvar(); aviso('Permissão salva'); }
  if (t.dataset.orcCampo === 'cli') mostrar();
  if (t.dataset.foto && t.files.length) {
    const o = obraPor(t.dataset.foto), fotos = [];
    for (const arq of [...t.files].slice(0, 4)) { try { fotos.push(await fotoPequena(arq)); } catch { /* arquivo não é imagem */ } }
    formulario('Foto no diário', `<div class="fotos" style="margin-bottom:12px">${fotos.map((f) => `<img src="${f}" alt="">`).join('')}</div><label class="campo">O que aparece na foto<textarea name="t" placeholder="Ex.: reboco da parede da sala pronto"></textarea></label>`, 'Salvar no diário', (f) => { o.diario.unshift({ id: novoId(), dia: 0, texto: f.get('t') || 'Andamento da obra', fotos }); aviso('Registrado. O cliente já vê no link da obra.'); });
  }
});
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = exemplo(); location.hash = '#obras'; mostrar(); aviso('Demonstração recomeçada'); });
// dentro do celular da demonstração, sem a faixa de cima; fora dela, instala como app e funciona sem internet
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
