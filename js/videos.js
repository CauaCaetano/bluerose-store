/* Vídeos "como funciona" da Linha Nexo: qualquer elemento com data-video="crm" abre o vídeo numa janela. */
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
      dlg.querySelector('[data-v-planos]').href = 'sistemas.html#' + id;
      video.poster = 'video/sistemas/' + id + '.webp?v=6';
      video.src = 'video/sistemas/' + id + '.mp4?v=6';
      dlg.showModal();
      video.muted = false;
      var p = video.play();
      if (p && p.catch) p.catch(function () { video.muted = true; video.play().catch(function () {}); });
    });
  });
})();
