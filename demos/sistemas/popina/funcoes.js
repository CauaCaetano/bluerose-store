// Popina · telas das funções da casa: regras (rodízio, pizza, happy hour, prato do dia, fidelidade, encomendas, portaria),
// reservas e fila de espera, eventos, encomendas, vitrine do dia, portaria e o painel de retirada das senhas.
// Cada tela só aparece com a função ligada (Gestão › Aparência e templates).
import { db, t, din, dinCurto, grava, r2, uid, tempo, lojaCfg, setLoja, tem, comandaDaMesa, abrirMesa, conta, itensValidos, ouvir,
  abrirCartao, cartaoAberto, proximoCartao, vitrineHoje, prod, couvertLigado, marcar, insumo, saldo, fmtQtd, custoPrato, registrarPerda, auditar, quemAgora,
  clientePorTel, fidelidade, vencePremio, ajustarEstoque } from './loja.js?v=34';
import { registrar, acao, ir } from './nucleo.js?v=34';
import { ico, folha, toast, confirma, bip, $, $$ } from './ui.js?v=34';
import { TELAS_MAIS, MONTAR, volta, PAINEL_TIPO } from './mais.js?v=34';
import { abrirSeletor } from './salao.js?v=34';
import { TIPOS_RODIZIO, ymd, TURNOS, loteAtual, lotacao, antesDe, noite, estadoBarril, fecharBarril, orcamentoEvento, pessoasRodizio, ESTACOES_PADRAO, faixasDoKg, estadoGarrafa, perdaGarrafa, comissaoPromoter } from './precos.js?v=34';
import { resumoCamarotes } from './tipos.js?v=34';

