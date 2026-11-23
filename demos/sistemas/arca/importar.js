// Arca · Trazer do que a empresa já usa (22/11/2026). Tudo lido neste computador, sem IA e sem mandar o arquivo para fora:
//   1. XML da NF-e: emitente, destinatário, número, chave, total e as duplicatas (<cobr><dup>). Nota de compra (a empresa é a
//      destinatária) vira conta a pagar ao fornecedor; nota de venda (a empresa é a emitente) vira cobrança do cliente.
//      Sem duplicata: uma parcela com o total e o vencimento para escolher. A mesma chave não entra duas vezes.
//   2. Boleto pela linha digitável: 47 dígitos (bancário) ou 48 (arrecadação/convênio), DVs conferidos (módulo 10 e 11),
//      valor, vencimento (fator com base 07/10/1997 e a virada de 22/02/2025, quando o fator recomeça em 1000) e banco.
//   3. Planilha de contas a pagar e a receber (.xlsx ou .csv) com as colunas sugeridas pelo nome, e o relatório de recebíveis
//      da maquininha (Stone, PagBank, Mercado Pago, Cielo, InfinitePay ou outro) → cobranças previstas por dia de pagamento.
// Regras: prévia antes de gravar; só acrescenta (nunca apaga nem altera o que existe); o que já está igual fica desmarcado;
// cada item leva origem 'importacao' e imp { arquivo, tipo, ... } (o mesmo jeito da Conciliação).
// O leitor de .xlsx é uma cópia própria do base/le-xlsx.js (sem depender dele).

const soDig = (s) => String(s ?? '').replace(/\D/g, '');
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const fmtDoc = (d) => { d = soDig(d); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : d; };
const DIA = 864e5;
const isoUTC = (d) => d.toISOString().slice(0, 10);
const somaDias = (iso, n) => isoUTC(new Date(Date.parse(`${iso}T00:00:00Z`) + n * DIA));
const difDias = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DIA);

// ------------------------------------------------------------------ boleto: linha digitável → valor, vencimento, banco
export const BANCOS = { '001': 'Banco do Brasil', '003': 'Banco da Amazônia', '004': 'Banco do Nordeste', '021': 'Banestes', '033': 'Santander', '037': 'Banpará', '041': 'Banrisul', '047': 'Banese', '070': 'BRB',
  '077': 'Inter', '084': 'Uniprime', '085': 'Ailos', '097': 'Credisis', '104': 'Caixa', '133': 'Cresol', '136': 'Unicred', '208': 'BTG Pactual', '212': 'Original', '218': 'BS2', '237': 'Bradesco', '246': 'ABC Brasil',
  '260': 'Nubank', '290': 'PagBank', '323': 'Mercado Pago', '336': 'C6 Bank', '341': 'Itaú', '380': 'PicPay', '389': 'Mercantil', '403': 'Cora', '422': 'Safra', '633': 'Rendimento', '637': 'Sofisa', '655': 'Votorantim',
  '707': 'Daycoval', '745': 'Citibank', '746': 'Modal', '748': 'Sicredi', '756': 'Sicoob' };
const SEGMENTOS = { 1: 'Prefeitura', 2: 'Saneamento', 3: 'Energia elétrica e gás', 4: 'Telecomunicações', 5: 'Órgão do governo', 6: 'Carnê ou empresa', 7: 'Multa de trânsito', 9: 'Uso do banco' };
/** Módulo 10 (pesos 2 e 1 da direita para a esquerda, somando os algarismos). */
export function mod10(num) { let s = 0, p = 2; for (let i = num.length - 1; i >= 0; i--) { let v = Number(num[i]) * p; if (v > 9) v = Math.floor(v / 10) + (v % 10); s += v; p = p === 2 ? 1 : 2; } return (10 - (s % 10)) % 10; }
/** Módulo 11 do código de barras bancário (pesos 2 a 9): 0, 10 e 11 viram 1. */
export function mod11Banco(num) { let s = 0, p = 2; for (let i = num.length - 1; i >= 0; i--) { s += Number(num[i]) * p; p = p === 9 ? 2 : p + 1; } const d = 11 - (s % 11); return d === 0 || d === 10 || d === 11 ? 1 : d; }
/** Módulo 11 da arrecadação (pesos 2 a 9): resto 0 ou 1 vira 0. */
export function mod11Arrec(num) { let s = 0, p = 2; for (let i = num.length - 1; i >= 0; i--) { s += Number(num[i]) * p; p = p === 9 ? 2 : p + 1; } const r = s % 11; return r < 2 ? 0 : 11 - r; }
/** Fator de vencimento → data. Até 21/02/2025 o fator 9999; depois recomeça em 1000 (22/02/2025). Escolhe a data mais perto de hoje. */
export function vencimentoDoFator(fator, hoje = new Date()) {
  if (!fator) return '';
  const h = isoUTC(new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())));
  const l = [somaDias('1997-10-07', fator)]; if (fator >= 1000) l.push(somaDias('2025-02-22', fator - 1000));
  return l.sort((a, b) => Math.abs(difDias(a, h)) - Math.abs(difDias(b, h)))[0];
}
/** Fator de uma data (o contrário do de cima, já na base nova a partir de 22/02/2025). */
export function fatorDaData(iso) { const n = difDias(iso, '2025-02-22'); return n >= 0 ? 1000 + (n % 9000) : difDias(iso, '1997-10-07'); }
/** Monta a linha digitável de um boleto bancário (usada no exemplo da demonstração). */
export function montaLinhaBanco(banco, fator, centavos, livre, moeda = '9') {
  const valor = String(centavos).padStart(10, '0'), sem = `${banco}${moeda}${String(fator).padStart(4, '0')}${valor}${livre}`, dv = mod11Banco(sem);
  const cb = `${banco}${moeda}${dv}${String(fator).padStart(4, '0')}${valor}${livre}`;
  const c1 = `${cb.slice(0, 4)}${cb.slice(19, 24)}`, c2 = cb.slice(24, 34), c3 = cb.slice(34, 44);
  return `${c1}${mod10(c1)}${c2}${mod10(c2)}${c3}${mod10(c3)}${dv}${cb.slice(5, 9)}${cb.slice(9, 19)}`;
}
/** Lê a linha digitável (ou o código de barras de 44 dígitos). Devolve { ok, tipo, banco, valor (centavos), venc (ISO), erros[] }. */
export function lerLinha(entrada, hoje = new Date()) {
  const d = soDig(entrada), r = { ok: false, digitos: d, erros: [] };
  if (!d) return r;
  const dataAqui = (iso) => { const h = isoUTC(new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()))); return Math.abs(difDias(iso, h)) < 800; };
  if (d.length === 47 || (d.length === 44 && d[0] !== '8')) {
    let cb;
    if (d.length === 47) {
      [[0, 9], [10, 20], [21, 31]].forEach(([a, b], i) => { if (mod10(d.slice(a, b)) !== Number(d[b])) r.erros.push(`O ${i + 1}º campo tem um número trocado (o dígito ${d[b]} não confere).`); });
      cb = `${d.slice(0, 4)}${d[32]}${d.slice(33, 47)}${d.slice(4, 9)}${d.slice(10, 20)}${d.slice(21, 31)}`;
    } else cb = d;
    if (mod11Banco(cb.slice(0, 4) + cb.slice(5)) !== Number(cb[4])) r.erros.push('O dígito geral do código não confere: confira a linha.');
    const fator = Number(cb.slice(5, 9)), cod = cb.slice(0, 3);
    Object.assign(r, { tipo: 'banco', codigo: cb, bancoCod: cod, banco: BANCOS[cod] || `Banco ${cod}`, moeda: cb[3], fator, valor: Number(cb.slice(9, 19)), venc: vencimentoDoFator(fator, hoje) });
    if (r.moeda !== '9') r.erros.push('Boleto em outra moeda (não é real).');
  } else if (d.length === 48 || (d.length === 44 && d[0] === '8')) {
    let cb;
    const idv = Number(d[2]), m = idv === 6 || idv === 7 ? mod10 : mod11Arrec;
    if (d.length === 48) {
      for (let i = 0; i < 4; i++) { const bl = d.slice(i * 12, i * 12 + 11); if (m(bl) !== Number(d[i * 12 + 11])) r.erros.push(`O ${i + 1}º bloco tem um número trocado.`); }
      cb = [0, 1, 2, 3].map((i) => d.slice(i * 12, i * 12 + 11)).join('');
    } else cb = d;
    if (cb[0] !== '8') r.erros.push('Linha de arrecadação começa com 8.');
    if (![6, 7, 8, 9].includes(idv)) r.erros.push('Identificador de valor desconhecido.');
    else if (m(cb.slice(0, 3) + cb.slice(4)) !== Number(cb[3])) r.erros.push('O dígito geral do código não confere: confira a linha.');
    const seg = Number(cb[1]);
    Object.assign(r, { tipo: 'arrecadacao', codigo: cb, segmento: SEGMENTOS[seg] || 'Convênio', seg, valor: idv === 6 || idv === 8 ? Number(cb.slice(4, 15)) : 0, venc: '' });
    // não há campo fixo de vencimento: muitos convênios põem a data (AAAAMMDD) no campo livre. Procura uma data válida perto de hoje.
    for (let i = 19; i <= 36; i++) { const s = cb.slice(i, i + 8), x = s.match(/^(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/); if (x) { const iso = `${x[1]}-${x[2]}-${x[3]}`; if (!Number.isNaN(Date.parse(iso)) && isoUTC(new Date(Date.parse(`${iso}T00:00:00Z`))) === iso && dataAqui(iso)) { r.venc = iso; r.vencProvavel = true; break; } } }
  } else {
    r.erros.push(d.length < 44 ? `Faltam números: a linha do boleto tem 47 dígitos (bancário) ou 48 (conta de consumo e imposto). Você digitou ${d.length}.` : `Números demais (${d.length}). A linha tem 47 ou 48 dígitos.`);
    return r;
  }
  r.ok = !r.erros.length;
  return r;
}

