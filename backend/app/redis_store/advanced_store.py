from typing import Any

from app.core.cache import RedisCache


class AdvancedRedisStore:
    def __init__(self) -> None:
        self.cache = RedisCache()

    @property
    def ttl_seconds(self) -> int:
        return self.cache.ttl_seconds

    def structure_key(self, session_id: str) -> str:
        return f"advanced:{session_id}:structure"

    def chapter_step_key(self, session_id: str, chapter_number: int, step: str) -> str:
        return f"advanced:{session_id}:chapter:{chapter_number}:{step}"

    def save_structure(self, session_id: str, payload: dict[str, Any]) -> str:
        key = self.structure_key(session_id)
        self.cache.set_json(key, payload)
        return key

    def get_structure(self, session_id: str) -> dict[str, Any] | None:
        return self.cache.get_json(self.structure_key(session_id))

    def save_chapter_step(
        self,
        session_id: str,
        chapter_number: int,
        step: str,
        payload: dict[str, Any],
    ) -> str:
        key = self.chapter_step_key(session_id, chapter_number, step)
        self.cache.set_json(key, payload)
        return key

    def get_chapter_step(
        self,
        session_id: str,
        chapter_number: int,
        step: str,
    ) -> dict[str, Any] | None:
        return self.cache.get_json(self.chapter_step_key(session_id, chapter_number, step))

    def delete_key(self, key: str) -> None:
        self.cache.client.delete(key)

    def clear_chapter_recommendations(self, session_id: str, chapter_number: int) -> None:
        keys = [
            self.chapter_step_key(session_id, chapter_number, "titles"),
            self.chapter_step_key(session_id, chapter_number, "briefs"),
            self.chapter_step_key(session_id, chapter_number, "guides"),
            self.chapter_step_key(session_id, chapter_number, "sources"),
        ]
        if keys:
            self.cache.client.delete(*keys)
