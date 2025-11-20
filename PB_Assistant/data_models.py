from dataclasses import dataclass, field
from typing import Optional, List, Dict
from datetime import datetime
import uuid

@dataclass
class PlanetaryBoundaryData:
    name: str
    short_name: str
    search_query: str
    search_query_open_alex: Optional[str] = None
    search_query_scopus: Optional[str] = None
    search_query_wos: Optional[str] = None

@dataclass
class AffiliationData:
    name: str
    country: Optional[str] = None


@dataclass
class AcademicAuthorData:
    name: str
    surname_initials: Optional[str] = None
    email: Optional[str] = None
    orcid: Optional[str] = None
    affiliations: List[AffiliationData] = field(default_factory=list)
    meta: Optional[Dict] = None

@dataclass
class AcademicPaperData:
    paper_id: uuid.UUID = field(default_factory=uuid.uuid4)
    doi: Optional[str] = None
    time_edited: Optional[datetime] =  None
    text: Optional[str] = None

    title: Optional[str] = None
    title_slug: Optional[str] = None

    best_oa_pdf_url: Optional[str] = None
    all_pdf_urls: List[str] = field(default_factory=list)

    publication_year: Optional[int] = None
    source: Optional[str] = None

    keywords: Optional[Dict] = None
    author_list: List[AcademicAuthorData] = field(default_factory=list)
    meta: Optional[Dict] = None

    planetary_boundary: List[PlanetaryBoundaryData] = field(default_factory=list)
