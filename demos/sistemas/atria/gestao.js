// Atria · gestão: obras, orçamento, proposta comercial, cobrança com Pix, materiais, lojas, preços, clientes,
// financeiro, ferramentas de bancada e mensagens prontas.
import { ligarVoz, $, $$, t, sa, din, dinCurto, lerDin, lerNum, campoDin, numBR, uid, hoje, somaDias, dias, dataBR, dataCurta, quando, agora, zap, abrirZap, av, ico, db, grava, achar, toast, folha, formulario, confirmar, copiar, comIA, repinta, ir, cab, vibra } from './base.js';
import { cena, TIPOS_CENA } from './cenas.js';
import { pixPayload, normalizaChave, TIPOS_CHAVE } from './pix.js';
import { planoDeCorte, MODELOS, MODELO_OFICIO, lerPolegada, mm2polFracao, m3Madeira, latasTinta, traco, blocos, piso, TIPOS_BLOCO } from './ferramentas.js';
import { qrSVG } from '../base/qr.js';
import { OFICIOS, MODOS_COBRAR, meusOficios, principal, nomeOficios, juntar, materiaisSugeridos } from './oficios.js';

// jeitos de cobrar: os do ofício da obra (ou da pessoa) primeiro, depois os outros
export const modosObra = (o) => [...new Set([...((OFICIOS[o.oficio] || {}).cobra || []), ...juntar(db.perfil, 'cobra'), ...Object.keys(MODOS_COBRAR)])];
export const STATUS = { orcamento: 'Orçamento', aprovada: 'Aprovada', andamento: 'Em andamento', concluida: 'Concluída' };
const ORDEM = ['orcamento', 'aprovada', 'andamento', 'concluida'];
const TAG_ST = { orcamento: 'trena', aprovada: 'giz', andamento: 'cedro', concluida: 'musgo' };
const UNS = ['un', 'chapa', 'm', 'm²', 'kg', 'cento', 'par', 'rolo', 'galão', 'lata', 'jogo', 'saco'];
export const nomeLoja = (id) => { const l = achar('lojas', id); return l ? l.nome : (id || 'sem loja'); };
export const cliente = (id) => achar('clientes', id) || { nome: 'Cliente', tel: '' };

// ------------------------------------------------------------------ contas da obra
export function totais(o) {
  const r = o.orc || {};
  const mat = (o.mats || []).reduce((s, m) => s + Math.round(m.qtd * m.preco), 0);
  const margem = Math.round(mat * (r.margem || 0) / 100);
  const mo = r.modo === 'empreitada' ? (r.valorUn || 0) : Math.round((r.valorUn || 0) * (r.qtd || 0));
  const total = mo + mat + margem + (r.desloc || 0);
  const entrada = Math.round(total * (r.entradaPct || 0) / 100);
  return { mat, margem, matCobrado: mat + margem, mo, desloc: r.desloc || 0, total, entrada, saldo: Math.max(0, total - (o.recebido || 0)), lucro: mo + margem };
}
export const obrasAtivas = () => db.obras.filter((o) => o.status !== 'concluida');
export const aReceber = () => db.obras.filter((o) => o.orc && o.orc.status === 'aprovado').map((o) => ({ o, v: totais(o).saldo })).filter((x) => x.v > 0);

