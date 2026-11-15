// Popina · Pix copia e cola (BR Code estático, padrão EMV do Banco Central), gerado aqui mesmo.
// O cliente paga direto na chave do restaurante; o sistema não intermedia o dinheiro.
const campo = (id, v) => `${id}${String(v.length).padStart(2, '0')}${v}`;
const limpa = (s, n) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 .\-/]/g, '').replace(/\s+/g, ' ').trim().slice(0, n).toUpperCase();

export function crc16(s) {
  let c = 0xffff;
  for (let i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i) << 8;
    for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  }
  return c.toString(16).toUpperCase().padStart(4, '0');
}
// valor em reais (0 = o cliente digita); txid só letras e números (até 25)
export function pix({ chave, nome, cidade, valor = 0, txid = '***' }) {
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', chave);
  let s = campo('00', '01') + campo('26', conta) + campo('52', '0000') + campo('53', '986');
  if (valor > 0) s += campo('54', (Math.round(valor * 100) / 100).toFixed(2));
  s += campo('58', 'BR') + campo('59', limpa(nome, 25) || 'RESTAURANTE') + campo('60', limpa(cidade, 15) || 'BRASIL');
  s += campo('62', campo('05', String(txid).replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***'));
  s += '6304';
  return s + crc16(s);
}
