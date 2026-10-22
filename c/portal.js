// =============================================================
// Veltria · página do cliente final
// -------------------------------------------------------------
// Abre pelo link que a empresa manda: /c/#<token> (versão na nuvem)
// ou /c/#d=<dados> (demonstração). Mostra o orçamento, o cardápio,
// a proposta, o processo… e manda a resposta do cliente de volta.
// =============================================================
import { qrSVG } from '../demos/sistemas/base/qr.js';
import { pixCopiaECola } from '../demos/sistemas/base/pix.js';

// não abre dentro de página de outro site (proteção contra clickjacking; o GitHub Pages não deixa mandar X-Frame-Options)
if (window.top !== window.self) { try { if (window.top.location.origin !== location.origin) throw 0; } catch { window.top.location.href = location.href; } }

const raiz = document.getElementById('p');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const dt = (s) => { if (!s) return '—'; const [a, m, d] = String(s).slice(0, 10).split('-'); return `${Number(d)} ${MESES[Number(m) - 1]}${a !== String(new Date().getFullYear()) ? ` ${esc(a)}` : ''}`; };
const wa = (t, msg = '') => `https://wa.me/${String(t || '').replace(/\D/g, '') ? `55${String(t).replace(/\D/g, '').replace(/^55/, '')}` : ''}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`;
const q = new URLSearchParams(location.search);

let ctx = null; // { tipo, app, empresa, dados, demo, token }
const st = {}; // estado da tela

// ---------------------------------------------------------------- dados
async function carregar() {
  const h = location.hash.slice(1);
  if (h.startsWith('d=')) {
    const json = decodeURIComponent(escape(atob(h.slice(2).replace(/-/g, '+').replace(/_/g, '/'))));
    const d = JSON.parse(json);
    return { ...d, empresa: d.dados?._empresa?.nome || '' };
  }
  if (h.startsWith('t=')) {
    const pac = localStorage.getItem(`nexo-portal-demo-${h.slice(2)}`);
    if (!pac) throw new Error('Este QR code é da demonstração e só abre no navegador onde o sistema está aberto.');
    const d = JSON.parse(pac); return { ...d, empresa: d.dados?._empresa?.nome || '' };
  }
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(h)) throw new Error('Link incompleto. Peça um novo link para a empresa.');
  const conf = window.NEXO_NUVEM;
  const sb = window.supabase.createClient(conf.url, conf.chave, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc('nexo_portal_ler', { p_token: h });
  if (error) throw new Error('Não foi possível abrir agora. Tente de novo em instantes.');
  if (data?.erro) throw new Error(data.erro);
  return { ...data, token: h, sb };
}
async function responder(acao, dados = {}) {
  if (ctx.demo) {
    try { new BroadcastChannel(`nexo-demo-${ctx.app}`).postMessage({ token: ctx.token, acao, dados }); } catch { /* sem canal */ }
    return { ok: true };
  }
  const { data, error } = await ctx.sb.rpc('nexo_portal_responder', { p_token: ctx.token, p_acao: acao, p_dados: dados });
  if (error) return { erro: 'Sem conexão. Tente de novo.' };
  return data || { ok: true };
}

// ---------------------------------------------------------------- pedaços
const E = () => ctx.dados._empresa || {};
const cab = (pre, titulo, sub = '') => `<header class="p-cab">${E().logo && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(E().logo) ? `<img class="p-logo" src="${E().logo}" alt="${esc(E().nome || '')}">` : ''}<small>${esc(pre)}</small><h1>${esc(titulo)}</h1>${sub ? `<p>${sub}</p>` : ''}</header>`;
const rod = () => `<footer class="p-rod">${esc(E().nome)}${E().telefone ? ` · <a href="${wa(E().telefone)}" target="_blank" rel="noopener">${esc(E().telefone)}</a>` : ''}<br>${E().endereco ? `${esc(E().endereco)}<br>` : ''}Feito com o ${esc(E().sistema || 'Veltria')} · <a href="https://bluerose-store.com/" target="_blank" rel="noopener">Blue Rose Express</a></footer>`;
const avisoDemo = () => (ctx.demo ? '<div class="p-aviso">Demonstração: a sua resposta aparece na aba do sistema aberta neste navegador.</div>' : '');
const urlSegura = (u) => { const s = String(u ?? '').trim(); return /^(https:\/\/|blob:|data:image\/(png|jpeg|webp|gif);)/i.test(s) ? s : ''; }; /* só https, blob e imagem em data: (c/index.html permite esses); javascript: e outros viram vazio */
const fotos = (lista) => { const l = (lista || []).map((f) => ({ ...f, url: urlSegura(f?.url) })).filter((f) => f.url); return (l.length ? `<div class="p-fotos">${l.map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener"><img src="${esc(f.url)}" alt="${esc(f.legenda || 'Foto')}" loading="lazy"></a>`).join('')}</div>` : ''); };
const pronto = (titulo, texto) => { raiz.innerHTML = `${cab(E().nome || '', titulo)}<section class="p-sec p-ok"><div class="p-ic">✓</div><h2>${esc(titulo)}</h2><p class="p-s">${esc(texto)}</p>${E().telefone ? `<p><a class="p-bt" href="${wa(E().telefone)}" target="_blank" rel="noopener">Falar no WhatsApp</a></p>` : ''}</section>${avisoDemo()}${rod()}`; scrollTo(0, 0); };
const pixBloco = (pix, valor, txid, desc) => {
  if (!pix?.chave) return '';
  const cod = pixCopiaECola({ ...pix, valor, txid, descricao: desc });
  return `<div class="p-pix">${pix.demo ? '<p class="p-aviso" style="margin:0">PIX de demonstração: não pague. Na versão contratada, aqui aparece a chave da empresa.</p>' : ''}${qrSVG(cod, 220)}<textarea readonly data-pix>${esc(cod)}</textarea><button type="button" class="p-bt" data-a="copiarPix">Copiar código PIX</button></div>`;
};

// ---------------------------------------------------------------- telas por tipo
const T = {};

// Oficina: acompanhamento e aprovação do orçamento
T.os = {
  titulo: (d) => `${d.modelo} · ${d.placa}`,
  render(d) {
    st.aprov ||= Object.fromEntries(d.itens.filter((x) => x.aprovado == null).map((x) => [x.k, true]));
    const i = d.etapas.findIndex(([id]) => id === d.etapa), pend = d.itens.some((x) => x.aprovado == null);
    const valendo = d.itens.filter((x) => (x.aprovado == null ? st.aprov[x.k] : x.aprovado));
    const total = valendo.reduce((s, x) => s + x.qtd * x.preco, 0) - (d.desconto || 0);
    return `${cab(E().nome, `${d.modelo}`, `Placa ${esc(d.placa)} · Ordem de serviço nº ${esc(d.numero)}`)}
      <section class="p-sec"><h2>Onde está o seu carro</h2><div class="p-passos">${d.etapas.map((_, k) => `<i class="${k <= i ? 'feito' : ''}"></i>`).join('')}</div><div class="p-passos-rot"><span>Entrada</span><b style="color:var(--acc)">${esc(d.etapas[i]?.[1] || '')}</b><span>Entrega</span></div>
        ${d.aguardando ? `<p class="p-s" style="margin-top:10px">Aguardando: ${esc(d.aguardando)}</p>` : ''}${d.previsao ? `<p class="p-s" style="margin-top:6px">Previsão de entrega: <b>${dt(d.previsao)}</b></p>` : ''}</section>
      <section class="p-sec"><h2>${pend ? 'Orçamento para aprovar' : 'Serviços e peças'}</h2>${pend ? '<p class="p-sub">Marque o que você quer fazer agora. O que não for aprovado fica anotado para depois.</p>' : ''}
        ${d.itens.map((x) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(x.descricao)}${x.qtd > 1 ? ` <span class="p-s">× ${esc(x.qtd)}</span>` : ''}</div>${x.sugerido ? '<div class="p-s">Recomendado pelo mecânico</div>' : ''}</div><span class="p-num">${moeda(x.qtd * x.preco)}</span>
          ${x.aprovado == null ? `<button type="button" class="p-bt peq" aria-pressed="${!!st.aprov[x.k]}" data-a="marcar" data-k="${esc(x.k)}">${st.aprov[x.k] ? 'Aprovado' : 'Não agora'}</button>` : x.aprovado ? '<span class="p-et ok">Aprovado</span>' : '<span class="p-et">Recusado</span>'}</div>`).join('')}
        ${d.desconto ? `<div class="p-linha"><div class="p-cresce">Desconto</div><span class="p-num">− ${moeda(d.desconto)}</span></div>` : ''}
        <div class="p-total"><span>Total</span><span>${moeda(total)}</span></div></section>
      ${d.fotos?.length ? `<section class="p-sec"><h2>Fotos</h2>${fotos(d.fotos)}</section>` : ''}
      ${d.relato ? `<section class="p-sec"><h2>O que você relatou</h2><p class="p-s" style="margin:0">${esc(d.relato)}</p></section>` : ''}
      ${avisoDemo()}${rod()}${pend ? `<div class="p-fixo"><button type="button" class="p-bt pri" data-a="aprovar">Confirmar · ${moeda(total)}</button></div>` : ''}`;
  },
  acoes: {
    marcar: (el) => { st.aprov[el.dataset.k] = !st.aprov[el.dataset.k]; desenhar(); },
    aprovar: async () => { const r = await responder('aprovar', { itens: st.aprov }); if (r.erro) return alert(r.erro); pronto('Orçamento enviado', 'A oficina já recebeu a sua resposta e vai seguir com o serviço.'); },
  },
};

