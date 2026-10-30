// Aguiar & Monteiro · estátua da Justiça estilizada em three.js (geometria própria), metal iridescente verde e roxo com brilho,
// fixa atrás da página: a câmera acompanha a rolagem e a estátua vira lilás e menta nas seções claras.
import * as THREE from '../assets/three/three.module.js';
import { EffectComposer } from '../assets/three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../assets/three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../assets/three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../assets/three/addons/postprocessing/OutputPass.js';

const raiz = document.documentElement;
const tela = document.getElementById('palco');
const veu = document.querySelector('.veu');
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

function semTresD() { raiz.classList.add('sem-3d'); }

try { iniciar(); } catch (e) { semTresD(); }

function iniciar() {
  const renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) { semTresD(); return; }
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x000000, 1);
  tela.addEventListener('webglcontextlost', (e) => { e.preventDefault(); semTresD(); });

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);

  // ambientes de reflexo: escuro (faixas neon verde, roxa e azul) e claro (menta e lilás sobre branco)
  const pmrem = new THREE.PMREMGenerator(renderer);
  function ambiente(fundo, faixas) {
    const s = new THREE.Scene();
    s.background = new THREE.Color().setRGB(fundo[0], fundo[1], fundo[2]);
    for (const f of faixas) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(f.w, f.h), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(f.c[0], f.c[1], f.c[2]), side: THREE.DoubleSide }));
      m.position.set(f.p[0], f.p[1], f.p[2]); m.lookAt(0, 5, 0); s.add(m);
    }
    const rt = pmrem.fromScene(s, 0.03);
    s.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    return rt.texture;
  }
  const envEscuro = ambiente([0, 0, 0], [
    { w: 3, h: 26, p: [-13, 6, 3], c: [0.12, 2.4, 0.45] },
    { w: 1.6, h: 22, p: [-6, 8, -12], c: [0.1, 2.2, 0.4] },
    { w: 3, h: 24, p: [13, 5, 1], c: [1.0, 0.22, 2.4] },
    { w: 12, h: 4, p: [0, 22, 2], c: [0.12, 0.08, 1.0] },
    { w: 2, h: 14, p: [9, 4, 12], c: [0.2, 1.4, 0.5] },
  ]);
  const envClaro = ambiente([0.95, 0.95, 0.98], [
    { w: 14, h: 30, p: [-13, 6, 4], c: [0.45, 1.25, 0.85] },
    { w: 14, h: 30, p: [13, 6, 2], c: [0.95, 0.68, 1.3] },
    { w: 20, h: 8, p: [0, 22, 0], c: [1.3, 1.3, 1.35] },
    { w: 10, h: 20, p: [0, 4, 14], c: [0.85, 0.95, 1.05] },
  ]);
  pmrem.dispose();
  cena.environment = envEscuro;

  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xf2f0ff, metalness: 1, roughness: 0.2, clearcoat: 0.7, clearcoatRoughness: 0.12,
    iridescence: 0.4, iridescenceIOR: 1.6, iridescenceThicknessRange: [180, 620], envMapIntensity: 1,
  });

  const estatua = new THREE.Group();
  cena.add(estatua);
  const peca = (g, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); estatua.add(m); return m; };

  // perfil do corpo: barra da túnica até o pescoço
  const perfil = new THREE.SplineCurve([
    [0.01, 0.06], [1.5, 0.0], [1.62, 0.12], [1.5, 0.6], [1.36, 1.5], [1.22, 2.5], [1.1, 3.4], [1.02, 4.2], [0.98, 4.8],
    [0.86, 5.5], [0.72, 6.0], [0.78, 6.4], [0.9, 6.75], [0.84, 7.05], [0.66, 7.32], [0.36, 7.56], [0.21, 7.72], [0.2, 8.05], [0.01, 8.12],
  ].map((p) => new THREE.Vector2(p[0], p[1]))).getPoints(150);
  const raioEm = (y) => { let melhor = perfil[0]; for (const p of perfil) if (Math.abs(p.y - y) < Math.abs(melhor.y - y) && p.x > 0.05) melhor = p; return melhor.x; };
  const fundura = (y) => 1 - 0.22 * THREE.MathUtils.smoothstep(y, 3.4, 5.2);

  const corpo = new THREE.LatheGeometry(perfil, 160);
  corpo.rotateY(Math.PI); // costura para trás
  {
    const pos = corpo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const r = Math.hypot(x, z);
      if (r > 0.06) {
        const a = Math.atan2(x, z);
        const amp = y < 5.7 ? 0.1 * Math.pow(1 - y / 5.7, 0.75) + 0.012 : 0.008;
        const dobra = amp * (0.72 * Math.sin(a * 7 + y * 0.35) + 0.28 * Math.sin(a * 13 - y * 0.6) + 0.18 * Math.sin(a * 23 + y * 1.3));
        const k = (r + dobra) / r;
        x *= k; z *= k;
      }
      z *= fundura(y);
      x *= 1 + 0.32 * THREE.MathUtils.smoothstep(y, 6.5, 7.15) * (1 - THREE.MathUtils.smoothstep(y, 7.3, 7.62)); // ombros
      x += 0.06 * Math.sin(y * 0.55); // leve contraposto
      pos.setXYZ(i, x, y, z);
    }
    corpo.computeVertexNormals();
  }
  peca(corpo);

  const esfera = (r, ws = 40, hs = 28) => new THREE.SphereGeometry(r, ws, hs);
  // busto, ombros, cinto
  peca(esfera(0.24), 0.27, 6.72, 0.5, 1, 0.85, 0.7);
  peca(esfera(0.24), -0.21, 6.72, 0.5, 1, 0.85, 0.7);
  const cinto = new THREE.TorusGeometry(0.74, 0.05, 14, 90); cinto.rotateX(Math.PI / 2);
  peca(cinto, 0.06 * Math.sin(6.02 * 0.55), 6.02, 0, 1, 1, fundura(6.02));

  // cabeça, cabelo, coque e venda
  peca(esfera(0.36, 48, 36), 0.05, 8.48, 0.06, 0.88, 1.12, 0.98);
  peca(esfera(0.17, 32, 24), 0.05, 8.24, 0.17, 1, 0.9, 1);
  peca(esfera(0.39, 48, 36), 0.05, 8.62, -0.1, 0.94, 0.98, 0.88);
  peca(esfera(0.19), 0.05, 8.72, -0.46);
  const venda = new THREE.TorusGeometry(0.335, 0.045, 14, 80); venda.rotateX(Math.PI / 2);
  peca(venda, 0.05, 8.54, 0.06, 0.92, 1, 1.06);
  peca(esfera(0.07), 0.05, 8.54, -0.3);

  function tubo(pts, r0, r1, seg = 48, rad = 14) {
    const curva = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    const g = new THREE.TubeGeometry(curva, seg, 1, rad, false);
    const pos = g.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
    for (let i = 0; i <= seg; i++) {
      curva.getPointAt(i / seg, c);
      const r = r0 + (r1 - r0) * (i / seg);
      for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c); pos.setXYZ(k, v.x, v.y, v.z); }
    }
    g.computeVertexNormals();
    return g;
  }
  // pontas da venda caindo nas costas
  peca(tubo([[0.05, 8.52, -0.3], [0.12, 8.2, -0.45], [0.16, 7.8, -0.5]], 0.04, 0.025, 20, 8));
  peca(tubo([[0.05, 8.52, -0.3], [-0.04, 8.15, -0.47], [-0.06, 7.75, -0.52]], 0.04, 0.025, 20, 8));

  // faixa do manto atravessando o peito
  const faixa = [[60, 7.25], [30, 6.85], [0, 6.35], [-30, 5.75], [-55, 5.15], [-80, 4.55], [-100, 3.9]].map(([g, y]) => {
    const a = THREE.MathUtils.degToRad(g), r = raioEm(y) + 0.07;
    return [r * Math.sin(a) + 0.06 * Math.sin(y * 0.55), y, r * Math.cos(a) * fundura(y)];
  });
  peca(tubo(faixa, 0.1, 0.07, 64, 14));

  // braço erguido (balança) e braço baixo (espada)
  peca(tubo([[0.82, 7.3, 0], [1.4, 7.95, 0.12], [1.72, 8.85, 0.15], [1.8, 9.75, 0.12]], 0.17, 0.11));
  peca(esfera(0.18), 0.86, 7.28, 0, 1, 1, 0.9);
  peca(esfera(0.14), 1.8, 9.86, 0.12, 1, 1.3, 1);
  peca(tubo([[-0.82, 7.3, 0], [-1.15, 6.6, 0.15], [-1.22, 5.95, 0.5], [-1.12, 5.4, 0.82]], 0.17, 0.11));
  peca(esfera(0.18), -0.8, 7.28, 0, 1, 1, 0.9);
  peca(esfera(0.14), -1.12, 5.3, 0.85, 1, 1.25, 1);

  // espada
  {
    const lamina = new THREE.Shape();
    lamina.moveTo(-0.085, 0); lamina.lineTo(0.085, 0); lamina.lineTo(0.07, -3.55); lamina.lineTo(0, -3.95); lamina.lineTo(-0.07, -3.55); lamina.closePath();
    const g = new THREE.ExtrudeGeometry(lamina, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, steps: 1 });
    g.translate(0, 0, -0.0125);
    const m = peca(g, -1.12, 4.96, 0.88); m.rotation.z = 0.035; m.rotation.y = 0.5;
    peca(new THREE.CylinderGeometry(0.045, 0.05, 0.5, 16), -1.12, 5.25, 0.86);
    peca(esfera(0.08), -1.12, 5.55, 0.86);
    const guarda = tubo([[-0.38, 0.06, 0], [-0.18, -0.02, 0], [0, 0, 0], [0.18, -0.02, 0], [0.38, 0.06, 0]], 0.04, 0.04, 30, 10);
    const gm = peca(guarda, -1.12, 4.98, 0.86); gm.rotation.y = 0.5;
  }

  // pedestal
  peca(new THREE.CylinderGeometry(1.95, 2.05, 0.36, 96), 0, -0.18, 0);
  peca(new THREE.CylinderGeometry(2.35, 2.4, 0.3, 96), 0, -0.5, 0);

  // balança
  const balanca = new THREE.Group(); balanca.position.set(1.8, 9.78, 0.12); estatua.add(balanca);
  const daBalanca = (g, x = 0, y = 0, z = 0, pai = balanca) => { const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); pai.add(m); return m; };
  function barra(a, b, r, pai) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), 8, 1, true), mat);
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    pai.add(m); return m;
  }
  barra([0, -0.1, 0], [0, 1.4, 0], 0.035, balanca);
  daBalanca(esfera(0.075), 0, 1.47, 0);
  daBalanca(new THREE.ConeGeometry(0.05, 0.22, 16), 0, 1.62, 0);
  const anel = new THREE.TorusGeometry(0.11, 0.025, 10, 40); daBalanca(anel, 0, 1.22, 0);
  const travessa = new THREE.Group(); travessa.position.set(0, 1.22, 0); balanca.add(travessa);
  const MEIA = 1.25;
  daBalanca(tubo([[-MEIA, -0.02, 0], [-0.62, 0.07, 0], [0, 0.1, 0], [0.62, 0.07, 0], [MEIA, -0.02, 0]], 0.045, 0.045, 60, 12), 0, 0, 0, travessa);
  for (const s of [-1, 1]) {
    const pts = [];
    for (let k = 0; k <= 26; k++) { const a = (k / 26) * Math.PI * 2.3, rr = 0.13 * (1 - a / (Math.PI * 3)); pts.push([s * MEIA + s * rr * Math.sin(a), -0.02 - 0.13 + rr * Math.cos(a) + 0.0, 0]); }
    pts[0] = [s * MEIA, -0.02, 0];
    daBalanca(tubo(pts, 0.03, 0.014, 60, 8), 0, 0, 0, travessa);
  }
  const prato = new THREE.LatheGeometry([[0.01, -0.13], [0.22, -0.12], [0.38, -0.06], [0.47, 0.02], [0.49, 0.05]].map((p) => new THREE.Vector2(p[0], p[1])), 64);
  const pratos = [-1, 1].map((s) => {
    const g = new THREE.Group(); balanca.add(g);
    for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 + 0.4; barra([0, 0, 0], [Math.cos(a) * 0.46, -1.52, Math.sin(a) * 0.46], 0.009, g); }
    daBalanca(prato, 0, -1.56, 0, g);
    return { g, s };
  });

  // poeira de luz em volta
  const N = innerWidth < 820 ? 700 : 1500;
  const pg = new THREE.BufferGeometry(), pp = new Float32Array(N * 3), pc = new Float32Array(N * 3);
  const verde = new THREE.Color(0.2, 1, 0.45), roxo = new THREE.Color(0.55, 0.25, 1), tmp = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 2.2 + Math.pow(Math.random(), 0.7) * 7;
    pp[i * 3] = Math.cos(a) * r; pp[i * 3 + 1] = -1 + Math.random() * 13.5; pp[i * 3 + 2] = Math.sin(a) * r - 1.5;
    tmp.copy(verde).lerp(roxo, Math.random()); pc[i * 3] = tmp.r; pc[i * 3 + 1] = tmp.g; pc[i * 3 + 2] = tmp.b;
  }
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
  const pm = new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending });
  const poeira = new THREE.Points(pg, pm); cena.add(poeira);

  // brilho roxo atrás
  const brilhoMat = new THREE.ShaderMaterial({
    uniforms: { op: { value: 1 }, c1: { value: new THREE.Color(0.08, 0.035, 0.5) }, c2: { value: new THREE.Color(0.1, 0.0, 0.22) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec2 vUv; uniform vec3 c1; uniform vec3 c2; uniform float op; void main(){ float d = distance(vUv, vec2(0.5)); float a = smoothstep(0.5, 0.0, d); vec3 c = mix(c2, c1, a); gl_FragColor = vec4(c * a * a * a * op, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const brilho = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), brilhoMat); brilho.position.set(-2.5, 8.5, -8); cena.add(brilho);

  // pós-processamento
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(cena, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.5, 0.72);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // quadros-chave por seção: câmera, alvo, giro da estátua, brilho roxo e véu sobre a cena
  const K = {
    inicio: { cam: [-3.4, 6.3, 17], alvo: [-3.4, 6.0, 0], giro: 0.25, brilho: 1, veu: 0 },
    areasA: { cam: [-1.4, 8.8, 6.2], alvo: [0.6, 8.9, 0], giro: 0.45, brilho: 0.25, veu: 0 },
    areasB: { cam: [0.4, 10.2, 5.6], alvo: [2.0, 10.0, 0], giro: 0.15, brilho: 0.2, veu: 0 },
    areasC: { cam: [-1.4, 3.9, 6.8], alvo: [-0.2, 3.7, 0], giro: -0.5, brilho: 0.12, veu: 0 },
    visao: { cam: [-3.8, 6.3, 16], alvo: [-3.8, 5.9, 0], giro: -0.35, brilho: 0, veu: 0 },
    calc: { cam: [-7.5, 6, 19], alvo: [-7.5, 5.6, 0], giro: 0.2, brilho: 0, veu: 0.84 },
    perguntas: { cam: [-7, 6.2, 18], alvo: [-7, 5.9, 0], giro: 0.45, brilho: 0, veu: 0.72 },
    trabalho: { cam: [-1.7, 6.9, 8.8], alvo: [0.9, 6.5, 0], giro: 0.3, brilho: 0, veu: 0 },
    equipe: { cam: [-2.6, 5.9, 13], alvo: [-3.2, 5.5, 0], giro: -0.45, brilho: 0.9, veu: 0 },
    carreira: { cam: [-5.5, 5.2, 16], alvo: [-5.5, 5.6, 0], giro: 0.6, brilho: 1, veu: 0.35 },
    contato: { cam: [-3.1, 6.2, 14], alvo: [-3.7, 6.1, 0], giro: 0.1, brilho: 0, veu: 0 },
    sobre: { cam: [-3.6, 6.1, 16.5], alvo: [-3.6, 6.0, 0], giro: -0.2, brilho: 1, veu: 0 },
  };
  let celular = false, ancoras = [];
  function chave(nome) {
    const k = K[nome], o = { cam: k.cam.slice(), alvo: k.alvo.slice(), giro: k.giro, brilho: k.brilho, veu: k.veu };
    const asp = innerWidth / innerHeight;
    if (celular) {
      const longe = k.cam[2] > 10;
      o.cam[0] = o.alvo[0] = longe ? -1.25 : k.alvo[0] - 0.6;
      o.cam[2] *= longe ? 1.05 : 1.2;
      o.veu = Math.max(k.veu, 0.5);
    } else if (asp < 1.6) {
      const f = Math.max(0.6, asp / 1.6); o.cam[0] *= f; o.alvo[0] *= f;
    }
    return o;
  }
  function montaAncoras() {
    ancoras = [];
    for (const s of document.querySelectorAll('.sec')) {
      const topo = s.getBoundingClientRect().top + scrollY, alt = s.offsetHeight, vh = innerHeight;
      if (s.id === 'areas') {
        const fim = Math.max(topo + 1, topo + alt - vh);
        ancoras.push({ y: topo, k: chave('areasA'), suave: false }, { y: (topo + fim) / 2, k: chave('areasB'), suave: false }, { y: fim, k: chave('areasC'), suave: true });
      } else if (K[s.id]) ancoras.push({ y: topo, k: chave(s.id), suave: true });
    }
    ancoras.sort((a, b) => a.y - b.y);
  }
  const mistura = (a, b, t) => ({
    cam: a.cam.map((v, i) => v + (b.cam[i] - v) * t), alvo: a.alvo.map((v, i) => v + (b.alvo[i] - v) * t),
    giro: a.giro + (b.giro - a.giro) * t, brilho: a.brilho + (b.brilho - a.brilho) * t, veu: a.veu + (b.veu - a.veu) * t,
  });
  function alvoDaRolagem() {
    const y = calmo ? (ancoras.find((a, i) => !ancoras[i + 1] || ancoras[i + 1].y > scrollY + innerHeight * 0.5) || ancoras[0]).y : scrollY;
    if (!ancoras.length) return chave('inicio');
    if (y <= ancoras[0].y) return ancoras[0].k;
    for (let i = 0; i < ancoras.length - 1; i++) {
      const a = ancoras[i], b = ancoras[i + 1];
      if (y < b.y) {
        let t = (y - a.y) / Math.max(1, b.y - a.y);
        t = a.suave ? THREE.MathUtils.smoothstep(t, 0.3, 1) : THREE.MathUtils.smoothstep(t, 0, 1);
        return mistura(a.k, b.k, t);
      }
    }
    return ancoras[ancoras.length - 1].k;
  }

  function tamanho() {
    const w = innerWidth, h = innerHeight;
    celular = w < 820;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, celular ? 1.5 : 1.6));
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h; camera.fov = celular ? 42 : 35; camera.updateProjectionMatrix();
    montaAncoras();
  }
  addEventListener('resize', tamanho);
  addEventListener('load', montaAncoras);
  new ResizeObserver(montaAncoras).observe(document.body);
  tamanho();

  // estado suavizado
  let atual = alvoDaRolagem(), luz = document.body.dataset.tema === 'claro' ? 1 : 0, claroAplicado = null;
  const ponteiro = { x: 0, y: 0, sx: 0, sy: 0 };
  if (!calmo) addEventListener('pointermove', (e) => { ponteiro.x = e.clientX / innerWidth - 0.5; ponteiro.y = e.clientY / innerHeight - 0.5; }, { passive: true });
  const preto = new THREE.Color(0x000000), branco = new THREE.Color(0xffffff), fundo = new THREE.Color();
  const alvoV = new THREE.Vector3();
  let antes = performance.now(), t = 0;

  function quadro(agora) {
    const dt = Math.min(0.25, (agora - antes) / 1000); antes = agora; t += dt;
    const alvo = alvoDaRolagem();
    const k = calmo ? 1 : 1 - Math.exp(-dt * 3.2);
    atual = mistura(atual, alvo, k);
    const luzAlvo = document.body.dataset.tema === 'claro' ? 1 : 0;
    luz += (luzAlvo - luz) * (calmo ? 1 : 1 - Math.exp(-dt * 5));

    const claro = luz > 0.5;
    if (claro !== claroAplicado) {
      claroAplicado = claro;
      cena.environment = claro ? envClaro : envEscuro;
      pm.blending = claro ? THREE.NormalBlending : THREE.AdditiveBlending; pm.needsUpdate = true;
    }
    mat.metalness = 1 - 0.82 * luz; mat.roughness = 0.2 + 0.16 * luz; mat.iridescence = 0.4 + 0.6 * luz;
    pm.opacity = claro ? 0.35 : 0.75;
    fundo.copy(preto).lerp(branco, luz); renderer.setClearColor(fundo, 1);
    bloom.strength = 0.6 * (1 - luz);
    brilhoMat.uniforms.op.value = atual.brilho * (1 - luz);
    if (veu) veu.style.opacity = atual.veu.toFixed(3);

    ponteiro.sx += (ponteiro.x - ponteiro.sx) * 0.05; ponteiro.sy += (ponteiro.y - ponteiro.sy) * 0.05;
    camera.position.set(atual.cam[0] + ponteiro.sx * 0.6, atual.cam[1] - ponteiro.sy * 0.4, atual.cam[2]);
    alvoV.set(atual.alvo[0], atual.alvo[1], atual.alvo[2]); camera.lookAt(alvoV);
    estatua.rotation.y = atual.giro + (calmo ? 0 : Math.sin(t * 0.25) * 0.06);

    const bal = calmo ? 0 : Math.sin(t * 0.7) * 0.045;
    travessa.rotation.z = bal;
    for (const p of pratos) {
      const c = Math.cos(bal), s = Math.sin(bal), x = p.s * MEIA, y = -0.02;
      p.g.position.set(x * c - y * s, 1.22 + x * s + y * c, 0);
      p.g.rotation.z = calmo ? 0 : Math.sin(t * 0.9 + p.s) * 0.02;
    }
    if (!calmo) { poeira.rotation.y = t * 0.02; poeira.position.y = Math.sin(t * 0.3) * 0.15; }

    composer.render();
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);
  raiz.classList.add('com-3d');
}
