// =============================================================
// Veltria · PIX copia e cola (BR Code estático do Banco Central)
// -------------------------------------------------------------
// Monta o texto do "PIX copia e cola" a partir da chave da empresa.
// O mesmo texto vira o QR code (base/qr.js). Não passa por banco
// nenhum: o cliente paga direto para a chave da empresa.
// =============================================================
const tira = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 .\-/@+]/g, '').trim();
const campo = (id, v) => `${id}${String(v.length).padStart(2, '0')}${v}`;

function crc16(s) {
  let c = 0xffff;
  for (let i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i) << 8;
    for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  }
  return c.toString(16).toUpperCase().padStart(4, '0');
}

/** Normaliza a chave: CPF/CNPJ só dígitos, telefone com +55, e-mail e chave aleatória como estão. */
export function chavePix(chave) {
  const k = String(chave || '').trim();
  if (/@/.test(k)) return k.toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) return k.toLowerCase();
  const d = k.replace(/\D/g, '');
  if (/^\+/.test(k)) return `+${d}`;
  if (d.length === 11 && /^\(?\d{2}\)?\s?9/.test(k)) return `+55${d}`; // celular escrito com DDD
  return d;
}

/** Texto do PIX copia e cola. valor em reais (opcional), txid até 25 letras/números. */
export function pixCopiaECola({ chave, nome, cidade = 'BRASIL', valor = null, txid = '***', descricao = '' }) {
  const k = chavePix(chave);
  if (!k) return '';
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', k) + (descricao ? campo('02', tira(descricao).slice(0, 40)) : '');
  const tx = String(txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  let s = campo('00', '01') + campo('26', conta) + campo('52', '0000') + campo('53', '986')
    + (valor ? campo('54', Number(valor).toFixed(2)) : '') + campo('58', 'BR')
    + campo('59', (tira(nome).toUpperCase() || 'RECEBEDOR').slice(0, 25)) + campo('60', (tira(cidade).toUpperCase() || 'BRASIL').slice(0, 15))
    + campo('62', campo('05', tx === '***' ? '***' : tx)) + '6304';
  return s + crc16(s);
}