// Financeiro (assistência técnica): orçamento da OS para aprovar item por item e acompanhamento do equipamento
T.orcamento = {
  titulo: (d) => `OS ${d.numero} · ${d.equipamento}`,
  render(d) {
    st.aprov ||= Object.fromEntries(d.itens.filter((x) => x.aprovado == null).map((x) => [x.k, true]));
    const i = d.etapas.findIndex(([id]) => id === d.etapa), pend = d.etapa === 'orcamento' && d.itens.some((x) => x.aprovado == null);
    const valendo = d.itens.filter((x) => (x.aprovado == null ? (pend ? st.aprov[x.k] : true) : x.aprovado));
    const total = Math.max(0, valendo.reduce((s, x) => s + x.qtd * x.preco, 0) - (d.desconto || 0));
    return `${cab(E().nome, d.equipamento, `${d.marca ? `${esc(d.marca)} · ` : ''}Ordem de serviço nº ${esc(d.numero)}`)}
      <section class="p-sec"><h2>Onde está o seu equipamento</h2><div class="p-passos">${d.etapas.map((_, k) => `<i class="${k <= i ? 'feito' : ''}"></i>`).join('')}</div><div class="p-passos-rot"><span>Entrada</span><b style="color:var(--acc)">${esc(d.etapas[i]?.[1] || '')}</b><span>Entrega</span></div>
        ${d.previsao ? `<p class="p-s" style="margin-top:10px">Previsão: <b>${dt(d.previsao)}</b></p>` : ''}${d.garantia ? `<p class="p-s" style="margin-top:6px">Garantia do serviço até <b>${dt(d.garantia)}</b></p>` : ''}${d.validade && pend ? `<p class="p-s" style="margin-top:6px">Orçamento válido até <b>${dt(d.validade)}</b></p>` : ''}</section>
      ${d.etapa === 'pronta' && !d.assinado && !st.assinou ? `<section class="p-sec"><h2>Retirada do equipamento</h2><p class="p-sub">Confirme que recebeu o equipamento funcionando e que está de acordo com a garantia de ${esc(d.garantiaDias || 90)} dias. A assinatura fica no termo de entrega.</p>
        <label class="p-s" style="display:block;margin:8px 0 4px">Seu nome completo</label><input data-f="nomeAss" value="${esc(st.nomeAss || '')}" autocomplete="name" style="width:100%;padding:10px;border-radius:10px;border:1px solid #ccd3df;font:inherit">
        <canvas data-quadro width="720" height="264" style="width:100%;height:180px;margin-top:10px;border:1.5px dashed #9aa4b5;border-radius:12px;background:#fff;touch-action:none" aria-label="Assine aqui com o dedo"></canvas>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><span class="p-s">Assine com o dedo</span><button type="button" class="p-bt peq" data-a="limparAss">Limpar</button></div>
        <button type="button" class="p-bt pri" style="width:100%;margin-top:10px" data-a="assinar">Assinar a retirada</button></section>` : d.assinado || st.assinou ? '<section class="p-sec"><p class="p-s" style="margin:0">Termo de entrega assinado ✓</p></section>' : ''}
      <section class="p-sec"><h2>${pend ? 'Orçamento para aprovar' : 'Serviços e peças'}</h2>${pend ? '<p class="p-sub">Marque o que você quer fazer agora. O que ficar de fora não é cobrado.</p>' : ''}
        ${d.itens.map((x) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(x.descricao)}${x.qtd > 1 ? ` <span class="p-s">× ${esc(x.qtd)}</span>` : ''}</div></div><span class="p-num">${x.preco ? moeda(x.qtd * x.preco) : 'incluso'}</span>
          ${x.aprovado == null ? (pend ? `<button type="button" class="p-bt peq" aria-pressed="${!!st.aprov[x.k]}" data-a="marcar" data-k="${esc(x.k)}">${st.aprov[x.k] ? 'Aprovado' : 'Não agora'}</button>` : '') : x.aprovado ? '<span class="p-et ok">Aprovado</span>' : '<span class="p-et">Recusado</span>'}</div>`).join('')}
        ${d.desconto ? `<div class="p-linha"><div class="p-cresce">Desconto</div><span class="p-num">− ${moeda(d.desconto)}</span></div>` : ''}
        <div class="p-total"><span>Total</span><span>${moeda(total)}</span></div></section>
      ${d.fotos?.length ? `<section class="p-sec"><h2>Fotos</h2>${fotos(d.fotos)}</section>` : ''}
      ${d.defeito ? `<section class="p-sec"><h2>Defeito relatado</h2><p class="p-s" style="margin:0">${esc(d.defeito)}</p></section>` : ''}
      ${d.laudo && !pend ? `<section class="p-sec"><h2>O que foi feito</h2><p class="p-s" style="margin:0">${esc(d.laudo)}</p></section>` : ''}
      ${avisoDemo()}${rod()}${pend ? `<div class="p-fixo"><button type="button" class="p-bt pri" data-a="aprovar">Confirmar · ${moeda(total)}</button></div>` : ''}`;
  },
  depois: () => { const cv = raiz.querySelector('[data-quadro]'); if (!cv || cv._ligado) return; cv._ligado = true; const g = cv.getContext('2d'); g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#111'; let des = false;
    const pt = (e) => { const b = cv.getBoundingClientRect(); return [((e.clientX - b.left) / b.width) * cv.width, ((e.clientY - b.top) / b.height) * cv.height]; };
    cv.addEventListener('pointerdown', (e) => { des = true; cv.setPointerCapture(e.pointerId); g.beginPath(); g.moveTo(...pt(e)); e.preventDefault(); });
    cv.addEventListener('pointermove', (e) => { if (!des) return; g.lineTo(...pt(e)); g.stroke(); cv._tracos = (cv._tracos || 0) + 1; e.preventDefault(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => cv.addEventListener(t, () => { des = false; })); },
  acoes: {
    marcar: (el) => { st.aprov[el.dataset.k] = !st.aprov[el.dataset.k]; desenhar(); },
    limparAss: () => { const cv = raiz.querySelector('[data-quadro]'); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); cv._tracos = 0; },
    assinar: async () => {
      lerCampos(); const cv = raiz.querySelector('[data-quadro]'), nome = String(st.nomeAss || '').trim();
      if (nome.length < 5) return alert('Escreva o seu nome completo.');
      if ((cv._tracos || 0) < 8) return alert('Assine no quadro branco.');
      const c = document.createElement('canvas'); c.width = 360; c.height = 132; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 360, 132); x.drawImage(cv, 0, 0, 360, 132);
      const r = await responder('assinar', { img: c.toDataURL('image/png'), nome: nome.slice(0, 80) }); if (r.erro) return alert(r.erro);
      st.assinou = true; pronto('Retirada assinada', `Obrigado, ${nome.split(' ')[0]}! O termo de entrega com a garantia fica guardado na ${E().nome || 'empresa'}.`);
    },
    aprovar: async () => { const r = await responder('aprovar', { itens: st.aprov }); if (r.erro) return alert(r.erro); const algum = Object.values(st.aprov).some(Boolean); pronto(algum ? 'Orçamento aprovado' : 'Resposta enviada', algum ? `${E().nome || 'A empresa'} já recebeu a sua resposta e vai seguir com o serviço.` : 'Avisamos a empresa que você não quer fazer o serviço agora.'); },
  },
};

// Financeiro (Pro): área do cliente, pedido de visita, pesquisa de satisfação e aceite do contrato
const formVisita = (comDados) => `${comDados ? `<label class="p-campo">Seu nome<input data-f="nome" autocomplete="name" value="${esc(st.nome || '')}"></label><label class="p-campo">WhatsApp<input data-f="telefone" inputmode="tel" autocomplete="tel" value="${esc(st.telefone || '')}" placeholder="(48) 99999-9999"></label>
    <label class="p-campo">Endereço do atendimento<input data-f="endereco" autocomplete="street-address" value="${esc(st.endereco || '')}" placeholder="Rua e número"></label><label class="p-campo">Bairro<input data-f="bairro" value="${esc(st.bairro || '')}"></label>` : ''}
    <label class="p-campo">Equipamento<input data-f="equipamento" value="${esc(st.equipamento || '')}" placeholder="Ex.: ar-condicionado split 12.000 BTU"></label>
    <label class="p-campo">O que está acontecendo?<textarea data-f="texto" placeholder="Ex.: não gela, pinga água, faz barulho">${esc(st.texto || '')}</textarea></label>
    <label class="p-campo">Melhor dia<input type="date" data-f="data" value="${esc(st.data || '')}" min="${new Date().toISOString().slice(0, 10)}"></label>
    <div class="p-chips" style="margin:6px 0 0;padding:0">${['manhã', 'tarde'].map((p) => `<button type="button" class="p-bt" aria-pressed="${st.periodo === p}" data-a="periodo" data-v="${p}">De ${p}</button>`).join('')}</div>`;
T.cliente = {
  titulo: (d) => d.nome,
  render(d) {
    const conta = d.contas.find((x) => x.id === st.pagar);
    if (conta) return `${cab(E().nome, moeda(conta.valor), `${esc(conta.descricao)} · ${conta.vencimento < new Date().toISOString().slice(0, 10) ? 'venceu' : 'vence'} em ${dt(conta.vencimento)}`)}<section class="p-sec"><h2>Pague com PIX</h2>${d.pix?.chave ? pixBloco(d.pix, conta.valor, conta.txid, conta.descricao) : '<p class="p-s">Fale com a empresa para receber os dados de pagamento.</p>'}</section>
      <p style="text-align:center;margin-top:10px"><button type="button" class="p-bt" data-a="voltar">Voltar</button></p>${avisoDemo()}${rod()}<div class="p-fixo"><button type="button" class="p-bt ok" data-a="paguei" data-l="${esc(conta.id)}">Já paguei</button></div>`;
    if (st.visita) return `${cab(E().nome, 'Pedir uma visita', `Para ${esc(d.nome)}`)}<section class="p-sec">${formVisita(false)}</section><p style="text-align:center;margin-top:10px"><button type="button" class="p-bt" data-a="voltar">Voltar</button></p>${avisoDemo()}${rod()}<div class="p-fixo"><button type="button" class="p-bt pri" data-a="enviarVisita">Pedir a visita</button></div>`;
    return `${cab(E().nome, `Olá, ${esc(d.saudacao || String(d.nome).split(' ')[0])}`, 'Sua área: equipamentos, garantias, contratos e pagamentos')}
      ${d.andamento.length ? `<section class="p-sec"><h2>Em serviço agora</h2>${d.andamento.map((o) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(o.equipamento)}</div><div class="p-s">OS ${esc(o.numero)} · ${esc(o.etapa)}${o.previsao ? ` · previsão ${dt(o.previsao)}` : ''}</div></div><span class="p-num">${moeda(o.total)}</span></div>`).join('')}</section>` : ''}
      <section class="p-sec"><h2>Contas em aberto</h2>${d.contas.length ? d.contas.map((c) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(c.descricao)}</div><div class="p-s">${c.informado ? 'pagamento informado, a empresa vai conferir' : `vence em ${dt(c.vencimento)}`}</div></div><span class="p-num">${moeda(c.valor)}</span>${c.informado ? '' : `<button type="button" class="p-bt peq pri" data-a="pagar" data-l="${esc(c.id)}">Pagar</button>`}</div>`).join('') : '<p class="p-s" style="margin:0">Nada em aberto. Obrigado!</p>'}</section>
      ${d.garantias.length ? `<section class="p-sec"><h2>Na garantia</h2>${d.garantias.map((g) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(g.equipamento)}</div><div class="p-s">OS ${esc(g.numero)}</div></div><span class="p-et ok">até ${dt(g.ate)}</span></div>`).join('')}</section>` : ''}
      ${d.contratos.length ? `<section class="p-sec"><h2>Contrato de manutenção</h2>${d.contratos.map((c) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(c.descricao)}</div><div class="p-s">${c.proxima ? `próxima visita em ${dt(c.proxima)}` : ''}${c.fim ? ` · vigente até ${dt(c.fim)}` : ''}</div></div><span class="p-num">${moeda(c.valor)}/mês</span></div>`).join('')}</section>` : ''}
      ${avisoDemo()}${rod()}<div class="p-fixo"><button type="button" class="p-bt pri" data-a="abrirVisita">Pedir uma visita</button></div>`;
  },
  acoes: {
    pagar: (el) => { st.pagar = el.dataset.l; desenhar(); scrollTo(0, 0); },
    voltar: () => { lerCampos(); st.pagar = null; st.visita = false; desenhar(); },
    paguei: async (el) => { const r = await responder('paguei', { l: el.dataset.l }); if (r.erro) return alert(r.erro); pronto('Pagamento informado', 'A empresa vai conferir e confirmar o recebimento.'); },
    abrirVisita: () => { st.visita = true; desenhar(); scrollTo(0, 0); },
    periodo: (el) => { lerCampos(); st.periodo = el.dataset.v; desenhar(); },
    enviarVisita: async () => { lerCampos(); if ((st.texto || '').trim().length < 5) return alert('Conte o que está acontecendo com o equipamento.'); const r = await responder('visita', { equipamento: (st.equipamento || '').slice(0, 80), texto: st.texto.slice(0, 600), data: st.data || '', periodo: st.periodo || '' }); if (r.erro) return alert(r.erro); pronto('Visita pedida', 'A empresa vai confirmar o dia e o horário pelo WhatsApp.'); },
  },
};
T.visita = {
  titulo: () => 'Pedir visita técnica',
  render: () => `${cab(E().nome, 'Peça a sua visita técnica', 'Conte o que está acontecendo. A gente confirma o dia e o horário pelo WhatsApp.')}<section class="p-sec">${formVisita(true)}</section>${avisoDemo()}${rod()}<div class="p-fixo"><button type="button" class="p-bt pri" data-a="enviar">Pedir a visita</button></div>`,
  acoes: {
    periodo: (el) => { lerCampos(); st.periodo = el.dataset.v; desenhar(); },
    enviar: async () => {
      lerCampos();
      if ((st.nome || '').trim().length < 3) return alert('Escreva o seu nome.');
      if (String(st.telefone || '').replace(/\D/g, '').length < 10) return alert('Escreva o seu WhatsApp com DDD.');
      if ((st.texto || '').trim().length < 5) return alert('Conte o que está acontecendo com o equipamento.');
      const r = await responder('pedir', { nome: st.nome.trim().slice(0, 80), telefone: st.telefone.slice(0, 20), endereco: (st.endereco || '').slice(0, 120), bairro: (st.bairro || '').slice(0, 60), equipamento: (st.equipamento || '').slice(0, 80), texto: st.texto.slice(0, 600), data: st.data || '', periodo: st.periodo || '' });
      if (r.erro) return alert(r.erro); pronto('Pedido enviado', `Obrigado, ${st.nome.trim().split(' ')[0]}! A ${E().nome || 'empresa'} vai chamar você no WhatsApp para confirmar a visita.`);
    },
  },
};
T.nps = {
  titulo: () => 'Como foi o atendimento?',
  render(d) {
    if (d.respondida || st.enviada) return `${cab(E().nome, 'Obrigado!')}<section class="p-sec p-ok"><div class="p-ic">✓</div><h2>Resposta recebida</h2>${st.nota >= 9 && d.google ? `<p class="p-s">Que bom que gostou! Pode contar isso no Google? Ajuda muito outras pessoas a nos encontrar.</p><p><a class="p-bt pri" href="${esc(urlSegura(d.google))}" target="_blank" rel="noopener">Avaliar no Google</a></p>` : '<p class="p-s">A sua opinião ajuda a melhorar o atendimento.</p>'}</section>${rod()}`;
    return `${cab(E().nome, 'Como foi o atendimento?', `OS ${esc(d.numero)} · ${esc(d.equipamento)}${d.tecnico ? ` · técnico ${esc(d.tecnico)}` : ''}`)}
      <section class="p-sec"><h2>De 0 a 10, quanto você nos recomendaria a um amigo?</h2><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px">${Array.from({ length: 11 }, (_, n) => `<button type="button" class="p-bt" aria-pressed="${st.nota === n}" data-a="nota" data-v="${n}" style="padding:10px 0">${n}</button>`).join('')}</div>
        <div style="display:flex;justify-content:space-between;margin-top:6px" class="p-s"><span>nada provável</span><span>com certeza</span></div></section>
      <section class="p-sec"><label class="p-campo">Quer contar algo? (opcional)<textarea data-f="comentario">${esc(st.comentario || '')}</textarea></label></section>
      ${avisoDemo()}${rod()}${st.nota != null ? '<div class="p-fixo"><button type="button" class="p-bt pri" data-a="enviar">Enviar</button></div>' : ''}`;
  },
  acoes: {
    nota: (el) => { lerCampos(); st.nota = Number(el.dataset.v); desenhar(); },
    enviar: async () => { lerCampos(); const r = await responder('nota', { nota: st.nota, comentario: (st.comentario || '').slice(0, 500) }); if (r.erro) return alert(r.erro); st.enviada = true; desenhar(); scrollTo(0, 0); },
  },
};
T.contrato = {
  titulo: (d) => d.descricao,
  render(d) {
    if (d.aceito || st.aceito) return `${cab(E().nome, d.descricao)}<section class="p-sec p-ok"><div class="p-ic">✓</div><h2>Contrato aceito</h2><p class="p-s">${d.aceito ? `Aceito por ${esc(d.aceito.nome)}.` : 'Obrigado! A empresa já recebeu o seu aceite.'}</p></section>${rod()}`;
    return `${cab(`Contrato · ${E().nome}`, d.descricao, `Para ${esc(d.cliente)} · ${moeda(d.valor)} por mês · ${dt(d.inicio)} a ${dt(d.fim)}`)}
      ${d.equipamentos.length ? `<section class="p-sec"><h2>Equipamentos</h2>${d.equipamentos.map((e) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(e)}</div></div></div>`).join('')}</section>` : ''}
      <section class="p-sec"><h2>Condições</h2><ol style="margin:0;padding-left:18px;line-height:1.6" class="p-s">${d.clausulas.map((c) => `<li style="margin-bottom:6px">${esc(c)}</li>`).join('')}</ol></section>
      <section class="p-sec"><h2>Aceitar o contrato</h2><label class="p-campo">Nome completo<input data-f="nome" autocomplete="name" value="${esc(st.nome || '')}"></label><label class="p-campo">CPF ou CNPJ<input data-f="doc" inputmode="numeric" value="${esc(st.doc || '')}"></label><p class="p-s" style="margin-top:8px">Ao aceitar, você concorda com as condições acima. A data e a hora do aceite ficam registradas.</p></section>
      ${avisoDemo()}${rod()}<div class="p-fixo"><button type="button" class="p-bt pri" data-a="aceitar">Aceitar o contrato</button></div>`;
  },
  acoes: {
    aceitar: async () => { lerCampos(); if ((st.nome || '').trim().length < 5 || (st.doc || '').replace(/\D/g, '').length < 11) return alert('Informe o nome completo e o CPF ou CNPJ.'); const r = await responder('aceitar', { nome: st.nome.trim(), documento: st.doc.trim() }); if (r.erro) return alert(r.erro); st.aceito = true; desenhar(); scrollTo(0, 0); },
  },
};

