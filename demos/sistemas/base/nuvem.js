// =============================================================
// Linha Nexo · versão na nuvem (Supabase)
// -------------------------------------------------------------
// Entrada (e-mail e senha), escolha/criação da empresa ("espaço"),
// teste grátis de 7 dias, equipe com convites, importação de planilha
// e sincronização dos registros com o banco, inclusive em tempo real
// entre as pessoas da equipe. O sistema em si é o mesmo das
// demonstrações: só o Banco muda (BancoNuvem).
// Tabelas e regras de acesso: migração nexo_nuvem_espacos_e_registros.
// =============================================================
import { esc, ic, av, et, avisar, modal, confirmar, Banco, hoje, diasAte, dataCurta, normal, agrupar } from './nexo.js';

const SITE = 'https://bluerose-store.com/';
const SEP = '\u0001';

// ---------------------------------------------------------------- banco sincronizado
class BancoNuvem extends Banco {
  constructor(sb, espaco, uid, linhas) {
    const dados = { _ok: 1, _cfg: {}, _log: [] };
    for (const l of linhas) {
      if (l.colecao === '_cfg') dados._cfg = l.dados || {};
      else (dados[l.colecao] ||= []).push({ ...l.dados, id: l.id });
    }
    for (const [k, v] of Object.entries(dados)) if (Array.isArray(v)) v.sort((a, b) => String(b.criado || b.quando || b.data || '').localeCompare(String(a.criado || a.quando || a.data || '')));
    super(`nuvem-${espaco}`, null, dados);
    Object.assign(this, { sb, espaco, uid, t: null, enviando: false, ouvintes: new Set() });
    this.fotografar();
  }
  registrosAtuais() {
    const out = new Map();
    for (const [col, v] of Object.entries(this.dados)) {
      if (col === '_ok') continue;
      if (col === '_cfg') { out.set(`_cfg${SEP}cfg`, ['_cfg', 'cfg', v]); continue; }
      if (Array.isArray(v)) for (const x of v) if (x && x.id != null) out.set(`${col}${SEP}${x.id}`, [col, String(x.id), x]);
    }
    return out;
  }
  fotografar() { this.foto = new Map([...this.registrosAtuais()].map(([k, [, , x]]) => [k, JSON.stringify(x)])); }
  estado(s) { this.situacao = s; this.ouvintes.forEach((f) => f(s)); }
  gravar() { clearTimeout(this.t); this.estado('pendente'); this.t = setTimeout(() => this.enviar(), 450); }
  recomecar() { avisar('Na versão na nuvem não dá para apagar tudo por aqui.', { tipo: 'erro' }); }
  async enviar() {
    if (this.enviando) { this.gravar(); return; }
    this.enviando = true; this.estado('salvando');
    try {
      const atual = this.registrosAtuais(), ups = [], dels = [];
      for (const [k, [c, i, x]] of atual) { const j = JSON.stringify(x); if (this.foto.get(k) !== j) { const { id, ...resto } = c === '_cfg' ? { ...x } : x; ups.push({ k, j, linha: { espaco: this.espaco, colecao: c, id: i, dados: c === '_cfg' ? x : resto, atualizado: new Date().toISOString(), autor: this.uid } }); } }
      for (const k of this.foto.keys()) if (!atual.has(k)) dels.push(k.split(SEP));
      for (let n = 0; n < ups.length; n += 300) {
        const parte = ups.slice(n, n + 300);
        const { error } = await this.sb.from('nexo_registros').upsert(parte.map((u) => u.linha));
        if (error) throw error;
        parte.forEach((u) => this.foto.set(u.k, u.j));
      }
      for (const [c, l] of Object.entries(agrupar(dels, (d) => d[0]))) {
        const ids = l.map((d) => d[1]);
        for (let n = 0; n < ids.length; n += 150) {
          const { error } = await this.sb.from('nexo_registros').delete().eq('espaco', this.espaco).eq('colecao', c).in('id', ids.slice(n, n + 150));
          if (error) throw error;
        }
        ids.forEach((i) => this.foto.delete(`${c}${SEP}${i}`));
      }
      this.estado('salvo');
    } catch (e) {
      this.estado('erro');
      const rls = /row-level security|42501|permission/i.test(`${e.message} ${e.code}`);
      avisar(rls ? 'Não foi possível salvar: o período de teste terminou. Contrate para continuar usando.' : `Não foi possível salvar agora (${e.message || 'sem conexão'}). Vamos tentar de novo.`, { tipo: 'erro', tempo: 7000 });
      if (!rls) setTimeout(() => this.gravar(), 5000);
    } finally { this.enviando = false; }
  }
  /** mudança feita por outra pessoa da equipe (tempo real) */
  remoto(p) {
    if (p.eventType === 'DELETE') {
      const { colecao: c, id } = p.old || {}; if (!c) return false;
      const l = this.dados[c]; const i = Array.isArray(l) ? l.findIndex((x) => String(x.id) === String(id)) : -1;
      this.foto.delete(`${c}${SEP}${id}`);
      if (i >= 0) { l.splice(i, 1); return true; } return false;
    }
    const n = p.new; if (!n || n.autor === this.uid) return false;
    const k = `${n.colecao}${SEP}${n.id}`;
    if (n.colecao === '_cfg') { this.dados._cfg = n.dados; this.foto.set(k, JSON.stringify(n.dados)); return true; }
    const x = { ...n.dados, id: n.id }, l = (this.dados[n.colecao] ||= []);
    const i = l.findIndex((y) => String(y.id) === String(n.id));
    if (i >= 0) l[i] = x; else l.unshift(x);
    this.foto.set(k, JSON.stringify(x));
    return true;
  }
}

