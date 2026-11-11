// Atria · mais funções (11/11/2026): parcelas com vencimento e cobrança, preço justo (hora técnica),
// contrato simples com aceite assinado com o dedo, checklist de ferramentas e EPI, quilometragem da obra
// e medição por foto com objeto de referência. Tudo fica no aparelho (db + grava()). Dinheiro em centavos.
import { $, $$, t, din, dinCurto, lerNum, numBR, uid, hoje, somaDias, dias, dataBR, quando, ico, db, grava, achar, toast, folha, formulario, confirmar, copiar, abrirZap, repinta, ir, cab, vibra } from './base.js';
import { totais, cliente, STATUS } from './gestao.js';
import { meusOficios } from './oficios.js';

export const TELAS = {};
export const ACOES = {};
export const PAI_MAIS = { preco: 'gestao', contrato: 'obras', checklist: 'gestao', deslocamento: 'gestao', medir: 'ferramentas' };

export const BLOCOS_GESTAO = `
  <a class="bloco" href="#preco"><span class="ic">${ico('moeda')}</span><span><b>Preço justo</b><small>Sua diária mínima e a hora técnica</small></span></a>
  <button type="button" class="bloco" data-acao="contrato-escolher"><span class="ic">${ico('doc')}</span><span><b>Contrato</b><small>Simples, com assinatura no dedo</small></span></button>
  <a class="bloco" href="#checklist"><span class="ic">${ico('lista')}</span><span><b>Checklist</b><small>Ferramentas e EPI antes de sair</small></span></a>
  <a class="bloco" href="#deslocamento"><span class="ic">${ico('mapa')}</span><span><b>Deslocamento</b><small>Km rodado e custo por obra</small></span></a>
  <a class="bloco largo" href="#medir"><span class="ic">${ico('camera')}</span><span><b>Medir por foto</b><small>Com uma folha A4, bloco ou porta de referência</small></span>${ico('setaDir', 'width="20" height="20"')}</a>`;

const ordinal = (n) => `${n}ª parcela`;
const primeiro = (nome) => String(nome || '').split(' ')[0];

// ================================================================== 1) parcelas
// Cria o.parcelas a partir de o.orc (entradaPct, parcelas) e do total. Não mexe se já existem.
// refazer = true: mantém as pagas e redivide o que falta entre as não pagas.
export function gerarParcelas(o, refazer = false) {
  if (!o || !o.orc) return [];
  if (Array.isArray(o.parcelas) && o.parcelas.length && !refazer) return o.parcelas;
  const total = totais(o).total, H = hoje(), r = o.orc;
  const pagas = (o.parcelas || []).filter((p) => p.pago);
  const jaPago = pagas.reduce((s, p) => s + p.valor, 0);
  const n = Math.max(1, Math.round(r.parcelas || 1));
  const novas = [];
  if (!refazer) {
    const entrada = Math.round(total * (r.entradaPct || 0) / 100);
    if (entrada > 0) novas.push({ rotulo: 'Entrada', valor: entrada, venc: H });
    const resto = total - entrada, cada = Math.floor(resto / n);
    for (let i = 1; i <= n; i++) novas.push({ rotulo: entrada > 0 && n === 1 ? 'Restante' : ordinal(i), valor: i === n ? resto - cada * (n - 1) : cada, venc: somaDias(H, entrada > 0 ? 30 * i : 30 * (i - 1)) });
  } else {
    const abertas = (o.parcelas || []).filter((p) => !p.pago), resto = Math.max(0, total - jaPago), k = Math.max(1, abertas.length), cada = Math.floor(resto / k);
    (abertas.length ? abertas : [{ rotulo: 'Restante', venc: H }]).forEach((p, i) => novas.push({ rotulo: p.rotulo, valor: i === k - 1 ? resto - cada * (k - 1) : cada, venc: p.venc }));
  }
  let lista = novas.map((p) => ({ id: uid('pc'), n: 0, rotulo: p.rotulo, valor: p.valor, venc: p.venc, pago: false, pagoEm: null }));
  // o que já foi recebido antes das parcelas existirem abate na ordem
  if (!refazer) {
    let rec = o.recebido || 0;
    lista.forEach((p) => { if (rec <= 0) return; if (rec >= p.valor) { p.pago = true; p.pagoEm = H; p.antes = true; rec -= p.valor; } else { p.parcial = rec; rec = 0; } });
  }
  lista = [...pagas, ...lista].map((p, i) => ({ ...p, n: i + 1 }));
  o.parcelas = lista;
  return lista;
}
const faltaParcela = (p) => Math.max(0, p.valor - (p.parcial || 0));
function situacao(p) {
  if (p.pago) return { txt: `Pago${p.pagoEm ? ` em ${dataBR(p.pagoEm)}` : ''}`, cls: 'ok' };
  const d = dias(hoje(), p.venc);
  if (d < 0) return { txt: `Vencida há ${-d} ${-d === 1 ? 'dia' : 'dias'}`, cls: 'vencida' };
  if (d === 0) return { txt: 'Vence hoje', cls: 'perto' };
  if (d === 1) return { txt: 'Vence amanhã', cls: 'perto' };
  return { txt: `Vence ${quando(p.venc)} · ${dataBR(p.venc)}`, cls: '' };
}

export function blocoParcelas(o) {
  if (!o || !o.orc) return '';
  if (!(o.parcelas || []).length) {
    if (o.orc.status !== 'aprovado') return '';
    return `<h2 class="sec">Parcelas</h2><button type="button" class="bt leve largo" data-acao="parcela-gerar" data-o="${o.id}">${ico('calendario')}Montar as parcelas com vencimento</button>`;
  }
  const abertas = o.parcelas.filter((p) => !p.pago), falta = abertas.reduce((s, p) => s + faltaParcela(p), 0);
  return `<h2 class="sec">Parcelas <span class="mudo num" style="font-size:13px">${falta ? `faltam ${dinCurto(falta)}` : 'tudo pago'}</span></h2>
    <div class="mx-parcelas">${o.parcelas.map((p) => {
      const s = situacao(p);
      return `<div class="mx-parcela ${p.pago ? 'paga' : ''} ${s.cls}">
        <div class="mx-parcela-topo"><span class="mx-parcela-n">${p.pago ? ico('ok', 'stroke-width="3"') : p.n}</span><span class="mx-parcela-txt"><b>${t(p.rotulo)}</b><small>${s.txt}${p.parcial && !p.pago ? ` · já pagou ${din(p.parcial)}` : ''}</small></span><b class="num mx-parcela-valor">${din(p.pago ? p.valor : faltaParcela(p))}</b></div>
        ${p.pago ? (p.fin ? `<div class="mx-parcela-bts"><a class="bt leve p" href="#recibo/${p.fin}">${ico('doc')}Recibo</a></div>` : '')
          : `<div class="mx-parcela-bts"><button type="button" class="bt cheio" data-acao="parcela-recebi" data-o="${o.id}" data-p="${p.id}">${ico('moeda')}Recebi</button><button type="button" class="bt zap" data-acao="parcela-cobrar" data-o="${o.id}" data-p="${p.id}">${ico('zap')}Cobrar</button><button type="button" class="bt leve" data-acao="parcela-editar" data-o="${o.id}" data-p="${p.id}" aria-label="Editar ${t(p.rotulo)}">${ico('lapis')}</button></div>`}
      </div>`; }).join('')}</div>`;
}
const acharParcela = (b) => { const o = achar('obras', b.dataset.o), id = b.dataset.p || b.dataset.m, p = o && (o.parcelas || []).find((x) => x.id === id); return { o, p }; };

