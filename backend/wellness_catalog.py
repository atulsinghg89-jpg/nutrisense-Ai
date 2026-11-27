"""Women's Wellness Companion, Centralized Product Recommendation System & Directory APIs."""

from __future__ import annotations

import json
import math
import secrets
import time
from collections import defaultdict, deque
from datetime import date, datetime, timedelta, timezone
from typing import Any, Callable, Literal

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, func, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

ALLOWED_SYMPTOMS = {
    "cramps",
    "bloating",
    "headache",
    "fatigue",
    "back_pain",
    "mood_changes",
    "nausea",
    "no_symptoms",
    "other",
}

ALLOWED_MOODS = {"happy", "calm", "tired", "low", "irritated", "anxious", "other"}

PRODUCT_CATEGORIES = {
    "women_period_care",
    "fitness_accessories",
    "nutrition_products",
    "hydration_products",
    "baby_care",
    "patient_care",
}

# Sliding-window in-memory rate limiter state (per client IP + scope, never stores health values)
_RATE_BUCKETS: dict[str, deque[float]] = defaultdict(deque)

# Module-level hook populated when register_wellness_and_catalog mounts ORM classes
_SYNC_CATALOG_HOOK: Callable[..., None] | None = None
_SEED_CATALOG_SYNCED: bool = False


def sync_verified_seed_catalog(db: Session) -> None:
    """Trigger idempotent catalog/provider upsert from Alembic migrations or startup."""
    if _SYNC_CATALOG_HOOK is not None:
        _SYNC_CATALOG_HOOK(db, force=True)


def enforce_rate_limit(
    request: Request,
    scope: str,
    max_requests: int = 60,
    window_seconds: int = 60,
) -> None:
    """Lightweight sliding-window rate limiter on sensitive wellness endpoints."""
    client_host = request.client.host if request.client else "unknown"
    key = f"{scope}:{client_host}"
    now = time.monotonic()
    bucket = _RATE_BUCKETS[key]
    cutoff = now - window_seconds
    while bucket and bucket[0] < cutoff:
        bucket.popleft()
    if len(bucket) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests in a short window. Please wait a moment and try again.",
        )
    bucket.append(now)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _today_date() -> date:
    return datetime.now(timezone.utc).date()


def _parse_json_list(raw: str | None) -> list[Any]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


# ---------------------------------------------------------------------------
# CDC 2000 LMS Reference Data (Ages 5–19 Youth Percentiles, Zero Adult Cutoffs for Minors)
# ---------------------------------------------------------------------------

_CDC_FEMALE_LMS = [
    (5, -2.011, 15.24, 0.097),
    (6, -2.142, 15.27, 0.105),
    (7, -2.238, 15.49, 0.114),
    (8, -2.288, 15.86, 0.123),
    (9, -2.288, 16.36, 0.132),
    (10, -2.244, 16.96, 0.140),
    (11, -2.170, 17.64, 0.146),
    (12, -2.085, 18.36, 0.150),
    (13, -2.008, 19.08, 0.153),
    (14, -1.948, 19.74, 0.154),
    (15, -1.908, 20.31, 0.155),
    (16, -1.891, 20.78, 0.155),
    (17, -1.896, 21.14, 0.156),
]

_CDC_MALE_LMS = [
    (5, -1.693, 15.42, 0.088),
    (6, -1.884, 15.43, 0.095),
    (7, -2.075, 15.61, 0.104),
    (8, -2.242, 15.96, 0.114),
    (9, -2.369, 16.43, 0.123),
    (10, -2.444, 16.98, 0.132),
    (11, -2.463, 17.60, 0.139),
    (12, -2.429, 18.27, 0.144),
    (13, -2.356, 18.97, 0.147),
    (14, -2.264, 19.68, 0.149),
    (15, -2.172, 20.39, 0.150),
    (16, -2.094, 21.08, 0.151),
    (17, -2.043, 21.74, 0.152),
]


def _norm_cdf(z: float) -> float:
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def _compute_bmi_server(
    height_cm: float,
    weight_kg: float,
    age_years: int | None,
    sex_context: str = "female",
) -> dict[str, Any]:
    h_m = max(0.4, height_cm / 100.0)
    bmi = round(weight_kg / (h_m * h_m), 1)
    if age_years is not None and age_years < 5:
        return {
            "bmi": bmi,
            "mode": "infant_pediatric_defer",
            "percentile": None,
            "headline": "Pediatric Growth Chart Recommended",
            "context_note": "For ages under 5, clinicians evaluate WHO/IAP length-for-age and weight-for-length growth charts rather than numeric BMI thresholds.",
        }
    if age_years is not None and age_years < 18:
        table = _CDC_MALE_LMS if sex_context == "male" else _CDC_FEMALE_LMS
        idx = max(0, min(len(table) - 1, age_years - 5))
        _, l_val, m_val, s_val = table[idx]
        z = ((bmi / m_val) ** l_val - 1.0) / (l_val * s_val)
        pct = float(max(1, min(99, round(_norm_cdf(z) * 100))))
        return {
            "bmi": bmi,
            "mode": "youth_percentile",
            "percentile": pct,
            "headline": f"~{int(pct)}th CDC BMI-for-Age Percentile",
            "context_note": f"Age- and sex-specific CDC youth percentile reference for age {age_years}. Adult fixed BMI categories are never applied under 18, and no weight-loss or gain targets are prescribed.",
        }
    return {
        "bmi": bmi,
        "mode": "adult_informational",
        "percentile": None,
        "headline": f"BMI {bmi} kg/m² (Screening Context)",
        "context_note": "BMI is a general screening indicator, not a complete measure of health or body composition. NutriSense AI never recommends diets or weight goals from BMI alone.",
    }


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------


class WomensPreferencesUpdateRequest(BaseModel):
    profile_id: int = Field(..., ge=1)
    consent_given: bool | None = None
    tracking_enabled: bool | None = None
    reminders_enabled: bool | None = None
    reminder_days_before: int | None = Field(default=None, ge=0, le=14)
    typical_cycle_length: int | None = Field(default=None, ge=20, le=45)
    typical_period_days: int | None = Field(default=None, ge=2, le=12)
    age_band: str | None = Field(default=None, max_length=32)
    height_cm: float | None = Field(default=None, gt=40, le=260)
    weight_kg: float | None = Field(default=None, gt=5, le=400)
    bmi_consent_given: bool | None = None
    clear_bmi_metrics: bool = False
    dietary_preferences: list[str] | None = None
    activity_preferences: list[str] | None = None
    optional_goals: list[str] | None = None


class WomensPreferencesOut(BaseModel):
    profile_id: int
    consent_given: bool
    consent_updated_at: datetime | None
    tracking_enabled: bool
    reminders_enabled: bool
    reminder_days_before: int | None
    typical_cycle_length: int
    typical_period_days: int
    age_band: str | None
    height_cm: float | None
    weight_kg: float | None
    bmi_consent_given: bool
    dietary_preferences: list[str]
    activity_preferences: list[str]
    optional_goals: list[str]
    created_at: datetime
    updated_at: datetime


class ConsentCreateRequest(BaseModel):
    profile_id: int = Field(..., ge=1)
    consent_type: Literal["wellness_profile", "period_tracking", "bmi_screening", "reminders"]
    consent_status: Literal["granted", "withdrawn"] = "granted"
    consent_version: str = Field(default="v1.0", max_length=32)


class ConsentEventOut(BaseModel):
    id: int
    profile_id: int
    consent_type: str
    consent_status: str
    consent_version: str
    consented_at: datetime
    withdrawn_at: datetime | None


class BmiEstimateRequest(BaseModel):
    profile_id: int = Field(..., ge=1)
    height_cm: float = Field(..., gt=40, le=260)
    weight_kg: float = Field(..., gt=5, le=400)
    consent_confirmed: bool = True


class BmiHistoryOut(BaseModel):
    id: int
    profile_id: int
    bmi_value: float
    assessment_mode: str
    percentile: float | None
    height_cm_used: float
    weight_kg_used: float
    age_years_used: int | None
    consent_confirmed: bool
    headline: str
    context_note: str
    calculated_at: datetime


class PeriodRecordCreateRequest(BaseModel):
    profile_id: int = Field(..., ge=1)
    start_date: date
    end_date: date | None = None
    flow_level: Literal["spotting", "light", "moderate", "heavy", "skipped"] | None = None
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("start_date")
    @classmethod
    def check_start(cls, v: date) -> date:
        if v > _today_date() + timedelta(days=2):
            raise ValueError("Period start date cannot be far in the future.")
        return v

    @field_validator("end_date")
    @classmethod
    def check_end(cls, v: date | None, info: Any) -> date | None:
        if v is None:
            return v
        start = info.data.get("start_date")
        if start and v < start:
            raise ValueError("Period end date cannot be earlier than start date.")
        if start and (v - start).days > 21:
            raise ValueError("Logged period span exceeds 21 days; verify dates or consult a clinician.")
        return v


