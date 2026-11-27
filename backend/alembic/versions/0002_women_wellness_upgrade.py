"""Additive Women's Wellness Consent, BMI History, Period Care Catalog, and Security Upgrade.

Revision ID: 0002_women_wellness_upgrade
Revises: 0001_audit_persistence
Create Date: 2026-11-27
"""
from __future__ import annotations

from typing import Sequence, Union
from alembic import op

revision: str = "0002_women_wellness_upgrade"
down_revision: Union[str, Sequence[str], None] = "0001_audit_persistence"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from main import Base, SessionLocal
    from persistence_layer import ensure_audit_schema_upgrades
    from wellness_catalog import sync_verified_seed_catalog

    bind = op.get_bind()
    ensure_audit_schema_upgrades(bind.engine)
    Base.metadata.create_all(bind=bind)

    with SessionLocal() as db:
        sync_verified_seed_catalog(db)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS womens_bmi_history")
    op.execute("DROP TABLE IF EXISTS womens_consent_events")
    op.execute("ALTER TABLE product_retailer_listings DROP COLUMN IF EXISTS source_provenance")
    op.execute("ALTER TABLE product_retailer_listings DROP COLUMN IF EXISTS original_price_inr")
    op.execute("ALTER TABLE product_catalog_items DROP COLUMN IF EXISTS has_verified_image")
    op.execute("ALTER TABLE product_catalog_items DROP COLUMN IF EXISTS sub_category")
    op.execute("ALTER TABLE product_catalog_items DROP COLUMN IF EXISTS variant_label")
    op.execute("ALTER TABLE cycle_symptom_mood_records DROP COLUMN IF EXISTS energy_level")
    op.execute("ALTER TABLE cycle_symptom_mood_records DROP COLUMN IF EXISTS cramps_level")
    op.execute("ALTER TABLE cycle_symptom_mood_records DROP COLUMN IF EXISTS symptom_severity")
    op.execute("ALTER TABLE cycle_symptom_mood_records DROP COLUMN IF EXISTS period_record_id")
    op.execute("ALTER TABLE menstrual_period_records DROP COLUMN IF EXISTS updated_at")
    op.execute("ALTER TABLE womens_wellness_preferences DROP COLUMN IF EXISTS created_at")
    op.execute("ALTER TABLE womens_wellness_preferences DROP COLUMN IF EXISTS activity_preferences_json")
    op.execute("ALTER TABLE womens_wellness_preferences DROP COLUMN IF EXISTS dietary_preferences_json")
    op.execute("ALTER TABLE womens_wellness_preferences DROP COLUMN IF EXISTS age_band")
