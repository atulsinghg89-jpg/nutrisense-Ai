"""Alembic environment reusing NutriSense SQLAlchemy Base and normalized engine."""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from main import Base, DATABASE_URL, engine  # noqa: E402

config.set_main_option("sqlalchemy.url", DATABASE_URL)
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
