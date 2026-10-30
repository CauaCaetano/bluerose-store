// Bastos Lacerda · duas cenas 3D feitas em código (three.js local):
//  1) abertura: escultura de duna em tecido bege, fita torcida de terrazzo com pontas de madeira e uma esfera de vidro que desliza;
//  2) faixa: três esferas (madeira, terrazzo e vidro) numa rampa curva com luz lateral.
// Só desenha quando a cena está na tela; com prefers-reduced-motion desenha um quadro parado; se o WebGL falhar fica o fundo em CSS.
import * as THREE from '../assets/three/three.module.js';

const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- texturas desenhadas em canvas ---------- */
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function texTerrazzo() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), r = rnd(7);
  g.fillStyle = '#efe9e0'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1400; i++) {
    const t = r(); g.fillStyle = t < .55 ? '#6f665d' : t < .8 ? '#a89c8e' : t < .93 ? '#3a3632' : '#c9a57a';
    g.globalAlpha = .55 + r() * .45; const x = r() * 512, y = r() * 512, s = .6 + r() * (t < .9 ? 2.2 : 4);
    g.beginPath(); g.ellipse(x, y, s, s * (.6 + r() * .5), r() * 3, 0, 7); g.fill();
  }
  g.globalAlpha = 1; const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx;
}
function texMadeira() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 1024; const g = c.getContext('2d'), r = rnd(11);
  const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, '#8a5a32'); gr.addColorStop(.5, '#a8743f'); gr.addColorStop(1, '#7d5029');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 1024);
  for (let i = 0; i < 160; i++) {
    let x = r() * 256; g.strokeStyle = r() < .5 ? 'rgba(70,40,18,.45)' : 'rgba(200,150,95,.28)'; g.lineWidth = .6 + r() * 2.4; g.beginPath(); g.moveTo(x, 0);
    for (let y = 0; y <= 1024; y += 32) { x += (r() - .5) * 3 + Math.sin(y / 140 + i) * .8; g.lineTo(x, y); } g.stroke();
  }
  const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx;
}
function ambiente(renderer) {
  // estúdio claro para os reflexos do vidro: cúpula em degradê e duas janelas de luz
  const s = new THREE.Scene();
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec3 p; void main(){ float h = normalize(p).y * .5 + .5; gl_FragColor = vec4(mix(vec3(.62,.55,.47), vec3(1.,.97,.92), h), 1.); }' }));
  s.add(cupula);
  const luz = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const j1 = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), luz); j1.position.set(-9, 6, 6); j1.lookAt(0, 0, 0); s.add(j1);
  const j2 = new THREE.Mesh(new THREE.PlaneGeometry(4, 8), luz); j2.position.set(8, 4, -6); j2.lookAt(0, 0, 0); s.add(j2);
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromScene(s, .02).texture; pm.dispose(); return env;
}
function criarRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6)); r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; return r;
}
function vidro(env) {
  return new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .04, transmission: 1, thickness: 1.1, ior: 1.45, envMap: env, envMapIntensity: 1.2, clearcoat: 1, clearcoatRoughness: .05, attenuationColor: new THREE.Color('#efe2cf'), attenuationDistance: 3 });
}
// liga/desliga o laço de desenho conforme a cena aparece
function animar(canvas, passo, aoRedimensionar) {
  let vivo = false, id = 0, t0 = performance.now();
  const laco = (t) => { passo((t - t0) / 1000); if (vivo) id = requestAnimationFrame(laco); };
  const tam = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (w && h) aoRedimensionar(w, h); };
  tam(); addEventListener('resize', tam);
  if (calmo) { passo(2.5); return; }
  new IntersectionObserver((es) => { const v = es[0].isIntersecting; if (v && !vivo) { vivo = true; id = requestAnimationFrame(laco); } else if (!v) { vivo = false; cancelAnimationFrame(id); } }).observe(canvas);
}

