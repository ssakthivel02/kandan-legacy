import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class Phase18PublicationTests(unittest.TestCase):
    def setUp(self):
        self.payload = json.loads(
            (ROOT / 'data/responsive-homepage-images.json').read_text(
                encoding='utf-8'
            )
        )
        self.homepage = (ROOT / 'index.html').read_text(encoding='utf-8')

    def test_manifest_declares_exact_responsive_asset_set(self):
        items = self.payload['items']
        self.assertEqual(len(items), 10)
        self.assertEqual(len({item['id'] for item in items}), 10)
        self.assertEqual(len({item['path'] for item in items}), 10)
        for item in items:
            path = ROOT / item['path']
            self.assertTrue(path.is_file(), item['path'])
            self.assertEqual(path.stat().st_size, item['bytes'])
            self.assertLessEqual(item['bytes'], 250000)
            self.assertFalse(item['documentaryPhoto'])
            self.assertEqual(item['rightsStatus'], 'site-use-approved')

    def test_homepage_uses_one_responsive_hero_picture(self):
        self.assertEqual(self.homepage.count('<picture class="hero-visual"'), 1)
        self.assertIn(
            'murugan-family-hero-mobile.webp',
            self.homepage
        )
        self.assertIn(
            'murugan-family-hero-desktop.webp',
            self.homepage
        )
        self.assertNotIn('class="hero-murugan-art"', self.homepage)
        self.assertNotIn('class="hero-temple-art"', self.homepage)

    def test_every_collection_has_unique_sized_lazy_image(self):
        paths = [
            item['path']
            for item in self.payload['items']
            if item['role'] == 'collection-card'
        ]
        self.assertEqual(len(paths), 8)
        for path in paths:
            self.assertEqual(self.homepage.count(path), 1)
        self.assertEqual(
            self.homepage.count('width="1280" height="720" loading="lazy"'),
            8
        )

    def test_truth_boundary_is_published(self):
        sources = (ROOT / 'sources.html').read_text(encoding='utf-8')
        gallery = json.loads(
            (ROOT / 'data/media-gallery.json').read_text(encoding='utf-8')
        )
        self.assertIn('ai-assisted-visual-boundary', sources)
        phase18 = [
            item for item in gallery['items']
            if item['id'].startswith('phase18-')
        ]
        self.assertEqual(len(phase18), 9)
        self.assertTrue(all(not item['documentaryPhoto'] for item in phase18))

    def test_offline_cache_and_public_builder_require_assets(self):
        worker = (ROOT / 'service-worker.js').read_text(encoding='utf-8')
        builder = (
            ROOT / 'tools/phase-c-h/build_public_site.py'
        ).read_text(encoding='utf-8')
        validator = (
            ROOT / 'tools/phase-c-h/validate_public_site.py'
        ).read_text(encoding='utf-8')
        self.assertIn('phase18-responsive-imagery', worker)
        for item in self.payload['items']:
            public_path = f"/{item['path']}"
            self.assertIn(public_path, worker)
            self.assertIn(item['path'], builder)
            self.assertIn(item['path'], validator)


if __name__ == '__main__':
    unittest.main()
