"""Non-destructive logical PostgreSQL backup utility for NutriSense AI."""

from __future__ import annotations

import gzip
import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import inspect, text

from main import engine

BACKUP_DIR = Path(__file__).resolve().parent / "backups"


def _json_default(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def create_logical_backup() -> Path:
    """Export all PostgreSQL tables cleanly to a timestamped gzip JSON snapshot."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    insp = inspect(engine)
    table_names = sorted(insp.get_table_names())

    snapshot: dict[str, Any] = {
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "dialect": engine.dialect.name,
        "tables": {},
    }

    with engine.connect() as conn:
        for table in table_names:
            rows = conn.execute(text(f'SELECT * FROM "{table}"')).mappings().all()
            snapshot["tables"][table] = {
                "row_count": len(rows),
                "rows": [dict(r) for r in rows],
            }

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%SZ")
    out_path = BACKUP_DIR / f"nutrisense_pg_backup_{stamp}.json.gz"
    with gzip.open(out_path, "wt", encoding="utf-8") as fh:
        json.dump(snapshot, fh, default=_json_default, indent=2)

    return out_path


if __name__ == "__main__":
    backup_file = create_logical_backup()
    with gzip.open(backup_file, "rt", encoding="utf-8") as fh:
        data = json.load(fh)
    total_rows = sum(info["row_count"] for info in data["tables"].values())
    print(f"BACKUP_OK file={backup_file} tables={len(data['tables'])} total_rows={total_rows}")
