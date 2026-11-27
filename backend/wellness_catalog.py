"""Women's Wellness Companion, Centralized Product Recommendation System & Directory APIs."""

from __future__ import annotations

import json
import secrets
from datetime import date, datetime, timedelta, timezone
from typing import Any, Callable, Literal

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, status
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
    height_cm: float | None = Field(default=None, gt=40, le=260)
    weight_kg: float | None = Field(default=None, gt=5, le=400)
    bmi_consent_given: bool | None = None
    clear_bmi_metrics: bool = False
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
    height_cm: float | None
    weight_kg: float | None
    bmi_consent_given: bool
    optional_goals: list[str]
    updated_at: datetime


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


class PeriodRecordOut(BaseModel):
    id: int
    profile_id: int
    start_date: date
    end_date: date | None
    flow_level: str | None
    notes: str | None
    created_at: datetime


class SymptomMoodCreateRequest(BaseModel):
    profile_id: int = Field(..., ge=1)
    record_date: date
    symptoms: list[str] = Field(default_factory=list)
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
    record_date: date
    symptoms: list[str]
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
    price_display: str
    live_price_verified: bool
    availability: str
    last_checked_at: date
    disclosure_text: str
    is_sponsored: bool


class ProductOut(BaseModel):
    id: int
    slug: str
    name: str
    brand: str
    category: str
    audience_tags: list[str]
    budget_tier: str
    image_path: str
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
# Seed Catalog (Strictly Verified Brands, Official Portals, Zero Fake Affiliates)
# ---------------------------------------------------------------------------

SEED_RETAILERS = [
    {
        "slug": "nua_official",
        "name": "Nua Official Store",
        "domain": "nuawoman.com",
        "affiliate_program_configured": False,
        "default_disclosure": "Direct brand link (no affiliate commission active).",
    },
    {
        "slug": "sirona_official",
        "name": "Sirona Official Store",
        "domain": "thesirona.com",
        "affiliate_program_configured": False,
        "default_disclosure": "Direct brand link (no affiliate commission active).",
    },
    {
        "slug": "carmesi_official",
        "name": "Carmesi Official Store",
        "domain": "mycarmesi.com",
        "affiliate_program_configured": False,
        "default_disclosure": "Direct brand link (no affiliate commission active).",
    },
    {
        "slug": "whisper_official",
        "name": "Whisper India Portal",
        "domain": "whisper.co.in",
        "affiliate_program_configured": False,
        "default_disclosure": "Direct official brand product reference.",
    },
    {
        "slug": "decathlon_in",
        "name": "Decathlon India",
        "domain": "decathlon.in",
        "affiliate_program_configured": False,
        "default_disclosure": "Direct official retailer link (no affiliate commission active).",
    },
    {
        "slug": "milton_official",
        "name": "Milton Official Store",
        "domain": "milton.in",
        "affiliate_program_configured": False,
        "default_disclosure": "Direct brand link (no affiliate commission active).",
    },
    {
        "slug": "philips_in",
        "name": "Philips India",
        "domain": "philips.co.in",
        "affiliate_program_configured": False,
        "default_disclosure": "Direct manufacturer product portal.",
    },
    {
        "slug": "omron_in",
        "name": "Omron Healthcare India",
        "domain": "omronhealthcare-ap.com",
        "affiliate_program_configured": False,
        "default_disclosure": "Direct manufacturer product reference.",
    },
]

VERIFIED_CHECK_DATE = date(2026, 11, 27)

