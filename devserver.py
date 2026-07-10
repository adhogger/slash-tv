#!/usr/bin/env python3
"""Dev server for Dead Air: like `python3 -m http.server` but sends no-cache
headers so the browser always fetches fresh JS after an edit.
Usage: python3 devserver.py [port] [directory]"""
import functools
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8642
directory = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.abspath(__file__))
handler = functools.partial(NoCacheHandler, directory=directory)
print(f'Serving {directory} at http://localhost:{port} (no-cache)')
http.server.ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()
