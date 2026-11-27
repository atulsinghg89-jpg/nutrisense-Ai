from contextlib import asynccontextmanager
from datetime import date, datetime, time, timezone
import json
import logging
import os
from pathlib import Path
import tempfile
from typing import Generator, Literal

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, create_engine, func, select, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

from nutrition_db import resolve_ingredient_nutrition

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

logger = logging.getLogger("nutrisense")

MAX_IMAGE_BYTES = 20 * 1024 * 1024  # 20 MB
FILES_API_THRESHOLD_BYTES = 10 * 1024 * 1024  # Use Gemini Files API cleanly for >10 MB uploads
SUPPORTED_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
EXTENSION_MIME_MAP = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def _normalize_database_url(raw_url: str) -> str:
    """Ensure PostgreSQL URLs explicitly target the installed psycopg2 driver."""
    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+psycopg2://", 1)
    if raw_url.startswith("postgresql://"):
        return raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return raw_url


RAW_DATABASE_URL = os.getenv("DATABASE_URL")
if not RAW_DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set.")

DATABASE_URL = _normalize_database_url(RAW_DATABASE_URL)
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
GEMINI_FALLBACK_MODELS = list(
    dict.fromkeys([
        GEMINI_MODEL,
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.8-flash",
    ])
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class MealLog(Base):
    """Persistent meal log header with aggregated macro totals."""

    __tablename__ = "meal_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    meal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    meal_type: Mapped[str] = mapped_column(String(50), nullable=False, default="meal", index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_portion_grams: Mapped[float] = mapped_column(Float, nullable=False)
    total_calories: Mapped[float] = mapped_column(Float, nullable=False)
    total_protein: Mapped[float] = mapped_column(Float, nullable=False)
    total_carbs: Mapped[float] = mapped_column(Float, nullable=False)
    total_fats: Mapped[float] = mapped_column(Float, nullable=False)
    logged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    items: Mapped[list["MealFoodItem"]] = relationship(
        back_populates="meal_log",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class MealFoodItem(Base):
    """Individual food item belonging to a logged meal."""

    __tablename__ = "meal_food_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    meal_log_id: Mapped[int] = mapped_column(
        ForeignKey("meal_logs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    portion_grams: Mapped[float] = mapped_column(Float, nullable=False)
    calories: Mapped[float] = mapped_column(Float, nullable=False)
    protein: Mapped[float] = mapped_column(Float, nullable=False)
    carbs: Mapped[float] = mapped_column(Float, nullable=False)
    fats: Mapped[float] = mapped_column(Float, nullable=False)
    logged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    meal_log: Mapped["MealLog"] = relationship(back_populates="items")


# --- Pydantic Schemas ---


class MacroTotals(BaseModel):
    portion_grams: float = Field(..., ge=0)
    calories: float = Field(..., ge=0)
    protein: float = Field(..., ge=0)
    carbs: float = Field(..., ge=0)
    fats: float = Field(..., ge=0)


class FoodItemMacros(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    portion_grams: float = Field(..., ge=0)
    calories: float = Field(..., ge=0)
    protein: float = Field(..., ge=0)
    carbs: float = Field(..., ge=0)
    fats: float = Field(..., ge=0)


class ScannedFoodItem(FoodItemMacros):
    calories_per_100g: float = Field(..., ge=0)
    protein_per_100g: float = Field(..., ge=0)
    carbs_per_100g: float = Field(..., ge=0)
    fats_per_100g: float = Field(..., ge=0)
    fibre_per_100g: float = Field(default=0.0, ge=0)
    sugar_per_100g: float = Field(default=0.0, ge=0)
    sodium_mg_per_100g: float = Field(default=0.0, ge=0)
    fibre: float = Field(default=0.0, ge=0)
    sugar: float = Field(default=0.0, ge=0)
    sodium_mg: float = Field(default=0.0, ge=0)
    source_type: Literal["icmr_nin", "usda_fdc", "unmatched"] = "icmr_nin"
    source_label: str = "ICMR–NIN / USDA Reference"
    confident: bool = True
    needs_confirmation: bool = False
    uncertainty_reason: str | None = None


class EstimatedPortion(BaseModel):
    amount: float = Field(..., ge=0)
    unit: str = "g"
    label: str


class AnalyzedIngredient(BaseModel):
    id: str
    name: str
    canonical_match: str | None = None
    estimated_grams: float = Field(..., ge=0)
    unit: str = "g"
    confident: bool = True
    needs_confirmation: bool = False
    confirmed_by_user: bool = False
    uncertainty_reason: str | None = None
    source_type: Literal["icmr_nin", "usda_fdc", "unmatched"]
    source_label: str
    calories: float = Field(..., ge=0)
    protein: float = Field(..., ge=0)
    carbohydrates: float = Field(..., ge=0)
    fats: float = Field(..., ge=0)
    fibre: float = Field(default=0.0, ge=0)
    sugar: float = Field(default=0.0, ge=0)
    sodium_mg: float = Field(default=0.0, ge=0)
    calories_per_100g: float = Field(default=0.0, ge=0)
    protein_per_100g: float = Field(default=0.0, ge=0)
    carbs_per_100g: float = Field(default=0.0, ge=0)
    fats_per_100g: float = Field(default=0.0, ge=0)
    fibre_per_100g: float = Field(default=0.0, ge=0)
    sugar_per_100g: float = Field(default=0.0, ge=0)
    sodium_mg_per_100g: float = Field(default=0.0, ge=0)
    calcium_mg: float = Field(default=0.0, ge=0)
    iron_mg: float = Field(default=0.0, ge=0)
    vitamin_c_mg: float = Field(default=0.0, ge=0)
    potassium_mg: float = Field(default=0.0, ge=0)


class NutrientDetailMetric(BaseModel):
    name: str
    amount: float = Field(..., ge=0)
    unit: str
    source: str


class HealthierAlternative(BaseModel):
    name: str = Field(..., description="Name of the healthier food alternative")
    replaces: str = Field(..., description="Detected food item or meal component it replaces")
    reason: str = Field(..., description="Why this option is nutritionally better")
    estimated_calories: float = Field(..., ge=0)
    protein: float = Field(..., ge=0)
    carbs: float = Field(..., ge=0)
    fats: float = Field(..., ge=0)


class ScanResponse(BaseModel):
    food_name: str
    food_description: str
    ingredients: list[AnalyzedIngredient]
    estimated_portion: EstimatedPortion
    portion_confidence: Literal["high", "medium", "low"]
    calories: float = Field(..., ge=0)
    protein: float = Field(..., ge=0)
    carbohydrates: float = Field(..., ge=0)
    fats: float = Field(..., ge=0)
    fibre: float = Field(..., ge=0)
    sugar: float = Field(..., ge=0)
    sodium: NutrientDetailMetric
    other_available_nutrients: list[NutrientDetailMetric]
    confidence: Literal["high", "medium", "low"]
    data_sources: list[str]
    analysis_limitations: list[str]
    model_used: str
    uploaded_file_id: int | None = None
    uploaded_image_ref: str | None = None
    items: list[ScannedFoodItem]
    totals: MacroTotals
    healthier_alternatives: list[HealthierAlternative]


class GeminiDetectedIngredient(BaseModel):
    name: str = Field(..., description="Ingredient name (e.g. Noodles, Tomato, Paneer, Cooking Oil, Possible Soy Sauce)")
    estimated_grams: float = Field(..., description="Estimated weight in grams for this ingredient in the meal")
    confident: bool = Field(
        ...,
        description="False for hidden/uncertain ingredients like cooking oils, butter, ghee, sauces, salt, or obscured items",
    )
    uncertainty_reason: str | None = Field(
        default=None,
        description="Short explanation when confident is False",
    )


class GeminiHealthierAlternative(BaseModel):
    name: str = Field(..., description="Name of the healthier food alternative")
    replaces: str = Field(..., description="Detected food item or meal component it replaces")
    reason: str = Field(..., description="Why this option is nutritionally better")
    estimated_calories: float = Field(..., description="Estimated calories for an equivalent serving")
    protein: float = Field(..., description="Estimated protein in grams")
    carbs: float = Field(..., description="Estimated carbohydrates in grams")
    fats: float = Field(..., description="Estimated fats in grams")


class GeminiVisionAnalysis(BaseModel):
    is_food: bool = Field(..., description="True if edible food or drinks are visible in the image")
    food_name: str = Field(..., description="Primary identified dish or meal title")
    food_description: str = Field(..., description="Concise 1-2 sentence objective description of what appears on the plate")
    estimated_portion_grams: float = Field(..., description="Estimated total edible portion size in grams")
    portion_confidence: Literal["high", "medium", "low"] = Field(
        ...,
        description="Visual certainty of the portion estimate",
    )
    ingredients: list[GeminiDetectedIngredient] = Field(
        ...,
        description="Individual visible or likely ingredients with estimated gram weights and certainty flags",
    )
    healthier_alternatives: list[GeminiHealthierAlternative] = Field(
        ...,
        description="Exactly 3 practical healthier food alternatives tailored to the detected meal",
    )


class RecalculateItemInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    portion_grams: float = Field(..., ge=0, description="Updated portion size in grams")
    calories_per_100g: float | None = Field(default=None, ge=0)
    protein_per_100g: float | None = Field(default=None, ge=0)
    carbs_per_100g: float | None = Field(default=None, ge=0)
    fats_per_100g: float | None = Field(default=None, ge=0)
    fibre_per_100g: float | None = Field(default=None, ge=0)
    sugar_per_100g: float | None = Field(default=None, ge=0)
    sodium_mg_per_100g: float | None = Field(default=None, ge=0)
    original_portion_grams: float | None = Field(default=None, gt=0)
    calories: float | None = Field(default=None, ge=0)
    protein: float | None = Field(default=None, ge=0)
    carbs: float | None = Field(default=None, ge=0)
    fats: float | None = Field(default=None, ge=0)
    source_type: Literal["icmr_nin", "usda_fdc", "unmatched"] = "icmr_nin"
    source_label: str = "ICMR–NIN / USDA Reference"
    confident: bool = True
    needs_confirmation: bool = False
    uncertainty_reason: str | None = None


class RecalculateRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "items": [
                    {
                        "name": "Grilled Chicken Breast",
                        "portion_grams": 225,
                        "calories_per_100g": 165,
                        "protein_per_100g": 31,
                        "carbs_per_100g": 0,
                        "fats_per_100g": 3.6,
                    },
                    {
                        "name": "Steamed White Rice",
                        "portion_grams": 120,
                        "original_portion_grams": 180,
                        "calories": 234,
                        "protein": 4.9,
                        "carbs": 50.4,
                        "fats": 0.5,
                    },
                ]
            }
        }
    )

    items: list[RecalculateItemInput] = Field(..., min_length=1)


class RecalculateResponse(BaseModel):
    items: list[ScannedFoodItem]
    totals: MacroTotals


class MealLogCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meal_name": "Grilled Chicken Rice Bowl",
                "meal_type": "lunch",
                "notes": "Logged after adjusting rice portion",
                "items": [
                    {
                        "name": "Grilled Chicken Breast",
                        "portion_grams": 225,
                        "calories": 371.25,
                        "protein": 69.75,
                        "carbs": 0.0,
                        "fats": 8.1,
                    },
                    {
                        "name": "Steamed White Rice",
                        "portion_grams": 120,
                        "calories": 156.0,
                        "protein": 3.27,
                        "carbs": 33.6,
                        "fats": 0.33,
                    },
                ],
            }
        }
    )

    meal_name: str | None = Field(default=None, max_length=255)
    meal_type: str = Field(default="meal", min_length=1, max_length=50)
    notes: str | None = Field(default=None, max_length=1000)
    items: list[FoodItemMacros] = Field(..., min_length=1)


