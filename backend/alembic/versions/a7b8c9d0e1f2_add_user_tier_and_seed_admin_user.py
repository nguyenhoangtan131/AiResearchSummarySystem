"""Add user tier and seed admin user

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-05-17 13:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ADMIN_USER_ID = "c740b75b-90c4-4414-a0f2-07d75deccdcc"


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    user_columns = {column["name"] for column in inspector.get_columns("users")}

    if "tier" not in user_columns:
        op.add_column(
            "users",
            sa.Column("tier", sa.String(length=50), nullable=True, server_default="free"),
        )

    inspector = sa.inspect(bind)
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "is_admin" in user_columns:
        op.execute(
            """
            UPDATE users
            SET tier = 'admin'
            WHERE is_admin IS TRUE
            """
        )

    op.execute(
        """
        UPDATE users
        SET tier = 'free'
        WHERE tier IS NULL OR BTRIM(tier) = ''
        """
    )
    op.execute(
        f"""
        UPDATE users
        SET tier = 'admin'
        WHERE id = '{ADMIN_USER_ID}'::uuid
        """
    )
    op.alter_column("users", "tier", existing_type=sa.String(length=50), nullable=False, server_default="free")

    inspector = sa.inspect(bind)
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "is_admin" in user_columns:
        op.drop_column("users", "is_admin")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    user_columns = {column["name"] for column in inspector.get_columns("users")}

    if "is_admin" not in user_columns:
        op.add_column(
            "users",
            sa.Column("is_admin", sa.Boolean(), nullable=True),
        )

    op.execute(
        """
        UPDATE users
        SET is_admin = CASE
            WHEN LOWER(COALESCE(tier, '')) = 'admin' THEN TRUE
            ELSE FALSE
        END
        """
    )

    inspector = sa.inspect(bind)
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "tier" in user_columns:
        op.drop_column("users", "tier")
