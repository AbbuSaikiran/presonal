# Sybrai Backend

FastAPI + PostgreSQL + WebSocket + AI Detection backend for the Sybrai Cybersecurity Dashboard.

## Stack

| Layer | Technology |
|---|---|
| API framework | FastAPI 0.115 |
| ORM | SQLAlchemy 2.0 (async) |
| Database | PostgreSQL + asyncpg |
| Auth | JWT via python-jose + bcrypt |
| Migrations | Alembic |
| WebSocket | FastAPI native + custom ConnectionManager |
| ML Anomaly Detection | Scikit-Learn Isolation Forest (`sklearn.ensemble.IsolationForest`) |
| LLM Explainer | Anthropic Claude API (`anthropic` SDK) + local expert rule engine |
| Runtime | Uvicorn |

## Quick Start

### 1. Prerequisites

- Python 3.11+
- PostgreSQL running locally (default port 5432)
- A `sybrai` database: `createdb sybrai`

### 2. Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env:
# - DATABASE_URL
# - SECRET_KEY
# - ANTHROPIC_API_KEY (optional: enables Claude AI incident analysis)
```

### 4. Run migrations

```bash
alembic upgrade head
```

### 5. Seed the database

```bash
python scripts/seed.py
```

### 6. Start the server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 7. Test AI Detection & Explainer

```bash
python scripts/test_ai_detection.py
```

---

## AI Detection & Explainer API

### `POST /predict` (or `/api/detection/predict`)
Scores an incoming network or security telemetry event with the **Isolation Forest** anomaly model.
When the event's `anomaly_score >= 0.65` (or `auto_create_alert=true`), it automatically creates an alert record in the database and pushes it over the `/ws/alerts` WebSocket to all connected analyst dashboards in real time.

**Request Payload:**
```json
{
  "source": "185.220.101.57",
  "destination": "db-server-01",
  "source_port": 51234,
  "destination_port": 5432,
  "protocol": "TCP",
  "country_of_origin": "Russia",
  "type": "SQL Injection & Data Extraction",
  "packets_transferred": 25000,
  "bytes_transferred": 18500000,
  "attempt_count": 320,
  "mitre_tactic": "Initial Access",
  "auto_create_alert": true
}
```

**Response Payload:**
```json
{
  "anomaly_score": 0.88,
  "is_anomaly": true,
  "risk_level": "CRITICAL",
  "threshold": 0.65,
  "confidence_score": 90,
  "false_positive_rate": 0.03,
  "anomaly_factors": [
    "Excessive connection attempts (320 attempts in short window)",
    "High outbound/inbound volume (17.6 MB payload)",
    "Targeting sensitive infrastructure port 5432 (PostgreSQL)"
  ],
  "mitre_tactic": "Initial Access",
  "mitre_technique": "T1190 - Exploit Public-Facing Application",
  "alert_created": true,
  "alert_id": "ALT-8953",
  "alert": { ... }
}
```

---

### `POST /explain` (or `/api/detection/explain`)
Invokes Claude AI (or local SOC expert fallback) to translate complex telemetry anomalies into a plain-language executive incident summary, threat assessment, and prioritized remediation playbook.

**Request Payload:**
```json
{
  "alert_id": "ALT-8953"
}
```
*or provide raw event dictionary:*
```json
{
  "event": {
    "source": "185.220.101.57",
    "destination": "db-server-01",
    "type": "SQL Injection",
    "risk_level": "CRITICAL",
    ...
  }
}
```

**Response Payload:**
```json
{
  "incident_summary": "Sybrai AI detected a high-severity SQL Injection originating from 185.220.101.57...",
  "threat_assessment": "The activity represents an unauthorized attempt to access database infrastructure...",
  "recommended_actions": [
    "Block inbound traffic from source IP 185.220.101.57 at perimeter firewall.",
    "Isolate host db-server-01 temporarily to prevent lateral movement.",
    "Inspect database query logs for exfiltrated tables."
  ],
  "suggested_status": "INVESTIGATING",
  "model_used": "claude-3-5-sonnet-20241022",
  "raw_explanation": "..."
}
```

---

## API Reference

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Returns JWT + user object |
| GET | `/api/auth/me` | Bearer | Returns current user |

### Alerts

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/alerts` | Bearer | Paginated, filtered, sorted list |
| GET | `/api/alerts/{id}` | Bearer | Alert detail |
| PATCH | `/api/alerts/{id}/status` | Bearer (write) | Update status |

### AI Detection & Explainer

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/predict` | Optional | Score event via Isolation Forest & push alert |
| POST | `/explain` | Optional | Generate incident explanation via Claude AI |
| GET | `/api/detection/status` | None | Status of AI ML & LLM pipeline |

### Stats & Devices

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/stats` | Bearer | Dashboard KPI metrics |
| GET | `/api/stats/trend` | Bearer | 2-hour bucketed threat counts (24h) |
| GET | `/api/stats/top-sources` | Bearer | Top 5 threat source IPs |
| GET | `/api/devices` | Bearer | All monitored endpoints |

### WebSocket

```
ws://localhost:8000/ws/alerts?token=<jwt>
```
