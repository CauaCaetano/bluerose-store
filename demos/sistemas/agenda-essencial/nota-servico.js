// Jano · Nota fiscal de serviço (NFS-e) — 22/11/2026. Adaptado da NFC-e do Popina para quem atende com hora marcada.
// "Como você emite nota hoje?" (db.nf.modo):
//   api   → a conta do próprio profissional num emissor (Focus NFe ou Brasil NFe). O token vai para o servidor
//           (window.veltriaNfse, função configurável; cifrado em nexo_segredos) e nunca fica no aparelho.
//           Enquanto a função não estiver no ar, aparece "em breve" e dá para anotar a nota feita no Emissor Nacional.
//   outro → emite no Emissor Nacional, na prefeitura ou pelo contador: anota o número em cada atendimento e exporta o período.
//   nao   → não emite (MEI/autônomo sem nota): nada aparece.
// Só ACRESCENTA campos (há assinante real com dados): db.nf, ag.nfse, ag.nfOutro, cliente.doc e cliente.email.
// Na demonstração tudo é simulado (nota de exemplo, ambiente de teste, sem valor fiscal).
let X = null; // { db(), grava, toast, folha, t, din, cli, serv, preco, iso, hh, mostra }
export function liga(ctx) { X = ctx; }
const db = () => X.db();
const nf = () => db().nf || {};
const setNf = (p) => { db().nf = { ...nf(), ...p }; X.grava(); };
const CONTA = () => typeof window.veltriaNfse === 'function';
const soDig = (s) => String(s || '').replace(/\D/g, '');
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const EMISSOR_NACIONAL = 'https://www.nfse.gov.br/EmissorNacional';
const PROV = { focus: ['Focus NFe', 'No painel da Focus NFe: Minhas empresas › a sua empresa › Tokens.'], brasilnfe: ['Brasil NFe', 'No painel da Brasil NFe: Empresas › a sua empresa › Token da empresa.'] };
const MODOS = [
  ['api', 'Tenho conta numa API de nota', 'Focus NFe ou Brasil NFe: você cola o token e a nota sai pela sua conta.'],
  ['outro', 'Emito no Emissor Nacional, na prefeitura ou pelo contador', 'Você anota o número da nota em cada atendimento e exporta o mês.'],
  ['nao', 'Não emito nota', 'Nada de nota aparece nos atendimentos.'],
];
let servidor = null; // { conectado, provedor, ambiente, desligado }
const chamar = (body) => (CONTA() ? window.veltriaNfse(body) : Promise.resolve({ ok: false, mensagem: 'Entre na conta.' }));
function lerStatus() {
  if (!CONTA()) { servidor = { conectado: !!nf().conectadoDemo, provedor: nf().provedor || 'focus', ambiente: 'homologacao', demo: true }; return Promise.resolve(servidor); }
  return chamar({ acao: 'status' }).then((s) => { servidor = s || {}; return servidor; }).catch(() => (servidor = { desligado: true }));
}
const apiPronta = () => nf().modo === 'api' && servidor && !servidor.desligado && (servidor.demo || servidor.conectado);
// no modo API sem o servidor no ar, o atendimento oferece anotar a nota feita por fora (igual ao modo "outro")
const anota = () => nf().modo === 'outro' || (nf().modo === 'api' && !apiPronta());

