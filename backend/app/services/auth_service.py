from datetime import datetime, timedelta, timezone
import os
from typing import Any, Dict, Optional
import jwt
from sqlalchemy.orm import Session
from google.oauth2 import id_token
import requests
from sqlalchemy import select
from app.models.user import User


class JwtService:
    def __init__(self):
        self.SECRET_KEY = os.getenv("SECRET_KEY","")
        self.ALGORITHM = "HS256"
        self.ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
        self.REFRESH_TOKEN_EXPIRE_DAYS = 30
    def create_access_token(self, data: dict):
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, self.SECRET_KEY, algorithm=self.ALGORITHM)
    def create_refresh_token(self, data: dict):
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(days=self.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, self.SECRET_KEY, algorithm=self.ALGORITHM)
    def decode_token(self, token: str):
        try:
            payload = jwt.decode(token, self.SECRET_KEY, algorithms=[self.ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

class AuthService(JwtService):
    """
    Why auth inheritance jwt:
    - Directly access token generation methods (create_access_token, create_refresh_token) via 'self' 
    to keep code concise.
    - Since Authentication (Auth) and Session Management (JWT) are functionally interdependent, grouping 
    them simplifies the logic for issuing and verifying credentials.
    - Stateless Consistency: Ensures all auth-related tasks follow the same stateless 
    principles and shared security configurations (SECRET_KEY, ALGORITHM) defined in the base class.
    """
    def __init__(self, db:Session):
        super().__init__()
        self.db = db
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
    def get_google_user_id(self, token: str):
        try:
            response = requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code == 200:
                return response.json() 
            return None
        except Exception as e:
            print(f"Google auth error when trying to get google_id: {e}")
            return None
            
    def get_user_by_google_id(self, google_id: str) -> Optional[User]:
        user_stmt = select(User).where(User.google_id == google_id)
        return self.db.execute(user_stmt).scalar_one_or_none()
    
    def create_new_google_user(self, user_info: Dict[str, Any]) -> User:
        new_user = User(
            google_id=user_info['sub'],
            email=user_info.get('email'),
            full_name=user_info.get('name'),
        )
        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)
        return new_user
    
    def sign_in_or_register_with_google(self, token: str) -> Dict[str, Any]:
        user_info = self.get_google_user_id(token)
        if not user_info:
            return None
        google_id = user_info['sub']
        user = self.get_user_by_google_id(google_id)
        if not user:
            user = self.create_new_google_user(user_info)

        data = {"user_id": f"{user.id}"}
        access_token = self.create_access_token(data)
        refresh_token = self.create_refresh_token(data)
        return {
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token
        }


