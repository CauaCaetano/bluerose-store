// Atria · ferramentas de bancada: plano de corte de chapas, lista de materiais por modelo e conversões.
// Funções puras (sem tela), testadas em tools/atria_teste.py pela demonstração.

// ------------------------------------------------------------------ plano de corte (MaxRects, melhor encaixe pelo lado curto)
// chapa {l, a} em mm; pecas [{nome, l, a, q}]; serra = espessura do disco (mm); gira = pode girar a peça (sem veio)
export function planoDeCorte(chapa, pecas, { serra = 3, gira = true, refilo = 10 } = {}) {
  const W = chapa.l - refilo * 2, H = chapa.a - refilo * 2;
  const lista = [];
  pecas.forEach((p, i) => { for (let k = 0; k < (p.q || 1); k++) lista.push({ nome: p.nome || `Peça ${i + 1}`, l: +p.l, a: +p.a, cor: i }); });
  const grandes = lista.filter((p) => !((p.l <= W && p.a <= H) || (gira && p.a <= W && p.l <= H)));
  const cabem = lista.filter((p) => !grandes.includes(p)).sort((x, y) => Math.max(y.l, y.a) - Math.max(x.l, x.a) || y.l * y.a - x.l * x.a);
  const chapas = [];
  const nova = () => { const c = { livres: [{ x: 0, y: 0, l: W, a: H }], pecas: [] }; chapas.push(c); return c; };
  for (const p of cabem) {
    let melhor = null;
    for (const c of chapas) {
      const r = encaixe(c, p, serra, gira);
      if (r && (!melhor || r.nota < melhor.r.nota)) melhor = { c, r };
    }
    if (!melhor) { const c = nova(); const r = encaixe(c, p, serra, gira); melhor = { c, r }; }
    const { c, r } = melhor;
    const colocada = { ...p, x: r.x, y: r.y, l: r.l, a: r.a, girada: r.girada };
    c.pecas.push(colocada);
    corta(c, { x: r.x, y: r.y, l: r.l + serra, a: r.a + serra });
  }
  const areaChapa = chapa.l * chapa.a;
  const usada = chapas.map((c) => c.pecas.reduce((s, p) => s + p.l * p.a, 0));
  return {
    chapas: chapas.map((c, i) => ({ pecas: c.pecas, aproveitamento: usada[i] / areaChapa })),
    aproveitamento: chapas.length ? usada.reduce((a, b) => a + b, 0) / (areaChapa * chapas.length) : 0,
    grandes, refilo, chapa,
  };
}
function encaixe(c, p, serra, gira) {
  let best = null;
  const tenta = (l, a, girada) => {
    for (const f of c.livres) {
      if (l <= f.l && a <= f.a) {
        const sobraCurta = Math.min(f.l - l, f.a - a), sobraLonga = Math.max(f.l - l, f.a - a);
        const nota = sobraCurta * 100000 + sobraLonga;
        if (!best || nota < best.nota) best = { x: f.x, y: f.y, l, a, girada, nota };
      }
    }
  };
  tenta(p.l, p.a, false);
  if (gira && p.l !== p.a) tenta(p.a, p.l, true);
  return best;
}
function corta(c, u) {
  const novos = [];
  c.livres = c.livres.filter((f) => {
    if (u.x >= f.x + f.l || u.x + u.l <= f.x || u.y >= f.y + f.a || u.y + u.a <= f.y) return true;
    if (u.x > f.x) novos.push({ x: f.x, y: f.y, l: u.x - f.x, a: f.a });
    if (u.x + u.l < f.x + f.l) novos.push({ x: u.x + u.l, y: f.y, l: f.x + f.l - u.x - u.l, a: f.a });
    if (u.y > f.y) novos.push({ x: f.x, y: f.y, l: f.l, a: u.y - f.y });
    if (u.y + u.a < f.y + f.a) novos.push({ x: f.x, y: u.y + u.a, l: f.l, a: f.y + f.a - u.y - u.a });
    return false;
  });
  const todos = c.livres.concat(novos.filter((r) => r.l > 0 && r.a > 0));
  // tira os retângulos livres que estão dentro de outro
  c.livres = todos.filter((r, i) => !todos.some((s, j) => j !== i && r.x >= s.x && r.y >= s.y && r.x + r.l <= s.x + s.l && r.y + r.a <= s.y + s.a && (j < i || r.l !== s.l || r.a !== s.a || r.x !== s.x || r.y !== s.y)));
}

