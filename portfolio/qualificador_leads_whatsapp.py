"""
Projeto demonstrativo da BLUE ROSE — Qualificador de leads via WhatsApp
========================================================================

Simula, com dados de mentira, o fluxo de automação que a BLUE ROSE monta
com frequência para imobiliárias/corretores: em vez de o corretor perder
tempo respondendo lead por lead manualmente, uma automação (normalmente
n8n + WhatsApp API, aqui simplificado em Python puro para demonstração)
faz uma sequência de perguntas de qualificação e só entrega ao corretor um
resumo pronto do que interessa.

Não usa nenhuma API real de WhatsApp — a função `enviar_mensagem_whatsapp`
é o único ponto onde, em produção, entraria a chamada real (WhatsApp
Business API/Cloud API). Aqui ela só imprime a mensagem no terminal, pra
deixar claro o que seria enviado a cada passo.

Rodar:
    python qualificador_leads_whatsapp.py

Rodar com respostas automáticas de exemplo (sem digitar nada):
    python qualificador_leads_whatsapp.py --demo
"""

import argparse
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime

# Garante saída em UTF-8 mesmo no cmd/PowerShell com codepage padrão
# (evita acento virar caractere estranho no terminal do Windows).
try:
    sys.stdout.reconfigure(encoding="utf-8")
except AttributeError:
    pass

# Idioma da saída: BR_LANG=en mostra em inglês (usado pelo Laboratório em inglês do site).
EN = os.environ.get("BR_LANG", "").lower().startswith("en")


def _(pt: str, en: str) -> str:
    return en if EN else pt


def enviar_mensagem_whatsapp(numero: str, texto: str) -> None:
    """Ponto único de integração real. Em produção, troca o print por uma
    chamada HTTP pra WhatsApp Business API/Cloud API."""
    print(f"\n[WhatsApp -> {numero}]\n{texto}\n")


@dataclass
class Lead:
    numero: str
    tipo_imovel: str = ""
    regiao: str = ""
    orcamento: str = ""
    prazo: str = ""
    respostas_livres: list = field(default_factory=list)


PERGUNTAS = [
    ("tipo_imovel", _("Oi! Vi seu interesse no anúncio :) Pra eu te ajudar melhor: "
                      "você procura apartamento, casa ou terreno?",
                      "Hi! I saw you were interested in the listing :) To help you better: "
                      "are you looking for an apartment, a house or a lot?")),
    ("regiao", _("Show! E em qual região/bairro você tem preferência (ou está aberto a sugestões)?",
                 "Great! Which area or neighborhood do you prefer (or are you open to suggestions)?")),
    ("orcamento", _("Perfeito. Qual faixa de orçamento você tem em mente pro imóvel?",
                    "Perfect. What budget range do you have in mind?")),
    ("prazo", _("Última pergunta: você pretende fechar negócio em quanto tempo "
                "(esse mês, nos próximos 3 meses, ou só pesquisando por enquanto)?",
                "Last question: when are you planning to buy "
                "(this month, in the next 3 months, or just browsing for now)?")),
]


def qualificar(numero: str, respostas_demo: list[str] | None = None) -> Lead:
    lead = Lead(numero=numero)
    campos = [p[0] for p in PERGUNTAS]

    for i, (campo, pergunta) in enumerate(PERGUNTAS):
        enviar_mensagem_whatsapp(numero, pergunta)
        if respostas_demo is not None:
            resposta = respostas_demo[i]
            print(f"[{_('Lead responde', 'Lead replies')}] {resposta}")
        else:
            resposta = input(f"[{_('Lead responde', 'Lead replies')}] ")
        setattr(lead, campo, resposta)

    return lead


def classificar_qualidade(lead: Lead) -> str:
    """Regra simples de exemplo — em produção isso pode usar um modelo de
    IA pra interpretar respostas livres em vez de perguntas fechadas."""
    sinais_bons = 0
    prazo = lead.prazo.strip().lower()
    # "só pesquisando (por enquanto)", "ainda pesquisando"... não é sinal de compra
    if prazo and not any(p in prazo for p in ("pesquisando", "browsing", "researching")):
        sinais_bons += 1
    if lead.orcamento.strip() != "":
        sinais_bons += 1
    if lead.regiao.strip() != "":
        sinais_bons += 1

    if sinais_bons >= 3:
        return "QUENTE"
    if sinais_bons == 2:
        return "MORNO"
    return "FRIO"


QUALIDADE_EN = {"QUENTE": "HOT", "MORNO": "WARM", "FRIO": "COLD"}


def resumo_para_corretor(lead: Lead) -> str:
    qualidade = classificar_qualidade(lead)
    if EN:
        return (
            f"--- New qualified lead ({datetime.now():%m/%d %I:%M %p}) ---\n"
            f"WhatsApp: {lead.numero}\n"
            f"Score: {QUALIDADE_EN[qualidade]}\n"
            f"Property type: {lead.tipo_imovel}\n"
            f"Area: {lead.regiao}\n"
            f"Budget: {lead.orcamento}\n"
            f"Timeline: {lead.prazo}\n"
            f"---------------------------------------------"
        )
    return (
        f"--- Novo lead qualificado ({datetime.now():%d/%m %H:%M}) ---\n"
        f"WhatsApp: {lead.numero}\n"
        f"Classificação: {qualidade}\n"
        f"Tipo de imóvel: {lead.tipo_imovel}\n"
        f"Região: {lead.regiao}\n"
        f"Orçamento: {lead.orcamento}\n"
        f"Prazo: {lead.prazo}\n"
        f"---------------------------------------------"
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--demo", action="store_true",
                         help="usa respostas de exemplo em vez de pedir input")
    args = parser.parse_args()

    numero_exemplo = _("+55 11 9xxxx-xxxx (lead de exemplo)", "+1 555 xxx-xxxx (sample lead)")

    if args.demo:
        respostas_demo = (["apartment", "Downtown", "up to $350k", "in the next 3 months"] if EN
                          else ["apartamento", "Zona Sul", "até R$ 350 mil", "nos próximos 3 meses"])
        lead = qualificar(numero_exemplo, respostas_demo)
    else:
        print(_("Respondendo como o LEAD (digite as respostas). Ctrl+C pra sair.\n", "Answering as the LEAD (type your replies). Ctrl+C to quit.\n"))
        lead = qualificar(numero_exemplo)

    print("\n" + resumo_para_corretor(lead))
    print(_("\n>>> Esse resumo é o que chegaria pronto pro corretor, em vez de "
            "ele ter que ler a conversa inteira do zero.",
            "\n>>> This summary is what the agent would get, instead of "
            "reading the whole conversation from scratch."))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
