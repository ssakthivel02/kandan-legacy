import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class Phase15PublicationTests(unittest.TestCase):
    def test_routes_and_publication_contract_are_declared(self):
        routes = json.loads(
            (ROOT / 'data/site-routes-additions.json').read_text(encoding='utf-8')
        )
        by_path = {record['path']: record for record in routes['records']}
        self.assertEqual(routes['recordCount'], len(routes['records']))
        self.assertEqual(
            by_path['/devotional-listening.html']['sourceDataPath'],
            '/data/devotional-listening-paths.json'
        )
        self.assertEqual(
            by_path['/song-source-requests.html']['status'],
            'source-register'
        )

    def test_builder_and_validator_require_phase15_assets(self):
        builder = (ROOT / 'tools/phase-c-h/build_public_site.py').read_text(
            encoding='utf-8'
        )
        validator = (ROOT / 'tools/phase-c-h/validate_public_site.py').read_text(
            encoding='utf-8'
        )
        for required in (
            'devotional-listening.html',
            'song-source-requests.html',
            'data/devotional-listening-paths.json',
            'data/song-source-requests.json',
            'schemas/devotional-listening-path.schema.json',
            'schemas/song-source-request.schema.json',
        ):
            self.assertIn(required, builder)
            self.assertIn(required, validator)

    def test_service_worker_rotates_and_precaches_phase15(self):
        worker = (ROOT / 'service-worker.js').read_text(encoding='utf-8')
        self.assertIn('phase15-devotional-listening', worker)
        self.assertIn('/devotional-listening.html', worker)
        self.assertIn('/song-source-requests.html', worker)
        self.assertIn('/data/devotional-listening-paths.json', worker)
        self.assertIn('/data/song-source-requests.json', worker)


if __name__ == '__main__':
    unittest.main()
