// Veltria Gestão Avançado · Assistente IA e Painel do dono (deste sistema; cada versão tem o seu).
// As cores vêm das variáveis --ga-* do estilo.css desta pasta (papel, tinta, borda, acento).
// Na versão contratada a IA é a função nexo-ia (20 perguntas grátis por dia) e o painel vem da nuvem.

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const LOGO = new URL('../base/blue-rose.png', import.meta.url).href;

const CSS = `
.ga-fundo { position: fixed; inset: 0; z-index: 90; background: rgba(10, 12, 20, .5); display: grid; place-items: center; padding: 16px; }
.ga-caixa { width: min(640px, 100%); max-height: 90vh; overflow: auto; background: var(--ga-papel, #fff); color: var(--ga-tinta, #222); border-radius: var(--ga-raio, 14px); box-shadow: 0 30px 80px -20px rgba(0, 0, 0, .55); }
.ga-cab { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--ga-borda, #ddd); }
.ga-cab h2 { margin: 0; font-size: 1.1rem; }
.ga-x { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--ga-borda, #ddd); background: none; color: inherit; cursor: pointer; font-size: 1.1rem; }
.ga-corpo { padding: 16px 18px; display: grid; gap: 12px; }
.ga-ia-topo { display: flex; gap: 14px; align-items: center; }
.ga-ia-topo img { width: 64px; height: 64px; border-radius: 14px; background: #fff; flex: none; }
.ga-mute { color: var(--ga-tinta-2, #666); font-size: .9rem; margin: 0; }
.ga-dica { background: var(--ga-suave, rgba(0, 0, 0, .05)); border-radius: 10px; padding: 9px 12px; font-size: .9rem; }
.ga-sugs { display: flex; flex-wrap: wrap; gap: 6px; }
.ga-btn { min-height: 38px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--ga-borda, #ccc); background: var(--ga-papel, #fff); color: inherit; font: inherit; font-weight: 600; cursor: pointer; }
.ga-btn:hover { border-color: var(--ga-acento, #333); }
.ga-btn.pri { background: var(--ga-acento, #222); border-color: var(--ga-acento, #222); color: var(--ga-acento-tx, #fff); }
.ga-btn.peq { min-height: 32px; padding: 0 10px; font-size: .85rem; font-weight: 500; }
.ga-campo { display: grid; gap: 5px; font-weight: 600; font-size: .9rem; }
.ga-campo textarea, .ga-campo input, .ga-campo select { font: inherit; font-weight: 400; color: inherit; background: var(--ga-papel, #fff); border: 1px solid var(--ga-borda, #ccc); border-radius: 10px; padding: 9px 12px; width: 100%; }
.ga-resp { white-space: pre-wrap; border: 1px solid var(--ga-borda, #ddd); border-radius: 12px; padding: 12px 14px; line-height: 1.5; }
.ga-pe { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px; border-top: 1px solid var(--ga-borda, #ddd); }
.ga-conta summary { cursor: pointer; font-weight: 600; font-size: .9rem; }
/* painel do dono */
.ga-dono { display: grid; gap: 16px; }
.ga-aviso { display: flex; gap: 10px; align-items: center; background: var(--ga-suave, rgba(0, 0, 0, .05)); border-radius: 12px; padding: 11px 14px; font-size: .92rem; }
.ga-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; }
.ga-kpi, .ga-cartao { background: var(--ga-papel, #fff); border: 1px solid var(--ga-borda, #ddd); border-radius: var(--ga-raio, 14px); }
.ga-kpi { padding: 13px 15px; }
.ga-kpi small { color: var(--ga-tinta-2, #666); font-size: .8rem; }
.ga-kpi b { display: block; font-size: 1.15rem; margin: 4px 0 2px; }
.ga-kpi span { color: var(--ga-tinta-2, #666); font-size: .8rem; }
.ga-duas { display: grid; grid-template-columns: 1.3fr 1fr; gap: 14px; align-items: start; }
@media (max-width: 860px) { .ga-duas { grid-template-columns: 1fr; } }
.ga-cartao h3 { margin: 0; font-size: 1rem; }
.ga-cartao-cab { padding: 13px 16px; border-bottom: 1px solid var(--ga-borda, #ddd); display: flex; justify-content: space-between; gap: 10px; align-items: center; }
.ga-cartao-cab p { margin: 2px 0 0; color: var(--ga-tinta-2, #666); font-size: .82rem; }
.ga-cartao-corpo { padding: 12px 16px; display: grid; gap: 10px; }
.ga-lista { list-style: none; margin: 0; padding: 0 16px; }
.ga-lista li { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--ga-borda, #eee); }
.ga-lista li:last-child { border-bottom: 0; }
.ga-av { width: 36px; height: 36px; border-radius: 11px; background: var(--ga-acento, #222); color: var(--ga-acento-tx, #fff); display: grid; place-items: center; font-weight: 700; font-size: .8rem; flex: none; }
.ga-cresce { flex: 1; min-width: 0; }
.ga-cresce b { display: block; font-weight: 600; }
.ga-cresce span { color: var(--ga-tinta-2, #666); font-size: .82rem; }
.ga-et { display: inline-block; padding: 1px 8px; border-radius: 6px; font-size: .72rem; font-weight: 700; background: var(--ga-suave, rgba(0, 0, 0, .06)); margin-left: 4px; vertical-align: middle; }
.ga-prog { height: 7px; border-radius: 9px; background: var(--ga-suave, rgba(0, 0, 0, .08)); overflow: hidden; }
.ga-prog i { display: block; height: 100%; background: var(--ga-acento, #222); }
.ga-perm { width: 100%; border-collapse: collapse; font-size: .9rem; }
.ga-perm td { padding: 7px 4px; border-bottom: 1px solid var(--ga-borda, #eee); }
.ga-perm select { font: inherit; border: 1px solid var(--ga-borda, #ccc); border-radius: 8px; padding: 4px 6px; background: var(--ga-papel, #fff); color: inherit; }
.ga-linha { display: flex; gap: 8px; }
.ga-linha input { flex: 1; min-width: 0; font: inherit; border: 1px solid var(--ga-borda, #ccc); border-radius: 10px; padding: 8px 10px; background: var(--ga-papel, #fff); color: inherit; }
.ga-toast { position: fixed; z-index: 95; left: 50%; bottom: 110px; translate: -50% 0; background: var(--ga-acento, #222); color: var(--ga-acento-tx, #fff); padding: 10px 16px; border-radius: 12px; font-weight: 600; box-shadow: 0 10px 30px -10px rgba(0, 0, 0, .5); }
`;
let estiloPosto = false;
function estilo() { if (estiloPosto) return; estiloPosto = true; const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); }
function toast(t) { const d = document.createElement('div'); d.className = 'ga-toast'; d.setAttribute('role', 'status'); d.textContent = t; document.body.append(d); setTimeout(() => d.remove(), 2800); }
function caixa(titulo, corpo, pe) {
  estilo();
  const antes = document.activeElement, f = document.createElement('div');
  f.className = 'ga-fundo';
  f.innerHTML = `<div class="ga-caixa" role="dialog" aria-modal="true" aria-label="${esc(titulo)}"><div class="ga-cab"><h2>${titulo}</h2><button type="button" class="ga-x" data-ga-fechar aria-label="Fechar">×</button></div><div class="ga-corpo">${corpo}</div>${pe ? `<div class="ga-pe">${pe}</div>` : ''}</div>`;
  const fechar = () => { f.remove(); removeEventListener('keydown', tecla, true); antes?.focus?.(); };
  const tecla = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fechar(); } };
  f.addEventListener('click', (e) => { if (e.target === f || e.target.closest('[data-ga-fechar]')) fechar(); });
  addEventListener('keydown', tecla, true);
  document.body.append(f);
  setTimeout(() => (f.querySelector('textarea, input, select') || f.querySelector('.ga-x')).focus(), 30);
  return { el: f, fechar };
}

