
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, List, Dict


@dataclass
class ParsedAuthor:
    name: str
    surname_initials: Optional[str] = None
    email: Optional[str] = None
    orcid: Optional[str] = None
    affiliations: List[Dict] | None = None  # list of {name, country}


@dataclass
class ParsedHeader:
    title: Optional[str]
    doi: Optional[str]
    abstract: Optional[str]
    publication_year: Optional[int]
    journal: Optional[str]
    publisher: Optional[str]
    keywords: List[str]
    identifiers: Dict[str, str]
    authors: List[ParsedAuthor]
    raw_meta: Dict
