import datetime
from datetime import timedelta # <<< この行を追加しました！
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

# --- データベースモデルのインポート ---
from .database import (
    SessionLocal, get_db,
    Organization as DBOrganization,
    Project as DBProject,
    Account as DBAccount,
    ProjectMember as DBProjectMember,
    Shot as DBShot,
    Asset as DBAsset,
    Task as DBTask,
)

# --- 新しく作成した認証モジュールをインポート ---
from . import auth

from pydantic import BaseModel

app = FastAPI(
    title="MOTK Production Management System API",
    description="API with Authentication Layer. Use the /token endpoint to log in."
)

# --- CORS設定 ---
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas (データ検証モデル) ---

# --- Token Schema (NEW) ---
class Token(BaseModel):
    access_token: str
    token_type: str

class OrganizationBase(BaseModel):
    name: str
class OrganizationCreate(OrganizationBase): pass
class Organization(OrganizationBase):
    id: int; status: str
    class Config: from_attributes = True

class AccountBase(BaseModel):
    account_name: str; display_name: str; account_type: str = "artist"
class AccountCreate(AccountBase):
    password: str; organization_id: int
class Account(AccountBase):
    id: int; organization_id: int
    class Config: from_attributes = True

class ProjectMemberBase(BaseModel):
    display_name: str; department: Optional[str] = "Unassigned"; role: str = "Member"
class ProjectMemberCreate(ProjectMemberBase):
    project_id: int; account_id: Optional[int] = None
class ProjectMember(ProjectMemberBase):
    id: int; project_id: int; account_id: Optional[int]; account: Optional[Account] = None
    class Config: from_attributes = True

class ProjectBase(BaseModel):
    name: str
class ProjectCreate(ProjectBase):
    organization_id: int
class Project(ProjectBase):
    id: int; organization_id: int; status: str; members: List[ProjectMember] = []
    class Config: from_attributes = True

class ShotBase(BaseModel):
    name: str
class ShotCreate(ShotBase):
    project_id: int
class Shot(ShotBase):
    id: int; project_id: int; status: str
    class Config: from_attributes = True

class AssetBase(BaseModel):
    name: str; asset_type: str
class AssetCreate(AssetBase):
    project_id: int
class Asset(AssetBase):
    id: int; project_id: int; status: str; asset_type: str
    class Config: from_attributes = True

class TaskBase(BaseModel):
    name: str; status: str = "todo"; start_date: Optional[datetime.date] = None; end_date: Optional[datetime.date] = None
class TaskCreate(TaskBase):
    assigned_to_id: int; shot_id: Optional[int] = None; asset_id: Optional[int] = None
class Task(TaskBase):
    id: int; assigned_to_id: int; shot_id: Optional[int]; asset_id: Optional[int]
    assigned_to: ProjectMember
    class Config: from_attributes = True

# --- API Endpoints ---

@app.get("/", tags=["Root"])
def read_root(): return {"message": "MOTK Backend is running with Authentication!"}

