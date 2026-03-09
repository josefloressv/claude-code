"""fix course_ratings unique constraint with partial index

Revision ID: c3f1a2b4d5e6
Revises: 0e3a8766f785
Create Date: 2026-03-08 23:30:00.000000

Replaces the UNIQUE(course_id, user_id, deleted_at) constraint with a
partial unique index on (course_id, user_id) WHERE deleted_at IS NULL.

The original constraint does not prevent multiple active ratings from
the same user for the same course because in PostgreSQL NULL != NULL,
meaning rows with deleted_at = NULL are not considered duplicates.
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'c3f1a2b4d5e6'
down_revision: Union[str, None] = '0e3a8766f785'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Replace broken UNIQUE constraint with a proper partial index."""

    # Eliminar el constraint anterior que no funcionaba correctamente
    op.drop_constraint(
        'uq_course_ratings_user_course_deleted',
        'course_ratings',
        type_='unique'
    )

    # Crear un partial index que sólo aplica a ratings activos (no borrados)
    op.execute(
        text(
            "CREATE UNIQUE INDEX uq_active_course_user_rating "
            "ON course_ratings (course_id, user_id) "
            "WHERE deleted_at IS NULL"
        )
    )


def downgrade() -> None:
    """Restore the original (broken) unique constraint."""

    # Eliminar el partial index
    op.execute(text("DROP INDEX IF EXISTS uq_active_course_user_rating"))

    # Restaurar el constraint original
    op.create_unique_constraint(
        'uq_course_ratings_user_course_deleted',
        'course_ratings',
        ['course_id', 'user_id', 'deleted_at']
    )