ACOES['parcela-gerar'] = (b) => { const o = achar('obras', b.dataset.o); if (!o) return; gerarParcelas(o); o.hist.push({ data: hoje(), txt: `Parcelas montadas (${o.parcelas.length})` }); grava(); vibra(10); repinta(); toast('Parcelas montadas. Toque em Editar para mudar valor ou data.'); };
ACOES['parcela-recebi'] = (b) => {
  const { o, p } = acharParcela(b); if (!p || p.pago) return;
  const valor = faltaParcela(p), fid = uid('f'), H = hoje();
  p.pago = true; p.pagoEm = H; p.fin = fid;
  o.recebido = (o.recebido || 0) + valor;
  db.fin.push({ id: fid, data: H, tipo: 'e', valor, desc: `${o.titulo} (parcela)`, cat: 'Serviço', obra: o.id, cli: o.cliente, pago: true });
  const resta = o.parcelas.filter((x) => !x.pago).reduce((s, x) => s + faltaParcela(x), 0);
  o.hist.push({ data: H, txt: `Recebido ${din(valor)} (${p.rotulo})${resta ? ` · falta ${din(resta)}` : ' · quitado'}`, fin: fid });
  grava(); vibra(18); repinta();
  toast(resta ? `${din(valor)} recebido · falta ${din(resta)}` : 'Recebido: tudo pago', 'ok', { rotulo: 'Recibo', fazer: () => ir(`recibo/${fid}`) });
};
export function msgCobranca(o, p) {
  const c = cliente(o.cliente), d = dias(hoje(), p.venc);
  const qd = d < 0 ? `que venceu em ${dataBR(p.venc)}` : d === 0 ? 'que vence hoje' : d === 1 ? 'que vence amanhã' : `com vencimento em ${dataBR(p.venc)}`;
  const pix = db.pix && db.pix.chave && !db.pix.exemplo ? `\n\nChave Pix: ${db.pix.chave} (${db.pix.nome})` : '';
  return `Oi, ${primeiro(c.nome)}! Tudo bem? Aqui é o ${db.perfil.apelido || primeiro(db.perfil.nome)}. Passando para lembrar da ${p.rotulo.toLowerCase()} de ${o.titulo.toLowerCase()}: ${din(faltaParcela(p))}, ${qd}.${pix}\n\nQualquer coisa é só me chamar. Obrigado!`;
}
ACOES['parcela-cobrar'] = (b) => { const { o, p } = acharParcela(b); if (!p) return; const c = cliente(o.cliente); abrirZap(c.tel, msgCobranca(o, p)); p.cobradaEm = hoje(); grava(); };
ACOES['parcela-editar'] = (b) => {
  const { o, p } = acharParcela(b); if (!p) return;
  formulario({ titulo: `Editar ${p.rotulo.toLowerCase()}`, campos: [{ n: 'valor', r: 'Valor', tipo: 'din', valor: p.valor, obrig: true, meio: true }, { n: 'venc', r: 'Vence em', tipo: 'data', valor: p.venc, obrig: true, meio: true }],
    extraPe: `<button type="button" class="bt leve p" data-refazer>${ico('recarregar')}Redividir</button>`,
    salvar: (v) => { if (!v.valor) return 'Escreva o valor.'; p.valor = v.valor; p.venc = v.venc; grava(); repinta(); toast('Parcela atualizada'); },
    depois: (f, api) => { $('[data-refazer]', f).onclick = () => { api.fechar(); gerarParcelas(o, true); grava(); repinta(); toast('O que falta foi redividido entre as parcelas abertas'); }; } });
};

// sugestões para o Início: vencidas ou vencendo em até 2 dias (no máximo 2)
export function sugestoesParcelas() {
  const H = hoje(), l = [];
  (db.obras || []).forEach((o) => (o.parcelas || []).filter((p) => !p.pago && dias(H, p.venc) <= 2).forEach((p) => {
    const d = dias(H, p.venc), nome = primeiro(cliente(o.cliente).nome);
    const quandoTxt = d < 0 ? `venceu há ${-d} ${-d === 1 ? 'dia' : 'dias'}` : d === 0 ? 'vence hoje' : d === 1 ? 'vence amanhã' : 'vence depois de amanhã';
    l.push({ p: d < 0 ? 10 : d === 0 ? 9 : 7, cor: d < 0 ? 'brasa' : 'trena', ic: 'moeda', d, txt: `<b>${t(nome)}</b>: ${t(p.rotulo.toLowerCase())} de ${t(dinCurto(faltaParcela(p)))} ${quandoTxt}.`, bt: ['Cobrar no WhatsApp', null, { acao: 'parcela-cobrar', o: o.id, m: p.id }] });
  }));
  return l.sort((a, b) => b.p - a.p || a.d - b.d).slice(0, 2).map(({ d, ...s }) => s);
}

// ================================================================== 2) preço justo
const CUSTOS = [['celular', 'Celular e internet', 7000], ['combustivel', 'Combustível', 50000], ['ferramentas', 'Ferramentas e desgaste', 20000], ['das', 'DAS do MEI', 8200], ['inss', 'INSS (se não for MEI)', 0], ['outros', 'Outros custos', 0]];
const pj = () => {
  const p = db.precoJusto || {};
  return { renda: p.renda ?? 400000, custos: { ...Object.fromEntries(CUSTOS.map(([k, , v]) => [k, v])), ...(p.custos || {}) }, dias: p.dias ?? 22, horas: p.horas ?? 8, parado: p.parado ?? 15 };
};
export function calcPreco(v = pj()) {
  const custos = Object.values(v.custos).reduce((s, x) => s + (x || 0), 0), base = (v.renda || 0) + custos;
  const diasEf = Math.max(1, (v.dias || 0) * (1 - Math.min(90, v.parado || 0) / 100));
  const diaria = Math.ceil(base / diasEf / 100) * 100, hora = Math.ceil(diaria / Math.max(1, v.horas || 8) / 100) * 100, folga = Math.ceil(diaria * 1.2 / 500) * 500;
  return { custos, base, diasEf, diaria, hora, folga, horaFolga: Math.ceil(folga / Math.max(1, v.horas || 8) / 100) * 100 };
}
const cDin = (n, r, v, dica = '') => `<label class="campo"><span>${r}</span><input data-pj="${n}" inputmode="decimal" value="${v ? (v / 100).toFixed(2).replace('.', ',') : ''}" placeholder="0,00" autocomplete="off">${dica ? `<small>${dica}</small>` : ''}</label>`;
const cNum = (n, r, v, suf) => `<label class="campo"><span>${r}</span><span class="mx-suf"><input data-pj="${n}" data-num inputmode="decimal" value="${numBR(v, 1)}" autocomplete="off"><i>${suf}</i></span></label>`;
function resultadoPreco(v) {
  const c = calcPreco(v), atual = db.perfil.diariaPadrao;
  return `<div class="mx-res"><small>Diária mínima</small><b class="num" data-r="diaria">${din(c.diaria)}</b>
    <div class="mx-res-dois"><div><small>Hora técnica</small><b class="num">${din(c.hora)}</b></div><div><small>Com 20% de folga</small><b class="num">${din(c.folga)}</b><small>${din(c.horaFolga)} a hora</small></div></div>
    <p class="mx-res-conta">${dinCurto(v.renda)} limpo + ${dinCurto(c.custos)} de custos ÷ ${numBR(c.diasEf, 1)} dias de trabalho de verdade</p>
    ${atual ? `<p class="mx-res-atual ${atual < c.diaria ? 'baixo' : ''}">Sua diária hoje: <b>${din(atual)}</b>${atual < c.diaria ? ' · abaixo do mínimo' : ' · está boa'}</p>` : ''}</div>`;
}
TELAS.preco = () => {
  const v = pj();
  return `${cab('Preço justo', 'Quanto cobrar para sobrar', { dica: 'Coloque quanto quer ganhar limpo e os custos do mês. O Atria desconta os dias de chuva e parados e mostra a diária mínima.' })}
    <div data-pj-res>${resultadoPreco(v)}</div>
    <button type="button" class="bt cheio largo mx-grande" data-acao="pj-usar">${ico('ok')}Usar como minha diária</button>
    <h2 class="sec">Quanto quer ganhar</h2>
    <div class="cartao">${cDin('renda', 'Limpo por mês, no bolso', v.renda)}</div>
    <h2 class="sec">Custos fixos do mês</h2>
    <div class="cartao">${CUSTOS.map(([k, r]) => cDin(`c.${k}`, r, v.custos[k], k === 'das' ? 'Valor do boleto do mês (confira no gov.br).' : '')).join('')}</div>
    <h2 class="sec">Seu mês de trabalho</h2>
    <div class="cartao"><div class="duas">${cNum('dias', 'Dias por mês', v.dias, 'dias')}${cNum('horas', 'Horas por dia', v.horas, 'h')}</div>${cNum('parado', 'Dias parados (chuva, sem serviço)', v.parado, '%')}</div>
    <p class="explica"><b>Por que a folga?</b> Imprevisto acontece: material que falta, retrabalho, cliente que atrasa. Os 20% seguram isso sem tirar do seu bolso.</p>`;
};
TELAS.preco.montar = (tela) => {
  tela.addEventListener('input', (e) => {
    const i = e.target.closest('[data-pj]'); if (!i) return;
    const v = pj(), k = i.dataset.pj, val = i.hasAttribute('data-num') ? lerNum(i.value) : Math.round(lerNum(i.value) * 100);
    if (k.startsWith('c.')) v.custos[k.slice(2)] = val; else v[k] = val;
    db.precoJusto = v; grava();
    $('[data-pj-res]', tela).innerHTML = resultadoPreco(v);
  });
};
ACOES['pj-usar'] = () => { const c = calcPreco(); db.perfil.diariaPadrao = c.diaria; db.precoJusto = pj(); grava(); vibra(15); repinta(); toast(`Diária de ${din(c.diaria)} guardada`); };

