"""Add fee_receipt_templates table and fee_receipts review columns

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-09-11 11:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "f3a4b5c6d7e8"
down_revision: Union[str, None] = "e2f3a4b5c6d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create fee_receipt_templates table
    op.create_table(
        "fee_receipt_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("college_id", sa.Integer(), sa.ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("file_path", sa.String(500), nullable=False),
        sa.Column("original_filename", sa.String(255), nullable=True),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 2. Add columns to fee_receipts
    with op.batch_alter_table("fee_receipts") as batch_op:
        batch_op.add_column(
            sa.Column(
                "matched_against_template_id",
                sa.Integer(),
                sa.ForeignKey("fee_receipt_templates.id", ondelete="SET NULL"),
                nullable=True,
            )
        )
        batch_op.add_column(sa.Column("structural_match_result", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("content_valid_result", sa.JSON(), nullable=True))
        batch_op.add_column(
            sa.Column(
                "verified_by",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("fee_receipts") as batch_op:
        batch_op.drop_column("verified_by")
        batch_op.drop_column("content_valid_result")
        batch_op.drop_column("structural_match_result")
        batch_op.drop_column("matched_against_template_id")

    op.drop_table("fee_receipt_templates")
