import datetime
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Union
from fastapi.middleware.cors import CORSMiddleware
from datetime import date

# '.database' からのインポート（修正済み）
from .database import (
    engine, Base, SessionLocal, get_db,
    Organization as DBOrganization,
    Project as DBProject,
    Shot as DBShot,
    Asset as DBAsset,
    Task as DBTask,
    User as DBUser,
    Account as DBAccount,
    StorageLocation as DBStorageLocation,
    File as DBFile,
    get_password_hash, verify_password
)

from pydantic import BaseModel, Field

app = FastAPI(title="MOTK Production Management System API")

origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---

class OrganizationBase(BaseModel):
    name: str
    status: str = "active"

class OrganizationCreate(OrganizationBase):
    pass

class ProjectForOrg(BaseModel):
    id: int
    name: str
    status: str
    class Config: from_attributes = True

class UserForOrg(BaseModel):
    id: int
    username: str
    email: str
    class Config: from_attributes = True

class Organization(OrganizationBase):
    id: int
    projects: List[ProjectForOrg] = []
    users: List[UserForOrg] = []
    class Config: from_attributes = True


class TaskForParent(BaseModel):
    id: int
    name: str
    status: str
    class Config: from_attributes = True

class ShotForProject(BaseModel):
    id: int
    name: str
    status: str
    tasks: List[TaskForParent] = []
    class Config: from_attributes = True

class AssetForProject(BaseModel):
    id: int
    name: str
    asset_type: str
    status: str
    tasks: List[TaskForParent] = []
    class Config: from_attributes = True

class FileForProject(BaseModel):
    id: int
    original_filename: str
    file_type: str
    class Config: from_attributes = True

class ProjectBase(BaseModel):
    name: str
    organization_id: int
    status: str = "active"

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: int
    organization: OrganizationBase
    shots: List[ShotForProject] = []
    assets: List[AssetForProject] = []
    files: List[FileForProject] = []
    class Config: from_attributes = True


class ShotBase(BaseModel):
    name: str
    project_id: int
    status: str = "pending"

class ShotCreate(ShotBase):
    pass

class FileForShot(BaseModel):
    id: int
    original_filename: str
    file_type: str
    class Config: from_attributes = True

class Shot(ShotBase):
    id: int
    project: ProjectBase
    tasks: List[TaskForParent] = []
    files: List[FileForShot] = []
    class Config: from_attributes = True


class AssetBase(BaseModel):
    name: str
    asset_type: str
    project_id: int
    status: str = "pending"

class AssetCreate(AssetBase):
    pass

class FileForAsset(BaseModel):
    id: int
    original_filename: str
    file_type: str
    class Config: from_attributes = True

class Asset(AssetBase):
    id: int
    project: ProjectBase
    tasks: List[TaskForParent] = []
    files: List[FileForAsset] = []
    class Config: from_attributes = True


class UserForTask(BaseModel):
    id: int
    username: str
    class Config: from_attributes = True

class TaskSimple(BaseModel):
    id: int
    name: str
    status: str
    class Config:
        from_attributes = True

class TaskBase(BaseModel):
    name: str
    status: str = "todo"
    assigned_to_id: Optional[int] = None
    shot_id: Optional[int] = None
    asset_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    dependencies_ids: List[int] = Field(default_factory=list, alias="dependencies") 

class TaskCreate(TaskBase):
    pass 

class Task(TaskBase):
    id: int
    depends_on_tasks: List[TaskSimple] = []
    tasks_depending_on_me: List[TaskSimple] = []
    assigned_to: Optional[UserForTask] = None
    shot: Optional[ShotBase] = None
    asset: Optional[AssetBase] = None
    class Config:
        from_attributes = True


class UserBase(BaseModel):
    username: str
    email: str
    role: str = "artist"
    organization_id: int

class UserCreate(UserBase):
    pass

class AccountForUser(BaseModel):
    id: int
    account_name: str
    class Config: from_attributes = True

class User(UserBase):
    id: int
    organization: OrganizationBase
    tasks_assigned_to_me: List[TaskSimple] = []
    account: Optional[AccountForUser] = None
    class Config: from_attributes = True


class AccountBase(BaseModel):
    account_name: str

class AccountCreate(AccountBase):
    password: str
    user_id: Optional[int] = None

