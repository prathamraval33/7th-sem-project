"""Add draft feature status and gate_cat_prep resource category.

Revision ID: e1a2b3c4d5f7
Revises: f3c7a1b9d2e4
Create Date: 2026-09-06 10:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "e1a2b3c4d5f7"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == "postgresql":
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE feature_status_enum ADD VALUE IF NOT EXISTS 'draft' BEFORE 'active'")
            op.execute("ALTER TYPE resource_category_enum ADD VALUE IF NOT EXISTS 'gate_cat_prep'")


def downgrade() -> None:
    # PostgreSQL enum values cannot be easily removed.
    pass

