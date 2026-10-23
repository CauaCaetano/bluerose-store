// Veltria Oficina Essencial · app de celular do mecânico autônomo: "o pátio visto de cima".
// Cada box mostra o carro que está nele e em que pé está: orçamento, aprovado, no serviço, pronto.
// Entrada do carro (km, combustível, avarias, fotos), orçamento que o cliente aprova item por item pelo WhatsApp,
// entrega com cobrança no PIX e garantia, aviso de revisão, caixa do dia, assistente, painel do dono e assinatura.
// Dados de exemplo neste aparelho (?novo recomeça).

const CHAVE = 'veltria-oficina-essencial-v1';
const din = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const t = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sem = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const num = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const cod = () => Math.random().toString(36).slice(2, 8);
const q = (s) => document.querySelector(s);
const dia = (o) => { if (o === 0) return 'hoje'; if (o === -1) return 'ontem'; const d = new Date(); d.setDate(d.getDate() + o); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''); };
const zap = (tel, m) => `https://wa.me/55${String(tel).replace(/\D/g, '')}?text=${encodeURIComponent(m)}`;
const ETAPAS = [['orcamento', 'Orçamento', 'orc'], ['aprovado', 'Aprovado', 'apr'], ['servico', 'No serviço', 'srv'], ['pronto', 'Pronto', 'pronto']];

// ------------------------------------------------------------------ oficina de exemplo
function oficina() {
  const it = (l) => l.map(([tipo, desc, qtd, valor, aprovado]) => ({ id: cod(), tipo, desc, qtd, valor, aprovado }));
  const os = [
    { id: 'o1', num: 318, placa: 'QWE4F21', modelo: 'Fiat Strada 2021', cor: '#c0392b', cliente: 'Marcelo Andrade', tel: '31988112233', km: 61200, comb: 35, entrada: -1, box: 1, status: 'servico', avarias: ['Risco na porta direita'], fotos: ['Painel com luz de injeção'], garantia: 90,
      itens: it([['peça', 'Bobina de ignição', 1, 289, true], ['peça', 'Jogo de velas', 1, 148, true], ['serviço', 'Diagnóstico com scanner', 1, 120, true], ['serviço', 'Troca de bobina e velas', 1, 160, true]]), pago: false },
    { id: 'o2', num: 319, placa: 'RTA2B89', modelo: 'Honda Civic 2017', cor: '#2c3e50', cliente: 'Patrícia Lemos', tel: '31991224455', km: 98400, comb: 60, entrada: 0, box: 2, status: 'orcamento', avarias: [], fotos: [], garantia: 90,
      itens: it([['peça', 'Pastilhas de freio dianteiras', 1, 238, null], ['peça', 'Discos de freio (par)', 1, 520, null], ['serviço', 'Troca de pastilhas e discos', 1, 220, null], ['peça', 'Fluido de freio DOT 4', 1, 48, null]]), pago: false },
    { id: 'o3', num: 316, placa: 'PXL8C04', modelo: 'VW Gol 2014', cor: '#7f8c8d', cliente: 'Seu Nonato', tel: '31987773322', km: 154300, comb: 15, entrada: -2, box: 3, status: 'pronto', avarias: ['Para-choque trincado'], fotos: ['Embreagem antiga'], garantia: 90,
      itens: it([['peça', 'Kit de embreagem', 1, 690, true], ['serviço', 'Troca de embreagem', 1, 480, true], ['peça', 'Óleo de câmbio', 2, 52, true]]), pago: false },
    { id: 'o4', num: 320, placa: 'SBC1D77', modelo: 'Hyundai HB20 2020', cor: '#16a085', cliente: 'Ana Clara Dias', tel: '31996665544', km: 42100, comb: 80, entrada: 0, box: 0, status: 'aprovado', avarias: [], fotos: [], garantia: 90,
      itens: it([['peça', 'Óleo 5W30 sintético (4 L)', 1, 196, true], ['peça', 'Filtro de óleo', 1, 38, true], ['peça', 'Filtro de ar', 1, 64, false], ['serviço', 'Troca de óleo e filtros', 1, 70, true]]), pago: false },
    { id: 'o5', num: 315, placa: 'OKP3E10', modelo: 'Toyota Corolla 2019', cor: '#34495e', cliente: 'Dr. Flávio Rocha', tel: '31993338877', km: 71000, comb: 50, entrada: -4, box: null, status: 'entregue', avarias: [], fotos: [], garantia: 90, entregue: -1,
      itens: it([['serviço', 'Alinhamento e balanceamento', 1, 180, true], ['peça', 'Pneu 205/55 R16', 2, 465, true]]), pago: true, forma: 'Pix' },
  ];
  const carros = [
    { placa: 'OKP3E10', modelo: 'Toyota Corolla 2019', cliente: 'Dr. Flávio Rocha', tel: '31993338877', revisaoKm: 80000, revisaoDia: 120 },
    { placa: 'MNT5G22', modelo: 'Chevrolet Onix 2018', cliente: 'Juliana Prates', tel: '31994441122', revisaoKm: 70000, revisaoDia: -6 },
    { placa: 'HJK7H45', modelo: 'Renault Sandero 2016', cliente: 'Wagner Costa', tel: '31992228899', revisaoKm: 110000, revisaoDia: 3 },
  ];
  return { oficina: { nome: 'Auto Mecânica do Tião', dono: 'Sebastião Moreira', pix: '31999990000', boxes: 4 }, eu: { nome: 'Sebastião Moreira', letra: 'normal', garantia: 90, msgPronto: 'Olá, {cliente}! O seu {carro} está pronto. Total: {valor}. Pode vir buscar até as 18h. Pix: {pix}.' },
    os, carros, proxOs: 321, caixa: [{ dia: 0, desc: 'Compra de peças: bobina e velas', valor: -437, forma: 'Pix' }], equipe: [{ id: 'e1', nome: 'Gabriel (ajudante)', pode: { valores: false, os: true, caixa: false } }], plano: 'basico',
    assinatura: { valor: 69, status: 'ativa', renova: true, proxima: 17, pagos: [-13, -43, -73] }, conversa: [] };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || oficina(); } catch { return oficina(); } })();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