/* ---------- 1) abertura ---------- */
function cenaAbertura(canvas) {
  const R = criarRenderer(canvas), env = ambiente(R), S = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, .1, 100); cam.position.set(0, .4, 14);
  const terr = texTerrazzo(), mad = texMadeira();
  const matTerr = new THREE.MeshStandardMaterial({ map: terr, roughness: .78, envMap: env, envMapIntensity: .55, side: THREE.DoubleSide });
  const matMad = new THREE.MeshStandardMaterial({ map: mad, roughness: .55, envMap: env, envMapIntensity: .5 });
  const matDuna = new THREE.MeshStandardMaterial({ color: 0xe6d6c0, roughness: .92, envMap: env, envMapIntensity: .45, side: THREE.DoubleSide });

  S.add(new THREE.HemisphereLight(0xfff6ea, 0xb59a7a, 1.1));
  const sol = new THREE.DirectionalLight(0xfff1de, 2.6); sol.position.set(-6, 9, 7); sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048); sol.shadow.radius = 6; sol.shadow.bias = -.0004; Object.assign(sol.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
  S.add(sol);

  const grupo = new THREE.Group(); S.add(grupo);
  // parede de fundo que recebe a sombra suave
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ color: 0xefe6da, roughness: 1 }));
  fundo.position.z = -3.2; fundo.receiveShadow = true; S.add(fundo);

  // duna: tecido que sobe em diagonal, com ondas que respiram
  const dg = new THREE.PlaneGeometry(16, 5, 150, 40), base = dg.attributes.position.array.slice();
  const duna = new THREE.Mesh(dg, matDuna); duna.castShadow = duna.receiveShadow = true;
  duna.rotation.set(-1.05, 0, .42); duna.position.set(1.6, -3.1, .2); grupo.add(duna);
  function ondular(t) {
    const p = dg.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const x = base[i], y = base[i + 1];
      p[i + 2] = Math.sin(x * .62 + t * .35) * .85 + Math.sin(x * 1.3 - y * .7 + t * .22) * .22 + (y + 2.5) * (y + 2.5) * .09;
    }
    dg.attributes.position.needsUpdate = true; dg.computeVertexNormals();
  }

  // fita de terrazzo torcida, saindo da duna
  const curva = new THREE.CatmullRomCurve3([[-2.6, -3.2, .6], [-1.6, -1.9, .2], [-.3, -2.2, 1], [1, -1.2, .4], [2, .1, .9], [2.6, 1.6, .3], [3.5, 2.6, .8], [4.2, 3.6, .5]].map((v) => new THREE.Vector3(...v)), false, 'catmullrom', .5);
  const forma = new THREE.Shape(); const L = .5, E = .09;
  forma.moveTo(-E, -L); forma.lineTo(E, -L); forma.quadraticCurveTo(E * 1.6, 0, E, L); forma.lineTo(-E, L); forma.quadraticCurveTo(-E * 1.6, 0, -E, -L);
  const fg = new THREE.ExtrudeGeometry(forma, { steps: 260, bevelEnabled: false, extrudePath: curva });
  terr.repeat.set(3, 3);
  const fita = new THREE.Mesh(fg, matTerr); fita.castShadow = fita.receiveShadow = true; grupo.add(fita);
  // pontas de madeira e uma "semente" de madeira solta
  const tampa = (u, esc) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), matMad); m.scale.set(.52 * esc, .62 * esc, .2 * esc);
    const p = curva.getPointAt(u), tg = curva.getTangentAt(u); m.position.copy(p); m.lookAt(p.clone().add(tg)); m.castShadow = true; grupo.add(m); return m;
  };
  tampa(.999, 1.05); tampa(.004, .95);
  const semente = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), matMad); semente.scale.set(.7, 1.05, .38); semente.position.set(-1.9, -2.15, 1.5); semente.rotation.set(.3, .6, .55); semente.castShadow = true; grupo.add(semente);
  const pedra = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), matTerr); pedra.scale.set(.55, .8, .32); pedra.position.set(-.9, -2.35, 1.75); pedra.rotation.set(.2, -.5, -.35); pedra.castShadow = true; grupo.add(pedra);

  // esfera de vidro que desliza sobre a fita
  const bola = new THREE.Mesh(new THREE.SphereGeometry(.42, 64, 48), vidro(env)); bola.castShadow = true; grupo.add(bola);
  const nrm = new THREE.Vector3();

  let alvoX = 0, alvoY = 0, mx = 0, my = 0;
  addEventListener('pointermove', (e) => { alvoX = e.clientX / innerWidth - .5; alvoY = e.clientY / innerHeight - .5; }, { passive: true });

  function passo(t) {
    ondular(t);
    const u = .28 + (Math.sin(t * .18) * .5 + .5) * .5, p = curva.getPointAt(u);
    const q = Math.floor(u * 260); nrm.set(0, 1, 0);
    bola.position.set(p.x - .05, p.y + .52, p.z + .35); bola.rotation.z = -t * .9;
    grupo.rotation.y = Math.sin(t * .12) * .05;
    mx += (alvoX - mx) * .04; my += (alvoY - my) * .04;
    cam.position.x = mx * 1.1; cam.position.y = .4 - my * .6; cam.lookAt(grupo.position.x * .25, grupo.position.y * .25, 0);
    R.render(S, cam);
    if (!canvas.parentNode.classList.contains('pronta')) canvas.parentNode.classList.add('pronta');
  }
  animar(canvas, passo, (w, h) => {
    R.setSize(w, h, false); cam.aspect = w / h;
    const vh = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.position.z, vw = vh * cam.aspect;
    if (cam.aspect > 1.05) { grupo.scale.setScalar(Math.min(.95, vw / 15)); grupo.position.set(vw * .2, -vh * .1, 0); }
    else { const e = Math.min(1, vw / 6); grupo.scale.setScalar(e); grupo.position.set(-vw * .06, -vh * .24, 0); }
    cam.updateProjectionMatrix();
  });
}

