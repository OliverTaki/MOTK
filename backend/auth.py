import os
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Path
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel

# 相対インポート
from . import database

SECRET_KEY = os.getenv("SECRET_KEY", "a_very_secret_key_that_should_be_in_env_file")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class TokenData(BaseModel):
    account_name: Optional[str] = None

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire_time = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire_time})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_account(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)) -> database.Account:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        account_name: Optional[str] = payload.get("sub")
        if account_name is None:
            raise credentials_exception
        token_data = TokenData(account_name=account_name)
    except JWTError:
        raise credentials_exception
        
    account = db.query(database.Account).filter(database.Account.account_name == token_data.account_name).first()
    if account is None:
        raise credentials_exception
    return account

def get_current_active_account(current_account: database.Account = Depends(get_current_account)) -> database.Account:
    return current_account

def require_role(required_roles: List[str]):
    def role_checker(current_account: database.Account = Depends(get_current_active_account)):
        if current_account.account_type not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {required_roles}",
            )
        return current_account
    return role_checker

def get_project_from_path(
    project_id: int = Path(..., title="The ID of the project to access"),
    current_account: database.Account = Depends(get_current_active_account),
    db: Session = Depends(database.get_db)
) -> database.Project:
    """
    URLパスからproject_idを取得し、アクセス権を検証し、
    成功した場合にプロジェクトオブジェクトを返す、複合的な依存関係。
    """
    project = db.query(database.Project).filter(database.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail=f"Project with id {project_id} not found.")

    if current_account.account_type == 'admin':
        return project

    membership = db.query(database.ProjectMember).filter(
        database.ProjectMember.project_id == project_id,
        database.ProjectMember.account_id == current_account.id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this project.",
        )
        
    return project