// Restaurante: cardápio por QR code na mesa e pedido online
T.cardapio = {
  titulo: () => 'Cardápio',
  render(d) {
    st.carrinho ||= {}; st.cat ||= d.cats[0]?.[0];
    const mesa = q.get('mesa');
    const itens = d.itens.filter((x) => x.cat === st.cat);
    const n = Object.values(st.carrinho).reduce((s, x) => s + x, 0), tot = Object.entries(st.carrinho).reduce((s, [id, k]) => s + k * (d.itens.find((x) => x.id === id)?.preco || 0), 0);
    if (st.fechar) return T.cardapio.fechar(d, mesa, tot);
    return `${cab(mesa ? `Mesa ${mesa}` : 'Peça pelo celular', E().nome, mesa ? 'Escolha e mande direto para a cozinha.' : d.delivery ? `Entrega${d.taxa ? ` · taxa de ${moeda(d.taxa)}` : ''} ou retirada no balcão.` : '')}
      <nav class="p-chips">${d.cats.filter(([id]) => d.itens.some((x) => x.cat === id)).map(([id, nm]) => `<button type="button" class="p-bt" aria-pressed="${st.cat === id}" data-a="cat" data-c="${esc(id)}">${esc(nm)}</button>`).join('')}</nav>
      <section class="p-sec">${itens.map((x) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(x.nome)}</div><div class="p-s">${moeda(x.preco)}${x.tempo ? ` · ${esc(x.tempo)} min` : ''}</div></div>
        <span class="p-qtd">${st.carrinho[x.id] ? `<button type="button" data-a="menos" data-i="${esc(x.id)}" aria-label="Menos">−</button><b>${st.carrinho[x.id]}</b>` : ''}<button type="button" data-a="mais" data-i="${esc(x.id)}" aria-label="Mais">+</button></span></div>`).join('')}</section>
      ${avisoDemo()}${rod()}${n ? `<div class="p-fixo"><button type="button" class="p-bt pri" data-a="revisar">Ver pedido · ${n} ${n === 1 ? 'item' : 'itens'} · ${moeda(tot)}</button></div>` : ''}`;
  },
  fechar(d, mesa, tot) {
    const linhas = Object.entries(st.carrinho).map(([id, k]) => { const x = d.itens.find((y) => y.id === id); return `<div class="p-linha"><div class="p-cresce p-t">${k}× ${esc(x.nome)}</div><span class="p-num">${moeda(k * x.preco)}</span></div>`; }).join('');
    const entrega = !mesa && st.modo !== 'retirada';
    return `${cab(mesa ? `Mesa ${mesa}` : 'Seu pedido', E().nome)}<section class="p-sec"><h2>Seu pedido</h2>${linhas}${entrega && d.taxa ? `<div class="p-linha"><div class="p-cresce">Entrega</div><span class="p-num">${moeda(d.taxa)}</span></div>` : ''}<div class="p-total"><span>Total</span><span>${moeda(tot + (entrega ? d.taxa || 0 : 0))}</span></div>
      <label class="p-campo">Observação para a cozinha<input data-f="obs" placeholder="Ex.: sem cebola" value="${esc(st.obs || '')}"></label></section>
      <section class="p-sec"><h2>${mesa ? 'Quem está pedindo' : 'Entrega'}</h2>${mesa ? '' : `<div class="p-grade2"><button type="button" class="p-bt" aria-pressed="${st.modo !== 'retirada'}" data-a="modo" data-m="entrega">Entregar</button><button type="button" class="p-bt" aria-pressed="${st.modo === 'retirada'}" data-a="modo" data-m="retirada">Vou retirar</button></div>`}
        <label class="p-campo">Seu nome<input data-f="nome" autocomplete="name" value="${esc(st.nome || '')}"></label>
        ${mesa ? '' : `<label class="p-campo">WhatsApp<input data-f="telefone" type="tel" autocomplete="tel" value="${esc(st.telefone || '')}"></label>${entrega ? `<label class="p-campo">Endereço com número e bairro<input data-f="endereco" autocomplete="street-address" value="${esc(st.endereco || '')}"></label>` : ''}
        <label class="p-campo">Pagamento<select data-f="pagamento">${['PIX', 'Cartão na entrega', 'Dinheiro'].map((x) => `<option ${st.pagamento === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>`}</section>
      <p style="text-align:center"><button type="button" class="p-bt" data-a="voltar">Continuar escolhendo</button></p>${avisoDemo()}${rod()}
      <div class="p-fixo"><button type="button" class="p-bt pri" data-a="enviar">Enviar pedido</button></div>`;
  },
  acoes: {
    cat: (el) => { st.cat = el.dataset.c; desenhar(); },
    mais: (el) => { st.carrinho[el.dataset.i] = (st.carrinho[el.dataset.i] || 0) + 1; desenhar(); },
    menos: (el) => { const k = (st.carrinho[el.dataset.i] || 0) - 1; if (k > 0) st.carrinho[el.dataset.i] = k; else delete st.carrinho[el.dataset.i]; desenhar(); },
    revisar: () => { st.fechar = true; desenhar(); scrollTo(0, 0); },
    voltar: () => { lerCampos(); st.fechar = false; desenhar(); },
    modo: (el) => { lerCampos(); st.modo = el.dataset.m; desenhar(); },
    enviar: async () => {
      lerCampos(); const mesa = q.get('mesa');
      if (!st.nome?.trim()) return alert('Informe o seu nome.');
      if (!mesa && !st.telefone?.trim()) return alert('Informe o seu WhatsApp.');
      if (!mesa && st.modo !== 'retirada' && !st.endereco?.trim()) return alert('Informe o endereço de entrega.');
      const r = await responder('pedido', { mesa: mesa || null, itens: Object.entries(st.carrinho).map(([id, qtd]) => ({ id, qtd })), obs: st.obs || '', nome: st.nome, telefone: st.telefone || '', endereco: st.modo === 'retirada' ? '' : st.endereco || '', retirada: st.modo === 'retirada', pagamento: st.pagamento || 'PIX' });
      if (r.erro) return alert(r.erro);
      pronto('Pedido enviado', mesa ? 'Já está na cozinha. Logo chega na sua mesa.' : 'O restaurante recebeu e já vai começar o preparo. Você recebe a confirmação no WhatsApp.');
    },
  },
};

