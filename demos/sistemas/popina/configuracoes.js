// Popina · Configurações (19/11/2026): tudo o que a pessoa ajusta num lugar só, em seções.
// Perfil · Esquema de cores · Sua marca · Guia · Restaurante e impressão · Minha assinatura (bloco compartilhado ../base/assinatura.js).
// Um visual só (o dono tirou os vários visuais): o esquema troca só os tons da casa (o marrom do menu e o destaque),
// sempre dentro da identidade "taberna"; a cor da marca do restaurante continua livre.
// Guarda só campos novos em db.config.loja.esquema e db.config.perfis[e-mail]: nada do que já existe muda de nome.
import { db, t, grava, CONTA, lojaCfg, setLoja, corLoja } from './loja.js?v=51';
import { ir, rota } from './nucleo.js?v=51';
import { ico, folha, toast, confirma, $, $$ } from './ui.js?v=51';
import { G, volta, reduzir, planoMarca } from './gestao.js?v=51';
import { formatoPadrao, setFormato, autoImprimir, setAutoImprimir } from './imprimir.js?v=51';
import { recomecar } from './loja.js?v=51';
import { abrirPrimeiroAcesso } from './primeiro-acesso.js?v=51';

// ------------------------------------------------------------------ esquemas de cor (identidade do Popina)
// escuro: menu do computador, faixa e etiquetas escuras · destaque: a cor dos botões (vira a cor da marca ao escolher)
// 22/11/2026: paletas clean (o dono recusou o laranja). Fundo claro e texto escuro sempre iguais; muda o menu escuro e o destaque.
// Os ids antigos (taberna, oliva, brasa, azulejo) caem no padrão Vinho (22/11: logo P com o ponto dourado).
export const ESQUEMAS = [
  { id: 'vinho', nome: 'Vinho', escuro: '#2A1519', escuro2: '#3D2027', destaque: '#6B2737', txt: 'Vinho com dourado, o padrão do Popina' },
  { id: 'esmeralda', nome: 'Esmeralda', escuro: '#141816', escuro2: '#262C29', destaque: '#1B6B4A', txt: 'Verde-esmeralda sóbrio' },
  { id: 'grafite', nome: 'Grafite', escuro: '#17191C', escuro2: '#2A2D31', destaque: '#33383D', txt: 'Preto e cinza, sem cor nenhuma' },
  { id: 'ardosia', nome: 'Ardósia', escuro: '#252433', escuro2: '#363549', destaque: '#54528F', txt: 'Violeta-ardósia discreto' },
  { id: 'indigo', nome: 'Índigo', escuro: '#12151C', escuro2: '#232836', destaque: '#274C8E', txt: 'Azul índigo profundo' },
  { id: 'ameixa', nome: 'Ameixa', escuro: '#161216', escuro2: '#2A222A', destaque: '#6A2C5A', txt: 'Ameixa escura' },
];
export const esquema = () => ESQUEMAS.find((e) => e.id === lojaCfg().esquema) || ESQUEMAS[0];
const CORES = ['#6B2737', '#1B6B4A', '#2F5D46', '#33383D', '#54528F', '#274C8E', '#3F5872', '#6A2C5A', '#8A3047', '#5B4A7A', '#1A1D1B'];

