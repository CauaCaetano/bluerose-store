// Bastos Lacerda · cena 3D da faixa "Decisões empresariais" com o busto de César escaneado no Louvre (modelo realista em GLB):
//  close do busto de perfil, recortado por uma luz lateral quente (silhueta de luz).
//  (08/11/2026: a abertura da home deixou de usar o busto e passou a ser uma foto real de arquitetura corporativa.)
// Modelo: "César - Louvre Museum" por Benjamin Bardou (Sketchfab, CC BY 4.0).
// Só desenha quando a cena está na tela; com prefers-reduced-motion desenha um quadro parado; se o WebGL ou o modelo falharem fica o fundo em CSS.
// Leve: three.js r160 minificado, baixado só quando o 3D vai começar (no celular, depois do texto do topo); no celular
// pixel ratio 1, sombras com mapa menor e o busto com menos triângulos; parado, o laço cai para ~30 quadros/s.
import { celular, calmo, pixelRatio, modelo, depoisDoConteudo, laco } from '../assets/three/leve.js';

let THREE, GLTFLoader, MeshoptDecoder;
// giro do busto para o rosto olhar para o lado
const AJUSTE = { perfil: -2.75 };

// carrega uma vez e entrega uma cópia para cada cena (geometria e textura compartilhadas)
let pedido = null;
function busto() {
  if (!pedido) pedido = new Promise((ok, falha) => {
    // celular: o mesmo busto escaneado com 100 mil triângulos (de 250 mil) e textura 1024
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(modelo('modelo/cesar.glb?v=1', 'modelo/cesar-cel.glb?v=1'), (g) => {
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
  r.setPixelRatio(pixelRatio(1.6)); r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.VSMShadowMap; return r;
}
// laço de desenho: só com a cena na tela e a aba visível; quando passo() diz que está ocioso (só o balanço lento), ~30 quadros/s.
// Com reduced-motion desenha um quadro parado (e de novo só ao redimensionar).
function animar(canvas, passo, aoRedimensionar) {
  const t0 = performance.now();
  const d = calmo ? null : laco(canvas, (agora) => (passo((agora - t0) / 1000) ? 'ocioso' : true));
  const tam = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (w && h) { aoRedimensionar(w, h); if (calmo) passo(9); else d.pedir(); } };
  tam(); addEventListener('resize', tam);
  return d;
}
// compila os shaders em paralelo antes de mostrar o busto (não trava a página no primeiro quadro); a cena aparece quando pronta
function compilaAntes(R, S, cam, giro, d, passo) {
  giro.visible = false;
  R.compileAsync(S, cam).catch(() => {}).then(() => { giro.visible = true; if (d) d.pedir(); else passo(9); });
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
  if (celular) { chave.shadow.mapSize.set(512, 512); chave.shadow.radius = 3; } else { chave.shadow.mapSize.set(1024, 1024); chave.shadow.radius = 6; }
  chave.shadow.bias = -.0006; chave.shadow.normalBias = .01;
  Object.assign(chave.shadow.camera, { left: -1, right: 1, top: 1.6, bottom: -.2, near: .5, far: 8 }); S.add(chave);

  const grupo = new THREE.Group(); S.add(grupo);
  const giro = new THREE.Group(); giro.rotation.y = AJUSTE.perfil; grupo.add(giro);
  giro.add(copia(m, marmore(m.tex, env, 0xf6e6d2, .35)));
  const alvo = new THREE.Vector3(0, .76, 0);

  function passo(t) {
    giro.rotation.y = AJUSTE.perfil + Math.sin(t * .14) * .07;
    cam.position.set(Math.sin(t * .1) * .04, .8, 1.75); cam.lookAt(alvo);
    R.render(S, cam);
    if (giro.visible && !canvas.parentNode.classList.contains('pronta')) canvas.parentNode.classList.add('pronta');
    return true; // só balanço lento: sempre ocioso
  }
  const d = animar(canvas, passo, (w, h) => {
    R.setSize(w, h, false); cam.aspect = w / h;
    // o texto fica à esquerda: o perfil vai para a direita (no celular, para baixo à direita)
    if (cam.aspect > 1.4) cam.setViewOffset(w, h, -w * .26, 0, w, h);
    else cam.setViewOffset(w, h, -w * .36, -h * .3, w, h);
    cam.updateProjectionMatrix();
  });
  compilaAntes(R, S, cam, giro, d, passo);
}

function seguro(id, fn) {
  const c = document.getElementById(id); if (!c) return;
  busto().then((m) => { try { fn(c, m); } catch (e) { c.style.display = 'none'; } }, () => { c.style.display = 'none'; });
}
try {
  await depoisDoConteudo();
  const [a, b] = await Promise.all([import('../assets/three/three.module.min.js'), import('../assets/three/gltf.min.js')]);
  THREE = a; ({ GLTFLoader, MeshoptDecoder } = b);
  seguro('cena-faixa', cenaFaixa);
} catch (e) { document.querySelectorAll('#cena-faixa').forEach((c) => { c.style.display = 'none'; }); }
