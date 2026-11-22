// Popina · pedidos do iFood por "colar" (22/11/2026): o restaurante copia o texto do pedido no Gestor de Pedidos do iFood
// (Ctrl+A e Ctrl+C na tela do pedido, ou o texto da impressão) e cola aqui. O Popina lê número, cliente, itens com
// quantidade, complementos e observações, valores, pagamento (pago no app ou na entrega), endereço e tipo de entrega,
// liga cada item ao cardápio pelo nome parecido (dá para corrigir) e cria o pedido com origem 'iFood', direto para a cozinha.
// Nada de robô nem leitura do site do iFood: só o texto que a pessoa colou.
// A integração automática (Merchant API) está pronta no servidor (função popina-ifood), DESLIGADA até existir CNPJ.
// Campos novos só: comanda.ifood { codigo, entregaPor, coleta, localizador, fone, pago, colado, exemplo } e
// config.loja.ifoodComissao (%). Nada do que já existe muda.
import { db, t, din, r2, uid, num, vir, conta, novoPedido, aceitarPedido, marcar, ativos, lojaCfg, setLoja, quemAgora, agendadoDe } from './loja.js?v=56';
import { acao, ir } from './nucleo.js?v=56';
import { ico, folha, toast, confirma, $, $$ } from './ui.js?v=56';

// ------------------------------------------------------------------ leitura do texto
const sem = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const DIN = /(-)?\s*(?:R\$\s*)?(-)?\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s*$/;
const valorDe = (s) => { const m = DIN.exec(String(s).trim()); return m ? (m[1] || m[2] ? -1 : 1) * num(m[3]) : null; };
const tiraValor = (s) => String(s).replace(DIN, '').replace(/[\s.·:\-–]+$/, '').trim();
const ITEM = /^(\d{1,2})\s*(?:x|×|un\.?|und\.?)\s+(.+)$/i;
const ITEM_TAB = /^(\d{1,2})\s{1,}([A-Za-zÀ-ú].+)$/; // impressão em tabela: "1   Marmitex grande   27,90"
const OPC = /^\s*[+\-•·*>]\s*(.+)$/;
const OBS = /^\s*(?:observa[cç](?:ao|ão|oes|ões)|obs)\.?\s*(?:do item)?\s*[:\-]?\s*(.+)$/i;
const TOTAIS = [
  ['subtotal', /^sub\s*-?\s*total|^valor dos itens|^total (dos|de) itens/i],
  ['taxa', /^taxa de entrega|^entrega\s*[:\-]?\s*(r\$|\d)|^frete/i],
  ['servico', /^taxa de servi[cç]o|^taxa adicional|^taxa do app/i],
  ['desconto', /cupom|desconto|incentivo|promo[cç][aã]o|benef[ií]cio/i],
  ['total', /^total(\s+(do pedido|a pagar|a cobrar|geral))?\s*[:\-]?\s*(-?\s*r\$|-?\s*\d)/i],
];
const FORMAS = [['Dinheiro', /dinheiro/], ['Pix', /\bpix\b/], ['Vale-refeição', /vale[\s-]?refei|\bvr\b|ticket|sodexo|alelo|vale[\s-]?alimenta/], ['Cartão de crédito', /cr[eé]dito/], ['Cartão de débito', /d[eé]bito/], ['Cartão na entrega', /cart[aã]o|maquininha/]];

