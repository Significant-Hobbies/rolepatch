"""
Vercel Python serverless function: JobSpy multi-platform job search.

Deployed at: /api/python/jobs-search (Vercel legacy api/ routing).
Auth: requires `Authorization: Bearer <JOBSPY_API_KEY>` header.
Called by src/app/api/jobs/search/route.ts same-origin.
"""

import hashlib
import json
import math
import os
from http.server import BaseHTTPRequestHandler

from jobspy import scrape_jobs


DEFAULT_SITES = ["indeed", "linkedin", "google", "glassdoor", "zip_recruiter"]


def _clean(value):
    if value is None:
        return None
    try:
        if isinstance(value, float) and math.isnan(value):
            return None
    except (TypeError, ValueError):
        pass
    s = str(value).strip()
    return s if s and s.lower() != "nan" else None


def _make_id(row):
    key = row.get("job_url") or f"{row.get('title', '')}-{row.get('company', '')}"
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]


def _serialize(df):
    if df is None or df.empty:
        return []
    jobs = []
    for _, row in df.iterrows():
        rec = row.to_dict()
        description = _clean(rec.get("description"))
        jobs.append({
            "id": _make_id(rec),
            "site": _clean(rec.get("site")),
            "title": _clean(rec.get("title")) or "Untitled role",
            "company": _clean(rec.get("company")) or "Unknown company",
            "location": _clean(rec.get("location")),
            "is_remote": bool(rec.get("is_remote")) if rec.get("is_remote") is not None else False,
            "date_posted": _clean(rec.get("date_posted")),
            "job_type": _clean(rec.get("job_type")),
            "min_amount": rec.get("min_amount") if _clean(rec.get("min_amount")) else None,
            "max_amount": rec.get("max_amount") if _clean(rec.get("max_amount")) else None,
            "currency": _clean(rec.get("currency")),
            "job_url": _clean(rec.get("job_url_direct")) or _clean(rec.get("job_url")),
            "description": description,
            "description_short": (description[:600] + "…") if description and len(description) > 600 else description,
            "company_url": _clean(rec.get("company_url")),
            "emails": _clean(rec.get("emails")),
        })
    return jobs


class handler(BaseHTTPRequestHandler):  # noqa: N801 — Vercel convention
    def _respond(self, status, body):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode("utf-8"))

    def do_GET(self):  # noqa: N802
        self._respond(200, {"ok": True, "service": "jobspy"})

    def do_POST(self):  # noqa: N802
        # Bearer auth
        expected = os.environ.get("JOBSPY_API_KEY")
        if not expected:
            return self._respond(503, {"error": "JOBSPY_API_KEY not configured"})
        auth = self.headers.get("Authorization", "")
        if not auth.startswith("Bearer ") or auth[7:] != expected:
            return self._respond(401, {"error": "unauthorized"})

        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw or b"{}")
        except json.JSONDecodeError:
            return self._respond(400, {"error": "invalid json"})

        query = (payload.get("query") or "").strip()
        if not query:
            return self._respond(400, {"error": "query is required"})
        location = (payload.get("location") or "").strip() or None
        is_remote = bool(payload.get("remote") or payload.get("is_remote"))
        results_wanted = int(payload.get("results_wanted") or 25)
        hours_old = int(payload.get("hours_old") or 168)
        sites = payload.get("sites") or DEFAULT_SITES
        if not isinstance(sites, list):
            sites = DEFAULT_SITES

        try:
            df = scrape_jobs(
                site_name=sites,
                search_term=query,
                google_search_term=(f"{query} jobs near {location}" if location else f"{query} jobs"),
                location=location,
                results_wanted=results_wanted,
                hours_old=hours_old,
                is_remote=is_remote,
                description_format="markdown",
                verbose=0,
            )
        except Exception as exc:  # noqa: BLE001 — serialize any scrape failure to 502
            return self._respond(502, {"error": "scrape failed", "detail": str(exc)[:300]})

        return self._respond(200, {"jobs": _serialize(df)})
