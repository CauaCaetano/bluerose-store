// Arca · Nota fiscal de serviço (NFS-e) dos recebimentos — 22/11/2026
// "Como você emite nota hoje?" (db.notaServico.modo; só acrescenta campos, nada muda nos dados antigos):
//   api   → a conta da própria empresa num emissor (Focus NFe ou Brasil NFe). O token vai para a função do servidor
//           (window.veltriaNfse → nexo-nfce, tipo 'nfse'), guardado cifrado lá; nunca fica no navegador nem volta para a tela.
//           Sem a função no ar, o Arca mostra "em breve" e a empresa usa o modo "outro".
//   outro → emite no Emissor Nacional, no site da prefeitura ou pelo contador: o recebimento ganha o número da NFS-e
//           (mov.nfOutro) e há exportação do período (CSV) para lançar ou mandar ao contador.
//   nao   → não emite: nada de nota aparece.
// No recebimento (mov de entrada): mov.nfse = { status, numero, codigo, pdf, ambiente, ts, tomador... } ou mov.nfOutro = { ref, ts }.
// A nota também entra no pacote do contador (aba "Notas de serviço").
// Na demonstração tudo é simulado: nota de exemplo em ambiente de teste, sem valor fiscal.

const EMISSOR_NACIONAL = 'https://www.nfse.gov.br/EmissorNacional';
const PROVEDORES = {
  focus: { nome: 'Focus NFe', onde: 'No painel da Focus NFe: Minhas empresas › a sua empresa › Tokens (use o de homologação para testar).' },
  brasilnfe: { nome: 'Brasil NFe', onde: 'No painel da Brasil NFe: Empresas › a sua empresa › Token da empresa.' },
};
const MODOS = [
  ['api', 'Tenho conta numa API de nota', 'Focus NFe ou Brasil NFe: você cola o token da sua conta e a NFS-e sai do recebimento.'],
  ['outro', 'Emito no Emissor Nacional, na prefeitura ou pelo contador', 'O Arca não emite: você anota o número da NFS-e em cada recebimento e exporta o período.'],
  ['nao', 'Não emito nota de serviço', 'Nada de nota aparece nos recebimentos.'],
];
const soDig = (s) => String(s ?? '').replace(/\D/g, '');
const fmtDoc = (d) => { d = soDig(d); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : d; };
const csvCel = (s) => { const x = String(s ?? ''); return /[;"\n\r]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
const nro = (c) => (c / 100).toFixed(2).replace('.', ',');

/** Liga a nota de serviço às telas do Arca. ctx traz o que é do app.js (dados, folhas, avisos...). */
export function criar(ctx) {
  const { t, din, dataC, N, E, DEMO } = ctx;
  const db = () => ctx.db();
  const cfg = () => (db().notaServico ||= {});
  const setCfg = (p) => { Object.assign(cfg(), p); ctx.grava(); };
  const modo = () => cfg().modo || '';
  const ativo = () => !!modo() && modo() !== 'nao';
  let servidor = null; // status da função no servidor (conectado, provedor, ambiente, desligado)
  const chamar = (body) => (!DEMO && window.veltriaNfse ? window.veltriaNfse(body) : Promise.resolve({ ok: false, desligado: true, mensagem: 'Entre na conta para emitir pela API.' }));
  const lerStatus = () => {
    if (DEMO) { servidor = { conectado: !!cfg().conectadoDemo, provedor: cfg().provedor || 'focus', ambiente: 'homologacao', demo: true }; return Promise.resolve(servidor); }
    return chamar({ acao: 'status' }).then((s) => { servidor = s || {}; if (s && s.ok === false && !('conectado' in s)) servidor.desligado = true; return servidor; }).catch(() => (servidor = { desligado: true }));
  };
  const apiPronta = () => modo() === 'api' && (DEMO ? !!cfg().conectadoDemo : !!servidor && !servidor.desligado && !!servidor.conectado);
  // com a conta, pergunta ao servidor uma vez ao abrir (a tela do recebimento já sabe se dá para emitir)
  if (!DEMO && modo() === 'api') setTimeout(() => lerStatus().then(() => ctx.mostra()), 0);

  // recebimento = entrada que é receita (a nota de serviço sai sobre o que a empresa faturou)
  const eRecebimento = (m) => m && m.tipo === 'entra' && m.receita !== false;
  const cobDe = (m) => (m.cob ? db().cobrancas.find((c) => c.id === m.cob) : null);
  const tomadorDe = (m) => { const c = cobDe(m); return { nome: m.nfse?.tomador?.nome || m.nfOutro?.tomador || m.cli || c?.cli || '', doc: m.nfse?.tomador?.doc || m.nfOutro?.doc || c?.doc || '', email: m.nfse?.tomador?.email || c?.email || '' }; };
  const prestador = (empId) => { const e = db().empresas.find((x) => x.id === empId) || db().empresas[0] || {}; const p = (cfg().prestadores || {})[e.id] || {}; return { emp: e.id, nome: e.nome || db().negocio, cnpj: soDig(e.cnpj || db().cnpj), im: p.im || '', municipio_ibge: p.ibge || '', simples: ['mei', 'simples'].includes(e.regime) }; };
  const situacao = (m) => (m.nfse?.status === 'autorizada' ? `NFS-e autorizada${m.nfse.ambiente !== 'producao' ? ' (teste)' : ''}` : m.nfse?.status === 'processando' ? 'NFS-e em processamento' : m.nfse?.status === 'cancelada' ? 'NFS-e cancelada' : m.nfOutro ? 'nota emitida fora do Arca' : 'sem nota');
  const numeroNota = (m) => (m.nfse?.status === 'autorizada' || m.nfse?.status === 'cancelada' ? String(m.nfse.numero || '') : m.nfOutro?.ref || '');
  const temNota = (m) => ['autorizada', 'processando'].includes(m.nfse?.status) || !!m.nfOutro;

  // ------------------------------------------------------------------ selo na lista e bloco no lançamento
  function selo(m) {
    if (!ativo() || !eRecebimento(m)) return '';
    if (m.nfse?.status === 'autorizada') return ` <small class="selo ns-ok">NFS-e ${t(m.nfse.numero || '')}</small>`;
    if (m.nfse?.status === 'processando') return ' <small class="selo">NFS-e em processamento</small>';
    if (m.nfOutro) return ` <small class="selo ns-ok">NFS-e ${t(m.nfOutro.ref || 'emitida')}</small>`;
    return '';
  }
  function blocoMov(m) {
    if (!ativo() || !eRecebimento(m)) return '';
    const n = m.nfse, o = m.nfOutro, pode = ctx.pode('receber');
    let corpo = '';
    if (n?.status === 'autorizada' || n?.status === 'processando') {
      corpo = `<dl class="ficha f4"><div><dt>Situação</dt><dd>${n.status === 'autorizada' ? '<span class="etq ok">autorizada</span>' : '<span class="etq at">em processamento na prefeitura</span>'}${n.ambiente !== 'producao' ? ' <small class="mini">ambiente de teste, sem valor fiscal</small>' : ''}</dd></div><div><dt>Número</dt><dd class="num">${t(n.numero || '—')}</dd></div>
        <div><dt>Código de verificação</dt><dd class="num">${t(n.codigo || '—')}</dd></div><div><dt>Tomador</dt><dd>${t(n.tomador?.nome || '')}${n.tomador?.doc ? ` <small>${t(fmtDoc(n.tomador.doc))}</small>` : ''}</dd></div></dl>
        <div class="linha">${n.demo ? '<button type="button" class="bt pq" data-acao="ns-ver" data-m="' + m.id + '">Ver a nota (exemplo)</button>' : /^https:\/\//.test(n.pdf || '') ? `<a class="bt pq" href="${t(n.pdf)}" target="_blank" rel="noopener noreferrer">Abrir o PDF da NFS-e</a>` : ''}${n.status === 'processando' && !n.demo ? `<button type="button" class="bt pq" data-acao="ns-consultar" data-m="${m.id}">Conferir de novo</button>` : ''}${pode && n.status === 'autorizada' ? `<button type="button" class="bt pq perigo" data-acao="ns-cancelar" data-m="${m.id}">Cancelar a NFS-e</button>` : ''}</div>`;
    } else if (n?.status === 'cancelada') {
      corpo = `<p class="mini">NFS-e nº ${t(n.numero || '')} cancelada${n.cancelada?.motivo ? `: ${t(n.cancelada.motivo)}` : ''}.</p>${pode ? acoesSemNota(m) : ''}`;
    } else if (o) {
      corpo = `<p><span class="etq ok">NFS-e nº ${t(o.ref || '—')}</span> <small class="mini">anotada em ${new Date(o.ts).toLocaleDateString('pt-BR')}${o.doc ? ` · tomador ${t(fmtDoc(o.doc))}` : ''}</small></p>${pode ? `<div class="linha"><button type="button" class="bt pq" data-acao="ns-outro" data-m="${m.id}">Mudar o número</button></div>` : ''}`;
    } else corpo = pode ? acoesSemNota(m) : '<p class="mini">Sem nota de serviço.</p>';
    const erro = m.nfseErro && !temNota(m) ? `<p class="faixa-aviso">Última tentativa: ${t(m.nfseErro.msg)}</p>` : '';
    return `<div class="ns-bloco">${ctx.titulo(ctx.IC.doc, 'Nota fiscal de serviço')}${corpo}${erro}</div>`;
  }
  function acoesSemNota(m) {
    if (modo() === 'api') {
      if (apiPronta()) return `<div class="linha"><button type="button" class="bt cheio" data-acao="ns-emitir" data-m="${m.id}">Emitir a NFS-e</button><button type="button" class="bt pq" data-acao="ns-outro" data-m="${m.id}">Já emiti fora do Arca</button></div>`;
      return `<p class="mini">${servidor?.desligado ? 'Emitir pela API: <b>em breve</b>. Por enquanto, emita no Emissor Nacional e anote o número aqui.' : 'Conecte a conta do seu emissor em Configurações › Nota fiscal.'}</p><div class="linha"><button type="button" class="bt pq cheio" data-acao="ns-outro" data-m="${m.id}">Anotar o número da NFS-e</button><a class="bt pq" href="${EMISSOR_NACIONAL}" target="_blank" rel="noopener noreferrer">Abrir o Emissor Nacional</a></div>`;
    }
    return `<div class="linha"><button type="button" class="bt cheio" data-acao="ns-outro" data-m="${m.id}">Anotar o número da NFS-e</button><a class="bt pq" href="${EMISSOR_NACIONAL}" target="_blank" rel="noopener noreferrer">Abrir o Emissor Nacional</a></div>`;
  }

  // ------------------------------------------------------------------ anotar a nota emitida fora (Emissor Nacional, prefeitura, contador)
  function folhaOutro(m) {
    const tm = tomadorDe(m);
    ctx.formFolha(`<h2>NFS-e deste recebimento</h2><p class="mini">${t(m.desc)} · ${din(m.c)} · ${dataC(m.dia)}. Anote a nota que você emitiu no Emissor Nacional, no site da prefeitura ou pelo contador.</p>
      <label class="campo">Número da NFS-e<input name="ref" required maxlength="60" value="${t(m.nfOutro?.ref || '')}" placeholder="Ex.: 1234"></label>
      <div class="cfg-campos"><label class="campo">Tomador (cliente)<input name="tom" maxlength="80" value="${t(tm.nome)}"></label><label class="campo">CPF ou CNPJ do tomador<input name="doc" inputmode="numeric" maxlength="18" value="${t(fmtDoc(tm.doc))}" placeholder="Opcional"></label></div>
      <div class="linha"><button class="bt cheio">Guardar</button>${m.nfOutro ? '<button type="button" class="bt" data-ns-tirar>Tirar a anotação</button>' : ''}<button type="button" class="bt" data-fecha>Voltar</button></div>`, (f) => {
      const ref = String(f.get('ref') || '').trim().slice(0, 60), doc = soDig(f.get('doc'));
      if (!ref) throw new Error('Escreva o número da nota.');
      if (doc && doc.length !== 11 && doc.length !== 14) throw new Error('O CPF tem 11 números e o CNPJ, 14.');
      m.nfOutro = { ref, ts: Date.now(), ...(doc ? { doc } : {}), ...(String(f.get('tom') || '').trim() ? { tomador: String(f.get('tom')).trim().slice(0, 80) } : {}) };
      const c = cobDe(m); if (c && doc && !c.doc) c.doc = doc;
      ctx.hist(`Anotou a NFS-e ${ref} no recebimento ${m.desc}`); return `NFS-e ${ref} anotada.`;
    });
    document.querySelector('[data-ns-tirar]')?.addEventListener('click', () => { delete m.nfOutro; ctx.grava(); document.querySelector('.veu')?.remove(); ctx.mostra(); ctx.aviso('Anotação tirada.'); });
  }

  // ------------------------------------------------------------------ emitir pela API (ou nota de exemplo na demonstração)
  function notaDoMov(m, tom, servico) {
    const p = prestador(E.empDe(db(), m)), tent = m.nfseTentativas || 0;
    return { ref: `arca-${String(m.id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40)}${tent ? `-${tent}` : ''}`, nota: { data: N.isoDe(m.dia), prestador: p, servico, tomador: tom } };
  }
  function folhaEmitir(m) {
    const tm = tomadorDe(m), P = cfg().padrao || {}, amb = DEMO ? 'homologacao' : servidor?.ambiente || cfg().ambiente || 'homologacao';
    ctx.formFolha(`<h2>Emitir a NFS-e · ${din(m.c)}</h2><p class="mini">${t(m.desc)} · recebido em ${dataC(m.dia)} · ${t(prestador(E.empDe(db(), m)).nome)}</p>
      ${DEMO ? '<p class="faixa-aviso">Demonstração: sai uma nota de exemplo, em ambiente de teste (sem valor fiscal). Nada é enviado.</p>' : amb !== 'producao' ? '<p class="faixa-aviso">Ambiente de teste (homologação): a nota não tem valor fiscal.</p>' : ''}
      <div class="cfg-campos"><label class="campo">Tomador (cliente)<input name="tom" required maxlength="80" value="${t(tm.nome)}"></label><label class="campo">CPF ou CNPJ do tomador<input name="doc" inputmode="numeric" maxlength="18" value="${t(fmtDoc(tm.doc))}" required></label>
      <label class="campo">E-mail do tomador (recebe a nota)<input name="email" type="email" maxlength="80" value="${t(tm.email)}" placeholder="Opcional"></label><label class="campo">Valor do serviço (R$)<input readonly value="${nro(m.c)}"></label></div>
      <label class="campo">Descrição do serviço<input name="desc" required maxlength="200" value="${t(P.descricao || m.desc)}"></label>
      <div class="cfg-campos"><label class="campo">Código de tributação nacional<input name="ctn" inputmode="numeric" maxlength="6" required value="${t(P.ctn || '')}" placeholder="6 números, ex.: 010101"></label><label class="campo">Item da LC 116<input name="lc" maxlength="6" value="${t(P.lc116 || '')}" placeholder="Ex.: 1.01"></label><label class="campo">Alíquota do ISS (%)<input name="aliq" inputmode="decimal" maxlength="5" value="${t(P.aliquota || '')}" placeholder="Opcional"></label></div>
      ${m.nfseErro ? `<p class="faixa-aviso">Última tentativa: ${t(m.nfseErro.msg)}</p>` : ''}
      <div class="linha"><button class="bt cheio">Emitir</button><button type="button" class="bt" data-fecha>Voltar</button></div>`, (f) => {
      const doc = soDig(f.get('doc')), ctn = soDig(f.get('ctn')), nome = String(f.get('tom') || '').trim(), email = String(f.get('email') || '').trim();
      if (!nome) throw new Error('Escreva o nome do tomador.');
      if (doc.length !== 11 && doc.length !== 14) throw new Error('O CPF tem 11 números e o CNPJ, 14.');
      if (ctn.length !== 6) throw new Error('O código de tributação nacional tem 6 números (pergunte ao contador).');
      if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Confira o e-mail do tomador.');
      const aliq = Number(String(f.get('aliq') || '').replace(',', '.'));
      const servico = { descricao: String(f.get('desc')).trim().slice(0, 200), valor: m.c / 100, codigo_tributacao_nacional: ctn, item_lc116: String(f.get('lc') || '').trim().slice(0, 6), ...(aliq > 0 && aliq <= 5 ? { aliquota_iss: aliq } : {}) };
      const c = cobDe(m); if (c && !c.doc) c.doc = doc;
      setTimeout(() => emitir(m, { nome: nome.slice(0, 80), doc, email: email.slice(0, 80) }, servico), 30);
      return false;
    });
  }
  const emAndamento = new Set();
  async function emitir(m, tomador, servico) {
    document.querySelector('.veu')?.remove();
    if (emAndamento.has(m.id) || temNota(m)) return; emAndamento.add(m.id);
    ctx.aviso('Emitindo a NFS-e…');
    const pedido = notaDoMov(m, tomador, servico);
    let r;
    try {
      r = DEMO ? await new Promise((ok) => setTimeout(() => ok({ ok: true, status: 'autorizada', numero: String(1000 + db().movs.filter((x) => x.nfse?.demo).length + 1), codigo_verificacao: Math.random().toString(36).slice(2, 10).toUpperCase(), ambiente: 'homologacao', demo: true }), 600))
        : await chamar({ acao: 'emitir', ...pedido });
    } catch { r = { ok: false, mensagem: 'Sem internet agora. Tente de novo.' }; }
    emAndamento.delete(m.id);
    const mv = db().movs.find((x) => x.id === m.id) || m;
    if (!r?.ok) {
      mv.nfseTentativas = (mv.nfseTentativas || 0) + (r?.desligado ? 0 : 1); mv.nfseErro = { ts: Date.now(), msg: String(r?.mensagem || r?.erro || 'A prefeitura não autorizou').slice(0, 300) };
      if (r?.desligado && servidor) servidor.desligado = true;
      ctx.grava(); ctx.mostra(); ctx.aviso(r?.desligado ? 'Emissão pela API ainda não ativada: anote a nota emitida no Emissor Nacional.' : `A NFS-e não saiu: ${mv.nfseErro.msg}`, true); return;
    }
    mv.nfse = { status: r.status === 'processando' ? 'processando' : 'autorizada', ref: pedido.ref, numero: String(r.numero || '').slice(0, 20), codigo: String(r.codigo_verificacao || '').slice(0, 40), pdf: /^https:\/\//.test(r.pdf || '') ? String(r.pdf).slice(0, 400) : '',
      ambiente: r.ambiente || 'homologacao', ts: Date.now(), tomador, servico: { descricao: servico.descricao, ctn: servico.codigo_tributacao_nacional }, ...(r.demo ? { demo: true } : {}) };
    delete mv.nfseErro; ctx.hist(`Emitiu a NFS-e ${mv.nfse.numero || ''} de ${din(mv.c)} (${tomador.nome})`); ctx.grava(); ctx.mostra();
    ctx.aviso(mv.nfse.status === 'autorizada' ? `NFS-e ${mv.nfse.numero ? `nº ${mv.nfse.numero} ` : ''}autorizada${mv.nfse.ambiente !== 'producao' ? ' (teste)' : ''}.` : 'NFS-e enviada: a prefeitura ainda está processando.');
  }
  async function consultar(m) {
    if (!m.nfse || DEMO) return;
    const r = await chamar({ acao: 'consultar', ref: m.nfse.ref });
    if (r?.ok && r.status) { Object.assign(m.nfse, { status: r.status === 'autorizada' ? 'autorizada' : r.status === 'cancelada' ? 'cancelada' : 'processando', numero: String(r.numero || m.nfse.numero || ''), codigo: String(r.codigo_verificacao || m.nfse.codigo || ''), ...(/^https:\/\//.test(r.pdf || '') ? { pdf: r.pdf } : {}) }); ctx.grava(); ctx.mostra(); ctx.aviso(`Situação: ${situacao(m)}.`); }
    else ctx.aviso(r?.mensagem || 'Não deu para conferir agora.', true);
  }
  function folhaCancelar(m) {
    ctx.formFolha(`<h2>Cancelar a NFS-e nº ${t(m.nfse.numero || '')}?</h2><p class="mini">O cancelamento vai para a prefeitura e pode levar um tempo para valer. O recebimento continua lançado.</p>
      <label class="campo">Motivo (no mínimo 15 letras)<input name="mot" required maxlength="200" placeholder="Ex.: Serviço lançado em duplicidade"></label>
      <div class="linha"><button class="bt cheio perigo">Cancelar a nota</button><button type="button" class="bt" data-fecha>Voltar</button></div>`, (f) => {
      const motivo = String(f.get('mot') || '').trim(); if (motivo.length < 15) throw new Error('Escreva o motivo com pelo menos 15 letras.');
      const fim = (x) => { document.querySelector('.veu')?.remove(); if (!x?.ok) return ctx.aviso(x?.mensagem || 'A prefeitura não aceitou o cancelamento.', true); m.nfse = { ...m.nfse, status: 'cancelada', cancelada: { ts: Date.now(), motivo } }; ctx.hist(`Cancelou a NFS-e ${m.nfse.numero || ''}`); ctx.grava(); ctx.mostra(); ctx.aviso('NFS-e cancelada.'); };
      if (DEMO || m.nfse.demo) setTimeout(() => fim({ ok: true }), 20); else chamar({ acao: 'cancelar', ref: m.nfse.ref, motivo }).then(fim);
      return false;
    });
  }
  function verExemplo(m) {
    const n = m.nfse, p = prestador(E.empDe(db(), m));
    ctx.folha(`<h2>NFS-e nº ${t(n.numero)} · exemplo</h2><div class="recibo ns-danfse"><h3>Nota Fiscal de Serviço eletrônica</h3><p class="mini"><b>EMITIDA EM AMBIENTE DE TESTE · SEM VALOR FISCAL</b></p>
      <dl class="ficha"><div><dt>Prestador</dt><dd>${t(p.nome)}<br><small>${t(fmtDoc(p.cnpj) || 'CNPJ não informado')}</small></dd></div><div><dt>Tomador</dt><dd>${t(n.tomador?.nome || '')}<br><small>${t(fmtDoc(n.tomador?.doc || ''))}</small></dd></div>
      <div><dt>Número</dt><dd class="num">${t(n.numero)}</dd></div><div><dt>Código de verificação</dt><dd class="num">${t(n.codigo)}</dd></div><div><dt>Data</dt><dd>${dataC(m.dia)}</dd></div><div><dt>Valor do serviço</dt><dd class="num">${din(m.c)}</dd></div></dl>
      <p><b>Serviço:</b> ${t(n.servico?.descricao || m.desc)}${n.servico?.ctn ? ` <small>(código ${t(n.servico.ctn)})</small>` : ''}</p></div><div class="linha"><button type="button" class="bt" onclick="print()">Imprimir</button><button type="button" class="bt cheio" data-fecha>Fechar</button></div>`);
  }

  // ------------------------------------------------------------------ exportar o período (CSV) e a aba do pacote do contador
  const linhasNotas = (de, ate, soSem) => db().movs.filter((m) => eRecebimento(m) && m.dia >= de && m.dia <= ate && (!soSem || !temNota(m))).sort((a, b) => a.dia - b.dia);
  const linhaNota = (m) => { const tm = tomadorDe(m), e = db().empresas.find((x) => x.id === E.empDe(db(), m)); return [N.dataDe(m.dia).toLocaleDateString('pt-BR'), e?.nome || '', fmtDoc(e?.cnpj || ''), tm.nome, fmtDoc(tm.doc), m.nfse?.servico?.descricao || m.desc, m.c, numeroNota(m), situacao(m)]; };
  const CAB = ['Data', 'Empresa (prestador)', 'CNPJ do prestador', 'Tomador / cliente', 'CPF/CNPJ do tomador', 'Serviço / descrição', 'Valor (R$)', 'Nº NFS-e', 'Situação'];
  function csv(l) { return '﻿' + [CAB, ...l.map(linhaNota).map((x) => { x[6] = nro(x[6]); return x; })].map((x) => x.map(csvCel).join(';')).join('\r\n'); }
  function abaContador(de, ate) {
    if (!ativo() && !db().movs.some((m) => m.nfse || m.nfOutro)) return null;
    return { nome: 'Notas de serviço', linhas: [CAB, ...linhasNotas(de, ate, false).map(linhaNota).map((x) => { x[6] = { v: x[6] / 100, t: 'moeda' }; return x; })] };
  }
  function folhaExportar() {
    let per = 'mes', soSem = false, de0 = N.isoDe(N.periodo('mes')[0]), ate0 = N.isoDe(0);
    const intervalo = () => { if (per === 'mes') return N.periodo('mes'); if (per === 'mespassado') return N.periodo('mespassado'); const a = N.diaDe(de0), b = N.diaDe(ate0); return [Number.isFinite(a) ? a : -30, Number.isFinite(b) ? b : 0]; };
    const resumo = () => { const l = linhasNotas(...intervalo(), soSem); return `${l.length} recebimento(s) · ${din(l.reduce((s, m) => s + m.c, 0))} · ${l.filter(temNota).length} com nota`; };
    ctx.folha(`<h2>Exportar notas de serviço</h2><p class="mini">Os recebimentos do período com tomador, CPF/CNPJ, serviço, valor e o número da NFS-e. Para lançar no Emissor Nacional ou mandar ao contador. O CSV abre no Excel.</p>
      <div class="chips" role="group" aria-label="Período">${[['mes', 'Este mês'], ['mespassado', 'Mês passado'], ['outro', 'Escolher o período']].map(([k, n]) => `<button type="button" data-ns-per="${k}" aria-pressed="${k === per}">${n}</button>`).join('')}</div>
      <div class="cfg-campos" data-ns-datas hidden><label class="campo">De<input type="date" data-ns-de value="${de0}"></label><label class="campo">Até<input type="date" data-ns-ate value="${ate0}"></label></div>
      <label class="check"><input type="checkbox" data-ns-sosem> Só os recebimentos sem nota</label><p class="mini" data-ns-resumo><b>${resumo()}</b></p>
      <div class="linha"><button type="button" class="bt cheio" data-ns-csv>Baixar CSV</button><a class="bt" href="${EMISSOR_NACIONAL}" target="_blank" rel="noopener noreferrer">Abrir o Emissor Nacional</a><button type="button" class="bt" data-fecha>Fechar</button></div>`, (f) => {
      const atual = () => { f.querySelector('[data-ns-resumo]').innerHTML = `<b>${resumo()}</b>`; };
      f.querySelectorAll('[data-ns-per]').forEach((b) => { b.onclick = () => { per = b.dataset.nsPer; f.querySelectorAll('[data-ns-per]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); f.querySelector('[data-ns-datas]').hidden = per !== 'outro'; atual(); }; });
      f.querySelector('[data-ns-de]').onchange = (e) => { de0 = e.target.value; atual(); }; f.querySelector('[data-ns-ate]').onchange = (e) => { ate0 = e.target.value; atual(); };
      f.querySelector('[data-ns-sosem]').onchange = (e) => { soSem = e.target.checked; atual(); };
      f.querySelector('[data-ns-csv]').onclick = () => { const [a, b] = intervalo(), l = linhasNotas(a, b, soSem); if (!l.length) return ctx.aviso('Nenhum recebimento neste período.'); ctx.baixa(`arca-notas-servico-${N.isoDe(a)}-a-${N.isoDe(Math.min(b, 0))}.csv`, csv(l), 'text/csv;charset=utf-8'); ctx.hist(`Exportou as notas de serviço (${l.length})`); ctx.grava(); ctx.aviso('CSV baixado.'); };
    });
  }

  // ------------------------------------------------------------------ Configurações › Nota fiscal
  function secaoConfig() {
    const C = cfg(), m = modo(), g = ctx.pode('cadastros'), dis = g ? '' : 'disabled', s = servidor || {}, P = C.padrao || {};
    const cartoes = `<div class="temas ns-modos" role="radiogroup" aria-label="Como você emite nota hoje?">${MODOS.map(([k, n, d]) => `<button type="button" role="radio" aria-checked="${m === k}" aria-pressed="${m === k}" data-ns-modo="${k}" ${dis}><span><b>${n}${k === 'api' && !DEMO && s.desligado ? ' · em breve' : ''}</b><small>${d}</small></span></button>`).join('')}</div>`;
    const prestadores = `<h3 class="ns-h3">Dados de quem presta o serviço</h3><p class="mini">Um por empresa do grupo. O CNPJ vem de Empresas do grupo; a inscrição municipal e o código IBGE da cidade estão no cadastro da prefeitura.</p>
      ${ctx.tabela('ns-prest', [['Empresa'], ['CNPJ'], ['Inscrição municipal'], ['Código IBGE da cidade']], db().empresas.map((e) => { const p = (C.prestadores || {})[e.id] || {}; return `<tr>${ctx.td('Empresa', `<b>${t(e.nome)}</b>`)}${ctx.td('CNPJ', t(e.cnpj || '—'))}${ctx.td('Inscrição municipal', `<input class="ns-in" data-ns-im="${e.id}" inputmode="numeric" maxlength="20" value="${t(p.im || '')}" aria-label="Inscrição municipal de ${t(e.nome)}" ${dis}>`)}${ctx.td('Código IBGE', `<input class="ns-in" data-ns-ibge="${e.id}" inputmode="numeric" maxlength="7" value="${t(p.ibge || '')}" placeholder="ex.: 3534302" aria-label="Código IBGE da cidade de ${t(e.nome)}" ${dis}>`)}</tr>`; }))}`;
    const padrao = `<h3 class="ns-h3">Serviço padrão (vem preenchido ao emitir)</h3><div class="cfg-campos"><label class="campo">Descrição do serviço<input data-ns-pad="descricao" maxlength="200" value="${t(P.descricao || '')}" placeholder="Ex.: Consultoria financeira mensal" ${dis}></label>
      <label class="campo">Código de tributação nacional<input data-ns-pad="ctn" inputmode="numeric" maxlength="6" value="${t(P.ctn || '')}" placeholder="6 números" ${dis}></label><label class="campo">Item da LC 116<input data-ns-pad="lc116" maxlength="6" value="${t(P.lc116 || '')}" placeholder="Ex.: 17.01" ${dis}></label><label class="campo">Alíquota do ISS (%)<input data-ns-pad="aliquota" inputmode="decimal" maxlength="5" value="${t(P.aliquota || '')}" placeholder="Opcional" ${dis}></label></div>
      <p class="mini">Confirme os códigos com o seu contador antes de emitir valendo.</p>`;
    let corpo = '';
    if (m === 'api') {
      const p = C.provedor || 'focus', con = !!s.conectado && (s.provedor || p) === p;
      corpo = `${!DEMO && s.desligado ? `<p class="faixa-aviso">Emitir pela API do seu emissor: <b>em breve</b> no Arca. Enquanto isso, emita no <a href="${EMISSOR_NACIONAL}" target="_blank" rel="noopener noreferrer">Emissor Nacional</a> e anote o número em cada recebimento.</p>` : ''}
        <h3 class="ns-h3">A sua conta no emissor</h3><div class="chips" role="group" aria-label="Emissor">${Object.entries(PROVEDORES).map(([k, x]) => `<button type="button" data-ns-prov="${k}" aria-pressed="${p === k}" ${dis}>${x.nome}</button>`).join('')}</div>
        <p class="mini">${con ? `<span class="etq ok">conectado à ${PROVEDORES[p].nome}</span> O token está guardado no servidor, cifrado, e não aparece aqui.` : 'O certificado A1 e o acesso à prefeitura você cadastra no painel do seu emissor: aqui vai só o token.'}</p>
        <div class="cfg-campos"><label class="campo">Token da sua conta ${t(PROVEDORES[p].nome)}<input data-ns-token type="password" autocomplete="off" spellcheck="false" maxlength="300" placeholder="${con ? 'Guardado. Cole outro só para trocar' : 'Cole aqui o token'}" ${dis}><small class="mini">${t(PROVEDORES[p].onde)} A nota sai pela sua conta e você paga direto ao seu emissor.</small></label>
        <div class="campo">Ambiente<div class="chips" role="group" aria-label="Ambiente">${[['homologacao', 'Teste (homologação)'], ['producao', 'Valendo (produção)']].map(([k, n]) => `<button type="button" data-ns-amb="${k}" aria-pressed="${(C.ambiente || 'homologacao') === k}" ${dis}>${n}</button>`).join('')}</div></div></div>
        ${prestadores}${padrao}
        ${g ? `<div class="linha"><button type="button" class="bt cheio" data-ns-conectar>${con ? 'Salvar' : 'Salvar e conectar'}</button>${con ? '<button type="button" class="bt" data-ns-desconectar>Desconectar</button>' : ''}<button type="button" class="bt" data-acao="ns-exportar">Exportar notas do período</button></div>` : ''}`;
    } else if (m === 'outro') {
      corpo = `<p class="mini">Em cada recebimento (Lançamentos › a entrada, ou A receber › a cobrança) aparece <b>“Anotar o número da NFS-e”</b>. No fim do mês, exporte o período para conferir no Emissor Nacional ou mandar ao contador. As notas também entram no pacote do contador.</p>
        ${padrao}<div class="linha"><button type="button" class="bt cheio" data-acao="ns-exportar">Exportar notas do período</button><a class="bt" href="${EMISSOR_NACIONAL}" target="_blank" rel="noopener noreferrer">Abrir o Emissor Nacional</a></div>`;
    } else if (m === 'nao') corpo = '<p class="mini">Tudo certo: nenhuma nota aparece nos recebimentos. Dá para mudar quando quiser.</p>';
    return `<section class="bloco cfg-sec ns-cfg" id="cfg-nota">${ctx.titulo(ctx.IC.doc, 'Nota fiscal de serviço')}<p class="mini">Como você emite nota hoje? ${g ? '' : 'Só quem cuida dos cadastros muda.'}</p>${cartoes}${corpo}</section>`;
  }
  function ligarConfig(tela) {
    const sec = tela.querySelector('#cfg-nota'); if (!sec) return;
    if (!servidor) lerStatus().then(() => { if (document.getElementById('cfg-nota')) ctx.mostra(); });
    if (!ctx.pode('cadastros')) return;
    sec.querySelectorAll('[data-ns-modo]').forEach((b) => { b.onclick = () => { setCfg({ modo: b.dataset.nsModo }); ctx.hist(`Nota de serviço: ${MODOS.find((x) => x[0] === b.dataset.nsModo)[1]}`); ctx.mostra(); ctx.aviso('Salvo.'); }; });
    sec.querySelectorAll('[data-ns-prov]').forEach((b) => { b.onclick = () => { setCfg({ provedor: b.dataset.nsProv }); ctx.mostra(); }; });
    sec.querySelectorAll('[data-ns-amb]').forEach((b) => { b.onclick = () => {
      if (b.dataset.nsAmb === 'producao' && !confirm('Emitir valendo (produção)? As notas passam a ter valor fiscal.')) return;
      setCfg({ ambiente: b.dataset.nsAmb }); if (!DEMO && servidor?.conectado) chamar({ acao: 'conectar', provedor: cfg().provedor || 'focus', ambiente: b.dataset.nsAmb }).then(lerStatus); ctx.mostra();
    }; });
    const prest = (id) => ((cfg().prestadores ||= {})[id] ||= {});
    sec.querySelectorAll('[data-ns-im]').forEach((i) => { i.onchange = () => { prest(i.dataset.nsIm).im = soDig(i.value).slice(0, 20); ctx.grava(); ctx.aviso('Salvo.'); }; });
    sec.querySelectorAll('[data-ns-ibge]').forEach((i) => { i.onchange = () => { const v = soDig(i.value); if (v && v.length !== 7) return ctx.aviso('O código IBGE tem 7 números.', true); prest(i.dataset.nsIbge).ibge = v; ctx.grava(); ctx.aviso('Salvo.'); }; });
    sec.querySelectorAll('[data-ns-pad]').forEach((i) => { i.onchange = () => { const k = i.dataset.nsPad, v = k === 'ctn' ? soDig(i.value).slice(0, 6) : i.value.trim().slice(0, 200); if (k === 'ctn' && v && v.length !== 6) return ctx.aviso('O código de tributação nacional tem 6 números.', true); (cfg().padrao ||= {})[k] = v; ctx.grava(); ctx.aviso('Salvo.'); }; });
    sec.querySelector('[data-ns-conectar]')?.addEventListener('click', async (ev) => {
      const inp = sec.querySelector('[data-ns-token]'), tk = inp.value.trim(), p = cfg().provedor || 'focus', pr = prestador(db().empresas[0]?.id);
      if (!pr.cnpj || pr.cnpj.length !== 14) return ctx.aviso('Cadastre o CNPJ da empresa em Empresas do grupo.', true);
      if (DEMO) { if (!tk && !cfg().conectadoDemo) return ctx.aviso('Cole o token da sua conta.', true); inp.value = ''; setCfg({ conectadoDemo: true, provedor: p }); servidor = { ...servidor, conectado: true, provedor: p }; ctx.mostra(); return ctx.aviso('Demonstração: conectado (nada foi enviado).'); }
      ev.currentTarget.disabled = true;
      const r = await chamar({ acao: 'conectar', provedor: p, token: tk, ambiente: cfg().ambiente || 'homologacao', prestador: pr, prestadores: db().empresas.map((e) => prestador(e.id)) });
      inp.value = '';
      if (!r?.ok) { ev.currentTarget.disabled = false; if (r?.desligado && servidor) servidor.desligado = true; ctx.mostra(); return ctx.aviso(r?.desligado ? 'Emitir pela API ainda não está ativado no Arca (em breve).' : r?.mensagem || 'Não deu para conectar.', true); }
      await lerStatus(); ctx.hist(`Conectou a NFS-e à ${PROVEDORES[p].nome}`); ctx.grava(); ctx.mostra(); ctx.aviso(`Conectado à ${PROVEDORES[p].nome}.`);
    });
    sec.querySelector('[data-ns-desconectar]')?.addEventListener('click', async () => {
      if (!confirm('Desconectar a conta do emissor? O token é apagado do servidor.')) return;
      if (DEMO) setCfg({ conectadoDemo: false }); else await chamar({ acao: 'desconectar' });
      await lerStatus(); ctx.mostra(); ctx.aviso('Desconectado.');
    });
  }

  const mov = (d) => db().movs.find((x) => x.id === d.m);
  const acoes = {
    'ns-emitir': (d) => { const m = mov(d); if (m && !temNota(m)) folhaEmitir(m); },
    'ns-outro': (d) => { const m = mov(d); if (m) folhaOutro(m); },
    'ns-cancelar': (d) => { const m = mov(d); if (m?.nfse?.status === 'autorizada') folhaCancelar(m); },
    'ns-consultar': (d) => { const m = mov(d); if (m) consultar(m); },
    'ns-ver': (d) => { const m = mov(d); if (m?.nfse) verExemplo(m); },
    'ns-exportar': () => folhaExportar(),
  };
  return { ativo, selo, blocoMov, secaoConfig, ligarConfig, abaContador, acoes, lerStatus };
}