// ------------------------------------------------------------------ a nota do atendimento (neutra: o servidor traduz para cada emissor)
const descricao = (a) => `${X.serv(a.serv).nome}${nf().descricao ? ` · ${nf().descricao}` : ''}`.slice(0, 1000);
function notaDo(a, tom) {
  const P = nf().prestador || {};
  return { data: X.iso(a.dia), servico: { descricao: descricao(a), valor: r2(X.preco(a)), codigo_tributacao_nacional: soDig(nf().codigo) || '', item_lc116: nf().item || '', ...(Number(nf().aliquota) > 0 ? { aliquota_iss: Number(nf().aliquota) } : {}) },
    tomador: { nome: tom.nome, doc: soDig(tom.doc), email: tom.email || '' }, prestador: { cnpj: soDig(P.cnpj), im: P.im || '', municipio_ibge: soDig(P.ibge), simples: P.simples !== false } };
}
const emAndamento = new Set();
async function emitir(a, tom) {
  if (emAndamento.has(a.id)) return; emAndamento.add(a.id);
  const tent = a.nfTentativas || 0, ref = `${String(a.id).replace(/[^\w-]/g, '').slice(0, 40)}${tent ? `-${tent}` : ''}`;
  X.toast('Emitindo a nota de serviço…');
  let r;
  try {
    r = CONTA() ? await chamar({ acao: 'emitir', ref, nota: notaDo(a, tom) })
      : await new Promise((ok) => setTimeout(() => { const n = db().ags.filter((x) => x.nfse?.demo).length + 101; ok({ ok: true, status: 'autorizada', numero: n, codigo_verificacao: Math.random().toString(36).slice(2, 10).toUpperCase(), pdf: '', ambiente: 'homologacao', demo: true }); }, 600));
  } catch { r = { ok: false, mensagem: 'Sem internet agora. Tente de novo.' }; }
  emAndamento.delete(a.id);
  if (!r?.ok) { a.nfTentativas = tent + (r?.desligado ? 0 : 1); a.nfErro = String(r?.mensagem || 'A nota não saiu.').slice(0, 300); X.grava(); X.toast(r?.desligado ? 'A emissão pela API ainda não está ativa. Anote a nota feita no Emissor Nacional.' : `A nota não saiu: ${a.nfErro}`); if (r?.desligado) servidor = { ...servidor, desligado: true }; return; }
  a.nfse = { status: r.status === 'processando' ? 'processando' : 'autorizada', ref, numero: r.numero ? String(r.numero).slice(0, 20) : '', codigo: String(r.codigo_verificacao || '').slice(0, 40),
    pdf: /^https:\/\//.test(String(r.pdf || '')) ? String(r.pdf).slice(0, 500) : '', ambiente: r.ambiente || nf().ambiente || 'homologacao', tomador: tom.nome, doc: soDig(tom.doc), ts: Date.now(), ...(r.demo ? { demo: true } : {}) };
  delete a.nfErro; X.grava();
  X.toast(a.nfse.status === 'processando' ? 'Nota enviada: a prefeitura ainda está processando.' : `Nota de serviço${a.nfse.numero ? ` nº ${a.nfse.numero}` : ''} emitida${a.nfse.ambiente !== 'producao' ? ' (teste)' : ''}.`);
}
async function consultar(a) {
  const r = CONTA() ? await chamar({ acao: 'consultar', ref: a.nfse.ref }) : { ok: true, status: 'autorizada' };
  if (!r?.ok) return X.toast(r?.mensagem || 'Ainda sem resposta da prefeitura.');
  Object.assign(a.nfse, { status: r.status || a.nfse.status, ...(r.numero ? { numero: String(r.numero) } : {}), ...(r.codigo_verificacao ? { codigo: String(r.codigo_verificacao) } : {}), ...(/^https:\/\//.test(String(r.pdf || '')) ? { pdf: r.pdf } : {}) });
  X.grava(); X.toast(a.nfse.status === 'autorizada' ? 'Nota autorizada.' : 'Ainda processando. Tente daqui a pouco.');
}
async function cancelar(a, motivo) {
  if (motivo.length < 15) return X.toast('Escreva o motivo com pelo menos 15 letras.'), false;
  const r = CONTA() && !a.nfse.demo ? await chamar({ acao: 'cancelar', ref: a.nfse.ref, motivo }) : { ok: true };
  if (!r?.ok) return X.toast(r?.mensagem || 'A prefeitura não aceitou o cancelamento.'), false;
  a.nfse = { ...a.nfse, status: 'cancelada', cancelada: { ts: Date.now(), motivo } }; X.grava(); X.toast('Nota cancelada.'); return true;
}

// ------------------------------------------------------------------ o bloco no atendimento (folha do horário)
const t = (s) => X.t(s);
export function bloco(a) {
  const m = nf().modo; if (!m || m === 'nao' || a.st !== 'feito') return '';
  const c = X.cli(a.cli), n = a.nfse;
  if (n && n.status !== 'cancelada') return `<div class="cartao nfs-bloco"><b>Nota de serviço</b>
    <p class="mini" style="margin:4px 0 8px"><span class="selo ${n.status === 'autorizada' ? 'ok' : 'at'}">${n.status === 'autorizada' ? `NFS-e${n.numero ? ` nº ${t(n.numero)}` : ''}` : 'Processando'}</span>${n.ambiente !== 'producao' ? ' teste, sem valor fiscal' : ''}${n.codigo ? ` · código ${t(n.codigo)}` : ''}</p>
    <div class="linha" style="margin:0">${n.pdf ? `<a class="bt pq" href="${t(n.pdf)}" target="_blank" rel="noopener">Ver a nota (PDF)</a>` : `<button type="button" class="bt pq" data-nfs-ver>Ver a nota</button>`}${n.status === 'processando' ? '<button type="button" class="bt pq" data-nfs-consultar>Conferir de novo</button>' : ''}<button type="button" class="bt pq" data-nfs-cancelar>Cancelar a nota</button></div></div>`;
  if (anota()) return `<div class="cartao nfs-bloco"><b>Nota de serviço</b>${a.nfOutro ? `<p class="mini" style="margin:4px 0 8px"><span class="selo ok">NFS-e nº ${t(a.nfOutro.ref || '—')}</span> anotada</p>` : `<p class="mini" style="margin:4px 0 8px">Emitiu a nota de ${t(c.nome.split(' ')[0])}? Anote o número para saber quem já tem nota.</p>`}
    <div class="linha" style="margin:0"><button type="button" class="bt pq ${a.nfOutro ? '' : 'cheio'}" data-nfs-anotar>${a.nfOutro ? 'Mudar o número' : 'Anotar o nº da NFS-e'}</button><a class="bt pq" href="${EMISSOR_NACIONAL}" target="_blank" rel="noopener">Emissor Nacional</a></div></div>`;
  return `<div class="cartao nfs-bloco"><b>Nota de serviço</b>${n?.status === 'cancelada' ? `<p class="mini" style="margin:4px 0 0">A nota${n.numero ? ` nº ${t(n.numero)}` : ''} foi cancelada.</p>` : ''}${a.nfErro ? `<p class="mini" style="margin:4px 0 0;color:#8a3324">Última tentativa: ${t(a.nfErro)}</p>` : ''}
    <button type="button" class="bt cheio largo" data-nfs-emitir style="margin-top:8px">Emitir a NFS-e de ${X.din(X.preco(a))}</button></div>`;
}
export function ligaBloco(f, a, pronto) {
  const c = X.cli(a.cli);
  f.querySelector('[data-nfs-emitir]')?.addEventListener('click', () => {
    f.innerHTML = `<h2>Nota de ${t(c.nome.split(' ')[0])}</h2><p class="sub">${t(descricao(a))} · ${X.din(X.preco(a))}${(nf().ambiente || 'homologacao') !== 'producao' || !CONTA() ? ' · ambiente de teste' : ''}</p>
      <form><label class="campo">Nome de quem recebe a nota<input name="nome" maxlength="115" value="${t(c.nome)}" required></label>
      <label class="campo">CPF ou CNPJ<input name="doc" inputmode="numeric" maxlength="18" value="${t(c.doc || '')}" placeholder="Só números" required></label>
      <label class="campo">E-mail para mandar a nota (opcional)<input name="email" type="email" maxlength="80" value="${t(c.email || '')}"></label>
      ${!CONTA() ? '<p class="mini" style="margin:-4px 0 10px">Demonstração: sai uma nota de exemplo, sem valor fiscal.</p>' : ''}
      <div style="display:grid;gap:8px"><button class="bt cheio largo">Emitir</button><button type="button" class="bt largo" data-fecha style="border-style:dashed">Voltar</button></div></form>`;
    f.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault(); const fd = new FormData(e.target), doc = soDig(fd.get('doc')), nome = String(fd.get('nome') || '').trim(), email = String(fd.get('email') || '').trim();
      if (doc.length !== 11 && doc.length !== 14) return X.toast('Escreva o CPF (11 números) ou o CNPJ (14).');
      if (!nome) return X.toast('Escreva o nome.');
      if (!c.doc) c.doc = doc; if (email && !c.email) c.email = email; // só preenche o que estava vazio
      e.target.querySelector('button').disabled = true;
      await emitir(a, { nome, doc, email }); pronto();
    });
  });
  f.querySelector('[data-nfs-consultar]')?.addEventListener('click', async () => { await consultar(a); pronto(); });
  f.querySelector('[data-nfs-ver]')?.addEventListener('click', () => verNota(a));
  f.querySelector('[data-nfs-cancelar]')?.addEventListener('click', () => {
    f.innerHTML = `<h2>Cancelar a nota${a.nfse.numero ? ` nº ${t(a.nfse.numero)}` : ''}?</h2><p class="sub">O motivo vai para a prefeitura (no mínimo 15 letras). Depois de alguns dias, só o contador cancela.</p>
      <div class="chips">${['Serviço não foi prestado', 'Nota emitida com valor errado', 'Nota emitida para a pessoa errada'].map((m) => `<button type="button" data-nfs-motivo>${m}</button>`).join('')}</div>
      <label class="campo">Motivo<input id="nfs-motivo" maxlength="200"></label>
      <div style="display:grid;gap:8px"><button type="button" class="bt cheio largo" data-nfs-cancela-ok>Cancelar a nota</button><button type="button" class="bt largo" data-fecha style="border-style:dashed">Voltar</button></div>`;
    f.querySelectorAll('[data-nfs-motivo]').forEach((b) => b.addEventListener('click', () => { f.querySelector('#nfs-motivo').value = b.textContent; }));
    f.querySelector('[data-nfs-cancela-ok]').addEventListener('click', async () => { if (await cancelar(a, f.querySelector('#nfs-motivo').value.trim())) pronto(); });
  });
  f.querySelector('[data-nfs-anotar]')?.addEventListener('click', () => {
    f.innerHTML = `<h2>Número da NFS-e</h2><p class="sub">${t(c.nome)} · ${t(X.serv(a.serv).nome)} · ${X.din(X.preco(a))}</p>
      <form><label class="campo">Número da nota<input name="ref" maxlength="40" value="${t(a.nfOutro?.ref || '')}" required></label>
      <label class="campo">CPF ou CNPJ de quem recebeu (opcional)<input name="doc" inputmode="numeric" maxlength="18" value="${t(c.doc || '')}"></label>
      <p class="mini" style="margin:-4px 0 10px">Serve para você saber quem já tem nota e para a planilha do contador.</p>
      <div style="display:grid;gap:8px"><button class="bt cheio largo">Anotar</button>${a.nfOutro ? '<button type="button" class="bt largo" data-nfs-tira>Tirar o número</button>' : ''}<button type="button" class="bt largo" data-fecha style="border-style:dashed">Voltar</button></div></form>`;
    f.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault(); const fd = new FormData(e.target), ref = String(fd.get('ref') || '').trim().slice(0, 40), doc = soDig(fd.get('doc'));
      if (!ref) return X.toast('Escreva o número da nota.');
      if (doc && doc.length !== 11 && doc.length !== 14) return X.toast('O CPF tem 11 números e o CNPJ, 14.');
      if (doc && !c.doc) c.doc = doc;
      a.nfOutro = { ref, ts: Date.now() }; X.grava(); X.toast(`NFS-e nº ${ref} anotada.`); pronto();
    });
    f.querySelector('[data-nfs-tira]')?.addEventListener('click', () => { delete a.nfOutro; X.grava(); X.toast('Número tirado.'); pronto(); });
  });
}
// prévia da nota (a nota de verdade é o PDF do emissor)
function verNota(a) {
  const n = a.nfse, P = nf().prestador || {};
  X.folha(`<h2>NFS-e${n.numero ? ` nº ${t(n.numero)}` : ''}</h2>${n.ambiente !== 'producao' ? '<p class="selo at" style="margin:0 0 10px">Ambiente de teste · sem valor fiscal</p>' : ''}
    <div class="cartao"><p class="mini" style="margin:0">Prestador</p><b>${t(db().studio)}</b><p class="mini" style="margin:2px 0 8px">CNPJ ${t(P.cnpj || '—')}${P.im ? ` · IM ${t(P.im)}` : ''}</p>
    <p class="mini" style="margin:0">Tomador</p><b>${t(n.tomador || X.cli(a.cli).nome)}</b><p class="mini" style="margin:2px 0 8px">${n.doc ? `${n.doc.length === 14 ? 'CNPJ' : 'CPF'} ${t(n.doc)}` : ''}</p>
    <p class="mini" style="margin:0">Serviço</p><b>${t(descricao(a))}</b><p class="mini" style="margin:2px 0 8px">${X.iso(a.dia).split('-').reverse().join('/')}${nf().codigo ? ` · código ${t(nf().codigo)}` : ''}</p>
    <p class="mini" style="margin:0">Valor</p><b>${X.din(X.preco(a))}</b>${n.codigo ? `<p class="mini" style="margin:8px 0 0">Código de verificação: ${t(n.codigo)}</p>` : ''}</div>
    <button type="button" class="bt largo" data-fecha style="border-style:dashed">Fechar</button>`);
}

