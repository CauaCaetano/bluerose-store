// Popina · Nota fiscal (NFC-e modelo 65, São Paulo) — 22/11/2026
// "Como você emite nota hoje?" (db.config.nf.modo):
//   api      → a conta do próprio restaurante num emissor (Brasil NFe ou Focus NFe). O token vai para a função popina-nfce
//              (guardado cifrado no servidor); certificado A1 e CSC ficam no painel do emissor dele.
//   outro    → emite no PDV dele ou pelo contador: a venda ganha "Nota emitida em outro sistema" (número opcional)
//              e há exportação das vendas (CSV e XML simples) para lançar no emissor ou mandar ao contador.
//   bluerose → adicional pago com a conta da Blue Rose (a função cadastra o emitente e repassa o certificado). Em breve.
//   nao      → não emite (ex.: MEI): nada aparece.
// Na demonstração tudo é simulado (nota de exemplo, ambiente de teste). Só acrescenta campos: db.config.nf,
// produto.fiscal e venda.nfce / venda.nfOutro. Nenhum token, certificado ou senha fica no navegador.
import { db, t, din, r2, soDig, grava, CONTA, prod, ativos, pagamentosVenda, quemAgora, auditar, FORMA_FIADO, inicioDoDia, ymd } from './loja.js?v=57';
import { ico, folha, toast, confirma, autorizar, $, $$ } from './ui.js?v=57';
import { abrirImpressao } from './imprimir.js?v=57';
import { qrSVG } from '../base/qr.js';
import { acao } from './nucleo.js?v=57';

// ------------------------------------------------------------------ configuração
export const nf = () => db.config.nf || {};
export function setNf(p) { db.config.nf = { ...nf(), ...p }; grava(); }
export const modoNf = () => nf().modo || '';
export const emite = () => ['api', 'bluerose'].includes(modoNf()); // o Popina emite a NFC-e
const simples = () => [1, 2, 4].includes(Number(nf().emitente?.crt || 1));
const PROVEDORES = { brasilnfe: { nome: 'Brasil NFe', onde: 'No painel da Brasil NFe: Empresas › a sua empresa › Token da empresa.' }, focus: { nome: 'Focus NFe', onde: 'No painel da Focus NFe: Minhas empresas › a sua empresa › Tokens (use o de homologação para testar).' } };
const MODOS = [
  ['api', 'Tenho conta numa API de nota', 'Brasil NFe, Focus NFe... Você cola o token da sua conta e a nota sai por ela.'],
  ['outro', 'Emito no meu sistema/PDV ou pelo contador', 'O Popina não emite: você marca a nota na venda e exporta as vendas.'],
  ['bluerose', 'Quero que a Blue Rose emita', 'Adicional Nota fiscal: a gente cuida da conta do emissor para você.'],
  ['nao', 'Não emito (ex.: MEI)', 'Nada de nota aparece no caixa.'],
];
let servidor = null; // status vindo da função (conectado, provedor, ambiente, bluerose_disponivel, adicional)
const chamar = (body) => (CONTA && window.popinaNfce ? window.popinaNfce(body) : Promise.resolve({ ok: false, mensagem: 'Entre na conta para usar a nota fiscal.' }));
export function lerStatus() {
  if (!CONTA) { servidor = { conectado: !!nf().conectadoDemo, provedor: nf().provedor || null, ambiente: 'homologacao', bluerose_disponivel: false, adicional: false, demo: true }; return Promise.resolve(servidor); }
  return chamar({ acao: 'status' }).then((s) => { servidor = s || {}; return servidor; }).catch(() => (servidor = {}));
}

// ------------------------------------------------------------------ cadastro fiscal mínimo do produto (padrões para lanchonete)
// Sugestões comuns no Simples Nacional em SP. Confirme sempre com o seu contador.
const SUGESTOES = [
  [/refri|refrigerante|coca|guaran|soda|t[oô]nica/i, { ncm: '22021000', cfop: '5405', cst: '500', cest: '0301100' }],
  [/cerveja|chopp|chope/i, { ncm: '22030000', cfop: '5405', cst: '500', cest: '0302100' }],
  [/[aá]gua/i, { ncm: '22011000', cfop: '5405', cst: '500', cest: '0300100' }],
  [/sorvete|a[cç]a[ií]|picol/i, { ncm: '21050010', cfop: '5405', cst: '500', cest: '2300100' }],
  [/suco|vitamina|milk ?shake/i, { ncm: '22029900', cfop: '5102', cst: '102', cest: '' }],
  [/pizza/i, { ncm: '19059090', cfop: '5102', cst: '102', cest: '' }],
];
const PADRAO = { ncm: '21069090', cfop: '5102', cst: '102', cest: '' }; // preparação alimentícia (pratos, lanches, porções)
export function sugestaoFiscal(p) {
  const s = (SUGESTOES.find(([r]) => r.test(String(p?.nome || ''))) || [null, PADRAO])[1];
  const x = { ...s };
  if (!simples()) x.cst = x.cst === '500' ? '60' : '00'; // regime normal: CST do ICMS no lugar do CSOSN
  return x;
}
export const fiscalDe = (p) => ({ ...sugestaoFiscal(p), ...(p?.fiscal || {}) });
const semNcm = () => ativos().filter((p) => !/^\d{8}$/.test(p.fiscal?.ncm || ''));

// ------------------------------------------------------------------ a venda vira o pedido de nota (neutro: a função traduz para cada emissor)
const TPAG = { Pix: '17', Dinheiro: '01', 'Cartão de débito': '04', 'Cartão de crédito': '03', [FORMA_FIADO]: '05' };
const tpagDe = (f) => TPAG[f] || (/pix/i.test(f) ? '17' : /d[eé]bito/i.test(f) ? '04' : /cr[eé]dito|cart/i.test(f) ? '03' : /dinheiro/i.test(f) ? '01' : '99');
export function notaDaVenda(v, cpf = '') {
  const its = (v.itens || []).filter((i) => i.qtd > 0 && i.preco > 0).map((i) => { const p = prod(i.prod), f = fiscalDe(p || { nome: i.nome });
    return { codigo: String(i.prod || 'item').slice(0, 60), nome: String(i.nome).slice(0, 120), ncm: f.ncm, cfop: f.cfop, cst: f.cst, cest: f.cest || '', cclass: f.cclass || '', cstibs: f.cstibs || '',
      un: i.kg ? 'KG' : 'UN', qtd: i.qtd, unit: i.preco, total: r2(i.qtd * i.preco), desc: 0, outro: 0 }; });
  const soma = r2(its.reduce((s, i) => s + i.total, 0));
  // serviço, couvert e entrega entram como "outras despesas"; o desconto, como desconto. Os dois rateados pelos itens.
  let desc = r2(v.desconto || 0), outro = r2((v.total || 0) - soma + desc);
  if (outro < 0) { desc = r2(desc - outro); outro = 0; }
  const ratear = (valor, campo) => { if (!(valor > 0) || !soma) return; let resto = valor;
    its.forEach((i, k) => { const p = k === its.length - 1 ? resto : r2(valor * i.total / soma); i[campo] = r2(Math.min(p, campo === 'desc' ? i.total : Infinity)); resto = r2(resto - i[campo]); }); };
  ratear(desc, 'desc'); ratear(outro, 'outro');
  const pagamentos = pagamentosVenda(v).map((p) => ({ tpag: tpagDe(p.forma), valor: r2((Number(p.valor) || 0) + (Number(p.troco) || 0)), troco: r2(p.troco || 0) })).filter((p) => p.valor > 0);
  const tent = (v.nfTentativas || 0);
  const ref = `${String(v.id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 44)}${tent ? `-${tent}` : ''}`;
  const N = nf();
  return { ref, cpf: soDig(cpf), itens: its, pagamentos, cnpj: soDig(N.emitente?.cnpj), piscofins: N.piscofins || '49',
    ...(N.modo === 'bluerose' && Number(N.serie) > 0 ? { serie: Number(N.serie) } : {}),
    ...(N.modo === 'bluerose' && Number(N.numIni) > 0 && !db.vendas.some((x) => x.nfce?.status && x.nfce.ambiente === (N.ambiente || 'homologacao')) ? { numero: Number(N.numIni) } : {}) };
}