// devolve { dados (o mesmo formato curto da integração), faltou: [o que não achou] }
export function lerTextoIfood(texto) {
  const bruto = String(texto || '').replace(/\r/g, '').replace(/ /g, ' ').split('\n');
  const L = bruto.map((x) => x.replace(/\s+$/, '')).filter((x) => !/^[=\-_*~.]{4,}$/.test(x.trim()));
  const tudo = L.join('\n'), baixo = sem(tudo);
  const d = { v: 1, id: '', codigo: '', tipo: 'DELIVERY', entregaPor: 'IFOOD', agendado: null, coleta: '', cliente: { nome: '', fone: '', localizador: '' },
    endereco: { texto: '', bairro: '', complemento: '', referencia: '' }, itens: [], subtotal: 0, taxa: 0, descontos: 0, taxasExtras: 0, total: 0,
    pagamento: { online: null, forma: '', trocoPara: 0 }, obs: '', colado: true };
  // número do pedido
  const nm = /pedido[^\n\d#]{0,25}(?:n[º°o.]*\s*)?#?\s*(\d{3,8})/i.exec(tudo) || /#\s*(\d{3,8})\b/.exec(tudo) || /\bn[º°]\s*(\d{3,8})\b/i.exec(tudo);
  if (nm) d.codigo = nm[1];
  // tipo de entrega
  if (/retirada|retirar|para viagem|pra viagem|takeout|buscar no local/.test(baixo)) { d.tipo = 'TAKEOUT'; d.entregaPor = ''; }
  else if (/entrega (propria|feita pela loja|pela loja|do restaurante|da loja|pelo restaurante)|entregador (proprio|da loja)|loja entrega/.test(baixo)) d.entregaPor = 'MERCHANT';
  const col = /c[oó]digo de (?:coleta|retirada|confirma[cç][aã]o)\s*[:\-]?\s*([A-Za-z0-9]{4,6})/i.exec(tudo); if (col) d.coleta = col[1];
  const ag = /agendad[oa][^\n]*?(\d{1,2}:\d{2})/i.exec(tudo) || /(?:entregar|retirar|entrega|retirada)\s+(?:prevista\s+)?(?:para\s+)?[àa]s\s+(\d{1,2}:\d{2})/i.exec(tudo);
  if (/agendad/i.test(tudo) && ag) d.agendado = ag[1];
  // telefone e localizador
  const fo = /(0800[\s\d]{7,11}\d|\(?\d{2}\)?\s?9?\d{4}[\s-]?\d{4})/.exec(tudo); if (fo) d.cliente.fone = fo[1].trim();
  const lo = /(?:\bid\b|localizador|c[oó]digo do cliente)\s*[:\-]?\s*(\d{4}\s?\d{4})/i.exec(tudo); if (lo) d.cliente.localizador = lo[1].replace(/\s/g, ' ');
  // cliente
  for (let k = 0; k < L.length; k++) {
    const x = L[k].trim(), m = /^(?:cliente|nome do cliente|nome)\s*[:\-]\s*(.+)$/i.exec(x);
    if (m && !/pedido/i.test(m[1])) { d.cliente.nome = m[1].trim(); break; }
    if (/^cliente$/i.test(x) && L[k + 1]) { d.cliente.nome = L[k + 1].trim(); break; }
  }
  if (!d.cliente.nome) { // Gestor de Pedidos: o nome vem na linha logo antes do telefone
    const k = L.findIndex((x) => fo && x.includes(fo[1].trim().slice(0, 8)));
    const ant = k > 0 ? L[k - 1].trim() : '';
    if (ant && /^[A-Za-zÀ-ú][A-Za-zÀ-ú.' ]{2,60}$/.test(ant) && !/pedido|entrega|retirada|previs|feito|hoje|agendad/i.test(ant)) d.cliente.nome = ant;
  }
  d.cliente.nome = d.cliente.nome.replace(/\s*[·|].*$/, '').slice(0, 80);
  // endereço
  const RUA = /^(rua|r\.|av\.?|avenida|alameda|al\.|travessa|tv\.|estrada|rodovia|pra[cç]a|largo|via)\s/i;
  let ke = L.findIndex((x) => /^\s*(endere[cç]o( de entrega)?|entregar em|local de entrega)\b/i.test(x));
  if (ke >= 0) {
    const resto = L[ke].replace(/^\s*(endere[cç]o( de entrega)?|entregar em|local de entrega)\s*[:\-]?\s*/i, '').trim();
    if (resto) d.endereco.texto = resto; else { ke++; while (ke < L.length && !L[ke].trim()) ke++; d.endereco.texto = (L[ke] || '').trim(); }
  } else { ke = L.findIndex((x) => RUA.test(x.trim())); if (ke >= 0) d.endereco.texto = L[ke].trim(); }
  if (ke >= 0 && d.endereco.texto) {
    for (let k = ke + 1; k < Math.min(L.length, ke + 4); k++) {
      const x = L[k].trim(), b = /^(.+?)\s+[-–]\s+(.+?)\s*\/\s*[A-Z]{2}\b/.exec(x);
      if (b && !d.endereco.bairro) { d.endereco.bairro = b[1].trim(); d.endereco.cidade = b[2].trim(); }
      const cp = /^complemento\s*[:\-]\s*(.+)$/i.exec(x); if (cp) d.endereco.complemento = cp[1].trim();
    }
  }
  const ba = /bairro\s*[:\-]\s*([^\n]+)/i.exec(tudo); if (ba) d.endereco.bairro = ba[1].trim();
  const rf = /refer[eê]ncia\s*[:\-]?\s*([^\n]+)/i.exec(tudo); if (rf) d.endereco.referencia = rf[1].trim().slice(0, 120);
  if (d.tipo === 'TAKEOUT') d.endereco = null;
  // itens, complementos, observações e valores
  let noItens = false, ult = null;
  for (const linha of L) {
    const x = linha.trim(); if (!x) continue;
    const recuo = /^\s{2,}|^\t/.test(linha), bx = sem(x);
    const tot = TOTAIS.find(([, r]) => r.test(bx)), v = valorDe(x);
    if (tot && v != null && !(tot[0] === 'desconto' && ITEM.test(x))) {
      const k = tot[0];
      if (k === 'desconto') d.descontos = r2(d.descontos + Math.abs(v)); else if (k === 'servico') d.taxasExtras = r2(d.taxasExtras + v); else d[k] = Math.abs(v);
      if (k === 'subtotal' || k === 'total') noItens = false;
      continue;
    }
    if (/^(itens( do pedido)?|seu pedido|produtos|qtd\.?|qtde\.?|quant\.?)\b/i.test(x) && !ITEM.test(x)) { noItens = true; continue; }
    if (/pedidos? (nesta|na sua|na) loja|^\d+\s+pedidos?\b/i.test(x)) continue;
    const ob = OBS.exec(x);
    if (ob && ult) { ult.obs = [ult.obs, ob[1].trim()].filter(Boolean).join('; ').slice(0, 300); continue; }
    const mi = ITEM.exec(x) || (noItens && !recuo && ITEM_TAB.exec(x));
    const mo = OPC.exec(linha);
    if (mi && !(recuo && ult) && !RUA.test(mi[2])) {
      const nome = tiraValor(mi[2]);
      ult = { nome: nome || 'Item', qtd: Number(mi[1]) || 1, total: Math.abs(valorDe(mi[2]) ?? 0), opcoes: [], obs: '' }; d.itens.push(ult); noItens = true; continue;
    }
    if (ult && noItens && (mo || recuo)) {
      const corpo = (mo ? mo[1] : x).trim(); if (/:$/.test(corpo)) continue;
      const q = /^(\d{1,2})\s*[x×]\s+(.+)$/i.exec(corpo) || /^(.+?)\s*\((\d{1,2})\s*[x×]?\)/i.exec(corpo);
      let nome = tiraValor(corpo), qtd = 1;
      if (q) { if (/^\d/.test(q[1])) { qtd = Number(q[1]); nome = tiraValor(q[2]); } else { qtd = Number(q[2]); nome = q[1].trim(); } }
      ult.opcoes.push({ nome: nome.replace(/\s*\(\d{1,2}\s*[x×]?\)\s*$/i, '').slice(0, 120), qtd, preco: Math.abs(valorDe(corpo) ?? 0) });
      continue;
    }
  }
  // pagamento
  const pg = sem(L.filter((x) => !/cupom|desconto|incentivo/i.test(x)).join(' | '));
  if (/pago (pelo|no|via|com o) (app|ifood|aplicativo)|pagamento (online|pelo app|pelo aplicativo|feito no app)|ja (esta )?pago|pago online|pedido pago/.test(pg)) d.pagamento.online = true;
  else if (/cobrar|receber do cliente|pagamento na (entrega|retirada)|pagar na (entrega|retirada)|na entrega:|na retirada:|levar maquininha/.test(pg)) d.pagamento.online = false;
  const trecho = sem(tudo.slice(Math.max(0, tudo.search(/pagamento|cobrar|pago /i))));
  d.pagamento.forma = (FORMAS.find(([, r]) => r.test(trecho)) || [''])[0];
  const tr = /troco\s*(?:para|p\/|pra|de)?\s*:?\s*R?\$?\s*(\d+(?:[.,]\d{2})?)/i.exec(tudo); if (tr) d.pagamento.trocoPara = num(tr[1]);
  if (!d.subtotal) d.subtotal = r2(d.itens.reduce((s, i) => s + i.total + i.opcoes.reduce((k, o) => k + o.preco, 0), 0));
  if (!d.total && d.subtotal) d.total = r2(d.subtotal + d.taxa - d.descontos);
  const faltou = [];
  if (!d.codigo) faltou.push('o número do pedido');
  if (!d.cliente.nome) faltou.push('o nome do cliente');
  if (!d.itens.length) faltou.push('os itens');
  if (d.tipo === 'DELIVERY' && !d.endereco?.texto) faltou.push('o endereço');
  if (d.pagamento.online == null) faltou.push('se foi pago no app ou se cobra na entrega');
  if (!d.total) faltou.push('o total');
  return { dados: d, faltou };
}

// ------------------------------------------------------------------ casar o item com o cardápio pelo nome
const PARADAS = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'e', 'a', 'o', 'ao', 'em', 'ml', 'l', 'lt', 'g', 'kg', 'un', 'und', 'c', 'p', 'sem', 'para', 'tradicional']);
const fichas = (s) => sem(s).replace(/[^a-z0-9]+/g, ' ').split(' ').filter((w) => w && !PARADAS.has(w) && !/^\d+$/.test(w)).map((w) => (w.length > 4 ? w.replace(/s$/, '') : w));
export function casarItem(nome, lista = ativos()) {
  const a = fichas(nome); if (!a.length) return '';
  let melhor = '', nota = 0;
  for (const p of lista) {
    if (p.porKg) continue;
    const b = fichas(p.nome); if (!b.length) continue;
    const comum = b.filter((w) => a.includes(w)).length;
    let n = (2 * comum) / (a.length + b.length);
    if (comum === b.length) n = Math.max(n, 0.75);
    const ops = [...(p.grupos || []).flatMap((g) => g.opcoes || []), ...(p.tamanhos || [])].map((o) => fichas(o.nome)).filter((f) => f.length);
    if (ops.some((f) => f.every((w) => a.includes(w)))) n += 0.35;
    if (n > nota) { nota = n; melhor = p.id; }
  }
  return nota >= 0.45 ? melhor : '';
}

// ------------------------------------------------------------------ criar o pedido (vai direto para a cozinha: já foi aceito no iFood)
export const ehIfood = (c) => c?.origem === 'iFood';
export const nomeEntrega = (c) => (c.tipo !== 'delivery' ? 'Retirada' : c.ifood?.entregaPor === 'MERCHANT' ? 'Entrega própria' : 'Entrega iFood');
export const comissaoIfood = () => Math.max(0, Math.min(60, Number(lojaCfg().ifoodComissao) || 0));
export function jaColado(codigo) {
  if (!codigo) return null;
  const hoje = new Date().toDateString(), mesmo = (x) => x?.ifood?.codigo === codigo;
  return db.comandas.find((c) => ehIfood(c) && mesmo(c)) || db.vendas.find((v) => v.origem === 'iFood' && mesmo(v) && new Date(v.ts).toDateString() === hoje) || null;
}
export function criarPedidoIfood(d, { exemplo = false } = {}) {
  const entrega = d.tipo !== 'TAKEOUT';
  const pagaDepois = d.pagamento.online === false;
  const forma = d.pagamento.forma || (pagaDepois ? 'Dinheiro' : '');
  const c = novoPedido(entrega ? 'delivery' : 'balcao', { nome: String(d.cliente.nome || 'Cliente iFood').slice(0, 80),
    ...(entrega ? { end: [d.endereco?.texto, d.endereco?.complemento].filter(Boolean).join(' · ').slice(0, 160), bairro: String(d.endereco?.bairro || '').slice(0, 80), ...(d.endereco?.referencia ? { ref: d.endereco.referencia.slice(0, 120) } : {}) } : {}) },
  { origem: 'iFood', aceito: Date.now(), taxaEntrega: 0.001, ...(entrega ? {} : { modo: 'retirada' }),
    ...(agendadoDe(d.agendado) ? { agendado: agendadoDe(d.agendado) } : {}),
    ...(pagaDepois ? { pagarNaEntrega: `${forma}${d.pagamento.trocoPara > 0 ? ` (troco para ${din(d.pagamento.trocoPara)})` : ''}`.slice(0, 60) } : {}),
    ...(pagaDepois && d.pagamento.trocoPara > 0 ? { trocoPara: r2(Math.min(5000, d.pagamento.trocoPara)) } : {}),
    ifood: { codigo: String(d.codigo || '').slice(0, 12), entregaPor: entrega ? (d.entregaPor === 'MERCHANT' ? 'MERCHANT' : 'IFOOD') : '', coleta: String(d.coleta || '').slice(0, 10),
      localizador: String(d.cliente.localizador || '').slice(0, 12), fone: String(d.cliente.fone || '').slice(0, 20), pago: !pagaDepois, colado: true, ...(exemplo ? { exemplo: true } : {}), totalIfood: r2(d.total) } });
  c.taxaEntrega = entrega ? r2(d.taxa) : 0; // a taxa é a do iFood, não a do bairro do Popina
  d.itens.forEach((i) => {
    const qtd = Math.max(1, Math.min(99, Math.round(Number(i.qtd) || 1)));
    const opc = (i.opcoes || []).filter((o) => o.nome);
    const adic = opc.map((o) => ({ nome: `${o.qtd > 1 ? `${o.qtd}× ` : ''}${o.nome}`.slice(0, 80), preco: r2((Number(o.preco) || 0) / qtd) }));
    const p = i.prod ? db.produtos.find((x) => x.id === i.prod) : null;
    c.itens.push({ id: uid('i'), prod: p ? p.id : '', nome: String(i.nome || 'Item').slice(0, 120), qtd, preco: r2((Number(i.total) || 0) / qtd), setor: p?.setor || 'cozinha', obs: String(i.obs || '').slice(0, 300), adic, meia: null, status: 'rascunho' });
  });
  if (d.descontos > 0) { c.desconto = r2(d.descontos); c.descontoInfo = { motivo: 'Cupom ou desconto do iFood', quem: 'iFood', ts: Date.now() }; }
  if (d.taxasExtras > 0) marcar(c, 'aviso', `O iFood cobrou ${din(d.taxasExtras)} de taxa de serviço do cliente (fica com o iFood)`, 'iFood');
  marcar(c, 'abriu', `Pedido do iFood${d.codigo ? ` #${d.codigo}` : ''} colado no Popina${exemplo ? ' (exemplo)' : ''}`);
  const v = conta(c);
  if (d.total > 0 && Math.abs(v.total - d.total) >= 0.01) marcar(c, 'aviso', `O iFood mostrou ${din(d.total)}; a conta ficou ${din(v.total)}`, 'iFood');
  if (!pagaDepois) c.pagamentos.push({ id: uid('pg'), forma: 'iFood (pago no app)', valor: v.total, ts: Date.now(), quem: quemAgora(c) });
  aceitarPedido(c); // manda para a cozinha (e grava)
  return c;
}

// ------------------------------------------------------------------ textos de exemplo (pedidos fictícios, no formato do Gestor de Pedidos)
export const EXEMPLOS = [
  ['Entrega iFood, pago no app', `Pedido #4821
Feito às 19:42 · Hoje
Entrega iFood · Previsão 20:15 - 20:25

Mariana Souza
0800 705 1234  ID: 8352 1947
3 pedidos na sua loja

Endereço de entrega
Rua das Acácias, 245, Apto 12
Jardim Boa Vista - Orlândia/SP
Referência: em frente à padaria Pão Quente

Itens do pedido
2x X-Burger                     R$ 51,80
   + Bacon (2x)                  R$ 8,00
   Observação: sem cebola, por favor
1x Batata frita média            R$ 18,90
2x Coca-Cola lata 350 ml         R$ 13,00

Subtotal                         R$ 91,70
Taxa de entrega                  R$ 6,99
Cupom (pago pelo iFood)        - R$ 10,00
Total                            R$ 88,69

Pagamento
Pago pelo app · Cartão de crédito Mastercard
Código de coleta: 7421`],
  ['Retirada, dinheiro com troco', `================================
        PEDIDO IFOOD Nº 3907
================================
PARA RETIRAR NO LOCAL
Retirada prevista: 12:40
--------------------------------
Cliente: Carlos Henrique Lima
Tel: 0800 600 4520  Localizador: 4419 2286
--------------------------------
QTD ITEM                   VALOR
1   Prato feito de frango   26,90
    - Com salada
    OBS: capricha no feijão
1   Suco natural laranja    9,50
1   Pudim de leite          8,00
--------------------------------
SUBTOTAL                   44,40
TOTAL                      44,40
--------------------------------
PAGAMENTO NA RETIRADA
Dinheiro - Troco para R$ 100,00
================================`],
  ['Entrega própria, cartão na entrega', `Pedido agendado #5136 - entregar às 20:30
Entrega feita pela loja (entregador próprio)

Cliente: Juliana Prado
Telefone: 0800 705 9981 · ID 7710 3054

Entregar em: Av. Brasil, 1180 - casa
Centro - Orlândia/SP

1x X-Bacon   R$ 27,90
   • Cheddar   R$ 4,00
1x Isca de frango   R$ 32,00
1x Guaraná lata   R$ 6,50

Subtotal: R$ 70,40
Taxa de entrega: R$ 5,00
Total: R$ 75,40

Cobrar do cliente na entrega
Cartão de débito (levar maquininha)`],
];

// ------------------------------------------------------------------ a folha "Pedido do iFood"
const real = () => !!window.veltriaConta;
export function colarIfood(textoIni = '') {
  let texto = textoIni, lido = null, exemplo = false;
  const opcoesCardapio = (sel) => `<option value="">Não ligar ao cardápio</option>${ativos().filter((p) => !p.porKg).map((p) => `<option value="${t(p.id)}" ${p.id === sel ? 'selected' : ''}>${t(p.nome)}</option>`).join('')}`;
  const passo1 = () => `<p class="mudo">No <b>Gestor de Pedidos do iFood</b>, abra o pedido, selecione tudo (<kbd>Ctrl</kbd>+<kbd>A</kbd>), copie (<kbd>Ctrl</kbd>+<kbd>C</kbd>) e cole aqui. O texto da impressão do pedido também serve.</p>
    <label class="campo" style="margin-top:10px"><span>Texto do pedido</span><textarea data-txt rows="10" spellcheck="false" placeholder="Cole aqui o pedido do iFood">${t(texto)}</textarea></label>
    <p class="mudo" style="margin:10px 0 6px">${real() ? 'Quer ver como funciona? Use um texto de exemplo:' : 'Demonstração: use um pedido de exemplo (fictício):'}</p>
    <div class="chips quebra">${EXEMPLOS.map(([n], k) => `<button type="button" class="chip" data-ex="${k}">${t(n)}</button>`).join('')}</div>`;
  // amarelo = o leitor não tem certeza (banca 2): item sem par no cardápio, endereço sem número/bairro, valores que não fecham
  const duv = (cond) => (cond ? ' duvida' : '');
  const dica = (cond, txt) => (cond ? `<small class="dica-duv">${ico('alerta')}${t(txt)}</small>` : '');
  const linhaItem = (i, k) => `<div class="if-item${i.prod ? '' : ' duvida'}" data-k="${k}">
      <input data-q inputmode="numeric" value="${i.qtd}" aria-label="Quantidade" placeholder="Qtd">
      <input data-n maxlength="120" value="${t(i.nome)}" aria-label="Item" placeholder="Item">
      <input data-v inputmode="decimal" value="${vir(r2(i.total + (i.opcoes || []).reduce((s, o) => s + o.preco, 0)).toFixed(2))}" aria-label="Valor do item (R$)" placeholder="Valor R$" title="Valor total da linha, com os complementos">
      <button type="button" class="bt-ico" data-tira aria-label="Tirar o item">${ico('lixo')}</button>
      <select data-p aria-label="Item do cardápio">${opcoesCardapio(i.prod)}</select>
      <small class="dica-duv if-dica-item">${ico('alerta')}Não achei no cardápio: escolha ao lado qual é (ou deixe sem ligar)</small>
      ${(i.opcoes || []).length || i.obs ? `<small class="mudo">${(i.opcoes || []).map((o) => `+ ${o.qtd > 1 ? `${o.qtd}× ` : ''}${t(o.nome)}${o.preco ? ` ${din(o.preco)}` : ''}`).join(' · ')}${i.obs ? `${(i.opcoes || []).length ? ' · ' : ''}Obs.: ${t(i.obs)}` : ''}</small>` : ''}</div>`;
  const passo2 = () => {
    const d = lido.dados, f = lido.faltou, ent = d.tipo === 'TAKEOUT' ? 'TAKEOUT' : d.entregaPor === 'MERCHANT' ? 'MERCHANT' : 'IFOOD';
    const semNum = ent !== 'TAKEOUT' && !/\d/.test(d.endereco?.texto || ''), semBai = ent !== 'TAKEOUT' && !d.endereco?.bairro, semPg = d.pagamento.online == null;
    const semTroco = d.pagamento.online === false && d.pagamento.forma === 'Dinheiro' && !d.pagamento.trocoPara, semCasar = d.itens.filter((i) => !i.prod).length;
    const nDuv = [!d.codigo, !d.cliente.nome, semNum, semBai, semPg, semTroco].filter(Boolean).length + semCasar;
    return `${f.length ? `<p class="aviso">Não achei ${f.join(', ')}. Confira e complete abaixo.</p>` : nDuv ? '' : '<p class="aviso ok">Pedido reconhecido. Confira e toque em Criar o pedido.</p>'}
    ${nDuv ? `<p class="aviso amarelo" data-aviso-duv>${ico('alerta')}<span>O que está em <b>amarelo</b> eu não tenho certeza. Confira com a tela do iFood antes de criar.</span></p>` : ''}
    <div class="grade2"><label class="campo${duv(!d.codigo, '')}"><span>Nº do pedido no iFood</span><input data-cod maxlength="12" value="${t(d.codigo)}" inputmode="numeric">${dica(!d.codigo, 'Não achei o número: copie do iFood')}</label>
      <label class="campo${duv(!d.cliente.nome, '')}"><span>Cliente</span><input data-cli maxlength="80" value="${t(d.cliente.nome)}">${dica(!d.cliente.nome, 'Não achei o nome do cliente')}</label></div>
    <p class="campo"><span>Entrega</span></p><div class="chips quebra" role="group" aria-label="Entrega">${[['IFOOD', 'Entrega iFood'], ['MERCHANT', 'Entrega própria'], ['TAKEOUT', 'Retirada']].map(([k, n]) => `<button type="button" class="chip" data-ent="${k}" aria-pressed="${ent === k}">${n}</button>`).join('')}</div>
    <div data-end-bloco ${ent === 'TAKEOUT' ? 'hidden' : ''}><label class="campo${duv(semNum, '')}" style="margin-top:10px"><span>Endereço</span><input data-end maxlength="160" value="${t(d.endereco?.texto || '')}">${dica(semNum, d.endereco?.texto ? 'Endereço sem número: confira a rua e o número' : 'Não achei o endereço: copie do iFood')}</label>
      <div class="grade2"><label class="campo${duv(semBai, '')}"><span>Bairro</span><input data-bai maxlength="80" value="${t(d.endereco?.bairro || '')}">${dica(semBai, 'Não achei o bairro')}</label><label class="campo"><span>Referência</span><input data-ref maxlength="120" value="${t(d.endereco?.referencia || '')}"></label></div></div>
    <p class="campo" style="margin-top:6px"><span>Itens</span></p><div class="if-itens" data-itens>${d.itens.map(linhaItem).join('')}</div>
    <button type="button" class="bt pq" data-mais-item>${ico('mais2')}Pôr item</button>
    <div class="grade2" style="margin-top:12px"><label class="campo"><span>Taxa de entrega</span><input data-taxa inputmode="decimal" value="${vir(d.taxa.toFixed(2))}"></label>
      <label class="campo"><span>Desconto ou cupom</span><input data-desc inputmode="decimal" value="${vir(d.descontos.toFixed(2))}"></label></div>
    <p class="campo${duv(semPg, '')}"><span>Pagamento</span>${dica(semPg, 'Não deu para saber: foi pago no app ou cobra na entrega?')}</p><div class="chips quebra" role="group" aria-label="Pagamento">${[['app', 'Pago no app do iFood'], ['entrega', ent === 'TAKEOUT' ? 'Cobrar na retirada' : 'Cobrar na entrega']].map(([k, n]) => `<button type="button" class="chip" data-pg="${k}" aria-pressed="${(d.pagamento.online === false ? 'entrega' : d.pagamento.online ? 'app' : '') === k}">${n}</button>`).join('')}</div>
    <div class="grade2" data-pg-bloco ${d.pagamento.online === false ? '' : 'hidden'}><label class="campo" style="margin-top:10px"><span>Forma</span><select data-forma>${['Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Pix', 'Vale-refeição', 'Cartão na entrega'].map((x) => `<option ${x === d.pagamento.forma ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label class="campo${duv(semTroco, '')}" style="margin-top:10px"><span>Troco para</span><input data-troco inputmode="decimal" value="${d.pagamento.trocoPara ? vir(d.pagamento.trocoPara.toFixed(2)) : ''}" placeholder="Sem troco">${dica(semTroco, 'Paga em dinheiro: o cliente pediu troco?')}</label></div>
    <p class="if-total" data-if-total>Total no Popina: <b data-total></b>${d.total ? ` <span class="mudo">· o iFood mostrou ${din(d.total)}</span>` : ''}</p><small class="dica-duv" data-dica-total hidden>${ico('alerta')}Não fecha com o total do iFood: confira o valor de cada item, a taxa e o desconto.</small>`;
  };
  folha({ titulo: 'Pedido do iFood', larga: true, corpo: '<div data-c></div>', pe: '<div data-pe class="linha-bts" style="width:100%;justify-content:flex-end"></div>',
    aoAbrir: (f, fechar) => {
      const C = $('[data-c]', f), PE = $('[data-pe]', f);
      // lê o que está na tela de volta para o pedido (antes de redesenhar ou de criar)
      const ler = () => {
        const d = lido.dados;
        d.codigo = $('[data-cod]', f).value.replace(/\D/g, '').slice(0, 12); d.cliente.nome = $('[data-cli]', f).value.trim();
        const ent = $('[data-ent][aria-pressed=true]', f)?.dataset.ent || 'IFOOD';
        d.tipo = ent === 'TAKEOUT' ? 'TAKEOUT' : 'DELIVERY'; d.entregaPor = ent === 'TAKEOUT' ? '' : ent;
        d.endereco = { ...(d.endereco || {}), texto: $('[data-end]', f).value.trim(), bairro: $('[data-bai]', f).value.trim(), referencia: $('[data-ref]', f).value.trim() };
        d.itens = $$('.if-item', f).map((el) => { const i = d.itens[Number(el.dataset.k)] || { opcoes: [], obs: '' }; const val = num($('[data-v]', el).value), opc = (i.opcoes || []).reduce((s, o) => s + o.preco, 0);
          return { ...i, qtd: Math.max(1, Math.round(num($('[data-q]', el).value) || 1)), nome: $('[data-n]', el).value.trim() || 'Item', total: r2(Math.max(0, val - opc)), prod: $('[data-p]', el).value }; });
        d.taxa = num($('[data-taxa]', f).value); d.descontos = num($('[data-desc]', f).value);
        const pg = $('[data-pg][aria-pressed=true]', f)?.dataset.pg; d.pagamento.online = pg === 'app' ? true : pg === 'entrega' ? false : null;
        d.pagamento.forma = $('[data-forma]', f).value; d.pagamento.trocoPara = num($('[data-troco]', f).value);
      };
      const somar = () => { if (!lido) return; ler(); const d = lido.dados; const s = d.itens.reduce((k, i) => k + i.total + (i.opcoes || []).reduce((m, o) => m + o.preco, 0), 0) + (d.tipo === 'TAKEOUT' ? 0 : d.taxa) - d.descontos;
        $('[data-total]', f).textContent = din(Math.max(0, r2(s)));
        // amarelo ao vivo: o total que não fecha e o item ainda sem par no cardápio
        const naoFecha = d.total > 0 && Math.abs(r2(s) - d.total) >= 0.01;
        $('[data-if-total]', f).classList.toggle('duvida', naoFecha); $('[data-dica-total]', f).hidden = !naoFecha;
        $$('.if-item', f).forEach((el) => el.classList.toggle('duvida', !$('[data-p]', el).value));
        $$('.campo.duvida input', f).forEach((i) => { if (i.value.trim() && !['data-end', 'data-troco'].some((a) => i.hasAttribute(a))) i.closest('.campo').classList.remove('duvida'); }); };
      const mostrar1 = () => {
        lido = null; C.innerHTML = passo1();
        PE.innerHTML = '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio grande" data-ler>Reconhecer o pedido</button>';
        $$('[data-ex]', f).forEach((b) => { b.onclick = () => { $('[data-txt]', f).value = EXEMPLOS[Number(b.dataset.ex)][1]; exemplo = true; }; });
        $('[data-txt]', f).oninput = () => { exemplo = EXEMPLOS.some(([, x]) => x === $('[data-txt]', f).value); };
        $('[data-ler]', f).onclick = () => {
          texto = $('[data-txt]', f).value;
          if (texto.trim().length < 20) { toast('Cole o texto do pedido do iFood'); return $('[data-txt]', f).focus(); }
          lido = lerTextoIfood(texto); lido.dados.itens.forEach((i) => { i.prod = casarItem(i.nome); }); mostrar2();
        };
      };
      const mostrar2 = () => {
        C.innerHTML = passo2(); f.querySelector('.folha-corpo').scrollTop = 0;
        PE.innerHTML = '<button type="button" class="bt" data-de-novo>Colar outro texto</button><button type="button" class="bt cheio grande" data-criar>' + ico('check') + 'Criar o pedido</button>';
        const redesenha = () => { ler(); mostrar2(); };
        $$('[data-ent]', f).forEach((b) => { b.onclick = () => { $$('[data-ent]', f).forEach((x) => x.setAttribute('aria-pressed', x === b)); redesenha(); }; });
        $$('[data-pg]', f).forEach((b) => { b.onclick = () => { $$('[data-pg]', f).forEach((x) => x.setAttribute('aria-pressed', x === b)); redesenha(); }; });
        $$('[data-tira]', f).forEach((b) => { b.onclick = () => { b.closest('.if-item').remove(); redesenha(); }; });
        $('[data-mais-item]', f).onclick = () => { ler(); lido.dados.itens.push({ nome: '', qtd: 1, total: 0, opcoes: [], obs: '', prod: '' }); mostrar2(); $$('.if-item [data-n]', f).at(-1)?.focus(); };
        $$('input, select', C).forEach((x) => x.addEventListener('input', somar));
        $$('.if-item [data-p]', f).forEach((s) => { s.onchange = () => { const el = s.closest('.if-item'), n = $('[data-n]', el); if (!n.value.trim() && s.value) n.value = db.produtos.find((p) => p.id === s.value)?.nome || ''; somar(); }; });
        somar();
        $('[data-de-novo]', f).onclick = mostrar1;
        $('[data-criar]', f).onclick = async () => {
          ler(); const d = lido.dados;
          if (!d.itens.length) return toast('Escreva pelo menos um item');
          if (d.tipo !== 'TAKEOUT' && !d.endereco.texto) { toast('Escreva o endereço da entrega'); return $('[data-end]', f).focus(); }
          if (d.pagamento.online == null) return toast('Escolha se foi pago no app ou se cobra na entrega');
          const ja = jaColado(d.codigo);
          if (ja && !(await confirma(`O pedido #${d.codigo} do iFood já foi colado hoje. Criar de novo?`, 'Criar de novo'))) return;
          criarPedidoIfood(d, { exemplo });
          fechar(); toast(`Pedido do iFood${d.codigo ? ` #${d.codigo}` : ''} foi para a cozinha`); ir('pedidos');
        };
      };
      if (texto) { lido = lerTextoIfood(texto); lido.dados.itens.forEach((i) => { i.prod = casarItem(i.nome); }); mostrar2(); } else mostrar1();
    } });
}
acao('ifood-colar', () => colarIfood());
// colar direto (Ctrl+V) no quadro de Pedidos, fora de um campo: se parecer um pedido do iFood, abre já reconhecido
document.addEventListener('paste', (e) => {
  if (!location.hash.startsWith('#pedidos') || document.querySelector('.folha-fundo') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
  const x = e.clipboardData?.getData('text') || '';
  if (x.length > 40 && /ifood|pedido\s*#?\s*\d{3}/i.test(x) && /\d,\d{2}/.test(x)) { e.preventDefault(); colarIfood(x); }
});

// ------------------------------------------------------------------ Configurações › iFood (comissão e a integração automática, em breve)
export function blocoConfig(g) {
  const pct = comissaoIfood();
  return `<section class="cartao cfg-sec" id="cfg-ifood"><h2><span class="selo-ifood">iFood</span> iFood</h2>
    <p class="mudo">Os pedidos do iFood entram no Popina colando o texto do pedido: em <b>Pedidos › Pedido do iFood</b>, cole o que copiou no Gestor de Pedidos (ou o texto da impressão). O Popina reconhece os itens, os valores e a entrega, e manda para a cozinha.</p>
    <div class="linha-bts" style="margin:12px 0"><button type="button" class="bt cheio" data-acao="ifood-colar">${ico('sacola')}Colar um pedido do iFood</button></div>
    <label class="campo"><span>Comissão que o iFood cobra de você (%)</span><input data-if-pct inputmode="decimal" maxlength="5" style="max-width:220px" value="${pct ? vir(pct) : ''}" placeholder="Ex.: 23" ${g ? '' : 'readonly'}>
      <small>Está no seu contrato ou no Portal do Parceiro. Some a taxa do pagamento online, se pagar. Os Relatórios mostram quanto foi para o iFood e quanto você economiza nos pedidos do seu link.</small></label>
    ${g ? `<div class="linha-bts"><button type="button" class="bt" data-if-salvar>${ico('check')}Salvar a comissão</button></div>` : ''}
    <p class="aviso" style="margin-top:12px">${ico('relogio')}Em breve: os pedidos do iFood entrando sozinhos no Popina, sem colar.</p>
  </section>`;
}
export function montarConfig(el) {
  $('[data-if-salvar]', el)?.addEventListener('click', () => {
    const v = num($('[data-if-pct]', el).value); if (v < 0 || v > 60) return toast('Escreva a comissão entre 0 e 60%');
    setLoja({ ifoodComissao: r2(v) }); toast(v ? `Comissão do iFood: ${vir(r2(v))}%` : 'Comissão do iFood tirada');
  });
}
// Relatórios: quanto foi para o iFood e quanto ficou no seu link (o cardápio online do Popina não cobra comissão)
export function blocoRelatorio(vs) {
  const ifo = vs.filter((v) => v.origem === 'iFood'), link = vs.filter((v) => v.origem === 'Cardápio online');
  if (!ifo.length && !comissaoIfood()) return '';
  const pct = comissaoIfood(), base = (v) => Math.max(0, v.total - (v.entrega || 0)), tIf = r2(ifo.reduce((s, v) => s + v.total, 0)), tLk = r2(link.reduce((s, v) => s + v.total, 0));
  const com = r2(ifo.reduce((s, v) => s + base(v), 0) * pct / 100);
  return `<div class="cartao"><h2><span class="selo-ifood">iFood</span> iFood × seu link</h2>
    <div class="kpis kpis-pq"><div><small>Pelo iFood</small><b>${din(tIf)}</b><span>${ifo.length} ${ifo.length === 1 ? 'pedido' : 'pedidos'}</span></div>
      <div><small>Foi para o iFood</small><b>${pct ? din(com) : '—'}</b><span>${pct ? `${vir(pct)}% de comissão (estimativa)` : 'Informe a comissão'}</span></div>
      <div><small>Pelo seu link</small><b>${din(tLk)}</b><span>${link.length} ${link.length === 1 ? 'pedido' : 'pedidos'} sem comissão</span></div></div>
    <p class="mudo" style="margin-top:8px">${pct ? (com > 0 ? `Se esses pedidos do iFood viessem pelo seu cardápio online, ficariam <b>${din(com)}</b> a mais com você no período.` : 'Nenhum pedido do iFood no período.') : '<button type="button" class="bt pq" data-ir="mais/config/cfg-ifood">Informar a comissão do iFood</button>'}</p></div>`;
}
