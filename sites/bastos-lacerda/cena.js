// Bastos Lacerda · duas cenas 3D com o busto de César escaneado no Louvre (modelo realista em GLB, textura do mármore):
//  1) abertura: o busto num estúdio bege claro, luz suave de galeria, sombra macia na parede e leve paralaxe com o mouse;
//  2) faixa: close do mesmo busto de perfil, recortado por uma luz lateral quente (silhueta de luz).
// Modelo: "César - Louvre Museum" por Benjamin Bardou (Sketchfab, CC BY 4.0).
// Só desenha quando a cena está na tela; com prefers-reduced-motion desenha um quadro parado; se o WebGL ou o modelo falharem fica o fundo em CSS.
import * as THREE from '../assets/three/three.module.js';
import { GLTFLoader } from '../assets/three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../assets/three/addons/libs/meshopt_decoder.module.js';

const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
// giro do busto para o rosto olhar para a câmera (abertura) e para o lado (faixa)
const AJUSTE = { frente: -1.9, perfil: -2.75 };

// carrega uma vez e entrega uma cópia para cada cena (geometria e textura compartilhadas)
let pedido = null;
function busto() {
  if (!pedido) pedido = new Promise((ok, falha) => {
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load('modelo/cesar.glb?v=1', (g) => {
      const obj = g.scene; let tex = null;
      obj.traverse((o) => { if (o.isMesh) { tex = tex || o.material.emissiveMap || o.material.map; if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals(); } });
      if (tex) { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; }
      // normaliza: 1 unidade de altura, centro no eixo, base no chão
      obj.updateMatrixWorld(true);
      const cx = new THREE.Box3().setFromObject(obj), tam = cx.getSize(new THREE.Vector3()), meio = cx.getCenter(new THREE.Vector3());
      const esc = 1 / tam.y; obj.scale.multiplyScalar(esc);
      obj.position.set(-meio.x * esc, -cx.min.y * esc, -meio.z * esc);
      ok({ obj, tex, larg: tam.x * esc, prof: tam.z * esc });
    }, undefined, falha);
  });
  return pedido;
}
// mármore: a textura escaneada vinha como emissiva (sem luz); aqui vira cor base e recebe luz e sombra de verdade
function marmore(tex, env, tom, brilho) {
  return new THREE.MeshStandardMaterial({ map: tex, color: tom, roughness: .58, metalness: 0, envMap: env, envMapIntensity: brilho, side: THREE.DoubleSide });
}
function copia(m, mat) {
  const c = m.obj.clone(true);
  c.traverse((o) => { if (o.isMesh) { o.material = mat; o.castShadow = true; o.receiveShadow = false; } });
  return c;
}

function ambiente(renderer) {
  // estúdio de galeria para os reflexos suaves do mármore: cúpula em degradê bege e duas janelas de luz difusa
  const s = new THREE.Scene();
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec3 p; void main(){ float h = normalize(p).y * .5 + .5; gl_FragColor = vec4(mix(vec3(.55,.49,.42), vec3(1.,.96,.9), h), 1.); }' }));
  s.add(cupula);
  const luz = new THREE.MeshBasicMaterial({ color: 0xfff6ea });
  const j1 = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), luz); j1.position.set(-9, 7, 7); j1.lookAt(0, 0, 0); s.add(j1);
  const j2 = new THREE.Mesh(new THREE.PlaneGeometry(4, 8), luz); j2.position.set(9, 4, -5); j2.lookAt(0, 0, 0); s.add(j2);
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromScene(s, .04).texture; pm.dispose(); return env;
}
function criarRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4) ? 1 : (1.6))); r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.VSMShadowMap; return r;
}
// liga/desliga o laço de desenho conforme a cena aparece
function animar(canvas, passo, aoRedimensionar) {
  let vivo = false, id = 0, t0 = performance.now();
  const laco = (t) => { passo((t - t0) / 1000); if (vivo) id = requestAnimationFrame(laco); };
  const tam = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (w && h) { aoRedimensionar(w, h); if (calmo || !vivo) passo(calmo ? 9 : (performance.now() - t0) / 1000); } };
  tam(); addEventListener('resize', tam);
  if (calmo) return;
  new IntersectionObserver((es) => { const v = es[0].isIntersecting; if (v && !vivo) { vivo = true; id = requestAnimationFrame(laco); } else if (!v) { vivo = false; cancelAnimationFrame(id); } }).observe(canvas);
}
const suave = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

