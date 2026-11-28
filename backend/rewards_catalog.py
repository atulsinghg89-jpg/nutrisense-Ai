"""Server-verified purchase reward events & S2S affiliate postback endpoints."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from datetime import date, datetime, time as dt_time, timezone
from typing import Any, Callable

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, ForeignKey, Integer, String, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

logger = logging.getLogger("nutrisense.rewards")

# Feature flag — OFF by default until explicitly enabled in backend environment.
DEFAULT_REWARDS_FLAG_ENV = "AFFILIATE_REWARDS_ENABLED"
POSTBACK_SECRET_ENV = "AFFILIATE_POSTBACK_SECRET"

# Server-controlled reward economics & replay window defaults (never read from payloads).
DEFAULT_COINS_PER_PURCHASE = 50
DEFAULT_DIAMONDS_PER_PURCHASE = 1
DEFAULT_DAILY_DIAMOND_CAP = 3
DEFAULT_TIMESTAMP_TOLERANCE_SECONDS = 300

# Product categories and tags excluded from commercial purchase incentives.
DISALLOWED_PRODUCT_CATEGORIES = frozenset({"baby_care", "patient_care", "medical"})
DISALLOWED_SUB_CATEGORIES = frozenset({"feeding", "monitoring"})
DISALLOWED_AUDIENCE_ONLY_TAGS = frozenset({"babies", "baby", "children", "patients", "patient", "medical"})


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def is_rewards_feature_enabled() -> bool:
    """Return True only when the feature flag env var is explicitly enabled."""
    return os.getenv(DEFAULT_REWARDS_FLAG_ENV, "false").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _env_non_negative_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        return max(0, int(raw.strip()))
    except ValueError:
        return default


def get_reward_server_config() -> dict[str, Any]:
    """Centralized server-side reward configuration & network payload field map."""
    return {
        "coins_per_purchase": _env_non_negative_int(
            "REWARD_COINS_PER_PURCHASE", DEFAULT_COINS_PER_PURCHASE
        ),
        "diamonds_per_purchase": _env_non_negative_int(
            "REWARD_DIAMONDS_PER_PURCHASE", DEFAULT_DIAMONDS_PER_PURCHASE
        ),
        "daily_diamond_cap": _env_non_negative_int(
            "REWARD_DAILY_DIAMOND_CAP", DEFAULT_DAILY_DIAMOND_CAP
        ),
        "timestamp_tolerance_seconds": _env_non_negative_int(
            "AFFILIATE_POSTBACK_TOLERANCE_SECONDS", DEFAULT_TIMESTAMP_TOLERANCE_SECONDS
        ),
        "signature_header": os.getenv("AFFILIATE_SIG_HEADER", "X-Affiliate-Signature"),
        "timestamp_header": os.getenv("AFFILIATE_TS_HEADER", "X-Affiliate-Timestamp"),
        "field_map": {
            "click_id": os.getenv("AFFILIATE_FIELD_CLICK_ID", "sub_id"),
            "status": os.getenv("AFFILIATE_FIELD_STATUS", "status"),
            "transaction_id": os.getenv("AFFILIATE_FIELD_TX_ID", "transaction_id"),
            "confirmed_values": [
                v.strip().lower()
                for v in os.getenv(
                    "AFFILIATE_CONFIRMED_VALUES", "confirmed,approved,converted"
                ).split(",")
                if v.strip()
            ],
            "reversed_values": [
                v.strip().lower()
                for v in os.getenv(
                    "AFFILIATE_REVERSED_VALUES",
                    "reversed,cancelled,canceled,refunded,returned",
                ).split(",")
                if v.strip()
            ],
            "rejected_values": [
                v.strip().lower()
                for v in os.getenv("AFFILIATE_REJECTED_VALUES", "rejected,declined,void").split(",")
                if v.strip()
            ],
            "pending_values": [
                v.strip().lower()
                for v in os.getenv("AFFILIATE_PENDING_VALUES", "pending,hold,processing").split(",")
                if v.strip()
            ],
        },
    }


def _compute_age_years(age_years: int | None, dob: date | None) -> int | None:
    if age_years is not None:
        return age_years
    if dob is not None:
        today = date.today()
        years = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return max(0, years)
    return None


def _is_product_eligible_for_rewards(
    category: str | None,
    sub_category: str | None,
    audience_tags_json: str | None,
) -> tuple[bool, str | None]:
    cat_norm = (category or "").strip().lower()
    sub_norm = (sub_category or "").strip().lower()
    if cat_norm in DISALLOWED_PRODUCT_CATEGORIES or sub_norm in DISALLOWED_SUB_CATEGORIES:
        return False, "Medical, baby, and patient-care product categories are excluded from purchase rewards."

    try:
        raw_tags = json.loads(audience_tags_json or "[]")
        tags = {str(t).strip().lower() for t in raw_tags} if isinstance(raw_tags, list) else set()
    except (json.JSONDecodeError, TypeError):
        tags = set()

    if tags and tags.issubset(DISALLOWED_AUDIENCE_ONLY_TAGS):
        return False, "Products targeted specifically to babies or clinical patients are excluded from rewards."

    return True, None


def _is_user_eligible_for_rewards(profiles: list[Any], selected_profile: Any | None = None) -> tuple[bool, str | None]:
    if selected_profile is not None:
        if getattr(selected_profile, "profile_type", None) == "baby":
            return False, "Child or under-18 profiles are not eligible for purchase rewards."
        age = _compute_age_years(
            getattr(selected_profile, "age_years", None),
            getattr(selected_profile, "date_of_birth", None),
        )
        if age is not None and age < 18:
            return False, "Users under 18 are not eligible for purchase rewards."
        return True, None

    if not profiles:
        return True, None

    default_profile = next((p for p in profiles if getattr(p, "is_default", False)), profiles[0])
    if getattr(default_profile, "profile_type", None) == "baby":
        return False, "Child or under-18 accounts are not eligible for purchase rewards."
    default_age = _compute_age_years(
        getattr(default_profile, "age_years", None),
        getattr(default_profile, "date_of_birth", None),
    )
    if default_age is not None and default_age < 18:
        return False, "Users under 18 are not eligible for purchase rewards."

    return True, None


class AffiliateClickRegisterRequest(BaseModel):
    listing_id: int = Field(..., ge=1)
    profile_id: int | None = Field(default=None, ge=1)
    referrer_section: str = Field(default="recommended_catalog", max_length=80)


class AffiliateClickRegisterOut(BaseModel):
    click_id: str
    listing_id: int
    product_id: int
    destination_url: str
    is_affiliate: bool
    reward_eligible: bool
    status: str
    message: str


class RewardEventOut(BaseModel):
    id: int
    click_id: str
    product_listing_id: int | None
    status: str
    coins: int
    diamonds: int
    created_at: datetime
    confirmed_at: datetime | None
    reversed_at: datetime | None


class RewardsSummaryOut(BaseModel):
    enabled: bool
    confirmed_coins: int
    confirmed_diamonds: int
    today_diamonds_granted: int
    daily_diamond_cap: int
    remaining_daily_diamonds: int
    events: list[RewardEventOut]


class PostbackAckOut(BaseModel):
    ok: bool
    click_id: str
    status: str
    coins: int
    diamonds: int
    idempotent_replay: bool


def register_rewards_module(
    app: FastAPI,
    Base: type[DeclarativeBase],
    get_db: Callable[..., Any],
    platform: dict[str, Any],
    catalog: dict[str, Any],
) -> dict[str, Any]:
    """Mount reward_events ORM model and feature-flagged reward endpoints."""
    UserProfile = platform["UserProfile"]
    get_current_user = platform["get_current_user"]
    require_owned_profile = platform["require_owned_profile"]

    ProductCatalogItem = catalog["ProductCatalogItem"]
    ProductRetailerListing = catalog["ProductRetailerListing"]
    AffiliateClickEvent = catalog["AffiliateClickEvent"]
    enforce_rate_limit = catalog["enforce_rate_limit"]

    class RewardEvent(Base):
        __tablename__ = "reward_events"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        user_id: Mapped[int] = mapped_column(
            ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
        )
        click_id: Mapped[str] = mapped_column(
            String(64), unique=True, nullable=False, index=True
        )
        affiliate_click_event_id: Mapped[int | None] = mapped_column(
            ForeignKey("affiliate_click_events.id", ondelete="SET NULL"),
            nullable=True,
        )
        product_listing_id: Mapped[int | None] = mapped_column(
            ForeignKey("product_retailer_listings.id", ondelete="SET NULL"),
            nullable=True,
        )
        status: Mapped[str] = mapped_column(
            String(24), nullable=False, default="clicked"
        )
        coins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
        diamonds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
        external_tx_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
        created_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )
        confirmed_at: Mapped[datetime | None] = mapped_column(
            DateTime(timezone=True), nullable=True
        )
        reversed_at: Mapped[datetime | None] = mapped_column(
            DateTime(timezone=True), nullable=True
        )

    def _require_rewards_enabled() -> None:
        if not is_rewards_feature_enabled():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Purchase rewards are currently disabled.",
            )

    def _serialize_reward(row: RewardEvent) -> RewardEventOut:
        return RewardEventOut(
            id=row.id,
            click_id=row.click_id,
            product_listing_id=row.product_listing_id,
            status=row.status,
            coins=row.coins,
            diamonds=row.diamonds,
            created_at=row.created_at,
            confirmed_at=row.confirmed_at,
            reversed_at=row.reversed_at,
        )

    def _verify_postback_hmac(request: Request, raw_body: bytes, cfg: dict[str, Any]) -> None:
        secret = os.getenv(POSTBACK_SECRET_ENV, "").strip()
        if not secret:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Affiliate postback verification is not configured.",
            )

        sig_header = cfg["signature_header"]
        ts_header = cfg["timestamp_header"]
        raw_sig = (request.headers.get(sig_header) or "").strip()
        raw_ts = (request.headers.get(ts_header) or "").strip()
        client_ip = request.client.host if request.client else "unknown"

        if not raw_sig or not raw_ts:
            logger.warning("Postback verification rejected: reason=missing_auth_headers ip=%s", client_ip)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing postback signature or timestamp.",
            )

        try:
            ts_value = float(raw_ts)
        except ValueError:
            logger.warning("Postback verification rejected: reason=invalid_timestamp ip=%s", client_ip)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid postback timestamp format.",
            )

        tolerance = int(cfg["timestamp_tolerance_seconds"])
        if abs(time.time() - ts_value) > tolerance:
            logger.warning("Postback verification rejected: reason=expired_timestamp ip=%s", client_ip)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Postback timestamp outside allowed tolerance window.",
            )

        incoming_hex = raw_sig.lower()
        if incoming_hex.startswith("sha256="):
            incoming_hex = incoming_hex[7:].strip()

        signed_bytes = f"{raw_ts}.".encode("utf-8") + raw_body
        expected_hex = hmac.new(
            secret.encode("utf-8"),
            signed_bytes,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(incoming_hex, expected_hex):
            logger.warning("Postback verification rejected: reason=bad_signature ip=%s", client_ip)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid postback signature.",
            )

    def _today_utc_start() -> datetime:
        now = _utc_now()
        return datetime.combine(now.date(), dt_time.min, tzinfo=timezone.utc)

    def _diamonds_granted_today(db: Session, user_id: int) -> int:
        day_start = _today_utc_start()
        total = db.scalar(
            select(func.coalesce(func.sum(RewardEvent.diamonds), 0)).where(
                RewardEvent.user_id == user_id,
                RewardEvent.status == "confirmed",
                RewardEvent.confirmed_at >= day_start,
            )
        )
        return int(total or 0)

    affiliate_router = APIRouter(prefix="/api/affiliate", tags=["Affiliate Rewards"])
    rewards_router = APIRouter(prefix="/api/rewards", tags=["Purchase Rewards"])

    @affiliate_router.post("/click", response_model=AffiliateClickRegisterOut)
    def register_affiliate_click(
        request: Request,
        payload: AffiliateClickRegisterRequest,
        _: None = Depends(_require_rewards_enabled),
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> AffiliateClickRegisterOut:
        enforce_rate_limit(request, "affiliate_click", max_requests=45, window_seconds=60)

        listing = db.get(ProductRetailerListing, payload.listing_id)
        if not listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product listing not found.",
            )
        product = db.get(ProductCatalogItem, listing.product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found.",
            )

        selected_profile = None
        if payload.profile_id is not None:
            selected_profile = require_owned_profile(db, current_user.id, payload.profile_id)
        profiles = list(
            db.scalars(select(UserProfile).where(UserProfile.user_id == current_user.id)).all()
        )

        click_id = f"ns_{secrets.token_hex(12)}"
        target_url = (
            listing.affiliate_url
            if (listing.is_affiliate and listing.affiliate_url)
            else listing.destination_url
        )
        comm_status = (
            "pending_provider_confirmation"
            if listing.is_affiliate
            else "not_applicable_non_affiliate"
        )

        click_row = AffiliateClickEvent(
            listing_id=listing.id,
            product_id=product.id,
            user_id=current_user.id,
            referrer_section=payload.referrer_section,
            is_affiliate_click=listing.is_affiliate,
            attribution_token=click_id,
            commission_status=comm_status,
        )
        db.add(click_row)
        db.flush()

        user_ok, user_reason = _is_user_eligible_for_rewards(profiles, selected_profile)
        prod_ok, prod_reason = _is_product_eligible_for_rewards(
            product.category, product.sub_category, product.audience_tags_json
        )

        if not listing.is_affiliate:
            eligible = False
            initial_status = "rejected"
            msg = "Direct storefront link logged without affiliate rewards."
        elif not user_ok:
            eligible = False
            initial_status = "rejected"
            msg = user_reason or "Account is not eligible for purchase rewards."
        elif not prod_ok:
            eligible = False
            initial_status = "rejected"
            msg = prod_reason or "Product category is excluded from purchase rewards."
        else:
            eligible = True
            initial_status = "clicked"
            msg = "Click registered. Rewards are only granted after verified affiliate purchase confirmation."

        if eligible:
            db.add(
                RewardEvent(
                    user_id=current_user.id,
                    click_id=click_id,
                    affiliate_click_event_id=click_row.id,
                    product_listing_id=listing.id,
                    status="clicked",
                    coins=0,
                    diamonds=0,
                )
            )
        db.commit()

        return AffiliateClickRegisterOut(
            click_id=click_id,
            listing_id=listing.id,
            product_id=product.id,
            destination_url=target_url,
            is_affiliate=listing.is_affiliate,
            reward_eligible=eligible,
            status=initial_status,
            message=msg,
        )

    @rewards_router.get("/me", response_model=RewardsSummaryOut)
    def get_my_rewards(
        request: Request,
        _: None = Depends(_require_rewards_enabled),
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> RewardsSummaryOut:
        enforce_rate_limit(request, "rewards_read", max_requests=60, window_seconds=60)
        cfg = get_reward_server_config()

        events = list(
            db.scalars(
                select(RewardEvent)
                .where(RewardEvent.user_id == current_user.id)
                .order_by(RewardEvent.created_at.desc(), RewardEvent.id.desc())
                .limit(100)
            ).all()
        )
        confirmed_coins = sum(e.coins for e in events if e.status == "confirmed")
        confirmed_diamonds = sum(e.diamonds for e in events if e.status == "confirmed")
        today_diamonds = _diamonds_granted_today(db, current_user.id)
        daily_cap = int(cfg["daily_diamond_cap"])

        return RewardsSummaryOut(
            enabled=True,
            confirmed_coins=confirmed_coins,
            confirmed_diamonds=confirmed_diamonds,
            today_diamonds_granted=today_diamonds,
            daily_diamond_cap=daily_cap,
            remaining_daily_diamonds=max(0, daily_cap - today_diamonds),
            events=[_serialize_reward(e) for e in events],
        )

    @affiliate_router.post("/postback", response_model=PostbackAckOut)
    async def handle_affiliate_postback(
        request: Request,
        _: None = Depends(_require_rewards_enabled),
        db: Session = Depends(get_db),
    ) -> PostbackAckOut:
        enforce_rate_limit(request, "affiliate_postback", max_requests=120, window_seconds=60)
        cfg = get_reward_server_config()
        raw_body = await request.body()
        _verify_postback_hmac(request, raw_body, cfg)

        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malformed JSON postback body.",
            )
        if not isinstance(payload, dict):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Postback payload must be a JSON object.",
            )

        fmap = cfg["field_map"]
        click_id = str(payload.get(fmap["click_id"]) or "").strip()
        raw_status = str(payload.get(fmap["status"]) or "").strip().lower()
        tx_id_raw = payload.get(fmap["transaction_id"])
        tx_id = str(tx_id_raw).strip()[:120] if tx_id_raw is not None and str(tx_id_raw).strip() else None

        if not click_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Missing required click identifier field '{fmap['click_id']}'.",
            )

        if raw_status in fmap["confirmed_values"]:
            target_status = "confirmed"
        elif raw_status in fmap["reversed_values"]:
            target_status = "reversed"
        elif raw_status in fmap["rejected_values"]:
            target_status = "rejected"
        elif raw_status in fmap["pending_values"]:
            target_status = "pending"
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unrecognized conversion status value.",
            )

        click_row = db.scalar(
            select(AffiliateClickEvent).where(AffiliateClickEvent.attribution_token == click_id)
        )
        reward_row = db.scalar(select(RewardEvent).where(RewardEvent.click_id == click_id))

        if not click_row and not reward_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unknown click_id.",
            )

        owner_user_id = reward_row.user_id if reward_row else (click_row.user_id if click_row else None)
        if not owner_user_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Click is not associated with a signed-in user.",
            )

        listing_id = reward_row.product_listing_id if reward_row else (click_row.listing_id if click_row else None)
        listing = db.get(ProductRetailerListing, listing_id) if listing_id else None
        product = db.get(ProductCatalogItem, listing.product_id) if listing else None
        profiles = list(db.scalars(select(UserProfile).where(UserProfile.user_id == owner_user_id)).all())

        user_ok, _ = _is_user_eligible_for_rewards(profiles)
        prod_ok, _ = (
            _is_product_eligible_for_rewards(product.category, product.sub_category, product.audience_tags_json)
            if product
            else (False, "Missing product context")
        )
        affiliate_ok = bool(click_row.is_affiliate_click) if click_row else bool(listing and listing.is_affiliate)

        if not reward_row:
            reward_row = RewardEvent(
                user_id=owner_user_id,
                click_id=click_id,
                affiliate_click_event_id=click_row.id if click_row else None,
                product_listing_id=listing_id,
                status="clicked",
                coins=0,
                diamonds=0,
            )
            db.add(reward_row)
            try:
                db.flush()
            except IntegrityError:
                db.rollback()
                reward_row = db.scalar(select(RewardEvent).where(RewardEvent.click_id == click_id))
                if not reward_row:
                    raise

        if not (user_ok and prod_ok and affiliate_ok):
            if reward_row.status != "reversed":
                reward_row.status = "rejected"
            reward_row.coins = 0
            reward_row.diamonds = 0
            if tx_id:
                reward_row.external_tx_id = tx_id
            db.commit()
            return PostbackAckOut(
                ok=True,
                click_id=reward_row.click_id,
                status=reward_row.status,
                coins=reward_row.coins,
                diamonds=reward_row.diamonds,
                idempotent_replay=False,
            )

        if target_status == "confirmed":
            if reward_row.status == "confirmed":
                return PostbackAckOut(
                    ok=True,
                    click_id=reward_row.click_id,
                    status=reward_row.status,
                    coins=reward_row.coins,
                    diamonds=reward_row.diamonds,
                    idempotent_replay=True,
                )
            if reward_row.status == "reversed":
                return PostbackAckOut(
                    ok=True,
                    click_id=reward_row.click_id,
                    status=reward_row.status,
                    coins=reward_row.coins,
                    diamonds=reward_row.diamonds,
                    idempotent_replay=True,
                )

            used_today = _diamonds_granted_today(db, owner_user_id)
            daily_cap = int(cfg["daily_diamond_cap"])
            remaining_diamonds = max(0, daily_cap - used_today)
            granted_diamonds = min(int(cfg["diamonds_per_purchase"]), remaining_diamonds)
            granted_coins = int(cfg["coins_per_purchase"])

            reward_row.status = "confirmed"
            reward_row.coins = granted_coins
            reward_row.diamonds = granted_diamonds
            reward_row.confirmed_at = _utc_now()
            if tx_id:
                reward_row.external_tx_id = tx_id
            if click_row:
                click_row.commission_status = "confirmed"

        elif target_status == "reversed":
            if reward_row.status == "reversed":
                return PostbackAckOut(
                    ok=True,
                    click_id=reward_row.click_id,
                    status=reward_row.status,
                    coins=reward_row.coins,
                    diamonds=reward_row.diamonds,
                    idempotent_replay=True,
                )
            reward_row.status = "reversed"
            reward_row.coins = 0
            reward_row.diamonds = 0
            reward_row.reversed_at = _utc_now()
            if tx_id:
                reward_row.external_tx_id = tx_id
            if click_row:
                click_row.commission_status = "reversed"

        elif target_status == "rejected":
            if reward_row.status == "rejected":
                return PostbackAckOut(
                    ok=True,
                    click_id=reward_row.click_id,
                    status=reward_row.status,
                    coins=reward_row.coins,
                    diamonds=reward_row.diamonds,
                    idempotent_replay=True,
                )
            reward_row.status = "rejected"
            reward_row.coins = 0
            reward_row.diamonds = 0
            if tx_id:
                reward_row.external_tx_id = tx_id
            if click_row:
                click_row.commission_status = "rejected"

        elif target_status == "pending":
            if reward_row.status == "clicked":
                reward_row.status = "pending"
                if tx_id:
                    reward_row.external_tx_id = tx_id
            else:
                return PostbackAckOut(
                    ok=True,
                    click_id=reward_row.click_id,
                    status=reward_row.status,
                    coins=reward_row.coins,
                    diamonds=reward_row.diamonds,
                    idempotent_replay=True,
                )

        db.commit()
        db.refresh(reward_row)
        return PostbackAckOut(
            ok=True,
            click_id=reward_row.click_id,
            status=reward_row.status,
            coins=reward_row.coins,
            diamonds=reward_row.diamonds,
            idempotent_replay=False,
        )

    app.include_router(affiliate_router)
    app.include_router(rewards_router)

    return {
        "RewardEvent": RewardEvent,
    }
