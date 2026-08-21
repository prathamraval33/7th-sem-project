"""resources table — placement prep material (videos/blogs/documents) managed by admin."""
import enum

from sqlalchemy import Enum as SAEnum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ResourceCategory(str, enum.Enum):
    APTITUDE = "aptitude"
    COMMUNICATION = "communication"
    OS = "os"
    DBMS = "dbms"
    CN = "cn"
    INTERVIEW_QNA = "interview_qna"
    JAVA = "java"
    PYTHON = "python"


class ResourceContentType(str, enum.Enum):
    VIDEO = "video"
    BLOG = "blog"
    DOCUMENT = "document"


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    college_id: Mapped[int] = mapped_column(ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[ResourceCategory] = mapped_column(
        SAEnum(ResourceCategory, name="resource_category_enum", values_callable=lambda obj: [e.value for e in obj]), nullable=False
    )
    content_type: Mapped[ResourceContentType] = mapped_column(
        SAEnum(ResourceContentType, name="resource_content_type_enum", values_callable=lambda obj: [e.value for e in obj]), nullable=False
    )
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)

    college: Mapped["College"] = relationship(back_populates="resources")
    created_by_user: Mapped["User"] = relationship(back_populates="resources_created", foreign_keys=[created_by])
