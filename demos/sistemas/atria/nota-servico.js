// Atria · Nota fiscal de serviço (NFS-e) — 22/11/2026
// "Como você emite nota hoje?" (db.nf.modo):
//   api   → conta do próprio profissional num emissor (Focus NFe ou Brasil NFe). O token vai só para o servidor
//           (window.veltriaNfse, função nexo-nfce com tipo 'nfse'; guardado cifrado). Certificado e login da prefeitura
//           ficam no painel do emissor dele. Sem a função no ar, aparece "Em breve" e dá para usar o modo outro.
//   outro → emite no Emissor Nacional, na prefeitura ou pelo contador: cada recebimento ganha o nº da NFS-e
//           e há exportação do período (CSV) para lançar ou mandar ao contador.
//   nao   → não emite: nada de nota aparece.
// Só acrescenta campos: db.nf, fin.nfse, fin.nfOutro e cliente.doc / cliente.email. Nenhum token fica no aparelho.
// Na demonstração tudo é simulado (nota de exemplo, ambiente de teste).
import { $, $$, t, din, dataBR, hoje, somaDias, ico, db, grava, achar, toast, folha, repinta, ir, cab } from './base.js?v=31';
import { cliente } from './gestao.js?v=31';

export const TELAS = {};
export const ACOES = {};
const AVISO = 'background:var(--giz-claro);color:var(--grafite);border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.45';
const EMISSOR_NACIONAL = 'https://www.nfse.gov.br/EmissorNacional';
const nf = () => db.nf || {};
const setNf = (p) => { db.nf = { ...nf(), ...p }; grava(); };
const modo = () => nf().modo || '';
const naConta = () => typeof window.veltriaNfse === 'function';
const soDig = (s) => String(s || '').replace(/\D/g, '');
const PROV = { focus: ['Focus NFe', 'No painel da Focus NFe: Minhas empresas › a sua empresa › Tokens (use o de homologação para testar).'], brasilnfe: ['Brasil NFe', 'No painel da Brasil NFe: Empresas › a sua empresa › Token da empresa.'] };
const MODOS = [
  ['api', 'link', 'Tenho conta numa API de nota', 'Focus NFe ou Brasil NFe: você cola o token e a NFS-e sai pelo Atria.'],
  ['outro', 'doc', 'Emito no Emissor Nacional ou pelo contador', 'Você anota o nº da nota em cada recebimento e exporta o mês.'],
  ['nao', 'x', 'Não emito', 'Nada de nota aparece no app.'],
];

// ------------------------------------------------------------------ servidor (status da conta no emissor)
let servidor = null;
function lerStatus() {
  if (!naConta()) { servidor = { conectado: !!nf().conectadoDemo, provedor: nf().provedor || 'focus', demo: true }; return Promise.resolve(servidor); }
  return window.veltriaNfse({ acao: 'status' }).then((s) => { servidor = s || {}; return servidor; }).catch(() => (servidor = { desligado: true }));
}
const desligado = () => naConta() && servidor && (servidor.desligado || servidor.ok === false);

// ------------------------------------------------------------------ período e lista
const PERIODOS = [['hoje', 'Hoje'], ['7', '7 dias'], ['mes', 'Este mês'], ['mespassado', 'Mês passado']];
function intervalo(k) {
  const h = hoje(), ini = `${h.slice(0, 8)}01`;
  if (k === '7') return [somaDias(h, -6), h];
  if (k === 'mes') return [ini, h];
  if (k === 'mespassado') { const fim = somaDias(ini, -1); return [`${fim.slice(0, 8)}01`, fim]; }
  return [h, h];
}
const recebimentos = (de, ate) => (db.fin || []).filter((f) => f.tipo === 'e' && f.pago && f.data >= de && f.data <= ate).sort((a, b) => b.data.localeCompare(a.data));
const temNota = (f) => (f.nfse && f.nfse.status !== 'cancelada') || !!f.nfOutro;
const situacao = (f) => (f.nfse ? { autorizada: 'NFS-e autorizada', processando: 'NFS-e em processamento', cancelada: 'NFS-e cancelada' }[f.nfse.status] || 'NFS-e' : f.nfOutro ? 'nota no Emissor Nacional/contador' : 'sem nota');
const numNota = (f) => (f.nfse && f.nfse.numero ? String(f.nfse.numero) : f.nfOutro ? f.nfOutro.ref || '' : '');
const tomadorDe = (f) => { const o = f.obra ? achar('obras', f.obra) : null, id = o ? o.cliente : f.cli; return id ? achar('clientes', id) : null; };
const servicoDe = (f) => { const o = f.obra ? achar('obras', f.obra) : null; return o ? o.titulo : String(f.desc || 'Serviço').replace(/\s*\((Pix|Dinheiro|Cartão|Transferência)\)$/i, ''); };

