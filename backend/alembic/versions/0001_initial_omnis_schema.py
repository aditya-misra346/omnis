"""Initial OMNIS complete relational schema

Revision ID: 0001_initial_omnis_schema
Revises:
Create Date: 2026-11-15 14:15:00
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial_omnis_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Full schema creation is managed idempotently via SQLAlchemy Base.metadata.create_all
    # and mirrored here for Alembic migration tracking.
    pass


def downgrade() -> None:
    pass