class LoggedFoodItemResponse(FoodItemMacros):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meal_log_id: int
    logged_at: datetime


class DashboardFoodEntry(FoodItemMacros):
    id: int
    meal_log_id: int
    meal_name: str
    meal_type: str
    logged_at: datetime


class MealLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meal_name: str
    meal_type: str
    notes: str | None
    total_portion_grams: float
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fats: float
    logged_at: datetime
    items: list[LoggedFoodItemResponse]


class DashboardSummary(BaseModel):
    total_meals: int
    total_items: int
    total_portion_grams: float
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fats: float


class DashboardFoodsResponse(BaseModel):
    summary: DashboardSummary
    meals: list[MealLogResponse]
    foods: list[DashboardFoodEntry]


class HealthResponse(BaseModel):
    status: str
    database: str


# --- Helpers ---


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _round2(value: float) -> float:
    return round(float(value), 2)


def _compute_totals(items: list[FoodItemMacros] | list[ScannedFoodItem]) -> MacroTotals:
    return MacroTotals(
        portion_grams=_round2(sum(item.portion_grams for item in items)),
        calories=_round2(sum(item.calories for item in items)),
        protein=_round2(sum(item.protein for item in items)),
        carbs=_round2(sum(item.carbs for item in items)),
        fats=_round2(sum(item.fats for item in items)),
    )


