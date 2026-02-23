from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.services.auth_service import AuthService
from pydantic import BaseModel
from app.core.database import get_db

router = APIRouter()

class GoogleAuthRequest(BaseModel):
    token: str
class UserInfo(BaseModel):
    email: str
    full_name: str
    class Config:
        from_attibutes=True
class GoogleAuthResponse(BaseModel):
    message: str
    access_token: str
    refresh_token: str
    user: UserInfo

@router.post("/google",response_model=GoogleAuthResponse)
def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    data = auth_service.sign_in_or_register_with_google(request.token)
    if not data:
        raise HTTPException(status_code=400, detail="Xác thực Google thất bại!")
    
    return {
        "message": "Đăng nhập thành công",
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"],
        "user": data["user"]
    }