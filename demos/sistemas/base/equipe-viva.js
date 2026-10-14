// Equipe cadastrável: a lista fixa usada pela demonstração vira uma coleção que o dono edita.
// Na demonstração a coleção nasce com as pessoas de exemplo; na nuvem começa vazia e cada empresa cadastra a sua equipe.
// A lista original (array) é atualizada no lugar antes de cada tela, então o resto do sistema continua lendo dela.
import { esc, av, ic, editar, moeda, vazio } from './nexo.js';

export function paginaEquipe(e) {
  return {
    id: e.colecao, rot: e.rot, icone: e.icone, titulo: e.rot,
    novo: (a) => a.acoes.novoEquipe({ c: e.colecao }),
    render: (a) => (a.db.lista(e.colecao).length ? '' : vazio(e.icone, `Cadastre ${e.vazio}`, 'Quem você cadastrar aqui aparece para escolher nos formulários e nos relatórios.', `<button type="button" class="btn pri" data-acao="novoEquipe" data-c="${e.colecao}">${ic('plus')}Adicionar ${e.singular}</button>`))
      || a.tab({ id: e.colecao, colecao: e.colecao, singular: e.singular, plural: e.plural, ordem: 'nome',
        novo: { rot: `Adicionar ${e.singular}`, attrs: `data-acao="novoEquipe" data-c="${e.colecao}"` },
        aoClicar: async (id) => { if (await editar(a, e.colecao, a.db.obter(e.colecao, id))) a.render(); },
        colunas: [{ k: 'nome', rot: 'Nome', render: (r) => `<span class="flex" style="gap:9px">${av(r.nome)}<span class="prim">${esc(r.nome)}</span></span>` },
          ...e.campos.filter((c) => c.nome !== 'nome').map((c) => ({ k: c.nome, rot: c.rotulo.replace(/ \(.*\)$/, ''), n: c.tipo === 'moeda' || c.tipo === 'porcentagem',
            render: (r) => (r[c.nome] == null || r[c.nome] === '' ? '<span class="mute">—</span>' : c.tipo === 'moeda' ? moeda(r[c.nome]) : c.tipo === 'porcentagem' ? `${r[c.nome]}%` : esc(r[c.nome])) }))] }),
  };
}

export function equipeViva(app, e) {
  app.colecoes[e.colecao] = { singular: e.singular, plural: e.plural, genero: e.genero, campos: e.campos };
  const demo = e.lista.map(e.registro);
  const sincronizar = () => {
    if (!app.db) return;
    const l = app.db.lista(e.colecao);
    if (!l.length && !app.nuvem && !app.db.cfg[`equipe_${e.colecao}`]) { l.push(...demo.map((x) => ({ ...x }))); app.db.cfg[`equipe_${e.colecao}`] = 1; app.db.gravar(); }
    e.lista.splice(0, e.lista.length, ...l.filter((r) => r.nome).sort((x, y) => String(x.criado || '').localeCompare(String(y.criado || ''))).map(e.linha));
  };
  const antes = app.antesDeRender;
  app.antesDeRender = () => { antes?.(); sincronizar(); };
  app.acoes.novoEquipe = async (d) => { if (await editar(app, d.c)) app.render(); };
  sincronizar();
}
