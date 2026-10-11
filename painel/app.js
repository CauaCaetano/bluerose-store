/*
 * App do Escritório Blue Rose no celular.
 * Lê o "espelho" que o escritório publica no Supabase e manda comandos
 * (aprovar, ligar a jornada, metas, notificações). Só funciona com a chave
 * deste aparelho, criada no pareamento (QR code no computador).
 */
(function () {
  'use strict';
  var SB = 'https://yihnfzwtkqdfnwziutqa.supabase.co';
  var PUB = 'sb_publishable_nrMgwLCtiojWE-yWMeZK7g_iinpfY_5';
  var VERSAO_APP = '1.0.0';
  var $ = function (id) { return document.getElementById(id); };
  var esp = {}, tela = 'inicio', filtroEtapa = null, ultimoOk = 0, carregando = false;

  // ---------------------------------------------------------------- utilidades
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var brl = function (v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var data = function (iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); };
  var quando = function (iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (!(s >= 0)) return '';
    if (s < 60) return 'agora'; if (s < 3600) return 'há ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'há ' + Math.round(s / 3600) + ' h'; return data(iso);
  };
  function toast(t) { var e = $('toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { e.hidden = true; }, 3200); }
  var chave = function () { try { return localStorage.getItem('br-chave') || ''; } catch (e) { return ''; } };
  function guardarChave(c) { try { if (c) localStorage.setItem('br-chave', c); else localStorage.removeItem('br-chave'); } catch (e) {} }

  function api(caminho, op) {
    op = op || {};
    return fetch(SB + '/rest/v1/' + caminho, {
      method: op.metodo || 'GET',
      headers: Object.assign({ apikey: PUB, Authorization: 'Bearer ' + PUB, 'x-escritorio': chave(), 'Content-Type': 'application/json' }, op.cab || {}),
      body: op.corpo ? JSON.stringify(op.corpo) : undefined,
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.status === 204 ? null : r.json(); });
  }

  /** Manda um comando e espera o escritório responder (até 40 s) */
  function comando(tipo, dados) {
    return api('escritorio_comandos', { metodo: 'POST', corpo: { tipo: tipo, dados: dados || {} }, cab: { Prefer: 'return=representation' } }).then(function (r) {
      var id = r && r[0] && r[0].id, fim = Date.now() + 40000;
      return new Promise(function (ok, falha) {
        (function ver() {
          api('escritorio_comandos?id=eq.' + id + '&select=feito_em,resultado').then(function (l) {
            var c = l && l[0];
            if (c && c.feito_em) { if (c.resultado && c.resultado.erro) falha(new Error(c.resultado.erro)); else ok(c.resultado || {}); }
            else if (Date.now() > fim) falha(new Error('O escritório não respondeu. O computador está ligado?'));
            else setTimeout(ver, 2000);
          }).catch(falha);
        })();
      });
    });
  }

  // ---------------------------------------------------------------- dados
  function carregar(forcar) {
    if (!chave() || carregando) return Promise.resolve();
    carregando = true; $('btn-recarregar').classList.add('girando');
    return api('escritorio_espelho?select=chave,dados,atualizado_em').then(function (l) {
      if (!l.length) { esp = {}; mostrarPareamento('Este aparelho foi desconectado ou a chave não vale mais. Pareie de novo pelo computador.'); return; }
      l.forEach(function (x) { esp[x.chave] = x.dados; esp['_' + x.chave] = x.atualizado_em; });
      ultimoOk = Date.now();
      desenhar();
    }).catch(function () { $('sinc').textContent = 'sem conexão'; $('sinc').className = 'off'; })
      .then(function () { carregando = false; $('btn-recarregar').classList.remove('girando'); });
  }

  function statusSinc() {
    var m = esp._meta;
    if (!m) return;
    var idade = (Date.now() - new Date(m).getTime()) / 60000;
    $('sinc').textContent = idade > 4 ? 'PC desligado? última atualização ' + quando(m) : 'atualizado ' + quando(m);
    $('sinc').className = idade > 4 ? 'off' : '';
  }

  // ---------------------------------------------------------------- telas
  function mostrarPareamento(msg) {
    $('abas').hidden = true;
    document.querySelectorAll('.tela').forEach(function (t) { t.hidden = t.id !== 'tela-parear'; });
    if (msg) { var p = $('tela-parear').querySelector('.nota'); p.textContent = msg; }
    $('sinc').textContent = 'não conectado';
  }

  function abrir(t) {
    tela = t;
    document.querySelectorAll('#abas button').forEach(function (b) { if (b.dataset.tela === t) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    desenhar();
    window.scrollTo(0, 0);
  }

  function desenhar() {
    $('abas').hidden = false;
    document.querySelectorAll('.tela').forEach(function (x) { x.hidden = x.id !== 'tela-' + tela; });
    var n = (esp.aprovacoes || []).length; $('selo-aprovar').hidden = !n; $('selo-aprovar').textContent = n;
    var a = (esp.avisos || []).filter(function (x) { return !x.lida; }).length; $('selo-avisos').hidden = !a; $('selo-avisos').textContent = a > 9 ? '9+' : a;
    statusSinc();
    ({ inicio: inicio, aprovar: aprovar, jornada: jornada, avisos: avisos, ajustes: ajustes })[tela]();
  }

  function barra(item, rotulo, fmt) {
    var ok = item.pct >= 100, esperado = Math.min(100, item.esperado_pct || 0);
    return '<div class="meta"><div class="meta-linha"><span>' + rotulo + '</span><b>' + fmt(item.atual) + ' / ' + fmt(item.meta) + '</b></div>' +
      '<div class="barra' + (ok ? ' ok' : '') + '"><i style="width:' + item.pct + '%"></i>' + (esperado && esperado < 100 ? '<em style="left:' + esperado + '%" title="onde deveria estar hoje"></em>' : '') + '</div></div>';
  }

  function inicio() {
    var c = esp.carteira || {}, p = esp.painel || {}, k = p.kpis || {}, m = (esp.metas || {}).progresso, j = (esp.jornada || {}).maestro || {};
    var h = '';
    h += '<div class="cartao"><h2>Carteira <small>Mercado Pago</small></h2>' +
      (c.configurado === false ? '<p class="nota">Mercado Pago não conectado no escritório.</p>' :
        '<div class="rotulo">Recebido no mês (líquido)</div><div class="grande verde">' + brl(c.mes) + '</div>' +
        '<div class="grade2"><div><small>A liberar</small><b>' + brl(c.a_liberar) + '</b><small>' + (c.proxima_liberacao ? 'próxima ' + data(c.proxima_liberacao) : 'nada pendente') + '</small></div>' +
        '<div><small>Hoje</small><b>' + brl(c.hoje) + '</b><small>semana ' + brl(c.semana) + '</small></div>' +
        '<div><small>Assinaturas ativas</small><b>' + ((c.assinaturas || {}).ativas || 0) + '</b><small>' + ((c.assinaturas || {}).mensal ? brl(c.assinaturas.mensal) + '/mês' : '') + '</small></div>' +
        '<div><small>Liberado em 30 dias</small><b>' + brl(c.liberado_30d) + '</b></div></div>') + '</div>';
    if (m) h += '<div class="cartao"><h2>Metas <small>toque em Ajustes para mudar</small></h2>' +
      barra(m.vendas_mes, 'Vendas no mês', function (v) { return v; }) + barra(m.receita_mes, 'Recebido no mês', brl) + barra(m.contatos_semana, 'Contatos na semana', function (v) { return v; }) + '</div>';
    h += '<div class="kpis"><div><b>' + (k.empresas || 0) + '</b><span>na jornada</span></div><div><b>' + (k.respostas || 0) + '</b><span>responderam</span></div><div><b>' + (k.contratos || 0) + '</b><span>contratos</span></div></div>';
    h += '<div class="cartao"><div class="linha-acao"><div><h2 style="margin:0">Jornada automática</h2><div class="rotulo">' +
      (j.ativo ? (j.comercial === false ? 'Ligada · fora do horário comercial: ninguém recebe mensagem agora' : 'Ligada · prospectando e atendendo') : 'Desligada · ninguém é contatado') +
      '</div></div><button type="button" class="chave" role="switch" id="chave-maestro" aria-checked="' + !!j.ativo + '" aria-label="Ligar ou desligar a jornada automática"></button></div></div>';
    var ag = p.agora || [];
    h += '<div class="cartao"><h2>Agora no escritório <small>' + (p.fila ? p.fila + ' na fila' : '') + '</small></h2>' +
      (ag.length ? '<ul class="lista">' + ag.slice(0, 6).map(function (t) { return '<li><span><b>' + esc(t.nome) + '</b> <small>' + esc(t.cargo) + '</small><small>' + esc(t.titulo) + '</small></span></li>'; }).join('') + '</ul>' : '<p class="nota">Ninguém trabalhando agora.</p>') + '</div>';
    var ult = c.ultimos || [];
    if (ult.length) h += '<div class="cartao"><h2>Últimos recebimentos</h2><ul class="lista">' + ult.slice(0, 5).map(function (u) {
      return '<li><span>' + data(u.data) + ' · ' + esc(u.metodo) + (u.site ? ' · site' : '') + '<small>' + esc(u.descricao) + '</small></span><b class="verde">' + brl(u.liquido) + '</b></li>';
    }).join('') + '</ul></div>';
    $('tela-inicio').innerHTML = h;
    var ch = $('chave-maestro');
    if (ch) ch.addEventListener('click', function () {
      var ligar = ch.getAttribute('aria-checked') !== 'true';
      ch.setAttribute('aria-checked', String(ligar)); ch.disabled = true;
      comando('maestro', { ativo: ligar }).then(function () { toast(ligar ? 'Jornada ligada' : 'Jornada desligada'); carregar(); })
        .catch(function (e) { ch.setAttribute('aria-checked', String(!ligar)); toast(e.message); }).then(function () { ch.disabled = false; });
    });
  }

  function aprovar() {
    var l = esp.aprovacoes || [];
    if (!l.length) { $('tela-aprovar').innerHTML = '<div class="vazio"><h1>Nada para aprovar</h1><p>Quando o time propuser um post ou precisar de você, aparece aqui e chega uma notificação.</p></div>'; return; }
    $('tela-aprovar').innerHTML = l.map(function (a) {
      var corpo = '';
      if (a.post) {
        corpo += '<span class="tag">' + esc((a.post.rede || '').toUpperCase()) + ' · ' + esc(a.post.formato || 'post') + (a.post.quando ? ' · sai ' + esc(a.post.quando) : '') + '</span>';
        if ((a.post.artes || []).length) corpo += '<div class="artes">' + a.post.artes.map(function (u) { return '<img loading="lazy" src="' + esc(u) + '" alt="Arte do post">'; }).join('') + '</div>';
        corpo += '<p>' + esc(a.post.texto) + '</p>';
      } else corpo += '<span class="tag">' + esc(a.acao.replace(/_/g, ' ')) + '</span><p>' + esc(a.detalhes) + '</p>';
      return '<div class="cartao aprov" data-id="' + a.id + '">' + corpo + '<div class="quem">Pedido de ' + esc(a.agente || 'agente') + (a.cargo ? ' (' + esc(a.cargo) + ')' : '') + ' · ' + quando(a.criado_em) + '</div>' +
        '<div class="botoes"><button type="button" class="btn" data-dec="nao">Recusar</button><button type="button" class="btn ok" data-dec="sim">Aprovar</button></div></div>';
    }).join('');
    $('tela-aprovar').querySelectorAll('[data-dec]').forEach(function (b) {
      b.addEventListener('click', function () {
        var card = b.closest('.aprov'), sim = b.dataset.dec === 'sim';
        card.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
        b.textContent = 'Enviando…';
        comando('decidir', { id: Number(card.dataset.id), aprovado: sim }).then(function () {
          card.querySelector('.botoes').outerHTML = '<div class="resultado">' + (sim ? 'Aprovado. O escritório já executou.' : 'Recusado.') + '</div>';
          setTimeout(carregar, 1500);
        }).catch(function (e) {
          card.querySelector('.botoes').insertAdjacentHTML('afterend', '<div class="resultado erro">' + esc(e.message) + '</div>');
          card.querySelectorAll('button').forEach(function (x) { x.disabled = false; }); b.textContent = sim ? 'Aprovar' : 'Recusar';
        });
      });
    });
  }

  function jornada() {
    var j = esp.jornada || {}, et = j.etapas || {}, emp = j.empresas || [], r = esp.resultados;
    var cont = {}; emp.forEach(function (e) { cont[e.etapa] = (cont[e.etapa] || 0) + 1; });
    var h = '';
    if (r && r.total) {
      h += '<div class="cartao"><h2>Resultados da prospecção <small>90 dias</small></h2><div class="kpis"><div><b>' + r.total.contatadas + '</b><span>contatadas</span></div><div><b>' + r.total.responderam + '</b><span>responderam (' + r.total.taxa_resposta + '%)</span></div><div><b>' + r.total.compraram + '</b><span>compraram</span></div></div>' +
        '<p class="nota" style="margin:10px 0 0">IA na prospecção: US$ ' + Number(r.custo_ia_usd || 0).toFixed(2) + (r.custo_por_resposta_usd ? ' · US$ ' + r.custo_por_resposta_usd.toFixed(2) + ' por resposta' : '') + (r.custo_por_venda_usd ? ' · US$ ' + r.custo_por_venda_usd.toFixed(2) + ' por venda' : '') + '</p>';
      if ((r.por_nicho || []).length) h += '<table class="tabela" style="margin-top:8px"><tr><th>Nicho</th><th>Contatos</th><th>Resp.</th><th>Vendas</th></tr>' + r.por_nicho.slice(0, 6).map(function (n) { return '<tr><td>' + esc(n.nome) + '</td><td>' + n.contatadas + '</td><td>' + n.taxa_resposta + '%</td><td>' + n.compraram + '</td></tr>'; }).join('') + '</table>';
      h += '</div>';
    }
    h += '<div class="etapas">' + ['<button type="button" data-et="" aria-pressed="' + !filtroEtapa + '">Todas (' + emp.length + ')</button>'].concat(Object.keys(cont).map(function (k) {
      return '<button type="button" data-et="' + esc(k) + '" aria-pressed="' + (filtroEtapa === k) + '">' + esc(et[k] || k) + ' (' + cont[k] + ')</button>';
    })).join('') + '</div>';
    var lista = emp.filter(function (e) { return !filtroEtapa || e.etapa === filtroEtapa; });
    h += '<div class="cartao">' + (lista.length ? '<ul class="lista">' + lista.map(function (e) {
      return '<li><span><b>' + esc(e.empresa) + '</b><small>' + esc([e.nicho, e.cidade && (e.cidade + (e.uf ? '/' + e.uf : ''))].filter(Boolean).join(' · ')) + '</small><small>' + esc(et[e.etapa] || e.etapa) + '</small></span><small>' + quando(e.atualizado_em) + '</small></li>';
    }).join('') + '</ul>' : '<p class="nota">Nenhuma empresa ainda. Com a jornada ligada, o time começa a prospectar.</p>') + '</div>';
    $('tela-jornada').innerHTML = h;
    $('tela-jornada').querySelectorAll('[data-et]').forEach(function (b) { b.addEventListener('click', function () { filtroEtapa = b.dataset.et || null; jornada(); }); });
  }

  function avisos() {
    var l = esp.avisos || [];
    $('tela-avisos').innerHTML = '<div class="cartao">' + (l.length ? l.map(function (n) {
      return '<div class="aviso ' + (n.tipo === 'erro' ? 'erro ' : '') + (n.lida ? 'lida' : '') + '"><i></i><div><strong>' + esc(n.titulo) + '</strong>' + (n.texto ? '<span>' + esc(n.texto) + '</span>' : '') + '<small>' + quando(n.criado_em) + '</small></div></div>';
    }).join('') : '<p class="nota">Sem avisos.</p>') + '</div>';
  }

  function ajustes() {
    var m = (esp.metas || {}).metas || {}, s = esp.sistema || {}, b = s.backup || {};
    var pushOk = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    var perm = pushOk ? Notification.permission : 'indisponível';
    var h = '<div class="cartao"><h2>Notificações</h2><p class="nota">' + (perm === 'granted' ? 'Ligadas neste aparelho. Chegam vendas, respostas de clientes e o que precisar da sua aprovação.' : perm === 'denied' ? 'Bloqueadas. Libere nas configurações do Chrome para este site e toque abaixo de novo.' : !pushOk ? 'Este navegador não aceita notificações. Instale o app pelo Chrome (menu ⋮ → Instalar app).' : 'Desligadas.') + '</p>' +
      (pushOk ? '<button type="button" class="btn pri largo" id="btn-push" style="margin-top:10px">' + (perm === 'granted' ? 'Testar / reativar notificações' : 'Ligar notificações') + '</button>' : '') + '</div>';
    h += '<div class="cartao"><h2>Metas</h2><label class="campo">Vendas no mês<input type="number" inputmode="numeric" min="0" id="m-vendas" value="' + (m.vendas_mes || 0) + '"></label>' +
      '<label class="campo">Recebido no mês (R$)<input type="number" inputmode="numeric" min="0" id="m-receita" value="' + (m.receita_mes || 0) + '"></label>' +
      '<label class="campo">Contatos de prospecção na semana<input type="number" inputmode="numeric" min="0" id="m-contatos" value="' + (m.contatos_semana || 0) + '"></label>' +
      '<button type="button" class="btn pri largo" id="btn-metas" style="margin-top:12px">Salvar metas</button></div>';
    h += '<div class="cartao"><h2>Cópia de segurança</h2><p class="nota">' + (b.quando ? (b.ok ? 'Última: ' + new Date(b.quando).toLocaleString('pt-BR') + ' · nuvem: ' + esc(b.nuvem) : 'Falhou: ' + esc(b.erro)) : 'Ainda não rodou.') + '</p>' +
      '<p class="nota" style="margin-top:10px">Chave de recuperação da cópia na nuvem (guarde; sem ela a cópia não abre):</p><div class="segredo" id="chave-bk">••••••••••••••••</div>' +
      '<div class="botoes" style="margin-top:8px"><button type="button" class="btn" id="btn-ver-chave">Mostrar</button><button type="button" class="btn" id="btn-copiar-chave">Copiar</button></div></div>';
    h += '<div class="cartao"><h2>Este aparelho</h2><p class="nota">App ' + VERSAO_APP + ' · Escritório ' + esc((esp.config || {}).versao_escritorio || '?') + '</p><button type="button" class="btn largo" id="btn-sair" style="margin-top:10px">Desconectar este aparelho</button></div>';
    $('tela-ajustes').innerHTML = h;
    if ($('btn-push')) $('btn-push').addEventListener('click', ligarPush);
    $('btn-metas').addEventListener('click', function () {
      var b2 = $('btn-metas'); b2.disabled = true; b2.textContent = 'Salvando…';
      comando('metas', { vendas_mes: Number($('m-vendas').value), receita_mes: Number($('m-receita').value), contatos_semana: Number($('m-contatos').value) })
        .then(function () { toast('Metas salvas'); carregar(); }).catch(function (e) { toast(e.message); }).then(function () { b2.disabled = false; b2.textContent = 'Salvar metas'; });
    });
    $('btn-ver-chave').addEventListener('click', function () { $('chave-bk').textContent = s.chave_backup || '—'; });
    $('btn-copiar-chave').addEventListener('click', function () { if (navigator.clipboard && s.chave_backup) navigator.clipboard.writeText(s.chave_backup).then(function () { toast('Chave copiada'); }); });
    $('btn-sair').addEventListener('click', function () {
      if ($('btn-sair').dataset.conf !== '1') { $('btn-sair').dataset.conf = '1'; $('btn-sair').textContent = 'Toque de novo para confirmar'; return; }
      guardarChave(''); esp = {}; mostrarPareamento('Aparelho desconectado. Para usar de novo, escaneie o QR no computador.');
    });
  }

  // ---------------------------------------------------------------- notificações (Web Push)
  function base64ParaBytes(b) { var p = '='.repeat((4 - (b.length % 4)) % 4); var s = atob((b + p).replace(/-/g, '+').replace(/_/g, '/')); var u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  function ligarPush() {
    var vapid = (esp.config || {}).vapid_publico;
    if (!vapid) { toast('O escritório ainda não publicou a chave de notificação. Tente em 1 minuto.'); return; }
    Notification.requestPermission().then(function (p) {
      if (p !== 'granted') { toast('Permissão de notificação negada'); ajustes(); return; }
      return navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.getSubscription().then(function (s) { return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ParaBytes(vapid) }); });
      }).then(function (s) { toast('Ligando…'); return comando('inscrever_push', { inscricao: s.toJSON() }); })
        .then(function () { toast('Notificações ligadas. Mandei um teste.'); ajustes(); });
    }).catch(function (e) { toast('Não deu: ' + e.message); });
  }

  // ---------------------------------------------------------------- atualização do app (service worker)
  var swEsperando = null;
  function avisarAtualizacao(sw) { swEsperando = sw; $('atualizacao').hidden = false; }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { scope: './' }).then(function (reg) {
      if (reg.waiting && navigator.serviceWorker.controller) avisarAtualizacao(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var n = reg.installing;
        n.addEventListener('statechange', function () { if (n.state === 'installed' && navigator.serviceWorker.controller) avisarAtualizacao(n); });
      });
      setInterval(function () { reg.update(); }, 30 * 60000);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) reg.update(); });
    });
    var recarregou = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (!recarregou) { recarregou = true; location.reload(); } });
  }
  $('btn-atualizar').addEventListener('click', function () { if (swEsperando) { $('btn-atualizar').textContent = 'Atualizando…'; swEsperando.postMessage('atualizar'); } else location.reload(); });

  // ---------------------------------------------------------------- início
  var m = /[#&]par=([A-Za-z0-9_-]{20,})/.exec(location.hash);
  if (m) { guardarChave(m[1]); history.replaceState(null, '', location.pathname); }
  document.querySelectorAll('#abas button').forEach(function (b) { b.addEventListener('click', function () { abrir(b.dataset.tela); }); });
  $('btn-recarregar').addEventListener('click', function () { carregar(true); });
  if (!chave()) mostrarPareamento();
  else { $('tela-inicio').innerHTML = '<div class="vazio">Carregando…</div>'; abrir(new URLSearchParams(location.search).get('tela') || 'inicio'); carregar(); }
  setInterval(function () { if (!document.hidden && chave()) carregar(); }, 20000);
  setInterval(statusSinc, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && chave() && Date.now() - ultimoOk > 10000) carregar(); });
})();
