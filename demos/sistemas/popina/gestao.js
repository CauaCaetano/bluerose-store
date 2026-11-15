// Popina · gestão do restaurante (PC e celular): a cara e as regras do cardápio online, mesas e áreas, clientes,
// entregadores, cupons, equipe com convites e permissões, e a conta (perfil, assinatura, sair).
import { db, t, din, dinCurto, grava, r2, uid, CONTA, ESPACO, lojaCfg, setLoja, linkCardapio, acertoEntregadores } from './loja.js?v=4';
import { acao, ir } from './nucleo.js?v=4';
import { ico, folha, toast, confirma, $, $$ } from './ui.js?v=4';
import { TELAS_MAIS, MONTAR, volta } from './mais.js?v=4';
import { situacao, textoHorarios } from './opcoes.js?v=4';
import { qrSVG } from '../base/qr.js';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const CORES = ['#B4532F', '#8C2F39', '#5F6B2B', '#2F5D50', '#1F4E79', '#3B2A22', '#C27C0E', '#6B3FA0', '#D1495B', '#111111'];
const num = (v) => { const s = String(v ?? '').trim(); return Number(/,/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s) || 0; };
const vir = (n) => String(n ?? '').replace('.', ',');
// imagem escolhida no aparelho vira webp pequeno (logo 320 px quadrado, capa 1200×520)
function reduzir(arq, W, H, q = 0.74) {
  return new Promise((ok, falha) => {
    const img = new Image(), u = URL.createObjectURL(arq);
    img.onload = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); const e = Math.max(W / img.width, H / img.height), w = img.width * e, h = img.height * e;
      x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); URL.revokeObjectURL(u); ok(c.toDataURL('image/webp', q)); };
    img.onerror = () => { URL.revokeObjectURL(u); falha(new Error('imagem')); }; img.src = u;
  });
}

