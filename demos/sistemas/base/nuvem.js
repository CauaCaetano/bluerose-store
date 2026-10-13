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

// não abre dentro de página de outro site (proteção contra clickjacking; o GitHub Pages não deixa mandar X-Frame-Options)
if (window.top !== window.self) { try { if (window.top.location.origin !== location.origin) throw 0; } catch { window.top.location.href = location.href; } }

const SITE = 'https://bluerose-store.com/';
// Dentro do app da Google Play (Linha Nexo) não há venda nem teste com cartão: a regra de pagamentos da loja
// não permite levar a compra para fora. O app abre /app/play/?origem=play, que marca este aparelho.
const PLAY = (() => { try { return localStorage.getItem('nexo-play') === '1'; } catch { return false; } })();
const LOGO = new URL('blue-rose.png', import.meta.url).href;
const SEP = '\u0001';
// Plano Pro: equipe sem limite (Básico: 8 pessoas além do dono), histórico da equipe, marca da empresa nos links e documentos,
// até 10 empresas por sistema e suporte prioritário. Custa R$ 60 a mais por mês (catálogo a-sis-<app>-pro).
const LIMITE_BASICO = 8, EXTRA_PRO = 60;
const SUPORTE = [64, 64, 60, 65, 68, 68, 60, 61, 59, 62, 66, 59, 59].map((c) => String.fromCharCode(c - 11)).join(''); // WhatsApp da Blue Rose (mesmo do site)
const BENEFICIOS_PRO = [['users-three', 'Equipe sem limite', 'Convide quantas pessoas quiser (o Básico vai até 8).'], ['clock', 'Histórico da equipe', 'Veja quem criou ou mudou cada registro, e quando.'], ['camera', 'Sua marca nos links e documentos', 'O logo da sua empresa nas páginas que o cliente recebe e nos impressos, sem o "Feito com".'], ['buildings', 'Até 10 empresas ou filiais', 'Cada uma com os próprios dados e equipe (o Básico vai até 3).'], ['chat-circle', 'Suporte prioritário', 'Atendimento pelo WhatsApp com resposta no mesmo dia útil.']];
const NIVEIS = [['editar', 'Ver e editar'], ['ver', 'Só ver'], ['nenhum', 'Sem acesso']];

// resumo de uma permissão para a lista da equipe
function resumoAcesso(perm) {
  if (!perm) return 'Acesso total';
  const v = Object.values(perm.paginas || {}), ed = v.filter((x) => x === 'editar').length, so = v.filter((x) => x === 'ver').length;
  if (perm.so_leitura) return `Só ver · ${so} ${so === 1 ? 'área' : 'áreas'}`;
  return `Personalizado · edita ${ed}, só vê ${so}${perm.excluir ? '' : ' · não apaga'}`;
}

