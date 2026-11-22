// Tecton · o que os três ramos têm em comum: menus, painel (cada ramo desenha o seu), clientes e fornecedores, financeiro
// (pagar, receber e fluxo de caixa), equipe, busca, primeiro uso, Configurações e o guia "Como usar".
import { db, grava, CONTA, RAMOS, ramoAtual, tela, acao, ir, cab, vazio, ico, t, R$, R0, dataBR, dataCurta, quando, hoje, somaDias, somaMeses, uid, soma, num, n2, pl,
  folha, editar, campos, lerCampos, toast, confirma, $, $$, pessoa, nomeDe, whatsapp, recibo, imprimir, reduzir, abrirEmpresaDemo, raiz, recomecar, dias } from './nucleo.js?v=2';

// ------------------------------------------------------------------ menus de cada ramo (o menu lateral e a barra de baixo)
// [rota, nome, ícone]; a barra de baixo do celular usa as rotas de BAIXO (no máximo 4 + Mais)
export const MENUS = {
  construtora: [['painel', 'Painel', 'painel'], ['obras', 'Obras', 'obra'], ['orcamentos', 'Orçamentos', 'orcamento'], ['equipes', 'Equipes e diárias', 'equipe'], ['compras', 'Compras', 'carrinho'], ['diario', 'Diário de obra', 'diario'], ['financeiro', 'Financeiro', 'dinheiro'], ['clientes', 'Clientes e fornecedores', 'pessoas']],
  loja: [['painel', 'Painel', 'painel'], ['balcao', 'Balcão', 'codigo'], ['caixa', 'Caixa do dia', 'dinheiro'], ['orcs', 'Orçamentos', 'orcamento'], ['estoque', 'Estoque', 'caixa'], ['entregas', 'Entregas', 'caminhao'], ['contas', 'Conta da obra e fiado', 'conta'], ['reposicao', 'Compras', 'carrinho'], ['relatorios', 'Relatórios', 'grafico'], ['financeiro', 'Financeiro', 'dinheiro'], ['clientes', 'Clientes e fornecedores', 'pessoas']],
  imobiliaria: [['painel', 'Painel', 'painel'], ['imoveis', 'Imóveis e lançamentos', 'predio'], ['funil', 'Interessados', 'funil'], ['visitas', 'Visitas', 'agenda'], ['contratos', 'Propostas e contratos', 'contrato'], ['alugueis', 'Aluguéis', 'chave'], ['comissoes', 'Comissões', 'porcento'], ['financeiro', 'Financeiro', 'dinheiro'], ['clientes', 'Clientes e proprietários', 'pessoas']],
};
export const BAIXO = { construtora: ['painel', 'obras', 'diario', 'equipes'], loja: ['painel', 'balcao', 'entregas', 'contas'], imobiliaria: ['painel', 'imoveis', 'funil', 'alugueis'] };
export const FIM = [['equipe', 'Equipe', 'equipe'], ['config', 'Configurações', 'ajustes']];
export const menuAtual = () => [...(MENUS[ramoAtual()] || []), ...FIM];

