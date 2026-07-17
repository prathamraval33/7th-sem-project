"""Extracts text from an uploaded resume PDF. Tries direct text extraction
first (fast, exact for born-digital PDFs); if that yields no usable text
(e.g. a scanned resume), falls back to OCR via pdf2image + pytesseract —
reusing the same OCR toolchain the fee-receipt flow depends on.
"""
import logging

import pytesseract
from pdf2image import convert_from_path
from pypdf import PdfReader

from app.utils.file_storage import get_absolute_path

logger = logging.getLogger(__name__)


def _extract_via_pdf_text_layer(absolute_path) -> str:
    reader = PdfReader(str(absolute_path))
    pages_text = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages_text).strip()


def _extract_via_ocr(absolute_path) -> str:
    images = convert_from_path(str(absolute_path))
    pages_text = [pytesseract.image_to_string(image) for image in images]
    return "\n".join(pages_text).strip()


def extract_resume_text(relative_file_path: str) -> str:
    absolute_path = get_absolute_path(relative_file_path)

    text = _extract_via_pdf_text_layer(absolute_path)
    if text:
        return text

    logger.info("No text layer found in %s, falling back to OCR", relative_file_path)
    return _extract_via_ocr(absolute_path)