SEED_PRODUCTS = [
    # Women Period Care — 3 quality/budget comparison tiers
    {
        "slug": "stayfree-whisper-cotton-pads",
        "name": "Whisper Bindazzz Nights XXL+ Sanitary Pads",
        "brand": "Whisper (P&G India)",
        "category": "women_period_care",
        "audience_tags": ["women"],
        "budget_tier": "budget_friendly",
        "image_path": "/images/catalog-period-care.jpg",
        "image_caption": "Representative period care comfort flatlay; verify pack variant at retailer.",
        "features": [
            "Widely stocked overnight XL+/XXL pads for heavy flow",
            "Available across small trial packs and value bundles",
        ],
        "quality_notes": "Widely accessible everyday synthetic-blend option across Indian pharmacies.",
        "sort_order": 1,
        "listings": [
            {
                "retailer_slug": "whisper_official",
                "destination_url": "https://www.whisper.co.in",
                "price_inr": 170.0,
                "price_display": "~₹170 – ₹350 (verify current pack size at retailer)",
                "availability": "Widely available in India",
            }
        ],
    },
    {
        "slug": "nua-complete-comfort-pads",
        "name": "Nua Complete Comfort Rash-Free Sanitary Pads",
        "brand": "Nua Woman",
        "category": "women_period_care",
        "audience_tags": ["women"],
        "budget_tier": "value_for_money",
        "image_path": "/images/catalog-period-care.jpg",
        "image_caption": "Representative comfort hygiene set; inspect Nua store for customizable packs.",
        "features": [
            "Ultra-thin toxin-free construction with individual disposal covers",
            "Customizable assorted XL/XXL pack counts",
        ],
        "quality_notes": "Strong balance of skin comfort and value per pad in standard/saver bundles.",
        "sort_order": 2,
        "listings": [
            {
                "retailer_slug": "nua_official",
                "destination_url": "https://nuawoman.com",
                "price_inr": 230.0,
                "price_display": "~₹170 – ₹399 depending on pack size",
                "availability": "Available on nuawoman.com",
            }
        ],
    },
    {
        "slug": "carmesi-sensitive-plant-pads",
        "name": "Carmesi Sensitive Plant-Based Sanitary Pads",
        "brand": "Carmesi",
        "category": "women_period_care",
        "audience_tags": ["women"],
        "budget_tier": "value_for_money",
        "image_path": "/images/catalog-period-care.jpg",
        "image_caption": "Representative comfort care visual; see mycarmesi.com for pack details.",
        "features": [
            "Plant-based corn-starch and bamboo top sheet option",
            "Individually wrapped biodegradable disposal bags",
        ],
        "quality_notes": "Gentle top-sheet alternative for users sensitive to plastic-film pads.",
        "sort_order": 3,
        "listings": [
            {
                "retailer_slug": "carmesi_official",
                "destination_url": "https://mycarmesi.com",
                "price_inr": 149.0,
                "price_display": "From ~₹149 (10-pad pack) to ₹349+",
                "availability": "Available on mycarmesi.com",
            }
        ],
    },
    {
        "slug": "sirona-reusable-period-underwear",
        "name": "Sirona Reusable Period Underwear & Menstrual Cup",
        "brand": "Sirona",
        "category": "women_period_care",
        "audience_tags": ["women"],
        "budget_tier": "premium_quality",
        "image_path": "/images/catalog-period-care.jpg",
        "image_caption": "Representative period care studio visual; check thesirona.com for sizing.",
        "features": [
            "Multi-layer washable period panty (up to ~60 ml core) or S/M/L cups",
            "Lower recurring waste over multi-month cycles",
        ],
        "quality_notes": "Higher upfront purchase cost amortized across repeated washable uses.",
        "sort_order": 4,
        "listings": [
            {
                "retailer_slug": "sirona_official",
                "destination_url": "https://thesirona.com",
                "price_inr": 449.0,
                "price_display": "~₹449 – ₹599 (verify size & pack on store)",
                "availability": "Available on thesirona.com",
            }
        ],
    },
    {
        "slug": "nua-cramp-comfort-heat-patch",
        "name": "Nua & Carmesi Self-Heating Cramp Comfort Patches (Pack of 3)",
        "brand": "Nua Woman / Carmesi",
        "category": "women_period_care",
        "audience_tags": ["women"],
        "budget_tier": "value_for_money",
        "image_path": "/images/catalog-period-care.jpg",
        "image_caption": "Representative heat & comfort category photography.",
        "features": [
            "Air-activated portable warmth for up to 8 hours without electric cords",
            "Discreet attachment onto clothing during commute or rest",
        ],
        "quality_notes": "Check manufacturer skin-safety instructions; never place directly on bare skin.",
        "sort_order": 5,
        "listings": [
            {
                "retailer_slug": "nua_official",
                "destination_url": "https://nuawoman.com",
                "price_inr": 299.0,
                "price_display": "~₹284 – ₹299 MRP (Pack of 3)",
                "availability": "Available on nuawoman.com",
            },
            {
                "retailer_slug": "carmesi_official",
                "destination_url": "https://mycarmesi.com",
                "price_inr": 345.0,
                "price_display": "~₹345 MRP (Carmesi Pack of 3)",
                "availability": "Available on mycarmesi.com",
            },
        ],
    },
    # Hydration Products (Cross-Audience: Women, Men, Patients)
    {
        "slug": "milton-thermosteel-500-1000",
        "name": "Milton Thermosteel 304 Stainless Steel Flask (500 mL / 1000 mL)",
        "brand": "Milton",
        "category": "hydration_products",
        "audience_tags": ["women", "men", "patients"],
        "budget_tier": "value_for_money",
        "image_path": "/images/catalog-fitness-hydration.jpg",
        "image_caption": "Representative reusable stainless hydration visual; verify model on milton.in.",
        "features": [
            "Food-grade 304 stainless steel double-walled vacuum insulation",
            "Retains warm herbal infusions or cool water for extended hours",
        ],
        "quality_notes": "Durable BPA-free reusable hydration staple across warm/cool infusions.",
        "sort_order": 6,
        "listings": [
            {
                "retailer_slug": "milton_official",
                "destination_url": "https://www.milton.in",
                "price_inr": None,
                "price_display": "Check milton.in for 500 mL / 1000 mL live pricing",
                "availability": "Available across Milton official store & retail",
            }
        ],
    },
    # Fitness Accessories (Cross-Audience: Women & Men)
    {
        "slug": "decathlon-domyos-mat-bands",
        "name": "Decathlon Domyos / Kimjaly Yoga Mat & Resistance Bands",
        "brand": "Decathlon (Domyos / Kimjaly)",
        "category": "fitness_accessories",
        "audience_tags": ["women", "men"],
        "budget_tier": "budget_friendly",
        "image_path": "/images/catalog-fitness-hydration.jpg",
        "image_caption": "Representative fitness mat & resistance band photography.",
        "features": [
            "4mm–8mm cushioned mats suitable for restorative yoga and floor mobility",
            "Progressive light/medium/heavy resistance bands for beginner strength work",
        ],
        "quality_notes": "Predictable standardized Decathlon entry-to-intermediate training hardware.",
        "sort_order": 7,
        "listings": [
            {
                "retailer_slug": "decathlon_in",
                "destination_url": "https://www.decathlon.in",
                "price_inr": None,
                "price_display": "Check decathlon.in for current mat/band pricing",
                "availability": "Available online & Decathlon India stores",
            }
        ],
    },
    # Baby Care (Centralized Catalog Reuse)
    {
        "slug": "philips-avent-classic-bottle",
        "name": "Philips Avent Classic+ Anti-Colic Feeding Bottle (125 mL / 260 mL)",
        "brand": "Philips Avent",
        "category": "baby_care",
        "audience_tags": ["babies"],
        "budget_tier": "premium_quality",
        "image_path": "/images/chapter-babies.jpg",
        "image_caption": "Representative infant feeding context; inspect Philips India for bottle models.",
        "features": [
            "Integrated Airflex venting valve designed for smooth infant feeding",
            "BPA-free bottle options across newborn and slow-flow sizes",
        ],
        "quality_notes": "Follow pediatric sterilization and safe milk temperature practices.",
        "sort_order": 8,
        "listings": [
            {
                "retailer_slug": "philips_in",
                "destination_url": "https://www.philips.co.in",
                "price_inr": None,
                "price_display": "Check philips.co.in for official bottle variants & pricing",
                "availability": "Authorized Philips India retailers",
            }
        ],
    },
    # Patient Care (Centralized Catalog Reuse)
    {
        "slug": "omron-hem-7120-bp-monitor",
        "name": "Omron HEM-7120 Automatic Upper-Arm Blood Pressure Monitor",
        "brand": "Omron Healthcare",
        "category": "patient_care",
        "audience_tags": ["patients", "women", "men"],
        "budget_tier": "value_for_money",
        "image_path": "/images/chapter-patients.jpg",
        "image_caption": "Representative home-monitoring context; inspect Omron portal for model manual.",
        "features": [
            "Automatic Intellisense upper-arm inflation with hypertension indicator",
            "Clinically validated monitoring support for home vitals logs",
        ],
        "quality_notes": "For monitoring support only; share trends with a licensed physician.",
        "sort_order": 9,
        "listings": [
            {
                "retailer_slug": "omron_in",
                "destination_url": "https://www.omronhealthcare-ap.com",
                "price_inr": None,
                "price_display": "Check authorized pharmacies or Omron India for pricing",
                "availability": "Authorized medical pharmacies across India",
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
        "consultation_fees_note": "Free credential lookup; individual hospital/clinic fees vary by doctor.",
        "verification_source": "Official Government Statutory Portal (nmc.org.in)",
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
        "consultation_fees_note": "Free public telemedicine OPD (no treatment cost billed here).",
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
        "availability": "Check centre schedule on cult.fit",
        "consultation_fees_note": "Membership tiers displayed directly on cult.fit (Coming Soon in-app).",
        "verification_source": "Official Platform Domain (cult.fit)",
        "official_url": "https://www.cult.fit/",
        "booking_status": "external_official_portal",
        "is_sponsored": False,
    },
    {
        "slug": "partner-gynecology-clinician-onboarding",
        "provider_type": "gynecology_hospital",
        "name": "Direct Registered Gynecologist & Clinical Dietitian Booking",
        "qualifications": "Requires direct NMC registration & clinical contract verification",
        "registration_details": "Onboarding in progress — zero unverified individual doctor profiles shown",
        "specialization": "Obstetrics, Gynecology & Clinical Dietetics",
        "hospital_or_organization": "Partner Clinic Integration",
        "location": "Coming Soon across partner clinics",
        "consultation_mode": "Video & In-Clinic (Coming Soon)",
        "availability": "Coming Soon",
        "consultation_fees_note": "Consultation fee will always display separately from treatment costs.",
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
        "available_tests_note": "CBC, Ferritin/Iron profile, Thyroid panel, HbA1c, Vitamin D/B12 (order under clinician guidance)",
        "location": "Pan-India Collection Centres & Home Collection",
        "accreditation_note": "Verify NABL accreditation per city lab directly on lalpathlabs.com",
        "pricing_note": "View live city-specific test pricing on the official portal",
        "official_booking_url": "https://www.lalpathlabs.com/book-a-test",
        "booking_integration_status": "external_official_portal",
        "is_sponsored": False,
    },
    {
        "slug": "apollo-diagnostics-official",
        "name": "Apollo Diagnostics",
        "available_tests_note": "Full blood counts, hormone panels, hemoglobin & micronutrient tests (with medical advice)",
        "location": "Pan-India Diagnostic Centres",
        "accreditation_note": "Verify lab-level accreditation on apollodiagnostics.in",
        "pricing_note": "View official walk-in & home-collection pricing on apollodiagnostics.in",
        "official_booking_url": "https://apollodiagnostics.in/book-walk-in",
        "booking_integration_status": "external_official_portal",
        "is_sponsored": False,
    },
    {
        "slug": "metropolis-healthcare-official",
        "name": "Metropolis Healthcare",
        "available_tests_note": "Comprehensive women's & clinical pathology testing per clinician order",
        "location": "Multi-City Centres across India",
        "accreditation_note": "Verify NABL/CAP accredited hub info on metropolisindia.com",
        "pricing_note": "View verified city pricing directly on metropolisindia.com",
        "official_booking_url": "https://www.metropolisindia.com/",
        "booking_integration_status": "external_official_portal",
        "is_sponsored": False,
    },
]

SEED_SUBSCRIPTION_PLANS = [
    {
        "slug": "womens-wellness-companion-plus",
        "name": "Women's Wellness Companion Plus",
        "tagline": "Advanced clinician-reviewed meal planning, custom workout cadences & exportable cycle reports",
        "features": [
            "Downloadable structured health & cycle reports for doctor visits",
            "Priority verified dietitian & gynecology partner appointments (when integrated)",
            "Deeper longitudinal macro, iron-pair & hydration pattern summaries",
        ],
        "status": "coming_soon",
        "billing_active": False,
    },
    {
        "slug": "family-multi-profile-care",
        "name": "NutriSense Family Care Plan",
        "tagline": "Extended household collaboration across Men, Women, Baby & Patient profiles",
        "features": [
            "Shared caregiver view permissions across household profiles",
            "Priority ESP32 / HX711 hardware scale sync & extended historical analytics",
            "Verified lab partner home-collection coordination (when integrated)",
        ],
        "status": "coming_soon",
        "billing_active": False,
    },
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
    """Register Women's Wellness, Centralized Product Catalog, and Provider/Lab models & routes."""
    get_current_user = platform["get_current_user"]
    get_optional_user = platform["get_optional_user"]
    require_owned_profile = platform["require_owned_profile"]

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
        height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
        weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
        bmi_consent_given: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
        optional_goals_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
        updated_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
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

    class CycleSymptomMoodRecord(Base):
        __tablename__ = "cycle_symptom_mood_records"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        user_id: Mapped[int] = mapped_column(
            ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
        )
        profile_id: Mapped[int] = mapped_column(
            ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True
        )
        record_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
        symptoms_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
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
        brand: Mapped[str] = mapped_column(String(120), nullable=False)
        category: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
        audience_tags_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
        budget_tier: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
        image_path: Mapped[str] = mapped_column(String(255), nullable=False)
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
        price_display: Mapped[str] = mapped_column(String(160), nullable=False)
        live_price_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
        availability: Mapped[str] = mapped_column(String(120), nullable=False)
        last_checked_at: Mapped[date] = mapped_column(Date, nullable=False)
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

    def _ensure_catalog_seeded(db: Session) -> None:
        if not db.scalar(select(func.count(Retailer.id))):
            retailer_by_slug: dict[str, Retailer] = {}
            for r in SEED_RETAILERS:
                row = Retailer(**r)
                db.add(row)
                db.flush()
                retailer_by_slug[r["slug"]] = row

            for p in SEED_PRODUCTS:
                item = ProductCatalogItem(
                    slug=p["slug"],
                    name=p["name"],
                    brand=p["brand"],
                    category=p["category"],
                    audience_tags_json=json.dumps(p["audience_tags"]),
                    budget_tier=p["budget_tier"],
                    image_path=p["image_path"],
                    image_caption=p["image_caption"],
                    features_json=json.dumps(p["features"]),
                    quality_notes=p["quality_notes"],
                    sort_order=p["sort_order"],
                )
                db.add(item)
                db.flush()

                for lst in p["listings"]:
                    ret = retailer_by_slug[lst["retailer_slug"]]
                    db.add(
                        ProductRetailerListing(
                            product_id=item.id,
                            retailer_id=ret.id,
                            destination_url=lst["destination_url"],
                            is_affiliate=False,
                            affiliate_url=None,
                            link_type="brand_official",
                            price_inr=lst["price_inr"],
                            price_display=lst["price_display"],
                            live_price_verified=False,
                            availability=lst["availability"],
                            last_checked_at=VERIFIED_CHECK_DATE,
                            disclosure_text="Non-affiliate verified official link (direct retailer)",
                            is_sponsored=False,
                        )
                    )

        if not db.scalar(select(func.count(HealthcareProviderRecord.id))):
            for prov in SEED_PROVIDERS:
                db.add(HealthcareProviderRecord(**prov))

        if not db.scalar(select(func.count(DiagnosticLabRecord.id))):
            for lab in SEED_LABS:
                db.add(DiagnosticLabRecord(**lab))

        if not db.scalar(select(func.count(SubscriptionPlanRecord.id))):
            for plan in SEED_SUBSCRIPTION_PLANS:
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

    def _ensure_tables_and_seed() -> None:
        engine = SessionLocal.kw.get("bind")
        if engine is not None:
            Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            _ensure_catalog_seeded(db)

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
            height_cm=pref.height_cm,
            weight_kg=pref.weight_kg,
            bmi_consent_given=pref.bmi_consent_given,
            optional_goals=[str(x) for x in _parse_json_list(pref.optional_goals_json)],
            updated_at=pref.updated_at,
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
        )

    def _serialize_symptom(row: CycleSymptomMoodRecord) -> SymptomMoodOut:
        return SymptomMoodOut(
            id=row.id,
            profile_id=row.profile_id,
            record_date=row.record_date,
            symptoms=[str(x) for x in _parse_json_list(row.symptoms_json)],
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
            disclaimer="Estimate based on logged cycle starts (~"
            f"{avg_days} days); cycles vary naturally and predictions are never guarantees.",
        )

    # -----------------------------------------------------------------------
    # Women's Wellness Router (Strictly Protected + Ownership Checked)
    # -----------------------------------------------------------------------
    women_router = APIRouter(prefix="/api/women", tags=["Women's Wellness"])

    @women_router.get("/summary", response_model=WomensSummaryOut)
    def get_womens_summary(
        profile_id: int = Query(..., ge=1),
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> WomensSummaryOut:
        require_owned_profile(db, current_user.id, profile_id)
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
        return WomensSummaryOut(
            preferences=_serialize_pref(pref),
            period_records=[_serialize_period(p) for p in periods],
            symptom_records=[_serialize_symptom(s) for s in symptoms],
            estimate=_compute_cycle_estimate(pref, periods),
        )

    @women_router.put("/preferences", response_model=WomensPreferencesOut)
    def update_womens_preferences(
        payload: WomensPreferencesUpdateRequest,
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> WomensPreferencesOut:
        require_owned_profile(db, current_user.id, payload.profile_id)
        pref = _get_or_create_pref(db, current_user.id, payload.profile_id)
        data = payload.model_dump(exclude_unset=True)

        if data.pop("clear_bmi_metrics", False):
            pref.height_cm = None
            pref.weight_kg = None
            pref.bmi_consent_given = False

        if "consent_given" in data and data["consent_given"] is not None:
            pref.consent_given = data.pop("consent_given")
            pref.consent_updated_at = _utc_now()

        if "optional_goals" in data:
            goals = [str(g).strip()[:80] for g in (data.pop("optional_goals") or []) if str(g).strip()]
            pref.optional_goals_json = json.dumps(goals[:12])

        data.pop("profile_id", None)
        for key, value in data.items():
            if hasattr(pref, key):
                setattr(pref, key, value)
        pref.updated_at = _utc_now()

        db.commit()
        db.refresh(pref)
        return _serialize_pref(pref)

    @women_router.post(
        "/periods",
        response_model=PeriodRecordOut,
        status_code=status.HTTP_201_CREATED,
    )
    def create_period_record(
        payload: PeriodRecordCreateRequest,
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> PeriodRecordOut:
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

    @women_router.post(
        "/symptoms",
        response_model=SymptomMoodOut,
        status_code=status.HTTP_201_CREATED,
    )
    def create_symptom_mood_record(
        payload: SymptomMoodCreateRequest,
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> SymptomMoodOut:
        require_owned_profile(db, current_user.id, payload.profile_id)
        if not payload.symptoms and not payload.mood:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Select at least one symptom chip or mood option.",
            )
        row = CycleSymptomMoodRecord(
            user_id=current_user.id,
            profile_id=payload.profile_id,
            record_date=payload.record_date,
            symptoms_json=json.dumps(payload.symptoms),
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

    @women_router.get("/export")
    def export_womens_data(
        profile_id: int = Query(..., ge=1),
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> dict[str, Any]:
        profile = require_owned_profile(db, current_user.id, profile_id)
        summary = get_womens_summary(profile_id=profile_id, current_user=current_user, db=db)
        return {
            "exported_at": _utc_now().isoformat(),
            "profile_display_name": profile.display_name,
            "data": summary.model_dump(mode="json"),
        }

    @women_router.delete("/data")
    def delete_all_womens_data(
        profile_id: int = Query(..., ge=1),
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> dict[str, bool]:
        require_owned_profile(db, current_user.id, profile_id)
        for model in (MenstrualPeriodRecord, CycleSymptomMoodRecord, WomensWellnessPreference):
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
    # Centralized Product Recommendation Catalog & Honest Affiliate Architecture
    # -----------------------------------------------------------------------
    products_router = APIRouter(prefix="/api/products", tags=["Centralized Product Catalog"])

    @products_router.get("", response_model=list[ProductOut])
    def list_products(
        category: str | None = Query(default=None),
        audience: str | None = Query(default=None),
        tier: str | None = Query(default=None),
        db: Session = Depends(get_db),
    ) -> list[ProductOut]:
        _ensure_catalog_seeded(db)
        stmt = select(ProductCatalogItem).order_by(ProductCatalogItem.sort_order.asc(), ProductCatalogItem.id.asc())
        if category and category in PRODUCT_CATEGORIES:
            stmt = stmt.where(ProductCatalogItem.category == category)
        if tier:
            stmt = stmt.where(ProductCatalogItem.budget_tier == tier)
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
                    price_display=lst.price_display,
                    live_price_verified=lst.live_price_verified,
                    availability=lst.availability,
                    last_checked_at=lst.last_checked_at,
                    disclosure_text=lst.disclosure_text,
                    is_sponsored=lst.is_sponsored,
                )
            )

        return [
            ProductOut(
                id=p.id,
                slug=p.slug,
                name=p.name,
                brand=p.brand,
                category=p.category,
                audience_tags=[str(t) for t in _parse_json_list(p.audience_tags_json)],
                budget_tier=p.budget_tier,
                image_path=p.image_path,
                image_caption=p.image_caption,
                features=[str(f) for f in _parse_json_list(p.features_json)],
                quality_notes=p.quality_notes,
                listings=listings_by_product.get(p.id, []),
            )
            for p in items
        ]

    @products_router.get("/compare/{category}", response_model=dict[str, list[ProductOut]])
    def compare_category_by_tiers(
        category: str,
        audience: str | None = Query(default=None),
        db: Session = Depends(get_db),
    ) -> dict[str, list[ProductOut]]:
        if category not in PRODUCT_CATEGORIES:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown product category.")
        all_items = list_products(category=category, audience=audience, tier=None, db=db)
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
        """Record non-PII outbound click event and either return inspect metadata or 302 redirect."""
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
        # Never reads or attaches health/cycle records for click attribution.
        event = AffiliateClickEvent(
            listing_id=listing.id,
            product_id=listing.product_id,
            user_id=current_user.id if current_user else None,
            referrer_section=referrer,
            is_affiliate_click=listing.is_affiliate,
            attribution_token=token,
            commission_status=comm_status,
        )
        db.add(event)
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
    # Verified Directory, Labs, Appointment Previews & Premium Plans Router
    # -----------------------------------------------------------------------
    directory_router = APIRouter(prefix="/api/directory", tags=["Providers, Labs & Premium Previews"])

    @directory_router.get("/providers", response_model=list[HealthcareProviderOut])
    def list_providers(
        provider_type: str | None = Query(default=None),
        db: Session = Depends(get_db),
    ) -> list[HealthcareProviderOut]:
        _ensure_catalog_seeded(db)
        stmt = select(HealthcareProviderRecord).order_by(HealthcareProviderRecord.id.asc())
        if provider_type:
            stmt = stmt.where(HealthcareProviderRecord.provider_type == provider_type)
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

    @directory_router.get("/labs", response_model=list[DiagnosticLabOut])
    def list_diagnostic_labs(db: Session = Depends(get_db)) -> list[DiagnosticLabOut]:
        _ensure_catalog_seeded(db)
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

    @directory_router.get("/subscriptions", response_model=list[SubscriptionPlanOut])
    def list_subscription_previews(db: Session = Depends(get_db)) -> list[SubscriptionPlanOut]:
        _ensure_catalog_seeded(db)
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
