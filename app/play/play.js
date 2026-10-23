// Veltria · entrada do app da Google Play
// Entrar, ver os sistemas liberados na conta e abrir cada um. Sem venda: a regra de pagamentos da loja
// não permite levar a compra para fora do app, então aqui não há preço, teste com cartão nem link de compra.
// Também tem "Excluir minha conta", que a loja exige para apps com login.
(async () => {
  const raiz = document.getElementById('play');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
  const SITE = 'https://bluerose-store.com/';
  // os 24 sistemas Veltria (8 ramos × Essencial, Completo e Avançado), da mesma lista que o site usa (base/versoes.js)
  const V = window.VELTRIA_VERSOES || {}, NOMES = Object.fromEntries(Object.values(V).map((v) => [v.id, v.nome]));
  const params = new URLSearchParams(location.search);
  if (params.get('origem') === 'play') {
    try { localStorage.setItem('nexo-play', '1'); } catch { /* ok */ }
    history.replaceState(null, '', location.pathname);
  }
  const c = window.NEXO_NUVEM;
  const sb = window.supabase.createClient(c.url, c.chave, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'nexo-sessao' } });
  const marca = '<div class="play-marca"><img src="icone-192.png" alt="" width="44" height="44"><div><b>Veltria</b><small>Blue Rose</small></div></div>';
  const pe = `<p class="play-pe"><a href="${SITE}privacidade.html">Privacidade</a> · <a href="${SITE}termos.html">Termos</a></p>`;
  const erroAuth = (e) => {
    const m = String(e?.message || e || '');
    if (/invalid login/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/email not confirmed/i.test(m)) return 'Confirme o seu e-mail pelo link que enviamos antes de entrar.';
    if (/rate limit|too many/i.test(m)) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
    return m || 'Algo deu errado. Tente de novo.';
  };

  async function entrar(aviso = '') {
    raiz.innerHTML = `${marca}<h1>Entrar</h1><p class="play-s">Use o mesmo e-mail e senha da sua conta Blue Rose.</p>${aviso ? `<p class="ok-tx">${aviso}</p>` : ''}
      <div data-google hidden><button type="button" class="play-google"><svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Continuar com o Google</button><p class="play-ou">ou com e-mail e senha</p></div>
      <form novalidate><label>E-mail<input name="email" type="email" autocomplete="email" required></label>
      <label>Senha<input name="senha" type="password" autocomplete="current-password" minlength="8" required></label>
      <p class="erro" data-erro role="alert"></p><button class="btn pri btn-grande">Entrar</button></form>
      <div class="play-links"><button type="button" data-esqueci>Esqueci a senha</button></div>${pe}`;
    const f = raiz.querySelector('form'), erro = raiz.querySelector('[data-erro]');
    fetch(`${c.url}/auth/v1/settings`, { headers: { apikey: c.chave } }).then((r) => r.json()).then((j) => {
      if (!j.external?.google) return;
      const g = raiz.querySelector('[data-google]'); g.hidden = false;
      g.querySelector('button').onclick = () => sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/app/play/`, queryParams: { prompt: 'select_account' } } });
    }).catch(() => {});
    f.onsubmit = async (e) => {
      e.preventDefault(); if (!f.reportValidity()) return;
      const b = f.querySelector('button'); b.disabled = true; erro.textContent = '';
      const { error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.senha.value });
      if (error) { erro.textContent = erroAuth(error); b.disabled = false; return; }
      painel();
    };
    raiz.querySelector('[data-esqueci]').onclick = async () => {
      if (!f.email.reportValidity()) { erro.textContent = 'Digite o seu e-mail acima e toque de novo em "Esqueci a senha".'; return; }
      try { localStorage.setItem('nexo-volta', '/app/play/'); } catch { /* ok */ }
      const { error } = await sb.auth.resetPasswordForEmail(f.email.value.trim(), { redirectTo: `${location.origin}/app/` });
      if (error) { erro.textContent = erroAuth(error); return; }
      entrar(`Se existir uma conta com ${esc(f.email.value.trim())}, o link para criar uma senha nova chega em alguns minutos.`);
    };
  }

  async function painel() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return entrar();
    raiz.innerHTML = `${marca}<p class="play-s">Carregando os seus sistemas…</p>`;
    await sb.rpc('nexo_aceitar_convites').catch(() => {});
    const apps = new Map();
    const { data: esps } = await sb.from('nexo_espacos').select('app,nome').order('criado');
    for (const e of esps || []) { if (!NOMES[e.app]) continue; if (!apps.has(e.app)) apps.set(e.app, []); apps.get(e.app).push(e.nome); }
    // assinatura valendo sem empresa criada ainda
    const r = await sb.functions.invoke('nexo-pagamentos', { body: { acao: 'status' } }).catch(() => ({}));
    const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
    for (const a of r.data?.assinaturas || []) {
      const vale = ['ativa', 'paga'].includes(a.status) || (a.status === 'teste' && a.teste_ate >= hoje) || (a.status === 'cancelada' && [a.teste_ate, a.pago_ate].filter(Boolean).sort().pop() >= hoje);
      if (vale && NOMES[a.app] && !apps.has(a.app)) apps.set(a.app, []);
    }
    const lista = [...apps.entries()].map(([app, empresas]) => `<li><a href="../${app}/"><img src="../../${V[app].logo}" alt="" width="44" height="44"><span><b>${esc(NOMES[app])}</b><small>${empresas.length ? esc(empresas.join(' · ')) : 'Toque para começar'}</small></span><i class="seta" aria-hidden="true"></i></a></li>`).join('');
    raiz.innerHTML = `${marca}<div class="play-conta"><span>${esc(session.user.email)}</span><button type="button" class="btn fant" data-sair>Sair</button></div>
      <h1>Seus sistemas</h1>
      ${lista ? `<ul class="play-sis">${lista}</ul>` : '<div class="play-vazio">Esta conta ainda não tem sistemas liberados. Se você faz parte da equipe de uma empresa, peça para quem administra a conta convidar o seu e-mail.</div>'}
      <details class="play-perigo"><summary>Excluir minha conta</summary>
        <p>Isso apaga o seu login e as empresas de que você é dono, com todos os cadastros, e cancela as cobranças. Não dá para desfazer. O registro dos pagamentos já feitos fica guardado pelo prazo da lei fiscal.</p>
        <form data-excluir novalidate><label>Digite EXCLUIR para confirmar<input name="ok" autocomplete="off" required></label><p class="erro" data-erro-ex role="alert"></p><button class="btn-perigo">Excluir minha conta</button></form>
      </details>${pe}`;
    raiz.querySelector('[data-sair]').onclick = async () => { await sb.auth.signOut(); entrar(); };
    const fx = raiz.querySelector('[data-excluir]'), ex = raiz.querySelector('[data-erro-ex]');
    fx.onsubmit = async (e) => {
      e.preventDefault();
      if (fx.ok.value.trim().toUpperCase() !== 'EXCLUIR') { ex.textContent = 'Digite EXCLUIR para confirmar.'; return; }
      const b = fx.querySelector('button'); b.disabled = true; b.textContent = 'Excluindo…'; ex.textContent = '';
      const { error } = await sb.functions.invoke('nexo-pagamentos', { body: { acao: 'excluir_conta', confirmar: 'EXCLUIR' } });
      if (error) { let m = error.message; try { m = (await error.context.json()).erro || m; } catch { /* ok */ } ex.textContent = m; b.disabled = false; b.textContent = 'Excluir minha conta'; return; }
      await sb.auth.signOut().catch(() => {});
      raiz.innerHTML = `${marca}<h1>Conta excluída</h1><p class="play-s">O seu login e os seus dados foram apagados. Obrigado por ter usado a Veltria.</p>${pe}`;
    };
  }

  painel().catch((e) => { raiz.innerHTML = `${marca}<p class="play-s">Não foi possível abrir agora (${esc(e.message || e)}). <a href="">Tentar de novo</a></p>`; });
})();
