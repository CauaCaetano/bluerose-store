// Tela "Trazer do meu sistema": a revenda traz sozinha os dados do sistema atual (DMS/ERP).
// Escolhe a pasta de exportação (ou os arquivos), confere as colunas, vê a PRÉVIA e grava em lote; cada importação pode
// ser desfeita. As regras ficam em dms.js; aqui só a tela, a leitura dos arquivos e a pasta lembrada (Chrome/Edge).
// Nada sai do aparelho além do que já é salvo no estado da revenda (mesmo caminho de sempre: anshur_salvar com conta).
(function (raiz) {
  const R = raiz.ANSHUR_AREAS, D = raiz.DMS; if (!R || !D) return;
  const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  const ICO = '<path d="M4 4h7l2 2h7v6M4 4v16h8M16 15v6M13 18l3 3 3-3"/>';
  let U = null;
  // estado desta tela (sobrevive a redesenhos; some ao recarregar a página)
  const S = { origem: null, tabelas: [], fora: [], semMudanca: [], lidos: [], previa: null, lendo: '', filtro: null, mostrar: 30, abertas: new Set(), handle: null, verificado: false };
  const esc = (s) => U.esc(s);
  const n = (v, um, varios) => `${v} ${v === 1 ? um : varios}`;
  const temPastaFS = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  const temPastaInput = () => typeof document !== 'undefined' && 'webkitdirectory' in document.createElement('input');
  const pode = () => ['dono', 'gerente'].includes(U.eu().perfil) && !U.somenteLeitura();
  const amb = () => (U.OP ? 'op' : 'demo') + (U.NV && U.NV.revenda ? ':' + U.NV.revenda.id : '');

  // ---------- pasta lembrada (IndexedDB do navegador; o handle não vai para o servidor) ----------
  const idb = (modo, fn) => new Promise((ok, erro) => {
    if (typeof indexedDB === 'undefined') { erro(new Error('sem IndexedDB')); return; }
    const req = indexedDB.open('anshur', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onerror = () => erro(req.error);
    req.onsuccess = () => { try { const tx = req.result.transaction('kv', modo), r = fn(tx.objectStore('kv')); tx.oncomplete = () => ok(r && r.result); tx.onerror = () => erro(tx.error); tx.onabort = () => erro(tx.error); } catch (e) { erro(e); } };
  });
  const chaveIdb = () => 'pasta-dms:' + amb();
  async function handleSalvo() { if (S.handle) return S.handle; try { S.handle = await idb('readonly', (st) => st.get(chaveIdb())) || null; } catch (e) { S.handle = null; } return S.handle; }
  async function lembrarHandle(h) { S.handle = h; try { await idb('readwrite', (st) => st.put(h, chaveIdb())); } catch (e) { /* navegador sem suporte: vale só nesta sessão */ } }
  async function permissao(h, pedir) {
    if (!h || typeof h.queryPermission !== 'function') return 'granted';
    let p = await h.queryPermission({ mode: 'read' });
    if (p !== 'granted' && pedir) p = await h.requestPermission({ mode: 'read' });
    return p;
  }
  // percorre a pasta e as subpastas (até 6 níveis, 3.000 arquivos); pastas ocultas e temporárias ficam de fora
  async function listarHandle(h, pre = '', out = [], prof = 0) {
    for await (const e of h.values()) {
      const cam = pre ? pre + '/' + e.name : e.name;
      if (e.kind === 'directory') { if (prof < 6 && !/^[.~$]/.test(e.name)) await listarHandle(e, cam, out, prof + 1); }
      else if (out.length < 3000) out.push({ caminho: cam, nome: e.name, ent: e });
    }
    return out;
  }
  const carregarXLSX = () => new Promise((ok) => {
    if (window.XLSX) { ok(window.XLSX); return; }
    const s = document.createElement('script'); s.src = XLSX_URL; s.onload = () => ok(window.XLSX || null); s.onerror = () => ok(null); document.head.appendChild(s);
  });
  const pausa = () => new Promise((r) => setTimeout(r, 0));

  const ctxPrevia = () => ({ ambiente: U.OP ? 'op' : 'demo', existentes: U.A.todasTrocas || U.A.trocas, catalogo: U.A.modelos, refDe: U.M.refDe, lojas: U.estado.lojas || [], anoMax: new Date().getFullYear(), hoje: U.hojeISO() });
  const pastaRegistro = () => (S.origem && S.origem.pasta ? (D.garantirDms(U.estado).pastas.find((p) => p.id === S.origem.id) || null) : null);
  function recalcular() { S.previa = S.tabelas.length ? D.previa(S.tabelas, U.estado, ctxPrevia()) : null; if (S.previa && (!S.filtro || !contaFiltro(S.filtro))) S.filtro = filtroInicial(); }

  // lista de arquivos (da pasta ou escolhidos) → só lê os que são dados e, numa pasta já sincronizada, só os que mudaram
  async function lerLista(lista, origem, aoMudar) {
    S.origem = origem; S.tabelas = []; S.fora = []; S.semMudanca = []; S.lidos = []; S.previa = null; S.mostrar = 30; S.filtro = null;
    const dados = [];
    lista.forEach((f) => { if (D.ehDado(f.nome)) dados.push(f); else S.fora.push({ caminho: f.caminho, motivo: /^~\$/.test(f.nome) ? 'arquivo temporário do Excel' : 'não é planilha nem texto exportado' }); });
    for (const f of dados) { if (!f.file && f.ent) { try { f.file = await f.ent.getFile(); } catch (e) { S.fora.push({ caminho: f.caminho, motivo: 'o navegador não deixou abrir', erro: true }); continue; } } if (f.file) { f.tamanho = f.file.size; f.modificado = f.file.lastModified; } }
    const prontos = dados.filter((f) => f.file);
    const pasta = pastaRegistro();
    const sep = pasta ? D.mudados(pasta, prontos) : { ler: prontos, iguais: [] };
    S.semMudanca = sep.iguais;
    let XLSX = null;
    if (sep.ler.some((f) => /\.(xlsx|xlsm|xls|ods)$/i.test(f.nome))) { S.lendo = 'Abrindo o leitor de Excel…'; if (aoMudar) aoMudar(); XLSX = await carregarXLSX(); }
    const perfis = D.garantirDms(U.estado).perfis;
    for (let i = 0; i < sep.ler.length; i++) {
      const f = sep.ler[i]; S.lendo = `Lendo ${f.caminho} (${i + 1} de ${sep.ler.length})…`; if (aoMudar) aoMudar(); await pausa();
      let r;
      try { r = D.lerArquivo({ nome: f.nome, caminho: f.caminho, bytes: f.tamanho > D.LIMITE_BYTES ? { byteLength: f.tamanho } : new Uint8Array(await f.file.arrayBuffer()), XLSX }); }
      catch (e) { r = { erro: 'não foi possível ler o arquivo' }; }
      S.lidos.push(f);
      if (r.tabelas) r.tabelas.forEach((t) => { const pt = D.prepararTabela(t, perfis); if (t.linhas.length - 1 > D.LIMITE_LINHAS) pt.cortada = true; S.tabelas.push(pt); });
      else S.fora.push({ caminho: f.caminho, motivo: r.erro || r.ignorado, erro: !!r.erro });
    }
    S.lendo = ''; recalcular();
  }

  // ---------- escolher a origem ----------
  async function escolherPastaFS() {
    let h;
    try { h = await window.showDirectoryPicker({ mode: 'read', id: 'anshur-dms' }); } catch (e) { if (e && e.name !== 'AbortError') U.toast('Não foi possível abrir a pasta.', true); return; }
    await lembrarHandle(h);
    await lerDaPasta(h, true);
  }
  async function lerDaPasta(h, pedir) {
    if (await permissao(h, pedir) !== 'granted') { U.toast('O navegador não liberou a leitura da pasta. Toque em "Sincronizar de novo" e permita.', true); return; }
    S.lendo = 'Procurando arquivos na pasta…'; desenhar();
    let lista;
    try { lista = await listarHandle(h); } catch (e) { S.lendo = ''; U.toast('A pasta não pôde ser lida (foi movida ou apagada?). Escolha de novo.', true); desenhar(); return; }
    await lerLista(lista, { tipo: 'pasta', pasta: true, id: 'fs:' + h.name, nome: h.name, fs: true }, desenhar);
    desenhar();
  }
  async function arquivosEscolhidos(input, comoPasta) {
    const fs = Array.from(input.files || []); input.value = '';
    if (!fs.length) return;
    let origem;
    if (comoPasta) { const raizNome = (fs[0].webkitRelativePath || '').split('/')[0] || 'pasta'; origem = { tipo: 'pasta', pasta: true, id: 'dir:' + raizNome, nome: raizNome }; }
    else origem = { tipo: 'arquivos', pasta: false, id: 'arquivos', nome: n(fs.length, 'arquivo escolhido', 'arquivos escolhidos') };
    const lista = fs.map((f) => ({ caminho: comoPasta && f.webkitRelativePath ? f.webkitRelativePath.split('/').slice(1).join('/') : f.name, nome: f.name, file: f }));
    await lerLista(lista, origem, desenhar); desenhar();
  }
  async function sincronizarDeNovo() {
    const h = await handleSalvo();
    if (h) { await lerDaPasta(h, true); return; }
    const inp = U.$('#dms-pasta-in'); if (inp) inp.click();
  }

  // ---------- gravar e desfazer ----------
  function gravar() {
    const p = S.previa, c = p && p.contagens; if (!c || !c.gravar) return;
    if (!pode()) { U.toast('Só o dono ou o gerente importam dados.', true); return; }
    U.confirmar(`Gravar ${n(c.gravar, 'registro', 'registros')}?`, `Entram ${n(c.novos, 'registro novo', 'registros novos')}${c.atualizados ? ` e ${n(c.atualizados, 'atualização', 'atualizações')}` : ''}. ${c.erros ? `${n(c.erros, 'linha com erro fica', 'linhas com erro ficam')} de fora. ` : ''}Antes de gravar o Anshur guarda um ponto de restauração: dá para desfazer esta importação inteira depois, num toque.`, 'Gravar', () => {
      const agora = new Date().toISOString();
      const lote = D.gravar(U.estado, p, { usuario: U.eu().nome, agora, origem: { tipo: S.origem.tipo, nome: S.origem.nome }, tabelas: S.tabelas,
        arquivos: S.tabelas.map((t) => ({ origem: t.origem, codificacao: t.codificacao, linhas: t.linhas.length - t.cabIdx - 1 })) });
      if (S.origem.pasta) D.registrarPasta(U.estado, S.origem, S.lidos.concat(S.semMudanca), { lidos: S.lidos.length, semMudanca: S.semMudanca.length, novos: c.novos, atualizados: c.atualizados, iguais: c.iguais, erros: c.erros, lote: lote.id }, agora);
      U.log('importacao', `Importação do sistema (${S.origem.nome}): ${n(lote.contagens.criados, 'registro novo', 'registros novos')}, ${n(c.atualizados, 'atualização', 'atualizações')}, ${n(c.erros, 'linha com erro', 'linhas com erro')}`, { ref: lote.id });
      U.salvar();
      try { sessionStorage.setItem('anshur-dms-feito', lote.id); } catch (e) { /* sem armazenamento */ }
      U.toast(`${n(c.gravar, 'registro gravado', 'registros gravados')}.`);
      limpar();
      setTimeout(() => U.K.recarregar(), 700); // pátio, histórico e avaliador passam a usar os dados novos
    });
  }
  // nada a gravar numa pasta: marca a sincronização (para a próxima ler só o que mudar)
  function concluirSemGravar() {
    const p = S.previa, c = p ? p.contagens : { iguais: 0, erros: 0 };
    if (S.origem && S.origem.pasta) { D.registrarPasta(U.estado, S.origem, S.lidos.concat(S.semMudanca), { lidos: S.lidos.length, semMudanca: S.semMudanca.length, novos: 0, atualizados: 0, iguais: c.iguais || 0, erros: c.erros || 0, lote: null }, new Date().toISOString()); U.salvar(); }
    U.toast('Tudo em dia: nada novo para gravar.'); limpar(); desenhar();
  }
  function limpar() { Object.assign(S, { origem: null, tabelas: [], fora: [], semMudanca: [], lidos: [], previa: null, lendo: '', filtro: null, mostrar: 30 }); S.abertas.clear(); }
  function desfazer(id) {
    const lote = D.garantirDms(U.estado).lotes.find((l) => l.id === id); if (!lote || lote.desfeito) return;
    const mov = D.movimentosDepois(U.estado, lote);
    U.confirmar('Desfazer esta importação?', `Saem ${n(lote.criados.length, 'registro que entrou', 'registros que entraram')} nela${lote.atualizados.length ? ` e ${n(lote.atualizados.length, 'registro alterado volta', 'registros alterados voltam')} ao que eram antes` : ''}.${mov ? ` Atenção: ${n(mov, 'lançamento feito depois', 'lançamentos feitos depois')} nessas máquinas (venda, preço, preparo ou custo) também ${mov === 1 ? 'sai' : 'saem'}.` : ''} O resto da revenda não muda.`, 'Desfazer', () => {
      const r = D.desfazer(U.estado, id, { usuario: U.eu().nome });
      if (!r.ok) { U.toast(r.motivo, true); return; }
      U.log('importacao', `Importação desfeita: ${n(r.removidos, 'registro removido', 'registros removidos')}, ${n(r.restaurados, 'restaurado', 'restaurados')}`, { ref: id });
      U.salvar(); U.toast('Importação desfeita.');
      try { sessionStorage.removeItem('anshur-dms-feito'); } catch (e) { /* sem armazenamento */ }
      setTimeout(() => U.K.recarregar(), 700);
    });
  }

  // ---------- desenho ----------
  const FILTROS = [['duplicado', 'Duplicados'], ['novo', 'Novos'], ['erro', 'Com erro'], ['igual', 'Já importados'], ['aviso', 'Com aviso'], ['ignorada', 'Ignorados']];
  const doFiltro = (f) => (S.previa ? S.previa.itens.filter((it) => (f === 'aviso' ? it.avisos && it.avisos.length && !['erro', 'ignorada'].includes(it.status) : it.status === f)) : []);
  const contaFiltro = (f) => doFiltro(f).length;
  const filtroInicial = () => (FILTROS.find(([f]) => contaFiltro(f)) || ['novo'])[0];
  const ENT_CURTO = { historico: 'Histórico (vendida)', estoque: 'Pátio', clientes: 'Cliente' };
  function descricao(it) {
    const r = it.reg;
    if (!r) return { t: it.origem, d: '' };
    if (it.ent === 'clientes') return { t: r.nome || r.documento || 'Cliente', d: [r.documento, r.cidade, r.telefone].filter(Boolean).join(' · ') };
    const t = [r.marca, r.modelo].filter(Boolean).join(' ') + (r.ano >= 1950 ? ' · ' + r.ano : '');
    const val = [r.pago > 0 ? U.real(r.pago) : '', r.vendido > 0 ? U.real(r.vendido) : ''].filter(Boolean).join(' → ');
    const dts = [r.entrada ? U.data(r.entrada) : '', r.saida ? U.data(r.saida) : ''].filter(Boolean).join(' → ');
    return { t: t || 'Máquina', d: [r.horas ? r.horas.toLocaleString('pt-BR') + ' h' : '', r.chassi || r.serie || '', val, dts].filter(Boolean).join(' · ') };
  }
  const ROT_DECISAO = { atualizar: 'Atualizar o que já existe', pular: 'Pular (não importar)', novo: 'Importar como novo' };
  function htmlItem(it) {
    const d = descricao(it), cls = { novo: 'ok', duplicado: 'dup', igual: 'igual', erro: 'erro', ignorada: 'igual' }[it.status] || '';
    return `<li class="dms-item ${cls}"><div class="dms-item-txt"><b>${esc(d.t)}${it.ent ? ` <span class="dms-ent">${esc(ENT_CURTO[it.ent] || '')}</span>` : ''}</b>${d.d ? `<span>${esc(d.d)}</span>` : ''}
      <small>${esc(it.origem)} · linha ${it.linha}</small>${it.motivo ? `<em class="${it.status === 'erro' ? 'neg' : ''}">${esc(it.motivo)}</em>` : ''}${it.avisos && it.avisos.length && it.status !== 'erro' ? `<em class="dms-aviso">${esc(it.avisos.join('; '))}</em>` : ''}</div>
      ${it.status === 'duplicado' ? `<div class="campo dms-decisao"><label for="dec-${it.n}">O que fazer</label><select id="dec-${it.n}" data-dec="${it.n}">${it.opcoes.map((o) => `<option value="${o}" ${it.decisao === o ? 'selected' : ''}>${ROT_DECISAO[o]}</option>`).join('')}</select></div>` : ''}</li>`;
  }
  function exemplos(t, i) {
    const out = [];
    for (let k = t.cabIdx + 1; k < t.linhas.length && out.length < 2; k++) {
      const v = t.linhas[k][i]; if (v === '' || v == null) continue;
      let s = String(v); if (typeof v === 'number' && ['entrada', 'saida'].includes(t.mapa[i]) && D.dataISO(v) !== 'invalida') s += ` (${U.data(D.dataISO(v))})`;
      out.push(s.length > 28 ? s.slice(0, 27) + '…' : s);
    }
    return out.join(' · ');
  }
  function htmlTabela(t, idx) {
    const rec = t.mapa.filter(Boolean).length, dados = Math.max(0, t.linhas.length - t.cabIdx - 1);
    const fonte = t.perfil ? '<span class="tag comprovado">perfil salvo reaplicado</span>' : t.semCab ? '<span class="tag declarado">sem cabeçalho: ordem da planilha modelo</span>' : '';
    const opts = (sel) => `<option value="">Não importar esta coluna</option>${D.CAMPOS.map(([k, r]) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${esc(r)}</option>`).join('')}`;
    return `<details class="dms-arq" data-tab="${idx}" ${S.abertas.has(t.origem) ? 'open' : ''}><summary><span class="dms-arq-nome"><b>${esc(t.origem)}</b>
        <small>${n(dados, 'linha', 'linhas')} · ${esc(t.codificacao)}${t.separador ? ' · separado por ' + esc(t.separador) : ''} · ${rec} de ${t.cab.length} colunas reconhecidas</small></span>${fonte}<span class="dms-arq-ent">${esc(D.ENTIDADES[t.entidade] || '')}</span></summary>
      <div class="dms-arq-corpo">
        ${t.cortada ? `<p class="nota-rodape neg">Arquivo muito grande: só as primeiras ${D.LIMITE_LINHAS.toLocaleString('pt-BR')} linhas entram. Exporte por período.</p>` : ''}
        <div class="dms-arq-op"><div class="campo"><label for="ent-${idx}">O que este arquivo traz</label><select id="ent-${idx}" data-ent="${idx}">${Object.entries(D.ENTIDADES).map(([k, r]) => `<option value="${k}" ${t.entidade === k ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></div>
          ${t.entidade !== 'clientes' && t.entidade !== 'ignorar' ? `<div class="campo"><label for="tp-${idx}">Categoria quando a linha não disser</label><select id="tp-${idx}" data-tp="${idx}"><option value="">Não preencher (a linha precisa dizer)</option>${Object.entries(U.NOMES).map(([k, r]) => `<option value="${k}" ${t.tipoPadrao === k ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></div>` : ''}</div>
        <p class="rot-campo" style="margin-top:14px">Colunas do arquivo e o campo do Anshur</p>
        <ul class="dms-mapa">${t.cab.map((h, i) => `<li class="${t.mapa[i] ? '' : 'sem'}"><div><b>${esc(h || 'Coluna ' + (i + 1))}</b><small>${esc(exemplos(t, i)) || 'vazia'}</small></div>
          <select aria-label="Campo do Anshur para a coluna ${esc(h || i + 1)}" data-col="${idx}:${i}">${opts(t.mapa[i])}</select></li>`).join('')}</ul>
        <p class="nota-rodape">O que você escolher aqui fica salvo como perfil desta exportação e volta sozinho na próxima importação ou sincronização.</p>
      </div></details>`;
  }
  function htmlPrevia() {
    const p = S.previa; if (!p) return '';
    const c = p.contagens;
    const kpi = (rot, val, exp, cls = '') => `<div class="kpi dms-kpi ${cls}"><span class="rot">${rot}</span><b class="val">${val}</b><span class="exp">${exp}</span></div>`;
    const lista = doFiltro(S.filtro), vis = lista.slice(0, S.mostrar);
    return `<section class="painel bloco" aria-labelledby="dms-pv"><div class="painel-cab"><h2 id="dms-pv">3. Prévia: nada foi gravado ainda</h2></div>
      <div class="kpis dms-kpis" aria-live="polite">
        ${kpi('Novos', c.novos, [c.historico ? n(c.historico, 'no histórico', 'no histórico') : '', c.estoque ? n(c.estoque, 'no pátio', 'no pátio') : '', c.clientes ? n(c.clientes, 'cliente', 'clientes') : ''].filter(Boolean).join(' · ') || 'nenhum', 'ok')}
        ${kpi('Atualizados', c.atualizados, 'registros que já existiam')}
        ${kpi('Duplicados', c.duplicados, c.duplicados ? `${c.pulados} ${c.pulados === 1 ? 'pulado' : 'pulados'}, você decide` : 'nenhum', c.duplicados ? 'dup' : '')}
        ${kpi('Com erro', c.erros, c.erros ? 'ficam de fora, veja o motivo' : 'nenhum', c.erros ? 'erro' : '')}
      </div>
      <p class="conta">${n(c.iguais, 'linha já estava', 'linhas já estavam')} no Anshur (não muda nada) · ${n(c.ignoradas, 'linha ignorada', 'linhas ignoradas')} (total, rodapé ou vazia)${c.avisos ? ` · ${n(c.avisos, 'linha com aviso', 'linhas com aviso')}` : ''}</p>
      <div class="dms-chips" role="group" aria-label="Filtrar a prévia">${FILTROS.map(([f, r]) => { const q = contaFiltro(f); return q ? `<button type="button" class="chip" data-filtro="${f}" aria-pressed="${S.filtro === f}">${r} <b>${q}</b></button>` : ''; }).join('')}</div>
      ${S.filtro === 'duplicado' && lista.length > 1 ? `<div class="acoes dms-todos"><span class="sub">Para todos os duplicados:</span><button class="btn btn-linha" type="button" data-todos="atualizar">Atualizar</button><button class="btn btn-linha" type="button" data-todos="pular">Pular</button><button class="btn btn-linha" type="button" data-todos="novo">Importar como novos</button></div>` : ''}
      <ul class="dms-lista">${vis.map(htmlItem).join('')}</ul>
      ${lista.length > vis.length ? `<button class="btn btn-linha" type="button" id="dms-mais">Mostrar mais ${Math.min(30, lista.length - vis.length)} de ${lista.length - vis.length}</button>` : ''}
      <div class="acoes dms-gravar">${c.gravar ? `<button class="btn btn-ouro" type="button" id="dms-gravar" ${pode() ? '' : 'disabled'}>Gravar ${n(c.gravar, 'registro', 'registros')}</button>` : `<button class="btn btn-ouro" type="button" id="dms-concluir">Nada novo: concluir</button>`}<button class="btn btn-linha" type="button" id="dms-cancelar">Cancelar</button></div>
      ${pode() ? '' : '<p class="nota-rodape">Só o dono ou o gerente gravam a importação.</p>'}</section>`;
  }
  function htmlLotes() {
    const lotes = D.garantirDms(U.estado).lotes.slice().reverse().slice(0, 12); if (!lotes.length) return '';
    let feito = null; try { feito = sessionStorage.getItem('anshur-dms-feito'); } catch (e) { /* sem armazenamento */ }
    return `<section class="painel bloco" aria-labelledby="dms-lt"><h2 id="dms-lt">Importações feitas</h2>
      <ul class="dms-lotes">${lotes.map((l) => { const c = l.contagens || {};
        return `<li class="${l.id === feito && !l.desfeito ? 'recente' : ''}"><div><b>${new Date(l.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · ${esc(l.origem && l.origem.nome || 'arquivos')}</b>
          <span>${n(l.criados.length, 'novo', 'novos')} · ${n(l.atualizados.length + Math.max(0, (c.atualizados || 0) - l.atualizados.length), 'atualizado', 'atualizados')} · ${n(c.erros || 0, 'linha com erro', 'linhas com erro')}${l.usuario ? ' · por ' + esc(l.usuario) : ''}</span>
          ${l.desfeito ? `<small>Desfeita em ${new Date(l.desfeito.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}${l.desfeito.usuario ? ' por ' + esc(l.desfeito.usuario) : ''}: ${n(l.desfeito.removidos, 'registro saiu', 'registros saíram')}.</small>` : ''}
          ${l.erros && l.erros.length && !l.desfeito ? `<details><summary>Linhas que ficaram de fora</summary><ul>${l.erros.slice(0, 15).map((e) => `<li>${esc(e.origem)}, linha ${e.linha}: ${esc(e.motivo)}</li>`).join('')}</ul></details>` : ''}</div>
          ${l.desfeito ? '<span class="tag declarado">Desfeita</span>' : pode() ? `<button class="btn btn-linha" type="button" data-desfazer="${esc(l.id)}">Desfazer esta importação</button>` : ''}</li>`; }).join('')}</ul></section>`;
  }
  function htmlOrigem() {
    const pastas = D.garantirDms(U.estado).pastas.slice().sort((a, b) => String(b.ultima && b.ultima.quando).localeCompare(String(a.ultima && a.ultima.quando)));
    const pasta = pastas[0], u = pasta && pasta.ultima;
    const fs = temPastaFS(), dir = temPastaInput();
    return `<section class="painel bloco" aria-labelledby="dms-or"><h2 id="dms-or">1. De onde vêm os dados</h2>
      <p class="sub" style="margin:6px 0 4px">Peça ao seu sistema para exportar o relatório de usados (vendas, trocas e estoque) e, se quiser, os clientes, em CSV, TXT ou Excel, numa pasta do computador. O Anshur lê a pasta inteira, inclusive as subpastas, e ignora o que não for planilha.</p>
      ${pasta ? `<div class="dms-pasta"><div><b>Pasta ligada: ${esc(pasta.nome)}</b><span>${u ? `Última sincronização ${new Date(u.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}: ${n(u.novos || 0, 'novo', 'novos')}, ${n(u.atualizados || 0, 'atualizado', 'atualizados')}, ${n(u.erros || 0, 'linha com erro', 'linhas com erro')} · ${n((u.lidos || 0), 'arquivo lido', 'arquivos lidos')}${u.semMudanca ? `, ${u.semMudanca} sem mudança` : ''}` : 'Ainda não sincronizada'}</span></div>
        <button class="btn btn-ouro" type="button" id="dms-sinc" ${S.lendo ? 'disabled' : ''}>Sincronizar de novo</button></div>` : ''}
      <div class="acoes">
        ${fs ? `<button class="btn ${pasta ? 'btn-linha' : 'btn-ouro'}" type="button" id="dms-pasta" ${S.lendo ? 'disabled' : ''}>${pasta ? 'Escolher outra pasta' : 'Escolher a pasta do sistema'}</button>` : ''}
        ${dir && fs ? '<input type="file" id="dms-pasta-in" webkitdirectory multiple class="sr" tabindex="-1" aria-hidden="true">' : ''}
        ${dir && !fs ? `<label class="btn ${pasta ? 'btn-linha' : 'btn-ouro'}">${pasta ? 'Escolher outra pasta' : 'Escolher a pasta do sistema'}<input type="file" id="dms-pasta-in" webkitdirectory multiple class="sr"></label>` : ''}
        <label class="btn btn-linha">Escolher arquivos<input type="file" id="dms-arq-in" multiple accept=".csv,.txt,.tsv,.xlsx,.xlsm,.xls,.ods,text/csv,text/plain" class="sr"></label>
      </div>
      <details class="dms-compat"><summary>O que funciona em cada navegador e os limites</summary><ul>
        <li><b>Chrome e Edge no computador:</b> você escolhe a pasta uma vez e o Anshur lembra. Ao abrir, ele confere sozinho se o sistema exportou algo novo; "Sincronizar de novo" lê só os arquivos que mudaram.</li>
        <li><b>Firefox, Safari e celular:</b> o navegador não deixa o site lembrar a pasta. Escolha a pasta${dir ? '' : ' (este navegador só permite escolher arquivos)'} ou os arquivos a cada vez; o Anshur grava só o que for novo, nunca duplica.</li>
        <li><b>Arquivos:</b> CSV e TXT separados por ponto e vírgula, vírgula, tabulação ou barra vertical, em UTF-8 ou Windows-1252 (Latin-1); Excel .xlsx, .xls e .ods (cada aba é lida separada; o leitor de Excel precisa de internet na primeira vez). TXT de colunas alinhadas por espaço, sem separador, não é reconhecido: exporte em CSV ou Excel.</li>
        <li><b>Limites:</b> até 30 MB por arquivo e ${D.LIMITE_LINHAS.toLocaleString('pt-BR')} linhas por aba; acima disso, exporte por período. Planilha com senha não abre: tire a senha no Excel e salve de novo.</li>
        <li><b>Privacidade:</b> os arquivos são lidos neste aparelho e não são enviados a ninguém. Só os registros que você gravar entram nos dados da revenda${U.NV ? ', guardados na conta da revenda como qualquer outro cadastro' : U.OP ? ', guardados neste navegador' : ' (demonstração: entram na revenda fictícia)'}.</li></ul></details></section>`;
  }
  function desenhar() {
    if (!U || !U.tela || !U.tela.querySelector('#dms-raiz')) return;
    const r = U.tela.querySelector('#dms-raiz');
    const temArq = S.tabelas.length || S.fora.length || S.semMudanca.length;
    r.innerHTML = `${htmlOrigem()}
      ${S.lendo ? `<div class="carregando-linha dms-lendo" role="status"><span class="giro"></span><b>${esc(S.lendo)}</b></div>` : ''}
      ${!S.lendo && temArq ? `<section class="painel bloco" aria-labelledby="dms-ar"><h2 id="dms-ar">2. Confira as colunas</h2>
        <p class="sub" style="margin:6px 0 12px">${esc(S.origem ? S.origem.nome : '')}: ${n(S.tabelas.length, 'tabela lida', 'tabelas lidas')}. O Anshur reconheceu as colunas pelo nome; abra um arquivo para conferir ou corrigir.</p>
        ${S.tabelas.map(htmlTabela).join('')}
        ${S.semMudanca.length ? `<p class="conta">${n(S.semMudanca.length, 'arquivo sem mudança', 'arquivos sem mudança')} desde a última sincronização (não ${S.semMudanca.length === 1 ? 'foi lido' : 'foram lidos'}): ${esc(S.semMudanca.slice(0, 6).map((f) => f.caminho).join(', '))}${S.semMudanca.length > 6 ? '…' : ''}</p>` : ''}
        ${S.fora.length ? `<div class="dms-fora"><p class="rot-campo">Fora da importação</p><ul>${S.fora.map((f) => `<li class="${f.erro ? 'neg' : ''}"><b>${esc(f.caminho)}</b>: ${esc(f.motivo)}</li>`).join('')}</ul></div>` : ''}
        ${!S.tabelas.length ? '<div class="acoes"><button class="btn btn-ouro" type="button" id="dms-concluir2">Concluir</button></div>' : ''}</section>` : ''}
      ${!S.lendo ? htmlPrevia() : ''}
      ${htmlLotes()}`;
    ligar(r);
  }
  function ligar(r) {
    const $ = (s) => r.querySelector(s), $$ = (s) => Array.from(r.querySelectorAll(s));
    const b = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
    b('#dms-pasta', escolherPastaFS); b('#dms-sinc', sincronizarDeNovo); b('#dms-gravar', gravar); b('#dms-concluir', concluirSemGravar); b('#dms-concluir2', concluirSemGravar);
    b('#dms-cancelar', () => { limpar(); desenhar(); });
    b('#dms-mais', () => { S.mostrar += 30; desenhar(); });
    const pi = $('#dms-pasta-in'); if (pi) pi.onchange = () => arquivosEscolhidos(pi, true);
    const ai = $('#dms-arq-in'); if (ai) ai.onchange = () => arquivosEscolhidos(ai, false);
    $$('details.dms-arq').forEach((d) => d.addEventListener('toggle', () => { const t = S.tabelas[+d.dataset.tab]; if (!t) return; if (d.open) S.abertas.add(t.origem); else S.abertas.delete(t.origem); }));
    $$('[data-ent]').forEach((s) => s.onchange = () => { const t = S.tabelas[+s.dataset.ent]; t.entidade = s.value; t.perfil = null; recalcular(); desenhar(); });
    $$('[data-tp]').forEach((s) => s.onchange = () => { const t = S.tabelas[+s.dataset.tp]; t.tipoPadrao = s.value; t.perfil = null; recalcular(); desenhar(); });
    $$('[data-col]').forEach((s) => s.onchange = () => {
      const [ti, ci] = s.dataset.col.split(':').map(Number), t = S.tabelas[ti];
      if (s.value) t.mapa.forEach((k, i) => { if (k === s.value && i !== ci) t.mapa[i] = null; }); // um campo, uma coluna
      t.mapa[ci] = s.value || null; t.origemMapa[ci] = 'manual'; t.perfil = null;
      if (t.entidade === 'ignorar') t.entidade = D.entidadeSugerida(t.mapa);
      recalcular(); desenhar();
    });
    $$('[data-filtro]').forEach((x) => x.onclick = () => { S.filtro = x.dataset.filtro; S.mostrar = 30; desenhar(); });
    $$('[data-dec]').forEach((s) => s.onchange = () => { D.decidir(S.previa, +s.dataset.dec, s.value); desenhar(); });
    $$('[data-todos]').forEach((x) => x.onclick = () => { D.decidirTodos(S.previa, x.dataset.todos); desenhar(); });
    $$('[data-desfazer]').forEach((x) => x.onclick = () => desfazer(x.dataset.desfazer));
  }
  function tela(ui) {
    U = ui;
    ui.tela.innerHTML = `<div class="titulo"><div><h1>Trazer do meu sistema</h1><p>Os dados do seu sistema atual (vendas de usados, trocas, estoque e clientes) entram no Anshur sem digitar nada. Você confere tudo antes de gravar e pode desfazer depois.</p></div></div>
      <div id="dms-raiz" class="dms"></div>`;
    desenhar();
  }

  // ao abrir o app (Chrome/Edge com a pasta já liberada): confere se o sistema exportou algo novo, sem gravar nada
  async function verificarAoAbrir(ui) {
    U = ui; if (S.verificado || !temPastaFS() || !pode()) return; S.verificado = true;
    const h = await handleSalvo(); if (!h) return;
    try { if (await permissao(h, false) !== 'granted') return; } catch (e) { return; }
    const pasta = D.garantirDms(U.estado).pastas.find((p) => p.id === 'fs:' + h.name);
    let lista; try { lista = await listarHandle(h); } catch (e) { return; }
    const dados = []; for (const f of lista.filter((x) => D.ehDado(x.nome))) { try { const fl = await f.ent.getFile(); dados.push({ caminho: f.caminho, tamanho: fl.size, modificado: fl.lastModified }); } catch (e) { /* segue */ } }
    if (pasta && !D.mudados(pasta, dados).ler.length) return;
    await lerLista(lista, { tipo: 'pasta', pasta: true, id: 'fs:' + h.name, nome: h.name, fs: true });
    const c = S.previa && S.previa.contagens;
    if (c && c.gravar) U.toast(`O seu sistema exportou ${n(c.gravar, 'registro novo ou alterado', 'registros novos ou alterados')} na pasta ${h.name}. Confira em Configurações › Trazer do meu sistema antes de gravar.`);
    desenhar();
  }

  R.registrar({ id: 'config', telas: { importar: tela }, permissoes: { importar: ['dono', 'gerente'] }, dados: { dms: ['perfis', 'lotes', 'pastas'] } });
  raiz.DMS_UI = { verificarAoAbrir, _estado: S };
})(typeof window !== 'undefined' ? window : globalThis);
