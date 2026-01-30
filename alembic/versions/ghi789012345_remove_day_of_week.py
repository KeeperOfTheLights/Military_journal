"""remove day_of_week from schedule

Revision ID: ghi789012345
Revises: def456789abc
Create Date: 2026-01-30 00:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'ghi789012345'
down_revision: Union[str, None] = 'def456789abc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Delete all attendance records for template schedules first
    op.execute("""
        DELETE FROM attendances 
        WHERE schedule_id IN (
            SELECT id FROM schedules WHERE specific_date IS NULL
        )
    """)
    
    # Delete all records where specific_date is NULL (template schedules)
    op.execute("DELETE FROM schedules WHERE specific_date IS NULL")
    
    # Make specific_date NOT NULL
    op.alter_column('schedules', 'specific_date',
                    existing_type=sa.Date(),
                    nullable=False)
    
    # Drop day_of_week column
    op.drop_column('schedules', 'day_of_week')


def downgrade() -> None:
    # Add day_of_week column back
    op.add_column('schedules', sa.Column('day_of_week', 
                  sa.Enum('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', name='dayofweek'),
                  nullable=True))
    
    # Make specific_date nullable again
    op.alter_column('schedules', 'specific_date',
                    existing_type=sa.Date(),
                    nullable=True)
