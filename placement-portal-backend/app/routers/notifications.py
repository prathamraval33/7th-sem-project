"""Notifications — list (newest first) + mark-as-read, shared by all 3 roles."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _to_notification_dict(notification: Notification) -> dict:
    sender_name = None
    sender_role = None
    if notification.sender:
        profile = getattr(notification.sender, "profile", None)
        sender_name = (profile.full_name if profile and profile.full_name else notification.sender.email)
        if notification.sender.user_type:
            sender_role = notification.sender.user_type.value.upper()

    return {
        "id": notification.id,
        "recipient_id": notification.recipient_id,
        "sender_id": notification.sender_id,
        "sender_name": sender_name,
        "sender_role": sender_role,
        "type": notification.type,
        "message": notification.message,
        "is_read": notification.is_read,
        "created_at": notification.created_at,
    }


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    notifications = db.scalars(
        select(Notification)
        .options(joinedload(Notification.sender).joinedload(User.profile))
        .where(Notification.recipient_id == current_user.id)
        .order_by(Notification.created_at.desc())
    ).all()
    return [_to_notification_dict(n) for n in notifications]


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    notification = db.scalar(
        select(Notification)
        .options(joinedload(Notification.sender).joinedload(User.profile))
        .where(Notification.id == notification_id)
    )
    if notification is None or notification.recipient_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return _to_notification_dict(notification)
