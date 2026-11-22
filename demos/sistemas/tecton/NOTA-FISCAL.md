# Tecton · Nota fiscal (22/11/2026)

Modelo "use o emissor que você já tem": a nota sai pela conta do próprio cliente. A Blue Rose não paga nada e não precisa de CNPJ.

## O que o cliente vê (Configurações › Nota fiscal, só o que é do ramo aberto)

**Loja de material** (`db.config.nf.modo`):

1. `api` · **Tenho conta num emissor online** (Brasil NFe ou Focus NFe).
   - Cola o token da conta dele. O token vai para o servidor e não volta para a tela.
   - O certificado A1 e o CSC ficam no painel do emissor dele.
   - No **Receber** do balcão aparece "Nota fiscal" com três opções: **NFC-e agora**, **NF-e (empresa)** e **Sem nota agora**.
     - O padrão é NF-e quando o cliente tem CNPJ ou a venda é na conta da obra.
     - Senão, NFC-e se "Já deixar marcada a NFC-e" estiver ligado.
   - **NFC-e (65)**: CPF/CNPJ opcional e DANFE de 80 mm com QR.
   - **NF-e (55)**: destinatário completo (CNPJ, razão, IE ou não contribuinte, endereço, IBGE, consumidor final). Os dados ficam guardados em `pessoa.fiscal`. Imprime um resumo A4; o DANFE oficial é o PDF do emissor (`url_danfe`).
   - Em Balcão › **Vendas e devoluções**: Emitir nota, ver a nota, DANFE, cancelar (NFC-e 30 min, NF-e 24 h, com motivo) e Exportar.
   - **Dados fiscais dos produtos**: NCM, CEST, CFOP 5102/5405, CSOSN ou CST, com sugestões para material de construção. Confirmar com o contador.
2. `outro` · **Emito no meu PDV, emissor ou pelo contador**: botão **Nota** em cada venda (número opcional) e exportação CSV/XML simples.
3. `bluerose` · em breve (só aviso).
4. `nao` · nada aparece.

**Construtora e imobiliária** (`db.config.nf.servico`): só `outro` ou `nao`. O Tecton **não emite NFS-e**.
- Em Financeiro, cada recebimento ganha o botão **Nota**: registra tipo, número, data, valor, tomador e referência em `db.notas`.
- **Exportar para o contador**: CSV com as notas do período e os recebimentos sem nota, ou XML simples.

Na demonstração tudo é simulado (nota de exemplo em homologação, chave com DV certo, nada enviado).

## O servidor (falta fazer: não há deploy neste branch)

O cliente chama `window.tectonNfce(FUNCAO_NF, body)` (ponte em `../base/conta-nuvem.js`, só no app `tecton`). A função é a constante `FUNCAO_NF` no topo de `nota.js`, com padrão **`nexo-nfce`**. O corpo sempre leva `app: 'tecton'` e `espaco`.

Contrato esperado. É o mesmo do `popina-nfce` (`tools/funcoes/popina-nfce/index.ts`), com o acréscimo da NF-e 55:

| ação | corpo | resposta |
|---|---|---|
| `status` | — | `{ conectado, provedor, ambiente, nfe }` (`nfe: false` se o provedor/conta não emite 55) |
| `conectar` | `{ provedor: 'brasilnfe'\|'focus', token?, ambiente, cnpj }` | `{ ok }` (token cifrado em `nexo_segredos`; nunca devolver) |
| `desconectar` | — | `{ ok }` |
| `emitir` | `{ venda, nota }` | `{ ok, chave, numero, serie, protocolo, qrcode, url_consulta, url_danfe?, autorizada_em, ambiente, provedor }` ou `{ ok:false, mensagem, desligado? }` |
| `cancelar` | `{ chave, modelo, motivo }` | `{ ok, protocolo }` (prazo: 65 = 30 min, 55 = 24 h; conferir no servidor) |
| `consultar`, `xml` | como no Popina | |

`nota` é como a do Popina (`ref, cpf, itens[{codigo,nome,ncm,cfop,cst,cest,un,qtd,unit,total,desc,outro}], pagamentos[{tpag,valor,troco}], cnpj, piscofins, obs`), com estes acréscimos:
- `modelo`: 65 ou 55.
- Em cada item, `frete` (só na 55, que vai em `vFrete`; na 65 o frete vai em `outro`).
- Em `pagamentos[0]`, `aPrazo` (Fiado e Conta da obra usam `tpag 05`).
- Só na 55: `natureza`, `consumidorFinal`, `presenca: 1`, `modFrete` (0 com frete, 9 sem) e `destinatario { doc, nome, ie, contribuinte '1'|'2'|'9', email, logradouro, numero, bairro, municipio, uf, cep, codMunicipio }`.

Para a 55 o servidor precisa de:
- **Brasil NFe**: `ModeloDocumento: 55`, `Cliente` com endereço e `IndicadorIe`, `ConsumidorFinal` conforme o envio, e `ValorFrete` por produto.
- **Focus NFe**: endpoint `/v2/nfe` (assíncrono: precisa consultar até autorizar), `nome_destinatario`, `logradouro_destinatario`… e `indicador_inscricao_estadual_destinatario`.

Checagem de acesso: membro do espaço do app `tecton`. Configurar: dono ou administrador. Emitir: qualquer um que não seja só leitura.

Não precisa de migration nova, se a função usar `nexo_segredos` com chaves por app (ex.: `tecton_nf_token`) e uma tabela de notas genérica (ou `popina_nfce_notas` com `app`). Se precisar, só acrescentar.

Enquanto a função `nexo-nfce` não existir, a emissão real responde com erro amigável ("Não deu para falar com o servidor agora"). Os modos `outro` e `nao` funcionam sem servidor.

## Pendências
- Deploy da função (`nexo-nfce` com `app='tecton'` e NF-e 55) pelo agente que está generalizando.
- Conferir na primeira nota de homologação: códigos de pagamento, CST PIS/COFINS 49, NCM/CEST sugeridos e quais itens têm ST em SP.
- Regime normal precisa de alíquotas (como no Popina): por enquanto, vender só para quem é do Simples.
- NF-e de devolução: só um aviso para emitir no emissor ou com o contador.
- Contingência offline: não feita.
