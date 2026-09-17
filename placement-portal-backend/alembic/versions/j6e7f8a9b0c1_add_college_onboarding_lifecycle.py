"""Add college onboarding lifecycle and registrations

Revision ID: j6e7f8a9b0c1
Revises: h5c6d7e8f9a0
Create Date: 2026-09-17 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "j6e7f8a9b0c1"
down_revision: Union[str, None] = "h5c6d7e8f9a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1. Update PostgreSQL enums if on postgresql
    if bind.dialect.name == "postgresql":
        op.execute("COMMIT")
        op.execute("ALTER TYPE college_status_enum ADD VALUE IF NOT EXISTS 'pending_setup'")
        op.execute("ALTER TYPE college_status_enum ADD VALUE IF NOT EXISTS 'ready_for_review'")
        op.execute("ALTER TYPE college_status_enum ADD VALUE IF NOT EXISTS 'rejected'")
        op.execute("ALTER TYPE otp_purpose_enum ADD VALUE IF NOT EXISTS 'college_registration'")
        op.execute("ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'college_collision_alert'")
        op.execute("ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'college_ready_for_review'")
        op.execute("ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'college_approved'")
        op.execute("ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'college_rejected'")

    # 2. Add onboarding fields to colleges table if not already present
    existing_columns = [c["name"] for c in inspector.get_columns("colleges")]
    if "registered_at" not in existing_columns:
        op.add_column("colleges", sa.Column("registered_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False))
    if "activated_at" not in existing_columns:
        op.add_column("colleges", sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True))
    if "rejection_reason" not in existing_columns:
        op.add_column("colleges", sa.Column("rejection_reason", sa.Text(), nullable=True))
    if "contact_name" not in existing_columns:
        op.add_column("colleges", sa.Column("contact_name", sa.String(length=255), nullable=True))
    if "contact_mobile" not in existing_columns:
        op.add_column("colleges", sa.Column("contact_mobile", sa.String(length=50), nullable=True))
    if "contact_mobile_verified" not in existing_columns:
        op.add_column("colleges", sa.Column("contact_mobile_verified", sa.Boolean(), server_default="false", nullable=False))

    # 3. Safe migration backfill: ensure all pre-existing colleges remain ACTIVE with activated_at populated
    op.execute("""
        UPDATE colleges
        SET status = 'active',
            registered_at = created_at,
            activated_at = created_at
        WHERE status IS NULL OR status = 'active'
    """)

    # 4. Create college_registrations table if not exists
    tables = inspector.get_table_names()
    if "college_registrations" not in tables:
        op.create_table(
            "college_registrations",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("college_name", sa.String(length=255), nullable=False),
            sa.Column("admin_name", sa.String(length=255), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("domain", sa.String(length=255), nullable=False),
            sa.Column("mobile_number", sa.String(length=50), nullable=True),
            sa.Column("status", sa.String(length=50), server_default="pending_otp", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_college_registrations_email"), "college_registrations", ["email"], unique=False)
        op.create_index(op.f("ix_college_registrations_domain"), "college_registrations", ["domain"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_college_registrations_domain"), table_name="college_registrations")
    op.drop_index(op.f("ix_college_registrations_email"), table_name="college_registrations")
    op.drop_table("college_registrations")

    op.drop_column("colleges", "contact_mobile_verified")
    op.drop_column("colleges", "contact_mobile")
    op.drop_column("colleges", "contact_name")
    op.drop_column("colleges", "rejection_reason")
    op.drop_column("colleges", "activated_at")
    op.drop_column("colleges", "registered_at")