class UserForAccount(BaseModel):
    id: int
    username: str
    email: str
    class Config: from_attributes = True

class Account(AccountBase):
    id: int
    user_id: Optional[int] = None
    user: Optional[UserForAccount] = None
    class Config: from_attributes = True


class StorageLocationBase(BaseModel):
    name: str
    location_type: str = "local_disk"
    base_path: Optional[str] = None
    is_active: int = 1

class StorageLocationCreate(StorageLocationBase):
    pass

class FileForStorageLocation(BaseModel):
    id: int
    original_filename: str
    file_type: str
    class Config: from_attributes = True

class StorageLocation(StorageLocationBase):
    id: int
    files: List[FileForStorageLocation] = []
    class Config: from_attributes = True


class FileBase(BaseModel):
    file_id: str = Field(..., description="UUID of the file's folder")
    original_filename: str
    relative_path: str
    full_storage_path: str
    file_format: str
    file_type: str
    fps: Optional[float] = None
    total_frames: Optional[int] = None
    duration_seconds: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    storage_location_id: int
    project_id: int
    shot_id: Optional[int] = None
    asset_id: Optional[int] = None

class FileCreate(FileBase):
    pass

class File(FileBase):
    id: int
    storage_location: StorageLocationBase
    project: ProjectBase
    shot: Optional[ShotBase] = None
    asset: Optional[AssetBase] = None
    class Config: from_attributes = True


Organization.model_rebuild()
Project.model_rebuild()
Shot.model_rebuild()
Asset.model_rebuild()
Task.model_rebuild()
User.model_rebuild()
Account.model_rebuild()
StorageLocation.model_rebuild()
File.model_rebuild()


@app.on_event("startup")
def on_startup():
    pass

@app.get("/")
async def read_root():
    return {"message": "MOTK Backend is running!"}

# --- API Endpoints ---

@app.post("/organizations/", response_model=Organization, status_code=status.HTTP_201_CREATED)
def create_organization(organization: OrganizationCreate, db: Session = Depends(get_db)):
    db_organization = DBOrganization(name=organization.name, status=organization.status)
    db.add(db_organization)
    db.commit()
    db.refresh(db_organization)
    return db_organization

@app.get("/organizations/", response_model=List[Organization])
def read_organizations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    organizations = db.query(DBOrganization).options(joinedload(DBOrganization.projects), joinedload(DBOrganization.users)).offset(skip).limit(limit).all()
    return organizations

@app.get("/organizations/{organization_id}", response_model=Organization)
def read_organization(organization_id: int, db: Session = Depends(get_db)):
    organization = db.query(DBOrganization).options(joinedload(DBOrganization.projects), joinedload(DBOrganization.users)).filter(DBOrganization.id == organization_id).first()
    if organization is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return organization


