import json,os,threading
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse
from job_manager import get,list_jobs,run_redis_worker_forever,submit

def submit_job(kind,payload):
    return submit(kind,payload)
class Handler(BaseHTTPRequestHandler):
    def _json(self,status,payload):
        data=json.dumps(payload,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def do_GET(self):
        path=urlparse(self.path).path
        if path=='/health':self._json(200,{'ok':True,'service':'aurelis-worker','queue':'redis' if os.getenv('REDIS_URL') else 'local','jobs':list_jobs(5)});return
        if path.startswith('/jobs/'):
            job=get(path.rsplit('/',1)[-1]);self._json(200,job if job else {'error':'Job not found'});return
        self._json(404,{'error':'not found'})
    def do_POST(self):
        try:
            n=int(self.headers.get('Content-Length','0'));body=json.loads(self.rfile.read(n) or b'{}')
            if self.path=='/process':self._json(202,{'jobId':submit_job('analyze-url',{'url':body['url'],'prompt':body.get('prompt',''),'out':body.get('out','./output')}),'status':'queued'});return
            if self.path=='/process-file':self._json(202,{'jobId':submit_job('analyze-file',{'path':body['path'],'prompt':body.get('prompt',''),'out':body.get('out','./output')}),'status':'queued'});return
            if self.path=='/render-clip':self._json(202,{'jobId':submit_job('render-clip',{'sourceUrl':body['sourceUrl'],'start':float(body['start']),'end':float(body['end']),'out':body['out'],'config':body.get('config')}),'status':'queued'});return
            if self.path=='/supercut':self._json(202,{'jobId':submit_job('supercut',{'files':body.get('files',[]),'out':body['out'],'transition':body.get('transition','hard')}),'status':'queued'});return
            self._json(404,{'error':'not found'})
        except Exception as exc:self._json(400,{'error':str(exc)})
if __name__=='__main__':
    if os.getenv('REDIS_URL'):threading.Thread(target=run_redis_worker_forever,daemon=True).start()
    ThreadingHTTPServer(('0.0.0.0',int(os.getenv('PORT','8080'))),Handler).serve_forever()
