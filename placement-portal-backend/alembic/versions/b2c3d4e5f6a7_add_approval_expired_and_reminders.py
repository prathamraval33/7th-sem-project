"""add approval_expired status, new notification types, and reminder tracking

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-05 10:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == 'postgresql':
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE feature_request_status_enum ADD VALUE IF NOT EXISTS 'approval_expired'")
            op.execute("ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'feature_request_received'")
            op.execute("ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'feature_request_decided'")
            op.execute("ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'payment_completion_required'")
            op.execute("ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'payment_reminder'")
            op.execute("ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'subscription_expiring_soon'")
            op.execute("ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'approval_expired'")

    # Add columns to college_features
    op.add_column('college_features', sa.Column('payment_due_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('college_features', sa.Column('reminder_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('college_features', sa.Column('last_reminder_sent_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('college_features', 'last_reminder_sent_at')
    op.drop_column('college_features', 'reminder_count')
    op.drop_column('college_features', 'payment_due_at')