class PeriodRecordUpdateRequest(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    flow_level: Literal["spotting", "light", "moderate", "heavy", "skipped"] | None = None
    notes: str | None = Field(default=None, max_length=500)


class PeriodRecordOut(BaseModel):
    id: int
    profile_id: int
    start_date: date
    end_date: date | None
    flow_level: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class SymptomMoodCreateRequest(BaseModel):
    profile_id: int = Field(..., ge=1)
    period_record_id: int | None = Field(default=None, ge=1)
    record_date: date
    symptoms: list[str] = Field(default_factory=list)
    symptom_severity: Literal["mild", "moderate", "severe"] | None = None
    cramps_level: Literal["none", "mild", "moderate", "severe"] | None = None
    energy_level: Literal["low", "moderate", "steady"] | None = None
    symptom_other_text: str | None = Field(default=None, max_length=255)
    mood: str | None = Field(default=None, max_length=32)
    mood_other_text: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("symptoms")
    @classmethod
    def validate_symptoms(cls, v: list[str]) -> list[str]:
        cleaned: list[str] = []
        seen: set[str] = set()
        for raw in v:
            s = raw.strip().lower().replace(" ", "_")
            if s not in ALLOWED_SYMPTOMS:
                raise ValueError(f"Unsupported symptom option: {raw}")
            if s not in seen:
                seen.add(s)
                cleaned.append(s)
        if "no_symptoms" in cleaned and len(cleaned) > 1:
            cleaned = ["no_symptoms"]
        return cleaned

    @field_validator("mood")
    @classmethod
    def validate_mood(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        m = v.strip().lower()
        if m not in ALLOWED_MOODS:
            raise ValueError(f"Unsupported mood option: {v}")
        return m


class SymptomMoodOut(BaseModel):
    id: int
    profile_id: int
    period_record_id: int | None
    record_date: date
    symptoms: list[str]
    symptom_severity: str | None
    cramps_level: str | None
    energy_level: str | None
    symptom_other_text: str | None
    mood: str | None
    mood_other_text: str | None
    notes: str | None
    created_at: datetime


class CycleEstimateOut(BaseModel):
    has_estimate: bool
    next_period_estimated_start: date | None
    average_cycle_days: int
    disclaimer: str


class WomensSummaryOut(BaseModel):
    preferences: WomensPreferencesOut
    period_records: list[PeriodRecordOut]
    symptom_records: list[SymptomMoodOut]
    consents: list[ConsentEventOut]
    bmi_history: list[BmiHistoryOut]
    estimate: CycleEstimateOut


class RetailerListingOut(BaseModel):
    listing_id: int
    retailer_slug: str
    retailer_name: str
    retailer_domain: str
    destination_url: str
    redirect_path: str
    is_affiliate: bool
    link_type: str
    price_inr: float | None
    original_price_inr: float | None
    price_display: str
    live_price_verified: bool
    availability: str
    last_checked_at: date
    source_provenance: str | None
    disclosure_text: str
    is_sponsored: bool


class ProductOut(BaseModel):
    id: int
    slug: str
    name: str
    variant_label: str | None
    brand: str
    category: str
    sub_category: str | None
    audience_tags: list[str]
    budget_tier: str
    image_path: str
    has_verified_image: bool
    image_caption: str
    features: list[str]
    quality_notes: str
    listings: list[RetailerListingOut]


class ProductRedirectInspectOut(BaseModel):
    listing_id: int
    destination_url: str
    is_affiliate: bool
    link_type: str
    disclosure_text: str
    commission_status: str
    attribution_token: str


class AffiliateClickPostRequest(BaseModel):
    listing_id: int = Field(..., ge=1)
    referrer_section: str = Field(default="women_catalog", max_length=80)


class HealthcareProviderOut(BaseModel):
    id: int
    slug: str
    provider_type: str
    name: str
    qualifications: str
    registration_details: str
    specialization: str
    hospital_or_organization: str
    location: str
    consultation_mode: str
    availability: str
    consultation_fees_note: str
    verification_source: str
    official_url: str
    booking_status: str
    is_sponsored: bool


class DiagnosticLabOut(BaseModel):
    id: int
    slug: str
    name: str
    available_tests_note: str
    location: str
    accreditation_note: str
    pricing_note: str
    official_booking_url: str
    booking_integration_status: str
    is_sponsored: bool


class AppointmentPreviewCreateRequest(BaseModel):
    profile_id: int = Field(..., ge=1)
    provider_slug: str | None = Field(default=None, max_length=120)
    lab_slug: str | None = Field(default=None, max_length=120)
    preferred_date: date | None = None
    notes: str | None = Field(default=None, max_length=400)


class AppointmentPreviewOut(BaseModel):
    id: int
    profile_id: int
    provider_slug: str | None
    lab_slug: str | None
    preferred_date: date | None
    booking_status: str
    notes: str | None
    created_at: datetime


class SubscriptionPlanOut(BaseModel):
    id: int
    slug: str
    name: str
    tagline: str
    features: list[str]
    status: str
    billing_active: bool


# ---------------------------------------------------------------------------
# Verified Catalog & Portal Seed Data (Zero Fake Prices/Images/Links/Doctors)
# ---------------------------------------------------------------------------

SEED_RETAILERS = [
    {
        "slug": "nua_official",
        "name": "Nua Official Store",
        "domain": "nuawoman.com",
        "affiliate_program_configured": False,
        "default_disclosure": "Direct official brand storefront (non-affiliate reference).",
    },
    {
        "slug": "sirona_official",
        "name": "Sirona Official Store",
        "domain": "thesirona.com",
        "affiliate_program_configured": False,
        "default_disclosure": "Direct official brand storefront (non-affiliate reference).",
    },
    {
        "slug": "carmesi_official",
        "name": "Carmesi Official Store",
        "domain": "mycarmesi.com",
        "affiliate_program_configured": False,
        "default_disclosure": "Direct official brand storefront (non-affiliate reference).",
    },
    {
        "slug": "peesafe_official",
        "name": "Pee Safe Official Store",
        "domain": "peesafe.com",
        "affiliate_program_configured": False,
        "default_disclosure": "Direct official brand storefront (non-affiliate reference).",
    },
    {
        "slug": "drtrust_official",
        "name": "Dr Trust India Official",
        "domain": "drtrust.in",
        "affiliate_program_configured": False,
        "default_disclosure": "Direct official medical comfort device portal (non-affiliate reference).",
    },
    {
        "slug": "whisper_official",
        "name": "Whisper India Portal",
        "domain": "whisper.co.in",
        "affiliate_program_configured": False,
        "default_disclosure": "Direct official brand product portal (non-affiliate reference).",
    },
    {
        "slug": "decathlon_in",
        "name": "Decathlon India",
        "domain": "decathlon.in",
        "affiliate_program_configured": False,
        "default_disclosure": "Direct official sports retailer portal (non-affiliate reference).",
    },
    {
        "slug": "milton_official",
        "name": "Milton Official Store",
        "domain": "milton.in",
        "affiliate_program_configured": False,
        "default_disclosure": "Direct official brand portal (non-affiliate reference).",
    },
    {
        "slug": "philips_in",
        "name": "Philips India",
        "domain": "philips.co.in",
        "affiliate_program_configured": False,
        "default_disclosure": "Direct manufacturer portal (non-affiliate reference).",
    },
    {
        "slug": "omron_in",
        "name": "Omron Healthcare India",
        "domain": "omronhealthcare-ap.com",
        "affiliate_program_configured": False,
        "default_disclosure": "Direct manufacturer portal (non-affiliate reference).",
    },
]

VERIFIED_CHECK_DATE = date(2026, 11, 27)

# Every retail item omits unverified packaging photography (image_path="" & has_verified_image=False)
# so frontend displays a neutral placeholder instead of a generic or mismatched image.
SEED_PRODUCTS = [
    {
        "slug": "stayfree-whisper-cotton-pads",
        "name": "Whisper Bindazzz Nights",
        "variant_label": "XXL+ Overnight Sanitary Pads (Various Pack Sizes)",
        "brand": "Whisper (P&G India)",
        "category": "women_period_care",
        "sub_category": "pads",
        "audience_tags": ["women"],
        "budget_tier": "budget_friendly",
        "image_path": "",
        "has_verified_image": False,
        "image_caption": "Official product packaging viewable directly on whisper.co.in or pharmacy retailers.",
        "features": [
            "Overnight length with wider back designed for heavy menstrual flow",
            "Available in compact trial packs and pharmacy value packs",
        ],
        "quality_notes": "Widely accessible everyday synthetic-blend option across local Indian chemists.",
        "sort_order": 1,
        "listings": [
            {
                "retailer_slug": "whisper_official",
                "destination_url": "https://www.whisper.co.in",
                "price_inr": None,
                "original_price_inr": None,
                "price_display": "View current price at official brand / pharmacy retailer",
                "availability": "Check retailer availability",
                "source_provenance": "Brand official portal (whisper.co.in)",
            }
        ],
    },
    {
        "slug": "nua-complete-comfort-pads",
        "name": "Nua Complete Comfort Sanitary Pads",
        "variant_label": "Customizable XL / XXL Assorted Box (with disposal covers)",
        "brand": "Nua Woman",
        "category": "women_period_care",
        "sub_category": "pads",
        "audience_tags": ["women"],
        "budget_tier": "value_for_money",
        "image_path": "",
        "has_verified_image": False,
        "image_caption": "Inspect exact pack sizing & official box artwork on nuawoman.com.",
        "features": [
            "Soft rash-free top layer with individual sanitary disposal envelopes",
            "Custom pack counts selectable across Regular, XL & XXL sizes",
        ],
        "quality_notes": "Balanced skin comfort and customizable flow ratios.",
        "sort_order": 2,
        "listings": [
            {
                "retailer_slug": "nua_official",
                "destination_url": "https://nuawoman.com",
                "price_inr": None,
                "original_price_inr": None,
                "price_display": "View current price on nuawoman.com",
                "availability": "Check store availability",
                "source_provenance": "Official brand site (nuawoman.com)",
            }
        ],
    },
    {
        "slug": "carmesi-sensitive-plant-pads",
        "name": "Carmesi Sensitive Plant-Based Sanitary Pads",
        "variant_label": "Corn-starch & Bamboo Top-Sheet Pads (10 / 30 Pack)",
        "brand": "Carmesi",
        "category": "women_period_care",
        "sub_category": "pads",
        "audience_tags": ["women"],
        "budget_tier": "value_for_money",
        "image_path": "",
        "has_verified_image": False,
        "image_caption": "Inspect plant-based pad artwork & pack count on mycarmesi.com.",
        "features": [
            "Plant-based soft top sheet suitable for fragrance-sensitive skin",
            "Includes biodegradable individual disposal pouches",
        ],
        "quality_notes": "Practical alternative if conventional plastic-mesh pads feel irritating.",
        "sort_order": 3,
        "listings": [
            {
                "retailer_slug": "carmesi_official",
                "destination_url": "https://mycarmesi.com",
                "price_inr": None,
                "original_price_inr": None,
                "price_display": "View current price on mycarmesi.com",
                "availability": "Check store availability",
                "source_provenance": "Official brand site (mycarmesi.com)",
            }
        ],
    },
    {
        "slug": "peesafe-pantyliners-disposal",
        "name": "Pee Safe Everyday Cotton Pantyliners & Biodegradable Disposal Bags",
        "variant_label": "Breathable Pantyliners / Sealable Disposal Pouches",
        "brand": "Pee Safe",
        "category": "women_period_care",
        "sub_category": "pantyliners",
        "audience_tags": ["women"],
        "budget_tier": "budget_friendly",
        "image_path": "",
        "has_verified_image": False,
        "image_caption": "Inspect exact pack artwork & variants on peesafe.com.",
        "features": [
            "Light absorbent cotton pantyliners for spotting or backup discharge comfort",
            "Sealable opaque sanitary disposal bags for hygienic home/travel waste wrapping",
        ],
        "quality_notes": "Covers everyday light-flow and discreet hygienic disposal needs.",
        "sort_order": 4,
        "listings": [
            {
                "retailer_slug": "peesafe_official",
                "destination_url": "https://www.peesafe.com",
                "price_inr": None,
                "original_price_inr": None,
                "price_display": "View current price on peesafe.com",
                "availability": "Check store availability",
                "source_provenance": "Official brand site (peesafe.com)",
            }
        ],
    },
    {
        "slug": "sirona-reusable-period-underwear",
        "name": "Sirona Reusable Washable Period Underwear",
        "variant_label": "Reusable Leak-Resistant Hipster / Comfort Brief (Size S–XXL)",
        "brand": "Sirona",
        "category": "women_period_care",
        "sub_category": "period_underwear",
        "audience_tags": ["women"],
        "budget_tier": "premium_quality",
        "image_path": "",
        "has_verified_image": False,
        "image_caption": "Check size charts & official garment imagery directly on thesirona.com.",
        "features": [
            "Multi-layer moisture-wicking gusset worn comfortably like regular underwear",
            "Washable in cold water and reusable across multiple menstrual cycles",
        ],
        "quality_notes": "Higher single-unit upfront price that lowers disposable pad usage over months.",
        "sort_order": 5,
        "listings": [
            {
                "retailer_slug": "sirona_official",
                "destination_url": "https://thesirona.com",
                "price_inr": None,
                "original_price_inr": None,
                "price_display": "View current price on thesirona.com",
                "availability": "Check size stock on store",
                "source_provenance": "Official brand site (thesirona.com)",
            }
        ],
    },
    {
        "slug": "sirona-menstrual-cup-edu",
        "name": "Sirona Medical-Grade Silicone Menstrual Cup",
        "variant_label": "Reusable Flexible Cup (Sizes S / M / L) — Educational Choice",
        "brand": "Sirona",
        "category": "women_period_care",
        "sub_category": "menstrual_cups",
        "audience_tags": ["women"],
        "budget_tier": "value_for_money",
        "image_path": "",
        "has_verified_image": False,
        "image_caption": "Inspect cup size guide & official sterilization kit options on thesirona.com.",
        "features": [
            "Medical-grade silicone option holding menstrual fluid inside the vaginal canal (up to 8–12 hrs per manufacturer guidance)",
            "Age-appropriate educational guidance: internal cups are strictly personal choice and never compulsory (pads or period underwear work wonderfully at every age)",
        ],
        "quality_notes": "Follow manufacturer boiling/sterilization directions and wash hands before handling.",
        "sort_order": 6,
        "listings": [
            {
                "retailer_slug": "sirona_official",
                "destination_url": "https://thesirona.com",
                "price_inr": None,
                "original_price_inr": None,
                "price_display": "View current price on thesirona.com",
                "availability": "Check store availability",
                "source_provenance": "Official brand site (thesirona.com)",
            }
        ],
    },
    {
        "slug": "nua-cramp-comfort-heat-patch",
        "name": "Cramp Comfort Air-Activated Heat Patches",
        "variant_label": "Disposable Wearable Warmth Patches (Pack of 3)",
        "brand": "Nua Woman / Carmesi",
        "category": "women_period_care",
        "sub_category": "heating_pads",
        "audience_tags": ["women"],
        "budget_tier": "value_for_money",
        "image_path": "",
        "has_verified_image": False,
        "image_caption": "Inspect manufacturer patch usage instructions directly on brand portals.",
        "features": [
            "Self-heating, cord-free warmth worn discreetly on underwear fabric",
            "Safety guidance: never stick directly onto bare skin or wear while sleeping",
        ],
        "quality_notes": "Non-electric portable warmth comfort option (does not cure medical causes of pelvic pain).",
        "sort_order": 7,
        "listings": [
            {
                "retailer_slug": "nua_official",
                "destination_url": "https://nuawoman.com",
                "price_inr": None,
                "original_price_inr": None,
                "price_display": "View current price on nuawoman.com",
                "availability": "Check store availability",
                "source_provenance": "Official brand site (nuawoman.com)",
            },
            {
                "retailer_slug": "carmesi_official",
                "destination_url": "https://mycarmesi.com",
                "price_inr": None,
                "original_price_inr": None,
                "price_display": "View current price on mycarmesi.com",
                "availability": "Check store availability",
                "source_provenance": "Official brand site (mycarmesi.com)",
            },
        ],
    },
    {
        "slug": "drtrust-electric-hot-water-bag",
        "name": "Dr Trust Rechargeable Warmth Bag & Heating Pad",
        "variant_label": "Reusable Electric Heating Pad / Warm Compression Belt (Models 321 / 346 / 369)",
        "brand": "Dr Trust",
        "category": "women_period_care",
        "sub_category": "heating_pads",
        "audience_tags": ["women", "patients"],
        "budget_tier": "premium_quality",
        "image_path": "",
        "has_verified_image": False,
        "image_caption": "Inspect exact model specs & safety manual directly on drtrust.in.",
        "features": [
            "Reusable electric heat therapy wrap/pad with fabric outer layer",
            "Safety rule: use over light clothing and follow manufacturer auto-shutoff guidance",
        ],
        "quality_notes": "General soothing warmth comfort aid; seek medical review if severe pain persists.",
        "sort_order": 8,
        "listings": [
            {
                "retailer_slug": "drtrust_official",
                "destination_url": "https://drtrust.in",
                "price_inr": None,
                "original_price_inr": None,
                "price_display": "View current price on drtrust.in",
                "availability": "Check store availability",
                "source_provenance": "Official brand site (drtrust.in)",
            }
        ],
    },
    {
        "slug": "milton-thermosteel-500-1000",
        "name": "Milton Thermosteel 304 Stainless Steel Flask",
        "variant_label": "Vacuum-Insulated BPA-Free Bottle (500 mL / 1000 mL)",
        "brand": "Milton",
        "category": "hydration_products",
        "sub_category": "bottles",
        "audience_tags": ["women", "men", "patients"],
        "budget_tier": "value_for_money",
        "image_path": "",
        "has_verified_image": False,
        "image_caption": "Inspect official bottle models & finishes directly on milton.in.",
        "features": [
            "Food-grade 304 stainless steel double-walled vacuum insulation",
            "Suitable for keeping warm herbal water or chilled fluids through workday/class",
        ],
        "quality_notes": "Durable reusable hydration staple without plastic leaching.",
        "sort_order": 9,
        "listings": [
            {
                "retailer_slug": "milton_official",
                "destination_url": "https://www.milton.in",
                "price_inr": None,
                "original_price_inr": None,
                "price_display": "View current price on milton.in",
                "availability": "Check store availability",
                "source_provenance": "Official brand site (milton.in)",
            }
        ],
    },
    {
        "slug": "decathlon-domyos-mat-bands",
        "name": "Decathlon Domyos / Kimjaly Yoga Mat & Resistance Bands",
        "variant_label": "Cushioned Floor Mat (4mm–8mm) & Elastic Resistance Loops",
        "brand": "Decathlon (Domyos / Kimjaly)",
        "category": "fitness_accessories",
        "sub_category": "mats_bands",
        "audience_tags": ["women", "men"],
        "budget_tier": "budget_friendly",
        "image_path": "",
        "has_verified_image": False,
        "image_caption": "View exact mat thickness and resistance levels on decathlon.in.",
        "features": [
            "Supports restorative yoga poses, gentle stretching, and beginner floor mobility",
            "Lightweight portable home resistance bands across light, medium & heavy tension",
        ],
        "quality_notes": "Reliable entry-to-intermediate training accessories from standardized catalog.",
        "sort_order": 10,
        "listings": [
            {
                "retailer_slug": "decathlon_in",
                "destination_url": "https://www.decathlon.in",
                "price_inr": None,
                "original_price_inr": None,
                "price_display": "View current price on decathlon.in",
                "availability": "Check city store / delivery on decathlon.in",
                "source_provenance": "Official Decathlon India store (decathlon.in)",
            }
        ],
    },
    {
        "slug": "philips-avent-classic-bottle",
        "name": "Philips Avent Classic+ Anti-Colic Feeding Bottle",
        "variant_label": "BPA-Free Newborn / Slow-Flow Feeding Bottle (125 mL / 260 mL)",
        "brand": "Philips Avent",
        "category": "baby_care",
        "sub_category": "feeding",
        "audience_tags": ["babies"],
        "budget_tier": "premium_quality",
        "image_path": "",
        "has_verified_image": False,
        "image_caption": "Inspect exact teat flow rate & bottle packaging on philips.co.in.",
        "features": [
            "Integrated Airflex venting valve designed for comfortable infant feeding",
            "Available in multiple age-staged teat flow sizes",
        ],
        "quality_notes": "Follow pediatric boiling/sterilization and milk temperature checks carefully.",
        "sort_order": 11,
        "listings": [
            {
                "retailer_slug": "philips_in",
                "destination_url": "https://www.philips.co.in",
                "price_inr": None,
                "original_price_inr": None,
                "price_display": "View current price at philips.co.in / authorized retailers",
                "availability": "Check retailer availability",
                "source_provenance": "Official manufacturer portal (philips.co.in)",
            }
        ],
    },
    {
        "slug": "omron-hem-7120-bp-monitor",
        "name": "Omron HEM-7120 Automatic Blood Pressure Monitor",
        "variant_label": "Upper-Arm Digital Intellisense Monitor (Model HEM-7120-IN)",
        "brand": "Omron Healthcare",
        "category": "patient_care",
        "sub_category": "monitoring",
        "audience_tags": ["patients", "women", "men"],
        "budget_tier": "value_for_money",
        "image_path": "",
        "has_verified_image": False,
        "image_caption": "Inspect technical specifications and cuff size details on omronhealthcare-ap.com.",
        "features": [
            "Upper-arm automated Intellisense measurement with movement indicator",
            "Home vitals monitoring support to share cleanly with your physician",
        ],
        "quality_notes": "For supportive home readings only; medical interpretation requires a licensed doctor.",
        "sort_order": 12,
        "listings": [
            {
                "retailer_slug": "omron_in",
                "destination_url": "https://www.omronhealthcare-ap.com",
                "price_inr": None,
                "original_price_inr": None,
                "price_display": "View current price at authorized pharmacies",
                "availability": "Check pharmacy availability",
                "source_provenance": "Official manufacturer portal (omronhealthcare-ap.com)",
            }
        ],
    },
]

SEED_PROVIDERS = [
    {
        "slug": "nmc-imr-register",
        "provider_type": "doctor_directory",
        "name": "National Medical Commission — Indian Medical Register (IMR)",
        "qualifications": "Official Statutory Registry for MBBS / MD / MS / Ob-Gyn Practitioners",
        "registration_details": "Verified statutory registry portal (nmc.org.in)",
        "specialization": "Doctor License Verification & Ob-Gyn / Physician Credential Check",
        "hospital_or_organization": "National Medical Commission (India)",
        "location": "All States & UTs, India",
        "consultation_mode": "Official Verification Registry",
        "availability": "24/7 Public Registry Search",
        "consultation_fees_note": "Free credential verification lookup; clinic/hospital consultation fees vary by provider.",
        "verification_source": "Official Statutory Portal (nmc.org.in)",
        "official_url": "https://nmc.org.in/",
        "booking_status": "external_official_portal",
        "is_sponsored": False,
    },
    {
        "slug": "esanjeevani-mohfw-telemedicine",
        "provider_type": "telemedicine",
        "name": "eSanjeevani National Telemedicine Service (MoHFW)",
        "qualifications": "Government of India Ministry of Health & Family Welfare Portal",
        "registration_details": "Official Govt Teleconsultation Network",
        "specialization": "General Practice, Maternal & Women's Wellness Teleconsultation",
        "hospital_or_organization": "Ministry of Health & Family Welfare (MoHFW)",
        "location": "Pan-India Online",
        "consultation_mode": "Online Teleconsultation",
        "availability": "Official MoHFW OPD hours",
        "consultation_fees_note": "Free public telemedicine consultation service (no payment collected by NutriSense AI).",
        "verification_source": "Official MoHFW Platform (esanjeevani.mohfw.gov.in)",
        "official_url": "https://esanjeevani.mohfw.gov.in/",
        "booking_status": "external_official_portal",
        "is_sponsored": False,
    },
    {
        "slug": "cult-fit-centres-official",
        "provider_type": "fitness_platform",
        "name": "Cult.fit Official Studios & Group Classes Directory",
        "qualifications": "Official Wellness & Group Fitness Network",
        "registration_details": "Official centre finder on cult.fit",
        "specialization": "Yoga, Strength Conditioning & Beginner Group Workouts",
        "hospital_or_organization": "Cult.fit India",
        "location": "Major Indian Metro Cities",
        "consultation_mode": "In-Centre & Live Digital",
        "availability": "Check live centre schedule directly on cult.fit",
        "consultation_fees_note": "Membership details managed directly on cult.fit (direct partner bookings Coming Soon).",
        "verification_source": "Official Platform Domain (cult.fit)",
        "official_url": "https://www.cult.fit/",
        "booking_status": "external_official_portal",
        "is_sponsored": False,
    },
    {
        "slug": "partner-gynecology-clinician-onboarding",
        "provider_type": "gynecology_hospital",
        "name": "Direct Registered Gynecologist & Clinical Dietitian Onboarding",
        "qualifications": "Requires direct NMC registration & signed clinical agreement",
        "registration_details": "Onboarding in progress — zero unverified individual doctor profiles shown",
        "specialization": "Obstetrics, Gynecology & Clinical Dietetics",
        "hospital_or_organization": "Partner Clinic Integration",
        "location": "Coming Soon across partner clinics",
        "consultation_mode": "Online Video & In-Clinic (Coming Soon)",
        "availability": "Coming Soon",
        "consultation_fees_note": "Consultation-only, follow-up, and provider-directed treatment fees remain separate and between patient and provider.",
        "verification_source": "Direct NMC Verification Required Before Listing",
        "official_url": "https://nmc.org.in/",
        "booking_status": "coming_soon",
        "is_sponsored": False,
    },
]

SEED_LABS = [
    {
        "slug": "dr-lal-pathlabs-official",
        "name": "Dr. Lal PathLabs",
        "available_tests_note": "Blood counts, iron/ferritin, thyroid, HbA1c & vitamin panels (select tests under physician guidance only)",
        "location": "Pan-India Collection Centres & Official Portal Home Visit Check",
        "accreditation_note": "Verify NABL accreditation per laboratory centre directly on lalpathlabs.com",
        "pricing_note": "View confirmed city pricing on the official lab portal",
        "official_booking_url": "https://www.lalpathlabs.com/book-a-test",
        "booking_integration_status": "external_official_portal",
        "is_sponsored": False,
    },
    {
        "slug": "apollo-diagnostics-official",
        "name": "Apollo Diagnostics",
        "available_tests_note": "Pathology & preventive women's blood work (medical suitability decided by your doctor)",
        "location": "Pan-India Centres — verify local availability on apollodiagnostics.in",
        "accreditation_note": "Verify lab-level accreditation directly on apollodiagnostics.in",
        "pricing_note": "View official walk-in & portal test pricing directly",
        "official_booking_url": "https://apollodiagnostics.in/book-walk-in",
        "booking_integration_status": "external_official_portal",
        "is_sponsored": False,
    },
    {
        "slug": "metropolis-healthcare-official",
        "name": "Metropolis Healthcare",
        "available_tests_note": "Clinical pathology panels per licensed doctor prescription",
        "location": "Multi-City Centres across India — verify on metropolisindia.com",
        "accreditation_note": "Verify NABL/CAP hub accreditation directly on metropolisindia.com",
        "pricing_note": "View official city test pricing directly on metropolisindia.com",
        "official_booking_url": "https://www.metropolisindia.com/",
        "booking_integration_status": "external_official_portal",
        "is_sponsored": False,
    },
]

SEED_SUBSCRIPTION_PLANS = [
    {
        "slug": "womens-wellness-companion-plus",
        "name": "Women's Wellness Companion Plus",
        "tagline": "Advanced personalized nutrition plans, trainer & doctor coordination (Coming Soon)",
        "features": [
            "Custom dietitian & personalized workout cadence planning (Free education & core tracking remain free forever)",
            "Verified gynecologist consultation & follow-up scheduling once partner agreements are live",
            "Structured printable/JSON wellness & cycle reports for doctor appointments",
        ],
        "status": "coming_soon",
        "billing_active": False,
    },
    {
        "slug": "family-multi-profile-care",
        "name": "NutriSense Family Care Plan",
        "tagline": "Coordinated family nutrition across Women, Men, Baby & Patient profiles (Coming Soon)",
        "features": [
            "Diagnostic lab partner coordination & verified gym membership perks (when contracted)",
            "Priority ESP32 / HX711 hardware kitchen scale sync support",
            "Transparent service categories with zero hidden charges or paywalls on emergency guidance",
        ],
        "status": "coming_soon",
        "billing_active": False,
    },
]

SEED_PREMIUM_SERVICES = [
    {"id": "personalized_nutrition", "title": "Personalized Registered Dietitian Plans", "status": "coming_soon"},
    {"id": "advanced_meal_plans", "title": "Custom Multi-Week Indian & Allergy-Safe Meal Plans", "status": "coming_soon"},
    {"id": "personal_trainers", "title": "1-on-1 Certified Personal Trainer Sessions", "status": "coming_soon"},
    {"id": "gym_partnerships", "title": "Partner Gym & Yoga Studio Access", "status": "coming_soon"},
    {"id": "gynecologist_consults", "title": "Verified Gynecologist Online & In-Clinic Consultations", "status": "coming_soon"},
    {"id": "follow_up_care", "title": "Follow-Up Consultations & Provider-Directed Treatment Care", "status": "coming_soon"},
    {"id": "lab_booking_support", "title": "Diagnostic Lab Booking Coordination", "status": "coming_soon"},
]


# ---------------------------------------------------------------------------
# Module Registration & SQLAlchemy Models
# ---------------------------------------------------------------------------


def register_wellness_and_catalog(
    app: FastAPI,
    Base: type[DeclarativeBase],
    get_db: Callable[..., Any],
    platform: dict[str, Any],
    SessionLocal: Any,
) -> None:
    """Register Women's Wellness, Consent, BMI History, Product Catalog, and Directory routes."""
    global _SYNC_CATALOG_HOOK

    get_current_user = platform["get_current_user"]
    get_optional_user = platform["get_optional_user"]
    require_owned_profile = platform["require_owned_profile"]
    ProfileFoodEntry = platform["ProfileFoodEntry"]

    class WomensWellnessPreference(Base):
        __tablename__ = "womens_wellness_preferences"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        user_id: Mapped[int] = mapped_column(
            ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
        )
        profile_id: Mapped[int] = mapped_column(
            ForeignKey("user_profiles.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
            index=True,
        )
        consent_given: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
        consent_updated_at: Mapped[datetime | None] = mapped_column(
            DateTime(timezone=True), nullable=True
        )
        tracking_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
        reminders_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
        reminder_days_before: Mapped[int | None] = mapped_column(Integer, nullable=True, default=2)
        typical_cycle_length: Mapped[int] = mapped_column(Integer, nullable=False, default=28)
        typical_period_days: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
        age_band: Mapped[str | None] = mapped_column(String(32), nullable=True)
        height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
        weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
        bmi_consent_given: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
        dietary_preferences_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
        activity_preferences_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
        optional_goals_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
        created_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )
        updated_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )

    class WomensConsentEvent(Base):
        __tablename__ = "womens_consent_events"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        user_id: Mapped[int] = mapped_column(
            ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
        )
        profile_id: Mapped[int] = mapped_column(
            ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True
        )
        consent_type: Mapped[str] = mapped_column(String(48), nullable=False, index=True)
        consent_status: Mapped[str] = mapped_column(String(24), nullable=False, default="granted")
        consent_version: Mapped[str] = mapped_column(String(32), nullable=False, default="v1.0")
        consented_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )
        withdrawn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    class WomensBmiRecord(Base):
        __tablename__ = "womens_bmi_history"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        user_id: Mapped[int] = mapped_column(
            ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
        )
        profile_id: Mapped[int] = mapped_column(
            ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True
        )
        bmi_value: Mapped[float] = mapped_column(Float, nullable=False)
        assessment_mode: Mapped[str] = mapped_column(String(40), nullable=False)
        percentile: Mapped[float | None] = mapped_column(Float, nullable=True)
        height_cm_used: Mapped[float] = mapped_column(Float, nullable=False)
        weight_kg_used: Mapped[float] = mapped_column(Float, nullable=False)
        age_years_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
        consent_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
        calculated_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
        )

    class MenstrualPeriodRecord(Base):
        __tablename__ = "menstrual_period_records"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        user_id: Mapped[int] = mapped_column(
            ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
        )
        profile_id: Mapped[int] = mapped_column(
            ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True
        )
        start_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
        end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
        flow_level: Mapped[str | None] = mapped_column(String(32), nullable=True)
        notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
        created_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )
        updated_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )

    class CycleSymptomMoodRecord(Base):
        __tablename__ = "cycle_symptom_mood_records"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        user_id: Mapped[int] = mapped_column(
            ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
        )
        profile_id: Mapped[int] = mapped_column(
            ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True
        )
        period_record_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
        record_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
        symptoms_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
        symptom_severity: Mapped[str | None] = mapped_column(String(32), nullable=True)
        cramps_level: Mapped[str | None] = mapped_column(String(32), nullable=True)
        energy_level: Mapped[str | None] = mapped_column(String(32), nullable=True)
        symptom_other_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
        mood: Mapped[str | None] = mapped_column(String(32), nullable=True)
        mood_other_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
        notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
        created_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )

    class Retailer(Base):
        __tablename__ = "retailers"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
        name: Mapped[str] = mapped_column(String(120), nullable=False)
        domain: Mapped[str] = mapped_column(String(120), nullable=False)
        affiliate_program_configured: Mapped[bool] = mapped_column(
            Boolean, nullable=False, default=False
        )
        default_disclosure: Mapped[str] = mapped_column(String(255), nullable=False)
        created_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )

    class ProductCatalogItem(Base):
        __tablename__ = "product_catalog_items"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
        name: Mapped[str] = mapped_column(String(255), nullable=False)
        variant_label: Mapped[str | None] = mapped_column(String(160), nullable=True)
        brand: Mapped[str] = mapped_column(String(120), nullable=False)
        category: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
        sub_category: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
        audience_tags_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
        budget_tier: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
        image_path: Mapped[str] = mapped_column(String(255), nullable=False, default="")
        has_verified_image: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
        image_caption: Mapped[str] = mapped_column(String(255), nullable=False)
        features_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
        quality_notes: Mapped[str] = mapped_column(Text, nullable=False)
        sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
        created_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )

    class ProductRetailerListing(Base):
        __tablename__ = "product_retailer_listings"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        product_id: Mapped[int] = mapped_column(
            ForeignKey("product_catalog_items.id", ondelete="CASCADE"), nullable=False, index=True
        )
        retailer_id: Mapped[int] = mapped_column(
            ForeignKey("retailers.id", ondelete="CASCADE"), nullable=False, index=True
        )
        destination_url: Mapped[str] = mapped_column(String(500), nullable=False)
        is_affiliate: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
        affiliate_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
        link_type: Mapped[str] = mapped_column(String(32), nullable=False, default="brand_official")
        price_inr: Mapped[float | None] = mapped_column(Float, nullable=True)
        original_price_inr: Mapped[float | None] = mapped_column(Float, nullable=True)
        price_display: Mapped[str] = mapped_column(String(160), nullable=False)
        live_price_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
        availability: Mapped[str] = mapped_column(String(120), nullable=False)
        last_checked_at: Mapped[date] = mapped_column(Date, nullable=False)
        source_provenance: Mapped[str | None] = mapped_column(String(180), nullable=True)
        disclosure_text: Mapped[str] = mapped_column(String(255), nullable=False)
        is_sponsored: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    class AffiliateClickEvent(Base):
        __tablename__ = "affiliate_click_events"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        listing_id: Mapped[int] = mapped_column(
            ForeignKey("product_retailer_listings.id", ondelete="CASCADE"), nullable=False, index=True
        )
        product_id: Mapped[int] = mapped_column(
            ForeignKey("product_catalog_items.id", ondelete="CASCADE"), nullable=False, index=True
        )
        user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
        referrer_section: Mapped[str | None] = mapped_column(String(80), nullable=True)
        is_affiliate_click: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
        attribution_token: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
        commission_status: Mapped[str] = mapped_column(
            String(48), nullable=False, default="not_applicable_non_affiliate"
        )
        clicked_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )

    class HealthcareProviderRecord(Base):
        __tablename__ = "healthcare_providers"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
        provider_type: Mapped[str] = mapped_column(String(48), nullable=False, index=True)
        name: Mapped[str] = mapped_column(String(255), nullable=False)
        qualifications: Mapped[str] = mapped_column(String(255), nullable=False)
        registration_details: Mapped[str] = mapped_column(String(255), nullable=False)
        specialization: Mapped[str] = mapped_column(String(255), nullable=False)
        hospital_or_organization: Mapped[str] = mapped_column(String(255), nullable=False)
        location: Mapped[str] = mapped_column(String(160), nullable=False)
        consultation_mode: Mapped[str] = mapped_column(String(80), nullable=False)
        availability: Mapped[str] = mapped_column(String(160), nullable=False)
        consultation_fees_note: Mapped[str] = mapped_column(String(255), nullable=False)
        verification_source: Mapped[str] = mapped_column(String(255), nullable=False)
        official_url: Mapped[str] = mapped_column(String(500), nullable=False)
        booking_status: Mapped[str] = mapped_column(String(48), nullable=False)
        is_sponsored: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    class DiagnosticLabRecord(Base):
        __tablename__ = "diagnostic_labs"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
        name: Mapped[str] = mapped_column(String(255), nullable=False)
        available_tests_note: Mapped[str] = mapped_column(Text, nullable=False)
        location: Mapped[str] = mapped_column(String(160), nullable=False)
        accreditation_note: Mapped[str] = mapped_column(String(255), nullable=False)
        pricing_note: Mapped[str] = mapped_column(String(255), nullable=False)
        official_booking_url: Mapped[str] = mapped_column(String(500), nullable=False)
        booking_integration_status: Mapped[str] = mapped_column(String(48), nullable=False)
        is_sponsored: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    class AppointmentRecord(Base):
        __tablename__ = "appointment_records"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        user_id: Mapped[int] = mapped_column(
            ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
        )
        profile_id: Mapped[int] = mapped_column(
            ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True
        )
        provider_slug: Mapped[str | None] = mapped_column(String(120), nullable=True)
        lab_slug: Mapped[str | None] = mapped_column(String(120), nullable=True)
        preferred_date: Mapped[date | None] = mapped_column(Date, nullable=True)
        booking_status: Mapped[str] = mapped_column(
            String(48), nullable=False, default="coming_soon_preview_saved"
        )
        notes: Mapped[str | None] = mapped_column(String(400), nullable=True)
        created_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )

    class SubscriptionPlanRecord(Base):
        __tablename__ = "subscription_plans"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
        name: Mapped[str] = mapped_column(String(200), nullable=False)
        tagline: Mapped[str] = mapped_column(String(255), nullable=False)
        features_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
        status: Mapped[str] = mapped_column(String(48), nullable=False, default="coming_soon")
        billing_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    def _upsert_seed_catalog(db: Session, force: bool = False) -> None:
        """Idempotently ensure retailers, products, providers, labs & plans stay current without losing click FK."""
        global _SEED_CATALOG_SYNCED
        if not force and _SEED_CATALOG_SYNCED:
            return
        retailer_by_slug: dict[str, Retailer] = {}
        for r in SEED_RETAILERS:
            existing_ret = db.scalar(select(Retailer).where(Retailer.slug == r["slug"]))
            if existing_ret:
                existing_ret.name = r["name"]
                existing_ret.domain = r["domain"]
                existing_ret.default_disclosure = r["default_disclosure"]
                retailer_by_slug[r["slug"]] = existing_ret
            else:
                row = Retailer(**r)
                db.add(row)
                db.flush()
                retailer_by_slug[r["slug"]] = row

        for p in SEED_PRODUCTS:
            item = db.scalar(select(ProductCatalogItem).where(ProductCatalogItem.slug == p["slug"]))
            if item:
                item.name = p["name"]
                item.variant_label = p.get("variant_label")
                item.brand = p["brand"]
                item.category = p["category"]
                item.sub_category = p.get("sub_category")
                item.audience_tags_json = json.dumps(p["audience_tags"])
                item.budget_tier = p["budget_tier"]
                item.image_path = p["image_path"]
                item.has_verified_image = p.get("has_verified_image", False)
                item.image_caption = p["image_caption"]
                item.features_json = json.dumps(p["features"])
                item.quality_notes = p["quality_notes"]
                item.sort_order = p["sort_order"]
            else:
                item = ProductCatalogItem(
                    slug=p["slug"],
                    name=p["name"],
                    variant_label=p.get("variant_label"),
                    brand=p["brand"],
                    category=p["category"],
                    sub_category=p.get("sub_category"),
                    audience_tags_json=json.dumps(p["audience_tags"]),
                    budget_tier=p["budget_tier"],
                    image_path=p["image_path"],
                    has_verified_image=p.get("has_verified_image", False),
                    image_caption=p["image_caption"],
                    features_json=json.dumps(p["features"]),
                    quality_notes=p["quality_notes"],
                    sort_order=p["sort_order"],
                )
                db.add(item)
                db.flush()

            for lst in p["listings"]:
                ret = retailer_by_slug[lst["retailer_slug"]]
                existing_lst = db.scalar(
                    select(ProductRetailerListing).where(
                        ProductRetailerListing.product_id == item.id,
                        ProductRetailerListing.retailer_id == ret.id,
                    )
                )
                if existing_lst:
                    existing_lst.destination_url = lst["destination_url"]
                    existing_lst.price_inr = lst.get("price_inr")
                    existing_lst.original_price_inr = lst.get("original_price_inr")
                    existing_lst.price_display = lst["price_display"]
                    existing_lst.availability = lst["availability"]
                    existing_lst.last_checked_at = VERIFIED_CHECK_DATE
                    existing_lst.source_provenance = lst.get("source_provenance")
                    existing_lst.disclosure_text = (
                        "Affiliate (NutriSense AI may earn commission)"
                        if existing_lst.is_affiliate
                        else "Direct retailer link (non-affiliate reference)"
                    )
                else:
                    db.add(
                        ProductRetailerListing(
                            product_id=item.id,
                            retailer_id=ret.id,
                            destination_url=lst["destination_url"],
                            is_affiliate=False,
                            affiliate_url=None,
                            link_type="brand_official",
                            price_inr=lst.get("price_inr"),
                            original_price_inr=lst.get("original_price_inr"),
                            price_display=lst["price_display"],
                            live_price_verified=False,
                            availability=lst["availability"],
                            last_checked_at=VERIFIED_CHECK_DATE,
                            source_provenance=lst.get("source_provenance"),
                            disclosure_text="Direct retailer link (non-affiliate reference)",
                            is_sponsored=False,
                        )
                    )

        for prov in SEED_PROVIDERS:
            if not db.scalar(select(HealthcareProviderRecord).where(HealthcareProviderRecord.slug == prov["slug"])):
                db.add(HealthcareProviderRecord(**prov))

        for lab in SEED_LABS:
            if not db.scalar(select(DiagnosticLabRecord).where(DiagnosticLabRecord.slug == lab["slug"])):
                db.add(DiagnosticLabRecord(**lab))

        for plan in SEED_SUBSCRIPTION_PLANS:
            if not db.scalar(select(SubscriptionPlanRecord).where(SubscriptionPlanRecord.slug == plan["slug"])):
                db.add(
                    SubscriptionPlanRecord(
                        slug=plan["slug"],
                        name=plan["name"],
                        tagline=plan["tagline"],
                        features_json=json.dumps(plan["features"]),
                        status=plan["status"],
                        billing_active=plan["billing_active"],
                    )
                )
        db.commit()
        _SEED_CATALOG_SYNCED = True

    _SYNC_CATALOG_HOOK = _upsert_seed_catalog

    def _ensure_tables_and_seed() -> None:
        engine = SessionLocal.kw.get("bind")
        if engine is not None:
            Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            _upsert_seed_catalog(db)

    def _get_or_create_pref(db: Session, user_id: int, profile_id: int) -> WomensWellnessPreference:
        pref = db.scalar(
            select(WomensWellnessPreference).where(
                WomensWellnessPreference.user_id == user_id,
                WomensWellnessPreference.profile_id == profile_id,
            )
        )
        if not pref:
            pref = WomensWellnessPreference(user_id=user_id, profile_id=profile_id)
            db.add(pref)
            db.commit()
            db.refresh(pref)
        return pref

    def _serialize_pref(pref: WomensWellnessPreference) -> WomensPreferencesOut:
        return WomensPreferencesOut(
            profile_id=pref.profile_id,
            consent_given=pref.consent_given,
            consent_updated_at=pref.consent_updated_at,
            tracking_enabled=pref.tracking_enabled,
            reminders_enabled=pref.reminders_enabled,
            reminder_days_before=pref.reminder_days_before,
            typical_cycle_length=pref.typical_cycle_length,
            typical_period_days=pref.typical_period_days,
            age_band=pref.age_band,
            height_cm=pref.height_cm,
            weight_kg=pref.weight_kg,
            bmi_consent_given=pref.bmi_consent_given,
            dietary_preferences=[str(x) for x in _parse_json_list(pref.dietary_preferences_json)],
            activity_preferences=[str(x) for x in _parse_json_list(pref.activity_preferences_json)],
            optional_goals=[str(x) for x in _parse_json_list(pref.optional_goals_json)],
            created_at=pref.created_at,
            updated_at=pref.updated_at,
        )

    def _serialize_consent(row: WomensConsentEvent) -> ConsentEventOut:
        return ConsentEventOut(
            id=row.id,
            profile_id=row.profile_id,
            consent_type=row.consent_type,
            consent_status=row.consent_status,
            consent_version=row.consent_version,
            consented_at=row.consented_at,
            withdrawn_at=row.withdrawn_at,
        )

    def _serialize_bmi(row: WomensBmiRecord, profile_age: int | None) -> BmiHistoryOut:
        comp = _compute_bmi_server(row.height_cm_used, row.weight_kg_used, row.age_years_used or profile_age)
        return BmiHistoryOut(
            id=row.id,
            profile_id=row.profile_id,
            bmi_value=row.bmi_value,
            assessment_mode=row.assessment_mode,
            percentile=row.percentile,
            height_cm_used=row.height_cm_used,
            weight_kg_used=row.weight_kg_used,
            age_years_used=row.age_years_used,
            consent_confirmed=row.consent_confirmed,
            headline=comp["headline"],
            context_note=comp["context_note"],
            calculated_at=row.calculated_at,
        )

    def _serialize_period(row: MenstrualPeriodRecord) -> PeriodRecordOut:
        return PeriodRecordOut(
            id=row.id,
            profile_id=row.profile_id,
            start_date=row.start_date,
            end_date=row.end_date,
            flow_level=row.flow_level,
            notes=row.notes,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def _serialize_symptom(row: CycleSymptomMoodRecord) -> SymptomMoodOut:
        return SymptomMoodOut(
            id=row.id,
            profile_id=row.profile_id,
            period_record_id=row.period_record_id,
            record_date=row.record_date,
            symptoms=[str(x) for x in _parse_json_list(row.symptoms_json)],
            symptom_severity=row.symptom_severity,
            cramps_level=row.cramps_level,
            energy_level=row.energy_level,
            symptom_other_text=row.symptom_other_text,
            mood=row.mood,
            mood_other_text=row.mood_other_text,
            notes=row.notes,
            created_at=row.created_at,
        )

    def _compute_cycle_estimate(
        pref: WomensWellnessPreference,
        periods: list[MenstrualPeriodRecord],
    ) -> CycleEstimateOut:
        if not pref.tracking_enabled or not periods:
            return CycleEstimateOut(
                has_estimate=False,
                next_period_estimated_start=None,
                average_cycle_days=pref.typical_cycle_length,
                disclaimer="Predicted cycle dates are general estimates only, not medical guarantees.",
            )

        sorted_desc = sorted(periods, key=lambda r: r.start_date, reverse=True)
        diffs: list[int] = []
        for idx in range(len(sorted_desc) - 1):
            delta = (sorted_desc[idx].start_date - sorted_desc[idx + 1].start_date).days
            if 18 <= delta <= 60:
                diffs.append(delta)

        avg_days = round(sum(diffs) / len(diffs)) if diffs else pref.typical_cycle_length
        estimated_next = sorted_desc[0].start_date + timedelta(days=avg_days)
        return CycleEstimateOut(
            has_estimate=True,
            next_period_estimated_start=estimated_next,
            average_cycle_days=avg_days,
            disclaimer=(
                f"Estimate based on logged cycle starts (~{avg_days} days); cycles vary naturally "
                "and predictions are never guaranteed dates."
            ),
        )

    def _record_consent_event(
        db: Session,
        user_id: int,
        profile_id: int,
        consent_type: str,
        granted: bool,
        version: str = "v1.0",
    ) -> WomensConsentEvent:
        now = _utc_now()
        ev = WomensConsentEvent(
            user_id=user_id,
            profile_id=profile_id,
            consent_type=consent_type,
            consent_status="granted" if granted else "withdrawn",
            consent_version=version,
            consented_at=now,
            withdrawn_at=None if granted else now,
        )
        db.add(ev)
        return ev

    # -----------------------------------------------------------------------
    # Women's Wellness Router (Strictly Protected + Rate Limited + Ownership Checked)
    # -----------------------------------------------------------------------
    women_router = APIRouter(prefix="/api/women", tags=["Women's Wellness"])

    @women_router.get("/summary", response_model=WomensSummaryOut)
    def get_womens_summary(
        request: Request,
        profile_id: int = Query(..., ge=1),
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> WomensSummaryOut:
        enforce_rate_limit(request, "women_read", max_requests=90)
        profile = require_owned_profile(db, current_user.id, profile_id)
        pref = _get_or_create_pref(db, current_user.id, profile_id)
        periods = list(
            db.scalars(
                select(MenstrualPeriodRecord)
                .where(
                    MenstrualPeriodRecord.user_id == current_user.id,
                    MenstrualPeriodRecord.profile_id == profile_id,
                )
                .order_by(MenstrualPeriodRecord.start_date.desc(), MenstrualPeriodRecord.id.desc())
            ).all()
        )
        symptoms = list(
            db.scalars(
                select(CycleSymptomMoodRecord)
                .where(
                    CycleSymptomMoodRecord.user_id == current_user.id,
                    CycleSymptomMoodRecord.profile_id == profile_id,
                )
                .order_by(CycleSymptomMoodRecord.record_date.desc(), CycleSymptomMoodRecord.id.desc())
            ).all()
        )
        consents = list(
            db.scalars(
                select(WomensConsentEvent)
                .where(
                    WomensConsentEvent.user_id == current_user.id,
                    WomensConsentEvent.profile_id == profile_id,
                )
                .order_by(WomensConsentEvent.consented_at.desc(), WomensConsentEvent.id.desc())
                .limit(20)
            ).all()
        )
        bmi_rows = list(
            db.scalars(
                select(WomensBmiRecord)
                .where(
                    WomensBmiRecord.user_id == current_user.id,
                    WomensBmiRecord.profile_id == profile_id,
                )
                .order_by(WomensBmiRecord.calculated_at.desc(), WomensBmiRecord.id.desc())
                .limit(15)
            ).all()
        )
        return WomensSummaryOut(
            preferences=_serialize_pref(pref),
            period_records=[_serialize_period(p) for p in periods],
            symptom_records=[_serialize_symptom(s) for s in symptoms],
            consents=[_serialize_consent(c) for c in consents],
            bmi_history=[_serialize_bmi(b, profile.age_years) for b in bmi_rows],
            estimate=_compute_cycle_estimate(pref, periods),
        )

    @women_router.get("/profile", response_model=WomensPreferencesOut)
    def get_women_profile_alias(
        request: Request,
        profile_id: int = Query(..., ge=1),
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> WomensPreferencesOut:
        enforce_rate_limit(request, "women_read", max_requests=90)
        require_owned_profile(db, current_user.id, profile_id)
        return _serialize_pref(_get_or_create_pref(db, current_user.id, profile_id))

    @women_router.put("/preferences", response_model=WomensPreferencesOut)
    @women_router.put("/profile", response_model=WomensPreferencesOut)
    def update_womens_preferences(
        request: Request,
        payload: WomensPreferencesUpdateRequest,
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> WomensPreferencesOut:
        enforce_rate_limit(request, "women_write", max_requests=60)
        require_owned_profile(db, current_user.id, payload.profile_id)
        pref = _get_or_create_pref(db, current_user.id, payload.profile_id)
        data = payload.model_dump(exclude_unset=True)

        if data.pop("clear_bmi_metrics", False):
            pref.height_cm = None
            pref.weight_kg = None
            pref.bmi_consent_given = False
            _record_consent_event(db, current_user.id, payload.profile_id, "bmi_screening", False)

        if "consent_given" in data and data["consent_given"] is not None:
            cg = bool(data.pop("consent_given"))
            pref.consent_given = cg
            pref.consent_updated_at = _utc_now()
            _record_consent_event(db, current_user.id, payload.profile_id, "wellness_profile", cg)

        if "bmi_consent_given" in data and data["bmi_consent_given"] is not None:
            bc = bool(data["bmi_consent_given"])
            _record_consent_event(db, current_user.id, payload.profile_id, "bmi_screening", bc)

        if "tracking_enabled" in data and data["tracking_enabled"] is not None:
            _record_consent_event(
                db, current_user.id, payload.profile_id, "period_tracking", bool(data["tracking_enabled"])
            )

        if "optional_goals" in data:
            goals = [str(g).strip()[:80] for g in (data.pop("optional_goals") or []) if str(g).strip()]
            pref.optional_goals_json = json.dumps(goals[:12])
        if "dietary_preferences" in data:
            dp = [str(g).strip()[:64] for g in (data.pop("dietary_preferences") or []) if str(g).strip()]
            pref.dietary_preferences_json = json.dumps(dp[:10])
        if "activity_preferences" in data:
            ap = [str(g).strip()[:64] for g in (data.pop("activity_preferences") or []) if str(g).strip()]
            pref.activity_preferences_json = json.dumps(ap[:10])

        data.pop("profile_id", None)
        for key, value in data.items():
            if hasattr(pref, key):
                setattr(pref, key, value)
        pref.updated_at = _utc_now()

        db.commit()
        db.refresh(pref)
        return _serialize_pref(pref)

    # Consent Management Routes
    @women_router.get("/consents", response_model=list[ConsentEventOut])
    def list_consents(
        profile_id: int = Query(..., ge=1),
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> list[ConsentEventOut]:
        require_owned_profile(db, current_user.id, profile_id)
        rows = list(
            db.scalars(
                select(WomensConsentEvent)
                .where(
                    WomensConsentEvent.user_id == current_user.id,
                    WomensConsentEvent.profile_id == profile_id,
                )
                .order_by(WomensConsentEvent.consented_at.desc(), WomensConsentEvent.id.desc())
            ).all()
        )
        return [_serialize_consent(r) for r in rows]

    @women_router.post(
        "/consents",
        response_model=ConsentEventOut,
        status_code=status.HTTP_201_CREATED,
    )
    def record_consent(
        request: Request,
        payload: ConsentCreateRequest,
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> ConsentEventOut:
        enforce_rate_limit(request, "women_write", max_requests=60)
        require_owned_profile(db, current_user.id, payload.profile_id)
        pref = _get_or_create_pref(db, current_user.id, payload.profile_id)
        granted = payload.consent_status == "granted"
        if payload.consent_type == "wellness_profile":
            pref.consent_given = granted
            pref.consent_updated_at = _utc_now()
        elif payload.consent_type == "bmi_screening":
            pref.bmi_consent_given = granted
        elif payload.consent_type == "period_tracking":
            pref.tracking_enabled = granted
        elif payload.consent_type == "reminders":
            pref.reminders_enabled = granted
        ev = _record_consent_event(
            db, current_user.id, payload.profile_id, payload.consent_type, granted, payload.consent_version
        )
        db.commit()
        db.refresh(ev)
        return _serialize_consent(ev)

    @women_router.delete("/consents/{consent_id}")
    def withdraw_consent(
        consent_id: int,
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> dict[str, bool]:
        row = db.get(WomensConsentEvent, consent_id)
        if not row or row.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consent record not found.")
        pref = _get_or_create_pref(db, current_user.id, row.profile_id)
        if row.consent_type == "bmi_screening":
            pref.bmi_consent_given = False
        elif row.consent_type == "period_tracking":
            pref.tracking_enabled = False
        elif row.consent_type == "reminders":
            pref.reminders_enabled = False
        row.consent_status = "withdrawn"
        row.withdrawn_at = _utc_now()
        db.commit()
        return {"withdrawn": True}

    # Optional Consented BMI Estimation & Provenance History
    @women_router.post(
        "/bmi/estimate",
        response_model=BmiHistoryOut,
        status_code=status.HTTP_201_CREATED,
    )
    def estimate_and_store_bmi(
        request: Request,
        payload: BmiEstimateRequest,
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> BmiHistoryOut:
        enforce_rate_limit(request, "women_bmi", max_requests=40)
        profile = require_owned_profile(db, current_user.id, payload.profile_id)
        if not payload.consent_confirmed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Explicit consent is required before calculating and saving BMI.",
            )
        pref = _get_or_create_pref(db, current_user.id, payload.profile_id)
        pref.height_cm = payload.height_cm
        pref.weight_kg = payload.weight_kg
        pref.bmi_consent_given = True
        pref.updated_at = _utc_now()

        age_yrs = profile.age_years
        if age_yrs is None and profile.date_of_birth:
            age_yrs = max(0, int((date.today() - profile.date_of_birth).days // 365))

        calc = _compute_bmi_server(payload.height_cm, payload.weight_kg, age_yrs)
        row = WomensBmiRecord(
            user_id=current_user.id,
            profile_id=payload.profile_id,
            bmi_value=calc["bmi"],
            assessment_mode=calc["mode"],
            percentile=calc["percentile"],
            height_cm_used=payload.height_cm,
            weight_kg_used=payload.weight_kg,
            age_years_used=age_yrs,
            consent_confirmed=True,
        )
        db.add(row)
        _record_consent_event(db, current_user.id, payload.profile_id, "bmi_screening", True)
        db.commit()
        db.refresh(row)
        return _serialize_bmi(row, age_yrs)

    @women_router.get("/bmi/history", response_model=list[BmiHistoryOut])
    def get_bmi_history(
        profile_id: int = Query(..., ge=1),
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> list[BmiHistoryOut]:
        profile = require_owned_profile(db, current_user.id, profile_id)
        rows = list(
            db.scalars(
                select(WomensBmiRecord)
                .where(
                    WomensBmiRecord.user_id == current_user.id,
                    WomensBmiRecord.profile_id == profile_id,
                )
                .order_by(WomensBmiRecord.calculated_at.desc(), WomensBmiRecord.id.desc())
            ).all()
        )
        return [_serialize_bmi(r, profile.age_years) for r in rows]

    # Period Cycle CRUD (Reuses MenstrualPeriodRecord across /periods & /cycle aliases)
    @women_router.get("/cycle", response_model=list[PeriodRecordOut])
    @women_router.get("/periods", response_model=list[PeriodRecordOut])
    def list_period_records(
        profile_id: int = Query(..., ge=1),
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> list[PeriodRecordOut]:
        require_owned_profile(db, current_user.id, profile_id)
        rows = list(
            db.scalars(
                select(MenstrualPeriodRecord)
                .where(
                    MenstrualPeriodRecord.user_id == current_user.id,
                    MenstrualPeriodRecord.profile_id == profile_id,
                )
                .order_by(MenstrualPeriodRecord.start_date.desc(), MenstrualPeriodRecord.id.desc())
            ).all()
        )
        return [_serialize_period(r) for r in rows]

    @women_router.post("/cycle", response_model=PeriodRecordOut, status_code=status.HTTP_201_CREATED)
    @women_router.post("/periods", response_model=PeriodRecordOut, status_code=status.HTTP_201_CREATED)
    def create_period_record(
        request: Request,
        payload: PeriodRecordCreateRequest,
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> PeriodRecordOut:
        enforce_rate_limit(request, "women_write", max_requests=60)
        require_owned_profile(db, current_user.id, payload.profile_id)
        pref = _get_or_create_pref(db, current_user.id, payload.profile_id)
        if not pref.tracking_enabled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cycle tracking is currently disabled on this profile.",
            )
        row = MenstrualPeriodRecord(
            user_id=current_user.id,
            profile_id=payload.profile_id,
            start_date=payload.start_date,
            end_date=payload.end_date,
            flow_level=payload.flow_level,
            notes=(payload.notes or "").strip() or None,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return _serialize_period(row)

    @women_router.put("/cycle/{record_id}", response_model=PeriodRecordOut)
    @women_router.put("/periods/{record_id}", response_model=PeriodRecordOut)
    def update_period_record(
        record_id: int,
        payload: PeriodRecordUpdateRequest,
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> PeriodRecordOut:
        row = db.get(MenstrualPeriodRecord, record_id)
        if not row or row.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Period record not found.")
        next_start = payload.start_date or row.start_date
        next_end = payload.end_date if payload.end_date is not None else row.end_date
        if next_end and next_end < next_start:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="End date cannot be earlier than start date.",
            )
        if payload.start_date:
            row.start_date = payload.start_date
        if payload.end_date is not None:
            row.end_date = payload.end_date
        if payload.flow_level is not None:
            row.flow_level = payload.flow_level
        if payload.notes is not None:
            row.notes = payload.notes.strip() or None
        row.updated_at = _utc_now()
        db.commit()
        db.refresh(row)
        return _serialize_period(row)

    @women_router.delete("/cycle/{record_id}")
    @women_router.delete("/periods/{record_id}")
    def delete_period_record(
        record_id: int,
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> dict[str, bool]:
        row = db.get(MenstrualPeriodRecord, record_id)
        if not row or row.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Period record not found.")
        db.delete(row)
        db.commit()
        return {"deleted": True}

    @women_router.get("/symptoms", response_model=list[SymptomMoodOut])
    def list_symptoms(
        profile_id: int = Query(..., ge=1),
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> list[SymptomMoodOut]:
        require_owned_profile(db, current_user.id, profile_id)
        rows = list(
            db.scalars(
                select(CycleSymptomMoodRecord)
                .where(
                    CycleSymptomMoodRecord.user_id == current_user.id,
                    CycleSymptomMoodRecord.profile_id == profile_id,
                )
                .order_by(CycleSymptomMoodRecord.record_date.desc(), CycleSymptomMoodRecord.id.desc())
            ).all()
        )
        return [_serialize_symptom(r) for r in rows]

    @women_router.post(
        "/symptoms",
        response_model=SymptomMoodOut,
        status_code=status.HTTP_201_CREATED,
    )
    def create_symptom_mood_record(
        request: Request,
        payload: SymptomMoodCreateRequest,
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> SymptomMoodOut:
        enforce_rate_limit(request, "women_write", max_requests=60)
        require_owned_profile(db, current_user.id, payload.profile_id)
        if not payload.symptoms and not payload.mood:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Select at least one symptom chip or mood option.",
            )
        row = CycleSymptomMoodRecord(
            user_id=current_user.id,
            profile_id=payload.profile_id,
            period_record_id=payload.period_record_id,
            record_date=payload.record_date,
            symptoms_json=json.dumps(payload.symptoms),
            symptom_severity=payload.symptom_severity,
            cramps_level=payload.cramps_level,
            energy_level=payload.energy_level,
            symptom_other_text=(payload.symptom_other_text or "").strip() or None,
            mood=payload.mood,
            mood_other_text=(payload.mood_other_text or "").strip() or None,
            notes=(payload.notes or "").strip() or None,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return _serialize_symptom(row)

    @women_router.delete("/symptoms/{record_id}")
    def delete_symptom_record(
        record_id: int,
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> dict[str, bool]:
        row = db.get(CycleSymptomMoodRecord, record_id)
        if not row or row.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Symptom record not found.")
        db.delete(row)
        db.commit()
        return {"deleted": True}

    @women_router.get("/nutrition/history")
    def get_women_nutrition_history(
        profile_id: int = Query(..., ge=1),
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> list[dict[str, Any]]:
        """Reuse ProfileFoodEntry cleanly without building a duplicate nutrition table."""
        require_owned_profile(db, current_user.id, profile_id)
        rows = list(
            db.scalars(
                select(ProfileFoodEntry)
                .where(
                    ProfileFoodEntry.user_id == current_user.id,
                    ProfileFoodEntry.profile_id == profile_id,
                )
                .order_by(ProfileFoodEntry.consumed_at.desc())
                .limit(50)
            ).all()
        )
        return [
            {
                "id": r.id,
                "meal_name": r.meal_name,
                "meal_type": r.meal_type,
                "total_portion_grams": r.total_portion_grams,
                "calories": r.calories,
                "protein": r.protein,
                "carbs": r.carbs,
                "fats": r.fats,
                "fibre": r.fibre,
                "measurement_source": r.measurement_source,
                "consumed_at": r.consumed_at.isoformat(),
            }
            for r in rows
        ]

    @women_router.get("/export")
    def export_womens_data(
        profile_id: int = Query(..., ge=1),
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> dict[str, Any]:
        profile = require_owned_profile(db, current_user.id, profile_id)
        summary = get_womens_summary(
            request=Request({"type": "http", "headers": [], "client": ("127.0.0.1", 0)}),
            profile_id=profile_id,
            current_user=current_user,
            db=db,
        )
        return {
            "exported_at": _utc_now().isoformat(),
            "profile_display_name": profile.display_name,
            "data": summary.model_dump(mode="json"),
        }

    @women_router.delete("/data")
    @women_router.delete("/profile/data")
    def delete_all_womens_data(
        profile_id: int = Query(..., ge=1),
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> dict[str, bool]:
        require_owned_profile(db, current_user.id, profile_id)
        for model in (
            MenstrualPeriodRecord,
            CycleSymptomMoodRecord,
            WomensBmiRecord,
            WomensConsentEvent,
            WomensWellnessPreference,
        ):
            rows = list(
                db.scalars(
                    select(model).where(model.user_id == current_user.id, model.profile_id == profile_id)
                ).all()
            )
            for r in rows:
                db.delete(r)
        db.commit()
        return {"deleted_all": True}

    # -----------------------------------------------------------------------
    # Centralized Product Catalog & Women Alias Routes (Same Shared Tables)
    # -----------------------------------------------------------------------
    products_router = APIRouter(prefix="/api/products", tags=["Centralized Product Catalog"])

    def _serialize_products_query(
        db: Session,
        category: str | None = None,
        audience: str | None = None,
        tier: str | None = None,
        sub_category: str | None = None,
    ) -> list[ProductOut]:
        _upsert_seed_catalog(db)
        stmt = select(ProductCatalogItem).order_by(ProductCatalogItem.sort_order.asc(), ProductCatalogItem.id.asc())
        if category and category in PRODUCT_CATEGORIES:
            stmt = stmt.where(ProductCatalogItem.category == category)
        if tier:
            stmt = stmt.where(ProductCatalogItem.budget_tier == tier)
        if sub_category:
            stmt = stmt.where(ProductCatalogItem.sub_category == sub_category)
        items = list(db.scalars(stmt).all())
        if audience:
            aud_norm = audience.strip().lower()
            items = [
                p
                for p in items
                if aud_norm in [str(t).lower() for t in _parse_json_list(p.audience_tags_json)]
            ]

        retailers = {r.id: r for r in db.scalars(select(Retailer)).all()}
        listings = list(db.scalars(select(ProductRetailerListing)).all())
        listings_by_product: dict[int, list[RetailerListingOut]] = {}

        for lst in listings:
            ret = retailers.get(lst.retailer_id)
            if not ret:
                continue
            listings_by_product.setdefault(lst.product_id, []).append(
                RetailerListingOut(
                    listing_id=lst.id,
                    retailer_slug=ret.slug,
                    retailer_name=ret.name,
                    retailer_domain=ret.domain,
                    destination_url=lst.affiliate_url if (lst.is_affiliate and lst.affiliate_url) else lst.destination_url,
                    redirect_path=f"/api/products/redirect/{lst.id}",
                    is_affiliate=lst.is_affiliate,
                    link_type=lst.link_type,
                    price_inr=lst.price_inr,
                    original_price_inr=lst.original_price_inr,
                    price_display=lst.price_display,
                    live_price_verified=lst.live_price_verified,
                    availability=lst.availability,
                    last_checked_at=lst.last_checked_at,
                    source_provenance=lst.source_provenance,
                    disclosure_text=lst.disclosure_text,
                    is_sponsored=lst.is_sponsored,
                )
            )

        return [
            ProductOut(
                id=p.id,
                slug=p.slug,
                name=p.name,
                variant_label=p.variant_label,
                brand=p.brand,
                category=p.category,
                sub_category=p.sub_category,
                audience_tags=[str(t) for t in _parse_json_list(p.audience_tags_json)],
                budget_tier=p.budget_tier,
                image_path=p.image_path,
                has_verified_image=p.has_verified_image,
                image_caption=p.image_caption,
                features=[str(f) for f in _parse_json_list(p.features_json)],
                quality_notes=p.quality_notes,
                listings=listings_by_product.get(p.id, []),
            )
            for p in items
        ]

    @products_router.get("", response_model=list[ProductOut])
    def list_products(
        category: str | None = Query(default=None),
        audience: str | None = Query(default=None),
        tier: str | None = Query(default=None),
        sub_category: str | None = Query(default=None),
        db: Session = Depends(get_db),
    ) -> list[ProductOut]:
        return _serialize_products_query(db, category, audience, tier, sub_category)

    @women_router.get("/products", response_model=list[ProductOut])
    def list_women_products_alias(
        category: str | None = Query(default=None),
        sub_category: str | None = Query(default=None),
        tier: str | None = Query(default=None),
        db: Session = Depends(get_db),
    ) -> list[ProductOut]:
        return _serialize_products_query(db, category=category, audience="women", tier=tier, sub_category=sub_category)

    @women_router.get("/products/{product_id}", response_model=ProductOut)
    def get_single_product(product_id: int, db: Session = Depends(get_db)) -> ProductOut:
        all_p = _serialize_products_query(db)
        for p in all_p:
            if p.id == product_id:
                return p
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    @women_router.post("/products/{product_id}/affiliate-click", response_model=ProductRedirectInspectOut)
    def log_affiliate_click_post(
        product_id: int,
        payload: AffiliateClickPostRequest,
        current_user: Any = Depends(get_optional_user),
        db: Session = Depends(get_db),
    ) -> ProductRedirectInspectOut:
        listing = db.get(ProductRetailerListing, payload.listing_id)
        if not listing or listing.product_id != product_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found for product.")
        target_url = (
            listing.affiliate_url if (listing.is_affiliate and listing.affiliate_url) else listing.destination_url
        )
        token = f"ns_{secrets.token_hex(12)}"
        comm_status = (
            "pending_provider_confirmation" if listing.is_affiliate else "not_applicable_non_affiliate"
        )
        # Never records period/medical data alongside click events
        db.add(
            AffiliateClickEvent(
                listing_id=listing.id,
                product_id=listing.product_id,
                user_id=current_user.id if current_user else None,
                referrer_section=payload.referrer_section,
                is_affiliate_click=listing.is_affiliate,
                attribution_token=token,
                commission_status=comm_status,
            )
        )
        db.commit()
        return ProductRedirectInspectOut(
            listing_id=listing.id,
            destination_url=target_url,
            is_affiliate=listing.is_affiliate,
            link_type=listing.link_type,
            disclosure_text=listing.disclosure_text,
            commission_status=comm_status,
            attribution_token=token,
        )

    @products_router.get("/compare/{category}", response_model=dict[str, list[ProductOut]])
    def compare_category_by_tiers(
        category: str,
        audience: str | None = Query(default=None),
        db: Session = Depends(get_db),
    ) -> dict[str, list[ProductOut]]:
        if category not in PRODUCT_CATEGORIES:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown product category.")
        all_items = _serialize_products_query(db, category=category, audience=audience)
        return {
            "budget_friendly": [i for i in all_items if i.budget_tier == "budget_friendly"],
            "value_for_money": [i for i in all_items if i.budget_tier == "value_for_money"],
            "premium_quality": [i for i in all_items if i.budget_tier == "premium_quality"],
        }

    @products_router.get("/redirect/{listing_id}")
    def product_outbound_redirect(
        listing_id: int,
        referrer: str = Query(default="catalog", max_length=80),
        inspect: bool = Query(default=False),
        current_user: Any = Depends(get_optional_user),
        db: Session = Depends(get_db),
    ) -> Any:
        listing = db.get(ProductRetailerListing, listing_id)
        if not listing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product listing not found.")

        target_url = (
            listing.affiliate_url
            if (listing.is_affiliate and listing.affiliate_url)
            else listing.destination_url
        )
        token = f"ns_{secrets.token_hex(12)}"
        comm_status = (
            "pending_provider_confirmation"
            if listing.is_affiliate
            else "not_applicable_non_affiliate"
        )
        db.add(
            AffiliateClickEvent(
                listing_id=listing.id,
                product_id=listing.product_id,
                user_id=current_user.id if current_user else None,
                referrer_section=referrer,
                is_affiliate_click=listing.is_affiliate,
                attribution_token=token,
                commission_status=comm_status,
            )
        )
        db.commit()

        if inspect:
            return ProductRedirectInspectOut(
                listing_id=listing.id,
                destination_url=target_url,
                is_affiliate=listing.is_affiliate,
                link_type=listing.link_type,
                disclosure_text=listing.disclosure_text,
                commission_status=comm_status,
                attribution_token=token,
            )
        return RedirectResponse(url=target_url, status_code=status.HTTP_302_FOUND)

    # -----------------------------------------------------------------------
    # Verified Directory, Labs & Premium Previews (Shared + Women Routes)
    # -----------------------------------------------------------------------
    directory_router = APIRouter(prefix="/api/directory", tags=["Providers, Labs & Premium Previews"])

    def _query_providers(db: Session, provider_type: str | None = None, verified_only: bool = False) -> list[HealthcareProviderOut]:
        _upsert_seed_catalog(db)
        stmt = select(HealthcareProviderRecord).order_by(HealthcareProviderRecord.id.asc())
        if provider_type:
            stmt = stmt.where(HealthcareProviderRecord.provider_type == provider_type)
        if verified_only:
            stmt = stmt.where(HealthcareProviderRecord.booking_status != "coming_soon")
        rows = list(db.scalars(stmt).all())
        return [
            HealthcareProviderOut(
                id=r.id,
                slug=r.slug,
                provider_type=r.provider_type,
                name=r.name,
                qualifications=r.qualifications,
                registration_details=r.registration_details,
                specialization=r.specialization,
                hospital_or_organization=r.hospital_or_organization,
                location=r.location,
                consultation_mode=r.consultation_mode,
                availability=r.availability,
                consultation_fees_note=r.consultation_fees_note,
                verification_source=r.verification_source,
                official_url=r.official_url,
                booking_status=r.booking_status,
                is_sponsored=r.is_sponsored,
            )
            for r in rows
        ]

    @directory_router.get("/providers", response_model=list[HealthcareProviderOut])
    @women_router.get("/providers", response_model=list[HealthcareProviderOut])
    def list_providers(
        provider_type: str | None = Query(default=None),
        verified_only: bool = Query(default=False),
        db: Session = Depends(get_db),
    ) -> list[HealthcareProviderOut]:
        return _query_providers(db, provider_type, verified_only)

    @women_router.get("/providers/{provider_id}", response_model=HealthcareProviderOut)
    def get_provider(provider_id: int, db: Session = Depends(get_db)) -> HealthcareProviderOut:
        for p in _query_providers(db):
            if p.id == provider_id:
                return p
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found.")

    @directory_router.get("/labs", response_model=list[DiagnosticLabOut])
    @women_router.get("/labs", response_model=list[DiagnosticLabOut])
    def list_diagnostic_labs(db: Session = Depends(get_db)) -> list[DiagnosticLabOut]:
        _upsert_seed_catalog(db)
        rows = list(db.scalars(select(DiagnosticLabRecord).order_by(DiagnosticLabRecord.id.asc())).all())
        return [
            DiagnosticLabOut(
                id=r.id,
                slug=r.slug,
                name=r.name,
                available_tests_note=r.available_tests_note,
                location=r.location,
                accreditation_note=r.accreditation_note,
                pricing_note=r.pricing_note,
                official_booking_url=r.official_booking_url,
                booking_integration_status=r.booking_integration_status,
                is_sponsored=r.is_sponsored,
            )
            for r in rows
        ]

    @women_router.get("/labs/{lab_id}", response_model=DiagnosticLabOut)
    def get_single_lab(lab_id: int, db: Session = Depends(get_db)) -> DiagnosticLabOut:
        for lab in list_diagnostic_labs(db=db):
            if lab.id == lab_id:
                return lab
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diagnostic lab not found.")

    @directory_router.get("/subscriptions", response_model=list[SubscriptionPlanOut])
    @women_router.get("/premium/plans", response_model=list[SubscriptionPlanOut])
    def list_subscription_previews(db: Session = Depends(get_db)) -> list[SubscriptionPlanOut]:
        _upsert_seed_catalog(db)
        rows = list(db.scalars(select(SubscriptionPlanRecord).order_by(SubscriptionPlanRecord.id.asc())).all())
        return [
            SubscriptionPlanOut(
                id=r.id,
                slug=r.slug,
                name=r.name,
                tagline=r.tagline,
                features=[str(x) for x in _parse_json_list(r.features_json)],
                status=r.status,
                billing_active=r.billing_active,
            )
            for r in rows
        ]

    @women_router.get("/premium/services")
    def list_premium_service_categories() -> list[dict[str, str]]:
        return SEED_PREMIUM_SERVICES

    @directory_router.get("/appointments", response_model=list[AppointmentPreviewOut])
    def list_user_appointment_requests(
        profile_id: int = Query(..., ge=1),
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> list[AppointmentPreviewOut]:
        require_owned_profile(db, current_user.id, profile_id)
        rows = list(
            db.scalars(
                select(AppointmentRecord)
                .where(
                    AppointmentRecord.user_id == current_user.id,
                    AppointmentRecord.profile_id == profile_id,
                )
                .order_by(AppointmentRecord.created_at.desc())
            ).all()
        )
        return [
            AppointmentPreviewOut(
                id=r.id,
                profile_id=r.profile_id,
                provider_slug=r.provider_slug,
                lab_slug=r.lab_slug,
                preferred_date=r.preferred_date,
                booking_status=r.booking_status,
                notes=r.notes,
                created_at=r.created_at,
            )
            for r in rows
        ]

    @directory_router.post(
        "/appointments",
        response_model=AppointmentPreviewOut,
        status_code=status.HTTP_201_CREATED,
    )
    def save_appointment_interest_note(
        payload: AppointmentPreviewCreateRequest,
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> AppointmentPreviewOut:
        require_owned_profile(db, current_user.id, payload.profile_id)
        if not payload.provider_slug and not payload.lab_slug:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Specify either provider_slug or lab_slug.",
            )
        row = AppointmentRecord(
            user_id=current_user.id,
            profile_id=payload.profile_id,
            provider_slug=payload.provider_slug,
            lab_slug=payload.lab_slug,
            preferred_date=payload.preferred_date,
            booking_status="coming_soon_preview_saved",
            notes=(payload.notes or "").strip() or None,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return AppointmentPreviewOut(
            id=row.id,
            profile_id=row.profile_id,
            provider_slug=row.provider_slug,
            lab_slug=row.lab_slug,
            preferred_date=row.preferred_date,
            booking_status=row.booking_status,
            notes=row.notes,
            created_at=row.created_at,
        )

    app.include_router(women_router)
    app.include_router(products_router)
    app.include_router(directory_router)

    @app.on_event("startup")
    def _seed_on_startup() -> None:
        _ensure_tables_and_seed()
