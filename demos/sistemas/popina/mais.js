// Popina · Mais: cardápio (preços, esgotado, ficha técnica), estoque, relatórios, QR das mesas, ajustes e o papel deste aparelho.
import { db, t, din, dinCurto, prod, insumo, grava, custoPrato, estoqueBaixo, entradaCompra, fmtQtd, r2, uid, linkCardapio, CONTA, saldo } from './loja.js?v=1';
import { registrar, acao, ir, PAPEIS, papel, setPapel } from './nucleo.js?v=1';
import { ico, folha, toast, confirma, $, $$ } from './ui.js?v=1';
import { qrSVG } from '../base/qr.js';

const SECOES = [['cardapio', 'Cardápio', 'cardapio', 'Preços, fotos, esgotado e ficha técnica'], ['estoque', 'Estoque', 'estoque', 'O que tem, o que está acabando, compras'],
  ['relatorios', 'Relatórios', 'grafico', 'Vendas, formas de pagamento, mais vendidos'], ['qr', 'QR das mesas', 'qr', 'Imprimir o QR do cardápio de cada mesa'],
  ['ajustes', 'Ajustes', 'ajustes', 'Serviço, Pix, bairros e taxas, mesas'], ['aparelho', 'Este aparelho', 'pessoas', 'Garçom, cozinha, caixa ou dono']];

registrar('mais', {
  titulo: 'Mais', aba: 'mais',
  html(sec, x) {
    if (sec && TELAS_MAIS[sec]) return TELAS_MAIS[sec](x);
    const baixo = estoqueBaixo().length;
    return `<header class="cab-tela"><div><h1>Mais</h1><p>${t(db.config.nome)}</p></div></header>
      <nav class="menu-mais">${SECOES.map(([id, nome, ic, det]) => `<a href="#mais/${id}"><span class="mm-ico">${ico(ic)}</span><span><b>${nome}${id === 'estoque' && baixo ? ` <em class="badge">${baixo}</em>` : ''}</b><small>${det}</small></span>${ico('dir')}</a>`).join('')}</nav>`;
  },
  montar(el, sec) { MONTAR[sec]?.(el); },
});
const volta = (h, tit, sub = '') => `<header class="cab-tela"><a class="bt-ico" href="#${h}" aria-label="Voltar">${ico('voltar')}</a><div><h1>${tit}</h1>${sub ? `<p>${sub}</p>` : ''}</div></header>`;

