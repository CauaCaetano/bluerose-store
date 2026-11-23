// Atria · "traga o que você já usa" (22/11/2026). É assim que o autônomo recebe trabalho: pelo WhatsApp.
//  - Pedido colado do WhatsApp (ou ditado pelo teclado) → a IA grátis lê cliente, telefone, endereço e o serviço
//    (window.nexoLer, com aviso de LGPD na própria tela) → você confere → vira obra em orçamento.
//    Sem a IA (ou se ela falhar), o Atria lê o básico aqui mesmo: nome de quem mandou, telefone e endereço.
//  - Clientes pelos contatos do celular (seletor do Android) ou arquivo .vcf/.csv: só nome e telefone, sem IA.
// Nada é apagado nem sobrescrito: cliente que já existe só ganha telefone ou endereço se estavam vazios.
import { t, sa, uid, hoje, somaDias, db, grava, toast, folha, formulario, ir, ico, repinta } from './base.js?v=31';
import { principal } from './oficios.js?v=31';
import { SERVICOS_SUGERIDOS, CENA_DO_OFICIO } from './gestao.js?v=31';

export const ACOES = {};
const soDig = (s) => String(s || '').replace(/\D/g, '');
export function telBR(s) { let d = soDig(s); if (d.length >= 12 && d.startsWith('55')) d = d.slice(2); d = d.replace(/^0+/, ''); if (d.length === 12 || d.length === 13) d = d.slice(2); return d; }
const foneBR = (d) => (d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d);

// ------------------------------------------------------------------ leitura local do pedido (plano B e demonstração)
// "[22/11/2026 14:03] João Silva: Boa tarde..." ou "22/11/2026 14:03 - João Silva: ..." (exportar conversa)
const CAB_ZAP = /^\[?\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\]?\s*(?:-\s*)?([^:]{2,40}):\s*/;
export function lerPedidoLocal(txt) {
  const linhas = String(txt || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const nomes = linhas.map((l) => (CAB_ZAP.exec(l) || [])[1]).filter((n) => n && !/^\+?\d[\d\s-]+$/.test(n));
  const corpo = linhas.map((l) => l.replace(CAB_ZAP, '')).join('\n');
  const apres = /(?:[Mm]eu nome é|[Mm]e chamo|[Aa]qui é(?: o| a)?|[Ss]ou (?:o|a))\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)/.exec(corpo);
  const tel = (/(?:\+?55\s?)?\(?\d{2}\)?\s?9?\s?\d{4}[-\s]?\d{4}/.exec(corpo) || [])[0] || (nomes.length ? '' : '');
  const end = (/\b((?:rua|r\.|avenida|av\.?|travessa|alameda|estrada|rodovia|praça)\s[^\n,.;]{2,60}(?:,?\s*(?:n[ºo°.]?\s*)?\d{1,5})?(?:[,\s-]+(?:bairro\s)?[A-ZÀ-Ú][^\n,.;]{2,30})?)/i.exec(corpo) || [])[1] || '';
  const servs = SERVICOS_SUGERIDOS(), cs = sa(corpo);
  const sv = servs.find((s) => cs.includes(sa(s))) || '';
  const frase = corpo.replace(/^(bom dia|boa tarde|boa noite|ol[aá]|oi|opa|e a[ií])[,!.\s]*/i, '').split(/[.!?\n]/).map((x) => x.trim()).find((x) => /(preciso|quero|queria|gostaria|fazer|trocar|arrumar|consertar|instalar|or[cç]amento|reformar|pintar|colocar)/i.test(x)) || '';
  const servico = sv || frase.split(/[,;]/)[0].replace(/^(eu\s)?(preciso|quero|queria|gostaria)( de)?( um| uma)?( or[cç]amento (para|pra|de))?\s*/i, '').slice(0, 60);
  const quando = /semana que vem|pr[oó]xima semana/i.test(corpo) ? somaDias(hoje(), 7) : /amanh[aã]/i.test(corpo) ? somaDias(hoje(), 1) : '';
  return { cliente: nomes[0] || (apres && apres[1]) || '', telefone: tel, endereco: end.trim(), servico: servico ? servico[0].toUpperCase() + servico.slice(1) : '', detalhes: corpo.slice(0, 500), quando };
}

