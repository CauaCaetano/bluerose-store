// Veltria Agenda · ferramentas: comissão, preço do serviço, sinal e rendimento do produto (Básico)
// e clientes sumidas, aniversariantes, pacotes acabando e produtos para repor (Pro).
import { esc, moeda, hoje, diaMais, diasAte, dataCurta } from '../base/nexo.js';
import { bloco, ldLista, ldItem, campoN, calc, n0, fmtN, zap, copiar, registrarCalcs } from '../base/lado.js';

const primeiro = (n) => String(n || '').split(' ')[0];
const cliente = (a, id) => a.db.obter('clientes', id);
const aniversarioEm = (nasc, dias) => { if (!nasc) return null; for (let k = 0; k <= dias; k++) { const d = diaMais(k); if (d.slice(5) === nasc.slice(5)) return d; } return null; };

registrarCalcs({
  comissao: (f) => { const v = n0(f.valor.value), p = n0(f.pct.value), prod = n0(f.produtos.value);
    if (!v) return 'Informe o valor dos serviços.';
    const base = Math.max(0, v - prod), c = base * p / 100;
    return `Comissão (${fmtN(p)}% sobre ${moeda(base)}): <b>${moeda(c)}</b><br>Fica para o salão: <b>${moeda(v - c)}</b>${prod ? `<br><span class="mute">Descontados ${moeda(prod)} de produtos usados.</span>` : ''}`; },
  preco: (f) => { const prod = n0(f.produtos.value), min = n0(f.minutos.value), hora = n0(f.hora.value), m = n0(f.margem.value);
    const custo = prod + (min / 60) * hora;
    return custo ? `Custo do serviço: <b>${moeda(custo)}</b> (${moeda(prod)} de produto + ${fmtN(min, 0)} min).<br>Preço com ${fmtN(m)}% de margem: <b>${moeda(custo * (1 + m / 100))}</b>` : 'Informe o produto e o tempo.'; },
  sinal: (f) => { const v = n0(f.valor.value), p = n0(f.pct.value);
    return v ? `Sinal para reservar (${fmtN(p)}%): <b>${moeda(v * p / 100)}</b><br>Restante no dia: <b>${moeda(v - v * p / 100)}</b>` : 'Informe o valor do serviço.'; },
  rendimento: (f) => { const total = n0(f.total.value), uso = n0(f.uso.value), preco = n0(f.preco.value);
    if (!total || !uso) return 'Informe o tamanho da embalagem e o quanto usa por aplicação.';
    const n = Math.floor(total / uso);
    return `Rende <b>${n} aplicações</b>.${preco ? `<br>Custo por aplicação: <b>${moeda(preco / n)}</b>` : ''}`; },
});

