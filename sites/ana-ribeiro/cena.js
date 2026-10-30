// Ana Ribeiro · "Uma nova perspectiva": a Ilha do Campeche real (fotogrametria com textura de verdade) sobre o mar escuro.
// A rolagem leva a câmera numa volta em torno da ilha, descendo perto dela no meio do caminho; os quadros dos bairros
// sobem do mar, param ao lado da ilha quando é a vez deles e saem girando como uma porta (contador e legendas em site.js).
// Sem WebGL, ou com erro, fica o quadro simples em CSS (.il-plano).
import * as THREE from '../assets/three/three.module.js';
import { GLTFLoader } from '../assets/three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../assets/three/addons/libs/meshopt_decoder.module.js';

const ilha = document.getElementById('ilha');
const tela = ilha && ilha.querySelector('.il-tela');
const calmo = window.matchMedia('(prefers-reduced-motion: reduce)');

// tamanho da ilha na cena (comprimento do lado maior) e exagero leve do relevo, para os morros lerem de longe
const COMPRIMENTO = 10, RELEVO = 1.35;

// As texturas WebP vêm dentro do .glb. O GLTFLoader as abriria por um endereço blob:, que a CSP do site bloqueia; este
// plugin ocupa o lugar do leitor de WebP padrão e decodifica a imagem direto da memória, sem endereço nenhum.
class WebpDaMemoria {
  constructor(parser) { this.parser = parser; this.name = 'EXT_texture_webp'; }
  loadTexture(i) {
    const json = this.parser.json, ext = (json.textures[i].extensions || {}).EXT_texture_webp;
    if (!ext || typeof createImageBitmap !== 'function') return null;
    const img = json.images[ext.source];
    return this.parser.getDependency('bufferView', img.bufferView)
      .then((buf) => createImageBitmap(new Blob([buf], { type: img.mimeType || 'image/webp' }), { premultiplyAlpha: 'none' }))
      .then((bmp) => { const t = new THREE.Texture(bmp); t.flipY = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; return t; });
  }
}

