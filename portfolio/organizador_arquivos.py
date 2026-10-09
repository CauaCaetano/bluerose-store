"""
Exemplo de portfolio — Organizador automático de arquivos.

Organiza os arquivos de uma pasta em subpastas por tipo (extensão) e,
opcionalmente, por ano/mês de modificação. Pensado como demo rápida para
mostrar a clientes: "isso aqui eu automatizo pra você".

Segurança: roda em modo DRY-RUN por padrão (só mostra o que faria, não move
nada). Use --executar para de fato mover os arquivos.

Uso:
    python organizador_arquivos.py CAMINHO_DA_PASTA [--por-data] [--executar]

Dependências: nenhuma (só biblioteca padrão do Python).
"""

import argparse
import os
import shutil
from pathlib import Path
from datetime import datetime

# Idioma da saída: BR_LANG=en mostra em inglês (usado pelo Laboratório em inglês do site).
EN = os.environ.get("BR_LANG", "").lower().startswith("en")


def _(pt: str, en: str) -> str:
    return en if EN else pt

CATEGORIAS = {
    "imagens": {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"},
    "documentos": {".pdf", ".doc", ".docx", ".txt", ".md", ".odt"},
    "planilhas": {".xls", ".xlsx", ".csv", ".ods"},
    "videos": {".mp4", ".mov", ".avi", ".mkv"},
    "audio": {".mp3", ".wav", ".m4a"},
    "compactados": {".zip", ".rar", ".7z"},
}


def categoria_do_arquivo(caminho: Path) -> str:
    ext = caminho.suffix.lower()
    for categoria, extensoes in CATEGORIAS.items():
        if ext in extensoes:
            return categoria
    return "outros"


PASTAS_EN = {"imagens": "images", "documentos": "documents", "planilhas": "spreadsheets",
             "videos": "videos", "audio": "audio", "compactados": "archives", "outros": "other"}


def organizar(pasta: Path, por_data: bool, executar: bool) -> None:
    arquivos = [p for p in pasta.iterdir() if p.is_file()]
    if not arquivos:
        print(_("Nenhum arquivo encontrado na pasta.", "No files found in the folder."))
        return

    modo = _("EXECUTANDO", "RUNNING") if executar else _("SIMULAÇÃO (dry-run)", "SIMULATION (dry run)")
    print(f"{modo} — {len(arquivos)} " + _("arquivo(s) encontrado(s)", "file(s) found") + "\n")

    for arquivo in arquivos:
        categoria = categoria_do_arquivo(arquivo)
        destino = pasta / (PASTAS_EN[categoria] if EN else categoria)

        if por_data:
            mtime = datetime.fromtimestamp(arquivo.stat().st_mtime)
            destino = destino / f"{mtime.year}" / f"{mtime.month:02d}"

        print(f"  {arquivo.name}  ->  {destino.relative_to(pasta)}/")

        if executar:
            destino.mkdir(parents=True, exist_ok=True)
            shutil.move(str(arquivo), str(destino / arquivo.name))

    if not executar:
        print(_("\nNada foi movido (modo simulação). Rode com --executar para aplicar de verdade.",
                "\nNothing was moved (simulation mode). Run with --executar to apply it for real."))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Organiza arquivos de uma pasta por tipo (e opcionalmente por data).")
    parser.add_argument("pasta", type=str, help="Caminho da pasta a organizar")
    parser.add_argument("--por-data", action="store_true", help="Também separar em subpastas por ano/mês")
    parser.add_argument("--executar", action="store_true", help="Move os arquivos de verdade (padrão é só simular)")
    args = parser.parse_args()

    caminho = Path(args.pasta).expanduser().resolve()
    if not caminho.is_dir():
        raise SystemExit(_("Pasta não encontrada: ", "Folder not found: ") + str(caminho))

    organizar(caminho, por_data=args.por_data, executar=args.executar)
