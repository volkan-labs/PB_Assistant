
from __future__ import annotations
import logging
import uuid
from typing import Optional, Dict

from PB_Assistant.data_models import AcademicPaperData, AcademicAuthorData, AffiliationData
from PB_Assistant.models import PlanetaryBoundary, AcademicPaperText
from PB_Assistant.apps.textprocessing.importer import import_academic_paper
from PB_Assistant.apps.textprocessing.grobid.parser import parse_tei_header
from PB_Assistant.apps.textprocessing.grobid.types import ParsedHeader

logger = logging.getLogger(__name__)

def get_boundary(boundary_name: Optional[str]):
    if not boundary_name:
        return None
    return (
        PlanetaryBoundary.objects.filter(name__iexact=boundary_name).first()
        or PlanetaryBoundary.objects.filter(short_name__iexact=boundary_name).first()
    )


class PdfIngestService:
    """Service that coordinates parsing, importing, and fulltext handling for one PDF."""

    def __init__(self, text_client, embedder=None):
        self.text_client = text_client
        self.embedder = embedder

    def ingest_file(self, pdf_path: str, boundary=None) -> tuple[str, object | None]:
        try:
            tei_header = self.text_client.process_header(pdf_path)
            parsed_header = parse_tei_header(tei_header)
            ac = self._translate_record_from_grobid(parsed_header)

            status, academicpaper = import_academic_paper(ac, boundary)
            if status != 'new_record':
                return status, None

            ait = AcademicPaperText.objects.filter(academicpaper=academicpaper).first()
            if ait is None or not ait.hasfulltext:
                fulltext_str = self.text_client.extract_fulltext(pdf_path=pdf_path)
                if fulltext_str:
                    obj, created = AcademicPaperText.objects.update_or_create(
                        academicpaper=academicpaper,
                        defaults={"text": fulltext_str, "hasfulltext": True},
                    )
                    if self.embedder is not None:
                        self.embedder.embed_academic_paper(obj)
            return status, academicpaper
        except Exception:
            logger.exception("Failed to ingest %s", pdf_path)
            return "error", None

    def _translate_record_from_grobid(self, parsed: ParsedHeader) -> AcademicPaperData:
        identifiers: Dict[str, str] = parsed.identifiers or {}
        doi = identifiers.get("doi")

        keywords_obj = {"grobid": parsed.keywords} if parsed.keywords else None

        return AcademicPaperData(
            paper_id=uuid.uuid4(),
            doi=doi,
            text=parsed.abstract,
            title=parsed.title,
            title_slug=None,
            best_oa_pdf_url=None,
            all_pdf_urls=[],
            publication_year=parsed.publication_year,
            source=parsed.journal,
            keywords=keywords_obj,
            author_list=self._translate_authors_to_dc(parsed.authors or []),
            meta={
                "grobid": parsed.raw_meta or {},
                "identifiers": identifiers,
                "ingest_source": "grobid",
            },
            planetary_boundary=[],
        )

    def _translate_authors_to_dc(self, authors):
        out = []
        for a in authors or []:
            out.append(
                AcademicAuthorData(
                    name=a.name or "Unknown",
                    surname_initials=a.surname_initials,
                    email=a.email,
                    orcid=a.orcid,
                    affiliations=self._translate_affiliations_dc(a.affiliations or []),
                    meta=None,
                )
            )
        return out

    def _translate_affiliations_dc(self, aff_list):
        if not aff_list:
            return []
        out = []
        for aff in aff_list:
            out.append(
                AffiliationData(
                    name=(aff.get("name") or "Unknown affiliation"),
                    country=aff.get("country"),
                )
            )
        return out
