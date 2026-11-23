// Popina · balança pelo cabo (22/11/2026, banca 3). Web Serial API: só no computador, com Chrome ou Edge (não existe no
// celular, no iPhone nem no Firefox). A balança de balcão comum no Brasil fala por RS-232 (ou USB que vira porta COM):
//   Toledo Prix 3 Fit/Prix 4 (protocolos Prt1/Prt3/Prt5 e P03), Filizola, Elgin (DP/SA, lê como Filizola ou Toledo B),
//   Urano (US POP, UDC). O Popina manda ENQ (0x05) e lê a resposta até ETX (0x03) ou CR (0x0D); também entende a balança
//   que manda o peso sozinha, sem pedir (modo contínuo).
// Formatos aceitos (interpretarPeso): STX 00450 ETX (5 dígitos = gramas, 2 inteiros e 3 decimais), STX 000450 CR (6 dígitos),
//   P03 da Toledo (STX SWA SWB SWC peso tara CR), texto com vírgula ou ponto ("0,450", "PESO L: 0,450 kg"), e os avisos
//   IIIII (instável, ainda mexendo), NNNNN (negativo) e SSSSS (passou do máximo).
// Nada vai para a nuvem: a escolha da porta e a velocidade ficam só neste computador (localStorage popina-balanca), porque
// a balança está ligada nele. Sem balança, o peso continua sendo digitado como antes.
// Demonstração: "Testar com a balança simulada" responde um peso de exemplo (o mesmo caminho do cabo, sem porta).
import { CONTA } from './loja.js?v=61';

const CHAVE = 'popina-balanca';
const lerCfg = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || '{}') || {}; } catch { return {}; } };
const gravarCfg = (p) => { try { localStorage.setItem(CHAVE, JSON.stringify({ ...lerCfg(), ...p })); } catch { /* nada */ } };
export const balancaCfg = () => ({ baud: 9600, bits: 8, paridade: 'none', ...lerCfg() });
export const setBalancaCfg = gravarCfg;
export const temSerial = () => typeof navigator !== 'undefined' && 'serial' in navigator;
export const VELOCIDADES = [9600, 4800, 2400, 19200, 115200];

let porta = null, buf = '', lendo = false, simulada = false;
export const balancaLigada = () => simulada || !!(porta && porta.readable);
export const balancaSimulada = () => simulada;

// ------------------------------------------------------------------ ler a resposta (puro: dá para testar sem balança)
const STX = '\x02', ETX = '\x03', CR = '\r';
export function interpretarPeso(bruto) {
  const s = String(bruto || '');
  if (!s.trim()) return { erro: 'sem-resposta' };
  // o último quadro completo: entre STX e ETX/CR; sem STX, a última linha
  let q = '';
  const ini = s.lastIndexOf(STX, s.length - 2);
  if (ini >= 0) { const resto = s.slice(ini + 1), fim = resto.search(/[\x03\r\n]/); q = fim >= 0 ? resto.slice(0, fim) : resto; }
  else q = s.split(/[\x03\r\n]+/).map((x) => x.trim()).filter(Boolean).pop() || '';
  if (/I{3,}/.test(q)) return { erro: 'instavel' };
  if (/N{3,}/.test(q)) return { erro: 'negativo' };
  if (/S{3,}/.test(q)) return { erro: 'sobrecarga' };
  // Toledo P03: 3 bytes de estado + 6 dígitos de peso + 6 de tara
  const p03 = /^([\x20-\x7f])([\x20-\x7f])([\x20-\x7f])(\d{6})(\d{6})/.exec(q);
  if (p03) {
    const a = p03[1].charCodeAt(0), b = p03[2].charCodeAt(0), casas = (a & 7) >= 2 ? (a & 7) - 2 : 3; // bits 0-2 do SWA: 2 = sem casa, 5 = 3 casas (não testado em aparelho)
    if (b & 0x08) return { erro: 'instavel' };
    if (b & 0x02) return { erro: 'negativo' };
    return valido(Number(p03[4]) / 10 ** casas, 'Toledo P03');
  }
  const limpo = q.replace(/[^\d.,\-]/g, ' ').trim().split(/\s+/).filter((x) => /\d/.test(x));
  const n = limpo.pop(); if (!n) return { erro: 'ilegivel' };
  if (/^-/.test(n)) return { erro: 'negativo' };
  if (/[.,]/.test(n)) { const kg = Number(n.replace(',', '.')); const g = /\bg\b/i.test(q) && !/kg/i.test(q); return valido(g ? kg / 1000 : kg, 'texto'); }
  if (/^\d{5,6}$/.test(n)) return valido(Number(n) / 1000, n.length === 5 ? 'Toledo/Filizola' : '6 dígitos');
  if (/^\d{1,5}$/.test(n) && /\d\s*g\b/i.test(q)) return valido(Number(n) / 1000, 'gramas');
  return { erro: 'ilegivel' };
}
const valido = (kg, protocolo) => (kg > 0 && kg < 30 ? { kg: Math.round(kg * 1000) / 1000, protocolo } : kg === 0 ? { erro: 'zero' } : { erro: 'fora' });
export const MSG = { instavel: 'O peso ainda está mexendo. Espere parar e leia de novo.', negativo: 'A balança está negativa: tire o prato e zere (tara).', sobrecarga: 'Passou do peso máximo da balança.',
  zero: 'A balança está em zero: ponha o prato.', fora: 'O peso lido não parece certo. Digite o peso.', ilegivel: 'Não entendi a resposta da balança. Confira a velocidade em Configurações › Balança.',
  'sem-resposta': 'A balança não respondeu. Confira o cabo e a velocidade em Configurações › Balança.', 'sem-balanca': 'Conecte a balança em Configurações › Balança.' };

