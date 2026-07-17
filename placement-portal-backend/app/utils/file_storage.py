"""Local-disk file storage for resumes and fee receipts, abstracted behind a
small module-level API so it can be swapped for S3 later without touching
callers. All paths stored in the DB are *relative* to `UPLOAD_ROOT`.
"""
import uuid
from pathlib import Path

from app.utils.exceptions import FileValidationError

UPLOAD_ROOT = Path(__file__).resolve().parent.parent.parent / "uploads"

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB, per the master prompt's security rules

RESUME_EXTENSIONS = {".pdf"}
FEE_RECEIPT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


def _safe_extension(filename: str) -> str:
    return Path(filename).suffix.lower()


def validate_file(filename: str, size_bytes: int, allowed_extensions: set[str]) -> None:
    extension = _safe_extension(filename)
    if extension not in allowed_extensions:
        raise FileValidationError(
            f"Unsupported file type '{extension or 'unknown'}'. Allowed: {', '.join(sorted(allowed_extensions))}"
        )
    if size_bytes > MAX_FILE_SIZE_BYTES:
        raise FileValidationError(f"File exceeds the {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB limit")


def save_upload(file_bytes: bytes, original_filename: str, subfolder: str) -> str:
    """Writes `file_bytes` under `UPLOAD_ROOT/subfolder/<uuid>.<ext>` and
    returns the path *relative* to `UPLOAD_ROOT` (what gets stored in the DB).
    A generated filename avoids path-traversal and collision issues from
    user-supplied filenames entirely.
    """
    extension = _safe_extension(original_filename)
    unique_name = f"{uuid.uuid4().hex}{extension}"

    target_dir = UPLOAD_ROOT / subfolder
    target_dir.mkdir(parents=True, exist_ok=True)

    target_path = target_dir / unique_name
    target_path.write_bytes(file_bytes)

    return f"{subfolder}/{unique_name}"


def get_absolute_path(relative_path: str) -> Path:
    return UPLOAD_ROOT / relative_path


def delete_file(relative_path: str) -> None:
    path = get_absolute_path(relative_path)
    path.unlink(missing_ok=True)
