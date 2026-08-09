"""Schemas for the `branches` table."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class BranchCreate(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=255)


class BranchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    is_active: bool
    created_at: datetime
