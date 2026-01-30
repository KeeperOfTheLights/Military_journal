"""add specific_date to schedule

Revision ID: def456789abc
Revises: abc123456789
Create Date: 2026-01-20 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'def456789abc'
down_revision: Union[str, None] = 'abc123456789'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add specific_date column
    op.add_column('schedules', sa.Column('specific_date', sa.Date(), nullable=True))
    op.create_index(op.f('ix_schedules_specific_date'), 'schedules', ['specific_date'], unique=False)
    
    # Make day_of_week nullable for PostgreSQL
    op.alter_column('schedules', 'day_of_week',
                    existing_type=sa.Enum('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', name='dayofweek'),
                    nullable=True)


def downgrade() -> None:
    # Revert day_of_week to not nullable
    op.alter_column('schedules', 'day_of_week',
                    existing_type=sa.Enum('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', name='dayofweek'),
                    nullable=False)
    
    op.drop_index(op.f('ix_schedules_specific_date'), table_name='schedules')
    op.drop_column('schedules', 'specific_date')