// ------------------------------------------------------------------ pedido do WhatsApp → obra em orçamento
const ESQUEMA = [
  { nome: 'cliente', rotulo: 'Nome de quem pediu o serviço' },
  { nome: 'telefone', rotulo: 'Telefone ou WhatsApp, se estiver escrito' },
  { nome: 'endereco', rotulo: 'Endereço ou bairro da obra' },
  { nome: 'servico', rotulo: 'O que vai fazer, em poucas palavras (ex.: Reforma de banheiro)' },
  { nome: 'detalhes', rotulo: 'Detalhes do pedido: medidas, material, o que o cliente quer' },
  { nome: 'quando', rotulo: 'Quando o cliente quer (AAAA-MM-DD), se disse', tipo: 'data' },
];
ACOES['pedido-zap'] = () => {
  const ia = !!window.nexoLer;
  folha({ titulo: 'Pedido do WhatsApp', classe: 'imp-folha', corpo: `
    <p class="mudo" style="margin:0 0 10px">No WhatsApp, segure a mensagem do cliente, toque em Copiar e cole aqui. Também dá para ditar pelo microfone do teclado.</p>
    <label class="campo"><span>Mensagem do cliente</span><textarea data-ped data-voz rows="7" placeholder="Boa tarde! Aqui é a Sandra, preciso trocar o piso do banheiro, uns 6 m². Rua das Flores, 120, Centro. Meu zap 16 99123-4567"></textarea></label>
    ${ia ? '<p class="imp-lgpd">O texto vai para a IA do Google (Gemini) só para ser lido, e você confere tudo antes de salvar. Se não quiser que os dados do cliente saiam do celular, use “Ler aqui no celular”.</p>' : ''}
    <p class="mudo imp-msg" data-msg hidden></p>`,
  pe: `${ia ? '<button type="button" class="bt leve" data-local>Ler aqui no celular</button><button type="button" class="bt cheio" data-ia>' + ico('ia') + 'Ler com a IA</button>' : '<button type="button" class="bt cheio" data-local>Ler o pedido</button>'}`,
  aoAbrir: (f) => {
    const tx = () => f.querySelector('[data-ped]').value.trim();
    const msg = (m) => { const p = f.querySelector('[data-msg]'); p.hidden = !m; p.textContent = m || ''; };
    f.querySelector('[data-local]').onclick = () => { if (!tx()) return toast('Cole a mensagem do cliente', 'erro'); conferir(lerPedidoLocal(tx()), tx()); };
    f.querySelector('[data-ia]')?.addEventListener('click', async () => {
      if (!tx()) return toast('Cole a mensagem do cliente', 'erro');
      msg('Lendo o pedido…');
      const r = await window.nexoLer({ tipo: 'pedido', destino: 'pedido de serviço de obra ou reforma', texto: tx(), esquema: ESQUEMA, pessoas: true, confirmar: () => true, exemplo: () => [lerPedidoLocal(tx())] });
      msg('');
      if (!r.ok) { toast(`${r.erro} Lendo aqui no celular.`, 'erro'); conferir(lerPedidoLocal(tx()), tx()); return; }
      const x = r.itens[0] || lerPedidoLocal(tx());
      conferir({ ...x, detalhes: x.detalhes || tx().slice(0, 500) }, tx(), r.restantes);
    });
  } });
};
function conferir(x, original, restantes) {
  const tel = telBR(x.telefone || '');
  formulario({
    titulo: 'Conferir o pedido', rotulo: 'Criar orçamento',
    campos: [
      { n: 'cliente', r: 'Cliente', obrig: true, valor: x.cliente || '', lista: db.clientes.map((c) => c.nome), dica: 'Se o nome já existe nos clientes, a obra entra nele.' },
      { n: 'tel', r: 'WhatsApp', tipo: 'tel', valor: tel ? foneBR(tel) : x.telefone || '', meio: true },
      { n: 'quando', r: 'Quer para quando', tipo: 'data', valor: /^\d{4}-\d{2}-\d{2}$/.test(x.quando || '') ? x.quando : '', meio: true },
      { n: 'end', r: 'Endereço da obra', valor: x.endereco || '' },
      { n: 'titulo', r: 'O que vai fazer', obrig: true, valor: x.servico || '', lista: SERVICOS_SUGERIDOS() },
      { n: 'det', r: 'Detalhes do pedido', tipo: 'area', valor: String(x.detalhes || original || '').slice(0, 500), dica: typeof restantes === 'number' ? `Leituras com IA que restam hoje: ${restantes} de 20.` : '' },
    ],
    salvar: (v) => {
      const d = telBR(v.tel);
      let c = db.clientes.find((k) => sa(k.nome) === sa(v.cliente)) || (d.length >= 10 ? db.clientes.find((k) => telBR(k.tel) === d) : null);
      if (!c) { c = { id: uid('c'), nome: v.cliente, tel: v.tel, end: v.end, desde: hoje(), importado: 'zap' }; db.clientes.push(c); }
      else { if (!c.tel && v.tel) c.tel = v.tel; if (!c.end && v.end) c.end = v.end; } // só preenche o que estava vazio
      const pr = principal(db.perfil), modo = (pr.cobra || ['empreitada'])[0];
      const o = { id: uid('o'), cliente: c.id, titulo: v.titulo, tipo: CENA_DO_OFICIO[pr.id] || 'muro', oficio: pr.id, status: 'orcamento', criada: hoje(), prazo: v.quando || somaDias(hoje(), 20),
        etapas: ['Visita e medidas', 'Orçamento aprovado', 'Compra do material', 'Execução', 'Entrega'].map((n) => ({ id: uid('e'), nome: n, feito: false })), mats: [],
        orc: { modo, valorUn: 0, qtd: 1, desloc: 0, margem: db.perfil.margem || 10, mostrarItens: true, entradaPct: 40, parcelas: 1, validade: 15, prazo: 15, status: 'rascunho' },
        recebido: 0, agenda: [], hist: [{ data: hoje(), txt: 'Orçamento começado pelo pedido do WhatsApp' }, ...(v.det ? [{ data: hoje(), txt: `Pedido: ${v.det.slice(0, 400)}` }] : [])], origem: 'whatsapp' };
      db.obras.push(o); grava(); toast('Orçamento criado com o pedido'); ir(`orcamento/${o.id}`);
    },
  });
}

