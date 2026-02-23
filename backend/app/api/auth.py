from typing import List
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

class GoogleAuthResponse(BaseModel):
    message: str
    user: List[UserInfo]

@router.post("/google",response_model=GoogleAuthResponse)
def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    user = auth_service.sign_in_or_register_with_google(request.token)
    
    if not user:
        raise HTTPException(status_code=400, detail="Xác thực Google thất bại!")
    
    return {
        GoogleAuthResponse("Đăng nhập thành công", user)
    }