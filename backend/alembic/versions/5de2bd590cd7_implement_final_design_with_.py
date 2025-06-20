"""Implement final design with ProjectMember and remove User

Revision ID: 5de2bd590cd7
Revises: 
Create Date: 2025-06-15 20:31:01.249251

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5de2bd590cd7'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('organizations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_organizations_id'), 'organizations', ['id'], unique=False)
    op.create_index(op.f('ix_organizations_name'), 'organizations', ['name'], unique=True)
    op.create_table('storage_locations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('location_type', sa.String(), nullable=False),
    sa.Column('base_path', sa.String(), nullable=True),
    sa.Column('is_active', sa.Integer(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_storage_locations_id'), 'storage_locations', ['id'], unique=False)
    op.create_table('accounts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('account_name', sa.String(), nullable=False),
    sa.Column('display_name', sa.String(), nullable=False),
    sa.Column('hashed_password', sa.String(), nullable=False),
    sa.Column('account_type', sa.String(), nullable=False),
    sa.Column('organization_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_accounts_account_name'), 'accounts', ['account_name'], unique=True)
    op.create_index(op.f('ix_accounts_id'), 'accounts', ['id'], unique=False)
    op.create_table('projects',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=True),
    sa.Column('organization_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_projects_id'), 'projects', ['id'], unique=False)
    op.create_index(op.f('ix_projects_name'), 'projects', ['name'], unique=False)
    op.create_table('assets',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('asset_type', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=True),
    sa.Column('project_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assets_id'), 'assets', ['id'], unique=False)
    op.create_index(op.f('ix_assets_name'), 'assets', ['name'], unique=False)
    op.create_table('project_members',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('department', sa.String(), nullable=True),
    sa.Column('role', sa.String(), nullable=False),
    sa.Column('display_name', sa.String(), nullable=False),
    sa.Column('project_id', sa.Integer(), nullable=False),
    sa.Column('account_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_project_members_id'), 'project_members', ['id'], unique=False)
    op.create_table('shots',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=True),
    sa.Column('project_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_shots_id'), 'shots', ['id'], unique=False)
    op.create_index(op.f('ix_shots_name'), 'shots', ['name'], unique=False)
    op.create_table('files',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('file_id', sa.String(), nullable=False),
    sa.Column('original_filename', sa.String(), nullable=False),
    sa.Column('relative_path', sa.String(), nullable=False),
    sa.Column('full_storage_path', sa.String(), nullable=False),
    sa.Column('file_format', sa.String(), nullable=False),
    sa.Column('file_type', sa.String(), nullable=False),
    sa.Column('storage_location_id', sa.Integer(), nullable=False),
    sa.Column('project_id', sa.Integer(), nullable=False),
    sa.Column('shot_id', sa.Integer(), nullable=True),
    sa.Column('asset_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
    sa.ForeignKeyConstraint(['shot_id'], ['shots.id'], ),
    sa.ForeignKeyConstraint(['storage_location_id'], ['storage_locations.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('file_id')
    )
    op.create_index(op.f('ix_files_id'), 'files', ['id'], unique=False)
    op.create_table('tasks',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=True),
    sa.Column('start_date', sa.Date(), nullable=True),
    sa.Column('end_date', sa.Date(), nullable=True),
    sa.Column('assigned_to_id', sa.Integer(), nullable=True),
    sa.Column('shot_id', sa.Integer(), nullable=True),
    sa.Column('asset_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ),
    sa.ForeignKeyConstraint(['assigned_to_id'], ['project_members.id'], ),
    sa.ForeignKeyConstraint(['shot_id'], ['shots.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tasks_id'), 'tasks', ['id'], unique=False)
    op.create_table('task_dependencies',
    sa.Column('dependent_task_id', sa.Integer(), nullable=False),
    sa.Column('dependency_on_task_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['dependency_on_task_id'], ['tasks.id'], ),
    sa.ForeignKeyConstraint(['dependent_task_id'], ['tasks.id'], ),
    sa.PrimaryKeyConstraint('dependent_task_id', 'dependency_on_task_id')
    )
    # ### end Alembic commands ###

    # ### BEGIN CUSTOM DATA SEEDING ###
    # This section inserts default data into the newly created tables.
    from sqlalchemy.sql import table, column
    from sqlalchemy import String, Integer
    from passlib.context import CryptContext

    # Password hashing context
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # --- 1. Organization ---
    organizations_table = table('organizations',
        column('id', Integer),
        column('name', String),
        column('status', String)
    )
    op.bulk_insert(organizations_table,
        [{'id': 1, 'name': 'Default Org', 'status': 'active'}]
    )

    # --- 2. Account (with user-specified credentials) ---
    accounts_table = table('accounts',
        column('id', Integer),
        column('account_name', String),
        column('display_name', String),
        column('hashed_password', String),
        column('account_type', String),
        column('organization_id', Integer)
    )
    op.bulk_insert(accounts_table,
        [{
            'id': 1,
            'account_name': 'admin_user',
            'display_name': 'Admin User',
            'hashed_password': pwd_context.hash("password_admin"),
            'account_type': 'admin',
            'organization_id': 1
        }]
    )

    # --- 3. Project ---
    projects_table = table('projects',
        column('id', Integer),
        column('name', String),
        column('status', String),
        column('organization_id', Integer)
    )
    op.bulk_insert(projects_table,
        [{'id': 1, 'name': 'Sample Project', 'status': 'active', 'organization_id': 1}]
    )

    # --- 4. Project Members ---
    project_members_table = table('project_members',
        column('id', Integer),
        column('department', String),
        column('role', String),
        column('display_name', String),
        column('project_id', Integer),
        column('account_id', Integer)
    )
    op.bulk_insert(project_members_table,
        [
            {'id': 1, 'department': 'Production', 'role': 'Admin', 'display_name': 'Admin User', 'project_id': 1, 'account_id': 1},
            {'id': 2, 'department': 'Animation', 'role': 'Animator', 'display_name': 'Animator 1', 'project_id': 1, 'account_id': None}
        ]
    )

    # --- 5. Shot ---
    shots_table = table('shots',
        column('id', Integer),
        column('name', String),
        column('status', String),
        column('project_id', Integer)
    )
    op.bulk_insert(shots_table,
        [{'id': 1, 'name': 'SH001', 'status': 'pending', 'project_id': 1}]
    )

    # --- 6. Asset ---
    assets_table = table('assets',
        column('id', Integer),
        column('name', String),
        column('asset_type', String),
        column('status', String),
        column('project_id', Integer)
    )
    op.bulk_insert(assets_table,
        [{'id': 1, 'name': 'Main Character', 'asset_type': 'character', 'status': 'pending', 'project_id': 1}]
    )

    # --- 7. Tasks ---
    tasks_table = table('tasks',
        column('id', Integer),
        column('name', String),
        column('status', String),
        column('assigned_to_id', Integer),
        column('shot_id', Integer),
        column('asset_id', Integer),
    )
    op.bulk_insert(tasks_table,
        [
            {'id': 1, 'name': 'Model Character', 'status': 'todo', 'assigned_to_id': 2, 'shot_id': None, 'asset_id': 1},
            {'id': 2, 'name': 'Animate Scene', 'status': 'todo', 'assigned_to_id': 2, 'shot_id': 1, 'asset_id': None},
        ]
    )
    # ### END CUSTOM DATA SEEDING ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('task_dependencies')
    op.drop_index(op.f('ix_tasks_id'), table_name='tasks')
    op.drop_table('tasks')
    op.drop_index(op.f('ix_files_id'), table_name='files')
    op.drop_table('files')
    op.drop_index(op.f('ix_shots_name'), table_name='shots')
    op.drop_index(op.f('ix_shots_id'), table_name='shots')
    op.drop_table('shots')
    op.drop_index(op.f('ix_project_members_id'), table_name='project_members')
    op.drop_table('project_members')
    op.drop_index(op.f('ix_assets_name'), table_name='assets')
    op.drop_index(op.f('ix_assets_id'), table_name='assets')
    op.drop_table('assets')
    op.drop_index(op.f('ix_projects_name'), table_name='projects')
    op.drop_index(op.f('ix_projects_id'), table_name='projects')
    op.drop_table('projects')
    op.drop_index(op.f('ix_accounts_id'), table_name='accounts')
    op.drop_index(op.f('ix_accounts_account_name'), table_name='accounts')
    op.drop_table('accounts')
    op.drop_index(op.f('ix_storage_locations_id'), table_name='storage_locations')
    op.drop_table('storage_locations')
    op.drop_index(op.f('ix_organizations_name'), table_name='organizations')
    op.drop_index(op.f('ix_organizations_id'), table_name='organizations')
    op.drop_table('organizations')
    # ### end Alembic commands ###
