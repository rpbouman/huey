# QueryService

Huey OLAP query service backend (Python, FastAPI, DuckDB). Serves health checks and will expose schema and query APIs per the [tech spec](../docs/huey-large-scale-olap-tech-spec.md).

## Setup

From the repo root:

```bash
python3 -m venv .venv-server
. .venv-server/bin/activate  # or .venv-server\Scripts\activate on Windows
pip install -r server/requirements.txt
```

## Run

From the repo root (so `server` is the package):

```bash
. .venv-server/bin/activate
uvicorn server.main:app --host 0.0.0.0 --port 8000
```

Or:

```bash
PYTHONPATH=. python -m server.main
```

## Health

- `GET /health/liveness` – process is up
- `GET /health/readiness` – ready for traffic (engine/S3 checks added in later issues)

## Tests

From the repo root:

```bash
. .venv-server/bin/activate
PYTHONPATH=. python -m pytest server/tests -v
```

## Config

Environment variables (optional, prefix `QUERYSERVICE_`):

- `QUERYSERVICE_HOST` (default `0.0.0.0`)
- `QUERYSERVICE_PORT` (default `8000`)
- `QUERYSERVICE_LOG_LEVEL` (default `INFO`)

Optional `.env` in the working directory is also loaded.
