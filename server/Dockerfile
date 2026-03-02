# QueryService – Huey OLAP backend
# Build from repo root: docker build -f server/Dockerfile .

FROM python:3.12-slim

WORKDIR /app

# Copy only server package and deps for smaller layer
COPY server/requirements.txt server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

COPY server/ server/

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]