// ------------------------------------------------------------------ "Como usar" de cada tela
export const COMO = {
  salao: ['Salão', ['Cada quadrado é uma mesa: livre, ocupada, pediu a conta ou com prato pronto.', 'Toque na mesa para abrir, lançar itens e mandar para a cozinha.', 'Pedidos e chamados que chegam pelo QR da mesa aparecem no alto.']],
  pedidos: ['Pedidos', ['Balcão, retirada e delivery num lugar só.', '“Novo pedido” lança na hora; os do cardápio online entram sozinhos.', 'Toque no pedido para mudar a situação, imprimir ou mandar no WhatsApp.']],
  cozinha: ['Cozinha', ['O que precisa ser feito, do mais antigo para o mais novo.', 'Toque em “Pronto” quando sair: o garçom fica sabendo.', '“Imprimir sozinho” manda cada pedido novo para a impressora.']],
  caixa: ['Caixa', ['As contas abertas e as que pediram para fechar.', 'Receba em Pix (QR com o valor), cartão, dinheiro ou dividido.', 'No fim do dia, feche o caixa e mande o resumo ao dono.']],
  mais: ['Gestão', ['Cardápio, mesas e QR, estoque, relatórios, clientes, entregadores e equipe.', 'Configurações reúne perfil, cores, marca, guia, impressão e assinatura.']],
  cardapio: ['Cardápio', ['Pratos com preço, tamanhos, foto e complementos.', 'Desligue um item quando acabar: ele some do cardápio do cliente.']],
  mesas: ['Mesas e QR', ['Diga quantas mesas tem e imprima o QR de cada uma.', 'O link do delivery vai na bio do Instagram e no WhatsApp.']],
  estoque: ['Estoque', ['O que tem e o que está acabando.', 'A lista de compras se monta sozinha com o que está baixo.']],
  relatorios: ['Relatórios', ['Escolha o período no alto.', 'Vendas, mais vendidos, horários de movimento e garçons.']],
  clientes: ['Clientes e fiado', ['Quem pede, quanto gasta e quem deve.', 'Receba o fiado e mande a cobrança pelo WhatsApp.']],
  equipe: ['Equipe', ['Cada funcionário tem foto, função e um PIN de 4 números: toque no nome no topo para trocar de usuário e bater o ponto.', 'A função já traz as permissões; ajuste o desconto, o cancelamento e a sangria de cada um.', 'Em “Fechamento do dia” sai o 10% de cada garçom e o acerto de cada entregador.']],
  restaurante: ['Restaurante', ['Nome, contato, horários, Pix, entrega e taxas por bairro.', 'Fora do horário o cardápio online mostra “fechado”.']],
  config: ['Configurações', ['Perfil, esquema de cores, sua marca, guia, impressão e assinatura.', 'Use os atalhos no alto para ir direto a uma seção.']],
};
const ORDEM = ['salao', 'pedidos', 'cozinha', 'caixa', 'cardapio', 'mesas', 'estoque', 'relatorios', 'clientes', 'equipe', 'restaurante', 'config'];
export function comoUsar(k) {
  const c = COMO[k] || COMO.salao;
  folha({ titulo: `Como usar: ${c[0]}`, corpo: `<ol class="como-lista">${c[1].map((x) => `<li>${t(x)}</li>`).join('')}</ol>`,
    pe: `<button type="button" class="bt" data-ir="mais/config/cfg-guia" data-fechar>Todas as telas</button><button type="button" class="bt cheio" data-fechar>Entendi</button>` });
}
// tela atual para o botão ? (sub-telas da Gestão têm o próprio guia)
const telaAtual = () => { const { nome, args } = rota(); return nome === 'mais' && args[0] && COMO[args[0]] ? args[0] : COMO[nome] ? nome : 'salao'; };

// ------------------------------------------------------------------ quem está usando
const papel = () => (CONTA && window.veltriaAbrir ? window.veltriaAbrir.papel : 'dono');
const gestor = () => !CONTA || ['dono', 'admin'].includes(papel());
const NOME_PAPEL = { dono: 'Dono', admin: 'Administrador', membro: 'Equipe' };
let conta = { email: '', modo: CONTA ? 'conta' : 'demo' };
const chavePerfil = () => (conta.email || 'demo').toLowerCase();
const perfil = () => ((db.config.perfis || {})[chavePerfil()] || {});
function setPerfil(p) { db.config.perfis = { ...(db.config.perfis || {}), [chavePerfil()]: { ...perfil(), ...p } }; grava(); }