/* ---------- 2) faixa: três esferas na rampa ---------- */
function cenaFaixa(canvas) {
  const R = criarRenderer(canvas), env = ambiente(R), S = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 100); cam.position.set(0, 2.2, 12); cam.lookAt(0, 0, 0);
  const terr = texTerrazzo(), mad = texMadeira(); mad.repeat.set(1, .6);
  S.add(new THREE.HemisphereLight(0xfff4e6, 0x8f7d66, .9));
  const sol = new THREE.DirectionalLight(0xfff0dc, 3.2); sol.position.set(7, 5, 4); sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048); sol.shadow.radius = 5; sol.shadow.bias = -.0005; Object.assign(sol.shadow.camera, { left: -10, right: 10, top: 8, bottom: -8, near: 1, far: 30 });
  S.add(sol);
  const grupo = new THREE.Group(); S.add(grupo);
  const matPiso = new THREE.MeshStandardMaterial({ color: 0xd9ccb8, roughness: .95, side: THREE.DoubleSide });
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), matPiso); piso.rotation.x = -Math.PI / 2; piso.position.y = -1; piso.receiveShadow = true; grupo.add(piso);
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), matPiso); fundo.position.z = -6; grupo.add(fundo);
  // concha curva (piso que sobe em parede) só do lado direito, como um estúdio
  const perfil = new THREE.Shape();
  perfil.moveTo(-1.5, -1); perfil.lineTo(1.2, -1); perfil.quadraticCurveTo(3.6, -1, 3.6, 1.4); perfil.lineTo(3.6, 8); perfil.lineTo(3.75, 8); perfil.lineTo(3.75, 1.4); perfil.quadraticCurveTo(3.75, -1.08, 1.2, -1.08); perfil.lineTo(-1.5, -1.08); perfil.closePath();
  const concha = new THREE.Mesh(new THREE.ExtrudeGeometry(perfil, { depth: 12, bevelEnabled: false, curveSegments: 40 }), new THREE.MeshStandardMaterial({ color: 0xe6dbc9, roughness: .9 }));
  concha.rotation.y = Math.PI / 2; concha.position.set(1.4, 0, 0); concha.receiveShadow = true; grupo.add(concha);
  const bolas = [
    new THREE.Mesh(new THREE.SphereGeometry(.8, 64, 48), new THREE.MeshStandardMaterial({ map: mad, roughness: .5, envMap: env, envMapIntensity: .5 })),
    new THREE.Mesh(new THREE.SphereGeometry(.72, 64, 48), new THREE.MeshStandardMaterial({ map: terr, roughness: .8, envMap: env, envMapIntensity: .5 })),
    new THREE.Mesh(new THREE.SphereGeometry(.66, 64, 48), vidro(env))
  ];
  const pos = [[2.8, -.2, 1.4], [4.7, -.28, .3], [6.6, -.34, -.8]];
  bolas.forEach((b, i) => { b.castShadow = true; b.receiveShadow = i < 2; grupo.add(b); });
  function passo(t) {
    bolas.forEach((b, i) => { const [x, y, z] = pos[i]; const d = Math.sin(t * .35 + i * .9) * .25; b.position.set(x + d, y, z); b.rotation.z = -(x + d) / .75; b.rotation.x = t * .05 * (i + 1); });
    cam.position.x = Math.sin(t * .1) * .25; cam.lookAt(0, 0, 0);
    R.render(S, cam);
  }
  animar(canvas, passo, (w, h) => {
    R.setSize(w, h, false); cam.aspect = w / h;
    const vh = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * 12.2, vw = vh * cam.aspect;
    if (cam.aspect > 1.4) { grupo.position.set(vw * .5 - 8.8, 0, 0); grupo.scale.setScalar(1); }
    else { grupo.position.set(-3.3, -.6, 0); grupo.scale.setScalar(.8); }
    cam.updateProjectionMatrix();
  });
}

function seguro(id, fn) {
  const c = document.getElementById(id); if (!c) return;
  try { fn(c); } catch (e) { c.style.display = 'none'; }
}
seguro('cena-abre', cenaAbertura);
seguro('cena-faixa', cenaFaixa);
