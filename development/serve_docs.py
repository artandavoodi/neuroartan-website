#!/usr/bin/env python3
"""Serve the docs runtime with root-route fallback to 404.html.

This preserves the canonical public-route architecture locally:
- /profile.html serves the private profile page
- /{username} serves docs/404.html so the public route runtime can resolve
- real static assets still serve directly
"""

from __future__ import annotations

import argparse
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


REPO_ROOT = Path(__file__).resolve().parent.parent
DOCS_ROOT = REPO_ROOT / "docs"
FALLBACK_FILE = DOCS_ROOT / "404.html"


class DocsRouteHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DOCS_ROOT), **kwargs)

    def translate_path(self, path: str) -> str:
        parsed = urlparse(path)
        normalized_path = unquote(parsed.path)
        translated = Path(super().translate_path(normalized_path))

        if translated.exists():
            return str(translated)

        # Preserve canonical public-route testing by serving the route entry shell.
        if self.command in {"GET", "HEAD"}:
            return str(FALLBACK_FILE)

        return str(translated)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format: str, *args) -> None:
        print(f"[serve_docs] {self.address_string()} - {format % args}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Serve the Neuroartan docs runtime with public-route fallback.")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface to bind. Default: 127.0.0.1")
    parser.add_argument("--port", default=8001, type=int, help="Port to bind. Default: 8001")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    os.chdir(DOCS_ROOT)

    server = ThreadingHTTPServer((args.host, args.port), DocsRouteHandler)
    print(f"[serve_docs] Serving {DOCS_ROOT} at http://{args.host}:{args.port}")
    print("[serve_docs] Unknown root routes fall back to /404.html for public-profile resolution.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[serve_docs] Shutting down.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
