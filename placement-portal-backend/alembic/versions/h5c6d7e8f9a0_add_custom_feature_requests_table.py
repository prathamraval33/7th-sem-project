"""Add custom_feature_requests table

Revision ID: h5c6d7e8f9a0
Revises: g4b5c6d7e8f9
Create Date: 2026-09-16 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "h5c6d7e8f9a0"
down_revision: Union[str, None] = "g4b5c6d7e8f9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "custom_feature_requests",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("college_id", sa.Integer(), nullable=False),
        sa.Column("admin_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("target_user", sa.String(length=50), server_default="all", nullable=False),
        sa.Column("category", sa.String(length=100), server_default="General", nullable=False),
        sa.Column("priority", sa.String(length=50), server_default="medium", nullable=False),
        sa.Column("status", sa.String(length=50), server_default="pending", nullable=False),
        sa.Column("superadmin_feedback", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["admin_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["college_id"], ["colleges.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_custom_feature_requests_admin_id"), "custom_feature_requests", ["admin_id"], unique=False)
    op.create_index(op.f("ix_custom_feature_requests_college_id"), "custom_feature_requests", ["college_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_custom_feature_requests_college_id"), table_name="custom_feature_requests")
    op.drop_index(op.f("ix_custom_feature_requests_admin_id"), table_name="custom_feature_requests")
    op.drop_table("custom_feature_requests")