def _detect_validated_image_mime(upload: UploadFile, payload: bytes) -> str:
    """Inspect binary file signatures to ensure actual MIME type is a valid JPG, PNG, or WEBP."""
    actual_mime: str | None = None
    if payload.startswith(b"\xff\xd8\xff"):
        actual_mime = "image/jpeg"
    elif payload.startswith(b"\x89PNG\r\n\x1a\n"):
        actual_mime = "image/png"
    elif len(payload) >= 12 and payload[:4] == b"RIFF" and payload[8:12] == b"WEBP":
        actual_mime = "image/webp"

    if not actual_mime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported or invalid image bytes. Upload a valid JPG, JPEG, PNG, or WEBP image.",
        )

    declared_type = (upload.content_type or "").split(";")[0].strip().lower()
    if declared_type == "image/jpg":
        declared_type = "image/jpeg"
    if declared_type.startswith("image/") and declared_type != actual_mime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"MIME type mismatch: uploaded file bytes are {actual_mime}, "
                f"but header declared {declared_type}."
            ),
        )

    suffix = Path(upload.filename or "").suffix.lower()
    if suffix and suffix in EXTENSION_MIME_MAP and EXTENSION_MIME_MAP[suffix] != actual_mime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File extension '{suffix}' does not match actual image format ({actual_mime})."
            ),
        )

    return actual_mime


def _to_healthier_alternative(alt: GeminiHealthierAlternative) -> HealthierAlternative:
    alt_db = resolve_ingredient_nutrition(alt.name, use_live_usda=False)
    if alt_db is not None:
        # Ground swap macros to 150g standard serving from DB if available, otherwise keep estimate
        factor = 1.5
        return HealthierAlternative(
            name=alt.name.strip(),
            replaces=alt.replaces.strip(),
            reason=alt.reason.strip(),
            estimated_calories=_round2(alt_db.calories * factor),
            protein=_round2(alt_db.protein * factor),
            carbs=_round2(alt_db.carbohydrates * factor),
            fats=_round2(alt_db.fats * factor),
        )
    return HealthierAlternative(
        name=alt.name.strip(),
        replaces=alt.replaces.strip(),
        reason=alt.reason.strip(),
        estimated_calories=_round2(max(float(alt.estimated_calories), 0.0)),
        protein=_round2(max(float(alt.protein), 0.0)),
        carbs=_round2(max(float(alt.carbs), 0.0)),
        fats=_round2(max(float(alt.fats), 0.0)),
    )


def _recalculate_single_item(item: RecalculateItemInput) -> ScannedFoodItem:
    per_100g_fields = (
        item.calories_per_100g,
        item.protein_per_100g,
        item.carbs_per_100g,
        item.fats_per_100g,
    )
    if all(value is not None for value in per_100g_fields):
        factor = item.portion_grams / 100.0
        fibre_100 = float(item.fibre_per_100g or 0.0)
        sugar_100 = float(item.sugar_per_100g or 0.0)
        sodium_100 = float(item.sodium_mg_per_100g or 0.0)
        return ScannedFoodItem(
            name=item.name.strip(),
            portion_grams=_round2(item.portion_grams),
            calories=_round2(item.calories_per_100g * factor),
            protein=_round2(item.protein_per_100g * factor),
            carbs=_round2(item.carbs_per_100g * factor),
            fats=_round2(item.fats_per_100g * factor),
            calories_per_100g=_round2(item.calories_per_100g),
            protein_per_100g=_round2(item.protein_per_100g),
            carbs_per_100g=_round2(item.carbs_per_100g),
            fats_per_100g=_round2(item.fats_per_100g),
            fibre_per_100g=_round2(fibre_100),
            sugar_per_100g=_round2(sugar_100),
            sodium_mg_per_100g=_round2(sodium_100),
            fibre=_round2(fibre_100 * factor),
            sugar=_round2(sugar_100 * factor),
            sodium_mg=_round2(sodium_100 * factor),
            source_type=item.source_type,
            source_label=item.source_label,
            confident=item.confident,
            needs_confirmation=item.needs_confirmation,
            uncertainty_reason=item.uncertainty_reason,
        )

    baseline_fields = (
        item.original_portion_grams,
        item.calories,
        item.protein,
        item.carbs,
        item.fats,
    )
    if all(value is not None for value in baseline_fields):
        ratio = item.portion_grams / item.original_portion_grams
        to_100g = 100.0 / item.original_portion_grams
        return ScannedFoodItem(
            name=item.name.strip(),
            portion_grams=_round2(item.portion_grams),
            calories=_round2(item.calories * ratio),
            protein=_round2(item.protein * ratio),
            carbs=_round2(item.carbs * ratio),
            fats=_round2(item.fats * ratio),
            calories_per_100g=_round2(item.calories * to_100g),
            protein_per_100g=_round2(item.protein * to_100g),
            carbs_per_100g=_round2(item.carbs * to_100g),
            fats_per_100g=_round2(item.fats * to_100g),
        )

    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail=(
            f"Item '{item.name}' must provide either all *_per_100g macro fields or "
            "original_portion_grams with baseline calories, protein, carbs, and fats."
        ),
    )


