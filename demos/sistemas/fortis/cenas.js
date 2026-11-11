// Fortis · ilustrações dos serviços de exemplo (antes e depois), desenhadas aqui em SVG.
// A demonstração não usa fotos de pessoas nem de obras reais: cada cena é um desenho marcado como exemplo.
// Na conta real, o profissional usa as fotos que tira no celular.

let seq = 0;
const madeira = (u, a = '#C38A55', b = '#A86E3E', c = '#D9A672') => `
  <linearGradient id="m${u}" x1="0" y1="0" x2="1" y2="0.15"><stop offset="0" stop-color="${a}"/><stop offset=".35" stop-color="${c}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${a}"/></linearGradient>
  <pattern id="v${u}" width="60" height="14" patternUnits="userSpaceOnUse"><path d="M0 4 C15 1 25 7 40 4 S55 2 60 4 M0 10 C12 8 30 13 45 10 S56 9 60 10" fill="none" stroke="rgba(70,38,16,.22)" stroke-width="1"/></pattern>`;
const sala = (u, parede, piso = '#8C6A4D', velho = false) => `
  <rect width="400" height="300" fill="${parede}"/>
  ${velho ? `<path d="M40 40 l18 22 -6 14 16 20 M300 20 l-10 30 14 12 -8 24" fill="none" stroke="rgba(60,40,30,.35)" stroke-width="1.6"/>
  <ellipse cx="330" cy="150" rx="40" ry="26" fill="rgba(120,95,60,.18)"/><ellipse cx="70" cy="170" rx="30" ry="40" fill="rgba(120,95,60,.14)"/>` : ''}
  <rect y="232" width="400" height="68" fill="${piso}"/>
  <path d="M0 246h400M0 262h400M0 280h400M60 232v14M170 246v16M90 262v18M250 232v14M330 262v18M210 280v20" stroke="rgba(0,0,0,.18)" stroke-width="1.2"/>
  <rect y="226" width="400" height="7" fill="${velho ? '#9a8f80' : '#efe7da'}"/>`;
const sombra = (x, w) => `<ellipse cx="${x + w / 2}" cy="234" rx="${w / 2 + 10}" ry="6" fill="rgba(0,0,0,.18)"/>`;

