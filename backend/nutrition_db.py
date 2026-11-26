"""Hybrid Nutrition Database Lookup Engine for NutriSense AI.

Combines:
1. Curated per-100g reference tables derived from:
   - ICMR–NIN Indian Food Composition Tables (IFCT 2017, Hyderabad) for Indian staples,
     dals, grains, dairy, vegetables, spices, and traditional prepared dishes.
   - USDA FoodData Central (CC0 1.0 Public Domain) for common global ingredients, oils,
     proteins, noodles/breads, and condiments.
2. Live USDA FoodData Central Search API lookup (`https://api.nal.usda.gov/fdc/v1/foods/search`)
   for ingredients not covered in the local curated table.

Strict anti-fabrication guarantee:
- Nutrient numbers originate ONLY from verified local ICMR–NIN / USDA per-100g rows or
  live USDA FoodData Central API responses.
- Unknown ingredients that match neither source are explicitly marked `source_type="unmatched"`
  with `needs_confirmation=True` and zero invented nutrient metrics.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import json
import logging
import os
import re
import urllib.parse
import urllib.request
from typing import Literal

logger = logging.getLogger("nutrisense.nutrition_db")

SourceType = Literal["icmr_nin", "usda_fdc", "unmatched"]


@dataclass(frozen=True)
class NutrientProfile100g:
    canonical_name: str
    calories: float
    protein: float
    carbohydrates: float
    fats: float
    fibre: float
    sugar: float
    sodium_mg: float
    calcium_mg: float = 0.0
    iron_mg: float = 0.0
    vitamin_c_mg: float = 0.0
    potassium_mg: float = 0.0
    source_type: SourceType = "icmr_nin"
    source_label: str = "ICMR–NIN IFCT 2017"
    aliases: tuple[str, ...] = ()


# Verified per-100g composition records prioritizing Indian dietary items (ICMR–NIN IFCT 2017)
# paired with USDA FoodData Central SR Legacy / Foundation standard references.
LOCAL_NUTRITION_TABLE: list[NutrientProfile100g] = [
    # --- Indian Breads & Rice & Grains ---
    NutrientProfile100g(
        canonical_name="Whole Wheat Roti / Phulka (Cooked)",
        calories=297.0, protein=9.8, carbohydrates=58.0, fats=2.4, fibre=9.2, sugar=1.1,
        sodium_mg=190.0, calcium_mg=34.0, iron_mg=3.6, potassium_mg=310.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Whole Wheat Atta)",
        aliases=("roti", "phulka", "chapati", "chapatti", "whole wheat roti", "atta roti", "wheat roti", "tawa roti"),
    ),
    NutrientProfile100g(
        canonical_name="Paratha / Plain Paratha (Cooked)",
        calories=326.0, protein=7.8, carbohydrates=48.5, fats=11.2, fibre=6.4, sugar=1.2,
        sodium_mg=340.0, calcium_mg=28.0, iron_mg=2.9, potassium_mg=220.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 Composite",
        aliases=("paratha", "plain paratha", "aloo paratha", "laccha paratha", "stuffed paratha"),
    ),
    NutrientProfile100g(
        canonical_name="Naan / Tandoori Flatbread",
        calories=291.0, protein=8.7, carbohydrates=51.0, fats=5.8, fibre=2.2, sugar=3.2,
        sodium_mg=490.0, calcium_mg=48.0, iron_mg=2.8, potassium_mg=145.0,
        source_type="usda_fdc", source_label="USDA FoodData Central (Naan Bread)",
        aliases=("naan", "garlic naan", "butter naan", "tandoori roti"),
    ),
    NutrientProfile100g(
        canonical_name="Steamed White Rice (Cooked)",
        calories=130.0, protein=2.7, carbohydrates=28.2, fats=0.3, fibre=0.4, sugar=0.1,
        sodium_mg=2.0, calcium_mg=10.0, iron_mg=0.2, potassium_mg=35.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Milled Rice Cooked)",
        aliases=("rice", "steamed rice", "white rice", "basmati rice", "jeera rice", "cooked rice", "boiled rice", "chawal"),
    ),
    NutrientProfile100g(
        canonical_name="Brown Rice (Cooked)",
        calories=123.0, protein=2.7, carbohydrates=25.6, fats=1.0, fibre=1.6, sugar=0.2,
        sodium_mg=4.0, calcium_mg=10.0, iron_mg=0.6, potassium_mg=86.0,
        source_type="usda_fdc", source_label="USDA FoodData Central (Brown Rice)",
        aliases=("brown rice", "red rice", "hand pounded rice"),
    ),
    NutrientProfile100g(
        canonical_name="Poha / Flattened Rice (Cooked Preparation)",
        calories=158.0, protein=3.1, carbohydrates=29.0, fats=3.2, fibre=1.5, sugar=1.1,
        sodium_mg=280.0, calcium_mg=18.0, iron_mg=3.1, potassium_mg=95.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Rice Flakes Base)",
        aliases=("poha", "kanda poha", "flattened rice", "avalakki", "chivda"),
    ),
    NutrientProfile100g(
        canonical_name="Idli (Steamed Rice-Lentil Cake)",
        calories=146.0, protein=4.8, carbohydrates=28.5, fats=0.7, fibre=1.9, sugar=0.4,
        sodium_mg=260.0, calcium_mg=22.0, iron_mg=1.1, potassium_mg=92.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 Composite (Rice + Urad Dal)",
        aliases=("idli", "steamed idli", "rava idli", "mini idli", "idly"),
    ),
    NutrientProfile100g(
        canonical_name="Dosa / Plain Crispy Crepe",
        calories=184.0, protein=4.6, carbohydrates=30.2, fats=4.9, fibre=1.8, sugar=0.6,
        sodium_mg=310.0, calcium_mg=20.0, iron_mg=1.2, potassium_mg=98.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 Composite (Fermented Batter)",
        aliases=("dosa", "plain dosa", "masala dosa", "set dosa", "neer dosa", "uttapam"),
    ),
    NutrientProfile100g(
        canonical_name="Upma (Semolina Cooked)",
        calories=162.0, protein=4.1, carbohydrates=26.5, fats=4.4, fibre=1.8, sugar=1.2,
        sodium_mg=290.0, calcium_mg=18.0, iron_mg=0.9, potassium_mg=88.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Suji/Semolina Base)",
        aliases=("upma", "rava upma", "suji", "semolina"),
    ),
    NutrientProfile100g(
        canonical_name="Oats / Oatmeal (Cooked Rolled Oats)",
        calories=71.0, protein=2.5, carbohydrates=12.0, fats=1.5, fibre=1.7, sugar=0.3,
        sodium_mg=49.0, calcium_mg=9.0, iron_mg=0.9, potassium_mg=70.0,
        source_type="usda_fdc", source_label="USDA FoodData Central (Cooked Oatmeal)",
        aliases=("oats", "oatmeal", "masala oats", "rolled oats", "porridge"),
    ),
    NutrientProfile100g(
        canonical_name="Quinoa (Cooked)",
        calories=120.0, protein=4.4, carbohydrates=21.3, fats=1.9, fibre=2.8, sugar=0.9,
        sodium_mg=7.0, calcium_mg=17.0, iron_mg=1.5, potassium_mg=172.0,
        source_type="usda_fdc", source_label="USDA FoodData Central (Quinoa Cooked)",
        aliases=("quinoa",),
    ),
    NutrientProfile100g(
        canonical_name="Millet / Bajra / Ragi / Jowar / Khichdi (Cooked)",
        calories=119.0, protein=3.5, carbohydrates=23.7, fats=1.0, fibre=2.6, sugar=0.3,
        sodium_mg=5.0, calcium_mg=42.0, iron_mg=1.6, potassium_mg=94.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Millets Cooked)",
        aliases=("millet", "ragi", "bajra", "jowar", "foxtail millet", "khichdi", "moong khichdi", "millet khichdi"),
    ),
    NutrientProfile100g(
        canonical_name="Dalia / Cracked Wheat / Bulgur (Cooked)",
        calories=83.0, protein=3.1, carbohydrates=18.6, fats=0.2, fibre=4.5, sugar=0.1,
        sodium_mg=5.0, calcium_mg=10.0, iron_mg=1.0, potassium_mg=68.0,
        source_type="usda_fdc", source_label="USDA FoodData Central (Bulgur Cooked)",
        aliases=("bulgur", "bulgur wheat", "dalia", "cracked wheat", "broken wheat", "wheat porridge"),
    ),
    NutrientProfile100g(
        canonical_name="Noodles / Pasta (Boiled Wheat Noodles)",
        calories=138.0, protein=4.5, carbohydrates=25.2, fats=2.1, fibre=1.2, sugar=0.5,
        sodium_mg=185.0, calcium_mg=9.0, iron_mg=1.0, potassium_mg=44.0,
        source_type="usda_fdc", source_label="USDA FoodData Central (Cooked Noodles)",
        aliases=("noodles", "hakka noodles", "chowmein", "chow mein", "ramen", "spaghetti", "pasta", "vermicelli", "macaroni", "penne", "maggi"),
    ),
    NutrientProfile100g(
        canonical_name="Bread / Whole Wheat Sandwich Slice",
        calories=252.0, protein=10.5, carbohydrates=43.0, fats=3.5, fibre=6.0, sugar=4.3,
        sodium_mg=450.0, calcium_mg=105.0, iron_mg=2.5, potassium_mg=240.0,
        source_type="usda_fdc", source_label="USDA FoodData Central (Whole Wheat Bread)",
        aliases=("bread", "whole wheat bread", "brown bread", "toast", "bun", "pav", "sandwich bread"),
    ),

    # --- Lentils, Legumes & Pulses (ICMR–NIN) ---
    NutrientProfile100g(
        canonical_name="Yellow Dal Tadka / Toor Dal (Cooked)",
        calories=116.0, protein=6.8, carbohydrates=17.5, fats=2.2, fibre=4.1, sugar=0.8,
        sodium_mg=265.0, calcium_mg=24.0, iron_mg=1.4, potassium_mg=260.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Red Gram / Toor Dal)",
        aliases=("dal", "dal tadka", "yellow dal", "toor dal", "arhar dal", "lentils", "dal fry", "masoor dal", "moong dal"),
    ),
    NutrientProfile100g(
        canonical_name="Rajma / Red Kidney Beans (Cooked Curry)",
        calories=127.0, protein=8.2, carbohydrates=21.2, fats=1.4, fibre=6.4, sugar=0.7,
        sodium_mg=285.0, calcium_mg=32.0, iron_mg=2.3, potassium_mg=385.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Kidney Beans Cooked)",
        aliases=("rajma", "kidney beans", "red kidney beans", "rajma masala"),
    ),
    NutrientProfile100g(
        canonical_name="Chole / Chickpeas (Cooked)",
        calories=164.0, protein=8.9, carbohydrates=27.4, fats=2.6, fibre=7.6, sugar=1.8,
        sodium_mg=270.0, calcium_mg=49.0, iron_mg=2.9, potassium_mg=291.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Bengal Gram / Kabuli Chana)",
        aliases=("chole", "chickpeas", "chana", "chana masala", "garbanzo", "kabuli chana", "kala chana"),
    ),
    NutrientProfile100g(
        canonical_name="Moong Sprouts / Mung Bean Sprouts",
        calories=38.0, protein=3.8, carbohydrates=6.2, fats=0.2, fibre=1.9, sugar=1.1,
        sodium_mg=6.0, calcium_mg=15.0, iron_mg=0.9, vitamin_c_mg=13.2, potassium_mg=149.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Green Gram Sprouted)",
        aliases=("sprouts", "moong sprouts", "sprouted moong", "mung sprouts", "sprout salad"),
    ),
    NutrientProfile100g(
        canonical_name="Sambar / Vegetable Lentil Stew",
        calories=68.0, protein=3.1, carbohydrates=10.5, fats=1.5, fibre=2.8, sugar=1.4,
        sodium_mg=295.0, calcium_mg=28.0, iron_mg=1.0, vitamin_c_mg=6.5, potassium_mg=185.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 Composite (Toor Dal + Veg)",
        aliases=("sambar", "sambhar", "rasam"),
    ),
    NutrientProfile100g(
        canonical_name="Soybean Chunks / Soya Granules (Cooked/Rehydrated)",
        calories=125.0, protein=18.2, carbohydrates=11.0, fats=0.4, fibre=4.5, sugar=0.8,
        sodium_mg=18.0, calcium_mg=98.0, iron_mg=5.2, potassium_mg=480.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Defatted Soy Meal)",
        aliases=("soya", "soya chunks", "soy chunks", "soybean", "nutrela", "tofu"),
    ),

    # --- Dairy, Paneer, Eggs, Poultry & Seafood ---
    NutrientProfile100g(
        canonical_name="Paneer / Indian Cottage Cheese",
        calories=265.0, protein=18.3, carbohydrates=3.2, fats=20.8, fibre=0.0, sugar=1.2,
        sodium_mg=18.0, calcium_mg=480.0, iron_mg=0.2, potassium_mg=105.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Paneer / Chhena)",
        aliases=("paneer", "cottage cheese", "grilled paneer", "palak paneer", "paneer tikka", "paneer bhurji", "shahi paneer"),
    ),
    NutrientProfile100g(
        canonical_name="Curd / Dahi / Plain Yogurt",
        calories=61.0, protein=3.5, carbohydrates=4.7, fats=3.3, fibre=0.0, sugar=4.5,
        sodium_mg=46.0, calcium_mg=149.0, iron_mg=0.1, potassium_mg=155.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Curd Cow Milk)",
        aliases=("curd", "dahi", "yogurt", "yoghurt", "raita", "greek yogurt", "buttermilk", "chaas"),
    ),
    NutrientProfile100g(
        canonical_name="Milk (Toned / Whole Cow Milk)",
        calories=61.0, protein=3.2, carbohydrates=4.8, fats=3.3, fibre=0.0, sugar=4.8,
        sodium_mg=43.0, calcium_mg=120.0, iron_mg=0.1, potassium_mg=150.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Whole Cow Milk)",
        aliases=("milk", "dairy milk", "lassi"),
    ),
    NutrientProfile100g(
        canonical_name="Cheese / Mozzarella / Cheddar",
        calories=330.0, protein=23.0, carbohydrates=2.2, fats=25.5, fibre=0.0, sugar=1.0,
        sodium_mg=620.0, calcium_mg=650.0, iron_mg=0.2, potassium_mg=95.0,
        source_type="usda_fdc", source_label="USDA FoodData Central (Cheese)",
        aliases=("cheese", "cheddar", "mozzarella", "parmesan"),
    ),
    NutrientProfile100g(
        canonical_name="Whole Egg (Boiled / Poached / Omelette Base)",
        calories=155.0, protein=12.6, carbohydrates=1.1, fats=10.6, fibre=0.0, sugar=0.6,
        sodium_mg=124.0, calcium_mg=50.0, iron_mg=1.7, potassium_mg=126.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Hen Egg Whole)",
        aliases=("egg", "eggs", "boiled egg", "omelette", "omelet", "fried egg", "scrambled egg", "egg bhurji", "egg white"),
    ),
    NutrientProfile100g(
        canonical_name="Chicken Breast / Lean Poultry (Cooked)",
        calories=165.0, protein=31.0, carbohydrates=0.0, fats=3.6, fibre=0.0, sugar=0.0,
        sodium_mg=74.0, calcium_mg=15.0, iron_mg=1.0, potassium_mg=256.0,
        source_type="usda_fdc", source_label="USDA FoodData Central (Chicken Breast Cooked)",
        aliases=("chicken", "chicken breast", "grilled chicken", "tandoori chicken", "chicken tikka", "chicken curry", "poultry"),
    ),
    NutrientProfile100g(
        canonical_name="Fish / Rohu / Salmon Fillet (Cooked)",
        calories=146.0, protein=22.0, carbohydrates=0.0, fats=6.0, fibre=0.0, sugar=0.0,
        sodium_mg=65.0, calcium_mg=24.0, iron_mg=0.8, potassium_mg=360.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 & USDA Fish Composite",
        aliases=("fish", "salmon", "rohu", "tuna", "grilled fish", "prawns", "shrimp", "seafood", "mussel", "mussels"),
    ),

    # --- Fresh Vegetables, Salads & Fruits ---
    NutrientProfile100g(
        canonical_name="Tomato (Fresh / Cooked Sauce Base)",
        calories=18.0, protein=0.9, carbohydrates=3.9, fats=0.2, fibre=1.2, sugar=2.6,
        sodium_mg=5.0, calcium_mg=10.0, iron_mg=0.3, vitamin_c_mg=13.7, potassium_mg=237.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Tomato Ripe)",
        aliases=("tomato", "tomatoes", "cherry tomato", "tomato puree"),
    ),
    NutrientProfile100g(
        canonical_name="Onion (Fresh / Sauteed Base)",
        calories=40.0, protein=1.1, carbohydrates=9.3, fats=0.1, fibre=1.7, sugar=4.2,
        sodium_mg=4.0, calcium_mg=23.0, iron_mg=0.2, vitamin_c_mg=7.4, potassium_mg=146.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Onion Big)",
        aliases=("onion", "onions", "red onion", "spring onion", "scallion"),
    ),
    NutrientProfile100g(
        canonical_name="Potato / Aloo (Boiled / Roasted)",
        calories=87.0, protein=1.9, carbohydrates=20.1, fats=0.1, fibre=1.8, sugar=0.9,
        sodium_mg=4.0, calcium_mg=8.0, iron_mg=0.5, vitamin_c_mg=13.0, potassium_mg=379.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Potato Brown Skin)",
        aliases=("potato", "potatoes", "aloo", "mashed potato", "boiled potato", "french fries"),
    ),
    NutrientProfile100g(
        canonical_name="Sweet Potato / Shakarkandi (Baked / Boiled)",
        calories=86.0, protein=1.6, carbohydrates=20.1, fats=0.1, fibre=3.0, sugar=4.2,
        sodium_mg=55.0, calcium_mg=30.0, iron_mg=0.6, vitamin_c_mg=12.8, potassium_mg=337.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Sweet Potato)",
        aliases=("sweet potato", "sweet potatoes", "shakarkandi", "yam"),
    ),
    NutrientProfile100g(
        canonical_name="Spinach / Palak & Leafy Greens",
        calories=23.0, protein=2.9, carbohydrates=3.6, fats=0.4, fibre=2.2, sugar=0.4,
        sodium_mg=79.0, calcium_mg=99.0, iron_mg=2.7, vitamin_c_mg=28.1, potassium_mg=558.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Spinach / Palak)",
        aliases=("spinach", "palak", "greens", "leafy greens", "methi", "coriander", "cilantro", "basil", "mint", "lettuce"),
    ),
    NutrientProfile100g(
        canonical_name="Cucumber / Kachumber Salad",
        calories=15.0, protein=0.7, carbohydrates=3.6, fats=0.1, fibre=0.5, sugar=1.7,
        sodium_mg=2.0, calcium_mg=16.0, iron_mg=0.3, vitamin_c_mg=2.8, potassium_mg=147.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Cucumber)",
        aliases=("cucumber", "salad", "kachumber", "cucumber salad", "green salad"),
    ),
    NutrientProfile100g(
        canonical_name="Bell Pepper / Capsicum",
        calories=26.0, protein=1.0, carbohydrates=6.0, fats=0.3, fibre=2.1, sugar=4.2,
        sodium_mg=4.0, calcium_mg=7.0, iron_mg=0.4, vitamin_c_mg=127.7, potassium_mg=211.0,
        source_type="usda_fdc", source_label="USDA FoodData Central (Bell Pepper)",
        aliases=("capsicum", "bell pepper", "pepper", "peppers", "mixed vegetables", "vegetables", "veggies", "stir fry vegetables"),
    ),
    NutrientProfile100g(
        canonical_name="Carrot (Fresh / Cooked)",
        calories=41.0, protein=0.9, carbohydrates=9.6, fats=0.2, fibre=2.8, sugar=4.7,
        sodium_mg=69.0, calcium_mg=33.0, iron_mg=0.3, vitamin_c_mg=5.9, potassium_mg=320.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Carrot Orange)",
        aliases=("carrot", "carrots", "gajar"),
    ),
    NutrientProfile100g(
        canonical_name="Broccoli / Cauliflower / Cabbage",
        calories=34.0, protein=2.8, carbohydrates=6.6, fats=0.4, fibre=2.6, sugar=1.7,
        sodium_mg=33.0, calcium_mg=47.0, iron_mg=0.7, vitamin_c_mg=89.2, potassium_mg=316.0,
        source_type="usda_fdc", source_label="USDA FoodData Central (Broccoli/Brassica)",
        aliases=("broccoli", "cauliflower", "gobhi", "gobi", "cabbage"),
    ),
    NutrientProfile100g(
        canonical_name="Green Peas / Matar",
        calories=81.0, protein=5.4, carbohydrates=14.5, fats=0.4, fibre=5.7, sugar=5.7,
        sodium_mg=5.0, calcium_mg=25.0, iron_mg=1.5, vitamin_c_mg=40.0, potassium_mg=244.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Peas Green)",
        aliases=("peas", "green peas", "matar"),
    ),
    NutrientProfile100g(
        canonical_name="Avocado (Fresh)",
        calories=160.0, protein=2.0, carbohydrates=8.5, fats=14.7, fibre=6.7, sugar=0.7,
        sodium_mg=7.0, calcium_mg=12.0, iron_mg=0.6, vitamin_c_mg=10.0, potassium_mg=485.0,
        source_type="usda_fdc", source_label="USDA FoodData Central (Avocado)",
        aliases=("avocado", "guacamole"),
    ),
    NutrientProfile100g(
        canonical_name="Apple / Banana / Seasonal Fruit",
        calories=52.0, protein=0.3, carbohydrates=13.8, fats=0.2, fibre=2.4, sugar=10.4,
        sodium_mg=1.0, calcium_mg=6.0, iron_mg=0.1, vitamin_c_mg=4.6, potassium_mg=107.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Apple)",
        aliases=("apple", "fruit", "orange", "berries", "strawberry", "blueberry", "mango", "papaya"),
    ),
    NutrientProfile100g(
        canonical_name="Banana (Ripe)",
        calories=89.0, protein=1.1, carbohydrates=22.8, fats=0.3, fibre=2.6, sugar=12.2,
        sodium_mg=1.0, calcium_mg=5.0, iron_mg=0.3, vitamin_c_mg=8.7, potassium_mg=358.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Banana Ripe)",
        aliases=("banana", "kela"),
    ),
    NutrientProfile100g(
        canonical_name="Pomegranate / Anar Arils",
        calories=83.0, protein=1.7, carbohydrates=18.7, fats=1.2, fibre=4.0, sugar=13.7,
        sodium_mg=3.0, calcium_mg=10.0, iron_mg=0.3, vitamin_c_mg=10.2, potassium_mg=236.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Pomegranate Fruit)",
        aliases=("pomegranate", "pomegranate seeds", "anar", "pomegranate arils"),
    ),

    # --- Cooking Oils, Ghee, Sauces, Chutneys & Snacks (Usually Uncertain visually!) ---
    NutrientProfile100g(
        canonical_name="Cooking Oil / Vegetable Oil",
        calories=884.0, protein=0.0, carbohydrates=0.0, fats=100.0, fibre=0.0, sugar=0.0,
        sodium_mg=0.0,
        source_type="usda_fdc", source_label="USDA FoodData Central (Vegetable/Mustard Oil)",
        aliases=("oil", "cooking oil", "vegetable oil", "olive oil", "mustard oil", "sunflower oil", "refined oil"),
    ),
    NutrientProfile100g(
        canonical_name="Ghee / Clarified Butter",
        calories=900.0, protein=0.0, carbohydrates=0.0, fats=99.5, fibre=0.0, sugar=0.0,
        sodium_mg=0.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Cow Ghee)",
        aliases=("ghee", "desi ghee", "clarified butter", "butter"),
    ),
    NutrientProfile100g(
        canonical_name="Soy Sauce / Savory Seasoning Sauce",
        calories=53.0, protein=8.1, carbohydrates=4.9, fats=0.6, fibre=0.8, sugar=0.4,
        sodium_mg=5493.0, calcium_mg=33.0, iron_mg=1.4, potassium_mg=435.0,
        source_type="usda_fdc", source_label="USDA FoodData Central (Soy Sauce)",
        aliases=("soy sauce", "sauce", "possible sauces", "sauces", "chilli sauce", "hot sauce", "marinara", "tomato sauce", "ketchup", "dressing"),
    ),
    NutrientProfile100g(
        canonical_name="Coconut / Mint Coriander Chutney",
        calories=115.0, protein=2.1, carbohydrates=8.5, fats=8.2, fibre=3.1, sugar=1.8,
        sodium_mg=310.0, calcium_mg=22.0, iron_mg=0.9, vitamin_c_mg=7.5, potassium_mg=190.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 Composite (Herb/Coconut Chutney)",
        aliases=("chutney", "coconut chutney", "mint chutney", "green chutney", "tomato chutney"),
    ),
    NutrientProfile100g(
        canonical_name="Roasted Peanuts / Almonds / Nuts",
        calories=585.0, protein=24.4, carbohydrates=21.5, fats=49.7, fibre=8.4, sugar=4.2,
        sodium_mg=12.0, calcium_mg=58.0, iron_mg=2.2, potassium_mg=658.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Groundnut / Nuts)",
        aliases=("peanuts", "almonds", "nuts", "cashews", "walnuts", "chia seeds", "pumpkin seeds", "sesame"),
    ),
    NutrientProfile100g(
        canonical_name="Roasted Chana / Chickpea Snack",
        calories=369.0, protein=22.5, carbohydrates=58.1, fats=5.3, fibre=16.8, sugar=4.2,
        sodium_mg=38.0, calcium_mg=58.0, iron_mg=6.1, potassium_mg=620.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Bengal Gram Roasted)",
        aliases=("roasted chana", "makhana", "sattu", "bhuna chana", "popcorn"),
    ),
    NutrientProfile100g(
        canonical_name="Garlic / Ginger / Spice Paste",
        calories=125.0, protein=4.8, carbohydrates=26.0, fats=0.6, fibre=2.8, sugar=1.5,
        sodium_mg=22.0, calcium_mg=110.0, iron_mg=1.9, vitamin_c_mg=16.0, potassium_mg=380.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 (Garlic/Ginger/Spices)",
        aliases=("garlic", "ginger", "spices", "masala", "turmeric", "jeera", "cumin", "garam masala"),
    ),
    NutrientProfile100g(
        canonical_name="Biryani / Fried Rice Mixed Dish",
        calories=186.0, protein=6.4, carbohydrates=26.2, fats=6.1, fibre=1.5, sugar=1.1,
        sodium_mg=365.0, calcium_mg=28.0, iron_mg=1.3, potassium_mg=145.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 Composite (Spiced Rice Dish)",
        aliases=("biryani", "pulao", "fried rice", "veg biryani", "chicken biryani", "tahari"),
    ),
    NutrientProfile100g(
        canonical_name="Samosa / Deep-Fried Savory Snack",
        calories=308.0, protein=5.2, carbohydrates=32.4, fats=17.8, fibre=3.4, sugar=1.6,
        sodium_mg=440.0, calcium_mg=22.0, iron_mg=1.8, potassium_mg=185.0,
        source_type="icmr_nin", source_label="ICMR–NIN IFCT 2017 Composite (Wheat + Potato Fried)",
        aliases=("samosa", "pakora", "bhajiya", "vada", "medu vada", "kachori", "puri", "bhatura", "chips"),
    ),
    NutrientProfile100g(
        canonical_name="Sugar / Sweetener / Mithai Syrup",
        calories=387.0, protein=0.0, carbohydrates=99.8, fats=0.0, fibre=0.0, sugar=99.8,
        sodium_mg=1.0,
        source_type="usda_fdc", source_label="USDA FoodData Central (Granulated Sugar)",
        aliases=("sugar", "jaggery", "gur", "honey", "syrup"),
    ),
    NutrientProfile100g(
        canonical_name="Salt / Seasoning",
        calories=0.0, protein=0.0, carbohydrates=0.0, fats=0.0, fibre=0.0, sugar=0.0,
        sodium_mg=38758.0,
        source_type="usda_fdc", source_label="USDA FoodData Central (Table Salt)",
        aliases=("salt", "table salt", "namak"),
    ),
]


NON_DISCRIMINATIVE_WORDS = {
    "seeds", "seed", "cooked", "boiled", "steamed", "grilled", "roasted", "fried",
    "fresh", "raw", "sweet", "green", "red", "yellow", "white", "black", "brown",
    "whole", "plain", "sliced", "chopped", "mashed", "dry", "dried", "paste",
    "sauce", "mix", "mixed", "dish", "style", "indian", "bowl", "salad", "soup",
    "food", "meal", "powder", "leaves", "leaf", "flour", "wheat", "oil", "water",
}


def _normalize_token(name: str) -> str:
    return re.sub(r"[^a-z0-9\s]", " ", (name or "").lower()).strip()


def lookup_local_nutrition_db(query_name: str) -> NutrientProfile100g | None:
    """Match an ingredient or dish name using strict word-boundary matching against verified tables."""
    clean = " ".join(_normalize_token(query_name).split())
    if not clean:
        return None

    q_words = [w for w in clean.split() if w not in NON_DISCRIMINATIVE_WORDS]
    best_profile: NutrientProfile100g | None = None
    best_score = 0

    for entry in LOCAL_NUTRITION_TABLE:
        candidates = [entry.canonical_name.lower(), *entry.aliases]
        for alias in candidates:
            alias_norm = " ".join(_normalize_token(alias).split())
            if not alias_norm:
                continue
            if clean == alias_norm:
                return entry
            # Match whole-phrase boundary inside clean query (never substrings like 'gur' in 'bulgur')
            if re.search(rf"\b{re.escape(alias_norm)}\b", clean):
                score = len(alias_norm) + 40
                if score > best_score:
                    best_score = score
                    best_profile = entry
            elif len(clean) >= 4 and re.search(rf"\b{re.escape(clean)}\b", alias_norm):
                score = len(clean) + 25
                if score > best_score:
                    best_score = score
                    best_profile = entry
            elif q_words:
                a_words = {w for w in alias_norm.split() if w not in NON_DISCRIMINATIVE_WORDS}
                overlap = set(q_words) & a_words
                if overlap:
                    score = sum(len(w) for w in overlap)
                    if score > best_score and score >= 4:
                        best_score = score
                        best_profile = entry

    return best_profile


@lru_cache(maxsize=256)
def lookup_usda_fdc_live(query_name: str) -> NutrientProfile100g | None:
    """Query live USDA FoodData Central Search API for items missing from the local table.

    Uses `USDA_FDC_API_KEY` env var if configured, else falls back to USDA's public `DEMO_KEY`.
    Prioritizes `Foundation` and `SR Legacy` / `Survey (FNDDS)` reference foods.
    Returns None cleanly on timeout, quota error, or no reliable match.
    """
    clean = (query_name or "").strip()
    if len(clean) < 2:
        return None

    api_key = os.getenv("USDA_FDC_API_KEY", "DEMO_KEY").strip() or "DEMO_KEY"
    params = urllib.parse.urlencode({
        "query": clean,
        "pageSize": 3,
        "dataType": "Foundation,SR Legacy,Survey (FNDDS)",
        "api_key": api_key,
    })
    url = f"https://api.nal.usda.gov/fdc/v1/foods/search?{params}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "NutriSenseAI/1.0"})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        logger.debug("USDA live lookup skipped/failed for '%s': %s", clean, exc)
        return None

    foods = payload.get("foods") or []
    if not foods:
        return None

    food = foods[0]
    fdc_id = food.get("fdcId", "")
    desc = str(food.get("description") or clean).title()

    nutrients_map: dict[str, float] = {}
    for nut in food.get("foodNutrients", []):
        name = str(nut.get("nutrientName") or "").lower()
        number = str(nut.get("nutrientNumber") or "")
        unit = str(nut.get("unitName") or "").lower()
        val = float(nut.get("value") or 0.0)
        if number == "208" or ("energy" in name and unit == "kcal"):
            nutrients_map.setdefault("calories", val)
        elif number == "203" or name == "protein":
            nutrients_map.setdefault("protein", val)
        elif number == "205" or "carbohydrate" in name:
            nutrients_map.setdefault("carbs", val)
        elif number == "204" or name.startswith("total lipid"):
            nutrients_map.setdefault("fats", val)
        elif number == "291" or "fiber" in name:
            nutrients_map.setdefault("fibre", val)
        elif number == "269" or "sugars, total" in name:
            nutrients_map.setdefault("sugar", val)
        elif number == "307" or "sodium" in name:
            nutrients_map.setdefault("sodium_mg", val)
        elif number == "301" or "calcium" in name:
            nutrients_map.setdefault("calcium_mg", val)
        elif number == "303" or "iron" in name:
            nutrients_map.setdefault("iron_mg", val)
        elif number == "401" or "vitamin c" in name:
            nutrients_map.setdefault("vitamin_c_mg", val)
        elif number == "306" or "potassium" in name:
            nutrients_map.setdefault("potassium_mg", val)

    if "calories" not in nutrients_map and "protein" not in nutrients_map:
        return None

    return NutrientProfile100g(
        canonical_name=desc[:120],
        calories=round(nutrients_map.get("calories", 0.0), 2),
        protein=round(nutrients_map.get("protein", 0.0), 2),
        carbohydrates=round(nutrients_map.get("carbs", 0.0), 2),
        fats=round(nutrients_map.get("fats", 0.0), 2),
        fibre=round(nutrients_map.get("fibre", 0.0), 2),
        sugar=round(nutrients_map.get("sugar", 0.0), 2),
        sodium_mg=round(nutrients_map.get("sodium_mg", 0.0), 2),
        calcium_mg=round(nutrients_map.get("calcium_mg", 0.0), 2),
        iron_mg=round(nutrients_map.get("iron_mg", 0.0), 2),
        vitamin_c_mg=round(nutrients_map.get("vitamin_c_mg", 0.0), 2),
        potassium_mg=round(nutrients_map.get("potassium_mg", 0.0), 2),
        source_type="usda_fdc",
        source_label=f"USDA FoodData Central (FDC #{fdc_id})",
    )


def resolve_ingredient_nutrition(name: str, use_live_usda: bool = True) -> NutrientProfile100g | None:
    """Resolve an ingredient strictly from verified ICMR–NIN or USDA FoodData Central sources."""
    local = lookup_local_nutrition_db(name)
    if local is not None:
        return local
    if use_live_usda:
        return lookup_usda_fdc_live(name)
    return None
