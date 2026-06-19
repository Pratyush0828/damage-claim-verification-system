# ClaimLens AI — Multi-Modal Damage Claim Verification

ClaimLens is a production-oriented reference system for assessing car, laptop, and package damage claims. It combines visual evidence, claimant narrative, conversation context, prior-claim behavior, and category-specific minimum evidence into an explainable decision.

The result includes:

- Valid, Suspicious, or Fraudulent verdict
- Fraud probability, trust score, and confidence
- Missing evidence list
- Visual, NLP, history, and evidence sub-scores
- Human-readable reasoning and decision signals

> This software provides decision support. Insurance denials or adverse actions should include appropriate human review, audit controls, and compliance checks.

## Architecture

```text
Browser (React + TypeScript + Tailwind)
        │ JWT + multipart claims
        ▼
FastAPI ── Auth / Claims / Image / NLP / Fraud APIs
   │
   ├── Vision adapter: OpenAI Vision → local PIL fallback
   ├── NLP analyzer: details, uncertainty, contradictions
   ├── History analyzer: frequency and duplicate similarity
   ├── Evidence validator: category-specific requirements
   └── Weighted explainable fraud ensemble
        │
        ├── PostgreSQL (SQLite for zero-config local use)
        └── AWS S3 (local uploads for zero-config local use)
```

## Repository structure

```text
backend/
  app/
    ai/                 Image and text analyzers
    api/                FastAPI route modules
    database/           Engine and sessions
    models/             SQLAlchemy entities
    schemas/            Pydantic request/response models
    services/           Auth, storage, evidence, history, scoring
    config.py
    main.py
  Dockerfile
  requirements.txt
  requirements-ai.txt
frontend/
  src/
    components/         Layout and Shadcn-style primitives
    pages/              Auth, dashboard, intake, result report
    services/           Typed API client
    types/
    App.tsx
  Dockerfile
  nginx.conf
docker-compose.yml
.env.example
```

## Quick start with Docker

1. Create your environment:

   ```bash
   cp .env.example .env
   ```

   On PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Replace `SECRET_KEY` in `.env`. Optionally add `OPENAI_API_KEY`.

3. Start the stack:

   ```bash
   docker compose up --build
   ```

4. Open:

   - Application: http://localhost:8080
   - API documentation: http://localhost:8000/docs
   - Health check: http://localhost:8000/health

PostgreSQL and uploaded evidence are stored in Docker volumes.

## Local development without Docker

### Backend

Python 3.11+ is recommended.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:DATABASE_URL="sqlite:///./claimlens.db"
$env:SECRET_KEY="local-development-secret"
uvicorn app.main:app --reload
```

The API runs at http://localhost:8000 and creates the local SQLite schema automatically.

### Frontend

Node.js 20+ is recommended.

```powershell
cd frontend
npm install
npm run dev
```

Vite runs at http://localhost:5173 and proxies `/api` and `/uploads` to FastAPI.

## AI modes

### Zero-config local mode

When `OPENAI_API_KEY` is empty, the image analyzer uses Pillow to measure exposure, resolution, contrast, edges, evidence filename hints, and a deterministic content fingerprint. The NLP module extracts incident details, damage terms, uncertainty language, contradictions, and duplicate-description signals. This makes the full workflow runnable offline.

### OpenAI Vision mode

Set:

```env
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-4.1-mini
```

Each image is sent through the OpenAI Responses API for structured visual inspection. If the provider is unavailable, the request falls back to local analysis so claim ingestion remains available.

### Optional CLIP / ResNet / Sentence Transformers

Install the larger ML environment:

```powershell
pip install -r requirements-ai.txt
```

Then set `ENABLE_LOCAL_ML=true`. The lazy local provider uses:

- CLIP (`openai/clip-vit-base-patch32`) for object/damage semantic alignment
- EfficientNet-B0 for compact visual feature embeddings
- Sentence Transformers (`all-MiniLM-L6-v2`) for normalized narrative embeddings

Models load only when this mode is enabled. Their first run downloads model weights. A production deployment should pin and pre-package artifacts, fine-tune the damage classifier on labeled insurance imagery, record exact model versions, and calibrate thresholds against representative claims.

## Evidence requirements

| Category | Required evidence |
|---|---|
| Car | Front image, rear image, damage close-up |
| Laptop | Full laptop image, damaged area image, serial number image |
| Package | Package image, shipping label image, damage image |

Requirements are available at `GET /evidence-requirements` and seeded into the database on startup.

## Fraud scoring

The trust score is:

```text
0.30 × image score
+ 0.25 × NLP consistency
+ 0.25 × user-history trust
+ 0.20 × evidence completeness
- contradiction and duplicate penalties
```

The fraud probability is `100 - trust score`.

- Below 38%: Valid
- 38% to below 70%: Suspicious
- 70% and above: Fraudulent

Weights and thresholds are centralized in `backend/app/services/fraud.py`. Production teams should calibrate them on representative, fairness-reviewed validation data.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Register and receive JWT |
| POST | `/auth/login` | Login and receive JWT |
| POST | `/claims/create` | Submit multipart claim and run verification |
| GET | `/claims` | List current user's claims |
| GET | `/claims/{id}` | Retrieve full verification report |
| POST | `/images/analyze` | Analyze a single evidence image |
| POST | `/nlp/analyze` | Analyze narrative and conversation |
| POST | `/fraud/check` | Run scoring from supplied component scores |
| GET | `/evidence-requirements` | Retrieve category evidence rules |

All claim and analysis endpoints require `Authorization: Bearer <token>`.

## S3 storage

Set the following values:

```env
STORAGE_BACKEND=s3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=your-private-bucket
```

For production, keep the bucket private and replace public object URLs with short-lived signed URLs or a controlled media endpoint.

## Step-by-step implementation guide

1. **Identity:** registration hashes passwords with Argon2; login issues a signed JWT.
2. **Claim intake:** the React form binds each upload to a required evidence slot and sends a multipart request.
3. **Storage:** FastAPI stores bytes locally or in S3 and records metadata in `ClaimImages`.
4. **Visual analysis:** each image is checked for object alignment, damage, severity, quality, evidence-slot match, and embedding.
5. **Narrative analysis:** description and conversation are combined to extract dates, times, places, damage terms, uncertainty, and contradictions.
6. **History analysis:** previous claims are checked for 90-day frequency, prior fraud outcomes, and duplicate-description overlap.
7. **Evidence validation:** submitted slots are compared with the category requirement set.
8. **Ensemble:** component scores and risk penalties produce fraud probability, confidence, verdict, and auditable signals.
9. **Persistence:** the final report, images, event history, and component insights are stored transactionally.
10. **Review:** the dashboard displays evidence, missing items, extracted insights, score composition, and the final verdict.

## Production hardening checklist

- Use Alembic-managed migrations instead of startup schema creation.
- Put secrets in a cloud secret manager and rotate JWT keys.
- Use private S3 objects, encryption, lifecycle rules, malware scanning, and signed access.
- Add MIME sniffing, image decompression-bomb limits, EXIF stripping, rate limits, and upload quotas.
- Run analysis asynchronously with a queue for large workloads.
- Add model monitoring, drift detection, threshold calibration, appeals, and human review.
- Record prompt/model versions and immutable audit events.
- Add refresh tokens or an external OIDC provider.
- Add unit, integration, adversarial-image, and browser E2E tests.
- Review privacy, retention, bias, insurance, and automated-decision regulations for the deployment region.
