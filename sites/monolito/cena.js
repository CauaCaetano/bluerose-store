// Monolito · maquete 3D da abertura com uma casa real (GLB com texturas): ela nasce como desenho a traço
// (arestas do próprio modelo, de baixo para cima), ganha volume e textura e gira devagar; arraste para girar.
// Modelo: "Modern Coastal Hillside Villa" por Visthétique (Sketchfab, CC BY 4.0), sem árvores, carro e móveis.
import * as THREE from '../assets/three/three.module.js';
import { GLTFLoader } from '../assets/three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../assets/three/addons/libs/meshopt_decoder.module.js';

// enquadramento do modelo: largura da casa na cena, giro inicial (fachada da piscina para a câmera) e altura do olhar
const AJUSTE = { largura: 24, giro: -2.75, alvoY: 7.4 };
// peças que viram traço (arquitetura); pedras, sofá, churrasqueira e terreno ficam só no volume
const TRACO = /Concrete|Plaster|WindowFrame|Wood049|synthetic_wood|Travertine|stone_pathway|Water/i;

// as texturas vêm dentro do GLB; o carregador padrão passa por blob: (bloqueado pela CSP do site).
// Este plugin decodifica a imagem direto do buffer com createImageBitmap, sem URL nem fetch.
function semBlob(parser) {
  const original = parser.loadImageSource.bind(parser);
  parser.loadImageSource = function (i, loader) {
    const def = parser.json.images[i];
    if (def.bufferView === undefined || typeof createImageBitmap === 'undefined') return original(i, loader);
    if (parser.sourceCache[i] !== undefined) return parser.sourceCache[i].then(t => t.clone());
    const p = parser.getDependency('bufferView', def.bufferView)
      .then(bv => createImageBitmap(new Blob([bv], { type: def.mimeType }), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))
      .then(bmp => { const t = new THREE.Texture(bmp); t.needsUpdate = true; t.userData.mimeType = def.mimeType; return t; });
    parser.sourceCache[i] = p;
    return p;
  };
  return { name: 'monolito_sem_blob' };
}