// Clínica: ficha de anamnese antes da consulta
T.anamnese = {
  titulo: () => 'Ficha de saúde',
  render(d) {
    if (d.respondido) return `${cab(E().nome, 'Ficha já enviada', `Obrigado, ${esc(d.paciente.split(' ')[0])}.`)}<section class="p-sec p-ok"><div class="p-ic">✓</div><p class="p-s">A clínica já recebeu as suas respostas. Até a consulta!</p></section>${rod()}`;
    return `${cab(E().nome, `Olá, ${d.paciente.split(' ')[0]}`, d.consulta ? `Consulta ${esc(d.consulta)}. Responda antes de chegar: leva 2 minutos.` : 'Responda antes da consulta: leva 2 minutos.')}
      <section class="p-sec"><h2>Ficha de saúde</h2>${d.perguntas.map((p) => `<label class="p-campo">${esc(p.rot)}${p.tipo === 'sim_nao' ? `<select data-r="${esc(p.id)}"><option value="">Selecione</option><option>Não</option><option>Sim</option></select>` : p.tipo === 'longo' ? `<textarea data-r="${esc(p.id)}"></textarea>` : `<input data-r="${esc(p.id)}">`}</label>`).join('')}</section>
      ${d.termo ? `<section class="p-sec"><h2>Termo de consentimento</h2><p class="p-s" style="white-space:pre-wrap">${esc(d.termo)}</p><label class="p-campo">Digite seu nome completo para concordar<input data-aceite autocomplete="name"></label></section>` : ''}
      ${avisoDemo()}${rod()}<div class="p-fixo"><button type="button" class="p-bt pri" data-a="enviar">Enviar para a clínica</button></div>`;
  },
  acoes: {
    enviar: async () => {
      const respostas = Object.fromEntries([...raiz.querySelectorAll('[data-r]')].map((x) => [x.dataset.r, x.value.trim()]));
      const aceite = raiz.querySelector('[data-aceite]')?.value.trim() || '';
      if (ctx.dados.termo && aceite.length < 5) return alert('Digite o seu nome completo para concordar com o termo.');
      const r = await responder('anamnese', { respostas, aceite }); if (r.erro) return alert(r.erro);
      pronto('Ficha enviada', 'A clínica já recebeu as suas respostas. Até a consulta!');
    },
  },
};

// Academia: área do aluno (treino do dia, check-in, evolução e mensalidade)
T.aluno = {
  titulo: (d) => d.nome,
  render(d) {
    st.t ??= d.treinoHoje || 0;
    const t = d.treinos[st.t], m = d.mensalidade, av = d.avaliacoes || [];
    return `${cab(E().nome, `Olá, ${d.nome.split(' ')[0]}`, `${esc(d.plano || '')}${d.frequencia30 != null ? ` · ${esc(d.frequencia30)} treinos nos últimos 30 dias` : ''}`)}
      ${m ? `<section class="p-sec"><h2>Mensalidade</h2><div class="p-linha"><div class="p-cresce"><div class="p-t">${moeda(m.valor)}</div><div class="p-s">vence ${dt(m.vencimento)}</div></div>${m.status === 'pago' ? '<span class="p-et ok">Em dia</span>' : m.atrasada ? '<span class="p-et er">Em atraso</span>' : '<span class="p-et">Em aberto</span>'}</div>
        ${m.status !== 'pago' && m.pix?.chave ? (st.pix ? pixBloco(m.pix, m.valor, m.txid, 'Mensalidade') + '<p style="text-align:center;margin-top:10px"><button type="button" class="p-bt ok" data-a="paguei">Já paguei</button></p>' : '<button type="button" class="p-bt pri largo" data-a="verPix">Pagar com PIX</button>') : ''}</section>` : ''}
      ${t ? `<section class="p-sec"><h2>Treino de hoje</h2><nav class="p-chips" style="margin:0 -16px 8px;padding:0 16px">${d.treinos.map((x, k) => `<button type="button" class="p-bt" aria-pressed="${k === st.t}" data-a="treino" data-k="${k}">${esc(x.nome)}</button>`).join('')}</nav>
        <p class="p-sub" style="margin:0 0 6px">${esc(t.foco || '')}</p>${t.exercicios.map((e) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(e.nome)}</div><div class="p-s">${esc(e.series)} × ${esc(e.reps)}</div></div><span class="p-num">${e.carga ? `${esc(e.carga)} kg` : ''}</span></div>`).join('')}</section>` : ''}
      ${av.length ? `<section class="p-sec"><h2>Sua evolução</h2><div class="p-grade2"><div class="p-kpi"><small>Peso</small><b>${esc(av[0].peso)} kg</b><span class="p-s">${av.length > 1 ? `${(av[0].peso - av[av.length - 1].peso).toFixed(1).replace('.', ',')} kg desde ${dt(av[av.length - 1].data)}` : dt(av[0].data)}</span></div><div class="p-kpi"><small>Gordura</small><b>${esc(av[0].gordura)}%</b><span class="p-s">${av.length > 1 ? `${(av[0].gordura - av[av.length - 1].gordura).toFixed(1).replace('.', ',')} pontos` : ''}</span></div></div></section>` : ''}
      ${avisoDemo()}${rod()}<div class="p-fixo">${d.checkinHoje || st.entrou ? '<button type="button" class="p-bt ok" disabled>Check-in feito hoje ✓</button>' : `<button type="button" class="p-bt pri" data-a="checkin" ${m?.atrasada ? 'disabled' : ''}>${m?.atrasada ? 'Regularize a mensalidade para entrar' : 'Fazer check-in'}</button>`}</div>`;
  },
  acoes: {
    treino: (el) => { st.t = Number(el.dataset.k); desenhar(); },
    verPix: () => { st.pix = true; desenhar(); },
    checkin: async () => { const r = await responder('checkin', {}); if (r.erro) return alert(r.erro); st.entrou = true; desenhar(); },
    paguei: async () => { const r = await responder('paguei', {}); if (r.erro) return alert(r.erro); pronto('Pagamento informado', 'A academia vai conferir e dar baixa na sua mensalidade.'); },
  },
};

// Imobiliária: vitrine pública, simulador de financiamento e pedido de visita
const parcela = (valor, entrada, anos, taxa) => { const n = anos * 12, i = taxa / 100 / 12, p = valor - entrada; return p <= 0 ? 0 : (p * i) / (1 - (1 + i) ** -n); };
T.vitrine = {
  titulo: () => 'Imóveis',
  render(d) {
    const cod = q.get('i') || st.i;
    const x = cod && d.imoveis.find((y) => y.codigo === cod);
    if (x) return T.vitrine.imovel(d, x);
    st.f ||= 'todos';
    const l = d.imoveis.filter((y) => st.f === 'todos' || y.finalidade === st.f);
    return `${cab(E().nome, 'Imóveis disponíveis', `${d.imoveis.length} imóveis para comprar ou alugar`)}
      <nav class="p-chips">${[['todos', 'Todos'], ['venda', 'Comprar'], ['aluguel', 'Alugar']].map(([k, n]) => `<button type="button" class="p-bt" aria-pressed="${st.f === k}" data-a="fin" data-f="${k}">${n}</button>`).join('')}</nav>
      <section class="p-sec">${l.map((y) => `<a class="p-imovel" href="#" data-a="abrir" data-c="${esc(y.codigo)}">${urlSegura(y.fotos?.[0]) ? `<img src="${esc(urlSegura(y.fotos[0]))}" alt="" loading="lazy">` : ''}<div class="p-t">${esc(y.titulo)}</div><div class="p-s">${esc(y.area)} m²${y.quartos ? ` · ${esc(y.quartos)} quartos` : ''}${y.vagas ? ` · ${esc(y.vagas)} vagas` : ''} · ${esc(y.codigo)}</div><div class="p-num" style="margin-top:4px">${moeda(y.valor)}${y.finalidade === 'aluguel' ? '/mês' : ''}</div></a>`).join('') || '<p class="p-s">Nenhum imóvel nessa busca.</p>'}</section>${rod()}`;
  },
  imovel(d, x) {
    st.ent ??= Math.round(x.valor * 0.2); st.anos ??= 30; st.taxa ??= 10.5;
    const p = parcela(x.valor, st.ent, st.anos, st.taxa), fs = (x.fotos || []).map(urlSegura).filter(Boolean);
    return `${cab(x.codigo, x.titulo, `${esc(x.area)} m²${x.quartos ? ` · ${esc(x.quartos)} quartos` : ''}${x.vagas ? ` · ${esc(x.vagas)} vagas` : ''}`)}
      ${fs.length ? `<section class="p-sec">${fs.length > 1 ? fotos(fs.map((u) => ({ url: u }))) : `<img class="p-foto-grande" src="${esc(fs[0])}" alt="">`}</section>` : ''}
      <section class="p-sec"><div class="p-grade2"><div class="p-kpi"><small>${x.finalidade === 'aluguel' ? 'Aluguel' : 'Valor'}</small><b>${moeda(x.valor)}</b></div><div class="p-kpi"><small>Condomínio</small><b>${x.condominio ? moeda(x.condominio) : '—'}</b></div></div><p class="p-s" style="margin:12px 0 0">${esc(x.descricao || '')}</p></section>
      ${x.finalidade === 'venda' ? `<section class="p-sec"><h2>Simule o financiamento</h2><p class="p-sub">Tabela Price, estimativa. A aprovação e a taxa dependem do banco.</p>
        <label class="p-campo">Entrada<input type="number" data-sim="ent" value="${st.ent}" step="1000" min="0"></label><div class="p-grade2"><label class="p-campo">Prazo (anos)<input type="number" data-sim="anos" value="${st.anos}" min="5" max="35"></label><label class="p-campo">Juros ao ano (%)<input type="number" data-sim="taxa" value="${st.taxa}" step="0.1" min="1"></label></div>
        <div class="p-total"><span>Parcela estimada</span><span>${moeda(p)}</span></div><p class="p-s" style="margin-top:6px">Renda familiar sugerida: ${moeda(p / 0.3)} por mês.</p></section>` : ''}
      <section class="p-sec"><h2>Quero visitar</h2><label class="p-campo">Seu nome<input data-f="nome" autocomplete="name"></label><label class="p-campo">WhatsApp<input data-f="telefone" type="tel" autocomplete="tel"></label><label class="p-campo">Melhor dia e horário<input data-f="quando" placeholder="Ex.: sábado de manhã"></label></section>
      <p style="text-align:center"><button type="button" class="p-bt" data-a="lista">Ver outros imóveis</button></p>${avisoDemo()}${rod()}<div class="p-fixo"><button type="button" class="p-bt pri" data-a="visita" data-c="${esc(x.codigo)}">Pedir visita</button></div>`;
  },
  acoes: {
    fin: (el) => { st.f = el.dataset.f; desenhar(); },
    abrir: (el, e) => { e.preventDefault(); st.i = el.dataset.c; desenhar(); scrollTo(0, 0); },
    lista: () => { st.i = null; if (q.get('i')) history.replaceState(null, '', location.pathname + location.hash); q.delete('i'); desenhar(); },
    visita: async (el) => { lerCampos(); if (!st.nome?.trim() || !st.telefone?.trim()) return alert('Informe nome e WhatsApp.'); const r = await responder('visita', { codigo: el.dataset.c, nome: st.nome, telefone: st.telefone, quando: st.quando || '' }); if (r.erro) return alert(r.erro); pronto('Pedido de visita enviado', 'Um corretor vai chamar você no WhatsApp para combinar o horário.'); },
  },
  entrada: (el) => { st[el.dataset.sim] = Number(el.value) || 0; const pos = el.selectionStart; desenhar(); const n = raiz.querySelector(`[data-sim="${el.dataset.sim}"]`); n?.focus(); try { n?.setSelectionRange(pos, pos); } catch { /* number */ } },
};

// Agenda: agendamento online com sinal por PIX
T.agendar = {
  titulo: () => 'Agendar horário',
  render(d) {
    const s = d.servicos.find((x) => x.id === st.s), profs = d.profissionais.filter((p) => !s || !p.servicos || p.servicos.includes(st.s));
    // horários em que cabe o serviço inteiro (blocos livres de 30 minutos seguidos)
    const cabe = (l, h) => { const m = (x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3)); const need = Math.ceil((s?.duracao || 30) / 30); for (let k = 0; k < need; k++) { const t = m(h) + k * 30; if (!l.includes(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`)) return false; } return true; };
    const livres = st.p ? Object.fromEntries(Object.entries(d.livres[st.p] || {}).map(([k, l]) => [k, l.filter((h) => cabe(l, h))])) : {};
    const dias = Object.keys(livres).filter((k) => livres[k].length).sort().slice(0, 14);
    if (st.passo === 'sinal') return T.agendar.sinal(d, s);
    return `${cab(E().nome, 'Agende o seu horário', 'Escolha o serviço, o profissional e o horário.')}
      <section class="p-sec"><h2>1. Serviço</h2>${d.servicos.map((x) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(x.nome)}</div><div class="p-s">${esc(x.duracao)} min · ${moeda(x.preco)}</div></div><button type="button" class="p-bt peq" aria-pressed="${st.s === x.id}" data-a="s" data-v="${esc(x.id)}">${st.s === x.id ? 'Escolhido' : 'Escolher'}</button></div>`).join('')}</section>
      ${st.s ? `<section class="p-sec"><h2>2. Profissional</h2><div class="p-chips" style="margin:0;padding:0">${profs.map((p) => `<button type="button" class="p-bt" aria-pressed="${st.p === p.id}" data-a="p" data-v="${esc(p.id)}">${esc(p.nome)}</button>`).join('')}</div></section>` : ''}
      ${st.p ? `<section class="p-sec"><h2>3. Dia e horário</h2>${dias.length ? `<div class="p-dias">${dias.map((k) => { const x = new Date(`${k}T12:00`); return `<button type="button" class="p-bt" aria-pressed="${st.d === k}" data-a="d" data-v="${esc(k)}"><span>${DIAS[x.getDay()]}</span><b>${x.getDate()}</b></button>`; }).join('')}</div>
        ${st.d ? `<div class="p-horas" style="margin-top:10px">${(livres[st.d] || []).map((h) => `<button type="button" class="p-bt" aria-pressed="${st.h === h}" data-a="h" data-v="${esc(h)}">${esc(h)}</button>`).join('')}</div>` : ''}` : '<p class="p-s">Sem horários livres nos próximos dias com este profissional.</p>'}</section>` : ''}
      ${st.h ? `<section class="p-sec"><h2>4. Seus dados</h2><label class="p-campo">Nome<input data-f="nome" autocomplete="name" value="${esc(st.nome || '')}"></label><label class="p-campo">WhatsApp<input data-f="telefone" type="tel" autocomplete="tel" value="${esc(st.telefone || '')}"></label></section>` : ''}
      ${avisoDemo()}${rod()}${st.h ? `<div class="p-fixo"><button type="button" class="p-bt pri" data-a="confirmar">${d.sinal?.pct && d.pix?.chave ? `Continuar · sinal de ${moeda((s.preco * d.sinal.pct) / 100)}` : 'Confirmar agendamento'}</button></div>` : ''}`;
  },
  sinal(d, s) {
    const v = Math.round(s.preco * d.sinal.pct) / 100;
    return `${cab(E().nome, 'Sinal para garantir o horário', `${esc(s.nome)} · ${dt(st.d)} às ${esc(st.h)}`)}<section class="p-sec"><h2>Pague ${moeda(v)} pelo PIX</h2><p class="p-sub">O valor é descontado no dia do atendimento.${d.sinal.regra ? ` ${esc(d.sinal.regra)}` : ''}</p>${pixBloco(d.pix, v, `AG${Date.now().toString(36).slice(-8)}`, 'Sinal')}</section>
      ${avisoDemo()}${rod()}<div class="p-fixo"><button type="button" class="p-bt ok" data-a="enviar" data-sinal="1">Já paguei o sinal</button></div>`;
  },
  acoes: {
    s: (el) => { lerCampos(); st.s = el.dataset.v; st.p = st.d = st.h = null; desenhar(); },
    p: (el) => { lerCampos(); st.p = el.dataset.v; st.d = st.h = null; desenhar(); },
    d: (el) => { lerCampos(); st.d = el.dataset.v; st.h = null; desenhar(); },
    h: (el) => { lerCampos(); st.h = el.dataset.v; desenhar(); },
    confirmar: () => { lerCampos(); if (!st.nome?.trim() || !st.telefone?.trim()) return alert('Informe nome e WhatsApp.'); if (ctx.dados.sinal?.pct && ctx.dados.pix?.chave) { st.passo = 'sinal'; desenhar(); scrollTo(0, 0); return; } T.agendar.acoes.enviar(); },
    enviar: async (el) => {
      const r = await responder('agendar', { servico: st.s, profissional: st.p, data: st.d, hora: st.h, nome: st.nome, telefone: st.telefone, sinal: !!el?.dataset?.sinal });
      if (r.erro) return alert(r.erro);
      pronto('Horário agendado', `${dt(st.d)} às ${st.h}. Você recebe a confirmação no WhatsApp na véspera.`);
    },
  },
};

// Jurídico: acompanhamento do processo pelo cliente
T.processo = {
  titulo: (d) => `Processo ${d.numero}`,
  render(d) {
    return `${cab(E().nome, d.assunto || 'Seu processo', `Nº ${esc(d.numero)}${d.vara ? ` · ${esc(d.vara)}` : ''}`)}
      <section class="p-sec"><h2>Situação</h2><p style="margin:0">${esc(d.situacao || 'Em andamento')}</p>${d.advogado ? `<p class="p-s" style="margin:6px 0 0">Responsável: ${esc(d.advogado)}</p>` : ''}</section>
      ${d.proximos?.length ? `<section class="p-sec"><h2>Próximas datas</h2>${d.proximos.map((x) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(x.titulo)}</div><div class="p-s">${dt(x.data)}${x.hora ? ` às ${esc(x.hora)}` : ''}</div></div></div>`).join('')}</section>` : ''}
      <section class="p-sec"><h2>Andamentos</h2>${d.andamentos?.length ? `<ul class="p-tempo">${d.andamentos.map((x) => `<li><div class="p-s">${dt(x.data)}</div><div>${esc(x.texto)}</div></li>`).join('')}</ul>` : '<p class="p-s">Nenhum andamento publicado ainda.</p>'}</section>
      <section class="p-sec"><h2>Falar com o escritório</h2><label class="p-campo">Mensagem<textarea data-f="msg" placeholder="Sua dúvida sobre o processo"></textarea></label><button type="button" class="p-bt pri largo" style="margin-top:10px" data-a="msg">Enviar mensagem</button></section>
      ${avisoDemo()}${rod()}`;
  },
  acoes: { msg: async () => { lerCampos(); if (!st.msg?.trim()) return; const r = await responder('mensagem', { texto: st.msg.slice(0, 1500) }); if (r.erro) return alert(r.erro); pronto('Mensagem enviada', 'O escritório responde pelo WhatsApp ou e-mail.'); } },
};