@app.post("/projects/", response_model=Project, status_code=status.HTTP_201_CREATED)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    organization = db.query(DBOrganization).filter(DBOrganization.id == project.organization_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found for this project.")
    
    db_project = DBProject(name=project.name, organization_id=project.organization_id, status=project.status)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@app.get("/projects/", response_model=List[Project])
def read_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    projects = db.query(DBProject).options(joinedload(DBProject.organization), joinedload(DBProject.shots), joinedload(DBProject.assets), joinedload(DBProject.files)).offset(skip).limit(limit).all()
    return projects

@app.get("/projects/{project_id}", response_model=Project)
def read_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(DBProject).options(joinedload(DBProject.organization), joinedload(DBProject.shots), joinedload(DBProject.assets), joinedload(DBProject.files)).filter(DBProject.id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@app.post("/shots/", response_model=Shot, status_code=status.HTTP_201_CREATED)
def create_shot(shot: ShotCreate, db: Session = Depends(get_db)):
    project = db.query(DBProject).filter(DBProject.id == shot.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found for this shot.")
    
    db_shot = DBShot(name=shot.name, project_id=shot.project_id, status=shot.status)
    db.add(db_shot)
    db.commit()
    db.refresh(db_shot)
    return db_shot

@app.get("/shots/", response_model=List[Shot])
def read_shots(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    shots = db.query(DBShot).options(joinedload(DBShot.project), joinedload(DBShot.tasks), joinedload(DBShot.files)).offset(skip).limit(limit).all()
    return shots

@app.get("/shots/{shot_id}", response_model=Shot)
def read_shot(shot_id: int, db: Session = Depends(get_db)):
    shot = db.query(DBShot).options(joinedload(DBShot.project), joinedload(DBShot.tasks), joinedload(DBShot.files)).filter(DBShot.id == shot_id).first()
    if shot is None:
        raise HTTPException(status_code=404, detail="Shot not found")
    return shot


@app.post("/assets/", response_model=Asset, status_code=status.HTTP_201_CREATED)
def create_asset(asset: AssetCreate, db: Session = Depends(get_db)):
    project = db.query(DBProject).filter(DBProject.id == asset.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found for this asset.")
    
    db_asset = DBAsset(name=asset.name, asset_type=asset.asset_type, project_id=asset.project_id, status=asset.status)
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

@app.get("/assets/", response_model=List[Asset])
def read_assets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    assets = db.query(DBAsset).options(joinedload(DBAsset.project), joinedload(DBAsset.tasks), joinedload(DBAsset.files)).offset(skip).limit(limit).all()
    return assets

@app.get("/assets/{asset_id}", response_model=Asset)
def read_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(DBAsset).options(joinedload(DBAsset.project), joinedload(DBAsset.tasks), joinedload(DBAsset.files)).filter(DBAsset.id == asset_id).first()
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@app.post("/tasks/", response_model=Task, status_code=status.HTTP_201_CREATED)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    if task.shot_id and task.asset_id:
        raise HTTPException(status_code=400, detail="A task must be linked to either a shot OR an asset, not both.")
    elif task.shot_id:
        if not db.query(DBShot).filter(DBShot.id == task.shot_id).first():
            raise HTTPException(status_code=404, detail=f"Shot with ID {task.shot_id} not found.")
    elif task.asset_id:
        if not db.query(DBAsset).filter(DBAsset.id == task.asset_id).first():
            raise HTTPException(status_code=404, detail=f"Asset with ID {task.asset_id} not found.")
    else:
        raise HTTPException(status_code=400, detail="A task must be linked to either a shot or an asset.")

    if task.assigned_to_id and not db.query(DBUser).filter(DBUser.id == task.assigned_to_id).first():
        raise HTTPException(status_code=404, detail=f"User with ID {task.assigned_to_id} not found for assignment.")

    db_task = DBTask(**task.model_dump(exclude={"dependencies_ids"}))
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    if task.dependencies_ids:
        for dep_id in task.dependencies_ids:
            if dependency_task := db.query(DBTask).filter(DBTask.id == dep_id).first():
                db_task.depends_on_tasks.append(dependency_task)
        db.commit()
        db.refresh(db_task)

    return db_task

@app.get("/tasks/", response_model=List[Task])
def read_tasks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    tasks = db.query(DBTask).options(joinedload(DBTask.shot), joinedload(DBTask.asset), joinedload(DBTask.assigned_to), joinedload(DBTask.depends_on_tasks), joinedload(DBTask.tasks_depending_on_me)).offset(skip).limit(limit).all()
    return tasks

@app.get("/tasks/{task_id}", response_model=Task)
def read_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(DBTask).options(joinedload(DBTask.shot), joinedload(DBTask.asset), joinedload(DBTask.assigned_to), joinedload(DBTask.depends_on_tasks), joinedload(DBTask.tasks_depending_on_me)).filter(DBTask.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.post("/users/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    if not db.query(DBOrganization).filter(DBOrganization.id == user.organization_id).first():
        raise HTTPException(status_code=404, detail=f"Organization with ID {user.organization_id} not found.")
    
    if existing_user := db.query(DBUser).filter((DBUser.username == user.username) | (DBUser.email == user.email)).first():
        detail_msg = "Username" if existing_user.username == user.username else "Email"
        raise HTTPException(status_code=409, detail=f"{detail_msg} already registered.")

    db_user = DBUser(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/", response_model=List[User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(DBUser).options(joinedload(DBUser.organization), joinedload(DBUser.tasks_assigned_to_me), joinedload(DBUser.account)).offset(skip).limit(limit).all()
    return users

@app.get("/users/{user_id}", response_model=User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(DBUser).options(joinedload(DBUser.organization), joinedload(DBUser.tasks_assigned_to_me), joinedload(DBUser.account)).filter(DBUser.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.post("/accounts/", response_model=Account, status_code=status.HTTP_201_CREATED)
def create_account(account: AccountCreate, db: Session = Depends(get_db)):
    if db.query(DBAccount).filter(DBAccount.account_name == account.account_name).first():
        raise HTTPException(status_code=409, detail="Account name already registered.")
    
    if account.user_id == 0:
        account.user_id = None

    if account.user_id:
        user = db.query(DBUser).filter(DBUser.id == account.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail=f"User with ID {account.user_id} not found to link account.")
        if user.account:
            raise HTTPException(status_code=409, detail=f"User with ID {account.user_id} already has an account linked.")

    hashed_password = get_password_hash(account.password)
    db_account = DBAccount(
        account_name=account.account_name,
        hashed_password=hashed_password,
        user_id=account.user_id
    )
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

@app.get("/accounts/", response_model=List[Account])
def read_accounts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    accounts = db.query(DBAccount).options(joinedload(DBAccount.user)).offset(skip).limit(limit).all()
    return accounts

@app.get("/accounts/{account_id}", response_model=Account)
def read_account(account_id: int, db: Session = Depends(get_db)):
    account = db.query(DBAccount).options(joinedload(DBAccount.user)).filter(DBAccount.id == account_id).first()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@app.post("/storage-locations/", response_model=StorageLocation, status_code=status.HTTP_201_CREATED)
def create_storage_location(location: StorageLocationCreate, db: Session = Depends(get_db)):
    if db.query(DBStorageLocation).filter(DBStorageLocation.name == location.name).first():
        raise HTTPException(status_code=409, detail="Storage location name already exists.")
    
    db_location = DBStorageLocation(**location.model_dump())
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location

@app.get("/storage-locations/", response_model=List[StorageLocation])
def read_storage_locations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    locations = db.query(DBStorageLocation).options(joinedload(DBStorageLocation.files)).offset(skip).limit(limit).all()
    return locations

@app.get("/storage-locations/{location_id}", response_model=StorageLocation)
def read_storage_location(location_id: int, db: Session = Depends(get_db)):
    location = db.query(DBStorageLocation).options(joinedload(DBStorageLocation.files)).filter(DBStorageLocation.id == location_id).first()
    if location is None:
        raise HTTPException(status_code=404, detail="Storage location not found")
    return location


@app.post("/files/", response_model=File, status_code=status.HTTP_201_CREATED)
def create_file(file: FileCreate, db: Session = Depends(get_db)):
    if not db.query(DBProject).filter(DBProject.id == file.project_id).first():
        raise HTTPException(status_code=404, detail=f"Project with ID {file.project_id} not found.")
    if not db.query(DBStorageLocation).filter(DBStorageLocation.id == file.storage_location_id).first():
        raise HTTPException(status_code=404, detail=f"Storage Location with ID {file.storage_location_id} not found.")

    if file.shot_id and file.asset_id:
        raise HTTPException(status_code=400, detail="A file must be linked to either a shot OR an asset, not both.")
    elif file.shot_id:
        if not db.query(DBShot).filter(DBShot.id == file.shot_id).first():
            raise HTTPException(status_code=404, detail=f"Shot with ID {file.shot_id} not found.")
    elif file.asset_id:
        if not db.query(DBAsset).filter(DBAsset.id == file.asset_id).first():
            raise HTTPException(status_code=404, detail=f"Asset with ID {file.asset_id} not found.")
            
    db_file = DBFile(**file.model_dump())
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file

@app.get("/files/", response_model=List[File])
def read_files(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    files = db.query(DBFile).options(joinedload(DBFile.storage_location), joinedload(DBFile.project), joinedload(DBFile.shot), joinedload(DBFile.asset)).offset(skip).limit(limit).all()
    return files

@app.get("/files/{file_id}", response_model=File)
def read_file(file_id: int, db: Session = Depends(get_db)):
    file = db.query(DBFile).options(joinedload(DBFile.storage_location), joinedload(DBFile.project), joinedload(DBFile.shot), joinedload(DBFile.asset)).filter(DBFile.id == file_id).first()
    if file is None:
        raise HTTPException(status_code=404, detail="File not found")
    return file
