import json, os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from pipeline import process_file
from render import render_clip
from worker import process


class Handler(BaseHTTPRequestHandler):
    def _json(self, status, payload):
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == '/health':
            self._json(200, {'ok': True, 'service': 'aurelis-worker'})
            return
        self._json(404, {'error': 'not found'})

    def do_POST(self):
        try:
            n = int(self.headers.get('Content-Length', '0'))
            body = json.loads(self.rfile.read(n))
            if self.path == '/process':
                result = process(body['url'], body.get('out', './output'))
                self._json(200, result)
                return
            if self.path == '/process-file':
                result = process_file(body['path'], body.get('out', './output'))
                self._json(200, result)
                return
            if self.path == '/render-clip':
                result = render_clip(body['sourceUrl'], float(body['start']), float(body['end']), body['out'], body.get('config'))
                self._json(200, result)
                return
            self._json(404, {'error': 'not found'})
        except Exception as e:
            self._json(500, {'error': str(e)})


if __name__ == '__main__':
    port = int(os.getenv('PORT', '8080'))
    ThreadingHTTPServer(('0.0.0.0', port), Handler).serve_forever()
