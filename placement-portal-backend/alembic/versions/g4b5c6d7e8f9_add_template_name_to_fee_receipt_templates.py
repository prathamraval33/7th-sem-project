"""Add template_name to fee_receipt_templates

Revision ID: g4b5c6d7e8f9
Revises: f3a4b5c6d7e8
Create Date: 2026-09-11 11:47:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "g4b5c6d7e8f9"
down_revision: Union[str, None] = "f3a4b5c6d7e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("fee_receipt_templates") as batch_op:
        batch_op.add_column(sa.Column("template_name", sa.String(100), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("fee_receipt_templates") as batch_op:
        batch_op.drop_column("template_name")