// ---------------------------------------------------------------- telas de entrada
function tela(cfg, conteudo) {
  document.body.innerHTML = `<div class="entrada" style="--acc:${cfg.cor}"><div class="entrada-caixa">
    <div class="marca" style="padding:0 0 18px"><div class="marca-ic">${ic(cfg.icone || 'squares-four')}</div><div><b>${esc(cfg.nome)}</b><small>${esc(cfg.sub)} · Blue Rose Express</small></div></div>
    ${conteudo}</div><p class="entrada-pe">Seus dados ficam guardados com segurança e só a sua equipe tem acesso. <a href="${SITE}privacidade.html" target="_blank" rel="noopener">Privacidade</a> · <a href="${SITE}termos.html" target="_blank" rel="noopener">Termos</a></p></div>`;
  const f = document.querySelector('.entrada form'); f?.querySelector('input')?.focus();
  return f;
}
const erroAuth = (e) => {
  const m = String(e?.message || e || '');
  if (/invalid login/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(m)) return 'Confirme o seu e-mail pelo link que enviamos antes de entrar.';
  if (/already registered|already been registered/i.test(m)) return 'Já existe uma conta com esse e-mail. Use "Entrar".';
  if (/password.*(6|characters)/i.test(m)) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (/rate limit|too many/i.test(m)) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  return m || 'Algo deu errado. Tente de novo.';
};

// entrar com o Google: o botão só aparece quando o Google está ligado no Supabase (Authentication → Providers)
let googleOk = null;
const googleLigado = (sb) => (googleOk ??= fetch(`${sb.supabaseUrl}/auth/v1/settings`, { headers: { apikey: sb.supabaseKey } })
  .then((r) => r.json()).then((j) => !!j.external?.google).catch(() => false));
const LOGO_G = '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

