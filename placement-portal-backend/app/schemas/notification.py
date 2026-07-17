"""Schemas for the `notifications` table."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.notification import NotificationType


class NotificationCreate(BaseModel):
    """Internal/service-facing — `sender_id` is set server-side from the
    authenticated TPO/Admin (or omitted entirely for system-generated
    notifications), never client-supplied.
    """

    recipient_id: int
    type: NotificationType
    message: str


class NotificationUpdate(BaseModel):
    """Backs PATCH /notifications/{id}/read."""

    is_read: bool = True


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recipient_id: int
    sender_id: Optional[int] = None
    type: NotificationType
    message: str
    is_read: bool
    created_at: datetime