// ------------------------------------------------------------------ lista de materiais por modelo de serviço (estimativa para conferir)
const arred = (n, passo = 1) => Math.ceil(n / passo - 1e-9) * passo;
export const MODELOS = {
  deck: {
    nome: 'Deck de madeira', campos: [['larg', 'Largura (m)', 3], ['comp', 'Comprimento (m)', 4]],
    lista({ larg, comp }) {
      const area = larg * comp, tabuas = arred(area / 0.1 * 1.1), vigas = arred((larg / 0.5 + 1) * comp * 1.05);
      return [
        ['Tábua de cumaru 10 cm (metro)', tabuas, 'm'], ['Viga de eucalipto tratado 6x12 (metro)', vigas, 'm'],
        ['Parafuso inox 4,5x50 (cento)', arred(area * 30 / 100), 'cento'], ['Óleo para deck (galão 3,6 L)', arred(area / 12), 'galão'],
        ['Manta bidim (m²)', arred(area), 'm²'],
      ];
    },
  },
  pergolado: {
    nome: 'Pergolado', campos: [['larg', 'Largura (m)', 3], ['prof', 'Profundidade (m)', 2.5]],
    lista({ larg, prof }) {
      const caibros = arred(larg / 0.4) + 1;
      return [
        ['Pilar de eucalipto tratado 12x12 (metro)', 4 * 2.8, 'm'], ['Viga de eucalipto 6x16 (metro)', arred(larg * 2 + prof * 2), 'm'],
        ['Caibro de eucalipto 5x10 (metro)', arred(caibros * (prof + 0.4)), 'm'], ['Parafuso francês 1/2" x 20 cm (un)', 16, 'un'],
        ['Sapata metálica para pilar (un)', 4, 'un'], ['Stain para madeira (galão 3,6 L)', arred((larg * prof) / 8), 'galão'],
      ];
    },
  },
  'guarda-roupa': {
    nome: 'Guarda-roupa em MDF', campos: [['larg', 'Largura (m)', 2.4], ['alt', 'Altura (m)', 2.4], ['portas', 'Portas', 4]],
    lista({ larg, alt, portas }) {
      const m2 = (larg * alt) * 2 + alt * 0.6 * 2 + larg * 0.6 * 4 + alt * 0.6 * Math.max(1, arred(portas / 2) - 1);
      const chapas = arred(m2 / (2.75 * 1.84) * 1.15);
      return [
        ['Chapa MDF 15 mm branco 2750x1840', chapas, 'chapa'], ['Chapa MDF 6 mm branco (fundo)', arred((larg * alt) / (2.75 * 1.84)), 'chapa'],
        ['Dobradiça curva 35 mm (un)', portas * (alt > 2 ? 4 : 3), 'un'], ['Puxador perfil alumínio (metro)', arred(portas * 0.6), 'm'],
        ['Corrediça telescópica 45 cm (par)', 4, 'par'], ['Fita de borda branca 22 mm (rolo 20 m)', arred(chapas * 22 / 20), 'rolo'],
        ['Parafuso 4,0x40 (cento)', arred(chapas * 0.8), 'cento'],
      ];
    },
  },
  prateleira: {
    nome: 'Prateleiras e nichos', campos: [['qtd', 'Quantas prateleiras', 3], ['comp', 'Comprimento de cada (m)', 1.2]],
    lista({ qtd, comp }) {
      return [
        ['Chapa MDF 18 mm amadeirado 2750x1840', arred((qtd * comp * 0.3) / (2.75 * 1.84) * 1.2), 'chapa'], ['Suporte invisível 20 cm (un)', qtd * 2, 'un'],
        ['Bucha 8 com parafuso (cento)', 1, 'cento'], ['Fita de borda amadeirada 22 mm (rolo 20 m)', arred(qtd * comp * 2 / 20), 'rolo'],
      ];
    },
  },
  forro: {
    nome: 'Forro de madeira (lambri)', campos: [['larg', 'Largura do cômodo (m)', 3.5], ['comp', 'Comprimento (m)', 4]],
    lista({ larg, comp }) {
      const area = larg * comp;
      return [
        ['Lambri de pinus 10 cm (m²)', arred(area * 1.1), 'm²'], ['Sarrafo de pinus 2,5x5 (metro)', arred((comp / 0.5 + 1) * larg), 'm'],
        ['Prego sem cabeça 15x15 (kg)', arred(area / 15), 'kg'], ['Meia-cana de acabamento (metro)', arred((larg + comp) * 2), 'm'],
        ['Verniz marítimo (galão 3,6 L)', arred(area / 25), 'galão'],
      ];
    },
  },
  porta: {
    nome: 'Instalação de porta', campos: [['qtd', 'Quantas portas', 2]],
    lista({ qtd }) {
      return [
        ['Porta semi-oca 80x210 (un)', qtd, 'un'], ['Batente de madeira 14 cm (jogo)', qtd, 'jogo'], ['Guarnição (jogo)', qtd * 2, 'jogo'],
        ['Dobradiça 3" com parafusos (un)', qtd * 3, 'un'], ['Fechadura interna (un)', qtd, 'un'], ['Espuma expansiva 500 ml (un)', arred(qtd / 2), 'un'],
      ];
    },
  },
};