export const LADOS = {
  calculos: () => bloco('Comissão do profissional', 'hand-coins', calc('comissao', campoN('valor', 'Serviços do dia (R$)', 850) + campoN('pct', 'Comissão (%)', 40) + campoN('produtos', 'Produtos usados (R$)', 60)))
    + bloco('Preço do serviço', 'calculator', calc('preco', campoN('produtos', 'Produtos (R$)', 35) + campoN('minutos', 'Tempo (minutos)', 90) + campoN('hora', 'Custo da hora (R$)', 40) + campoN('margem', 'Margem (%)', 80)))
    + bloco('Sinal para reservar', 'credit-card', calc('sinal', campoN('valor', 'Valor do serviço (R$)', 380) + campoN('pct', 'Sinal (%)', 30)))
    + bloco('Rendimento do produto', 'drop', calc('rendimento', campoN('total', 'Embalagem (ml ou g)', 1000) + campoN('uso', 'Por aplicação (ml ou g)', 40) + campoN('preco', 'Preço da embalagem (R$)', 120))),
  avisos: (a) => {
    const ult = {}; a.db.lista('agendamentos').filter((x) => ['concluido', 'atendimento', 'chegou'].includes(x.status)).forEach((x) => { if (!ult[x.cliente] || x.data > ult[x.cliente]) ult[x.cliente] = x.data; });
    const futuro = new Set(a.db.lista('agendamentos').filter((x) => x.data >= hoje() && !['cancelado', 'faltou'].includes(x.status)).map((x) => x.cliente));
    const sumidas = a.db.lista('clientes').filter((c) => ult[c.id] && diasAte(ult[c.id]) <= -45 && !futuro.has(c.id)).sort((x, y) => ult[x.id].localeCompare(ult[y.id]));
    const aniv = a.db.lista('clientes').map((c) => ({ c, d: aniversarioEm(c.nascimento, 7) })).filter((x) => x.d).sort((x, y) => x.d.localeCompare(y.d));
    const pacotes = a.db.lista('pacotes').filter((p) => (Number(p.sessoes) - Number(p.usadas) <= 1) || (p.validade && diasAte(p.validade) <= 15 && diasAte(p.validade) >= 0));
    const baixo = a.db.lista('produtos').filter((p) => Number(p.estoque) <= Number(p.minimo));
    const lista = baixo.map((p) => `• ${p.nome}${p.marca ? ` (${p.marca})` : ''}: ${Math.max(Number(p.minimo) * 2 - Number(p.estoque), Number(p.minimo))} un`).join('\n');
    return bloco('Clientes sumidas (45 dias ou mais)', 'megaphone', ldLista(sumidas.slice(0, 10).map((c) => ldItem(esc(c.nome), `última visita em ${dataCurta(ult[c.id])}`, {
        dir: zap(c.telefone, `Oi, ${primeiro(c.nome)}! Que saudade! Faz um tempinho que você não vem aqui no ${a.empresa}. Quer que eu reserve um horário esta semana?`, 'Chamar') })), 'Nenhuma cliente sumida.'))
      + bloco('Aniversariantes (7 dias)', 'cake', ldLista(aniv.slice(0, 10).map(({ c, d }) => ldItem(esc(c.nome), d === hoje() ? 'hoje' : dataCurta(d), {
        dir: zap(c.telefone, `Feliz aniversário, ${primeiro(c.nome)}! O ${a.empresa} preparou um mimo para você no seu próximo horário. Quer agendar?`, 'Parabéns') })), 'Nenhum aniversário nos próximos 7 dias.'))
      + bloco('Pacotes acabando ou vencendo', 'ticket', ldLista(pacotes.map((p) => { const c = cliente(a, p.cliente) || {}, resta = Number(p.sessoes) - Number(p.usadas);
        return ldItem(esc(c.nome || ''), `${resta} ${resta === 1 ? 'sessão restante' : 'sessões restantes'}${p.validade ? ` · vale até ${dataCurta(p.validade)}` : ''}`, { dir: zap(c.telefone, `Oi, ${primeiro(c.nome)}! O seu pacote está quase no fim (${resta} ${resta === 1 ? 'sessão' : 'sessões'}${p.validade ? `, válido até ${dataCurta(p.validade)}` : ''}). Quer garantir o próximo com condição especial?`, 'Renovar') }); }), 'Nenhum pacote acabando.'))
      + bloco('Produtos para repor', 'shopping-cart', baixo.length ? `<pre class="ld-pre">${esc(lista)}</pre><div class="ld-atalhos">${copiar(`Olá! Pedido do ${a.empresa}:\n${lista}\nObrigado!`, 'Copiar o pedido')}</div>` : ldLista([], 'Nenhum produto abaixo do mínimo.'));
  },
};

export const ITENS = [
  ['comissao', 'Comissão do profissional', 'hand-coins', 'calculos', 'Comissão do profissional'],
  ['preco', 'Preço do serviço', 'calculator', 'calculos', 'Preço do serviço'],
  ['sinal', 'Sinal para reservar', 'credit-card', 'calculos', 'Sinal'],
  ['rendimento', 'Rendimento do produto', 'drop', 'calculos', 'Rendimento'],
  ['sumidas', 'Clientes sumidas', 'megaphone', 'avisos', 'Clientes sumidas'],
  ['aniversarios', 'Aniversariantes', 'cake', 'avisos', 'Aniversariantes'],
  ['pacotes', 'Pacotes acabando', 'ticket', 'avisos', 'Pacotes'],
  ['repor', 'Produtos para repor', 'shopping-cart', 'avisos', 'Produtos para repor'],
];