// editor de permissões: devolve { email, perm } (perm null = acesso total) ou null se cancelou
async function editarPermissoes(app, cfg, { titulo, atual, comEmail = false }) {
  const paginas = [...cfg.paginas.filter((x) => x.id), { id: 'config', rot: 'Configurações' }];
  const val = (id) => (atual?.paginas?.[id]) || (id === 'config' ? 'ver' : 'editar');
  const corpo = `<form class="col" style="gap:12px" data-perm>
    ${comEmail ? '<label class="campo">E-mail de quem vai usar<input name="email" type="email" required placeholder="nome@empresa.com.br"></label>' : ''}
    <div class="grupo-btn" role="radiogroup"><button type="button" data-modo-perm="total" aria-pressed="${!atual}">${ic('lock-open', 'p')}Acesso total</button><button type="button" data-modo-perm="personalizado" aria-pressed="${!!atual}">${ic('key', 'p')}Escolher o que pode</button></div>
    <div data-perm-lista ${atual ? '' : 'hidden'}><p class="mute-2" style="font-size:12.5px;margin:0 0 8px">Para cada área do sistema, escolha o que esta pessoa pode fazer. "Sem acesso" esconde a área do menu.</p>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 12px;align-items:center;max-height:46vh;overflow:auto">${paginas.map((pg) => `<span>${ic(pg.icone || 'gear-six', 'p')} ${esc(pg.rot)}</span><select data-pg="${esc(pg.id)}" style="width:auto;height:30px">${NIVEIS.map(([k, n]) => `<option value="${k}" ${val(pg.id) === k ? 'selected' : ''}>${n}</option>`).join('')}</select>`).join('')}</div>
      <label class="flex" style="gap:8px;margin-top:12px;font-size:13px"><input type="checkbox" name="excluir" ${atual?.excluir ? 'checked' : ''}> Pode apagar registros</label></div></form>`;
  const r = await modal({ titulo, largura: 520, corpo, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: comEmail ? 'Convidar' : 'Salvar', classe: 'pri', acao: (f) => {
    const fm = f.querySelector('[data-perm]'); if (comEmail && !fm.reportValidity()) return false;
    const email = comEmail ? fm.email.value.trim().toLowerCase() : '';
    if (f.querySelector('[data-modo-perm="total"]').getAttribute('aria-pressed') === 'true') return { email, perm: null };
    const pags = Object.fromEntries([...f.querySelectorAll('[data-pg]')].map((x) => [x.dataset.pg, x.value]));
    if (Object.values(pags).every((x) => x === 'nenhum')) { avisar('Deixe pelo menos uma área com acesso', { tipo: 'erro' }); return false; }
    return { email, perm: { paginas: pags, excluir: fm.excluir.checked, so_leitura: !Object.values(pags).includes('editar'), padrao: 'ver' } };
  } }], aoAbrir: (f) => f.querySelectorAll('[data-modo-perm]').forEach((b) => (b.onclick = () => { f.querySelectorAll('[data-modo-perm]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); f.querySelector('[data-perm-lista]').hidden = b.dataset.modoPerm === 'total'; })) });
  return r;
}

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
      avisar(rls ? PLAY ? 'Não foi possível salvar: o acesso a este sistema terminou.' : 'Não foi possível salvar: o período de teste terminou. Contrate para continuar usando.' : `Não foi possível salvar agora (${e.message || 'sem conexão'}). Vamos tentar de novo.`, { tipo: 'erro', tempo: 7000 });
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
  document.body.innerHTML = `<div class="entrada"><div class="entrada-caixa">
    <div class="marca" style="padding:0 0 18px"><img class="marca-logo" src="${cfg.logo || LOGO}" alt="${cfg.logo ? esc(cfg.nome) : 'Blue Rose'}" width="30" height="30"><div><b>${esc(cfg.nome)}</b><small>${esc(cfg.marcaSub || `Blue Rose · ${cfg.sub}`)}</small></div></div>
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
    const titulos = { criar: ['Teste grátis por 7 dias', 'Crie sua conta. No próximo passo você cadastra o cartão: nada é cobrado nos 7 dias e dá para cancelar quando quiser.'], entrar: ['Entrar', PLAY ? 'Use o mesmo e-mail e senha da sua conta Blue Rose.' : 'Acesse o sistema da sua empresa.'], esqueci: ['Recuperar a senha', 'Enviamos um link para criar uma senha nova.'] };
    const convite = modo === 'criar' ? (new URLSearchParams(location.search).get('convite') || '').trim().toLowerCase() : '';
    if (convite) titulos.criar = ['Você foi convidado', `Crie a sua conta com o e-mail <b>${esc(convite)}</b> para entrar na equipe da empresa no ${esc(cfg.nome)}. Não precisa cadastrar cartão: quem paga é o dono da empresa.`];
    const [t, s] = titulos[modo];
    const f = tela(cfg, `<h1 class="entrada-t">${t}</h1><p class="entrada-s">${s}</p>${aviso ? `<div class="dica" style="margin-bottom:14px">${ic('info')}<span>${aviso}</span></div>` : ''}
      ${modo !== 'esqueci' ? `<div class="entrada-google" hidden><button type="button" class="btn btn-google">${LOGO_G}Continuar com o Google</button><p class="entrada-ou"><span>ou com e-mail e senha</span></p></div>` : ''}
      <form class="col" style="gap:12px" novalidate>
        ${modo === 'criar' ? '<label class="campo">Seu nome<input name="nome" autocomplete="name" required></label>' : ''}
        <label class="campo">E-mail<input name="email" type="email" autocomplete="email" required value="${esc(convite)}"></label>
        ${modo !== 'esqueci' ? `<label class="campo">Senha<input name="senha" type="password" autocomplete="${modo === 'criar' ? 'new-password' : 'current-password'}" minlength="8" required>${modo === 'criar' ? '<span class="ajuda">Pelo menos 8 caracteres</span>' : ''}</label>` : ''}
        <p class="er-tx" data-erro role="alert" style="min-height:1em;font-size:13px"></p>
        <button class="btn pri" style="height:40px">${modo === 'criar' ? (convite ? 'Criar conta e entrar na equipe' : 'Criar conta e começar o teste') : modo === 'entrar' ? 'Entrar' : 'Enviar link'}</button>
      </form>
      <div class="entrada-links">${modo === 'criar' ? '<span>Já tem conta?</span> <a href="#" data-modo="entrar">Entrar</a>' : modo === 'entrar' ? `<a href="#" data-modo="esqueci">Esqueci a senha</a>${PLAY ? '' : '<span>·</span><a href="#" data-modo="criar">Criar conta grátis</a>'}` : '<a href="#" data-modo="entrar">Voltar para entrar</a>'}</div>`);
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
  if (PLAY) return new Promise(() => {
    tela(cfg, `<h1 class="entrada-t">Sistema não liberado</h1><p class="entrada-s">O ${esc(cfg.nome)} ainda não está liberado na conta ${esc(email)}.</p>
      <div class="entrada-links"><a href="../play/">Voltar aos meus sistemas</a><span>·</span><a href="#" data-sair>Sair desta conta</a></div>`);
    document.querySelector('[data-sair]').onclick = async (e) => { e.preventDefault(); await sb.auth.signOut(); location.href = '../play/'; };
  });
  return new Promise(() => {
    const preco = cfg.produto?.mensal || 0;
    const f = tela(cfg, `<h1 class="entrada-t">Teste grátis de 7 dias</h1><p class="entrada-s">Use o ${esc(cfg.nome)} com os dados da sua empresa por 7 dias sem pagar nada.</p>
      <ul class="lista-teste"><li>${ic('credit-card', 'p')}<span>Para começar, cadastre o cartão no Mercado Pago.</span></li><li>${ic('calendar-check', 'p')}<span>Se não cancelar, a assinatura de <b>R$ ${preco}/mês</b> começa sozinha no 8º dia.</span></li><li>${ic('x-circle', 'p')}<span>Cancele quando quiser em <a href="${SITE}conta.html" target="_top">Minha conta</a>. Cancelando no teste, nada é cobrado.</span></li><li>${ic('info', 'p')}<span>O teste grátis vale uma vez por cartão e por pessoa.</span></li></ul>
      <form class="col" style="gap:12px" novalidate><label class="campo">E-mail da sua conta do Mercado Pago<input name="mp" type="email" value="${esc(email)}" required><span class="ajuda">A assinatura fica na conta do Mercado Pago com este e-mail.</span></label>
        <label class="flex" style="gap:8px;align-items:flex-start;font-size:13px;color:var(--tx-2)"><input type="checkbox" name="ok" required style="margin-top:3px"><span>Tenho 18 anos ou mais. Li e aceito os <a href="${SITE}termos.html" target="_blank" rel="noopener">Termos de Serviço</a> e a cobrança automática depois do teste.</span></label>
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
  if (!session) session = await telaConta(sb, cfg, PLAY || new URLSearchParams(location.search).get('entrar') ? 'entrar' : 'criar');
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
  const { data: esp } = await sb.from('nexo_espacos').select('id,nome,plano,teste_ate,dono,nivel').eq('id', escolha.id).single();
  const { data: eu } = await sb.from('nexo_membros').select('permissoes').eq('espaco', escolha.id).eq('usuario', session.user.id).maybeSingle();
  const linhas = escolha.novo ? [] : await lerTudo(sb, escolha.id);
  const db = new BancoNuvem(sb, escolha.id, uid, linhas);
  if (escolha.novo) {
    if (escolha.exemplo) { const s = cfg.semente(); for (const [k, v] of Object.entries(s)) if (k !== '_cfg') db.dados[k] = v.map((x) => ({ id: x.id || Math.random().toString(36).slice(2, 10), ...x })); }
    db.dados._cfg = { ...(escolha.exemplo ? cfg.semente()._cfg || {} : {}), empresa: escolha.nome, ...(escolha.ramo && !escolha.exemplo ? { ramo_pendente: escolha.ramo } : {}), ...(escolha.pix ? { pix: { chave: escolha.pix, nome: escolha.nome.slice(0, 25), cidade: '' } } : {}) };
    await db.enviar();
  }
  const dono = esp.dono === uid, pro = esp.nivel === 'pro', minhas = dono ? null : eu?.permissoes || null;
  const teste = esp.plano === 'teste', restam = diasAte(esp.teste_ate), encerrado = esp.plano === 'suspenso' || (teste && restam < 0);
  let equipe = [], convites = [];
  const carregarEquipe = async () => {
    const [m, c] = await Promise.all([sb.from('nexo_membros').select('usuario,email,papel,permissoes').eq('espaco', esp.id), dono ? sb.from('nexo_convites').select('email,papel,criado,permissoes').eq('espaco', esp.id) : { data: [] }]);
    equipe = m.data || []; convites = c.data || []; if (app.pagina?.id === 'config') app.render();
  };

  const sessao = {
    db, sb, uid, email, espaco: esp, dono, pro,
    acesso: (pagina) => (!minhas ? 'editar' : minhas.paginas?.[pagina] || minhas.padrao || 'ver'),
    podeExcluir: () => !minhas || !!minhas.excluir,
    funcao: async (nome, corpo) => { const { data, error } = await sb.functions.invoke(nome, { body: { espaco: esp.id, ...corpo } }); if (error) { let msg = error.message; try { msg = (await error.context.json()).erro || msg; } catch { /* ok */ } throw new Error(msg); } return data; },
    salvarSegredo: async (chave, valor) => { const { error } = await sb.rpc('nexo_salvar_segredo', { p_espaco: esp.id, p_chave: chave, p_valor: valor || '' }); if (error) throw error; },
    integracoes: async () => { const { data } = await sb.rpc('nexo_integracoes', { p_espaco: esp.id }); return Object.fromEntries((data || []).map((x) => [x.chave, x.atualizado])); },
    faixa: () => `<div class="faixa nao-imprime"><span class="so-larga">${encerrado ? '<b>Seu teste terminou.</b> Os dados continuam aqui, só para consulta.' : teste ? `Teste grátis · <b>${restam === 0 ? 'último dia' : `${restam} ${restam === 1 ? 'dia' : 'dias'} restantes`}</b>` : `<b>${esc(esp.nome)}</b> · ${pro ? 'plano Pro' : 'plano ativo'}`}</span><span class="sep so-larga"></span>
      <span data-sync class="so-larga" style="opacity:.8">Salvo</span><span class="sep so-larga"></span><span class="so-larga" style="opacity:.8">${esc(email)}</span>
      ${PLAY ? '<a class="cta" href="../play/">Meus sistemas</a>' : `<a class="cta" href="${SITE}conta.html" target="_top">${encerrado ? 'Assinar para continuar' : 'Minha conta'}</a>`}</div>`,
    subConta: () => (teste ? `Teste até ${dataCurta(esp.teste_ate)}` : pro ? 'Plano Pro' : 'Plano ativo'),
    cartaoEquipe: () => {
      const outros = equipe.filter((m) => m.papel !== 'dono').length + convites.length, cheio = !pro && outros >= LIMITE_BASICO;
      const linha = (av_, t_, s_, botoes) => `<li>${av_}<div class="cresce"><div class="t corta">${t_}</div><div class="s">${s_}</div></div>${botoes}</li>`;
      return `<div class="cartao"><div class="cartao-cab"><div><h3>Equipe</h3><div class="sub">${pro ? 'Plano Pro · equipe sem limite' : `${outros} de ${LIMITE_BASICO} pessoas convidadas`} · cada pessoa entra com o próprio e-mail</div></div>${pro ? et('Pro', 'ok') : ''}</div>
      <ul class="lista">${equipe.map((m) => linha(av(m.email), `${esc(m.email)}${m.usuario === uid ? ' <span class="mute">(você)</span>' : ''}`, m.papel === 'dono' ? 'Dono · acesso total' : esc(resumoAcesso(m.permissoes)),
        dono && m.usuario !== uid ? `<button type="button" class="btn fant peq" data-acao="acessoMembro" data-u="${m.usuario}">${ic('key')}Acesso</button><button type="button" class="btn fant peq" data-acao="removerMembro" data-u="${m.usuario}">Remover</button>` : '')).join('')}
      ${convites.map((c) => linha(av(c.email), esc(c.email), `Convite de ${dataCurta(c.criado)} · ${esc(resumoAcesso(c.permissoes))}`, `<button type="button" class="btn fant peq" data-acao="linkConvite" data-e="${esc(c.email)}">${ic('link')}Link</button><button type="button" class="btn fant peq" data-acao="acessoConvite" data-e="${esc(c.email)}">${ic('key')}Acesso</button><button type="button" class="btn fant peq" data-acao="cancelarConvite" data-e="${esc(c.email)}">Cancelar</button>`)).join('')}</ul>
      ${dono ? `<div class="cartao-corpo" style="border-top:1px solid var(--borda)">${cheio ? `<div class="dica">${ic('users-three')}<span>Você chegou a ${LIMITE_BASICO} pessoas, o limite do plano Básico. <a href="#" data-acao="verPro">Veja o Pro</a> para convidar sem limite.</span></div>` : `<div class="entre"><span class="mute-2" style="font-size:12.5px">Escolha na hora do convite o que a pessoa pode ver e editar.</span><button type="button" class="btn pri" data-acao="convidar">${ic('user-plus')}Convidar pessoa</button></div>`}</div>` : ''}</div>
      ${dono || pro ? sessao.cartaoPro() : ''}`;
    },
    cartaoPro: () => pro
      ? `<div class="cartao"><div class="cartao-cab"><div><h3>Plano Pro</h3><div class="sub">O que a sua empresa tem a mais</div></div>${et('Ativo', 'ok')}</div><div class="cartao-corpo col" style="gap:10px">
        <div class="entre"><span class="mute-2">Quem fez o quê no sistema</span><button type="button" class="btn" data-acao="atividadeEquipe">${ic('clock')}Histórico da equipe</button></div>
        ${dono ? `<div class="entre"><span class="mute-2">Logo nas páginas do cliente e nos documentos</span><span class="flex">${db.cfg.marca_logo ? `<img src="${esc(db.cfg.marca_logo)}" alt="Logo" style="height:30px;max-width:90px;object-fit:contain;border-radius:4px">` : ''}<label class="btn">${ic('camera')}${db.cfg.marca_logo ? 'Trocar logo' : 'Enviar logo'}<input type="file" accept="image/png,image/jpeg,image/webp" data-mudar="marcaLogo" hidden></label>${db.cfg.marca_logo ? `<button type="button" class="btn fant ic-so" data-acao="tirarLogo" aria-label="Tirar logo">${ic('trash')}</button>` : ''}</span></div>` : ''}
        <div class="entre"><span class="mute-2">Dúvida ou problema? Fale direto com a Blue Rose</span><a class="btn" target="_blank" rel="noopener" href="https://wa.me/${SUPORTE}?text=${encodeURIComponent(`Olá! Sou cliente Pro do ${cfg.nome} (${esp.nome}) e preciso de ajuda com: `)}">${ic('whatsapp-logo')}Suporte prioritário</a></div></div></div>`
      : `<div class="cartao"><div class="cartao-cab"><div><h3>Plano Pro</h3><div class="sub">Para equipes maiores, por R$ ${EXTRA_PRO} a mais por mês</div></div></div><div class="cartao-corpo col" style="gap:8px">
        ${BENEFICIOS_PRO.map(([i, t_, d]) => `<div class="flex" style="gap:10px;align-items:flex-start">${ic(i)}<span><b>${t_}.</b> <span class="mute-2">${d}</span></span></div>`).join('')}
        <div class="entre" style="margin-top:6px"><span class="mute-2" style="font-size:12.5px">${PLAY ? 'Disponível na versão pelo site.' : 'O plano atual é cancelado sozinho quando o Pro começa: você não paga dois.'}</span>${PLAY ? '' : `<button type="button" class="btn pri" data-acao="mudarPro">${ic('crown')}Mudar para o Pro · R$ ${(cfg.produto?.mensal || 0) + EXTRA_PRO}/mês</button>`}</div></div></div>`,
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
          const r = await editarPermissoes(app, cfg, { titulo: 'Convidar pessoa', comEmail: true }); if (!r) return;
          const { error: er } = await sb.from('nexo_convites').insert({ espaco: esp.id, email: r.email, permissoes: r.perm });
          if (er) { if (/LIMITE_EQUIPE/.test(er.message)) return app.acoes.verPro(); return avisar(/duplicate/.test(er.message) ? 'Esse e-mail já foi convidado' : er.message, { tipo: 'erro' }); }
          db.cfg.convidou = true; db.gravar(); await carregarEquipe(); app.acoes.linkConvite({ e: r.email });
        },
        linkConvite: (d) => {
          const em = d.e, link = `${location.origin + location.pathname}?convite=${encodeURIComponent(em)}`, msg = `Oi! Te adicionei na equipe da ${db.cfg.empresa || esp.nome} no ${cfg.nome}. Crie a sua conta com este e-mail (${em}) por aqui: ${link}`;
          modal({ titulo: 'Convite pronto', largura: 480, corpo: `<p class="mute-2" style="margin-bottom:10px">Mande o link para <b>${esc(em)}</b>. A pessoa cria a conta com esse e-mail e já entra na empresa, sem pagar nada. Se ela já tiver conta, é só entrar.</p><input readonly value="${esc(link)}" style="width:100%">`,
            botoes: [{ rotulo: 'Copiar link', classe: 'fant', acao: () => { navigator.clipboard?.writeText(link).then(() => avisar('Link copiado')).catch(() => {}); return false; } }, { rotulo: 'Mandar no WhatsApp', classe: 'pri', acao: () => { window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener'); return true; } }] });
        },
        acessoMembro: async (d) => {
          const m = equipe.find((x) => x.usuario === d.u); if (!m) return;
          const r = await editarPermissoes(app, cfg, { titulo: `Acesso de ${m.email}`, atual: m.permissoes }); if (!r) return;
          const { error: er } = await sb.rpc('nexo_definir_permissoes', { p_espaco: esp.id, p_usuario: m.usuario, p_permissoes: r.perm });
          if (er) return avisar(er.message, { tipo: 'erro' }); avisar('Acesso atualizado. Vale a partir da próxima vez que a pessoa abrir o sistema.'); carregarEquipe();
        },
        acessoConvite: async (d) => {
          const c = convites.find((x) => x.email === d.e); if (!c) return;
          const r = await editarPermissoes(app, cfg, { titulo: `Acesso de ${c.email}`, atual: c.permissoes }); if (!r) return;
          await sb.from('nexo_convites').delete().eq('espaco', esp.id).eq('email', c.email);
          const { error: er } = await sb.from('nexo_convites').insert({ espaco: esp.id, email: c.email, permissoes: r.perm });
          if (er) return avisar(er.message, { tipo: 'erro' }); avisar('Acesso do convite atualizado'); carregarEquipe();
        },
        verPro: () => modal({ titulo: `${cfg.nome} Pro`, largura: 520, corpo: `<div class="col" style="gap:10px">${BENEFICIOS_PRO.map(([i, t_, d]) => `<div class="dica">${ic(i)}<span><b>${t_}.</b> ${d}</span></div>`).join('')}<p class="mute-2" style="font-size:13px">R$ ${(cfg.produto?.mensal || 0) + EXTRA_PRO}/mês. O plano atual é cancelado sozinho quando o Pro começa.</p></div>`,
          botoes: [{ rotulo: 'Agora não', valor: null, classe: 'fant' }, ...(PLAY || !dono ? [] : [{ rotulo: 'Mudar para o Pro', classe: 'pri', acao: () => { app.acoes.mudarPro(); return true; } }])] }),
        mudarPro: async () => {
          if (!dono) return avisar('Só o dono da empresa muda o plano', { tipo: 'erro' });
          if (!(await confirmar(`Mudar para o ${cfg.nome} Pro por R$ ${(cfg.produto?.mensal || 0) + EXTRA_PRO}/mês? Você vai para o Mercado Pago confirmar. Quando o Pro começar, o plano atual é cancelado sozinho.`, { rotulo: 'Ir para o Mercado Pago', titulo: 'Plano Pro' }))) return;
          try { const j = await pagamentos(sb, { acao: 'iniciar', produto: `a-sis-${cfg.id}-pro`, email_mp: email }); location.href = j.link; } catch (x) { avisar(x.message, { tipo: 'erro' }); }
        },
        atividadeEquipe: async () => {
          if (!pro) return app.acoes.verPro();
          const { data: l } = await sb.from('nexo_registros').select('colecao,id,autor,atualizado,dados').eq('espaco', esp.id).neq('colecao', '_cfg').order('atualizado', { ascending: false }).limit(120);
          const quem = new Map(equipe.map((m) => [m.usuario, m.email])), nome = (x) => x.dados?.nome || x.dados?.titulo || x.dados?.descricao || x.dados?.placa || x.dados?.numero || `#${x.id}`;
          const porDia = agrupar(l || [], (x) => String(x.atualizado).slice(0, 10));
          modal({ titulo: 'Histórico da equipe', largura: 620, corpo: (l || []).length ? `<div style="max-height:60vh;overflow:auto">${Object.entries(porDia).map(([dia, xs]) => `<h4 style="margin:12px 0 4px">${dataCurta(dia)}</h4><ul class="lista" style="margin:0 -20px">${xs.map((x) => `<li>${av(quem.get(x.autor) || '?')}<div class="cresce"><div class="t corta">${esc(String(nome(x)))}</div><div class="s">${esc(quem.get(x.autor) || 'pessoa que saiu da equipe')} · ${esc(app.colecoes?.[x.colecao]?.singular || x.colecao)} · ${new Date(x.atualizado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div></div></li>`).join('')}</ul>`).join('')}</div>` : '<p class="mute-2">Nada registrado ainda.</p>', botoes: [{ rotulo: 'Fechar', valor: null, classe: 'fant' }] });
        },
        marcaLogo: (d, el) => {
          const arq = el.files?.[0]; if (!arq) return; if (arq.size > 4e6) return avisar('Imagem grande demais (máximo 4 MB)', { tipo: 'erro' });
          const img = new Image(), url = URL.createObjectURL(arq);
          img.onload = () => { const k = Math.min(1, 320 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
            db.cfg.marca_logo = c.toDataURL('image/webp', 0.86); db.gravar(); avisar('Logo salvo. Ele aparece nas páginas do cliente e nos documentos.'); app.render(); };
          img.onerror = () => avisar('Não consegui abrir essa imagem', { tipo: 'erro' }); img.src = url;
        },
        tirarLogo: () => { delete db.cfg.marca_logo; db.gravar(); app.render(); },
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
      if (encerrado && PLAY) modal({ titulo: 'Acesso encerrado', largura: 460, corpo: `<p class="mute-2">Os dados da <b>${esc(esp.nome)}</b> continuam guardados e você pode consultá-los.</p>`, botoes: [{ rotulo: 'Entendi', valor: null, classe: 'pri' }] });
      else if (encerrado) modal({ titulo: 'Seu teste terminou', largura: 460, corpo: `<p class="mute-2">Os dados da <b>${esc(esp.nome)}</b> continuam guardados. Para voltar a usar, contrate o ${esc(cfg.nome)}: alugue por mês ou compre.</p>`, botoes: [{ rotulo: 'Só consultar', valor: null, classe: 'fant' }, { rotulo: 'Assinar', classe: 'pri', acao: () => { location.href = `${SITE}conta.html`; return true; } }] });
      else if (escolha.novo) modal({ titulo: `Bem-vindo ao ${cfg.nome}`, largura: 520, corpo: `<div class="col" style="gap:10px"><p class="mute-2">Seu teste vai até <b>${dataCurta(esp.teste_ate)}</b>. Três passos para começar:</p><div class="dica">${ic('upload-simple')}<span><b>Traga seus cadastros:</b> em Configurações, importe uma planilha (CSV) de clientes, produtos ou o que precisar.</span></div><div class="dica">${ic('user-plus')}<span><b>Convide a equipe:</b> cada pessoa entra com o próprio e-mail e vê tudo atualizado na hora.</span></div><div class="dica">${ic('phone')}<span><b>Use no celular:</b> abra este endereço no celular e toque em "Adicionar à tela inicial".</span></div></div>`, botoes: [{ rotulo: 'Começar', classe: 'pri', valor: true }] });
    },
  };
  return sessao;
}
export { BancoNuvem }; // usado nos testes