def _analyze_food_with_gemini(image_bytes: bytes, mime_type: str) -> tuple[GeminiVisionAnalysis, str]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY is not configured.",
        )

    prompt = (
        "Analyze this meal photograph as an experienced culinary & Indian nutrition specialist. "
        "1. Determine if edible food or beverages are clearly visible (`is_food`). If NOT food, set `is_food` to false and `ingredients` to []. "
        "2. Identify `food_name` (concise primary dish name) and `food_description` (1–2 sentences describing the dish and cooking style). "
        "3. Estimate total serving weight (`estimated_portion_grams`) and visual `portion_confidence` (`high`, `medium`, or `low`). "
        "4. Break down EVERY distinct visible or likely culinary ingredient in `ingredients` (including staples like whole wheat roti, rice, dal, paneer, noodles, vegetables, AND likely hidden/uncertain ingredients like cooking oil, ghee, sauces, salt, or cheese with `confident=false` and a clear `uncertainty_reason`). "
        "Do NOT calculate or guess nutrition tables per ingredient—focus ONLY on accurate food & ingredient recognition and gram estimates. "
        "5. Suggest 3 practical healthier alternatives tailored to this meal."
    )

    client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=35000))
    last_error: Exception | None = None
    last_code: int | None = None
    uploaded_file_ref = None
    temp_file_path: str | None = None

    try:
        if len(image_bytes) > FILES_API_THRESHOLD_BYTES:
            suffix = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}.get(mime_type, ".jpg")
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(image_bytes)
                temp_file_path = tmp.name
            uploaded_file_ref = client.files.upload(
                file=temp_file_path,
                config={"mime_type": mime_type},
            )
            content_part = uploaded_file_ref
        else:
            content_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

        for model_name in GEMINI_FALLBACK_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[content_part, prompt],
                    config=types.GenerateContentConfig(
                        temperature=0.2,
                        response_mime_type="application/json",
                        response_schema=GeminiVisionAnalysis,
                    ),
                )
                if isinstance(response.parsed, GeminiVisionAnalysis):
                    return response.parsed, model_name
                if response.text:
                    return GeminiVisionAnalysis.model_validate(json.loads(response.text)), model_name
                logger.warning("Gemini model %s returned empty payload; trying next model", model_name)
                continue
            except genai_errors.APIError as exc:
                last_error = exc
                last_code = exc.code
                if exc.code in {400, 403, 404, 429, 500, 503, 504}:
                    logger.warning("Gemini model %s unavailable (%s); trying fallback", model_name, exc.code)
                    continue
                raise
            except json.JSONDecodeError as exc:
                last_error = exc
                logger.warning("Gemini model %s returned non-JSON output; trying fallback", model_name)
                continue
    finally:
        if uploaded_file_ref is not None and getattr(uploaded_file_ref, "name", None):
            try:
                client.files.delete(name=uploaded_file_ref.name)
            except Exception:
                pass
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except OSError:
                pass

    if last_code == 429:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Gemini Vision API quota/rate limit reached right now. Please wait a few seconds and retry.",
        )
    if last_code in {503, 504}:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini Vision models are temporarily overloaded. Please retry shortly.",
        )

    raise last_error or ValueError("All Gemini vision models failed.")


import nutrition_db
from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from persistence_layer import ensure_audit_schema_upgrades, register_persistence_layer
from user_platform import register_user_platform
from wellness_catalog import register_wellness_and_catalog


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_audit_schema_upgrades(engine)
    yield
    engine.dispose()


app = FastAPI(
    title="NutriSense AI API",
    description="Food vision analysis, macro recalculation, and PostgreSQL meal logging API.",
    version="1.0.0",
    lifespan=lifespan,
)

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(_: Request, exc: SQLAlchemyError) -> JSONResponse:
    logger.exception("PostgreSQL error encountered: %s", type(exc).__name__)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "detail": "Database temporarily unavailable. No data was dropped or mocked; please retry shortly."
        },
    )

DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]
extra_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]
cors_origins = list(dict.fromkeys([*DEFAULT_CORS_ORIGINS, *extra_origins]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_platform_ctx = register_user_platform(app, Base, get_db)
_persistence_ctx = register_persistence_layer(
    app, Base, get_db, _platform_ctx, SessionLocal, nutrition_db
)
_platform_ctx["add_account_cleanup_hook"](
    _persistence_ctx["delete_user_upload_files_on_disk"]
)
register_wellness_and_catalog(app, Base, get_db, _platform_ctx, SessionLocal)


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check(db: Session = Depends(get_db)) -> HealthResponse:
    """Verify service health and PostgreSQL connectivity."""
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        logger.exception("Database health check failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed.",
        ) from exc
    return HealthResponse(status="ok", database="connected")


def _build_hybrid_scan_response(
    analysis: GeminiVisionAnalysis,
    model_used: str,
) -> ScanResponse:
    analyzed_ingredients: list[AnalyzedIngredient] = []
    scanned_items: list[ScannedFoodItem] = []
    used_sources: list[str] = ["Google Gemini Vision (Food & Ingredient Identification)"]

    total_fibre = 0.0
    total_sugar = 0.0
    total_sodium = 0.0
    total_calcium = 0.0
    total_iron = 0.0
    total_vit_c = 0.0
    total_potassium = 0.0
    unverified_count = 0
    uncertain_visual_count = 0

    for idx, raw_ing in enumerate(analysis.ingredients):
        grams = max(float(raw_ing.estimated_grams), 1.0)
        factor = grams / 100.0
        db_match = resolve_ingredient_nutrition(raw_ing.name, use_live_usda=True)

        if db_match is not None:
            cal = _round2(db_match.calories * factor)
            pro = _round2(db_match.protein * factor)
            carb = _round2(db_match.carbohydrates * factor)
            fat = _round2(db_match.fats * factor)
            fib = _round2(db_match.fibre * factor)
            sug = _round2(db_match.sugar * factor)
            sod = _round2(db_match.sodium_mg * factor)
            ca = _round2(db_match.calcium_mg * factor)
            fe = _round2(db_match.iron_mg * factor)
            vc = _round2(db_match.vitamin_c_mg * factor)
            k = _round2(db_match.potassium_mg * factor)

            source_type = db_match.source_type
            source_label = db_match.source_label
            canonical_match = db_match.canonical_name
            cal_100, pro_100, carb_100, fat_100 = (
                db_match.calories,
                db_match.protein,
                db_match.carbohydrates,
                db_match.fats,
            )
            fib_100, sug_100, sod_100 = db_match.fibre, db_match.sugar, db_match.sodium_mg
            needs_conf = not raw_ing.confident
            reason = raw_ing.uncertainty_reason
            if not raw_ing.confident and not reason:
                reason = "Hidden or variable culinary quantity; confirm estimated grams."
            if db_match.source_type == "icmr_nin":
                src_credit = "ICMR–NIN Indian Food Composition Tables (IFCT 2017)"
            else:
                src_credit = "USDA FoodData Central (CC0 1.0)"
            if src_credit not in used_sources:
                used_sources.append(src_credit)
        else:
            cal = pro = carb = fat = fib = sug = sod = ca = fe = vc = k = 0.0
            cal_100 = pro_100 = carb_100 = fat_100 = fib_100 = sug_100 = sod_100 = 0.0
            source_type = "unmatched"
            source_label = "Not matched in ICMR–NIN / USDA — Confirm Needed"
            canonical_match = None
            needs_conf = True
            unverified_count += 1
            reason = raw_ing.uncertainty_reason or (
                "No verified nutrition database entry found; values left uncomputed rather than guessed."
            )

        if not raw_ing.confident:
            uncertain_visual_count += 1

        total_fibre += fib
        total_sugar += sug
        total_sodium += sod
        total_calcium += ca
        total_iron += fe
        total_vit_c += vc
        total_potassium += k

        ing_id = f"ing-{idx + 1}"
        analyzed_ingredients.append(
            AnalyzedIngredient(
                id=ing_id,
                name=raw_ing.name.strip() or f"Ingredient {idx + 1}",
                canonical_match=canonical_match,
                estimated_grams=_round2(grams),
                unit="g",
                confident=raw_ing.confident and source_type != "unmatched",
                needs_confirmation=needs_conf,
                confirmed_by_user=False,
                uncertainty_reason=reason,
                source_type=source_type,
                source_label=source_label,
                calories=cal,
                protein=pro,
                carbohydrates=carb,
                fats=fat,
                fibre=fib,
                sugar=sug,
                sodium_mg=sod,
                calories_per_100g=_round2(cal_100),
                protein_per_100g=_round2(pro_100),
                carbs_per_100g=_round2(carb_100),
                fats_per_100g=_round2(fat_100),
                fibre_per_100g=_round2(fib_100),
                sugar_per_100g=_round2(sug_100),
                sodium_mg_per_100g=_round2(sod_100),
                calcium_mg=ca,
                iron_mg=fe,
                vitamin_c_mg=vc,
                potassium_mg=k,
            )
        )

        scanned_items.append(
            ScannedFoodItem(
                name=raw_ing.name.strip() or f"Ingredient {idx + 1}",
                portion_grams=_round2(grams),
                calories=cal,
                protein=pro,
                carbs=carb,
                fats=fat,
                calories_per_100g=_round2(cal_100),
                protein_per_100g=_round2(pro_100),
                carbs_per_100g=_round2(carb_100),
                fats_per_100g=_round2(fat_100),
                fibre_per_100g=_round2(fib_100),
                sugar_per_100g=_round2(sug_100),
                sodium_mg_per_100g=_round2(sod_100),
                fibre=fib,
                sugar=sug,
                sodium_mg=sod,
                source_type=source_type,
                source_label=source_label,
                confident=raw_ing.confident and source_type != "unmatched",
                needs_confirmation=needs_conf,
                uncertainty_reason=reason,
            )
        )

    totals = _compute_totals(scanned_items)
    sum_grams = totals.portion_grams or _round2(max(float(analysis.estimated_portion_grams), 1.0))

    other_nutrients: list[NutrientDetailMetric] = []
    if total_calcium > 0:
        other_nutrients.append(
            NutrientDetailMetric(
                name="Calcium",
                amount=_round2(total_calcium),
                unit="mg",
                source="ICMR–NIN / USDA per-100g tables",
            )
        )
    if total_iron > 0:
        other_nutrients.append(
            NutrientDetailMetric(
                name="Iron",
                amount=_round2(total_iron),
                unit="mg",
                source="ICMR–NIN / USDA per-100g tables",
            )
        )
    if total_vit_c > 0:
        other_nutrients.append(
            NutrientDetailMetric(
                name="Vitamin C",
                amount=_round2(total_vit_c),
                unit="mg",
                source="ICMR–NIN / USDA per-100g tables",
            )
        )
    if total_potassium > 0:
        other_nutrients.append(
            NutrientDetailMetric(
                name="Potassium",
                amount=_round2(total_potassium),
                unit="mg",
                source="ICMR–NIN / USDA per-100g tables",
            )
        )

    overall_confidence: Literal["high", "medium", "low"] = analysis.portion_confidence
    if unverified_count > 0 or uncertain_visual_count >= 2:
        overall_confidence = "low" if analysis.portion_confidence != "high" else "medium"

    limitations = [
        "Portion weights are visual estimates from a single 2D photograph and are not laboratory measurements.",
        "Macronutrients and micronutrients are computed strictly from ICMR–NIN IFCT 2017 and USDA FoodData Central per-100g tables multiplied by estimated grams.",
    ]
    if uncertain_visual_count > 0:
        limitations.append(
            f"{uncertain_visual_count} ingredient(s) (such as cooking oil, sauces, or obscured garnishes) have uncertain visual quantities — confirm or adjust sliders below."
        )
    if unverified_count > 0:
        limitations.append(
            f"{unverified_count} detected ingredient(s) lacked an exact database match and were left at 0 kcal rather than guessed."
        )

    alternatives = [_to_healthier_alternative(alt) for alt in analysis.healthier_alternatives[:3]]

    return ScanResponse(
        food_name=analysis.food_name.strip() or "Analyzed Meal",
        food_description=analysis.food_description.strip()
        or "Identified meal decomposed into database-backed ingredients.",
        ingredients=analyzed_ingredients,
        estimated_portion=EstimatedPortion(
            amount=_round2(sum_grams),
            unit="g",
            label=f"~{round(sum_grams)} g estimated serving",
        ),
        portion_confidence=analysis.portion_confidence,
        calories=totals.calories,
        protein=totals.protein,
        carbohydrates=totals.carbs,
        fats=totals.fats,
        fibre=_round2(total_fibre),
        sugar=_round2(total_sugar),
        sodium=NutrientDetailMetric(
            name="Sodium",
            amount=_round2(total_sodium),
            unit="mg",
            source="ICMR–NIN / USDA per-100g tables",
        ),
        other_available_nutrients=other_nutrients,
        confidence=overall_confidence,
        data_sources=used_sources,
        analysis_limitations=limitations,
        model_used=model_used,
        items=scanned_items,
        totals=totals,
        healthier_alternatives=alternatives,
    )


@app.post("/api/scan", response_model=ScanResponse, tags=["Food Analysis"])
async def scan_food_image(
    file: UploadFile = File(..., description="Food image file"),
    current_user: Any = Depends(_platform_ctx["get_optional_user"]),
    db: Session = Depends(get_db),
) -> ScanResponse:
    """Analyze an uploaded food image using Gemini Vision + ICMR–NIN/USDA databases."""
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded image file is empty.")
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Image exceeds the 20 MB upload limit.",
        )

    mime_type = _detect_validated_image_mime(file, image_bytes)

    try:
        analysis, model_used = await run_in_threadpool(_analyze_food_with_gemini, image_bytes, mime_type)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Gemini Vision food scan failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini Vision analysis error: {str(exc)[:180]}",
        ) from exc

    if not analysis.is_food or not analysis.ingredients:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No edible food items were detected in the uploaded image. Try a clearer well-lit photo.",
        )

    scan_resp = await run_in_threadpool(_build_hybrid_scan_response, analysis, model_used)

    # Save authenticated meal photos to private server storage + uploaded_files PostgreSQL table
    if current_user is not None:
        uploaded_rec = _persistence_ctx["save_private_upload"](
            db=db,
            file_bytes=image_bytes,
            original_filename=file.filename or "meal.jpg",
            mime_type=mime_type,
            user_id=current_user.id,
        )
        if uploaded_rec is not None:
            scan_resp.uploaded_file_id = uploaded_rec.id
            scan_resp.uploaded_image_ref = f"/api/uploads/{uploaded_rec.file_key}"

    return scan_resp


