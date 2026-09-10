"""Add curriculum uploads, subjects, and curated resources tables.

Revision ID: c1d2e3f4a5b6
Revises: e1a2b3c4d5f7
Create Date: 2026-09-07 14:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, None] = "e1a2b3c4d5f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_pg = bind.dialect.name == "postgresql"

    if is_pg:
        bind.execute(sa.text("DO $$ BEGIN CREATE TYPE curriculum_extraction_status_enum AS ENUM ('processing', 'ready_for_review', 'confirmed', 'failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;"))
        bind.execute(sa.text("DO $$ BEGIN CREATE TYPE subject_resource_type_enum AS ENUM ('book', 'article', 'video'); EXCEPTION WHEN duplicate_object THEN null; END $$;"))
        bind.execute(sa.text("DO $$ BEGIN CREATE TYPE curation_approval_status_enum AS ENUM ('pending_review', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;"))

    extraction_enum = postgresql.ENUM("processing", "ready_for_review", "confirmed", "failed", name="curriculum_extraction_status_enum", create_type=False) if is_pg else sa.Enum("processing", "ready_for_review", "confirmed", "failed", name="curriculum_extraction_status_enum")
    resource_type_enum = postgresql.ENUM("book", "article", "video", name="subject_resource_type_enum", create_type=False) if is_pg else sa.Enum("book", "article", "video", name="subject_resource_type_enum")
    approval_enum = postgresql.ENUM("pending_review", "approved", "rejected", name="curation_approval_status_enum", create_type=False) if is_pg else sa.Enum("pending_review", "approved", "rejected", name="curation_approval_status_enum")

    # 1. curriculum_uploads
    op.create_table(
        "curriculum_uploads",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("college_id", sa.Integer(), sa.ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column("file_path", sa.String(500), nullable=False),
        sa.Column("extraction_status", extraction_enum, nullable=False, server_default="processing"),
        sa.Column("raw_extracted_data", sa.JSON(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
    )

    # 2. curriculum_subjects
    op.create_table(
        "curriculum_subjects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("college_id", sa.Integer(), sa.ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("source_upload_id", sa.Integer(), sa.ForeignKey("curriculum_uploads.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("branch_name", sa.String(255), nullable=False, index=True),
        sa.Column("semester_number", sa.Integer(), nullable=False, index=True),
        sa.Column("subject_name", sa.String(255), nullable=False, index=True),
        sa.Column("is_prioritized", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 3. curated_subject_resources
    op.create_table(
        "curated_subject_resources",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("curriculum_subjects.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("college_id", sa.Integer(), sa.ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("resource_type", resource_type_enum, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("link", sa.String(1000), nullable=False),
        sa.Column("ai_summary", sa.Text(), nullable=False),
        sa.Column("approval_status", approval_enum, nullable=False, server_default="pending_review"),
        sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("curated_subject_resources")
    op.drop_table("curriculum_subjects")
    op.drop_table("curriculum_uploads")

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP TYPE IF EXISTS curation_approval_status_enum")
        op.execute("DROP TYPE IF EXISTS subject_resource_type_enum")
        op.execute("DROP TYPE IF EXISTS curriculum_extraction_status_enum")
