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

logger = logging.getLogger(__name__)


def _maybe_expire(cf: CollegeFeature, db: Session) -> None:
    """Opportunistic expiry: if expires_at has passed and the row is still
    ACTIVE, flip it to EXPIRED right now.  This avoids needing a background
    scheduler while ensuring expiry is caught on the very next access."""
    if (
        cf.status == FeatureRequestStatus.ACTIVE
        and cf.expires_at is not None
        and cf.expires_at < datetime.now(timezone.utc)
    ):
        cf.status = FeatureRequestStatus.EXPIRED
        db.commit()
        logger.info(
            "Feature %s expired for college %s (expires_at=%s)",
            cf.feature_id, cf.college_id, cf.expires_at,
        )


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
