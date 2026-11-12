// Atria · funções essenciais da auditoria (11/11/2026): agenda com lembrete no calendário do celular,
// recibo de pagamento (inclusive parcial), ajudantes por diária, MEI (limite do ano e DAS) e resumo do mês.
import { $, $$, t, din, dinCurto, lerDin, hoje, somaDias, dias, dataBR, quando, uid, ico, av, db, grava, achar, toast, folha, formulario, copiar, abrirZap, repinta, ir, cab, vibra } from './base.js?v=13';
import { totais, cliente, somaPeriodo, intervalo, abrirMensagens } from './gestao.js?v=13';

export const TELAS = {};
export const ACOES = {};

// ------------------------------------------------------------------ agenda de todas as obras
const visitas = () => db.obras.flatMap((o) => (o.agenda || []).map((a) => ({ ...a, o }))).sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora));
TELAS.agenda = () => {
  const H = hoje(), prox = visitas().filter((v) => v.data >= H), dias7 = {};
  prox.forEach((v) => { (dias7[v.data] = dias7[v.data] || []).push(v); });
  return `${cab('Agenda', 'Visitas, começos e entregas', { dica: 'Toque no sino para pôr a visita no calendário do celular: ele avisa 1 hora antes, mesmo com o Atria fechado.' })}
    ${Object.keys(dias7).length ? Object.entries(dias7).map(([d, l]) => `<h2 class="sec">${quando(d)} <span class="mudo num" style="font-size:13px">${dataBR(d)}</span></h2><div class="lista">${l.map((v) => `<div class="linha" style="cursor:default"><span class="ic"><b class="num" style="font-size:13px">${t(v.hora)}</b></span><a class="txt" href="#obra/${v.o.id}" style="color:inherit;text-decoration:none"><b>${t(v.nota)}</b><small>${t(cliente(v.o.cliente).nome)} · ${t(v.o.titulo)}</small></a><button type="button" class="bt leve p" data-acao="ics" data-o="${v.o.id}" data-a="${v.id}" aria-label="Pôr no calendário do celular">${ico('sino')}</button><button type="button" class="bt zap p" data-acao="mensagens" data-m="visita" data-o="${v.o.id}" aria-label="Avisar o cliente">${ico('zap')}</button></div>`).join('')}</div>`).join('')
      : '<div class="vazio"><b>Nada marcado</b>Marque a próxima visita ou o começo de uma obra.</div>'}
    <button type="button" class="bt cheio largo" style="margin-top:16px" data-acao="marcar">${ico('calendario')}Marcar visita ou serviço</button>`;
};
ACOES.marcar = () => formulario({ titulo: 'Marcar na agenda', rotulo: 'Marcar',
  campos: [{ n: 'obra', r: 'Obra', tipo: 'sel', ops: db.obras.filter((o) => o.status !== 'concluida').map((o) => [o.id, `${o.titulo} · ${cliente(o.cliente).nome}`]) }, { n: 'nota', r: 'O que vai fazer', obrig: true, voz: true, lista: ['Visita para medir', 'Começar a obra', 'Entrega', 'Buscar material'] }, { n: 'data', r: 'Dia', tipo: 'data', meio: true, valor: somaDias(hoje(), 1) }, { n: 'hora', r: 'Hora', tipo: 'hora', meio: true, valor: '08:00' }],
  salvar: (v) => { const o = achar('obras', v.obra); if (!o) return 'Escolha a obra.'; const a = { id: uid('a'), nota: v.nota, data: v.data, hora: v.hora }; o.agenda.push(a); o.hist.push({ data: hoje(), txt: `Marcado: ${v.nota} em ${dataBR(v.data)}` }); grava(); repinta(); toast('Marcado. Pôr no calendário do celular?', 'ok', { rotulo: 'Pôr', fazer: () => baixarIcs(o, a) }); } });
