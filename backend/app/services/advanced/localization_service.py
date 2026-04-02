import json
import os
from typing import Any

from google import genai

from app.core.logging import logger
from app.prompts.advanced.localize_prompt import LOCALIZE_TO_VIETNAMESE_PROMPT


class AdvancedLocalizationService:
    def __init__(self) -> None:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is missing.")

        self.client = genai.Client(api_key=api_key)
        self.model_name = "gemini-3-flash-preview"

    def localize_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        logger.info("[Advanced] Localizing payload to Vietnamese display content")
        try:
            raw_response = self.client.models.generate_content(
                model=self.model_name,
                contents=LOCALIZE_TO_VIETNAMESE_PROMPT.format(
                    payload_json=json.dumps(payload, ensure_ascii=False),
                ),
            )
            cleaned = raw_response.text.replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned)
        except Exception:
            logger.exception("[Advanced] Localization failed, returning original payload for display fallback")
            return payload
