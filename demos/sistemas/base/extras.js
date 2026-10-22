// =============================================================
// Veltria · recursos comuns a todos os sistemas
// -------------------------------------------------------------
// 1. Link do cliente: cada sistema publica uma página que o cliente
//    final abre no celular (orçamento, cardápio, proposta, processo…)
//    e responde por ela. Na nuvem: tabelas nexo_links e
//    nexo_link_respostas. Na demonstração: os dados vão no próprio
//    link e a resposta volta para a aba do sistema.
// 2. Fotos e anexos de cada registro (nuvem: Storage nexo-anexos).
// 3. Modelos por ramo, aplicados ao começar ou em Configurações.
// 4. Primeiros passos no painel, para quem está começando.
// 5. Chave PIX da empresa (cobranças, sinal e mensalidades).
// 6. Alertas financeiros no painel (Financeiro e Gestão), com limites em Configurações.
// =============================================================
import { esc, ic, et, avisar, modal, confirmar, novoId, hoje, dataCurta, normal } from './nexo.js';
import { qrSVG } from './qr.js';
import { pixCopiaECola } from './pix.js';
import { alertasDoDia } from './resumos.js';

const raizSite = () => {
  const [antes] = location.pathname.split(/\/(?:demos|app)\//);
  return `${location.origin}${location.pathname.includes('/demos/') || location.pathname.includes('/app/') ? antes : ''}/`;
};
const b64url = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const tokenNovo = () => Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[b % 64]).join('');
const telLink = (t) => `https://wa.me/${String(t || '').replace(/\D/g, '') ? `55${String(t).replace(/\D/g, '').replace(/^55/, '')}` : ''}`;

