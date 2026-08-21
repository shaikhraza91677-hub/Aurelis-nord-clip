import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from enhanced_pipeline import process_file, process_url
from job_manager import get, list_jobs, submit
from render import render_clip
from supercut import create_supercut


def analyze_url(url: str, out: str, prompt: str = '') -> dict:
    return process_url(url, out, prompt)


def analyze_file(path: str, out: str, prompt: str = '') -> dict:
    return process_file(path, out, prompt)


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
            self._json(200, job if job else {'error': 'Job not found'})
            return
        self._json(404, {'error': 'not found'})

    def do_POST(self):
        try:
            n = int(self.headers.get('Content-Length', '0'))
            body = json.loads(self.rfile.read(n) or b'{}')
            if self.path == '/process':
                job_id = submit('analyze-url', lambda: analyze_url(body['url'], body.get('out', './output'), body.get('prompt', '')))
                self._json(202, {'jobId': job_id, 'status': 'queued'})
                return
            if self.path == '/process-file':
                job_id = submit('analyze-file', lambda: analyze_file(body['path'], body.get('out', './output'), body.get('prompt', '')))
                self._json(202, {'jobId': job_id, 'status': 'queued'})
                return
            if self.path == '/render-clip':
                job_id = submit('render-clip', lambda: render_clip(body['sourceUrl'], float(body['start']), float(body['end']), body['out'], body.get('config')))
                self._json(202, {'jobId': job_id, 'status': 'queued'})
                return
            if self.path == '/supercut':
                job_id = submit('supercut', lambda: create_supercut(body.get('files', []), body['out'], body.get('transition', 'hard')))
                self._json(202, {'jobId': job_id, 'status': 'queued'})
                return
            self._json(404, {'error': 'not found'})
        except Exception as exc:
            self._json(400, {'error': str(exc)})


if __name__ == '__main__':
    port = int(os.getenv('PORT', '8080'))
    ThreadingHTTPServer(('0.0.0.0', port), Handler).serve_forever()