/* ---------- 1) abertura: busto no estúdio bege ---------- */
function cenaAbertura(canvas, m) {
  const R = criarRenderer(canvas), env = ambiente(R), S = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, .05, 50);
  const ALVO = new THREE.Vector3(0, .52, 0);

  // luz de galeria: céu claro, principal alta à esquerda com sombra macia, recorte quente atrás à direita
  S.add(new THREE.HemisphereLight(0xfff7ec, 0xa88f72, 1.05));
  const sol = new THREE.DirectionalLight(0xfff0dc, 2.4); sol.position.set(-2.2, 3.2, 2.6); sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048); sol.shadow.radius = 14; sol.shadow.blurSamples = 24; sol.shadow.bias = -.0006; sol.shadow.normalBias = .01;
  Object.assign(sol.shadow.camera, { left: -1.6, right: 1.6, top: 1.8, bottom: -.6, near: .5, far: 9 });
  S.add(sol);
  const recorte = new THREE.DirectionalLight(0xffd9ad, 1.3); recorte.position.set(2.4, 1.6, -1.8); S.add(recorte);

  const grupo = new THREE.Group(); S.add(grupo);
  // a parede só recebe a sombra macia: o bege do estúdio é o degradê em CSS por trás
  const parede = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.ShadowMaterial({ color: 0x5a4632, opacity: .16 }));
  parede.position.set(0, 3.5, -.75); parede.receiveShadow = true; grupo.add(parede);

  const giro = new THREE.Group(); giro.rotation.y = AJUSTE.frente; grupo.add(giro);
  giro.add(copia(m, marmore(m.tex, env, 0xfff3e6, .55)));

  let alvoX = 0, alvoY = 0, mx = 0, my = 0, base = { x: 0, y: .6, z: 3.6 };
  addEventListener('pointermove', (e) => { alvoX = e.clientX / innerWidth - .5; alvoY = e.clientY / innerHeight - .5; }, { passive: true });

  function passo(t) {
    const e = calmo ? 1 : suave((t - .2) / 2.2); // entrada: o busto vira devagar até olhar para frente
    giro.rotation.y = AJUSTE.frente + (1 - e) * -.55 + Math.sin(t * .16) * .05 * e;
    giro.position.y = (1 - e) * -.06;
    mx += (alvoX - mx) * .045; my += (alvoY - my) * .045;
    cam.position.set(base.x + mx * .35, base.y - my * .18, base.z);
    cam.lookAt(ALVO.x + mx * .05, ALVO.y, ALVO.z);
    R.render(S, cam);
    if (!canvas.parentNode.classList.contains('pronta')) canvas.parentNode.classList.add('pronta');
  }
  animar(canvas, passo, (w, h) => {
    R.setSize(w, h, false); cam.aspect = w / h;
    if (cam.aspect > 1.05) {
      // computador: o painel ocupa a metade esquerda, o busto fica centrado na metade direita
      cam.fov = 30; base = { x: 0, y: .74, z: 2.45 }; ALVO.set(0, .68, 0);
      cam.setViewOffset(w, h, -w * .25, h * .02, w, h);
    } else {
      // celular: o painel cobre o alto; o busto aparece embaixo, inteiro
      cam.fov = 34; base = { x: 0, y: .7, z: 2.9 }; ALVO.set(0, .66, 0);
      cam.setViewOffset(w, h, 0, -h * .37, w, h);
    }
    cam.updateProjectionMatrix();
  });
}

/* ---------- 2) faixa: close de perfil, silhueta de luz ---------- */
function cenaFaixa(canvas, m) {
  const R = criarRenderer(canvas), env = ambiente(R), S = new THREE.Scene();
  R.toneMappingExposure = .95;
  const cam = new THREE.PerspectiveCamera(24, 1, .05, 50);
  S.add(new THREE.HemisphereLight(0xf3e3cc, 0x4a3a2a, .35));
  // luz rasante quente por trás e de lado: desenha o contorno do rosto
  const borda = new THREE.DirectionalLight(0xffd6a0, 4.2); borda.position.set(2.6, 1.4, -1.6); S.add(borda);
  const chave = new THREE.DirectionalLight(0xfff1de, 1.2); chave.position.set(1.5, 2.2, 2.4); chave.castShadow = true;
  chave.shadow.mapSize.set(1024, 1024); chave.shadow.radius = 6; chave.shadow.bias = -.0006; chave.shadow.normalBias = .01;
  Object.assign(chave.shadow.camera, { left: -1, right: 1, top: 1.6, bottom: -.2, near: .5, far: 8 }); S.add(chave);

  const grupo = new THREE.Group(); S.add(grupo);
  const giro = new THREE.Group(); giro.rotation.y = AJUSTE.perfil; grupo.add(giro);
  giro.add(copia(m, marmore(m.tex, env, 0xf6e6d2, .35)));
  const alvo = new THREE.Vector3(0, .76, 0);

  function passo(t) {
    giro.rotation.y = AJUSTE.perfil + Math.sin(t * .14) * .07;
    cam.position.set(Math.sin(t * .1) * .04, .8, 1.75); cam.lookAt(alvo);
    R.render(S, cam);
    if (!canvas.parentNode.classList.contains('pronta')) canvas.parentNode.classList.add('pronta');
  }
  animar(canvas, passo, (w, h) => {
    R.setSize(w, h, false); cam.aspect = w / h;
    // o texto fica à esquerda: o perfil vai para a direita (no celular, para baixo à direita)
    if (cam.aspect > 1.4) cam.setViewOffset(w, h, -w * .26, 0, w, h);
    else cam.setViewOffset(w, h, -w * .36, -h * .3, w, h);
    cam.updateProjectionMatrix();
  });
}

function seguro(id, fn) {
  const c = document.getElementById(id); if (!c) return;
  busto().then((m) => { try { fn(c, m); } catch (e) { c.style.display = 'none'; } }, () => { c.style.display = 'none'; });
}
seguro('cena-abre', cenaAbertura);
seguro('cena-faixa', cenaFaixa);
