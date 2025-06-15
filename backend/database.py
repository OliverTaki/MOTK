import os
import datetime
from sqlalchemy import create_engine, Column, String, Integer, ForeignKey, Table, Float, Date
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.schema import UniqueConstraint
from dotenv import load_dotenv

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set. Please create a .env file with DATABASE_URL.")

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

task_dependency = Table(
    "task_dependencies",
    Base.metadata,
    Column("dependent_task_id", Integer, ForeignKey("tasks.id"), primary_key=True),
    Column("dependency_on_task_id", Integer, ForeignKey("tasks.id"), primary_key=True),
    UniqueConstraint('dependent_task_id', 'dependency_on_task_id', name='uq_task_dependency')
)

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, default="active")

    projects = relationship("Project", back_populates="organization")
    users = relationship("User", back_populates="organization")

    def __repr__(self):
        return f"<Organization(id={self.id}, name='{self.name}')>"

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    status = Column(String, default="active")

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)

    organization = relationship("Organization", back_populates="projects")
    shots = relationship("Shot", back_populates="project")
    assets = relationship("Asset", back_populates="project")
    files = relationship("File", back_populates="project")

    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.name}', org_id={self.organization_id})>"

class Shot(Base):
    __tablename__ = "shots"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    status = Column(String, default="pending")

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    project = relationship("Project", back_populates="shots")
    tasks = relationship("Task", back_populates="shot")
    files = relationship("File", back_populates="shot")

    def __repr__(self):
        return f"<Shot(id={self.id}, name='{self.name}', proj_id={self.project_id})>"

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

    def __repr__(self):
        return f"<Asset(id={self.id}, name='{self.name}', type='{self.asset_type}', proj_id={self.project_id})>"

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    status = Column(String, default="todo")

    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    shot_id = Column(Integer, ForeignKey("shots.id"), nullable=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)

    assigned_to = relationship("User", back_populates="tasks_assigned_to_me")
    shot = relationship("Shot", back_populates="tasks")
    asset = relationship("Asset", back_populates="tasks")

    depends_on_tasks = relationship(
        "Task",
        secondary=task_dependency,
        primaryjoin=task_dependency.c.dependent_task_id == id,
        secondaryjoin=task_dependency.c.dependency_on_task_id == id,
        backref="tasks_depending_on_me"
    )

    def __repr__(self):
        parent_type = "Shot" if self.shot_id else ("Asset" if self.asset_id else "None")
        parent_id = self.shot_id if self.shot_id else self.asset_id
        return f"<Task(id={self.id}, name='{self.name}', parent_type={parent_type}, parent_id={parent_id}, assigned_to={self.assigned_to_id})>"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    role = Column(String, default="artist")

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)

    organization = relationship("Organization", back_populates="users")
    tasks_assigned_to_me = relationship("Task", back_populates="assigned_to")
    account = relationship("Account", back_populates="user", uselist=False)

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', org_id={self.organization_id})>"

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_name = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    user = relationship("User", back_populates="account")

    def __repr__(self):
        return f"<Account(id={self.id}, account_name='{self.account_name}', user_id={self.user_id})>"

class StorageLocation(Base):
    __tablename__ = "storage_locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    location_type = Column(String, nullable=False)
    base_path = Column(String, nullable=True)
    is_active = Column(Integer, default=1)

    files = relationship("File", back_populates="storage_location")

    def __repr__(self):
        return f"<StorageLocation(id={self.id}, name='{self.name}', type='{self.location_type}')>"

class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String, unique=True, nullable=False, comment="UUID of the file's folder")
    original_filename = Column(String, nullable=False)
    relative_path = Column(String, nullable=False, comment="Relative path within the storage_folder_uuid directory")
    full_storage_path = Column(String, nullable=False, comment="Absolute path resolved by application")

    file_format = Column(String, nullable=False, comment="e.g., mov, mp4, exr, jpg, pdf")
    file_type = Column(String, nullable=False, comment="e.g., video, image, 3d_model, document, unknown")

    fps = Column(Float, nullable=True)
    total_frames = Column(Integer, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    
    storage_location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=False)
    storage_location = relationship("StorageLocation", back_populates="files")

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    project = relationship("Project", back_populates="files")

    shot_id = Column(Integer, ForeignKey("shots.id"), nullable=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)

    shot = relationship("Shot", back_populates="files")
    asset = relationship("Asset", back_populates="files")

    def __repr__(self):
        return f"<File(id={self.id}, filename='{self.original_filename}', type='{self.file_type}')>"

def create_db_and_tables():
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()