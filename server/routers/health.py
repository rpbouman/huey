"""
Health check endpoints for QueryService.

- /health/liveness: basic "up" check for process and load balancers.
- /health/readiness: readiness for traffic (engine/S3 checks added in later issues).
"""

from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/liveness")
def liveness() -> dict:
    """Basic liveness: process is running."""
    return {"status": "ok"}


@router.get("/readiness")
def readiness() -> dict:
    """Readiness: service is ready to accept traffic. Engine/S3 checks TBD in later issues."""
    return {"status": "ok"}