// ------------------------------------------------------------------ etiqueta curta e botão para cada recebimento
function etiqueta(f) {
  if (f.nfse) return `<span class="tag" style="${f.nfse.status === 'autorizada' ? 'background:var(--musgo-claro);color:var(--musgo)' : ''}">${f.nfse.status === 'autorizada' ? `NFS-e nº ${t(f.nfse.numero || '')}${f.nfse.ambiente !== 'producao' ? ' (teste)' : ''}` : t(situacao(f))}</span>`;
  if (f.nfOutro) return `<span class="tag" style="background:var(--musgo-claro);color:var(--musgo)">NFS-e${f.nfOutro.ref ? ` nº ${t(f.nfOutro.ref)}` : ' anotada'}</span>`;
  return '<span class="tag">sem nota</span>';
}
function botao(f) {
  const m = modo();
  if (f.nfse && f.nfse.status === 'autorizada' && m !== 'api') return `<button type="button" class="bt leve p" data-acao="nf-ver" data-id="${f.id}">${ico('doc')}Ver a nota</button>`;
  if (m === 'outro' || (m === 'api' && desligado() && !f.nfse)) return `<button type="button" class="bt leve p" data-acao="nf-anotar" data-id="${f.id}">${ico('lapis')}${f.nfOutro ? 'Mudar o nº' : 'Anotar o nº'}</button>`;
  if (m !== 'api') return '';
  if (!f.nfse || f.nfse.status === 'cancelada') return `<button type="button" class="bt cheio p" data-acao="nf-emitir" data-id="${f.id}">${ico('doc')}Emitir NFS-e</button>`;
  if (f.nfse.status === 'processando') return `<button type="button" class="bt leve p" data-acao="nf-consultar" data-id="${f.id}">${ico('recarregar')}Atualizar</button>`;
  return `<button type="button" class="bt leve p" data-acao="nf-ver" data-id="${f.id}">${ico('doc')}Ver a nota</button>`;
}

// ------------------------------------------------------------------ bloco no recibo
export function blocoRecibo(id) {
  const f = achar('fin', id), m = modo();
  if (!f || f.tipo !== 'e' || !m || m === 'nao') return '';
  if (!servidor) lerStatus().then(() => { if (document.getElementById('nf-recibo')) repinta(); });
  const n = f.nfse;
  return `<div class="cartao so-tela" id="nf-recibo" style="margin-top:14px"><div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap"><b>Nota fiscal de serviço</b>${etiqueta(f)}</div>
    ${n && n.status === 'autorizada' ? `<p class="mudo" style="margin:6px 0 0;font-size:13px">Emitida em ${dataBR(new Date(n.ts).toISOString())}${n.codigo ? ` · código ${t(n.codigo)}` : ''}</p>` : ''}
    ${f.nfErro && !n ? `<p class="mudo" style="margin:6px 0 0;font-size:13px;color:var(--brasa)">Última tentativa: ${t(f.nfErro)}</p>` : ''}
    <div class="acoes">${botao(f)}${n && n.status === 'autorizada' && n.pdf ? `<a class="bt leve p" href="${t(n.pdf)}" target="_blank" rel="noopener">PDF da nota</a>` : ''}${n && n.status === 'autorizada' ? `<button type="button" class="bt leve p" data-acao="nf-cancelar" data-id="${f.id}">Cancelar a nota</button>` : ''}<a class="bt leve p" href="#notas">Notas do mês</a></div></div>`;
}

