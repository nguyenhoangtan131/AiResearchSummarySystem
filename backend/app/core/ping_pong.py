import asyncio
import httpx
from app.core.logging import logger
from app.core.cache import RedisCache

REDIS_PING_PONG_ACTIVE = "admin:ping_pong_active"
REDIS_PING_PONG_URL = "admin:ping_pong_url"

_ping_pong_task: asyncio.Task | None = None

async def _ping_loop() -> None:
    logger.info("[PingPong] Bắt đầu vòng lặp ping giữ server.")
    async with httpx.AsyncClient(timeout=10) as client:
        while True:
            try:
                cache = RedisCache()
                redis_client = cache.client
                if redis_client:
                    active = redis_client.get(REDIS_PING_PONG_ACTIVE)
                    url = redis_client.get(REDIS_PING_PONG_URL)

                    if active == "true" and url:
                        # Convert bytes to string if needed
                        url_str = url.decode("utf-8") if isinstance(url, bytes) else str(url)
                        logger.info("[PingPong] Đang gửi ping tự động tới: %s", url_str)
                        response = await client.get(url_str)
                        logger.info("[PingPong] Kết quả ping: %s", response.status_code)
                    else:
                        logger.debug("[PingPong] Tính năng đang tắt hoặc chưa cấu hình URL.")
                else:
                    logger.warning("[PingPong] Không kết nối được Redis client.")
            except Exception as exc:
                logger.warning("[PingPong] Lỗi trong vòng lặp ping: %s", exc)
            
            # Đợi 10 phút (600 giây). Chia làm các quãng ngủ nhỏ 10 giây để phản ứng nhanh khi tắt/bật
            for _ in range(60):
                await asyncio.sleep(10)

def start_ping_pong() -> None:
    global _ping_pong_task
    if _ping_pong_task is not None and not _ping_pong_task.done():
        logger.info("[PingPong] Task ping đang chạy, không khởi động lại.")
        return
    
    _ping_pong_task = asyncio.create_task(_ping_loop())
    logger.info("[PingPong] Đã khởi tạo background task ping thành công.")

def stop_ping_pong() -> None:
    global _ping_pong_task
    if _ping_pong_task is not None and not _ping_pong_task.done():
        _ping_pong_task.cancel()
        _ping_pong_task = None
        logger.info("[PingPong] Đã yêu cầu dừng task ping thành công.")
