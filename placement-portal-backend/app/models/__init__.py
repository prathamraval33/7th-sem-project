"""Import every model so `Base.metadata` is fully populated for Alembic
autogenerate and so mapper configuration (relationships) resolves cleanly.
"""
from app.models.user import User, UserType
from app.models.college import College, CollegeStatus
from app.models.feature import Feature
from app.models.college_feature import CollegeFeature, FeatureRequestStatus
from app.models.announcement import Announcement
from app.models.audit_log import AuditLog
from app.models.otp_verification import OtpVerification, OtpPurpose
from app.models.fee_receipt import FeeReceipt, FeeVerdict
from app.models.profile import Profile
from app.models.branch import Branch
from app.models.resume import Resume, ResumeSource
from app.models.company import Company
from app.models.drive import Drive, DriveStatus, DriveTestStatus
from app.models.application import Application, ApplicationStatus
from app.models.interview_session import InterviewSession, InterviewMode, InterviewSessionStatus
from app.models.question import Question, QuestionType, DifficultyLevel
from app.models.answer import Answer
from app.models.instant_test import InstantTest, InstantTestStatus
from app.models.test_attempt import TestAttempt, AttemptStatus, AttemptEndedReason
from app.models.test_violation import TestViolation, ViolationType
from app.models.resource import Resource, ResourceCategory, ResourceContentType
from app.models.refresh_token import RefreshToken
from app.models.notification import Notification, NotificationType
from app.models.analytics import Analytics
from app.models.dashboard_insight import DashboardInsight
from app.models.contact_message import ContactMessage, ContactCategory, ContactStatus

__all__ = [
    "User",
    "UserType",
    "College",
    "CollegeStatus",
    "Feature",
    "CollegeFeature",
    "FeatureRequestStatus",
    "Announcement",
    "AuditLog",
    "OtpVerification",
    "OtpPurpose",
    "FeeReceipt",
    "FeeVerdict",
    "Profile",
    "Branch",
    "Resume",
    "ResumeSource",
    "Company",
    "Drive",
    "DriveStatus",
    "DriveTestStatus",
    "Application",
    "ApplicationStatus",
    "InterviewSession",
    "InterviewMode",
    "InterviewSessionStatus",
    "Question",
    "QuestionType",
    "DifficultyLevel",
    "Answer",
    "InstantTest",
    "InstantTestStatus",
    "TestAttempt",
    "AttemptEndedReason",
    "TestViolation",
    "ViolationType",
    "Resource",
    "ResourceCategory",
    "ResourceContentType",
    "RefreshToken",
    "Notification",
    "NotificationType",
    "Analytics",
    "DashboardInsight",
    "ContactMessage",
    "ContactCategory",
    "ContactStatus",
]
