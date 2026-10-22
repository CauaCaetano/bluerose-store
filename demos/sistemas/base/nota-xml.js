// =============================================================
// Veltria · conferência da nota do fornecedor (XML) antes de dar entrada
// -------------------------------------------------------------
// Muitas notas vêm por embalagem fechada (1 CX, 1 FD, 1 PCT) e a loja vende por unidade.
// A nota entra como veio; em cada item, o botão Modificar abre:
//   unidades por embalagem → quanto entra no estoque e o custo de cada unidade (calculados na hora)
//   custo unitário e preço de venda → editáveis, com a margem mostrada ao lado.
// O fator escolhido fica lembrado por fornecedor e código do produto para a próxima nota.
// =============================================================
import { esc, ic, modal, moeda, num } from './nexo.js';

const EMBAL = /^(CX|CAIXA|FD|FARDO|PCT|PC|PK|PACOTE|DZ|DUZIA|EMB|KIT|BL|BLISTER|DP|DISPLAY|SC|SACO)$/i;
/** Sugere unidades por embalagem pela descrição (ex.: "CX C/12", "FD 6X1L", "PCT 10 UN") quando a nota vem por embalagem. */
export function sugerirFator(un, nome) {
  if (!EMBAL.test(String(un || '').trim())) return 1;
  const m = String(nome || '').match(/(?:C\/|COM\s+|CX\s*C?\/?\s*|FD\s*C?\/?\s*|PCT\s*C?\/?\s*|\b)(\d{1,4})\s*(?:X\b|UN\b|UNID|UNIDADES|PECAS|PÇ|LATAS|GARRAFAS)/i) || String(nome || '').match(/C\/\s*(\d{1,4})/i);
  const n = m ? Number(m[1]) : 0;
  return n > 1 && n <= 1000 ? n : 1;
}
const chaveFator = (cnpj, codigo) => `${String(cnpj || '').replace(/\D/g, '')}|${codigo || ''}`;
const n2 = (v) => Math.round(Number(v || 0) * 100) / 100;
const lerN = (s) => Number(String(s ?? '').replace(/\./g, '').replace(',', '.')) || 0;

/**
 * Abre a janela de conferência. linhas: [{ nome, codigo, ean, qtd, un, custo, extra (html), produtos (html das <option>), produto (id ou ''), preco, pmc, unidadeVenda }]
 * Devolve null (cancelou) ou [{ produto, fator, entra, custo, preco }] na mesma ordem.
 */