// ---------------------------------------------------------------- Assistente IA
// opts: { sistema, numeros: () => [[rótulo, valor]], alertas: () => [texto], telas: [nomes] }
export function abrirIA(opts) {
  const sugestoes = ['O que eu devo priorizar hoje?', 'Como está o meu mês?', 'Escreva uma mensagem de cobrança educada', 'O que eu devo comprar esta semana?', `Como funciona o ${opts.sistema}?`];
  const { el } = caixa('Assistente IA <span class="ga-et">grátis</span>', `
    <div class="ga-ia-topo"><img src="${LOGO}" alt="Blue Rose" width="64" height="64"><div style="display:grid;gap:8px">
      <p class="ga-mute">Pergunte sobre o seu negócio ou sobre como usar o sistema. A IA vê só os números e avisos do dia, nunca telefones, e-mails ou documentos dos seus clientes. Na demonstração, a resposta é um exemplo.</p>
      <div class="ga-dica">Você tem <b>20 perguntas grátis por dia</b> na versão com conta.</div></div></div>
    <details class="ga-conta"><summary>Usar a minha conta do Gemini ou do ChatGPT <span class="ga-mute" style="font-weight:400">(só para você)</span></summary>
      <p class="ga-mute" style="margin-top:8px">Com a sua própria chave de API você pergunta até 300 vezes por dia. Vale só para o seu usuário e a chave fica guardada no servidor, sem aparecer para ninguém. Disponível na versão contratada.</p></details>
    <div class="ga-sugs">${sugestoes.map((s) => `<button type="button" class="ga-btn peq" data-ga-sug="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    <label class="ga-campo">Sua pergunta<textarea rows="2" maxlength="600" data-ga-perg placeholder="Ex.: quais clientes eu devo cobrar primeiro?"></textarea></label>
    <div class="ga-resp" data-ga-resp hidden aria-live="polite"></div>`,
  '<button type="button" class="ga-btn" data-ga-fechar>Fechar</button><button type="button" class="ga-btn pri" data-ga-perguntar>Perguntar</button>');
  const perg = el.querySelector('[data-ga-perg]'), out = el.querySelector('[data-ga-resp]');
  const perguntar = () => {
    const p = perg.value.trim(); if (p.length < 3) { perg.focus(); return; }
    out.hidden = false; out.textContent = 'Pensando…';
    if (window.veltriaIA) window.veltriaIA(p).then((t) => { out.textContent = t; });
    else setTimeout(() => { out.textContent = respostaExemplo(p, opts); }, 900);
  };
  el.addEventListener('click', (e) => {
    const s = e.target.closest('[data-ga-sug]'); if (s) { perg.value = s.dataset.gaSug; perguntar(); }
    if (e.target.closest('[data-ga-perguntar]')) perguntar();
  });
  perg.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); perguntar(); } });
}
function respostaExemplo(p, o) {
  const q = norm(p), nums = (o.numeros?.() || []), alertas = (o.alertas?.() || []);
  const numeros = nums.length ? nums.map(([a, b]) => `${a}: ${b}`).join('; ') : 'ainda há poucos dados';
  let t;
  if (/prioriz|hoje|urgente|primeiro|agora/.test(q)) t = alertas.length ? `Hoje, comece por aqui:\n- ${alertas.slice(0, 4).join('\n- ')}\n\nDepois disso, confira os números: ${numeros}.` : `Nada urgente agora (${numeros}). Bom momento para chamar clientes antigos e conferir o estoque.`;
  else if (/mes|vend|fatur|lucro|caixa|resultado|numero/.test(q)) t = `Resumo do momento: ${numeros}.${alertas.length ? `\n\nAtenção: ${alertas[0]}.` : ''}\n\nPara comparar com o mês passado, abra os relatórios.`;
  else if (/cobr|mensagem|whats|lembrete|atras|fiado/.test(q)) t = 'Mensagem pronta para mandar no WhatsApp:\n\n"Olá, tudo bem? Passando para lembrar do valor em aberto aqui na loja. Se já pagou, desconsidere. Se preferir, te mando o PIX agora mesmo. Obrigado!"\n\nDica: mande no começo da manhã e já ofereça o PIX.';
  else if (/compr|repor|estoque|acaban|produto|fornecedor|validade|lote/.test(q)) t = `Para comprar certo: comece pelos itens abaixo do mínimo e pelos que mais saem.${alertas.length ? `\n\nAgora: ${alertas.filter((a) => /acab|repor|m[ií]nimo|lote|venc/i.test(a)).slice(0, 3).join('; ') || alertas[0]}.` : ''}\n\nCompre o suficiente para umas 4 semanas: menos dinheiro parado e menos falta na prateleira.`;
  else if (/cliente|vender mais|divulg|marketing|indica|instagram/.test(q)) t = 'Três ações para esta semana:\n1. Chame os clientes que não compram há mais de 45 dias com uma oferta simples.\n2. Faça uma promoção do produto que está parado na prateleira.\n3. Peça indicação para quem compra sempre, com um mimo para quem indicar.';
  else if (/como (funciona|usa|faco|cadastr)|onde|tela|menu|sistema/.test(q)) t = `O ${o.sistema} é dividido em: ${(o.telas || []).join(', ')}. Comece cadastrando os produtos (ou suba a sua planilha), venda pela tela de vendas e acompanhe o dia pelo painel. Se travar em algo, abra um chamado no suporte.`;
  else t = `Pelos números de agora (${numeros}), o melhor caminho é ${alertas.length ? `resolver primeiro: ${alertas[0]}` : 'manter a rotina e olhar o painel todo dia'}.`;
  return `${t}\n\n(Exemplo da demonstração. Na versão contratada, a IA responde exatamente à sua pergunta, com os números da sua empresa.)`;
}

// ---------------------------------------------------------------- Painel do dono
// opts: { sistema, preco, chave, areas: [[id, nome]], cargos: { nome: { área: 'editar'|'ver'|'nenhum' } }, equipe: [[nome, cargo]], dono }
const NIVEIS = [['editar', 'Pode editar'], ['ver', 'Só ver'], ['nenhum', 'Sem acesso']];
const iniciais = (n) => String(n).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
export function painelDono(el, opts) {
  estilo();
  const CH = `${opts.chave}-dono`;
  let st; try { st = JSON.parse(localStorage.getItem(CH)); } catch { st = null; }
  if (!st) st = { plano: 'basico', anual: false, equipe: opts.equipe.map(([nome, cargo], i) => ({ id: `m${i}`, nome, email: `${norm(nome).split(' ')[0]}@${norm(opts.empresa || 'loja').replace(/[^a-z]/g, '').slice(0, 14)}.com.br`, cargo, admin: i === 0, perm: { ...(opts.cargos[cargo] || {}) } })) };
  const gravar = () => { try { localStorage.setItem(CH, JSON.stringify(st)); } catch { /* sem espaço */ } };
  const limite = () => (st.plano === 'pro' ? Infinity : 5);
  const preco = () => (opts.preco + 0) * (st.anual ? 12 * 0.8 : 1);
  const resumo = (m) => { if (m.admin) return `${m.cargo} · administrador, acesso total`; const ed = opts.areas.filter(([a]) => m.perm[a] === 'editar').length, ve = opts.areas.filter(([a]) => m.perm[a] === 'ver').length; return `${m.cargo} · edita ${ed} ${ed === 1 ? 'área' : 'áreas'}, só vê ${ve}`; };
  const brl = (v) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
  function desenhar() {
    el.innerHTML = `<div class="ga-dono">
      <div class="ga-aviso"><span aria-hidden="true">👑</span><span>Só o dono e os administradores veem este painel. A equipe usa o sistema com o cargo e as permissões que você escolher.</span></div>
      <div class="ga-kpis">
        <div class="ga-kpi"><small>Sua função</small><b>Dono</b><span>acesso a tudo, inclusive plano</span></div>
        <div class="ga-kpi"><small>Equipe</small><b>${st.equipe.length + 1} pessoas</b><span>sem limite de pessoas</span></div>
        <div class="ga-kpi"><small>Token de dono</small><b>Ativado</b><span>pedido só no primeiro acesso</span></div>
        <div class="ga-kpi"><small>Plano</small><b>Assinatura ${st.anual ? 'anual' : 'mensal'}</b><span>${brl(preco())}/${st.anual ? 'ano' : 'mês'}</span></div>
      </div>
      <div class="ga-duas">
        <section class="ga-cartao"><div class="ga-cartao-cab"><div><h3>Equipe</h3><p>Cada pessoa entra com o próprio e-mail e só vê o que você liberar</p></div><button type="button" class="ga-btn pri" data-ga-convidar>+ Convidar</button></div>
          <ul class="ga-lista"><li><span class="ga-av">${iniciais(opts.dono)}</span><div class="ga-cresce"><b>${esc(opts.dono)} <span class="ga-et">Dono</span></b><span>você · acesso total</span></div></li>
          ${st.equipe.map((m) => `<li><span class="ga-av">${iniciais(m.nome || m.email)}</span><div class="ga-cresce"><b>${esc(m.nome || m.email)}${m.admin ? ' <span class="ga-et">Administrador</span>' : ''}${m.convite ? ' <span class="ga-et">Convite enviado</span>' : ''}</b><span>${esc(resumo(m))}</span></div><button type="button" class="ga-btn peq" data-ga-acesso="${m.id}">Cargo e acesso</button></li>`).join('')}</ul></section>
        <div style="display:grid;gap:14px">
          <section class="ga-cartao"><div class="ga-cartao-cab"><div><h3>Plano e pagamento</h3><p>${esc(opts.sistema)} · sem fidelidade</p></div></div><div class="ga-cartao-corpo">
            <div class="ga-linha" role="group" aria-label="Plano"><button type="button" class="ga-btn ${st.plano === 'basico' ? 'pri' : ''}" data-ga-plano="basico">Assinatura · ${brl(opts.preco)}/mês</button></div>
            <label class="ga-mute"><input type="checkbox" data-ga-anual ${st.anual ? 'checked' : ''}> Pagar por ano e economizar 20%</label>
            <p class="ga-mute">Equipe sem limite, histórico de quem fez o quê e até 10 empresas. Anual com 20% a menos, confirmado no Mercado Pago.</p></div></section>
          <section class="ga-cartao"><div class="ga-cartao-cab"><div><h3>Indique e ganhe</h3><p>A cada 3 indicações que assinam, 1 mês grátis de assinatura</p></div></div><div class="ga-cartao-corpo">
            <div class="ga-linha"><input readonly value="https://bluerose-store.com/?indica=K7M2Q9XA" aria-label="Link de indicação de exemplo"><button type="button" class="ga-btn" data-ga-copiar>Copiar</button></div>
            <span class="ga-mute">2 de 3 para o próximo mês grátis</span><div class="ga-prog"><i style="width:67%"></i></div></div></section>
          <section class="ga-cartao"><div class="ga-cartao-cab"><div><h3>Cargos sugeridos</h3><p>O cargo já marca o que a pessoa pode fazer</p></div></div><ul class="ga-lista">${Object.entries(opts.cargos).map(([n, pr]) => `<li><div class="ga-cresce"><b>${esc(n)}</b><span>edita: ${opts.areas.filter(([a]) => pr[a] === 'editar').map(([, r]) => r).join(', ') || 'nada'}</span></div></li>`).join('')}</ul></section>
        </div></div></div>`;
  }
  function editarAcesso(m) {
    const novo = !m, base = m || { nome: '', email: '', cargo: Object.keys(opts.cargos)[0], admin: false, perm: { ...Object.values(opts.cargos)[0] } };
    const { el: f, fechar } = caixa(novo ? 'Convidar pessoa' : `Cargo e acesso · ${esc(base.nome || base.email)}`, `
      ${novo ? '<label class="ga-campo">E-mail da pessoa<input type="email" data-ga-email placeholder="nome@empresa.com.br" required></label>' : ''}
      <div class="ga-linha"><label class="ga-campo" style="flex:1">Cargo<select data-ga-cargo>${Object.keys(opts.cargos).map((c) => `<option ${c === base.cargo ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <label class="ga-campo" style="flex:1">Papel<select data-ga-papel><option value="membro">Membro da equipe</option><option value="admin" ${base.admin ? 'selected' : ''}>Administrador (vê este painel)</option></select></label></div>
      <table class="ga-perm"><tbody>${opts.areas.map(([a, r]) => `<tr><td>${esc(r)}</td><td style="text-align:right"><select data-ga-area="${a}" aria-label="Acesso a ${esc(r)}">${NIVEIS.map(([v, t]) => `<option value="${v}" ${(base.perm[a] || 'nenhum') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table>
      <p class="ga-mute">Ninguém da equipe apaga registros nem mexe no plano; isso fica com o dono e os administradores.</p><p class="ga-mute" data-ga-erro hidden style="color:#a33"></p>`,
    `${novo ? '' : '<button type="button" class="ga-btn" data-ga-remover style="margin-right:auto">Tirar da equipe</button>'}<button type="button" class="ga-btn" data-ga-fechar>Cancelar</button><button type="button" class="ga-btn pri" data-ga-salvar>${novo ? 'Enviar convite' : 'Salvar'}</button>`);
    f.querySelector('[data-ga-cargo]').addEventListener('change', (e) => { const pr = opts.cargos[e.target.value] || {}; f.querySelectorAll('[data-ga-area]').forEach((s) => { s.value = pr[s.dataset.gaArea] || 'nenhum'; }); });
    f.addEventListener('click', (e) => {
      if (e.target.closest('[data-ga-remover]')) { st.equipe = st.equipe.filter((x) => x !== m); gravar(); fechar(); desenhar(); toast('Pessoa tirada da equipe. O acesso dela acabou.'); return; }
      if (!e.target.closest('[data-ga-salvar]')) return;
      const erro = f.querySelector('[data-ga-erro]'), dados = { cargo: f.querySelector('[data-ga-cargo]').value, admin: f.querySelector('[data-ga-papel]').value === 'admin', perm: Object.fromEntries([...f.querySelectorAll('[data-ga-area]')].map((s) => [s.dataset.gaArea, s.value])) };
      if (novo) {
        const email = f.querySelector('[data-ga-email]').value.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { erro.hidden = false; erro.textContent = 'Coloque um e-mail válido.'; return; }
        if (st.equipe.some((x) => x.email === email)) { erro.hidden = false; erro.textContent = 'Essa pessoa já está na equipe.'; return; }
        st.equipe.push({ id: `m${Date.now()}`, nome: '', email, convite: true, ...dados }); toast(`Convite enviado para ${email}.`);
      } else { Object.assign(m, dados); toast('Acesso atualizado.'); }
      gravar(); fechar(); desenhar();
    });
  }
  el.onclick = (e) => {
    if (e.target.closest('[data-ga-convidar]')) editarAcesso(null);
    const a = e.target.closest('[data-ga-acesso]'); if (a) editarAcesso(st.equipe.find((x) => x.id === a.dataset.gaAcesso));
    const p = e.target.closest('[data-ga-plano]'); if (p) { if (p.dataset.gaPlano === 'basico' && st.equipe.length > 5) { toast('Para voltar ao Básico, a equipe precisa ter no máximo 5 pessoas.'); return; } st.plano = p.dataset.gaPlano; gravar(); desenhar(); toast(`Plano Assinatura escolhido. Na versão contratada você confirma no Mercado Pago.`); }
    if (e.target.closest('[data-ga-copiar]')) { navigator.clipboard?.writeText('https://bluerose-store.com/?indica=K7M2Q9XA').catch(() => {}); toast('Link copiado.'); }
  };
  el.onchange = (e) => { if (e.target.matches('[data-ga-anual]')) { st.anual = e.target.checked; gravar(); desenhar(); } };
  desenhar();
}
export const limparDono = (chave) => { try { localStorage.removeItem(`${chave}-dono`); } catch { /* sem acesso */ } };
