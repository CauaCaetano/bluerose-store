// Vértice · cenas 3D (three.js local) com o modelo realista da torre (modelo/torre.glb):
// 1) abertura: a torre Vértice sobe do chão desenhada por uma linha de luz dourada, as janelas acendem na noite,
//    reflexo na água, linhas de luz discretas no horizonte, poeira de luz e brilho (bloom);
// 2) interiores: a mesma torre como maquete de estande sobre o creme, girando devagar conforme a rolagem.
// Modelo 3D: "Miami style condominium" por aitortilla01 (Sketchfab, CC BY 4.0) — crédito no rodapé.
// Sem WebGL: a abertura vira só o degradê com a marca e os interiores mostram uma foto.
import * as THREE from '../assets/three/three.module.js';
import { EffectComposer } from '../assets/three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../assets/three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../assets/three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../assets/three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from '../assets/three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../assets/three/addons/libs/meshopt_decoder.module.js';

const MODELO = 'modelo/torre.glb?v=1';
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
const temGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
const semInteriores = () => document.querySelector('.interiores')?.classList.add('sem-3d');
if (!temGL) semInteriores();

// número pseudoaleatório estável (a cena é sempre a mesma)
let semente = 7;
const rnd = () => { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; };

// carrega a torre e devolve o objeto normalizado: base no chão (y = 0), centrada em x/z, com a altura pedida
function carregaTorre(altura, pronto, falha) {
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(MODELO, (g) => {
    const obj = g.scene;
    obj.updateMatrixWorld(true);
    const caixa = new THREE.Box3().setFromObject(obj), tam = caixa.getSize(new THREE.Vector3()), meio = caixa.getCenter(new THREE.Vector3());
    const esc = altura / tam.y;
    obj.scale.multiplyScalar(esc);
    obj.position.set(-meio.x * esc, -caixa.min.y * esc, -meio.z * esc);
    const raiz = new THREE.Group(); raiz.add(obj);
    let malha = null, mapa = null;
    obj.traverse((o) => { if (o.isMesh) { malha = malha || o; mapa = mapa || o.material.map; } });
    pronto(raiz, malha, mapa, tam.x * esc, tam.z * esc);
  }, undefined, falha);
}

