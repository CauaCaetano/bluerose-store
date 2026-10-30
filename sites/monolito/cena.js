// Monolito · maquete 3D da abertura: a casa nasce como desenho a traço (linhas que se desenham),
// ganha volume como uma maquete branca de arquitetura e gira devagar; arraste para girar.
import * as THREE from '../assets/three/three.module.js';

function iniciar() {
  const caixa = document.querySelector('.ab-3d'); if (!caixa) return;
  const cv = caixa.querySelector('canvas');
  const raiz = document.documentElement;
  const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let r;
  try {
    r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
    if (!r.getContext()) throw new Error('sem contexto');
  } catch (e) { raiz.classList.add('sem-3d'); return; }
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;

  const cena = new THREE.Scene();
  cena.fog = new THREE.Fog(0xf3eee0, 55, 120);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.5, 300);
  const alvo = new THREE.Vector3(0, 3.2, 0);

  cena.add(new THREE.HemisphereLight(0xfffaf0, 0xc9bea2, 1.6));
  const sol = new THREE.DirectionalLight(0xfff0d8, 3.2);
  sol.position.set(-20, 30, 18); sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 });
  sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.02; sol.shadow.radius = 5;
  cena.add(sol);
  const rebate = new THREE.DirectionalLight(0xdfe8ff, 0.6); rebate.position.set(22, 10, -14); cena.add(rebate);

  // materiais de maquete
  const M = {
    branco: new THREE.MeshStandardMaterial({ color: 0xf4f0e7, roughness: 0.88 }),
    base: new THREE.MeshStandardMaterial({ color: 0xebe5d6, roughness: 0.95 }),
    pedra: new THREE.MeshStandardMaterial({ color: 0x3a4034, roughness: 0.62 }),
    vidro: new THREE.MeshStandardMaterial({ color: 0x5d737a, roughness: 0.12, metalness: 0.35, emissive: 0x22343a, emissiveIntensity: 0.7 }),
    madeira: new THREE.MeshStandardMaterial({ color: 0x9c7756, roughness: 0.7 }),
    agua: new THREE.MeshStandardMaterial({ color: 0x6fc1d1, roughness: 0.08, metalness: 0.1, emissive: 0x174f5c, emissiveIntensity: 0.35 }),
    grama: new THREE.MeshStandardMaterial({ color: 0xcfd0b4, roughness: 1 }),
    copa: new THREE.MeshStandardMaterial({ color: 0xece6d6, roughness: 0.9 }),
    tronco: new THREE.MeshStandardMaterial({ color: 0x8e8571, roughness: 0.9 })
  };
  const mats = Object.values(M);
  mats.forEach(m => { m.transparent = true; m.opacity = 0; });

  const casa = new THREE.Group(); cena.add(casa);
  const traco = [];
  function peca(geo, mat, x, y, z, comTraco = true) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    casa.add(m);
    if (comTraco) { m.updateMatrix(); const e = new THREE.EdgesGeometry(geo, 25); e.applyMatrix4(m.matrix); traco.push(e); }
    return m;
  }
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  // base e terreno
  peca(B(34, 0.5, 22), M.base, 0, 0.25, 1);
  peca(B(11, 0.06, 7), M.grama, 9.5, 0.53, -4.5);
  // térreo envidraçado com núcleo branco
  peca(B(13, 3, 8), M.vidro, -1.5, 2, 0);
  peca(B(3.2, 3, 5.5), M.branco, -5.2, 2, -0.6);
  peca(B(0.35, 3, 8), M.branco, 5.2, 2, 0);
  // laje em balanço
  peca(B(19, 0.42, 10.4), M.branco, 0.6, 3.71, 0.6);
  // pavimento superior
  peca(B(15, 3, 7.6), M.branco, 2.2, 5.42, -0.6);
  peca(B(9.2, 2, 0.14), M.vidro, 4.6, 5.35, 3.24);
  peca(B(0.14, 2, 5.6), M.vidro, 9.74, 5.35, -0.4);
  peca(B(15.8, 0.32, 8.2), M.branco, 2.2, 7.08, -0.6);
  for (let i = 0; i < 12; i++) peca(B(0.12, 2.6, 0.26), M.madeira, -4.9 + i * 0.36, 5.4, 3.36, i % 3 === 0);
  // o monolito: lâmina de pedra escura que atravessa os dois pavimentos
  peca(B(1.1, 8.6, 9.6), M.pedra, -9.1, 4.8, -0.2);
  // piscina e deck
  peca(B(10, 0.08, 4.2), M.madeira, -2.6, 0.54, 7.9);
  peca(B(8.6, 0.12, 3.4), M.agua, 7.4, 0.5, 7.8);
  peca(B(9.4, 0.14, 0.4), M.branco, 7.4, 0.57, 5.9);
  peca(B(9.4, 0.14, 0.4), M.branco, 7.4, 0.57, 9.7);
  // árvores de maquete (esferas sobre hastes)
  [[-14, -5, 1.05], [13.2, -6.8, 1.3], [-13, 7.8, 0.85], [15, 4.2, 0.95]].forEach(([x, z, s]) => {
    peca(new THREE.CylinderGeometry(0.07, 0.09, 2.6 * s, 8), M.tronco, x, 0.5 + 1.3 * s, z, false);
    const c = peca(new THREE.SphereGeometry(1.25 * s, 40, 24), M.copa, x, 0.5 + 2.6 * s + 0.6 * s, z, false);
    c.scale.y = 1.12;
  });

  // traço: todas as arestas numa só geometria para desenhar em ordem (de baixo para cima)
  const pos = [];
  traco.forEach(g => { const a = g.attributes.position.array; for (let i = 0; i < a.length; i++) pos.push(a[i]); });
  const gTraco = new THREE.BufferGeometry(); gTraco.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mTraco = new THREE.LineBasicMaterial({ color: 0x5f5a4c, transparent: true, opacity: 0.9 });
  const linhas = new THREE.LineSegments(gTraco, mTraco); casa.add(linhas);
  const totalV = pos.length / 3; gTraco.setDrawRange(0, 0);

  // linhas de construção no chão (prancheta)
  const guia = [];
  [-17, 17].forEach(x => guia.push(x, 0.01, -16, x, 0.01, 18));
  [-10, 12].forEach(z => guia.push(-26, 0.01, z, 26, 0.01, z));
  guia.push(-9.6, 0.01, 14, 9.7, 0.01, 14, -9.6, 0.01, 13.4, -9.6, 0.01, 14.6, 9.7, 0.01, 13.4, 9.7, 0.01, 14.6);
  guia.push(-9.6, 9.8, -5, 9.7, 9.8, -5);
  const gGuia = new THREE.BufferGeometry(); gGuia.setAttribute('position', new THREE.Float32BufferAttribute(guia, 3));
  const mGuia = new THREE.LineDashedMaterial({ color: 0x8a8370, dashSize: 0.6, gapSize: 0.4, transparent: true, opacity: 0 });
  const lGuia = new THREE.LineSegments(gGuia, mGuia); lGuia.computeLineDistances(); cena.add(lGuia);

  // chão só com sombra
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0, color: 0x3b3524 }));
  chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true; cena.add(chao);

  // tamanho
  function medir() {
    const w = caixa.clientWidth, h = caixa.clientHeight;
    r.setSize(w, h, false); cam.aspect = w / h;
    cam.fov = w < 700 ? 40 : 28; cam.updateProjectionMatrix();
  }
  medir(); window.addEventListener('resize', medir);

  // interação
  let giro = 0, giroAlvo = 0, arrasto = null, mx = 0, my = 0;
  cv.addEventListener('pointerdown', e => { arrasto = { x: e.clientX, g: giroAlvo }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (arrasto) giroAlvo = arrasto.g + (e.clientX - arrasto.x) * 0.006; });
  const solta = () => { arrasto = null; };
  cv.addEventListener('pointerup', solta); cv.addEventListener('pointercancel', solta);
  window.addEventListener('pointermove', e => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; }, { passive: true });
  window.addEventListener('monolito:explorar', () => { giroAlvo += Math.PI * 0.75; });

  // tempo da construção
  let t0 = null, visivel = true, ultimo = 0, ativo = false, rodando = false;
  const pedir = () => { if (ativo && visivel && !rodando) { rodando = true; requestAnimationFrame(quadro); } };
  const ease = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
  const sec = document.querySelector('.abertura');
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visivel = es[0].isIntersecting; pedir(); }, { rootMargin: '100px' }).observe(sec);
  let solidos = false;

  function quadro(t) {
    rodando = false;
    if (!visivel) return;
    if (t0 === null) t0 = t;
    const s = reduz ? 99 : (t - t0) / 1000;
    const dt = Math.min(0.05, (t - ultimo) / 1000 || 0.016); ultimo = t;
    // 1) traço se desenha  2) volumes aparecem  3) traço fica como sombra de desenho
    const kTraco = ease(s / 2.6);
    gTraco.setDrawRange(0, Math.floor(totalV * kTraco / 2) * 2);
    const kVol = ease((s - 2.1) / 1.8);
    mats.forEach(m => { m.opacity = kVol; });
    if (kVol >= 1 && !solidos) { solidos = true; mats.forEach(m => { m.transparent = false; m.opacity = 1; m.needsUpdate = true; }); }
    mTraco.opacity = 0.9 - kVol * 0.72;
    mGuia.opacity = Math.min(1, s / 1.2) * (0.55 - kVol * 0.3);
    chao.material.opacity = kVol * 0.2;

    // câmera: giro lento + mouse + arrasto + rolagem
    const p = parseFloat(getComputedStyle(sec).getPropertyValue('--p')) || 0;
    if (!reduz) giroAlvo += dt * 0.035;
    giro += (giroAlvo - giro) * Math.min(1, dt * 4);
    const ang = 0.72 + giro + mx * 0.25;
    const raio = 60 - p * 18;
    const alt = 13 + my * -4 + p * 18;
    cam.position.set(Math.sin(ang) * raio, alt, Math.cos(ang) * raio);
    alvo.y = 2.2 + p * 2;
    cam.lookAt(alvo);
    r.render(cena, cam);
    if (!reduz || !solidos) pedir();
  }

  const comecar = () => { if (ativo) return; ativo = true; raiz.classList.add('com-3d'); pedir(); };
  if (raiz.classList.contains('pronto') || reduz) comecar();
  else { window.addEventListener('monolito:pronto', comecar, { once: true }); setTimeout(comecar, 3600); }
  if (reduz) { window.addEventListener('scroll', pedir, { passive: true }); window.addEventListener('resize', pedir); }
}

try { iniciar(); } catch (e) { document.documentElement.classList.add('sem-3d'); }
