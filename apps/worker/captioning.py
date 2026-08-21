import re
from pathlib import Path
from typing import Any


def transliterate_word(word: str, language: str) -> str:
    if not language.lower().startswith('hi'):
        return word
    try:
        from indic_transliteration import sanscript
        from indic_transliteration.sanscript import transliterate
        return transliterate(word, sanscript.DEVANAGARI, sanscript.ITRANS).replace('^', '')
    except Exception:
        return word


def ass_time(seconds: float) -> str:
    seconds = max(0.0, seconds)
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f'{h}:{m:02d}:{s:04.1f}'


def escape_ass(text: str) -> str:
    return re.sub(r'[{}]', '', text).replace('\\', '/').strip()


def write_word_pop_ass(words: list[dict[str, Any]], start: float, end: float, language: str, out: Path) -> None:
    selected = []
    for word in words:
        if word['end'] < start or word['start'] > end:
            continue
        selected.append({
            'start': max(0.0, float(word['start']) - start),
            'end': min(end - start, float(word['end']) - start),
            'word': transliterate_word(str(word['word']), language),
        })

    header = '''[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Pop,Arial,78,&H00FFFFFF,&H00FFFFFF,&H00141418,&H80141418,1,0,0,0,100,100,0,0,1,5,1,2,70,70,180,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'''
    events = []
    for item in selected:
        text = escape_ass(item['word'])
        events.append(f"Dialogue: 0,{ass_time(item['start'])},{ass_time(item['end'])},Pop,,0,0,0,,{{\\fad(40,40)\\fscx115\\fscy115}}{text}")
    out.write_text(header + '\n'.join(events) + '\n', encoding='utf-8')
