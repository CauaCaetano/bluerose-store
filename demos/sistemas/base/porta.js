// Veltria · porta de entrada das versões (app/<id>/): conta, teste grátis de 7 dias, assinatura no Mercado Pago,
// empresa (nexo_espacos) e os dados da empresa na nuvem (nexo_registros, coleção _estado). Depois de tudo certo,
// abre a tela do sistema em modo conta (?conta=<id>), onde conta-nuvem.js guarda cada alteração no banco.
import './mesclar.js?v=1'; // window.veltriaMesclar: junta o que ficou só neste aparelho com a nuvem
const ID = document.documentElement.dataset.app;
const V = window.VELTRIA_VERSOES[ID];
const RAIZ = new URL('../../', location.href).href;
const c = window.NEXO_NUVEM;
const sb = window.supabase.createClient(c.url, c.chave, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'nexo-sessao' } });
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
const reais = (v) => `R$ ${Number(v).toLocaleString('pt-BR')}`;
const hoje = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const dataBR = (d) => (d ? d.split('-').reverse().join('/') : '');
const anual = (m) => Math.round(m * 12 * 0.8);

function tela(html) {
  $('#porta').innerHTML = `<header class="p-topo"><img src="${RAIZ}${V.logo}" alt="" width="56" height="56"><div><b>${esc(V.nome)}</b><small>Blue Rose Express</small></div></header>${html}`;
  $('#porta').querySelector('input, button')?.focus();
  return $('#porta');
}
const carregando = (t) => tela(`<p class="p-carrega">${esc(t)}</p>`);
async function pagamentos(corpo) {
  const { data, error } = await sb.functions.invoke('nexo-pagamentos', { body: corpo });
  if (error) { let j = {}; try { j = await error.context.json(); } catch { /* ok */ } const e = new Error(j.erro || error.message); e.dados = j; throw e; }
  return data;
}
const valeAssinatura = (a, h) => ['ativa', 'paga'].includes(a.status) || (a.status === 'teste' && a.teste_ate >= h) || (a.status === 'cancelada' && [a.teste_ate, a.pago_ate].filter(Boolean).sort().pop() >= h);
const valeEspaco = (e) => e.plano === 'ativo' || (e.plano === 'teste' && e.teste_ate >= hoje());

