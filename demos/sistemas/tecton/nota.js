// Tecton · Nota fiscal no modelo "use o emissor que você já tem" (22/11/2026). Sem custo para a Blue Rose: a nota sai pela
// conta do próprio cliente no emissor dele (ou no PDV/contador dele). Cada ramo vê só o que é dele:
//
//  Loja de material (db.config.nf.modo):
//    api      → a conta da loja num emissor online (Brasil NFe ou Focus NFe). O token vai para a função do servidor
//               (FUNCAO_NF, cifrado lá); certificado A1 e CSC ficam no painel do emissor dela.
//               NFC-e (modelo 65) no balcão para o consumidor; NF-e (modelo 55) para empresa/obra com CNPJ, pela mesma API.
//    outro    → emite no PDV/emissor dela ou pelo contador: marca o número na venda e exporta as vendas (CSV e XML simples).
//    bluerose → "a Blue Rose emite": em breve (só aparece o aviso).
//    nao      → não emite: nada aparece.
//  Construtora e imobiliária (db.config.nf.servico): só "emito no meu emissor/contador" (registra o número da NFS-e ou da
//    nota em cada recebimento e exporta) ou "não emito". O Tecton não emite NFS-e.
//
// Só acrescenta campos: db.config.nf, produto.fiscal, pessoa.fiscal, venda.nf, venda.nfOutro, db.notas (registro das notas
// de serviço) e db.nfDemo (só na demonstração). Nenhum token, certificado, CSC ou senha fica no navegador.
// Na demonstração tudo é simulado (nota de exemplo em homologação, chave com dígito verificador certo).
import { db, grava, CONTA, ramoAtual, acao, ico, t, R$, n2, dataBR, hoje, uid, soma, num, folha, toast, confirma, $, $$, pessoa, nomeDe, imprimir } from './nucleo.js?v=5';
import { gestor, SECOES_CFG, GANCHOS, movimentos } from './comum.js?v=5';
import { qrSVG } from '../base/qr.js';

// ------------------------------------------------------------------ o servidor (configurável: outro agente generaliza a função)
// O cliente chama window.tectonNfce(FUNCAO_NF, { app: APP_NF, acao, ... }) (ponte em ../base/conta-nuvem.js, só no app tecton).
// Contrato esperado da função: ver NOTA-FISCAL.md nesta pasta.
export const FUNCAO_NF = 'nexo-nfce';
export const APP_NF = 'tecton';
const chamar = (body) => (CONTA && window.tectonNfce ? window.tectonNfce(FUNCAO_NF, { app: APP_NF, ...body }) : Promise.resolve({ ok: false, mensagem: 'Entre na conta para usar a nota fiscal.' }));

// ------------------------------------------------------------------ configuração
export const nf = () => db.config.nf || {};
export function setNf(p) { db.config.nf = { ...nf(), ...p }; grava(); }
export const modoNf = () => nf().modo || '';
export const emite = () => modoNf() === 'api'; // o Tecton emite pela conta da loja
export const servico = () => nf().servico || '';
const simples = () => [1, 2, 4].includes(Number(nf().emitente?.crt || 1));
const PROVEDORES = { brasilnfe: { nome: 'Brasil NFe', onde: 'No painel da Brasil NFe: Empresas › a sua empresa › Token da empresa.' }, focus: { nome: 'Focus NFe', onde: 'No painel da Focus NFe: Minhas empresas › a sua empresa › Tokens (use o de homologação para testar).' } };
const MODOS_LOJA = [
  ['api', 'link', 'Tenho conta num emissor online', 'Brasil NFe ou Focus NFe. Você cola o token da sua conta e a nota sai por ela ao receber: NFC-e no balcão e NF-e para empresa ou obra com CNPJ.'],
  ['outro', 'conta', 'Emito no meu PDV, emissor ou pelo contador', 'O Tecton não emite: você anota o número da nota na venda e exporta as vendas do período.'],
  ['bluerose', 'sino', 'Quero que a Blue Rose emita', 'Em breve. Por enquanto, use a conta do seu emissor ou o seu PDV.'],
  ['nao', 'x', 'Não emito nota', 'Nada de nota aparece no balcão.'],
];
const MODOS_SERV = [
  ['outro', 'conta', 'Emito no meu emissor ou pelo contador', 'NFS-e da prefeitura, emissor ou contador. Você anota o número da nota em cada recebimento e exporta para o contador.'],
  ['nao', 'x', 'Não emito nota', 'Nada de nota aparece no financeiro.'],
];
let servidor = null; // status vindo da função (conectado, provedor, ambiente, nfe)
export function lerStatus() {
  if (!CONTA) { servidor = { conectado: !!nf().conectadoDemo, provedor: nf().provedor || null, ambiente: 'homologacao', nfe: true, demo: true }; return Promise.resolve(servidor); }
  return chamar({ acao: 'status' }).then((s) => { servidor = s || {}; return servidor; }).catch(() => (servidor = {}));
}

// ------------------------------------------------------------------ dados fiscais do produto (padrões para material de construção)
// Sugestões comuns no Simples Nacional em SP. Confirme sempre com o seu contador (principalmente quais itens têm ST).
const SUGESTOES = [
  [/cimento/i, { ncm: '25232910', cfop: '5405', cst: '500', cest: '0500100' }],
  [/\bcal\b|cal hidratada/i, { ncm: '25223000', cfop: '5102', cst: '102', cest: '' }],
  [/argamassa/i, { ncm: '38245000', cfop: '5102', cst: '102', cest: '' }],
  [/areia/i, { ncm: '25059000', cfop: '5102', cst: '102', cest: '' }],
  [/brita|pedra/i, { ncm: '25171000', cfop: '5102', cst: '102', cest: '' }],
  [/bloco de concreto/i, { ncm: '68101100', cfop: '5102', cst: '102', cest: '' }],
  [/bloco cer[aâ]mico|tijolo/i, { ncm: '69041000', cfop: '5102', cst: '102', cest: '' }],
  [/vergalh/i, { ncm: '72142000', cfop: '5102', cst: '102', cest: '' }],
  [/arame/i, { ncm: '72172090', cfop: '5102', cst: '102', cest: '' }],
  [/prego/i, { ncm: '73170090', cfop: '5102', cst: '102', cest: '' }],
  [/joelho|conex|luva|t[eê] pvc/i, { ncm: '39174090', cfop: '5405', cst: '500', cest: '1006500' }],
  [/tubo/i, { ncm: '39172300', cfop: '5405', cst: '500', cest: '1006400' }],
  [/fio|cabo el/i, { ncm: '85444900', cfop: '5405', cst: '500', cest: '1200100' }],
  [/disjuntor/i, { ncm: '85362000', cfop: '5405', cst: '500', cest: '1201300' }],
  [/caixa d/i, { ncm: '39251000', cfop: '5405', cst: '500', cest: '1001300' }],
  [/telha/i, { ncm: '68118100', cfop: '5102', cst: '102', cest: '' }],
  [/porcelanato/i, { ncm: '69072100', cfop: '5102', cst: '102', cest: '' }],
  [/piso|revestimento|cer[aâ]mica/i, { ncm: '69072300', cfop: '5102', cst: '102', cest: '' }],
  [/tinta/i, { ncm: '32091010', cfop: '5405', cst: '500', cest: '2400100' }],
  [/rejunte|massa corrida|impermeabiliz/i, { ncm: '32149000', cfop: '5102', cst: '102', cest: '' }],
  [/manta asf/i, { ncm: '68071000', cfop: '5102', cst: '102', cest: '' }],
  [/lona/i, { ncm: '39201099', cfop: '5102', cst: '102', cest: '' }],
  [/carrinho de m/i, { ncm: '87168000', cfop: '5102', cst: '102', cest: '' }],
  [/escora/i, { ncm: '73084000', cfop: '5102', cst: '102', cest: '' }],
];
const PADRAO = { ncm: '', cfop: '5102', cst: '102', cest: '' };
export function sugestaoFiscal(p) {
  const s = { ...(SUGESTOES.find(([r]) => r.test(String(p?.nome || ''))) || [null, PADRAO])[1] };
  if (!simples()) s.cst = s.cst === '500' ? '60' : '00'; // regime normal: CST do ICMS no lugar do CSOSN
  return s;
}
export const fiscalDe = (p) => ({ ...sugestaoFiscal(p), ...(p?.fiscal || {}) });
const semNcm = () => db.produtos.filter((p) => !/^\d{8}$/.test(p.fiscal?.ncm || ''));