// arquivo de calendário: o celular abre no app de agenda e lembra 1 hora antes
function baixarIcs(o, a) {
  const z = (s) => String(s).replace(/[-:]/g, ''), ini = `${z(a.data)}T${z(a.hora)}00`, [hh, mm] = a.hora.split(':').map(Number);
  const fimH = String(Math.min(23, hh + 2)).padStart(2, '0'), fim = `${z(a.data)}T${fimH}${String(mm).padStart(2, '0')}00`, c = cliente(o.cliente);
  const esc = (s) => String(s || '').replace(/[,;\\]/g, (x) => `\\${x}`).replace(/\n/g, '\\n');
  const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Atria//Agenda//PT', 'BEGIN:VEVENT', `UID:${a.id}@atria`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART:${ini}`, `DTEND:${fim}`,
    `SUMMARY:${esc(`${a.nota} · ${c.nome}`)}`, `DESCRIPTION:${esc(`${o.titulo}${c.tel ? `\nWhatsApp ${c.tel}` : ''}`)}`, `LOCATION:${esc(c.end || '')}`,
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${esc(a.nota)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' })); l.download = `atria-${a.data}.ics`; l.click(); setTimeout(() => URL.revokeObjectURL(l.href), 2000);
  toast('Abra o arquivo para salvar no calendário');
}
ACOES.ics = (b) => { const o = achar('obras', b.dataset.o), a = o && o.agenda.find((x) => x.id === b.dataset.a); if (a) baixarIcs(o, a); };

// ------------------------------------------------------------------ recibo de pagamento (total ou parcial)
TELAS.recibo = (id) => {
  const f = achar('fin', id); if (!f) return cab('Recibo');
  const o = f.obra ? achar('obras', f.obra) : null, c = o ? cliente(o.cliente) : (f.cli ? cliente(f.cli) : null), eu = db.perfil, tt = o ? totais(o) : null;
  const pagoAte = o ? db.fin.filter((x) => x.obra === o.id && x.tipo === 'e' && x.pago && x.data <= f.data).reduce((s, x) => s + x.valor, 0) : f.valor;
  const resta = tt ? Math.max(0, tt.total - pagoAte) : 0, n = `${f.data.replace(/-/g, '').slice(2)}-${f.id.slice(-4).toUpperCase()}`;
  return `${cab('Recibo', `nº ${n}`)}
    <div class="acoes so-tela" style="margin-top:0"><button type="button" class="bt p" data-acao="imprimir">${ico('doc')}PDF / imprimir</button><button type="button" class="bt zap p" data-acao="recibo-zap" data-id="${f.id}">${ico('zap')}Mandar no WhatsApp</button></div>
    <article class="doc" id="doc">
      <div class="doc-cab"><img src="simbolo.svg?v=2" alt="" width="50" height="50"><div><b>${t(eu.nome)}</b><small class="mudo">${t(eu.cidade)}-${t(eu.uf)} · WhatsApp ${t(eu.zap)}</small></div></div>
      <h3 style="margin-top:18px">Recibo nº ${n}</h3>
      <p style="font-size:15px;line-height:1.6;margin:0">Recebi de <b>${t(c ? c.nome : 'cliente')}</b> a quantia de <b>${din(f.valor)}</b>${o ? `, referente a <b>${t(o.titulo.toLowerCase())}</b>` : ''}, pago${f.desc && /\((Pix|Dinheiro|Cartão|Transferência)\)$/i.test(f.desc) ? ` no ${t(f.desc.match(/\(([^)]+)\)$/)[1])}` : ''} em ${dataBR(f.data)}.</p>
      ${tt ? `<table style="margin-top:12px"><tr><td>Total do serviço</td><td>${din(tt.total)}</td></tr><tr><td>Pago até agora (com este)</td><td>${din(pagoAte)}</td></tr><tr class="tot"><td>${resta ? 'Falta pagar' : 'Quitado'}</td><td>${din(resta)}</td></tr></table>` : ''}
      <div class="assina"><span>${t(eu.nome)}</span><span>${t(eu.cidade)}, ${dataBR(f.data)}</span></div>
    </article>`;
};
ACOES['recibo-zap'] = (b) => {
  const f = achar('fin', b.dataset.id), o = f.obra ? achar('obras', f.obra) : null, c = o ? cliente(o.cliente) : null, tt = o ? totais(o) : null;
  const pago = o ? db.fin.filter((x) => x.obra === o.id && x.tipo === 'e' && x.pago && x.data <= f.data).reduce((s, x) => s + x.valor, 0) : f.valor;
  abrirZap(c ? c.tel : '', `*Recibo* · ${db.perfil.nome}\nRecebi de ${c ? c.nome : 'você'} ${din(f.valor)}${o ? ` referente a ${o.titulo.toLowerCase()}` : ''} em ${dataBR(f.data)}.${tt ? `\nTotal do serviço: ${din(tt.total)}\nPago até agora: ${din(pago)}\n${tt.total - pago > 0 ? `Falta: ${din(tt.total - pago)}` : 'Serviço quitado. Obrigado!'}` : ''}`);
};

