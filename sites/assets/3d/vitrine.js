// Vitrine 3D dos sites de exemplo (28/10/2026): UM objeto real escaneado (fotogrametria da Poly Haven ou modelo
// fotorrealista da Khronos, ver modelos/CREDITOS.txt), girando como em foto de produto: luz de estúdio HDRI,
// sombra macia no chão, arrastar para girar (com inércia), giro lento quando ninguém mexe.
// Uso: const v = await vitrine(contêiner, { arquivo: 'BarberShopChair_01/BarberShopChair_01_1k.gltf', medida: 2 });
//      so: 'nome' deixa só as malhas com esse nome (o arquivo da mala traz duas malas)
//      v.variantes → nomes das versões de cor do modelo (se houver); v.variante(i) troca.
import { palco, THREE, calmo, aproxima, luz, encaixar } from './palco.js';
import { GLTFLoader } from './GLTFLoader.js';

const BASE = new URL('./modelos/', import.meta.url).href;

export function vitrine(caixa, { arquivo, so = '', medida = 2, hdri = 'studio_small_09', forca = 1, altura = 0.45, distancia = 3.2, giro = 0.6, inclinacao = 0.18, auto = true } = {}) {
  const tela = document.createElement('canvas'); tela.className = 'vitrine-tela';
  tela.setAttribute('role', 'img'); tela.setAttribute('aria-label', caixa.dataset.rotulo || 'Objeto em 3D; arraste para girar');
  caixa.appendChild(tela); caixa.classList.add('vitrine');
  let dist = distancia, distAlvo = distancia, ang = giro, angAlvo = giro, vel = 0, arrastando = false, ultX = 0, parado = 0, inc = inclinacao, incAlvo = inclinacao;
  const p = palco(tela, { fov: 30, pos: [0, 1, 4], quadro });
  if (!p) return Promise.resolve({ variantes: [], variante() {} });
  luz(p, hdri, { forca });
  // chão invisível que só recebe a sombra, para o objeto "pousar" na página
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.22 }));
  chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true; p.cena.add(chao);
  const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(2.5, 6, 3); sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048); sol.shadow.radius = 6; sol.shadow.bias = -0.0004;
  Object.assign(sol.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 }); p.cena.add(sol);

  tela.addEventListener('pointerdown', (e) => { arrastando = true; ultX = e.clientX; vel = 0; tela.setPointerCapture(e.pointerId); caixa.classList.add('mexeu'); });
  tela.addEventListener('pointermove', (e) => { if (!arrastando) return; const d = (e.clientX - ultX) * 0.008; ultX = e.clientX; angAlvo += d; vel = d; p.redesenhar(); });
  const soltar = () => { arrastando = false; parado = 0; };
  tela.addEventListener('pointerup', soltar); tela.addEventListener('pointercancel', soltar);
  tela.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') angAlvo -= 0.3; if (e.key === 'ArrowRight') angAlvo += 0.3; p.redesenhar(); });
  tela.tabIndex = 0;

  function quadro(t, dt) {
    if (!arrastando) {
      angAlvo += vel; vel *= Math.pow(0.04, dt); // inércia depois de soltar
      parado += dt; if (auto && !calmo && parado > 2.5) angAlvo += dt * 0.22; // giro lento de vitrine
    }
    ang = aproxima(ang, angAlvo, dt, 10); inc = aproxima(inc, incAlvo, dt, 4); dist = aproxima(dist, distAlvo, dt, 4);
    const r = dist;
    p.camera.position.set(Math.sin(ang) * r * Math.cos(inc), altura * medida + Math.sin(inc) * r, Math.cos(ang) * r * Math.cos(inc));
    p.camera.lookAt(0, altura * medida, 0);
  }

  return new Promise((ok) => new GLTFLoader().load(BASE + arquivo, (g) => {
    if (so) { const fora = []; g.scene.traverse((o) => { if (o.isMesh && !o.name.includes(so)) fora.push(o); }); fora.forEach((o) => o.removeFromParent()); } // so: fica só a peça com esse nome
    g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const obj = encaixar(g.scene, medida); p.cena.add(obj);
    const r = medida * 1.6; Object.assign(sol.shadow.camera, { left: -r, right: r, top: r, bottom: -r }); sol.shadow.camera.updateProjectionMatrix();
    // versões de cor (KHR_materials_variants): cada malha diz qual material usar em cada versão
    const ext = g.parser.json.extensions && g.parser.json.extensions.KHR_materials_variants;
    const variantes = ext ? ext.variants.map((v) => v.name) : [];
    const malhas = []; g.scene.traverse((o) => { const m = o.userData.gltfExtensions && o.userData.gltfExtensions.KHR_materials_variants; if (o.isMesh && m) malhas.push([o, m.mappings, o.material]); });
    const variante = async (i) => {
      await Promise.all(malhas.map(async ([o, maps, original]) => {
        const map = maps.find((x) => x.variants.includes(i));
        o.material = map ? await g.parser.getDependency('material', map.material) : original;
      }));
      p.redesenhar();
    };
    caixa.classList.add('pronta'); p.redesenhar();
    ok({ variantes, variante, obj, p, olhar(a) { angAlvo = a; parado = -4; p.redesenhar(); },
      // a rolagem da página conduz a câmera: ângulo, distância e inclinação
      camera(a, d, i) { angAlvo = a; if (d) distAlvo = d; if (i != null) incAlvo = i; parado = -4; p.redesenhar(); } });
  }, undefined, () => { caixa.classList.add('sem-3d'); ok({ variantes: [], variante() {} }); }));
}
