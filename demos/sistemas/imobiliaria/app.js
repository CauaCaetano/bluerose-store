// Veltria Imobiliária · imóveis, funil de clientes, visitas, locação e repasses (referências: Jetimob, Kenlo, Imobzi)
import {
  criarApp, esc, moeda, moedaC, num, pct, hoje, diaMais, mesMais, nomeMes, dataCurta, dataBR, relativo, diasAte, paraData, minutos, hhmm,
  sorteio, soma, agrupar, av, ic, et, kpis, barras, rosca, barrasH, funilH, kanban, calGrade, DIAS, DIAS_L, telLink, normal,
  modal, confirmar, avisar, editar, excluir, ficha, props, linhaDoTempo, vazio, imprimir,
} from '../base/nexo.js';
import { LADOS as FERR, ITENS as FERR_ITENS } from './ferramentas.js';
import { acoesLado, ferramentaPaginas, travarPro } from '../base/lado.js';
import { equipeViva, paginaEquipe } from '../base/equipe-viva.js';

const ETAPAS = [['lead', 'Novo contato', '#94a3b8'], ['atendimento', 'Em atendimento', '#3b82f6'], ['visita', 'Visita marcada', '#8b5cf6'], ['proposta', 'Proposta', '#f59e0b'], ['documentacao', 'Documentação', '#0ea5e9'], ['fechado', 'Fechado', '#16a34a']];
const ORIGENS = ['ZAP Imóveis', 'Viva Real', 'OLX', 'Site', 'Instagram', 'Indicação', 'Placa'];
const TIPOS = ['Apartamento', 'Casa', 'Cobertura', 'Sala comercial', 'Terreno', 'Studio'];
const BAIRROS = ['Água Verde', 'Batel', 'Bigorrilho', 'Centro', 'Cabral', 'Ecoville', 'Juvevê', 'Portão'];
const CORRETORES = [['co0', 'Aline Martins', 'CRECI 31.880'], ['co1', 'Bruno Kowalski', 'CRECI 28.114'], ['co2', 'Carla Nunes', 'CRECI 35.207'], ['co3', 'Diego Ramos', 'CRECI 33.560']];
const EQUIPE = { colecao: 'corretores', rot: 'Corretores', icone: 'identification-badge', singular: 'corretor', plural: 'corretores', vazio: 'os corretores', lista: CORRETORES,
  campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true }, { nome: 'creci', rotulo: 'CRECI', tipo: 'texto' }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel' }],
  linha: (r) => [r.id, r.nome, r.creci || ''], registro: ([id, nome, creci]) => ({ id, nome, creci }) };
const padraoEquipe = (eu) => (CORRETORES.find((x) => x[0] === eu) || CORRETORES[0] || [''])[0];
const nomeCor = (id) => (CORRETORES.find((c) => c[0] === id) || [, '—'])[1];
const COMISSAO_VENDA = 0.06;

// ---------------------------------------------------------------- dados de exemplo (fictícios)
function semente() {
  const r = sorteio(20261104), esc1 = (l) => l[Math.floor(r() * l.length)], ent = (a, b) => a + Math.floor(r() * (b - a + 1));
  const nomes = ['Adriana Wolff', 'Alberto Schmidt', 'Beatriz Kühn', 'Caio Bertoldi', 'Daniela Moro', 'Eduardo Zanetti', 'Fabiana Lopes', 'Gilberto Mazur', 'Heloísa Pires', 'Igor Novak', 'Jaqueline Bueno', 'Leandro Tavares', 'Mônica Ferraz', 'Nicolas Prestes', 'Otávio Krüger', 'Patrícia Lemos', 'Rodrigo Hauer', 'Simone Vieira', 'Tânia Brandt', 'Vagner Ribas', 'Wellington Costa', 'Yara Mendes', 'Arthur Belin', 'Bruna Ziemer', 'César Abreu', 'Denise Valente', 'Elias Fontana', 'Flávia Moser', 'Guilherme Dal Bó', 'Helena Kaminski'];
  const pessoas = nomes.map((nome, i) => ({ id: `ps${i}`, nome, telefone: `(41) 9${ent(8100, 9899)}-${ent(1000, 9999)}`, email: `${normal(nome.split(' ')[0])}@email.com`, tipo: i < 8 ? 'proprietario' : i < 14 ? 'inquilino' : 'interessado', cpf: `${ent(100, 999)}.${ent(100, 999)}.${ent(100, 999)}-${ent(10, 99)}` }));
  const imoveis = [];
  for (let i = 0; i < 46; i++) {
    const fin = i % 5 < 2 ? 'aluguel' : 'venda', tipo = esc1(i % 6 === 5 ? ['Sala comercial', 'Terreno'] : ['Apartamento', 'Apartamento', 'Casa', 'Cobertura', 'Studio']), bairro = esc1(BAIRROS);
    const area = tipo === 'Studio' ? ent(28, 42) : tipo === 'Terreno' ? ent(300, 600) : tipo === 'Sala comercial' ? ent(35, 120) : tipo === 'Casa' ? ent(140, 320) : tipo === 'Cobertura' ? ent(160, 280) : ent(55, 140);
    const quartos = ['Terreno', 'Sala comercial'].includes(tipo) ? 0 : tipo === 'Studio' ? 1 : Math.min(4, Math.max(1, Math.round(area / 45)));
    const m2 = { Batel: 14500, Bigorrilho: 12800, Ecoville: 11000, 'Água Verde': 10500, Juvevê: 10200, Cabral: 9800, Centro: 8200, Portão: 7600 }[bairro] * (tipo === 'Terreno' ? 0.35 : 1);
    const valor = fin === 'venda' ? Math.round((area * m2 * (0.85 + r() * 0.3)) / 5000) * 5000 : Math.round((area * m2 * 0.0045) / 50) * 50;
    const status = i < 30 ? 'disponivel' : i < 33 ? 'reservado' : fin === 'venda' ? 'vendido' : 'alugado';
    imoveis.push({ id: `im${i}`, codigo: `${fin === 'venda' ? 'V' : 'L'}${String(2100 + i)}`, tipo, finalidade: fin, bairro, cidade: 'Curitiba', endereco: `${esc1(['Rua Padre Anchieta', 'Av. Silva Jardim', 'Rua Saldanha Marinho', 'Rua Bruno Filgueira', 'Av. Água Verde', 'Rua Martim Afonso', 'Rua Fernando Simas'])}, ${ent(50, 2400)}`, area, quartos, suites: quartos > 1 ? ent(1, quartos - 1) : 0, vagas: tipo === 'Terreno' ? 0 : tipo === 'Studio' ? 1 : ent(1, 3), valor, condominio: ['Casa', 'Terreno'].includes(tipo) ? 0 : ent(380, 1400), iptu: Math.round(valor * (fin === 'venda' ? 0.0007 : 0.12)), status, proprietario: `ps${i % 8}`, corretor: CORRETORES[i % 4][0], captado: diaMais(-ent(5, 260)), visualizacoes: ent(40, 1900), destaque: i % 7 === 0, descricao: `${tipo} ${quartos ? `com ${quartos} quarto${quartos > 1 ? 's' : ''}` : ''} no ${bairro}, ${area} m². Próximo a comércio, parques e transporte.` });
  }
  // fotos de demonstração (ilustrações em imobiliaria/fotos): fachada do tipo e, nos residenciais, sala, cozinha e quarto
  const FOTOS = { Apartamento: ['apartamento', 4], Casa: ['casa', 4], Cobertura: ['cobertura', 2], Studio: ['studio', 2], 'Sala comercial': ['sala-comercial', 2], Terreno: ['terreno', 2] };
  const foto = (arq, i, k, legenda) => ({ id: `fd${i}-${k}`, nome: `${arq}.webp`, tipo: 'image/webp', tamanho: 40000, legenda, data: new URL(`fotos/${arq}.webp`, import.meta.url).href });
  imoveis.forEach((im, i) => {
    const [base, n] = FOTOS[im.tipo] || FOTOS.Apartamento;
    const l = [foto(`${base}-${(i % n) + 1}`, i, 0, 'Fachada')];
    if (!['Terreno', 'Sala comercial'].includes(im.tipo)) l.push(foto(`interior-sala-${(i % 3) + 1}`, i, 1, 'Sala'), foto(`interior-cozinha-${((i + 1) % 3) + 1}`, i, 2, 'Cozinha'), foto(`interior-quarto-${((i + 2) % 3) + 1}`, i, 3, 'Quarto'));
    im._anexos = l;
  });
  const negocios = [];
  for (let i = 0; i < 38; i++) {
    const p = pessoas[14 + (i % 16)], fin = i % 3 === 0 ? 'aluguel' : 'venda', cand = imoveis.filter((x) => x.finalidade === fin && x.status !== 'vendido'), im = esc1(cand);
    const etapa = i < 8 ? 'lead' : i < 16 ? 'atendimento' : i < 22 ? 'visita' : i < 27 ? 'proposta' : i < 30 ? 'documentacao' : i < 35 ? 'fechado' : 'perdido';
    negocios.push({ id: `ng${i}`, cliente: p.id, finalidade: fin, imovel: etapa === 'lead' ? null : im.id, valor: im.valor, etapa, corretor: im.corretor, origem: esc1(ORIGENS), criado: diaMais(-ent(1, 80)), atualizado: diaMais(-ent(0, 12)), busca: { tipo: im.tipo, bairros: [im.bairro, esc1(BAIRROS)], ate: Math.round(im.valor * 1.15), quartos: im.quartos }, fechado_em: etapa === 'fechado' ? diaMais(-ent(2, 60)) : null, motivo: etapa === 'perdido' ? esc1(['Comprou com outra imobiliária', 'Desistiu', 'Sem crédito aprovado']) : '' });
  }
  const visitas = [];
  for (let d = -20; d <= 10; d++) { const data = diaMais(d); if (paraData(data).getDay() === 0) continue; for (let k = 0; k < (d >= 0 && d < 7 ? ent(2, 4) : ent(0, 2)); k++) { const n = esc1(negocios.filter((x) => x.imovel)); const im = imoveis.find((x) => x.id === n.imovel); visitas.push({ id: `vi${visitas.length}`, imovel: im.id, cliente: n.cliente, negocio: n.id, corretor: im.corretor, data, hora: esc1(['09:00', '10:00', '11:00', '14:00', '15:30', '17:00', '18:30']), status: d < 0 ? (r() < 0.85 ? 'realizada' : 'cancelada') : 'agendada', feedback: d < 0 ? esc1(['Gostou muito, vai conversar com a família.', 'Achou a cozinha pequena.', 'Quer ver outra opção no mesmo prédio.', 'Pediu proposta com 10% de desconto.']) : '' }); } }
  const contratos = imoveis.filter((x) => x.status === 'alugado').concat(imoveis.filter((x) => x.finalidade === 'aluguel' && x.status === 'disponivel').slice(0, 6)).slice(0, 12).map((im, i) => {
    im.status = 'alugado'; const inicio = diaMais(-ent(40, 700));
    return { id: `ct${i}`, imovel: im.id, inquilino: `ps${8 + (i % 6)}`, proprietario: im.proprietario, aluguel: im.valor, inicio, fim: diaMais(30 * 30, inicio), dia_venc: [5, 10, 15][i % 3], taxa_adm: 10, garantia: esc1(['Seguro fiança', 'Caução (3 aluguéis)', 'Fiador', 'Título de capitalização']), reajuste: 'IGP-M', status: 'ativo' };
  });
  const cobrancas = [];
  contratos.forEach((c, i) => { for (let m = -4; m <= 1; m++) { const venc = `${mesMais(m)}-${String(c.dia_venc).padStart(2, '0')}`; if (venc < c.inicio) continue; const atraso = venc < hoje() && ((i === 2 && m >= -1) || (i === 7 && m === 0)); const pago = venc < hoje() && !atraso; cobrancas.push({ id: `cb${cobrancas.length}`, contrato: c.id, competencia: mesMais(m), vencimento: venc, valor: c.aluguel, status: pago ? 'pago' : 'aberto', pago_em: pago ? diaMais(ent(-2, 1), venc) : null, repassado: pago && diasAte(venc) < -8 }); } });
  return { _cfg: { empresa: 'Alto Padrão Imóveis', endereco: 'Av. do Batel, 1.230 · Batel · Curitiba/PR', cnpj: '22.418.903/0001-61', creci: 'CRECI-PR J-7.441', telefone: '(41) 3343-9900' }, pessoas, imoveis, negocios, visitas, contratos, cobrancas };
}

