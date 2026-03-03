# QueryService – Operational runbook

## Run the service

From repo root:

```bash
. .venv-server/bin/activate
uvicorn server.main:app --host 0.0.0.0 --port 8000
```

Or with Docker:

```bash
docker build -f server/Dockerfile -t query-service .
docker run -p 8000:8000 query-service
```

## Health checks

- **Liveness:** `GET /health/liveness` – process is up.
- **Readiness:** `GET /health/readiness` – ready for traffic (engine/S3 checks TBD).

Use these in load balancers and orchestrators.

## Logging

- Log level: set `QUERYSERVICE_LOG_LEVEL` (default `INFO`).
- Logs go to stdout (structured; timestamp, level, name, message).

## Config

- See `server/.env.example` and `server/README.md`.
- Key env: `QUERYSERVICE_HOST`, `QUERYSERVICE_PORT`, `QUERYSERVICE_DATASETS_CONFIG_PATH`, `QUERYSERVICE_S3_*`, `AWS_*` for S3.

## Common issues

| Symptom | Check |
|--------|--------|
| 404 Dataset not found | Dataset id in request must exist in `datasets_config/datasets.yaml` (or configured path). |
| 400 Invalid date_range | Send `date_range` with `type: "single", date: "YYYY-MM-DD"` or `type: "range", start, end`. |
| S3 read fails | Set `QUERYSERVICE_S3_BUCKET` and AWS credentials (env or IAM). |

## API docs

- Swagger: `GET /docs`
- ReDoc: `GET /redoc`