// ------------------------------------------------------------------ painel: cada ramo registra o seu
export const PAINEIS = {};
tela('painel', { titulo: 'Painel', html: () => PAINEIS[ramoAtual()].html(), montar: (el) => PAINEIS[ramoAtual()].montar?.(el) });
export const saudacao = () => { const h = new Date(Date.now() - 3 * 3600e3).getUTCHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
export const numero = (icone, rot, val, sub = '', ir2 = '') => `<${ir2 ? `button type="button" data-ir="${ir2}"` : 'div'} class="cartao num">${ico(icone)}<div><small>${t(rot)}</small><b>${val}</b>${sub ? `<span>${sub}</span>` : ''}</div></${ir2 ? 'button' : 'div'}>`;

// ------------------------------------------------------------------ movimentos: o financeiro junta os lançamentos e o que vem dos ramos
// cada item: { id, tipo: pagar|receber, desc, valor, venc, pago, pessoa, cat, origem, baixar(dia, forma) }
export const ORIGENS = []; // cada ramo empurra uma função () => [itens]
export function movimentos() {
  const l = db.fin.map((f) => ({ ...f, origem: 'Lançamento', baixar: (dia, forma) => { f.pago = dia; f.forma = forma; }, estornar: () => { f.pago = ''; f.forma = ''; } }));
  ORIGENS.forEach((fn) => { if (db.config.ramos.includes(fn.ramo)) l.push(...fn()); });
  return l;
}
export const aberto = (m) => !m.pago;
export const vencido = (m) => !m.pago && m.venc < hoje();
export const doMes = (m, ref = hoje().slice(0, 7)) => String(m.venc).slice(0, 7) === ref;
export function darBaixa(m, aposPagar) {
  const formas = ['Pix', 'Dinheiro', 'Boleto', 'Transferência', 'Cartão de débito', 'Cartão de crédito', 'Cheque'];
  folha({ titulo: m.tipo === 'pagar' ? 'Marcar como pago' : 'Receber', corpo: `<p class="forte">${t(m.desc)}</p><p class="mudo" style="margin:4px 0 14px">${R$(m.valor)} · vence ${dataBR(m.venc)}${m.pessoa ? ' · ' + t(nomeDe(m.pessoa)) : ''}</p>
    <div class="campos"><label class="campo"><span>Data</span><input type="date" name="dia" value="${hoje()}"></label><label class="campo"><span>Forma</span><select name="forma">${formas.map((f) => `<option>${f}</option>`).join('')}</select></label></div>`,
    pe: `<button type="button" class="bt" data-fechar>Cancelar</button>${m.tipo === 'receber' ? '<button type="button" class="bt" data-ok="recibo">Receber e imprimir recibo</button>' : ''}<button type="button" class="bt cheio" data-ok="1">${ico('check')}${m.tipo === 'pagar' ? 'Pago' : 'Recebido'}</button>`,
    aoAbrir: (el, fechar) => el.addEventListener('click', (e) => { const b = e.target.closest('[data-ok]'); if (!b) return; const dia = el.querySelector('[name=dia]').value || hoje(), forma = el.querySelector('[name=forma]').value; m.baixar(dia, forma); grava(); fechar(); toast(m.tipo === 'pagar' ? 'Marcado como pago' : 'Recebimento registrado'); if (b.dataset.ok === 'recibo') recibo({ de: m.pessoa ? nomeDe(m.pessoa) : m.de || 'cliente', valor: m.valor, ref: m.desc, forma, dia }); aposPagar?.(); }) });
}

// ------------------------------------------------------------------ financeiro
let filtroFin = 'abertos';
const linhaMov = (m) => `<li><span class="ponto ${m.pago ? 'ok' : vencido(m) ? '' : 'and'}" style="${vencido(m) ? 'border-color:var(--perigo);background:var(--perigo-suave)' : ''}"></span><div class="tx"><b>${t(m.desc)}</b><small>${m.pago ? `${m.tipo === 'pagar' ? 'Pago' : 'Recebido'} em ${dataBR(m.pago)}${m.forma ? ' · ' + t(m.forma) : ''}` : `Vence ${dataBR(m.venc)} (${quando(m.venc)})`}${m.pessoa ? ' · ' + t(nomeDe(m.pessoa)) : ''}${m.origem && m.origem !== 'Lançamento' ? ' · ' + t(m.origem) : ''}</small></div>
  <div class="val ${m.tipo === 'pagar' ? '' : 'verde'}">${m.tipo === 'pagar' ? '−' : '+'} ${R$(m.valor)}${vencido(m) ? '<small class="vermelho">vencida</small>' : ''}</div>
  ${m.pago ? (m.origem === 'Lançamento' ? `<button type="button" class="bt pq" data-acao="fin-estornar" data-id="${t(m.id)}">Desfazer</button>` : '') : `<button type="button" class="bt pq ${m.tipo === 'receber' ? 'cheio' : ''}" data-acao="fin-baixa" data-id="${t(m.id)}">${m.tipo === 'pagar' ? 'Pagar' : 'Receber'}</button>`}
  ${m.origem === 'Lançamento' ? `<button type="button" class="bt-ico" data-acao="fin-editar" data-id="${t(m.id)}" aria-label="Editar">${ico('lapis')}</button>` : ''}</li>`;
const achaMov = (id) => movimentos().find((m) => m.id === id);
acao('fin-baixa', (b) => { const m = achaMov(b.dataset.id); if (m) darBaixa(m); });
acao('fin-estornar', async (b) => { const f = db.fin.find((x) => x.id === b.dataset.id); if (f && await confirma('Voltar este lançamento para "em aberto"?', 'Desfazer')) { f.pago = ''; f.forma = ''; grava(); } });
const CAMPOS_FIN = () => [{ k: 'tipo', r: 'Tipo', tipo: 'select', op: [['pagar', 'Conta a pagar'], ['receber', 'Conta a receber']] }, { k: 'desc', r: 'Descrição', req: true, largo: true }, { k: 'valor', r: 'Valor (R$)', tipo: 'money', req: true }, { k: 'venc', r: 'Vencimento', tipo: 'date', req: true },
  { k: 'pessoa', r: 'Cliente ou fornecedor', tipo: 'pessoa' }, { k: 'cat', r: 'Categoria', ph: 'Material, mão de obra, aluguel…' },
  ...(db.config.ramos.includes('construtora') ? [{ k: 'obra', r: 'Obra (para o resultado da obra)', tipo: 'select', op: [['', '— sem obra —'], ...db.obras.map((o) => [o.id, o.nome])] }] : [])];
export function novoLanc(v = {}) {
  const lista = CAMPOS_FIN();
  editar({ titulo: v.id ? 'Editar lançamento' : 'Novo lançamento', lista: v.id ? lista : [...lista, { k: 'rep', r: 'Repetir por quantos meses', tipo: 'num', padrao: 1, dica: '1 = só este. Ex.: 12 para o aluguel do ano.' }], v: { tipo: 'pagar', venc: hoje(), ...v },
    aoSalvar: (d) => {
      if (v.id) { Object.assign(db.fin.find((x) => x.id === v.id), d); grava(); toast('Lançamento salvo'); return; }
      const n = Math.max(1, Math.min(60, Math.round(d.rep || 1))); delete d.rep;
      for (let i = 0; i < n; i++) db.fin.push({ id: uid('f'), pago: '', forma: '', ...d, desc: n > 1 ? `${d.desc} (${i + 1}/${n})` : d.desc, venc: somaMeses(d.venc, i) });
      grava(); toast(n > 1 ? `${n} lançamentos criados` : 'Lançamento criado');
    },
    aoApagar: v.id ? () => { db.fin = db.fin.filter((x) => x.id !== v.id); grava(); } : null });
}
acao('fin-novo', (b) => novoLanc({ tipo: b.dataset.tipo || 'pagar' }));
acao('fin-editar', (b) => { const f = db.fin.find((x) => x.id === b.dataset.id); if (f) novoLanc({ ...f }); });

export function saldoHoje() {
  const ms = movimentos().filter((m) => m.pago && m.pago <= hoje());
  return (db.config.saldoInicial || 0) + soma(ms.filter((m) => m.tipo === 'receber'), (m) => m.valor) - soma(ms.filter((m) => m.tipo === 'pagar'), (m) => m.valor) + soma(ENTRADAS_CAIXA.flatMap((f) => db.config.ramos.includes(f.ramo) ? f() : []), (x) => x.valor);
}
export const ENTRADAS_CAIXA = []; // vendas à vista da loja entram direto no caixa

tela('financeiro', {
  titulo: 'Financeiro',
  html(aba = 'receber') {
    const ms = movimentos(), lista = ms.filter((m) => m.tipo === aba || aba === 'fluxo').filter((m) => filtroFin === 'todos' ? true : filtroFin === 'pagos' ? m.pago : !m.pago).sort((a, b) => filtroFin === 'pagos' ? b.pago.localeCompare(a.pago) : a.venc.localeCompare(b.venc));
    const rec = ms.filter((m) => m.tipo === 'receber' && aberto(m)), pag = ms.filter((m) => m.tipo === 'pagar' && aberto(m));
    const topo = cab('Financeiro', 'O que entra, o que sai e quanto vai sobrar', `<button type="button" class="bt" data-acao="fin-exportar">${ico('doc')}Exportar para o contador</button><button type="button" class="bt" data-acao="fin-novo" data-tipo="receber">${ico('mais2')}A receber</button><button type="button" class="bt cheio" data-acao="fin-novo" data-tipo="pagar">${ico('mais2')}A pagar</button>`) +
      `<div class="grade g4">${numero('dinheiro', 'Saldo em caixa hoje', R$(saldoHoje()), 'saldo inicial + o que entrou e saiu')}${numero('frente', 'A receber em aberto', R$(soma(rec, (m) => m.valor)), pl(rec.filter(vencido).length, 'vencida', 'vencidas'))}${numero('voltar', 'A pagar em aberto', R$(soma(pag, (m) => m.valor)), pl(pag.filter(vencido).length, 'vencida', 'vencidas'))}${numero('agenda', 'Este mês', R$(soma(rec.filter((m) => doMes(m)), (m) => m.valor) - soma(pag.filter((m) => doMes(m)), (m) => m.valor)), 'a receber − a pagar no mês')}</div>
      <div class="chips" style="margin:18px 0 12px">${[['receber', 'A receber'], ['pagar', 'A pagar'], ['fluxo', 'Fluxo de caixa']].map(([k, n]) => `<button type="button" class="chip" data-ir="financeiro/${k}" aria-pressed="${aba === k}">${n}</button>`).join('')}</div>`;
    if (aba === 'fluxo') return topo + fluxo(ms);
    return topo + `<div class="cartao"><div class="cartao-cab"><h2>${aba === 'pagar' ? 'Contas a pagar' : 'Contas a receber'}</h2><div class="chips">${[['abertos', 'Em aberto'], ['pagos', aba === 'pagar' ? 'Pagas' : 'Recebidas'], ['todos', 'Todas']].map(([k, n]) => `<button type="button" class="chip" data-filtro-fin="${k}" aria-pressed="${filtroFin === k}">${n}</button>`).join('')}</div></div>
      ${lista.length ? `<ul class="lista">${lista.slice(0, 120).map(linhaMov).join('')}</ul>` : vazio(filtroFin === 'abertos' ? 'Nada em aberto aqui.' : 'Nenhum lançamento.')}</div>`;
  },
  montar(el) { $$('[data-filtro-fin]', el).forEach((b) => b.onclick = () => { filtroFin = b.dataset.filtroFin; ir(location.hash.slice(1) || 'financeiro'); }); $('[data-saldo]', el)?.addEventListener('click', ajustarSaldo); },
});
// exportação para o contador: planilha do mês (CSV que abre no Excel, com ; e acentos certos)
acao('fin-exportar', () => {
  const meses = Array.from({ length: 13 }, (_, i) => somaMeses(hoje().slice(0, 7) + '-01', -i).slice(0, 7));
  const nomeMes = (m) => { const [a, mm] = m.split('-'); return `${['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][+mm - 1]} de ${a}`; };
  const { el, fechar } = folha({ titulo: 'Exportar para o contador', corpo: `<p class="mudo" style="margin-bottom:12px">Uma planilha com tudo o que entrou e saiu no mês: data, descrição, categoria, cliente ou fornecedor, valor e situação. Abre no Excel e no Google Planilhas; é só mandar ao contador.</p>
    <label class="campo"><span>Mês</span><select name="mes">${meses.map((m, i) => `<option value="${m}" ${i === 1 ? 'selected' : ''}>${nomeMes(m)}${i === 0 ? ' (até hoje)' : ''}</option>`).join('')}</select></label>
    <label class="liga">Incluir o que ainda está em aberto (a pagar e a receber do mês)<input type="checkbox" name="abertos" checked></label>`,
    pe: `<button type="button" class="bt" data-fechar>Cancelar</button><button type="button" class="bt cheio" data-baixar>${ico('doc')}Baixar a planilha</button>` });
  el.querySelector('[data-baixar]').onclick = () => {
    const mes = el.querySelector('[name=mes]').value, abertos = el.querySelector('[name=abertos]').checked, no = (d) => String(d || '').slice(0, 7) === mes;
    const linhas = movimentos().filter((m) => (m.pago ? no(m.pago) : abertos && no(m.venc))).map((m) => [m.pago ? dataBR(m.pago) : '', dataBR(m.venc), m.tipo === 'pagar' ? 'Saída' : 'Entrada', m.desc, m.cat || m.origem || '', m.pessoa ? nomeDe(m.pessoa) : '', m.forma || '', (m.tipo === 'pagar' ? -1 : 1) * m.valor, m.pago ? (m.tipo === 'pagar' ? 'pago' : 'recebido') : 'em aberto']);
    ENTRADAS_CAIXA.forEach((f) => { if (db.config.ramos.includes(f.ramo)) f().filter((x) => no(x.dia)).forEach((x) => linhas.push([dataBR(x.dia), dataBR(x.dia), 'Entrada', x.desc || 'Venda à vista', x.cat || 'Vendas', x.quem || '', x.forma || '', x.valor, 'recebido'])); });
    linhas.sort((a, b) => (a[0] || a[1]).split('/').reverse().join('').localeCompare((b[0] || b[1]).split('/').reverse().join('')));
    const cel = (v) => (typeof v === 'number' ? v.toFixed(2).replace('.', ',') : `"${String(v).replace(/"/g, '""')}"`);
    const ent = soma(linhas.filter((l) => l[7] > 0 && l[8] !== 'em aberto'), (l) => l[7]), sai = soma(linhas.filter((l) => l[7] < 0 && l[8] !== 'em aberto'), (l) => -l[7]);
    const csv = '\ufeff' + [[`${db.config.nome || 'Empresa'} · ${nomeMes(mes)}`], [], ['Pago ou recebido em', 'Vencimento', 'Tipo', 'Descrição', 'Categoria', 'Cliente ou fornecedor', 'Forma', 'Valor (R$)', 'Situação'], ...linhas, [], ['', '', '', 'Total que entrou', '', '', '', ent, ''], ['', '', '', 'Total que saiu', '', '', '', -sai, ''], ['', '', '', 'Resultado do mês', '', '', '', ent - sai, '']].map((l) => l.map(cel).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `tecton-${mes}-${(db.config.nome || 'empresa').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    fechar(); toast(`Planilha de ${nomeMes(mes)} baixada: ${linhas.length} lançamentos`);
  };
});
function ajustarSaldo() {
  editar({ titulo: 'Saldo inicial do caixa', lista: [{ k: 'saldoInicial', r: 'Quanto tinha em caixa e no banco quando começou a usar o Tecton (R$)', tipo: 'money', largo: true }], v: { saldoInicial: db.config.saldoInicial || 0 },
    aoSalvar: (d) => { db.config.saldoInicial = d.saldoInicial; grava(); toast('Saldo ajustado'); } });
}
function fluxo(ms) {
  // próximas 8 semanas: o que já venceu e não foi pago entra na primeira
  const sem = Array.from({ length: 8 }, (_, i) => ({ ini: somaDias(hoje(), i * 7), fim: somaDias(hoje(), i * 7 + 6), ent: 0, sai: 0 }));
  ms.filter(aberto).forEach((m) => { const i = Math.max(0, Math.floor(dias(hoje(), m.venc) / 7)); if (i > 7) return; sem[i][m.tipo === 'receber' ? 'ent' : 'sai'] += m.valor; });
  let s = saldoHoje(); sem.forEach((x) => { s += x.ent - x.sai; x.saldo = s; });
  const max = Math.max(1, ...sem.map((x) => Math.max(x.ent, x.sai)));
  const ult = ms.filter((m) => m.pago && m.pago >= somaDias(hoje(), -30) && m.pago <= hoje());
  const extras = ENTRADAS_CAIXA.flatMap((f) => db.config.ramos.includes(f.ramo) ? f().filter((x) => x.dia >= somaDias(hoje(), -30)) : []);
  const cats = {}; ult.filter((m) => m.tipo === 'pagar').forEach((m) => { cats[m.cat || 'Sem categoria'] = (cats[m.cat || 'Sem categoria'] || 0) + m.valor; });
  return `<div class="grade g-larga"><div class="cartao"><div class="cartao-cab"><h2>Próximas 8 semanas</h2><button type="button" class="bt pq" data-saldo>Ajustar saldo inicial</button></div>
    <div class="tab-wrap"><table class="tab empilha"><thead><tr><th>Semana</th><th class="n">Entra</th><th class="n">Sai</th><th class="n">Saldo previsto</th><th style="width:30%">Comparação</th></tr></thead><tbody>
    ${sem.map((x) => `<tr><td data-r="Semana">${dataCurta(x.ini)} a ${dataCurta(x.fim)}</td><td class="n verde" data-r="Entra">${R0(x.ent)}</td><td class="n" data-r="Sai">${R0(x.sai)}</td><td class="n forte ${x.saldo < 0 ? 'vermelho' : ''}" data-r="Saldo">${R0(x.saldo)}</td>
      <td data-r="Comparação"><div style="display:grid;gap:3px;min-width:90px"><div class="barra pri"><i style="width:${x.ent / max * 100}%"></i></div><div class="barra"><i style="width:${x.sai / max * 100}%"></i></div></div></td></tr>`).join('')}</tbody></table></div>
    <p class="mudo peq" style="margin-top:8px">Barra verde-petróleo: entra · barra amarela: sai. Contas vencidas e não pagas entram na primeira semana.</p></div>
    <div class="cartao"><h2>Últimos 30 dias</h2><ul class="lista"><li><div class="tx"><b>Entrou</b><small>recebimentos${extras.length ? ' e vendas à vista' : ''}</small></div><div class="val verde">${R$(soma(ult.filter((m) => m.tipo === 'receber'), (m) => m.valor) + soma(extras, (x) => x.valor))}</div></li>
      <li><div class="tx"><b>Saiu</b><small>contas pagas</small></div><div class="val">${R$(soma(ult.filter((m) => m.tipo === 'pagar'), (m) => m.valor))}</div></li></ul>
      <h3 style="margin:14px 0 6px">Para onde foi o dinheiro</h3><ul class="lista">${Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li><div class="tx"><b>${t(k)}</b></div><div class="val">${R$(v)}</div></li>`).join('') || '<li class="mudo">Nada pago nos últimos 30 dias.</li>'}</ul>
      <p class="mudo peq" style="margin-top:10px">Extrato do banco automático: em breve. Hoje você marca o que foi pago e recebido.</p></div></div>`;
}

// ------------------------------------------------------------------ clientes e fornecedores
let filtroP = 'todos', buscaP = '';
export const CAMPOS_PESSOA = () => [{ k: 'nome', r: 'Nome', req: true, largo: true }, { k: 'tipo', r: 'É', tipo: 'select', op: [['cliente', 'Cliente'], ['fornecedor', 'Fornecedor'], ['ambos', 'Cliente e fornecedor']] }, { k: 'fone', r: 'WhatsApp', tipo: 'tel', ph: '(16) 99999-0000' },
  { k: 'doc', r: 'CPF ou CNPJ' }, { k: 'email', r: 'E-mail', tipo: 'email' }, { k: 'endereco', r: 'Endereço', largo: true }, { k: 'cidade', r: 'Cidade' },
  ...(db.config.ramos.includes('loja') ? [{ k: 'tabela', r: 'Tabela de preço', tipo: 'select', op: (db.config.tabelas || [{ id: 'balcao', nome: 'Balcão' }]).map((x) => [x.id, x.nome]) }, { k: 'limite', r: 'Limite do fiado (R$)', tipo: 'money', dica: '0 = não compra fiado' }] : []),
  { k: 'obs', r: 'Observações', tipo: 'area' }];
export function editarPessoa(v = {}, aoCriar) {
  editar({ titulo: v.id ? 'Editar cadastro' : 'Novo cadastro', lista: CAMPOS_PESSOA(), v: { tipo: 'cliente', cidade: `${db.config.cidade || ''}/${db.config.uf || ''}`, ...v },
    aoSalvar: (d) => { if (v.id) Object.assign(pessoa(v.id), d); else { const p = { id: uid('p'), ...d }; db.pessoas.push(p); aoCriar?.(p); } grava(); toast('Cadastro salvo'); },
    aoApagar: v.id ? () => { db.pessoas = db.pessoas.filter((x) => x.id !== v.id); grava(); ir('clientes'); } : null });
}
acao('pessoa-nova', (b) => editarPessoa({ tipo: b.dataset.tipo || 'cliente' }));
acao('pessoa-editar', (b) => editarPessoa({ ...pessoa(b.dataset.id) }));
acao('pessoa-zap', (b) => { const p = pessoa(b.dataset.id); whatsapp(p.fone, `Olá, ${p.nome.split(' ')[0]}! Aqui é da ${db.config.nome}.`, p.nome); });
export const RELACIONADOS = []; // cada ramo: (pessoa) => html
tela('clientes', {
  titulo: 'Clientes e fornecedores',
  html() {
    const q = buscaP.toLowerCase(), l = db.pessoas.filter((p) => filtroP === 'todos' || p.tipo === filtroP || p.tipo === 'ambos').filter((p) => !q || `${p.nome} ${p.fone} ${p.doc}`.toLowerCase().includes(q)).sort((a, b) => a.nome.localeCompare(b.nome));
    return cab(db.config.ramos.includes('imobiliaria') && db.config.ramos.length === 1 ? 'Clientes e proprietários' : 'Clientes e fornecedores', `${db.pessoas.length} cadastros`, `<button type="button" class="bt cheio" data-acao="pessoa-nova">${ico('mais2')}Novo cadastro</button>`) +
      `<div class="cartao"><div class="cartao-cab"><div class="chips">${[['todos', 'Todos'], ['cliente', 'Clientes'], ['fornecedor', 'Fornecedores']].map(([k, n]) => `<button type="button" class="chip" data-fp="${k}" aria-pressed="${filtroP === k}">${n}</button>`).join('')}</div>
      <input class="ent" style="max-width:320px" type="search" data-busca-p placeholder="Procurar por nome ou telefone" value="${t(buscaP)}" aria-label="Procurar cadastro"></div>
      ${l.length ? `<ul class="lista">${l.map((p) => `<li><button type="button" class="item-bt" data-ir="pessoa/${p.id}"><span class="cfg-foto" style="width:42px;height:42px;font-size:1rem">${t(p.nome[0] || '?')}</span><span class="tx"><b>${t(p.nome)}</b><small>${t({ cliente: 'Cliente', fornecedor: 'Fornecedor', ambos: 'Cliente e fornecedor' }[p.tipo] || '')}${p.fone ? ' · ' + t(p.fone) : ''}</small></span></button>${p.fone ? `<button type="button" class="bt-ico" data-acao="pessoa-zap" data-id="${p.id}" aria-label="WhatsApp de ${t(p.nome)}">${ico('zap')}</button>` : ''}</li>`).join('')}</ul>` : vazio('Ninguém encontrado.')}</div>`;
  },
  montar(el) {
    $$('[data-fp]', el).forEach((b) => b.onclick = () => { filtroP = b.dataset.fp; ir('clientes'); });
    const i = $('[data-busca-p]', el); i.oninput = () => { buscaP = i.value; const pos = i.selectionStart; ir('clientes'); const n = $('[data-busca-p]'); n.focus(); n.setSelectionRange(pos, pos); };
  },
});
tela('pessoa', {
  titulo: (id) => pessoa(id)?.nome || 'Cadastro', aba: 'clientes',
  html(id) {
    const p = pessoa(id); if (!p) return cab('Cadastro não encontrado', '', '', 'clientes');
    const ms = movimentos().filter((m) => m.pessoa === id).sort((a, b) => b.venc.localeCompare(a.venc));
    return cab(p.nome, t([{ cliente: 'Cliente', fornecedor: 'Fornecedor', ambos: 'Cliente e fornecedor' }[p.tipo], p.fone, p.doc, p.cidade].filter(Boolean).join(' · ')), `${p.fone ? `<button type="button" class="bt zap" data-acao="pessoa-zap" data-id="${p.id}">${ico('zap')}WhatsApp</button>` : ''}<button type="button" class="bt" data-acao="pessoa-editar" data-id="${p.id}">${ico('lapis')}Editar</button>`, 'clientes') +
      `<div class="grade g-larga"><div>${RELACIONADOS.map((f) => f(p)).join('')}${p.obs ? `<div class="cartao"><h2>Observações</h2><p>${t(p.obs)}</p></div>` : ''}</div>
      <div class="cartao"><h2>Financeiro</h2>${ms.length ? `<ul class="lista">${ms.slice(0, 30).map(linhaMov).join('')}</ul>` : vazio('Nada lançado para este cadastro.')}</div></div>`;
  },
});

// ------------------------------------------------------------------ equipe (na conta: convites de verdade pela nuvem; na demonstração: simulado)
tela('equipe', {
  titulo: 'Equipe',
  html() {
    const real = CONTA && window.veltriaAbrir;
    return cab('Equipe e permissões', 'Cada pessoa entra com o próprio e-mail e vê só as telas que você liberar') + (real
      ? `<div class="cartao"><h2>Sua equipe</h2><p class="mudo">Convide pelo e-mail: a pessoa recebe o link, cria a senha e já cai na sua empresa com o cargo e as telas que você escolher. Equipe sem limite.</p>
        <div class="linha-bts"><button type="button" class="bt cheio" data-conta="convidar">${ico('mais2')}Convidar pessoa</button><button type="button" class="bt" data-conta="equipe">${ico('ajustes')}Ver e editar a equipe</button><button type="button" class="bt" data-conta="perfil">${ico('pessoas')}Meu perfil</button></div></div>`
      : `<div class="cartao"><div class="cartao-cab"><h2>Sua equipe</h2><button type="button" class="bt cheio" data-acao="eq-pessoa">${ico('mais2')}Convidar pessoa</button></div>
        <ul class="lista"><li><span class="cfg-foto" style="width:42px;height:42px;font-size:1rem">V</span><div class="tx"><b>Você</b><small>Dono · vê e muda tudo</small></div></li>
        ${db.equipe.map((p) => `<li><span class="cfg-foto" style="width:42px;height:42px;font-size:1rem">${t((p.nome || p.email)[0].toUpperCase())}</span><div class="tx"><b>${t(p.nome || p.email)}</b><small>${t(p.cargo || 'Equipe')} · ${p.telas ? t(p.telas.map((h) => (menuAtual().find((m) => '#' + m[0] === h) || [0, h])[1]).join(', ')) : 'todas as telas'}${p.soVer ? ' · só ver' : ''} · ${p.aceito ? 'ativo' : 'convite enviado'}</small></div><button type="button" class="bt-ico" data-acao="eq-pessoa" data-id="${p.id}" aria-label="Editar ${t(p.nome || p.email)}">${ico('lapis')}</button></li>`).join('')}</ul>
        <p class="mudo peq" style="margin-top:10px">Na demonstração o convite não sai por e-mail. Na sua conta, a pessoa recebe o convite e entra com o próprio login.</p></div>`);
  },
});
document.addEventListener('click', (e) => { const b = e.target.closest('[data-conta]'); if (!b) return; const f = window.veltriaAbrir?.[b.dataset.conta]; if (f) f(); else toast('Disponível na sua conta'); });
acao('eq-pessoa', (b) => {
  const p = b.dataset.id ? db.equipe.find((x) => x.id === b.dataset.id) : null, telas = menuAtual().filter((m) => m[0] !== 'config');
  const sel = p?.telas || telas.map((m) => '#' + m[0]);
  const { el, fechar } = folha({ titulo: p ? 'Editar pessoa' : 'Convidar pessoa', corpo: `<form>${campos([{ k: 'email', r: 'E-mail', tipo: 'email', req: true }, { k: 'nome', r: 'Nome' }, { k: 'cargo', r: 'Cargo', ph: 'Mestre de obras, caixa, corretor…' }], p || {})}
      <p class="campo"><span>Telas que vê</span></p><div class="grade g2" style="gap:0 12px">${telas.map(([h, n]) => `<label class="marca-op"><input type="checkbox" name="tela" value="#${h}" ${sel.includes('#' + h) ? 'checked' : ''}>${t(n)}</label>`).join('')}</div>
      <label class="liga">Só pode ver (não altera nada)<input type="checkbox" name="soVer" ${p?.soVer ? 'checked' : ''}></label></form>`,
    pe: `${p ? '<button type="button" class="bt perigo" data-tirar>Tirar da equipe</button>' : ''}<button type="button" class="bt" data-fechar>Cancelar</button><button type="button" class="bt cheio" data-ok>${p ? 'Salvar' : 'Mandar convite'}</button>` });
  el.querySelector('[data-ok]').onclick = () => {
    const f = el.querySelector('form'), email = f.email.value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('Digite um e-mail válido'); f.email.focus(); return; }
    const marcadas = $$('[name=tela]:checked', f).map((i) => i.value);
    const d = { email, nome: f.nome.value.trim(), cargo: f.cargo.value.trim(), telas: marcadas.length === telas.length ? null : marcadas, soVer: f.soVer.checked };
    if (p) Object.assign(p, d); else db.equipe.push({ id: uid('u'), aceito: false, ...d });
    grava(); fechar(); toast(p ? 'Pessoa salva' : 'Convite registrado (simulado na demonstração)');
  };
  el.querySelector('[data-tirar]')?.addEventListener('click', async () => { if (await confirma(`Tirar ${p.email} da equipe?`, 'Tirar', true)) { db.equipe = db.equipe.filter((x) => x !== p); grava(); fechar(); } });
});

// ------------------------------------------------------------------ busca (no topo)
export const BUSCAS = []; // cada ramo: (q) => [[título, detalhe, rota]]
export function buscar(q) {
  q = q.trim().toLowerCase(); if (q.length < 2) return [];
  const r = db.pessoas.filter((p) => `${p.nome} ${p.fone} ${p.doc}`.toLowerCase().includes(q)).map((p) => [p.nome, p.tipo === 'fornecedor' ? 'Fornecedor' : 'Cliente', `pessoa/${p.id}`]);
  BUSCAS.forEach((f) => { if (db.config.ramos.includes(f.ramo)) r.push(...f(q)); });
  movimentos().filter((m) => m.desc.toLowerCase().includes(q)).slice(0, 6).forEach((m) => r.push([m.desc, `${m.tipo === 'pagar' ? 'A pagar' : 'A receber'} · ${R$(m.valor)} · ${dataBR(m.venc)}`, `financeiro/${m.tipo}`]));
  return r.slice(0, 20);
}

// ------------------------------------------------------------------ "Mais" (celular): tudo o que não cabe na barra de baixo
tela('mais', {
  titulo: 'Mais',
  html() {
    const r = ramoAtual(), resto = menuAtual().filter(([h]) => !BAIXO[r].includes(h));
    return cab('Mais', RAMOS[r].nome) + `<div class="menu-g">${resto.map(([h, n, i]) => `<a href="#${h}">${ico(i)}<span><b>${t(n)}</b></span></a>`).join('')}</div>
      ${db.config.ramos.length > 1 ? `<div class="cartao" style="margin-top:16px"><h2>Trocar de ramo</h2><div class="chips">${db.config.ramos.map((k) => `<button type="button" class="chip" data-acao="ramo" data-ramo="${k}" aria-pressed="${k === r}">${RAMOS[k].curto}</button>`).join('')}</div></div>` : ''}`;
  },
});
acao('ramo', (b) => { db.config.ramo = b.dataset.ramo; grava(); ir('painel'); });

// ------------------------------------------------------------------ primeiro uso: escolher o ramo
const RAMO_TXT = {
  construtora: ['Obras com cronograma e % físico e financeiro', 'Orçamento com BDI, medições e aditivos', 'Equipes, diárias, compras e diário com fotos', 'Link para o cliente acompanhar a obra'],
  loja: ['Balcão com leitor de código de barras', 'Orçamento no WhatsApp e entregas do dia', 'Conta da obra e fiado com limite', 'Estoque em saco, m³, m², metro e peça'],
  imobiliaria: ['Lançamentos com espelho de vendas', 'Interessados, visitas e propostas', 'Contrato com parcelas e correção', 'Aluguel com repasse e comissões'],
};
const EXEMPLO = { construtora: 'Alicerce Construções', loja: 'Depósito São Bento', imobiliaria: 'Vale Imóveis' };
tela('_escolha', {
  html() {
    const demo = !CONTA;
    return `<div class="escolha"><h1>${demo ? 'Qual ramo você quer conhecer?' : 'O que a sua empresa faz?'}</h1><p class="mudo" style="margin-top:6px">${demo ? 'Cada ramo abre com uma empresa de exemplo de Orlândia e cerca de 30 dias de movimento. Dá para trocar depois, na faixa amarela do alto.' : 'Escolha o principal. Você passa a ver só as telas dele; se fizer mais de uma coisa, liga um segundo ramo em Configurações.'}</p>
      <div class="ramos">${Object.entries(RAMOS).map(([k, r]) => `<button type="button" class="ramo-card" data-escolhe="${k}">${ico(r.ico)}<b>${t(r.nome)}</b><ul>${RAMO_TXT[k].map((x) => `<li>${t(x)}</li>`).join('')}</ul><span class="bt cheio">${demo ? `Ver ${t(EXEMPLO[k])}` : 'É este'}</span></button>`).join('')}</div></div>`;
  },
  montar(el) {
    $$('[data-escolhe]', el).forEach((b) => b.onclick = () => {
      const k = b.dataset.escolhe;
      if (!CONTA) { abrirEmpresaDemo(k); location.hash = 'painel'; dispatchEvent(new Event('tecton-ramo')); return; }
      db.config.ramos = [k]; db.config.ramo = k; if (!db.config.nome) db.config.nome = window.veltriaConta?.empresa || '';
      grava(); location.hash = 'painel'; dispatchEvent(new Event('tecton-ramo')); toast(`Pronto: o Tecton está arrumado para ${RAMOS[k].curto.toLowerCase()}`);
    });
  },
});

// ------------------------------------------------------------------ Configurações
export const ESQUEMAS = [
  { id: 'petroleo', nome: 'Petróleo', menu: '#0F3D40', menu2: '#17555A', pri: '#0F5C5E', suave: '#DCEBEA', tinta: '#0B4A4C', txt: 'Verde-petróleo e amarelo de obra (o padrão)' },
  { id: 'ardosia', nome: 'Ardósia', menu: '#1D2B3A', menu2: '#2A3D52', pri: '#2C5282', suave: '#DEE7F2', tinta: '#22406A', txt: 'Azul-ardósia, de planta baixa' },
  { id: 'musgo', nome: 'Musgo', menu: '#22351F', menu2: '#30492B', pri: '#3F6B2F', suave: '#E2ECDA', tinta: '#335826', txt: 'Verde de mata e de terreno' },
  { id: 'tijolo', nome: 'Tijolo', menu: '#3B1F17', menu2: '#522B20', pri: '#9A3B1F', suave: '#F4E0D6', tinta: '#7E2F18', txt: 'Marrom e tijolo à vista' },
  { id: 'grafite', nome: 'Grafite', menu: '#1F2326', menu2: '#2E3438', pri: '#3D4A52', suave: '#E3E7EA', tinta: '#2F3A41', txt: 'Cinza de concreto aparente' },
];
export const esquema = () => ESQUEMAS.find((e) => e.id === db?.config.esquema) || ESQUEMAS[0];
export function aplicarEsquema() {
  const E = esquema(), r = document.documentElement.style;
  r.setProperty('--menu', E.menu); r.setProperty('--menu2', E.menu2); r.setProperty('--pri', E.pri); r.setProperty('--pri-suave', E.suave); r.setProperty('--pri-tinta', E.tinta);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', E.menu);
}
export const COMO = {
  painel: ['Painel', ['O resumo do dia: números grandes no alto e o que pede atenção.', 'Toque num número ou numa linha para abrir os detalhes.']],
  obras: ['Obras', ['Cada obra com cronograma, orçamento, medições, aditivos, compras, equipe, diário, financeiro e documentos.', '“Nova obra” já cria as etapas padrão; mude datas e nomes no Cronograma.']],
  orcamentos: ['Orçamentos', ['Monte o orçamento por etapa: material, mão de obra e equipamento.', 'O BDI vira o preço de venda. Imprima ou salve em PDF para o cliente.', '“Aprovado” transforma o orçamento em obra em andamento.']],
  equipes: ['Equipes e diárias', ['Marque quem trabalhou hoje e em qual obra.', '“Fechar a semana” soma as diárias de cada pessoa e lança no Financeiro.']],
  compras: ['Compras', ['Pedido ao fornecedor por obra, enviado no WhatsApp.', 'Marque o que chegou: o pedido fica completo ou parcial.']],
  diario: ['Diário de obra', ['Escolha a obra, o clima e quantas pessoas trabalharam.', 'Escreva o que foi feito e tire as fotos pelo celular.']],
  balcao: ['Balcão', ['Bipe o código de barras (o leitor USB funciona como teclado) ou digite o nome.', 'A quantidade aceita fração (2,5 m³, 37 m de fio).', 'Receba, lance na conta da obra, no fiado, ou mande o orçamento no WhatsApp.']],
  caixa: ['Caixa do dia', ['Abra o caixa com o troco da gaveta; cada computador escolhe o seu caixa.', 'Sangria e suprimento ficam registrados com o motivo.', 'No fim do dia, conte a gaveta: o Tecton mostra a diferença e imprime o fechamento.']],
  orcs: ['Orçamentos', ['Orçamentos salvos e enviados.', '“Virar venda” leva os itens para o Balcão.']],
  estoque: ['Estoque', ['Produtos com unidade (saco, m³, m², metro, peça) e o fracionado (fio vendido em metro e comprado em rolo).', 'Preço por tabela e desconto por quantidade em cada produto.']],
  entregas: ['Entregas', ['O roteiro do dia por caminhão, na ordem das setas.', 'Marque “Saiu” e “Entregue”; imprima o roteiro para o motorista.']],
  contas: ['Conta da obra e fiado', ['Conta da obra: o cliente compra para uma obra e paga depois, com limite.', 'Fiado: limite por profissional; acima do limite o Balcão avisa.']],
  reposicao: ['Compras', ['Pedido ao fornecedor; “Montar com o que está baixo” sugere as quantidades.', 'Ao receber, o estoque sobe e a conta a pagar é criada.']],
  relatorios: ['Relatórios', ['O que mais gira e o que está parado (sem venda há 30 dias).']],
  imoveis: ['Imóveis e lançamentos', ['Lançamentos com o espelho de vendas por bloco e andar; toque numa unidade para ver a tabela.', 'Imóveis avulsos para vender ou alugar.']],
  funil: ['Interessados', ['Cada interessado numa coluna: novo, contato, visita, proposta, fechado.', 'Use as setas para mudar de etapa.']],
  visitas: ['Visitas', ['Visitas do dia e da semana; confirme pelo WhatsApp e anote o retorno.']],
  contratos: ['Propostas e contratos', ['Proposta com entrada, mensais, intermediárias e chaves.', 'Aceita, vira contrato com as parcelas; aplique a correção do índice todo mês.']],
  alugueis: ['Aluguéis', ['Cobrança do mês de cada contrato, recebimento e repasse ao proprietário (menos a taxa).']],
  comissoes: ['Comissões', ['Comissão de cada corretor por venda e locação; marque quando pagar.']],
  financeiro: ['Financeiro', ['A receber, a pagar e o fluxo de caixa das próximas 8 semanas.', 'Lançamentos repetidos (aluguel, contador) com “Repetir por meses”.']],
  clientes: ['Clientes e fornecedores', ['Todos os cadastros num lugar só, com o histórico e o WhatsApp.']],
  equipe: ['Equipe', ['Convide pelo e-mail, escolha o cargo e as telas que cada pessoa vê.']],
  config: ['Configurações', ['Perfil, empresa, ramos, cores, sua marca, guia e assinatura.']],
};
export function comoUsar(k) {
  const c = COMO[k] || COMO.painel;
  folha({ titulo: `Como usar: ${c[0]}`, corpo: `<ol class="como-lista">${c[1].map((x) => `<li>${t(x)}</li>`).join('')}</ol>`, pe: `<button type="button" class="bt" data-ir="config/cfg-guia">Guia de todas as telas</button><button type="button" class="bt cheio" data-fechar>Entendi</button>` });
}
const papel = () => (CONTA && window.veltriaAbrir ? window.veltriaAbrir.papel : 'dono');
export const gestor = () => !CONTA || ['dono', 'admin'].includes(papel());
let conta = { email: '', modo: CONTA ? 'conta' : 'demo' }, blocoAss = null;
const chavePerfil = () => (conta.email || 'demo').toLowerCase();
const perfil = () => (db.config.perfis || {})[chavePerfil()] || {};
const setPerfil = (p) => { db.config.perfis = { ...(db.config.perfis || {}), [chavePerfil()]: { ...perfil(), ...p } }; grava(); };
tela('config', {
  titulo: 'Configurações',
  html() {
    const c = db.config, pf = perfil(), g = gestor(), E = esquema(), M = c.marca || {};
    const nome = pf.nome || (conta.modo === 'demo' ? 'Você' : ''), ini = (nome || conta.email || '?').trim()[0].toUpperCase();
    const secs = [['cfg-perfil', 'Perfil'], ['cfg-empresa', 'Empresa'], ['cfg-ramos', 'Ramos'], ['cfg-cores', 'Cores'], ['cfg-marca', 'Sua marca'], ['cfg-guia', 'Guia'], ['cfg-assinatura', 'Minha assinatura']];
    return cab('Configurações', g ? 'Seu perfil, a empresa, os ramos, as cores, a marca, o guia e a assinatura' : 'Seu perfil, o guia e a assinatura. O resto só o dono muda') +
    `<nav class="cfg-nav" aria-label="Seções">${secs.map(([id, n]) => `<button type="button" class="chip" data-ir="config/${id}">${n}</button>`).join('')}</nav>
    <div class="grade g2">
      <section class="cartao" id="cfg-perfil"><h2>Perfil</h2>
        <div class="cfg-eu"><div class="cfg-foto" style="${pf.foto ? `background-image:url('${t(pf.foto)}')` : ''}">${pf.foto ? '' : t(ini)}</div>
          <div class="linha-bts" style="margin:0"><label class="bt pq">${ico('foto')}${pf.foto ? 'Trocar a foto' : 'Pôr foto'}<input type="file" accept="image/*" data-foto hidden></label>${pf.foto ? '<button type="button" class="bt pq" data-tira-foto>Remover foto</button>' : ''}</div></div>
        <label class="campo"><span>Seu nome</span><input data-nome-eu maxlength="40" value="${t(pf.nome || '')}" placeholder="Como a equipe te chama"></label>
        <div class="campos"><label class="campo"><span>E-mail da conta</span><input readonly value="${t(conta.email || (CONTA ? '' : 'demonstração'))}"><small>É o e-mail do login.</small></label><label class="campo"><span>Cargo</span><input readonly value="${t({ dono: 'Dono', admin: 'Administrador', membro: 'Equipe' }[papel()] || 'Equipe')}"></label></div>
        <div class="linha-bts"><button type="button" class="bt cheio" data-salvar-eu>${ico('check')}Salvar</button>${conta.modo === 'conta' ? `<button type="button" class="bt" data-trocar-senha>Trocar a senha</button><button type="button" class="bt" data-conta="sair">${ico('voltar')}Sair</button>` : ''}</div>
      </section>
      <section class="cartao" id="cfg-empresa"><h2>Empresa</h2><p class="mudo" style="margin-bottom:10px">Sai no topo do orçamento, do recibo e do contrato.</p>
        <form data-empresa>${campos([{ k: 'nome', r: 'Nome da empresa', req: true, largo: true }, { k: 'cnpj', r: 'CNPJ ou CPF' }, { k: 'pix', r: 'Chave Pix (vai no Pix copia e cola das cobranças)', ph: 'CNPJ, celular, e-mail ou chave aleatória' }, ...(db.config.ramos.includes('loja') ? [{ k: 'pinDono', r: 'Senha de liberação do dono (o caixa digita para liberar venda a prazo travada)', ph: '4 números' }] : []), { k: 'fone', r: 'WhatsApp', tipo: 'tel' }, { k: 'endereco', r: 'Endereço', largo: true }, { k: 'cidade', r: 'Cidade' }, { k: 'uf', r: 'UF', max: 2 }, { k: 'email', r: 'E-mail', tipo: 'email', largo: true }], c)}</form>
        ${g ? `<button type="button" class="bt cheio" data-salvar-emp>${ico('check')}Salvar a empresa</button>` : '<p class="mudo">Só o dono muda os dados da empresa.</p>'}
      </section>
    </div>
    <section class="cartao" id="cfg-ramos" style="margin-top:16px"><h2>Ramos ligados</h2><p class="mudo" style="margin-bottom:12px">Cada ramo mostra só as telas dele. Ligue um segundo se a empresa fizer mais de uma coisa: aparece um botão para trocar no alto do menu. Clientes, fornecedores, financeiro e equipe são os mesmos.</p>
      <div class="grade g3">${Object.entries(RAMOS).map(([k, r]) => `<label class="cartao marca-op" style="margin:0"><input type="checkbox" data-ramo-liga="${k}" ${c.ramos.includes(k) ? 'checked' : ''} ${g ? '' : 'disabled'}>${ico(r.ico)}<span><b>${t(r.nome)}</b>${c.ramos[0] === k ? '<small class="mudo" style="display:block">principal</small>' : ''}</span></label>`).join('')}</div>
      ${CONTA ? '' : '<p class="mudo peq" style="margin-top:10px">Na demonstração, cada ramo é uma empresa de exemplo; para conhecer outro, use “Ver como” na faixa amarela.</p>'}
    </section>
    <section class="cartao" id="cfg-cores" style="margin-top:16px"><h2>Esquema de cores</h2><p class="mudo" style="margin-bottom:12px">Vale no sistema inteiro: menu, botões, abas e destaques. ${g ? 'Quem você convidar vê igual.' : 'Só o dono troca.'}</p>
      <div class="esquemas">${ESQUEMAS.map((e) => `<button type="button" data-esquema="${e.id}" aria-pressed="${E.id === e.id}" ${g ? '' : 'disabled'}><i style="--e1:${e.menu};--e2:${e.pri}"></i><span><b>${e.nome}</b><small>${e.txt}</small></span></button>`).join('')}</div></section>
    <section class="cartao" id="cfg-marca" style="margin-top:16px"><h2>Sua marca</h2><p class="mudo" style="margin-bottom:12px">O logo e o nome da empresa vão no orçamento, no recibo, no contrato e no link do cliente. Se quiser, também no topo do sistema, no lugar do Tecton.</p>
      <div class="cfg-eu"><div class="logo-prev" style="${M.logo ? `background-image:url('${t(M.logo)}')` : ''}">${M.logo ? '' : t((c.nome || 'E')[0])}</div>
        ${g ? `<div class="linha-bts" style="margin:0"><label class="bt">${ico('foto')}${M.logo ? 'Trocar o logo' : 'Enviar o logo'}<input type="file" accept="image/*" data-logo-arq hidden></label>${M.logo ? '<button type="button" class="bt" data-tira-logo>Remover o logo</button>' : ''}</div>` : ''}</div>
      <label class="liga">Mostrar o meu logo e o nome da empresa no topo do sistema<input type="checkbox" data-marca-topo ${M.topo ? 'checked' : ''} ${g ? '' : 'disabled'}></label></section>
    <section class="cartao" id="cfg-guia" style="margin-top:16px"><h2>Guia: como usar</h2><p class="mudo" style="margin-bottom:12px">Um passo a passo curto de cada tela. Também abre pelo botão <b>?</b> no topo.</p>
      <div class="chips">${menuAtual().map(([k]) => COMO[k] ? `<button type="button" class="chip" data-como="${k}">${t(COMO[k][0])}</button>` : '').join('')}</div></section>
    <div id="cfg-assinatura" style="margin-top:16px"><div id="ass-slot"></div></div>
    ${CONTA ? '' : `<div class="cartao" style="margin-top:16px"><h2>Demonstração</h2><p class="mudo" style="margin-bottom:8px">Tudo o que você fez fica só neste navegador.</p><div class="linha-bts"><button type="button" class="bt" data-recomecar-cfg>${ico('troca')}Recomeçar a demonstração</button></div></div>`}`;
  },
  montar(el, sec) {
    const slot = $('#ass-slot', el);
    if (slot && window.BRAssinatura) { if (blocoAss) slot.replaceWith(blocoAss); else blocoAss = window.BRAssinatura.montar(slot, { app: 'tecton', nome: 'Tecton', mensal: 129, anual: 1238, pagina: 'tecton.html' }); }
    if (window.BRAssinatura && !conta.lido) window.BRAssinatura.conta().then((x) => { conta = { ...x, lido: true }; if (location.hash.startsWith('#config')) ir(location.hash.slice(1)); });
    if (sec && document.getElementById(sec)) setTimeout(() => document.getElementById(sec)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    $('[data-foto]', el)?.addEventListener('change', async (e) => { const a = e.target.files?.[0]; if (!a) return; try { setPerfil({ foto: await reduzir(a, 160, 0.7) }); toast('Foto salva'); } catch { toast('Não deu para ler esta imagem'); } });
    $('[data-tira-foto]', el)?.addEventListener('click', () => setPerfil({ foto: '' }));
    $('[data-salvar-eu]', el)?.addEventListener('click', () => { setPerfil({ nome: $('[data-nome-eu]', el).value.trim() }); toast('Perfil salvo'); });
    $('[data-trocar-senha]', el)?.addEventListener('click', () => conta.trocarSenha?.().then((e) => toast(`Mandamos o link para ${e}`)).catch((x) => toast(x.message || 'Não deu agora')));
    $('[data-salvar-emp]', el)?.addEventListener('click', () => { const f = $('[data-empresa]', el); const d = lerCampos(f, [{ k: 'nome' }, { k: 'cnpj' }, { k: 'pix' }, ...(db.config.ramos.includes('loja') ? [{ k: 'pinDono' }] : []), { k: 'fone' }, { k: 'endereco' }, { k: 'cidade' }, { k: 'uf' }, { k: 'email' }]); if (!d.nome) { toast('Digite o nome da empresa'); return; } d.uf = d.uf.toUpperCase(); Object.assign(db.config, d); grava(); toast('Empresa salva'); });
    $$('[data-ramo-liga]', el).forEach((i) => i.onchange = () => {
      const k = i.dataset.ramoLiga, l = db.config.ramos;
      if (!CONTA) { i.checked = l.includes(k); toast('Na demonstração, troque de ramo pela faixa amarela: “Ver como”'); return; }
      if (i.checked) { if (!l.includes(k)) l.push(k); toast(`${RAMOS[k].curto} ligado: troque pelo botão no alto do menu`); }
      else { if (l.length === 1) { i.checked = true; toast('Fica pelo menos um ramo ligado'); return; } db.config.ramos = l.filter((x) => x !== k); if (db.config.ramo === k) db.config.ramo = db.config.ramos[0]; toast(`${RAMOS[k].curto} desligado (os dados ficam guardados)`); }
      grava(); dispatchEvent(new Event('tecton-ramo')); ir('config/cfg-ramos');
    });
    $$('[data-esquema]', el).forEach((b) => b.onclick = () => { db.config.esquema = b.dataset.esquema; aplicarEsquema(); grava(); toast(`Cores: ${esquema().nome}`); });
    $('[data-logo-arq]', el)?.addEventListener('change', async (e) => { const a = e.target.files?.[0]; if (!a) return; try { db.config.marca = { ...db.config.marca, logo: await reduzir(a, 240, 0.8) }; grava(); dispatchEvent(new Event('tecton-marca')); toast('Logo salvo'); } catch { toast('Não deu para ler esta imagem'); } });
    $('[data-tira-logo]', el)?.addEventListener('click', () => { db.config.marca = { ...db.config.marca, logo: '' }; grava(); dispatchEvent(new Event('tecton-marca')); });
    $('[data-marca-topo]', el)?.addEventListener('change', (e) => { db.config.marca = { ...db.config.marca, topo: e.target.checked }; grava(); dispatchEvent(new Event('tecton-marca')); toast(e.target.checked ? 'Sua marca no topo' : 'Tecton no topo'); });
    $$('[data-como]', el).forEach((b) => b.onclick = () => comoUsar(b.dataset.como));
    $('[data-recomecar-cfg]', el)?.addEventListener('click', async () => { if (await confirma('Recomeçar a demonstração? Tudo volta ao exemplo do início.', 'Recomeçar', true)) { recomecar(); dispatchEvent(new Event('tecton-ramo')); ir('painel'); toast('Demonstração recomeçada'); } });
  },
});
export { numero as cartaoNumero };
