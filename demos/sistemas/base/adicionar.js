// =============================================================
// Veltria · botão "Adicionar" no topo de todas as páginas
// -------------------------------------------------------------
// Manual: o formulário da página (ou os atalhos do sistema).
// Automático:
//   - Importar do Excel ou CSV: abre a importação já apontada para
//     o cadastro da página.
//   - Colar texto: a IA lê (mensagem do WhatsApp, e-mail, lista) e
//     preenche o formulário para a pessoa conferir e salvar.
//   - Foto de nota ou boleto: a IA lê valor, vencimento, fornecedor…
// Na nuvem a leitura usa a função nexo-ia (ação "extrair"). Sem IA
// (demonstração, cota do dia acabou) o texto é lido por regras locais.
// Nada é salvo sem a pessoa ver o formulário, a não ser quando ela
// escolhe "criar todos" numa lista.
// =============================================================
import { esc, ic, avisar, modal, editar, pop, normal, hoje } from './nexo.js';

const NAO = new Set(['config', 'suporte', 'dono', 'importar']);
const camposDe = (app, nome) => { const c = app.colecoes?.[nome]; if (!c?.campos) return []; return (typeof c.campos === 'function' ? c.campos(app) : c.campos).filter((x) => x && x.nome && !x.oculto && x.tipo !== 'dias'); };
const editaveis = (app) => Object.entries(app.colecoes || {}).filter(([k, c]) => c?.singular && camposDe(app, k).length && !k.startsWith('_'));
const rotOpcoes = (c, app) => { let o = typeof c.opcoes === 'function' ? c.opcoes(app) : c.opcoes || []; return o.map((x) => (Array.isArray(x) ? [String(x[0]), String(x[1] ?? x[0])] : [String(x), String(x)])); };
const nomeReg = (app, colecao, r) => String(r?.nome ?? r?.titulo ?? r?.descricao ?? r?.numero ?? '');

function alvoDaPagina(app) {
  const p = app.pagina || {};
  if (p.colecao && app.colecoes?.[p.colecao]) return p.colecao;
  const ids = [...document.querySelectorAll('#conteudo [data-tabela]')].map((t) => app.tabelas?.[t.dataset.tabela]?.colecao).filter((c) => c && camposDe(app, c).length);
  return ids[0] || '';
}

// ------------------------------------------------------------ esquema enviado à IA (só nomes de campos e opções)
function esquema(app, colecao) {
  return camposDe(app, colecao).slice(0, 40).map((c) => {
    const s = { nome: c.nome, rotulo: String(c.rotulo || c.nome).slice(0, 60), tipo: c.tipo || 'texto' };
    if (c.tipo === 'selecao') s.opcoes = rotOpcoes(c, app).slice(0, 60).map(([v, r]) => (v === r ? v : `${v}=${r}`).slice(0, 80));
    if (c.tipo === 'relacao') s.opcoes = (app.db.lista(c.colecao) || []).slice(0, 150).map((r) => nomeReg(app, c.colecao, r).slice(0, 60)).filter(Boolean);
    return s;
  });
}

