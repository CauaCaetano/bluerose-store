// Popina · as opções de um prato, iguais para o garçom e para o cliente do cardápio online:
// tamanho, meio a meio (pizza), complementos (obrigatórios ou não, com mínimo, máximo e preço), adicionais, peso (por quilo),
// observação e quantidade. Não depende dos dados do restaurante: recebe a lista de produtos.
const din = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const t = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const curto = (p) => String(p.nome).replace(/^Pizza (de )?/i, '');
export const OBS_RAPIDAS = ['Sem cebola', 'Sem tomate', 'Sem maionese', 'Bem passado', 'Ao ponto', 'Sem gelo', 'Para viagem'];
// precisa abrir as opções? (sem nada para escolher, o + já lança direto)
export const temOpcoes = (p) => !!(p.tamanhos?.length || p.pizza || p.porKg || p.grupos?.length || p.adicionais?.length);
export const precoTamP = (p, tam) => (tam && p.tamanhos?.length ? (Number(p.tamanhos.find((x) => x.nome === tam)?.preco) || p.preco) : p.preco);

export function formOpcoes(p, { produtos = [], obs = true, garcom = false } = {}) {
  const s = { qtd: 1, tam: p.tamanhos?.length ? p.tamanhos[p.tamanhos.length - 1].nome : '', meia: '', kg: '' };
  const pizzas = p.pizza ? produtos.filter((x) => x.pizza && x.ativo !== false && x.id !== p.id) : [];
  const grupos = (p.grupos || []).filter((g) => g?.opcoes?.length);
  const html = `
    ${p.porKg ? `<label class="campo"><span>Peso na balança (kg)</span><input data-kg inputmode="decimal" placeholder="Ex.: 0,450" autocomplete="off"><small>Preço do quilo: ${din(p.preco)}</small></label>` : ''}
    ${p.tamanhos?.length ? `<fieldset class="op-grupo"><legend>Tamanho <em>escolha 1</em></legend>${p.tamanhos.map((x) => `<label class="op"><input type="radio" name="tam" value="${t(x.nome)}" ${x.nome === s.tam ? 'checked' : ''}><span>${t(x.nome)}</span><b>${din(x.preco)}</b></label>`).join('')}</fieldset>` : ''}
    ${pizzas.length ? `<fieldset class="op-grupo"><legend>Meio a meio? <em>opcional · cobra o sabor mais caro</em></legend>
      <label class="op"><input type="radio" name="meia" value="" checked><span>Inteira de ${t(curto(p).toLowerCase())}</span></label>
      ${pizzas.map((x) => `<label class="op"><input type="radio" name="meia" value="${t(x.id)}"><span>½ ${t(curto(p).toLowerCase())} + ½ ${t(curto(x).toLowerCase())}</span></label>`).join('')}</fieldset>` : ''}
    ${grupos.map((g, k) => { const min = Number(g.min) || 0, max = Number(g.max) || 1;
      return `<fieldset class="op-grupo" data-g="${k}"><legend>${t(g.nome)} <em>${min ? `obrigatório${max > 1 ? ` · ${min === max ? min : `de ${min} a ${max}`}` : ''}` : `opcional${max > 1 ? ` · até ${max}` : ''}`}</em></legend>
      ${g.opcoes.map((o, j) => `<label class="op"><input type="${max === 1 ? 'radio' : 'checkbox'}" name="g${k}" value="${j}"><span>${t(o.nome)}</span>${Number(o.preco) ? `<b>+ ${din(o.preco)}</b>` : ''}</label>`).join('')}</fieldset>`; }).join('')}
    ${p.adicionais?.length ? `<fieldset class="op-grupo"><legend>Adicionais <em>opcional</em></legend>${p.adicionais.map((a, j) => `<label class="op"><input type="checkbox" name="adic" value="${j}"><span>${t(a.nome)}</span><b>+ ${din(a.preco)}</b></label>`).join('')}</fieldset>` : ''}
    ${obs ? `<fieldset class="op-grupo"><legend>Observação <em>opcional</em></legend>${garcom ? `<div class="chips quebra">${OBS_RAPIDAS.map((o) => `<button type="button" class="chip" data-obs="${t(o)}">${t(o)}</button>`).join('')}</div>` : ''}
      <input data-livre maxlength="120" placeholder="${garcom ? 'Ou escreva aqui' : 'Ex.: sem cebola'}" aria-label="Observação"></fieldset>` : ''}
    ${p.porKg ? '' : '<div class="qtd" role="group" aria-label="Quantidade"><button type="button" data-menos aria-label="Menos um">−</button><b data-q>1</b><button type="button" data-mais aria-label="Mais um">+</button></div>'}`;
  let el = null;
  const escolhidas = () => {
    const l = [];
    grupos.forEach((g, k) => [...el.querySelectorAll(`[name="g${k}"]:checked`)].forEach((i) => { const o = g.opcoes[Number(i.value)]; l.push({ nome: `${g.nome}: ${o.nome}`, preco: Number(o.preco) || 0 }); }));
    [...el.querySelectorAll('[name=adic]:checked')].forEach((i) => { const a = p.adicionais[Number(i.value)]; l.push({ nome: a.nome, preco: Number(a.preco) || 0 }); });
    return l;
  };
  const kg = () => { const v = String(el?.querySelector('[data-kg]')?.value || '').replace(',', '.'); const n = Number(v); return n > 0 && n < 30 ? Math.round(n * 1000) / 1000 : 0; };
  const unit = () => {
    if (p.porKg) return Math.round(p.preco * kg() * 100) / 100 + escolhidas().reduce((a, o) => a + o.preco, 0);
    let b = precoTamP(p, s.tam); const m = s.meia && produtos.find((x) => x.id === s.meia); if (m) b = Math.max(b, precoTamP(m, s.tam));
    return b + escolhidas().reduce((a, o) => a + o.preco, 0);
  };
  // o que falta escolher (grupo obrigatório ou acima do máximo), ou '' quando está tudo certo
  const falta = () => {
    if (p.porKg && !kg()) return 'Escreva o peso em kg';
    for (const [k, g] of grupos.entries()) { const n = el.querySelectorAll(`[name="g${k}"]:checked`).length, min = Number(g.min) || 0, max = Number(g.max) || 1; if (n < min) return `Escolha ${g.nome.toLowerCase()}`; if (n > max) return `${g.nome}: no máximo ${max}`; }
    return '';
  };
  return {
    html,
    ligar(raiz, mudou = () => {}) {
      el = raiz;
      raiz.querySelectorAll('[name=tam]').forEach((i) => { i.onchange = () => { s.tam = i.value; mudou(); }; });
      raiz.querySelectorAll('[name=meia]').forEach((i) => { i.onchange = () => { s.meia = i.value; mudou(); }; });
      raiz.querySelectorAll('.op-grupo input, [data-kg]').forEach((i) => { i.addEventListener('input', mudou); i.addEventListener('change', mudou); });
      // grupos com máximo: ao passar do máximo, desmarca a opção mais antiga
      grupos.forEach((g, k) => { const max = Number(g.max) || 1; if (max > 1) raiz.querySelectorAll(`[name="g${k}"]`).forEach((i) => i.addEventListener('change', () => { const l = [...raiz.querySelectorAll(`[name="g${k}"]:checked`)]; if (l.length > max) { const outro = l.find((x) => x !== i); if (outro) outro.checked = false; mudou(); } })); });
      raiz.querySelectorAll('[data-obs]').forEach((b) => { b.onclick = () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); }; });
      raiz.querySelector('[data-menos]')?.addEventListener('click', () => { s.qtd = Math.max(1, s.qtd - 1); raiz.querySelector('[data-q]').textContent = s.qtd; mudou(); });
      raiz.querySelector('[data-mais]')?.addEventListener('click', () => { s.qtd = Math.min(50, s.qtd + 1); raiz.querySelector('[data-q]').textContent = s.qtd; mudou(); });
      mudou();
    },
    total: () => Math.round(unit() * (p.porKg ? 1 : s.qtd) * 100) / 100,
    falta,
    valor() {
      const obsL = [...el.querySelectorAll('[data-obs][aria-pressed=true]')].map((b) => b.dataset.obs), livre = el.querySelector('[data-livre]')?.value.trim();
      return { prodId: p.id, qtd: p.porKg ? 1 : s.qtd, tam: s.tam, meia: s.meia ? { a: p.id, b: s.meia } : null, kg: kg(), adic: escolhidas(), obs: [...obsL, livre].filter(Boolean).join(', ') };
    },
  };
}
// horário de funcionamento: aberto agora? (horarios[dia] = [[abre, fecha], ...]; fecha depois da meia-noite vale)
const min = (h) => { const [a, b] = String(h || '0:0').split(':').map(Number); return (a || 0) * 60 + (b || 0); };
export function abertoAgora(horarios = [], agora = new Date()) {
  if (!Array.isArray(horarios) || !horarios.some((d) => d?.length)) return true; // sem horários: não fecha o cardápio
  const m = agora.getHours() * 60 + agora.getMinutes(), d = agora.getDay(), ontem = (d + 6) % 7;
  if ((horarios[d] || []).some(([a, f]) => (min(f) > min(a) ? m >= min(a) && m < min(f) : m >= min(a)))) return true;
  return (horarios[ontem] || []).some(([a, f]) => min(f) <= min(a) && m < min(f));
}
export const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const textoHorarios = (horarios = []) => DIAS.map((n, k) => `${n}: ${(horarios[k] || []).length ? horarios[k].map(([a, f]) => `${a} às ${f}`).join(' e ') : 'fechado'}`);
