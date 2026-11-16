// Implantação guiada: as 8 etapas para a revenda começar a usar o Anshur sozinha, sem reunião nem visita.
// Regras puras (testadas em testes_implantacao.js). A tela fica no app.js (telaImplantacao).
// O progresso fica no estado da revenda (estado.implantacao), salvo na nuvem como o resto: vale em qualquer aparelho e para a equipe.
(function (raiz) {
  const ETAPAS = [
    { id: 'revenda', titulo: 'Dados da revenda', curto: 'Revenda',
      porque: 'O nome e o CNPJ aparecem nos relatórios, nos passaportes das máquinas e nos convites da equipe.',
      fazer: 'Confira o nome, informe o CNPJ, a cidade e as marcas que a revenda representa.' },
    { id: 'lojas', titulo: 'Lojas', curto: 'Lojas',
      porque: 'Com mais de uma loja, cada máquina fica na unidade certa e você vê o pátio de cada uma ou de todas juntas.',
      fazer: 'Cadastre cada loja ou unidade. Se a revenda tem uma loja só, é só dizer.' },
    { id: 'regras', titulo: 'Regras comerciais e alçadas', curto: 'Regras',
      porque: 'A margem que você quer ganhar e o custo do dinheiro parado mudam o valor máximo que o Anshur indica pagar no usado.',
      fazer: 'Confira a margem-alvo, o custo do capital e a comissão. Depois diga quanto acima do valor máximo o vendedor e o gerente podem liberar sem pedir ao dono.' },
    { id: 'equipe', titulo: 'Equipe', curto: 'Equipe',
      porque: 'Cada pessoa entra com o próprio acesso e vê só o que o perfil dela permite. O que cada um faz fica registrado.',
      fazer: 'Convide o gerente, os vendedores, a oficina e o financeiro. Cada convite vira um link que você manda por WhatsApp ou e-mail.' },
    { id: 'historico', titulo: 'Histórico de trocas já vendidas', curto: 'Histórico',
      porque: 'O Anshur aprende com as trocas que a revenda já vendeu. Quanto mais trocas, mais certo o valor indicado (mínimo 10, ideal 50 ou mais).',
      fazer: 'Baixe a planilha modelo, preencha (ou use a exportação do seu sistema atual) e envie aqui. Antes de entrar, você confere o que foi lido.' },
    { id: 'estoque', titulo: 'Estoque atual', curto: 'Estoque',
      porque: 'Com as máquinas que estão hoje no pátio, o Anshur mostra o dinheiro parado, os dias de cada uma e o que pede atenção.',
      fazer: 'Cadastre as máquinas usadas que estão no pátio hoje, à mão ou puxando da nota, foto ou PDF.' },
    { id: 'avaliacao', titulo: 'Primeira avaliação de troca', curto: 'Avaliação',
      porque: 'É o uso do dia a dia: antes de fechar a troca, saber quanto vale pagar no usado do cliente.',
      fazer: 'Avalie uma troca de verdade (pode ser uma que está em negociação). Depois volte para cá.' },
    { id: 'instalar', titulo: 'Instalar e escolher os avisos', curto: 'Instalar',
      porque: 'Instalado, o Anshur abre pelo ícone e funciona sem internet no pátio. Os avisos por e-mail mostram só o que pede atenção.',
      fazer: 'Instale no computador e no celular e escolha quem recebe o resumo por e-mail.' }
  ];
  const TOTAL = ETAPAS.length;
  const MIN_HISTORICO = 10;
  const PERFIS = ['dono', 'gerente'];
  const podeVer = (perfil) => PERFIS.includes(perfil);

  // colunas que o importador (importar.js) reconhece pelo cabeçalho, na ordem que ele usa quando não há cabeçalho
  const MODELO = {
    arquivo: 'anshur-modelo-trocas.csv',
    cabecalho: ['Categoria', 'Fabricante', 'Modelo', 'Ano', 'Horas', 'Estado (1 a 5)', 'Valor pago na troca', 'Valor vendido', 'Dias no pátio', 'Fipe (opcional)', 'Data da troca', 'Data da venda'],
    exemplo: ['Trator', 'Massey Ferguson', 'MF 4709', '2019', '5200', '3', 'R$ 210.000,00', 'R$ 265.000,00', '48', '', '10/03/2025', '27/04/2025']
  };
  const linhasModelo = () => [MODELO.cabecalho.slice(), MODELO.exemplo.slice()];
  // a linha de exemplo do modelo não pode entrar como troca de verdade se a pessoa esquecer de apagar
  const ehExemplo = (t) => !!t && t.tipo === 'trator' && String(t.modelo || '').trim().toUpperCase() === 'MF 4709' && +t.ano === 2019 && +t.horas === 5200 && Math.round(t.pago) === 210000 && Math.round(t.vendido) === 265000;

  const novo = (hoje) => ({ inicio: hoje || new Date().toISOString().slice(0, 10), feitas: {}, puladas: {} });
  const norm = (imp) => Object.assign({ feitas: {}, puladas: {} }, imp || {});

  // sinais: números que o app lê do estado (cnpj, lojas, config, alcadas, usuarios, vendidas, patio, avaliacoes, instalado, avisos)
  function automatico(id, s, imp) {
    s = s || {}; imp = norm(imp);
    switch (id) {
      case 'revenda': return !!String(s.cnpj || '').trim();
      case 'lojas': return (s.lojas || 0) >= 1;
      case 'regras': return (s.config || 0) > 0 || !!s.alcadas;
      case 'equipe': return (s.usuarios || 0) > 1 || (imp.convites || 0) > 0;
      case 'historico': return (s.vendidas || 0) >= MIN_HISTORICO;
      case 'estoque': return (s.patio || 0) > 0;
      case 'avaliacao': return (s.avaliacoes || 0) > 0;
      case 'instalar': return !!s.instalado || !!s.avisos || !!imp.avisos;
      default: return false;
    }
  }
  // cada etapa: { ...def, n, auto (detectada), manual (marcada à mão), ok, pulada }
  function situacao(imp, sinais) {
    imp = norm(imp);
    return ETAPAS.map((e, i) => {
      const auto = automatico(e.id, sinais, imp), manual = !!imp.feitas[e.id];
      const ok = auto || manual;
      return Object.assign({}, e, { n: i + 1, auto, manual, ok, pulada: !ok && !!imp.puladas[e.id] });
    });
  }
  const progresso = (lista) => { const feitas = lista.filter((e) => e.ok).length; return { feitas, total: lista.length, pct: lista.length ? feitas / lista.length : 0, texto: `${feitas} de ${lista.length} etapas` }; };
  const todasFeitas = (lista) => lista.every((e) => e.ok);
  const concluida = (imp, lista) => todasFeitas(lista) || !!norm(imp).concluida;
  // próxima etapa depois de i que ainda falta (pulada conta como vista quando pularPuladas); -1 = fim
  function proxima(lista, i, pularPuladas = true) {
    for (let k = i + 1; k < lista.length; k++) if (!lista[k].ok && !(pularPuladas && lista[k].pulada)) return k;
    return -1;
  }
  // onde abrir: a etapa guardada; senão a primeira que falta (sem as puladas); senão a primeira pulada; senão o fim
  function inicial(lista, guardada) {
    if (guardada === 'fim') return 'fim';
    const g = parseInt(guardada, 10); if (g >= 0 && g < lista.length) return g;
    const a = lista.findIndex((e) => !e.ok && !e.pulada); if (a >= 0) return a;
    const b = lista.findIndex((e) => !e.ok); return b >= 0 ? b : 'fim';
  }
  function marcar(imp, id, quem, quando) {
    imp = norm(imp); imp.feitas = Object.assign({}, imp.feitas, { [id]: { por: quem || '', quando: quando || new Date().toISOString() } });
    const p = Object.assign({}, imp.puladas); delete p[id]; imp.puladas = p; return imp;
  }
  function desmarcar(imp, id) { imp = norm(imp); const f = Object.assign({}, imp.feitas); delete f[id]; imp.feitas = f; delete imp.concluida; return imp; }
  function pular(imp, id) { imp = norm(imp); if (!imp.feitas[id]) imp.puladas = Object.assign({}, imp.puladas, { [id]: true }); return imp; }

  // abre sozinha logo depois que a revenda é criada: ambiente real, dono ou gerente, nada importado ainda e nunca aberta
  const deveAbrirSozinha = ({ imp, perfil, ambiente, temDados }) => ambiente === 'op' && podeVer(perfil) && !imp && !temDados;
  // aviso fixo no painel inicial enquanto falta alguma etapa (o dono pode esconder)
  const mostrarAviso = ({ imp, perfil, lista }) => podeVer(perfil) && !norm(imp).escondido && !concluida(imp, lista);

  const API = { ETAPAS, TOTAL, MIN_HISTORICO, MODELO, linhasModelo, ehExemplo, podeVer, novo, automatico, situacao, progresso, todasFeitas, concluida, proxima, inicial, marcar, desmarcar, pular, deveAbrirSozinha, mostrarAviso };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else raiz.IMPLANTACAO = API;
})(typeof window !== 'undefined' ? window : globalThis);