function telaConta(sb, cfg, modo = 'criar', aviso = '') {
  return new Promise((resolver) => {
    const titulos = { criar: ['Teste grátis por 7 dias', 'Crie sua conta. No próximo passo você cadastra o cartão: nada é cobrado nos 7 dias e dá para cancelar quando quiser.'], entrar: ['Entrar', 'Acesse o sistema da sua empresa.'], esqueci: ['Recuperar a senha', 'Enviamos um link para criar uma senha nova.'] };
    const [t, s] = titulos[modo];
    const f = tela(cfg, `<h1 class="entrada-t">${t}</h1><p class="entrada-s">${s}</p>${aviso ? `<div class="dica" style="margin-bottom:14px">${ic('info')}<span>${aviso}</span></div>` : ''}
      ${modo !== 'esqueci' ? `<div class="entrada-google" hidden><button type="button" class="btn btn-google">${LOGO_G}Continuar com o Google</button><p class="entrada-ou"><span>ou com e-mail e senha</span></p></div>` : ''}
      <form class="col" style="gap:12px" novalidate>
        ${modo === 'criar' ? '<label class="campo">Seu nome<input name="nome" autocomplete="name" required></label>' : ''}
        <label class="campo">E-mail<input name="email" type="email" autocomplete="email" required></label>
        ${modo !== 'esqueci' ? `<label class="campo">Senha<input name="senha" type="password" autocomplete="${modo === 'criar' ? 'new-password' : 'current-password'}" minlength="8" required>${modo === 'criar' ? '<span class="ajuda">Pelo menos 8 caracteres</span>' : ''}</label>` : ''}
        <p class="er-tx" data-erro role="alert" style="min-height:1em;font-size:13px"></p>
        <button class="btn pri" style="height:40px">${modo === 'criar' ? 'Criar conta e começar o teste' : modo === 'entrar' ? 'Entrar' : 'Enviar link'}</button>
      </form>
      <div class="entrada-links">${modo === 'criar' ? '<span>Já tem conta?</span> <a href="#" data-modo="entrar">Entrar</a>' : modo === 'entrar' ? '<a href="#" data-modo="esqueci">Esqueci a senha</a><span>·</span><a href="#" data-modo="criar">Criar conta grátis</a>' : '<a href="#" data-modo="entrar">Voltar para entrar</a>'}</div>`);
    document.querySelectorAll('[data-modo]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); telaConta(sb, cfg, a.dataset.modo).then(resolver); }));
    const gb = document.querySelector('.entrada-google');
    if (gb) googleLigado(sb).then((ok) => {
      if (!ok) return;
      gb.hidden = false;
      gb.querySelector('button').onclick = async (e) => {
        const b = e.currentTarget, erro = f.querySelector('[data-erro]'); b.disabled = true; erro.textContent = '';
        const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } } });
        if (error) { erro.textContent = erroAuth(error); b.disabled = false; }
      };
    });
    f.onsubmit = async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f)), erro = f.querySelector('[data-erro]'), btn = f.querySelector('button');
      if (!f.reportValidity()) return;
      btn.disabled = true; erro.textContent = '';
      try {
        if (modo === 'entrar') { const { data, error } = await sb.auth.signInWithPassword({ email: d.email.trim(), password: d.senha }); if (error) throw error; resolver(data.session); return; }
        if (modo === 'esqueci') { const { error } = await sb.auth.resetPasswordForEmail(d.email.trim(), { redirectTo: location.origin + location.pathname }); if (error) throw error; telaConta(sb, cfg, 'entrar', `Se existir uma conta com ${esc(d.email)}, o link para criar uma senha nova chega em alguns minutos.`).then(resolver); return; }
        const { data, error } = await sb.auth.signUp({ email: d.email.trim(), password: d.senha, options: { data: { nome: d.nome.trim() }, emailRedirectTo: location.origin + location.pathname } });
        if (error) throw error;
        if (data.session) { resolver(data.session); return; }
        tela(cfg, `<h1 class="entrada-t">Confirme o seu e-mail</h1><p class="entrada-s">Enviamos um link para <b>${esc(d.email)}</b>. Abra o link para ativar a conta e o seu teste de 7 dias começa na hora.</p><div class="dica">${ic('envelope-open')}<span>Não chegou? Confira a caixa de spam ou promoções.</span></div><div class="entrada-links"><a href="#" data-modo="entrar">Já confirmei, quero entrar</a></div>`);
        document.querySelector('[data-modo]').onclick = (e) => { e.preventDefault(); telaConta(sb, cfg, 'entrar').then(resolver); };
      } catch (ex) { erro.textContent = erroAuth(ex); btn.disabled = false; }
    };
  });
}
function telaNovaSenha(sb, cfg) {
  return new Promise((resolver) => {
    const f = tela(cfg, `<h1 class="entrada-t">Crie uma senha nova</h1><form class="col" style="gap:12px" novalidate><label class="campo">Senha nova<input name="senha" type="password" autocomplete="new-password" minlength="8" required></label><p class="er-tx" data-erro role="alert" style="min-height:1em;font-size:13px"></p><button class="btn pri" style="height:40px">Salvar senha</button></form>`);
    f.onsubmit = async (e) => { e.preventDefault(); if (!f.reportValidity()) return; const { error } = await sb.auth.updateUser({ password: new FormData(f).get('senha') }); if (error) { f.querySelector('[data-erro]').textContent = erroAuth(error); return; } avisar('Senha alterada'); resolver(); };
  });
}
function telaEmpresa(sb, cfg, espacos) {
  return new Promise((resolver) => {
    const lista = espacos.length ? `<h2 style="font-size:14px;margin:4px 0 8px">Suas empresas</h2><ul class="lista entrada-lista">${espacos.map((s) => `<li class="clicavel" data-esp="${s.id}">${av(s.nome)}<div class="cresce"><div class="t corta">${esc(s.nome)}</div><div class="s">${s.plano === 'ativo' ? 'Plano ativo' : diasAte(s.teste_ate) >= 0 ? `Teste até ${dataCurta(s.teste_ate)}` : 'Teste encerrado'}</div></div>${ic('caret-right')}</li>`).join('')}</ul><div class="entrada-ou">ou</div>` : '';
    const f = tela(cfg, `<h1 class="entrada-t">${espacos.length ? 'Escolha a empresa' : 'Vamos configurar sua empresa'}</h1><p class="entrada-s">${espacos.length ? '' : 'Leva menos de um minuto. Depois você convida a sua equipe.'}</p>${lista}
      <form class="col" style="gap:12px" novalidate><label class="campo">Nome da empresa<input name="nome" required maxlength="120" placeholder="Ex.: ${esc(cfg.empresa)}"></label>
      <fieldset class="campo" style="border:0;padding:0;margin:0"><legend style="margin-bottom:6px">Como você quer começar?</legend>
        <label class="opcao-inicio"><input type="radio" name="modo" value="branco" checked><span><b>Em branco</b><small>Para usar com os dados da sua empresa. Você pode importar planilhas.</small></span></label>
        <label class="opcao-inicio"><input type="radio" name="modo" value="exemplo"><span><b>Com dados de exemplo</b><small>Para explorar tudo antes. Dá para apagar depois.</small></span></label></fieldset>
      ${cfg.modelos?.length ? `<label class="campo">Tipo de negócio<select name="ramo">${cfg.modelos.map((m) => `<option value="${m.id}">${esc(m.nome)}</option>`).join('')}</select><span class="ajuda">Já começa com os serviços e cadastros típicos do seu ramo</span></label>` : ''}
      <label class="campo">Chave PIX da empresa <span class="mute">(opcional)</span><input name="pix" placeholder="CNPJ, e-mail, celular ou chave aleatória"><span class="ajuda">Para as cobranças e links de pagamento já saírem com o QR code. Dá para colocar depois.</span></label>
      <p class="er-tx" data-erro role="alert" style="min-height:1em;font-size:13px"></p><button class="btn pri" style="height:40px">Criar e começar o teste de 7 dias</button></form>
      <div class="entrada-links"><a href="#" data-sair>Sair desta conta</a></div>`);
    document.querySelectorAll('[data-esp]').forEach((li) => (li.onclick = () => resolver({ id: li.dataset.esp, novo: false })));
    document.querySelector('[data-sair]').onclick = async (e) => { e.preventDefault(); await sb.auth.signOut(); location.reload(); };
    f.onsubmit = async (e) => {
      e.preventDefault(); if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f)), btn = f.querySelector('button'); btn.disabled = true;
      const { data, error } = await sb.rpc('nexo_criar_espaco', { p_app: cfg.id, p_nome: d.nome.trim() });
      if (error) { if (/cartão/.test(error.message)) { location.reload(); return; } f.querySelector('[data-erro]').textContent = /limite/.test(error.message) ? 'Você já tem 3 empresas neste sistema.' : error.message; btn.disabled = false; return; }
      resolver({ id: data, novo: true, exemplo: d.modo === 'exemplo', nome: d.nome.trim(), ramo: d.ramo || '', pix: (d.pix || '').trim() });
    };
  });
}

