from typing import Any


def generate_metadata(clips: list[dict[str, Any]], language: str) -> list[dict[str, Any]]:
    if not clips:
        return []
    from worker import openrouter_json

    payload = []
    for index, clip in enumerate(clips):
        payload.append({
            'index': index,
            'title': clip.get('title', ''),
            'hook': clip.get('hook', ''),
            'category': clip.get('category', 'Other'),
            'score': clip.get('score', 0),
        })
    result = openrouter_json(
        'You are a social short-form growth editor. Never invent facts that are not implied by the clip hook/title. Return strict JSON.',
        f'''Create platform-ready metadata for these clips.
Language: {language}
Return JSON {{"items":[{{"index":0,"description":"...","hashtags":["#..."],"youtubeTitle":"...","instagramCaption":"...","tiktokCaption":"..."}}]}}.
Descriptions should be concise and natural. Hashtags should be relevant, not spammy. Keep titles under 90 characters.
Clips:\n{payload}'''
    )
    by_index = {int(item.get('index', -1)): item for item in result.get('items', []) if isinstance(item, dict)}
    output = []
    for index, clip in enumerate(clips):
        item = by_index.get(index, {})
        output.append({**clip, 'description': item.get('description', ''), 'hashtags': item.get('hashtags', []), 'youtubeTitle': item.get('youtubeTitle', clip.get('title', '')), 'instagramCaption': item.get('instagramCaption', ''), 'tiktokCaption': item.get('tiktokCaption', '')})
    return output
