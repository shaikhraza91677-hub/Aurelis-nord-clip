import re
from typing import Any


def discover_moments(transcript: dict[str, Any], custom_prompt: str = '') -> list[dict[str, Any]]:
    from worker import openrouter_json

    instruction = custom_prompt.strip() or 'Find the strongest general short-form moments.'
    prompt = f'''
Return strict JSON {{"clips":[...]}}.
Find up to 12 non-overlapping 20-75 second moments from the transcript.
Each clip must include start, end, score, hook, title, reason, category, language.
Score 0-100 based on hook strength, standalone context, payoff, emotion/insight, pacing and shareability.
Avoid greetings, sponsor reads, repetitive sections, weak setup and unfinished sentences.
Honor this creator instruction above all else: {instruction}
Do not invent facts or dialogue. Align start/end with natural sentence boundaries.
Transcript language: {transcript.get('language', 'unknown')}
Transcript:\n{transcript.get('text', '')[:90000]}
'''
    result = openrouter_json('You are Aurelis Nord\'s senior short-form editor. Quality beats quantity.', prompt)
    clips = []
    for item in result.get('clips', []):
        try:
            start = float(item.get('start', 0)); end = float(item.get('end', 0)); score = float(item.get('score', 0))
        except (TypeError, ValueError):
            continue
        if end > start and 15 <= end - start <= 90:
            clips.append({**item, 'start': start, 'end': end, 'score': max(0, min(100, score))})
    clips.sort(key=lambda x: x['score'], reverse=True)
    selected = []
    for clip in clips:
        overlap = False
        for chosen in selected:
            inter = max(0, min(clip['end'], chosen['end']) - max(clip['start'], chosen['start']))
            union = max(clip['end'], chosen['end']) - min(clip['start'], chosen['start'])
            if union and inter / union > 0.30:
                overlap = True
                break
        if not overlap:
            selected.append(clip)
        if len(selected) == 12:
            break
    return selected
