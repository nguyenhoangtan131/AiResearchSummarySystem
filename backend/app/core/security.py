from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.auth_service import JwtService 
from app.models.user import User
jwt_service = JwtService()

async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    print(token)
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


async def get_current_admin(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_stmt = select(User).where(User.id == UUID(user_id))
    user = db.execute(user_stmt).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng",
        )

    if (user.tier or "").strip().lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập khu vực quản trị",
        )

    return user