// ------------------------------------------------------------------ preços: onde está mais barato
export function precosDe(mat) {
  const k = sa(mat), porLoja = {};
  db.precos.filter((p) => sa(p.mat) === k).forEach((p) => { if (!porLoja[p.loja] || porLoja[p.loja].data < p.data) porLoja[p.loja] = p; });
  return Object.values(porLoja).sort((a, b) => a.preco - b.preco);
}
export const melhorPreco = (mat) => precosDe(mat)[0] || null;
const mediana = (l) => { const s = [...l].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export function economiaLista(o) {
  let total = 0; const itens = [];
  (o.mats || []).filter((m) => !m.comprado).forEach((m) => { const b = melhorPreco(m.nome); if (b && b.preco < m.preco) { const e = (m.preco - b.preco) * m.qtd; total += e; itens.push({ m, b, e }); } });
  return { total: Math.round(total), itens };
}

// ------------------------------------------------------------------ mensagens prontas
export const MOMENTOS = {
  contato: 'Primeiro contato', achado: 'Resposta a pedido', orcamento: 'Envio de orçamento', visita: 'Confirmar visita ou data',
  inicio: 'Início de etapa', fim: 'Fim de etapa', pagamento: 'Lembrete de pagamento', avaliacao: 'Pedir avaliação e foto', garantia: 'Revisão da garantia',
};
export function mensagem(momento, { c, o, extra = {}, variante = 0 }) {
  const eu = db.perfil, nome = c ? c.nome.split(' ')[0] : 'tudo bem', ob = o ? o.titulo.toLowerCase() : 'o serviço', tt = o ? totais(o) : null;
  const etapaAtual = o ? (o.etapas || []).find((e) => !e.feito) : null, etapaFeita = o ? [...(o.etapas || [])].reverse().find((e) => e.feito) : null;
  const ag = o && (o.agenda || [])[0];
  const M = {
    contato: [`Olá, ${nome}! Aqui é o ${eu.apelido}, ${nomeOficios(eu).toLowerCase()} de ${eu.cidade}. Vi que você precisa de ${ob}. Posso passar aí para medir e te mandar o orçamento com a lista de material detalhada, sem compromisso. Qual o melhor dia?`,
      `Oi, ${nome}, tudo bem? Sou o ${eu.apelido} (${nomeOficios(eu).toLowerCase()}). Trabalho com ${meusOficios(eu).map((x) => x.area.toLowerCase()).slice(0, 2).join(' e ')} aqui em ${eu.cidade}. Se quiser, te mando fotos de serviços parecidos e marco uma visita para medir.`],
    achado: [`Olá! Vi o seu pedido "${extra.titulo || ob}". Sou o ${eu.apelido}, ${nomeOficios(eu).toLowerCase()} em ${eu.cidade}, e faço esse tipo de serviço. Posso passar para ver as medidas e te mandar um orçamento sem compromisso. Meu portfólio está no meu perfil do Atria.`,
      `Bom dia! Tenho interesse no serviço "${extra.titulo || ob}". Trabalho há anos com isso aqui na região. Me fala o melhor horário para eu ir medir?`],
    orcamento: [`Olá, ${nome}! Segue o orçamento de ${ob}:\n\n${tt ? `• Mão de obra: ${din(tt.mo)}\n• Materiais: ${din(tt.matCobrado)}${tt.desloc ? `\n• Deslocamento: ${din(tt.desloc)}` : ''}\n*Total: ${din(tt.total)}*\nEntrada de ${o.orc.entradaPct}%: ${din(tt.entrada)}\nPrazo: ${o.orc.prazo} dias · validade ${o.orc.validade} dias` : ''}\n\nQualquer dúvida é só me chamar. Se aprovar, já reservo a data.`,
      `${nome}, terminei o orçamento de ${ob}. ${tt ? `O total ficou em ${din(tt.total)}, com a lista de material item a item.` : ''} Te mando o PDF agora. Se quiser ajustar algum material para caber no bolso, me fala que eu refaço.`],
    visita: [`Olá, ${nome}! Confirmando: ${ag ? `${quando(ag.data)} (${dataBR(ag.data)}) às ${ag.hora}` : 'amanhã de manhã'} estarei aí para ${ob}. Pode ser?`,
      `${nome}, passando para lembrar da nossa visita ${ag ? `${quando(ag.data)} às ${ag.hora}` : 'combinada'}. Se precisar mudar, me avisa por aqui.`],
    inicio: [`Bom dia, ${nome}! Hoje começo a etapa "${etapaAtual ? etapaAtual.nome.toLowerCase() : 'seguinte'}" de ${ob}. Te mando foto no fim do dia.`],
    fim: [`${nome}, terminei a etapa "${etapaFeita ? etapaFeita.nome.toLowerCase() : 'combinada'}" de ${ob}. Ficou bonita, olha a foto! ${etapaAtual ? `A próxima é "${etapaAtual.nome.toLowerCase()}".` : 'Agora é só aproveitar.'}`],
    pagamento: [`Olá, ${nome}, tudo bem? Passando para lembrar do valor de ${tt ? din(tt.saldo) : 'combinado'} de ${ob}. Se quiser, te mando o Pix copia e cola agora. Obrigado!`,
      `${nome}, bom dia! Só lembrando do restante de ${ob}${tt ? ` (${din(tt.saldo)})` : ''}. Pode ser no Pix, te mando a chave. Qualquer coisa me fala.`],
    garantia: [`Olá, ${nome}! Faz um tempo que entreguei ${ob}. Está tudo certo? O serviço tem garantia${o && o.garantiaAte ? ` até ${dataBR(o.garantiaAte)}` : ''}: se notar qualquer coisa, me chama que eu passo aí para ver. E se algum conhecido precisar, pode indicar!`],
    avaliacao: [`${nome}, obrigado pela confiança em ${ob}! Se puder, me manda uma foto do ambiente pronto e deixa uma avaliação no meu perfil. Isso me ajuda muito a conseguir novos clientes.`],
  };
  const l = M[momento] || M.contato;
  return l[variante % l.length];
}
export function abrirMensagens(momento = 'contato', obraId = '', clienteId = '', extra = {}) {
  let var_ = 0;
  const op = (lista, sel, rot) => `<option value="">${rot}</option>${lista.map(([k, r]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${t(r)}</option>`).join('')}`;
  folha({
    titulo: 'Mensagem pronta',
    corpo: `<div class="chips" role="group" aria-label="Momento">${Object.entries(MOMENTOS).map(([k, r]) => `<button type="button" class="chip" data-m="${k}" aria-pressed="${k === momento}">${r}</button>`).join('')}</div>
      <div class="duas" style="margin-top:8px"><label class="campo"><span>Cliente</span><select data-c>${op(db.clientes.map((c) => [c.id, c.nome]), clienteId, 'Sem cliente')}</select></label>
      <label class="campo"><span>Obra</span><select data-o>${op(db.obras.map((o) => [o.id, o.titulo]), obraId, 'Sem obra')}</select></label></div>
      <label class="campo"><span>Mensagem (pode mudar à vontade)</span><textarea data-txt data-voz rows="8"></textarea></label>
      <p class="mudo" style="font-size:12.5px;margin:-4px 0 0" data-fonte></p>`,
    pe: `<button type="button" class="bt leve p" data-ia>${ico('ia')}Outra versão</button><button type="button" class="bt leve p" data-copiar>${ico('copiar')}Copiar</button><button type="button" class="bt zap p" data-zap>${ico('zap')}WhatsApp</button>`,
    aoAbrir: (f) => {
      ligarVoz(f);
      const txt = $('[data-txt]', f), selC = $('[data-c]', f), selO = $('[data-o]', f), fonte = $('[data-fonte]', f);
      const ctx = () => { const o = achar('obras', selO.value); const c = achar('clientes', selC.value) || (o ? achar('clientes', o.cliente) : null); return { o, c }; };
      const gera = () => { const { o, c } = ctx(); txt.value = mensagem(momento, { o, c, extra, variante: var_ }); fonte.textContent = 'Modelo pronto com os dados da obra.'; };
      selO.onchange = () => { const o = achar('obras', selO.value); if (o) selC.value = o.cliente; gera(); };
      selC.onchange = gera;
      $$('[data-m]', f).forEach((b) => { b.onclick = () => { momento = b.dataset.m; var_ = 0; $$('[data-m]', f).forEach((x) => x.setAttribute('aria-pressed', x === b)); gera(); }; });
      $('[data-ia]', f).onclick = async (e) => {
        const b = e.currentTarget; b.disabled = true; var_++;
        const { o, c } = ctx();
        const r = await comIA(`Escreva uma mensagem curta de WhatsApp, educada e direta, de um ${nomeOficios(db.perfil).toLowerCase()} para o cliente. Momento: ${MOMENTOS[momento]}. Cliente: ${c ? c.nome : 'cliente'}. Serviço: ${o ? o.titulo : 'serviço'}. ${o ? `Total ${din(totais(o).total)}, falta ${din(totais(o).saldo)}.` : ''} Sem emojis em excesso.`, () => mensagem(momento, { o, c, extra, variante: var_ }));
        txt.value = r.txt; fonte.textContent = r.ia ? 'Escrita pela IA grátis. Confira antes de mandar.' : 'Outra versão do modelo pronto (a IA grátis escreve na conta assinada).'; b.disabled = false;
      };
      $('[data-copiar]', f).onclick = () => copiar(txt.value);
      $('[data-zap]', f).onclick = () => { const { c } = ctx(); abrirZap(c ? c.tel : '', txt.value); };
      gera();
    },
  });
}

// ------------------------------------------------------------------ obras
// registro de projetos: A fazer (aprovado, ainda não começou), Em andamento e Feitos; orçamentos à parte
export const GRUPOS_OBRA = { afazer: ['A fazer', (o) => o.status === 'aprovada'], andamento: ['Em andamento', (o) => o.status === 'andamento'], feitos: ['Feitos', (o) => o.status === 'concluida'], orcamento: ['Orçamentos', (o) => o.status === 'orcamento'] };
export const contagemObras = () => Object.fromEntries(Object.entries(GRUPOS_OBRA).map(([k, [, f]]) => [k, db.obras.filter(f).length]));
function fotoObra(o) { const f = [...(o.diario || [])].reverse().find((x) => x.foto); return f ? `<img src="${f.foto}" alt="" style="width:100%;height:100%;object-fit:cover">` : cena(o.tipo, o.status === 'concluida' ? 'depois' : 'antes'); }
function cartaoObra(o) {
  const c = cliente(o.cliente), tt = totais(o), feitas = o.etapas.filter((e) => e.feito).length, pct = o.etapas.length ? Math.round(feitas / o.etapas.length * 100) : 0;
  const datas = o.status === 'concluida' ? `feito em ${dataCurta(o.fim || o.prazo)}` : o.status === 'andamento' ? `começou ${dataCurta(o.inicio || o.criada)} · entrega ${dataCurta(o.prazo)}` : o.status === 'aprovada' ? `começa ${o.inicio ? dataCurta(o.inicio) : 'a combinar'} · entrega ${dataCurta(o.prazo)}` : `pedido em ${dataCurta(o.criada)}`;
  const mover = { aprovada: ['andamento', 'Começar', 'setaDir'], andamento: ['concluida', 'Terminar', 'ok'], orcamento: ['aprovada', 'Aprovado', 'ok'] }[o.status];
  return `<article class="cartao ob-cartao" data-obra="${o.id}">
    <a href="#obra/${o.id}" class="ob-link"><span class="ob-foto">${fotoObra(o)}</span>
    <span class="ob-txt"><b>${t(o.titulo)}</b><small>${t(c.nome)}</small><small class="num">${datas}</small></span><b class="num ob-valor">${dinCurto(tt.total)}</b></a>
    ${o.status === 'andamento' ? `<div class="progresso" style="margin:10px 0 2px"><i style="width:${pct}%"></i></div><small class="mudo" style="font-size:12px">${feitas} de ${o.etapas.length} etapas${tt.saldo ? ` · falta receber ${din(tt.saldo)}` : ''}</small>` : ''}
    <div class="ob-acoes">${mover ? `<button type="button" class="bt cheio p" data-acao="mover-obra" data-id="${o.id}" data-s="${mover[0]}">${ico(mover[2])}${mover[1]}</button>` : `<button type="button" class="bt cheio p" data-acao="novo-post" data-o="${o.id}">${ico('partilhar')}${o.postado ? 'Postar de novo' : 'Postar antes e depois'}</button>`}${o.status === 'concluida' && !o.avaliacaoPedida ? `<button type="button" class="bt leve p" data-acao="pedir-avaliacao" data-o="${o.id}">${ico('estrela')}Pedir avaliação</button>` : ''}</div>
  </article>`;
}
let filtroObras = 'afazer', buscaObra = '';
export const TELAS = {};
export const ACOES = {};
export const ganchos = {}; // preenchidos pelo app.js (MEI, parcelas, deslocamento)

TELAS.obras = () => {
  const n = contagemObras(), [rot, f] = GRUPOS_OBRA[filtroObras], q = sa(buscaObra);
  const l = db.obras.filter(f).filter((o) => !q || sa(`${o.titulo} ${cliente(o.cliente).nome}`).includes(q)).sort((a, b) => (filtroObras === 'feitos' ? (b.fim || '').localeCompare(a.fim || '') : (a.prazo || '').localeCompare(b.prazo || '')));
  return `${cab('Minhas obras', `${n.afazer} a fazer · ${n.andamento} em andamento · ${n.feitos} feitos`, { dica: 'Um toque em Começar ou Terminar muda a obra de lista. As feitas viram antes e depois no seu portfólio.' })}
    ${(() => { const at = db.obras.filter((o) => o.status === 'andamento' || o.status === 'aprovada'), rec = at.reduce((s, o) => s + totais(o).saldo, 0), mat = at.reduce((s, o) => s + totais(o).mat, 0), prox = at.filter((o) => o.prazo).sort((x, y) => x.prazo.localeCompare(y.prazo))[0];
      return at.length ? `<div class="dois-num ob-resumo"><div class="cartao"><small>Falta receber</small><b>${dinCurto(rec)}</b></div><div class="cartao"><small>Material das obras</small><b>${dinCurto(mat)}</b></div></div>${prox ? `<p class="mudo" style="font-size:13px;margin:8px 0 12px">Próxima entrega: <b style="color:var(--grafite)">${t(prox.titulo)}</b>, ${quando(prox.prazo)}</p>` : ''}` : ''; })()}
    <div class="seg ob-seg" role="group" aria-label="Listas de obras" data-seg>${['afazer', 'andamento', 'feitos'].map((k) => `<button type="button" data-acao="filtro-obras" data-f="${k}" aria-pressed="${filtroObras === k}">${GRUPOS_OBRA[k][0]} <b class="num">${n[k]}</b></button>`).join('')}<i></i></div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px"><label class="busca" style="flex:1 1 170px;min-width:0;margin:0">${ico('lupa')}<input type="search" data-busca-obra value="${t(buscaObra)}" placeholder="Buscar obra ou cliente" aria-label="Buscar obra"></label><button type="button" class="chip" data-acao="filtro-obras" data-f="orcamento" aria-pressed="${filtroObras === 'orcamento'}">Orçamentos <b>${n.orcamento}</b></button></div>
    <h2 class="sec">${rot}</h2>
    <div class="lista">${l.map(cartaoObra).join('') || `<div class="vazio"><b>Nada em ${rot.toLowerCase()}</b>${filtroObras === 'afazer' ? 'Quando o cliente aprovar um orçamento, a obra aparece aqui.' : ''}</div>`}</div>
    <button type="button" class="bt cheio largo" style="margin-top:14px" data-acao="nova-obra">${ico('mais')}Nova obra ou orçamento</button>`;
};
TELAS.obras.montar = (tela) => { const i = $('[data-busca-obra]', tela); if (i) i.oninput = () => { buscaObra = i.value; const p = i.selectionStart; repinta(); const n = $('[data-busca-obra]'); n.focus(); n.setSelectionRange(p, p); }; };
ACOES['filtro-obras'] = (b) => { filtroObras = b.dataset.f; repinta(); };
ACOES['mover-obra'] = (b) => {
  const o = achar('obras', b.dataset.id), s = b.dataset.s; if (!o) return;
  ACOES['status-obra']({ dataset: { id: o.id, s } });
  if (s === 'aprovada' && ganchos.gerarParcelas) { ganchos.gerarParcelas(o); grava(); }
  toast(s === 'andamento' ? 'Obra começou: foi para Em andamento' : s === 'concluida' ? 'Feito! Foi para Feitos' : 'Aprovado: foi para A fazer', 'ok', s === 'concluida' ? { rotulo: 'Postar', fazer: () => ACOES['novo-post'] && ACOES['novo-post']({ dataset: { o: o.id } }) } : undefined);
};


export const CENA_DO_OFICIO = { pedreiro: 'muro', mestre: 'muro', azulejista: 'piso', carpinteiro: 'deck', marceneiro: 'guarda-roupa', pintor: 'fachada', eletricista: 'quadro', encanador: 'banheiro', montador: 'guarda-roupa', gesseiro: 'painel', telhadista: 'pergolado' };
const SERVICOS = { pedreiro: ['Muro de bloco', 'Levantar parede', 'Contrapiso', 'Reboco', 'Churrasqueira', 'Calçada'], azulejista: ['Reforma de banheiro', 'Porcelanato da sala', 'Revestimento de cozinha', 'Piso da varanda'], carpinteiro: ['Deck de madeira', 'Pergolado', 'Forro de madeira', 'Troca de portas', 'Telhado de madeira'], marceneiro: ['Guarda-roupa planejado', 'Cozinha planejada', 'Painel ripado', 'Prateleiras e nichos'], eletricista: ['Troca de tomadas', 'Quadro de luz novo', 'Instalação de chuveiro', 'Elétrica da casa toda'], encanador: ['Troca de registro', 'Hidráulica do banheiro', 'Conserto de vazamento'], pintor: ['Pintura interna', 'Pintura de fachada', 'Textura'], gesseiro: ['Forro de gesso', 'Parede de drywall', 'Sanca'], mestre: ['Construção de casa', 'Reforma completa', 'Ampliação'], montador: ['Montagem de guarda-roupa', 'Montagem de cozinha'], telhadista: ['Troca de telhas', 'Conserto de goteira'] };
export const SERVICOS_SUGERIDOS = () => [...new Set(meusOficios(db.perfil).flatMap((x) => SERVICOS[x.id] || [`Serviço de ${x.nome.toLowerCase()}`]))];
export function novaObra(pre = {}) {
  formulario({
    titulo: 'Nova obra', rotulo: 'Criar obra',
    campos: [
      { n: 'titulo', r: 'O que vai fazer', obrig: true, valor: pre.titulo || '', lista: SERVICOS_SUGERIDOS() },
      { n: 'cliente', r: 'Cliente', obrig: true, valor: pre.cliente || '', lista: db.clientes.map((c) => c.nome), dica: 'Escolha da lista ou escreva um nome novo: o cadastro é criado sozinho.' },
      { n: 'tel', r: 'WhatsApp do cliente (se for novo)', tipo: 'tel', valor: pre.tel || '' },
      { n: 'oficio', r: 'Ofício deste serviço', tipo: 'sel', valor: pre.oficio || principal(db.perfil).id, ops: [...meusOficios(db.perfil).map((x) => [x.id, x.nome]), ...Object.entries(OFICIOS).filter(([k]) => !db.perfil.oficios.includes(k)).map(([k, x]) => [k, x.nome])] },
      { n: 'tipo', r: 'Ilustração do serviço', tipo: 'sel', valor: pre.tipo || CENA_DO_OFICIO[principal(db.perfil).id] || 'muro', ops: Object.entries(TIPOS_CENA) },
      { n: 'prazo', r: 'Entregar até', tipo: 'data', valor: somaDias(hoje(), 20) },
    ],
    salvar: (v) => {
      let c = db.clientes.find((x) => sa(x.nome) === sa(v.cliente));
      if (!c) { c = { id: uid('c'), nome: v.cliente, tel: v.tel, end: '', desde: hoje() }; db.clientes.push(c); }
      const of = OFICIOS[v.oficio] || {};
      const o = { id: uid('o'), cliente: c.id, titulo: v.titulo, tipo: v.tipo, oficio: v.oficio, status: 'orcamento', criada: hoje(), prazo: v.prazo, etapas: ['Visita e medidas', 'Orçamento aprovado', 'Compra do material', 'Execução', 'Entrega'].map((n) => ({ id: uid('e'), nome: n, feito: false })), mats: [],
        orc: { modo: (of.cobra || ['empreitada'])[0], valorUn: 0, qtd: 1, desloc: 0, margem: db.perfil.margem || 10, mostrarItens: true, entradaPct: 40, parcelas: 1, validade: 15, prazo: 15, status: 'rascunho' }, recebido: 0, agenda: [], hist: [{ data: hoje(), txt: 'Obra criada' }] };
      if (pre.pedido) o.hist.push({ data: hoje(), txt: `Veio do pedido: ${pre.pedido}` });
      db.obras.push(o); grava(); toast('Obra criada'); ir(`obra/${o.id}`);
    },
  });
}
ACOES['nova-obra'] = () => novaObra();

TELAS.obra = (id) => {
  const o = achar('obras', id); if (!o) return `${cab('Obra')}<div class="vazio"><b>Obra não encontrada</b></div>`;
  const c = cliente(o.cliente), tt = totais(o), feitas = o.etapas.filter((e) => e.feito).length, pct = o.etapas.length ? Math.round(feitas / o.etapas.length * 100) : 0, iSt = ORDEM.indexOf(o.status);
  const eco = economiaLista(o);
  return `${cab(t(o.titulo), `${t(c.nome)} · ${STATUS[o.status]}`, { dica: 'Toque nas etapas para marcar o que já fez. O orçamento e o Pix usam os valores daqui.', direita: `<button type="button" class="voltar" data-acao="editar-obra" data-id="${o.id}" aria-label="Editar obra">${ico('lapis')}</button>` })}
    <div class="passos" role="group" aria-label="Status da obra">${ORDEM.map((s, i) => `<button type="button" class="${i < iSt ? 'feito' : i === iSt ? 'atual' : ''}" data-acao="status-obra" data-id="${o.id}" data-s="${s}">${STATUS[s]}</button>`).join('')}</div>
    <div class="cartao" style="margin-top:12px"><div style="display:flex;justify-content:space-between;align-items:baseline"><b>Etapas</b><span class="num mudo" style="font-size:13px">${pct}%</span></div>
      <div class="progresso" style="margin:8px 0 4px"><i style="width:${pct}%" data-pct="${pct}"></i></div>
      ${o.etapas.map((e) => `<div class="etapa ${e.feito ? 'feito' : ''}" role="checkbox" aria-checked="${e.feito}" tabindex="0" data-acao="etapa" data-id="${o.id}" data-e="${e.id}"><span class="caixa">${ico('ok', 'stroke-width="3"')}</span><span>${t(e.nome)}</span></div>`).join('')}
      <button type="button" class="bt leve p" style="margin-top:8px" data-acao="nova-etapa" data-id="${o.id}">${ico('mais')}Etapa</button></div>
    <h2 class="sec">Dinheiro da obra</h2>
    <div class="cartao"><div class="valores">
      <div><span>Mão de obra</span><b>${din(tt.mo)}</b></div><div><span>Materiais (com ${o.orc.margem}% de margem)</span><b>${din(tt.matCobrado)}</b></div>
      ${tt.desloc ? `<div><span>Deslocamento</span><b>${din(tt.desloc)}</b></div>` : ''}<div class="total"><span>Total para o cliente</span><b>${din(tt.total)}</b></div>
      <div><span>Recebido</span><b style="color:var(--musgo)">${din(o.recebido)}</b></div><div><span>Falta receber</span><b>${din(tt.saldo)}</b></div>
      <div><span>Seu lucro (mão de obra + margem)</span><b>${din(tt.lucro)}</b></div></div>
      <div class="acoes"><a class="bt cheio p" href="#orcamento/${o.id}">${ico('doc')}Orçamento ${o.orc.status === 'rascunho' ? '' : `· ${{ enviado: 'enviado', aprovado: 'aprovado', recusado: 'recusado' }[o.orc.status]}`}</a><button type="button" class="bt p" data-acao="pix" data-id="${o.id}">${ico('pix')}Cobrar no Pix</button><button type="button" class="bt p" data-acao="receber" data-id="${o.id}">${ico('moeda')}Recebi</button></div></div>
    <h2 class="sec">Materiais <a href="#materiais/${o.id}">Abrir lista</a></h2>
    <a class="linha" href="#materiais/${o.id}"><span class="ic">${ico('lista')}</span><span class="txt"><b>${o.mats.length} itens · ${din(tt.mat)}</b><small>${o.mats.filter((m) => m.comprado).length} comprados${eco.total ? ` · dá para economizar ${din(eco.total)}` : ''}</small></span>${ico('setaDir', 'width="20" height="20"')}</a>
    ${ganchos.parcelas ? ganchos.parcelas(o) : ''}
    <h2 class="sec">Conversar</h2>
    <div class="acoes" style="margin-top:0"><button type="button" class="bt zap p" data-acao="mensagens" data-o="${o.id}">${ico('zap')}Mensagem pronta</button><a class="bt p" href="#proposta/${o.id}">${ico('doc')}Proposta</a><a class="bt p" href="#contrato/${o.id}">${ico('doc')}Contrato${o.contrato && o.contrato.aceitoEm ? ' ✓' : ''}</a></div>
    <h2 class="sec">Agenda <button type="button" class="bt leve p" data-acao="nova-visita" data-id="${o.id}">${ico('mais')}Marcar</button></h2>
    ${o.agenda.length ? `<div class="lista">${o.agenda.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)).map((a) => `<div class="linha"><span class="ic">${ico('calendario')}</span><span class="txt"><b>${t(a.nota)}</b><small>${quando(a.data)} · ${dataBR(a.data)} às ${t(a.hora)}</small></span></div>`).join('')}</div>` : '<p class="mudo">Nenhuma visita marcada.</p>'}
    <h2 class="sec">Divulgar</h2>
    <button type="button" class="bt leve largo" data-acao="novo-post" data-o="${o.id}">${ico('antesdepois')}${o.postado ? 'Postar de novo no portfólio' : 'Postar o antes e depois desta obra'}</button>
    ${ganchos.desloc ? ganchos.desloc(o) : ''}
    <h2 class="sec">Diário da obra <button type="button" class="bt leve p" data-acao="diario" data-id="${o.id}">${ico('camera')}Registrar</button></h2>
    ${(o.diario || []).length ? `<div class="diario">${[...o.diario].reverse().map((x) => `<figure>${x.foto ? `<img src="${x.foto}" alt="">` : cena(o.tipo, 'antes')}<figcaption><b>${dataCurta(x.data)}</b>${t(x.nota || '')}</figcaption></figure>`).join('')}</div>` : '<p class="mudo">Tire uma foto por dia: vira prova do serviço e o antes e depois do portfólio.</p>'}
    ${o.garantiaAte ? `<p class="explica"><b>Garantia até ${dataBR(o.garantiaAte)}.</b> O Atria lembra você de falar com o cliente perto do fim.</p>` : ''}
    <h2 class="sec">Histórico</h2>
    <div class="lista">${[...o.hist].reverse().map((h) => `<div style="display:flex;gap:10px;font-size:14px"><span class="num mudo" style="font-size:12px;min-width:46px">${dataCurta(h.data)}</span><span>${t(h.txt)}${h.fin ? ` <a class="bt leve p" href="#recibo/${h.fin}" style="min-height:30px;margin-left:6px">Recibo</a>` : ''}</span></div>`).join('')}</div>
    <button type="button" class="bt leve largo" style="margin-top:18px;color:var(--brasa);border-color:var(--brasa-claro)" data-acao="apagar-obra" data-id="${o.id}">${ico('lixo')}Apagar obra</button>`;
};
ACOES['status-obra'] = (b) => {
  const o = achar('obras', b.dataset.id), s = b.dataset.s; if (!o || o.status === s) return;
  o.status = s; if (s === 'concluida') { o.fim = hoje(); o.garantiaAte = somaDias(hoje(), 30 * (db.perfil.garantiaMeses || 12)); } if (s === 'andamento' && !o.inicio) o.inicio = hoje();
  if ((s === 'aprovada' || s === 'andamento') && o.orc.status !== 'aprovado') o.orc.status = 'aprovado';
  o.hist.push({ data: hoje(), txt: `Status: ${STATUS[s]}` }); grava(); vibra(); repinta();
  if (s === 'concluida') toast('Obra concluída. Que tal postar o antes e depois?', 'ok', { rotulo: 'Postar', fazer: () => ACOES['novo-post']({ dataset: { o: o.id } }) });
};
ACOES.etapa = (el) => {
  const o = achar('obras', el.dataset.id), e = o && o.etapas.find((x) => x.id === el.dataset.e); if (!e) return;
  e.feito = !e.feito; if (e.feito) o.hist.push({ data: hoje(), txt: `Etapa feita: ${e.nome}` });
  if (e.feito && o.status === 'aprovada') o.status = 'andamento';
  grava(); vibra(8);
  el.classList.toggle('feito', e.feito); el.setAttribute('aria-checked', e.feito);
  const pct = Math.round(o.etapas.filter((x) => x.feito).length / o.etapas.length * 100), barra = $('.cartao .progresso i');
  if (barra) barra.style.width = `${pct}%`;
  const n = $('.cartao .num'); if (n) n.textContent = `${pct}%`;
  if (e.feito && pct === 100 && o.status !== 'concluida') toast('Todas as etapas feitas. Marcar como concluída?', 'ok', { rotulo: 'Concluir', fazer: () => ACOES['status-obra']({ dataset: { id: o.id, s: 'concluida' } }) });
};
ACOES['nova-etapa'] = (b) => formulario({ titulo: 'Nova etapa', campos: [{ n: 'nome', r: 'Etapa', obrig: true, lista: ['Medição', 'Compra do material', 'Corte', 'Montagem', 'Instalação', 'Acabamento', 'Limpeza'] }], salvar: (v) => { achar('obras', b.dataset.id).etapas.push({ id: uid('e'), nome: v.nome, feito: false }); grava(); repinta(); } });
ACOES['nova-visita'] = (b) => formulario({ titulo: 'Marcar na agenda', campos: [{ n: 'nota', r: 'O que vai fazer', obrig: true, lista: ['Visita para medir', 'Começar a obra', 'Instalação', 'Entrega', 'Buscar material'] }, { n: 'data', r: 'Dia', tipo: 'data', meio: true, valor: somaDias(hoje(), 1) }, { n: 'hora', r: 'Hora', tipo: 'hora', meio: true, valor: '08:00' }],
  salvar: (v) => { const o = achar('obras', b.dataset.id); o.agenda.push({ id: uid('a'), ...v }); o.hist.push({ data: hoje(), txt: `Marcado: ${v.nota} em ${dataBR(v.data)}` }); grava(); repinta(); toast('Marcado. Quer avisar o cliente?', 'ok', { rotulo: 'Avisar', fazer: () => abrirMensagens('visita', o.id) }); } });
ACOES['editar-obra'] = (b) => {
  const o = achar('obras', b.dataset.id);
  formulario({ titulo: 'Editar obra', campos: [{ n: 'titulo', r: 'Título', valor: o.titulo, obrig: true }, { n: 'tipo', r: 'Tipo de serviço', tipo: 'sel', valor: o.tipo, ops: Object.entries(TIPOS_CENA) }, { n: 'prazo', r: 'Entregar até', tipo: 'data', valor: o.prazo || '' }],
    salvar: (v) => { Object.assign(o, v); grava(); repinta(); } });
};
ACOES['apagar-obra'] = (b) => confirmar('Apagar obra?', 'A obra, a lista de materiais e o histórico somem deste aparelho.', 'Apagar', () => {
  const i = db.obras.findIndex((x) => x.id === b.dataset.id), [o] = db.obras.splice(i, 1); grava(); history.back();
  toast('Obra apagada', 'ok', { rotulo: 'Desfazer', fazer: () => { db.obras.splice(i, 0, o); grava(); repinta(); } });
});
ACOES.diario = (b) => {
  const o = achar('obras', b.dataset.id); let foto = '';
  folha({ titulo: 'Diário da obra', corpo: `<label class="foto-campo" style="display:block"><label style="display:grid;aspect-ratio:4/3"><b>Foto de hoje</b><span>${ico('camera', 'width="34" height="34"')}<br>Tirar foto</span><input type="file" accept="image/*" capture="environment" data-f></label></label>
    <label class="campo" style="margin-top:12px"><span>O que foi feito</span><textarea data-n data-voz rows="3" placeholder="Ex.: assentei 12 m² e rejuntei a parede do box"></textarea></label>`,
    pe: '<button type="button" class="bt cheio largo" data-ok>Guardar no diário</button>',
    aoAbrir: (f, api) => {
      ligarVoz(f);
      $('[data-f]', f).onchange = async (e) => { const a = e.target.files[0]; if (!a) return; foto = await new Promise((ok) => { const img = new Image(), u = URL.createObjectURL(a); img.onload = () => { const k = Math.min(1, 900 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', 0.72)); }; img.src = u; }); const l = e.target.closest('label'); l.querySelector('span').innerHTML = `<img src="${foto}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`; };
      $('[data-ok]', f).onclick = () => { const nota = $('[data-n]', f).value.trim(); if (!foto && !nota) { toast('Tire uma foto ou escreva o que foi feito', 'erro'); return; } (o.diario = o.diario || []).push({ id: uid('d'), data: hoje(), nota, foto }); grava(); api.fechar(); repinta(); toast('Guardado no diário'); };
    } });
};
ACOES.mensagens = (b) => abrirMensagens(b.dataset.m || 'contato', b.dataset.o || '', b.dataset.c || '');

