from __future__ import annotations

import os
import threading
import time
from collections import defaultdict, deque
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit
from xml.etree import ElementTree

from mcp.server.transport_security import TransportSecuritySettings
from starlette.concurrency import run_in_threadpool
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.requests import Request
from starlette.responses import HTMLResponse, JSONResponse, Response
from starlette.routing import Mount, Route, get_route_path
from starlette.staticfiles import StaticFiles

import api
import trade_core
import views
from eurostat import Relay, RelayError, etag_of
from mcp_tools import build_server

SITE = Path(__file__).resolve().parents[1] / "site"
COMPRESS_FROM_BYTES = 1024
SNAPSHOT_DATA = (SITE / "data").resolve()
VERSION = os.environ.get("APP_VERSION", "dev")
PUBLIC_URL = os.environ.get("PUBLIC_URL", "http://localhost:8000").rstrip("/")
ALLOWED_HOSTS = [host.strip() for host in os.environ.get(
    "ALLOWED_HOSTS", "localhost:*,127.0.0.1:*").split(",") if host.strip()]
API_REQUESTS_PER_MINUTE = int(os.environ.get("RATE_LIMIT", "240"))
RELAY_REQUESTS_PER_MINUTE = int(os.environ.get("RELAY_REQUEST_LIMIT", "600"))
EUROSTAT_REQUESTS_PER_MINUTE = int(os.environ.get("RELAY_RATE_LIMIT", "30"))
CACHE_DIR = os.environ.get("CACHE_DIR") or None
MEGABYTE = 1024 * 1024
RATE_WINDOW_SECONDS = 60
IDLE_CLIENT_SWEEP_SECONDS = 300

CONTENT_SECURITY_POLICY = (
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; "
    "connect-src 'self' https://ec.europa.eu; font-src 'self'; object-src 'none'; base-uri 'self'; "
    "form-action 'self'; frame-ancestors *")
SECURITY_HEADERS = {
    b"x-content-type-options": b"nosniff",
    b"referrer-policy": b"strict-origin-when-cross-origin",
    b"permissions-policy": b"camera=(), microphone=(), geolocation=()",
    b"content-security-policy": CONTENT_SECURITY_POLICY.encode(),
}
HSTS_ONE_YEAR = b"max-age=31536000"
IMMUTABLE_CACHE = b"public, max-age=31536000, immutable"
DATA_CACHE = "public, max-age=300, stale-while-revalidate=86400"


def site_file_cache_control(path: str) -> str:
    if path.endswith(".html"):
        return "no-cache"
    if "/data/" in path or path.endswith(".xml"):
        return "public, max-age=3600"
    return "public, max-age=300"


class SiteFiles(StaticFiles):
    def file_response(self, full_path, stat_result, scope, status_code=200):
        response = super().file_response(full_path, stat_result, scope, status_code)
        response.headers["Cache-Control"] = site_file_cache_control(str(full_path))
        return response


def client_address(scope) -> str:
    # Uvicorn resolves forwarded addresses only from explicitly trusted proxies.
    return (scope.get("client") or ("unknown", 0))[0]


class RateLimiter:
    def __init__(self):
        self.hits: dict[tuple[str, str], deque] = defaultdict(deque)
        self.last_sweep = time.monotonic()
        self.lock = threading.Lock()

    def allow(self, client: str, bucket: str, limit: int) -> bool:
        now = time.monotonic()
        with self.lock:
            recent = self.hits[(client, bucket)]
            while recent and now - recent[0] > RATE_WINDOW_SECONDS:
                recent.popleft()
            if len(recent) >= limit:
                return False
            recent.append(now)
            if now - self.last_sweep > IDLE_CLIENT_SWEEP_SECONDS:
                self._forget_idle_clients(now)
            return True

    def _forget_idle_clients(self, now: float) -> None:
        for key in [key for key, recent in self.hits.items() if not recent or now - recent[-1] > RATE_WINDOW_SECONDS]:
            del self.hits[key]
        self.last_sweep = now