// ---------------------------------------------------------------- teste grátis com cartão (Mercado Pago)
const pagamentos = async (sb, corpo) => {
  const { data, error } = await sb.functions.invoke('nexo-pagamentos', { body: corpo });
  if (error) { let j = {}; try { j = await error.context.json(); } catch { /* ok */ } const e = new Error(j.erro || error.message); e.dados = j; throw e; }
  return data;
};
/** O cliente tem teste, assinatura ou compra valendo para este sistema? */
async function temAcesso(sb, cfg) {
  const r = await pagamentos(sb, { acao: 'status' }).catch(() => ({ assinaturas: [] }));
  const h = hoje();
  return (r.assinaturas || []).some((a) => a.app === cfg.id && (['ativa', 'paga'].includes(a.status) || (a.status === 'teste' && a.teste_ate >= h) || (a.status === 'cancelada' && [a.teste_ate, a.pago_ate].filter(Boolean).sort().pop() >= h)));
}
function telaTeste(sb, cfg, email) {
  return new Promise(() => {
    const preco = cfg.produto?.mensal || 0;
    const f = tela(cfg, `<h1 class="entrada-t">Teste grátis de 7 dias</h1><p class="entrada-s">Use o ${esc(cfg.nome)} com os dados da sua empresa por 7 dias sem pagar nada.</p>
      <ul class="lista-teste"><li>${ic('credit-card', 'p')}Para começar, cadastre o cartão no Mercado Pago.</li><li>${ic('calendar-check', 'p')}Se não cancelar, a assinatura de <b>R$ ${preco}/mês</b> começa sozinha no 8º dia.</li><li>${ic('x-circle', 'p')}Cancele quando quiser em <a href="${SITE}conta.html" target="_top">Minha conta</a>. Cancelando no teste, nada é cobrado.</li><li>${ic('info', 'p')}O teste grátis vale uma vez por cartão e por pessoa.</li></ul>
      <form class="col" style="gap:12px" novalidate><label class="campo">E-mail da sua conta do Mercado Pago<input name="mp" type="email" value="${esc(email)}" required><span class="ajuda">A assinatura fica na conta do Mercado Pago com este e-mail.</span></label>
        <label class="flex" style="gap:8px;align-items:flex-start;font-size:13px;color:var(--tx-2)"><input type="checkbox" name="ok" required style="margin-top:3px"><span>Li e aceito os <a href="${SITE}termos.html" target="_blank" rel="noopener">Termos de Serviço</a> e a cobrança automática depois do teste.</span></label>
        <p class="er-tx" data-erro role="alert" style="min-height:1em;font-size:13px"></p><button class="btn pri" style="height:40px">Cadastrar cartão e começar</button></form>
      <div class="entrada-links"><a href="${SITE}demos/sistemas/${cfg.id}/" target="_top">Ver a demonstração antes</a><span>·</span><a href="#" data-sair>Sair desta conta</a></div>`);
    document.querySelector('[data-sair]').onclick = async (e) => { e.preventDefault(); await sb.auth.signOut(); location.reload(); };
    f.onsubmit = async (e) => {
      e.preventDefault(); if (!f.reportValidity()) return;
      const btn = f.querySelector('button'), erro = f.querySelector('[data-erro]'); btn.disabled = true; btn.textContent = 'Abrindo o Mercado Pago…'; erro.textContent = '';
      try { const j = await pagamentos(sb, { acao: 'iniciar', produto: `a-sis-${cfg.id}`, teste: true, email_mp: f.mp.value.trim() }); location.href = j.link; }
      catch (x) {
        btn.disabled = false; btn.textContent = 'Cadastrar cartão e começar';
        if (x.dados?.sem_teste) { erro.innerHTML = `${esc(x.message)} <a href="#" data-assinar>Assinar por R$ ${preco}/mês</a>`; erro.querySelector('[data-assinar]').onclick = async (ev) => { ev.preventDefault(); try { const j = await pagamentos(sb, { acao: 'iniciar', produto: `a-sis-${cfg.id}`, email_mp: f.mp.value.trim() }); location.href = j.link; } catch (y) { erro.textContent = y.message; } }; }
        else erro.textContent = x.message;
      }
    };
  });
}

