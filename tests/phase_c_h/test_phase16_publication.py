import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class Phase16PublicationTests(unittest.TestCase):
    def test_route_and_source_contract_are_declared(self):
        routes = json.loads(
            (ROOT / 'data/site-routes-additions.json').read_text(encoding='utf-8')
        )
        by_path = {record['path']: record for record in routes['records']}
        record = by_path['/mantra-practice.html']
        self.assertEqual(
            record['sourceDataPath'],
            '/data/mantra-practice.json'
        )
        self.assertEqual(record['status'], 'published-source-linked')

    def test_builder_and_validator_require_phase16_assets(self):
        builder = (ROOT / 'tools/phase-c-h/build_public_site.py').read_text(
            encoding='utf-8'
        )
        validator = (ROOT / 'tools/phase-c-h/validate_public_site.py').read_text(
            encoding='utf-8'
        )
        for required in (
            'mantra-practice.html',
            'assets/css/mantra-practice-2026.css',
            'assets/js/mantra-practice-2026.mjs',
            'assets/js/mantra-practice-core.mjs',
            'data/mantra-practice.json',
            'data/murugan-mantras.json',
            'schemas/mantra-practice.schema.json',
        ):
            self.assertIn(required, builder)
            self.assertIn(required, validator)

    def test_service_worker_rotates_and_precaches_phase16(self):
        worker = (ROOT / 'service-worker.js').read_text(encoding='utf-8')
        self.assertIn('phase15-devotional-listening-phase16-mantra-practice', worker)
        for required in (
            '/mantra-practice.html',
            '/assets/css/mantra-practice-2026.css',
            '/assets/js/mantra-practice-2026.mjs',
            '/assets/js/mantra-practice-core.mjs',
            '/data/mantra-practice.json',
            '/data/murugan-mantras.json',
        ):
            self.assertIn(required, worker)


if __name__ == '__main__':
    unittest.main()
