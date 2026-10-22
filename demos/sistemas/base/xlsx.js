// =============================================================
// Veltria · gerar planilha do Excel (.xlsx) no navegador
// -------------------------------------------------------------
// O .xlsx é um zip com XML: montamos os arquivos e o zip aqui mesmo,
// sem biblioteca. Cada aba tem cabeçalho em negrito, filtro, primeira
// linha fixa e largura das colunas ajustada. Valores:
//   número       → número (com 2 casas se tiver centavos)
//   'AAAA-MM-DD' → data de verdade (o Excel ordena e filtra)
//   { v, t: 'moeda' | 'data' | 'texto' | 'num' } → força o formato
// =============================================================

const xml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const serial = (iso) => { const [a, m, d] = iso.split('-').map(Number); return (Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5; };
const colNome = (i) => { let s = ''; for (i += 1; i; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
// estilos: 0 normal · 1 cabeçalho · 2 moeda (#.##0,00) · 3 data · 4 inteiro (#.##0)
function celula(v, ref) {
  let t = null;
  if (v && typeof v === 'object' && 'v' in v) { t = v.t; v = v.v; }
  if (v == null || v === '') return '';
  if (t === 'texto') return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
  if ((t === 'data' || (!t && typeof v === 'string' && ISO.test(v))) && ISO.test(String(v).slice(0, 10))) return `<c r="${ref}" s="3"><v>${serial(String(v).slice(0, 10))}</v></c>`;
  if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}" s="${t === 'moeda' || (!t && !Number.isInteger(v)) ? 2 : t === 'num' || Math.abs(v) >= 1000 ? 4 : 0}"><v>${v}</v></c>`;
  if (typeof v === 'boolean') return `<c r="${ref}" t="inlineStr"><is><t>${v ? 'Sim' : 'Não'}</t></is></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
}
function aba(linhas) {
  const larg = [];
  linhas.forEach((l) => l.forEach((v, i) => { const x = v && typeof v === 'object' && 'v' in v ? v.v : v; larg[i] = Math.min(60, Math.max(larg[i] || 8, String(typeof x === 'number' ? x.toFixed(2) : x ?? '').length + 2)); }));
  const cols = larg.length ? `<cols>${larg.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  const corpo = linhas.map((l, r) => `<row r="${r + 1}">${l.map((v, c) => (r === 0 ? `<c r="${colNome(c)}1" t="inlineStr" s="1"><is><t xml:space="preserve">${xml(v && typeof v === 'object' ? v.v : v)}</t></is></c>` : celula(v, `${colNome(c)}${r + 1}`))).join('')}</row>`).join('');
  const ult = `${colNome(Math.max(0, (linhas[0] || []).length - 1))}${Math.max(1, linhas.length)}`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0">${linhas.length > 1 ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' : ''}</sheetView></sheetViews>${cols}<sheetData>${corpo}</sheetData>${linhas.length > 1 ? `<autoFilter ref="A1:${ult}"/>` : ''}</worksheet>`;
}
const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F3A68"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

// ---------------------------------------------------------------- zip sem compressão (método "store")
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zip(arquivos) {
  const enc = new TextEncoder(), partes = [], central = []; let pos = 0;
  for (const [nome, texto] of arquivos) {
    const n = enc.encode(nome), d = enc.encode(texto), crc = crc32(d);
    const loc = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, 0, 2], [12, 0x21, 2], [14, crc, 4], [18, d.length, 4], [22, d.length, 4], [26, n.length, 2], [28, 0, 2]].forEach(([o, v, t]) => (t === 4 ? loc.setUint32(o, v, true) : loc.setUint16(o, v, true)));
    const cen = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, 0, 2], [14, 0x21, 2], [16, crc, 4], [20, d.length, 4], [24, d.length, 4], [28, n.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, pos, 4]].forEach(([o, v, t]) => (t === 4 ? cen.setUint32(o, v, true) : cen.setUint16(o, v, true)));
    partes.push(new Uint8Array(loc.buffer), n, d); central.push(new Uint8Array(cen.buffer), n);
    pos += 30 + n.length + d.length;
  }
  const tamC = central.reduce((s, x) => s + x.length, 0), fim = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, arquivos.length, 2], [10, arquivos.length, 2], [12, tamC, 4], [16, pos, 4], [20, 0, 2]].forEach(([o, v, t]) => (t === 4 ? fim.setUint32(o, v, true) : fim.setUint16(o, v, true)));
  return new Blob([...partes, ...central, new Uint8Array(fim.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** abas: [{ nome, linhas: [[cabeçalho...], [valores...], ...] }] → Blob .xlsx */
export function gerarXlsx(abas) {
  const usados = new Set();
  const nomes = abas.map((a, i) => { let n = String(a.nome || `Planilha ${i + 1}`).replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || `Planilha ${i + 1}`; while (usados.has(n.toLowerCase())) n = `${n.slice(0, 28)} ${i + 1}`; usados.add(n.toLowerCase()); return n; });
  return zip([
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nomes.map((n, i) => `<sheet name="${xml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${abas.map((a, i) => (a.linhas.length > 1 ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xml(nomes[i]).replace(/'/g, "''")}'!$A$1:$${colNome(Math.max(0, a.linhas[0].length - 1))}$${a.linhas.length}</definedName></definedNames>` : '')).join('').replace(/<\/definedNames><definedNames>/g, '')}</workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', ESTILOS],
    ...abas.map((a, i) => [`xl/worksheets/sheet${i + 1}.xml`, aba(a.linhas)]),
  ]);
}
export function baixarXlsx(nome, abas) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(gerarXlsx(abas)); a.download = /\.xlsx$/i.test(nome) ? nome : `${nome}.xlsx`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
