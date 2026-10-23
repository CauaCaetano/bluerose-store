// Link de agendamento da Veltria Agenda Essencial: bluerose-store.com/agendar/?e=<id da empresa>.
// A cliente escolhe serviço, dia e horário livre e deixa nome e WhatsApp; o pedido vai para a função
// veltria_agenda_pedir (Supabase) e aparece no app da profissional, em Pedidos, para aprovar ou recusar.
// Só vê serviços, horário de funcionamento e horários ocupados (sem nomes de outras clientes).
(function () {
  var c = window.NEXO_NUVEM, esp = new URLSearchParams(location.search).get('e') || '';
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var reais = function (v) { return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); };
  var hm = function (h) { return Math.floor(h) + ':' + String(Math.round((h % 1) * 60)).padStart(2, '0'); };
  var corpo = $('#ag-corpo'), ag = null, esc_ = { serv: null, data: null, ini: null };

  // demonstração (?e=demo): agenda de exemplo, nada é gravado
  var DEMO = esp === 'demo';
  function demo() {
    var hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10), dia = function (n) { var d = new Date(hoje + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    return { nome: 'Studio Lia Nails (exemplo)', abre: 8, fecha: 20, sinalPct: 30, sinalAcima: 100, hoje: hoje,
      servicos: [{ id: 'mao', nome: 'Manicure', min: 45, preco: 35 }, { id: 'pe', nome: 'Pedicure', min: 50, preco: 40 }, { id: 'gel', nome: 'Unha em gel', min: 120, preco: 150 }, { id: 'sobr', nome: 'Design de sobrancelha', min: 30, preco: 45 }],
      ocupados: [{ data: dia(1), ini: 9, min: 45 }, { data: dia(1), ini: 14, min: 120 }, { data: dia(2), ini: 10, min: 50 }] };
  }
  function rpc(nome, args) {
    if (DEMO) return Promise.resolve(nome === 'veltria_agenda_publica' ? demo() : { ok: true });
    return fetch(c.url + '/rest/v1/rpc/' + nome, { method: 'POST', headers: { apikey: c.chave, 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error('Não foi possível agora. Tente de novo em instantes.'); return j; }); });
  }
  function falha(t) { $('#ag-sub').textContent = t; corpo.innerHTML = ''; }
  if (!DEMO && !/^[0-9a-f-]{36}$/.test(esp)) { falha('Este link de agendamento está incompleto. Peça o link certo para a profissional.'); return; }

  function dias() {
    var l = [], base = new Date(ag.hoje + 'T12:00:00');
    for (var i = 0; i < 14; i++) { var d = new Date(base); d.setDate(base.getDate() + i); l.push(d.toISOString().slice(0, 10)); }
    return l;
  }
  // horários livres do dia para a duração do serviço escolhido (de 30 em 30 minutos)
  function livres(data, min) {
    var oc = ag.ocupados.filter(function (o) { return o.data === data; }), l = [], dur = min / 60;
    var agora = new Date(Date.now() - 3 * 3600e3), hojeH = agora.getUTCHours() + agora.getUTCMinutes() / 60;
    for (var h = ag.abre; h + dur <= ag.fecha + 1e-9; h += 0.5) {
      if (data === ag.hoje && h <= hojeH + 1) continue; // hoje, só com pelo menos 1 hora de antecedência
      var bate = oc.some(function (o) { return h < o.ini + o.min / 60 && h + dur > o.ini; });
      if (!bate) l.push(h);
    }
    return l;
  }
  function desenha() {
    var s = ag.servicos.find(function (x) { return x.id === esc_.serv; });
    var html = '<h2>1. Serviço</h2><div class="ag-servs">' + ag.servicos.map(function (x) {
      return '<button type="button" class="ag-serv" data-serv="' + esc(x.id) + '" aria-pressed="' + (x.id === esc_.serv) + '"><span><b>' + esc(x.nome) + '</b><small>' + x.min + ' min</small></span><b class="p">' + reais(x.preco) + '</b></button>';
    }).join('') + '</div>';
    if (s) {
      html += '<h2>2. Dia</h2><div class="ag-dias">' + dias().map(function (d) {
        var dt = new Date(d + 'T12:00:00'), n = livres(d, s.min).length;
        return '<button type="button" class="ag-dia" data-dia="' + d + '" aria-pressed="' + (d === esc_.data) + '"' + (n ? '' : ' disabled') + '><small>' + dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '') + '</small><b>' + dt.getDate() + '</b></button>';
      }).join('') + '</div>';
    }
    if (s && esc_.data) {
      var hs = livres(esc_.data, s.min);
      html += '<h2>3. Horário</h2>' + (hs.length ? '<div class="ag-horas">' + hs.map(function (h) { return '<button type="button" class="ag-hora" data-ini="' + h + '" aria-pressed="' + (h === esc_.ini) + '">' + hm(h) + '</button>'; }).join('') + '</div>' : '<p class="ag-vazio">Sem horário livre neste dia. Escolha outro.</p>');
    }
    if (s && esc_.data && esc_.ini != null) {
      html += '<h2>4. Seus dados</h2><form id="ag-f"><label>Seu nome<input name="nome" autocomplete="name" required maxlength="80"></label><label>WhatsApp com DDD<input name="tel" type="tel" inputmode="tel" autocomplete="tel" required placeholder="(31) 99999-0000"></label><p class="ag-erro" id="ag-erro"></p><button class="ag-bt">Pedir ' + esc(s.nome) + ' · ' + new Date(esc_.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }) + ' às ' + hm(esc_.ini) + '</button></form>';
    }
    corpo.innerHTML = html;
  }
  corpo.addEventListener('click', function (e) {
    var b = e.target.closest('[data-serv],[data-dia],[data-ini]'); if (!b) return;
    if (b.dataset.serv) { esc_ = { serv: b.dataset.serv, data: null, ini: null }; }
    else if (b.dataset.dia) { esc_.data = b.dataset.dia; esc_.ini = null; }
    else esc_.ini = Number(b.dataset.ini);
    desenha();
    var alvo = b.dataset.serv ? '.ag-dias' : b.dataset.dia ? '.ag-horas, .ag-vazio' : '#ag-f'; var el = document.querySelector(alvo); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  corpo.addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target, bt = f.querySelector('button'), erro = $('#ag-erro');
    bt.disabled = true; erro.textContent = '';
    rpc('veltria_agenda_pedir', { p_espaco: esp, p_nome: f.nome.value, p_tel: f.tel.value, p_serv: esc_.serv, p_data: esc_.data, p_ini: esc_.ini }).then(function (r) {
      if (r.erro) { erro.textContent = r.erro; bt.disabled = false; if (/ocupado/.test(r.erro)) carregar(); return; }
      var s = ag.servicos.find(function (x) { return x.id === esc_.serv; });
      corpo.innerHTML = '<div class="ag-ok"><h2>Pedido enviado</h2><p>' + esc(s.nome) + ', ' + new Date(esc_.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }) + ' às ' + hm(esc_.ini) + '.</p><p>' + esc(ag.nome) + ' vai confirmar pelo seu WhatsApp.</p>' + (ag.sinalPct > 0 && s.preco >= ag.sinalAcima ? '<p>Este serviço pede um sinal de ' + ag.sinalPct + '% (' + reais(Math.round(s.preco * ag.sinalPct) / 100) + ') no PIX para garantir o horário; os dados do PIX chegam junto com a confirmação.</p>' : '') + (DEMO ? '<p><small>Demonstração: nada foi enviado.</small></p>' : '') + '</div>';
    }).catch(function (x) { erro.textContent = x.message; bt.disabled = false; });
  });
  function carregar() {
    rpc('veltria_agenda_publica', { p_espaco: esp }).then(function (r) {
      if (r.erro) { falha(r.erro); return; }
      ag = r; ag.abre = Number(ag.abre); ag.fecha = Number(ag.fecha); ag.ocupados.forEach(function (o) { o.ini = Number(o.ini); o.min = Number(o.min); });
      document.title = 'Marcar horário · ' + ag.nome;
      $('#ag-nome').textContent = ag.nome; $('#ag-sub').textContent = ag.servicos.length ? 'Escolha o serviço, o dia e o horário. A confirmação chega no seu WhatsApp.' : 'Os horários ainda não foram abertos. Chame a profissional pelo WhatsApp.';
      if (ag.servicos.length) desenha();
    }).catch(function (x) { falha(x.message); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', carregar); else carregar();
})();
