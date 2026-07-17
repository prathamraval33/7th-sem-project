"""Public Contact Us submission + role-guarded views for admin/tpo, routed
by category (placement -> TPO+Admin, general -> Admin only).
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin, require_role
from app.core.security import decode_token
from app.db.session import get_db
from app.models.contact_message import ContactCategory, ContactMessage, ContactStatus
from app.models.user import User, UserType
from app.schemas.contact_message import ContactMessageCreate, ContactMessageResponse, ContactMessageUpdate

router = APIRouter(prefix="/contact", tags=["contact"])

require_tpo_or_admin = require_role(UserType.TPO, UserType.ADMIN)


def _try_get_current_user_id(request: Request, db: Session) -> Optional[int]:
    """Contact submission is public — but if the sender happens to be
    logged in, `submitted_by_user_id` is captured automatically per the
    master prompt. No 401 is ever raised here; an absent/invalid token
    simply means an anonymous submission.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None

    token = auth_header.split(" ", 1)[1]
    try:
        payload = decode_token(token)
    except Exception:
        return None

    if payload.get("type") != "access":
        return None

    user_id = payload.get("sub")
    if user_id is None or db.get(User, int(user_id)) is None:
        return None

    return int(user_id)


@router.post("/submit", response_model=ContactMessageResponse, status_code=status.HTTP_201_CREATED)
def submit_contact_message(
    payload: ContactMessageCreate, request: Request, db: Session = Depends(get_db)
) -> ContactMessage:
    message = ContactMessage(
        **payload.model_dump(),
        submitted_by_user_id=_try_get_current_user_id(request, db),
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.get("/placement", response_model=list[ContactMessageResponse])
def list_placement_messages(
    current_user: User = Depends(require_tpo_or_admin),
    db: Session = Depends(get_db),
) -> list[ContactMessage]:
    return list(
        db.scalars(
            select(ContactMessage)
            .where(ContactMessage.category == ContactCategory.PLACEMENT)
            .order_by(ContactMessage.created_at.desc())
        ).all()
    )


@router.get("/general", response_model=list[ContactMessageResponse])
def list_general_messages(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[ContactMessage]:
    return list(
        db.scalars(
            select(ContactMessage)
            .where(ContactMessage.category == ContactCategory.GENERAL)
            .order_by(ContactMessage.created_at.desc())
        ).all()
    )


@router.get("/all", response_model=list[ContactMessageResponse])
def list_all_messages(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[ContactMessage]:
    return list(db.scalars(select(ContactMessage).order_by(ContactMessage.created_at.desc())).all())


@router.patch("/{message_id}", response_model=ContactMessageResponse)
def update_message_status(
    message_id: int,
    payload: ContactMessageUpdate,
    current_user: User = Depends(require_tpo_or_admin),
    db: Session = Depends(get_db),
) -> ContactMessage:
    message = db.get(ContactMessage, message_id)
    if message is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Message not found")

    if message.category == ContactCategory.GENERAL and current_user.user_type != UserType.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="General messages are admin-only")

    message.status = payload.status
    db.commit()
    db.refresh(message)
    return message
