from contextlib import asynccontextmanager
from datetime import date, datetime, time, timezone
import json
import logging
import os
from pathlib import Path
from typing import Generator

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

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

logger = logging.getLogger("nutrisense")

MAX_IMAGE_BYTES = 20 * 1024 * 1024  # 20 MB
SUPPORTED_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
}
EXTENSION_MIME_MAP = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".heic": "image/heic",
    ".heif": "image/heif",
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
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
GEMINI_FALLBACK_MODELS = list(
    dict.fromkeys([GEMINI_MODEL, "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.7-flash"])
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


class HealthierAlternative(BaseModel):
    name: str = Field(..., description="Name of the healthier food alternative")
    replaces: str = Field(..., description="Detected food item or meal component it replaces")
    reason: str = Field(..., description="Why this option is nutritionally better")
    estimated_calories: float = Field(..., ge=0)
    protein: float = Field(..., ge=0)
    carbs: float = Field(..., ge=0)
    fats: float = Field(..., ge=0)


class ScanResponse(BaseModel):
    items: list[ScannedFoodItem]
    totals: MacroTotals
    healthier_alternatives: list[HealthierAlternative]


class GeminiFoodItem(BaseModel):
    name: str = Field(..., description="Specific name of the detected food item")
    portion_grams: float = Field(..., description="Estimated default portion size in grams (positive number)")
    calories: float = Field(..., description="Estimated calories (kcal) for this portion")
    protein: float = Field(..., description="Estimated protein in grams for this portion")
    carbs: float = Field(..., description="Estimated carbohydrates in grams for this portion")
    fats: float = Field(..., description="Estimated fats in grams for this portion")


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
    items: list[GeminiFoodItem] = Field(..., description="Detected food items with portion sizes and macros")
    healthier_alternatives: list[GeminiHealthierAlternative] = Field(
        ...,
        description="Exactly 3 practical healthier food alternatives for the detected meal",
    )


class RecalculateItemInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    portion_grams: float = Field(..., ge=0, description="Updated portion size in grams")
    calories_per_100g: float | None = Field(default=None, ge=0)
    protein_per_100g: float | None = Field(default=None, ge=0)
    carbs_per_100g: float | None = Field(default=None, ge=0)
    fats_per_100g: float | None = Field(default=None, ge=0)
    original_portion_grams: float | None = Field(default=None, gt=0)
    calories: float | None = Field(default=None, ge=0)
    protein: float | None = Field(default=None, ge=0)
    carbs: float | None = Field(default=None, ge=0)
    fats: float | None = Field(default=None, ge=0)


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


def _detect_image_mime_type(upload: UploadFile, payload: bytes) -> str | None:
    content_type = (upload.content_type or "").split(";")[0].strip().lower()
    if content_type == "image/jpg":
        content_type = "image/jpeg"
    if content_type in SUPPORTED_IMAGE_MIME_TYPES:
        return content_type

    # Inspect common binary signatures when upload headers omit image MIME types.
    if payload.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if payload.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if payload[:4] == b"RIFF" and payload[8:12] == b"WEBP":
        return "image/webp"
    if payload.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"

    suffix = Path(upload.filename or "").suffix.lower()
    return EXTENSION_MIME_MAP.get(suffix)


def _to_scanned_item(item: GeminiFoodItem) -> ScannedFoodItem:
    portion_grams = max(float(item.portion_grams), 1.0)
    calories = max(float(item.calories), 0.0)
    protein = max(float(item.protein), 0.0)
    carbs = max(float(item.carbs), 0.0)
    fats = max(float(item.fats), 0.0)
    factor = 100.0 / portion_grams
    return ScannedFoodItem(
        name=item.name.strip() or "Unknown Food",
        portion_grams=_round2(portion_grams),
        calories=_round2(calories),
        protein=_round2(protein),
        carbs=_round2(carbs),
        fats=_round2(fats),
        calories_per_100g=_round2(calories * factor),
        protein_per_100g=_round2(protein * factor),
        carbs_per_100g=_round2(carbs * factor),
        fats_per_100g=_round2(fats * factor),
    )


def _to_healthier_alternative(alt: GeminiHealthierAlternative) -> HealthierAlternative:
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


def _analyze_food_with_gemini(image_bytes: bytes, mime_type: str) -> GeminiVisionAnalysis:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY is not configured.",
        )

    prompt = (
        "Analyze this meal image as a clinical nutritionist. "
        "Identify every distinct food or beverage item visible on the plate or table, "
        "estimate a realistic default portion size in grams for each item, and estimate "
        "calories (kcal), protein (g), carbs (g), and fats (g) for that portion. "
        "Also provide exactly 3 practical healthier food alternatives tailored to this meal "
        "(what each replaces, why it is healthier, and its estimated macros for an equivalent serving). "
        "If no food or drink is present in the image, set is_food to false and items to an empty list."
    )

    client = genai.Client(api_key=api_key)
    last_error: Exception | None = None
    response = None

    for model_name in GEMINI_FALLBACK_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt,
                ],
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json",
                    response_schema=GeminiVisionAnalysis,
                ),
            )
            break
        except genai_errors.APIError as exc:
            last_error = exc
            if exc.code in {404, 429, 503}:
                logger.warning("Gemini model %s unavailable (%s); trying fallback", model_name, exc.code)
                continue
            raise

    if response is None:
        raise last_error or ValueError("All Gemini vision models failed.")

    if isinstance(response.parsed, GeminiVisionAnalysis):
        return response.parsed

    if response.text:
        return GeminiVisionAnalysis.model_validate(json.loads(response.text))

    raise ValueError("Gemini returned an empty response.")


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield
    engine.dispose()


app = FastAPI(
    title="NutriSense AI API",
    description="Food vision analysis, macro recalculation, and PostgreSQL meal logging API.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.post("/api/scan", response_model=ScanResponse, tags=["Food Analysis"])
async def scan_food_image(file: UploadFile = File(..., description="Food image file")) -> ScanResponse:
    """Analyze an uploaded food image using Gemini Vision and suggest 3 healthier alternatives."""
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded image file is empty.")
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Image exceeds the 20 MB upload limit.",
        )

    mime_type = _detect_image_mime_type(file, image_bytes)
    if not mime_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Upload a JPEG, PNG, WEBP, GIF, or HEIC image.",
        )

    try:
        analysis = await run_in_threadpool(_analyze_food_with_gemini, image_bytes, mime_type)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Gemini Vision food scan failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to analyze food image with Gemini Vision.",
        ) from exc

    if not analysis.is_food or not analysis.items:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No food items were detected in the uploaded image.",
        )

    scanned_items = [_to_scanned_item(item) for item in analysis.items]
    totals = _compute_totals(scanned_items)
    alternatives = [_to_healthier_alternative(alt) for alt in analysis.healthier_alternatives[:3]]

    return ScanResponse(
        items=scanned_items,
        totals=totals,
        healthier_alternatives=alternatives,
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
            return WeeklyMealPlanResponse(
                preference=payload.preference,
                days=parsed.days[:7],
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
