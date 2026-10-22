// =============================================================
// Veltria · equipe: cargos sugeridos, resumo do acesso e o editor
// de cargo, papel e permissões. Usado pela versão na nuvem (Painel do
// dono) e pela demonstração.
// =============================================================
import { esc, ic, avisar, modal } from './nexo.js';

const NIVEIS = [['editar', 'Ver e editar'], ['ver', 'Só ver'], ['nenhum', 'Sem acesso']];

// cargos sugeridos: cada um já marca o que a pessoa pode fazer em cada área (o dono ajusta depois)
const FIN = /financ|gasto|cobran|receb|caixa|relat|mensal|aluguel|contas|conven|honor|comiss|estoque|compra/;
const ATEND = /client|agenda|atend|pacient|aluno|pedido|visita|negoc|funil|mesa|deliver|imove|processo|patio|servic|evento|convidad/;
export function cargosDe(cfg) {
  const pags = [...cfg.paginas.filter((x) => x.id).map((x) => x.id), 'config'];
  const montar = (f, excluir = false) => { const paginas = Object.fromEntries(pags.map((id) => [id, id === 'config' && f(id) === 'editar' ? 'ver' : f(id)])); return { paginas, excluir, so_leitura: !Object.values(paginas).includes('editar'), padrao: 'ver' }; };
  return [
    ...(cfg.cargos || []).map(([n, f, ex]) => [n, montar(f, ex)]),
    ['Gerente', montar(() => 'editar', true)],
    ['Financeiro', montar((id) => (FIN.test(id) ? 'editar' : 'ver'))],
    ['Atendimento', montar((id) => (ATEND.test(id) ? 'editar' : FIN.test(id) ? 'nenhum' : 'ver'))],
    ['Operação', montar((id) => (FIN.test(id) ? 'nenhum' : 'editar'))],
    ['Só consulta', montar(() => 'ver')],
  ];
}

// resumo de uma permissão para a lista da equipe
export function resumoAcesso(perm, papel) {
  const cargo = perm?.cargo ? `${perm.cargo} · ` : '';
  if (papel === 'dono') return 'Dono · acesso total';
  if (papel === 'admin') return `${cargo}Administrador · acesso total`;
  if (!perm || perm.total) return `${cargo}Acesso total`;
  const v = Object.values(perm.paginas || {}), ed = v.filter((x) => x === 'editar').length, so = v.filter((x) => x === 'ver').length;
  if (perm.so_leitura) return `${cargo}Só ver · ${so} ${so === 1 ? 'área' : 'áreas'}`;
  return `${cargo}Edita ${ed}, só vê ${so}${perm.excluir ? '' : ' · não apaga'}`;
}