// listas da alvenaria, pisos, pintura, elétrica, hidráulica, drywall e telhado
Object.assign(MODELOS, {
  parede: {
    nome: 'Parede de bloco', campos: [['comp', 'Comprimento (m)', 10], ['alt', 'Altura (m)', 2.8]],
    lista({ comp, alt }) {
      const area = comp * alt, b = blocos(area, 'bloco14'), arg = argamassa(area * 0.012); // ~12 L de argamassa por m² de assentamento
      return [['Bloco de concreto 14x19x39', b.qtd, 'un'], ['Cimento CP-II 50 kg', arg.cimento, 'saco'], ['Cal hidratada 20 kg', arg.cal, 'saco'], ['Areia média (m³)', arg.areia, 'm³'], ['Ferro 3/8 CA-50 (barra 12 m)', arred(comp * 2 / 12 + 0.01), 'barra']];
    },
  },
  contrapiso: {
    nome: 'Contrapiso', campos: [['area', 'Área (m²)', 30], ['esp', 'Espessura (cm)', 4]],
    lista({ area, esp }) { const t = traco(area * esp / 100, '1:4'); return [['Cimento CP-II 50 kg', t.cimento, 'saco'], ['Areia média (m³)', t.areia, 'm³']]; },
  },
  concreto: {
    nome: 'Concreto (laje, viga, sapata)', campos: [['vol', 'Volume (m³)', 2], ['fck', 'Resistência (MPa)', 20]],
    lista({ vol, fck }) { const t = traco(vol, fck >= 25 ? '1:2:3' : '1:2,5:3'); return [['Cimento CP-II 50 kg', t.cimento, 'saco'], ['Areia média (m³)', t.areia, 'm³'], ['Brita 1 (m³)', t.brita, 'm³']]; },
  },
  piso: {
    nome: 'Piso e revestimento', campos: [['area', 'Área (m²)', 20], ['lado', 'Lado da peça (cm)', 60], ['junta', 'Junta (mm)', 2]],
    lista(v) { const p = piso(v.area, v.lado, v.junta); return [[v.lado >= 60 ? 'Porcelanato 60x60 (m²)' : 'Piso cerâmico 45x45 (m²)', p.m2, 'm²'], [v.lado >= 60 ? 'Argamassa AC-III 20 kg' : 'Argamassa AC-II 20 kg', p.argamassa, 'saco'], ['Rejunte 5 kg', p.rejunte, 'saco'], ['Espaçador 2 mm (pacote 100)', arred(v.area / 10), 'pacote']]; },
  },
  pintura: {
    nome: 'Pintura de cômodos', campos: [['area', 'Área de parede (m²)', 120], ['demaos', 'Demãos', 2]],
    lista({ area, demaos }) { const t = latasTinta(area, demaos, 300 / 18); return [['Tinta acrílica fosca 18 L', arred(t.litros / 18), 'lata'], ['Massa corrida 25 kg', arred(area / 60), 'balde'], ['Selador acrílico 18 L', arred(area / 100), 'lata'], ['Lixa 150 (folha)', arred(area / 8), 'un'], ['Fita crepe 48 mm', arred(area / 40), 'un']]; },
  },
  eletrica: {
    nome: 'Pontos elétricos', campos: [['tomadas', 'Tomadas', 12], ['luzes', 'Pontos de luz', 6], ['circ', 'Circuitos', 4]],
    lista({ tomadas, luzes, circ }) { return [['Fio flexível 2,5 mm (rolo 100 m)', arred((tomadas * 8) / 100 * 3), 'rolo'], ['Fio flexível 1,5 mm (rolo 100 m)', arred((luzes * 8) / 100 * 2), 'rolo'], ['Tomada 10 A com placa', tomadas, 'un'], ['Caixa 4x2', tomadas + luzes, 'un'], ['Disjuntor DIN 20 A', circ, 'un'], ['Eletroduto corrugado 3/4 (rolo 50 m)', arred((tomadas + luzes) * 6 / 50), 'rolo']]; },
  },
  hidraulica: {
    nome: 'Banheiro (água e esgoto)', campos: [['pontos', 'Pontos de água', 5]],
    lista({ pontos }) { return [['Tubo PVC soldável 25 mm (barra 6 m)', arred(pontos * 1.2), 'barra'], ['Tubo PVC esgoto 100 mm (barra 6 m)', 2, 'barra'], ['Joelho 90° 25 mm', pontos * 3, 'un'], ['Registro de gaveta 3/4', 2, 'un'], ['Cola PVC 175 g', 1, 'un'], ['Fita veda-rosca 18 mm', 2, 'un']]; },
  },
  drywall: {
    nome: 'Parede de drywall', campos: [['comp', 'Comprimento (m)', 4], ['alt', 'Altura (m)', 2.7]],
    lista({ comp, alt }) { const area = comp * alt; return [['Placa de drywall ST 1,20x1,80', arred(area * 2 / 2.16 * 1.1), 'placa'], ['Perfil montante 48 mm (3 m)', arred(comp / 0.6) + 1, 'barra'], ['Guia 48 mm (3 m)', arred(comp * 2 / 3), 'barra'], ['Parafuso drywall (cento)', arred(area * 2 * 25 / 100), 'cento'], ['Massa para drywall 5 kg', arred(area / 10), 'balde'], ['Fita telada (rolo 90 m)', 1, 'rolo']]; },
  },
  telhado: {
    nome: 'Telhado cerâmico', campos: [['area', 'Área do telhado (m²)', 60]],
    lista({ area }) { return [['Telha cerâmica (milheiro)', Math.ceil(area * 16 * 1.05 / 100) / 10, 'milheiro'], ['Cumeeira (un)', arred(Math.sqrt(area) * 3), 'un'], ['Manta subcobertura (rolo)', arred(area / 50), 'rolo'], ['Caibro de eucalipto 5x10 (metro)', arred(area * 2.2), 'm']]; },
  },
});
// quais ofícios usam cada modelo (para mostrar primeiro os do ofício)
export const MODELO_OFICIO = { deck: 'carpinteiro', pergolado: 'carpinteiro', forro: 'carpinteiro', porta: 'carpinteiro', 'guarda-roupa': 'marceneiro', prateleira: 'marceneiro', parede: 'pedreiro', contrapiso: 'pedreiro', concreto: 'pedreiro', piso: 'azulejista', pintura: 'pintor', eletrica: 'eletricista', hidraulica: 'encanador', drywall: 'gesseiro', telhado: 'telhadista' };