// ---------------------------------------------------------------- regras
const imovel = (a, id) => a.db.obter('imoveis', id);
const pessoa = (a, id) => a.db.obter('pessoas', id);
const negs = (a) => a.db.lista('negocios');
const cobs = (a) => a.db.lista('cobrancas');
const titulo = (x) => `${x.tipo}${x.quartos ? ` · ${x.quartos} quarto${x.quartos > 1 ? 's' : ''}` : ''} · ${x.bairro}`;
const etSt = (x) => ({ disponivel: et('Disponível', 'ok'), reservado: et('Reservado', 'al'), vendido: et('Vendido', ''), alugado: et('Alugado', 'info') })[x.status];
const valorFmt = (x) => `${moeda(x.valor)}${x.finalidade === 'aluguel' ? '<span class="mute">/mês</span>' : ''}`;
const comissao = (a, n) => (n.finalidade === 'venda' ? n.valor * COMISSAO_VENDA : n.valor);
const repasse = (c, cb) => cb.valor * (1 - c.taxa_adm / 100);
const capa = (x, alt = 120) => (x._anexos || []).some((f) => /^image/.test(f.tipo)) ? `<div style="height:${alt}px;border-radius:8px;overflow:hidden;position:relative;background:var(--painel-2)"><img data-anexo="imoveis|${esc(x.id)}|${esc(x._anexos.find((f) => /^image/.test(f.tipo)).id)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"><span class="mono" style="position:absolute;left:8px;top:8px;font-size:11px;background:var(--painel);padding:2px 6px;border-radius:5px;color:var(--tx-2)">${esc(x.codigo)}</span></div>` : `<div style="height:${alt}px;border-radius:8px;background:linear-gradient(135deg,color-mix(in srgb,var(--acc) 22%,var(--painel-2)),color-mix(in srgb,var(--acc) 6%,var(--painel)));display:grid;place-items:center;color:var(--acc);position:relative" class="capa-im">${ic({ Apartamento: 'buildings', Casa: 'house-line', Cobertura: 'buildings', 'Sala comercial': 'storefront', Terreno: 'map-pin', Studio: 'bed' }[x.tipo] || 'house-line', 'g')}<span class="mono" style="position:absolute;left:8px;top:8px;font-size:11px;background:var(--painel);padding:2px 6px;border-radius:5px;color:var(--tx-2)">${esc(x.codigo)}</span>${x.destaque ? '<span style="position:absolute;right:8px;top:8px;font-size:11px;background:var(--acc);color:#fff;padding:2px 6px;border-radius:5px">Destaque</span>' : ''}</div>`;
const parcelaPrice = (valor, entrada, anos, taxa) => { const n = anos * 12, i = taxa / 100 / 12, pv = valor - entrada; return pv <= 0 ? 0 : (pv * i) / (1 - (1 + i) ** -n); };
const COMODOS = ['Sala', 'Cozinha', 'Quarto 1', 'Quarto 2', 'Banheiro social', 'Área de serviço', 'Varanda', 'Garagem'];
const ESTADOS = [['bom', 'Bom'], ['regular', 'Regular'], ['ruim', 'Precisa de reparo']];
function docContrato(a, c) {
  const x = imovel(a, c.imovel), inq = pessoa(a, c.inquilino), pr = pessoa(a, c.proprietario), cfg = a.db.cfg;
  return `<div class="doc"><h1 style="text-align:center">Contrato de locação residencial</h1><p style="text-align:center;color:#555">${esc(a.empresa)} · ${esc(cfg.creci || '')} · ${esc(cfg.endereco || '')}</p>
    <h2>Partes</h2><p><b>Locador(a):</b> ${esc(pr?.nome || '')}, CPF ${esc(pr?.cpf || '')}, representado(a) pela administradora ${esc(a.empresa)}.<br><b>Locatário(a):</b> ${esc(inq?.nome || '')}, CPF ${esc(inq?.cpf || '')}.</p>
    <h2>Imóvel</h2><p>${esc(x?.tipo || '')} situado em ${esc(x?.endereco || '')}, bairro ${esc(x?.bairro || '')}, ${esc(x?.cidade || '')}, código ${esc(x?.codigo || '')}, com ${x?.area || ''} m².</p>
    <h2>Cláusulas</h2><ol style="line-height:1.6">
      <li>Prazo de ${Math.round((paraData(c.fim) - paraData(c.inicio)) / 2629800000)} meses, de ${dataBR(c.inicio)} a ${dataBR(c.fim)}, nos termos da Lei 8.245/1991.</li>
      <li>Aluguel mensal de ${moeda(c.aluguel)}, com vencimento todo dia ${c.dia_venc}, reajustado a cada 12 meses pelo ${esc(c.reajuste || 'IGP-M')} acumulado.</li>
      <li>Garantia: ${esc(c.garantia || '')}.</li>
      <li>Condomínio, IPTU, água, luz e gás correm por conta do locatário a partir da entrega das chaves.</li>
      <li>O atraso no pagamento gera multa de 10% e juros de 1% ao mês, além de correção monetária.</li>
      <li>O imóvel é entregue conforme o laudo de vistoria de entrada, parte deste contrato, e deve ser devolvido no mesmo estado, salvo o desgaste natural.</li>
      <li>Rescisão antes do prazo: multa proporcional de 3 aluguéis, conforme o art. 4º da Lei 8.245/1991.</li>
      <li>Fica eleito o foro da comarca de ${esc(x?.cidade || '')} para dirimir dúvidas deste contrato.</li></ol>
    <p style="margin-top:30px">${esc(x?.cidade || '')}, ${dataBR(hoje())}.</p><div class="ass"><div>${esc(pr?.nome || 'Locador')}</div><div>${esc(inq?.nome || 'Locatário')}</div></div><div class="ass"><div>Testemunha 1</div><div>Testemunha 2</div></div>
    <p style="font-size:11px;color:#777;margin-top:18px">Modelo de referência. Revise com o jurídico da imobiliária antes de assinar.</p></div>`;
}
function docVistoria(a, v) {
  const c = a.db.obter('contratos', v.contrato), x = imovel(a, c?.imovel);
  return `<div class="doc"><h1>Laudo de vistoria de ${v.tipo === 'saida' ? 'saída' : 'entrada'}</h1><p>${esc(a.empresa)} · ${esc(x?.codigo || '')} · ${esc(x?.endereco || '')} · ${dataBR(v.data)} · vistoriador: ${esc(nomeCor(v.corretor))}</p>
    <table><thead><tr><th>Cômodo</th><th>Estado</th><th>Observações</th></tr></thead><tbody>${v.comodos.map((k) => `<tr><td>${esc(k.nome)}</td><td>${esc(ESTADOS.find((e) => e[0] === k.estado)?.[1] || '')}</td><td>${esc(k.obs || '')}</td></tr>`).join('')}</tbody></table>
    <p>Fotos anexadas no sistema: ${(v._anexos || []).length}.</p><div class="ass"><div>${esc(a.empresa)}</div><div>${esc(pessoa(a, c?.inquilino)?.nome || 'Locatário')}</div></div></div>`;
}
const compativeis = (a, n) => a.db.lista('imoveis').filter((x) => x.status === 'disponivel' && x.finalidade === n.finalidade && (!n.busca?.tipo || x.tipo === n.busca.tipo) && (!n.busca?.ate || x.valor <= n.busca.ate) && (!n.busca?.quartos || x.quartos >= n.busca.quartos)).sort((x, y) => Number((n.busca?.bairros || []).includes(y.bairro)) - Number((n.busca?.bairros || []).includes(x.bairro)) || y.valor - x.valor);
const textoImovel = (a, x) => `*${titulo(x)}* (${x.codigo})\n${x.area} m² · ${x.quartos} quartos · ${x.vagas} vagas\n${x.finalidade === 'venda' ? 'Venda' : 'Aluguel'}: *${moeda(x.valor)}${x.finalidade === 'aluguel' ? '/mês' : ''}*${x.condominio ? `\nCondomínio: ${moeda(x.condominio)}` : ''}\n${x.descricao}\n\n${a.empresa} · ${a.db.cfg.telefone}`;

