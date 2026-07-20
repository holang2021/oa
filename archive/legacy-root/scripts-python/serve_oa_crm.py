import http.server
import urllib.request
import json
import os

DIST = r'C:\Users\liush\.workbuddy\skills\系统建设\holang-oa\packages\oa\dist'
BACKEND = 'http://localhost:3001'

class CRMHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST, **kwargs)

    def _proxy(self, method):
        content_len = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_len) if content_len > 0 else None
        url = f'{BACKEND}{self.path}'
        req = urllib.request.Request(url, data=body, method=method)
        for k, v in self.headers.items():
            if k.lower() not in ('host', 'content-length', 'connection'):
                req.add_header(k, v)
        try:
            resp = urllib.request.urlopen(req, timeout=15)
            self.send_response(resp.status)
            for k, v in resp.headers.items():
                if k.lower() not in ('transfer-encoding', 'connection', 'keep-alive'):
                    self.send_header(k, v)
            self.end_headers()
            self.wfile.write(resp.read())
        except Exception as e:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def do_GET(self):
        if self.path.startswith('/api/'):
            self._proxy('GET')
        else:
            fp = self.translate_path(self.path)
            if not os.path.exists(fp) or os.path.isdir(fp):
                self.path = '/index.html'
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self._proxy('POST')
        else:
            super().do_POST()

    def do_PUT(self):
        if self.path.startswith('/api/'):
            self._proxy('PUT')
        else:
            super().do_PUT()

    def do_DELETE(self):
        if self.path.startswith('/api/'):
            self._proxy('DELETE')
        else:
            super().do_DELETE()

if __name__ == '__main__':
    http.server.HTTPServer(('', 8080), CRMHandler).serve_forever()
