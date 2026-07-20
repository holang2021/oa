import http.server
import socketserver
import os

PORT = 8080

class MultiAppHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)

    def log_message(self, format, *args):
        print(f"[OA] {self.client_address[0]} - {format % args}")

with socketserver.TCPServer(("", PORT), MultiAppHandler) as httpd:
    print(f"HOLANG OA serving on http://localhost:{PORT}")
    print(f"  CRM   -> /crm_dist/")
    print(f"  Admin -> /admin_dist/")
    httpd.serve_forever()
