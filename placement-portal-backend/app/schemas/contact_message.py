"""Schemas for the `contact_messages` table."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.contact_message import ContactCategory, ContactStatus


class ContactMessageCreate(BaseModel):
    """POST /contact/submit — public, works logged-out or logged-in.
    `submitted_by_user_id` is set server-side from the auth context when
    present, never client-supplied.
    """

    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    message: str = Field(min_length=1)
    category: ContactCategory


class ContactMessageUpdate(BaseModel):
    """Mark read/resolved from the TPO/Admin ContactMessagesPage."""

    status: ContactStatus


class ContactMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    message: str
    category: ContactCategory
    submitted_by_user_id: Optional[int] = None
    status: ContactStatus
    created_at: datetime
