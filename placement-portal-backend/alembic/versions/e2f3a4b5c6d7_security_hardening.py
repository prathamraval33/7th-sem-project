"""Security hardening: failed_attempts on otp_verifications and uq_user_drive_application on applications

Revision ID: e2f3a4b5c6d7
Revises: c1d2e3f4a5b6
Create Date: 2026-09-07 15:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "e2f3a4b5c6d7"
down_revision: Union[str, None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add failed_attempts to otp_verifications
    op.add_column(
        "otp_verifications",
        sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
    )

    # 2. Add unique constraint uq_user_drive_application to applications
    with op.batch_alter_table("applications") as batch_op:
        batch_op.create_unique_constraint("uq_user_drive_application", ["user_id", "drive_id"])


def downgrade() -> None:
    with op.batch_alter_table("applications") as batch_op:
        batch_op.drop_constraint("uq_user_drive_application", type_="unique")

    op.drop_column("otp_verifications", "failed_attempts")