export async function conferirNota(app, { titulo, dica, cnpj, linhas, margem = 40, rodape = '' }) {
  // a nota abre como veio (1 unidade por item da nota); só muda se a pessoa clicar em Modificar.
  // O que ela já ajustou antes para este fornecedor e produto é lembrado.
  const lembrados = app.db.cfg.fatores_xml || {};
  const fat0 = linhas.map((l) => lembrados[chaveFator(cnpj, l.codigo)] || 1);
  const R = (v) => moeda(v), vir = (v) => String(n2(v)).replace('.', ',');
  const linhaHTML = (l, i) => {
    const f = fat0[i], cu = n2(l.custo / f), pr = l.preco || n2(Math.min(l.pmc || 1e9, cu * (1 + margem / 100))), sug = sugerirFator(l.un, l.nome);
    return `<tr data-i="${i}"><td style="min-width:200px"><span class="prim">${esc(l.nome)}</span><span class="sub mono">${esc(l.ean || l.codigo || '')}${l.extra ? ` · ${l.extra}` : ''}</span><select name="p${i}" style="width:100%;margin-top:6px">${l.produtos}</select>
        ${sug > 1 && f === 1 ? `<span class="sub al-tx" data-dica-cx>Parece embalagem com ${sug} unidades: clique em Modificar se quiser contar por unidade.</span>` : ''}</td>
      <td class="n" style="white-space:nowrap">${num(l.qtd, 3)} ${esc(l.un || '')}<span class="sub">${R(l.custo)} cada</span></td>
      <td class="n" style="white-space:nowrap"><span data-ver="entra"></span><span data-ed hidden><span class="sub" style="margin-bottom:3px">unid. por ${esc((l.un || 'emb.').toLowerCase())}</span><input data-c="fator" type="number" min="1" step="1" value="${f}" data-sug="${sug}" style="width:70px;height:30px;text-align:right" aria-label="Unidades por embalagem"></span></td>
      <td class="n" style="white-space:nowrap"><span data-ver="custo"></span><span data-ed hidden><input data-c="custo" inputmode="decimal" value="${vir(cu)}" style="width:90px;height:30px;text-align:right" aria-label="Custo unitário"></span></td>
      <td class="n" style="white-space:nowrap"><span data-ver="preco"></span><span data-ed hidden><input data-c="preco" inputmode="decimal" value="${vir(pr)}" style="width:90px;height:30px;text-align:right" aria-label="Preço de venda"></span><span class="sub" data-c="margem"></span></td>
      <td class="acoes"><button type="button" class="btn peq" data-modificar>${ic('pencil-simple')}Modificar</button></td></tr>`;
  };
  const corpo = `<div class="col" style="gap:10px"><div class="dica">${ic('info')}<span>${dica} A nota entra como veio. Para mudar a quantidade por embalagem, o custo ou o preço de um item, clique em <b>Modificar</b> na linha dele.</span></div>
    <div class="tabela-caixa" style="max-height:56vh;overflow:auto"><table class="tabela"><thead><tr><th>Item da nota e produto no sistema</th><th class="n">Na nota</th><th class="n">Entra no estoque</th><th class="n">Custo unitário</th><th class="n">Preço de venda</th><th></th></tr></thead><tbody>${linhas.map(linhaHTML).join('')}</tbody></table></div>${rodape}</div>`;
  const recalcular = (tr, mudou) => {
    const i = Number(tr.dataset.i), l = linhas[i], g = (c) => tr.querySelector(`[data-c="${c}"]`), ver = (c) => tr.querySelector(`[data-ver="${c}"]`);
    const f = Math.max(1, Math.round(lerN(g('fator').value)) || 1);
    // produto novo (sem preço no sistema): o preço sugerido acompanha o custo por unidade
    if (mudou === 'fator') { g('custo').value = vir(l.custo / f); if (!l.preco) g('preco').value = vir(Math.min(l.pmc || 1e9, (l.custo / f) * (1 + margem / 100))); }
    const cu = lerN(g('custo').value), pr = lerN(g('preco').value), m = g('margem');
    ver('entra').innerHTML = `<b>${num(l.qtd * f, 3)}</b> ${esc(f > 1 ? (l.unidadeVenda || 'un') : (l.un || 'un'))}${f > 1 ? `<span class="sub">${f} por ${esc((l.un || 'emb.').toLowerCase())}</span>` : ''}`;
    ver('custo').textContent = R(cu); ver('preco').textContent = R(pr);
    m.textContent = pr ? `margem ${num(((pr - cu) / pr) * 100, 1)}%${l.pmc && pr > l.pmc ? ' · acima do PMC' : ''}` : '';
    m.className = `sub ${pr && (pr < cu || (l.pmc && pr > l.pmc)) ? 'er-tx' : ''}`;
  };
  return modal({ titulo, largura: 1000, corpo,
    aoAbrir: (fm) => {
      fm.querySelectorAll('tr[data-i]').forEach((tr) => recalcular(tr));
      fm.addEventListener('input', (e) => { const tr = e.target.closest('tr[data-i]'); if (tr) recalcular(tr, e.target.dataset.c); });
      fm.addEventListener('click', (e) => {
        const b = e.target.closest('[data-modificar]'); if (!b) return;
        const tr = b.closest('tr'), abrir = !tr.classList.contains('editando');
        tr.classList.toggle('editando', abrir);
        tr.querySelectorAll('[data-ed]').forEach((x) => { x.hidden = !abrir; });
        tr.querySelectorAll('[data-ver]').forEach((x) => { x.hidden = abrir; });
        b.innerHTML = abrir ? `${ic('check')}Pronto` : `${ic('pencil-simple')}Modificar`;
        if (abrir) { const fa = tr.querySelector('[data-c="fator"]'); if (Number(fa.value) === 1 && Number(fa.dataset.sug) > 1) { fa.value = fa.dataset.sug; recalcular(tr, 'fator'); } tr.querySelector('[data-dica-cx]')?.remove(); fa.focus(); }
        else recalcular(tr);
      });
    },
    botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Dar entrada no estoque', classe: 'pri', acao: (fm) => {
      const out = [...fm.querySelectorAll('tr[data-i]')].map((tr) => { const i = Number(tr.dataset.i), l = linhas[i], f = Math.max(1, Math.round(lerN(tr.querySelector('[data-c="fator"]').value)) || 1);
        return { produto: fm.querySelector(`[name="p${i}"]`).value, fator: f, entra: n2(l.qtd * f), custo: n2(lerN(tr.querySelector('[data-c="custo"]').value)), preco: n2(lerN(tr.querySelector('[data-c="preco"]').value)) }; });
      // lembra o que a pessoa ajustou neste fornecedor e produto para a próxima nota
      const mem = { ...(app.db.cfg.fatores_xml || {}) }; out.forEach((o, i) => { if (o.fator > 1) mem[chaveFator(cnpj, linhas[i].codigo)] = o.fator; else delete mem[chaveFator(cnpj, linhas[i].codigo)]; });
      app.db.cfg.fatores_xml = mem; app.db.gravar();
      // campos extras do rodapé (ex.: depósito de entrada), marcados com data-extra
      out.extra = Object.fromEntries([...fm.querySelectorAll('[data-extra]')].map((x) => [x.name, x.value]));
      return out;
    } }] });
}
