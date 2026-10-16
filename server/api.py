from __future__ import annotations

from starlette.concurrency import run_in_threadpool
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Route

import trade_core
from eurostat import Relay, RelayError

LANGS = {"fr", "en", "de"}
RESPONSE_CACHE = "public, max-age=3600"
RELAY_CACHE = "public, max-age=3600, stale-while-revalidate=86400"
NO_STORE = {"Cache-Control": "no-store"}


def if_none_match_hits(header: str | None, etag: str) -> bool:
    if not header:
        return False
    tags = [tag.strip().removeprefix("W/") for tag in header.split(",")]
    return "*" in tags or etag in tags


def _lang_param(request: Request) -> str:
    lang = request.query_params.get("lang", "fr").lower()
    if lang not in LANGS:
        raise RelayError(400, "lang doit valoir fr, en ou de")
    return lang


def _int_param(request: Request, name: str, default: int, low: int, high: int) -> int:
    raw = request.query_params.get(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        raise RelayError(400, f"{name} must be an integer") from None
    return max(low, min(high, value))


def _json_response(payload, status: int = 200) -> JSONResponse:
    if isinstance(payload, dict) and payload.get("error") and status == 200:
        status = 404
    headers = {"Cache-Control": RESPONSE_CACHE} if status == 200 else NO_STORE
    return JSONResponse(payload, status_code=status, headers=headers)


def _endpoints(base_url: str) -> list[dict]:
    return [
        {"path": "/api/v1/overview", "params": "lang", "example": f"{base_url}/api/v1/overview?lang=fr"},
        {"path": "/api/v1/search", "params": "q, lang, limit", "example": f"{base_url}/api/v1/search?q=caf%C3%A9"},
        {"path": "/api/v1/products/{code}", "params": "flow=imports|exports, lang, top", "example": f"{base_url}/api/v1/products/2204?flow=imports"},
        {"path": "/api/v1/countries/{country}", "params": "lang, top", "example": f"{base_url}/api/v1/countries/FR"},
        {"path": "/api/v1/changes", "params": "flow, lang, limit", "example": f"{base_url}/api/v1/changes?flow=exports"},
        {"path": "/api/v1/terms/{term}", "params": "lang", "example": f"{base_url}/api/v1/terms/expedition"},
        {"path": "/api/v1/eurostat", "params": "product, partner, flow, time | sinceTimePeriod, freq, lang, reporter",
         "example": f"{base_url}/api/v1/eurostat?product=22041011&flow=1&time=2025",
         "note": "Cached JSON-stat relay to Eurostat. The reporter defaults to LU; other EU reporters are accepted "
                 "when partner is set, for example reporter=BE&reporter=LU&partner=WORLD&product=TOTAL."},
    ]


def routes(relay: Relay, base_url: str, within_eurostat_budget) -> list[Route]:
    async def index(request: Request) -> Response:
        return _json_response({
            "name": "Luxembourg and the world API",
            "description": "Luxembourg's trade in goods (Eurostat Comext DS-045409) as JSON. Read-only, no key.",
            "source": trade_core.source_citation(),
            "mcp": f"{base_url}/mcp",
            "endpoints": _endpoints(base_url),
        })

    async def overview(request: Request) -> Response:
        return _json_response(trade_core.overview(_lang_param(request)))

    async def search(request: Request) -> Response:
        query = request.query_params.get("q", "").strip()
        if not query:
            raise RelayError(400, "parameter q is required")
        lang = _lang_param(request)
        limit = _int_param(request, "limit", 8, 1, 25)
        return _json_response({"query": query, "results": trade_core.search_products(query, lang, limit)})

    async def product(request: Request) -> Response:
        code = request.path_params["code"]
        flow = request.query_params.get("flow", "imports")
        lang, top = _lang_param(request), _int_param(request, "top", 10, 1, 50)
        try:
            payload = await run_in_threadpool(trade_core.product_trade, code, flow, lang, top, relay)
        except ValueError as error:
            raise RelayError(400, str(error)) from None
        return _json_response(payload, 400 if payload.get("error") == trade_core.INVALID_PRODUCT_CODE else 200)

    async def country(request: Request) -> Response:
        lang, top = _lang_param(request), _int_param(request, "top", 8, 1, 20)
        return _json_response(trade_core.country_trade(request.path_params["country"], lang, top))

    async def changes(request: Request) -> Response:
        flow = request.query_params.get("flow") or None
        try:
            payload = trade_core.whats_changing(flow, _lang_param(request), _int_param(request, "limit", 10, 1, 30))
        except ValueError as error:
            raise RelayError(400, str(error)) from None
        return _json_response(payload)

    async def term(request: Request) -> Response:
        return _json_response(trade_core.explain_term(request.path_params["term"], _lang_param(request)))

    async def eurostat(request: Request) -> Response:
        pairs = list(request.query_params.multi_items())
        cached = await run_in_threadpool(relay.has_cached_copy, pairs)
        if not cached and not within_eurostat_budget(request):
            return JSONResponse({"error": "too many new Eurostat requests from this address; try again in a minute"},
                                status_code=429, headers={"Retry-After": "60", **NO_STORE})
        copy, origin, url = await run_in_threadpool(relay.fetch_entry, pairs)
        headers = {"Cache-Control": RELAY_CACHE, "ETag": copy.etag, "X-Relay-Cache": origin, "X-Upstream-Url": url}
        if copy.version:
            headers["X-Eurostat-Updated"] = copy.version
        if if_none_match_hits(request.headers.get("if-none-match"), copy.etag):
            return Response(status_code=304, headers=headers)
        return Response(copy.body, media_type="application/json", headers=headers)

    return [
        Route("/", index), Route("/overview", overview), Route("/search", search),
        Route("/products/{code}", product), Route("/countries/{country}", country),
        Route("/changes", changes), Route("/terms/{term}", term), Route("/eurostat", eurostat),
    ]


async def relay_error_response(request: Request, error: RelayError) -> Response:
    return JSONResponse({"error": error.message}, status_code=error.status, headers=NO_STORE)
