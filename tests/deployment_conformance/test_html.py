from pathlib import Path
import tempfile
import unittest

from tools.deployment_conformance.html import (
    validate_consumer_html,
)


class HtmlTests(unittest.TestCase):
    def test_module_page_passes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "page.html").write_text(
                '<body data-release="238">'
                '<script type="module" src="assets/js/page.mjs"></script>',
                encoding="utf-8",
            )
            self.assertEqual(validate_consumer_html(
                root,
                {"/page.html": "/assets/js/page.mjs"},
            ), [])

    def test_stale_release_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "page.html").write_text(
                '<body data-release="237">'
                '<script type="module" src="assets/js/page.mjs"></script>',
                encoding="utf-8",
            )
            findings = validate_consumer_html(
                root,
                {"/page.html": "/assets/js/page.mjs"},
            )
            self.assertTrue(any(
                item.rule == "stale-page-release"
                for item in findings
            ))

    def test_versioned_module_page_passes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "page.html").write_text(
                '<body data-release="238">'
                '<script type="module" '
                'src="assets/js/page.mjs?v=20260728-p19-1"></script>',
                encoding="utf-8",
            )
            self.assertEqual(validate_consumer_html(
                root,
                {"/page.html": "/assets/js/page.mjs"},
            ), [])


if __name__ == "__main__":
    unittest.main()