# --- Authentication Endpoint (NEW) ---
@app.post("/token", response_model=Token, tags=["Authentication"])
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    ユーザー名とパスワードで認証し、アクセストークンを返す。
    FastAPIのDocsから試すときは、右上のAuthorizeボタンからどうぞ。
    """
    account_in_db = db.query(DBAccount).filter(DBAccount.account_name == form_data.username).first()
    if not account_in_db or not auth.verify_password(form_data.password, account_in_db.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": account_in_db.account_name}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- Protected Endpoint Example (NEW) ---
@app.get("/accounts/me", response_model=Account, tags=["Accounts"])
def read_accounts_me(current_account: Account = Depends(auth.get_current_active_account)):
    """
    現在ログインしているアカウント自身の情報を返す。
    このAPIは認証が必要。
    """
    return current_account

# --- Existing Endpoints ---
@app.post("/organizations/", response_model=Organization, tags=["Organizations"])
def create_organization(org: OrganizationCreate, db: Session = Depends(get_db)):
    db_org = DBOrganization(name=org.name); db.add(db_org); db.commit(); db.refresh(db_org)
    return db_org
@app.get("/organizations/", response_model=List[Organization], tags=["Organizations"])
def get_organizations(db: Session = Depends(get_db)): return db.query(DBOrganization).all()

@app.post("/accounts/", response_model=Account, tags=["Accounts"])
def create_account(account: AccountCreate, db: Session = Depends(get_db)):
    if not db.query(DBOrganization).filter(DBOrganization.id == account.organization_id).first():
        raise HTTPException(status_code=404, detail="Organization not found")
    if db.query(DBAccount).filter(DBAccount.account_name == account.account_name).first():
        raise HTTPException(status_code=400, detail="Account name already exists")
    
    hashed_password = auth.get_password_hash(account.password) # 認証モジュールの関数を使う
    db_account = DBAccount(**account.model_dump(exclude={"password"}), hashed_password=hashed_password)
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account
@app.get("/accounts/", response_model=List[Account], tags=["Accounts"])
def get_accounts(db: Session = Depends(get_db)): return db.query(DBAccount).all()

@app.post("/project-members/", response_model=ProjectMember, tags=["Project Members"])
def create_project_member(member: ProjectMemberCreate, db: Session = Depends(get_db)):
    if not db.query(DBProject).filter(DBProject.id == member.project_id).first():
        raise HTTPException(status_code=404, detail="Project not found")
    if member.account_id is not None:
        if member.account_id == 0:
            member.account_id = None
        elif not db.query(DBAccount).filter(DBAccount.id == member.account_id).first():
            raise HTTPException(status_code=404, detail=f"Account to link (id: {member.account_id}) not found")
    db_member = DBProjectMember(**member.model_dump())
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member
@app.get("/projects/{project_id}/members", response_model=List[ProjectMember], tags=["Project Members"])
def get_project_members(project_id: int, db: Session = Depends(get_db)):
    return db.query(DBProjectMember).filter(DBProjectMember.project_id == project_id).options(joinedload(DBProjectMember.account)).all()

# (Project, Shot, Asset, Taskのエンドポイントは変更なし)
@app.post("/projects/", response_model=Project, tags=["Projects"])
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    if not db.query(DBOrganization).filter(DBOrganization.id == project.organization_id).first():
        raise HTTPException(status_code=404, detail="Organization not found")
    db_project = DBProject(name=project.name, organization_id=project.organization_id)
    db.add(db_project); db.commit(); db.refresh(db_project)
    return db_project
@app.get("/projects/", response_model=List[Project], tags=["Projects"])
def get_projects(db: Session = Depends(get_db)):
    return db.query(DBProject).options(joinedload(DBProject.members)).all()
@app.post("/shots/", response_model=Shot, tags=["Shots & Assets"])
def create_shot(shot: ShotCreate, db: Session = Depends(get_db)):
    if not db.query(DBProject).filter(DBProject.id == shot.project_id).first():
        raise HTTPException(status_code=404, detail="Project not found")
    db_shot = DBShot(**shot.model_dump()); db.add(db_shot); db.commit(); db.refresh(db_shot)
    return db_shot
@app.post("/assets/", response_model=Asset, tags=["Shots & Assets"])
def create_asset(asset: AssetCreate, db: Session = Depends(get_db)):
    if not db.query(DBProject).filter(DBProject.id == asset.project_id).first():
        raise HTTPException(status_code=404, detail="Project not found")
    db_asset = DBAsset(**asset.model_dump()); db.add(db_asset); db.commit(); db.refresh(db_asset)
    return db_asset
@app.post("/tasks/", response_model=Task, tags=["Tasks"])
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    member = db.query(DBProjectMember).filter(DBProjectMember.id == task.assigned_to_id).first()
    if not member: raise HTTPException(status_code=404, detail="Assigned ProjectMember not found")
    parent_project_id = None
    if task.shot_id:
        shot = db.query(DBShot).filter(DBShot.id == task.shot_id).first()
        if not shot: raise HTTPException(status_code=404, detail="Shot not found")
        parent_project_id = shot.project_id
    elif task.asset_id:
        asset = db.query(DBAsset).filter(DBAsset.id == task.asset_id).first()
        if not asset: raise HTTPException(status_code=404, detail="Asset not found")
        parent_project_id = asset.project_id
    else: raise HTTPException(status_code=400, detail="Task must be linked to a Shot or an Asset.")
    if member.project_id != parent_project_id:
        raise HTTPException(status_code=400, detail="Cannot assign a task to a member from a different project.")
    db_task = DBTask(**task.model_dump()); db.add(db_task); db.commit(); db.refresh(db_task)
    return db_task
@app.get("/tasks/project/{project_id}", response_model=List[Task], tags=["Tasks"])
def get_tasks_for_project(project_id: int, db: Session = Depends(get_db)):
    tasks_in_shots = db.query(DBTask).join(DBShot).filter(DBShot.project_id == project_id)
    tasks_in_assets = db.query(DBTask).join(DBAsset).filter(DBAsset.project_id == project_id)
    return tasks_in_shots.union(tasks_in_assets).options(joinedload(DBTask.assigned_to)).all()