// CRM: proposta online com aceite
T.proposta = {
  titulo: (d) => d.titulo,
  render(d) {
    if (d.status === 'aceita') return `${cab(E().nome, d.titulo)}<section class="p-sec p-ok"><div class="p-ic">✓</div><h2>Proposta aceita</h2><p class="p-s">Obrigado! ${esc(E().nome)} já está cuidando dos próximos passos.</p></section>${rod()}`;
    const vencida = d.validade && d.validade < new Date().toISOString().slice(0, 10);
    return `${cab(`Proposta ${d.numero ? `nº ${d.numero}` : ''} · ${E().nome}`, d.titulo, `Para ${esc(d.cliente)}${d.validade ? ` · válida até ${dt(d.validade)}` : ''}`)}
      <section class="p-sec"><h2>O que está incluído</h2>${d.itens.map((x) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(x.nome)}</div>${x.qtd > 1 ? `<div class="p-s">${esc(x.qtd)} × ${moeda(x.preco)}</div>` : ''}</div><span class="p-num">${moeda(x.qtd * x.preco)}</span></div>`).join('')}
        ${d.desconto ? `<div class="p-linha"><div class="p-cresce">Desconto</div><span class="p-num">− ${moeda(d.desconto)}</span></div>` : ''}<div class="p-total"><span>Total</span><span>${moeda(d.total)}</span></div></section>
      ${d.condicoes ? `<section class="p-sec"><h2>Condições</h2><p class="p-s" style="white-space:pre-wrap;margin:0">${esc(d.condicoes)}</p></section>` : ''}
      ${vencida ? '<div class="p-aviso">Esta proposta venceu. Fale com o vendedor para atualizar.</div>' : `<section class="p-sec"><h2>Aceitar a proposta</h2><label class="p-campo">Nome completo<input data-f="nome" autocomplete="name"></label><label class="p-campo">CPF ou CNPJ<input data-f="doc" inputmode="numeric"></label><p class="p-s" style="margin-top:8px">Ao aceitar, você concorda com os itens e as condições acima.</p></section>
      <section class="p-sec"><h2>Ficou com alguma dúvida?</h2><label class="p-campo">Escreva aqui<textarea data-f="duvida"></textarea></label><button type="button" class="p-bt largo" style="margin-top:10px" data-a="duvida">Enviar dúvida</button></section>`}
      ${avisoDemo()}${rod()}${vencida ? '' : '<div class="p-fixo"><button type="button" class="p-bt pri" data-a="aceitar">Aceitar proposta</button></div>'}`;
  },
  acoes: {
    aceitar: async () => { lerCampos(); if ((st.nome || '').trim().length < 5 || (st.doc || '').replace(/\D/g, '').length < 11) return alert('Informe o nome completo e o CPF ou CNPJ.'); const r = await responder('aceitar', { nome: st.nome.trim(), documento: st.doc.trim() }); if (r.erro) return alert(r.erro); pronto('Proposta aceita', `Obrigado, ${st.nome.split(' ')[0]}! Já avisamos ${E().nome}.`); },
    duvida: async () => { lerCampos(); if (!st.duvida?.trim()) return; const r = await responder('duvida', { texto: st.duvida.slice(0, 1500) }); if (r.erro) return alert(r.erro); pronto('Dúvida enviada', 'O vendedor vai responder em breve.'); },
  },
  abriu: true,
};

// Gestão: catálogo para clientes revendedores
T.catalogo = {
  titulo: () => 'Catálogo',
  render(d) {
    st.qtd ||= {}; st.busca ??= '';
    const b = st.busca.toLowerCase(), l = d.produtos.filter((x) => !b || `${x.nome} ${x.codigo}`.toLowerCase().includes(b));
    const tot = Object.entries(st.qtd).reduce((s, [id, k]) => s + k * (d.produtos.find((x) => x.id === id)?.preco || 0), 0), n = Object.values(st.qtd).filter(Boolean).length;
    if (st.fechar) return `${cab(E().nome, 'Seu pedido', `${n} produtos · ${moeda(tot)}`)}<section class="p-sec">${Object.entries(st.qtd).filter(([, k]) => k).map(([id, k]) => { const x = d.produtos.find((y) => y.id === id); return `<div class="p-linha"><div class="p-cresce p-t">${esc(k)} ${esc(x.un)} · ${esc(x.nome)}</div><span class="p-num">${moeda(k * x.preco)}</span></div>`; }).join('')}<div class="p-total"><span>Total</span><span>${moeda(tot)}</span></div></section>
      <section class="p-sec"><h2>Seus dados</h2><label class="p-campo">Empresa ou nome<input data-f="nome" value="${esc(st.nome || '')}"></label><label class="p-campo">CNPJ ou CPF<input data-f="doc" value="${esc(st.doc || '')}"></label><label class="p-campo">WhatsApp<input data-f="telefone" type="tel" value="${esc(st.telefone || '')}"></label><label class="p-campo">Observação<input data-f="obs" value="${esc(st.obs || '')}"></label></section>
      ${d.minimo && tot < d.minimo ? `<div class="p-aviso">Pedido mínimo de ${moeda(d.minimo)}.</div>` : ''}<p style="text-align:center"><button type="button" class="p-bt" data-a="voltar">Continuar comprando</button></p>${avisoDemo()}${rod()}<div class="p-fixo"><button type="button" class="p-bt pri" data-a="enviar" ${d.minimo && tot < d.minimo ? 'disabled' : ''}>Enviar pedido</button></div>`;
    return `${cab(E().nome, 'Catálogo de produtos', d.minimo ? `Pedido mínimo de ${moeda(d.minimo)}` : 'Faça o seu pedido pelo celular')}
      <section class="p-sec"><label class="p-campo" style="margin:0"><input type="search" data-busca placeholder="Buscar produto ou código" value="${esc(st.busca)}"></label>
        ${l.slice(0, 80).map((x) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(x.nome)}</div><div class="p-s">${moeda(x.preco)}/${esc(x.un)} · ${x.disponivel ? 'disponível' : '<span style="color:var(--al)">sob consulta</span>'}</div></div>
          <span class="p-qtd">${st.qtd[x.id] ? `<button type="button" data-a="menos" data-i="${esc(x.id)}" aria-label="Menos">−</button><b>${st.qtd[x.id]}</b>` : ''}<button type="button" data-a="mais" data-i="${esc(x.id)}" aria-label="Mais">+</button></span></div>`).join('')}</section>
      ${avisoDemo()}${rod()}${n ? `<div class="p-fixo"><button type="button" class="p-bt pri" data-a="revisar">Revisar pedido · ${moeda(tot)}</button></div>` : ''}`;
  },
  acoes: {
    mais: (el) => { st.qtd[el.dataset.i] = (st.qtd[el.dataset.i] || 0) + 1; desenhar(); },
    menos: (el) => { st.qtd[el.dataset.i] = Math.max(0, (st.qtd[el.dataset.i] || 0) - 1); desenhar(); },
    revisar: () => { st.fechar = true; desenhar(); scrollTo(0, 0); },
    voltar: () => { lerCampos(); st.fechar = false; desenhar(); },
    enviar: async () => { lerCampos(); if (!st.nome?.trim() || !st.telefone?.trim()) return alert('Informe o nome e o WhatsApp.'); const r = await responder('pedido', { nome: st.nome, documento: st.doc || '', telefone: st.telefone, obs: st.obs || '', itens: Object.entries(st.qtd).filter(([, k]) => k).map(([id, qtd]) => ({ id, qtd })) }); if (r.erro) return alert(r.erro); pronto('Pedido enviado', 'Recebemos o seu pedido. Vamos confirmar os valores e o prazo de entrega pelo WhatsApp.'); },
  },
};

