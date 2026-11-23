// Tecton · trazer o que a empresa já usa (22/11/2026). Tudo entra por ação do cliente: arquivo que ele baixou ou foto que tirou.
//  1. Planilha (Excel .xlsx ou CSV, ou colar do Excel) com as colunas sugeridas pelo cabeçalho e ajustáveis:
//     loja → produtos · todos → clientes e fornecedores · imobiliária → imóveis · construtora → obras (e etapas).
//  2. Loja: XML da NF-e de compra (um ou vários de uma vez) → entrada de mercadoria com fator de embalagem
//     (SC, MIL, CX, PCT → unidade de venda e custo de cada uma), conferida antes de gravar.
//  3. Construtora: orçamento ou lista da loja de material (foto ou PDF) lido pela IA → itens conferidos antes
//     de entrar no orçamento da obra ou num pedido de compra.
// Regra: só acrescenta ou atualiza (pelo código, documento ou nome), nunca apaga. Cada registro novo leva o lote (imp).
import { db, grava, CONTA, acao, ir, ico, t, R$, n2, num, hoje, somaDias, uid, soma, pl, folha, toast, $, $$, reduzir } from './nucleo.js?v=4';

const sem = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const digitos = (s) => String(s || '').replace(/\D/g, '');
const lote = () => 'imp' + Date.now().toString(36);

