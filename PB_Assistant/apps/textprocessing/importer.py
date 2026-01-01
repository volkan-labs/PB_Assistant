from django.db import transaction
import logging
import dataclasses
from typing import Iterable, List
from django.utils.text import slugify
from django.db.models import Q
from django.conf import settings
from fuzzywuzzy import fuzz
from PB_Assistant.models import AcademicPaper, PlanetaryBoundary
from PB_Assistant.data_models import AcademicPaperData, AcademicAuthorData

logger = logging.getLogger(__name__)

IDENTIFIERS = ['doi'] # may be extended

def generate_title_slug(title: str | None) -> str | None:
    return slugify(title) if title else None


def find_duplicate(paper: AcademicPaperData, threshold: int = 90) -> AcademicPaper | None:
    # Build Q object for all known non-null identifiers
    filters = Q()
    if paper.doi:
        filters |= Q(doi=paper.doi)

    # Run a single query if any filters are defined
    if filters:
        match = AcademicPaper.objects.filter(filters).first()
        if match:
            return match

    # Fallback: title_slug and fuzzy title match
    if paper.title:
        match = AcademicPaper.objects.filter(title_slug=slugify(paper.title)).first()
        if match:
            return match

        # Conditional fuzzy duplicate check
        if settings.FUZZY_MATCHING_ENABLED: # Use the setting
            for existing in AcademicPaper.objects.exclude(title__isnull=True).iterator():
                score = fuzz.token_sort_ratio(paper.title.lower(), existing.title.lower())
                if score >= threshold:
                    return existing

    return None

def serialize_authors(authors: List[AcademicAuthorData]) -> list[dict]:
    """Convert list of dataclass authors to list of dicts (JSON serializable)."""
    return [dataclasses.asdict(a) for a in authors]

def insert_new_paper(data: AcademicPaperData) -> AcademicPaper:
    paper = AcademicPaper(
        paper_id=data.paper_id,
        doi=data.doi,
        time_edited=data.time_edited,
        text=data.text,
        title=data.title,
        title_slug=data.title_slug or (slugify(data.title) if data.title else None),
        publication_year=data.publication_year,
        source=data.source,
        keywords=data.keywords,
        author_list=serialize_authors(data.author_list),
        meta=data.meta,
    )
    paper.save()

    return paper


def safe_truncate(value, length=255):
    return value[:length] if value else ''

def get_clean_field(obj, field):
    val = getattr(obj, field)
    return val.lower().strip() if val and isinstance(val, str) else None

def add_planetary_boundary(paper: AcademicPaper, pb_input):
    """
    Safely add one or more PlanetaryBoundary objects to an AcademicPaper
    without overwriting existing ones. Accepts a single object.
    """
    if not pb_input:
        return

    # Add only new ones
    existing_ids = set(paper.planetary_boundary.values_list("id", flat=True))
    if pb_input.id not in existing_ids:
        paper.planetary_boundary.add(pb_input)


def import_academic_paper(paperData: AcademicPaperData, planetary_boundary: PlanetaryBoundary):
    status = ''
    if not any(getattr(paperData, field) for field in IDENTIFIERS) and not getattr(paperData, 'title',
                                                                              None):  # skip record if no identifier or title provided where we can check duplicates
        status = 'skipped_empty'
        return status, None

    paperData.title_slug = generate_title_slug(paperData.title)

    existing = find_duplicate(paperData)

    if not existing:
        obj = insert_new_paper(paperData)
        add_planetary_boundary(obj, planetary_boundary)
        status = 'new_record'
        return status, obj
    else:
        return status, None


def import_academic_papers(
        new_papers: Iterable[AcademicPaperData], planetary_boundary: PlanetaryBoundary,
        fuzzy_threshold: int = 90
) -> dict:

    new_count = 0
    variant_count = 0
    skipped_empty_count = 0

    with transaction.atomic():
        for paper in new_papers:
            status, paper = import_academic_paper(paper, planetary_boundary)
            if status == 'skipped_empty':
                skipped_empty_count += 1
            elif status == 'new_record':
                variant_count += 1
                new_count += 1

    return {
        "empty_records_skipped": skipped_empty_count,
        "new_papers": new_count
    }
