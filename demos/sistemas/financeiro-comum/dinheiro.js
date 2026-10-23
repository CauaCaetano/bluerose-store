// Veltria Financeiro · peças comuns às três versões do Financeiro (e só a elas): dinheiro em centavos,
// datas relativas a hoje e leitura de extrato bancário (OFX e CSV). Sem tela. Testes: tools/testes-financeiro/.

/** Converte texto ou número em centavos. "1.234,56" → 123456; "10,01" → 1001; 10.01 → 1001; "-5" → -500. */
export function centavos(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) : NaN;
  let s = String(v ?? '').trim().replace(/\s|R\$/g, '');
  if (!s) return NaN;
  const neg = /^-|^\(.*\)$|-$/.test(s); s = s.replace(/[-()]/g, '');
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',') && !s.includes('.')) return NaN; // vírgula é a casa decimal: "10,005" ou "12,3456" é erro de digitação, não milhar
  else if (/\.\d{3}(\.|$)/.test(s) && !/\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '');
  else s = s.replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  const [i, d = ''] = s.split('.');
  const c = Number(i) * 100 + Number((d + '00').slice(0, 2));
  return neg ? -c : c;
}
export const reais = (c) => (Number(c || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });


// datas: dia relativo a hoje (dia: -3 = três dias atrás)
export const DIA_MS = 864e5;
export const hojeISO = (agora = new Date()) => new Date(agora.getTime() - agora.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
export const dataDe = (dia, agora = new Date()) => { const d = new Date(agora); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + dia); return d; };
export const isoDe = (dia, agora) => hojeISO(dataDe(dia, agora));
/** "2026-10-15" ou "15/10/2026" → dias a partir de hoje (negativo = passado). */
export function diaDe(texto, agora = new Date()) {
  const s = String(texto || '').trim(); let a, m, d;
  let x = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (x) [, a, m, d] = x;
  else if ((x = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))) { [, d, m, a] = x; if (a.length === 2) a = '20' + a; }
  else if ((x = s.match(/^(\d{4})(\d{2})(\d{2})/))) [, a, m, d] = x; // OFX: 20261015...
  else return NaN;
  const alvo = new Date(Number(a), Number(m) - 1, Number(d), 12), h = new Date(agora); h.setHours(12, 0, 0, 0);
  if (alvo.getMonth() !== Number(m) - 1) return NaN;
  return Math.round((alvo - h) / DIA_MS);
}
export const compDe = (dia, agora) => isoDe(dia, agora).slice(0, 7); // competência: "2026-10"

// ------------------------------------------------------------------ leitura de extrato (OFX ou CSV), linha a linha com o motivo do erro
export const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export function lerExtrato(texto, nomeArquivo = '', agora = new Date()) {
  const t = String(texto || '').replace(/^﻿/, '');
  return /<OFX>|<STMTTRN>/i.test(t) || /\.ofx$/i.test(nomeArquivo) ? lerOFX(t, agora) : lerCSV(t, agora);
}
function lerOFX(t, agora) {
  const linhas = [], erros = [];
  (t.match(/<STMTTRN>[\s\S]*?(<\/STMTTRN>|(?=<STMTTRN>)|$)/gi) || []).forEach((b, i) => {
    const campo = (n) => (b.match(new RegExp(`<${n}>([^<\\r\\n]*)`, 'i')) || [])[1]?.trim() || '';
    const c = centavos(campo('TRNAMT')), dia = diaDe(campo('DTPOSTED'), agora), desc = campo('MEMO') || campo('NAME');
    if (!Number.isFinite(c) || !c || !Number.isFinite(dia)) erros.push({ linha: i + 1, motivo: 'valor ou data ilegível' });
    else linhas.push({ c: Math.abs(c), tipo: c > 0 ? 'entra' : 'sai', dia, desc, ref: campo('FITID') });
  });
  if (!linhas.length && !erros.length) erros.push({ linha: 0, motivo: 'Nenhum lançamento encontrado no arquivo OFX.' });
  return { linhas, erros };
}
function lerCSV(t, agora) {
  const rows = t.split(/\r?\n/).filter((l) => l.trim());
  if (rows.length < 2) return { linhas: [], erros: [{ linha: 0, motivo: 'O arquivo não tem linhas suficientes (precisa de um cabeçalho e lançamentos).' }] };
  const sep = (rows[0].match(/;/g) || []).length >= (rows[0].match(/,/g) || []).length ? ';' : ',';
  const quebra = (l) => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map((x) => x.trim()); };
  const cab = quebra(rows[0]).map(norm), acha = (...n) => cab.findIndex((h) => n.some((x) => h === x || h.includes(x)));
  const iData = acha('data', 'date', 'dia'), iDesc = acha('descricao', 'historico', 'lancamento', 'memo', 'description'), iValor = acha('valor', 'amount', 'quantia'), iEnt = acha('entrada', 'credito'), iSai = acha('saida', 'debito');
  if (iData < 0 || (iValor < 0 && iEnt < 0 && iSai < 0)) return { linhas: [], erros: [{ linha: 1, motivo: 'Não achei as colunas de data e valor. O cabeçalho precisa ter "Data" e "Valor" (ou "Entrada" e "Saída").' }] };
  const linhas = [], erros = [];
  rows.slice(1).forEach((r, i) => {
    const x = quebra(r), dia = diaDe(x[iData], agora);
    let c = iValor >= 0 ? centavos(x[iValor]) : NaN;
    if (!Number.isFinite(c)) { const e = iEnt >= 0 ? centavos(x[iEnt]) : NaN, s = iSai >= 0 ? centavos(x[iSai]) : NaN; c = Number.isFinite(e) && e ? Math.abs(e) : Number.isFinite(s) && s ? -Math.abs(s) : NaN; }
    if (!Number.isFinite(dia)) return erros.push({ linha: i + 2, motivo: `data ilegível: "${x[iData] || ''}"` });
    if (!Number.isFinite(c) || !c) return erros.push({ linha: i + 2, motivo: `valor ilegível: "${(iValor >= 0 ? x[iValor] : x[iEnt] || x[iSai]) || ''}"` });
    if (dia > 0) return erros.push({ linha: i + 2, motivo: 'data no futuro (extrato só tem o que já aconteceu)' });
    linhas.push({ c: Math.abs(c), tipo: c > 0 ? 'entra' : 'sai', dia, desc: (iDesc >= 0 ? x[iDesc] : '') || (c > 0 ? 'Entrada' : 'Saída') });
  });
  return { linhas, erros };
}

