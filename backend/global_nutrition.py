"""Global & Japan-Inspired National Nutrition Intelligence Module for NutriSense AI.

Provides database-grounded endpoints under `/api/global` inspired by:
- Japan MAFF Japanese Food Guide Spinning Top (English-language SV guide)
- Japan MAFF Shokuiku Food and Nutrition Education
- Japan MEXT Standard Tables of Food Composition (8th Revised Edition)
- Traditional balanced dietary patterns & seasonal meal planning

Strict anti-fabrication rules:
- Nutrient math is computed deterministically from verified MEXT / ICMR-NIN / USDA values.
- All user-facing UI text, labels, names, and insights are strictly in English.
- Zero government impersonation, zero fake food prices, zero fabricated user statistics.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
import json
from typing import Any, Callable, Literal

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    select,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _round2(value: float) -> float:
    return round(float(value), 2)


def _parse_json_list(raw: str | None) -> list[Any]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def _parse_json_dict(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except (json.JSONDecodeError, TypeError):
        return {}


_SYNC_GLOBAL_HOOK: Callable[..., None] | None = None
_GLOBAL_CATALOG_SYNCED: bool = False


def sync_global_nutrition_catalog(db: Session) -> None:
    """Idempotent sync callable from Alembic 0003 migration or startup."""
    if _SYNC_GLOBAL_HOOK is not None:
        _SYNC_GLOBAL_HOOK(db, force=True)


# ---------------------------------------------------------------------------
# Curated Verified Reference Seeds (All Strictly English)
# ---------------------------------------------------------------------------

SEED_GLOBAL_FOODS: list[dict[str, Any]] = [
    # --- JAPAN (MEXT 8th Revised Edition 2020/2023) ---
    {
        "slug": "jp-cooked-white-rice",
        "name": "Japanese Steamed White Rice (Short-Grain)",
        "country_code": "JP",
        "food_category": "Grain Dishes",
        "is_vegetarian": True,
        "serving_label": "1 small rice bowl (150 g)",
        "serving_grams": 150.0,
        "preparation_method": "Washed and steamed in plain water without oil or salt",
        "preparation_state": "Steamed",
        "calories_per_100g": 156.0,
        "protein_per_100g": 2.5,
        "carbs_per_100g": 37.1,
        "fats_per_100g": 0.3,
        "fibre_per_100g": 1.5,
        "iron_mg_per_100g": 0.1,
        "calcium_mg_per_100g": 5.0,
        "sodium_mg_per_100g": 1.0,
        "allergens": [],
        "healthier_swap_note": "Blend 50% steamed brown rice (genmai) or rolled barley to increase dietary fibre and B-vitamins.",
        "data_source": "MEXT Standard Tables of Food Composition in Japan",
        "source_version": "8th Revised Edition (STFCJ)",
        "publication_year": 2020,
        "verification_status": "verified_table",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-cooked-brown-rice",
        "name": "Japanese Steamed Brown Rice",
        "country_code": "JP",
        "food_category": "Grain Dishes",
        "is_vegetarian": True,
        "serving_label": "1 medium rice bowl (150 g)",
        "serving_grams": 150.0,
        "preparation_method": "Soaked 2–4 hours and pressure-steamed in water",
        "preparation_state": "Steamed",
        "calories_per_100g": 152.0,
        "protein_per_100g": 2.8,
        "carbs_per_100g": 35.6,
        "fats_per_100g": 1.0,
        "fibre_per_100g": 1.4,
        "iron_mg_per_100g": 0.5,
        "calcium_mg_per_100g": 9.0,
        "sodium_mg_per_100g": 2.0,
        "allergens": [],
        "healthier_swap_note": "Provides slightly lower glycemic load and higher iron/minerals than polished white rice.",
        "data_source": "MEXT Standard Tables of Food Composition in Japan",
        "source_version": "8th Revised Edition (STFCJ)",
        "publication_year": 2020,
        "verification_status": "verified_table",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-miso-soup",
        "name": "Traditional Tofu & Wakame Miso Soup",
        "country_code": "JP",
        "food_category": "Soups & Vegetable Broths",
        "is_vegetarian": True,
        "serving_label": "1 standard soup bowl (160 g)",
        "serving_grams": 160.0,
        "preparation_method": "Simmered kelp vegetable broth with tofu cubes, wakame seaweed, and dissolved rice miso added off-boil",
        "preparation_state": "Simmered Broth Dish",
        "calories_per_100g": 26.0,
        "protein_per_100g": 1.9,
        "carbs_per_100g": 2.8,
        "fats_per_100g": 0.9,
        "fibre_per_100g": 0.6,
        "iron_mg_per_100g": 0.4,
        "calcium_mg_per_100g": 21.0,
        "sodium_mg_per_100g": 480.0,
        "allergens": ["soy"],
        "healthier_swap_note": "Use reduced-sodium rice miso and extra diced daikon/spinach to lower sodium per bowl while boosting potassium.",
        "data_source": "MEXT STFCJ 8th Rev. Derived Dish Composite",
        "source_version": "8th Revised Edition (Composite Est.)",
        "publication_year": 2023,
        "verification_status": "estimated_composite",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-miso-paste",
        "name": "Light Yellow Rice Miso Paste",
        "country_code": "JP",
        "food_category": "Fermented Soy & Seasonings",
        "is_vegetarian": True,
        "serving_label": "1 tbsp soup portion (18 g)",
        "serving_grams": 18.0,
        "preparation_method": "Fermented soybeans, rice koji culture, and sea salt",
        "preparation_state": "Fermented Paste",
        "calories_per_100g": 182.0,
        "protein_per_100g": 12.5,
        "carbs_per_100g": 20.7,
        "fats_per_100g": 6.0,
        "fibre_per_100g": 5.5,
        "iron_mg_per_100g": 3.0,
        "calcium_mg_per_100g": 50.0,
        "sodium_mg_per_100g": 4800.0,
        "allergens": ["soy"],
        "healthier_swap_note": "Concentrated seasoning paste — dilute 1 tbsp into 200 mL broth rather than layering extra soy sauce.",
        "data_source": "MEXT Standard Tables of Food Composition in Japan",
        "source_version": "8th Revised Edition (STFCJ)",
        "publication_year": 2020,
        "verification_status": "verified_table",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-firm-tofu",
        "name": "Japanese Firm Tofu (Pressed Bean Curd)",
        "country_code": "JP",
        "food_category": "Fish, Meat, Eggs & Soybeans",
        "is_vegetarian": True,
        "serving_label": "1 half block serving (150 g)",
        "serving_grams": 150.0,
        "preparation_method": "Curdled soy milk coagulated and lightly pressed; served chilled or pan-seared",
        "preparation_state": "Fresh Unseasoned",
        "calories_per_100g": 73.0,
        "protein_per_100g": 7.0,
        "carbs_per_100g": 1.5,
        "fats_per_100g": 4.9,
        "fibre_per_100g": 1.1,
        "iron_mg_per_100g": 1.5,
        "calcium_mg_per_100g": 120.0,
        "sodium_mg_per_100g": 5.0,
        "allergens": ["soy"],
        "healthier_swap_note": "Low in saturated fat and sodium compared to rich cream cheeses while offering high calcium (120 mg/100g).",
        "data_source": "MEXT Standard Tables of Food Composition in Japan",
        "source_version": "8th Revised Edition (STFCJ)",
        "publication_year": 2020,
        "verification_status": "verified_table",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-natto",
        "name": "Fermented Soybeans (Natto)",
        "country_code": "JP",
        "food_category": "Fish, Meat, Eggs & Soybeans",
        "is_vegetarian": True,
        "serving_label": "1 standard pack (45 g)",
        "serving_grams": 45.0,
        "preparation_method": "Whole cooked soybeans fermented with Bacillus subtilis natto",
        "preparation_state": "Fermented Ready-to-Eat",
        "calories_per_100g": 190.0,
        "protein_per_100g": 16.5,
        "carbs_per_100g": 12.1,
        "fats_per_100g": 10.0,
        "fibre_per_100g": 6.7,
        "iron_mg_per_100g": 3.3,
        "calcium_mg_per_100g": 90.0,
        "sodium_mg_per_100g": 2.0,
        "allergens": ["soy"],
        "healthier_swap_note": "Naturally sodium-free until sauce packets are added; top with chopped scallions instead of salty tare glaze.",
        "data_source": "MEXT Standard Tables of Food Composition in Japan",
        "source_version": "8th Revised Edition (STFCJ)",
        "publication_year": 2020,
        "verification_status": "verified_table",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-edamame",
        "name": "Steamed / Boiled Edamame Pods",
        "country_code": "JP",
        "food_category": "Fish, Meat, Eggs & Soybeans",
        "is_vegetarian": True,
        "serving_label": "1 side cup shelled beans (80 g)",
        "serving_grams": 80.0,
        "preparation_method": "Harvested young green soybeans boiled gently in water",
        "preparation_state": "Boiled Shelled",
        "calories_per_100g": 135.0,
        "protein_per_100g": 11.5,
        "carbs_per_100g": 8.8,
        "fats_per_100g": 6.2,
        "fibre_per_100g": 4.9,
        "iron_mg_per_100g": 2.4,
        "calcium_mg_per_100g": 75.0,
        "sodium_mg_per_100g": 3.0,
        "allergens": ["soy"],
        "healthier_swap_note": "High plant protein and vitamin C snack swap for deep-fried savory chips.",
        "data_source": "MEXT Standard Tables of Food Composition in Japan",
        "source_version": "8th Revised Edition (STFCJ)",
        "publication_year": 2020,
        "verification_status": "verified_table",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-grilled-salmon",
        "name": "Grilled Chum Salmon Fillet",
        "country_code": "JP",
        "food_category": "Fish, Meat, Eggs & Soybeans",
        "is_vegetarian": False,
        "serving_label": "1 standard fillet (90 g)",
        "serving_grams": 90.0,
        "preparation_method": "Lightly salted and broiled/grilled without batter or deep-frying",
        "preparation_state": "Raw / Grilled Fillet Reference",
        "calories_per_100g": 133.0,
        "protein_per_100g": 22.3,
        "carbs_per_100g": 0.1,
        "fats_per_100g": 4.1,
        "fibre_per_100g": 0.0,
        "iron_mg_per_100g": 0.7,
        "calcium_mg_per_100g": 14.0,
        "sodium_mg_per_100g": 60.0,
        "allergens": ["fish"],
        "healthier_swap_note": "Grilling keeps fats lean while delivering complete protein and marine omega-3 fatty acids.",
        "data_source": "MEXT Standard Tables of Food Composition in Japan",
        "source_version": "8th Revised Edition (STFCJ)",
        "publication_year": 2020,
        "verification_status": "verified_table",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-pacific-mackerel",
        "name": "Grilled Pacific Mackerel Fillet",
        "country_code": "JP",
        "food_category": "Fish, Meat, Eggs & Soybeans",
        "is_vegetarian": False,
        "serving_label": "1 fillet portion (100 g)",
        "serving_grams": 100.0,
        "preparation_method": "Oven-broiled fillet served with grated daikon radish",
        "preparation_state": "Edible Fillet",
        "calories_per_100g": 211.0,
        "protein_per_100g": 20.6,
        "carbs_per_100g": 0.3,
        "fats_per_100g": 13.8,
        "fibre_per_100g": 0.0,
        "iron_mg_per_100g": 1.5,
        "calcium_mg_per_100g": 9.0,
        "sodium_mg_per_100g": 115.0,
        "allergens": ["fish"],
        "healthier_swap_note": "Serve alongside grated daikon and lemon rather than sugary teriyaki glazes.",
        "data_source": "MEXT Standard Tables of Food Composition in Japan",
        "source_version": "8th Revised Edition (STFCJ)",
        "publication_year": 2020,
        "verification_status": "verified_table",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-wakame-seaweed",
        "name": "Rehydrated Wakame Seaweed",
        "country_code": "JP",
        "food_category": "Vegetable Dishes",
        "is_vegetarian": True,
        "serving_label": "1 small salad side (40 g)",
        "serving_grams": 40.0,
        "preparation_method": "Thoroughly rinsed and soaked in cool water before draining",
        "preparation_state": "Rinsed & Rehydrated",
        "calories_per_100g": 16.0,
        "protein_per_100g": 1.9,
        "carbs_per_100g": 3.9,
        "fats_per_100g": 0.3,
        "fibre_per_100g": 3.2,
        "iron_mg_per_100g": 0.9,
        "calcium_mg_per_100g": 73.0,
        "sodium_mg_per_100g": 570.0,
        "allergens": [],
        "healthier_swap_note": "Always rinse salted wakame twice before tossing with cucumber to keep sodium low.",
        "data_source": "MEXT Standard Tables of Food Composition in Japan",
        "source_version": "8th Revised Edition (STFCJ)",
        "publication_year": 2020,
        "verification_status": "verified_table",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-buckwheat-soba",
        "name": "Boiled Buckwheat Soba Noodles",
        "country_code": "JP",
        "food_category": "Grain Dishes",
        "is_vegetarian": True,
        "serving_label": "1 drained noodle bowl (180 g)",
        "serving_grams": 180.0,
        "preparation_method": "Boiled in water and rinsed cool for cold or warm broth service",
        "preparation_state": "Boiled & Rinsed",
        "calories_per_100g": 114.0,
        "protein_per_100g": 4.8,
        "carbs_per_100g": 22.1,
        "fats_per_100g": 1.0,
        "fibre_per_100g": 1.5,
        "iron_mg_per_100g": 0.6,
        "calcium_mg_per_100g": 11.0,
        "sodium_mg_per_100g": 120.0,
        "allergens": ["buckwheat", "gluten"],
        "healthier_swap_note": "Higher protein and iron than plain wheat udon noodles; verify 100% buckwheat if avoiding gluten.",
        "data_source": "MEXT Standard Tables of Food Composition in Japan",
        "source_version": "8th Revised Edition (STFCJ)",
        "publication_year": 2020,
        "verification_status": "verified_table",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-daikon-radish",
        "name": "Fresh / Lightly Braised Daikon Radish",
        "country_code": "JP",
        "food_category": "Vegetable Dishes",
        "is_vegetarian": True,
        "serving_label": "1 small vegetable side (90 g)",
        "serving_grams": 90.0,
        "preparation_method": "Peeled and grated raw or simmered gently in light vegetable stock",
        "preparation_state": "Raw Root",
        "calories_per_100g": 18.0,
        "protein_per_100g": 0.5,
        "carbs_per_100g": 4.1,
        "fats_per_100g": 0.1,
        "fibre_per_100g": 1.4,
        "iron_mg_per_100g": 0.2,
        "calcium_mg_per_100g": 24.0,
        "sodium_mg_per_100g": 10.0,
        "allergens": [],
        "healthier_swap_note": "Very low energy density hydrating root vegetable supporting digestion.",
        "data_source": "MEXT Standard Tables of Food Composition in Japan",
        "source_version": "8th Revised Edition (STFCJ)",
        "publication_year": 2020,
        "verification_status": "verified_table",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-kabocha-squash",
        "name": "Steamed Japanese Kabocha Squash",
        "country_code": "JP",
        "food_category": "Vegetable Dishes",
        "is_vegetarian": True,
        "serving_label": "1 simmered side dish (100 g)",
        "serving_grams": 100.0,
        "preparation_method": "Steamed chunks with skin kept on for extra dietary fibre",
        "preparation_state": "Steamed / Simmered",
        "calories_per_100g": 78.0,
        "protein_per_100g": 1.9,
        "carbs_per_100g": 20.6,
        "fats_per_100g": 0.3,
        "fibre_per_100g": 3.5,
        "iron_mg_per_100g": 0.5,
        "calcium_mg_per_100g": 18.0,
        "sodium_mg_per_100g": 1.0,
        "allergens": [],
        "healthier_swap_note": "Naturally sweet autumn vegetable delivering beta-carotene and fibre without added sugar.",
        "data_source": "MEXT Standard Tables of Food Composition in Japan",
        "source_version": "8th Revised Edition (STFCJ)",
        "publication_year": 2020,
        "verification_status": "verified_table",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-spinach-ohitashi",
        "name": "Blanched Spinach Greens Side Dish",
        "country_code": "JP",
        "food_category": "Vegetable Dishes",
        "is_vegetarian": True,
        "serving_label": "1 pressed greens portion (75 g)",
        "serving_grams": 75.0,
        "preparation_method": "Quickly blanched spinach chilled, squeezed dry, and dressed with sesame seeds",
        "preparation_state": "Boiled & Drained",
        "calories_per_100g": 20.0,
        "protein_per_100g": 2.6,
        "carbs_per_100g": 3.1,
        "fats_per_100g": 0.5,
        "fibre_per_100g": 3.6,
        "iron_mg_per_100g": 0.9,
        "calcium_mg_per_100g": 69.0,
        "sodium_mg_per_100g": 6.0,
        "allergens": [],
        "healthier_swap_note": "Pairs naturally with vitamin-C citrus dressing to enhance plant iron absorption.",
        "data_source": "MEXT Standard Tables of Food Composition in Japan",
        "source_version": "8th Revised Edition (STFCJ)",
        "publication_year": 2020,
        "verification_status": "verified_table",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-green-tea",
        "name": "Unsweetened Brewed Green Tea (Sencha)",
        "country_code": "JP",
        "food_category": "Water & Unsweetened Tea",
        "is_vegetarian": True,
        "serving_label": "1 teacup (200 mL)",
        "serving_grams": 200.0,
        "preparation_method": "Steeped loose green tea leaves in hot water (~75°C) with zero sugar",
        "preparation_state": "Brewed Unsweetened",
        "calories_per_100g": 2.0,
        "protein_per_100g": 0.2,
        "carbs_per_100g": 0.2,
        "fats_per_100g": 0.0,
        "fibre_per_100g": 0.0,
        "iron_mg_per_100g": 0.0,
        "calcium_mg_per_100g": 3.0,
        "sodium_mg_per_100g": 1.0,
        "allergens": [],
        "healthier_swap_note": "Zero-sugar hydration cornerstone recommended in the Japanese Food Balance Guide; avoid excess concentrated caffeine late at night.",
        "data_source": "MEXT Standard Tables of Food Composition in Japan",
        "source_version": "8th Revised Edition (STFCJ)",
        "publication_year": 2020,
        "verification_status": "verified_table",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-washoku-balanced-meal",
        "name": "Traditional Washoku Meal (Rice, Miso Soup, Grilled Fish & Greens)",
        "country_code": "JP",
        "food_category": "Balanced Meal Pattern",
        "is_vegetarian": False,
        "serving_label": "1 complete meal tray (440 g)",
        "serving_grams": 440.0,
        "preparation_method": "150 g steamed white rice + 160 g tofu miso soup + 70 g grilled salmon + 60 g blanched spinach & radish",
        "preparation_state": "Prepared Set Meal",
        "calories_per_100g": 88.2,
        "protein_per_100g": 5.3,
        "carbs_per_100g": 14.3,
        "fats_per_100g": 1.1,
        "fibre_per_100g": 1.4,
        "iron_mg_per_100g": 0.4,
        "calcium_mg_per_100g": 22.0,
        "sodium_mg_per_100g": 185.0,
        "allergens": ["soy", "fish"],
        "healthier_swap_note": "Represents the classic 'one soup, three dishes' balanced structure with portioned vegetables and moderate lean protein.",
        "data_source": "MEXT STFCJ 8th Rev. Ingredient Sum",
        "source_version": "Computed Composite (MEXT Inputs)",
        "publication_year": 2023,
        "verification_status": "estimated_composite",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-balanced-breakfast",
        "name": "Traditional Japanese Breakfast (Brown Rice, Miso Soup, Rolled Egg & Natto)",
        "country_code": "JP",
        "food_category": "Balanced Meal Pattern",
        "is_vegetarian": False,
        "serving_label": "1 morning set (395 g)",
        "serving_grams": 395.0,
        "preparation_method": "140 g brown rice + 150 g miso soup + 60 g rolled omelette + 45 g fermented natto",
        "preparation_state": "Prepared Breakfast",
        "calories_per_100g": 107.6,
        "protein_per_100g": 5.6,
        "carbs_per_100g": 15.8,
        "fats_per_100g": 3.0,
        "fibre_per_100g": 1.5,
        "iron_mg_per_100g": 0.9,
        "calcium_mg_per_100g": 29.0,
        "sodium_mg_per_100g": 240.0,
        "allergens": ["soy", "egg"],
        "healthier_swap_note": "Replace omelette with boiled edamame for an entirely plant-based fermented soy breakfast.",
        "data_source": "MEXT STFCJ 8th Rev. Ingredient Sum",
        "source_version": "Computed Composite (MEXT Inputs)",
        "publication_year": 2023,
        "verification_status": "estimated_composite",
        "has_verified_image": False,
        "image_path": "",
    },
    # --- INDIA (ICMR–NIN IFCT 2017) Reference Set for Cross-Country Comparison ---
    {
        "slug": "in-dal-tadka",
        "name": "Indian Cooked Yellow Toor Dal Tadka",
        "country_code": "IN",
        "food_category": "Soybeans & Lentils",
        "is_vegetarian": True,
        "serving_label": "1 medium katori bowl (180 g)",
        "serving_grams": 180.0,
        "preparation_method": "Boiled split pigeon peas tempered lightly with 1 tsp oil/ghee, cumin, and turmeric",
        "preparation_state": "Simmered Tempered Dal",
        "calories_per_100g": 91.7,
        "protein_per_100g": 4.8,
        "carbs_per_100g": 12.2,
        "fats_per_100g": 2.5,
        "fibre_per_100g": 2.7,
        "iron_mg_per_100g": 1.3,
        "calcium_mg_per_100g": 24.0,
        "sodium_mg_per_100g": 210.0,
        "allergens": [],
        "healthier_swap_note": "Much lower sodium per serving than concentrated miso soups while providing thick lentil fibre and protein.",
        "data_source": "ICMR–NIN Indian Food Composition Tables",
        "source_version": "IFCT 2017 (Toor Dal Composite)",
        "publication_year": 2017,
        "verification_status": "verified_table",
        "has_verified_image": True,
        "image_path": "/images/north-indian-thali.jpg",
    },
    {
        "slug": "in-cooked-rice",
        "name": "Indian Steamed Basmati / White Rice",
        "country_code": "IN",
        "food_category": "Grain Dishes",
        "is_vegetarian": True,
        "serving_label": "1 cooked rice katori (150 g)",
        "serving_grams": 150.0,
        "preparation_method": "Boiled or steamed long-grain milled rice without added butter",
        "preparation_state": "Steamed",
        "calories_per_100g": 130.0,
        "protein_per_100g": 2.7,
        "carbs_per_100g": 28.2,
        "fats_per_100g": 0.3,
        "fibre_per_100g": 0.4,
        "iron_mg_per_100g": 0.2,
        "calcium_mg_per_100g": 10.0,
        "sodium_mg_per_100g": 2.0,
        "allergens": [],
        "healthier_swap_note": "Long-grain basmati absorbs slightly more water by weight (~130 kcal/100g cooked vs 156 kcal/100g Japanese short-grain rice).",
        "data_source": "ICMR–NIN Indian Food Composition Tables",
        "source_version": "IFCT 2017",
        "publication_year": 2017,
        "verification_status": "verified_table",
        "has_verified_image": True,
        "image_path": "/images/indian-hero-bowl.jpg",
    },
    {
        "slug": "in-paneer",
        "name": "Fresh Indian Cottage Cheese (Paneer)",
        "country_code": "IN",
        "food_category": "Fish, Meat, Eggs & Dairy",
        "is_vegetarian": True,
        "serving_label": "1 grilled protein portion (80 g)",
        "serving_grams": 80.0,
        "preparation_method": "Milk coagulated cleanly with lemon juice and lightly pan-grilled",
        "preparation_state": "Fresh Block",
        "calories_per_100g": 265.0,
        "protein_per_100g": 18.3,
        "carbs_per_100g": 3.4,
        "fats_per_100g": 20.8,
        "fibre_per_100g": 0.0,
        "iron_mg_per_100g": 0.2,
        "calcium_mg_per_100g": 480.0,
        "sodium_mg_per_100g": 22.0,
        "allergens": ["dairy"],
        "healthier_swap_note": "Higher protein & calcium per 100g than firm tofu, but significantly higher dairy fat and calories; combine both wisely.",
        "data_source": "ICMR–NIN Indian Food Composition Tables",
        "source_version": "IFCT 2017",
        "publication_year": 2017,
        "verification_status": "verified_table",
        "has_verified_image": True,
        "image_path": "/images/women-period-iron-bowl.jpg",
    },
    {
        "slug": "in-veg-thali",
        "name": "Indian Balanced Vegetarian Thali (Roti, Dal, Sabzi, Curd & Salad)",
        "country_code": "IN",
        "food_category": "Balanced Meal Pattern",
        "is_vegetarian": True,
        "serving_label": "1 home-style thali plate (450 g)",
        "serving_grams": 450.0,
        "preparation_method": "2 phulkas (80 g) + yellow dal (150 g) + seasonal vegetable sabzi (110 g) + curd & salad (110 g)",
        "preparation_state": "Prepared Home Thali",
        "calories_per_100g": 116.0,
        "protein_per_100g": 4.4,
        "carbs_per_100g": 17.8,
        "fats_per_100g": 3.1,
        "fibre_per_100g": 2.9,
        "iron_mg_per_100g": 1.2,
        "calcium_mg_per_100g": 42.0,
        "sodium_mg_per_100g": 165.0,
        "allergens": ["gluten", "dairy"],
        "healthier_swap_note": "Compare side by side with Washoku: thali offers high dietary fibre from whole-wheat rotis + dals.",
        "data_source": "ICMR–NIN IFCT 2017 Ingredient Sum",
        "source_version": "Computed Composite (IFCT 2017)",
        "publication_year": 2017,
        "verification_status": "estimated_composite",
        "has_verified_image": True,
        "image_path": "/images/north-indian-thali.jpg",
    },
    {
        "slug": "in-roasted-lentils-chana",
        "name": "Indian Roasted Bengal Gram & Sprouted Lentils",
        "country_code": "IN",
        "food_category": "Soybeans & Lentils",
        "is_vegetarian": True,
        "serving_label": "1 crisp protein bowl (80 g)",
        "serving_grams": 80.0,
        "preparation_method": "Boiled/dry-roasted whole black chana tossed with lemon and coriander",
        "preparation_state": "Dry-Roasted / Boiled",
        "calories_per_100g": 164.0,
        "protein_per_100g": 8.9,
        "carbs_per_100g": 27.4,
        "fats_per_100g": 2.6,
        "fibre_per_100g": 7.6,
        "iron_mg_per_100g": 2.9,
        "calcium_mg_per_100g": 49.0,
        "sodium_mg_per_100g": 24.0,
        "allergens": [],
        "healthier_swap_note": "Soy-free high-fibre Indian pulse option to compare against Japanese edamame or natto.",
        "data_source": "ICMR–NIN Indian Food Composition Tables",
        "source_version": "IFCT 2017 (Bengal Gram)",
        "publication_year": 2017,
        "verification_status": "verified_table",
        "has_verified_image": True,
        "image_path": "/images/healthy-swaps.jpg",
    },
    {
        "slug": "in-balanced-breakfast",
        "name": "Indian Besan Cheela, Mint Chutney & Curd Breakfast",
        "country_code": "IN",
        "food_category": "Balanced Meal Pattern",
        "is_vegetarian": True,
        "serving_label": "2 cheelas + curd cup (240 g)",
        "serving_grams": 240.0,
        "preparation_method": "Chickpea flour savory crepes cooked on non-stick pan served with fresh curd",
        "preparation_state": "Prepared Breakfast",
        "calories_per_100g": 143.8,
        "protein_per_100g": 6.6,
        "carbs_per_100g": 17.1,
        "fats_per_100g": 5.1,
        "fibre_per_100g": 2.7,
        "iron_mg_per_100g": 1.3,
        "calcium_mg_per_100g": 62.0,
        "sodium_mg_per_100g": 145.0,
        "allergens": ["dairy"],
        "healthier_swap_note": "Rich plant-lentil breakfast option; compare protein, sodium, and calcium with fermented soy Japanese breakfasts.",
        "data_source": "ICMR–NIN IFCT 2017 Ingredient Sum",
        "source_version": "Computed Composite (IFCT 2017)",
        "publication_year": 2017,
        "verification_status": "estimated_composite",
        "has_verified_image": True,
        "image_path": "/images/south-indian-breakfast.jpg",
    },
]

COMPARE_PRESETS: list[dict[str, Any]] = [
    {
        "id": "dal-vs-miso",
        "title": "Indian Dal vs Japanese Miso Soup",
        "left_slug": "in-dal-tadka",
        "right_slug": "jp-miso-soup",
        "left_grams": 180.0,
        "right_grams": 160.0,
    },
    {
        "id": "in-rice-vs-jp-rice",
        "title": "Indian Rice vs Japanese Rice",
        "left_slug": "in-cooked-rice",
        "right_slug": "jp-cooked-white-rice",
        "left_grams": 150.0,
        "right_grams": 150.0,
    },
    {
        "id": "paneer-vs-tofu",
        "title": "Indian Paneer vs Japanese Firm Tofu",
        "left_slug": "in-paneer",
        "right_slug": "jp-firm-tofu",
        "left_grams": 100.0,
        "right_grams": 150.0,
    },
    {
        "id": "thali-vs-washoku",
        "title": "Indian Vegetable Thali vs Japanese Washoku Meal",
        "left_slug": "in-veg-thali",
        "right_slug": "jp-washoku-balanced-meal",
        "left_grams": 450.0,
        "right_grams": 440.0,
    },
    {
        "id": "lentils-vs-soybeans",
        "title": "Indian Lentils (Chana) vs Japanese Soybeans (Natto)",
        "left_slug": "in-roasted-lentils-chana",
        "right_slug": "jp-natto",
        "left_grams": 80.0,
        "right_grams": 90.0,
    },
    {
        "id": "in-bfast-vs-jp-bfast",
        "title": "Indian Breakfast vs Japanese Breakfast",
        "left_slug": "in-balanced-breakfast",
        "right_slug": "jp-balanced-breakfast",
        "left_grams": 240.0,
        "right_grams": 395.0,
    },
]

FOOD_BALANCE_GUIDE_DATA: dict[str, Any] = {
    "title": "Daily Food Balance Spinning Guide",
    "concept_overview": (
        "Inspired by the traditional Japanese Food Guide Spinning Top pattern, this guide uses "
        "finished-dish serving units ('SV') instead of counting raw grams alone. Like a spinning top, "
        "balanced proportions across grains, vegetables, protein dishes, dairy, and fruits combine "
        "with fluids and physical movement to keep everyday nutrition steady."
    ),
    "serving_unit_explainer": (
        "What is 1 Serving Unit (SV)? One SV represents an everyday finished dish portion: "
        "1 SV Grain (~40 g carbohydrates, e.g., 1 small bowl of rice or 1 roti); "
        "1 SV Vegetable (~70 g cooked/salad veggies, e.g., spinach greens or soup vegetables); "
        "1 SV Main Protein (~6 g protein, e.g., half block tofu, 1 egg, grilled fish portion, or dal bowl); "
        "1 SV Dairy (~100 mg calcium, e.g., 1 small cup curd/milk); "
        "1 SV Fruit (~100 g fresh whole fruit)."
    ),
    "disclaimer": (
        "Educational population reference (~2,000–2,200 kcal active adult pattern) inspired by public nutrition balance "
        "models. Do not treat population serving ranges as individualized medical or clinical dietary advice."
    ),
    "groups": [
        {
            "key": "grains",
            "layer_order": 1,
            "name": "Grain Dishes (Staple Energy)",
            "recommended_sv_min": 5.0,
            "recommended_sv_max": 7.0,
            "unit_label": "SV (1 SV ≈ 40 g carbs)",
            "unit_definition": "Steamed rice, brown rice, soba noodles, udon, whole-wheat roti, oats",
            "examples": ["1 small bowl Japanese brown rice (1 SV)", "1 whole-wheat phulka (~0.6 SV)", "1 bowl buckwheat soba (~2 SV)"],
            "color_token": "#A3FF12",
        },
        {
            "key": "vegetables",
            "layer_order": 2,
            "name": "Vegetable Dishes (Vitamins & Fibre)",
            "recommended_sv_min": 5.0,
            "recommended_sv_max": 6.0,
            "unit_label": "SV (1 SV ≈ 70 g vegetables)",
            "unit_definition": "Blanched greens, miso/vegetable broth solids, daikon, mushrooms, salads, sabzi",
            "examples": ["Blanched spinach greens side (1 SV)", "Kabocha simmered bowl (1.2 SV)", "Vegetable soup bowl (1 SV)"],
            "color_token": "#34D399",
        },
        {
            "key": "protein_dishes",
            "layer_order": 3,
            "name": "Fish, Meat, Eggs & Soybean Dishes",
            "recommended_sv_min": 3.0,
            "recommended_sv_max": 5.0,
            "unit_label": "SV (1 SV ≈ 6 g protein)",
            "unit_definition": "Tofu, edamame, natto, salmon, mackerel, eggs, paneer, dals & lentils",
            "examples": ["Grilled salmon fillet (2.5 SV)", "Firm tofu 150g half block (1.7 SV)", "Yellow dal bowl (1.4 SV)"],
            "color_token": "#6EE7B7",
        },
        {
            "key": "dairy",
            "layer_order": 4,
            "name": "Milk & Dairy Products (or Calcium Equivalents)",
            "recommended_sv_min": 2.0,
            "recommended_sv_max": 2.0,
            "unit_label": "SV (1 SV ≈ 100 mg calcium)",
            "unit_definition": "Plain milk, probiotic curd/yogurt, calcium-set tofu, sesame greens",
            "examples": ["1 cup plain curd (1.5 SV)", "1 glass milk (2 SV)", "Calcium-set firm tofu (1 SV eq.)"],
            "color_token": "#B6FF38",
        },
        {
            "key": "fruits",
            "layer_order": 5,
            "name": "Whole Fresh Fruits",
            "recommended_sv_min": 2.0,
            "recommended_sv_max": 2.0,
            "unit_label": "SV (1 SV ≈ 100 g fruit)",
            "unit_definition": "Oranges, apples, guava, berries, seasonal citrus, pears",
            "examples": ["1 medium orange (1 SV)", "1/2 apple or pear (1 SV)", "Seasonal berries cup (1 SV)"],
            "color_token": "#FBBF24",
        },
        {
            "key": "hydration",
            "layer_order": 6,
            "name": "Water & Unsweetened Tea",
            "recommended_sv_min": 1500.0,
            "recommended_sv_max": 2200.0,
            "unit_label": "mL/day",
            "unit_definition": "Plain drinking water, brewed green tea, barley tea, unsweetened herbal infusions",
            "examples": ["Steeped green tea cup (200 mL)", "Plain water glass (250 mL)", "Unsweetened mint-lemon water (300 mL)"],
            "color_token": "#38BDF8",
        },
        {
            "key": "activity",
            "layer_order": 7,
            "name": "Daily Physical Activity (Spinning Momentum)",
            "recommended_sv_min": 30.0,
            "recommended_sv_max": 60.0,
            "unit_label": "min/day",
            "unit_definition": "Walking, cycling, stretching, light strength, or stair movement keeping the top spinning",
            "examples": ["30-min brisk walk", "20-min strength & mobility circuit", "15-min post-meal stroll"],
            "color_token": "#F472B6",
        },
    ],
}

SEED_EDUCATION_TOPICS: list[dict[str, Any]] = [
    {
        "slug": "healthy-eating-education",
        "title": "Healthy Eating Education",
        "tag": "Core Foundation",
        "summary": "Building lifelong food skills around balanced plates rather than restrictive crash dieting.",
        "key_points": [
            "Evaluate whole meals across carbohydrates, proteins, vegetables, hydration, and activity.",
            "Choose whole minimally processed grains and pulses regularly while leaving space for joyful social eating.",
        ],
        "daily_tip": "Pause before meals for 10 seconds to notice your plate's colours — aim for at least three natural plant colours daily.",
        "quiz_question": "What does balanced daily food education emphasize most strongly?",
        "quiz_options": [
            "Eliminating all carbohydrates permanently",
            "Combining staple grains, varied vegetables, quality proteins, hydration, and regular movement",
            "Counting calories strictly while skipping vegetables",
        ],
        "correct_index": 1,
    },
    {
        "slug": "food-origin-culture",
        "title": "Food Origin & Culinary Culture",
        "tag": "Origins",
        "summary": "Understanding how farming regions, coastal fisheries, and home fermentation shape nourishing cuisines.",
        "key_points": [
            "Both Indian lentil fermentation (idli/dosa) and Japanese soy fermentation (miso/natto) preserve nutrients naturally.",
            "Appreciating farmers and ingredients deepens respect for what sits on your plate.",
        ],
        "daily_tip": "Check where one ingredient in today's lunch grew — seasonal local harvests often retain crisp texture and flavour.",
        "quiz_question": "Which pairing highlights traditional natural fermentation across Japan and India?",
        "quiz_options": [
            "Fried potato crisps and soda",
            "Miso/natto soybeans and fermented lentil-rice batters",
            "Refined white sugar and synthetic syrups",
        ],
        "correct_index": 1,
    },
    {
        "slug": "balanced-meal-preparation",
        "title": "Balanced Meal Preparation (One Soup, Balanced Sides)",
        "tag": "Meal Structure",
        "summary": "The 'one staple grain + soup + main dish + vegetable sides' structure limits overeating naturally.",
        "key_points": [
            "Small bowls separate flavours clearly without drowning vegetables in heavy cream or oil.",
            "Pairing warm broth with crisp steamed greens creates strong satiety with moderate calories.",
        ],
        "daily_tip": "Use separate small bowls for dal/soup, greens, and rice so vegetable volume stands equal to starch.",
        "quiz_question": "Why does separating a meal into a soup bowl, staple bowl, main dish, and two vegetable sides support balance?",
        "quiz_options": [
            "It promotes visual portion awareness and steady vegetable intake",
            "It removes all dietary fibre from meals",
            "It doubles frying oil absorption",
        ],
        "correct_index": 0,
    },
    {
        "slug": "seasonal-eating",
        "title": "Seasonal Eating Rhythm",
        "tag": "Seasons",
        "summary": "Choosing fresh cooling produce in summer and mineral-rich warming roots in winter.",
        "key_points": [
            "Summer cucumbers, gourds, and citrus naturally supply fluid and potassium.",
            "Winter squash, daikon radish, spinach greens, and legumes warm dishes without excess heaviness.",
        ],
        "daily_tip": "Swap one out-of-season imported snack this week for a crisp local seasonal vegetable or citrus fruit.",
        "quiz_question": "What is a natural benefit of aligning dishes with harvest seasons?",
        "quiz_options": [
            "Fresher micronutrients and naturally varied year-round menus",
            "Eliminating protein completely in winter",
            "Guaranteed fixed grocery store prices year-round",
        ],
        "correct_index": 0,
    },
    {
        "slug": "portion-awareness",
        "title": "Serving Units & Portion Awareness",
        "tag": "Portions",
        "summary": "Measure complete finished dishes in simple bowl/plate units instead of stressing over every gram.",
        "key_points": [
            "One small rice bowl (~150g) or two thin phulkas sets a comfortable carbohydrate baseline.",
            "Stopping around 'comfortably 80% satisfied' gives digestion time to signal fullness.",
        ],
        "daily_tip": "Try serving onto a slightly smaller plate before taking seconds — check hunger cues 5 minutes later.",
        "quiz_question": "In Japan's dish-based food guide, what does 1 'SV' (Serving Unit) measure?",
        "quiz_options": [
            "Cost in yen",
            "A standard portion of a finished dish (e.g., ~40g grain carbs or ~70g vegetable side)",
            "Cooking temperature",
        ],
        "correct_index": 1,
    },
    {
        "slug": "food-waste-reduction",
        "title": "Zero-Waste Kitchen Habits",
        "tag": "Sustainability",
        "summary": "Smart bento leftovers, root peels in vegetable stock, and right-sized grocery lists protect budgets and farms.",
        "key_points": [
            "Carrot peels, radish greens, and mushroom stems make flavourful soup stocks instead of bin waste.",
            "Planning lunches from yesterday's cooked grains cuts household waste dramatically.",
        ],
        "daily_tip": "Keep one 'use-it-up' bowl container in the fridge for washed chopped herbs and crisp stems before meals.",
        "quiz_question": "Which kitchen habit turns trimmings cleanly into extra nutrition without waste?",
        "quiz_options": [
            "Simmering washed mushroom stems and vegetable peels into soup stock",
            "Throwing away broccoli stalks intact",
            "Buying double perishables without checking pantry stock",
        ],
        "correct_index": 0,
    },
    {
        "slug": "mindful-eating",
        "title": "Mindful Chewing & Screen-Free Meals",
        "tag": "Mindfulness",
        "summary": "Slow, distraction-free meals support digestive enzymes and comfortable post-meal energy.",
        "key_points": [
            "Setting utensils down briefly between bites prevents rushed overconsumption.",
            "Savouring umami broths and crisp textures heightens satisfaction from normal portions.",
        ],
        "daily_tip": "Enjoy the first 5 minutes of dinner without scrolling your phone to notice aroma and fullness clearly.",
        "quiz_question": "How does mindful eating support healthy nutrition?",
        "quiz_options": [
            "Rushing meals in under 3 minutes boosts calcium",
            "Slow chewing gives fullness hormones (~15–20 min) time to register comfortably",
            "Only eating cold raw foods burns calories effortlessly",
        ],
        "correct_index": 1,
    },
    {
        "slug": "traditional-meal-structure",
        "title": "Water, Unsweetened Tea & Umami Balance",
        "tag": "Hydration & Broth",
        "summary": "Replacing sugary bottled drinks with water and steeped tea keeps added sugar minimal.",
        "key_points": [
            "Unsweetened green tea or water alongside meals keeps sweet liquid calories near zero.",
            "Umami flavours from kelp and mushrooms allow delicious taste using less salt.",
        ],
        "daily_tip": "Keep a flask of plain water or unsweetened green tea beside your desk instead of sweetened iced coffee.",
        "quiz_question": "Why are water and unsweetened tea highlighted at the top of the Japanese Food Balance Guide?",
        "quiz_options": [
            "Because sweet soft drinks count toward healthy vegetable servings",
            "Steady zero-sugar hydration underpins metabolism and dish balance",
            "Tea replaces all solid protein meals",
        ],
        "correct_index": 1,
    },
    {
        "slug": "children-nutrition-education",
        "title": "Positive Food Education for Children",
        "tag": "Youth & Growing",
        "summary": "Curiosity-based tasting, kid-friendly cooking roles, and zero body shaming raise confident eaters.",
        "key_points": [
            "Let children wash greens or arrange colourful bento compartments to boost vegetable willingness.",
            "Never use fixed adult BMI cutoffs or restrictive weight-loss language for youth.",
        ],
        "daily_tip": "Invite younger family members to pick one crunchy seasonal vegetable to add to dinner this week.",
        "quiz_question": "Which strategy encourages healthy lifelong eating habits for school-age children?",
        "quiz_options": [
            "Involving children in choosing and prepping colourful produce gently",
            "Applying strict adult calorie-deficit targets to teenagers",
            "Forcing clean plates even when genuinely full",
        ],
        "correct_index": 0,
    },
    {
        "slug": "family-eating-habits",
        "title": "Shared Family Meal Habits",
        "tag": "Home Rhythm",
        "summary": "Warm family dinners with shared staples and flexible add-ons support every generation.",
        "key_points": [
            "Cook one neutral rice/dal base and let each family member adjust spice, texture, or protein.",
            "Regular shared meal timings stabilize sleep, hydration, and nutrition across grandparents to teens.",
        ],
        "daily_tip": "Prepare one extra portion of cooked grains or blanched vegetables tonight to assemble tomorrow's healthy lunch box in 5 minutes.",
        "quiz_question": "What makes shared home cooking sustainable for multi-age households?",
        "quiz_options": [
            "Cooking a flexible base dish with gentle seasonings and optional protein sides",
            "Cooking four completely unrelated heavy restaurant dishes daily",
            "Replacing home meals permanently with packaged snacks",
        ],
        "correct_index": 0,
    },
]

SEED_SEASONAL_FOODS: list[dict[str, Any]] = [
    # --- JAPAN SEASONS ---
    {
        "slug": "jp-spring-bamboo-spinach",
        "country_code": "JP",
        "season": "spring",
        "food_group": "Vegetables & Shoots",
        "name": "Spring Bamboo Shoots & Tender Spinach Greens",
        "is_vegetarian": True,
        "regional_availability_note": "Traditional spring harvest window in temperate Japanese farmland (estimated seasonal culinary period).",
        "nutritional_highlights": "High dietary fibre, potassium, folate, and ultra-low energy density (~20–26 kcal/100g).",
        "seasonal_recipe_idea": "Simmered Spring Greens & Rice: Gently simmer tender spinach leaves with rice, kelp stock, and firm tofu cubes.",
        "paired_indian_alternative": "Tender Palak & Fresh Bottle Gourd Sabzi with whole-wheat phulka (Indian spring transition).",
        "data_source": "MAFF Seasonal Food Culture & MEXT Composition Reference",
        "verification_status": "verified_seasonal_reference",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-spring-strawberries",
        "country_code": "JP",
        "season": "spring",
        "food_group": "Fruits",
        "name": "Early Spring Orchard Strawberries & Citrus",
        "is_vegetarian": True,
        "regional_availability_note": "Late-winter to spring peak dessert fruit pattern across Japanese prefectures.",
        "nutritional_highlights": "Vitamin C (~62 mg/100g per MEXT), anthocyanin antioxidants, low sugar (~34 kcal/100g).",
        "seasonal_recipe_idea": "Halved strawberries served chilled alongside plain unsweetened yogurt and toasted seeds.",
        "paired_indian_alternative": "Fresh Mahabaleshwar strawberries or sweet-sour guava slices with plain curd.",
        "data_source": "MEXT STFCJ 8th Rev. / MAFF Seasonal Reference",
        "verification_status": "verified_seasonal_reference",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-summer-edamame",
        "country_code": "JP",
        "season": "summer",
        "food_group": "Legumes & Soybeans",
        "name": "Fresh Summer Boiled Edamame & Cucumber Wakame Salad",
        "is_vegetarian": True,
        "regional_availability_note": "Mid-to-late summer harvest focus supporting warm-weather hydration and plant protein.",
        "nutritional_highlights": "Edamame supplies 11.5g protein, 4.9g fibre, potassium, and vitamin C per 100g.",
        "seasonal_recipe_idea": "Boil crisp edamame pods for 4 minutes; pair with chilled cucumber-wakame rice vinegar salad.",
        "paired_indian_alternative": "Sprouted Green Moong Chaat with crisp cucumber, tomato, mint, and fresh lemon juice.",
        "data_source": "MEXT STFCJ 8th Rev. (2020/2023)",
        "verification_status": "verified_seasonal_reference",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-summer-eggplant-soba",
        "country_code": "JP",
        "season": "summer",
        "food_group": "Grains & Summer Produce",
        "name": "Chilled Buckwheat Soba with Steamed Eggplant & Scallions",
        "is_vegetarian": True,
        "regional_availability_note": "Peak humid summer culinary choice designed for cool digestion.",
        "nutritional_highlights": "Buckwheat soba offers complex carbs, rutin antioxidants, and 4.8g protein/100g boiled.",
        "seasonal_recipe_idea": "Rinse boiled soba in ice water and serve topped with steamed aubergine ribbons and ginger.",
        "paired_indian_alternative": "Cooling Curd Rice with cucumber, mustard-curry-leaf tempering, and fresh pomegranate.",
        "data_source": "MEXT STFCJ & Traditional Summer Pattern",
        "verification_status": "regional_estimate",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-autumn-salmon-shiitake",
        "country_code": "JP",
        "season": "autumn",
        "food_group": "Fish & Mushrooms",
        "name": "Autumn Chum Salmon & Shiitake Mushroom Rice Bowl",
        "is_vegetarian": False,
        "regional_availability_note": "Autumn migratory salmon and forest mushroom harvest season in Japan.",
        "nutritional_highlights": "Chum salmon offers 22.3g lean protein + omega-3 fats; shiitake adds 3.5g fibre + vitamin D precursors.",
        "seasonal_recipe_idea": "Bake flaked salmon over steamed short-grain rice folded with sautéed shiitake slices and scallions.",
        "paired_indian_alternative": "Coastal Tandoori Fish or Mushroom-Paneer Pulao paired with cucumber raita.",
        "data_source": "MEXT STFCJ 8th Rev. (2020/2023)",
        "verification_status": "verified_seasonal_reference",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-autumn-kabocha",
        "country_code": "JP",
        "season": "autumn",
        "food_group": "Vegetables",
        "name": "Autumn Steamed Kabocha Squash & Sweet Persimmon",
        "is_vegetarian": True,
        "regional_availability_note": "Harvest autumn produce peak noted for natural sweetness without added syrup.",
        "nutritional_highlights": "Kabocha gives 3.5g fibre, vitamin C (33 mg), and beta-carotene with 78 kcal/100g.",
        "seasonal_recipe_idea": "Simmer cubed kabocha in light soy-ginger broth until fork-tender.",
        "paired_indian_alternative": "Spiced Kaddu (Pumpkin) Sabzi simmered with fenugreek seeds alongside bajra or wheat roti.",
        "data_source": "MEXT STFCJ 8th Rev. (2020/2023)",
        "verification_status": "verified_seasonal_reference",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-winter-daikon-nabe",
        "country_code": "JP",
        "season": "winter",
        "food_group": "Soups & Root Vegetables",
        "name": "Winter Braised Daikon Radish, Tofu & Kelp Hotpot",
        "is_vegetarian": True,
        "regional_availability_note": "Cold winter season classic utilizing sweet frost-harvested daikon radish.",
        "nutritional_highlights": "Daikon is 94% water (~18 kcal/100g); tofu boosts calcium (120 mg/100g) and warm satiety.",
        "seasonal_recipe_idea": "Simmer thick daikon rounds with napa cabbage, shiitake, and firm tofu cubes in light broth.",
        "paired_indian_alternative": "Warm Mooli Paratha or Mooli Dal Soup paired with roasted sesame.",
        "data_source": "MEXT STFCJ 8th Rev. (2020/2023)",
        "verification_status": "verified_seasonal_reference",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "jp-winter-mackerel-citrus",
        "country_code": "JP",
        "season": "winter",
        "food_group": "Fish & Winter Citrus",
        "name": "Winter Pacific Mackerel with Mandarin Citrus Segments",
        "is_vegetarian": False,
        "regional_availability_note": "Cold-water winter fish fatty acid peak paired with indoor citrus harvest.",
        "nutritional_highlights": "Mackerel delivers 20.6g protein & omega-3 lipids; citrus delivers vitamin C for iron bioavailability.",
        "seasonal_recipe_idea": "Grill mackerel fillet cleanly with zero frying and finish with fresh winter tangerine zest.",
        "paired_indian_alternative": "Grilled Rohu/Indian Mackerel with Kinnow mandarin segments.",
        "data_source": "MEXT STFCJ & Winter Dietary Reference",
        "verification_status": "verified_seasonal_reference",
        "has_verified_image": False,
        "image_path": "",
    },
    # --- INDIA SEASONS ---
    {
        "slug": "in-spring-bottle-gourd-mint",
        "country_code": "IN",
        "season": "spring",
        "food_group": "Vegetables & Herbs",
        "name": "Indian Bottle Gourd (Lauki), Mint & Sprouted Moong",
        "is_vegetarian": True,
        "regional_availability_note": "Pan-India mild spring produce window; check fresh market sourcing locally.",
        "nutritional_highlights": "Hydrating low-calorie gourd paired with plant protein and iron from green moong.",
        "seasonal_recipe_idea": "Lightly temper boiled bottle gourd and yellow moong dal with cumin and fresh coriander.",
        "paired_indian_alternative": "Light Lauki Chana Dal Khichdi",
        "data_source": "ICMR–NIN IFCT 2017 Reference",
        "verification_status": "verified_seasonal_reference",
        "has_verified_image": True,
        "image_path": "/images/indian-hero-bowl.jpg",
    },
    {
        "slug": "in-spring-amla-berries",
        "country_code": "IN",
        "season": "spring",
        "food_group": "Fruits",
        "name": "Late-Spring Mulberries & Fresh Wood-Apple / Bael Cooler",
        "is_vegetarian": True,
        "regional_availability_note": "March–May warming plains regional seasonal availability.",
        "nutritional_highlights": "Rich soluble pectin fibre, polyphenols, and hydrating electrolytes.",
        "seasonal_recipe_idea": "Unsweetened bael pulp cooler or chilled mulberry curd bowl.",
        "paired_indian_alternative": "Sattu Chaas (Roasted Gram Buttermilk)",
        "data_source": "ICMR–NIN IFCT 2017 & Regional Harvest Reference",
        "verification_status": "regional_estimate",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "slug": "in-summer-cucumber-chaas",
        "country_code": "IN",
        "season": "summer",
        "food_group": "Hydration & Produce",
        "name": "Summer Ridge Gourd, Roasted Jeera Buttermilk & Watermelon",
        "is_vegetarian": True,
        "regional_availability_note": "April–June high-heat summer produce across India.",
        "nutritional_highlights": "Supports fluid replacement (~90%+ water veggies/fruit), probiotics from diluted curd, low calories.",
        "seasonal_recipe_idea": "Blend plain curd (1:3 water) with roasted cumin and serve alongside light ridge-gourd sabzi.",
        "paired_indian_alternative": "Tender Coconut Lime Cooler",
        "data_source": "ICMR–NIN IFCT 2017 Reference",
        "verification_status": "verified_seasonal_reference",
        "has_verified_image": True,
        "image_path": "/images/healthy-swaps.jpg",
    },
    {
        "slug": "in-summer-raw-mango-lentil",
        "country_code": "IN",
        "season": "summer",
        "food_group": "Fruits & Pulses",
        "name": "Summer Kairi (Raw Mango) Dal & Fresh Mango Bowl",
        "is_vegetarian": True,
        "regional_availability_note": "Peak May–July orchard availability across North, West & South India.",
        "nutritional_highlights": "Tangy raw mango brings vitamin C that boosts plant-iron absorption from cooked lentils.",
        "seasonal_recipe_idea": "Simmer ripe/raw mango dices into yellow moong or masoor dal without heavy ghee.",
        "paired_indian_alternative": "Roasted Sattu Raw-Mango Drink",
        "data_source": "ICMR–NIN IFCT 2017 Reference",
        "verification_status": "verified_seasonal_reference",
        "has_verified_image": True,
        "image_path": "/images/north-indian-thali.jpg",
    },
    {
        "slug": "in-autumn-okra-pomegranate",
        "country_code": "IN",
        "season": "autumn",
        "food_group": "Vegetables & Fruits",
        "name": "Autumn Bhindi (Okra), Pomegranate & Mixed Pulses",
        "is_vegetarian": True,
        "regional_availability_note": "Post-monsoon Sept–Nov crisp produce transition across Indian states.",
        "nutritional_highlights": "Okra supplies soluble fibre (~3.2g/100g); pomegranate adds vitamin C & potassium.",
        "seasonal_recipe_idea": "Lightly stir-fried bhindi with whole-wheat roti and a side of pomegranate raita.",
        "paired_indian_alternative": "Moong Cheela & Pomegranate Mint Bowl",
        "data_source": "ICMR–NIN IFCT 2017 Reference",
        "verification_status": "verified_seasonal_reference",
        "has_verified_image": True,
        "image_path": "/images/women-wellness-hero.jpg",
    },
    {
        "slug": "in-winter-palak-bathua-sesame",
        "country_code": "IN",
        "season": "winter",
        "food_group": "Leafy Greens & Seeds",
        "name": "Winter Spinach (Palak), Sarson Greens & Roasted Sesame Seeds",
        "is_vegetarian": True,
        "regional_availability_note": "November–February crisp northern winter greens season.",
        "nutritional_highlights": "Folate, calcium, vitamin K, plant iron paired cleanly with healthy sesame fats and calcium.",
        "seasonal_recipe_idea": "Saute palak-mustard leaves lightly with bajra/jowar flatbread and a spoon of toasted sesame.",
        "paired_indian_alternative": "Palak Black Chana Sesame Bowl",
        "data_source": "ICMR–NIN IFCT 2017 Reference",
        "verification_status": "verified_seasonal_reference",
        "has_verified_image": True,
        "image_path": "/images/women-period-iron-bowl.jpg",
    },
    {
        "slug": "in-winter-guava-carrot-bajra",
        "country_code": "IN",
        "season": "winter",
        "food_group": "Fruits & Whole Millets",
        "name": "Winter Guava, Red Carrot Porridge & Pearl Millet (Bajra)",
        "is_vegetarian": True,
        "regional_availability_note": "Peak winter farm season offering dense vitamin C and whole millet warmth.",
        "nutritional_highlights": "Guava delivers >200 mg vitamin C/100g per IFCT 2017 alongside bajra's rich iron and fibre.",
        "seasonal_recipe_idea": "1 fresh guava snack + warm bajra khichdi cooked gently with winter carrots and green peas.",
        "paired_indian_alternative": "Ragi Malt & Roasted Chana",
        "data_source": "ICMR–NIN IFCT 2017 Reference",
        "verification_status": "verified_seasonal_reference",
        "has_verified_image": True,
        "image_path": "/images/south-indian-breakfast.jpg",
    },
]

JAPANESE_TRADITIONAL_MEALS: list[dict[str, Any]] = [
    {
        "id": "washoku-home-set",
        "title": "Classic Rice, Tofu Miso Soup & Steamed Greens Plate",
        "category": "Rice, Miso Soup and Vegetable Meals",
        "is_vegetarian": True,
        "serving_label": "1 complete 3-bowl tray (485 g)",
        "serving_grams": 485.0,
        "ingredients": [
            {"slug": "jp-cooked-white-rice", "name": "Steamed Short-Grain White Rice", "grams": 150.0},
            {"slug": "jp-miso-soup", "name": "Tofu & Wakame Miso Soup", "grams": 160.0},
            {"slug": "jp-firm-tofu", "name": "Lightly Grilled Firm Tofu", "grams": 100.0},
            {"slug": "jp-spinach-ohitashi", "name": "Blanched Spinach Greens", "grams": 75.0},
        ],
        "cooking_instructions": [
            "Steam 150 g washed short-grain white rice until fluffy.",
            "Simmer kelp vegetable stock with diced firm tofu and rinsed wakame, dissolving 1 tsp light miso off-heat.",
            "Serve alongside pressed blanched spinach and pan-seared tofu slices.",
        ],
        "allergens": ["soy"],
        "healthier_indian_alternative": "Yellow Moong Dal Khichdi with Palak Raita (matches protein balance with lower sodium).",
        "data_source": "MEXT STFCJ 8th Rev. Deterministic Sum",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "id": "salmon-brown-rice-set",
        "title": "Grilled Salmon, Brown Rice & Grated Daikon Set",
        "category": "Fish and Rice Meals",
        "is_vegetarian": False,
        "serving_label": "1 nourishing meal plate (415 g)",
        "serving_grams": 415.0,
        "ingredients": [
            {"slug": "jp-cooked-brown-rice", "name": "Steamed Brown Rice", "grams": 150.0},
            {"slug": "jp-grilled-salmon", "name": "Grilled Chum Salmon Fillet", "grams": 100.0},
            {"slug": "jp-daikon-radish", "name": "Grated Daikon Radish & Herbs", "grams": 90.0},
            {"slug": "jp-spinach-ohitashi", "name": "Blanched Spinach Side", "grams": 75.0},
        ],
        "cooking_instructions": [
            "Broil/pan-sear 100 g salmon fillet 4 minutes per side with black pepper.",
            "Grate fresh daikon root finely and gently squeeze excess moisture.",
            "Serve alongside brown rice and blanched greens for a low-sodium high-omega plate.",
        ],
        "allergens": ["fish"],
        "healthier_indian_alternative": "Grilled Tandoori Rohu Fish with steamed brown rice & kachumber salad.",
        "data_source": "MEXT STFCJ 8th Rev. Deterministic Sum",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "id": "tofu-kabocha-vegetable-bowl",
        "title": "Simmered Firm Tofu, Kabocha Squash & Edamame Bowl",
        "category": "Tofu and Vegetable Meals",
        "is_vegetarian": True,
        "serving_label": "1 colourful plant bowl (430 g)",
        "serving_grams": 430.0,
        "ingredients": [
            {"slug": "jp-firm-tofu", "name": "Pressed Firm Tofu Cubes", "grams": 150.0},
            {"slug": "jp-kabocha-squash", "name": "Steamed Kabocha Squash", "grams": 110.0},
            {"slug": "jp-edamame", "name": "Shelled Boiled Edamame", "grams": 70.0},
            {"slug": "jp-daikon-radish", "name": "Braised Daikon Medallions", "grams": 100.0},
        ],
        "cooking_instructions": [
            "Steam kabocha squash wedges and daikon until tender (~10 min).",
            "Pan-brown firm tofu cubes lightly in 1 tsp sesame oil and fold in shelled boiled edamame.",
            "Finish with toasted sesame seeds and a splash of lemon juice.",
        ],
        "allergens": ["soy"],
        "healthier_indian_alternative": "Kaddu Chana Sabzi with Whole Wheat Phulka Rotis (higher plant fibre).",
        "data_source": "MEXT STFCJ 8th Rev. Deterministic Sum",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "id": "natto-soba-protein-bowl",
        "title": "Fermented Soybean (Natto), Buckwheat Soba & Wakame Bowl",
        "category": "Soybean-Based Meals",
        "is_vegetarian": True,
        "serving_label": "1 fermented protein bowl (345 g)",
        "serving_grams": 345.0,
        "ingredients": [
            {"slug": "jp-buckwheat-soba", "name": "Boiled Buckwheat Soba Noodles", "grams": 180.0},
            {"slug": "jp-natto", "name": "Fermented Whole Soybeans (Natto)", "grams": 65.0},
            {"slug": "jp-wakame-seaweed", "name": "Rinsed Wakame Seaweed", "grams": 40.0},
            {"slug": "jp-daikon-radish", "name": "Grated Daikon Garnish", "grams": 60.0},
        ],
        "cooking_instructions": [
            "Boil buckwheat soba noodles until al dente and rinse cleanly in cool water.",
            "Stir natto lightly with scallions and spoon cleanly over noodles with rinsed wakame and grated daikon.",
        ],
        "allergens": ["soy", "buckwheat", "gluten"],
        "healthier_indian_alternative": "Idli-Sambar with Black Chana Chutney (similar fermented protein + grain rhythm without soy).",
        "data_source": "MEXT STFCJ 8th Rev. Deterministic Sum",
        "has_verified_image": False,
        "image_path": "",
    },
    {
        "id": "japanese-balanced-breakfast-set",
        "title": "Morning Brown Rice, Miso Soup, Edamame & Green Tea Tray",
        "category": "Balanced Japanese Breakfast",
        "is_vegetarian": True,
        "serving_label": "1 complete morning tray (550 g)",
        "serving_grams": 550.0,
        "ingredients": [
            {"slug": "jp-cooked-brown-rice", "name": "Steamed Brown Rice", "grams": 140.0},
            {"slug": "jp-miso-soup", "name": "Tofu Miso Soup", "grams": 150.0},
            {"slug": "jp-edamame", "name": "Boiled Edamame Protein Side", "grams": 60.0},
            {"slug": "jp-green-tea", "name": "Unsweetened Sencha Tea", "grams": 200.0},
        ],
        "cooking_instructions": [
            "Warm brown rice and simmer miso broth with diced tofu.",
            "Serve alongside boiled green edamame pods and freshly brewed unsweetened sencha tea.",
        ],
        "allergens": ["soy"],
        "healthier_indian_alternative": "Vegetable Poha with Roasted Peanuts, Curd & Masala Mint Chaas.",
        "data_source": "MEXT STFCJ 8th Rev. Deterministic Sum",
        "has_verified_image": False,
        "image_path": "",
    },
]


# ---------------------------------------------------------------------------
# Pydantic Schemas (Module-Scope for PEP 563 type hint resolution)
# ---------------------------------------------------------------------------


class GlobalFoodOut(BaseModel):
    id: int
    slug: str
    name: str
    country_code: str
    food_category: str
    is_vegetarian: bool
    serving_label: str
    serving_grams: float
    preparation_method: str
    preparation_state: str
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float
    fats_per_100g: float
    fibre_per_100g: float
    iron_mg_per_100g: float
    calcium_mg_per_100g: float
    sodium_mg_per_100g: float
    allergens: list[str]
    healthier_swap_note: str
    data_source: str
    source_version: str
    publication_year: int
    verification_status: str
    has_verified_image: bool
    image_path: str


class CompareFoodsRequest(BaseModel):
    left_food_slug: str = Field(..., min_length=2, max_length=120)
    right_food_slug: str = Field(..., min_length=2, max_length=120)
    left_grams: float | None = Field(default=None, gt=0, le=2500)
    right_grams: float | None = Field(default=None, gt=0, le=2500)
    diet_preference: str = Field(default="all", max_length=40)
    allergies: list[str] = Field(default_factory=list)
    profile_id: int | None = Field(default=None, ge=1)
    save_comparison: bool = False


class EducationProgressRequest(BaseModel):
    profile_id: int = Field(..., ge=1)
    topic_slug: str = Field(..., min_length=2, max_length=80)
    completed: bool = True
    quiz_score: int = Field(default=1, ge=0, le=5)
    quiz_total: int = Field(default=1, ge=1, le=5)
    notes: str | None = Field(default=None, max_length=300)


class BentoGenerateRequest(BaseModel):
    profile_id: int | None = Field(default=None, ge=1)
    meal_category: Literal[
        "office",
        "college",
        "vegetarian",
        "high_protein",
        "low_budget",
        "family",
        "breakfast",
        "dinner",
    ] = "office"
    calorie_target: int = Field(default=550, ge=250, le=1800)
    protein_target: int = Field(default=25, ge=8, le=120)
    diet_preference: Literal["any", "vegetarian"] = "any"
    allergies: list[str] = Field(default_factory=list)
    exclusions: list[str] = Field(default_factory=list)
    budget: Literal["low_budget", "balanced", "flexible"] = "balanced"
    ingredient_overrides: dict[str, str] = Field(default_factory=dict)
    save_plan: bool = True


# ---------------------------------------------------------------------------
# Module Registration & SQLAlchemy Tables 25-29
# ---------------------------------------------------------------------------


def register_global_nutrition(
    app: FastAPI,
    Base: type[DeclarativeBase],
    get_db: Callable[..., Any],
    platform: dict[str, Any],
    SessionLocal: Any,
) -> None:
    """Register Global Nutrition, MEXT/IFCT Composition, Food Balance Guide & Education routes."""
    global _SYNC_GLOBAL_HOOK

    class GlobalFoodItem(Base):
        __tablename__ = "global_food_items"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
        name: Mapped[str] = mapped_column(String(200), nullable=False)
        country_code: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
        food_category: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
        is_vegetarian: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
        serving_label: Mapped[str] = mapped_column(String(120), nullable=False)
        serving_grams: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
        preparation_method: Mapped[str] = mapped_column(Text, nullable=False)
        preparation_state: Mapped[str] = mapped_column(String(80), nullable=False, default="Prepared")
        calories_per_100g: Mapped[float] = mapped_column(Float, nullable=False)
        protein_per_100g: Mapped[float] = mapped_column(Float, nullable=False)
        carbs_per_100g: Mapped[float] = mapped_column(Float, nullable=False)
        fats_per_100g: Mapped[float] = mapped_column(Float, nullable=False)
        fibre_per_100g: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
        iron_mg_per_100g: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
        calcium_mg_per_100g: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
        sodium_mg_per_100g: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
        allergens_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
        healthier_swap_note: Mapped[str] = mapped_column(Text, nullable=False, default="")
        data_source: Mapped[str] = mapped_column(String(180), nullable=False)
        source_version: Mapped[str] = mapped_column(String(120), nullable=False)
        publication_year: Mapped[int] = mapped_column(Integer, nullable=False, default=2020)
        verification_status: Mapped[str] = mapped_column(String(48), nullable=False, default="verified_table")
        has_verified_image: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
        image_path: Mapped[str] = mapped_column(String(255), nullable=False, default="")
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, nullable=False)

    class GlobalMealComparison(Base):
        __tablename__ = "global_meal_comparisons"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
        profile_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=True, index=True)
        left_food_slug: Mapped[str] = mapped_column(String(120), nullable=False)
        right_food_slug: Mapped[str] = mapped_column(String(120), nullable=False)
        left_grams: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
        right_grams: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
        comparison_result_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
        notes: Mapped[str | None] = mapped_column(Text, nullable=True)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, nullable=False)

    class GlobalMealPlan(Base):
        __tablename__ = "global_meal_plans"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
        profile_id: Mapped[int] = mapped_column(Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
        plan_title: Mapped[str] = mapped_column(String(180), nullable=False)
        meal_category: Mapped[str] = mapped_column(String(64), nullable=False)
        diet_preference: Mapped[str] = mapped_column(String(48), nullable=False)
        calorie_target: Mapped[int] = mapped_column(Integer, nullable=False, default=2000)
        protein_target: Mapped[int] = mapped_column(Integer, nullable=False, default=70)
        budget_tier: Mapped[str] = mapped_column(String(48), nullable=False, default="balanced")
        allergies_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
        bento_payload_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
        source: Mapped[str] = mapped_column(String(80), nullable=False, default="deterministic_mext_ifct")
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, nullable=False)
        updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, onupdate=_utc_now, nullable=False)

    class FoodEducationProgress(Base):
        __tablename__ = "food_education_progress"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
        profile_id: Mapped[int] = mapped_column(Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
        topic_slug: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
        completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
        quiz_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
        quiz_total: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
        notes: Mapped[str | None] = mapped_column(String(300), nullable=True)
        updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, onupdate=_utc_now, nullable=False)

    class SeasonalFoodRecord(Base):
        __tablename__ = "seasonal_food_records"

        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
        country_code: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
        season: Mapped[str] = mapped_column(String(24), nullable=False, index=True)
        food_group: Mapped[str] = mapped_column(String(80), nullable=False)
        name: Mapped[str] = mapped_column(String(200), nullable=False)
        is_vegetarian: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
        regional_availability_note: Mapped[str] = mapped_column(Text, nullable=False)
        nutritional_highlights: Mapped[str] = mapped_column(Text, nullable=False)
        seasonal_recipe_idea: Mapped[str] = mapped_column(Text, nullable=False)
        paired_indian_alternative: Mapped[str] = mapped_column(Text, nullable=False)
        data_source: Mapped[str] = mapped_column(String(180), nullable=False)
        verification_status: Mapped[str] = mapped_column(String(48), nullable=False, default="verified_seasonal_reference")
        has_verified_image: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
        image_path: Mapped[str] = mapped_column(String(255), nullable=False, default="")

    def _sync_global_catalog(db: Session, force: bool = False) -> None:
        global _GLOBAL_CATALOG_SYNCED
        if not force and _GLOBAL_CATALOG_SYNCED:
            return
        for row in SEED_GLOBAL_FOODS:
            existing = db.scalar(select(GlobalFoodItem).where(GlobalFoodItem.slug == row["slug"]))
            fields = {
                "name": row["name"],
                "country_code": row["country_code"],
                "food_category": row["food_category"],
                "is_vegetarian": row["is_vegetarian"],
                "serving_label": row["serving_label"],
                "serving_grams": row["serving_grams"],
                "preparation_method": row["preparation_method"],
                "preparation_state": row["preparation_state"],
                "calories_per_100g": row["calories_per_100g"],
                "protein_per_100g": row["protein_per_100g"],
                "carbs_per_100g": row["carbs_per_100g"],
                "fats_per_100g": row["fats_per_100g"],
                "fibre_per_100g": row["fibre_per_100g"],
                "iron_mg_per_100g": row["iron_mg_per_100g"],
                "calcium_mg_per_100g": row["calcium_mg_per_100g"],
                "sodium_mg_per_100g": row["sodium_mg_per_100g"],
                "allergens_json": json.dumps(row["allergens"]),
                "healthier_swap_note": row["healthier_swap_note"],
                "data_source": row["data_source"],
                "source_version": row["source_version"],
                "publication_year": row["publication_year"],
                "verification_status": row["verification_status"],
                "has_verified_image": row["has_verified_image"],
                "image_path": row["image_path"],
            }
            if existing:
                for k, v in fields.items():
                    setattr(existing, k, v)
            else:
                db.add(GlobalFoodItem(slug=row["slug"], **fields))

        for sr in SEED_SEASONAL_FOODS:
            existing_sr = db.scalar(select(SeasonalFoodRecord).where(SeasonalFoodRecord.slug == sr["slug"]))
            if existing_sr:
                for k, v in sr.items():
                    if k != "slug":
                        setattr(existing_sr, k, v)
            else:
                db.add(SeasonalFoodRecord(**sr))

        db.commit()
        _GLOBAL_CATALOG_SYNCED = True

    _SYNC_GLOBAL_HOOK = _sync_global_catalog

    # Dependencies from platform
    get_current_user = platform["get_current_user"]
    get_optional_user = platform["get_optional_user"]
    require_owned_profile = platform["require_owned_profile"]
    FoodEntryModel = platform["ProfileFoodEntry"]
    HydrationEntryModel = platform["ProfileHydrationEntry"]
    ActivityEntryModel = platform["ProfileActivityEntry"]

    def _serialize_food(f: GlobalFoodItem) -> GlobalFoodOut:
        return GlobalFoodOut(
            id=f.id,
            slug=f.slug,
            name=f.name,
            country_code=f.country_code,
            food_category=f.food_category,
            is_vegetarian=f.is_vegetarian,
            serving_label=f.serving_label,
            serving_grams=f.serving_grams,
            preparation_method=f.preparation_method,
            preparation_state=f.preparation_state,
            calories_per_100g=f.calories_per_100g,
            protein_per_100g=f.protein_per_100g,
            carbs_per_100g=f.carbs_per_100g,
            fats_per_100g=f.fats_per_100g,
            fibre_per_100g=f.fibre_per_100g,
            iron_mg_per_100g=f.iron_mg_per_100g,
            calcium_mg_per_100g=f.calcium_mg_per_100g,
            sodium_mg_per_100g=f.sodium_mg_per_100g,
            allergens=[str(x) for x in _parse_json_list(f.allergens_json)],
            healthier_swap_note=f.healthier_swap_note,
            data_source=f.data_source,
            source_version=f.source_version,
            publication_year=f.publication_year,
            verification_status=f.verification_status,
            has_verified_image=f.has_verified_image,
            image_path=f.image_path,
        )

    def _scale_food(food: GlobalFoodItem, grams: float) -> dict[str, Any]:
        factor = grams / 100.0
        return {
            "slug": food.slug,
            "name": food.name,
            "country_code": food.country_code,
            "food_category": food.food_category,
            "is_vegetarian": food.is_vegetarian,
            "grams": _round2(grams),
            "serving_label": food.serving_label,
            "preparation_method": food.preparation_method,
            "preparation_state": food.preparation_state,
            "calories": _round2(food.calories_per_100g * factor),
            "protein": _round2(food.protein_per_100g * factor),
            "carbs": _round2(food.carbs_per_100g * factor),
            "fats": _round2(food.fats_per_100g * factor),
            "fibre": _round2(food.fibre_per_100g * factor),
            "iron_mg": _round2(food.iron_mg_per_100g * factor),
            "calcium_mg": _round2(food.calcium_mg_per_100g * factor),
            "sodium_mg": _round2(food.sodium_mg_per_100g * factor),
            "allergens": [str(x) for x in _parse_json_list(food.allergens_json)],
            "healthier_swap_note": food.healthier_swap_note,
            "data_source": food.data_source,
            "source_version": food.source_version,
            "publication_year": food.publication_year,
            "verification_status": food.verification_status,
            "has_verified_image": food.has_verified_image,
            "image_path": food.image_path,
        }

    # -----------------------------------------------------------------------
    # Endpoints
    # -----------------------------------------------------------------------

    router = APIRouter(prefix="/api/global", tags=["Global Nutrition Intelligence"])

    @router.get("/countries")
    def get_countries(db: Session = Depends(get_db)) -> dict[str, Any]:
        _sync_global_catalog(db)
        rows = list(db.scalars(select(GlobalFoodItem)).all())
        counts: dict[str, int] = {"JP": 0, "IN": 0}
        for r in rows:
            counts[r.country_code] = counts.get(r.country_code, 0) + 1
        return {
            "countries": [
                {
                    "country_code": "JP",
                    "name": "Japan",
                    "system_inspiration": "Japanese Food Balance Guide, Food Education & MEXT Composition Tables",
                    "primary_source": "MEXT Standard Tables of Food Composition (8th Revised Edition, 2020/2023)",
                    "foods_count": counts.get("JP", 0),
                    "disclaimer": "Inspired functionally by Japanese public food education and food composition references; presented in English as an independent NutriSense AI module.",
                },
                {
                    "country_code": "IN",
                    "name": "India",
                    "system_inspiration": "ICMR–NIN IFCT 2017 Indian Dietary Composition & Traditional Home Plates",
                    "primary_source": "ICMR–NIN Indian Food Composition Tables (IFCT 2017)",
                    "foods_count": counts.get("IN", 0),
                    "disclaimer": "Backed by NutriSense AI's verified local ICMR–NIN IFCT 2017 tables alongside USDA FoodData Central.",
                },
            ],
            "compare_presets": COMPARE_PRESETS,
        }

    @router.get("/foods", response_model=list[GlobalFoodOut])
    def list_global_foods(
        country: str | None = Query(default=None),
        category: str | None = Query(default=None),
        q: str | None = Query(default=None),
        vegetarian_only: bool = Query(default=False),
        limit: int = Query(default=100, ge=1, le=200),
        db: Session = Depends(get_db),
    ) -> list[GlobalFoodOut]:
        _sync_global_catalog(db)
        rows = list(db.scalars(select(GlobalFoodItem).order_by(GlobalFoodItem.country_code.desc(), GlobalFoodItem.id.asc())).all())
        q_norm = (q or "").strip().lower()
        cat_norm = (category or "").strip().lower()
        country_norm = (country or "").strip().upper()
        filtered: list[GlobalFoodOut] = []
        for item in rows:
            if country_norm and country_norm != "ALL" and item.country_code != country_norm:
                continue
            if cat_norm and cat_norm != "all" and item.food_category.lower() != cat_norm:
                continue
            if vegetarian_only and not item.is_vegetarian:
                continue
            if q_norm:
                hay = f"{item.name} {item.food_category} {item.preparation_method} {item.slug}".lower()
                if q_norm not in hay:
                    continue
            filtered.append(_serialize_food(item))
            if len(filtered) >= limit:
                break
        return filtered

    @router.get("/foods/{food_ref}", response_model=GlobalFoodOut)
    def get_single_global_food(food_ref: str, db: Session = Depends(get_db)) -> GlobalFoodOut:
        _sync_global_catalog(db)
        row: GlobalFoodItem | None = None
        if food_ref.isdigit():
            row = db.get(GlobalFoodItem, int(food_ref))
        if row is None:
            row = db.scalar(select(GlobalFoodItem).where(GlobalFoodItem.slug == food_ref))
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food record not found.")
        return _serialize_food(row)

    @router.post("/compare")
    def compare_global_foods(
        payload: CompareFoodsRequest,
        current_user: Any = Depends(get_optional_user),
        db: Session = Depends(get_db),
    ) -> dict[str, Any]:
        _sync_global_catalog(db)
        left = db.scalar(select(GlobalFoodItem).where(GlobalFoodItem.slug == payload.left_food_slug))
        right = db.scalar(select(GlobalFoodItem).where(GlobalFoodItem.slug == payload.right_food_slug))
        if not left or not right:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or both comparison foods were not found.")

        l_grams = float(payload.left_grams or left.serving_grams)
        r_grams = float(payload.right_grams or right.serving_grams)
        left_scaled = _scale_food(left, l_grams)
        right_scaled = _scale_food(right, r_grams)

        differences: list[str] = []
        cal_diff = _round2(left_scaled["calories"] - right_scaled["calories"])
        pro_diff = _round2(left_scaled["protein"] - right_scaled["protein"])
        fib_diff = _round2(left_scaled["fibre"] - right_scaled["fibre"])
        na_diff = _round2(left_scaled["sodium_mg"] - right_scaled["sodium_mg"])
        ca_diff = _round2(left_scaled["calcium_mg"] - right_scaled["calcium_mg"])

        if abs(pro_diff) >= 0.5:
            higher = left.name if pro_diff > 0 else right.name
            differences.append(f"{higher} provides {_round2(abs(pro_diff))} g more protein at these serving weights.")
        if abs(fib_diff) >= 0.4:
            higher_f = left.name if fib_diff > 0 else right.name
            differences.append(f"{higher_f} supplies {_round2(abs(fib_diff))} g more dietary fibre.")
        if abs(na_diff) >= 40:
            higher_na = left.name if na_diff > 0 else right.name
            differences.append(f"{higher_na} is noticeably higher in sodium (+{round(abs(na_diff))} mg) — important when monitoring salt.")
        if abs(ca_diff) >= 25:
            higher_ca = left.name if ca_diff > 0 else right.name
            differences.append(f"{higher_ca} contains +{round(abs(ca_diff))} mg higher calcium.")
        if not differences:
            differences.append("Both dishes offer relatively close macronutrients at the selected portions.")

        differences.append(
            "Note: Dishes from Indian and Japanese kitchens are never treated as nutritionally identical; preparation method, cooking fat, and sodium content differ substantially."
        )

        # Evaluate fit against allergies and preferences
        rec_allergies = {a.strip().lower() for a in payload.allergies if a.strip()}
        if current_user and payload.profile_id:
            prof = require_owned_profile(db, current_user.id, payload.profile_id)
            for pa in _parse_json_list(prof.allergies_json):
                rec_allergies.add(str(pa).strip().lower())

        allergen_warnings: list[str] = []
        for side_label, scaled in [(left.name, left_scaled), (right.name, right_scaled)]:
            for al in scaled["allergens"]:
                if any(al.lower() in ra or ra in al.lower() for ra in rec_allergies) or al.lower() in {"soy", "fish", "dairy", "gluten", "egg"}:
                    if any(al.lower() in ra or ra in al.lower() for ra in rec_allergies):
                        allergen_warnings.append(f"Allergen Match Alert: {side_label} contains '{al}' from your profile allergy list.")
                    else:
                        allergen_warnings.append(f"Allergen Info: {side_label} contains {al}.")

        better_fit_notes: list[str] = []
        if payload.diet_preference == "vegetarian":
            if left.is_vegetarian and not right.is_vegetarian:
                better_fit_notes.append(f"Best vegetarian fit: {left.name}.")
            elif right.is_vegetarian and not left.is_vegetarian:
                better_fit_notes.append(f"Best vegetarian fit: {right.name}.")
        if cal_diff > 40:
            better_fit_notes.append(f"Lower-calorie option at these portions: {right.name} ({right_scaled['calories']} kcal vs {left_scaled['calories']} kcal).")
        elif cal_diff < -40:
            better_fit_notes.append(f"Lower-calorie option at these portions: {left.name} ({left_scaled['calories']} kcal vs {right_scaled['calories']} kcal).")
        if abs(na_diff) >= 120:
            lower_na = right.name if na_diff > 0 else left.name
            better_fit_notes.append(f"Lower-sodium preference fit: {lower_na}.")

        result = {
            "left": left_scaled,
            "right": right_scaled,
            "deltas": {
                "calories": cal_diff,
                "protein": pro_diff,
                "fibre": fib_diff,
                "sodium_mg": na_diff,
                "calcium_mg": ca_diff,
            },
            "key_differences": differences,
            "allergen_warnings": allergen_warnings,
            "better_fit_notes": better_fit_notes,
            "budget_note": "Verified live market prices vary by city; NutriSense never displays fabricated price guarantees.",
        }

        if payload.save_comparison and current_user and payload.profile_id:
            require_owned_profile(db, current_user.id, payload.profile_id)
            db.add(
                GlobalMealComparison(
                    user_id=current_user.id,
                    profile_id=payload.profile_id,
                    left_food_slug=left.slug,
                    right_food_slug=right.slug,
                    left_grams=l_grams,
                    right_grams=r_grams,
                    comparison_result_json=json.dumps(result),
                )
            )
            db.commit()

        return result

    def _classify_food_balance(meal_name: str, cal: float, protein: float, fibre: float) -> dict[str, float]:
        """Map a tracked food item deterministically into approximate Spinning Top SV units."""
        n = meal_name.lower()
        sv = {"grains": 0.0, "vegetables": 0.0, "protein_dishes": 0.0, "dairy": 0.0, "fruits": 0.0}
        if any(k in n for k in ("rice", "roti", "phulka", "paratha", "bread", "soba", "udon", "poha", "idli", "dosa", "oats", "daliya", "khichdi", "bento")):
            sv["grains"] += max(0.8, round(cal / 180.0, 1)) if cal > 0 else 1.0
        if any(k in n for k in ("palak", "spinach", "sabzi", "salad", "daikon", "kabocha", "miso soup", "wakame", "vegetable", "bhindi", "shiitake", "bowl", "thali", "washoku")):
            sv["vegetables"] += 1.2 if "thali" in n or "washoku" in n or "bowl" in n else 1.0
        if any(k in n for k in ("dal", "tofu", "salmon", "mackerel", "chicken", "egg", "paneer", "chana", "edamame", "natto", "cheela", "rajma", "soy")) or protein >= 6:
            sv["protein_dishes"] += max(1.0, round(protein / 6.0, 1)) if protein >= 6 else 1.0
        if any(k in n for k in ("curd", "milk", "yogurt", "paneer", "chaas", "lassi", "tofu")):
            sv["dairy"] += 0.8
        if any(k in n for k in ("orange", "banana", "apple", "guava", "berry", "berries", "pomegranate", "strawberry", "fruit", "mango")):
            sv["fruits"] += 1.0
        if fibre >= 4.0 and sv["vegetables"] == 0:
            sv["vegetables"] += 0.8
        return sv

    @router.get("/food-balance-guide")
    def get_food_balance_guide(
        profile_id: int | None = Query(default=None, ge=1),
        target_date: date | None = Query(default=None),
        current_user: Any = Depends(get_optional_user),
        db: Session = Depends(get_db),
    ) -> dict[str, Any]:
        guide = json.loads(json.dumps(FOOD_BALANCE_GUIDE_DATA))
        user_sv: dict[str, float] = {
            "grains": 0.0,
            "vegetables": 0.0,
            "protein_dishes": 0.0,
            "dairy": 0.0,
            "fruits": 0.0,
            "hydration": 0.0,
            "activity": 0.0,
        }
        tracked_entries_count = 0

        if current_user and profile_id:
            require_owned_profile(db, current_user.id, profile_id)
            day = target_date or datetime.now(timezone.utc).date()
            start_dt = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc)
            end_dt = start_dt + timedelta(days=1)

            foods = list(
                db.scalars(
                    select(FoodEntryModel).where(
                        FoodEntryModel.user_id == current_user.id,
                        FoodEntryModel.profile_id == profile_id,
                        FoodEntryModel.consumed_at >= start_dt,
                        FoodEntryModel.consumed_at < end_dt,
                    )
                ).all()
            )
            tracked_entries_count = len(foods)
            for fe in foods:
                c = _classify_food_balance(fe.meal_name, fe.calories, fe.protein, fe.fibre)
                for k, v in c.items():
                    user_sv[k] += v

            hyd_rows = list(
                db.scalars(
                    select(HydrationEntryModel).where(
                        HydrationEntryModel.user_id == current_user.id,
                        HydrationEntryModel.profile_id == profile_id,
                        HydrationEntryModel.logged_at >= start_dt,
                        HydrationEntryModel.logged_at < end_dt,
                    )
                ).all()
            )
            user_sv["hydration"] = sum(h.amount_ml for h in hyd_rows)

            act_rows = list(
                db.scalars(
                    select(ActivityEntryModel).where(
                        ActivityEntryModel.user_id == current_user.id,
                        ActivityEntryModel.profile_id == profile_id,
                        ActivityEntryModel.logged_at >= start_dt,
                        ActivityEntryModel.logged_at < end_dt,
                    )
                ).all()
            )
            user_sv["activity"] = sum(a.duration_minutes for a in act_rows)

        insights: list[str] = []
        for g in guide["groups"]:
            key = g["key"]
            cur = _round2(user_sv.get(key, 0.0))
            g["current_value"] = cur
            if cur == 0:
                g["balance_status"] = "no_data_yet" if tracked_entries_count == 0 else "underrepresented"
            elif cur < g["recommended_sv_min"]:
                g["balance_status"] = "underrepresented"
            elif cur > g["recommended_sv_max"] * 1.25:
                g["balance_status"] = "overrepresented"
            else:
                g["balance_status"] = "balanced"

        if current_user and profile_id and tracked_entries_count > 0:
            under = [g["name"] for g in guide["groups"] if g["balance_status"] == "underrepresented"]
            over = [g["name"] for g in guide["groups"] if g["balance_status"] == "overrepresented"]
            if under:
                insights.append(f"Food groups lower than guide range today: {', '.join(under[:3])}.")
            if over:
                insights.append(f"Food groups exceeding typical daily range today: {', '.join(over[:2])}.")
            if not under and not over:
                insights.append("Today's logged food groups are tracking nicely inside balanced guide ranges.")
        else:
            insights.append("Log or add any meal to inspect your personalized daily Spinning Top balance.")

        guide["insights"] = insights
        guide["tracked_entries_count"] = tracked_entries_count
        return guide

    @router.get("/education")
    def get_education_center() -> dict[str, Any]:
        return {
            "module_title": "Smart Food Education Center",
            "inspiration": "Inspired by holistic food, balance, origin, and family kitchen education principles.",
            "topics": SEED_EDUCATION_TOPICS,
        }

    @router.get("/education/progress")
    def get_education_progress(
        profile_id: int = Query(..., ge=1),
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> list[dict[str, Any]]:
        require_owned_profile(db, current_user.id, profile_id)
        rows = list(
            db.scalars(
                select(FoodEducationProgress)
                .where(
                    FoodEducationProgress.user_id == current_user.id,
                    FoodEducationProgress.profile_id == profile_id,
                )
                .order_by(FoodEducationProgress.updated_at.desc())
            ).all()
        )
        return [
            {
                "id": r.id,
                "profile_id": r.profile_id,
                "topic_slug": r.topic_slug,
                "completed": r.completed,
                "quiz_score": r.quiz_score,
                "quiz_total": r.quiz_total,
                "notes": r.notes,
                "updated_at": r.updated_at,
            }
            for r in rows
        ]

    @router.post("/education/progress", status_code=status.HTTP_201_CREATED)
    def save_education_progress(
        payload: EducationProgressRequest,
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> dict[str, Any]:
        require_owned_profile(db, current_user.id, payload.profile_id)
        existing = db.scalar(
            select(FoodEducationProgress).where(
                FoodEducationProgress.user_id == current_user.id,
                FoodEducationProgress.profile_id == payload.profile_id,
                FoodEducationProgress.topic_slug == payload.topic_slug,
            )
        )
        if existing:
            existing.completed = payload.completed
            existing.quiz_score = payload.quiz_score
            existing.quiz_total = payload.quiz_total
            existing.notes = payload.notes
            existing.updated_at = _utc_now()
            row = existing
        else:
            row = FoodEducationProgress(
                user_id=current_user.id,
                profile_id=payload.profile_id,
                topic_slug=payload.topic_slug,
                completed=payload.completed,
                quiz_score=payload.quiz_score,
                quiz_total=payload.quiz_total,
                notes=payload.notes,
            )
            db.add(row)
        db.commit()
        db.refresh(row)
        return {
            "id": row.id,
            "profile_id": row.profile_id,
            "topic_slug": row.topic_slug,
            "completed": row.completed,
            "quiz_score": row.quiz_score,
            "quiz_total": row.quiz_total,
            "updated_at": row.updated_at,
        }

    @router.post("/bento/generate")
    def generate_bento_plan(
        payload: BentoGenerateRequest,
        current_user: Any = Depends(get_optional_user),
        db: Session = Depends(get_db),
    ) -> dict[str, Any]:
        _sync_global_catalog(db)
        food_by_slug = {f.slug: f for f in db.scalars(select(GlobalFoodItem)).all()}

        allergies_set = {a.strip().lower() for a in payload.allergies if a.strip()}
        exclusions_set = {e.strip().lower() for e in payload.exclusions if e.strip()}
        is_veg = payload.diet_preference == "vegetarian" or payload.meal_category == "vegetarian"

        if current_user and payload.profile_id:
            prof = require_owned_profile(db, current_user.id, payload.profile_id)
            for pa in _parse_json_list(prof.allergies_json):
                allergies_set.add(str(pa).strip().lower())

        def _eligible(food: GlobalFoodItem | None) -> bool:
            if not food:
                return False
            if is_veg and not food.is_vegetarian:
                return False
            als = [str(x).lower() for x in _parse_json_list(food.allergens_json)]
            if any(a in als or any(a in r for r in [food.name.lower()]) for a in allergies_set):
                return False
            if any(ex in food.name.lower() or ex in food.slug.lower() for ex in exclusions_set):
                return False
            return True

        # Select compartments deterministically from verified MEXT / IFCT foods
        if payload.meal_category == "high_protein":
            default_slots = {
                "grain_base": "jp-cooked-brown-rice",
                "main_protein": "jp-grilled-salmon" if not is_veg else "jp-natto",
                "secondary_protein": "jp-edamame",
                "vegetable_side": "jp-spinach-ohitashi",
            }
            title = "High-Protein Balanced Bento Box"
        elif payload.meal_category == "low_budget" or payload.budget == "low_budget":
            default_slots = {
                "grain_base": "jp-cooked-white-rice",
                "main_protein": "in-roasted-lentils-chana" if "soy" in allergies_set else "jp-firm-tofu",
                "secondary_protein": "jp-edamame",
                "vegetable_side": "jp-daikon-radish",
            }
            title = "Budget-Friendly Balanced Bento Box"
        elif payload.meal_category == "college":
            default_slots = {
                "grain_base": "jp-cooked-brown-rice",
                "main_protein": "jp-firm-tofu",
                "secondary_protein": "jp-edamame",
                "vegetable_side": "jp-kabocha-squash",
            }
            title = "Campus & College 10-Min Bento Box"
        elif payload.meal_category == "breakfast":
            default_slots = {
                "grain_base": "jp-cooked-brown-rice",
                "main_protein": "jp-natto",
                "secondary_protein": "jp-miso-soup",
                "vegetable_side": "jp-spinach-ohitashi",
            }
            title = "Balanced Japanese-Inspired Morning Tray"
        elif payload.meal_category == "dinner":
            default_slots = {
                "grain_base": "jp-buckwheat-soba",
                "main_protein": "jp-pacific-mackerel" if not is_veg else "jp-firm-tofu",
                "secondary_protein": "jp-miso-soup",
                "vegetable_side": "jp-kabocha-squash",
            }
            title = "Light & Restorative Evening Bento"
        else:
            default_slots = {
                "grain_base": "jp-cooked-brown-rice",
                "main_protein": "jp-grilled-salmon" if not is_veg else "jp-firm-tofu",
                "secondary_protein": "jp-edamame",
                "vegetable_side": "jp-kabocha-squash",
            }
            title = f"{payload.meal_category.replace('_', ' ').title()} Balanced Bento"

        # Apply user overrides or fallback if allergy/exclusion removes a default
        fallbacks = {
            "grain_base": ["jp-cooked-brown-rice", "jp-cooked-white-rice", "in-cooked-rice", "jp-buckwheat-soba"],
            "main_protein": ["jp-firm-tofu", "in-roasted-lentils-chana", "in-dal-tadka", "in-paneer", "jp-edamame", "jp-grilled-salmon"],
            "secondary_protein": ["jp-edamame", "in-roasted-lentils-chana", "jp-miso-soup", "jp-wakame-seaweed"],
            "vegetable_side": ["jp-spinach-ohitashi", "jp-kabocha-squash", "jp-daikon-radish", "jp-wakame-seaweed"],
        }

        chosen_items: list[dict[str, Any]] = []
        target_grams_by_slot = {
            "grain_base": 150.0,
            "main_protein": 130.0,
            "secondary_protein": 80.0,
            "vegetable_side": 90.0,
        }

        # Scale grain/protein proportionally toward requested calorie_target
        scale_factor = max(0.65, min(1.8, payload.calorie_target / 550.0))

        for slot, default_slug in default_slots.items():
            requested_slug = payload.ingredient_overrides.get(slot, default_slug)
            item = food_by_slug.get(requested_slug)
            if not _eligible(item):
                item = next((food_by_slug.get(s) for s in fallbacks[slot] if _eligible(food_by_slug.get(s))), food_by_slug.get(default_slug))
            if not item:
                continue
            grams = round(target_grams_by_slot[slot] * scale_factor)
            scaled = _scale_food(item, grams)
            scaled["slot"] = slot
            scaled["replacement_options"] = [
                {"slug": s, "name": food_by_slug[s].name}
                for s in fallbacks[slot]
                if food_by_slug.get(s) and _eligible(food_by_slug.get(s)) and s != item.slug
            ]
            chosen_items.append(scaled)

        totals = {
            "total_grams": _round2(sum(c["grams"] for c in chosen_items)),
            "calories": _round2(sum(c["calories"] for c in chosen_items)),
            "protein": _round2(sum(c["protein"] for c in chosen_items)),
            "carbs": _round2(sum(c["carbs"] for c in chosen_items)),
            "fats": _round2(sum(c["fats"] for c in chosen_items)),
            "fibre": _round2(sum(c["fibre"] for c in chosen_items)),
            "iron_mg": _round2(sum(c["iron_mg"] for c in chosen_items)),
            "calcium_mg": _round2(sum(c["calcium_mg"] for c in chosen_items)),
            "sodium_mg": _round2(sum(c["sodium_mg"] for c in chosen_items)),
        }

        prep_steps = [
            f"Cook grain compartment ({chosen_items[0]['name'] if chosen_items else 'steamed rice'}) fresh or pack chilled grains in an insulated box.",
            "Pan-sear or steam the protein compartment lightly with ginger, sesame, and minimal oil.",
            "Arrange steamed/blanched vegetables cleanly in a separate bento divider to keep textures crisp.",
            "Pack dipping lemon wedges separately and pair with unsweetened green tea or water.",
        ]

        plan_payload = {
            "plan_title": title,
            "meal_category": payload.meal_category,
            "diet_preference": "vegetarian" if is_veg else "any",
            "calorie_target": payload.calorie_target,
            "protein_target": payload.protein_target,
            "budget": payload.budget,
            "items": chosen_items,
            "totals": totals,
            "preparation_instructions": prep_steps,
            "grocery_items": [c["name"] for c in chosen_items],
            "source_attribution": "Deterministic calculation from MEXT STFCJ 8th Rev. & ICMR–NIN IFCT 2017 tables",
            "saved_plan_id": None,
        }

        if payload.save_plan and current_user and payload.profile_id:
            require_owned_profile(db, current_user.id, payload.profile_id)
            row = GlobalMealPlan(
                user_id=current_user.id,
                profile_id=payload.profile_id,
                plan_title=title,
                meal_category=payload.meal_category,
                diet_preference="vegetarian" if is_veg else "any",
                calorie_target=payload.calorie_target,
                protein_target=payload.protein_target,
                budget_tier=payload.budget,
                allergies_json=json.dumps(sorted(allergies_set)),
                bento_payload_json=json.dumps(plan_payload),
                source="deterministic_mext_ifct",
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            plan_payload["saved_plan_id"] = row.id

        return plan_payload

    @router.get("/bento/plans")
    def list_saved_bento_plans(
        profile_id: int = Query(..., ge=1),
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> list[dict[str, Any]]:
        require_owned_profile(db, current_user.id, profile_id)
        rows = list(
            db.scalars(
                select(GlobalMealPlan)
                .where(
                    GlobalMealPlan.user_id == current_user.id,
                    GlobalMealPlan.profile_id == profile_id,
                )
                .order_by(GlobalMealPlan.created_at.desc())
                .limit(12)
            ).all()
        )
        return [
            {
                "id": r.id,
                "plan_title": r.plan_title,
                "meal_category": r.meal_category,
                "created_at": r.created_at,
                "payload": _parse_json_dict(r.bento_payload_json),
            }
            for r in rows
        ]

    @router.get("/seasonal-foods")
    def list_seasonal_foods(
        country: str | None = Query(default=None),
        season: str | None = Query(default=None),
        vegetarian_only: bool = Query(default=False),
        db: Session = Depends(get_db),
    ) -> list[dict[str, Any]]:
        _sync_global_catalog(db)
        rows = list(db.scalars(select(SeasonalFoodRecord).order_by(SeasonalFoodRecord.id.asc())).all())
        c_norm = (country or "").strip().upper()
        s_norm = (season or "").strip().lower()
        out: list[dict[str, Any]] = []
        for r in rows:
            if c_norm and c_norm != "ALL" and r.country_code != c_norm:
                continue
            if s_norm and s_norm != "all" and r.season.lower() != s_norm:
                continue
            if vegetarian_only and not r.is_vegetarian:
                continue
            out.append(
                {
                    "id": r.id,
                    "slug": r.slug,
                    "country_code": r.country_code,
                    "season": r.season,
                    "food_group": r.food_group,
                    "name": r.name,
                    "is_vegetarian": r.is_vegetarian,
                    "regional_availability_note": r.regional_availability_note,
                    "nutritional_highlights": r.nutritional_highlights,
                    "seasonal_recipe_idea": r.seasonal_recipe_idea,
                    "paired_indian_alternative": r.paired_indian_alternative,
                    "data_source": r.data_source,
                    "verification_status": r.verification_status,
                    "has_verified_image": r.has_verified_image,
                    "image_path": r.image_path,
                }
            )
        return out

    @router.get("/meals")
    def list_traditional_japanese_meals(
        category: str | None = Query(default=None),
        vegetarian_only: bool = Query(default=False),
        db: Session = Depends(get_db),
    ) -> list[dict[str, Any]]:
        _sync_global_catalog(db)
        food_by_slug = {f.slug: f for f in db.scalars(select(GlobalFoodItem)).all()}
        cat_norm = (category or "").strip().lower()
        results: list[dict[str, Any]] = []
        for m in JAPANESE_TRADITIONAL_MEALS:
            if cat_norm and cat_norm != "all" and cat_norm not in m["category"].lower():
                continue
            if vegetarian_only and not m["is_vegetarian"]:
                continue
            ing_details: list[dict[str, Any]] = []
            totals = {
                "calories": 0.0,
                "protein": 0.0,
                "carbs": 0.0,
                "fats": 0.0,
                "fibre": 0.0,
                "iron_mg": 0.0,
                "calcium_mg": 0.0,
                "sodium_mg": 0.0,
            }
            for ing in m["ingredients"]:
                f_row = food_by_slug.get(ing["slug"])
                if not f_row:
                    continue
                sc = _scale_food(f_row, ing["grams"])
                ing_details.append({"slug": ing["slug"], "name": ing["name"], "grams": ing["grams"], "calories": sc["calories"], "protein": sc["protein"]})
                for k in totals:
                    totals[k] = _round2(totals[k] + sc[k])
            results.append(
                {
                    **m,
                    "ingredient_breakdown": ing_details,
                    "totals": totals,
                }
            )
        return results

    @router.get("/dashboard-summary")
    def get_global_dashboard_summary(
        profile_id: int = Query(..., ge=1),
        days: int = Query(default=7, ge=1, le=30),
        current_user: Any = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> dict[str, Any]:
        """Real PostgreSQL tracking metrics aggregated into Indian/Japanese diversity & daily balance."""
        require_owned_profile(db, current_user.id, profile_id)
        today = datetime.now(timezone.utc).date()
        start_day = today - timedelta(days=days - 1)
        start_dt = datetime.combine(start_day, datetime.min.time(), tzinfo=timezone.utc)

        foods = list(
            db.scalars(
                select(FoodEntryModel)
                .where(
                    FoodEntryModel.user_id == current_user.id,
                    FoodEntryModel.profile_id == profile_id,
                    FoodEntryModel.consumed_at >= start_dt,
                )
                .order_by(FoodEntryModel.consumed_at.asc())
            ).all()
        )
        hydrations = list(
            db.scalars(
                select(HydrationEntryModel).where(
                    HydrationEntryModel.user_id == current_user.id,
                    HydrationEntryModel.profile_id == profile_id,
                    HydrationEntryModel.logged_at >= start_dt,
                )
            ).all()
        )
        activities = list(
            db.scalars(
                select(ActivityEntryModel).where(
                    ActivityEntryModel.user_id == current_user.id,
                    ActivityEntryModel.profile_id == profile_id,
                    ActivityEntryModel.logged_at >= start_dt,
                )
            ).all()
        )

        indian_count = 0
        japanese_count = 0
        global_other_count = 0
        distinct_meals: set[str] = set()
        today_totals = {
            "calories": 0.0,
            "protein": 0.0,
            "carbs": 0.0,
            "fats": 0.0,
            "fibre": 0.0,
            "hydration_ml": 0.0,
            "activity_minutes": 0,
        }
        daily_series: dict[str, dict[str, float]] = {
            (start_day + timedelta(days=i)).isoformat(): {
                "calories": 0.0,
                "protein": 0.0,
                "fibre": 0.0,
                "water_ml": 0.0,
                "activity_minutes": 0.0,
            }
            for i in range(days)
        }

        jp_keywords = ("miso", "tofu", "natto", "edamame", "soba", "udon", "wakame", "daikon", "kabocha", "washoku", "bento", "salmon", "sencha", "tamagoyaki", "ohitashi", "japanese")
        in_keywords = ("roti", "phulka", "dal", "paneer", "khichdi", "idli", "dosa", "poha", "rajma", "chana", "thali", "paratha", "curd", "cheela", "bhindi", "sattu", "palak", "indian")

        for fe in foods:
            d_key = fe.consumed_at.date().isoformat()
            name_low = fe.meal_name.lower()
            distinct_meals.add(name_low)
            if any(k in name_low for k in jp_keywords):
                japanese_count += 1
            elif any(k in name_low for k in in_keywords):
                indian_count += 1
            else:
                global_other_count += 1

            if d_key in daily_series:
                daily_series[d_key]["calories"] = _round2(daily_series[d_key]["calories"] + fe.calories)
                daily_series[d_key]["protein"] = _round2(daily_series[d_key]["protein"] + fe.protein)
                daily_series[d_key]["fibre"] = _round2(daily_series[d_key]["fibre"] + fe.fibre)
            if fe.consumed_at.date() == today:
                today_totals["calories"] = _round2(today_totals["calories"] + fe.calories)
                today_totals["protein"] = _round2(today_totals["protein"] + fe.protein)
                today_totals["carbs"] = _round2(today_totals["carbs"] + fe.carbs)
                today_totals["fats"] = _round2(today_totals["fats"] + fe.fats)
                today_totals["fibre"] = _round2(today_totals["fibre"] + fe.fibre)

        for hy in hydrations:
            d_key = hy.logged_at.date().isoformat()
            if d_key in daily_series:
                daily_series[d_key]["water_ml"] = _round2(daily_series[d_key]["water_ml"] + hy.amount_ml)
            if hy.logged_at.date() == today:
                today_totals["hydration_ml"] = _round2(today_totals["hydration_ml"] + hy.amount_ml)

        for ac in activities:
            d_key = ac.logged_at.date().isoformat()
            if d_key in daily_series:
                daily_series[d_key]["activity_minutes"] += ac.duration_minutes
            if ac.logged_at.date() == today:
                today_totals["activity_minutes"] += ac.duration_minutes

        ed_completed = db.scalars(
            select(FoodEducationProgress).where(
                FoodEducationProgress.user_id == current_user.id,
                FoodEducationProgress.profile_id == profile_id,
                FoodEducationProgress.completed == True,  # noqa: E712
            )
        ).all()

        return {
            "profile_id": profile_id,
            "period_days": days,
            "today_totals": today_totals,
            "cuisine_breakdown": {
                "indian_meals": indian_count,
                "japanese_meals": japanese_count,
                "other_balanced_meals": global_other_count,
            },
            "meal_diversity_count": len(distinct_meals),
            "education_completed_count": len(ed_completed),
            "education_total_topics": len(SEED_EDUCATION_TOPICS),
            "weekly_trends": [
                {"date": d, **vals} for d, vals in sorted(daily_series.items())
            ],
            "insights_note": (
                "Metrics are computed strictly from your real PostgreSQL food, hydration, and activity logs."
                if foods
                else "No food entries logged in this timeframe yet. Add Indian or Japanese meals to see live trends."
            ),
        }

    app.include_router(router)
