"""
QueryService – Huey OLAP backend.

FastAPI application with health endpoints, config loader, and structured logging.
"""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI

from server.config import get_settings
from server.routers import health


# Configure logging before creating app
def _setup_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
        stream=sys.stdout,
    )


settings = get_settings()
_setup_logging(settings.log_level)
logger = logging.getLogger("query_service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("QueryService starting", extra={"host": settings.host, "port": settings.port})
    yield
    logger.info("QueryService shutting down")


app = FastAPI(
    title="QueryService",
    description="Huey OLAP query service for S3-backed parquet datasets",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(health.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server.main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
    )