// ------------------------------------------------------------------ porta serial
async function abrir() {
  const c = balancaCfg();
  try { await porta.open({ baudRate: Number(c.baud) || 9600, dataBits: Number(c.bits) === 7 ? 7 : 8, parity: ['even', 'odd'].includes(c.paridade) ? c.paridade : 'none', stopBits: 1, flowControl: 'none' }); }
  catch (e) { if (!/already open|já/i.test(String(e?.message || ''))) throw e; }
  ler();
}
// lê sem parar para um acumulador (assim serve tanto para "pergunta e responde" quanto para a balança que manda sozinha)
async function ler() {
  if (lendo) return; lendo = true;
  try {
    while (porta && porta.readable) {
      const r = porta.readable.getReader(); let fim = false;
      try { for (;;) { const { value, done } = await r.read(); if (done) { fim = true; break; } if (value) { buf += String.fromCharCode(...value); if (buf.length > 512) buf = buf.slice(-512); } } }
      catch { fim = true; } finally { try { r.releaseLock(); } catch { /* nada */ } }
      if (fim) break;
    }
  } finally { lendo = false; }
}
export async function conectarBalanca() {
  if (!temSerial()) throw new Error('Este navegador não fala com a balança. Use o Chrome ou o Edge no computador.');
  simulada = false; gravarCfg({ sim: false });
  porta = await navigator.serial.requestPort();
  await abrir(); gravarCfg({ ligada: true });
  return true;
}
// ao abrir o sistema: volta a usar a porta que a pessoa já autorizou neste computador (sem perguntar de novo)
export async function reconectarBalanca() {
  if (!CONTA && lerCfg().sim) { simulada = true; return true; }
  if (!temSerial() || !lerCfg().ligada) return false;
  try { const ps = await navigator.serial.getPorts(); if (!ps.length) return false; porta = ps[0]; await abrir(); return true; } catch { porta = null; return false; }
}
export async function desconectarBalanca() {
  simulada = false; gravarCfg({ ligada: false, sim: false });
  const p = porta; porta = null;
  try { await p?.readable?.cancel?.(); } catch { /* nada */ }
  try { await p?.close?.(); } catch { /* nada */ }
}
export async function trocarVelocidade(baud) {
  gravarCfg({ baud: Number(baud) || 9600 });
  if (!porta) return;
  const p = porta; porta = null;
  try { await p.readable?.cancel?.(); } catch { /* nada */ }
  try { await p.close(); } catch { /* nada */ }
  porta = p; await abrir();
}
// demonstração: sem cabo, responde como uma Toledo Prix (STX 00450 ETX) com um peso de exemplo
export function usarSimulada(on = true) { if (CONTA) return; simulada = on; gravarCfg({ sim: on }); }
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function perguntar(ms = 900) {
  if (simulada) { await espera(350); const g = 280 + Math.round(Math.random() * 520); return `${STX}${String(g).padStart(5, '0')}${ETX}`; }
  buf = '';
  try { const w = porta.writable.getWriter(); await w.write(new Uint8Array([0x05])); w.releaseLock(); } catch { /* a balança contínua não precisa do ENQ */ }
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { await espera(40); if (/[\x02][^\x02]*[\x03\r]/.test(buf) || (!buf.includes(STX) && /\r|\n/.test(buf))) break; }
  return buf;
}
// lê o peso: tenta algumas vezes enquanto estiver "mexendo"
export async function lerPeso({ tentativas = 5 } = {}) {
  if (!balancaLigada()) return { erro: 'sem-balanca' };
  let r = { erro: 'sem-resposta' };
  for (let k = 0; k < tentativas; k++) {
    r = interpretarPeso(await perguntar());
    if (r.kg || !['instavel', 'sem-resposta'].includes(r.erro)) return r;
    await espera(300);
  }
  return r;
}