class LookupIngredientResponse(BaseModel):
    found: bool
    ingredient: AnalyzedIngredient | None = None
    message: str


@app.get("/api/lookup-ingredient", response_model=LookupIngredientResponse, tags=["Food Analysis"])
def lookup_ingredient_endpoint(
    name: str = Query(..., min_length=2, max_length=120, description="Ingredient name to look up"),
    grams: float = Query(default=100.0, gt=0, le=5000, description="Serving weight in grams"),
) -> LookupIngredientResponse:
    """Look up an ingredient in ICMR–NIN IFCT 2017 and USDA FoodData Central."""
    db_match = resolve_ingredient_nutrition(name, use_live_usda=True)
    if db_match is None:
        return LookupIngredientResponse(
            found=False,
            ingredient=None,
            message=f"No verified match found for '{name.strip()}' in ICMR–NIN or USDA FoodData Central.",
        )

    factor = grams / 100.0
    ingredient = AnalyzedIngredient(
        id=f"lookup-{abs(hash(name.strip().lower())) % 100000}",
        name=name.strip(),
        canonical_match=db_match.canonical_name,
        estimated_grams=_round2(grams),
        unit="g",
        confident=True,
        needs_confirmation=False,
        confirmed_by_user=True,
        uncertainty_reason=None,
        source_type=db_match.source_type,
        source_label=db_match.source_label,
        calories=_round2(db_match.calories * factor),
        protein=_round2(db_match.protein * factor),
        carbohydrates=_round2(db_match.carbohydrates * factor),
        fats=_round2(db_match.fats * factor),
        fibre=_round2(db_match.fibre * factor),
        sugar=_round2(db_match.sugar * factor),
        sodium_mg=_round2(db_match.sodium_mg * factor),
        calories_per_100g=_round2(db_match.calories),
        protein_per_100g=_round2(db_match.protein),
        carbs_per_100g=_round2(db_match.carbohydrates),
        fats_per_100g=_round2(db_match.fats),
        fibre_per_100g=_round2(db_match.fibre),
        sugar_per_100g=_round2(db_match.sugar),
        sodium_mg_per_100g=_round2(db_match.sodium_mg),
        calcium_mg=_round2(db_match.calcium_mg * factor),
        iron_mg=_round2(db_match.iron_mg * factor),
        vitamin_c_mg=_round2(db_match.vitamin_c_mg * factor),
        potassium_mg=_round2(db_match.potassium_mg * factor),
    )
    return LookupIngredientResponse(
        found=True,
        ingredient=ingredient,
        message=f"Matched '{db_match.canonical_name}' from {db_match.source_label}.",
    )


