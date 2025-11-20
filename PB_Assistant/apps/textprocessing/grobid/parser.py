from __future__ import annotations
from typing import Dict, List, Optional
from lxml import etree
from .types import ParsedHeader, ParsedAuthor


def _text(node) -> Optional[str]:
    if node is None:
        return None
    txt = " ".join(node.itertext()).strip()
    return txt or None


def parse_tei_header(tei_xml: str) -> ParsedHeader:
    """Parse essential metadata from GROBID TEI (header only)."""
    root = etree.fromstring(tei_xml.encode("utf-8"))
    ns = {"tei": "http://www.tei-c.org/ns/1.0"}

    title = _text(root.find(".//tei:teiHeader/tei:fileDesc/tei:titleStmt/tei:title", ns))

    identifiers: Dict[str, str] = {}
    for idno in root.findall(".//tei:teiHeader//tei:idno", ns):
        id_type = (idno.get("type") or "other").lower()
        val = (idno.text or "").strip()
        if val:
            identifiers[id_type] = val

    abstract = _text(root.find(".//tei:profileDesc/tei:abstract", ns))

    keywords: List[str] = []
    for kw in root.findall(".//tei:profileDesc/tei:textClass/tei:keywords//tei:term", ns):
        val = (kw.text or "").strip()
        if val:
            keywords.append(val)

    pub_year: Optional[int] = None
    date_node = root.find(".//tei:publicationStmt/tei:date", ns)
    if date_node is not None:
        when = date_node.get("when") or (date_node.text or "").strip()
        if when and when[:4].isdigit():
            pub_year = int(when[:4])

    journal = _text(root.find(".//tei:sourceDesc//tei:title[@level='j']", ns))
    publisher = _text(root.find(".//tei:publicationStmt/tei:publisher", ns))

    # affiliations graph
    org_by_id: Dict[str, Dict] = {}
    for org in root.findall(".//tei:teiHeader//tei:org", ns):
        org_id = org.get("xml:id") or org.get("id")
        if not org_id:
            continue
        name = _text(org.find(".//tei:orgName", ns))
        country = _text(org.find(".//tei:address//tei:country", ns))
        org_by_id[f"#{org_id}"] = {"name": name, "country": country}

    authors: List[ParsedAuthor] = []
    for p in root.findall(".//tei:teiHeader//tei:author", ns):
        pers = p.find(".//tei:persName", ns)
        if pers is None:
            continue
        forename = _text(pers.find("tei:forename", ns))
        surname = _text(pers.find("tei:surname", ns))
        full_name = " ".join([x for x in [forename, surname] if x]) or _text(pers)
        email = _text(p.find(".//tei:email", ns))
        orcid = None
        for idno in p.findall(".//tei:idno", ns):
            if (idno.get("type") or "").lower() == "orcid":
                orcid = (idno.text or "").strip()
                break
        affs: List[Dict] = []
        for aff in p.findall(".//tei:affiliation", ns):
            ref = aff.get("ref")
            if ref and ref in org_by_id:
                affs.append(org_by_id[ref])
            else:
                affs.append({
                    "name": _text(aff.find(".//tei:orgName", ns)),
                    "country": _text(aff.find(".//tei:address//tei:country", ns)),
                })
        authors.append(ParsedAuthor(name=full_name or "Unknown", email=email, orcid=orcid, affiliations=affs))

    raw_meta = {
        "grobid_keywords": keywords,
        "grobid_identifiers": identifiers,
        "grobid_journal": journal,
        "grobid_publisher": publisher,
        "grobid_abstract": abstract,
    }

    return ParsedHeader(
        title=title,
        doi=identifiers.get("doi"),
        abstract=abstract,
        publication_year=pub_year,
        journal=journal,
        publisher=publisher,
        keywords=keywords,
        identifiers=identifiers,
        authors=authors,
        raw_meta=raw_meta,
    )