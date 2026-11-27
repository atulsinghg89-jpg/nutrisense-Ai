"""Authentication, multi-profile management, and profile-scoped nutrition/hydration/activity APIs."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Callable, Literal

from argon2 import PasswordHasher, Type as Argon2Type
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import APIRouter, Cookie, Depends, FastAPI, HTTPException, Query, Response, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, func, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship

SESSION_COOKIE_NAME = "nutrisense_session"
SESSION_TTL_DAYS = 14
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").strip().lower() == "true"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _round2(value: float | None) -> float:
    if value is None:
        return 0.0
    return round(float(value), 2)


_ARGON2_HASHER = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
    type=Argon2Type.ID,
)


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id with unique cryptographic salt."""
    return _ARGON2_HASHER.hash(password)


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against Argon2id (or legacy scrypt) hash in constant time."""
    if stored_hash.startswith("$argon2"):
        try:
            return bool(_ARGON2_HASHER.verify(stored_hash, password))
        except (VerifyMismatchError, InvalidHashError):
            return False

    try:
        scheme, salt_hex, digest_hex = stored_hash.split("$", 2)
        if scheme != "scrypt":
            return False
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
    except ValueError:
        return False

    actual = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=16384,
        r=8,
        p=1,
        dklen=len(expected),
    )
    return hmac.compare_digest(actual, expected)


def needs_password_rehash(stored_hash: str) -> bool:
    """Upgrade legacy hashes or outdated Argon2 parameters on successful login."""
    if not stored_hash.startswith("$argon2id$"):
        return True
    try:
        return bool(_ARGON2_HASHER.check_needs_rehash(stored_hash))
    except InvalidHashError:
        return True


def _hash_session_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _parse_json_list(raw: str | None) -> list[Any]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def _normalize_string_list(values: list[str] | None) -> list[str]:
    if not values:
        return []
    seen: set[str] = set()
    cleaned: list[str] = []
    for item in values:
        text = str(item).strip()
        if not text:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(text[:120])
    return cleaned[:20]


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

ProfileType = Literal["personal", "baby", "patient"]
AudienceChapter = Literal["men", "women", "babies", "patients"]
MeasurementSource = Literal["manual", "ai_scan", "hardware"]
HydrationSource = Literal["manual", "hardware"]


class ProfileGoalsPayload(BaseModel):
    calorie_goal: float | None = Field(default=None, gt=0, le=10000)
    protein_goal: float | None = Field(default=None, ge=0, le=1000)
    carbs_goal: float | None = Field(default=None, ge=0, le=1500)
    fats_goal: float | None = Field(default=None, ge=0, le=500)
    fibre_goal: float | None = Field(default=None, ge=0, le=200)
    water_goal_ml: float | None = Field(default=None, gt=0, le=15000)


class ProfileCreateRequest(ProfileGoalsPayload):
    profile_type: ProfileType = "personal"
    audience_chapter: AudienceChapter = "men"
    display_name: str = Field(..., min_length=1, max_length=120)
    date_of_birth: date | None = None
    age_years: int | None = Field(default=None, ge=0, le=125)
    age_months: int | None = Field(default=None, ge=0, le=360)
    dietary_preference: str | None = Field(default=None, max_length=64)
    activity_level: str | None = Field(default=None, max_length=64)
    health_conditions: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    is_default: bool = False

    @field_validator("display_name")
    @classmethod
    def clean_display_name(cls, v: str) -> str:
        text = v.strip()
        if not text:
            raise ValueError("Display name is required.")
        return text

    @field_validator("date_of_birth")
    @classmethod
    def check_dob(cls, v: date | None) -> date | None:
        if v and v > date.today():
            raise ValueError("Date of birth cannot be in the future.")
        return v


class ProfileUpdateRequest(BaseModel):
    profile_type: ProfileType | None = None
    audience_chapter: AudienceChapter | None = None
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    date_of_birth: date | None = None
    age_years: int | None = Field(default=None, ge=0, le=125)
    age_months: int | None = Field(default=None, ge=0, le=360)
    dietary_preference: str | None = Field(default=None, max_length=64)
    activity_level: str | None = Field(default=None, max_length=64)
    health_conditions: list[str] | None = None
    allergies: list[str] | None = None
    calorie_goal: float | None = Field(default=None, gt=0, le=10000)
    protein_goal: float | None = Field(default=None, ge=0, le=1000)
    carbs_goal: float | None = Field(default=None, ge=0, le=1500)
    fats_goal: float | None = Field(default=None, ge=0, le=500)
    fibre_goal: float | None = Field(default=None, ge=0, le=200)
    water_goal_ml: float | None = Field(default=None, gt=0, le=15000)
    is_default: bool | None = None
    clear_goals: bool = False

    @field_validator("date_of_birth")
    @classmethod
    def check_dob(cls, v: date | None) -> date | None:
        if v and v > date.today():
            raise ValueError("Date of birth cannot be in the future.")
        return v


class UserProfileOut(BaseModel):
    id: int
    user_id: int
    profile_type: str
    audience_chapter: str
    display_name: str
    date_of_birth: date | None
    age_years: int | None
    age_months: int | None
    dietary_preference: str | None
    activity_level: str | None
    health_conditions: list[str]
    allergies: list[str]
    calorie_goal: float | None
    protein_goal: float | None
    carbs_goal: float | None
    fats_goal: float | None
    fibre_goal: float | None
    water_goal_ml: float | None
    is_default: bool
    created_at: datetime


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    account_status: str
    last_login_at: datetime | None
    created_at: datetime


class AuthSessionResponse(BaseModel):
    user: UserOut
    profiles: list[UserProfileOut]


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    initial_profile: ProfileCreateRequest | None = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        email = v.strip().lower()
        if "@" not in email or "." not in email.split("@", 1)[-1]:
            raise ValueError("Please provide a valid email address.")
        return email

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        name = v.strip()
        if len(name) < 2:
            raise ValueError("Full name must be at least 2 characters.")
        return name


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class TrackedIngredientInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    portion_grams: float = Field(..., gt=0, le=10000)
    calories: float = Field(..., ge=0, le=20000)
    protein: float = Field(..., ge=0, le=1000)
    carbs: float = Field(..., ge=0, le=2000)
    fats: float = Field(..., ge=0, le=1000)
    fibre: float = Field(default=0.0, ge=0, le=500)
    sugar: float = Field(default=0.0, ge=0, le=1000)
    sodium_mg: float = Field(default=0.0, ge=0, le=50000)
    source_label: str | None = Field(default=None, max_length=120)


class FoodEntryCreateRequest(BaseModel):
    profile_id: int = Field(..., ge=1)
    meal_name: str = Field(..., min_length=1, max_length=255)
    meal_type: str = Field(default="meal", max_length=50)
    measurement_source: MeasurementSource = "manual"
    hardware_device_id: str | None = Field(default=None, max_length=100)
    total_portion_grams: float = Field(..., gt=0, le=10000)
    calories: float = Field(..., ge=0, le=20000)
    protein: float = Field(..., ge=0, le=1000)
    carbs: float = Field(..., ge=0, le=2000)
    fats: float = Field(..., ge=0, le=1000)
    fibre: float = Field(default=0.0, ge=0, le=500)
    sugar: float = Field(default=0.0, ge=0, le=1000)
    sodium_mg: float = Field(default=0.0, ge=0, le=50000)
    calcium_mg: float | None = Field(default=None, ge=0, le=20000)
    iron_mg: float | None = Field(default=None, ge=0, le=500)
    vitamin_c_mg: float | None = Field(default=None, ge=0, le=10000)
    potassium_mg: float | None = Field(default=None, ge=0, le=25000)
    ingredients: list[TrackedIngredientInput] = Field(default_factory=list)
    image_file_id: int | None = Field(default=None, ge=1)
    image_ref: str | None = Field(default=None, max_length=255)
    ai_estimated: bool = False
    confirmed_by_user: bool = True
    nutrition_sources: list[str] = Field(default_factory=list)
    notes: str | None = Field(default=None, max_length=1000)
    consumed_at: datetime | None = None


class FoodEntryOut(BaseModel):
    id: int
    user_id: int
    profile_id: int
    meal_name: str
    meal_type: str
    measurement_source: str
    hardware_device_id: str | None
    total_portion_grams: float
    calories: float
    protein: float
    carbs: float
    fats: float
    fibre: float
    sugar: float
    sodium_mg: float
    calcium_mg: float | None
    iron_mg: float | None
    vitamin_c_mg: float | None
    potassium_mg: float | None
    ingredients: list[dict[str, Any]]
    image_file_id: int | None
    image_ref: str | None
    ai_estimated: bool
    confirmed_by_user: bool
    confirmed_at: datetime | None
    nutrition_sources: list[str]
    notes: str | None
    consumed_at: datetime


class HydrationCreateRequest(BaseModel):
    profile_id: int = Field(..., ge=1)
    amount_ml: float = Field(..., gt=0, le=5000)
    measurement_source: HydrationSource = "manual"
    hardware_device_id: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=255)
    logged_at: datetime | None = None


class HydrationEntryOut(BaseModel):
    id: int
    user_id: int
    profile_id: int
    amount_ml: float
    measurement_source: str
    hardware_device_id: str | None
    notes: str | None
    logged_at: datetime


class ActivityCreateRequest(BaseModel):
    profile_id: int = Field(..., ge=1)
    activity_type: str = Field(..., min_length=1, max_length=120)
    duration_minutes: int = Field(..., gt=0, le=1440)
    intensity: str | None = Field(default="moderate", max_length=32)
    estimated_calories_burned: float | None = Field(default=None, ge=0, le=10000)
    notes: str | None = Field(default=None, max_length=500)
    logged_at: datetime | None = None

    @field_validator("activity_type")
    @classmethod
    def clean_activity(cls, v: str) -> str:
        text = v.strip()
        if not text:
            raise ValueError("Activity type is required.")
        return text


class ActivityEntryOut(BaseModel):
    id: int
    user_id: int
    profile_id: int
    activity_type: str
    duration_minutes: int
    intensity: str | None
    estimated_calories_burned: float | None
    notes: str | None
    logged_at: datetime


class DailyHistoryPoint(BaseModel):
    date: str
    calories: float
    protein: float
    carbs: float
    fats: float
    fibre: float
    water_ml: float
    activity_minutes: int
    meal_count: int


class SafetyContextOut(BaseModel):
    profile_type: str
    non_diagnostic_notice: str
    recorded_allergies: list[str]
    recorded_conditions: list[str]
    evidence_points: list[str]
    choking_or_infant_alerts: list[str]


class ProfileDashboardResponse(BaseModel):
    profile: UserProfileOut
    selected_date: str | None
    nutrition_summary: dict[str, float | int]
    hydration_summary: dict[str, Any]
    activity_summary: dict[str, Any]
    recent_foods: list[FoodEntryOut]
    hydration_entries: list[HydrationEntryOut]
    activity_entries: list[ActivityEntryOut]
    daily_history: list[DailyHistoryPoint]
    safety_context: SafetyContextOut


# ---------------------------------------------------------------------------
# Module Registration & SQLAlchemy Models
# ---------------------------------------------------------------------------


def register_user_platform(
    app: FastAPI,
    Base: type[DeclarativeBase],
    get_db: Callable[..., Any],
) -> dict[str, Any]:
    """Register auth/profile/tracker ORM models on shared Base and mount routers."""

    class User(Base):
        __tablename__ = "users"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
        full_name: Mapped[str] = mapped_column(String(120), nullable=False)
        password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
        account_status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
        last_login_at: Mapped[datetime | None] = mapped_column(
            DateTime(timezone=True), nullable=True
        )
        created_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )

        sessions: Mapped[list["UserSession"]] = relationship(
            back_populates="user", cascade="all, delete-orphan"
        )
        profiles: Mapped[list["UserProfile"]] = relationship(
            back_populates="user", cascade="all, delete-orphan"
        )

    class UserSession(Base):
        __tablename__ = "user_sessions"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        user_id: Mapped[int] = mapped_column(
            ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
        )
        token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
        expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
        created_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )

        user: Mapped["User"] = relationship(back_populates="sessions")

    class UserProfile(Base):
        __tablename__ = "user_profiles"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        user_id: Mapped[int] = mapped_column(
            ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
        )
        profile_type: Mapped[str] = mapped_column(String(32), nullable=False, default="personal")
        audience_chapter: Mapped[str] = mapped_column(String(32), nullable=False, default="men")
        display_name: Mapped[str] = mapped_column(String(120), nullable=False)
        date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
        age_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
        age_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
        dietary_preference: Mapped[str | None] = mapped_column(String(64), nullable=True)
        activity_level: Mapped[str | None] = mapped_column(String(64), nullable=True)
        health_conditions_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
        allergies_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
        calorie_goal: Mapped[float | None] = mapped_column(Float, nullable=True)
        protein_goal: Mapped[float | None] = mapped_column(Float, nullable=True)
        carbs_goal: Mapped[float | None] = mapped_column(Float, nullable=True)
        fats_goal: Mapped[float | None] = mapped_column(Float, nullable=True)
        fibre_goal: Mapped[float | None] = mapped_column(Float, nullable=True)
        water_goal_ml: Mapped[float | None] = mapped_column(Float, nullable=True)
        is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
        created_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )

        user: Mapped["User"] = relationship(back_populates="profiles")

    class ProfileFoodEntry(Base):
        __tablename__ = "profile_food_entries"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        user_id: Mapped[int] = mapped_column(
            ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
        )
        profile_id: Mapped[int] = mapped_column(
            ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True
        )
        meal_name: Mapped[str] = mapped_column(String(255), nullable=False)
        meal_type: Mapped[str] = mapped_column(String(50), nullable=False, default="meal")
        measurement_source: Mapped[str] = mapped_column(String(32), nullable=False, default="manual")
        hardware_device_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
        total_portion_grams: Mapped[float] = mapped_column(Float, nullable=False)
        calories: Mapped[float] = mapped_column(Float, nullable=False)
        protein: Mapped[float] = mapped_column(Float, nullable=False)
        carbs: Mapped[float] = mapped_column(Float, nullable=False)
        fats: Mapped[float] = mapped_column(Float, nullable=False)
        fibre: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
        sugar: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
        sodium_mg: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
        calcium_mg: Mapped[float | None] = mapped_column(Float, nullable=True)
        iron_mg: Mapped[float | None] = mapped_column(Float, nullable=True)
        vitamin_c_mg: Mapped[float | None] = mapped_column(Float, nullable=True)
        potassium_mg: Mapped[float | None] = mapped_column(Float, nullable=True)
        ingredients_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
        image_file_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
        image_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
        ai_estimated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
        confirmed_by_user: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
        confirmed_at: Mapped[datetime | None] = mapped_column(
            DateTime(timezone=True), nullable=True
        )
        nutrition_sources_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
        notes: Mapped[str | None] = mapped_column(Text, nullable=True)
        consumed_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
        )

    class ProfileHydrationEntry(Base):
        __tablename__ = "profile_hydration_entries"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        user_id: Mapped[int] = mapped_column(
            ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
        )
        profile_id: Mapped[int] = mapped_column(
            ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True
        )
        amount_ml: Mapped[float] = mapped_column(Float, nullable=False)
        measurement_source: Mapped[str] = mapped_column(String(32), nullable=False, default="manual")
        hardware_device_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
        notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
        logged_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
        )

    class ProfileActivityEntry(Base):
        __tablename__ = "profile_activity_entries"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        user_id: Mapped[int] = mapped_column(
            ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
        )
        profile_id: Mapped[int] = mapped_column(
            ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True
        )
        activity_type: Mapped[str] = mapped_column(String(120), nullable=False)
        duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
        intensity: Mapped[str | None] = mapped_column(String(32), nullable=True)
        estimated_calories_burned: Mapped[float | None] = mapped_column(Float, nullable=True)
        notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
        logged_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
        )

    # -----------------------------------------------------------------------
    # Serializers & Helpers
    # -----------------------------------------------------------------------

    def _serialize_user(user: User) -> UserOut:
        return UserOut(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            account_status=user.account_status,
            last_login_at=user.last_login_at,
            created_at=user.created_at,
        )

    def _serialize_profile(profile: UserProfile) -> UserProfileOut:
        return UserProfileOut(
            id=profile.id,
            user_id=profile.user_id,
            profile_type=profile.profile_type,
            audience_chapter=profile.audience_chapter,
            display_name=profile.display_name,
            date_of_birth=profile.date_of_birth,
            age_years=profile.age_years,
            age_months=profile.age_months,
            dietary_preference=profile.dietary_preference,
            activity_level=profile.activity_level,
            health_conditions=[str(x) for x in _parse_json_list(profile.health_conditions_json)],
            allergies=[str(x) for x in _parse_json_list(profile.allergies_json)],
            calorie_goal=profile.calorie_goal,
            protein_goal=profile.protein_goal,
            carbs_goal=profile.carbs_goal,
            fats_goal=profile.fats_goal,
            fibre_goal=profile.fibre_goal,
            water_goal_ml=profile.water_goal_ml,
            is_default=profile.is_default,
            created_at=profile.created_at,
        )

    def _serialize_food(entry: ProfileFoodEntry) -> FoodEntryOut:
        return FoodEntryOut(
            id=entry.id,
            user_id=entry.user_id,
            profile_id=entry.profile_id,
            meal_name=entry.meal_name,
            meal_type=entry.meal_type,
            measurement_source=entry.measurement_source,
            hardware_device_id=entry.hardware_device_id,
            total_portion_grams=entry.total_portion_grams,
            calories=entry.calories,
            protein=entry.protein,
            carbs=entry.carbs,
            fats=entry.fats,
            fibre=entry.fibre,
            sugar=entry.sugar,
            sodium_mg=entry.sodium_mg,
            calcium_mg=entry.calcium_mg,
            iron_mg=entry.iron_mg,
            vitamin_c_mg=entry.vitamin_c_mg,
            potassium_mg=entry.potassium_mg,
            ingredients=[
                x for x in _parse_json_list(entry.ingredients_json) if isinstance(x, dict)
            ],
            image_file_id=entry.image_file_id,
            image_ref=entry.image_ref,
            ai_estimated=entry.ai_estimated,
            confirmed_by_user=entry.confirmed_by_user,
            confirmed_at=entry.confirmed_at,
            nutrition_sources=[str(s) for s in _parse_json_list(entry.nutrition_sources_json)],
            notes=entry.notes,
            consumed_at=entry.consumed_at,
        )

    def _serialize_hydration(entry: ProfileHydrationEntry) -> HydrationEntryOut:
        return HydrationEntryOut(
            id=entry.id,
            user_id=entry.user_id,
            profile_id=entry.profile_id,
            amount_ml=entry.amount_ml,
            measurement_source=entry.measurement_source,
            hardware_device_id=entry.hardware_device_id,
            notes=entry.notes,
            logged_at=entry.logged_at,
        )

    def _serialize_activity(entry: ProfileActivityEntry) -> ActivityEntryOut:
        return ActivityEntryOut(
            id=entry.id,
            user_id=entry.user_id,
            profile_id=entry.profile_id,
            activity_type=entry.activity_type,
            duration_minutes=entry.duration_minutes,
            intensity=entry.intensity,
            estimated_calories_burned=entry.estimated_calories_burned,
            notes=entry.notes,
            logged_at=entry.logged_at,
        )

    def _build_safety_context(profile: UserProfile) -> SafetyContextOut:
        conditions = [str(x) for x in _parse_json_list(profile.health_conditions_json)]
        allergies = [str(x) for x in _parse_json_list(profile.allergies_json)]
        if profile.profile_type == "baby" or profile.audience_chapter == "babies":
            alerts = [
                "Never feed honey to infants under 12 months (WHO/IAP infant botulism precaution).",
                "Avoid choking hazards: modify texture of whole nuts, whole grapes, raw carrot chunks, and popcorn.",
                "Introduce single-ingredient complementary foods progressively around 6+ months alongside breastfeeding/formula unless a pediatrician advises otherwise.",
            ]
            evidence = [
                "Track baby iron-rich purees, vitamin C pairings, and fluid intake carefully by age in months.",
                "Separate true diagnosed infant food allergies (e.g., cow's milk protein, egg, peanut) from routine taste-exposure cautions.",
            ]
            notice = (
                "Educational pediatric tracking only — never substitutes pediatrician or pediatric dietitian guidance."
            )
        elif profile.profile_type == "patient" or profile.audience_chapter == "patients":
            alerts = [
                "Recorded food allergies represent strict avoidance items; general health condition notes indicate awareness patterns to review with your clinician.",
            ]
            evidence = [
                "Clinical diet needs vary significantly across diabetes, hypertension, CKD/renal, celiac, and post-surgical recovery.",
                "Always review carbohydrate distribution, sodium, potassium, and fluid restrictions with a licensed doctor or registered dietitian.",
            ]
            notice = (
                "Non-diagnostic clinical wellness log — NutriSense AI does not diagnose diseases or prescribe medical nutrition therapy."
            )
        else:
            alerts = []
            evidence = [
                "Food allergies listed on this profile are highlighted separately from optional personal preferences.",
                "Optional nutrition or hydration targets are shown only where explicitly configured on this profile.",
            ]
            notice = (
                "Informational nutrition and wellness tracking — consult a healthcare professional before therapeutic diet changes."
            )

        return SafetyContextOut(
            profile_type=profile.profile_type,
            non_diagnostic_notice=notice,
            recorded_allergies=allergies,
            recorded_conditions=conditions,
            evidence_points=evidence,
            choking_or_infant_alerts=alerts,
        )

    def _set_session_cookie(response: Response, raw_token: str) -> None:
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=raw_token,
            httponly=True,
            samesite="lax",
            secure=COOKIE_SECURE,
            max_age=SESSION_TTL_DAYS * 24 * 60 * 60,
            path="/",
        )

    def _issue_session(db: Session, response: Response, user: User) -> None:
        raw_token = secrets.token_urlsafe(32)
        expires = _utc_now() + timedelta(days=SESSION_TTL_DAYS)
        session_row = UserSession(
            user_id=user.id,
            token_hash=_hash_session_token(raw_token),
            expires_at=expires,
        )
        db.add(session_row)
        db.commit()
        _set_session_cookie(response, raw_token)

    def _get_current_user(
        session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
        db: Session = Depends(get_db),
    ) -> User:
        if not session_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required. Please sign in to access personal profiles and logs.",
            )
        token_digest = _hash_session_token(session_token)
        session_row = db.scalar(
            select(UserSession).where(UserSession.token_hash == token_digest)
        )
        if not session_row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your session is invalid or has signed out. Please sign in again.",
            )
        exp = session_row.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp <= _utc_now():
            db.delete(session_row)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your session has expired. Please sign in again.",
            )
        user = db.get(User, session_row.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account not found for active session.",
            )
        return user

    def _require_owned_profile(db: Session, user_id: int, profile_id: int) -> UserProfile:
        profile = db.get(UserProfile, profile_id)
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
        if profile.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this profile.",
            )
        return profile

    def _user_profiles_list(db: Session, user_id: int) -> list[UserProfileOut]:
        rows = list(
            db.scalars(
                select(UserProfile)
                .where(UserProfile.user_id == user_id)
                .order_by(UserProfile.is_default.desc(), UserProfile.created_at.asc(), UserProfile.id.asc())
            ).all()
        )
        return [_serialize_profile(row) for row in rows]

    def _local_day_utc_bounds(target_date: date, tz_offset_minutes: int) -> tuple[datetime, datetime]:
        offset_delta = timedelta(minutes=max(-840, min(840, tz_offset_minutes)))
        local_start = datetime.combine(target_date, time.min)
        local_end = datetime.combine(target_date, time.max)
        utc_start = (local_start - offset_delta).replace(tzinfo=timezone.utc)
        utc_end = (local_end - offset_delta).replace(tzinfo=timezone.utc)
        return utc_start, utc_end

    def _to_local_date_str(dt: datetime, tz_offset_minutes: int) -> str:
        offset_delta = timedelta(minutes=max(-840, min(840, tz_offset_minutes)))
        aware = dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
        return (aware + offset_delta).date().isoformat()

    # -----------------------------------------------------------------------
    # Auth Router
    # -----------------------------------------------------------------------
    auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])

    @auth_router.post(
        "/register",
        response_model=AuthSessionResponse,
        status_code=status.HTTP_201_CREATED,
    )
    def register(
        payload: RegisterRequest,
        response: Response,
        db: Session = Depends(get_db),
    ) -> AuthSessionResponse:
        existing = db.scalar(select(User).where(User.email == payload.email))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists. Try signing in instead.",
            )

        user = User(
            email=payload.email,
            full_name=payload.full_name,
            password_hash=hash_password(payload.password),
            account_status="active",
            last_login_at=_utc_now(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        if payload.initial_profile:
            ip = payload.initial_profile
            profile = UserProfile(
                user_id=user.id,
                profile_type=ip.profile_type,
                audience_chapter=ip.audience_chapter,
                display_name=ip.display_name,
                date_of_birth=ip.date_of_birth,
                age_years=ip.age_years,
                age_months=ip.age_months,
                dietary_preference=ip.dietary_preference,
                activity_level=ip.activity_level,
                health_conditions_json=json.dumps(_normalize_string_list(ip.health_conditions)),
                allergies_json=json.dumps(_normalize_string_list(ip.allergies)),
                calorie_goal=ip.calorie_goal,
                protein_goal=ip.protein_goal,
                carbs_goal=ip.carbs_goal,
                fats_goal=ip.fats_goal,
                fibre_goal=ip.fibre_goal,
                water_goal_ml=ip.water_goal_ml,
                is_default=True,
            )
            db.add(profile)
            db.commit()

        _issue_session(db, response, user)
        return AuthSessionResponse(
            user=_serialize_user(user),
            profiles=_user_profiles_list(db, user.id),
        )

    @auth_router.post("/login", response_model=AuthSessionResponse)
    def login(
        payload: LoginRequest,
        response: Response,
        db: Session = Depends(get_db),
    ) -> AuthSessionResponse:
        user = db.scalar(select(User).where(User.email == payload.email))
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )
        if user.account_status != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account is currently inactive.",
            )
        if needs_password_rehash(user.password_hash):
            user.password_hash = hash_password(payload.password)
        user.last_login_at = _utc_now()
        db.commit()
        _issue_session(db, response, user)
        return AuthSessionResponse(
            user=_serialize_user(user),
            profiles=_user_profiles_list(db, user.id),
        )

    cleanup_hooks: list[Callable[[Session, int], None]] = []

    @auth_router.delete("/account")
    def delete_own_account(
        response: Response,
        current_user: User = Depends(_get_current_user),
        db: Session = Depends(get_db),
    ) -> dict[str, bool]:
        """Permanently delete the authenticated user and all cascade personal records/files."""
        for hook in cleanup_hooks:
            hook(db, current_user.id)
        db.delete(current_user)
        db.commit()
        response.delete_cookie(
            key=SESSION_COOKIE_NAME,
            path="/",
            samesite="lax",
            secure=COOKIE_SECURE,
        )
        return {"account_deleted": True}

    @auth_router.post("/logout")
    def logout(
        response: Response,
        session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
        db: Session = Depends(get_db),
    ) -> dict[str, bool]:
        if session_token:
            token_digest = _hash_session_token(session_token)
            row = db.scalar(select(UserSession).where(UserSession.token_hash == token_digest))
            if row:
                db.delete(row)
                db.commit()
        response.delete_cookie(
            key=SESSION_COOKIE_NAME,
            path="/",
            samesite="lax",
            secure=COOKIE_SECURE,
        )
        return {"ok": True}

    @auth_router.get("/me", response_model=AuthSessionResponse)
    def get_me(
        current_user: User = Depends(_get_current_user),
        db: Session = Depends(get_db),
    ) -> AuthSessionResponse:
        return AuthSessionResponse(
            user=_serialize_user(current_user),
            profiles=_user_profiles_list(db, current_user.id),
        )

    # -----------------------------------------------------------------------
    # Profiles Router
    # -----------------------------------------------------------------------
    profiles_router = APIRouter(prefix="/api/profiles", tags=["User Profiles"])

    @profiles_router.get("", response_model=list[UserProfileOut])
    def list_profiles(
        current_user: User = Depends(_get_current_user),
        db: Session = Depends(get_db),
    ) -> list[UserProfileOut]:
        return _user_profiles_list(db, current_user.id)

    @profiles_router.post(
        "",
        response_model=UserProfileOut,
        status_code=status.HTTP_201_CREATED,
    )
    def create_profile(
        payload: ProfileCreateRequest,
        current_user: User = Depends(_get_current_user),
        db: Session = Depends(get_db),
    ) -> UserProfileOut:
        existing_count = db.scalar(
            select(func.count(UserProfile.id)).where(UserProfile.user_id == current_user.id)
        )
        make_default = payload.is_default or (existing_count == 0)
        if make_default:
            for prev in db.scalars(
                select(UserProfile).where(UserProfile.user_id == current_user.id)
            ).all():
                prev.is_default = False

        profile = UserProfile(
            user_id=current_user.id,
            profile_type=payload.profile_type,
            audience_chapter=payload.audience_chapter,
            display_name=payload.display_name,
            date_of_birth=payload.date_of_birth,
            age_years=payload.age_years,
            age_months=payload.age_months,
            dietary_preference=payload.dietary_preference,
            activity_level=payload.activity_level,
            health_conditions_json=json.dumps(_normalize_string_list(payload.health_conditions)),
            allergies_json=json.dumps(_normalize_string_list(payload.allergies)),
            calorie_goal=payload.calorie_goal,
            protein_goal=payload.protein_goal,
            carbs_goal=payload.carbs_goal,
            fats_goal=payload.fats_goal,
            fibre_goal=payload.fibre_goal,
            water_goal_ml=payload.water_goal_ml,
            is_default=make_default,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return _serialize_profile(profile)

    @profiles_router.patch("/{profile_id}", response_model=UserProfileOut)
    def update_profile(
        profile_id: int,
        payload: ProfileUpdateRequest,
        current_user: User = Depends(_get_current_user),
        db: Session = Depends(get_db),
    ) -> UserProfileOut:
        profile = _require_owned_profile(db, current_user.id, profile_id)
        data = payload.model_dump(exclude_unset=True)

        if data.get("is_default"):
            for prev in db.scalars(
                select(UserProfile).where(UserProfile.user_id == current_user.id)
            ).all():
                prev.is_default = prev.id == profile.id

        if data.pop("clear_goals", False):
            profile.calorie_goal = None
            profile.protein_goal = None
            profile.carbs_goal = None
            profile.fats_goal = None
            profile.fibre_goal = None
            profile.water_goal_ml = None

        if "health_conditions" in data:
            profile.health_conditions_json = json.dumps(
                _normalize_string_list(data.pop("health_conditions"))
            )
        if "allergies" in data:
            profile.allergies_json = json.dumps(_normalize_string_list(data.pop("allergies")))
        if "display_name" in data and data["display_name"] is not None:
            data["display_name"] = data["display_name"].strip()

        for key, value in data.items():
            if hasattr(profile, key):
                setattr(profile, key, value)

        db.commit()
        db.refresh(profile)
        return _serialize_profile(profile)

    @profiles_router.delete("/{profile_id}", status_code=status.HTTP_200_OK)
    def delete_profile(
        profile_id: int,
        current_user: User = Depends(_get_current_user),
        db: Session = Depends(get_db),
    ) -> dict[str, bool]:
        profile = _require_owned_profile(db, current_user.id, profile_id)
        was_default = profile.is_default
        db.delete(profile)
        db.commit()

        if was_default:
            replacement = db.scalar(
                select(UserProfile)
                .where(UserProfile.user_id == current_user.id)
                .order_by(UserProfile.created_at.asc())
            )
            if replacement:
                replacement.is_default = True
                db.commit()
        return {"deleted": True}

    # -----------------------------------------------------------------------
    # Tracker Router (Food + Hydration + Activity + Dashboard Summary)
    # -----------------------------------------------------------------------
    tracker_router = APIRouter(prefix="/api/tracker", tags=["Profile Tracking"])

    @tracker_router.post(
        "/foods",
        response_model=FoodEntryOut,
        status_code=status.HTTP_201_CREATED,
    )
    def create_food_entry(
        payload: FoodEntryCreateRequest,
        current_user: User = Depends(_get_current_user),
        db: Session = Depends(get_db),
    ) -> FoodEntryOut:
        _require_owned_profile(db, current_user.id, payload.profile_id)
        entry = ProfileFoodEntry(
            user_id=current_user.id,
            profile_id=payload.profile_id,
            meal_name=payload.meal_name.strip(),
            meal_type=payload.meal_type.strip().lower() or "meal",
            measurement_source=payload.measurement_source,
            hardware_device_id=(payload.hardware_device_id or "").strip() or None,
            total_portion_grams=_round2(payload.total_portion_grams),
            calories=_round2(payload.calories),
            protein=_round2(payload.protein),
            carbs=_round2(payload.carbs),
            fats=_round2(payload.fats),
            fibre=_round2(payload.fibre),
            sugar=_round2(payload.sugar),
            sodium_mg=_round2(payload.sodium_mg),
            calcium_mg=_round2(payload.calcium_mg) if payload.calcium_mg is not None else None,
            iron_mg=_round2(payload.iron_mg) if payload.iron_mg is not None else None,
            vitamin_c_mg=(
                _round2(payload.vitamin_c_mg) if payload.vitamin_c_mg is not None else None
            ),
            potassium_mg=(
                _round2(payload.potassium_mg) if payload.potassium_mg is not None else None
            ),
            ingredients_json=json.dumps([item.model_dump() for item in payload.ingredients]),
            image_file_id=payload.image_file_id,
            image_ref=(payload.image_ref or "").strip() or None,
            ai_estimated=payload.ai_estimated,
            confirmed_by_user=payload.confirmed_by_user,
            confirmed_at=_utc_now() if payload.confirmed_by_user else None,
            nutrition_sources_json=json.dumps(_normalize_string_list(payload.nutrition_sources)),
            notes=(payload.notes or "").strip() or None,
            consumed_at=payload.consumed_at or _utc_now(),
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return _serialize_food(entry)

    @tracker_router.get("/foods", response_model=list[FoodEntryOut])
    def list_food_entries(
        profile_id: int = Query(..., ge=1),
        target_date: date | None = Query(default=None, alias="date"),
        tz_offset_minutes: int = Query(default=0, ge=-840, le=840),
        limit: int = Query(default=100, ge=1, le=500),
        current_user: User = Depends(_get_current_user),
        db: Session = Depends(get_db),
    ) -> list[FoodEntryOut]:
        _require_owned_profile(db, current_user.id, profile_id)
        stmt = (
            select(ProfileFoodEntry)
            .where(
                ProfileFoodEntry.user_id == current_user.id,
                ProfileFoodEntry.profile_id == profile_id,
            )
            .order_by(ProfileFoodEntry.consumed_at.desc(), ProfileFoodEntry.id.desc())
        )
        if target_date:
            start_utc, end_utc = _local_day_utc_bounds(target_date, tz_offset_minutes)
            stmt = stmt.where(
                ProfileFoodEntry.consumed_at >= start_utc,
                ProfileFoodEntry.consumed_at <= end_utc,
            )
        rows = list(db.scalars(stmt.limit(limit)).all())
        return [_serialize_food(row) for row in rows]

    @tracker_router.delete("/foods/{entry_id}")
    def delete_food_entry(
        entry_id: int,
        current_user: User = Depends(_get_current_user),
        db: Session = Depends(get_db),
    ) -> dict[str, bool]:
        entry = db.get(ProfileFoodEntry, entry_id)
        if not entry or entry.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food entry not found.")
        db.delete(entry)
        db.commit()
        return {"deleted": True}

    @tracker_router.post(
        "/hydration",
        response_model=HydrationEntryOut,
        status_code=status.HTTP_201_CREATED,
    )
    def create_hydration_entry(
        payload: HydrationCreateRequest,
        current_user: User = Depends(_get_current_user),
        db: Session = Depends(get_db),
    ) -> HydrationEntryOut:
        _require_owned_profile(db, current_user.id, payload.profile_id)
        entry = ProfileHydrationEntry(
            user_id=current_user.id,
            profile_id=payload.profile_id,
            amount_ml=_round2(payload.amount_ml),
            measurement_source=payload.measurement_source,
            hardware_device_id=(payload.hardware_device_id or "").strip() or None,
            notes=(payload.notes or "").strip() or None,
            logged_at=payload.logged_at or _utc_now(),
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return _serialize_hydration(entry)

    @tracker_router.get("/hydration", response_model=list[HydrationEntryOut])
    def list_hydration_entries(
        profile_id: int = Query(..., ge=1),
        target_date: date | None = Query(default=None, alias="date"),
        tz_offset_minutes: int = Query(default=0, ge=-840, le=840),
        current_user: User = Depends(_get_current_user),
        db: Session = Depends(get_db),
    ) -> list[HydrationEntryOut]:
        _require_owned_profile(db, current_user.id, profile_id)
        stmt = (
            select(ProfileHydrationEntry)
            .where(
                ProfileHydrationEntry.user_id == current_user.id,
                ProfileHydrationEntry.profile_id == profile_id,
            )
            .order_by(ProfileHydrationEntry.logged_at.desc(), ProfileHydrationEntry.id.desc())
        )
        if target_date:
            start_utc, end_utc = _local_day_utc_bounds(target_date, tz_offset_minutes)
            stmt = stmt.where(
                ProfileHydrationEntry.logged_at >= start_utc,
                ProfileHydrationEntry.logged_at <= end_utc,
            )
        rows = list(db.scalars(stmt.limit(200)).all())
        return [_serialize_hydration(row) for row in rows]

    @tracker_router.delete("/hydration/{entry_id}")
    def delete_hydration_entry(
        entry_id: int,
        current_user: User = Depends(_get_current_user),
        db: Session = Depends(get_db),
    ) -> dict[str, bool]:
        entry = db.get(ProfileHydrationEntry, entry_id)
        if not entry or entry.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Hydration entry not found."
            )
        db.delete(entry)
        db.commit()
        return {"deleted": True}

    @tracker_router.post(
        "/activities",
        response_model=ActivityEntryOut,
        status_code=status.HTTP_201_CREATED,
    )
    def create_activity_entry(
        payload: ActivityCreateRequest,
        current_user: User = Depends(_get_current_user),
        db: Session = Depends(get_db),
    ) -> ActivityEntryOut:
        _require_owned_profile(db, current_user.id, payload.profile_id)
        entry = ProfileActivityEntry(
            user_id=current_user.id,
            profile_id=payload.profile_id,
            activity_type=payload.activity_type,
            duration_minutes=payload.duration_minutes,
            intensity=(payload.intensity or "").strip() or None,
            estimated_calories_burned=(
                _round2(payload.estimated_calories_burned)
                if payload.estimated_calories_burned is not None
                else None
            ),
            notes=(payload.notes or "").strip() or None,
            logged_at=payload.logged_at or _utc_now(),
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return _serialize_activity(entry)

    @tracker_router.get("/activities", response_model=list[ActivityEntryOut])
    def list_activity_entries(
        profile_id: int = Query(..., ge=1),
        target_date: date | None = Query(default=None, alias="date"),
        tz_offset_minutes: int = Query(default=0, ge=-840, le=840),
        current_user: User = Depends(_get_current_user),
        db: Session = Depends(get_db),
    ) -> list[ActivityEntryOut]:
        _require_owned_profile(db, current_user.id, profile_id)
        stmt = (
            select(ProfileActivityEntry)
            .where(
                ProfileActivityEntry.user_id == current_user.id,
                ProfileActivityEntry.profile_id == profile_id,
            )
            .order_by(ProfileActivityEntry.logged_at.desc(), ProfileActivityEntry.id.desc())
        )
        if target_date:
            start_utc, end_utc = _local_day_utc_bounds(target_date, tz_offset_minutes)
            stmt = stmt.where(
                ProfileActivityEntry.logged_at >= start_utc,
                ProfileActivityEntry.logged_at <= end_utc,
            )
        rows = list(db.scalars(stmt.limit(200)).all())
        return [_serialize_activity(row) for row in rows]

    @tracker_router.delete("/activities/{entry_id}")
    def delete_activity_entry(
        entry_id: int,
        current_user: User = Depends(_get_current_user),
        db: Session = Depends(get_db),
    ) -> dict[str, bool]:
        entry = db.get(ProfileActivityEntry, entry_id)
        if not entry or entry.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Activity entry not found."
            )
        db.delete(entry)
        db.commit()
        return {"deleted": True}

    @tracker_router.get("/dashboard", response_model=ProfileDashboardResponse)
    def get_profile_dashboard(
        profile_id: int = Query(..., ge=1),
        target_date: date | None = Query(default=None, alias="date"),
        days: int = Query(default=7, ge=1, le=31),
        tz_offset_minutes: int = Query(default=0, ge=-840, le=840),
        current_user: User = Depends(_get_current_user),
        db: Session = Depends(get_db),
    ) -> ProfileDashboardResponse:
        profile = _require_owned_profile(db, current_user.id, profile_id)

        anchor_date = target_date or (
            _utc_now() + timedelta(minutes=max(-840, min(840, tz_offset_minutes)))
        ).date()
        history_start_date = anchor_date - timedelta(days=days - 1)
        range_start_utc, _ = _local_day_utc_bounds(history_start_date, tz_offset_minutes)
        _, range_end_utc = _local_day_utc_bounds(anchor_date, tz_offset_minutes)

        # Fetch all rows across the history window to build date-wise trends & selected-day view.
        window_foods = list(
            db.scalars(
                select(ProfileFoodEntry)
                .where(
                    ProfileFoodEntry.user_id == current_user.id,
                    ProfileFoodEntry.profile_id == profile_id,
                    ProfileFoodEntry.consumed_at >= range_start_utc,
                    ProfileFoodEntry.consumed_at <= range_end_utc,
                )
                .order_by(ProfileFoodEntry.consumed_at.desc(), ProfileFoodEntry.id.desc())
            ).all()
        )
        window_hydration = list(
            db.scalars(
                select(ProfileHydrationEntry)
                .where(
                    ProfileHydrationEntry.user_id == current_user.id,
                    ProfileHydrationEntry.profile_id == profile_id,
                    ProfileHydrationEntry.logged_at >= range_start_utc,
                    ProfileHydrationEntry.logged_at <= range_end_utc,
                )
                .order_by(ProfileHydrationEntry.logged_at.desc(), ProfileHydrationEntry.id.desc())
            ).all()
        )
        window_activities = list(
            db.scalars(
                select(ProfileActivityEntry)
                .where(
                    ProfileActivityEntry.user_id == current_user.id,
                    ProfileActivityEntry.profile_id == profile_id,
                    ProfileActivityEntry.logged_at >= range_start_utc,
                    ProfileActivityEntry.logged_at <= range_end_utc,
                )
                .order_by(ProfileActivityEntry.logged_at.desc(), ProfileActivityEntry.id.desc())
            ).all()
        )

        # Build date-wise map covering every day in [history_start_date, anchor_date]
        day_buckets: dict[str, dict[str, Any]] = {}
        for i in range(days):
            d_str = (history_start_date + timedelta(days=i)).isoformat()
            day_buckets[d_str] = {
                "date": d_str,
                "calories": 0.0,
                "protein": 0.0,
                "carbs": 0.0,
                "fats": 0.0,
                "fibre": 0.0,
                "water_ml": 0.0,
                "activity_minutes": 0,
                "meal_count": 0,
            }

        for item in window_foods:
            d_str = _to_local_date_str(item.consumed_at, tz_offset_minutes)
            if d_str in day_buckets:
                b = day_buckets[d_str]
                b["calories"] += item.calories
                b["protein"] += item.protein
                b["carbs"] += item.carbs
                b["fats"] += item.fats
                b["fibre"] += item.fibre
                b["meal_count"] += 1

        for h in window_hydration:
            d_str = _to_local_date_str(h.logged_at, tz_offset_minutes)
            if d_str in day_buckets:
                day_buckets[d_str]["water_ml"] += h.amount_ml

        for a in window_activities:
            d_str = _to_local_date_str(a.logged_at, tz_offset_minutes)
            if d_str in day_buckets:
                day_buckets[d_str]["activity_minutes"] += a.duration_minutes

        selected_date_str = target_date.isoformat() if target_date else anchor_date.isoformat()

        day_foods = [
            f for f in window_foods if _to_local_date_str(f.consumed_at, tz_offset_minutes) == selected_date_str
        ]
        day_hydration = [
            h for h in window_hydration if _to_local_date_str(h.logged_at, tz_offset_minutes) == selected_date_str
        ]
        day_activities = [
            a for a in window_activities if _to_local_date_str(a.logged_at, tz_offset_minutes) == selected_date_str
        ]

        nutrition_summary = {
            "meal_count": len(day_foods),
            "total_portion_grams": _round2(sum(f.total_portion_grams for f in day_foods)),
            "calories": _round2(sum(f.calories for f in day_foods)),
            "protein": _round2(sum(f.protein for f in day_foods)),
            "carbs": _round2(sum(f.carbs for f in day_foods)),
            "fats": _round2(sum(f.fats for f in day_foods)),
            "fibre": _round2(sum(f.fibre for f in day_foods)),
            "sugar": _round2(sum(f.sugar for f in day_foods)),
            "sodium_mg": _round2(sum(f.sodium_mg for f in day_foods)),
            "calcium_mg": _round2(sum(f.calcium_mg or 0.0 for f in day_foods)),
            "iron_mg": _round2(sum(f.iron_mg or 0.0 for f in day_foods)),
            "vitamin_c_mg": _round2(sum(f.vitamin_c_mg or 0.0 for f in day_foods)),
            "potassium_mg": _round2(sum(f.potassium_mg or 0.0 for f in day_foods)),
        }

        hydration_summary = {
            "total_ml": _round2(sum(h.amount_ml for h in day_hydration)),
            "entries_count": len(day_hydration),
            "goal_ml": profile.water_goal_ml,
        }

        activity_summary = {
            "total_minutes": sum(a.duration_minutes for a in day_activities),
            "entries_count": len(day_activities),
        }

        history_points = [
            DailyHistoryPoint(
                date=b["date"],
                calories=_round2(b["calories"]),
                protein=_round2(b["protein"]),
                carbs=_round2(b["carbs"]),
                fats=_round2(b["fats"]),
                fibre=_round2(b["fibre"]),
                water_ml=_round2(b["water_ml"]),
                activity_minutes=int(b["activity_minutes"]),
                meal_count=int(b["meal_count"]),
            )
            for b in day_buckets.values()
        ]

        return ProfileDashboardResponse(
            profile=_serialize_profile(profile),
            selected_date=selected_date_str,
            nutrition_summary=nutrition_summary,
            hydration_summary=hydration_summary,
            activity_summary=activity_summary,
            recent_foods=[_serialize_food(f) for f in day_foods],
            hydration_entries=[_serialize_hydration(h) for h in day_hydration],
            activity_entries=[_serialize_activity(a) for a in day_activities],
            daily_history=history_points,
            safety_context=_build_safety_context(profile),
        )

    def _get_optional_user(
        session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
        db: Session = Depends(get_db),
    ) -> User | None:
        if not session_token:
            return None
        token_digest = _hash_session_token(session_token)
        session_row = db.scalar(
            select(UserSession).where(UserSession.token_hash == token_digest)
        )
        if not session_row:
            return None
        exp = session_row.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp <= _utc_now():
            return None
        return db.get(User, session_row.user_id)

    app.include_router(auth_router)
    app.include_router(profiles_router)
    app.include_router(tracker_router)

    return {
        "User": User,
        "UserProfile": UserProfile,
        "ProfileFoodEntry": ProfileFoodEntry,
        "ProfileHydrationEntry": ProfileHydrationEntry,
        "ProfileActivityEntry": ProfileActivityEntry,
        "get_current_user": _get_current_user,
        "get_optional_user": _get_optional_user,
        "require_owned_profile": _require_owned_profile,
        "add_account_cleanup_hook": cleanup_hooks.append,
    }
