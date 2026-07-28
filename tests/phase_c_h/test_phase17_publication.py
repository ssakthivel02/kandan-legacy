import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class Phase17PublicationTests(unittest.TestCase):
    def test_daily_route_and_source_contract_are_declared(self):
        routes = json.loads(
            (ROOT / 'data/site-routes-additions.json').read_text(encoding='utf-8')
        )
        by_path = {record['path']: record for record in routes['records']}
        record = by_path['/daily.html']
        self.assertEqual(record['sourceDataPath'], '/data/daily-darshan.json')
        self.assertEqual(record['status'], 'published-source-linked')
        self.assertTrue(record['readingEligible'])

    def test_builder_and_validator_require_phase17_assets(self):
        builder = (ROOT / 'tools/phase-c-h/build_public_site.py').read_text(
            encoding='utf-8'
        )
        validator = (ROOT / 'tools/phase-c-h/validate_public_site.py').read_text(
            encoding='utf-8'
        )
        for required in (
            'daily.html',
            'assets/css/daily-darshan-2026.css',
            'assets/js/daily-darshan-2026.mjs',
            'assets/js/daily-darshan-core.mjs',
            'data/daily-darshan.json',
            'data/murugan-mantras.json',
            'data/read-aloud-playlist.json',
            'data/search-index.json',
            'schemas/daily-darshan.schema.json',
        ):
            self.assertIn(required, builder)
            self.assertIn(required, validator)

    def test_service_worker_rotates_and_precaches_phase17(self):
        worker = (ROOT / 'service-worker.js').read_text(encoding='utf-8')
        self.assertIn('phase17-daily-darshan', worker)
        for required in (
            '/daily.html',
            '/assets/css/daily-darshan-2026.css',
            '/assets/js/daily-darshan-2026.mjs',
            '/assets/js/daily-darshan-core.mjs',
            '/data/daily-darshan.json',
        ):
            self.assertIn(required, worker)

    def test_daily_route_is_discoverable_and_offline(self):
        homepage = (ROOT / 'index.html').read_text(encoding='utf-8')
        hub = (ROOT / 'platform-hub.html').read_text(encoding='utf-8')
        search = json.loads(
            (ROOT / 'data/search-index.json').read_text(encoding='utf-8')
        )
        self.assertIn('daily.html', homepage)
        self.assertIn('daily.html', hub)
        self.assertTrue(
            any(
                item.get('route') == 'daily.html' and
                item.get('status') == 'published-source-linked'
                for item in search
            )
        )


if __name__ == '__main__':
    unittest.main()