function inicia() {
  const bairros = [...ilha.querySelectorAll('.il-lista li')];
  const n = bairros.length;
  let render;
  try {
    render = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  if (!render.getContext()) return;
  render.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  render.outputColorSpace = THREE.SRGBColorSpace;
  render.toneMapping = THREE.ACESFilmicToneMapping;
  render.toneMappingExposure = 1.1;
  render.setClearColor(0x000000, 0);

  const cena = new THREE.Scene();
  cena.fog = new THREE.Fog(0x0b0f0e, 14, 40);
  const cam = new THREE.PerspectiveCamera(40, 1.6, .1, 120);

  // fim de tarde: sol quente e baixo de um lado, céu frio do outro
  cena.add(new THREE.HemisphereLight(0xdfe9f0, 0x0b0f0e, .9));
  const sol = new THREE.DirectionalLight(0xffd9ad, 2.4); sol.position.set(-9, 7, 5); cena.add(sol);
  const fria = new THREE.DirectionalLight(0x9fb7b0, .45); fria.position.set(7, 3, -6); cena.add(fria);

  // mar escuro que continua o mar da fotografia até sumir na névoa
  const mar = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: 0x0a171b }));
  mar.rotation.x = -Math.PI / 2; mar.position.y = -.02; cena.add(mar);

  // ilha real: só a superfície (o bloco com a textura do fundo do mar fica escondido); a água da foto escurece e se
  // desfaz nas bordas, para a ilha nascer do mar escuro em vez de parecer um recorte retangular
  const raizIlha = new THREE.Group(); cena.add(raizIlha);
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register((p) => new WebpDaMemoria(p)).load('modelo/ilha.glb?v=1', (g) => {
    const obj = g.scene;
    let terreno = null, maior = 0;
    obj.traverse((o) => { if (o.isMesh && o.geometry.attributes.position.count > maior) { maior = o.geometry.attributes.position.count; terreno = o; } });
    obj.traverse((o) => { if (o.isMesh && o !== terreno) o.visible = false; });
    if (!terreno) return;
    if (!terreno.geometry.attributes.normal) terreno.geometry.computeVertexNormals();
    const mapa = terreno.material.map;
    if (mapa) { mapa.colorSpace = THREE.SRGBColorSpace; mapa.anisotropy = Math.min(8, render.capabilities.getMaxAnisotropy()); }
    const mat = new THREE.MeshStandardMaterial({ map: mapa, color: 0xf2ece4, roughness: .92, metalness: 0, transparent: true });
    mat.onBeforeCompile = (s) => {
      s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec2 q = (vMapUv - vec2(.585, .475)) / vec2(.30, .43);
          float r = length(q);
          float agua = smoothstep(.0, .06, diffuseColor.b - max(diffuseColor.r, diffuseColor.g * .92));
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.22, .34, .38), agua * .85);
          diffuseColor.a *= 1. - smoothstep(.5, .98, r);
        }`);
    };
    terreno.material = mat;
    obj.updateMatrixWorld(true);
    const caixa = new THREE.Box3().setFromObject(terreno), tam = caixa.getSize(new THREE.Vector3()), meio = caixa.getCenter(new THREE.Vector3());
    const esc = COMPRIMENTO / Math.max(tam.x, tam.z);
    obj.scale.multiplyScalar(esc);
    obj.position.set(-meio.x * esc, -caixa.min.y * esc, -meio.z * esc);
    raizIlha.scale.y = RELEVO;
    // lado comprido na diagonal: a ilha aparece inteira de três quartos logo no começo
    raizIlha.rotation.y = tam.x > tam.z ? -.55 : Math.PI / 2 - .55;
    raizIlha.add(obj);
    if (!ativo) render.render(cena, cam);
  });

  const carrega = new THREE.TextureLoader();
  const moldura = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: .32, metalness: .05 });
  const fundoQ = new THREE.MeshStandardMaterial({ color: 0x1a1f1d, roughness: .6 });
  const W = 3.2, H = 2;

  function quadro(textura) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(W, H, .1), moldura));
    const fundo = new THREE.Mesh(new THREE.PlaneGeometry(W - .16, H - .16), fundoQ); fundo.position.z = .051; g.add(fundo);
    const foto = new THREE.Mesh(new THREE.PlaneGeometry(W - .2, H - .2), new THREE.MeshBasicMaterial({ map: textura, toneMapped: false, transparent: true, opacity: 0, fog: false }));
    foto.position.z = .056; g.add(foto);
    g.userData.foto = foto.material;
    return g;
  }
  const quadros = bairros.map((li) => {
    const q = quadro(null);
    const tex = carrega.load(li.dataset.img, () => { q.userData.foto.opacity = 1; });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, render.capabilities.getMaxAnisotropy());
    q.userData.foto.map = tex;
    q.visible = false;
    cena.add(q);
    return q;
  });

  // poeira de luz e respingos sobre o mar, só em volta da ilha (longe do caminho da câmera, para nenhum ponto virar um quadrado na tela)
  const qtd = 600, pp = new Float32Array(qtd * 3);
  for (let k = 0; k < qtd; k++) { const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 6.5; pp[k * 3] = Math.cos(a) * r; pp[k * 3 + 1] = .3 + Math.random() * 3.5; pp[k * 3 + 2] = Math.sin(a) * r; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const poeira = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xd7c5a9, size: .04, transparent: true, opacity: .5, depthWrite: false }));
  cena.add(poeira);

  // caminho da câmera: uma volta em torno da ilha; no meio da rolagem ela chega mais perto e mais baixo
  let largo = true;
  const centro = new THREE.Vector3(0, .5, 0);
  function camEm(t, pos, alvo) {
    const u = n > 1 ? t / (n - 1) : 0, perto = Math.sin(Math.PI * u);
    const ang = .35 + u * Math.PI * 1.45;
    const raio = (largo ? 15 : 19) - (largo ? 5.5 : 4.5) * perto;
    const alt = (largo ? 6.2 : 8) - (largo ? 3.2 : 2.4) * perto;
    pos.set(Math.sin(ang) * raio, alt, Math.cos(ang) * raio);
    // no computador a mira vai um pouco para a direita: a ilha fica à esquerda do centro e o quadro do bairro à direita
    const desvio = largo ? Math.hypot(raio, alt) * .15 : 0;
    // no celular a mira sobe: a ilha desce para a metade de baixo e o quadro fica no meio, abaixo do título
    alvo.set(centro.x + Math.cos(ang) * desvio, centro.y + (largo ? 0 : 1.6), centro.z - Math.sin(ang) * desvio);
  }
  // quadro de cada bairro: preso ao enquadramento que a câmera terá quando for a vez dele
  const enche = () => (largo ? .3 : .74);
  const base = quadros.map(() => ({ pos: new THREE.Vector3(), quat: new THREE.Quaternion(), dir: new THREE.Vector3(), esc: 1 }));
  const aux = new THREE.PerspectiveCamera(), pc = new THREE.Vector3(), ac = new THREE.Vector3(), fr = new THREE.Vector3(), di = new THREE.Vector3(), ci = new THREE.Vector3();
  function colocaQuadros() {
    const tg = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    base.forEach((b, i) => {
      camEm(i, pc, ac);
      aux.position.copy(pc); aux.up.set(0, 1, 0); aux.lookAt(ac);
      fr.set(0, 0, -1).applyQuaternion(aux.quaternion); di.set(1, 0, 0).applyQuaternion(aux.quaternion); ci.set(0, 1, 0).applyQuaternion(aux.quaternion);
      const d = pc.distanceTo(ac) * (largo ? .5 : .42);
      const visH = 2 * d * tg, visW = visH * cam.aspect;
      b.esc = (enche() * visW) / W;
      b.pos.copy(pc).addScaledVector(fr, d).addScaledVector(di, largo ? visW * .27 : 0).addScaledVector(ci, largo ? visH * .04 : -visH * .01);
      b.dir.copy(di);
      // um pouco virado para dentro, para ler como objeto no espaço e não como adesivo na tela
      b.quat.copy(aux.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), largo ? -.2 : -.1));
    });
  }

  // câmera: segue o caminho com atraso suave; o mouse dá um leve paralaxe
  let alvoT = 0, t = 0, mx = 0, my = 0, ativo = false, tempo = 0, ultimo = performance.now();
  const posCam = new THREE.Vector3(), mira = new THREE.Vector3(), lado = new THREE.Vector3(), eix = new THREE.Vector3(0, 1, 0);
  const giroQ = new THREE.Quaternion(), sobe = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

  function tamanho() {
    const w = tela.clientWidth, h = tela.clientHeight; if (!w || !h) return;
    render.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    largo = cam.aspect > 1;
    colocaQuadros();
  }
  function progresso() { const r = ilha.getBoundingClientRect(), curso = ilha.offsetHeight - innerHeight; return curso > 0 ? Math.max(0, Math.min(1, -r.top / curso)) : 0; }

  function quadroFrame(agora) {
    const dt = Math.min(.05, (agora - ultimo) / 1000); ultimo = agora;
    const parado = document.body.classList.contains('parado') || calmo.matches;
    if (!parado) tempo += dt;
    alvoT = progresso() * (n - 1);
    t = calmo.matches ? alvoT : t + (alvoT - t) * Math.min(1, dt * 4.2);

    camEm(t, posCam, mira);
    lado.set(1, 0, 0).applyAxisAngle(eix, Math.atan2(posCam.x, posCam.z));
    posCam.addScaledVector(lado, mx * .9); posCam.y += -my * .5;
    cam.position.copy(posCam);
    cam.lookAt(mira);
    const dist = posCam.distanceTo(mira);
    cena.fog.near = dist * .9; cena.fog.far = dist + 26;

    quadros.forEach((q, i) => {
      const b = base[i];
      const chega = calmo.matches ? (t > i - .5 ? 1 : 0) : sobe(i - 1.6, i - .25, t); // sobe do mar e cresce
      const sai = calmo.matches ? (t > i + .5 ? 1 : 0) : sobe(i, i + .75, t); // gira e sai de lado, como uma porta abrindo
      q.visible = chega > .001 && sai < .999;
      if (!q.visible) return;
      const flut = parado ? 0 : Math.sin(tempo * .7 + i * 1.7) * .06;
      q.position.copy(b.pos).addScaledVector(b.dir, sai * b.esc * W * 1.6);
      q.position.y += -(1 - chega) * 3 * b.esc + sai * .8 + flut;
      q.quaternion.copy(b.quat).multiply(giroQ.setFromAxisAngle(eix, -sai * 1.1 + (parado ? 0 : Math.sin(tempo * .5 + i) * .03)));
      q.scale.setScalar(b.esc * (.55 + .45 * chega));
    });
    if (!parado) poeira.rotation.y = tempo * .012;

    render.render(cena, cam);
    if (ativo) requestAnimationFrame(quadroFrame);
  }
  function liga(sim) { if (sim === ativo) return; ativo = sim; if (sim) { ultimo = performance.now(); requestAnimationFrame(quadroFrame); } }

  addEventListener('resize', tamanho);
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
  tela.addEventListener('webglcontextlost', (e) => { e.preventDefault(); liga(false); document.body.classList.remove('tem-3d'); });
  new IntersectionObserver((es) => liga(es[0].isIntersecting), { rootMargin: '200px 0px' }).observe(ilha);
  tamanho();
  t = alvoT = progresso() * (n - 1);
  document.body.classList.add('tem-3d');
  render.render(cena, cam);
}

if (tela) { try { inicia(); } catch (e) { document.body.classList.remove('tem-3d'); } }