// ================================================================== leitura de .xlsx sem biblioteca (cópia adaptada de base/le-xlsx.js)
const u16 = (b, i) => b[i] | (b[i + 1] << 8);
const u32 = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
function zip(buf) {
  const b = new Uint8Array(buf); let fim = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 70000); i--) if (u32(b, i) === 0x06054b50) { fim = i; break; }
  if (fim < 0) throw new Error('Esse arquivo não parece uma planilha do Excel (.xlsx).');
  const n = u16(b, fim + 10), out = {}; let p = u32(b, fim + 16);
  for (let k = 0; k < n; k++) {
    const metodo = u16(b, p + 10), tamC = u32(b, p + 20), ln = u16(b, p + 28), le = u16(b, p + 30), lc = u16(b, p + 32), local = u32(b, p + 42);
    const nome = new TextDecoder().decode(b.subarray(p + 46, p + 46 + ln)), ini = local + 30 + u16(b, local + 26) + u16(b, local + 28);
    out[nome] = { metodo, dados: b.subarray(ini, ini + tamC) }; p += 46 + ln + le + lc;
  }
  return out;
}
const abre = (f) => !f ? Promise.resolve('') : f.metodo === 0 ? Promise.resolve(new TextDecoder().decode(f.dados)) : new Response(new Blob([f.dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
const colN = (ref) => { const l = ref.replace(/\d+/g, ''); let n = 0; for (let i = 0; i < l.length; i++) n = n * 26 + (l.charCodeAt(i) - 64); return n - 1; };
const desfaz = (s) => s.replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d))).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
async function lerXlsx(buf) {
  const a = zip(buf), aba = a['xl/worksheets/sheet1.xml'] || a[Object.keys(a).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0]];
  if (!aba) throw new Error('A planilha não tem nenhuma aba.');
  const [ss, xml, st] = await Promise.all([abre(a['xl/sharedStrings.xml']), abre(aba), abre(a['xl/styles.xml'])]);
  const comp = []; let m; const re = /<si>([\s\S]*?)<\/si>/g;
  while ((m = re.exec(ss))) comp.push(desfaz((m[1].match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map((x) => x.replace(/<[^>]+>/g, '')).join('')));
  const datas = {}, proprios = {}, xfs = ((st.match(/<cellXfs[\s\S]*?<\/cellXfs>/) || [''])[0].match(/<xf [^>]*>/g)) || [];
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
      else if (v != null) { val = desfaz(v); if (datas[s] && /^\d+(\.\d+)?$/.test(val)) val = new Date(Date.UTC(1899, 11, 30) + Math.round(Number(val)) * 864e5).toISOString().slice(0, 10); }
      lin[ref ? colN(ref) : lin.length] = val;
    }
    for (let i = 0; i < lin.length; i++) if (lin[i] == null) lin[i] = '';
    if (lin.some((x) => String(x).trim())) linhas.push(lin);
  }
  return linhas;
}
// CSV (vírgula, ponto e vírgula ou tabulação, com aspas) e o que se cola do Excel (tabulação)
function lerCsv(txt) {
  txt = String(txt || '').replace(/^﻿/, '');
  const pri = txt.split(/\r?\n/)[0] || '', sep = pri.includes('\t') ? '\t' : (pri.split(';').length >= pri.split(',').length ? ';' : ',');
  const out = []; let lin = [], cel = '', asp = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (asp) { if (c === '"' && txt[i + 1] === '"') { cel += '"'; i++; } else if (c === '"') asp = false; else cel += c; continue; }
    if (c === '"' && !cel) asp = true; else if (c === sep) { lin.push(cel); cel = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; lin.push(cel); cel = ''; if (lin.some((x) => x.trim())) out.push(lin); lin = []; } else cel += c;
  }
  lin.push(cel); if (lin.some((x) => x.trim())) out.push(lin);
  return out;
}
// datas: DD/MM/AAAA, AAAA-MM-DD ou o número de série do Excel
function data(s) {
  s = String(s || '').trim(); if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/); if (m) { const a = m[3].length === 2 ? '20' + m[3] : m[3]; return `${a}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  if (/^\d{5}(\.\d+)?$/.test(s)) return new Date(Date.UTC(1899, 11, 30) + Math.round(Number(s)) * 864e5).toISOString().slice(0, 10);
  return '';
}
const UNS = { sc: /^(sc|saco|sacos)$/, 'm³': /^(m3|m³|metro cubico)$/, 'm²': /^(m2|m²|metro quadrado)$/, m: /^(m|mt|mts|metro|metros|ml)$/, pç: /^(pc|pç|pca|peca|pecas|pç\.)$/, br: /^(br|barra|barras)$/, kg: /^(kg|kgs|quilo)$/, lata: /^(lata|lt18|gl|galao)$/, bd: /^(bd|balde)$/, rolo: /^(rl|rolo|rolos)$/, lt: /^(l|lt|litro|litros)$/, cx: /^(cx|caixa)$/, un: /^(un|und|unid|unidade|uni)$/ };
const unidade = (s) => { const x = sem(s).replace(/ /g, ''); return Object.keys(UNS).find((k) => UNS[k].test(x) || UNS[k].test(String(s || '').trim().toLowerCase())) || (x ? 'un' : ''); };

// ================================================================== o que cada planilha preenche
// c: campos (k, r rótulo, sin: nomes de coluna que costumam aparecer — Bling, Tiny, planilha própria), chave para achar o que já existe
const ALVOS = {
  produtos: { nome: 'produtos', ramo: 'loja', tela: 'estoque', modelo: 'Código;Descrição;Unidade;Preço;Preço de custo;Estoque;Estoque mínimo\n7891234567890;Cimento CP-II 50 kg;SC;38,90;31,20;100;20',
    c: [{ k: 'nome', r: 'Nome do produto', req: 1, sin: ['descricao', 'produto', 'nome', 'item', 'descricao do produto', 'nome do produto'] }, { k: 'cod', r: 'Código de barras ou código', sin: ['codigo', 'ean', 'gtin', 'codigo de barras', 'cod barras', 'codigo sku', 'sku', 'referencia', 'cod'] },
      { k: 'un', r: 'Unidade', sin: ['unidade', 'un', 'und', 'unid', 'unidade de medida'] }, { k: 'preco', r: 'Preço de venda', req: 1, sin: ['preco', 'preco de venda', 'preco venda', 'valor', 'valor de venda', 'venda', 'preco unitario'] },
      { k: 'custo', r: 'Custo', sin: ['preco de custo', 'custo', 'preco custo', 'valor de custo', 'preco de compra', 'custo unitario'] }, { k: 'estoque', r: 'Estoque', sin: ['estoque', 'saldo', 'quantidade', 'qtd', 'qtde', 'estoque atual', 'saldo em estoque'] },
      { k: 'minimo', r: 'Estoque mínimo', sin: ['estoque minimo', 'minimo', 'est minimo', 'qtd minima'] }] },
  pessoas: { nome: 'clientes e fornecedores', tela: 'clientes', modelo: 'Nome;Tipo;Telefone;CPF/CNPJ;E-mail;Endereço;Cidade\nMaria da Silva;Cliente;(16) 99999-0000;123.456.789-00;maria@exemplo.com;Rua 1, 100;Orlândia/SP',
    c: [{ k: 'nome', r: 'Nome', req: 1, sin: ['nome', 'razao social', 'cliente', 'fornecedor', 'nome fantasia', 'contato', 'nome completo'] }, { k: 'tipo', r: 'Cliente ou fornecedor', sin: ['tipo', 'categoria', 'tipo de contato', 'cliente fornecedor'] },
      { k: 'fone', r: 'Telefone ou WhatsApp', sin: ['telefone', 'celular', 'whatsapp', 'fone', 'tel', 'telefone celular', 'contato telefone'] }, { k: 'doc', r: 'CPF ou CNPJ', sin: ['cpf cnpj', 'cpf', 'cnpj', 'documento', 'cnpj cpf', 'doc'] },
      { k: 'email', r: 'E-mail', sin: ['email', 'e mail', 'correio'] }, { k: 'endereco', r: 'Endereço', sin: ['endereco', 'logradouro', 'rua', 'endereco completo'] }, { k: 'cidade', r: 'Cidade', sin: ['cidade', 'municipio', 'cidade uf'] }] },
  imoveis: { nome: 'imóveis', ramo: 'imobiliaria', tela: 'imoveis/avulsos', modelo: 'Referência;Título;Tipo;Finalidade;Valor;Bairro;Área;Quartos;Proprietário;Situação\nCA-101;Casa 3 quartos com quintal;Casa;Venda;420000;Centro;150;3;João Pereira;Livre',
    c: [{ k: 'titulo', r: 'Título', req: 1, sin: ['titulo', 'imovel', 'descricao', 'nome', 'anuncio'] }, { k: 'ref', r: 'Referência (código)', sin: ['referencia', 'ref', 'codigo', 'cod', 'cod imovel'] },
      { k: 'tipo', r: 'Tipo', sin: ['tipo', 'tipo do imovel', 'categoria'] }, { k: 'fin', r: 'Venda ou aluguel', sin: ['finalidade', 'para', 'negocio', 'transacao', 'venda aluguel', 'operacao'] },
      { k: 'preco', r: 'Preço ou aluguel', req: 1, sin: ['valor', 'preco', 'aluguel', 'valor de venda', 'valor do aluguel', 'preco venda'] }, { k: 'bairro', r: 'Bairro', sin: ['bairro', 'localizacao', 'regiao'] },
      { k: 'area', r: 'Área (m²)', sin: ['area', 'm2', 'metragem', 'area util', 'area total', 'area m2'] }, { k: 'quartos', r: 'Quartos', sin: ['quartos', 'dormitorios', 'dorm', 'qtd quartos'] },
      { k: 'proprietario', r: 'Proprietário', sin: ['proprietario', 'dono', 'proprietaria'] }, { k: 'status', r: 'Situação', sin: ['situacao', 'status', 'disponibilidade'] }] },
  obras: { nome: 'obras', ramo: 'construtora', tela: 'obras', modelo: 'Obra;Cliente;Endereço;Início;Entrega;Situação;Valor do contrato;Etapa;Etapa início;Etapa fim;% feito\nResidência Silva;José Silva;Rua 5, 200;01/12/2026;30/06/2027;Em andamento;350000;Fundação;01/12/2026;31/12/2026;0',
    c: [{ k: 'nome', r: 'Nome da obra', req: 1, sin: ['obra', 'nome da obra', 'nome', 'projeto', 'empreendimento'] }, { k: 'cliente', r: 'Cliente', sin: ['cliente', 'contratante', 'proprietario'] },
      { k: 'endereco', r: 'Endereço', sin: ['endereco', 'local', 'endereco da obra'] }, { k: 'inicio', r: 'Começa em', sin: ['inicio', 'data inicio', 'data de inicio', 'comeco', 'inicio da obra'] },
      { k: 'fim', r: 'Entrega prevista', sin: ['entrega', 'fim', 'termino', 'previsao', 'data entrega', 'previsao de entrega', 'prazo'] }, { k: 'status', r: 'Situação', sin: ['situacao', 'status', 'andamento'] },
      { k: 'valor', r: 'Valor do contrato', sin: ['valor do contrato', 'valor', 'contrato', 'preco', 'valor total'] }, { k: 'etapa', r: 'Etapa', sin: ['etapa', 'fase', 'servico'] },
      { k: 'etapaIni', r: 'Etapa: início', sin: ['etapa inicio', 'inicio etapa', 'inicio da etapa'] }, { k: 'etapaFim', r: 'Etapa: fim', sin: ['etapa fim', 'fim etapa', 'fim da etapa', 'termino etapa'] },
      { k: 'etapaPct', r: 'Etapa: % feito', sin: ['feito', 'pct', 'percentual', 'concluido', 'avanco', 'etapa pct'] }] },
};
// sugere a coluna de cada campo pelo cabeçalho (igual primeiro, depois "começa com" / "contém"); cada coluna serve a um campo só
function sugerir(cab, alvo, salvo) {
  const h = cab.map(sem), usado = new Set(), m = {};
  if (salvo && salvo.cab === h.join('|')) return { ...salvo.mapa };
  [0, 1, 2].forEach((passo) => ALVOS[alvo].c.forEach((c) => {
    if (m[c.k] != null) return;
    const i = h.findIndex((x, k) => !usado.has(k) && x && c.sin.some((s) => passo === 0 ? x === s : passo === 1 ? x.startsWith(s + ' ') || x.endsWith(' ' + s) : s.length > 3 && x.includes(s)));
    if (i >= 0) { m[c.k] = i; usado.add(i); }
  }));
  return m;
}

// ================================================================== 1. planilha
const achaPessoa = (nome, criar, tipo = 'cliente', L) => {
  const n = sem(nome); if (!n) return '';
  const p = db.pessoas.find((x) => sem(x.nome) === n); if (p) return p.id;
  if (!criar) return '';
  const novo = { id: uid('p'), tipo, nome: String(nome).trim(), fone: '', email: '', doc: '', cidade: `${db.config.cidade || ''}/${db.config.uf || ''}`, obs: '', imp: L }; db.pessoas.push(novo); return novo.id;
};
// procura o que já existe (só para atualizar; nunca apaga)
const EXISTE = {
  produtos: (d) => (d.cod && db.produtos.find((p) => p.cod && p.cod === d.cod)) || db.produtos.find((p) => sem(p.nome) === sem(d.nome)),
  pessoas: (d) => (digitos(d.doc).length >= 11 && db.pessoas.find((p) => digitos(p.doc) === digitos(d.doc))) || (digitos(d.fone).length >= 10 && db.pessoas.find((p) => digitos(p.fone).slice(-8) === digitos(d.fone).slice(-8) && sem(p.nome) === sem(d.nome))) || db.pessoas.find((p) => sem(p.nome) === sem(d.nome)),
  imoveis: (d) => (d.ref && db.imoveis.find((u) => u.ref && sem(u.ref) === sem(d.ref))) || db.imoveis.find((u) => !u.emp && sem(u.titulo) === sem(d.titulo) && sem(u.bairro) === sem(d.bairro)),
  obras: (d) => db.obras.find((o) => sem(o.nome) === sem(d.nome)),
};
const STATUS_OBRA = (s) => { const x = sem(s); return /orc/.test(x) ? 'orcamento' : /parad|suspens/.test(x) ? 'parada' : /entreg|conclu|finaliz|pronta/.test(x) ? 'entregue' : x ? 'andamento' : ''; };
const STATUS_IM = (s) => { const x = sem(s); return /reserv/.test(x) ? 'reservada' : /vendid/.test(x) ? 'vendida' : /alugad|locad|ocupad/.test(x) ? 'alugada' : /permut/.test(x) ? 'permuta' : 'livre'; };
const TIPO_IM = (s) => { const x = sem(s); return /apart|apto/.test(x) ? 'Apartamento' : /terren|lote/.test(x) ? 'Terreno' : /sala|comerc|loja/.test(x) ? 'Sala comercial' : /galp|barrac/.test(x) ? 'Galpão' : /chac|sitio|rural/.test(x) ? 'Chácara' : 'Casa'; };
// linha da planilha → registro limpo
function montar(alvo, lin, mapa, padrao) {
  const v = (k) => (mapa[k] != null && mapa[k] !== '' ? String(lin[mapa[k]] ?? '').trim() : '');
  if (alvo === 'produtos') return { nome: v('nome'), cod: digitos(v('cod')) || v('cod').replace(/\s/g, ''), un: unidade(v('un')) || 'un', preco: num(v('preco')), custo: num(v('custo')), estoque: num(v('estoque')), minimo: num(v('minimo')), _tem: ['cod', 'un', 'custo', 'estoque', 'minimo'].filter((k) => v(k) !== '') };
  if (alvo === 'pessoas') { const tp = sem(v('tipo')); return { nome: v('nome'), tipo: /ambos|cliente e forn|cli forn/.test(tp) ? 'ambos' : /forn/.test(tp) ? 'fornecedor' : /cli/.test(tp) ? 'cliente' : padrao, fone: v('fone'), doc: v('doc'), email: v('email'), endereco: v('endereco'), cidade: v('cidade') }; }
  if (alvo === 'imoveis') { const f = sem(v('fin')); return { titulo: v('titulo'), ref: v('ref'), tipo: TIPO_IM(v('tipo') || v('titulo')), fin: /alug|loca/.test(f) ? 'aluguel' : 'venda', preco: num(v('preco')), bairro: v('bairro'), area: num(v('area')), quartos: num(v('quartos')), proprietario: v('proprietario'), status: STATUS_IM(v('status')) }; }
  return { nome: v('nome'), cliente: v('cliente'), endereco: v('endereco'), inicio: data(v('inicio')), fim: data(v('fim')), status: STATUS_OBRA(v('status')) || 'andamento', valor: num(v('valor')), etapa: v('etapa'), etapaIni: data(v('etapaIni')), etapaFim: data(v('etapaFim')), etapaPct: Math.max(0, Math.min(100, num(String(v('etapaPct')).replace('%', '')))) };
}
// grava: atualiza o que existe (só os campos que a planilha trouxe) e cria o resto
function gravar(alvo, regs, atualizar, L) {
  let novos = 0, atual = 0, pulou = 0; const obrasVistas = {};
  regs.forEach((d) => {
    if (alvo === 'obras') {
      let o = obrasVistas[sem(d.nome)] || EXISTE.obras(d);
      if (o && !obrasVistas[sem(d.nome)] && !o.imp?.startsWith?.(L)) { if (!atualizar) { pulou++; return; } }
      if (!o) {
        const ini = d.inicio || hoje(), fim = d.fim && d.fim > ini ? d.fim : somaDias(ini, 180);
        o = { id: uid('o'), nome: d.nome, cliente: achaPessoa(d.cliente, true, 'cliente', L), endereco: d.endereco, inicio: ini, fim, status: d.status, tipo: 'residencial', bdi: 22, multaDia: 0, horario: '', foto: '', token: uid('k'), etapas: [], orc: [], valor: d.valor, medicoes: [], aditivos: [], diario: [], docs: [], imp: L };
        db.obras.unshift(o); novos++;
      } else if (!obrasVistas[sem(d.nome)]) {
        if (d.cliente && !o.cliente) o.cliente = achaPessoa(d.cliente, true, 'cliente', L);
        ['endereco', 'inicio', 'fim'].forEach((k) => { if (d[k]) o[k] = d[k]; }); if (d.valor) o.valor = d.valor; atual++;
      }
      obrasVistas[sem(d.nome)] = o;
      if (d.etapa) { let e = o.etapas.find((x) => sem(x.nome) === sem(d.etapa)); const ini = d.etapaIni || o.inicio, fim = d.etapaFim && d.etapaFim >= ini ? d.etapaFim : o.fim;
        if (e) Object.assign(e, { ini, fim, pct: d.etapaPct || e.pct }); else o.etapas.push({ id: uid('e'), nome: d.etapa, ini, fim, pct: d.etapaPct || 0 }); }
      return;
    }
    const ex = EXISTE[alvo](d);
    if (ex) {
      if (!atualizar) { pulou++; return; }
      if (alvo === 'produtos') { if (d.preco) ex.preco = d.preco; d._tem.forEach((k) => { if (k === 'cod' && db.produtos.some((p) => p !== ex && p.cod === d.cod)) return; ex[k] = d[k]; }); }
      else if (alvo === 'pessoas') ['fone', 'doc', 'email', 'endereco', 'cidade'].forEach((k) => { if (d[k]) ex[k] = d[k]; });
      else { ['ref', 'bairro'].forEach((k) => { if (d[k]) ex[k] = d[k]; }); ['preco', 'area', 'quartos'].forEach((k) => { if (d[k]) ex[k] = d[k]; }); if (d.proprietario && !ex.proprietario) ex.proprietario = achaPessoa(d.proprietario, true, 'cliente', L); }
      atual++; return;
    }
    if (alvo === 'produtos') { const { _tem, ...p } = d; if (p.cod && db.produtos.some((x) => x.cod === p.cod)) p.cod = ''; db.produtos.push({ id: uid('pr'), ...p, faixas: [], compra: '', fator: 1, ult: '', imp: L }); }
    else if (alvo === 'pessoas') db.pessoas.push({ id: uid('p'), ...d, cidade: d.cidade || `${db.config.cidade || ''}/${db.config.uf || ''}`, obs: '', imp: L });
    else db.imoveis.push({ id: uid('im'), emp: '', bloco: '', andar: 0, num: '', foto: '', ...d, proprietario: achaPessoa(d.proprietario, true, 'cliente', L), imp: L });
    novos++;
  });
  // obra nova sem etapa na planilha: uma etapa "Obra toda" para já poder orçar
  Object.values(obrasVistas).forEach((o) => { if (!o.etapas.length) o.etapas.push({ id: uid('e'), nome: 'Obra toda', ini: o.inicio, fim: o.fim, pct: 0 }); });
  return { novos, atual, pulou };
}
function baixarModelo(alvo) {
  const b = new Blob(['﻿' + ALVOS[alvo].modelo.replace(/\n/g, '\r\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = `modelo-${alvo}-tecton.csv`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
export function importarPlanilha(alvo) {
  const A = ALVOS[alvo]; if (!A) return;
  const { el, fechar } = folha({ titulo: `Importar ${A.nome}`, larga: true,
    corpo: `<div class="imp-passo" data-passo1><p class="mudo">Traga a planilha que você já usa: a do Excel (.xlsx), o arquivo .csv que outro sistema exporta (Bling, Tiny, o programa antigo) ou copie as linhas no Excel e cole aqui. Na próxima tela você confere as colunas antes de gravar.</p>
      <label class="imp-solta" data-solta><input type="file" accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-arq-pl>${ico('doc')}<b>Escolher a planilha</b><small>.xlsx ou .csv · ou arraste o arquivo para cá</small></label>
      <label class="campo largo"><span>Ou cole aqui as linhas copiadas do Excel (com o cabeçalho)</span><textarea data-cola-pl rows="4" placeholder="Nome&#9;Telefone&#9;…"></textarea></label>
      <div class="linha-bts" style="margin-top:6px"><button type="button" class="bt pq" data-modelo-pl>${ico('abaixo')}Baixar um modelo</button><button type="button" class="bt pq cheio" data-ler-cola>Ler o que colei</button></div>
      <p class="mudo peq" style="margin-top:8px">Só acrescenta ou atualiza: nada do que já está no Tecton é apagado.</p></div><div data-passo2 hidden></div>`,
    pe: '<button type="button" class="bt" data-fechar>Cancelar</button><button type="button" class="bt cheio" data-gravar-pl hidden>Importar</button>' });
  let linhas = [], mapa = {};
  const p2 = $('[data-passo2]', el), btG = $('[data-gravar-pl]', el);
  const salvo = () => (db.config.impMapas || {})[alvo];
  const temCab = () => $('[data-temcab]', el)?.checked !== false;
  const regs = () => { const corpo = temCab() ? linhas.slice(1) : linhas, padrao = $('[data-padrao-tipo]', el)?.value || 'cliente'; return corpo.map((l) => montar(alvo, l, mapa, padrao)).filter((d) => (d.nome || d.titulo) && (!A.c.find((c) => c.k === 'preco') || alvo === 'obras' || d.preco > 0 || EXISTE[alvo](d))); };
  const mostrar = () => {
    const cab = temCab() ? linhas[0] : linhas[0].map((x, i) => `Coluna ${i + 1}`), ncol = Math.max(...linhas.map((l) => l.length));
    const op = (k) => `<option value="">— não tem —</option>${Array.from({ length: ncol }, (x, i) => `<option value="${i}"${String(mapa[k]) === String(i) ? ' selected' : ''}>${t(cab[i] || `Coluna ${i + 1}`)}</option>`).join('')}`;
    const r = regs(), ex = r.filter((d) => alvo === 'obras' ? EXISTE.obras(d) : EXISTE[alvo](d)), falta = A.c.filter((c) => c.req && (mapa[c.k] == null || mapa[c.k] === ''));
    const nObras = alvo === 'obras' ? new Set(r.map((d) => sem(d.nome))).size : 0;
    const col = A.c.filter((c) => mapa[c.k] != null && mapa[c.k] !== '');
    p2.innerHTML = `<p class="mudo" style="margin-bottom:8px">${pl(temCab() ? linhas.length - 1 : linhas.length, 'linha lida', 'linhas lidas')}. O Tecton sugeriu de qual coluna vem cada informação: confira e troque se precisar.</p>
      <label class="liga">A primeira linha é o cabeçalho (nomes das colunas)<input type="checkbox" data-temcab ${temCab() ? 'checked' : ''}></label>
      <div class="imp-mapa">${A.c.map((c) => `<label class="campo"><span>${t(c.r)}${c.req ? ' *' : ''}</span><select data-mapa="${c.k}">${op(c.k)}</select></label>`).join('')}</div>
      ${alvo === 'pessoas' ? `<label class="campo" style="max-width:340px"><span>Quem não tiver o tipo na planilha entra como</span><select data-padrao-tipo><option value="cliente">Cliente</option><option value="fornecedor">Fornecedor</option><option value="ambos">Cliente e fornecedor</option></select></label>` : ''}
      ${falta.length ? `<div class="aviso-box">Escolha a coluna de: ${t(falta.map((c) => c.r).join(', '))}.</div>` : ''}
      <h3 style="margin:14px 0 6px">Prévia${r.length > 8 ? ' (as 8 primeiras)' : ''}</h3>
      <div class="tab-wrap"><table class="tab empilha imp-previa"><thead><tr><th></th>${col.map((c) => `<th>${t(c.r)}</th>`).join('')}</tr></thead><tbody>${r.slice(0, 8).map((d) => { const e = EXISTE[alvo](d);
        return `<tr><td data-r="Situação"><span class="et ${e ? 'info' : 'ok'}">${e ? 'atualiza' : 'novo'}</span></td>${col.map((c) => `<td data-r="${t(c.r)}">${t(fmt(c.k, d[c.k]))}</td>`).join('')}</tr>`; }).join('') || `<tr><td colspan="${col.length + 1}" class="mudo">Nenhuma linha com ${t(A.c.find((c) => c.req).r.toLowerCase())}.</td></tr>`}</tbody></table></div>
      ${ex.length ? `<label class="liga">Atualizar os ${alvo === 'obras' ? 'que já existem' : `${ex.length} que já existem`} (pelo ${alvo === 'produtos' ? 'código ou nome' : alvo === 'pessoas' ? 'CPF/CNPJ, telefone ou nome' : alvo === 'imoveis' ? 'código ou título e bairro' : 'nome da obra'})<input type="checkbox" data-atualizar checked></label>` : ''}`;
    const novos = alvo === 'obras' ? nObras - new Set(ex.map((d) => sem(d.nome))).size : r.length - ex.length;
    btG.hidden = false; btG.disabled = !!falta.length || !r.length; btG.innerHTML = `${ico('check')}Importar ${alvo === 'obras' ? pl(nObras, 'obra', 'obras') : pl(r.length, A.nome === 'imóveis' ? 'imóvel' : 'linha', A.nome === 'imóveis' ? 'imóveis' : 'linhas')}${novos > 0 ? ` (${novos} ${novos === 1 ? 'novo' : 'novos'})` : ''}`;
  };
  const fmt = (k, v) => (['preco', 'custo', 'valor'].includes(k) ? (v ? R$(v) : '') : ['estoque', 'minimo', 'area', 'quartos'].includes(k) ? (v ? n2(v) : '') : /^(inicio|fim|etapaIni|etapaFim)$/.test(k) ? (v ? v.split('-').reverse().join('/') : '') : k === 'etapaPct' ? (v ? `${v}%` : '') : k === 'fin' ? (v === 'aluguel' ? 'Aluguel' : 'Venda') : k === 'status' ? ({ orcamento: 'Em orçamento', andamento: 'Em andamento', parada: 'Parada', entregue: 'Entregue', livre: 'Livre', reservada: 'Reservada', vendida: 'Vendida', alugada: 'Alugada', permuta: 'Permuta' }[v] || v) : k === 'tipo' && alvo === 'pessoas' ? ({ cliente: 'Cliente', fornecedor: 'Fornecedor', ambos: 'Os dois' }[v] || '') : String(v ?? ''));
  const carregou = (l) => {
    if (!l.length) { toast('Não achei linhas nessa planilha'); return; }
    linhas = l.map((x) => x.map((c) => String(c ?? '')));
    mapa = sugerir(linhas[0], alvo, salvo());
    $('[data-passo1]', el).hidden = true; p2.hidden = false; mostrar();
  };
  const lerArquivo = async (f) => {
    if (!f) return;
    try { if (/\.xlsx$/i.test(f.name) || /spreadsheetml/.test(f.type)) carregou(await lerXlsx(await f.arrayBuffer()));
      else { const buf = await f.arrayBuffer(); let tx = new TextDecoder('utf-8').decode(buf); if (tx.includes('�')) tx = new TextDecoder('windows-1252').decode(buf); carregou(lerCsv(tx)); } }
    catch (e) { toast(e.message || 'Não deu para ler esse arquivo'); }
  };
  $('[data-arq-pl]', el).onchange = (e) => lerArquivo(e.target.files[0]);
  const solta = $('[data-solta]', el);
  solta.addEventListener('dragover', (e) => { e.preventDefault(); solta.classList.add('em-cima'); });
  solta.addEventListener('dragleave', () => solta.classList.remove('em-cima'));
  solta.addEventListener('drop', (e) => { e.preventDefault(); solta.classList.remove('em-cima'); lerArquivo(e.dataTransfer.files[0]); });
  $('[data-modelo-pl]', el).onclick = () => baixarModelo(alvo);
  $('[data-ler-cola]', el).onclick = () => { const tx = $('[data-cola-pl]', el).value; if (!tx.trim()) { toast('Cole as linhas primeiro'); return; } carregou(lerCsv(tx)); };
  p2.addEventListener('change', (e) => { const s = e.target.closest('[data-mapa]'); if (s) mapa[s.dataset.mapa] = s.value === '' ? '' : Number(s.value); if (s || e.target.matches('[data-temcab],[data-padrao-tipo]')) mostrar(); });
  btG.onclick = () => {
    const L = lote(), r = regs(), at = $('[data-atualizar]', el)?.checked !== false;
    const res = gravar(alvo, r, at, L);
    db.config.impMapas = { ...(db.config.impMapas || {}), [alvo]: { cab: linhas[0].map(sem).join('|'), mapa } };
    grava(); fechar();
    toast(`Importado: ${res.novos} ${res.novos === 1 ? 'novo' : 'novos'}${res.atual ? `, ${res.atual} ${res.atual === 1 ? 'atualizado' : 'atualizados'}` : ''}${res.pulou ? `, ${res.pulou} já existiam (ficaram como estavam)` : ''}`);
    ir(A.tela);
  };
}
acao('imp-planilha', (b) => importarPlanilha(b.dataset.alvo));

// ================================================================== 2. loja: XML da NF-e de compra
const tag = (el, n) => el?.getElementsByTagName(n)[0]?.textContent?.trim() || '';
function lerNota(xml, arquivo) {
  const d = new DOMParser().parseFromString(xml, 'application/xml');
  if (d.getElementsByTagName('parsererror').length || !d.getElementsByTagName('infNFe').length) throw new Error(`${arquivo}: não é o XML de uma NF-e`);
  const inf = d.getElementsByTagName('infNFe')[0], emit = d.getElementsByTagName('emit')[0], ide = d.getElementsByTagName('ide')[0];
  const ender = emit?.getElementsByTagName('enderEmit')[0];
  const itens = [...d.getElementsByTagName('det')].map((det) => { const p = det.getElementsByTagName('prod')[0];
    return { cProd: tag(p, 'cProd'), ean: digitos(tag(p, 'cEAN')), nome: tag(p, 'xProd'), uCom: tag(p, 'uCom'), qCom: Number(tag(p, 'qCom')) || 0, vUn: Number(tag(p, 'vUnCom')) || 0, vProd: Number(tag(p, 'vProd')) || 0, uTrib: tag(p, 'uTrib'), qTrib: Number(tag(p, 'qTrib')) || 0, eanTrib: digitos(tag(p, 'cEANTrib')) }; }).filter((i) => i.nome);
  const dups = [...d.getElementsByTagName('dup')].map((x) => ({ n: tag(x, 'nDup'), venc: tag(x, 'dVenc'), valor: Number(tag(x, 'vDup')) || 0 })).filter((x) => x.valor > 0);
  return { arquivo, chave: (inf.getAttribute('Id') || '').replace(/^NFe/, ''), numero: tag(ide, 'nNF'), dia: (tag(ide, 'dhEmi') || tag(ide, 'dEmi')).slice(0, 10) || hoje(),
    forn: { cnpj: digitos(tag(emit, 'CNPJ') || tag(emit, 'CPF')), nome: tag(emit, 'xFant') || tag(emit, 'xNome'), razao: tag(emit, 'xNome'), fone: tag(ender, 'fone'), cidade: [tag(ender, 'xMun'), tag(ender, 'UF')].filter(Boolean).join('/') },
    total: Number(tag(d.getElementsByTagName('ICMSTot')[0], 'vNF')) || soma(itens, (i) => i.vProd), itens, dups };
}
const cnpjBonito = (c) => c.length === 14 ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : c.length === 11 ? c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : c;
const fornDe = (f) => db.pessoas.find((p) => p.tipo !== 'cliente' && f.cnpj && digitos(p.doc) === f.cnpj) || db.pessoas.find((p) => p.tipo !== 'cliente' && (sem(p.nome) === sem(f.nome) || sem(p.nome) === sem(f.razao)));
// quanto vem em cada embalagem: MIL = 1.000; CX C/12, PCT 50, FD 6X1 = o número da descrição; SC e UN = 1
function fatorSugerido(it, p, vinc) {
  if (vinc?.fator) return vinc.fator;
  const u = sem(it.uCom).replace(/ /g, '');
  if (p && p.compra && p.fator > 1 && (unidade(p.compra) === unidade(it.uCom) || sem(p.compra).replace(/ /g, '').slice(0, 2) === u.slice(0, 2))) return p.fator;
  if (/^(mil|milheiro|mi|ml1000)$/.test(u)) return 1000;
  if (/^(cx|caixa|pct|pc\d*|pacote|fd|fardo|emb|kit|jg|dz|duzia)$/.test(u) && !(p && sem(p.un) === u)) {
    if (/^dz|duzia/.test(u)) return 12;
    const m = sem(it.nome).match(/(?:c|com|cx|pct|fd|pc)\s*(\d{1,4})\s*(?:un|unid|pc|pcs|pecas)?\b/) || sem(it.nome).match(/\b(\d{1,4})\s*(?:un|unid|unidades|pcs|pecas)\b/) || sem(it.nome).match(/\b(\d{1,3})\s*x\s*\d/);
    if (m && Number(m[1]) > 1) return Number(m[1]);
  }
  if (it.qTrib && it.qCom && it.qTrib !== it.qCom && sem(it.uTrib) !== u) { const r = it.qTrib / it.qCom; if (r > 1 && Math.abs(r - Math.round(r)) < 0.001) return Math.round(r); }
  return 1;
}
// palavras do nome, com número e unidade separados (50KG = 50 kg)
const palavras = (s) => new Set(sem(s).replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2').split(' ').filter((w) => w.length > 1 || /\d/.test(w)));
function produtoDe(it, cnpj) {
  const v = (db.config.xmlVinculos || {})[`${cnpj}|${it.cProd}`];
  if (v && db.produtos.some((p) => p.id === v.prod)) return { p: db.produtos.find((p) => p.id === v.prod), v };
  const ean = it.ean && it.ean !== 'SEMGTIN' ? it.ean : '';
  let p = ean && db.produtos.find((x) => x.cod === ean);
  if (!p) { const n = sem(it.nome); p = db.produtos.find((x) => sem(x.nome) === n); }
  if (!p) { // nome parecido: as palavras do produto do Tecton quase todas na descrição da nota
    const pal = palavras(it.nome); let best = null, nota = 0;
    const tem = (y) => pal.has(y) || (y.length >= 4 && [...pal].some((z) => z.length >= 4 && (z.startsWith(y) || y.startsWith(z))));
    db.produtos.forEach((x) => { const w = [...palavras(x.nome)]; const ok = w.filter(tem).length / (w.length || 1); if (ok > nota) { nota = ok; best = x; } });
    if (nota >= 0.75) p = best;
  }
  return { p: p || null, v: null };
}
const unDoFator = (it, f) => f > 1 ? 'pç' : unidade(it.uCom) || 'un';
export function importarXml() {
  const { el, fechar } = folha({ titulo: 'Nota de compra (XML)', larga: true,
    corpo: `<div data-xp1><p class="mudo">O fornecedor manda o XML da nota por e-mail. Escolha um ou vários de uma vez: o Tecton confere os produtos, converte a embalagem (saco, milheiro, caixa) na unidade que você vende e mostra tudo antes de dar entrada.</p>
      <label class="imp-solta" data-solta><input type="file" accept=".xml,text/xml,application/xml" multiple data-arq-xml>${ico('doc')}<b>Escolher os XML</b><small>um ou vários arquivos .xml · ou arraste para cá</small></label></div><div data-xp2 hidden></div>`,
    pe: '<button type="button" class="bt" data-fechar>Cancelar</button><button type="button" class="bt cheio" data-dar-entrada hidden></button>' });
  let notas = [];
  const p2 = $('[data-xp2]', el), btE = $('[data-dar-entrada]', el);
  const linha = (n, k, it, j) => {
    const sel = it.prod ? it.prod.id : '', f = it.fator, entra = it.qCom * f, cu = f ? it.vUn / f : it.vUn;
    return `<tr data-it="${k}.${j}"><td data-r="Na nota"><b>${t(it.nome)}</b><small class="mudo" style="display:block">${n2(it.qCom, 3)} ${t(it.uCom)} × ${R$(it.vUn)}${it.ean && it.ean !== 'SEMGTIN' ? ` · ${t(it.ean)}` : ''}</small></td>
      <td data-r="No Tecton"><select class="ent imp-sel" data-prod aria-label="Produto do Tecton para ${t(it.nome)}"><option value="">+ Cadastrar produto novo</option>${db.produtos.map((p) => `<option value="${p.id}"${p.id === sel ? ' selected' : ''}>${t(p.nome)}</option>`).join('')}</select>${it.prod ? '' : '<small class="mudo" style="display:block">entra como produto novo</small>'}</td>
      <td class="n" data-r="Cada ${t(it.uCom)} tem"><input class="ent imp-num" inputmode="decimal" data-fator value="${n2(f, 3)}" aria-label="Quantas unidades vêm em cada ${t(it.uCom)}"> <span class="mudo">${t(it.prod?.un || it.un)}</span></td>
      <td class="n" data-r="Entra no estoque"><b data-entra>${n2(entra, 3)} ${t(it.prod?.un || it.un)}</b></td>
      <td class="n" data-r="Custo de cada"><input class="ent imp-num" inputmode="decimal" data-custo value="${n2(cu, 4)}" aria-label="Custo de cada unidade de ${t(it.nome)}"></td>
      <td class="n" data-r="Preço de venda">${it.prod ? `<span class="mudo">${R$(it.prod.preco)}</span>` : `<input class="ent imp-num" inputmode="decimal" data-preco value="${n2(Math.round(cu * 1.35 * 100) / 100)}" aria-label="Preço de venda do produto novo">`}</td></tr>`;
  };
  const mostrar = () => {
    const ok = notas.filter((n) => !n.repetida);
    p2.innerHTML = notas.map((n, k) => { const fo = fornDe(n.forn);
      return `<div class="imp-nota"><div class="imp-nota-cab"><div><b>${t(n.forn.nome || 'Fornecedor')}</b><small class="mudo" style="display:block">NF ${t(n.numero)} · ${t(n.dia.split('-').reverse().join('/'))} · ${pl(n.itens.length, 'item', 'itens')}${fo ? '' : ` · <span class="et atn">fornecedor novo: entra no cadastro</span>`}</small></div><b class="imp-tot">${R$(n.total)}</b></div>
        ${n.repetida ? '<div class="aviso-box">Esta nota já foi lançada antes (mesma chave). Fica de fora para não contar o estoque duas vezes.</div>' : `<div class="tab-wrap"><table class="tab empilha imp-xml"><thead><tr><th>Na nota</th><th>No Tecton</th><th class="n">Cada emb. tem</th><th class="n">Entra no estoque</th><th class="n">Custo de cada</th><th class="n">Preço de venda</th></tr></thead><tbody>${n.itens.map((it, j) => linha(n, k, it, j)).join('')}</tbody></table></div>
        <p class="mudo peq" style="margin-top:6px">${n.dups.length ? `A pagar: ${t(n.dups.map((d) => `${R$(d.valor)} em ${d.venc.split('-').reverse().join('/')}`).join(' · '))}` : `A pagar: ${R$(n.total)} em ${somaDias(n.dia, 28).split('-').reverse().join('/')} (a nota não traz as parcelas; dá para mudar depois no Financeiro)`}</p>`}</div>`; }).join('') +
      (ok.length ? `<label class="liga">Lançar as contas a pagar destas notas no Financeiro<input type="checkbox" data-pagar checked></label><label class="liga">Guardar o vínculo produto da nota → produto do Tecton (na próxima nota deste fornecedor já vem certo)<input type="checkbox" data-lembrar checked></label>` : '');
    btE.hidden = !ok.length; btE.innerHTML = `${ico('check')}Dar entrada em ${pl(ok.length, 'nota', 'notas')}`;
  };
  const recalc = (tr) => { const [k, j] = tr.dataset.it.split('.').map(Number), it = notas[k].itens[j]; it.fator = Math.max(0.001, num($('[data-fator]', tr).value) || 1); $('[data-entra]', tr).textContent = `${n2(it.qCom * it.fator, 3)} ${it.prod?.un || it.un}`; };
  p2.addEventListener('input', (e) => { const tr = e.target.closest('[data-it]'); if (!tr) return; if (e.target.matches('[data-fator]')) { recalc(tr); const [k, j] = tr.dataset.it.split('.').map(Number), it = notas[k].itens[j]; $('[data-custo]', tr).value = n2(it.vUn / it.fator, 4); } });
  p2.addEventListener('change', (e) => { if (!e.target.matches('[data-prod]')) return; const tr = e.target.closest('[data-it]'), [k, j] = tr.dataset.it.split('.').map(Number), it = notas[k].itens[j];
    it.prod = db.produtos.find((p) => p.id === e.target.value) || null; it.fator = fatorSugerido(it, it.prod, null); it.un = unDoFator(it, it.fator); mostrar(); });
  const ler = async (fs) => {
    const novos = [];
    for (const f of [...fs]) { try { const buf = await f.arrayBuffer(); let x = new TextDecoder('utf-8').decode(buf); if (/encoding="(iso-8859-1|windows-1252)"/i.test(x.slice(0, 120))) x = new TextDecoder('windows-1252').decode(buf); novos.push(lerNota(x, f.name)); } catch (e) { toast(e.message || `${f.name}: não deu para ler`); } }
    novos.forEach((n) => { n.repetida = !!(n.chave && (db.compras.some((c) => c.chave === n.chave) || notas.some((m) => m.chave === n.chave)));
      n.itens.forEach((it) => { const { p, v } = produtoDe(it, n.forn.cnpj); it.prod = p; it.fator = fatorSugerido(it, p, v); it.un = unDoFator(it, it.fator); }); notas.push(n); });
    if (!notas.length) return;
    $('[data-xp1]', el).hidden = true; p2.hidden = false; mostrar();
  };
  $('[data-arq-xml]', el).onchange = (e) => ler(e.target.files);
  const solta = $('[data-solta]', el);
  solta.addEventListener('dragover', (e) => { e.preventDefault(); solta.classList.add('em-cima'); });
  solta.addEventListener('dragleave', () => solta.classList.remove('em-cima'));
  solta.addEventListener('drop', (e) => { e.preventDefault(); solta.classList.remove('em-cima'); ler(e.dataTransfer.files); });
  btE.onclick = () => {
    const L = lote(), pagar = $('[data-pagar]', el)?.checked, lembrar = $('[data-lembrar]', el)?.checked; let nItens = 0, nNovos = 0;
    notas.forEach((n, k) => { if (n.repetida) return;
      let fo = fornDe(n.forn);
      if (!fo) { fo = { id: uid('p'), tipo: 'fornecedor', nome: n.forn.nome || n.forn.razao || 'Fornecedor', fone: n.forn.fone, email: '', doc: cnpjBonito(n.forn.cnpj), cidade: n.forn.cidade, obs: n.forn.razao && n.forn.razao !== n.forn.nome ? n.forn.razao : '', imp: L }; db.pessoas.push(fo); }
      const itensC = [];
      n.itens.forEach((it, j) => { const tr = $(`[data-it="${k}.${j}"]`, p2); const f = Math.max(0.001, num($('[data-fator]', tr).value) || 1), cu = Math.max(0, num($('[data-custo]', tr).value)), sel = $('[data-prod]', tr).value;
        let p = db.produtos.find((x) => x.id === sel);
        if (!p) { const ean = it.ean && it.ean !== 'SEMGTIN' && !db.produtos.some((x) => x.cod === it.ean) ? it.ean : ''; p = { id: uid('pr'), cod: ean, nome: it.nome, un: unDoFator(it, f), preco: num($('[data-preco]', tr)?.value) || Math.round(cu * 1.35 * 100) / 100, custo: 0, estoque: 0, minimo: 0, faixas: [], compra: f > 1 ? sem(it.uCom) : '', fator: f > 1 ? f : 1, ult: '', imp: L }; db.produtos.push(p); nNovos++; }
        p.estoque = Math.round(((p.estoque || 0) + it.qCom * f) * 1000) / 1000; if (cu) p.custo = Math.round(cu * 100) / 100;
        if (f > 1 && !p.compra) { p.compra = sem(it.uCom); p.fator = f; }
        if (lembrar && n.forn.cnpj) db.config.xmlVinculos = { ...(db.config.xmlVinculos || {}), [`${n.forn.cnpj}|${it.cProd}`]: { prod: p.id, fator: f } };
        itensC.push({ prod: p.id, nome: p.nome, un: it.uCom, qtd: it.qCom, custo: it.vUn }); nItens++; });
      const c = { id: uid('cp'), forn: fo.id, dia: n.dia, status: 'recebido', venc: n.dups[0]?.venc || somaDias(n.dia, 28), itens: itensC, nf: n.numero, chave: n.chave, origem: 'xml', imp: L };
      db.compras.unshift(c);
      if (pagar) (n.dups.length ? n.dups : [{ n: '', venc: somaDias(n.dia, 28), valor: n.total }]).forEach((d, i, all) => db.fin.push({ id: uid('f'), tipo: 'pagar', desc: `${fo.nome} · NF ${n.numero}${all.length > 1 ? ` · parcela ${i + 1}/${all.length}` : ''}`, valor: Math.round(d.valor * 100) / 100, venc: d.venc || somaDias(n.dia, 28), pago: '', forma: '', pessoa: fo.id, cat: 'Mercadoria', imp: L }));
    });
    grava(); fechar(); toast(`Entrada feita: ${pl(nItens, 'item', 'itens')} no estoque${nNovos ? `, ${pl(nNovos, 'produto novo', 'produtos novos')}` : ''}${pagar ? ', contas a pagar lançadas' : ''}`); ir('reposicao');
  };
}
acao('imp-xml', () => importarXml());

// ================================================================== 3. construtora: orçamento da loja lido pela IA
const EXEMPLO_IA = [['Cimento CP-II 50 kg', 'sc', 40, 38.9], ['Areia média lavada', 'm³', 6, 145], ['Pedra brita 1', 'm³', 4, 160], ['Bloco cerâmico 9 furos', 'pç', 2500, 1.25], ['Vergalhão CA-50 3/8 (12 m)', 'br', 30, 68.5]]
  .map(([desc, un, qtd, unit]) => ({ desc, un, qtd, unit }));
const primeiro = (o, ks) => { for (const k of ks) if (o && o[k] != null && o[k] !== '') return o[k]; return ''; };
// aceita o que a ponte devolver: { ok, dados|itens|linhas }, uma lista ou um objeto com a lista dentro
export function normalizarItens(r) {
  if (r && r.ok === false) throw new Error(r.mensagem || r.erro || 'A leitura não deu certo agora.');
  let d = r && typeof r === 'object' && !Array.isArray(r) ? (r.dados ?? r.resultado ?? r.campos ?? r) : r;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = []; } }
  const l = Array.isArray(d) ? d : (d?.itens || d?.linhas || d?.items || d?.produtos || []);
  return { fornecedor: (!Array.isArray(d) && (d?.fornecedor || d?.loja || d?.emitente)) || '', itens: (Array.isArray(l) ? l : []).map((x) => {
    const qtd = num(primeiro(x, ['quantidade', 'qtd', 'qtde', 'quant'])) || 1, tot = num(primeiro(x, ['total', 'valor_total', 'subtotal']));
    let unit = num(primeiro(x, ['preco_unitario', 'unitario', 'valor_unitario', 'preco', 'unit', 'valor'])); if (!unit && tot) unit = Math.round(tot / qtd * 100) / 100;
    return { desc: String(primeiro(x, ['descricao', 'desc', 'produto', 'item', 'nome', 'material']) || '').trim(), un: String(primeiro(x, ['unidade', 'un', 'und']) || 'un').trim().toLowerCase(), qtd, unit };
  }).filter((x) => x.desc) };
}
const ESQUEMA = [{ nome: 'descricao', rotulo: 'Material ou serviço' }, { nome: 'quantidade', rotulo: 'Quantidade', tipo: 'numero' }, { nome: 'unidade', rotulo: 'Unidade (sc, m³, pç, kg, m, br…)' }, { nome: 'preco_unitario', rotulo: 'Preço unitário em reais', tipo: 'numero' }, { nome: 'total', rotulo: 'Total da linha em reais', tipo: 'numero' }];
function arquivoParaDados(f) {
  if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) return new Promise((ok, falha) => { if (f.size > 4e6) { falha(new Error('PDF grande demais (até 4 MB)')); return; } const r = new FileReader(); r.onload = () => ok({ pdf: r.result }); r.onerror = falha; r.readAsDataURL(f); });
  return reduzir(f, 1700, 0.82).then((imagem) => ({ imagem }));
}
export function orcamentoIA(obraId = '', destino = 'orc') {
  const obras = db.obras.filter((o) => o.status !== 'entregue');
  if (!obras.length) { toast('Cadastre uma obra antes'); return; }
  const forn = db.pessoas.filter((p) => p.tipo !== 'cliente');
  const o0 = db.obras.find((o) => o.id === obraId) || obras[0];
  const { el, fechar } = folha({ titulo: 'Ler orçamento da loja (foto ou PDF)', larga: true,
    corpo: `<div data-ia1><p class="mudo">Tire uma foto do orçamento ou da lista que a loja de material mandou (ou use o PDF). A IA lê os itens, a quantidade e o preço, e você confere tudo antes de entrar na obra.</p>
      <div class="campos"><label class="campo"><span>Obra</span><select data-obra-ia>${obras.map((o) => `<option value="${o.id}"${o.id === o0.id ? ' selected' : ''}>${t(o.nome)}</option>`).join('')}</select></label>
      <label class="campo"><span>Os itens vão para</span><select data-dest-ia><option value="orc"${destino === 'orc' ? ' selected' : ''}>O orçamento da obra</option><option value="ped"${destino === 'ped' ? ' selected' : ''}>Um pedido de compra (material da loja)</option></select></label></div>
      <label class="imp-solta"><input type="file" accept="image/*,application/pdf,.pdf" data-arq-ia>${ico('foto')}<b>Foto ou PDF do orçamento</b><small>no celular, abre a câmera</small></label>
      <p class="mudo peq" style="margin-top:8px">O arquivo vai para a leitura da IA (Gemini) só para tirar os itens. Orçamento de loja não costuma ter dado pessoal; se tiver CPF ou telefone de alguém, corte antes. Cada leitura usa 1 das leituras grátis do dia.</p></div><div data-ia2 hidden></div>`,
    pe: '<button type="button" class="bt" data-fechar>Cancelar</button><button type="button" class="bt cheio" data-ok-ia hidden></button>' });
  const p2 = $('[data-ia2]', el), btO = $('[data-ok-ia]', el); let fornLido = '';
  const linhaIt = (i) => `<tr data-iti><td data-r="Material"><input class="ent" data-d value="${t(i.desc)}" aria-label="Material"></td><td data-r="Un."><input class="ent imp-un" data-u value="${t(i.un)}" aria-label="Unidade"></td><td class="n" data-r="Qtd."><input class="ent imp-num" inputmode="decimal" data-q value="${n2(i.qtd, 3)}" aria-label="Quantidade"></td><td class="n" data-r="Preço un."><input class="ent imp-num" inputmode="decimal" data-p value="${n2(i.unit)}" aria-label="Preço unitário"></td><td class="n" data-r="Total"><b data-tt>${R$(i.qtd * i.unit)}</b></td><td class="n"><button type="button" class="bt-ico" data-tira-iti aria-label="Tirar este item">${ico('x')}</button></td></tr>`;
  const lidos = () => $$('[data-iti]', p2).map((r) => ({ desc: $('[data-d]', r).value.trim(), un: $('[data-u]', r).value.trim() || 'un', qtd: num($('[data-q]', r).value), unit: num($('[data-p]', r).value) })).filter((i) => i.desc && i.qtd > 0);
  const total = () => { $$('[data-iti]', p2).forEach((r) => { $('[data-tt]', r).textContent = R$(num($('[data-q]', r).value) * num($('[data-p]', r).value)); }); const l = lidos(); $('[data-tot-ia]', p2).textContent = R$(soma(l, (i) => i.qtd * i.unit)); btO.innerHTML = `${ico('check')}Lançar ${pl(l.length, 'item', 'itens')}`; btO.disabled = !l.length; };
  const destinoUI = () => { const ob = db.obras.find((o) => o.id === $('[data-obra-ia]', el).value), d = $('[data-dest-ia]', el).value;
    if (d === 'orc') return `<label class="campo"><span>Etapa do orçamento</span><select data-etapa-ia>${ob.etapas.map((e) => `<option value="${e.id}">${t(e.nome)}</option>`).join('')}${ob.etapas.length ? '' : '<option value="">(a obra ainda não tem etapa: cria “Material”)</option>'}</select></label>`;
    const fo = forn.find((p) => sem(p.nome) === sem(fornLido));
    return `<label class="campo"><span>Fornecedor</span><select data-forn-ia>${forn.map((p) => `<option value="${p.id}"${fo && fo.id === p.id ? ' selected' : ''}>${t(p.nome)}</option>`).join('')}${fornLido && !fo ? `<option value="" selected>+ ${t(fornLido)} (cadastra)</option>` : ''}${forn.length || fornLido ? '' : '<option value="">+ Loja do orçamento (cadastra)</option>'}</select></label><label class="campo"><span>Previsão de chegada</span><input type="date" data-prev-ia value="${somaDias(hoje(), 3)}"></label>`; };
  const conferir = (r) => {
    fornLido = r.fornecedor || '';
    if (!r.itens.length) { toast('A IA não achou itens nesse arquivo. Tente uma foto mais reta e com luz.'); return; }
    $('[data-ia1]', el).hidden = true; p2.hidden = false;
    const ob = db.obras.find((o) => o.id === $('[data-obra-ia]', el).value), d = $('[data-dest-ia]', el).value;
    p2.innerHTML = `<p class="mudo" style="margin-bottom:8px">${CONTA ? '' : '<span class="et info">Demonstração</span> Leitura de exemplo: na conta, a IA lê o seu arquivo. '}Confira: a IA pode errar número escrito à mão ou preço riscado. Corrija o que precisar antes de lançar.</p>
      <p><b>${t(ob.nome)}</b> · ${d === 'orc' ? 'orçamento da obra' : 'pedido de compra'}${fornLido ? ` · loja: ${t(fornLido)}` : ''}</p>
      <div class="campos" data-dest-campos>${destinoUI()}</div>
      <div class="tab-wrap"><table class="tab empilha imp-ia"><thead><tr><th>Material</th><th>Un.</th><th class="n">Qtd.</th><th class="n">Preço un.</th><th class="n">Total</th><th></th></tr></thead><tbody data-its>${r.itens.map(linhaIt).join('')}</tbody></table></div>
      <div class="linha-bts" style="justify-content:space-between;align-items:center"><button type="button" class="bt pq" data-mais-iti>${ico('mais2')}Mais um item</button><span>Total <b data-tot-ia></b></span></div>`;
    btO.hidden = false; total();
  };
  p2.addEventListener('input', (e) => { if (e.target.closest('[data-iti]')) total(); });
  p2.addEventListener('click', (e) => { const x = e.target.closest('[data-tira-iti]'); if (x) { x.closest('[data-iti]').remove(); total(); } if (e.target.closest('[data-mais-iti]')) { $('[data-its]', p2).insertAdjacentHTML('beforeend', linhaIt({ desc: '', un: 'un', qtd: 1, unit: 0 })); total(); $('[data-its] tr:last-child [data-d]', p2).focus(); } });
  $('[data-arq-ia]', el).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const box = $('[data-ia1]', el); box.insertAdjacentHTML('beforeend', '<p class="imp-lendo" data-lendo role="status">Lendo o orçamento…</p>');
    try {
      let r;
      if (!CONTA && !window.veltriaConta) { await new Promise((ok) => setTimeout(ok, 700)); r = { fornecedor: 'Depósito São Bento', itens: EXEMPLO_IA.map((i) => ({ ...i })) }; }
      else if (typeof window.nexoLer === 'function') r = normalizarItens(await window.nexoLer({ tipo: 'orcamento', destino: 'itens do orçamento de material de construção', ...(await arquivoParaDados(f)), esquema: ESQUEMA }));
      else { $('[data-lendo]', el)?.remove(); box.insertAdjacentHTML('beforeend', '<div class="aviso-box" role="status">A leitura de orçamento pela IA chega em breve nesta conta. Enquanto isso, lance os itens pelo botão “Item” do orçamento ou pelo pedido de compra.</div>'); e.target.value = ''; return; }
      $('[data-lendo]', el)?.remove(); conferir(r);
    } catch (err) { $('[data-lendo]', el)?.remove(); toast(err.message || 'Não deu para ler agora. Tente de novo.'); e.target.value = ''; }
  };
  btO.onclick = () => {
    const l = lidos(); if (!l.length) return;
    const ob = db.obras.find((o) => o.id === $('[data-obra-ia]', el).value), d = $('[data-dest-ia]', el).value, L = lote();
    if (d === 'orc') {
      let et = $('[data-etapa-ia]', el)?.value; if (!et) { const e = { id: uid('e'), nome: 'Material', ini: ob.inicio || hoje(), fim: ob.fim || somaDias(hoje(), 60), pct: 0 }; ob.etapas.push(e); et = e.id; }
      l.forEach((i) => ob.orc.push({ id: uid('i'), etapa: et, tipo: 'material', desc: i.desc, un: i.un, qtd: i.qtd, unit: i.unit, imp: L }));
      grava(); fechar(); toast(`${pl(l.length, 'item entrou', 'itens entraram')} no orçamento de ${ob.nome}`); ir(`obra/${ob.id}/orcamento`);
    } else {
      let fo = $('[data-forn-ia]', el)?.value;
      if (!fo) { const p = { id: uid('p'), tipo: 'fornecedor', nome: fornLido || 'Loja do orçamento', fone: '', email: '', doc: '', cidade: `${db.config.cidade || ''}/${db.config.uf || ''}`, obs: '', imp: L }; db.pessoas.push(p); fo = p.id; }
      db.pedidos.unshift({ id: uid('pc'), obra: ob.id, forn: fo, dia: hoje(), prev: $('[data-prev-ia]', el)?.value || somaDias(hoje(), 3), status: 'pedido', itens: l.map((i) => ({ ...i, chegou: 0 })), imp: L });
      grava(); fechar(); toast(`Pedido de compra com ${pl(l.length, 'item', 'itens')} criado`); ir(`obra/${ob.id}/compras`);
    }
  };
  // trocou obra ou destino depois de ler: refaz a parte do destino
  el.addEventListener('change', (e) => { if (e.target.matches('[data-obra-ia],[data-dest-ia]') && !p2.hidden) $('[data-dest-campos]', p2).innerHTML = destinoUI(); });
}
acao('imp-orc-ia', (b) => orcamentoIA(b.dataset.obra || '', b.dataset.dest || 'orc'));

// ------------------------------------------------------------------ botões "Importar" no topo das listas (cada tela chama)
export const botaoImportar = (alvo, txt = 'Importar planilha') => `<button type="button" class="bt" data-acao="imp-planilha" data-alvo="${alvo}">${ico('acima')}${t(txt)}</button>`;
export const botaoXml = () => `<button type="button" class="bt" data-acao="imp-xml">${ico('doc')}Nota de compra (XML)</button>`;
export const botaoOrcIA = (obra = '', dest = 'orc') => `<button type="button" class="bt" data-acao="imp-orc-ia" data-obra="${t(obra)}" data-dest="${dest}">${ico('foto')}Ler orçamento da loja</button>`;
window.tectonImportar = { lerCsv, lerXlsx, lerNota, fatorSugerido, normalizarItens, sugerir }; // usado pelo teste (scratchpad/importar2)
