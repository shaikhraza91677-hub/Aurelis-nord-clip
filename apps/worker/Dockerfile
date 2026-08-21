FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg git curl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY apps/worker/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/worker ./

ENV PYTHONUNBUFFERED=1
ENV PORT=8080
EXPOSE 8080
CMD ["python", "server.py"]