RATE_LIMITER = RateLimiter()


def within_eurostat_budget(request: Request) -> bool:
    return RATE_LIMITER.allow(client_address(request.scope), "eurostat", EUROSTAT_REQUESTS_PER_MINUTE)


def _over_rate_limit(scope) -> bool:
    path = scope.get("path", "")
    if path.startswith("/api/v1/eurostat"):
        bucket, limit = "relay", RELAY_REQUESTS_PER_MINUTE
    elif path.startswith("/api/") or path.startswith("/mcp"):
        bucket, limit = "api", API_REQUESTS_PER_MINUTE
    else:
        return False
    return not RATE_LIMITER.allow(client_address(scope), bucket, limit)


def security_headers() -> dict[bytes, bytes]:
    if PUBLIC_URL.startswith("https://"):
        return {**SECURITY_HEADERS, b"strict-transport-security": HSTS_ONE_YEAR}
    return SECURITY_HEADERS


def _adding_security_headers(send):
    async def send_with_security_headers(message):
        if message["type"] == "http.response.start":
            headers = list(message.get("headers", []))
            present = {name.lower() for name, _ in headers}
            headers.extend((name, value) for name, value in security_headers().items() if name not in present)
            message = {**message, "headers": headers}
        await send(message)

    return send_with_security_headers


class SecurityMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        send = _adding_security_headers(send)
        if _over_rate_limit(scope):
            response = JSONResponse({"error": "too many requests; try again in a minute"}, status_code=429,
                                    headers={"Retry-After": "60", "Cache-Control": "no-store"})
            return await response(scope, receive, send)
        await self.app(scope, receive, send)


def not_found() -> JSONResponse:
    return JSONResponse({"error": "introuvable"}, status_code=404)


def _marking_immutable(send):
    async def send_immutable(message):
        if message["type"] == "http.response.start" and message.get("status") == 200:
            headers = [(name, value) for name, value in message.get("headers", []) if name.lower() != b"cache-control"]
            headers.append((b"cache-control", IMMUTABLE_CACHE if VERSION != "dev" else b"no-cache"))
            message = {**message, "headers": headers}
        await send(message)

    return send_immutable


class VersionedAssets:
    def __init__(self, directory: Path):
        self.files = StaticFiles(directory=directory)

    async def __call__(self, scope, receive, send):
        version, _, asset_path = get_route_path(scope).lstrip("/").partition("/")
        if version != VERSION or not asset_path.startswith("assets/"):
            return await not_found()(scope, receive, send)
        await self.files({**scope, "path": "/" + asset_path, "root_path": ""}, receive, _marking_immutable(send))


def _with_versioned_assets(html: str) -> str:
    prefix = f"v/{VERSION}/assets/"
    return html.replace('href="assets/', f'href="{prefix}').replace('src="assets/', f'src="{prefix}')


VERSIONED_INDEX_HTML = _with_versioned_assets((SITE / "index.html").read_text(encoding="utf-8"))


async def index(request: Request) -> Response:
    page = VERSIONED_INDEX_HTML.replace(views.SNAPSHOT_PUBLIC_URL, PUBLIC_URL)
    return HTMLResponse(page, headers={"Cache-Control": "no-cache"})


relay = Relay(cache_dir=CACHE_DIR, memory_bytes=int(os.environ.get("CACHE_MEMORY_MB", "64")) * MEGABYTE,
              disk_bytes=int(os.environ.get("CACHE_DISK_MB", "500")) * MEGABYTE)


def _computed_files_store() -> views.ViewStore | None:
    if os.environ.get("VIEWS", "api") != "api":
        return None
    store = views.ViewStore(relay, Path(CACHE_DIR) / "views" if CACHE_DIR else None)
    trade_core.use_computed_files(store.get)
    return store


