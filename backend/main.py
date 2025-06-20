import datetime
from datetime import timedelta
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

# --- データベースモデルのインポート ---
from .database import (
    get_db,
    Organization as DBOrganization,
    Project as DBProject,
    Account as DBAccount,
    ProjectMember as DBProjectMember,
    Shot as DBShot,
    Asset as DBAsset,
    Task as DBTask,
)

# --- 認証モジュールをインポート ---
from . import auth

from pydantic import BaseModel

app = FastAPI(
    title="MOTK Production Management System API",
    description="API with Delete Capabilities."
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

# --- Pydantic Schemas ---
# (Pydanticモデルの定義は変更なし...省略)
class Token(BaseModel): access_token: str; token_type: str
class OrganizationBase(BaseModel): name: str
class OrganizationCreate(OrganizationBase): pass
class Organization(OrganizationBase):
    id: int
    status: str
    class Config: from_attributes = True
class AccountBase(BaseModel): account_name: str; display_name: str; account_type: str = "artist"
class AccountCreate(AccountBase): password: str; organization_id: int
class AccountResponse(AccountBase):
    id: int
    organization_id: int
    class Config: from_attributes = True
class ProjectMemberBase(BaseModel): display_name: str; department: Optional[str] = "Unassigned"; role: str = "Member"
class ProjectMemberCreate(ProjectMemberBase): account_id: Optional[int] = None
class ProjectMember(ProjectMemberBase):
    id: int
    project_id: int
    account_id: Optional[int]
    account: Optional[AccountResponse] = None
    class Config: from_attributes = True
class ProjectBase(BaseModel): name: str
class ProjectCreate(ProjectBase): organization_id: int
class ProjectList(ProjectBase):
    id: int
    class Config: from_attributes = True
class ShotBase(BaseModel): name: str
class ShotCreate(ShotBase): pass
class ShotUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
class Shot(ShotBase):
    id: int
    project_id: int
    status: str
    class Config: from_attributes = True
class AssetBase(BaseModel): name: str; asset_type: str
class AssetCreate(AssetBase): pass
class Asset(AssetBase):
    id: int
    project_id: int
    status: str
    asset_type: str
    class Config: from_attributes = True
class TaskBase(BaseModel): name: str; status: str = "todo"; start_date: Optional[datetime.date] = None; end_date: Optional[datetime.date] = None
class TaskCreate(TaskBase): assigned_to_id: int; shot_id: Optional[int] = None; asset_id: Optional[int] = None
class Task(TaskBase):
    id: int
    assigned_to_id: int
    shot_id: Optional[int]
    asset_id: Optional[int]
    assigned_to: ProjectMember
    class Config: from_attributes = True
class ProjectDetails(ProjectBase):
    id: int
    organization_id: int
    status: str
    members: List[ProjectMember] = []
    shots: List[Shot] = []
    assets: List[Asset] = []
    class Config: from_attributes = True

# --- API Endpoints ---
# (Root, Authentication, Organization, Account, Projectのエンドポイントは変更なし)
@app.get("/", tags=["Root"])
def read_root(): return {"message": "MOTK Backend is running with robust access control!"}
@app.post("/token", response_model=Token, tags=["Authentication"])
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    account = db.query(DBAccount).filter(DBAccount.account_name == form_data.username).first()
    if not account or not auth.verify_password(form_data.password, account.hashed_password): raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password", headers={"WWW-Authenticate": "Bearer"})
    access_token = auth.create_access_token(data={"sub": account.account_name}); return {"access_token": access_token, "token_type": "bearer"}
@app.post("/organizations/", response_model=Organization, tags=["Organizations"])
def create_organization(org: OrganizationCreate, db: Session = Depends(get_db), current_account: DBAccount = Depends(auth.require_role(["admin"]))):
    db_org = DBOrganization(name=org.name); db.add(db_org); db.commit(); db.refresh(db_org); return db_org
@app.get("/organizations/", response_model=List[Organization], tags=["Organizations"])
def get_organizations(db: Session = Depends(get_db), current_account: DBAccount = Depends(auth.get_current_active_account)): return db.query(DBOrganization).all()
@app.get("/accounts/me", response_model=AccountResponse, tags=["Accounts"])
def read_accounts_me(current_account: DBAccount = Depends(auth.get_current_active_account)): return current_account
@app.post("/accounts/", response_model=AccountResponse, tags=["Accounts"])
def create_account(account: AccountCreate, db: Session = Depends(get_db)):
    if not db.query(DBOrganization).filter(DBOrganization.id == account.organization_id).first(): raise HTTPException(status_code=404, detail="Organization not found")
    if db.query(DBAccount).filter(DBAccount.account_name == account.account_name).first(): raise HTTPException(status_code=400, detail="Account name already exists")
    hashed_password = auth.get_password_hash(account.password); db_account = DBAccount(**account.model_dump(exclude={"password"}), hashed_password=hashed_password); db.add(db_account); db.commit(); db.refresh(db_account); return db_account
@app.get("/accounts/", response_model=List[AccountResponse], tags=["Accounts"])
def get_accounts(db: Session = Depends(get_db), current_account: DBAccount = Depends(auth.get_current_active_account)): return db.query(DBAccount).all()
@app.post("/projects/", response_model=ProjectDetails, tags=["Projects"])
def create_project(project: ProjectCreate, db: Session = Depends(get_db), current_account: DBAccount = Depends(auth.require_role(["admin", "manager"]))):
    if not db.query(DBOrganization).filter(DBOrganization.id == project.organization_id).first(): raise HTTPException(status_code=404, detail="Organization not found")
    db_project = DBProject(name=project.name, organization_id=project.organization_id); db.add(db_project); db.commit(); db.refresh(db_project); return db_project
@app.get("/projects/", response_model=List[ProjectList], tags=["Projects"])
def get_projects(db: Session = Depends(get_db), current_account: DBAccount = Depends(auth.get_current_active_account)):
    if current_account.account_type in ['admin', 'manager']: return db.query(DBProject).filter(DBProject.organization_id == current_account.organization_id).all()
    return db.query(DBProject).join(DBProjectMember).filter(DBProjectMember.account_id == current_account.id).all()
@app.get("/projects/{project_id}", response_model=ProjectDetails, tags=["Projects"])
def get_project_details(project: DBProject = Depends(auth.get_project_from_path), db: Session = Depends(get_db)):
    return db.query(DBProject).filter(DBProject.id == project.id).options(joinedload(DBProject.members).joinedload(DBProjectMember.account), joinedload(DBProject.shots), joinedload(DBProject.assets)).one()
@app.post("/projects/{project_id}/members", response_model=ProjectMember, tags=["Project Members"])
def create_project_member(member_data: ProjectMemberCreate, project: DBProject = Depends(auth.get_project_from_path), db: Session = Depends(get_db)):
    db_member = DBProjectMember(**member_data.model_dump(), project_id=project.id); db.add(db_member); db.commit(); db.refresh(db_member); return db_member
@app.post("/projects/{project_id}/shots", response_model=Shot, tags=["Shots & Assets"])
def create_shot(shot_data: ShotCreate, project: DBProject = Depends(auth.get_project_from_path), db: Session = Depends(get_db)):
    db_shot = DBShot(**shot_data.model_dump(), project_id=project.id); db.add(db_shot); db.commit(); db.refresh(db_shot); return db_shot
@app.post("/projects/{project_id}/assets", response_model=Asset, tags=["Shots & Assets"])
def create_asset(asset_data: AssetCreate, project: DBProject = Depends(auth.get_project_from_path), db: Session = Depends(get_db)):
    db_asset = DBAsset(**asset_data.model_dump(), project_id=project.id); db.add(db_asset); db.commit(); db.refresh(db_asset); return db_asset

@app.put("/shots/{shot_id}", response_model=Shot, tags=["Shots & Assets"])
def update_shot(shot_id: int, shot_update: ShotUpdate, db: Session = Depends(get_db), current_account: DBAccount = Depends(auth.get_current_active_account)):
    db_shot = db.query(DBShot).filter(DBShot.id == shot_id).first()
    if not db_shot: raise HTTPException(status_code=404, detail="Shot not found")
    try:
        auth.get_project_from_path(project_id=db_shot.project_id, current_account=current_account, db=db)
    except HTTPException:
        raise HTTPException(status_code=403, detail="You are not authorized to edit shots in this project.")
    update_data = shot_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_shot, key, value)
    db.add(db_shot); db.commit(); db.refresh(db_shot)
    return db_shot