const colecoes = {
  imoveis: { singular: 'imóvel', plural: 'imóveis', largura: 700, tres: true, campos: [
    { nome: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: TIPOS, obrigatorio: true }, { nome: 'finalidade', rotulo: 'Finalidade', tipo: 'selecao', opcoes: [['venda', 'Venda'], ['aluguel', 'Aluguel']], obrigatorio: true }, { nome: 'valor', rotulo: 'Valor', tipo: 'moeda', obrigatorio: true },
    { nome: 'endereco', rotulo: 'Endereço', tipo: 'texto', largo: true }, { nome: 'bairro', rotulo: 'Bairro', tipo: 'selecao', opcoes: BAIRROS, obrigatorio: true }, { nome: 'area', rotulo: 'Área (m²)', tipo: 'numero' }, { nome: 'quartos', rotulo: 'Quartos', tipo: 'numero', padrao: 2 },
    { nome: 'vagas', rotulo: 'Vagas', tipo: 'numero', padrao: 1 }, { nome: 'condominio', rotulo: 'Condomínio', tipo: 'moeda' }, { nome: 'iptu', rotulo: 'IPTU (anual)', tipo: 'moeda' },
    { nome: 'proprietario', rotulo: 'Proprietário', tipo: 'relacao', colecao: 'pessoas', filtrar: (p) => p.tipo === 'proprietario' }, { nome: 'corretor', rotulo: 'Corretor captador', tipo: 'selecao', opcoes: () => CORRETORES.map((c) => [c[0], c[1]]) },
    { nome: 'descricao', rotulo: 'Descrição para os portais', tipo: 'texto-longo' }],
    antesDeSalvar: (d, a, antes) => ({ ...d, cidade: 'Curitiba', codigo: antes?.codigo || `${d.finalidade === 'venda' ? 'V' : 'L'}${2100 + a.db.lista('imoveis').length}`, status: antes?.status || 'disponivel', captado: antes?.captado || hoje(), visualizacoes: antes?.visualizacoes || 0 }) },
  pessoas: { singular: 'pessoa', genero: 'f', plural: 'pessoas', campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: [['interessado', 'Interessado'], ['proprietario', 'Proprietário'], ['inquilino', 'Inquilino']], padrao: 'interessado' }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel', obrigatorio: true }, { nome: 'email', rotulo: 'E-mail', tipo: 'email' }, { nome: 'cpf', rotulo: 'CPF', tipo: 'texto' }] },
  negocios: { singular: 'atendimento', plural: 'atendimentos', campos: (a) => [
    { nome: 'cliente', rotulo: 'Cliente', tipo: 'relacao', colecao: 'pessoas', obrigatorio: true }, { nome: 'finalidade', rotulo: 'Procura', tipo: 'selecao', opcoes: [['venda', 'Comprar'], ['aluguel', 'Alugar']], obrigatorio: true },
    { nome: 'origem', rotulo: 'Origem', tipo: 'selecao', opcoes: ORIGENS }, { nome: 'corretor', rotulo: 'Corretor', tipo: 'selecao', opcoes: () => CORRETORES.map((c) => [c[0], c[1]]) },
    { nome: 'b_tipo', rotulo: 'Tipo de imóvel', tipo: 'selecao', opcoes: TIPOS }, { nome: 'b_ate', rotulo: 'Valor até', tipo: 'moeda' }, { nome: 'b_quartos', rotulo: 'Quartos (mínimo)', tipo: 'numero', padrao: 2 }],
    antesDeSalvar: (d, a, antes) => ({ ...(antes ? { id: antes.id } : {}), cliente: d.cliente, finalidade: d.finalidade, origem: d.origem, corretor: d.corretor, busca: { tipo: d.b_tipo, ate: d.b_ate, quartos: d.b_quartos, bairros: antes?.busca?.bairros || [] }, ...(antes ? {} : { etapa: 'lead', criado: hoje(), atualizado: hoje(), imovel: null, valor: d.b_ate || 0 }) }) },
};

// ---------------------------------------------------------------- páginas
function painel(a) {
  const ims = a.db.lista('imoveis'), disp = ims.filter((x) => x.status === 'disponivel'), ab = negs(a).filter((n) => !['fechado', 'perdido'].includes(n.etapa));
  const fechMes = negs(a).filter((n) => n.etapa === 'fechado' && String(n.fechado_em).startsWith(hoje().slice(0, 7)));
  const atr = cobs(a).filter((c) => c.status === 'aberto' && c.vencimento < hoje()), rep = cobs(a).filter((c) => c.status === 'pago' && !c.repassado);
  const semana = a.db.lista('visitas').filter((v) => v.status === 'agendada' && diasAte(v.data) >= 0 && diasAte(v.data) < 7).sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora));
  return `${kpis([{ rot: 'Imóveis disponíveis', icone: 'buildings', val: num(disp.length), nota: `${disp.filter((x) => x.finalidade === 'venda').length} venda · ${disp.filter((x) => x.finalidade === 'aluguel').length} aluguel` },
    { rot: 'VGV em negociação', icone: 'handshake', val: moedaC(soma(ab.filter((n) => n.finalidade === 'venda'), (n) => n.valor)), nota: `${ab.length} atendimentos abertos` },
    { rot: 'Comissões previstas', icone: 'hand-coins', val: moeda(soma(ab.filter((n) => ['proposta', 'documentacao'].includes(n.etapa)), (n) => comissao(a, n))), nota: 'propostas e documentação' },
    { rot: 'Aluguéis em atraso', icone: 'warning', val: moeda(soma(atr, (c) => c.valor)), alerta: atr.length > 0, nota: `${rep.length} repasses a fazer` }])}
    <div class="grade g21"><div class="cartao"><div class="cartao-cab"><div><h3>Funil de atendimento</h3><div class="sub">Do primeiro contato ao contrato</div></div><a class="btn peq" href="#/funil">Abrir funil</a></div><div class="cartao-corpo">${funilH(ETAPAS.map(([id, n]) => ({ rot: n, v: negs(a).filter((x) => x.etapa === id).length, extra: moedaC(soma(negs(a).filter((x) => x.etapa === id), (x) => x.valor)) })))}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Visitas dos próximos 7 dias</h3></div><a class="btn peq" href="#/visitas">Agenda</a></div>${semana.length ? `<ul class="lista">${semana.slice(0, 7).map((v) => { const x = imovel(a, v.imovel); return `<li class="clicavel" data-abrir="visita:${v.id}"><div style="width:58px"><b class="num">${v.hora}</b><div class="mute" style="font-size:11.5px">${DIAS[paraData(v.data).getDay()]} ${Number(v.data.slice(8))}</div></div><div class="cresce"><div class="t corta">${esc(pessoa(a, v.cliente)?.nome || '')}</div><div class="s corta">${esc(x?.codigo || '')} · ${esc(x ? titulo(x) : '')}</div></div>${av(nomeCor(v.corretor), 'p')}</li>`; }).join('')}</ul>` : vazio('calendar-blank', 'Nenhuma visita marcada')}</div></div>
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>De onde vêm os clientes</h3><div class="sub">Atendimentos dos últimos 90 dias</div></div></div><div class="cartao-corpo">${barrasH(ORIGENS.map((o) => ({ rot: o, v: negs(a).filter((n) => n.origem === o && diasAte(n.criado) > -90).length, extra: `${negs(a).filter((n) => n.origem === o && n.etapa === 'fechado').length} fechados` })).sort((x, y) => y.v - x.v))}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Imóveis mais vistos</h3><div class="sub">Visualizações nos portais e no site</div></div><a class="btn peq" href="#/imoveis">Imóveis</a></div><ul class="lista">${disp.sort((x, y) => y.visualizacoes - x.visualizacoes).slice(0, 6).map((x) => `<li class="clicavel" data-abrir="imovel:${x.id}"><span class="mono mute-2" style="width:48px">${esc(x.codigo)}</span><div class="cresce"><div class="t corta">${esc(titulo(x))}</div><div class="s">${valorFmt(x)}</div></div><span class="mute num">${num(x.visualizacoes)} ${ic('eye', 'p')}</span></li>`).join('')}</ul></div></div>
    ${fechMes.length ? `<div class="dica">${ic('check-circle')}<span>${fechMes.length} negócio${fechMes.length > 1 ? 's' : ''} fechado${fechMes.length > 1 ? 's' : ''} este mês · ${moeda(soma(fechMes, (n) => comissao(a, n)))} em comissões.</span></div>` : ''}`;
}

