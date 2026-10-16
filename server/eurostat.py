from __future__ import annotations

import contextlib
import hashlib
import json
import math
import os
import re
import threading
import time
from collections import Counter, OrderedDict
from concurrent.futures import Future, ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlencode

import httpx

COMEXT_API = "https://ec.europa.eu/eurostat/api/comext/dissemination/statistics/1.0/data/DS-045409"
USER_AGENT = "Luxembourg trade explainer (STATEC hackathon)"
EU27 = ("AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT",
        "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK")
ACCEPTED_PARAMETERS = {
    "reporter": "|".join(EU27),
    "product": r"\d{2}|\d{4}|\d{6}|\d{8}|TOTAL",
    "partner": r"[A-Z]{2}|WORLD|EU27_2020_INTRA|EU27_2020_EXTRA",
    "flow": r"[12]",
    "time": r"\d{4}(-\d{2})?",
    "sinceTimePeriod": r"\d{4}(-\d{2})?",
    "freq": r"[AM]",
    "lang": r"EN|FR|DE",
    "indicators": r"VALUE_IN_EUROS|QUANTITY_IN_100KG",
}
MAX_VALUES_OF_REPEATABLE_PARAMETER = {"flow": 2, "time": 40, "partner": 12, "reporter": len(EU27)}
DEFAULT_PARAMETERS = {"freq": "A", "lang": "EN", "indicators": "VALUE_IN_EUROS"}
DEFAULT_REPORTER = "LU"
PUBLICATION_DATE_FIELD = re.compile(rb'"updated"\s*:\s*"([^"]+)"')

MEGABYTE = 1024 * 1024
HOUR = 3600
DAY = 24 * HOUR
MAX_COPY_AGE = 7 * DAY
COPY_TTL_WHILE_PUBLICATION_UNKNOWN = 6 * HOUR
OTHER_DATASET_COPY_TTL = 30 * DAY
REFUSAL_TTL = HOUR
UPSTREAM_TIMEOUT = 25.0
SHARED_DOWNLOAD_WAIT = UPSTREAM_TIMEOUT + 10
MAX_PARALLEL_UPSTREAM_REQUESTS = 4
MAX_TRACKED_URLS = 20_000
TRACKED_URLS_KEPT_WHEN_PRUNING = 10_000
MAX_REMEMBERED_REFUSALS = 1000
SAVED_POPULAR_URLS = 200
DISK_EVICTION_TARGET = 0.9
POPULAR_INDEX = "popular.idx"


class RelayError(Exception):
    def __init__(self, status: int, message: str, retry_later: bool = False):
        super().__init__(message)
        self.status = status
        self.message = message
        self.retry_later = retry_later


def validated_query(pairs) -> list[tuple[str, str]]:
    values = _distinct_values(pairs)
    _check_value_counts(values)
    _check_period(values)
    reporters = values.pop("reporter", [DEFAULT_REPORTER])
    if reporters != [DEFAULT_REPORTER] and "partner" not in values:
        raise RelayError(400, "for a reporter other than LU, set partner (for example WORLD)")
    for key, value in DEFAULT_PARAMETERS.items():
        values.setdefault(key, [value])
    query = [("format", "JSON")] + [("reporter", reporter) for reporter in sorted(reporters)]
    for key in sorted(values):
        query.extend((key, value) for value in sorted(values[key]))
    return query


def _distinct_values(pairs) -> dict[str, list[str]]:
    values: dict[str, list[str]] = {}
    for key, value in pairs:
        if key == "format":
            continue
        if key not in ACCEPTED_PARAMETERS:
            raise RelayError(400, f"unsupported parameter: {key}")
        value = str(value).strip()
        if not re.fullmatch(ACCEPTED_PARAMETERS[key], value):
            raise RelayError(400, f"invalid value for {key}: {value}")
        distinct = values.setdefault(key, [])
        if value not in distinct:
            distinct.append(value)
    return values


def _check_value_counts(values: dict[str, list[str]]) -> None:
    if len(values.get("product", [])) != 1:
        raise RelayError(400, "exactly one product parameter is required (a 2- to 8-digit code, or TOTAL)")
    for key, limit in MAX_VALUES_OF_REPEATABLE_PARAMETER.items():
        if len(values.get(key, [])) > limit:
            raise RelayError(400, f"too many values for {key} (maximum {limit})")
    for key, value in values.items():
        if key not in MAX_VALUES_OF_REPEATABLE_PARAMETER and len(value) > 1:
            raise RelayError(400, f"{key} accepts a single value")


