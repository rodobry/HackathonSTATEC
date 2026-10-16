# Third-party notices

The project’s own code uses the **EUPL-1.2** licence (see [LICENSE](LICENSE)). The components below
keep their own licences. All are permissive except `certifi` (MPL-2.0), a weak copyleft licence
limited to modified files: the project uses it unmodified, and EUPL-1.2 lists MPL-2.0 among its
compatible licences.

## Data

- **Eurostat, Comext DS-045409 and demo_pjan**: reuse authorised with source acknowledgement
  ([Eurostat copyright notice](https://ec.europa.eu/eurostat/help/copyright-notice), Decision
  2011/833/EU). The site shows the source under every chart. Details in [DATA_CARD.md](DATA_CARD.md).
- **Natural Earth, Admin 0 Countries 1:50m (v5.1.2)**: public domain. Simplified geometries in
  `site/data/world.json`.

## Images

- `site/assets/favicon.svg`, `site/favicon.ico` and `site/apple-touch-icon.png` are the project’s own
  logo, EUPL-1.2.
- `site/assets/share.png`, the link preview, sets its text in **Inter** (SIL Open Font License 1.1,
  © The Inter Project Authors). The image holds rendered text only, no font file.

## Code shipped with the site

- **Lucide (lucide-static 0.460.0)**: icons, ISC licence. `tools/build_icons.js` copies the paths the
  site uses into `site/assets/icons.js`.

  > ISC License
  >
  > Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT).
  > All other copyright (c) for Lucide are held by Lucide Contributors 2022.
  >
  > Permission to use, copy, modify, and/or distribute this software for any purpose with or without
  > fee is hereby granted, provided that the above copyright notice and this permission notice
  > appear in all copies.
  >
  > THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS
  > SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE
  > AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
  > WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT,
  > NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE
  > OF THIS SOFTWARE.

  The Feather portions keep their MIT licence:

  > The MIT License (MIT)
  >
  > Copyright (c) 2013-2022 Cole Bemis
  >
  > Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
  > associated documentation files (the "Software"), to deal in the Software without restriction,
  > including without limitation the rights to use, copy, modify, merge, publish, distribute,
  > sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
  > furnished to do so, subject to the following conditions:
  >
  > The above copyright notice and this permission notice shall be included in all copies or
  > substantial portions of the Software.
  >
  > THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
  > NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  > NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
  > DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
  > OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Python dependencies of the server

pip installs them from PyPI through `requirements.txt`, which pins these versions; the repository
holds no copy.

| Licence | Packages |
|---|---|
| MIT | mcp 2.3.0, mcp-types 2.3.0, anyio 4.15.1, h11 0.16.0, attrs 26.1.0, jsonschema 4.26.0, jsonschema-specifications 2025.9.1, referencing 0.37.0, rpds-py 2026.9.1, pydantic 2.14.1, pydantic_core 2.50.1, annotated-types 0.8.0, typing-inspection 0.4.4, PyJWT 2.15.1, truststore 0.10.5 |
| BSD-3-Clause | starlette 1.8.0, uvicorn 0.54.0, sse-starlette 3.5.0, httpx 0.28.1, httpx2 2.13.1, httpcore 1.0.9, httpcore2 2.13.1, idna 3.20, click 8.5.0, pycparser 3.11 |
| MIT-0 | cffi 2.1.1 |
| Apache-2.0 or BSD-3-Clause | cryptography 50.0.2 |
| Apache-2.0 | opentelemetry-api 1.45.1, python-multipart 0.0.32 |
| PSF-2.0 | typing_extensions 4.16.0 |
| MPL-2.0 | certifi 2026.7.22 |