function imoveisPag(a) {
  const st = a.estado.ims ||= { modo: 'cards', fin: 'todos', bairro: '' };
  let l = a.db.lista('imoveis').filter((x) => (st.fin === 'todos' || x.finalidade === st.fin) && (!st.bairro || x.bairro === st.bairro));
  const topo = `<div class="entre"><div class="flex" style="flex-wrap:wrap"><div class="grupo-btn">${[['todos', 'Todos'], ['venda', 'Venda'], ['aluguel', 'Aluguel']].map(([k, n]) => `<button type="button" data-acao="finIm" data-f="${k}" aria-pressed="${st.fin === k}">${n}</button>`).join('')}</div><select data-mudar="bairroIm" style="width:auto"><option value="">Todos os bairros</option>${BAIRROS.map((b) => `<option ${b === st.bairro ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
    <div class="flex"><div class="grupo-btn"><button type="button" data-acao="modoIm" data-m="cards" aria-pressed="${st.modo === 'cards'}">${ic('squares-four', 'p')}Vitrine</button><button type="button" data-acao="modoIm" data-m="lista" aria-pressed="${st.modo === 'lista'}">${ic('list', 'p')}Lista</button></div><button type="button" class="btn" data-acao="linkVitrine">${ic('globe')}Vitrine online</button><button type="button" class="btn pri" data-acao="novoCad" data-c="imoveis">${ic('plus')}Captar imóvel</button></div></div>`;
  if (st.modo === 'lista') return topo + a.tab({ id: 'imoveis', itens: () => l, singular: 'imóvel', plural: 'imóveis', ordem: 'codigo', aoClicar: (id) => a.abrir('imovel', id), textoBusca: (x) => `${x.codigo} ${x.tipo} ${x.bairro} ${x.endereco}`,
    visoes: [{ id: 'disp', rot: 'Disponíveis', filtro: (x) => x.status === 'disponivel' }, { id: 'res', rot: 'Reservados', filtro: (x) => x.status === 'reservado' }, { id: 'neg', rot: 'Vendidos e alugados', filtro: (x) => ['vendido', 'alugado'].includes(x.status) }, { id: 'todos', rot: 'Todos' }],
    filtros: [{ k: 'tipo', rot: 'Tipo', opcoes: TIPOS }, { k: 'corretor', rot: 'Corretor', opcoes: () => CORRETORES.map((c) => [c[0], c[1]]) }],
    colunas: [{ k: 'codigo', rot: 'Cód.', render: (x) => `<span class="mono prim">${esc(x.codigo)}</span>` }, { k: 'tipo', rot: 'Imóvel', valor: titulo, render: (x) => `<span class="prim">${esc(titulo(x))}</span><span class="sub">${x.area} m² · ${x.vagas} vagas</span>` }, { k: 'valor', rot: 'Valor', n: true, render: valorFmt }, { k: 'visualizacoes', rot: 'Visualizações', n: true, oc: true, render: (x) => num(x.visualizacoes) }, { k: 'corretor', rot: 'Corretor', oc: true, valor: (x) => nomeCor(x.corretor) }, { k: 'status', rot: 'Situação', render: etSt }] });
  l = l.filter((x) => x.status !== 'vendido').sort((x, y) => Number(y.destaque) - Number(x.destaque) || (x.status === 'disponivel' ? -1 : 1));
  return `${topo}<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px">${l.map((x) => `<article class="cartao clicavel" data-abrir="imovel:${x.id}" style="margin:0;padding:10px;cursor:pointer">${capa(x)}<div style="padding:10px 4px 4px"><div class="entre"><b>${valorFmt(x)}</b>${etSt(x)}</div><div style="margin-top:4px">${esc(titulo(x))}</div><div class="mute" style="font-size:12.5px;margin-top:4px">${x.area} m²${x.vagas ? ` · ${x.vagas} vaga${x.vagas === 1 ? '' : 's'}` : ''}${x.condominio ? ` · cond. ${moedaC(x.condominio)}` : ''}</div></div></article>`).join('')}</div>`;
}

function funil(a) {
  a.kanbans.funil = (id, s) => { const n = a.db.obter('negocios', id); if (s !== 'lead' && !n.imovel) { avisar('Escolha o imóvel de interesse antes de avançar (abra o atendimento)', { tipo: 'erro' }); return; } a.db.salvar('negocios', { id, etapa: s, atualizado: hoje(), ...(s === 'fechado' ? { fechado_em: hoje() } : {}) }); a.db.registrar(`negocios:${id}`, ETAPAS.find((e) => e[0] === s)[1], { icone: 'arrow-right', tom: s === 'fechado' ? 'ok' : 'acc' }); avisar(`${pessoa(a, n.cliente)?.nome.split(' ')[0]} → ${ETAPAS.find((e) => e[0] === s)[1]}`); if (s === 'fechado') a.acoes.fecharNegocio({ id }); };
  a.kanbans['funil:abrir'] = (id) => a.abrir('negocio', id);
  return `<div class="entre"><span class="mute" style="font-size:12.5px">Arraste os cartões entre as etapas. Atendimentos parados há mais de 7 dias ficam marcados.</span><button type="button" class="btn pri" data-acao="novoCad" data-c="negocios">${ic('plus')}Novo atendimento</button></div>`
    + kanban({ id: 'funil', itens: negs(a).filter((n) => n.etapa !== 'perdido' && (n.etapa !== 'fechado' || diasAte(n.fechado_em) > -30)), campo: 'etapa', colunas: ETAPAS.map(([id, nome, cor]) => ({ id, nome, cor, sub: (l) => moedaC(soma(l, (n) => n.valor)), classe: (n) => (!['fechado'].includes(n.etapa) && diasAte(n.atualizado) < -7 ? 'parado' : '') })),
      ficha: (n) => { const x = imovel(a, n.imovel); return `<div class="entre"><span class="mute" style="font-size:11.5px">${n.finalidade === 'venda' ? 'Compra' : 'Aluguel'} · ${esc(n.origem)}</span>${av(nomeCor(n.corretor), 'p')}</div><div class="t">${esc(pessoa(a, n.cliente)?.nome || '')}</div><div class="s corta">${x ? `${esc(x.codigo)} · ${esc(titulo(x))}` : `procura ${esc(n.busca?.tipo || 'imóvel')} até ${moedaC(n.busca?.ate)}`}</div><div class="linha"><span class="mute" style="font-size:11.5px">${relativo(n.atualizado)}</span><b class="num" style="color:var(--tx)">${moedaC(n.valor)}</b></div>`; } });
}

function visitasPag(a) {
  const st = a.estado.vis ||= { data: paraData(hoje()).getDay() === 0 ? diaMais(1) : hoje() };
  const seg = diaMais(-((paraData(st.data).getDay() + 6) % 7), st.data), dias = Array.from({ length: 7 }, (_, i) => diaMais(i, seg));
  a.cals.visitas = { aoClicar: (id) => a.abrir('visita', id), aoMover: (id, col, hora) => { a.db.salvar('visitas', { id, data: col, hora }); avisar(`Visita remarcada para ${dataCurta(col)}, ${hora}`); a.render(); }, aoClicarVazio: (col, hora) => a.acoes.novaVisita({ data: col, hora }) };
  const cor = Object.fromEntries(CORRETORES.map(([id], i) => [id, ['#0f766e', '#7c3aed', '#db2777', '#ea580c', '#2563eb', '#65a30d'][i % 6]]));
  return `<div class="cal"><div class="cal-barra"><div class="grupo-btn"><button type="button" data-acao="semVis" data-d="-7" aria-label="Semana anterior">${ic('caret-left', 'p')}</button><button type="button" data-acao="semVis" data-d="0">Esta semana</button><button type="button" data-acao="semVis" data-d="7" aria-label="Próxima semana">${ic('caret-right', 'p')}</button></div><h3>Semana de ${dataCurta(seg)}</h3>
    <span class="flex mute" style="font-size:12px;gap:10px;margin-left:auto">${CORRETORES.map(([id, n]) => `<span class="flex" style="gap:5px"><i style="width:9px;height:9px;border-radius:3px;background:${cor[id]}"></i>${n.split(' ')[0]}</span>`).join('')}</span><button type="button" class="btn pri peq" data-acao="novaVisita">${ic('plus')}Visita</button></div>
    ${calGrade({ id: 'visitas', inicio: 8, fim: 20, hh: 52, larguraCol: 140, agora: { col: hoje(), hora: new Date().toTimeString().slice(0, 5) }, colunas: dias.map((d) => ({ id: d, rot: `${DIAS[paraData(d).getDay()]} ${Number(d.slice(8))}`, hoje: d === hoje() })),
      eventos: a.db.lista('visitas').filter((v) => dias.includes(v.data) && v.status !== 'cancelada').map((v) => ({ id: v.id, col: v.data, ini: v.hora, fim: hhmm(minutos(v.hora) + 50), titulo: pessoa(a, v.cliente)?.nome || '—', sub: imovel(a, v.imovel)?.codigo, cor: cor[v.corretor], cls: v.status === 'realizada' ? 'feito' : '' })) })}</div>`;
}

function locacao(a) {
  const st = a.estado.loc ||= { aba: 'cobrancas' };
  const cts = a.db.lista('contratos'), ct = (id) => a.db.obter('contratos', id);
  const abas = `<div class="abas-pag">${[['cobrancas', 'Aluguéis', 'receipt'], ['repasses', 'Repasses', 'arrows-left-right'], ['contratos', 'Contratos', 'file-text']].map(([k, n, i]) => `<button type="button" data-acao="abaLoc" data-a="${k}" aria-selected="${st.aba === k}">${ic(i)}${n}</button>`).join('')}</div>`;
  const k = kpis([{ rot: 'Contratos ativos', icone: 'file-text', val: num(cts.length), nota: `${moeda(soma(cts, (c) => c.aluguel))} em aluguéis por mês` }, { rot: 'Taxa de administração', icone: 'hand-coins', val: moeda(soma(cts, (c) => (c.aluguel * c.taxa_adm) / 100)), nota: 'receita da imobiliária por mês' }, { rot: 'Em atraso', icone: 'warning', val: moeda(soma(cobs(a).filter((c) => c.status === 'aberto' && c.vencimento < hoje()), (c) => c.valor)), alerta: cobs(a).some((c) => c.status === 'aberto' && c.vencimento < hoje()) }, { rot: 'Repasses pendentes', icone: 'arrows-left-right', val: moeda(soma(cobs(a).filter((c) => c.status === 'pago' && !c.repassado), (c) => repasse(ct(c.contrato), c))) }]);
  if (st.aba === 'contratos') return abas + k + a.tab({ id: 'contratos', colecao: 'contratos', singular: 'contrato', plural: 'contratos', ordem: 'fim', aoClicar: (id) => a.abrir('imovel', ct(id).imovel),
    colunas: [{ k: 'imovel', rot: 'Imóvel', valor: (c) => imovel(a, c.imovel)?.codigo, render: (c) => `<span class="prim">${esc(imovel(a, c.imovel)?.codigo || '')} · ${esc(imovel(a, c.imovel) ? titulo(imovel(a, c.imovel)) : '')}</span><span class="sub">${esc(imovel(a, c.imovel)?.endereco || '')}</span>` }, { k: 'inquilino', rot: 'Inquilino', valor: (c) => pessoa(a, c.inquilino)?.nome }, { k: 'proprietario', rot: 'Proprietário', oc: true, valor: (c) => pessoa(a, c.proprietario)?.nome }, { k: 'aluguel', rot: 'Aluguel', n: true, render: (c) => moeda(c.aluguel) }, { k: 'fim', rot: 'Vigência', render: (c) => `${dataCurta(c.inicio)} → <span class="${diasAte(c.fim) < 60 ? 'al-tx' : ''}">${dataCurta(c.fim)}</span>` }, { k: 'garantia', rot: 'Garantia', oc: true }, { k: 'docs', rot: '', ord: false, csv: false, render: (c) => { const vs = a.db.lista('vistorias').filter((v) => v.contrato === c.id); return `<span class="flex" style="gap:6px;justify-content:flex-end"><button type="button" class="btn peq" data-acao="contratoDoc" data-id="${c.id}">${ic('file-text')}Contrato</button>${vs.length ? `<button type="button" class="btn peq" data-abrir="vistoria:${vs[0].id}">${ic('clipboard-text')}Vistoria</button>` : `<button type="button" class="btn peq" data-acao="novaVistoria" data-id="${c.id}">${ic('plus')}Vistoria</button>`}</span>`; } }] });
  if (st.aba === 'repasses') { const l = cobs(a).filter((c) => c.status === 'pago'); return abas + k + a.tab({ id: 'repasses', itens: () => l, singular: 'repasse', plural: 'repasses', ordem: 'vencimento', desc: true, total: (x) => moeda(soma(x, (c) => repasse(ct(c.contrato), c))),
    visoes: [{ id: 'pend', rot: 'A repassar', filtro: (c) => !c.repassado }, { id: 'feitos', rot: 'Repassados', filtro: (c) => c.repassado }],
    massa: [{ rot: 'Marcar como repassados', icone: 'check', acao: (ids) => { ids.forEach((id) => a.db.salvar('cobrancas', { id, repassado: true })); avisar(`${ids.length} repasses feitos`); } }],
    colunas: [{ k: 'proprietario', rot: 'Proprietário', valor: (c) => pessoa(a, ct(c.contrato).proprietario)?.nome, render: (c) => `<span class="prim">${esc(pessoa(a, ct(c.contrato).proprietario)?.nome || '')}</span><span class="sub">${esc(imovel(a, ct(c.contrato).imovel)?.codigo || '')} · ${nomeMes(c.competencia)}</span>` }, { k: 'valor', rot: 'Aluguel recebido', n: true, render: (c) => moeda(c.valor) }, { k: 'taxa', rot: 'Taxa adm.', n: true, oc: true, valor: (c) => (c.valor * ct(c.contrato).taxa_adm) / 100, render: (c) => `− ${moeda((c.valor * ct(c.contrato).taxa_adm) / 100)}` }, { k: 'rep', rot: 'A repassar', n: true, valor: (c) => repasse(ct(c.contrato), c), render: (c) => `<b>${moeda(repasse(ct(c.contrato), c))}</b>` }, { k: 'repassado', rot: '', ord: false, csv: false, render: (c) => (c.repassado ? et('Repassado', 'ok') : `<button type="button" class="btn peq" data-acao="repassar" data-id="${c.id}">${ic('arrows-left-right')}Repassar</button>`) }] }); }
  return abas + k + a.tab({ id: 'cobrancas', colecao: 'cobrancas', singular: 'aluguel', plural: 'aluguéis', ordem: 'vencimento', total: (l) => moeda(soma(l, (c) => c.valor)),
    visoes: [{ id: 'atraso', rot: 'Em atraso', filtro: (c) => c.status === 'aberto' && c.vencimento < hoje() }, { id: 'mes', rot: 'Este mês', filtro: (c) => c.vencimento.startsWith(hoje().slice(0, 7)) }, { id: 'abertos', rot: 'Em aberto', filtro: (c) => c.status === 'aberto' }, { id: 'todos', rot: 'Todos' }],
    colunas: [{ k: 'vencimento', rot: 'Vencimento', render: (c) => `<span class="${c.status === 'aberto' && c.vencimento < hoje() ? 'er-tx' : ''}">${dataCurta(c.vencimento)}</span>` }, { k: 'inquilino', rot: 'Inquilino', valor: (c) => pessoa(a, ct(c.contrato).inquilino)?.nome, render: (c) => `<span class="prim">${esc(pessoa(a, ct(c.contrato).inquilino)?.nome || '')}</span><span class="sub">${esc(imovel(a, ct(c.contrato).imovel)?.codigo || '')} · ${nomeMes(c.competencia)}</span>` }, { k: 'valor', rot: 'Valor', n: true, render: (c) => moeda(c.valor) },
      { k: 'status', rot: '', ord: false, csv: false, render: (c) => (c.status === 'pago' ? et(`Pago ${dataCurta(c.pago_em)}`, 'ok') : `<span class="flex" style="gap:6px;justify-content:flex-end">${c.vencimento < hoje() ? `<a class="btn peq" target="_blank" rel="noopener" href="${telLink(pessoa(a, ct(c.contrato).inquilino)?.telefone)}?text=${encodeURIComponent(`Olá, ${pessoa(a, ct(c.contrato).inquilino)?.nome.split(' ')[0]}! Aqui é da ${a.empresa}. O aluguel de ${nomeMes(c.competencia, true)} (${moeda(c.valor)}) venceu em ${dataBR(c.vencimento)}. Posso enviar o boleto atualizado?`)}">${ic('whatsapp-logo')}Cobrar</a>` : ''}<button type="button" class="btn peq" data-acao="baixarAluguel" data-id="${c.id}">${ic('check')}Pago</button></span>`) }] });
}

function relatorios(a) {
  const fech = negs(a).filter((n) => n.etapa === 'fechado');
  return `${kpis([{ rot: 'Negócios fechados (90 dias)', icone: 'seal-check', val: num(fech.filter((n) => diasAte(n.fechado_em) > -90).length) }, { rot: 'Comissões (90 dias)', icone: 'hand-coins', val: moeda(soma(fech.filter((n) => diasAte(n.fechado_em) > -90), (n) => comissao(a, n))) }, { rot: 'Conversão', icone: 'funnel', val: pct((fech.length / (negs(a).length || 1)) * 100, 1), nota: 'atendimentos que viraram negócio' }, { rot: 'Tempo médio no mercado', icone: 'hourglass', val: `${Math.round(soma(a.db.lista('imoveis').filter((x) => x.status === 'disponivel'), (x) => -diasAte(x.captado)) / (a.db.lista('imoveis').filter((x) => x.status === 'disponivel').length || 1))} dias`, nota: 'imóveis disponíveis' }])}
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Por corretor</h3></div></div><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Corretor</th><th class="n">Captações</th><th class="n">Em atendimento</th><th class="n">Fechados</th><th class="n">Comissões</th></tr></thead><tbody>${CORRETORES.map(([id, n, creci]) => `<tr><td><span class="flex">${av(n, 'p')}<span><b>${esc(n)}</b><span class="sub">${creci}</span></span></span></td><td class="n">${a.db.lista('imoveis').filter((x) => x.corretor === id).length}</td><td class="n">${negs(a).filter((x) => x.corretor === id && !['fechado', 'perdido'].includes(x.etapa)).length}</td><td class="n">${fech.filter((x) => x.corretor === id).length}</td><td class="n">${moeda(soma(fech.filter((x) => x.corretor === id), (x) => comissao(a, x)))}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Estoque por bairro</h3><div class="sub">Imóveis disponíveis</div></div></div><div class="cartao-corpo">${barrasH(BAIRROS.map((b) => ({ rot: b, v: a.db.lista('imoveis').filter((x) => x.bairro === b && x.status === 'disponivel').length })).sort((x, y) => y.v - x.v))}</div></div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Motivos de perda</h3></div></div><div class="cartao-corpo">${barrasH(Object.entries(agrupar(negs(a).filter((n) => n.etapa === 'perdido'), (n) => n.motivo || 'Sem motivo')).map(([m, l]) => ({ rot: m, v: l.length })))}</div></div>`;
}

// ---------------------------------------------------------------- fichas
const fichas = {
  vistoria(a, id) {
    const v = a.db.obter('vistorias', id); if (!v) return null; const c = a.db.obter('contratos', v.contrato), x = imovel(a, c?.imovel);
    return { html: ficha({ tipo: `Vistoria de ${v.tipo === 'saida' ? 'saída' : 'entrada'}`, icone: 'clipboard-text', titulo: `${esc(x?.codigo || '')} · ${esc(x ? titulo(x) : '')}`, sub: `<span>${dataCurta(v.data)} · ${esc(nomeCor(v.corretor))}</span>`,
      extra: `<div class="flex" style="margin-top:12px"><button type="button" class="btn" data-acao="imprimirVistoria" data-id="${id}">${ic('printer')}Imprimir laudo</button></div>`,
      corpo: `<div class="gav-sec"><table class="tabela"><thead><tr><th>Cômodo</th><th>Estado</th><th>Observações</th></tr></thead><tbody>${v.comodos.map((k) => `<tr><td>${esc(k.nome)}</td><td>${et(ESTADOS.find((e) => e[0] === k.estado)?.[1] || '', k.estado === 'bom' ? 'ok' : k.estado === 'ruim' ? 'er' : 'al')}</td><td>${esc(k.obs || '')}</td></tr>`).join('')}</tbody></table></div>${a.anexos.html('vistorias', id, { titulo: 'Fotos da vistoria', dica: 'Fotografe cada cômodo: as fotos ficam guardadas com o laudo.' })}` }) };
  },
  imovel(a, id) {
    const x = imovel(a, id); if (!x) return null; const pr = pessoa(a, x.proprietario), vs = a.db.lista('visitas').filter((v) => v.imovel === id).sort((u, w) => w.data.localeCompare(u.data)), int = negs(a).filter((n) => n.imovel === id && !['perdido'].includes(n.etapa));
    return { html: ficha({ tipo: x.finalidade === 'venda' ? 'Imóvel à venda' : 'Imóvel para alugar', icone: 'buildings', titulo: `${esc(x.codigo)} · ${esc(titulo(x))}`, sub: `${etSt(x)}<b class="num" style="color:var(--tx)">${valorFmt(x)}</b>`,
      extra: `<div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn pri" data-acao="novaVisita" data-im="${id}">${ic('calendar-plus')}Marcar visita</button><button type="button" class="btn" data-acao="compartilhar" data-id="${id}">${ic('whatsapp-logo')}Enviar para cliente</button>${x.status === 'disponivel' ? `<button type="button" class="btn" data-acao="statusIm" data-id="${id}" data-s="reservado">${ic('lock')}Reservar</button>` : x.status === 'reservado' ? `<button type="button" class="btn" data-acao="statusIm" data-id="${id}" data-s="disponivel">${ic('lock-open')}Liberar</button>` : ''}<button type="button" class="btn" data-acao="imprimirIm" data-id="${id}">${ic('printer')}Ficha</button></div>`,
      corpo: `<div class="gav-sec">${capa(x, 150)}</div><div class="gav-sec">${props([['map-pin', 'Endereço', `${esc(x.endereco)} · ${esc(x.bairro)}`], ['ruler', 'Área', `${x.area} m²`], ['bed', 'Quartos', x.quartos ? `${x.quartos}${x.suites ? ` (${x.suites} suíte${x.suites > 1 ? 's' : ''})` : ''}` : null], ['car', 'Vagas', String(x.vagas)], ['buildings', 'Condomínio', x.condominio ? moeda(x.condominio) : null], ['receipt', 'IPTU', x.iptu ? moeda(x.iptu) : null], ['user', 'Proprietário', pr ? `${esc(pr.nome)} · <a href="${telLink(pr.telefone)}" target="_blank" rel="noopener">WhatsApp</a>` : null], ['user-circle', 'Captador', esc(nomeCor(x.corretor))], ['calendar-plus', 'Captado', `${dataCurta(x.captado)} · ${relativo(x.captado)}`], ['eye', 'Visualizações', num(x.visualizacoes)]])}<p style="color:var(--tx-2);margin-top:10px">${esc(x.descricao || '')}</p></div>${a.anexos.html('imoveis', id, { titulo: 'Fotos do imóvel', dica: 'As fotos aparecem na vitrine online e no link enviado ao cliente.' })}
        ${x.finalidade === 'venda' ? (() => { const st = a.estado.sim ||= { ent: 20, anos: 30, taxa: 10.5 }; const ent = Math.round((x.valor * st.ent) / 100), parc = parcelaPrice(x.valor, ent, st.anos, st.taxa); return `<div class="gav-sec"><h4>Simulador de financiamento</h4><div class="form-grade tres"><label class="campo">Entrada (%)<input type="number" min="0" max="90" value="${st.ent}" data-mudar="simFin" data-k="ent"></label><label class="campo">Prazo (anos)<input type="number" min="5" max="35" value="${st.anos}" data-mudar="simFin" data-k="anos"></label><label class="campo">Juros ao ano (%)<input type="number" step="0.1" value="${st.taxa}" data-mudar="simFin" data-k="taxa"></label></div>${props([['money', 'Entrada', moeda(ent)], ['calculator', 'Parcela estimada (Price)', `<b>${moeda(parc)}</b>`], ['user', 'Renda sugerida', moeda(parc / 0.3)]])}</div>`; })() : ''}
        <div class="gav-sec"><h4>Interessados (${int.length})</h4>${int.length ? `<ul class="lista" style="margin:0 -20px">${int.map((n) => `<li class="clicavel" data-abrir="negocio:${n.id}">${av(pessoa(a, n.cliente)?.nome || '?', 'p')}<div class="cresce t">${esc(pessoa(a, n.cliente)?.nome || '')}</div>${et(ETAPAS.find((e) => e[0] === n.etapa)?.[1] || '', 'info')}</li>`).join('')}</ul>` : '<p class="mute">Ninguém ainda.</p>'}</div>
        <div class="gav-sec"><h4>Visitas (${vs.length})</h4>${vs.length ? linhaDoTempo(vs.slice(0, 8).map((v) => ({ quando: v.data, icone: v.status === 'realizada' ? 'check' : v.status === 'cancelada' ? 'x' : 'calendar-blank', tom: v.status === 'realizada' ? 'ok' : '', html: `${esc(pessoa(a, v.cliente)?.nome || '')} · ${v.hora}${v.feedback ? `<div class="mute">“${esc(v.feedback)}”</div>` : ''}` }))) : '<p class="mute">Nenhuma visita.</p>'}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="imoveis" data-id="${id}">${ic('pencil-simple')}Editar</button>` }) };
  },
  negocio(a, id) {
    const n = a.db.obter('negocios', id); if (!n) return null; const c = pessoa(a, n.cliente), x = imovel(a, n.imovel), comp = compativeis(a, n).slice(0, 6), i = ETAPAS.findIndex((e) => e[0] === n.etapa);
    return { html: ficha({ tipo: n.finalidade === 'venda' ? 'Atendimento · compra' : 'Atendimento · aluguel', icone: 'handshake', titulo: esc(c?.nome || ''), avatar: av(c?.nome || '?', 'gg'), sub: `<span>${esc(n.origem)}</span><span class="flex" style="gap:5px">· ${av(nomeCor(n.corretor), 'p')}${esc(nomeCor(n.corretor))}</span>`,
      extra: `<div class="etapas" style="margin-top:12px">${ETAPAS.map(([s, nm], j) => `<button type="button" class="${j < i ? 'feita' : j === i ? 'atual' : ''}" data-acao="etapaNeg" data-id="${id}" data-s="${s}">${nm}</button>`).join('')}</div><div class="flex" style="margin-top:12px;flex-wrap:wrap">${c?.telefone ? `<a class="btn" target="_blank" rel="noopener" href="${telLink(c.telefone)}">${ic('whatsapp-logo')}WhatsApp</a>` : ''}${x ? `<button type="button" class="btn" data-acao="novaVisita" data-im="${x.id}" data-n="${id}">${ic('calendar-plus')}Marcar visita</button>` : ''}${n.etapa !== 'perdido' && n.etapa !== 'fechado' ? `<button type="button" class="btn fant" data-acao="perderNeg" data-id="${id}">${ic('x')}Perdido</button>` : ''}</div>`,
      corpo: `<div class="gav-sec">${props([['house-line', 'Imóvel de interesse', x ? `<a href="#" data-abrir="imovel:${x.id}">${esc(x.codigo)} · ${esc(titulo(x))}</a> · ${valorFmt(x)}` : '<span class="mute">ainda não escolhido</span>'], ['magnifying-glass', 'Procura', `${esc(n.busca?.tipo || 'qualquer tipo')} · ${n.busca?.quartos || 0}+ quartos · até ${moeda(n.busca?.ate)}${n.busca?.bairros?.length ? ` · ${n.busca.bairros.map(esc).join(', ')}` : ''}`], ['hand-coins', 'Comissão prevista', moeda(comissao(a, n))], ['calendar-plus', 'Entrou', `${dataCurta(n.criado)} · ${relativo(n.criado)}`]])}</div>
        <div class="gav-sec"><h4>Imóveis compatíveis (${compativeis(a, n).length})</h4>${comp.length ? `<ul class="lista" style="margin:0 -20px">${comp.map((y) => `<li><span class="mono mute-2" style="width:48px">${esc(y.codigo)}</span><div class="cresce"><div class="t corta">${esc(titulo(y))}</div><div class="s">${valorFmt(y)} · ${y.area} m²</div></div><button type="button" class="btn peq" data-acao="escolherIm" data-id="${id}" data-im="${y.id}">${y.id === n.imovel ? ic('check') : ''}${y.id === n.imovel ? 'Escolhido' : 'Escolher'}</button><a class="btn fant peq ic-so" target="_blank" rel="noopener" href="${telLink(c?.telefone)}?text=${encodeURIComponent(textoImovel(a, y))}" aria-label="Enviar no WhatsApp">${ic('whatsapp-logo')}</a></li>`).join('')}</ul>` : '<p class="mute">Nenhum imóvel disponível com esse perfil.</p>'}</div>
        <div class="gav-sec"><h4>Histórico</h4>${linhaDoTempo(a.db.historico(`negocios:${id}`).map((h) => ({ quando: h.quando, icone: h.icone, tom: h.tom, html: esc(h.texto) })))}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarNeg" data-id="${id}">${ic('pencil-simple')}Editar</button>` }), montar: () => {} };
  },
  visita(a, id) {
    const v = a.db.obter('visitas', id); if (!v) return null; const x = imovel(a, v.imovel), c = pessoa(a, v.cliente);
    return { estreita: true, html: ficha({ tipo: 'Visita', icone: 'calendar-check', titulo: esc(c?.nome || ''), sub: `<span>${DIAS_L[paraData(v.data).getDay()]}, ${dataCurta(v.data)} · ${v.hora}</span>${v.status === 'realizada' ? et('Realizada', 'ok') : v.status === 'cancelada' ? et('Cancelada', '') : et('Agendada', 'info')}`,
      extra: v.status === 'agendada' ? `<div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn pri ok" data-acao="visitaFeita" data-id="${id}">${ic('check')}Visita feita</button><a class="btn" target="_blank" rel="noopener" href="${telLink(c?.telefone)}?text=${encodeURIComponent(`Olá, ${c?.nome.split(' ')[0]}! Confirmando nossa visita ${DIAS_L[paraData(v.data).getDay()]}, ${dataBR(v.data)} às ${v.hora}, no imóvel ${x?.codigo} (${x?.endereco}, ${x?.bairro}). Te espero lá! ${nomeCor(v.corretor)} · ${a.empresa}`)}">${ic('whatsapp-logo')}Confirmar</a><button type="button" class="btn fant" data-acao="cancelarVisita" data-id="${id}">${ic('x')}Cancelar</button></div>` : '',
      corpo: `<div class="gav-sec">${props([['house-line', 'Imóvel', x ? `<a href="#" data-abrir="imovel:${x.id}">${esc(x.codigo)} · ${esc(titulo(x))}</a>` : null], ['map-pin', 'Endereço', x ? `${esc(x.endereco)} · ${esc(x.bairro)}` : null], ['user-circle', 'Corretor', esc(nomeCor(v.corretor))], ['chat-circle', 'Retorno do cliente', v.feedback ? esc(v.feedback) : null]])}</div>` }) };
  },
};

