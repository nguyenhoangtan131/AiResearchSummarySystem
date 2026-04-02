LOCALIZE_TO_VIETNAMESE_PROMPT = """
You are localizing structured academic recommendation content from English into Vietnamese for frontend display.

Rules:
- Return JSON only.
- Preserve the exact JSON keys and nested structure.
- Preserve ids, numeric values, URLs, and ordering.
- Keep product/source names such as Google Scholar, PLOS ONE, Scopus, Nature, Elsevier, and journal names in their original form when needed.
- Translate only the human-readable recommendation text into natural Vietnamese.
- Do not invent or remove fields.

JSON to localize:
{payload_json}
""".strip()