// ------------------------------------------------------------------ calculadoras da obra
// traço em volume (cimento:areia[:brita]); devolve sacos de 50 kg e m³ (rendimento ~1,52 de material seco por m³ pronto)
export function traco(volume, tr = '1:2,5:3') {
  const p = tr.replace(/,/g, '.').split(':').map(Number), soma = p.reduce((a, b) => a + b, 0), seco = volume * 1.52;
  const cimentoM3 = seco * p[0] / soma, sacos = arred(cimentoM3 * 1440 / 50); // cimento solto ~1440 kg/m³
  return { cimento: sacos, areia: Math.ceil(seco * (p[1] || 0) / soma * 10) / 10, brita: p[2] ? Math.ceil(seco * p[2] / soma * 10) / 10 : 0, agua: Math.round(sacos * 25) };
}
// argamassa de assentamento 1:0,5:5 (cimento:cal:areia) para um volume em m³
export function argamassa(volume) {
  const seco = volume * 1.3, soma = 6.5;
  return { cimento: arred(seco * 1 / soma * 1440 / 50), cal: arred(seco * 0.5 / soma * 600 / 20), areia: Math.ceil(seco * 5 / soma * 10) / 10 };
}
const BLOCOS = { bloco14: ['Bloco de concreto 14x19x39', 12.5], bloco9: ['Bloco de concreto 9x19x39', 12.5], baiano: ['Tijolo baiano 9x19x29 (deitado)', 16], macico: ['Tijolo maciço 5x10x20', 80] };
export const TIPOS_BLOCO = Object.fromEntries(Object.entries(BLOCOS).map(([k, [n]]) => [k, n]));
export function blocos(area, tipo = 'bloco14', perda = 5) { const [nome, porM2] = BLOCOS[tipo] || BLOCOS.bloco14; return { nome, porM2, qtd: arred(area * porM2 * (1 + perda / 100)) }; }
// piso: m² com perda, sacos de argamassa (colante ~5 kg/m², dupla colagem acima de 60 cm ~7 kg/m²) e rejunte (fórmula do fabricante)
export function piso(area, ladoCm = 60, juntaMm = 2, espMm = 8, diagonal = false) {
  const perda = diagonal ? 15 : 10, m2 = Math.ceil(area * (1 + perda / 100) * 10) / 10;
  const kgArg = area * (ladoCm >= 60 ? 7 : 5), lado = ladoCm * 10;
  const kgRej = area * ((lado + lado) / (lado * lado)) * espMm * juntaMm * 1.58;
  return { m2, perda, argamassa: arred(kgArg / 20), rejunte: arred(kgRej / 5), kgRejunte: Math.round(kgRej * 10) / 10 };
}