// editor de acesso: cargo, papel (membro ou administrador) e o que a pessoa pode em cada área.
// Devolve { email, perm, papel } ou null se cancelou. perm.total = acesso total; o administrador também vê o Painel do dono.
export async function editarPermissoes(app, cfg, { titulo, atual, comEmail = false, papel = 'membro', podeAdmin = false }) {
  const paginas = [...cfg.paginas.filter((x) => x.id), { id: 'config', rot: 'Configurações' }];
  const cargos = cargosDe(cfg), personal = !!atual && !atual.total;
  const val = (id) => (atual?.paginas?.[id]) || (id === 'config' ? 'ver' : 'editar');
  const corpo = `<form class="col" style="gap:12px" data-perm>
    ${comEmail ? '<label class="campo">E-mail de quem vai usar<input name="email" type="email" required placeholder="nome@empresa.com.br"></label>' : ''}
    <div class="form-grade" style="gap:10px"><label class="campo">Cargo<input name="cargo" list="cargos-sugeridos" maxlength="40" value="${esc(atual?.cargo || '')}" placeholder="Ex.: ${esc(cargos[0][0])}"><datalist id="cargos-sugeridos">${cargos.map(([n]) => `<option value="${esc(n)}">`).join('')}</datalist><span class="ajuda">Escolha um cargo sugerido e as permissões já vêm marcadas</span></label>
      ${podeAdmin ? `<label class="campo">Papel<select name="papel"><option value="membro" ${papel !== 'admin' ? 'selected' : ''}>Membro da equipe</option><option value="admin" ${papel === 'admin' ? 'selected' : ''}>Administrador (vê o Painel do dono)</option></select></label>` : ''}</div>
    <div data-so-membro ${papel === 'admin' ? 'hidden' : ''}><div class="grupo-btn" role="radiogroup"><button type="button" data-modo-perm="total" aria-pressed="${!personal}">${ic('lock-open', 'p')}Acesso total</button><button type="button" data-modo-perm="personalizado" aria-pressed="${personal}">${ic('key', 'p')}Escolher o que pode</button></div>
    <div data-perm-lista ${personal ? '' : 'hidden'} style="margin-top:10px"><p class="mute-2" style="font-size:12.5px;margin:0 0 8px">Para cada área do sistema, escolha o que esta pessoa pode fazer. "Sem acesso" esconde a área do menu.</p>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 12px;align-items:center;max-height:46vh;overflow:auto">${paginas.map((pg) => `<span>${ic(pg.icone || 'gear-six', 'p')} ${esc(pg.rot)}</span><select data-pg="${esc(pg.id)}" style="width:auto;height:30px">${NIVEIS.map(([k, n]) => `<option value="${k}" ${val(pg.id) === k ? 'selected' : ''}>${n}</option>`).join('')}</select>`).join('')}</div>
      <label class="flex" style="gap:8px;margin-top:12px;font-size:13px"><input type="checkbox" name="excluir" ${atual?.excluir ? 'checked' : ''}> Pode apagar registros</label></div></div>
    <div class="dica" data-so-admin ${papel === 'admin' ? '' : 'hidden'}>${ic('crown')}<span>O administrador tem acesso total e entra no <b>Painel do dono</b> para convidar e organizar a equipe. Só o dono muda o plano e escolhe administradores.</span></div></form>`;
  const r = await modal({ titulo, largura: 560, corpo, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: comEmail ? 'Convidar' : 'Salvar', classe: 'pri', acao: (f) => {
    const fm = f.querySelector('[data-perm]'); if (comEmail && !fm.reportValidity()) return false;
    const email = comEmail ? fm.email.value.trim().toLowerCase() : '', cargo = fm.cargo.value.trim().slice(0, 40), pp = fm.papel?.value === 'admin' ? 'admin' : 'membro';
    if (pp === 'admin' || f.querySelector('[data-modo-perm="total"]').getAttribute('aria-pressed') === 'true') return { email, papel: pp, perm: cargo ? { total: true, cargo } : null };
    const pags = Object.fromEntries([...f.querySelectorAll('[data-pg]')].map((x) => [x.dataset.pg, x.value]));
    if (Object.values(pags).every((x) => x === 'nenhum')) { avisar('Deixe pelo menos uma área com acesso', { tipo: 'erro' }); return false; }
    return { email, papel: pp, perm: { ...(cargo ? { cargo } : {}), paginas: pags, excluir: fm.excluir.checked, so_leitura: !Object.values(pags).includes('editar'), padrao: 'ver' } };
  } }], aoAbrir: (f) => {
    const modo = (total) => { f.querySelectorAll('[data-modo-perm]').forEach((x) => x.setAttribute('aria-pressed', String((x.dataset.modoPerm === 'total') === total))); f.querySelector('[data-perm-lista]').hidden = total; };
    f.querySelectorAll('[data-modo-perm]').forEach((b) => (b.onclick = () => modo(b.dataset.modoPerm === 'total')));
    f.querySelector('[name=cargo]').addEventListener('change', (e) => { const c = cargos.find(([n]) => n.toLowerCase() === e.target.value.trim().toLowerCase()); if (!c) return; const pr = c[1]; modo(false); f.querySelectorAll('[data-pg]').forEach((x) => { x.value = pr.paginas[x.dataset.pg] || 'ver'; }); f.querySelector('[name=excluir]').checked = !!pr.excluir; });
    f.querySelector('[name=papel]')?.addEventListener('change', (e) => { const adm = e.target.value === 'admin'; f.querySelector('[data-so-membro]').hidden = adm; f.querySelector('[data-so-admin]').hidden = !adm; });
  } });
  return r;
}

