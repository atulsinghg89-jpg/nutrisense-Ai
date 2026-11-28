"""Add reversible reward_events table for server-confirmed purchase rewards.

Revision ID: 0004_reward_events
Revises: 0003_global_nutrition
Create Date: 2026-11-28
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_reward_events"
down_revision: Union[str, Sequence[str], None] = "0003_global_nutrition"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "reward_events",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("click_id", sa.String(length=64), nullable=False),
        sa.Column(
            "affiliate_click_event_id",
            sa.Integer(),
            sa.ForeignKey("affiliate_click_events.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "product_listing_id",
            sa.Integer(),
            sa.ForeignKey("product_retailer_listings.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(length=24),
            nullable=False,
            server_default="clicked",
        ),
        sa.Column("coins", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("diamonds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("external_tx_id", sa.String(length=120), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reversed_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("click_id", name="uq_reward_events_click_id"),
    )
    op.create_index("ix_reward_events_id", "reward_events", ["id"])
    op.create_index("ix_reward_events_user_id", "reward_events", ["user_id"])
    op.create_index(
        "ix_reward_events_click_id", "reward_events", ["click_id"], unique=True
    )


def downgrade() -> None:
    op.drop_index("ix_reward_events_click_id", table_name="reward_events")
    op.drop_index("ix_reward_events_user_id", table_name="reward_events")
    op.drop_index("ix_reward_events_id", table_name="reward_events")
    op.drop_table("reward_events")