// ------------------------------------------------------------------ ajudantes por diária
const diariasDe = (p) => (db.diarias || []).filter((d) => d.pessoa === p.id);
TELAS.equipe = () => {
  db.equipe = db.equipe || []; db.diarias = db.diarias || [];
  const semana = intervalo('semana');
  return `${cab('Ajudantes', 'Diárias e pagamento da equipe', { dica: 'Marque a diária no dia em que a pessoa trabalhou. Na hora de pagar, o Atria soma tudo e lança a saída no seu dinheiro.' })}
    <div class="lista">${db.equipe.map((p) => { const ab = diariasDe(p).filter((d) => !d.pago), deve = ab.reduce((s, d) => s + d.valor, 0), sem = diariasDe(p).filter((d) => d.data >= semana[0] && d.data <= semana[1]).length;
      return `<div class="cartao"><div style="display:flex;gap:12px;align-items:center">${av(p.nome)}<div style="flex:1;min-width:0"><b>${t(p.nome)}</b><small class="mudo" style="display:block">${t(p.funcao || 'Ajudante')} · diária ${din(p.diaria)} · ${sem} nesta semana</small></div><div style="text-align:right"><b class="num" style="color:${deve ? 'var(--cedro)' : 'inherit'}">${din(deve)}</b><small class="mudo" style="display:block;font-size:11px">a pagar (${ab.length})</small></div></div>
        <div class="acoes"><button type="button" class="bt cheio p" data-acao="diaria" data-id="${p.id}">${ico('ok')}Trabalhou hoje</button><button type="button" class="bt p" data-acao="pagar-ajudante" data-id="${p.id}" ${deve ? '' : 'disabled'}>${ico('moeda')}Pagar ${dinCurto(deve)}</button></div></div>`; }).join('') || '<div class="vazio"><b>Ninguém cadastrado</b>Cadastre quem trabalha com você por diária.</div>'}</div>
    <div class="acoes" style="margin-top:14px"><a class="bt cheio" href="#diarias">${ico('grafico')}Relatório das diárias</a><button type="button" class="bt leve" data-acao="novo-ajudante">${ico('mais')}Cadastrar ajudante</button></div>`;
};
ACOES['novo-ajudante'] = () => formulario({ titulo: 'Novo ajudante', campos: [{ n: 'nome', r: 'Nome', obrig: true, voz: true }, { n: 'funcao', r: 'Faz o quê', valor: 'Ajudante', lista: ['Ajudante', 'Servente', 'Meio-oficial', 'Pedreiro', 'Pintor'] }, { n: 'diaria', r: 'Valor da diária', tipo: 'din', meio: true, valor: 12000 }, { n: 'tel', r: 'WhatsApp', tipo: 'tel', meio: true }],
  salvar: (v) => { (db.equipe = db.equipe || []).push({ id: uid('p'), ...v }); grava(); repinta(); } });
ACOES.diaria = (b) => {
  const p = (db.equipe || []).find((x) => x.id === b.dataset.id), ativas = db.obras.filter((o) => o.status !== 'concluida');
  formulario({ titulo: `Diária de ${p.nome.split(' ')[0]}`, rotulo: 'Marcar diária',
    campos: [{ n: 'data', r: 'Dia', tipo: 'data', meio: true, valor: hoje() }, { n: 'valor', r: 'Valor', tipo: 'din', meio: true, valor: p.diaria }, { n: 'obra', r: 'Em qual obra', tipo: 'sel', ops: [['', 'Sem obra'], ...ativas.map((o) => [o.id, o.titulo])] }],
    salvar: (v) => { if ((db.diarias = db.diarias || []).some((d) => d.pessoa === p.id && d.data === v.data)) return 'Essa diária já está marcada.'; db.diarias.push({ id: uid('d'), pessoa: p.id, data: v.data, valor: v.valor, obra: v.obra, pago: false }); grava(); vibra(10); repinta(); toast('Diária marcada'); } });
};
ACOES['pagar-ajudante'] = (b) => {
  const p = db.equipe.find((x) => x.id === b.dataset.id), ab = diariasDe(p).filter((d) => !d.pago), total = ab.reduce((s, d) => s + d.valor, 0);
  folha({ titulo: `Pagar ${p.nome.split(' ')[0]}`, corpo: `<div class="lista">${ab.map((d) => `<div class="preco-linha"><span>${dataBR(d.data)}${d.obra ? ` · ${t((achar('obras', d.obra) || {}).titulo || '')}` : ''}</span><b>${din(d.valor)}</b></div>`).join('')}</div><div class="valores" style="margin-top:10px"><div class="total"><span>${ab.length} diárias</span><b>${din(total)}</b></div></div>`,
    pe: `<button type="button" class="bt leve p" data-z>${ico('zap')}Mandar o resumo</button><button type="button" class="bt cheio" data-ok>Paguei ${din(total)}</button>`,
    aoAbrir: (f, api) => {
      $('[data-z]', f).onclick = () => abrirZap(p.tel, `Oi, ${p.nome.split(' ')[0]}! Suas diárias:\n${ab.map((d) => `• ${dataBR(d.data)}: ${din(d.valor)}`).join('\n')}\nTotal: ${din(total)}`);
      $('[data-ok]', f).onclick = () => { ab.forEach((d) => { d.pago = true; }); db.fin.push({ id: uid('f'), data: hoje(), tipo: 's', valor: total, desc: `Diárias de ${p.nome}`, cat: 'Ajudante', pago: true }); grava(); api.fechar(); repinta(); toast('Pago e lançado como saída'); };
    } });
};

