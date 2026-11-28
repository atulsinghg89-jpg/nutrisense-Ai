"""Isolated test suite for server-verified purchase rewards, HMAC postbacks, and Alembic 0004 migration."""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

# Point DATABASE_URL at an isolated temporary SQLite database BEFORE importing app/main.
_TMP_DIR = tempfile.TemporaryDirectory(prefix="nutrisense_rewards_test_")
_TEST_DB_PATH = Path(_TMP_DIR.name) / "test_rewards.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB_PATH.as_posix()}"
os.environ["AFFILIATE_REWARDS_ENABLED"] = "false"
os.environ["AFFILIATE_POSTBACK_SECRET"] = "test-only-hmac-secret-do-not-use-in-prod"
os.environ["REWARD_COINS_PER_PURCHASE"] = "50"
os.environ["REWARD_DIAMONDS_PER_PURCHASE"] = "1"
os.environ["REWARD_DAILY_DIAMOND_CAP"] = "2"
os.environ["AFFILIATE_POSTBACK_TOLERANCE_SECONDS"] = "300"

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import httpx2  # noqa: E402
from alembic import command as alembic_command  # noqa: E402
from alembic.config import Config as AlembicConfig  # noqa: E402
from sqlalchemy import create_engine, inspect, select  # noqa: E402

import main as app_main  # noqa: E402
import wellness_catalog  # noqa: E402

# Rebind engine & SessionLocal cleanly to an isolated SQLite engine with check_same_thread=False
# so FastAPI AnyIO threadpool workers can access the isolated test DB concurrently.
app_main.engine.dispose()
app_main.engine = create_engine(
    os.environ["DATABASE_URL"],
    connect_args={"check_same_thread": False},
)
app_main.SessionLocal.configure(bind=app_main.engine)


def _sign_postback(secret: str, ts: int | str, body_bytes: bytes) -> str:
    signed = f"{ts}.".encode("utf-8") + body_bytes
    return hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()


class RewardsBackendTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        app_main.Base.metadata.create_all(bind=app_main.engine)
        with app_main.SessionLocal() as db:
            wellness_catalog.sync_verified_seed_catalog(db)

            # Configure ONE test affiliate listing (general wellness bottle) + mark baby/patient listings
            # as affiliate strictly inside the test DB to prove category blocks refuse grants even if clicked.
            ProductCatalogItem = app_main._catalog_ctx["ProductCatalogItem"]
            ProductRetailerListing = app_main._catalog_ctx["ProductRetailerListing"]

            hydration_item = db.scalar(
                select(ProductCatalogItem).where(
                    ProductCatalogItem.slug == "milton-thermosteel-500-1000"
                )
            )
            fitness_item = db.scalar(
                select(ProductCatalogItem).where(
                    ProductCatalogItem.slug == "decathlon-domyos-mat-bands"
                )
            )
            baby_item = db.scalar(
                select(ProductCatalogItem).where(
                    ProductCatalogItem.slug == "philips-avent-classic-bottle"
                )
            )
            patient_item = db.scalar(
                select(ProductCatalogItem).where(
                    ProductCatalogItem.slug == "omron-hem-7120-bp-monitor"
                )
            )
            assert hydration_item and fitness_item and baby_item and patient_item

            cls.hydration_listing_id = cls._enable_test_affiliate(
                db, ProductRetailerListing, hydration_item.id, "https://www.milton.in/aff"
            )
            cls.fitness_listing_id = cls._enable_test_affiliate(
                db, ProductRetailerListing, fitness_item.id, "https://www.decathlon.in/aff"
            )
            cls.baby_listing_id = cls._enable_test_affiliate(
                db, ProductRetailerListing, baby_item.id, "https://www.philips.co.in/aff"
            )
            cls.patient_listing_id = cls._enable_test_affiliate(
                db, ProductRetailerListing, patient_item.id, "https://www.omronhealthcare-ap.com/aff"
            )
            # Keep Whisper pads non-affiliate to verify direct links never produce eligible rewards
            whisper_item = db.scalar(
                select(ProductCatalogItem).where(
                    ProductCatalogItem.slug == "stayfree-whisper-cotton-pads"
                )
            )
            assert whisper_item
            whisper_listing = db.scalar(
                select(ProductRetailerListing).where(
                    ProductRetailerListing.product_id == whisper_item.id
                )
            )
            assert whisper_listing
            cls.non_affiliate_listing_id = whisper_listing.id
            db.commit()

    @staticmethod
    def _enable_test_affiliate(
        db: object, listing_model: type, product_id: int, affiliate_url: str
    ) -> int:
        row = db.scalar(  # type: ignore[attr-defined]
            select(listing_model).where(listing_model.product_id == product_id)
        )
        row.is_affiliate = True
        row.affiliate_url = affiliate_url
        row.link_type = "affiliate_test_only"
        return int(row.id)

    @classmethod
    def tearDownClass(cls) -> None:
        app_main.engine.dispose()
        _TMP_DIR.cleanup()

    def setUp(self) -> None:
        wellness_catalog._RATE_BUCKETS.clear()
        os.environ["AFFILIATE_REWARDS_ENABLED"] = "true"
        os.environ["AFFILIATE_POSTBACK_SECRET"] = "test-only-hmac-secret-do-not-use-in-prod"
        os.environ["REWARD_COINS_PER_PURCHASE"] = "50"
        os.environ["REWARD_DIAMONDS_PER_PURCHASE"] = "1"
        os.environ["REWARD_DAILY_DIAMOND_CAP"] = "2"
        os.environ["AFFILIATE_POSTBACK_TOLERANCE_SECONDS"] = "300"
        os.environ.pop("AFFILIATE_FIELD_CLICK_ID", None)
        os.environ.pop("AFFILIATE_FIELD_STATUS", None)

    def _run_async(self, coro):
        return asyncio.run(coro)

    async def _register_and_login(
        self,
        client: httpx2.AsyncClient,
        email: str,
        age_years: int | None = 28,
        profile_type: str = "personal",
    ) -> int:
        resp = await client.post(
            "/api/auth/register",
            json={
                "full_name": "Reward Test User",
                "email": email,
                "password": "StrongPassword!123",
                "initial_profile": {
                    "profile_type": profile_type,
                    "audience_chapter": "men" if profile_type == "personal" else "babies",
                    "display_name": "Primary",
                    "age_years": age_years,
                    "is_default": True,
                },
            },
        )
        if resp.status_code == 409:
            resp = await client.post(
                "/api/auth/login",
                json={"email": email, "password": "StrongPassword!123"},
            )
        self.assertIn(resp.status_code, (200, 201), resp.text)
        data = resp.json()
        return int(data["profiles"][0]["id"])

    def _make_client(self) -> httpx2.AsyncClient:
        transport = httpx2.ASGITransport(app=app_main.app)
        return httpx2.AsyncClient(transport=transport, base_url="http://127.0.0.1:8000")

    def test_01_feature_flag_off_by_default_disables_routes(self) -> None:
        os.environ["AFFILIATE_REWARDS_ENABLED"] = "false"

        async def scenario():
            async with self._make_client() as client:
                r1 = await client.get("/api/rewards/me")
                r2 = await client.post("/api/affiliate/click", json={"listing_id": self.hydration_listing_id})
                r3 = await client.post("/api/affiliate/postback", json={"sub_id": "ns_none", "status": "confirmed"})
                r4 = await client.get("/api/products")
                return r1, r2, r3, r4

        r1, r2, r3, r4 = self._run_async(scenario())
        self.assertEqual(r1.status_code, 404)
        self.assertEqual(r2.status_code, 404)
        self.assertEqual(r3.status_code, 404)
        # Existing endpoint behaviour remains intact
        self.assertEqual(r4.status_code, 200)
        self.assertGreaterEqual(len(r4.json()), 1)

    def test_02_alembic_0004_upgrade_and_reversible_downgrade_isolated_db(self) -> None:
        with tempfile.TemporaryDirectory(prefix="nutrisense_alembic_iso_") as tmpdir:
            alembic_db_path = Path(tmpdir) / "alembic_iso.db"
            iso_url = f"sqlite:///{alembic_db_path.as_posix()}"
            iso_engine = create_engine(iso_url)

            # Build pre-0004 baseline schema (all existing tables except reward_events)
            tables_without_rewards = [
                t for name, t in app_main.Base.metadata.tables.items() if name != "reward_events"
            ]
            app_main.Base.metadata.create_all(bind=iso_engine, tables=tables_without_rewards)
            pre_tables = set(inspect(iso_engine).get_table_names())
            self.assertNotIn("reward_events", pre_tables)
            iso_engine.dispose()

            # Temporarily point alembic env module's DATABASE_URL/engine at isolated DB
            orig_url = app_main.DATABASE_URL
            orig_engine = app_main.engine
            app_main.DATABASE_URL = iso_url
            app_main.engine = create_engine(iso_url)
            try:
                cfg = AlembicConfig(str(BACKEND_DIR / "alembic.ini"))
                cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
                alembic_command.stamp(cfg, "0003_global_nutrition")
                alembic_command.upgrade(cfg, "0004_reward_events")

                check_eng = create_engine(iso_url)
                insp = inspect(check_eng)
                self.assertIn("reward_events", insp.get_table_names())
                col_names = {c["name"] for c in insp.get_columns("reward_events")}
                self.assertTrue(
                    {
                        "id",
                        "user_id",
                        "click_id",
                        "product_listing_id",
                        "status",
                        "coins",
                        "diamonds",
                        "created_at",
                        "confirmed_at",
                        "reversed_at",
                    }.issubset(col_names)
                )
                idx_names = {ix["name"] for ix in insp.get_indexes("reward_events")}
                self.assertIn("ix_reward_events_user_id", idx_names)
                self.assertIn("ix_reward_events_click_id", idx_names)
                check_eng.dispose()

                # Reversible downgrade must drop reward_events while keeping pre-existing tables intact
                alembic_command.downgrade(cfg, "0003_global_nutrition")
                after_eng = create_engine(iso_url)
                after_tables = set(inspect(after_eng).get_table_names())
                self.assertNotIn("reward_events", after_tables)
                for pre_tbl in pre_tables:
                    self.assertIn(pre_tbl, after_tables)
                after_eng.dispose()
            finally:
                app_main.engine.dispose()
                app_main.DATABASE_URL = orig_url
                app_main.engine = orig_engine

    def test_03_unauthenticated_access_rejected(self) -> None:
        async def scenario():
            async with self._make_client() as client:
                r_me = await client.get("/api/rewards/me")
                r_click = await client.post(
                    "/api/affiliate/click",
                    json={"listing_id": self.hydration_listing_id},
                )
                return r_me, r_click

        r_me, r_click = self._run_async(scenario())
        self.assertEqual(r_me.status_code, 401)
        self.assertEqual(r_click.status_code, 401)

    def test_04_valid_postback_grants_server_amounts_and_replay_is_idempotent(self) -> None:
        async def scenario():
            async with self._make_client() as client:
                profile_id = await self._register_and_login(client, "valid_flow@example.com", age_years=27)

                click_resp = await client.post(
                    "/api/affiliate/click",
                    json={
                        "listing_id": self.hydration_listing_id,
                        "profile_id": profile_id,
                        "referrer_section": "wellness_catalog",
                    },
                )
                self.assertEqual(click_resp.status_code, 200, click_resp.text)
                click_data = click_resp.json()
                self.assertTrue(click_data["reward_eligible"])
                self.assertEqual(click_data["status"], "clicked")
                click_id = click_data["click_id"]

                # Attacker tries injecting huge reward amounts inside payload -> must be ignored!
                payload_bytes = json.dumps(
                    {
                        "sub_id": click_id,
                        "status": "confirmed",
                        "transaction_id": "tx-99100",
                        "coins": 999999,
                        "diamonds": 999,
                    }
                ).encode("utf-8")
                ts = str(int(time.time()))
                sig = _sign_postback(os.environ["AFFILIATE_POSTBACK_SECRET"], ts, payload_bytes)

                pb1 = await client.post(
                    "/api/affiliate/postback",
                    content=payload_bytes,
                    headers={
                        "Content-Type": "application/json",
                        "X-Affiliate-Timestamp": ts,
                        "X-Affiliate-Signature": f"sha256={sig}",
                    },
                )
                self.assertEqual(pb1.status_code, 200, pb1.text)
                pb1_json = pb1.json()
                self.assertEqual(pb1_json["status"], "confirmed")
                self.assertEqual(pb1_json["coins"], 50)
                self.assertEqual(pb1_json["diamonds"], 1)
                self.assertFalse(pb1_json["idempotent_replay"])

                # Replay exact confirmed postback -> safe idempotent replay, zero extra grant
                pb2 = await client.post(
                    "/api/affiliate/postback",
                    content=payload_bytes,
                    headers={
                        "Content-Type": "application/json",
                        "X-Affiliate-Timestamp": ts,
                        "X-Affiliate-Signature": sig,
                    },
                )
                self.assertEqual(pb2.status_code, 200, pb2.text)
                pb2_json = pb2.json()
                self.assertTrue(pb2_json["idempotent_replay"])
                self.assertEqual(pb2_json["diamonds"], 1)

                me_resp = await client.get("/api/rewards/me")
                self.assertEqual(me_resp.status_code, 200)
                return me_resp.json()

        me = self._run_async(scenario())
        self.assertEqual(me["confirmed_coins"], 50)
        self.assertEqual(me["confirmed_diamonds"], 1)
        self.assertEqual(me["remaining_daily_diamonds"], 1)

    def test_05_bad_signature_and_expired_timestamp_rejected(self) -> None:
        async def scenario():
            async with self._make_client() as client:
                profile_id = await self._register_and_login(client, "sig_test@example.com", age_years=30)
                click_resp = await client.post(
                    "/api/affiliate/click",
                    json={"listing_id": self.hydration_listing_id, "profile_id": profile_id},
                )
                click_id = click_resp.json()["click_id"]

                body = json.dumps({"sub_id": click_id, "status": "confirmed"}).encode("utf-8")
                now_ts = str(int(time.time()))

                bad_sig = await client.post(
                    "/api/affiliate/postback",
                    content=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-Affiliate-Timestamp": now_ts,
                        "X-Affiliate-Signature": "deadbeef" * 8,
                    },
                )
                missing_hdr = await client.post("/api/affiliate/postback", content=body)

                stale_ts = str(int(time.time()) - 900)
                stale_sig = _sign_postback(os.environ["AFFILIATE_POSTBACK_SECRET"], stale_ts, body)
                expired = await client.post(
                    "/api/affiliate/postback",
                    content=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-Affiliate-Timestamp": stale_ts,
                        "X-Affiliate-Signature": stale_sig,
                    },
                )

                me = await client.get("/api/rewards/me")
                return bad_sig, missing_hdr, expired, me.json()

        bad_sig, missing_hdr, expired, me = self._run_async(scenario())
        self.assertEqual(bad_sig.status_code, 401)
        self.assertEqual(missing_hdr.status_code, 401)
        self.assertEqual(expired.status_code, 401)
        self.assertNotIn("test-only-hmac-secret", bad_sig.text)
        self.assertEqual(me["confirmed_coins"], 0)
        self.assertEqual(me["confirmed_diamonds"], 0)

    def test_06_reversal_zeros_reward_and_blocks_reconfirm(self) -> None:
        async def scenario():
            async with self._make_client() as client:
                profile_id = await self._register_and_login(client, "rev_test@example.com", age_years=25)
                click_id = (
                    await client.post(
                        "/api/affiliate/click",
                        json={"listing_id": self.hydration_listing_id, "profile_id": profile_id},
                    )
                ).json()["click_id"]

                secret = os.environ["AFFILIATE_POSTBACK_SECRET"]
                ts = str(int(time.time()))

                conf_body = json.dumps({"sub_id": click_id, "status": "confirmed"}).encode("utf-8")
                await client.post(
                    "/api/affiliate/postback",
                    content=conf_body,
                    headers={
                        "Content-Type": "application/json",
                        "X-Affiliate-Timestamp": ts,
                        "X-Affiliate-Signature": _sign_postback(secret, ts, conf_body),
                    },
                )

                rev_body = json.dumps({"sub_id": click_id, "status": "returned"}).encode("utf-8")
                rev_resp = await client.post(
                    "/api/affiliate/postback",
                    content=rev_body,
                    headers={
                        "Content-Type": "application/json",
                        "X-Affiliate-Timestamp": ts,
                        "X-Affiliate-Signature": _sign_postback(secret, ts, rev_body),
                    },
                )

                # Attempting to re-confirm after reversal must remain reversed with 0 grants
                reconf_resp = await client.post(
                    "/api/affiliate/postback",
                    content=conf_body,
                    headers={
                        "Content-Type": "application/json",
                        "X-Affiliate-Timestamp": ts,
                        "X-Affiliate-Signature": _sign_postback(secret, ts, conf_body),
                    },
                )
                me = await client.get("/api/rewards/me")
                return rev_resp, reconf_resp, me.json()

        rev_resp, reconf_resp, me = self._run_async(scenario())
        self.assertEqual(rev_resp.status_code, 200)
        self.assertEqual(rev_resp.json()["status"], "reversed")
        self.assertEqual(rev_resp.json()["coins"], 0)
        self.assertEqual(rev_resp.json()["diamonds"], 0)
        self.assertEqual(reconf_resp.json()["status"], "reversed")
        self.assertEqual(me["confirmed_coins"], 0)
        self.assertEqual(me["confirmed_diamonds"], 0)
        self.assertIsNotNone(me["events"][0]["reversed_at"])

    def test_07_daily_diamond_cap_enforced_server_side(self) -> None:
        os.environ["REWARD_DAILY_DIAMOND_CAP"] = "2"

        async def scenario():
            async with self._make_client() as client:
                profile_id = await self._register_and_login(client, "cap_user@example.com", age_years=29)
                secret = os.environ["AFFILIATE_POSTBACK_SECRET"]
                ts = str(int(time.time()))
                results = []
                for idx in range(3):
                    listing_id = self.hydration_listing_id if idx % 2 == 0 else self.fitness_listing_id
                    click_id = (
                        await client.post(
                            "/api/affiliate/click",
                            json={"listing_id": listing_id, "profile_id": profile_id},
                        )
                    ).json()["click_id"]
                    body = json.dumps({"sub_id": click_id, "status": "approved"}).encode("utf-8")
                    pb = await client.post(
                        "/api/affiliate/postback",
                        content=body,
                        headers={
                            "Content-Type": "application/json",
                            "X-Affiliate-Timestamp": ts,
                            "X-Affiliate-Signature": _sign_postback(secret, ts, body),
                        },
                    )
                    results.append(pb.json())
                me = (await client.get("/api/rewards/me")).json()
                return results, me

        results, me = self._run_async(scenario())
        self.assertEqual([r["diamonds"] for r in results], [1, 1, 0])
        self.assertEqual(me["confirmed_diamonds"], 2)
        self.assertEqual(me["today_diamonds_granted"], 2)
        self.assertEqual(me["remaining_daily_diamonds"], 0)

    def test_08_cross_user_access_denied_and_isolated(self) -> None:
        async def scenario():
            async with self._make_client() as client_a:
                prof_a = await self._register_and_login(client_a, "user_a_iso@example.com", age_years=31)
                click_id = (
                    await client_a.post(
                        "/api/affiliate/click",
                        json={"listing_id": self.hydration_listing_id, "profile_id": prof_a},
                    )
                ).json()["click_id"]
                secret = os.environ["AFFILIATE_POSTBACK_SECRET"]
                ts = str(int(time.time()))
                body = json.dumps({"sub_id": click_id, "status": "confirmed"}).encode("utf-8")
                await client_a.post(
                    "/api/affiliate/postback",
                    content=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-Affiliate-Timestamp": ts,
                        "X-Affiliate-Signature": _sign_postback(secret, ts, body),
                    },
                )

            async with self._make_client() as client_b:
                await self._register_and_login(client_b, "user_b_iso@example.com", age_years=26)
                me_b = await client_b.get("/api/rewards/me")
                cross_click = await client_b.post(
                    "/api/affiliate/click",
                    json={"listing_id": self.hydration_listing_id, "profile_id": prof_a},
                )
                return me_b.json(), cross_click.status_code

        me_b, cross_click_status = self._run_async(scenario())
        self.assertEqual(me_b["confirmed_coins"], 0)
        self.assertEqual(me_b["confirmed_diamonds"], 0)
        self.assertEqual(me_b["events"], [])
        self.assertEqual(cross_click_status, 403)

    def test_09_under_18_and_medical_baby_patient_categories_blocked(self) -> None:
        async def scenario():
            async with self._make_client() as client_minor:
                minor_prof = await self._register_and_login(
                    client_minor, "minor_user@example.com", age_years=16, profile_type="personal"
                )
                minor_click = (
                    await client_minor.post(
                        "/api/affiliate/click",
                        json={"listing_id": self.hydration_listing_id, "profile_id": minor_prof},
                    )
                ).json()
                secret = os.environ["AFFILIATE_POSTBACK_SECRET"]
                ts = str(int(time.time()))
                body = json.dumps(
                    {"sub_id": minor_click["click_id"], "status": "confirmed"}
                ).encode("utf-8")
                minor_pb = (
                    await client_minor.post(
                        "/api/affiliate/postback",
                        content=body,
                        headers={
                            "Content-Type": "application/json",
                            "X-Affiliate-Timestamp": ts,
                            "X-Affiliate-Signature": _sign_postback(secret, ts, body),
                        },
                    )
                ).json()
                minor_me = (await client_minor.get("/api/rewards/me")).json()

            async with self._make_client() as client_adult:
                adult_prof = await self._register_and_login(client_adult, "adult_cat_check@example.com", age_years=34)
                baby_click = (
                    await client_adult.post(
                        "/api/affiliate/click",
                        json={"listing_id": self.baby_listing_id, "profile_id": adult_prof},
                    )
                ).json()
                patient_click = (
                    await client_adult.post(
                        "/api/affiliate/click",
                        json={"listing_id": self.patient_listing_id, "profile_id": adult_prof},
                    )
                ).json()
                non_aff_click = (
                    await client_adult.post(
                        "/api/affiliate/click",
                        json={"listing_id": self.non_affiliate_listing_id, "profile_id": adult_prof},
                    )
                ).json()

                secret = os.environ["AFFILIATE_POSTBACK_SECRET"]
                ts = str(int(time.time()))
                baby_body = json.dumps({"sub_id": baby_click["click_id"], "status": "confirmed"}).encode("utf-8")
                baby_pb = (
                    await client_adult.post(
                        "/api/affiliate/postback",
                        content=baby_body,
                        headers={
                            "Content-Type": "application/json",
                            "X-Affiliate-Timestamp": ts,
                            "X-Affiliate-Signature": _sign_postback(secret, ts, baby_body),
                        },
                    )
                ).json()
                patient_body = json.dumps({"sub_id": patient_click["click_id"], "status": "confirmed"}).encode("utf-8")
                patient_pb = (
                    await client_adult.post(
                        "/api/affiliate/postback",
                        content=patient_body,
                        headers={
                            "Content-Type": "application/json",
                            "X-Affiliate-Timestamp": ts,
                            "X-Affiliate-Signature": _sign_postback(secret, ts, patient_body),
                        },
                    )
                ).json()
                return (
                    minor_click,
                    minor_pb,
                    minor_me,
                    baby_click,
                    baby_pb,
                    patient_click,
                    patient_pb,
                    non_aff_click,
                )

        (
            minor_click,
            minor_pb,
            minor_me,
            baby_click,
            baby_pb,
            patient_click,
            patient_pb,
            non_aff_click,
        ) = self._run_async(scenario())

        self.assertFalse(minor_click["reward_eligible"])
        self.assertEqual(minor_pb["status"], "rejected")
        self.assertEqual(minor_pb["diamonds"], 0)
        self.assertEqual(minor_me["confirmed_diamonds"], 0)

        self.assertFalse(baby_click["reward_eligible"])
        self.assertEqual(baby_pb["status"], "rejected")
        self.assertEqual(baby_pb["diamonds"], 0)

        self.assertFalse(patient_click["reward_eligible"])
        self.assertEqual(patient_pb["status"], "rejected")
        self.assertEqual(patient_pb["diamonds"], 0)

        self.assertFalse(non_aff_click["reward_eligible"])

    def test_10_configurable_network_payload_field_names(self) -> None:
        os.environ["AFFILIATE_FIELD_CLICK_ID"] = "clickref"
        os.environ["AFFILIATE_FIELD_STATUS"] = "conv_state"

        async def scenario():
            async with self._make_client() as client:
                prof = await self._register_and_login(client, "custom_fields@example.com", age_years=26)
                click_id = (
                    await client.post(
                        "/api/affiliate/click",
                        json={"listing_id": self.fitness_listing_id, "profile_id": prof},
                    )
                ).json()["click_id"]
                body = json.dumps({"clickref": click_id, "conv_state": "converted"}).encode("utf-8")
                ts = str(int(time.time()))
                sig = _sign_postback(os.environ["AFFILIATE_POSTBACK_SECRET"], ts, body)
                return await client.post(
                    "/api/affiliate/postback",
                    content=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-Affiliate-Timestamp": ts,
                        "X-Affiliate-Signature": sig,
                    },
                )

        pb = self._run_async(scenario())
        self.assertEqual(pb.status_code, 200, pb.text)
        self.assertEqual(pb.json()["status"], "confirmed")
        self.assertEqual(pb.json()["diamonds"], 1)

    def test_11_rate_limit_enforced_on_postback(self) -> None:
        async def scenario():
            async with self._make_client() as client:
                body = json.dumps({"sub_id": "ns_missing", "status": "confirmed"}).encode("utf-8")
                ts = str(int(time.time()))
                sig = _sign_postback(os.environ["AFFILIATE_POSTBACK_SECRET"], ts, body)
                statuses = []
                for _ in range(125):
                    r = await client.post(
                        "/api/affiliate/postback",
                        content=body,
                        headers={
                            "Content-Type": "application/json",
                            "X-Affiliate-Timestamp": ts,
                            "X-Affiliate-Signature": sig,
                        },
                    )
                    statuses.append(r.status_code)
                    if r.status_code == 429:
                        break
                return statuses

        statuses = self._run_async(scenario())
        self.assertEqual(statuses[-1], 429)


if __name__ == "__main__":
    unittest.main(verbosity=2)