// ------------------------------------------------------------------ restaurante e cardápio online
TELAS_MAIS.loja = () => {
  const L = lojaCfg(), c = db.config, st = situacao(L.horarios);
  return volta('mais', 'Restaurante e cardápio online', 'Do jeito que o cliente vê no celular quando lê o QR ou abre o link') + `
  <form class="form larga" data-loja>
    <section class="bloco-form"><h2>Identidade</h2>
      <div class="loja-visual">
        <div class="loja-capa" data-capa style="${L.capa ? `background-image:url('${t(L.capa)}')` : ''}"><label class="bt">${ico('mais2')}${L.capa ? 'Trocar a capa' : 'Pôr foto de capa'}<input type="file" accept="image/*" data-arq-capa hidden></label>${L.capa ? '<button type="button" class="link claro" data-tira="capa">Tirar</button>' : ''}</div>
        <div class="loja-logo" data-logo style="${L.logo ? `background-image:url('${t(L.logo)}')` : `background:${t(L.cor)}`}">${L.logo ? '' : t(c.nome.split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase())}</div>
        <div class="loja-logo-bts"><label class="bt">${L.logo ? 'Trocar o logo' : 'Pôr o logo'}<input type="file" accept="image/*" data-arq-logo hidden></label>${L.logo ? '<button type="button" class="link" data-tira="logo">Tirar</button>' : ''}</div>
      </div>
      <label class="campo"><span>Nome do restaurante</span><input name="nome" value="${t(c.nome)}" maxlength="60"></label>
      <label class="campo"><span>Frase de boas-vindas</span><input name="boasVindas" value="${t(L.boasVindas)}" maxlength="120" placeholder="Ex.: Pizza no forno a lenha desde sempre"></label>
      <div class="campo"><span>Cor do restaurante</span><div class="cores">${CORES.map((x) => `<button type="button" class="cor ${x.toLowerCase() === String(L.cor).toLowerCase() ? 'on' : ''}" data-cor="${x}" style="background:${x}" aria-label="Cor ${x}"></button>`).join('')}<label class="cor livre" title="Outra cor"><input type="color" name="cor" value="${t(L.cor)}"></label></div></div>
      <div class="campo"><span>Fundo do cardápio</span><div class="seg"><button type="button" data-tema="claro" aria-pressed="${L.tema !== 'escuro'}">Claro</button><button type="button" data-tema="escuro" aria-pressed="${L.tema === 'escuro'}">Escuro</button></div></div>
    </section>
    <section class="bloco-form"><h2>Contato e endereço</h2>
      <label class="campo"><span>Endereço</span><input name="endereco" value="${t(L.endereco)}" placeholder="Rua, número · bairro"></label>
      <div class="duas-c"><label class="campo"><span>Cidade</span><input name="cidade" value="${t(c.cidade)}"></label><label class="campo"><span>WhatsApp do restaurante</span><input name="whatsapp" inputmode="tel" value="${t(c.whatsapp)}" placeholder="(16) 99999-0000"></label></div>
      <label class="campo"><span>Instagram</span><input name="instagram" value="${t(L.instagram)}" placeholder="@seurestaurante"></label>
      <label class="campo"><span>Aviso no topo do cardápio (opcional)</span><input name="aviso" value="${t(L.aviso)}" maxlength="140" placeholder="Ex.: Hoje tem rodízio de pizza a partir das 19h"></label>
    </section>
    <section class="bloco-form"><h2>Horários</h2><p class="mudo">${t(st.texto || 'Sem horário: o cardápio aparece sempre aberto.')}</p>
      <ul class="horarios-ed">${DIAS.map((d, k) => `<li data-dia="${k}"><b>${d}</b><div class="turnos">${(L.horarios[k] || []).map(([a, f], j) => `<span class="turno"><input type="time" value="${a}" data-a aria-label="${d}, abre"><i>às</i><input type="time" value="${f}" data-f aria-label="${d}, fecha"><button type="button" class="bt-ico" data-tira-turno="${j}" aria-label="Tirar este turno">${ico('fechar')}</button></span>`).join('') || '<span class="mudo">Fechado</span>'}</div><button type="button" class="link" data-mais-turno>+ turno</button></li>`).join('')}</ul>
      <button type="button" class="link" data-copia-seg>Copiar a segunda-feira para os outros dias úteis</button>
    </section>
    <section class="bloco-form"><h2>Pedidos pelo link e pelo QR</h2>
      <label class="interruptor bloco-int"><input type="checkbox" name="aceitaQR" ${L.aceitaQR !== false ? 'checked' : ''}><span></span>A mesa pode pedir pelo QR (o garçom confirma)</label>
      <label class="interruptor bloco-int"><input type="checkbox" name="delivery" ${L.delivery !== false ? 'checked' : ''}><span></span>Aceitar entrega (delivery)</label>
      <label class="interruptor bloco-int"><input type="checkbox" name="retirada" ${L.retirada !== false ? 'checked' : ''}><span></span>Aceitar retirada no balcão</label>
      <div class="duas-c"><label class="campo"><span>Tempo de entrega</span><input name="tempoEntrega" value="${t(L.tempoEntrega)}"></label><label class="campo"><span>Tempo para retirar</span><input name="tempoRetirada" value="${t(L.tempoRetirada)}"></label></div>
      <label class="campo"><span>Pedido mínimo (R$)</span><input name="pedidoMinimo" inputmode="decimal" value="${L.pedidoMinimo ? vir(L.pedidoMinimo) : ''}" placeholder="0,00"></label>
      <div class="campo"><span>Formas de pagamento na entrega</span><div class="chips quebra">${['Pix', 'Cartão na entrega', 'Dinheiro', 'Vale-refeição'].map((x) => `<label class="chip ${L.pagamentos.includes(x) ? 'on' : ''}"><input type="checkbox" name="pag" value="${x}" ${L.pagamentos.includes(x) ? 'checked' : ''} hidden>${x}</label>`).join('')}</div></div>
      <div class="campo"><span>Bairros e taxa de entrega</span><ul class="bairros">${db.bairros.map((b, k) => `<li><input name="b_nome_${k}" value="${t(b.nome)}" aria-label="Bairro"><input name="b_taxa_${k}" value="${vir(b.taxa)}" inputmode="decimal" aria-label="Taxa de ${t(b.nome)}"></li>`).join('')}<li><input name="b_nome_n" placeholder="Novo bairro"><input name="b_taxa_n" placeholder="Taxa" inputmode="decimal"></li></ul></div>
    </section>
    <section class="bloco-form link-loja"><h2>Link do cardápio</h2><p class="mudo">Ponha na bio do Instagram, no WhatsApp e no Google. O QR de cada mesa fica em Mesas e QR.</p>
      <div class="link-caixa"><div class="link-qr">${qrSVG(linkCardapio('delivery=1'), 120, '#3B2A22')}</div><div><code>${t(linkCardapio('delivery=1'))}</code><div class="linha-bts"><button type="button" class="bt" data-copiar>Copiar o link</button><a class="bt" href="${linkCardapio('delivery=1')}" target="_blank" rel="noopener">Ver como o cliente vê</a></div></div></div>
    </section>
    <div class="salvar-fixo"><button class="bt cheio grande">Salvar</button></div>
  </form>`;
};
MONTAR.loja = (el) => {
  const f = $('[data-loja]', el); if (!f) return;
  let cor = lojaCfg().cor, temaSel = lojaCfg().tema;
  const horarios = () => $$('[data-dia]', f).map((li) => $$('.turno', li).map((tu) => [$('[data-a]', tu).value, $('[data-f]', tu).value]).filter(([a, b]) => a && b));
  f.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.cor) { cor = b.dataset.cor; $$('[data-cor]', f).forEach((x) => x.classList.toggle('on', x === b)); f.cor.value = cor; return; }
    if (b.dataset.tema) { temaSel = b.dataset.tema; $$('[data-tema]', f).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); return; }
    if (b.dataset.tira) { setLoja({ [b.dataset.tira]: '' }); toast(b.dataset.tira === 'logo' ? 'Logo tirado' : 'Capa tirada'); return; }
    if ('maisTurno' in b.dataset) { const li = b.closest('[data-dia]'); const h = horarios(); h[li.dataset.dia].push(['18:00', '23:00']); setLoja({ horarios: h }); return; }
    if (b.dataset.tiraTurno !== undefined) { const li = b.closest('[data-dia]'); const h = horarios(); h[li.dataset.dia].splice(Number(b.dataset.tiraTurno), 1); setLoja({ horarios: h }); return; }
    if ('copiaSeg' in b.dataset) { const h = horarios(); [2, 3, 4, 5].forEach((d) => { h[d] = h[1].map((x) => [...x]); }); setLoja({ horarios: h }); toast('Horário de segunda copiado para terça a sexta'); return; }
    if ('copiar' in b.dataset) { navigator.clipboard?.writeText(linkCardapio('delivery=1')).then(() => toast('Link copiado')).catch(() => toast('Não deu para copiar: segure o link e copie')); }
  });
  f.cor.addEventListener('input', () => { cor = f.cor.value; $$('[data-cor]', f).forEach((x) => x.classList.remove('on')); });
  $$('input[name=pag]', f).forEach((i) => { i.onchange = () => i.closest('.chip').classList.toggle('on', i.checked); });
  const img = async (inp, campo, W, H) => { const a = inp.files?.[0]; if (!a) return; try { setLoja({ [campo]: await reduzir(a, W, H) }); toast(campo === 'logo' ? 'Logo salvo' : 'Capa salva'); } catch { toast('Não consegui abrir essa imagem. Tente outra.'); } };
  $('[data-arq-logo]', f).onchange = (e) => img(e.target, 'logo', 320, 320);
  $('[data-arq-capa]', f).onchange = (e) => img(e.target, 'capa', 1200, 520);
  f.onsubmit = (e) => {
    e.preventDefault(); const c = db.config;
    c.nome = f.nome.value.trim() || c.nome; c.cidade = f.cidade.value.trim(); c.whatsapp = f.whatsapp.value.replace(/\D/g, '');
    db.bairros = db.bairros.map((b, k) => ({ nome: f[`b_nome_${k}`].value.trim(), taxa: num(f[`b_taxa_${k}`].value) })).filter((b) => b.nome);
    if (f.b_nome_n.value.trim()) db.bairros.push({ nome: f.b_nome_n.value.trim(), taxa: num(f.b_taxa_n.value) });
    setLoja({ cor, tema: temaSel, boasVindas: f.boasVindas.value.trim(), endereco: f.endereco.value.trim(), instagram: f.instagram.value.trim().replace(/^@/, ''), aviso: f.aviso.value.trim(),
      horarios: horarios(), aceitaQR: f.aceitaQR.checked, delivery: f.delivery.checked, retirada: f.retirada.checked, tempoEntrega: f.tempoEntrega.value.trim(), tempoRetirada: f.tempoRetirada.value.trim(),
      pedidoMinimo: r2(num(f.pedidoMinimo.value)), pagamentos: $$('input[name=pag]:checked', f).map((i) => i.value) });
    toast('Salvo. O cardápio online já mostra assim.');
  };
};