// o terreno do modelo é grande: as bordas se dissolvem em pontilhado no papel (como uma maquete recortada).
// Raio medido no chão a partir do centro da casa; discard com ruído, sem transparência (não bagunça vidro e água).
const BORDA = { de: 19, ate: 30 };
function bordaDoTerreno(m) {
  const VAR = `
varying vec2 vMonoXZ;`;
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>' + VAR)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 monoW = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          monoW = instanceMatrix * monoW;
        #endif
        vMonoXZ = (modelMatrix * monoW).xz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>' + VAR)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float monoK = 1.0 - smoothstep(${BORDA.de.toFixed(1)}, ${BORDA.ate.toFixed(1)}, length(vMonoXZ));
        float monoR = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
        if (monoK < monoR) discard;`);
  };
}

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
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.1;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); raiz.classList.remove('com-3d'); raiz.classList.add('sem-3d'); });

  const cena = new THREE.Scene();
  cena.fog = new THREE.Fog(0xf3eee0, 70, 135);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.5, 400);
  const alvo = new THREE.Vector3(0, AJUSTE.alvoY, 0);

  // reflexos: céu de fim de tarde (creme em cima, chão quente embaixo, um painel de sol)
  const pmrem = new THREE.PMREMGenerator(r);
  const amb = new THREE.Scene();
  amb.background = new THREE.Color(0xe9e2cf);
  const painel = (w, h, cor, p) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: cor, side: THREE.DoubleSide }));
    m.position.set(p[0], p[1], p[2]); m.lookAt(0, 0, 0); amb.add(m);
  };
  painel(40, 40, new THREE.Color(1.6, 1.55, 1.45), [0, 20, 0]);
  painel(14, 10, new THREE.Color(4.2, 3.6, 2.8), [-14, 12, 10]);
  painel(40, 40, new THREE.Color(0.42, 0.38, 0.3), [0, -20, 0]);
  painel(30, 8, new THREE.Color(0.95, 1.0, 1.08), [18, 4, -12]);
  cena.environment = pmrem.fromScene(amb, 0.04).texture;
  amb.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  pmrem.dispose();

  cena.add(new THREE.HemisphereLight(0xfffaf0, 0xb7ab8c, 0.35));
  const sol = new THREE.DirectionalLight(0xffeccd, 3.6);
  sol.position.set(-22, 30, 16); sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 110 });
  sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.03; sol.shadow.radius = 4;
  cena.add(sol); cena.add(sol.target);

  const casa = new THREE.Group(); cena.add(casa);
  const mats = [];
  let gTraco = null, mTraco = null, totalV = 0, carregado = false;

  // linhas de construção no chão (prancheta), abaixo do terreno do modelo
  const guia = [];
  [-19, 19].forEach(x => guia.push(x, 0.01, -26, x, 0.01, 26));
  [-17, 17].forEach(z => guia.push(-30, 0.01, z, 30, 0.01, z));
  guia.push(-12, 0.01, 21, 12, 0.01, 21, -12, 0.01, 20.4, -12, 0.01, 21.6, 12, 0.01, 20.4, 12, 0.01, 21.6);
  const gGuia = new THREE.BufferGeometry(); gGuia.setAttribute('position', new THREE.Float32BufferAttribute(guia, 3));
  const mGuia = new THREE.LineDashedMaterial({ color: 0x8a8370, dashSize: 0.6, gapSize: 0.4, transparent: true, opacity: 0, fog: false });
  const lGuia = new THREE.LineSegments(gGuia, mGuia); lGuia.computeLineDistances(); cena.add(lGuia);

  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(semBlob).load('modelo/casa.glb?v=1', g => {
    const obj = g.scene;
    obj.updateMatrixWorld(true);
    // normaliza pela casa (caixilhos + vidro), não pelo terreno: centro no meio da casa, base do terreno no chão
    const nucleo = new THREE.Box3(), tudo = new THREE.Box3().setFromObject(obj);
    obj.traverse(o => { if (o.isMesh && /WindowFrame|Glass/.test(o.name)) nucleo.expandByObject(o); });
    if (nucleo.isEmpty()) nucleo.copy(tudo);
    const tam = nucleo.getSize(new THREE.Vector3()), meio = nucleo.getCenter(new THREE.Vector3());
    const esc = AJUSTE.largura / Math.max(tam.x, tam.z);
    obj.scale.multiplyScalar(esc);
    obj.position.set(-meio.x * esc, -tudo.min.y * esc, -meio.z * esc);
    const giro = new THREE.Group(); giro.rotation.y = AJUSTE.giro; giro.add(obj); casa.add(giro);
    casa.updateMatrixWorld(true);

    // materiais: textura do próprio modelo; tudo começa invisível para o traço aparecer primeiro
    const vistos = new Set();
    obj.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = !/Ground|rock_wall|Water|Glass/i.test(o.name); o.receiveShadow = true;
      const lista = Array.isArray(o.material) ? o.material : [o.material];
      lista.forEach(m => {
        if (vistos.has(m)) return; vistos.add(m);
        if (/Glass/i.test(o.name)) { m.roughness = 0.05; m.metalness = 0.2; m.envMapIntensity = 1.4; }
        else m.envMapIntensity = 0.65;
        m.userData.op0 = m.opacity; m.userData.tr0 = m.transparent;
        m.transparent = true; m.opacity = 0; bordaDoTerreno(m); m.needsUpdate = true;
        mats.push(m);
      });
    });

    // traço: arestas das peças de arquitetura numa geometria só, em ordem de altura (o desenho sobe do chão)
    const segs = [], a = new THREE.Vector3(), b = new THREE.Vector3(), inv = new THREE.Matrix4().copy(casa.matrixWorld).invert(), mtx = new THREE.Matrix4();
    obj.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || !TRACO.test(o.name)) return;
      const e = new THREE.EdgesGeometry(o.geometry, 32), p = e.attributes.position;
      mtx.multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < p.count; i += 2) {
        a.fromBufferAttribute(p, i).applyMatrix4(mtx); b.fromBufferAttribute(p, i + 1).applyMatrix4(mtx);
        segs.push([Math.min(a.y, b.y) + Math.random() * 0.6, a.x, a.y, a.z, b.x, b.y, b.z]);
      }
      e.dispose();
    });
    segs.sort((s, t) => s[0] - t[0]);
    const pos = new Float32Array(segs.length * 6);
    segs.forEach((s, i) => pos.set(s.slice(1), i * 6));
    gTraco = new THREE.BufferGeometry(); gTraco.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    mTraco = new THREE.LineBasicMaterial({ color: 0x4f4a3c, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
    bordaDoTerreno(mTraco);
    const linhas = new THREE.LineSegments(gTraco, mTraco); linhas.renderOrder = 2; casa.add(linhas);
    totalV = segs.length * 2; gTraco.setDrawRange(0, 0);

    carregado = true; t0 = null; pedir();
  }, undefined, () => { raiz.classList.remove('com-3d'); raiz.classList.add('sem-3d'); });

  // tamanho
  function medir() {
    const w = caixa.clientWidth, h = caixa.clientHeight;
    r.setSize(w, h, false); cam.aspect = w / h;
    cam.fov = w < 700 ? 40 : 28; cam.updateProjectionMatrix();
    pedir();
  }
  window.addEventListener('resize', medir);

  // interação
  let giro = 0, giroAlvo = 0, arrasto = null, mx = 0, my = 0;
  cv.addEventListener('pointerdown', e => { arrasto = { x: e.clientX, g: giroAlvo }; cv.setPointerCapture(e.pointerId); pedir(); });
  cv.addEventListener('pointermove', e => { if (arrasto) { giroAlvo = arrasto.g + (e.clientX - arrasto.x) * 0.006; pedir(); } });
  const solta = () => { arrasto = null; };
  cv.addEventListener('pointerup', solta); cv.addEventListener('pointercancel', solta);
  window.addEventListener('pointermove', e => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; }, { passive: true });
  window.addEventListener('monolito:explorar', () => { giroAlvo += Math.PI * 0.75; pedir(); });

  // tempo da construção
  let t0 = null, visivel = true, ultimo = 0, ativo = false, rodando = false, solidos = false;
  function pedir() { if (ativo && visivel && !rodando) { rodando = true; requestAnimationFrame(quadro); } }
  const ease = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
  const sec = document.querySelector('.abertura');
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visivel = es[0].isIntersecting; pedir(); }, { rootMargin: '100px' }).observe(sec);

  function quadro(t) {
    rodando = false;
    if (!visivel) return;
    const dt = Math.min(0.05, (t - ultimo) / 1000 || 0.016); ultimo = t;
    let s = 0;
    if (carregado) {
      if (t0 === null) t0 = t;
      s = reduz ? 99 : (t - t0) / 1000;
      // 1) o traço se desenha  2) volume e textura aparecem  3) o traço some quase todo, fica um resto de desenho
      gTraco.setDrawRange(0, Math.floor(totalV * ease(s / 3) / 2) * 2);
      const kVol = ease((s - 2.4) / 2.2);
      mats.forEach(m => { m.opacity = m.userData.op0 * kVol; });
      if (kVol >= 1 && !solidos) {
        solidos = true;
        mats.forEach(m => { m.transparent = m.userData.tr0; m.opacity = m.userData.op0; m.needsUpdate = true; });
      }
      mTraco.opacity = 0.85 - kVol * 0.75;
      mGuia.opacity = Math.min(1, s / 1.2) * (0.5 - kVol * 0.3);
    }

    // câmera: giro lento + mouse + arrasto + rolagem (sobe e se aproxima)
    const p = parseFloat(getComputedStyle(sec).getPropertyValue('--p')) || 0;
    if (!reduz) giroAlvo += dt * 0.035;
    giro += (giroAlvo - giro) * Math.min(1, dt * 4);
    const ang = 0.72 + giro + mx * 0.25;
    const cel = cam.aspect < 0.8;
    const raio = (cel ? 124 : 84) - p * (cel ? 30 : 22);
    const alt = 24 + my * -4 + p * 26;
    cam.position.set(Math.sin(ang) * raio, alt, Math.cos(ang) * raio);
    cena.fog.near = raio + 6; cena.fog.far = raio + 70;
    alvo.y = AJUSTE.alvoY - (cel ? 4.5 : 0) + p * 1.5;
    cam.lookAt(alvo);
    r.render(cena, cam);
    if (!reduz || !solidos || arrasto || Math.abs(giroAlvo - giro) > 0.001) pedir();
  }

  medir();
  const comecar = () => { if (ativo) return; ativo = true; raiz.classList.add('com-3d'); pedir(); };
  if (raiz.classList.contains('pronto') || reduz) comecar();
  else { window.addEventListener('monolito:pronto', comecar, { once: true }); setTimeout(comecar, 3600); }
  if (reduz) { window.addEventListener('scroll', pedir, { passive: true }); }
}

try { iniciar(); } catch (e) { document.documentElement.classList.add('sem-3d'); }
