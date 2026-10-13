// =============================================================
// Linha Nexo · importar planilha (Excel .xlsx ou CSV)
// -------------------------------------------------------------
// Lê o arquivo no próprio navegador (o .xlsx é um zip com XML; não
// precisa de biblioteca), reconhece cada aba e cada coluna pelos nomes
// e preenche o sistema: clientes, produtos, serviços, o que tiver.
// Relações (ex.: o cliente de uma obra) são achadas pelo nome e, se
// não existirem, são criadas junto.
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
  const ler = async (nome) => {
    const a = arquivos.get(nome) || arquivos.get(nome.replace(/^\//, '')); if (!a) return null;
    if (a.metodo === 0) return dec.decode(a.dados);
    const corpo = new Blob([a.dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return dec.decode(await new Response(corpo).arrayBuffer());
  };
  return { ler, nomes: [...arquivos.keys()] };
}
const xml = (t) => new DOMParser().parseFromString(t, 'application/xml');
const colIdx = (ref) => { let n = 0; for (const ch of String(ref).replace(/\d+/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };

async function lerXlsx(buf) {
  const z = await descompactar(buf);
  const comp = (await z.ler('xl/sharedStrings.xml')) || '';
  const textos = comp ? [...xml(comp).getElementsByTagName('si')].map((si) => [...si.getElementsByTagName('t')].map((t) => t.textContent).join('')) : [];
  const wb = xml(await z.ler('xl/workbook.xml')), rels = xml((await z.ler('xl/_rels/workbook.xml.rels')) || '<r/>');
  const alvo = Object.fromEntries([...rels.getElementsByTagName('Relationship')].map((r) => [r.getAttribute('Id'), r.getAttribute('Target')]));
  const abas = [];
  for (const sh of [...wb.getElementsByTagName('sheet')]) {
    const rid = sh.getAttribute('r:id') || [...sh.attributes].find((a) => /:id$/.test(a.name))?.value;
    let caminho = alvo[rid] || ''; caminho = caminho.startsWith('/') ? caminho.slice(1) : `xl/${caminho}`;
    const conteudo = await z.ler(caminho); if (!conteudo) continue;
    const linhas = [];
    for (const row of [...xml(conteudo).getElementsByTagName('row')]) {
      const l = [];
      for (const c of [...row.getElementsByTagName('c')]) {
        const t = c.getAttribute('t'), vv = c.getElementsByTagName('v')[0]?.textContent;
        let val = '';
        if (t === 's') val = textos[Number(vv)] ?? '';
        else if (t === 'inlineStr') val = [...c.getElementsByTagName('t')].map((x) => x.textContent).join('');
        else if (t === 'b') val = vv === '1';
        else if (t === 'str' || t === 'e') val = vv ?? '';
        else if (vv != null && vv !== '') val = Number(vv);
        l[colIdx(c.getAttribute('r'))] = val;
      }
      if (l.some((x) => x !== '' && x != null)) linhas.push(Array.from(l, (x) => x ?? ''));
    }
    abas.push({ nome: sh.getAttribute('name') || 'Planilha', linhas });
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
  return [{ nome: arq.name.replace(/\.[^.]+$/, ''), linhas: lerCSV(t) }];
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
  data: ['data', 'dia', 'quando'],
  vencimento: ['vencimento', 'vence', 'data de vencimento'],
  descricao: ['descricao', 'detalhes', 'observacao', 'obs'],
  documento: ['cpf', 'cnpj', 'cpf cnpj', 'documento'], cpf: ['cpf', 'documento'], cnpj: ['cnpj'],
  placa: ['placa', 'placa do veiculo'], cidade: ['cidade', 'municipio'], obs: ['observacao', 'observacoes', 'obs', 'notas'],
  codigo: ['codigo', 'cod', 'sku', 'referencia', 'ref'], estoque: ['estoque', 'quantidade', 'qtd', 'saldo'], categoria: ['categoria', 'grupo', 'tipo'],
  nascimento: ['nascimento', 'data de nascimento', 'aniversario'],
  titulo: ['titulo', 'obra', 'servico', 'nome da obra', 'projeto', 'evento', 'assunto', 'negocio', 'oportunidade'],
  previsao: ['previsao', 'entrega', 'data de entrega', 'prazo', 'previsao de entrega', 'termino'],
  inicio: ['inicio', 'comeco', 'data de inicio'], diaria: ['diaria', 'valor da diaria'], funcao: ['funcao', 'cargo', 'profissao'],
  empresa: ['empresa', 'companhia', 'razao social'], cargo: ['cargo', 'funcao'], item: ['item', 'material', 'produto'], quantidade: ['quantidade', 'qtd', 'qtde'],
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
function mapear(cab, campos) {
  const usado = new Set(), mapa = [];
  const pares = campos.flatMap((c) => cab.map((h, i) => ({ c, i, n: nota(h, c) }))).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  for (const p of pares) { if (usado.has(p.i) || mapa.some(([c]) => c === p.c)) continue; usado.add(p.i); mapa.push([p.c, p.i, p.n]); }
  return mapa;
}
const camposDe = (app, nome) => { const col = app.colecoes?.[nome]; if (!col?.campos) return []; return (typeof col.campos === 'function' ? col.campos(app) : col.campos).filter((c) => c.nome && !['_anexos'].includes(c.nome)); };
const colecoesImportaveis = (app) => Object.entries(app.colecoes || {}).filter(([k, c]) => c.campos && camposDe(app, k).length);
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
const dataExcel = (n) => { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(Number(n)) * 864e5); return d.toISOString().slice(0, 10); };
function opcoes(c, app) { const o = typeof c.opcoes === 'function' ? c.opcoes(app) : c.opcoes || []; return o.map((x) => (Array.isArray(x) ? x : [x, x])); }
function converter(c, v, app) {
  if (v === '' || v == null) return null;
  if (['moeda', 'numero', 'porcentagem'].includes(c.tipo)) {
    if (typeof v === 'number') return c.tipo === 'porcentagem' && v > 0 && v <= 1 ? v * 100 : v;
    const s = String(v).replace(/[R$\s%]/g, ''), n = Number(/,\d{1,2}$/.test(s) || s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
    return Number.isFinite(n) ? n : null;
  }
  if (c.tipo === 'data' || c.tipo === 'datahora') {
    if (typeof v === 'number') return v > 20000 && v < 80000 ? dataExcel(v) : null;
    const m = String(v).trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/); if (m) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? String(v).slice(0, 10) : null;
  }
  if (c.tipo === 'hora') { if (typeof v === 'number' && v < 1) { const min = Math.round(v * 1440); return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`; } return String(v).slice(0, 5); }
  if (c.tipo === 'booleano') return typeof v === 'boolean' ? v : /^(s|sim|y|yes|1|true|x|ok)$/i.test(String(v).trim());
  if (c.tipo === 'selecao') { const o = opcoes(c, app), alvo = chave(v); const achou = o.find(([k, r]) => chave(k) === alvo || chave(r) === alvo) || o.find(([, r]) => chave(r).startsWith(alvo) || alvo.startsWith(chave(r))); return achou ? achou[0] : null; }
  if (c.tipo === 'tel') return typeof v === 'number' ? String(Math.round(v)) : String(v).trim();
  return String(typeof v === 'number' && Number.isInteger(v) ? v : v).trim();
}

// ---------------------------------------------------------------- importar
function chaveRegistro(campos, o) { const c = campos.find((x) => ['nome', 'titulo', 'descricao', 'placa', 'codigo', 'item'].includes(x.nome) && o[x.nome]); return c ? `${c.nome}:${chave(o[c.nome])}` : null; }
export function importarAba(app, aba, colecao, { pularRepetidos = true } = {}) {
  const col = app.colecoes[colecao], campos = camposDe(app, colecao), { ini, cab } = aba, mapa = mapear(cab, campos);
  const existentes = new Set(app.db.lista(colecao).map((x) => chaveRegistro(campos, x)).filter(Boolean));
  let n = 0, pulados = 0, criados = 0;
  for (const l of aba.linhas.slice(ini + 1)) {
    const o = {};
    for (const [c, i] of mapa) {
      let v = l[i];
      if (c.tipo === 'relacao') {
        if (v === '' || v == null) continue; const mostrar = typeof c.mostrar === 'string' ? c.mostrar : 'nome';
        let alvo = app.db.lista(c.colecao).find((x) => chave(x[mostrar] || '') === chave(v));
        if (!alvo && camposDe(app, c.colecao).some((x) => x.nome === mostrar)) { alvo = app.db.salvar(c.colecao, { [mostrar]: String(v).trim() }); criados++; }
        v = alvo?.id || null;
      } else v = converter(c, v, app);
      if (v != null && v !== '') o[c.nome] = v;
    }
    if (!Object.keys(o).length) continue;
    const k = chaveRegistro(campos, o);
    if (pularRepetidos && k && existentes.has(k)) { pulados++; continue; }
    const dados = col.antesDeSalvar ? col.antesDeSalvar({ ...o }, app, null) || o : o;
    if (app.db.salvar(colecao, { ...dados })) { n++; if (k) existentes.add(k); }
  }
  return { n, pulados, criados };
}

// modelo de planilha (CSV que o Excel abre) com as colunas que o sistema reconhece
export function modeloCSV(app, colecao) {
  const campos = camposDe(app, colecao);
  return '﻿' + campos.map((c) => `"${String(c.rotulo || c.nome).replace(/"/g, '""')}"`).join(';') + '\r\n';
}

// ---------------------------------------------------------------- página "Importar planilha"
export function paginaImportar(app) {
  const st = (app._imp ||= { abas: [], arquivo: '', pular: true, feito: null });
  const cap = (t) => String(t).charAt(0).toUpperCase() + String(t).slice(1), nomeCol = (k) => app.colecoes[k]?.plural || k;
  const render = () => {
    const cols = colecoesImportaveis(app);
    const topo = `<div class="dica">${ic('table')}<span>Suba a planilha do Excel (.xlsx) ou um CSV. O sistema reconhece cada aba e cada coluna pelo nome (Nome, Telefone, E-mail, Valor, Data…) e preenche tudo sozinho. Você confere antes de importar.</span></div>`;
    const envio = `<label class="imp-zona" data-imp-zona>${ic('upload-simple')}<b>${st.arquivo ? `Trocar o arquivo (${esc(st.arquivo)})` : 'Escolher a planilha'}</b><span>Excel (.xlsx) ou CSV · as abas viram cadastros</span><input type="file" accept=".xlsx,.xlsm,.csv,.txt,.xls" data-mudar="impArquivo" hidden></label>`;
    const feito = st.feito ? `<div class="dica ok-fundo">${ic('check-circle')}<span><b>Importação concluída:</b> ${st.feito.map((x) => `${num(x.n)} ${esc(nomeCol(x.colecao))}${x.criados ? ` (+${x.criados} cadastros ligados)` : ''}${x.pulados ? `, ${x.pulados} já existiam` : ''}`).join(' · ')}.</span></div>` : '';
    const abas = st.abas.map((a, k) => {
      const campos = a.colecao ? camposDe(app, a.colecao) : [], mapa = a.colecao ? mapear(a.cab, campos) : [], linhas = Math.max(0, a.linhas.length - a.ini - 1);
      const usados = new Set(mapa.map(([, i]) => i)), fora = a.cab.map((h, i) => [h, i]).filter(([h, i]) => String(h).trim() && !usados.has(i));
      const previa = mapa.length ? `<div style="overflow-x:auto;margin-top:10px"><table class="tabela"><thead><tr>${mapa.map(([c]) => `<th>${esc(c.rotulo || c.nome)}</th>`).join('')}</tr></thead><tbody>${a.linhas.slice(a.ini + 1, a.ini + 4).map((l) => `<tr>${mapa.map(([c, i]) => { const v = c.tipo === 'relacao' ? l[i] : converter(c, l[i], app); const t = v == null ? '' : typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : c.tipo === 'moeda' ? moeda(v) : /^data/.test(c.tipo) ? dataBR(v) : c.tipo === 'selecao' ? (opcoes(c, app).find(([k]) => k === v)?.[1] ?? v) : v; return `<td>${esc(t)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>` : '';
      return `<div class="cartao"><div class="cartao-cab"><div><h3>Aba "${esc(a.nome)}"</h3><div class="sub">${num(linhas)} ${linhas === 1 ? 'linha' : 'linhas'}${mapa.length ? ` · ${mapa.length} colunas reconhecidas` : ''}</div></div>
        <label class="flex" style="gap:8px;font-size:13px">Vai para<select data-mudar="impColecao" data-k="${k}" style="width:auto;height:32px"><option value="">Não importar</option>${cols.map(([c, col]) => `<option value="${c}" ${c === a.colecao ? 'selected' : ''}>${esc(cap(col.plural || c))}</option>`).join('')}</select></label></div>
        <div class="cartao-corpo">${a.colecao ? `<div class="flex" style="flex-wrap:wrap;gap:6px">${mapa.map(([c, i]) => `<span class="et ok sem-ponto">${esc(a.cab[i])} → ${esc(c.rotulo || c.nome)}</span>`).join('')}${fora.map(([h]) => `<span class="et sem-ponto" title="Coluna não reconhecida: fica de fora">${esc(h)} (de fora)</span>`).join('')}</div>${previa}` : '<p class="mute-2" style="margin:0">Esta aba não vai ser importada. Escolha para onde ela vai, se quiser.</p>'}</div></div>`;
    }).join('');
    const acoes = st.abas.some((a) => a.colecao) ? `<div class="entre"><label class="flex" style="gap:8px;font-size:13px"><input type="checkbox" data-mudar="impPular" ${st.pular ? 'checked' : ''}> Não repetir o que já está cadastrado (mesmo nome)</label><button type="button" class="btn pri" data-acao="impConfirmar">${ic('check')}Importar tudo</button></div>` : '';
    const modelos = `<div class="cartao"><div class="cartao-cab"><div><h3>Modelos de planilha</h3><div class="sub">Baixe, preencha no Excel e suba aqui: as colunas já vêm com os nomes certos</div></div></div><div class="cartao-corpo flex" style="flex-wrap:wrap;gap:8px">${cols.map(([c, col]) => `<button type="button" class="btn" data-acao="impModelo" data-c="${c}">${ic('download-simple')}${esc(cap(col.plural || c))}</button>`).join('')}</div></div>`;
    return `${topo}${feito}${envio}${abas}${acoes}${modelos}`;
  };
  Object.assign(app.acoes, {
    impArquivo: async (d, el) => {
      const arq = el.files?.[0]; if (!arq) return; if (arq.size > 15e6) return avisar('Planilha grande demais (máximo 15 MB)', { tipo: 'erro' });
      try {
        const abas = await lerPlanilha(arq);
        st.abas = abas.filter((a) => a.linhas.length > 1).map((a) => ({ ...a, ...adivinhar(app, a) })); st.arquivo = arq.name; st.feito = null;
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
      // grava uma vez só no fim (planilhas grandes ficam rápidas)
      const gravar = app.db.gravar; app.db.gravar = () => {};
      try { st.feito = ordem.map((a) => ({ colecao: a.colecao, ...importarAba(app, a, a.colecao, { pularRepetidos: st.pular }) })); } finally { app.db.gravar = gravar; }
      app.db.gravar(); st.abas = []; st.arquivo = '';
      avisar(`${num(st.feito.reduce((s, x) => s + x.n, 0))} registros importados`); app.render();
    },
  });
  return { id: 'importar', rot: 'Importar planilha', titulo: 'Importar planilha', render };
}
