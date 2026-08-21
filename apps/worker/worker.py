import json, os, subprocess, tempfile
from pathlib import Path
import requests
from dotenv import load_dotenv
load_dotenv()
BASE=os.getenv('LLM_BASE_URL','https://api.openai.com/v1').rstrip('/')
KEY=os.getenv('LLM_API_KEY','')
MODEL=os.getenv('LLM_MODEL','gpt-4o-mini')

def run(cmd): return subprocess.run(cmd,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
def download(url,out):
    run(['yt-dlp','--no-playlist','-f','bv*+ba/b','--merge-output-format','mp4','-o',str(out/'source.%(ext)s'),url])
    files=list(out.glob('source.*')); return files[0]
def audio(video,out): run(['ffmpeg','-y','-i',str(video),'-vn','-ac','1','-ar','16000','-c:a','mp3',str(out)])
def transcribe(path):
    if not KEY: raise RuntimeError('LLM_API_KEY is not configured')
    with open(path,'rb') as f:
        r=requests.post(f'{BASE}/audio/transcriptions',headers={'Authorization':f'Bearer {KEY}'},files={'file':('audio.mp3',f,'audio/mpeg')},data={'model':os.getenv('TRANSCRIPTION_MODEL','whisper-1'),'response_format':'verbose_json','timestamp_granularities[]':'word'},timeout=1800)
    r.raise_for_status(); return r.json()
def llm_json(system,user):
    r=requests.post(f'{BASE}/chat/completions',headers={'Authorization':f'Bearer {KEY}','Content-Type':'application/json'},json={'model':MODEL,'temperature':.2,'response_format':{'type':'json_object'},'messages':[{'role':'system','content':system},{'role':'user','content':user}]},timeout=300)
    r.raise_for_status(); return json.loads(r.json()['choices'][0]['message']['content'])
def moments(t):
    result=llm_json('You are an expert short-form editor. Return strict JSON.',f'''Return {{"clips":[...]}}. Find up to 12 non-overlapping 20-75 second moments. Each needs start,end,score,hook,title,reason. Prioritize strong first 2 seconds, standalone context, clear payoff, emotion, insight or controversy. Score 0-100. Transcript:\n{t.get("text","")[:60000]}''')
    return sorted(result.get('clips',[]),key=lambda x:x.get('score',0),reverse=True)[:12]
def render(video,out,start,end):
    vf='scale=1080:-2,crop=1080:1920:(in_w-1080)/2:(in_h-1920)/2'
    run(['ffmpeg','-y','-ss',str(start),'-i',str(video),'-t',str(max(1,end-start)),'-vf',vf,'-c:v','libx264','-preset','fast','-crf','20','-c:a','aac','-movflags','+faststart',str(out)])
def process(url,outdir='./output'):
    root=Path(outdir); root.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='aurelis-') as td:
        work=Path(td); video=download(url,work); ap=work/'audio.mp3'; audio(video,ap); t=transcribe(ap); clips=moments(t); rendered=[]
        for i,c in enumerate(clips[:8],1):
            target=root/f'clip-{i:02d}.mp4'; render(video,target,float(c['start']),float(c['end'])); rendered.append({**c,'file':str(target)})
        manifest={'source':url,'language':t.get('language'),'text':t.get('text',''),'clips':rendered}; (root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)); return manifest
if __name__=='__main__':
    import argparse; p=argparse.ArgumentParser(); p.add_argument('url'); p.add_argument('--out',default='./output'); a=p.parse_args(); print(json.dumps(process(a.url,a.out),ensure_ascii=False))
