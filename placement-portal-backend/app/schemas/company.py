"""Schemas for the `companies` table."""
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CompanyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    website: Optional[str] = None
    location: Optional[str] = None
    industry_type: Optional[str] = None
    about: Optional[str] = None
    logo_url: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    website: Optional[str] = None
    location: Optional[str] = None
    industry_type: Optional[str] = None
    about: Optional[str] = None
    logo_url: Optional[str] = None


class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    website: Optional[str] = None
    location: Optional[str] = None
    industry_type: Optional[str] = None
    about: Optional[str] = None
    logo_url: Optional[str] = None