// ------------------------------------------------------------------ MEI: faturamento do ano, limite e DAS
export const LIMITE_MEI = 8100000; // R$ 81.000 em 2026 (gov.br diz R$ 110 mil a partir de 2027); o profissional pode mudar
export function cartaoMei() {
  const ano = hoje().slice(0, 4), fat = db.fin.filter((f) => f.tipo === 'e' && f.pago && f.data.startsWith(ano)).reduce((s, f) => s + f.valor, 0);
  const lim = db.perfil.limiteMei || LIMITE_MEI, pct = Math.min(100, Math.round(fat / lim * 100)), mes = hoje().slice(0, 7), dasPago = (db.dasPago || {})[mes];
  return `<h2 class="sec">MEI ${ano} <button type="button" class="bt leve p" data-acao="mei-ajustes">Ajustar</button></h2>
    <div class="cartao"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><small class="mudo">Faturamento do ano</small><b class="num">${din(fat)}</b></div>
      <div class="progresso" style="margin:8px 0 6px;height:10px"><i style="width:${pct}%;background:${pct > 85 ? 'var(--brasa)' : pct > 65 ? 'var(--trena)' : 'var(--giz)'}"></i></div>
      <small class="mudo">${pct}% do limite de ${dinCurto(lim)} por ano${pct > 85 ? ' · perto do limite: fale com um contador' : ''}</small>
      <div class="acoes"><button type="button" class="bt ${dasPago ? 'leve' : 'cheio'} p" data-acao="das-pago" ${dasPago ? 'disabled' : ''}>${ico(dasPago ? 'ok' : 'calendario')}${dasPago ? `DAS de ${mes.slice(5)}/${ano} pago` : 'DAS vence dia 20: já paguei'}</button><button type="button" class="bt leve p" data-acao="resumo-mes">${ico('doc')}Resumo do mês</button></div></div>`;
}
ACOES['das-pago'] = () => { (db.dasPago = db.dasPago || {})[hoje().slice(0, 7)] = 1; grava(); repinta(); toast('DAS do mês marcado como pago'); };
ACOES['mei-ajustes'] = () => formulario({ titulo: 'MEI', campos: [{ n: 'lim', r: 'Limite de faturamento por ano', tipo: 'din', valor: db.perfil.limiteMei || LIMITE_MEI, dica: 'Em 2026 o limite do MEI é R$ 81.000 por ano. Confira no gov.br se mudou.' }],
  salvar: (v) => { db.perfil.limiteMei = v.lim || LIMITE_MEI; grava(); repinta(); } });
