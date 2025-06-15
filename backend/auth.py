import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

# 相対インポートでdatabaseとmainからモデルを読み込む
from . import database
from . import main as schemas

# 環境変数からシークレットキー等を読み込む
SECRET_KEY = os.getenv("SECRET_KEY", "a_very_secret_key_that_should_be_in_env_file")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# パスワードコンテキスト
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2の認証スキーム
# /token エンドポイントからトークンを取得することを示す
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    """パスワードが一致するか検証する"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """パスワードをハッシュ化する"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """JWTアクセストークンを生成する"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_account(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)) -> database.Account:
    """
    リクエストからJWTトークンを検証し、現在のログインアカウント情報を返す依存関係。
    これがAPIを保護する「鍵」となる。
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        account_name: str = payload.get("sub")
        if account_name is None:
            raise credentials_exception
        token_data = schemas.Account(account_name=account_name, display_name="", id=0, organization_id=0) # Pydanticモデルの形式を模倣
    except JWTError:
        raise credentials_exception
        
    account = db.query(database.DBAccount).filter(database.DBAccount.account_name == account_name).first()
    if account is None:
        raise credentials_exception
    return account

def get_current_active_account(current_account: database.Account = Depends(get_current_account)) -> database.Account:
    """現在のアカウントがアクティブかどうかもチェックする（将来的な拡張用）"""
    # ここにアカウントが無効化されているかなどのチェックを追加できる
    # if current_account.disabled:
    #     raise HTTPException(status_code=400, detail="Inactive user")
    return current_account