// ------------------------------------------------------------------ mesas, áreas e QR
TELAS_MAIS.mesas = () => {
  const L = lojaCfg(), n = db.config.mesas;
  return volta('mais', 'Mesas e QR', 'Quantas mesas, as áreas do salão e o QR de cada mesa') + `
  <form class="form" data-mesas>
    <div class="duas-c"><label class="campo"><span>Número de mesas</span><input name="mesas" inputmode="numeric" value="${n}"></label><label class="campo"><span>Couvert por pessoa (R$, opcional)</span><input name="couvert" inputmode="decimal" value="${L.couvert ? vir(L.couvert) : ''}" placeholder="0,00"></label></div>
    <div class="campo"><span>Áreas (ex.: Salão das mesas 1 a 8, Varanda da 9 à 12)</span><ul class="areas">${L.areas.map((a, k) => `<li><input name="a_nome_${k}" value="${t(a.nome)}" aria-label="Nome da área"><input name="a_de_${k}" inputmode="numeric" value="${a.de}" aria-label="Da mesa"><i>a</i><input name="a_ate_${k}" inputmode="numeric" value="${a.ate}" aria-label="Até a mesa"></li>`).join('')}<li><input name="a_nome_n" placeholder="Nova área"><input name="a_de_n" inputmode="numeric" placeholder="de"><i>a</i><input name="a_ate_n" inputmode="numeric" placeholder="até"></li></ul></div>
    <button class="bt cheio grande">Salvar</button></form>
  <div class="sec-tit"><h2>QR das mesas</h2><span>imprima e cole em cada mesa</span></div>
  <div class="linha-bts"><button type="button" class="bt cheio" data-acao="imprimir-qr">${ico('impressora')}Imprimir todos</button><a class="bt" href="${linkCardapio('mesa=1')}" target="_blank" rel="noopener">Ver como o cliente vê</a></div>
  <div class="grade-qr">${Array.from({ length: n }, (_, k) => `<figure>${qrSVG(linkCardapio(`mesa=${k + 1}`), 140, '#3B2A22')}<figcaption>${t(nomeArea(k + 1))}</figcaption></figure>`).join('')}</div>`;
};
const nomeArea = (m) => { const a = lojaCfg().areas.find((x) => m >= x.de && m <= x.ate); return a ? `${a.nome} · ${m}` : `Mesa ${m}`; };
MONTAR.mesas = (el) => {
  const f = $('[data-mesas]', el); if (!f) return;
  f.onsubmit = (e) => {
    e.preventDefault();
    db.config.mesas = Math.max(1, Math.min(300, Math.round(num(f.mesas.value)) || db.config.mesas));
    const L = lojaCfg();
    const areas = L.areas.map((a, k) => ({ nome: f[`a_nome_${k}`].value.trim(), de: Math.round(num(f[`a_de_${k}`].value)), ate: Math.round(num(f[`a_ate_${k}`].value)) })).filter((a) => a.nome && a.de > 0 && a.ate >= a.de);
    if (f.a_nome_n.value.trim() && num(f.a_de_n.value) > 0 && num(f.a_ate_n.value) >= num(f.a_de_n.value)) areas.push({ nome: f.a_nome_n.value.trim(), de: Math.round(num(f.a_de_n.value)), ate: Math.round(num(f.a_ate_n.value)) });
    setLoja({ areas, couvert: r2(num(f.couvert.value)) }); toast('Mesas salvas');
  };
};

