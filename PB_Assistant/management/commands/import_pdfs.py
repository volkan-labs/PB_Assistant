from __future__ import annotations
import os
import glob
import sys
import logging
from typing import Optional
from django.core.management.base import BaseCommand, CommandError

from PB_Assistant.apps.textprocessing.embedder import TextEmbedder
from PB_Assistant.apps.textprocessing.pdf_text_extractor import PdfTextExtractor
from PB_Assistant.apps.textprocessing.pdf_ingest import PdfIngestService, get_boundary

logger = logging.getLogger(__name__)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter("%(levelname)s %(message)s"))
logger.addHandler(handler)
logger.setLevel(logging.INFO)


class Command(BaseCommand):
    help = "Import PDFs from a folder using GROBID (metadata + fulltext)."

    def add_arguments(self, parser):
        parser.add_argument("--folder", required=True, help="Folder containing PDF files")
        parser.add_argument("--boundary", default=None, help="Planetary boundary name or short_name to link new items to")
        parser.add_argument("--max-files", type=int, default=None, help="Optional cap on number of PDFs to process")
        parser.add_argument("--no-embed", action="store_true", help="Do not run embedding after fulltext insert")

    def handle(self, *args, **options):
        folder: str = options["folder"]
        boundary_name: Optional[str] = options["boundary"]
        max_files: Optional[int] = options["max_files"]
        no_embed: bool = options["no_embed"]

        if not os.path.isdir(folder):
            raise CommandError(f"Directory not found: {folder}")

        boundary = get_boundary(boundary_name)
        text_client = PdfTextExtractor()
        embedder = None if no_embed else TextEmbedder()
        service = PdfIngestService(text_client=text_client, embedder=embedder)

        pdf_paths = sorted(glob.glob(os.path.join(folder, "**", "*.pdf"), recursive=True))
        if max_files is not None:
            pdf_paths = pdf_paths[:max_files]
        if not pdf_paths:
            logger.warning("No PDFs found.")
            return

        created = skipped = others = 0
        for idx, pdf_path in enumerate(pdf_paths, 1):
            logger.info("[%d/%d] %s", idx, len(pdf_paths), pdf_path)
            status, item = service.ingest_file(pdf_path, boundary=boundary)
            if status == "new_record":
                created += 1
            elif status == "skipped_empty":
                skipped += 1
            else:
                others += 1

        self.stdout.write(self.style.SUCCESS(
            f"Done. Created: {created}, Skipped parse error: {skipped}, Other: {others}"
        ))
