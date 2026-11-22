// Tecton · página do cliente: etapas, % feito, fotos, o que já pagou e o que falta, e o botão Aprovar. Sem login e sem custos internos.
// Lê o retrato que vem no endereço (#d=...). Se este aparelho tiver a obra (a mesma demonstração ou a conta da construtora),
// mostra os dados atuais e todas as fotos, inclusive as tiradas pelo celular.
// Aprovar: neste aparelho, o aceite é gravado nos dados e a construtora vê na hora (com nome, data e hora). Em outro aparelho
// (sem servidor de aceites), o botão abre o WhatsApp da construtora com a aprovação escrita, que serve de comprovante.
const t = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const R$ = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (s) => { if (!s) return ''; const [a, m, d] = String(s).slice(0, 10).split('-'); return `${d}/${m}/${a}`; };
const barra = (v) => `<div class="barra"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div>`;
const agora = () => { const x = new Date(Date.now() - 3 * 3600e3).toISOString(); return { em: x.slice(0, 10), hora: x.slice(11, 16) }; };
const CH = 'tecton-v1';
const el = document.getElementById('obra');
function doEndereco() {
  const m = location.hash.match(/d=([A-Za-z0-9_-]+)/); if (!m) return null;
  try { const b = m[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(b + '==='.slice((b.length + 3) % 4))))); } catch { return null; }
}
function lerTudo() { try { return JSON.parse(localStorage.getItem(CH) || 'null'); } catch { return null; } }
function desteAparelho(token, r = lerTudo()) {
  if (!r) return null;
  const emps = r.empresas ? Object.values(r.empresas) : [r];
  for (const e of emps) { const o = (e.obras || []).find((x) => x.token === token); if (o) return { r, e, o }; }
  return null;
}
function retrato(x) {
  const { e, o } = x, fin = (e.fin || []).filter((f) => f.obra === o.id && f.tipo === 'receber'), ad = (o.aditivos || []).filter((a) => a.status === 'aprovado').reduce((s, a) => s + a.valor, 0);
  const venda = (et) => (o.orc || []).filter((i) => i.etapa === et).reduce((s, i) => s + i.qtd * i.unit, 0), tot = o.etapas.reduce((s, et) => s + venda(et.id), 0);
  const fis = tot ? o.etapas.reduce((s, et) => s + et.pct * venda(et.id), 0) / tot : o.etapas.reduce((s, et) => s + et.pct, 0) / (o.etapas.length || 1);
  const pend = (o.aceitesLink || []).map((a) => a.id), cli = (e.pessoas || []).find((p) => p.id === o.cliente);
  return { e: e.config.nome, f: e.config.fone, cl: cli?.nome || '', o: o.nome, end: o.endereco, ini: o.inicio, fim: o.fim, fis: Math.round(fis), c: (o.valor || 0) + ad, pg: fin.filter((f) => f.pago).reduce((s, f) => s + f.valor, 0),
    ab: fin.filter((f) => !f.pago).map((f) => [f.desc.replace(` · ${o.nome}`, ''), f.valor, f.venc]), et: o.etapas.map((et) => [et.nome, et.pct, et.ini, et.fim]),
    ad: (o.aditivos || []).filter((a) => a.status !== 'recusado').map((a) => [a.desc, a.valor, pend.includes(a.id) ? 'aprovado' : a.status, a.id, a.aprov?.como === 'Link do cliente' ? a.aprov : (o.aceitesLink || []).find((y) => y.id === a.id) || null]),
    md: (o.medicoes || []).map((m, i) => [`Medição ${i + 1} (${dataBR(m.dia)})`, m.valor, m.status === 'aberta' && !pend.includes(m.id) ? 'aberta' : 'aprovada', m.id, m.aprov?.como === 'Link do cliente' ? m.aprov : (o.aceitesLink || []).find((y) => y.id === m.id) || null]).filter((x) => x[2] === 'aberta' || x[4]),
    di: (o.diario || []).slice().sort((a, b) => b.dia.localeCompare(a.dia)).slice(0, 8).map((d) => [d.dia, d.texto, d.fotos || []]) };
}
const tok = new URLSearchParams(location.search).get('o') || '';
const daqui = () => (tok ? desteAparelho(tok) : null);
// aceites dados em outro aparelho ficam guardados aqui só para mostrar "você aprovou"
const meus = () => { try { return JSON.parse(localStorage.getItem('tecton-aceites-' + tok) || '{}'); } catch { return {}; } };
function guardarMeu(id, a) { try { localStorage.setItem('tecton-aceites-' + tok, JSON.stringify({ ...meus(), [id]: a })); } catch { /* sem espaço */ } }
function aprovacoes(d) {
  const m = meus(), itens = [...(d.md || []).map((x) => ({ tipo: 'medicao', n: x[0], v: x[1], st: x[2], id: x[3], ap: x[4] })), ...(d.ad || []).filter((x) => x[3]).map((x) => ({ tipo: 'aditivo', n: `Aditivo: ${x[0]}`, v: x[1], st: x[2] === 'enviado' ? 'aberta' : 'aprovada', id: x[3], ap: x[4] }))]
    .map((x) => (x.st === 'aberta' && m[x.id] ? { ...x, st: 'aprovada', ap: m[x.id], zap: true } : x)).filter((x) => x.st === 'aberta' || x.ap);
  if (!itens.length) return '';
  return `<div class="cartao aprovar" style="margin-top:16px"><h2>Para você aprovar</h2><p class="mudo peq" style="margin-bottom:8px">Confira e aprove aqui mesmo. A construtora recebe a sua aprovação com nome, data e hora.</p><ul class="lista">${itens.map((x) => `<li data-item="${t(x.id)}"><div class="tx"><b>${t(x.n)}</b>${x.st === 'aberta' ? '<small>esperando a sua aprovação</small>' : `<small class="verde"><b>Aprovado por ${t(x.ap.por)} em ${dataBR(x.ap.em)}${x.ap.hora ? ` às ${t(x.ap.hora)}` : ''}</b>${x.zap ? ' · enviado no WhatsApp' : ''}</small>`}</div><div class="val">${R$(x.v)}</div>${x.st === 'aberta' ? `<button type="button" class="bt cheio" data-aprovar="${t(x.id)}" data-tipo="${x.tipo}" data-n="${t(x.n)}" data-v="${x.v}">Aprovar</button>` : '<span class="et ok">aprovado</span>'}</li>`).join('')}</ul></div>`;
}
function montar() {
  const local = daqui(), d = local ? retrato(local) : doEndereco();
  if (!d) { el.innerHTML = '<div class="cartao" style="margin-top:40px"><h2>Link incompleto</h2><p class="mudo">Peça à construtora para mandar o link de novo.</p></div>'; return; }
  document.title = `${d.o} · acompanhe a obra`;
  el.innerHTML = `<header class="cli-topo"><small>${t(d.e)}</small><h1>${t(d.o)}</h1><small>${t(d.end || '')}</small><small>Início ${dataBR(d.ini)} · entrega prevista ${dataBR(d.fim)}</small></header>
  <div class="grade g3"><div class="cartao num"><div><small>Obra feita</small><b>${d.fis}%</b>${barra(d.fis)}<span>entrega prevista ${dataBR(d.fim)}</span></div></div><div class="cartao num"><div><small>Você já pagou</small><b>${R$(d.pg)}</b><span>de ${R$(d.c)} do contrato</span></div></div>${(() => { const p = d.ab.slice().sort((a, b) => String(a[2]).localeCompare(String(b[2])))[0]; return `<div class="cartao num"><div><small>Próximo pagamento</small><b>${p ? R$(p[1]) : 'nenhum'}</b><span>${p ? `${t(p[0])} · vence ${dataBR(p[2])}` : 'nada em aberto agora'}</span></div></div>`; })()}</div>
  ${aprovacoes(d)}
  <div class="cartao" style="margin-top:16px"><h2>Etapas</h2><ul class="lista etapas-cli">${d.et.map(([n, p, i, f]) => `<li><span class="ponto ${p >= 100 ? 'ok' : p > 0 ? 'and' : ''}"></span><div class="tx"><b>${t(n)}</b><small>de ${dataBR(i)} até ${dataBR(f)}</small></div><div class="et-barra">${barra(p)}</div><b class="et-pct">${p}%</b></li>`).join('')}</ul></div>
  ${d.ab.length ? `<div class="cartao"><h2>Próximos pagamentos</h2><ul class="lista">${d.ab.map(([n, v, ve]) => `<li><div class="tx"><b>${t(n)}</b><small>vence ${dataBR(ve)}</small></div><div class="val">${R$(v)}</div></li>`).join('')}</ul></div>` : ''}
  ${d.ad.filter((x) => x[2] === 'aprovado').length ? `<div class="cartao"><h2>Aditivos aprovados</h2><ul class="lista">${d.ad.filter((x) => x[2] === 'aprovado').map(([n, v]) => `<li><div class="tx"><b>${t(n)}</b><small>somado ao contrato</small></div><div class="val">${R$(v)}</div></li>`).join('')}</ul></div>` : ''}
  <div class="cartao"><h2>Diário da obra</h2>${d.di.length ? `<ul class="lista">${d.di.map(([dia, tx, fs]) => `<li><div class="tx"><b>${dataBR(dia)}</b><small>${t(tx)}</small>${fs.length ? `<div class="fotos" style="margin-top:8px">${fs.filter((f) => /^(fotos\/|data:image\/)/.test(f)).map((f) => `<img src="${t(f)}" alt="Foto da obra em ${dataBR(dia)}" loading="lazy">`).join('')}</div>` : ''}</div></li>`).join('')}</ul>` : '<p class="mudo">Ainda sem registros.</p>'}</div>
  ${d.f ? `<p style="text-align:center;margin-top:16px"><a class="bt cheio" href="https://wa.me/55${String(d.f).replace(/\D/g, '')}" rel="noopener">Falar com a construtora</a></p>` : ''}`;
  el.querySelectorAll('[data-aprovar]').forEach((b) => b.onclick = () => pedirNome(b, d));
}
function pedirNome(b, d) {
  const li = b.closest('li'); if (li.querySelector('.aprovar-form')) return;
  li.insertAdjacentHTML('beforeend', `<form class="aprovar-form"><label class="campo"><span>Seu nome (fica registrado na aprovação)</span><input name="nome" required value="${t(d.cl || '')}" autocomplete="name"></label><p class="mudo peq">Ao confirmar, você aprova ${t(b.dataset.n)} de ${R$(Number(b.dataset.v))}.</p><div class="linha-bts"><button type="button" class="bt" data-cancela>Cancelar</button><button type="submit" class="bt cheio">Confirmar aprovação</button></div></form>`);
  const f = li.querySelector('form'); f.querySelector('input').focus();
  f.querySelector('[data-cancela]').onclick = () => f.remove();
  f.onsubmit = (ev) => {
    ev.preventDefault(); const por = f.nome.value.trim(); if (!por) return; const a = { tipo: b.dataset.tipo, id: b.dataset.aprovar, por, ...agora() };
    const x = daqui();
    if (x) { // mesmo aparelho (demonstração ou conta da construtora): grava o aceite; o sistema transforma em aprovação
      const o = x.o; (o.aceitesLink ||= []).push(a);
      try { localStorage.setItem(CH, JSON.stringify(x.r)); } catch { /* sem espaço */ }
      montar(); avisar('Aprovação registrada. A construtora já vê no sistema, com o seu nome, a data e a hora.'); return;
    }
    guardarMeu(a.id, a);
    const txt = `Aprovo ${b.dataset.n} de ${R$(Number(b.dataset.v))} da obra ${d.o}. ${por}, ${dataBR(a.em)} às ${a.hora}.`;
    if (d.f) window.open(`https://wa.me/55${String(d.f).replace(/\D/g, '')}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
    montar(); avisar('Aprovação enviada à construtora pelo WhatsApp.');
  };
}
function avisar(txt) { const p = document.createElement('div'); p.className = 'toast'; p.setAttribute('role', 'status'); p.textContent = txt; document.body.append(p); setTimeout(() => p.remove(), 4200); }
montar();
