import unittest

from tools.deployment_conformance.service_worker import (
    validate_service_worker,
)


CONTRACT = {
    "expectedCacheRelease": "243",
    "requiredPrecacheUrls": ["/assets/js/site-directory.mjs"],
    "forbiddenPrecacheUrls": ["/assets/js/site-directory.js"],
}


class ServiceWorkerTests(unittest.TestCase):
    def test_canonical_source_passes(self):
        source = (
            "const RELEASE = '243';\n"
            "const URLS = ['/assets/js/site-directory.mjs'];\n"
        )
        self.assertEqual(
            validate_service_worker(source, CONTRACT),
            [],
        )

    def test_legacy_precache_fails(self):
        source = (
            "const RELEASE = '243';\n"
            "const URLS = ['/assets/js/site-directory.mjs',"
            "'/assets/js/site-directory.js'];\n"
        )
        findings = validate_service_worker(source, CONTRACT)
        self.assertTrue(any(
            item.rule == "forbidden-precache"
            for item in findings
        ))

    def test_versioned_required_precache_passes(self):
        source = (
            "const RELEASE = '243';\n"
            "const URLS = "
            "['/assets/js/site-directory.mjs?v=20260728-p19-1'];\n"
        )
        self.assertEqual(
            validate_service_worker(source, CONTRACT),
            [],
        )


if __name__ == "__main__":
    unittest.main()
