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
  if (!app) { exemploAtual(); return; }
  // Demonstração: os dados de exemplo ficam no navegador. Quando o exemplo do sistema muda (versoes.js, campo exemplo),
  // quem tinha a demonstração aberta recebe o exemplo novo, com as novidades; o que testou antes fica guardado numa cópia.
  function exemploAtual() {
    var m = location.pathname.match(/sistemas\/([a-z]+)-([a-z]+)\//), v = m && (window.VELTRIA_VERSOES || {})[m[1] + m[2]];
    if (!v || !v.chave || !v.exemplo) return;
    try {
      var k = v.chave, marca = k + '-exemplo', tem = localStorage.getItem(k);
      if (tem && Number(localStorage.getItem(marca) || 0) < v.exemplo) { localStorage.setItem(k + '-antes-do-exemplo-' + v.exemplo, tem); localStorage.removeItem(k); sessionStorage.setItem('veltria-exemplo-novo', v.nome); }
      localStorage.setItem(marca, String(v.exemplo));
    } catch (e) { /* sem espaço ou sem acesso: fica como está */ }
  }
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
    agendaessencial: 'D clientes[].ultima ags[].dia pedidos[].dia', agendacompleto: 'D ags[].dia bloqueios[].dia clientes[].ultima despesas[].dia vendas[].dia online[].dia cancelados[].dia ags[].sinal.diaPago',
    crmessencial: 'D negocios[].prox.dia negocios[].notas[].dia negocios[].quando', crmcompleto: 'D atividades[].dia deals[].prev perdidos[].dia deals[].impl.projeto deals[].impl.homologacao deals[].impl.instalacao deals[].impl.vistoria deals[].impl.ativo feitas[].dia deals[].manut H deals[].sem deals[].hist[].d propostas[].enviada deals[].naFase deals[].idade', crmavancado: 'D deals[].prox deals[].fecha base[].renova perdas[].dia reunioes[].dia onboard[].dia ganhos[].dia deals[].map[].dia H deals[].parado',
    farmaciaessencial: 'D prods[].lotes[].val clientes[].ultima receitas[].dia vendas[].dia', farmaciacompleto: 'D prods[].lotes[].val livro[].dia servicos[].dia clientes[].ultima perdas[].dia prods[].promo.ate hist[].dia faltas[].dia orcs[].dia H prods[].ultVenda', farmaciaavancado: 'D campanhas[].fim pedidos[].dia inventario[].ultimo inventario[].prox lotesRede[].val repasses[].venc licencas[].fim H chamados[].aberto',
    financeiroessencial: 'D movs[].dia cobrancas[].vence cobrancas[].avisos[] contas[].vence recibos[].dia historico[].dia', financeirocompleto: 'D lancs[].venc lancs[].avisos[] lancs[].pagamentos[].dia extrato[].dia orcs[].dia transferencias[].dia reservas[].dia caixinha.mov[].dia reembolsos[].dia', financeiroavancado: 'D pags[].venc pags[].pagoEm pags[].baixas[].dia recs[].venc recs[].baixas[].dia movs[].dia contas[].desde mutuos[].dia extrato[].dia emprestimos[].dia aplicacoes[].dia aplicacoes[].resgate.dia adiantamentos[].dia vigencias[].fim',
    gestaoessencial: 'D pagar[].vence H clientes[].desde', gestaocompleto: 'D vendas[].dia contas[].vence orcamentos[].dia ajustes[].dia devolucoes[].dia produtos[].promo.ate clientes[].pagos[].dia listas[].dia encomendas[].prazo carnes[].parcelas[].vence clientes[].ultima campanhas[].fim',
    gestaoavancado: 'D produtos[].lotes[].vence vendas[].dia contas[].vence pedidos[].dia movs[].dia log[].dia promos[].ate inventarios[].dia devolucoes[].dia conciliados[].dia fracionados[].dia degustacoes[].dia vales[].dia perdasReg[].dia clientes[].vence corporativo[].entrega H clientes[].ultima',
    juridicocompleto: 'D processos[].andamentos[].dia prazos[].fatal prazos[].interno intimacoes[].dia audiencias[].dia horas[].dia contratos[].parcelas[].dia contratos[].parcelas[].pagoDia tarefas[].ate docsPend[].pedido notas[].dia guias[].venc levantamentos[].dia consultas[].dia diligencias[].dia atendimentos[].retorno',
    juridicoavancado: 'D intimacoes[].dia prazos[].fatal tarefas[].vence horas[].dia auditoria[].dia audiencias[].dia pedidos[].prazo diligencias[].dia despesas[].dia publicacoes[].dia alvaras[].dia garantias[].venc faturas[].venc docsEquipe[].venc compromissos[].dia negocios[].prox guias[].venc teses[].ult',
    obrasessencial: 'D obras[].inicio obras[].entrega obras[].gastos[].dia obras[].diario[].dia orcamentos[].criado',
    obrascompleto: 'D obras[].etapas[].ini obras[].etapas[].fim orcamentos[].criado compras[].dia compras[].vence compras[].pagoEm presencas[].dia medicoes[].dia medicoes[].vence diario[].dia outras[].vence aditivos[].dia equipamentos[].desde equipamentos[].ate equipamentos[].devolvidoEm epi[].dia vales[].dia ocorrencias[].dia ocorrencias[].prazo concretagens[].dia docsObra[].venc pedidosObra[].dia chamados[].dia chamados[].prazo visitas[].dia vistorias[].dia prorrogacoes[].dia obras[].entregueEm',
    obrasavancado: 'D obras[].docs[].vence obras[].ncs[].dia contas[].vence rdos[].dia auditoria[].dia requisicoes[].dia equipamentos[].manut trabalhadores[].aso trabalhadores[].nr18 trabalhadores[].nr35 obras[].medicoes[].dia obras[].aditivos[].dia obras[].reajustes[].dia obras[].ncs[].prazo licitacoes[].abertura unidades[].limite unidades[].vistoria.dia chamadosAT[].dia projetos[].dia rfis[].prazo incidentes[].dia residuos[].dia criticos[].necessario concretagens[].dia',
    oficinaessencial: 'D os[].entrada os[].entregue carros[].revisaoDia caixa[].dia', oficinacompleto: 'D agenda[].dia historico[].ultima pagar[].vence os[].entregueDia os[].encomenda.chega comPagas[].dia os[].prontoDia receber[].vence ferramentas[].calibra oleo.coletas[].dia H estoque[].ultSaida', oficinaavancado: 'D orcamentos[].dia revisoes[].prox planos[].prazo pedidos[].dia despesas[].dia agendaRede[].dia treinos[].fim google[].dia elevadores[].ultima H sinistros[].dias'
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
    if (info.plano === 'ativo') return 'Assinatura ativa';
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
    '.vc-caixa input[type=text]{width:100%;min-height:40px;border:1px solid #cfd2da;border-radius:10px;padding:0 10px;font:inherit}.vc-caixa input:disabled{background:#f1f0ec;color:#6b7080}.vc-dois{display:grid;grid-template-columns:1fr 90px;gap:10px}.vc-h3{margin:16px 0 4px;font-size:1rem}' +
    '.vc-av{width:48px;height:48px;border-radius:12px;background:#1d2230;color:#fff;display:grid;place-items:center;font:700 1.3rem system-ui,sans-serif;margin:4px 0 6px}' +
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
      (info.dono ? '<form><p><b>Assinar ou trocar de plano</b></p><div class="vc-planos">' + [['', 'Assinatura mensal', ver.mensal, '/mês'], ['-anual', 'Assinatura anual', anual(ver.mensal), '/ano']].map(function (o, i) { return '<label><input type="radio" name="p" value="' + o[0] + '"' + (i ? '' : ' checked') + '> ' + o[1] + ' · R$ ' + o[2].toLocaleString('pt-BR') + o[3] + '</label>'; }).join('') + '</div>' +
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
  var CARGOS = { vetnature: ['Veterinário(a)', 'Recepção', 'Banho e tosa', 'Gerente'], agenda: ['Recepção', 'Profissional', 'Gerente', 'Caixa'], crm: ['Vendedor', 'Pré-vendas', 'Gerente comercial', 'Financeiro'], farmacia: ['Balconista', 'Farmacêutico', 'Caixa', 'Gerente'],
    financeiro: ['Financeiro', 'Contador', 'Gerente', 'Auxiliar'], gestao: ['Caixa', 'Estoquista', 'Vendedor', 'Gerente'], juridico: ['Advogado', 'Estagiário', 'Secretária', 'Financeiro'],
    obras: ['Engenheiro', 'Mestre de obras', 'Compras', 'Financeiro'], oficina: ['Mecânico', 'Recepção', 'Peças', 'Gerente'] }[app.replace(/(essencial|completo|avancado)$/, '')] || ['Gerente', 'Atendimento', 'Financeiro'];
  function telasDoMenu() {
    var vistas = {}, l = [];
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      var h = a.getAttribute('href'), c = a.cloneNode(true); c.querySelectorAll('*').forEach(function (x) { if (/^\s*\d+\s*$/.test(x.textContent)) x.remove(); }); // sem o número do aviso (Balcão 3)
      var t = (c.textContent || '').replace(/\s+/g, ' ').trim().replace(/([^\d\s])\d+$/, '$1');
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
  // convite: a mensagem sai pelo WhatsApp ou pelo e-mail do próprio dono (o envio automático por e-mail depende do serviço de e-mail da Blue Rose)
  function textoConvite(email, cargo) {
    var V2 = (window.VELTRIA_VERSOES || {})[app] || {}, link = location.origin + '/app/' + app + '/';
    return 'Olá! Você foi convidado(a) para a equipe da ' + (info.empresa || 'empresa') + ' no ' + (V2.nome || 'sistema Veltria') + (cargo ? ', como ' + cargo : '') + '.\n\nPara entrar: abra ' + link + ' e crie a sua senha com este e-mail: ' + email + '\n\nDepois de entrar você já vê o que foi liberado para você.';
  }
  function botoesConvite(email, cargo, grandes) {
    var t = textoConvite(email, cargo), cls = grandes ? 'vc-bt' : 'vc-mini';
    return '<a class="' + cls + '" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(t) + '">WhatsApp</a>' +
      '<a class="' + cls + (grandes ? ' vc-2' : '') + '" href="mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent('Convite para a equipe da ' + (info.empresa || 'empresa')) + '&body=' + encodeURIComponent(t) + '">E-mail</a>' +
      '<button type="button" class="' + cls + (grandes ? ' vc-2' : '') + '" data-copia-convite="' + esc(t) + '">Copiar convite</button>';
  }
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-copia-convite]'); if (!b) return; (navigator.clipboard ? navigator.clipboard.writeText(b.dataset.copiaConvite) : Promise.reject()).then(function () { b.textContent = 'Copiado'; }).catch(function () { prompt('Copie o convite:', b.dataset.copiaConvite); }); });

  // ---------------------------------------------------------------- perfil (dono ou membro) e configurações
  // Quem criou a empresa vê o "Perfil do dono": e-mail, assinatura, tamanho da equipe e os atalhos para convidar e
  // adicionar pessoas. Quem entrou por convite vê "Meu perfil": cargo, acesso (ver ou alterar), telas liberadas e quem
  // é o dono. Configurações junta empresa (nome, cidade e UF; só o dono muda, o servidor confere), ajustes do sistema,
  // dados e cópia, assinatura, começar do zero e sair. Plano e prazo nunca mudam por aqui (trava no banco).
  var NOME_PAPEL = { dono: 'Dono da empresa', admin: 'Administrador', membro: 'Equipe' };
  function ajustesDoSistema() {
    var a = document.querySelector('a[href="#ajustes"], a[href="#config"], a[href="#configuracoes"], a[href="#mais"]');
    return a ? a.getAttribute('href') : '';
  }
  function linha(r, v) { return '<li><span class="vc-mudo">' + esc(r) + '</span><b>' + esc(v) + '</b></li>'; }
  function perfil() {
    caixa('<h2>' + (info.dono ? 'Perfil do dono' : 'Meu perfil') + '</h2><div id="vc-pf"><p class="vc-mudo">Carregando…</p></div>', function (cx, fecha) {
      cliente().then(function (sb) { return Promise.all([sb.auth.getUser(), sb.from('nexo_membros').select('usuario,email,papel,permissoes').eq('espaco', info.espaco), info.dono || info.papel === 'admin' ? sb.from('nexo_convites').select('email').eq('espaco', info.espaco) : { data: [] }]); }).then(function (r) {
        var u = (r[0].data && r[0].data.user) || {}, ms = r[1].data || [], conv = r[2].data || [];
        var eu = ms.filter(function (m) { return m.usuario === u.id; })[0] || { papel: info.dono ? 'dono' : info.papel || 'membro' }, p = eu.permissoes || {}, dono = ms.filter(function (m) { return m.papel === 'dono'; })[0];
        var gestor = eu.papel === 'dono' || eu.papel === 'admin', telas = telasDoMenu(), nomes = (p.telas || []).map(function (h) { var t = telas.filter(function (x) { return x[0] === h; })[0]; return t ? t[1] : h; });
        var html = '<div class="vc-av" aria-hidden="true">' + esc((u.email || '?')[0].toUpperCase()) + '</div><ul>' + linha('E-mail', u.email || '—') + linha('Papel', NOME_PAPEL[eu.papel] || 'Equipe') +
          (eu.papel === 'membro' ? linha('Cargo', p.cargo || '—') + linha('Acesso', p.so_leitura ? 'só ver' : 'ver e alterar') + linha('Telas', nomes.length ? nomes.join(', ') : 'todas') : '') +
          linha('Empresa', info.empresa || '—') + (eu.papel !== 'dono' && dono ? linha('Dono', dono.email) : '') + (info.dono ? linha('Assinatura', prazo()) : '') +
          linha('Equipe', ms.length + (ms.length === 1 ? ' pessoa' : ' pessoas') + (gestor && conv.length ? ' · ' + conv.length + ' convite(s) esperando' : '')) + '</ul>' +
          (gestor ? '<p class="vc-mudo">Convide pelo e-mail da pessoa: ela recebe o link, entra com o próprio login e já cai nesta empresa com o cargo e as telas que você escolher.</p><button class="vc-bt" data-pf="convidar">Convidar ou adicionar pessoa</button><button class="vc-bt vc-2" data-pf="equipe">Ver e editar a equipe</button>'
            : '<p class="vc-mudo">Para mudar seu cargo, seu acesso ou as telas que você vê, fale com o dono' + (dono ? ' (' + esc(dono.email) + ')' : '') + '.</p>') +
          '<button class="vc-bt vc-2" data-pf="config">Configurações</button><button class="vc-bt vc-2" data-pf="sair">Sair</button>';
        cx.querySelector('#vc-pf').innerHTML = html;
      }).catch(function () { cx.querySelector('#vc-pf').innerHTML = '<p>Não consegui carregar o perfil. Confira a internet e tente de novo.</p>'; });
      cx.addEventListener('click', function (e) { var b = e.target.closest('[data-pf]'); if (!b) return; fecha(); ({ convidar: function () { equipe(true); }, equipe: equipe, config: configuracoes, sair: sair })[b.dataset.pf](); });
    });
  }
  function configuracoes() {
    var aj = ajustesDoSistema();
    caixa('<h2>Configurações</h2><form id="vc-emp"><p class="vc-mudo">' + (info.dono ? 'Dados da empresa (aparecem nos documentos e para a equipe).' : 'Dados da empresa: só o dono muda.') + '</p>' +
      '<label>Nome da empresa<input type="text" name="nome" maxlength="80" required value="' + esc(info.empresa || '') + '"' + (info.dono ? '' : ' disabled') + '></label>' +
      '<div class="vc-dois"><label>Cidade<input type="text" name="cidade" maxlength="60"' + (info.dono ? '' : ' disabled') + '></label><label>UF<input type="text" name="uf" maxlength="2" pattern="[A-Za-z]{2}"' + (info.dono ? '' : ' disabled') + '></label></div>' +
      (info.dono ? '<button class="vc-bt">Salvar empresa</button>' : '') + '<p class="vc-mudo" data-msg></p></form>' +
      '<h3 class="vc-h3">Sistema e conta</h3>' + (aj ? '<button class="vc-bt vc-2" data-cf="ajustes">Ajustes deste sistema</button>' : '') + '<button class="vc-bt vc-2" data-cf="perfil">' + (info.dono ? 'Perfil do dono' : 'Meu perfil') + '</button><button class="vc-bt vc-2" data-cf="equipe">Equipe</button>' +
      (info.dono ? '<button class="vc-bt vc-2" data-cf="assinatura">Assinatura</button>' : '') + '<button class="vc-bt vc-2" data-cf="dados">Dados e cópia de segurança</button>' + (info.dono ? '<button class="vc-bt vc-2" data-cf="zerar">Começar do zero</button>' : '') + '<button class="vc-bt vc-2" data-cf="sair">Sair</button>' +
      '<p class="vc-mudo">Plano, prazo e dono da empresa só mudam pela Veltria.</p>', function (cx, fecha) {
      var f = cx.querySelector('#vc-emp'), msg = f.querySelector('[data-msg]');
      cliente().then(function (sb) { return sb.from('nexo_espacos').select('nome,cidade,uf').eq('id', info.espaco).maybeSingle(); }).then(function (r) { if (r.data) { f.nome.value = r.data.nome || f.nome.value; f.cidade.value = r.data.cidade || ''; f.uf.value = (r.data.uf || '').trim(); } });
      f.addEventListener('submit', function (e) {
        e.preventDefault(); if (!info.dono) return;
        var nome = f.nome.value.trim(), uf = f.uf.value.trim().toUpperCase(); if (!nome) { msg.textContent = 'Digite o nome da empresa.'; return; } if (uf && !/^[A-Z]{2}$/.test(uf)) { msg.textContent = 'UF com 2 letras, ex.: MG.'; return; }
        msg.textContent = 'Salvando…';
        cliente().then(function (sb) { return sb.from('nexo_espacos').update({ nome: nome.slice(0, 80), cidade: f.cidade.value.trim().slice(0, 60) || null, uf: uf || null }).eq('id', info.espaco).select('nome'); }).then(function (r) {
          if (r.error || !r.data || !r.data.length) throw r.error || new Error('sem permissão');
          info.empresa = nome; try { sessionStorage.setItem('veltria-conta', JSON.stringify(info)); } catch (x) { /* só a sessão */ }
          var b = document.querySelector('.vc-faixa b'); if (b) b.textContent = nome; msg.textContent = 'Empresa salva.';
        }).catch(function () { msg.textContent = 'Não consegui salvar. Confira a internet e tente de novo.'; });
      });
      cx.addEventListener('click', function (e) { var b = e.target.closest('[data-cf]'); if (!b) return; fecha(); ({ ajustes: function () { location.hash = aj; }, perfil: perfil, equipe: equipe, assinatura: assinatura, dados: dadosEditor, zerar: confirmaZerar, sair: sair })[b.dataset.cf](); });
    });
  }
  function equipe(abrirConvite) {
    var gestor = info.dono || info.papel === 'admin';
    caixa('<h2>Equipe</h2><p class="vc-mudo">Cada pessoa entra com o próprio e-mail. Escolha o cargo, se pode alterar ou só ver e quais telas aparecem para ela. Equipe sem limite de pessoas.</p><ul id="vc-eq"><li>Carregando…</li></ul><div id="vc-ed"></div>' +
      (gestor ? '<details class="vc-convite"' + (abrirConvite === true ? ' open' : '') + '><summary class="vc-bt">Convidar pessoa</summary><label>E-mail<input type="email" name="email" form="vc-conv" required></label><div id="vc-conv-campos"></div></details>' : '') + '<button class="vc-bt vc-2" data-vc-fecha>Fechar</button>', function (cx) {
      var membros = [];
      function listar() {
        cliente().then(function (sb) { return Promise.all([sb.from('nexo_membros').select('usuario,email,papel,permissoes').eq('espaco', info.espaco), gestor ? sb.from('nexo_convites').select('email,permissoes,papel').eq('espaco', info.espaco) : { data: [] }]); }).then(function (r) {
          membros = r[0].data || [];
          cx.querySelector('#vc-eq').innerHTML = membros.map(function (m, i) {
            var p = m.permissoes || {}, desc = m.papel === 'dono' ? 'dono' : m.papel === 'admin' ? 'administrador' : (p.cargo || 'equipe') + (p.so_leitura ? ' · só ver' : '') + (p.telas ? ' · ' + p.telas.length + ' telas' : '');
            return '<li><span>' + esc(m.email) + '<small class="vc-mudo"> · ' + esc(desc) + '</small></span>' + (gestor && m.papel !== 'dono' && (info.dono || m.papel === 'membro') ? '<span><button type="button" class="vc-mini" data-ed="' + i + '">Editar</button><button type="button" class="vc-mini" data-tira="' + i + '">Remover</button></span>' : '') + '</li>';
          }).join('') + (r[1].data || []).map(function (c) { return '<li><span>' + esc(c.email) + '<small class="vc-mudo"> · convite esperando a pessoa entrar' + (c.permissoes && c.permissoes.cargo ? ' · ' + esc(c.permissoes.cargo) : '') + '</small></span>' + (gestor ? '<span>' + botoesConvite(c.email, c.permissoes && c.permissoes.cargo) + '<button type="button" class="vc-mini" data-cancela="' + esc(c.email) + '">Cancelar</button></span>' : '') + '</li>'; }).join('');
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
      campos.innerHTML = editorPessoa({ papel: 'membro', permissoes: {} }, 'Criar convite') + '<div id="vc-pronto" aria-live="polite"></div>';
      var f = campos.querySelector('form'); f.id = 'vc-conv';
      f.onsubmit = function (e) {
        e.preventDefault(); var em = cx.querySelector('[name=email]'); if (!em.reportValidity()) return;
        var perm = lerPessoa(f, telasDoMenu().length), adm = f.admin && f.admin.checked;
        cliente().then(function (sb) { return sb.from('nexo_convites').insert({ espaco: info.espaco, email: em.value.trim().toLowerCase(), papel: adm ? 'admin' : 'membro', permissoes: adm ? {} : perm }); }).then(function (r) {
          if (r.error) throw r.error; var quem = em.value.trim().toLowerCase(), cg = perm && perm.cargo; em.value = ''; f.reset(); listar(); if (window.veltriaMarca) window.veltriaMarca('equipe');
          var pr = cx.querySelector('#vc-pronto'); if (pr) pr.innerHTML = '<p><b>Convite criado para ' + esc(quem) + '.</b> <span data-vc-envio>Mandando o e-mail…</span></p><p>' + botoesConvite(quem, cg, true) + '</p><p class="vc-mudo">Ela entra pelo link com esse e-mail, cria a senha e já vê só o que você liberou.</p>';
          // e-mail automático pelo servidor (Resend); se não sair, os botões acima mandam pelo WhatsApp ou pelo seu e-mail
          cliente().then(function (sb) { return sb.functions.invoke('nexo-convite', { body: { acao: 'enviar', espaco: info.espaco, email: quem } }); }).then(function (r) {
            var s = pr && pr.querySelector('[data-vc-envio]'); if (!s) return;
            s.textContent = r && r.data && r.data.enviado ? 'O e-mail com o link já foi enviado. Se quiser, mande também pelo WhatsApp:' : 'Mande o acesso para a pessoa:';
          }).catch(function () { var s = pr && pr.querySelector('[data-vc-envio]'); if (s) s.textContent = 'Mande o acesso para a pessoa:'; });
        }).catch(function (x) { f.querySelector('[data-erro]').textContent = /limite/i.test(x.message) ? 'Não foi possível convidar agora. Tente de novo em instantes.' : x.message; });
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
    if (window.veltriaDadosProprio) return window.veltriaDadosProprio(); // o app tem a própria tela de dados (importar, exportar, cópia)
    script(RAIZ + 'demos/sistemas/base/editor.js?v=7').then(function () {
      var atual = JSON.parse(texto(NS) || 'null') || (window.veltriaDados ? JSON.parse(JSON.stringify(window.veltriaDados())) : null); if (!atual) return;
      recarregando = true; // a tela fica com os dados antigos na memória enquanto o editor está aberto: não grava por cima
      window.veltriaEditor({ dados: atual, dias: DIAS || '', abrir: abrir || null,
        salvar: function (d) { gravar.call(localStorage, NS, JSON.stringify(d)); pendente = true; marcar('salvando'); return enviar(); },
        fechou: function (salvou) { if (salvou) { pendente = false; location.reload(); } else recarregando = false; } });
    }).catch(function () { aviso('Não foi possível abrir os dados agora.'); });
  }

  window.veltriaCliente = cliente; // apps que leem tabelas próprias (VetNature: pedidos do link de agendamento)
  window.veltriaAbrirDados = dadosEditor; // o botão + das telas (camada.js) abre por aqui na conta

  // ---------------------------------------------------------------- começar do zero
  function zerar() {
    return script(RAIZ + 'demos/sistemas/base/zerar.js?v=4').then(function () {
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
    if (window.veltriaResumoIA) return window.veltriaResumoIA(); // o app sabe resumir os próprios números (ex.: centavos do Financeiro)
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
      return sb.functions.invoke('nexo-ia', { body: { pergunta: (window.__brIdioma && window.__brIdioma.comIdioma ? window.__brIdioma.comIdioma : String)(String(pergunta).slice(0, 600)), espaco: info.espaco, sistema: ver.nome || 'Veltria', hoje: new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10), contexto: { contagens: contagens }, resumo: resumo(d) } });
    }).then(function (r) {
      if (r.error) return r.error.context.json().catch(function () { return {}; }).then(function (j) { return j.erro || 'O assistente não respondeu agora. Tente de novo em instantes.'; });
      var x = r.data || {};
      return (x.resposta || 'Não consegui responder agora.') + (typeof x.restantes === 'number' && !x.propria ? '\n\n(' + x.restantes + ' perguntas grátis restantes hoje)' : '');
    }).catch(function () { return 'Sem conexão com o assistente agora. Tente de novo em instantes.'; });
  };

  // empresa vazia: contas com zero dividido por zero não mostram "NaN%" nem "Infinity" na tela
  // shortcut: corrige só o texto exibido; se aparecer em cálculo que grava dado, corrigir no app.js daquela versão
  // e o nome da empresa de exemplo (escrito direto em algumas telas e nas mensagens de WhatsApp) vira o da conta
  var EXEMPLO = { vetnature: 'Clínica Veterinária Bem-Estar Animal', agendaessencial: 'Studio Lia Nails', agendacompleto: 'Salão Ateliê Bela Vista', agendaavancado: 'Maison Íris', crmcompleto: 'Solaris Energia Solar', crmavancado: 'Nuvra Software B2B',
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
    f.innerHTML = '<b>' + esc(info.empresa) + '</b><span class="vc-prazo">' + esc(prazo()) + '</span><span class="vc-salvo" data-e="salvo">Salvo na nuvem</span><button type="button" data-vc="assinatura">' + (info.plano === 'ativo' ? 'Assinatura' : 'Assinar') + '</button><button type="button" data-vc="perfil">' + (info.dono ? 'Perfil do dono' : 'Meu perfil') + '</button><button type="button" data-vc="equipe">Equipe</button><button type="button" data-vc="config">Configurações</button><button type="button" data-vc="sair">Sair</button>';
    if (demo) { demo.hidden = true; demo.style.display = 'none'; demo.parentNode.insertBefore(f, demo); } else document.body.insertBefore(f, document.body.firstChild);
    marcar(estado);
    f.addEventListener('click', function (e) { var b = e.target.closest('[data-vc]'); if (!b) return; ({ assinatura: assinatura, perfil: perfil, equipe: equipe, config: configuracoes, dados: dadosEditor, zerar: confirmaZerar, sair: sair })[b.dataset.vc](); });
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