// ------------------------------------------------------------------ a venda vira o pedido de nota (neutro: a função traduz para cada emissor)
const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const dig = (s) => String(s || '').replace(/\D/g, '');
const UNF = { sc: 'SC', 'm³': 'M3', 'm²': 'M2', m: 'M', pç: 'PC', br: 'BR', kg: 'KG', lata: 'LATA', bd: 'BALDE', rolo: 'ROLO', lt: 'L', cx: 'CX', un: 'UN' };
const TPAG = { Pix: '17', Dinheiro: '01', 'Cartão de débito': '04', 'Cartão de crédito': '03', Fiado: '05', 'Conta da obra': '05' };
const prod = (id) => db.produtos.find((p) => p.id === id);
// modelo 65 = NFC-e (consumidor, no balcão); 55 = NF-e (empresa ou obra com CNPJ, com destinatário completo)
export function notaDaVenda(v, { modelo = 65, doc = '', dest = null } = {}) {
  const its = (v.itens || []).filter((i) => i.qtd > 0 && i.unit > 0).map((i) => { const f = fiscalDe(prod(i.prod) || { nome: i.nome });
    return { codigo: String(prod(i.prod)?.cod || i.prod || 'item').slice(0, 60), nome: String(i.nome).slice(0, 120), ncm: f.ncm, cfop: f.cfop, cst: f.cst, cest: f.cest || '', cclass: f.cclass || '', cstibs: '',
      un: UNF[i.un] || 'UN', qtd: i.qtd, unit: i.unit, total: r2(i.qtd * i.unit), desc: 0, outro: 0, frete: 0 }; });
  const somaIt = r2(its.reduce((s, i) => s + i.total, 0)), frete = r2(v.frete || 0);
  // arredondamento: a diferença de centavos entre os itens e o total da venda fica no último item
  const dif = r2((v.total || 0) - frete - somaIt);
  if (its.length && Math.abs(dif) >= 0.01 && Math.abs(dif) < 1) { const u = its[its.length - 1]; if (dif < 0) u.desc = r2(-dif); else u.outro = r2(dif); }
  // frete: na NF-e vai como frete (vFrete) rateado; na NFC-e não há grupo de transporte, então entra como "outras despesas"
  if (frete > 0 && somaIt) { let resto = frete; its.forEach((i, k) => { const p = k === its.length - 1 ? resto : r2(frete * i.total / somaIt); if (modelo === 55) i.frete = p; else i.outro = r2(i.outro + p); resto = r2(resto - p); }); }
  const valor = r2(v.total || 0);
  const pagamentos = [{ tpag: TPAG[v.forma] || '99', valor, troco: 0, aPrazo: ['Fiado', 'Conta da obra'].includes(v.forma) }];
  const tent = v.nfTentativas || 0, N = nf();
  const ref = `${String(v.id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40)}-${modelo}${tent ? `-${tent}` : ''}`;
  return { ref, modelo, cpf: dig(doc), itens: its, pagamentos, cnpj: dig(N.emitente?.cnpj || db.config.cnpj), piscofins: N.piscofins || '49',
    ...(modelo === 55 ? { natureza: 'Venda de mercadoria', consumidorFinal: dest?.consumidorFinal !== false, presenca: 1, modFrete: frete > 0 ? 0 : 9, destinatario: dest || null } : {}),
    obs: v.conta ? `Conta da obra: ${(db.contasObra.find((c) => c.id === v.conta)?.obra || '').slice(0, 80)}${v.retirou ? ` · retirou ${String(v.retirou).slice(0, 60)}` : ''}` : '' };
}

// ------------------------------------------------------------------ demonstração: nota de exemplo (chave com dígito verificador certo)
function dv11(s) { let p = 2, sm = 0; for (let k = s.length - 1; k >= 0; k--) { sm += Number(s[k]) * p; p = p === 9 ? 2 : p + 1; } const r = sm % 11; return r < 2 ? 0 : 11 - r; }
function notaDeExemplo(n) {
  const d = new Date(), aamm = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}`;
  db.nfDemo = db.nfDemo || {}; const numero = db.nfDemo[n.modelo] = (db.nfDemo[n.modelo] || 0) + 1;
  const base = `35${aamm}${(n.cnpj || '23456789000110').padStart(14, '0').slice(0, 14)}${n.modelo}001${String(numero).padStart(9, '0')}1${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
  const chave = base + dv11(base);
  return { ok: true, chave, numero, serie: 1, modelo: n.modelo, protocolo: `135${aamm}${String(Date.now()).slice(-9)}`, ambiente: 'homologacao', provedor: 'demo', demo: true,
    qrcode: n.modelo === 65 ? `https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode?p=${chave}|2|2|1|0000000000000000000000000000000000000000` : '',
    url_consulta: n.modelo === 65 ? 'https://www.homologacao.nfce.fazenda.sp.gov.br/consulta' : 'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx', autorizada_em: d.toISOString() };
}

// ------------------------------------------------------------------ emitir, cancelar, marcar em outro sistema
const emAndamento = new Set();
const mudou = () => document.dispatchEvent(new Event('tecton-nota'));
const nomeModelo = (m) => (Number(m) === 55 ? 'NF-e' : 'NFC-e');
export async function emitirNota(v, opc = {}) {
  const modelo = Number(opc.modelo) === 55 ? 55 : 65;
  if (!v) return null;
  if (v.nf?.status === 'autorizada') { toast(`Esta venda já tem ${nomeModelo(v.nf.modelo)}`); return null; }
  if (emAndamento.has(v.id)) return null;
  const n = notaDaVenda(v, { ...opc, modelo });
  const falta = n.itens.find((i) => !/^\d{8}$/.test(i.ncm));
  if (falta) { toast(`Falta o NCM de ${falta.nome}: Configurações › Nota fiscal › Dados fiscais dos produtos`); return null; }
  if (modelo === 55 && (!n.destinatario || ![11, 14].includes(dig(n.destinatario.doc).length))) { toast('A NF-e pede o CPF ou CNPJ do cliente'); return null; }
  emAndamento.add(v.id); toast(`Emitindo a ${nomeModelo(modelo)}...`);
  let r;
  try { r = CONTA ? await chamar({ acao: 'emitir', venda: v.id, nota: n }) : await new Promise((ok) => setTimeout(() => ok(notaDeExemplo(n)), 600)); } catch { r = { ok: false, mensagem: 'Sem internet agora. Tente de novo.' }; }
  emAndamento.delete(v.id);
  const venda = db.vendas.find((x) => x.id === v.id) || v; // pode ter chegado da nuvem no meio
  if (!r?.ok) {
    venda.nfTentativas = (venda.nfTentativas || 0) + (r?.desligado ? 0 : 1); venda.nfErro = { dia: hoje(), modelo, msg: String(r?.mensagem || 'Não foi autorizada').slice(0, 300) }; grava(); mudou();
    toast(r?.desligado ? 'Nota fiscal ainda não ativada no servidor' : `${nomeModelo(modelo)} não saiu: ${venda.nfErro.msg}`); return null;
  }
  venda.nf = { status: 'autorizada', modelo, chave: dig(r.chave).slice(0, 44), numero: r.numero || null, serie: r.serie || null, protocolo: String(r.protocolo || '').slice(0, 30), ambiente: r.ambiente || 'homologacao', provedor: r.provedor || '',
    qrcode: String(r.qrcode || '').slice(0, 1200), url: String(r.url_consulta || '').slice(0, 300), danfe: /^https:\/\//.test(r.url_danfe || '') ? String(r.url_danfe).slice(0, 400) : '',
    autorizada: r.autorizada_em ? new Date(r.autorizada_em).getTime() || Date.now() : Date.now(), doc: n.cpf || dig(n.destinatario?.doc), dest: modelo === 55 ? String(n.destinatario?.nome || '').slice(0, 80) : '', ...(r.demo ? { demo: true } : {}) };
  delete venda.nfErro; grava(); mudou();
  toast(`${nomeModelo(modelo)}${r.numero ? ` nº ${r.numero}` : ''} autorizada${venda.nf.ambiente !== 'producao' ? ' (teste)' : ''}`);
  return venda.nf;
}
const PRAZO_CANC = { 65: 30, 55: 24 * 60 }; // SP: NFC-e em 30 minutos; NF-e em 24 horas
export const minutosParaCancelar = (v) => Math.max(0, PRAZO_CANC[v?.nf?.modelo === 55 ? 55 : 65] - Math.floor((Date.now() - (v?.nf?.autorizada || 0)) / 60e3));
export async function cancelarNota(v) {
  if (v?.nf?.status !== 'autorizada') return;
  const min = minutosParaCancelar(v), nome = nomeModelo(v.nf.modelo);
  if (!min) { toast(`Passou do prazo: fale com o seu contador para cancelar esta ${nome}`); return; }
  const falta = min >= 120 ? `${Math.floor(min / 60)} h` : `${min} min`;
  const { el, fechar } = folha({ titulo: `Cancelar a ${nome}${v.nf.numero ? ` nº ${v.nf.numero}` : ''}?`, corpo: `<p class="mudo" style="margin-bottom:10px">${v.nf.modelo === 55 ? 'A NF-e cancela em até 24 horas' : 'Em SP a NFC-e cancela em até 30 minutos'} (faltam ${falta}). O motivo vai para a SEFAZ.</p>
    <div class="chips" style="margin-bottom:10px">${['Cliente desistiu da compra', 'Venda lançada em duplicidade', 'Erro nos itens ou no valor da venda'].map((m) => `<button type="button" class="chip" data-mot="${t(m)}">${t(m)}</button>`).join('')}</div>
    <label class="campo"><span>Motivo (no mínimo 15 letras)</span><input data-motivo maxlength="255"></label>`,
  pe: `<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt perigo" data-ok>Cancelar a nota</button>` });
  $$('[data-mot]', el).forEach((b) => b.onclick = () => { $('[data-motivo]', el).value = b.dataset.mot; });
  $('[data-ok]', el).onclick = async () => {
    const motivo = $('[data-motivo]', el).value.trim(); if (motivo.length < 15) { toast('Escreva o motivo com pelo menos 15 letras'); return; }
    $('[data-ok]', el).disabled = true;
    let x; try { x = CONTA && !v.nf.demo ? await chamar({ acao: 'cancelar', chave: v.nf.chave, modelo: v.nf.modelo, motivo }) : { ok: true, protocolo: `135${Date.now().toString().slice(-12)}` }; } catch { x = { ok: false, mensagem: 'Sem internet agora.' }; }
    if (!x?.ok) { $('[data-ok]', el).disabled = false; toast(x?.mensagem || 'A SEFAZ não aceitou o cancelamento'); return; }
    v.nf = { ...v.nf, status: 'cancelada', cancelada: { dia: hoje(), motivo, protocolo: String(x.protocolo || '').slice(0, 30) } }; grava(); mudou(); fechar(); toast(`${nome} cancelada`);
  };
}

