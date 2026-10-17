/* Trepadeiras de rosas azuis nas laterais de todas as páginas (identidade da Blue Rose).
   - O caule cresce (se desenha) trecho a trecho quando aquele trecho aparece na tela; folhas brotam e as rosas desabrocham.
   - Depois de abertas, as rosas só "respiram" (brilho e leve expansão). Nada gira.
   - De tempos em tempos uma pétala se solta de uma rosa visível e cai pela lateral.
   Fica atrás do conteúdo e não recebe clique. Com "reduzir movimento", aparece pronta e parada. */
(function () {
  if (!document.body || document.querySelector('.trep')) return;
  var NS = 'http://www.w3.org/2000/svg';
  var calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SEG = 320; // altura de cada trecho do caule

  // números "aleatórios" fixos: a trepadeira sai igual em toda visita
  function semente(n) { return function () { n = (n * 9301 + 49297) % 233280; return n / 233280; }; }

  var DEFS = '<defs>' +
    '<radialGradient id="tp-pet" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#d6e4ff"/><stop offset=".35" stop-color="#7aa5ff"/><stop offset=".75" stop-color="#2f5fe0"/><stop offset="1" stop-color="#12286a"/></radialGradient>' +
    '<linearGradient id="tp-pa" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#12286a"/><stop offset=".55" stop-color="#2f5fe0"/><stop offset="1" stop-color="#7fa6ff"/></linearGradient>' +
    '<linearGradient id="tp-pb" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1b3d9e"/><stop offset=".6" stop-color="#4a7cf0"/><stop offset="1" stop-color="#b2cbff"/></linearGradient>' +
    '<linearGradient id="tp-pd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5f8dff"/><stop offset=".55" stop-color="#2a55cf"/><stop offset="1" stop-color="#0f2463"/></linearGradient>' +
    '<linearGradient id="tp-pc" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3d6bf0"/><stop offset="1" stop-color="#cfe0ff"/></linearGradient>' +
    '<radialGradient id="tp-pet2" cx="50%" cy="45%" r="65%"><stop offset="0" stop-color="#eef4ff"/><stop offset=".5" stop-color="#8fb4ff"/><stop offset="1" stop-color="#2a55cf"/></radialGradient>' +
    '<linearGradient id="tp-caule" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1c6cff"/><stop offset=".5" stop-color="#6fb2ff"/><stop offset="1" stop-color="#1450d8"/></linearGradient>' +
    '<linearGradient id="tp-folha" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5aa8ff"/><stop offset=".55" stop-color="#1d63e8"/><stop offset="1" stop-color="#0b2d86"/></linearGradient>' +
    '<filter id="tp-brilho" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
    '</defs>';

  // a rosa da marca (recorte da ilustração da Blue Rose); desabrocha crescendo e ganhando nitidez
  var ROSA = '<image href="/img/rosa-flor.webp" x="-28" y="-27" width="56" height="54"/>';
  var BOTAO = '<path d="M0,-12 C8,-8 9,4 0,10 C-9,4 -8,-8 0,-12Z" fill="url(#tp-pet)"/><path d="M-7,6 C-4,2 4,2 7,6 L0,14Z" fill="url(#tp-folha)"/>';
  var FOLHA = '<path d="M0,0 C8,-10 24,-12 34,-4 C24,6 10,8 0,0Z" fill="url(#tp-folha)"/><path d="M2,-1 C12,-6 22,-6 32,-4" fill="none" stroke="#5f86d0" stroke-width=".8" opacity=".5"/>';

  var raiz, rosasPos = [], obs, altura = 0;

  function coluna(lado, alt, W, cx) {
    var r = semente(lado === 'l' ? 17 : 43);
    var n = Math.ceil(alt / SEG), h = [], vivas = [];
    for (var i = 0; i < n; i++) {
      var y0 = i * SEG, y1 = y0 + SEG, a = (i % 2 ? -1 : 1) * (W * 0.32 + r() * W * 0.12);
      // dois caules trançados, cada trecho é um caminho próprio para crescer na sua vez
      var c1 = 'M' + cx + ',' + y0 + ' C' + (cx + a) + ',' + (y0 + SEG * 0.33) + ' ' + (cx - a) + ',' + (y0 + SEG * 0.66) + ' ' + cx + ',' + y1;
      var c2 = 'M' + cx + ',' + y0 + ' C' + (cx - a * 0.8) + ',' + (y0 + SEG * 0.33) + ' ' + (cx + a * 0.8) + ',' + (y0 + SEG * 0.66) + ' ' + cx + ',' + y1;
      var g = '<g class="tp-seg" data-i="' + i + '">' +
        '<path class="tp-c2" d="' + c2 + '" pathLength="1"/><path class="tp-c1" d="' + c1 + '" pathLength="1"/>';
      // espinhos e folhas ao longo do trecho
      for (var k = 0; k < 3; k++) {
        var t = 0.2 + k * 0.3, yy = y0 + SEG * t, xx = cx + a * Math.sin(t * Math.PI * 2) * 0.55;
        g += '<path class="tp-esp" d="M0,0 L9,-4 L2,3Z" transform="translate(' + xx.toFixed(1) + ',' + yy.toFixed(1) + ') rotate(' + (k % 2 ? 200 : 20) + ')" style="--d:' + (0.3 + t).toFixed(2) + 's"/>';
      }
      for (var f = 0; f < 2; f++) {
        var tf = 0.3 + f * 0.4, fy = y0 + SEG * tf, fx = cx + a * Math.sin(tf * Math.PI * 2) * 0.6, lado2 = (i + f) % 2 ? 1 : -1;
        g += '<g transform="translate(' + fx.toFixed(1) + ',' + fy.toFixed(1) + ') rotate(' + (lado2 > 0 ? -25 : 205) + ') scale(' + (0.75 + r() * 0.35).toFixed(2) + ')"><g class="tp-folha" style="--d:' + (0.5 + tf).toFixed(2) + 's">' + FOLHA + '</g></g>';
      }
      // uma rosa por trecho, de lado alternado, e um botão de vez em quando
      var ry = y0 + SEG * (0.45 + r() * 0.15), rx = cx + (i % 2 ? -1 : 1) * W * 0.22, rs = 0.85 + r() * 0.4;
      g += '<g transform="translate(' + rx.toFixed(1) + ',' + ry.toFixed(1) + ') scale(' + rs.toFixed(2) + ')"><g class="tp-rosa" style="--d:1.1s">' + ROSA + '</g></g>';
      vivas.push({ lado: lado, x: rx, y: ry, s: rs, seg: i });
      if (r() > 0.45) {
        var by = y0 + SEG * 0.85, bx = cx - (i % 2 ? -1 : 1) * W * 0.12;
        g += '<g transform="translate(' + bx.toFixed(1) + ',' + by.toFixed(1) + ') scale(.8)"><g class="tp-rosa tp-botao" style="--d:1.4s">' + BOTAO + '</g></g>';
      }
      h.push(g + '</g>');
    }
    var svg = '<svg xmlns="' + NS + '" class="tp-' + lado + '" width="' + W + '" height="' + alt + '" viewBox="0 0 ' + W + ' ' + alt + '">' + DEFS + h.join('') + '</svg>';
    return { svg: svg, vivas: vivas };
  }

  function montar() {
    var alt = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    if (Math.abs(alt - altura) < 120 && raiz) return;
    altura = alt;
    var estreito = innerWidth < 700, W = estreito ? 46 : 130, cx = estreito ? 22 : 48;
    if (!raiz) { raiz = document.createElement('div'); raiz.className = 'trep'; raiz.setAttribute('aria-hidden', 'true'); document.body.appendChild(raiz); }
    var l = coluna('l', alt, W, cx), d = coluna('r', alt, W, cx);
    raiz.style.height = alt + 'px';
    raiz.innerHTML = l.svg + d.svg;
    rosasPos = l.vivas.concat(d.vivas).map(function (p) { p.W = W; return p; });
    var segs = raiz.querySelectorAll('.tp-seg');
    if (calmo || !('IntersectionObserver' in window)) { segs.forEach(function (s) { s.classList.add('on'); }); return; }
    if (obs) obs.disconnect();
    obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('on'); obs.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    segs.forEach(function (s) { obs.observe(s); });
  }

  // pétalas que se soltam de uma rosa aberta e visível e caem pela lateral
  function petala() {
    if (document.hidden || !raiz) return;
    var topo = scrollY, fim = topo + innerHeight;
    var vis = rosasPos.filter(function (p) { return p.y > topo + 40 && p.y < fim - 120 && raiz.querySelector('.tp-' + p.lado + ' .tp-seg[data-i="' + p.seg + '"].on'); });
    if (!vis.length || raiz.querySelectorAll('.tp-petala').length > 5) return;
    var p = vis[Math.floor(Math.random() * vis.length)];
    var el = document.createElement('span');
    el.className = 'tp-petala';
    // a coluna da direita é a mesma desenhada espelhada (scaleX(-1) no CSS)
    var x = p.lado === 'l' ? p.x : document.documentElement.clientWidth - p.x;
    el.style.left = (x - 6) + 'px'; el.style.top = p.y + 'px';
    raiz.appendChild(el);
    var dx = (p.lado === 'l' ? 1 : -1) * (20 + Math.random() * 40), cai = 260 + Math.random() * 220, gira = 160 + Math.random() * 200;
    var a = el.animate([
      { transform: 'translate(0,0) rotate(0deg) scale(.6)', opacity: 0 },
      { transform: 'translate(' + (dx * 0.3) + 'px,' + (cai * 0.15) + 'px) rotate(' + (gira * 0.2) + 'deg) scale(1)', opacity: 1, offset: 0.12 },
      { transform: 'translate(' + (-dx * 0.4) + 'px,' + (cai * 0.5) + 'px) rotate(' + (gira * 0.55) + 'deg) scale(.95)', opacity: 0.9, offset: 0.5 },
      { transform: 'translate(' + dx + 'px,' + cai + 'px) rotate(' + gira + 'deg) scale(.85)', opacity: 0 },
    ], { duration: 6500 + Math.random() * 3000, easing: 'cubic-bezier(.3,.1,.5,1)' });
    a.onfinish = function () { el.remove(); };
  }

  function iniciar() {
    montar();
    var t; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { altura = 0; montar(); }, 300); });
    // a altura muda quando imagens e seções terminam de carregar
    if ('ResizeObserver' in window) new ResizeObserver(function () { clearTimeout(t); t = setTimeout(montar, 400); }).observe(document.body);
    if (!calmo) setInterval(petala, 2200);
  }
  if (document.readyState === 'complete') iniciar(); else addEventListener('load', iniciar);
})();
