// Minha conta: painel do afiliado e, só para a conta do dono, a tela de afiliados.
// Quem decide o que cada conta vê é o banco (nexo_meu_afiliado e nexo_afiliados_admin devolvem nulo para as demais).
(function () {
  'use strict';
  var C = window.BR_CONTA, blocoAf = document.getElementById('afiliado'), blocoDono = document.getElementById('af-dono');
  if (!C || !blocoAf || !blocoDono) return;
  var esc = C.esc, reais = C.reais, cliente = null;
  function dia(d) { return d ? String(d).slice(8, 10) + '/' + String(d).slice(5, 7) + '/' + String(d).slice(0, 4) : ''; }
  function rpc(nome, args) {
    return cliente.rpc(nome, args || {}).then(function (r) { if (r.error) throw new Error(r.error.message); return r.data; });
  }
  function numeros(lista) {
    return '<dl class="af-numeros">' + lista.map(function (n) { return '<div><dt>' + esc(n[0]) + '</dt><dd>' + esc(n[1]) + '</dd></div>'; }).join('') + '</dl>';
  }
  function situacao(x) {
    if (x.situacao === 'paga') return 'Paga';
    if (x.situacao === 'cancelada') return 'Cancelada';
    if (!x.liberar_em) return 'Espera o saldo do cliente';
    return x.liberar_em > new Date().toISOString().slice(0, 10) ? 'Libera em ' + dia(x.liberar_em) : 'A receber';
  }

  // ------------------------------------------------ afiliado
  function painelAfiliado() {
    return rpc('nexo_meu_afiliado').then(function (d) {
      if (!d) return;
      document.body.classList.add('sou-afiliado');
      var link = 'https://bluerose-store.com/?indica=' + d.codigo, pct = Number(d.pct);
      blocoAf.hidden = false;
      blocoAf.innerHTML = '<h2>Programa de afiliados</h2>' +
        (d.ativo ? '' : '<p class="af-aviso">Seu link está pausado: vendas novas não geram comissão.</p>') +
        '<p>Você recebe <b>' + pct + '%</b> de cada pagamento de quem chega pelo seu link: mensalidades por até ' + d.meses + ' meses, sites e sistemas sob medida sobre o valor total.</p>' +
        '<div class="ind-link"><input readonly id="af-link" aria-label="Seu link de afiliado" value="' + esc(link) + '"><button type="button" class="btn btn-ghost" id="af-copiar">Copiar</button></div>' +
        '<a class="btn btn-primary ind-zap" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent('Conheça os sistemas e sites da Blue Rose: ' + link) + '">Compartilhar no WhatsApp</a>' +
        numeros([['Visitas', d.cliques], ['Contas criadas', d.cadastros], ['Clientes pagantes', d.vendas], ['Aguardando', reais(d.aguardando)], ['A receber', reais(d.disponivel)], ['Já pago', reais(d.pago)]]) +
        '<form class="af-form" id="af-pix"><label>Chave Pix para receber<input name="pix" maxlength="140" required value="' + esc(d.pix || '') + '"></label><button class="btn btn-ghost">Salvar chave</button><span role="status"></span></form>' +
        (d.lista.length ? '<div class="af-tabela"><table><thead><tr><th>Data</th><th>Venda</th><th>Comissão</th><th>Situação</th></tr></thead><tbody>' + d.lista.map(function (x) {
          return '<tr><td>' + dia(x.quando) + '</td><td>' + esc(x.descricao) + '</td><td>' + reais(x.valor) + '</td><td>' + esc(situacao(x)) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="ind-regras">Sua primeira comissão aparece aqui depois do primeiro pagamento aprovado.</p>') +
        '<p class="ind-regras">A venda conta quando a pessoa cria uma conta nova pelo seu link. O teste grátis não conta, e pagamento estornado cancela a comissão. Pagamos por Pix uma vez por mês os valores com mais de 30 dias. No site, a comissão anda depois que o cliente paga o saldo.</p>';
    });
  }

  // ------------------------------------------------ dono
  function painelDono() {
    return rpc('nexo_afiliados_admin').then(function (d) {
      if (!d) return;
      blocoDono.hidden = false;
      var devido = d.afiliados.reduce(function (s, a) { return s + Number(a.disponivel); }, 0);
      blocoDono.innerHTML = '<h2>Afiliados (só você vê)</h2>' + numeros([['Afiliados', d.afiliados.length], ['A pagar agora', reais(devido)]]) +
        '<form class="af-form" id="af-novo"><label>E-mail da conta do afiliado<input type="email" name="email" required autocomplete="off"></label><button class="btn btn-primary">Adicionar</button><span role="status"></span></form>' +
        d.afiliados.map(function (a) {
          return '<article class="af-item"><h3>' + esc(a.email) + (a.ativo ? '' : ' (pausado)') + '</h3>' +
            '<p>Link: <code>bluerose-store.com/?indica=' + esc(a.codigo || '') + '</code><br>Pix: ' + (a.pix ? esc(a.pix) : 'ainda não informou') + '</p>' +
            numeros([['Visitas', a.cliques], ['Contas', a.cadastros], ['Pagantes', a.vendas], ['Aguardando', reais(a.aguardando)], ['A pagar', reais(a.disponivel)], ['Pago', reais(a.pago)]]) +
            '<div class="af-acoes"><button type="button" class="btn btn-primary" data-pagar="' + esc(a.usuario) + '" data-valor="' + esc(a.disponivel) + '"' + (Number(a.disponivel) > 0 && a.pix ? '' : ' disabled') + '>Já fiz o Pix de ' + reais(a.disponivel) + '</button>' +
            '<button type="button" class="btn btn-ghost" data-pausar="' + esc(a.email) + '" data-ativo="' + (a.ativo ? '0' : '1') + '">' + (a.ativo ? 'Pausar' : 'Reativar') + '</button></div>' +
            '<form class="af-form" data-lancar="' + esc(a.usuario) + '"><label>Sistema sob medida vendido<input name="desc" required minlength="3" maxlength="120"></label><label>Valor total recebido (R$)<input name="total" type="number" min="1" step="0.01" required></label><button class="btn btn-ghost">Lançar comissão de ' + Number(a.pct) + '%</button><span role="status"></span></form></article>';
        }).join('') +
        (d.saldos.length ? '<h3>Sites esperando o saldo do cliente</h3>' + d.saldos.map(function (s) {
          return '<div class="af-saldo"><span>' + esc(s.descricao) + ', total ' + reais(s.base) + ': comissão ' + reais(s.valor) + ' de ' + esc(s.email || '') + '</span>' +
            '<button type="button" class="btn btn-primary" data-saldo="' + s.id + '" data-ok="1">Saldo recebido</button><button type="button" class="btn btn-ghost" data-saldo="' + s.id + '" data-ok="0">Cliente não pagou</button></div>';
        }).join('') : '');
    });
  }
  var ERROS = { sem_conta: 'Esse e-mail ainda não tem conta. Peça para a pessoa criar a conta no site primeiro.', invalido: 'Confira o que foi preenchido.', negado: 'Sem permissão.' };
  function nota(f, t) { var s = f.querySelector('[role=status]'); if (s) s.textContent = t; }

  document.addEventListener('submit', function (e) {
    var f = e.target, feito;
    if (f.id === 'af-pix') feito = rpc('nexo_afiliado_pix', { p_pix: f.pix.value }).then(function (r) { nota(f, r === 'ok' ? 'Chave salva.' : ERROS.invalido); });
    else if (f.id === 'af-novo') feito = rpc('nexo_afiliado_admin_salvar', { p_email: f.email.value }).then(function (r) { if (r === 'ok') return painelDono(); nota(f, ERROS[r] || r); });
    else if (f.dataset.lancar) feito = rpc('nexo_afiliado_admin_lancar', { p_afiliado: f.dataset.lancar, p_descricao: f.desc.value, p_total: Number(f.total.value) }).then(function (r) { if (r === 'ok') return painelDono(); nota(f, ERROS[r] || r); });
    else return;
    e.preventDefault();
    feito.catch(function (x) { nota(f, x.message || 'Não foi possível salvar.'); });
  });
  document.addEventListener('click', function (e) {
    var b = e.target;
    if (b.id === 'af-copiar') {
      var el = document.getElementById('af-link');
      (navigator.clipboard ? navigator.clipboard.writeText(el.value) : Promise.reject()).catch(function () { el.select(); document.execCommand('copy'); });
      b.textContent = 'Copiado'; setTimeout(function () { b.textContent = 'Copiar'; }, 1800);
      return;
    }
    var feito;
    if (b.dataset && b.dataset.pagar) {
      if (!window.confirm('Confirma que o Pix de ' + reais(b.dataset.valor) + ' já foi feito?')) return;
      feito = rpc('nexo_afiliado_admin_pagar', { p_afiliado: b.dataset.pagar });
    } else if (b.dataset && b.dataset.pausar) feito = rpc('nexo_afiliado_admin_salvar', { p_email: b.dataset.pausar, p_ativo: b.dataset.ativo === '1' });
    else if (b.dataset && b.dataset.saldo) feito = rpc('nexo_afiliado_admin_saldo', { p_comissao: Number(b.dataset.saldo), p_recebido: b.dataset.ok === '1' });
    else return;
    b.disabled = true;
    feito.then(painelDono).catch(function (x) { b.disabled = false; window.alert(x.message || 'Não foi possível salvar.'); });
  });

  C.sb().then(function (c) {
    cliente = c;
    var feito = false;
    c.auth.onAuthStateChange(function (ev, s) {
      if (!s || feito) return;
      feito = true;
      setTimeout(function () { painelAfiliado().catch(function () {}); painelDono().catch(function () {}); }, 0); // fora do aviso de login: chamar o banco aqui dentro pode travar a sessão
    });
  }).catch(function () {});
})();
