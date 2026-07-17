"""initial schema — all 19 tables

Revision ID: 202607150001
Revises:
Create Date: 2026-07-15 00:00:01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "202607150001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column(
            "user_type", sa.Enum("student", "tpo", "admin", name="user_type_enum"), nullable=False
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_email_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("fee_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("failed_login_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "companies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("website", sa.String(length=500), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("about", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.String(length=500), nullable=True),
    )

    op.create_table(
        "otp_verifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("otp_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "purpose",
            sa.Enum("signup", "forgot_password", "change_password", name="otp_purpose_enum"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_used", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_otp_verifications_email", "otp_verifications", ["email"])

    op.create_table(
        "fee_receipts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("ai_verdict", sa.Enum("valid", "invalid", name="fee_verdict_enum"), nullable=True),
        sa.Column("ai_confidence", sa.Float(), nullable=True),
        sa.Column("ai_reason", sa.Text(), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("student_id", sa.String(length=50), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("branch", sa.String(length=100), nullable=False),
        sa.Column("cgpa", sa.Float(), nullable=False),
        sa.Column("active_backlogs", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tenth_percentage", sa.Float(), nullable=False),
        sa.Column("twelfth_percentage", sa.Float(), nullable=False),
        sa.Column("competitive_exam_name", sa.String(length=100), nullable=True),
        sa.Column("competitive_exam_percentile", sa.Float(), nullable=True),
        sa.Column("skills", sa.JSON(), nullable=True),
        sa.Column("is_placed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("placement_lock_override", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "resumes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("parsed_text", sa.Text(), nullable=True),
        sa.Column("ai_score", sa.Float(), nullable=True),
        sa.Column("ai_feedback", sa.Text(), nullable=True),
        sa.Column("source", sa.Enum("uploaded", "enhanced", name="resume_source_enum"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "drives",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(length=255), nullable=False),
        sa.Column("jd_text", sa.Text(), nullable=False),
        sa.Column("eligibility_criteria", sa.JSON(), nullable=False),
        sa.Column("bond_details", sa.Text(), nullable=True),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "status",
            sa.Enum("open", "closed", name="drive_status_enum"),
            nullable=False,
            server_default="open",
        ),
        sa.Column(
            "test_status",
            sa.Enum("not_created", "open", "closed", name="drive_test_status_enum"),
            nullable=False,
            server_default="not_created",
        ),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "applications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("drive_id", sa.Integer(), sa.ForeignKey("drives.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "applied",
                "eligible",
                "not_eligible",
                "shortlisted",
                "rejected",
                "selected",
                "withdrawn",
                name="application_status_enum",
            ),
            nullable=False,
            server_default="applied",
        ),
        sa.Column("current_stage", sa.String(length=100), nullable=True),
        sa.Column("package_offered", sa.Float(), nullable=True),
        sa.Column("applied_on", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "interview_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("drive_id", sa.Integer(), sa.ForeignKey("drives.id", ondelete="SET NULL"), nullable=True),
        sa.Column("company_name", sa.String(length=255), nullable=False),
        sa.Column("skills", sa.JSON(), nullable=True),
        sa.Column(
            "mode",
            sa.Enum("aptitude", "technical", "coding", "hr", "full", name="interview_mode_enum"),
            nullable=False,
        ),
        sa.Column("overall_score", sa.Float(), nullable=True),
        sa.Column("weak_areas", sa.JSON(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("in_progress", "completed", "abandoned", name="interview_session_status_enum"),
            nullable=False,
            server_default="in_progress",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "questions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "session_id",
            sa.Integer(),
            sa.ForeignKey("interview_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column(
            "q_type",
            sa.Enum("aptitude", "technical", "coding", "hr", name="question_type_enum"),
            nullable=False,
        ),
        sa.Column(
            "difficulty",
            sa.Enum("easy", "medium", "hard", name="difficulty_level_enum"),
            nullable=False,
        ),
        sa.Column("order_index", sa.Integer(), nullable=False),
    )

    op.create_table(
        "answers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "question_id",
            sa.Integer(),
            sa.ForeignKey("questions.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("answer_text", sa.Text(), nullable=False),
        sa.Column("ai_feedback", sa.Text(), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
    )

    op.create_table(
        "instant_tests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("drive_id", sa.Integer(), sa.ForeignKey("drives.id", ondelete="CASCADE"), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("prompt_config", sa.JSON(), nullable=False),
        sa.Column("questions", sa.JSON(), nullable=False),
        sa.Column("min_passing_marks", sa.Integer(), nullable=False),
        sa.Column("use_top_n", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("top_n_count", sa.Integer(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("open", "closed", name="instant_test_status_enum"),
            nullable=False,
            server_default="open",
        ),
    )

    op.create_table(
        "test_attempts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "test_id", sa.Integer(), sa.ForeignKey("instant_tests.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("answers", sa.JSON(), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("weak_areas", sa.JSON(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "resources",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column(
            "category",
            sa.Enum(
                "aptitude",
                "communication",
                "os",
                "dbms",
                "cn",
                "interview_qna",
                "java",
                "python",
                name="resource_category_enum",
            ),
            nullable=False,
        ),
        sa.Column(
            "content_type",
            sa.Enum("video", "blog", "document", name="resource_content_type_enum"),
            nullable=False,
        ),
        sa.Column("video_url", sa.String(length=500), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
    )

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False, unique=True),
        sa.Column("is_revoked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("recipient_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column(
            "type",
            sa.Enum("info", "warning", "notice", "system", name="notification_type_enum"),
            nullable=False,
        ),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "analytics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=True,
            unique=True,
        ),
        sa.Column("total_applications", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("interviews_taken", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("avg_score", sa.Float(), nullable=True),
        sa.Column("readiness_score", sa.Float(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "dashboard_insights",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("external_opportunities", sa.JSON(), nullable=True),
        sa.Column("resume_suggestions", sa.JSON(), nullable=True),
        sa.Column("trending_skills", sa.JSON(), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_manual_refresh_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "contact_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "category", sa.Enum("general", "placement", name="contact_category_enum"), nullable=False
        ),
        sa.Column(
            "submitted_by_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.Enum("new", "read", "resolved", name="contact_status_enum"),
            nullable=False,
            server_default="new",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("contact_messages")
    op.drop_table("dashboard_insights")
    op.drop_table("analytics")
    op.drop_table("notifications")
    op.drop_table("refresh_tokens")
    op.drop_table("resources")
    op.drop_table("test_attempts")
    op.drop_table("instant_tests")
    op.drop_table("answers")
    op.drop_table("questions")
    op.drop_table("interview_sessions")
    op.drop_table("applications")
    op.drop_table("drives")
    op.drop_table("resumes")
    op.drop_table("profiles")
    op.drop_table("fee_receipts")
    op.drop_index("ix_otp_verifications_email", table_name="otp_verifications")
    op.drop_table("otp_verifications")
    op.drop_table("companies")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    for enum_name in (
        "contact_status_enum",
        "contact_category_enum",
        "notification_type_enum",
        "resource_content_type_enum",
        "resource_category_enum",
        "instant_test_status_enum",
        "difficulty_level_enum",
        "question_type_enum",
        "interview_session_status_enum",
        "interview_mode_enum",
        "application_status_enum",
        "drive_test_status_enum",
        "drive_status_enum",
        "resume_source_enum",
        "fee_verdict_enum",
        "otp_purpose_enum",
        "user_type_enum",
    ):
        sa.Enum(name=enum_name).drop(bind, checkfirst=True)
