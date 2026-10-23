/* Vídeos "como funciona" da Veltria: qualquer elemento com data-video="crm" abre o vídeo numa janela. */
(function () {
  var botoes = document.querySelectorAll('[data-video]');
  if (!botoes.length) return;
  var dlg = document.createElement('dialog');
  dlg.className = 'video-dlg';
  dlg.setAttribute('aria-label', 'Vídeo de demonstração');
  dlg.innerHTML = '<div class="video-caixa"><div class="video-cab"><b></b><button type="button" class="video-x" aria-label="Fechar">×</button></div>' +
    '<video controls playsinline preload="none"></video>' +
    '<div class="video-pe"><a class="btn btn-primary" data-v-testar>Testar ao vivo</a><a class="btn btn-ghost" data-v-planos>Ver preços</a></div></div>';
  document.body.appendChild(dlg);
  var video = dlg.querySelector('video');
  function fechar() { video.pause(); video.removeAttribute('src'); video.load(); if (dlg.open) dlg.close(); }
  dlg.querySelector('.video-x').addEventListener('click', fechar);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) fechar(); });
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); fechar(); });
  botoes.forEach(function (b) {
    b.addEventListener('click', function (e) {
      if (typeof dlg.showModal !== 'function') return;
      e.preventDefault();
      var id = b.getAttribute('data-video');
      dlg.querySelector('.video-cab b').textContent = b.getAttribute('data-video-nome') || 'Como funciona';
      dlg.querySelector('[data-v-testar]').href = b.getAttribute('data-video-demo') || b.getAttribute('href') || 'sistemas.html';
      dlg.querySelector('[data-v-planos]').href = b.getAttribute('data-video-planos') || 'sistemas.html#' + id;
      // vídeos por versão (agenda-completo-apresentacao, agenda-completo-tutorial) ficam em video/versoes/
      var pasta = id.indexOf('-') > 0 ? 'video/versoes/' : 'video/sistemas/', v = id.indexOf('-') > 0 ? '1' : '9';
      video.poster = pasta + id + '.webp?v=' + v;
      video.src = pasta + id + '.mp4?v=' + v;
      dlg.showModal();
      video.muted = false;
      var p = video.play();
      if (p && p.catch) p.catch(function () { video.muted = true; video.play().catch(function () {}); });
    });
  });
})();

/* Vídeo tutorial das páginas dos sistemas: os passos ao lado levam o vídeo direto para o trecho e acendem conforme ele toca. */
(function () {
  document.querySelectorAll('.np-tut').forEach(function (caixa) {
    var video = caixa.querySelector('video'), passos = caixa.querySelectorAll('[data-pular]');
    if (!video || !passos.length) return;
    passos.forEach(function (b) {
      b.addEventListener('click', function () {
        video.preload = 'auto';
        var ir = function () { video.currentTime = Number(b.getAttribute('data-pular')) || 0; var p = video.play(); if (p && p.catch) p.catch(function () {}); };
        if (video.readyState >= 1) ir(); else { video.addEventListener('loadedmetadata', ir, { once: true }); video.load(); }
      });
    });
    video.addEventListener('timeupdate', function () {
      var t = video.currentTime, atual = null;
      passos.forEach(function (b) { if (t + 0.3 >= Number(b.getAttribute('data-pular'))) atual = b; });
      passos.forEach(function (b) { b.classList.toggle('on', b === atual); if (b === atual) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    });
  });
})();