// ------------------------------------------------------------------ conversões
export const pol2mm = (pol) => pol * 25.4;
// "3/4", "1 1/2", "2" -> número de polegadas
export function lerPolegada(s) {
  const t = String(s || '').trim().replace(/["”]/g, '').replace(',', '.');
  const m = t.match(/^(\d+(?:\.\d+)?)?\s*(?:(\d+)\/(\d+))?$/);
  if (!m || (!m[1] && !m[2])) return NaN;
  return (m[1] ? +m[1] : 0) + (m[2] ? +m[2] / +m[3] : 0);
}
// mm -> fração de polegada mais próxima (1/16)
export function mm2polFracao(mm) {
  const pol = mm / 25.4, inteiro = Math.floor(pol); let n = Math.round((pol - inteiro) * 16), d = 16;
  if (n === 16) return `${inteiro + 1}"`;
  while (n && n % 2 === 0) { n /= 2; d /= 2; }
  return n ? `${inteiro ? inteiro + ' ' : ''}${n}/${d}"` : `${inteiro}"`;
}
export const m3Madeira = (espMm, largMm, compM, qtd) => (espMm / 1000) * (largMm / 1000) * compM * qtd;
export function latasTinta(area, demaos, rendimentoM2PorLitro = 10) {
  const litros = (area * demaos) / rendimentoM2PorLitro;
  const g18 = Math.floor(litros / 18), resto = litros - g18 * 18, g36 = Math.ceil(resto / 3.6 - 1e-9);
  return { litros, latas18: g18 + (g36 > 3 ? 1 : 0), galoes: g36 > 3 ? 0 : g36 };
}