// recebi um pagamento
function receber(o, valorSug) {
  const tt = totais(o);
  formulario({ titulo: 'Recebi um pagamento', rotulo: 'Lançar recebimento',
    campos: [{ n: 'valor', r: 'Valor recebido', tipo: 'din', valor: valorSug ?? tt.saldo, obrig: true, dica: `Falta receber ${din(tt.saldo)}. Pode lançar só uma parte: o recibo mostra quanto ainda falta.` }, { n: 'forma', r: 'Como pagou', valor: 'Pix', lista: ['Pix', 'Dinheiro', 'Cartão', 'Transferência'] }, { n: 'data', r: 'Dia', tipo: 'data', valor: hoje() }],
    salvar: (v) => {
      if (!v.valor) return 'Escreva o valor.';
      o.recebido = (o.recebido || 0) + v.valor;
      const fid = uid('f'), resta = Math.max(0, totais(o).total - o.recebido);
      db.fin.push({ id: fid, data: v.data, tipo: 'e', valor: v.valor, desc: `${o.titulo} (${v.forma})`, cat: 'Serviço', obra: o.id, cli: o.cliente, pago: true });
      o.hist.push({ data: v.data, txt: `Recebido ${din(v.valor)} no ${v.forma}${resta ? ` (falta ${din(resta)})` : ' (quitado)'}`, fin: fid }); grava(); repinta();
      toast(resta ? `${din(v.valor)} recebido · falta ${din(resta)}` : 'Recebido: serviço quitado', 'ok', { rotulo: 'Recibo', fazer: () => ir(`recibo/${fid}`) });
    } });
}
ACOES.receber = (b) => receber(achar('obras', b.dataset.id));

