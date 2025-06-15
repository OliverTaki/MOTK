import datetime
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

# --- データベースモデルのインポートを更新 ---
# .databaseから正しくインポートし、Userを削除、ProjectMemberを追加
from .database import (
    SessionLocal, get_db,
    Organization as DBOrganization,
    Project as DBProject,
    Account as DBAccount,
    ProjectMember as DBProjectMember,
    Shot as DBShot,
    Asset as DBAsset,
    Task as DBTask,
    StorageLocation as DBStorageLocation,
    File as DBFile,
    get_password_hash
)

from pydantic import BaseModel, Field

# FastAPIアプリケーションのインスタンス化
app = FastAPI(
    title="MOTK Production Management System API",
    description="API for managing production workflows, based on the final blueprint design."
)

# --- CORS設定 ---
# フロントエンドからのアクセスを許可
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic Schemas (データ検証モデル) ---
# 設計に合わせて全面的に見直し

# --- Organization Schemas ---
class OrganizationBase(BaseModel):
    name: str
class OrganizationCreate(OrganizationBase):
    pass
class Organization(OrganizationBase):
    id: int
    status: str
    class Config:
        from_attributes = True

# --- Account Schemas ---
class AccountBase(BaseModel):
    account_name: str
    display_name: str
    account_type: str = "artist"
class AccountCreate(AccountBase):
    password: str
    organization_id: int
class Account(AccountBase):
    id: int
    organization_id: int
    class Config:
        from_attributes = True

# --- ProjectMember Schemas (NEW) ---
class ProjectMemberBase(BaseModel):
    display_name: str
    department: Optional[str] = None
    role: str
class ProjectMemberCreate(ProjectMemberBase):
    project_id: int
    account_id: Optional[int] = None
class ProjectMember(ProjectMemberBase):
    id: int
    project_id: int
    account_id: Optional[int]
    account: Optional[Account] = None # 紐づくアカウント情報も表示
    class Config:
        from_attributes = True

# --- Project Schemas ---
class ProjectBase(BaseModel):
    name: str
class ProjectCreate(ProjectBase):
    organization_id: int
class Project(ProjectBase):
    id: int
    organization_id: int
    status: str
    members: List[ProjectMember] = []
    class Config:
        from_attributes = True

# --- Shot, Asset, Task Schemas (更新) ---
class ShotBase(BaseModel):
    name: str
class ShotCreate(ShotBase):
    project_id: int
class Shot(ShotBase):
    id: int
    project_id: int
    status: str
    class Config:
        from_attributes = True

class AssetBase(BaseModel):
    name: str
    asset_type: str
class AssetCreate(AssetBase):
    project_id: int
class Asset(AssetBase):
    id: int
    project_id: int
    status: str
    class Config:
        from_attributes = True

class TaskBase(BaseModel):
    name: str
    status: str = "todo"
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None
class TaskCreate(TaskBase):
    assigned_to_id: int # Taskは必ずProjectMemberにアサインされる
    shot_id: Optional[int] = None
    asset_id: Optional[int] = None
class Task(TaskBase):
    id: int
    assigned_to_id: int
    shot_id: Optional[int]
    asset_id: Optional[int]
    assigned_to: ProjectMember # 誰(どの役割)にアサインされているか表示
    class Config:
        from_attributes = True

# --- API Endpoints ---

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "MOTK Backend is running with the new schema!"}

# --- Organization Endpoints ---
@app.post("/organizations/", response_model=Organization, tags=["Organizations"])
def create_organization(org: OrganizationCreate, db: Session = Depends(get_db)):
    db_org = DBOrganization(name=org.name)
    db.add(db_org)
    db.commit()
    db.refresh(db_org)
    return db_org

@app.get("/organizations/", response_model=List[Organization], tags=["Organizations"])
def get_organizations(db: Session = Depends(get_db)):
    return db.query(DBOrganization).all()

# --- Account Endpoints (旧Userの代わり) ---
# アカウント作成は認証フローに統合するため、ここではシンプルなCRUDのみ
@app.post("/accounts/", response_model=Account, tags=["Accounts"])
def create_account(account: AccountCreate, db: Session = Depends(get_db)):
    # 存在チェック
    if not db.query(DBOrganization).filter(DBOrganization.id == account.organization_id).first():
        raise HTTPException(status_code=404, detail="Organization not found")
    if db.query(DBAccount).filter(DBAccount.account_name == account.account_name).first():
        raise HTTPException(status_code=400, detail="Account name already exists")
        
    hashed_password = get_password_hash(account.password)
    db_account = DBAccount(
        **account.model_dump(exclude={"password"}), 
        hashed_password=hashed_password
    )
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

