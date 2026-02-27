"""update_canvas_engine_type_enum

Revision ID: fa99930ceaa7
Revises: 44a373e6fb90
Create Date: 2026-02-14 00:19:36.460003

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fa99930ceaa7'
down_revision: Union[str, None] = '44a373e6fb90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite doesn't support ALTER COLUMN with ENUM changes
    # Since we're just changing 'other' to 'fabric', we can update the data
    # The enum constraint is handled in the application layer
    # Update any existing 'other' values to 'fabric'
    op.execute("UPDATE canvases SET engine_type = 'fabric' WHERE engine_type = 'other'")


def downgrade() -> None:
    # Revert fabric back to other
    op.execute("UPDATE canvases SET engine_type = 'other' WHERE engine_type = 'fabric'")