// ------------------------------------------------------------------ a janela da nota de uma venda
const docDe = (pid) => dig(pessoa(pid)?.doc);
export const modeloSugerido = (v) => (docDe(v.cliente).length === 14 || v.forma === 'Conta da obra' ? 55 : 65);
function destinatarioDe(pid) {
  const p = pessoa(pid) || {}, f = p.fiscal || {}, [cid, uf] = String(p.cidade || '').split('/');
  return { doc: p.doc || '', nome: f.razao || p.nome || '', ie: f.ie || '', contribuinte: f.contribuinte || (dig(p.doc).length === 14 ? (f.ie ? '1' : '9') : '9'), email: p.email || '', logradouro: f.logradouro || p.endereco || '', numero: f.numero || '', bairro: f.bairro || '',
    municipio: f.municipio || (cid || '').trim(), uf: f.uf || (uf || db.config.uf || 'SP').trim(), cep: f.cep || '', codMunicipio: f.codMunicipio || '', consumidorFinal: f.consumidorFinal !== false };
}
const vv = (o, k) => t(o?.[k] || '');
export function folhaNota(v, modeloIni) {
  if (!v) return;
  if (v.nf?.status === 'autorizada' || v.nf?.status === 'cancelada') return folhaStatus(v);
  let modelo = Number(modeloIni) || modeloSugerido(v);
  const D = destinatarioDe(v.cliente), teste = !CONTA || nf().ambiente !== 'producao';
  const destHtml = () => `<div data-dest ${modelo === 55 ? '' : 'hidden'}><p class="forte" style="margin:6px 0">Para quem vai a NF-e</p>
    <div class="campos"><label class="campo"><span>CNPJ ou CPF</span><input data-d="doc" inputmode="numeric" maxlength="18" value="${vv(D, 'doc')}"></label><label class="campo"><span>Razão social ou nome</span><input data-d="nome" maxlength="60" value="${vv(D, 'nome')}"></label>
    <label class="campo"><span>Inscrição estadual</span><input data-d="ie" maxlength="14" value="${vv(D, 'ie')}" placeholder="Vazio se não tiver"></label><label class="campo"><span>Contribuinte do ICMS?</span><select data-d="contribuinte">${[['1', 'Sim, tem IE'], ['2', 'Isento de IE'], ['9', 'Não contribuinte']].map(([k, n]) => `<option value="${k}" ${D.contribuinte === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="campo largo"><span>Rua</span><input data-d="logradouro" maxlength="60" value="${vv(D, 'logradouro')}"></label><label class="campo"><span>Número</span><input data-d="numero" maxlength="10" value="${vv(D, 'numero')}"></label><label class="campo"><span>Bairro</span><input data-d="bairro" maxlength="60" value="${vv(D, 'bairro')}"></label>
    <label class="campo"><span>Cidade</span><input data-d="municipio" maxlength="60" value="${vv(D, 'municipio')}"></label><label class="campo"><span>UF</span><input data-d="uf" maxlength="2" value="${vv(D, 'uf')}"></label>
    <label class="campo"><span>CEP</span><input data-d="cep" inputmode="numeric" maxlength="9" value="${vv(D, 'cep')}"></label><label class="campo"><span>Código IBGE da cidade</span><input data-d="codMunicipio" inputmode="numeric" maxlength="7" value="${vv(D, 'codMunicipio')}"><small>7 números (ex.: São Paulo 3550308)</small></label>
    <label class="liga largo">Material para uso na obra do cliente (consumidor final)<input type="checkbox" data-d-cf ${D.consumidorFinal ? 'checked' : ''}></label></div></div>`;
  const { el, fechar } = folha({ titulo: `Nota fiscal · ${R$(v.total)}`, corpo: `<p class="mudo" style="margin-bottom:10px">${dataBR(v.dia)} · ${t(v.cliente ? nomeDe(v.cliente) : 'Cliente do balcão')} · ${t(v.forma)}</p>
    <div class="chips" role="group" aria-label="Tipo de nota" style="margin-bottom:12px">${[[65, 'NFC-e (consumidor, no balcão)'], [55, 'NF-e (empresa ou obra com CNPJ)']].map(([k, n]) => `<button type="button" class="chip" data-mod="${k}" aria-pressed="${modelo === k}">${n}</button>`).join('')}</div>
    <label class="campo" data-cpf-box ${modelo === 65 ? '' : 'hidden'}><span>CPF ou CNPJ na nota (opcional)</span><input data-cpf inputmode="numeric" maxlength="18" value="${t(docDe(v.cliente) ? pessoa(v.cliente).doc : '')}" placeholder="Só se o cliente pedir" autocomplete="off"></label>
    ${destHtml()}
    ${teste ? `<p class="aviso-box">${ico('sino')}<span>${CONTA ? 'Ambiente de teste (homologação): a nota não tem valor fiscal.' : 'Demonstração: sai uma nota de exemplo, em ambiente de teste (sem valor fiscal). Nada é enviado.'}</span></p>` : ''}
    ${modelo === 55 && CONTA && servidor && servidor.nfe === false ? '<p class="aviso-box">O seu emissor ainda não liberou NF-e por esta conexão: emita no painel dele.</p>' : ''}
    ${v.nfErro ? `<p class="aviso-box" style="background:var(--perigo-suave);color:var(--perigo)">Última tentativa: ${t(v.nfErro.msg)}</p>` : ''}`,
  pe: `<button type="button" class="bt" data-fechar>Agora não</button><button type="button" class="bt cheio" data-ok>${ico('check')}Emitir</button>` });
  $$('[data-mod]', el).forEach((b) => b.onclick = () => { modelo = Number(b.dataset.mod); $$('[data-mod]', el).forEach((x) => x.setAttribute('aria-pressed', x === b)); $('[data-dest]', el).hidden = modelo !== 55; $('[data-cpf-box]', el).hidden = modelo !== 65; });
  $('[data-ok]', el).onclick = async () => {
    let opc = { modelo };
    if (modelo === 65) { const c = dig($('[data-cpf]', el).value); if (c && c.length !== 11 && c.length !== 14) { toast('Escreva o CPF (11 números) ou o CNPJ (14)'); return; } opc.doc = c; }
    else {
      const d = {}; $$('[data-d]', el).forEach((i) => { d[i.dataset.d] = ['doc', 'cep', 'codMunicipio'].includes(i.dataset.d) ? dig(i.value) : i.value.trim(); }); d.uf = (d.uf || '').toUpperCase(); d.consumidorFinal = $('[data-d-cf]', el).checked;
      if (![11, 14].includes(d.doc.length)) { toast('O CNPJ tem 14 números (CPF, 11)'); return; }
      if (!d.nome || !d.logradouro || !d.municipio || d.uf.length !== 2) { toast('A NF-e pede nome, rua, cidade e UF do cliente'); return; }
      if (d.contribuinte === '1' && !d.ie) { toast('Contribuinte do ICMS: escreva a inscrição estadual'); return; }
      const p = pessoa(v.cliente); if (p) { p.fiscal = { ...(p.fiscal || {}), razao: d.nome, ie: d.ie, contribuinte: d.contribuinte, logradouro: d.logradouro, numero: d.numero, bairro: d.bairro, municipio: d.municipio, uf: d.uf, cep: d.cep, codMunicipio: d.codMunicipio, consumidorFinal: d.consumidorFinal }; if (!p.doc) p.doc = d.doc; }
      opc.dest = d;
    }
    $('[data-ok]', el).disabled = true; const ok = await emitirNota(v, opc); if (!ok) { $('[data-ok]', el).disabled = false; return; }
    fechar(); imprimirDanfe(v);
  };
}
function folhaStatus(v) {
  const n = v.nf, nome = nomeModelo(n.modelo), min = minutosParaCancelar(v);
  folha({ titulo: `${nome}${n.numero ? ` nº ${n.numero}` : ''}`, corpo: `<p>${n.status === 'cancelada' ? `<span class="et erro">cancelada</span> ${t(n.cancelada?.motivo || '')}` : `<span class="et ok">${ico('check')}autorizada${n.ambiente !== 'producao' ? ' · teste' : ''}</span>`}</p>
    <p class="mudo peq" style="margin-top:8px;word-break:break-all">Chave ${t(grupos(n.chave))}</p>${n.dest ? `<p class="mudo peq">Para: ${t(n.dest)}</p>` : ''}${n.protocolo ? `<p class="mudo peq">Protocolo ${t(n.protocolo)}</p>` : ''}
    ${n.status === 'autorizada' && min ? `<p class="mudo peq" style="margin-top:8px">Dá para cancelar por mais ${min >= 120 ? `${Math.floor(min / 60)} h` : `${min} min`}.</p>` : ''}`,
  pe: `<button type="button" class="bt" data-fechar>Fechar</button>${n.status === 'autorizada' && min ? `<button type="button" class="bt perigo" data-acao="nf-cancelar" data-id="${t(v.id)}">Cancelar a nota</button>` : ''}<button type="button" class="bt cheio" data-acao="nf-danfe" data-id="${t(v.id)}">${ico('imprimir')}${n.modelo === 55 ? 'DANFE' : 'DANFE NFC-e'}</button>` });
}
function folhaOutro(v) {
  folha({ titulo: 'Nota emitida no seu emissor', corpo: `<p class="mudo" style="margin-bottom:10px">${dataBR(v.dia)} · ${t(v.cliente ? nomeDe(v.cliente) : 'Cliente do balcão')} · ${R$(v.total)}</p><label class="campo"><span>Número ou chave da nota (opcional)</span><input data-ref maxlength="60" value="${t(v.nfOutro?.ref || '')}" placeholder="Ex.: 1234 ou a chave de 44 números"></label><p class="mudo peq">Serve para você e o contador saberem quais vendas já têm nota.</p>`,
    pe: `${v.nfOutro ? '<button type="button" class="bt" data-tirar>Desmarcar</button>' : '<button type="button" class="bt" data-fechar>Voltar</button>'}<button type="button" class="bt cheio" data-ok>${ico('check')}Marcar</button>`,
    aoAbrir: (f, fechar) => {
      $('[data-ok]', f).onclick = () => { v.nfOutro = { ref: $('[data-ref]', f).value.trim().slice(0, 60), dia: hoje() }; grava(); mudou(); fechar(); toast('Venda marcada com nota'); };
      $('[data-tirar]', f)?.addEventListener('click', () => { delete v.nfOutro; grava(); mudou(); fechar(); toast('Marca tirada'); });
    } });
}

// ------------------------------------------------------------------ o que aparece no balcão e na lista de vendas
// no "Receber": a escolha da nota (só no modo api); devolve { html, ler(el) }
export function escolhaNoReceber(cliente, forma) {
  if (!emite()) return { html: '', ler: () => null };
  const doc = docDe(cliente), padrao = doc.length === 14 || forma === 'Conta da obra' ? '55' : nf().auto ? '65' : 'depois';
  return { html: `<p class="forte" style="margin:4px 0 6px">Nota fiscal</p><div class="chips" style="margin-bottom:8px" role="group" aria-label="Nota fiscal">${[['65', 'NFC-e agora'], ['55', 'NF-e (empresa)'], ['depois', 'Sem nota agora']].map(([k, n]) => `<button type="button" class="chip" data-nfm="${k}" aria-pressed="${k === padrao}">${n}</button>`).join('')}</div>
    <label class="campo" data-nfcpf ${padrao === '65' ? '' : 'hidden'}><span>CPF ou CNPJ na NFC-e (opcional)</span><input data-nfdoc inputmode="numeric" maxlength="18" value="${doc.length === 11 ? t(pessoa(cliente).doc) : ''}" placeholder="Só se o cliente pedir" autocomplete="off"></label>
    <p class="mudo peq" data-nfnfe ${padrao === '55' ? '' : 'hidden'}>Depois de receber, abre a NF-e com os dados do cliente para conferir.</p>`,
  ler: (el) => { const b = $('[data-nfm][aria-pressed="true"]', el); return b ? { modelo: b.dataset.nfm, doc: dig($('[data-nfdoc]', el)?.value) } : null; },
  montar: (el) => $$('[data-nfm]', el).forEach((b) => b.onclick = () => { $$('[data-nfm]', el).forEach((x) => x.setAttribute('aria-pressed', x === b)); $('[data-nfcpf]', el).hidden = b.dataset.nfm !== '65'; $('[data-nfnfe]', el).hidden = b.dataset.nfm !== '55'; }) };
}
// depois de "Recebido": emite a NFC-e na hora ou abre a NF-e; devolve true se já imprimiu o DANFE
export async function aposReceber(v, escolha, imprimirJunto) {
  if (!emite() || !escolha || escolha.modelo === 'depois') return false;
  if (escolha.modelo === '55') { folhaNota(v, 55); return true; }
  if (escolha.doc && ![11, 14].includes(escolha.doc.length)) { toast('CPF ou CNPJ incompleto: emita pela lista de vendas'); return false; }
  const ok = await emitirNota(v, { modelo: 65, doc: escolha.doc });
  if (ok && imprimirJunto) { imprimirDanfe(v); return true; }
  return false;
}
export function etiquetaNota(v) {
  if (v.nf?.status === 'autorizada') return `<span class="et ok">${nomeModelo(v.nf.modelo)}${v.nf.numero ? ` nº ${v.nf.numero}` : ''}${v.nf.ambiente !== 'producao' ? ' (teste)' : ''}</span>`;
  if (v.nf?.status === 'cancelada') return `<span class="et erro">${nomeModelo(v.nf.modelo)} cancelada</span>`;
  if (v.nfOutro) return `<span class="et ok">nota ${t(v.nfOutro.ref || 'no emissor')}</span>`;
  if (v.nfErro && emite()) return '<span class="et erro">nota não saiu</span>';
  return '';
}
export function botaoNota(v) {
  const m = modoNf(); if (!['api', 'outro'].includes(m)) return '';
  if (m === 'outro' && !v.nf) return `<button type="button" class="bt pq" data-acao="nf-outro" data-id="${t(v.id)}" aria-label="Nota emitida no seu emissor">${ico('doc')}Nota</button>`;
  return `<button type="button" class="bt pq" data-acao="nf-venda" data-id="${t(v.id)}" aria-label="${v.nf ? 'Ver a nota' : 'Emitir a nota'}">${ico('doc')}${v.nf ? 'Nota' : 'Emitir nota'}</button>`;
}
export const avisoDevolucao = (v) => (v?.nf?.status === 'autorizada' ? `<p class="aviso-box">${ico('doc')}<span>Esta venda tem ${nomeModelo(v.nf.modelo)}. Para devolução com nota, emita a nota de devolução (entrada) no painel do seu emissor ou peça ao contador.</span></p>` : '');

// ------------------------------------------------------------------ DANFE: NFC-e em 80 mm com o QR; NF-e em A4 (resumo, o PDF oficial vem do emissor)
const grupos = (ch) => String(ch || '').replace(/(\d{4})(?=\d)/g, '$1 ');
const dataHora = (ts) => new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const cnpjFmt = (s) => { const d = dig(s); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : s || '—'; };
function htmlDanfe65(v) {
  const n = v.nf || {}, E = nf().emitente || {}, nota = notaDaVenda(v, { modelo: 65, doc: n.doc }), teste = n.ambiente !== 'producao';
  const outro = r2(nota.itens.reduce((s, i) => s + i.outro, 0)), desc = r2(nota.itens.reduce((s, i) => s + i.desc, 0)), bruto = r2(nota.itens.reduce((s, i) => s + i.total, 0));
  const end = [E.logradouro && `${E.logradouro}, ${E.numero || 'S/N'}`, E.bairro, E.municipio && `${E.municipio} - ${E.uf || 'SP'}`].filter(Boolean).join(' · ') || db.config.endereco || '';
  return `<div class="danfe">
    <p class="c"><b>${t(E.razao || db.config.nome || 'Loja')}</b></p><p class="c">CNPJ ${t(cnpjFmt(E.cnpj || db.config.cnpj))}${E.ie ? ` · IE ${t(E.ie)}` : ''}</p>${end ? `<p class="c">${t(end)}</p>` : ''}
    <hr><p class="c"><b>DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</b></p>${teste ? '<p class="c"><b>EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL</b></p>' : ''}<hr>
    <table><tr><td><small>Código · Descrição · Qtde · Un · Vl Unit</small></td><td class="n"><small>Vl Total</small></td></tr>
    ${nota.itens.map((i) => `<tr><td>${t(i.codigo.slice(0, 14))} ${t(i.nome)}<br><small>${n2(i.qtd, 3)} ${i.un} × ${R$(i.unit)}</small></td><td class="n">${R$(i.total)}</td></tr>`).join('')}</table><hr>
    <table><tr><td>Qtde. total de itens</td><td class="n">${nota.itens.length}</td></tr><tr><td>Valor total R$</td><td class="n">${R$(bruto)}</td></tr>
      ${desc ? `<tr><td>Desconto R$</td><td class="n">− ${R$(desc)}</td></tr>` : ''}${outro ? `<tr><td>Acréscimos (frete) R$</td><td class="n">${R$(outro)}</td></tr>` : ''}
      <tr class="g"><td>Valor a pagar R$</td><td class="n">${R$(v.total)}</td></tr><tr><td><small>FORMA DE PAGAMENTO</small></td><td class="n"><small>VALOR PAGO R$</small></td></tr>
      <tr><td>${t(['Fiado', 'Conta da obra'].includes(v.forma) ? 'Crédito loja' : v.forma)}</td><td class="n">${R$(v.total)}</td></tr></table><hr>
    <p class="c"><b>Consulte pela Chave de Acesso em</b><br><small style="word-break:break-all">${t(n.url || 'https://www.nfce.fazenda.sp.gov.br/consulta')}</small></p>
    <p class="c" style="word-spacing:2px">${grupos(n.chave)}</p><hr>
    <p class="c">${n.doc ? `CONSUMIDOR ${n.doc.length === 14 ? 'CNPJ' : 'CPF'}: ${t(cnpjFmt(n.doc))}` : 'CONSUMIDOR NÃO IDENTIFICADO'}</p><hr>
    <p class="c"><b>NFC-e nº ${String(n.numero || '').padStart(9, '0')} Série ${String(n.serie || 1).padStart(3, '0')} ${t(dataHora(n.autorizada || Date.now()))}</b></p>
    <p class="c">Protocolo de autorização: ${t(n.protocolo || '')}<br>Data de autorização: ${t(dataHora(n.autorizada || Date.now()))}</p>
    ${n.qrcode ? `<div class="c qr">${qrSVG(n.qrcode, 150, '#000')}</div>` : ''}${teste ? '<p class="c"><b>SEM VALOR FISCAL</b></p>' : ''}${n.status === 'cancelada' ? '<p class="c"><b>NOTA CANCELADA</b></p>' : ''}</div>`;
}
function htmlResumo55(v) {
  const n = v.nf || {}, nota = notaDaVenda(v, { modelo: 55, dest: { consumidorFinal: true } }), fr = r2(nota.itens.reduce((s, i) => s + i.frete, 0));
  return `<p><b>NF-e nº ${String(n.numero || '').padStart(9, '0')} · Série ${String(n.serie || 1).padStart(3, '0')}</b> · autorizada em ${t(dataHora(n.autorizada || Date.now()))}${n.ambiente !== 'producao' ? ' · <b>HOMOLOGAÇÃO, SEM VALOR FISCAL</b>' : ''}${n.status === 'cancelada' ? ' · <b>CANCELADA</b>' : ''}</p>
    <p><b>Chave de acesso:</b> ${t(grupos(n.chave))}<br><b>Protocolo:</b> ${t(n.protocolo || '')}</p><p><b>Destinatário:</b> ${t(n.dest || nomeDe(v.cliente))} · ${t(cnpjFmt(n.doc))}</p>
    <table><thead><tr><th>Produto</th><th>NCM</th><th>CFOP</th><th class="n">Qtd.</th><th class="n">Unitário</th><th class="n">Total</th></tr></thead><tbody>${nota.itens.map((i) => `<tr><td>${t(i.nome)}</td><td>${t(i.ncm)}</td><td>${t(i.cfop)}</td><td class="n">${n2(i.qtd, 3)} ${t(i.un)}</td><td class="n">${R$(i.unit)}</td><td class="n">${R$(i.total)}</td></tr>`).join('')}${fr ? `<tr><td>Frete</td><td></td><td></td><td></td><td></td><td class="n">${R$(fr)}</td></tr>` : ''}</tbody></table>
    <p class="tot">Total da nota: ${R$(v.total)}</p><p>Consulte em ${t(n.url || 'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx')}</p>`;
}
export function imprimirDanfe(v) {
  const n = v?.nf; if (!n) return;
  if (n.modelo === 55) {
    if (n.danfe && !n.demo) { window.open(n.danfe, '_blank', 'noopener'); return; } // o PDF oficial do DANFE, gerado pelo emissor
    imprimir(`Resumo da NF-e${n.numero ? ` nº ${n.numero}` : ''}`, htmlResumo55(v), 'Resumo para conferência. O DANFE oficial em PDF sai no painel do seu emissor.');
    return;
  }
  const el = document.getElementById('impressao'); if (!el) return;
  let pg = document.getElementById('pagina-80'); if (!pg) { pg = document.createElement('style'); pg.id = 'pagina-80'; document.head.append(pg); }
  pg.textContent = '@media print{@page{size:80mm auto;margin:3mm 2mm}}';
  el.innerHTML = htmlDanfe65(v);
  const fim = () => { pg.textContent = ''; removeEventListener('afterprint', fim); };
  addEventListener('afterprint', fim);
  setTimeout(() => { try { window.print(); } catch { toast('Este navegador não deixou imprimir'); } }, 60);
}

// ------------------------------------------------------------------ exportar (CSV e XML simples) para o emissor ou o contador
const PERIODOS = [['hoje', 'Hoje'], ['7', 'Últimos 7 dias'], ['mes', 'Este mês'], ['mespassado', 'Mês passado']];
function intervalo(k) {
  const h = hoje(), [a, m] = h.split('-').map(Number), ini = (y, mm) => `${y}-${String(mm).padStart(2, '0')}-01`;
  if (k === '7') { const d = new Date(h + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 6); return [d.toISOString().slice(0, 10), h]; }
  if (k === 'mes') return [ini(a, m), h];
  if (k === 'mespassado') { const pa = m === 1 ? a - 1 : a, pm = m === 1 ? 12 : m - 1; const fim = new Date(Date.UTC(a, m - 1, 0)).toISOString().slice(0, 10); return [ini(pa, pm), fim]; }
  return [h, h];
}
const csvCel = (s) => { const x = String(s ?? ''); return /[;"\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
const nro = (n) => (Number(n) || 0).toFixed(2).replace('.', ',');
const xmlEsc = (s) => String(s ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
const situacao = (v) => (v.nf?.status === 'autorizada' ? `${nomeModelo(v.nf.modelo)} autorizada` : v.nf?.status === 'cancelada' ? `${nomeModelo(v.nf.modelo)} cancelada` : v.nfOutro ? 'nota no emissor' : 'sem nota');
const temNota = (v) => v.nf?.status === 'autorizada' || !!v.nfOutro;
function baixar(nome, texto, tipo) {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo })), a = document.createElement('a');
  a.href = url; a.download = nome; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const arq = (base, per, ext) => `${base}-${(db.config.nome || 'tecton').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 30)}-${per}-${hoje()}.${ext}`;
export function csvVendas(vendas) {
  const cab = ['Data', 'Venda', 'Cliente', 'CPF/CNPJ', 'Produto', 'Código', 'NCM', 'CFOP', 'CSOSN/CST', 'CEST', 'Qtde', 'Unidade', 'Valor unitário', 'Valor do item', 'Frete/acréscimo do item', 'Total da venda', 'Pagamento', 'Nota (número/chave)', 'Situação'];
  const linhas = [];
  for (const v of vendas) {
    const n = notaDaVenda(v, { modelo: 65 }), nota = v.nf ? `${v.nf.numero || ''} ${v.nf.chave || ''}`.trim() : v.nfOutro?.ref || '';
    for (const i of n.itens) linhas.push([dataBR(v.dia), v.id, v.cliente ? nomeDe(v.cliente) : 'Cliente do balcão', v.nf?.doc || docDe(v.cliente), i.nome, i.codigo, i.ncm, i.cfop, i.cst, i.cest, n2(i.qtd, 3), i.un, nro(i.unit), nro(i.total), nro(i.outro), nro(v.total), v.forma, nota, situacao(v)]);
  }
  return '﻿' + [cab, ...linhas].map((l) => l.map(csvCel).join(';')).join('\r\n');
}
export function xmlVendas(vendas, de, ate) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Vendas do Tecton para lançar no emissor ou mandar ao contador. NÃO é documento fiscal. -->\n<vendasTecton versao="1" loja="${xmlEsc(nf().emitente?.razao || db.config.nome || '')}" cnpj="${dig(nf().emitente?.cnpj || db.config.cnpj)}" de="${de}" ate="${ate}" gerado="${new Date().toISOString()}">\n${vendas.map((v) => {
    const n = notaDaVenda(v, { modelo: 65 }), doc = v.nf?.doc || docDe(v.cliente);
    return `  <venda id="${xmlEsc(v.id)}" data="${v.dia}" total="${r2(v.total).toFixed(2)}" frete="${r2(v.frete || 0).toFixed(2)}" pagamento="${xmlEsc(v.forma)}" situacao="${xmlEsc(situacao(v))}"${v.cliente ? ` cliente="${xmlEsc(nomeDe(v.cliente))}"` : ''}${doc ? ` doc="${doc}"` : ''}${v.nf?.chave ? ` chave="${v.nf.chave}" modelo="${v.nf.modelo}"` : ''}${v.nfOutro?.ref ? ` notaEmissor="${xmlEsc(v.nfOutro.ref)}"` : ''}>\n${n.itens.map((i) => `    <item codigo="${xmlEsc(i.codigo)}" descricao="${xmlEsc(i.nome)}" ncm="${i.ncm}" cfop="${i.cfop}" csosn="${i.cst}"${i.cest ? ` cest="${i.cest}"` : ''} un="${i.un}" qtd="${i.qtd}" vUnit="${r2(i.unit).toFixed(2)}" vProd="${i.total.toFixed(2)}" vOutro="${i.outro.toFixed(2)}" vDesc="${i.desc.toFixed(2)}"/>`).join('\n')}\n    <pagamento tPag="${n.pagamentos[0].tpag}" vPag="${n.pagamentos[0].valor.toFixed(2)}"/>\n  </venda>`;
  }).join('\n')}\n</vendasTecton>\n`;
}
export function folhaExportar() {
  let per = 'hoje', soSem = false;
  const lista = () => { const [de, ate] = intervalo(per); return db.vendas.filter((v) => v.dia >= de && v.dia <= ate && (!soSem || !temNota(v))).sort((a, b) => a.dia.localeCompare(b.dia)); };
  const resumo = () => { const l = lista(); return `${l.length} vendas · ${R$(soma(l, (v) => v.total))}`; };
  folha({ titulo: 'Exportar vendas', corpo: `<p class="mudo" style="margin-bottom:10px">Para lançar no seu emissor ou mandar ao contador. O CSV abre no Excel (uma linha por item, com NCM, CFOP e CSOSN).</p>
      <div class="chips" role="group" aria-label="Período">${PERIODOS.map(([k, n]) => `<button type="button" class="chip" data-per="${k}" aria-pressed="${k === per}">${n}</button>`).join('')}</div>
      <label class="liga">Só as vendas sem nota<input type="checkbox" data-sosem></label><p class="forte" data-resumo style="margin-top:8px">${resumo()}</p>`,
  pe: `<button type="button" class="bt" data-xml>${ico('doc')}XML simples</button><button type="button" class="bt cheio" data-csv>${ico('doc')}Baixar CSV</button>`,
  aoAbrir: (f) => {
    const atual = () => { $('[data-resumo]', f).textContent = resumo(); };
    $$('[data-per]', f).forEach((b) => { b.onclick = () => { per = b.dataset.per; $$('[data-per]', f).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); atual(); }; });
    $('[data-sosem]', f).onchange = (e) => { soSem = e.target.checked; atual(); };
    $('[data-csv]', f).onclick = () => { const l = lista(); if (!l.length) return toast('Nada para exportar neste período'); baixar(arq('vendas', per, 'csv'), csvVendas(l), 'text/csv;charset=utf-8'); toast('CSV baixado'); };
    $('[data-xml]', f).onclick = () => { const l = lista(); if (!l.length) return toast('Nada para exportar neste período'); const [de, ate] = intervalo(per); baixar(arq('vendas', per, 'xml'), xmlVendas(l, de, ate), 'application/xml'); toast('XML baixado'); };
  } });
}

