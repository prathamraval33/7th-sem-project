"""Add fee_gate_config table and seed default config per college

Revision ID: m9h0i1j2k3l4
Revises: l8g9h0i1j2k3
Create Date: 2026-10-13 17:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "m9h0i1j2k3l4"
down_revision: Union[str, None] = "l8g9h0i1j2k3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "fee_gate_config" not in inspector.get_table_names():
        op.create_table(
            "fee_gate_config",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "college_id",
                sa.Integer(),
                sa.ForeignKey("colleges.id", ondelete="CASCADE"),
                nullable=False,
                unique=True,
            ),
            sa.Column("browse_drives", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("apply_to_drives", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("official_tests", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("practice_tests", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("mock_interview_gen", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("mock_interview_drive", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("resume_analyzer", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("resume_enhancer", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("career_insights", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("verification_deadline", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.Column(
                "updated_by",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )
        op.create_index("ix_fee_gate_config_college_id", "fee_gate_config", ["college_id"])

    # Backfill default fee_gate_config row for all existing colleges
    bind.execute(
        sa.text(
            """
            INSERT INTO fee_gate_config (
                college_id, browse_drives, apply_to_drives, official_tests, practice_tests,
                mock_interview_gen, mock_interview_drive, resume_analyzer, resume_enhancer,
                career_insights, updated_at
            )
            SELECT id, true, false, false, true, true, false, true, true, true, CURRENT_TIMESTAMP
            FROM colleges
            WHERE id NOT IN (SELECT college_id FROM fee_gate_config)
            """
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "fee_gate_config" in inspector.get_table_names():
        op.drop_table("fee_gate_config")
