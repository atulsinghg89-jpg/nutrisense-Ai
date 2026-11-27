"""Persistent uploaded image storage, external API cache, workspace sync, and additive schema migration."""

from __future__ import annotations

import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func, select, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

PRIVATE_UPLOAD_DIR = Path(
    os.getenv("PRIVATE_UPLOAD_DIR", str(Path(__file__).resolve().parent / "private_uploads"))
).resolve()

MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

CACHE_TTL_DAYS = 30


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_audit_schema_upgrades(engine: Any) -> None:
    """Apply non-destructive additive ALTER TABLE migrations preserving all existing rows."""
    ddl_statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(32) NOT NULL DEFAULT 'active'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ",
        "ALTER TABLE profile_food_entries ADD COLUMN IF NOT EXISTS image_file_id INTEGER",
        "ALTER TABLE profile_food_entries ADD COLUMN IF NOT EXISTS image_ref VARCHAR(255)",
        "ALTER TABLE profile_food_entries ADD COLUMN IF NOT EXISTS ai_estimated BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE profile_food_entries ADD COLUMN IF NOT EXISTS confirmed_by_user BOOLEAN NOT NULL DEFAULT TRUE",
        "ALTER TABLE profile_food_entries ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ",
        "ALTER TABLE profile_food_entries ADD COLUMN IF NOT EXISTS nutrition_sources_json TEXT NOT NULL DEFAULT '[]'",
        "ALTER TABLE womens_wellness_preferences ADD COLUMN IF NOT EXISTS age_band VARCHAR(32)",
        "ALTER TABLE womens_wellness_preferences ADD COLUMN IF NOT EXISTS dietary_preferences_json TEXT NOT NULL DEFAULT '[]'",
        "ALTER TABLE womens_wellness_preferences ADD COLUMN IF NOT EXISTS activity_preferences_json TEXT NOT NULL DEFAULT '[]'",
        "ALTER TABLE womens_wellness_preferences ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
        "ALTER TABLE menstrual_period_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
        "ALTER TABLE cycle_symptom_mood_records ADD COLUMN IF NOT EXISTS period_record_id INTEGER",
        "ALTER TABLE cycle_symptom_mood_records ADD COLUMN IF NOT EXISTS symptom_severity VARCHAR(32)",
        "ALTER TABLE cycle_symptom_mood_records ADD COLUMN IF NOT EXISTS cramps_level VARCHAR(32)",
        "ALTER TABLE cycle_symptom_mood_records ADD COLUMN IF NOT EXISTS energy_level VARCHAR(32)",
        "ALTER TABLE product_catalog_items ADD COLUMN IF NOT EXISTS variant_label VARCHAR(160)",
        "ALTER TABLE product_catalog_items ADD COLUMN IF NOT EXISTS sub_category VARCHAR(64)",
        "ALTER TABLE product_catalog_items ADD COLUMN IF NOT EXISTS has_verified_image BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE product_retailer_listings ADD COLUMN IF NOT EXISTS original_price_inr FLOAT",
        "ALTER TABLE product_retailer_listings ADD COLUMN IF NOT EXISTS source_provenance VARCHAR(180)",
    ]
    with engine.begin() as conn:
        for stmt in ddl_statements:
            conn.execute(text(stmt))


class UploadedFileOut(BaseModel):
    id: int
    file_key: str
    mime_type: str
    size_bytes: int
    storage_backend: str
    is_private: bool
    access_url: str
    created_at: datetime


class ExternalCacheEntryOut(BaseModel):
    cache_key: str
    source_name: str
    source_url: str
    external_id: str | None
    data_type: str
    fetched_at: datetime
    last_updated_at: datetime
    expires_at: datetime
    verification_status: str
    hit_count: int


class WorkspaceStateUpdate(BaseModel):
    saved_meal_plan: list[dict[str, Any]] | None = None
    planner_source: str | None = Field(default=None, max_length=120)
    grocery_items: list[dict[str, Any]] | None = None
    daily_targets: dict[str, Any] | None = None


class WorkspaceStateOut(BaseModel):
    saved_meal_plan: list[dict[str, Any]]
    planner_source: str | None
    grocery_items: list[dict[str, Any]]
    daily_targets: dict[str, Any] | None
    updated_at: datetime | None