@app.get("/accounts/", response_model=List[Account], tags=["Accounts"])
def get_accounts(db: Session = Depends(get_db)):
    return db.query(DBAccount).all()

# --- ProjectMember Endpoints (NEW) ---
@app.post("/project-members/", response_model=ProjectMember, tags=["Project Members"])
def create_project_member(member: ProjectMemberCreate, db: Session = Depends(get_db)):
    # 存在チェック
    if not db.query(DBProject).filter(DBProject.id == member.project_id).first():
        raise HTTPException(status_code=404, detail="Project not found")
    if member.account_id and not db.query(DBAccount).filter(DBAccount.id == member.account_id).first():
        raise HTTPException(status_code=404, detail="Account to link not found")

    db_member = DBProjectMember(**member.model_dump())
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member

@app.get("/projects/{project_id}/members", response_model=List[ProjectMember], tags=["Project Members"])
def get_project_members(project_id: int, db: Session = Depends(get_db)):
    return db.query(DBProjectMember).filter(DBProjectMember.project_id == project_id).options(joinedload(DBProjectMember.account)).all()

# --- Project Endpoints ---
@app.post("/projects/", response_model=Project, tags=["Projects"])
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    if not db.query(DBOrganization).filter(DBOrganization.id == project.organization_id).first():
        raise HTTPException(status_code=404, detail="Organization not found")
    db_project = DBProject(name=project.name, organization_id=project.organization_id)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@app.get("/projects/", response_model=List[Project], tags=["Projects"])
def get_projects(db: Session = Depends(get_db)):
    # Projectを取得する際に、そのメンバーも一緒に読み込む
    return db.query(DBProject).options(joinedload(DBProject.members)).all()

# --- Shot, Asset, Task Endpoints ---
@app.post("/shots/", response_model=Shot, tags=["Shots & Assets"])
def create_shot(shot: ShotCreate, db: Session = Depends(get_db)):
    if not db.query(DBProject).filter(DBProject.id == shot.project_id).first():
        raise HTTPException(status_code=404, detail="Project not found")
    db_shot = DBShot(**shot.model_dump())
    db.add(db_shot)
    db.commit()
    db.refresh(db_shot)
    return db_shot

@app.post("/assets/", response_model=Asset, tags=["Shots & Assets"])
def create_asset(asset: AssetCreate, db: Session = Depends(get_db)):
    if not db.query(DBProject).filter(DBProject.id == asset.project_id).first():
        raise HTTPException(status_code=404, detail="Project not found")
    db_asset = DBAsset(**asset.model_dump())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset
    
@app.post("/tasks/", response_model=Task, tags=["Tasks"])
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    # アサイン先のProjectMemberが存在するかチェック
    member = db.query(DBProjectMember).filter(DBProjectMember.id == task.assigned_to_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Assigned ProjectMember not found")
    
    # TaskがShotかAssetに紐づくかのチェック
    parent_project_id = None
    if task.shot_id:
        shot = db.query(DBShot).filter(DBShot.id == task.shot_id).first()
        if not shot: raise HTTPException(status_code=404, detail="Shot not found")
        parent_project_id = shot.project_id
    elif task.asset_id:
        asset = db.query(DBAsset).filter(DBAsset.id == task.asset_id).first()
        if not asset: raise HTTPException(status_code=404, detail="Asset not found")
        parent_project_id = asset.project_id
    else:
        raise HTTPException(status_code=400, detail="Task must be linked to a Shot or an Asset.")

    # アサイン先のメンバーが、そのタスクの親と同じプロジェクトにいるかチェック
    if member.project_id != parent_project_id:
        raise HTTPException(status_code=400, detail="Cannot assign a task to a member from a different project.")

    db_task = DBTask(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.get("/tasks/project/{project_id}", response_model=List[Task], tags=["Tasks"])
def get_tasks_for_project(project_id: int, db: Session = Depends(get_db)):
    # プロジェクト内の全てのタスクを取得する
    tasks_in_shots = db.query(DBTask).join(DBShot).filter(DBShot.project_id == project_id)
    tasks_in_assets = db.query(DBTask).join(DBAsset).filter(DBAsset.project_id == project_id)
    return tasks_in_shots.union(tasks_in_assets).options(joinedload(DBTask.assigned_to)).all()