@app.post("/api/recalculate", response_model=RecalculateResponse, tags=["Food Analysis"])
def recalculate_macros(payload: RecalculateRequest) -> RecalculateResponse:
    """Recalculate per-item and total macros from edited portion sizes in grams."""
    recalculated_items = [_recalculate_single_item(item) for item in payload.items]
    totals = _compute_totals(recalculated_items)
    return RecalculateResponse(items=recalculated_items, totals=totals)


@app.post(
    "/api/logs",
    response_model=MealLogResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Meal Logs"],
)
def create_meal_log(payload: MealLogCreate, db: Session = Depends(get_db)) -> MealLogResponse:
    """Persist a user meal log and its food items to PostgreSQL."""
    totals = _compute_totals(payload.items)
    derived_name = ", ".join(item.name.strip() for item in payload.items[:3])
    if len(payload.items) > 3:
        derived_name = f"{derived_name} +{len(payload.items) - 3} more"
    meal_name = (payload.meal_name or "").strip() or derived_name[:255]

    meal_log = MealLog(
        meal_name=meal_name,
        meal_type=payload.meal_type.strip().lower(),
        notes=payload.notes.strip() if payload.notes else None,
        total_portion_grams=totals.portion_grams,
        total_calories=totals.calories,
        total_protein=totals.protein,
        total_carbs=totals.carbs,
        total_fats=totals.fats,
        items=[
            MealFoodItem(
                name=item.name.strip(),
                portion_grams=_round2(item.portion_grams),
                calories=_round2(item.calories),
                protein=_round2(item.protein),
                carbs=_round2(item.carbs),
                fats=_round2(item.fats),
            )
            for item in payload.items
        ],
    )
    db.add(meal_log)
    db.commit()
    db.refresh(meal_log)
    return MealLogResponse.model_validate(meal_log)


@app.get("/api/foods", response_model=DashboardFoodsResponse, tags=["Meal Logs"])
def get_logged_foods(
    meal_type: str | None = Query(default=None, description="Filter logs by meal type (e.g. breakfast, lunch)"),
    log_date: date | None = Query(default=None, alias="date", description="Filter logs by UTC date (YYYY-MM-DD)"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> DashboardFoodsResponse:
    """Retrieve stored meal logs, logged foods, and aggregate macro totals for the dashboard."""
    stmt = select(MealLog).order_by(MealLog.logged_at.desc(), MealLog.id.desc())
    if meal_type:
        stmt = stmt.where(MealLog.meal_type == meal_type.strip().lower())
    if log_date:
        start_dt = datetime.combine(log_date, time.min, tzinfo=timezone.utc)
        end_dt = datetime.combine(log_date, time.max, tzinfo=timezone.utc)
        stmt = stmt.where(MealLog.logged_at >= start_dt, MealLog.logged_at <= end_dt)

    meals = list(db.scalars(stmt.offset(offset).limit(limit)).all())

    foods: list[DashboardFoodEntry] = []
    for meal in meals:
        for item in meal.items:
            foods.append(
                DashboardFoodEntry(
                    id=item.id,
                    meal_log_id=meal.id,
                    meal_name=meal.meal_name,
                    meal_type=meal.meal_type,
                    name=item.name,
                    portion_grams=item.portion_grams,
                    calories=item.calories,
                    protein=item.protein,
                    carbs=item.carbs,
                    fats=item.fats,
                    logged_at=item.logged_at,
                )
            )

    summary = DashboardSummary(
        total_meals=len(meals),
        total_items=len(foods),
        total_portion_grams=_round2(sum(meal.total_portion_grams for meal in meals)),
        total_calories=_round2(sum(meal.total_calories for meal in meals)),
        total_protein=_round2(sum(meal.total_protein for meal in meals)),
        total_carbs=_round2(sum(meal.total_carbs for meal in meals)),
        total_fats=_round2(sum(meal.total_fats for meal in meals)),
    )

    return DashboardFoodsResponse(
        summary=summary,
        meals=[MealLogResponse.model_validate(meal) for meal in meals],
        foods=foods,
    )


class ChatMessageInput(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=2000)


class NutritionContextInput(BaseModel):
    today_calories: float | None = None
    today_protein: float | None = None
    today_carbs: float | None = None
    today_fats: float | None = None
    target_calories: float | None = None
    target_protein: float | None = None
    target_carbs: float | None = None
    target_fats: float | None = None
    recent_meals: list[str] | None = None


class NutriChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: list[ChatMessageInput] = Field(default_factory=list)
    nutrition_context: NutritionContextInput | None = None


class NutriChatResponse(BaseModel):
    reply: str
    model_used: str


def _ask_gemini_nutrition_assistant(payload: NutriChatRequest) -> NutriChatResponse:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY is not configured.",
        )

    ctx_lines = []
    if payload.nutrition_context:
        ctx = payload.nutrition_context
        ctx_lines.append(
            f"User's logged intake today: {ctx.today_calories or 0} kcal, "
            f"{ctx.today_protein or 0}g protein, {ctx.today_carbs or 0}g carbs, {ctx.today_fats or 0}g fats."
        )
        ctx_lines.append(
            f"User's daily targets: {ctx.target_calories or 2200} kcal, "
            f"{ctx.target_protein or 150}g protein, {ctx.target_carbs or 250}g carbs, {ctx.target_fats or 70}g fats."
        )
        if ctx.recent_meals:
            ctx_lines.append(f"Recent meals: {', '.join(ctx.recent_meals[:5])}.")

    history_text = ""
    if payload.history:
        recent_turns = payload.history[-6:]
        history_text = "\n".join(
            f"{'User' if m.role == 'user' else 'Assistant'}: {m.content}" for m in recent_turns
        )

    system_instruction = (
        "You are Nutri AI, the intelligent nutrition assistant inside NutriSense AI. "
        "Provide practical, concise, evidence-informed everyday nutrition guidance, Indian and global meal ideas, "
        "and macro-balancing suggestions. Never make medical diagnoses or prescribe treatments; advise consulting a "
        "doctor or registered dietitian for medical conditions. Keep formatting clean with short bullet points."
    )
    prompt_parts = [system_instruction]
    if ctx_lines:
        prompt_parts.append("Live User Nutrition Context:\n" + "\n".join(ctx_lines))
    if history_text:
        prompt_parts.append("Recent Conversation:\n" + history_text)
    prompt_parts.append(f"User Question: {payload.message}")

    client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=20000))
    chat_models = list(dict.fromkeys(["gemini-3.1-flash-lite", *GEMINI_FALLBACK_MODELS]))
    last_error: Exception | None = None
    for model_name in chat_models:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents="\n\n".join(prompt_parts),
                config=types.GenerateContentConfig(temperature=0.4),
            )
            text_out = (response.text or "").strip()
            if text_out:
                return NutriChatResponse(reply=text_out, model_used=model_name)
        except genai_errors.APIError as exc:
            last_error = exc
            if exc.code in {404, 429, 500, 503, 504}:
                logger.warning("Gemini chat model %s unavailable (%s); trying fallback", model_name, exc.code)
                continue
            raise

    raise last_error or ValueError("All Gemini models failed to respond.")


