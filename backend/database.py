import os
import datetime
from sqlalchemy import create_engine, Column, String, Integer, ForeignKey, Table, Date
from sqlalchemy.orm import sessionmaker, relationship, backref
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

load_dotenv()

# .envファイルは/backendではなく、プロジェクトのルート(/MOTK)に配置することを想定
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not found. Please ensure .env file exists in project root.")

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# --- Association Table for Task Dependencies ---
task_dependency = Table(
    "task_dependencies",
    Base.metadata,
    Column("dependent_task_id", Integer, ForeignKey("tasks.id"), primary_key=True),
    Column("dependency_on_task_id", Integer, ForeignKey("tasks.id"), primary_key=True),
)

# --- Core Models ---

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, default="active")

    projects = relationship("Project", back_populates="organization")
    accounts = relationship("Account", back_populates="organization")

class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    account_name = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    account_type = Column(String, nullable=False, default="artist") # e.g., admin, manager, artist, client

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    organization = relationship("Organization", back_populates="accounts")

    # This account's memberships in various projects
    project_memberships = relationship("ProjectMember", back_populates="account")


class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    status = Column(String, default="active")

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    organization = relationship("Organization", back_populates="projects")

    shots = relationship("Shot", back_populates="project", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="project", cascade="all, delete-orphan")
    files = relationship("File", back_populates="project", cascade="all, delete-orphan")
    
    # All members/roles within this project
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")

class ProjectMember(Base):
    __tablename__ = "project_members"
    id = Column(Integer, primary_key=True, index=True)
    department = Column(String, nullable=True) # e.g., "CG", "Production"
    role = Column(String, nullable=False) # e.g., "Director", "Lead Animator"
    display_name = Column(String, nullable=False) # Display name for this role/person in this project

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    project = relationship("Project", back_populates="members")

    # The actual person/account assigned to this role (can be null)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    account = relationship("Account", back_populates="project_memberships")

    # Tasks assigned to this project member/role
    tasks_assigned = relationship("Task", back_populates="assigned_to")

class Shot(Base):
    __tablename__ = "shots"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    status = Column(String, default="pending")

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    project = relationship("Project", back_populates="shots")
    tasks = relationship("Task", back_populates="shot")
    files = relationship("File", back_populates="shot")

class Asset(Base):
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    asset_type = Column(String, nullable=False)
    status = Column(String, default="pending")

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    project = relationship("Project", back_populates="assets")
    tasks = relationship("Task", back_populates="asset")
    files = relationship("File", back_populates="asset")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    status = Column(String, default="todo")
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    
    # A task is now assigned to a ProjectMember (role), not a User/Account
    assigned_to_id = Column(Integer, ForeignKey("project_members.id"), nullable=True)
    assigned_to = relationship("ProjectMember", back_populates="tasks_assigned")

    shot_id = Column(Integer, ForeignKey("shots.id"), nullable=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)

    shot = relationship("Shot", back_populates="tasks")
    asset = relationship("Asset", back_populates="tasks")
    
    depends_on = relationship(
        "Task",
        secondary=task_dependency,
        primaryjoin=id == task_dependency.c.dependent_task_id,
        secondaryjoin=id == task_dependency.c.dependency_on_task_id,
        backref="dependency_for"
    )

# NOTE: The global User table has been intentionally removed.

# Other models (File, StorageLocation) remain largely the same for now.
class StorageLocation(Base):
    __tablename__ = "storage_locations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    location_type = Column(String, nullable=False)
    base_path = Column(String, nullable=True)
    is_active = Column(Integer, default=1)
    files = relationship("File", back_populates="storage_location")

class File(Base):
    __tablename__ = "files"
    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String, unique=True, nullable=False)
    original_filename = Column(String, nullable=False)
    relative_path = Column(String, nullable=False)
    full_storage_path = Column(String, nullable=False)
    file_format = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    
    storage_location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=False)
    storage_location = relationship("StorageLocation", back_populates="files")

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    project = relationship("Project", back_populates="files")

    shot_id = Column(Integer, ForeignKey("shots.id"), nullable=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)

    shot = relationship("Shot", back_populates="files")
    asset = relationship("Asset", back_populates="files")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
