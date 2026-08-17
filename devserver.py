#!/usr/bin/env python3
"""
Local development server. Not used in production — Railway serves the static
files through the Dockerfile/Caddyfile instead.

Two things a plain `python3 -m http.server` does not do:

  * sends `Cache-Control: no-store`, so an edited stylesheet is never served
    from the browser cache
  * injects a small live-reload snippet into index.html, so saving any
    .html/.css/.js file refreshes the open tab (the URL hash is preserved,
    so #invitation stays put)

    python3 devserver.py          # http://localhost:8000
    PORT=3000 python3 devserver.py
"""

import http.server
import os
import socketserver

ROOT = os.path.dirname(os.path.abspath(__file__))
WATCHED = ('.html', '.css', '.js')

LIVE_RELOAD = """
<!-- injected by devserver.py; never present in the deployed files -->
<script>
(function () {
  var last = null;
  setInterval(function () {
    fetch('/__stamp', { cache: 'no-store' })
      .then(function (r) { return r.text(); })
      .then(function (s) {
        if (last === null) { last = s; return; }
        if (s !== last) { location.reload(); }
      })
      .catch(function () { /* server restarting — try again next tick */ });
  }, 700);
})();
</script>
"""


def stamp():
    """Newest mtime across the watched files — changes whenever one is saved."""
    newest = 0.0
    for name in os.listdir(ROOT):
        if name.endswith(WATCHED):
            try:
                newest = max(newest, os.path.getmtime(os.path.join(ROOT, name)))
            except OSError:
                pass
    return '%.3f' % newest


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def _send(self, body, content_type):
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split('?', 1)[0]

        if path == '/__stamp':
            self._send(stamp().encode(), 'text/plain; charset=utf-8')
            return

        if path in ('/', '/index.html'):
            with open(os.path.join(ROOT, 'index.html'), encoding='utf-8') as f:
                html = f.read()
            html = html.replace('</body>', LIVE_RELOAD + '</body>')
            self._send(html.encode('utf-8'), 'text/html; charset=utf-8')
            return

        super().do_GET()

    def log_message(self, *args):
        pass  # keep the terminal quiet


class Server(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    with Server(('', port), Handler) as httpd:
        print('Wedding e-invite dev server → http://localhost:%d' % port)
        print('Edit any .html/.css/.js and the browser reloads itself.')
        httpd.serve_forever()