// ------------------------------------------------------------------ exportar o período (CSV para lançar no emissor ou mandar ao contador)
const PER = [['7', 'Últimos 7 dias'], ['mes', 'Este mês'], ['mespassado', 'Mês passado']];
function noPeriodo(a, k) {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + a.dia); const h = new Date(); h.setHours(0, 0, 0, 0);
  if (k === '7') return a.dia <= 0 && a.dia > -7;
  if (k === 'mes') return d.getFullYear() === h.getFullYear() && d.getMonth() === h.getMonth() && a.dia <= 0;
  const p = new Date(h.getFullYear(), h.getMonth() - 1, 1); return d.getFullYear() === p.getFullYear() && d.getMonth() === p.getMonth();
}
const situacao = (a) => (a.nfse?.status === 'autorizada' ? 'NFS-e emitida' : a.nfse?.status === 'processando' ? 'NFS-e processando' : a.nfse?.status === 'cancelada' ? 'NFS-e cancelada' : a.nfOutro ? 'NFS-e anotada' : 'sem nota');
const temNota = (a) => (a.nfse && a.nfse.status !== 'cancelada') || !!a.nfOutro;
const cel = (v) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function csv(l) {
  const cab = ['Data', 'Hora', 'Tomador', 'CPF/CNPJ', 'E-mail', 'Serviço', 'Valor', 'Forma de pagamento', 'Nº NFS-e', 'Código de verificação', 'Situação'];
  const lin = l.map((a) => { const c = X.cli(a.cli); return [X.iso(a.dia).split('-').reverse().join('/'), X.hh(a.ini), a.nfse?.tomador || c.nome, a.nfse?.doc || c.doc || '', c.email || '', descricao(a), r2(X.preco(a)).toFixed(2).replace('.', ','), a.mes ? 'fim do mês' : a.forma || '', a.nfse?.numero || a.nfOutro?.ref || '', a.nfse?.codigo || '', situacao(a)]; });
  return '﻿' + [cab, ...lin].map((x) => x.map(cel).join(';')).join('\r\n');
}
export function folhaExportar() {
  let per = 'mes', soSem = false;
  const lista = () => db().ags.filter((a) => a.st === 'feito' && noPeriodo(a, per) && (!soSem || !temNota(a))).sort((a, b) => a.dia - b.dia || a.ini - b.ini);
  const resumo = () => { const l = lista(); return `${l.length} atendimento${l.length === 1 ? '' : 's'} · ${X.din(l.reduce((s, a) => s + X.preco(a), 0))} · ${l.filter(temNota).length} com nota`; };
  X.folha(`<h2>Notas do período</h2><p class="sub">Uma linha por atendimento feito, com cliente, CPF/CNPJ, serviço, valor e o número da nota. Abre no Excel: use para lançar no Emissor Nacional ou mandar ao contador.</p>
    <div class="chips" role="group" aria-label="Período">${PER.map(([k, n]) => `<button type="button" data-nfs-per="${k}" aria-pressed="${k === per}">${n}</button>`).join('')}</div>
    <label class="troca">Só os atendimentos sem nota<input type="checkbox" data-nfs-sosem></label><p class="cartao mini" data-nfs-resumo style="padding:8px 12px">${resumo()}</p>
    <div style="display:grid;gap:8px"><button type="button" class="bt cheio largo" data-nfs-csv>Baixar a planilha (CSV)</button><button type="button" class="bt largo" data-fecha style="border-style:dashed">Fechar</button></div>`, (f) => {
    const atual = () => { f.querySelector('[data-nfs-resumo]').textContent = resumo(); };
    f.querySelectorAll('[data-nfs-per]').forEach((b) => b.addEventListener('click', () => { per = b.dataset.nfsPer; f.querySelectorAll('[data-nfs-per]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); atual(); }));
    f.querySelector('[data-nfs-sosem]').addEventListener('change', (e) => { soSem = e.target.checked; atual(); });
    f.querySelector('[data-nfs-csv]').addEventListener('click', () => {
      const l = lista(); if (!l.length) return X.toast('Nenhum atendimento neste período.');
      const nome = `Notas de servico - ${PER.find((x) => x[0] === per)[1]} - ${db().studio || 'Jano'}`.replace(/[\\/:*?"<>|]/g, '');
      const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob([csv(l)], { type: 'text/csv;charset=utf-8' })); el.download = `${nome}.csv`; document.body.append(el); el.click(); setTimeout(() => { URL.revokeObjectURL(el.href); el.remove(); }, 1500);
      X.toast('Planilha baixada.');
    });
  });
}

// ------------------------------------------------------------------ a seção nas Configurações
export function secao() {
  const N = nf(), m = N.modo || '', P = N.prestador || {}, s = servidor || {}, demo = !CONTA();
  const cartoes = `<div class="nfs-modos" role="radiogroup" aria-label="Como você emite nota hoje?">${MODOS.map(([k, n, d]) => `<button type="button" role="radio" aria-checked="${m === k}" data-nfs-modo="${k}"><b>${n}</b><small>${d}</small></button>`).join('')}</div>`;
  const exportar = '<button type="button" class="bt largo" data-nfs-exportar>Notas do período (planilha)</button>';
  let corpo = '';
  if (m === 'api') {
    const p = N.provedor || 'focus', con = (s.demo ? N.conectadoDemo : s.conectado) && (s.provedor || p) === p, fora = !demo && s.desligado;
    corpo = `${fora ? `<p class="cartao mini" style="padding:8px 12px"><b>Em breve.</b> A emissão pela API ainda está sendo ativada no Jano. Por enquanto, emita no <a href="${EMISSOR_NACIONAL}" target="_blank" rel="noopener">Emissor Nacional</a> e anote o número em cada atendimento.</p>` : ''}
      <div class="cartao"><b>A sua conta no emissor</b><div class="chips" role="group" aria-label="Emissor" style="margin-top:8px">${Object.entries(PROV).map(([k, x]) => `<button type="button" data-nfs-prov="${k}" aria-pressed="${p === k}">${x[0]}</button>`).join('')}</div>
      <p class="mini" style="margin:0 0 10px">${con ? `<span class="selo ok">Conectado</span> O token está guardado no servidor e não aparece aqui.` : 'O certificado digital e o cadastro na prefeitura ficam no painel do seu emissor. Aqui vai só o token.'}</p>
      <label class="campo">Token da sua conta ${PROV[p][0]}<input id="nfs-token" type="password" autocomplete="off" spellcheck="false" maxlength="300" placeholder="${con ? 'Guardado. Cole outro só para trocar' : 'Cole aqui o token'}"><small class="mini">${PROV[p][1]} A nota sai pela sua conta e você paga direto ao emissor.</small></label>
      <p class="campo" style="margin:0 0 6px">Ambiente</p><div class="chips" role="group" aria-label="Ambiente">${[['homologacao', 'Teste'], ['producao', 'Valendo']].map(([k, n]) => `<button type="button" data-nfs-amb="${k}" aria-pressed="${(N.ambiente || 'homologacao') === k}">${n}</button>`).join('')}</div>
      <div class="nfs-grade"><label class="campo">CNPJ<input data-nfs-p="cnpj" inputmode="numeric" maxlength="18" value="${t(P.cnpj || '')}"></label><label class="campo">Inscrição municipal<input data-nfs-p="im" maxlength="20" value="${t(P.im || '')}"></label>
      <label class="campo">Código IBGE da cidade<input data-nfs-p="ibge" inputmode="numeric" maxlength="7" value="${t(P.ibge || '')}" placeholder="Orlândia: 3534302"></label><label class="campo">Regime<select data-nfs-p="simples"><option value="1" ${P.simples !== false ? 'selected' : ''}>Simples Nacional ou MEI</option><option value="0" ${P.simples === false ? 'selected' : ''}>Outro regime</option></select></label></div>
      <div class="linha" style="margin:0"><button type="button" class="bt cheio" data-nfs-conectar>${con ? 'Salvar' : 'Salvar e conectar'}</button>${con ? '<button type="button" class="bt" data-nfs-desconectar>Desconectar</button>' : ''}</div></div>
      <div class="cartao"><b>O serviço na nota</b><p class="mini" style="margin:2px 0 8px">O nome do serviço do atendimento vai na descrição. Peça os códigos ao seu contador.</p>
      <div class="nfs-grade"><label class="campo">Código de tributação nacional<input data-nfs-c="codigo" inputmode="numeric" maxlength="6" value="${t(N.codigo || '')}" placeholder="6 números"></label><label class="campo">Item da LC 116<input data-nfs-c="item" maxlength="6" value="${t(N.item || '')}" placeholder="Ex.: 06.01"></label>
      <label class="campo">Alíquota do ISS (%)<input data-nfs-c="aliquota" type="number" min="0" max="5" step="0.01" value="${t(N.aliquota || '')}"></label><label class="campo">Texto extra na descrição<input data-nfs-c="descricao" maxlength="120" value="${t(N.descricao || '')}"></label></div></div>${exportar}`;
  } else if (m === 'outro') {
    corpo = `<p class="mini cfg-txt">Em cada atendimento feito aparece <b>Anotar o nº da NFS-e</b>. No fim do mês, baixe a planilha para lançar no emissor ou mandar ao contador.</p>
      <div class="linha" style="margin:0 0 10px"><a class="bt pq" href="${EMISSOR_NACIONAL}" target="_blank" rel="noopener">Abrir o Emissor Nacional</a></div>${exportar}`;
  } else if (m === 'nao') corpo = '<p class="mini cfg-txt">Tudo certo: nada de nota aparece nos atendimentos. Se você é MEI e atende empresa, a nota de serviço sai de graça no Emissor Nacional: é só trocar aqui.</p>';
  return `<section class="cfg-sec" id="cfg-nota"><h2>Nota fiscal</h2><p class="mini cfg-txt">Como você emite nota hoje? A nota de serviço (NFS-e) é a da prefeitura ou do Emissor Nacional.</p>${cartoes}${corpo}</section>`;
}
export function monta(tela) {
  if (!servidor) lerStatus().then(() => { if (tela.querySelector('#cfg-nota')) X.mostra(); });
  const sec = tela.querySelector('#cfg-nota'); if (!sec) return;
  const volta = () => { X.mostra(); setTimeout(() => document.getElementById('cfg-nota')?.scrollIntoView({ block: 'start' }), 30); };
  sec.querySelectorAll('[data-nfs-modo]').forEach((b) => b.addEventListener('click', () => { setNf({ modo: b.dataset.nfsModo }); X.toast(MODOS.find((x) => x[0] === b.dataset.nfsModo)[1] + '.'); volta(); }));
  sec.querySelectorAll('[data-nfs-prov]').forEach((b) => b.addEventListener('click', () => { setNf({ provedor: b.dataset.nfsProv }); volta(); }));
  sec.querySelectorAll('[data-nfs-amb]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.nfsAmb === 'producao' && !confirm('Emitir valendo? As notas passam a ter valor fiscal.')) return;
    setNf({ ambiente: b.dataset.nfsAmb }); if (CONTA() && servidor?.conectado) chamar({ acao: 'conectar', provedor: nf().provedor || 'focus', ambiente: b.dataset.nfsAmb }).then(lerStatus); volta();
  }));
  sec.querySelectorAll('[data-nfs-c]').forEach((i) => i.addEventListener('change', (e) => { e.stopPropagation(); setNf({ [i.dataset.nfsC]: i.value.trim() }); X.toast('Salvo.'); }));
  sec.querySelector('[data-nfs-exportar]')?.addEventListener('click', folhaExportar);
  const lerP = () => { const p = { ...(nf().prestador || {}) }; sec.querySelectorAll('[data-nfs-p]').forEach((i) => { const k = i.dataset.nfsP; p[k] = k === 'simples' ? i.value === '1' : k === 'im' ? i.value.trim() : soDig(i.value); }); return p; };
  sec.querySelector('[data-nfs-conectar]')?.addEventListener('click', async (ev) => {
    const tk = sec.querySelector('#nfs-token').value.trim(), P = lerP(), p = nf().provedor || 'focus';
    if (P.cnpj.length !== 14) return X.toast('O CNPJ tem 14 números.');
    if (P.ibge && P.ibge.length !== 7) return X.toast('O código IBGE da cidade tem 7 números.');
    setNf({ prestador: P, provedor: p });
    if (!CONTA()) { if (!tk && !nf().conectadoDemo) return X.toast('Cole o token da sua conta.'); setNf({ conectadoDemo: true }); servidor = { ...servidor, conectado: true, provedor: p }; X.toast('Demonstração: conectado (nada foi enviado).'); return volta(); }
    ev.currentTarget.disabled = true;
    const r = await chamar({ acao: 'conectar', provedor: p, token: tk, ambiente: nf().ambiente || 'homologacao', prestador: { cnpj: P.cnpj, im: P.im, municipio_ibge: P.ibge, simples: P.simples !== false } });
    sec.querySelector('#nfs-token').value = '';
    if (!r?.ok) { servidor = { ...servidor, ...(r?.desligado ? { desligado: true } : {}) }; X.toast(r?.desligado ? 'Em breve: a emissão pela API ainda está sendo ativada.' : r?.mensagem || 'Não deu para conectar.'); return volta(); }
    await lerStatus(); X.toast(`Conectado à ${PROV[p][0]}.`); volta();
  });
  sec.querySelector('[data-nfs-desconectar]')?.addEventListener('click', async () => {
    if (!confirm('Desconectar a conta do emissor? O token é apagado do servidor.')) return;
    if (CONTA()) await chamar({ acao: 'desconectar' }); else setNf({ conectadoDemo: false });
    await lerStatus(); X.toast('Desconectado.'); volta();
  });
}
// etiqueta curta para as listas
export function etiqueta(a) {
  const m = nf().modo; if (!m || m === 'nao' || a.st !== 'feito') return '';
  if (a.nfse && a.nfse.status !== 'cancelada') return ` · NFS-e${a.nfse.numero ? ` ${t(a.nfse.numero)}` : ''}`;
  return a.nfOutro ? ` · NFS-e ${t(a.nfOutro.ref)}` : '';
}
