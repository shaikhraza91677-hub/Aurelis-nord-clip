import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from job_manager import get, list_jobs, submit
from pipeline import process_file
from render import render_clip
from worker import process


class Handler(BaseHTTPRequestHandler):
    def _json(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/health':
            self._json(200, {'ok': True, 'service': 'aurelis-worker', 'jobs': list_jobs(5)})
            return
        if path.startswith('/jobs/'):
            job = get(path.rsplit('/', 1)[-1])
            if not job:
                self._json(404, {'error': 'Job not found'})
            else:
                self._json(200, job)
            return
        self._json(404, {'error': 'not found'})

    def do_POST(self):
        try:
            n = int(self.headers.get('Content-Length', '0'))
            body = json.loads(self.rfile.read(n) or b'{}')
            if self.path == '/process':
                job_id = submit('analyze-url', lambda: process(body['url'], body.get('out', './output')))
                self._json(202, {'jobId': job_id, 'status': 'queued'})
                return
            if self.path == '/process-file':
                job_id = submit('analyze-file', lambda: process_file(body['path'], body.get('out', './output')))
                self._json(202, {'jobId': job_id, 'status': 'queued'})
                return
            if self.path == '/render-clip':
                job_id = submit(
                    'render-clip',
                    lambda: render_clip(body['sourceUrl'], float(body['start']), float(body['end']), body['out'], body.get('config')),
                )
                self._json(202, {'jobId': job_id, 'status': 'queued'})
                return
            self._json(404, {'error': 'not found'})
        except Exception as exc:
            self._json(400, {'error': str(exc)})


if __name__ == '__main__':
    port = int(os.getenv('PORT', '8080'))
    ThreadingHTTPServer(('0.0.0.0', port), Handler).serve_forever()
