// =============================================================
// Veltria · versão na nuvem (Supabase)
// -------------------------------------------------------------
// Entrada (e-mail e senha), escolha/criação da empresa ("espaço"),
// teste grátis de 7 dias, equipe com convites, importação de planilha
// e sincronização dos registros com o banco, inclusive em tempo real
// entre as pessoas da equipe. O sistema em si é o mesmo das
// demonstrações: só o Banco muda (BancoNuvem).
// Tabelas e regras de acesso: migração nexo_nuvem_espacos_e_registros.
// =============================================================
import { esc, ic, av, et, avisar, modal, confirmar, Banco, hoje, diasAte, dataCurta, normal, agrupar, imprimir } from './nexo.js';
import { cargosDe, resumoAcesso, editarPermissoes } from './equipe.js';

// não abre dentro de página de outro site (proteção contra clickjacking; o GitHub Pages não deixa mandar X-Frame-Options)
if (window.top !== window.self) { try { if (window.top.location.origin !== location.origin) throw 0; } catch { window.top.location.href = location.href; } }

const SITE = 'https://bluerose-store.com/';
// Dentro do app da Google Play (Veltria) não há venda nem teste com cartão: a regra de pagamentos da loja
// não permite levar a compra para fora. O app abre /app/play/?origem=play, que marca este aparelho.
// versão da Play Store: o app abre com ?origem=play (Veltria e Ofixl); a assinatura é só pelo site, nada de compra dentro do app
const PLAY = (() => { try { if (new URLSearchParams(location.search).get('origem') === 'play') localStorage.setItem('nexo-play', '1'); return localStorage.getItem('nexo-play') === '1'; } catch { return false; } })();
const LOGO = new URL('blue-rose.png', import.meta.url).href, LOGO_NEXO = new URL('veltria.png?v=1', import.meta.url).href;
const SEP = '\u0001';
// Plano Pro: equipe sem limite (Básico: 5 pessoas além do dono), histórico da equipe (os sistemas usam sempre a marca Blue Rose),
// até 10 empresas por sistema e suporte prioritário. Custa R$ 60 a mais por mês (catálogo a-sis-<app>-pro).
const LIMITE_BASICO = 5, EXTRA_PRO = 60;
const SUPORTE = [64, 64, 60, 65, 68, 68, 60, 64, 59, 59, 66, 63, 65].map((c) => String.fromCharCode(c - 11)).join(''); // WhatsApp da Blue Rose (mesmo do site)
const BENEFICIOS_BASE = [['users-three', 'Equipe sem limite', 'Convide quantas pessoas quiser (o Básico vai até 5 além de você).'], ['clock', 'Histórico da equipe', 'Veja quem criou ou mudou cada registro, e quando.'], ['buildings', 'Até 10 empresas ou filiais', 'Cada uma com os próprios dados e equipe (o Básico vai até 3).'], ['chat-circle', 'Suporte prioritário', 'Atendimento pelo WhatsApp com resposta no mesmo dia útil.'], ['printer', 'Impressos só com a sua marca', 'Orçamentos, recibos e relatórios sem o rodapé da Blue Rose.']];
const BENEFICIOS_AVISOS = ['bell-ringing', 'Avisos e mensagens prontas', 'Quem cobrar, confirmar e chamar de volta, com a mensagem pronta no WhatsApp.'];
// cada sistema pode trazer os recursos Pro dele (cfg.beneficiosPro), que aparecem primeiro
const beneficiosPro = (cfg) => [...(cfg.beneficiosPro || []), ...((cfg.paginas || []).some((p) => p.id === 'avisos') ? [BENEFICIOS_BASE[0], BENEFICIOS_AVISOS, ...BENEFICIOS_BASE.slice(1)] : BENEFICIOS_BASE)];
// plano anual: 12 meses com 20% de desconto (catálogo a-sis-<app>[-pro]-anual)
const anual = (mensal) => Math.round(mensal * 12 * 0.8);
const reais = (v) => `R$ ${Number(v).toLocaleString('pt-BR')}`;

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
  /** O que mudou aqui e ainda não está na nuvem: [registros alterados, registros apagados] */
  diferenca() {
    const atual = this.registrosAtuais(), ups = [], dels = [];
    for (const [k, [c, i, x]] of atual) { const j = JSON.stringify(x); if (this.foto.get(k) !== j) ups.push([c, i, x]); }
    for (const k of this.foto.keys()) if (!atual.has(k)) dels.push(k.split(SEP));
    return [ups, dels];
  }
  /** Guarda no aparelho o que ainda não subiu (internet caiu ou o sistema foi fechado no meio do envio) */
  guardarPendente() {
    try {
      const [ups, dels] = this.diferenca(), chave = `nuvem-pendente-${this.espaco}`;
      if (ups.length || dels.length) localStorage.setItem(chave, JSON.stringify({ quando: Date.now(), ups, dels }));
      else localStorage.removeItem(chave);
    } catch { /* sem espaço no aparelho: segue tentando pela internet */ }
  }
  /** Na abertura: devolve para a tela o que ficou guardado no aparelho e manda para a nuvem */
  recuperarPendente() {
    let p = null;
    try { p = JSON.parse(localStorage.getItem(`nuvem-pendente-${this.espaco}`) || 'null'); } catch { p = null; }
    if (!p || Date.now() - p.quando > 30 * 864e5) return 0;
    for (const [c, i, x] of p.ups || []) {
      if (c === '_cfg') { this.dados._cfg = x; continue; }
      const l = (this.dados[c] ||= []), k = l.findIndex((y) => String(y.id) === String(i));
      if (k >= 0) l[k] = { ...x, id: l[k].id }; else l.unshift(x);
    }
    for (const [c, i] of p.dels || []) { const l = this.dados[c]; if (Array.isArray(l)) { const k = l.findIndex((y) => String(y.id) === String(i)); if (k >= 0) l.splice(k, 1); } }
    const n = (p.ups || []).length + (p.dels || []).length;
    if (n) this.gravar();
    return n;
  }
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
      if (this.situacao === 'salvo' && !this.diferenca().flat().length) try { localStorage.removeItem(`nuvem-pendente-${this.espaco}`); } catch { /* ok */ }
    } catch (e) {
      this.estado('erro'); this.guardarPendente();
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
    <div class="marca" style="padding:0 0 18px"><img class="marca-logo" src="${cfg.logo || LOGO_NEXO}" alt="${cfg.logo ? esc(cfg.nome) : 'Blue Rose'}" width="30" height="30"><div><b>${esc(cfg.nome)}</b><small>${esc(cfg.marcaSub || `Blue Rose · ${cfg.sub}`)}</small></div></div>
    ${conteudo}</div><p class="entrada-pe"><a class="entrada-br" href="${SITE}" target="_blank" rel="noopener"><img src="${LOGO}" alt="" width="18" height="18">Blue Rose Express</a> Seus dados ficam guardados com segurança e só a sua equipe tem acesso. <a href="${SITE}privacidade.html" target="_blank" rel="noopener">Privacidade</a> · <a href="${SITE}termos.html" target="_blank" rel="noopener">Termos</a></p></div>`;
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
    const titulos = { criar: ['Crie a sua conta', 'Leva menos de um minuto. No próximo passo você escolhe: testar 7 dias grátis ou assinar direto.'], entrar: ['Entrar', PLAY ? 'Use o mesmo e-mail e senha da sua conta Blue Rose.' : 'Acesse o sistema da sua empresa.'], esqueci: ['Recuperar a senha', 'Enviamos um link para criar uma senha nova.'] };
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
        if (await senhaVazada(d.senha)) { erro.textContent = SENHA_VAZADA; btn.disabled = false; return; }
        const { data, error } = await sb.auth.signUp({ email: d.email.trim(), password: d.senha, options: { data: { nome: d.nome.trim() }, emailRedirectTo: location.origin + location.pathname } });
        if (error) throw error;
        if (data.session) { resolver(data.session); return; }
        tela(cfg, `<h1 class="entrada-t">Confirme o seu e-mail</h1><p class="entrada-s">Enviamos um link para <b>${esc(d.email)}</b>. Abra o link para ativar a conta e continuar.</p><div class="dica">${ic('envelope-open')}<span>Não chegou? Confira a caixa de spam ou promoções.</span></div><div class="entrada-links"><a href="#" data-modo="entrar">Já confirmei, quero entrar</a></div>`);
        document.querySelector('[data-modo]').onclick = (e) => { e.preventDefault(); telaConta(sb, cfg, 'entrar').then(resolver); };
      } catch (ex) { erro.textContent = erroAuth(ex); btn.disabled = false; }
    };
  });
}
// senha que já apareceu em vazamentos (Have I Been Pwned): só os 5 primeiros caracteres do SHA-1 saem do aparelho; se o serviço falhar, deixa passar
const SENHA_VAZADA = 'Essa senha já apareceu em vazamentos de dados na internet e é fácil de adivinhar. Escolha outra.';
async function senhaVazada(senha) {
  try {
    const h = [...new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(senha)))].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(`https://api.pwnedpasswords.com/range/${h.slice(0, 5)}`, { headers: { 'Add-Padding': 'true' }, signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return false;
    const resto = h.slice(5);
    return (await r.text()).split('\n').some((l) => { const [suf, n] = l.trim().split(':'); return suf === resto && Number(n) > 0; });
  } catch { return false; }
}
function telaNovaSenha(sb, cfg) {
  return new Promise((resolver) => {
    const f = tela(cfg, `<h1 class="entrada-t">Crie uma senha nova</h1><form class="col" style="gap:12px" novalidate><label class="campo">Senha nova<input name="senha" type="password" autocomplete="new-password" minlength="8" required></label><p class="er-tx" data-erro role="alert" style="min-height:1em;font-size:13px"></p><button class="btn pri" style="height:40px">Salvar senha</button></form>`);
    f.onsubmit = async (e) => { e.preventDefault(); if (!f.reportValidity()) return; if (await senhaVazada(new FormData(f).get('senha'))) { f.querySelector('[data-erro]').textContent = SENHA_VAZADA; return; } const { error } = await sb.auth.updateUser({ password: new FormData(f).get('senha') }); if (error) { f.querySelector('[data-erro]').textContent = erroAuth(error); return; } avisar('Senha alterada'); resolver(); };
  });
}
// ---------------------------------------------------------------- onde a empresa atua (cidade e estado)
// Pedido no primeiro acesso depois de assinar: a Blue Rose e os fornecedores parceiros sabem a região da empresa.
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const camposLocal = (v = {}) => `<div class="form-grade"><label class="campo">Cidade onde a empresa atua<input name="cidade" required minlength="2" maxlength="80" autocomplete="address-level2" placeholder="Ex.: Ribeirão Preto" value="${esc(v.cidade || '')}"></label>
  <label class="campo">Estado<select name="uf" required><option value="">Escolha</option>${UFS.map((u) => `<option ${v.uf === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
  <label class="campo largo">Também atende <span class="mute">(opcional)</span><input name="regiao" maxlength="160" placeholder="Ex.: toda a região de Ribeirão Preto, ou online para o Brasil" value="${esc(v.regiao || '')}"></label></div>`;
const salvarLocal = (sb, espaco, d) => sb.rpc('nexo_definir_local', { p_espaco: espaco, p_cidade: (d.cidade || '').trim(), p_uf: d.uf || '', p_regiao: (d.regiao || '').trim() || null });
function telaLocal(sb, cfg, esp) {
  return new Promise((resolver) => {
    const f = tela(cfg, `<h1 class="entrada-t">Onde a ${esc(esp.nome)} atua?</h1><p class="entrada-s">Pedimos uma vez só. Assim a Blue Rose e os fornecedores parceiros sabem a sua região (entregas, visitas e ofertas da sua cidade). Dá para mudar depois em Configurações.</p>
      <form class="col" style="gap:12px" novalidate>${camposLocal(esp)}<p class="er-tx" data-erro role="alert" style="min-height:1em;font-size:13px"></p><button class="btn pri" style="height:40px">Continuar</button></form>`);
    f.querySelector('[name=cidade]')?.focus();
    f.onsubmit = async (e) => {
      e.preventDefault(); if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f)), btn = f.querySelector('button'); btn.disabled = true;
      const { error } = await salvarLocal(sb, esp.id, d);
      if (error) { f.querySelector('[data-erro]').textContent = error.message.replace(/^.*?: /, ''); btn.disabled = false; return; }
      resolver({ cidade: d.cidade.trim(), uf: d.uf, regiao: (d.regiao || '').trim() || null });
    };
  });
}

function telaEmpresa(sb, cfg, espacos, precisaToken = false) {
  return new Promise((resolver) => {
    const lista = espacos.length ? `<h2 style="font-size:14px;margin:4px 0 8px">Suas empresas</h2><ul class="lista entrada-lista">${espacos.map((s) => `<li class="clicavel" data-esp="${s.id}">${av(s.nome)}<div class="cresce"><div class="t corta">${esc(s.nome)}</div><div class="s">${s.plano === 'ativo' ? 'Plano ativo' : diasAte(s.teste_ate) >= 0 ? `Teste até ${dataCurta(s.teste_ate)}` : 'Teste encerrado'}</div></div>${ic('caret-right')}</li>`).join('')}</ul><div class="entrada-ou">ou</div>` : '';
    const f = tela(cfg, `<h1 class="entrada-t">${espacos.length ? 'Escolha a empresa' : 'Vamos configurar sua empresa'}</h1><p class="entrada-s">${espacos.length ? '' : 'Leva menos de um minuto. Depois você convida a sua equipe.'}</p>${lista}
      <form class="col" style="gap:12px" novalidate><label class="campo">Nome da empresa<input name="nome" required maxlength="120" placeholder="Ex.: ${esc(cfg.empresa)}"></label>
      ${camposLocal()}
      <div class="dica">${ic('upload-simple')}<span>A empresa começa <b>em branco</b>. Logo depois de criar, você sobe as suas planilhas (Excel) e o sistema preenche os cadastros sozinho.</span></div>
      ${cfg.modelos?.length ? `<label class="campo">Tipo de negócio<select name="ramo">${cfg.modelos.map((m) => `<option value="${m.id}">${esc(m.nome)}</option>`).join('')}<option value="__outro">Outro (escrever o meu)</option></select><span class="ajuda">Já começa com os serviços e cadastros típicos do seu ramo</span></label>
      <label class="campo" data-ramo-outro style="display:none">Qual é o seu ramo?<input name="ramo_outro" maxlength="60" placeholder="Ex.: conserto de bicicletas"><span class="ajuda">A empresa começa em branco, e você cadastra os seus serviços do seu jeito</span></label>` : ''}
      ${precisaToken ? `<label class="campo">Token de dono<input name="token" required autocomplete="off" spellcheck="false" placeholder="${esc(cfg.id.toUpperCase().slice(0, 6))}-XXXX-XXXX-XXXX" style="font-family:var(--mono);text-transform:uppercase"><span class="ajuda">Enviamos para o seu e-mail quando o teste ou a assinatura começou, e ele também aparece em <a href="${SITE}conta.html" target="_blank" rel="noopener">Minha conta</a>. Só é pedido agora, na primeira vez. <a href="#" data-reenviar>Não recebeu? Enviar de novo para o meu e-mail</a></span></label>` : ''}
      <label class="campo">Chave PIX da empresa <span class="mute">(opcional)</span><input name="pix" placeholder="CNPJ, e-mail, celular ou chave aleatória"><span class="ajuda">Para as cobranças e links de pagamento já saírem com o QR code. Dá para colocar depois.</span></label>
      <p class="er-tx" data-erro role="alert" style="min-height:1em;font-size:13px"></p><button class="btn pri" style="height:40px">Criar a empresa</button></form>
      <div class="entrada-links"><a href="#" data-sair>Sair desta conta</a></div>`);
    document.querySelectorAll('[data-esp]').forEach((li) => (li.onclick = () => resolver({ id: li.dataset.esp, novo: false })));
    // "Outro": a pessoa escreve o ramo dela em vez de escolher um modelo pronto
    const selRamo = f.querySelector('[name="ramo"]'), boxOutro = f.querySelector('[data-ramo-outro]');
    // (style.display e não hidden: o .campo tem display:flex, que anula o atributo hidden)
    selRamo?.addEventListener('change', () => { const outro = selRamo.value === '__outro'; boxOutro.style.display = outro ? '' : 'none'; boxOutro.querySelector('input').required = outro; if (outro) boxOutro.querySelector('input').focus(); });
    // manda o token de dono de novo para o e-mail da conta usada na assinatura
    document.querySelector('[data-reenviar]')?.addEventListener('click', async (ev) => {
      ev.preventDefault(); const a = ev.currentTarget, erro = f.querySelector('[data-erro]');
      const { data, error } = await sb.rpc('nexo_reenviar_token', { p_app: cfg.id });
      if (error) { erro.textContent = /MUITOS/.test(error.message) ? 'Você já pediu algumas vezes. Espere um pouco e confira a caixa de spam.' : /SEM_TOKEN/.test(error.message) ? 'O token é criado quando o teste ou a assinatura começa. Atualize a página em alguns minutos.' : error.message; return; }
      a.replaceWith(Object.assign(document.createElement('b'), { textContent: `Pedido feito: o token chega em ${data} em alguns minutos (confira o spam). Ele também aparece em Minha conta.` }));
    });
    document.querySelector('[data-sair]').onclick = async (e) => { e.preventDefault(); await sb.auth.signOut(); location.reload(); };
    f.onsubmit = async (e) => {
      e.preventDefault(); if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f)), btn = f.querySelector('button'); btn.disabled = true;
      const { data, error } = await sb.rpc('nexo_criar_espaco', { p_app: cfg.id, p_nome: d.nome.trim(), p_token: (d.token || '').trim() || null });
      if (error) {
        if (/cartão/.test(error.message)) { location.reload(); return; }
        f.querySelector('[data-erro]').textContent = /TOKEN_INVALIDO/.test(error.message) ? 'Token de dono incorreto. Confira no e-mail ou em Minha conta.' : /TOKEN_DONO/.test(error.message) ? 'Informe o token de dono que enviamos para o seu e-mail.' : /limite/.test(error.message) ? 'Você chegou ao limite de empresas do seu plano neste sistema.' : error.message;
        btn.disabled = false; return;
      }
      await salvarLocal(sb, data, d).then(() => {}, () => {}); // se falhar, é pedido de novo ao abrir
      const outro = d.ramo === '__outro';
      resolver({ id: data, novo: true, exemplo: false, nome: d.nome.trim(), ramo: outro ? '' : d.ramo || '', ramoNome: outro ? String(d.ramo_outro || '').trim().slice(0, 60) : '', pix: (d.pix || '').trim() });
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
    const f = tela(cfg, `<h1 class="entrada-t">Comece a usar o ${esc(cfg.nome)}</h1><p class="entrada-s">Teste 7 dias grátis com os dados da sua empresa ou, se já decidiu, assine direto.</p>
      <div class="planos-escolha" role="radiogroup" aria-label="Plano depois do teste"><label><input type="radio" name="plano" value="" checked form="form-teste"><span><b>Mensal</b><small>R$ ${preco}/mês</small></span></label><label><input type="radio" name="plano" value="-anual" form="form-teste"><span><b>Anual <em>−20%</em></b><small>${reais(anual(preco))}/ano · sai ${reais(Math.round(anual(preco) / 12))}/mês</small></span></label></div>
      <ul class="lista-teste"><li>${ic('credit-card', 'p')}<span>Para começar, cadastre o cartão no Mercado Pago.</span></li><li>${ic('calendar-check', 'p')}<span>Se não cancelar, a assinatura do plano escolhido começa sozinha no 8º dia.</span></li><li>${ic('x-circle', 'p')}<span>Cancele quando quiser em <a href="${SITE}conta.html" target="_top">Minha conta</a>. Cancelando no teste, nada é cobrado.</span></li><li>${ic('info', 'p')}<span>O teste grátis vale uma vez por cartão e por pessoa.</span></li></ul>
      <form class="col" style="gap:12px" novalidate id="form-teste"><label class="campo">E-mail da sua conta do Mercado Pago<input name="mp" type="email" value="${esc(email)}" required><span class="ajuda">A assinatura fica na conta do Mercado Pago com este e-mail.</span></label>
        <label class="flex" style="gap:8px;align-items:flex-start;font-size:13px;color:var(--tx-2)"><input type="checkbox" name="ok" required style="margin-top:3px"><span>Tenho 18 anos ou mais. Li e aceito os <a href="${SITE}termos.html" target="_blank" rel="noopener">Termos de Serviço</a> e a cobrança automática (depois do teste, se eu escolher o teste).</span></label>
        <p class="er-tx" data-erro role="alert" style="min-height:1em;font-size:13px"></p><button class="btn pri" style="height:40px">Cadastrar cartão e começar o teste</button>
        <button type="button" class="btn" style="height:40px" data-direto>Assinar agora, sem o teste grátis</button></form>
      <div class="entrada-links"><a href="${SITE}demos/sistemas/${cfg.id}/" target="_top">Ver a demonstração antes</a><span>·</span><a href="#" data-sair>Sair desta conta</a></div>`);
    document.querySelector('[data-sair]').onclick = async (e) => { e.preventDefault(); await sb.auth.signOut(); location.reload(); };
    f.onsubmit = async (e) => {
      e.preventDefault(); if (!f.reportValidity()) return;
      const btn = f.querySelector('button'), erro = f.querySelector('[data-erro]'); btn.disabled = true; btn.textContent = 'Abrindo o Mercado Pago…'; erro.textContent = '';
      const sufixo = document.querySelector('[name=plano]:checked')?.value || '';
      try { const j = await pagamentos(sb, { acao: 'iniciar', produto: `a-sis-${cfg.id}${sufixo}`, teste: true, email_mp: f.mp.value.trim() }); location.href = j.link; }
      catch (x) {
        btn.disabled = false; btn.textContent = 'Cadastrar cartão e começar o teste';
        if (x.dados?.sem_teste) { erro.innerHTML = `${esc(x.message)} <a href="#" data-assinar>Assinar ${sufixo ? `por ${reais(anual(preco))}/ano` : `por R$ ${preco}/mês`}</a>`; erro.querySelector('[data-assinar]').onclick = async (ev) => { ev.preventDefault(); try { const j = await pagamentos(sb, { acao: 'iniciar', produto: `a-sis-${cfg.id}${sufixo}`, email_mp: f.mp.value.trim() }); location.href = j.link; } catch (y) { erro.textContent = y.message; } }; }
        else erro.textContent = x.message;
      }
    };
    // quem já decidiu assinar não precisa passar pelo teste
    const direto = f.querySelector('[data-direto]');
    direto.onclick = async () => {
      if (!f.reportValidity()) return;
      const erro = f.querySelector('[data-erro]'), sufixo = document.querySelector('[name=plano]:checked')?.value || '';
      direto.disabled = true; direto.textContent = 'Abrindo o Mercado Pago…'; erro.textContent = '';
      try { const j = await pagamentos(sb, { acao: 'iniciar', produto: `a-sis-${cfg.id}${sufixo}`, email_mp: f.mp.value.trim() }); location.href = j.link; }
      catch (x) { direto.disabled = false; direto.textContent = 'Assinar agora, sem o teste grátis'; erro.textContent = x.message; }
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
  if (c.tipo === 'dias') { const m = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, 'sáb': 6 }; const l = v.toLowerCase().split(/[\s,;/]+/).map((x) => (/^\d$/.test(x) ? Number(x) : m[x.slice(0, 3)])).filter((x) => x >= 0 && x <= 6); return l.length ? [...new Set(l)].sort() : null; }
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
  // programa de indicação: quem chegou por um link de indicação fica ligado a quem indicou (uma vez por conta)
  try {
    const m = document.cookie.match(/(?:^|; )br_indica=([A-Z0-9]{6,16})/);
    if (m && localStorage.getItem(`nexo-indicacao-${uid}`) == null) { const { data: r } = await sb.rpc('nexo_registrar_indicacao', { p_codigo: m[1] }); if (r && r !== 'login') localStorage.setItem(`nexo-indicacao-${uid}`, r); }
  } catch { /* segue sem indicação */ }
  await sb.rpc('nexo_aceitar_convites');
  const { data: espacos, error } = await sb.from('nexo_espacos').select('id,nome,plano,teste_ate,dono,criado').eq('app', cfg.id).order('criado');
  if (error) throw error;
  const lembrado = (() => { try { return localStorage.getItem(`nexo-espaco-${cfg.id}`); } catch { return null; } })();
  if (!espacos.length || new URLSearchParams(location.search).has('trocar')) {
    tela(cfg, `<div class="vazio" style="padding:30px 0">${ic('circle')}<b>Conferindo o seu teste…</b></div>`);
    if (!(await temAcesso(sb, cfg))) await telaTeste(sb, cfg, email);
  }
  const precisaToken = async () => { const { data: tk } = await sb.from('nexo_tokens_dono').select('ativado').eq('app', cfg.id).maybeSingle(); return !tk?.ativado; };
  let escolha = espacos.length === 1 && !new URLSearchParams(location.search).has('trocar') ? { id: espacos[0].id } : espacos.find((s) => s.id === lembrado) && !new URLSearchParams(location.search).has('trocar') ? { id: lembrado } : await telaEmpresa(sb, cfg, espacos, await precisaToken());
  try { localStorage.setItem(`nexo-espaco-${cfg.id}`, escolha.id); } catch { /* ok */ }
  tela(cfg, `<div class="vazio" style="padding:30px 0">${ic('circle')}<b>${escolha.exemplo ? 'Preparando os dados de exemplo…' : 'Abrindo…'}</b></div>`);
  const { data: esp } = await sb.from('nexo_espacos').select('id,nome,plano,teste_ate,dono,nivel,pro_ate,cidade,uf,regiao').eq('id', escolha.id).single();
  if (esp.dono === uid && !esp.cidade) { Object.assign(esp, await telaLocal(sb, cfg, esp)); tela(cfg, `<div class="vazio" style="padding:30px 0">${ic('circle')}<b>Abrindo…</b></div>`); }
  const { data: eu } = await sb.from('nexo_membros').select('permissoes,papel').eq('espaco', escolha.id).eq('usuario', session.user.id).maybeSingle();
  const linhas = escolha.novo ? [] : await lerTudo(sb, escolha.id);
  const db = new BancoNuvem(sb, escolha.id, uid, linhas);
  const recuperados = db.recuperarPendente();
  if (recuperados) setTimeout(() => avisar(`${recuperados} ${recuperados === 1 ? 'alteração que não tinha subido foi enviada' : 'alterações que não tinham subido foram enviadas'} agora para a nuvem.`), 1500);
  if (escolha.novo) {
    if (escolha.exemplo) { const s = cfg.semente(); for (const [k, v] of Object.entries(s)) if (k !== '_cfg') db.dados[k] = v.map((x) => ({ id: x.id || Math.random().toString(36).slice(2, 10), ...x })); }
    db.dados._cfg = { ...(escolha.exemplo ? cfg.semente()._cfg || {} : {}), empresa: escolha.nome, ...(escolha.ramo && !escolha.exemplo ? { ramo_pendente: escolha.ramo } : {}), ...(escolha.ramoNome ? { ramo_nome: escolha.ramoNome } : {}), ...(escolha.pix ? { pix: { chave: escolha.pix, nome: escolha.nome.slice(0, 25), cidade: '' } } : {}) };
    await db.enviar();
  }
  const proCortesia = esp.nivel !== 'pro' && esp.pro_ate && diasAte(esp.pro_ate) >= 0 ? esp.pro_ate : null;
  const dono = esp.dono === uid, pro = esp.nivel === 'pro' || !!proCortesia; imprimir.semRodape = () => pro;
  const papel = dono ? 'dono' : eu?.papel === 'admin' ? 'admin' : 'membro', gestor = papel !== 'membro';
  const minhas = gestor ? null : eu?.permissoes || null;
  let plano = null; // assinatura atual do dono (mensal ou anual, Básico ou Pro), lida quando abre o Painel do dono
  const teste = esp.plano === 'teste', restam = diasAte(esp.teste_ate), encerrado = esp.plano === 'suspenso' || (teste && restam < 0);
  let equipe = [], convites = [];
  const carregarEquipe = async () => {
    const [m, c] = await Promise.all([sb.from('nexo_membros').select('usuario,email,papel,permissoes').eq('espaco', esp.id), gestor ? sb.from('nexo_convites').select('email,papel,criado,permissoes').eq('espaco', esp.id) : { data: [] }]);
    equipe = m.data || []; convites = c.data || []; if (['config', 'dono'].includes(app.pagina?.id)) app.render();
  };

  const sessao = {
    db, sb, uid, email, espaco: esp, dono, pro, papel, gestor,
    acesso: (pagina) => (pagina === 'suporte' ? 'editar' : pagina === 'dono' || pagina === 'importar' ? (gestor ? 'editar' : 'nenhum') : !minhas || minhas.total ? 'editar' : minhas.paginas?.[pagina] || minhas.padrao || 'ver'),
    podeExcluir: () => !minhas || !!minhas.total || !!minhas.excluir,
    funcao: async (nome, corpo) => { const { data, error } = await sb.functions.invoke(nome, { body: { espaco: esp.id, ...corpo } }); if (error) { let msg = error.message; try { msg = (await error.context.json()).erro || msg; } catch { /* ok */ } throw new Error(msg); } return data; },
    salvarSegredo: async (chave, valor) => { const { error } = await sb.rpc('nexo_salvar_segredo', { p_espaco: esp.id, p_chave: chave, p_valor: valor || '' }); if (error) throw error; },
    integracoes: async () => { const { data } = await sb.rpc('nexo_integracoes', { p_espaco: esp.id }); return Object.fromEntries((data || []).map((x) => [x.chave, x.atualizado])); },
    faixa: () => `<div class="faixa nao-imprime"><span class="so-larga">${encerrado ? '<b>Seu teste terminou.</b> Os dados continuam aqui, só para consulta.' : teste ? `Teste grátis · <b>${restam === 0 ? 'último dia' : `${restam} ${restam === 1 ? 'dia' : 'dias'} restantes`}</b>` : `<b>${esc(esp.nome)}</b> · ${pro && !cfg.produto?.unico ? 'plano Pro' : 'plano ativo'}`}</span><span class="sep so-larga"></span>
      <span data-sync class="so-larga" style="opacity:.8">Salvo</span><span class="sep so-larga"></span><span class="so-larga" style="opacity:.8">${esc(email)}</span>
      ${PLAY ? '<a class="cta" href="../play/">Meus sistemas</a>' : `<a class="cta" href="${SITE}conta.html" target="_top">${encerrado ? 'Assinar para continuar' : 'Minha conta'}</a>`}</div>`,
    subConta: () => (teste ? `Teste até ${dataCurta(esp.teste_ate)}` : pro && !cfg.produto?.unico ? 'Plano Pro' : 'Plano ativo'),
    cartaoEquipe: () => {
      const outros = equipe.filter((m) => m.papel !== 'dono').length + convites.length, cheio = !pro && outros >= LIMITE_BASICO;
      const linha = (av_, t_, s_, botoes) => `<li>${av_}<div class="cresce"><div class="t corta">${t_}</div><div class="s">${s_}</div></div>${botoes}</li>`;
      const mexe = (pp) => pp === 'membro' || (pp === 'admin' && dono);
      return `<div class="cartao"><div class="cartao-cab"><div><h3>Equipe</h3><div class="sub">${pro ? 'Equipe sem limite' : `${outros} de ${LIMITE_BASICO} pessoas convidadas`} · cada pessoa entra com o próprio e-mail</div></div>${pro && !cfg.produto?.unico ? et('Pro', 'ok') : ''}</div>
      <ul class="lista">${equipe.sort((x, y) => ({ dono: 0, admin: 1 }[x.papel] ?? 2) - ({ dono: 0, admin: 1 }[y.papel] ?? 2)).map((m) => linha(av(m.email), `${esc(m.email)}${m.usuario === uid ? ' <span class="mute">(você)</span>' : ''} ${m.papel === 'dono' ? et('Dono', 'acc') : m.papel === 'admin' ? et('Administrador', 'info') : ''}`, esc(resumoAcesso(m.permissoes, m.papel)),
        gestor && m.usuario !== uid && mexe(m.papel) ? `<button type="button" class="btn fant peq" data-acao="acessoMembro" data-u="${m.usuario}">${ic('key')}Cargo e acesso</button><button type="button" class="btn fant peq" data-acao="removerMembro" data-u="${m.usuario}">Remover</button>` : '')).join('')}
      ${convites.map((c) => linha(av(c.email), `${esc(c.email)} ${c.papel === 'admin' ? et('Administrador', 'info') : ''}`, `Convite de ${dataCurta(c.criado)} · ${esc(resumoAcesso(c.permissoes, c.papel === 'admin' ? 'admin' : ''))}`, mexe(c.papel) ? `<button type="button" class="btn fant peq" data-acao="linkConvite" data-e="${esc(c.email)}">${ic('link')}Link</button><button type="button" class="btn fant peq" data-acao="acessoConvite" data-e="${esc(c.email)}">${ic('key')}Acesso</button><button type="button" class="btn fant peq" data-acao="cancelarConvite" data-e="${esc(c.email)}">Cancelar</button>` : '')).join('')}</ul>
      ${gestor ? `<div class="cartao-corpo" style="border-top:1px solid var(--borda)">${cheio ? `<div class="dica">${ic('users-three')}<span>Você chegou a ${LIMITE_BASICO} pessoas, o limite do plano Básico. <a href="#" data-acao="verPro">Veja o Pro</a> para convidar sem limite.</span></div>` : `<div class="entre"><span class="mute-2" style="font-size:12.5px">No convite você escolhe o cargo e o que a pessoa pode ver e editar.</span><button type="button" class="btn pri" data-acao="convidar">${ic('user-plus')}Convidar pessoa</button></div>`}</div>` : ''}</div>
      ${dono || pro ? sessao.cartaoPro() : ''}`;
    },
    // Painel do dono: só o dono e os administradores veem
    painelDono: () => {
      if (!gestor) return '';
      if (dono && !plano) sessao.carregarPlano();
      const meus = equipe.filter((m) => m.papel !== 'dono').length, nConv = convites.length, adms = equipe.filter((m) => m.papel === 'admin').length;
      const unico = !!cfg.produto?.unico, p = plano?.assinatura, periodo = String(p?.produto || '').endsWith('-anual') ? 'anual' : 'mensal';
      const nomePlano = unico ? `Plano único ${p ? periodo : ''}`.trim() : p ? `${String(p.produto).includes('-pro') ? 'Pro' : 'Básico'} ${periodo}` : pro ? 'Pro' : 'Básico';
      const tk = plano?.token;
      const cartoes = [
        ['crown', 'Sua função', dono ? 'Dono' : 'Administrador', dono ? 'Acesso a tudo, inclusive plano e administradores' : 'Organiza a equipe; o plano é com o dono'],
        ['users-three', 'Equipe', `${meus + 1} ${meus ? 'pessoas' : 'pessoa'}`, pro ? 'Sem limite de pessoas' : `${meus + nConv} de ${LIMITE_BASICO} convites usados${adms ? ` · ${adms} admin` : ''}`],
        ['shield-check', 'Token de dono', dono ? (tk?.ativado ? 'Ativado' : plano ? 'Pendente' : '…') : 'Do dono', dono ? (tk?.ativado ? `desde ${dataCurta(String(tk.ativado).slice(0, 10))}` : 'Ativado no primeiro acesso') : 'Só o dono tem o token'],
        ['calendar-check', 'Plano', nomePlano, teste ? `Teste até ${dataCurta(esp.teste_ate)}` : p?.proxima_cobranca ? `Próxima cobrança ${dataCurta(p.proxima_cobranca)}` : 'Plano ativo'],
      ];
      const precoBase = cfg.produto?.mensal || 0, precoPro = unico ? precoBase : precoBase + EXTRA_PRO, ehAnual = String(p?.produto || '').endsWith('-anual');
      return `<div class="dica">${ic('crown')}<span>Só o dono${dono ? '' : ' e os administradores'} veem este painel. ${dono ? 'Os administradores que você escolher também entram aqui para organizar a equipe.' : ''}</span></div>
        <div class="grade g4" style="gap:12px">${cartoes.map(([i, t_, v, s_]) => `<div class="cartao" style="padding:14px 16px"><div class="flex" style="gap:8px;color:var(--tx-3);font-size:12.5px">${ic(i, 'p')}${t_}</div><b style="display:block;font-size:19px;margin-top:6px">${esc(v)}</b><div class="mute-2" style="font-size:12px;margin-top:2px">${esc(s_)}</div></div>`).join('')}</div>
        <div class="grade g2" style="align-items:start">
          <div class="col" style="gap:16px">${sessao.cartaoEquipe()}${sessao.cartaoIndicacao()}</div>
          <div class="col" style="gap:16px">
            <div class="cartao"><div class="cartao-cab"><div><h3>Cargos sugeridos</h3><div class="sub">No convite, o cargo já marca o que a pessoa pode fazer</div></div></div><ul class="lista">${cargosDe(cfg).map(([n, pr]) => `<li><div class="cresce"><div class="t">${esc(n)}</div><div class="s">${esc(resumoAcesso({ ...pr, cargo: '' }))}</div></div></li>`).join('')}<li><div class="cresce"><div class="t">Administrador</div><div class="s">Acesso total e entra neste painel${dono ? '' : ' · só o dono escolhe'}</div></div></li></ul></div>
            ${dono && !PLAY ? `<div class="cartao"><div class="cartao-cab"><div><h3>Plano e pagamento</h3><div class="sub">${esc(nomePlano)}${p?.valor ? ` · ${reais(p.valor)}${ehAnual ? '/ano' : '/mês'}` : ''}</div></div></div><div class="cartao-corpo col" style="gap:10px">
              ${ehAnual ? `<div class="dica">${ic('check-circle')}<span>Você está no plano anual e já economiza 20%.</span></div>` : `<div class="entre"><span class="mute-2">Pague por ano e economize 20%: ${reais(anual(pro ? precoPro : precoBase))}/ano no lugar de ${reais((pro ? precoPro : precoBase) * 12)}</span><button type="button" class="btn pri" data-acao="mudarAnual">${ic('calendar-check')}Mudar para o anual</button></div>`}
              <div class="entre"><span class="mute-2">Ver cobranças, cancelar ou trocar o cartão</span><a class="btn" href="${SITE}conta.html" target="_top">${ic('user')}Minha conta</a></div></div></div>` : ''}
          </div></div>`;
    },
    carregarIndicacao: async () => {
      if (sessao._lendoInd) return; sessao._lendoInd = true;
      let data = null; try { ({ data } = await sb.rpc('nexo_minha_indicacao')); } catch { data = null; }
      sessao.indicacao = data || { erro: true };
      if (app.pagina?.id === 'dono') app.render();
    },
    cartaoIndicacao: () => {
      if (!dono) return '';
      const r = sessao.indicacao; if (!r) { sessao.carregarIndicacao(); return ''; }
      if (r.erro) return '';
      const link = `${SITE}?indica=${r.codigo}`, texto = `Uso o ${cfg.nome} da Blue Rose na minha empresa e recomendo. Teste 7 dias grátis por este link: ${link}`;
      const naRoda = r.confirmados % 3, cortesia = (r.pro_ate || []).map((x) => x.ate).sort().pop();
      return `<div class="cartao"><div class="cartao-cab"><div><h3>Indique e ganhe</h3><div class="sub">A cada 3 indicações que assinam, você ganha 1 mês de Pro pagando o Básico</div></div>${et(`${r.confirmados} ${r.confirmados === 1 ? 'assinou' : 'assinaram'}`, r.confirmados ? 'ok' : '')}</div>
        <div class="cartao-corpo col" style="gap:12px">
          <div class="flex" style="gap:8px"><input readonly value="${esc(link)}" aria-label="Seu link de indicação" style="flex:1;min-width:0" data-ind-link><button type="button" class="btn" data-acao="copiarIndicacao">${ic('copy')}Copiar</button><a class="btn pri" href="https://wa.me/?text=${encodeURIComponent(texto)}" target="_blank" rel="noopener">${ic('whatsapp-logo')}WhatsApp</a></div>
          <div><div class="entre" style="font-size:12.5px;margin-bottom:6px"><span class="mute-2">${naRoda} de 3 para o próximo mês de Pro</span><span class="mute-2">${r.cadastrados} ${r.cadastrados === 1 ? 'pessoa entrou' : 'pessoas entraram'} pelo seu link</span></div><div class="prog"><i style="width:${Math.round((naRoda / 3) * 100)}%"></i></div></div>
          ${cortesia ? `<div class="dica ok-fundo">${ic('crown')}<span>Pro de cortesia até <b>${dataCurta(cortesia)}</b>, pelas suas indicações. Você continua pagando o Básico.</span></div>` : ''}
          ${r.meses_guardados ? `<div class="dica">${ic('gift')}<span>${r.meses_guardados} ${r.meses_guardados === 1 ? 'mês' : 'meses'} de Pro guardado${r.meses_guardados === 1 ? '' : 's'}: entra${r.meses_guardados === 1 ? '' : 'm'} assim que você tiver uma empresa no plano Básico.</span></div>` : ''}
          <p class="mute" style="font-size:12px;margin:0">Conta quando a pessoa cria uma conta nova pelo seu link e paga a primeira mensalidade (depois do teste grátis). <a href="${SITE}termos.html#indicacao" target="_blank" rel="noopener">Regras</a></p>
        </div></div>`;
    },
    carregarPlano: async () => {
      if (sessao._lendoPlano) return; sessao._lendoPlano = true;
      const [r, { data: tk }] = await Promise.all([pagamentos(sb, { acao: 'status' }).catch(() => ({ assinaturas: [] })), sb.from('nexo_tokens_dono').select('ativado').eq('app', cfg.id).maybeSingle()]);
      const valendo = (r.assinaturas || []).filter((a) => a.app === cfg.id && ['ativa', 'teste', 'paga'].includes(a.status));
      plano = { assinatura: valendo[0] || null, token: tk || null };
      if (app.pagina?.id === 'dono') app.render();
    },
    cartaoPro: () => pro
      ? `<div class="cartao"><div class="cartao-cab"><div><h3>${cfg.produto?.unico ? 'Tudo incluso no seu plano' : 'Plano Pro'}</h3><div class="sub">${cfg.produto?.unico ? 'Equipe sem limite, histórico e suporte prioritário' : 'O que a sua empresa tem a mais'}</div></div>${et('Ativo', 'ok')}</div><div class="cartao-corpo col" style="gap:10px">
        <div class="entre"><span class="mute-2">Quem fez o quê no sistema</span><button type="button" class="btn" data-acao="atividadeEquipe">${ic('clock')}Histórico da equipe</button></div>

        <div class="entre"><span class="mute-2">Dúvida ou problema? Fale direto com a Blue Rose</span><a class="btn" target="_blank" rel="noopener" href="https://wa.me/${SUPORTE}?text=${encodeURIComponent(`Olá! Sou cliente Pro do ${cfg.nome} (${esp.nome}) e preciso de ajuda com: `)}">${ic('whatsapp-logo')}Suporte prioritário</a></div></div></div>`
      : `<div class="cartao"><div class="cartao-cab"><div><h3>Plano Pro</h3><div class="sub">Para equipes maiores, por R$ ${EXTRA_PRO} a mais por mês</div></div></div><div class="cartao-corpo col" style="gap:8px">
        ${beneficiosPro(cfg).map(([i, t_, d]) => `<div class="flex" style="gap:10px;align-items:flex-start">${ic(i)}<span><b>${t_}.</b> <span class="mute-2">${d}</span></span></div>`).join('')}
        <div class="entre" style="margin-top:6px"><span class="mute-2" style="font-size:12.5px">${PLAY ? 'Disponível na versão pelo site.' : 'O plano atual é cancelado sozinho quando o Pro começa: você não paga dois.'}</span>${PLAY ? '' : `<button type="button" class="btn pri" data-acao="mudarPro">${ic('crown')}Mudar para o Pro · R$ ${(cfg.produto?.mensal || 0) + EXTRA_PRO}/mês</button>`}</div></div></div>`,
    cartaoResumo: () => { const rs = db.cfg.resumo || {}; return `<div class="cartao"><div class="cartao-cab"><div><h3>Resumo diário por e-mail</h3><div class="sub">Um e-mail de manhã com o que importa no dia</div></div>${rs.ativo ? et('Ligado', 'ok') : et('Desligado', '')}</div><div class="cartao-corpo"><form class="form-grade" data-resumo>
      <label class="campo">Enviar para<input name="email" type="email" value="${esc(rs.email || email)}"></label><label class="campo">Horário<select name="hora">${[6, 7, 8, 9, 10, 12, 18].map((h) => `<option value="${h}" ${Number(rs.hora || 7) === h ? 'selected' : ''}>${h}h</option>`).join('')}</select></label>
      <div class="campo largo" style="flex-direction:row;justify-content:flex-end;gap:8px">${rs.ativo ? '<button type="button" class="btn fant" data-acao="resumoDesligar">Desligar</button>' : ''}<button type="button" class="btn pri" data-acao="resumoLigar">${rs.ativo ? 'Salvar' : 'Ligar o resumo diário'}</button></div></form></div></div>`; },
    // backup semanal por e-mail: o Escritório da Blue Rose manda toda semana uma cópia de tudo (JSON) para o e-mail escolhido
    cartaoLocal: () => (dono ? `<div class="cartao" id="local"><div class="cartao-cab"><div><h3>Onde a empresa atua</h3><div class="sub">${esp.cidade ? `${esc(esp.cidade)}/${esc(esp.uf)}${esp.regiao ? ` · também atende: ${esc(esp.regiao)}` : ''}` : 'Ainda não informado'}</div></div><button class="btn peq" data-acao="localAlterar">${ic('map-pin')}Alterar</button></div></div>` : ''),
    cartaoBackup: () => { if (!gestor) return ''; const bk = db.cfg.backup || {}; return `<div class="cartao" id="backup"><div class="cartao-cab"><div><h3>Backup semanal por e-mail</h3><div class="sub">Toda semana, uma cópia completa dos seus dados chega no seu e-mail. Se algo der errado, você tem tudo guardado.</div></div>${bk.ativo ? et('Ligado', 'ok') : et('Desligado', 'al')}</div><div class="cartao-corpo"><form class="form-grade" data-backup>
      <label class="campo">Enviar para<input name="email" type="email" required value="${esc(bk.email || email)}"></label><label class="campo">Dia da semana<select name="dia">${[[1, 'Segunda'], [2, 'Terça'], [3, 'Quarta'], [4, 'Quinta'], [5, 'Sexta'], [6, 'Sábado'], [0, 'Domingo']].map(([n, r]) => `<option value="${n}" ${Number(bk.dia ?? 1) === n ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
      <p class="mute largo" style="margin:0;font-size:12.5px">O arquivo vem em anexo (.json) e pode ser restaurado com a nossa ajuda. Só pessoas da equipe podem receber.</p>
      <div class="campo largo" style="flex-direction:row;justify-content:flex-end;gap:8px">${bk.ativo ? '<button type="button" class="btn fant" data-acao="backupDesligar">Desligar</button>' : ''}<button type="button" class="btn pri" data-acao="backupLigar">${bk.ativo ? 'Salvar' : 'Ligar o backup semanal'}</button></div></form></div></div>`; },
    avisoBackup: () => { const bk = db.cfg.backup || {}; if (!gestor || bk.ativo || (bk.aviso_ate && bk.aviso_ate >= new Date().toISOString().slice(0, 10))) return '';
      return `<div class="cartao nao-imprime" style="border-color:var(--acc)"><div class="cartao-corpo entre" style="gap:12px;flex-wrap:wrap"><div class="flex" style="gap:12px;align-items:flex-start">${ic('shield-check')}<span><b>Proteja os seus dados: ligue o backup semanal.</b><br><span class="mute-2">Toda semana uma cópia completa chega no seu e-mail. Leva 10 segundos.</span></span></div><div class="flex" style="gap:8px"><button type="button" class="btn fant" data-acao="backupOcultar">Agora não</button><button type="button" class="btn pri" data-acao="backupLigarRapido">Ligar o backup semanal</button></div></div></div>`; },
    linhasDados: () => `${gestor ? `<div class="entre"><span class="mute-2">Trazer os seus cadastros de uma planilha do Excel ou CSV</span><a class="btn" href="#/importar">${ic('table')}Importar planilha</a></div>` : ''}
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
      addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && ['pendente', 'erro'].includes(db.situacao)) { db.guardarPendente(); db.enviar(); } });
      addEventListener('pagehide', () => { if (db.situacao !== 'salvo') db.guardarPendente(); });
      addEventListener('online', () => { if (db.situacao === 'erro') db.enviar(); });
      addEventListener('beforeunload', (e) => { if (['pendente', 'salvando', 'erro'].includes(db.situacao)) { db.guardarPendente(); db.enviar(); e.preventDefault(); e.returnValue = ''; } });
      Object.assign(app.acoes, {
        localAlterar: () => modal({ titulo: 'Onde a empresa atua', largura: 520, corpo: `<form class="col" style="gap:10px" onsubmit="return false">${camposLocal(esp)}</form>`,
          botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Salvar', classe: 'pri', acao: async (f) => {
            const fo = f.querySelector('form'); if (!fo.reportValidity()) return false;
            const d = Object.fromEntries(new FormData(fo)); const { error } = await salvarLocal(sb, esp.id, d);
            if (error) { avisar(error.message.replace(/^.*?: /, ''), { tipo: 'erro' }); return false; }
            Object.assign(esp, { cidade: d.cidade.trim(), uf: d.uf, regiao: (d.regiao || '').trim() || null }); avisar('Cidade salva'); app.render(); return true; } }] }),
        resumoLigar: () => { const f = document.querySelector('[data-resumo]'); if (!f.reportValidity()) return; db.cfg.resumo = { ativo: true, email: f.email.value.trim(), hora: Number(f.hora.value) }; db.gravar(); avisar(`Resumo diário ligado: chega todo dia às ${f.hora.value}h`); app.render(); },
        backupLigar: () => { const f = document.querySelector('[data-backup]'); if (!f.reportValidity()) return; db.cfg.backup = { ...(db.cfg.backup || {}), ativo: true, email: f.email.value.trim(), dia: Number(f.dia.value) }; db.gravar(); avisar('Backup semanal ligado: a cópia chega toda semana no seu e-mail'); app.render(); },
        backupLigarRapido: () => { db.cfg.backup = { ...(db.cfg.backup || {}), ativo: true, email: (db.cfg.backup || {}).email || email, dia: 1 }; db.gravar(); avisar(`Backup semanal ligado: toda segunda-feira em ${email}. Dá para mudar em Configurações.`, { tempo: 7000 }); app.render(); },
        backupDesligar: () => { db.cfg.backup = { ...(db.cfg.backup || {}), ativo: false }; db.gravar(); avisar('Backup semanal desligado'); app.render(); },
        backupOcultar: () => { const d = new Date(); d.setDate(d.getDate() + 30); db.cfg.backup = { ...(db.cfg.backup || {}), aviso_ate: d.toISOString().slice(0, 10) }; db.gravar(); app.render(); },
        resumoDesligar: () => { db.cfg.resumo = { ...(db.cfg.resumo || {}), ativo: false }; db.gravar(); avisar('Resumo diário desligado'); app.render(); },
        sair: async () => { if (await confirmar('Sair da sua conta neste aparelho?', { rotulo: 'Sair' })) { await db.enviar(); await sb.auth.signOut(); location.reload(); } },
        convidar: async () => {
          const r = await editarPermissoes(app, cfg, { titulo: 'Convidar pessoa', comEmail: true, podeAdmin: dono }); if (!r) return;
          r.email = String(r.email || '').trim().toLowerCase();
          // convidar o próprio e-mail não faz nada (a pessoa já é da empresa): avisa em vez de sumir com o convite
          if (r.email === String(email || '').toLowerCase()) return avisar('Esse é o seu próprio e-mail: você já está na empresa. Convide outra pessoa.', { tipo: 'erro', tempo: 6000 });
          if (equipe.some((m) => String(m.email || '').toLowerCase() === r.email)) return avisar('Essa pessoa já está na equipe.', { tipo: 'erro' });
          const { error: er } = await sb.from('nexo_convites').insert({ espaco: esp.id, email: r.email, permissoes: r.perm, papel: r.papel, convidado_por: (session.user.user_metadata?.nome || '').trim() || email });
          if (er) { if (/LIMITE_EQUIPE/.test(er.message)) return app.acoes.verPro(); return avisar(/duplicate/.test(er.message) ? 'Esse e-mail já foi convidado' : er.message, { tipo: 'erro' }); }
          db.cfg.convidou = true; db.gravar(); await carregarEquipe(); app.acoes.linkConvite({ e: r.email });
        },
        linkConvite: (d) => {
          const em = d.e, link = `${location.origin + location.pathname}?convite=${encodeURIComponent(em)}`, msg = `Oi! Te adicionei na equipe da ${db.cfg.empresa || esp.nome} no ${cfg.nome}. Crie a sua conta com este e-mail (${em}) por aqui: ${link}`;
          modal({ titulo: 'Convite enviado', largura: 480, corpo: `<p class="mute-2" style="margin-bottom:10px">Enviamos o convite para <b>${esc(em)}</b> por e-mail (chega em alguns minutos; peça para conferir o spam). A pessoa cria a conta com esse e-mail e já entra na empresa, sem pagar nada. Se ela já tiver conta, é só entrar.</p><p class="mute-2" style="margin-bottom:10px">Para ser mais rápido, mande também pelo WhatsApp ou copie o link:</p><input readonly value="${esc(link)}" style="width:100%">`,
            botoes: [{ rotulo: 'Copiar link', classe: 'fant', acao: () => { navigator.clipboard?.writeText(link).then(() => avisar('Link copiado')).catch(() => {}); return false; } }, { rotulo: 'Mandar no WhatsApp', classe: 'pri', acao: () => { window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener'); return true; } }] });
        },
        acessoMembro: async (d) => {
          const m = equipe.find((x) => x.usuario === d.u); if (!m) return;
          const r = await editarPermissoes(app, cfg, { titulo: `Cargo e acesso de ${m.email}`, atual: m.permissoes, papel: m.papel, podeAdmin: dono }); if (!r) return;
          if (dono && r.papel !== m.papel) { const { error: e1 } = await sb.rpc('nexo_definir_papel', { p_espaco: esp.id, p_usuario: m.usuario, p_papel: r.papel }); if (e1) return avisar(e1.message, { tipo: 'erro' }); }
          const { error: er } = await sb.rpc('nexo_definir_permissoes', { p_espaco: esp.id, p_usuario: m.usuario, p_permissoes: r.perm });
          if (er) return avisar(er.message, { tipo: 'erro' }); avisar('Cargo e acesso atualizados. Valem a partir da próxima vez que a pessoa abrir o sistema.'); carregarEquipe();
        },
        acessoConvite: async (d) => {
          const c = convites.find((x) => x.email === d.e); if (!c) return;
          const r = await editarPermissoes(app, cfg, { titulo: `Acesso de ${c.email}`, atual: c.permissoes, papel: c.papel, podeAdmin: dono }); if (!r) return;
          await sb.from('nexo_convites').delete().eq('espaco', esp.id).eq('email', c.email);
          const { error: er } = await sb.from('nexo_convites').insert({ espaco: esp.id, email: c.email, permissoes: r.perm, papel: r.papel });
          if (er) return avisar(er.message, { tipo: 'erro' }); avisar('Acesso do convite atualizado'); carregarEquipe();
        },
        verPro: () => modal({ titulo: `${cfg.nome} Pro`, largura: 520, corpo: `<div class="col" style="gap:10px">${beneficiosPro(cfg).map(([i, t_, d]) => `<div class="dica">${ic(i)}<span><b>${t_}.</b> ${d}</span></div>`).join('')}<p class="mute-2" style="font-size:13px">R$ ${(cfg.produto?.mensal || 0) + EXTRA_PRO}/mês. O plano atual é cancelado sozinho quando o Pro começa.</p></div>`,
          botoes: [{ rotulo: 'Agora não', valor: null, classe: 'fant' }, ...(PLAY || !dono ? [] : [{ rotulo: 'Mudar para o Pro', classe: 'pri', acao: () => { setTimeout(() => app.acoes.mudarPro(), 50); return true; } }])] }),
        mudarPro: async () => {
          if (!dono) return avisar('Só o dono da empresa muda o plano', { tipo: 'erro' });
          const mp = (cfg.produto?.mensal || 0) + EXTRA_PRO;
          const escolha = await modal({ titulo: `${cfg.nome} Pro`, largura: 460, corpo: `<p class="mute-2" style="margin-bottom:12px">Você vai para o Mercado Pago confirmar. Quando o Pro começar, o plano atual é cancelado sozinho: você não paga dois.</p>`,
            botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: `Mensal · R$ ${mp}/mês`, valor: '-pro' }, { rotulo: `Anual · ${reais(anual(mp))}/ano (−20%)`, classe: 'pri', valor: '-pro-anual' }] });
          if (!escolha) return;
          try { const j = await pagamentos(sb, { acao: 'iniciar', produto: `a-sis-${cfg.id}${escolha}`, email_mp: email }); location.href = j.link; } catch (x) { avisar(x.message, { tipo: 'erro' }); }
        },
        copiarIndicacao: async () => { const el = document.querySelector('[data-ind-link]'); if (!el) return; try { await navigator.clipboard.writeText(el.value); } catch { el.select(); document.execCommand('copy'); } avisar('Link copiado. Mande para quem pode usar o sistema.'); },
        mudarAnual: async () => {
          if (!dono) return avisar('Só o dono da empresa muda o plano', { tipo: 'erro' });
          const unico = !!cfg.produto?.unico, base = (cfg.produto?.mensal || 0) + (pro && !unico ? EXTRA_PRO : 0);
          if (!(await confirmar(`Mudar para o ${cfg.nome}${pro && !unico ? ' Pro' : ''} anual por ${reais(anual(base))}/ano (sai ${reais(Math.round(anual(base) / 12))} por mês, 20% a menos)? Você vai para o Mercado Pago confirmar. Quando o anual começar, o plano mensal é cancelado sozinho.`, { rotulo: 'Ir para o Mercado Pago', titulo: 'Plano anual' }))) return;
          try { const j = await pagamentos(sb, { acao: 'iniciar', produto: `a-sis-${cfg.id}${pro && !unico ? '-pro' : ''}-anual`, email_mp: email }); location.href = j.link; } catch (x) { avisar(x.message, { tipo: 'erro' }); }
        },
        atividadeEquipe: async () => {
          if (!pro) return app.acoes.verPro();
          const { data: l } = await sb.from('nexo_registros').select('colecao,id,autor,atualizado,dados').eq('espaco', esp.id).neq('colecao', '_cfg').order('atualizado', { ascending: false }).limit(120);
          const quem = new Map(equipe.map((m) => [m.usuario, m.email])), nome = (x) => x.dados?.nome || x.dados?.titulo || x.dados?.descricao || x.dados?.placa || x.dados?.numero || `#${x.id}`;
          const porDia = agrupar(l || [], (x) => String(x.atualizado).slice(0, 10));
          modal({ titulo: 'Histórico da equipe', largura: 620, corpo: (l || []).length ? `<div style="max-height:60vh;overflow:auto">${Object.entries(porDia).map(([dia, xs]) => `<h4 style="margin:12px 0 4px">${dataCurta(dia)}</h4><ul class="lista" style="margin:0 -20px">${xs.map((x) => `<li>${av(quem.get(x.autor) || '?')}<div class="cresce"><div class="t corta">${esc(String(nome(x)))}</div><div class="s">${esc(quem.get(x.autor) || 'pessoa que saiu da equipe')} · ${esc(app.colecoes?.[x.colecao]?.singular || x.colecao)} · ${new Date(x.atualizado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div></div></li>`).join('')}</ul>`).join('')}</div>` : '<p class="mute-2">Nada registrado ainda.</p>', botoes: [{ rotulo: 'Fechar', valor: null, classe: 'fant' }] });
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
      if (encerrado && PLAY) modal({ titulo: 'Acesso encerrado', largura: 460, corpo: `<p class="mute-2">Os dados da <b>${esc(esp.nome)}</b> continuam guardados e você pode consultá-los.</p>`, botoes: [{ rotulo: 'Entendi', valor: null, classe: 'pri' }] });
      else if (encerrado) modal({ titulo: 'Seu teste terminou', largura: 460, corpo: `<p class="mute-2">Os dados da <b>${esc(esp.nome)}</b> continuam guardados. Para voltar a usar, assine o ${esc(cfg.nome)}${cfg.produto?.unico ? "" : ", no Básico ou no Pro"}.</p>`, botoes: [{ rotulo: 'Só consultar', valor: null, classe: 'fant' }, { rotulo: 'Assinar', classe: 'pri', acao: () => { location.href = `${SITE}conta.html`; return true; } }] });
      else if (escolha.novo) {
        const tutorial = `${SITE}${cfg.paginaSite || `veltria-${cfg.id}.html`}#tutorial`;
        modal({ titulo: `Bem-vindo ao ${cfg.nome}`, largura: 540, corpo: `<div class="col" style="gap:10px"><p class="mute-2">Seu teste vai até <b>${dataCurta(esp.teste_ate)}</b>. A empresa está em branco: comece trazendo os seus dados.</p><div class="dica">${ic('upload-simple')}<span><b>Suba as suas planilhas:</b> em Importar planilha, envie o arquivo do Excel (clientes, produtos, agenda…) e o sistema preenche nomes, datas, horários, valores e fotos. Se não tiver planilha, baixe o modelo pronto.</span></div><div class="dica">${ic('crown')}<span><b>Convide a equipe no Painel do dono:</b> cada pessoa entra com o próprio e-mail, com o cargo e as permissões que você escolher.</span></div><div class="dica">${ic('play')}<span><b>Vídeo tutorial passo a passo:</b> <a href="${tutorial}" target="_blank" rel="noopener">assista aqui</a>. Ficou alguma dúvida? Escreva para <a href="mailto:blueroseexpressoficial@gmail.com?subject=Ajuda%20com%20o%20${encodeURIComponent(cfg.nome)}">blueroseexpressoficial@gmail.com</a>: respondemos em até 1 dia útil e marcamos uma ajuda na implantação.</span></div></div>`,
          botoes: [{ rotulo: 'Começar em branco', classe: 'fant', valor: true }, { rotulo: 'Subir minhas planilhas', classe: 'pri', acao: () => { location.hash = '#/importar'; return true; } }] });
      }
    },
  };
  return sessao;
}
export { BancoNuvem }; // usado nos testes
