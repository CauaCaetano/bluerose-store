// Tela do teste às cegas público. Tudo roda neste navegador: não há fetch nem envio de dados.
// O cálculo é o do motor real (motor.js) através de cegas.js, com a validação temporal (walk-forward).
// Base geral = base REAL de mercado (mercado.js): nada da demonstração fictícia (dados.js nem é carregado nesta página).
// A base de anúncios (mercado-anuncios.js, ~1,5 MB) é baixada depois que a página aparece (MERCADO_CARREGAR, em mercado.js).
function iniciarTesteCegas() {
  const MER = window.MERCADO, M = window.MOTOR, CG = window.CEGAS, IMP = window.IMPORTAR;
  const CHAVE = 'anshur-teste-cegas-v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const real = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  const realC = (v) => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (v) => (v * 100).toFixed(1).replace('.', ',') + '%';
  const sinal = (v) => (v > 0 ? '+ ' : v < 0 ? '− ' : '') + real(Math.abs(v));
  const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
  const hoje = (() => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); })();
  const CTX = CG.contextoMercado(MER, { motor: M, hoje });
  const MODELOS = CTX.modelos;
  const ctx = { modelos: MODELOS, hoje };
  const tela = $('#tc-tela');

  // quais modelos a base de mercado cobre (e quantos anúncios cada um tem)
  function desenharBase() {
    const el = $('#tc-base'); if (!el) return;
    const porTipo = Object.keys(CG.TIPOS).map((k) => [k, MODELOS.filter((m) => m.tipo === k)]).filter(([, l]) => l.length);
    el.innerHTML = `<p>${esc(CG.textoBase(CTX.mercado))}</p>
      <details><summary>Ver os ${MODELOS.length} modelos cobertos</summary>
        <p class="sub">Referência = mediana dos anúncios do modelo levada para 1 ano de uso. Modelo com menos de ${MER.minimo} anúncios não entra na lista, mas pode ser avaliado: é só digitar a marca e o modelo e informar o preço de referência (Fipe ou valor de um seminovo).</p>
        ${porTipo.map(([k, l]) => `<h3>${CG.TIPOS[k]} (${l.length})</h3><ul class="tc-cobertos">${l.map((m) => `<li data-modelo="${esc(m.marca + ' ' + m.modelo)}"><span>${esc(m.marca)} ${esc(m.modelo)}</span><small>${m.anuncios} anúncios · ${m.anos[0]}–${m.anos[1]} · mediana ${real(m.mediana)}</small></li>`).join('')}</ul>`).join('')}
      </details>`;
  }

  const vazia = () => ({ tipo: '', marca: '', modelo: '', ano: '', horas: '', estado: '', pago: null, vendido: null, dias: '', data: '' });
  let st = { etapa: 1, atual: 0, trocas: Array.from({ length: CG.TOTAL }, vazia), ver: [] };
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    if (salvo && Array.isArray(salvo.trocas) && salvo.trocas.length === CG.TOTAL) st = { ...st, ...salvo, ver: salvo.ver || [] };
  } catch (e) { /* sem rascunho */ }
  const guardar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(st)); } catch (e) { /* navegador sem espaço ou privado: segue sem rascunho */ } };

  function toast(msg, erro) {
    const t = document.createElement('div'); t.className = 'toast' + (erro ? ' erro' : ''); t.textContent = msg;
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), 4200);
  }
  const validas = () => st.trocas.filter((t) => CG.valida(t, ctx)).length;
  const descr = (t) => [t.marca, t.modelo].filter((x) => x && x !== CG.OUTRO).join(' ') || 'Troca sem modelo';

  function marcarEtapa() {
    $$('.tc-etapas li').forEach((li) => {
      const n = +li.dataset.etapa;
      if (n === st.etapa) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      li.classList.toggle('feita', n < st.etapa);
    });
  }
  function ir(etapa) { st.etapa = etapa; guardar(); desenhar(); const topo = $('.tc-etapas'); if (topo && window.scrollY > topo.offsetTop) topo.scrollIntoView({ block: 'start' }); }
  function desenhar() { marcarEtapa(); if (st.etapa === 3 && validas() === CG.TOTAL) return etapa3(); if (st.etapa === 2 && validas() === CG.TOTAL) return etapa2(); st.etapa = 1; marcarEtapa(); etapa1(); }

  // ---------- 1. informar as 5 trocas ----------
  const opcoes = (lista, sel) => lista.map(([v, n]) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(n)}</option>`).join('');
  function etapa1() {
    const i = st.atual, t = st.trocas[i], erros = CG.validar(t, ctx), ver = st.ver.includes(i);
    const tipos = Object.keys(CG.TIPOS).filter((k) => MODELOS.some((m) => m.tipo === k));
    const marcas = [...new Set(MODELOS.filter((m) => m.tipo === t.tipo).map((m) => m.marca))];
    const modelos = MODELOS.filter((m) => m.tipo === t.tipo && m.marca === t.marca).map((m) => m.modelo);
    const err = (k) => (erros[k] && erros[k] !== CG.FORA && (ver || (st.tocou || {})[i + k]) ? `<p class="tc-erro" id="e-${k}">${esc(erros[k])}</p>` : '');
    const inv = (k) => (erros[k] && erros[k] !== CG.FORA && (ver || (st.tocou || {})[i + k]) ? 'aria-invalid="true" aria-describedby="e-' + k + '"' : '');
    // marca e modelo: a lista sugere, mas aceita qualquer nome; fora da base, pede o preço de referência
    if (t.marca === CG.OUTRO) t.marca = ''; if (t.modelo === CG.OUTRO) t.modelo = '';
    const novo = !!(t.tipo && t.marca && t.modelo && !CG.doCatalogo(MODELOS, t));
    tela.innerHTML = `
      <section class="painel tc-form" aria-labelledby="tc-t1">
        <div class="tc-progresso"><p id="tc-prog-txt"></p><div class="tc-barra" aria-hidden="true"><i id="tc-prog-barra"></i></div></div>
        <div class="tc-abas" role="group" aria-label="Escolher a troca">${st.trocas.map((x, j) => `<button type="button" class="tc-aba" data-aba="${j}" ${j === i ? 'aria-current="true"' : ''}>Troca ${j + 1}<small></small></button>`).join('')}</div>
        <div class="painel-cab"><h2 id="tc-t1">Troca ${i + 1} de ${CG.TOTAL}</h2><p>Cadastre da mais antiga para a mais recente</p></div>
        <p class="ajuda">Use trocas que a revenda já vendeu. Não precisa de nome nem CPF do cliente: só a máquina e os valores.</p>
        <div class="campos">
          <div class="campo"><label for="f-tipo">Categoria</label><select id="f-tipo" data-k="tipo" ${inv('tipo')}><option value="">Escolha…</option>${opcoes(tipos.map((k) => [k, CG.TIPOS[k]]), t.tipo)}</select>${err('tipo')}</div>
          <div class="campo"><label for="f-marca">Marca</label><input id="f-marca" data-k="marca" data-livre list="dl-tc-marca" autocomplete="off" placeholder="${t.tipo ? 'Escolha ou digite' : 'Escolha a categoria antes'}" value="${esc(t.marca)}" ${t.tipo ? '' : 'disabled'} ${inv('marca')}><datalist id="dl-tc-marca">${marcas.map((m) => `<option value="${esc(m)}"></option>`).join('')}</datalist>${err('marca')}</div>
          <div class="campo inteiro"><label for="f-modelo">Modelo</label><input id="f-modelo" data-k="modelo" data-livre list="dl-tc-modelo" autocomplete="off" placeholder="${t.marca ? 'Escolha ou digite' : 'Escolha a marca antes'}" value="${esc(t.modelo)}" ${t.marca ? '' : 'disabled'} ${inv('modelo')}><datalist id="dl-tc-modelo">${modelos.map((m) => `<option value="${esc(m)}"></option>`).join('')}</datalist>${err('modelo')}</div>
          ${novo ? `<div class="campo inteiro tc-novo"><label for="f-ref">Preço de referência deste modelo</label><input id="f-ref" data-k="ref" data-dinheiro inputmode="decimal" placeholder="Fipe ou valor de um seminovo, ex.: R$ 450.000,00" value="${t.ref > 0 ? esc(realC(t.ref).slice(3)) : ''}" ${inv('ref')}>${err('ref')}<p class="tc-dica"><b>${esc(t.marca + ' ' + t.modelo)}</b> não está na nossa base de anúncios. Com o preço de referência, o teste avalia esta troca normalmente.</p></div>` : ''}
          <div class="campo"><label for="f-ano">Ano da máquina</label><input id="f-ano" data-k="ano" inputmode="numeric" maxlength="4" placeholder="Ex.: 2019" value="${esc(t.ano)}" ${inv('ano')}>${err('ano')}</div>
          ${CG.semHoras(t.tipo) ? '<div class="campo"><span class="rot-campo">Horas no horímetro</span><p class="sub" id="f-sem-horas">Implemento não tem horímetro: conta o ano e o estado.</p></div>'
            : `<div class="campo"><label for="f-horas">Horas no horímetro</label><input id="f-horas" data-k="horas" inputmode="numeric" placeholder="Ex.: 4200" value="${esc(t.horas)}" ${inv('horas')}>${err('horas')}</div>`}
          <div class="campo inteiro"><label for="f-estado">Estado na troca</label><select id="f-estado" data-k="estado" ${inv('estado')}><option value="">Escolha…</option>${opcoes(CG.ESTADOS.map((e) => [e.id, `${e.nome} (nota ${e.nota} de 5)`]), t.estado)}</select>${err('estado')}</div>
          <div class="campo"><label for="f-pago">Quanto a revenda pagou na troca</label><input id="f-pago" data-k="pago" data-dinheiro inputmode="decimal" placeholder="R$ 185.000,00" value="${t.pago > 0 ? esc(realC(t.pago).slice(3)) : ''}" ${inv('pago')}>${err('pago')}</div>
          <div class="campo"><label for="f-vendido">Por quanto vendeu depois</label><input id="f-vendido" data-k="vendido" data-dinheiro inputmode="decimal" placeholder="R$ 210.000,00" value="${t.vendido > 0 ? esc(realC(t.vendido).slice(3)) : ''}" ${inv('vendido')}>${err('vendido')}</div>
          <div class="campo"><label for="f-dias">Dias no pátio até vender</label><input id="f-dias" data-k="dias" inputmode="numeric" placeholder="Ex.: 45" value="${esc(t.dias)}" ${inv('dias')}>${err('dias')}</div>
          <div class="campo"><label for="f-data">Data aproximada da troca (opcional)</label><input id="f-data" data-k="data" type="date" max="${hoje}" value="${esc(t.data)}" ${inv('data')}>${err('data')}<p class="tc-dica">Se não lembrar o dia, use o dia 1º do mês. Sem data, isso entra como limitação no relatório.</p></div>
        </div>
        <div class="tc-nav">
          <div><button class="btn btn-linha" type="button" id="tc-ant" ${i === 0 ? 'disabled' : ''}>← Troca anterior</button>${i < CG.TOTAL - 1 ? '<button class="btn btn-linha" type="button" id="tc-prox">Próxima troca →</button>' : ''}</div>
          <button class="btn btn-ouro" type="button" id="tc-ir2">Continuar para a análise</button>
        </div>
        <p class="tc-falta" id="tc-falta"></p>
      </section>`;
    atualizarProgresso();
    $$('[data-k]', tela).forEach((el) => {
      const k = el.dataset.k;
      const ler = () => {
        const tr = st.trocas[i];
        if (el.hasAttribute('data-dinheiro')) { const v = IMP.dinheiro(el.value); tr[k] = v > 0 ? Math.round(v * 100) / 100 : null; }
        else if (['ano', 'horas', 'dias'].includes(k)) tr[k] = el.value.replace(/\D/g, '') === '' ? '' : +el.value.replace(/\D/g, '');
        else tr[k] = el.value;
        if (k === 'tipo') { tr.marca = ''; tr.modelo = ''; tr.ref = null; }
        guardar();
      };
      if (el.hasAttribute('data-livre')) {
        el.addEventListener('input', () => { st.trocas[i][k] = el.value; guardar(); atualizarProgresso(); });
        el.addEventListener('change', () => {
          const tr = st.trocas[i]; tr[k] = el.value.trim();
          // trocou a marca: o modelo da marca anterior sai (o digitado à mão para a mesma marca fica)
          if (k === 'marca' && tr.modelo && !MODELOS.some((m) => m.tipo === tr.tipo && m.marca === tr.marca && m.modelo === tr.modelo) && MODELOS.some((m) => m.tipo === tr.tipo && m.modelo === tr.modelo)) tr.modelo = '';
          guardar(); tocar(i, k); etapa1();
          const prox = $(k === 'marca' ? '#f-modelo' : ($('#f-ref') ? '#f-ref' : '#f-ano')); if (prox && !prox.disabled) prox.focus();
        });
        return;
      }
      if (el.tagName === 'SELECT' || el.type === 'date') el.addEventListener('change', () => { ler(); tocar(i, k); etapa1(); const novo = $('#' + el.id); if (novo && !novo.disabled) novo.focus(); });
      else {
        el.addEventListener('input', () => { if (['ano', 'horas', 'dias'].includes(k)) el.value = el.value.replace(/\D/g, ''); ler(); atualizarProgresso(); });
        el.addEventListener('blur', () => { ler(); if (el.hasAttribute('data-dinheiro') && st.trocas[i][k] > 0) el.value = realC(st.trocas[i][k]).slice(3); if (el.value !== '' || ver) tocar(i, k); atualizarErro(el, k); atualizarProgresso(); });
      }
    });
    $$('[data-aba]', tela).forEach((b) => b.onclick = () => trocarPara(+b.dataset.aba));
    $('#tc-ant').onclick = () => trocarPara(i - 1);
    const px = $('#tc-prox'); if (px) px.onclick = () => trocarPara(i + 1);
    $('#tc-ir2').onclick = () => {
      if (validas() === CG.TOTAL) { ir(2); return; }
      st.ver = [...new Set(st.ver.concat([i]))]; guardar();
      const primeira = st.trocas.findIndex((x) => !CG.valida(x, ctx));
      toast(`Faltam ${CG.TOTAL - validas()} ${CG.TOTAL - validas() === 1 ? 'troca válida' : 'trocas válidas'}. Abrimos a troca ${primeira + 1}.`, true);
      trocarPara(primeira, true);
    };
  }
  function tocar(i, k) { st.tocou = st.tocou || {}; st.tocou[i + k] = 1; guardar(); }
  function atualizarErro(el, k) {
    const i = st.atual, erros = CG.validar(st.trocas[i], ctx), campo = el.closest('.campo'), velho = $('.tc-erro', campo);
    if (velho) velho.remove(); el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby');
    if (erros[k] && erros[k] !== CG.FORA && (st.tocou || {})[i + k]) {
      el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', 'e-' + k);
      el.insertAdjacentHTML('afterend', `<p class="tc-erro" id="e-${k}">${esc(erros[k])}</p>`);
    }
  }
  function trocarPara(j, verErros) {
    if (j < 0 || j >= CG.TOTAL) return;
    const atual = st.trocas[st.atual];
    if (JSON.stringify(atual) !== JSON.stringify(vazia()) && !CG.valida(atual, ctx)) st.ver = [...new Set(st.ver.concat([st.atual]))];
    if (verErros) st.ver = [...new Set(st.ver.concat([j]))];
    st.atual = j; guardar(); etapa1();
    const t = $('#tc-t1'); if (t) t.scrollIntoView({ block: 'nearest' });
  }
  function atualizarProgresso() {
    const n = validas();
    const txt = $('#tc-prog-txt'); if (!txt) return;
    txt.innerHTML = `Trocas preenchidas: <b>${n} de ${CG.TOTAL}</b>`;
    $('#tc-prog-barra').style.width = (n / CG.TOTAL * 100) + '%';
    $$('[data-aba]', tela).forEach((b) => {
      const t = st.trocas[+b.dataset.aba], ok = CG.valida(t, ctx), vaz = JSON.stringify(t) === JSON.stringify(vazia());
      b.classList.toggle('ok', ok); b.classList.toggle('erro', !ok && !vaz && st.ver.includes(+b.dataset.aba));
      $('small', b).textContent = ok ? 'pronta' : vaz ? 'vazia' : 'incompleta';
      b.setAttribute('aria-label', `Troca ${+b.dataset.aba + 1}: ${ok ? 'pronta' : vaz ? 'vazia' : 'incompleta'}`);
    });
    const b2 = $('#tc-ir2'), falta = $('#tc-falta');
    b2.setAttribute('aria-disabled', n === CG.TOTAL ? 'false' : 'true');
    b2.classList.toggle('tc-bloq', n !== CG.TOTAL);
    falta.textContent = n === CG.TOTAL ? 'As 5 trocas estão prontas. Você ainda pode editar qualquer uma antes de calcular.' : `A análise abre quando as 5 trocas estiverem válidas (faltam ${CG.TOTAL - n}).`;
  }

  // ---------- 2. executar a análise ----------
  function etapa2() {
    const { ordem, porData, semData } = CG.ordenar(st.trocas);
    const maqs = ordem.map((i, k) => CG.paraMotor(st.trocas[i], k + 1, MODELOS));
    tela.innerHTML = `
      <section class="painel" aria-labelledby="tc-t2">
        <div class="painel-cab"><h2 id="tc-t2">Ordem da análise</h2><p>${porData ? 'Pela data da troca' : 'Pela ordem do cadastro'}</p></div>
        <p class="ajuda">O Anshur avalia uma troca por vez, da mais antiga para a mais recente, sem olhar quanto vocês pagaram nem por quanto venderam. A primeira usa só a base de mercado (preços pedidos em anúncios públicos); cada troca seguinte usa também as trocas de vocês que vieram antes dela, nunca as que vieram depois.${semData ? ` ${semData === CG.TOTAL ? 'Nenhuma troca tem data' : semData + ' trocas estão sem data'}: usamos a ordem do cadastro.` : ''}</p>
        <ol class="tc-ordem">${maqs.map((m, k) => { const h = CG.historicoPara(k, maqs); return `<li><b>${k + 1}</b><div>${esc(m.marca + ' ' + m.modelo)} · ${m.ano} · ${CG.semHoras(m.tipo) ? 'sem horímetro' : m.horas.toLocaleString('pt-BR') + ' h'}${m.entrada ? ' · troca em ' + dataBR(m.entrada) : ' · sem data'}
          <span>${h.usadas.length ? `Avaliada com a base de mercado + ${h.usadas.length === 1 ? 'a troca' : 'as trocas'} ${lista(h.usadas.map((j) => j + 1))} desta lista` : 'Avaliada só com a base de mercado'}${h.foraPorData.length ? ` (a troca ${lista(h.foraPorData.map((j) => j + 1))} ainda não tinha sido vendida e fica de fora)` : ''}.</span></div></li>`; }).join('')}</ol>
        <div class="tc-nav"><button class="btn btn-linha" type="button" id="tc-voltar1">← Editar as trocas</button><button class="btn btn-ouro" type="button" id="tc-calc">Executar a análise</button></div>
      </section>`;
    $('#tc-voltar1').onclick = () => ir(1);
    $('#tc-calc').onclick = (e) => { const b = e.currentTarget; b.classList.add('carregando'); setTimeout(() => ir(3), 250); };
  }
  const lista = (ns) => (ns.length <= 1 ? String(ns[0] ?? '') : ns.slice(0, -1).join(', ') + ' e ' + ns[ns.length - 1]);

  // ---------- 3. resultados ----------
  function etapa3() {
    const res = CG.analisar(st.trocas, CTX);
    const s = res.resumo, ok = res.linhas.filter((l) => l.r);
    const nomeEstado = (id) => (CG.ESTADOS.find((e) => e.id === id) || {}).nome || '';
    const card = (l) => {
      if (!l.r) return `<article class="tc-card" data-pos="${l.pos}" data-historico="${l.usadas.join(',')}"><div class="tc-card-cab"><div><h3>${esc(l.maq.marca + ' ' + l.maq.modelo)} · ${l.maq.ano}</h3></div><span class="tc-pos">${l.pos}</span></div><p class="tc-hist">Sem referência suficiente para avaliar esta troca. Ela ficou fora do resumo.</p></article>`;
      const r = l.r, lim = r.limites.filter((x) => /^Horas acima|atípica/.test(x));
      const aj = (nome, v) => `<li class="sub-item"><span>${nome}</span><b>${Math.abs(v) >= 1000 ? sinal(v) : 'efeito pequeno'}</b></li>`;
      return `<article class="tc-card ${l.dif > 0 ? 'acima' : 'dentro'}" data-pos="${l.pos}" data-historico="${l.usadas.join(',')}">
        <div class="tc-card-cab"><div><h3>${esc(l.maq.marca + ' ' + l.maq.modelo)} · ${l.maq.ano}</h3>
          <p>${CG.TIPOS[l.maq.tipo]} · ${CG.semHoras(l.maq.tipo) ? 'sem horímetro' : l.maq.horas.toLocaleString('pt-BR') + ' h'} · estado ${nomeEstado(l.troca.estado).toLowerCase()} · ${l.maq.entrada ? 'troca em ' + dataBR(l.maq.entrada) : 'sem data'}${l.cadastro !== l.pos ? ` · cadastrada como troca ${l.cadastro}` : ''}</p></div><span class="tc-pos" aria-label="Posição ${l.pos} na ordem">${l.pos}</span></div>
        <p class="tc-hist" data-hist>${l.usadas.length ? `Histórico usado: base de mercado + ${l.usadas.length === 1 ? 'a troca' : 'as trocas'} ${lista(l.usadas)} desta lista.` : 'Histórico usado: só a base de mercado (anúncios públicos). Nenhuma troca de vocês entrou no cálculo desta.'}${l.foraPorData.length ? ` A troca ${lista(l.foraPorData)} ficou de fora: ainda não tinha sido vendida nesta data.` : ''}</p>
        <ul class="tc-linhas">
          <li><span>Referência de mercado do modelo (mediana dos anúncios, levada para 1 ano de uso)</span><b>${real(r.ref)}</b></li>
          <li><span>Venda estimada pelo Anshur${l.usadas.length ? '' : ' <small class="sub">(só com preços pedidos em anúncio)</small>'}</span><b>${real(r.venda)}</b></li>
          <li class="sub-item"><span>Ajustes frente às máquinas parecidas do cálculo:</span><b></b></li>
          ${aj('Idade', l.ajustes.idade)}${CG.semHoras(l.maq.tipo) ? '' : aj('Horas de uso', l.ajustes.horas)}${aj('Conservação', l.ajustes.conservacao)}
          <li><span>Custo de preparo previsto</span><b class="neg">− ${real(r.preparo)}</b></li>
          <li><span>Margem-alvo (${Math.round(r.margem * 100)}% da venda)</span><b class="neg">− ${real(l.margemValor)}</b></li>
          <li class="total"><span>Valor máximo recomendado pelo Anshur</span><b data-teto>${real(r.teto)}</b></li>
        </ul>
        <div class="tc-compara">
          <div><span>A revenda pagou</span><b>${real(l.maq.pago)}</b></div>
          <div><span>Diferença para o recomendado</span><b class="${l.dif > 0 ? 'neg' : 'pos'}" data-dif>${l.dif > 0 ? real(l.dif) + ' acima (' + pct(l.difPct) + ')' : l.dif < 0 ? real(-l.dif) + ' abaixo (' + pct(-l.difPct) + ')' : 'igual ao recomendado'}</b></div>
          <div><span>Vendeu depois por</span><b>${real(l.maq.vendido)}</b></div>
          <div><span>Venda menos valor pago</span><b class="${l.bruto < 0 ? 'neg' : 'pos'}">${l.bruto < 0 ? 'Prejuízo de ' + real(-l.bruto) : 'Lucro de ' + real(l.bruto)}</b></div>
          <div><span>Dias no pátio</span><b>${l.maq.diasPatio} dias${r.dias ? ` <small class="sub">(parecidas: ${r.dias})</small>` : ''}</b></div>
          <div><span>Erro da venda estimada</span><b>${pct(Math.abs(l.erroVenda))} ${l.erroVenda > 0 ? 'acima' : 'abaixo'}</b></div>
        </div>
        <p class="nota-rodape">Faixa de negociação: ${real(r.faixa[0])} a ${real(r.faixa[1])}. Conta: venda estimada − preparo − margem, arredondada para baixo no milhar.${lim.length ? ' ' + lim.map(esc).join(' ') : ''}</p>
      </article>`;
    };
    const liq = s.liquido;
    tela.innerHTML = `
      <p class="tc-so-impressao sub">Teste às cegas do Anshur · gerado em ${dataBR(hoje)} · calculado no navegador, nenhum dado foi enviado.</p>
      <section class="tc-placar" aria-labelledby="tc-t3">
        <span class="rot" id="tc-t3">Resultado das ${s.total} trocas</span>
        <div class="grande" data-liquido="${liq}">${liq > 0 ? real(liq) + ' a menos' : liq < 0 ? real(-liq) + ' abaixo' : 'Empate'}</div>
        <p>${liq > 0 ? `No total, o valor máximo do Anshur somaria <b>${real(liq)} a menos</b> do que a revenda pagou nessas trocas.` : liq < 0 ? `No total, a revenda pagou <b>${real(-liq)} abaixo</b> da soma dos valores máximos do Anshur.` : 'No total, a revenda pagou o mesmo que o Anshur recomendaria.'} Em <b data-acima>${s.acima} de ${s.n}</b> trocas a revenda pagou acima do valor máximo recomendado.${s.prejuizos ? ` ${s.prejuizos} ${s.prejuizos === 1 ? 'troca deu' : 'trocas deram'} prejuízo na venda${s.prejuizosAcima ? `, ${s.prejuizos === 1 ? '' : s.prejuizosAcima === s.prejuizos ? 'todas ' : s.prejuizosAcima + ' '}com pagamento acima do recomendado` : ''}.` : ''}</p>
        <div class="numeros">
          <div><span>Total pago nas trocas</span><b>${real(s.pago)}</b></div>
          <div><span>Soma dos valores máximos</span><b>${real(s.recomendado)}</b></div>
          <div><span>Pago acima do recomendado</span><b>${real(s.somaAcima)}</b></div>
          <div><span>Pago abaixo do recomendado</span><b>${real(s.somaAbaixo)}</b></div>
          <div><span>Erro médio da venda estimada</span><b>${pct(s.erroVendaMedio)}</b></div>
          <div><span>Dias no pátio (média)</span><b>${s.diasMedio}${s.diasAcima != null && s.acima < s.n ? ` · ${s.diasAcima} nas pagas acima` : ''}</b></div>
        </div>
      </section>
      <p class="ajuda" style="margin-bottom:12px">Uma estimativa, não um laudo: a diferença é uma oportunidade de revisar a decisão, não prejuízo comprovado. O Anshur também erra, e o erro médio da venda estimada está logo acima. O cálculo é feito por um modelo estatístico com a base de mercado (preços pedidos em anúncios públicos, não preços de venda fechada) e as trocas anteriores de vocês, não por IA.</p>
      <div class="tc-cards">${res.linhas.map(card).join('')}</div>
      <section class="painel" style="margin-top:14px" aria-labelledby="tc-lim"><h2 id="tc-lim">Limitações deste teste</h2><ul class="tc-limites">${res.limites.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>
      <div class="tc-acoes">
        <button class="btn btn-ouro" type="button" id="tc-imprimir">Imprimir ou salvar em PDF</button>
        <a class="btn btn-linha" id="tc-whats" href="#" target="_blank" rel="noopener">Mandar o resumo pelo WhatsApp</a>
        <a class="btn btn-linha" href="../anshur.html#assinar">Assinar o Anshur</a>
        <button class="btn btn-linha" type="button" id="tc-editar">Editar as trocas</button>
      </div>
      <p class="tc-falta tc-nao-imprime">O resumo só sai do seu navegador se você tocar em "Mandar o resumo pelo WhatsApp": aí é você quem envia a mensagem.</p>`;
    $('#tc-imprimir').onclick = () => window.print();
    $('#tc-whats').href = `https://wa.me/${window.BR_WA || ''}?text=${encodeURIComponent(CG.textoResumo(res))}`;
    $('#tc-editar').onclick = () => ir(1);
  }

  $('#tc-apagar').onclick = () => {
    if (!window.confirm('Apagar as 5 trocas e o resultado deste navegador? Não dá para desfazer.')) return;
    try { localStorage.removeItem(CHAVE); } catch (e) { /* nada guardado */ }
    st = { etapa: 1, atual: 0, trocas: Array.from({ length: CG.TOTAL }, vazia), ver: [] };
    desenhar(); toast('Dados apagados deste navegador.');
  };
  desenharBase();
  desenhar();
}

(function () {
  const tela = document.getElementById('tc-tela');
  if (window.MERCADO) { iniciarTesteCegas(); return; }
  if (tela) tela.innerHTML = '<section class="painel" role="status"><p>Carregando a base de mercado (anúncios públicos de máquinas e implementos usados)…</p></section>';
  const tentar = () => window.MERCADO_CARREGAR().then(iniciarTesteCegas, () => {
    if (!tela) return;
    tela.innerHTML = '<section class="painel" role="alert"><p>Não foi possível baixar a base de mercado. Confira a internet e tente de novo.</p><button class="btn btn-ouro" type="button" id="tc-tentar">Tentar de novo</button></section>';
    document.getElementById('tc-tentar').onclick = tentar;
  });
  tentar();
})();