// ------------------------------------------------------------------ Pix
export function cadastrarPix(depois) {
  const p = db.pix || {};
  formulario({ titulo: 'Sua chave Pix', rotulo: 'Guardar chave',
    campos: [{ n: 'tipo', r: 'Tipo da chave', tipo: 'sel', valor: p.tipo || 'cpf', ops: Object.entries(TIPOS_CHAVE) }, { n: 'chave', r: 'Chave', valor: p.exemplo ? '' : (p.chave || ''), obrig: true },
      { n: 'nome', r: 'Nome de quem recebe', valor: p.nome || db.perfil.nome, obrig: true, dica: 'Como aparece no banco do cliente.' }, { n: 'cidade', r: 'Cidade', valor: p.cidade || db.perfil.cidade, obrig: true }],
    salvar: (v) => { const k = normalizaChave(v.tipo, v.chave); if (k.erro) return k.erro; db.pix = { tipo: v.tipo, chave: k.chave, nome: v.nome, cidade: v.cidade }; grava(); toast('Chave Pix guardada neste aparelho'); if (depois) setTimeout(depois, 250); } });
}
export function cobrarPix(o, valor) {
  if (!db.pix || !db.pix.chave) { cadastrarPix(() => cobrarPix(o, valor)); return; }
  const tt = o ? totais(o) : null;
  let centavos = valor ?? (o ? (o.orc.status === 'aprovado' && !o.recebido ? tt.entrada : tt.saldo) : 0);
  const txid = o ? `ATRIA${o.id.slice(-8)}`.toUpperCase() : '***';
  const montar = (f) => {
    const payload = pixPayload({ chave: db.pix.chave, nome: db.pix.nome, cidade: db.pix.cidade, centavos, txid, info: o ? o.titulo : '' });
    $('[data-qr]', f).innerHTML = qrSVG(payload, 220, '#2E333B');
    $('[data-cc]', f).textContent = payload;
    f.dataset.payload = payload;
  };
  folha({
    titulo: 'Cobrar com Pix',
    corpo: `${db.pix.exemplo ? '<p class="explica"><b>Chave de exemplo.</b> Cadastre a sua chave para o QR valer de verdade.</p>' : ''}
      <label class="campo"><span>Valor ${o ? `(${o.titulo})` : ''}</span><input data-v inputmode="decimal" value="${campoDin(centavos)}" placeholder="sem valor: o cliente digita"></label>
      ${o ? `<div class="chips" style="margin-top:-4px">${[['Entrada', tt.entrada], ['Falta receber', tt.saldo], ['Total', tt.total]].map(([r, v]) => `<button type="button" class="chip" data-sug="${v}">${r} <b>${dinCurto(v)}</b></button>`).join('')}</div>` : ''}
      <div style="display:grid;place-items:center;margin:12px 0"><div data-qr style="background:#fff;padding:10px;border-radius:16px;box-shadow:var(--sombra)"></div></div>
      <p style="font-size:12px;margin:0 0 4px" class="mudo">Pix copia e cola</p><p class="num" data-cc style="font-size:11.5px;word-break:break-all;background:var(--aparas);border-radius:12px;padding:10px;margin:0"></p>
      <p class="explica"><b>O dinheiro cai direto na sua conta.</b> O Atria não intermedia o pagamento e não consulta o seu banco: quando conferir no extrato, toque em “Recebi”.</p>
      <p class="mudo" style="font-size:12px">Chave: ${t(TIPOS_CHAVE[db.pix.tipo])} · ${t(db.pix.nome)} <button type="button" class="bt leve p" data-trocar style="margin-left:6px">Trocar chave</button></p>`,
    pe: `<button type="button" class="bt leve p" data-copiar>${ico('copiar')}Copiar</button><button type="button" class="bt leve p" data-img>${ico('camera')}Imagem do QR</button><button type="button" class="bt zap p" data-zap>${ico('zap')}Mandar</button>`,
    aoAbrir: (f, api) => {
      montar(f);
      $('[data-v]', f).oninput = (e) => { centavos = lerDin(e.target.value); montar(f); };
      $$('[data-sug]', f).forEach((b) => { b.onclick = () => { centavos = +b.dataset.sug; $('[data-v]', f).value = campoDin(centavos); montar(f); }; });
      $('[data-copiar]', f).onclick = () => copiar(f.dataset.payload);
      $('[data-trocar]', f).onclick = () => { api.fechar(true); cadastrarPix(() => cobrarPix(o, centavos)); };
      $('[data-zap]', f).onclick = () => {
        const c = o ? cliente(o.cliente) : null;
        abrirZap(c ? c.tel : '', `Olá${c ? `, ${c.nome.split(' ')[0]}` : ''}! Segue o Pix${o ? ` de ${o.titulo.toLowerCase()}` : ''}${centavos ? ` no valor de ${din(centavos)}` : ''}.\n\nPix copia e cola (copie tudo e cole no app do banco, em Pix > Copia e cola):\n${f.dataset.payload}\n\nRecebedor: ${db.pix.nome}`);
      };
      $('[data-img]', f).onclick = () => salvarQR(f.dataset.payload, centavos);
      if (o) { const rec = document.createElement('button'); rec.type = 'button'; rec.className = 'bt p'; rec.innerHTML = `${ico('ok')}Recebi`; rec.onclick = () => { api.fechar(true); receber(o, centavos); }; $('.folha-pe', f).prepend(rec); }
    },
  });
}
ACOES.pix = (b) => cobrarPix(b.dataset.id ? achar('obras', b.dataset.id) : null);
// imagem do QR (PNG) para mandar junto no WhatsApp
function salvarQR(payload, centavos) {
  const svg = qrSVG(payload, 600, '#2E333B'), img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = 680; c.height = 820; const g = c.getContext('2d');
    g.fillStyle = '#FBF9F5'; g.fillRect(0, 0, 680, 820); g.drawImage(img, 40, 40, 600, 600);
    g.fillStyle = '#2E333B'; g.font = '700 34px sans-serif'; g.textAlign = 'center'; g.fillText(centavos ? `Pix ${din(centavos)}` : 'Pix', 340, 700);
    g.font = '24px sans-serif'; g.fillStyle = '#77736C'; g.fillText(`${db.pix.nome} · feito no Atria`, 340, 745);
    c.toBlob(async (blob) => {
      const arq = new File([blob], 'pix-qr.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [arq] })) { try { await navigator.share({ files: [arq], title: 'Pix' }); return; } catch { /* cancelou: baixa */ } }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pix-qr.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Imagem do QR salva');
    });
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ------------------------------------------------------------------ orçamento
TELAS.orcamento = (id) => {
  const o = achar('obras', id); if (!o) return cab('Orçamento');
  const r = o.orc, tt = totais(o), c = cliente(o.cliente), eu = db.perfil;
  const ST = { rascunho: ['Rascunho', 'trena'], enviado: ['Enviado', 'giz'], aprovado: ['Aprovado', 'musgo'], recusado: ['Recusado', 'brasa'] };
  const parcelas = Math.max(1, r.parcelas || 1), resto = tt.total - tt.entrada;
  return `${cab('Orçamento', `${t(o.titulo)} · <span class="tag ${ST[r.status][1]}">${ST[r.status][0]}</span>`, { dica: 'Mexa nos valores: o documento embaixo muda na hora. Depois salve em PDF ou mande no WhatsApp.' })}
    <div class="cartao so-tela">
      <span class="campo" style="margin-bottom:6px"><span>Como você cobra a mão de obra</span></span>
      <div class="chips" role="group" aria-label="Como cobra a mão de obra">${modosObra(o).map((k) => `<button type="button" class="chip" data-acao="orc-modo" data-id="${o.id}" data-m="${k}" aria-pressed="${r.modo === k}">${MODOS_COBRAR[k].nome}</button>`).join('')}</div>
      <div class="duas" style="margin-top:10px"><label class="campo"><span>${MODOS_COBRAR[r.modo].rot}</span><input data-orc="valorUn" data-din inputmode="decimal" value="${campoDin(r.valorUn)}"></label>
      ${r.modo === 'empreitada' ? '' : `<label class="campo"><span>Quantos (${MODOS_COBRAR[r.modo].un})</span><input data-orc="qtd" inputmode="decimal" value="${numBR(r.qtd)}"></label>`}
      <label class="campo"><span>Deslocamento</span><input data-orc="desloc" data-din inputmode="decimal" value="${campoDin(r.desloc)}"></label><label class="campo"><span>Margem no material (%)</span><input data-orc="margem" inputmode="decimal" value="${numBR(r.margem)}"></label>
      <label class="campo"><span>Entrada (%)</span><input data-orc="entradaPct" inputmode="decimal" value="${numBR(r.entradaPct)}"></label><label class="campo"><span>Parcelas do resto</span><input data-orc="parcelas" inputmode="numeric" value="${parcelas}"></label>
      <label class="campo"><span>Prazo (dias)</span><input data-orc="prazo" inputmode="numeric" value="${r.prazo}"></label><label class="campo"><span>Validade (dias)</span><input data-orc="validade" inputmode="numeric" value="${r.validade}"></label></div>
      <label style="display:flex;gap:10px;align-items:center;font-weight:600;font-size:14px"><input type="checkbox" data-orc-itens ${r.mostrarItens ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--cedro)">Mostrar os materiais item a item para o cliente</label>
      ${o.mats.length ? '' : `<p class="explica" style="margin-bottom:0">Esta obra ainda não tem lista de materiais. <a href="#materiais/${o.id}">Montar a lista</a></p>`}
    </div>
    <div class="acoes so-tela"><button type="button" class="bt p" data-acao="imprimir">${ico('doc')}PDF / imprimir</button><button type="button" class="bt zap p" data-acao="orc-zap" data-id="${o.id}">${ico('zap')}Mandar</button><button type="button" class="bt p" data-acao="pix" data-id="${o.id}">${ico('pix')}Pix da entrada</button></div>
    <div class="acoes so-tela" style="margin-top:8px">${r.status !== 'aprovado' ? `<button type="button" class="bt cheio p" data-acao="orc-st" data-id="${o.id}" data-s="aprovado">${ico('ok')}Cliente aprovou</button>` : ''}${r.status === 'rascunho' ? `<button type="button" class="bt giz p" data-acao="orc-st" data-id="${o.id}" data-s="enviado">Marcar como enviado</button>` : ''}${r.status !== 'recusado' && r.status !== 'aprovado' ? `<button type="button" class="bt leve p" data-acao="orc-st" data-id="${o.id}" data-s="recusado">Recusou</button>` : ''}</div>
    <h2 class="sec so-tela">Como o cliente vê</h2>
    <article class="doc" id="doc">
      <div class="doc-cab"><span class="marca">${t(eu.nome.split(' ').map((x) => x[0]).slice(0, 2).join(''))}</span><div><b>${t(eu.nome)}</b><small class="mudo">${t(nomeOficios(eu))} · ${t(eu.cidade)}-${t(eu.uf)} · WhatsApp ${t(eu.zap)}</small></div></div>
      <p style="margin:14px 0 0"><b>Orçamento para ${t(c.nome)}</b><br><span class="mudo">${t(o.titulo)} · ${dataBR(hoje())}</span></p>
      <h3>Mão de obra</h3><table><tr><td>${r.modo === 'empreitada' ? 'Serviço completo (empreitada)' : `${numBR(r.qtd)} ${MODOS_COBRAR[r.modo].un} × ${din(r.valorUn)}`}</td><td>${din(tt.mo)}</td></tr>${tt.desloc ? `<tr><td>Deslocamento</td><td>${din(tt.desloc)}</td></tr>` : ''}</table>
      <h3>Materiais</h3><table>${r.mostrarItens && o.mats.length ? o.mats.map((m) => `<tr><td>${numBR(m.qtd)} ${t(m.un)} · ${t(m.nome)}</td><td>${din(Math.round(m.qtd * m.preco * (1 + r.margem / 100)))}</td></tr>`).join('') : `<tr><td>Materiais (${o.mats.length} itens)</td><td>${din(tt.matCobrado)}</td></tr>`}</table>
      <table><tr class="tot"><td>Total</td><td>${din(tt.total)}</td></tr></table>
      <h3>Pagamento</h3><p style="margin:0">${r.entradaPct ? `Entrada de ${numBR(r.entradaPct)}%: <b>${din(tt.entrada)}</b> na aprovação. ` : ''}${resto > 0 ? `Restante: ${parcelas > 1 ? `${parcelas}x de ${din(Math.round(resto / parcelas))}` : `${din(resto)} na entrega`}.` : ''} Pix, dinheiro ou transferência.</p>
      <h3>Prazo e validade</h3><p style="margin:0">Execução em até ${r.prazo} dias depois da aprovação. Orçamento válido por ${r.validade} dias (até ${dataBR(somaDias(hoje(), +r.validade || 0))}).</p>
      <div class="assina"><span>${t(eu.nome)}</span><span>${t(c.nome)}</span></div>
    </article>`;
};
TELAS.orcamento.montar = (tela, id) => {
  const o = achar('obras', id); if (!o) return;
  $$('[data-orc]', tela).forEach((inp) => inp.addEventListener('change', () => {
    const k = inp.dataset.orc; o.orc[k] = 'din' in inp.dataset ? lerDin(inp.value) : lerNum(inp.value);
    if (k === 'parcelas') o.orc[k] = Math.max(1, Math.round(o.orc[k])); grava(); repinta();
  }));
  const ch = $('[data-orc-itens]', tela); if (ch) ch.onchange = () => { o.orc.mostrarItens = ch.checked; grava(); repinta(); };
};
ACOES['orc-modo'] = (b) => { const o = achar('obras', b.dataset.id); o.orc.modo = b.dataset.m; if (b.dataset.m !== 'empreitada' && !o.orc.qtd) o.orc.qtd = 1; grava(); repinta(); };
ACOES.imprimir = () => window.print();
ACOES['orc-st'] = (b) => {
  const o = achar('obras', b.dataset.id), s = b.dataset.s; o.orc.status = s;
  if (s === 'enviado') { o.orc.enviadoEm = hoje(); o.hist.push({ data: hoje(), txt: 'Orçamento enviado' }); }
  if (s === 'recusado') o.hist.push({ data: hoje(), txt: 'Orçamento recusado' });
  if (s === 'aprovado') {
    if (ganchos.gerarParcelas) ganchos.gerarParcelas(o);
    if (o.status === 'orcamento') o.status = 'aprovada';
    const e = o.etapas.find((x) => /orçamento|aprova/i.test(x.nome)); if (e) e.feito = true;
    o.hist.push({ data: hoje(), txt: `Orçamento aprovado: ${din(totais(o).total)}` });
    grava(); repinta(); vibra(20);
    toast('Aprovado! Virou obra. Cobrar a entrada no Pix?', 'ok', { rotulo: 'Cobrar', fazer: () => cobrarPix(o, totais(o).entrada) });
    return;
  }
  grava(); repinta();
};
ACOES['orc-zap'] = (b) => {
  const o = achar('obras', b.dataset.id);
  if (o.orc.status === 'rascunho') { o.orc.status = 'enviado'; o.orc.enviadoEm = hoje(); o.hist.push({ data: hoje(), txt: 'Orçamento enviado no WhatsApp' }); grava(); }
  abrirZap(cliente(o.cliente).tel, mensagem('orcamento', { o, c: cliente(o.cliente) }) + (o.orc.mostrarItens && o.mats.length ? `\n\nMateriais:\n${o.mats.map((m) => `• ${numBR(m.qtd)} ${m.un} ${m.nome}`).join('\n')}` : ''));
  setTimeout(repinta, 300);
};

// ------------------------------------------------------------------ proposta comercial
const SECOES = [['apresentacao', 'Apresentação'], ['escopo', 'Escopo do serviço'], ['etapas', 'Etapas e prazos'], ['investimento', 'Materiais e investimento'], ['condicoes', 'Condições de pagamento'], ['garantia', 'Garantia'], ['validade', 'Validade'], ['aceite', 'Aceite']];
function propostaPadrao(o) {
  const eu = db.perfil, c = cliente(o.cliente), tt = totais(o), r = o.orc;
  return {
    apresentacao: `${eu.nome} trabalha há anos com ${meusOficios(eu).map((x) => x.area.toLowerCase()).join(', ')} em ${eu.cidade} e região. Cada serviço é medido no local, feito com material de primeira e entregue limpo.`,
    escopo: `Execução de ${o.titulo.toLowerCase()} para ${c.nome}${c.end ? `, em ${c.end}` : ''}, conforme medidas tiradas no local e combinadas com o cliente.`,
    etapas: o.etapas.map((e, i) => `${i + 1}. ${e.nome}`).join('\n') + `\nPrazo total: até ${r.prazo} dias depois da aprovação.`,
    investimento: `Mão de obra: ${din(tt.mo)}\nMateriais (${o.mats.length} itens, lista anexa): ${din(tt.matCobrado)}${tt.desloc ? `\nDeslocamento: ${din(tt.desloc)}` : ''}\nInvestimento total: ${din(tt.total)}`,
    condicoes: `Entrada de ${r.entradaPct}% (${din(tt.entrada)}) na aprovação e o restante ${r.parcelas > 1 ? `em ${r.parcelas} parcelas` : 'na entrega'}. Pagamento por Pix, dinheiro ou transferência.`,
    garantia: 'Garantia de 12 meses para a montagem e a instalação. Ferragens com a garantia do fabricante. Não cobre mau uso, umidade ou mudança do móvel de lugar.',
    validade: `Proposta válida por ${r.validade} dias.`,
    aceite: 'Para aprovar, basta responder "aprovado" no WhatsApp ou assinar abaixo.',
  };
}
TELAS.proposta = (id) => {
  const o = achar('obras', id); if (!o) return cab('Proposta');
  if (!o.prop) { o.prop = propostaPadrao(o); grava(); }
  const eu = db.perfil, c = cliente(o.cliente);
  return `${cab('Proposta', t(o.titulo), { dica: 'Para trabalhos maiores: toque em cada parte para mudar o texto ou pedir ajuda para redigir.' })}
    <div class="acoes so-tela" style="margin-top:0"><button type="button" class="bt p" data-acao="imprimir">${ico('doc')}PDF</button><button type="button" class="bt zap p" data-acao="prop-zap" data-id="${o.id}">${ico('zap')}Mandar</button><button type="button" class="bt cheio p" data-acao="orc-st" data-id="${o.id}" data-s="aprovado">${ico('ok')}Aceita</button></div>
    <p class="mudo so-tela" style="font-size:12.5px">Toque numa parte do documento para editar. <button type="button" class="bt leve p" data-acao="prop-refazer" data-id="${o.id}">Refazer com os números do orçamento</button></p>
    <article class="doc" id="doc">
      <div style="background:var(--grafite);color:#F4EFE8;margin:-22px -20px 16px;padding:28px 20px;border-radius:6px 6px 0 0;position:relative;overflow:hidden">
        <div style="position:absolute;inset:auto 0 0 0;height:10px;background:repeating-linear-gradient(90deg,#C2A37A 0 1px,transparent 1px 10px)"></div>
        <small style="letter-spacing:.14em;text-transform:uppercase;color:var(--trena)">Proposta comercial</small>
        <b style="display:block;font:800 30px/1 var(--f-tit);text-transform:uppercase;margin:6px 0">${t(o.titulo)}</b>
        <span>Para ${t(c.nome)} · ${dataBR(hoje())}</span><br><span style="opacity:.75">${t(eu.nome)} · ${t(nomeOficios(eu))} · ${t(eu.cidade)}-${t(eu.uf)} · ${t(eu.zap)}</span></div>
      ${SECOES.map(([k, r]) => `<section data-acao="prop-editar" data-id="${o.id}" data-k="${k}" style="cursor:pointer;border-radius:8px"><h3>${r}</h3><p style="margin:0;white-space:pre-line">${t(o.prop[k])}</p></section>`).join('')}
      <div class="assina"><span>${t(eu.nome)}</span><span>${t(c.nome)}</span></div>
    </article>`;
};
ACOES['prop-refazer'] = (b) => { const o = achar('obras', b.dataset.id); o.prop = propostaPadrao(o); grava(); repinta(); toast('Proposta refeita'); };
ACOES['prop-editar'] = (b) => {
  const o = achar('obras', b.dataset.id), k = b.dataset.k, rot = SECOES.find((x) => x[0] === k)[1];
  folha({ titulo: rot, corpo: `<label class="campo"><span>Texto</span><textarea data-t rows="9">${t(o.prop[k])}</textarea></label><p class="mudo" style="font-size:12.5px" data-f></p>`,
    pe: `<button type="button" class="bt leve p" data-ia>${ico('ia')}Melhorar o texto</button><button type="button" class="bt cheio" data-ok>Salvar</button>`,
    aoAbrir: (f, api) => {
      const ta = $('[data-t]', f);
      $('[data-ia]', f).onclick = async (e) => {
        e.currentTarget.disabled = true;
        const r = await comIA(`Reescreva de forma profissional, clara e curta a seção "${rot}" de uma proposta comercial de ${nomeOficios(db.perfil).toLowerCase()} para "${o.titulo}". Texto atual: ${ta.value}`, () => propostaPadrao(o)[k]);
        ta.value = r.txt; $('[data-f]', f).textContent = r.ia ? 'Texto da IA grátis. Confira os valores.' : 'Texto do modelo pronto (a IA grátis redige na conta assinada).'; e.currentTarget.disabled = false;
      };
      $('[data-ok]', f).onclick = () => { o.prop[k] = ta.value; grava(); api.fechar(); repinta(); };
    } });
};
ACOES['prop-zap'] = (b) => {
  const o = achar('obras', b.dataset.id), c = cliente(o.cliente);
  abrirZap(c.tel, `Olá, ${c.nome.split(' ')[0]}! Segue a proposta para ${o.titulo.toLowerCase()}:\n\n${SECOES.slice(0, 7).map(([k, r]) => `*${r}*\n${o.prop[k]}`).join('\n\n')}\n\n${o.prop.aceite}`);
  if (o.orc.status === 'rascunho') { o.orc.status = 'enviado'; grava(); }
};

// ------------------------------------------------------------------ materiais da obra
TELAS.materiais = (id) => {
  const o = achar('obras', id); if (!o) return cab('Materiais');
  const tt = totais(o), eco = economiaLista(o), pend = o.mats.filter((m) => !m.comprado).length;
  return `${cab('Materiais', t(o.titulo), { dica: 'Toque na caixinha quando comprar. Toque no item para mudar quantidade, preço ou loja. O Atria compara com os preços que você registrou.' })}
    ${eco.total ? `<div class="economia-total" style="margin-bottom:12px"><small>Dá para economizar comprando nas lojas mais baratas</small><b class="num">${din(eco.total)}</b><div class="acoes" style="margin-top:8px"><button type="button" class="bt p" style="border-color:#fff;color:#fff" data-acao="ver-economia" data-id="${o.id}">Ver onde</button><button type="button" class="bt p" style="background:#fff;border-color:#fff;color:var(--musgo)" data-acao="aplicar-economia" data-id="${o.id}">Usar os mais baratos</button></div></div>` : ''}
    <div class="lista">${o.mats.map((m) => { const b = melhorPreco(m.nome), mais = b && b.preco < m.preco && !m.comprado; return `<div class="mat ${m.comprado ? 'feito' : ''}" data-acao="editar-mat" data-id="${o.id}" data-m="${m.id}"><span class="caixa" role="checkbox" aria-checked="${m.comprado}" aria-label="Comprado" data-acao="comprado" data-id="${o.id}" data-m="${m.id}" tabindex="0" style="${m.comprado ? '' : ''}">${ico('ok', 'stroke-width="3"')}</span><span class="txt"><b>${t(m.nome)}</b><small>${numBR(m.qtd)} ${t(m.un)} × ${din(m.preco)} · ${t(nomeLoja(m.loja))}</small></span><span class="dir"><b>${din(m.qtd * m.preco)}</b>${mais ? `<span class="economia">${din(m.preco - b.preco)} a menos</span>` : ''}</span></div>`; }).join('') || '<div class="vazio"><b>Lista vazia</b>Adicione os itens ou use a lista pronta por modelo.</div>'}</div>
    <div class="acoes"><button type="button" class="bt cheio p" data-acao="novo-mat" data-id="${o.id}">${ico('mais')}Item</button><a class="bt p" href="#modelo/${o.id}">${ico('ia')}Lista por modelo</a></div>
    <div class="acoes" style="margin-top:8px"><button type="button" class="bt zap p" data-acao="lista-zap" data-id="${o.id}">${ico('zap')}Mandar a lista</button><button type="button" class="bt p" data-acao="pedir-lojas" data-id="${o.id}">${ico('loja')}Pedir orçamento às lojas</button></div>
    <div class="rodape-lista"><div><small>Material (${pend} a comprar)</small><br><b>${din(tt.mat)}</b></div><div class="cobrar" style="text-align:right"><small>Cobrar com ${o.orc.margem}%</small><br><b>${din(tt.matCobrado)}</b></div></div>`;
};
ACOES.comprado = (el, e) => {
  e.stopPropagation();
  const o = achar('obras', el.dataset.id), m = o.mats.find((x) => x.id === el.dataset.m); m.comprado = !m.comprado; grava(); vibra(8);
  const linha = el.closest('.mat'); linha.classList.toggle('feito', m.comprado); el.setAttribute('aria-checked', m.comprado);
  const pend = o.mats.filter((x) => !x.comprado).length, sm = $('.rodape-lista small'); if (sm) sm.textContent = `Material (${pend} a comprar)`;
  if (m.comprado) toast('Comprado. Lançar no caixa?', 'ok', { rotulo: 'Lançar', fazer: () => { db.fin.push({ id: uid('f'), data: hoje(), tipo: 's', valor: Math.round(m.qtd * m.preco), desc: m.nome, cat: 'Material', obra: o.id, pago: true }); grava(); toast('Lançado como saída'); } });
};
function formMat(o, m) {
  const conhecidos = [...new Set([...materiaisSugeridos(db.perfil).map(([n]) => n), ...db.precos.map((p) => p.mat), ...((OFICIOS[o.oficio] || {}).mats || []).map(([n]) => n)])];
  formulario({ titulo: m ? 'Editar item' : 'Novo item', rotulo: m ? 'Salvar' : 'Adicionar',
    campos: [{ n: 'nome', r: 'Material', obrig: true, voz: true, valor: m ? m.nome : '', lista: conhecidos, dica: 'Escolha da lista para comparar preços, ou escreva outro.' },
      { n: 'qtd', r: 'Quantidade', tipo: 'num', meio: true, valor: m ? numBR(m.qtd) : '1' }, { n: 'un', r: 'Unidade', meio: true, valor: m ? m.un : 'un', lista: UNS },
      { n: 'preco', r: 'Preço por unidade', tipo: 'din', meio: true, valor: m ? m.preco : 0 }, { n: 'loja', r: 'Loja', meio: true, valor: m ? nomeLoja(m.loja) : '', lista: db.lojas.map((l) => l.nome) }],
    extraPe: m ? `<button type="button" class="bt leve p" data-tirar style="color:var(--brasa)">${ico('lixo')}</button>` : '',
    depois: (f, api) => {
      const nome = f.querySelector('[name=nome]'), preco = f.querySelector('[name=preco]'), loja = f.querySelector('[name=loja]'), un = f.querySelector('[name=un]');
      nome.addEventListener('change', () => { const b = melhorPreco(nome.value); if (b && !lerDin(preco.value)) { preco.value = campoDin(b.preco); loja.value = nomeLoja(b.loja); un.value = b.un || un.value; toast(`Preço mais baixo registrado: ${din(b.preco)}`); } });
      const tirar = f.querySelector('[data-tirar]'); if (tirar) tirar.onclick = () => { o.mats = o.mats.filter((x) => x !== m); grava(); api.fechar(); repinta(); };
    },
    salvar: (v) => {
      let l = db.lojas.find((x) => sa(x.nome) === sa(v.loja));
      if (!l && v.loja) { l = { id: uid('l'), nome: v.loja, end: '', tel: '', manual: true }; db.lojas.push(l); }
      const dados = { nome: v.nome, qtd: v.qtd || 1, un: v.un || 'un', preco: v.preco, loja: l ? l.id : '' };
      if (m) Object.assign(m, dados); else o.mats.push({ id: uid('m'), comprado: false, ...dados });
      if (v.preco && l && !precosDe(v.nome).some((p) => p.loja === l.id && p.preco === v.preco)) db.precos.push({ id: uid('pr'), mat: v.nome, un: dados.un, loja: l.id, preco: v.preco, data: hoje(), fonte: 'lista' });
      grava(); repinta();
    } });
}
ACOES['novo-mat'] = (b) => formMat(achar('obras', b.dataset.id));
ACOES['editar-mat'] = (el) => { const o = achar('obras', el.dataset.id); formMat(o, o.mats.find((x) => x.id === el.dataset.m)); };
ACOES['ver-economia'] = (b) => {
  const o = achar('obras', b.dataset.id), eco = economiaLista(o);
  folha({ titulo: 'Onde comprar mais barato', corpo: `<div class="lista">${eco.itens.map(({ m, b: x, e }) => `<div class="linha" style="cursor:default"><span class="ic">${ico('loja')}</span><span class="txt"><b>${t(m.nome)}</b><small>${t(nomeLoja(x.loja))}: ${din(x.preco)} (na lista: ${din(m.preco)})</small></span><span class="dir"><b style="color:var(--musgo)">−${din(e)}</b></span></div>`).join('')}</div><p class="mudo" style="font-size:12.5px">Comparação feita com os preços que você registrou${db.precos.some((p) => p.exemplo) ? ' (na demonstração, preços de exemplo de lojas de exemplo)' : ''}. Confira na loja antes de comprar.</p>`,
    pe: `<button type="button" class="bt cheio largo" data-ok>Usar os mais baratos (−${din(eco.total)})</button>`, aoAbrir: (f, api) => { $('[data-ok]', f).onclick = () => { api.fechar(); ACOES['aplicar-economia'](b); }; } });
};
ACOES['aplicar-economia'] = (b) => {
  const o = achar('obras', b.dataset.id), eco = economiaLista(o), antes = o.mats.map((m) => ({ ...m }));
  eco.itens.forEach(({ m, b: x }) => { m.preco = x.preco; m.loja = x.loja; }); grava(); repinta(); vibra(20);
  toast(`Lista ${din(eco.total)} mais barata`, 'ok', { rotulo: 'Desfazer', fazer: () => { o.mats = antes; grava(); repinta(); } });
};
const textoLista = (o, comPreco) => `*Lista de materiais · ${o.titulo}*\n${o.mats.map((m) => `• ${numBR(m.qtd)} ${m.un} · ${m.nome}${comPreco ? ` · ${din(m.qtd * m.preco)}` : ''}`).join('\n')}${comPreco ? `\n\n*Total: ${din(totais(o).mat)}*` : ''}\n\nEnviado pelo Atria · ${db.perfil.nome}`;
ACOES['lista-zap'] = (b) => {
  const o = achar('obras', b.dataset.id);
  folha({ titulo: 'Mandar a lista', corpo: `<div class="seg" data-seg role="group"><button type="button" aria-pressed="true" data-p="1">Com preços</button><button type="button" aria-pressed="false" data-p="0">Sem preços</button><i></i></div><div class="zap-previa" style="margin-top:12px"><pre data-pre></pre></div>`,
    pe: `<button type="button" class="bt leve p" data-copiar>${ico('copiar')}Copiar</button><button type="button" class="bt zap" data-zap>${ico('zap')}Escolher contato</button>`,
    aoAbrir: (f) => {
      let com = true; const pre = $('[data-pre]', f), pinta = () => { pre.textContent = textoLista(o, com); };
      ligarSeg($('[data-seg]', f), (bt) => { com = bt.dataset.p === '1'; pinta(); }); pinta();
      $('[data-copiar]', f).onclick = () => copiar(pre.textContent);
      $('[data-zap]', f).onclick = () => abrirZap('', pre.textContent);
    } });
};
ACOES['pedir-lojas'] = (b) => {
  const o = achar('obras', b.dataset.id), comTel = db.lojas.filter((l) => l.tel);
  folha({ titulo: 'Pedir orçamento', corpo: `<p class="mudo" style="margin-top:0">Manda a lista sem preços para cada loja responder com o valor. Quando responderem, registre o preço e o Atria mostra onde compensa.</p><div class="lista">${comTel.map((l) => `<div class="linha" style="cursor:default"><span class="ic">${ico('loja')}</span><span class="txt"><b>${t(l.nome)}</b><small>${t(l.tel)}</small></span><a class="bt zap p" target="_blank" rel="noopener" href="${zap(l.tel, `Bom dia! Poderia me passar o orçamento destes materiais?\n\n${textoLista(o, false)}`)}">${ico('zap')}Pedir</a></div>`).join('') || '<div class="vazio"><b>Nenhuma loja com telefone</b>Cadastre em Lojas.</div>'}</div>`,
    pe: `<a class="bt leve largo" href="#lojas">${ico('mapa')}Ver lojas da cidade</a>` });
};

// lista pronta por modelo de serviço (inovação)
TELAS.modelo = (obraId) => {
  const o = obraId ? achar('obras', obraId) : null;
  const meus = juntar(db.perfil, 'modelos'), ordem = [...new Set([...((o && OFICIOS[o.oficio] || {}).modelos || []), ...meus, ...Object.keys(MODELOS)])];
  const k = TELAS.modelo.k || ordem[0], M = MODELOS[k];
  TELAS.modelo.v = TELAS.modelo.v && TELAS.modelo.vk === k ? TELAS.modelo.v : Object.fromEntries(M.campos.map(([n, , pad]) => [n, pad])); TELAS.modelo.vk = k;
  const v = TELAS.modelo.v, lista = M.lista(v);
  const custo = lista.reduce((s, [nome, q]) => { const b = melhorPreco(nome); return s + (b ? b.preco * q : 0); }, 0);
  return `${cab('Lista por modelo', o ? t(o.titulo) : 'Medidas viram lista de material', { dica: 'Escolha o tipo de serviço, ponha as medidas e o Atria calcula a quantidade com uma folga de perda. É estimativa: confira antes de comprar.' })}
    <div class="chips" role="group">${ordem.map((kk) => `<button type="button" class="chip" data-acao="modelo-k" data-k="${kk}" aria-pressed="${kk === k}">${meus.includes(kk) ? '★ ' : ''}${MODELOS[kk].nome}</button>`).join('')}</div>
    <div class="cartao" style="margin-top:8px"><div class="duas">${M.campos.map(([n, r]) => `<label class="campo"><span>${r}</span><input data-mv="${n}" inputmode="decimal" value="${numBR(v[n])}"></label>`).join('')}</div>
    ${lista.map(([nome, q, un]) => { const b = melhorPreco(nome); return `<div class="preco-linha"><span>${numBR(q)} ${t(un)} · ${t(nome)}</span><b>${b ? din(b.preco * q) : '—'}</b></div>`; }).join('')}
    <div class="preco-linha" style="font-weight:700"><span>Custo estimado (preços mais baixos registrados)</span><b>${din(custo)}</b></div></div>
    <div class="acoes"><button type="button" class="bt cheio" data-acao="modelo-usar" data-o="${obraId || ''}">${ico('lista')}${o ? 'Pôr na lista da obra' : 'Criar lista numa obra'}</button><button type="button" class="bt" data-acao="modelo-ia">${ico('ia')}Descrever e pedir à IA</button></div>`;
};
TELAS.modelo.montar = (tela) => { $$('[data-mv]', tela).forEach((i) => i.addEventListener('change', () => { TELAS.modelo.v[i.dataset.mv] = lerNum(i.value) || 0; repinta(); })); };
ACOES['modelo-k'] = (b) => { TELAS.modelo.k = b.dataset.k; repinta(); };
function usarModelo(o) {
  const M = MODELOS[TELAS.modelo.vk || 'deck'], lista = M.lista(TELAS.modelo.v);
  lista.forEach(([nome, q, un]) => { const b = melhorPreco(nome); o.mats.push({ id: uid('m'), nome, qtd: q, un, preco: b ? b.preco : 0, loja: b ? b.loja : '', comprado: false }); });
  o.hist.push({ data: hoje(), txt: `Lista criada pelo modelo ${M.nome}` }); grava(); toast(`${lista.length} itens na lista`); ir(`materiais/${o.id}`);
}
ACOES['modelo-usar'] = (b) => {
  if (b.dataset.o) { usarModelo(achar('obras', b.dataset.o)); return; }
  folha({ titulo: 'Em qual obra?', corpo: `<div class="lista">${obrasAtivas().map((o) => `<button type="button" class="linha" data-ob="${o.id}"><span class="ic">${ico('casa')}</span><span class="txt"><b>${t(o.titulo)}</b><small>${t(cliente(o.cliente).nome)}</small></span></button>`).join('')}</div>`,
    aoAbrir: (f, api) => $$('[data-ob]', f).forEach((x) => { x.onclick = () => { api.fechar(true); usarModelo(achar('obras', x.dataset.ob)); }; }) });
};
ACOES['modelo-ia'] = () => folha({ titulo: 'Descrever o serviço', corpo: '<label class="campo"><span>O que o cliente quer</span><textarea data-d placeholder="Ex.: estante de 2 m de largura por 2,2 m de altura, MDF amadeirado, com 6 nichos e 2 portas embaixo" rows="5"></textarea></label><div data-r></div>',
  pe: `<button type="button" class="bt cheio largo" data-ok>${ico('ia')}Montar a lista</button>`,
  aoAbrir: (f) => {
    $('[data-ok]', f).onclick = async (e) => {
      const d = $('[data-d]', f).value.trim(); if (!d) { toast('Descreva o serviço', 'erro'); return; } e.currentTarget.disabled = true;
      const M = MODELOS[TELAS.modelo.vk || 'deck'];
      const r = await comIA(`Liste os materiais (quantidade, unidade e nome, um por linha, com 10% de perda) para este serviço de ${nomeOficios(db.perfil).toLowerCase()}: ${d}`, () => `Modelo mais parecido: ${M.nome}\n${M.lista(TELAS.modelo.v).map(([n, q, u]) => `${numBR(q)} ${u} · ${n}`).join('\n')}`);
      $('[data-r]', f).innerHTML = `<div class="cartao"><pre style="white-space:pre-wrap;margin:0;font:13.5px/1.5 var(--f-txt)">${t(r.txt)}</pre></div><p class="mudo" style="font-size:12.5px">${r.ia ? 'Lista da IA grátis: confira as quantidades.' : 'Na demonstração a lista vem do modelo pronto. Na conta assinada, a IA grátis lê a sua descrição.'}</p>`;
      e.currentTarget.disabled = false;
    };
  } });

// ------------------------------------------------------------------ clientes
let buscaCli = '';
TELAS.clientes = () => {
  const l = db.clientes.filter((c) => !buscaCli || sa(c.nome).includes(sa(buscaCli)) || (c.tel || '').includes(buscaCli)).sort((a, b) => a.nome.localeCompare(b.nome));
  return `${cab('Clientes', `${db.clientes.length} cadastrados`)}
    <label class="busca">${ico('lupa')}<input type="search" placeholder="Buscar por nome ou telefone" value="${t(buscaCli)}" data-busca-cli aria-label="Buscar cliente"></label>
    <div class="lista">${l.map((c) => { const os = db.obras.filter((o) => o.cliente === c.id), deve = os.reduce((s, o) => s + (o.orc.status === 'aprovado' ? totais(o).saldo : 0), 0); return `<a class="linha" href="#cliente/${c.id}">${av(c.nome)}<span class="txt"><b>${t(c.nome)}</b><small>${os.length} obra${os.length === 1 ? '' : 's'}${c.end ? ` · ${t(c.end)}` : ''}</small></span><span class="dir">${deve ? `<b style="color:var(--cedro)">${dinCurto(deve)}</b><small class="mudo" style="font-size:11px">a receber</small>` : ''}</span></a>`; }).join('') || '<div class="vazio"><b>Ninguém achado</b></div>'}</div>
    <button type="button" class="bt cheio largo" style="margin-top:14px" data-acao="novo-cliente">${ico('mais')}Novo cliente</button>`;
};
TELAS.clientes.montar = (tela) => { const i = $('[data-busca-cli]', tela); i.oninput = () => { buscaCli = i.value; const p = i.selectionStart; repinta(); const n = $('[data-busca-cli]'); n.focus(); n.setSelectionRange(p, p); }; };
export function formCliente(c, depois) {
  formulario({ titulo: c ? 'Editar cliente' : 'Novo cliente', campos: [{ n: 'nome', r: 'Nome', obrig: true, valor: c ? c.nome : '' }, { n: 'tel', r: 'WhatsApp', tipo: 'tel', valor: c ? c.tel : '' }, { n: 'end', r: 'Endereço da obra', valor: c ? c.end : '' }, { n: 'obs', r: 'Anotações', tipo: 'area', valor: c ? c.obs || '' : '' }],
    salvar: (v) => { if (c) Object.assign(c, v); else { c = { id: uid('c'), desde: hoje(), ...v }; db.clientes.push(c); } grava(); if (depois) depois(c); else repinta(); } });
}
ACOES['novo-cliente'] = () => formCliente(null, (c) => ir(`cliente/${c.id}`));
TELAS.cliente = (id) => {
  const c = achar('clientes', id); if (!c) return cab('Cliente');
  const os = db.obras.filter((o) => o.cliente === c.id), pago = os.reduce((s, o) => s + (o.recebido || 0), 0), deve = os.reduce((s, o) => s + (o.orc.status === 'aprovado' ? totais(o).saldo : 0), 0);
  return `${cab(t(c.nome), `cliente desde ${dataBR(c.desde)}`, { direita: `<button type="button" class="voltar" data-acao="editar-cliente" data-id="${c.id}" aria-label="Editar">${ico('lapis')}</button>` })}
    <div class="dois-num"><div class="cartao"><small>Já pagou</small><b>${din(pago)}</b></div><div class="cartao"><small>Falta pagar</small><b style="color:${deve ? 'var(--cedro)' : 'inherit'}">${din(deve)}</b></div></div>
    <div class="cartao" style="margin-top:12px">${c.tel ? `<p style="margin:0 0 6px">${ico('zap', 'width="16" height="16" style="vertical-align:-3px"')} ${t(c.tel)}</p>` : ''}${c.end ? `<p style="margin:0 0 6px">${ico('pin', 'width="16" height="16" style="vertical-align:-3px"')} ${t(c.end)}</p>` : ''}${c.obs ? `<p class="mudo" style="margin:0">${t(c.obs)}</p>` : ''}
      <div class="acoes"><button type="button" class="bt zap p" data-acao="mensagens" data-c="${c.id}" data-o="${os[0] ? os[0].id : ''}">${ico('zap')}Mensagem pronta</button>${deve ? `<button type="button" class="bt p" data-acao="mensagens" data-m="pagamento" data-c="${c.id}" data-o="${(os.find((o) => totais(o).saldo && o.orc.status === 'aprovado') || {}).id || ''}">${ico('moeda')}Lembrar pagamento</button>` : ''}</div></div>
    <h2 class="sec">Obras</h2><div class="lista">${os.map(cartaoObra).join('') || '<p class="mudo">Nenhuma obra ainda.</p>'}</div>
    <button type="button" class="bt cheio largo" style="margin-top:14px" data-acao="obra-do-cliente" data-id="${c.id}">${ico('mais')}Nova obra para ${t(c.nome.split(' ')[0])}</button>`;
};
ACOES['editar-cliente'] = (b) => formCliente(achar('clientes', b.dataset.id));
ACOES['obra-do-cliente'] = (b) => novaObra({ cliente: achar('clientes', b.dataset.id).nome });

// ------------------------------------------------------------------ lojas da cidade (OpenStreetMap)
let osm = { cidade: '', lojas: [], buscando: false, erro: '' };
let leaflet = null;
function carregaLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leaflet) return leaflet;
  leaflet = new Promise((ok, falha) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; s.onload = () => ok(window.L); s.onerror = () => { leaflet = null; falha(new Error('sem mapa')); }; document.head.appendChild(s);
  });
  return leaflet;
}
TELAS.lojas = () => {
  const salvas = db.lojas, ids = new Set(salvas.map((l) => l.osm).filter(Boolean));
  const novas = osm.lojas.filter((l) => !ids.has(l.osm));
  const tag = (l) => l.exemplo ? '<span class="exemplo">exemplo</span>' : l.osm ? '<span class="tag giz">OpenStreetMap</span>' : '<span class="tag">sua</span>';
  return `${cab('Lojas', 'Materiais de construção da cidade', { dica: 'As lojas reais vêm do OpenStreetMap, um mapa aberto e gratuito. Se a sua loja não aparece, adicione à mão.' })}
    <form class="busca" data-busca-cidade>${ico('pin')}<input name="cidade" value="${t(osm.cidade || db.perfil.cidade)}" aria-label="Cidade" placeholder="Cidade"><button type="submit" class="bt cheio p" ${osm.buscando ? 'disabled' : ''}>${osm.buscando ? 'Buscando…' : 'Buscar'}</button></form>
    <div id="mapa"><div class="vazio">${ico('mapa', 'width="28" height="28"')}<span>${navigator.onLine ? 'Carregando o mapa…' : 'Sem internet: o mapa aparece quando a conexão voltar.'}</span></div></div>
    ${osm.erro ? `<p class="explica" style="background:var(--brasa-claro)"><b style="color:var(--brasa)">Não deu para buscar agora.</b> ${t(osm.erro)}</p>` : ''}
    ${novas.length ? `<h2 class="sec">Achadas em ${t(osm.cidade)} <span class="mudo num" style="font-size:13px">${novas.length}</span></h2><div class="lista">${novas.map((l) => `<div class="linha" style="cursor:default"><span class="ic">${ico('loja')}</span><span class="txt"><b>${t(l.nome)}</b><small>${t(l.end || 'endereço não informado no mapa')}${l.tipo ? ` · ${t(l.tipo)}` : ''}</small></span><button type="button" class="bt leve p" data-acao="salvar-loja" data-osm="${t(l.osm)}">Salvar</button></div>`).join('')}</div>` : ''}
    <h2 class="sec">Minhas lojas <span class="mudo num" style="font-size:13px">${salvas.length}</span></h2>
    <div class="lista">${salvas.map((l) => { const n = db.precos.filter((p) => p.loja === l.id).length; return `<div class="linha" style="cursor:default"><span class="ic">${ico('loja')}</span><span class="txt"><b>${t(l.nome)} ${tag(l)}</b><small>${t(l.end || '')}${n ? ` · ${n} preços registrados` : ''}</small></span>${l.tel ? `<a class="bt zap p" target="_blank" rel="noopener" href="${zap(l.tel, 'Bom dia! Vocês têm em estoque')}" aria-label="WhatsApp da loja">${ico('zap')}</a>` : ''}</div>`; }).join('')}</div>
    <div class="acoes"><button type="button" class="bt cheio" data-acao="nova-loja">${ico('mais')}Adicionar loja à mão</button><a class="bt" href="#precos">${ico('moeda')}Comparar preços</a></div>
    <p class="mudo" style="font-size:12px;margin-top:14px">Dados do mapa © colaboradores do OpenStreetMap (licença ODbL). O Atria não mostra preços das lojas do mapa: só os que você registra${db.precos.some((p) => p.exemplo) ? '; as 3 lojas com o selo “exemplo” e os preços delas são de demonstração' : ''}.</p>`;
};
TELAS.lojas.montar = (tela) => {
  $('[data-busca-cidade]', tela).onsubmit = (e) => { e.preventDefault(); buscarLojas(e.target.cidade.value.trim()); };
  if (!osm.cidade && !osm.buscando && navigator.onLine && !TELAS.lojas.tentou) { TELAS.lojas.tentou = true; buscarLojas(db.perfil.cidade); }
  if (navigator.onLine) mostrarMapa(0);
};
async function mostrarMapa(tentativa) {
  try {
    const L = await carregaLeaflet(), caixa = $('#mapa'); if (!caixa || !document.contains(caixa) || caixa._leaflet_id) return;
    caixa.innerHTML = '';
    const pontos = [...db.lojas, ...osm.lojas].filter((l) => l.lat && l.lon);
    const centro = osm.centro || (pontos[0] ? [pontos[0].lat, pontos[0].lon] : [-20.72, -47.886]);
    const m = L.map(caixa, { zoomControl: false, attributionControl: true }).setView(centro, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(m);
    const ic = (cor) => L.divIcon({ className: '', html: `<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${cor};border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.35)"></span>`, iconSize: [22, 22], iconAnchor: [11, 22] });
    const salvasOsm = new Set(db.lojas.map((l) => l.osm));
    pontos.forEach((l) => L.marker([l.lat, l.lon], { icon: ic(db.lojas.includes(l) ? '#A4461F' : salvasOsm.has(l.osm) ? '#A4461F' : '#2D5D7B') }).addTo(m).bindPopup(`<b>${t(l.nome)}</b>${l.end ? `<br>${t(l.end)}` : ''}`));
    if (pontos.length > 1) m.fitBounds(pontos.map((l) => [l.lat, l.lon]), { padding: [24, 24], maxZoom: 15 });
  } catch { if (window.L && tentativa < 2) { setTimeout(() => mostrarMapa(tentativa + 1), 400); return; } const caixa = $('#mapa'); if (caixa && !caixa._leaflet_id) caixa.innerHTML = '<div class="vazio">O mapa não carregou. A lista abaixo continua valendo.</div>'; }
}
async function buscarLojas(cidade) {
  if (!cidade) return;
  osm = { ...osm, cidade, buscando: true, erro: '' }; repinta();
  try {
    const g = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&city=${encodeURIComponent(cidade)}`, { headers: { Accept: 'application/json' } }).then((r) => r.json());
    if (!g.length) throw new Error('Cidade não encontrada no mapa. Confira o nome.');
    const lat = +g[0].lat, lon = +g[0].lon;
    const q = `[out:json][timeout:25];(nwr["shop"~"^(hardware|doityourself|timber|trade|paint)$"](around:9000,${lat},${lon}););out center 80;`;
    // servidor principal do Overpass e um espelho público, se o principal estiver ocupado
    let r = null;
    for (const srv of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
      try { r = await fetch(srv, { method: 'POST', body: `data=${encodeURIComponent(q)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); if (r.ok) break; } catch { r = null; }
    }
    if (!r || !r.ok) throw new Error('O serviço do mapa está ocupado. Tente de novo em um minuto.');
    const j = await r.json();
    const TIPO = { hardware: 'ferragens', doityourself: 'materiais de construção', timber: 'madeireira', trade: 'depósito', paint: 'tintas' };
    const lojas = (j.elements || []).filter((e) => e.tags && e.tags.name).map((e) => ({
      osm: `${e.type}/${e.id}`, nome: e.tags.name, tipo: TIPO[e.tags.shop] || '', lat: e.lat ?? (e.center && e.center.lat), lon: e.lon ?? (e.center && e.center.lon),
      end: [e.tags['addr:street'], e.tags['addr:housenumber']].filter(Boolean).join(', ') + (e.tags['addr:suburb'] ? ` · ${e.tags['addr:suburb']}` : ''), tel: e.tags.phone || e.tags['contact:phone'] || e.tags['contact:whatsapp'] || '',
    }));
    osm = { cidade, lojas, centro: [lat, lon], buscando: false, erro: lojas.length ? '' : 'Nenhuma loja dessa cidade está no OpenStreetMap ainda. Adicione as suas à mão.' };
  } catch (e) { osm = { ...osm, buscando: false, erro: e.message && !/fetch|network/i.test(e.message) ? e.message : 'Sem conexão com o mapa agora.' }; }
  repinta();
}
ACOES['salvar-loja'] = (b) => { const l = osm.lojas.find((x) => x.osm === b.dataset.osm); if (!l) return; db.lojas.push({ id: uid('l'), ...l }); grava(); repinta(); toast(`${l.nome} está nas suas lojas`); };
ACOES['nova-loja'] = () => formulario({ titulo: 'Nova loja', campos: [{ n: 'nome', r: 'Nome da loja', obrig: true }, { n: 'tel', r: 'WhatsApp ou telefone', tipo: 'tel' }, { n: 'end', r: 'Endereço' }],
  salvar: (v) => { db.lojas.push({ id: uid('l'), manual: true, ...v }); grava(); repinta(); } });