// ------------------------------------------------------------------ dados fiscais dos produtos
const CFOP_OP = [['5102', '5102 · revenda (material comum)'], ['5405', '5405 · revenda com ICMS já pago antes (ST: cimento, tinta, PVC, elétrico)'], ['5101', '5101 · venda de produção própria']];
const CST_OP = () => (simples() ? [['102', '102 · Simples, sem crédito'], ['500', '500 · ICMS já cobrado antes (ST)'], ['103', '103 · isento no Simples'], ['400', '400 · não tributada']]
  : [['00', '00 · tributada integralmente'], ['60', '60 · ICMS cobrado antes (ST)'], ['40', '40 · isenta'], ['41', '41 · não tributada']]);
export function folhaProdutos() {
  let q = '';
  const linha = (p) => { const f = fiscalDe(p), sug = !p.fiscal?.ncm;
    return `<div class="cartao nf-prod" data-p="${t(p.id)}"><b>${t(p.nome)}</b>${sug ? ` <span class="et ${f.ncm ? 'info' : 'erro'}">${f.ncm ? 'sugestão' : 'falta o NCM'}</span>` : ''}
      <div class="campos" style="margin-top:8px"><label class="campo"><span>NCM</span><input data-ncm inputmode="numeric" maxlength="10" value="${t(f.ncm)}" placeholder="8 números"></label><label class="campo"><span>CEST (se tiver ST)</span><input data-cest inputmode="numeric" maxlength="9" value="${t(f.cest || '')}"></label>
      <label class="campo"><span>CFOP</span><select data-cfop>${CFOP_OP.map(([k, n]) => `<option value="${k}" ${f.cfop === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="campo"><span>${simples() ? 'CSOSN' : 'CST do ICMS'}</span><select data-cst>${CST_OP().map(([k, n]) => `<option value="${k}" ${f.cst === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div></div>`; };
  const corpo = () => db.produtos.filter((p) => !q || p.nome.toLowerCase().includes(q)).map(linha).join('') || '<p class="mudo">Nenhum produto. Cadastre em Estoque.</p>';
  folha({ titulo: 'Dados fiscais dos produtos', larga: true, corpo: `<p class="aviso-box">${ico('sino')}<span>Já vem com padrões comuns para material de construção no ${simples() ? 'Simples Nacional' : 'regime normal'}. <b>Confirme com o seu contador</b> (principalmente o NCM e quais itens têm ST) antes de emitir valendo.</span></p>
      <input class="ent" type="search" data-q placeholder="Procurar produto" aria-label="Procurar produto" style="margin:8px 0">
      <div data-lista>${corpo()}</div>`,
  pe: `<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio" data-ok>${ico('check')}Salvar</button>`,
  aoAbrir: (f, fechar) => {
    const salvar = () => { let ruim = '';
      $$('[data-p]', f).forEach((c) => { const p = prod(c.dataset.p); if (!p) return; const ncm = dig($('[data-ncm]', c).value);
        if (ncm && ncm.length !== 8) { ruim ||= p.nome; return; }
        if (!ncm && !p.fiscal) return;
        p.fiscal = { ...(p.fiscal || {}), ncm, cest: dig($('[data-cest]', c).value).slice(0, 7), cfop: $('[data-cfop]', c).value, cst: $('[data-cst]', c).value }; });
      grava(); return ruim; };
    $('[data-q]', f).oninput = (e) => { salvar(); q = e.target.value.trim().toLowerCase(); $('[data-lista]', f).innerHTML = corpo(); };
    $('[data-ok]', f).onclick = () => { const ruim = salvar(); if (ruim) return toast(`O NCM tem 8 números: confira ${ruim}`); fechar(); toast('Dados fiscais salvos'); };
  } });
}

// ------------------------------------------------------------------ construtora e imobiliária: registro das notas emitidas fora (NFS-e)
const notas = () => (db.notas ||= []);
export const notaDoMov = (id) => notas().find((x) => x.mov === id);
export function registrarNota(pre = {}) {
  const recs = movimentos().filter((m) => m.tipo === 'receber' && (m.pago || m.venc <= hoje())).sort((a, b) => String(b.pago || b.venc).localeCompare(String(a.pago || a.venc))).slice(0, 60);
  const ant = pre.id ? notas().find((x) => x.id === pre.id) : null, x = { tipo: 'NFS-e', dia: hoje(), ...pre, ...(ant || {}) };
  const mv = x.mov ? movimentos().find((m) => m.id === x.mov) : null;
  const { el, fechar } = folha({ titulo: ant ? 'Nota registrada' : 'Registrar nota emitida', corpo: `<p class="mudo" style="margin-bottom:10px">O Tecton não emite NFS-e: aqui você anota a nota que saiu no seu emissor, na prefeitura ou pelo contador.</p>
    <div class="campos"><label class="campo"><span>Tipo</span><select data-n="tipo">${['NFS-e', 'NF-e', 'Recibo', 'Outra'].map((k) => `<option ${x.tipo === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
    <label class="campo"><span>Número da nota</span><input data-n="numero" maxlength="30" value="${t(x.numero || '')}" placeholder="Ex.: 2026/158"></label>
    <label class="campo"><span>Data de emissão</span><input type="date" data-n="dia" value="${t(x.dia)}"></label><label class="campo"><span>Valor (R$)</span><input data-n="valor" inputmode="decimal" value="${x.valor ? n2(x.valor) : mv ? n2(mv.valor) : ''}"></label>
    <label class="campo largo"><span>Referente a (opcional)</span><select data-n="mov"><option value="">— nenhum recebimento —</option>${recs.map((m) => `<option value="${t(m.id)}" ${m.id === x.mov ? 'selected' : ''}>${t(m.desc)} · ${R$(m.valor)}${m.pago ? ` · recebido ${dataBR(m.pago)}` : ''}${notaDoMov(m.id) && notaDoMov(m.id) !== ant ? ' · já tem nota' : ''}</option>`).join('')}</select></label>
    <label class="campo"><span>Tomador (cliente)</span><input data-n="tomador" maxlength="80" value="${t(x.tomador || (mv?.pessoa ? nomeDe(mv.pessoa) : ''))}"></label><label class="campo"><span>CPF ou CNPJ do tomador</span><input data-n="doc" inputmode="numeric" maxlength="18" value="${t(x.doc || (mv?.pessoa ? pessoa(mv.pessoa)?.doc || '' : ''))}"></label>
    <label class="campo largo"><span>Observação</span><input data-n="obs" maxlength="200" value="${t(x.obs || '')}" placeholder="Ex.: ISS retido, código do serviço 7.02"></label></div>`,
  pe: `${ant ? '<button type="button" class="bt perigo" data-apagar>Apagar</button>' : ''}<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio" data-ok>${ico('check')}Salvar</button>` });
  $('[data-n="mov"]', el).onchange = (e) => { const m = movimentos().find((y) => y.id === e.target.value); if (!m) return; $('[data-n="valor"]', el).value = n2(m.valor); if (m.pessoa) { $('[data-n="tomador"]', el).value = nomeDe(m.pessoa); $('[data-n="doc"]', el).value = pessoa(m.pessoa)?.doc || ''; } };
  $('[data-ok]', el).onclick = () => {
    const d = {}; $$('[data-n]', el).forEach((i) => { d[i.dataset.n] = i.value.trim(); }); d.valor = num(d.valor);
    if (!d.numero) { toast('Escreva o número da nota'); return; }
    if (d.mov) { const outra = notaDoMov(d.mov); if (outra && outra !== ant) { toast('Este recebimento já tem nota registrada'); return; } }
    if (ant) Object.assign(ant, d); else notas().unshift({ id: uid('nt'), ...d });
    db.notas = notas().slice(0, 2000); grava(); fechar(); toast('Nota registrada');
  };
  $('[data-apagar]', el)?.addEventListener('click', async () => { if (await confirma('Apagar o registro desta nota? (a nota emitida no seu emissor continua valendo)', 'Apagar', true)) { db.notas = notas().filter((y) => y !== ant); grava(); fechar(); } });
}
export function csvNotas(l, recSem) {
  const cab = ['Tipo', 'Número', 'Emissão', 'Tomador', 'CPF/CNPJ', 'Valor (R$)', 'Referente a', 'Observação'];
  const linhas = l.map((x) => [x.tipo, x.numero, dataBR(x.dia), x.tomador, x.doc, nro(x.valor), movimentos().find((m) => m.id === x.mov)?.desc || '', x.obs]);
  const sem = recSem.map((m) => ['SEM NOTA', '', dataBR(m.pago), m.pessoa ? nomeDe(m.pessoa) : '', m.pessoa ? pessoa(m.pessoa)?.doc || '' : '', nro(m.valor), m.desc, 'recebido sem nota registrada']);
  return '﻿' + [[`${db.config.nome || 'Empresa'} · notas fiscais registradas`], [], cab, ...linhas, ...(sem.length ? [[], ['Recebimentos do período sem nota registrada'], ...sem] : [])].map((r) => r.map(csvCel).join(';')).join('\r\n');
}
export function xmlNotas(l, de, ate) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Notas emitidas fora do Tecton, registradas para o contador. NÃO é documento fiscal. -->\n<notasTecton versao="1" empresa="${xmlEsc(db.config.nome || '')}" cnpj="${dig(db.config.cnpj)}" de="${de}" ate="${ate}" gerado="${new Date().toISOString()}">\n${l.map((x) => `  <nota tipo="${xmlEsc(x.tipo)}" numero="${xmlEsc(x.numero)}" emissao="${xmlEsc(x.dia)}" valor="${r2(x.valor).toFixed(2)}" tomador="${xmlEsc(x.tomador)}" doc="${dig(x.doc)}"${x.mov ? ` referente="${xmlEsc(movimentos().find((m) => m.id === x.mov)?.desc || x.mov)}"` : ''}${x.obs ? ` obs="${xmlEsc(x.obs)}"` : ''}/>`).join('\n')}\n</notasTecton>\n`;
}
export function folhaExportarNotas() {
  let per = 'mes';
  const dados = () => { const [de, ate] = intervalo(per); const l = notas().filter((x) => x.dia >= de && x.dia <= ate).sort((a, b) => a.dia.localeCompare(b.dia));
    const sem = movimentos().filter((m) => m.tipo === 'receber' && m.pago && m.pago >= de && m.pago <= ate && !notaDoMov(m.id)); return { de, ate, l, sem }; };
  const resumo = () => { const { l, sem } = dados(); return `${pl2(l.length, 'nota registrada', 'notas registradas')} · ${R$(soma(l, (x) => x.valor))}${sem.length ? ` · ${pl2(sem.length, 'recebimento sem nota', 'recebimentos sem nota')}` : ''}`; };
  folha({ titulo: 'Exportar notas para o contador', corpo: `<p class="mudo" style="margin-bottom:10px">As notas que você registrou e, no fim do CSV, os recebimentos do período ainda sem nota.</p>
    <div class="chips" role="group" aria-label="Período">${PERIODOS.map(([k, n]) => `<button type="button" class="chip" data-per="${k}" aria-pressed="${k === per}">${n}</button>`).join('')}</div><p class="forte" data-resumo style="margin-top:10px">${resumo()}</p>`,
  pe: `<button type="button" class="bt" data-xml>${ico('doc')}XML simples</button><button type="button" class="bt cheio" data-csv>${ico('doc')}Baixar CSV</button>`,
  aoAbrir: (f) => {
    $$('[data-per]', f).forEach((b) => { b.onclick = () => { per = b.dataset.per; $$('[data-per]', f).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); $('[data-resumo]', f).textContent = resumo(); }; });
    $('[data-csv]', f).onclick = () => { const { l, sem } = dados(); if (!l.length && !sem.length) return toast('Nada neste período'); baixar(arq('notas', per, 'csv'), csvNotas(l, sem), 'text/csv;charset=utf-8'); toast('CSV baixado'); };
    $('[data-xml]', f).onclick = () => { const { de, ate, l } = dados(); if (!l.length) return toast('Nenhuma nota registrada neste período'); baixar(arq('notas', per, 'xml'), xmlNotas(l, de, ate), 'application/xml'); toast('XML baixado'); };
  } });
}
const pl2 = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
// no financeiro: cada recebimento mostra a nota registrada (ou o botão para registrar)
GANCHOS.movNota = (m) => {
  if (m.tipo !== 'receber' || servico() !== 'outro' || ramoAtual() === 'loja') return '';
  const x = notaDoMov(m.id);
  return x ? `<button type="button" class="bt pq" data-acao="nt-ver" data-id="${t(x.id)}" aria-label="Ver a nota ${t(x.numero)}">${ico('doc')}${t(x.tipo)} ${t(x.numero)}</button>`
    : m.pago || m.venc <= hoje() ? `<button type="button" class="bt pq" data-acao="nt-nova" data-mov="${t(m.id)}" aria-label="Registrar a nota deste recebimento">${ico('doc')}Nota</button>` : '';
};

// ------------------------------------------------------------------ a seção nas Configurações (cada ramo vê só o que é dele)
function cartoes(lista, atual, attr, g) {
  return `<div class="nf-modos" role="radiogroup" aria-label="Como você emite nota hoje?">${lista.map(([k, i, n, d]) => `<button type="button" role="radio" aria-checked="${atual === k}" ${attr}="${k}" ${g ? '' : 'disabled'}>${ico(i)}<span><b>${t(n)}${k === 'bluerose' ? ' · em breve' : ''}</b><small>${t(d)}</small></span></button>`).join('')}</div>`;
}
function secaoLoja(g) {
  const N = nf(), m = N.modo || '', E = N.emitente || {}, s = servidor || {};
  const emitente = `<p class="forte" style="margin:14px 0 8px">Dados da loja (saem na nota)</p><div class="campos">
    <label class="campo"><span>CNPJ</span><input data-e="cnpj" inputmode="numeric" maxlength="18" value="${t(E.cnpj || db.config.cnpj || '')}"></label><label class="campo"><span>Inscrição estadual</span><input data-e="ie" inputmode="numeric" maxlength="14" value="${vv(E, 'ie')}"></label>
    <label class="campo largo"><span>Razão social</span><input data-e="razao" maxlength="60" value="${t(E.razao || db.config.nome || '')}"></label>
    <label class="campo"><span>Regime</span><select data-e="crt">${[['1', 'Simples Nacional'], ['4', 'MEI'], ['2', 'Simples (excesso de sublimite)'], ['3', 'Regime normal (Lucro Presumido/Real)']].map(([k, n]) => `<option value="${k}" ${String(E.crt || '1') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="campo"><span>Rua</span><input data-e="logradouro" maxlength="60" value="${vv(E, 'logradouro')}"></label><label class="campo"><span>Número</span><input data-e="numero" maxlength="10" value="${vv(E, 'numero')}"></label>
    <label class="campo"><span>Bairro</span><input data-e="bairro" maxlength="60" value="${vv(E, 'bairro')}"></label><label class="campo"><span>Cidade</span><input data-e="municipio" maxlength="60" value="${t(E.municipio || db.config.cidade || '')}"></label><label class="campo"><span>UF</span><input data-e="uf" maxlength="2" value="${t(E.uf || db.config.uf || 'SP')}"></label></div>`;
  const ambiente = `<p class="forte" style="margin:12px 0 6px">Ambiente</p><div class="chips" role="group" aria-label="Ambiente">${[['homologacao', 'Teste (homologação)'], ['producao', 'Valendo (produção)']].map(([k, n]) => `<button type="button" class="chip" data-nf-amb="${k}" aria-pressed="${(N.ambiente || 'homologacao') === k}">${n}</button>`).join('')}</div>`;
  const bts = `<div class="linha-bts" style="margin-top:12px"><button type="button" class="bt" data-nf-produtos>${ico('caixa')}Dados fiscais dos produtos${semNcm().length ? ` (${semNcm().length} a conferir)` : ''}</button><button type="button" class="bt" data-nf-exportar>${ico('doc')}Exportar vendas</button></div>`;
  let corpo = '';
  if (m === 'api') {
    const p = N.provedor || 'brasilnfe', con = s.conectado && s.provedor === p;
    corpo = `<div class="nf-caixa"><p class="forte" style="margin-bottom:8px">A conta da loja no emissor</p>
      <div class="chips" role="group" aria-label="Emissor">${Object.entries(PROVEDORES).map(([k, x]) => `<button type="button" class="chip" data-nf-prov="${k}" aria-pressed="${p === k}">${x.nome}</button>`).join('')}</div>
      <p class="${con ? 'et ok' : 'mudo peq'}" style="margin:10px 0">${con ? `${ico('check')}Conectado à ${PROVEDORES[p].nome}. O token está guardado no servidor (não aparece aqui).` : 'O certificado A1 e o CSC da SEFAZ ficam no painel do seu emissor: aqui só vai o token.'}</p>
      <label class="campo"><span>Token da sua conta ${t(PROVEDORES[p].nome)}</span><input data-nf-token type="password" autocomplete="off" spellcheck="false" maxlength="300" placeholder="${con ? 'Guardado. Cole outro só para trocar' : 'Cole aqui o token'}"><small>${t(PROVEDORES[p].onde)} A nota sai pela sua conta e você paga direto ao seu emissor.</small></label>
      ${ambiente}${emitente}
      <label class="liga" style="margin-top:8px">Já deixar marcada a NFC-e ao receber no balcão<input type="checkbox" data-nf-auto ${N.auto ? 'checked' : ''}></label>
      <p class="mudo peq">Cliente com CNPJ ou venda na conta da obra: o balcão já sugere a NF-e (modelo 55), pela mesma conta, se o seu emissor emitir NF-e.</p>
      <div class="linha-bts" style="margin-top:12px"><button type="button" class="bt cheio" data-nf-conectar>${ico('check')}${con ? 'Salvar' : 'Salvar e conectar'}</button>${con ? '<button type="button" class="bt" data-nf-desconectar>Desconectar</button>' : ''}</div></div>${bts}
      <p class="mudo peq" style="margin-top:10px">NFC-e em SP cancela em até 30 minutos; NF-e em até 24 horas, sempre com motivo. Confira NCM, CFOP e CSOSN com o seu contador.</p>`;
  } else if (m === 'outro') {
    corpo = `<p class="mudo">Em Balcão › Vendas e devoluções, cada venda tem o botão <b>Nota</b> para anotar o número da nota que saiu no seu emissor. No fim do dia ou do mês, exporte as vendas para o emissor ou para o contador.</p>${bts}`;
  } else if (m === 'bluerose') corpo = '<p class="aviso-box">Ainda não disponível. Enquanto isso, conecte a conta do seu emissor (Brasil NFe ou Focus NFe) ou anote as notas que você emite no seu PDV.</p>';
  else if (m === 'nao') corpo = '<p class="mudo">Tudo certo: nada de nota aparece no balcão. Dá para mudar quando quiser.</p>';
  return `<p class="mudo" style="margin-bottom:10px">Como você emite nota hoje? ${g ? '' : 'Só o dono muda.'}</p>${cartoes(MODOS_LOJA, m, 'data-nf-modo', g)}${g ? corpo : ''}`;
}
function secaoServico(g) {
  const m = servico(), l = notas().slice(0, 6);
  const corpo = m === 'outro' ? `<p class="mudo" style="margin-bottom:10px">Em Financeiro, cada recebimento ganha o botão <b>Nota</b>: anote o número da NFS-e que saiu no seu emissor, na prefeitura ou pelo contador. No fim do mês, exporte para o contador.</p>
    ${l.length ? `<ul class="lista">${l.map((x) => `<li><div class="tx"><b>${t(x.tipo)} ${t(x.numero)}</b><small>${dataBR(x.dia)}${x.tomador ? ` · ${t(x.tomador)}` : ''}</small></div><div class="val">${R$(x.valor)}</div><button type="button" class="bt-ico" data-acao="nt-ver" data-id="${t(x.id)}" aria-label="Abrir a nota ${t(x.numero)}">${ico('lapis')}</button></li>`).join('')}</ul>` : '<p class="mudo peq">Nenhuma nota registrada ainda.</p>'}
    <div class="linha-bts" style="margin-top:12px"><button type="button" class="bt cheio" data-acao="nt-nova">${ico('mais2')}Registrar nota</button><button type="button" class="bt" data-acao="nt-exportar">${ico('doc')}Exportar para o contador</button></div>`
    : m === 'nao' ? '<p class="mudo">Tudo certo: nada de nota aparece no financeiro. Dá para mudar quando quiser.</p>' : '';
  return `<p class="mudo" style="margin-bottom:10px">Como você emite nota hoje? O Tecton não emite NFS-e: ele guarda o número e manda a lista ao contador. ${g ? '' : 'Só o dono muda.'}</p>${cartoes(MODOS_SERV, m, 'data-nf-serv', g)}${g || m === 'outro' ? corpo : ''}`;
}
SECOES_CFG.push({ id: 'cfg-nota', nome: 'Nota fiscal',
  html: (g) => `<section class="cartao" id="cfg-nota" style="margin-top:16px;min-width:0;overflow-wrap:anywhere"><h2>Nota fiscal</h2>${ramoAtual() === 'loja' ? secaoLoja(g) : secaoServico(g)}</section>`,
  montar(el, redesenhar) {
    const sec = $('#cfg-nota', el); if (!sec) return;
    if (ramoAtual() === 'loja' && !servidor) lerStatus().then(() => { if (document.getElementById('cfg-nota')) redesenhar(); });
    $$('[data-nf-serv]', sec).forEach((b) => { b.onclick = () => { setNf({ servico: b.dataset.nfServ }); toast(MODOS_SERV.find((x) => x[0] === b.dataset.nfServ)[2]); redesenhar(); }; });
    $$('[data-nf-modo]', sec).forEach((b) => { b.onclick = () => { setNf({ modo: b.dataset.nfModo }); toast(MODOS_LOJA.find((x) => x[0] === b.dataset.nfModo)[2]); redesenhar(); }; });
    $$('[data-nf-prov]', sec).forEach((b) => { b.onclick = () => { setNf({ provedor: b.dataset.nfProv }); redesenhar(); }; });
    $$('[data-nf-amb]', sec).forEach((b) => { b.onclick = async () => {
      if (b.dataset.nfAmb === 'producao' && !(await confirma('Emitir valendo (produção)? As notas passam a ter valor fiscal.', 'Sim, valendo'))) return;
      setNf({ ambiente: b.dataset.nfAmb }); if (CONTA && servidor?.conectado && servidor.provedor === nf().provedor) chamar({ acao: 'conectar', provedor: nf().provedor, ambiente: b.dataset.nfAmb }).then(lerStatus);
      redesenhar();
    }; });
    $('[data-nf-auto]', sec)?.addEventListener('change', (e) => { setNf({ auto: e.target.checked }); toast(e.target.checked ? 'NFC-e já marcada ao receber' : 'Nota escolhida a cada venda'); });
    $$('[data-nf-produtos]', sec).forEach((b) => { b.onclick = folhaProdutos; });
    $$('[data-nf-exportar]', sec).forEach((b) => { b.onclick = folhaExportar; });
    const lerEmitente = () => { const e = { ...(nf().emitente || {}) }; $$('[data-e]', sec).forEach((i) => { e[i.dataset.e] = ['cnpj', 'ie'].includes(i.dataset.e) ? dig(i.value) : i.value.trim(); }); e.uf = (e.uf || 'SP').toUpperCase(); return e; };
    $('[data-nf-conectar]', sec)?.addEventListener('click', async (ev) => {
      const bt = ev.currentTarget, tk = $('[data-nf-token]', sec).value.trim(), e = lerEmitente(), p = nf().provedor || 'brasilnfe';
      if (e.cnpj.length !== 14) { toast('O CNPJ da loja tem 14 números'); return; }
      setNf({ emitente: e, provedor: p });
      if (!CONTA) { if (!tk && !nf().conectadoDemo) { toast('Cole o token da sua conta'); return; } setNf({ conectadoDemo: true }); servidor = { ...servidor, conectado: true, provedor: p }; $('[data-nf-token]', sec).value = ''; toast('Demonstração: conectado (nada foi enviado)'); redesenhar(); return; }
      bt.disabled = true;
      const r = await chamar({ acao: 'conectar', provedor: p, token: tk, ambiente: nf().ambiente || 'homologacao', cnpj: e.cnpj });
      $('[data-nf-token]', sec).value = '';
      if (!r?.ok) { bt.disabled = false; toast(r?.erro || r?.mensagem || 'Não deu para conectar'); return; }
      await lerStatus(); toast(`Conectado à ${PROVEDORES[p].nome}`); redesenhar();
    });
    $('[data-nf-desconectar]', sec)?.addEventListener('click', async () => {
      if (!(await confirma('Desconectar a conta do emissor? O token é apagado do servidor.', 'Desconectar', true))) return;
      if (CONTA) await chamar({ acao: 'desconectar' }); else setNf({ conectadoDemo: false });
      await lerStatus(); toast('Desconectado'); redesenhar();
    });
  } });

// ------------------------------------------------------------------ ações dos botões
const venda = (b) => db.vendas.find((x) => x.id === b.dataset.id);
const fecharTopo = () => { const f = [...document.querySelectorAll('.folha-fundo')].pop(); f?._fechar?.(); };
acao('nf-venda', (b) => { const v = venda(b); if (!v) return; if (!emite() && !v.nf) { toast('Ligue a emissão em Configurações › Nota fiscal'); return; } folhaNota(v); });
acao('nf-danfe', (b) => { const v = venda(b); if (v?.nf) { fecharTopo(); imprimirDanfe(v); } });
acao('nf-cancelar', (b) => { const v = venda(b); if (v) { fecharTopo(); cancelarNota(v); } });
acao('nf-outro', (b) => { const v = venda(b); if (v) folhaOutro(v); });
acao('nf-exportar', () => folhaExportar());
acao('nt-nova', (b) => registrarNota(b.dataset.mov ? { mov: b.dataset.mov } : {}));
acao('nt-ver', (b) => registrarNota({ id: b.dataset.id }));
acao('nt-exportar', () => folhaExportarNotas());
