"""
Exemplo de portfolio — Relatório automático a partir de uma planilha de vendas.

Lê um CSV de vendas (colunas: data, produto, categoria, valor) e gera um
resumo: total geral, total por categoria e total por mês. Exporta o resumo
para um novo CSV. Pensado como demo: "eu automatizo esse relatório que você
faz manualmente toda semana/mês".

Uso:
    python relatorio_vendas.py vendas.csv [--saida resumo.csv]

Formato esperado do CSV de entrada (cabeçalho obrigatório):
    data,produto,categoria,valor
    2026-09-01,Camiseta P,Roupas,49.90
    2026-09-02,Caneca,Casa,29.90

Dependências: nenhuma (só biblioteca padrão do Python).
"""

import argparse
import csv
import os
from collections import defaultdict
from pathlib import Path

# Idioma da saída: BR_LANG=en mostra em inglês (usado pelo Laboratório em inglês do site).
EN = os.environ.get("BR_LANG", "").lower().startswith("en")


def _(pt: str, en: str) -> str:
    return en if EN else pt


COLUNAS_EN = {"date": "data", "product": "produto", "category": "categoria", "amount": "valor", "value": "valor"}


def carregar_vendas(caminho: Path):
    # utf-8-sig: lida com CSVs que vêm com BOM (comum em exportações do Excel
    # no Windows), sem quebrar o nome da primeira coluna.
    with caminho.open(newline="", encoding="utf-8-sig") as f:
        leitor = csv.DictReader(f)
        # aceita o cabeçalho em português ou em inglês (date,product,category,amount)
        leitor.fieldnames = [COLUNAS_EN.get(c.strip().lower(), c.strip()) for c in (leitor.fieldnames or [])]
        faltando = {"data", "categoria", "valor"} - set(leitor.fieldnames)
        if faltando:
            if EN:
                nomes = {"data": "date", "categoria": "category", "valor": "amount"}
                raise SystemExit(f"CSV is missing required columns: {', '.join(sorted(nomes[c] for c in faltando))}. "
                                 "Expected header: date,product,category,amount")
            raise SystemExit(f"CSV sem as colunas obrigatórias: {', '.join(sorted(faltando))}. "
                             "Cabeçalho esperado: data,produto,categoria,valor")
        return [linha for linha in leitor]


def gerar_resumo(vendas):
    total_geral = 0.0
    por_categoria = defaultdict(float)
    por_mes = defaultdict(float)

    for linha in vendas:
        valor = float(linha["valor"])
        total_geral += valor
        por_categoria[linha["categoria"]] += valor
        mes = linha["data"][:7]  # "AAAA-MM"
        por_mes[mes] += valor

    return total_geral, por_categoria, por_mes


def imprimir_resumo(total_geral, por_categoria, por_mes):
    moeda = _("R$", "$")
    print(f"\n{_('Total geral', 'Grand total')}: {moeda}{total_geral:,.2f}\n")

    print(_("Por categoria:", "By category:"))
    for categoria, valor in sorted(por_categoria.items(), key=lambda x: -x[1]):
        print(f"  {categoria:<20} {moeda}{valor:,.2f}")

    print(_("\nPor mês:", "\nBy month:"))
    for mes, valor in sorted(por_mes.items()):
        print(f"  {mes:<10} {moeda}{valor:,.2f}")


def salvar_resumo(caminho: Path, total_geral, por_categoria, por_mes):
    with caminho.open("w", newline="", encoding="utf-8") as f:
        escritor = csv.writer(f)
        escritor.writerow([_("tipo", "type"), _("chave", "key"), _("valor", "amount")])
        escritor.writerow([_("total_geral", "grand_total"), "-", f"{total_geral:.2f}"])
        for categoria, valor in por_categoria.items():
            escritor.writerow([_("categoria", "category"), categoria, f"{valor:.2f}"])
        for mes, valor in por_mes.items():
            escritor.writerow([_("mes", "month"), mes, f"{valor:.2f}"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Gera relatório resumido a partir de um CSV de vendas.")
    parser.add_argument("entrada", type=str, help="Caminho do CSV de vendas")
    parser.add_argument("--saida", type=str, default="resumo.csv", help="Caminho do CSV de saída (padrão: resumo.csv)")
    args = parser.parse_args()

    caminho_entrada = Path(args.entrada).expanduser().resolve()
    if not caminho_entrada.is_file():
        raise SystemExit(_("Arquivo não encontrado: ", "File not found: ") + str(caminho_entrada))

    vendas = carregar_vendas(caminho_entrada)
    total_geral, por_categoria, por_mes = gerar_resumo(vendas)
    imprimir_resumo(total_geral, por_categoria, por_mes)

    caminho_saida = Path(args.saida).expanduser().resolve()
    salvar_resumo(caminho_saida, total_geral, por_categoria, por_mes)
    print("\n" + _("Resumo salvo em: ", "Summary saved to: ") + str(caminho_saida))
