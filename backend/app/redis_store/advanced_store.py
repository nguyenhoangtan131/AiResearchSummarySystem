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

    def generated_chapter_key(self, article_id: str, chapter_number: int) -> str:
        return f"advanced:article:{article_id}:generated:chapter:{chapter_number}"

    def chapter_context_key(self, article_id: str, chapter_number: int) -> str:
        return f"advanced:article:{article_id}:context:chapter:{chapter_number}"

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

    def save_generated_chapter(
        self,
        article_id: str,
        chapter_number: int,
        payload: dict[str, Any],
    ) -> str:
        key = self.generated_chapter_key(article_id, chapter_number)
        self.cache.set_json(key, payload)
        return key

    def get_generated_chapter(
        self,
        article_id: str,
        chapter_number: int,
    ) -> dict[str, Any] | None:
        return self.cache.get_json(self.generated_chapter_key(article_id, chapter_number))

    def save_chapter_context(
        self,
        article_id: str,
        chapter_number: int,
        payload: dict[str, Any],
    ) -> str:
        key = self.chapter_context_key(article_id, chapter_number)
        self.cache.set_json(key, payload)
        return key

    def get_chapter_context(
        self,
        article_id: str,
        chapter_number: int,
    ) -> dict[str, Any] | None:
        return self.cache.get_json(self.chapter_context_key(article_id, chapter_number))

    def clear_chapter_recommendations(self, session_id: str, chapter_number: int) -> None:
        keys = [
            self.chapter_step_key(session_id, chapter_number, "titles"),
            self.chapter_step_key(session_id, chapter_number, "briefs"),
            self.chapter_step_key(session_id, chapter_number, "guides"),
            self.chapter_step_key(session_id, chapter_number, "sources"),
        ]
        if keys:
            self.cache.client.delete(*keys)

    def clear_generated_chapter(self, article_id: str, chapter_number: int) -> None:
        self.cache.client.delete(self.generated_chapter_key(article_id, chapter_number))

    def clear_chapter_context(self, article_id: str, chapter_number: int) -> None:
        self.cache.client.delete(self.chapter_context_key(article_id, chapter_number))

    def clear_generated_buffers(self, article_id: str, chapter_count: int) -> None:
        keys: list[str] = []
        for chapter_number in range(1, max(chapter_count, 0) + 1):
            keys.append(self.generated_chapter_key(article_id, chapter_number))
            keys.append(self.chapter_context_key(article_id, chapter_number))
        if keys:
            self.cache.client.delete(*keys)
