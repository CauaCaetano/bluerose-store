// Ana Ribeiro · "Uma nova perspectiva": os bairros da Ilha em quadros de moldura clara flutuando no escuro, com fitas de
// vidro e poeira de luz. A rolagem leva a câmera de um quadro ao outro (o contador e as legendas ficam em site.js).
// Sem WebGL, ou com erro, fica o quadro simples em CSS (.il-plano).
import * as THREE from '../assets/three/three.module.js';

const ilha = document.getElementById('ilha');
const tela = ilha && ilha.querySelector('.il-tela');
const calmo = window.matchMedia('(prefers-reduced-motion: reduce)');

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
  render.toneMappingExposure = 1.05;
  render.setClearColor(0x000000, 0);

  const cena = new THREE.Scene();
  cena.fog = new THREE.Fog(0x0b0f0e, 8, 30);
  const cam = new THREE.PerspectiveCamera(40, 1.6, .1, 80);

  cena.add(new THREE.AmbientLight(0xf3ece2, .6));
  const sol = new THREE.DirectionalLight(0xffe7c8, 1.5); sol.position.set(6, 7, 6); cena.add(sol);
  const fria = new THREE.DirectionalLight(0x9fb7b0, .5); fria.position.set(-6, -2, 3); cena.add(fria);
  const perto = new THREE.PointLight(0xd7c5a9, 14, 14, 2); cena.add(perto);

  // caminho dos quadros: alternando de lado, descendo em profundidade
  const lugar = (i) => new THREE.Vector3(Math.sin(i * 1.25) * 2.4, Math.cos(i * .9) * .7, -i * 7.5);
  const giro = (i) => -Math.sin(i * 1.25) * .32;

  const carrega = new THREE.TextureLoader();
  const moldura = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: .32, metalness: .05 });
  const fundoQ = new THREE.MeshStandardMaterial({ color: 0x1a1f1d, roughness: .6 });
  const pilar = new THREE.MeshStandardMaterial({ color: 0xdcd5c8, roughness: .35, metalness: .1 });
  const W = 3.2, H = 2;
  const quadros = [], pilares = [];

  function quadro(textura, escala) {
    const g = new THREE.Group();
    const borda = new THREE.Mesh(new THREE.BoxGeometry(W, H, .12), moldura); g.add(borda);
    const fundo = new THREE.Mesh(new THREE.PlaneGeometry(W - .16, H - .16), fundoQ); fundo.position.z = .061; g.add(fundo);
    const foto = new THREE.Mesh(new THREE.PlaneGeometry(W - .2, H - .2), new THREE.MeshBasicMaterial({ map: textura, toneMapped: false, transparent: true, opacity: 0 }));
    foto.position.z = .066; g.add(foto);
    g.scale.setScalar(escala);
    g.userData.foto = foto.material;
    return g;
  }

  bairros.forEach((li, i) => {
    const tex = carrega.load(li.dataset.img, (t) => { t.needsUpdate = true; quadros[i].forEach((q) => { q.userData.foto.opacity = 1; }); });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, render.capabilities.getMaxAnisotropy());
    const grande = quadro(tex, 1);
    grande.position.copy(lugar(i)); grande.rotation.y = giro(i); grande.rotation.z = Math.sin(i * 2.1) * .015;
    cena.add(grande);
    // fragmento menor do mesmo bairro, flutuando ao fundo, como os recortes da referência
    const lado = i % 2 ? -1 : 1;
    const peq = quadro(tex, .42);
    peq.position.copy(lugar(i)).add(new THREE.Vector3(lado * 3.5, 1.7 - (i % 3) * .55, -2.8));
    peq.rotation.y = -lado * .5; peq.rotation.x = .05;
    cena.add(peq);
    quadros.push([grande, peq]);
    // pilares claros ao lado de alguns quadros
    if (i % 2 === 0) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(.14, 3.6, .14), pilar);
      p.position.copy(lugar(i)).add(new THREE.Vector3(-lado * 2.05, 1.5, -.6)); cena.add(p); pilares.push(p);
    }
  });

  // fitas de vidro torcidas atravessando o espaço
  const vidro = new THREE.MeshPhysicalMaterial({ color: 0xcfdcd8, metalness: .3, roughness: .06, clearcoat: 1, clearcoatRoughness: .1, transparent: true, opacity: .2, side: THREE.DoubleSide, depthWrite: false });
  const brilho = new THREE.LineBasicMaterial({ color: 0xf1e3cc, transparent: true, opacity: .35 });
  function fita(pontos, largura, voltas) {
    const curva = new THREE.CatmullRomCurve3(pontos), N = 220, pos = [], idx = [], b1 = [], b2 = [];
    const cima = new THREE.Vector3(0, 1, 0);
    for (let j = 0; j <= N; j++) {
      const u = j / N, p = curva.getPoint(u), t = curva.getTangent(u);
      const nrm = new THREE.Vector3().crossVectors(t, cima).normalize().applyAxisAngle(t, u * voltas * Math.PI * 2);
      const a = p.clone().addScaledVector(nrm, largura / 2), b = p.clone().addScaledVector(nrm, -largura / 2);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z); b1.push(a); b2.push(b);
      if (j < N) { const k = j * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const grupo = new THREE.Group();
    grupo.add(new THREE.Mesh(geo, vidro));
    grupo.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(b1), brilho));
    grupo.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(b2), brilho));
    return grupo;
  }
  const fim = -(n - 1) * 7.5;
  const fitas = [
    fita([new THREE.Vector3(5, 3, 4), new THREE.Vector3(3.6, 1, -8), new THREE.Vector3(6, -1, -20), new THREE.Vector3(4, 2.5, -34), new THREE.Vector3(5.5, 0, fim - 8)], 1.1, 3),
    fita([new THREE.Vector3(-5.5, -2, 2), new THREE.Vector3(-4, 2.6, -12), new THREE.Vector3(-6.5, .5, -26), new THREE.Vector3(-4.2, -1.8, -40), new THREE.Vector3(-6, 2, fim - 8)], .8, 2.5),
    fita([new THREE.Vector3(-2, 4.2, -3), new THREE.Vector3(2, 3.6, -18), new THREE.Vector3(-1.5, 4.4, -33), new THREE.Vector3(1.5, 3.8, fim - 6)], .55, 4)
  ];
  fitas.forEach((f) => cena.add(f));

  // chão escuro com brilho e poeira de luz
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(60, 120), new THREE.MeshStandardMaterial({ color: 0x0b0e0d, roughness: .28, metalness: .7 }));
  chao.rotation.x = -Math.PI / 2; chao.position.set(0, -2.8, fim / 2); cena.add(chao);
  const qtd = 700, pp = new Float32Array(qtd * 3);
  for (let k = 0; k < qtd; k++) { pp[k * 3] = (Math.random() - .5) * 18; pp[k * 3 + 1] = (Math.random() - .5) * 9; pp[k * 3 + 2] = 6 - Math.random() * (-fim + 16); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const poeira = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xd7c5a9, size: .035, transparent: true, opacity: .55, depthWrite: false }));
  cena.add(poeira);

  // câmera: segue o caminho com atraso suave; o mouse dá um leve paralaxe
  let alvoT = 0, t = 0, mx = 0, my = 0, ativo = false, tempo = 0, ultimo = performance.now();
  const mira = new THREE.Vector3(), posCam = new THREE.Vector3(), tmp = new THREE.Vector3();
  const lerpV = (i) => { const a = Math.floor(i), b = Math.min(n - 1, a + 1), k = i - a, s = k * k * (3 - 2 * k); return lugar(a).lerp(lugar(b), s); };
  const lerpG = (i) => { const a = Math.floor(i), b = Math.min(n - 1, a + 1), k = i - a, s = k * k * (3 - 2 * k); return giro(a) * (1 - s) + giro(b) * s; };

  function tamanho() {
    const w = tela.clientWidth, h = tela.clientHeight; if (!w || !h) return;
    render.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  function progresso() { const r = ilha.getBoundingClientRect(), curso = ilha.offsetHeight - innerHeight; return curso > 0 ? Math.max(0, Math.min(1, -r.top / curso)) : 0; }

  function quadroFrame(agora) {
    const dt = Math.min(.05, (agora - ultimo) / 1000); ultimo = agora;
    const parado = document.body.classList.contains('parado') || calmo.matches;
    if (!parado) tempo += dt;
    alvoT = progresso() * (n - 1);
    t = calmo.matches ? alvoT : t + (alvoT - t) * Math.min(1, dt * 4.2);

    const largo = cam.aspect > 1;
    const enche = largo ? .6 : .9;
    const dist = W / (enche * 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect);
    const g = lerpG(t);
    mira.copy(lerpV(t));
    // no primeiro quadro, no computador, a moldura fica à direita para o título caber à esquerda
    const desloca = largo ? -1.05 * Math.max(0, 1 - t / .45) : 0;
    tmp.set(Math.sin(g) * dist, .18, Math.cos(g) * dist);
    posCam.copy(mira).add(tmp);
    posCam.x += desloca + mx * .35; posCam.y += -my * .2 + (largo ? .05 : .28);
    cam.position.copy(posCam);
    cam.lookAt(mira.x + desloca, mira.y + (largo ? -.05 : .3), mira.z);
    perto.position.set(posCam.x + 1, posCam.y + 1.5, posCam.z - 1.5);
    cena.fog.near = dist + 1.5; cena.fog.far = dist + 24;

    quadros.forEach(([gq, pq], i) => {
      // quando a câmera passa, o quadro gira e sai de lado, como uma porta abrindo
      const k = Math.max(0, Math.min(1, (t - i) / .6)), s = k * k * (3 - 2 * k);
      const lado = Math.sign(lugar(i).x - lugar(Math.min(n - 1, i + 1)).x) || 1;
      const base = lugar(i);
      gq.position.x = base.x + lado * s * (largo ? 6 : 9);
      gq.rotation.y = giro(i) + lado * s * .95 + Math.sin(tempo * .5 + i) * .025;
      gq.position.y = base.y + s * .8 + Math.sin(tempo * .7 + i * 1.7) * .05;
      pq.position.y += Math.sin(tempo * .6 + i) * .0009;
    });
    pilares.forEach((p) => { p.visible = largo; });
    fitas.forEach((f, k) => { f.rotation.z = Math.sin(tempo * .15 + k) * .03; });
    poeira.rotation.y = tempo * .01;

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
