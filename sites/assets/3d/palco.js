// Palco 3D dos sites de exemplo (28/10/2026): só a parte chata, igual para todos.
// Cada site monta a própria cena; aqui ficam o renderizador, o tamanho da tela, a pausa fora da vista
// e o respeito a "reduzir movimento". Sem WebGL, o contêiner ganha .sem-3d e o CSS do site mostra o plano B.
import * as THREE from './three.module.min.js';
import { GLTFLoader } from './GLTFLoader.js';
import { RGBELoader } from './RGBELoader.js';

export { THREE };
// cor de fundo da página, já com a paleta do idioma: a cena continua sumindo na página em qualquer paleta
export function corDaPagina(padrao) { const c = getComputedStyle(document.body).backgroundColor; return new THREE.Color(/^rgb\(/.test(c) ? c : padrao); }
export const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function palco(canvas, { fov = 40, pos = [0, 0, 8], alvo = [0, 0, 0], quadro, claro = true, tom = true } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    canvas.parentElement.classList.add('sem-3d');
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // tom = false: cores do papel e da tinta como estão (o ACES acinzenta tons claros)
  renderer.toneMapping = tom ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  renderer.toneMappingExposure = claro ? 1.05 : 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
  camera.position.set(...pos);
  camera.lookAt(...alvo);

  // ponteiro de -1 a 1 sobre o canvas (as cenas usam para virar ou inclinar)
  const ponteiro = { x: 0, y: 0, dentro: false };
  const mover = (e) => { const r = canvas.getBoundingClientRect(); ponteiro.x = ((e.clientX - r.left) / r.width) * 2 - 1; ponteiro.y = -(((e.clientY - r.top) / r.height) * 2 - 1); ponteiro.dentro = true; };
  canvas.addEventListener('pointermove', mover);
  canvas.addEventListener('pointerdown', mover);
  canvas.addEventListener('pointerleave', () => { ponteiro.dentro = false; });

  const ajustar = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(ajustar).observe(canvas);
  ajustar();

  let visivel = true, rodando = false, t0 = performance.now(), ult = t0;
  const passo = (agora) => {
    if (!visivel || document.hidden) { rodando = false; return; }
    const dt = Math.min((agora - ult) / 1000, 0.05); ult = agora;
    if (quadro) quadro((agora - t0) / 1000, dt);
    renderer.render(cena, camera);
    if (calmo) { rodando = false; return; } // reduzir movimento: um quadro por pedido (redesenhar)
    requestAnimationFrame(passo);
  };
  const iniciar = () => { if (!rodando) { rodando = true; ult = performance.now(); requestAnimationFrame(passo); } };
  new IntersectionObserver(([e]) => { visivel = e.isIntersecting; if (visivel) iniciar(); }, { rootMargin: '120px' }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) iniciar(); });
  iniciar();

  // raio do ponteiro para clicar em objetos 3D
  const raio = new THREE.Raycaster();
  const tocar = (objs) => { raio.setFromCamera(new THREE.Vector2(ponteiro.x, ponteiro.y), camera); return raio.intersectObjects(objs, true)[0] || null; };

  return { THREE, cena, camera, renderer, ponteiro, tocar, redesenhar: iniciar };
}

// número suave em direção ao alvo (para animar sem biblioteca)
export const aproxima = (atual, alvo, dt, vel = 6) => atual + (alvo - atual) * (1 - Math.exp(-vel * dt));

// ---------- modelos e luz reais (Poly Haven, CC0; ver modelos/CREDITOS.txt) ----------
const BASE = new URL('./', import.meta.url).href;
const gltf = new GLTFLoader();

// luz de uma foto 360° (HDRI): reflexos e sombras de verdade. fundo: true mostra a foto desfocada atrás.
export function luz(p, nome, { fundo = false, forca = 1, desfoque = 0.4 } = {}) {
  return new Promise((ok) => new RGBELoader().load(BASE + 'luz/' + nome + '.hdr', (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    p.cena.environment = tex;
    p.cena.environmentIntensity = forca;
    if (fundo) { p.cena.background = tex; p.cena.backgroundBlurriness = desfoque; }
    p.redesenhar(); ok(tex);
  }, undefined, () => ok(null)));
}

// modelo glTF da pasta modelos/<id>/<id>_1k.gltf; devolve a cena dele, já com sombras ligadas
export function modelo(id) {
  return new Promise((ok, erro) => gltf.load(BASE + 'modelos/' + id + '/' + id + '_1k.gltf', (g) => {
    g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    ok(g.scene);
  }, undefined, erro));
}

// textura PBR da pasta texturas/<id>/ (cor, normal, rugosidade), repetida rx × ry vezes
const tl = new THREE.TextureLoader();
export function textura(id, rx = 1, ry = rx) {
  const carrega = (n, cor) => { const t = tl.load(BASE + 'texturas/' + id + '/' + n + '.jpg'); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; if (cor) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { map: carrega('cor', true), normalMap: carrega('normal'), roughnessMap: carrega('rug') };
}

// ajusta o tamanho do objeto para caber em "medida" (maior lado) e devolve um grupo com a base em y = 0 e o
// centro no eixo: posição e giro aplicados ao grupo não deslocam o modelo (o pivô original de cada arquivo varia)
export function encaixar(obj, medida) {
  const caixa = new THREE.Box3().setFromObject(obj), tam = caixa.getSize(new THREE.Vector3());
  obj.scale.multiplyScalar(medida / Math.max(tam.x, tam.y, tam.z));
  const c2 = new THREE.Box3().setFromObject(obj), centro = c2.getCenter(new THREE.Vector3());
  obj.position.x -= centro.x; obj.position.z -= centro.z; obj.position.y -= c2.min.y;
  const g = new THREE.Group(); g.add(obj); return g;
}