// ------------------------------------------------------------------ boleto: lê a linha digitável e confere os dígitos
const mod10 = (s) => { let soma = 0; [...s].reverse().forEach((d, i) => { let x = Number(d) * (i % 2 === 0 ? 2 : 1); if (x > 9) x -= 9; soma += x; }); return (10 - (soma % 10)) % 10; };
const mod11 = (s, arrecadacao) => { let soma = 0, p = 2; [...s].reverse().forEach((d) => { soma += Number(d) * p; p = p === 9 ? 2 : p + 1; }); const r = soma % 11; if (arrecadacao) return r === 0 || r === 1 ? 0 : 11 - r; const dv = 11 - r; return dv === 0 || dv === 10 || dv === 11 ? 1 : dv; };
/** Vencimento pelo fator: a contagem recomeçou em 1000 no dia 22/02/2025; vale o ciclo mais perto de hoje. */
function vencimentoDoFator(fator, agora) {
  if (!fator) return null;
  const velho = new Date(1997, 9, 7, 12), novo = new Date(2025, 1, 22, 12);
  const a = new Date(velho.getTime() + fator * DIA_MS), b = fator >= 1000 ? new Date(novo.getTime() + (fator - 1000) * DIA_MS) : null;
  const h = new Date(agora); h.setHours(12, 0, 0, 0);
  const d = b && Math.abs(b - h) < Math.abs(a - h) ? b : a;
  return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12) - h) / DIA_MS);
}
/**
 * Linha digitável de boleto bancário (47 números) ou de conta de consumo/tributo (48 números).
 * Devolve { tipo, c (centavos), vence (dia relativo ou null), banco } ou lança erro com o motivo.
 */
export function lerBoleto(linha, agora = new Date()) {
  const s = String(linha || '').replace(/\D/g, '');
  if (s.length === 47) {
    const campos = [[s.slice(0, 9), s[9]], [s.slice(10, 20), s[20]], [s.slice(21, 31), s[31]]];
    campos.forEach(([c, dv], i) => { if (mod10(c) !== Number(dv)) throw new Error(`O ${i + 1}º bloco da linha digitável tem um número errado. Confira a digitação.`); });
    const barras = s.slice(0, 4) + s[32] + s.slice(33, 47) + s.slice(4, 9) + s.slice(10, 20) + s.slice(21, 31);
    if (mod11(barras.slice(0, 4) + barras.slice(5)) !== Number(barras[4])) throw new Error('O dígito verificador geral não confere. Confira a digitação.');
    return { tipo: 'boleto', banco: s.slice(0, 3), c: Number(s.slice(37, 47)), vence: vencimentoDoFator(Number(s.slice(33, 37)), agora), barras };
  }
  if (s.length === 48) {
    if (s[0] !== '8') throw new Error('Linha de 48 números precisa começar com 8 (conta de consumo ou tributo).');
    const ref = s[2]; if (!'6789'.includes(ref)) throw new Error('Código de conta de consumo inválido.');
    const usa10 = ref === '6' || ref === '7', blocos = [0, 1, 2, 3].map((i) => [s.slice(i * 12, i * 12 + 11), s[i * 12 + 11]]);
    blocos.forEach(([b, dv], i) => { if ((usa10 ? mod10(b) : mod11(b, true)) !== Number(dv)) throw new Error(`O ${i + 1}º bloco da linha tem um número errado. Confira a digitação.`); });
    const barras = blocos.map(([b]) => b).join('');
    return { tipo: 'consumo', banco: '', c: ref === '6' || ref === '8' ? Number(barras.slice(4, 15)) : 0, vence: null, barras };
  }
  throw new Error(`A linha digitável tem ${s.length} números; boleto tem 47 e conta de consumo tem 48.`);
}
export const _dv = { mod10, mod11 }; // para os testes montarem linhas válidas

/** CPF ou CNPJ válido pelos dígitos verificadores (sequências repetidas são recusadas). */
export function docValido(doc) {
  const d = String(doc || '').replace(/\D/g, '');
  if (d.length === 11 && !/^(\d)\1+$/.test(d)) { const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; }; return dv(9) === Number(d[9]) && dv(10) === Number(d[10]); }
  if (d.length === 14 && !/^(\d)\1+$/.test(d)) { const dv = (n) => { const p = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], r = p.reduce((a, w, i) => a + w * Number(d[i]), 0) % 11; return r < 2 ? 0 : 11 - r; }; return dv(12) === Number(d[12]) && dv(13) === Number(d[13]); }
  return false;
}
