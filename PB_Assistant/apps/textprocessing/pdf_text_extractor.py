import os
import logging
import io
import requests
import re
from typing import Optional
from bs4 import BeautifulSoup
from django.conf import settings
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

class PdfTextExtractor:
    """Extract text via GROBID with retries and guardrails."""
    def __init__(self, grobid_url: Optional[str] = None, max_retries: int = 2, timeout: int = 60):
        self.grobid_url = grobid_url or settings.GROBID_URL
        self.max_pages = getattr(settings, "PDF_MAX_PAGES", None)
        self.max_bytes = getattr(settings, "PDF_MAX_BYTES", 20 * 1024 * 1024)
        self.timeout = timeout

        self.session = requests.Session()
        retry = Retry(
            total=max_retries,
            connect=max_retries,
            read=max_retries,
            backoff_factor=1.5,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["POST"],
            raise_on_status=False,
        )
        adapter = HTTPAdapter(max_retries=retry, pool_connections=16, pool_maxsize=32)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def process_header(self, pdf_path: str) -> str:
        """Return TEI XML string from processHeaderDocument."""
        url = f"{self.grobid_url}/api/processHeaderDocument"
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
        files = {"input": ("document.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        data = {"consolidateHeader": 1, "consolidateCitations": 0}
        resp = requests.post(url, files=files, data=data, timeout=self.timeout)
        resp.raise_for_status()
        return resp.text

    def extract_fulltext(self,  pdf_path: str=None, filename: str=None) -> str:
        url = f"{self.grobid_url}/api/processFulltextDocument"
        if not pdf_path:
            pdf_path = os.path.join(settings.PDF_PATH, filename)
        if not filename:
            filename = "document.pdf"

        if not os.path.exists(pdf_path):
            logger.warning(f"File not found: {pdf_path}")
            return ""

        try:
            size = os.path.getsize(pdf_path)
            if size > self.max_bytes:
                logger.debug(f"Skipping large PDF {filename} > {self.max_bytes} bytes")
                return ""
        except OSError:
            logger.debug(f"Stat failed for {filename}")
            return ""

        try:
            with open(pdf_path, "rb") as f:
                resp = self.session.post(
                    url,
                    files={"input": (filename, f)},
                    data={"consolidateHeader": "1"},
                    timeout=self.timeout,
                )
            if resp.status_code != 200:
                logger.debug(f"GROBID returned {resp.status_code} for {filename}")
                return ""

            return self.clean_text(self.parse_tei_fulltext(resp.text))

        except Exception as e:
            logger.error(f"Error extracting text from {filename}: {e}", exc_info=True)
            return ""

    def parse_tei_fulltext(self, tei_xml: str) -> str:
        soup = BeautifulSoup(tei_xml, "xml")
        abstract = soup.find("abstract")
        body = soup.find("body")

        parts = []
        if abstract:
            parts.append(abstract.get_text(separator="\n").strip())
        if body:
            parts.append(body.get_text(separator="\n").strip())

        return "\n\n".join(parts)

    def clean_text(self, text: str) -> str:
        # Fix broken Figure/Table references: "Figure \n 1" → "Figure 1"
        text = re.sub(r'(Figure|Table)\s*\n\s*(\d+)', r'\1 \2', text)

        # Fix equation numbering: "Equation \n 5" → "Equation 5"
        text = re.sub(r'(Equation|Eq\.?)\s*\n\s*(\d+)', r'\1 \2', text)

        # Inline citation fix: "(Smith et al., 2021)\n." → "(Smith et al., 2021)."
        text = re.sub(r'\)\s*\n\s*\.', ').', text)

        # Remove split figure/table captions like: "FIGURE 3\n3\nFIGURE 3 Description..."
        text = re.sub(r'(FIGURE|TABLE)\s*\d+\s*\n\s*\d+\s*\n\s*(\1\s*\d+)', r'\2', text)

        # Merge soft line breaks (but preserve paragraph breaks)
        text = re.sub(r'(?<!\n)\n(?!\n)', ' ', text)

        # Collapse multiple spaces
        text = re.sub(r'\s{2,}', ' ', text)

        # Normalize paragraph breaks
        text = re.sub(r'\n{2,}', '\n\n', text)

        return text.strip()

