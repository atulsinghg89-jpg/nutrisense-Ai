# NutriSense AI

Smart nutrition analysis, personalized lifestyle tracking, cultural dietary intelligence, and interactive wellness education built with React 19, TypeScript, FastAPI, SQLAlchemy, PostgreSQL, and Google Gemini Vision.

---

## Core Modules

- **AI Food Scanner & Live Portion Sliders**: Upload or capture meal photos for server-side analysis powered by Google Gemini Vision paired with **ICMR-NIN IFCT 2017**, **USDA FoodData Central**, and **Japan MEXT** food composition tables (`#scanner`).
- **Personalized Multi-Profile Dashboard & Cookie Auth**: Argon2id password hashing and `nutrisense_session` HttpOnly cookies supporting family profiles across **Men's Health**, **Women's Wellness**, **Babies & Children's Nutrition**, and **Patient Nutrition**, with nutrition, hydration, and activity logs (`#dashboard`).
- **NutriSense Run (Dual-World Interactive Health Arcade)** (`#game`):
  - **3-Lane Endless Track** (`runner_3lane`) and optional **Bob Run Platform World** (`platform_bob`) connected through in-run Dimension Portal Gates.
  - Educational **Facts, Winter Skincare & Hydration Hacks**, and **4-option Wellness Quizzes** paired with transparent [ProductSuggestion](frontend/src/components/game/ProductSuggestion.tsx) listings across budget tiers.
  - **5 km & 10 km Real-World Checkpoints**: Before/after water glass photos (with optional Hydration Tracker sync) and nutritious meal photo upload/AI scan required to unlock higher levels.
  - **Optional Cosmetics & Server-Verified Purchase Rewards**: Client `GameSave` v2 with safe migration from `nutrisense_game_v1`, offline-safe local storage handling, strict separation between Demo Mode presentation rewards (`OFF` by default) and server-confirmed diamonds.
- **Women's Wellness & Period Care Sanctuary** (`#women` / `#womens-wellness`): Cycle calendar, symptom/mood tracking, consent audit history, youth-aware CDC percentile / adult screening BMI estimation, restorative yoga & hydration guidance, and curated catalog/provider directories.
- **Global & Japanese Nutrition Intelligence** (`#global-nutrition`): Food Balance Spinning Guide, India vs. Japan dish comparisons, MEXT reference explorer, customized Bento meal builder, and seasonal food finder.
- **Educational Nutrition Modules** (`#men`, `#baby`, `#patient`, `#categories`): Structured life-stage and chronic-care food literacy modules with safety notices, public-health references, and interactive clinic-visit question checklists.
- **Food Alternatives, Meal Planner, Budget Plans & Grocery Checklist** (`#alternatives`, `#planner`, `#indian-foods`, `#budget`, `#grocery`, `#recommended-products`).

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS 4, Framer Motion, Lucide React (`nutrisense-Ai/frontend`)
- **Backend**: Python, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL (`psycopg2-binary`), Argon2id (`argon2-cffi`), Google GenAI SDK (`nutrisense-Ai/backend`)

---

## Local Development Setup

### 1. Backend (FastAPI on `http://127.0.0.1:8000`)

1. Navigate to `nutrisense-Ai/backend` and configure `backend/.env` (never commit `.env`):
   ```env
   DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
   GEMINI_API_KEY=your_gemini_api_key
   ```
   Optional reward & security environment variables (rewards feature flag is **OFF** by default):
   ```env
   AFFILIATE_REWARDS_ENABLED=false
   AFFILIATE_POSTBACK_SECRET=your_hmac_sha256_secret
   REWARD_COINS_PER_PURCHASE=50
   REWARD_DIAMONDS_PER_PURCHASE=1
   REWARD_DAILY_DIAMOND_CAP=3
   AFFILIATE_POSTBACK_TOLERANCE_SECONDS=300
   ```
2. Install dependencies into `backend/.venv` and run database migrations after taking a backup:
   ```powershell
   cd nutrisense-Ai\backend
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   .\.venv\Scripts\python.exe backup_db.py
   .\.venv\Scripts\alembic.exe upgrade head
   ```
3. Start the API server:
   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
4. Verify API health at `http://127.0.0.1:8000/health`.

### 2. Frontend (Vite on `http://127.0.0.1:5173`)

```powershell
cd nutrisense-Ai\frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173/` (or jump directly to `http://127.0.0.1:5173/#game` for **NutriSense Run**).

---

## Testing & Verification

### Frontend Typecheck & Production Build
```powershell
cd nutrisense-Ai\frontend
npm run typecheck
npm run build
```

### Backend Isolated Test Suite (SQLite + Reversible Alembic `0004_reward_events`)
```powershell
nutrisense-Ai\backend\.venv\Scripts\python.exe nutrisense-Ai\backend\tests\test_rewards.py
```
Covers feature-flag gating, isolated Alembic upgrade/downgrade (`0003_global_nutrition <-> 0004_reward_events`), HMAC-SHA256 signature & replay tolerance enforcement, server-side reward amounts & daily diamond caps, order reversal, cross-user isolation, under-18 / baby / patient / non-affiliate exclusions, and rate limiting.

---

## Medical & Safety Notice

NutriSense AI provides informational food analysis and general wellness education only. It is not a medical device and does not replace advice, diagnosis, or individualized care plans from a physician, pediatrician, or registered dietitian.
