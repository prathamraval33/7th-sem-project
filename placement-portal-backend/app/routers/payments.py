"""Razorpay payment endpoints for the feature-purchase flow.

Three endpoints:
  POST /payments/create-order   — College Admin initiates payment (creates Razorpay order)
  POST /payments/verify         — Frontend callback (secondary confirmation)
  POST /payments/webhook        — Razorpay server-to-server webhook (source of truth)
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_optional_current_user, require_admin
from app.core.feature_gating import _maybe_expire
from app.db.session import get_db
from app.models.college import College
from app.models.college_feature import CollegeFeature, FeatureRequestStatus
from app.models.feature import Feature, BillingType
from app.models.transaction import Transaction, TransactionStatus
from app.models.user import User
from app.services.college_onboarding_service import compute_setup_checklist

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])
api_router = APIRouter(prefix="/api", tags=["payments-api"])


def _get_razorpay_client():
    """Lazy-import and instantiate the Razorpay client with mock fallback."""
    try:
        import razorpay
        if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Razorpay credentials are not configured on the server.",
            )
        return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    except (ImportError, ModuleNotFoundError) as exc:
        logger.warning("razorpay library is not installed: %s", exc)
        if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="The 'razorpay' Python library is not loaded in the backend environment. Please restart the backend server so it loads the installed razorpay package.",
            ) from exc

        class _MockOrders:
            def create(self, data: dict) -> dict:
                import uuid
                return {
                    "id": f"order_mock_{uuid.uuid4().hex[:14]}",
                    "entity": "order",
                    "amount": data.get("amount", 1000000),
                    "currency": data.get("currency", "INR"),
                    "receipt": data.get("receipt", "mock_receipt"),
                    "status": "created",
                    "notes": data.get("notes", {}),
                }

        class _MockRazorpayClient:
            order = _MockOrders()

        return _MockRazorpayClient()


def _compute_expires_at(billing_type: BillingType) -> datetime | None:
    """Return the expiry timestamp for subscription billing types."""
    now = datetime.now(timezone.utc)
    if billing_type == BillingType.MONTHLY:
        return now + timedelta(days=30)
    if billing_type == BillingType.ANNUAL:
        return now + timedelta(days=365)
    return None  # one_time never expires


# ---------------------------------------------------------------------------
# 1. Create Order — College Admin initiates payment
# ---------------------------------------------------------------------------

class CreateOrderRequest(BaseModel):
    feature_id: int | None = None
    amount: int | float | None = None  # in paise (e.g. 50000 = ₹500) or direct
    currency: str = "INR"
    receipt: str | None = None


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int  # in paise
    currency: str
    razorpay_key_id: str


@router.post("/create-order", response_model=CreateOrderResponse)
def create_order(
    payload: CreateOrderRequest,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> CreateOrderResponse:
    college_id = current_user.college_id if current_user else None

    # Case 1: Feature-specific order (Admin purchasing a feature for their college)
    if payload.feature_id is not None:
        if college_id is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No college associated with this account")

        # Look up the college-feature row
        cf = db.scalar(
            select(CollegeFeature).where(
                CollegeFeature.college_id == college_id,
                CollegeFeature.feature_id == payload.feature_id,
            )
        )
        if cf is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No feature request found for this feature")

        _maybe_expire(cf, db)

        if cf.status == FeatureRequestStatus.APPROVAL_EXPIRED:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="The 7-day payment deadline has expired for this approved feature. Please submit a new request.",
            )

        # Only allow payment in these states
        if cf.status not in (
            FeatureRequestStatus.APPROVED_AWAITING_PAYMENT,
            FeatureRequestStatus.PAYMENT_FAILED,
            FeatureRequestStatus.EXPIRED,
        ):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail=f"Cannot initiate payment — current status is '{cf.status.value}'",
            )

        feature = db.get(Feature, payload.feature_id)
        if feature is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Feature not found")

        price = float(feature.price) if feature.price else 0
        if price <= 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This feature is free — no payment required")

        amount_paise = int(round(price * 100))
        if amount_paise < 100:
            amount_paise = 100  # Razorpay minimum 100 paise (₹1)

        receipt = payload.receipt or f"feat_{payload.feature_id}_col_{college_id}_{int(datetime.now(timezone.utc).timestamp())}"
        notes = {
            "feature_id": str(payload.feature_id),
            "college_id": str(college_id),
            "feature_name": feature.name,
        }
        feature_id_val = payload.feature_id
        amount_inr = price
    elif payload.amount is not None:
        # Case 2: Direct amount (e.g. Standard Checkout testing / generic payment)
        amount_val = int(round(payload.amount))
        # If passed in paise (>= 100), keep as paise; minimum amount is 100 paise (₹1)
        if amount_val < 100:
            amount_paise = 100
        else:
            amount_paise = amount_val
        amount_inr = round(amount_paise / 100.0, 2)
        receipt = payload.receipt or f"rcpt_{int(datetime.now(timezone.utc).timestamp())}"
        notes = {"college_id": str(college_id)} if college_id else {}
        feature_id_val = None
    else:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Either feature_id or amount must be provided.",
        )

    client = _get_razorpay_client()
    try:
        order = client.order.create({
            "amount": amount_paise,
            "currency": payload.currency or "INR",
            "receipt": receipt,
            "notes": notes,
        })
    except Exception as exc:
        logger.exception("Razorpay order creation failed")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Payment gateway error: {exc}") from exc

    # Insert transaction row
    txn = Transaction(
        college_id=college_id,
        feature_id=feature_id_val,
        amount=amount_inr,
        currency=payload.currency or "INR",
        status=TransactionStatus.CREATED,
        razorpay_order_id=order["id"],
    )
    db.add(txn)
    db.commit()

    return CreateOrderResponse(
        order_id=order["id"],
        amount=amount_paise,
        currency=payload.currency or "INR",
        razorpay_key_id=settings.RAZORPAY_KEY_ID,
    )


class CreateSubscriptionOrderRequest(BaseModel):
    college_id: int | None = None


@router.post("/subscription/create-order", response_model=CreateOrderResponse)
def create_subscription_order(
    payload: CreateSubscriptionOrderRequest | None = None,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> CreateOrderResponse:
    college_id = (current_user.college_id if current_user and current_user.college_id else None) or (payload.college_id if payload else None)
    if college_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="College ID is required to create subscription order")

    college = db.get(College, college_id)
    if college is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="College not found")

    amount_paise = 1000000  # ₹10,000 in paise
    receipt = f"sub_{college_id}_{int(datetime.now(timezone.utc).timestamp())}"
    notes = {
        "college_id": str(college_id),
        "type": "campus_subscription",
        "college_name": college.name,
    }

    client = _get_razorpay_client()
    try:
        order = client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "notes": notes,
        })
    except Exception as exc:
        logger.exception("Razorpay subscription order creation failed")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Payment gateway error: {exc}") from exc

    txn = Transaction(
        college_id=college_id,
        feature_id=None,
        amount=10000.00,
        currency="INR",
        status=TransactionStatus.CREATED,
        razorpay_order_id=order["id"],
    )
    db.add(txn)
    db.commit()

    return CreateOrderResponse(
        order_id=order["id"],
        amount=amount_paise,
        currency="INR",
        razorpay_key_id=settings.RAZORPAY_KEY_ID,
    )


# ---------------------------------------------------------------------------
# 2. Verify Payment — Frontend callback (secondary confirmation)
# ---------------------------------------------------------------------------

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/verify")
def verify_payment(
    payload: VerifyPaymentRequest,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> dict:
    # Verify signature using HMAC-SHA256
    expected_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, payload.razorpay_signature):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Payment signature verification failed")

    # Find the transaction
    txn = db.scalar(
        select(Transaction).where(Transaction.razorpay_order_id == payload.razorpay_order_id)
    )
    if txn is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    # Idempotency — if already paid, just return success
    if txn.status == TransactionStatus.PAID:
        return {"message": "Payment already verified", "status": "paid"}

    # Mark transaction as paid
    now = datetime.now(timezone.utc)
    txn.status = TransactionStatus.PAID
    txn.razorpay_payment_id = payload.razorpay_payment_id
    txn.razorpay_signature = payload.razorpay_signature
    txn.paid_at = now

    # Case A: Feature purchase
    if txn.feature_id is not None:
        cf = db.scalar(
            select(CollegeFeature).where(
                CollegeFeature.college_id == txn.college_id,
                CollegeFeature.feature_id == txn.feature_id,
            )
        )
        if cf is not None:
            cf.status = FeatureRequestStatus.ACTIVE
            cf.paid_at = now
            cf.payment_due_at = None
            cf.amount_charged = txn.amount
            feature = db.get(Feature, txn.feature_id)
            if feature:
                cf.expires_at = _compute_expires_at(feature.billing_type)
    # Case B: Institutional Campus Subscription (₹10,000 / month)
    elif txn.college_id is not None:
        college = db.get(College, txn.college_id)
        if college is not None:
            college.subscription_status = "active"
            exp = college.subscription_expires_at
            if exp and exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)

            if exp and exp > now:
                college.subscription_expires_at = exp + timedelta(days=30)
            else:
                college.subscription_started_at = now
                college.subscription_expires_at = now + timedelta(days=30)

            college.subscription_amount = txn.amount
            db.commit()

            # Check if all required checklist items are now complete; if so, transitions to READY_FOR_REVIEW!
            compute_setup_checklist(db=db, college=college, current_user_id=current_user.id if current_user else None)

    db.commit()
    return {"message": "Payment verified successfully", "status": "paid"}


# ---------------------------------------------------------------------------
# 3. Webhook — Razorpay server-to-server (source of truth)
# ---------------------------------------------------------------------------

@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)) -> dict:
    """Razorpay webhook handler.

    This is the SOURCE OF TRUTH for payment status — the frontend verify
    endpoint is only a secondary confirmation.  If a user closes the browser
    before the frontend callback fires, this webhook still ensures the
    payment is recorded.
    """
    body = await request.body()

    # Verify webhook signature unconditionally
    webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
    if not webhook_secret:
        logger.error("Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not configured")
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook verification is not configured on this server",
        )

    signature = request.headers.get("X-Razorpay-Signature", "")
    if not signature:
        logger.warning("Webhook rejected: missing X-Razorpay-Signature header")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Missing X-Razorpay-Signature header")

    expected = hmac.new(
        webhook_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        logger.warning("Webhook signature verification failed")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload")

    event = payload.get("event", "")
    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})

    order_id = payment_entity.get("order_id")
    payment_id = payment_entity.get("id")

    if not order_id:
        # Not a payment event we care about
        return {"status": "ignored"}

    txn = db.scalar(
        select(Transaction).where(Transaction.razorpay_order_id == order_id)
    )
    if txn is None:
        logger.warning("Webhook received for unknown order_id=%s", order_id)
        return {"status": "ignored"}

    now = datetime.now(timezone.utc)

    if event == "payment.captured":
        # Idempotency
        if txn.status == TransactionStatus.PAID:
            return {"status": "already_processed"}

        txn.status = TransactionStatus.PAID
        txn.razorpay_payment_id = payment_id
        txn.paid_at = now

        if txn.feature_id is not None:
            cf = db.scalar(
                select(CollegeFeature).where(
                    CollegeFeature.college_id == txn.college_id,
                    CollegeFeature.feature_id == txn.feature_id,
                )
            )
            if cf is not None:
                cf.status = FeatureRequestStatus.ACTIVE
                cf.paid_at = now
                cf.payment_due_at = None
                cf.amount_charged = txn.amount
                feature = db.get(Feature, txn.feature_id)
                if feature:
                    cf.expires_at = _compute_expires_at(feature.billing_type)
        elif txn.college_id is not None:
            college = db.get(College, txn.college_id)
            if college is not None:
                college.subscription_status = "active"
                exp = college.subscription_expires_at
                if exp and exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)

                if exp and exp > now:
                    college.subscription_expires_at = exp + timedelta(days=30)
                else:
                    college.subscription_started_at = now
                    college.subscription_expires_at = now + timedelta(days=30)

                college.subscription_amount = txn.amount
                db.commit()
                compute_setup_checklist(db=db, college=college)

        db.commit()
        logger.info("Webhook: payment.captured for order %s", order_id)
        return {"status": "captured"}

    elif event == "payment.failed":
        if txn.status != TransactionStatus.PAID:
            txn.status = TransactionStatus.FAILED
            txn.razorpay_payment_id = payment_id

            if txn.feature_id is not None:
                cf = db.scalar(
                    select(CollegeFeature).where(
                        CollegeFeature.college_id == txn.college_id,
                        CollegeFeature.feature_id == txn.feature_id,
                    )
                )
                if cf is not None and cf.status != FeatureRequestStatus.ACTIVE:
                    cf.status = FeatureRequestStatus.PAYMENT_FAILED

            db.commit()
            logger.info("Webhook: payment.failed for order %s", order_id)
        return {"status": "failed"}

    return {"status": "ignored"}


# Aliases under /api prefix
api_router.add_api_route("/create-order", create_order, methods=["POST"], response_model=CreateOrderResponse)
api_router.add_api_route("/subscription/create-order", create_subscription_order, methods=["POST"], response_model=CreateOrderResponse)
api_router.add_api_route("/verify-payment", verify_payment, methods=["POST"])
api_router.add_api_route("/verify", verify_payment, methods=["POST"])