// ------------------------------------------------------------------ emitir pela API (ou simulado na demonstração)
function notaDe(f, v) {
  const N = nf();
  return { data: f.data, servico: { descricao: v.descricao.slice(0, 2000), valor: Math.round(f.valor) / 100, codigo_tributacao_nacional: soDig(v.cod).slice(0, 6), item_lc116: N.itemLc || '', ...(Number(N.aliquota) > 0 ? { aliquota_iss: Number(N.aliquota) } : {}) },
    tomador: { nome: v.nome.slice(0, 115), doc: soDig(v.doc), email: v.email.slice(0, 80) } };
}
const emAndamento = new Set();
async function emitir(f, v) {
  if (emAndamento.has(f.id)) return; emAndamento.add(f.id);
  const ref = `atria-${String(f.id).replace(/[^A-Za-z0-9_-]/g, '')}${f.nfTentativas ? `-${f.nfTentativas}` : ''}`, nota = notaDe(f, v);
  toast('Emitindo a NFS-e...');
  let r;
  try {
    r = naConta() ? await window.veltriaNfse({ acao: 'emitir', ref, nota })
      : await new Promise((ok) => setTimeout(() => ok({ ok: true, status: 'autorizada', numero: (db.fin || []).filter((x) => x.nfse && x.nfse.demo).length + 1, codigo_verificacao: Math.random().toString(36).slice(2, 10).toUpperCase(), pdf: '', ambiente: 'homologacao', demo: true }), 700));
  } catch { r = { ok: false, mensagem: 'Sem internet agora. Tente de novo.' }; }
  emAndamento.delete(f.id);
  if (!r || !r.ok) {
    if (!(r && r.desligado)) f.nfTentativas = (f.nfTentativas || 0) + 1;
    f.nfErro = String((r && r.mensagem) || 'A nota não saiu').slice(0, 240); grava(); repinta();
    toast(r && r.desligado ? 'Emissão pela API ainda não ativada: anote o nº da nota' : `A NFS-e não saiu: ${f.nfErro}`, 'erro'); return;
  }
  f.nfse = { status: r.status === 'processando' ? 'processando' : 'autorizada', numero: r.numero || '', codigo: r.codigo_verificacao || '', pdf: /^https:\/\//.test(r.pdf || '') ? String(r.pdf).slice(0, 400) : '',
    ambiente: r.ambiente || nf().ambiente || 'homologacao', provedor: naConta() ? nf().provedor || '' : 'demo', ref, ts: Date.now(), tomador: nota.tomador.nome, doc: nota.tomador.doc, servico: nota.servico.descricao, ...(r.demo ? { demo: true } : {}) };
  delete f.nfErro; grava(); repinta();
  toast(f.nfse.status === 'autorizada' ? `NFS-e${f.nfse.numero ? ` nº ${f.nfse.numero}` : ''} autorizada` : 'NFS-e enviada: a prefeitura ainda está processando');
}
function folhaEmitir(f) {
  const c = tomadorDe(f), N = nf();
  folha({ titulo: `Emitir NFS-e · ${din(f.valor)}`, corpo: `<label class="campo"><span>Tomador (quem pagou)</span><input data-n maxlength="115" value="${t(c ? c.nome : '')}"></label>
    <div class="duas"><label class="campo"><span>CPF ou CNPJ</span><input data-doc inputmode="numeric" maxlength="18" value="${t(c && c.doc || '')}" autocomplete="off"></label><label class="campo"><span>E-mail (opcional)</span><input data-email type="email" maxlength="80" value="${t(c && c.email || '')}"></label></div>
    <label class="campo"><span>Serviço prestado</span><textarea data-desc maxlength="2000">${t(servicoDe(f))}</textarea></label>
    <label class="campo"><span>Código de tributação nacional</span><input data-cod inputmode="numeric" maxlength="8" value="${t(N.codTrib || '070201')}"><small>6 números da lista nacional (ex.: 070201 obra e reforma). Confirme com o seu contador.</small></label>
    ${!naConta() ? `<p class="mudo" style="${AVISO}">Demonstração: sai uma nota de exemplo, em ambiente de teste (sem valor fiscal).</p>` : N.ambiente !== 'producao' ? `<p class="mudo" style="${AVISO}">Ambiente de teste (homologação): a nota não tem valor fiscal.</p>` : ''}`,
  pe: '<button type="button" class="bt leve" data-fechar>Voltar</button><button type="button" class="bt cheio" data-ok>Emitir</button>',
  aoAbrir: (el, api) => { $('[data-ok]', el).onclick = () => {
    const v = { nome: $('[data-n]', el).value.trim(), doc: $('[data-doc]', el).value, email: $('[data-email]', el).value.trim(), descricao: $('[data-desc]', el).value.trim(), cod: $('[data-cod]', el).value };
    const d = soDig(v.doc);
    if (!v.nome) return toast('Escreva o nome de quem pagou', 'erro');
    if (d.length !== 11 && d.length !== 14) return toast('O CPF tem 11 números e o CNPJ, 14', 'erro');
    if (!v.descricao) return toast('Escreva o serviço prestado', 'erro');
    if (soDig(v.cod).length !== 6) return toast('O código de tributação tem 6 números', 'erro');
    if (c) { c.doc = d; if (v.email) c.email = v.email; }
    api.fechar(); emitir(f, v);
  }; } });
}
function verNota(f) {
  const n = f.nfse || {}, eu = db.perfil, P = nf().prestador || {};
  folha({ titulo: `NFS-e nº ${t(n.numero || '')}`, corpo: `<article class="doc"><h3 style="margin:0">Nota Fiscal de Serviço eletrônica</h3>${n.ambiente !== 'producao' ? '<p style="margin:4px 0 0"><b>AMBIENTE DE TESTE · SEM VALOR FISCAL</b></p>' : ''}
      <table style="margin-top:10px"><tr><td>Número</td><td>${t(n.numero || '')}</td></tr>${n.codigo ? `<tr><td>Código de verificação</td><td>${t(n.codigo)}</td></tr>` : ''}<tr><td>Emitida</td><td>${dataBR(new Date(n.ts || Date.now()).toISOString())}</td></tr>
      <tr><td>Prestador</td><td>${t(eu.marca || eu.nome)}${P.cnpj ? `<br><small>CNPJ ${t(P.cnpj)}</small>` : ''}</td></tr><tr><td>Tomador</td><td>${t(n.tomador || '')}${n.doc ? `<br><small>${n.doc.length === 14 ? 'CNPJ' : 'CPF'} ${t(n.doc)}</small>` : ''}</td></tr>
      <tr><td>Serviço</td><td>${t(n.servico || servicoDe(f))}</td></tr><tr class="tot"><td>Valor</td><td>${din(f.valor)}</td></tr></table></article>
      ${n.pdf ? '' : `<p class="mudo" style="font-size:13px">${n.demo ? 'Demonstração: na conta, aqui abre o PDF oficial da nota.' : 'O PDF oficial fica no painel do seu emissor.'}</p>`}`,
  pe: `${n.pdf ? `<a class="bt leve" href="${t(n.pdf)}" target="_blank" rel="noopener">PDF da nota</a>` : ''}<button type="button" class="bt cheio" data-fechar>Fechar</button>` });
}
async function consultar(f) {
  if (!naConta() || !f.nfse) return;
  const r = await window.veltriaNfse({ acao: 'consultar', ref: f.nfse.ref });
  if (!r || !r.ok) return toast((r && r.mensagem) || 'Ainda sem resposta da prefeitura', 'erro');
  Object.assign(f.nfse, { status: r.status === 'cancelada' ? 'cancelada' : r.status === 'processando' ? 'processando' : 'autorizada', numero: r.numero || f.nfse.numero, codigo: r.codigo_verificacao || f.nfse.codigo, pdf: /^https:\/\//.test(r.pdf || '') ? r.pdf : f.nfse.pdf });
  grava(); repinta(); toast(f.nfse.status === 'autorizada' ? 'NFS-e autorizada' : 'Ainda em processamento');
}
function cancelar(f) {
  folha({ titulo: `Cancelar a NFS-e nº ${t(f.nfse.numero || '')}?`, corpo: `<label class="campo"><span>Motivo (no mínimo 15 letras)</span><textarea data-mot maxlength="255" placeholder="Ex.: serviço lançado em duplicidade"></textarea></label><p class="mudo" style="font-size:13px">Cada prefeitura tem um prazo para cancelar. Passou do prazo, fale com o seu contador.</p>`,
    pe: '<button type="button" class="bt leve" data-fechar>Voltar</button><button type="button" class="bt cheio" data-ok>Cancelar a nota</button>',
    aoAbrir: (el, api) => { $('[data-ok]', el).onclick = async () => {
      const motivo = $('[data-mot]', el).value.trim(); if (motivo.length < 15) return toast('Escreva o motivo com pelo menos 15 letras', 'erro');
      api.fechar();
      let r; try { r = naConta() && !f.nfse.demo ? await window.veltriaNfse({ acao: 'cancelar', ref: f.nfse.ref, motivo }) : { ok: true }; } catch { r = { ok: false, mensagem: 'Sem internet agora.' }; }
      if (!r || !r.ok) return toast((r && r.mensagem) || 'A prefeitura não aceitou o cancelamento', 'erro');
      f.nfse = { ...f.nfse, status: 'cancelada', cancelada: { ts: Date.now(), motivo } }; grava(); repinta(); toast('NFS-e cancelada');
    }; } });
}
function anotar(f) {
  folha({ titulo: 'Nº da NFS-e deste recebimento', corpo: `<label class="campo"><span>Número da nota</span><input data-ref maxlength="60" inputmode="numeric" value="${t(f.nfOutro ? f.nfOutro.ref : '')}" placeholder="Ex.: 123"></label><p class="mudo" style="font-size:13px">A nota você emite no Emissor Nacional, na prefeitura ou pelo contador. Aqui fica anotado para saber o que já tem nota e exportar o mês.</p>
    <p style="margin:8px 0 0"><a href="${EMISSOR_NACIONAL}" target="_blank" rel="noopener">Abrir o Emissor Nacional</a></p>`,
  pe: `${f.nfOutro ? '<button type="button" class="bt leve" data-tirar>Tirar</button>' : '<button type="button" class="bt leve" data-fechar>Voltar</button>'}<button type="button" class="bt cheio" data-ok>Salvar</button>`,
  aoAbrir: (el, api) => {
    $('[data-ok]', el).onclick = () => { f.nfOutro = { ref: $('[data-ref]', el).value.trim().slice(0, 60), ts: Date.now() }; grava(); api.fechar(); repinta(); toast('Nota anotada'); };
    const x = $('[data-tirar]', el); if (x) x.onclick = () => { delete f.nfOutro; grava(); api.fechar(); repinta(); toast('Anotação tirada'); };
  } });
}
const fin = (b) => achar('fin', b.dataset.id);
ACOES['nf-emitir'] = (b) => { const f = fin(b); if (f) folhaEmitir(f); };
ACOES['nf-ver'] = (b) => { const f = fin(b); if (f) verNota(f); };
ACOES['nf-consultar'] = (b) => { const f = fin(b); if (f) consultar(f); };
ACOES['nf-cancelar'] = (b) => { const f = fin(b); if (f && f.nfse) cancelar(f); };
ACOES['nf-anotar'] = (b) => { const f = fin(b); if (f) anotar(f); };

// ------------------------------------------------------------------ exportar o período (CSV para o Emissor Nacional ou o contador)
const csvCel = (s) => { const x = String(s ?? ''); return /[;"\n\r]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
export function csv(lista) {
  const cab_ = ['Data', 'Tomador', 'CPF/CNPJ', 'Serviço', 'Valor', 'Nº NFS-e', 'Situação'];
  const linhas = lista.map((f) => { const c = tomadorDe(f); return [dataBR(f.data), (f.nfse && f.nfse.tomador) || (c ? c.nome : ''), (f.nfse && f.nfse.doc) || (c && c.doc) || '', (f.nfse && f.nfse.servico) || servicoDe(f), (Math.round(f.valor) / 100).toFixed(2).replace('.', ','), numNota(f), situacao(f)]; });
  return `﻿${[cab_, ...linhas].map((l) => l.map(csvCel).join(';')).join('\r\n')}`;
}
function baixar(nome, texto) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' })); a.download = nome; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

// ------------------------------------------------------------------ tela: notas do período
let per = 'mes', soSem = false;
TELAS.notas = () => {
  const m = modo();
  if (!m || m === 'nao') return `${cab('Notas fiscais')}<div class="vazio"><b>Nota fiscal desligada</b>Em Configurações › Nota fiscal, diga como você emite nota.</div><div class="acoes"><a class="bt cheio" href="#ajustes" data-acao="nf-cfg">Abrir Configurações</a></div>`;
  const [de, ate] = intervalo(per), todos = recebimentos(de, ate), l = soSem ? todos.filter((f) => !temNota(f)) : todos;
  const com = todos.filter(temNota).length, soma = l.reduce((s, f) => s + f.valor, 0);
  return `${cab('Notas fiscais', 'Recebimentos e notas de serviço', { dica: 'Cada recebimento lançado aparece aqui. Emita ou anote o número da NFS-e e, no fim do mês, baixe a planilha para o contador.' })}
    <div class="seg" role="group" aria-label="Período" data-seg>${PERIODOS.map(([k, n]) => `<button type="button" data-acao="nf-per" data-p="${k}" aria-pressed="${per === k}">${n}</button>`).join('')}<i></i></div>
    <div class="cartao" style="margin-top:12px"><div class="dois-num"><div><small>Recebido</small><b>${din(todos.reduce((s, f) => s + f.valor, 0))}</b></div><div><small>Com nota</small><b>${com} de ${todos.length}</b></div></div>
      <label class="campo" style="display:flex;gap:10px;align-items:center;margin:12px 0 0"><input type="checkbox" data-acao="nf-sosem" ${soSem ? 'checked' : ''} style="width:22px;height:22px;min-height:0;flex:none;padding:0"><span style="margin:0">Mostrar só os sem nota</span></label></div>
    ${m === 'api' && desligado() ? `<p class="mudo" style="${AVISO};margin-top:12px">Em breve: a emissão pela API ainda está sendo ativada. Por enquanto, anote o nº da nota que você emite no Emissor Nacional.</p>` : ''}
    <div class="lista" style="margin-top:12px">${l.map((f) => { const c = tomadorDe(f); return `<div class="cartao" style="padding:12px 14px"><div style="display:flex;gap:10px;justify-content:space-between;align-items:flex-start"><div style="min-width:0"><b style="display:block;overflow-wrap:anywhere">${t(c ? c.nome : servicoDe(f))}</b><small class="mudo">${dataBR(f.data)}${c ? ` · ${t(servicoDe(f))}` : ''}</small></div><b class="num" style="flex:none">${din(f.valor)}</b></div>
      <div style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:8px">${etiqueta(f)}<span style="display:flex;gap:6px;flex-wrap:wrap"><a class="bt leve p" href="#recibo/${f.id}">Recibo</a>${botao(f)}</span></div></div>`; }).join('') || `<div class="vazio"><b>Nenhum recebimento ${soSem ? 'sem nota ' : ''}neste período</b>Os pagamentos que você lança em “Recebi” aparecem aqui.</div>`}</div>
    <div class="acoes"><button type="button" class="bt cheio" data-acao="nf-csv" ${l.length ? '' : 'disabled'}>${ico('doc')}Baixar planilha (${l.length} · ${din(soma)})</button>${m === 'outro' || desligado() ? `<a class="bt leve" href="${EMISSOR_NACIONAL}" target="_blank" rel="noopener">Emissor Nacional</a>` : ''}</div>`;
};
TELAS.notas.montar = () => { if (!servidor) lerStatus().then(() => { if (location.hash === '#notas') repinta(); }); };
ACOES['nf-per'] = (b) => { per = b.dataset.p; repinta(); };
ACOES['nf-sosem'] = (b) => { soSem = b.checked; repinta(); return 'segue'; };
ACOES['nf-csv'] = () => { const [de, ate] = intervalo(per), l = recebimentos(de, ate).filter((f) => !soSem || !temNota(f)); if (!l.length) return toast('Nada para exportar neste período');
  baixar(`notas-${(db.perfil.marca || db.perfil.nome || 'atria').normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase().slice(0, 30)}-${de}-a-${ate}.csv`, csv(l)); toast('Planilha baixada: abre no Excel'); };
ACOES['nf-cfg'] = () => { ir('ajustes'); };

// ------------------------------------------------------------------ seção nas Configurações
const v_ = (o, k) => t((o && o[k]) || '');
export function secao() {
  const N = nf(), m = N.modo || '', P = N.prestador || {}, s = servidor || {}, prov = N.provedor || 'focus', con = s.conectado && (!naConta() || s.provedor === prov);
  const opcoes = `<div class="lista" role="radiogroup" aria-label="Como você emite nota hoje?" style="margin-top:10px">${MODOS.map(([k, ic, n, d]) => `<button type="button" class="linha" role="radio" aria-checked="${m === k}" data-acao="nf-modo" data-k="${k}" style="${m === k ? 'outline:2px solid var(--grafite);outline-offset:-2px' : ''}"><span class="ic">${ico(m === k ? 'ok' : ic)}</span><span class="txt"><b>${n}</b><small>${d}</small></span></button>`).join('')}</div>`;
  let corpo = '';
  if (m === 'api') {
    corpo = `${desligado() ? `<p class="mudo" style="${AVISO};margin-top:12px">Em breve: a emissão pela API ainda está sendo ativada. Enquanto isso, escolha “Emito no Emissor Nacional” e anote o nº das notas.</p>` : ''}
      <h3 style="margin:16px 0 8px">A sua conta no emissor</h3>
      <div class="seg" role="group" aria-label="Emissor" data-seg>${Object.entries(PROV).map(([k, [n]]) => `<button type="button" data-acao="nf-prov" data-k="${k}" aria-pressed="${prov === k}">${n}</button>`).join('')}<i></i></div>
      <p class="mudo" style="font-size:13px;margin:8px 0">${con ? `${naConta() ? 'Conectado' : 'Demonstração: conectado'} à ${PROV[prov][0]}. O token fica guardado no servidor e não aparece aqui.` : 'O certificado digital e o acesso da prefeitura você cadastra no painel do seu emissor: aqui só vai o token.'}</p>
      <label class="campo"><span>Token da sua conta ${PROV[prov][0]}</span><input id="nf-token" type="password" autocomplete="off" spellcheck="false" maxlength="300" placeholder="${con ? 'Guardado. Cole outro só para trocar' : 'Cole aqui o token'}"><small>${PROV[prov][1]} Você paga direto ao seu emissor.</small></label>
      <div class="duas"><label class="campo"><span>CNPJ</span><input data-p="cnpj" inputmode="numeric" maxlength="18" value="${v_(P, 'cnpj')}"></label><label class="campo"><span>Inscrição municipal</span><input data-p="im" inputmode="numeric" maxlength="20" value="${v_(P, 'im')}"></label></div>
      <div class="duas"><label class="campo"><span>Código IBGE da cidade</span><input data-p="ibge" inputmode="numeric" maxlength="7" value="${v_(P, 'ibge')}" placeholder="Ex.: 3534302"><small>7 números (Orlândia 3534302)</small></label>
        <label class="campo"><span>Regime</span><select data-p="simples"><option value="1" ${P.simples !== false ? 'selected' : ''}>Simples Nacional ou MEI</option><option value="0" ${P.simples === false ? 'selected' : ''}>Outro regime</option></select></label></div>
      <label class="campo"><span>Código de tributação padrão</span><input id="nf-cod" inputmode="numeric" maxlength="8" value="${t(N.codTrib || '070201')}"><small>6 números da lista nacional. 070201: execução de obra e reforma. Confirme com o seu contador.</small></label>
      <span class="campo"><span>Ambiente</span></span><div class="seg" role="group" aria-label="Ambiente" data-seg>${[['homologacao', 'Teste'], ['producao', 'Valendo']].map(([k, n]) => `<button type="button" data-acao="nf-amb" data-k="${k}" aria-pressed="${(N.ambiente || 'homologacao') === k}">${n}</button>`).join('')}<i></i></div>
      <div class="acoes"><button type="button" class="bt cheio" data-acao="nf-conectar">${ico('ok')}${con ? 'Salvar' : 'Salvar e conectar'}</button>${con ? '<button type="button" class="bt leve" data-acao="nf-desconectar">Desconectar</button>' : ''}<a class="bt leve" href="#notas">${ico('lista')}Notas do mês</a></div>`;
  } else if (m === 'outro') {
    corpo = `<p class="mudo cfg-txt" style="margin-top:12px">Em cada recebimento (no recibo e em Notas do mês) aparece “Anotar o nº”. No fim do mês, baixe a planilha com tomador, CPF/CNPJ, serviço, valor e nº da nota para lançar ou mandar ao contador.</p>
      <div class="acoes"><a class="bt cheio" href="#notas">${ico('lista')}Notas do mês</a><a class="bt leve" href="${EMISSOR_NACIONAL}" target="_blank" rel="noopener">Emissor Nacional</a></div>`;
  } else if (m === 'nao') corpo = '<p class="mudo cfg-txt" style="margin-top:12px">Tudo certo: nada de nota aparece. Dá para mudar quando quiser. Lembrete: o MEI que presta serviço para empresa também emite a NFS-e, de graça, no Emissor Nacional.</p>';
  return `<section class="cartao cfg-sec" id="cfg-nota" aria-labelledby="cfg-nota-t" style="min-width:0;overflow-wrap:anywhere"><h2 class="cfg-t" id="cfg-nota-t">${ico('doc')}Nota fiscal</h2><p class="mudo cfg-txt">Como você emite nota hoje? A nota de serviço (NFS-e) é a do profissional; o Atria só ajuda a emitir ou a organizar.</p>${opcoes}${corpo}</section>`;
}
export function montarSecao() { if (!servidor) lerStatus().then(() => { if (document.getElementById('cfg-nota')) repinta(); }); }
ACOES['nf-modo'] = (b) => { setNf({ modo: b.dataset.k }); repinta(); toast(MODOS.find((x) => x[0] === b.dataset.k)[2]); };
ACOES['nf-prov'] = (b) => { setNf({ provedor: b.dataset.k }); repinta(); };
ACOES['nf-amb'] = (b) => { setNf({ ambiente: b.dataset.k }); repinta(); toast(b.dataset.k === 'producao' ? 'Valendo: as notas passam a ter valor fiscal' : 'Ambiente de teste'); };
const lerPrestador = () => { const p = { ...(nf().prestador || {}) }; $$('#cfg-nota [data-p]').forEach((i) => { p[i.dataset.p] = i.dataset.p === 'simples' ? i.value === '1' : soDig(i.value); }); return p; };
ACOES['nf-conectar'] = async (b) => {
  const p = lerPrestador(), tk = ($('#nf-token') || {}).value || '', cod = soDig(($('#nf-cod') || {}).value), prov = nf().provedor || 'focus';
  if (p.cnpj && p.cnpj.length !== 14) return toast('O CNPJ tem 14 números', 'erro');
  if (p.ibge && p.ibge.length !== 7) return toast('O código IBGE tem 7 números', 'erro');
  if (cod && cod.length !== 6) return toast('O código de tributação tem 6 números', 'erro');
  setNf({ prestador: p, codTrib: cod || '070201', provedor: prov });
  if (!naConta()) { if (!tk.trim() && !nf().conectadoDemo) return toast('Cole o token da sua conta', 'erro'); setNf({ conectadoDemo: true }); servidor = { ...servidor, conectado: true, provedor: prov, demo: true }; repinta(); return toast('Demonstração: conectado (nada foi enviado)'); }
  b.disabled = true;
  const r = await window.veltriaNfse({ acao: 'conectar', provedor: prov, token: tk.trim(), ambiente: nf().ambiente || 'homologacao', prestador: { cnpj: p.cnpj || '', im: p.im || '', municipio_ibge: p.ibge || '', simples: p.simples !== false } });
  const ti = $('#nf-token'); if (ti) ti.value = '';
  b.disabled = false;
  if (!r || !r.ok) { await lerStatus(); repinta(); return toast(r && r.desligado ? 'Em breve: emissão pela API ainda não ativada. Os dados ficaram salvos.' : (r && r.mensagem) || 'Não deu para conectar', 'erro'); }
  await lerStatus(); repinta(); toast(`Conectado à ${PROV[prov][0]}`);
};
ACOES['nf-desconectar'] = () => folha({ titulo: 'Desconectar o emissor?', corpo: '<p>O token é apagado do servidor. As notas já emitidas continuam anotadas nos recebimentos.</p>',
  pe: '<button type="button" class="bt leve" data-fechar>Voltar</button><button type="button" class="bt cheio" data-ok>Desconectar</button>',
  aoAbrir: (el, api) => { $('[data-ok]', el).onclick = async () => { api.fechar(); if (naConta()) await window.veltriaNfse({ acao: 'desconectar' }); else setNf({ conectadoDemo: false }); await lerStatus(); repinta(); toast('Desconectado'); }; } });
