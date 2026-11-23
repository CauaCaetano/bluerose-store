// Popina · "traga o que você já usa" (22/11/2026): o cardápio entra por foto, print ou PDF (lido pela IA grátis,
// window.nexoLer do conta-nuvem.js), por texto colado (do iFood, Anota AI, site ou WhatsApp que o próprio dono copiou)
// ou por planilha (CSV ou Excel .xlsx, lido aqui no aparelho, sem biblioteca). Tudo passa por uma tela de conferência:
// nada é gravado direto e nada do que já existe é apagado (só acrescenta, ou atualiza preço, descrição e tamanhos de um
// prato com o mesmo nome, depois de confirmar). Clientes do delivery pelos contatos do celular (Contact Picker no Android)
// ou por arquivo .vcf/.csv do Google Contatos: só nome e telefone, sem passar pela IA, e quem já está cadastrado fica como está.
// Nada de buscar o link do cardápio no servidor nem de entrar no iFood: só o que a pessoa trouxe.
import { db, t, r2, num, vir, uid, grava, soDig } from './loja.js?v=59';
import { acao, ir } from './nucleo.js?v=59';
import { ico, folha, toast, confirma, $, $$ } from './ui.js?v=59';

const sem = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// ------------------------------------------------------------------ planilha do Excel (.xlsx) sem biblioteca
// cópia adaptada de base/le-xlsx.js: o .xlsx é um zip; lê a primeira aba e os textos compartilhados
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
const abre = (f) => (!f ? Promise.resolve('') : f.metodo === 0 ? Promise.resolve(new TextDecoder().decode(f.dados)) : new Response(new Blob([f.dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text());
const desfaz = (s) => s.replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d))).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const colDe = (ref) => { const l = ref.replace(/\d+/g, ''); let n = 0; for (const c of l) n = n * 26 + (c.charCodeAt(0) - 64); return n - 1; };
async function lerXlsx(buf) {
  const a = zip(buf), aba = a['xl/worksheets/sheet1.xml'] || a[Object.keys(a).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0]];
  if (!aba) throw new Error('A planilha não tem nenhuma aba.');
  const [ss, xml] = await Promise.all([abre(a['xl/sharedStrings.xml']), abre(aba)]);
  const comp = [...ss.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => desfaz((m[1].match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map((x) => x.replace(/<[^>]+>/g, '')).join('')));
  const linhas = [];
  for (const rr of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const lin = [];
    for (const cc of rr[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const at = cc[1], ref = (at.match(/r="([A-Z]+\d+)"/) || [])[1], tp = (at.match(/t="(\w+)"/) || [])[1], v = ((cc[2] || '').match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      const val = tp === 's' ? comp[Number(v)] || '' : tp === 'inlineStr' ? desfaz(((cc[2] || '').match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1] || '') : v != null ? desfaz(v) : '';
      lin[ref ? colDe(ref) : lin.length] = val;
    }
    for (let i = 0; i < lin.length; i++) if (lin[i] == null) lin[i] = '';
    if (lin.some((x) => String(x).trim())) linhas.push(lin);
  }
  return linhas;
}
// CSV com ; , ou tabulação, aspas e quebra de linha dentro de aspas
function lerCsv(txt) {
  txt = String(txt).replace(/^﻿/, '');
  const prim = txt.split(/\r?\n/).find((l) => l.trim()) || '', sep = ['\t', ';', ','].map((s) => [s, prim.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const out = []; let lin = [], cel = '', aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (aspas) { if (c === '"' && txt[i + 1] === '"') { cel += '"'; i++; } else if (c === '"') aspas = false; else cel += c; continue; }
    if (c === '"') aspas = true; else if (c === sep) { lin.push(cel); cel = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; lin.push(cel); cel = ''; if (lin.some((x) => x.trim())) out.push(lin); lin = []; } else cel += c;
  }
  lin.push(cel); if (lin.some((x) => x.trim())) out.push(lin);
  return out;
}
async function linhasDoArquivo(a) {
  if (/\.xlsx$/i.test(a.name) || /spreadsheetml/.test(a.type)) return lerXlsx(await a.arrayBuffer());
  if (/\.xls$/i.test(a.name)) throw new Error('Planilha .xls antiga: no Excel, use Salvar como › Pasta de Trabalho do Excel (.xlsx) ou CSV.');
  return lerCsv(await a.text());
}

// ------------------------------------------------------------------ cardápio: leitura local do texto e da planilha
const PRECO = /(?:R\$\s*)?(\d{1,4}(?:\.\d{3})*[,.]\d{2})(?!\d)/g;
const valor = (s) => { const x = String(s).replace(/R\$\s*/i, '').trim(); return /^\d+\.\d{1,2}$/.test(x) ? Number(x) : num(x); };
// "Broto 29,90; Grande 49,90" ou "P 20,00 / M 25,00 / G 30,00" -> [{ nome, preco }]
export function tamanhosDe(txt) {
  return String(txt || '').split(/[;|/\n]+|\s{2,}/).map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = /^(.*?)[\s:=\-–]*(?:R\$\s*)?(\d{1,4}(?:[.,]\d{1,2})?)\s*$/.exec(s);
    return m && m[1].trim() ? { nome: m[1].trim().replace(/[:\-–]+$/, '').trim().slice(0, 30), preco: r2(valor(m[2])) } : null;
  }).filter((x) => x && x.preco > 0).slice(0, 8);
}
const tamTexto = (l) => (l || []).map((x) => `${x.nome} ${vir(Number(x.preco).toFixed(2))}`).join('; ');
// texto colado: linha com preço = item; linha curta sem preço antes de itens = categoria; linha sem preço depois de um item = descrição
export function lerTextoCardapio(txt) {
  const linhas = String(txt || '').split(/\r?\n/).map((l) => l.replace(/[••·*]+/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const itens = []; let cat = '', ult = null;
  linhas.forEach((l, k) => {
    const precos = [...l.matchAll(PRECO)];
    if (!precos.length) {
      const proxTemPreco = linhas.slice(k + 1, k + 2).some((x) => /\d{1,4}(?:\.\d{3})*[,.]\d{2}(?!\d)/.test(x));
      if (l.length <= 40 && !/[.,;]$/.test(l) && (!ult || (proxTemPreco && ult.descricao !== undefined) || (proxTemPreco && !/[a-zà-ú]{3,}\s+[a-zà-ú]{3,}\s+[a-zà-ú]{3,}/.test(l))) && !/^(obs|observa|pedido|total|taxa|entrega|hor[aá]rio|aberto|whats|telefone|endere)/i.test(sem(l))) { cat = l.replace(/[:\-–]+$/, '').trim(); ult = null; return; }
      if (ult && !ult.descricao) ult.descricao = l.slice(0, 200);
      return;
    }
    let antes = l.slice(0, precos[0].index).replace(/[\s.:\-–_]+$/, '').trim();
    let item;
    if (precos.length > 1) { // vários preços na linha: tamanhos ("Pizza calabresa  Broto 29,90  Grande 49,90")
      const rot = precos.map((p, i) => (i ? l.slice(precos[i - 1].index + precos[i - 1][0].length, p.index) : '').replace(/^[\s|/;,\-–]+|[\s:=\-–]+$/g, '').trim());
      const pal = antes.split(' '), nome = pal.length > 1 ? pal.slice(0, -1).join(' ') : antes;
      rot[0] = pal.length > 1 ? pal[pal.length - 1] : 'Tamanho 1';
      const tams = precos.map((p, i) => ({ nome: (rot[i] || `Tamanho ${i + 1}`).slice(0, 30), preco: r2(valor(p[1])) }));
      item = { nome, preco: Math.min(...tams.map((x) => x.preco)), tamanhos: tamTexto(tams) };
    } else item = { nome: antes, preco: valor(precos[0][1]) };
    const partes = item.nome.split(/\s[\-–|]\s|\s\(\s?|:\s/);
    if (partes.length > 1 && partes[0].length >= 3) { item.descricao = item.nome.slice(partes[0].length).replace(/^[\s\-–|(:]+|\)$/g, '').trim(); item.nome = partes[0].trim(); }
    item.nome = item.nome.replace(/^\d{1,3}[\s.)\-]+/, '').trim().slice(0, 60);
    if (!item.nome) return;
    item.categoria = cat; itens.push(item); ult = item;
  });
  return itens;
}
const CAB = { categoria: /^(categoria|grupo|secao|tipo|departamento)/, nome: /^(nome|produto|item|prato|descricao do produto|titulo)/, descricao: /^(descricao|detalhe|ingrediente|complemento|obs)/, preco: /^(preco|valor|pre[cç]o de venda|venda)/, tamanhos: /^(tamanho|variac|opcoes de tamanho)/ };
export function lerPlanilhaCardapio(linhas) {
  if (!linhas.length) return [];
  const cab = linhas[0].map((c) => sem(c)), mapa = {};
  cab.forEach((c, i) => { for (const [k, re] of Object.entries(CAB)) if (mapa[k] == null && re.test(c)) { mapa[k] = i; break; } });
  let dados = linhas.slice(1);
  if (mapa.nome == null) { // sem cabeçalho conhecido: Nome;Preço · Categoria;Nome;Preço · Categoria;Nome;Descrição;Preço;Tamanhos
    dados = linhas; const n = Math.max(...linhas.map((l) => l.length));
    Object.assign(mapa, n <= 2 ? { nome: 0, preco: 1 } : n === 3 ? { categoria: 0, nome: 1, preco: 2 } : { categoria: 0, nome: 1, descricao: 2, preco: 3, tamanhos: 4 });
    if (!(valor(linhas[0][mapa.preco]) > 0)) dados = linhas.slice(1);
  }
  const pega = (l, k) => (mapa[k] == null ? '' : String(l[mapa[k]] ?? '').trim());
  // CSV com ; e tamanhos sem aspas ("Broto 34,90; Grande 59,90"): o que sobra depois da última coluna volta para os tamanhos
  const ultima = Math.max(...Object.values(mapa));
  if (mapa.tamanhos === ultima) dados = dados.map((l) => (l.length > ultima + 1 ? [...l.slice(0, ultima), l.slice(ultima).filter((x) => String(x).trim()).join('; ')] : l));
  return dados.map((l) => ({ categoria: pega(l, 'categoria'), nome: pega(l, 'nome').slice(0, 60), descricao: pega(l, 'descricao').slice(0, 200), preco: valor(pega(l, 'preco')), tamanhos: pega(l, 'tamanhos') })).filter((x) => x.nome);
}

// ------------------------------------------------------------------ leitura pela IA (foto, print, PDF ou texto)
const ESQUEMA = [
  { nome: 'categoria', rotulo: 'Categoria ou seção do cardápio (ex.: Lanches, Pizzas, Bebidas)' },
  { nome: 'nome', rotulo: 'Nome do prato, lanche ou bebida' },
  { nome: 'descricao', rotulo: 'Descrição ou ingredientes, se tiver' },
  { nome: 'preco', rotulo: 'Preço em reais (o menor, se tiver tamanhos)', tipo: 'numero' },
  { nome: 'tamanhos', rotulo: 'Tamanhos com preço, separados por ponto e vírgula (ex.: Broto 29.90; Grande 49.90); vazio se não tiver' },
];
// demonstração: o cardápio de exemplo que a "foto" traz (uns iguais aos do sistema, para mostrar a atualização de preço)
const EXEMPLO_FOTO = [
  { categoria: 'Lanches', nome: 'X-Bacon', descricao: 'Hambúrguer 150 g, bacon crocante, queijo e maionese da casa.', preco: 28.9 },
  { categoria: 'Lanches', nome: 'X-Tudo', descricao: 'Hambúrguer, presunto, queijo, ovo, bacon, alface e tomate.', preco: 32.9 },
  { categoria: 'Lanches', nome: 'Misto quente', descricao: 'Pão de forma, presunto e queijo na chapa.', preco: 12.9 },
  { categoria: 'Pastéis', nome: 'Pastel de carne', descricao: 'Carne moída temperada.', preco: 9.9 },
  { categoria: 'Pastéis', nome: 'Pastel de queijo', preco: 9.9 },
  { categoria: 'Pizzas', nome: 'Pizza calabresa', descricao: 'Muçarela, calabresa e cebola.', preco: 32.9, tamanhos: 'Broto 32.90; Média 44.90; Grande 56.90' },
  { categoria: 'Açaí', nome: 'Açaí no copo', descricao: 'Com granola e banana.', preco: 14, tamanhos: '300 ml 14.00; 500 ml 19.00; 700 ml 24.00' },
  { categoria: 'Bebidas', nome: 'Suco natural', descricao: 'Laranja, limão ou maracujá, 500 ml.', preco: 10.9 },
  { categoria: 'Bebidas', nome: 'Refrigerante 2 litros', preco: 14 },
];
async function lerPelaIA(arquivos, texto, passo) {
  const itens = []; let restantes = null, demo = false;
  const fontes = arquivos.length ? arquivos.map((a) => ({ arq: a })) : [{ texto }];
  for (let k = 0; k < fontes.length; k++) {
    passo?.(arquivos.length > 1 ? `Lendo ${k + 1} de ${arquivos.length}…` : 'Lendo…');
    const f = fontes[k], pdf = f.arq && f.arq.type === 'application/pdf';
    const r = await window.nexoLer({ tipo: 'cardapio', destino: 'itens do cardápio de um restaurante', esquema: ESQUEMA, texto: f.texto || '', ...(f.arq ? (pdf ? { pdf: f.arq } : { imagem: f.arq }) : {}),
      exemplo: () => (f.texto ? lerTextoCardapio(f.texto) : k === 0 ? EXEMPLO_FOTO : []) });
    if (!r.ok) { if (itens.length) { toast(`${r.erro} O que já foi lido está na conferência.`); break; } throw new Error(r.erro); }
    demo = r.demo; if (typeof r.restantes === 'number') restantes = r.restantes;
    itens.push(...r.itens.map((x) => ({ categoria: String(x.categoria || ''), nome: String(x.nome || '').slice(0, 60), descricao: String(x.descricao || '').slice(0, 200), preco: Number(x.preco) || valor(x.preco || 0), tamanhos: String(x.tamanhos || '') })));
  }
  return { itens: itens.filter((x) => x.nome), restantes, demo };
}

// ------------------------------------------------------------------ escolher de onde vem o cardápio
const cotaTxt = (r, demo) => (demo ? 'Na demonstração a leitura é de exemplo: na sua conta, a IA lê a sua foto de verdade.' : typeof r === 'number' ? `Leituras com IA que restam hoje: ${r} de 20.` : '');
acao('importar-cardapio', () => {
  const ia = !!window.nexoLer;
  const { el, fechar } = folha({ titulo: 'Trazer o cardápio que você já tem', corpo: `
    <p class="mudo" style="margin-bottom:12px">Nada do que já está cadastrado é apagado. Você confere cada item antes de salvar.</p>
    <div class="imp-opcoes">
      ${ia ? `<label class="imp-op">${ico('cardapio')}<span><b>Foto, print ou PDF</b><small>Do cardápio impresso, do iFood, do Anota AI ou do Instagram. Uma foto por página.</small></span><input type="file" accept="image/*,application/pdf" multiple data-foto class="sr"></label>` : ''}
      <button type="button" class="imp-op" data-colar>${ico('folha')}<span><b>Colar o texto</b><small>Abra o seu cardápio online, selecione tudo, copie e cole aqui.</small></span></button>
      <label class="imp-op">${ico('grafico')}<span><b>Planilha do Excel ou CSV</b><small>Colunas: Categoria, Nome, Descrição, Preço e Tamanhos (a ordem não importa).</small></span><input type="file" accept=".csv,.xlsx,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-plan class="sr"></label>
    </div>
    <p class="mudo" data-cota style="margin-top:10px;font-size:14px"></p><p data-passo class="imp-passo" hidden></p>` ,
  aoAbrir: (f) => {
    if (ia) window.nexoLer.cota().then((c) => { const p = $('[data-cota]', f); if (p && c) p.textContent = cotaTxt(c.restantes, c.demo); });
    const passo = (m) => { const p = $('[data-passo]', f); p.hidden = !m; p.textContent = m || ''; };
    $('[data-foto]', f)?.addEventListener('change', async (e) => {
      const l = [...(e.target.files || [])].slice(0, 8); e.target.value = ''; if (!l.length) return;
      try { const r = await lerPelaIA(l, '', passo); passo(''); if (!r.itens.length) return toast('Não achei itens nessa imagem. Tente uma foto mais de perto, com boa luz.'); fechar(); conferir(r.itens, { restantes: r.restantes, demo: r.demo, origem: 'foto' }); }
      catch (x) { passo(''); toast(x.message || 'Não deu para ler agora'); }
    });
    $('[data-plan]', f).addEventListener('change', async (e) => {
      const a = e.target.files?.[0]; e.target.value = ''; if (!a) return;
      try { const itens = lerPlanilhaCardapio(await linhasDoArquivo(a)); if (!itens.length) return toast('Não achei itens nessa planilha. Confira se tem a coluna Nome e a coluna Preço.'); fechar(); conferir(itens, { origem: 'planilha' }); }
      catch (x) { toast(x.message || 'Não deu para ler esta planilha'); }
    });
    $('[data-colar]', f).onclick = () => { fechar(); colarCardapio(); };
  } });
  return el;
});
function colarCardapio() {
  folha({ titulo: 'Colar o cardápio', corpo: `<label class="campo"><span>Cole o texto do cardápio (um item por linha, com o preço)</span><textarea data-txt rows="10" placeholder="Lanches&#10;X-Burger - pão, hambúrguer e queijo  22,90&#10;X-Bacon  27,90&#10;Bebidas&#10;Refrigerante lata  6,00"></textarea></label>
    <p class="mudo" style="font-size:14px">${window.nexoLer && !window.nexoLer.demo ? 'O Popina lê aqui mesmo; se o texto estiver bagunçado, a IA grátis ajuda (gasta 1 leitura).' : 'O Popina lê aqui mesmo, no aparelho.'}</p><p data-passo class="imp-passo" hidden></p>`,
  pe: `${window.nexoLer && !window.nexoLer.demo ? '<button type="button" class="bt grande" data-ia>Ler com a IA</button>' : ''}<button type="button" class="bt cheio grande" data-ok>Conferir os itens</button>`,
  aoAbrir: (f, fechar) => {
    const tx = () => $('[data-txt]', f).value.trim();
    $('[data-ok]', f).onclick = () => { if (!tx()) return toast('Cole o texto do cardápio'); const itens = lerTextoCardapio(tx()); if (!itens.length) return toast(window.nexoLer && !window.nexoLer.demo ? 'Não achei preços nesse texto. Tente “Ler com a IA”.' : 'Não achei preços nesse texto. Cada item precisa do preço, como 22,90.'); fechar(); conferir(itens, { origem: 'texto' }); };
    $('[data-ia]', f)?.addEventListener('click', async () => {
      if (!tx()) return toast('Cole o texto do cardápio');
      const p = $('[data-passo]', f);
      try { p.hidden = false; p.textContent = 'Lendo…'; const r = await lerPelaIA([], tx()); p.hidden = true; if (!r.itens.length) return toast('A IA não achou itens nesse texto'); fechar(); conferir(r.itens, { restantes: r.restantes, origem: 'texto' }); }
      catch (x) { p.hidden = true; toast(x.message || 'Não deu para ler agora'); }
    });
  } });
}

// ------------------------------------------------------------------ conferência antes de gravar
const achaProd = (nome) => { const n = sem(nome); return n ? db.produtos.find((p) => sem(p.nome) === n) : null; };
const achaCat = (nome) => { const n = sem(nome); return n ? db.categorias.find((k) => sem(k.nome) === n) : null; };
const ehBebida = (cat) => /bebida|drink|suco|refri|cerveja|bar\b|vinho|dose/.test(sem(cat));
function etiqueta(nome) { const p = achaProd(nome); return p ? `<span class="etq">Já existe: atualiza</span>` : '<span class="etq ok">Novo</span>'; }
function conferir(itens, { restantes = null, demo = false, origem = '' } = {}) {
  const cats = [...new Set([...db.categorias.map((k) => k.nome), ...itens.map((x) => x.categoria).filter(Boolean)])];
  const linha = (x, i) => `<div class="imp-it" data-i="${i}">
    <div class="imp-it-cab"><label class="imp-marca"><input type="checkbox" data-on checked><span>Importar</span></label><span data-etq>${etiqueta(x.nome)}</span></div>
    <div class="grade2"><label class="campo"><span>Nome</span><input data-n value="${t(x.nome)}"></label><label class="campo"><span>Preço</span><input data-p inputmode="decimal" value="${x.preco > 0 ? vir(r2(x.preco).toFixed(2)) : ''}" placeholder="0,00"></label></div>
    <div class="grade2"><label class="campo"><span>Categoria</span><input data-c list="imp-cats" value="${t(x.categoria || '')}" placeholder="Sem categoria"></label><label class="campo"><span>Tamanhos</span><input data-t value="${t(tamTexto(tamanhosDe(x.tamanhos)))}" placeholder="Ex.: Broto 29,90; Grande 49,90"></label></div>
    <label class="campo"><span>Descrição</span><input data-d value="${t(x.descricao || '')}"></label></div>`;
  folha({ titulo: `Conferir ${itens.length} ${itens.length === 1 ? 'item' : 'itens'}`, larga: true, corpo: `
    <p class="mudo" style="margin-bottom:6px">Corrija o que a leitura errou e desmarque o que não quer. Pratos com o mesmo nome atualizam o preço, a descrição e os tamanhos; o resto (fotos, complementos, estoque) fica como está.</p>
    ${demo ? '<p class="imp-passo">Demonstração: estes itens são de exemplo. Na sua conta, vêm da sua foto.</p>' : ''}${typeof restantes === 'number' ? `<p class="mudo" style="font-size:14px">${cotaTxt(restantes)}</p>` : ''}
    <datalist id="imp-cats">${cats.map((c) => `<option value="${t(c)}">`).join('')}</datalist>
    <div class="linha-bts" style="margin:8px 0"><button type="button" class="bt pq" data-todos>Desmarcar todos</button></div>
    <div data-lista>${itens.map(linha).join('')}</div>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Salvar no cardápio</button>',
  aoAbrir: (f, fechar) => {
    f.addEventListener('input', (e) => { const r = e.target.closest('.imp-it'); if (r && e.target.matches('[data-n]')) $('[data-etq]', r).innerHTML = etiqueta(e.target.value); });
    f.addEventListener('change', (e) => { const r = e.target.closest('.imp-it'); if (r && e.target.matches('[data-on]')) r.classList.toggle('off', !e.target.checked); });
    $('[data-todos]', f).onclick = (e) => { const liga = e.target.textContent.startsWith('Marcar'); $$('[data-on]', f).forEach((c) => { c.checked = liga; c.closest('.imp-it').classList.toggle('off', !liga); }); e.target.textContent = liga ? 'Desmarcar todos' : 'Marcar todos'; };
    $('[data-ok]', f).onclick = async () => {
      const marcados = $$('.imp-it', f).filter((r) => $('[data-on]', r).checked);
      if (!marcados.length) return toast('Marque pelo menos um item');
      const l = [];
      for (const r of marcados) {
        const nome = $('[data-n]', r).value.trim(), tams = tamanhosDe($('[data-t]', r).value), preco = r2(num($('[data-p]', r).value)) || (tams.length ? Math.min(...tams.map((x) => x.preco)) : 0);
        if (!nome) { r.scrollIntoView({ block: 'center' }); $('[data-n]', r).focus(); return toast('Escreva o nome do item'); }
        if (!(preco > 0)) { r.scrollIntoView({ block: 'center' }); $('[data-p]', r).focus(); return toast(`Escreva o preço de ${nome}`); }
        l.push({ nome, preco, tams, cat: $('[data-c]', r).value.trim(), desc: $('[data-d]', r).value.trim() });
      }
      const atual = l.filter((x) => achaProd(x.nome)).length, novos = l.length - atual;
      if (!(await confirma(`${novos ? `Acrescentar ${novos} ${novos === 1 ? 'item novo' : 'itens novos'}` : ''}${novos && atual ? ' e ' : ''}${atual ? `atualizar ${atual} que já ${atual === 1 ? 'existe' : 'existem'}` : ''}? Nada é apagado.`, 'Salvar'))) return;
      const lote = uid('imp'), vistos = new Set();
      l.forEach((x) => {
        if (vistos.has(sem(x.nome))) return; vistos.add(sem(x.nome));
        let k = x.cat ? achaCat(x.cat) : null;
        if (x.cat && !k) { k = { id: sem(x.cat).replace(/[^a-z0-9]/g, '').slice(0, 20) + uid('').slice(-3), nome: x.cat.slice(0, 40) }; db.categorias.push(k); }
        const maior = x.tams.length ? Math.max(...x.tams.map((y) => y.preco)) : 0;
        const p = achaProd(x.nome), tamanhos = x.tams.map((y) => ({ ...y, fator: (p?.tamanhos || []).find((z) => sem(z.nome) === sem(y.nome))?.fator ?? (maior ? Math.round((y.preco / maior) * 100) / 100 : 1) }));
        if (p) { p.preco = x.preco; if (x.desc) p.desc = x.desc; if (tamanhos.length) p.tamanhos = tamanhos; if (k && !p.cat) p.cat = k.id; p.importado = lote; }
        else db.produtos.push({ id: uid('p'), cat: k?.id || '', nome: x.nome, desc: x.desc, preco: x.preco, setor: ehBebida(x.cat) ? 'bar' : 'cozinha', foto: '', ativo: true, adicionais: [], grupos: [], ficha: [], tamanhos, importado: lote, origem: origem || 'importacao' });
      });
      grava(); fechar(); toast(`Cardápio salvo: ${novos} novos, ${atual} atualizados`); ir('mais/cardapio');
    };
  } });
}

// ------------------------------------------------------------------ clientes pelos contatos do celular ou .vcf/.csv
export function telBR(s) { let d = soDig(s); if (d.length >= 12 && d.startsWith('55')) d = d.slice(2); d = d.replace(/^0+/, ''); if (d.length === 12 || d.length === 13) d = d.slice(2); return d; } // 0xx + operadora
function qp(s) { const b = []; s = s.replace(/=\r?\n/g, ''); for (let i = 0; i < s.length; i++) { if (s[i] === '=' && /^[0-9A-F]{2}$/i.test(s.slice(i + 1, i + 3))) { b.push(parseInt(s.slice(i + 1, i + 3), 16)); i += 2; } else b.push(s.charCodeAt(i)); } return new TextDecoder().decode(new Uint8Array(b)); }
export function lerVcf(txt) {
  const linhas = String(txt).replace(/\r\n/g, '\n').replace(/=\n/g, '=\u0001').replace(/\n[ \t]/g, '').split('\n').map((l) => l.replace(/=\u0001/g, '=\n'));
  const out = []; let c = null;
  for (const l of linhas) {
    if (/^BEGIN:VCARD/i.test(l)) { c = { nome: '', n: '', tels: [] }; continue; }
    if (/^END:VCARD/i.test(l)) { if (c) out.push({ nome: (c.nome || c.n).trim(), tel: c.tels[0] || '' }); c = null; continue; }
    if (!c) continue;
    const i = l.indexOf(':'); if (i < 0) continue;
    const cab = l.slice(0, i), chave = cab.split(';')[0].replace(/^item\d+\./i, '').toUpperCase();
    let v = l.slice(i + 1); if (/QUOTED-PRINTABLE/i.test(cab)) v = qp(v);
    v = v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1');
    if (chave === 'FN') c.nome = v; else if (chave === 'N') c.n = v.split(';').slice(0, 3).reverse().filter(Boolean).join(' ').replace(/\s+/g, ' '); else if (chave === 'TEL') { if (/CELL|MOBILE/i.test(cab)) c.tels.unshift(v); else c.tels.push(v); }
  }
  return out;
}
export function lerCsvContatos(txt) {
  const l = lerCsv(txt); if (!l.length) return [];
  const cab = l[0].map(sem), idx = (re) => cab.findIndex((c) => re.test(c));
  const nome = idx(/^(name|nome|display name|nome completo)$/), pri = idx(/^(first name|given name|nome proprio|primeiro nome)$/), meio = idx(/^(middle name|additional name)$/), ult = idx(/^(last name|family name|sobrenome)$/);
  const tels = cab.map((c, i) => (/phone.*value|^(telefone|celular|whatsapp|fone|phone)/.test(c) ? i : -1)).filter((i) => i >= 0);
  return l.slice(1).map((r) => ({ nome: (nome >= 0 && r[nome] ? r[nome] : [pri, meio, ult].filter((i) => i >= 0).map((i) => r[i]).filter(Boolean).join(' ')).trim(), tel: (tels.map((i) => r[i]).find((x) => soDig(x).length >= 8) || '').split(':::')[0].trim() }));
}
acao('importar-contatos', () => {
  const picker = 'contacts' in navigator && 'ContactsManager' in window;
  folha({ titulo: 'Trazer clientes dos contatos', corpo: `
    <p class="mudo" style="margin-bottom:12px">Entra só o nome e o telefone. Quem já está nos clientes fica como está. Os contatos não passam pela IA.</p>
    <div class="imp-opcoes">
      ${picker ? `<button type="button" class="imp-op" data-picker>${ico('pessoas')}<span><b>Escolher nos contatos do celular</b><small>Marque as pessoas que pedem no seu delivery.</small></span></button>` : ''}
      <label class="imp-op">${ico('folha')}<span><b>Arquivo de contatos (.vcf ou .csv)</b><small>No celular: Contatos › Exportar. No Google Contatos: Exportar › CSV ou vCard. ${picker ? '' : 'No iPhone, use o arquivo .vcf.'}</small></span><input type="file" accept=".vcf,.vcard,.csv,text/vcard,text/x-vcard,text/csv" data-arq class="sr"></label>
    </div>`,
  aoAbrir: (f, fechar) => {
    $('[data-picker]', f)?.addEventListener('click', async () => {
      try { const l = await navigator.contacts.select(['name', 'tel'], { multiple: true }); if (!l.length) return; fechar(); conferirContatos(l.map((c) => ({ nome: (c.name || [])[0] || '', tel: (c.tel || [])[0] || '' }))); }
      catch { toast('Não deu para abrir os contatos. Use o arquivo .vcf.'); }
    });
    $('[data-arq]', f).addEventListener('change', async (e) => {
      const a = e.target.files?.[0]; e.target.value = ''; if (!a) return;
      try { const tx = await a.text(); const l = /BEGIN:VCARD/i.test(tx) ? lerVcf(tx) : lerCsvContatos(tx); if (!l.length) return toast('Não achei contatos nesse arquivo'); fechar(); conferirContatos(l); }
      catch { toast('Não deu para ler este arquivo'); }
    });
  } });
});
function conferirContatos(lista) {
  const vistos = new Set(), l = lista.map((c) => ({ nome: String(c.nome || '').trim().slice(0, 80), tel: telBR(c.tel) })).filter((c) => (c.nome || c.tel) && !vistos.has(c.tel || c.nome) && vistos.add(c.tel || c.nome));
  const ja = (tel) => tel.length >= 10 && (db.clientes || []).some((x) => x.id === 't' + tel);
  const linha = (c, i) => { const existe = ja(c.tel), ok = c.tel.length >= 10 && c.tel.length <= 11; return `<li class="imp-ct ${existe ? 'off' : ''}" data-i="${i}"><input type="checkbox" data-on ${existe || !ok ? '' : 'checked'} ${existe ? 'disabled' : ''} aria-label="Importar ${t(c.nome)}">
    <div class="grade2" style="flex:1"><input data-n value="${t(c.nome)}" aria-label="Nome" placeholder="Nome"><input data-tel inputmode="tel" value="${t(c.tel)}" aria-label="Telefone com DDD" placeholder="DDD e número"></div>
    <small class="mudo">${existe ? 'Já é cliente' : ok ? '' : 'Ponha o DDD'}</small></li>`; };
  const novos = l.filter((c) => !ja(c.tel)).length;
  folha({ titulo: `Conferir ${l.length} ${l.length === 1 ? 'contato' : 'contatos'}`, larga: true, corpo: `<p class="mudo" style="margin-bottom:8px">${novos} ${novos === 1 ? 'pessoa nova' : 'pessoas novas'}. Desmarque quem não é cliente. O telefone precisa do DDD.</p>
    <ul class="lista-l imp-cts">${l.map(linha).join('')}</ul>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Salvar clientes</button>',
  aoAbrir: (f, fechar) => {
    $('[data-ok]', f).onclick = async () => {
      const marc = $$('.imp-ct', f).filter((r) => $('[data-on]', r).checked && !$('[data-on]', r).disabled);
      const bons = [], ruins = [];
      marc.forEach((r) => { const tel = telBR($('[data-tel]', r).value), nome = $('[data-n]', r).value.trim(); (tel.length >= 10 && tel.length <= 11 ? bons : ruins).push({ tel, nome, r }); });
      if (ruins.length) { ruins[0].r.scrollIntoView({ block: 'center' }); $('[data-tel]', ruins[0].r).focus(); return toast(`Ponha o DDD no telefone de ${ruins[0].nome || 'um contato'}`); }
      const entram = bons.filter((c, i) => !ja(c.tel) && bons.findIndex((y) => y.tel === c.tel) === i);
      if (!entram.length) return toast('Nenhum cliente novo para salvar');
      if (!(await confirma(`Acrescentar ${entram.length} ${entram.length === 1 ? 'cliente' : 'clientes'}? Quem já existe fica como está.`, 'Salvar'))) return;
      db.clientes ||= []; const lote = uid('imp');
      entram.forEach((c) => db.clientes.push({ id: 't' + c.tel, tel: c.tel, nome: c.nome, pedidos: 0, total: 0, primeiro: Date.now(), importado: lote }));
      grava(); fechar(); toast(`${entram.length} ${entram.length === 1 ? 'cliente salvo' : 'clientes salvos'}`); ir('mais/clientes');
    };
  } });
}
