from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.services.auth_service import AuthService, JwtService
from pydantic import BaseModel
from app.core.database import get_db
from fastapi import Response
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()

class GoogleAuthRequest(BaseModel):
    token: str
class UserInfo(BaseModel):
    email: str
    full_name: str
    class Config:
        from_attributes=True

class GoogleAuthResponse(BaseModel):
    message: str
    access_token: str
    refresh_token: str
    user: UserInfo

@router.post("/google", response_model=GoogleAuthResponse)
def google_auth(request: GoogleAuthRequest, response: Response, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    data = auth_service.sign_in_or_register_with_google(request.token)
    
    if not data:
        raise HTTPException(status_code=400, detail="Xác thực Google thất bại!")
    
    response.set_cookie(
        key="access_token",
        value=data["access_token"],
        httponly=True,
        max_age=3600 * 24,
        samesite="lax",
        secure=False
    )
    response.set_cookie(
        key="refresh_token",
        value=data["refresh_token"],
        httponly=True,
        max_age=3600 * 24 * 30,
        samesite="lax",
        path="/auth/refresh",
        secure=False
    )

    return {
        "message": "Đăng nhập thành công",
        "access_token": "cookie",
        "refresh_token": "cookie",
        "user": data["user"]
    }

class CheckMeResponse(BaseModel):
    email: str
    full_name: str

    class Config:
        from_attributes = True

@router.get("/me", response_model=CheckMeResponse)
async def get_me(
    user_id: UUID = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_stmt = select(User).where(User.id == user_id)
    user = db.execute(user_stmt).scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        
    return CheckMeResponse(user)

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        httponly=True,
        samesite="lax",
        secure=False
    )

    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        samesite="lax",
        path="/auth/refresh"
    )
    return {"message": "Đăng xuất thành công"}