def _check_period(values: dict[str, list[str]]) -> None:
    if "time" in values and "sinceTimePeriod" in values:
        raise RelayError(400, "time and sinceTimePeriod cannot be combined")
    if "time" not in values and "sinceTimePeriod" not in values:
        raise RelayError(400, "set time or sinceTimePeriod")


def etag_of(body: bytes) -> str:
    return '"' + hashlib.sha256(body).hexdigest()[:32] + '"'


def _cache_key(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:32]


def _publication_date_without_parsing(body: bytes) -> str | None:
    match = PUBLICATION_DATE_FIELD.search(body)
    return match.group(1).decode() if match else None


@dataclass
class CachedResponse:
    body: bytes
    fetched_at: float
    version: str | None
    etag: str

    @classmethod
    def of(cls, body: bytes, fetched_at: float, version: str | None = None) -> CachedResponse:
        if version is None:
            version = _publication_date_without_parsing(body)
        return cls(body, fetched_at, version, etag_of(body))


class Cube:
    def __init__(self, payload: dict):
        self.ids, self.size = payload["id"], payload["size"]
        self.updated = payload.get("updated")
        categories = {dimension: payload["dimension"][dimension]["category"] for dimension in self.ids}
        self.labels = {dimension: category.get("label", {}) for dimension, category in categories.items()}
        self.positions = {dimension: category["index"] for dimension, category in categories.items()}
        self.codes = {dimension: sorted(positions, key=positions.get) for dimension, positions in self.positions.items()}
        self.strides = [math.prod(self.size[k + 1:]) for k in range(len(self.ids))]
        self.values = payload.get("value") or {}

    def cells(self):
        items = self.values.items() if isinstance(self.values, dict) else enumerate(self.values)
        for position, value in items:
            if value is None:
                continue
            position = int(position)
            coordinates = {dimension: self.codes[dimension][(position // stride) % length]
                           for dimension, stride, length in zip(self.ids, self.strides, self.size)}
            yield coordinates, value

    def value_at(self, **coordinates):
        position = 0
        for dimension, stride in zip(self.ids, self.strides):
            code = coordinates.get(dimension)
            if code is None:
                continue
            if code not in self.positions[dimension]:
                return None
            position += self.positions[dimension][code] * stride
        if isinstance(self.values, dict):
            return self.values.get(str(position))
        return self.values[position] if position < len(self.values) else None


class Relay:
    def __init__(self, cache_dir: str | os.PathLike | None = None, *, probe_interval: int = HOUR,
                 memory_bytes: int = 64 * MEGABYTE, disk_bytes: int = 500 * MEGABYTE, warm_count: int = 50,
                 warm_pause: float = 1.0, client: httpx.Client | None = None):
        self.cache_dir = Path(cache_dir) if cache_dir else None
        if self.cache_dir:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.probe_interval = probe_interval
        self.memory_limit, self.disk_limit = memory_bytes, disk_bytes
        self.warm_count, self.warm_pause = warm_count, warm_pause
        self.client = client or httpx.Client(timeout=UPSTREAM_TIMEOUT, headers={"User-Agent": USER_AGENT})
        self.lock = threading.Lock()
        self.disk_lock = threading.Lock()
        self.upstream_slots = threading.BoundedSemaphore(MAX_PARALLEL_UPSTREAM_REQUESTS)
        self.memory: OrderedDict[str, CachedResponse] = OrderedDict()
        self.memory_size = 0
        self.refusals: dict[str, tuple[float, int, str]] = {}
        self.downloads_in_progress: dict[str, Future] = {}
        self.queued_refreshes: set[str] = set()
        self.request_counts: Counter = Counter()
        self.url_by_key: dict[str, str] = {}
        self.version: str | None = None
        self.last_probe = 0.0
        self.probe_ok: bool | None = None
        self.probe_running = False
        self.background_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="relay")
        self.background_tasks: list[Future] = []
        self.stats = {"memory": 0, "disk": 0, "network": 0, "stale": 0, "shared": 0, "negative": 0,
                      "errors": 0, "refreshed": 0, "warmed": 0, "evicted": 0}
        self.disk_size = self._measure_disk_usage()
        self._load_popular_urls()

    def upstream_url(self, pairs) -> str:
        return f"{COMEXT_API}?{urlencode(validated_query(pairs))}"

    def _count(self, stat: str, amount: int = 1) -> None:
        with self.lock:
            self.stats[stat] += amount

    def fresh(self, copy: CachedResponse) -> bool:
        age = time.time() - copy.fetched_at
        if self.version is None:
            return age < COPY_TTL_WHILE_PUBLICATION_UNKNOWN
        return copy.version == self.version and age < MAX_COPY_AGE

    def probe_if_due(self) -> None:
        with self.lock:
            due = not self.probe_running and time.time() - self.last_probe >= self.probe_interval
            if due:
                self.probe_running = True
        if due:
            self._run_in_background(self.check_version)

    def check_version(self) -> str | None:
        version = self._probe_current_publication()
        with self.lock:
            self.last_probe = time.time()
            self.probe_running = False
            self.probe_ok = version is not None
            new_publication = version is not None and self.version is not None and version != self.version
            if version is not None:
                self.version = version
        if new_publication:
            self._run_in_background(self._warm_popular_urls)
        self._save_popular_urls()
        return self.version

    def _probe_current_publication(self) -> str | None:
        recent_year = time.gmtime().tm_year - 2
        query = [("format", "JSON"), ("reporter", "LU"), ("flow", "1"), ("freq", "A"), ("indicators", "VALUE_IN_EUROS"),
                 ("lang", "EN"), ("partner", "WORLD"), ("product", "TOTAL"), ("sinceTimePeriod", str(recent_year))]
        try:
            response = self._request(f"{COMEXT_API}?{urlencode(query)}")
            payload = response.json() if response.status_code == 200 else None
            return payload.get("updated") if isinstance(payload, dict) else None
        except (httpx.HTTPError, ValueError, RelayError):
            return None

    def _request(self, url: str) -> httpx.Response:
        if not self.upstream_slots.acquire(timeout=UPSTREAM_TIMEOUT):
            raise RelayError(503, "Eurostat requests are busy; try again in a minute", retry_later=True)
        try:
            return self.client.get(url)
        finally:
            self.upstream_slots.release()

    def has_cached_copy(self, pairs) -> bool:
        key = _cache_key(self.upstream_url(pairs))
        with self.lock:
            if key in self.memory:
                return True
        path = self._disk_path(key)
        return bool(path and path.exists())

    def _cached_copy(self, key: str) -> tuple[CachedResponse | None, str]:
        with self.lock:
            copy = self.memory.get(key)
            if copy:
                self.memory.move_to_end(key)
                return copy, "memory"
        path = self._disk_path(key)
        if not path or not path.exists():
            return None, ""
        try:
            copy = CachedResponse.of(path.read_bytes(), path.stat().st_mtime)
        except OSError:
            return None, ""
        self._keep_in_memory(key, copy)
        return copy, "disk"

    def _needs_download(self, key: str) -> bool:
        copy, _ = self._cached_copy(key)
        return not (copy and self.fresh(copy))

    def fetch_entry(self, pairs) -> tuple[CachedResponse, str, str]:
        url = self.upstream_url(pairs)
        key = _cache_key(url)
        self._track_request(key, url)
        self.probe_if_due()
        self._raise_if_recently_refused(key)
        copy, origin = self._cached_copy(key)
        if copy and self.fresh(copy):
            self._count(origin)
            return copy, origin, url
        if copy:
            self._count("stale")
            self._refresh_in_background(key, url)
            return copy, "stale", url
        copy, shared = self._download_once(key, url)
        return copy, "shared" if shared else "network", url

    def _track_request(self, key: str, url: str) -> None:
        with self.lock:
            self.request_counts[key] += 1
            self.url_by_key[key] = url
            if len(self.url_by_key) > MAX_TRACKED_URLS:
                kept = dict(self.request_counts.most_common(TRACKED_URLS_KEPT_WHEN_PRUNING))
                self.request_counts = Counter(kept)
                self.url_by_key = {k: v for k, v in self.url_by_key.items() if k in kept or k == key}

    def _raise_if_recently_refused(self, key: str) -> None:
        refusal = self.refusals.get(key)
        if refusal and refusal[0] > time.time():
            _, status, message = refusal
            self._count("negative")
            raise RelayError(status, message)

    def _refresh_in_background(self, key: str, url: str) -> None:
        with self.lock:
            already_queued = key in self.queued_refreshes
            self.queued_refreshes.add(key)
        if not already_queued:
            self._run_in_background(self._refresh, key, url)

    def fetch_trusted(self, pairs, base_url: str | None = None, max_wait: float = 900,
                      retry_pause: float = 20) -> CachedResponse:
        url = f"{base_url or COMEXT_API}?{urlencode(list(pairs))}"
        key = _cache_key(url)
        deadline = time.time() + max_wait
        while True:
            copy, _ = self._cached_copy(key)
            if copy and self._fresh_for_trusted_use(copy, other_dataset=bool(base_url)):
                return copy
            try:
                return self._download_once(key, url)[0]
            except RelayError as error:
                if copy:
                    return copy
                worth_retrying = error.retry_later or error.status in (502, 504)
                if not worth_retrying or time.time() + retry_pause > deadline:
                    raise
                time.sleep(retry_pause)

    def _fresh_for_trusted_use(self, copy: CachedResponse, other_dataset: bool) -> bool:
        if other_dataset:
            return time.time() - copy.fetched_at < OTHER_DATASET_COPY_TTL
        return self.fresh(copy)

    def _download_once(self, key: str, url: str) -> tuple[CachedResponse, bool]:
        with self.lock:
            download = self.downloads_in_progress.get(key)
            joins_existing = download is not None
            if not joins_existing:
                download = Future()
                self.downloads_in_progress[key] = download
        if joins_existing:
            self._count("shared")
            try:
                return download.result(timeout=SHARED_DOWNLOAD_WAIT), True
            except TimeoutError as error:
                raise RelayError(503, "Eurostat is still preparing this response; try again later", retry_later=True) from error
        try:
            copy = self._download(key, url)
        except BaseException as error:
            download.set_exception(error)
            raise
        else:
            download.set_result(copy)
            return copy, False
        finally:
            with self.lock:
                self.downloads_in_progress.pop(key, None)

    def _download(self, key: str, url: str) -> CachedResponse:
        try:
            response = self._request(url)
            payload = self._dataset_payload(key, response)
        except (httpx.HTTPError, ValueError) as error:
            self._count("errors")
            raise RelayError(504, "Eurostat is not responding; try again later") from error
        except RelayError:
            self._count("errors")
            raise
        copy = CachedResponse.of(response.content, time.time(), payload.get("updated"))
        self._keep_in_memory(key, copy)
        self._write_to_disk(key, copy)
        self._count("network")
        self._adopt_newer_comext_publication(url, copy)
        return copy

    def _dataset_payload(self, key: str, response: httpx.Response) -> dict:
        if response.status_code == 413 and b"ASYNCHRONOUS" in response.content:
            raise RelayError(503, "Eurostat is preparing this response; try again in a minute", retry_later=True)
        if response.status_code != 200:
            raise self._refusal(key, response.status_code)
        payload = json.loads(response.content)
        if not isinstance(payload, dict) or payload.get("class") != "dataset":
            raise RelayError(502, "unexpected Eurostat response (request too large?)")
        return payload

    def _refusal(self, key: str, upstream_status: int) -> RelayError:
        upstream_failed = upstream_status >= 500 or upstream_status == 429
        error = RelayError(502 if upstream_failed else upstream_status, f"Eurostat answered {upstream_status}")
        if not upstream_failed:
            self._remember_refusal(key, error)
        return error

    def _remember_refusal(self, key: str, error: RelayError) -> None:
        with self.lock:
            now = time.time()
            if len(self.refusals) >= MAX_REMEMBERED_REFUSALS:
                self.refusals = {k: refusal for k, refusal in self.refusals.items() if refusal[0] > now}
                if len(self.refusals) >= MAX_REMEMBERED_REFUSALS:
                    self.refusals.pop(next(iter(self.refusals)))
            self.refusals[key] = (now + REFUSAL_TTL, error.status, error.message)

    def _adopt_newer_comext_publication(self, url: str, copy: CachedResponse) -> None:
        with self.lock:
            if url.startswith(COMEXT_API) and copy.version and self.version and copy.version > self.version:
                self.version = copy.version

    def _refresh(self, key: str, url: str) -> None:
        try:
            with contextlib.suppress(RelayError):
                if self._needs_download(key):
                    self._download_once(key, url)
                    self._count("refreshed")
        finally:
            with self.lock:
                self.queued_refreshes.discard(key)

    def _warm_popular_urls(self) -> int:
        with self.lock:
            keys = [key for key, _ in self.request_counts.most_common(self.warm_count) if key in self.url_by_key]
        warmed = 0
        for key in keys:
            if not self._needs_download(key):
                continue
            try:
                self._download_once(key, self.url_by_key[key])
            except RelayError:
                continue
            warmed += 1
            time.sleep(self.warm_pause)
        self._count("warmed", warmed)
        return warmed

    def _run_in_background(self, task, *args) -> None:
        with self.lock:
            self.background_tasks = [running for running in self.background_tasks if not running.done()]
            self.background_tasks.append(self.background_pool.submit(task, *args))

    def drain(self, timeout: float = 30) -> None:
        deadline = time.time() + timeout
        while True:
            with self.lock:
                running = [task for task in self.background_tasks if not task.done()]
            if not running or time.time() > deadline:
                return
            for task in running:
                with contextlib.suppress(Exception):
                    task.result(timeout=max(0.0, deadline - time.time()))

    def _keep_in_memory(self, key: str, copy: CachedResponse) -> None:
        with self.lock:
            replaced = self.memory.pop(key, None)
            if replaced:
                self.memory_size -= len(replaced.body)
            if len(copy.body) > self.memory_limit:
                return
            self.memory[key] = copy
            self.memory_size += len(copy.body)
            while self.memory_size > self.memory_limit:
                _, evicted = self.memory.popitem(last=False)
                self.memory_size -= len(evicted.body)

    def _disk_path(self, key: str) -> Path | None:
        return self.cache_dir / f"{key}.json" if self.cache_dir else None

    def _write_to_disk(self, key: str, copy: CachedResponse) -> None:
        path = self._disk_path(key)
        if not path:
            return
        with self.disk_lock:
            try:
                previous_size = path.stat().st_size if path.exists() else 0
                partial = path.with_suffix(".part")
                partial.write_bytes(copy.body)
                partial.replace(path)
            except OSError:
                return
            with self.lock:
                self.disk_size += len(copy.body) - previous_size
                over_limit = self.disk_size > self.disk_limit
            if over_limit:
                self._evict_oldest_disk_copies()

    def _disk_copies(self):
        if not self.cache_dir:
            return []
        copies = []
        for path in self.cache_dir.glob("*.json"):
            # A separate publication builder may also evict shared cache files.
            with contextlib.suppress(OSError):
                copies.append((path, path.stat()))
        return copies

    def _measure_disk_usage(self) -> int:
        return sum(stat.st_size for _, stat in self._disk_copies())

    def _evict_oldest_disk_copies(self) -> None:
        copies = sorted(self._disk_copies(), key=lambda copy: copy[1].st_mtime)
        size = sum(stat.st_size for _, stat in copies)
        target = self.disk_limit * DISK_EVICTION_TARGET
        removed = 0
        for path, stat in copies:
            if size <= target:
                break
            try:
                path.unlink()
            except OSError:
                continue
            size -= stat.st_size
            removed += 1
        with self.lock:
            self.disk_size = size
            self.stats["evicted"] += removed

    def _load_popular_urls(self) -> None:
        path = self.cache_dir / POPULAR_INDEX if self.cache_dir else None
        if not path or not path.exists():
            return
        with contextlib.suppress(OSError, ValueError, KeyError, TypeError):
            for row in json.loads(path.read_text()):
                url = row["url"]
                key = _cache_key(url)
                self.url_by_key[key] = url
                self.request_counts[key] = int(row["count"])

    def _save_popular_urls(self) -> None:
        if not self.cache_dir:
            return
        with self.lock:
            rows = [{"url": self.url_by_key[key], "count": count}
                    for key, count in self.request_counts.most_common(SAVED_POPULAR_URLS) if key in self.url_by_key]
        with contextlib.suppress(OSError):
            partial = self.cache_dir / f"{POPULAR_INDEX}.part"
            partial.write_text(json.dumps(rows))
            partial.replace(self.cache_dir / POPULAR_INDEX)

    def health(self) -> dict:
        with self.lock:
            stats = dict(self.stats)
            served_from_cache = stats["memory"] + stats["disk"] + stats["stale"] + stats["shared"]
            total = served_from_cache + stats["network"]
            return {
                **stats,
                "hit_ratio": round(served_from_cache / total, 3) if total else None,
                "eurostat_version": self.version,
                "last_probe": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(self.last_probe)) if self.last_probe else None,
                "probe_ok": self.probe_ok,
                "memory_entries": len(self.memory),
                "memory_bytes": self.memory_size,
                "memory_limit": self.memory_limit,
                "disk_bytes": self.disk_size,
                "disk_limit": self.disk_limit if self.cache_dir else 0,
            }