view_store = _computed_files_store()
mcp_server = build_server(relay, website=PUBLIC_URL)


async def _computed_file(name: str) -> bytes | None:
    return await run_in_threadpool(view_store.get, name) if view_store else None


def _cacheable_response(request: Request, body: bytes, media_type: str) -> Response:
    etag = etag_of(body)
    headers = {"Cache-Control": DATA_CACHE, "ETag": etag}
    if api.if_none_match_hits(request.headers.get("if-none-match"), etag):
        return Response(status_code=304, headers=headers)
    return Response(body, media_type=media_type, headers=headers)


async def data_file(request: Request) -> Response:
    name = request.path_params["name"]
    body = await _computed_file(name)
    if body is None:
        path = (SNAPSHOT_DATA / name).resolve()
        if SNAPSHOT_DATA not in path.parents or not path.is_file():
            return not_found()
        body = path.read_bytes()
    return _cacheable_response(request, body, "application/json")


async def feed(request: Request) -> Response:
    name = request.url.path.lstrip("/")
    body = await _computed_file(name)
    if body is None:
        path = SITE / name
        if not path.is_file():
            return not_found()
        body = path.read_bytes()
    # Feed readers need absolute links, including on a different deployment URL.
    document = ElementTree.fromstring(body)
    for link in document.iter("link"):
        if link.text:
            # Cached feeds can predate the switch to English URLs.
            path, separator, query = urlsplit(link.text).fragment.partition("?")
            if path.startswith("/produit/"):
                path = path.replace("/produit/", "/product/", 1)
            elif path == "/changements":
                path = "/changes"
            params = [("flow" if key == "flux" else key,
                       {"imp": "imports", "exp": "exports"}.get(value, value) if key in ("flux", "flow") else value)
                      for key, value in parse_qsl(query, keep_blank_values=True)]
            suffix = f"?{urlencode(params)}" if separator else ""
            link.text = f"{PUBLIC_URL}/index.html#{path}{suffix}"
    body = ElementTree.tostring(document, encoding="utf-8", xml_declaration=True)
    return _cacheable_response(request, body, "application/rss+xml")


async def health(request: Request) -> Response:
    if view_store:
        view_store.build_if_due()
    published = trade_core.meta()
    views_health = view_store.health() if view_store else None
    return JSONResponse({"status": "ok", "version": VERSION, "data_published": published["source_updated"],
                         "latest_year": published["latest_year"],
                         "data_source": views_health["source"] if views_health else "snapshot",
                         "views": views_health, "relay": relay.health()},
                        headers={"Cache-Control": "no-store"})


def create_app():
    app = mcp_server.streamable_http_app(
        streamable_http_path="/mcp", stateless_http=True, json_response=True,
        transport_security=TransportSecuritySettings(
            enable_dns_rebinding_protection=True, allowed_hosts=ALLOWED_HOSTS,
            allowed_origins=[PUBLIC_URL, "http://localhost:*", "http://127.0.0.1:*"]),
    )
    app.router.routes.extend([
        Route("/", index), Route("/index.html", index),
        Mount("/v", app=VersionedAssets(SITE)),
        Route("/health", health),
        Route("/data/{name:path}", data_file),
        Route("/feed.xml", feed), Route("/feed-en.xml", feed), Route("/feed-de.xml", feed),
        Mount("/api/v1", routes=api.routes(relay, PUBLIC_URL, within_eurostat_budget)),
        Mount("/", app=SiteFiles(directory=SITE, html=True), name="site"),
    ])
    app.add_exception_handler(RelayError, api.relay_error_response)
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"],
                       expose_headers=["X-Relay-Cache", "X-Eurostat-Updated", "ETag"], max_age=86400)
    app.add_middleware(SecurityMiddleware)
    app.add_middleware(GZipMiddleware, minimum_size=COMPRESS_FROM_BYTES)
    return app


app = create_app()
