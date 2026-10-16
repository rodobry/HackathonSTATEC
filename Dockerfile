# syntax=docker/dockerfile:1.7

FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY LICENSE THIRD_PARTY_NOTICES.md ./
COPY server ./server
COPY site ./site

FROM base AS test
COPY tests ./tests
COPY tools/check_lexicon.py ./tools/check_lexicon.py
RUN python -m unittest discover -s tests -v && python tools/check_lexicon.py

FROM node:22-alpine AS jstest
WORKDIR /app
COPY site ./site
COPY tests/js ./tests/js
RUN node --test tests/js/site.test.mjs

FROM base AS runtime
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION} CACHE_DIR=/data/cache
RUN useradd --system --uid 10001 --home-dir /app app && mkdir -p /data/cache && chown app /data/cache
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status == 200 else 1)"
CMD ["uvicorn", "app:app", "--app-dir", "server", "--host", "0.0.0.0", "--port", "8000", \
     "--proxy-headers", "--no-server-header"]
