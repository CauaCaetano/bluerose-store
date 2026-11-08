// Ana Ribeiro · tour 360° de demonstração na página do imóvel.
// A foto panorâmica (equirretangular) vira o lado de dentro de uma esfera; arrastar gira a câmera, dois dedos ou a roda do
// mouse aproximam. three.js local, baixado só quando a pessoa toca em "Começar o tour". O laço só desenha com o tour na
// tela e a aba visível; sem interação, gira devagar (parado com reduced-motion ou com as animações pausadas).
import { pixelRatio } from '../assets/three/leve.js';

const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function inicia(caixa) {
  const THREE = await import('../assets/three/three.module.min.js');
  const src = caixa.dataset['360'];
  const tela = document.createElement('canvas');
  tela.className = 't360-tela';
  tela.setAttribute('aria-label', 'Tour 360°: ' + (caixa.dataset.leg || 'ambiente do imóvel') + '. Arraste para olhar em volta.');
  tela.setAttribute('role', 'img');
  caixa.prepend(tela);

  const render = new THREE.WebGLRenderer({ canvas: tela, antialias: true });
  if (!render.getContext()) throw new Error('sem WebGL');
  render.setPixelRatio(pixelRatio(1.5));
  render.outputColorSpace = THREE.SRGBColorSpace;
  const cena = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(75, 1, 1, 1100);
  const geo = new THREE.SphereGeometry(500, 64, 40);
  geo.scale(-1, 1, 1);

  const tex = await new Promise((ok, erro) => new THREE.TextureLoader().load(src, ok, undefined, erro));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, render.capabilities.getMaxAnisotropy());
  cena.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex })));

  let lon = +caixa.dataset.lon || 0, lat = 0, fov = 75, ultimoToque = 0, visivel = true, raf = 0;
  const alvo = new THREE.Vector3();
  const pontos = new Map();
  let distAnt = 0;

  function tamanho() {
    const w = caixa.clientWidth, h = caixa.clientHeight;
    render.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    pede();
  }
  function desenha() {
    raf = 0;
    if (!visivel || document.hidden) return;
    const parado = calmo || document.body.classList.contains('parado');
    if (!parado && performance.now() - ultimoToque > 3500) lon += 0.03;
    lat = Math.max(-80, Math.min(80, lat));
    const phi = THREE.MathUtils.degToRad(90 - lat), theta = THREE.MathUtils.degToRad(lon);
    alvo.set(500 * Math.sin(phi) * Math.cos(theta), 500 * Math.cos(phi), 500 * Math.sin(phi) * Math.sin(theta));
    cam.fov = fov; cam.updateProjectionMatrix();
    cam.lookAt(alvo);
    render.render(cena, cam);
    if (!parado) pede();
  }
  function pede() { if (!raf) raf = requestAnimationFrame(desenha); }

  tela.addEventListener('pointerdown', (e) => { tela.setPointerCapture(e.pointerId); pontos.set(e.pointerId, { x: e.clientX, y: e.clientY }); ultimoToque = performance.now(); caixa.classList.add('mexeu'); });
  tela.addEventListener('pointermove', (e) => {
    const p = pontos.get(e.pointerId); if (!p) return;
    if (pontos.size === 2) {
      const [a, b] = [...pontos.values()];
      p.x = e.clientX; p.y = e.clientY;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (distAnt) fov = Math.max(35, Math.min(90, fov * distAnt / d));
      distAnt = d;
    } else {
      lon -= (e.clientX - p.x) * 0.12 * fov / 75;
      lat += (e.clientY - p.y) * 0.12 * fov / 75;
      p.x = e.clientX; p.y = e.clientY;
    }
    ultimoToque = performance.now(); pede();
  });
  const solta = (e) => { pontos.delete(e.pointerId); if (pontos.size < 2) distAnt = 0; };
  tela.addEventListener('pointerup', solta); tela.addEventListener('pointercancel', solta);
  tela.addEventListener('wheel', (e) => { e.preventDefault(); fov = Math.max(35, Math.min(90, fov + e.deltaY * 0.04)); ultimoToque = performance.now(); pede(); }, { passive: false });
  caixa.addEventListener('keydown', (e) => {
    const m = { ArrowLeft: [-6, 0], ArrowRight: [6, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] }[e.key];
    if (!m) return;
    e.preventDefault(); lon += m[0]; lat += m[1]; ultimoToque = performance.now(); pede();
  });
  if ('ResizeObserver' in window) new ResizeObserver(tamanho).observe(caixa); else addEventListener('resize', tamanho);
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visivel = es[0].isIntersecting; pede(); }).observe(caixa);
  document.addEventListener('visibilitychange', pede);
  new MutationObserver(pede).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  tamanho();
  return { pede };
}
