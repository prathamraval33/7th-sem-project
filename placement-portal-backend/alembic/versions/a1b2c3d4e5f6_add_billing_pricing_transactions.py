"""add billing, pricing, expanded feature status, and transactions

Revision ID: a1b2c3d4e5f6
Revises: f3c7a1b9d2e4
Create Date: 2026-09-04 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f3c7a1b9d2e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == 'postgresql':
        with op.get_context().autocommit_block():
            op.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_type_enum') THEN
                        CREATE TYPE billing_type_enum AS ENUM ('one_time', 'monthly', 'annual');
                    END IF;
                END
                $$;
            """)
            op.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status_enum') THEN
                        CREATE TYPE transaction_status_enum AS ENUM ('created', 'paid', 'failed', 'refunded');
                    END IF;
                END
                $$;
            """)
            op.execute("ALTER TYPE feature_request_status_enum ADD VALUE IF NOT EXISTS 'pending_review'")
            op.execute("ALTER TYPE feature_request_status_enum ADD VALUE IF NOT EXISTS 'approved_awaiting_payment'")
            op.execute("ALTER TYPE feature_request_status_enum ADD VALUE IF NOT EXISTS 'active'")
            op.execute("ALTER TYPE feature_request_status_enum ADD VALUE IF NOT EXISTS 'payment_failed'")
            op.execute("ALTER TYPE feature_request_status_enum ADD VALUE IF NOT EXISTS 'expired'")

        billing_type_sa = postgresql.ENUM('one_time', 'monthly', 'annual', name='billing_type_enum', create_type=False)
        tx_status_sa = postgresql.ENUM('created', 'paid', 'failed', 'refunded', name='transaction_status_enum', create_type=False)
    else:
        billing_type_sa = sa.Enum('one_time', 'monthly', 'annual', name='billing_type_enum')
        tx_status_sa = sa.Enum('created', 'paid', 'failed', 'refunded', name='transaction_status_enum')

    # Add columns to features
    op.add_column('features', sa.Column('price', sa.Numeric(10, 2), nullable=True))
    op.add_column('features', sa.Column('billing_type', billing_type_sa, server_default='one_time', nullable=False))

    # Add columns to college_features
    op.add_column('college_features', sa.Column('amount_charged', sa.Numeric(10, 2), nullable=True))
    op.add_column('college_features', sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('college_features', sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('college_features', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('college_features', sa.Column('is_auto_granted', sa.Boolean(), server_default=sa.text('false'), nullable=False))

    # Migrate any legacy status values on college_features
    op.execute("UPDATE college_features SET status = 'pending_review' WHERE status::text = 'pending'")
    op.execute("UPDATE college_features SET status = 'active' WHERE status::text = 'approved'")

    # Create transactions table
    op.create_table(
        'transactions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('college_id', sa.Integer(), sa.ForeignKey('colleges.id', ondelete='CASCADE'), nullable=True, index=True),
        sa.Column('feature_id', sa.Integer(), sa.ForeignKey('features.id', ondelete='CASCADE'), nullable=True, index=True),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(10), server_default='INR', nullable=False),
        sa.Column('status', tx_status_sa, server_default='created', nullable=False),
        sa.Column('razorpay_order_id', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('razorpay_payment_id', sa.String(255), nullable=True),
        sa.Column('razorpay_signature', sa.String(512), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_test_data', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('transactions')
    op.drop_column('college_features', 'is_auto_granted')
    op.drop_column('college_features', 'expires_at')
    op.drop_column('college_features', 'paid_at')
    op.drop_column('college_features', 'approved_at')
    op.drop_column('college_features', 'amount_charged')
    op.drop_column('features', 'billing_type')
    op.drop_column('features', 'price')
