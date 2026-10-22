// =============================================================
// Veltria · importar planilha (Excel .xlsx ou CSV)
// -------------------------------------------------------------
// Lê o arquivo no próprio navegador (o .xlsx é um zip com XML; não
// precisa de biblioteca), reconhece cada aba e cada coluna pelos nomes
// e preenche o sistema: cadastros e também o dia a dia (agendamentos,
// consultas, vendas, lançamentos…), com datas, horários e fotos.
// - Tabelas sem formulário de cadastro têm as colunas deduzidas dos
//   dados de exemplo do próprio sistema (tipos, opções e ligações).
// - Relações (ex.: o cliente de um agendamento) são achadas pelo nome
//   e, se não existirem, são criadas junto.
// - Fotos: coladas dentro das células do Excel ou por link (colunas
//   Foto, Fotos, Imagem…); entram como anexos do registro.
// =============================================================
import { esc, ic, avisar, confirmar, normal, num, moeda, dataBR } from './nexo.js';

// ---------------------------------------------------------------- leitura do arquivo
async function descompactar(buf) {
  const v = new DataView(buf), u8 = new Uint8Array(buf), arquivos = new Map();
  let fim = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { fim = i; break; }
  if (fim < 0) throw new Error('Arquivo não é um .xlsx válido');
  let p = v.getUint32(fim + 16, true); const total = v.getUint16(fim + 10, true), dec = new TextDecoder();
  for (let k = 0; k < total; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const metodo = v.getUint16(p + 10, true), tam = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), el = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), loc = v.getUint32(p + 42, true);
    const nome = dec.decode(u8.subarray(p + 46, p + 46 + nl));
    const ini = loc + 30 + v.getUint16(loc + 26, true) + v.getUint16(loc + 28, true), dados = u8.subarray(ini, ini + tam);
    arquivos.set(nome, { metodo, dados });
    p += 46 + nl + el + cl;
  }
  const bin = async (nome) => {
    const a = arquivos.get(nome) || arquivos.get(nome.replace(/^\//, '')); if (!a) return null;
    if (a.metodo === 0) return a.dados;
    const corpo = new Blob([a.dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(corpo).arrayBuffer());
  };
  const ler = async (nome) => { const b = await bin(nome); return b ? dec.decode(b) : null; };
  return { ler, bin, nomes: [...arquivos.keys()] };
}
const xml = (t) => new DOMParser().parseFromString(t, 'application/xml');
const colIdx = (ref) => { let n = 0; for (const ch of String(ref).replace(/\d+/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
const linhaDe = (ref) => Number(String(ref).replace(/\D+/g, '')) || 0;
// caminho relativo de um arquivo do pacote (ex.: "../media/image1.png" a partir de "xl/drawings/")
const resolver = (pasta, alvo) => { if (alvo.startsWith('/')) return alvo.slice(1); const p = pasta.split('/').filter(Boolean); for (const s of alvo.split('/')) { if (s === '..') p.pop(); else if (s !== '.') p.push(s); } return p.join('/'); };
const relsDe = async (z, arquivo) => {
  const i = arquivo.lastIndexOf('/'), pasta = arquivo.slice(0, i), t = await z.ler(`${pasta}/_rels/${arquivo.slice(i + 1)}.rels`);
  return t ? Object.fromEntries([...xml(t).getElementsByTagName('Relationship')].map((r) => [r.getAttribute('Id'), resolver(pasta, r.getAttribute('Target'))])) : {};
};
const TIPOS_IMG = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' };
const comoArquivo = (bytes, caminho) => { const ext = caminho.split('.').pop().toLowerCase(), tipo = TIPOS_IMG[ext]; return tipo ? new File([bytes], caminho.split('/').pop(), { type: tipo }) : null; };
const porNome = (el, local) => [...el.getElementsByTagName('*')].filter((x) => x.localName === local);

// fotos "por cima" das células (desenho ancorado numa linha) → { linha do Excel: [arquivos] }
async function fotosDesenho(z, planilha) {
  const rels = await relsDe(z, planilha), fotos = {};
  for (const alvo of Object.values(rels).filter((t) => /drawings\/drawing\d+\.xml$/.test(t))) {
    const t = await z.ler(alvo); if (!t) continue;
    const drels = await relsDe(z, alvo), doc = xml(t);
    for (const anc of [...porNome(doc.documentElement, 'twoCellAnchor'), ...porNome(doc.documentElement, 'oneCellAnchor')]) {
      const de = porNome(anc, 'from')[0], linha = de ? Number(porNome(de, 'row')[0]?.textContent) + 1 : 0;
      const blip = porNome(anc, 'blip')[0], rid = blip && [...blip.attributes].find((a) => a.localName === 'embed')?.value;
      if (!linha || !rid || !drels[rid]) continue;
      const b = await z.bin(drels[rid]), f = b && comoArquivo(b, drels[rid]);
      if (f) (fotos[linha] ||= []).push(f);
    }
  }
  return fotos;
}
// fotos "dentro da célula" (Excel 365: Inserir > Imagem > Colocar na célula) → { vm: arquivo }
async function fotosNaCelula(z) {
  const meta = await z.ler('xl/metadata.xml'), rv = await z.ler('xl/richData/rdrichvalue.xml'), rel = await z.ler('xl/richData/richValueRel.xml');
  if (!meta || !rv || !rel) return {};
  const relsRv = await relsDe(z, 'xl/richData/richValueRel.xml');
  const relIds = porNome(xml(rel).documentElement, 'rel').map((r) => [...r.attributes].find((a) => a.localName === 'id')?.value);
  const valores = porNome(xml(rv).documentElement, 'rv').map((r) => Number(porNome(r, 'v')[0]?.textContent));
  // valueMetadata (vm, a partir de 1) → futureMetadata → índice do valor rico
  const m = xml(meta).documentElement, blocos = porNome(m, 'bk').filter((b) => b.parentNode?.localName === 'futureMetadata');
  const rvb = blocos.map((b) => Number(porNome(b, 'rvb')[0]?.getAttribute('i')));
  const vmBlocos = porNome(m, 'bk').filter((b) => b.parentNode?.localName === 'valueMetadata').map((b) => Number(porNome(b, 'rc')[0]?.getAttribute('v')));
  const saida = {};
  for (let i = 0; i < vmBlocos.length; i++) {
    const idxRico = rvb[vmBlocos[i]], idxRel = valores[idxRico], caminho = relsRv[relIds[idxRel]];
    if (caminho == null) continue;
    const b = await z.bin(caminho), f = b && comoArquivo(b, caminho);
    if (f) saida[i + 1] = f;
  }
  return saida;
}

async function lerXlsx(buf) {
  const z = await descompactar(buf);
  const comp = (await z.ler('xl/sharedStrings.xml')) || '';
  const textos = comp ? [...xml(comp).getElementsByTagName('si')].map((si) => [...si.getElementsByTagName('t')].map((t) => t.textContent).join('')) : [];
  const wb = xml(await z.ler('xl/workbook.xml')), rels = await relsDe(z, 'xl/workbook.xml');
  const naCelula = await fotosNaCelula(z);
  const abas = [];
  for (const sh of [...wb.getElementsByTagName('sheet')]) {
    const rid = sh.getAttribute('r:id') || [...sh.attributes].find((a) => /:id$/.test(a.name))?.value;
    const caminho = rels[rid]; if (!caminho) continue;
    const conteudo = await z.ler(caminho); if (!conteudo) continue;
    const linhas = [], numeros = [], fotos = await fotosDesenho(z, caminho);
    for (const row of [...xml(conteudo).getElementsByTagName('row')]) {
      const l = [], nLinha = Number(row.getAttribute('r')) || 0;
      for (const c of [...row.getElementsByTagName('c')]) {
        const t = c.getAttribute('t'), vv = c.getElementsByTagName('v')[0]?.textContent, vm = c.getAttribute('vm');
        let val = '';
        if (vm && naCelula[vm]) { (fotos[nLinha || linhaDe(c.getAttribute('r'))] ||= []).push(naCelula[vm]); val = ''; }
        else if (t === 's') val = textos[Number(vv)] ?? '';
        else if (t === 'inlineStr') val = [...c.getElementsByTagName('t')].map((x) => x.textContent).join('');
        else if (t === 'b') val = vv === '1';
        else if (t === 'str' || t === 'e') val = vv ?? '';
        else if (vv != null && vv !== '') val = Number(vv);
        l[colIdx(c.getAttribute('r'))] = val;
      }
      const nl = nLinha || linhas.length + 1;
      if (l.some((x) => x !== '' && x != null) || fotos[nl]) { linhas.push(Array.from(l, (x) => x ?? '')); numeros.push(nl); }
    }
    abas.push({ nome: sh.getAttribute('name') || 'Planilha', linhas, numeros, fotos });
  }
  return abas;
}

function lerCSV(texto) {
  const primeira = texto.split('\n')[0], sep = (primeira.match(/;/g) || []).length >= (primeira.match(/,/g) || []).length ? ';' : ',';
  const linhas = []; let campo = '', linha = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) { if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') aspas = false; else campo += c; continue; }
    if (c === '"') aspas = true; else if (c === sep) { linha.push(campo); campo = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && texto[i + 1] === '\n') i++; linha.push(campo); campo = ''; if (linha.some((x) => x.trim())) linhas.push(linha); linha = []; } else campo += c;
  }
  linha.push(campo); if (linha.some((x) => x.trim())) linhas.push(linha);
  return linhas;
}

export async function lerPlanilha(arq) {
  const nome = arq.name.toLowerCase();
  if (/\.xls$/.test(nome)) throw new Error('Esse é o formato antigo do Excel (.xls). Abra no Excel e use "Salvar como" → Pasta de Trabalho do Excel (.xlsx).');
  if (/\.(xlsx|xlsm)$/.test(nome)) return lerXlsx(await arq.arrayBuffer());
  const t = (await arq.text()).replace(/^﻿/, '');
  const linhas = lerCSV(t);
  return [{ nome: arq.name.replace(/\.[^.]+$/, ''), linhas, numeros: linhas.map((_, i) => i + 1), fotos: {} }];
}

// ---------------------------------------------------------------- reconhecer colunas
const chave = (t) => normal(t).replace(/[^a-z0-9]+/g, ' ').trim();
const SIN = {
  nome: ['nome', 'nome completo', 'cliente', 'razao social', 'paciente', 'aluno', 'contato', 'fornecedor', 'empresa', 'nome do cliente'],
  telefone: ['telefone', 'celular', 'whatsapp', 'whats', 'fone', 'tel', 'telefone celular', 'zap'],
  email: ['email', 'e mail', 'correio eletronico'],
  endereco: ['endereco', 'rua', 'logradouro', 'endereco completo'],
  valor: ['valor', 'preco', 'total', 'montante', 'preco de venda', 'valor total'],
  preco: ['preco', 'valor', 'preco de venda', 'valor unitario'],
  data: ['data', 'dia', 'quando', 'data do atendimento', 'data da consulta', 'data do servico'],
  vencimento: ['vencimento', 'vence', 'data de vencimento'],
  descricao: ['descricao', 'detalhes', 'observacao', 'obs', 'historico', 'texto', 'o que foi feito'],
  documento: ['cpf', 'cnpj', 'cpf cnpj', 'documento'], cpf: ['cpf', 'documento'], cnpj: ['cnpj'],
  placa: ['placa', 'placa do veiculo'], cidade: ['cidade', 'municipio'], obs: ['observacao', 'observacoes', 'obs', 'notas'],
  codigo: ['codigo', 'cod', 'sku', 'referencia', 'ref'], estoque: ['estoque', 'quantidade', 'qtd', 'saldo'], categoria: ['categoria', 'grupo', 'tipo'],
  nascimento: ['nascimento', 'data de nascimento', 'aniversario'],
  titulo: ['titulo', 'obra', 'servico', 'nome da obra', 'projeto', 'evento', 'assunto', 'negocio', 'oportunidade'],
  previsao: ['previsao', 'entrega', 'data de entrega', 'prazo', 'previsao de entrega', 'termino'],
  inicio: ['inicio', 'comeco', 'data de inicio'], diaria: ['diaria', 'valor da diaria'], funcao: ['funcao', 'cargo', 'profissao'],
  empresa: ['empresa', 'companhia', 'razao social'], cargo: ['cargo', 'funcao'], item: ['item', 'material', 'produto'], quantidade: ['quantidade', 'qtd', 'qtde'],
  ini: ['hora', 'horario', 'hora inicial', 'inicio', 'hora de inicio', 'entrada'], fim: ['hora final', 'termino', 'fim', 'saida', 'ate'],
  hora: ['hora', 'horario'], quando: ['data e hora', 'quando', 'data hora'], pago_em: ['pago em', 'data do pagamento', 'pagamento'],
  status: ['status', 'situacao', 'estado'], profissional: ['profissional', 'medico', 'atendente', 'responsavel', 'barbeiro', 'cabeleireiro', 'dentista'],
  servico: ['servico', 'procedimento', 'tratamento'], cliente: ['cliente', 'paciente', 'aluno', 'nome do cliente'], obra: ['obra', 'nome da obra'],
};
function nota(cab, c) {
  const h = chave(cab); if (!h) return 0;
  const nome = chave(c.nome), rot = chave(c.rotulo || '');
  if (h === nome || h === rot) return 4;
  if ((SIN[c.nome] || []).includes(h)) return 3;
  if (rot && (rot.startsWith(h) || h.startsWith(rot)) && Math.min(h.length, rot.length) >= 4) return 2;
  if (rot && h.length >= 4 && rot.split(' ')[0] === h.split(' ')[0]) return 1;
  return 0;
}
// colunas de fotos (links): Foto, Fotos, Imagem, Link da foto…
const ehColunaFoto = (h) => /^(foto|fotos|imagem|imagens|foto url|url da foto|link da foto|link das fotos|fotos url|anexo|anexos)$/.test(chave(h));
function mapear(cab, campos) {
  const usado = new Set(), mapa = [];
  const pares = campos.flatMap((c) => cab.map((h, i) => ({ c, i, n: ehColunaFoto(h) ? 0 : nota(h, c) }))).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  for (const p of pares) { if (usado.has(p.i) || mapa.some(([c]) => c === p.c)) continue; usado.add(p.i); mapa.push([p.c, p.i, p.n]); }
  return mapa;
}

// ---------------------------------------------------------------- colunas de cada tabela
// Tabelas com formulário usam os campos dele; as outras (agendamentos, vendas, consultas…)
// têm as colunas deduzidas dos dados de exemplo do sistema: tipo de cada campo, opções e ligações.
const ROTULOS = { ini: 'Hora', fim: 'Hora final', obs: 'Observação', descricao: 'Descrição', pago_em: 'Pago em', previsao: 'Previsão', vencimento: 'Vencimento', servico: 'Serviço', status: 'Situação', quando: 'Data e hora', clima: 'Clima', equipe: 'Pessoas na obra', texto: 'O que foi feito', etapa: 'Etapa', valor: 'Valor', data: 'Data', hora: 'Hora', cliente: 'Cliente', profissional: 'Profissional', obra: 'Obra', pessoa: 'Pessoa', paciente: 'Paciente', aluno: 'Aluno', tipo: 'Tipo', categoria: 'Categoria', titulo: 'Título', nome: 'Nome', numero: 'Número', canal: 'Canal', mesa: 'Mesa', conta: 'Conta', pago: 'Pago' };
const rotuloDe = (k) => ROTULOS[k] || (k.charAt(0).toUpperCase() + k.slice(1)).replace(/_/g, ' ');
const MOEDA = /valor|preco|total|desconto|taxa|custo|frete|saldo|diaria|mensal|honorario|estimado|sinal|comissao/;
function deduzir(app) {
  if (app._camposDeduzidos) return app._camposDeduzidos;
  const saida = {};
  let dados = {};
  const fonte = typeof app.semente === 'function' ? app.semente : app.db?.semente;   // nuvem e demonstração
  try { dados = fonte ? fonte() : {}; } catch { dados = {}; }
  const ids = {}; for (const [k, l] of Object.entries(dados)) if (Array.isArray(l)) for (const x of l.slice(0, 4000)) if (x && x.id) ids[x.id] = k;
  for (const [col, lista] of Object.entries(dados)) {
    if (!Array.isArray(lista) || !lista.length || col.startsWith('_')) continue;
    const amostra = lista.slice(0, 300), chaves = [...new Set(amostra.flatMap((x) => Object.keys(x || {})))].filter((k) => k !== 'id' && !k.startsWith('_') && k !== 'criado' && k !== 'atualizado');
    const campos = [];
    for (const k of chaves) {
      const vals = amostra.map((x) => x?.[k]).filter((v) => v != null && v !== '');
      if (!vals.length) continue;
      const mostrarDe = (alvo) => { const exemplo = (dados[alvo] || [])[0] || {}; return ['nome', 'titulo', 'descricao', 'codigo', 'placa', 'numero', 'item'].find((m) => typeof exemplo[m] === 'string') || 'nome'; };
      // lista de ligações (ex.: os serviços de um agendamento): "Corte, Barba" na planilha
      if (vals.every((v) => Array.isArray(v) && v.length && v.every((x) => typeof x === 'string' && ids[x]))) { const alvo = ids[vals[0][0]]; campos.push({ nome: k, rotulo: rotuloDe(k), tipo: 'relacoes', colecao: alvo, mostrar: mostrarDe(alvo) }); continue; }
      if (vals.some((v) => typeof v === 'object')) continue;   // listas internas (itens, etapas) não vêm de planilha
      const strs = vals.filter((v) => typeof v === 'string');
      let c;
      if (vals.every((v) => typeof v === 'boolean')) c = { tipo: 'booleano' };
      else if (vals.every((v) => typeof v === 'number')) c = { tipo: MOEDA.test(k) ? 'moeda' : 'numero' };
      else if (strs.length === vals.length && strs.every((v) => /^\d{4}-\d{2}-\d{2}$/.test(v))) c = { tipo: 'data' };
      else if (strs.length === vals.length && strs.every((v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v))) c = { tipo: 'datahora' };
      else if (strs.length === vals.length && strs.every((v) => /^\d{1,2}:\d{2}$/.test(v))) c = { tipo: 'hora' };
      else if (strs.length === vals.length && strs.filter((v) => ids[v]).length / strs.length > 0.8) {
        const alvo = ids[strs.find((v) => ids[v])];
        c = { tipo: 'relacao', colecao: alvo, mostrar: mostrarDe(alvo) };
      } else {
        const dif = [...new Set(strs)];
        const codigos = dif.every((x) => /^[a-z0-9_]{1,24}$/.test(x)), campoDeOpcao = /^(status|situacao|tipo|categoria|forma|canal|origem|clima|etapa|turno|prioridade|nivel|modalidade|periodo|frequencia|sexo|genero)$/.test(k);
        c = dif.length <= 12 && strs.length >= 6 && (codigos || (campoDeOpcao && dif.every((x) => x.length <= 30))) ? { tipo: 'selecao', opcoes: dif.map((x) => [x, x.charAt(0).toUpperCase() + x.slice(1).replace(/_/g, ' ')]) } : { tipo: 'texto' };
      }
      campos.push({ nome: k, rotulo: rotuloDe(k), ...c });
    }
    if (campos.length) saida[col] = { campos, singular: col.replace(/s$/, ''), plural: col, deduzida: !app.colecoes?.[col]?.campos };
  }
  app._camposDeduzidos = saida;
  return saida;
}
const tabelas = (app) => { const d = deduzir(app); return { ...Object.fromEntries(Object.entries(d).filter(([, c]) => c.deduzida)), ...Object.fromEntries(Object.entries(app.colecoes || {}).filter(([, c]) => c.campos)) }; };
const camposDe = (app, nome) => {
  const col = app.colecoes?.[nome], form = col?.campos ? (typeof col.campos === 'function' ? col.campos(app) : col.campos) : [];
  const ded = (deduzir(app)[nome]?.campos || []).filter((d) => !form.some((f) => f.nome === d.nome || (f.colecao && f.colecao === d.colecao)));
  return [...form, ...ded].filter((c) => c.nome && !['_anexos'].includes(c.nome));
};
// situação de quem chega sem situação na planilha: a "em aberto" do próprio sistema
const ABERTO = ['agendado', 'aberto', 'pendente', 'ativo', 'andamento', 'aguardando', 'orcamento', 'nova', 'novo', 'agendada', 'planejado', 'a_fazer'];
const colecoesImportaveis = (app) => Object.entries(tabelas(app)).filter(([k]) => camposDe(app, k).length);
function cabecalho(linhas) { const i = linhas.findIndex((l) => l.filter((x) => String(x).trim()).length >= 2); return i < 0 ? 0 : i; }
function adivinhar(app, aba) {
  const i = cabecalho(aba.linhas), cab = (aba.linhas[i] || []).map(String), nomeAba = chave(aba.nome);
  let melhor = null;
  for (const [k, col] of colecoesImportaveis(app)) {
    const mapa = mapear(cab, camposDe(app, k)), pontos = mapa.reduce((s, [, , n]) => s + n, 0) + ([chave(col.plural || ''), chave(col.singular || ''), chave(k)].some((x) => x && (nomeAba.includes(x) || x.includes(nomeAba))) ? 6 : 0);
    if (!melhor || pontos > melhor.pontos) melhor = { colecao: k, pontos, mapa };
  }
  return { ini: i, cab, colecao: melhor && (melhor.pontos >= 4 || melhor.mapa.length >= 2) ? melhor.colecao : '' };
}

// ---------------------------------------------------------------- valores
const dois = (n) => String(n).padStart(2, '0');
const dataExcel = (n) => { const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(n)) * 864e5); return d.toISOString().slice(0, 10); };
const horaExcel = (n) => { const min = Math.round((Number(n) % 1) * 1440) % 1440; return `${dois(Math.floor(min / 60))}:${dois(min % 60)}`; };
// "20/10/2026", "20-10-26", "2026-10-20", com ou sem hora ("14:30", "14h30", "14h")
function dataTexto(s) {
  s = String(s).trim();
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  const d = m ? `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${dois(m[2])}-${dois(m[1])}` : (s.match(/^(\d{4}-\d{2}-\d{2})/) || [])[1];
  if (!d) return null;
  m = s.slice(8).match(/(\d{1,2})\s*(?::|h)\s*(\d{2})?/i);
  return { d, h: m ? `${dois(m[1])}:${dois(m[2] || '00')}` : null };
}
function horaTexto(v) {
  if (typeof v === 'number') return horaExcel(v);
  const s = String(v).trim(), m = s.match(/(\d{1,2})\s*(?::|h)\s*(\d{2})?/i);
  return m && Number(m[1]) < 24 ? `${dois(m[1])}:${dois(m[2] || '00')}` : null;
}
function opcoes(c, app) { const o = typeof c.opcoes === 'function' ? c.opcoes(app) : c.opcoes || []; return o.map((x) => (Array.isArray(x) ? x : [x, x])); }
function converter(c, v, app) {
  if (v === '' || v == null) return null;
  if (['moeda', 'numero', 'porcentagem'].includes(c.tipo)) {
    if (typeof v === 'number') return c.tipo === 'porcentagem' && v > 0 && v <= 1 ? v * 100 : v;
    const s = String(v).replace(/[R$\s%]/g, ''), n = Number(/,\d{1,2}$/.test(s) || s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
    return Number.isFinite(n) ? n : null;
  }
  if (c.tipo === 'data') {
    if (typeof v === 'number') return v > 20000 && v < 80000 ? dataExcel(v) : null;
    return dataTexto(v)?.d || null;
  }
  if (c.tipo === 'datahora') {
    if (typeof v === 'number') return v > 20000 && v < 80000 ? `${dataExcel(v)}T${horaExcel(v)}` : null;
    const r = dataTexto(v); return r ? `${r.d}T${r.h || '00:00'}` : null;
  }
  if (c.tipo === 'hora') return horaTexto(v);
  if (c.tipo === 'dias') { const m = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, 'sáb': 6 }; const l = String(v).toLowerCase().split(/[\s,;/]+/).map((x) => (/^\d$/.test(x) ? Number(x) : m[x.slice(0, 3)])).filter((x) => x >= 0 && x <= 6); return l.length ? [...new Set(l)].sort() : null; }
  if (c.tipo === 'booleano') return typeof v === 'boolean' ? v : /^(s|sim|y|yes|1|true|x|ok|pago|feito)$/i.test(String(v).trim());
  if (c.tipo === 'selecao') { const o = opcoes(c, app), alvo = chave(v); const achou = o.find(([k, r]) => chave(k) === alvo || chave(r) === alvo) || o.find(([, r]) => chave(r).startsWith(alvo) || alvo.startsWith(chave(r))); return achou ? achou[0] : null; }
  if (c.tipo === 'tel') return typeof v === 'number' ? String(Math.round(v)) : String(v).trim();
  return String(typeof v === 'number' && Number.isInteger(v) ? v : v).trim();
}
const mostrarValor = (c, v, app) => (v == null ? '' : typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : c.tipo === 'moeda' ? moeda(v) : c.tipo === 'data' ? dataBR(v) : c.tipo === 'datahora' ? `${dataBR(v)} ${String(v).slice(11, 16)}` : c.tipo === 'selecao' ? (opcoes(c, app).find(([k]) => k === v)?.[1] ?? v) : v);

// ---------------------------------------------------------------- importar
const CHAVES = ['nome', 'titulo', 'descricao', 'placa', 'codigo', 'item'];
function chaveRegistro(campos, o, deduzida) {
  if (!deduzida) { const c = campos.find((x) => CHAVES.includes(x.nome) && o[x.nome]); return c ? `${c.nome}:${chave(o[c.nome])}` : null; }
  // tabelas do dia a dia: a linha inteira é a "assinatura" (não repete a mesma consulta no mesmo horário)
  const partes = campos.filter((c) => o[c.nome] != null).map((c) => `${c.nome}=${chave(o[c.nome])}`);
  return partes.length >= 2 ? partes.join('|') : null;
}
const linksDeFoto = (v) => String(v || '').split(/[\s,;]+/).filter((x) => /^https?:\/\/\S+$/i.test(x));
/** Campo de texto livre do cadastro (obs, notas, descrição…) que recebe as colunas sem lugar próprio, para nada da planilha se perder */
const NOTAS = ['obs', 'observacoes', 'observacao', 'notas', 'anotacoes', 'descricao', 'detalhes'];
export const campoNotas = (campos) => NOTAS.map((n) => campos.find((c) => c.nome === n && ['texto', 'texto-longo'].includes(c.tipo))).find(Boolean) || null;
const colunasDeFora = (cab, mapa) => { const usados = new Set(mapa.map(([, i]) => i)); return cab.map((h, i) => [String(h || '').trim(), i]).filter(([h, i]) => h && !usados.has(i) && !ehColunaFoto(h)); };

export function importarAba(app, aba, colecao, { pularRepetidos = true, fotosPendentes = [] } = {}) {
  const tab = tabelas(app)[colecao], col = app.colecoes[colecao] || {}, campos = camposDe(app, colecao), { ini, cab } = aba, mapa = mapear(cab, campos);
  const colFotos = cab.map((h, i) => (ehColunaFoto(h) ? i : -1)).filter((i) => i >= 0);
  const notas = campoNotas(campos) || { nome: '_planilha', tipo: 'texto-longo' }, fora = colunasDeFora(cab, mapa);
  const nomesForm = new Set((col.campos ? (typeof col.campos === 'function' ? col.campos(app) : col.campos) : []).map((c) => c.nome));
  const existentes = new Set(app.db.lista(colecao).map((x) => chaveRegistro(campos, x, tab.deduzida)).filter(Boolean));
  let n = 0, pulados = 0, criados = 0, fotos = 0;
  aba.linhas.forEach((l, idx) => {
    if (idx <= ini) return;
    const o = {};
    for (const [c, i] of mapa) {
      let v = l[i];
      if (c.tipo === 'relacao') {
        if (v === '' || v == null) continue; const mostrar = typeof c.mostrar === 'string' ? c.mostrar : 'nome';
        let alvo = app.db.lista(c.colecao).find((x) => chave(x[mostrar] || '') === chave(v));
        if (!alvo && (camposDe(app, c.colecao).some((x) => x.nome === mostrar) || mostrar === 'nome')) { alvo = app.db.salvar(c.colecao, { [mostrar]: String(v).trim() }); criados++; }
        v = alvo?.id || null;
      } else if (c.tipo === 'relacoes') {
        if (v === '' || v == null) continue; const mostrar = c.mostrar || 'nome';
        v = String(v).split(/\s*(?:[,;+\/]|\se\s)\s*/).filter(Boolean).map((nomeItem) => {
          let alvo = app.db.lista(c.colecao).find((x) => chave(x[mostrar] || '') === chave(nomeItem));
          if (!alvo) { alvo = app.db.salvar(c.colecao, { [mostrar]: nomeItem.trim() }); criados++; }
          return alvo?.id;
        }).filter(Boolean);
        if (!v.length) v = null;
      } else v = converter(c, v, app);
      if (v != null && v !== '') o[c.nome] = v;
    }
    // colunas sem lugar próprio vão para as observações ("Coluna: valor"), junto com o que já houver lá
    const extras = fora.map(([h, i]) => [h, l[i]]).filter(([, v]) => v !== '' && v != null).map(([h, v]) => `${h}: ${String(v).trim()}`);
    if (extras.length && Object.keys(o).length) o[notas.nome] = [o[notas.nome], ...extras].filter(Boolean).join(notas.tipo === 'texto-longo' ? '\n' : ' · ');
    // números que vêm da soma das ligações (ex.: duração = soma da duração dos serviços)
    for (const r of campos.filter((x) => x.tipo === 'relacoes' && Array.isArray(o[x.nome]))) {
      const alvos = o[r.nome].map((id) => app.db.obter(r.colecao, id)).filter(Boolean);
      for (const c of campos.filter((x) => (x.tipo === 'numero' || x.tipo === 'moeda') && o[x.nome] == null)) if (alvos.length && alvos.every((t) => typeof t[c.nome] === 'number')) o[c.nome] = alvos.reduce((s2, t) => s2 + t[c.nome], 0);
    }
    const st = campos.find((x) => x.nome === 'status' && x.tipo === 'selecao');
    if (st && o.status == null && Object.keys(o).length) { const op = opcoes(st, app).map(([k2]) => k2); o.status = ABERTO.find((x) => op.includes(x)) || op[0]; }
    const nLinha = aba.numeros?.[idx], arquivos = (aba.fotos?.[nLinha] || []).slice(), links = colFotos.flatMap((i) => linksDeFoto(l[i]));
    if (!Object.keys(o).length) return;
    const k = chaveRegistro(campos, o, tab.deduzida);
    if (pularRepetidos && k && existentes.has(k)) { pulados++; return; }
    const dados = col.antesDeSalvar ? col.antesDeSalvar({ ...o }, app, null) || o : o;
    // o que veio da planilha vale mais que o padrão automático (situação, "cliente desde", código…): histórico importado fica como era
    for (const [c] of mapa) if (!nomesForm.has(c.nome) && o[c.nome] != null) dados[c.nome] = o[c.nome];
    const salvo = app.db.salvar(colecao, { ...dados });
    if (salvo) { n++; if (k) existentes.add(k); if (arquivos.length || links.length) { fotosPendentes.push({ colecao, id: salvo.id, arquivos, links }); fotos += arquivos.length + links.length; } }
  });
  return { n, pulados, criados, fotos };
}

// baixa as fotos por link (quando o site permite) e anexa tudo aos registros
async function anexarFotos(app, pendentes, progresso) {
  let ok = 0, falhou = 0;
  for (const [i, p] of pendentes.entries()) {
    const arquivos = [...p.arquivos];
    for (const url of p.links) {
      try {
        const r = await fetch(url, { mode: 'cors' }); if (!r.ok) throw new Error();
        const b = await r.blob(); if (!/^image\//.test(b.type)) throw new Error();
        arquivos.push(new File([b], url.split('/').pop().split('?')[0] || 'foto', { type: b.type }));
      } catch { falhou++; }
    }
    if (arquivos.length && app.anexarArquivos) { const r = await app.anexarArquivos(p.colecao, p.id, arquivos, { silencioso: true }); ok += r.enviados; falhou += arquivos.length - r.enviados; }
    progresso?.(i + 1, pendentes.length);
  }
  return { ok, falhou };
}

// modelo de planilha (CSV que o Excel abre) com as colunas que o sistema reconhece
export function modeloCSV(app, colecao) {
  const campos = camposDe(app, colecao);
  return '﻿' + [...campos.map((c) => `"${String(c.rotulo || c.nome).replace(/"/g, '""')}"`), '"Fotos (links)"'].join(';') + '\r\n';
}

// ---------------------------------------------------------------- página "Importar planilha"
export function paginaImportar(app) {
  const st = (app._imp ||= { abas: [], arquivo: '', pular: true, feito: null });
  // consulta só de leitura usada nos testes automáticos: quais tabelas e colunas a importação reconhece
  window.__nexoImport = { tabelas: () => colecoesImportaveis(app).map(([k]) => k), campos: (c) => camposDe(app, c).map((x) => ({ nome: x.nome, rotulo: x.rotulo, tipo: x.tipo, colecao: x.colecao, mostrar: x.mostrar, opcoes: x.tipo === 'selecao' ? opcoes(x, app) : undefined })) };
  const cap = (t) => String(t).charAt(0).toUpperCase() + String(t).slice(1), nomeCol = (k) => tabelas(app)[k]?.plural || k;
  const render = (_a, params = []) => {
    const cols = colecoesImportaveis(app);
    // vindo do botão "Adicionar" de uma página (#/importar/<cadastro>): a planilha vai para esse cadastro
    if (params[0] !== undefined) st.preferida = cols.some(([k]) => k === params[0]) ? params[0] : '';
    const topo = `<div class="dica">${ic('table')}<span>Suba a planilha do Excel (.xlsx) ou um CSV. O sistema reconhece cada aba e cada coluna pelo nome (Nome, Telefone, Data, Hora, Valor…) e preenche tudo sozinho: cadastros e também o dia a dia (agenda, vendas, lançamentos). Fotos coladas nas células ou numa coluna "Fotos" com links entram como anexos. Você confere antes de importar.</span></div>`;
    const envio = `<label class="imp-zona" data-imp-zona>${ic('upload-simple')}<b>${st.arquivo ? `Trocar o arquivo (${esc(st.arquivo)})` : 'Escolher a planilha'}</b><span>Excel (.xlsx) ou CSV · as abas viram cadastros</span><input type="file" accept=".xlsx,.xlsm,.csv,.txt,.xls" data-mudar="impArquivo" hidden></label>`;
    const feito = st.feito ? `<div class="dica ok-fundo">${ic('check-circle')}<span><b>Importação concluída:</b> ${st.feito.map((x) => `${num(x.n)} ${esc(nomeCol(x.colecao))}${x.criados ? ` (+${x.criados} cadastros ligados)` : ''}${x.pulados ? `, ${x.pulados} já existiam` : ''}`).join(' · ')}${st.fotosFeitas ? ` · ${num(st.fotosFeitas.ok)} ${st.fotosFeitas.ok === 1 ? 'foto anexada' : 'fotos anexadas'}${st.fotosFeitas.falhou ? ` (${st.fotosFeitas.falhou} links de foto não abriram: o site de origem não permite baixar)` : ''}` : ''}.</span></div>` : '';
    const abas = st.abas.map((a, k) => {
      const campos = a.colecao ? camposDe(app, a.colecao) : [], mapa = a.colecao ? mapear(a.cab, campos) : [], linhas = Math.max(0, a.linhas.length - a.ini - 1);
      const usados = new Set(mapa.map(([, i]) => i)), colFotos = a.cab.map((h, i) => [h, i]).filter(([h]) => ehColunaFoto(h)), fora = a.cab.map((h, i) => [h, i]).filter(([h, i]) => String(h).trim() && !usados.has(i) && !ehColunaFoto(h));
      const nFotos = Object.values(a.fotos || {}).reduce((s, l) => s + l.length, 0);
      const previa = mapa.length ? `<div style="overflow-x:auto;margin-top:10px"><table class="tabela"><thead><tr>${mapa.map(([c]) => `<th>${esc(c.rotulo || c.nome)}</th>`).join('')}</tr></thead><tbody>${a.linhas.slice(a.ini + 1, a.ini + 4).map((l) => `<tr>${mapa.map(([c, i]) => `<td>${esc(c.tipo === 'relacao' ? l[i] : mostrarValor(c, converter(c, l[i], app), app))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
      return `<div class="cartao"><div class="cartao-cab"><div><h3>Aba "${esc(a.nome)}"</h3><div class="sub">${num(linhas)} ${linhas === 1 ? 'linha' : 'linhas'}${mapa.length ? ` · ${mapa.length} colunas reconhecidas` : ''}${nFotos ? ` · ${nFotos} ${nFotos === 1 ? 'foto' : 'fotos'} na planilha` : ''}</div></div>
        <label class="flex" style="gap:8px;font-size:13px">Vai para<select data-mudar="impColecao" data-k="${k}" style="width:auto;height:32px"><option value="">Não importar</option>${cols.map(([c, col]) => `<option value="${c}" ${c === a.colecao ? 'selected' : ''}>${esc(cap(col.plural || c))}</option>`).join('')}</select></label></div>
        <div class="cartao-corpo">${a.colecao ? `<div class="flex" style="flex-wrap:wrap;gap:6px">${mapa.map(([c, i]) => `<span class="et ok sem-ponto">${esc(a.cab[i])} → ${esc(c.rotulo || c.nome)}</span>`).join('')}${colFotos.map(([h]) => `<span class="et ok sem-ponto">${esc(h)} → fotos</span>`).join('')}${fora.map(([h]) => `<span class="et sem-ponto" title="Sem campo próprio: fica guardada como 'coluna: valor'${campoNotas(campos) ? ` em ${esc(campoNotas(campos).rotulo || 'Observações')}` : ' e aparece na ficha, no bloco Da planilha'}">${esc(h)} → ${esc(campoNotas(campos)?.rotulo || 'Da planilha (na ficha)')}</span>`).join('')}</div>${previa}` : '<p class="mute-2" style="margin:0">Esta aba não vai ser importada. Escolha para onde ela vai, se quiser.</p>'}</div></div>`;
    }).join('');
    const acoes = st.abas.some((a) => a.colecao) ? `<div class="entre"><label class="flex" style="gap:8px;font-size:13px"><input type="checkbox" data-mudar="impPular" ${st.pular ? 'checked' : ''}> Não repetir o que já está cadastrado</label><button type="button" class="btn pri" data-acao="impConfirmar">${ic('check')}Importar tudo</button></div>` : '';
    const modelos = `<div class="cartao"><div class="cartao-cab"><div><h3>Modelos de planilha</h3><div class="sub">Baixe, preencha no Excel e suba aqui: as colunas já vêm com os nomes certos</div></div></div><div class="cartao-corpo flex" style="flex-wrap:wrap;gap:8px">${cols.map(([c, col]) => `<button type="button" class="btn" data-acao="impModelo" data-c="${c}">${ic('download-simple')}${esc(cap(col.plural || c))}</button>`).join('')}</div></div>`;
    const pref = st.preferida && tabelas(app)[st.preferida] ? `<div class="dica ok-fundo">${ic('arrow-right')}<span>A planilha vai para <b>${esc(nomeCol(st.preferida))}</b>. <a href="javascript:void 0" data-acao="impModelo" data-c="${esc(st.preferida)}">Baixar o modelo dessa planilha</a> para ver as colunas.</span></div>` : '';
    return `${topo}${pref}${feito}${envio}${abas}${acoes}${modelos}`;
  };
  Object.assign(app.acoes, {
    impArquivo: async (d, el) => {
      const arq = el.files?.[0]; if (!arq) return; if (arq.size > 25e6) return avisar('Planilha grande demais (máximo 25 MB)', { tipo: 'erro' });
      try {
        const abas = await lerPlanilha(arq);
        const vale = abas.filter((a) => a.linhas.length > 1);
        st.abas = vale.map((a) => { const g = adivinhar(app, a); return { ...a, ...g, ...(st.preferida && (vale.length === 1 || !g.colecao) ? { colecao: st.preferida } : {}) }; }); st.arquivo = arq.name; st.feito = null; st.fotosFeitas = null;
        if (!st.abas.length) avisar('A planilha está vazia', { tipo: 'erro' }); else avisar(`${st.abas.length} ${st.abas.length === 1 ? 'aba lida' : 'abas lidas'}. Confira e importe.`);
      } catch (x) { avisar(x.message || 'Não consegui ler esse arquivo', { tipo: 'erro', tempo: 8000 }); }
      app.render();
    },
    impColecao: (d, el) => { const a = st.abas[Number(d.k)]; if (a) a.colecao = el.value; app.render(); },
    impPular: (d, el) => { st.pular = el.checked; },
    impModelo: (d) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([modeloCSV(app, d.c)], { type: 'text/csv;charset=utf-8' })); a.download = `modelo-${d.c}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); },
    impConfirmar: async () => {
      const vai = st.abas.filter((a) => a.colecao), tot = vai.reduce((s, a) => s + Math.max(0, a.linhas.length - a.ini - 1), 0);
      if (!(await confirmar(`Importar ${num(tot)} ${tot === 1 ? 'linha' : 'linhas'} de ${vai.length} ${vai.length === 1 ? 'aba' : 'abas'}? Os cadastros entram no sistema na hora.`, { rotulo: 'Importar', titulo: 'Importar planilha' }))) return;
      // abas de cadastros base primeiro (clientes, produtos…) para as relações acharem os nomes
      const ordem = vai.slice().sort((x, y) => camposDe(app, x.colecao).filter((c) => c.tipo === 'relacao').length - camposDe(app, y.colecao).filter((c) => c.tipo === 'relacao').length);
      const pendentes = [];
      // grava uma vez só no fim (planilhas grandes ficam rápidas)
      const gravar = app.db.gravar; app.db.gravar = () => {};
      try { st.feito = ordem.map((a) => ({ colecao: a.colecao, ...importarAba(app, a, a.colecao, { pularRepetidos: st.pular, fotosPendentes: pendentes }) })); } finally { app.db.gravar = gravar; }
      app.db.gravar();
      if (pendentes.length) {
        avisar(`Anexando as fotos (${pendentes.length} ${pendentes.length === 1 ? 'registro' : 'registros'})…`, { tempo: 3000 });
        st.fotosFeitas = await anexarFotos(app, pendentes);
        app.db.gravar();
      }
      st.abas = []; st.arquivo = '';
      avisar(`${num(st.feito.reduce((s, x) => s + x.n, 0))} registros importados`); app.render();
    },
  });
  return { id: 'importar', rot: 'Importar planilha', titulo: 'Importar planilha', render };
}
