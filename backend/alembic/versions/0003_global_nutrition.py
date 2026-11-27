"""Additive Global Nutrition Intelligence tables (0003): global_food_items, global_meal_comparisons, global_meal_plans, food_education_progress, seasonal_food_records.

Revision ID: 0003_global_nutrition
Revises: 0002_women_wellness_upgrade
Create Date: 2026-11-28
"""
from __future__ import annotations

from typing import Sequence, Union
from alembic import op

revision: str = "0003_global_nutrition"
down_revision: Union[str, Sequence[str], None] = "0002_women_wellness_upgrade"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from global_nutrition import sync_global_nutrition_catalog
    from main import Base, SessionLocal

    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)

    with SessionLocal() as db:
        sync_global_nutrition_catalog(db)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS seasonal_food_records")
    op.execute("DROP TABLE IF EXISTS food_education_progress")
    op.execute("DROP TABLE IF EXISTS global_meal_plans")
    op.execute("DROP TABLE IF EXISTS global_meal_comparisons")
    op.execute("DROP TABLE IF EXISTS global_food_items")
