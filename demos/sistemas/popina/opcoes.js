// Popina · as opções de um produto, iguais para o garçom e para o cliente do cardápio online:
// tamanho (P/M/G, broto/grande), meia a meia, grupos de complementos (obrigatórios ou não, com mínimo e máximo
// e preço por opção), observação e quantidade. O preço final sai sempre daqui.

// grupos do produto (os "adicionais" antigos viram um grupo opcional)
export function gruposDe(p) {
  const g = (p.grupos || []).map((x, i) => ({ id: x.id || `g${i}`, nome: x.nome, min: Number(x.min) || 0, max: Number(x.max) || 1, opcoes: x.opcoes || [] }));
  if (p.adicionais?.length) g.push({ id: 'adic', nome: 'Adicionais', min: 0, max: 20, opcoes: p.adicionais });
  return g;
}
// preço do tamanho escolhido (sem tamanho: o preço do produto)
export const precoTam = (p, tamNome) => (tamNome && p.tamanhos?.length ? (p.tamanhos.find((t) => t.nome === tamNome)?.preco ?? p.preco) : p.preco);
// o menor preço, para mostrar "a partir de"
export const aPartir = (p) => (p.tamanhos?.length ? Math.min(...p.tamanhos.map((t) => Number(t.preco) || 0)) : p.preco);
// a opção que o cliente mandou existe neste produto? (devolve com o preço do cadastro, nunca o que veio de fora)
export function opcaoReal(p, nome) {
  for (const g of gruposDe(p)) {
    for (const o of g.opcoes) {
      if (nome === o.nome && g.id === 'adic') return { nome: o.nome, preco: Number(o.preco) || 0 };
      if (nome === `${g.nome}: ${o.nome}`) return { nome, preco: Number(o.preco) || 0 };
    }
  }
  return null;
}

// estado da escolha e o HTML do formulário; ligar() conecta os botões e chama mudou() a cada toque
export function formOpcoes(p, { produtos, din, t, obsRapidas = [], obsLivre = true }) {
  const s = { qtd: 1, tam: p.tamanhos?.length ? p.tamanhos[p.tamanhos.length - 1].nome : '', meiaB: '', esc: {}, obs: [] };
  const grupos = gruposDe(p);
  const pizzas = p.pizza ? produtos.filter((x) => x.pizza && x.ativo !== false && x.id !== p.id) : [];
  const html = `
    ${p.tamanhos?.length ? `<fieldset class="op-grupo"><legend>Tamanho <em>obrigatório</em></legend><div class="op-lista">${p.tamanhos.map((tm) => `<label class="op"><input type="radio" name="tam" value="${t(tm.nome)}" ${tm.nome === s.tam ? 'checked' : ''}><span>${t(tm.nome)}</span><b>${din(tm.preco)}</b></label>`).join('')}</div></fieldset>` : ''}
    ${pizzas.length ? `<fieldset class="op-grupo"><legend>Meia a meia <em>opcional · cobra o sabor mais caro</em></legend><div class="op-lista">${pizzas.map((x) => `<label class="op"><input type="checkbox" name="meia" value="${x.id}"><span>½ ${t(x.nome.replace(/^Pizza /, ''))}</span></label>`).join('')}</div></fieldset>` : ''}
    ${grupos.map((g) => `<fieldset class="op-grupo" data-g="${g.id}"><legend>${t(g.nome)} <em>${g.min ? `obrigatório${g.max > 1 ? ` · escolha ${g.min === g.max ? g.min : `de ${g.min} a ${g.max}`}` : ''}` : `opcional${g.max > 1 && g.max < 20 ? ` · até ${g.max}` : ''}`}</em></legend><div class="op-lista">
      ${g.opcoes.map((o, k) => `<label class="op"><input type="${g.max === 1 ? 'radio' : 'checkbox'}" name="g-${g.id}" value="${k}"><span>${t(o.nome)}</span>${Number(o.preco) ? `<b>+ ${din(o.preco)}</b>` : ''}</label>`).join('')}</div></fieldset>`).join('')}
    ${obsRapidas.length || obsLivre ? `<fieldset class="op-grupo"><legend>Alguma observação?</legend>${obsRapidas.length ? `<div class="chips quebra">${obsRapidas.map((o) => `<button type="button" class="chip" data-obs="${t(o)}">${t(o)}</button>`).join('')}</div>` : ''}
      ${obsLivre ? `<input class="op-livre" data-livre maxlength="120" placeholder="Escreva aqui (opcional)" aria-label="Observação">` : ''}</fieldset>` : ''}
    <div class="qtd"><button type="button" class="bt-ico grande" data-menos aria-label="Menos">−</button><b data-q>1</b><button type="button" class="bt-ico grande" data-mais aria-label="Mais">+</button></div>`;
  const unit = () => {
    const prodB = s.meiaB && produtos.find((x) => x.id === s.meiaB);
    const base = prodB ? Math.max(precoTam(p, s.tam), precoTam(prodB, s.tam)) : precoTam(p, s.tam);
    return base + escolhidas().reduce((a, o) => a + o.preco, 0);
  };
  function escolhidas() {
    return grupos.flatMap((g) => (s.esc[g.id] || []).map((k) => ({ nome: g.id === 'adic' ? g.opcoes[k].nome : `${g.nome}: ${g.opcoes[k].nome}`, preco: Number(g.opcoes[k].preco) || 0 })));
  }
  // o que falta escolher (mensagem), ou '' se está tudo certo
  function falta() {
    for (const g of grupos) { const n = (s.esc[g.id] || []).length; if (n < g.min) return g.min === 1 ? `Escolha: ${g.nome}` : `Escolha ${g.min} em ${g.nome}`; if (n > g.max) return `No máximo ${g.max} em ${g.nome}`; }
    return '';
  }
  function ligar(f, mudou) {
    const q = (sel) => f.querySelector(sel), qa = (sel) => [...f.querySelectorAll(sel)];
    qa('input[name=tam]').forEach((i) => { i.onchange = () => { s.tam = i.value; mudou(); }; });
    qa('input[name=meia]').forEach((i) => { i.onchange = () => { qa('input[name=meia]').forEach((x) => { if (x !== i) x.checked = false; }); s.meiaB = i.checked ? i.value : ''; mudou(); }; });
    grupos.forEach((g) => {
      const ins = qa(`input[name="g-${g.id}"]`);
      ins.forEach((i) => { i.onchange = () => {
        let sel = ins.filter((x) => x.checked).map((x) => Number(x.value));
        if (g.max > 1 && sel.length > g.max) { i.checked = false; sel = sel.filter((x) => x !== Number(i.value)); }
        s.esc[g.id] = sel; mudou();
      }; });
    });
    qa('[data-obs]').forEach((b) => { b.onclick = () => { const on = b.classList.toggle('on'); s.obs = on ? [...s.obs, b.dataset.obs] : s.obs.filter((x) => x !== b.dataset.obs); }; });
    q('[data-menos]').onclick = () => { s.qtd = Math.max(1, s.qtd - 1); q('[data-q]').textContent = s.qtd; mudou(); };
    q('[data-mais]').onclick = () => { s.qtd = Math.min(30, s.qtd + 1); q('[data-q]').textContent = s.qtd; mudou(); };
    mudou();
  }
  // o item pronto para entrar na comanda (ou na sacola do cliente)
  function item(f) {
    const livre = f.querySelector('[data-livre]')?.value.trim() || '';
    const tam = s.tam ? p.tamanhos.find((x) => x.nome === s.tam) : null;
    return { prodId: p.id, qtd: s.qtd, tam: tam ? tam.nome : '', adic: escolhidas(), obs: [...s.obs, livre].filter(Boolean).join(', '), meia: s.meiaB ? { a: p.id, b: s.meiaB } : null, unit: unit() };
  }
  return { html, ligar, item, unit, falta, s };
}
// nome do item como sai na comanda e na cozinha
export function nomeItem(p, { tam, meia }, prodB) {
  let n = p.nome;
  if (meia && prodB) n = `Pizza meia ${p.nome.replace(/^Pizza /, '')} / meia ${prodB.nome.replace(/^Pizza /, '')}`;
  return tam ? `${n} (${tam})` : n;
}

