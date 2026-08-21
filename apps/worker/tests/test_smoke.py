import unittest
from pathlib import Path
from captioning import ass_time, escape_ass
from smart_crop import crop_filter

class WorkerSmokeTests(unittest.TestCase):
    def test_ass_time(self):
        self.assertEqual(ass_time(0), '0:00:0.0')
        self.assertEqual(ass_time(65.25), '0:01:05.2')
    def test_escape_ass(self):
        self.assertEqual(escape_ass('{hello}'), 'hello')
    def test_crop_filter_vertical(self):
        value=crop_filter(1920,1080,'smart',0.5)
        self.assertIn('scale=1080:1920',value)
        self.assertIn('crop=',value)

if __name__=='__main__':
    unittest.main()