# --- ★★★ 削除APIの追加 ★★★ ---
@app.delete("/shots/{shot_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Shots & Assets"])
def delete_shot(shot_id: int, db: Session = Depends(get_db), current_account: DBAccount = Depends(auth.get_current_active_account)):
    db_shot = db.query(DBShot).filter(DBShot.id == shot_id).first()
    if not db_shot:
        raise HTTPException(status_code=404, detail="Shot not found")
    
    # このショットが所属するプロジェクトのメンバーシップをチェック
    try:
        auth.get_project_from_path(project_id=db_shot.project_id, current_account=current_account, db=db)
    except HTTPException:
        raise HTTPException(status_code=403, detail="You are not authorized to delete shots in this project.")

    db.delete(db_shot)
    db.commit()
    return

# --- Task Endpoints ---
# (Task関連のエンドポイントは変更なし)
@app.post("/tasks/", response_model=Task, tags=["Tasks"])
def create_task(task: TaskCreate, db: Session = Depends(get_db), current_account: DBAccount = Depends(auth.get_current_active_account)):
    member = db.query(DBProjectMember).filter(DBProjectMember.id == task.assigned_to_id).first()
    if not member: raise HTTPException(status_code=404, detail="Assigned ProjectMember not found")
    try: auth.get_project_from_path(project_id=member.project_id, current_account=current_account, db=db)
    except HTTPException: raise HTTPException(status_code=403, detail="You are not authorized to add tasks to this project.")
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
    if member.project_id != parent_project_id: raise HTTPException(status_code=400, detail="Cannot assign a task to a member from a different project.")
    db_task = DBTask(**task.model_dump()); db.add(db_task); db.commit(); db.refresh(db_task)
    return db_task
@app.get("/tasks/project/{project_id}", response_model=List[Task], tags=["Tasks"])
def get_tasks_for_project(project: DBProject = Depends(auth.get_project_from_path), db: Session = Depends(get_db)):
    tasks_in_shots = db.query(DBTask).join(DBShot).filter(DBShot.project_id == project.id)
    tasks_in_assets = db.query(DBTask).join(DBAsset).filter(DBAsset.project_id == project.id)
    all_tasks_query = tasks_in_shots.union(tasks_in_assets)
    return db.query(DBTask).from_statement(all_tasks_query).options(joinedload(DBTask.assigned_to).joinedload(DBProjectMember.account)).all()