const num = (v) => { const s = String(v ?? '').trim(); return Number(/,/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s) || 0; };
const vir = (n) => String(n ?? '').replace('.', ',');
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DIAS_C = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const zap = (tel, msg) => `https://wa.me/55${String(tel || '').replace(/\D/g, '').replace(/^55/, '')}?text=${encodeURIComponent(msg)}`;
const dataBR = (d) => new Date(`${d}T12:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
const somaDia = (d, n) => { const x = new Date(`${d}T12:00`); x.setDate(x.getDate() + n); return ymd(x.getTime()); };
const chipsDe = (lista, sel, nome) => `<div class="chips quebra">${lista.map(([v, n]) => `<label class="chip ${sel.includes(v) ? 'on' : ''}"><input type="checkbox" name="${nome}" value="${t(v)}" ${sel.includes(v) ? 'checked' : ''} hidden>${t(n)}</label>`).join('')}</div>`;
const ligaChips = (el) => el.addEventListener('change', (e) => { const i = e.target; if (i.matches('.chip input[type=checkbox]')) i.closest('.chip').classList.toggle('on', i.checked); });

// ------------------------------------------------------------------ regras das funções (o dono ajusta; só as ligadas aparecem)
TELAS_MAIS.funcoes = () => {
  const L = lojaCfg(), R = L.rodizio || {}, F = L.fracoes || {}, FI = L.fidelidade || {}, PO = L.portaria || {}, prods = db.produtos.map((p) => [p.id, p.nome]);
  const s = [];
  if (tem('rodizio')) s.push(`<section class="bloco-form"><h2>Rodízio</h2><p class="mudo">Preço por pessoa. Os itens marcados entram na conta com preço zero; os outros são cobrados à parte.</p>
    <div class="tres-c">${TIPOS_RODIZIO.filter(([k]) => k !== 'fora').map(([k, n]) => `<label class="campo"><span>${n}${['meia', 'vegetariano', 'buffet'].includes(k) ? ' (opcional)' : ''}</span><input name="rod_${k}" inputmode="decimal" value="${R[k] ? vir(R[k]) : ''}" placeholder="0,00"></label>`).join('')}</div>
    ${tem('rodadas') ? `<label class="campo"><span>Pedido por rodada: peças inclusas por pessoa a cada rodada (0 = sem limite)</span><input name="rod_rodada" inputmode="numeric" value="${R.porRodada || ''}" placeholder="Ex.: 6"></label>
      <div class="campo"><span>Limite por categoria (vazio = o limite geral acima; 0 = sem limite nesta categoria)</span><div class="rodada-cats">${db.categorias.filter((c) => db.produtos.some((p) => p.cat === c.id)).map((c) => `<label class="campo"><span>${t(c.nome)}</span><input name="rc_${c.id}" inputmode="numeric" value="${R.rodadaCat?.[c.id] ?? ''}" placeholder="geral"></label>`).join('')}</div></div>` : ''}
    <div class="campo"><span>Inclusos no rodízio</span>${chipsDe(prods, R.inclusos || [], 'rod_inc')}</div></section>`);
  if (tem('meiaMeia')) s.push(`<section class="bloco-form"><h2>Pizza em frações e bordas</h2>
    <label class="campo"><span>Preço da pizza com mais de um sabor</span><select name="fr_regra"><option value="caro" ${F.regra !== 'proporcional' ? 'selected' : ''}>Cobra o sabor mais caro</option><option value="proporcional" ${F.regra === 'proporcional' ? 'selected' : ''}>Proporcional (média dos sabores)</option></select></label>
    <label class="campo"><span>Bordas: uma por linha, com o preço de cada tamanho do menor para o maior. Ex.: Catupiry | 6 | 9</span><textarea name="fr_bordas" rows="4" placeholder="Catupiry | 6 | 9">${t((F.bordas || []).map((b) => [b.nome, ...(b.precos || []).map(vir)].join(' | ')).join('\n'))}</textarea></label></section>`);
  if (tem('happyHour')) s.push(`<section class="bloco-form"><h2>Happy hour</h2><p class="mudo">O preço especial entra sozinho no horário, no sistema e no cardápio do cliente.</p>
    <ul class="regras-hh">${(L.happyHour || []).map((h) => `<li><div><b>${t(h.nome || 'Happy hour')}</b><small>${(h.dias || []).map((d) => DIAS_C[d]).join(', ')} · ${t(h.de)} às ${t(h.ate)} · ${h.tipo === '%' ? `${vir(h.valor)}% off` : `por ${din(h.valor)}`} · ${h.alvo === 'cat' ? 'categorias' : 'produtos'}: ${t((h.ids || []).map((id) => (h.alvo === 'cat' ? db.categorias.find((c) => c.id === id)?.nome : prod(id)?.nome) || id).join(', '))}</small></div>
      <label class="interruptor"><input type="checkbox" data-acao="hh-ativo" data-id="${h.id}" ${h.ativo !== false ? 'checked' : ''}><span></span></label><button type="button" class="bt-ico" data-acao="hh-ed" data-id="${h.id}" aria-label="Editar">${ico('ajustes')}</button></li>`).join('') || '<li class="vazio">Nenhuma regra ainda.</li>'}</ul>
    <button type="button" class="link" data-acao="hh-ed">+ Regra de happy hour</button></section>`);
  if (tem('pratoDoDia')) s.push(`<section class="bloco-form"><h2>Prato do dia</h2><p class="mudo">Um prato por dia da semana com preço especial. Fica no topo do cardápio e o preço vale só no dia.</p>
    <ul class="pratos-dia">${DIAS.map((d, k) => { const x = (L.pratoDoDia || [])[k] || {}; return `<li><b>${d}</b><select name="pd_prod_${k}" aria-label="Prato de ${d}"><option value="">Sem prato do dia</option>${db.produtos.filter((p) => !p.porKg).map((p) => `<option value="${p.id}" ${x.prod === p.id ? 'selected' : ''}>${t(p.nome)} (${din(p.preco)})</option>`).join('')}</select><input name="pd_preco_${k}" inputmode="decimal" value="${x.preco ? vir(x.preco) : ''}" placeholder="Preço do dia" aria-label="Preço de ${d}"></li>`; }).join('')}</ul></section>`);
  if (tem('fidelidade')) s.push(`<section class="bloco-form"><h2>Cartão fidelidade</h2><p class="mudo">Um carimbo a cada compra paga com o telefone do cliente. Ao completar, o caixa vê o botão “Dar prêmio”.</p>
    <div class="tres-c"><label class="campo"><span>Compras para o prêmio</span><input name="fi_compras" inputmode="numeric" value="${FI.compras || 10}"></label><label class="campo"><span>Valor mínimo por compra (R$)</span><input name="fi_min" inputmode="decimal" value="${FI.minimo ? vir(FI.minimo) : ''}" placeholder="0,00"></label><label class="campo"><span>Prêmio</span><input name="fi_premio" value="${t(FI.premio || '')}" placeholder="Ex.: Uma pizza broto"></label></div>
    <label class="campo"><span>O prêmio vale por (dias depois de completar o cartão; 0 = não vence)</span><input name="fi_val" inputmode="numeric" value="${FI.validade || 0}"></label>
    <p class="mudo">O que vale carimbo: sem nada marcado, a compra toda. Marcando categorias ou produtos, só eles contam (e o mínimo vale sobre eles).</p>
    <div class="campo"><span>Categorias que valem</span>${chipsDe(db.categorias.map((c) => [c.id, c.nome]), FI.alvo === 'cat' ? FI.ids || [] : [], 'fi_cat')}</div>
    <div class="campo"><span>Ou produtos que valem</span>${chipsDe(prods, FI.alvo === 'prod' ? FI.ids || [] : [], 'fi_prod')}</div></section>`);
  if (tem('encomendas')) s.push(`<section class="bloco-form"><h2>Encomendas</h2><label class="campo"><span>Antecedência mínima (horas)</span><input name="enc_ant" inputmode="numeric" value="${L.encomendas?.antecedencia ?? 24}"></label></section>`);
  if (tem('portaria')) s.push(`<section class="bloco-form"><h2>Portaria</h2><label class="campo"><span>Capacidade da casa (pessoas)</span><input name="po_cap" inputmode="numeric" value="${PO.capacidade || ''}" placeholder="Ex.: 300"></label>
    <label class="campo"><span>Tipos de ingresso: um por linha, com preço e consumação mínima. Ex.: Pista | 40 | 30</span><textarea name="po_ing" rows="4" placeholder="Pista | 40 | 30">${t((PO.ingressos || []).map((x) => `${x.nome} | ${vir(x.preco)} | ${vir(x.consumacao || 0)}`).join('\n'))}</textarea></label>
    <label class="campo"><span>Lotes: um por linha, na ordem em que viram. Tipo | lote | preço | quantidade (0 = sem limite). Quando um lote esgota, o próximo entra sozinho.</span><textarea name="po_lotes" rows="4" placeholder="Pista | 1º lote | 30 | 100">${t((PO.ingressos || []).flatMap((x) => (x.lotes || []).map((l) => `${x.nome} | ${l.nome} | ${vir(l.preco)} | ${l.qtd || 0}`)).join('\n'))}</textarea></label>
    <div class="duas-c"><label class="campo"><span>Promoters: um por linha. Código | nome | R$ por entrada paga | % do consumo dos camarotes</span><textarea name="po_prom" rows="3" placeholder="ANA | Ana Clara | 5 | 10">${t((PO.promoters || []).map((x) => [x.codigo, x.nome, ...(x.porEntrada || x.pctConsumo ? [vir(x.porEntrada || 0), vir(x.pctConsumo || 0)] : [])].join(' | ')).join('\n'))}</textarea></label>
      <label class="campo"><span>Consumação mínima de quem entra pela lista VIP (R$)</span><input name="po_vipc" inputmode="decimal" value="${PO.vipConsumacao ? vir(PO.vipConsumacao) : ''}" placeholder="0,00"></label></div></section>`);
  if (tem('comandaIndividual')) s.push(`<section class="bloco-form"><h2>Comanda individual</h2><label class="campo"><span>Taxa do cartão perdido (R$), cobrada na conta do cartão marcado como perdido</span><input name="ci_taxa" inputmode="decimal" value="${L.taxaCartaoPerdido ? vir(L.taxaCartaoPerdido) : ''}" placeholder="0,00"></label></section>`);
  if (couvertLigado()) s.push(`<section class="bloco-form"><h2>Couvert</h2><label class="campo"><span>Couvert por pessoa (R$), cobrado na conta da mesa</span><input name="couvert" inputmode="decimal" value="${L.couvert ? vir(L.couvert) : ''}" placeholder="0,00"></label></section>`);
  regrasRodada4(L, s, prods);
  // cardápio por turno: vale para todos os tipos de negócio
  const TU = L.turnos || {};
  s.push(`<section class="bloco-form"><h2>Cardápio por turno</h2><p class="mudo">Pratos e categorias marcados “só no almoço” ou “só no jantar” somem do cardápio do cliente fora do horário; o garçom vê “só no almoço”. Marque no prato (Cardápio › editar) ou na categoria.</p>
    <label class="interruptor bloco-int"><input type="checkbox" name="tu_on" ${TU.ligado ? 'checked' : ''}><span></span>Usar cardápio por turno</label>
    <div class="duas-c">${TURNOS.map(([k, n]) => `<div class="campo"><span>${n}</span><div class="duas-c"><input name="tu_${k}_de" type="time" value="${t(TU[k]?.[0] || (k === 'almoco' ? '11:00' : '18:00'))}" aria-label="${n}: começa"><input name="tu_${k}_ate" type="time" value="${t(TU[k]?.[1] || (k === 'almoco' ? '15:00' : '23:30'))}" aria-label="${n}: termina"></div></div>`).join('')}</div></section>`);
  return volta('mais', 'Regras das funções', 'Preços e regras das funções ligadas para o seu tipo de negócio') + `<form class="form larga" data-funcoes>${s.join('')}
    <div class="salvar-fixo"><button class="bt cheio grande">Salvar</button></div></form>`;
};
MONTAR.funcoes = (el) => {
  const f = $('[data-funcoes]', el); if (!f) return; ligaChips(f);
  f.onsubmit = (e) => {
    e.preventDefault(); const L = lojaCfg(), p = {};
    const linhas = (v) => v.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((x) => x[0]);
    if (f.rod_adulto) {
      const rc = {}; $$('[name^=rc_]', f).forEach((i) => { if (i.value.trim() !== '') rc[i.name.slice(3)] = Math.max(0, Math.round(num(i.value))); });
      p.rodizio = { ...(L.rodizio || {}), adulto: r2(num(f.rod_adulto.value)), crianca: r2(num(f.rod_crianca.value)), meia: r2(num(f.rod_meia.value)), vegetariano: r2(num(f.rod_vegetariano?.value)), buffet: r2(num(f.rod_buffet?.value)), inclusos: $$('[name=rod_inc]:checked', f).map((i) => i.value), ...(f.rod_rodada ? { porRodada: Math.max(0, Math.round(num(f.rod_rodada.value))), rodadaCat: rc } : {}) };
    }
    if (f.fr_regra) p.fracoes = { regra: f.fr_regra.value, bordas: f.fr_bordas.value.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((x) => x[0]).map(([nome, ...pr]) => ({ nome: nome.slice(0, 40), precos: pr.map(num).filter((x) => x >= 0).slice(0, 6) })) };
    if (f.pd_prod_0) p.pratoDoDia = DIAS.map((_, k) => { const id = f[`pd_prod_${k}`].value, pr = r2(num(f[`pd_preco_${k}`].value)); return id ? { prod: id, preco: pr || prod(id)?.preco || 0 } : null; });
    if (f.fi_compras) {
      const cats = $$('[name=fi_cat]:checked', f).map((i) => i.value), ps = $$('[name=fi_prod]:checked', f).map((i) => i.value);
      p.fidelidade = { compras: Math.max(1, Math.round(num(f.fi_compras.value)) || 10), minimo: r2(num(f.fi_min.value)), premio: f.fi_premio.value.trim() || 'Um prato à sua escolha',
        validade: Math.max(0, Math.round(num(f.fi_val.value))), alvo: cats.length ? 'cat' : ps.length ? 'prod' : '', ids: cats.length ? cats : ps };
    }
    if (f.enc_ant) p.encomendas = { antecedencia: Math.max(0, Math.round(num(f.enc_ant.value))) };
    if (f.po_cap) {
      const lotes = linhas(f.po_lotes.value).map(([tipo, nome, pr, q]) => ({ tipo, nome: String(nome || '').slice(0, 30), preco: r2(num(pr)), qtd: Math.max(0, Math.round(num(q))) })).filter((l) => l.nome);
      p.portaria = { ...(L.portaria || {}), capacidade: Math.max(0, Math.round(num(f.po_cap.value))), vipConsumacao: r2(num(f.po_vipc.value)),
        promoters: linhas(f.po_prom.value).map(([cod, nome, pe, pc]) => ({ codigo: cod.toUpperCase().replace(/\s+/g, '').slice(0, 12), nome: String(nome || cod).slice(0, 40), ...(num(pe) > 0 ? { porEntrada: r2(num(pe)) } : {}), ...(num(pc) > 0 ? { pctConsumo: Math.min(100, r2(num(pc))) } : {}) })),
        ingressos: linhas(f.po_ing.value).map(([nome, pr, cons]) => { const ls = lotes.filter((l) => l.tipo.toLowerCase() === nome.toLowerCase()).map(({ tipo, ...l }) => l); return { nome: nome.slice(0, 40), preco: r2(num(pr)), consumacao: r2(num(cons)), ...(ls.length ? { lotes: ls } : {}) }; }) };
    }
    if (f.ci_taxa) p.taxaCartaoPerdido = r2(num(f.ci_taxa.value));
    if (f.couvert) p.couvert = r2(num(f.couvert.value));
    if (f.tu_on) p.turnos = { ligado: f.tu_on.checked, ...Object.fromEntries(TURNOS.map(([k]) => [k, [f[`tu_${k}_de`].value || '', f[`tu_${k}_ate`].value || '']])) };
    salvarRodada4(f, L, p, linhas);
    setLoja(p); toast('Regras salvas');
  };
};
// ------------------------------------------------------------------ regras da rodada 4 (forno, embalagem, estações, combo em etapas, cota, quilo, vitrine, camarotes, porções, faturado)
const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20);
const opInsumos = (sel) => `<option value="">Nenhuma</option>${db.insumos.filter((i) => i.unid === 'un').map((i) => `<option value="${t(i.id)}" ${i.id === sel ? 'selected' : ''}>${t(i.nome)}</option>`).join('')}`;
function regrasRodada4(L, s, prods) {
  if (tem('forno')) { const FO = L.forno || {}; s.push(`<section class="bloco-form"><h2>Fila do forno</h2><p class="mudo">A cozinha vê a ordem das pizzas, a previsão de saída e o aviso de tirar do forno. O tempo vale para o tamanho que tiver o nome escrito.</p>
    <div class="duas-c"><label class="campo"><span>Pizzas no forno ao mesmo tempo</span><input name="fo_cap" inputmode="numeric" value="${FO.capacidade || 6}"></label><label class="campo"><span>Tempo padrão (minutos)</span><input name="fo_pad" inputmode="numeric" value="${FO.padrao || 10}"></label></div>
    <label class="campo"><span>Tempo por tamanho: um por linha. Tamanho | minutos. Ex.: Broto | 7</span><textarea name="fo_tempos" rows="3" placeholder="Broto | 7">${t((FO.tempos || []).map((x) => `${x.tam} | ${x.min}`).join('\n'))}</textarea></label></section>`); }
  if (tem('embalagem')) { const E = L.embalagem || {}, pz = E.pizza || [], peq = pz.find((x) => x.tam) || {}, gde = pz.find((x) => !x.tam) || {};
    s.push(`<section class="bloco-form"><h2>Embalagem automática</h2><p class="mudo">No delivery e na retirada, a caixa da pizza sai do estoque pelo tamanho; a embalagem do delivery sai uma vez por pedido. Cadastre as embalagens no Estoque (unidade).</p>
    <div class="tres-c"><label class="campo"><span>Tamanho da caixa pequena (o nome contém)</span><input name="em_tam" value="${t(peq.tam || 'Broto')}" maxlength="20"></label><label class="campo"><span>Caixa pequena</span><select name="em_peq">${opInsumos(peq.insumo)}</select></label><label class="campo"><span>Caixa dos outros tamanhos</span><select name="em_gde">${opInsumos(gde.insumo)}</select></label></div>
    <label class="campo"><span>Embalagem do delivery (uma por pedido)</span><select name="em_del">${opInsumos(E.delivery)}</select></label></section>`); }
  if (tem('estacoes')) { const ES = L.estacoes?.length ? L.estacoes : ESTACOES_PADRAO, M = L.estacaoCat || {};
    s.push(`<section class="bloco-form"><h2>Cozinha por estação</h2><p class="mudo">Cada categoria vai para uma estação (o prato pode ter a sua no cadastro). Na tela da cozinha, cada estação vê só o que é dela, e o garçom só é avisado quando todas terminam.</p>
    <label class="campo"><span>Estações: uma por linha</span><textarea name="es_nomes" rows="4">${t(ES.map((x) => x.nome).join('\n'))}</textarea></label>
    <div class="rodada-cats">${db.categorias.filter((c) => db.produtos.some((p) => p.cat === c.id && p.setor !== 'bar')).map((c) => `<label class="campo"><span>${t(c.nome)}</span><select name="es_cat_${c.id}"><option value="">Cozinha geral</option>${ES.map((x) => `<option value="${t(x.id)}" ${M[c.id] === x.id ? 'selected' : ''}>${t(x.nome)}</option>`).join('')}</select></label>`).join('')}</div></section>`); }
  if (tem('comboEtapas')) { const C = L.comboEtapas || {};
    s.push(`<section class="bloco-form"><h2>Combo em etapas</h2><p class="mudo">Depois de escolher o lanche, o cliente (e o garçom) vê “Quer transformar em combo?”: escolhe o acompanhamento e a bebida, e o desconto entra sozinho.</p>
    <label class="campo"><span>Desconto do combo (R$)</span><input name="ce_desc" inputmode="decimal" value="${vir(C.desconto ?? 8)}"></label>
    <div class="campo"><span>Categorias que oferecem o combo</span>${chipsDe(db.categorias.map((c) => [c.id, c.nome]), C.cats || [], 'ce_cat')}</div>
    <div class="campo"><span>Acompanhamentos</span>${chipsDe(prods, C.acomp || [], 'ce_ac')}</div><div class="campo"><span>Bebidas</span>${chipsDe(prods, C.bebida || [], 'ce_be')}</div></section>`); }
  if (tem('cotaAdicionais')) { const gs = db.produtos.flatMap((p) => (p.grupos || []).map((g, k) => ({ p, g, k })).filter((x) => (Number(x.g.max) || 1) > 1));
    s.push(`<section class="bloco-form"><h2>Adicionais com cota grátis</h2><p class="mudo">Nos grupos com mais de uma escolha (molhos, complementos): até quantos saem de graça e quanto custa cada um a mais (vazio = o preço da opção).</p>
    ${gs.length ? `<div class="tabela-rolo"><table class="tabela"><thead><tr><th>Prato · grupo</th><th class="num">Grátis</th><th class="num">Cada a mais (R$)</th></tr></thead><tbody>${gs.map(({ p, g, k }) => `<tr><td><b>${t(p.nome)}</b><small>${t(g.nome)} · até ${g.max}</small></td><td class="num"><input class="inv-q" name="ct_${p.id}_${k}_g" inputmode="numeric" value="${g.gratis || ''}" placeholder="0" aria-label="Grátis em ${t(g.nome)} de ${t(p.nome)}"></td><td class="num"><input class="inv-q" name="ct_${p.id}_${k}_e" inputmode="decimal" value="${g.extra != null ? vir(g.extra) : ''}" placeholder="da opção" aria-label="Preço a mais em ${t(g.nome)} de ${t(p.nome)}"></td></tr>`).join('')}</tbody></table></div>` : '<p class="vazio">Nenhum prato tem grupo com mais de uma escolha. Crie em Cardápio › editar › Complementos.</p>'}</section>`); }
  if (tem('quilo')) { const kg = db.produtos.filter((p) => p.porKg);
    s.push(`<section class="bloco-form"><h2>Venda por quilo</h2><p class="mudo">Tara em um toque: na hora de pesar, o garçom ou o caixa toca no tipo de prato e o peso dele sai sozinho.</p>
    <label class="campo"><span>Pratos e potes: um por linha. Nome | gramas. Ex.: Prato raso | 350</span><textarea name="kg_taras" rows="3" placeholder="Prato raso | 350">${t((L.taras || []).map((x) => `${x.nome} | ${x.g}`).join('\n'))}</textarea></label>
    ${kg.map((p) => `<p class="mudo"><b>${t(p.nome)}</b>: ${faixasDoKg(p).map((f) => `${f.de ? `das ${f.de}` : 'na abertura'}${f.ate ? ` até ${f.ate}` : ''} ${din(f.preco)}/kg`).join(' · ')}. Mude o preço por horário no cadastro do prato.</p>`).join('')}</section>`); }
  if (tem('vitrine')) s.push(`<section class="bloco-form"><h2>Vitrine</h2><label class="campo"><span>Desconto do que sobrou e volta amanhã (%)</span><input name="vt_desc" inputmode="numeric" value="${L.vitrineDesconto ?? 30}"></label></section>`);
  if (tem('camarotes')) s.push(`<section class="bloco-form"><h2>Camarotes</h2><p class="mudo">A consumação do camarote vira o crédito do cartão na chegada; o que não for consumido é cobrado no fim. A comissão de cada promoter fica na Portaria (código | nome | R$ por entrada | %).</p>
    <label class="campo"><span>Um por linha. Nome | capacidade | consumação (R$) | pacote</span><textarea name="cm_lista" rows="4" placeholder="Camarote 1 | 10 | 1500 | 1 whisky e 6 energéticos">${t((L.camarotes || []).map((x) => `${x.nome} | ${x.capacidade} | ${vir(x.consumacao)} | ${x.pacote || ''}`).join('\n'))}</textarea></label></section>`);
  if (tem('faturado')) s.push(`<section class="bloco-form"><h2>Conta faturada</h2><label class="campo"><span>Prazo padrão para a empresa pagar (dias)</span><input name="fa_prazo" inputmode="numeric" value="${L.faturadoPrazo ?? 30}"></label></section>`);
  if (tem('porcoesFamilia')) { const l = db.produtos.filter((p) => p.tamanhos?.length && !p.pizza && p.setor !== 'bar');
    if (l.length) s.push(`<section class="bloco-form"><h2>Porções por tamanho</h2><p class="mudo">Cada tamanho tem o seu preço e multiplica a ficha técnica (o G gasta mais insumo que o P). Ajuste em Cardápio › editar › Tamanhos (o 3º campo: quanto gasta da ficha, 1 = inteira).</p>
    <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Prato · tamanho</th><th class="num">Preço</th><th class="num">× ficha</th><th class="num">Custo</th><th class="num">Margem</th></tr></thead><tbody>${l.flatMap((p) => p.tamanhos.map((tm) => { const c = r2(custoPrato(p) * (Number(tm.fator) || 1)); return `<tr><td><b>${t(p.nome)}</b><small>${t(tm.nome)}</small></td><td class="num">${dinCurto(tm.preco)}</td><td class="num">${vir(Number(tm.fator) || 1)}×</td><td class="num">${dinCurto(c)}</td><td class="num">${tm.preco ? Math.round((1 - c / tm.preco) * 100) : 0}%</td></tr>`; })).join('')}</tbody></table></div></section>`); }
}
function salvarRodada4(f, L, p, linhas) {
  if (f.fo_cap) p.forno = { capacidade: Math.max(1, Math.round(num(f.fo_cap.value)) || 6), padrao: Math.max(1, Math.round(num(f.fo_pad.value)) || 10), tempos: linhas(f.fo_tempos.value).map(([tam, m]) => ({ tam: tam.slice(0, 30), min: Math.max(1, Math.round(num(m)) || 10) })) };
  if (f.em_del) p.embalagem = { pizza: [...(f.em_peq.value ? [{ tam: f.em_tam.value.trim() || 'Broto', insumo: f.em_peq.value }] : []), ...(f.em_gde.value ? [{ tam: '', insumo: f.em_gde.value }] : [])], delivery: f.em_del.value };
  if (f.es_nomes) {
    const velhas = L.estacoes?.length ? L.estacoes : ESTACOES_PADRAO, usadas = new Set();
    p.estacoes = f.es_nomes.value.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 10).map((nome) => { let id = velhas.find((v) => v.nome.toLowerCase() === nome.toLowerCase())?.id || slug(nome) || uid('es'); while (usadas.has(id)) id += '2'; usadas.add(id); return { id, nome: nome.slice(0, 30) }; });
    p.estacaoCat = Object.fromEntries($$('[name^=es_cat_]', f).filter((x) => x.value && p.estacoes.some((e) => e.id === x.value)).map((x) => [x.name.slice(7), x.value]));
  }
  if (f.ce_desc) p.comboEtapas = { desconto: Math.max(0, r2(num(f.ce_desc.value))), cats: $$('[name=ce_cat]:checked', f).map((i) => i.value), acomp: $$('[name=ce_ac]:checked', f).map((i) => i.value), bebida: $$('[name=ce_be]:checked', f).map((i) => i.value) };
  // cota: fica no grupo do próprio prato
  $$('[name^=ct_][name$=_g]', f).forEach((x) => { const [, ...r] = x.name.split('_'), k = Number(r.at(-2)), pid = r.slice(0, -2).join('_'), pr = prod(pid), g = pr?.grupos?.[k]; if (!g) return;
    const gr = Math.max(0, Math.round(num(x.value))), ex = f[`ct_${pid}_${k}_e`]?.value.trim() || ''; if (gr) { g.gratis = gr; if (ex !== '') g.extra = r2(num(ex)); else delete g.extra; } else { delete g.gratis; delete g.extra; } });
  if (f.kg_taras) p.taras = linhas(f.kg_taras.value).map(([nome, g]) => ({ nome: nome.slice(0, 30), g: Math.max(0, Math.min(3000, Math.round(num(g)))) })).filter((x) => x.g > 0).slice(0, 8);
  if (f.vt_desc) p.vitrineDesconto = Math.max(0, Math.min(90, Math.round(num(f.vt_desc.value))));
  if (f.cm_lista) p.camarotes = linhas(f.cm_lista.value).map(([nome, cap, cons, pac], k) => ({ id: (L.camarotes || []).find((x) => x.nome.toLowerCase() === nome.toLowerCase())?.id || `cam${Date.now().toString(36)}${k}`, nome: nome.slice(0, 30), capacidade: Math.max(1, Math.round(num(cap)) || 10), consumacao: r2(num(cons)), pacote: String(pac || '').slice(0, 120) }));
  if (f.fa_prazo) p.faturadoPrazo = Math.max(0, Math.min(180, Math.round(num(f.fa_prazo.value))));
}

// happy hour: editar uma regra (dias, horário, o que entra e o desconto)
acao('hh-ativo', (b) => { const L = lojaCfg(); setLoja({ happyHour: (L.happyHour || []).map((h) => (h.id === b.dataset.id ? { ...h, ativo: b.checked } : h)) }); });
acao('hh-ed', (b) => {
  const L = lojaCfg(), h = (L.happyHour || []).find((x) => x.id === b.dataset.id) || { id: uid('hh'), nome: 'Happy hour', dias: [1, 2, 3, 4, 5], de: '17:00', ate: '19:00', alvo: 'cat', ids: [], tipo: '%', valor: 20, ativo: true };
  const novo = !(L.happyHour || []).some((x) => x.id === h.id);
  let alvo = h.alvo;
  const alvos = () => (alvo === 'cat' ? db.categorias.map((c) => [c.id, c.nome]) : db.produtos.map((p) => [p.id, p.nome]));
  folha({ titulo: novo ? 'Nova regra de happy hour' : h.nome, corpo: `<label class="campo"><span>Nome</span><input data-n value="${t(h.nome)}" maxlength="40"></label>
    <div class="campo"><span>Dias</span>${chipsDe(DIAS_C.map((d, k) => [String(k), d]), (h.dias || []).map(String), 'hh_dia')}</div>
    <div class="duas-c"><label class="campo"><span>Das</span><input data-de type="time" value="${t(h.de)}"></label><label class="campo"><span>Até</span><input data-ate type="time" value="${t(h.ate)}"></label></div>
    <div class="duas-c"><label class="campo"><span>Desconto</span><select data-tipo><option value="%" ${h.tipo === '%' ? 'selected' : ''}>Porcentagem (%)</option><option value="R$" ${h.tipo !== '%' ? 'selected' : ''}>Preço fixo (R$)</option></select></label><label class="campo"><span>Valor</span><input data-v inputmode="decimal" value="${vir(h.valor)}"></label></div>
    <div class="campo"><span>Vale para</span><div class="seg"><button type="button" data-alvo="cat" aria-pressed="${alvo === 'cat'}">Categorias</button><button type="button" data-alvo="prod" aria-pressed="${alvo !== 'cat'}">Produtos</button></div><div data-ids>${chipsDe(alvos(), h.ids || [], 'hh_id')}</div></div>
    ${novo ? '' : '<button type="button" class="bt perigo" data-apagar>Apagar a regra</button>'}`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
  aoAbrir: (f, fechar) => {
    ligaChips(f);
    $$('[data-alvo]', f).forEach((x) => { x.onclick = () => { alvo = x.dataset.alvo; $$('[data-alvo]', f).forEach((y) => y.setAttribute('aria-pressed', String(y === x))); $('[data-ids]', f).innerHTML = chipsDe(alvos(), [], 'hh_id'); }; });
    $('[data-apagar]', f)?.addEventListener('click', async () => { if (await confirma('Apagar esta regra de happy hour?', 'Apagar', true)) { setLoja({ happyHour: (lojaCfg().happyHour || []).filter((x) => x.id !== h.id) }); fechar(); } });
    $('[data-ok]', f).onclick = () => {
      const d = { ...h, nome: $('[data-n]', f).value.trim() || 'Happy hour', dias: $$('[name=hh_dia]:checked', f).map((i) => Number(i.value)), de: $('[data-de]', f).value, ate: $('[data-ate]', f).value, tipo: $('[data-tipo]', f).value, valor: r2(num($('[data-v]', f).value)), alvo, ids: $$('[name=hh_id]:checked', f).map((i) => i.value) };
      if (!d.dias.length) return toast('Escolha pelo menos um dia');
      if (!d.de || !d.ate || d.de === d.ate) return toast('Confira o horário');
      if (!d.ids.length) return toast(alvo === 'cat' ? 'Escolha as categorias' : 'Escolha os produtos');
      if (!(d.valor > 0) || (d.tipo === '%' && d.valor >= 100)) return toast(d.tipo === '%' ? 'Desconto entre 1% e 99%' : 'Escreva o preço especial');
      const l = lojaCfg().happyHour || []; setLoja({ happyHour: novo ? [...l, d] : l.map((x) => (x.id === h.id ? d : x)) }); fechar(); toast('Regra salva');
    };
  } });
});

// ------------------------------------------------------------------ reservas e fila de espera
const ST_RES = { pendente: 'Pendente', confirmada: 'Confirmada', chegou: 'Chegou', naoveio: 'Não veio', cancelada: 'Cancelada' };
const OCASIOES = ['Aniversário', 'Casamento ou bodas', 'Pedido de casamento', 'Negócios', 'Comemoração'];
// faltas (não veio) do mesmo cliente, pelo telefone ou, sem ele, pelo nome
const mesmoCliente = (a, b) => (a.tel && b.tel ? a.tel === b.tel : String(a.nome || '').trim().toLowerCase() === String(b.nome || '').trim().toLowerCase());
const faltas = (r) => (db.reservas || []).filter((x) => x.status === 'naoveio' && mesmoCliente(x, r)).length;
TELAS_MAIS.reservas = (x) => {
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(x || '') ? x : ymd(), hoje = dia === ymd();
  const l = (db.reservas || []).filter((r) => r.data === dia).sort((a, b) => a.hora.localeCompare(b.hora));
  const pessoas = l.filter((r) => ['pendente', 'confirmada', 'chegou'].includes(r.status)).reduce((s, r) => s + r.pessoas, 0);
  const fila = (db.fila || []).slice().sort((a, b) => a.ts - b.ts);
  return volta('salao', 'Reservas e fila', `${dataBR(dia)} · ${l.length} ${l.length === 1 ? 'reserva' : 'reservas'} · ${pessoas} pessoas`) + `
    <div class="filtros"><div class="linha-bts"><a class="bt" href="#mais/reservas/${somaDia(dia, -1)}" aria-label="Dia anterior">${ico('voltar')}</a>${hoje ? '' : `<a class="bt" href="#mais/reservas/${ymd()}">Hoje</a>`}<a class="bt" href="#mais/reservas/${somaDia(dia, 1)}" aria-label="Próximo dia">${ico('dir')}</a>
      <input type="date" class="data-res" data-dia value="${dia}" aria-label="Escolher o dia"><button type="button" class="bt cheio" data-acao="reserva-ed" data-dia="${dia}">${ico('mais2')}Nova reserva</button></div></div>
    <ul class="lista-res">${l.map((r) => { const nf = faltas(r); return `<li class="res-${r.status}"><time>${t(r.hora)}</time><div><b>${t(r.nome)} · ${r.pessoas} ${r.pessoas === 1 ? 'pessoa' : 'pessoas'}${nf ? ` <em class="badge">${nf} ${nf === 1 ? 'falta' : 'faltas'}</em>` : ''}</b><small>${[r.mesa ? `Mesa ${r.mesa}` : 'Sem mesa', r.tel ? r.tel : '', r.obs, r.origem === 'Cardápio online' ? 'pelo cardápio' : ''].filter(Boolean).map(t).join(' · ')}</small>
      ${r.ocasiao || r.restricoes ? `<small class="res-extra">${r.ocasiao ? `<span class="res-ocasiao">${ico('coroa')}${t(r.ocasiao)}</span>` : ''}${r.restricoes ? `<span class="res-alerg">${ico('alerta')}${t(r.restricoes)}</span>` : ''}</small>` : ''}</div>
      <em class="st-res">${ST_RES[r.status] || r.status}</em>
      <div class="res-bts">${r.status === 'pendente' ? `<button type="button" class="bt" data-acao="res-st" data-id="${r.id}" data-st="confirmada">Confirmar</button>` : ''}${['pendente', 'confirmada'].includes(r.status) && hoje ? `<button type="button" class="bt cheio" data-acao="res-chegou" data-id="${r.id}">Chegou</button><button type="button" class="bt" data-acao="res-st" data-id="${r.id}" data-st="naoveio">Não veio</button>` : ''}
        ${r.tel && ['pendente', 'confirmada'].includes(r.status) ? `<a class="bt-ico" href="${zap(r.tel, `Olá, ${r.nome.split(' ')[0]}! Sua reserva na ${db.config.nome} para ${r.pessoas} pessoas está confirmada: ${dataBR(r.data)} às ${r.hora}. Até lá.`)}" target="_blank" rel="noopener" aria-label="Confirmar pelo WhatsApp">${ico('zap')}</a>` : ''}
        <button type="button" class="bt-ico" data-acao="reserva-ed" data-id="${r.id}" aria-label="Editar">${ico('ajustes')}</button></div></li>`; }).join('') || '<li class="vazio">Nenhuma reserva neste dia.</li>'}</ul>
    ${hoje ? `<div class="sec-tit"><h2>Fila de espera</h2><span>${fila.length} ${fila.length === 1 ? 'grupo' : 'grupos'} esperando</span></div>
      <div class="linha-bts"><button type="button" class="bt cheio" data-acao="fila-ed">${ico('mais2')}Pôr na fila</button></div>
      <ol class="lista-res fila-espera">${fila.map((q, k) => `<li><time>${k + 1}º</time><div><b>${t(q.nome)} · ${q.pessoas} ${q.pessoas === 1 ? 'pessoa' : 'pessoas'}</b><small>Chegou há ${tempo(q.ts)}${q.chamado ? ` · chamado há ${tempo(q.chamado)}` : ''}${q.tel ? ` · ${t(q.tel)}` : ''}</small></div>
        <div class="res-bts">${q.tel ? `<a class="bt" href="${zap(q.tel, `${q.nome.split(' ')[0]}, sua mesa na ${db.config.nome} está pronta. Pode vir para a entrada que já vamos te acomodar.`)}" target="_blank" rel="noopener" data-acao="fila-chamar" data-id="${q.id}">${ico('zap')}Chamar</a>` : `<button type="button" class="bt" data-acao="fila-chamar" data-id="${q.id}">Chamar</button>`}
          <button type="button" class="bt cheio" data-acao="fila-sentar" data-id="${q.id}">Sentar</button><button type="button" class="bt-ico" data-acao="fila-tirar" data-id="${q.id}" aria-label="Tirar da fila">${ico('lixo')}</button></div></li>`).join('') || '<li class="vazio">Ninguém esperando.</li>'}</ol>` : ''}`;
};
MONTAR.reservas = (el) => { const i = $('[data-dia]', el); if (i) i.onchange = () => i.value && ir(`mais/reservas/${i.value}`); };
acao('res-st', (b) => { const r = (db.reservas || []).find((x) => x.id === b.dataset.id); if (!r) return; r.status = b.dataset.st; grava(); toast(`Reserva de ${r.nome}: ${ST_RES[r.status].toLowerCase()}`); });
// escolher uma mesa livre e abrir com as pessoas (reserva que chegou ou fila)
function sentar(pessoas, sugerida, depois) {
  const livres = Array.from({ length: db.config.mesas }, (_, k) => k + 1).filter((m) => !comandaDaMesa(m) && !db.config.planta?.[m]?.off);
  if (!livres.length) return toast('Todas as mesas estão ocupadas');
  folha({ titulo: `Sentar ${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'}`, corpo: `<p class="mudo">Toque na mesa livre.</p><div class="grade-mesas">${livres.map((m) => `<button type="button" class="mesa livre ${m === sugerida ? 'pronto' : ''}" data-m="${m}"><b>${m}</b></button>`).join('')}</div>`,
    aoAbrir: (f, fechar) => $$('[data-m]', f).forEach((x) => { x.onclick = () => { const m = Number(x.dataset.m); fechar(); abrirMesa(m, pessoas, ''); depois?.(m); ir(`mesa/${m}`); }; }) });
}
acao('res-chegou', (b) => { const r = (db.reservas || []).find((x) => x.id === b.dataset.id); if (!r) return;
  sentar(r.pessoas, Number(r.mesa) || 0, (m) => { r.status = 'chegou'; r.mesa = m; const c = comandaDaMesa(m);
    // a mesa e a cozinha veem as restrições e a ocasião da reserva
    if (c) { marcar(c, 'reserva', `Reserva de ${r.nome}`); if (r.restricoes || r.ocasiao) c.reserva = { nome: r.nome, ...(r.restricoes ? { restricoes: r.restricoes } : {}), ...(r.ocasiao ? { ocasiao: r.ocasiao } : {}) }; }
    grava(); }); });