// ---------------------------------------------------------------- entrar ou criar conta
function telaConta(modo = 'entrar', aviso = '') {
  return new Promise((ok) => {
    const criar = modo === 'criar';
    const f = tela(`<h1>${criar ? 'Crie a sua conta' : 'Entre na sua conta'}</h1><p class="p-sub">${criar ? 'A mesma conta vale para o site e para todos os sistemas.' : 'Use o e-mail e a senha da sua conta Blue Rose.'}</p>
      ${aviso ? `<p class="p-aviso">${esc(aviso)}</p>` : ''}
      <form novalidate><label>E-mail<input name="email" type="email" autocomplete="email" required></label><label>Senha<input name="senha" type="password" minlength="8" autocomplete="${criar ? 'new-password' : 'current-password'}" required>${criar ? '<small>Pelo menos 8 caracteres.</small>' : ''}</label>
      ${criar ? `<label class="p-aceite"><input type="checkbox" name="ok" required><span>Tenho 18 anos ou mais e aceito os <a href="${RAIZ}termos.html" target="_blank" rel="noopener">Termos de Serviço</a> e a <a href="${RAIZ}privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a>.</span></label>` : ''}
      <p class="p-erro" role="alert"></p><button class="p-bt">${criar ? 'Criar conta' : 'Entrar'}</button></form>
      <p class="p-links">${criar ? '<a href="#" data-modo="entrar">Já tenho conta</a>' : '<a href="#" data-modo="criar">Criar conta</a><span>·</span><a href="#" data-esqueci>Esqueci a senha</a>'}<span>·</span><a href="${RAIZ}${V.pagina}">Voltar ao site</a></p>`);
    f.querySelector('[data-modo]').onclick = (e) => { e.preventDefault(); telaConta(e.target.dataset.modo).then(ok); };
    const form = f.querySelector('form'), erro = f.querySelector('.p-erro');
    f.querySelector('[data-esqueci]')?.addEventListener('click', async (e) => {
      e.preventDefault(); const email = form.email.value.trim(); if (!email) { erro.textContent = 'Escreva o seu e-mail acima e clique de novo.'; return; }
      try { localStorage.setItem('nexo-volta', location.href); } catch { /* ok */ }
      await sb.auth.resetPasswordForEmail(email, { redirectTo: `${RAIZ}app/` });
      erro.textContent = 'Se houver conta com este e-mail, o link para criar uma senha nova chega em alguns minutos (confira o spam).';
    });
    form.onsubmit = async (e) => {
      e.preventDefault(); if (!form.reportValidity()) return;
      const bt = form.querySelector('button'); bt.disabled = true; erro.textContent = '';
      const email = form.email.value.trim(), senha = form.senha.value;
      try { localStorage.setItem('nexo-volta', location.href); } catch { /* ok */ }
      const r = criar ? await sb.auth.signUp({ email, password: senha, options: { emailRedirectTo: `${RAIZ}app/` } }) : await sb.auth.signInWithPassword({ email, password: senha });
      bt.disabled = false;
      if (r.error) { erro.textContent = /Invalid login/i.test(r.error.message) ? 'E-mail ou senha incorretos.' : /registered/i.test(r.error.message) ? 'Já existe conta com este e-mail. Entre com a sua senha.' : /weak|pwned|leaked/i.test(r.error.message) ? 'Essa senha é fraca ou já vazou na internet. Escolha outra.' : r.error.message; return; }
      if (!r.data.session) { tela(`<h1>Confirme o seu e-mail</h1><p class="p-sub">Enviamos um link para <b>${esc(email)}</b>. Abra o link e você volta direto para cá.</p><p class="p-links"><a href="">Já confirmei</a></p>`); return; }
      ok(r.data.session);
    };
  });
}

// ---------------------------------------------------------------- teste grátis ou assinatura
function telaPlano({ email, venceu, semTeste, motivo }) {
  return new Promise(() => {
    const opcoes = [['', 'Assinatura mensal', V.mensal, 'equipe sem limite, histórico e até 10 empresas'], ['-anual', 'Assinatura anual', anual(V.mensal), '12 meses com 20% a menos']];
    const f = tela(`<h1>${venceu ? 'O acesso venceu' : `Comece a usar o ${esc(V.nome)}`}</h1>
      <p class="p-sub">${venceu ? 'Seus dados estão guardados. Assine para voltar a usar de onde parou.' : 'Teste 7 dias grátis com os dados da sua empresa. Cadastre o cartão no Mercado Pago: nada é cobrado nos 7 dias e, se não cancelar, a assinatura do plano escolhido começa no 8º dia.'}</p>
      ${motivo ? `<p class="p-aviso">${esc(motivo)}</p>` : ''}
      ${venceu || semTeste ? '' : `<button class="p-bt" data-teste>Começar os 7 dias grátis</button><p class="p-ou">ou assine agora</p>`}
      <form novalidate><fieldset class="p-planos"><legend>Plano</legend>${opcoes.map(([suf, nome, valor, det], i) => `<label><input type="radio" name="plano" value="${suf}" ${i ? '' : 'checked'}><span><b>${nome}</b><em>${reais(valor)}${suf.includes('anual') ? '/ano' : '/mês'}</em><small>${det}</small></span></label>`).join('')}</fieldset>
      <label>E-mail da sua conta do Mercado Pago<input name="mp" type="email" value="${esc(email)}" required><small>A assinatura fica nessa conta do Mercado Pago, no cartão. Sem fidelidade: cancele quando quiser em Minha conta.</small></label>
      <label class="p-aceite"><input type="checkbox" name="ok" required><span>Tenho 18 anos ou mais e aceito os <a href="${RAIZ}termos.html" target="_blank" rel="noopener">Termos de Serviço</a> e a cobrança automática do plano escolhido.</span></label>
      <p class="p-erro" role="alert"></p><button class="p-bt ${venceu || semTeste ? '' : 'p-bt-2'}">Assinar no Mercado Pago</button></form>
      <p class="p-links"><a href="${RAIZ}demos/sistemas/${V.pasta}/">Ver a demonstração</a><span>·</span><a href="${RAIZ}conta.html">Minha conta</a><span>·</span><a href="#" data-sair>Sair</a></p>`);
    f.querySelector('[data-sair]').onclick = async (e) => { e.preventDefault(); await sb.auth.signOut(); location.reload(); };
    const form = f.querySelector('form'), erro = f.querySelector('.p-erro');
    f.querySelector('[data-teste]')?.addEventListener('click', async (e) => {
      if (!form.reportValidity()) return;   // o teste também pede o e-mail do Mercado Pago e o aceite
      const bt = e.currentTarget; bt.disabled = true; bt.textContent = 'Abrindo o Mercado Pago…'; erro.textContent = '';
      try { const j = await pagamentos({ acao: 'iniciar', produto: `a-sis-${V.id}${form.plano.value}`, teste: true, email_mp: form.mp.value.trim() }); location.href = j.link; }
      catch (x) { bt.disabled = false; bt.textContent = 'Começar os 7 dias grátis'; if (x.dados?.sem_teste) { bt.remove(); f.querySelector('.p-ou')?.remove(); erro.textContent = `${x.message} Escolha um plano abaixo.`; } else erro.textContent = x.message; }
    });
    form.onsubmit = async (e) => {
      e.preventDefault(); if (!form.reportValidity()) return;
      const bt = form.querySelector('button'); bt.disabled = true; bt.textContent = 'Abrindo o Mercado Pago…'; erro.textContent = '';
      try { const j = await pagamentos({ acao: 'iniciar', produto: `a-sis-${V.id}${form.plano.value}`, email_mp: form.mp.value.trim() }); location.href = j.link; }
      catch (x) { bt.disabled = false; bt.textContent = 'Assinar no Mercado Pago'; erro.textContent = x.message; }
    };
  });
}

// ---------------------------------------------------------------- empresa
function telaEmpresa(token) {
  return new Promise((ok) => {
    const f = tela(`<h1>Qual é o nome da sua empresa?</h1><p class="p-sub">Ele aparece no sistema e nos documentos. Depois você convida a sua equipe pelo menu Conta.</p>
      <form novalidate><label>Nome da empresa<input name="nome" required maxlength="120"></label>${token ? '' : '<label>Token de dono<input name="token" required autocomplete="off" spellcheck="false"><small>Enviamos para o seu e-mail quando o teste ou a assinatura começou. Ele também aparece em Minha conta.</small></label>'}
      <p class="p-erro" role="alert"></p><button class="p-bt">Abrir o sistema</button></form>`);
    const form = f.querySelector('form'), erro = f.querySelector('.p-erro');
    form.onsubmit = async (e) => {
      e.preventDefault(); if (!form.reportValidity()) return;
      const bt = form.querySelector('button'); bt.disabled = true;
      const { data, error } = await sb.rpc('nexo_criar_espaco', { p_app: V.id, p_nome: form.nome.value.trim(), p_token: token || form.token.value.trim() });
      bt.disabled = false;
      if (error) { erro.textContent = /TOKEN/.test(error.message) ? 'Token de dono incorreto. Confira no e-mail ou em Minha conta.' : /limite/.test(error.message) ? 'Você chegou ao limite de empresas do seu plano (o Pro libera até 10).' : /cartão/.test(error.message) ? 'O teste ou a assinatura ainda não está liberado. Atualize a página.' : error.message; return; }
      ok(data);
    };
  });
}

// ---------------------------------------------------------------- em manutenção (Veltria Gestão, desde 23/10/2026)
// Novos testes e assinaturas ficam fechados; a equipe libera o acesso de quem pedir. Quem já tem empresa liberada entra.
const MANUTENCAO = V.categoria === 'gestao';
function telaManutencao(podeEntrar) {
  const wa = window.BR_WA ? `https://wa.me/${window.BR_WA}?text=${encodeURIComponent(`Olá! Quero liberar o acesso ao ${V.nome}.`)}` : `${RAIZ}#contato`;
  return new Promise((ok) => {
    const f = tela(`<h1>${esc(V.nome)} em manutenção</h1><p class="p-sub">No momento, a ${esc(V.nomeCategoria)} está em manutenção e novos acessos são liberados pela nossa equipe. Fale com a gente que liberamos o seu.</p>
      <a class="p-bt" style="display:grid;place-items:center;text-decoration:none" href="${wa}" target="_blank" rel="noopener">Falar com a equipe no WhatsApp</a>
      ${podeEntrar ? '<p class="p-ou">Já tem o acesso liberado?</p><button type="button" class="p-bt p-bt-2" data-entrar>Entrar</button>' : ''}
      <p class="p-links"><a href="${RAIZ}demos/sistemas/${V.pasta}/${V.entrada}">Ver a demonstração</a><span>·</span><a href="${RAIZ}${V.pagina}">Voltar ao site</a></p>`);
    const b = f.querySelector('[data-entrar]'); if (b) b.onclick = () => ok();
  });
}

// ---------------------------------------------------------------- caminho
async function entrar() {
  carregando('Abrindo…');
  let { data: { session } } = await sb.auth.getSession();
  if (!session && MANUTENCAO) await telaManutencao(true);
  if (!session) session = await telaConta(new URLSearchParams(location.search).has('criar') ? 'criar' : 'entrar');
  carregando('Conferindo o seu acesso…');
  await sb.rpc('nexo_aceitar_convites').then(() => {}, () => {});
  let { data: espacos } = await sb.from('nexo_espacos').select('id,nome,plano,teste_ate,dono,nivel').eq('app', V.id).order('criado');
  espacos = espacos || [];
  const meus = espacos.filter((e) => e.dono === session.user.id);
  let esp = espacos.find((e) => e.id === localStorage.getItem(`nexo-espaco-${V.id}`) && valeEspaco(e)) || espacos.find(valeEspaco);
  if (!esp && MANUTENCAO) { await telaManutencao(false); return; }
  if (!esp) {
    // sem empresa liberada: confere teste e assinatura do próprio login
    const r = await pagamentos({ acao: 'status' }).catch(() => ({ assinaturas: [], tokens: {} }));
    const daqui = (r.assinaturas || []).filter((a) => a.app === V.id), h = hoje();
    if (!daqui.some((a) => valeAssinatura(a, h))) {
      if (espacos.length && !meus.length) { tela(`<h1>O acesso da empresa venceu</h1><p class="p-sub">A assinatura de ${esc(espacos[0].nome)} não está em dia. Peça ao dono da empresa para renovar em Minha conta.</p><p class="p-links"><a href="#" data-sair>Sair</a></p>`); $('[data-sair]').onclick = async (e) => { e.preventDefault(); await sb.auth.signOut(); location.reload(); }; return; }
      const pend = daqui.find((a) => a.status === 'pendente');
      return telaPlano({ email: session.user.email, venceu: daqui.length > 0 && !pend, semTeste: daqui.some((a) => a.tipo === 'teste'), motivo: pend?.motivo || (pend ? 'Estamos esperando a confirmação do Mercado Pago. Se você já pagou, atualize a página em alguns minutos.' : '') });
    }
    // a assinatura voltou e o servidor já liberou as empresas: recarrega uma vez
    if (meus.length) { if (!sessionStorage.getItem('veltria-recarregou')) { sessionStorage.setItem('veltria-recarregou', '1'); location.reload(); return; } esp = meus[0]; }
    if (!esp) {
      const id = await telaEmpresa(r.tokens?.[V.id]?.token || '');
      ({ data: esp } = await sb.from('nexo_espacos').select('id,nome,plano,teste_ate,dono,nivel').eq('id', id).single());
    }
  }
  sessionStorage.removeItem('veltria-recarregou');
  try { localStorage.setItem(`nexo-espaco-${V.id}`, esp.id); } catch { /* ok */ }
  carregando('Trazendo os dados da empresa…');
  const { data: reg } = await sb.from('nexo_registros').select('dados,atualizado').eq('espaco', esp.id).eq('colecao', '_estado').eq('id', 'estado').maybeSingle();
  const ns = `conta:${esp.id}:${V.chave}`, nsBase = `${ns}:base`;
  // alterações deste aparelho que não chegaram a subir (sem internet, aba fechada no meio): junta com a nuvem, item por item
  const local = localStorage.getItem(ns), base = localStorage.getItem(nsBase);
  let pendente = false;
  if (reg?.dados) {
    let dados = reg.dados;
    if (local && base && local !== base) { dados = window.veltriaMesclar(JSON.parse(base), JSON.parse(local), reg.dados); pendente = true; }
    localStorage.setItem(ns, JSON.stringify(dados)); localStorage.setItem(nsBase, JSON.stringify(reg.dados));
  } else { localStorage.removeItem(ns); localStorage.removeItem(nsBase); }
  sessionStorage.setItem('veltria-conta', JSON.stringify({ app: V.id, espaco: esp.id, empresa: esp.nome, plano: esp.plano, ate: esp.teste_ate, nivel: esp.nivel, dono: esp.dono === session.user.id, chave: V.chave, atualizado: reg?.atualizado || null, novo: !reg, pendente }));
  location.replace(`${RAIZ}demos/sistemas/${V.pasta}/${V.entrada}?conta=${V.id}`);
}
entrar().catch((e) => tela(`<h1>Não foi possível abrir</h1><p class="p-sub">${esc(e.message || e)}</p><p class="p-links"><a href="">Tentar de novo</a></p>`));
