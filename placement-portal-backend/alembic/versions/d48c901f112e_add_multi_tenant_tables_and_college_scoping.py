"""add multi tenant tables and college scoping

Revision ID: d48c901f112e
Revises: ca54503eabb2
Create Date: 2026-08-21 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd48c901f112e'
down_revision: Union[str, None] = 'ca54503eabb2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # 1. Update user_type_enum to include 'superadmin' if postgresql
    if bind.dialect.name == 'postgresql':
        op.execute("ALTER TYPE user_type_enum ADD VALUE IF NOT EXISTS 'superadmin'")
        op.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'college_status_enum') THEN
                    CREATE TYPE college_status_enum AS ENUM ('active', 'suspended');
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feature_request_status_enum') THEN
                    CREATE TYPE feature_request_status_enum AS ENUM ('pending', 'approved', 'rejected');
                END IF;
            END
            $$;
        """)

    # 2. Create colleges table
    college_status_type = postgresql.ENUM('active', 'suspended', name='college_status_enum', create_type=False) if bind.dialect.name == 'postgresql' else sa.Enum('active', 'suspended', name='college_status_enum')

    op.create_table(
        'colleges',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('domain', sa.String(length=255), nullable=False),
        sa.Column('status', college_status_type, server_default='active', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_colleges_domain'), 'colleges', ['domain'], unique=True)
    op.create_index(op.f('ix_colleges_name'), 'colleges', ['name'], unique=True)

    # 3. Create features table
    op.create_table(
        'features',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=100), server_default='General', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_features_code'), 'features', ['code'], unique=True)

    # 4. Create college_features table
    feature_request_status_type = postgresql.ENUM('pending', 'approved', 'rejected', name='feature_request_status_enum', create_type=False) if bind.dialect.name == 'postgresql' else sa.Enum('pending', 'approved', 'rejected', name='feature_request_status_enum')

    op.create_table(
        'college_features',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('college_id', sa.Integer(), nullable=False),
        sa.Column('feature_id', sa.Integer(), nullable=False),
        sa.Column('status', feature_request_status_type, server_default='pending', nullable=False),
        sa.Column('requested_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('decided_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['college_id'], ['colleges.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['feature_id'], ['features.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['decided_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('college_id', 'feature_id', name='uq_college_feature')
    )
    op.create_index(op.f('ix_college_features_college_id'), 'college_features', ['college_id'], unique=False)
    op.create_index(op.f('ix_college_features_feature_id'), 'college_features', ['feature_id'], unique=False)

    # 5. Create announcements table
    op.create_table(
        'announcements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )

    # 6. Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=255), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('performed_by', sa.Integer(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['performed_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # 7. Insert the default College #1 (BVM)
    op.execute(
        "INSERT INTO colleges (id, name, domain, status, created_at, updated_at) "
        "VALUES (1, 'Birla Vishvakarma Mahavidyalaya (BVM)', 'bvmengineering.ac.in', 'active', now(), now()) "
        "ON CONFLICT (id) DO NOTHING"
    )
    # Sync serial sequence for colleges.id
    if bind.dialect.name == 'postgresql':
        op.execute("SELECT setval(pg_get_serial_sequence('colleges', 'id'), COALESCE((SELECT MAX(id) FROM colleges), 1))")

    # 8. Add college_id columns to college-scoped tables
    op.add_column('users', sa.Column('college_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_users_college_id'), 'users', ['college_id'], unique=False)
    op.create_foreign_key('fk_users_college_id_colleges', 'users', 'colleges', ['college_id'], ['id'], ondelete='CASCADE')

    op.add_column('drives', sa.Column('college_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_drives_college_id'), 'drives', ['college_id'], unique=False)
    op.create_foreign_key('fk_drives_college_id_colleges', 'drives', 'colleges', ['college_id'], ['id'], ondelete='CASCADE')

    op.add_column('resources', sa.Column('college_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_resources_college_id'), 'resources', ['college_id'], unique=False)
    op.create_foreign_key('fk_resources_college_id_colleges', 'resources', 'colleges', ['college_id'], ['id'], ondelete='CASCADE')

    op.add_column('instant_tests', sa.Column('college_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_instant_tests_college_id'), 'instant_tests', ['college_id'], unique=False)
    op.create_foreign_key('fk_instant_tests_college_id_colleges', 'instant_tests', 'colleges', ['college_id'], ['id'], ondelete='CASCADE')

    # 9. Backfill all existing rows with college_id = 1
    op.execute("UPDATE users SET college_id = 1 WHERE college_id IS NULL")
    op.execute("UPDATE drives SET college_id = 1 WHERE college_id IS NULL")
    op.execute("UPDATE resources SET college_id = 1 WHERE college_id IS NULL")
    op.execute("UPDATE instant_tests SET college_id = 1 WHERE college_id IS NULL")

    # 10. Make drives.college_id and resources.college_id NOT NULL
    op.alter_column('drives', 'college_id', nullable=False)
    op.alter_column('resources', 'college_id', nullable=False)

    # 11. Seed default features
    features_data = [
        ('study_resources', 'Study Resources', 'Curated study materials, past papers, and preparation guides for placement exams.', 'Learning'),
        ('career_insights', 'Career Insights', 'AI-powered career path recommendations and industry trend analysis.', 'AI'),
        ('mock_interviews', 'Mock Interviews', 'AI-driven mock interview practice with real-time feedback and scoring.', 'AI'),
        ('resume_analyzer', 'Resume Analyzer', 'Automated resume scoring with actionable improvement suggestions.', 'AI'),
        ('alumni_network', 'Alumni Network', 'Connect current students with alumni for mentorship and referrals.', 'Networking'),
        ('instant_tests', 'Instant Tests', 'TPO-created timed assessments for aptitude and technical screening.', 'Assessment'),
        ('company_research', 'Company Research', 'Detailed company profiles with interview experiences and salary data.', 'Research'),
    ]

    for idx, (code, name, desc, cat) in enumerate(features_data, start=1):
        escaped_desc = desc.replace("'", "''")
        escaped_name = name.replace("'", "''")
        op.execute(
            f"INSERT INTO features (id, code, name, description, category, created_at) "
            f"VALUES ({idx}, '{code}', '{escaped_name}', '{escaped_desc}', '{cat}', now()) "
            f"ON CONFLICT (code) DO NOTHING"
        )

    if bind.dialect.name == 'postgresql':
        op.execute("SELECT setval(pg_get_serial_sequence('features', 'id'), COALESCE((SELECT MAX(id) FROM features), 1))")

    # 12. Enable core features for College #1 (study_resources, mock_interviews, instant_tests)
    for feat_id in [1, 3, 6]:
        op.execute(
            f"INSERT INTO college_features (college_id, feature_id, status, requested_at, decided_at) "
            f"VALUES (1, {feat_id}, 'approved', now(), now()) "
            f"ON CONFLICT (college_id, feature_id) DO NOTHING"
        )


def downgrade() -> None:
    op.drop_constraint('fk_instant_tests_college_id_colleges', 'instant_tests', type_='foreignkey')
    op.drop_index(op.f('ix_instant_tests_college_id'), table_name='instant_tests')
    op.drop_column('instant_tests', 'college_id')

    op.drop_constraint('fk_resources_college_id_colleges', 'resources', type_='foreignkey')
    op.drop_index(op.f('ix_resources_college_id'), table_name='resources')
    op.drop_column('resources', 'college_id')

    op.drop_constraint('fk_drives_college_id_colleges', 'drives', type_='foreignkey')
    op.drop_index(op.f('ix_drives_college_id'), table_name='drives')
    op.drop_column('drives', 'college_id')

    op.drop_constraint('fk_users_college_id_colleges', 'users', type_='foreignkey')
    op.drop_index(op.f('ix_users_college_id'), table_name='users')
    op.drop_column('users', 'college_id')

    op.drop_table('audit_logs')
    op.drop_table('announcements')
    op.drop_index(op.f('ix_college_features_feature_id'), table_name='college_features')
    op.drop_index(op.f('ix_college_features_college_id'), table_name='college_features')
    op.drop_table('college_features')

    op.drop_index(op.f('ix_features_code'), table_name='features')
    op.drop_table('features')

    op.drop_index(op.f('ix_colleges_name'), table_name='colleges')
    op.drop_index(op.f('ix_colleges_domain'), table_name='colleges')
    op.drop_table('colleges')