// janelas acesas: a partir da textura do modelo, as janelas de vidro (tons verde-azulados da fachada) viram uma máscara;
// no shader cada janela acende ou não ao acaso, sorteada também pela faixa de altura do prédio (a textura se repete
// andar a andar, e sem isso as janelas acesas formariam um desenho repetido)
function mapaJanelas(mapa) {
  const img = mapa && mapa.image; if (!img) return null;
  const W = img.width || 1024, H = img.height || 1024;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H), p = d.data;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const o = (j * W + i) * 4, r = p[o], g = p[o + 1], b = p[o + 2];
    // só a parte de baixo do atlas (fachadas); acima ficam grama, quadra e piscina
    const vidro = j > H * 0.3 && g > r + 10 && g >= b - 6 && g < 200;
    const escuro = j > H * 0.3 && i < W * 0.55 && r + g + b < 90; // vãos escuros da faixa central da fachada
    const k = vidro || escuro ? 255 : 0;
    p[o] = p[o + 1] = p[o + 2] = k; p[o + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.flipY = mapa.flipY; t.anisotropy = 4;
  return t;
}
function acendeJanelas(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <emissivemap_fragment>', `#ifdef USE_EMISSIVEMAP
        float jan = texture2D( emissiveMap, vEmissiveMapUv ).r;
        float faixa = floor( vLocal.z / 0.11 ) + floor( vLocal.x / 0.3 ) * 3.0 + floor( vLocal.y / 0.3 ) * 5.0;
        vec2 cel = mod( floor( vEmissiveMapUv * vec2( 42.0, 36.0 ) ) + vec2( faixa * 13.0, faixa * 7.0 ), 97.0 );
        float hs = fract( sin( dot( cel, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
        totalEmissiveRadiance *= jan * step( 0.75, hs ) * ( 0.35 + ( hs - 0.75 ) * 2.6 ) * vec3( 1.0, 0.69, 0.36 );
      #endif`);
  };
}

/* ───────────── 1 · abertura ───────────── */
function abertura() {
  const intro = document.querySelector('.intro');
  if (!intro || intro.hidden || document.documentElement.dataset.intro === 'fim' || !temGL) return;
  const tela = intro.querySelector('.intro-cena');
  let ren;
  try { ren = new THREE.WebGLRenderer({ canvas: tela, antialias: true, powerPreference: 'high-performance' }); } catch (e) { return; }
  ren.setPixelRatio(Math.min(devicePixelRatio, ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4) ? 1 : (1.5)));
  ren.toneMapping = THREE.ACESFilmicToneMapping; ren.toneMappingExposure = 0.95;
  ren.localClippingEnabled = true;
  const cena = new THREE.Scene();
  cena.fog = new THREE.FogExp2(0x0c0b28, 0.011); cena.background = new THREE.Color(0x0c0b28);
  const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 300);

  // luz de noite: céu azul-noite, luz dourada da orla vinda da frente-esquerda e um contorno quente por trás
  cena.add(new THREE.HemisphereLight(0x4a4f9a, 0x1a0f12, 0.9));
  const orlaLuz = new THREE.DirectionalLight(0xffb066, 1.5); orlaLuz.position.set(-14, 6, 22); cena.add(orlaLuz);
  const contorno = new THREE.DirectionalLight(0xff9a4a, 1.8); contorno.position.set(18, 20, -20); cena.add(contorno);
  const lua = new THREE.DirectionalLight(0x8f9cff, 0.5); lua.position.set(12, 30, 10); cena.add(lua);

  const ouroFraco = new THREE.LineBasicMaterial({ color: 0xc8742e, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false });

  // horizonte: só linhas verticais de luz ao longe (a cidade sugerida, sem prédios modelados)
  const fundo = [];
  for (let i = 0; i < 90; i++) { const x = -70 + rnd() * 140, z = -45 - rnd() * 30, h = 2 + Math.pow(rnd(), 1.6) * 16; if (Math.abs(x) < 6) continue; fundo.push(x, 0, z, x, h, z); }
  const gf = new THREE.BufferGeometry(); gf.setAttribute('position', new THREE.Float32BufferAttribute(fundo, 3));
  cena.add(new THREE.LineSegments(gf, ouroFraco));
  // a orla: linha da areia em curva
  const orla = []; for (let i = 0; i <= 80; i++) { const t = i / 80, x = -60 + t * 120; orla.push(x, 0.02, 9 + Math.sin(t * Math.PI * 2) * 1.6); }
  const go = new THREE.BufferGeometry(); go.setAttribute('position', new THREE.Float32BufferAttribute(orla, 3));
  cena.add(new THREE.Line(go, new THREE.LineBasicMaterial({ color: 0xc8742e, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })));
  // poeira de luz
  const np = 900, pp = new Float32Array(np * 3);
  for (let i = 0; i < np; i++) { pp[i * 3] = -50 + rnd() * 100; pp[i * 3 + 1] = rnd() * 40; pp[i * 3 + 2] = -45 + rnd() * 60; }
  const gp = new THREE.BufferGeometry(); gp.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const po = new THREE.Points(gp, new THREE.PointsMaterial({ color: 0xffc27a, size: 0.09, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  cena.add(po);

  // a torre Vértice: sobe do chão cortada por um plano que avança, com uma linha de luz dourada na borda do corte
  const ALT = 19, GIRO = -0.55;
  const corte = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.001);      // mostra y <= constante
  const corteR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.001);      // reflexo: mostra y >= -constante
  let torre = null, matTorre = null, matReflexo = null, anelLuz = null, largura = 8;
  carregaTorre(ALT, (raiz, malha, mapa, lx, lz) => {
    largura = Math.max(lx, lz);
    const brilho = mapaJanelas(mapa);
    matTorre = new THREE.MeshStandardMaterial({ map: mapa, color: 0xe8dccf, roughness: 0.55, metalness: 0.1, emissive: 0xffffff, emissiveMap: brilho, emissiveIntensity: 0, clippingPlanes: [corte], side: THREE.DoubleSide });
    acendeJanelas(matTorre); malha.material = matTorre;
    torre = new THREE.Group(); torre.rotation.y = GIRO; torre.position.z = -4; torre.add(raiz); cena.add(torre);
    // reflexo na água: a mesma torre espelhada, apagada e transparente
    const esp = raiz.clone(true);
    matReflexo = new THREE.MeshBasicMaterial({ map: mapa, color: 0x8a6a58, transparent: true, opacity: 0.22, depthWrite: false, clippingPlanes: [corteR], side: THREE.DoubleSide });
    esp.traverse((o) => { if (o.isMesh) o.material = matReflexo; });
    const reflexo = new THREE.Group(); reflexo.scale.y = -1; reflexo.add(esp); torre.add(reflexo);
    // linha de luz do corte: um contorno retangular na altura do corte
    const mx = lx * 0.36, mz = lz * 0.42, q = [-mx, 0, -mz, mx, 0, -mz, mx, 0, -mz, mx, 0, mz, mx, 0, mz, -mx, 0, mz, -mx, 0, mz, -mx, 0, -mz];
    const ga = new THREE.BufferGeometry(); ga.setAttribute('position', new THREE.Float32BufferAttribute(q, 3));
    anelLuz = new THREE.LineSegments(ga, new THREE.LineBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    torre.add(anelLuz);
    tInicio = performance.now();
  }, () => {});

  const comp = new EffectComposer(ren);
  comp.addPass(new RenderPass(cena, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.4, 0.42);
  comp.addPass(bloom); comp.addPass(new OutputPass());

  function tamanho() {
    const w = innerWidth, h = innerHeight; ren.setSize(w, h, false); comp.setSize(w, h); cam.aspect = w / h;
    cam.fov = w < 700 ? 62 : 42; cam.updateProjectionMatrix();
  }
  tamanho(); addEventListener('resize', tamanho);

  const t0 = performance.now(); let vivo = true, tInicio = 0;
  const suave = (x) => x * x * (3 - 2 * x), faixa = (t, a, b) => suave(Math.min(1, Math.max(0, (t - a) / (b - a))));
  function quadro(agora) {
    if (!vivo) return;
    const t = (agora - t0) / 1000;
    if (torre) {
      // a torre se ergue entre 0,15 s e 2,3 s depois de carregada; as janelas acendem em seguida
      const tt = (agora - tInicio) / 1000, k = faixa(tt, 0.15, 2.3), h = 0.001 + k * (ALT + 0.5);
      corte.constant = h; corteR.constant = h;
      anelLuz.position.y = h; anelLuz.visible = k > 0.001 && k < 0.999; anelLuz.material.opacity = 0.95 * (1 - faixa(tt, 2.0, 2.3));
      matTorre.emissiveIntensity = 1.15 * faixa(tt, 1.2, 3.0);
      torre.rotation.y = GIRO + t * 0.035;
    }
    const c = suave(Math.min(1, t / 4.2)), aspa = cam.aspect < 0.8;
    cam.position.set(Math.sin(t * 0.25) * 2.5, 3 + c * 6, (aspa ? 52 : 46) - c * 16);
    cam.lookAt(0, 7 + c * 2, -6);
    po.rotation.y = t * 0.02;
    comp.render();
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);
  const fim = () => { setTimeout(() => { vivo = false; removeEventListener('resize', tamanho); comp.dispose?.(); ren.dispose(); ren.forceContextLoss?.(); }, 1000); };
  document.addEventListener('vt-intro-fim', fim, { once: true });
  if (document.documentElement.dataset.intro === 'fim') fim();
}

/* ───────────── 2 · a torre como maquete nos interiores ───────────── */
function interiores() {
  const tela = document.querySelector('.in-cena');
  if (!tela || !temGL) return;
  let iniciado = false;
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && !iniciado) { iniciado = true; io.disconnect(); monta(); } }, { rootMargin: '200px' });
  io.observe(tela);
  function monta() {
    let ren;
    try { ren = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true }); } catch (e) { semInteriores(); return; }
    ren.setPixelRatio(Math.min(devicePixelRatio, ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4) ? 1 : (2))); ren.toneMapping = THREE.ACESFilmicToneMapping; ren.toneMappingExposure = 1.05;
    const cena = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    // ambiente para os reflexos: degradê quente de estúdio
    const ce = document.createElement('canvas'); ce.width = 512; ce.height = 256; const x = ce.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#f6e9dc'); gr.addColorStop(0.55, '#8a7766'); gr.addColorStop(1, '#2b2420');
    x.fillStyle = gr; x.fillRect(0, 0, 512, 256); x.fillStyle = '#fff'; x.fillRect(80, 40, 90, 30); x.fillRect(330, 52, 120, 22);
    const te = new THREE.CanvasTexture(ce); te.mapping = THREE.EquirectangularReflectionMapping; te.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(ren); cena.environment = pm.fromEquirectangular(te).texture; te.dispose(); pm.dispose();
    cena.add(new THREE.HemisphereLight(0xfff4ea, 0x9a8a7c, 0.7));
    const sol = new THREE.DirectionalLight(0xffe6c8, 1.9); sol.position.set(4, 7, 5); cena.add(sol);

    const ALT = 3.2;
    const grupo = new THREE.Group(); cena.add(grupo);
    // sombra suave no chão creme
    const cs = document.createElement('canvas'); cs.width = cs.height = 128; const xs = cs.getContext('2d');
    const rg = xs.createRadialGradient(64, 64, 4, 64, 64, 62); rg.addColorStop(0, 'rgba(70,45,30,.42)'); rg.addColorStop(1, 'rgba(70,45,30,0)'); xs.fillStyle = rg; xs.fillRect(0, 0, 128, 128);
    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cs), transparent: true, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2; sombra.position.y = -ALT / 2 + 0.01; cena.add(sombra);
    cam.position.set(0, 0.9, 9.6); cam.lookAt(0, 0.05, 0);

    let pronta = false;
    carregaTorre(ALT, (raiz, malha, mapa) => {
      malha.material = new THREE.MeshStandardMaterial({ map: mapa, color: 0xfff6ee, roughness: 0.5, metalness: 0.05, envMapIntensity: 0.9, side: THREE.DoubleSide });
      raiz.position.y = -ALT / 2; grupo.add(raiz); pronta = true;
      if (!rodando) { rodando = true; requestAnimationFrame(quadro); }
    }, semInteriores);

    function tamanho() { const r = tela.getBoundingClientRect(); ren.setSize(r.width, r.height, false); cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix(); }
    tamanho(); addEventListener('resize', tamanho);
    const sec = document.querySelector('.interiores'); let visivel = true, rodando = false;
    new IntersectionObserver((es) => { visivel = es[0].isIntersecting; if (visivel && pronta && !calmo && !rodando) { rodando = true; requestAnimationFrame(quadro); } }).observe(sec);
    const t0 = performance.now();
    function quadro(agora) {
      const t = calmo ? 1.2 : (agora - t0) / 1000;
      const r = sec.getBoundingClientRect(), k = Math.min(1, Math.max(0, 1 - r.top / innerHeight));
      grupo.rotation.y = -0.6 + t * 0.18 + k * 1.1; grupo.position.y = Math.sin(t * 0.9) * 0.03;
      ren.render(cena, cam);
      if (visivel && !calmo) requestAnimationFrame(quadro); else rodando = false;
    }
  }
}

abertura();
interiores();