const CENAS = {
  'guarda-roupa': {
    nome: 'Guarda-roupa planejado',
    antes: (u) => `${sala(u, '#cfc6b4', '#7d6a58', true)}
      <g transform="rotate(-4 120 200)"><rect x="70" y="70" width="110" height="160" fill="#8b6b4f" stroke="#5d4532" stroke-width="3"/><rect x="78" y="80" width="44" height="140" fill="#7a5c42"/><path d="M128 80h44v140h-44z" fill="#6d5039" transform="rotate(14 128 80)"/></g>
      <path d="M210 228c10-30 40-34 60-20 14-16 44-10 50 20z" fill="#7b8fa6"/><path d="M228 226c8-18 28-20 38-8" fill="none" stroke="#5a6b80" stroke-width="3"/>
      <circle cx="350" cy="60" r="10" fill="none" stroke="rgba(60,40,30,.4)" stroke-width="2"/><path d="M350 70v40" stroke="rgba(60,40,30,.4)" stroke-width="2" stroke-dasharray="3 4"/>`,
    depois: (u) => `${sala(u, '#e9e2d4', '#9b7552')}
      ${sombra(40, 320)}
      <rect x="40" y="28" width="320" height="200" rx="3" fill="url(#m${u})"/><rect x="40" y="28" width="320" height="200" fill="url(#v${u})"/>
      <path d="M147 30v196M253 30v196M40 62h320" stroke="#7a4f2c" stroke-width="2.5"/>
      <rect x="44" y="31" width="312" height="3" fill="#fff6c8" opacity=".85"/>
      <rect x="138" y="110" width="4" height="46" rx="2" fill="#2b2b2b"/><rect x="158" y="110" width="4" height="46" rx="2" fill="#2b2b2b"/><rect x="244" y="110" width="4" height="46" rx="2" fill="#2b2b2b"/>
      <rect x="60" y="38" width="70" height="18" rx="2" fill="rgba(255,255,255,.2)"/><rect x="270" y="38" width="70" height="18" rx="2" fill="rgba(255,255,255,.2)"/>`,
  },
  cozinha: {
    nome: 'Cozinha planejada',
    antes: (u) => `${sala(u, '#d8d2c0', '#8a7b68', true)}
      <rect x="30" y="150" width="340" height="80" fill="#a99377" stroke="#6f5d48" stroke-width="3"/><rect x="40" y="160" width="70" height="62" fill="#9a8468"/><rect x="200" y="160" width="70" height="62" fill="#3a3027"/>
      <path d="M118 160h70v62h-70z" fill="#9a8468" transform="rotate(8 118 160)"/><rect x="26" y="142" width="348" height="10" fill="#8f8a80"/>
      <rect x="60" y="40" width="90" height="60" fill="#a99377" stroke="#6f5d48" stroke-width="3"/><path d="M280 50l40 40M320 50l-40 40" stroke="rgba(80,60,40,.35)" stroke-width="2"/>`,
    depois: (u) => `${sala(u, '#f0ebe1', '#a07b57')}
      <g fill="#dcd5c8"><rect x="30" y="98" width="340" height="46"/></g>
      <path d="M30 110h340M30 122h340M30 134h340M58 98v46M86 98v46M114 98v46M142 98v46M170 98v46M198 98v46M226 98v46M254 98v46M282 98v46M310 98v46M338 98v46" stroke="#c7bfb1" stroke-width="1"/>
      ${sombra(30, 340)}<rect x="30" y="150" width="340" height="80" fill="url(#m${u})"/><rect x="30" y="150" width="340" height="80" fill="url(#v${u})"/>
      <rect x="24" y="142" width="352" height="10" rx="2" fill="#3b3f42"/><path d="M115 152v78M200 152v78M285 152v78" stroke="#7a4f2c" stroke-width="2"/>
      <path d="M70 172h24M155 172h24M240 172h24M325 172h24" stroke="#262626" stroke-width="3" stroke-linecap="round"/>
      <rect x="30" y="24" width="340" height="66" fill="url(#m${u})"/><rect x="30" y="24" width="340" height="66" fill="url(#v${u})"/><path d="M115 24v66M200 24v66M285 24v66" stroke="#7a4f2c" stroke-width="2"/>
      <rect x="34" y="88" width="332" height="3" fill="#fff6c8" opacity=".9"/>`,
  },
  deck: {
    nome: 'Deck de madeira',
    antes: (u) => `<rect width="400" height="300" fill="#cfe0e6"/><circle cx="330" cy="60" r="26" fill="#f3d27a"/>
      <rect y="120" width="400" height="40" fill="#b7b0a1"/><path d="M0 120h400" stroke="#9a9384" stroke-width="2"/>
      <rect y="160" width="400" height="140" fill="#9d8263"/><path d="M30 200l10-16 8 16M120 250l8-14 7 14M260 220l9-18 9 18M350 270l7-12 6 12" fill="#6f8a4f"/>
      <ellipse cx="200" cy="240" rx="60" ry="14" fill="rgba(70,50,30,.25)"/><path d="M90 180c30 6 50-4 80 2" stroke="rgba(60,40,20,.3)" stroke-width="3" fill="none"/>`,
    depois: (u) => `<rect width="400" height="300" fill="#cfe0e6"/><circle cx="330" cy="60" r="26" fill="#f3d27a"/>
      <rect y="120" width="400" height="40" fill="#e6e0d2"/><path d="M0 120h400" stroke="#c9c1b0" stroke-width="2"/>
      <polygon points="0,160 400,160 400,300 0,300" fill="url(#m${u})"/><rect y="160" width="400" height="140" fill="url(#v${u})"/>
      ${[176, 194, 214, 236, 260, 286].map((y) => `<path d="M0 ${y}h400" stroke="#7a4f2c" stroke-width="2"/>`).join('')}
      <path d="M0 160h400" stroke="#5e3d22" stroke-width="4"/>
      <g transform="translate(280 150)"><rect x="0" y="40" width="70" height="8" rx="3" fill="#3b3f42"/><rect x="4" y="48" width="5" height="30" fill="#3b3f42"/><rect x="61" y="48" width="5" height="30" fill="#3b3f42"/><rect x="0" y="0" width="8" height="48" rx="3" fill="#3b3f42"/></g>
      <g transform="translate(40 120)"><rect x="0" y="40" width="34" height="34" rx="4" fill="#b55e3c"/><path d="M17 40c-20-30 0-44 0-44s20 14 0 44M17 40c-28-12-20-34-20-34M17 40c28-12 20-34 20-34" fill="#4f7a45"/></g>`,
  },
  pergolado: {
    nome: 'Pergolado',
    antes: (u) => `<rect width="400" height="300" fill="#d7e3e6"/><rect y="60" width="400" height="170" fill="#d9cfbd"/><path d="M0 60h400" stroke="#bdb29e" stroke-width="3"/>
      <rect x="150" y="110" width="70" height="120" fill="#8d7a63"/><rect x="250" y="120" width="80" height="60" fill="#a8c3cf" stroke="#8d7a63" stroke-width="4"/>
      <rect y="230" width="400" height="70" fill="#a39581"/><path d="M40 260l14 10M300 250l18 12" stroke="rgba(0,0,0,.2)" stroke-width="2"/>`,
    depois: (u) => `<rect width="400" height="300" fill="#d7e3e6"/><rect y="60" width="400" height="170" fill="#ebe3d3"/><path d="M0 60h400" stroke="#cfc4ae" stroke-width="3"/>
      <rect x="150" y="110" width="70" height="120" fill="url(#m${u})"/><rect x="250" y="120" width="80" height="60" fill="#a8c3cf" stroke="#5e3d22" stroke-width="4"/>
      <rect y="230" width="400" height="70" fill="#c8bba5"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${i * 52}" y="250" width="44" height="40" fill="rgba(0,0,0,.08)" transform="skewX(-20)"/>`).join('')}
      <rect x="40" y="40" width="12" height="190" fill="url(#m${u})"/><rect x="348" y="40" width="12" height="190" fill="url(#m${u})"/>
      <rect x="20" y="36" width="360" height="12" fill="#8d5a33"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => `<rect x="${26 + i * 34}" y="24" width="8" height="30" fill="#a86e3e"/>`).join('')}
      <path d="M52 48c20 30 6 60 30 80" stroke="#4f7a45" stroke-width="4" fill="none"/><circle cx="66" cy="80" r="6" fill="#4f7a45"/><circle cx="78" cy="112" r="5" fill="#4f7a45"/>`,
  },
  painel: {
    nome: 'Painel ripado de TV',
    antes: (u) => `${sala(u, '#d6d0c4', '#837261', true)}
      <path d="M200 40v60M200 100c0 20-20 20-20 40" stroke="#333" stroke-width="2.5" fill="none"/><path d="M210 40v50c0 30 30 20 30 60" stroke="#c0392b" stroke-width="2.5" fill="none"/>
      <rect x="120" y="170" width="160" height="56" fill="#8a7a66"/><rect x="190" y="30" width="22" height="14" fill="#efe9de" stroke="#999"/>`,
    depois: (u) => `${sala(u, '#ece6da', '#9b7552')}
      <rect x="90" y="20" width="220" height="206" fill="#5e3d22"/>${Array.from({ length: 22 }, (_, i) => `<rect x="${92 + i * 10}" y="20" width="7" height="206" fill="url(#m${u})"/>`).join('')}
      <rect x="140" y="70" width="120" height="70" rx="3" fill="#15171a"/><rect x="144" y="74" width="112" height="62" fill="#22262b"/>
      ${sombra(60, 280)}<rect x="60" y="180" width="280" height="48" rx="2" fill="#f1ede6"/><path d="M153 182v44M246 182v44" stroke="#d1cabd" stroke-width="2"/>
      <rect x="94" y="22" width="212" height="3" fill="#fff6c8" opacity=".9"/>`,
  },
  escada: {
    nome: 'Escada com degraus de madeira',
    antes: (u) => `${sala(u, '#d3ccbd', '#8c8070', true)}
      ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${60 + i * 46}" y="${200 - i * 30}" width="${340 - i * 46}" height="30" fill="#a7a196" stroke="#8a857b"/>`).join('')}`,
    depois: (u) => `${sala(u, '#efe9de', '#9b7552')}
      ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${60 + i * 46}" y="${200 - i * 30}" width="${340 - i * 46}" height="30" fill="#e8e3da"/><rect x="${56 + i * 46}" y="${196 - i * 30}" width="${344 - i * 46}" height="9" rx="2" fill="url(#m${u})"/>`).join('')}
      <path d="M70 120L330 -40" stroke="#2b2b2b" stroke-width="4"/>${[0, 1, 2, 3, 4].map((i) => `<path d="M${90 + i * 46} ${107 - i * 28}v${68}" stroke="#2b2b2b" stroke-width="2"/>`).join('')}`,
  },
  prateleira: {
    nome: 'Nicho e prateleiras',
    antes: (u) => `${sala(u, '#cfc8b8', '#857563', true)}
      <path d="M100 120h200" stroke="#7c6a55" stroke-width="10"/><path d="M100 120l-10 26" stroke="#7c6a55" stroke-width="6"/>
      <rect x="250" y="190" width="40" height="36" fill="#b29a78"/><rect x="200" y="200" width="44" height="26" fill="#c8b18c"/>`,
    depois: (u) => `${sala(u, '#e7eef0', '#9b7552')}
      ${[70, 125, 180].map((y) => `<rect x="80" y="${y}" width="240" height="12" rx="2" fill="url(#m${u})"/><rect x="80" y="${y}" width="240" height="12" fill="url(#v${u})"/><rect x="80" y="${y + 12}" width="240" height="4" fill="rgba(0,0,0,.12)"/>`).join('')}
      <rect x="100" y="40" width="14" height="30" fill="#4b6a85"/><rect x="117" y="46" width="12" height="24" fill="#b55e3c"/><rect x="132" y="38" width="10" height="32" fill="#e3c25a"/>
      <circle cx="270" cy="110" r="14" fill="#4f7a45"/><rect x="262" y="110" width="16" height="15" fill="#b55e3c"/><rect x="180" y="150" width="60" height="30" fill="#f1ede6" stroke="#d1cabd"/>`,
  },
};

const azulejos = (x0, y0, w, h, l, cor, junta, quebra = false) => { let s = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${cor}"/>`; for (let x = x0 + l; x < x0 + w; x += l) s += `<path d="M${x} ${y0}v${h}" stroke="${junta}" stroke-width="1.5"/>`; for (let y = y0 + l; y < y0 + h; y += l) s += `<path d="M${x0} ${y}h${w}" stroke="${junta}" stroke-width="1.5"/>`; if (quebra) s += `<path d="M${x0 + l * 1.2} ${y0 + l * .4}l${l * .3} ${l * .5} ${-l * .2} ${l * .4}M${x0 + w - l * 1.5} ${y0 + l * 1.3}l${l * .4} ${l * .3}" stroke="rgba(40,30,20,.55)" stroke-width="1.6" fill="none"/><rect x="${x0 + l * 2}" y="${y0 + l * 2}" width="${l}" height="${l}" fill="#9b8f7c"/>`; return s; };
Object.assign(CENAS, {
  banheiro: {
    nome: 'Reforma de banheiro',
    antes: () => `<rect width="400" height="300" fill="#cfc9bb"/>${azulejos(0, 0, 400, 210, 30, '#c9d6c8', '#aab5a6', true)}<rect y="210" width="400" height="90" fill="#9d9381"/>${azulejos(0, 210, 400, 90, 30, '#a99f8c', '#8b826f', false)}
      <rect x="250" y="120" width="90" height="100" rx="6" fill="#e9e6df" stroke="#a7a294" stroke-width="3"/><rect x="262" y="95" width="66" height="30" rx="4" fill="#e9e6df" stroke="#a7a294" stroke-width="3"/>
      <path d="M60 40v40M50 80h20" stroke="#8d8a83" stroke-width="5"/><path d="M60 90c-6 14-6 28 0 40" stroke="rgba(120,140,150,.5)" stroke-width="3" fill="none" stroke-dasharray="4 6"/>
      <ellipse cx="120" cy="250" rx="50" ry="10" fill="rgba(90,80,60,.25)"/>`,
    depois: (u) => `<rect width="400" height="300" fill="#ece8e1"/>${azulejos(0, 0, 400, 215, 72, '#e9e5de', '#d7d1c6')}<rect x="0" y="0" width="160" height="215" fill="#d8d2c6"/>${azulejos(0, 0, 160, 215, 54, '#cfc6b6', '#bdb3a1')}
      ${azulejos(0, 215, 400, 85, 85, '#bdb6aa', '#a9a296')}<rect x="20" y="20" width="4" height="190" fill="#9aa3a8"/><rect x="24" y="20" width="110" height="190" fill="rgba(200,225,235,.35)" stroke="#9aa3a8" stroke-width="2"/>
      <circle cx="80" cy="50" r="12" fill="#3b3f42"/><rect x="250" y="130" width="100" height="70" rx="3" fill="url(#m${u})"/><rect x="246" y="122" width="108" height="10" rx="2" fill="#f4f2ee"/><path d="M300 100v22" stroke="#3b3f42" stroke-width="4"/>
      <rect x="262" y="40" width="76" height="56" rx="4" fill="#cfdde3" stroke="#3b3f42" stroke-width="3"/>`,
  },
  muro: {
    nome: 'Muro de bloco',
    antes: () => `<rect width="400" height="300" fill="#cfe0e6"/><rect y="200" width="400" height="100" fill="#a3896a"/>${[30, 110, 190, 270, 350].map((x) => `<path d="M${x} 205v-80" stroke="#7d6248" stroke-width="5"/>`).join('')}<path d="M20 140h360M20 170h360" stroke="#9a9a8e" stroke-width="2"/>
      <path d="M60 230l8-14 8 14M220 250l9-16 9 16M320 236l7-12 6 12" fill="#6f8a4f"/>`,
    depois: () => `<rect width="400" height="300" fill="#cfe0e6"/><rect y="215" width="400" height="85" fill="#b9a68a"/><rect x="0" y="70" width="400" height="150" fill="#d9d2c4"/>
      ${[0, 1, 2, 3, 4, 5, 6].map((r) => Array.from({ length: 11 }, (_, i) => `<rect x="${i * 40 - (r % 2) * 20}" y="${70 + r * 21}" width="38" height="19" fill="#cfc7b7"/>`).join('')).join('')}
      <rect x="0" y="62" width="400" height="10" fill="#8f877a"/><rect x="0" y="210" width="400" height="8" fill="#8f877a"/><rect x="150" y="100" width="100" height="120" fill="#3b3f42"/><path d="M160 110v100M175 110v100M190 110v100M205 110v100M220 110v100M235 110v100" stroke="#5a5f64" stroke-width="3"/>`,
  },
  piso: {
    nome: 'Porcelanato na sala',
    antes: () => `<rect width="400" height="300" fill="#d9d2c4"/><rect y="0" width="400" height="140" fill="#e3ddd1"/><path d="M0 140h400" stroke="#b9b1a3" stroke-width="3"/><polygon points="0,140 400,140 400,300 0,300" fill="#8f8a81"/>
      <path d="M40 180l30 10M120 220l40-8M260 200l30 20M300 260l50-10" stroke="rgba(50,45,40,.35)" stroke-width="2"/><ellipse cx="200" cy="250" rx="70" ry="14" fill="rgba(60,55,45,.18)"/><rect x="300" y="160" width="40" height="30" fill="#a39c90"/>`,
    depois: () => `<rect width="400" height="300" fill="#e9e4da"/><rect y="0" width="400" height="140" fill="#efeae1"/><path d="M0 140h400" stroke="#d1c9bb" stroke-width="3"/><polygon points="0,140 400,140 400,300 0,300" fill="#d7d1c6"/>
      ${[0, 1, 2, 3, 4].map((i) => `<path d="M${200 + (i - 2) * 60} 140L${200 + (i - 2) * 190} 300" stroke="#c4bcae" stroke-width="2"/>`).join('')}<path d="M0 175h400M0 225h400M0 285h400" stroke="#c4bcae" stroke-width="2"/>
      <rect x="40" y="90" width="150" height="60" rx="10" fill="#4b6a85"/><rect x="40" y="80" width="150" height="24" rx="10" fill="#5a7a95"/><rect x="250" y="40" width="90" height="70" fill="#a4461f" opacity=".85"/><ellipse cx="200" cy="240" rx="90" ry="20" fill="rgba(255,255,255,.35)"/>`,
  },
  fachada: {
    nome: 'Pintura de fachada',
    antes: () => `<rect width="400" height="300" fill="#cfe0e6"/><rect x="50" y="80" width="300" height="190" fill="#b8b0a0"/><polygon points="40,85 200,20 360,85" fill="#8d5a3d"/>
      <path d="M70 120c20 10 40-5 60 8M230 200c30-6 50 10 80 0M90 230c10 20 40 10 50 25" stroke="rgba(70,60,45,.4)" stroke-width="8" fill="none"/><rect x="90" y="150" width="60" height="120" fill="#6d6253"/><rect x="230" y="130" width="80" height="60" fill="#a8c3cf" stroke="#6d6253" stroke-width="5"/>`,
    depois: () => `<rect width="400" height="300" fill="#cfe0e6"/><rect x="50" y="80" width="300" height="190" fill="#e8d3b5"/><rect x="50" y="240" width="300" height="30" fill="#7b4b33"/><polygon points="40,85 200,20 360,85" fill="#a4461f"/>
      <rect x="90" y="150" width="60" height="120" fill="#2d5d7b"/><rect x="230" y="130" width="80" height="60" fill="#cfe2ea" stroke="#f5efe6" stroke-width="6"/><circle cx="140" cy="212" r="3" fill="#e8b321"/>`,
  },
  quadro: {
    nome: 'Quadro de luz novo',
    antes: () => `${sala('q', '#d6d0c4', '#837261', true)}<rect x="140" y="50" width="120" height="150" fill="#9b958b" stroke="#6f6a61" stroke-width="4"/><path d="M160 80h30v20h-30zM210 80h30v20h-30zM160 120h30v20h-30z" fill="#4d4a45"/>
      <path d="M175 200c-10 30 20 20 10 50M215 200c10 20-20 30 0 50M200 60c-40-20-60 10-80-10" stroke="#c0392b" stroke-width="2.5" fill="none"/><path d="M190 200c0 25 10 30 0 50" stroke="#2b2b2b" stroke-width="2.5" fill="none"/>`,
    depois: () => `${sala('q', '#ece6da', '#9b7552')}<rect x="130" y="40" width="140" height="170" rx="6" fill="#f4f2ee" stroke="#9aa3a8" stroke-width="3"/>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${148 + i * 18}" y="80" width="14" height="36" rx="2" fill="${i === 0 ? '#3b3f42' : '#e3e1dc'}" stroke="#8b8f92"/><rect x="${151 + i * 18}" y="90" width="8" height="10" fill="#2d5d7b"/>`).join('')}
      ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${148 + i * 18}" y="140" width="14" height="36" rx="2" fill="#e3e1dc" stroke="#8b8f92"/><rect x="${151 + i * 18}" y="150" width="8" height="10" fill="#2d5d7b"/>`).join('')}<rect x="140" y="190" width="120" height="6" fill="#e8b321"/>`,
  },
});

export const TIPOS_CENA = Object.fromEntries(Object.entries(CENAS).map(([k, v]) => [k, v.nome]));

// estado: 'antes' | 'depois'
export function cena(tipo, estado = 'depois') {
  const c = CENAS[tipo] || CENAS['guarda-roupa'];
  const u = `c${(seq++).toString(36)}`;
  return `<svg class="cena" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${c.nome}, ${estado} (desenho de exemplo)"><defs>${madeira(u)}</defs>${c[estado](u)}</svg>`;
}
