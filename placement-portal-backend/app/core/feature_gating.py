"""Reusable feature-gating functions.

Provides a single source-of-truth check for whether a specific feature is
active for a specific college.  Used by:
  - Part 1: payment flow transitions (auto-expire)
  - Part 2: endpoint-level gating (``require_feature`` dependency)
  - Part 3: frontend nav filtering (``get_active_features_for_college``)

The check is performed FRESH against the college_features table on every
request — never cached in JWTs or frontend state — so that SuperAdmin
grant/revoke takes effect immediately.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Sequence

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.college_feature import CollegeFeature, FeatureRequestStatus
from app.models.feature import Feature
from app.models.user import User, UserType

from app.models.notification import Notification, NotificationType

logger = logging.getLogger(__name__)


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _maybe_expire(cf: CollegeFeature, db: Session) -> None:
    """Opportunistic expiry:
    1. If ACTIVE and expires_at has passed -> flip to EXPIRED.
    2. If APPROVED_AWAITING_PAYMENT and payment_due_at has passed -> flip to APPROVAL_EXPIRED and notify college admin.
    """
    now = datetime.now(timezone.utc)
    expires_at_utc = _as_utc(cf.expires_at)
    payment_due_utc = _as_utc(cf.payment_due_at)

    if (
        cf.status == FeatureRequestStatus.ACTIVE
        and expires_at_utc is not None
        and expires_at_utc < now
    ):
        cf.status = FeatureRequestStatus.EXPIRED
        db.commit()
        logger.info(
            "Feature %s expired for college %s (expires_at=%s)",
            cf.feature_id, cf.college_id, cf.expires_at,
        )
    elif (
        cf.status == FeatureRequestStatus.APPROVED_AWAITING_PAYMENT
        and payment_due_utc is not None
        and payment_due_utc < now
    ):
        cf.status = FeatureRequestStatus.APPROVAL_EXPIRED
        db.commit()
        feature = db.get(Feature, cf.feature_id)
        feat_name = feature.name if feature else f"Feature #{cf.feature_id}"
        logger.info(
            "Feature request %s approval expired for college %s (payment_due_at=%s)",
            cf.id, cf.college_id, cf.payment_due_at,
        )
        # Notify college admin
        admin_users = db.scalars(
            select(User).where(
                User.college_id == cf.college_id,
                User.user_type == UserType.ADMIN,
                User.is_active == True,
            )
        ).all()
        for adm in admin_users:
            db.add(
                Notification(
                    recipient_id=adm.id,
                    type=NotificationType.APPROVAL_EXPIRED,
                    message=f"The 7-day payment window for feature '{feat_name}' has expired. You may submit a new request if still interested.",
                )
            )
        db.commit()


def check_all_expiries(db: Session) -> None:
    """Scan and expire any past-due subscriptions or approval windows."""
    candidates = db.scalars(
        select(CollegeFeature).where(
            CollegeFeature.status.in_([
                FeatureRequestStatus.ACTIVE,
                FeatureRequestStatus.APPROVED_AWAITING_PAYMENT,
            ])
        )
    ).all()
    for cf in candidates:
        _maybe_expire(cf, db)


def check_feature_active(db: Session, college_id: int, feature_code: str) -> bool:
    """Return True only if *feature_code* is ACTIVE for *college_id*.

    Also performs opportunistic expiry (flips ACTIVE→EXPIRED if past
    ``expires_at``).  This is the ONE function all gating should route
    through — do not duplicate this logic elsewhere.
    """
    candidates = {
        feature_code,
        feature_code.rstrip("s"),
        feature_code + "s",
        feature_code.replace("-", "_"),
        feature_code.replace("_", "-"),
    }
    cf = db.scalar(
        select(CollegeFeature)
        .join(Feature, Feature.id == CollegeFeature.feature_id)
        .where(
            CollegeFeature.college_id == college_id,
            Feature.code.in_(candidates),
        )
    )
    if cf is None:
        return False

    _maybe_expire(cf, db)
    return cf.status == FeatureRequestStatus.ACTIVE


def get_active_features_for_college(db: Session, college_id: int) -> list[str]:
    """Return every feature code that is currently ACTIVE for *college_id*.

    Performs opportunistic expiry on each row it touches.
    """
    rows: Sequence[CollegeFeature] = db.scalars(
        select(CollegeFeature)
        .where(
            CollegeFeature.college_id == college_id,
            CollegeFeature.status == FeatureRequestStatus.ACTIVE,
        )
    ).all()

    active_codes: list[str] = []
    for cf in rows:
        _maybe_expire(cf, db)
        if cf.status == FeatureRequestStatus.ACTIVE:
            feature = db.get(Feature, cf.feature_id)
            if feature:
                active_codes.append(feature.code)
    return active_codes


def require_feature(feature_code: str):
    """FastAPI dependency factory.

    Returns a dependency that checks whether the current user's college has
    *feature_code* active.  Raises 403 if not.  SuperAdmin users bypass the
    check entirely (they have no college_id).

    Usage::

        @router.get("/some-gated-endpoint")
        def my_endpoint(
            _gate=Depends(require_feature("career-insights")),
            current_user: User = Depends(require_student),
            db: Session = Depends(get_db),
        ):
            ...
    """

    def _checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> None:
        # SuperAdmin sees everything — no gating.
        if current_user.user_type == UserType.SUPERADMIN:
            return

        college_id = current_user.college_id
        if college_id is None:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail="No college associated with this account",
            )

        if not check_feature_active(db, college_id, feature_code):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail=f"The feature '{feature_code}' is not currently active for your institution.",
            )

    return _checker