// ================================================================== 3) contrato com aceite
ACOES['contrato-escolher'] = () => {
  const ordem = { andamento: 0, aprovada: 1, orcamento: 2, concluida: 3 }, l = [...db.obras].sort((a, b) => (ordem[a.status] ?? 9) - (ordem[b.status] ?? 9));
  folha({ titulo: 'Contrato de qual obra?', corpo: l.length ? `<div class="lista">${l.map((o) => `<a class="linha" href="#contrato/${o.id}"><span class="ic">${ico(o.contrato ? 'ok' : 'doc')}</span><span class="txt"><b>${t(o.titulo)}</b><small>${t(cliente(o.cliente).nome)} · ${STATUS[o.status] || ''}${o.contrato ? ' · aceito' : ''}</small></span>${ico('setaDir', 'width="20" height="20"')}</a>`).join('')}</div>` : '<div class="vazio"><b>Nenhuma obra</b>Crie uma obra primeiro.</div>' });
};
const quemCompra = (o) => (o.contratoOpc && o.contratoOpc.material) || (totais(o).mat > 0 ? 'prof' : 'cliente');
function textoPagamento(o) {
  const tt = totais(o);
  if ((o.parcelas || []).length) return o.parcelas.map((p) => `${p.rotulo}: ${din(p.valor)} até ${dataBR(p.venc)}${p.pago ? ' (pago)' : ''}`);
  const ent = tt.entrada;
  return ent ? [`Entrada: ${din(ent)} no início`, `Restante: ${din(tt.total - ent)} na entrega do serviço`] : [`${din(tt.total)} na entrega do serviço`];
}
TELAS.contrato = (id) => {
  const o = achar('obras', id); if (!o) return `${cab('Contrato')}<div class="vazio"><b>Obra não encontrada</b></div>`;
  const c = cliente(o.cliente), eu = db.perfil, tt = totais(o), mat = quemCompra(o), gar = eu.garantiaMeses || 12, k = o.contrato;
  const ofs = meusOficios(eu).map((x) => x.nome.split(' /')[0].toLowerCase()).join(', ') || 'prestador de serviço';
  const pag = textoPagamento(o), etapas = (o.etapas || []).map((e) => e.nome.toLowerCase());
  const ini = o.inicio ? `começa em ${dataBR(o.inicio)}` : 'começa na data combinada entre as partes';
  return `${cab('Contrato', t(o.titulo), { dica: 'Mostre ao cliente na tela, peguem as duas assinaturas com o dedo e mande a cópia no WhatsApp ou em PDF.' })}
    <div class="acoes so-tela" style="margin-top:0"><button type="button" class="bt p" data-acao="imprimir">${ico('doc')}PDF / imprimir</button><button type="button" class="bt zap p" data-acao="contrato-zap" data-o="${o.id}">${ico('zap')}Mandar no WhatsApp</button></div>
    ${k ? '' : `<div class="so-tela mx-opc"><small>Quem compra o material?</small><div class="chips" role="group" aria-label="Quem compra o material"><button type="button" class="chip" data-acao="contrato-mat" data-o="${o.id}" data-v="prof" aria-pressed="${mat === 'prof'}">Eu compro</button><button type="button" class="chip" data-acao="contrato-mat" data-o="${o.id}" data-v="cliente" aria-pressed="${mat === 'cliente'}">O cliente compra</button></div></div>`}
    <article class="doc mx-contrato" id="doc">
      <div class="doc-cab"><img src="simbolo.svg" alt="" width="50" height="50"><div><b>Contrato de serviço</b><small class="mudo">${t(o.titulo)}</small></div></div>
      <h3>1. Quem são as partes</h3>
      <p><b>Contratante (cliente):</b> ${t(c.nome)}${c.end ? `, endereço ${t(c.end)}` : ''}${c.tel ? `, WhatsApp ${t(c.tel)}` : ''}.</p>
      <p><b>Contratado (profissional):</b> ${t(eu.nome)}, ${t(ofs)}, de ${t(eu.cidade)}-${t(eu.uf)}${eu.zap ? `, WhatsApp ${t(eu.zap)}` : ''}${eu.doc ? `, CPF/CNPJ ${t(eu.doc)}` : ', CPF/CNPJ ____________________'}.</p>
      <h3>2. O serviço</h3>
      <p>${t(o.titulo)}${c.end ? `, no endereço ${t(c.end)}` : ''}.${etapas.length ? ` Inclui: ${t(etapas.join('; '))}.` : ''} O que não estiver escrito aqui ou no orçamento é serviço extra.</p>
      <h3>3. Valor e pagamento</h3>
      <p>Valor total: <b>${din(tt.total)}</b>${tt.mo ? ` (mão de obra ${din(tt.mo)}${tt.matCobrado && mat === 'prof' ? `, materiais ${din(tt.matCobrado)}` : ''}${tt.desloc ? `, deslocamento ${din(tt.desloc)}` : ''})` : ''}.</p>
      <ul class="mx-lista-doc">${pag.map((x) => `<li>${t(x)}</li>`).join('')}</ul>
      <p>Pagamento por Pix, transferência ou dinheiro. Cada pagamento recebe recibo.</p>
      <h3>4. Prazo</h3>
      <p>O serviço ${ini} e leva cerca de ${o.orc.prazo || 15} dias de trabalho${o.prazo ? `, com entrega prevista até ${dataBR(o.prazo)}` : ''}. Chuva, falta de material ou mudança pedida pelo cliente podem mudar o prazo, sempre com aviso antes.</p>
      <h3>5. Material</h3>
      <p>${mat === 'prof' ? `O profissional compra o material da lista do orçamento${tt.matCobrado ? ` (${din(tt.matCobrado)}, já somado no valor total)` : ''}. Material a mais, pedido pelo cliente, é cobrado à parte.` : 'O cliente compra o material, conforme a lista passada pelo profissional, e entrega no local antes de cada etapa. Atraso na entrega do material muda o prazo.'}</p>
      <h3>6. Garantia</h3>
      <p>O profissional dá <b>${gar} meses de garantia</b> do serviço, contados da entrega, para defeito de execução. Não cobre mau uso, problema de outra origem (vazamento, rachadura da estrutura) nem defeito de material comprado pelo cliente.</p>
      <h3>7. Combinados</h3>
      <p><b>O profissional:</b> faz o serviço com capricho e segurança, usa equipamento de proteção, deixa o local organizado e avisa na hora qualquer problema.</p>
      <p><b>O cliente:</b> libera o acesso nos dias combinados, com água e luz, paga em dia e avisa antes qualquer mudança no serviço. Serviço extra é combinado por escrito (vale mensagem no WhatsApp), com preço novo.</p>
      <h3>8. Cancelamento</h3>
      <p>Qualquer um pode cancelar avisando com 5 dias de antecedência. O cliente paga o serviço já feito e o material já comprado; o que foi pago a mais é devolvido em até 10 dias.</p>
      <h3>9. Foro</h3>
      <p>Para qualquer discussão sobre este contrato, vale a comarca de ${t(eu.cidade)}-${t(eu.uf)}.</p>
      <p class="mx-local">${t(eu.cidade)}, ${dataBR(k ? k.aceitoEm : hoje())}.</p>
      <div class="mx-assinaturas">
        <div>${k && k.assinaturaProf ? `<img src="${k.assinaturaProf}" alt="Assinatura do profissional">` : '<i></i>'}<span>${t(eu.nome)}<small>Contratado</small></span></div>
        <div>${k && k.assinaturaCliente ? `<img src="${k.assinaturaCliente}" alt="Assinatura do cliente">` : '<i></i>'}<span>${t(k ? k.nome : c.nome)}<small>Contratante</small></span></div>
      </div>
      ${k ? `<p class="mx-aceite-ok">${ico('ok')} Aceito pelo cliente em ${dataBR(k.aceitoEm)} às ${String(k.aceitoEm).slice(11, 16)}, assinado na tela do celular.</p>` : ''}
    </article>
    <p class="mx-aviso so-tela">Modelo simples; para obras grandes, peça revisão a um advogado.</p>
    ${k ? `<button type="button" class="bt leve largo so-tela" style="margin-top:12px" data-acao="contrato-desfazer" data-o="${o.id}">${ico('recarregar')}Desfazer o aceite</button>` : `
    <section class="so-tela mx-aceite" data-aceite>
      <h2 class="sec">Aceite</h2>
      <label class="campo"><span>Nome do cliente</span><input data-k-nome value="${t(c.nome)}" autocomplete="off"></label>
      <div class="mx-pad"><div class="mx-pad-cab"><b>Assinatura do profissional</b><button type="button" class="bt leve p" data-limpar="prof">Limpar</button></div><canvas data-pad="prof" aria-label="Assine com o dedo"></canvas><small>Assine com o dedo</small></div>
      <div class="mx-pad"><div class="mx-pad-cab"><b>Assinatura do cliente</b><button type="button" class="bt leve p" data-limpar="cli">Limpar</button></div><canvas data-pad="cli" aria-label="Cliente assina com o dedo"></canvas><small>O cliente assina com o dedo</small></div>
      <button type="button" class="bt cheio largo mx-grande" data-acao="contrato-aceitar" data-o="${o.id}">${ico('ok')}Cliente aceitou</button>
    </section>`}`;
};
function ligarAssinatura(cv) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), r = cv.getBoundingClientRect(), w = r.width || 320, h = r.height || 150;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1F2833'; ctx.lineWidth = 2.6;
  let ult = null;
  const pos = (e) => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * (w / b.width), (e.clientY - b.top) * (h / b.height)]; };
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); ult = pos(e); ctx.beginPath(); ctx.arc(ult[0], ult[1], 1.3, 0, 7); ctx.fillStyle = '#1F2833'; ctx.fill(); cv.dataset.sujo = '1'; });
  cv.addEventListener('pointermove', (e) => { if (!ult) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(ult[0], ult[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); ult = p; });
  const fim = () => { ult = null; }; cv.addEventListener('pointerup', fim); cv.addEventListener('pointercancel', fim);
  cv.limpar = () => { ctx.clearRect(0, 0, w, h); delete cv.dataset.sujo; };
}
TELAS.contrato.montar = (tela) => {
  $$('canvas[data-pad]', tela).forEach(ligarAssinatura);
  $$('[data-limpar]', tela).forEach((b) => { b.onclick = () => { const cv = $(`canvas[data-pad="${b.dataset.limpar}"]`, tela); if (cv && cv.limpar) cv.limpar(); }; });
};
ACOES['contrato-mat'] = (b) => { const o = achar('obras', b.dataset.o); if (!o) return; o.contratoOpc = { ...(o.contratoOpc || {}), material: b.dataset.v }; grava(); vibra(6); repinta(); };
ACOES['contrato-aceitar'] = (b) => {
  const o = achar('obras', b.dataset.o), sec = $('[data-aceite]'); if (!o || !sec) return;
  const nome = $('[data-k-nome]', sec).value.trim(), prof = $('canvas[data-pad="prof"]', sec), cli = $('canvas[data-pad="cli"]', sec);
  if (!nome) { toast('Escreva o nome do cliente', 'erro'); return; }
  if (!prof.dataset.sujo) { toast('Falta a sua assinatura', 'erro'); return; }
  if (!cli.dataset.sujo) { toast('Falta a assinatura do cliente', 'erro'); return; }
  const agora = new Date(), iso = `${hoje()}T${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
  o.contrato = { aceitoEm: iso, nome, assinaturaCliente: cli.toDataURL('image/png'), assinaturaProf: prof.toDataURL('image/png') };
  o.hist.push({ data: hoje(), txt: `Contrato aceito e assinado por ${nome}` });
  grava(); vibra(25); repinta(); scrollTo(0, 0); toast('Contrato aceito e guardado', 'ok', { rotulo: 'Mandar', fazer: () => ACOES['contrato-zap']({ dataset: { o: o.id } }) });
};
ACOES['contrato-desfazer'] = (b) => confirmar('Desfazer o aceite?', 'As assinaturas deste contrato serão apagadas do aparelho.', 'Desfazer', () => { const o = achar('obras', b.dataset.o); if (!o) return; delete o.contrato; o.hist.push({ data: hoje(), txt: 'Aceite do contrato desfeito' }); grava(); repinta(); });
ACOES['contrato-zap'] = (b) => {
  const o = achar('obras', b.dataset.o); if (!o) return;
  const c = cliente(o.cliente), tt = totais(o), eu = db.perfil, k = o.contrato;
  const txt = `*Contrato de serviço* · ${eu.nome}\nServiço: ${o.titulo}${c.end ? `\nLocal: ${c.end}` : ''}\nCliente: ${k ? k.nome : c.nome}\nValor total: ${din(tt.total)}\n${textoPagamento(o).map((x) => `• ${x}`).join('\n')}\nPrazo: cerca de ${o.orc.prazo || 15} dias${o.prazo ? ` (entrega até ${dataBR(o.prazo)})` : ''}\nMaterial: ${quemCompra(o) === 'prof' ? 'comprado pelo profissional' : 'comprado pelo cliente'}\nGarantia: ${eu.garantiaMeses || 12} meses\n${k ? `Aceito e assinado em ${dataBR(k.aceitoEm)}.` : 'Me confirma por aqui se está tudo certo?'}`;
  abrirZap(c.tel, txt);
};

// ================================================================== 4) checklist de ferramentas e EPI
const FERR = {
  geral: ['Trena', 'Nível', 'Esquadro', 'Lápis de carpinteiro', 'Extensão elétrica', 'Furadeira / parafusadeira', 'Brocas e bits', 'Martelo', 'Alicate universal', 'Chaves de fenda e Phillips', 'Estilete', 'Lanterna', 'Carregador do celular'],
  pedreiro: ['Colher de pedreiro', 'Desempenadeira', 'Prumo', 'Linha de nylon', 'Mangueira de nível', 'Régua de alumínio', 'Balde e masseira', 'Carrinho de mão', 'Enxada e pá', 'Marreta e talhadeira'],
  azulejista: ['Cortador de piso', 'Esmerilhadeira com disco diamantado', 'Desempenadeira dentada', 'Martelo de borracha', 'Cunhas e espaçadores', 'Esponja e rodo de rejunte', 'Serra copo', 'Nível laser'],
  carpinteiro: ['Serra circular', 'Serrote', 'Formão', 'Grampo sargento', 'Pé de cabra', 'Prumo', 'Pregos e parafusos'],
  marceneiro: ['Serra tico-tico', 'Serra circular com guia', 'Broca caneco 35 mm', 'Coladeira de borda', 'Tupia', 'Lixadeira', 'Grampos', 'Gabarito de furação'],
  eletricista: ['Multímetro', 'Alicate amperímetro', 'Alicate desencapador', 'Alicate de corte', 'Chaves isoladas', 'Detector de tensão', 'Passa-fio', 'Fita isolante'],
  encanador: ['Chave grifo', 'Arco de serra', 'Lixa', 'Cola PVC', 'Fita veda-rosca', 'Sonda / desentupidor', 'Chave inglesa', 'Manômetro para teste'],
  pintor: ['Rolo e bandeja', 'Trinchas e pincéis', 'Fita crepe', 'Lona plástica', 'Espátula', 'Desempenadeira de aço', 'Lixa e lixadeira', 'Extensor do rolo', 'Escada'],
  gesseiro: ['Estilete e serrote de gesso', 'Espátulas', 'Tesoura de perfil', 'Parafusadeira', 'Nível laser', 'Linha de bater (giz)', 'Escada ou andaime'],
};
const OF_CHECK = { mestre: 'pedreiro', servente: 'pedreiro', armador: 'pedreiro', impermeabilizador: 'pedreiro', fazutudo: 'eletricista', montador: 'marceneiro', telhadista: 'carpinteiro' };
const EPI = ['Capacete', 'Luvas', 'Óculos de proteção', 'Botina', 'Protetor auricular', 'Máscara PFF2', 'Cinto para altura'];
const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
function checkDados() {
  const ck = db.checklist = db.checklist || { dia: hoje(), marcas: {}, extras: [] };
  if (ck.dia !== hoje()) { ck.dia = hoje(); ck.marcas = {}; }
  ck.marcas = ck.marcas || {}; ck.extras = ck.extras || [];
  const ofs = meusOficios(db.perfil).map((o) => OF_CHECK[o.id] || o.id).filter((k) => FERR[k]);
  const ferr = [...new Set([...ofs.flatMap((k) => FERR[k]), ...FERR.geral])].map((n) => ({ k: `f:${slug(n)}`, n }));
  ck.extras.filter((x) => x.g === 'f').forEach((x) => ferr.push({ k: `x:${x.id}`, n: x.nome, extra: x.id }));
  const epi = EPI.map((n) => ({ k: `e:${slug(n)}`, n }));
  ck.extras.filter((x) => x.g === 'e').forEach((x) => epi.push({ k: `x:${x.id}`, n: x.nome, extra: x.id }));
  return { ck, ferr, epi };
}
const contaCheck = (l, ck) => l.filter((i) => ck.marcas[i.k]).length;
const linhaCheck = (i, ck) => `<div class="mx-check ${ck.marcas[i.k] ? 'feito' : ''}" role="checkbox" aria-checked="${!!ck.marcas[i.k]}" tabindex="0" data-acao="check" data-k="${t(i.k)}"><span class="caixa">${ico('ok', 'stroke-width="3"')}</span><span class="mx-check-n">${t(i.n)}</span>${i.extra ? `<button type="button" class="mx-check-x" data-acao="check-tirar" data-id="${t(i.extra)}" aria-label="Tirar ${t(i.n)} da lista">${ico('x')}</button>` : ''}</div>`;
TELAS.checklist = () => {
  const { ck, ferr, epi } = checkDados(), tot = ferr.length + epi.length, ok = contaCheck(ferr, ck) + contaCheck(epi, ck);
  return `${cab('Checklist', 'Antes de sair para a obra', { dica: 'Toque em cada item que já está no carro. Todo dia a lista começa zerada.' })}
    <div class="mx-check-topo"><b class="num" data-ck-tot>${ok} de ${tot} prontos</b><div class="progresso"><i data-ck-barra style="width:${Math.round(ok / Math.max(1, tot) * 100)}%"></i></div></div>
    <h2 class="sec">EPI <span class="mudo num" style="font-size:13px" data-ck-g="epi">${contaCheck(epi, ck)} de ${epi.length}</span></h2>
    <div class="cartao mx-check-lista">${epi.map((i) => linhaCheck(i, ck)).join('')}</div>
    <h2 class="sec">Ferramentas <span class="mudo num" style="font-size:13px" data-ck-g="ferr">${contaCheck(ferr, ck)} de ${ferr.length}</span></h2>
    <div class="cartao mx-check-lista">${ferr.map((i) => linhaCheck(i, ck)).join('')}</div>
    <div class="acoes"><button type="button" class="bt cheio" data-acao="check-novo">${ico('mais')}Adicionar item</button><button type="button" class="bt leve" data-acao="check-zerar">${ico('recarregar')}Antes de sair: zerar</button></div>`;
};
function atualizaCheck() {
  const { ck, ferr, epi } = checkDados(), tot = ferr.length + epi.length, ok = contaCheck(ferr, ck) + contaCheck(epi, ck);
  const a = $('[data-ck-tot]'); if (a) a.textContent = `${ok} de ${tot} prontos`;
  const b = $('[data-ck-barra]'); if (b) b.style.width = `${Math.round(ok / Math.max(1, tot) * 100)}%`;
  const ge = $('[data-ck-g="epi"]'); if (ge) ge.textContent = `${contaCheck(epi, ck)} de ${epi.length}`;
  const gf = $('[data-ck-g="ferr"]'); if (gf) gf.textContent = `${contaCheck(ferr, ck)} de ${ferr.length}`;
  if (ok === tot && tot) toast('Tudo pronto. Boa obra!');
}
ACOES.check = (el, e) => {
  if (e && e.target.closest('.mx-check-x')) return;
  const { ck } = checkDados(), k = el.dataset.k;
  if (ck.marcas[k]) delete ck.marcas[k]; else ck.marcas[k] = 1;
  grava(); vibra(8); el.classList.toggle('feito', !!ck.marcas[k]); el.setAttribute('aria-checked', !!ck.marcas[k]); atualizaCheck();
};
ACOES['check-zerar'] = () => { const { ck } = checkDados(); ck.marcas = {}; ck.dia = hoje(); grava(); vibra(12); repinta(); toast('Lista zerada. Vá marcando o que põe no carro.'); };
ACOES['check-novo'] = () => formulario({ titulo: 'Novo item', rotulo: 'Adicionar', campos: [{ n: 'nome', r: 'O que levar', obrig: true, voz: true, lista: ['Gerador', 'Betoneira', 'Andaime', 'Escada', 'Lona', 'Garrafa de água', 'Marmita'] }, { n: 'g', r: 'Em qual lista', tipo: 'sel', valor: 'f', ops: [['f', 'Ferramentas'], ['e', 'EPI']] }],
  salvar: (v) => { checkDados().ck.extras.push({ id: uid('ck'), nome: v.nome, g: v.g }); grava(); repinta(); } });
ACOES['check-tirar'] = (b) => { const { ck } = checkDados(), i = ck.extras.findIndex((x) => x.id === b.dataset.id); if (i < 0) return; const [x] = ck.extras.splice(i, 1); delete ck.marcas[`x:${x.id}`]; grava(); repinta(); toast('Item tirado', 'ok', { rotulo: 'Desfazer', fazer: () => { ck.extras.splice(i, 0, x); grava(); repinta(); } }); };

// ================================================================== 5) quilometragem / deslocamento
const custoKm = () => db.perfil.custoKm || 120;
export function blocoDeslocamento(o) {
  if (!o) return '';
  const l = o.km || [], km = l.reduce((s, x) => s + x.km, 0), custo = l.reduce((s, x) => s + x.custo, 0);
  return `<h2 class="sec">Deslocamento ${l.length ? `<a href="#deslocamento">Ver tudo</a>` : ''}</h2>
    <div class="cartao mx-km"><div class="mx-km-nums"><div><small>Rodado</small><b class="num">${numBR(km, 1)} km</b></div><div><small>Custo</small><b class="num">${din(custo)}</b></div><div><small>Idas</small><b class="num">${l.length}</b></div></div>
      ${o.orc && o.orc.desloc ? `<small class="mudo">No orçamento você cobrou ${din(o.orc.desloc)} de deslocamento${custo > o.orc.desloc ? ' · já gastou mais do que cobrou' : ''}.</small>` : ''}
      <button type="button" class="bt cheio largo mx-grande" data-acao="km-novo" data-o="${o.id}">${ico('mapa')}Lancei uma ida</button></div>`;
}
ACOES['km-novo'] = (b) => {
  const ativas = db.obras.filter((o) => o.status !== 'concluida' || o.id === b.dataset.o);
  if (!ativas.length) { toast('Crie uma obra primeiro', 'erro'); return; }
  formulario({ titulo: 'Lancei uma ida', rotulo: 'Lançar',
    campos: [{ n: 'km', r: 'Km ida e volta', tipo: 'num', obrig: true, meio: true, lista: ['10', '20', '30', '40', '60'] }, { n: 'data', r: 'Dia', tipo: 'data', valor: hoje(), meio: true },
      { n: 'obra', r: 'Obra', tipo: 'sel', valor: b.dataset.o || ativas[0].id, ops: ativas.map((o) => [o.id, `${o.titulo} · ${primeiro(cliente(o.cliente).nome)}`]) },
      { n: 'custo', r: 'Custo por km', tipo: 'din', valor: custoKm(), dica: 'Combustível + desgaste do carro. Fica guardado para as próximas.' }],
    salvar: (v) => {
      if (!v.km || v.km <= 0) return 'Escreva quantos km.';
      const o = achar('obras', v.obra); if (!o) return 'Escolha a obra.';
      if (v.custo) db.perfil.custoKm = v.custo;
      const custo = Math.round(v.km * custoKm()), fid = uid('f');
      (o.km = o.km || []).push({ id: uid('km'), data: v.data, km: v.km, custo, fin: fid });
      db.fin.push({ id: fid, data: v.data, tipo: 's', valor: custo, desc: `Deslocamento ${numBR(v.km, 1)} km`, cat: 'Transporte', obra: o.id, pago: true });
      o.hist.push({ data: v.data, txt: `Deslocamento: ${numBR(v.km, 1)} km (${din(custo)})` });
      grava(); repinta(); toast(`${numBR(v.km, 1)} km lançados · ${din(custo)} de saída`);
    } });
};
ACOES['km-apagar'] = (b) => {
  const o = achar('obras', b.dataset.o), i = o ? (o.km || []).findIndex((x) => x.id === b.dataset.id) : -1; if (i < 0) return;
  const [x] = o.km.splice(i, 1), fi = db.fin.findIndex((f) => f.id === x.fin), [f] = fi >= 0 ? db.fin.splice(fi, 1) : [null];
  grava(); repinta();
  toast('Ida apagada', 'ok', { rotulo: 'Desfazer', fazer: () => { o.km.splice(i, 0, x); if (f) db.fin.push(f); grava(); repinta(); } });
};
let mesKm = 0; // 0 = este mês, 1 = mês passado
ACOES['km-mes'] = (b) => { mesKm = +b.dataset.m || 0; repinta(); };
TELAS.deslocamento = () => {
  const d = new Date(), ref = new Date(d.getFullYear(), d.getMonth() - mesKm, 1), pref = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
  const grupos = db.obras.map((o) => ({ o, l: (o.km || []).filter((x) => x.data.startsWith(pref)).sort((a, b) => b.data.localeCompare(a.data)) })).filter((g) => g.l.length);
  const km = grupos.reduce((s, g) => s + g.l.reduce((a, x) => a + x.km, 0), 0), custo = grupos.reduce((s, g) => s + g.l.reduce((a, x) => a + x.custo, 0), 0);
  const nomeMes = ref.toLocaleDateString('pt-BR', { month: 'long' });
  return `${cab('Deslocamento', 'Km rodado e quanto custou', { dica: 'Cada ida lançada vira uma saída de Transporte no seu dinheiro, ligada à obra.' })}
    <div class="chips" role="group" aria-label="Mês"><button type="button" class="chip" data-acao="km-mes" data-m="0" aria-pressed="${mesKm === 0}">Este mês</button><button type="button" class="chip" data-acao="km-mes" data-m="1" aria-pressed="${mesKm === 1}">Mês passado</button></div>
    <div class="cartao mx-km"><div class="mx-km-nums"><div><small>Rodado em ${t(nomeMes)}</small><b class="num">${numBR(km, 1)} km</b></div><div><small>Custo</small><b class="num">${din(custo)}</b></div></div>
      <button type="button" class="bt leve p" data-acao="km-custo">${ico('lapis')}Custo por km: ${din(custoKm())}</button></div>
    ${grupos.length ? grupos.map((g) => `<h2 class="sec"><a href="#obra/${g.o.id}" style="color:inherit;text-decoration:none">${t(g.o.titulo)}</a> <span class="mudo num" style="font-size:13px">${numBR(g.l.reduce((a, x) => a + x.km, 0), 1)} km</span></h2>
      <div class="lista">${g.l.map((x) => `<div class="linha" style="cursor:default"><span class="ic">${ico('mapa')}</span><span class="txt"><b>${numBR(x.km, 1)} km · ${din(x.custo)}</b><small>${quando(x.data)} · ${dataBR(x.data)} · ${t(primeiro(cliente(g.o.cliente).nome))}</small></span><button type="button" class="bt leve p" data-acao="km-apagar" data-o="${g.o.id}" data-id="${x.id}" aria-label="Apagar esta ida">${ico('lixo')}</button></div>`).join('')}</div>`).join('')
      : `<div class="vazio" style="margin-top:14px"><b>Nenhuma ida em ${t(nomeMes)}</b>Lance cada ida e volta para saber quanto cada obra custa de carro.</div>`}
    <button type="button" class="bt cheio largo mx-grande" style="margin-top:16px" data-acao="km-novo">${ico('mais')}Lancei uma ida</button>`;
};
ACOES['km-custo'] = () => formulario({ titulo: 'Custo por km', campos: [{ n: 'c', r: 'Quanto custa cada km', tipo: 'din', valor: custoKm(), dica: 'Ex.: carro que faz 10 km/l com gasolina a R$ 6,20 gasta R$ 0,62 por km; somando desgaste e manutenção, uns R$ 1,20.' }],
  salvar: (v) => { if (!v.c) return 'Escreva o valor.'; db.perfil.custoKm = v.c; grava(); repinta(); } });

// ================================================================== 6) medir por foto
const REFS = [['A4', 'Folha A4', 29.7], ['tijolo', 'Tijolo baiano', 19], ['bloco', 'Bloco', 39], ['porta', 'Porta', 210], ['trena', 'Trena aberta 1 m', 100]];
const md = { img: null, ref: [], refCm: 0, refNome: '', modo: 'linha', pend: [], medidas: [], exemplo: false };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const escala = () => (md.ref.length === 2 && md.refCm ? md.refCm / Math.max(1, dist(md.ref[0], md.ref[1])) : 0);
const fmtCm = (cm) => (cm < 100 ? `${numBR(cm, cm < 10 ? 1 : (cm % 1 ? 1 : 0))} cm` : `${numBR(cm / 100, 2)} m`);
function valorMedida(m) {
  const k = escala();
  if (m.tipo === 'area') { const l = dist(m.p[0], m.p[1]) * k, a = dist(m.p[2], m.p[3]) * k; return { l, a, m2: l * a / 1e4, txt: `${fmtCm(l)} × ${fmtCm(a)} = ${numBR(l * a / 1e4, 2)} m²` }; }
  const cm = dist(m.p[0], m.p[1]) * k; return { cm, txt: fmtCm(cm) };
}
const passoMedir = () => (!md.img ? 'foto' : !md.refCm || md.ref.length < 2 ? 'ref' : 'medir');
TELAS.medir = () => {
  const passo = passoMedir();
  const topo = `${cab('Medir por foto', 'Com um objeto de medida conhecida', { dica: 'Fotografe de frente. Primeiro toque nas duas pontas do objeto de referência, depois nos pontos que quer medir. Arraste uma bolinha para ajustar.' })}
    <p class="mx-aviso">${ico('alerta')} Medida aproximada: fotografe de frente, com a referência no mesmo plano. Confira com a trena antes de comprar.</p>`;
  if (passo === 'foto') return `${topo}
    <label class="mx-foto"><input type="file" accept="image/*" capture="environment" data-md-foto>${ico('camera', 'width="40" height="40"')}<b>Tirar ou escolher foto</b><small>Com uma folha A4, um bloco ou a porta aparecendo inteira</small></label>
    <button type="button" class="bt leve largo" style="margin-top:12px" data-acao="md-exemplo">${ico('olho')}Testar com uma foto de exemplo</button>`;
  const lista = md.medidas.map((m, i) => `<div class="mx-med"><span class="mx-med-n">${i + 1}</span><span>${m.tipo === 'area' ? 'Área' : 'Medida'}</span><b class="num">${valorMedida(m).txt}</b></div>`).join('');
  const instr = passo === 'ref'
    ? (!md.refCm ? '<b>1.</b> O que aparece na foto com medida conhecida?' : `<b>1.</b> Toque nas duas pontas ${md.refNome ? `da ${t(md.refNome.toLowerCase())}` : 'da referência'} (${fmtCm(md.refCm)}). ${md.ref.length}/2`)
    : md.modo === 'area' ? `<b>2.</b> Área: toque ${md.pend.length < 2 ? 'nas duas pontas da largura' : 'nas duas pontas da altura'} (${md.pend.length}/4)` : `<b>2.</b> Toque em dois pontos para medir (${md.pend.length}/2)`;
  return `${topo}
    ${passo === 'ref' ? `<div class="chips" role="group" aria-label="Objeto de referência">${REFS.map(([k, n, cm]) => `<button type="button" class="chip" data-acao="md-ref" data-k="${k}" aria-pressed="${md.refNome === n}">${t(n)} <b>${fmtCm(cm)}</b></button>`).join('')}<button type="button" class="chip" data-acao="md-ref" data-k="outro" aria-pressed="${!!md.refCm && !REFS.some(([, n]) => n === md.refNome)}">Outro: digitar</button></div>` : ''}
    <p class="mx-instr" data-md-instr>${instr}</p>
    ${passo === 'medir' ? `<div class="seg" role="group" aria-label="O que medir" data-seg><button type="button" data-acao="md-modo" data-m="linha" aria-pressed="${md.modo === 'linha'}">Distância</button><button type="button" data-acao="md-modo" data-m="area" aria-pressed="${md.modo === 'area'}">Área (m²)</button><i></i></div>` : ''}
    <div class="mx-tela-foto"><canvas data-md-canvas aria-label="Foto para medir: toque nos pontos"></canvas></div>
    <div class="acoes"><button type="button" class="bt leve p" data-acao="md-desfazer" ${md.ref.length || md.pend.length || md.medidas.length ? '' : 'disabled'}>${ico('seta')}Desfazer</button>${passo === 'medir' ? `<button type="button" class="bt leve p" data-acao="md-refazer-ref">${ico('regua')}Refazer referência</button>` : ''}<button type="button" class="bt leve p" data-acao="md-nova">${ico('camera')}Outra foto</button></div>
    ${md.medidas.length ? `<h2 class="sec">Medidas</h2><div class="cartao">${lista}</div>
      <div class="acoes"><button type="button" class="bt cheio" data-acao="md-orcar">${ico('doc')}Mandar para o Orçar</button><button type="button" class="bt" data-acao="md-obra">${ico('capacete')}Pôr numa obra</button><button type="button" class="bt leve" data-acao="md-copiar">${ico('copiar')}Copiar</button></div>` : ''}`;
};
function desenhaMedir(cv) {
  if (!md.img || !cv) return;
  const ctx = cv.getContext('2d'), W = cv.width, k = W / Math.max(1, cv.clientWidth || W);
  ctx.clearRect(0, 0, W, cv.height); ctx.drawImage(md.img, 0, 0, W, cv.height);
  const ponto = (p, cor) => { ctx.beginPath(); ctx.arc(p.x, p.y, 11 * k, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); ctx.lineWidth = 3 * k; ctx.strokeStyle = cor; ctx.stroke(); ctx.beginPath(); ctx.arc(p.x, p.y, 2.5 * k, 0, 7); ctx.fillStyle = cor; ctx.fill(); };
  const rotulos = [];
  const linha = (a, b, cor, rot) => {
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineWidth = 6 * k; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.stroke(); ctx.lineWidth = 3 * k; ctx.strokeStyle = cor; ctx.stroke();
    if (rot) rotulos.push({ a, b, cor, rot });
  };
  // rótulos por último, ao lado da linha (não em cima das bolinhas) e sem um cobrir o outro
  const poeRotulos = () => {
    const fs = Math.round(15 * k), caixas = [];
    ctx.font = `700 ${fs}px "Azeret Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    rotulos.forEach(({ a, b, cor, rot }) => {
      const w = ctx.measureText(rot).width + 14 * k, h = fs * 1.6, len = Math.max(1, dist(a, b)), nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
      const off = (Math.abs(nx) * w + Math.abs(ny) * h) / 2 + 16 * k;
      let mx = (a.x + b.x) / 2 + nx * off, my = (a.y + b.y) / 2 + ny * off;
      mx = Math.min(W - w / 2 - 4, Math.max(w / 2 + 4, mx)); my = Math.min(cv.height - h / 2 - 4, Math.max(h / 2 + 4, my));
      for (let n = 0; n < 8 && caixas.some((c) => Math.abs(c.x - mx) < (c.w + w) / 2 && Math.abs(c.y - my) < (c.h + h) / 2); n++) my = Math.min(cv.height - h / 2 - 4, my + h + 4 * k);
      caixas.push({ x: mx, y: my, w, h });
      ctx.fillStyle = cor; ctx.fillRect(mx - w / 2, my - h / 2, w, h); ctx.fillStyle = '#fff'; ctx.fillText(rot, mx, my + 1 * k);
    });
  };
  const REF = '#C2A37A', MED = '#2E333B', PEND = '#5E7486';
  if (md.ref.length === 2) linha(md.ref[0], md.ref[1], REF, md.refCm ? `ref ${fmtCm(md.refCm)}` : '');
  md.ref.forEach((p) => ponto(p, REF));
  md.medidas.forEach((m, i) => {
    const v = valorMedida(m);
    if (m.tipo === 'area') { linha(m.p[0], m.p[1], MED, `${i + 1}: ${fmtCm(v.l)}`); linha(m.p[2], m.p[3], MED, `${fmtCm(v.a)} · ${numBR(v.m2, 2)} m²`); } else linha(m.p[0], m.p[1], MED, `${i + 1}: ${v.txt}`);
    m.p.forEach((p) => ponto(p, MED));
  });
  for (let i = 0; i + 1 < md.pend.length; i += 2) linha(md.pend[i], md.pend[i + 1], PEND, escala() ? fmtCm(dist(md.pend[i], md.pend[i + 1]) * escala()) : '');
  md.pend.forEach((p) => ponto(p, PEND));
  poeRotulos();
}
function soltarPonto(p) {
  const passo = passoMedir();
  if (passo === 'ref' || md.ref.length < 2) { if (md.ref.length < 2) md.ref.push(p); if (md.ref.length === 2 && !md.refCm) setTimeout(() => toast('Agora escolha o que é a referência'), 50); return; }
  md.pend.push(p);
  if (md.modo === 'linha' && md.pend.length === 2) { md.medidas.push({ tipo: 'linha', p: md.pend }); md.pend = []; vibra(15); }
  if (md.modo === 'area' && md.pend.length === 4) { md.medidas.push({ tipo: 'area', p: md.pend }); md.pend = []; vibra(15); }
}
TELAS.medir.montar = (tela) => {
  const inp = $('[data-md-foto]', tela);
  if (inp) inp.onchange = (e) => { const a = e.target.files[0]; if (!a) return; const img = new Image(), u = URL.createObjectURL(a); img.onload = () => { const s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); novaFoto(c, false); }; img.onerror = () => toast('Não deu para abrir essa foto', 'erro'); img.src = u; };
  const cv = $('[data-md-canvas]', tela); if (!cv || !md.img) return;
  cv.width = md.img.width; cv.height = md.img.height;
  desenhaMedir(cv);
  const paraImg = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) }; };
  let arrasta = null, ini = null;
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    const p = paraImg(e), k = cv.width / Math.max(1, cv.getBoundingClientRect().width);
    const todos = [...md.ref, ...md.pend, ...md.medidas.flatMap((m) => m.p)];
    arrasta = todos.find((q) => dist(q, p) < 26 * k) || null; ini = { x: e.clientX, y: e.clientY };
  });
  cv.addEventListener('pointermove', (e) => { if (!arrasta) return; Object.assign(arrasta, paraImg(e)); desenhaMedir(cv); });
  cv.addEventListener('pointerup', (e) => {
    if (!ini) return;
    const mexeu = Math.hypot(e.clientX - ini.x, e.clientY - ini.y) > 8;
    if (arrasta && mexeu) { arrasta = null; ini = null; repinta(); return; }
    arrasta = null; ini = null;
    soltarPonto(paraImg(e)); vibra(6); repinta();
  });
  cv.addEventListener('pointercancel', () => { arrasta = null; ini = null; });
};
function novaFoto(img, exemplo) { Object.assign(md, { img, ref: [], pend: [], medidas: [], exemplo }); if (!exemplo) { md.refCm = 0; md.refNome = ''; } repinta(); }
// foto de exemplo desenhada na hora: parede com porta (2,10 m) e uma folha A4 colada
ACOES['md-exemplo'] = () => {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 900; const g = c.getContext('2d'), px = 3.2;
  g.fillStyle = '#E9E2D6'; g.fillRect(0, 0, 1200, 900); g.fillStyle = '#CFC6B8'; g.fillRect(0, 790, 1200, 110);
  for (let y = 0; y < 790; y += 38) { g.strokeStyle = 'rgba(0,0,0,.035)'; g.beginPath(); g.moveTo(0, y); g.lineTo(1200, y); g.stroke(); }
  const pW = 80 * px, pH = 210 * px, pX = 720, pY = 790 - pH;
  g.fillStyle = '#8C6B4A'; g.fillRect(pX - 12, pY - 12, pW + 24, pH + 12); g.fillStyle = '#B08A63'; g.fillRect(pX, pY, pW, pH);
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 3; g.strokeRect(pX + 24, pY + 30, pW - 48, pH * 0.42); g.strokeRect(pX + 24, pY + pH * 0.5, pW - 48, pH * 0.42);
  g.fillStyle = '#D9D2C2'; g.beginPath(); g.arc(pX + pW - 26, pY + pH * 0.5, 8, 0, 7); g.fill();
  const aW = 21 * px, aH = 29.7 * px, aX = 300, aY = 300;
  g.save(); g.shadowColor = 'rgba(0,0,0,.18)'; g.shadowBlur = 8; g.fillStyle = '#FFFFFF'; g.fillRect(aX, aY, aW, aH); g.restore();
  g.fillStyle = '#5E7486'; g.font = '600 16px sans-serif'; g.fillText('A4', aX + 22, aY + 50);
  g.fillStyle = 'rgba(46,51,59,.55)'; g.font = '600 20px sans-serif'; g.fillText('Foto de exemplo', 24, 40);
  md.refCm = 29.7; md.refNome = 'Folha A4';
  novaFoto(c, true); toast('Toque nas duas pontas da folha A4 (em cima e embaixo)');
};
ACOES['md-ref'] = (b) => {
  const r = REFS.find(([k]) => k === b.dataset.k);
  if (r) { md.refCm = r[2]; md.refNome = r[1]; vibra(6); repinta(); return; }
  formulario({ titulo: 'Medida da referência', rotulo: 'Usar', campos: [{ n: 'cm', r: 'Tamanho do objeto, em cm', tipo: 'num', obrig: true, valor: md.refCm || '', dica: 'Ex.: azulejo de 60 cm, janela de 1,20 m = 120.' }, { n: 'nome', r: 'O que é', valor: '', lista: ['Azulejo', 'Janela', 'Régua', 'Tomada'] }],
    salvar: (v) => { if (!v.cm || v.cm <= 0) return 'Escreva o tamanho em cm.'; md.refCm = v.cm; md.refNome = v.nome || 'referência'; repinta(); } });
};
ACOES['md-modo'] = (b) => { md.modo = b.dataset.m === 'area' ? 'area' : 'linha'; md.pend = []; repinta(); };
ACOES['md-desfazer'] = () => { if (md.pend.length) md.pend.pop(); else if (md.medidas.length) { const m = md.medidas.pop(); md.pend = m.p.slice(0, -1); md.modo = m.tipo; } else if (md.ref.length) md.ref.pop(); vibra(6); repinta(); };
ACOES['md-refazer-ref'] = () => { md.ref = []; md.pend = []; repinta(); toast('Toque de novo nas duas pontas da referência'); };
ACOES['md-nova'] = () => { Object.assign(md, { img: null, ref: [], pend: [], medidas: [], refCm: 0, refNome: '', exemplo: false }); repinta(); };
const textoMedidas = () => `Medidas (aproximadas, por foto; referência: ${md.refNome || 'objeto'} de ${fmtCm(md.refCm)}):\n${md.medidas.map((m, i) => `• ${m.tipo === 'area' ? 'Área' : 'Medida'} ${i + 1}: ${valorMedida(m).txt}`).join('\n')}`;
// o que a medição entrega: área total (m²) se houver área; senão a última distância (m)
export function ultimaMedida() {
  const areas = md.medidas.filter((m) => m.tipo === 'area');
  if (areas.length) return { qtd: Math.round(areas.reduce((s, m) => s + valorMedida(m).m2, 0) * 100) / 100, un: 'm²', txt: textoMedidas() };
  const l = md.medidas[md.medidas.length - 1]; return l ? { qtd: Math.round(valorMedida(l).cm) / 100, un: 'm', txt: textoMedidas() } : null;
}
ACOES['md-copiar'] = () => copiar(textoMedidas());
ACOES['md-orcar'] = () => { const u = ultimaMedida(); if (!u) return; db.medidaOrcar = { ...u, data: hoje() }; grava(); toast(`Medida guardada: ${numBR(u.qtd, 2)} ${u.un}`); ir('orcar'); };
ACOES['md-obra'] = () => {
  const u = ultimaMedida(); if (!u) return;
  const l = db.obras.filter((o) => o.status !== 'concluida'); if (!l.length) { toast('Nenhuma obra aberta', 'erro'); return; }
  formulario({ titulo: 'Pôr numa obra', rotulo: 'Pôr na obra', campos: [{ n: 'o', r: 'Obra', tipo: 'sel', ops: l.map((o) => [o.id, `${o.titulo} · ${primeiro(cliente(o.cliente).nome)}`]) }],
    salvar: (v) => {
      const o = achar('obras', v.o); if (!o) return 'Escolha a obra.';
      const usa = (o.orc.modo === 'm2' && u.un === 'm²') || (o.orc.modo === 'metro' && u.un === 'm');
      if (usa) o.orc.qtd = u.qtd;
      o.hist.push({ data: hoje(), txt: `Medido por foto: ${md.medidas.map((m) => valorMedida(m).txt).join('; ')}${usa ? ` · orçamento com ${numBR(u.qtd, 2)} ${u.un}` : ''}` });
      grava(); toast(usa ? `Orçamento atualizado: ${numBR(u.qtd, 2)} ${u.un}` : 'Medidas guardadas no histórico da obra'); ir(`obra/${o.id}`);
    } });
};