// ------------------------------------------------------------ do texto da IA (ou das regras) para os campos do formulário
const isoData = (v) => { const s = String(v || '').trim(); let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`; m = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/); if (!m) return ''; const a = m[3] ? (m[3].length === 2 ? `20${m[3]}` : m[3]) : hoje().slice(0, 4); return `${a}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; };
const numero = (v) => { if (typeof v === 'number') return isFinite(v) ? v : null; const s = String(v || '').replace(/[R$\s]/g, ''); if (!s) return null; const n = Number(/,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')); return isFinite(n) ? n : null; };
function normalizar(app, colecao, item) {
  const out = {}, faltas = [];
  for (const c of camposDe(app, colecao)) {
    const v = item?.[c.nome]; if (v == null || v === '') continue;
    if (['moeda', 'numero', 'porcentagem'].includes(c.tipo)) { const n = numero(v); if (n != null) out[c.nome] = c.tipo === 'moeda' ? Math.round(Math.abs(n) * 100) / 100 : n; }
    else if (c.tipo === 'data') { const d = isoData(v); if (d) out[c.nome] = d; }
    else if (c.tipo === 'hora') { const m = String(v).match(/(\d{1,2})[:h](\d{2})?/); if (m) out[c.nome] = `${m[1].padStart(2, '0')}:${m[2] || '00'}`; }
    else if (c.tipo === 'booleano') out[c.nome] = /^(s|sim|true|1|yes)/i.test(String(v));
    else if (c.tipo === 'selecao') { const o = rotOpcoes(c, app), alvo = normal(String(v)); const achou = o.find(([k, r]) => normal(k) === alvo || normal(r) === alvo) || o.find(([, r]) => normal(r).includes(alvo) || alvo.includes(normal(r))); if (achou) out[c.nome] = achou[0]; }
    else if (c.tipo === 'relacao') { const alvo = normal(String(v)); const r = (app.db.lista(c.colecao) || []).find((x) => normal(nomeReg(app, c.colecao, x)) === alvo) || (app.db.lista(c.colecao) || []).find((x) => { const n = normal(nomeReg(app, c.colecao, x)); return n && (n.includes(alvo) || alvo.includes(n)); }); if (r) out[c.nome] = r.id; else faltas.push(`${c.rotulo || c.nome}: "${String(v).slice(0, 40)}"`); }
    else out[c.nome] = String(v).trim().slice(0, c.tipo === 'texto-longo' ? 1500 : 300);
  }
  return { valores: out, faltas };
}

// ------------------------------------------------------------ leitura sem IA: regras simples (valor, data, telefone, e-mail, CPF/CNPJ, CEP)
function lerSemIA(app, colecao, texto) {
  const campos = camposDe(app, colecao), blocos = String(texto).split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const linhas = String(texto).split(/\n/).map((s) => s.trim()).filter(Boolean);
  const temDado = (l) => /\d{1,3}(?:\.\d{3})*,\d{2}|\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}|@/.test(l);
  const registros = blocos.length > 1 ? blocos : linhas.length > 1 && linhas.filter(temDado).length >= 2 ? linhas : [String(texto)];
  return registros.slice(0, 50).map((t) => {
    const it = {}; let resto = t;
    const tira = (re) => { const m = resto.match(re); if (m) resto = resto.replace(m[0], ' '); return m; };
    const email = tira(/[\w.+-]+@[\w-]+\.[\w.]+/), doc = tira(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b|\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/), cep = tira(/\b\d{5}-\d{3}\b/);
    const tel = tira(/\(?\b\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/), valor = tira(/R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\b\d{1,3}(?:\.\d{3})*,\d{2}\b/), data = tira(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/), hora = tira(/\b\d{1,2}[:h]\d{2}\b/);
    resto = resto.replace(/\b(nome|cliente|fornecedor|valor|vencimento|venc\.?|data|tel(efone)?|whats(app)?|e-?mail|cpf|cnpj|cep|hora)\s*[:-]/gi, ' ').replace(/\b(vence(ndo)?|vencimento|venc\.?|no valor de|valor de|valor|pagar at[eé]|at[eé] o dia|dia)\b/gi, ' ').replace(/[;|•\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().replace(/[\s,.\-–:]+(de|em|no|na|para|e)?$/i, '').trim();
    for (const c of campos) {
      if (it[c.nome] != null) continue;
      if (c.tipo === 'moeda' && valor) it[c.nome] = valor[0];
      else if (c.tipo === 'data' && data) it[c.nome] = data[0];
      else if (c.tipo === 'hora' && hora) it[c.nome] = hora[0];
      else if (c.tipo === 'tel' && tel) it[c.nome] = tel[0];
      else if (c.tipo === 'email' && email) it[c.nome] = email[0];
      else if (/doc|cpf|cnpj/i.test(c.nome) && doc) it[c.nome] = doc[0];
      else if (/^cep$/i.test(c.nome) && cep) it[c.nome] = cep[0];
    }
    const principal = campos.find((c) => /^(nome|descricao|titulo|equipamento|servico|produto)$/.test(c.nome) && ['texto', 'texto-longo'].includes(c.tipo || 'texto')) || campos.find((c) => (c.tipo || 'texto') === 'texto');
    if (principal && resto) it[principal.nome] = resto.slice(0, 120);
    return it;
  });
}

// ------------------------------------------------------------ IA (nuvem)
async function lerComIA(app, colecao, { texto = '', imagem = '', mime = '' }) {
  const col = app.colecoes[colecao];
  const r = await app.sessao.funcao('nexo-ia', { acao: 'extrair', destino: `${col.singular} (${col.plural || col.singular})`, campos: esquema(app, colecao), texto: texto.slice(0, 8000), imagem, mime, hoje: hoje() });
  if (r?.erro) throw new Error(r.erro);
  return { itens: Array.isArray(r?.itens) ? r.itens : [], restantes: r?.restantes };
}

// reduz a foto antes de mandar (até 1600 px, JPEG): fica leve e a IA lê igual
const reduzirFoto = (arq) => new Promise((ok, falha) => {
  const img = new Image(), url = URL.createObjectURL(arq);
  img.onload = () => { const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', 0.82).split(',')[1]); };
  img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('Não consegui abrir essa imagem')); };
  img.src = url;
});
const paraBase64 = (arq) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(arq); });

export function prepararAdicionar(app, cfg) {
  const criar = async (colecao, valores = {}) => {
    const fn = app.criarCom?.[colecao];
    const r = fn ? await fn(valores) : await editar(app, colecao, null, valores);
    if (r) app.render();
    return r;
  };
  const criarDireto = (colecao, valores) => {
    const col = app.colecoes[colecao];
    // o que o formulário preencheria sozinho (padrão de cada campo) vale também para quem cria vários de uma vez
    const padroes = Object.fromEntries(camposDe(app, colecao).filter((c) => c.padrao !== undefined && valores[c.nome] == null).map((c) => [c.nome, typeof c.padrao === 'function' ? c.padrao(app) : c.padrao]));
    const base = { ...padroes, ...valores };
    if (camposDe(app, colecao).some((c) => c.obrigatorio && (base[c.nome] == null || base[c.nome] === '')) || col.validar?.(base, app, null)) return null;
    let dados = base; if (col.antesDeSalvar) dados = col.antesDeSalvar(dados, app, null) || dados;
    const s = app.db.salvar(colecao, dados); col.aoSalvar?.(s, app, true, null); app.db.registrar(`${colecao}:${s.id}`, 'Criado pelo preenchimento automático', { icone: 'sparkle' }); return s;
  };
  async function aplicar(colecao, itens, origem) {
    const lidos = itens.map((x) => normalizar(app, colecao, x)).filter((x) => Object.keys(x.valores).length);
    if (!lidos.length) { avisar(`Não achei dados de ${app.colecoes[colecao].singular} ${origem === 'foto' ? 'na foto' : 'no texto'}. Confira o tipo de cadastro ou preencha à mão.`, { tipo: 'erro', tempo: 7000 }); return; }
    const faltas = [...new Set(lidos.flatMap((x) => x.faltas))];
    if (faltas.length) avisar(`Não está cadastrado ainda: ${faltas.slice(0, 3).join(', ')}. Escolha no formulário ou crie pelo botão +.`, { tempo: 9000 });
    if (lidos.length === 1) return criar(colecao, lidos[0].valores);
    const col = app.colecoes[colecao];
    const r = await modal({ titulo: `Encontrei ${lidos.length} ${col.plural || col.singular}`, largura: 560,
      corpo: `<ul class="lista" style="margin:0 -20px;max-height:50vh;overflow:auto">${lidos.map((x) => `<li><div class="cresce"><div class="t corta">${esc(Object.values(x.valores).filter((v) => typeof v === 'string').slice(0, 2).join(' · ') || '—')}</div><div class="s corta">${esc(Object.entries(x.valores).slice(0, 5).map(([k, v]) => `${camposDe(app, colecao).find((c) => c.nome === k)?.rotulo || k}: ${v}`).join(' · '))}</div></div></li>`).join('')}</ul>`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Conferir um por um', valor: 'um', classe: 'fant' }, { rotulo: `Criar os ${lidos.length}`, valor: 'todos', classe: 'pri' }] });
    if (r === 'um') { for (const x of lidos) { if (!(await criar(colecao, x.valores))) break; } }
    else if (r === 'todos') { const gravar = app.db.gravar; app.db.gravar = () => {}; let n = 0; try { lidos.forEach((x) => { if (criarDireto(colecao, x.valores)) n++; }); } finally { app.db.gravar = gravar; } app.db.gravar(); avisar(`${n} ${n === 1 ? col.singular : col.plural || col.singular} ${n === 1 ? 'criado' : 'criados'}${n < lidos.length ? ` (${lidos.length - n} ficaram de fora por faltar dado obrigatório)` : ''}`); app.render(); }
  }
  const avisoIA = () => (app.nuvem ? `<div class="dica" style="margin-top:10px">${ic('info')}<span>O conteúdo vai para a IA (Google Gemini, ou a sua conta do Gemini ou do ChatGPT, se você conectou no assistente) só para ser lido. Você confere tudo antes de salvar.</span></div>` : `<div class="dica" style="margin-top:10px">${ic('info')}<span>Na demonstração o texto é lido por regras simples (valor, data, telefone, e-mail, CPF/CNPJ). Na versão contratada quem lê é a IA, que entende mensagens soltas, listas e fotos.</span></div>`);
  const seletor = (alvo) => `<label class="campo largo">Vai para<select data-ad-col>${editaveis(app).map(([k, c]) => `<option value="${k}" ${k === alvo ? 'selected' : ''}>${esc(String(c.plural || c.singular).replace(/^./, (x) => x.toUpperCase()))}</option>`).join('')}</select></label>`;

  Object.assign(app.acoes, {
    abrirAdicionar: (d, el) => {
      const p = app.pagina || {}, alvo = alvoDaPagina(app), col = app.colecoes?.[alvo], itens = [];
      if (p.novo) itens.push({ rotulo: `Preencher o formulário${col ? ` · ${col.singular}` : ''}`, icone: 'pencil-simple', acao: () => p.novo(app) });
      else if (col) itens.push({ rotulo: `${col.genero === 'f' ? 'Nova' : 'Novo'} ${col.singular} · formulário`, icone: 'pencil-simple', acao: () => criar(alvo) });
      (cfg.comandos || []).slice(0, 6).forEach((c) => itens.push({ rotulo: c.rot, icone: c.icone || 'plus', acao: () => c.acao(app) }));
      itens.push({ sep: true });
      if (!app.nuvem || app.sessao?.gestor) itens.push({ rotulo: 'Importar do Excel ou CSV', icone: 'table', acao: () => app.ir(`#/importar${alvo ? `/${alvo}` : ''}`) });
      itens.push({ rotulo: 'Colar texto · a IA preenche', icone: 'sparkle', acao: () => app.acoes.adColar({ c: alvo }) });
      itens.push({ rotulo: 'Foto de nota ou boleto · a IA lê', icone: 'camera', acao: () => app.acoes.adFoto({ c: alvo }) });
      pop(el, itens);
    },
    adColar: async (d) => {
      const alvo = d.c || alvoDaPagina(app) || editaveis(app)[0]?.[0];
      const r = await modal({ titulo: 'Colar texto e preencher sozinho', largura: 600,
        corpo: `<div class="form-grade">${seletor(alvo)}<label class="campo largo">Cole aqui<textarea data-ad-txt rows="8" style="min-height:170px" placeholder="Ex.: uma mensagem do WhatsApp com o pedido, o e-mail de um fornecedor, uma lista de clientes (um por linha)…"></textarea></label></div>${avisoIA()}`,
        botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Preencher', classe: 'pri', acao: (f) => { const t = f.querySelector('[data-ad-txt]').value.trim(); if (t.length < 3) { avisar('Cole um texto', { tipo: 'erro' }); return false; } return { c: f.querySelector('[data-ad-col]').value, t }; } }] });
      if (!r) return;
      let itens;
      if (app.nuvem && app.sessao?.funcao) {
        avisar('Lendo o texto…', { tempo: 2500 });
        try { const x = await lerComIA(app, r.c, { texto: r.t }); itens = x.itens; } catch (e) { avisar(`${e.message || 'A IA não respondeu'}. Usei a leitura simples.`, { tipo: 'erro', tempo: 6000 }); itens = lerSemIA(app, r.c, r.t); }
      } else itens = lerSemIA(app, r.c, r.t);
      await aplicar(r.c, itens, 'texto');
    },
    adFoto: async (d) => {
      const pref = ['lancamentos', 'contas_pagar', 'despesas', 'compras', 'notas', 'lancs'].find((k) => app.colecoes?.[k]);
      const alvo = d.c && camposDe(app, d.c).some((c) => c.tipo === 'moeda') ? d.c : pref || d.c || alvoDaPagina(app) || editaveis(app)[0]?.[0];
      const r = await modal({ titulo: 'Foto de nota fiscal, boleto ou recibo', largura: 560,
        corpo: `<div class="form-grade">${seletor(alvo)}<label class="campo largo">Foto ou PDF<input type="file" accept="image/*,application/pdf" capture="environment" data-ad-arq></label></div><p class="mute-2" style="font-size:12.5px;margin-top:8px">No celular, abre a câmera. A IA lê o valor, a data, o vencimento, o fornecedor e o que mais tiver no formulário.</p>${avisoIA()}`,
        botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Ler a foto', classe: 'pri', acao: (f) => { const a = f.querySelector('[data-ad-arq]').files?.[0]; if (!a) { avisar('Escolha a foto ou o PDF', { tipo: 'erro' }); return false; } return { c: f.querySelector('[data-ad-col]').value, a }; } }] });
      if (!r) return;
      if (!app.nuvem || !app.sessao?.funcao) { avisar('Na demonstração a foto não é lida (precisa da IA da versão contratada). Experimente "Colar texto": cole, por exemplo, "Conta de luz Cemig R$ 845,90 vence 15/11".', { tempo: 10000 }); return; }
      const pdf = r.a.type === 'application/pdf';
      if (pdf && r.a.size > 4e6) { avisar('PDF grande demais (até 4 MB)', { tipo: 'erro' }); return; }
      avisar('Lendo a foto…', { tempo: 3000 });
      try { const b64 = pdf ? await paraBase64(r.a) : await reduzirFoto(r.a); const x = await lerComIA(app, r.c, { imagem: b64, mime: pdf ? 'application/pdf' : 'image/jpeg' }); await aplicar(r.c, x.itens, 'foto'); }
      catch (e) { avisar(e.message || 'Não consegui ler a foto agora. Tente de novo ou preencha à mão.', { tipo: 'erro', tempo: 8000 }); }
    },
  });

  // o botão aparece no topo de cada página, antes das ações próprias dela
  const render = app.render;
  app.render = (...args) => {
    render(...args);
    const p = app.pagina, topo = document.getElementById('acoes-topo');
    if (!p || !topo || NAO.has(p.id) || p.semAdicionar || app.acesso?.(p.id) === 'ver' || app.acesso?.(p.id) === 'nenhum' || !editaveis(app).length) return;
    if (!topo.querySelector('[data-acao="abrirAdicionar"]')) topo.insertAdjacentHTML('afterbegin', `<button type="button" class="btn pri peq" data-acao="abrirAdicionar" aria-haspopup="menu">${ic('plus')}Adicionar${ic('caret-down', 'p')}</button>`);
  };
}