acao('reserva-ed', (b) => {
  const r = b.dataset.id ? (db.reservas || []).find((x) => x.id === b.dataset.id) : null, dia = r?.data || b.dataset.dia || ymd();
  folha({ titulo: r ? `Reserva de ${r.nome}` : 'Nova reserva', corpo: `<div class="duas-c"><label class="campo"><span>Nome</span><input data-n value="${t(r?.nome || '')}" maxlength="80"></label><label class="campo"><span>Telefone</span><input data-tel inputmode="tel" value="${t(r?.tel || '')}"></label></div>
    <div class="tres-c"><label class="campo"><span>Dia</span><input data-d type="date" value="${dia}"></label><label class="campo"><span>Hora</span><input data-h type="time" value="${t(r?.hora || '20:00')}"></label><label class="campo"><span>Pessoas</span><input data-p inputmode="numeric" value="${r?.pessoas || 2}"></label></div>
    <div class="duas-c"><label class="campo"><span>Mesa (opcional)</span><input data-m inputmode="numeric" value="${r?.mesa || ''}"></label><label class="campo"><span>Situação</span><select data-st>${Object.entries(ST_RES).map(([k, n]) => `<option value="${k}" ${(r?.status || 'confirmada') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
    <label class="campo"><span>Observação</span><input data-o value="${t(r?.obs || '')}" maxlength="160" placeholder="Cadeirão, perto da janela…"></label>
    <label class="campo"><span>Alergias e restrições (aparece na mesa e na cozinha)</span><input data-rest value="${t(r?.restricoes || '')}" maxlength="160" placeholder="Ex.: alergia a camarão, sem glúten"></label>
    <div class="campo"><span>Ocasião especial</span><div class="chips quebra">${OCASIOES.map((o) => `<button type="button" class="chip ${r?.ocasiao === o ? 'on' : ''}" data-oc="${t(o)}">${t(o)}</button>`).join('')}</div><input data-ocasiao value="${t(r?.ocasiao || '')}" maxlength="60" placeholder="Ou escreva a ocasião" aria-label="Ocasião especial"></div>
    ${r && faltas(r) ? `<p class="aviso ouro">${ico('alerta')}${t(r.nome)} já faltou ${faltas(r)} ${faltas(r) === 1 ? 'vez' : 'vezes'} sem avisar.</p>` : ''}`,
  pe: `${r ? '<button type="button" class="bt perigo" data-apagar>Apagar</button>' : ''}<button type="button" class="bt cheio grande" data-ok>Salvar</button>`,
  aoAbrir: (f, fechar) => {
    $('[data-apagar]', f)?.addEventListener('click', async () => { if (await confirma(`Apagar a reserva de ${r.nome}?`, 'Apagar', true)) { db.reservas = db.reservas.filter((x) => x !== r); grava(); fechar(); } });
    $$('[data-oc]', f).forEach((x) => { x.onclick = () => { const on = !x.classList.contains('on'); $$('[data-oc]', f).forEach((y) => y.classList.toggle('on', on && y === x)); $('[data-ocasiao]', f).value = on ? x.dataset.oc : ''; }; });
    $('[data-ok]', f).onclick = () => {
      const d = { nome: $('[data-n]', f).value.trim(), tel: $('[data-tel]', f).value.replace(/\D/g, ''), data: $('[data-d]', f).value, hora: $('[data-h]', f).value, pessoas: Math.max(1, Math.round(num($('[data-p]', f).value)) || 1), mesa: Math.round(num($('[data-m]', f).value)) || 0, status: $('[data-st]', f).value, obs: $('[data-o]', f).value.trim(),
        restricoes: $('[data-rest]', f).value.trim(), ocasiao: $('[data-ocasiao]', f).value.trim() };
      if (!d.nome) return toast('Escreva o nome'); if (!d.data || !d.hora) return toast('Escolha o dia e a hora');
      if (r) Object.assign(r, d); else (db.reservas ||= []).push({ id: uid('r'), origem: 'Balcão', criado: Date.now(), ...d });
      grava(); fechar(); toast('Reserva salva'); if (d.data !== dia) ir(`mais/reservas/${d.data}`);
    };
  } });
});
acao('fila-ed', () => folha({ titulo: 'Pôr na fila de espera', corpo: `<div class="duas-c"><label class="campo"><span>Nome</span><input data-n maxlength="60"></label><label class="campo"><span>Pessoas</span><input data-p inputmode="numeric" value="2"></label></div>
  <label class="campo"><span>WhatsApp (para chamar quando a mesa ficar livre)</span><input data-tel inputmode="tel" placeholder="(16) 99999-0000"></label>`,
pe: '<button type="button" class="bt cheio grande" data-ok>Pôr na fila</button>',
aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => { const nome = $('[data-n]', f).value.trim(); if (!nome) return toast('Escreva o nome');
  (db.fila ||= []).push({ id: uid('f'), nome, pessoas: Math.max(1, Math.round(num($('[data-p]', f).value)) || 1), tel: $('[data-tel]', f).value.replace(/\D/g, ''), ts: Date.now() }); grava(); fechar(); toast(`${nome} está na fila`); }; } }));
acao('fila-chamar', (b, e) => { const q = (db.fila || []).find((x) => x.id === b.dataset.id); if (!q) return; q.chamado = Date.now(); grava(); if (b.href) window.open(b.href, '_blank', 'noopener'); else toast(`Chame ${q.nome} na entrada`); e?.preventDefault?.(); });
acao('fila-sentar', (b) => { const q = (db.fila || []).find((x) => x.id === b.dataset.id); if (!q) return; sentar(q.pessoas, 0, () => { db.fila = db.fila.filter((x) => x !== q); grava(); }); });
acao('fila-tirar', async (b) => { const q = (db.fila || []).find((x) => x.id === b.dataset.id); if (q && (await confirma(`Tirar ${q.nome} da fila?`, 'Tirar', true))) { db.fila = db.fila.filter((x) => x !== q); grava(); } });

// ------------------------------------------------------------------ eventos: pacote por pessoa, convidados com check-in, couvert artístico
const contaEvento = (ev) => db.comandas.find((c) => c.tipo === 'evento' && c.evento === ev.id);
const ST_EV = { orcamento: 'Orçamento', confirmado: 'Confirmado', realizado: 'Realizado' };
const dataCurta = (d) => (d ? new Date(`${d}T12:00`).toLocaleDateString('pt-BR') : '');
// orçamento do evento: pacote e couvert pelos convidados previstos, itens livres (aluguel, decoração, música), sinal, parcelas e saldo
function blocoOrcamento(ev) {
  const o = orcamentoEvento(ev), hojeY = ymd();
  return `<div class="sec-tit"><h2>Orçamento</h2><span>${o.previstos} convidados previstos</span></div>
    <div class="seg ev-status" role="group" aria-label="Situação do evento">${Object.entries(ST_EV).map(([k, n]) => `<button type="button" data-acao="evento-status" data-id="${ev.id}" data-st="${k}" aria-pressed="${(ev.status || 'orcamento') === k}">${n}</button>`).join('')}</div>
    <div class="resumo cartao-resumo orc-ev"><div><span>Pacote (${o.previstos} × ${dinCurto(ev.pacote || 0)})</span><b>${din(o.pacote)}</b></div>${o.couvert ? `<div><span>Couvert artístico (${o.previstos} × ${dinCurto(ev.couvert)})</span><b>${din(o.couvert)}</b></div>` : ''}
      ${(ev.orcamento || []).map((x) => `<div><span>${t(x.desc)}</span><b>${din(x.valor)}</b></div>`).join('')}
      <div class="total"><span>Total do orçamento</span><b>${din(o.total)}</b></div>
      ${o.sinal ? `<div><span>Sinal recebido${ev.sinal?.ts ? ` em ${new Date(ev.sinal.ts).toLocaleDateString('pt-BR')}` : ''}${ev.sinal?.forma ? ` (${t(ev.sinal.forma)})` : ''}</span><b>− ${din(o.sinal)}</b></div>` : ''}
      ${(ev.parcelas || []).map((p) => `<div class="${p.pago ? '' : p.venc < hojeY ? 'atrasada' : ''}"><span><label class="interruptor"><input type="checkbox" data-acao="evento-parcela" data-id="${ev.id}" data-p="${p.id}" ${p.pago ? 'checked' : ''}><span></span>Parcela de ${dataCurta(p.venc)}${p.pago ? ' · paga' : p.venc < hojeY ? ' · atrasada' : ''}</label></span><b>${p.pago ? '− ' : ''}${din(p.valor)}</b></div>`).join('')}
      <div class="total falta"><span>Saldo a receber</span><b>${din(o.saldo)}</b></div></div>
    <div class="linha-bts"><button type="button" class="bt" data-acao="evento-orc" data-id="${ev.id}">${ico('ajustes')}Editar orçamento, sinal e parcelas</button><button type="button" class="bt" data-acao="evento-proposta" data-id="${ev.id}">${ico('impressora')}Imprimir a proposta</button></div>`;
}
acao('evento-status', (b) => { const ev = (db.eventos || []).find((x) => x.id === b.dataset.id); if (!ev) return; ev.status = b.dataset.st; grava(); toast(`Evento: ${ST_EV[ev.status].toLowerCase()}`); });
acao('evento-parcela', (b) => { const ev = (db.eventos || []).find((x) => x.id === b.dataset.id), p = ev?.parcelas?.find((x) => x.id === b.dataset.p); if (!p) return; p.pago = b.checked ? Date.now() : null; grava(); toast(p.pago ? 'Parcela recebida' : 'Parcela em aberto'); });
acao('evento-orc', (b) => {
  const ev = (db.eventos || []).find((x) => x.id === b.dataset.id); if (!ev) return;
  folha({ titulo: `Orçamento · ${ev.nome}`, corpo: `<div class="duas-c"><label class="campo"><span>Convidados previstos</span><input data-prev inputmode="numeric" value="${ev.previstos || (ev.convidados || []).length || ''}"></label><label class="campo"><span>Cliente (quem contrata)</span><input data-cli value="${t(ev.cliente || '')}" maxlength="80"></label></div>
    <label class="campo"><span>Itens além do pacote: um por linha. Descrição | valor. Ex.: Decoração | 1200</span><textarea data-itens rows="5" placeholder="Aluguel do salão | 1500">${t((ev.orcamento || []).map((x) => `${x.desc} | ${vir(x.valor)}`).join('\n'))}</textarea></label>
    <div class="tres-c"><label class="campo"><span>Sinal recebido (R$)</span><input data-sinal inputmode="decimal" value="${ev.sinal?.valor ? vir(ev.sinal.valor) : ''}" placeholder="0,00"></label><label class="campo"><span>Recebido em</span><input data-sinald type="date" value="${ev.sinal?.ts ? ymd(ev.sinal.ts) : ymd()}"></label><label class="campo"><span>Forma</span><input data-sinalf value="${t(ev.sinal?.forma || 'Pix')}" maxlength="30"></label></div>
    <label class="campo"><span>Parcelas: uma por linha. Vencimento | valor | paga (opcional). Ex.: ${dataCurta(somaDia(ymd(), 15))} | 1500</span><textarea data-parc rows="4" placeholder="${dataCurta(somaDia(ymd(), 15))} | 1500">${t((ev.parcelas || []).map((p) => `${dataCurta(p.venc)} | ${vir(p.valor)}${p.pago ? ' | paga' : ''}`).join('\n'))}</textarea></label>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Salvar o orçamento</button>',
  aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => {
    const lin = (v) => v.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((x) => x[0]);
    const dataDe = (s) => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s) || []; return m[3] ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; };
    const parc = lin($('[data-parc]', f).value).map(([d, v, pg], k) => { const venc = dataDe(d), velha = (ev.parcelas || []).find((p) => p.venc === venc); return { id: velha?.id || uid('pa'), venc, valor: r2(num(v)), pago: /paga|pago|sim/i.test(pg || '') ? velha?.pago || Date.now() : null, k }; });
    if (parc.some((p) => !p.venc || !(p.valor > 0))) return toast('Confira as parcelas: data (dd/mm/aaaa) e valor');
    const sv = r2(num($('[data-sinal]', f).value));
    Object.assign(ev, { previstos: Math.max(0, Math.round(num($('[data-prev]', f).value))), cliente: $('[data-cli]', f).value.trim(),
      orcamento: lin($('[data-itens]', f).value).map(([desc, v]) => ({ id: uid('o'), desc: desc.slice(0, 80), valor: r2(num(v)) })).filter((x) => x.valor > 0),
      sinal: sv ? { valor: sv, ts: new Date(`${$('[data-sinald]', f).value || ymd()}T12:00`).getTime(), forma: $('[data-sinalf]', f).value.trim() } : null,
      parcelas: parc.map(({ k, ...p }) => p).sort((a, b) => a.venc.localeCompare(b.venc)) });
    grava(); fechar(); toast('Orçamento salvo');
  }; } });
});
// proposta impressa (ou salva em PDF pelo navegador)
acao('evento-proposta', (b) => {
  const ev = (db.eventos || []).find((x) => x.id === b.dataset.id); if (!ev) return; const o = orcamentoEvento(ev), L = lojaCfg();
  const w = window.open('', '_blank', 'width=760,height=900'); if (!w) return toast('Libere as janelas para imprimir');
  const l = (a, v, cls = '') => `<tr class="${cls}"><td>${t(a)}</td><td>${dinCurto(v)}</td></tr>`;
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Proposta · ${t(ev.nome)}</title><style>body{font:14px/1.5 Georgia,serif;max-width:640px;margin:24px auto;color:#222;padding:0 16px}h1{font-size:24px;margin:0}h2{font-size:16px;margin:22px 0 6px;border-bottom:1px solid #999}p{margin:4px 0}table{width:100%;border-collapse:collapse}td{padding:5px 0;border-bottom:1px dotted #bbb}td:last-child{text-align:right;white-space:nowrap}.t td{font-weight:700;border-top:2px solid #222}.s td{font-weight:700}small{color:#666}</style>
    <h1>${t(db.config.nome)}</h1><p><small>${t(L.endereco || '')}${db.config.whatsapp ? ` · WhatsApp ${t(db.config.whatsapp)}` : ''}</small></p>
    <h2>Proposta de evento</h2><p><b>${t(ev.nome)}</b></p><p>${t(dataBR(ev.data))} às ${t(ev.hora || '')} · ${o.previstos} convidados previstos${ev.cliente ? ` · para ${t(ev.cliente)}` : ''}</p>${ev.obs ? `<p>O pacote inclui: ${t(ev.obs)}</p>` : ''}
    <h2>Valores</h2><table>${l(`Pacote por pessoa (${o.previstos} × ${dinCurto(ev.pacote || 0)})`, o.pacote)}${o.couvert ? l(`Couvert artístico (${o.previstos} × ${dinCurto(ev.couvert)})`, o.couvert) : ''}${(ev.orcamento || []).map((x) => l(x.desc, x.valor)).join('')}${l('Total', o.total, 't')}</table>
    <h2>Pagamento</h2><table>${o.sinal ? l(`Sinal recebido${ev.sinal?.ts ? ` em ${new Date(ev.sinal.ts).toLocaleDateString('pt-BR')}` : ''}`, o.sinal) : ''}${(ev.parcelas || []).map((p) => l(`Parcela com vencimento em ${dataCurta(p.venc)}${p.pago ? ' (paga)' : ''}`, p.valor)).join('')}${l('Saldo a receber', o.saldo, 's')}</table>
    <p style="margin-top:20px"><small>Consumo fora do pacote é cobrado à parte no dia. Proposta emitida em ${new Date().toLocaleDateString('pt-BR')}.</small></p>
    <p style="margin-top:40px">______________________________<br><small>Assinatura do cliente</small></p><script>print()<\/script>`);
  w.document.close();
});
TELAS_MAIS.eventos = (id) => {
  const evs = (db.eventos || []).slice().sort((a, b) => `${a.data}${a.hora}`.localeCompare(`${b.data}${b.hora}`));
  const ev = id && evs.find((x) => x.id === id);
  if (!ev) {
    const hoje = ymd(), prox = evs.filter((x) => x.data >= hoje), antes = evs.filter((x) => x.data < hoje).reverse();
    const linha = (x) => { const o = orcamentoEvento(x); return `<li class="ev-${x.status || 'orcamento'}"><a href="#mais/eventos/${x.id}"><time>${new Date(`${x.data}T12:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</time><div><b>${t(x.nome)}</b><small>${t(x.hora || '')} · ${(x.convidados || []).length} convidados · ${din(x.pacote)} por pessoa${x.couvert ? ` · couvert ${din(x.couvert)}` : ''}${o.total ? ` · orçamento ${dinCurto(o.total)}, saldo ${dinCurto(o.saldo)}` : ''}</small></div><em class="st-res">${ST_EV[x.status || 'orcamento']}</em>${ico('dir')}</a></li>`; };
    return volta('mais', 'Eventos', 'Orçamento, sinal e parcelas, pacote por pessoa, lista de convidados e check-in na porta') + `<div class="linha-bts"><button type="button" class="bt cheio" data-acao="evento-ed">${ico('mais2')}Novo evento</button></div>
      <div class="sec-tit"><h2>Próximos</h2></div><ul class="lista-res eventos">${prox.map(linha).join('') || '<li class="vazio">Nenhum evento marcado.</li>'}</ul>
      ${antes.length ? `<div class="sec-tit"><h2>Já aconteceram</h2></div><ul class="lista-res eventos">${antes.slice(0, 10).map(linha).join('')}</ul>` : ''}`;
  }
  const c = contaEvento(ev), v = c ? conta(c) : null, pres = (ev.convidados || []).filter((x) => x.chegou).length, n = (ev.convidados || []).length;
  const extras = c ? v.sub : 0, pac = pres * (Number(ev.pacote) || 0), cv = pres * (Number(ev.couvert) || 0);
  return volta('mais/eventos', ev.nome, `${dataBR(ev.data)} às ${t(ev.hora || '')}`) + `
    <section class="kpis"><div><small>Convidados</small><b>${pres} / ${n}</b><span>chegaram</span></div><div><small>Pacote</small><b>${dinCurto(pac)}</b><span>${din(ev.pacote)} por pessoa</span></div><div><small>Couvert artístico</small><b>${dinCurto(cv)}</b><span>${din(ev.couvert || 0)} por pessoa</span></div><div><small>Consumo extra</small><b>${dinCurto(extras)}</b><span>${c ? `total ${dinCurto(v.total)}` : 'conta não aberta'}</span></div></section>
    <div class="linha-bts"><button type="button" class="bt" data-acao="evento-ed" data-id="${ev.id}">${ico('ajustes')}Editar o evento</button>${c ? `<button type="button" class="bt" data-acao="evento-extra" data-id="${ev.id}">${ico('mais2')}Lançar consumo extra</button><a class="bt cheio" href="#caixa/${c.id}">${ico('conta')}Fechar no caixa · ${dinCurto(v.total)}</a>` : `<button type="button" class="bt cheio" data-acao="evento-conta" data-id="${ev.id}">${ico('conta')}Abrir a conta do evento</button>`}</div>
    ${ev.obs ? `<p class="mudo">${t(ev.obs)}</p>` : ''}
    ${blocoOrcamento(ev)}
    <div class="sec-tit"><h2>Convidados</h2><span>toque para fazer o check-in</span></div>
    <form class="linha-bts" data-conv><input class="campo-linha" data-nome placeholder="Nome do convidado" aria-label="Nome do convidado" maxlength="80"><button class="bt">${ico('mais2')}Pôr na lista</button></form>
    <label class="busca">${ico('busca')}<input type="search" data-busca-conv placeholder="Buscar convidado" aria-label="Buscar convidado"></label>
    <ul class="convidados">${(ev.convidados || []).map((x) => `<li data-nome-conv="${t(x.nome.toLowerCase())}"><button type="button" class="conv ${x.chegou ? 'on' : ''}" data-acao="evento-checkin" data-ev="${ev.id}" data-id="${x.id}" aria-pressed="${!!x.chegou}">${ico(x.chegou ? 'check' : 'pessoas')}<b>${t(x.nome)}</b><small>${x.chegou ? `chegou ${new Date(x.chegou).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'esperando'}</small></button></li>`).join('') || '<li class="vazio">Ponha os nomes da lista acima.</li>'}</ul>`;
};
MONTAR.eventos = (el, id) => {
  const f = $('[data-conv]', el), ev = (db.eventos || []).find((x) => x.id === location.hash.split('/')[2]); if (!f || !ev) return;
  f.onsubmit = (e) => { e.preventDefault(); const n = $('[data-nome]', f).value.trim(); if (!n) return; (ev.convidados ||= []).push({ id: uid('g'), nome: n }); grava(); setTimeout(() => $('[data-nome]')?.focus(), 30); };
  const b = $('[data-busca-conv]', el); if (b) b.oninput = () => $$('[data-nome-conv]', el).forEach((li) => { li.hidden = !li.dataset.nomeConv.includes(b.value.trim().toLowerCase()); });
};
acao('evento-checkin', (b) => { const ev = (db.eventos || []).find((x) => x.id === b.dataset.ev), g = ev?.convidados.find((x) => x.id === b.dataset.id); if (!g) return; g.chegou = g.chegou ? null : Date.now(); grava(); toast(g.chegou ? `${g.nome} chegou` : `Check-in de ${g.nome} desfeito`); });
acao('evento-conta', (b) => { const ev = (db.eventos || []).find((x) => x.id === b.dataset.id); if (!ev || contaEvento(ev)) return;
  const c = { id: uid('v'), tipo: 'evento', evento: ev.id, nomeEvento: ev.nome, pessoas: 0, aberta: Date.now(), garcom: '', itens: [], pagamentos: [], servico: true };
  marcar(c, 'abriu', `Conta do evento ${ev.nome}`); db.comandas.push(c); grava(); toast('Conta do evento aberta'); });
acao('evento-extra', (b) => { const ev = (db.eventos || []).find((x) => x.id === b.dataset.id), c = ev && contaEvento(ev); if (c) abrirSeletor(c); });
acao('evento-ed', (b) => {
  const ev = b.dataset.id ? (db.eventos || []).find((x) => x.id === b.dataset.id) : null;
  folha({ titulo: ev ? ev.nome : 'Novo evento', corpo: `<label class="campo"><span>Nome do evento</span><input data-n value="${t(ev?.nome || '')}" maxlength="80" placeholder="Ex.: Casamento Ana e Pedro"></label>
    <div class="duas-c"><label class="campo"><span>Dia</span><input data-d type="date" value="${t(ev?.data || ymd())}"></label><label class="campo"><span>Hora</span><input data-h type="time" value="${t(ev?.hora || '20:00')}"></label></div>
    <div class="duas-c"><label class="campo"><span>Pacote por pessoa (R$)</span><input data-pac inputmode="decimal" value="${ev ? vir(ev.pacote) : ''}"></label><label class="campo"><span>Couvert artístico por pessoa (R$)</span><input data-cv inputmode="decimal" value="${ev?.couvert ? vir(ev.couvert) : ''}" placeholder="0,00"></label></div>
    <label class="campo"><span>O que o pacote inclui (observação)</span><input data-o value="${t(ev?.obs || '')}" maxlength="200"></label>
    ${ev ? '' : '<label class="campo"><span>Convidados (um por linha, opcional)</span><textarea data-lista rows="5"></textarea></label>'}
    ${ev && !contaEvento(ev) ? '<button type="button" class="bt perigo" data-apagar>Apagar o evento</button>' : ''}`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
  aoAbrir: (f, fechar) => {
    $('[data-apagar]', f)?.addEventListener('click', async () => { if (await confirma(`Apagar o evento ${ev.nome}?`, 'Apagar', true)) { db.eventos = db.eventos.filter((x) => x !== ev); grava(); fechar(); ir('mais/eventos'); } });
    $('[data-ok]', f).onclick = () => {
      const d = { nome: $('[data-n]', f).value.trim(), data: $('[data-d]', f).value, hora: $('[data-h]', f).value, pacote: r2(num($('[data-pac]', f).value)), couvert: r2(num($('[data-cv]', f).value)), obs: $('[data-o]', f).value.trim() };
      if (!d.nome) return toast('Escreva o nome do evento'); if (!d.data) return toast('Escolha o dia');
      if (ev) { Object.assign(ev, d); const c = contaEvento(ev); if (c) c.nomeEvento = d.nome; grava(); fechar(); toast('Evento salvo'); return; }
      const novo = { id: uid('ev'), ...d, convidados: ($('[data-lista]', f).value || '').split('\n').map((x) => x.trim()).filter(Boolean).map((nome) => ({ id: uid('g'), nome })) };
      (db.eventos ||= []).push(novo); grava(); fechar(); ir(`mais/eventos/${novo.id}`);
    };
  } });
});

// ------------------------------------------------------------------ encomendas: pedidos para outro dia, por data
TELAS_MAIS.encomendas = () => {
  const l = db.comandas.filter((c) => c.encomenda?.para).sort((a, b) => a.encomenda.para - b.encomenda.para);
  const dias = {}; l.forEach((c) => { (dias[ymd(c.encomenda.para)] ||= []).push(c); });
  return volta('pedidos', 'Encomendas', `${l.length} ${l.length === 1 ? 'encomenda aberta' : 'encomendas abertas'} · entram no quadro de pedidos no dia`) + `
    <div class="linha-bts"><a class="bt cheio" href="#pedidos/novo/balcao">${ico('mais2')}Nova encomenda</a></div>
    ${Object.entries(dias).map(([d, cs]) => `<div class="sec-tit"><h2>${d === ymd() ? 'Hoje' : t(dataBR(d))}</h2><span>${cs.length}</span></div>
      <ul class="lista-res">${cs.map((c) => `<li><time>${new Date(c.encomenda.para).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time><div><b>#${c.num} · ${t(c.cliente?.nome || 'Cliente')}</b><small>${itensValidos(c).map((i) => `${i.qtd}× ${t(i.nome)}`).join(', ') || 'sem itens ainda'}${c.tipo === 'delivery' ? ' · entrega' : ' · retirada'}</small></div>
        <em class="st-res">${dinCurto(conta(c).total)}${conta(c).falta <= 0 ? ' · pago' : ''}</em><div class="res-bts"><a class="bt" href="#pedidos/ver/${c.id}">Abrir</a></div></li>`).join('')}</ul>`).join('') || '<div class="vazio">Nenhuma encomenda. Em Pedidos › Balcão, preencha “Encomenda para” com o dia e a hora.</div>'}`;
};

// ------------------------------------------------------------------ vitrine do dia: quanto foi feito e quanto resta
TELAS_MAIS.vitrine = () => {
  const v = db.vitrine?.dia === ymd() ? db.vitrine : db.vitrineAmanha?.dia === ymd() ? { qtd: db.vitrineAmanha.qtd, feito: db.vitrineAmanha.qtd, deOntem: db.vitrineAmanha.qtd } : { qtd: {}, feito: {} }, l = db.produtos.filter((p) => p.vitrine);
  const sobra = l.filter((p) => (v.qtd?.[p.id] || 0) > 0).length;
  return volta('mais', 'Vitrine do dia', 'Itens que saem prontos, sem passar pela cozinha. Quando acaba, vira “Esgotou na vitrine”.') + (l.length ? `
    ${v.fechada ? `<p class="aviso ouro">${ico('check')}Vitrine fechada hoje às ${new Date(v.fechada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.</p>` : ''}
    ${(db.vitrineHist || []).length ? (() => { const h = db.vitrineHist.at(-1); return `<p class="mudo vit-ult">${ico('relogio')}Último fechamento (${new Date(`${h.dia}T12:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}): ${h.itens.map((x) => `${x.qtd}× ${t(x.nome)} → ${DESTINO_VIT.find((d) => d[0] === x.dest)?.[1].toLowerCase() || x.dest}`).join(' · ')} · <b>perda ${dinCurto(h.perda)}</b></p>`; })() : ''}
    <form class="form" data-vitrine>
    <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Item</th><th class="num">Feito hoje</th><th class="num">Vendido</th><th class="num">Resta</th></tr></thead><tbody>
    ${l.map((p) => { const f = v.feito?.[p.id], r = v.qtd?.[p.id], on = v.deOntem?.[p.id]; return `<tr class="${r === 0 ? 'off' : ''}"><td><b>${t(p.nome)}</b>${on ? `<small>${on} de ontem${v.promo?.[p.id]?.pct ? ` · ${v.promo[p.id].qtd} ainda com ${v.promo[p.id].pct}% de desconto` : ''}</small>` : ''}${r === 0 ? '<small class="erro">Esgotou na vitrine</small>' : ''}</td><td class="num"><input class="inv-q" name="vt_${p.id}" inputmode="numeric" value="${f ?? ''}" placeholder="sem limite" aria-label="Feito hoje de ${t(p.nome)}"></td><td class="num">${f != null ? f - (r ?? f) : '—'}</td><td class="num"><b>${r ?? '—'}</b></td></tr>`; }).join('')}</tbody></table></div>
    <div class="linha-bts"><button class="bt cheio grande">Salvar a vitrine</button>${sobra ? `<button type="button" class="bt grande" data-acao="vitrine-fechar">${ico('check')}Fechar vitrine do dia (${sobra} ${sobra === 1 ? 'item sobrou' : 'itens sobraram'})</button>` : ''}</div></form>` : '<div class="vazio">Marque os itens de vitrine no cadastro do prato (Gestão › Cardápio › editar › Vitrine).</div>');
};
// fechar a vitrine: para cada item que sobrou, descartar (perda: vencido), doar ou levar para amanhã
// custo do item da vitrine: a ficha técnica ou, sem ficha, o custo anotado no prato
const custoVit = (p) => custoPrato(p) || Number(p.custo) || 0;
const DESTINO_VIT = [['descartar', 'Descartar'], ['doar', 'Doar'], ['amanha', 'Amanhã com desconto']];
acao('vitrine-fechar', () => {
  const v = vitrineHoje(), l = db.produtos.filter((p) => p.vitrine && (v.qtd?.[p.id] || 0) > 0), pct = Number(lojaCfg().vitrineDesconto ?? 30);
  if (!l.length) return toast('Nada sobrou na vitrine');
  // contagem rápida: o caixa confere quanto sobrou de verdade (vem preenchido com o que o sistema calcula)
  folha({ titulo: 'Fechar vitrine do dia', corpo: `<p class="mudo">Conte o que sobrou e escolha o destino. Descartar e doar entram nas perdas (em R$) e baixam o estoque pela ficha; “amanhã” volta no dia seguinte com ${pct}% de desconto.</p>
    <ul class="lista-res vit-fecha">${l.map((p) => `<li><div><b>${t(p.nome)}</b><small>o sistema diz ${v.qtd[p.id]} · custo ${dinCurto(custoVit(p))} cada</small></div><label class="vit-conta"><span>Sobrou</span><input data-vq="${p.id}" inputmode="numeric" value="${v.qtd[p.id]}" aria-label="Quantos ${t(p.nome)} sobraram"></label><div class="seg" role="group" aria-label="Destino de ${t(p.nome)}">${DESTINO_VIT.map(([k, n]) => `<button type="button" data-vp="${p.id}" data-dest="${k}" aria-pressed="${k === 'amanha'}">${n}</button>`).join('')}</div></li>`).join('')}</ul>
    <p class="vit-perda" data-perda></p>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Fechar a vitrine</button>',
  aoAbrir: (f, fechar) => {
    const dest = Object.fromEntries(l.map((p) => [p.id, 'amanha']));
    const qtd = (p) => Math.max(0, Math.round(num($(`[data-vq="${p.id}"]`, f)?.value)));
    const perdaR = () => r2(l.reduce((s, p) => s + (dest[p.id] === 'amanha' ? 0 : custoVit(p) * qtd(p)) + (v.qtd[p.id] > qtd(p) ? custoVit(p) * (v.qtd[p.id] - qtd(p)) : 0), 0));
    const mostra = () => { $('[data-perda]', f).innerHTML = `Perda de hoje: <b>${din(perdaR())}</b>${l.some((p) => qtd(p) < v.qtd[p.id]) ? ' (inclui o que sumiu na contagem)' : ''}`; };
    $$('[data-vp]', f).forEach((b) => { b.onclick = () => { dest[b.dataset.vp] = b.dataset.dest; $$(`[data-vp="${b.dataset.vp}"]`, f).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); mostra(); }; });
    $$('[data-vq]', f).forEach((x) => { x.oninput = mostra; }); mostra();
    $('[data-ok]', f).onclick = () => {
      const quem = quemAgora(), amanha = somaDia(ymd(), 1), leva = {}, hist = []; let perdas = 0; const perdaTotal = perdaR();
      l.forEach((p) => {
        // o que sumiu na contagem (comido, quebrado) também é perda
        const sumiu = Math.max(0, v.qtd[p.id] - qtd(p)); if (sumiu) { if ((p.ficha || []).length) p.ficha.forEach((x) => registrarPerda(x.insumo, x.qtd * sumiu, `Faltou na contagem da vitrine (${sumiu}× ${p.nome})`, quem)); perdas++; }
        v.qtd[p.id] = qtd(p);
        const q = v.qtd[p.id], d = dest[p.id];
        hist.push({ prod: p.id, nome: p.nome, qtd: q, dest: d, custo: d === 'amanha' ? 0 : r2(custoVit(p) * q), ...(sumiu ? { sumiu } : {}) });
        if (!q) { p.ativo = false; p.esgotouVitrine = v.dia; return; }
        if (d === 'amanha') leva[p.id] = q;
        else {
          const motivo = d === 'doar' ? 'Doação: sobra da vitrine' : 'Vencido: sobra da vitrine';
          // sem ficha técnica, a perda fica registrada pelo produto (o custo entra como zero)
          if ((p.ficha || []).length) p.ficha.forEach((x) => registrarPerda(x.insumo, x.qtd * q, `${motivo} (${q}× ${p.nome})`, quem));
          else { (db.movEstoque ||= []).push({ id: uid('e'), t: Date.now(), insumo: '', prod: p.id, nome: p.nome, tipo: "perda", qtd: -q, motivo, quem, custo: -r2(custoVit(p) * q) }); auditar("perda", { quem, item: p.nome, qtd: q, valor: r2(custoVit(p) * q), motivo }); }
          perdas++;
        }
        v.qtd[p.id] = 0; p.ativo = false; p.esgotouVitrine = v.dia;
      });
      if (Object.keys(leva).length) {
        const ja = db.vitrineAmanha?.dia === amanha ? db.vitrineAmanha : { qtd: {}, promo: {} };
        db.vitrineAmanha = { dia: amanha, qtd: { ...ja.qtd, ...leva }, promo: { ...(ja.promo || {}), ...(pct > 0 ? Object.fromEntries(Object.entries(leva).map(([id, q]) => [id, { qtd: q, pct }])) : {}) } };
      }
      (db.vitrineHist ||= []).push({ dia: v.dia, itens: hist, perda: perdaTotal }); if (db.vitrineHist.length > 60) db.vitrineHist.splice(0, db.vitrineHist.length - 60);
      v.fechada = Date.now(); grava(); fechar();
      toast(`Vitrine fechada · perda ${din(perdaTotal)}${Object.keys(leva).length ? ` · o resto volta amanhã com ${pct}% de desconto` : ''}`);
    };
  } });
});
MONTAR.vitrine = (el) => {
  const f = $('[data-vitrine]', el); if (!f) return;
  f.onsubmit = (e) => {
    e.preventDefault(); const v = vitrineHoje(); v.feito ||= {};
    db.produtos.filter((p) => p.vitrine).forEach((p) => {
      const val = f[`vt_${p.id}`].value.trim();
      if (val === '') { delete v.feito[p.id]; delete v.qtd[p.id]; return; }
      const feito = Math.max(0, Math.round(num(val))), vendido = v.feito[p.id] != null ? v.feito[p.id] - (v.qtd[p.id] ?? v.feito[p.id]) : 0;
      v.feito[p.id] = feito; v.qtd[p.id] = Math.max(0, feito - vendido);
      if (v.qtd[p.id] > 0 && p.esgotouVitrine) { p.ativo = true; delete p.esgotouVitrine; }
      if (v.qtd[p.id] === 0) { p.ativo = false; p.esgotouVitrine = v.dia; }
    });
    grava(); toast('Vitrine salva');
  };
};
// virou o dia: o que esgotou na vitrine ontem volta ao cardápio (a quantidade de hoje ainda não foi lançada)
function vitrineNovoDia() {
  const hoje = ymd(); let mudou = false;
  db.produtos.forEach((p) => { if (p.esgotouVitrine && p.esgotouVitrine !== hoje) { p.ativo = true; delete p.esgotouVitrine; mudou = true; } });
  if (mudou) grava();
}

// ------------------------------------------------------------------ portaria: ingresso por lote, lista VIP, promoter, reentrada, consumação mínima e lotação
// a noite da casa vai até o meio-dia seguinte (quem entra às 01:00 conta na noite de ontem); a noite anterior vira resumo no histórico
function portariaHoje() {
  const d = noite();
  if (db.portaria?.dia !== d) {
    const v = db.portaria; if (v?.entradas?.length) (db.portariaHist ||= []).push({ dia: v.dia, ...resumoPortaria(v.entradas) });
    if ((db.portariaHist || []).length > 90) db.portariaHist.splice(0, db.portariaHist.length - 90);
    db.portaria = { dia: d, entradas: [] };
  }
  return db.portaria;
}
const portariaAgora = () => (db.portaria?.dia === noite() ? db.portaria : { dia: noite(), entradas: [] });
const dentroAgora = (x) => !x.saiu && !x.fora;
function resumoPortaria(entradas = []) {
  const porPromoter = {}, porLote = {}, L = lotacao(entradas);
  entradas.forEach((x) => {
    const p = x.promoter || '', l = x.lote ? `${x.ingresso} · ${x.lote}` : x.ingresso || 'Sem ingresso';
    (porPromoter[p] ||= { n: 0, pagantes: 0, valor: 0 }); porPromoter[p].n++; if (x.preco > 0) porPromoter[p].pagantes++; porPromoter[p].valor = r2(porPromoter[p].valor + (x.preco || 0));
    porLote[l] = (porLote[l] || 0) + 1;
  });
  return { entradas: L.entradas, saidas: L.saidas, reentradas: L.reentradas, valor: r2(entradas.reduce((s, x) => s + (x.preco || 0), 0)), porPromoter, porLote };
}
// quantos de cada lote deste tipo de ingresso já entraram nesta noite
const vendidosLote = (entradas, tipo) => { const v = {}; entradas.filter((x) => x.ingresso === tipo && x.lote).forEach((x) => { v[x.lote] = (v[x.lote] || 0) + 1; }); return v; };
// os ingressos à venda agora: com lotes, o preço é o do lote que está valendo (o próximo entra sozinho quando um esgota)
function ingressosAgora(entradas) {
  const P = lojaCfg().portaria || {}, l = P.ingressos?.length ? P.ingressos : [{ nome: 'Entrada', preco: 0, consumacao: 0 }];
  return l.map((x) => {
    if (!(x.lotes || []).length) return { ...x };
    const a = loteAtual(x.lotes, vendidosLote(entradas, x.nome));
    return a ? { ...x, preco: r2(a.lote.preco), lote: a.lote.nome, resta: a.resta } : { ...x, esgotado: true };
  });
}
const nomePromoter = (cod) => (lojaCfg().portaria?.promoters || []).find((p) => p.codigo === cod)?.nome || cod;
const vipsHoje = () => (db.vip || []).filter((v) => v.noite === noite());
registrar('portaria', {
  titulo: 'Portaria', aba: 'salao',
  html() {
    if (!tem('portaria')) return `<header class="cab-tela"><a class="bt-ico" href="#salao" aria-label="Voltar">${ico('voltar')}</a><div><h1>Portaria</h1></div></header><div class="vazio">A portaria está desligada. Ligue em Gestão › Aparência e templates.</div>`;
    const P = lojaCfg().portaria || {}, po = portariaAgora(), L = lotacao(po.entradas), cap = Number(P.capacidade) || 0, pct = cap ? Math.min(100, Math.round((L.dentro / cap) * 100)) : 0;
    const R = resumoPortaria(po.entradas), ings = ingressosAgora(po.entradas), vips = vipsHoje(), fora = po.entradas.filter((x) => x.fora && !x.saiu);
    const dentro = po.entradas.filter(dentroAgora);
    const consCobrar = r2(db.comandas.filter((c) => c.tipo === 'cartao' && c.consumacao).reduce((s, c) => s + conta(c).consumacao, 0));
    return `<header class="cab-tela"><a class="bt-ico" href="#salao" aria-label="Voltar">${ico('voltar')}</a><div><h1>Portaria</h1><p>${L.entradas} entradas · ${L.saidas} saídas · ${L.reentradas} reentradas${R.valor ? ` · ${dinCurto(R.valor)} em ingressos` : ''}</p></div></header>
      <section class="lotacao ${pct >= 90 ? 'cheia' : ''}"><div><small>Dentro agora</small><b>${L.dentro}${cap ? ` <span>de ${cap}</span>` : ''}</b></div>${cap ? `<span class="barra"><i style="width:${pct}%"></i></span><em>${pct}%${pct >= 100 ? ' · casa cheia' : ''}</em>` : '<em>Defina a capacidade em Gestão › Regras das funções</em>'}
        <small class="lot-conta">entradas ${L.entradas} − saídas ${L.saidas} + reentradas ${L.reentradas}</small></section>
      <div class="linha-bts"><button type="button" class="bt cheio grande" data-acao="portaria-entrada">${ico('mais2')}Registrar entrada</button><button type="button" class="bt grande" data-acao="portaria-saida-rapida">${ico('voltar')}Saída sem cartão</button>${tem('camarotes') ? `<a class="bt grande" href="#mais/camarotes">${ico('coroa')}Camarotes</a>` : ''}</div>
      <div class="kpis port-ings">${ings.map((x) => `<div><small>${t(x.nome)}${x.lote ? ` · ${t(x.lote)}` : ''}</small><b>${x.esgotado ? 'Esgotado' : din(x.preco)}</b><span>${x.esgotado ? 'todos os lotes vendidos' : x.lote && x.resta !== Infinity ? `restam ${x.resta} neste lote` : x.consumacao ? `consumação ${dinCurto(x.consumacao)}` : 'à venda'}</span></div>`).join('')}
        ${consCobrar ? `<div><small>Consumação a cobrar</small><b>${dinCurto(consCobrar)}</b><span>de quem ainda não consumiu o mínimo</span></div>` : ''}</div>
      <div class="sec-tit"><h2>Lista VIP</h2><span>${vips.filter((v) => v.entrou).length} de ${vips.length} chegaram · toque no nome para o check-in</span></div>
      <div class="linha-bts"><button type="button" class="bt" data-acao="vip-add">${ico('mais2')}Pôr nomes na lista</button><label class="busca">${ico('busca')}<input type="search" data-busca-vip placeholder="Buscar na lista" aria-label="Buscar na lista VIP"></label></div>
      <ul class="convidados">${vips.map((v) => { const vale = antesDe(v.ate); return `<li data-nome-vip="${t(v.nome.toLowerCase())}"><button type="button" class="conv ${v.entrou ? 'on' : ''}" data-acao="vip-checkin" data-id="${v.id}" aria-pressed="${!!v.entrou}" ${v.entrou ? 'disabled' : ''}>${ico(v.entrou ? 'check' : 'coroa')}<b>${t(v.nome)}</b><small>${v.entrou ? `entrou ${new Date(v.entrou).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : vale ? `cortesia até ${t(v.ate)}` : `cortesia acabou às ${t(v.ate)}`}${v.promoter ? ` · ${t(nomePromoter(v.promoter))}` : ''}</small></button></li>`; }).join('') || '<li class="vazio">Ninguém na lista desta noite.</li>'}</ul>
      ${fora.length ? `<div class="sec-tit"><h2>Saíram e vão voltar</h2><span>${fora.length} com pulseira ou cartão</span></div>
      <ul class="lista-res">${fora.map((x) => `<li><time>${new Date(x.fora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time><div><b>${x.cartao ? `Cartão ${x.cartao}` : 'Pulseira'}${x.nome ? ` · ${t(x.nome)}` : ''}</b><small>saiu há ${tempo(x.fora)}</small></div>
        <div class="res-bts"><button type="button" class="bt cheio" data-acao="portaria-voltou" data-id="${x.id}">Voltou</button><button type="button" class="bt" data-acao="portaria-saida" data-id="${x.id}">Não volta</button></div></li>`).join('')}</ul>` : ''}
      <div class="sec-tit"><h2>Quem está na casa</h2><span>${dentro.length}</span></div>
      <ul class="lista-res">${dentro.slice().reverse().map((x) => { const c = x.cartao ? cartaoAberto(x.cartao) : null, v = c ? conta(c) : null; return `<li><time>${new Date(x.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time><div><b>${x.cartao ? `Cartão ${x.cartao}` : 'Sem cartão'}${x.nome ? ` · ${t(x.nome)}` : ''}${c?.perdido ? ' <em class="badge">perdido</em>' : ''}</b><small>${[x.ingresso, x.lote, x.promoter ? `promoter ${nomePromoter(x.promoter)}` : '', x.voltas ? `${x.voltas} ${x.voltas === 1 ? 'reentrada' : 'reentradas'}` : ''].filter(Boolean).map(t).join(' · ')}${c ? ` · conta ${dinCurto(v.total)}${c.consumacao ? ` (crédito ${dinCurto(c.consumacao)}, consumido ${dinCurto(v.sub)}, a cobrar ${dinCurto(v.consumacao)})` : ''}` : x.cartao ? ' · conta paga' : ''}</small></div>
        <div class="res-bts">${c ? `<a class="bt" href="#cartao/${x.cartao}">Ver</a><a class="bt" href="#caixa/${c.id}">Cobrar</a>` : ''}<button type="button" class="bt" data-acao="portaria-sai-volta" data-id="${x.id}" title="Sai e volta sem pagar de novo">Sai e volta</button><button type="button" class="bt ${c ? '' : 'cheio'}" data-acao="portaria-saida" data-id="${x.id}">Saiu</button></div></li>`; }).join('') || '<li class="vazio">Ninguém na casa ainda.</li>'}</ul>
      ${relPromoters(R, P)}`;
  },
  montar(el) { const b = $('[data-busca-vip]', el); if (b) b.oninput = () => $$('[data-nome-vip]', el).forEach((li) => { li.hidden = !li.dataset.nomeVip.includes(b.value.trim().toLowerCase()); }); },
});
// relatório de entradas por promoter: esta noite e as anteriores
function relPromoters(R, P) {
  const proms = P.promoters || [], hist = (db.portariaHist || []).slice(-14).reverse();
  if (!proms.length && !Object.keys(R.porPromoter).some(Boolean)) return '';
  const cods = [...new Set([...proms.map((p) => p.codigo), ...Object.keys(R.porPromoter).filter(Boolean), ...hist.flatMap((h) => Object.keys(h.porPromoter || {}).filter(Boolean))])];
  const tot = (cod) => hist.reduce((s, h) => s + (h.porPromoter?.[cod]?.n || 0), 0);
  // comissão (R$ por entrada paga + % do consumo dos camarotes que ele trouxe), quando o promoter tem comissão
  const comOn = proms.some((p) => p.porEntrada || p.pctConsumo), RC = comOn && tem('camarotes') ? resumoCamarotes() : { porPromoter: {} };
  const com = (c, x) => { const p = proms.find((y) => y.codigo === c); return p ? comissaoPromoter(p, { pagantes: x.pagantes, consumo: RC.porPromoter[c]?.consumo || 0 }).total : 0; };
  return `<div class="sec-tit"><h2>Entradas por promoter</h2><span>esta noite e as ${hist.length} anteriores</span></div>
    <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Promoter</th><th class="num">Hoje</th><th class="num">Pagantes</th><th class="num">Ingressos</th>${comOn ? '<th class="num">Comissão hoje</th>' : ''}<th class="num">Noites anteriores</th></tr></thead><tbody>
    ${cods.map((c) => { const x = R.porPromoter[c] || { n: 0, pagantes: 0, valor: 0 }; return `<tr><td><b>${t(nomePromoter(c))}</b><small>${t(c)}</small></td><td class="num">${x.n}</td><td class="num">${x.pagantes}</td><td class="num">${dinCurto(x.valor)}</td>${comOn ? `<td class="num"><b>${dinCurto(com(c, x))}</b></td>` : ''}<td class="num">${tot(c)}</td></tr>`; }).join('')}
    ${R.porPromoter[''] ? `<tr><td>Sem promoter</td><td class="num">${R.porPromoter[''].n}</td><td class="num">${R.porPromoter[''].pagantes}</td><td class="num">${dinCurto(R.porPromoter[''].valor)}</td>${comOn ? '<td class="num">—</td>' : ''}<td class="num">${hist.reduce((s, h) => s + (h.porPromoter?.['']?.n || 0), 0)}</td></tr>` : ''}</tbody></table></div>`;
}
// entrada: ingresso (com o lote da vez), promoter, cartão e nome; vip = check-in pela lista (cortesia até o horário)
function entrada(vip = null) {
  const P = lojaCfg().portaria || {}, po = portariaHoje(), cortesia = vip && antesDe(vip.ate);
  const ings = [...(cortesia ? [{ nome: 'Lista VIP', preco: 0, consumacao: r2(P.vipConsumacao || 0), vip: true }] : []), ...ingressosAgora(po.entradas)];
  let sel = ings.findIndex((x) => !x.esgotado), prom = vip?.promoter || '';
  const proms = P.promoters || [];
  folha({ titulo: vip ? `Entrada de ${vip.nome}` : 'Registrar entrada', corpo: `${vip && !cortesia ? `<p class="aviso ouro">${ico('relogio')}A cortesia da lista acabou às ${t(vip.ate)}: cobre o ingresso.</p>` : ''}
    <div class="campo"><span>Ingresso</span><div class="papeis">${ings.map((x, k) => `<button type="button" class="papel ${k === sel ? 'on' : ''}" data-ing="${k}" ${x.esgotado ? 'disabled' : ''}><b>${t(x.nome)}${x.lote ? ` · ${t(x.lote)}` : ''}</b><small>${x.esgotado ? 'Esgotado' : `${x.preco ? din(x.preco) : x.vip ? 'Cortesia' : 'Sem cobrança'}${x.consumacao ? ` · consumação mínima ${din(x.consumacao)}` : ''}${x.lote && x.resta !== Infinity ? ` · restam ${x.resta}` : ''}`}</small></button>`).join('')}</div></div>
    ${proms.length ? `<div class="campo"><span>Promoter (código no ingresso)</span><div class="chips quebra">${[['', 'Nenhum'], ...proms.map((p) => [p.codigo, `${p.codigo} · ${p.nome}`])].map(([c, n]) => `<button type="button" class="chip ${c === prom ? 'on' : ''}" data-prom="${t(c)}">${t(n)}</button>`).join('')}</div></div>` : ''}
    <div class="duas-c"><label class="campo"><span>Número do cartão (vazio = só pulseira)</span><input data-n inputmode="numeric" value="${tem('comandaIndividual') ? proximoCartao() : ''}"></label><label class="campo"><span>Nome (opcional)</span><input data-nome maxlength="60" value="${t(vip?.nome || '')}"></label></div>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Entrou</button>',
  aoAbrir: (f, fechar) => {
    $$('[data-ing]', f).forEach((b) => { b.onclick = () => { sel = Number(b.dataset.ing); $$('[data-ing]', f).forEach((x) => x.classList.toggle('on', x === b)); }; });
    $$('[data-prom]', f).forEach((b) => { b.onclick = () => { prom = b.dataset.prom; $$('[data-prom]', f).forEach((x) => x.classList.toggle('on', x === b)); }; });
    $('[data-ok]', f).onclick = () => {
      const ing = ings[sel]; if (!ing || ing.esgotado) return toast('Escolha um ingresso à venda');
      const n = Math.round(num($('[data-n]', f).value)), nome = $('[data-nome]', f).value.trim();
      if (n > 0 && cartaoAberto(n)) return toast(`O cartão ${n} já está em uso`);
      // confere de novo o lote na hora (outro aparelho pode ter vendido o último)
      const agora = ing.vip ? ing : ingressosAgora(portariaHoje().entradas).find((x) => x.nome === ing.nome);
      if (!agora || agora.esgotado) return toast('Esse ingresso acabou de esgotar');
      if (agora.lote !== ing.lote) toast(`Virou o lote: agora é ${agora.lote} (${din(agora.preco)})`);
      const P2 = lojaCfg().portaria || {}; if (P2.capacidade && lotacao(po.entradas).dentro >= P2.capacidade) toast('Atenção: a casa está na lotação máxima');
      if (n > 0) abrirCartao(n, { nome, portaria: true, ...(agora.preco ? { ingresso: { nome: `${agora.nome}${agora.lote ? ` · ${agora.lote}` : ''}`, preco: r2(agora.preco) } } : {}), ...(agora.consumacao ? { consumacao: r2(agora.consumacao) } : {}) });
      po.entradas.push({ id: uid('pt'), t: Date.now(), nome, ingresso: agora.nome, ...(agora.lote ? { lote: agora.lote } : {}), preco: r2(agora.preco || 0), cartao: n > 0 ? n : 0, ...(prom ? { promoter: prom } : {}), ...(vip ? { vip: vip.id } : {}) });
      if (vip) vip.entrou = Date.now();
      grava(); fechar(); toast(n > 0 ? `Cartão ${n}: entrada registrada` : 'Entrada registrada');
    };
  } });
}
acao('portaria-entrada', () => entrada());
acao('vip-checkin', (b) => { const v = (db.vip || []).find((x) => x.id === b.dataset.id); if (v && !v.entrou) entrada(v); });
acao('vip-add', () => {
  const proms = lojaCfg().portaria?.promoters || [];
  folha({ titulo: 'Lista VIP desta noite', corpo: `<label class="campo"><span>Nomes (um por linha)</span><textarea data-nomes rows="5" placeholder="Bruno Tavares"></textarea></label>
    <div class="duas-c"><label class="campo"><span>Cortesia até</span><input data-ate type="time" value="00:30"></label>${proms.length ? `<label class="campo"><span>Promoter</span><select data-prom><option value="">Nenhum</option>${proms.map((p) => `<option value="${t(p.codigo)}">${t(p.codigo)} · ${t(p.nome)}</option>`).join('')}</select></label>` : ''}</div>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Pôr na lista</button>',
  aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => {
    const nomes = $('[data-nomes]', f).value.split('\n').map((x) => x.trim()).filter(Boolean); if (!nomes.length) return toast('Escreva pelo menos um nome');
    const ate = $('[data-ate]', f).value, promoter = $('[data-prom]', f)?.value || '';
    (db.vip ||= []).push(...nomes.map((nome) => ({ id: uid('v'), nome: nome.slice(0, 80), noite: noite(), ate, promoter })));
    if (db.vip.length > 2000) db.vip.splice(0, db.vip.length - 2000);
    grava(); fechar(); toast(`${nomes.length} ${nomes.length === 1 ? 'nome' : 'nomes'} na lista`);
  }; } });
});
// pulseira ou cartão: sai e volta sem pagar de novo (a conta do cartão continua aberta)
acao('portaria-sai-volta', (b) => { const x = portariaHoje().entradas.find((y) => y.id === b.dataset.id); if (!x || x.saiu || x.fora) return; x.saidas = (x.saidas || 0) + 1; x.fora = Date.now(); grava(); toast('Saída registrada: volta sem pagar de novo'); });
acao('portaria-voltou', (b) => { const x = portariaHoje().entradas.find((y) => y.id === b.dataset.id); if (!x || !x.fora) return; x.voltas = (x.voltas || 0) + 1; delete x.fora; grava(); toast('Reentrada registrada'); });
acao('portaria-saida', async (b) => {
  const po = portariaHoje(), x = po.entradas.find((y) => y.id === b.dataset.id); if (!x) return;
  const c = x.cartao ? cartaoAberto(x.cartao) : null;
  if (c && conta(c).falta > 0.009 && !(await confirma(`O cartão ${x.cartao} ainda deve ${din(conta(c).falta)}. Registrar a saída mesmo assim?`, 'Registrar saída', true))) return;
  // quem estava fora e não volta: a saída temporária vira a saída final (não conta duas vezes)
  if (x.fora) { x.saidas = Math.max(0, (x.saidas || 0) - 1); delete x.fora; }
  x.saiu = Date.now(); grava(); toast('Saída registrada');
});
acao('portaria-saida-rapida', () => { const po = portariaHoje(), x = po.entradas.find((y) => dentroAgora(y) && !y.cartao) || po.entradas.find((y) => dentroAgora(y) && !cartaoAberto(y.cartao)); if (!x) return toast('Ninguém sem conta aberta para sair'); x.saiu = Date.now(); grava(); toast('Saída registrada'); });

// ------------------------------------------------------------------ painel de retirada (TV do balcão): senhas preparando e prontas
const prontaSenha = (c) => { const it = itensValidos(c).filter((i) => i.status !== 'rascunho'); return it.length && it.every((i) => ['pronto', 'entregue'].includes(i.status)); };
let prontasVistas = new Set(), chamadaVista = Date.now();
const prontoEm = (c) => Math.max(0, ...itensValidos(c).map((i) => i.pronto || i.entregue || 0));
// voz do navegador ("Senha 12"), quando o aparelho tem
const falar = (txt) => { try { if (!('speechSynthesis' in window) || navigator.webdriver) return; /* navegador de teste automático nunca fala */ const u = new SpeechSynthesisUtterance(txt); u.lang = 'pt-BR'; u.rate = 0.95; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { /* sem voz */ } };
// a TV precisa de um toque para liberar o som (regra dos navegadores)
// som e voz só depois de apertar "Ligar o som" nesta tela (um toque em qualquer outro lugar não liga); apertar de novo desliga
acao('senha-som', () => { const b = document.body.dataset; if (b.somSenha) { delete b.somSenha; try { speechSynthesis.cancel(); } catch { /* sem voz */ } } else { b.tocou = '1'; b.somSenha = '1'; bip(1180); } dispatchEvent(new HashChangeEvent('hashchange')); });
registrar('senhas', {
  titulo: 'Painel de retirada', aba: 'pedidos',
  html() {
    const l = db.comandas.filter((c) => c.tipo === 'balcao' && c.senha).sort((a, b) => a.senha - b.senha);
    const prontas = l.filter(prontaSenha), prep = l.filter((c) => !prontaSenha(c));
    const novas = prontas.filter((c) => !prontasVistas.has(c.id)); prontasVistas = new Set(prontas.map((c) => c.id));
    // chamando agora: a senha chamada de novo no balcão ou a última que ficou pronta (número grande, som e voz)
    const chamada = prontas.slice().sort((a, b) => (b.chamada || prontoEm(b)) - (a.chamada || prontoEm(a)))[0];
    const novaChamada = prontas.find((c) => c.chamada && c.chamada > chamadaVista);
    if ((novas.length || novaChamada) && document.body.dataset.somSenha) { bip(1180); setTimeout(() => bip(1480), 220); falar(`Senha ${(novaChamada || novas.at(-1)).senha}`); }
    chamadaVista = Math.max(chamadaVista, ...prontas.map((c) => c.chamada || 0));
    return `<div class="painel-senhas"><header><h1>${t(db.config.nome)}</h1><div class="linha-bts"><a class="bt" href="#pedidos">${ico('voltar')}Pedidos</a><button type="button" class="bt" data-acao="senha-som">${ico('sino')}${document.body.dataset.somSenha ? 'Som ligado (desligar)' : 'Ligar o som'}</button><button type="button" class="bt" data-acao="tela-cheia">${ico('telacheia')}Tela cheia</button></div></header>
      ${tem('senha') ? '' : '<p class="aviso ouro">A senha de balcão está desligada: os pedidos novos não ganham número.</p>'}
      ${chamada ? `<section class="senha-chamando ${novas.includes(chamada) || chamada === novaChamada ? 'nova' : ''}" aria-live="assertive"><small>Chamando agora</small><b>${chamada.senha}</b><span>${t(chamada.cliente?.nome || 'Pode retirar no balcão')}</span></section>` : ''}
      <div class="senhas-cols"><section class="senhas-prep"><h2>Preparando</h2><div class="senhas">${prep.map((c) => `<b>${c.senha}</b>`).join('') || '<p>—</p>'}</div></section>
        <section class="senhas-ok"><h2>Pronto, pode retirar</h2><div class="senhas">${prontas.map((c) => `<b class="${novas.includes(c) ? 'nova' : ''}">${c.senha}</b>`).join('') || '<p>—</p>'}</div></section></div></div>`;
  },
});

// ------------------------------------------------------------------ contador da aba Pedidos: só balcão e delivery de hoje (cartões, eventos e encomendas futuras ficam fora)
function contadorPedidos() {
  const e = document.querySelector('[data-cont="pedidos"]'); if (!e) return;
  const n = db.comandas.filter((c) => (c.tipo === 'delivery' || c.tipo === 'balcao') && !(c.encomenda?.para && ymd(c.encomenda.para) > ymd())).length;
  e.textContent = n ? n : '';
}
ouvir(() => setTimeout(() => { contadorPedidos(); vitrineNovoDia(); }, 0));
setTimeout(() => { contadorPedidos(); vitrineNovoDia(); }, 0);

// ------------------------------------------------------------------ bar: chopp por barril, garrafas em doses e cartões
const mlDe = (b) => Number(prod((b.prods || [])[0])?.ml) || 0;
TELAS_MAIS.bar = () => {
  const chopp = (db.barris || []).filter((b) => b.tipo !== 'granel'), ativos = chopp.filter((b) => !b.fim), velhos = chopp.filter((b) => b.fim).sort((a, b) => b.fim - a.fim).slice(0, 8);
  const garrafas = db.insumos.filter((i) => i.unid === 'dose'), cartoes = db.comandas.filter((c) => c.tipo === 'cartao'), perdidos = cartoes.filter((c) => c.perdido);
  return volta('mais', 'Bar: chopp e doses', 'Cada copo vendido baixa o barril; cada dose baixa a garrafa') + `
    <div class="sec-tit"><h2>Barris na torneira</h2><span>${ativos.length} ${ativos.length === 1 ? 'barril' : 'barris'}</span></div>
    <div class="linha-bts"><button type="button" class="bt cheio" data-acao="barril-novo">${ico('mais2')}Ligar um barril</button></div>
    <ul class="lista-res barris">${ativos.map((b) => { const ml = mlDe(b), e = estadoBarril(b, ml), nomes = (b.prods || []).map((id) => prod(id)?.nome).filter(Boolean).join(', ');
      return `<li class="${e.pct <= 15 ? 'baixo' : ''}"><div><b>${t(b.nome)} · ${vir(e.litros)} L de ${b.litros} L</b><small>${t(nomes || 'sem produto ligado')}${ml ? ` · ${ml} ml por copo · ainda saem ${e.copos} copos` : ''} · ligado há ${tempo(b.inicio)}</small>
        <span class="barra" aria-label="${e.pct}% do barril"><i style="width:${e.pct}%"></i></span>${ml ? `<small>Vendidos ${e.vendidos} copos (${vir(r2(e.usado / 1000))} L) · o barril cheio rende ${e.esperados} copos</small>` : ''}</div>
        <div class="res-bts"><button type="button" class="bt" data-acao="barril-trocar" data-id="${b.id}">${ico('troca')}Trocar barril</button></div></li>`; }).join('') || '<li class="vazio">Nenhum barril ligado. Ligue um barril de 30 ou 50 L a um chopp com o ml do copo.</li>'}</ul>
    ${velhos.length ? `<div class="sec-tit"><h2>Barris trocados</h2><span>rendimento = vendido ÷ capacidade</span></div>
      <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Trocado</th><th>Barril</th><th class="num">Rendimento</th><th class="num">Perda</th></tr></thead><tbody>
      ${velhos.map((b) => `<tr><td>${new Date(b.fim).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td><td>${t(b.nome)} · ${b.litros} L</td><td class="num"><b class="${b.rendimento < 90 ? 'erro' : 'ok-txt'}">${vir(b.rendimento)}%</b></td><td class="num">${vir(r2((b.perdaMl || 0) / 1000))} L</td></tr>`).join('')}</tbody></table></div>` : ''}
    <div class="sec-tit"><h2>Garrafas em doses</h2><span>o estoque fica em garrafas fracionadas</span></div>
    <div class="linha-bts"><button type="button" class="bt" data-acao="garrafa-nova">${ico('mais2')}Nova garrafa</button></div>
    <ul class="lista-estoque">${garrafas.map((i) => { const p = Math.max(0, Math.min(100, (saldo(i) / ((i.minimo || 1) * 2)) * 100)), doses = db.produtos.filter((x) => (x.ficha || []).some((f) => f.insumo === i.id));
      // garrafa aberta: quanto resta dela (doses e ml), as fechadas e a perda medida nas conferências dos últimos 30 dias
      const g = estadoGarrafa(saldo(i), i.fator, i.mlDose), perda = (db.movEstoque || []).filter((m) => m.insumo === i.id && m.tipo === 'perda' && m.t >= Date.now() - 30 * 864e5), pd = -perda.reduce((s, m) => s + m.qtd, 0);
      return `<li class="${saldo(i) <= i.minimo ? 'baixo' : ''}"><div><b>${t(i.nome)}</b><small>${fmtQtd(saldo(i), 'dose', i.fator)} · ${i.fator} doses${i.mlDose ? ` de ${i.mlDose} ml` : ''} por garrafa · ${din(i.custo)} a garrafa${doses.length ? ` · vende em: ${t(doses.map((x) => x.nome).join(', '))}` : ''}</small>
        <div class="garrafa-aberta"><span class="gf-ico" aria-hidden="true"><i style="height:${g.aberta ? g.pct : 0}%"></i></span><span><b>${g.aberta ? `Garrafa aberta: restam ${vir(g.aberta)} de ${i.fator} doses${i.mlDose ? ` (${g.ml} ml)` : ''}` : 'Nenhuma garrafa aberta'}</b><small>${g.fechadas} ${g.fechadas === 1 ? 'fechada' : 'fechadas'}${pd ? ` · perda no mês: ${vir(r2(pd))} doses (${dinCurto((pd / i.fator) * i.custo)})` : ''}</small></span></div>
        <span class="barra"><i style="width:${p}%"></i></span></div><div class="res-bts"><button type="button" class="bt" data-acao="garrafa-conferir" data-i="${i.id}">Conferir a aberta</button><button type="button" class="bt-ico" data-acao="editar-insumo" data-i="${i.id}" aria-label="Editar ${t(i.nome)}">${ico('ajustes')}</button></div></li>`; }).join('') || '<li class="vazio">Nenhuma garrafa em doses. Cadastre a garrafa e quantas doses ela rende.</li>'}</ul>
    <div class="sec-tit"><h2>Cartões</h2><span>${cartoes.length} abertos${perdidos.length ? ` · ${perdidos.length} perdidos` : ''}</span></div>
    <div class="cartoes-abertos">${cartoes.sort((a, b) => a.cartao - b.cartao).map((c) => `<a class="cartao-ind ${c.perdido ? 'perdido' : ''}" href="#cartao/${c.cartao}"><b>${c.cartao}</b><small>${c.perdido ? 'perdido' : t(c.nome || '')}</small><em>${dinCurto(conta(c).total)}</em></a>`).join('') || '<div class="vazio">Nenhum cartão aberto.</div>'}</div>`;
};
// ligar um barril a um ou mais chopes (o ml do copo fica no produto)
function formBarril(titulo, base, depois) {
  const bar = db.produtos.filter((p) => p.setor === 'bar').sort((a, b) => (b.ml ? 1 : 0) - (a.ml ? 1 : 0)), sel = base?.prods?.[0] || bar.find((p) => p.ml)?.id || bar[0]?.id || '';
  folha({ titulo, corpo: `<label class="campo"><span>Chopp vendido deste barril</span><select data-p>${bar.map((p) => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${t(p.nome)}${p.ml ? ` (${p.ml} ml)` : ''}</option>`).join('')}</select></label>
    <div class="duas-c"><label class="campo"><span>ml por copo</span><input data-ml inputmode="numeric" value="${prod(sel)?.ml || 300}"></label><label class="campo"><span>Nome do barril</span><input data-n value="${t(base?.nome || prod(sel)?.nome.replace(/\s*\d+\s*ml$/i, '') || 'Chopp')}" maxlength="40"></label></div>
    <div class="campo"><span>Tamanho do barril</span><div class="chips">${[30, 50].map((l) => `<button type="button" class="chip ${(base?.litros || 50) === l ? 'on' : ''}" data-l="${l}">${l} L</button>`).join('')}<input class="campo-linha" data-litros inputmode="numeric" value="${base?.litros || 50}" aria-label="Litros do barril" style="max-width:90px"></div></div>
    <label class="campo"><span>Preço do barril (R$, para o custo da perda)</span><input data-c inputmode="decimal" value="${base?.custo ? vir(base.custo) : ''}" placeholder="0,00"></label>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Ligar o barril</button>',
  aoAbrir: (f, fechar) => {
    $('[data-p]', f).onchange = (e) => { const p = prod(e.target.value); if (p?.ml) $('[data-ml]', f).value = p.ml; };
    $$('[data-l]', f).forEach((b) => { b.onclick = () => { $('[data-litros]', f).value = b.dataset.l; $$('[data-l]', f).forEach((x) => x.classList.toggle('on', x === b)); }; });
    $('[data-ok]', f).onclick = () => {
      const p = prod($('[data-p]', f).value), ml = Math.round(num($('[data-ml]', f).value)), litros = Math.round(num($('[data-litros]', f).value));
      if (!p) return toast('Cadastre o chopp no cardápio (setor Bar)'); if (!(ml > 0)) return toast('Escreva o ml do copo'); if (!(litros > 0)) return toast('Escreva os litros do barril');
      const outro = (db.barris || []).find((b) => !b.fim && b !== base && (b.prods || []).includes(p.id)); if (outro) return toast(`O ${p.nome} já tem um barril ligado: use “Trocar barril”`);
      p.ml = ml;
      const novo = { id: uid('br'), nome: $('[data-n]', f).value.trim() || p.nome, prods: [p.id], litros, custo: r2(num($('[data-c]', f).value)), inicio: Date.now(), usado: {} };
      depois(novo); grava(); fechar();
    };
  } });
}
acao('barril-novo', () => formBarril('Ligar um barril', null, (b) => { (db.barris ||= []).push(b); toast(`${b.nome}: barril de ${b.litros} L ligado`); }));
// trocar: o que o sistema calcula que sobrou vira perda (espuma e fundo) e o barril novo começa cheio
acao('barril-trocar', (b) => {
  const br = (db.barris || []).find((x) => x.id === b.dataset.id); if (!br) return;
  const e = estadoBarril(br, mlDe(br)), fx = fecharBarril(br);
  formBarril(`Trocar barril · ${br.nome}`, br, (novo) => {
    const quem = quemAgora(), custo = br.litros ? r2((fx.perdaMl / (br.litros * 1000)) * (br.custo || 0)) : 0;
    Object.assign(br, { fim: Date.now(), perdaMl: fx.perdaMl, rendimento: fx.rendimento });
    if (fx.perdaMl > 0) {
      (db.movEstoque ||= []).push({ id: uid('e'), t: Date.now(), insumo: '', barril: br.id, nome: `Barril ${br.nome}`, tipo: 'perda', qtd: -fx.perdaMl, motivo: 'Fim do barril (espuma e fundo)', quem, custo });
      auditar('perda', { quem, item: `Barril ${br.nome}`, qtd: `${vir(r2(fx.perdaMl / 1000))} L`, valor: -custo, motivo: 'Fim do barril' });
    }
    db.barris.push(novo); toast(`Barril trocado · rendimento ${vir(fx.rendimento)}%${fx.perdaMl ? ` · perda de ${vir(e.litros)} L registrada` : ''}`);
  });
});
// conferir a garrafa aberta: mede o que sobrou (ml ou doses); a diferença para o sistema vira perda (dose maior, derramou)
acao('garrafa-conferir', (b) => {
  const i = insumo(b.dataset.i); if (!i) return; const ml = Number(i.mlDose) || 50, g = estadoGarrafa(saldo(i), i.fator, ml);
  folha({ titulo: `Conferir · ${i.nome}`, corpo: `<p class="mudo">O sistema diz que a garrafa aberta tem <b>${vir(g.aberta)} doses (${g.ml} ml)</b>. Meça o que sobrou de verdade.</p>
    <div class="duas-c"><label class="campo"><span>Sobrou na garrafa (ml)</span><input data-ml inputmode="numeric" value="${g.ml}"></label><label class="campo"><span>ml por dose</span><input data-dose inputmode="numeric" value="${ml}"></label></div><p class="peso-conta" data-dif></p>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Registrar a conferência</button>',
  aoAbrir: (f, fechar) => {
    const calc = () => { const d = Math.max(1, num($('[data-dose]', f).value)), real = r2(num($('[data-ml]', f).value) / d), p = perdaGarrafa(g.aberta, real); $('[data-dif]', f).textContent = p > 0 ? `Perda: ${vir(p)} doses (${dinCurto((p / i.fator) * i.custo)})` : p < 0 ? `Sobrou ${vir(-p)} doses a mais que o sistema: o estoque é acertado` : 'Bate com o sistema'; return { d, real, p }; };
    $$('input', f).forEach((x) => { x.oninput = calc; }); calc();
    $('[data-ok]', f).onclick = () => {
      const { d, real, p } = calc(); i.mlDose = Math.round(d);
      if (p > 0) registrarPerda(i.id, p, 'Conferência da garrafa aberta', quemAgora());
      else if (p < 0) ajustarEstoque(i.id, r2(saldo(i) - p), 'Conferência da garrafa aberta', quemAgora(), false);
      grava(); fechar(); toast(p > 0 ? `Perda de ${vir(p)} doses registrada` : `Conferido: ${vir(real)} doses na garrafa aberta`);
    };
  } });
});
// garrafa vendida em doses: vira um insumo em doses (1 garrafa = N doses) e, se quiser, o produto "Dose de…"
acao('garrafa-nova', () => folha({ titulo: 'Nova garrafa em doses', corpo: `<label class="campo"><span>Garrafa</span><input data-n maxlength="60" placeholder="Ex.: Whisky 12 anos (1 L)"></label>
  <div class="tres-c"><label class="campo"><span>Doses por garrafa</span><input data-d inputmode="numeric" value="20"></label><label class="campo"><span>Garrafas em estoque (pode ser 2,5)</span><input data-e inputmode="decimal" placeholder="0"></label><label class="campo"><span>Preço da garrafa (R$)</span><input data-c inputmode="decimal" placeholder="0,00"></label></div>
  <div class="duas-c"><label class="campo"><span>Avisar abaixo de (garrafas)</span><input data-m inputmode="decimal" value="1"></label><label class="campo"><span>Preço da dose no cardápio (vazio = não criar o produto)</span><input data-pd inputmode="decimal" placeholder="Ex.: 29,90"></label></div>`,
pe: '<button type="button" class="bt cheio grande" data-ok>Cadastrar</button>',
aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => {
  const nome = $('[data-n]', f).value.trim(), doses = Math.round(num($('[data-d]', f).value)); if (!nome) return toast('Escreva o nome da garrafa'); if (!(doses > 0)) return toast('Escreva quantas doses a garrafa rende');
  const i = { id: uid('i'), nome, unid: 'dose', compra: 'garrafa', fator: doses, estoque: r2(num($('[data-e]', f).value) * doses), minimo: r2(num($('[data-m]', f).value) * doses), custo: r2(num($('[data-c]', f).value)), geracao: Date.now() };
  db.insumos.push(i);
  const pd = r2(num($('[data-pd]', f).value));
  if (pd > 0) { const cat = db.categorias.find((c) => /bebida|drink|bar/i.test(c.nome))?.id || db.categorias[0]?.id || ''; db.produtos.push({ id: uid('p'), cat, nome: `Dose de ${nome.replace(/\s*\(.*\)\s*$/, '')}`, desc: '', preco: pd, setor: 'bar', foto: '', ativo: true, adicionais: [], ficha: [{ insumo: i.id, qtd: 1 }] }); }
  grava(); fechar(); toast(pd > 0 ? 'Garrafa e dose cadastradas' : 'Garrafa cadastrada');
}; } }));

// ------------------------------------------------------------------ cartão fidelidade: carimbos, prêmios e vencimentos de um cliente
const NOME_FID = { carimbo: 'Carimbo', premio: 'Prêmio entregue', venceu: 'Prêmio venceu' };
acao('fidel-hist', (b) => {
  const x = clientePorTel(b.dataset.tel); if (!x) return; const F = fidelidade(), v = vencePremio(x, F), l = (x.histFid || []).slice().reverse();
  folha({ titulo: `Cartão fidelidade · ${x.nome || x.tel}`, corpo: `<p class="mudo">${x.carimbos || 0} de ${F.compras} carimbos · ${x.premios || 0} ${x.premios === 1 ? 'prêmio entregue' : 'prêmios entregues'}${v ? ` · o prêmio vence em ${new Date(v).toLocaleDateString('pt-BR')}` : ''}</p>
    <ul class="lista-res">${l.map((h) => `<li><time>${new Date(h.t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</time><div><b>${NOME_FID[h.tipo] || h.tipo}</b>${h.valor ? `<small>compra que valeu ${dinCurto(h.valor)}</small>` : ''}</div></li>`).join('') || '<li class="vazio">O histórico começa na próxima compra.</li>'}</ul>` });
});

// ------------------------------------------------------------------ painel da gestão: os números que importam para o tipo de negócio
// mesmo cartão do resumo do dia (class "ko" + ícone), para ficar igual aos de cima em todos os templates
const card = (rot, val, det = '', href = '', ic = 'ao_vivo') => href
  ? `<a class="ko" href="${href}">${ico(ic)}<small>${rot}</small><b>${val}</b>${det ? `<span>${det}</span>` : ''}</a>`
  : `<div class="ko">${ico(ic)}<small>${rot}</small><b>${val}</b>${det ? `<span>${det}</span>` : ''}</div>`;
PAINEL_TIPO.push(() => {
  const l = [], hojeY = ymd(), ini = new Date(); ini.setHours(0, 0, 0, 0);
  const vh = db.vendas.filter((v) => v.ts >= ini.getTime() && !v.cancelado), mesas = db.comandas.filter((c) => c.tipo === 'mesa');
  if (tem('rodizio')) {
    const abertos = mesas.filter((c) => c.rodizio), pessoas = vh.reduce((s, v) => s + (v.rodizioPessoas ? pessoasRodizio(v.rodizioPessoas) : 0), 0) + abertos.reduce((s, c) => s + pessoasRodizio(c.rodizio), 0);
    l.push(card('Rodízios hoje', pessoas, `${abertos.length} ${abertos.length === 1 ? 'mesa' : 'mesas'} no rodízio agora`));
    if (tem('cartaoRodizio')) { const v = mesas.filter((c) => c.cartaoVerde && !c.pausaRod).length; l.push(card('Mesas pedindo carne', v, 'cartão verde agora', '#passador')); }
  }
  if (tem('portaria')) {
    const P = lojaCfg().portaria || {}, po = portariaAgora(), L = lotacao(po.entradas), R = resumoPortaria(po.entradas);
    l.push(card('Dentro agora', `${L.dentro}${P.capacidade ? ` / ${P.capacidade}` : ''}`, `${L.entradas} entradas · ${L.reentradas} reentradas`, '#portaria'));
    l.push(card('Ingressos por lote', Object.values(R.porLote).reduce((s, n) => s + n, 0), t(Object.entries(R.porLote).map(([k, n]) => `${k}: ${n}`).join(' · ') || 'nenhuma entrada ainda')));
    l.push(card('Consumação a cobrar', dinCurto(db.comandas.filter((c) => c.tipo === 'cartao' && c.consumacao).reduce((s, c) => s + conta(c).consumacao, 0)), 'de quem não consumiu o mínimo'));
  }
  if (tem('senha')) l.push(card('Senhas na fila', db.comandas.filter((c) => c.tipo === 'balcao' && c.senha && !prontaSenha(c)).length, 'preparando agora', '#senhas'));
  if (tem('vitrine')) { const v = db.vitrine?.dia === hojeY ? db.vitrine : { qtd: {} }; l.push(card('Vitrine restante', Object.values(v.qtd || {}).reduce((s, n) => s + (n || 0), 0), 'itens prontos para vender', '#mais/vitrine')); }
  if (tem('meiaMeia')) {
    const pedidos = db.comandas.filter((c) => c.tipo === 'delivery' || c.tipo === 'balcao');
    l.push(card('No forno', pedidos.filter((c) => c.itens.some((i) => i.status === 'preparo' && !i.cancelado)).length, `${pedidos.filter((c) => c.entrega === 'saiu').length} saíram para entrega`, '#pedidos'));
  }
  if (tem('encomendas')) { const e = db.comandas.filter((c) => c.encomenda?.para && ymd(c.encomenda.para) === hojeY); l.push(card('Encomendas de hoje', e.length, e.length ? `a próxima às ${new Date(Math.min(...e.map((c) => c.encomenda.para))).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'nenhuma para hoje', '#mais/encomendas')); }
  if (tem('comandaIndividual') && (db.barris || []).some((b) => !b.fim && b.tipo !== 'granel')) { const bs = db.barris.filter((b) => !b.fim && b.tipo !== 'granel'); l.push(card('Barris', `${vir(r2(bs.reduce((s, b) => s + estadoBarril(b).litros, 0)))} L`, t(bs.map((b) => `${b.nome}: ${vir(estadoBarril(b).litros)} L`).join(' · ')), '#mais/bar')); }
  if (tem('comandaIndividual')) { const cs = db.comandas.filter((c) => c.tipo === 'cartao'), pd = cs.filter((c) => c.perdido).length; l.push(card('Cartões abertos', cs.length, `${dinCurto(cs.reduce((s, c) => s + conta(c).total, 0))}${pd ? ` · ${pd} perdidos` : ''}`)); }
  if (tem('reservas')) { const r = (db.reservas || []).filter((x) => x.data === hojeY && ['pendente', 'confirmada', 'chegou'].includes(x.status)); l.push(card('Reservas de hoje', r.length, `${r.reduce((s, x) => s + x.pessoas, 0)} pessoas${(db.fila || []).length ? ` · fila ${db.fila.length}` : ''}`, '#mais/reservas')); }
  if (tem('eventos')) { const e = (db.eventos || []).filter((x) => x.data === hojeY), prox = (db.eventos || []).filter((x) => x.data > hojeY).sort((a, b) => a.data.localeCompare(b.data))[0];
    l.push(card('Eventos de hoje', e.length, e.length ? t(e.map((x) => x.nome).join(', ')) : prox ? `próximo: ${t(prox.nome)} (${dataCurta(prox.data)})` : 'nenhum marcado', '#mais/eventos')); }
  return l.join('');
});
export { portariaHoje };
