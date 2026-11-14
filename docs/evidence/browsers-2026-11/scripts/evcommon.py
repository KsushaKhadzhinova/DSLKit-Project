"""Shared helpers of the browser evidence scripts (labs 5-8): launch Firefox or Edge, collect console errors and failed requests."""
import json
import os
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent  # docs/evidence/browsers-2026-11
BROWSERS = ["firefox", "msedge"]
WIDTHS = [(1366, 800), (390, 844)]


def launch(p, name):
    if name == "firefox":
        return p.firefox.launch()
    return p.chromium.launch(channel="msedge")


class Watch:
    """Console errors, page errors, failed requests and HTTP >= 400 answers of one context."""

    def __init__(self):
        self.console, self.failed, self.http = [], [], []

    def attach(self, page):
        page.on("console", lambda m: self.console.append(m.text[:200]) if m.type == "error" else None)
        page.on("pageerror", lambda e: self.console.append("pageerror: " + str(e)[:200]))
        page.on("requestfailed", lambda r: self.failed.append(f"{r.method} {r.url.split('?')[0]} {r.failure}"))
        page.on("response", lambda r: self.http.append(f"{r.status} {r.request.method} {r.url.split('?')[0]}") if r.status >= 400 else None)

    def summary(self):
        return {"console_errors": self.console, "failed_requests": self.failed, "http_4xx_5xx": self.http}


def save(results, lab):
    (OUT / lab).mkdir(parents=True, exist_ok=True)
    (OUT / lab / "result.json").write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")


def need(name):
    v = os.environ.get(name)
    if not v:
        raise SystemExit(f"environment variable {name} is not set")
    return v
