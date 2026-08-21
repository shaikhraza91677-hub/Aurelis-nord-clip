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


def write_captions(words: list[dict[str, Any]], start: float, end: float, language: str, out: Path, style: str = 'Word Pop', position: str = 'bottom', size: str = 'medium', color: str = '#FFFFFF') -> None:
    selected = []
    for word in words:
        if word['end'] < start or word['start'] > end:
            continue
        selected.append({'start': max(0.0, float(word['start']) - start), 'end': min(end - start, float(word['end']) - start), 'word': transliterate_word(str(word['word']), language)})

    fontsize = {'small': 56, 'medium': 78, 'large': 96}.get(size, 78)
    alignment = {'top': 8, 'center': 5, 'bottom': 2}.get(position, 2)
    margin_v = {'top': 150, 'center': 70, 'bottom': 180}.get(position, 180)
    primary = color.replace('#', '&H').upper()
    if len(primary) == 7:
        primary = '&H00' + primary[1:]

    header = f'''[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Main,Arial,{fontsize},{primary},&H00FFFFFF,&H00141418,&H80141418,1,0,0,0,100,100,0,0,1,5,1,{alignment},70,70,{margin_v},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'''
    effects = {
        'Word Pop': r'{\\fad(40,40)\\fscx115\\fscy115}',
        'Highlight': r'{\\bord6\\3c&H00000000\\fad(30,30)}',
        'Fade': r'{\\fad(180,180)}',
        'Bounce': r'{\\t(0,120,\\fscx125\\fscy125)\\t(120,240,\\fscx100\\fscy100)}',
    }
    effect = effects.get(style, effects['Word Pop'])
    events = [f"Dialogue: 0,{ass_time(item['start'])},{ass_time(item['end'])},Main,,0,0,0,,{effect}{escape_ass(item['word'])}" for item in selected]
    out.write_text(header + '\n'.join(events) + '\n', encoding='utf-8')


def write_word_pop_ass(words: list[dict[str, Any]], start: float, end: float, language: str, out: Path) -> None:
    write_captions(words, start, end, language, out, style='Word Pop')