// ------------------------------------------------------------------ a tela
let blocoAss = null, rolou = '';
G.config = {
  titulo: 'Configurações',
  html() {
    const L = lojaCfg(), c = db.config, E = esquema(), pf = perfil(), g = gestor(), cor = corLoja();
    const nome = pf.nome || (conta.modo === 'demo' ? 'Você' : ''), ini = (nome || conta.email || '?').trim()[0].toUpperCase();
    const secs = [['cfg-perfil', 'Perfil'], ['cfg-cores', 'Cores'], ['cfg-marca', 'Sua marca'], ['cfg-guia', 'Guia'], ['cfg-restaurante', 'Restaurante e impressão'], ['cfg-assinatura', 'Minha assinatura']];
    return volta('Configurações', g ? 'Seu perfil, as cores, a marca, o guia, a impressão e a assinatura' : 'Seu perfil, o guia e a assinatura. Cores, marca e restaurante, só o dono muda') + `
    <nav class="cfg-nav" aria-label="Seções das Configurações">${secs.map(([id, n]) => `<button type="button" data-ir="mais/config/${id}">${n}</button>`).join('')}</nav>
    <div class="duas">
      <section class="cartao cfg-sec" id="cfg-perfil"><h2>Perfil</h2>
        <div class="cfg-eu"><div class="cfg-foto" style="${pf.foto ? `background-image:url('${t(pf.foto)}')` : ''}">${pf.foto ? '' : t(ini)}</div>
          <div class="linha-bts"><label class="bt pq">${ico('mais2')}${pf.foto ? 'Trocar a foto' : 'Pôr foto'}<input type="file" accept="image/*" data-foto hidden></label>${pf.foto ? '<button type="button" class="bt pq" data-tira-foto>Tirar</button>' : ''}</div></div>
        <label class="campo"><span>Seu nome</span><input data-nome-eu maxlength="40" value="${t(pf.nome || '')}" placeholder="Como a equipe te chama"></label>
        <div class="grade2"><label class="campo"><span>E-mail da conta</span><input data-email-eu readonly value="${t(conta.email || '')}"><small>Só leitura: é o e-mail do login.</small></label>
          <label class="campo"><span>Cargo</span><input readonly value="${t(NOME_PAPEL[papel()] || 'Equipe')}"></label></div>
        <div class="linha-bts"><button type="button" class="bt cheio" data-salvar-eu>${ico('check')}Salvar</button>
          <button type="button" class="bt" data-conta="perfil">${ico('pessoas')}O que eu posso ver</button>
          ${conta.modo === 'conta' ? `<button type="button" class="bt" data-trocar-senha>Trocar a senha</button><button type="button" class="bt" data-conta="sair">${ico('voltar')}Sair</button>` : ''}</div>
      </section>
      <section class="cartao cfg-sec" id="cfg-cores"><h2>Esquema de cores</h2>
        <p class="mudo">Vale no sistema inteiro: menu, abas, botões, etiquetas e números em destaque. ${g ? 'Quem você convidar vê igual.' : 'Só o dono troca.'}</p>
        <div class="esquemas">${ESQUEMAS.map((e) => `<button type="button" data-esquema="${e.id}" aria-pressed="${E.id === e.id}" ${g ? '' : 'disabled'}><i style="--e1:${e.escuro};--e2:${e.destaque}"></i><span><b>${e.nome}</b><small>${e.txt}</small></span></button>`).join('')}</div>
      </section>
    </div>
    <section class="cartao cfg-sec" id="cfg-marca"><h2>Sua marca</h2>
      <p class="mudo">O nome, o logo e a capa da loja vão no topo do sistema, no cardápio do cliente e (o nome e o logo) no recibo impresso; a cor da marca, nos botões e no cardápio.</p>
      <div class="duas" style="margin-top:12px"><div>
        <div class="cfg-eu"><div class="logo-prev" data-logo-prev style="${L.logo ? `background-image:url('${t(L.logo)}')` : ''}">${L.logo ? '' : t((c.nome || 'R')[0])}</div>
          ${g ? `<div class="linha-bts"><label class="bt">${ico('mais2')}${L.logo ? 'Trocar o logo' : 'Enviar o logo'}<input type="file" accept="image/*" data-logo hidden></label>${L.logo ? '<button type="button" class="bt" data-tira-logo>Tirar</button>' : ''}</div>` : ''}</div>
        <label class="campo"><span>Nome do restaurante</span><input data-nome-rest maxlength="60" value="${t(c.nome || '')}" ${g ? '' : 'readonly'}></label>
        ${g ? `<div class="linha-bts"><button type="button" class="bt cheio" data-salvar-nome>${ico('check')}Salvar o nome</button><button type="button" class="bt" data-refazer-marca>${ico('troca')}${L.capa ? 'Trocar logo e capa' : 'Pôr logo e capa da loja'}</button></div>` : ''}
      </div><div>
        <p class="campo"><span>Cor da marca (os botões e o cardápio)</span></p>
        <div class="cores">${CORES.map((x) => `<button type="button" data-cor="${x}" style="background:${x}" class="${x.toLowerCase() === String(cor).toLowerCase() ? 'on' : ''}" aria-label="Cor ${x}" ${g ? '' : 'disabled'}></button>`).join('')}${g ? `<label class="bt pq" style="min-height:48px">Outra<input type="color" data-cor-livre value="${t(cor)}" style="width:28px;height:28px;border:0;padding:0;background:none"></label>` : ''}</div>
        <p class="mudo" style="margin-top:10px">Se a cor ficar clara demais, o Popina escurece um pouco para dar leitura.</p>
      </div></div>
      ${planoMarca() ? `<div style="margin-top:14px">${planoMarca()}</div>` : ''}
    </section>
    <section class="cartao cfg-sec" id="cfg-guia"><h2>Guia: como usar</h2>
      <p class="mudo">Um passo a passo curto de cada tela. Também abre a qualquer hora pelo botão <b>?</b> no topo.</p>
      <div class="cfg-como">${ORDEM.map((k) => `<button type="button" class="bt" data-como="${k}">${t(COMO[k][0])}</button>`).join('')}</div>
      <div class="linha-bts" style="margin-top:12px"><button type="button" class="bt cheio" data-ir="mais/inicio">${ico('check')}Ver de novo os primeiros passos</button></div>
    </section>
    <section class="cartao cfg-sec" id="cfg-restaurante"><h2>Restaurante e impressão</h2>
      <p class="mudo">Dados do restaurante, horários, Pix e entrega ficam em Restaurante. A impressão vale para este aparelho.</p>
      ${g ? `<div class="menu-g" style="margin:12px 0">
        <button type="button" data-ir="mais/restaurante"><span class="ico-g">${ico('loja')}</span><span><b>Restaurante</b><small>Contato, horários, Pix${c.pix?.chave && !c.pix?.exemplo ? ' (cadastrado)' : ''}, entrega e taxas</small></span></button>
        <button type="button" data-ir="mais/mesas"><span class="ico-g">${ico('qr')}</span><span><b>Mesas e QR</b><small>${Number(c.mesas) || 10} mesas, QR e link do delivery</small></span></button>
        <button type="button" data-ir="mais/equipe"><span class="ico-g">${ico('pessoas')}</span><span><b>Equipe</b><small>Funcionários, PIN, ponto e a senha do gerente</small></span></button></div>` : ''}
      <p class="campo"><span>Papel da impressora</span></p>
      <div class="chips quebra">${[['80', 'Térmica de 80 mm'], ['a4', 'Folha A4']].map(([k, n]) => `<button type="button" class="chip" data-papel="${k}" aria-pressed="${formatoPadrao() === k}">${n}</button>`).join('')}</div>
      <label class="liga" style="margin-top:12px">Imprimir sozinho cada pedido novo na Cozinha<input type="checkbox" data-auto-imp ${autoImprimir() ? 'checked' : ''}></label>
      <p class="mudo" style="margin-top:8px">No recibo saem o nome, o endereço e o WhatsApp do restaurante.</p>
    </section>
    <div class="cfg-sec" id="cfg-assinatura"><div id="ass-slot"></div></div>
    ${CONTA ? '' : `<div class="cartao" style="margin-top:16px"><h2>Demonstração</h2><p class="mudo" style="margin-bottom:12px">Tudo o que você fez aqui fica só neste navegador.</p><div class="linha-bts"><button type="button" class="bt" data-recomecar-cfg>${ico('troca')}Recomeçar a demonstração</button></div></div>`}`;
  },
  montar(el) {
    const slot = $('#ass-slot', el);
    if (slot && window.BRAssinatura) { if (blocoAss) slot.replaceWith(blocoAss); else blocoAss = BRAssinatura.montar(slot, { app: 'popina', nome: 'Popina', mensal: 79, anual: 758, pagina: 'popina.html' }); }
    // e-mail do login (a primeira vez, redesenha com o perfil desta pessoa)
    if (window.BRAssinatura && !conta.lido) BRAssinatura.conta().then((c) => { conta = { ...c, lido: true }; if ((location.hash || '').startsWith('#mais/config')) ir(location.hash.slice(1)); });
    const sec = rota().args[1]; if (sec && document.getElementById(sec) && rolou !== location.hash) { rolou = location.hash; setTimeout(() => document.getElementById(sec)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }
    $('[data-foto]', el)?.addEventListener('change', async (e) => { const a = e.target.files?.[0]; if (!a) return; try { setPerfil({ foto: await reduzir(a, 160, 160) }); toast('Foto salva'); } catch { toast('Não deu para ler esta imagem'); } });
    $('[data-tira-foto]', el)?.addEventListener('click', () => { setPerfil({ foto: '' }); toast('Foto tirada'); });
    $('[data-salvar-eu]', el)?.addEventListener('click', () => { setPerfil({ nome: $('[data-nome-eu]', el).value.trim().slice(0, 40) }); toast('Salvo'); });
    $('[data-trocar-senha]', el)?.addEventListener('click', () => { window.veltriaNuvem?.trocarSenha().then((m) => toast(`Mandamos o link da senha nova para ${m}`)).catch((x) => toast(x.message || 'Não deu para mandar agora')); });
    if (!gestor()) return;
    $('[data-prever-marca]', el)?.addEventListener('click', () => { window.popinaPlano = window.popinaPlano === 'marca' ? 'basico' : 'marca'; dispatchEvent(new Event('popina-plano')); toast(window.popinaPlano === 'marca' ? 'Assim fica com a sua marca: veja o topo' : 'De volta ao plano normal'); });
    $$('[data-esquema]', el).forEach((b) => { b.onclick = () => { const e = ESQUEMAS.find((x) => x.id === b.dataset.esquema); setLoja({ esquema: e.id, cor: e.destaque }); toast(`Esquema ${e.nome} aplicado`); }; });
    $$('[data-cor]', el).forEach((b) => { b.onclick = () => { setLoja({ cor: b.dataset.cor }); toast('Cor da marca trocada'); }; });
    $('[data-cor-livre]', el)?.addEventListener('change', (e) => { setLoja({ cor: e.target.value }); toast('Cor da marca trocada'); });
    $('[data-logo]', el)?.addEventListener('change', async (e) => { const a = e.target.files?.[0]; if (!a) return; try { setLoja({ logo: await reduzir(a, 320, 320) }); toast('Logo salvo'); } catch { toast('Não deu para ler esta imagem'); } });
    $('[data-tira-logo]', el)?.addEventListener('click', () => { setLoja({ logo: '' }); toast('Logo tirado'); });
    $('[data-refazer-marca]', el)?.addEventListener('click', () => abrirPrimeiroAcesso({ refazer: true }));
    $('[data-salvar-nome]', el)?.addEventListener('click', () => { const n = $('[data-nome-rest]', el).value.trim(); if (!n) return toast('Escreva o nome do restaurante'); db.config.nome = n.slice(0, 60); grava(); toast('Salvo'); });
    $$('[data-papel]', el).forEach((b) => { b.onclick = () => { setFormato(b.dataset.papel); toast(b.dataset.papel === 'a4' ? 'Impressão em folha A4' : 'Impressão na térmica de 80 mm'); ir(location.hash.slice(1)); }; });
    $('[data-auto-imp]', el)?.addEventListener('change', (e) => { setAutoImprimir(e.target.checked); toast(e.target.checked ? 'Imprimir sozinho: ligado' : 'Imprimir sozinho: desligado'); });
    $('[data-recomecar-cfg]', el)?.addEventListener('click', async () => { if (await confirma('Recomeçar a demonstração? Tudo volta ao exemplo do início.', 'Recomeçar', true)) { recomecar(); toast('Demonstração recomeçada'); ir('salao'); } });
  },
};
// "Minha conta" de antes leva às Configurações (o mesmo conteúdo, reunido)
G.conta = { titulo: 'Configurações', html: () => G.config.html(), montar: (el) => G.config.montar(el) };

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-como]'); if (b) { e.preventDefault(); comoUsar(b.dataset.como); return; }
  const q = e.target.closest('[data-como-agora]'); if (q) { e.preventDefault(); comoUsar(telaAtual()); }
});