// ---------------------------------------------------------------- aplicativo
const app = criarApp({
  id: 'imobiliaria', nome: 'Veltria Imobiliária', sub: 'Imobiliárias e corretores', cor: '#15803d', icone: 'buildings', empresa: 'Alto Padrão Imóveis', conta: 'Venda e locação · Curitiba',
  produto: { mensal: 129 }, semente, colecoes, fichas, buscaDica: 'imóveis, clientes e códigos',
  portal: {
    vitrine: {
      explica: 'A vitrine online da imobiliária: todos os imóveis disponíveis, com fotos e simulador de financiamento. O pedido de visita entra direto no funil.',
      montar: async (a, _r, { fotos }) => ({ imoveis: await Promise.all(a.db.lista('imoveis').filter((x) => x.status === 'disponivel').sort((x, y) => Number(!!y.destaque) - Number(!!x.destaque)).map(async (x) => ({ codigo: x.codigo, titulo: titulo(x), tipo: x.tipo, finalidade: x.finalidade, bairro: x.bairro, area: x.area, quartos: x.quartos, vagas: x.vagas, valor: x.valor, condominio: x.condominio, descricao: x.descricao, fotos: (await fotos(x, 8)).map((f) => f.url) }))) }),
      responder: (a, r) => {
        if (r.acao !== 'visita') return '';
        const x = a.db.lista('imoveis').find((y) => y.codigo === r.dados.codigo); const tel = String(r.dados.telefone || '').replace(/\D/g, '');
        let c = a.db.lista('pessoas').find((p) => tel && String(p.telefone).replace(/\D/g, '') === tel);
        if (!c) c = a.db.salvar('pessoas', { nome: String(r.dados.nome || 'Interessado').slice(0, 80), telefone: r.dados.telefone || '', tipo: 'interessado', email: '' });
        const n = a.db.salvar('negocios', { cliente: c.id, finalidade: x?.finalidade || 'venda', imovel: x?.id || null, valor: x?.valor || 0, etapa: x ? 'atendimento' : 'lead', corretor: x?.corretor || 'co0', origem: 'Site', criado: hoje(), atualizado: hoje(), busca: { tipo: x?.tipo, ate: x ? Math.round(x.valor * 1.15) : 0, quartos: x?.quartos || 0, bairros: x ? [x.bairro] : [] } });
        a.db.registrar(`negocios:${n.id}`, `Pediu visita pela vitrine online${r.dados.quando ? `: ${String(r.dados.quando).slice(0, 80)}` : ''}`, { icone: 'globe', tom: 'acc' });
        return `${c.nome.split(' ')[0]} pediu visita ao ${x?.codigo || 'imóvel'} pela vitrine online`;
      },
    },
  },
  modelos: [
    { id: 'tradicional', nome: 'Venda e locação', desc: 'Imobiliária completa: captação, venda, locação e administração', dados: {} },
    { id: 'administradora', nome: 'Administradora de aluguéis', desc: 'Foco em contratos, cobranças, repasses e vistorias', dados: {}, aoAplicar: (a) => { a.db.cfg.foco = 'locacao'; } },
    { id: 'corretor', nome: 'Corretor autônomo', desc: 'Carteira de imóveis, clientes e visitas, sem locação', dados: {}, aoAplicar: (a) => { a.db.cfg.foco = 'venda'; } },
  ],
  passos: (a) => [{ id: 'vitrine', rot: 'Publique a vitrine online', feito: !!a.db.cfg.links?.['vitrine:'], acao: 'linkVitrine' }, { id: 'fotos', rot: 'Coloque fotos em um imóvel', feito: a.db.lista('imoveis').some((x) => (x._anexos || []).length) }],
  equipe: [['Ricardo Moser', 'Diretor'], ...CORRETORES.map(([, n]) => [n, 'Corretor(a)']), ['Luana Pacheco', 'Locação e financeiro']],
  busca: [{ colecao: 'imoveis', grupo: 'Imóveis', icone: 'buildings', ficha: 'imovel', rot: (x) => `${x.codigo} · ${titulo(x)}`, sub: (x) => moeda(x.valor) }, { colecao: 'negocios', grupo: 'Atendimentos', icone: 'handshake', ficha: 'negocio', rot: (n, a) => pessoa(a, n.cliente)?.nome || '', sub: (n) => ETAPAS.find((e) => e[0] === n.etapa)?.[1] }],
  comandos: [{ rot: 'Captar imóvel', icone: 'buildings', acao: (a) => a.acoes.novoCad({ c: 'imoveis' }) }, { rot: 'Novo atendimento', icone: 'handshake', acao: (a) => a.acoes.novoCad({ c: 'negocios' }) }, { rot: 'Marcar visita', icone: 'calendar-plus', acao: (a) => a.acoes.novaVisita({}) }],
  paginas: [
    { id: 'painel', lado: FERR.visitas, rot: 'Painel', icone: 'house', titulo: 'Visão geral', render: painel, atalho: 'i' },
    { id: 'imoveis', lado: FERR.imoveis, rot: 'Imóveis', icone: 'buildings', render: imoveisPag, atalho: 'm', novo: (a) => a.acoes.novoCad({ c: 'imoveis' }) },
    { id: 'funil', rot: 'Funil de clientes', icone: 'funnel', render: funil, cheio: true, atalho: 'f', cont: (a) => negs(a).filter((n) => n.etapa === 'lead').length },
    { id: 'visitas', rot: 'Visitas', icone: 'calendar-blank', render: visitasPag, cheio: true, atalho: 'v' },
    { grupo: 'Locação' },
    { id: 'locacao', lado: FERR.locacao, rot: 'Aluguéis e repasses', icone: 'key', render: locacao, cont: (a) => { const n = cobs(a).filter((c) => c.status === 'aberto' && c.vencimento < hoje()).length; return n ? { n, tom: 'er' } : 0; } },
    { grupo: 'Gestão' },
    { id: 'pessoas', rot: 'Clientes e proprietários', icone: 'users', render: (a) => a.tab({ id: 'pessoas', colecao: 'pessoas', singular: 'pessoa', plural: 'pessoas', ordem: 'nome', novo: { rot: 'Nova pessoa', attrs: 'data-acao="novoCad" data-c="pessoas"' }, aoClicar: async (id) => { if (await editar(a, 'pessoas', pessoa(a, id))) a.render(); }, visoes: [{ id: 'int', rot: 'Interessados', filtro: (p) => p.tipo === 'interessado' }, { id: 'prop', rot: 'Proprietários', filtro: (p) => p.tipo === 'proprietario' }, { id: 'inq', rot: 'Inquilinos', filtro: (p) => p.tipo === 'inquilino' }, { id: 'todos', rot: 'Todos' }], colunas: [{ k: 'nome', rot: 'Nome', render: (p) => `<span class="flex" style="gap:9px">${av(p.nome)}<span class="prim">${esc(p.nome)}</span></span>` }, { k: 'telefone', rot: 'WhatsApp' }, { k: 'email', rot: 'E-mail', oc: true }, { k: 'tipo', rot: 'Tipo', render: (p) => et({ interessado: 'Interessado', proprietario: 'Proprietário', inquilino: 'Inquilino' }[p.tipo], '', 'sem-ponto') }] }) },
    { id: 'relatorios', rot: 'Relatórios', icone: 'chart-bar', render: relatorios },
    paginaEquipe(EQUIPE),
    ...ferramentaPaginas(FERR, FERR_ITENS),
  ],
});

