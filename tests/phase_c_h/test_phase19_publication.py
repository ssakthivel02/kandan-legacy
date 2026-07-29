import json
import re
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
        self.assertEqual(regional['count'], 18)
        self.assertEqual(contract['totalDiscoverableRecords'], 24)
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
            'data/reading-notes.json',
            'data/reading-workspace.json',
            'data/effective-route-registry-runtime.json',
            'data/temple-directory.json',
            'data/phase19-content-reliability.json'
        ):
            self.assertIn(path, builder)

    def test_reading_notes_configuration_is_present_and_private(self):
        config = json.loads(
            (ROOT / 'data/reading-notes.json').read_text(encoding='utf-8')
        )
        self.assertEqual(config['storageKey'], 'osb-reading-notes-v1')
        self.assertEqual(config['maximumItems'], 100)
        self.assertEqual(config['maximumNoteLength'], 500)
        self.assertEqual(
            [item['id'] for item in config['allowedKinds']],
            ['reflection', 'question', 'practice', 'reference'],
        )
        self.assertTrue(any(
            'No account, analytics, cloud synchronization' in limitation
            for limitation in config['limitations']
        ))

    def test_search_exposes_exactly_eighteen_bounded_regional_temples(self):
        records = json.loads(
            (ROOT / 'data/search-index.json').read_text(encoding='utf-8')
        )
        regional = [
            item for item in records
            if item.get('kind') == 'Temple'
            and item.get('status') == 'identity-verified-review-required'
        ]
        self.assertEqual(len(regional), 18)
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

    def test_homepage_versions_every_modified_reveal_asset(self):
        home = (ROOT / 'index.html').read_text(encoding='utf-8')
        for asset in (
            'premium-platform-2026.css',
            'phase18-responsive-imagery-2026.css',
            'premium-platform-2026.mjs',
            'premium-home-runtime.mjs',
        ):
            self.assertRegex(
                home,
                rf'{re.escape(asset)}\?v=20260728-p19-1',
                msg=f'{asset} must be cache-versioned in the homepage',
            )

    def test_phase20_contract_and_corpus_progress_are_fail_closed(self):
        contract = json.loads(
            (ROOT / 'data/phase20-content-expansion.json').read_text(
                encoding='utf-8'
            )
        )
        progress = json.loads(
            (ROOT / 'data/thiruppugazh-corpus-progress.json').read_text(
                encoding='utf-8'
            )
        )
        self.assertEqual(contract['requirements']['discoverableTempleRecords'], 24)
        self.assertEqual(contract['requirements']['deviceSpeechPlaylistRecords'], 16)
        self.assertEqual(progress['programmeTarget'], 1300)
        self.assertEqual(progress['published']['count'], 12)
        self.assertEqual(progress['quarantinedOcrDrafts']['status'], 'not-published')
        self.assertEqual(
            progress['excludedEmptyShells']['status'],
            'not-counted-as-songs'
        )
        self.assertFalse(
            progress['calculationPolicy']['completionPercentagePublished']
        )

    def test_phase20_official_identifiers_are_unique(self):
        directory = json.loads(
            (ROOT / 'data/temples/regional/index.json').read_text(
                encoding='utf-8'
            )
        )
        identifiers = [
            item['official_temple_id'] for item in directory['records']
        ]
        self.assertEqual(len(identifiers), len(set(identifiers)))
        self.assertEqual(
            {
                item['id'] for item in directory['records']
                if item.get('release_origin') == 'Phase 20'
            },
            {
                'thiruporur', 'vadapalani', 'siruvapuri', 'kandhakottam',
                'thiruverumbur', 'pollachi', 'kalipatti', 'sivanmalai'
            }
        )


if __name__ == '__main__':
    unittest.main()
