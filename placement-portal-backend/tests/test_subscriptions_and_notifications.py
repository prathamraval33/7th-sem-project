from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy import select

from app.core.dependencies import require_admin, require_superadmin
from app.core.feature_gating import _maybe_expire, check_all_expiries
from app.models.college import College, CollegeStatus
from app.models.college_feature import CollegeFeature, FeatureRequestStatus
from app.models.feature import Feature, FeatureStatus, BillingType
from app.models.notification import Notification, NotificationType
from app.models.user import User, UserType
from app.main import app


def test_approval_expired_lifecycle_and_notifications(db_session, client):
    # Setup College, Feature, Users
    college = College(name="Tech Institute", domain="tech.edu", status=CollegeStatus.ACTIVE)
    db_session.add(college)
    db_session.flush()

    superadmin = User(
        email="super@portal.com",
        hashed_password="pw",
        user_type=UserType.SUPERADMIN,
        is_active=True,
    )
    admin_user = User(
        email="admin@tech.edu",
        hashed_password="pw",
        user_type=UserType.ADMIN,
        college_id=college.id,
        is_active=True,
    )
    db_session.add_all([superadmin, admin_user])

    feature = Feature(
        code="advanced-analytics",
        name="Advanced Analytics",
        description="Deep insights",
        category="Analytics",
        target_role="admin",
        price=15000.0,
        billing_type=BillingType.ANNUAL,
        status=FeatureStatus.ACTIVE,
    )
    db_session.add(feature)
    db_session.commit()

    # Create an approved feature awaiting payment with expired deadline (e.g. 8 days ago)
    past_due = datetime.now(timezone.utc) - timedelta(days=1)
    cf = CollegeFeature(
        college_id=college.id,
        feature_id=feature.id,
        status=FeatureRequestStatus.APPROVED_AWAITING_PAYMENT,
        payment_due_at=past_due,
        reminder_count=0,
    )
    db_session.add(cf)
    db_session.commit()

    # Trigger opportunistic expiry check
    _maybe_expire(cf, db_session)
    assert cf.status == FeatureRequestStatus.APPROVAL_EXPIRED

    # Check that notification was sent to college admin
    notif = db_session.scalar(
        select(Notification).where(
            Notification.recipient_id == admin_user.id,
            Notification.type == NotificationType.APPROVAL_EXPIRED,
        )
    )
    assert notif is not None
    assert "payment window for feature 'Advanced Analytics' has expired" in notif.message


def test_superadmin_subscriptions_api_and_reminders(db_session, client):
    college = College(name="Alpha College", domain="alpha.edu", status=CollegeStatus.ACTIVE)
    db_session.add(college)
    db_session.flush()

    superadmin = User(
        email="super2@portal.com",
        hashed_password="pw",
        user_type=UserType.SUPERADMIN,
        is_active=True,
    )
    admin_user = User(
        email="admin2@alpha.edu",
        hashed_password="pw",
        user_type=UserType.ADMIN,
        college_id=college.id,
        is_active=True,
    )
    db_session.add_all([superadmin, admin_user])

    feat_monthly = Feature(
        code="mock-interviews",
        name="AI Mock Interviews",
        description="AI practice",
        category="Preparation",
        target_role="student",
        price=5000.0,
        billing_type=BillingType.MONTHLY,
        status=FeatureStatus.ACTIVE,
    )
    db_session.add(feat_monthly)
    db_session.flush()

    # Sub 1: Awaiting payment with payment_due_at
    future_due = datetime.now(timezone.utc) + timedelta(days=5)
    cf1 = CollegeFeature(
        college_id=college.id,
        feature_id=feat_monthly.id,
        status=FeatureRequestStatus.APPROVED_AWAITING_PAYMENT,
        payment_due_at=future_due,
        reminder_count=0,
    )
    db_session.add(cf1)
    db_session.commit()

    # Override superadmin dependency
    app.dependency_overrides[require_superadmin] = lambda: superadmin

    # Test GET /superadmin/subscriptions
    resp = client.get("/superadmin/subscriptions")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["subscriptions"]) == 1
    assert data["summary"]["pending_payment_count"] == 1
    assert data["subscriptions"][0]["college_name"] == "Alpha College"
    assert data["subscriptions"][0]["status"] == "approved_awaiting_payment"

    # Test POST /superadmin/subscriptions/{id}/remind
    remind_resp = client.post(f"/superadmin/subscriptions/{cf1.id}/remind")
    assert remind_resp.status_code == 200
    remind_data = remind_resp.json()
    assert remind_data["reminder_count"] == 1

    # Verify notification in DB
    notif = db_session.scalar(
        select(Notification).where(
            Notification.recipient_id == admin_user.id,
            Notification.type == NotificationType.PAYMENT_REMINDER,
        )
    )
    assert notif is not None
    assert "Pending payment of ₹5,000.00" in notif.message

    app.dependency_overrides.clear()
