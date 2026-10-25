# Local dev server with caching disabled (so edited ES modules always reload).
# Optional arguments: host and port, e.g. `serve.py 0.0.0.0 4174` to open it
# to phones on the same Wi-Fi.
import http.server, functools, os, sys
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
host = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1"
port = int(sys.argv[2]) if len(sys.argv) > 2 else 4173
http.server.ThreadingHTTPServer((host, port), functools.partial(H, directory=root)).serve_forever()
