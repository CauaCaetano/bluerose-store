// Jano · "traga o que você já usa" (22/11/2026). Três portas, todas por ação da própria pessoa:
//  1. Contatos do celular → clientes (seletor de contatos do Android; no iPhone e no computador, arquivo .vcf ou o
//     .csv do Google Contatos). Só nome e telefone; não passa pela IA.
//  2. Google Agenda exportada (.ics: Configurações › Importar e exportar › Exportar) → só os horários de hoje em diante.
//  3. Foto do caderno ou print de outra agenda → a IA grátis lê nome, dia, hora e serviço (window.nexoLer, com aviso de LGPD).
// Sempre com conferência antes de gravar. HÁ ASSINANTE REAL: só ACRESCENTA (clientes novos e horários novos, com
// campo importado = id do lote); nunca muda nem apaga cliente ou horário que já existe. Horário que bate com outro
// já marcado vem desmarcado.
let X = null; // { db(), grava, toast, folha, t, sa, uid, iso, deIso, hh, lerHora, serv, ocupado, nomeDia, mostra }
export function liga(ctx) { X = ctx; }
const db = () => X.db();
const soDig = (s) => String(s || '').replace(/\D/g, '');
const pad = (n) => String(n).padStart(2, '0');

// ------------------------------------------------------------------ leitura dos arquivos (no aparelho)
export function telBR(s) { let d = soDig(s); if (d.length >= 12 && d.startsWith('55')) d = d.slice(2); d = d.replace(/^0+/, ''); if (d.length === 12 || d.length === 13) d = d.slice(2); return d; }
function qp(s) { const b = []; for (let i = 0; i < s.length; i++) { if (s[i] === '=' && /^[0-9A-F]{2}$/i.test(s.slice(i + 1, i + 3))) { b.push(parseInt(s.slice(i + 1, i + 3), 16)); i += 2; } else b.push(s.charCodeAt(i) & 255); } return new TextDecoder().decode(new Uint8Array(b)); }
// linhas dobradas (espaço no começo) e quebras "soft" do quoted-printable (= no fim) viram uma linha só
const desdobra = (txt) => String(txt).replace(/\r\n/g, '\n').replace(/=\n/g, '').replace(/\n[ \t]/g, '').split('\n');
export function lerVcf(txt) {
  const out = []; let c = null;
  for (const l of desdobra(txt)) {
    if (/^BEGIN:VCARD/i.test(l)) { c = { nome: '', n: '', tels: [] }; continue; }
    if (/^END:VCARD/i.test(l)) { if (c) out.push({ nome: (c.nome || c.n).trim(), tel: c.tels[0] || '' }); c = null; continue; }
    const i = l.indexOf(':'); if (!c || i < 0) continue;
    const cab = l.slice(0, i), k = cab.split(';')[0].replace(/^item\d+\./i, '').toUpperCase();
    let v = l.slice(i + 1); if (/QUOTED-PRINTABLE/i.test(cab)) v = qp(v);
    v = v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1');
    if (k === 'FN') c.nome = v; else if (k === 'N') c.n = v.split(';').slice(0, 3).reverse().filter(Boolean).join(' ').replace(/\s+/g, ' ');
    else if (k === 'TEL') { if (/CELL|MOBILE/i.test(cab)) c.tels.unshift(v); else c.tels.push(v); }
  }
  return out;
}
function csv(txt) {
  txt = String(txt).replace(/^﻿/, '');
  const prim = txt.split(/\r?\n/)[0] || '', sep = (prim.match(/;/g) || []).length > (prim.match(/,/g) || []).length ? ';' : ',';
  const out = []; let lin = [], cel = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (q) { if (ch === '"' && txt[i + 1] === '"') { cel += '"'; i++; } else if (ch === '"') q = false; else cel += ch; continue; }
    if (ch === '"') q = true; else if (ch === sep) { lin.push(cel); cel = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; lin.push(cel); cel = ''; if (lin.some((x) => x.trim())) out.push(lin); lin = []; } else cel += ch;
  }
  lin.push(cel); if (lin.some((x) => x.trim())) out.push(lin);
  return out;
}
export function lerCsvContatos(txt) {
  const l = csv(txt); if (!l.length) return [];
  const cab = l[0].map((c) => X.sa(c).trim()), idx = (re) => cab.findIndex((c) => re.test(c));
  const nome = idx(/^(name|nome|display name|nome completo)$/), pri = idx(/^(first name|given name|primeiro nome)$/), meio = idx(/^(middle name|additional name)$/), ult = idx(/^(last name|family name|sobrenome)$/);
  const tels = cab.map((c, i) => (/phone.*value|^(telefone|celular|whatsapp|fone|phone)/.test(c) ? i : -1)).filter((i) => i >= 0);
  return l.slice(1).map((r) => ({ nome: (nome >= 0 && r[nome] ? r[nome] : [pri, meio, ult].filter((i) => i >= 0).map((i) => r[i]).filter(Boolean).join(' ')).trim(), tel: (tels.map((i) => r[i]).find((x) => soDig(x).length >= 8) || '').split(':::')[0].trim() }));
}
// .ics: cada VEVENT com hora (o dia inteiro, como feriado, fica de fora). Hora com Z vira a hora daqui;
// com TZID ou sem nada, vale como está escrita (é a hora local de quem exportou).
export function lerIcs(txt) {
  const out = []; let e = null;
  const val = (v) => v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
  for (const l of desdobra(txt)) {
    if (/^BEGIN:VEVENT/i.test(l)) { e = {}; continue; }
    if (/^END:VEVENT/i.test(l)) {
      if (e && e.ini) {
        const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(e.ini);
        if (m && m[4] != null && !e.diaTodo) {
          let d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
          if (m[7]) d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
          let min = 0;
          const f = e.fim && /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/.exec(e.fim);
          if (f) { const df = /Z$/.test(e.fim) ? new Date(Date.UTC(+f[1], +f[2] - 1, +f[3], +f[4], +f[5])) : new Date(+f[1], +f[2] - 1, +f[3], +f[4], +f[5]); min = Math.round((df - d) / 6e4); }
          if (e.status !== 'CANCELLED') out.push({ data: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`, titulo: e.titulo || '', desc: e.desc || '', min, repete: !!e.rrule });
        }
      }
      e = null; continue;
    }
    const i = l.indexOf(':'); if (!e || i < 0) continue;
    const cab = l.slice(0, i).toUpperCase(), k = cab.split(';')[0], v = l.slice(i + 1);
    if (k === 'DTSTART') { e.ini = v.trim(); if (/VALUE=DATE(?!-)/.test(cab)) e.diaTodo = true; }
    else if (k === 'DTEND') e.fim = v.trim();
    else if (k === 'SUMMARY') e.titulo = val(v);
    else if (k === 'DESCRIPTION') e.desc = val(v).slice(0, 300);
    else if (k === 'STATUS') e.status = v.trim().toUpperCase();
    else if (k === 'RRULE') e.rrule = v;
  }
  return out;
}

// ------------------------------------------------------------------ escolher de onde vem
export function abrir() {
  const picker = 'contacts' in navigator && 'ContactsManager' in window, ia = !!window.nexoLer;
  const op = (corpo) => `<label class="cartao imp-op">${corpo}</label>`;
  X.folha(`<h2>Trazer o que você já usa</h2><p class="sub">Seus clientes e horários de agora continuam como estão: aqui só entra coisa nova, e você confere antes de salvar.</p>
    ${picker ? `<button type="button" class="cartao imp-op" data-imp="picker"><b>Contatos do celular</b><span class="mini">Escolha quem é cliente. Entra só o nome e o WhatsApp.</span></button>` : ''}
    ${op(`<b>Arquivo de contatos (.vcf ou .csv)</b><span class="mini">No celular: Contatos › Exportar. No Google Contatos: Exportar.${picker ? '' : ' No iPhone: Contatos › Listas › Exportar.'}</span><input type="file" accept=".vcf,.vcard,.csv,text/vcard,text/x-vcard,text/csv" data-imp-arq="contatos" class="imp-arq">`)}
    ${op(`<b>Google Agenda (.ics)</b><span class="mini">No computador: Google Agenda › Configurações › Importar e exportar › Exportar. Entram os horários de hoje em diante.</span><input type="file" accept=".ics,text/calendar" data-imp-arq="ics" class="imp-arq">`)}
    ${ia ? op(`<b>Foto do caderno ou print da agenda</b><span class="mini">A IA lê nome, dia, hora e serviço. Uma página por foto.</span><input type="file" accept="image/*,application/pdf" data-imp-arq="foto" class="imp-arq">`) : ''}
    <p class="mini" data-imp-msg></p><button type="button" class="bt largo" data-fecha>Fechar</button>`, (f, fecha) => {
    const msg = (m) => { f.querySelector('[data-imp-msg]').textContent = m || ''; };
    if (ia) window.nexoLer.cota().then((c) => { if (!c) return; msg(c.demo ? 'Na demonstração, a leitura da foto traz um exemplo.' : typeof c.restantes === 'number' ? `Leituras com IA que restam hoje: ${c.restantes} de 20.` : ''); });
    f.querySelector('[data-imp="picker"]')?.addEventListener('click', async () => {
      try { const l = await navigator.contacts.select(['name', 'tel'], { multiple: true }); if (!l.length) return; fecha(); conferirContatos(l.map((c) => ({ nome: (c.name || [])[0] || '', tel: (c.tel || [])[0] || '' }))); }
      catch { X.toast('Não deu para abrir os contatos. Use o arquivo .vcf.'); }
    });
    f.querySelectorAll('[data-imp-arq]').forEach((inp) => inp.addEventListener('change', async () => {
      const a = inp.files?.[0], tipo = inp.dataset.impArq; inp.value = ''; if (!a) return;
      try {
        if (tipo === 'contatos') { const tx = await a.text(); const l = /BEGIN:VCARD/i.test(tx) ? lerVcf(tx) : lerCsvContatos(tx); if (!l.length) return X.toast('Não achei contatos nesse arquivo.'); fecha(); conferirContatos(l); return; }
        if (tipo === 'ics') {
          const ev = lerIcs(await a.text()); if (!ev.length) return X.toast('Não achei horários nesse arquivo.');
          const fut = ev.filter((x) => X.deIso(x.data) >= 0); if (!fut.length) return X.toast(`Os ${ev.length} horários desse arquivo já passaram.`);
          fecha(); conferirHorarios(fut.map(deEvento), { origem: 'Google Agenda', ignorados: ev.length - fut.length }); return;
        }
        msg('Lendo a foto…');
        const r = await window.nexoLer({ tipo: 'agenda', destino: 'horários marcados de uma agenda de atendimento', pessoas: true, confirmar: aviso, imagem: a.type === 'application/pdf' ? undefined : a, pdf: a.type === 'application/pdf' ? a : undefined,
          esquema: [{ nome: 'nome', rotulo: 'Nome do cliente' }, { nome: 'telefone', rotulo: 'Telefone, se estiver escrito' }, { nome: 'data', rotulo: 'Dia do horário (AAAA-MM-DD)', tipo: 'data' }, { nome: 'hora', rotulo: 'Hora (HH:MM)', tipo: 'hora' }, { nome: 'servico', rotulo: 'Serviço', opcoes: db().servicos.map((s) => s.nome) }],
          exemplo: () => [{ nome: 'Simone Barros', telefone: '(31) 98877-1020', data: X.iso(1), hora: '09:30', servico: db().servicos[0]?.nome }, { nome: 'Otávio Reis', data: X.iso(1), hora: '16:00', servico: db().servicos[2]?.nome }, { nome: 'Lúcia (mãe da Bia)', data: X.iso(3), hora: '11:00', servico: db().servicos[1]?.nome }] });
        msg('');
        if (!r.ok) { if (!r.cancelado) X.toast(r.erro); return; }
        const l = r.itens.filter((x) => x.nome && x.data).map((x) => ({ nome: String(x.nome).slice(0, 80), tel: telBR(x.telefone || ''), data: String(x.data).slice(0, 10), hora: String(x.hora || '').slice(0, 5), serv: servDe(x.servico) }));
        if (!l.length) return X.toast('Não achei horários na foto. Tente uma foto mais de perto, com boa luz.');
        fecha(); conferirHorarios(l, { origem: r.demo ? 'foto (exemplo da demonstração)' : 'foto', restantes: r.restantes });
      } catch (e) { msg(''); X.toast(e.message || 'Não deu para ler esse arquivo.'); }
    }));
  });
}
// aviso de LGPD no visual do Jano (a ponte chama antes de mandar a foto)
const aviso = (m) => new Promise((ok) => {
  let resp = false;
  X.folha(`<h2>Antes de enviar a foto</h2><p class="sub">${X.t(m)}</p><div class="linha"><button type="button" class="bt cheio" data-sim>Enviar para leitura</button><button type="button" class="bt" data-fecha>Não enviar</button></div>`, (f, fecha) => {
    f.querySelector('[data-sim]').addEventListener('click', () => { resp = true; fecha(); });
    const obs = new MutationObserver(() => { if (!document.body.contains(f)) { obs.disconnect(); ok(resp); } }); obs.observe(document.body, { childList: true });
  });
});
const servDe = (txt) => { const s = X.sa(txt || ''); if (!s) return db().servicos[0]?.id; return (db().servicos.find((x) => X.sa(x.nome) === s) || db().servicos.find((x) => s.includes(X.sa(x.nome)) || X.sa(x.nome).includes(s)) || db().servicos[0])?.id; };
// evento do Google: o título costuma ter o serviço e o nome ("Corte - Juliana"); o nome de um cliente que já existe ganha
function deEvento(e) {
  const tit = e.titulo || '', st = X.sa(tit), c = db().clientes.find((x) => x.nome && st.includes(X.sa(x.nome)));
  const s = db().servicos.find((x) => st.includes(X.sa(x.nome)));
  let nome = c ? c.nome : tit;
  if (!c) { const partes = tit.split(/\s[-–|:]\s|\s·\s/).map((x) => x.trim()).filter(Boolean); nome = (s ? partes.find((p) => !X.sa(p).includes(X.sa(s.nome))) : partes[partes.length - 1]) || tit; if (s && X.sa(nome).startsWith(X.sa(s.nome))) nome = nome.slice(s.nome.length).trim() || tit; }
  return { nome: nome.slice(0, 80), tel: telBR((/(\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4})/.exec(e.desc) || [])[1] || ''), data: e.data, hora: e.hora, serv: s ? s.id : servDe(tit), repete: e.repete };
}

// ------------------------------------------------------------------ conferência dos contatos
const acha = (nome, tel) => { const d = telBR(tel), n = X.sa(nome).trim(); return db().clientes.find((c) => (d.length >= 10 && telBR(c.tel) === d) || (n && X.sa(c.nome).trim() === n)); };
function conferirContatos(lista) {
  const vistos = new Set(), l = lista.map((c) => ({ nome: String(c.nome || '').trim().slice(0, 80), tel: telBR(c.tel) })).filter((c) => c.nome && !vistos.has(c.tel || c.nome) && vistos.add(c.tel || c.nome));
  if (!l.length) return X.toast('Nenhum contato com nome nesse arquivo.');
  const novos = l.filter((c) => !acha(c.nome, c.tel)).length;
  X.folha(`<h2>Conferir ${l.length} contato${l.length === 1 ? '' : 's'}</h2><p class="sub">${novos} novo${novos === 1 ? '' : 's'}. Desmarque quem não é cliente. Quem já está nos clientes fica como está.</p>
    <div class="imp-lista">${l.map((c, i) => { const ja = acha(c.nome, c.tel), ok = c.tel.length >= 10 && c.tel.length <= 11; return `<div class="cartao imp-it${ja ? ' off' : ''}" data-i="${i}">
      <label class="imp-marca"><input type="checkbox" data-on ${ja ? 'disabled' : 'checked'}><b>${X.t(c.nome)}</b>${ja ? ' <span class="selo">já é cliente</span>' : ''}</label>
      ${ja ? '' : `<label class="campo">WhatsApp${ok ? '' : ' <span class="selo at">confira o DDD</span>'}<input data-tel inputmode="tel" value="${X.t(c.tel)}" placeholder="DDD e número"></label>`}</div>`; }).join('')}</div>
    <button type="button" class="bt cheio largo" data-ok>Salvar clientes novos</button>`, (f, fecha) => {
    f.querySelector('[data-ok]').addEventListener('click', () => {
      const lote = 'imp' + Date.now().toString(36); let n = 0;
      f.querySelectorAll('.imp-it').forEach((r) => {
        const cb = r.querySelector('[data-on]'); if (!cb.checked || cb.disabled) return;
        const c = l[Number(r.dataset.i)], tel = telBR(r.querySelector('[data-tel]')?.value || '');
        if (acha(c.nome, tel)) return;
        db().clientes.push({ id: X.uid(), nome: c.nome, tel, ultima: 0, serv: db().servicos[0]?.id, faltas: 0, valor: null, ...(db().pagPadrao === 'mes' ? { pagamento: 'mes' } : {}), importado: lote }); n++;
      });
      if (!n) return X.toast('Nenhum cliente novo marcado.');
      X.grava(); fecha(); X.mostra(); X.toast(`${n} cliente${n === 1 ? '' : 's'} novo${n === 1 ? '' : 's'}.`);
    });
  });
}

// ------------------------------------------------------------------ conferência dos horários (Google Agenda ou foto)
function conferirHorarios(l, { origem = '', ignorados = 0, restantes = null } = {}) {
  const opServ = (id) => db().servicos.map((s) => `<option value="${s.id}" ${s.id === id ? 'selected' : ''}>${X.t(s.nome)}</option>`).join('');
  const choque = (x) => { const d = X.deIso(x.data), h = X.lerHora(x.hora); return d == null || h == null ? null : X.ocupado(d, h, X.serv(x.serv).min); };
  X.folha(`<h2>Conferir ${l.length} horário${l.length === 1 ? '' : 's'}</h2><p class="sub">Vindos de ${X.t(origem)}.${ignorados ? ` ${ignorados === 1 ? '1 horário já passou e ficou' : `${ignorados} horários já passaram e ficaram`} de fora.` : ''} Corrija o que precisar. Cliente que ainda não existe é criado junto; quem já existe não muda.</p>
    ${typeof restantes === 'number' ? `<p class="mini">Leituras com IA que restam hoje: ${restantes} de 20.</p>` : ''}
    <div class="imp-lista">${l.map((x, i) => { const ch = choque(x), ja = acha(x.nome, x.tel); return `<div class="cartao imp-it" data-i="${i}">
      <label class="imp-marca"><input type="checkbox" data-on ${ch ? '' : 'checked'}><b>Importar</b> <span class="selo ${ja ? 'ok' : ''}" data-cli>${ja ? 'cliente já cadastrado' : 'cliente novo'}</span></label>
      ${ch ? '<p class="mini imp-choque">Já tem horário nesse momento: confira antes de marcar.</p>' : ''}${x.repete ? '<p class="mini">Era um horário que se repete: entra só esta vez.</p>' : ''}
      <label class="campo">Cliente<input data-n value="${X.t(x.nome)}"></label>
      <div class="imp-duas"><label class="campo">Dia<input type="date" data-d value="${X.t(x.data)}" min="${X.iso(0)}"></label><label class="campo">Hora<input type="time" data-h value="${X.t(x.hora)}"></label></div>
      <label class="campo">Serviço<select data-s>${opServ(x.serv)}</select></label></div>`; }).join('')}</div>
    <button type="button" class="bt cheio largo" data-ok>Marcar os horários</button>`, (f, fecha) => {
    f.addEventListener('input', (e) => { const r = e.target.closest('.imp-it'); if (r && e.target.matches('[data-n]')) { const ja = acha(e.target.value, ''); const s = r.querySelector('[data-cli]'); s.textContent = ja ? 'cliente já cadastrado' : 'cliente novo'; s.className = `selo ${ja ? 'ok' : ''}`; } });
    f.querySelector('[data-ok]').addEventListener('click', () => {
      const marc = [...f.querySelectorAll('.imp-it')].filter((r) => r.querySelector('[data-on]').checked);
      if (!marc.length) return X.toast('Marque pelo menos um horário.');
      const novos = [];
      for (const r of marc) {
        const x = l[Number(r.dataset.i)], nome = r.querySelector('[data-n]').value.trim(), d = X.deIso(r.querySelector('[data-d]').value), h = X.lerHora(r.querySelector('[data-h]').value), sv = r.querySelector('[data-s]').value;
        if (!nome) { r.scrollIntoView({ block: 'center' }); return X.toast('Escreva o nome do cliente.'); }
        if (d == null || d < 0) { r.scrollIntoView({ block: 'center' }); return X.toast(`Confira o dia de ${nome}: só de hoje em diante.`); }
        if (h == null) { r.scrollIntoView({ block: 'center' }); return X.toast(`Escreva a hora de ${nome}.`); }
        novos.push({ nome, tel: x.tel, d, h, sv });
      }
      const lote = 'imp' + Date.now().toString(36); let nc = 0;
      novos.forEach((x) => {
        let c = acha(x.nome, x.tel);
        if (!c) { c = { id: X.uid(), nome: x.nome, tel: x.tel || '', ultima: 0, serv: x.sv, faltas: 0, valor: null, ...(db().pagPadrao === 'mes' ? { pagamento: 'mes' } : {}), importado: lote }; db().clientes.push(c); nc++; }
        db().ags.push({ id: X.uid(), dia: x.d, ini: x.h, cli: c.id, serv: x.sv, st: 'marcado', pago: 0, valor: null, sinal: null, importado: lote });
      });
      X.grava(); fecha(); X.mostra(); X.toast(`${novos.length} horário${novos.length === 1 ? '' : 's'} marcado${novos.length === 1 ? '' : 's'}${nc ? `, ${nc} cliente${nc === 1 ? '' : 's'} novo${nc === 1 ? '' : 's'}` : ''}.`);
    });
  });
}