ACOES['resumo-mes'] = () => {
  const [a, b] = intervalo('mes'), s = somaPeriodo(a, b), cats = {};
  db.fin.filter((f) => f.pago && f.data >= a && f.data <= b && f.tipo === 's').forEach((f) => { cats[f.cat || 'Outros'] = (cats[f.cat || 'Outros'] || 0) + f.valor; });
  const mes = new Date(`${a}T12:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const txt = `Resumo de ${mes} · ${db.perfil.nome}\nEntrou (faturamento): ${din(s.e)}\nSaiu: ${din(s.s)}\n${Object.entries(cats).sort((x, y) => y[1] - x[1]).map(([k, v]) => `  • ${k}: ${din(v)}`).join('\n')}\nLucro: ${din(s.l)}`;
  folha({ titulo: 'Resumo do mês', corpo: `<pre style="white-space:pre-wrap;font:14.5px/1.6 var(--f-txt);background:var(--aparas);padding:14px;margin:0">${t(txt)}</pre><p class="mudo" style="font-size:12.5px">Serve para a declaração anual do MEI (DASN) e para mandar ao contador.</p>`,
    pe: `<button type="button" class="bt leve p" data-c>${ico('copiar')}Copiar</button><button type="button" class="bt zap" data-z>${ico('zap')}Mandar</button>`,
    aoAbrir: (f) => { $('[data-c]', f).onclick = () => copiar(txt); $('[data-z]', f).onclick = () => abrirZap('', txt); } });
};

// ------------------------------------------------------------------ relatório das diárias: por ajudante e por obra
let modoDiarias = 'pessoa', mesDiarias = 0;
TELAS.diarias = () => {
  const ref = new Date(); ref.setDate(1); ref.setMonth(ref.getMonth() + mesDiarias);
  const mes = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`, nomeMes = ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const l = (db.diarias || []).filter((d) => d.data.startsWith(mes)), equipe = db.equipe || [];
  const nomeP = (id) => (equipe.find((p) => p.id === id) || { nome: 'Ajudante' }).nome, nomeO = (id) => (id ? (achar('obras', id) || { titulo: 'Obra apagada' }).titulo : 'Sem obra');
  const grupo = {}; l.forEach((d) => { const k = modoDiarias === 'pessoa' ? d.pessoa : d.obra || ''; (grupo[k] = grupo[k] || []).push(d); });
  const total = l.reduce((s, d) => s + d.valor, 0), aberto = l.filter((d) => !d.pago).reduce((s, d) => s + d.valor, 0);
  const txt = `Diárias de ${nomeMes}\n${Object.entries(grupo).map(([k, ds]) => `${modoDiarias === 'pessoa' ? nomeP(k) : nomeO(k)}: ${ds.length} diárias, ${din(ds.reduce((s, d) => s + d.valor, 0))}`).join('\n')}\nTotal: ${din(total)}`;
  return `${cab('Diárias', nomeMes, { dica: 'Veja quanto cada ajudante trabalhou e quanto cada obra gastou de mão de obra de ajudante.' })}
    <div class="acoes" style="margin-top:0"><button type="button" class="bt leve p" data-acao="diarias-mes" data-d="-1">${ico('seta')}Mês anterior</button>${mesDiarias < 0 ? `<button type="button" class="bt leve p" data-acao="diarias-mes" data-d="1">Próximo${ico('setaDir')}</button>` : ''}</div>
    <div class="seg" role="group" data-seg style="margin-top:10px"><button type="button" data-acao="diarias-modo" data-m="pessoa" aria-pressed="${modoDiarias === 'pessoa'}">Por ajudante</button><button type="button" data-acao="diarias-modo" data-m="obra" aria-pressed="${modoDiarias === 'obra'}">Por obra</button><i></i></div>
    <div class="dois-num" style="margin-top:12px"><div class="cartao"><small>Total do mês</small><b>${din(total)}</b></div><div class="cartao"><small>Falta pagar</small><b style="color:${aberto ? 'var(--cedro)' : 'inherit'}">${din(aberto)}</b></div></div>
    <div class="lista" style="margin-top:12px">${Object.entries(grupo).map(([k, ds]) => { const sub = {}; ds.forEach((d) => { const kk = modoDiarias === 'pessoa' ? d.obra || '' : d.pessoa; sub[kk] = (sub[kk] || 0) + 1; });
      return `<div class="cartao"><div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><b>${t(modoDiarias === 'pessoa' ? nomeP(k) : nomeO(k))}</b><b class="num">${din(ds.reduce((s, d) => s + d.valor, 0))}</b></div>
        <small class="mudo">${ds.length} diárias · ${ds.filter((d) => !d.pago).length} a pagar</small>
        <div class="valores" style="margin-top:8px">${Object.entries(sub).map(([kk, n]) => `<div><span>${t(modoDiarias === 'pessoa' ? nomeO(kk) : nomeP(kk))}</span><b>${n} ${n > 1 ? 'dias' : 'dia'}</b></div>`).join('')}</div></div>`; }).join('') || '<div class="vazio"><b>Nenhuma diária neste mês</b></div>'}</div>
    <div class="acoes"><button type="button" class="bt leve" data-acao="diarias-copiar" data-txt="${t(txt)}">${ico('copiar')}Copiar resumo</button><button type="button" class="bt zap" data-acao="diarias-zap" data-txt="${t(txt)}">${ico('zap')}Mandar</button></div>`;
};
ACOES['diarias-modo'] = (b) => { modoDiarias = b.dataset.m; repinta(); };
ACOES['diarias-mes'] = (b) => { mesDiarias = Math.min(0, mesDiarias + Number(b.dataset.d)); repinta(); };
ACOES['diarias-copiar'] = (b) => copiar(b.dataset.txt);
ACOES['diarias-zap'] = (b) => abrirZap('', b.dataset.txt);
