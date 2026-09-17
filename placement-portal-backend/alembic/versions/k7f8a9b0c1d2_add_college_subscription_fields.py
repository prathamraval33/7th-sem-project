"""Add college subscription fields

Revision ID: k7f8a9b0c1d2
Revises: j6e7f8a9b0c1
Create Date: 2026-09-17 17:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "k7f8a9b0c1d2"
down_revision: Union[str, None] = "j6e7f8a9b0c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    existing_columns = [c["name"] for c in inspector.get_columns("colleges")]

    if "subscription_status" not in existing_columns:
        op.add_column(
            "colleges",
            sa.Column("subscription_status", sa.String(length=50), server_default="active", nullable=False),
        )
    if "subscription_plan" not in existing_columns:
        op.add_column(
            "colleges",
            sa.Column("subscription_plan", sa.String(length=50), server_default="campus_standard", nullable=False),
        )
    if "subscription_amount" not in existing_columns:
        op.add_column(
            "colleges",
            sa.Column("subscription_amount", sa.Numeric(precision=10, scale=2), server_default="10000.00", nullable=False),
        )
    if "subscription_started_at" not in existing_columns:
        op.add_column(
            "colleges",
            sa.Column("subscription_started_at", sa.DateTime(timezone=True), nullable=True),
        )
    if "subscription_expires_at" not in existing_columns:
        op.add_column(
            "colleges",
            sa.Column("subscription_expires_at", sa.DateTime(timezone=True), nullable=True),
        )

    # Backfill for all existing colleges
    if bind.dialect.name == "postgresql":
        op.execute("""
            UPDATE colleges
            SET subscription_status = COALESCE(subscription_status, 'active'),
                subscription_plan = COALESCE(subscription_plan, 'campus_standard'),
                subscription_amount = COALESCE(subscription_amount, 10000.00),
                subscription_started_at = COALESCE(subscription_started_at, created_at, now()),
                subscription_expires_at = COALESCE(subscription_expires_at, COALESCE(created_at, now()) + INTERVAL '30 days')
            WHERE subscription_started_at IS NULL OR subscription_expires_at IS NULL;
        """)
    else:
        op.execute("""
            UPDATE colleges
            SET subscription_status = 'active',
                subscription_plan = 'campus_standard',
                subscription_amount = 10000.00
            WHERE subscription_status IS NULL;
        """)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [c["name"] for c in inspector.get_columns("colleges")]

    if "subscription_expires_at" in existing_columns:
        op.drop_column("colleges", "subscription_expires_at")
    if "subscription_started_at" in existing_columns:
        op.drop_column("colleges", "subscription_started_at")
    if "subscription_amount" in existing_columns:
        op.drop_column("colleges", "subscription_amount")
    if "subscription_plan" in existing_columns:
        op.drop_column("colleges", "subscription_plan")
    if "subscription_status" in existing_columns:
        op.drop_column("colleges", "subscription_status")
