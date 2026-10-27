/*
 * Conta do cliente no site (Supabase Auth, a mesma dos sistemas em /app/).
 * Navegar não exige login. Comprar, alugar e começar o teste grátis exigem:
 * BR_CONTA.exigirLogin() abre a janela de entrar/criar conta e devolve a sessão.
 * BR_CONTA.pagar(produto, { teste, emailMp }) cria o pagamento no servidor e leva ao Mercado Pago.
 * BR_CONTA.teste(app, nome, mensal) abre a janela do teste grátis de 7 dias (com cartão no Mercado Pago desde 26/10/2026; nada é cobrado nos 7 dias).
 */
// não abre dentro de página de outro site (clickjacking)
if (window.top !== window.self) { try { if (window.top.location.origin !== location.origin) throw 0; } catch (e) { window.top.location.href = location.href; } }
(function () {
  var CHAVE = 'nexo-sessao';
  var FUNC = 'https://yihnfzwtkqdfnwziutqa.supabase.co/functions/v1/nexo-pagamentos';
  var raiz = (document.querySelector('script[src*="js/conta.js"]').getAttribute('src').split('js/conta.js')[0]) || '';
  var cliente = null;

  function sessaoGuardada() { try { var s = JSON.parse(localStorage.getItem(CHAVE) || 'null'); return s && s.user ? s : null; } catch (e) { return null; } }
  function carregar(src) { return new Promise(function (ok, falha) { if (document.querySelector('script[src="' + src + '"]')) return ok(); var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = falha; document.head.appendChild(s); }); }
  // uma conexão só, mesmo quando várias partes da página pedem ao mesmo tempo (lista, suporte, indicação)
  var clientePromessa = null;
  function sb() {
    if (cliente) return Promise.resolve(cliente);
    if (clientePromessa) return clientePromessa;
    return (clientePromessa = carregar(raiz + 'app/config.js').then(function () { return carregar(raiz + 'demos/sistemas/base/supabase.js'); }).then(function () {
      var c = window.NEXO_NUVEM;
      cliente = window.supabase.createClient(c.url, c.chave, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: CHAVE } });
      cliente.auth.onAuthStateChange(function () { marcarMenu(); });
      return cliente;
    }).catch(function (e) { clientePromessa = null; throw e; }));
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function reais(n) { return 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }

  // ------------------------------------------------ menu: "Entrar" ou "Minha conta"
  function marcarMenu() {
    var nav = document.querySelector('.nav-links'); if (!nav) return;
    var a = nav.querySelector('.nav-conta');
    if (!a) { a = document.createElement('a'); a.className = 'nav-conta'; a.href = raiz + 'conta.html'; var cta = nav.querySelector('.btn'); nav.insertBefore(a, cta || null); }
    var s = sessaoGuardada();
    a.textContent = s ? 'Minha conta' : 'Entrar';
    a.title = s ? s.user.email : 'Entrar ou criar conta';
  }

  // ------------------------------------------------ janela de entrar / criar conta
  var dlg = null;
  // senha que já apareceu em vazamentos (Have I Been Pwned): só os 5 primeiros caracteres do SHA-1 saem do aparelho; se o serviço falhar, deixa passar
  var SENHA_VAZADA = 'Essa senha já apareceu em vazamentos de dados na internet e é fácil de adivinhar. Escolha outra.';
  function senhaVazada(senha) {
    if (!window.crypto || !crypto.subtle || !window.fetch) return Promise.resolve(false);
    return crypto.subtle.digest('SHA-1', new TextEncoder().encode(senha)).then(function (buf) {
      var h = Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('').toUpperCase();
      return fetch('https://api.pwnedpasswords.com/range/' + h.slice(0, 5), { headers: { 'Add-Padding': 'true' } }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
        return t.split('\n').some(function (l) { var x = l.trim().split(':'); return x[0] === h.slice(5) && Number(x[1]) > 0; });
      });
    }).catch(function () { return false; });
  }
  function janela(html) {
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.className = 'conta-dlg'; dlg.setAttribute('aria-labelledby', 'conta-t');
      document.body.appendChild(dlg);
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    }
    dlg.innerHTML = '<div class="conta-caixa"><button class="conta-x" type="button" aria-label="Fechar">×</button>' + html + '</div>';
    dlg.querySelector('.conta-x').onclick = function () { dlg.close(); };
    if (!dlg.open) dlg.showModal();
    var i = dlg.querySelector('input'); if (i) i.focus();
    return dlg;
  }
  var erroAuth = function (e) {
    var m = String((e && e.message) || e || '');
    if (/invalid login/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/email not confirmed/i.test(m)) return 'Confirme o seu e-mail pelo link que enviamos antes de entrar.';
    if (/already registered|already been registered/i.test(m)) return 'Já existe uma conta com esse e-mail. Use "Entrar".';
    if (/password/i.test(m)) return 'A senha precisa ter pelo menos 8 caracteres.';
    if (/rate limit|too many/i.test(m)) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
    return m || 'Algo deu errado. Tente de novo.';
  };
  // ------------------------------------------------ entrar com o Google (aparece só quando o Google está ligado no Supabase)
  var googleOk = null;
  function googleLigado() {
    if (googleOk) return googleOk;
    googleOk = sb().then(function () { var c = window.NEXO_NUVEM; return fetch(c.url + '/auth/v1/settings', { headers: { apikey: c.chave } }); })
      .then(function (r) { return r.json(); }).then(function (j) { return !!(j.external && j.external.google); }).catch(function () { return false; });
    return googleOk;
  }
  function entrarGoogle(bt, erro) {
    bt.disabled = true; erro.textContent = '';
    try { localStorage.setItem('nexo-volta', location.href); } catch (x) { /* ok */ }
    sb().then(function (c) { return c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/app/', queryParams: { prompt: 'select_account' } } }); })
      .then(function (r) { if (r.error) throw r.error; }).catch(function (x) { erro.textContent = erroAuth(x); bt.disabled = false; });
  }
  var G = '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

  function telaLogin(modo, motivo, resolver) {
    var t = { entrar: ['Entrar', 'Acesse a sua conta da Blue Rose.'], criar: ['Criar conta', 'Leva menos de um minuto.'], esqueci: ['Recuperar a senha', 'Enviamos um link para criar uma senha nova.'] }[modo];
    var d = janela('<span class="eyebrow">Sua conta</span><h3 id="conta-t">' + t[0] + '</h3>' + (motivo ? '<p class="conta-motivo">' + esc(motivo) + '</p>' : '<p class="conta-sub">' + t[1] + '</p>') +
      (modo !== 'esqueci' ? '<div class="conta-google" hidden><button type="button" class="btn conta-g">' + G + 'Continuar com o Google</button><p class="conta-ou"><span>ou com e-mail e senha</span></p></div>' : '') +
      '<form class="conta-form" novalidate>' + (modo === 'criar' ? '<label>Seu nome<input name="nome" autocomplete="name" required></label>' : '') +
      '<label>E-mail<input name="email" type="email" autocomplete="email" required></label>' +
      (modo !== 'esqueci' ? '<label>Senha<input name="senha" type="password" minlength="8" autocomplete="' + (modo === 'criar' ? 'new-password' : 'current-password') + '" required></label>' : '') +
      '<p class="conta-erro" role="alert"></p><button class="btn btn-primary" type="submit">' + (modo === 'criar' ? 'Criar conta' : modo === 'entrar' ? 'Entrar' : 'Enviar link') + '</button></form>' +
      '<p class="conta-links">' + (modo === 'entrar' ? '<a href="#" data-m="criar">Criar conta</a> · <a href="#" data-m="esqueci">Esqueci a senha</a>' : '<a href="#" data-m="entrar">Já tenho conta</a>') + '</p>');
    d.querySelectorAll('[data-m]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); telaLogin(a.getAttribute('data-m'), motivo, resolver); }; });
    var f = d.querySelector('form'), erro = d.querySelector('.conta-erro'), bt = f.querySelector('button');
    var gb = d.querySelector('.conta-google');
    if (gb) googleLigado().then(function (ok) { if (!ok) return; gb.hidden = false; gb.querySelector('button').onclick = function () { entrarGoogle(this, erro); }; });
    f.onsubmit = function (e) {
      e.preventDefault(); if (!f.reportValidity()) return;
      var v = { nome: f.nome && f.nome.value.trim(), email: f.email.value.trim(), senha: f.senha && f.senha.value };
      bt.disabled = true; erro.textContent = '';
      try { localStorage.setItem('nexo-volta', location.href); } catch (x) { /* ok */ }
      sb().then(function (c) {
        if (modo === 'entrar') return c.auth.signInWithPassword({ email: v.email, password: v.senha }).then(function (r) { if (r.error) throw r.error; marcarMenu(); dlg.close(); resolver(r.data.session); });
        if (modo === 'esqueci') return c.auth.resetPasswordForEmail(v.email, { redirectTo: location.origin + '/app/' }).then(function (r) { if (r.error) throw r.error; janela('<h3 id="conta-t">Confira o seu e-mail</h3><p class="conta-sub">Se existir uma conta com ' + esc(v.email) + ', o link para criar uma senha nova chega em instantes.</p>'); });
        return senhaVazada(v.senha).then(function (vazou) {
          if (vazou) { var e = new Error(SENHA_VAZADA); e.vazada = true; throw e; }
          return c.auth.signUp({ email: v.email, password: v.senha, options: { data: { nome: v.nome }, emailRedirectTo: location.origin + '/app/' } }).then(function (r) {
          if (r.error) throw r.error;
          if (r.data.session) { marcarMenu(); dlg.close(); return resolver(r.data.session); }
          janela('<span class="eyebrow">Quase lá</span><h3 id="conta-t">Confirme o seu e-mail</h3><p class="conta-sub">Enviamos um link para <b>' + esc(v.email) + '</b>. Abra o link e você volta para cá, já com a conta ativa.</p><p class="conta-sub">Não chegou? Veja a caixa de spam ou promoções.</p>');
          });
        });
      }).catch(function (x) { erro.textContent = erroAuth(x); bt.disabled = false; });
    };
  }
  // programa de indicação: quem chegou por um link de indicação fica ligado a quem indicou (uma vez por conta)
  function registrarIndicacao(s) {
    try {
      var m = document.cookie.match(/(?:^|; )br_indica=([A-Z0-9]{6,16})/), chave = 'nexo-indicacao-' + s.user.id;
      if (!m || localStorage.getItem(chave) != null) return s;
      sb().then(function (c) { return c.rpc('nexo_registrar_indicacao', { p_codigo: m[1] }); }).then(function (r) { if (r && r.data && r.data !== 'login') localStorage.setItem(chave, r.data); }).catch(function () {});
    } catch (e) { /* segue sem indicação */ }
    return s;
  }
  function exigirLogin(motivo) {
    return sb().then(function (c) { return c.auth.getSession(); }).then(function (r) {
      if (r.data.session) return registrarIndicacao(r.data.session);
      return new Promise(function (ok) { telaLogin('criar', motivo || 'Para continuar, entre ou crie a sua conta. É grátis e leva menos de um minuto.', ok); }).then(registrarIndicacao);
    });
  }

  // ------------------------------------------------ pagamento (servidor cria o link no Mercado Pago)
  function chamar(corpo) {
    return sb().then(function (c) { return c.auth.getSession(); }).then(function (r) {
      return fetch(FUNC, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (r.data.session ? r.data.session.access_token : '') }, body: JSON.stringify(corpo) });
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.erro || 'Erro ' + r.status); e.dados = j; throw e; } return j; }); });
  }
  function pagar(produto, op) {
    op = op || {};
    return exigirLogin().then(function () { return chamar({ acao: 'iniciar', produto: produto, teste: !!op.teste, email_mp: op.emailMp || '' }); })
      .then(function (j) { location.href = j.link; return j; });
  }

  // ------------------------------------------------ teste grátis de 7 dias, com o cartão cadastrado no Mercado Pago
  // sistemas que a pessoa já pode abrir (teste valendo, assinatura, compra ou cortesia): lido uma vez por página
  var acessoCache = null;
  function hojeBR() { return new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); }
  function acessos() {
    if (!acessoCache) acessoCache = chamar({ acao: 'status' }).then(function (j) {
      var h = hojeBR(), m = {};
      (j.assinaturas || []).forEach(function (a) {
        var fim = [a.teste_ate, a.pago_ate].filter(Boolean).sort().pop();
        if (a.app && (['ativa', 'paga'].indexOf(a.status) >= 0 || (a.status === 'teste' && a.teste_ate >= h) || (a.status === 'cancelada' && fim && fim >= h))) m[a.app] = a.status === 'teste' ? 'teste' : 'assinado';
      });
      return m;
    }).catch(function () { acessoCache = null; return {}; });
    return acessoCache;
  }
  function assinarDireto(app, emailMp) { return chamar({ acao: 'iniciar', produto: 'a-sis-' + app, email_mp: emailMp || '' }).then(function (j) { location.href = j.link; }); }
  // a oferta de lançamento (50% nos 3 primeiros meses) foi encerrada em 17/10/2026
  function vagas() { return Promise.resolve(0); }
  function teste(app, nome, mensal, direto) {
    return exigirLogin((direto ? 'Para assinar o ' : 'Para começar o teste grátis do ') + nome + ', entre ou crie a sua conta.').then(function (s) {
      return Promise.all([s, acessos(), vagas()]);
    }).then(function (sm) {
      var s = sm[0], n = sm[2];
      if (sm[1][app]) { location.href = raiz + 'app/' + app + '/'; return; }
      var metade = Math.round(mensal * 50) / 100;
      var oferta = n > 0 ? '<li class="conta-oferta"><b>Oferta de lançamento:</b> ' + reais(metade) + '/mês nos 3 primeiros meses, depois ' + reais(mensal) + '/mês. Restam ' + n + (n === 1 ? ' vaga' : ' vagas') + '.</li>' : '';
      var d = janela('<span class="eyebrow">' + (direto ? 'Assinatura' : 'Teste grátis de 7 dias') + '</span><h3 id="conta-t">' + esc(nome) + '</h3>' + (direto ?
        '<ul class="conta-lista">' + oferta + '<li>Assinatura de <b>' + reais(n > 0 ? metade : mensal) + '/mês</b> no cartão, pelo Mercado Pago. Sem fidelidade.</li><li>O sistema fica liberado assim que o pagamento é confirmado.</li><li>Cancele quando quiser em <a href="' + raiz + 'conta.html">Minha conta</a>.</li></ul>' :
        '<ul class="conta-lista"><li>Use com os dados da sua empresa por <b>7 dias sem pagar nada</b>.</li><li>Para começar, <b>cadastre o cartão no Mercado Pago</b>. Nada é cobrado nos 7 dias.</li><li>Se não cancelar, a assinatura de ' + reais(mensal) + '/mês começa no 8º dia, com tudo o que você cadastrou. Cancele quando quiser em <a href="' + raiz + 'conta.html">Minha conta</a>.</li>' + oferta + '</ul>') +
        '<form class="conta-form" novalidate>' + (true ? '<label>E-mail da sua conta do Mercado Pago<input name="mp" type="email" value="' + esc(s.user.email) + '" required><small>' + (direto ? 'A assinatura fica na conta do Mercado Pago com este e-mail.' : 'O cartão do teste fica na conta do Mercado Pago com este e-mail.') + '</small></label>' : '') +
        '<label class="conta-aceite"><input type="checkbox" name="ok" required> <span>Tenho 18 anos ou mais. Li e aceito os <a href="' + raiz + 'termos.html" target="_blank" rel="noopener">Termos de Serviço</a>' + (direto ? ' e a cobrança mensal' : ' e a cobrança mensal depois dos 7 dias, se eu não cancelar') + '.</span></label>' +
        '<p class="conta-erro" role="alert"></p><button class="btn btn-primary" type="submit">' + (direto ? 'Assinar agora' : 'Começar o teste grátis') + '</button>' +
        (direto ? '' : '<button type="button" class="conta-link conta-direto" data-direto>Prefiro assinar agora</button>') + '</form>');
      var f = d.querySelector('form'), erro = d.querySelector('.conta-erro'), bt = f.querySelector('button');
      f.onsubmit = function (e) {
        e.preventDefault(); if (!f.reportValidity()) return;
        bt.disabled = true; bt.textContent = 'Abrindo o Mercado Pago…'; erro.textContent = '';
        (direto ? assinarDireto(app, f.mp.value.trim())
          : chamar({ acao: 'iniciar', produto: 'a-sis-' + app, teste: true, email_mp: f.mp.value.trim() }).then(function (j) { location.href = j.link; })
        ).catch(function (x) {
          bt.disabled = false; bt.textContent = direto ? 'Assinar agora' : 'Começar o teste grátis';
          if (x.dados && x.dados.sem_teste) {
            erro.innerHTML = esc(x.message) + ' <a href="#" data-assinar>Assinar agora</a>';
            erro.querySelector('[data-assinar]').onclick = function (ev) { ev.preventDefault(); d.close ? d.close() : null; teste(app, nome, mensal, true); };
          } else erro.textContent = x.message;
        });
      };
      var bd = f.querySelector('[data-direto]');
      if (bd) bd.onclick = function () { if (d.close) d.close(); teste(app, nome, mensal, true); };
    });
  }

  // botões "Testar 7 dias grátis" (links para app/<sistema>/ marcados com data-teste)
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-teste],[data-assinar-app]'); if (!b) return;
    e.preventDefault();
    var direto = b.hasAttribute('data-assinar-app');
    teste(b.getAttribute(direto ? 'data-assinar-app' : 'data-teste'), b.getAttribute('data-teste-nome') || 'sistema', Number(b.getAttribute('data-teste-mensal')) || 0, direto);
  });

  // páginas dos sistemas: quem já tem o sistema vê "Abrir o sistema" no lugar do teste; quem não tem ganha a opção de assinar sem teste
  function ajustarBotoes() {
    var bts = [].slice.call(document.querySelectorAll('a[data-teste]')); if (!bts.length) return;
    document.querySelectorAll('.np-cta a[data-teste]').forEach(function (b) {
      if (b.parentNode.querySelector('[data-assinar-app]')) return;
      var l = document.createElement('a'); l.href = '#'; l.className = 'np-direto'; l.textContent = 'ou assine agora, sem teste';
      l.setAttribute('data-assinar-app', b.getAttribute('data-teste')); l.setAttribute('data-teste-nome', b.getAttribute('data-teste-nome') || ''); l.setAttribute('data-teste-mensal', b.getAttribute('data-teste-mensal') || '');
      b.parentNode.appendChild(l);
    });
    if (!sessaoGuardada()) return;
    acessos().then(function (m) {
      bts.forEach(function (b) {
        var app = b.getAttribute('data-teste'); if (!m[app]) return;
        b.removeAttribute('data-teste'); b.href = raiz + 'app/' + app + '/'; b.textContent = 'Abrir o sistema';
        var cta = b.closest('.np-cta'); if (!cta) return;
        var d = cta.querySelector('[data-assinar-app]'); if (d) d.remove();
        var sec = cta.closest('.np-final'), h = sec && sec.querySelector('h2');
        if (h) h.textContent = m[app] === 'teste' ? 'O seu teste está valendo.' : 'O seu sistema está pronto.';
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ajustarBotoes); else ajustarBotoes();

  window.BR_CONTA = { sb: sb, exigirLogin: exigirLogin, pagar: pagar, teste: teste, chamar: chamar, sessao: sessaoGuardada, janela: janela, esc: esc, reais: reais };
  marcarMenu();
})();
