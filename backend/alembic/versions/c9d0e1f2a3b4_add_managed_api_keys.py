"""Add managed api keys table

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-06-11 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9d0e1f2a3b4"
down_revision: Union[str, Sequence[str], None] = "b8c9d0e1f2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "managed_api_keys" in inspector.get_table_names():
        return

    op.create_table(
        "managed_api_keys",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("provider", sa.String(length=30), nullable=False),
        sa.Column("encrypted_value", sa.Text(), nullable=False),
        sa.Column("masked_value", sa.String(length=120), nullable=False),
        sa.Column("fingerprint", sa.String(length=64), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="valid"),
        sa.Column("last_tested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "fingerprint", name="uq_managed_api_keys_provider_fingerprint"),
    )
    op.create_index(op.f("ix_managed_api_keys_id"), "managed_api_keys", ["id"], unique=False)
    op.create_index(op.f("ix_managed_api_keys_provider"), "managed_api_keys", ["provider"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_managed_api_keys_provider"), table_name="managed_api_keys")
    op.drop_index(op.f("ix_managed_api_keys_id"), table_name="managed_api_keys")
    op.drop_table("managed_api_keys")
