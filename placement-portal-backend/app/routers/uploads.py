"""Protected file download/serving router with multi-tenant & role access controls."""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.curriculum_upload import CurriculumUpload
from app.models.fee_receipt import FeeReceipt
from app.models.fee_receipt_template import FeeReceiptTemplate
from app.models.resume import Resume
from app.models.user import User, UserType
from app.utils.file_storage import UPLOAD_ROOT

router = APIRouter(prefix="/uploads", tags=["uploads"])

ALLOWED_SUBFOLDERS = {"resumes", "fee_receipts", "curriculum", "fee_receipt_templates"}


def _authenticate_request(request: Request, token_query: str | None, db: Session) -> User:
    token: str | None = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
    elif token_query:
        token = token_query

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access uploaded files",
        )

    try:
        payload = decode_token(token)
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError as err:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from err

    if str(sub).isdigit():
        user = db.get(User, int(sub))
    else:
        user = db.scalar(select(User).where(User.email == str(sub)))

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


@router.get("/{subfolder}/{file_name}")
def serve_protected_file(
    subfolder: str,
    file_name: str,
    request: Request,
    token: str | None = Query(None),
    db: Session = Depends(get_db),
) -> FileResponse:
    # 1. Path traversal & allowed folder check
    if subfolder not in ALLOWED_SUBFOLDERS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    if ".." in file_name or "/" in file_name or "\\" in file_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file path")

    user = _authenticate_request(request, token, db)

    # 2. Locate file on disk and verify within UPLOAD_ROOT
    target_path = (UPLOAD_ROOT / subfolder / file_name).resolve()
    try:
        target_path.relative_to(UPLOAD_ROOT.resolve())
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid path")

    if not target_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    rel_key = f"{subfolder}/{file_name}"

    # 3. Access control per subfolder
    if subfolder == "resumes":
        resume = db.scalar(
            select(Resume).where(
                (Resume.file_path == rel_key) | Resume.file_path.endswith(file_name)
            )
        )
        if resume is not None:
            if user.user_type == UserType.STUDENT and resume.user_id != user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            if user.user_type in (UserType.TPO, UserType.ADMIN):
                owner = db.get(User, resume.user_id)
                if owner and owner.college_id != user.college_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied to student resume from another college",
                    )

    elif subfolder == "fee_receipts":
        receipt = db.scalar(
            select(FeeReceipt).where(
                (FeeReceipt.file_path == rel_key) | FeeReceipt.file_path.endswith(file_name)
            )
        )
        if receipt is not None:
            if user.user_type == UserType.STUDENT and receipt.user_id != user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            if user.user_type in (UserType.TPO, UserType.ADMIN):
                owner = db.get(User, receipt.user_id)
                if owner and owner.college_id != user.college_id:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    elif subfolder == "curriculum":
        upload = db.scalar(
            select(CurriculumUpload).where(
                (CurriculumUpload.file_path == rel_key) | CurriculumUpload.file_path.endswith(file_name)
            )
        )
        if upload is not None and user.user_type != UserType.SUPERADMIN:
            if upload.college_id != user.college_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    elif subfolder == "fee_receipt_templates":
        if user.user_type == UserType.STUDENT:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to reference template")

        template = db.scalar(
            select(FeeReceiptTemplate).where(
                (FeeReceiptTemplate.file_path == rel_key) | FeeReceiptTemplate.file_path.endswith(file_name)
            )
        )
        if template is not None and user.user_type != UserType.SUPERADMIN:
            if template.college_id != user.college_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to reference template from another college",
                )

    return FileResponse(path=str(target_path))
