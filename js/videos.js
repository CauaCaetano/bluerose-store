/* Vídeos "como funciona" da Veltria: qualquer elemento com data-video="crm" abre o vídeo numa janela. */
(function () {
  var botoes = document.querySelectorAll('[data-video]');
  if (!botoes.length) return;
  // tutorial aparece como imagem com o botão de play no meio
  var est = document.createElement('style');
  est.textContent = '.tem-play{position:relative;display:block;cursor:pointer}' +
    '.tem-play span.play-bt{position:absolute;left:50%;top:50%;right:auto;bottom:auto;padding:0;width:72px;height:72px;margin:-36px 0 0 -36px;border-radius:50%;background:rgba(10,14,22,.74);border:2px solid rgba(255,255,255,.9);box-shadow:0 10px 28px rgba(0,0,0,.35);transition:transform .2s,background .2s;pointer-events:none}' +
    '.tem-play span.play-bt::after{content:"";position:absolute;left:28px;top:21px;border-style:solid;border-width:15px 0 15px 24px;border-color:transparent transparent transparent #fff}' +
    '.tem-play:hover span.play-bt,.tem-play:focus-visible span.play-bt{transform:scale(1.08);background:rgba(10,14,22,.9)}' +
    '.vs-tut{margin:16px 0 6px;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.18)}.vs-tut img{display:block;width:100%;height:auto}' +
    '.tem-play span.vs-tut-txt{right:auto;position:absolute;left:10px;bottom:10px;background:rgba(10,14,22,.8);color:#fff;font-size:13px;font-weight:600;padding:5px 11px;border-radius:999px;pointer-events:none}' +
    '.np-tut-play{max-width:560px;margin-top:22px}@media (max-width:560px){.tem-play span.play-bt{width:58px;height:58px;margin:-29px 0 0 -29px}.tem-play span.play-bt::after{left:22px;top:16px;border-width:13px 0 13px 20px}}';
  document.head.appendChild(est);
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
      var pasta = id.indexOf('-') > 0 ? 'video/versoes/' : 'video/sistemas/', v = id.indexOf('-') > 0 ? '3' : '9';
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
