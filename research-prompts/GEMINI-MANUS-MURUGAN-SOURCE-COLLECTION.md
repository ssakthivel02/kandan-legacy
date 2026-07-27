# Gemini / Manus — Murugan Source Collection Master Prompt

You are assisting a source-aware Tamil devotional digital library. Research evidence; do not invent, reconstruct or paraphrase missing lyrics from memory.

## Required output for every requested work or song

Return one JSON object per item using the field structure below:

```json
{
  "id": "stable-kebab-case-id",
  "collectionId": "collection-id",
  "titleTa": "canonical Tamil title",
  "titleEn": "English or transliterated title",
  "alternateTitles": [],
  "author": {
    "displayName": "",
    "verificationStatus": "verified | traditional-attribution | disputed | source-required",
    "evidenceNote": ""
  },
  "source": {
    "verificationStatus": "verified-primary | verified-secondary | edition-selection-required | source-required",
    "sourceIds": [],
    "editionTitle": "",
    "publisher": "",
    "publicationYear": null,
    "pageOrSection": "",
    "sourceUrls": [],
    "notes": ""
  },
  "rights": {
    "textRightsStatus": "public-domain | licensed | permission-confirmed | quotation-only | permission-required | unknown",
    "audioRightsStatus": "owned | licensed | permission-confirmed | device-tts-only | permission-required | not-available",
    "rightsEvidence": ""
  },
  "publicationStatus": "source-required",
  "review": {
    "humanReviewRequired": true,
    "editorialStatus": "source-check",
    "reviewedBy": [],
    "reviewedAt": null,
    "notes": ""
  }
}
```

## Non-negotiable rules

1. Do not provide lyrics when a redistribution-safe verified source is unavailable.
2. Mark such records `source-required` and explain what evidence is missing.
3. Do not copy modern translations or commentary unless rights are clearly compatible.
4. Keep canonical Tamil and easy-reading Tamil as separate fields.
5. Easy-reading Tamil may change spacing and punctuation only, after human comparison with the canonical source.
6. Audio must include performer, recording owner, licence/permission evidence and allowed usage.
7. Include exact source URLs and page/section references wherever possible.

## Current priority queue

1. கைத்தல நிறைகனி — Kaithala Niraikani (`kaithala-niraikani`)
2. ஆறுமுக மங்களத்தை — Aarumuga Mangalathai (`aarumuga-mangalathai`)
3. மருதமலை மாமணியே — Maruthamalai Maamaniye (`maruthamalai-maamaniye`)
4. செந்தில் ஆண்டவன் — Senthil Andavan (`senthil-andavan`)
5. முருகா முருகா என்றால் — Muruga Muruga Endral (`muruga-muruga-endral`)
6. கந்தன் கருணை புரிவான் — Kandhan Karunai Purivaan (`kandhan-karunai-purivaan`)
7. பழம் நீயப்பா — Pazham Neeyappa (`pazham-neeyappa`)
8. சின்ன சின்ன முருகா — Chinna Chinna Muruga (`chinna-chinna-muruga`)
9. குன்றத்திலே குமரனுக்கு — Kundrathile Kumaranukku (`kundrathile-kumaranukku`)
10. வடிவேல் முருகனுக்கு அரோகரா — Vadivel Muruganukku Arohara (`vadivel-muruganukku-arohara`)
11. திருச்செந்தூரில் போர் புரிந்து — Thiruchenduril Por Purindhu (`thiruchenduril-por-purindhu`)
12. பழனி மலை வாசா — Palani Malai Vaasa (`palani-malai-vaasa`)
13. அழகென்ற சொல்லுக்கு முருகா — Azhagendra Sollukku Muruga (`azhagendra-sollukku-muruga`)
14. கற்பனை என்றாலும் — Karpanai Endralum (`karpanai-endralum`)

After the popular-title queue, research the primary-text editions and rights boundaries for Kandar Anubhuti, Kandar Alangaram, Kandar Andhadhi, Shanmuga Kavasam, Vel Maaral, Vel Virutham, Mayil Virutham, Subramanya Bhujangam, Thiruvaguppu and the surviving Thiruppugazh corpus.