// Financeiro: cobrança com PIX
T.cobranca = {
  titulo: (d) => d.descricao,
  render(d) {
    if (d.status === 'pago') return `${cab(E().nome, d.descricao)}<section class="p-sec p-ok"><div class="p-ic">✓</div><h2>Pagamento recebido</h2><p class="p-s">Obrigado!</p></section>${rod()}`;
    const venc = d.vencimento < new Date().toISOString().slice(0, 10);
    return `${cab(E().nome, moeda(d.valor), `${esc(d.descricao)} · ${venc ? 'venceu' : 'vence'} em ${dt(d.vencimento)}`)}
      <section class="p-sec"><h2>Pague com PIX</h2>${d.pix?.chave ? pixBloco(d.pix, d.valor, d.txid, d.descricao) : '<p class="p-s">Fale com a empresa para receber os dados de pagamento.</p>'}</section>
      ${d.cliente ? `<p class="p-s" style="text-align:center;margin-top:12px">Para ${esc(d.cliente)}</p>` : ''}${avisoDemo()}${rod()}<div class="p-fixo"><button type="button" class="p-bt ok" data-a="paguei">Já paguei</button></div>`;
  },
  acoes: { paguei: async () => { const r = await responder('paguei', {}); if (r.erro) return alert(r.erro); pronto('Pagamento informado', 'A empresa vai conferir e confirmar o recebimento.'); } },
};

