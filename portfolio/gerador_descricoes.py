"""
Projeto demonstrativo da BLUE ROSE — Gerador de descrições de produto com IA
============================================================================

Pipeline de uma automação com IA: entrada estruturada -> prompt -> modelo ->
texto pronto para colar na loja, no Instagram ou no catálogo do WhatsApp.

- Com a variável de ambiente ANTHROPIC_API_KEY definida, a descrição é
  escrita pelo Claude (API oficial da Anthropic, chamada via HTTPS).
- Sem chave, ou se a API falhar, o script NÃO para: gera um texto local
  a partir de um modelo de frases e avisa de onde veio o resultado.

A chave nunca fica no código: só é lida do ambiente.

Uso:
    python gerador_descricoes.py --nome "Caneca de cerâmica" \\
        --caracteristicas "300ml,cerâmica,vai no micro-ondas" \\
        --publico "presente para escritório"

    # vários produtos de uma vez, a partir de um CSV (nome;caracteristicas;publico)
    python gerador_descricoes.py --csv produtos.csv --saida descricoes.csv

Dependências: nenhuma (só biblioteca padrão do Python 3.10+).
"""

import argparse
import csv
import json
import os
import sys
import urllib.error
import urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8")
except AttributeError:
    pass

API_URL = "https://api.anthropic.com/v1/messages"
MODELO = os.environ.get("MODELO_IA", "claude-haiku-4-5")

# Idioma da saída: BR_LANG=en mostra em inglês (usado pelo Laboratório em inglês do site).
EN = os.environ.get("BR_LANG", "").lower().startswith("en")


def _(pt: str, en: str) -> str:
    return en if EN else pt


def montar_prompt(nome: str, caracteristicas: list[str], publico: str) -> str:
    lista = ", ".join(caracteristicas)
    if EN:
        return (
            f"Write a product description in American English for '{nome}'.\n"
            f"Features: {lista}.\nTarget audience: {publico}.\n"
            "Rules: 3 sentences max, persuasive and direct, no hype, "
            "do not invent features that were not given, no emojis. "
            "Reply with the description only."
        )
    return (
        f"Escreva uma descrição de produto em português do Brasil para '{nome}'.\n"
        f"Características: {lista}.\nPúblico-alvo: {publico}.\n"
        "Regras: no máximo 3 frases, tom vendedor e direto, sem exageros, "
        "sem inventar características que não foram informadas, sem emojis. "
        "Responda só com a descrição."
    )


def gerar_com_ia(prompt: str, chave: str, timeout: float = 30) -> str:
    """Chama a API da Anthropic. Levanta RuntimeError com uma mensagem clara se falhar."""
    corpo = json.dumps({
        "model": MODELO,
        "max_tokens": 400,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")
    req = urllib.request.Request(API_URL, data=corpo, method="POST", headers={
        "content-type": "application/json",
        "x-api-key": chave,
        "anthropic-version": "2023-06-01",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            dados = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detalhe = e.read().decode("utf-8", "replace")[:200]
        raise RuntimeError(f"API respondeu {e.code}: {detalhe}") from e
    except (urllib.error.URLError, TimeoutError) as e:
        raise RuntimeError(f"sem conexão com a API ({e})") from e
    texto = "".join(b.get("text", "") for b in dados.get("content", []) if b.get("type") == "text").strip()
    if not texto:
        raise RuntimeError("a API não devolveu texto")
    return texto


def gerar_local(nome: str, caracteristicas: list[str], publico: str) -> str:
    """Texto de reserva, montado só com o que foi informado (nada inventado)."""
    if EN:
        if len(caracteristicas) > 1:
            destaque = ", ".join(caracteristicas[:-1]) + f" and {caracteristicas[-1]}"
        else:
            destaque = caracteristicas[0] if caracteristicas else "careful finish"
        return f"{nome}: {destaque}. A great pick for {publico}. Order yours today and get it ready to use."
    if len(caracteristicas) > 1:
        destaque = ", ".join(caracteristicas[:-1]) + f" e {caracteristicas[-1]}"
    else:
        destaque = caracteristicas[0] if caracteristicas else "acabamento caprichado"
    return (
        f"{nome}: {destaque}. "
        f"Uma escolha certeira para {publico}. "
        "Peça já o seu e receba pronto para usar."
    )


def descrever(nome: str, caracteristicas: list[str], publico: str, chave: str | None) -> tuple[str, str]:
    """Devolve (texto, origem). Origem: 'ia', 'local' ou 'local (erro: ...)'."""
    if chave:
        try:
            return gerar_com_ia(montar_prompt(nome, caracteristicas, publico), chave), "ia"
        except RuntimeError as e:
            return gerar_local(nome, caracteristicas, publico), f"local (erro na IA: {e})"
    return gerar_local(nome, caracteristicas, publico), "local"


def separar(texto: str) -> list[str]:
    return [c.strip() for c in texto.split(",") if c.strip()]


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Gera descrições de produto (com IA quando houver chave).")
    parser.add_argument("--nome", help="Nome do produto")
    parser.add_argument("--caracteristicas", help="Lista separada por vírgula")
    parser.add_argument("--publico", help="Público-alvo do produto")
    parser.add_argument("--csv", help="CSV com colunas nome;caracteristicas;publico")
    parser.add_argument("--saida", help="CSV de saída (com --csv)")
    args = parser.parse_args(argv)
    chave = os.environ.get("ANTHROPIC_API_KEY") or None

    if args.csv:
        with open(args.csv, encoding="utf-8-sig", newline="") as f:
            linhas = list(csv.DictReader(f, delimiter=";"))
        resultados = []
        for linha in linhas:
            texto, origem = descrever(linha["nome"], separar(linha["caracteristicas"]), linha["publico"], chave)
            resultados.append({**linha, "descricao": texto, "origem": origem})
            print(f"- {linha['nome']} [{origem}]\n  {texto}\n")
        if args.saida:
            with open(args.saida, "w", encoding="utf-8", newline="") as f:
                w = csv.DictWriter(f, fieldnames=list(resultados[0].keys()), delimiter=";")
                w.writeheader()
                w.writerows(resultados)
            print(f"{len(resultados)} descrições salvas em {args.saida}")
        return 0

    if not (args.nome and args.caracteristicas and args.publico):
        parser.error("informe --nome, --caracteristicas e --publico (ou use --csv)")
    texto, origem = descrever(args.nome, separar(args.caracteristicas), args.publico, chave)
    print("\n--- PROMPT ---")
    print(montar_prompt(args.nome, separar(args.caracteristicas), args.publico))
    if EN:
        origem = {"ia": "AI", "local": "local"}.get(origem, origem.replace("local (erro na IA:", "local (AI error:"))
    print(f"\n--- {_('DESCRIÇÃO', 'DESCRIPTION')} ({origem}) ---")
    print(texto)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
