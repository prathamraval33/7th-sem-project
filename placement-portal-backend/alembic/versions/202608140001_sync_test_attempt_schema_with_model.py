"""sync test_attempts schema with model

Revision ID: 202608140001
Revises: ca54503eabb2
Create Date: 2026-08-14 00:01:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "202608140001"
down_revision: Union[str, None] = "ca54503eabb2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    attempt_status_enum = sa.Enum(
        "in_progress", "completed", "ended", name="attempt_status_enum"
    )
    attempt_status_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "test_attempts",
        sa.Column(
            "status",
            attempt_status_enum,
            nullable=False,
            server_default="completed",
        ),
    )
    op.add_column(
        "test_attempts",
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.add_column(
        "test_attempts",
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "test_attempts",
        sa.Column("last_heartbeat_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "test_attempts",
        sa.Column("question_order", sa.JSON(), nullable=True),
    )
    op.add_column(
        "test_attempts",
        sa.Column("option_order_map", sa.JSON(), nullable=True),
    )

    # Existing rows are historical submissions. Reuse submitted_at as lifecycle timestamps.
    op.execute(
        """
        UPDATE test_attempts
        SET started_at = COALESCE(submitted_at, now()),
            ends_at = submitted_at,
            status = CASE
                WHEN status IS NULL THEN 'completed'::attempt_status_enum
                ELSE status
            END
        """
    )

    op.alter_column("test_attempts", "submitted_at", nullable=True)

    op.alter_column("test_attempts", "status", server_default="in_progress")


def downgrade() -> None:
    op.alter_column("test_attempts", "submitted_at", nullable=False)

    op.drop_column("test_attempts", "option_order_map")
    op.drop_column("test_attempts", "question_order")
    op.drop_column("test_attempts", "last_heartbeat_at")
    op.drop_column("test_attempts", "ends_at")
    op.drop_column("test_attempts", "started_at")
    op.drop_column("test_attempts", "status")

    op.execute("DROP TYPE IF EXISTS attempt_status_enum")
