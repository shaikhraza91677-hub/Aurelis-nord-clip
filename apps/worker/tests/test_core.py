import tempfile
import unittest
from pathlib import Path

from captioning import ass_time, escape_ass
from clip_discovery import discover_moments
from smart_crop import crop_filter


class CoreTests(unittest.TestCase):
    def test_ass_time(self):
        self.assertEqual(ass_time(61.25), '0:01:01.2')

    def test_escape_ass(self):
        self.assertEqual(escape_ass('{hello}'), 'hello')

    def test_crop_filter(self):
        self.assertIn('scale=1080:1920', crop_filter(1920, 1080, 'smart', 0.5))

    def test_prompt_discovery_rejects_invalid_ranges(self):
        import worker
        original = worker.openrouter_json
        try:
            worker.openrouter_json = lambda *_args, **_kwargs: {
                'clips': [
                    {'start': 10, 'end': 5, 'score': 90, 'title': 'bad'},
                    {'start': 0, 'end': 20, 'score': 80, 'title': 'good'},
                    {'start': 5, 'end': 25, 'score': 70, 'title': 'overlap'},
                ]
            }
            result = discover_moments({'language': 'en', 'text': 'hello'})
            self.assertEqual(len(result), 1)
            self.assertEqual(result[0]['title'], 'good')
        finally:
            worker.openrouter_json = original


if __name__ == '__main__':
    unittest.main()
