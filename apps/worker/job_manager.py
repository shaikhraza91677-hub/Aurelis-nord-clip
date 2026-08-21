import contextvars
import os
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any, Callable

JobFn = Callable[[], dict[str, Any]]

_MAX_WORKERS = max(1, int(os.getenv('WORKER_MAX_CONCURRENCY', '1')))
_POOL = ThreadPoolExecutor(max_workers=_MAX_WORKERS, thread_name_prefix='aurelis-job')
_LOCK = threading.RLock()
_JOBS: dict[str, dict[str, Any]] = {}
_CURRENT_JOB: contextvars.ContextVar[str | None] = contextvars.ContextVar('aurelis_job', default=None)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def submit(kind: str, fn: JobFn) -> str:
    job_id = str(uuid.uuid4())
    with _LOCK:
        _JOBS[job_id] = {'id': job_id, 'kind': kind, 'status': 'queued', 'progress': 0, 'stage': 'Queued', 'createdAt': _now(), 'updatedAt': _now(), 'result': None, 'error': None}
    _POOL.submit(_run, job_id, fn)
    return job_id


def _run(job_id: str, fn: JobFn) -> None:
    token = _CURRENT_JOB.set(job_id)
    update(job_id, status='processing', progress=5, stage='Starting media pipeline')
    try:
        result = fn()
        update(job_id, status='completed', progress=100, stage='Complete', result=result)
    except Exception as exc:
        update(job_id, status='failed', progress=100, stage='Failed', error=str(exc))
    finally:
        _CURRENT_JOB.reset(token)


def report(progress: int, stage: str) -> None:
    job_id = _CURRENT_JOB.get()
    if job_id:
        update(job_id, progress=max(0, min(99, int(progress))), stage=stage)


def update(job_id: str, **values: Any) -> None:
    with _LOCK:
        if job_id in _JOBS:
            _JOBS[job_id].update(values)
            _JOBS[job_id]['updatedAt'] = _now()


def get(job_id: str) -> dict[str, Any] | None:
    with _LOCK:
        item = _JOBS.get(job_id)
        return dict(item) if item else None


def list_jobs(limit: int = 20) -> list[dict[str, Any]]:
    with _LOCK:
        items = sorted(_JOBS.values(), key=lambda x: x['createdAt'], reverse=True)
        return [dict(x) for x in items[:limit]]
