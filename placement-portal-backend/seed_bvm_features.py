"""Seed/backfill script to grant all catalog features to BVM college.

BVM is the default/testing tenant and should have every feature active out of the box.
Auto-granted features have `is_auto_granted=True` so they do not inflate revenue analytics.
"""
from datetime import datetime, timezone
import logging

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.college import College
from app.models.college_feature import CollegeFeature, FeatureRequestStatus
from app.models.feature import Feature, FeatureStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_bvm_features")

BVM_DOMAIN = "bvmengineering.ac.in"


def seed_bvm():
    db = SessionLocal()
    try:
        bvm = db.scalar(select(College).where(College.domain == BVM_DOMAIN))
        if not bvm:
            logger.error("BVM college not found with domain '%s'", BVM_DOMAIN)
            return

        logger.info("Found BVM college: %s (ID: %s)", bvm.name, bvm.id)

        features = db.scalars(select(Feature)).all()
        logger.info("Found %d total features in catalog", len(features))

        now = datetime.now(timezone.utc)
        granted_count = 0
        already_active = 0

        for feat in features:
            cf = db.scalar(
                select(CollegeFeature).where(
                    CollegeFeature.college_id == bvm.id,
                    CollegeFeature.feature_id == feat.id,
                )
            )
            if cf is None:
                cf = CollegeFeature(
                    college_id=bvm.id,
                    feature_id=feat.id,
                    status=FeatureRequestStatus.ACTIVE,
                    is_auto_granted=True,
                    decided_at=now,
                    approved_at=now,
                )
                db.add(cf)
                granted_count += 1
                logger.info("Granted feature '%s' (%s) to BVM", feat.name, feat.code)
            elif cf.status != FeatureRequestStatus.ACTIVE:
                cf.status = FeatureRequestStatus.ACTIVE
                cf.is_auto_granted = True
                cf.approved_at = now
                granted_count += 1
                logger.info("Activated existing feature '%s' (%s) for BVM", feat.name, feat.code)
            else:
                already_active += 1

        db.commit()
        logger.info(
            "Finished seeding BVM: %d features granted/activated, %d already active.",
            granted_count,
            already_active,
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed_bvm()
