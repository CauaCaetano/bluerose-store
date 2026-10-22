/*
 * Veltria · modo conta das telas das versões (Essencial, Completo e Avançado).
 * Sem ?conta=<id> na URL não faz nada: a página continua sendo a demonstração com dados de exemplo.
 * Com ?conta=<id> (vindo da porta app/<id>/, que já conferiu login, teste ou assinatura e trouxe os dados):
 *  - os dados da tela ficam numa chave só desta empresa neste navegador (nunca se misturam com a demonstração);
 *  - cada alteração sobe para a nuvem (nexo_registros, coleção _estado) em segundos, e de novo ao fechar a página;
 *  - some a faixa de demonstração e o "Recomeçar"; entra a faixa da conta (empresa, prazo, equipe, assinatura);
 *  - os botões de assinatura e plano das telas abrem a assinatura de verdade (Mercado Pago), não a simulação.
 * Carregado como script comum no <head>, antes do app.js, para a troca de chave valer desde a primeira leitura.
 */
(function () {
  var q = new URLSearchParams(location.search), app = q.get('conta');
  if (!app) return;
  var RAIZ = new URL('../../../', document.currentScript.src).href;
  var info = null; try { info = JSON.parse(sessionStorage.getItem('veltria-conta') || 'null'); } catch (e) { info = null; }
  if (!info || info.app !== app) { location.replace(RAIZ + 'app/' + app + '/'); throw new Error('abrindo pela porta'); }
  document.documentElement.classList.add('modo-conta');
  var CHAVE = info.chave, NS = 'conta:' + info.espaco + ':' + CHAVE, P = Storage.prototype, ler = P.getItem, gravar = P.setItem, tirar = P.removeItem;
  P.getItem = function (k) { return ler.call(this, this === localStorage && k === CHAVE ? NS : k); };
  P.setItem = function (k, v) { if (this === localStorage && k === CHAVE) { gravar.call(this, NS, v); agendar(); return; } return gravar.call(this, k, v); };
  // "Recomeçar" e ?novo apagariam os dados da empresa: no modo conta, nunca
  P.removeItem = function (k) { if (this === localStorage && k === CHAVE) return; return tirar.call(this, k); };

  // ---------------------------------------------------------------- nuvem
  var cli = null, pendente = false, timer = null, estado = 'salvo', ultimo = info.atualizado;
  function script(src) { return new Promise(function (ok, falha) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = falha; document.head.appendChild(s); }); }
  function cliente() {
    if (cli) return cli;
    cli = script(RAIZ + 'app/config.js').then(function () { return script(RAIZ + 'demos/sistemas/base/supabase.js'); }).then(function () {
      var c = window.NEXO_NUVEM; return window.supabase.createClient(c.url, c.chave, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'nexo-sessao' } });
    });
    return cli;
  }
  function agendar() { pendente = true; marcar('salvando'); clearTimeout(timer); timer = setTimeout(enviar, 1500); }
  function enviar() {
    clearTimeout(timer);
    // nada gravado ainda (empresa nova, antes da primeira alteração): não há o que subir
    var txt = ler.call(localStorage, NS); if (!txt) { pendente = false; marcar('salvo'); return Promise.resolve(); }
    var agora = new Date().toISOString();
    return cliente().then(function (sb) {
      return sb.from('nexo_registros').upsert({ espaco: info.espaco, colecao: '_estado', id: 'estado', dados: JSON.parse(txt), atualizado: agora });
    }).then(function (r) {
      if (r.error) throw r.error;
      pendente = false; ultimo = agora; marcar('salvo');
    }).catch(function (e) {
      marcar('erro', /row-level|policy|permission/i.test(e.message || '') ? 'O acesso venceu ou é só de leitura: as alterações ficam neste aparelho até renovar.' : 'Sem conexão: salvo neste aparelho, sobe quando a internet voltar.');
      clearTimeout(timer); timer = setTimeout(enviar, 30000);
    });
  }
  // ao fechar ou trocar de aba: sobe o que faltou (fetch com keepalive continua depois da página fechar)
  addEventListener('pagehide', function () {
    if (!pendente) return;
    try {
      var s = JSON.parse(localStorage.getItem('nexo-sessao') || 'null'), c = window.NEXO_NUVEM; if (!s || !c) return;
      fetch(c.url + '/rest/v1/nexo_registros?on_conflict=espaco,colecao,id', { method: 'POST', keepalive: true, headers: { apikey: c.chave, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ espaco: info.espaco, colecao: '_estado', id: 'estado', dados: JSON.parse(ler.call(localStorage, NS)), atualizado: new Date().toISOString() }) });
    } catch (e) { /* fica no aparelho e sobe na próxima abertura */ }
  });
  // outra pessoa da equipe salvou: ao voltar para a aba, traz a versão nova (se não houver alteração esperando)
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || pendente) return;
    cliente().then(function (sb) { return sb.from('nexo_registros').select('dados,atualizado').eq('espaco', info.espaco).eq('colecao', '_estado').eq('id', 'estado').maybeSingle(); }).then(function (r) {
      if (!r.data || !ultimo || r.data.atualizado <= ultimo) return;
      gravar.call(localStorage, NS, JSON.stringify(r.data.dados)); info.atualizado = r.data.atualizado; sessionStorage.setItem('veltria-conta', JSON.stringify(info)); location.reload();
    }).catch(function () {});
  });
  if (info.novo) agendar(); // empresa nova: a primeira gravação leva os dados iniciais para a nuvem
  cliente(); // já deixa a conexão pronta

  // ---------------------------------------------------------------- faixa da conta
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var V = { obras: 'Obras', juridico: 'Jurídico', oficina: 'Oficina', financeiro: 'Financeiro', agenda: 'Agenda', crm: 'CRM', farmacia: 'Farmácia', gestao: 'Gestão' };
  function prazo() {
    if (info.plano === 'ativo') return info.nivel === 'pro' ? 'Plano Pro' : 'Plano ativo';
    var d = Math.ceil((Date.parse(info.ate + 'T23:59:59-03:00') - Date.now()) / 864e5);
    return d > 0 ? 'Teste grátis: ' + d + (d === 1 ? ' dia' : ' dias') : 'Teste encerrado';
  }
  function marcar(e, msg) { estado = e; var m = document.querySelector('.vc-salvo'); if (m) { m.textContent = e === 'salvando' ? 'Salvando…' : e === 'erro' ? 'Não salvou na nuvem' : 'Salvo na nuvem'; m.title = msg || ''; m.dataset.e = e; } if (msg && e === 'erro') aviso(msg); }
  function aviso(t) { var a = document.createElement('div'); a.className = 'vc-aviso'; a.textContent = t; document.body.appendChild(a); setTimeout(function () { a.remove(); }, 5000); }
  var css = '.vc-faixa{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;padding:6px 12px;background:#141820;color:#e9e6df;font:500 13px/1.3 system-ui,sans-serif;position:relative;z-index:50}' +
    '.vc-faixa b{font-weight:700}.vc-faixa .vc-prazo{background:#2a3140;border-radius:999px;padding:2px 10px}.vc-faixa .vc-salvo{opacity:.75}.vc-faixa .vc-salvo[data-e=erro]{color:#ffb4a8;opacity:1}' +
    '.vc-faixa button{background:transparent;color:#e9e6df;border:1px solid #3c4558;border-radius:999px;padding:3px 12px;cursor:pointer;font:inherit}.vc-faixa button:hover{border-color:#c9b37e}' +
    '.vc-veu{position:fixed;inset:0;background:rgba(10,12,18,.6);display:grid;place-items:center;z-index:9999;padding:16px}.vc-caixa{background:#fbfaf7;color:#1d2230;border-radius:16px;width:min(500px,100%);max-height:88vh;overflow:auto;padding:20px 22px;font:15px/1.5 system-ui,sans-serif}' +
    '.vc-caixa h2{margin:0 0 6px;font-size:1.2rem}.vc-caixa p{margin:6px 0}.vc-caixa .vc-mudo{color:#6b7080;font-size:.88rem}.vc-caixa label{display:block;margin:8px 0;font-size:.9rem}.vc-caixa input[type=email]{width:100%;min-height:40px;border:1px solid #cfd2da;border-radius:10px;padding:0 10px;font:inherit}' +
    '.vc-caixa .vc-bt{min-height:42px;border-radius:10px;border:1px solid #1d2230;background:#1d2230;color:#fff;padding:0 16px;font:600 .95rem system-ui,sans-serif;cursor:pointer;margin:6px 6px 0 0}.vc-caixa .vc-bt.vc-2{background:transparent;color:#1d2230}' +
    '.vc-caixa ul{list-style:none;padding:0;margin:8px 0}.vc-caixa li{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #ecebe6;font-size:.92rem}.vc-caixa .vc-planos label{display:flex;gap:8px;align-items:center;border:1px solid #e1dfd8;border-radius:10px;padding:8px 10px}' +
    '.vc-aviso{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#141820;color:#fff;padding:10px 16px;border-radius:12px;z-index:9999;max-width:90vw;font:14px system-ui,sans-serif}' +
    'html.modo-conta.no-celular .vc-faixa{display:none}';
  function caixa(html, liga) {
    var v = document.createElement('div'); v.className = 'vc-veu'; v.innerHTML = '<div class="vc-caixa" role="dialog" aria-modal="true">' + html + '</div>'; document.body.appendChild(v);
    var fecha = function () { v.remove(); };
    v.addEventListener('click', function (e) { if (e.target === v || e.target.closest('[data-vc-fecha]')) fecha(); });
    v.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecha(); });
    if (liga) liga(v.querySelector('.vc-caixa'), fecha);
    var f = v.querySelector('button, input'); if (f) f.focus();
  }
  function pagamentos(corpo) {
    return cliente().then(function (sb) { return sb.functions.invoke('nexo-pagamentos', { body: corpo }); }).then(function (r) {
      if (r.error) return r.error.context.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.erro || r.error.message); });
      return r.data;
    });
  }
  function assinatura() {
    var VS = window.VELTRIA_VERSOES || {}, ver = VS[app] || { mensal: 0, nome: 'sistema' }, pro = ver.mensal + 60, anual = function (m) { return Math.round(m * 12 * 0.8); };
    caixa('<h2>Minha assinatura</h2><p class="vc-mudo">' + esc(ver.nome) + ' · ' + esc(info.empresa) + '</p><p><b>' + esc(prazo()) + '</b></p><ul id="vc-ass"><li>Carregando…</li></ul>' +
      (info.dono ? '<form><p><b>Assinar ou trocar de plano</b></p><div class="vc-planos">' + [['', 'Básico', ver.mensal, '/mês'], ['-anual', 'Básico anual', anual(ver.mensal), '/ano'], ['-pro', 'Pro', pro, '/mês'], ['-pro-anual', 'Pro anual', anual(pro), '/ano']].map(function (o, i) { return '<label><input type="radio" name="p" value="' + o[0] + '"' + (i ? '' : ' checked') + '> ' + o[1] + ' · R$ ' + o[2].toLocaleString('pt-BR') + o[3] + '</label>'; }).join('') + '</div>' +
        '<label>E-mail da conta do Mercado Pago<input type="email" name="mp" required></label><label><input type="checkbox" name="ok" required> Aceito os <a href="' + RAIZ + 'termos.html" target="_blank" rel="noopener">Termos</a> e a cobrança automática.</label><p class="vc-mudo" data-erro></p><button class="vc-bt">Assinar no Mercado Pago</button></form>' : '<p class="vc-mudo">A assinatura é do dono da empresa.</p>') +
      '<p><a href="' + RAIZ + 'conta.html" target="_blank" rel="noopener">Cancelar, ver cobranças e notas em Minha conta</a></p><button class="vc-bt vc-2" data-vc-fecha>Fechar</button>', function (cx) {
      pagamentos({ acao: 'status' }).then(function (r) {
        var l = (r.assinaturas || []).filter(function (a) { return a.app === app; });
        cx.querySelector('#vc-ass').innerHTML = l.map(function (a) { return '<li><span>' + esc(a.nome) + '</span><span>' + esc({ teste: 'teste até ' + (a.teste_ate || '').split('-').reverse().join('/'), ativa: 'ativa', cancelada: 'cancelada', pendente: 'esperando pagamento', recusada: 'recusada', paga: 'paga' }[a.status] || a.status) + '</span></li>'; }).join('') || '<li>Nenhuma assinatura neste login.</li>';
        var mp = cx.querySelector('[name=mp]'); if (mp && r.email) mp.value = r.email;
      }).catch(function () { cx.querySelector('#vc-ass').innerHTML = '<li>Não foi possível carregar agora.</li>'; });
      var f = cx.querySelector('form'); if (!f) return;
      cliente().then(function (sb) { return sb.auth.getUser(); }).then(function (u) { if (u.data.user && !f.mp.value) f.mp.value = u.data.user.email; });
      f.onsubmit = function (e) {
        e.preventDefault(); if (!f.reportValidity()) return; var b = f.querySelector('button'); b.disabled = true; b.textContent = 'Abrindo o Mercado Pago…';
        pagamentos({ acao: 'iniciar', produto: 'a-sis-' + app + f.p.value, email_mp: f.mp.value.trim() }).then(function (j) { location.href = j.link; }).catch(function (x) { b.disabled = false; b.textContent = 'Assinar no Mercado Pago'; f.querySelector('[data-erro]').textContent = x.message; });
      };
    });
  }
  function equipe() {
    caixa('<h2>Equipe</h2><p class="vc-mudo">Cada pessoa entra com o próprio e-mail e vê os mesmos dados da empresa. No Básico, até 5 pessoas além de você.</p><ul id="vc-eq"><li>Carregando…</li></ul>' +
      (info.dono ? '<form><label>Convidar por e-mail<input type="email" name="email" required></label><label><input type="checkbox" name="ler"> Só pode ver (não altera nada)</label><p class="vc-mudo" data-erro></p><button class="vc-bt">Mandar convite</button></form>' : '') + '<button class="vc-bt vc-2" data-vc-fecha>Fechar</button>', function (cx) {
      function listar() {
        cliente().then(function (sb) { return Promise.all([sb.from('nexo_membros').select('email,papel').eq('espaco', info.espaco), info.dono ? sb.from('nexo_convites').select('email').eq('espaco', info.espaco) : { data: [] }]); }).then(function (r) {
          cx.querySelector('#vc-eq').innerHTML = (r[0].data || []).map(function (m) { return '<li><span>' + esc(m.email) + '</span><span>' + (m.papel === 'dono' ? 'dono' : 'equipe') + '</span></li>'; }).join('') + (r[1].data || []).map(function (c) { return '<li><span>' + esc(c.email) + '</span><span>convite enviado</span></li>'; }).join('');
        });
      }
      listar();
      var f = cx.querySelector('form'); if (!f) return;
      f.onsubmit = function (e) {
        e.preventDefault(); if (!f.reportValidity()) return;
        cliente().then(function (sb) { return sb.from('nexo_convites').insert({ espaco: info.espaco, email: f.email.value.trim().toLowerCase(), papel: 'membro', permissoes: f.ler.checked ? { so_leitura: true } : {} }); }).then(function (r) {
          if (r.error) throw r.error; f.reset(); listar(); aviso('Convite enviado. A pessoa recebe o e-mail e entra com a conta dela.');
        }).catch(function (x) { f.querySelector('[data-erro]').textContent = /limite/i.test(x.message) ? 'O Básico vai até 5 pessoas além de você. O Pro libera sem limite.' : x.message; });
      };
    });
  }
  function sair() { enviar().then(function () { return cliente(); }).then(function (sb) { return sb.auth.signOut(); }).then(function () { sessionStorage.removeItem('veltria-conta'); location.href = RAIZ + 'app/' + app + '/'; }); }

  function montar() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    // tira a faixa de demonstração (a que tem o "Recomeçar") e põe a da conta no lugar
    var rec = document.getElementById('recomecar'), demo = rec && rec.closest('body > *');
    var f = document.createElement('div'); f.className = 'vc-faixa';
    f.innerHTML = '<b>' + esc(info.empresa) + '</b><span class="vc-prazo">' + esc(prazo()) + '</span><span class="vc-salvo" data-e="salvo">Salvo na nuvem</span><button type="button" data-vc="assinatura">' + (info.plano === 'ativo' ? 'Assinatura' : 'Assinar') + '</button><button type="button" data-vc="equipe">Equipe</button><button type="button" data-vc="sair">Sair</button>';
    if (demo) { demo.hidden = true; demo.style.display = 'none'; demo.parentNode.insertBefore(f, demo); } else document.body.insertBefore(f, document.body.firstChild);
    marcar(estado);
    f.addEventListener('click', function (e) { var b = e.target.closest('[data-vc]'); if (!b) return; ({ assinatura: assinatura, equipe: equipe, sair: sair })[b.dataset.vc](); });
    // o app instalado no celular abre pela porta da conta, não pela demonstração
    var man = document.querySelector('link[rel=manifest]'); if (man) man.href = RAIZ + 'app/' + app + '/manifest.webmanifest';
    // links internos da demonstração (voltar ao site, ver no celular) mantêm o modo conta ou levam à conta
    document.querySelectorAll('a[href]').forEach(function (a) { var h = a.getAttribute('href'); if (/^index\.html|^app\.html/.test(h)) a.setAttribute('href', h.replace(/\?.*$/, '') + '?conta=' + app); });
  }
  // botões de assinatura e de plano das telas: no modo conta abrem a assinatura de verdade
  var ASS = /^(cancelar|cancelar-ass|pagar-app|pagar-ass|reativar)$/;
  document.addEventListener('click', function (e) {
    var t = e.target;
    var a = t.closest && t.closest('[data-acao],[data-plano],[data-pagar-ass],a[href="#assinatura"]'); if (!a) return;
    var acao = a.getAttribute('data-acao');
    var ehAss = a.hasAttribute('data-plano') || a.hasAttribute('data-pagar-ass') || a.getAttribute('href') === '#assinatura' || (acao && ASS.test(acao)) || (acao === 'pagar' && (a.closest('.trava') || location.hash === '#assinatura'));
    if (!ehAss) return;
    e.preventDefault(); e.stopImmediatePropagation(); assinatura();
  }, true);
  addEventListener('hashchange', function () { if (location.hash === '#assinatura') { history.replaceState(null, '', location.pathname + location.search); assinatura(); } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
