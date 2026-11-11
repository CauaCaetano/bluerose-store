// Atria · Pix copia e cola (BR Code estático, padrão EMV do Banco Central) feito aqui, sem serviço externo.
// O cliente paga direto para a chave do profissional: o app não intermedia nem confere o banco.
// Testado em tools: atria_pix_teste.mjs (exemplo do manual do Banco Central, CRC 1D3D).

const campo = (id, v) => `${id}${String(v.length).padStart(2, '0')}${v}`;
// só caracteres que todo banco aceita no nome e na cidade
const limpa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 .\-/@+*]/g, '').replace(/\s+/g, ' ').trim();

export function crc16(s) {
  let c = 0xffff;
  for (let i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i) << 8;
    for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  }
  return c.toString(16).toUpperCase().padStart(4, '0');
}

export const TIPOS_CHAVE = { cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', tel: 'Telefone', aleatoria: 'Chave aleatória' };

// devolve { chave, erro } já no formato que o Pix pede
export function normalizaChave(tipo, valor) {
  const v = String(valor || '').trim(), d = v.replace(/\D/g, '');
  if (tipo === 'cpf') return d.length === 11 ? { chave: d } : { erro: 'O CPF tem 11 números.' };
  if (tipo === 'cnpj') return d.length === 14 ? { chave: d } : { erro: 'O CNPJ tem 14 números.' };
  if (tipo === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? { chave: v.toLowerCase() } : { erro: 'Confira o e-mail.' };
  if (tipo === 'tel') { const n = d.startsWith('55') && d.length >= 12 ? d : `55${d}`; return n.length === 12 || n.length === 13 ? { chave: `+${n}` } : { erro: 'Escreva o celular com DDD.' }; }
  if (tipo === 'aleatoria') return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? { chave: v.toLowerCase() } : { erro: 'A chave aleatória tem 32 letras e números com 4 traços.' };
  return { erro: 'Escolha o tipo da chave.' };
}

/**
 * Texto do Pix copia e cola.
 * chave já normalizada; nome do recebedor (até 25); cidade (até 15); valor em centavos (opcional);
 * txid: identificador da cobrança (até 25 letras e números; '***' quando não houver).
 */
export function pixPayload({ chave, nome, cidade, centavos = 0, txid = '***', info = '' }) {
  if (!chave) return '';
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', chave) + (info ? campo('02', limpa(info).slice(0, 40)) : '');
  const tx = (String(txid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25)) || '***';
  const s = campo('00', '01') + campo('26', conta) + campo('52', '0000') + campo('53', '986')
    + (centavos > 0 ? campo('54', (Math.round(centavos) / 100).toFixed(2)) : '') + campo('58', 'BR')
    + campo('59', (limpa(nome) || 'RECEBEDOR').slice(0, 25).trim()) + campo('60', (limpa(cidade) || 'BRASIL').slice(0, 15).trim())
    + campo('62', campo('05', tx)) + '6304';
  return s + crc16(s);
}

// confere um copia e cola qualquer (tamanhos dos campos e CRC)
export function pixValido(p) {
  if (!/6304[0-9A-F]{4}$/.test(p)) return false;
  return crc16(p.slice(0, -4)) === p.slice(-4);
}
