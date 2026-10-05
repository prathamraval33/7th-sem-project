"""Add mock interview improvements schema fields

Revision ID: l8g9h0i1j2k3
Revises: k7f8a9b0c1d2
Create Date: 2026-10-05 14:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "l8g9h0i1j2k3"
down_revision: Union[str, None] = "k7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1. Update Enums for PostgreSQL
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE interview_mode_enum ADD VALUE IF NOT EXISTS 'resume'")
        op.execute("ALTER TYPE question_type_enum ADD VALUE IF NOT EXISTS 'resume'")

    # 2. Add difficulty_level to interview_sessions
    existing_session_cols = [c["name"] for c in inspector.get_columns("interview_sessions")]
    if "difficulty_level" not in existing_session_cols:
        op.add_column(
            "interview_sessions",
            sa.Column("difficulty_level", sa.String(length=20), server_default="fresher", nullable=False),
        )
        op.create_check_constraint(
            "ck_interview_sessions_difficulty_level",
            "interview_sessions",
            "difficulty_level IN ('fresher', 'mid_level', 'senior')",
        )

    # 3. Add interviewer_note and resume_reference to questions
    existing_question_cols = [c["name"] for c in inspector.get_columns("questions")]
    if "interviewer_note" not in existing_question_cols:
        op.add_column("questions", sa.Column("interviewer_note", sa.Text(), nullable=True))
    if "resume_reference" not in existing_question_cols:
        op.add_column("questions", sa.Column("resume_reference", sa.Text(), nullable=True))

    # 4. Add rating and what_was_missing to answers
    existing_answer_cols = [c["name"] for c in inspector.get_columns("answers")]
    if "rating" not in existing_answer_cols:
        op.add_column("answers", sa.Column("rating", sa.String(length=20), nullable=True))
        op.create_check_constraint(
            "ck_answers_rating",
            "answers",
            "rating IS NULL OR rating IN ('interview_ready', 'good', 'somewhat_closer', 'not_relevant')",
        )
    if "what_was_missing" not in existing_answer_cols:
        op.add_column("answers", sa.Column("what_was_missing", sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    existing_answer_cols = [c["name"] for c in inspector.get_columns("answers")]
    if "what_was_missing" in existing_answer_cols:
        op.drop_column("answers", "what_was_missing")
    if "rating" in existing_answer_cols:
        op.drop_constraint("ck_answers_rating", "answers", type_="check")
        op.drop_column("answers", "rating")

    existing_question_cols = [c["name"] for c in inspector.get_columns("questions")]
    if "resume_reference" in existing_question_cols:
        op.drop_column("questions", "resume_reference")
    if "interviewer_note" in existing_question_cols:
        op.drop_column("questions", "interviewer_note")

    existing_session_cols = [c["name"] for c in inspector.get_columns("interview_sessions")]
    if "difficulty_level" in existing_session_cols:
        op.drop_constraint("ck_interview_sessions_difficulty_level", "interview_sessions", type_="check")
        op.drop_column("interview_sessions", "difficulty_level")
