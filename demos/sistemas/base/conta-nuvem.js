/*
 * Veltria · modo conta das telas das versões (Essencial, Completo e Avançado).
 * Sem ?conta=<id> na URL não faz nada: a página continua sendo a demonstração com dados de exemplo.
 * Com ?conta=<id> (vindo da porta app/<id>/, que já conferiu login, teste ou assinatura e trouxe os dados):
 *  - os dados da tela ficam numa chave só desta empresa neste navegador (nunca se misturam com a demonstração);
 *  - cada alteração sobe para a nuvem (nexo_registros, coleção _estado) em segundos, e de novo ao fechar a página;
 *  - equipe mexendo ao mesmo tempo: antes de gravar, junta com o que outra pessoa salvou, item por item (mesclar.js),
 *    e só grava se ninguém salvou no meio; o que os outros salvam chega sozinho a cada 30 segundos;
 *  - some a faixa de demonstração e o "Recomeçar"; entra a faixa da conta (empresa, prazo, equipe, assinatura, começar do zero);
 *  - os botões de assinatura e plano das telas abrem a assinatura de verdade (Mercado Pago), não a simulação;
 *  - window.veltriaIA(pergunta): o Assistente das telas responde com a IA (nexo-ia) usando um resumo dos dados da empresa.
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
  // ---------------------------------------------------------------- os dias andam sozinhos
  // As telas guardam datas como "dias a partir de hoje" (0 = hoje, 1 = amanhã, -3 = três dias atrás). Os dados guardam
  // em _dia0 o dia em que esses números valiam; ao abrir num dia depois, cada campo anda os dias que passaram:
  // D = data relativa (vencimento, prazo, horário marcado: diminui); H = "há X dias" (sem contato, fiado desde: aumenta).
  // Durações e dias do mês (prazo do fornecedor, validade do orçamento, dia de pagamento da conta fixa) não entram.
  var DIAS = {
    agendaessencial: 'D clientes[].ultima ags[].dia pedidos[].dia', agendacompleto: 'D ags[].dia',
    crmessencial: 'D negocios[].prox.dia negocios[].notas[].dia negocios[].quando', crmcompleto: 'D atividades[].dia H deals[].sem deals[].hist[].d propostas[].enviada',
    farmaciaessencial: 'D prods[].lotes[].val clientes[].ultima receitas[].dia vendas[].dia', farmaciacompleto: 'D prods[].lotes[].val livro[].dia servicos[].dia', farmaciaavancado: 'D campanhas[].fim',
    financeiroessencial: 'D movs[].dia cobrancas[].vence cobrancas[].avisos[]', financeirocompleto: 'D lancs[].venc lancs[].avisos[] extrato[].dia orcs[].dia', financeiroavancado: 'D pags[].venc',
    gestaoessencial: 'D pagar[].vence H clientes[].desde', gestaocompleto: 'D vendas[].dia contas[].vence',
    gestaoavancado: 'D produtos[].lotes[].vence vendas[].dia contas[].vence pedidos[].dia movs[].dia log[].dia H clientes[].ultima',
    juridicocompleto: 'D processos[].andamentos[].dia prazos[].fatal prazos[].interno intimacoes[].dia audiencias[].dia horas[].dia contratos[].parcelas[].dia',
    juridicoavancado: 'D intimacoes[].dia prazos[].fatal tarefas[].vence horas[].dia auditoria[].dia',
    obrasessencial: 'D obras[].inicio obras[].entrega obras[].gastos[].dia obras[].diario[].dia orcamentos[].criado',
    obrascompleto: 'D obras[].etapas[].ini obras[].etapas[].fim orcamentos[].criado compras[].dia compras[].vence compras[].pagoEm presencas[].dia medicoes[].dia medicoes[].vence diario[].dia outras[].vence',
    obrasavancado: 'D obras[].docs[].vence obras[].ncs[].dia contas[].vence rdos[].dia auditoria[].dia',
    oficinaessencial: 'D os[].entrada os[].entregue carros[].revisaoDia caixa[].dia', oficinacompleto: 'D agenda[].dia historico[].ultima pagar[].vence'
  }[app];
  var hojeSP = function () { return new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); };
  function andaDias(d, regra, passaram) {
    var sinal = -1;
    regra.split(' ').forEach(function (c) {
      if (c === 'D') { sinal = -1; return; } if (c === 'H') { sinal = 1; return; }
      (function vai(x, partes) {
        if (x == null) return;
        var p = partes[0], resto = partes.slice(1), lista = /\[\]$/.test(p), k = p.replace('[]', '');
        if (!resto.length && !lista) { if (typeof x[k] === 'number') x[k] += sinal * passaram; return; }
        if (!resto.length && lista) { if (Array.isArray(x[k])) x[k] = x[k].map(function (v) { return typeof v === 'number' ? v + sinal * passaram : v; }); return; }
        if (lista) (Array.isArray(x[k]) ? x[k] : []).forEach(function (y) { vai(y, resto); }); else vai(x[k], resto);
      })(d, c.split('.'));
    });
  }
  (function alinharDias() {
    var txt = ler.call(localStorage, NS); if (!txt) return;
    var d; try { d = JSON.parse(txt); } catch (e) { return; }
    var hoje = hojeSP();
    if (!d._dia0) { d._dia0 = hoje; gravar.call(localStorage, NS, JSON.stringify(d)); return; }
    var passaram = Math.round((Date.parse(hoje) - Date.parse(d._dia0)) / 864e5);
    if (passaram <= 0) return;
    if (DIAS) andaDias(d, DIAS, passaram);
    d._dia0 = hoje; gravar.call(localStorage, NS, JSON.stringify(d)); info.pendente = true;
  })();
  window.veltriaAndaDias = andaDias; // usado pelo teste (scratchpad/teste_dias.mjs)
  window.veltriaConta = { espaco: info.espaco, empresa: info.empresa, app: app }; // o link de agendamento da Agenda usa a empresa

  // recarregando: a tela ainda tem os dados antigos na memória; gravar agora apagaria o que chegou da equipe
  var recarregando = false, avisouLeitura = false;
  P.setItem = function (k, v) {
    if (this === localStorage && k === CHAVE) {
      if (recarregando) return;
      if (window.veltriaPermissoes && window.veltriaPermissoes.so_leitura) { if (!avisouLeitura) { avisouLeitura = true; aviso('O seu acesso é só para ver: as alterações não são salvas.'); } return; }
      // primeira gravação da empresa: já marca o dia de referência das datas relativas
      if (v.indexOf('"_dia0"') < 0 && /^\{.+\}$/.test(v)) v = v.slice(0, -1) + ',"_dia0":"' + hojeSP() + '"}';
      gravar.call(this, NS, v); agendar(); return;
    }
    return gravar.call(this, k, v);
  };
  // "Recomeçar" e ?novo apagariam os dados da empresa: no modo conta, nunca
  P.removeItem = function (k) { if (this === localStorage && k === CHAVE) return; return tirar.call(this, k); };

  // ---------------------------------------------------------------- nuvem
  var BASE = NS + ':base'; // a última versão que veio da nuvem neste aparelho (ponto de partida da fusão)
  var cli = null, pendente = false, timer = null, estado = 'salvo', ultimo = info.atualizado, tentativas = 0;
  function script(src) { return new Promise(function (ok, falha) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = falha; document.head.appendChild(s); }); }
  var fusao = script(RAIZ + 'demos/sistemas/base/mesclar.js?v=1');
  var texto = function (k) { return ler.call(localStorage, k); };
  function cliente() {
    if (cli) return cli;
    cli = script(RAIZ + 'app/config.js').then(function () { return script(RAIZ + 'demos/sistemas/base/supabase.js'); }).then(function () {
      var c = window.NEXO_NUVEM; return window.supabase.createClient(c.url, c.chave, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'nexo-sessao' } });
    });
    return cli;
  }
  function agendar() { pendente = true; marcar('salvando'); clearTimeout(timer); timer = setTimeout(enviar, 1500); }
  function registro(sb) { return sb.from('nexo_registros').select('dados,atualizado').eq('espaco', info.espaco).eq('colecao', '_estado').eq('id', 'estado').maybeSingle(); }
  function guardaVersao(dados, quando) {
    gravar.call(localStorage, BASE, JSON.stringify(dados)); ultimo = quando; info.atualizado = quando; info.novo = false;
    sessionStorage.setItem('veltria-conta', JSON.stringify(info));
  }
  // recarrega a tela com os dados juntados; o que ainda não subiu sobe logo depois (info.pendente)
  function recarrega(msg) { info.pendente = pendente; sessionStorage.setItem('veltria-conta', JSON.stringify(info)); recarregando = true; pendente = false; aviso(msg); setTimeout(function () { location.reload(); }, 1600); }
  function enviar() {
    clearTimeout(timer);
    // nada gravado ainda (empresa nova, antes da primeira alteração): não há o que subir
    var txt = texto(NS); if (!txt) { pendente = false; marcar('salvo'); return Promise.resolve(); }
    var agora = new Date().toISOString(), local = JSON.parse(txt), juntou = false, final = local;
    return Promise.all([cliente(), fusao]).then(function (x) {
      var sb = x[0];
      return registro(sb).then(function (r) {
        if (r.error) throw r.error;
        var rem = r.data;
        // alguém da equipe salvou depois da versão que este aparelho tem: junta item por item antes de gravar
        if (rem && rem.atualizado !== ultimo) {
          var base = JSON.parse(texto(BASE) || 'null');
          if (base) { final = window.veltriaMesclar(base, local, rem.dados); juntou = JSON.stringify(final) !== txt; }
        }
        // só grava se ninguém salvou no meio (se salvou, volta e junta de novo)
        var q = rem ? sb.from('nexo_registros').update({ dados: final, atualizado: agora }).eq('espaco', info.espaco).eq('colecao', '_estado').eq('id', 'estado').eq('atualizado', rem.atualizado).select('atualizado')
          : sb.from('nexo_registros').insert({ espaco: info.espaco, colecao: '_estado', id: 'estado', dados: final, atualizado: agora }).select('atualizado');
        return q;
      });
    }).then(function (w) {
      var corrida = (w.error && /duplicate|23505/i.test((w.error.code || '') + (w.error.message || ''))) || (!w.error && (!w.data || !w.data.length));
      if (w.error && !corrida) throw w.error;
      if (corrida) { if (++tentativas > 5) throw new Error('muitas gravações ao mesmo tempo'); return enviar(); }
      tentativas = 0; guardaVersao(final, agora);
      if (texto(NS) === txt) { gravar.call(localStorage, NS, JSON.stringify(final)); pendente = false; marcar('salvo'); }
      else { gravar.call(localStorage, NS, JSON.stringify(window.veltriaMesclar(local, JSON.parse(texto(NS)), final))); agendar(); } // mudou de novo enquanto subia: junta e sobe na próxima
      if (juntou) recarrega('Juntei as suas alterações com as de outra pessoa da equipe. Atualizando a tela…');
    }).catch(function (e) {
      marcar('erro', /row-level|policy|permission/i.test(e.message || '') ? 'O acesso venceu ou é só de leitura: as alterações ficam neste aparelho até renovar.' : 'Sem conexão: salvo neste aparelho, sobe quando a internet voltar.');
      clearTimeout(timer); timer = setTimeout(enviar, 30000);
    });
  }
  // ao fechar ou trocar de aba: sobe o que faltou (fetch com keepalive continua depois da página fechar).
  // Só grava se ninguém salvou no meio; se salvou, fica no aparelho e a porta junta na próxima abertura.
  addEventListener('pagehide', function () {
    if (!pendente) return;
    try {
      var s = JSON.parse(localStorage.getItem('nexo-sessao') || 'null'), c = window.NEXO_NUVEM; if (!s || !c) return;
      var h = { apikey: c.chave, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
      var corpo = { dados: JSON.parse(texto(NS)), atualizado: new Date().toISOString() };
      if (ultimo) fetch(c.url + '/rest/v1/nexo_registros?espaco=eq.' + info.espaco + '&colecao=eq._estado&id=eq.estado&atualizado=eq.' + encodeURIComponent(ultimo), { method: 'PATCH', keepalive: true, headers: h, body: JSON.stringify(corpo) });
      else fetch(c.url + '/rest/v1/nexo_registros', { method: 'POST', keepalive: true, headers: h, body: JSON.stringify(Object.assign({ espaco: info.espaco, colecao: '_estado', id: 'estado' }, corpo)) });
    } catch (e) { /* fica no aparelho e sobe na próxima abertura */ }
  });
  // o que outra pessoa da equipe salvou: confere a cada 30 s (com a tela aberta) e ao voltar para a aba
  function puxar() {
    if (document.visibilityState !== 'visible' || pendente || recarregando) return; // recarregando: editor de Dados aberto ou tela já recarregando
    Promise.all([cliente(), fusao]).then(function (x) { return registro(x[0]); }).then(function (r) {
      if (!r.data || r.data.atualizado === ultimo || pendente) return;
      var txt = texto(NS), base = JSON.parse(texto(BASE) || 'null');
      var final = txt && base ? window.veltriaMesclar(base, JSON.parse(txt), r.data.dados) : r.data.dados;
      gravar.call(localStorage, NS, JSON.stringify(final)); guardaVersao(r.data.dados, r.data.atualizado);
      if (JSON.stringify(final) !== txt) recarrega('Chegaram alterações de outra pessoa da equipe. Atualizando a tela…');
    }).catch(function () {});
  }
  // Agenda Essencial: pedidos de horário feitos pelo link da bio (/agendar/) entram em "Pedidos que chegaram"
  function trazerPedidos() {
    if (app !== 'agendaessencial' || recarregando) return;
    cliente().then(function (sb) {
      return sb.from('veltria_pedidos').select('id,nome,tel,serv,data,ini').eq('espaco', info.espaco).order('criado').then(function (r) {
        if (r.error || !r.data || !r.data.length) return;
        var txt = texto(NS), d = txt ? JSON.parse(txt) : (window.veltriaDados ? JSON.parse(JSON.stringify(window.veltriaDados())) : null); if (!d) return;
        d.pedidos = d.pedidos || [];
        var hoje = Date.parse(hojeSP()), novos = 0;
        r.data.forEach(function (p) {
          if (d.pedidos.some(function (x) { return x.id === 'w' + p.id; })) return;
          d.pedidos.push({ id: 'w' + p.id, nome: p.nome, tel: p.tel, serv: p.serv, dia: Math.round((Date.parse(p.data) - hoje) / 864e5), ini: Number(p.ini) }); novos++;
        });
        if (novos) { gravar.call(localStorage, NS, JSON.stringify(d)); pendente = true; }
        // já estão nos dados da empresa: sai da fila do link
        return sb.from('veltria_pedidos').delete().in('id', r.data.map(function (p) { return p.id; })).then(function () {
          if (novos) enviar().then(function () { recarrega(novos === 1 ? 'Chegou um pedido de horário pelo seu link.' : 'Chegaram ' + novos + ' pedidos de horário pelo seu link.'); });
        });
      });
    }).catch(function () {});
  }
  document.addEventListener('visibilitychange', puxar);
  setInterval(function () { puxar(); trazerPedidos(); }, 30000);
  setTimeout(trazerPedidos, 3000);
  if (info.novo || info.pendente) agendar(); // empresa nova, ou alterações deste aparelho que ainda não tinham subido
  if (info.pendente) { delete info.pendente; sessionStorage.setItem('veltria-conta', JSON.stringify(info)); }
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
    'html.modo-conta.no-celular .vc-faixa{display:none}' +
    '.vc-mini{border:1px solid #cfd2da;background:#fff;border-radius:8px;padding:3px 9px;margin-left:4px;cursor:pointer;font:inherit;font-size:.82rem}.vc-pessoa{display:grid;gap:8px}.vc-pessoa fieldset{border:1px solid #ecebe6;border-radius:10px;padding:8px 10px;margin:0}' +
    '.vc-pessoa legend{font-size:.85rem;color:#6b7080;padding:0 4px}.vc-telas{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:2px 10px}.vc-pessoa label{margin:2px 0}.vc-pessoa input[list]{width:100%;min-height:40px;border:1px solid #cfd2da;border-radius:10px;padding:0 10px;font:inherit}' +
    '.vc-convite{margin:10px 0}.vc-convite summary{display:inline-flex;align-items:center;list-style:none}.vc-convite summary::-webkit-details-marker{display:none}.vc-faixa .vc-salvo[data-e=ler]{color:#ffd58a;opacity:1}';
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
  // ---------------------------------------------------------------- equipe: convites, cargos e permissões
  // Cada pessoa: papel (membro ou administrador, só o dono escolhe) e permissões em nexo_membros.permissoes:
  // { cargo, so_leitura, telas: ['#rota', ...] }. "Só ver" é barrado também no servidor (nexo_privado.pode_escrever);
  // as telas que a pessoa não vê somem do menu (aplicarPermissoes, ao abrir o sistema).
  var CARGOS = { agenda: ['Recepção', 'Profissional', 'Gerente', 'Caixa'], crm: ['Vendedor', 'Pré-vendas', 'Gerente comercial', 'Financeiro'], farmacia: ['Balconista', 'Farmacêutico', 'Caixa', 'Gerente'],
    financeiro: ['Financeiro', 'Contador', 'Gerente', 'Auxiliar'], gestao: ['Caixa', 'Estoquista', 'Vendedor', 'Gerente'], juridico: ['Advogado', 'Estagiário', 'Secretária', 'Financeiro'],
    obras: ['Engenheiro', 'Mestre de obras', 'Compras', 'Financeiro'], oficina: ['Mecânico', 'Recepção', 'Peças', 'Gerente'] }[app.replace(/(essencial|completo|avancado)$/, '')] || ['Gerente', 'Atendimento', 'Financeiro'];
  function telasDoMenu() {
    var vistas = {}, l = [];
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      var h = a.getAttribute('href'), t = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (h.length > 1 && t && t.length < 40 && !vistas[h] && !/assinatura|recomecar/.test(h)) { vistas[h] = 1; l.push([h, t]); }
    });
    return l;
  }
  function editorPessoa(m, salvar) {
    var p = m.permissoes || {}, telas = telasDoMenu(), sel = p.telas || telas.map(function (t) { return t[0]; });
    return '<form class="vc-pessoa"><label>Cargo<input name="cargo" list="vc-cargos" value="' + esc(p.cargo || '') + '" placeholder="Escolha ou escreva"><datalist id="vc-cargos">' + CARGOS.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></label>' +
      (info.dono && m.papel !== 'dono' ? '<label><input type="checkbox" name="admin"' + (m.papel === 'admin' ? ' checked' : '') + '> Administrador (vê e muda tudo, inclusive a equipe)</label>' : '') +
      '<fieldset class="vc-acesso"><legend>Acesso</legend><label><input type="radio" name="ler" value="0"' + (p.so_leitura ? '' : ' checked') + '> Pode alterar</label><label><input type="radio" name="ler" value="1"' + (p.so_leitura ? ' checked' : '') + '> Só ver</label></fieldset>' +
      (telas.length ? '<fieldset class="vc-telas"><legend>Telas que vê</legend>' + telas.map(function (t) { return '<label><input type="checkbox" name="tela" value="' + esc(t[0]) + '"' + (sel.indexOf(t[0]) >= 0 ? ' checked' : '') + '> ' + esc(t[1]) + '</label>'; }).join('') + '</fieldset>' : '') +
      '<p class="vc-mudo" data-erro></p><button class="vc-bt">' + salvar + '</button></form>';
  }
  function lerPessoa(f, todas) {
    var marcadas = [].slice.call(f.querySelectorAll('[name=tela]:checked')).map(function (i) { return i.value; });
    return { cargo: f.cargo.value.trim().slice(0, 40), so_leitura: f.querySelector('[name=ler]:checked').value === '1', telas: marcadas.length === todas ? null : marcadas };
  }
  function equipe() {
    var gestor = info.dono || info.papel === 'admin';
    caixa('<h2>Equipe</h2><p class="vc-mudo">Cada pessoa entra com o próprio e-mail. Escolha o cargo, se pode alterar ou só ver e quais telas aparecem para ela. No Básico, até 5 pessoas além de você; no Pro, sem limite.</p><ul id="vc-eq"><li>Carregando…</li></ul><div id="vc-ed"></div>' +
      (gestor ? '<details class="vc-convite"><summary class="vc-bt">Convidar pessoa</summary><label>E-mail<input type="email" name="email" form="vc-conv" required></label><div id="vc-conv-campos"></div></details>' : '') + '<button class="vc-bt vc-2" data-vc-fecha>Fechar</button>', function (cx) {
      var membros = [];
      function listar() {
        cliente().then(function (sb) { return Promise.all([sb.from('nexo_membros').select('usuario,email,papel,permissoes').eq('espaco', info.espaco), gestor ? sb.from('nexo_convites').select('email,permissoes,papel').eq('espaco', info.espaco) : { data: [] }]); }).then(function (r) {
          membros = r[0].data || [];
          cx.querySelector('#vc-eq').innerHTML = membros.map(function (m, i) {
            var p = m.permissoes || {}, desc = m.papel === 'dono' ? 'dono' : m.papel === 'admin' ? 'administrador' : (p.cargo || 'equipe') + (p.so_leitura ? ' · só ver' : '') + (p.telas ? ' · ' + p.telas.length + ' telas' : '');
            return '<li><span>' + esc(m.email) + '<small class="vc-mudo"> · ' + esc(desc) + '</small></span>' + (gestor && m.papel !== 'dono' && (info.dono || m.papel === 'membro') ? '<span><button type="button" class="vc-mini" data-ed="' + i + '">Editar</button><button type="button" class="vc-mini" data-tira="' + i + '">Remover</button></span>' : '') + '</li>';
          }).join('') + (r[1].data || []).map(function (c) { return '<li><span>' + esc(c.email) + '<small class="vc-mudo"> · convite enviado' + (c.permissoes && c.permissoes.cargo ? ' · ' + esc(c.permissoes.cargo) : '') + '</small></span>' + (gestor ? '<button type="button" class="vc-mini" data-cancela="' + esc(c.email) + '">Cancelar</button>' : '') + '</li>'; }).join('');
        });
      }
      listar();
      cx.addEventListener('click', function (e) {
        var b = e.target.closest('[data-ed],[data-tira],[data-cancela]'); if (!b) return;
        if (b.dataset.ed) {
          var m = membros[Number(b.dataset.ed)], ed = cx.querySelector('#vc-ed');
          ed.innerHTML = '<h3 style="margin:12px 0 4px">' + esc(m.email) + '</h3>' + editorPessoa(m, 'Salvar acesso');
          var f = ed.querySelector('form'); f.onsubmit = function (ev) {
            ev.preventDefault(); var perm = lerPessoa(f, telasDoMenu().length), adm = f.admin ? f.admin.checked : m.papel === 'admin';
            cliente().then(function (sb) {
              var passo = adm !== (m.papel === 'admin') && info.dono ? sb.rpc('nexo_definir_papel', { p_espaco: info.espaco, p_usuario: m.usuario, p_papel: adm ? 'admin' : 'membro' }) : Promise.resolve({});
              return passo.then(function (r) { if (r.error) throw r.error; return adm ? {} : sb.rpc('nexo_definir_permissoes', { p_espaco: info.espaco, p_usuario: m.usuario, p_permissoes: perm }); });
            }).then(function (r) { if (r && r.error) throw r.error; ed.innerHTML = ''; listar(); aviso('Acesso salvo. Vale na próxima vez que a pessoa abrir o sistema.'); })
              .catch(function (x) { f.querySelector('[data-erro]').textContent = x.message; });
          };
        } else if (b.dataset.tira) {
          var mt = membros[Number(b.dataset.tira)]; if (!confirm('Tirar ' + mt.email + ' da equipe? A pessoa perde o acesso na hora.')) return;
          cliente().then(function (sb) { return sb.from('nexo_membros').delete().eq('espaco', info.espaco).eq('usuario', mt.usuario); }).then(function (r) { if (r.error) throw r.error; listar(); aviso('Pessoa removida da equipe.'); }).catch(function (x) { aviso(x.message); });
        } else if (b.dataset.cancela) {
          cliente().then(function (sb) { return sb.from('nexo_convites').delete().eq('espaco', info.espaco).eq('email', b.dataset.cancela); }).then(function () { listar(); });
        }
      });
      var campos = cx.querySelector('#vc-conv-campos'); if (!campos) return;
      campos.innerHTML = editorPessoa({ papel: 'membro', permissoes: {} }, 'Mandar convite');
      var f = campos.querySelector('form'); f.id = 'vc-conv';
      f.onsubmit = function (e) {
        e.preventDefault(); var em = cx.querySelector('[name=email]'); if (!em.reportValidity()) return;
        var perm = lerPessoa(f, telasDoMenu().length), adm = f.admin && f.admin.checked;
        cliente().then(function (sb) { return sb.from('nexo_convites').insert({ espaco: info.espaco, email: em.value.trim().toLowerCase(), papel: adm ? 'admin' : 'membro', permissoes: adm ? {} : perm }); }).then(function (r) {
          if (r.error) throw r.error; em.value = ''; f.reset(); listar(); if (window.veltriaMarca) window.veltriaMarca('equipe'); aviso('Convite enviado. A pessoa recebe o e-mail e entra com a conta dela.');
        }).catch(function (x) { f.querySelector('[data-erro]').textContent = /limite/i.test(x.message) ? 'O Básico vai até 5 pessoas além de você. O Pro libera sem limite.' : x.message; });
      };
    });
  }
  // permissões de quem abriu: telas fora do acesso somem do menu; "só ver" não grava (o servidor também recusa)
  function aplicarPermissoes() {
    cliente().then(function (sb) { return sb.auth.getUser().then(function (u) { return u.data.user ? sb.from('nexo_membros').select('papel,permissoes').eq('espaco', info.espaco).eq('usuario', u.data.user.id).maybeSingle() : { data: null }; }); }).then(function (r) {
      var m = r.data; if (!m) return;
      info.papel = m.papel; var p = (m.papel === 'membro' && m.permissoes) || {}; window.veltriaPermissoes = p;
      if (p.so_leitura) { var s = document.querySelector('.vc-salvo'); if (s) { s.textContent = 'Acesso só para ver'; s.dataset.e = 'ler'; } }
      if (p.telas && p.telas.length) {
        var esconde = function () {
          document.querySelectorAll('a[href^="#"]').forEach(function (a) { var h = a.getAttribute('href'); if (h.length > 1 && !/assinatura/.test(h) && p.telas.indexOf(h) < 0) a.style.display = 'none'; });
          if (location.hash && location.hash.length > 1 && p.telas.indexOf(location.hash) < 0 && telasDoMenu().some(function (t) { return t[0] === location.hash; })) location.hash = p.telas[0];
        };
        esconde(); new MutationObserver(esconde).observe(document.body, { childList: true, subtree: true });
        addEventListener('hashchange', esconde);
      }
    }).catch(function () {});
  }
  function sair() { enviar().then(function () { return cliente(); }).then(function (sb) { return sb.auth.signOut(); }).then(function () { sessionStorage.removeItem('veltria-conta'); location.href = RAIZ + 'app/' + app + '/'; }); }

  // ---------------------------------------------------------------- Dados (editor de todas as listas)
  function dadosEditor(abrir) {
    if (window.veltriaPermissoes && window.veltriaPermissoes.so_leitura) { aviso('O seu acesso é só para ver. Peça ao dono para liberar as alterações.'); return; }
    script(RAIZ + 'demos/sistemas/base/editor.js?v=4').then(function () {
      var atual = JSON.parse(texto(NS) || 'null') || (window.veltriaDados ? JSON.parse(JSON.stringify(window.veltriaDados())) : null); if (!atual) return;
      recarregando = true; // a tela fica com os dados antigos na memória enquanto o editor está aberto: não grava por cima
      window.veltriaEditor({ dados: atual, dias: DIAS || '', abrir: abrir || null,
        salvar: function (d) { gravar.call(localStorage, NS, JSON.stringify(d)); pendente = true; marcar('salvando'); return enviar(); },
        fechou: function (salvou) { if (salvou) { pendente = false; location.reload(); } else recarregando = false; } });
    }).catch(function () { aviso('Não foi possível abrir os dados agora.'); });
  }

  window.veltriaAbrirDados = dadosEditor; // o botão + das telas (camada.js) abre por aqui na conta

  // ---------------------------------------------------------------- começar do zero
  function zerar() {
    return script(RAIZ + 'demos/sistemas/base/zerar.js?v=3').then(function () {
      var atual = window.veltriaDados ? window.veltriaDados() : JSON.parse(texto(NS) || 'null');
      if (!atual) throw new Error('A tela ainda está abrindo. Tente de novo em instantes.');
      gravar.call(localStorage, NS, JSON.stringify(window.veltriaZerar(atual, app, info.empresa)));
      pendente = true; marcar('salvando');
      return enviar();
    }).then(function () { recarregando = true; location.hash = ''; location.reload(); });
  }
  function confirmaZerar() {
    caixa('<h2>Começar do zero</h2><p>Apaga todos os dados desta empresa no sistema: os de exemplo e o que já foi lançado. Ficam as configurações e a equipe com acesso.</p><p class="vc-mudo">Não dá para desfazer. Vale para todas as pessoas da equipe.</p><p class="vc-mudo" data-erro></p>' +
      '<button class="vc-bt" data-ok>Apagar tudo e começar do zero</button><button class="vc-bt vc-2" data-vc-fecha>Cancelar</button>', function (cx) {
      cx.querySelector('[data-ok]').onclick = function () { this.disabled = true; this.textContent = 'Apagando…'; zerar().catch(function (x) { cx.querySelector('[data-erro]').textContent = x.message; }); };
    });
  }
  // empresa nova: pergunta uma vez se quer ver com exemplos ou já começar vazia
  function boasVindas() {
    caixa('<h2>Bem-vindo à ' + esc(info.empresa) + '</h2><p>O sistema abriu com dados de exemplo, para você ver como tudo funciona.</p><p>Quer apagar os exemplos e começar com os seus dados?</p><p class="vc-mudo">Dá para fazer isso depois, em <b>Começar do zero</b>, na faixa de cima.</p><p class="vc-mudo" data-erro></p>' +
      '<button class="vc-bt" data-ok>Começar do zero</button><button class="vc-bt vc-2" data-vc-fecha data-exemplos>Ver com os exemplos</button>', function (cx) {
      cx.querySelector('[data-exemplos]').addEventListener('click', function () { if (window.veltriaMarca) window.veltriaMarca('exemplos'); });
      cx.querySelector('[data-ok]').onclick = function () { this.disabled = true; this.textContent = 'Preparando…'; zerar().catch(function (x) { cx.querySelector('[data-erro]').textContent = x.message; }); };
    });
  }

  // ---------------------------------------------------------------- assistente com IA
  // resumo dos dados da empresa para a IA: listas com até 25 itens, sem telefone, documentos, endereços, observações e textos longos
  var SENSIVEL = /tel|fone|whats|cpf|cnpj|doc|email|end$|endereco|obs|nota|texto|hist|andament|receita|medico|crm$|crf|oab|foto|senha|pix|msg|cor$|ean|cod$|sku/i;
  var FORA = /^(conversa|assinatura|ajudantes|audit|auditoria|log|resp|ajustes|eu|plano|acessos|equipe|cesta|comanda|cupom|pdv|busca|abas)$/;
  function resumo(d) {
    var linhas = [], tam = 0;
    var val = function (v) { return typeof v === 'string' ? v.slice(0, 40) : typeof v === 'number' || typeof v === 'boolean' ? String(Math.round(v * 100) / 100) : null; };
    var item = function (o) { if (typeof o !== 'object' || !o) return val(o); return Object.keys(o).filter(function (k) { return !SENSIVEL.test(k) && k !== 'id'; }).map(function (k) { var v = val(o[k]); return v === null || v === '' ? null : k + '=' + v; }).filter(Boolean).join(', '); };
    var poe = function (t) { if (tam + t.length > 7000) return false; linhas.push(t); tam += t.length + 1; return true; };
    (function anda(o, pre, prof) {
      Object.keys(o).forEach(function (k) {
        if (FORA.test(k) || SENSIVEL.test(k)) return;
        var v = o[k], nome = pre + k;
        if (Array.isArray(v)) { if (!poe(nome + ' (' + v.length + '):')) return; v.slice(0, 25).forEach(function (x) { var t = item(x); if (t) poe('- ' + t); }); }
        else if (v && typeof v === 'object') { if (prof < 2) anda(v, nome + '.', prof + 1); }
        else { var t = val(v); if (t !== null && t !== '') poe(nome + ': ' + t); }
      });
    })(d || {}, '', 0);
    return linhas.join('\n');
  }
  window.veltriaIA = function (pergunta) {
    if (window.veltriaMarca) window.veltriaMarca('ia');
    var d = window.veltriaDados ? window.veltriaDados() : JSON.parse(texto(NS) || '{}'), ver = (window.VELTRIA_VERSOES || {})[app] || {};
    var contagens = {}; Object.keys(d || {}).forEach(function (k) { if (Array.isArray(d[k]) && !FORA.test(k)) contagens[k] = d[k].length; });
    return cliente().then(function (sb) {
      return sb.functions.invoke('nexo-ia', { body: { pergunta: String(pergunta).slice(0, 600), espaco: info.espaco, sistema: ver.nome || 'Veltria', hoje: new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10), contexto: { contagens: contagens }, resumo: resumo(d) } });
    }).then(function (r) {
      if (r.error) return r.error.context.json().catch(function () { return {}; }).then(function (j) { return j.erro || 'O assistente não respondeu agora. Tente de novo em instantes.'; });
      var x = r.data || {};
      return (x.resposta || 'Não consegui responder agora.') + (typeof x.restantes === 'number' && !x.propria ? '\n\n(' + x.restantes + ' perguntas grátis restantes hoje)' : '');
    }).catch(function () { return 'Sem conexão com o assistente agora. Tente de novo em instantes.'; });
  };

  // empresa vazia: contas com zero dividido por zero não mostram "NaN%" nem "Infinity" na tela
  // shortcut: corrige só o texto exibido; se aparecer em cálculo que grava dado, corrigir no app.js daquela versão
  // e o nome da empresa de exemplo (escrito direto em algumas telas e nas mensagens de WhatsApp) vira o da conta
  var EXEMPLO = { agendaessencial: 'Studio Lia Nails', agendacompleto: 'Salão Ateliê Bela Vista', agendaavancado: 'Maison Íris', crmcompleto: 'Solaris Energia Solar', crmavancado: 'Nuvra Software B2B',
    farmaciaessencial: 'Drogaria Santa Clara', farmaciacompleto: 'Farmácia Vida Plena', farmaciaavancado: 'Rede FarmaJá', financeirocompleto: 'Climatiza BH Refrigeração|Climatiza BH',
    gestaoessencial: 'Mercado Bom Preço', gestaocompleto: 'Casa Aurora Utilidades|Casa Aurora', gestaoavancado: 'Empório Vila Nobre', juridicocompleto: 'Ferraz & Albuquerque Advogados',
    juridicoavancado: 'Monteiro Bastos Sociedade de Advogados', obrasessencial: 'Reforma Certa', obrascompleto: 'Construtora Alicerce', obrasavancado: 'Grupo Monólito Engenharia',
    oficinaessencial: 'Auto Mecânica do Tião', oficinacompleto: 'Centro Automotivo Rota Certa', oficinaavancado: 'Rede Torque Auto Center' }[app];
  var reNome = EXEMPLO ? new RegExp(EXEMPLO.replace(/[.*+?^${}()[\]\\]/g, '\\$&'), 'g') : null;
  // na conta, nada de "na versão contratada" nem ação "(demonstração)": diz o que vale de verdade
  // (o que depende de serviço externo, como nota fiscal, SNGPC, banco e WhatsApp oficial, a equipe ativa com o cliente)
  var ATIVA = 'a nossa equipe ativa com você';
  var FRASES = [
    // assistente: na conta as respostas são da IA de verdade
    [/\s*(Na demonstração as respostas são de exemplo; na contratada são|Na versão contratada[,:]?|Na contratada,?)\s*(são )?20 perguntas grátis por dia( por usuário)?[.;]?(\s*[Aa]qui as respostas são de exemplo\.?)?/g, ' São 20 perguntas grátis por dia.'],
    [/Exemplo da demonstração\. Na contratada, 20 perguntas grátis por dia;/g, '20 perguntas grátis por dia;'],
    [/\(?(Resposta de exemplo da demonstração|Exemplo da demonstração)\.?( Na versão contratada,? 20 perguntas grátis por dia\.)?\)?/g, ''],
    [/\s*Disponível na versão contratada\./g, ''],
    // troca de plano: na conta já abre o Mercado Pago
    [/(Na versão contratada|Na contratada),? a troca é confirmada no Mercado Pago\.?/g, 'A troca é confirmada no Mercado Pago.'],
    [/A troca é confirmada no Mercado Pago na versão contratada\./g, 'A troca é confirmada no Mercado Pago.'],
    [/Na versão contratada você confirma no Mercado Pago\./g, 'Você confirma no Mercado Pago.'],
    [/Na versão contratada abre o pagamento seguro do Mercado Pago/g, 'Abre o pagamento seguro do Mercado Pago'],
    // integrações que dependem de conta, certificado ou convênio da empresa
    [/Cupom fiscal \(NFC-e\) sai em cada venda na versão contratada\./g, 'Cupom fiscal (NFC-e): ' + ATIVA + ', com o certificado digital da farmácia.'],
    [/ \(na versão contratada, lendo o XML da nota\)/g, ''],
    [/\(na versão contratada, com sensor Wi-Fi\)/g, '(com sensor Wi-Fi, que ' + ATIVA + ')'],
    [/Nota fiscal de serviço \(NFS-e\) sai na versão contratada\./g, 'Nota fiscal de serviço (NFS-e): ' + ATIVA + ', com a prefeitura da sua cidade.'],
    [/Na versão contratada elas chegam sozinhas/g, 'Com a ativação da nossa equipe, elas chegam sozinhas'],
    [/Na versão contratada, a IA adapta o texto ao caso\./g, 'Peça ao Assistente para adaptar o texto ao caso.'],
    [/Na versão contratada saem com NFS-e e boleto\/PIX\./g, 'NFS-e e boleto/PIX: ' + ATIVA + '.'],
    [/Na versão contratada as notas vão direto para a prefeitura e a SEFAZ\./g, 'O envio direto para a prefeitura e a SEFAZ ' + ATIVA + '.'],
    [/: na versão contratada saem um a um pelo WhatsApp da oficina\./g, ': abra cada um no WhatsApp da oficina.'],
    [/Na versão contratada sai uma planilha e um ZIP com os comprovantes, e vai por e-mail para[^.]*\./g, 'Use o botão + e "Exportar tudo para o Excel" para mandar ao contador.'],
    [/Na versão contratada o celular lê o código de barras pela câmera e preenche[^.]*\./g, 'A leitura do boleto pela câmera ' + ATIVA + '.'],
    [/Boleto lido: R\$ [\d.,]+ vence em \d+ dias \(exemplo\)\./g, 'A leitura do boleto pela câmera ' + ATIVA + '.'],
    [/Autorizada \(demonstração\)\. Na versão contratada a NFC-e sai pela SEFAZ do seu estado, com QR Code de consulta\./g, 'Venda registrada. A NFC-e pela SEFAZ ' + ATIVA + ', com o certificado digital do mercado.'],
    [/(Integrações da versão contratada|Na versão contratada):\s*/g, 'Integrações que ' + ATIVA + ' (algumas com custo do serviço): '],
    [/Na versão contratada você muda os nomes e a ordem, liga o WhatsApp da empresa e importa a/g, 'Você muda os nomes e a ordem em Ajustes e importa a'],
    // ações que na demonstração só fingiam
    [/Três pedidos enviados às distribuidoras \(demonstração\)\. Entrega prevista em 24 h no CD\./g, 'Pedidos prontos. Mande cada um para a distribuidora pelo WhatsApp ou e-mail.'],
    [/(\d+) movimento\(s\) enviados ao SNGPC \(demonstração\)\. Protocolo guardado\./g, '$1 movimento(s) conferidos no livro. O envio ao SNGPC ' + ATIVA + '.'],
    [/Resumo da previsão gerado \(demonstração\): vai por e-mail para a diretoria toda segunda\./g, 'Resumo da previsão gerado. O envio por e-mail toda segunda ' + ATIVA + '.'],
    [/Cobrança de (.+?) aprovada na segunda tentativa \(demonstração\)\./g, 'Nova tentativa de cobrança de $1 registrada.'],
    [/Arquivo CNAB240 com (\d+) pagamento\(s\) pronto para o banco \(demonstração\)\./g, '$1 pagamento(s) marcados para remessa. O arquivo CNAB do seu banco ' + ATIVA + '.'],
    [/Planilha \.xlsx gerada \(demonstração\)/g, 'Planilha .xlsx gerada'],
    [/ emitidas \(demonstração\)\./g, ' registradas. A emissão na prefeitura e na SEFAZ ' + ATIVA + '.'],
    [/Arquivo do mês gerado \(demonstração\)\. Na versão contratada vai por e-mail para o contador\./g, 'Para o contador: botão + e "Exportar tudo para o Excel".'],
    [/gerada com boleto e notas de todas as OS do mês \(demonstração\)\./g, 'gerada. Boleto e notas: ' + ATIVA + '.'],
    [/\s*\(demonstração\)/g, '']
  ];
  function honesto(t) { for (var i = 0; i < FRASES.length; i++) { FRASES[i][0].lastIndex = 0; if (FRASES[i][0].test(t)) { FRASES[i][0].lastIndex = 0; t = t.replace(FRASES[i][0], FRASES[i][1]); } } return t; }
  function semNaN(no) {
    var w = document.createTreeWalker(no, NodeFilter.SHOW_TEXT), t;
    while ((t = w.nextNode())) {
      var v = t.nodeValue, n = v;
      if (/NaN|Infinity/.test(n)) n = n.replace(/NaN%/g, '0%').replace(/-?Infinity/g, '—').replace(/NaN/g, '0');
      if (reNome && reNome.test(n)) { reNome.lastIndex = 0; n = n.replace(reNome, info.empresa); }
      if (/contratada|demonstra|exemplo/i.test(n)) n = honesto(n);
      if (n !== v) t.nodeValue = n;
    }
    if (reNome && no.querySelectorAll) no.querySelectorAll('a[href*="wa.me"], a[href^="whatsapp:"]').forEach(function (a) {
      var h = decodeURIComponent(a.getAttribute('href')); if (reNome.test(h)) { reNome.lastIndex = 0; var u = a.getAttribute('href').split('text=')[0]; a.setAttribute('href', u + 'text=' + encodeURIComponent(h.split('text=').slice(1).join('text=').replace(reNome, info.empresa))); }
    });
  }
  function vigiaNaN() { semNaN(document.body); new MutationObserver(function (ms) { ms.forEach(function (m) { semNaN(m.target.nodeType === 3 ? m.target.parentNode || document.body : m.target); }); }).observe(document.body, { childList: true, subtree: true, characterData: true }); }

  function montar() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    // tira a faixa de demonstração (a que tem o "Recomeçar") e põe a da conta no lugar
    var rec = document.getElementById('recomecar'), demo = rec && rec.closest('body > *');
    var f = document.createElement('div'); f.className = 'vc-faixa';
    f.innerHTML = '<b>' + esc(info.empresa) + '</b><span class="vc-prazo">' + esc(prazo()) + '</span><span class="vc-salvo" data-e="salvo">Salvo na nuvem</span><button type="button" data-vc="assinatura">' + (info.plano === 'ativo' ? 'Assinatura' : 'Assinar') + '</button><button type="button" data-vc="equipe">Equipe</button><button type="button" data-vc="dados">Dados</button>' + (info.dono ?'<button type="button" data-vc="zerar">Começar do zero</button>' : '') + '<button type="button" data-vc="sair">Sair</button>';
    if (demo) { demo.hidden = true; demo.style.display = 'none'; demo.parentNode.insertBefore(f, demo); } else document.body.insertBefore(f, document.body.firstChild);
    marcar(estado);
    f.addEventListener('click', function (e) { var b = e.target.closest('[data-vc]'); if (!b) return; ({ assinatura: assinatura, equipe: equipe, dados: dadosEditor, zerar: confirmaZerar, sair: sair })[b.dataset.vc](); });
    vigiaNaN(); aplicarPermissoes();
    if (info.novo && info.dono && !sessionStorage.getItem('veltria-boas-vindas-' + info.espaco)) { sessionStorage.setItem('veltria-boas-vindas-' + info.espaco, '1'); setTimeout(boasVindas, 600); }
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