// ------------------------------------------------------------------ comparador de preços
let buscaPreco = '';
TELAS.precos = () => {
  const mats = [...new Set(db.precos.map((p) => p.mat))].filter((m) => !buscaPreco || sa(m).includes(sa(buscaPreco))).sort();
  // cesta: soma dos materiais que todas as lojas têm
  const lojasCom = db.lojas.filter((l) => db.precos.some((p) => p.loja === l.id));
  const comuns = [...new Set(db.precos.map((p) => p.mat))].filter((m) => lojasCom.every((l) => precosDe(m).some((p) => p.loja === l.id)));
  const cesta = lojasCom.map((l) => ({ l, v: comuns.reduce((s, m) => s + precosDe(m).find((p) => p.loja === l.id).preco, 0) })).sort((a, b) => a.v - b.v);
  return `${cab('Preços', 'Onde cada material está mais barato', { dica: 'Registre o preço de cada nota ou orçamento que receber. O Atria marca o mais barato em verde e avisa preço fora do normal em vermelho.' })}
    ${db.precos.some((p) => p.exemplo) ? '<p class="explica"><b>Demonstração:</b> lojas e preços de exemplo. No app de verdade, os preços são os que você registra.</p>' : ''}
    ${cesta.length > 1 ? `<div class="cartao"><b>Cesta de ${comuns.length} materiais</b><small class="mudo" style="display:block;margin-bottom:6px">mesmos itens, somados em cada loja</small>${cesta.map((x, i) => `<div class="preco-linha ${i === 0 ? 'melhor' : ''}"><span>${i === 0 ? '★ ' : ''}${t(x.l.nome)}</span><b>${din(x.v)}</b><span class="barra-preco"><i style="width:${Math.round(x.v / cesta[cesta.length - 1].v * 100)}%"></i></span></div>`).join('')}</div>` : ''}
    <label class="busca" style="margin-top:12px">${ico('lupa')}<input type="search" data-busca-preco value="${t(buscaPreco)}" placeholder="Buscar material" aria-label="Buscar material"></label>
    <div class="lista">${mats.map((m) => { const ps = precosDe(m), med = mediana(ps.map((p) => p.preco)), max = Math.max(...ps.map((p) => p.preco)); return `<div class="cartao"><b style="font-size:14.5px">${t(m)}</b>${ps.map((p, i) => { const alto = ps.length > 2 && p.preco > med * 1.3; return `<div class="preco-linha ${i === 0 && ps.length > 1 ? 'melhor' : ''} ${alto ? 'alto' : ''}"><span>${t(nomeLoja(p.loja))}</span><b>${din(p.preco)}</b><span class="barra-preco"><i style="width:${Math.round(p.preco / max * 100)}%"></i></span><small>${dataBR(p.data)} · ${t(p.fonte)}${alto ? ' · ⚠ preço fora do normal' : ''}${p.exemplo ? ' · exemplo' : ''}</small></div>`; }).join('')}${ps.length > 1 ? `<small class="mudo" style="font-size:12px">Diferença de ${din(max - ps[0].preco)} (${Math.round((max / ps[0].preco - 1) * 100)}%) entre a mais cara e a mais barata.</small>` : ''}</div>`; }).join('') || '<div class="vazio"><b>Nenhum preço ainda</b>Registre o primeiro.</div>'}</div>
    <button type="button" class="bt cheio largo" style="margin-top:14px" data-acao="novo-preco">${ico('mais')}Registrar preço</button>`;
};
TELAS.precos.montar = (tela) => { const i = $('[data-busca-preco]', tela); i.oninput = () => { buscaPreco = i.value; const p = i.selectionStart; repinta(); const n = $('[data-busca-preco]'); n.focus(); n.setSelectionRange(p, p); }; };
ACOES['novo-preco'] = () => formulario({ titulo: 'Registrar preço', rotulo: 'Registrar',
  campos: [{ n: 'mat', r: 'Material', obrig: true, lista: [...new Set(db.precos.map((p) => p.mat))] }, { n: 'loja', r: 'Loja', obrig: true, lista: db.lojas.map((l) => l.nome) },
    { n: 'preco', r: 'Preço por unidade', tipo: 'din', meio: true, obrig: true }, { n: 'un', r: 'Unidade', meio: true, valor: 'un', lista: UNS }, { n: 'fonte', r: 'De onde veio', valor: 'nota', lista: ['nota', 'orçamento', 'balcão', 'site da loja'] }],
  salvar: (v) => {
    if (!v.preco) return 'Escreva o preço.';
    let l = db.lojas.find((x) => sa(x.nome) === sa(v.loja)); if (!l) { l = { id: uid('l'), nome: v.loja, manual: true }; db.lojas.push(l); }
    const ps = precosDe(v.mat), med = ps.length ? mediana(ps.map((p) => p.preco)) : 0;
    db.precos.push({ id: uid('pr'), mat: v.mat, un: v.un, loja: l.id, preco: v.preco, data: hoje(), fonte: v.fonte || 'nota' }); grava(); repinta();
    if (med && v.preco > med * 1.3) toast(`Atenção: ${Math.round((v.preco / med - 1) * 100)}% acima do normal para esse material`, 'erro');
    else if (ps.length && v.preco < ps[0].preco) toast('Esse é o preço mais baixo registrado');
  } });