// ------------------------------------------------------------------ clientes do delivery e do balcão
TELAS_MAIS.clientes = (x) => {
  const l = (db.clientes || []).slice().sort((a, b) => (b.ultimo || 0) - (a.ultimo || 0));
  const fil = x ? l.filter((c) => `${c.nome} ${c.tel} ${c.bairro || ''}`.toLowerCase().includes(decodeURIComponent(x).toLowerCase())) : l;
  return volta('mais', 'Clientes', 'Quem pediu por delivery, retirada ou pelo link, com o histórico de cada um') + `
  <label class="busca">${ico('busca')}<input type="search" data-busca-cli value="${t(decodeURIComponent(x || ''))}" placeholder="Buscar por nome, telefone ou bairro" aria-label="Buscar cliente"></label>
  <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Cliente</th><th>Bairro</th><th class="num">Pedidos</th><th class="num">Total</th><th>Último pedido</th><th></th></tr></thead><tbody>
  ${fil.map((c) => `<tr><td><b>${t(c.nome || 'Sem nome')}</b><small>${t(fmtTel(c.tel))}</small></td><td>${t(c.bairro || '—')}</td><td class="num">${c.pedidos}</td><td class="num">${dinCurto(c.total)}</td><td>${c.ultimo ? new Date(c.ultimo).toLocaleDateString('pt-BR') : '—'}</td>
    <td class="acoes"><a class="bt-ico" href="https://wa.me/55${c.tel}" target="_blank" rel="noopener" aria-label="WhatsApp de ${t(c.nome)}">${ico('zap')}</a><button type="button" class="bt-ico" data-acao="cliente-ed" data-id="${c.id}" title="Editar" aria-label="Editar ${t(c.nome)}">${ico('ajustes')}</button></td></tr>`).join('') || '<tr><td colspan="6" class="vazio">Os clientes aparecem aqui sozinhos a cada pedido de delivery ou retirada com telefone.</td></tr>'}
  </tbody></table></div>`;
};
const fmtTel = (d) => { d = String(d || ''); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d; };
MONTAR.clientes = (el) => { const i = $('[data-busca-cli]', el); if (!i) return; let tm; i.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { ir(`mais/clientes/${encodeURIComponent(i.value)}`); setTimeout(() => { const n = $('[data-busca-cli]'); n?.focus(); n?.setSelectionRange(n.value.length, n.value.length); }, 30); }, 350); }; };
acao('cliente-ed', (b) => {
  const c = db.clientes.find((x) => x.id === b.dataset.id); if (!c) return;
  const ped = db.vendas.filter((v) => v.cliente === c.tel).slice(-8).reverse();
  folha({ titulo: c.nome || 'Cliente', corpo: `<label class="campo"><span>Nome</span><input data-n value="${t(c.nome)}"></label>
    <label class="campo"><span>Endereço</span><input data-e value="${t(c.end || '')}"></label><label class="campo"><span>Bairro</span><select data-b><option value="">—</option>${db.bairros.map((x) => `<option ${x.nome === c.bairro ? 'selected' : ''}>${t(x.nome)}</option>`).join('')}</select></label>
    <label class="campo"><span>Anotação (alergia, preferência…)</span><input data-o value="${t(c.obs || '')}" maxlength="140"></label>
    <div class="sec-tit"><h2>Últimos pedidos</h2><span>${c.pedidos} no total · ${din(c.total)}</span></div>
    <ul class="lista-itens">${ped.map((v) => `<li><span>${new Date(v.ts).toLocaleDateString('pt-BR')} · ${v.itens.map((i) => `${i.qtd}× ${t(i.nome)}`).join(', ')}</span><span>${din(v.total)}</span></li>`).join('') || '<li class="mudo">Os pedidos de antes do Popina não aparecem aqui.</li>'}</ul>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
  aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => { Object.assign(c, { nome: $('[data-n]', f).value.trim(), end: $('[data-e]', f).value.trim(), bairro: $('[data-b]', f).value, obs: $('[data-o]', f).value.trim() }); grava(); fechar(); toast('Cliente salvo'); }; } });
});

// ------------------------------------------------------------------ entregadores e acerto
TELAS_MAIS.entregadores = () => {
  const ini = new Date(); ini.setHours(0, 0, 0, 0); const ac = acertoEntregadores(ini.getTime());
  return volta('mais', 'Entregadores', 'Quem sai com cada pedido e o acerto das taxas do dia') + `
  <div class="linha-bts"><button type="button" class="bt cheio" data-acao="entregador-ed">${ico('mais2')}Novo entregador</button></div>
  <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Entregador</th><th class="num">Entregas hoje</th><th class="num">Taxas hoje</th><th></th></tr></thead><tbody>
  ${(db.entregadores || []).map((e) => `<tr><td><b>${t(e.nome)}</b><small>${t(fmtTel(e.tel))}</small></td><td class="num">${ac[e.id]?.entregas || 0}</td><td class="num">${din(ac[e.id]?.taxas || 0)}</td>
    <td class="acoes"><button type="button" class="bt-ico" data-acao="entregador-ed" data-id="${e.id}" title="Editar" aria-label="Editar ${t(e.nome)}">${ico('ajustes')}</button></td></tr>`).join('') || '<tr><td colspan="4" class="vazio">Cadastre os entregadores: ao marcar “Saiu para entrega”, você escolhe quem levou.</td></tr>'}
  </tbody></table></div>`;
};
acao('entregador-ed', (b) => {
  const e = b.dataset.id ? db.entregadores.find((x) => x.id === b.dataset.id) : null;
  folha({ titulo: e ? e.nome : 'Novo entregador', corpo: `<label class="campo"><span>Nome</span><input data-n value="${t(e?.nome || '')}"></label><label class="campo"><span>WhatsApp</span><input data-t inputmode="tel" value="${t(e?.tel || '')}"></label>${e ? '<button type="button" class="bt perigo" data-apagar>Tirar da lista</button>' : ''}`,
    pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
    aoAbrir: (f, fechar) => {
      $('[data-apagar]', f)?.addEventListener('click', async () => { if (await confirma(`Tirar ${e.nome} da lista? As entregas antigas continuam nos relatórios.`, 'Tirar', true)) { db.entregadores = db.entregadores.filter((x) => x !== e); grava(); fechar(); } });
      $('[data-ok]', f).onclick = () => { const nome = $('[data-n]', f).value.trim(); if (!nome) return toast('Escreva o nome'); const d = { nome, tel: $('[data-t]', f).value.replace(/\D/g, '') }; if (e) Object.assign(e, d); else (db.entregadores ||= []).push({ id: uid('e'), ...d }); grava(); fechar(); toast('Entregador salvo'); };
    } });
});

// ------------------------------------------------------------------ cupons
TELAS_MAIS.cupons = () => volta('mais', 'Cupons', 'Descontos que o cliente digita no cardápio online (delivery e retirada)') + `
  <div class="linha-bts"><button type="button" class="bt cheio" data-acao="cupom-ed">${ico('mais2')}Novo cupom</button></div>
  <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Código</th><th>Desconto</th><th>Regras</th><th class="num">Usos</th><th>Situação</th><th></th></tr></thead><tbody>
  ${(db.cupons || []).map((c) => `<tr class="${c.ativo ? '' : 'off'}"><td><b class="codigo">${t(c.codigo)}</b><small>${t(c.desc || '')}</small></td><td>${c.tipo === '%' ? `${c.valor}%` : din(c.valor)}</td><td>${c.minimo ? `a partir de ${din(c.minimo)}` : 'qualquer valor'}${c.ate ? ` · até ${new Date(c.ate + 'T12:00').toLocaleDateString('pt-BR')}` : ''}</td><td class="num">${c.usos || 0}${c.limite ? ` / ${c.limite}` : ''}</td>
    <td><label class="interruptor"><input type="checkbox" data-acao="cupom-ativo" data-id="${c.id}" ${c.ativo ? 'checked' : ''}><span></span><em>${c.ativo ? 'Ativo' : 'Pausado'}</em></label></td><td class="acoes"><button type="button" class="bt-ico" data-acao="cupom-ed" data-id="${c.id}" title="Editar" aria-label="Editar ${t(c.codigo)}">${ico('ajustes')}</button></td></tr>`).join('') || '<tr><td colspan="6" class="vazio">Crie um cupom para quem pede pela primeira vez ou para a promoção da semana.</td></tr>'}
  </tbody></table></div>`;
acao('cupom-ativo', (b) => { const c = db.cupons.find((x) => x.id === b.dataset.id); c.ativo = b.checked; grava(); });
acao('cupom-ed', (b) => {
  const c = b.dataset.id ? db.cupons.find((x) => x.id === b.dataset.id) : null;
  folha({ titulo: c ? c.codigo : 'Novo cupom', corpo: `<label class="campo"><span>Código (o cliente digita)</span><input data-cod value="${t(c?.codigo || '')}" maxlength="20" style="text-transform:uppercase" placeholder="Ex.: PIZZA10"></label>
    <div class="duas-c"><label class="campo"><span>Tipo</span><select data-tipo><option value="%" ${c?.tipo !== 'R$' ? 'selected' : ''}>Porcentagem (%)</option><option value="R$" ${c?.tipo === 'R$' ? 'selected' : ''}>Valor (R$)</option></select></label><label class="campo"><span>Desconto</span><input data-v inputmode="decimal" value="${c ? vir(c.valor) : ''}"></label></div>
    <div class="duas-c"><label class="campo"><span>Pedido mínimo (R$)</span><input data-min inputmode="decimal" value="${c?.minimo ? vir(c.minimo) : ''}" placeholder="0,00"></label><label class="campo"><span>Vale até (opcional)</span><input data-ate type="date" value="${t(c?.ate || '')}"></label></div>
    <div class="duas-c"><label class="campo"><span>Limite de usos (opcional)</span><input data-lim inputmode="numeric" value="${c?.limite || ''}" placeholder="sem limite"></label><label class="campo"><span>Descrição interna</span><input data-desc value="${t(c?.desc || '')}" maxlength="80"></label></div>
    ${c ? '<button type="button" class="bt perigo" data-apagar>Apagar o cupom</button>' : ''}`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
  aoAbrir: (f, fechar) => {
    $('[data-apagar]', f)?.addEventListener('click', async () => { if (await confirma(`Apagar o cupom ${c.codigo}?`, 'Apagar', true)) { db.cupons = db.cupons.filter((x) => x !== c); grava(); fechar(); } });
    $('[data-ok]', f).onclick = () => {
      const codigo = $('[data-cod]', f).value.trim().toUpperCase().replace(/\s+/g, ''), tipo = $('[data-tipo]', f).value, valor = num($('[data-v]', f).value);
      if (!/^[A-Z0-9]{3,20}$/.test(codigo)) return toast('Código com 3 a 20 letras ou números, sem espaço');
      if (!(valor > 0) || (tipo === '%' && valor > 90)) return toast(tipo === '%' ? 'Desconto entre 1% e 90%' : 'Escreva o valor do desconto');
      if (db.cupons.some((x) => x !== c && x.codigo === codigo)) return toast('Já existe um cupom com esse código');
      const d = { codigo, tipo, valor: r2(valor), minimo: r2(num($('[data-min]', f).value)), ate: $('[data-ate]', f).value, limite: Math.round(num($('[data-lim]', f).value)), desc: $('[data-desc]', f).value.trim() };
      if (c) Object.assign(c, d); else (db.cupons ||= []).push({ id: uid('cp'), usos: 0, ativo: true, ...d });
      grava(); fechar(); toast('Cupom salvo');
    };
  } });
});

// ------------------------------------------------------------------ equipe e convites
const CARGOS = [['Garçom', 'Salão, pedidos e mesas', ['#salao', '#pedidos']], ['Cozinha', 'Só a tela da cozinha e do bar', ['#cozinha']], ['Caixa', 'Caixa, pedidos e salão', ['#caixa', '#pedidos', '#salao']], ['Entregador', 'Pedidos de entrega', ['#pedidos']], ['Gerente', 'Tudo, menos a assinatura', null]];
TELAS_MAIS.equipe = () => {
  if (CONTA && window.veltriaAbrir) {
    return volta('mais', 'Equipe e convites', 'Cada pessoa entra com o próprio e-mail e só vê o que você liberar') + `
    <div class="cartoes-acao">
      <button type="button" class="cartao-acao" data-conta="convidar">${ico('pessoas')}<b>Convidar pessoa</b><span>Mande o convite por e-mail; a pessoa entra com o login dela já no seu restaurante.</span></button>
      <button type="button" class="cartao-acao" data-conta="equipe">${ico('ajustes')}<b>Ver e editar a equipe</b><span>Cargo, se pode alterar ou só ver, e quais telas cada pessoa vê.</span></button>
    </div>
    <div class="sec-tit"><h2>Cargos sugeridos</h2></div><ul class="cargos">${CARGOS.map(([c, d]) => `<li><b>${c}</b><span>${d}</span></li>`).join('')}</ul>`;
  }
  const eq = db.equipe || [];
  return volta('mais', 'Equipe e convites', 'Na demonstração, a equipe fica só neste aparelho. Na conta, o convite vai por e-mail.') + `
  <div class="linha-bts"><button type="button" class="bt cheio" data-acao="pessoa-ed">${ico('mais2')}Convidar pessoa</button></div>
  <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Pessoa</th><th>Cargo</th><th>Vê</th><th>Situação</th><th></th></tr></thead><tbody>
  <tr><td><b>Você</b><small>dono</small></td><td>Dono</td><td>Tudo</td><td>Ativo</td><td></td></tr>
  ${eq.map((p) => `<tr><td><b>${t(p.nome || p.email)}</b><small>${t(p.email)}</small></td><td>${t(p.cargo)}</td><td>${p.telas ? p.telas.map((h) => h.slice(1)).join(', ') : 'Tudo'}${p.soVer ? ' · só ver' : ''}</td><td>${p.aceito ? 'Ativo' : 'Convite enviado'}</td><td class="acoes"><button type="button" class="bt-ico" data-acao="pessoa-ed" data-id="${p.id}" title="Editar" aria-label="Editar ${t(p.email)}">${ico('ajustes')}</button></td></tr>`).join('')}
  </tbody></table></div>`;
};
acao('pessoa-ed', (b) => {
  const p = b.dataset.id ? (db.equipe || []).find((x) => x.id === b.dataset.id) : null;
  const telas = [['#salao', 'Salão'], ['#pedidos', 'Pedidos'], ['#cozinha', 'Cozinha'], ['#caixa', 'Caixa'], ['#mais', 'Gestão']];
  folha({ titulo: p ? p.email : 'Convidar pessoa', corpo: `<label class="campo"><span>E-mail da pessoa</span><input data-email type="email" value="${t(p?.email || '')}" ${p ? 'readonly' : ''}></label>
    <label class="campo"><span>Nome</span><input data-nome value="${t(p?.nome || '')}"></label>
    <div class="campo"><span>Cargo</span><div class="chips quebra">${CARGOS.map(([c]) => `<button type="button" class="chip ${p?.cargo === c ? 'on' : ''}" data-cargo="${c}">${c}</button>`).join('')}</div></div>
    <div class="campo"><span>Telas que vê</span><div class="chips quebra">${telas.map(([h, n]) => `<label class="chip ${!p?.telas || p.telas.includes(h) ? 'on' : ''}"><input type="checkbox" value="${h}" ${!p?.telas || p.telas.includes(h) ? 'checked' : ''} hidden>${n}</label>`).join('')}</div></div>
    <label class="interruptor bloco-int"><input type="checkbox" data-sover ${p?.soVer ? 'checked' : ''}><span></span>Só ver, sem alterar nada</label>
    ${p ? '<button type="button" class="bt perigo" data-apagar>Tirar da equipe</button>' : ''}`,
  pe: `<button type="button" class="bt cheio grande" data-ok>${p ? 'Salvar' : 'Mandar convite'}</button>`,
  aoAbrir: (f, fechar) => {
    $$('[data-cargo]', f).forEach((x) => { x.onclick = () => { $$('[data-cargo]', f).forEach((y) => y.classList.toggle('on', y === x)); const tl = CARGOS.find((c) => c[0] === x.dataset.cargo)[2]; $$('.chip input', f).forEach((i) => { i.checked = !tl || tl.includes(i.value); i.closest('.chip').classList.toggle('on', i.checked); }); }; });
    $$('.chip input', f).forEach((i) => { i.onchange = () => i.closest('.chip').classList.toggle('on', i.checked); });
    $('[data-apagar]', f)?.addEventListener('click', async () => { if (await confirma(`Tirar ${p.email} da equipe?`, 'Tirar', true)) { db.equipe = db.equipe.filter((x) => x !== p); grava(); fechar(); } });
    $('[data-ok]', f).onclick = () => {
      const email = $('[data-email]', f).value.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Confira o e-mail');
      const sel = $$('.chip input:checked', f).map((i) => i.value); const d = { nome: $('[data-nome]', f).value.trim(), cargo: $('.chip.on[data-cargo]', f)?.dataset.cargo || 'Equipe', telas: sel.length === telas.length ? null : sel, soVer: $('[data-sover]', f).checked };
      if (p) Object.assign(p, d); else (db.equipe ||= []).push({ id: uid('p'), email, aceito: false, ...d });
      grava(); fechar(); toast(p ? 'Acesso salvo' : 'Convite criado (na demonstração, não sai e-mail)');
    };
  } });
});

// ------------------------------------------------------------------ minha conta
TELAS_MAIS.conta = () => {
  const real = CONTA && window.veltriaAbrir;
  return volta('mais', 'Minha conta', real ? `${t(CONTA.empresa || db.config.nome)} · ${window.veltriaAbrir.papel === 'dono' ? 'dono' : 'equipe'}` : 'Na conta de verdade, aqui ficam o seu perfil, a assinatura e a saída') + `
  <div class="cartoes-acao">
    <button type="button" class="cartao-acao" data-conta="perfil">${ico('pessoas')}<b>Meu perfil</b><span>Seu e-mail, seu cargo e o que você pode ver e fazer.</span></button>
    <button type="button" class="cartao-acao" data-conta="assinatura">${ico('cartao')}<b>Assinatura</b><span>Plano, próxima cobrança e troca para o anual com 20% a menos.</span></button>
    <button type="button" class="cartao-acao" data-conta="configuracoes">${ico('ajustes')}<b>Dados da empresa</b><span>Nome e cidade da empresa na conta.</span></button>
    <button type="button" class="cartao-acao" data-conta="convidar">${ico('mais2')}<b>Convidar pessoa</b><span>Garçons, cozinha e caixa, cada um com o próprio login.</span></button>
    <button type="button" class="cartao-acao sair" data-conta="sair">${ico('voltar')}<b>Sair</b><span>Sai deste aparelho. Seus dados ficam guardados na nuvem.</span></button>
  </div>
  ${real ? '' : `<p class="aviso ouro">Isto é a demonstração. Para ter tudo isso de verdade, assine em <a href="../../../popina.html#precos" target="_blank" rel="noopener">bluerose-store.com/popina</a>.</p>`}`;
};
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-conta]'); if (!b) return;
  const f = window.veltriaAbrir?.[b.dataset.conta];
  if (CONTA && f) return f();
  if (b.dataset.conta === 'convidar' || b.dataset.conta === 'equipe') return ir('mais/equipe');
  toast('Na demonstração isto fica desligado. Na conta, abre aqui mesmo.');
});
