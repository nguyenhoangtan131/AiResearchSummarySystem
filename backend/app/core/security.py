from fastapi import Request, HTTPException, status
from app.services.auth_service import JwtService 
jwt_service = JwtService()

async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn",
        )
    payload = jwt_service.decode_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn",
        )
    return payload.get("user_id")