/* Minha conta · Suporte e feedback.
   Cliente: abre chamados (de qualquer sistema ou do site), acompanha a conversa e manda feedback.
   Equipe da Blue Rose (e-mails em nexo_suporte_equipe): vê todos os chamados abertos e os feedbacks, e responde por aqui.
   Os avisos por e-mail (para a equipe e para o cliente) saem pelo Escritório. */
(function () {
  var C = window.BR_CONTA, caixa = document.getElementById('suporte');
  if (!C || !caixa) return;
  var esc = C.esc;
  var TIPOFB = { sugestao: 'Sugestão', elogio: 'Elogio', problema: 'Problema', outro: 'Outro' };
  var CATEG = { erro: 'Erro no sistema', duvida: 'Dúvida de uso', pagamento: 'Pagamento ou plano', sugestao: 'Pedido de melhoria' };
  var ST = { aberto: ['Aguardando o suporte', 'al'], respondido: ['Respondido', 'ok'], resolvido: ['Resolvido', ''] };
  var SIS = { '': 'Site ou conta', gestao: 'Veltria Gestão', crm: 'Veltria CRM', agenda: 'Veltria Agenda', juridico: 'Veltria Jurídico', financeiro: 'Veltria Financeiro', clinica: 'Veltria Clínica', academia: 'Veltria Academia', restaurante: 'Veltria Restaurante', imobiliaria: 'Veltria Imobiliária', oficina: 'Veltria Oficina', farmacia: 'Veltria Farmácia', obras: 'Veltria Obras', cerimonial: 'Blue Rose Eternize', pragas: 'Blue Rose Guard', ofixl: 'Blue Rose Ofixl' };
  var cli = null, suporte = false, aberto = null;
  function data(s) { var d = new Date(s); return d.toLocaleDateString('pt-BR') + ' ' + d.toTimeString().slice(0, 5); }
  function etiqueta(s) { var m = ST[s] || ST.aberto; return '<span class="conta-et ' + m[1] + '">' + m[0] + '</span>'; }
  function opcoes(o, sel) { return Object.keys(o).map(function (k) { return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + esc(o[k]) + '</option>'; }).join(''); }

  function desenhar(lista, feedbacks) {
    var linhas = lista.map(function (t) {
      return '<li class="sup-item" data-id="' + t.id + '"><button type="button" class="sup-cab" data-abrir="' + t.id + '"><span class="mono">#' + t.numero + '</span><span class="sup-tit"><b>' + esc(t.assunto) + '</b><small>' + esc(SIS[t.app || ''] || t.app) + ' · ' + esc(CATEG[t.categoria] || '') + (suporte ? ' · ' + esc(t.email) : '') + ' · ' + data(t.atualizado) + '</small></span>' + etiqueta(t.status) + '</button>' + (aberto === t.id ? '<div class="sup-conversa" data-conversa="' + t.id + '">Carregando…</div>' : '') + '</li>';
    }).join('');
    caixa.innerHTML = '<div class="conta-bloco sup">' +
      '<div class="sup-topo"><div><h2>' + (suporte ? 'Painel de suporte' : 'Suporte') + '</h2><p>' + (suporte ? 'Chamados de todos os clientes. Ao responder, o cliente recebe a resposta por e-mail.' : 'Encontrou um erro ou tem uma dúvida? Abra um chamado. Respondemos em até 1 dia útil, aqui e no seu e-mail.') + '</p></div></div>' +
      (suporte ? '' : '<form class="sup-form" data-novo><div class="sup-campos"><label>Sistema<select name="app">' + opcoes(SIS, '') + '</select></label><label>Tipo<select name="categoria">' + opcoes(CATEG, 'erro') + '</select></label></div><label>Assunto<input name="assunto" required minlength="3" maxlength="150"></label><label>O que aconteceu<textarea name="texto" required minlength="5" maxlength="4000" rows="4"></textarea></label><button type="submit" class="btn btn-primary">Abrir chamado</button><p class="sup-erro" data-erro></p></form>') +
      '<h3 class="sup-h3">' + (suporte ? 'Chamados' : 'Seus chamados') + '</h3>' + (linhas ? '<ul class="sup-lista">' + linhas + '</ul>' : '<p class="sup-vazio">Nenhum chamado ainda.</p>') +
      (suporte && feedbacks ? '<h3 class="sup-h3">Feedbacks recentes</h3>' + (feedbacks.length ? '<ul class="sup-lista">' + feedbacks.map(function (f) { return '<li class="sup-fb"><b>' + esc(SIS[f.app || ''] || f.app || 'Site') + ' · ' + esc(TIPOFB[f.tipo] || f.tipo) + (f.nota ? ' · nota ' + f.nota : '') + '</b><span>' + esc(f.texto) + '</span><small>' + esc(f.email || 'sem e-mail') + ' · ' + data(f.criado) + '</small></li>'; }).join('') + '</ul>' : '<p class="sup-vazio">Nenhum feedback ainda.</p>') : '') +
      (suporte ? '' : '<details class="sup-fb-form"><summary>Mandar um feedback</summary><form data-feedback><label>Tipo<select name="tipo"><option value="sugestao">Sugestão</option><option value="elogio">Elogio</option><option value="problema">Problema</option><option value="outro">Outro</option></select></label><label>Nota (1 a 5)<select name="nota"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label><label>Mensagem<textarea name="texto" required minlength="3" maxlength="2000" rows="3"></textarea></label><button type="submit" class="btn btn-ghost">Enviar feedback</button><p class="sup-erro" data-erro-fb></p></form></details>') +
      '</div>';
    if (aberto) conversa(aberto);
  }

  function carregar() {
    if (!C.sessao()) { caixa.hidden = true; return; }
    caixa.hidden = false;
    C.sb().then(function (c) {
      cli = c;
      return c.rpc('nexo_sou_suporte').then(function (r) { suporte = !!r.data; });
    }).then(function () {
      var q = cli.from('nexo_tickets').select('id,numero,assunto,categoria,status,app,email,atualizado').order('atualizado', { ascending: false }).limit(suporte ? 100 : 40);
      return Promise.all([q, suporte ? cli.from('nexo_feedback').select('app,tipo,nota,texto,email,criado').order('criado', { ascending: false }).limit(30) : Promise.resolve({ data: null })]);
    }).then(function (r) {
      var l = r[0].data || [];
      if (suporte) l.sort(function (a, b) { return (a.status === 'resolvido') - (b.status === 'resolvido'); });
      desenhar(l, r[1].data);
    }).catch(function () { caixa.innerHTML = '<div class="conta-bloco"><h2>Suporte</h2><p>Não foi possível carregar os chamados agora. Escreva para blueroseexpressoficial@gmail.com.</p></div>'; });
  }

  function conversa(id) {
    var alvo = caixa.querySelector('[data-conversa="' + id + '"]'); if (!alvo) return;
    Promise.all([cli.from('nexo_ticket_msgs').select('autor,texto,criado').eq('ticket', id).order('criado'), cli.from('nexo_tickets').select('status,contexto').eq('id', id).maybeSingle()]).then(function (r) {
      var msgs = r[0].data || [], t = r[1].data || {};
      alvo.innerHTML = msgs.map(function (m) { return '<div class="sup-msg ' + m.autor + '"><small>' + (m.autor === 'suporte' ? 'Suporte Blue Rose' : (suporte ? 'Cliente' : 'Você')) + ' · ' + data(m.criado) + '</small><p>' + esc(m.texto) + '</p></div>'; }).join('') +
        (suporte && t.contexto && Object.keys(t.contexto).length ? '<details class="sup-ctx"><summary>Detalhes técnicos</summary><pre>' + esc(JSON.stringify(t.contexto, null, 1)) + '</pre></details>' : '') +
        '<form class="sup-resp" data-responder="' + id + '"><textarea name="texto" required maxlength="4000" rows="3" placeholder="' + (t.status === 'resolvido' ? 'Responder para reabrir' : 'Escreva a resposta') + '"></textarea><div class="sup-botoes"><button type="submit" class="btn btn-primary">Enviar</button>' + (t.status !== 'resolvido' ? '<button type="button" class="btn btn-ghost" data-resolver="' + id + '">Marcar como resolvido</button>' : '') + '</div></form>';
    });
  }

  caixa.addEventListener('click', function (e) {
    var a = e.target.closest('[data-abrir]');
    if (a) { aberto = aberto === a.getAttribute('data-abrir') ? null : a.getAttribute('data-abrir'); carregar(); return; }
    var r = e.target.closest('[data-resolver]');
    if (r) cli.rpc('nexo_ticket_status', { p_ticket: r.getAttribute('data-resolver'), p_status: 'resolvido' }).then(carregar);
  });
  caixa.addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target, d = Object.fromEntries(new FormData(f)), btn = f.querySelector('[type=submit]'); btn.disabled = true;
    var fim = function (res, erroEl, ok) { btn.disabled = false; if (res.error) { if (erroEl) erroEl.textContent = res.error.message; return; } if (ok) ok(); };
    if (f.hasAttribute('data-novo')) {
      cli.rpc('nexo_ticket_abrir', { p_app: d.app || null, p_espaco: null, p_assunto: d.assunto, p_categoria: d.categoria, p_texto: d.texto, p_contexto: { origem: 'Minha conta', navegador: navigator.userAgent.slice(0, 200) } })
        .then(function (res) { fim(res, f.querySelector('[data-erro]'), function () { aberto = null; carregar(); }); });
    } else if (f.hasAttribute('data-responder')) {
      cli.rpc('nexo_ticket_responder', { p_ticket: f.getAttribute('data-responder'), p_texto: d.texto }).then(function (res) { fim(res, null, carregar); });
    } else if (f.hasAttribute('data-feedback')) {
      cli.rpc('nexo_feedback_enviar', { p_app: null, p_tipo: d.tipo, p_nota: Number(d.nota), p_texto: d.texto, p_email: null, p_pagina: 'conta.html', p_espaco: null })
        .then(function (res) { fim(res, f.querySelector('[data-erro-fb]'), function () { f.reset(); f.querySelector('[data-erro-fb]').textContent = 'Obrigado! O seu feedback chegou para a nossa equipe.'; }); });
    }
  });
  // espera o login da página (conta.js) e recarrega quando a sessão muda
  var tentativas = 0; (function esperar() { if (C.sessao() || tentativas++ > 20) carregar(); else setTimeout(esperar, 500); })();
  addEventListener('storage', function (e) { if (e.key === 'nexo-sessao') carregar(); });
})();
