"""Baseline and non-destructive persistence audit schema upgrade.

Revision ID: 0001_audit_persistence
Revises:
Create Date: 2026-11-27
"""
from __future__ import annotations

from typing import Sequence, Union
from alembic import op

revision: str = "0001_audit_persistence"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from main import Base
    from persistence_layer import ensure_audit_schema_upgrades

    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)
    ensure_audit_schema_upgrades(bind.engine)


def downgrade() -> None:
    op.execute("ALTER TABLE profile_food_entries DROP COLUMN IF EXISTS nutrition_sources_json")
    op.execute("ALTER TABLE profile_food_entries DROP COLUMN IF EXISTS confirmed_at")
    op.execute("ALTER TABLE profile_food_entries DROP COLUMN IF EXISTS confirmed_by_user")
    op.execute("ALTER TABLE profile_food_entries DROP COLUMN IF EXISTS ai_estimated")
    op.execute("ALTER TABLE profile_food_entries DROP COLUMN IF EXISTS image_ref")
    op.execute("ALTER TABLE profile_food_entries DROP COLUMN IF EXISTS image_file_id")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS last_login_at")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS account_status")
