import json
import os
from typing import Any

from dotenv import load_dotenv
from redis import Redis
from redis.exceptions import RedisError

from app.core.logging import logger

load_dotenv()


class RedisCache:
    def __init__(self) -> None:
        redis_url = os.getenv("REDIS_URL")
        if not redis_url:
            raise ValueError("REDIS_URL is missing.")

        self.ttl_seconds = int(os.getenv("ADVANCED_CACHE_TTL_SECONDS", "21600"))
        self.client = Redis.from_url(redis_url, decode_responses=True)
        logger.info("[Redis] Cache client initialized with ttl=%ss", self.ttl_seconds)

    def set_json(self, key: str, value: dict[str, Any], ttl_seconds: int | None = None) -> None:
        payload = json.dumps(value, ensure_ascii=False)
        effective_ttl = ttl_seconds or self.ttl_seconds
        self.client.setex(key, effective_ttl, payload)
        logger.info("[Redis] SET key=%s ttl=%s", key, effective_ttl)

    def get_json(self, key: str) -> dict[str, Any] | None:
        payload = self.client.get(key)
        if payload is None:
            logger.info("[Redis] GET key=%s result=MISS", key)
            return None
        logger.info("[Redis] GET key=%s result=HIT", key)
        return json.loads(payload)

    def ping(self) -> bool:
        try:
            ok = bool(self.client.ping())
            logger.info("[Redis] PING result=%s", ok)
            return ok
        except RedisError:
            logger.exception("[Redis] PING failed")
            return False