async function lerTudo(sb, espaco) {
  const linhas = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from('nexo_registros').select('colecao,id,dados').eq('espaco', espaco).range(de, de + 999);
    if (error) throw error;
    linhas.push(...data); if (data.length < 1000) break;
  }
  return linhas;
}

// ---------------------------------------------------------------- planilha (CSV)
function lerCSV(texto) {
  const sep = (texto.split('\n')[0].match(/;/g) || []).length >= (texto.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const linhas = []; let campo = '', linha = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) { if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') aspas = false; else campo += c; continue; }
    if (c === '"') aspas = true; else if (c === sep) { linha.push(campo); campo = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && texto[i + 1] === '\n') i++; linha.push(campo); campo = ''; if (linha.some((x) => x.trim())) linhas.push(linha); linha = []; } else campo += c;
  }
  linha.push(campo); if (linha.some((x) => x.trim())) linhas.push(linha);
  return linhas;
}
function converter(c, v) {
  v = String(v ?? '').trim(); if (!v) return null;
  if (['moeda', 'numero', 'porcentagem'].includes(c.tipo)) { const n = Number(v.replace(/[R$\s%]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; }
  if (c.tipo === 'data') { const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (m) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; return /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null; }
  if (c.tipo === 'booleano') return /^(s|sim|y|yes|1|true|x)$/i.test(v);
  return v;
}

// ---------------------------------------------------------------- erros na tela do cliente (tabela nexo_erros)
function vigiarErros(sb, cfg) {
  const vistos = new Set();
  const nosso = (url) => !url || String(url).startsWith(location.origin);
  const enviar = (mensagem, origem) => {
    const m = String(mensagem || '').slice(0, 500);
    if (!m || vistos.has(m) || vistos.size >= 20 || /ResizeObserver loop|Script error\.?$/i.test(m)) return;
    vistos.add(m);
    sb.rpc('nexo_registrar_erro', { p_app: cfg.id, p_mensagem: m, p_origem: origem || null, p_pagina: location.hash.slice(0, 200), p_navegador: navigator.userAgent.slice(0, 200), p_versao: document.documentElement.dataset.versao || null }).then(() => {}, () => {});
  };
  addEventListener('error', (e) => { if (e.message && nosso(e.filename)) enviar(e.message, `${String(e.filename || '').replace(location.origin, '')}:${e.lineno}:${e.colno}`); });
  addEventListener('unhandledrejection', (e) => { const r = e.reason; enviar(r?.message || String(r), (r?.stack || '').split('\n').find((l) => l.includes(location.origin))?.trim().replace(location.origin, '')); });
}

// ---------------------------------------------------------------- início
export async function iniciarNuvem(app, cfg) {
  const conf = window.NEXO_NUVEM;
  if (!window.supabase?.createClient) throw new Error('biblioteca do banco não carregou');
  const sb = window.supabase.createClient(conf.url, conf.chave, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'nexo-sessao' } });
  let recuperacao = /type=recovery/.test(location.hash);
  sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') recuperacao = true; if (ev === 'SIGNED_OUT' && app.db) location.reload(); });
  tela(cfg, `<div class="vazio" style="padding:30px 0">${ic('circle')}<b>Carregando…</b></div>`);
  let { data: { session } } = await sb.auth.getSession();
  if (session && recuperacao) { await telaNovaSenha(sb, cfg); history.replaceState(null, '', location.pathname); }
  if (!session) session = await telaConta(sb, cfg, new URLSearchParams(location.search).get('entrar') ? 'entrar' : 'criar');
  const uid = session.user.id, email = session.user.email;
  vigiarErros(sb, cfg);
  await sb.rpc('nexo_aceitar_convites');
  const { data: espacos, error } = await sb.from('nexo_espacos').select('id,nome,plano,teste_ate,dono,criado').eq('app', cfg.id).order('criado');
  if (error) throw error;
  const lembrado = (() => { try { return localStorage.getItem(`nexo-espaco-${cfg.id}`); } catch { return null; } })();
  if (!espacos.length || new URLSearchParams(location.search).has('trocar')) {
    tela(cfg, `<div class="vazio" style="padding:30px 0">${ic('circle')}<b>Conferindo o seu teste…</b></div>`);
    if (!(await temAcesso(sb, cfg))) await telaTeste(sb, cfg, email);
  }
  let escolha = espacos.length === 1 ? { id: espacos[0].id } : espacos.find((s) => s.id === lembrado) && !new URLSearchParams(location.search).has('trocar') ? { id: lembrado } : await telaEmpresa(sb, cfg, espacos);
  try { localStorage.setItem(`nexo-espaco-${cfg.id}`, escolha.id); } catch { /* ok */ }
  tela(cfg, `<div class="vazio" style="padding:30px 0">${ic('circle')}<b>${escolha.exemplo ? 'Preparando os dados de exemplo…' : 'Abrindo…'}</b></div>`);
  const { data: esp } = await sb.from('nexo_espacos').select('id,nome,plano,teste_ate,dono').eq('id', escolha.id).single();
  const linhas = escolha.novo ? [] : await lerTudo(sb, escolha.id);
  const db = new BancoNuvem(sb, escolha.id, uid, linhas);
  if (escolha.novo) {
    if (escolha.exemplo) { const s = cfg.semente(); for (const [k, v] of Object.entries(s)) if (k !== '_cfg') db.dados[k] = v.map((x) => ({ id: x.id || Math.random().toString(36).slice(2, 10), ...x })); }
    db.dados._cfg = { ...(escolha.exemplo ? cfg.semente()._cfg || {} : {}), empresa: escolha.nome, ...(escolha.ramo && !escolha.exemplo ? { ramo_pendente: escolha.ramo } : {}), ...(escolha.pix ? { pix: { chave: escolha.pix, nome: escolha.nome.slice(0, 25), cidade: '' } } : {}) };
    await db.enviar();
  }
  const dono = esp.dono === uid;
  const teste = esp.plano === 'teste', restam = diasAte(esp.teste_ate), encerrado = esp.plano === 'suspenso' || (teste && restam < 0);
  let equipe = [], convites = [];
  const carregarEquipe = async () => {
    const [m, c] = await Promise.all([sb.from('nexo_membros').select('usuario,email,papel').eq('espaco', esp.id), dono ? sb.from('nexo_convites').select('email,papel,criado').eq('espaco', esp.id) : { data: [] }]);
    equipe = m.data || []; convites = c.data || []; if (app.pagina?.id === 'config') app.render();
  };

  const sessao = {
    db, sb, uid, email, espaco: esp, dono,
    funcao: async (nome, corpo) => { const { data, error } = await sb.functions.invoke(nome, { body: { espaco: esp.id, ...corpo } }); if (error) { let msg = error.message; try { msg = (await error.context.json()).erro || msg; } catch { /* ok */ } throw new Error(msg); } return data; },
    salvarSegredo: async (chave, valor) => { const { error } = await sb.rpc('nexo_salvar_segredo', { p_espaco: esp.id, p_chave: chave, p_valor: valor || '' }); if (error) throw error; },
    integracoes: async () => { const { data } = await sb.rpc('nexo_integracoes', { p_espaco: esp.id }); return Object.fromEntries((data || []).map((x) => [x.chave, x.atualizado])); },
    faixa: () => `<div class="faixa nao-imprime"><span class="so-larga">${encerrado ? '<b>Seu teste terminou.</b> Os dados continuam aqui, só para consulta.' : teste ? `Teste grátis · <b>${restam === 0 ? 'último dia' : `${restam} ${restam === 1 ? 'dia' : 'dias'} restantes`}</b>` : `<b>${esc(esp.nome)}</b> · plano ativo`}</span><span class="sep so-larga"></span>
      <span data-sync class="so-larga" style="opacity:.8">Salvo</span><span class="sep so-larga"></span><span class="so-larga" style="opacity:.8">${esc(email)}</span>
      <a class="cta" href="${SITE}conta.html" target="_top">${encerrado ? 'Assinar para continuar' : 'Minha conta'}</a></div>`,
    subConta: () => (teste ? `Teste até ${dataCurta(esp.teste_ate)}` : 'Plano ativo'),
    cartaoEquipe: () => `<div class="cartao"><div class="cartao-cab"><div><h3>Equipe</h3><div class="sub">Cada pessoa entra com o próprio e-mail e senha</div></div></div>
      <ul class="lista">${equipe.map((m) => `<li>${av(m.email)}<div class="cresce"><div class="t corta">${esc(m.email)}${m.usuario === uid ? ' <span class="mute">(você)</span>' : ''}</div><div class="s">${m.papel === 'dono' ? 'Dono' : 'Equipe'}</div></div>${dono && m.usuario !== uid ? `<button type="button" class="btn fant peq" data-acao="removerMembro" data-u="${m.usuario}">Remover</button>` : et('Ativo', 'ok')}</li>`).join('')}
      ${convites.map((c) => `<li>${av(c.email)}<div class="cresce"><div class="t corta">${esc(c.email)}</div><div class="s">Convite enviado em ${dataCurta(c.criado)}: entra ao criar a conta com este e-mail</div></div><button type="button" class="btn fant peq" data-acao="cancelarConvite" data-e="${esc(c.email)}">Cancelar</button></li>`).join('')}</ul>
      ${dono ? `<div class="cartao-corpo" style="border-top:1px solid var(--borda)"><form class="flex" data-convite><input type="email" name="email" placeholder="e-mail de quem vai usar" required style="flex:1"><button type="button" class="btn pri" data-acao="convidar">${ic('user-plus')}Convidar</button></form></div>` : ''}</div>`,
    cartaoResumo: () => { const rs = db.cfg.resumo || {}; return `<div class="cartao"><div class="cartao-cab"><div><h3>Resumo diário por e-mail</h3><div class="sub">Um e-mail de manhã com o que importa no dia</div></div>${rs.ativo ? et('Ligado', 'ok') : et('Desligado', '')}</div><div class="cartao-corpo"><form class="form-grade" data-resumo>
      <label class="campo">Enviar para<input name="email" type="email" value="${esc(rs.email || email)}"></label><label class="campo">Horário<select name="hora">${[6, 7, 8, 9, 10, 12, 18].map((h) => `<option value="${h}" ${Number(rs.hora || 7) === h ? 'selected' : ''}>${h}h</option>`).join('')}</select></label>
      <div class="campo largo" style="flex-direction:row;justify-content:flex-end;gap:8px">${rs.ativo ? '<button type="button" class="btn fant" data-acao="resumoDesligar">Desligar</button>' : ''}<button type="button" class="btn pri" data-acao="resumoLigar">${rs.ativo ? 'Salvar' : 'Ligar o resumo diário'}</button></div></form></div></div>`; },
    linhasDados: () => `<div class="entre"><span class="mute-2">Importar uma planilha (CSV) de</span><span class="flex"><select data-csv-col style="width:auto;height:30px">${Object.entries(app.colecoes || {}).filter(([, c]) => c.campos).map(([k, c]) => `<option value="${k}">${esc(c.plural)}</option>`).join('')}</select><label class="btn">${ic('upload-simple')}Escolher arquivo<input type="file" accept=".csv,.txt" data-mudar="importarCSV" hidden></label></span></div>
      <div class="entre"><span class="mute-2">Usar outra empresa ou criar uma nova</span><a class="btn" href="?trocar=1">${ic('arrows-left-right')}Trocar de empresa</a></div>`,
    depoisDeMontar: () => {
      const sync = document.querySelector('[data-sync]');
      db.ouvintes.add((s) => { if (sync) sync.textContent = { pendente: 'Salvando…', salvando: 'Salvando…', salvo: 'Salvo', erro: 'Não salvo' }[s]; });
      let tRender;
      sb.channel(`nexo-${esp.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'nexo_registros', filter: `espaco=eq.${esp.id}` }, (p) => {
        if (!db.remoto(p)) return;
        clearTimeout(tRender);
        tRender = setTimeout(() => { if (document.querySelector('.fundo-modal') || document.activeElement?.matches('input,textarea,select')) return; app.render(); if (document.querySelector('.gaveta.on')) app.reabrir(); }, 350);
      }).subscribe();
      addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && db.situacao === 'pendente') db.enviar(); });
      addEventListener('beforeunload', (e) => { if (['pendente', 'salvando'].includes(db.situacao)) { db.enviar(); e.preventDefault(); e.returnValue = ''; } });
      Object.assign(app.acoes, {
        resumoLigar: () => { const f = document.querySelector('[data-resumo]'); if (!f.reportValidity()) return; db.cfg.resumo = { ativo: true, email: f.email.value.trim(), hora: Number(f.hora.value) }; db.gravar(); avisar(`Resumo diário ligado: chega todo dia às ${f.hora.value}h`); app.render(); },
        resumoDesligar: () => { db.cfg.resumo = { ...(db.cfg.resumo || {}), ativo: false }; db.gravar(); avisar('Resumo diário desligado'); app.render(); },
        sair: async () => { if (await confirmar('Sair da sua conta neste aparelho?', { rotulo: 'Sair' })) { await db.enviar(); await sb.auth.signOut(); location.reload(); } },
        convidar: async () => {
          const f = document.querySelector('[data-convite]'); if (!f.reportValidity()) return;
          const em = f.email.value.trim().toLowerCase();
          const { error: er } = await sb.from('nexo_convites').insert({ espaco: esp.id, email: em });
          if (er) return avisar(/duplicate/.test(er.message) ? 'Esse e-mail já foi convidado' : er.message, { tipo: 'erro' });
          db.cfg.convidou = true; db.gravar(); f.reset(); avisar(`Convite criado. Peça para ${em} criar a conta em ${location.origin + location.pathname} com este e-mail.`, { tempo: 8000 }); carregarEquipe();
        },
        cancelarConvite: async (d) => { await sb.from('nexo_convites').delete().eq('espaco', esp.id).eq('email', d.e); carregarEquipe(); },
        removerMembro: async (d) => { if (!(await confirmar('Remover esta pessoa? Ela perde o acesso na hora.', { rotulo: 'Remover', perigo: true }))) return; await sb.from('nexo_membros').delete().eq('espaco', esp.id).eq('usuario', d.u); carregarEquipe(); },
        importarCSV: (d, el) => {
          const arq = el.files?.[0]; const nomeCol = document.querySelector('[data-csv-col]')?.value; if (!arq || !nomeCol) return;
          const col = app.colecoes[nomeCol]; const campos = (typeof col.campos === 'function' ? col.campos(app) : col.campos);
          const rd = new FileReader();
          rd.onload = async () => {
            const linhasCsv = lerCSV(String(rd.result).replace(/^﻿/, '')); if (linhasCsv.length < 2) return avisar('A planilha está vazia', { tipo: 'erro' });
            const cab = linhasCsv[0].map((h) => normal(h).replace(/[^a-z0-9]/g, ''));
            const mapa = campos.map((c) => [c, cab.findIndex((h) => h && (h === normal(c.nome).replace(/[^a-z0-9]/g, '') || h === normal(c.rotulo).replace(/[^a-z0-9]/g, '') || normal(c.rotulo).replace(/[^a-z0-9]/g, '').startsWith(h)))]).filter(([, i]) => i >= 0);
            if (!mapa.length) return avisar(`Nenhuma coluna reconhecida. Use cabeçalhos como: ${campos.slice(0, 5).map((c) => c.rotulo).join(', ')}`, { tipo: 'erro', tempo: 8000 });
            if (!(await confirmar(`Importar ${linhasCsv.length - 1} ${col.plural}? Colunas reconhecidas: ${mapa.map(([c]) => c.rotulo).join(', ')}.`, { rotulo: 'Importar' }))) return;
            let n = 0;
            for (const l of linhasCsv.slice(1)) {
              const o = {}; for (const [c, i] of mapa) { let v = converter(c, l[i]); if (c.tipo === 'relacao' && v) { const alvo = app.db.lista(c.colecao).find((x) => normal(x[c.mostrar || 'nome'] || '') === normal(v)); v = alvo?.id || null; } if (v != null) o[c.nome] = v; }
              if (!Object.keys(o).length) continue;
              const dados = col.antesDeSalvar ? col.antesDeSalvar({ ...o }, app, null) || o : o;
              app.db.dados[nomeCol] = app.db.lista(nomeCol); app.db.dados[nomeCol].unshift({ id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3), criado: new Date().toISOString().slice(0, 16), ...dados }); n++;
            }
            app.db.gravar(); avisar(`${n} ${col.plural} importados`); app.render();
          };
          rd.readAsText(arq);
        },
      });
      carregarEquipe();
      if (encerrado) modal({ titulo: 'Seu teste terminou', largura: 460, corpo: `<p class="mute-2">Os dados da <b>${esc(esp.nome)}</b> continuam guardados. Para voltar a usar, contrate o ${esc(cfg.nome)}: alugue por mês ou compre.</p>`, botoes: [{ rotulo: 'Só consultar', valor: null, classe: 'fant' }, { rotulo: 'Assinar', classe: 'pri', acao: () => { location.href = `${SITE}conta.html`; return true; } }] });
      else if (escolha.novo) modal({ titulo: `Bem-vindo ao ${cfg.nome}`, largura: 520, corpo: `<div class="col" style="gap:10px"><p class="mute-2">Seu teste vai até <b>${dataCurta(esp.teste_ate)}</b>. Três passos para começar:</p><div class="dica">${ic('upload-simple')}<span><b>Traga seus cadastros:</b> em Configurações, importe uma planilha (CSV) de clientes, produtos ou o que precisar.</span></div><div class="dica">${ic('user-plus')}<span><b>Convide a equipe:</b> cada pessoa entra com o próprio e-mail e vê tudo atualizado na hora.</span></div><div class="dica">${ic('phone')}<span><b>Use no celular:</b> abra este endereço no celular e toque em "Adicionar à tela inicial".</span></div></div>`, botoes: [{ rotulo: 'Começar', classe: 'pri', valor: true }] });
    },
  };
  return sessao;
}
export { BancoNuvem }; // usado nos testes
