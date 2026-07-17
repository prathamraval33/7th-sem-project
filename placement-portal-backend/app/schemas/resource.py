"""Schemas for the `resources` table (prep material videos/blogs/documents)."""
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.resource import ResourceCategory, ResourceContentType


class ResourceCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    category: ResourceCategory
    content_type: ResourceContentType
    video_url: Optional[str] = None
    content: Optional[str] = None

    @model_validator(mode="after")
    def content_matches_type(self) -> "ResourceCreate":
        if self.content_type == ResourceContentType.VIDEO and not self.video_url:
            raise ValueError("video_url is required when content_type is 'video'")
        if self.content_type in (ResourceContentType.BLOG, ResourceContentType.DOCUMENT) and not self.content:
            raise ValueError("content is required when content_type is 'blog' or 'document'")
        return self


class ResourceUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    category: Optional[ResourceCategory] = None
    content_type: Optional[ResourceContentType] = None
    video_url: Optional[str] = None
    content: Optional[str] = None


class ResourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: ResourceCategory
    content_type: ResourceContentType
    video_url: Optional[str] = None
    content: Optional[str] = None
    created_by: int