// ------------------------------------------------------------------ demonstração: nota de exemplo (chave com dígito verificador certo)
function dv11(s) { let p = 2, soma = 0; for (let k = s.length - 1; k >= 0; k--) { soma += Number(s[k]) * p; p = p === 9 ? 2 : p + 1; } const r = soma % 11; return r < 2 ? 0 : 11 - r; }
function notaDeExemplo(n) {
  const d = new Date(), aamm = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const numero = (db.vendas.filter((x) => x.nfce?.demo).length || 0) + 1;
  const base = `35${aamm}${(n.cnpj || '12345678000190').padStart(14, '0').slice(0, 14)}65001${String(numero).padStart(9, '0')}1${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
  const chave = base + dv11(base);
  return { ok: true, chave, numero, serie: 1, protocolo: `135${aamm}${String(Date.now()).slice(-9)}`, ambiente: 'homologacao', provedor: 'demo', demo: true,
    qrcode: `https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode?p=${chave}|2|2|1|0000000000000000000000000000000000000000`, url_consulta: 'https://www.homologacao.nfce.fazenda.sp.gov.br/consulta', autorizada_em: d.toISOString() };
}

// ------------------------------------------------------------------ emitir, cancelar, marcar em outro sistema
const emAndamento = new Set();
export async function emitirNota(v, cpf = '') {
  if (!v || v.cancelado) return toast('Esta venda foi cancelada');
  if (v.nfce?.status === 'autorizada') return toast('Esta venda já tem NFC-e');
  if (emAndamento.has(v.id)) return; emAndamento.add(v.id);
  const n = notaDaVenda(v, cpf);
  const falta = n.itens.find((i) => !/^\d{8}$/.test(i.ncm));
  if (falta) { emAndamento.delete(v.id); return toast(`Falta o NCM de ${falta.nome}`); }
  toast('Emitindo a NFC-e...', false);
  let r;
  try { r = CONTA ? await chamar({ acao: 'emitir', venda: v.id, nota: n }) : await new Promise((ok) => setTimeout(() => ok(notaDeExemplo(n)), 700)); } catch { r = { ok: false, mensagem: 'Sem internet agora. Tente de novo.' }; }
  emAndamento.delete(v.id);
  const venda = db.vendas.find((x) => x.id === v.id) || v; // pode ter vindo da nuvem no meio
  if (!r?.ok) {
    venda.nfTentativas = (venda.nfTentativas || 0) + (r?.desligado ? 0 : 1); venda.nfErro = { ts: Date.now(), msg: String(r?.mensagem || 'Não foi autorizada').slice(0, 300) }; grava();
    toast(r?.desligado ? 'Nota fiscal ainda não ativada' : `NFC-e não saiu: ${venda.nfErro.msg}`, 'erro'); return null;
  }
  venda.nfce = { status: 'autorizada', chave: r.chave, numero: r.numero || null, serie: r.serie || null, protocolo: r.protocolo || '', ambiente: r.ambiente || 'homologacao', provedor: r.provedor || '',
    qrcode: String(r.qrcode || '').slice(0, 1200), url: String(r.url_consulta || '').slice(0, 300), autorizada: r.autorizada_em ? new Date(r.autorizada_em).getTime() || Date.now() : Date.now(),
    ts: Date.now(), cpf: n.cpf || '', quem: quemAgora(), ...(r.demo ? { demo: true } : {}), xmlNoServidor: !!CONTA };
  delete venda.nfErro; grava(); auditar('nfce', { venda: venda.id, valor: venda.total, chave: r.chave });
  toast(`NFC-e ${r.numero ? `nº ${r.numero} ` : ''}autorizada`, 'caixa');
  return venda.nfce;
}
export const minutosParaCancelar = (v) => Math.max(0, 30 - Math.floor((Date.now() - (v.nfce?.autorizada || v.nfce?.ts || 0)) / 60e3));
export async function cancelarNota(v) {
  if (v?.nfce?.status !== 'autorizada') return;
  const min = minutosParaCancelar(v);
  if (!min) return toast('Passou dos 30 minutos: fale com o seu contador para cancelar esta nota');
  const r = await autorizar({ titulo: `Cancelar a NFC-e ${v.nfce.numero ? `nº ${v.nfce.numero}` : ''}?`, texto: `Em SP dá para cancelar em até 30 minutos (faltam ${min} min). O motivo vai para a SEFAZ (no mínimo 15 letras).`,
    motivos: ['Cliente desistiu da compra', 'Venda lançada em duplicidade', 'Erro nos itens ou no valor da venda'], sim: 'Cancelar a nota', perigo: true });
  if (!r) return;
  if (r.motivo.length < 15) return toast('Escreva o motivo com pelo menos 15 letras', 'erro');
  let x; try { x = CONTA && !v.nfce.demo ? await chamar({ acao: 'cancelar', chave: v.nfce.chave, motivo: r.motivo }) : { ok: true, protocolo: `135${Date.now().toString().slice(-12)}` }; } catch { x = { ok: false, mensagem: 'Sem internet agora.' }; }
  if (!x?.ok) return toast(x?.mensagem || 'A SEFAZ não aceitou o cancelamento', 'erro');
  v.nfce = { ...v.nfce, status: 'cancelada', cancelada: { ts: Date.now(), motivo: r.motivo, quem: quemAgora(), protocolo: x.protocolo || '' } };
  grava(); auditar('nfce-cancelada', { venda: v.id, valor: v.total, motivo: r.motivo }); toast('NFC-e cancelada');
}
export function folhaEmitir(v) {
  folha({ titulo: `Emitir NFC-e · ${din(v.total)}`, corpo: `<label class="campo"><span>CPF ou CNPJ na nota (opcional)</span><input data-cpf inputmode="numeric" maxlength="18" placeholder="Só se o cliente pedir" autocomplete="off"></label>
      ${!CONTA ? '<p class="aviso azul">Demonstração: sai uma nota de exemplo, em ambiente de teste (sem valor fiscal).</p>' : nf().ambiente !== 'producao' ? '<p class="aviso azul">Ambiente de teste (homologação): a nota não tem valor fiscal.</p>' : ''}
      ${v.nfErro ? `<p class="aviso perigo" style="margin-top:10px">Última tentativa: ${t(v.nfErro.msg)}</p>` : ''}`,
  pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio grande" data-ok>Emitir</button>',
  aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = async () => { const c = soDig($('[data-cpf]', f).value); if (c && c.length !== 11 && c.length !== 14) return toast('Escreva o CPF (11 números) ou o CNPJ (14)', 'erro'); fechar(); const ok = await emitirNota(v, c); if (ok) imprimirDanfe(v); }; } });
}
function folhaOutro(v) {
  folha({ titulo: 'Nota emitida em outro sistema', corpo: `<label class="campo"><span>Número ou chave da nota (opcional)</span><input data-ref maxlength="60" value="${t(v.nfOutro?.ref || '')}" placeholder="Ex.: 1234 ou a chave de 44 números"></label><p class="mudo">Serve só para você saber quais vendas já têm nota.</p>`,
    pe: `${v.nfOutro ? '<button type="button" class="bt" data-tirar>Desmarcar</button>' : '<button type="button" class="bt" data-fechar>Voltar</button>'}<button type="button" class="bt cheio grande" data-ok>Marcar</button>`,
    aoAbrir: (f, fechar) => {
      $('[data-ok]', f).onclick = () => { v.nfOutro = { ref: $('[data-ref]', f).value.trim().slice(0, 60), ts: Date.now(), quem: quemAgora() }; grava(); fechar(); toast('Venda marcada com nota'); };
      $('[data-tirar]', f)?.addEventListener('click', () => { delete v.nfOutro; grava(); fechar(); toast('Marca tirada'); });
    } });
}

// ------------------------------------------------------------------ o que aparece na venda (Conta fechada e Vendas de hoje)
const auto = new Set();
export function blocoNotaVenda(v, recemFechada = false) {
  const m = modoNf(); if (!v || !m || m === 'nao' || v.cancelado && !v.nfce) return '';
  if (m === 'outro') return `<div class="linha-bts" style="justify-content:center;margin-top:12px">${v.nfOutro ? `<span class="etq livre">${ico('check')}Nota em outro sistema${v.nfOutro.ref ? `: ${t(v.nfOutro.ref)}` : ''}</span>` : ''}<button type="button" class="bt" data-acao="nf-outro" data-id="${t(v.id)}">${ico('conta')}${v.nfOutro ? 'Mudar' : 'Nota emitida em outro sistema'}</button></div>`;
  const n = v.nfce;
  if (!n && recemFechada && nf().auto && !auto.has(v.id) && !v.nfErro) { auto.add(v.id); setTimeout(() => emitirNota(v), 80); }
  if (n?.status === 'autorizada') return `<div class="linha-bts" style="justify-content:center;margin-top:12px"><span class="etq livre">${ico('check')}NFC-e${n.numero ? ` nº ${n.numero}` : ''}${n.ambiente !== 'producao' ? ' (teste)' : ''}</span>
    <button type="button" class="bt grande" data-acao="nf-danfe" data-id="${t(v.id)}">${ico('impressora')}Imprimir DANFE</button>${minutosParaCancelar(v) ? `<button type="button" class="bt" data-acao="nf-cancelar" data-id="${t(v.id)}">Cancelar a nota</button>` : ''}</div>`;
  if (n?.status === 'cancelada') return `<p class="mudo" style="margin-top:12px">NFC-e${n.numero ? ` nº ${n.numero}` : ''} cancelada: ${t(n.cancelada?.motivo || '')}</p>`;
  if (v.cancelado) return '';
  return `<div class="linha-bts" style="justify-content:center;margin-top:12px"><button type="button" class="bt cheio grande" data-acao="nf-emitir" data-id="${t(v.id)}">${ico('conta')}Emitir NFC-e</button></div>${v.nfErro ? `<p class="aviso perigo" style="margin-top:10px;text-align:left">${t(v.nfErro.msg)}</p>` : ''}`;
}
// etiqueta curta e botão pequeno para a lista de vendas
export function etiquetaNota(v) {
  const m = modoNf(); if (!m || m === 'nao') return '';
  if (v.nfce?.status === 'autorizada') return `<small>NFC-e${v.nfce.numero ? ` nº ${v.nfce.numero}` : ''}${v.nfce.ambiente !== 'producao' ? ' (teste)' : ''}</small>`;
  if (v.nfce?.status === 'cancelada') return '<small>NFC-e cancelada</small>';
  if (v.nfOutro) return `<small>Nota em outro sistema${v.nfOutro.ref ? `: ${t(v.nfOutro.ref)}` : ''}</small>`;
  return '';
}
export function botaoNota(v) {
  const m = modoNf(); if (!m || m === 'nao' || v.cancelado) return '';
  if (m === 'outro') return `<button type="button" class="bt-ico" data-acao="nf-outro" data-id="${t(v.id)}" aria-label="Nota emitida em outro sistema">${ico('conta')}</button>`;
  return v.nfce?.status === 'autorizada' ? `<button type="button" class="bt-ico" data-acao="nf-danfe" data-id="${t(v.id)}" aria-label="Imprimir DANFE da NFC-e">${ico('conta')}</button>`
    : `<button type="button" class="bt-ico" data-acao="nf-emitir" data-id="${t(v.id)}" aria-label="Emitir NFC-e">${ico('conta')}</button>`;
}

// ------------------------------------------------------------------ DANFE NFC-e (80 mm) com o QR da consulta
const grupos = (ch) => String(ch || '').replace(/(\d{4})(?=\d)/g, '$1 ');
const dataHora = (ts) => new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
export function htmlDanfe(v, f = '80') {
  const n = v.nfce || {}, E = nf().emitente || {}, nota = notaDaVenda(v, n.cpf), teste = n.ambiente !== 'producao';
  const pg = pagamentosVenda(v), troco = pg.reduce((s, p) => s + (Number(p.troco) || 0), 0);
  const desc = r2(nota.itens.reduce((s, i) => s + i.desc, 0)), outro = r2(nota.itens.reduce((s, i) => s + i.outro, 0)), bruto = r2(nota.itens.reduce((s, i) => s + i.total, 0));
  const end = [E.logradouro && `${E.logradouro}, ${E.numero || 'S/N'}`, E.bairro, E.municipio && `${E.municipio} - SP`].filter(Boolean).join(' · ');
  return `<div class="tk danfe ${f === 'a4' ? 'a4' : ''}">
    <p class="c"><b>${t(E.razao || db.config.nome || 'Restaurante')}</b></p>
    <p class="c">CNPJ ${t(E.cnpj ? soDig(E.cnpj).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : '—')}${E.ie ? ` · IE ${t(E.ie)}` : ''}</p>${end ? `<p class="c">${t(end)}</p>` : ''}
    <hr><p class="c"><b>DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</b></p>
    ${teste ? '<p class="c"><b>EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL</b></p>' : ''}<hr>
    <table><tr><td><small>Código · Descrição · Qtde · Un · Vl Unit</small></td><td class="n"><small>Vl Total</small></td></tr>
    ${nota.itens.map((i) => `<tr><td>${t(i.codigo.slice(0, 10))} ${t(i.nome)}<br><small>${String(i.qtd).replace('.', ',')} ${i.un} × ${din(i.unit)}</small></td><td class="n">${din(i.total)}</td></tr>`).join('')}</table><hr>
    <table><tr><td>Qtde. total de itens</td><td class="n">${nota.itens.length}</td></tr><tr><td>Valor total R$</td><td class="n">${din(bruto)}</td></tr>
      ${desc ? `<tr><td>Desconto R$</td><td class="n">− ${din(desc)}</td></tr>` : ''}${outro ? `<tr><td>Acréscimos (serviço/entrega) R$</td><td class="n">${din(outro)}</td></tr>` : ''}
      <tr class="grande"><td>Valor a pagar R$</td><td class="n">${din(v.total)}</td></tr>
      <tr><td><small>FORMA DE PAGAMENTO</small></td><td class="n"><small>VALOR PAGO R$</small></td></tr>
      ${pg.map((p) => `<tr><td>${t(p.forma === FORMA_FIADO ? 'Crédito loja' : p.forma)}</td><td class="n">${din((Number(p.valor) || 0) + (Number(p.troco) || 0))}</td></tr>`).join('')}
      ${troco ? `<tr><td>Troco R$</td><td class="n">${din(troco)}</td></tr>` : ''}</table><hr>
    <p class="c"><b>Consulte pela Chave de Acesso em</b><br><small style="word-break:break-all">${t(n.url || 'https://www.nfce.fazenda.sp.gov.br/consulta')}</small></p>
    <p class="c" style="font-size:12px;word-spacing:2px">${grupos(n.chave)}</p><hr>
    <p class="c">${n.cpf ? `CONSUMIDOR ${n.cpf.length === 14 ? 'CNPJ' : 'CPF'}: ${t(n.cpf)}` : 'CONSUMIDOR NÃO IDENTIFICADO'}</p><hr>
    <p class="c"><b>NFC-e nº ${String(n.numero || '').padStart(9, '0')} Série ${String(n.serie || 1).padStart(3, '0')} ${t(dataHora(n.ts || Date.now()))}</b></p>
    <p class="c">Protocolo de autorização: ${t(n.protocolo || '')}<br>Data de autorização: ${t(dataHora(n.autorizada || n.ts || Date.now()))}</p>
    ${n.qrcode ? `<div class="c" style="display:grid;place-items:center;margin:8px 0">${qrSVG(n.qrcode, 150, '#000')}</div>` : ''}
    ${teste ? '<p class="c"><b>SEM VALOR FISCAL</b></p>' : ''}${n.status === 'cancelada' ? '<p class="c"><b>NOTA CANCELADA</b></p>' : ''}</div>`;
}
export const imprimirDanfe = (v) => abrirImpressao(`DANFE NFC-e${v.nfce?.numero ? ` nº ${v.nfce.numero}` : ''}`, (f) => htmlDanfe(v, f));

// ------------------------------------------------------------------ exportar vendas (CSV e XML simples) para o emissor ou o contador
const PERIODOS = [['hoje', 'Hoje'], ['ontem', 'Ontem'], ['7', 'Últimos 7 dias'], ['mes', 'Este mês'], ['mespassado', 'Mês passado']];
function intervalo(k) {
  const h = inicioDoDia(), d = new Date(h);
  if (k === 'ontem') return [h - 864e5, h - 1];
  if (k === '7') return [h - 6 * 864e5, Infinity];
  if (k === 'mes') return [new Date(d.getFullYear(), d.getMonth(), 1).getTime(), Infinity];
  if (k === 'mespassado') return [new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(), new Date(d.getFullYear(), d.getMonth(), 1).getTime() - 1];
  return [h, Infinity];
}
const csvCel = (s) => { const x = String(s ?? ''); return /[;"\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
const nro = (n) => (Number(n) || 0).toFixed(2).replace('.', ',');
const xmlEsc = (s) => String(s ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
const situacao = (v) => (v.cancelado ? 'venda cancelada' : v.nfce?.status === 'autorizada' ? 'NFC-e autorizada' : v.nfce?.status === 'cancelada' ? 'NFC-e cancelada' : v.nfOutro ? 'nota em outro sistema' : 'sem nota');
export function exportarCSV(vendas) {
  const cab = ['Data', 'Hora', 'Venda', 'Onde', 'Produto', 'Código', 'NCM', 'CFOP', 'CSOSN/CST', 'CEST', 'Qtde', 'Unidade', 'Valor unitário', 'Valor do item', 'Desconto do item', 'Acréscimo do item', 'Total da venda', 'Pagamentos', 'CPF/CNPJ', 'Nota (número/chave)', 'Situação'];
  const linhas = [];
  for (const v of vendas) {
    const n = notaDaVenda(v, v.nfce?.cpf || ''), d = new Date(v.ts), pags = pagamentosVenda(v).map((p) => `${p.forma === FORMA_FIADO ? 'Fiado' : p.forma} ${nro(p.valor)}`).join(' + ');
    const nota = v.nfce ? `${v.nfce.numero || ''} ${v.nfce.chave || ''}`.trim() : v.nfOutro?.ref || '';
    for (const i of n.itens) linhas.push([d.toLocaleDateString('pt-BR'), d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), v.id, v.onde || '', i.nome, i.codigo, i.ncm, i.cfop, i.cst, i.cest, String(i.qtd).replace('.', ','), i.un, nro(i.unit), nro(i.total), nro(i.desc), nro(i.outro), nro(v.total), pags, n.cpf, nota, situacao(v)]);
  }
  return '﻿' + [cab, ...linhas].map((l) => l.map(csvCel).join(';')).join('\r\n');
}
export function exportarXML(vendas, de, ate) {
  const E = nf().emitente || {};
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Vendas do Popina para lançar no emissor ou mandar ao contador. NÃO é documento fiscal. -->\n<vendasPopina versao="1" restaurante="${xmlEsc(E.razao || db.config.nome || '')}" cnpj="${soDig(E.cnpj)}" de="${ymd(de)}" ate="${ymd(Math.min(ate, Date.now()))}" gerado="${new Date().toISOString()}">\n${vendas.map((v) => {
    const n = notaDaVenda(v, v.nfce?.cpf || '');
    return `  <venda id="${xmlEsc(v.id)}" data="${new Date(v.ts).toISOString()}" onde="${xmlEsc(v.onde || '')}" total="${r2(v.total).toFixed(2)}" desconto="${r2(v.desconto || 0).toFixed(2)}" situacao="${xmlEsc(situacao(v))}"${n.cpf ? ` cpf="${n.cpf}"` : ''}${v.nfce?.chave ? ` chaveNFCe="${v.nfce.chave}"` : ''}${v.nfOutro?.ref ? ` notaOutroSistema="${xmlEsc(v.nfOutro.ref)}"` : ''}>\n${n.itens.map((i) => `    <item codigo="${xmlEsc(i.codigo)}" descricao="${xmlEsc(i.nome)}" ncm="${i.ncm}" cfop="${i.cfop}" csosn="${i.cst}"${i.cest ? ` cest="${i.cest}"` : ''} un="${i.un}" qtd="${i.qtd}" vUnit="${r2(i.unit).toFixed(2)}" vProd="${i.total.toFixed(2)}" vDesc="${i.desc.toFixed(2)}" vOutro="${i.outro.toFixed(2)}"/>`).join('\n')}\n${n.pagamentos.map((p) => `    <pagamento tPag="${p.tpag}" vPag="${p.valor.toFixed(2)}"${p.troco ? ` vTroco="${p.troco.toFixed(2)}"` : ''}/>`).join('\n')}\n  </venda>`;
  }).join('\n')}\n</vendasPopina>\n`;
}
function baixar(nome, texto, tipo) {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo })), a = document.createElement('a');
  a.href = url; a.download = nome; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export function folhaExportar() {
  let per = 'hoje', soSem = false;
  const lista = () => { const [de, ate] = intervalo(per); return db.vendas.filter((v) => v.ts >= de && v.ts <= ate && (!soSem || (!v.cancelado && !v.nfce?.status && !v.nfOutro))).sort((a, b) => a.ts - b.ts); };
  const resumo = () => { const l = lista(); return `${l.length} vendas · ${din(l.filter((v) => !v.cancelado).reduce((s, v) => s + v.total, 0))}`; };
  folha({ titulo: 'Exportar vendas', corpo: `<p class="mudo">Para lançar no seu emissor ou mandar ao contador. O CSV abre no Excel (uma linha por item, com NCM, CFOP e CSOSN).</p>
      <div class="chips quebra" role="group" aria-label="Período" style="margin-top:10px">${PERIODOS.map(([k, n]) => `<button type="button" class="chip" data-per="${k}" aria-pressed="${k === per}">${n}</button>`).join('')}</div>
      <label class="liga">Só as vendas sem nota<input type="checkbox" data-sosem></label><p class="aviso ok" data-resumo style="margin-top:12px">${resumo()}</p>`,
  pe: '<button type="button" class="bt" data-xml>XML simples</button><button type="button" class="bt cheio grande" data-csv>Baixar CSV</button>',
  aoAbrir: (f) => {
    const atual = () => { $('[data-resumo]', f).textContent = resumo(); };
    $$('[data-per]', f).forEach((b) => { b.onclick = () => { per = b.dataset.per; $$('[data-per]', f).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); atual(); }; });
    $('[data-sosem]', f).onchange = (e) => { soSem = e.target.checked; atual(); };
    const nome = (ext) => `vendas-${(db.config.nome || 'popina').normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase().slice(0, 30)}-${per}-${ymd()}.${ext}`;
    $('[data-csv]', f).onclick = () => { const l = lista(); if (!l.length) return toast('Nada para exportar neste período'); baixar(nome('csv'), exportarCSV(l), 'text/csv;charset=utf-8'); toast('CSV baixado'); };
    $('[data-xml]', f).onclick = () => { const l = lista(); if (!l.length) return toast('Nada para exportar neste período'); const [de, ate] = intervalo(per); baixar(nome('xml'), exportarXML(l, de, ate), 'application/xml'); toast('XML baixado'); };
  } });
}