const grava = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { aviso('Memória do celular cheia: apague fotos antigas.'); } };
const osPor = (id) => db.os.find((o) => o.id === id);
const totalOs = (o, soAprovado = false) => o.itens.filter((i) => !soAprovado || i.aprovado !== false).reduce((s, i) => s + i.qtd * i.valor, 0);
const etapa = (o) => ETAPAS.find((e) => e[0] === o.status) || ['entregue', 'Entregue', ''];

function aviso(x) { const a = document.createElement('div'); a.className = 'aviso'; a.textContent = x; q('#avisos').append(a); setTimeout(() => a.remove(), 3200); }
function folha(html, depois) {
  const v = document.createElement('div'); v.className = 'veu'; v.innerHTML = `<div class="folha" role="dialog" aria-modal="true">${html}</div>`;
  const ant = document.activeElement; document.body.append(v);
  const fecha = () => { v.remove(); ant?.focus?.(); };
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-fecha]')) fecha(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); });
  setTimeout(() => (v.querySelector('input, select, textarea, button') || v).focus(), 40);
  depois?.(v.querySelector('.folha'), fecha);
}
function formulario(titulo, campos, ok, fazer) { folha(`<h2>${titulo}</h2><form>${campos}<div class="linha"><button class="bt cheio">${ok}</button><button type="button" class="bt" data-fecha>Cancelar</button></div></form>`, (f, fecha) => f.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); if (fazer(new FormData(e.target)) !== false) { grava(); fecha(); mostra(); } })); }
const cartaoCarro = (o) => { const [, nome, cls] = etapa(o); return `<a class="carro" href="#os/${o.id}" style="--cor:${o.cor}"><span class="placa">${t(o.placa)}</span><b>${t(o.modelo)}</b><small>${t(o.cliente)}</small><br><span class="st ${cls}">${nome}</span> <small>${din(totalOs(o, true))}</small></a>`; };

