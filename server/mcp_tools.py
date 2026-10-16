from __future__ import annotations

from typing import Any, Literal

import anyio
from mcp.server.mcpserver import MCPServer
from mcp.types import ToolAnnotations

import trade_core

INSTRUCTIONS = """Official figures on Luxembourg's trade in goods (Eurostat Comext DS-045409).
Start with search_products to find a product code from everyday words, then call product_trade.
Always cite the returned source and year. Never infer causes from changes.
When useful, recall: goods only (no services), current euros, country of dispatch for intra-EU purchases."""

SEARCH_PRODUCTS = ("Find official product codes from everyday words (FR, EN, DE, Luxembourgish, Portuguese) or a code prefix. "
                   "Examples: \"café\", \"wine\", \"Wäin\", \"smartphone\", \"pneus\", \"2204\".")
PRODUCT_TRADE = ("Where a product Luxembourg buys comes from (imports) or where its sales go (exports). "
                 "Returns the latest full year total, partner shares, annual totals since 1999 and a plain sentence. "
                 "Reads 8-digit codes live from the Eurostat API (cached).")
COUNTRY_TRADE = "Luxembourg's purchases from and sales to one country (ISO code or name in FR/EN/DE): ranks, shares, top products."
LUXEMBOURG_OVERVIEW = "Luxembourg's total purchases and sales of goods, coverage ratio, main partners and product groups."
WHATS_CHANGING = "Largest changes over the last 12 complete months versus the 12 before, by product, with the partners involved."
EXPLAIN_TERM = "Plain-language explanation of a reading rule: services, expedition, euros, codes, secret, provisoire, avant1999."

READS_PUBLISHED_FILES = ToolAnnotations(readOnlyHint=True, idempotentHint=True, openWorldHint=False)
READS_EUROSTAT_LIVE = ToolAnnotations(readOnlyHint=True, idempotentHint=True, openWorldHint=True)
Lang = Literal["fr", "en", "de"]
Flow = Literal["imports", "exports"]


def _clamp(value: int, low: int, high: int) -> int:
    return max(low, min(value, high))


def build_server(relay=None, website: str | None = None) -> MCPServer:
    server = MCPServer(name="luxembourg-trade", title="Le Luxembourg et le monde", instructions=INSTRUCTIONS,
                       version="1.0.0", website_url=website)

    @server.tool(description=SEARCH_PRODUCTS, annotations=READS_PUBLISHED_FILES)
    def search_products(query: str, lang: Lang = "fr", limit: int = 8) -> list[dict[str, Any]]:
        return trade_core.search_products(query, lang, _clamp(limit, 1, 25))

    @server.tool(description=PRODUCT_TRADE, annotations=READS_EUROSTAT_LIVE)
    async def product_trade(code: str, flow: Flow = "imports", lang: Lang = "fr", top: int = 10) -> dict[str, Any]:
        return await anyio.to_thread.run_sync(lambda: trade_core.product_trade(code, flow, lang, _clamp(top, 1, 50), relay))

    @server.tool(description=COUNTRY_TRADE, annotations=READS_PUBLISHED_FILES)
    def country_trade(country: str, lang: Lang = "fr", top: int = 8) -> dict[str, Any]:
        return trade_core.country_trade(country, lang, _clamp(top, 1, 20))

    @server.tool(description=LUXEMBOURG_OVERVIEW, annotations=READS_PUBLISHED_FILES)
    def luxembourg_overview(lang: Lang = "fr") -> dict[str, Any]:
        return trade_core.overview(lang)

    @server.tool(description=WHATS_CHANGING, annotations=READS_PUBLISHED_FILES)
    def whats_changing(flow: Flow | None = None, lang: Lang = "fr", limit: int = 10) -> dict[str, Any]:
        return trade_core.whats_changing(flow, lang, _clamp(limit, 1, 30))

    @server.tool(description=EXPLAIN_TERM, annotations=READS_PUBLISHED_FILES)
    def explain_term(term: str, lang: Lang = "fr") -> dict[str, Any]:
        return trade_core.explain_term(term, lang)

    return server
