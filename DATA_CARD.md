# Data card

The site shows Luxembourg’s trade in **goods**, in current euros, from Eurostat’s public data. It
holds the aggregates Eurostat publishes, without their status flags (provisional, estimated), and no
personal or confidential data.

## Coverage

| | Shipped snapshot (`site/data/meta.json`) |
|---|---|
| Eurostat release | 15 September 2026 |
| Years | 1999 to 2025, the last complete year |
| Months in the files | December 2023 to June 2026; the Seasonality tab reads every month since January 1999 live |
| Population (demo_pjan) | 1999 to 2025, release of 25 September 2026 |

## Sources

| Source | Use | Licence |
|---|---|---|
| [Eurostat Comext DS-045409](https://ec.europa.eu/eurostat/databrowser/view/ds-045409/legacyMultiFreq/table?category=ext_go.ext_go_detail) | Imports and exports of Luxembourg and EU countries, annual and monthly, by partner country and product (HS2, HS4, HS6, CN8), in euros and weight | Reuse authorised with source acknowledgement |
| [Eurostat demo_pjan](https://ec.europa.eu/eurostat/databrowser/view/demo_pjan/default/table) | Population on 1 January, for per-inhabitant comparisons | Reuse authorised with source acknowledgement |
| Labels of Comext DS-045409 | Official product and country labels in French, English and German, read from the dataset’s responses in each language (`server/views.py`) | Reuse authorised with source acknowledgement |
| [Natural Earth, Admin 0 Countries 1:50m, v5.1.2](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/) | Country outlines for the maps, simplified to 0.04° and without the smallest islands in `site/data/world.json` | Public domain |
| `server/lexicon.json` | Everyday product names and search words (“café”, “Wäin”…) | Written for the project, EUPL-1.2 |
| `site/assets/milestones.js` | Short notes on the key events shown on charts, each linked to its source: STATEC (*Note de conjoncture*, *Conjoncture flash*), the European Central Bank and Eurostat | Written for the project, EUPL-1.2; the linked publications keep their own terms |

[Eurostat’s copyright notice](https://ec.europa.eu/eurostat/help/copyright-notice) allows reuse of
statistics and metadata, for commercial or non-commercial purposes, as long as the reuser cites the
source (Decision 2011/833/EU). The site cites it under every chart (“Source: Eurostat, Comext
(DS-045409), data published on…”) and in every REST API and MCP response.

The Natural Earth outlines are for display and imply no official position on borders.

## Data pipeline

The server reads all figures from Eurostat’s public API and needs no archive.

- The server computes the site’s files (`server/views.py`) once per Eurostat release and caches
  them. It recomputes them sooner when a new version of the code changes their format. The browser
  queries the API through the server’s relay for what the server cannot compute in advance: the
  partner detail of another year, an 8-digit code, another reporting country, monthly series since
  1999 for the Seasonality tab.
- `overview.json` holds each product chapter’s yearly series, so rankings and changes by chapter
  work for any year from 1999.
- `site/data/` holds a snapshot from the same code. The server uses it on first start, and the
  static version of the site reads it. The shipped snapshot covers the Eurostat release of
  15 September 2026 and dates from 15 October 2026 (`site/data/meta.json`).
- To recompute it: `.venv/bin/python server/views.py --write site/data`.

## Reading limits

- Goods only: services, which matter most for Luxembourg, are not in Comext.
- Current euros, with no inflation adjustment. The Seasonality tab compares each month with its
  year’s monthly average by default, which removes growth and price changes between years; it does
  not adjust for working days.
- For purchases within the EU, the partner is the country of dispatch, which can differ from the
  country of origin.
- Series start in 1999; before that, Belgium and Luxembourg reported together.
- The site never turns a missing value into zero. A balance requires both imports and exports;
  a 12-month comparison requires all 24 monthly observations. Months after the last complete year are
  provisional.
- The product breakdown of trade with each partner country exists for the latest year only; other
  years show the country totals.
- “Unspecified countries” codes (statistical confidentiality) are not countries: the site leaves
  them out of maps and rankings and keeps their share visible.
- Per inhabitant, Luxembourg looks bigger than it is: nearly half of its employees live in a
  neighbouring country.