// ------------------------------------------------------------------ telas
const T = {
  patio() {
    const ativos = db.os.filter((o) => o.status !== 'entregue'), rua = ativos.filter((o) => !o.box), prontos = ativos.filter((o) => o.status === 'pronto'), esperando = ativos.filter((o) => o.status === 'orcamento');
    return `<h1>Pátio</h1><p class="sub">${ativos.length} carros na oficina · ${prontos.length} pronto(s) para entregar · ${esperando.length} esperando o cliente aprovar.</p>
      <div class="patio" role="list" aria-label="Boxes da oficina">${Array.from({ length: db.oficina.boxes }, (_, i) => { const o = ativos.find((x) => x.box === i + 1); return o ? `<div class="box" role="listitem"><span class="nbox">BOX ${i + 1}</span>${cartaoCarro(o)}</div>` : `<a class="box livre" role="listitem" href="#nova"><span class="nbox">BOX ${i + 1}</span>Livre · pôr carro</a>`; }).join('')}</div>
      ${rua.length ? `<div class="rua"><h2>Esperando box (na rua)</h2>${rua.map(cartaoCarro).join('')}</div>` : ''}
      ${prontos.length ? `<h2>Avisar quem já pode buscar</h2><ul class="lista">${prontos.map((o) => `<li><div class="cresce"><b>${t(o.cliente)}</b><small>${t(o.modelo)} · ${din(totalOs(o, true))}</small></div><a class="bt peq cobre" target="_blank" rel="noopener" href="${zap(o.tel, msgPronto(o))}">Avisar</a></li>`).join('')}</ul>` : ''}`;
  },
  os(id) {
    const o = osPor(id); if (!o) return T.patio();
    const k = ETAPAS.findIndex((e) => e[0] === o.status), tot = totalOs(o, true), pend = o.itens.filter((i) => i.aprovado === null).length;
    return `<a href="#patio">← Pátio</a><div class="os-cab" style="margin-top:6px"><div><span class="placa">${t(o.placa)}</span><h1 style="margin-top:6px">${t(o.modelo)}</h1><p class="sub">${t(o.cliente)} · OS nº ${o.num} · entrou ${dia(o.entrada)}${o.box ? ` · box ${o.box}` : ''}</p></div></div>
      <div class="etapas">${ETAPAS.map((e, i) => `<span class="${i <= k ? 'on' : ''}">${e[1]}</span>`).join('')}</div>
      <div class="cartao"><div class="dupla"><div><span class="mini">Quilometragem</span><div class="v">${o.km.toLocaleString('pt-BR')} km</div></div><div><span class="mini">Combustível</span><div class="medidor-comb"><div class="tanque"><i style="width:${o.comb}%"></i></div><b class="v">${o.comb}%</b></div></div></div>
        ${o.avarias.length ? `<p class="mini" style="margin:10px 0 4px">Avarias na entrada</p><div class="avarias">${o.avarias.map((a) => `<span>${t(a)}</span>`).join('')}</div>` : ''}
        ${o.fotos.length ? `<p class="mini" style="margin:10px 0 4px">Fotos</p><div class="fotos">${o.fotos.map((f) => (f.startsWith('data:') ? `<img src="${f}" alt="Foto do carro">` : `<span>${t(f)}</span>`)).join('')}</div>` : ''}</div>
      <h2>Orçamento</h2><div class="cartao">${o.itens.map((i) => `<div class="item-os"><div>${t(i.desc)}<small>${i.tipo} · ${i.qtd} × ${din(i.valor)}</small></div><span class="ap ${i.aprovado === true ? 'sim' : i.aprovado === false ? 'nao' : 'esp'}">${i.aprovado === true ? 'aprovado' : i.aprovado === false ? 'recusado' : 'esperando'}</span><b class="v">${din(i.qtd * i.valor)}</b></div>`).join('')}
        <button type="button" class="bt peq" style="margin-top:10px" data-acao="item" data-o="${o.id}">+ Peça ou serviço</button>
        <div class="total-os"><span>Total aprovado</span><span>${din(tot)}</span></div></div>
      <div class="linha">${o.status === 'orcamento' ? `<a class="bt cobre" target="_blank" rel="noopener" href="${zap(o.tel, msgOrc(o))}">Mandar orçamento</a><button type="button" class="bt" data-acao="simular-aprovacao" data-o="${o.id}">Ver o que o cliente vê</button>${pend ? '' : `<button type="button" class="bt cheio" data-acao="avancar" data-o="${o.id}">Aprovado</button>`}`
        : o.status === 'aprovado' ? `<button type="button" class="bt cheio" data-acao="avancar" data-o="${o.id}">Começar o serviço</button>`
        : o.status === 'servico' ? `<button type="button" class="bt cheio" data-acao="avancar" data-o="${o.id}">Serviço pronto</button><label class="bt" style="cursor:pointer">📷 Foto do serviço<input type="file" accept="image/*" capture="environment" hidden data-foto="${o.id}"></label>`
        : o.status === 'pronto' ? `<a class="bt cobre" target="_blank" rel="noopener" href="${zap(o.tel, msgPronto(o))}">Avisar o cliente</a><button type="button" class="bt cheio" data-acao="entregar" data-o="${o.id}">Entregar e receber</button>`
        : `<span class="st apr">Entregue ${dia(o.entregue)} · ${o.forma}</span><a class="bt peq" target="_blank" rel="noopener" href="${zap(o.tel, `Olá, ${o.cliente.split(' ')[0]}! Segue a garantia do serviço no seu ${o.modelo}: ${o.garantia} dias, até ${dia(o.entregue + o.garantia)}. Obrigado pela confiança! ${db.oficina.nome}`)}">Mandar garantia</a>`}</div>
      ${o.status !== 'entregue' && !o.box ? `<button type="button" class="bt peq" data-acao="por-box" data-o="${o.id}">Pôr num box</button>` : ''}`;
  },
  nova() {
    return `<h1>Entrada de carro</h1><p class="sub">Registre como o carro chegou: evita discussão na entrega.</p>
      <form id="f-entrada"><label class="campo">Placa<input class="placa-in" name="placa" required maxlength="8" placeholder="ABC1D23" autocapitalize="characters"></label>
      <div class="dupla"><label class="campo">Carro<input name="modelo" required placeholder="Ex.: Fiat Uno 2015"></label><label class="campo">Km<input name="km" inputmode="numeric" required></label></div>
      <div class="dupla"><label class="campo">Cliente<input name="cliente" required></label><label class="campo">WhatsApp<input name="tel" inputmode="tel" required></label></div>
      <label class="campo">Combustível: <output id="comb-v">50%</output><input type="range" name="comb" min="0" max="100" step="5" value="50" oninput="document.getElementById('comb-v').textContent=this.value+'%'"></label>
      <p class="mini" style="margin:0 0 6px">Avarias que já tinha</p><div class="checks">${['Risco na lataria', 'Amassado', 'Para-choque trincado', 'Vidro trincado', 'Pneu careca', 'Estepe faltando', 'Luz de injeção acesa'].map((a) => `<label><input type="checkbox" name="avaria" value="${a}">${a}</label>`).join('')}</div>
      <label class="campo">O que o cliente reclamou<textarea name="queixa" placeholder="Ex.: barulho no freio ao parar"></textarea></label>
      <label class="bt largo" style="cursor:pointer;margin-bottom:10px">📷 Fotos do carro<input type="file" accept="image/*" capture="environment" multiple hidden id="fotos-entrada"></label><div class="fotos" id="previa-fotos" style="margin-bottom:12px"></div>
      <button class="bt cheio largo">Abrir a ordem de serviço</button></form>`;
  },
  clientes() {
    const vencendo = db.carros.filter((c) => c.revisaoDia <= 7);
    return `<h1>Carros e clientes</h1><p class="sub">Busque pela placa. Lembre a revisão e o cliente volta.</p>
      <label class="campo"><input id="busca-placa" class="placa-in" placeholder="Buscar placa" autocapitalize="characters"></label>
      ${vencendo.length ? `<h2>Revisão chegando</h2><ul class="lista">${vencendo.map((c) => `<li><div class="cresce"><b>${t(c.cliente)}</b><small>${t(c.modelo)} · ${c.revisaoDia < 0 ? `revisão atrasada ${-c.revisaoDia} dias` : `revisão em ${c.revisaoDia} dias`}</small></div><a class="bt peq cobre" target="_blank" rel="noopener" href="${zap(c.tel, `Olá, ${c.cliente.split(' ')[0]}! Aqui é da ${db.oficina.nome}. A revisão do seu ${c.modelo} está chegando. Quer agendar? Tenho horário esta semana.`)}">Lembrar</a></li>`).join('')}</ul>` : ''}
      <h2>Histórico</h2><ul class="lista" id="lista-carros">${carrosTodos().map((c) => `<li data-placa="${t(c.placa)}"><div class="cresce"><span class="placa">${t(c.placa)}</span><b>${t(c.modelo)}</b><small>${t(c.cliente)} · ${c.visitas} visita(s) · ${din(c.gasto)}</small></div><a class="bt peq" target="_blank" rel="noopener" href="${zap(c.tel, `Olá, ${c.cliente.split(' ')[0]}!`)}">WhatsApp</a></li>`).join('')}</ul>`;
  },
  caixa() {
    const hoje = db.os.filter((o) => o.pago && o.entregue === 0), entrou = hoje.reduce((s, o) => s + totalOs(o, true), 0) + db.caixa.filter((c) => c.dia === 0 && c.valor > 0).reduce((s, c) => s + c.valor, 0), saiu = -db.caixa.filter((c) => c.dia === 0 && c.valor < 0).reduce((s, c) => s + c.valor, 0);
    const aReceber = db.os.filter((o) => o.status === 'pronto').reduce((s, o) => s + totalOs(o, true), 0), mes = db.os.filter((o) => o.pago).reduce((s, o) => s + totalOs(o, true), 0);
    return `<h1>Caixa</h1><p class="sub">Quanto entrou, quanto saiu e o que falta receber dos carros prontos.</p>
      <div class="quadros"><div class="cobre"><small>Entrou hoje</small><b>${din(entrou)}</b></div><div><small>Saiu hoje</small><b>${din(saiu)}</b></div><div><small>A receber (prontos)</small><b>${din(aReceber)}</b></div><div><small>Serviços no mês</small><b>${din(mes)}</b></div></div>
      <div class="linha"><button type="button" class="bt cheio" data-acao="lancar" data-v="saida">Lançar saída</button><button type="button" class="bt" data-acao="lancar" data-v="entrada">Lançar entrada</button></div>
      <h2>Movimento</h2><ul class="lista">${[...db.os.filter((o) => o.pago).map((o) => ({ dia: o.entregue, desc: `OS ${o.num} · ${o.modelo}`, valor: totalOs(o, true), forma: o.forma })), ...db.caixa].sort((a, b) => b.dia - a.dia).map((m) => `<li><div class="cresce"><b>${t(m.desc)}</b><small>${dia(m.dia)} · ${t(m.forma || '')}</small></div><span class="v" style="color:${m.valor < 0 ? 'var(--perigo)' : 'var(--ok)'}">${m.valor < 0 ? '−' : '+'} ${din(Math.abs(m.valor))}</span></li>`).join('')}</ul>`;
  },
  mais() {
    const l = [['ia', 'Assistente', 'pergunte sobre a oficina, peça mensagens prontas'], ['assinatura', 'Minha assinatura', estAss()], ['dono', 'Painel do dono', 'ajudantes e o que cada um vê'], ['config', 'Configurações', 'nome da oficina, PIX, garantia, mensagens']];
    return `<h1>Mais</h1><ul class="lista">${l.map(([k, n, s]) => `<li><a class="cresce" href="#${k}"><b>${n}</b><small>${t(s)}</small></a><span aria-hidden="true">›</span></li>`).join('')}</ul>`;
  },
  ia() {
    const sug = ['Quanto vou receber hoje?', 'Quem eu aviso que o carro está pronto?', 'Quais clientes chamar para revisão?', 'Escreva uma mensagem explicando o orçamento do Civic', 'Quanto eu ganhei no mês?'];
    return `<h1>Assistente</h1><p class="sub">Ele vê a oficina (nunca dados pessoais além do primeiro nome). Na versão contratada: 20 perguntas grátis por dia. Aqui as respostas são de exemplo.</p>
      <div class="conversa">${(db.conversa.length ? db.conversa : [{ ia: 1, t: 'Fala, Tião! Posso dizer quem avisar, quanto entra hoje ou escrever mensagens para os clientes.' }]).map((m) => `<div class="fala ${m.ia ? 'ia' : 'eu'}">${t(m.t)}</div>`).join('')}</div>
      <div class="chips">${sug.map((s) => `<button type="button" data-sug="${t(s)}">${t(s)}</button>`).join('')}</div>
      <form id="f-ia" class="dupla" style="grid-template-columns:1fr auto"><input id="q-ia" style="min-height:50px;border:2px solid var(--areia);border-radius:12px;padding:0 12px" placeholder="Sua pergunta" aria-label="Sua pergunta"><button class="bt cheio">Enviar</button></form>`;
  },
  assinatura() {
    const a = db.assinatura, quadro = a.status === 'vencida' ? `<div class="cartao" style="border-color:var(--perigo)"><b style="color:var(--perigo)">Assinatura vencida</b><p class="sub" style="margin:4px 0 0">O pagamento de ${din(a.valor)} não foi aprovado. Seus carros e orçamentos estão guardados.</p></div>`
      : a.renova ? `<div class="cartao escuro"><span class="mini" style="color:var(--salvia)">Assinatura ativa</span><div class="v" style="font-size:1.4rem">Assinatura · ${din(a.valor)}/mês</div><span class="mini" style="color:var(--salvia)">próxima cobrança ${dia(a.proxima)}</span></div>`
      : `<div class="cartao"><b>Assinatura cancelada</b><p class="sub" style="margin:4px 0 0">Você usa o app até ${dia(a.proxima)}. Nada mais é cobrado.</p></div>`;
    return `<a href="#mais">← Mais</a><h1>Minha assinatura</h1><p class="sub">A mesma da sua conta no site. Sem fidelidade.</p>${quadro}
      <div class="linha">${a.status === 'vencida' ? '<button type="button" class="bt cobre" data-acao="pagar">Pagar aqui no app</button><a class="bt" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a>' : a.renova ? '<a class="bt peq" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Trocar cartão ou plano</a><button type="button" class="bt peq" data-acao="cancelar">Cancelar</button>' : '<button type="button" class="bt cheio" data-acao="reativar">Reativar</button>'}</div>
      <h2>Pagamentos</h2><ul class="lista">${[...a.pagos.map((d) => ({ d, ok: true })), ...(a.recusas || []).map((d) => ({ d, ok: false }))].sort((x, y) => y.d - x.d).map((p) => `<li><div class="cresce"><b>${din(a.valor)}</b><small>${dia(p.d)}</small></div><span class="st ${p.ok ? 'apr' : 'orc'}">${p.ok ? 'pago' : 'recusado'}</span></li>`).join('')}</ul>`;
  },
  dono() {
    const P = [['os', 'Abrir e mexer nas OS'], ['valores', 'Ver valores e lucro'], ['caixa', 'Lançar no caixa']];
    return `<a href="#mais">← Mais</a><h1>Painel do dono</h1><p class="sub">Quem trabalha com você entra pelo celular dele e só faz o que você deixar.</p>
      <div class="quadros"><div class="cobre"><small>Plano</small><b>Assinatura</b></div><div><small>Equipe</small><b>${db.equipe.length + 1}</b></div></div>
      ${db.equipe.map((p) => `<div class="cartao"><div style="display:flex;justify-content:space-between;align-items:center"><b>${t(p.nome)}</b><button type="button" class="bt peq" data-acao="tirar" data-id="${p.id}">Tirar</button></div>${P.map(([k, n]) => `<label style="display:flex;gap:10px;align-items:center;margin-top:8px"><input type="checkbox" data-pode="${p.id}:${k}" ${p.pode[k] ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--cobre)">${n}</label>`).join('')}</div>`).join('')}
      <button type="button" class="bt cheio largo" data-acao="convidar">+ Chamar ajudante ou mecânico</button>
      <h2>Plano</h2><div class="linha"><button type="button" class="bt ${db.plano === 'basico' ? 'cheio' : ''}" data-acao="plano" data-v="basico">Assinatura · R$ 69/mês</button></div><p class="mini">Equipe sem limite, histórico de quem fez o quê e até 10 empresas. Anual com 20% a menos.</p>`;
  },
  config() {
    const e = db.eu;
    return `<a href="#mais">← Mais</a><h1>Configurações</h1><label class="campo">Seu nome<input data-eu="nome" value="${t(e.nome)}"></label><label class="campo">Nome da oficina<input data-of="nome" value="${t(db.oficina.nome)}"></label>
      <div class="dupla"><label class="campo">Chave PIX<input data-of="pix" value="${t(db.oficina.pix)}"></label><label class="campo">Quantos boxes<select data-of="boxes">${[2, 3, 4, 6].map((n) => `<option ${db.oficina.boxes == n ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <label class="campo">Garantia dos serviços (dias)<select data-eu="garantia">${[30, 90, 180].map((n) => `<option ${e.garantia == n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="campo">Mensagem de carro pronto<textarea data-eu="msgPronto">${t(e.msgPronto)}</textarea><small class="mini">Use {cliente}, {carro}, {valor} e {pix}.</small></label>
      <label class="campo">Letras<select data-eu="letra"><option value="normal" ${e.letra === 'normal' ? 'selected' : ''}>Normal</option><option value="grande" ${e.letra === 'grande' ? 'selected' : ''}>Grande</option></select></label>`;
  },
};
const estAss = () => { const a = db.assinatura; return a.status === 'vencida' ? 'vencida: pague para continuar' : a.renova ? `ativa · próxima ${dia(a.proxima)}` : `cancelada · usa até ${dia(a.proxima)}`; };
const msgPronto = (o) => db.eu.msgPronto.replace('{cliente}', o.cliente.split(' ')[0]).replace('{carro}', o.modelo).replace('{valor}', din(totalOs(o, true))).replace('{pix}', db.oficina.pix);
const msgOrc = (o) => `Olá, ${o.cliente.split(' ')[0]}! Orçamento do seu ${o.modelo} (OS ${o.num}):\n\n${o.itens.map((i) => `• ${i.desc}: ${din(i.qtd * i.valor)}`).join('\n')}\n\nTotal: ${din(totalOs(o))}\nAprove item por item pelo link: https://bluerose-store.com/os/${o.id}\n${db.oficina.nome}`;
function carrosTodos() {
  const m = {};
  db.os.forEach((o) => { m[o.placa] ||= { placa: o.placa, modelo: o.modelo, cliente: o.cliente, tel: o.tel, visitas: 0, gasto: 0 }; m[o.placa].visitas++; if (o.pago) m[o.placa].gasto += totalOs(o, true); });
  db.carros.forEach((c) => { m[c.placa] ||= { ...c, visitas: 1, gasto: 0 }; });
  return Object.values(m);
}

// ------------------------------------------------------------------ navegação, bloqueio e pagamento
const tela = q('#tela');
function mostra() {
  const [r, a] = (location.hash.slice(1) || 'patio').split('/');
  tela.innerHTML = (T[r] || T.patio)(a);
  const aba = { os: 'patio', ia: 'mais', assinatura: 'mais', dono: 'mais', config: 'mais' }[r] || r;
  document.querySelectorAll('.rodape-nav a').forEach((x) => (x.dataset.aba === aba ? x.setAttribute('aria-current', 'page') : x.removeAttribute('aria-current')));
  q('#nome-oficina').textContent = db.oficina.nome; q('#sub-oficina').textContent = `${db.eu.nome} · mecânico`;
  document.documentElement.style.fontSize = db.eu.letra === 'grande' ? '112%' : '';
  if (!db.assinatura.renova && db.assinatura.status !== 'vencida' && r !== 'assinatura') tela.insertAdjacentHTML('afterbegin', `<p class="cartao" style="padding:8px 12px;background:#f3dfcf;border-color:var(--cobre)">Assinatura cancelada: você usa até ${dia(db.assinatura.proxima)}. <a href="#assinatura">Reativar</a></p>`);
  trava(r);
  document.title = `${{ patio: 'Pátio', os: 'Ordem de serviço', nova: 'Entrada', clientes: 'Carros', caixa: 'Caixa', mais: 'Mais', ia: 'Assistente', assinatura: 'Minha assinatura', dono: 'Painel do dono', config: 'Configurações' }[r] || 'Pátio'} · Veltria Oficina Essencial`;
}
addEventListener('hashchange', () => { mostra(); tela.focus({ preventScroll: true }); scrollTo(0, 0); });
function trava(r) {
  document.querySelector('.trava')?.remove();
  if (db.assinatura.status !== 'vencida' || r === 'assinatura') return;
  const v = document.createElement('div'); v.className = 'veu trava';
  v.innerHTML = `<div class="folha" role="alertdialog" aria-modal="true" aria-labelledby="tr-t"><h2 id="tr-t">Sua assinatura venceu</h2><p class="sub">O pagamento não foi aprovado. Os carros, orçamentos e o histórico estão guardados: renove para continuar.</p><div style="display:grid;gap:8px"><button type="button" class="bt cobre largo" data-acao="pagar">Pagar aqui no app</button><a class="bt largo" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a><a class="bt largo" href="#assinatura" style="border-style:dashed">Ver minha assinatura</a></div></div>`;
  document.body.append(v);
}
function pagar() {
  const a = db.assinatura;
  folha(`<h2>Pagar ${din(a.valor)}</h2><p class="sub">PIX libera na hora. Cartão abre o pagamento seguro do Mercado Pago.</p><div class="qr-pix" aria-hidden="true"></div><label class="campo">PIX copia e cola<input readonly value="00020126580014BR.GOV.BCB.PIX0136oficina-${Date.now().toString(16)}5303986540${a.valor}.005802BR"></label>
    <div class="linha"><button type="button" class="bt peq" data-copia>Copiar código</button><a class="bt peq" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Pagar com cartão</a></div><div class="linha"><button type="button" class="bt cobre" data-ok>Simular pagamento aprovado</button><button type="button" class="bt" data-fecha>Voltar</button></div>`, (f, fecha) => f.addEventListener('click', (e) => {
    if (e.target.closest('[data-copia]')) { navigator.clipboard?.writeText(f.querySelector('input').value).catch(() => {}); aviso('Código PIX copiado'); }
    if (e.target.closest('[data-ok]')) { a.status = 'ativa'; a.renova = true; a.proxima = 30; a.pagos.push(0); grava(); fecha(); mostra(); aviso('Pagamento aprovado. Bora trabalhar!'); }
  }));
}
function responde(p) {
  const x = sem(p), prontos = db.os.filter((o) => o.status === 'pronto');
  if (/receb|hoje|entra/.test(x)) return `Hoje: ${din(prontos.reduce((s, o) => s + totalOs(o, true), 0))} dos carros prontos (${prontos.map((o) => o.modelo).join(', ') || 'nenhum'}). Avise os clientes cedo para retirarem ainda hoje.`;
  if (/avis|pronto|buscar/.test(x)) return prontos.length ? prontos.map((o) => `• ${o.cliente}: ${o.modelo}, ${din(totalOs(o, true))}`).join('\n') : 'Nenhum carro pronto ainda.';
  if (/revis|chamar|voltar/.test(x)) return db.carros.filter((c) => c.revisaoDia <= 7).map((c) => `• ${c.cliente} (${c.modelo}): ${c.revisaoDia < 0 ? 'atrasada' : `em ${c.revisaoDia} dias`}`).join('\n') || 'Ninguém com revisão perto.';
  if (/explic|civic|orcament/.test(x)) return 'Mensagem pronta:\n\n"Patrícia, as pastilhas do seu Civic estão no fim e os discos já estão abaixo da espessura mínima: se trocar só as pastilhas, elas gastam rápido e o freio perde força. Por isso recomendo os dois juntos. Se preferir, dá para aprovar só as pastilhas agora pelo link."';
  if (/mes|ganh|lucro/.test(x)) return `No mês: ${din(db.os.filter((o) => o.pago).reduce((s, o) => s + totalOs(o, true), 0))} em serviços entregues e pagos.`;
  return `Agora: ${db.os.filter((o) => o.status !== 'entregue').length} carros na oficina, ${prontos.length} prontos.`;
}

// ------------------------------------------------------------------ ações
const A = {
  item: (d) => formulario('Peça ou serviço', '<div class="dupla"><label class="campo">Tipo<select name="t"><option>peça</option><option>serviço</option></select></label><label class="campo">Qtd<input name="q" inputmode="numeric" value="1"></label></div><label class="campo">Descrição<input name="d" required></label><label class="campo">Valor de cada (R$)<input name="v" inputmode="decimal" required></label>', 'Pôr no orçamento', (f) => { const o = osPor(d.o); o.itens.push({ id: cod(), tipo: f.get('t'), desc: f.get('d'), qtd: num(f.get('q')) || 1, valor: num(f.get('v')), aprovado: o.status === 'orcamento' ? null : true }); }),
  'simular-aprovacao': (d) => { const o = osPor(d.o); folha(`<p class="mini">Assim o cliente vê pelo link, sem senha:</p><div class="cartao"><span class="placa">${t(o.placa)}</span><h2 style="margin:8px 0">${t(o.modelo)}</h2>${o.itens.map((i) => `<div class="item-os"><div>${t(i.desc)}<small>${din(i.qtd * i.valor)}</small></div><label style="display:flex;gap:6px;align-items:center;font-weight:700"><input type="checkbox" data-aprova="${i.id}" ${i.aprovado !== false ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--ok)">aprovo</label><span></span></div>`).join('')}</div><div class="linha"><button type="button" class="bt cobre" data-confirma>Confirmar como o cliente</button><button type="button" class="bt" data-fecha>Fechar</button></div>`, (f, fecha) => f.querySelector('[data-confirma]').addEventListener('click', () => { f.querySelectorAll('[data-aprova]').forEach((c) => { o.itens.find((i) => i.id === c.dataset.aprova).aprovado = c.checked; }); o.status = 'aprovado'; grava(); fecha(); mostra(); aviso(`Aprovado: ${din(totalOs(o, true))}. Pode começar.`); })); },
  avancar: (d) => { const o = osPor(d.o), k = ETAPAS.findIndex((e) => e[0] === o.status); o.status = ETAPAS[Math.min(3, k + 1)][0]; if (o.status === 'aprovado') o.itens.forEach((i) => { if (i.aprovado === null) i.aprovado = true; }); grava(); mostra(); aviso(o.status === 'pronto' ? 'Serviço pronto: avise o cliente.' : `Agora: ${etapa(o)[1].toLowerCase()}.`); },
  entregar: (d) => { const o = osPor(d.o); folha(`<h2>Entregar e receber</h2><p class="sub">${t(o.modelo)} · ${t(o.cliente)}</p><div class="total-os"><span>Total</span><span>${din(totalOs(o, true))}</span></div><div class="linha">${['Pix', 'Dinheiro', 'Cartão'].map((fm) => `<button type="button" class="bt ${fm === 'Pix' ? 'cobre' : ''}" data-forma="${fm}">${fm}</button>`).join('')}</div><p class="mini">Ao entregar, a garantia de ${db.eu.garantia} dias começa a contar e o carro sai do box.</p>`, (f, fecha) => f.addEventListener('click', (e) => { const b = e.target.closest('[data-forma]'); if (!b) return; o.status = 'entregue'; o.pago = true; o.forma = b.dataset.forma; o.entregue = 0; o.box = null; o.garantia = db.eu.garantia; grava(); fecha(); location.hash = '#patio'; aviso(`${din(totalOs(o, true))} recebidos no ${b.dataset.forma}. Box liberado.`); })); },
  'por-box': (d) => { const o = osPor(d.o), ocup = db.os.filter((x) => x.status !== 'entregue' && x.box).map((x) => x.box), livre = Array.from({ length: db.oficina.boxes }, (_, i) => i + 1).find((b) => !ocup.includes(b)); if (!livre) return aviso('Todos os boxes estão ocupados.'); o.box = livre; grava(); mostra(); aviso(`No box ${livre}.`); },
  lancar: (d) => formulario(d.v === 'saida' ? 'Saída do caixa' : 'Entrada no caixa', '<label class="campo">O que foi<input name="d" required placeholder="Ex.: compra de óleo"></label><div class="dupla"><label class="campo">Valor (R$)<input name="v" inputmode="decimal" required></label><label class="campo">Forma<select name="f"><option>Pix</option><option>Dinheiro</option><option>Cartão</option></select></label></div>', 'Lançar', (f) => { db.caixa.push({ dia: 0, desc: f.get('d'), valor: (d.v === 'saida' ? -1 : 1) * num(f.get('v')), forma: f.get('f') }); }),
  pagar,
  cancelar: () => { if (confirm(`Cancelar? Você usa até ${dia(db.assinatura.proxima)} e nada mais é cobrado.`)) { db.assinatura.renova = false; grava(); mostra(); } },
  reativar: () => { db.assinatura.renova = true; grava(); mostra(); aviso('Assinatura reativada.'); },
  convidar: () => { formulario('Chamar para a equipe', '<label class="campo">Nome<input name="n" required></label><label class="campo">WhatsApp<input name="t" inputmode="tel" required></label>', 'Mandar convite', (f) => { db.equipe.push({ id: cod(), nome: f.get('n'), pode: { os: true, valores: false, caixa: false } }); aviso('Convite mandado pelo WhatsApp.'); }); },
  tirar: (d) => { db.equipe = db.equipe.filter((p) => p.id !== d.id); grava(); mostra(); },
  plano: (d) => { db.plano = d.v; db.assinatura.valor = d.v === 'pro' ? 129 : 69; grava(); mostra(); },
};
let fotosEntrada = [];
async function reduz(arq) { const b = await createImageBitmap(arq), k = Math.min(1, 640 / Math.max(b.width, b.height)), c = document.createElement('canvas'); c.width = b.width * k; c.height = b.height * k; c.getContext('2d').drawImage(b, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.7); }

document.addEventListener('click', (e) => {
  const ir = e.target.closest('[data-ir]'); if (ir) { location.hash = `#${ir.dataset.ir}`; return; }
  const s = e.target.closest('[data-sug]'); if (s) { q('#q-ia').value = s.dataset.sug; q('#f-ia').requestSubmit(); return; }
  const a = e.target.closest('[data-acao]'); if (a && A[a.dataset.acao]) { e.preventDefault(); A[a.dataset.acao](a.dataset); }
});
document.addEventListener('submit', (e) => {
  if (e.target.id === 'f-ia') { e.preventDefault(); const p = q('#q-ia').value.trim(); if (p.length < 3) return; const resp = { ia: 1, t: window.veltriaIA ? 'Pensando…' : `${responde(p)}\n\n(Exemplo da demonstração.)` }; db.conversa.push({ t: p }, resp); db.conversa = db.conversa.slice(-10); grava(); mostra(); if (window.veltriaIA) window.veltriaIA(p).then((t) => { resp.t = t; grava(); mostra(); }); }
  if (e.target.id === 'f-entrada') {
    e.preventDefault(); const f = new FormData(e.target), ocup = db.os.filter((x) => x.status !== 'entregue' && x.box).map((x) => x.box), livre = Array.from({ length: db.oficina.boxes }, (_, i) => i + 1).find((b) => !ocup.includes(b)) || null;
    const o = { id: cod(), num: db.proxOs++, placa: String(f.get('placa')).toUpperCase().replace(/[^A-Z0-9]/g, ''), modelo: f.get('modelo'), cor: '#5d6d7e', cliente: f.get('cliente'), tel: String(f.get('tel')).replace(/\D/g, ''), km: num(f.get('km')), comb: Number(f.get('comb')), entrada: 0, box: livre, status: 'orcamento', avarias: f.getAll('avaria'), fotos: fotosEntrada, garantia: db.eu.garantia, itens: f.get('queixa') ? [{ id: cod(), tipo: 'serviço', desc: `Diagnóstico: ${f.get('queixa')}`, qtd: 1, valor: 120, aprovado: null }] : [], pago: false };
    db.os.push(o); fotosEntrada = []; grava(); location.hash = `#os/${o.id}`; aviso(livre ? `OS ${o.num} aberta · box ${livre}` : `OS ${o.num} aberta · esperando box`);
  }
});
document.addEventListener('input', (e) => {
  const x = e.target;
  if (x.id === 'busca-placa') { const v = x.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); document.querySelectorAll('#lista-carros [data-placa]').forEach((li) => { li.hidden = v && !li.dataset.placa.includes(v); }); }
  if (x.dataset.eu) { db.eu[x.dataset.eu] = x.dataset.eu === 'garantia' ? Number(x.value) : x.value; grava(); q('#sub-oficina').textContent = `${db.eu.nome} · mecânico`; }
  if (x.dataset.of) { db.oficina[x.dataset.of] = x.dataset.of === 'boxes' ? Number(x.value) : x.value; grava(); q('#nome-oficina').textContent = db.oficina.nome; }
});
document.addEventListener('change', async (e) => {
  const x = e.target;
  if (x.dataset.pode) { const [id, k] = x.dataset.pode.split(':'); db.equipe.find((p) => p.id === id).pode[k] = x.checked; grava(); aviso('Permissão salva'); }
  if (x.dataset.eu === 'letra') mostra();
  if (x.id === 'fotos-entrada' && x.files.length) { for (const a of [...x.files].slice(0, 4)) { try { fotosEntrada.push(await reduz(a)); } catch { /* não é imagem */ } } q('#previa-fotos').innerHTML = fotosEntrada.map((f) => `<img src="${f}" alt="">`).join(''); }
  if (x.dataset.foto && x.files.length) { const o = osPor(x.dataset.foto); for (const a of [...x.files].slice(0, 3)) { try { o.fotos.push(await reduz(a)); } catch { /* não é imagem */ } } grava(); mostra(); aviso('Foto guardada na OS. O cliente vê no link.'); }
});
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data?.simular) return; const a = db.assinatura;
  if (e.data.simular === 'cancelar') { a.renova = false; a.status = 'ativa'; }
  if (e.data.simular === 'recusado') { a.status = 'vencida'; a.renova = true; (a.recusas ||= []).push(0); }
  if (e.data.simular === 'normal') { db.assinatura = oficina().assinatura; db.plano = 'basico'; }
  grava(); mostra();
});
q('#recomecar')?.addEventListener('click', () => { localStorage.removeItem(CHAVE); db = oficina(); location.hash = '#patio'; mostra(); aviso('Demonstração recomeçada.'); });
if (window !== window.top) document.documentElement.classList.add('no-celular');
if ('serviceWorker' in navigator && window === window.top) navigator.serviceWorker.register('sw.js').catch(() => {});
mostra();