def register_persistence_layer(
    app: FastAPI,
    Base: type[DeclarativeBase],
    get_db: Callable[..., Any],
    platform: dict[str, Any],
    SessionLocal: Any,
    nutrition_module: Any,
) -> dict[str, Any]:
    """Register uploaded_files, external_data_cache, and user_saved_workspaces tables & helpers."""
    PRIVATE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    get_current_user = platform["get_current_user"]
    get_optional_user = platform["get_optional_user"]

    class UploadedFileRecord(Base):
        __tablename__ = "uploaded_files"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        file_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
        user_id: Mapped[int | None] = mapped_column(
            ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
        )
        original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
        mime_type: Mapped[str] = mapped_column(String(64), nullable=False)
        size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
        sha256_hex: Mapped[str] = mapped_column(String(64), nullable=False)
        storage_backend: Mapped[str] = mapped_column(
            String(32), nullable=False, default="local_private_disk"
        )
        relative_path: Mapped[str] = mapped_column(String(255), nullable=False)
        is_private: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
        created_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )

    class ExternalDataCacheRecord(Base):
        __tablename__ = "external_data_cache"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        cache_key: Mapped[str] = mapped_column(String(180), unique=True, nullable=False, index=True)
        source_name: Mapped[str] = mapped_column(String(120), nullable=False)
        source_url: Mapped[str] = mapped_column(String(500), nullable=False)
        external_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
        data_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
        payload_json: Mapped[str] = mapped_column(Text, nullable=False)
        fetched_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )
        last_updated_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )
        expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
        verification_status: Mapped[str] = mapped_column(
            String(48), nullable=False, default="verified_api"
        )
        hit_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    class UserSavedWorkspace(Base):
        __tablename__ = "user_saved_workspaces"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        user_id: Mapped[int] = mapped_column(
            ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
        )
        saved_meal_plan_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
        planner_source: Mapped[str | None] = mapped_column(String(120), nullable=True)
        grocery_items_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
        daily_targets_json: Mapped[str | None] = mapped_column(Text, nullable=True)
        updated_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )

    # -----------------------------------------------------------------------
    # Private File Save & Auth-Scoped Retrieval
    # -----------------------------------------------------------------------
    def save_private_upload(
        db: Session,
        file_bytes: bytes,
        original_filename: str,
        mime_type: str,
        user_id: int | None,
    ) -> UploadedFileRecord | None:
        if user_id is None:
            # Unauthenticated scans are not retained on server disk to uphold zero public leak risk.
            return None

        PRIVATE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        ext = MIME_TO_EXT.get(mime_type, ".jpg")
        file_key = secrets.token_hex(16)
        rel_path = f"{file_key}{ext}"
        dest_path = (PRIVATE_UPLOAD_DIR / rel_path).resolve()
        if not dest_path.is_relative_to(PRIVATE_UPLOAD_DIR):
            raise ValueError("Invalid upload destination path")
        dest_path.write_bytes(file_bytes)

        digest = hashlib.sha256(file_bytes).hexdigest()
        safe_orig = (original_filename or f"scan{ext}")[:250]
        rec = UploadedFileRecord(
            file_key=file_key,
            user_id=user_id,
            original_filename=safe_orig,
            mime_type=mime_type,
            size_bytes=len(file_bytes),
            sha256_hex=digest,
            storage_backend="local_private_disk",
            relative_path=rel_path,
            is_private=True,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return rec

    def delete_user_upload_files_on_disk(db: Session, user_id: int) -> None:
        rows = list(
            db.scalars(select(UploadedFileRecord).where(UploadedFileRecord.user_id == user_id)).all()
        )
        for row in rows:
            target = (PRIVATE_UPLOAD_DIR / row.relative_path).resolve()
            if target.is_relative_to(PRIVATE_UPLOAD_DIR) and target.is_file():
                try:
                    target.unlink()
                except OSError:
                    pass

    # -----------------------------------------------------------------------
    # External API Cache Helpers Wired into nutrition_db & Meal Planner
    # -----------------------------------------------------------------------
    def read_usda_cache_from_db(query_norm: str, allow_stale: bool = False) -> Any | None:
        cache_key = f"usda_fdc_search:{query_norm}"
        try:
            with SessionLocal() as db:
                row = db.scalar(
                    select(ExternalDataCacheRecord).where(
                        ExternalDataCacheRecord.cache_key == cache_key
                    )
                )
                if not row:
                    return None
                exp = row.expires_at
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                is_expired = exp <= _utc_now()
                if is_expired and not allow_stale:
                    return None

                data = json.loads(row.payload_json)
                row.hit_count = int(row.hit_count or 0) + 1
                if is_expired and allow_stale:
                    row.verification_status = "stale_fallback"
                db.commit()

                label = str(data.get("source_label") or "USDA FoodData Central")
                if is_expired and allow_stale and "(Cached Fallback)" not in label:
                    label = f"{label} (Cached Fallback)"

                return nutrition_module.NutrientProfile100g(
                    canonical_name=str(data["canonical_name"]),
                    calories=float(data["calories"]),
                    protein=float(data["protein"]),
                    carbohydrates=float(data["carbohydrates"]),
                    fats=float(data["fats"]),
                    fibre=float(data.get("fibre", 0.0)),
                    sugar=float(data.get("sugar", 0.0)),
                    sodium_mg=float(data.get("sodium_mg", 0.0)),
                    calcium_mg=float(data.get("calcium_mg", 0.0)),
                    iron_mg=float(data.get("iron_mg", 0.0)),
                    vitamin_c_mg=float(data.get("vitamin_c_mg", 0.0)),
                    potassium_mg=float(data.get("potassium_mg", 0.0)),
                    source_type="usda_fdc",
                    source_label=label,
                )
        except Exception:
            return None

    def write_usda_cache_to_db(
        query_norm: str,
        profile: Any,
        source_url: str,
        external_id: str | None,
    ) -> None:
        cache_key = f"usda_fdc_search:{query_norm}"
        payload = {
            "canonical_name": profile.canonical_name,
            "calories": profile.calories,
            "protein": profile.protein,
            "carbohydrates": profile.carbohydrates,
            "fats": profile.fats,
            "fibre": profile.fibre,
            "sugar": profile.sugar,
            "sodium_mg": profile.sodium_mg,
            "calcium_mg": profile.calcium_mg,
            "iron_mg": profile.iron_mg,
            "vitamin_c_mg": profile.vitamin_c_mg,
            "potassium_mg": profile.potassium_mg,
            "source_label": profile.source_label,
        }
        now = _utc_now()
        expires = now + timedelta(days=CACHE_TTL_DAYS)
        try:
            with SessionLocal() as db:
                row = db.scalar(
                    select(ExternalDataCacheRecord).where(
                        ExternalDataCacheRecord.cache_key == cache_key
                    )
                )
                if row:
                    row.payload_json = json.dumps(payload)
                    row.source_url = source_url[:500]
                    row.external_id = (external_id or "")[:120] or None
                    row.last_updated_at = now
                    row.expires_at = expires
                    row.verification_status = "verified_api"
                else:
                    db.add(
                        ExternalDataCacheRecord(
                            cache_key=cache_key,
                            source_name="USDA FoodData Central",
                            source_url=source_url[:500],
                            external_id=(external_id or "")[:120] or None,
                            data_type="ingredient_nutrition",
                            payload_json=json.dumps(payload),
                            fetched_at=now,
                            last_updated_at=now,
                            expires_at=expires,
                            verification_status="verified_api",
                            hit_count=1,
                        )
                    )
                db.commit()
        except Exception:
            pass

    def cache_external_payload(
        cache_key: str,
        source_name: str,
        source_url: str,
        external_id: str | None,
        data_type: str,
        payload: Any,
        ttl_days: int = 7,
        verification_status: str = "ai_generated_estimate",
    ) -> None:
        now = _utc_now()
        expires = now + timedelta(days=ttl_days)
        try:
            with SessionLocal() as db:
                row = db.scalar(
                    select(ExternalDataCacheRecord).where(
                        ExternalDataCacheRecord.cache_key == cache_key[:180]
                    )
                )
                serialized = json.dumps(payload)
                if row:
                    row.payload_json = serialized
                    row.last_updated_at = now
                    row.expires_at = expires
                    row.verification_status = verification_status
                    row.hit_count = int(row.hit_count or 0) + 1
                else:
                    db.add(
                        ExternalDataCacheRecord(
                            cache_key=cache_key[:180],
                            source_name=source_name[:120],
                            source_url=source_url[:500],
                            external_id=(external_id or "")[:120] or None,
                            data_type=data_type[:64],
                            payload_json=serialized,
                            fetched_at=now,
                            last_updated_at=now,
                            expires_at=expires,
                            verification_status=verification_status,
                            hit_count=1,
                        )
                    )
                db.commit()
        except Exception:
            pass

    nutrition_module.set_external_cache_backend(
        reader=read_usda_cache_from_db,
        writer=write_usda_cache_to_db,
    )

    # -----------------------------------------------------------------------
    # API Routes (Uploads, External Cache Traceability, Workspace Sync)
    # -----------------------------------------------------------------------
    storage_router = APIRouter(tags=["Persistence, Uploads & Cache"])

    @storage_router.get("/api/uploads/{file_key}")
    def get_private_upload(
        file_key: str,
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> FileResponse:
        row = db.scalar(
            select(UploadedFileRecord).where(UploadedFileRecord.file_key == file_key)
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Uploaded file not found.")
        if row.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: you do not own this uploaded file.",
            )
        target = (PRIVATE_UPLOAD_DIR / row.relative_path).resolve()
        if not target.is_relative_to(PRIVATE_UPLOAD_DIR) or not target.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Stored image file is unavailable on this server node.",
            )
        return FileResponse(
            path=target,
            media_type=row.mime_type,
            headers={"Cache-Control": "private, max-age=3600"},
        )

    @storage_router.get("/api/uploads", response_model=list[UploadedFileOut])
    def list_my_uploads(
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> list[UploadedFileOut]:
        rows = list(
            db.scalars(
                select(UploadedFileRecord)
                .where(UploadedFileRecord.user_id == current_user.id)
                .order_by(UploadedFileRecord.created_at.desc())
                .limit(50)
            ).all()
        )
        return [
            UploadedFileOut(
                id=r.id,
                file_key=r.file_key,
                mime_type=r.mime_type,
                size_bytes=r.size_bytes,
                storage_backend=r.storage_backend,
                is_private=r.is_private,
                access_url=f"/api/uploads/{r.file_key}",
                created_at=r.created_at,
            )
            for r in rows
        ]

    @storage_router.get("/api/cache/external", response_model=list[ExternalCacheEntryOut])
    def inspect_external_cache(
        data_type: str | None = Query(default=None),
        limit: int = Query(default=30, ge=1, le=200),
        db: Session = Depends(get_db),
    ) -> list[ExternalCacheEntryOut]:
        stmt = select(ExternalDataCacheRecord).order_by(
            ExternalDataCacheRecord.last_updated_at.desc()
        )
        if data_type:
            stmt = stmt.where(ExternalDataCacheRecord.data_type == data_type)
        rows = list(db.scalars(stmt.limit(limit)).all())
        return [
            ExternalCacheEntryOut(
                cache_key=r.cache_key,
                source_name=r.source_name,
                source_url=r.source_url,
                external_id=r.external_id,
                data_type=r.data_type,
                fetched_at=r.fetched_at,
                last_updated_at=r.last_updated_at,
                expires_at=r.expires_at,
                verification_status=r.verification_status,
                hit_count=r.hit_count,
            )
            for r in rows
        ]

    @storage_router.get("/api/workspace/state", response_model=WorkspaceStateOut)
    def get_saved_workspace(
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> WorkspaceStateOut:
        row = db.scalar(
            select(UserSavedWorkspace).where(UserSavedWorkspace.user_id == current_user.id)
        )
        if not row:
            return WorkspaceStateOut(
                saved_meal_plan=[],
                planner_source=None,
                grocery_items=[],
                daily_targets=None,
                updated_at=None,
            )
        return WorkspaceStateOut(
            saved_meal_plan=json.loads(row.saved_meal_plan_json or "[]"),
            planner_source=row.planner_source,
            grocery_items=json.loads(row.grocery_items_json or "[]"),
            daily_targets=json.loads(row.daily_targets_json) if row.daily_targets_json else None,
            updated_at=row.updated_at,
        )

    @storage_router.put("/api/workspace/state", response_model=WorkspaceStateOut)
    def save_workspace_state(
        payload: WorkspaceStateUpdate,
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> WorkspaceStateOut:
        row = db.scalar(
            select(UserSavedWorkspace).where(UserSavedWorkspace.user_id == current_user.id)
        )
        now = _utc_now()
        if not row:
            row = UserSavedWorkspace(
                user_id=current_user.id,
                saved_meal_plan_json="[]",
                grocery_items_json="[]",
                updated_at=now,
            )
            db.add(row)

        if payload.saved_meal_plan is not None:
            row.saved_meal_plan_json = json.dumps(payload.saved_meal_plan)
        if payload.planner_source is not None:
            row.planner_source = payload.planner_source
        if payload.grocery_items is not None:
            row.grocery_items_json = json.dumps(payload.grocery_items)
        if payload.daily_targets is not None:
            row.daily_targets_json = json.dumps(payload.daily_targets)
        row.updated_at = now
        db.commit()
        db.refresh(row)

        return WorkspaceStateOut(
            saved_meal_plan=json.loads(row.saved_meal_plan_json or "[]"),
            planner_source=row.planner_source,
            grocery_items=json.loads(row.grocery_items_json or "[]"),
            daily_targets=json.loads(row.daily_targets_json) if row.daily_targets_json else None,
            updated_at=row.updated_at,
        )

    app.include_router(storage_router)

    return {
        "UploadedFileRecord": UploadedFileRecord,
        "ExternalDataCacheRecord": ExternalDataCacheRecord,
        "UserSavedWorkspace": UserSavedWorkspace,
        "save_private_upload": save_private_upload,
        "delete_user_upload_files_on_disk": delete_user_upload_files_on_disk,
        "cache_external_payload": cache_external_payload,
        "get_optional_user": get_optional_user,
    }
