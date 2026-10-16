# Luxembourg and the world

A website that shows Luxembourg’s trade in goods to a general audience, using Eurostat’s public
data (Comext DS-045409). It comes from the STATEC hackathon, runs in French, English and German,
and sets no cookies or trackers.

Demo: https://hackathon.rodolpheaubry.com

- **Home**: six charts to start with, including the products behind a yearly change.
- **Products** and **Countries**: where purchases come from and where sales go since 1999, from
  2-digit chapters down to 8-digit codes, with maps, rankings, trends, tables, a monthly
  seasonality heatmap and the products behind a yearly change.
- **Year and period**: every page with a chart lets you pick the year, and trend charts a period
  (“from 2005 to 2015”). Rankings, maps and change bars show the last year of the period; trends
  show the whole period. The choice goes into the URL (`year`, `from`).
- **Seasonality**: on product and country pages, one square per month and year since 1999, read
  live from Eurostat. By default each month is compared with its year’s monthly average, which
  removes growth and price changes between years; “Amounts” shows the raw euros.
- **Key events**: a button adds markers to yearly charts for the main crises since 1999
  (2008–2009, 2020, 2022, plus oil in 2014–2016 and US tariffs in 2025 where they matter), with
  sourced notes. They start hidden; the button shows or hides them for the current visit.
  **Understand** lists them as a timeline, including the 2010–2013 euro area debt crisis, which
  has no chart marker. The texts live in `site/assets/milestones.js`.
- **Compare**: Luxembourg against the other 26 EU countries, per inhabitant (the default), in euros,
  or, once a product is picked, as a share of each country’s trade.
- **What’s changing**: the last 12 months against the previous 12, with an RSS feed.
- **Quiz**, **Understand**, **About**, **Accessibility** and a search in everyday words (“café”,
  “Wäin”, “combien de thé vient d’Inde en 2024 ?”), answered without AI.

Each chart title states its answer in one sentence. You can download any chart as CSV, share a link
to it or embed it in another page (`#/embed/...`) with the buttons under it. Shared links show a
preview image (`site/assets/share.png`).

URLs use English paths and filters in all three languages, for example
`#/product/2204?flow=exports&view=trend&lang=en` and `#/countries?lang=fr`.
Older French URLs still open the same page and filters, then update to the English URL.

## Run

The data come from the Eurostat API, which needs Internet access but no key.

With Docker:

```bash
docker compose up --build
```

With Python 3.12:

```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/uvicorn app:app --app-dir server --port 8000
```

Then open http://localhost:8000. On first start the server spends about 8 minutes computing the data
from the API and serves the snapshot in `site/data` until it finishes.

The site alone also works on static hosting, with the snapshot and direct calls to Eurostat:
`python3 -m http.server --directory site`.

## Test

```bash
.venv/bin/python -m unittest discover -s tests
node --test tests/js/site.test.mjs
.venv/bin/python tools/check_lexicon.py
```

## REST API and MCP server

The server exposes a read-only JSON API (`/api/v1`, documented on the `#/api` page) and an MCP
server (`/mcp`) with six tools: `search_products`, `product_trade`, `country_trade`,
`luxembourg_overview`, `whats_changing`, `explain_term`. Every response cites its source.

```bash
claude mcp add --transport http luxembourg-trade http://localhost:8000/mcp
```

Over stdio: `.venv/bin/python server/server.py`. It answers from the snapshot in `site/data` and
fetches from Eurostat only the codes the snapshot lacks.

## How it works

- `server/views.py` computes the site’s files from the Eurostat API once per Eurostat release and
  caches them.
- `server/eurostat.py` relays requests to Eurostat with a memory and disk cache. Identical
  concurrent requests share one upstream call, and the relay serves a stale copy while it refreshes.
- The browser calls the relay for what the server cannot compute in advance: another year,
  an 8-digit code, another reporting country.

| Variable | Default | Purpose |
|---|---|---|
| `PUBLIC_URL` | `http://localhost:8000` | Public address of the site, used in RSS links and the share preview; an `https://` address also turns on HSTS |
| `APP_VERSION` | `dev` | Release number in the asset path `/v/<version>/assets/`; any value other than `dev` makes assets cacheable for a year |
| `ALLOWED_HOSTS` | `localhost:*,127.0.0.1:*` | Host names accepted by `/mcp` |
| `CACHE_DIR` | none | Disk cache folder (`/data/cache` in the image) |
| `VIEWS` | `api` | `snapshot`: serve only the snapshot in `site/data` |
| `RATE_LIMIT` | `240` | API requests per minute per client |
| `RELAY_REQUEST_LIMIT`, `RELAY_RATE_LIMIT` | `600`, `30` | Relay requests per minute per client, and how many of them may reach Eurostat |
| `CACHE_MEMORY_MB`, `CACHE_DISK_MB` | `64`, `500` | Relay cache size |
| `FORWARDED_ALLOW_IPS` | `127.0.0.1` | Reverse proxy IP addresses or networks trusted to set the client address |

For a public server, set `PUBLIC_URL` to its HTTPS address and `ALLOWED_HOSTS` to its host name
(including a port if used). If it sits behind a reverse proxy, set `FORWARDED_ALLOW_IPS` to that
proxy's addresses or networks and have it replace the incoming `X-Forwarded-For` header.
The application ignores client-supplied forwarding headers when enforcing request limits.

`compose.yml` passes on only `PUBLIC_URL`, `ALLOWED_HOSTS` and `FORWARDED_ALLOW_IPS`; add the other
variables there to change them. `/health` reports the version, the data release and the state of the
computed files and the relay cache.

The server checks for a new Eurostat release even when visitors only read the precomputed data.
It keeps serving the previous publication during a rebuild. Computed files saved by an older version
of the code are rebuilt instead of served (`FILES_FORMAT` in `server/views.py`); the snapshot covers
the gap. After a failed rebuild it waits five
minutes before trying again. Monthly comparisons require all 24 observations; a missing month
never counts as zero. RSS links use `PUBLIC_URL` when served by the application. On static hosting,
the checked-in feeds link to the demo address; update their absolute links for another domain.

To regenerate the snapshot: `.venv/bin/python server/views.py --write site/data`. It also rewrites
`site/feed*.xml` and keeps its Eurostat cache in `.cache/eurostat`.

## Layout

```
site/          the website: HTML, CSS, dependency-free JavaScript modules, data snapshot
server/        the server: data, REST API, MCP, Eurostat relay
tests/         Python and JavaScript tests
tools/         icon generator and lexicon check
.gitea/        continuous integration and release
deploy/        static publishing on GitHub Pages
```

Release: pushing a `vX.Y.Z` tag runs `.gitea/workflows/release.yaml` (tests, Docker image, health
check, deployment over SSH). It expects the secrets `REGISTRY_PASSWORD`, `TOKEN`,
`HOMELAB_DEPLOY_SSH_KEY`, `DEPLOY_HOST` and `DEPLOY_USER`. For GitHub Pages, copy
`deploy/github-pages.yml` to `.github/workflows/`.

The Docker test target also checks the product lexicon. The runtime image includes the code
licence and third-party notices, runs as an unprivileged user, and writes only to its cache volume.

## Accessibility, data and licence

- Accessibility: internal RGAA 4.1.2 checks and remaining validation work in [ACCESSIBILITY.md](ACCESSIBILITY.md).
- Data: sources, licences and reading limits in [DATA_CARD.md](DATA_CARD.md). No personal or
  confidential data.
- Code: **EUPL-1.2** (`SPDX-License-Identifier: EUPL-1.2`), see [LICENSE](LICENSE). All dependencies
  are compatible, see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