const TELAS_MAIS = {
  // ---------------- cardápio
  cardapio() {
    const bts = `<div class="linha-bts"><button type="button" class="bt cheio" data-acao="editar-prod">${ico('mais2')}Novo prato</button><button type="button" class="bt" data-acao="categorias">Categorias</button></div>`;
    if (!db.produtos.length) return volta('mais', 'Cardápio') + `<div class="vazio grande"><p><b>Comece pelo seu cardápio.</b></p><p>Cadastre cada prato com preço e foto, ou carregue o cardápio de exemplo e vá trocando nomes e preços.</p>
      <div class="linha-bts" style="justify-content:center;margin-top:14px"><button type="button" class="bt cheio" data-acao="editar-prod">${ico('mais2')}Novo prato</button><button type="button" class="bt" data-acao="cardapio-exemplo">Usar o cardápio de exemplo</button></div></div>`;
    return volta('mais', 'Cardápio', 'Toque em Esgotado quando acabar: some na hora do cardápio do cliente e do garçom') + bts + db.categorias.filter((k) => db.produtos.some((p) => p.cat === k.id)).map((k) => `<section class="bloco"><div class="sec-tit"><h2>${t(k.nome)}</h2></div>
      <ul class="lista-prod">${db.produtos.filter((p) => p.cat === k.id).map((p) => { const custo = custoPrato(p), marg = p.preco ? Math.round((1 - custo / p.preco) * 100) : 0;
        return `<li class="${p.ativo ? '' : 'off'}">${p.foto ? `<img src="${t(p.foto)}" alt="" loading="lazy">` : `<span class="sem-foto">${ico('prato')}</span>`}<div><b>${t(p.nome)}</b><small>${din(p.preco)}${p.porKg ? '/kg' : ''}${custo ? ` · custo ${din(custo)} · margem ${marg}%` : ' · sem ficha técnica'}</small></div>
        <label class="interruptor" title="Disponível"><input type="checkbox" data-acao="ativo" data-p="${p.id}" ${p.ativo ? 'checked' : ''}><span></span><em>${p.ativo ? 'Disponível' : 'Esgotado'}</em></label>
        <button type="button" class="bt-ico" data-acao="editar-prod" data-p="${p.id}" aria-label="Editar ${t(p.nome)}">${ico('ajustes')}</button></li>`; }).join('')}</ul></section>`).join('');
  },
  // ---------------- estoque
  estoque() {
    const l = db.insumos.slice().sort((a, b) => saldo(a) / (a.minimo || 1) - saldo(b) / (b.minimo || 1));
    return volta('mais', 'Estoque', 'Baixa sozinho a cada pedido enviado, pela ficha técnica de cada prato') + `<p class="legenda-est"><span><i class="ok"></i>Tranquilo</span><span><i class="medio"></i>Perto do mínimo</span><span><i class="baixo"></i>Repor agora</span><span>Barra cheia = o dobro do mínimo</span></p>
      <div class="linha-bts"><button type="button" class="bt cheio" data-acao="compra">${ico('mais2')}Entrada de compra</button><button type="button" class="bt" data-acao="editar-insumo">Novo insumo</button><button type="button" class="bt" data-acao="lista-compras">Lista de compras</button></div>
      <ul class="lista-estoque">${l.map((i) => { const p = Math.max(0, Math.min(100, (saldo(i) / ((i.minimo || 1) * 2)) * 100)); const nivel = saldo(i) <= i.minimo ? 'baixo' : saldo(i) <= i.minimo * 1.5 ? 'medio' : '';
        return `<li class="${nivel}"><div><b>${t(i.nome)}</b><small>${fmtQtd(saldo(i), i.unid)} · mínimo ${fmtQtd(i.minimo, i.unid)} · ${din(i.custo)}/${t(i.compra)}</small><span class="barra"><i style="width:${p}%"></i></span></div>${nivel === 'baixo' ? `<em class="badge">Comprar ${Math.max(1, Math.ceil((i.minimo * 2 - saldo(i)) / i.fator))} ${t(i.compra)}</em>` : ''}<button type="button" class="bt-ico" data-acao="editar-insumo" data-i="${i.id}" aria-label="Editar ${t(i.nome)}">${ico('ajustes')}</button></li>`; }).join('') || '<li class="vazio">Nenhum insumo ainda. Cadastre o que você compra (carne, queijo, bebidas…) para o estoque baixar sozinho a cada pedido.</li>'}</ul>`;
  },
  // ---------------- relatórios
  relatorios() {
    const agora = Date.now(); const v30 = db.vendas.filter((v) => v.ts > agora - 30 * 864e5 && !v.cancelado);
    const dia = (ts) => new Date(ts).toDateString(); const hoje = dia(agora);
    const vHoje = v30.filter((v) => dia(v.ts) === hoje); const tot = (l) => r2(l.reduce((s, v) => s + v.total, 0));
    const porDia = {}; v30.forEach((v) => { const d = new Date(v.ts); const k = d.toISOString().slice(0, 10); porDia[k] = (porDia[k] || 0) + v.total; });
    const dias = Array.from({ length: 14 }, (_, k) => { const d = new Date(agora - (13 - k) * 864e5); const ch = d.toISOString().slice(0, 10); return [d, porDia[ch] || 0]; });
    const max = Math.max(...dias.map((d) => d[1]), 1);
    const sem = [0, 0, 0, 0, 0, 0, 0], semN = [0, 0, 0, 0, 0, 0, 0]; Object.entries(porDia).forEach(([k, val]) => { const d = new Date(k + 'T12:00'); sem[d.getDay()] += val; semN[d.getDay()]++; });
    const medSem = sem.map((s, k) => (semN[k] ? s / semN[k] : 0)); const maxSem = Math.max(...medSem, 1);
    const qtd = {}; v30.forEach((v) => v.itens.forEach((i) => { qtd[i.nome] = (qtd[i.nome] || 0) + i.qtd; }));
    const rank = Object.entries(qtd).sort((a, b) => b[1] - a[1]);
    const formas = {}; v30.forEach((v) => { formas[v.forma] = (formas[v.forma] || 0) + v.total; }); const totF = tot(v30) || 1;
    const tipos = { mesa: 0, delivery: 0, balcao: 0 }; v30.forEach((v) => { tipos[v.tipo] = (tipos[v.tipo] || 0) + v.total; });
    const ticket = v30.length ? tot(v30) / v30.length : 0;
    return volta('mais', 'Relatórios', 'Últimos 30 dias · dados de exemplo') + `
      <section class="kpis"><div><small>Hoje</small><b>${dinCurto(tot(vHoje))}</b><span>${vHoje.length} vendas</span></div><div><small>30 dias</small><b>${dinCurto(tot(v30))}</b><span>${v30.length} vendas</span></div>
        <div><small>Ticket médio</small><b>${dinCurto(ticket)}</b><span>por conta</span></div><div><small>Serviço (10%)</small><b>${dinCurto(r2(v30.reduce((s, v) => s + (v.servico || 0), 0)))}</b><span>para a equipe</span></div></section>
      <section class="bloco"><div class="sec-tit"><h2>Vendas por dia</h2><span>14 dias</span></div><div class="barras">${dias.map(([d, val]) => `<div title="${d.toLocaleDateString('pt-BR')}: ${dinCurto(val)}"><i style="height:${(val / max) * 100}%"></i><small>${d.getDate()}</small></div>`).join('')}</div></section>
      <section class="bloco"><div class="sec-tit"><h2>Média por dia da semana</h2></div><div class="barras sem">${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((n, k) => `<div title="${n}: ${dinCurto(medSem[k])}"><i style="height:${(medSem[k] / maxSem) * 100}%"></i><small>${n}</small></div>`).join('')}</div></section>
      <div class="duas"><section class="bloco"><div class="sec-tit"><h2>Mais vendidos</h2></div><ol class="rank">${rank.slice(0, 5).map(([n, q]) => `<li><span>${t(n)}</span><b>${q}</b></li>`).join('')}</ol></section>
        <section class="bloco"><div class="sec-tit"><h2>Menos vendidos</h2></div><ol class="rank">${rank.slice(-5).reverse().map(([n, q]) => `<li><span>${t(n)}</span><b>${q}</b></li>`).join('')}</ol></section></div>
      <div class="duas"><section class="bloco"><div class="sec-tit"><h2>Formas de pagamento</h2></div>${Object.entries(formas).sort((a, b) => b[1] - a[1]).map(([f, val]) => `<div class="prop"><span>${t(f)}</span><i style="width:${(val / totF) * 100}%"></i><b>${Math.round((val / totF) * 100)}%</b></div>`).join('')}</section>
        <section class="bloco"><div class="sec-tit"><h2>Onde vende</h2></div>${[['mesa', 'Salão'], ['delivery', 'Delivery'], ['balcao', 'Balcão']].map(([k, n]) => `<div class="prop"><span>${n}</span><i style="width:${(tipos[k] / totF) * 100}%"></i><b>${Math.round((tipos[k] / totF) * 100)}%</b></div>`).join('')}</section></div>`;
  },
  // ---------------- QR das mesas
  qr() {
    return volta('mais', 'QR das mesas', 'Imprima e cole em cada mesa: o cliente vê o cardápio, pede e chama o garçom') + `
      <div class="linha-bts"><button type="button" class="bt cheio" data-acao="imprimir-qr">${ico('impressora')}Imprimir todos</button><a class="bt" href="${linkCardapio('mesa=1')}" target="_blank" rel="noopener">Ver como o cliente vê</a></div>
      <div class="grade-qr">${Array.from({ length: db.config.mesas }, (_, k) => `<figure>${qrSVG(linkCardapio(`mesa=${k + 1}`), 140, '#3B2A22')}<figcaption>Mesa ${k + 1}</figcaption></figure>`).join('')}</div>`;
  },
  // ---------------- ajustes
  ajustes() {
    const c = db.config;
    return volta('mais', 'Ajustes') + `<form class="form" data-ajustes>
      <label class="campo"><span>Nome do restaurante</span><input name="nome" value="${t(c.nome)}"></label>
      <label class="campo"><span>Cidade</span><input name="cidade" value="${t(c.cidade)}"></label>
      <div class="duas-c"><label class="campo"><span>Taxa de serviço (%)</span><input name="servico" inputmode="numeric" value="${c.servico}"></label><label class="campo"><span>Número de mesas</span><input name="mesas" inputmode="numeric" value="${c.mesas}"></label></div>
      <label class="campo"><span>Peso do prato vazio, para comida por quilo (gramas)</span><input name="tara" inputmode="numeric" value="${c.tara || ''}" placeholder="0"></label>
      <label class="campo"><span>Chave Pix do restaurante</span><input name="pix" value="${c.pix.exemplo ? '' : t(c.pix.chave)}" placeholder="CNPJ, celular, e-mail ou chave aleatória"></label>
      <label class="campo"><span>WhatsApp do restaurante</span><input name="whatsapp" inputmode="tel" value="${t(c.whatsapp)}"></label>
      <label class="campo"><span>Garçons (separados por vírgula)</span><input name="garcons" value="${t((c.garcons || []).join(', '))}"></label>
      <div class="campo"><span>Bairros e taxa de entrega</span><ul class="bairros">${db.bairros.map((b, k) => `<li><input name="b_nome_${k}" value="${t(b.nome)}" aria-label="Bairro"><input name="b_taxa_${k}" value="${String(b.taxa).replace('.', ',')}" inputmode="decimal" aria-label="Taxa"></li>`).join('')}<li><input name="b_nome_n" placeholder="Novo bairro"><input name="b_taxa_n" placeholder="Taxa" inputmode="decimal"></li></ul></div>
      <button class="bt cheio grande">Salvar</button></form>
      ${CONTA ? '' : '<button type="button" class="bt perigo" data-acao="recomecar" style="margin-top:22px">Recomeçar a demonstração</button>'}`;
  },
  aparelho() {
    const p = papel();
    return volta('mais', 'Este aparelho', 'O que este celular, tablet ou computador faz no restaurante') + `<div class="papeis">${Object.entries(PAPEIS).map(([k, [nome]]) => `<button type="button" class="papel ${p === k ? 'on' : ''}" data-acao="papel" data-p="${k}"><b>${nome}</b><small>${{ garcom: 'Abre na fila do salão e nas mesas', cozinha: 'Abre na tela de pedidos da cozinha e do bar', caixa: 'Abre no caixa, para fechar contas', dono: 'Vê tudo, com relatórios e ajustes' }[k]}</small></button>`).join('')}</div>`;
  },
};
const MONTAR = {
  ajustes(el) {
    const f = $('[data-ajustes]', el); if (!f) return;
    f.onsubmit = (e) => {
      e.preventDefault(); const c = db.config;
      c.nome = f.nome.value.trim() || c.nome; c.cidade = f.cidade.value.trim(); c.servico = Math.max(0, Math.min(20, Number(f.servico.value) || 0)); c.mesas = Math.max(1, Math.min(200, Number(f.mesas.value) || c.mesas));
      if (f.pix.value.trim()) { c.pix = { tipo: 'chave', chave: f.pix.value.trim(), exemplo: false }; }
      c.tara = Math.max(0, Math.min(2000, Number(f.tara.value) || 0)); c.whatsapp = f.whatsapp.value.replace(/\D/g, ''); c.garcons = f.garcons.value.split(',').map((s) => s.trim()).filter(Boolean);
      db.bairros = db.bairros.map((b, k) => ({ nome: f[`b_nome_${k}`].value.trim(), taxa: Number(String(f[`b_taxa_${k}`].value).replace(',', '.')) || 0 })).filter((b) => b.nome);
      if (f.b_nome_n.value.trim()) db.bairros.push({ nome: f.b_nome_n.value.trim(), taxa: Number(String(f.b_taxa_n.value).replace(',', '.')) || 0 });
      grava(); toast('Ajustes salvos');
    };
  },
};
acao('ativo', (b) => { const p = prod(b.dataset.p); p.ativo = b.checked; grava(); toast(p.ativo ? `${p.nome} voltou ao cardápio` : `${p.nome} marcado como esgotado`); });
// foto do prato: reduzida no aparelho (480 px, webp) para caber nos dados e abrir rápido no celular do cliente
function reduzirFoto(arq) {
  return new Promise((ok, falha) => {
    const img = new Image(); const u = URL.createObjectURL(arq);
    img.onload = () => {
      const W = 480, H = 360, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
      const esc = Math.max(W / img.width, H / img.height), w = img.width * esc, h = img.height * esc; x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      URL.revokeObjectURL(u); ok(c.toDataURL('image/webp', 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(u); falha(new Error('foto')); }; img.src = u;
  });
}
// "1.234,50" e "12,5" viram número
const num = (v) => { const s = String(v ?? '').trim(); return Number(/,/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s) || 0; };
const vir = (n) => String(n ?? '').replace('.', ',');
acao('editar-prod', (b) => {
  const novo = !b.dataset.p;
  const p = novo ? { id: uid('p'), cat: db.categorias[0]?.id || '', nome: '', desc: '', preco: 0, setor: 'cozinha', foto: '', ativo: true, adicionais: [], ficha: [] } : prod(b.dataset.p);
  if (!p) return;
  let foto = p.foto || '', ficha = (p.ficha || []).map((f) => ({ ...f })), adic = (p.adicionais || []).map((a) => ({ ...a }));
  const linhasFicha = () => ficha.map((f, k) => {
    const i = insumo(f.insumo);
    return `<li><select data-fi="${k}" aria-label="Insumo">${db.insumos.map((x) => `<option value="${x.id}" ${x.id === f.insumo ? 'selected' : ''}>${t(x.nome)}</option>`).join('')}</select>
    <input data-fq="${k}" inputmode="decimal" value="${vir(f.qtd)}" aria-label="Quantidade"><small>${t(i?.unid || '')}</small><button type="button" class="bt-ico" data-ftira="${k}" aria-label="Tirar da ficha">${ico('lixo')}</button></li>`;
  }).join('');
  const linhasAdic = () => adic.map((a, k) => `<li><input data-an="${k}" value="${t(a.nome)}" placeholder="Ex.: Bacon" aria-label="Adicional"><input data-ap="${k}" inputmode="decimal" value="${vir(a.preco)}" aria-label="Preço do adicional"><button type="button" class="bt-ico" data-atira="${k}" aria-label="Tirar adicional">${ico('lixo')}</button></li>`).join('');
  const caixaFoto = () => (foto ? `<img src="${t(foto)}" alt="">` : `<span class="sem-foto grande">${ico('prato')}</span>`);
  folha({
    titulo: novo ? 'Novo prato' : p.nome, larga: true, corpo: `
    <div class="foto-prato"><div data-foto>${caixaFoto()}</div>
      <div class="linha-bts"><label class="bt">${ico('mais2')}<span data-tfoto>${foto ? 'Trocar a foto' : 'Pôr foto'}</span><input type="file" accept="image/*" data-arq hidden></label><button type="button" class="link" data-semfoto ${foto ? '' : 'hidden'}>Tirar a foto</button></div></div>
    <div class="duas-c"><label class="campo"><span>Nome</span><input data-n value="${t(p.nome)}" maxlength="80"></label><label class="campo"><span>Preço (R$)</span><input data-pr inputmode="decimal" value="${p.preco ? vir(p.preco) : ''}" placeholder="0,00"></label></div>
    <div class="duas-c"><label class="campo"><span>Categoria</span><select data-cat>${db.categorias.map((c) => `<option value="${c.id}" ${c.id === p.cat ? 'selected' : ''}>${t(c.nome)}</option>`).join('')}</select></label>
      <label class="campo"><span>Sai na tela da</span><select data-setor><option value="cozinha" ${p.setor !== 'bar' ? 'selected' : ''}>Cozinha</option><option value="bar" ${p.setor === 'bar' ? 'selected' : ''}>Bar</option></select></label></div>
    <label class="campo"><span>Descrição (aparece para o cliente)</span><textarea data-d rows="2" maxlength="240">${t(p.desc)}</textarea></label>
    <label class="interruptor bloco-int"><input type="checkbox" data-pizza ${p.pizza ? 'checked' : ''}><span></span>É pizza: aceita meia a meia e cobra o sabor mais caro</label>
    <label class="interruptor bloco-int"><input type="checkbox" data-kg ${p.porKg ? 'checked' : ''}><span></span>Vendido por quilo: o preço é do quilo e pede o peso na hora</label>
    <div class="campo"><span>Adicionais</span><ul class="ficha-ed" data-adic>${linhasAdic()}</ul><button type="button" class="link" data-maisadic>+ Adicional</button></div>
    <div class="campo"><span>Ficha técnica: o que sai do estoque a cada 1 vendido</span>${db.insumos.length ? `<ul class="ficha-ed" data-ficha>${linhasFicha()}</ul><button type="button" class="link" data-maisficha>+ Insumo na ficha</button>` : '<p class="mudo">Cadastre os insumos em Mais › Estoque para o sistema baixar o estoque e calcular o custo do prato.</p>'}</div>
    ${novo ? '' : '<button type="button" class="bt perigo" data-apagar>Apagar este prato</button>'}`,
    pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
    aoAbrir: (f, fechar) => {
      const lerListas = () => {
        ficha = ficha.map((x, k) => ({ insumo: $(`[data-fi="${k}"]`, f)?.value || x.insumo, qtd: num($(`[data-fq="${k}"]`, f)?.value) }));
        adic = adic.map((x, k) => ({ nome: $(`[data-an="${k}"]`, f)?.value.trim() || '', preco: num($(`[data-ap="${k}"]`, f)?.value) }));
      };
      const redesenha = () => { const fi = $('[data-ficha]', f); if (fi) fi.innerHTML = linhasFicha(); $('[data-adic]', f).innerHTML = linhasAdic(); };
      f.addEventListener('click', (e) => {
        const x = e.target.closest('[data-ftira],[data-atira]'); if (!x) return; lerListas();
        if (x.dataset.ftira !== undefined) ficha.splice(Number(x.dataset.ftira), 1); else adic.splice(Number(x.dataset.atira), 1);
        redesenha();
      });
      $('[data-maisficha]', f)?.addEventListener('click', () => { lerListas(); ficha.push({ insumo: db.insumos[0].id, qtd: 0 }); redesenha(); $(`[data-fq="${ficha.length - 1}"]`, f)?.focus(); });
      $('[data-maisadic]', f).onclick = () => { lerListas(); adic.push({ nome: '', preco: 0 }); redesenha(); $(`[data-an="${adic.length - 1}"]`, f)?.focus(); };
      const mostraFoto = () => { $('[data-foto]', f).innerHTML = caixaFoto(); $('[data-tfoto]', f).textContent = foto ? 'Trocar a foto' : 'Pôr foto'; $('[data-semfoto]', f).hidden = !foto; };
      $('[data-arq]', f).onchange = async (e) => {
        const a = e.target.files?.[0]; if (!a) return;
        try { foto = await reduzirFoto(a); mostraFoto(); } catch { toast('Não consegui abrir essa foto. Tente outra.'); }
      };
      $('[data-semfoto]', f).onclick = () => { foto = ''; mostraFoto(); };
      $('[data-apagar]', f)?.addEventListener('click', async () => {
        if (!(await confirma(`Apagar ${p.nome} do cardápio?`, 'Apagar', true))) return;
        db.produtos = db.produtos.filter((x) => x !== p); grava(); fechar(); toast('Prato apagado');
      });
      $('[data-ok]', f).onclick = () => {
        lerListas();
        const nome = $('[data-n]', f).value.trim(), preco = num($('[data-pr]', f).value);
        if (!nome) { toast('Escreva o nome do prato'); return $('[data-n]', f).focus(); }
        if (!(preco > 0)) { toast('Escreva o preço'); return $('[data-pr]', f).focus(); }
        Object.assign(p, {
          nome, preco: r2(preco), desc: $('[data-d]', f).value.trim(), cat: $('[data-cat]', f).value, setor: $('[data-setor]', f).value, pizza: $('[data-pizza]', f).checked, porKg: $('[data-kg]', f).checked,
          foto, adicionais: adic.filter((a) => a.nome).map((a) => ({ nome: a.nome, preco: r2(Math.max(0, a.preco)) })), ficha: ficha.filter((x) => x.insumo && x.qtd > 0),
        });
        if (novo) db.produtos.push(p);
        grava(); fechar(); toast(novo ? 'Prato cadastrado' : 'Prato salvo');
      };
    },
  });
});
acao('cardapio-exemplo', async () => {
  if (!(await confirma('Carregar os 22 pratos de exemplo, com fotos e fichas técnicas? Depois é só trocar nomes e preços e apagar o que não serve.', 'Carregar'))) return;
  const { cardapioExemplo } = await import('./dados.js?v=1'); const ex = cardapioExemplo();
  db.produtos.push(...ex.produtos.filter((p) => !prod(p.id))); ex.insumos.forEach((i) => { if (!insumo(i.id)) db.insumos.push(i); });
  grava(); toast('Cardápio de exemplo carregado');
});
acao('categorias', () => {
  const linhas = () => db.categorias.map((c, k) => `<li><input data-cn="${k}" value="${t(c.nome)}" aria-label="Nome da categoria"><small>${db.produtos.filter((p) => p.cat === c.id).length} pratos</small></li>`).join('');
  folha({
    titulo: 'Categorias', corpo: `<p class="mudo">Categoria sem prato não aparece para o cliente.</p><ul class="ficha-ed" data-l>${linhas()}</ul><button type="button" class="link" data-mais>+ Categoria</button>`,
    pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
    aoAbrir: (f, fechar) => {
      const ler = () => db.categorias.forEach((c, k) => { const v = $(`[data-cn="${k}"]`, f)?.value.trim(); if (v) c.nome = v; });
      $('[data-mais]', f).onclick = () => { ler(); db.categorias.push({ id: uid('c'), nome: 'Nova categoria' }); $('[data-l]', f).innerHTML = linhas(); $(`[data-cn="${db.categorias.length - 1}"]`, f).select(); };
      $('[data-ok]', f).onclick = () => { ler(); grava(); fechar(); toast('Categorias salvas'); };
    },
  });
});
acao('editar-insumo', (b) => {
  const novo = !b.dataset.i;
  const i = novo ? { id: uid('i'), nome: '', unid: 'g', compra: 'kg', fator: 1000, estoque: 0, minimo: 0, custo: 0 } : insumo(b.dataset.i);
  if (!i) return;
  folha({
    titulo: novo ? 'Novo insumo' : i.nome, corpo: `
    <label class="campo"><span>Nome</span><input data-n value="${t(i.nome)}" placeholder="Ex.: Queijo muçarela" maxlength="60"></label>
    <div class="duas-c"><label class="campo"><span>Usa na receita em</span><select data-u>${[['g', 'gramas (g)'], ['ml', 'mililitros (ml)'], ['un', 'unidades']].map(([v, n]) => `<option value="${v}" ${i.unid === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="campo"><span>Compra em</span><input data-c value="${t(i.compra)}" placeholder="kg, L, cx 12…"></label></div>
    <div class="duas-c"><label class="campo"><span>Quanto vem em 1 <i data-cl>${t(i.compra)}</i></span><input data-f inputmode="decimal" value="${vir(i.fator)}"></label>
      <label class="campo"><span>Preço de 1 <i data-cl>${t(i.compra)}</i> (R$)</span><input data-p inputmode="decimal" value="${vir(i.custo)}"></label></div>
    <div class="duas-c"><label class="campo"><span>Tem agora (na unidade da receita)</span><input data-e inputmode="decimal" value="${vir(saldo(i))}"></label>
      <label class="campo"><span>Avisar abaixo de</span><input data-m inputmode="decimal" value="${vir(i.minimo)}"></label></div>
    ${novo ? '' : '<button type="button" class="bt perigo" data-apagar>Apagar este insumo</button>'}`,
    pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
    aoAbrir: (f, fechar) => {
      $('[data-c]', f).oninput = (e) => $$('[data-cl]', f).forEach((x) => { x.textContent = e.target.value; });
      $('[data-apagar]', f)?.addEventListener('click', async () => {
        const usa = db.produtos.filter((p) => (p.ficha || []).some((x) => x.insumo === i.id));
        if (!(await confirma(usa.length ? `${i.nome} está na ficha de ${usa.length} prato(s). Apagar mesmo assim? Sai da ficha deles.` : `Apagar ${i.nome}?`, 'Apagar', true))) return;
        usa.forEach((p) => { p.ficha = p.ficha.filter((x) => x.insumo !== i.id); }); db.insumos = db.insumos.filter((x) => x !== i); grava(); fechar(); toast('Insumo apagado');
      });
      $('[data-ok]', f).onclick = () => {
        const nome = $('[data-n]', f).value.trim(); if (!nome) { toast('Escreva o nome do insumo'); return $('[data-n]', f).focus(); }
        Object.assign(i, {
          nome, unid: $('[data-u]', f).value, compra: $('[data-c]', f).value.trim() || $('[data-u]', f).value, fator: num($('[data-f]', f).value) || 1,
          custo: r2(num($('[data-p]', f).value)), estoque: num($('[data-e]', f).value), geracao: Date.now(), minimo: num($('[data-m]', f).value),
        });
        if (novo) db.insumos.push(i);
        grava(); fechar(); toast(novo ? 'Insumo cadastrado' : 'Insumo salvo');
      };
    },
  });
});
acao('compra', () => {
  if (!db.insumos.length) { toast('Cadastre primeiro o insumo (Novo insumo)'); return; }
  folha({ titulo: 'Entrada de compra', corpo: `<label class="campo"><span>Insumo</span><select data-i>${db.insumos.map((i) => `<option value="${i.id}">${t(i.nome)} (${t(i.compra)})</option>`).join('')}</select></label>
    <div class="duas-c"><label class="campo"><span>Quantidade comprada</span><input data-q inputmode="decimal" placeholder="Ex.: 5"></label><label class="campo"><span>Preço pago por unidade (R$)</span><input data-c inputmode="decimal" placeholder="opcional"></label></div><p class="mudo" data-conv></p>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Dar entrada</button>',
  aoAbrir: (f, fechar) => {
    const conv = () => { const i = insumo($('[data-i]', f).value); const q = Number(String($('[data-q]', f).value).replace(',', '.')) || 0; $('[data-conv]', f).textContent = q ? `Entra ${fmtQtd(q * i.fator, i.unid)} no estoque.` : ''; };
    $('[data-q]', f).oninput = conv; $('[data-i]', f).onchange = conv;
    $('[data-ok]', f).onclick = () => { const q = Number(String($('[data-q]', f).value).replace(',', '.')); if (!(q > 0)) return toast('Informe a quantidade'); entradaCompra($('[data-i]', f).value, q, Number(String($('[data-c]', f).value).replace(',', '.')) || 0); fechar(); toast('Estoque atualizado'); };
  } });
});
acao('lista-compras', () => {
  const l = db.insumos.filter((i) => saldo(i) <= i.minimo * 1.5).map((i) => { const falta = Math.max(0, i.minimo * 2 - saldo(i)); return `• ${i.nome}: ${Math.ceil(falta / i.fator)} ${i.compra}`; });
  const txt = `Lista de compras · ${db.config.nome}\n${l.join('\n') || 'Nada para comprar agora.'}`;
  folha({ titulo: 'Lista de compras', corpo: `<pre class="pre">${t(txt)}</pre><p class="mudo">Calculada para deixar cada item com o dobro do mínimo.</p>`, pe: `<a class="bt zap grande" href="https://wa.me/?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">${ico('zap')}Mandar no WhatsApp</a>` });
});
acao('imprimir-qr', () => {
  const w = window.open('', '_blank'); if (!w) return toast('Libere as janelas para imprimir');
  w.document.write(`<!doctype html><meta charset="utf-8"><title>QR das mesas</title><style>body{font-family:Georgia,serif;margin:0}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm;padding:10mm}figure{margin:0;border:1px dashed #b4532f;border-radius:6mm;padding:6mm;text-align:center;break-inside:avoid}figcaption{font-size:20px;margin-top:3mm;color:#3b2a22}p{font:12px sans-serif;margin:2mm 0 0;color:#555}</style>
    <div class="g">${Array.from({ length: db.config.mesas }, (_, k) => `<figure>${qrSVG(linkCardapio(`mesa=${k + 1}`), 180, '#3B2A22')}<figcaption>${t(db.config.nome)} · Mesa ${k + 1}</figcaption><p>Aponte a câmera para ver o cardápio, pedir e chamar o garçom</p></figure>`).join('')}</div><script>print()<\/script>`);
  w.document.close();
});
acao('papel', (b) => { setPapel(b.dataset.p); toast(`Este aparelho agora é: ${PAPEIS[b.dataset.p][0]}`); ir(PAPEIS[b.dataset.p][1]); });
acao('recomecar', async () => { if (await confirma('Apagar tudo e voltar aos dados de exemplo?', 'Recomeçar', true)) { const { recomecar } = await import('./loja.js?v=1'); recomecar(); ir('salao'); } });
