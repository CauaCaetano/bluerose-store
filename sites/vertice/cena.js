// Vértice · cenas 3D (three.js local):
// 1) abertura: a orla desenhada em linhas douradas, torres art déco que sobem do chão, reflexo na água, poeira de luz e brilho (bloom);
// 2) interiores: dois discos de mármore torneados com um anel de ouro em órbita, girando devagar conforme a rolagem.
// Sem WebGL: a abertura vira só o degradê com a marca e os interiores mostram os discos desenhados em CSS.
import * as THREE from '../assets/three/three.module.js';
import { EffectComposer } from '../assets/three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../assets/three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../assets/three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../assets/three/addons/postprocessing/OutputPass.js';

const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
const temGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
if (!temGL) document.querySelector('.interiores')?.classList.add('sem-3d');

// número pseudoaleatório estável (a cena é sempre a mesma)
let semente = 7;
const rnd = () => { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; };

/* ───────────── 1 · abertura ───────────── */
function abertura() {
  const intro = document.querySelector('.intro');
  if (!intro || intro.hidden || document.documentElement.dataset.intro === 'fim' || !temGL) return;
  const tela = intro.querySelector('.intro-cena');
  let ren;
  try { ren = new THREE.WebGLRenderer({ canvas: tela, antialias: true, powerPreference: 'high-performance' }); } catch (e) { return; }
  ren.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const cena = new THREE.Scene();
  cena.fog = new THREE.FogExp2(0x0c0b28, 0.026); cena.background = new THREE.Color(0x0c0b28);
  const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 300);

  const ouro = new THREE.LineBasicMaterial({ color: 0xffa04a, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  const ouroFraco = new THREE.LineBasicMaterial({ color: 0xc8742e, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false });
  const reflexo = new THREE.LineBasicMaterial({ color: 0xff9d47, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false });

  // uma torre: blocos empilhados com recuos (art déco), arestas + andares desenhados nas faces da frente
  function torre(larg, prof, alt, recuos, agulha) {
    const pts = [];
    const caixa = (x0, x1, y0, y1, z0, z1, andar) => {
      const v = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]];
      for (let k = 0; k < 4; k++) {
        const a = v[k], b = v[(k + 1) % 4];
        pts.push(a[0], y0, a[2], b[0], y0, b[2], a[0], y1, a[2], b[0], y1, b[2], a[0], y0, a[2], a[0], y1, a[2]);
      }
      for (let y = y0 + andar; y < y1 - 0.01; y += andar) pts.push(x0, y, z1, x1, y, z1, x1, y, z0, x1, y, z1);
      const col = Math.max(2, Math.round((x1 - x0) / 1.4));
      for (let i = 1; i < col; i++) { const x = x0 + (x1 - x0) * i / col; pts.push(x, y0, z1, x, y1, z1); }
      // losangos art déco na face da frente
      if (x1 - x0 > 2.4 && y1 - y0 > 6) for (let y = y0 + 1; y < y1 - 2; y += 3.2) {
        const xm = (x0 + x1) / 2, w = (x1 - x0) / 2;
        pts.push(x0, y, z1, xm, y + 1.6, z1, xm, y + 1.6, z1, x1, y, z1, x0, y + 3.2, z1, xm, y + 1.6, z1, xm, y + 1.6, z1, x1, y + 3.2, z1);
        if (w < 0) break;
      }
    };
    let y = 0, w = larg, d = prof;
    const fatias = recuos + 1;
    for (let i = 0; i < fatias; i++) {
      const h = (alt * (i === 0 ? 0.62 : 0.38 / recuos));
      caixa(-w / 2, w / 2, y, y + h, -d / 2, d / 2, 1.5);
      y += h; w *= 0.78; d *= 0.78;
    }
    if (agulha) { pts.push(-w / 2, y, 0, 0, y + agulha, 0, w / 2, y, 0, 0, y + agulha, 0, 0, y, -d / 2, 0, y + agulha, 0, 0, y, d / 2, 0, y + agulha, 0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }

  const cidade = new THREE.Group(), torres = [];
  const poe = (g, x, z, mat, atraso) => {
    const l = new THREE.LineSegments(g, mat); l.position.set(x, 0, z); l.scale.y = 0.001;
    const r = new THREE.LineSegments(g, reflexo); r.position.set(x, 0, z); r.scale.y = -0.001;
    cidade.add(l, r); torres.push({ l, r, atraso });
  };
  // o Vértice ao centro, mais alto, com agulha
  poe(torre(4.4, 4.4, 26, 3, 5), 0, -4, ouro, 0.25);
  const lugares = [[-7, -2, 3.6, 15], [6.8, -1, 3.4, 14], [-13, -9, 3.8, 19], [12.5, -10, 3.4, 21], [-3.5, -14, 3, 12], [4, 6, 2.6, 8], [-5, 7, 2.8, 9.5], [18, -4, 3, 13], [-19, -3, 3.2, 12], [-25, -16, 4, 17], [25, -17, 3.6, 18], [0, -24, 4, 20], [-11, 4, 2.4, 7], [10, 5, 2.6, 7.5], [31, -9, 3, 11], [-32, -8, 3, 10]];
  lugares.forEach(([x, z, w, h], i) => poe(torre(w, w * (0.8 + rnd() * 0.4), h, 1 + (i % 3), i % 4 === 0 ? 1.6 : 0), x, z, z < -12 || Math.abs(x) > 20 ? ouroFraco : ouro, 0.35 + i * 0.06));
  // fundo: linhas verticais de luz ao longe
  const fundo = [];
  for (let i = 0; i < 70; i++) { const x = -60 + rnd() * 120, z = -40 - rnd() * 30, h = 4 + rnd() * 26; fundo.push(x, 0, z, x, h, z); }
  const gf = new THREE.BufferGeometry(); gf.setAttribute('position', new THREE.Float32BufferAttribute(fundo, 3));
  cidade.add(new THREE.LineSegments(gf, ouroFraco));
  // a orla: linha da areia em curva e a água
  const orla = []; for (let i = 0; i <= 80; i++) { const t = i / 80, x = -60 + t * 120; orla.push(x, 0.02, 9 + Math.sin(t * Math.PI * 2) * 1.6); }
  const go = new THREE.BufferGeometry(); go.setAttribute('position', new THREE.Float32BufferAttribute(orla, 3));
  cidade.add(new THREE.Line(go, ouroFraco));
  cena.add(cidade);
  // poeira de luz
  const np = 900, pp = new Float32Array(np * 3);
  for (let i = 0; i < np; i++) { pp[i * 3] = -50 + rnd() * 100; pp[i * 3 + 1] = rnd() * 40; pp[i * 3 + 2] = -45 + rnd() * 60; }
  const gp = new THREE.BufferGeometry(); gp.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const po = new THREE.Points(gp, new THREE.PointsMaterial({ color: 0xffc27a, size: 0.09, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  cena.add(po);

  const comp = new EffectComposer(ren);
  comp.addPass(new RenderPass(cena, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.62, 0.4, 0.12);
  comp.addPass(bloom); comp.addPass(new OutputPass());

  function tamanho() {
    const w = innerWidth, h = innerHeight; ren.setSize(w, h, false); comp.setSize(w, h); cam.aspect = w / h;
    cam.fov = w < 700 ? 62 : 42; cam.updateProjectionMatrix();
  }
  tamanho(); addEventListener('resize', tamanho);

  const t0 = performance.now(); let vivo = true;
  const suave = (x) => x * x * (3 - 2 * x);
  function quadro(agora) {
    if (!vivo) return;
    const t = (agora - t0) / 1000;
    torres.forEach(({ l, r, atraso }) => { const k = suave(Math.min(1, Math.max(0, (t - atraso) / 1.4))); l.scale.y = Math.max(0.001, k); r.scale.y = -Math.max(0.001, k); });
    const c = suave(Math.min(1, t / 4.2));
    cam.position.set(Math.sin(t * 0.25) * 2.5, 3 + c * 7, 46 - c * 16);
    cam.lookAt(0, 9 + c * 3, -6);
    po.rotation.y = t * 0.02;
    comp.render();
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);
  const fim = () => { setTimeout(() => { vivo = false; removeEventListener('resize', tamanho); comp.dispose?.(); ren.dispose(); ren.forceContextLoss?.(); }, 1000); };
  document.addEventListener('vt-intro-fim', fim, { once: true });
  if (document.documentElement.dataset.intro === 'fim') fim();
}

/* ───────────── 2 · objeto de mármore nos interiores ───────────── */
function marmore(base, veio, n) {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '120,110,105'},${0.025 + rnd() * 0.04})`; x.beginPath(); x.arc(rnd() * 1024, rnd() * 1024, 4 + rnd() * 26, 0, 7); x.fill(); }
  x.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    let px = rnd() * 1024, py = rnd() * 1024; const ang = -0.5 + rnd() * 0.5;
    x.strokeStyle = veio; x.globalAlpha = 0.18 + rnd() * 0.45; x.lineWidth = 0.6 + rnd() * 2.6; x.filter = `blur(${rnd() < 0.4 ? 1.5 : 0.3}px)`;
    x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 14; k++) { px += Math.cos(ang) * 70 + (rnd() - 0.5) * 60; py += Math.sin(ang) * 70 + (rnd() - 0.5) * 60; x.lineTo(px, py); }
    x.stroke();
  }
  x.globalAlpha = 1; x.filter = 'none';
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
function disco(raio, alt, bisel) {
  const p = [new THREE.Vector2(0, -alt / 2)];
  for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * (Math.PI / 2); p.push(new THREE.Vector2(raio - bisel + Math.cos(a) * bisel, -alt / 2 + bisel + Math.sin(a) * bisel)); }
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * (Math.PI / 2); p.push(new THREE.Vector2(raio - bisel + Math.cos(a) * bisel, alt / 2 - bisel + Math.sin(a) * bisel)); }
  p.push(new THREE.Vector2(0, alt / 2));
  const g = new THREE.LatheGeometry(p, 128);
  // projeta o mármore de cima (planar), para os veios atravessarem o tampo
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (raio * 2) + 0.5 + pos.getY(i) * 0.15, pos.getZ(i) / (raio * 2) + 0.5);
  return g;
}
function interiores() {
  const tela = document.querySelector('.in-cena');
  if (!tela || !temGL) return;
  let iniciado = false;
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && !iniciado) { iniciado = true; io.disconnect(); monta(); } }, { rootMargin: '200px' });
  io.observe(tela);
  function monta() {
    let ren;
    try { ren = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true }); } catch (e) { document.querySelector('.interiores').classList.add('sem-3d'); return; }
    ren.setPixelRatio(Math.min(devicePixelRatio, 2)); ren.toneMapping = THREE.ACESFilmicToneMapping; ren.toneMappingExposure = 1.05;
    const cena = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    cam.position.set(0, 2.2, 7.4); cam.lookAt(0, 0, 0);
    // ambiente para os reflexos: degradê quente de estúdio
    const ce = document.createElement('canvas'); ce.width = 512; ce.height = 256; const x = ce.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#f6e9dc'); gr.addColorStop(0.55, '#8a7766'); gr.addColorStop(1, '#2b2420');
    x.fillStyle = gr; x.fillRect(0, 0, 512, 256); x.fillStyle = '#fff'; x.fillRect(80, 40, 90, 30); x.fillRect(330, 52, 120, 22);
    const te = new THREE.CanvasTexture(ce); te.mapping = THREE.EquirectangularReflectionMapping; te.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(ren); cena.environment = pm.fromEquirectangular(te).texture; te.dispose();
    cena.add(new THREE.HemisphereLight(0xfff4ea, 0x9a8a7c, 0.6));
    const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(3, 6, 4); cena.add(sol);

    const grupo = new THREE.Group(); grupo.rotation.set(0.38, 0, -0.2); cena.add(grupo);
    const branco = new THREE.MeshPhysicalMaterial({ map: marmore('#efebe6', '#7d7570', 26), roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.2 });
    const cinza = new THREE.MeshPhysicalMaterial({ map: marmore('#8e8780', '#efe7df', 22), roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.25 });
    const d1 = new THREE.Mesh(disco(1.25, 0.34, 0.09), cinza); d1.position.set(0.18, 0.24, -0.1); d1.rotation.z = 0.06;
    const d2 = new THREE.Mesh(disco(1.3, 0.3, 0.1), branco); d2.position.set(-0.12, -0.18, 0.12); d2.rotation.z = -0.1;
    grupo.add(d1, d2);
    const anel = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.016, 12, 220), new THREE.MeshStandardMaterial({ color: 0xc9925a, metalness: 1, roughness: 0.22 }));
    const eixo = new THREE.Group(); eixo.rotation.set(1.15, 0.25, 0.35); eixo.add(anel); cena.add(eixo);
    // sombra suave no chão creme
    const cs = document.createElement('canvas'); cs.width = cs.height = 128; const xs = cs.getContext('2d');
    const rg = xs.createRadialGradient(64, 64, 4, 64, 64, 62); rg.addColorStop(0, 'rgba(70,45,30,.42)'); rg.addColorStop(1, 'rgba(70,45,30,0)'); xs.fillStyle = rg; xs.fillRect(0, 0, 128, 128);
    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cs), transparent: true, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2; sombra.position.y = -1.35; cena.add(sombra);

    function tamanho() { const r = tela.getBoundingClientRect(); ren.setSize(r.width, r.height, false); cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix(); }
    tamanho(); addEventListener('resize', tamanho);
    const sec = document.querySelector('.interiores'); let visivel = true, rodando = true;
    new IntersectionObserver((es) => { visivel = es[0].isIntersecting; if (visivel && !calmo && !rodando) { rodando = true; requestAnimationFrame(quadro); } }).observe(sec);
    const t0 = performance.now();
    function quadro(agora) {
      const t = calmo ? 1.2 : (agora - t0) / 1000;
      const r = sec.getBoundingClientRect(), k = Math.min(1, Math.max(0, 1 - r.top / innerHeight));
      grupo.rotation.y = t * 0.25 + k * 1.2; grupo.position.y = Math.sin(t * 0.9) * 0.06;
      d1.rotation.y = t * 0.12; anel.rotation.z = t * 0.5; eixo.rotation.x = 1.15 + Math.sin(t * 0.4) * 0.12 - k * 0.2;
      ren.render(cena, cam);
      if (visivel && !calmo) requestAnimationFrame(quadro); else rodando = false;
    }
    requestAnimationFrame(quadro);
  }
}

abertura();
interiores();