const reab = () => { app.render(); app.reabrir(); };
Object.assign(app.acoes, {
  finIm: (d) => { app.estado.ims.fin = d.f; app.render(); },
  bairroIm: (d, el) => { app.estado.ims.bairro = el.value; app.render(); },
  modoIm: (d) => { app.estado.ims.modo = d.m; app.render(); },
  statusIm: (d) => { app.db.salvar('imoveis', { id: d.id, status: d.s }); avisar(d.s === 'reservado' ? 'Imóvel reservado' : 'Imóvel liberado'); reab(); },
  compartilhar: async (d) => { const x = imovel(app, d.id); const r = await modal({ titulo: 'Enviar imóvel no WhatsApp', largura: 460, corpo: `<label class="campo">Cliente<select data-c>${app.db.lista('pessoas').filter((p) => p.tipo === 'interessado').map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select></label><pre style="white-space:pre-wrap;font-size:12.5px;background:var(--painel-2);padding:10px;border-radius:8px;margin-top:10px">${esc(textoImovel(app, x))}</pre>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Abrir WhatsApp', classe: 'pri', icone: 'whatsapp-logo', acao: (f) => f.querySelector('[data-c]').value }] }); if (!r) return; const [ini, fim] = (await app.portal.link('vitrine', '')).split('#'); window.open(`${telLink(pessoa(app, r).telefone)}?text=${encodeURIComponent(`${textoImovel(app, x)}

Fotos e simulação de financiamento: ${ini}?i=${x.codigo}#${fim}`)}`, '_blank', 'noopener'); },
  imprimirIm: (d) => { const x = imovel(app, d.id); imprimir(`<div class="doc"><div class="entre"><h1>${esc(app.empresa)}</h1><span>${esc(app.db.cfg.creci)} · ${esc(app.db.cfg.telefone)}</span></div><h2>${esc(x.codigo)} · ${esc(titulo(x))}</h2><p style="font-size:20px"><b>${moeda(x.valor)}${x.finalidade === 'aluguel' ? '/mês' : ''}</b></p><table><tr><td>Área</td><td>${x.area} m²</td><td>Quartos</td><td>${x.quartos}</td></tr><tr><td>Vagas</td><td>${x.vagas}</td><td>Condomínio</td><td>${moeda(x.condominio)}</td></tr><tr><td>Endereço</td><td colspan="3">${esc(x.endereco)} · ${esc(x.bairro)} · ${esc(x.cidade)}</td></tr></table><p>${esc(x.descricao)}</p><p>Corretor: ${esc(nomeCor(x.corretor))}</p></div>`); },
  novaVisita: async (d = {}) => {
    const r = await modal({ titulo: 'Marcar visita', largura: 560, corpo: `<form class="form-grade"><label class="campo largo">Imóvel<select name="im">${app.db.lista('imoveis').filter((x) => x.status !== 'vendido').map((x) => `<option value="${x.id}" ${x.id === d.im ? 'selected' : ''}>${esc(x.codigo)} · ${esc(titulo(x))}</option>`).join('')}</select></label><label class="campo largo">Cliente<select name="c">${app.db.lista('pessoas').filter((p) => p.tipo === 'interessado').map((p) => `<option value="${p.id}" ${d.n && app.db.obter('negocios', d.n)?.cliente === p.id ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></label><label class="campo">Data<input type="date" name="data" value="${d.data || diaMais(1)}"></label><label class="campo">Hora<input type="time" name="hora" value="${d.hora || '10:00'}" step="900"></label><label class="campo">Corretor<select name="co">${CORRETORES.map(([id, n]) => `<option value="${id}">${n}</option>`).join('')}</select></label></form>`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Marcar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
    if (!r) return; const n = d.n ? app.db.obter('negocios', d.n) : negs(app).find((x) => x.cliente === r.c && !['fechado', 'perdido'].includes(x.etapa));
    app.db.salvar('visitas', { imovel: r.im, cliente: r.c, negocio: n?.id || null, corretor: r.co, data: r.data, hora: r.hora, status: 'agendada' });
    if (n && ['lead', 'atendimento'].includes(n.etapa)) { app.db.salvar('negocios', { id: n.id, etapa: 'visita', imovel: r.im, valor: imovel(app, r.im).valor, atualizado: hoje() }); app.db.registrar(`negocios:${n.id}`, `Visita marcada (${imovel(app, r.im).codigo})`, { icone: 'calendar-plus' }); }
    avisar(`Visita marcada para ${dataCurta(r.data)}, ${r.hora}`); reab();
  },
  visitaFeita: async (d) => { const r = await modal({ titulo: 'Como foi a visita?', largura: 460, corpo: '<label class="campo">Retorno do cliente<textarea data-f placeholder="O que ele achou, objeções, próximos passos"></textarea></label>', botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Salvar', classe: 'pri', acao: (f) => f.querySelector('[data-f]').value }] }); if (r == null) return; app.db.salvar('visitas', { id: d.id, status: 'realizada', feedback: r }); avisar('Visita registrada'); reab(); },
  cancelarVisita: (d) => { app.db.salvar('visitas', { id: d.id, status: 'cancelada' }); avisar('Visita cancelada'); reab(); },
  semVis: (d) => { app.estado.vis.data = d.d === '0' ? hoje() : diaMais(Number(d.d), app.estado.vis.data); app.render(); },
  etapaNeg: (d) => { app.kanbans.funil ? app.kanbans.funil(d.id, d.s) : app.db.salvar('negocios', { id: d.id, etapa: d.s }); reab(); },
  escolherIm: (d) => { const x = imovel(app, d.im); app.db.salvar('negocios', { id: d.id, imovel: d.im, valor: x.valor, atualizado: hoje(), ...(app.db.obter('negocios', d.id).etapa === 'lead' ? { etapa: 'atendimento' } : {}) }); app.db.registrar(`negocios:${d.id}`, `Interesse em ${x.codigo}`, { icone: 'house-line' }); reab(); },
  perderNeg: async (d) => { const r = await modal({ titulo: 'Marcar como perdido', largura: 420, corpo: `<label class="campo">Motivo<select data-m>${['Comprou com outra imobiliária', 'Desistiu', 'Sem crédito aprovado', 'Não encontrou o imóvel', 'Sem resposta'].map((m) => `<option>${m}</option>`).join('')}</select></label>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Confirmar', classe: 'pri perigo', acao: (f) => f.querySelector('[data-m]').value }] }); if (!r) return; app.db.salvar('negocios', { id: d.id, etapa: 'perdido', motivo: r, atualizado: hoje() }); avisar('Atendimento marcado como perdido'); reab(); },
  fecharNegocio: (d) => { const n = app.db.obter('negocios', d.id); if (n.imovel) app.db.salvar('imoveis', { id: n.imovel, status: n.finalidade === 'venda' ? 'vendido' : 'alugado' }); avisar(`Negócio fechado · comissão de ${moeda(comissao(app, n))}`); },
  editarNeg: async (d) => { const n = app.db.obter('negocios', d.id); if (await editar(app, 'negocios', { ...n, b_tipo: n.busca?.tipo, b_ate: n.busca?.ate, b_quartos: n.busca?.quartos })) reab(); },
  linkVitrine: () => app.portal.compartilhar('vitrine', '', { titulo: 'Vitrine online da imobiliária', qr: true, texto: `Veja os imóveis disponíveis na ${app.empresa}:` }),
  simFin: (d, el) => { app.estado.sim[d.k] = Number(el.value) || 0; app.reabrir(); },
  contratoDoc: (d) => imprimir(docContrato(app, app.db.obter('contratos', d.id))),
  imprimirVistoria: (d) => imprimir(docVistoria(app, app.db.obter('vistorias', d.id))),
  novaVistoria: async (d) => {
    const c = app.db.obter('contratos', d.id), x = imovel(app, c.imovel), comodos = COMODOS.filter((k, i) => i < 2 || !/^Quarto/.test(k) || Number(k.slice(-1)) <= (x?.quartos || 1)).filter((k) => k !== 'Garagem' || x?.vagas);
    const r = await modal({ titulo: `Vistoria de entrada · ${x?.codigo}`, largura: 640, corpo: `<form class="col" style="gap:8px"><div class="form-grade"><label class="campo">Tipo<select name="tipo"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label><label class="campo">Vistoriador<select name="corretor">${CORRETORES.map(([id, n]) => `<option value="${id}">${n}</option>`).join('')}</select></label></div>
      ${comodos.map((k, i) => `<div class="form-grade" style="grid-template-columns:1.2fr 1fr 2fr;align-items:end"><b style="padding-bottom:8px">${esc(k)}</b><label class="campo">Estado<select name="e${i}">${ESTADOS.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select></label><label class="campo">Observações<input name="o${i}" placeholder="Pintura, piso, portas…"></label></div>`).join('')}</form>`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Salvar vistoria', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
    if (!r) return;
    const v = app.db.salvar('vistorias', { contrato: c.id, tipo: r.tipo, corretor: r.corretor, data: hoje(), comodos: comodos.map((k, i) => ({ nome: k, estado: r[`e${i}`], obs: r[`o${i}`] })) });
    avisar('Vistoria salva. Agora adicione as fotos de cada cômodo.'); app.render(); app.abrir('vistoria', v.id);
  },
  abaLoc: (d) => { app.estado.loc.aba = d.a; app.render(); },
  baixarAluguel: (d) => { app.db.salvar('cobrancas', { id: d.id, status: 'pago', pago_em: hoje() }); avisar('Aluguel recebido · repasse ao proprietário pendente'); app.render(); },
  repassar: (d) => { const c = app.db.obter('cobrancas', d.id), ct = app.db.obter('contratos', c.contrato); app.db.salvar('cobrancas', { id: d.id, repassado: true }); avisar(`Repasse de ${moeda(repasse(ct, c))} para ${pessoa(app, ct.proprietario).nome}`); app.render(); },
  novoCad: async (d) => { const s = await editar(app, d.c); if (s) { app.render(); if (d.c === 'negocios') app.abrir('negocio', s.id); } },
  editarCad: async (d) => { if (await editar(app, d.c, app.db.obter(d.c, d.id))) reab(); },
});

// demonstração aberta antes das fotos de exemplo: coloca as fotos nos imóveis originais que ainda não têm nenhuma
if (!app.nuvem && app.db) {
  let mudou = false;
  for (const im of semente().imoveis) {
    const x = app.db.obter('imoveis', im.id);
    if (x && !(x._anexos || []).length) { x._anexos = im._anexos; mudou = true; }
  }
  if (mudou) { app.db.gravar(); if (typeof app.render === 'function') app.render(); }
}

// ferramentas do painel ao lado das telas (WhatsApp e copiar)
equipeViva(app, EQUIPE);
Object.assign(app.acoes, acoesLado());
app.travarLado = travarPro;   // avisos e mensagens prontas: plano Pro (calculadoras: Básico)
