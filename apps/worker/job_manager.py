import contextvars
import json
import os
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any, Callable
_MAX_WORKERS=max(1,int(os.getenv('WORKER_MAX_CONCURRENCY','1')))
_POOL=ThreadPoolExecutor(max_workers=_MAX_WORKERS,thread_name_prefix='aurelis-job')
_LOCK=threading.RLock();_JOBS={};_CURRENT_JOB:contextvars.ContextVar[str|None]=contextvars.ContextVar('aurelis_job',default=None)
_REDIS=None;_REDIS_ENABLED=False
try:
 import redis
 if os.getenv('REDIS_URL'):
  _REDIS=redis.Redis.from_url(os.getenv('REDIS_URL'),decode_responses=True);_REDIS.ping();_REDIS_ENABLED=True
except Exception:_REDIS=None;_REDIS_ENABLED=False
def _now():return datetime.now(timezone.utc).isoformat()
def _key(job_id):return f'aurelis:job:{job_id}'
def _persist(job):
 with _LOCK:_JOBS[job['id']]=dict(job)
 if _REDIS_ENABLED:_REDIS.set(_key(job['id']),json.dumps(job,ensure_ascii=False),ex=7*86400)
def submit(kind,payload,local_fn:Callable[[],dict[str,Any]]|None=None):
 job_id=str(uuid.uuid4());job={'id':job_id,'kind':kind,'payload':payload,'status':'queued','progress':0,'stage':'Queued','createdAt':_now(),'updatedAt':_now(),'result':None,'error':None};_persist(job)
 if _REDIS_ENABLED:
  _REDIS.rpush('aurelis:queue',job_id);_REDIS.lpush('aurelis:recent',job_id);_REDIS.ltrim('aurelis:recent',0,199)
 elif local_fn:_POOL.submit(_run_local,job_id,local_fn)
 else:raise RuntimeError('Redis queue unavailable and no local runner provided')
 return job_id
def _handler(kind,payload):
 if kind=='analyze-url':
  from enhanced_pipeline import process_url;return process_url(payload['url'],payload.get('out','./output'),payload.get('prompt',''))
 if kind=='analyze-file':
  from enhanced_pipeline import process_file;return process_file(payload['path'],payload.get('out','./output'),payload.get('prompt',''))
 if kind=='render-clip':
  from render import render_clip;return render_clip(payload['sourceUrl'],float(payload['start']),float(payload['end']),payload['out'],payload.get('config'))
 if kind=='supercut':
  from supercut import create_supercut;return create_supercut(payload.get('files',[]),payload['out'],payload.get('transition','hard'))
 raise RuntimeError(f'Unknown job kind: {kind}')
def _run_local(job_id,fn):_run(job_id,fn)
def _run(job_id,fn):
 token=_CURRENT_JOB.set(job_id);update(job_id,status='processing',progress=5,stage='Starting media pipeline')
 try:update(job_id,status='completed',progress=100,stage='Complete',result=fn())
 except Exception as exc:update(job_id,status='failed',progress=100,stage='Failed',error=str(exc))
 finally:_CURRENT_JOB.reset(token)
def run_redis_worker_forever():
 if not _REDIS_ENABLED:return
 while True:
  item=_REDIS.brpop('aurelis:queue',timeout=5)
  if not item:continue
  job=get(item[1])
  if not job or job.get('status') not in ('queued','processing'):continue
  _run(job['id'],lambda:_handler(job['kind'],job.get('payload',{})))
def report(progress,stage):
 job_id=_CURRENT_JOB.get()
 if job_id:update(job_id,progress=max(0,min(99,int(progress))),stage=stage)
def update(job_id,**values):
 with _LOCK:job=_JOBS.get(job_id)
 if not job and _REDIS_ENABLED:job=get(job_id)
 if not job:return
 job.update(values);job['updatedAt']=_now();_persist(job)
def get(job_id):
 with _LOCK:item=_JOBS.get(job_id)
 if item:return dict(item)
 if _REDIS_ENABLED:
  raw=_REDIS.get(_key(job_id))
  if raw:
   obj=json.loads(raw);_persist(obj);return obj
 return None
def list_jobs(limit=20):
 if _REDIS_ENABLED:
  ids=_REDIS.lrange('aurelis:recent',0,max(0,limit-1));return [x for x in (get(job_id) for job_id in ids) if x]
 with _LOCK:items=list(_JOBS.values())
 items.sort(key=lambda x:x['createdAt'],reverse=True);return [dict(x) for x in items[:limit]]