// Cerimonial: a página dos noivos (contagem, tarefas deles, fornecedores, pagamentos e roteiro)
T.noivos = {
  titulo: (d) => d.nome,
  render(d) {
    const dias = Math.round((new Date(`${d.data}T12:00:00`) - new Date(`${new Date().toISOString().slice(0, 10)}T12:00:00`)) / 864e5);
    const deles = d.tarefas.filter((t) => t.quem === 'noivos'), falta = d.fornecedores.filter((f) => f.falta > 0);
    return `${cab(E().nome, d.nome, `${esc(d.tipo)} · ${dt(d.data)} às ${esc(d.hora)}${d.local ? ` · ${esc(d.local)}` : ''}`)}
      <section class="p-sec" style="text-align:center"><div style="font-size:44px;font-weight:700;letter-spacing:-.03em;color:var(--acc)">${dias > 0 ? dias : dias === 0 ? 'Hoje!' : '♥'}</div><p class="p-s" style="margin:0">${dias > 0 ? `dias para o grande dia` : dias === 0 ? 'É hoje. Aproveitem cada minuto!' : 'Obrigado por nos deixar fazer parte!'}</p>
        <div class="p-passos" style="margin-top:14px"><i class="feito" style="flex:${d.progresso || 1}"></i><i style="flex:${100 - (d.progresso || 0)}"></i></div><p class="p-s" style="margin-top:6px">Planejamento ${esc(d.progresso)}% concluído · assessora ${esc(d.assessora)}</p></section>
      ${deles.length ? `<section class="p-sec"><h2>Suas tarefas</h2><p class="p-sub">Toque para marcar como feita. A assessoria vê na hora.</p>${deles.map((t) => `<div class="p-linha"><div class="p-cresce"><div class="p-t" style="${t.feita ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(t.titulo)}</div><div class="p-s">até ${dt(t.prazo)}</div></div><button type="button" class="p-bt peq" aria-pressed="${t.feita}" data-a="tarefa" data-id="${esc(t.id)}" data-f="${t.feita ? '0' : '1'}">${t.feita ? 'Feita ✓' : 'Marcar'}</button></div>`).join('')}</section>` : ''}
      ${d.fornecedores.length ? `<section class="p-sec"><h2>Fornecedores</h2>${d.fornecedores.map((f) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(f.nome)}</div><div class="p-s">${esc(f.categoria)}${f.instagram ? ` · ${esc(f.instagram)}` : ''}</div></div>${f.telefone ? `<a class="p-bt peq" href="${wa(f.telefone)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</div>`).join('')}</section>` : ''}
      ${falta.length ? `<section class="p-sec"><h2>Pagamentos que faltam</h2>${falta.map((f) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(f.nome)}</div><div class="p-s">${f.vencimento ? `próximo em ${dt(f.vencimento)}` : ''}</div></div><span class="p-num">${moeda(f.falta)}</span></div>`).join('')}<div class="p-total"><span>Total a pagar</span><span>${moeda(falta.reduce((s, f) => s + f.falta, 0))}</span></div></section>` : ''}
      ${d.rsvp ? `<section class="p-sec"><h2>Convidados</h2><p class="p-sub">${esc(d.rsvp.convites)} convites enviados · atualiza quando cada convidado responde.</p><div class="p-linha"><div class="p-cresce p-t">Confirmados</div><span class="p-num">${esc(d.rsvp.sim)} pessoas</span></div><div class="p-linha"><div class="p-cresce p-t">Sem resposta</div><span class="p-num">${esc(d.rsvp.pend)} pessoas</span></div><div class="p-linha"><div class="p-cresce p-t">Não vão</div><span class="p-num">${esc(d.rsvp.nao)} pessoas</span></div></section>` : ''}
      ${d.roteiro.length ? `<section class="p-sec"><h2>Roteiro do dia</h2>${d.roteiro.map((x) => `<div class="p-linha"><b class="p-num" style="min-width:52px">${esc(x.hora)}</b><div class="p-cresce"><div class="p-t" style="${x.feito ? 'opacity:.55' : ''}">${esc(x.atividade)}</div></div>${x.feito ? '<span class="p-et ok">Aconteceu</span>' : ''}</div>`).join('')}</section>` : ''}
      ${avisoDemo()}${rod()}`;
  },
  acoes: {
    tarefa: async (el) => { const feita = el.dataset.f === '1'; const r = await responder('tarefa', { id: el.dataset.id, feita }); if (r.erro) return alert(r.erro); const t = ctx.dados.tarefas.find((x) => x.id === el.dataset.id); if (t) t.feita = feita; desenhar(); },
  },
};

// Cerimonial: convite individual com confirmação de presença (RSVP)
T.convite = {
  titulo: (d) => d.evento,
  render(d) {
    const ac = st.ac ?? d.acompanhantes ?? 0;
    const resp = st.resp || (d.rsvp !== 'pendente' ? d.rsvp : '');
    return `${cab(E().nome, d.evento, `${esc(d.tipo)} · ${dt(d.data)} às ${esc(d.hora)}`)}
      <section class="p-sec" style="text-align:center"><p class="p-s" style="margin:0">Olá,</p><h2 style="margin:4px 0 10px">${esc(d.convidado)}</h2><p class="p-s" style="margin:0">Você está convidado(a)!${d.local ? `<br>${esc(d.local)}` : ''}</p>
        ${d.local ? `<p style="margin-top:12px"><a class="p-bt peq" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.local)}" target="_blank" rel="noopener">Ver no mapa</a></p>` : ''}</section>
      ${resp ? `<section class="p-sec p-ok"><div class="p-ic">${resp === 'sim' ? '✓' : '♥'}</div><h2>${resp === 'sim' ? 'Presença confirmada' : 'Resposta registrada'}</h2><p class="p-s">${resp === 'sim' ? `Esperamos você${ac ? ` e mais ${esc(ac)}` : ''}!` : 'Obrigado por avisar. Sentiremos sua falta.'}</p><button type="button" class="p-bt peq" data-a="mudar">Mudar resposta</button></section>`
        : `<section class="p-sec"><h2>Você vai?</h2><label class="p-campo">Acompanhantes (além de você)<select data-f="ac">${[0, 1, 2, 3, 4].map((n) => `<option value="${n}" ${Number(ac) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <div style="display:flex;gap:8px;margin-top:12px"><button type="button" class="p-bt ok largo" data-a="vou">Vou</button><button type="button" class="p-bt largo" data-a="naoVou">Não vou</button></div></section>`}
      ${avisoDemo()}${rod()}`;
  },
  acoes: {
    vou: async () => { lerCampos(); const ac = Number(st.ac) || 0; const r = await responder('rsvp', { vai: true, acompanhantes: ac }); if (r.erro) return alert(r.erro); st.ac = ac; st.resp = 'sim'; desenhar(); },
    naoVou: async () => { const r = await responder('rsvp', { vai: false, acompanhantes: 0 }); if (r.erro) return alert(r.erro); st.resp = 'nao'; desenhar(); },
    mudar: () => { st.resp = ''; ctx.dados.rsvp = 'pendente'; desenhar(); },
  },
};

// Obras: a página do dono da obra (etapas, pagamento por PIX, diário com fotos e gastos)
T.obra = {
  titulo: (d) => d.titulo,
  render(d) {
    const cobrar = d.etapas.filter((e) => e.status === 'feita' && !e.pago);
    // orçamento esperando aprovação: a página mostra os itens e o botão de aprovar
    if (d.orcamento) {
      const vencido = d.orcamento.validade && d.orcamento.validade < new Date().toISOString().slice(0, 10);
      return `${cab(`Orçamento · ${E().nome}`, d.titulo, `${d.endereco ? `${esc(d.endereco)} · ` : ''}${d.orcamento.validade ? `válido até ${dt(d.orcamento.validade)}` : ''}`)}
        <section class="p-sec"><h2>O que está incluído</h2>${d.orcamento.itens.map((x) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(x.desc)}</div><div class="p-s">${esc(x.qtd)} ${esc(x.unidade || '')}</div></div><span class="p-num">${moeda(x.total)}</span></div>`).join('')}<div class="p-total"><span>Total</span><span>${moeda(d.valor)}</span></div></section>
        ${vencido ? '<div class="p-aviso">Este orçamento venceu. Fale com a gente para atualizar os valores.</div>' : `<section class="p-sec"><h2>Aprovar o orçamento</h2><label class="p-campo">Seu nome completo<input data-f="nome" autocomplete="name"></label><p class="p-s" style="margin-top:8px">Aprovando, a obra entra na agenda e você acompanha cada etapa por esta mesma página.</p></section>`}
        ${avisoDemo()}${rod()}${vencido ? '' : '<div class="p-fixo"><button type="button" class="p-bt pri" data-a="aprovarOrc">Aprovar orçamento</button></div>'}`;
    }
    return `${cab(E().nome, d.titulo, `${d.endereco ? `${esc(d.endereco)} · ` : ''}entrega prevista ${dt(d.previsao)}`)}
      ${d.garantia ? `<section class="p-sec"><h2>Garantia da obra</h2><p class="p-s">Sua obra está na garantia até <b>${dt(d.garantia.ate)}</b>. Viu algum problema? Conte aqui que a gente vem resolver.</p>
        ${d.garantia.chamados.map((x) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(x.descricao)}</div><div class="p-s">${x.status === 'resolvido' ? 'Resolvido' : x.agendado ? `Visita marcada para ${dt(x.agendado)}` : 'Recebido, vamos marcar a visita'}</div></div>${x.status === 'resolvido' ? '<span class="p-et ok">Resolvido</span>' : '<span class="p-et">Em aberto</span>'}</div>`).join('')}
        <label class="p-campo" style="margin-top:10px">O que aconteceu<textarea data-f="chamado" placeholder="Ex.: apareceu uma mancha perto do rodapé"></textarea></label><button type="button" class="p-bt pri largo" style="margin-top:10px" data-a="chamado">Pedir reparo na garantia</button></section>` : ''}
      <section class="p-sec"><h2>Andamento</h2><div class="p-passos">${d.etapas.map((e) => `<i class="${e.status === 'feita' ? 'feito' : ''}"></i>`).join('')}</div><p class="p-s" style="margin-top:8px">${esc(d.progresso)}% concluído · ${d.etapas.filter((e) => e.status === 'feita').length} de ${d.etapas.length} etapas</p>
        ${d.etapas.map((e) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(e.nome)}</div><div class="p-s">${e.status === 'feita' ? 'Concluída' : e.status === 'andamento' ? 'Em andamento agora' : 'A fazer'}</div></div><span class="p-num">${moeda(e.valor)}</span>${e.pago ? '<span class="p-et ok">Paga</span>' : e.avisou ? '<span class="p-et">Conferindo</span>' : ''}</div>`).join('')}
        <div class="p-total"><span>Valor da obra</span><span>${moeda(d.valor)}</span></div></section>
      ${cobrar.map((e) => `<section class="p-sec"><h2>Pagar: ${esc(e.nome)}</h2>${e.avisou ? '<p class="p-s">Você avisou que pagou. Assim que conferirmos, a etapa aparece como paga.</p>' : st[`pix${e.k}`] ? `${pixBloco(d.pix, e.valor, e.txid, e.nome)}<p style="text-align:center;margin-top:10px"><button type="button" class="p-bt ok" data-a="paguei" data-k="${esc(e.k)}">Já paguei</button></p>` : `<p class="p-s">Etapa concluída. Valor: <b>${moeda(e.valor)}</b></p><button type="button" class="p-bt pri largo" data-a="verPix" data-k="${esc(e.k)}">Pagar com PIX</button>`}</section>`).join('')}
      ${(d.aditivos || []).map((x) => `<section class="p-sec"><h2>Serviço extra: ${esc(x.descricao)}</h2>${x.motivo ? `<p class="p-s">${esc(x.motivo)}</p>` : ''}<div class="p-linha"><div class="p-cresce p-t">Valor</div><span class="p-num">${moeda(x.valor)}</span></div>${x.prazo_dias ? `<div class="p-linha"><div class="p-cresce p-t">Prazo a mais</div><span class="p-num">${esc(x.prazo_dias)} dias</span></div>` : ''}
        ${x.status === 'pendente' ? `<div style="display:flex;gap:8px;margin-top:12px"><button type="button" class="p-bt ok largo" data-a="aditivo" data-k="${esc(x.id)}" data-v="1">Aprovar</button><button type="button" class="p-bt largo" data-a="aditivo" data-k="${esc(x.id)}" data-v="0">Recusar</button></div>` : `<p style="margin-top:8px">${x.status === 'aprovado' ? '<span class="p-et ok">Aprovado</span>' : '<span class="p-et">Recusado</span>'}</p>`}</section>`).join('')}
      ${d.qualidade?.length ? `<section class="p-sec"><h2>Vistoria de qualidade</h2><p class="p-sub">O que conferimos em cada etapa concluída.</p>${d.qualidade.map((q) => `<div style="padding:8px 0;border-top:1px solid var(--borda,#eee)"><div class="p-t">${esc(q.nome)}</div>${q.itens.map((t) => `<div class="p-s">✓ ${esc(t)}</div>`).join('')}</div>`).join('')}</section>` : ''}
      ${d.compras?.length ? `<section class="p-sec"><h2>Materiais a comprar</h2><p class="p-sub">Itens que ainda faltam para a obra.</p>${d.compras.map((c) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(c.item)}</div><div class="p-s">${esc(c.quantidade || '')}${c.quem === 'cliente' ? ' · você compra' : ' · nós compramos'}</div></div>${c.estimado ? `<span class="p-num">${moeda(c.estimado)}</span>` : ''}</div>`).join('')}</section>` : ''}
      ${d.diario.length ? `<section class="p-sec"><h2>Diário da obra</h2>${d.diario.map((x) => `<div style="padding:10px 0;border-top:1px solid var(--borda,#eee)"><div class="p-t">${dt(x.data)}${x.etapa ? ` · ${esc(x.etapa)}` : ''}</div><p class="p-s" style="margin:4px 0">${esc(x.texto)}</p>${fotos(x.fotos)}</div>`).join('')}</section>` : ''}
      ${d.gastos?.length ? `<section class="p-sec"><h2>Gastos da obra</h2>${d.gastos.map((g) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(g.descricao)}</div><div class="p-s">${dt(g.data)} · ${esc(g.categoria)}${g.cliente_paga ? ' · pago por você' : ''}</div></div><span class="p-num">${moeda(g.valor)}</span></div>`).join('')}</section>` : ''}
      ${avisoDemo()}${rod()}`;
  },
  acoes: {
    verPix: (el) => { st[`pix${el.dataset.k}`] = true; desenhar(); },
    aprovarOrc: async () => { lerCampos(); if ((st.nome || '').trim().length < 5) return alert('Informe o seu nome completo.'); if (!confirm(`Aprovar o orçamento de ${moeda(ctx.dados.valor)}?`)) return; const r = await responder('aprovar_orc', { nome: st.nome.trim() }); if (r.erro) return alert(r.erro); pronto('Orçamento aprovado', `Obrigado, ${st.nome.split(' ')[0]}! ${E().nome} já recebeu a aprovação e vai combinar o início da obra.`); },
    chamado: async () => { lerCampos(); if (!st.chamado?.trim()) return alert('Conte o que aconteceu.'); const r = await responder('chamado', { descricao: st.chamado.trim().slice(0, 500) }); if (r.erro) return alert(r.erro); pronto('Pedido de reparo enviado', `${E().nome} recebeu o seu pedido e vai chamar você para marcar a visita.`); },
    paguei: async (el) => { const r = await responder('paguei', { k: el.dataset.k }); if (r.erro) return alert(r.erro); const e = ctx.dados.etapas.find((x) => String(x.k) === el.dataset.k); if (e) e.avisou = true; desenhar(); },
    aditivo: async (el) => { const aprovado = el.dataset.v === '1'; if (!confirm(aprovado ? 'Aprovar este serviço extra? O valor entra no total da obra.' : 'Recusar este serviço extra?')) return; const r = await responder('aditivo', { id: el.dataset.k, aprovado }); if (r.erro) return alert(r.erro); const x = ctx.dados.aditivos.find((y) => y.id === el.dataset.k); if (x) x.status = aprovado ? 'aprovado' : 'recusado'; if (aprovado && x) ctx.dados.valor += x.valor; desenhar(); },
  },
};

// Pragas: comprovante de execução do serviço (produtos, garantia, licenças e emergência)
T.comprovante = {
  titulo: (d) => `Comprovante nº ${d.numero}`,
  render(d) {
    const hojeISO = new Date().toISOString().slice(0, 10);
    return `${cab(E().nome, `Comprovante de execução nº ${esc(d.numero)}`, `${esc(d.servico)} · ${dt(d.data)} às ${esc(d.hora)}`)}
      <section class="p-sec"><h2>Serviço</h2>
        <div class="p-linha"><div class="p-cresce"><div class="p-s">Contratante</div><div class="p-t">${esc(d.cliente)}${d.documento ? ` · ${esc(d.documento)}` : ''}</div><div class="p-s">${esc(d.endereco)}</div></div></div>
        <div class="p-linha"><div class="p-cresce"><div class="p-s">Pragas-alvo</div><div class="p-t">${esc(d.pragas.join(', ') || '—')}</div></div></div>
        <div class="p-linha"><div class="p-cresce"><div class="p-s">Áreas tratadas</div><div class="p-t">${esc(d.areas || '—')}</div></div></div>
        <div class="p-linha"><div class="p-cresce"><div class="p-s">Técnico</div><div class="p-t">${esc(d.tecnico)}</div></div></div>
        <div class="p-linha"><div class="p-cresce"><div class="p-s">Garantia</div><div class="p-t">${esc(d.garantia)} dias · até ${dt(d.garantia_ate)}</div></div>${d.garantia_ate >= hojeISO ? '<span class="p-et ok">Valendo</span>' : '<span class="p-et">Vencida</span>'}</div></section>
      <section class="p-sec"><h2>Produtos utilizados</h2>${d.produtos.length ? d.produtos.map((p) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(p.nome)}</div><div class="p-s">${esc(p.ingrediente)} ${esc(p.concentracao || '')} · ${esc(p.grupo || '')}</div><div class="p-s">Registro MS ${esc(p.registro || '—')} · lote ${esc(p.lote || '—')}</div></div><span class="p-num">${esc(String(p.quantidade).replace('.', ','))} ${esc(p.unidade)}</span></div>`).join('') : '<p class="p-s">Nenhum produto químico aplicado.</p>'}</section>
      <section class="p-sec"><h2>Em caso de acidente</h2><p class="p-s" style="margin:0 0 6px">${esc([...new Set(d.produtos.map((p) => p.antidoto).filter(Boolean))].join('; ') || 'Procure atendimento médico levando este comprovante.')}</p><p class="p-t" style="margin:0">${esc(d.emergencia)}</p></section>
      <section class="p-sec"><h2>Empresa responsável</h2>${d.licencas.map(([n, numero, ate]) => `<div class="p-linha"><div class="p-cresce"><div class="p-s">${esc(n)}</div><div class="p-t">${esc(numero || '—')}</div></div><span class="p-s">até ${dt(ate)}</span></div>`).join('')}<div class="p-linha"><div class="p-cresce"><div class="p-s">Responsável técnico</div><div class="p-t">${esc(d.responsavel)} · ${esc(d.conselho)}</div></div></div>${d.cnpj ? `<p class="p-s" style="margin-top:8px">CNPJ ${esc(d.cnpj)}</p>` : ''}</section>
      ${d.pontos?.length ? `<section class="p-sec"><h2>Pontos de monitoramento</h2><p class="p-sub">${d.pontos.filter((x) => x.status === 'consumida').length} de ${d.pontos.length} iscas com consumo nesta visita.</p>${d.pontos.map((x) => `<div class="p-linha"><b class="p-num" style="min-width:52px">${esc(x.codigo)}</b><div class="p-cresce"><div class="p-t">${esc(x.local)}</div></div><span class="p-et ${{ intacta: 'ok', consumida: 'er', ausente: 'al' }[x.status] || ''}">${esc({ intacta: 'Intacta', consumida: 'Consumida', substituida: 'Substituída', ausente: 'Ausente' }[x.status] || x.status)}</span></div>`).join('')}</section>` : ''}
      ${d.ocorrencias?.length ? `<section class="p-sec"><h2>O que encontramos</h2><p class="p-sub">Ajustes no local que ajudam a manter as pragas longe.</p>${d.ocorrencias.map((x) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(x.problema)}</div><div class="p-s">${esc(x.recomendacao)}</div></div></div>`).join('')}</section>` : ''}
      ${d.fotos?.length ? `<section class="p-sec"><h2>Fotos</h2>${fotos(d.fotos)}</section>` : ''}
      ${d.garantia_ate >= hojeISO ? d.retorno ? `<section class="p-sec p-ok"><p class="p-s" style="margin:0">Retorno em garantia pedido${d.retorno_data ? ` · agendado para ${dt(d.retorno_data)}` : ''}. A empresa vai confirmar o horário.</p></section>` : st.pedirRetorno ? `<section class="p-sec"><h2>Pedir retorno em garantia</h2><label class="p-campo">O que está acontecendo?<textarea data-f="motivo" rows="3" placeholder="Ex.: voltaram a aparecer baratas na cozinha">${esc(st.motivo || '')}</textarea></label><button type="button" class="p-bt pri largo" data-a="retorno" style="margin-top:10px">Enviar pedido</button></section>` : `<p style="text-align:center;margin-top:12px"><button type="button" class="p-bt" data-a="abrirRetorno">A praga voltou? Pedir retorno em garantia</button></p>` : ''}
      ${d.confirmado ? `<section class="p-sec p-ok"><p class="p-s" style="margin:0">Recebimento confirmado${d.recebido_por ? ` por ${esc(d.recebido_por)}` : ''}.</p></section>` : `<section class="p-sec"><h2>Confirmar recebimento</h2><label class="p-campo">Seu nome<input data-f="nome" value="${esc(st.nome ?? d.recebido_por ?? '')}"></label><button type="button" class="p-bt pri largo" data-a="confirmar" style="margin-top:10px">Confirmar que recebi</button></section>`}
      <p style="text-align:center;margin-top:12px"><button type="button" class="p-bt" data-a="imprimir">Imprimir ou salvar em PDF</button></p>
      ${avisoDemo()}${rod()}`;
  },
  acoes: {
    confirmar: async () => { lerCampos(); const r = await responder('confirmar', { nome: (st.nome || '').trim() }); if (r.erro) return alert(r.erro); ctx.dados.confirmado = true; ctx.dados.recebido_por = (st.nome || '').trim(); desenhar(); },
    imprimir: () => window.print(),
    abrirRetorno: () => { st.pedirRetorno = true; desenhar(); },
    retorno: async () => { lerCampos(); if (!(st.motivo || '').trim()) return alert('Conte rapidamente o que está acontecendo.'); const r = await responder('retorno', { motivo: st.motivo.trim() }); if (r.erro) return alert(r.erro); ctx.dados.retorno = true; desenhar(); },
  },
};

// Ofixl: acompanhamento da visita técnica, aprovação do orçamento, comprovante, PIX e avaliação
T.atendimento = {
  titulo: (d) => `${d.status === 'orcamento' ? 'Orçamento' : 'Ordem de serviço'} nº ${d.numero}`,
  render(d) {
    st.aprov ||= Object.fromEntries(d.itens.filter((x) => x.aprovado == null).map((x) => [x.k, true]));
    const etapas = d.etapas.filter(([k]) => k !== 'orcamento'), i = etapas.findIndex(([k]) => k === d.status), pend = d.itens.some((x) => x.aprovado == null);
    const valendo = d.itens.filter((x) => (x.aprovado == null ? st.aprov[x.k] : x.aprovado));
    const total = valendo.reduce((s, x) => s + x.qtd * x.preco, 0) - (d.desconto || 0);
    const hojeISO = new Date().toISOString().slice(0, 10), concluida = d.status === 'concluida';
    return `${cab(E().nome, `${esc(d.tipo)}`, `${d.status === 'orcamento' ? 'Orçamento' : 'Ordem de serviço'} nº ${esc(d.numero)} · ${dt(d.data)}${d.hora ? ` às ${esc(d.hora)}` : ''}`)}
      ${d.status !== 'orcamento' ? `<section class="p-sec"><h2>${concluida ? 'Serviço concluído' : d.status === 'caminho' ? 'O técnico está a caminho' : d.status === 'atendimento' ? 'Em atendimento' : 'Visita agendada'}</h2><div class="p-passos">${etapas.map((_, k) => `<i class="${k <= i ? 'feito' : ''}"></i>`).join('')}</div><div class="p-passos-rot"><span>Agendada</span><b style="color:var(--acc)">${esc(etapas[i]?.[1] || '')}</b><span>Concluída</span></div>
        <p class="p-s" style="margin-top:10px">Técnico: <b>${esc(d.tecnico)}</b>${d.endereco ? ` · ${esc(d.endereco)}` : ''}</p>${d.aparelhos?.length ? `<p class="p-s" style="margin-top:4px">Aparelhos: ${esc(d.aparelhos.join('; '))}</p>` : ''}</section>` : ''}
      <section class="p-sec"><h2>${pend ? 'Orçamento para aprovar' : 'Serviços e materiais'}</h2>${pend ? '<p class="p-sub">Marque o que você quer fazer. O que não for aprovado fica anotado para depois.</p>' : ''}
        ${d.itens.map((x) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(x.descricao)}${x.qtd !== 1 ? ` <span class="p-s">× ${esc(x.qtd)}</span>` : ''}</div></div><span class="p-num">${moeda(x.qtd * x.preco)}</span>
          ${x.aprovado == null ? `<button type="button" class="p-bt peq" aria-pressed="${!!st.aprov[x.k]}" data-a="marcar" data-k="${esc(x.k)}">${st.aprov[x.k] ? 'Aprovado' : 'Não agora'}</button>` : x.aprovado ? '' : '<span class="p-et">Recusado</span>'}</div>`).join('')}
        ${d.desconto ? `<div class="p-linha"><div class="p-cresce">Desconto</div><span class="p-num">− ${moeda(d.desconto)}</span></div>` : ''}
        <div class="p-total"><span>Total</span><span>${moeda(pend ? total : d.total)}</span></div></section>
      ${d.relato || d.diagnostico ? `<section class="p-sec"><h2>O que foi visto</h2>${d.relato ? `<p class="p-s" style="margin:0 0 6px">Você relatou: ${esc(d.relato)}</p>` : ''}${d.diagnostico ? `<p class="p-s" style="margin:0">Técnico: ${esc(d.diagnostico)}</p>` : ''}</section>` : ''}
      ${d.checklist?.length ? `<section class="p-sec"><h2>Checklist do serviço</h2>${d.checklist.map((x) => `<div class="p-linha"><div class="p-cresce"><div class="p-t">${esc(x.item)}</div></div><span class="p-et ${x.feito ? 'ok' : ''}">${x.feito ? 'Feito' : '—'}</span></div>`).join('')}${d.garantia_ate ? `<p class="p-s" style="margin-top:10px">Garantia de ${esc(d.garantia)} dias, até <b>${dt(d.garantia_ate)}</b>${d.garantia_ate >= hojeISO ? '' : ' (vencida)'}.</p>` : ''}</section>` : ''}
      ${d.fotos?.length ? `<section class="p-sec"><h2>Fotos</h2>${fotos(d.fotos)}</section>` : ''}
      ${concluida && !d.pago ? `<section class="p-sec"><h2>Pagamento</h2>${d.informado ? '<p class="p-s">Você avisou que pagou. Assim que a empresa conferir, aparece como pago.</p>' : d.pix?.chave ? `${pixBloco(d.pix, d.total, d.txid, `${d.tipo} nº ${d.numero}`)}<p style="margin-top:10px"><button type="button" class="p-bt ok largo" data-a="paguei">Já paguei</button></p>` : '<p class="p-s">Fale com a empresa para receber os dados de pagamento.</p>'}</section>` : concluida ? '<section class="p-sec p-ok"><p class="p-s" style="margin:0">Pagamento recebido. Obrigado!</p></section>' : ''}
      ${concluida ? d.avaliacao ? `<section class="p-sec p-ok"><p class="p-s" style="margin:0">Obrigado pela avaliação: ${'★'.repeat(d.avaliacao)}${'☆'.repeat(5 - d.avaliacao)}</p></section>` : `<section class="p-sec"><h2>Como foi o atendimento?</h2><div style="display:flex;gap:6px;justify-content:center;margin:8px 0">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="p-bt peq" aria-pressed="${st.nota === n}" data-a="nota" data-n="${n}">${n <= (st.nota || 0) ? '★' : '☆'}</button>`).join('')}</div><label class="p-campo">Quer deixar um comentário?<textarea data-f="comentario" rows="2">${esc(st.comentario || '')}</textarea></label><p style="margin-top:10px"><button type="button" class="p-bt largo" data-a="avaliar">Enviar avaliação</button></p></section>` : ''}
      ${concluida ? '<p style="text-align:center;margin-top:12px"><button type="button" class="p-bt" data-a="imprimir">Imprimir ou salvar em PDF</button></p>' : ''}
      ${avisoDemo()}${rod()}${pend ? `<div class="p-fixo"><button type="button" class="p-bt pri" data-a="aprovar">Aprovar · ${moeda(total)}</button></div>` : ''}`;
  },
  acoes: {
    marcar: (el) => { st.aprov[el.dataset.k] = !st.aprov[el.dataset.k]; desenhar(); },
    aprovar: async () => { if (!Object.values(st.aprov).some(Boolean) && !confirm('Recusar todo o orçamento?')) return; const r = await responder('aprovar', { itens: st.aprov }); if (r.erro) return alert(r.erro); pronto('Resposta enviada', 'A empresa já recebeu e vai combinar o dia da visita.'); },
    paguei: async () => { const r = await responder('paguei', {}); if (r.erro) return alert(r.erro); ctx.dados.informado = true; desenhar(); },
    nota: (el) => { lerCampos(); st.nota = Number(el.dataset.n); desenhar(); },
    avaliar: async () => { lerCampos(); if (!st.nota) return alert('Escolha de 1 a 5 estrelas.'); const r = await responder('avaliar', { nota: st.nota, comentario: (st.comentario || '').trim().slice(0, 300) }); if (r.erro) return alert(r.erro); ctx.dados.avaliacao = st.nota; desenhar(); },
    imprimir: () => window.print(),
  },
};

// ---------------------------------------------------------------- motor
function lerCampos() { raiz.querySelectorAll('[data-f]').forEach((x) => { st[x.dataset.f] = x.value; }); }
function desenhar() {
  const t = T[ctx.tipo];
  raiz.innerHTML = t ? t.render(ctx.dados) : '<p class="p-erro">Este link não é suportado.</p>';
  t?.depois?.(ctx.dados);
}
raiz.addEventListener('click', (e) => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  if (el.dataset.a === 'copiarPix') { const t = raiz.querySelector('[data-pix]'); navigator.clipboard?.writeText(t.value).catch(() => { t.select(); document.execCommand('copy'); }); el.textContent = 'Código copiado ✓'; return; }
  const f = T[ctx.tipo]?.acoes?.[el.dataset.a]; if (f) f(el, e);
});
raiz.addEventListener('input', (e) => {
  if (e.target.matches('[data-busca]')) { st.busca = e.target.value; const pos = e.target.selectionStart; desenhar(); const n = raiz.querySelector('[data-busca]'); n.focus(); n.setSelectionRange(pos, pos); }
  if (e.target.matches('[data-sim]')) T.vitrine.entrada(e.target);
});

(async () => {
  try {
    ctx = await carregar();
    document.documentElement.style.setProperty('--acc', ctx.dados?._empresa?.cor || '#2f6fed');
    if (ctx.dados?._empresa?.produto) document.documentElement.dataset.produto = ctx.dados._empresa.produto;
    document.title = `${T[ctx.tipo]?.titulo?.(ctx.dados) || 'Página do cliente'} · ${ctx.dados?._empresa?.nome || ctx.empresa || ''}`;
    desenhar();
    if (T[ctx.tipo]?.abriu) responder('abriu', {});
  } catch (e) {
    raiz.innerHTML = `<p class="p-erro">${esc(e.message || 'Não foi possível abrir este link.')}</p>`;
  }
})();
