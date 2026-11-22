# Popina · chaves que o cardápio do cliente lê (branch popina-operacao, 22/11/2026)

Tudo fica no estado do restaurante (`localStorage` `popina-v1` na demonstração; na conta real, o mesmo objeto na nuvem).
Nada antigo foi renomeado ou apagado: são só campos novos, opcionais, com padrão "desligado".

## Lidas pelo cardápio (cliente.js)

| Chave | Formato | O que o cardápio faz |
|---|---|---|
| `db.bairros` | `[{ nome, taxa }]` | Já existia. Taxa por bairro (Gestão › Restaurante › Taxa por bairro). |
| `db.config.loja.pausada` | `null` ou `{ ts, ate, motivo, quem }` (`ate` em ms; `0` = até o dono voltar) | Pausado quando `pausada && (!pausada.ate \|\| pausada.ate > Date.now())`. Mostrar a loja fechada com o `motivo` e não deixar pedir. Liga em Pedidos › "Pausar pedidos online". |
| `db.config.loja.cupons` | `[{ id, codigo, tipo, valor, minimo, validade, limite, usos, ativo, criado }]` | `tipo`: `'pct'` (% dos itens), `'valor'` (R$ nos itens) ou `'frete'` (entrega grátis). `codigo` em MAIÚSCULAS. `minimo` em R$ sobre os itens (0 = sem). `validade` = `'AAAA-MM-DD'` (vale até 23:59 desse dia; vazio = sem). `limite` = máx. de usos (0 = sem); `usos` = quantos já usaram. Só vale se `ativo !== false`. Tela: Gestão › Cupons. |
| `db.config.loja.horarios` | já existia | Sem mudança. |
| `db.config.loja.aceiteAuto` | `true/false` | Só operação (não precisa ler). |

Para conferir um cupom no cardápio, a mesma regra está exportada em `loja.js`: `cupomValido(codigo, subtotalDosItens)` devolve o cupom ou `null`.

## Campos do pedido que o cardápio pode mandar (todos opcionais)

Recebidos em `window.popinaChegou` (loja.js) para `tipo` `delivery`/`balcao`:

| Campo em `dados` | O que acontece no sistema |
|---|---|
| `cupom` | Conferido de novo aqui (`aplicarCupom`): código, ativo, validade, mínimo e limite. Se valer: `c.desconto` + `c.descontoInfo.motivo = 'Cupom X'` (ou `taxaEntrega = 0` no frete) e `usos++`. Se não valer: entra sem desconto e fica no histórico do pedido. |
| `desconto`, `taxa`, `total` | **Não são usados para cobrar** (vêm do aparelho do cliente). A taxa é a do bairro e o desconto é o do cupom conferido. Se o `total` informado for diferente do total calculado, fica um aviso no histórico ("O que aconteceu"). |
| `referencia` | Vai para `c.cliente.ref`; aparece na comanda e na via impressa. |
| `agendado` | `'AAAA-MM-DDTHH:MM'`, `'HH:MM'` (hoje) ou ms. Vira `c.agendado` (ms); aparece no cartão do quadro, na comanda e nas vias impressas. |

Pedido antigo (sem esses campos) entra exatamente como antes.

## Estados novos que o acompanhamento do pedido pode mostrar

- Recusado: o pedido sai de `db.comandas` e vai para `db.recusados` (`[{ id, ts, num, tipo, modo, onde, origem, cliente:{nome,tel}, total, motivo, quem }]`, `id` igual ao da comanda, ex. `'w123'`). Hoje `api.status` no exemplo devolve "recebido" para sempre nesse caso: sugerido devolver `{ etapa: 'recusado', motivo }` quando `db.recusados.some(x => x.id === id)`.
- Entrega concluída: `c.entrega = 'entregue'` (antes só existia `novo`/`preparo`/`saiu`).
- Pago antes de ficar pronto (balcão/retirada/entrega): a venda já entra em `db.vendas` e a comanda continua aberta com `c.quitado` (ms) e `c.vendaId` até "Entregue". Quem procura a venda pelo id da comanda deve olhar também `c.vendaId`.

## Pendências para o merge

- `cliente.js`, `cardapio.html` e `demo-cardapio.js` ainda importam `?v=45`; os outros arquivos foram para `?v=46` (sw.js com cache `popina-v46`). Subir esses três para `?v=46` no merge.
- No modo exemplo, `api.pedido` do cliente.js chama `novoPedido` direto (não passa pelo `popinaChegou`), então cupom/referência/agendado do exemplo não entram. Sugestão: no exemplo, chamar `window.popinaChegou([{ id, tipo, criado, dados }])` ou aplicar `aplicarCupom` depois de lançar os itens.
- Conta real: a função da nuvem `popina_cardapio` (SQL, fora deste repositório) precisa devolver `loja.pausada` e `loja.cupons` (se ela devolve o `config.loja` inteiro, já vem). O SQL `popina_status` precisa saber de `recusados`.