// ------------------------------------------------------------------ planilhas: .xlsx (cópia própria do leitor da base) e .csv
function u16(b, i) { return b[i] | (b[i + 1] << 8); }
function u32(b, i) { return (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0; }
function zipArquivos(buf) {
  const b = new Uint8Array(buf); let fim = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 70000); i--) if (u32(b, i) === 0x06054b50) { fim = i; break; }
  if (fim < 0) throw new Error('Esse arquivo não parece uma planilha do Excel (.xlsx).');
  const n = u16(b, fim + 10), out = {}; let p = u32(b, fim + 16);
  for (let k = 0; k < n; k++) {
    const metodo = u16(b, p + 10), tamC = u32(b, p + 20), lnome = u16(b, p + 28), lextra = u16(b, p + 30), lcom = u16(b, p + 32), local = u32(b, p + 42);
    const nome = new TextDecoder().decode(b.subarray(p + 46, p + 46 + lnome)), ini = local + 30 + u16(b, local + 26) + u16(b, local + 28);
    out[nome] = { metodo, dados: b.subarray(ini, ini + tamC) };
    p += 46 + lnome + lextra + lcom;
  }
  return out;
}
function zipTexto(f) {
  if (!f) return Promise.resolve('');
  if (f.metodo === 0) return Promise.resolve(new TextDecoder().decode(f.dados));
  if (typeof DecompressionStream !== 'function') return Promise.reject(new Error('Este navegador não abre .xlsx: salve como CSV ou atualize o navegador.'));
  return new Response(new Blob([f.dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
}
const colDe = (ref) => { const l = ref.replace(/\d+/g, ''); let n = 0; for (let i = 0; i < l.length; i++) n = n * 26 + (l.charCodeAt(i) - 64); return n - 1; };
const desfaz = (s) => s.replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d))).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
/** .xlsx → linhas (listas de textos), primeira aba. Datas do Excel viram DD/MM/AAAA. */
export async function lerXlsx(buf) {
  const a = zipArquivos(buf);
  const aba = a['xl/worksheets/sheet1.xml'] || a[Object.keys(a).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0]];
  if (!aba) throw new Error('A planilha não tem nenhuma aba.');
  const [ss, xml, st] = await Promise.all([zipTexto(a['xl/sharedStrings.xml']), zipTexto(aba), zipTexto(a['xl/styles.xml'])]);
  const comp = []; let m; const re = /<si>([\s\S]*?)<\/si>/g;
  while ((m = re.exec(ss))) comp.push(desfaz((m[1].match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map((x) => x.replace(/<[^>]+>/g, '')).join('')));
  const datas = {}, proprios = {}, xfs = ((st.match(/<cellXfs[\s\S]*?<\/cellXfs>/) || [''])[0].match(/<xf [^>]*>/g) || []);
  (st.match(/<numFmt [^>]*>/g) || []).forEach((f) => { const id = (f.match(/numFmtId="(\d+)"/) || [])[1], c = (f.match(/formatCode="([^"]*)"/) || [])[1] || ''; if (/[dy]/i.test(c) && !/\[h\]/i.test(c)) proprios[id] = 1; });
  xfs.forEach((x, i) => { const id = Number((x.match(/numFmtId="(\d+)"/) || [])[1]); if ((id >= 14 && id <= 22) || proprios[id]) datas[i] = 1; });
  const linhas = [], rl = /<row[^>]*>([\s\S]*?)<\/row>/g; let rr;
  while ((rr = rl.exec(xml))) {
    const lin = [], rc = /<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g; let cc;
    while ((cc = rc.exec(rr[1]))) {
      const at = cc[1], ref = (at.match(/r="([A-Z]+\d+)"/) || [])[1], tp = (at.match(/t="(\w+)"/) || [])[1], s = Number((at.match(/s="(\d+)"/) || [])[1]);
      const v = ((cc[2] || '').match(/<v>([\s\S]*?)<\/v>/) || [])[1]; let val = '';
      if (tp === 's') val = comp[Number(v)] || '';
      else if (tp === 'inlineStr') val = desfaz(((cc[2] || '').match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1] || '');
      else if (v != null) {
        val = desfaz(v);
        if (datas[s] && /^\d+(\.\d+)?$/.test(val)) { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(Number(val)) * DIA); val = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`; }
      }
      lin[ref ? colDe(ref) : lin.length] = val;
    }
    for (let i = 0; i < lin.length; i++) if (lin[i] == null) lin[i] = '';
    if (lin.some((x) => String(x).trim())) linhas.push(lin);
  }
  return linhas;
}
/** Texto do arquivo em UTF-8; se não for, em Windows-1252 (o padrão do Excel no Brasil). */
function textoDe(buf) { try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { return new TextDecoder('windows-1252').decode(buf); } }
export function lerCsv(txt) {
  txt = String(txt || '').replace(/^﻿/, '');
  const prim = txt.split(/\r?\n/).find((l) => l.trim()) || '', conta = (c) => prim.split(c).length - 1;
  const sep = [';', '\t', ','].sort((a, b) => conta(b) - conta(a))[0];
  const linhas = []; let lin = [], cel = '', aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (aspas) { if (c === '"') { if (txt[i + 1] === '"') { cel += '"'; i++; } else aspas = false; } else cel += c; continue; }
    if (c === '"' && !cel) aspas = true;
    else if (c === sep) { lin.push(cel); cel = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; lin.push(cel); if (lin.some((x) => x.trim())) linhas.push(lin); lin = []; cel = ''; }
    else cel += c;
  }
  lin.push(cel); if (lin.some((x) => x.trim())) linhas.push(lin);
  return linhas.map((l) => l.map((x) => x.trim()));
}
export async function lerPlanilha(arq) {
  const buf = await arq.arrayBuffer(), b = new Uint8Array(buf.slice(0, 4));
  if (b[0] === 0x50 && b[1] === 0x4b) return lerXlsx(buf);
  if (/\.xls$/i.test(arq.name)) throw new Error('Arquivo .xls antigo: no Excel, salve como "Pasta de Trabalho do Excel (.xlsx)" ou CSV.');
  return lerCsv(textoDe(buf));
}
/** Valor em centavos: "1.234,56", "R$ 1234,56", "1234.5" (número do Excel), "-12,30", "(12,30)". */
export function centavosDe(v) {
  let s = String(v ?? '').trim().replace(/\s|R\$|BRL/gi, '');
  if (!s) return NaN;
  const neg = /^-|^\(.*\)$|-$/.test(s); s = s.replace(/[-()+]/g, '');
  let c;
  if (/^\d+\.\d+$/.test(s) && !/^\d{1,3}(\.\d{3})+$/.test(s)) c = Math.round(Number(s) * 100);
  else if (/^\d+$/.test(s)) c = Number(s) * 100;
  else { if (/,\d+$/.test(s) && !/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(/,(\d{2})\d+$/, ',$1'); const x = s.replace(/\.(?=\d{3}(\.|,|$))/g, '').replace(',', '.'); c = /^\d+(\.\d+)?$/.test(x) ? Math.round(Number(x) * 100) : NaN; }
  return neg ? -c : c;
}
/** Data → ISO: DD/MM/AAAA (com ou sem hora), DD/MM/AA, AAAA-MM-DD, DD-MM-AAAA, DD.MM.AAAA ou número de série do Excel. */
export function isoDeData(v) {
  const s = String(v ?? '').trim(); let x, a, m, d;
  if ((x = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) [, a, m, d] = x;
  else if ((x = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/))) { [, d, m, a] = x; if (a.length === 2) a = `20${a}`; }
  else if (/^\d{5}(\.\d+)?$/.test(s) && Number(s) > 30000 && Number(s) < 80000) return isoUTC(new Date(Date.UTC(1899, 11, 30) + Math.round(Number(s)) * DIA));
  else return '';
  const iso = `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return !Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) && isoUTC(new Date(Date.parse(`${iso}T00:00:00Z`))) === iso ? iso : '';
}
const cabecalho = (linhas, dicas) => {
  // a linha dos nomes das colunas: a primeira (das 15 primeiras) com 2 ou mais células e o maior número de nomes conhecidos
  let melhor = 0, nota = -1;
  linhas.slice(0, 15).forEach((l, i) => { const cheias = l.filter((x) => String(x).trim()).length; if (cheias < 2) return; const n = l.filter((x) => dicas.some((r) => r.test(norm(x)))).length * 10 + (l.every((x) => !/\d{2}\/\d{2}/.test(x)) ? 1 : 0); if (n > nota) { nota = n; melhor = i; } });
  return melhor;
};
function sugereMapa(cab, campos) {
  const usados = new Set(), mapa = {};
  campos.forEach(([k, , regs]) => { for (const r of regs) { const i = cab.findIndex((h, j) => !usados.has(j) && r.test(norm(h))); if (i >= 0) { mapa[k] = i; usados.add(i); return; } } mapa[k] = -1; });
  return mapa;
}

// ------------------------------------------------------------------ NF-e (XML)
export function lerNFe(xml) {
  const doc = new DOMParser().parseFromString(String(xml || '').replace(/^﻿/, ''), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('O arquivo não é um XML válido.');
  const um = (el, n) => el?.getElementsByTagName(n)[0] || null, tx = (el, n) => (um(el, n)?.textContent || '').trim();
  if (um(doc, 'procEventoNFe') || um(doc, 'evento')) throw new Error('Esse XML é um evento (cancelamento ou carta de correção), não a nota.');
  const inf = um(doc, 'infNFe'); if (!inf) throw new Error(um(doc, 'CompNfse') || um(doc, 'Nfse') ? 'Esse XML é de nota de serviço (NFS-e): por enquanto o Arca lê a NF-e de produto.' : 'Não achei a nota (infNFe) nesse XML.');
  const ide = um(inf, 'ide'), emit = um(inf, 'emit'), dest = um(inf, 'dest'), tot = um(inf, 'ICMSTot');
  const chave = soDig(tx(doc, 'chNFe') || inf.getAttribute('Id'));
  const cent = (s) => Math.round(Number(s || 0) * 100);
  const emiss = (tx(ide, 'dhEmi') || tx(ide, 'dEmi')).slice(0, 10);
  const dups = [...(um(inf, 'cobr')?.getElementsByTagName('dup') || [])].map((d) => ({ n: tx(d, 'nDup'), venc: tx(d, 'dVenc').slice(0, 10), c: cent(tx(d, 'vDup')) })).filter((d) => d.c > 0);
  const fone = soDig(tx(um(dest, 'enderDest'), 'fone'));
  return {
    chave, numero: tx(ide, 'nNF'), serie: tx(ide, 'serie'), modelo: tx(ide, 'mod'), emissao: emiss, tpNF: tx(ide, 'tpNF'), amb: tx(ide, 'tpAmb'), natureza: tx(ide, 'natOp'),
    emit: { doc: soDig(tx(emit, 'CNPJ') || tx(emit, 'CPF')), nome: tx(emit, 'xFant') || tx(emit, 'xNome'), razao: tx(emit, 'xNome') },
    dest: { doc: soDig(tx(dest, 'CNPJ') || tx(dest, 'CPF')), nome: tx(dest, 'xNome'), email: tx(dest, 'email'), fone },
    total: cent(tx(tot, 'vNF')), dups, autorizada: !!um(doc, 'protNFe') && /^10[0-2]$|^150$/.test(tx(um(doc, 'protNFe'), 'cStat') || '100'),
    itens: inf.getElementsByTagName('det').length,
  };
}

// ------------------------------------------------------------------ maquininhas: perfis (nomes de coluna de cada relatório)
const MAQ = {
  stone: { nome: 'Stone', marca: /stone/ },
  pagbank: { nome: 'PagBank', marca: /pagbank|pagseguro|data_compensacao|valor_liquido/ },
  mercadopago: { nome: 'Mercado Pago', marca: /mercado ?pago|settlement|transaction_amount|money_release|liberacao do dinheiro/ },
  cielo: { nome: 'Cielo', marca: /cielo|numero do estabelecimento|n.? ec\b/ },
  infinitepay: { nome: 'InfinitePay', marca: /infinite|infinitepay/ },
  outra: { nome: 'Maquininha', marca: /$^/ },
};
const CAMPOS_MAQ = [
  ['prev', 'Data do pagamento (prevista)', [/previs|prevista|data de (pagamento|recebimento|liberacao|credito|deposito)|liberacao|money_release|settlement_date|data_compensacao|compensa|vencimento|liquida/, /recebimento|pagamento/]],
  ['venda', 'Data da venda', [/data (da )?(venda|transacao|compra)|data_transacao|date_created|transaction_date|^data$|^date$/]],
  ['bruto', 'Valor bruto', [/bruto|transaction_amount|valor (da )?(venda|transacao|original)|valor_bruto|gross/, /^valor$|^amount$/]],
  ['taxa', 'Taxa (MDR)', [/taxa|mdr|tarifa|desconto|fee|custo|comiss/]],
  ['liq', 'Valor líquido', [/liquid|net_amount|settlement_net|real_amount|valor_liquido|a receber|valor recebido|receber/]],
  ['band', 'Bandeira', [/bandeira|brand|card|cartao/]],
];
const CAMPOS_CONTAS = [
  ['venc', 'Vencimento', [/venc|data de pagamento|prazo/, /^data|data$/]],
  ['valor', 'Valor', [/^valor$|valor (da conta|do titulo|a pagar|a receber|original|total|bruto)|^total$|montante|quantia/, /valor|preco|r\$/]],
  ['pessoa', 'Fornecedor ou cliente', [/fornecedor|cliente|favorecido|benefici|sacado|pagador|credor|devedor|razao social/, /^nome|empresa|parceiro|contato/]],
  ['desc', 'Descrição', [/descri|historico|referente|observa|detalhe|^item|documento|^nf|nota/]],
  ['tipo', 'Pagar ou receber', [/^tipo|natureza|pagar.*receber|receber.*pagar|operacao|^d\/?c$|entrada.*saida|movimento/]],
  ['cat', 'Categoria', [/categor|plano de conta|classifica|conta contabil|grupo/]],
  ['situ', 'Situação (pago ou aberto)', [/situa|status|quitad|baixa|^pago|pagamento efetuado|liquidad/]],
];
const tipoDe = (v) => { const s = norm(v); if (!s) return ''; if (/receb|receita|entrada|credito|^c$|^r$|cliente|venda|^\+/.test(s)) return 'receber'; if (/pag|despesa|saida|debito|^d$|^p$|fornecedor|compra|^-/.test(s)) return 'pagar'; return ''; };
const pagoDe = (v) => { const s = norm(v); if (!s) return false; if (/nao|aberto|pendente|a pagar|a receber|vencid|atras|^n$|em dia|previst|futur/.test(s)) return false; return /pago|paga|quitad|liquidad|baixad|recebid|^ok$|^sim$|^s$|^x$|conclu/.test(s); };

/** Liga a tela "Trazer do que já usa" ao app. ctx traz o que é do app.js. */
export function criar(ctx) {
  const { t, din, dataC, N, E, DEMO, IC } = ctx;
  const db = () => ctx.db();
  let est = null; // prévia aberta: { tipo: 'nfe' | 'planilha' | 'maq', ... }
  let linhaBoleto = '', irPara = '#pagar';
  const hojeLocal = () => N.hojeISO();
  const diaDeIso = (iso) => (iso ? N.diaDe(iso) : NaN);
  const catPadrao = (tipo) => (tipo === 'receber' ? E.CAT_ENTRADA : 'Fornecedores e mercadorias');
  const cats = (tipo) => E.catsDoTipo(db(), tipo === 'receber' ? 'entra' : 'sai');
  const catOk = (tipo, v) => { const l = cats(tipo), n = norm(v); return l.find((c) => norm(c) === n) || l.find((c) => n && norm(c).includes(n)) || ''; };
  const opCats = (tipo, sel) => cats(tipo).map((c) => `<option ${c === sel ? 'selected' : ''}>${t(c)}</option>`).join('');
  const bancoDaEmp = (empId) => db().bancos.find((b) => b.emp === empId)?.id || E.bancoPadrao(db());
  const empDoc = (doc) => (doc ? db().empresas.find((e) => soDig(e.cnpj) === doc) : null);
  const podeTipo = (tipo) => ctx.pode(tipo === 'receber' ? 'receber' : 'pagar');
  const lerMapas = () => { try { return JSON.parse(localStorage.getItem(`${ctx.CHAVE}-mapas-import`) || '{}') || {}; } catch { return {}; } };
  const guardaMapa = (assin, mapa) => { try { const m = lerMapas(); m[assin] = mapa; localStorage.setItem(`${ctx.CHAVE}-mapas-import`, JSON.stringify(m)); } catch { /* sem acesso: só não lembra */ } };
  const jaTemChave = (ch) => ch && [...db().contas, ...db().cobrancas].find((x) => x.imp?.chave === ch);
  const novoItem = (tipo, base) => {
    const it = { id: ctx.nid(), cc: '', proj: '', tags: [], multa: 2, juros: 1, status: 'aberta', origem: 'importacao', ...base };
    if (tipo === 'receber') Object.assign(it, { tel: it.tel || '', email: it.email || '', avisos: [], criada: 0 });
    else { it.pote = it.pote || 'contas'; it.criadoPor = ctx.usuario()?.id; if (E.precisaAprovar(db(), it)) it.aprov = { st: 'pendente' }; }
    (tipo === 'receber' ? db().cobrancas : db().contas).push(it);
    return it;
  };
  // fornecedor ou cliente que já existe (pelo CNPJ ou pelo nome): usa o nome como já está escrito, e o telefone e o e-mail que já tem
  function pessoaExistente(tipo, doc, nome) {
    const l = tipo === 'receber' ? db().cobrancas : db().contas, n = norm(nome);
    const x = (doc && l.find((y) => y.doc === doc)) || (n && l.find((y) => norm(tipo === 'receber' ? y.cli : (y.forn || String(y.desc || '').split(' · ')[0])) === n));
    if (!x) return null;
    return { nome: tipo === 'receber' ? x.cli : (x.forn || String(x.desc).split(' · ')[0]), tel: x.tel, email: x.email, cat: x.cat };
  }

  // ---------------------------------------------------------------- telas
  const cartao = (ic, tit, txt, corpo) => `<section class="bloco imp-card">${ctx.titulo(ic, tit)}<p class="mini">${txt}</p>${corpo}</section>`;
  function boletoHtml() {
    const r = lerLinha(linhaBoleto), d = r.digitos || '';
    let res = '';
    if (d.length) {
      const linhas = [];
      if (r.tipo === 'banco') linhas.push(['Banco', `${t(r.banco)} <small>(${t(r.bancoCod)})</small>`]);
      if (r.tipo === 'arrecadacao') linhas.push(['Tipo', `Conta de consumo ou imposto · ${t(r.segmento)}`]);
      if (r.tipo) linhas.push(['Valor', r.valor ? `<b class="num">${din(r.valor)}</b>` : '<span class="mudo">não vem na linha: digite</span>'], ['Vencimento', r.venc ? `<b class="num">${dataC(N.diaDe(r.venc))}</b>${r.vencProvavel ? ' <small class="mudo">(achado no código: confira)</small>' : ''}` : '<span class="mudo">não vem na linha: escolha a data</span>']);
      res = `<div class="imp-boleto-r ${r.ok ? 'ok' : 'ru'}" role="status">${r.ok ? `<p class="imp-ok">${IC.ok} Linha conferida: os dígitos batem.</p>` : `<p class="erro">${r.erros.map(t).join('<br>')}</p>`}${linhas.length ? `<dl>${linhas.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>` : ''}${r.ok ? `<button type="button" class="bt cheio" data-acao="imp-boleto-conta">${IC.doc} Criar a conta a pagar</button>` : ''}</div>`;
    }
    return res;
  }
  function inicio() {
    const ex = (k) => (DEMO ? `<button type="button" class="bt" data-acao="imp-exemplo" data-k="${k}">Usar um exemplo</button>` : '');
    return `${ctx.cabeca('Trazer do que você já usa', 'Nota fiscal, boleto, planilha e maquininha entram sem digitar. Tudo é lido neste computador; nada é gravado antes de você conferir, e nada do que já existe é apagado.')}
      <div class="imp-cards">
      ${cartao(IC.doc, 'XML da nota fiscal (NF-e)', 'O XML que o fornecedor manda por e-mail (ou o da sua nota de venda). As duplicatas viram as parcelas: compra vai para <b>A pagar</b>, venda para <b>A receber</b>. Pode escolher vários de uma vez.', `<div class="linha"><label class="bt cheio">Escolher XML<input type="file" id="imp-arq-nfe" accept=".xml,text/xml,application/xml" multiple hidden></label>${ex('nfe')}</div>`)}
      ${cartao(IC.cobrar, 'Boleto pela linha digitável', 'Cole ou digite os números do boleto (47 ou 48 dígitos). O Arca confere os dígitos e tira o valor, o vencimento e o banco, sem mandar nada para fora.', `<label class="campo">Linha digitável<textarea id="imp-linha" rows="2" inputmode="numeric" autocomplete="off" spellcheck="false" placeholder="34191.09008 00012.345671 23450.000005 1 ...">${t(linhaBoleto)}</textarea></label>${DEMO ? `<div class="linha">${ex('boleto')}</div>` : ''}<div id="imp-boleto-res">${boletoHtml()}</div>`)}
      ${cartao(IC.livro, 'Planilha de contas a pagar e a receber', 'O controle que você já tem no Excel ou no Google Planilhas (.xlsx ou .csv), com as colunas em qualquer ordem: o Arca sugere qual é qual e você confere.', `<div class="linha"><label class="bt cheio">Escolher planilha<input type="file" id="imp-arq-plan" accept=".xlsx,.csv,.txt" hidden></label>${ex('planilha')}</div>`)}
      ${cartao(IC.cartao, 'Relatório da maquininha', 'O relatório de recebíveis (vendas a receber) baixado no portal ou no app da Stone, PagBank, Mercado Pago, Cielo, InfinitePay ou outra. Vira o que vai cair na conta, dia a dia, com a taxa separada.', `<div class="linha"><label class="bt cheio">Escolher relatório<input type="file" id="imp-arq-maq" accept=".csv,.xlsx,.txt" hidden></label>${ex('maq')}</div>`)}
      </div>
      <p class="mini">Extrato do banco (OFX ou CSV) entra pela <a href="#conciliacao">Conciliação</a>.</p>`;
  }

  // ---------------------------------------------------------------- NF-e
  function abreNotas(lidos) {
    const notas = [], erros = [];
    lidos.forEach(({ nome, xml, arq }) => {
      try {
        const n = lerNFe(xml), ed = empDoc(n.emit.doc), dd = empDoc(n.dest.doc);
        const tipo = dd && !ed ? 'pagar' : ed && !dd ? 'receber' : n.tpNF === '0' && ed ? 'pagar' : ed ? 'receber' : 'pagar';
        const emp = (tipo === 'pagar' ? dd : ed) || (ctx.empSel() && ctx.empSel()) || null;
        const parcs = n.dups.length ? n.dups.map((d, i) => ({ c: d.c, venc: d.venc, n: d.n || String(i + 1).padStart(3, '0') })) : [{ c: n.total, venc: N.isoDe(30), n: '001', semDup: true }];
        const dup = jaTemChave(n.chave) || notas.find((x) => x.chave === n.chave);
        notas.push({ ...n, arquivo: nome, arq, tipo, emp: (emp && emp.id) || emp || db().empresas[0]?.id, reconhecida: !!(ed || dd), dup: !!dup, dupQuando: dup?.vence, parcs, incluir: !dup, cat: '' });
      } catch (e) { erros.push({ nome, motivo: e.message }); }
    });
    est = { tipo: 'nfe', notas, erros };
    if (location.hash !== '#trazer') location.hash = '#trazer'; else ctx.mostra();
  }
  function telaNotas() {
    const { notas, erros } = est, ok = notas.filter((n) => n.incluir), tot = ok.reduce((a, n) => a + n.parcs.reduce((s, p) => s + p.c, 0), 0);
    return `<a class="voltar" href="#trazer" data-acao="imp-cancelar">‹ Cancelar</a>${ctx.cabeca('Conferir as notas antes de gravar', `${notas.length} nota(s) lida(s)${erros.length ? `, ${erros.length} arquivo(s) com problema` : ''}. As parcelas saem das duplicatas da nota.`)}
      ${ctx.kpis([ctx.kpi(IC.doc, 'Notas para lançar', String(ok.length)), ctx.kpi(IC.sai, 'Vai para A pagar', String(ok.filter((n) => n.tipo === 'pagar').length)), ctx.kpi(IC.entra, 'Vai para A receber', String(ok.filter((n) => n.tipo === 'receber').length)), ctx.kpi(IC.moedas, 'Total', din(tot))])}
      ${erros.length ? `<section class="bloco">${erros.map((e) => `<p class="erro">${t(e.nome)}: ${t(e.motivo)}</p>`).join('')}</section>` : ''}
      <form id="f-trazer" novalidate>${notas.map((n, i) => {
        const pes = n.tipo === 'pagar' ? n.emit : n.dest, ex = pessoaExistente(n.tipo, pes.doc, pes.nome), cat = n.cat || ex?.cat || catPadrao(n.tipo);
        const avisos = [n.dup ? `<span class="etq ru">já lançada${Number.isFinite(n.dupQuando) ? ` (vence ${dataC(n.dupQuando)})` : ''}: não entra de novo</span>` : '', !n.reconhecida ? '<span class="etq at">o CNPJ da nota não é de nenhuma empresa do grupo: confira se é compra ou venda</span>' : '', n.amb === '2' ? '<span class="etq at">nota de homologação (teste, sem valor fiscal)</span>' : '', !n.autorizada ? '<span class="etq at">sem o protocolo de autorização da SEFAZ</span>' : '', n.parcs[0].semDup ? '<span class="etq">sem duplicatas: uma parcela, escolha o vencimento</span>' : '', ex ? `<span class="etq ok">${n.tipo === 'pagar' ? 'fornecedor' : 'cliente'} já cadastrado</span>` : ''].filter(Boolean).join(' ');
        return `<section class="bloco imp-nota ${n.dup ? 'dup' : ''}"><div class="imp-nota-t"><label class="check"><input type="checkbox" data-imp-nota="${i}" ${n.incluir ? 'checked' : ''} ${n.dup ? 'disabled' : ''}> <b>NF ${t(n.numero)}${n.serie ? `-${t(n.serie)}` : ''}</b> · ${t(pes.nome || 'sem nome')} <small>${t(fmtDoc(pes.doc))}</small></label><b class="num">${din(n.total)}</b></div>
          <p class="mini">Emitida em ${n.emissao ? dataC(N.diaDe(n.emissao)) : '—'} por ${t(n.emit.razao || n.emit.nome)} para ${t(n.dest.nome || '—')} · ${n.itens} item(ns) · ${t(n.natureza || '')}<br><small class="num">Chave ${t(n.chave.replace(/(\d{4})(?=\d)/g, '$1 '))}</small></p>
          ${avisos ? `<p class="imp-avisos">${avisos}</p>` : ''}
          <div class="campos-3"><label class="campo">Esta nota é<select data-imp-tipo="${i}" ${n.dup ? 'disabled' : ''}><option value="pagar" ${n.tipo === 'pagar' ? 'selected' : ''}>Compra: conta a pagar</option><option value="receber" ${n.tipo === 'receber' ? 'selected' : ''}>Venda: conta a receber</option></select></label>
            <label class="campo">Empresa<select data-imp-emp="${i}" ${n.dup ? 'disabled' : ''}>${ctx.opEmp(n.emp)}</select></label>
            <label class="campo">Categoria<select data-imp-cat="${i}" ${n.dup ? 'disabled' : ''}>${opCats(n.tipo, cat)}</select></label></div>
          ${ctx.tabela('imp-parc', [['Parcela'], ['Vencimento'], ['Valor', 'dir']], n.parcs.map((p, j) => `<tr>${ctx.td('Parcela', `${t(p.n)} <small class="mudo">${j + 1}/${n.parcs.length}</small>`)}${ctx.td('Vencimento', `<input type="date" class="imp-data" data-imp-venc="${i}:${j}" value="${t(p.venc)}" aria-label="Vencimento da parcela ${j + 1}" ${n.dup ? 'disabled' : ''}>`)}${ctx.td('Valor', din(p.c), 'dir num')}</tr>`))}</section>`;
      }).join('')}
      <div class="salvar-fixo"><button type="button" class="bt cheio largo" data-acao="imp-gravar" ${ok.length ? '' : 'disabled'}>Lançar ${ok.length} nota(s) (${ok.reduce((a, n) => a + n.parcs.length, 0)} parcela(s))</button></div></form>`;
  }
  function gravaNotas() {
    const ok = est.notas.filter((n) => n.incluir && !n.dup); let np = 0, nn = 0, apr = 0;
    const semPerm = ok.find((n) => !podeTipo(n.tipo)); if (semPerm) throw new Error(`Seu perfil não pode lançar conta ${semPerm.tipo === 'pagar' ? 'a pagar' : 'a receber'}.`);
    ok.forEach((n) => { n.parcs.forEach((p, j) => { if (!isoDeData(p.venc)) throw new Error(`NF ${n.numero}: escolha o vencimento da parcela ${j + 1}.`); }); if (jaTemChave(n.chave)) throw new Error(`A NF ${n.numero} já foi lançada.`); });
    const anexar = [];
    ok.forEach((n) => {
      const pes = n.tipo === 'pagar' ? n.emit : n.dest, ex = pessoaExistente(n.tipo, pes.doc, pes.nome), nome = (ex?.nome || pes.nome || (n.tipo === 'pagar' ? 'Fornecedor' : 'Cliente')).slice(0, 60);
      const b = bancoDaEmp(n.emp), cat = n.cat || ex?.cat || catPadrao(n.tipo), grupo = n.parcs.length > 1 ? ctx.nid() : '', novos = [];
      n.parcs.forEach((p, j) => {
        const parc = n.parcs.length > 1 ? { parc: `${j + 1}/${n.parcs.length}`, grupo } : {}, imp = { arquivo: n.arquivo, tipo: 'nfe', chave: n.chave, numero: n.numero, dup: p.n, quando: new Date().toISOString() };
        const sufixo = `NF ${n.numero}${n.parcs.length > 1 ? ` · parcela ${j + 1}/${n.parcs.length}` : ''}`;
        const base = { emp: n.emp, banco: b, cat, c: p.c, vence: diaDeIso(p.venc), doc: pes.doc, imp, ...parc, ...(Number.isFinite(diaDeIso(n.emissao)) ? { dcomp: diaDeIso(n.emissao) } : {}) };
        const it = n.tipo === 'pagar' ? novoItem('pagar', { ...base, desc: `${nome} · ${sufixo}`.slice(0, 80), forn: nome }) : novoItem('receber', { ...base, cli: nome, desc: sufixo, tel: ex?.tel || pes.fone || '', email: ex?.email || pes.email || '' });
        if (it.aprov?.st === 'pendente') apr++;
        novos.push(it);
      });
      if (n.tipo === 'pagar') np++; else nn++;
      ctx.hist(`Lançou a NF ${n.numero} de ${nome} (${din(n.total)}, ${n.parcs.length} parcela(s)) ${n.tipo === 'pagar' ? 'em A pagar' : 'em A receber'} pelo XML`);
      anexar.push({ n, novos });
    });
    // o XML fica anexado em cada parcela (guardado neste computador, como os outros anexos)
    anexar.forEach(({ n, novos }) => { const f = n.arq || new File([n.xmlTexto || ''], n.arquivo, { type: 'application/xml' }); if (!f.size) return; ctx.guardaAnexos([f]).then((l) => { if (!l.length) return; novos.forEach((a) => { a.anexos = [...(a.anexos || []), ...l]; }); ctx.grava(); }); });
    est = null; irPara = np >= nn ? '#pagar' : '#receber';
    return `${np + nn} nota(s) lançada(s)${np ? `: ${np} em A pagar` : ''}${nn ? `${np ? ',' : ':'} ${nn} em A receber` : ''}.${apr ? ` ${apr} parcela(s) esperando aprovação.` : ''}`;
  }

  // ---------------------------------------------------------------- planilha de contas e maquininha (mesmo mapeador)
  function abrePlanilha(tipo, nome, linhas) {
    const campos = tipo === 'maq' ? CAMPOS_MAQ : CAMPOS_CONTAS, dicas = campos.flatMap((c) => c[2]);
    if (!linhas.length) throw new Error('A planilha está vazia.');
    const ic = cabecalho(linhas, dicas), cab = linhas[ic].map((h, i) => String(h || '').trim() || `Coluna ${i + 1}`), dados = linhas.slice(ic + 1);
    const assin = `${tipo}:${cab.map(norm).join('|')}`, lembrado = lerMapas()[assin];
    let perfil = '';
    if (tipo === 'maq') { const tudo = norm(`${nome} ${cab.join(' ')} ${linhas.slice(0, ic).flat().join(' ')}`); perfil = Object.keys(MAQ).find((k) => MAQ[k].marca.test(tudo)) || 'outra'; }
    est = { tipo, arquivo: nome, cab, dados, mapa: lembrado || sugereMapa(cab, campos), lembrado: !!lembrado, assin, perfil, padrao: 'pagar', agrupar: true, emp: ctx.empSel() || db().empresas[0]?.id, banco: '', fora: new Set() };
    est.banco = bancoDaEmp(est.emp);
    if (location.hash !== '#trazer') location.hash = '#trazer'; else ctx.mostra();
  }
  const cel = (l, k) => (est.mapa[k] >= 0 ? String(l[est.mapa[k]] ?? '').trim() : '');
  function linhasContas() {
    return est.dados.map((l, i) => {
      const v = centavosDe(cel(l, 'valor')), venc = isoDeData(cel(l, 'venc')), pessoa = cel(l, 'pessoa').slice(0, 60), desc = cel(l, 'desc').slice(0, 80);
      let tipo = tipoDe(cel(l, 'tipo')) || (est.mapa.tipo < 0 && v < 0 ? 'pagar' : '') || est.padrao; const c = Math.abs(v);
      const catTxt = cel(l, 'cat'), cat = catOk(tipo, catTxt) || catPadrao(tipo), pago = pagoDe(cel(l, 'situ'));
      const descF = tipo === 'pagar' ? (pessoa && desc && !norm(desc).includes(norm(pessoa)) ? `${pessoa} · ${desc}` : pessoa || desc) : desc || (pessoa ? 'Conta importada' : '');
      const r = { i, linha: i + 1, tipo, c, venc, pessoa, desc: descF, cat, catTxt, pago, motivo: '' };
      if (!Number.isFinite(v) || !c) r.motivo = 'sem valor';
      else if (!venc) r.motivo = 'sem data de vencimento';
      else if (!descF && !pessoa) r.motivo = 'sem descrição nem nome';
      else if (pago) r.motivo = 'já paga: fica de fora para não mexer no saldo dos bancos';
      else {
        const dia = diaDeIso(venc), lista = tipo === 'receber' ? db().cobrancas : db().contas;
        if (lista.some((x) => x.c === c && x.vence === dia && (tipo === 'receber' ? norm(x.cli) === norm(pessoa || descF) : norm(x.desc) === norm(descF)))) r.motivo = 'já existe igual no Arca';
      }
      return r;
    });
  }
  function linhasMaq() {
    const porLinha = est.dados.map((l, i) => {
      let bruto = centavosDe(cel(l, 'bruto')), liq = centavosDe(cel(l, 'liq')); const taxaTxt = cel(l, 'taxa'); let taxa = /%/.test(taxaTxt) ? NaN : Math.abs(centavosDe(taxaTxt));
      if (/%/.test(taxaTxt) && Number.isFinite(bruto)) { const p = Number(taxaTxt.replace(/[^\d,.]/g, '').replace(',', '.')); if (Number.isFinite(p)) taxa = Math.round(Math.abs(bruto) * p / 100); }
      if (!Number.isFinite(liq) && Number.isFinite(bruto)) liq = bruto - (Number.isFinite(taxa) ? taxa : 0);
      if (!Number.isFinite(bruto) && Number.isFinite(liq)) bruto = liq + (Number.isFinite(taxa) ? taxa : 0);
      if (!Number.isFinite(taxa) && Number.isFinite(bruto) && Number.isFinite(liq)) taxa = bruto - liq;
      const prev = isoDeData(cel(l, 'prev')) || isoDeData(cel(l, 'venda'));
      return { i, linha: i + 1, prev, venda: isoDeData(cel(l, 'venda')), bruto, taxa: Number.isFinite(taxa) ? taxa : 0, liq, band: cel(l, 'band').slice(0, 20), motivo: !Number.isFinite(liq) ? 'sem valor' : liq <= 0 ? 'estorno ou valor negativo: fica de fora' : !prev ? 'sem data' : '' };
    });
    const nomeMaq = MAQ[est.perfil]?.nome || 'Maquininha', boas = porLinha.filter((x) => !x.motivo), grupos = [];
    if (est.agrupar) { const m = new Map(); boas.forEach((x) => { const g = m.get(x.prev) || { prev: x.prev, n: 0, bruto: 0, taxa: 0, liq: 0, linhas: [] }; g.n++; g.bruto += x.bruto; g.taxa += x.taxa; g.liq += x.liq; g.linhas.push(x.linha); m.set(x.prev, g); }); grupos.push(...[...m.values()].sort((a, b) => (a.prev < b.prev ? -1 : 1))); }
    else boas.forEach((x) => grupos.push({ prev: x.prev, n: 1, bruto: x.bruto, taxa: x.taxa, liq: x.liq, linhas: [x.linha], band: x.band }));
    grupos.forEach((g, k) => {
      g.k = k; g.ref = `maq:${est.perfil}:${g.prev}:${g.liq}${est.agrupar ? '' : `:${g.linhas[0]}`}`;
      const dia = diaDeIso(g.prev);
      g.ja = db().cobrancas.some((x) => x.imp?.ref === g.ref || (x.imp?.tipo === 'maquininha' && x.vence === dia && x.c === g.liq && norm(x.cli) === norm(nomeMaq)));
    });
    return { porLinha, grupos, nomeMaq };
  }
  const opColunas = (sel) => `<option value="-1">— não tem —</option>${est.cab.map((h, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${t(h)}${est.dados[0]?.[i] ? ` (ex.: ${t(String(est.dados[0][i]).slice(0, 18))})` : ''}</option>`).join('')}`;
  const mapeador = (campos) => `<details class="bloco imp-mapa" ${est.lembrado ? '' : 'open'}><summary><b>Qual coluna é qual</b> <small class="mudo">${est.lembrado ? 'o mesmo jeito da última vez' : 'sugerido pelo nome das colunas: confira'}</small></summary><div class="campos-3">${campos.map(([k, rot]) => `<label class="campo">${rot}<select data-imp-mapa="${k}">${opColunas(est.mapa[k])}</select></label>`).join('')}</div></details>`;
  function telaPlanilha() {
    const l = linhasContas(), boas = l.filter((x) => !x.motivo && !est.fora.has(x.i)), pg = boas.filter((x) => x.tipo === 'pagar'), rc = boas.filter((x) => x.tipo === 'receber');
    return `<a class="voltar" href="#trazer" data-acao="imp-cancelar">‹ Cancelar</a>${ctx.cabeca('Conferir a planilha antes de gravar', `${t(est.arquivo)}: ${est.dados.length} linha(s). Só entram as marcadas; o que já está no Arca fica de fora.`)}
      ${ctx.kpis([ctx.kpi(IC.sai, 'A pagar', String(pg.length), din(pg.reduce((a, x) => a + x.c, 0))), ctx.kpi(IC.entra, 'A receber', String(rc.length), din(rc.reduce((a, x) => a + x.c, 0))), ctx.kpi(IC.alerta, 'Ficam de fora', String(l.length - boas.length), 'pagas, repetidas ou incompletas')])}
      ${mapeador(CAMPOS_CONTAS)}
      <section class="bloco"><div class="campos-3"><label class="campo">Quando a linha não diz, é<select data-imp-padrao><option value="pagar" ${est.padrao === 'pagar' ? 'selected' : ''}>conta a pagar</option><option value="receber" ${est.padrao === 'receber' ? 'selected' : ''}>conta a receber</option></select></label><label class="campo">Empresa<select data-imp-empg>${ctx.opEmp(est.emp)}</select></label><label class="campo">Conta bancária<select data-imp-banco>${ctx.opBancos(est.banco)}</select></label></div></section>
      <form id="f-trazer" class="bloco" novalidate>${ctx.tabela('imp-plan', [['<input type="checkbox" data-imp-todas checked aria-label="Marcar todas">'], ['Linha', 'o2'], ['Tipo'], ['Vencimento'], ['Fornecedor ou cliente e descrição'], ['Categoria', 'o1'], ['Valor', 'dir'], ['']], l.slice(0, 500).map((x) => `<tr class="${x.motivo ? 'dup' : ''}"><td class="cx">${x.motivo ? '' : `<input type="checkbox" data-imp-linha="${x.i}" ${est.fora.has(x.i) ? '' : 'checked'} aria-label="Trazer a linha ${x.linha}">`}</td>${ctx.td('Linha', String(x.linha), 'o2 num')}${ctx.td('Tipo', x.tipo === 'pagar' ? '<span class="etq ru">a pagar</span>' : '<span class="etq ok">a receber</span>')}${ctx.td('Vencimento', x.venc ? dataC(diaDeIso(x.venc)) : '—', 'num')}${ctx.td('Descrição', `<b>${t(x.tipo === 'receber' ? x.pessoa || x.desc : x.desc)}</b>${x.tipo === 'receber' && x.pessoa ? `<small class="sub-l">${t(x.desc)}</small>` : ''}`)}${ctx.td('Categoria', `${t(x.cat)}${x.catTxt && norm(x.catTxt) !== norm(x.cat) ? `<small class="sub-l">na planilha: ${t(x.catTxt)}</small>` : ''}`, 'o1')}${ctx.td('Valor', Number.isFinite(x.c) && x.c ? din(x.c) : '—', 'dir num')}${ctx.td('', x.motivo ? `<small class="mudo">${t(x.motivo)}</small>` : '')}</tr>`), 'Nenhuma linha.')}
      ${l.length > 500 ? `<p class="mini">Mostrando as 500 primeiras; as outras ${l.length - 500} também entram.</p>` : ''}</form>
      <div class="salvar-fixo"><button type="button" class="bt cheio largo" data-acao="imp-gravar" ${boas.length ? '' : 'disabled'}>Trazer ${boas.length} conta(s)</button></div>`;
  }
  function gravaPlanilha() {
    const l = linhasContas().filter((x) => !x.motivo && !est.fora.has(x.i)); if (!l.length) throw new Error('Nenhuma linha marcada.');
    if (l.some((x) => !podeTipo(x.tipo))) throw new Error('Seu perfil não pode lançar algumas dessas contas.');
    const b = db().bancos.find((x) => x.id === est.banco) || db().bancos.find((x) => x.id === bancoDaEmp(est.emp)), quando = new Date().toISOString(); let np = 0, nr = 0, apr = 0;
    l.forEach((x) => {
      const base = { emp: b.emp, banco: b.id, cat: x.cat, c: x.c, vence: diaDeIso(x.venc), imp: { arquivo: est.arquivo, tipo: 'planilha', linha: x.linha, quando } };
      const it = x.tipo === 'pagar' ? novoItem('pagar', { ...base, desc: x.desc || x.pessoa, ...(x.pessoa ? { forn: x.pessoa } : {}) }) : novoItem('receber', { ...base, cli: x.pessoa || x.desc, desc: x.desc || 'Conta importada' });
      if (it.aprov?.st === 'pendente') apr++; if (x.tipo === 'pagar') np++; else nr++;
    });
    guardaMapa(est.assin, est.mapa);
    ctx.hist(`Trouxe ${l.length} conta(s) da planilha ${est.arquivo} (${np} a pagar, ${nr} a receber)`);
    est = null; irPara = np >= nr ? '#pagar' : '#receber';
    return `${np + nr} conta(s) trazida(s): ${np} a pagar, ${nr} a receber.${apr ? ` ${apr} esperando aprovação.` : ''}`;
  }
  function telaMaq() {
    const { porLinha, grupos, nomeMaq } = linhasMaq(), boas = grupos.filter((g) => !g.ja && !est.fora.has(g.k)), fora = porLinha.filter((x) => x.motivo);
    return `<a class="voltar" href="#trazer" data-acao="imp-cancelar">‹ Cancelar</a>${ctx.cabeca('Conferir os recebíveis da maquininha', `${t(est.arquivo)}: ${porLinha.length} venda(s). Cada dia de pagamento vira uma conta a receber com o valor líquido (o que cai na conta).`)}
      ${ctx.kpis([ctx.kpi(IC.moedas, 'Vendas (bruto)', din(boas.reduce((a, g) => a + g.bruto, 0))), ctx.kpi(IC.alerta, 'Taxas da maquininha', din(boas.reduce((a, g) => a + g.taxa, 0))), ctx.kpi(IC.entra, 'Cai na conta (líquido)', din(boas.reduce((a, g) => a + g.liq, 0)), `${boas.length} recebimento(s)`), ctx.kpi(IC.livro, 'Já no Arca', String(grupos.filter((g) => g.ja).length))])}
      <section class="bloco"><div class="campos-3"><label class="campo">Maquininha<select data-imp-perfil>${Object.entries(MAQ).map(([k, p]) => `<option value="${k}" ${k === est.perfil ? 'selected' : ''}>${p.nome === 'Maquininha' ? 'Outra' : p.nome}</option>`).join('')}</select></label><label class="campo">Empresa<select data-imp-empg>${ctx.opEmp(est.emp)}</select></label><label class="campo">Cai na conta<select data-imp-banco>${ctx.opBancos(est.banco)}</select></label></div>
        <label class="check"><input type="checkbox" data-imp-agrupar ${est.agrupar ? 'checked' : ''}> Juntar as vendas do mesmo dia de pagamento (uma conta a receber por dia)</label></section>
      ${mapeador(CAMPOS_MAQ)}
      ${fora.length ? `<details class="bloco"><summary><b>Linhas que não entram (${fora.length})</b></summary>${fora.slice(0, 40).map((x) => `<p class="mini">Linha ${x.linha}: ${t(x.motivo)}</p>`).join('')}</details>` : ''}
      <form id="f-trazer" class="bloco" novalidate>${ctx.tabela('imp-maq', [['<input type="checkbox" data-imp-todas checked aria-label="Marcar todos">'], ['Cai na conta em'], ['Vendas'], ['Bruto', 'dir o1'], ['Taxa', 'dir o1'], ['Líquido', 'dir'], ['']], grupos.map((g) => `<tr class="${g.ja ? 'dup' : ''}"><td class="cx">${g.ja ? '' : `<input type="checkbox" data-imp-linha="${g.k}" ${est.fora.has(g.k) ? '' : 'checked'} aria-label="Trazer o recebimento de ${dataC(diaDeIso(g.prev))}">`}</td>${ctx.td('Cai em', dataC(diaDeIso(g.prev)), 'num')}${ctx.td('Vendas', `${g.n} venda(s)${g.band ? ` · ${t(g.band)}` : ''}`)}${ctx.td('Bruto', din(g.bruto), 'dir num o1')}${ctx.td('Taxa', `<span class="sai">−${din(g.taxa)}</span>`, 'dir num o1')}${ctx.td('Líquido', `<b>${din(g.liq)}</b>`, 'dir num')}${ctx.td('', g.ja ? '<small class="mudo">já está no Arca</small>' : '')}</tr>`), 'Nenhuma venda a receber nesse arquivo.')}</form>
      <div class="salvar-fixo"><button type="button" class="bt cheio largo" data-acao="imp-gravar" ${boas.length ? '' : 'disabled'}>Trazer ${boas.length} recebimento(s) de ${t(nomeMaq)}</button></div>`;
  }
  function gravaMaq() {
    if (!podeTipo('receber')) throw new Error('Seu perfil não pode lançar contas a receber.');
    const { grupos, nomeMaq } = linhasMaq(), l = grupos.filter((g) => !g.ja && !est.fora.has(g.k)); if (!l.length) throw new Error('Nada marcado.');
    const b = db().bancos.find((x) => x.id === est.banco) || db().bancos.find((x) => x.id === bancoDaEmp(est.emp)), quando = new Date().toISOString(), cat = catOk('receber', 'Receita de vendas') || E.CAT_ENTRADA;
    l.forEach((g) => novoItem('receber', { emp: b.emp, banco: b.id, cat, c: g.liq, vence: diaDeIso(g.prev), cli: nomeMaq, desc: `Recebíveis ${nomeMaq} · ${g.n} venda(s) · bruto ${din(g.bruto)}, taxa ${din(g.taxa)}`.slice(0, 80), semRegua: true, multa: 0, juros: 0, maq: { bruto: g.bruto, taxa: g.taxa, vendas: g.n }, imp: { arquivo: est.arquivo, tipo: 'maquininha', perfil: est.perfil, ref: g.ref, quando } }));
    guardaMapa(est.assin, est.mapa);
    const tot = l.reduce((a, g) => a + g.liq, 0);
    ctx.hist(`Trouxe ${l.length} recebimento(s) de ${nomeMaq} do arquivo ${est.arquivo} (${din(tot)} líquido)`);
    est = null; irPara = '#receber';
    return `${l.length} recebimento(s) de ${nomeMaq} em A receber (${din(tot)}).`;
  }

  // ---------------------------------------------------------------- exemplos da demonstração
  function exemploNFe(tipo) {
    const e1 = db().empresas[0] || { cnpj: '28417903000162', nome: 'Empresa' }, h = hojeLocal(), num = tipo === 'pagar' ? '48213' : '12731';
    const forn = { doc: '45987321000108', nome: 'Metalúrgica Horizonte Ltda', fant: 'Metalhor' }, cli = { doc: '19283746000155', nome: 'Agropecuária Boa Safra Ltda' };
    const em = tipo === 'pagar' ? { doc: forn.doc, nome: forn.nome, fant: forn.fant } : { doc: soDig(e1.cnpj), nome: e1.nome, fant: e1.nome };
    const de = tipo === 'pagar' ? { doc: soDig(e1.cnpj), nome: e1.nome } : cli;
    const dups = tipo === 'pagar' ? [[30, '1580.40'], [60, '1580.40'], [90, '1580.42']] : [[15, '4250.00'], [45, '4250.00']];
    const total = dups.reduce((a, d) => a + Math.round(Number(d[1]) * 100), 0) / 100;
    const ch = `31${h.slice(2, 4)}${h.slice(5, 7)}${em.doc}55001${num.padStart(9, '0')}1${'7'.repeat(8)}`; const chave = ch + String(mod11Arrec(ch));
    return `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe${chave}" versao="4.00"><ide><cUF>31</cUF><natOp>${tipo === 'pagar' ? 'Venda de mercadoria' : 'Venda de produção do estabelecimento'}</natOp><mod>55</mod><serie>1</serie><nNF>${num}</nNF><dhEmi>${h}T09:12:00-03:00</dhEmi><tpNF>1</tpNF><tpAmb>1</tpAmb></ide>
<emit><CNPJ>${em.doc}</CNPJ><xNome>${em.nome}</xNome><xFant>${em.fant}</xFant></emit><dest><CNPJ>${de.doc}</CNPJ><xNome>${de.nome}</xNome><enderDest><fone>3132145500</fone></enderDest><email>financeiro@boasafra.com.br</email></dest>
<det nItem="1"><prod><xProd>Chapa de aço 3mm</xProd></prod></det><det nItem="2"><prod><xProd>Perfil U 100mm</xProd></prod></det><total><ICMSTot><vNF>${total.toFixed(2)}</vNF></ICMSTot></total>
<cobr><fat><nFat>${num}</nFat><vLiq>${total.toFixed(2)}</vLiq></fat>${dups.map((d, i) => `<dup><nDup>${String(i + 1).padStart(3, '0')}</nDup><dVenc>${somaDias(h, d[0])}</dVenc><vDup>${d[1]}</vDup></dup>`).join('')}</cobr></infNFe></NFe><protNFe><infProt><chNFe>${chave}</chNFe><cStat>100</cStat></infProt></protNFe></nfeProc>`;
  }
  function exemploPlanilha() {
    const d = (n) => N.isoDe(n).split('-').reverse().join('/');
    return [['Controle financeiro - novembro'], [], ['Vencimento', 'Fornecedor / Cliente', 'Descrição', 'Valor', 'Tipo', 'Categoria', 'Situação'],
      [d(3), 'Transportadora Rota Sul', 'Frete de outubro', '2.340,00', 'Pagar', 'Fretes e logística', 'Aberto'], [d(8), 'Cemig', 'Energia do galpão', '1.187,35', 'Pagar', 'Contas fixas', 'Aberto'],
      [d(-5), 'Papelaria Central', 'Material de escritório', '312,90', 'Pagar', 'Material e produtos', 'Pago'], [d(12), 'Supermercados Pinheiro', 'Pedido 7781', '18.600,00', 'Receber', 'Receita de vendas', 'Aberto'],
      [d(20), 'Construtora Andrade', 'Pedido 7790 · 2ª parcela', '7.450,50', 'Receber', '', 'Em aberto'], [d(15), 'Contabilidade Exata', 'Honorários', '1.900,00', 'Pagar', 'Serviços de terceiros', '']];
  }
  function exemploMaq() {
    const d = (n) => N.isoDe(n).split('-').reverse().join('/'), l = [['Data da venda', 'Hora', 'Bandeira', 'Produto', 'Nº da parcela', 'Valor bruto', 'Desconto de MDR', 'Valor líquido', 'Data de vencimento', 'Stonecode']];
    [[-1, 'Visa', 'Débito', '1/1', 189.9, 1, 1.3], [-1, 'Mastercard', 'Crédito à vista', '1/1', 420, 31, 3.1], [-2, 'Elo', 'Débito', '1/1', 76.5, 0, 1.3], [-2, 'Visa', 'Crédito à vista', '1/1', 1250, 30, 3.1], [-3, 'Mastercard', 'Crédito parcelado', '1/3', 600, 29, 3.9], [-3, 'Mastercard', 'Crédito parcelado', '2/3', 600, 59, 3.9], [-3, 'Mastercard', 'Crédito parcelado', '3/3', 600, 89, 3.9]]
      .forEach(([v, b, p, pc, valor, prazo, pct]) => { const tx = Math.round(valor * pct) / 100; l.push([d(v), '14:32', b, p, pc, valor.toFixed(2).replace('.', ','), tx.toFixed(2).replace('.', ','), (valor - tx).toFixed(2).replace('.', ','), d(v + prazo), '123456789']); });
    return l;
  }
  const exemploLinha = () => montaLinhaBanco('341', fatorDaData(N.isoDe(12)), 184730, '1090000012345671234500000');

  // ---------------------------------------------------------------- ações e eventos
  const acoes = {
    'imp-cancelar': () => { est = null; ctx.mostra(); },
    'imp-exemplo': (d) => {
      if (d.k === 'nfe') abreNotas([{ nome: 'NFe-48213-metalhor.xml', xml: exemploNFe('pagar') }, { nome: 'NFe-12731-venda.xml', xml: exemploNFe('receber') }].map((x) => ({ ...x, arq: new File([x.xml], x.nome, { type: 'application/xml' }) })));
      if (d.k === 'boleto') { linhaBoleto = exemploLinha(); ctx.mostra(); }
      if (d.k === 'planilha') abrePlanilha('planilha', 'contas-novembro.xlsx', exemploPlanilha());
      if (d.k === 'maq') abrePlanilha('maq', 'stone-recebiveis.csv', exemploMaq());
    },
    'imp-gravar': () => {
      if (!est) return;
      try { const msg = est.tipo === 'nfe' ? gravaNotas() : est.tipo === 'maq' ? gravaMaq() : gravaPlanilha(); ctx.grava(); if (location.hash === irPara) ctx.mostra(); else location.hash = irPara; ctx.aviso(msg); } catch (e) { ctx.aviso(e.message, true); }
    },
    'imp-boleto-conta': () => {
      const r = lerLinha(linhaBoleto); if (!r.ok) return ctx.aviso('Confira a linha do boleto.', true);
      if (!ctx.pode('pagar')) return ctx.aviso('Seu perfil não pode lançar contas a pagar.', true);
      const ja = db().contas.find((x) => x.boleto === r.codigo); if (ja) return ctx.aviso(`Esse boleto já está em A pagar: ${ja.desc}.`, true);
      const sugCat = r.tipo === 'arrecadacao' ? (catOk('pagar', [1, 5, 7].includes(r.seg) ? 'Impostos' : 'Contas fixas') || catPadrao('pagar')) : catPadrao('pagar');
      ctx.formFolha(`<h2>Conta a pagar do boleto</h2><p class="sub">${r.tipo === 'banco' ? `Boleto ${t(r.banco)}` : `Conta de ${t(r.segmento.toLowerCase())}`} · linha conferida. Confira e diga de quem é.</p><div class="campos-2">
        <label class="campo larga">Fornecedor e descrição<input name="desc" required maxlength="80" placeholder="${r.tipo === 'banco' ? 'Ex.: Metalhor · NF 48213' : 'Ex.: Cemig · energia de novembro'}"></label>
        ${ctx.campoValor('v', 'Valor (R$)', r.valor || '')}${ctx.campoData('vence', 'Vencimento', r.venc ? N.diaDe(r.venc) : 0)}
        ${ctx.campoBanco()}<label class="campo">Categoria<select name="cat">${opCats('pagar', sugCat)}</select></label>
        <p class="mini larga">Linha: <span class="num">${t(r.digitos)}</span></p></div><button class="bt cheio largo">Criar a conta</button>`, (f) => {
        const desc = String(f.get('desc') || '').trim(); if (!desc) throw new Error('Diga de quem é o boleto.');
        const c = ctx.valorC(f.get('v')), vence = ctx.diaC(f.get('vence')), b = db().bancos.find((x) => x.id === f.get('banco')) || db().bancos[0];
        const it = novoItem('pagar', { desc, forn: desc.split(' · ')[0], emp: b.emp, banco: b.id, cat: f.get('cat'), c, vence, boleto: r.codigo, linha: r.digitos, imp: { tipo: 'boleto', arquivo: 'linha digitável', quando: new Date().toISOString() } });
        ctx.hist(`Lançou o boleto de ${desc} (${din(c)}) pela linha digitável`); linhaBoleto = '';
        return `Conta criada em A pagar.${it.aprov?.st === 'pendente' ? ' Esperando aprovação.' : ''}`;
      });
    },
  };
  async function aoEscolher(el) {
    const arqs = [...el.files]; el.value = '';
    if (!arqs.length) return;
    if (arqs.some((a) => a.size > 8e6)) return ctx.aviso('Arquivo grande demais (máximo 8 MB).', true);
    try {
      if (el.id === 'imp-arq-nfe') {
        if (arqs.length > 60) return ctx.aviso('Escolha até 60 XML de uma vez.', true);
        abreNotas(await Promise.all(arqs.map(async (a) => ({ nome: a.name, arq: a, xml: textoDe(await a.arrayBuffer()) }))));
      } else abrePlanilha(el.id === 'imp-arq-maq' ? 'maq' : 'planilha', arqs[0].name, await lerPlanilha(arqs[0]));
    } catch (e) { ctx.aviso(e.message, true); }
  }
  document.addEventListener('change', (e) => {
    const el = e.target; if (!(el instanceof HTMLElement)) return;
    if (/^imp-arq-/.test(el.id)) { aoEscolher(el); return; }
    if (!est) return;
    const ds = el.dataset;
    if ('impNota' in ds) { est.notas[Number(ds.impNota)].incluir = el.checked; ctx.mostra(); }
    else if ('impTipo' in ds) { const n = est.notas[Number(ds.impTipo)]; n.tipo = el.value; n.cat = ''; ctx.mostra(); }
    else if ('impEmp' in ds) { est.notas[Number(ds.impEmp)].emp = el.value; }
    else if ('impCat' in ds) { est.notas[Number(ds.impCat)].cat = el.value; }
    else if ('impVenc' in ds) { const [i, j] = ds.impVenc.split(':').map(Number); est.notas[i].parcs[j].venc = el.value; }
    else if ('impMapa' in ds) { est.mapa[ds.impMapa] = Number(el.value); est.lembrado = false; est.fora.clear(); ctx.mostra(); }
    else if ('impPadrao' in ds) { est.padrao = el.value; ctx.mostra(); }
    else if ('impEmpg' in ds) { est.emp = el.value; est.banco = bancoDaEmp(el.value); ctx.mostra(); }
    else if ('impBanco' in ds) { est.banco = el.value; }
    else if ('impPerfil' in ds) { est.perfil = el.value; ctx.mostra(); }
    else if ('impAgrupar' in ds) { est.agrupar = el.checked; est.fora.clear(); ctx.mostra(); }
    else if ('impLinha' in ds) { const k = Number(ds.impLinha); if (el.checked) est.fora.delete(k); else est.fora.add(k); ctx.mostra(); }
    else if ('impTodas' in ds) { document.querySelectorAll('[data-imp-linha]').forEach((c) => { const k = Number(c.dataset.impLinha); if (el.checked) est.fora.delete(k); else est.fora.add(k); }); ctx.mostra(); }
  });
  document.addEventListener('input', (e) => { if (e.target.id !== 'imp-linha') return; linhaBoleto = e.target.value; const box = document.getElementById('imp-boleto-res'); if (box) box.innerHTML = boletoHtml(); });

  return {
    acoes,
    tela() { if (!est) return inicio(); return est.tipo === 'nfe' ? telaNotas() : est.tipo === 'maq' ? telaMaq() : telaPlanilha(); },
    limpar: () => { est = null; },
  };
}
