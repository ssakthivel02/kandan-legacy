import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class Phase19PublicationTests(unittest.TestCase):
    def test_temple_directory_contract_matches_source_indexes(self):
        contract = json.loads(
            (ROOT / 'data/temple-directory.json').read_text(encoding='utf-8')
        )
        guides = json.loads(
            (ROOT / 'data/temples/index.json').read_text(encoding='utf-8')
        )
        regional = json.loads(
            (ROOT / 'data/temples/regional/index.json').read_text(
                encoding='utf-8'
            )
        )
        self.assertEqual(guides['count'], 6)
        self.assertEqual(regional['count'], 10)
        self.assertEqual(contract['totalDiscoverableRecords'], 16)
        self.assertEqual(
            set(contract['regionalRecordIds']),
            {item['id'] for item in regional['records']}
        )

    def test_every_regional_identity_record_is_bounded_and_source_linked(self):
        directory = json.loads(
            (ROOT / 'data/temples/regional/index.json').read_text(
                encoding='utf-8'
            )
        )
        for item in directory['records']:
            record = json.loads(
                (
                    ROOT / 'data/temples/regional' / f"{item['id']}.json"
                ).read_text(encoding='utf-8')
            )
            self.assertTrue(record['official_source'].startswith('https://'))
            self.assertEqual(
                record['publication']['status'],
                'identity_verified_content_review_required'
            )
            self.assertEqual(len(record['pending']), 8)
            self.assertEqual(
                record['image']['status'],
                'licensed_asset_required'
            )

    def test_builder_declares_previously_missing_reader_dependencies(self):
        builder = (
            ROOT / 'tools/phase-c-h/build_public_site.py'
        ).read_text(encoding='utf-8')
        for path in (
            'data/reading-workspace.json',
            'data/effective-route-registry-runtime.json',
            'data/temple-directory.json',
            'data/phase19-content-reliability.json'
        ):
            self.assertIn(path, builder)

    def test_search_exposes_exactly_ten_bounded_regional_temples(self):
        records = json.loads(
            (ROOT / 'data/search-index.json').read_text(encoding='utf-8')
        )
        regional = [
            item for item in records
            if item.get('kind') == 'Temple'
            and item.get('status') == 'identity-verified-review-required'
        ]
        self.assertEqual(len(regional), 10)
        for item in regional:
            self.assertIn('remain under review', item['summary'])

    def test_phase19_contract_prohibits_content_inflation(self):
        contract = json.loads(
            (
                ROOT / 'data/phase19-content-reliability.json'
            ).read_text(encoding='utf-8')
        )
        self.assertEqual(contract['contentSafety']['generatedSacredText'], 0)
        self.assertEqual(
            contract['contentSafety']['placeholderTempleGuidesPublished'],
            0
        )


if __name__ == '__main__':
    unittest.main()