// aberto agora? horarios[dia] = [['11:00','15:00'], ['18:00','01:00']] (turno que passa da meia-noite vale até o dia seguinte)
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const min = (h) => { const [a, b] = String(h || '0:0').split(':').map(Number); return a * 60 + (b || 0); };
export function situacao(horarios, agora = new Date()) {
  if (!Array.isArray(horarios) || !horarios.some((d) => d?.length)) return { aberto: true, texto: '' };
  const dia = agora.getDay(), m = agora.getHours() * 60 + agora.getMinutes();
  const ontem = horarios[(dia + 6) % 7] || [];
  for (const [a, f] of ontem) if (min(f) < min(a) && m < min(f)) return { aberto: true, texto: `Aberto até ${f}` };
  for (const [a, f] of horarios[dia] || []) {
    const fim = min(f) <= min(a) ? 24 * 60 + min(f) : min(f);
    if (m >= min(a) && m < fim) return { aberto: true, texto: `Aberto até ${f}` };
  }
  for (const [a] of horarios[dia] || []) if (min(a) > m) return { aberto: false, texto: `Fechado agora · abre hoje às ${a}` };
  for (let k = 1; k <= 7; k++) { const d = (dia + k) % 7; if (horarios[d]?.length) return { aberto: false, texto: `Fechado agora · abre ${k === 1 ? 'amanhã' : DIAS[d]} às ${horarios[d][0][0]}` }; }
  return { aberto: false, texto: 'Fechado' };
}
export const textoHorarios = (horarios) => DIAS.map((n, d) => [n, (horarios?.[d] || []).map(([a, f]) => `${a}–${f}`).join(' e ') || 'fechado']);

// como um complemento aparece na comanda e na cozinha: escolha ("Ponto da carne: Ao ponto") ou acréscimo ("+ Bacon")
export const rotAdic = (a) => { const n = String(a?.nome || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); return n.includes(': ') ? n : `+ ${n}`; };
