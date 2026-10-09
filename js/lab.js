/*
 * Laboratório: interface dos scripts Python reais (ver js/lab-worker.js).
 * Cada aba monta o comando, manda para o worker e mostra a saída num terminal.
 */
(function () {
  'use strict';
  var raiz = document.querySelector('[data-lab]');
  if (!raiz) return;
  var EN = document.documentElement.lang.indexOf('en') === 0;
  var T = EN ? {
    desligado: 'Python is off. It starts on the first run (about 10 MB, once).',
    carregando: 'Starting Python in your browser…', pronto: 'Python ready', rodando: 'Running…',
    terminou: 'finished in', erro: 'The script stopped with an error (shown above).', semNomes: 'Add at least one file name.',
    semCsv: 'Paste or choose a sales CSV.', semCampos: 'Fill in the three fields.', falhaCarga: 'Could not start Python. Check your connection and try again.',
  } : {
    desligado: 'Python desligado. Ele liga na primeira execução (cerca de 10 MB, uma vez só).',
    carregando: 'Ligando o Python no seu navegador…', pronto: 'Python pronto', rodando: 'Rodando…',
    terminou: 'terminou em', erro: 'O script parou com erro (veja acima).', semNomes: 'Coloque pelo menos um nome de arquivo.',
    semCsv: 'Cole ou escolha um CSV de vendas.', semCampos: 'Preencha os três campos.', falhaCarga: 'Não consegui ligar o Python. Confira a conexão e tente de novo.',
  };

  var terminal = raiz.querySelector('[data-terminal]');
  var statusEl = raiz.querySelector('[data-status-py]');
  var worker = null, seq = 0, pendentes = {}, ocupado = false, ligado = false;

  var escrever = function (texto, classe) {
    var span = document.createElement('span');
    if (classe) span.className = classe;
    span.textContent = texto + '\n';
    terminal.appendChild(span);
    terminal.scrollTop = terminal.scrollHeight;
  };
  var obterWorker = function () {
    if (!worker) {
      worker = new Worker('js/lab-worker.js?v=7');
      worker.onmessage = function (e) { var f = pendentes[e.data.id]; if (f) f(e.data); };
      worker.onerror = function () { statusEl.textContent = T.falhaCarga; statusEl.dataset.estado = 'erro'; };
    }
    return worker;
  };
  var pedir = function (pedido, aoLinha) {
    return new Promise(function (resolver) {
      var id = ++seq;
      pendentes[id] = function (d) {
        if (d.tipo === 'fim' || d.tipo === 'pronto') { delete pendentes[id]; resolver(d); } else if (aoLinha) aoLinha(d);
      };
      pedido.id = id;
      pedido.lang = EN ? 'en' : 'pt';
      obterWorker().postMessage(pedido);
    });
  };
  var ligar = function () {
    if (ligado) return Promise.resolve();
    statusEl.textContent = T.carregando; statusEl.dataset.estado = 'carregando';
    return pedir({ preparar: true }).then(function (d) {
      ligado = true;
      statusEl.textContent = T.pronto + ' (' + (d.ms / 1000).toFixed(1) + ' s)';
      statusEl.dataset.estado = 'pronto';
    });
  };

  /* ---------- montagem de cada comando ---------- */
  var aspas = function (s) { return /[\s"]/.test(s) ? '"' + s.replace(/"/g, '\\"') + '"' : s; };
  var COMANDOS = {
    relatorio: function (f) {
      var csv = f.csv.value.trim();
      if (!csv) return { erro: T.semCsv };
      var ent = EN ? 'sales.csv' : 'vendas.csv', sai = EN ? 'summary.csv' : 'resumo.csv', arqs = {};
      arqs[ent] = csv + '\n';
      return { script: 'relatorio_vendas.py', args: [ent, '--saida', sai], arquivos: arqs, ler: [sai] };
    },
    organizador: function (f) {
      var nomes = f.nomes.value.split('\n').map(function (n) { return n.trim().replace(/[\\/]/g, '_'); })
        .filter(function (n) { return n && n !== '.' && n !== '..'; }).slice(0, 200);
      if (!nomes.length) return { erro: T.semNomes };
      var arquivos = {};
      var pasta = EN ? 'my-folder' : 'minha-pasta';
      nomes.forEach(function (n) { arquivos[pasta + '/' + n] = ''; });
      var executar = f.executar.checked;
      return { script: 'organizador_arquivos.py', args: [pasta].concat(executar ? ['--executar'] : []), arquivos: arquivos, arvore: executar ? pasta : null };
    },
    qualificador: function () { return { script: 'qualificador_leads_whatsapp.py', args: ['--demo'] }; },
    pix: function (f) { return { script: 'recuperador_pix_whatsapp.py', args: ['--pago-em', f.pago.value] }; },
    gerador: function (f) {
      var v = [f.nome.value.trim(), f.caracteristicas.value.trim(), f.publico.value.trim()];
      if (v.some(function (x) { return !x; })) return { erro: T.semCampos };
      return { script: 'gerador_descricoes.py', args: ['--nome', v[0], '--caracteristicas', v[1], '--publico', v[2]] };
    },
  };

  /* ---------- abas ---------- */
  var abas = raiz.querySelectorAll('[role="tab"]');
  var paineis = raiz.querySelectorAll('[role="tabpanel"]');
  abas.forEach(function (aba) {
    aba.addEventListener('click', function () {
      abas.forEach(function (a) { var on = a === aba; a.setAttribute('aria-selected', String(on)); a.tabIndex = on ? 0 : -1; });
      paineis.forEach(function (p) { p.hidden = p.id !== aba.getAttribute('aria-controls'); });
    });
    aba.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var lista = Array.prototype.slice.call(abas);
      var i = (lista.indexOf(aba) + (e.key === 'ArrowRight' ? 1 : lista.length - 1)) % lista.length;
      lista[i].focus(); lista[i].click();
    });
  });

  /* ---------- arquivos do computador (só leitura local, nada é enviado) ---------- */
  var csvArquivo = raiz.querySelector('[data-csv-arquivo]');
  if (csvArquivo) csvArquivo.addEventListener('change', function () {
    var a = csvArquivo.files[0];
    if (!a) return;
    a.text().then(function (t) { raiz.querySelector('[name="csv"]').value = t.slice(0, 200000); });
  });
  var nomesArquivos = raiz.querySelector('[data-nomes-arquivos]');
  if (nomesArquivos) nomesArquivos.addEventListener('change', function () {
    var lista = Array.prototype.map.call(nomesArquivos.files, function (f) { return f.name; });
    if (lista.length) raiz.querySelector('[name="nomes"]').value = lista.join('\n');
  });

  /* ---------- execução ---------- */
  raiz.querySelectorAll('form[data-comando]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (ocupado) return;
      var aviso = form.querySelector('[data-aviso]');
      var pedido = COMANDOS[form.dataset.comando](form);
      if (aviso) aviso.textContent = pedido.erro || '';
      if (pedido.erro) return;
      ocupado = true;
      var botoes = raiz.querySelectorAll('button[type="submit"]');
      botoes.forEach(function (b) { b.disabled = true; });
      terminal.textContent = '';
      escrever('$ python ' + [pedido.script].concat(pedido.args.map(aspas)).join(' '), 'cmd');
      ligar().then(function () {
        statusEl.textContent = T.rodando;
        return pedir(pedido, function (d) { escrever(d.texto, d.tipo === 'erro' ? 'err' : null); });
      }).then(function (fim) {
        Object.keys(fim.saidas || {}).forEach(function (nome) {
          escrever('');
          escrever('$ cat ' + nome, 'cmd');
          escrever(fim.saidas[nome].trim());
        });
        if (fim.erro) escrever(T.erro, 'err');
        statusEl.textContent = T.pronto + ' · ' + form.dataset.comando + ' ' + T.terminou + ' ' + ((fim.ms || 0) / 1000).toFixed(2) + ' s';
        statusEl.dataset.estado = fim.erro ? 'erro' : 'pronto';
      }).catch(function () {
        statusEl.textContent = T.falhaCarga; statusEl.dataset.estado = 'erro';
      }).then(function () {
        ocupado = false;
        botoes.forEach(function (b) { b.disabled = false; });
      });
    });
  });

  statusEl.textContent = T.desligado;
})();
