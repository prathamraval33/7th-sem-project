"""add feature status and revoked college-feature status

Revision ID: f3c7a1b9d2e4
Revises: d48c901f112e
Create Date: 2026-08-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f3c7a1b9d2e4'
down_revision: Union[str, None] = 'd48c901f112e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == 'postgresql':
        op.execute("ALTER TYPE feature_request_status_enum ADD VALUE IF NOT EXISTS 'revoked'")
        op.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feature_status_enum') THEN
                    CREATE TYPE feature_status_enum AS ENUM ('active', 'deprecated');
                END IF;
            END
            $$;
        """)
        feature_status_type = postgresql.ENUM('active', 'deprecated', name='feature_status_enum', create_type=False)
    else:
        feature_status_type = sa.Enum('active', 'deprecated', name='feature_status_enum')

    op.add_column('features', sa.Column('status', feature_status_type, server_default='active', nullable=False))


def downgrade() -> None:
    op.drop_column('features', 'status')