// ------------------------------------------------------------------ clientes pelos contatos do celular ou arquivo
function qp(s) { const b = []; for (let i = 0; i < s.length; i++) { if (s[i] === '=' && /^[0-9A-F]{2}$/i.test(s.slice(i + 1, i + 3))) { b.push(parseInt(s.slice(i + 1, i + 3), 16)); i += 2; } else b.push(s.charCodeAt(i) & 255); } return new TextDecoder().decode(new Uint8Array(b)); }
export function lerVcf(txt) {
  const linhas = String(txt).replace(/\r\n/g, '\n').replace(/=\n/g, '').replace(/\n[ \t]/g, '').split('\n'), out = []; let c = null;
  for (const l of linhas) {
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
export function lerCsvContatos(txt) {
  const linhas = String(txt).replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!linhas.length) return [];
  const sep = (linhas[0].match(/;/g) || []).length > (linhas[0].match(/,/g) || []).length ? ';' : ',';
  const parte = (l) => { const o = []; let c = '', q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"' && l[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; } else if (ch === '"') q = true; else if (ch === sep) { o.push(c); c = ''; } else c += ch; } o.push(c); return o; };
  const cab = parte(linhas[0]).map(sa), idx = (re) => cab.findIndex((c) => re.test(c));
  const nome = idx(/^(name|nome|display name|nome completo)$/), pri = idx(/^(first name|given name|primeiro nome)$/), meio = idx(/^(middle name|additional name)$/), ult = idx(/^(last name|family name|sobrenome)$/);
  const tels = cab.map((c, i) => (/phone.*value|^(telefone|celular|whatsapp|fone|phone)/.test(c) ? i : -1)).filter((i) => i >= 0);
  return linhas.slice(1).map(parte).map((r) => ({ nome: (nome >= 0 && r[nome] ? r[nome] : [pri, meio, ult].filter((i) => i >= 0).map((i) => r[i]).filter(Boolean).join(' ')).trim(), tel: (tels.map((i) => r[i]).find((x) => soDig(x).length >= 8) || '').split(':::')[0].trim() }));
}
ACOES['contatos-importar'] = () => {
  const picker = 'contacts' in navigator && 'ContactsManager' in window;
  folha({ titulo: 'Trazer clientes dos contatos', corpo: `
    <p class="mudo" style="margin:0 0 12px">Entra só o nome e o WhatsApp. Quem já está nos clientes fica como está. Os contatos não passam pela IA.</p>
    <div class="lista">
      ${picker ? `<button type="button" class="linha imp-op" data-picker><span class="ic">${ico('gente')}</span><span class="txt"><b>Escolher nos contatos do celular</b><small>Marque quem é cliente.</small></span></button>` : ''}
      <label class="linha imp-op"><span class="ic">${ico('doc')}</span><span class="txt"><b>Arquivo de contatos (.vcf ou .csv)</b><small>Contatos › Exportar no celular, ou Google Contatos › Exportar.${picker ? '' : ' No iPhone, use o .vcf.'}</small></span><input type="file" accept=".vcf,.vcard,.csv,text/vcard,text/x-vcard,text/csv" data-arq class="imp-arq"></label>
    </div>`,
  aoAbrir: (f) => {
    f.querySelector('[data-picker]')?.addEventListener('click', async () => {
      try { const l = await navigator.contacts.select(['name', 'tel'], { multiple: true }); if (l.length) conferirContatos(l.map((c) => ({ nome: (c.name || [])[0] || '', tel: (c.tel || [])[0] || '' }))); }
      catch { toast('Não deu para abrir os contatos. Use o arquivo .vcf.', 'erro'); }
    });
    f.querySelector('[data-arq]').addEventListener('change', async (e) => {
      const a = e.target.files?.[0]; e.target.value = ''; if (!a) return;
      try { const tx = await a.text(); const l = /BEGIN:VCARD/i.test(tx) ? lerVcf(tx) : lerCsvContatos(tx); if (!l.length) return toast('Não achei contatos nesse arquivo', 'erro'); conferirContatos(l); }
      catch { toast('Não deu para ler este arquivo', 'erro'); }
    });
  } });
};
function conferirContatos(lista) {
  const vistos = new Set(), l = lista.map((c) => ({ nome: String(c.nome || '').trim().slice(0, 80), tel: telBR(c.tel) })).filter((c) => c.nome && !vistos.has(c.tel || c.nome) && vistos.add(c.tel || c.nome));
  const ja = (c) => db.clientes.some((k) => sa(k.nome) === sa(c.nome) || (c.tel.length >= 10 && telBR(k.tel) === c.tel));
  const novos = l.filter((c) => !ja(c)).length;
  folha({ titulo: `Conferir ${l.length} contato${l.length === 1 ? '' : 's'}`, corpo: `<p class="mudo" style="margin:0 0 10px">${novos} novo${novos === 1 ? '' : 's'}. Desmarque quem não é cliente.</p>
    <div class="lista">${l.map((c, i) => { const j = ja(c), ok = c.tel.length >= 10 && c.tel.length <= 11; return `<label class="linha imp-ct${j ? ' off' : ''}"><input type="checkbox" data-i="${i}" ${j ? 'disabled' : 'checked'}><span class="txt"><b>${t(c.nome)}</b><small>${j ? 'já é cliente' : c.tel ? `${t(foneBR(c.tel))}${ok ? '' : ' · confira o DDD'}` : 'sem telefone'}</small></span></label>`; }).join('')}</div>`,
  pe: '<button type="button" class="bt leve" data-fechar>Cancelar</button><button type="button" class="bt cheio" data-ok>Salvar clientes</button>',
  aoAbrir: (f, api) => {
    f.querySelector('[data-ok]').onclick = () => {
      let n = 0;
      f.querySelectorAll('[data-i]').forEach((cb) => { if (!cb.checked || cb.disabled) return; const c = l[Number(cb.dataset.i)]; if (ja(c)) return; db.clientes.push({ id: uid('c'), nome: c.nome, tel: c.tel ? foneBR(c.tel) : '', end: '', desde: hoje(), importado: 'contatos' }); n++; });
      if (!n) return toast('Nenhum cliente novo marcado', 'erro');
      grava(); api.fechar(); toast(`${n} cliente${n === 1 ? '' : 's'} novo${n === 1 ? '' : 's'}`); repinta();
    };
  } });
}