// ------------------------------------------------------------------ financeiro
let periodoFin = 'semana';
export function somaPeriodo(de, ate) {
  let e = 0, s = 0;
  db.fin.forEach((f) => { if (f.pago && f.data >= de && f.data <= ate) { if (f.tipo === 'e') e += f.valor; else s += f.valor; } });
  return { e, s, l: e - s };
}
export function intervalo(p, ref = hoje()) {
  if (p === 'dia') return [ref, ref];
  if (p === 'semana') { const d = new Date(`${ref}T12:00`), w = (d.getDay() + 6) % 7; const ini = somaDias(ref, -w); return [ini, somaDias(ini, 6)]; }
  return [`${ref.slice(0, 7)}-01`, somaDias(`${ref.slice(0, 7)}-01`, new Date(+ref.slice(0, 4), +ref.slice(5, 7), 0).getDate() - 1)];
}
function serie(p) {
  const out = [], H = hoje();
  if (p === 'dia') for (let i = 6; i >= 0; i--) { const d = somaDias(H, -i); out.push({ rot: i === 0 ? 'hoje' : new Date(`${d}T12:00`).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), ...somaPeriodo(d, d), atual: i === 0 }); }
  else if (p === 'semana') for (let i = 7; i >= 0; i--) { const [a, b] = intervalo('semana', somaDias(H, -7 * i)); out.push({ rot: i === 0 ? 'esta' : `${a.slice(8)}/${a.slice(5, 7)}`, ...somaPeriodo(a, b), atual: i === 0 }); }
  else for (let i = 5; i >= 0; i--) { const d = new Date(+H.slice(0, 4), +H.slice(5, 7) - 1 - i, 15), iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-15`; const [a, b] = intervalo('mes', iso); out.push({ rot: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), ...somaPeriodo(a, b), atual: i === 0 }); }
  return out;
}
export function grafico(p) {
  const s = serie(p), max = Math.max(1, ...s.map((x) => Math.max(x.e, x.s)));
  return `<div class="grafico" role="img" aria-label="Entradas e saídas por ${p}">${s.map((x, i) => `<div class="col ${x.atual ? 'hoje' : ''}"><div class="barras"><i class="e" style="height:${Math.round(x.e / max * 100)}%;animation-delay:${i * 40}ms" title="Entradas ${din(x.e)}"></i><i class="s" style="height:${Math.round(x.s / max * 100)}%;animation-delay:${i * 40 + 20}ms" title="Saídas ${din(x.s)}"></i></div><small>${x.rot}</small></div>`).join('')}</div>
    <div class="legenda"><span style="--c:var(--musgo)">Entrou</span><span style="--c:#C2A37A">Saiu</span></div>`;
}
export function trena(meta) {
  const [a, b] = intervalo('mes'), l = somaPeriodo(a, b).l, pct = meta ? Math.max(0, Math.min(100, l / meta * 100)) : 0, faltam = Math.max(0, meta - l), diasRest = dias(hoje(), b) + 1;
  return `<div class="trena"><div class="trena-fita" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-label="Meta do mês"><i data-largura="${pct}"></i></div>
    <div class="trena-txt"><span>Lucro do mês <b>${din(l)}</b> de ${din(meta)}</span><span>${faltam ? `faltam <b>${dinCurto(faltam)}</b> · ${diasRest} dias` : '<b>meta batida!</b>'}</span></div></div>`;
}
TELAS.financeiro = () => {
  const [a, b] = intervalo(periodoFin), s = somaPeriodo(a, b), rec = aReceber(), pag = db.fin.filter((f) => f.tipo === 's' && !f.pago).sort((x, y) => x.data.localeCompare(y.data));
  const recFin = db.fin.filter((f) => f.tipo === 'e' && !f.pago);
  const custoMat = db.obras.map((o) => ({ o, v: totais(o).mat })).filter((x) => x.v).sort((x, y) => y.v - x.v).slice(0, 5), maxMat = Math.max(1, ...custoMat.map((x) => x.v));
  const lanc = db.fin.filter((f) => f.data >= a && f.data <= b).sort((x, y) => y.data.localeCompare(x.data)).slice(0, 30);
  const nomeP = { dia: 'hoje', semana: 'nesta semana', mes: 'neste mês' }[periodoFin];
  return `${cab('Dinheiro', 'Lucro, a receber e a pagar', { dica: 'Lucro = o que entrou menos o que saiu. Marque o que recebeu e o que pagou: o resto o Atria soma sozinho.' })}
    <div class="seg" role="group" aria-label="Período" data-seg>${[['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']].map(([k, r]) => `<button type="button" data-acao="periodo-fin" data-p="${k}" aria-pressed="${periodoFin === k}">${r}</button>`).join('')}<i></i></div>
    <div class="cartao" style="margin-top:12px"><small class="mudo">Lucro ${nomeP}</small><div class="num" style="font-size:34px;font-weight:600;letter-spacing:-.04em;color:${s.l < 0 ? 'var(--brasa)' : 'var(--grafite)'}" data-conta="${s.l}">${din(s.l)}</div>
      <div class="dois-num" style="margin-top:6px"><div><small>Entrou</small><b style="color:var(--musgo)">${din(s.e)}</b></div><div><small>Saiu</small><b style="color:var(--cedro)">${din(s.s)}</b></div></div>
      ${grafico(periodoFin)}</div>
    <h2 class="sec">Meta do mês <button type="button" class="bt leve p" data-acao="meta">Mudar</button></h2>${trena(db.perfil.meta)}
    ${ganchos.mei ? ganchos.mei() : ''}
    <h2 class="sec">A receber <span class="num mudo" style="font-size:13px">${din(rec.reduce((x, y) => x + y.v, 0) + recFin.reduce((x, y) => x + y.valor, 0))}</span></h2>
    <div class="lista">${rec.map(({ o, v }) => { const atras = o.venceSaldo && o.venceSaldo < hoje(); return `<a class="linha" href="#obra/${o.id}"><span class="ic" style="${atras ? 'background:var(--brasa-claro);color:var(--brasa)' : ''}">${ico(atras ? 'alerta' : 'moeda')}</span><span class="txt"><b>${t(cliente(o.cliente).nome)}</b><small>${t(o.titulo)}${atras ? ` · venceu há ${dias(o.venceSaldo)} dias` : ''}</small></span><span class="dir"><b>${din(v)}</b></span></a>`; }).join('')}${recFin.map((f) => `<div class="linha" data-acao="editar-fin" data-id="${f.id}"><span class="ic">${ico('moeda')}</span><span class="txt"><b>${t(f.desc)}</b><small>${quando(f.data)}</small></span><span class="dir"><b>${din(f.valor)}</b></span></div>`).join('') || (rec.length ? '' : '<p class="mudo">Ninguém te deve. 👏</p>')}</div>
    <h2 class="sec">A pagar</h2>
    <div class="lista">${pag.map((f) => `<div class="linha" data-acao="editar-fin" data-id="${f.id}"><span class="ic">${ico('calendario')}</span><span class="txt"><b>${t(f.desc)}</b><small>vence ${quando(f.data)} · ${dataBR(f.data)}</small></span><span class="dir"><b>${din(f.valor)}</b><button type="button" class="bt leve p" data-acao="pagar" data-id="${f.id}" style="margin-top:4px">Paguei</button></span></div>`).join('') || '<p class="mudo">Nada para pagar.</p>'}</div>
    <h2 class="sec">Material por obra</h2>
    <div class="cartao">${custoMat.map(({ o, v }) => `<div class="preco-linha"><span>${t(o.titulo)}</span><b>${din(v)}</b><span class="barra-preco"><i style="width:${Math.round(v / maxMat * 100)}%;background:var(--cedro)"></i></span></div>`).join('') || '<p class="mudo">Sem materiais lançados.</p>'}</div>
    <h2 class="sec">Lançamentos ${nomeP}</h2>
    <div class="lista">${lanc.map((f) => `<div class="linha" data-acao="editar-fin" data-id="${f.id}"><span class="ic" style="background:${f.tipo === 'e' ? 'var(--musgo-claro);color:var(--musgo)' : 'var(--cedro-claro);color:var(--cedro-esc)'}">${ico(f.tipo === 'e' ? 'moeda' : 'sacola')}</span><span class="txt"><b>${t(f.desc)}</b><small>${dataBR(f.data)} · ${t(f.cat || '')}${f.pago ? '' : ' · pendente'}</small></span><span class="dir"><b style="color:${f.tipo === 'e' ? 'var(--musgo)' : 'var(--cedro)'}">${f.tipo === 'e' ? '+' : '−'}${din(f.valor)}</b></span></div>`).join('') || '<p class="mudo">Nenhum lançamento.</p>'}</div>
    <div class="acoes"><button type="button" class="bt cheio" data-acao="lancar" data-t="e">${ico('mais')}Entrada</button><button type="button" class="bt" data-acao="lancar" data-t="s">${ico('mais')}Saída</button></div>`;
};
ACOES['periodo-fin'] = (b) => { periodoFin = b.dataset.p; repinta(); };
ACOES.meta = () => formulario({ titulo: 'Meta de lucro do mês', campos: [{ n: 'meta', r: 'Quanto quer lucrar por mês', tipo: 'din', valor: db.perfil.meta }], salvar: (v) => { db.perfil.meta = v.meta; grava(); repinta(); } });
ACOES.pagar = (b, e) => { e.stopPropagation(); const f = achar('fin', b.dataset.id); f.pago = true; f.data = hoje(); grava(); repinta(); toast('Marcado como pago'); };
export function lancar(tipo, f) {
  formulario({ titulo: f ? 'Editar lançamento' : tipo === 'e' ? 'Entrada de dinheiro' : 'Saída de dinheiro', rotulo: f ? 'Salvar' : 'Lançar',
    campos: [{ n: 'valor', r: 'Valor', tipo: 'din', obrig: true, valor: f ? f.valor : '' }, { n: 'desc', r: 'Descrição', obrig: true, valor: f ? f.desc : '', lista: tipo === 'e' ? ['Diária', 'Serviço', 'Entrada de obra', 'Parcela'] : ['Material', 'Combustível', 'Ferramenta', 'Ajudante', 'Alimentação'] },
      { n: 'cat', r: 'Categoria', meio: true, valor: f ? f.cat : tipo === 'e' ? 'Serviço' : 'Material', lista: ['Serviço', 'Material', 'Transporte', 'Ferramenta', 'Ajudante', 'Alimentação', 'Contas'] }, { n: 'data', r: 'Dia', tipo: 'data', meio: true, valor: f ? f.data : hoje() },
      { n: 'pago', r: 'Situação', tipo: 'sel', valor: f ? (f.pago ? '1' : '0') : '1', ops: [['1', tipo === 'e' ? 'Já recebi' : 'Já paguei'], ['0', tipo === 'e' ? 'Vou receber' : 'Vou pagar']] },
      { n: 'obra', r: 'Obra (opcional)', tipo: 'sel', valor: f ? f.obra || '' : '', ops: [['', 'Nenhuma'], ...db.obras.map((o) => [o.id, o.titulo])] }],
    extraPe: f ? `<button type="button" class="bt leve p" data-tirar style="color:var(--brasa)" aria-label="Apagar">${ico('lixo')}</button>` : '',
    depois: (fo, api) => { const x = fo.querySelector('[data-tirar]'); if (x) x.onclick = () => { db.fin = db.fin.filter((y) => y !== f); grava(); api.fechar(); repinta(); toast('Lançamento apagado'); }; },
    salvar: (v) => { const d = { ...v, pago: v.pago === '1', tipo }; if (f) Object.assign(f, d); else db.fin.push({ id: uid('f'), ...d }); grava(); repinta(); toast(tipo === 'e' ? 'Entrada lançada' : 'Saída lançada'); } });
}
ACOES.lancar = (b) => lancar(b.dataset.t);
ACOES['editar-fin'] = (el) => { const f = achar('fin', el.dataset.id); lancar(f.tipo, f); };

// ------------------------------------------------------------------ ferramentas
// ferramentas: as do seu ofício primeiro (★), depois as de todo mundo
const FERRAMENTAS = {
  corte: ['#corte', 'chapa', 'Plano de corte', 'Encaixa as peças nas chapas de MDF e mostra o aproveitamento'],
  traco: ['#calc/traco', 'carrinho', 'Traço de concreto', 'Sacos de cimento, areia e brita por m³'],
  blocos: ['#calc/blocos', 'tijolo', 'Blocos e tijolos', 'Quantos por m², com perda e argamassa'],
  piso: ['#calc/piso', 'piso', 'Piso e rejunte', 'm² com perda, argamassa colante e rejunte'],
  tinta: ['#calc/tinta', 'rolo', 'Tinta', 'Latas e galões pela área e demãos'],
  eletrica: ['#modelo', 'raio', 'Pontos elétricos', 'Tomadas e luzes viram lista de fio e disjuntor'],
};
TELAS.ferramentas = () => {
  const minhas = juntar(db.perfil, 'ferr').filter((k) => FERRAMENTAS[k]), outras = Object.keys(FERRAMENTAS).filter((k) => !minhas.includes(k));
  const bloco = (k, meu) => { const [h, ic, n, d] = FERRAMENTAS[k]; return `<a class="bloco ${meu ? 'escuro' : ''}" href="${h}"><span class="ic">${ico(ic)}</span><span><b>${meu ? '★ ' : ''}${n}</b><small>${d}</small></span></a>`; };
  return `${cab('Bancada', `Ferramentas para ${t(nomeOficios(db.perfil).toLowerCase())}`, { dica: 'As marcadas com ★ são do seu ofício. Mude os ofícios no seu perfil e esta tela muda junto.' })}
  <div class="mosaico">
    ${minhas.map((k) => bloco(k, true)).join('')}
    <a class="bloco" href="#modelo"><span class="ic">${ico('lista')}</span><span><b>Lista por modelo</b><small>Medidas viram lista de material (${juntar(db.perfil, 'modelos').map((m) => MODELOS[m].nome.toLowerCase()).slice(0, 2).join(', ') || 'vários serviços'}…)</small></span></a>
    <button type="button" class="bloco" data-acao="mensagens"><span class="ic">${ico('zap')}</span><span><b>Mensagens</b><small>Prontas para cada momento da obra</small></span></button>
    <button type="button" class="bloco" data-acao="pix"><span class="ic">${ico('pix')}</span><span><b>Cobrar no Pix</b><small>QR e copia e cola com a sua chave</small></span></button>
    <a class="bloco" href="#precos"><span class="ic">${ico('moeda')}</span><span><b>Preços</b><small>Onde cada material está mais barato</small></span></a>
    <a class="bloco" href="#medidas"><span class="ic">${ico('regua')}</span><span><b>Medidas</b><small>Polegada, m², m³ de madeira</small></span></a>
    ${outras.map((k) => bloco(k, false)).join('')}
  </div>`;
};

// calculadoras da obra (pedreiro, azulejista, pintor)
const CALC = {
  traco: { titulo: 'Traço de concreto', v: { vol: 1, tr: '1:2:3' }, campos: [['vol', 'Volume (m³)'], ['tr', 'Traço (cimento:areia:brita)']], lista: { tr: ['1:2:3', '1:2,5:3', '1:3:4', '1:4'] },
    res(v) { const r = traco(v.vol, String(v.tr)); return `<div class="dois-num"><div class="cartao"><small>Cimento</small><b>${r.cimento} sacos</b></div><div class="cartao"><small>Areia</small><b>${numBR(r.areia, 1)} m³</b></div>${r.brita ? `<div class="cartao"><small>Brita</small><b>${numBR(r.brita, 1)} m³</b></div>` : ''}<div class="cartao"><small>Água (aprox.)</small><b>${r.agua} L</b></div></div><p class="mudo" style="font-size:12.5px">1:2:3 ≈ 20 a 25 MPa (laje, viga); 1:3:4 para piso e calçada; 1:4 sem brita para contrapiso. Estimativa: confira com o engenheiro em obra estrutural.</p>`; },
    mats(v) { const r = traco(v.vol, String(v.tr)); return [['Cimento CP-II 50 kg', r.cimento, 'saco'], ['Areia média (m³)', r.areia, 'm³'], ...(r.brita ? [['Brita 1 (m³)', r.brita, 'm³']] : [])]; } },
  blocos: { titulo: 'Blocos e tijolos', v: { comp: 10, alt: 2.8, vaos: 1.7, tipo: 'bloco14', perda: 5 }, campos: [['comp', 'Comprimento da parede (m)'], ['alt', 'Altura (m)'], ['vaos', 'Tirar portas e janelas (m²)'], ['perda', 'Perda (%)']],
    sel: { tipo: ['Tipo', TIPOS_BLOCO] },
    res(v) { const area = Math.max(0, v.comp * v.alt - v.vaos), b = blocos(area, v.tipo, v.perda); return `<div class="dois-num"><div class="cartao"><small>Área</small><b>${numBR(area)} m²</b></div><div class="cartao"><small>${t(b.nome)}</small><b>${b.qtd} un</b></div></div><p class="mudo" style="font-size:12.5px">${b.porM2} por m² + ${v.perda}% de quebra. A argamassa entra na lista pelo modelo “Parede de bloco”.</p>`; },
    mats(v) { const area = Math.max(0, v.comp * v.alt - v.vaos), b = blocos(area, v.tipo, v.perda); return [[b.nome.replace(' (deitado)', ''), b.qtd, 'un']]; } },
  piso: { titulo: 'Piso e rejunte', v: { area: 20, lado: 60, junta: 2, esp: 8, diag: 0 }, campos: [['area', 'Área (m²)'], ['lado', 'Lado da peça (cm)'], ['junta', 'Junta (mm)'], ['esp', 'Espessura da peça (mm)']],
    sel: { diag: ['Assentamento', { 0: 'Reto (10% de perda)', 1: 'Diagonal (15% de perda)' }] },
    res(v) { const p = piso(v.area, v.lado, v.junta, v.esp, +v.diag === 1); return `<div class="dois-num"><div class="cartao"><small>Piso com perda</small><b>${numBR(p.m2, 1)} m²</b></div><div class="cartao"><small>Argamassa ${v.lado >= 60 ? 'AC-III' : 'AC-II'}</small><b>${p.argamassa} sacos</b></div><div class="cartao"><small>Rejunte</small><b>${numBR(p.kgRejunte, 1)} kg</b></div><div class="cartao"><small>Sacos de 5 kg</small><b>${p.rejunte}</b></div></div><p class="mudo" style="font-size:12.5px">Peça de ${v.lado} cm ou mais: dupla colagem (≈7 kg/m²). Rejunte pela fórmula dos fabricantes.</p>`; },
    mats(v) { const p = piso(v.area, v.lado, v.junta, v.esp, +v.diag === 1); return [[v.lado >= 60 ? 'Porcelanato 60x60 (m²)' : 'Piso cerâmico 45x45 (m²)', p.m2, 'm²'], [v.lado >= 60 ? 'Argamassa AC-III 20 kg' : 'Argamassa AC-II 20 kg', p.argamassa, 'saco'], ['Rejunte 5 kg', p.rejunte, 'saco']]; } },
  tinta: { titulo: 'Tinta', v: { area: 120, demaos: 2, rend: 10 }, campos: [['area', 'Área (m²)'], ['demaos', 'Demãos'], ['rend', 'Rendimento (m² por litro por demão)']],
    res(v) { const r = latasTinta(v.area, v.demaos, v.rend || 10); return `<div class="dois-num"><div class="cartao"><small>Litros</small><b>${numBR(r.litros, 1)} L</b></div><div class="cartao"><small>Comprar</small><b>${r.latas18 ? `${r.latas18}× 18 L` : ''}${r.latas18 && r.galoes ? ' + ' : ''}${r.galoes ? `${r.galoes}× 3,6 L` : ''}</b></div></div><p class="mudo" style="font-size:12.5px">Confira o rendimento no rótulo: parede porosa ou sem selador gasta mais.</p>`; },
    mats(v) { const r = latasTinta(v.area, v.demaos, v.rend || 10); return [...(r.latas18 ? [['Tinta acrílica fosca 18 L', r.latas18, 'lata']] : []), ...(r.galoes ? [['Tinta acrílica fosca 3,6 L', r.galoes, 'galão']] : [])]; } },
};
TELAS.calc = (k) => {
  const c = CALC[k] || CALC.traco;
  return `${cab(c.titulo, 'Calculadora da obra', { dica: 'Mude os números e o resultado muda na hora. Depois mande para a lista de materiais de uma obra.' })}
    <div class="cartao"><div class="duas">${c.campos.map(([n, r]) => `<label class="campo"><span>${r}</span><input data-calc="${n}" ${c.lista && c.lista[n] ? `list="cl-${n}"` : 'inputmode="decimal"'} value="${t(String(c.v[n]).replace('.', ','))}">${c.lista && c.lista[n] ? `<datalist id="cl-${n}">${c.lista[n].map((x) => `<option value="${x}">`).join('')}</datalist>` : ''}</label>`).join('')}
    ${Object.entries(c.sel || {}).map(([n, [r, ops]]) => `<label class="campo"><span>${r}</span><select data-calc="${n}">${Object.entries(ops).map(([kk, rr]) => `<option value="${kk}" ${String(c.v[n]) === kk ? 'selected' : ''}>${t(rr)}</option>`).join('')}</select></label>`).join('')}</div></div>
    <div style="margin-top:12px">${c.res(c.v)}</div>
    <button type="button" class="bt cheio largo" data-acao="calc-lista" data-k="${k}">${ico('lista')}Pôr na lista de uma obra</button>`;
};
TELAS.calc.montar = (tela, k) => { const c = CALC[k] || CALC.traco; $$('[data-calc]', tela).forEach((i) => i.addEventListener('change', () => { const n = i.dataset.calc; c.v[n] = i.tagName === 'SELECT' || n === 'tr' ? i.value : lerNum(i.value); repinta(); })); };
ACOES['calc-lista'] = (b) => {
  const itens = (CALC[b.dataset.k] || CALC.traco).mats((CALC[b.dataset.k] || CALC.traco).v);
  folha({ titulo: 'Em qual obra?', corpo: `<div class="lista">${obrasAtivas().map((o) => `<button type="button" class="linha" data-ob="${o.id}"><span class="ic">${ico('casa')}</span><span class="txt"><b>${t(o.titulo)}</b><small>${t(cliente(o.cliente).nome)}</small></span></button>`).join('')}</div>`,
    aoAbrir: (f, api) => $$('[data-ob]', f).forEach((x) => { x.onclick = () => { const o = achar('obras', x.dataset.ob); itens.forEach(([nome, q, un]) => { const bp = melhorPreco(nome); o.mats.push({ id: uid('m'), nome, qtd: q, un, preco: bp ? bp.preco : 0, loja: bp ? bp.loja : '', comprado: false }); }); grava(); api.fechar(true); toast(`${itens.length} itens na lista`); ir(`materiais/${o.id}`); }; }) });
};

const CHAPAS = { mdf: ['MDF 2750 × 1840', 2750, 1840], mdf2: ['MDF 2750 × 1830', 2750, 1830], comp: ['Compensado 2200 × 1600', 2200, 1600], osb: ['OSB 2440 × 1220', 2440, 1220] };
TELAS.corte = () => {
  if (!db.corte) { db.corte = { chapa: 'mdf', serra: 3, gira: true, pecas: [{ nome: 'Lateral', l: 2400, a: 580, q: 2 }, { nome: 'Base e teto', l: 1170, a: 580, q: 2 }, { nome: 'Prateleira', l: 1140, a: 560, q: 4 }, { nome: 'Porta', l: 2380, a: 595, q: 2 }, { nome: 'Frente de gaveta', l: 560, a: 180, q: 4 }] }; }
  const c = db.corte, [nomeC, L, A] = CHAPAS[c.chapa], r = planoDeCorte({ l: L, a: A }, c.pecas.filter((p) => p.l > 0 && p.a > 0), { serra: c.serra, gira: c.gira });
  const cores = ['#C2A37A', '#8FA2B1', '#A9BFAE', '#D8C6A3', '#B9A3A0', '#A7A9C2', '#B7C4BA', '#CDB48E'];
  const desenho = (ch) => `<svg viewBox="-20 -20 ${L + 40} ${A + 40}" role="img" aria-label="Chapa com ${ch.pecas.length} peças"><rect x="0" y="0" width="${L}" height="${A}" fill="#F4EFE8" stroke="#2E333B" stroke-width="6"/>
    ${ch.pecas.map((p) => `<g><rect x="${p.x + r.refilo}" y="${p.y + r.refilo}" width="${p.l}" height="${p.a}" fill="${cores[p.cor % cores.length]}" stroke="#2E333B" stroke-width="4"/>${p.l > 260 && p.a > 110 ? `<text x="${p.x + r.refilo + p.l / 2}" y="${p.y + r.refilo + p.a / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.min(70, p.a / 3.2)}" font-family="Rethink Sans, sans-serif" font-weight="600" fill="#2E333B">${t(p.nome)} ${p.girada ? '↻' : ''}</text><text x="${p.x + r.refilo + p.l / 2}" y="${p.y + r.refilo + p.a / 2 + Math.min(70, p.a / 3.2)}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.min(52, p.a / 4)}" font-family="Azeret Mono, monospace" fill="#2E333B">${p.l}×${p.a}</text>` : ''}</g>`).join('')}</svg>`;
  return `${cab('Plano de corte', 'Encaixe das peças nas chapas', { dica: 'Escreva as peças em milímetros. O Atria desconta a espessura da serra e 1 cm de refilo em cada borda. ↻ = peça girada.' })}
    <div class="cartao"><div class="duas"><label class="campo"><span>Chapa</span><select data-corte="chapa">${Object.entries(CHAPAS).map(([k, [n]]) => `<option value="${k}" ${k === c.chapa ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label class="campo"><span>Serra (mm)</span><input data-corte="serra" inputmode="decimal" value="${c.serra}"></label></div>
      <label style="display:flex;gap:10px;align-items:center;font-weight:600;font-size:14px;margin-bottom:10px"><input type="checkbox" data-corte-gira ${c.gira ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--cedro)">Pode girar as peças (chapa sem veio)</label>
      <div class="peca-rot"><span>Peça</span><span>Larg.</span><span>Alt.</span><span>Qtd</span><span></span></div>
      ${c.pecas.map((p, i) => `<div class="peca-linha"><input value="${t(p.nome)}" data-p="${i}" data-k="nome" aria-label="Nome da peça"><input class="n" inputmode="numeric" value="${p.l}" data-p="${i}" data-k="l" aria-label="Largura em mm"><input class="n" inputmode="numeric" value="${p.a}" data-p="${i}" data-k="a" aria-label="Altura em mm"><input class="n" inputmode="numeric" value="${p.q}" data-p="${i}" data-k="q" aria-label="Quantidade"><button type="button" data-acao="tirar-peca" data-i="${i}" aria-label="Tirar peça">${ico('x')}</button></div>`).join('')}
      <button type="button" class="bt leve p" data-acao="nova-peca">${ico('mais')}Peça</button></div>
    <div class="dois-num" style="margin-top:12px"><div class="cartao"><small>Chapas</small><b class="resultado">${r.chapas.length}</b></div><div class="cartao"><small>Aproveitamento</small><b class="resultado" style="color:${r.aproveitamento > .75 ? 'var(--musgo)' : 'var(--cedro)'}">${Math.round(r.aproveitamento * 100)}%</b></div></div>
    ${r.grandes.length ? `<p class="explica" style="background:var(--brasa-claro)"><b style="color:var(--brasa)">${r.grandes.length} peça(s) maior(es) que a chapa:</b> ${r.grandes.map((p) => t(p.nome)).join(', ')}.</p>` : ''}
    <div style="margin-top:12px">${r.chapas.map((ch, i) => `<div class="chapa"><header><span>Chapa ${i + 1} · ${ch.pecas.length} peças</span><b>${Math.round(ch.aproveitamento * 100)}%</b></header>${desenho(ch)}</div>`).join('')}</div>
    <button type="button" class="bt cheio largo" data-acao="chapas-lista" data-n="${r.chapas.length}">${ico('lista')}Pôr ${r.chapas.length} chapas na lista de uma obra</button>`;
};
TELAS.corte.montar = (tela) => {
  const c = db.corte;
  $$('[data-p]', tela).forEach((i) => i.addEventListener('change', () => { const p = c.pecas[+i.dataset.p]; p[i.dataset.k] = i.dataset.k === 'nome' ? i.value : Math.max(0, Math.round(lerNum(i.value))); grava(); repinta(); }));
  $$('[data-corte]', tela).forEach((i) => i.addEventListener('change', () => { c[i.dataset.corte] = i.dataset.corte === 'chapa' ? i.value : lerNum(i.value); grava(); repinta(); }));
  $('[data-corte-gira]', tela).onchange = (e) => { c.gira = e.target.checked; grava(); repinta(); };
};
ACOES['nova-peca'] = () => { db.corte.pecas.push({ nome: `Peça ${db.corte.pecas.length + 1}`, l: 500, a: 300, q: 1 }); grava(); repinta(); };
ACOES['tirar-peca'] = (b) => { db.corte.pecas.splice(+b.dataset.i, 1); grava(); repinta(); };
ACOES['chapas-lista'] = (b) => {
  const n = +b.dataset.n, [nomeC] = CHAPAS[db.corte.chapa], mat = db.corte.chapa.startsWith('mdf') ? 'Chapa MDF 15 mm branco 2750x1840' : nomeC;
  folha({ titulo: 'Em qual obra?', corpo: `<div class="lista">${obrasAtivas().map((o) => `<button type="button" class="linha" data-ob="${o.id}"><span class="ic">${ico('casa')}</span><span class="txt"><b>${t(o.titulo)}</b><small>${t(cliente(o.cliente).nome)}</small></span></button>`).join('')}</div>`,
    aoAbrir: (f, api) => $$('[data-ob]', f).forEach((x) => { x.onclick = () => { const o = achar('obras', x.dataset.ob), bp = melhorPreco(mat); o.mats.push({ id: uid('m'), nome: mat, qtd: n, un: 'chapa', preco: bp ? bp.preco : 0, loja: bp ? bp.loja : '', comprado: false }); grava(); api.fechar(true); toast(`${n} chapas na lista`); ir(`materiais/${o.id}`); }; }) });
};

TELAS.medidas = () => {
  const m = TELAS.medidas.v || (TELAS.medidas.v = { pol: '3/4', mm: 18, larg: 3.2, alt: 2.6, vaos: 1.6, esp: 25, lt: 150, comp: 3, qtd: 20, area: 40, demaos: 2 });
  const pol = lerPolegada(m.pol), area = Math.max(0, m.larg * m.alt - m.vaos), m3 = m3Madeira(m.esp, m.lt, m.comp, m.qtd), tinta = latasTinta(m.area, m.demaos);
  const ent = (k, r, v = m[k]) => `<label class="campo"><span>${r}</span><input data-md="${k}" inputmode="decimal" value="${t(String(v).replace('.', ','))}"></label>`;
  return `${cab('Medidas', 'Contas de bancada sem calculadora')}
    <div class="cartao"><b>Polegada ⇄ milímetro</b><div class="conv" style="margin-top:8px">${ent('pol', 'Polegadas (ex.: 1 1/2)')}${ent('mm', 'Milímetros')}</div>
      <p style="margin:0">${Number.isFinite(pol) ? `<span class="num">${t(m.pol)}"</span> = <b class="num">${numBR(pol * 25.4, 1)} mm</b>` : 'Escreva como 3/4 ou 1 1/2'} · <span class="num">${numBR(m.mm, 1)} mm</span> ≈ <b class="num">${mm2polFracao(m.mm)}</b></p></div>
    <div class="cartao"><b>Área de parede, piso ou forro</b><div class="conv" style="margin-top:8px">${ent('larg', 'Largura (m)')}${ent('alt', 'Altura ou comprimento (m)')}</div>${ent('vaos', 'Tirar portas e janelas (m²)')}<p style="margin:0">Área: <b class="num">${numBR(area)} m²</b> · com 10% de perda: <b class="num">${numBR(area * 1.1)} m²</b></p></div>
    <div class="cartao"><b>Madeira em m³</b><div class="conv" style="margin-top:8px">${ent('esp', 'Espessura (mm)')}${ent('lt', 'Largura (mm)')}${ent('comp', 'Comprimento (m)')}${ent('qtd', 'Quantas peças')}</div><p style="margin:0">Volume: <b class="num">${numBR(m3, 3)} m³</b> · metro linear total: <b class="num">${numBR(m.comp * m.qtd)} m</b></p></div>
    <div class="cartao" hidden><b>Tinta ou verniz</b><div class="conv" style="margin-top:8px">${ent('area', 'Área (m²)')}${ent('demaos', 'Demãos')}</div><p style="margin:0">≈ <b class="num">${numBR(tinta.litros, 1)} L</b> (rende 10 m²/L por demão): ${tinta.latas18 ? `<b>${tinta.latas18} lata${tinta.latas18 > 1 ? 's' : ''} de 18 L</b>` : ''}${tinta.latas18 && tinta.galoes ? ' + ' : ''}${tinta.galoes ? `<b>${tinta.galoes} galão${tinta.galoes > 1 ? 'ões' : ''} de 3,6 L</b>` : ''}</p></div>`;
};
TELAS.medidas.montar = (tela) => { $$('[data-md]', tela).forEach((i) => i.addEventListener('change', () => { const k = i.dataset.md; TELAS.medidas.v[k] = k === 'pol' ? i.value : lerNum(i.value); repinta(); })); };

// segmentado: pílula que desliza até o botão escolhido
export function ligarSeg(seg, aoEscolher) {
  if (!seg) return;
  const bts = $$('button', seg), pilula = $('i', seg);
  const mover = () => { const b = bts.find((x) => x.getAttribute('aria-pressed') === 'true') || bts[0]; if (!b || !pilula) return; pilula.style.width = `${b.offsetWidth}px`; pilula.style.transform = `translateX(${b.offsetLeft - 4}px)`; };
  mover();
  if (aoEscolher) bts.forEach((b) => b.addEventListener('click', () => { bts.forEach((x) => x.setAttribute('aria-pressed', x === b)); mover(); aoEscolher(b); }));
}
