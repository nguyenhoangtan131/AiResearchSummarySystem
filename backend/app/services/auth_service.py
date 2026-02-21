import os
from typing import Any, Dict, Optional
from requests import Session
from google.oauth2 import id_token
from google.auth.transport import requests
from sqlalchemy import select
from app.models.user import User

class AuthService:
    def __init__(self, db:Session):
        self.db = db
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
    def get_google_user_id(self, token: str):
        try:
            id_info = id_token.verify_oauth2_token(token, requests.Request(), self.client_id)
            return id_info
        except ValueError:
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
    
    def sign_in_or_register_with_google(self, token: str) -> Optional[User]:
        user_info = self.get_google_user_id(token)
        if not user_info:
            return None
        google_id = user_info['sub']
        user = self.get_user_by_google_id(google_id)
        if not user:
            user = self.create_new_google_user(user_info)
        return user