export function prepararExtras(app, cfg) {
  const db = () => app.db;
  const links = () => (db().cfg.links ||= {});
  const tipos = { ...(cfg.portal || {}) };

  // ------------------------------------------------------------ PIX da empresa
  // na demonstração, uma chave de exemplo (domínio reservado, não recebe dinheiro) para o QR code aparecer
  const PIX_DEMO = 'pix-demonstracao@example.com';
  /** Dados do PIX para as páginas do cliente: { chave, nome, cidade, demo } ou null */
  app.pixDados = () => {
    const p = db().cfg.pix || {};
    if (p.chave) return { chave: p.chave, nome: p.nome || app.empresa, cidade: p.cidade || 'BRASIL' };
    return app.nuvem ? null : { chave: PIX_DEMO, nome: app.empresa, cidade: 'BRASIL', demo: true };
  };
  app.pix = (valor, txid, descricao) => { const p = app.pixDados(); return p ? pixCopiaECola({ ...p, valor, txid, descricao }) : ''; };
  app.temPix = () => !!db().cfg.pix?.chave || !app.nuvem;
  /** Pede a chave PIX na hora em que ela faz falta. Devolve true se ficou configurada. */
  app.pedirPix = async (motivo = 'Para o cliente pagar pelo PIX, cadastre a chave da empresa.') => {
    if (db().cfg.pix?.chave) return true;
    if (!app.nuvem) return true;
    const r = await modal({ titulo: 'Chave PIX da empresa', largura: 460, corpo: `<p class="mute-2" style="margin-bottom:10px">${esc(motivo)} O dinheiro cai direto na sua conta: o sistema só monta o código do PIX.</p><form class="form-grade" data-pix-rapido><label class="campo largo">Chave PIX<input name="chave" required placeholder="CNPJ, e-mail, celular ou chave aleatória"></label><label class="campo">Nome do recebedor<input name="nome" value="${esc(app.empresa)}" maxlength="25"></label><label class="campo">Cidade<input name="cidade" maxlength="15"></label></form>`,
      botoes: [{ rotulo: 'Agora não', valor: null, classe: 'fant' }, { rotulo: 'Salvar chave', classe: 'pri', acao: (f) => { const d = Object.fromEntries(new FormData(f.querySelector('form'))); if (!d.chave.trim() || !pixCopiaECola({ chave: d.chave, nome: d.nome })) { avisar('Chave PIX inválida', { tipo: 'erro' }); return false; } return d; } }] });
    if (!r) return false;
    db().cfg.pix = r; db().gravar(); avisar('Chave PIX salva'); republicar(); return true;
  };

  // ------------------------------------------------------------ 1. link do cliente
  const assinadas = (() => { try { return JSON.parse(localStorage.getItem('nexo-assinadas') || '{}'); } catch { return {}; } })();
  async function urlAnexo(a) {
    if (a.data) return a.data;
    if (!a.path || !app.nuvem) return '';
    const m = assinadas[a.path];
    if (m && m.ate > Date.now() + 7 * 864e5) return m.url;
    const { data } = await app.sessao.sb.storage.from('nexo-anexos').createSignedUrl(a.path, 30 * 86400);
    if (!data?.signedUrl) return '';
    assinadas[a.path] = { url: data.signedUrl, ate: Date.now() + 30 * 864e5 };
    try { localStorage.setItem('nexo-assinadas', JSON.stringify(assinadas)); } catch { /* ok */ }
    return data.signedUrl;
  }
  /** fotos de um registro prontas para a página do cliente (só imagens) */
  const fotosPublicas = async (reg, max = 12) => Promise.all((reg?._anexos || []).filter((x) => /^image\//.test(x.tipo)).slice(0, max).map(async (x) => ({ url: await urlAnexo(x), legenda: x.legenda || '' })));

  const publicados = new Map();
  async function montarDados(tipo, ref) {
    const t = tipos[tipo]; if (!t) return null;
    const d = await t.montar(app, ref, { fotos: fotosPublicas });
    if (!d) return null;
    return { ...d, _empresa: { nome: app.empresa, telefone: db().cfg.telefone || '', cor: cfg.cor, produto: cfg.id, sistema: cfg.nome, pro: !!app.sessao?.pro, logo: '', endereco: db().cfg.endereco || '' } };
  }
  async function publicar(chave, forcar = false) {
    if (!app.nuvem) return;
    const token = links()[chave]; if (!token) return;
    const [tipo, ...r] = chave.split(':'); const ref = r.join(':');
    const dados = await montarDados(tipo, ref);
    if (!dados) return;
    const j = JSON.stringify(dados);
    if (!forcar && publicados.get(chave) === j) return;
    const { error } = await app.sessao.sb.from('nexo_links').upsert({ token, espaco: app.sessao.espaco.id, tipo, ref, dados, ativo: true, atualizado: new Date().toISOString() }, { onConflict: 'token' });
    if (!error) publicados.set(chave, j);
  }
  let tPub;
  const republicar = () => { clearTimeout(tPub); tPub = setTimeout(() => Object.keys(links()).forEach((k) => publicar(k)), 2500); };

  app.portal = {
    tipos,
    registrar: (tipo, def) => { tipos[tipo] = def; },
    /** Link público do cliente para (tipo, ref). Cria na primeira vez. */
    async link(tipo, ref = '', { curto = false } = {}) {
      const chave = `${tipo}:${ref}`;
      if (!links()[chave]) { links()[chave] = tokenNovo(); db().gravar(); }
      const token = links()[chave];
      if (app.nuvem) { await publicar(chave, true); return `${raizSite()}c/#${token}`; }
      const dados = await montarDados(tipo, ref), pacote = JSON.stringify({ tipo, app: cfg.id, token, dados, demo: true });
      // demonstração: os dados vão no próprio link; para QR code, uma versão curta lida deste navegador
      try { localStorage.setItem(`nexo-portal-demo-${token}`, pacote); } catch { /* sem espaço */ }
      return curto ? `${raizSite()}c/#t=${token}` : `${raizSite()}c/#d=${b64url(pacote)}`;
    },
    /** Janela para copiar, mandar no WhatsApp ou mostrar o QR code do link. */
    async compartilhar(tipo, ref = '', { titulo = 'Link do cliente', telefone = '', texto = '', qr = false } = {}) {
      const url = await this.link(tipo, ref);
      const msg = `${texto ? `${texto}\n` : ''}${url}`;
      // QR code: na demonstração usa o link curto (os dados completos não cabem num QR)
      let qrHTML = '';
      if (qr) { try { qrHTML = qrSVG(app.nuvem ? url : await this.link(tipo, ref, { curto: true }), 220); } catch { qrHTML = ''; } }
      modal({ titulo, largura: 520, corpo: `<div class="col" style="gap:12px">
        <p class="mute-2" style="font-size:13.5px">${esc(tipos[tipo]?.explica || 'O cliente abre no celular, sem baixar nada e sem senha.')}</p>
        <div class="flex"><input readonly value="${esc(url)}" data-link style="flex:1;font-size:12.5px"><button type="button" class="btn" data-copiar>${ic('copy')}Copiar</button></div>
        ${qrHTML ? `<div style="display:grid;place-items:center;padding:8px;background:#fff;border-radius:10px">${qrHTML}</div>${app.nuvem ? '' : '<p class="mute" style="font-size:12px;text-align:center">Na demonstração, este QR code abre só neste computador.</p>'}` : ''}
        ${app.nuvem ? '' : `<div class="dica">${ic('info')}<span>Na demonstração, o link abre neste navegador e a resposta do cliente aparece aqui no sistema. Na versão contratada, ele funciona no celular de qualquer cliente.</span></div>`}</div>`,
        aoAbrir: (f) => { f.querySelector('[data-copiar]').onclick = () => { navigator.clipboard?.writeText(url).catch(() => {}); avisar('Link copiado'); }; },
        botoes: [{ rotulo: 'Abrir', icone: 'arrow-square-out', classe: 'fant', acao: () => { window.open(url, '_blank', 'noopener'); return false; } },
          { rotulo: 'Enviar no WhatsApp', icone: 'whatsapp-logo', classe: 'pri', acao: () => { window.open(`${telLink(telefone)}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener'); return false; } }] });
      return url;
    },
    publicar: republicar,
  };

  async function aplicar(token, acao, dados, criado) {
    const chave = Object.keys(links()).find((k) => links()[k] === token);
    if (!chave) return;
    const [tipo, ...r] = chave.split(':'); const ref = r.join(':');
    const t = tipos[tipo]; if (!t?.responder) return;
    const msg = await t.responder(app, { acao, dados: dados || {}, ref, criado: criado || new Date().toISOString() });
    if (msg) { avisar(msg, { tempo: 6000 }); db().registrar(`portal:${chave}`, msg, { icone: 'bell-ringing', tom: 'acc' }); }
    app.render(); if (document.querySelector('.gaveta.on')) app.reabrir();
    republicar();
  }
  if (app.nuvem) {
    const sb = app.sessao.sb, esp = app.sessao.espaco.id;
    const pendentes = async () => {
      const { data } = await sb.from('nexo_link_respostas').select('id').eq('espaco', esp).eq('aplicado', false).order('id').limit(50);
      for (const { id } of data || []) {
        const { data: tomada } = await sb.from('nexo_link_respostas').update({ aplicado: true }).eq('id', id).eq('aplicado', false).select('token,acao,dados,criado');
        if (tomada?.[0]) await aplicar(tomada[0].token, tomada[0].acao, tomada[0].dados, tomada[0].criado);
      }
    };
    setTimeout(pendentes, 1500);
    sb.channel(`nexo-portal-${esp}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nexo_link_respostas', filter: `espaco=eq.${esp}` }, () => setTimeout(pendentes, 300)).subscribe();
    db().ouvintes?.add((s) => { if (s === 'salvo') republicar(); });
  } else if ('BroadcastChannel' in window) {
    const canal = new BroadcastChannel(`nexo-demo-${cfg.id}`);
    canal.onmessage = (e) => { const m = e.data || {}; if (m.token) aplicar(m.token, m.acao, m.dados); };
  }

  // ------------------------------------------------------------ 2. fotos e anexos
  const reduzir = (arq, lado) => new Promise((ok, falha) => {
    const img = new Image(); const url = URL.createObjectURL(arq);
    img.onload = () => { const k = Math.min(1, lado / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob((b) => (b ? ok(b) : falha(new Error('imagem inválida'))), 'image/webp', 0.82); };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('imagem inválida')); };
    img.src = url;
  });
  const paraDataURL = (b) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); });
  app.anexos = {
    url: urlAnexo,
    fotos: fotosPublicas,
    /** seção de fotos e anexos para a ficha de um registro */
    html(colecao, id, { titulo = 'Fotos e anexos', dica = 'Fotos do celular ou PDF' } = {}) {
      const reg = db().obter(colecao, id); const l = reg?._anexos || [];
      return `<div class="gav-sec"><div class="entre"><h4>${esc(titulo)} ${l.length ? `<span class="mute">${l.length}</span>` : ''}</h4><label class="btn peq">${ic('camera')}Adicionar<input type="file" accept="image/*,application/pdf" multiple hidden data-mudar="anexoEnviar" data-c="${colecao}" data-id="${id}"></label></div>
        ${l.length ? `<div class="anexos">${l.map((a) => `<figure class="anexo">${/^image\//.test(a.tipo) ? `<img alt="${esc(a.legenda || a.nome)}" data-anexo="${esc(colecao)}|${esc(id)}|${esc(a.id)}" data-acao="anexoVer" data-c="${colecao}" data-id="${id}" data-a="${a.id}">` : `<button type="button" class="anexo-pdf" data-acao="anexoVer" data-c="${colecao}" data-id="${id}" data-a="${a.id}">${ic('file-pdf')}<span class="corta">${esc(a.nome)}</span></button>`}<button type="button" class="anexo-x" data-acao="anexoApagar" data-c="${colecao}" data-id="${id}" data-a="${a.id}" aria-label="Apagar">${ic('x')}</button></figure>`).join('')}</div>` : `<p class="mute" style="font-size:12.5px">${esc(dica)}</p>`}</div>`;
    },
  };
  // preenche as miniaturas depois que a ficha aparece
  new MutationObserver(() => {
    document.querySelectorAll('img[data-anexo]:not([src])').forEach(async (img) => {
      img.setAttribute('src', 'data:image/gif;base64,R0lGODlhAQABAAAAACw=');
      const [c, id, aid] = img.dataset.anexo.split('|'); const a = (db().obter(c, id)?._anexos || []).find((x) => x.id === aid);
      if (a) img.src = await urlAnexo(a);
    });
  }).observe(document.body, { childList: true, subtree: true });

  /** Anexa fotos ou PDFs a um registro (botão de anexar e importação de planilha). Devolve { ok, enviados }. */
  app.anexarArquivos = async (colecao, id, arqs, { silencioso = false } = {}) => {
    const reg = db().obter(colecao, id); if (!reg) return { ok: false, enviados: 0 };
    const lista = [...(reg._anexos || [])];
    if (!app.nuvem && lista.length + arqs.length > 6) { if (!silencioso) avisar('Na demonstração, até 6 fotos por registro.', { tipo: 'erro' }); arqs = arqs.slice(0, Math.max(0, 6 - lista.length)); }
    let enviados = 0;
    for (const f of arqs) {
      try {
        const img = /^image\//.test(f.type);
        if (!img && f.type !== 'application/pdf') { if (!silencioso) avisar(`${f.name}: só fotos ou PDF`, { tipo: 'erro' }); continue; }
        const blob = img ? await reduzir(f, app.nuvem ? 1600 : 900) : f;
        if (blob.size > 5 * 1024 * 1024) { if (!silencioso) avisar(`${f.name}: maior que 5 MB`, { tipo: 'erro' }); continue; }
        const a = { id: novoId(), nome: f.name || 'foto', tipo: img ? 'image/webp' : f.type, criado: hoje() };
        if (app.nuvem) {
          a.path = `${app.sessao.espaco.id}/${colecao}/${id}/${a.id}.${img ? 'webp' : 'pdf'}`;
          const { error } = await app.sessao.sb.storage.from('nexo-anexos').upload(a.path, blob, { contentType: a.tipo, upsert: false });
          if (error) throw error;
        } else {
          if (!img) { if (!silencioso) avisar('Na demonstração, só fotos (PDF na versão contratada).', { tipo: 'erro' }); continue; }
          a.data = await paraDataURL(blob);
        }
        lista.push(a); enviados++;
      } catch (e) { if (!silencioso) avisar(`Não foi possível enviar ${f.name}: ${e.message || e}`, { tipo: 'erro' }); }
    }
    try { db().salvar(colecao, { id, _anexos: lista }); } catch { if (!silencioso) avisar('Sem espaço no navegador para mais fotos (demonstração).', { tipo: 'erro' }); return { ok: false, enviados: 0 }; }
    return { ok: true, enviados };
  };

  Object.assign(app.acoes, {
    anexoEnviar: async (d, el) => {
      const arqs = [...(el.files || [])]; if (!arqs.length) return;
      avisar(arqs.length > 1 ? `Enviando ${arqs.length} arquivos…` : 'Enviando…', { tempo: 2000 });
      const r = await app.anexarArquivos(d.c, d.id, arqs);
      if (!r.ok) return;
      avisar('Anexos salvos'); app.render(); app.reabrir(); republicar();
    },
    anexoVer: async (d) => {
      const a = (db().obter(d.c, d.id)?._anexos || []).find((x) => x.id === d.a); if (!a) return;
      const url = await urlAnexo(a);
      if (!/^image\//.test(a.tipo)) { window.open(url, '_blank', 'noopener'); return; }
      modal({ titulo: a.legenda || a.nome, largura: 900, corpo: `<img src="${esc(url)}" alt="" style="width:100%;border-radius:8px;display:block"><label class="campo" style="margin-top:10px">Legenda (aparece para o cliente)<input data-leg value="${esc(a.legenda || '')}"></label>`,
        botoes: [{ rotulo: 'Fechar', valor: null, classe: 'fant' }, { rotulo: 'Salvar legenda', classe: 'pri', acao: (f) => { const reg = db().obter(d.c, d.id); db().salvar(d.c, { id: d.id, _anexos: reg._anexos.map((x) => (x.id === d.a ? { ...x, legenda: f.querySelector('[data-leg]').value } : x)) }); republicar(); app.reabrir(); return null; } }] });
    },
    anexoApagar: async (d) => {
      if (!(await confirmar('Apagar este anexo?', { rotulo: 'Apagar', perigo: true }))) return;
      const reg = db().obter(d.c, d.id); const a = (reg._anexos || []).find((x) => x.id === d.a);
      if (a?.path && app.nuvem) await app.sessao.sb.storage.from('nexo-anexos').remove([a.path]);
      db().salvar(d.c, { id: d.id, _anexos: (reg._anexos || []).filter((x) => x.id !== d.a) }); app.render(); app.reabrir(); republicar();
    },
  });

  // ------------------------------------------------------------ 3. modelos por ramo
  app.modelos = cfg.modelos || [];
  app.aplicarModelo = (id, silencioso = false) => {
    const m = app.modelos.find((x) => x.id === id); if (!m) return 0;
    let n = 0;
    for (const [col, itens] of Object.entries(m.dados || {})) {
      const atuais = db().lista(col);
      for (const it of itens) { if (atuais.some((x) => normal(x.nome || '') === normal(it.nome || ''))) continue; db().salvar(col, { ...it }); n++; }
    }
    db().cfg.ramo = id; m.aoAplicar?.(app); db().gravar();
    if (!silencioso) avisar(`Modelo "${m.nome}" aplicado${n ? `: ${n} itens cadastrados` : ''}`);
    return n;
  };

  // ------------------------------------------------------------ 4. primeiros passos
  app.passosHTML = () => {
    const c = db().cfg;
    if (c.passos_ocultos) return '';
    const comuns = [
      { id: 'empresa', rot: 'Coloque o nome, telefone e endereço da empresa', feito: !!c.empresa_ok, href: '#/config' },
      app.modelos.length ? { id: 'ramo', rot: 'Escolha o modelo do seu ramo', feito: !!c.ramo, href: '#/config' } : null,
      ...(cfg.passos ? cfg.passos(app) : []),
      { id: 'link', rot: 'Mande o primeiro link para um cliente', feito: Object.keys(c.links || {}).length > 0 },
      app.nuvem ? { id: 'equipe', rot: 'Convide alguém da equipe', feito: !!c.convidou, href: '#/config' } : null,
      { id: 'resumo', rot: 'Receba o resumo do dia no WhatsApp', feito: !!c.whats_dono || !!c.resumo?.ativo, acao: 'resumoDia' },
    ].filter(Boolean);
    const feitos = comuns.filter((p) => p.feito).length;
    if (feitos === comuns.length) return '';
    return `<div class="cartao passos nao-imprime"><div class="cartao-cab"><div><h3>Primeiros passos</h3><div class="sub">${feitos} de ${comuns.length} · leva poucos minutos e deixa o ${esc(cfg.nome)} com a cara da sua empresa</div></div><button type="button" class="btn fant peq" data-acao="ocultarPassos">Ocultar</button></div>
      <div class="passos-barra"><i style="width:${(feitos / comuns.length) * 100}%"></i></div>
      <ol class="passos-lista">${comuns.map((p) => `<li class="${p.feito ? 'feito' : ''}">${ic(p.feito ? 'check-circle' : 'circle')}${p.href && !p.feito ? `<a href="${p.href}">${esc(p.rot)}</a>` : p.acao && !p.feito ? `<a href="#" data-acao="${p.acao}">${esc(p.rot)}</a>` : `<span>${esc(p.rot)}</span>`}</li>`).join('')}</ol></div>`;
  };
  app.acoes.ocultarPassos = () => { db().cfg.passos_ocultos = true; db().gravar(); app.render(); };

  // ------------------------------------------------------------ alertas financeiros (regras em resumos.js)
  const temAlertas = ['financeiro', 'gestao', 'farmacia'].includes(cfg.id);
  app.cartaoAlertas = () => {
    if (!temAlertas) return '';
    const l = alertasDoDia(cfg.id, db().dados, hoje());
    const cab = `<div class="cartao-cab"><div><h3>Alertas</h3><div class="sub">O sistema vigia margem, caixa, atrasos e gastos fora do padrão</div></div><a class="btn peq" href="#/config">Ajustar limites</a></div>`;
    if (!l.length) return `<div class="cartao alertas-card">${cab}<div class="cartao-corpo"><div class="dica">${ic('check-circle')}<span>Nenhum alerta hoje. Margem, caixa e recebimentos dentro do combinado.</span></div></div></div>`;
    return `<div class="cartao alertas-card">${cab}<ul class="lista">${l.map((x) => `<li><span class="av p" style="background:var(--${x.nivel === 'alto' ? 'er' : 'al'})">${ic(x.nivel === 'alto' ? 'warning' : 'warning-circle', 'p')}</span><div class="cresce"><div class="t">${esc(x.titulo)}</div><div class="s">${esc(x.acao)}</div></div></li>`).join('')}</ul></div>`;
  };
  Object.assign(app.acoes, {
    salvarAlertas: () => { const f = document.querySelector('[data-form-alertas]'); const d = Object.fromEntries(new FormData(f)); const n = (v) => Math.max(0, Number(String(v || '0').replace(/\./g, '').replace(',', '.')) || 0); db().cfg.alertas = { margem_min: n(d.margem_min), saldo_min: n(d.saldo_min), meta_receita: n(d.meta_receita) }; db().gravar(); avisar('Limites dos alertas salvos'); app.render(); },
  });

  // ------------------------------------------------------------ cartões em Configurações
  app.extrasConfig = (a) => {
    const p = db().cfg.pix || {};
    const pixCard = `<div class="cartao"><div class="cartao-cab"><div><h3>PIX da empresa</h3><div class="sub">Usado nas cobranças, no sinal e nos links de pagamento</div></div>${p.chave ? et('Configurado', 'ok') : ''}</div><div class="cartao-corpo"><form class="form-grade" data-form-pix>
      <label class="campo largo">Chave PIX<input name="chave" value="${esc(p.chave || '')}" placeholder="CNPJ, e-mail, celular ou chave aleatória"></label>
      <label class="campo">Nome do recebedor<input name="nome" value="${esc(p.nome || a.empresa)}" maxlength="25"></label><label class="campo">Cidade<input name="cidade" value="${esc(p.cidade || '')}" maxlength="15"></label>
      <div class="campo largo" style="flex-direction:row;justify-content:flex-end"><button type="button" class="btn pri" data-acao="salvarPix">Salvar</button></div></form></div></div>`;
    const ramos = app.modelos.length ? `<div class="cartao"><div class="cartao-cab"><div><h3>Modelo do seu ramo</h3><div class="sub">Cadastra serviços, produtos e etapas típicos do seu tipo de negócio</div></div></div><ul class="lista">${app.modelos.map((m) => `<li><div class="cresce"><div class="t">${esc(m.nome)} ${db().cfg.ramo === m.id ? et('Em uso', 'ok') : ''}</div><div class="s">${esc(m.desc || '')}</div></div><button type="button" class="btn peq" data-acao="aplicarModelo" data-m="${m.id}">Aplicar</button></li>`).join('')}</ul></div>` : '';
    const al = { margem_min: 15, saldo_min: 0, meta_receita: 0, ...(db().cfg.alertas || {}) };
    const alertasCard = temAlertas ? `<div class="cartao"><div class="cartao-cab"><div><h3>Limites dos alertas</h3><div class="sub">Quando passar destes números, o painel e o resumo diário avisam</div></div></div><div class="cartao-corpo"><form class="form-grade" data-form-alertas>
      <label class="campo">${cfg.id !== 'financeiro' ? 'Margem bruta' : 'Margem líquida'} mínima (%)<input name="margem_min" inputmode="decimal" value="${esc(String(al.margem_min).replace('.', ','))}"></label>
      ${cfg.id === 'financeiro' ? `<label class="campo">Saldo mínimo em caixa (R$)<input name="saldo_min" inputmode="decimal" value="${esc(String(al.saldo_min))}"></label>` : ''}
      <label class="campo">Meta de ${cfg.id !== 'financeiro' ? 'vendas' : 'receita'} do mês (R$, 0 = sem meta)<input name="meta_receita" inputmode="decimal" value="${esc(String(al.meta_receita))}"></label>
      <div class="campo largo" style="flex-direction:row;justify-content:flex-end"><button type="button" class="btn pri" data-acao="salvarAlertas">Salvar</button></div></form></div></div>` : '';
    return pixCard + alertasCard + ramos;
  };
  Object.assign(app.acoes, {
    salvarPix: () => { const f = document.querySelector('[data-form-pix]'); const d = Object.fromEntries(new FormData(f)); if (d.chave && !pixCopiaECola({ chave: d.chave, nome: d.nome })) { avisar('Chave PIX inválida', { tipo: 'erro' }); return; } db().cfg.pix = d; db().gravar(); avisar('PIX salvo'); republicar(); app.render(); },
    aplicarModelo: async (d) => { const m = app.modelos.find((x) => x.id === d.m); if (await confirmar(`Aplicar o modelo "${m.nome}"? Os itens que você já tem continuam como estão.`, { rotulo: 'Aplicar' })) { app.aplicarModelo(d.m); app.render(); } },
  });
}

/** Etiqueta de quando o cliente respondeu pelo link (para listas e fichas). */
export const etPortal = (texto = 'Respondeu pelo link') => et(texto, 'info');
export { dataCurta };
