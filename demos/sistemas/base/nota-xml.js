// =============================================================
// Linha Nexo · conferência da nota do fornecedor (XML) antes de dar entrada
// -------------------------------------------------------------
// Muitas notas vêm por embalagem fechada (1 CX, 1 FD, 1 PCT) e a loja vende por unidade.
// Para cada item, a pessoa confere (ou o sistema sugere):
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
  const lembrados = app.db.cfg.fatores_xml || {};
  const fat0 = linhas.map((l) => lembrados[chaveFator(cnpj, l.codigo)] || sugerirFator(l.un, l.nome));
  const linhaHTML = (l, i) => {
    const f = fat0[i], cu = n2(l.custo / f), pr = l.preco || n2(Math.min(l.pmc || 1e9, cu * (1 + margem / 100)));
    return `<tr data-i="${i}"><td style="min-width:190px"><span class="prim">${esc(l.nome)}</span><span class="sub mono">${esc(l.ean || l.codigo || '')}${l.extra ? ` · ${l.extra}` : ''}</span><select name="p${i}" style="width:100%;margin-top:6px">${l.produtos}</select></td>
      <td class="n" style="white-space:nowrap">${num(l.qtd, 3)} ${esc(l.un || '')}<span class="sub">${moeda(l.custo)} cada</span></td>
      <td class="n"><input data-c="fator" type="number" min="1" step="1" value="${f}" style="width:70px;height:30px;text-align:right" aria-label="Unidades por embalagem"></td>
      <td class="n"><b data-c="entra">${num(l.qtd * f, 3)}</b><span class="sub">${esc(l.unidadeVenda || 'un')}</span></td>
      <td class="n"><div class="prefixo" style="width:110px"><span>R$</span><input data-c="custo" inputmode="decimal" value="${String(cu).replace('.', ',')}" style="height:30px;text-align:right"></div></td>
      <td class="n"><div class="prefixo" style="width:110px"><span>R$</span><input data-c="preco" inputmode="decimal" value="${String(pr).replace('.', ',')}" style="height:30px;text-align:right"></div><span class="sub" data-c="margem"></span></td></tr>`;
  };
  const corpo = `<div class="col" style="gap:10px"><div class="dica">${ic('info')}<span>${dica} Se a nota veio por embalagem fechada (caixa, fardo, pacote), informe quantas unidades vêm em cada uma: o sistema calcula o que entra no estoque e o custo de cada unidade. Ajuste o custo e o preço se quiser.</span></div>
    <div class="flex" style="gap:8px;align-items:center;font-size:12.5px"><label class="flex" style="gap:6px">Margem para preços em branco<input data-margem type="number" min="0" max="500" value="${margem}" style="width:64px;height:28px;text-align:right">%</label><button type="button" class="btn peq" data-aplicar-margem>Aplicar a todos</button></div>
    <div class="tabela-caixa" style="max-height:52vh;overflow:auto"><table class="tabela"><thead><tr><th>Item da nota e produto no sistema</th><th class="n">Na nota</th><th class="n">Unid. por embalagem</th><th class="n">Entra no estoque</th><th class="n">Custo unitário</th><th class="n">Preço de venda</th></tr></thead><tbody>${linhas.map(linhaHTML).join('')}</tbody></table></div>${rodape}</div>`;
  const recalcular = (tr, mudou) => {
    const i = Number(tr.dataset.i), l = linhas[i], g = (c) => tr.querySelector(`[data-c="${c}"]`);
    const f = Math.max(1, Math.round(lerN(g('fator').value)) || 1);
    if (mudou === 'fator') g('custo').value = String(n2(l.custo / f)).replace('.', ',');
    g('entra').textContent = num(l.qtd * f, 3);
    const cu = lerN(g('custo').value), pr = lerN(g('preco').value), m = g('margem');
    m.textContent = pr ? `margem ${num(((pr - cu) / pr) * 100, 1)}%${l.pmc && pr > l.pmc ? ' · acima do PMC' : ''}` : '';
    m.className = `sub ${pr && (pr < cu || (l.pmc && pr > l.pmc)) ? 'er-tx' : ''}`;
  };
  return modal({ titulo, largura: 1040, corpo,
    aoAbrir: (fm) => {
      fm.querySelectorAll('tr[data-i]').forEach((tr) => recalcular(tr));
      fm.addEventListener('input', (e) => { const tr = e.target.closest('tr[data-i]'); if (tr) recalcular(tr, e.target.dataset.c); });
      fm.querySelector('[data-aplicar-margem]').addEventListener('click', () => { const mg = lerN(fm.querySelector('[data-margem]').value);
        fm.querySelectorAll('tr[data-i]').forEach((tr) => { const l = linhas[Number(tr.dataset.i)], cu = lerN(tr.querySelector('[data-c="custo"]').value); tr.querySelector('[data-c="preco"]').value = String(n2(Math.min(l.pmc || 1e9, cu * (1 + mg / 100)))).replace('.', ','); recalcular(tr); }); });
    },
    botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Dar entrada no estoque', classe: 'pri', acao: (fm) => {
      const out = [...fm.querySelectorAll('tr[data-i]')].map((tr) => { const i = Number(tr.dataset.i), l = linhas[i], f = Math.max(1, Math.round(lerN(tr.querySelector('[data-c="fator"]').value)) || 1);
        return { produto: fm.querySelector(`[name="p${i}"]`).value, fator: f, entra: n2(l.qtd * f), custo: n2(lerN(tr.querySelector('[data-c="custo"]').value)), preco: n2(lerN(tr.querySelector('[data-c="preco"]').value)) }; });
      // lembra o fator de cada item deste fornecedor para a próxima nota
      const mem = { ...(app.db.cfg.fatores_xml || {}) }; out.forEach((o, i) => { mem[chaveFator(cnpj, linhas[i].codigo)] = o.fator; });
      app.db.cfg.fatores_xml = mem; app.db.gravar();
      // campos extras do rodapé (ex.: depósito de entrada), marcados com data-extra
      out.extra = Object.fromEntries([...fm.querySelectorAll('[data-extra]')].map((x) => [x.name, x.value]));
      return out;
    } }] });
}