@app.post("/api/chat", response_model=NutriChatResponse, tags=["AI Assistant"])
async def nutri_ai_chat(payload: NutriChatRequest) -> NutriChatResponse:
    """Answer user nutrition questions with Gemini using live meal context."""
    try:
        return await run_in_threadpool(_ask_gemini_nutrition_assistant, payload)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Gemini Nutri AI chat failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Nutri AI could not reach Gemini right now. Please try again shortly.",
        ) from exc


class MealPlanDay(BaseModel):
    day: str
    breakfast: str
    lunch: str
    snack: str
    dinner: str
    estimated_calories: int
    estimated_protein_g: int
    grocery_items: list[str]


class WeeklyMealPlanRequest(BaseModel):
    preference: str = Field(default="balanced_indian", max_length=80)
    daily_calorie_target: int = Field(default=2000, ge=1000, le=5000)
    budget_friendly: bool = Field(default=True)


class WeeklyMealPlanResponse(BaseModel):
    preference: str
    days: list[MealPlanDay]
    source: str


def _generate_gemini_meal_plan(payload: WeeklyMealPlanRequest) -> WeeklyMealPlanResponse:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY is not configured.",
        )

    class _PlanSchema(BaseModel):
        days: list[MealPlanDay]

    prompt = (
        f"Create a 7-day weekly meal plan (Monday through Sunday) tailored to preference '{payload.preference}', "
        f"around {payload.daily_calorie_target} kcal/day, emphasizing wholesome Indian & everyday affordable foods "
        f"({'budget-friendly pantry staples prioritized' if payload.budget_friendly else 'varied whole foods'}). "
        "For each day return breakfast, lunch, snack, dinner, estimated_calories, estimated_protein_g, and 3-5 core grocery_items."
    )

    client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=25000))
    planner_models = list(dict.fromkeys(["gemini-3.1-flash-lite", *GEMINI_FALLBACK_MODELS]))
    last_error: Exception | None = None
    for model_name in planner_models:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.35,
                    response_mime_type="application/json",
                    response_schema=_PlanSchema,
                ),
            )
            parsed = response.parsed if isinstance(response.parsed, _PlanSchema) else _PlanSchema.model_validate(json.loads(response.text))
            days_out = parsed.days[:7]
            cache_key = f"gemini_meal_plan:{payload.preference}:{payload.daily_calorie_target}:{int(payload.budget_friendly)}"
            _persistence_ctx["cache_external_payload"](
                cache_key=cache_key,
                source_name="Google Gemini AI",
                source_url="https://ai.google.dev/gemini-api",
                external_id=model_name,
                data_type="ai_meal_plan",
                payload=[d.model_dump() for d in days_out],
                ttl_days=14,
                verification_status="ai_generated_estimate",
            )
            return WeeklyMealPlanResponse(
                preference=payload.preference,
                days=days_out,
                source=f"gemini:{model_name}",
            )
        except genai_errors.APIError as exc:
            last_error = exc
            if exc.code in {404, 429, 500, 503, 504}:
                continue
            raise

    raise last_error or ValueError("All Gemini models failed for meal planning.")


@app.post("/api/meal-plan", response_model=WeeklyMealPlanResponse, tags=["AI Assistant"])
async def generate_weekly_meal_plan(payload: WeeklyMealPlanRequest) -> WeeklyMealPlanResponse:
    """Generate an AI-personalized 7-day meal plan via Gemini."""
    try:
        return await run_in_threadpool(_generate_gemini_meal_plan, payload)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Gemini meal plan generation failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI Meal Planner is temporarily unavailable.",
        ) from exc
