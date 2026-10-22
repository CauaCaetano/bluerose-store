// Veltria · volta do e-mail de confirmação ou de nova senha (único endereço liberado no login: /app/**)
(async () => {
  const caixa = document.getElementById('caixa');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
  const c = window.NEXO_NUVEM, recuperar = /type=recovery/.test(location.hash);
  const sb = window.supabase.createClient(c.url, c.chave, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'nexo-sessao' } });
  let volta = '../'; try { volta = localStorage.getItem('nexo-volta') || '../conta.html'; } catch { /* ok */ }
  await new Promise((ok) => setTimeout(ok, 600));
  const { data: { session } } = await sb.auth.getSession();
  if (session && recuperar) {
    caixa.innerHTML = '<h1 class="entrada-t">Crie uma senha nova</h1><form class="col" style="gap:12px" novalidate><label class="campo">Senha nova<input name="senha" type="password" minlength="8" autocomplete="new-password" required></label><p class="er-tx" data-erro></p><button class="btn pri" style="height:40px">Salvar senha</button></form>';
    const f = caixa.querySelector('form');
    f.onsubmit = async (e) => { e.preventDefault(); if (!f.reportValidity()) return; const { error } = await sb.auth.updateUser({ password: f.senha.value }); if (error) { f.querySelector('[data-erro]').textContent = error.message; return; } location.href = volta; };
    return;
  }
  if (session) {
    caixa.innerHTML = `<h1 class="entrada-t">Pronto, você entrou</h1><p class="entrada-s">Conta ${esc(session.user.email)}. Voltando para onde você estava…</p><a class="btn pri" href="${esc(volta)}">Continuar</a>`;
    try { localStorage.removeItem('nexo-volta'); } catch { /* ok */ }
    setTimeout(() => { location.href = volta; }, 1200);
    return;
  }
  if (/error=/.test(location.hash + location.search)) {
    caixa.innerHTML = `<h1 class="entrada-t">Não foi possível entrar</h1><p class="entrada-s">O login foi cancelado ou não foi autorizado. Tente de novo ou use e-mail e senha.</p><a class="btn pri" href="${esc(volta)}">Voltar</a>`;
    return;
  }
  if (!location.hash) { location.replace('../conta.html'); return; }
  caixa.innerHTML = '<h1 class="entrada-t">Link expirado ou já usado</h1><p class="entrada-s">Entre com o seu e-mail e senha no site.</p><a class="btn pri" href="../conta.html">Ir para Minha conta</a>';
})();
