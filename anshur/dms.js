// Importação do sistema atual da revenda (DMS/ERP): lê as exportações (CSV, TXT, Excel), reconhece as colunas,
// normaliza, detecta duplicidades, monta a PRÉVIA e grava em lote com desfazer. Regras puras (testadas em testes_dms.js);
// a tela fica em areas/importar.js. Roda só no navegador: os arquivos nunca saem do aparelho, só os registros
// importados entram no estado da revenda (o mesmo caminho de sempre: localStorage na demonstração, anshur_salvar com conta).
(function (raiz) {
  // ---------- texto ----------
  const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const limpo = (s) => String(s ?? '').replace(/[ \s]+/g, ' ').trim();
  const chaveTxt = (s) => semAcento(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cabNorm = (s) => semAcento(s).toLowerCase().replace(/[º°ª]/g, '').replace(/[_\-./\\|:()#*]+/g, ' ').replace(/\s+/g, ' ').trim();

  // ---------- leitura: codificação, separador, CSV ----------
  // ERPs brasileiros exportam muito em Windows-1252 (Latin-1); UTF-8 inválido cai para Windows-1252
  function decodificar(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) return { texto: new TextDecoder('utf-8').decode(b.subarray(3)), codificacao: 'UTF-8' };
    if (b[0] === 0xFF && b[1] === 0xFE) return { texto: new TextDecoder('utf-16le').decode(b.subarray(2)), codificacao: 'UTF-16' };
    if (b[0] === 0xFE && b[1] === 0xFF) return { texto: new TextDecoder('utf-16be').decode(b.subarray(2)), codificacao: 'UTF-16' };
    try { return { texto: new TextDecoder('utf-8', { fatal: true }).decode(b), codificacao: 'UTF-8' }; } catch (e) { /* não é UTF-8 */ }
    return { texto: new TextDecoder('windows-1252').decode(b), codificacao: 'Windows-1252 (Latin-1)' };
  }
  const contarFora = (l, sep) => { let n = 0, q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === sep && !q) n++; } return n; };
  function separador(texto) {
    const amostra = String(texto).split(/\r?\n/).filter((l) => l.trim()).slice(0, 12);
    let melhor = ';', nota = -1;
    ['\t', ';', '|', ','].forEach((s) => {
      const cont = amostra.map((l) => contarFora(l, s)); if (!cont.length) return;
      const comSep = cont.filter((c) => c > 0);
      // o separador certo aparece na maioria das linhas, quase sempre a mesma quantidade de vezes
      const moda = comSep.length ? comSep.sort((a, b) => cont.filter((x) => x === b).length - cont.filter((x) => x === a).length)[0] : 0;
      const n = moda ? cont.filter((c) => c === moda).length * 10 + moda : 0;
      if (n > nota) { nota = n; melhor = s; }
    });
    return melhor;
  }
  // CSV com aspas (inclusive quebra de linha dentro de aspas)
  function lerCSV(texto, sep) {
    const t = String(texto || '').replace(/^﻿/, ''); sep = sep || separador(t);
    const linhas = []; let lin = [], cel = '', q = false;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { cel += '"'; i++; } else q = false; } else cel += ch; continue; }
      if (ch === '"' && cel.trim() === '') { q = true; cel = ''; }
      else if (ch === sep) { lin.push(cel); cel = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; lin.push(cel); linhas.push(lin); lin = []; cel = ''; }
      else cel += ch;
    }
    if (cel !== '' || lin.length) { lin.push(cel); linhas.push(lin); }
    return { linhas: linhas.map((l) => l.map((c) => (typeof c === 'string' ? c.trim() : c))).filter((l) => l.some((c) => String(c).trim() !== '')), separador: sep };
  }
  const NOME_SEP = { '\t': 'tabulação', ';': 'ponto e vírgula', ',': 'vírgula', '|': 'barra vertical' };

  // o que é dado: planilhas e textos exportados; o resto da pasta (PDF, imagens, executáveis, logs do sistema) é ignorado
  const EXT_DADO = /\.(csv|txt|tsv|xlsx|xlsm|xls|ods)$/i;
  const ehDado = (nome) => EXT_DADO.test(String(nome || '')) && !/(^|[\\/])(~\$|\.)/.test(String(nome || ''));
  const LIMITE_BYTES = 30 * 1024 * 1024, LIMITE_LINHAS = 100000;

  // um arquivo vira uma ou mais tabelas (Excel: uma por aba). XLSX = SheetJS (carregado pela tela; nos testes, injetado)
  function lerArquivo({ nome, caminho, bytes, XLSX }) {
    const origem = caminho || nome;
    const tam = bytes ? (bytes.byteLength || bytes.length || 0) : 0;
    if (!ehDado(nome)) return { ignorado: 'não é planilha nem texto exportado' };
    if (tam > LIMITE_BYTES) return { erro: `arquivo grande demais (${Math.round(tam / 1048576)} MB; o limite é 30 MB): exporte por período, um ano por arquivo` };
    if (!tam) return { ignorado: 'arquivo vazio' };
    if (/\.(xlsx|xlsm|xls|ods)$/i.test(nome)) {
      if (!XLSX) return { erro: 'o leitor de Excel não carregou (precisa de internet na primeira vez): tente de novo ou salve como CSV' };
      let wb;
      try { wb = XLSX.read(bytes, { type: 'array', cellDates: false, cellNF: false, cellText: false }); }
      catch (e) { return { erro: /password|encrypt|protegid|cfb/i.test(String(e && e.message)) ? 'planilha protegida por senha: abra no Excel, tire a senha (Arquivo › Informações › Proteger) e salve de novo' : 'não foi possível abrir esta planilha (arquivo corrompido ou formato antigo): abra no Excel e salve como .xlsx ou CSV' }; }
      const tabelas = wb.SheetNames.map((aba) => {
        const linhas = XLSX.utils.sheet_to_json(wb.Sheets[aba], { header: 1, raw: true, defval: '', blankrows: false })
          .map((l) => l.map((c) => (typeof c === 'string' ? c.trim() : c))).filter((l) => l.some((c) => String(c).trim() !== ''));
        return { origem: wb.SheetNames.length > 1 ? `${origem} › ${aba}` : origem, arquivo: origem, linhas, codificacao: 'Excel', separador: null };
      }).filter((t) => t.linhas.length);
      if (!tabelas.length) return { ignorado: 'planilha sem linhas' };
      return { tabelas };
    }
    const { texto, codificacao } = decodificar(bytes);
    const { linhas, separador: sep } = lerCSV(texto);
    if (!linhas.length) return { ignorado: 'arquivo sem linhas' };
    return { tabelas: [{ origem, arquivo: origem, linhas, codificacao, separador: NOME_SEP[sep] || sep }] };
  }

  // ---------- normalização ----------
  // "150000.00" | "150.000,00" | "R$ 150.000,00" | "150000" | "150,000.00" | "(1.500,00)" | "210 mil" | número do Excel
  function dinheiro(v) {
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    let t = semAcento(v).toLowerCase().replace(/ /g, ' ').trim(); if (!t) return NaN;
    const neg = /^\(.*\)$/.test(t) || /^-/.test(t) || /-$/.test(t);
    const mil = /\bmil\b/.test(t), mi = /\b(mi|milhao|milhoes)\b/.test(t);
    t = t.replace(/r\$|us\$|\$|reais|mil|milhoes|milhao|\bmi\b|[()\s+-]/g, '');
    if (!/^[\d.,]+$/.test(t) || !/\d/.test(t)) return NaN;
    const ul = Math.max(t.lastIndexOf('.'), t.lastIndexOf(','));
    if (t.includes('.') && t.includes(',')) t = t.slice(0, ul).replace(/[.,]/g, '') + '.' + t.slice(ul + 1);
    else if (t.includes(',')) t = (t.split(',').length > 2 || /^\d{1,3}(,\d{3}){2,}$/.test(t)) ? t.replace(/,/g, '') : t.replace(',', '.');
    else if (t.includes('.')) t = (t.split('.').length > 2 || /^\d{1,3}\.\d{3}$/.test(t)) ? t.replace(/\./g, '') : t;
    let n = parseFloat(t); if (!isFinite(n)) return NaN;
    if (mil) n *= 1000; if (mi) n *= 1e6;
    return neg ? -n : n;
  }
  // horas: "4.500" | "4500,5" | "4500.5" | "4.500 h"
  const numero = (v) => (typeof v === 'number' ? v : dinheiro(String(v ?? '').replace(/\b(h|hs|hrs?|horas?)\b\.?/gi, '')));
  // datas: dd/mm/aaaa, dd/mm/aa, dd-mm-aa, dd.mm.aaaa, aaaa-mm-dd (com ou sem hora), aaaammdd, ddmmaaaa e data serial do Excel
  const iso = (a, m, d) => { const dt = new Date(Date.UTC(a, m - 1, d)); return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? dt.toISOString().slice(0, 10) : 'invalida'; };
  const serial = (n) => (n > 59 && n < 90000 ? new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 864e5).toISOString().slice(0, 10) : 'invalida');
  const ano2 = (a) => (a < 100 ? (a < 70 ? 2000 + a : 1900 + a) : a);
  function dataISO(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return serial(v);
    if (v instanceof Date) return isNaN(v) ? 'invalida' : v.toISOString().slice(0, 10);
    const t = String(v).trim().replace(/[T\s]+\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?(z|[+-]\d{2}:?\d{2})?$/i, '').trim(); if (!t) return null;
    let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/); if (m) return iso(+m[1], +m[2], +m[3]);
    m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/); if (m) return iso(ano2(+m[3]), +m[2], +m[1]);
    m = t.match(/^(\d{8})$/);
    if (m) { const s = m[1]; const a = iso(+s.slice(0, 4), +s.slice(4, 6), +s.slice(6)); return /^(19|20)/.test(s) && a !== 'invalida' ? a : iso(+s.slice(4), +s.slice(2, 4), +s.slice(0, 2)); }
    if (/^\d{5}(\.\d+)?$/.test(t)) return serial(parseFloat(t));
    return 'invalida';
  }
  // "2019/2020" (fabricação/modelo) usa o de fabricação; "19/20" vira 2019
  function ano(v) {
    if (typeof v === 'number') return Math.trunc(ano2(v));
    const m = String(v ?? '').match(/\d{4}|\d{2}/); return m ? ano2(+m[0]) : NaN;
  }
  // estado de conservação: nota 1 a 5, 0 a 100 ou palavra
  function condicao(v) {
    const s = cabNorm(v); if (!s) return null;
    const pal = [[/otim|excelent|novo/, 95], [/muito bom/, 85], [/\bbom\b|boa/, 75], [/regular|medio/, 55], [/ruim|pessim|sucata/, 35]].find(([r]) => r.test(s));
    if (pal) return pal[1];
    const n = numero(s); if (!(n >= 0)) return null;
    return n <= 5 ? Math.max(20, Math.round(n * 20)) : Math.min(100, Math.round(n));
  }
  function tipoDe(s) {
    s = cabNorm(s); if (!s) return null;
    // implemento (rebocado/acoplado, sem horímetro) antes das máquinas: "plataforma de colhedora" e "pulverizador de arrasto" são implementos
    if (/implement|\bgrade|\barado|subsol|escarific|rocad|rocadeira|distribuid|calcar|carreta|graneleir|bazuca|bazuka|enfard|plataforma|terracead|plaina|rolo faca|(pulv\S*|tanque) (de )?(arrasto|montado|acoplado)/.test(s)) return 'implemento';
    return /trat|tractor/.test(s) ? 'trator' : /colh|cana/.test(s) ? 'colhedora' : /pulv|autoprop|uniport|imperador/.test(s) ? 'pulverizador' : /plant|semead|seme/.test(s) ? 'plantadeira' : null;
  }
  // marcas: casa os apelidos comuns dos sistemas com o nome de sempre; marca desconhecida fica como veio (sem forçar)
  const MARCAS = [['John Deere', /^(john ?deere|jd|deere)$/], ['Massey Ferguson', /^(massey( ferguson)?|mf|agco massey)$/], ['New Holland', /^(new ?holland|nh|cnh new holland)$/],
    ['Case IH', /^(case( ih)?|caseih|cnh case)$/], ['Valtra', /^(valtra|agco valtra)$/], ['Jacto', /^jacto$/], ['Stara', /^stara$/], ['Jumil', /^jumil$/],
    ['Kuhn', /^kuhn$/], ['Agrale', /^agrale$/], ['Fendt', /^fendt$/], ['Claas', /^claas$/], ['Mahindra', /^mahindra$/], ['Yanmar', /^yanmar$/],
    ['LS Tractor', /^ls( tractor)?$/], ['Semeato', /^semeato$/], ['Baldan', /^baldan$/], ['Tatu Marchesan', /^(tatu|marchesan|tatu marchesan)$/], ['Valmet', /^valmet$/]];
  const titulo = (s) => (s === s.toUpperCase() && s.length > 3 ? s.toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase()) : s);
  function marcaDe(s) { const t = limpo(s); if (!t) return ''; const n = cabNorm(t); const m = MARCAS.find(([, r]) => r.test(n)); return m ? m[0] : titulo(t); }
  // modelo: casa com o catálogo pelo texto sem espaços e sem acento ("MF4709" = "MF 4709"; "JOHN DEERE 6125J" = "6125J")
  function casarCatalogo(modelo, marca, catalogo) {
    const k = chaveTxt(modelo); if (!k) return null;
    const cands = (catalogo || []);
    let c = cands.find((m) => chaveTxt(m.modelo) === k);
    if (!c) { const sem = k.replace(/^(JOHNDEERE|JD|MASSEYFERGUSON|NEWHOLLAND|NH|CASEIH|CASE|VALTRA|JACTO|STARA|JUMIL)/, ''); if (sem && sem !== k) c = cands.find((m) => chaveTxt(m.modelo) === sem); }
    if (c && chaveTxt(marca)) { const mk = marcaDe(marca); if (MARCAS.some(([n]) => n === mk) && mk !== c.marca) return null; } // marca conhecida diferente: não força
    return c || null;
  }
  const doc = (s) => String(s ?? '').replace(/\D/g, '');
  const serieN = (s) => chaveTxt(s);

  // ---------- mapeamento de colunas ----------
  // ordem importa: o mais específico primeiro ("Data da venda" antes de "Venda"; "Vendedor" nunca vira valor vendido)
  const CAMPOS = [
    ['saida', 'Data da venda', [/^(dt|data|dia)( de| da| do)? ?(venda|saida|faturamento|fatura|nf de venda|nota de venda|baixa)\b/, /^(venda|saida|faturamento) (dt|data)\b/, /^(saida|data saida)$/, /^vendid[oa] em$/]],
    ['entrada', 'Data da troca / entrada', [/^(dt|data|dia)( de| da| do)? ?(troca|entrada|compra|aquisicao|recebimento|avaliacao|chegada|cadastro|nf de entrada)\b/, /^(entrada|troca|compra) (dt|data)\b/, /^entrada$/, /^recebid[oa] em$/]],
    ['vendedor', 'Vendedor', [/vendedor|consultor|representante|corretor/]],
    ['vendido', 'Valor vendido', [/^(valor|vlr|vl|preco|pr|total)( de| da| do)? ?(venda|vendido|faturado|faturamento|saida)\b/, /^venda( r\$| \$)?$/, /^vendid[oa]( por)?$/, /^(valor|vlr) (nf|nota) (de )?venda/, /^receita/]],
    ['pago', 'Valor pago na troca', [/^(valor|vlr|vl|preco|custo|total)( de| da| do| na| no)? ?(troca|compra|aquisicao|entrada|pago|avaliado|avaliacao|recebido|usado)\b/, /^(pago|custo|custo de aquisicao|valor pago|troca r\$|troca)$/, /^(valor|vlr) (nf|nota) (de )?(entrada|compra)/]],
    ['referencia', 'Fipe / referência', [/fipe|referencia|tabela( de)? (preco|mercado)|valor de mercado/]],
    ['anuncio', 'Preço anunciado', [/anunci|preco (de )?(lista|pedido|anuncio|oferta)|^pedido$|preco de venda sugerido/]],
    ['preparo', 'Preparo / reforma', [/preparo|reforma|recondicion|custo (de )?oficina|revisao/]],
    ['dias', 'Dias no pátio', [/^dias|dias (no|em) (patio|estoque)|permanencia|giro|tempo (no|em) (patio|estoque)/]],
    ['horas', 'Horas (horímetro)', [/horimetro|^horas?( de uso| trabalhadas| motor)?$|^hrs?$|^hs$|^hr (uso|motor)|^horas?\b/]],
    ['ano', 'Ano', [/^ano\b|ano (de )?fab|ano mod|fabricacao|^ano fab mod|^fab mod$/]],
    ['chassi', 'Chassi', [/chassi|chassis|^vin$/]],
    ['serie', 'Número de série', [/serie|^n s$|^ns$|serial|^n (de )?serie|numero de serie|^pin$/]],
    ['tipo', 'Categoria', [/categ|^tipo|grupo|familia|linha( de produto)?$|segmento|^classe/, /^(equipamento|maquina)$/]],
    ['marca', 'Fabricante', [/marca|fabricante|^fab$|montadora/]],
    ['modelo', 'Modelo', [/^modelo|^mod$|descricao( do)? (modelo|produto|equipamento|maquina|item)/, /^(produto|equipamento|maquina|item|descricao)$/]],
    ['cond', 'Estado (1 a 5)', [/^estado( de conservacao| geral)?$|condic|^nota|conservacao|avaliacao tecnica/]],
    ['loja', 'Loja', [/^loja|filial|unidade|^empresa$|^revenda$/]],
    ['documento', 'CPF/CNPJ', [/cpf|cnpj|^documento|^doc$|inscricao/]],
    ['telefone', 'Telefone', [/fone|telefone|celular|whats/]],
    ['email', 'E-mail', [/^e ?mail/]],
    ['cidade', 'Cidade', [/cidade|municipio|^local/]],
    ['cliente', 'Cliente', [/cliente|comprador|razao social|^nome|proprietario|produtor|fazenda/]],
    ['situacao', 'Situação', [/situac|status|^posicao$/]]
  ];
  // peças (estoque de peças do sistema atual): tabela própria, com os seus campos; os nomes de coluna dos ERPs de peças
  // ("Código", "Referência", "Saldo", "Custo médio", "Preço de venda", "Localização") não se confundem com os de máquina
  const CAMPOS_PECAS = [
    ['codigo', 'Código da peça', [/^(cod|codigo|cd)( da| do)? ?(peca|item|produto|fabricante|fab|original|interno)?$|^(part ?number|pn|sku|referencia|ref|ref fabricante|codigo original|numero da peca)$/]],
    ['descricao', 'Descrição', [/^(descricao|desc|descr)( da peca| do item| do produto)?$|^(nome( da peca| do item| do produto)?|peca|produto|item|material)$/]],
    ['aplicacao', 'Aplicação (modelos)', [/aplicac|compativ|serve (em|para)|^modelos?( compativeis)?$|^equipamentos?$|^maquinas?$/]],
    ['marca', 'Marca / fabricante', [/marca|fabricante|^fab$|montadora|^linha$/]],
    ['quantidade', 'Quantidade em estoque', [/^(qtd|qtde|quant|quantidade|saldo|estoque|est atual|estoque atual|disponivel|saldo atual|saldo fisico)\b/]],
    ['custo', 'Custo unitário', [/custo|^(vlr|valor|preco|pr) (de |do )?(custo|compra|reposicao)|^cmv|^ultimo custo/]],
    ['preco', 'Preço de venda', [/^(preco|vlr|valor|pr|pv)( de| da)? ?(venda|balcao|tabela|unitario|unit|publico)?$|^venda$|preco de venda/]],
    ['local', 'Localização', [/^local|localiza|prateleira|endereco|posicao|gaveta|corredor|^box$|escaninho|deposito|^rua$/]],
    ['unidade', 'Unidade', [/^(un|und|unid|unidade|um|unidade de medida)$/]],
    ['minimo', 'Estoque mínimo', [/minim|^est min|ponto de (pedido|reposicao)/]],
    ['loja', 'Loja', [/^loja|filial|^empresa$|^revenda$/]]
  ];
  const camposDe = (ent) => (ent === 'pecas' ? CAMPOS_PECAS : CAMPOS);
  const ROTULO = Object.fromEntries(CAMPOS.concat(CAMPOS_PECAS.filter(([k]) => !CAMPOS.some(([c]) => c === k))).map(([k, r]) => [k, r]));
  // nota de cada campo para um cabeçalho: 2 = sinônimo forte (primeiro padrão), 1 = genérico ("Equipamento", "Produto")
  const notas = (h, campos = CAMPOS) => { const n = cabNorm(h); if (!n) return []; return campos.map(([k, , rs]) => { const i = rs.findIndex((r) => r.test(n)); return i < 0 ? null : { k, nota: i === 0 ? 2 : k === 'tipo' ? 0.5 : 1 }; }).filter(Boolean); }; // "Equipamento" sozinho é o modelo; com "Modelo" ao lado, é a categoria
  const candidatos = (h, campos = CAMPOS) => notas(h, campos).map((x) => x.k);
  // é uma lista de peças? colunas de peça (código, quantidade, custo, localização) e nenhuma coluna só de máquina (ano, horas, chassi, datas de troca/venda)
  function pareceListaPecas(cab) {
    const pc = new Set(cab.flatMap((h) => candidatos(h, CAMPOS_PECAS)));
    const maq = cab.some((h) => { const n = cabNorm(h); return /^ano\b|fabricacao|horimetro|^horas?\b|chassi|^n(umero)? (de )?serie|data (da |de )?(troca|venda|entrada)/.test(n); });
    const forte = ['quantidade', 'local', 'custo', 'codigo'].filter((k) => pc.has(k)).length;
    return !maq && (pc.has('codigo') || pc.has('descricao')) && forte >= 2;
  }
  // ordem de colunas da planilha modelo do Anshur (sem cabeçalho)
  const ORDEM_MODELO = ['tipo', 'marca', 'modelo', 'ano', 'horas', 'cond', 'pago', 'vendido', 'dias', 'referencia', 'entrada', 'saida'];

  // cabeçalho: a primeira das 20 primeiras linhas com 2+ colunas reconhecidas e sem números de valor
  function acharCabecalho(linhas) {
    let melhor = -1, nota = 1;
    (linhas || []).slice(0, 20).forEach((l, i) => {
      const txt = l.filter((c) => typeof c === 'string' && c && !/^[\d.,\/\s$R-]+$/.test(c));
      if (txt.length < 2) return;
      const n = Math.max(new Set(l.flatMap((c) => candidatos(c).slice(0, 1))).size, new Set(l.flatMap((c) => candidatos(c, CAMPOS_PECAS).slice(0, 1))).size);
      if (n > nota) { nota = n; melhor = i; }
    });
    return melhor;
  }
  const hash = (s) => { // FNV-1a 2×32 bits: chave curta e estável por linha
    let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995; s = String(s);
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 0x01000193) >>> 0; b = Math.imul(b ^ c, 0x5bd1e995) >>> 0; b ^= b >>> 13; }
    return a.toString(36) + b.toString(36);
  };
  const assinatura = (cab) => hash((cab || []).map(cabNorm).join('|'));
  // mapa = um campo (ou null) para cada coluna; perfil salvo da revenda tem prioridade sobre o reconhecimento automático
  function mapear(cab, perfil, ent) {
    const usados = new Set(), mapa = [], auto = [];
    const salvo = perfil && perfil.mapa ? perfil.mapa : null;
    const campos = camposDe(ent || (perfil && perfil.entidade));
    cab.forEach((h, i) => { const k = cabNorm(h); if (salvo && k in salvo) { mapa[i] = salvo[k] || null; if (mapa[i]) usados.add(mapa[i]); auto[i] = 'perfil'; } });
    // distribuição global: o par coluna→campo de nota maior escolhe primeiro (a coluna "Modelo" vence "Equipamento")
    const pares = [];
    cab.forEach((h, i) => { if (!auto[i]) notas(h, campos).forEach((x, ordem) => pares.push({ i, k: x.k, nota: x.nota, ordem })); });
    pares.sort((a, b) => b.nota - a.nota || a.ordem - b.ordem || a.i - b.i);
    pares.forEach((p) => { if (auto[p.i] || usados.has(p.k)) return; mapa[p.i] = p.k; auto[p.i] = 'auto'; usados.add(p.k); });
    cab.forEach((h, i) => { if (!auto[i]) { mapa[i] = null; auto[i] = 'nada'; } });
    return { mapa, origem: auto };
  }
  // o que a tabela traz: máquinas (vendidas → histórico; sem venda → pátio) ou clientes
  function entidadeSugerida(mapa) {
    const tem = (k) => mapa.includes(k);
    if (tem('modelo') || tem('chassi') || tem('serie')) return 'auto';
    if (tem('cliente') || tem('documento')) return 'clientes';
    if (tem('codigo') || (tem('descricao') && (tem('quantidade') || tem('custo')))) return 'pecas';
    return 'ignorar';
  }
  const ENTIDADES = { auto: 'Máquinas e implementos: vendidos vão para o histórico, sem venda vão para o pátio', historico: 'Histórico de trocas vendidas', estoque: 'Estoque (pátio)', clientes: 'Clientes', pecas: 'Peças (catálogo e saldo em estoque)', ignorar: 'Não importar' };

  // tabela crua → tabela pronta para a prévia (cabeçalho, mapa, entidade), usando o perfil salvo quando houver
  function prepararTabela(t, perfis) {
    let cabIdx = acharCabecalho(t.linhas), cab, sig, perfil = null, mapa, origemMapa, semCab = false;
    if (cabIdx < 0) { // sem cabeçalho: só aceita a ordem da planilha modelo do Anshur
      const larg = Math.max(...t.linhas.slice(0, 5).map((l) => l.length));
      semCab = true; cab = Array.from({ length: larg }, (x, i) => `Coluna ${i + 1}`); sig = 'modelo-anshur-' + larg;
      perfil = (perfis || []).find((p) => p.assinatura === sig) || null;
      mapa = perfil ? cab.map((h) => perfil.mapa[cabNorm(h)] || null) : cab.map((h, i) => (larg >= 8 ? ORDEM_MODELO[i] || null : null));
      origemMapa = cab.map(() => (perfil ? 'perfil' : 'ordem'));
    } else {
      cab = t.linhas[cabIdx].map((c) => limpo(c)); sig = assinatura(cab);
      perfil = (perfis || []).find((p) => p.assinatura === sig) || null;
      const ent = perfil && perfil.entidade ? perfil.entidade : pareceListaPecas(cab) ? 'pecas' : null;
      const m = mapear(cab, perfil, ent); mapa = m.mapa; origemMapa = m.origem;
      if (ent === 'pecas') return Object.assign({}, t, { cabIdx, cab, semCab, assinatura: sig, perfil: perfil ? perfil.id : null, mapa, origemMapa, entidade: 'pecas', tipoPadrao: '' });
    }
    return Object.assign({}, t, { cabIdx, cab, semCab, assinatura: sig, perfil: perfil ? perfil.id : null, mapa, origemMapa,
      entidade: perfil && perfil.entidade ? perfil.entidade : entidadeSugerida(mapa), tipoPadrao: perfil ? perfil.tipoPadrao || '' : '' });
  }
  // a pessoa trocou o que o arquivo traz: peças usam outros campos, então as colunas são reconhecidas de novo
  function trocarEntidade(t, ent) {
    const eraPecas = t.entidade === 'pecas', viraPecas = ent === 'pecas';
    t.entidade = ent; t.perfil = null;
    if (eraPecas !== viraPecas && !t.semCab) { const m = mapear(t.cab, null, ent); t.mapa = m.mapa; t.origemMapa = m.origem; }
    return t;
  }
  function perfilDe(t, quando) {
    const m = {}; t.cab.forEach((h, i) => { m[cabNorm(h)] = t.mapa[i] || ''; });
    return { id: 'P' + t.assinatura, assinatura: t.assinatura, nome: t.origem, mapa: m, entidade: t.entidade, tipoPadrao: t.tipoPadrao || '', atualizado: quando };
  }

  // ---------- linha → registro normalizado ----------
  const RODAPE = /^(total|subtotal|sub total|soma|totais|qtd|quantidade|registros|n de registros|fim do relatorio|pagina|emitido|impresso)\b/;
  function linhaParaRegistro(cel, t, ctx) {
    const v = (k) => { const i = t.mapa.indexOf(k); return i < 0 ? '' : cel[i] ?? ''; };
    const vazio = (x) => x === '' || x == null;
    const primeiro = cel.find((c) => !vazio(c) && String(c).trim() !== '');
    if (primeiro == null) return { ignorada: 'linha vazia' };
    if (typeof primeiro === 'string' && RODAPE.test(cabNorm(primeiro))) return { ignorada: 'linha de total ou rodapé do relatório' };
    if (!t.mapa.some((k, i) => k && !vazio(cel[i]))) return { ignorada: 'linha sem nenhuma coluna reconhecida' };
    const erros = [], avisos = [];
    if (t.entidade === 'clientes') {
      const r = { nome: limpo(v('cliente')), documento: doc(v('documento')), telefone: limpo(v('telefone')), cidade: limpo(v('cidade')), email: limpo(v('email')).toLowerCase() };
      if (!r.nome && !r.documento) erros.push('sem nome e sem CPF/CNPJ');
      if (r.documento && ![11, 14].includes(r.documento.length)) avisos.push('CPF/CNPJ com quantidade de dígitos estranha');
      if (r.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)) { avisos.push('e-mail inválido (ficou de fora)'); r.email = ''; }
      return { reg: r, ent: 'clientes', erros, avisos };
    }
    if (t.entidade === 'pecas') {
      const qtdTxt = v('quantidade'), custoTxt = v('custo'), precoTxt = v('preco'), minTxt = v('minimo');
      const r = { codigo: limpo(v('codigo')), descricao: limpo(v('descricao')), aplicacao: limpo(v('aplicacao')), marca: marcaDe(v('marca')),
        quantidade: vazio(qtdTxt) ? 0 : numero(qtdTxt), custo: vazio(custoTxt) ? 0 : dinheiro(custoTxt), preco: vazio(precoTxt) ? 0 : dinheiro(precoTxt),
        local: limpo(v('local')), unidade: cabNorm(v('unidade')).replace(/[^a-z]/g, ''), minimo: vazio(minTxt) ? 0 : numero(minTxt), loja: limpo(v('loja')) };
      if (!r.descricao && !r.codigo) erros.push('sem código e sem descrição');
      if (!r.descricao && r.codigo) { r.descricao = r.codigo; avisos.push('sem descrição: entrou com o código'); }
      if (!(r.quantidade >= 0) || r.quantidade > 1e7) erros.push(r.quantidade < 0 ? `quantidade negativa ("${limpo(qtdTxt)}"): confira o saldo no sistema antigo` : `quantidade inválida ("${limpo(qtdTxt)}")`);
      if (!(r.custo >= 0)) erros.push(`custo inválido ("${limpo(custoTxt)}")`);
      if (!(r.preco >= 0)) erros.push(`preço inválido ("${limpo(precoTxt)}")`);
      if (!(r.minimo >= 0)) r.minimo = 0;
      if (vazio(qtdTxt)) avisos.push('sem quantidade: entrou no catálogo com saldo 0');
      if (r.quantidade > 0 && vazio(custoTxt)) avisos.push('com saldo e sem custo: o estoque entra com custo 0 (corrija na primeira compra)');
      if (r.loja && ctx.lojas && ctx.lojas.length) { const l = ctx.lojas.find((x) => chaveTxt(x) === chaveTxt(r.loja)); if (l) r.loja = l; else { avisos.push(`loja "${r.loja}" não cadastrada no Anshur: entrou na loja ${ctx.lojaPadrao || 'principal'}`); r.loja = ''; } }
      if (!r.loja) r.loja = ctx.lojaPadrao || '';
      r.quantidade = Math.round((r.quantidade || 0) * 1000) / 1000; r.custo = Math.round((r.custo || 0) * 100) / 100; r.preco = Math.round((r.preco || 0) * 100) / 100;
      return { reg: r, ent: 'pecas', erros, avisos };
    }
    const anoMax = ctx.anoMax || new Date().getFullYear(), hoje = ctx.hoje || new Date().toISOString().slice(0, 10);
    let modelo = limpo(v('modelo')), marca = marcaDe(v('marca'));
    const cat = casarCatalogo(modelo, v('marca'), ctx.catalogo);
    if (cat) { modelo = cat.modelo; if (!marca || chaveTxt(marca) === chaveTxt(cat.marca)) marca = cat.marca; }
    const tipo = tipoDe(v('tipo')) || (cat && cat.tipo) || tipoDe(modelo) || ctx.tipoPadrao || t.tipoPadrao || null;
    const r = { tipo, marca, modelo, ano: ano(v('ano')), horas: numero(v('horas')), cond: condicao(v('cond')), pago: dinheiro(v('pago')), vendido: dinheiro(v('vendido')),
      entrada: dataISO(v('entrada')), saida: dataISO(v('saida')), dias: numero(v('dias')), referencia: dinheiro(v('referencia')), anuncio: dinheiro(v('anuncio')), preparo: dinheiro(v('preparo')),
      chassi: serieN(v('chassi')), serie: serieN(v('serie')), loja: limpo(v('loja')), vendedor: limpo(v('vendedor')), cliente: limpo(v('cliente')), situacao: cabNorm(v('situacao')) };
    if (r.entrada === 'invalida') { erros.push(`data da troca inválida ("${limpo(v('entrada'))}")`); r.entrada = null; }
    if (r.saida === 'invalida') { erros.push(`data da venda inválida ("${limpo(v('saida'))}")`); r.saida = null; }
    if (!(r.dias >= 0)) r.dias = null;
    if (r.entrada && !r.saida && r.vendido > 0 && r.dias != null) { const d = new Date(r.entrada + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + Math.round(r.dias)); r.saida = d.toISOString().slice(0, 10); }
    if (!r.entrada && r.saida && r.dias != null) { const d = new Date(r.saida + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - Math.round(r.dias)); r.entrada = d.toISOString().slice(0, 10); }
    const vendida = r.vendido > 0 || !!r.saida || /vendid|faturad|baixad/.test(r.situacao);
    const ent = t.entidade === 'auto' ? (vendida ? 'historico' : 'estoque') : t.entidade;
    if (!modelo) erros.push('modelo vazio');
    if (!tipo) erros.push('categoria não reconhecida: escolha a categoria padrão do arquivo ou inclua a coluna (trator, colhedora, pulverizador, plantadeira ou implemento)');
    if (!(r.ano >= 1950 && r.ano <= anoMax + 1)) erros.push(vazio(v('ano')) ? 'ano vazio' : `ano inválido ("${limpo(v('ano'))}")`);
    if (tipo === 'implemento') r.horas = 0; // implemento não tem horímetro: horas não entram
    else if (vazio(v('horas'))) { r.horas = 0; avisos.push('sem horímetro: entrou com 0 h'); } else if (!(r.horas >= 0) || r.horas > 200000) erros.push(`horas inválidas ("${limpo(v('horas'))}")`);
    if (!(r.pago > 0)) erros.push(vazio(v('pago')) ? 'sem valor pago na troca' : `valor pago inválido ("${limpo(v('pago'))}")`);
    if (ent === 'historico') {
      if (!(r.vendido > 0)) erros.push(vazio(v('vendido')) ? 'vendida sem valor de venda' : `valor vendido inválido ("${limpo(v('vendido'))}")`);
      if (!r.saida) erros.push('sem data da venda: o histórico precisa da data da troca e da venda');
    } else if (ent === 'estoque') { r.vendido = NaN; r.saida = null; }
    if (!r.entrada) erros.push('sem data da troca (entrada no pátio)');
    if (r.entrada && r.saida && r.saida < r.entrada) erros.push('venda antes da troca');
    if (r.entrada && r.entrada > hoje) erros.push('data da troca no futuro');
    if (r.saida && r.saida > hoje) erros.push('data da venda no futuro');
    if (r.pago > 0 && r.vendido > 0 && (r.pago > r.vendido * 3 || r.vendido > r.pago * 3)) erros.push('valor pago e vendido muito diferentes: confira os zeros e as colunas');
    if (r.cond == null) r.cond = 60;
    if (!marca) avisos.push('sem fabricante');
    if (!erros.length && ent === 'historico' && !cat && !(r.referencia > 0) && !(ctx.refDe && ctx.refDe({ modelo, tipo, marca }))) avisos.push(`modelo "${modelo}" fora do catálogo e sem Fipe: entra no histórico, mas não ensina o avaliador`);
    if (r.loja && ctx.lojas && ctx.lojas.length) { const l = ctx.lojas.find((x) => chaveTxt(x) === chaveTxt(r.loja)); if (l) r.loja = l; else { avisos.push(`loja "${r.loja}" não cadastrada no Anshur`); r.loja = ''; } }
    ['vendido', 'referencia', 'anuncio', 'preparo'].forEach((k) => { if (!(r[k] > 0)) r[k] = null; else r[k] = Math.round(r[k]); });
    r.pago = Math.round(r.pago); r.horas = Math.round((r.horas || 0) * 10) / 10;
    return { reg: r, ent, erros, avisos };
  }
  // chave idempotente: o conteúdo normalizado da linha (o mesmo dado reexportado com outra formatação dá a mesma chave)
  const CAMPOS_CHAVE = { clientes: ['nome', 'documento', 'telefone', 'cidade', 'email'], maquina: ['tipo', 'marca', 'modelo', 'ano', 'horas', 'pago', 'vendido', 'entrada', 'saida', 'chassi', 'serie', 'anuncio', 'preparo', 'referencia', 'loja', 'vendedor', 'cliente'] };
  CAMPOS_CHAVE.pecas = ['codigo', 'descricao', 'aplicacao', 'marca', 'quantidade', 'custo', 'preco', 'local', 'unidade', 'minimo', 'loja'];
  const chaveLinha = (ent, r) => { const g = ent === 'clientes' || ent === 'pecas' ? ent : 'maquina'; return hash({ clientes: 'C', pecas: 'P', maquina: 'M' }[g] + '|' + CAMPOS_CHAVE[g].map((k) => (k === 'modelo' || k === 'marca' || k === 'nome' || k === 'codigo' || k === 'descricao' ? chaveTxt(r[k]) : r[k] ?? '')).join('|')); };
  const chaveMaq = (x, dt, valor) => [chaveTxt(x.modelo), x.ano, dt || '', Math.round(valor || 0)].join('|');

  // ---------- onde cada registro mora no estado ----------
  // com dados reais: vendidas → estado.historico, pátio → estado.fechadas; na demonstração tudo vai para estado.fechadas
  const listaDe = (ent, ambiente) => (ent === 'clientes' ? 'cadastros.clientes' : ambiente === 'op' && ent === 'historico' ? 'historico' : 'fechadas');
  function pegarLista(estado, nome, criar) {
    if (nome.startsWith('pecas.')) {
      const k = nome.slice(6);
      if (criar && (!estado.pecas || typeof estado.pecas !== 'object' || Array.isArray(estado.pecas))) estado.pecas = { catalogo: [], movimentos: [], inventarios: [], pedidos: [], compras: [], vendas: [] };
      if (!estado.pecas) return [];
      if (!Array.isArray(estado.pecas[k])) { if (!criar) return []; estado.pecas[k] = []; }
      return estado.pecas[k];
    }
    if (nome === 'cadastros.clientes') { if (criar) estado.cadastros = Object.assign({ clientes: [], fornecedores: [] }, estado.cadastros); return estado.cadastros ? (estado.cadastros.clientes = estado.cadastros.clientes || []) : []; }
    if (criar && !Array.isArray(estado[nome])) estado[nome] = [];
    return estado[nome] || [];
  }
  function garantirDms(estado) { estado.dms = Object.assign({ perfis: [], lotes: [], pastas: [] }, estado.dms); ['perfis', 'lotes', 'pastas'].forEach((k) => { if (!Array.isArray(estado.dms[k])) estado.dms[k] = []; }); return estado.dms; }
  const chavesFeitas = (estado) => { const m = new Map(); ((estado.dms && estado.dms.lotes) || []).filter((l) => !l.desfeito).forEach((l) => (l.chaves || []).forEach((c) => m.set(c, l))); return m; };

  // ---------- PRÉVIA ----------
  // ctx: { ambiente: 'op'|'demo', existentes: máquinas que o app já conhece (A.todasTrocas), catalogo, refDe, lojas, anoMax, hoje }
  const ORDEM_ENT = { clientes: 0, estoque: 1, historico: 2, pecas: 3 };
  const ATUALIZAVEIS = ['vendido', 'saida', 'horas', 'pago', 'anuncio', 'preparo', 'referencia', 'chassi', 'serie', 'loja', 'vendedor'];
  const ATUALIZAVEIS_CLI = ['documento', 'telefone', 'cidade', 'email'];
  // ---------- peças: comparação com o catálogo e gravação pelas regras da área Peças (window.PECAS) ----------
  // forma comparável de uma peça: campos do catálogo + saldo e mínimo por loja
  const PC = (ctx) => (ctx && ctx.P) || raiz.PECAS || null;
  function formaPeca(p, estado, ctx) {
    const P = PC(ctx), saldos = {};
    if (P && estado) { const r = P.posicao(estado, p.id); Object.entries(r.porLoja || {}).forEach(([l, q]) => { saldos[l] = q; }); }
    return { codigo: p.codFab || p.sku, descricao: p.descricao, marca: p.marca || '', aplicacao: (p.compat || []).join(', '), local: p.local || '', preco: +p.preco || 0,
      unidade: p.unidade || 'un', minimos: Object.assign({}, p.minimos), saldos, lojaLocal: Object.keys(saldos)[0] || '' };
  }
  const formaReg = (r) => ({ codigo: r.codigo, descricao: r.descricao, marca: r.marca, aplicacao: r.aplicacao, local: r.local, preco: r.preco, unidade: unidadeDe(r.unidade),
    minimos: r.minimo > 0 ? { [r.loja]: r.minimo } : {}, saldos: { [r.loja]: r.quantidade }, lojaLocal: r.loja || '' });
  function unidadeDe(s) {
    const u = cabNorm(s).replace(/[^a-z]/g, '');
    return /^(un|und|unid|unidade|u)$/.test(u) || !u ? 'un' : /^(pc|pca|pcs|peca|pecas)$/.test(u) ? 'pc' : /^(jg|jogo)$/.test(u) ? 'jg' : /^(kit|kt)$/.test(u) ? 'kit'
      : /^(l|lt|litro|litros)$/.test(u) ? 'l' : /^(kg|quilo)$/.test(u) ? 'kg' : /^(m|mt|metro|metros)$/.test(u) ? 'm' : /^(cx|caixa)$/.test(u) ? 'cx' : 'un';
  }
  const ATUALIZAVEIS_PECA = ['descricao', 'marca', 'aplicacao', 'local', 'preco', 'unidade', 'minimo', 'quantidade'];
  function difPeca(alvo, reg) {
    const loja = reg.loja || '';
    return ATUALIZAVEIS_PECA.filter((k) => {
      if (k === 'quantidade') return Math.abs((alvo.saldos[loja] || 0) - (reg.quantidade || 0)) > 1e-9;
      if (k === 'minimo') return reg.minimo > 0 && (alvo.minimos[loja] || 0) !== reg.minimo;
      if (k === 'preco') return reg.preco > 0 && Math.abs((alvo.preco || 0) - reg.preco) > 0.004;
      if (k === 'unidade') return !!reg.unidade && unidadeDe(reg.unidade) !== alvo.unidade;
      const nv = reg[k]; if (!nv) return false;
      if (k === 'local' && alvo.lojaLocal && loja && loja !== alvo.lojaLocal) return false; // localização é a da loja principal da peça; a linha de outra loja não muda
      return chaveTxt(alvo[k]) !== chaveTxt(nv);
    });
  }
  function mesclarPeca(alvo, reg, difs) {
    const x = Object.assign({}, alvo, { minimos: Object.assign({}, alvo.minimos), saldos: Object.assign({}, alvo.saldos) });
    difs.forEach((k) => { if (k === 'quantidade') x.saldos[reg.loja || ''] = reg.quantidade; else if (k === 'minimo') x.minimos[reg.loja || ''] = reg.minimo; else if (k === 'unidade') x.unidade = unidadeDe(reg.unidade); else x[k] = reg[k]; });
    return x;
  }
  // cria a peça no catálogo e, com saldo, a entrada de saldo inicial (custo do sistema anterior) na loja
  function criarPeca(estado, reg, imp, agora, ctx) {
    const P = PC(ctx); if (!P) throw new Error('A área Peças não carregou: recarregue a página.');
    P.garantir(estado);
    const usado = (s) => P.ativas(estado).some((x) => chaveTxt(x.sku) === chaveTxt(s));
    const p = P.salvarPeca(estado, { sku: reg.codigo && !usado(reg.codigo) ? reg.codigo : '', codFab: reg.codigo, descricao: reg.descricao, marca: reg.marca, compat: reg.aplicacao,
      local: reg.local, unidade: unidadeDe(reg.unidade), preco: reg.preco, minimos: reg.minimo > 0 ? { [reg.loja || '']: reg.minimo } : {} }, ctx.usuario || 'Importação do sistema', agora);
    p.imp = imp;
    const out = [{ l: 'pecas.catalogo', x: p }];
    if (reg.quantidade > 0) out.push({ l: 'pecas.movimentos', x: movPeca(estado, P, p.id, reg, reg.quantidade, imp, agora, ctx, 'entrada') });
    return out;
  }
  function movPeca(estado, P, id, reg, qtd, imp, agora, ctx, tipo) {
    const custo = reg.custo > 0 ? reg.custo : P.posicao(estado, id).custoMedio || 0;
    const m = P.movimento(estado, { tipo, peca: id, qtd, custo, loja: reg.loja || '', data: ctx.hoje || agora.slice(0, 10), origem: tipo === 'entrada' ? 'inicial' : 'inventario',
      ref: imp.lote, obs: tipo === 'entrada' ? 'Saldo inicial importado do sistema anterior' : 'Saldo conferido com o sistema anterior (importação)' }, ctx.usuario || '', agora);
    m.imp = imp.lote; return m;
  }
  // aplica as diferenças numa peça do catálogo; o saldo vira ajuste (movimento), nunca é escrito direto. Devolve o "antes" do catálogo.
  function aplicarPeca(estado, p, reg, difs, imp, agora, ctx, criados, inicial) {
    const P = PC(ctx), antes = {}, sem = [];
    const guardar = (k) => { if (k in antes || sem.includes(k)) return; if (p[k] === undefined) sem.push(k); else antes[k] = Array.isArray(p[k]) ? p[k].slice() : p[k] && typeof p[k] === 'object' ? Object.assign({}, p[k]) : p[k]; };
    difs.forEach((k) => {
      if (k === 'quantidade') { const dif = Math.round((reg.quantidade - P.posicao(estado, p.id, { loja: reg.loja || '' }).qtd) * 1000) / 1000; if (dif) criados.push({ l: 'pecas.movimentos', x: movPeca(estado, P, p.id, reg, dif, imp, agora, ctx, inicial && dif > 0 ? 'entrada' : 'ajuste') }); return; }
      if (k === 'aplicacao') { guardar('compat'); p.compat = String(reg.aplicacao).split(/[,;\n]/).map((s) => s.trim()).filter(Boolean); return; }
      if (k === 'minimo') { guardar('minimos'); p.minimos = Object.assign({}, p.minimos, { [reg.loja || '']: reg.minimo }); return; }
      if (k === 'unidade') { guardar('unidade'); p.unidade = unidadeDe(reg.unidade); return; }
      guardar(k); p[k] = reg[k];
    });
    if (sem.length) antes.$sem = sem;
    return antes;
  }

  function diferencas(alvo, reg, ent) {
    if (ent === 'pecas') return difPeca(alvo, reg);
    const campos = ent === 'clientes' ? ATUALIZAVEIS_CLI : ATUALIZAVEIS;
    return campos.filter((k) => {
      const nv = reg[k]; if (nv == null || nv === '' || (typeof nv === 'number' && !isFinite(nv))) return false;
      const at = alvo[k]; if (ent === 'clientes') return !at && nv;
      if ((k === 'serie' && serieN(alvo.chassi) === nv) || (k === 'chassi' && serieN(alvo.serie) === nv)) return false; // o mesmo número em outra coluna
      return String(at ?? '') !== String(nv);
    });
  }
  function previa(tabelas, estado, ctx = {}) {
    const ambiente = ctx.ambiente === 'op' ? 'op' : 'demo';
    const feitas = chavesFeitas(estado);
    // índices do que já existe: máquinas (inclusive as que não são editáveis, como a base fictícia da demonstração) e clientes
    const editavel = new Map();
    ['historico', 'fechadas'].forEach((l) => pegarLista(estado, l).forEach((x) => editavel.set(x.id, { lista: l, x })));
    const maquinas = (ctx.existentes || []).concat(pegarLista(estado, 'historico'), pegarLista(estado, 'fechadas'));
    const porSerie = new Map(), porMaq = new Map();
    const indexar = (x, ref) => { [x.chassi, x.serie].map(serieN).filter(Boolean).forEach((s) => { if (!porSerie.has(s)) porSerie.set(s, ref); }); porMaq.set(chaveMaq(x, x.entrada, x.pago), ref); if (x.saida) porMaq.set(chaveMaq(x, x.saida, x.vendido), ref); };
    maquinas.forEach((x) => { if (x && x.id) indexar(x, { id: x.id, x }); });
    const clientes = pegarLista(estado, 'cadastros.clientes');
    const cliDoc = new Map(), cliNome = new Map();
    const indexarCli = (c, ref) => { if (doc(c.documento)) cliDoc.set(doc(c.documento), ref); if (chaveTxt(c.nome)) cliNome.set(chaveTxt(c.nome), ref); };
    clientes.forEach((c) => indexarCli(c, { id: c.id, x: c }));
    // peças do catálogo: casam pelo código (SKU ou código do fabricante) ou, sem código, pela descrição
    const pcCod = new Map(), pcDesc = new Map();
    const indexarPc = (codigos, desc, ref) => { codigos.map(chaveTxt).filter(Boolean).forEach((c) => { if (!pcCod.has(c)) pcCod.set(c, ref); }); const d = chaveTxt(desc); if (d && !pcDesc.has(d)) pcDesc.set(d, ref); };
    const temPeca = (tabelas || []).some((t) => t.entidade === 'pecas');
    if (temPeca) pegarLista(estado, 'pecas.catalogo').filter((p) => !p.inativa).forEach((p) => indexarPc([p.sku, p.codFab], p.descricao, { id: p.id, x: formaPeca(p, estado, ctx), peca: true }));
    const itens = [], ignorados = [];
    (tabelas || []).forEach((t) => {
      if (t.entidade === 'ignorar') { ignorados.push({ origem: t.origem, motivo: 'tabela marcada para não importar' }); return; }
      t.linhas.forEach((cel, i) => {
        if (i <= t.cabIdx) return;
        if (i - t.cabIdx > LIMITE_LINHAS) return;
        const r = linhaParaRegistro(cel, t, ctx), linha = i + 1;
        if (r.ignorada) { itens.push({ origem: t.origem, linha, status: 'ignorada', motivo: r.ignorada }); return; }
        itens.push({ origem: t.origem, linha, ent: r.ent, reg: r.reg, avisos: r.avisos, status: r.erros.length ? 'erro' : null, motivo: r.erros.join('; ') });
      });
    });
    // ordem das dependências: clientes → pátio → histórico (a venda de uma máquina que acabou de entrar no pátio atualiza a mesma máquina)
    const ord = itens.map((x, i) => [x, i]).sort((a, b) => (ORDEM_ENT[a[0].ent] ?? 9) - (ORDEM_ENT[b[0].ent] ?? 9) || a[1] - b[1]).map((p) => p[0]);
    const nesta = new Map();
    ord.forEach((it, n) => {
      if (it.status) return;
      it.chave = chaveLinha(it.ent, it.reg); it.n = n;
      const l = feitas.get(it.chave);
      if (l) { it.status = 'igual'; it.motivo = `já importada em ${String(l.quando).slice(0, 10).split('-').reverse().join('/')}`; return; }
      if (nesta.has(it.chave)) { const o = nesta.get(it.chave); it.status = 'duplicado'; it.motivo = `repetida: igual à linha ${o.linha} de ${o.origem}`; it.opcoes = it.ent === 'pecas' ? ['pular'] : ['pular', 'novo']; it.decisao = 'pular'; return; }
      nesta.set(it.chave, it);
      let ref = null, porque = '';
      if (it.ent === 'pecas') {
        const c = chaveTxt(it.reg.codigo);
        ref = (c && pcCod.get(c)) || (!c && pcDesc.get(chaveTxt(it.reg.descricao))) || null;
        porque = ref ? (c ? `mesmo código (${it.reg.codigo}) de ` : 'mesma descrição de ') + (ref.x.descricao || ref.id) : '';
      } else if (it.ent === 'clientes') {
        ref = (it.reg.documento && cliDoc.get(it.reg.documento)) || (!it.reg.documento && cliNome.get(chaveTxt(it.reg.nome))) || null;
        porque = ref ? (it.reg.documento ? 'mesmo CPF/CNPJ de ' : 'mesmo nome de ') + (ref.x.nome || ref.id) : '';
      } else {
        const s = [it.reg.chassi, it.reg.serie].filter(Boolean).find((k) => porSerie.has(k));
        if (s) { ref = porSerie.get(s); porque = `mesmo chassi/série (${s}) de ${[ref.x.marca, ref.x.modelo].filter(Boolean).join(' ')}`; }
        else { ref = porMaq.get(chaveMaq(it.reg, it.reg.entrada, it.reg.pago)) || (it.reg.saida ? porMaq.get(chaveMaq(it.reg, it.reg.saida, it.reg.vendido)) : null) || null; if (ref) porque = `mesma máquina, data e valor de ${[ref.x.marca, ref.x.modelo].filter(Boolean).join(' ')}`; }
      }
      if (ref) {
        const alvoEstado = ref.pendente || ref.peca ? ref.x : it.ent === 'clientes' ? ref.x : (editavel.get(ref.id) || {}).x;
        const dif = diferencas(ref.x, it.reg, it.ent);
        if (!dif.length) { it.status = 'igual'; it.motivo = ref.pendente ? `repetida sem nada novo: ${porque} (linha ${ord[ref.item].linha} de ${ord[ref.item].origem})` : `já está no Anshur (${porque})`; it.alvo = ref.pendente ? null : ref.id; return; }
        const rotDif = (k) => (it.ent === 'pecas' ? { quantidade: `quantidade em estoque${it.reg.loja ? ' na loja ' + it.reg.loja : ''}`, minimo: 'estoque mínimo', preco: 'preço de venda', aplicacao: 'aplicação', local: 'localização', descricao: 'descrição', marca: 'marca', unidade: 'unidade' }[k] : ROTULO[k] || k);
        it.status = 'duplicado'; it.motivo = porque + (ref.pendente ? ` (linha ${ord[ref.item].linha} de ${ord[ref.item].origem}, nesta importação)` : '') + ': muda ' + (it.ent === 'pecas' ? dif.map(rotDif).join(', ') : dif.map(rotDif).join(', ').toLowerCase()); it.alvo = ref.pendente ? null : ref.id; it.alvoItem = ref.pendente ? ref.item : null;
        // peça: "importar como nova" criaria o mesmo código duas vezes; atualizar ou pular
        it.difs = dif; it.opcoes = it.ent === 'pecas' ? ['atualizar', 'pular'] : alvoEstado ? ['atualizar', 'pular', 'novo'] : ['pular', 'novo']; it.decisao = alvoEstado ? 'atualizar' : 'pular';
        if (!alvoEstado) it.motivo += ' — registro de demonstração, não pode ser alterado';
        else if (it.ent === 'pecas') ref.x = mesclarPeca(ref.x, it.reg, dif);
        else { const junto = Object.assign({}, ref.x); dif.forEach((k) => { junto[k] = it.reg[k]; }); ref.x = junto; } // as próximas linhas comparam com o registro já atualizado
        return;
      }
      it.status = 'novo';
      const pend = { id: 'novo:' + n, x: it.ent === 'pecas' ? formaReg(it.reg) : it.reg, pendente: true, item: n };
      if (it.ent === 'pecas') indexarPc([it.reg.codigo], it.reg.codigo ? '' : it.reg.descricao, pend);
      else if (it.ent === 'clientes') indexarCli({ documento: it.reg.documento, nome: it.reg.nome }, pend);
      else indexar(it.reg, pend);
    });
    return { itens: ord, ignorados, ambiente, contagens: contar({ itens: ord }) };
  }
  function contar(p) {
    const c = { novos: 0, atualizados: 0, pulados: 0, duplicados: 0, iguais: 0, erros: 0, ignoradas: 0, avisos: 0, historico: 0, estoque: 0, clientes: 0, pecas: 0 };
    p.itens.forEach((it) => {
      if (it.status === 'erro') c.erros++; else if (it.status === 'ignorada') c.ignoradas++; else if (it.status === 'igual') c.iguais++;
      else if (it.status === 'novo' || (it.status === 'duplicado' && it.decisao === 'novo')) { c.novos++; c[it.ent]++; }
      else if (it.status === 'duplicado' && it.decisao === 'atualizar') { c.atualizados++; c[it.ent]++; }
      else if (it.status === 'duplicado') c.pulados++;
      if (it.status === 'duplicado') c.duplicados++;
      if (it.avisos && it.avisos.length && it.status !== 'erro' && it.status !== 'ignorada') c.avisos++;
    });
    c.gravar = c.novos + c.atualizados;
    return c;
  }
  function decidir(p, n, decisao) { const it = p.itens.find((x) => x.n === n); if (it && it.opcoes && it.opcoes.includes(decisao)) it.decisao = decisao; p.contagens = contar(p); return p; }
  function decidirTodos(p, decisao) { p.itens.forEach((it) => { if (it.status === 'duplicado' && it.opcoes.includes(decisao)) it.decisao = decisao; }); p.contagens = contar(p); return p; }

  // ---------- GRAVAR (lote com ponto de restauração) ----------
  function novaMaquina(reg, id, imp) {
    const est = Math.max(1, Math.min(5, Math.round(reg.cond / 20)));
    const anuncio = reg.anuncio || (reg.vendido ? reg.vendido : Math.round(reg.pago * 1.15 / 1000) * 1000);
    const t = { id, tipo: reg.tipo, marca: reg.marca || '', modelo: reg.modelo, ano: reg.ano, horas: reg.horas || 0, cond: reg.cond, ficha: { motor: est, transmissao: est, hidraulico: est, pneus: est, cabine: est, lataria: est },
      pago: reg.pago, preparo: reg.preparo || 0, preparoEst: null, vendido: reg.vendido || null, entrada: reg.entrada, saida: reg.saida || null,
      diasPatio: reg.saida ? Math.max(0, Math.round((new Date(reg.saida) - new Date(reg.entrada)) / 864e5)) : null, anuncio, precos: [{ data: reg.entrada, valor: anuncio, motivo: 'Anúncio inicial (importado do sistema)' }],
      vendedor: reg.vendedor || 'Importado do sistema', origem: reg.cliente || 'Importada do sistema', idAgro: false, manutencoes: [], fotos: [], chassi: reg.chassi || '', imp };
    if (reg.serie) t.serie = reg.serie; if (reg.loja) t.loja = reg.loja; if (reg.referencia) t.referencia = reg.referencia;
    return t;
  }
  function aplicarCampos(alvo, reg, difs) {
    // ponto de restauração: o valor de antes de cada campo; campo que não existia vai em $sem (o desfazer apaga)
    const antes = {}, sem = [];
    const guardar = (k) => { if (k in antes || sem.includes(k)) return; if (alvo[k] === undefined) sem.push(k); else antes[k] = alvo[k]; };
    difs.forEach((k) => { guardar(k); alvo[k] = reg[k]; });
    if (sem.length) antes.$sem = sem;
    if (difs.includes('saida') || difs.includes('vendido')) {
      guardar('diasPatio'); if (sem.length) antes.$sem = sem;
      alvo.diasPatio = alvo.saida && alvo.entrada ? Math.max(0, Math.round((new Date(alvo.saida) - new Date(alvo.entrada)) / 864e5)) : null;
    }
    return antes;
  }
  // ctx: { ambiente, usuario, agora (ISO), origem: { tipo: 'pasta'|'arquivos', nome }, arquivos: [{origem, codificacao, linhas}], tabelas (para os perfis) }
  function gravar(estado, p, ctx = {}) {
    const dms = garantirDms(estado), ambiente = p.ambiente;
    const agora = ctx.agora || new Date().toISOString();
    const lote = { id: 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), quando: agora, usuario: ctx.usuario || '', origem: ctx.origem || { tipo: 'arquivos', nome: '' },
      arquivos: ctx.arquivos || [], contagens: Object.assign({}, p.contagens), criados: [], atualizados: [], chaves: [], erros: p.itens.filter((x) => x.status === 'erro').slice(0, 40).map((x) => ({ origem: x.origem, linha: x.linha, motivo: x.motivo })), desfeito: null };
    const criadosPorItem = new Map(); let seq = 0;
    const base = lote.id.slice(1).toUpperCase();
    const ctxP = Object.assign({}, ctx, { hoje: ctx.hoje || agora.slice(0, 10) });
    // peças: criar (catálogo + saldo inicial) ou atualizar (campos do catálogo com ponto de restauração; saldo por ajuste)
    function gravarPeca(it, imp) {
      if (it.decisao === 'pular' && it.status === 'duplicado') { lote.chaves.push(it.chave); return; }
      if (it.status === 'novo') {
        const res = criarPeca(estado, it.reg, imp, agora, ctxP);
        res.forEach((r) => lote.criados.push({ l: r.l, id: r.x.id }));
        criadosPorItem.set(it.n, { lista: 'pecas.catalogo', x: res[0].x }); lote.chaves.push(it.chave); return;
      }
      const alvo = it.alvoItem != null ? (criadosPorItem.get(it.alvoItem) || {}).x : pegarLista(estado, 'pecas.catalogo').find((x) => x.id === it.alvo);
      if (!alvo) { lote.chaves.push(it.chave); return; }
      const novos = [], difs = difPeca(formaPeca(alvo, estado, ctxP), it.reg);
      const antes = aplicarPeca(estado, alvo, it.reg, difs, imp, agora, ctxP, novos, it.alvoItem != null);
      novos.forEach((r) => lote.criados.push({ l: r.l, id: r.x.id }));
      // peça criada nesta importação sai inteira no desfazer: não precisa de ponto de restauração
      if (it.alvoItem == null && Object.keys(antes).length) lote.atualizados.push({ l: 'pecas.catalogo', id: alvo.id, antes });
      lote.chaves.push(it.chave);
    }
    p.itens.forEach((it) => {
      if (it.status === 'erro' || it.status === 'ignorada') return;
      if (it.status === 'igual') return;
      const imp = { lote: lote.id, chave: it.chave, arq: it.origem, linha: it.linha };
      if (it.ent === 'pecas') { gravarPeca(it, imp); return; }
      const lista = listaDe(it.ent, ambiente);
      const criar = () => {
        const L = pegarLista(estado, lista, true);
        let x;
        if (it.ent === 'clientes') x = { id: 'CL' + base + '-' + (++seq), nome: it.reg.nome || it.reg.documento, documento: it.reg.documento, telefone: it.reg.telefone, cidade: it.reg.cidade, email: it.reg.email, criadoEm: agora.slice(0, 10), imp };
        else x = novaMaquina(it.reg, 'DMS' + base + '-' + (++seq), imp);
        L.push(x); lote.criados.push({ l: lista, id: x.id }); criadosPorItem.set(it.n, { lista, x }); lote.chaves.push(it.chave);
      };
      if (it.status === 'novo' || it.decisao === 'novo') { criar(); return; }
      if (it.decisao === 'pular') { lote.chaves.push(it.chave); return; }
      // atualizar: registro desta mesma importação (sem ponto de restauração: sai junto no desfazer) ou um que já existia
      if (it.alvoItem != null) { const c = criadosPorItem.get(it.alvoItem); if (c) { const difs = diferencas(c.x, it.reg, it.ent); aplicarCampos(c.x, it.reg, difs); c.x.imp.atualizadoPor = it.chave; } lote.chaves.push(it.chave); return; }
      let alvo = null, nomeL = '';
      if (it.ent === 'clientes') { nomeL = 'cadastros.clientes'; alvo = pegarLista(estado, nomeL).find((c) => c.id === it.alvo); }
      else ['historico', 'fechadas'].some((l) => { alvo = pegarLista(estado, l).find((x) => x.id === it.alvo); nomeL = l; return !!alvo; });
      if (!alvo) { lote.chaves.push(it.chave); return; }
      const difs = diferencas(alvo, it.reg, it.ent);
      if (difs.length) lote.atualizados.push({ l: nomeL, id: alvo.id, antes: aplicarCampos(alvo, it.reg, difs) });
      lote.chaves.push(it.chave);
    });
    lote.contagens.criados = lote.criados.length; lote.contagens.alterados = lote.atualizados.length;
    // perfis de importação: o mapeamento conferido fica salvo e volta sozinho na próxima importação do mesmo layout
    (ctx.tabelas || []).forEach((t) => {
      if (!t.cab || t.entidade === 'ignorar' && !t.perfil) return;
      const pf = perfilDe(t, agora), i = dms.perfis.findIndex((x) => x.id === pf.id);
      pf.usos = (i >= 0 ? dms.perfis[i].usos || 0 : 0) + 1; if (i >= 0) dms.perfis[i] = pf; else dms.perfis.push(pf);
    });
    dms.lotes.push(lote);
    return lote;
  }

  // ---------- DESFAZER ----------
  // tira exatamente o que entrou no lote e devolve os campos que ele alterou; movimentos lançados depois nessas máquinas saem junto
  function movimentosDepois(estado, lote) {
    const ids = new Set(lote.criados.map((c) => c.id));
    const pecas = new Set(lote.criados.filter((c) => c.l === 'pecas.catalogo').map((c) => c.id));
    const movPecas = pecas.size ? pegarLista(estado, 'pecas.movimentos').filter((m) => pecas.has(m.peca) && !ids.has(m.id)).length : 0;
    return movPecas + ['vendas', 'precos', 'preparos', 'custos'].reduce((n, m) => n + Object.keys(estado[m] || {}).filter((k) => ids.has(k)).length, 0);
  }
  function desfazer(estado, loteId, ctx = {}) {
    const dms = garantirDms(estado), lote = dms.lotes.find((l) => l.id === loteId);
    if (!lote) return { ok: false, motivo: 'importação não encontrada' };
    if (lote.desfeito) return { ok: false, motivo: 'esta importação já foi desfeita' };
    let removidos = 0, restaurados = 0;
    // peça criada pelo lote: os movimentos lançados depois nela (balcão, OS) saem junto, como nas máquinas
    const pecas = new Set(lote.criados.filter((c) => c.l === 'pecas.catalogo').map((c) => c.id));
    if (pecas.size && estado.pecas && Array.isArray(estado.pecas.movimentos)) {
      const criadosIds = new Set(lote.criados.map((c) => c.id));
      const L = estado.pecas.movimentos;
      for (let i = L.length - 1; i >= 0; i--) if (pecas.has(L[i].peca) && !criadosIds.has(L[i].id)) L.splice(i, 1);
    }
    lote.criados.forEach((c) => {
      const L = pegarLista(estado, c.l), i = L.findIndex((x) => x.id === c.id);
      if (i >= 0) { L.splice(i, 1); removidos++; }
      ['vendas', 'precos', 'preparos', 'custos'].forEach((m) => { if (estado[m] && c.id in estado[m]) delete estado[m][c.id]; });
    });
    lote.atualizados.slice().reverse().forEach((a) => {
      const x = pegarLista(estado, a.l).find((y) => y.id === a.id); if (!x) return;
      Object.entries(a.antes).forEach(([k, v]) => { if (k !== '$sem') x[k] = v; });
      (a.antes.$sem || []).forEach((k) => { delete x[k]; }); restaurados++;
    });
    lote.desfeito = { quando: ctx.agora || new Date().toISOString(), usuario: ctx.usuario || '', removidos, restaurados };
    return { ok: true, removidos, restaurados };
  }

  // ---------- pasta do sistema: só o que mudou ----------
  // assinatura de cada arquivo = tamanho + data de modificação; arquivo igual ao da última sincronização nem é lido
  const assinaturaArquivo = (f) => `${f.tamanho || 0}:${f.modificado || 0}`;
  function mudados(pasta, arquivos) {
    const vistos = (pasta && pasta.arquivos) || {};
    const r = { ler: [], iguais: [] };
    arquivos.forEach((f) => { (vistos[f.caminho] === assinaturaArquivo(f) ? r.iguais : r.ler).push(f); });
    return r;
  }
  function registrarPasta(estado, { id, nome, tipo }, arquivos, resultado, agora) {
    const dms = garantirDms(estado);
    let p = dms.pastas.find((x) => x.id === id);
    if (!p) { p = { id, nome, tipo, arquivos: {} }; dms.pastas.push(p); }
    p.nome = nome; p.tipo = tipo;
    arquivos.forEach((f) => { p.arquivos[f.caminho] = assinaturaArquivo(f); });
    p.ultima = Object.assign({ quando: agora || new Date().toISOString() }, resultado);
    return p;
  }

  const API = { CAMPOS_PECAS, camposDe, pareceListaPecas, trocarEntidade, unidadeDe, decodificar, separador, lerCSV, ehDado, lerArquivo, dinheiro, numero, dataISO, ano, condicao, tipoDe, marcaDe, casarCatalogo, cabNorm, chaveTxt,
    CAMPOS, ROTULO, ENTIDADES, candidatos, acharCabecalho, mapear, assinatura, entidadeSugerida, prepararTabela, perfilDe, linhaParaRegistro, chaveLinha, hash,
    previa, contar, decidir, decidirTodos, gravar, desfazer, movimentosDepois, chavesFeitas, garantirDms, listaDe, mudados, registrarPasta, assinaturaArquivo, LIMITE_BYTES, LIMITE_LINHAS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  raiz.DMS = API;
})(typeof window !== 'undefined' ? window : globalThis);