// ------------------------------------------------------------------ dados fiscais dos produtos
const CFOP_OP = [['5102', '5102 · venda de produção ou revenda (lanches, pratos)'], ['5405', '5405 · revenda com ICMS já pago antes (ST: refrigerante, cerveja, água)'], ['5101', '5101 · venda de produção própria']];
const CST_OP = () => (simples() ? [['102', '102 · Simples, sem crédito'], ['500', '500 · ICMS já cobrado antes (ST)'], ['103', '103 · isento no Simples'], ['300', '300 · imune'], ['400', '400 · não tributada']]
  : [['00', '00 · tributada integralmente'], ['60', '60 · ICMS cobrado antes (ST)'], ['40', '40 · isenta'], ['41', '41 · não tributada']]);
export function folhaProdutos() {
  const l = ativos();
  const linha = (p) => { const f = fiscalDe(p), sug = !p.fiscal?.ncm;
    return `<div class="cartao" data-p="${t(p.id)}" style="padding:12px;margin:0 0 10px"><b>${t(p.nome)}</b>${sug ? ' <span class="etq novo">sugestão</span>' : ''}
      <div class="grade2" style="margin-top:8px"><label class="campo"><span>NCM</span><input data-ncm inputmode="numeric" maxlength="10" value="${t(f.ncm)}"></label><label class="campo"><span>CEST (se tiver ST)</span><input data-cest inputmode="numeric" maxlength="9" value="${t(f.cest || '')}"></label></div>
      <div class="grade2"><label class="campo"><span>CFOP</span><select data-cfop>${CFOP_OP.map(([k, n]) => `<option value="${k}" ${f.cfop === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="campo"><span>${simples() ? 'CSOSN' : 'CST do ICMS'}</span><select data-cst>${CST_OP().map(([k, n]) => `<option value="${k}" ${f.cst === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <label class="campo" style="margin:0"><span>Classificação IBS/CBS (cClassTrib, reforma) · opcional</span><input data-cclass inputmode="numeric" maxlength="6" value="${t(f.cclass || '')}" placeholder="Deixe em branco se o contador não pediu"></label></div>`; };
  folha({ titulo: 'Ajustes do contador', larga: true, corpo: `<p class="mudo" style="margin-bottom:8px">Códigos fiscais de cada produto (NCM, CFOP, CSOSN). Você não precisa mexer: mostre esta tela ao seu contador.</p><p class="aviso">Já vem com padrões comuns para lanchonete e restaurante no ${simples() ? 'Simples Nacional' : 'regime normal'}. <b>Confirme com o seu contador</b> antes de emitir valendo.</p>
      <div style="margin-top:12px">${l.map(linha).join('') || '<p class="mudo">Cadastre os pratos no Cardápio primeiro.</p>'}</div>`,
  pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio grande" data-ok>Salvar</button>',
  aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => {
    let ruim = '';
    $$('[data-p]', f).forEach((c) => { const p = prod(c.dataset.p); if (!p) return; const ncm = soDig($('[data-ncm]', c).value);
      if (ncm.length !== 8) { ruim ||= p.nome; return; }
      p.fiscal = { ...(p.fiscal || {}), ncm, cest: soDig($('[data-cest]', c).value).slice(0, 7), cfop: $('[data-cfop]', c).value, cst: $('[data-cst]', c).value, cclass: soDig($('[data-cclass]', c).value).slice(0, 6) }; });
    grava(); if (ruim) return toast(`O NCM tem 8 números: confira ${ruim}`, 'erro'); fechar(); toast('Dados fiscais salvos');
  }; } });
}


// ------------------------------------------------------------------ assistente passo a passo (banca 2): linguagem de quem não é contador
// 1. Você já emite nota? Onde?  2. Cole a chave do seu emissor (só se usa um)  3. Os códigos fiscais já vêm prontos  4. Teste
const PERGUNTA = [
  ['api', 'Sim, num emissor na internet', 'Brasil NFe, Focus NFe ou outro site de nota que te dá uma "chave" (token).'],
  ['outro', 'Sim, no meu caixa antigo ou o contador faz', 'O Popina não emite: você marca a nota na venda e manda as vendas ao contador.'],
  ['nao', 'Não emito', 'MEI ou ainda não precisa. Nada de nota aparece no caixa.'],
  ['sei', 'Não sei', 'Sem problema: começa como "o contador faz". Dá para mudar quando quiser.'],
];
async function notaTeste() {
  const p = ativos().find((x) => !x.porKg && Number(x.preco) > 0) || { id: 'teste', nome: 'Item de teste', preco: 1 };
  const v = { id: `teste-${Date.now().toString(36)}`, ts: Date.now(), onde: 'Nota de teste', itens: [{ prod: p.id, nome: p.nome, qtd: 1, preco: Number(p.preco) || 1 }], total: Number(p.preco) || 1, pagamentos: [{ forma: 'Pix', valor: Number(p.preco) || 1 }] };
  const n = notaDaVenda(v);
  let r; try { r = CONTA ? await chamar({ acao: 'emitir', venda: v.id, nota: n }) : notaDeExemplo(n); } catch { r = { ok: false, mensagem: 'Sem internet agora. Tente de novo.' }; }
  if (!r?.ok) return { erro: String(r?.mensagem || 'A nota de teste não saiu') };
  v.nfce = { status: 'autorizada', chave: r.chave, numero: r.numero || null, serie: r.serie || null, protocolo: r.protocolo || '', ambiente: 'homologacao', qrcode: String(r.qrcode || ''), url: String(r.url_consulta || ''), ts: Date.now(), autorizada: Date.now(), cpf: '' };
  return { v };
}
export function assistenteNf(redesenhar = () => {}) {
  let passo = 1, modo = modoNf() || '', prov = nf().provedor || 'brasilnfe';
  const total = () => (modo === 'api' ? 4 : modo === 'nao' ? 2 : 3);
  const num = () => (modo === 'api' ? passo : modo === 'nao' ? (passo === 1 ? 1 : 2) : { 1: 1, 3: 2, 4: 3 }[passo]);
  const corpo = () => {
    const cab = `<p class="nf-passo">Passo ${num()} de ${total()}</p>`;
    if (passo === 1) return `${cab}<h3 class="nf-perg">Você já emite nota fiscal? Onde?</h3>
      <div class="menu-g" role="radiogroup" aria-label="Você já emite nota?">${PERGUNTA.map(([k, n, d]) => `<button type="button" role="radio" aria-checked="${modo === k}" data-m="${k}"><span class="ico-g">${ico(k === 'api' ? 'link' : k === 'outro' ? 'conta' : k === 'nao' ? 'fechar' : 'fala')}</span><span><b>${n}</b><small>${d}</small></span></button>`).join('')}</div>`;
    if (passo === 2) return `${cab}<h3 class="nf-perg">Cole a chave do seu emissor</h3>
      <div class="chips quebra" role="group" aria-label="Seu emissor">${Object.entries(PROVEDORES).map(([k, x]) => `<button type="button" class="chip" data-prov="${k}" aria-pressed="${prov === k}">${x.nome}</button>`).join('')}</div>
      <p class="aviso azul" style="margin:10px 0"><b>Onde achar:</b> <span data-onde>${t(PROVEDORES[prov].onde)}</span> Copie e cole abaixo.</p>
      <label class="campo"><span>Chave (token)</span><input data-tk type="password" autocomplete="off" spellcheck="false" maxlength="300" placeholder="${servidor?.conectado ? 'Já guardada. Cole outra só para trocar' : 'Cole aqui'}"></label>
      <label class="campo"><span>CNPJ do restaurante</span><input data-cnpj inputmode="numeric" maxlength="18" value="${t(nf().emitente?.cnpj || '')}" placeholder="Só números"></label>
      <p class="mudo">Não sabe a chave? Toque em Voltar e escolha "o contador faz" ou "Não emito". Dá para mudar depois.</p>`;
    if (passo === 3) return `${cab}<h3 class="nf-perg">Os códigos fiscais já vêm prontos</h3>
      <p class="aviso ok">${ico('check')} Seus ${ativos().length} produtos já vêm com o código fiscal mais comum de lanchonete e restaurante (refrigerante, cerveja e água com o deles).</p>
      <p style="margin-top:12px">Peça ao seu contador para conferir uma vez. Se ele quiser mudar algo, é em <b>Ajustes do contador</b>.</p>
      <div class="linha-bts" style="margin-top:12px"><button type="button" class="bt" data-ajustes>${ico('ajustes')}Ajustes do contador</button></div>`;
    // passo 4: teste
    if (modo === 'api') return `${cab}<h3 class="nf-perg">Teste</h3>
      <p>Vamos emitir uma nota de teste, sem valor fiscal, para ver se está tudo certo.</p>
      ${!CONTA ? '<p class="aviso azul" style="margin-top:10px">Demonstração: sai uma nota de exemplo.</p>' : ''}
      ${nf().ambiente === 'producao' ? '<p class="aviso" style="margin-top:10px">Você está emitindo valendo. O teste só roda no ambiente de teste: faça a primeira venda e confira a nota.</p>' : '<div class="linha-bts" style="margin-top:12px"><button type="button" class="bt cheio grande" data-teste>Emitir nota de teste</button></div>'}
      <p data-res-teste style="margin-top:12px"></p>`;
    return `${cab}<h3 class="nf-perg">${modo === 'nao' ? 'Pronto' : 'Teste'}</h3>${modo === 'nao' ? '<p>Nada de nota aparece no caixa. Se um dia precisar, é só voltar aqui.</p>'
      : '<p>Feche uma venda no Caixa: na conta fechada aparece <b>Nota emitida em outro sistema</b> para você marcar. No fim do dia, <b>Exportar vendas</b> gera o arquivo para o contador.</p>'}`;
  };
  folha({ titulo: 'Nota fiscal passo a passo', corpo: '<div data-nf-c></div>', pe: '<div data-nf-pe class="linha-bts" style="width:100%;justify-content:flex-end"></div>',
    aoAbrir: (f, fechar) => {
      const C = $('[data-nf-c]', f), PE = $('[data-nf-pe]', f);
      const fim = () => { setNf({ modo: modo === 'sei' ? 'outro' : modo }); fechar(); toast('Nota fiscal configurada'); redesenhar(); };
      const mostrar = () => {
        C.innerHTML = corpo(); f.querySelector('.folha-corpo').scrollTop = 0;
        const ultimo = passo === 4;
        PE.innerHTML = `${passo > 1 ? '<button type="button" class="bt" data-volta>Voltar</button>' : '<button type="button" class="bt" data-fechar>Agora não</button>'}<button type="button" class="bt cheio grande" data-segue>${ultimo ? `${ico('check')}Concluir` : 'Continuar'}</button>`;
        $$('[data-m]', C).forEach((b) => { b.onclick = () => { modo = b.dataset.m; $$('[data-m]', C).forEach((x) => x.setAttribute('aria-checked', x === b)); }; });
        $$('[data-prov]', C).forEach((b) => { b.onclick = () => { prov = b.dataset.prov; $$('[data-prov]', C).forEach((x) => x.setAttribute('aria-pressed', x === b)); $('[data-onde]', C).textContent = PROVEDORES[prov].onde; }; });
        $('[data-ajustes]', C)?.addEventListener('click', folhaProdutos);
        $('[data-teste]', C)?.addEventListener('click', async (ev) => {
          ev.currentTarget.disabled = true; const out = $('[data-res-teste]', C); out.className = 'mudo'; out.textContent = 'Emitindo a nota de teste...';
          const r = await notaTeste(); ev.currentTarget.disabled = false;
          if (r.erro) { out.className = 'aviso perigo'; out.textContent = `Não saiu: ${r.erro}. Confira a chave no passo 2.`; return; }
          out.className = 'aviso ok'; out.innerHTML = `${ico('check')} Deu certo! A nota de teste foi autorizada. <button type="button" class="bt pq" data-ver>${ico('impressora')}Ver a nota</button>`;
          $('[data-ver]', out).onclick = () => imprimirDanfe(r.v);
        });
        $('[data-volta]', PE)?.addEventListener('click', () => { passo = passo === 4 ? (modo === 'nao' ? 1 : 3) : passo === 3 ? (modo === 'api' ? 2 : 1) : 1; mostrar(); });
        $('[data-segue]', PE).onclick = async () => {
          if (passo === 1) { if (!modo) return toast('Escolha uma opção'); if (modo === 'nao') { passo = 4; return mostrar(); } passo = modo === 'api' ? 2 : 3; return mostrar(); }
          if (passo === 2) {
            const tk = $('[data-tk]', C).value.trim(), cnpj = soDig($('[data-cnpj]', C).value);
            if (cnpj && cnpj.length !== 14) return toast('O CNPJ tem 14 números', 'erro');
            setNf({ modo: 'api', provedor: prov, emitente: { ...(nf().emitente || {}), ...(cnpj ? { cnpj } : {}) } });
            if (!CONTA) { if (!tk && !nf().conectadoDemo) return toast('Cole a chave do seu emissor', 'erro'); setNf({ conectadoDemo: true }); servidor = { ...(servidor || {}), conectado: true, provedor: prov }; }
            else if (tk || !(servidor?.conectado && servidor.provedor === prov)) {
              if (!tk) return toast('Cole a chave do seu emissor', 'erro');
              const b = $('[data-segue]', PE); b.disabled = true;
              const r = await chamar({ acao: 'conectar', provedor: prov, token: tk, ambiente: nf().ambiente || 'homologacao' }); b.disabled = false;
              if (!r?.ok) return toast(r?.erro || r?.mensagem || 'Não deu para conectar. Confira a chave.', 'erro');
              await lerStatus();
            }
            passo = 3; return mostrar();
          }
          if (passo === 3) { passo = 4; return mostrar(); }
          fim();
        };
      };
      mostrar();
    } });
}

// ------------------------------------------------------------------ a seção nas Configurações
const v_ = (o, k) => t(o?.[k] || '');
export function secaoNf(g) {
  const N = nf(), m = N.modo || '', E = N.emitente || {}, s = servidor || {}, demo = !CONTA;
  const brDisp = demo || !!s.bluerose_disponivel;
  const cartoes = `<div class="menu-g" role="radiogroup" aria-label="Como você emite nota hoje?" style="margin:12px 0">${MODOS.map(([k, n, d]) => `<button type="button" role="radio" aria-checked="${m === k}" data-nf-modo="${k}" ${g ? '' : 'disabled'} style="${m === k ? 'outline:3px solid var(--loja);outline-offset:-3px' : ''}"><span class="ico-g">${ico(k === 'api' ? 'link' : k === 'outro' ? 'conta' : k === 'bluerose' ? 'coroa' : 'fechar')}</span><span><b>${n}${k === 'bluerose' && !s.bluerose_disponivel ? ' · em breve' : ''}</b><small>${d}</small></span></button>`).join('')}</div>`;
  const emitente = (completo) => `<h3 style="margin:14px 0 8px">Dados do restaurante (saem no DANFE)</h3>
    <div class="grade2"><label class="campo"><span>CNPJ</span><input data-e="cnpj" inputmode="numeric" maxlength="18" value="${v_(E, 'cnpj')}"></label><label class="campo"><span>Inscrição estadual</span><input data-e="ie" inputmode="numeric" maxlength="14" value="${v_(E, 'ie')}"></label></div>
    <label class="campo"><span>Razão social</span><input data-e="razao" maxlength="60" value="${v_(E, 'razao')}"></label>
    <label class="campo"><span>Regime</span><select data-e="crt">${[['1', 'Simples Nacional'], ['4', 'MEI'], ['2', 'Simples (excesso de sublimite)'], ['3', 'Regime normal (Lucro Presumido/Real)']].map(([k, n]) => `<option value="${k}" ${String(E.crt || '1') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <div class="grade2"><label class="campo"><span>Rua</span><input data-e="logradouro" maxlength="60" value="${v_(E, 'logradouro')}"></label><label class="campo"><span>Número</span><input data-e="numero" maxlength="10" value="${v_(E, 'numero')}"></label></div>
    <div class="grade2"><label class="campo"><span>Bairro</span><input data-e="bairro" maxlength="60" value="${v_(E, 'bairro')}"></label><label class="campo"><span>Cidade (SP)</span><input data-e="municipio" maxlength="60" value="${v_(E, 'municipio')}"></label></div>
    ${completo ? `<div class="grade2"><label class="campo"><span>CEP</span><input data-e="cep" inputmode="numeric" maxlength="9" value="${v_(E, 'cep')}"></label><label class="campo"><span>Código IBGE da cidade</span><input data-e="codMunicipio" inputmode="numeric" maxlength="7" value="${v_(E, 'codMunicipio')}"><small>7 números (ex.: São Paulo 3550308)</small></label></div>
      <div class="grade2"><label class="campo"><span>Telefone</span><input data-e="telefone" inputmode="tel" maxlength="16" value="${v_(E, 'telefone')}"></label><label class="campo"><span>E-mail</span><input data-e="email" type="email" maxlength="80" value="${v_(E, 'email')}"></label></div>` : ''}`;
  const ambiente = `<p class="campo"><span>Ambiente</span></p><div class="chips quebra" role="group" aria-label="Ambiente">${[['homologacao', 'Teste (homologação)'], ['producao', 'Valendo (produção)']].map(([k, n]) => `<button type="button" class="chip" data-nf-amb="${k}" aria-pressed="${(N.ambiente || 'homologacao') === k}">${n}</button>`).join('')}</div>`;
  const comum = `<label class="liga" style="margin-top:8px">Emitir sozinho ao fechar a conta<small>Sem CPF na nota. Desligado: aparece o botão "Emitir NFC-e".</small><input type="checkbox" data-nf-auto ${N.auto ? 'checked' : ''}></label>
    <div class="linha-bts" style="margin-top:12px"><button type="button" class="bt" data-nf-produtos>${ico('ajustes')}Ajustes do contador</button><button type="button" class="bt" data-nf-exportar>${ico('grafico')}Exportar vendas</button></div>`;
  let corpo = '';
  if (m === 'api') {
    const p = N.provedor || 'brasilnfe', con = s.conectado && s.provedor === p;
    corpo = `<div class="cartao" style="margin-top:4px"><h3 style="margin:0 0 8px">A sua conta no emissor</h3>
      <div class="chips quebra" role="group" aria-label="Emissor">${Object.entries(PROVEDORES).map(([k, x]) => `<button type="button" class="chip" data-nf-prov="${k}" aria-pressed="${p === k}">${x.nome}</button>`).join('')}</div>
      <p class="${con ? 'aviso ok' : 'mudo'}" style="margin:8px 0 12px">${con ? `${ico('check')} Conectado à ${PROVEDORES[p].nome}. O token está guardado no servidor (não aparece aqui).` : 'O certificado A1 e o CSC da SEFAZ você cadastra no painel do seu emissor: aqui só vai o token.'}</p>
      <label class="campo"><span>Token da sua conta ${t(PROVEDORES[p].nome)}</span><input data-nf-token type="password" autocomplete="off" spellcheck="false" maxlength="300" placeholder="${con ? 'Guardado. Cole outro só para trocar' : 'Cole aqui o token'}"><small>${t(PROVEDORES[p].onde)} A nota sai pela sua conta e você paga direto ao seu emissor.</small></label>
      ${ambiente}${emitente(false)}
      <div class="linha-bts" style="margin-top:12px"><button type="button" class="bt cheio" data-nf-conectar>${ico('check')}${con ? 'Salvar' : 'Salvar e conectar'}</button>${con ? '<button type="button" class="bt" data-nf-desconectar>Desconectar</button>' : ''}</div></div>${comum}`;
  } else if (m === 'bluerose') {
    corpo = !brDisp ? '<p class="aviso">Ainda não disponível. Enquanto isso, conecte a conta do seu emissor (Brasil NFe ou Focus NFe) ou marque as notas que você emite no seu PDV.</p>'
      : `<div class="cartao" style="margin-top:4px">${demo ? '<p class="aviso azul" style="margin-bottom:12px">Prévia: esta opção ainda não está à venda. Nada é enviado na demonstração.</p>' : s.adicional ? '' : '<p class="aviso" style="margin-bottom:12px">Adicional Nota fiscal (R$ 59/mês): fale com a Blue Rose para ativar.</p>'}
      ${s.conectado && s.provedor === 'bluerose' ? `<p class="aviso ok">${ico('check')} Restaurante cadastrado no emissor da Blue Rose${N.validadeCert ? ` · certificado até ${t(N.validadeCert)}` : ''}.</p>` : ''}
      ${emitente(true)}
      <h3 style="margin:14px 0 8px">SEFAZ-SP e certificado</h3>
      <div class="grade2"><label class="campo"><span>ID do token (CSC)</span><input data-csc-id inputmode="numeric" maxlength="6" placeholder="Ex.: 000001"></label><label class="campo"><span>Código CSC</span><input data-csc type="password" autocomplete="off" maxlength="40"></label></div>
      <label class="campo"><span>Certificado digital A1 (arquivo .pfx)</span><input data-cert type="file" accept=".pfx,.p12,application/x-pkcs12" style="max-width:100%;min-width:0"><small>Vai direto para o emissor pelo servidor; não fica guardado no Popina.</small></label>
      <label class="campo"><span>Senha do certificado</span><input data-cert-senha type="password" autocomplete="new-password" maxlength="60"></label>
      <div class="grade2"><label class="campo"><span>Série</span><input data-nf-serie inputmode="numeric" maxlength="3" value="${t(N.serie || '1')}"></label><label class="campo"><span>Número inicial</span><input data-nf-num inputmode="numeric" maxlength="9" value="${t(N.numIni || '1')}"><small>Se já emitiu NFC-e antes, o próximo número</small></label></div>
      ${ambiente}<div class="linha-bts" style="margin-top:12px"><button type="button" class="bt cheio" data-nf-bluerose>${ico('check')}Enviar e cadastrar</button></div></div>${comum}`;
  } else if (m === 'outro') {
    corpo = `<p class="mudo">Na conta fechada e em Vendas de hoje aparece "Nota emitida em outro sistema" (com o número, se quiser). No fim do dia, exporte as vendas para o seu emissor ou para o contador.</p>
      <div class="linha-bts" style="margin-top:12px"><button type="button" class="bt cheio" data-nf-exportar>${ico('grafico')}Exportar vendas</button><button type="button" class="bt" data-nf-produtos>${ico('ajustes')}Ajustes do contador</button></div>`;
  } else if (m === 'nao') corpo = '<p class="mudo">Tudo certo: nada de nota fiscal aparece no caixa. Dá para mudar quando quiser.</p>';
  const contador = emite() ? '<p class="mudo" style="margin-top:12px">NFC-e de SP: cancela em até 30 minutos, com motivo. Os códigos fiscais já vêm prontos; peça ao contador para conferir em Ajustes do contador.</p>' : '';
  const guia = g ? `<div class="nf-guia"><div><b>${m ? 'Quer refazer com calma?' : 'Comece por aqui'}</b><small>4 perguntas simples, sem termos de contador.</small></div><button type="button" class="bt cheio grande" data-nf-guia>${ico('check')}Configurar passo a passo</button></div>` : '';
  return `<section class="cartao cfg-sec" id="cfg-nota" style="min-width:0;overflow-wrap:anywhere"><h2>Nota fiscal</h2>${guia}<p class="mudo">Como você emite nota hoje? ${g ? '' : 'Só o dono muda.'}</p>${cartoes}${g ? corpo : ''}${contador}</section>`;
}
export function montarNf(el, redesenhar) {
  if (!servidor) lerStatus().then(() => { if (document.getElementById('cfg-nota')) redesenhar(); });
  const sec = $('#cfg-nota', el); if (!sec) return;
  $$('[data-nf-modo]', sec).forEach((b) => { b.onclick = () => { setNf({ modo: b.dataset.nfModo }); toast(MODOS.find((x) => x[0] === b.dataset.nfModo)[1]); }; });
  $$('[data-nf-prov]', sec).forEach((b) => { b.onclick = () => setNf({ provedor: b.dataset.nfProv }); });
  $$('[data-nf-amb]', sec).forEach((b) => { b.onclick = async () => {
    if (b.dataset.nfAmb === 'producao' && !(await confirma('Emitir valendo (produção)? As notas passam a ter valor fiscal.', 'Sim, valendo'))) return;
    setNf({ ambiente: b.dataset.nfAmb }); if (CONTA && servidor?.conectado && servidor.provedor === nf().provedor) chamar({ acao: 'conectar', provedor: nf().provedor, ambiente: b.dataset.nfAmb }).then(lerStatus);
  }; });
  $('[data-nf-auto]', sec)?.addEventListener('change', (e) => { setNf({ auto: e.target.checked }); toast(e.target.checked ? 'Emitir sozinho: ligado' : 'Emitir sozinho: desligado'); });
  $$('[data-nf-produtos]', sec).forEach((b) => { b.onclick = folhaProdutos; });
  $('[data-nf-guia]', sec)?.addEventListener('click', () => assistenteNf(redesenhar));
  $$('[data-nf-exportar]', sec).forEach((b) => { b.onclick = folhaExportar; });
  const lerEmitente = () => { const e = { ...(nf().emitente || {}) }; $$('[data-e]', sec).forEach((i) => { e[i.dataset.e] = ['cnpj', 'ie', 'cep', 'codMunicipio', 'telefone'].includes(i.dataset.e) ? soDig(i.value) : i.value.trim(); }); return e; };
  $('[data-nf-conectar]', sec)?.addEventListener('click', async (ev) => {
    const tk = $('[data-nf-token]', sec).value.trim(), e = lerEmitente(), p = nf().provedor || 'brasilnfe';
    if (e.cnpj && e.cnpj.length !== 14) return toast('O CNPJ tem 14 números', 'erro');
    if (p === 'focus' && e.cnpj.length !== 14) return toast('A Focus NFe pede o CNPJ do restaurante', 'erro');
    setNf({ emitente: e, provedor: p });
    if (!CONTA) { if (!tk && !nf().conectadoDemo) return toast('Cole o token da sua conta', 'erro'); setNf({ conectadoDemo: true }); servidor = { ...servidor, conectado: true, provedor: p }; toast('Demonstração: conectado (nada foi enviado)'); return redesenhar(); }
    ev.currentTarget.disabled = true;
    const r = await chamar({ acao: 'conectar', provedor: p, token: tk, ambiente: nf().ambiente || 'homologacao' });
    $('[data-nf-token]', sec) && ($('[data-nf-token]', sec).value = '');
    if (!r?.ok) { ev.currentTarget.disabled = false; return toast(r?.erro || r?.mensagem || 'Não deu para conectar', 'erro'); }
    await lerStatus(); toast(`Conectado à ${PROVEDORES[p].nome}`); redesenhar();
  });
  $('[data-nf-desconectar]', sec)?.addEventListener('click', async () => {
    if (!(await confirma('Desconectar a conta do emissor? O token é apagado do servidor.', 'Desconectar', true))) return;
    if (CONTA) await chamar({ acao: 'desconectar' }); else setNf({ conectadoDemo: false });
    await lerStatus(); toast('Desconectado'); redesenhar();
  });
  $('[data-nf-bluerose]', sec)?.addEventListener('click', async (ev) => {
    const e = lerEmitente(); if (e.cnpj.length !== 14) return toast('O CNPJ tem 14 números', 'erro'); if (!e.ie) return toast('Escreva a inscrição estadual', 'erro');
    setNf({ emitente: e, serie: soDig($('[data-nf-serie]', sec).value) || '1', numIni: soDig($('[data-nf-num]', sec).value) || '1' });
    const arq = $('[data-cert]', sec).files?.[0], senha = $('[data-cert-senha]', sec).value, csc = { id: soDig($('[data-csc-id]', sec).value), codigo: $('[data-csc]', sec).value.trim() };
    if (arq && arq.size > 150000) return toast('Este arquivo é grande demais para um certificado A1', 'erro');
    if (arq && !senha) return toast('Escreva a senha do certificado', 'erro');
    if (!CONTA) { toast('Prévia: na conta, isso vai direto para o emissor'); return; }
    ev.currentTarget.disabled = true;
    let certificado = '';
    if (arq) certificado = await new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(String(f.result).split(',')[1] || ''); f.onerror = () => ok(''); f.readAsDataURL(arq); });
    const r = await chamar({ acao: 'bluerose_cadastrar', emitente: { ...e, fantasia: db.config.nome || e.razao, endereco: { cep: e.cep, logradouro: e.logradouro, numero: e.numero, bairro: e.bairro, municipio: e.municipio, codMunicipio: e.codMunicipio } }, csc, certificado, senha, ambiente: nf().ambiente || 'homologacao' });
    certificado = ''; $('[data-cert-senha]', sec).value = ''; $('[data-csc]', sec).value = ''; $('[data-cert]', sec).value = '';
    ev.currentTarget.disabled = false;
    if (!r?.ok) return toast(r?.mensagem || r?.erro || 'Não deu para cadastrar', 'erro');
    if (r.validade) setNf({ validadeCert: r.validade });
    await lerStatus(); toast('Cadastrado no emissor'); redesenhar();
  });
}

// ------------------------------------------------------------------ ações dos botões
const venda = (b) => db.vendas.find((x) => x.id === b.dataset.id);
acao('nf-emitir', (b) => { const v = venda(b); if (v) folhaEmitir(v); });
acao('nf-danfe', (b) => { const v = venda(b); if (v?.nfce) imprimirDanfe(v); });
acao('nf-cancelar', (b) => { const v = venda(b); if (v) cancelarNota(v); });
acao('nf-outro', (b) => { const v = venda(b); if (v) folhaOutro(v); });
acao('nf-exportar', () => folhaExportar());
