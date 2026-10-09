"""
Projeto demonstrativo da BLUE ROSE — Recuperação de venda via WhatsApp (PIX)
=============================================================================

Simula, com dados de mentira, o fluxo de automação que a BLUE ROSE monta
pra recuperar vendas perdidas: quando um cliente gera um PIX no checkout e
não paga em X minutos, uma automação (normalmente webhook da plataforma de
pagamento + WhatsApp API) manda uma mensagem lembrando do link de pagamento
— e cancela o envio automaticamente se o pagamento cair antes da hora.

Não usa nenhuma API real de pagamento nem de WhatsApp — os dois pontos de
integração real (`consultar_status_pagamento` e `enviar_mensagem_whatsapp`)
estão isolados em funções próprias, exatamente onde entraria a chamada real
em produção (ex.: webhook da Kirvano/outra plataforma de pagamento + Meta
WhatsApp Cloud API).

Rodar (usa um relógio acelerado, sem esperar minutos de verdade):
    python recuperador_pix_whatsapp.py --pago-em 3
    python recuperador_pix_whatsapp.py --pago-em nunca
"""

import argparse
import os
import time
from dataclasses import dataclass
from datetime import datetime, timedelta


TEMPO_ESPERA_MINUTOS = 10  # configurável — regra pedida pelo cliente

# Idioma da saída: BR_LANG=en mostra em inglês (usado pelo Laboratório em inglês do site).
EN = os.environ.get("BR_LANG", "").lower().startswith("en")


def _(pt: str, en: str) -> str:
    return en if EN else pt


@dataclass
class Pedido:
    id: str
    cliente: str
    valor: float
    status: str = "pix_pendente"  # pix_pendente -> pago | pix_expirado
    gerado_em: datetime = None

    def __post_init__(self):
        if self.gerado_em is None:
            self.gerado_em = datetime.now()


def consultar_status_pagamento(pedido: Pedido) -> str:
    """Ponto único de integração real. Em produção, troca por uma consulta
    ao webhook/API da plataforma de pagamento (ex.: Kirvano)."""
    return pedido.status


def enviar_mensagem_whatsapp(numero: str, texto: str) -> None:
    """Ponto único de integração real. Em produção, troca o print por uma
    chamada HTTP pra WhatsApp Business API/Cloud API."""
    print(f"\n[WhatsApp -> {numero}]\n{texto}\n")


def montar_mensagem_recuperacao(pedido: Pedido) -> str:
    if EN:
        return (
            f"Hi, {pedido.cliente}! I noticed your order #{pedido.id} "
            f"(${pedido.valor:.2f}) is still waiting for payment. "
            f"Here is the link to finish checkout before it expires: "
            f"[payment link]. Any questions, just reply here!"
        )
    return (
        f"Oi, {pedido.cliente}! Notei que seu pedido #{pedido.id} "
        f"(R$ {pedido.valor:.2f}) ainda está com o PIX pendente. "
        f"Segue o link pra finalizar o pagamento antes que expire: "
        f"[link de pagamento]. Qualquer dúvida, me chama por aqui!"
    )


def processar_pedido(pedido: Pedido, numero_whatsapp: str, minutos_acelerados: float = 1.0) -> None:
    """Simula o fluxo: espera o tempo configurado, consulta o status de
    novo e só manda a mensagem se ainda estiver pendente."""
    print(f"[{datetime.now():%H:%M:%S}] " + _(
        f"Pedido {pedido.id} criado: PIX gerado, aguardando pagamento. "
        f"Regra: cobrar em {TEMPO_ESPERA_MINUTOS} min se continuar pendente.",
        f"Order {pedido.id} created: payment link sent, waiting for payment. "
        f"Rule: follow up in {TEMPO_ESPERA_MINUTOS} min if still unpaid."))

    # No mundo real isso seria um agendamento (cron/fila), não um sleep —
    # aqui aceleramos o tempo só pra demonstração rodar em segundos.
    time.sleep(minutos_acelerados)

    status_atual = consultar_status_pagamento(pedido)
    status_txt = {"pago": "paid", "pix_pendente": "payment_pending"}.get(status_atual, status_atual) if EN else status_atual
    print(f"[{datetime.now():%H:%M:%S}] " + _("Checando status do pedido", "Checking status of order") + f" {pedido.id}: {status_txt}")

    if status_atual == "pago":
        print(f"[{datetime.now():%H:%M:%S}] " + _(
            "Pagamento já confirmado: a automação NÃO envia mensagem (evita incomodar quem já pagou).",
            "Payment already confirmed: the automation does NOT send a message (no nagging customers who paid)."))
        return

    mensagem = montar_mensagem_recuperacao(pedido)
    enviar_mensagem_whatsapp(numero_whatsapp, mensagem)
    print(f"[{datetime.now():%H:%M:%S}] " + _("Mensagem de recuperação enviada pro pedido", "Recovery message sent for order") + f" {pedido.id}.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--pago-em", default="nunca",
        help="'nunca' (simula cliente que não paga) ou um número de segundos "
             "(simula cliente que paga X segundos depois de gerar o PIX, "
             "antes da automação verificar de novo)."
    )
    args = parser.parse_args()

    pedido = Pedido(id="10234", cliente=_("Ana", "Emily"), valor=_(189.90, 49.90))

    if args.pago_em not in ("nunca", "never"):
        # Simula que o pagamento já caiu quando a automação for checar.
        pedido.status = "pago"

    processar_pedido(pedido, numero_whatsapp=_("+55 11 9xxxx-xxxx (cliente de exemplo)", "+1 555 xxx-xxxx (sample customer)"), minutos_acelerados=1.5)


if __name__ == "__main__":
    main()
