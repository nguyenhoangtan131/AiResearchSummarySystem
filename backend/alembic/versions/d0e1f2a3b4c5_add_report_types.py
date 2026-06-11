"""Add report types table

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-06-11 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d0e1f2a3b4c5"
down_revision: Union[str, Sequence[str], None] = "c9d0e1f2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DEFAULT_REPORT_TYPES = [
    "Tổng quan tài liệu",
    "Tổng quan hệ thống",
    "Tổng quan phạm vi",
    "Tổng quan tường thuật",
    "Phân tích gộp",
    "Báo cáo nghiên cứu",
    "Báo cáo chính sách",
    "Báo cáo nghiên cứu tình huống",
    "Báo cáo kỹ thuật",
    "Tiểu luận học thuật",
    "Bài báo hội thảo",
    "Bài báo tạp chí",
    "Chương luận văn",
    "Đề cương luận án",
    "Đề xuất xin tài trợ",
]


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "report_types" not in inspector.get_table_names():
        op.create_table(
            "report_types",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_report_types_id"), "report_types", ["id"], unique=False)
        op.create_index(op.f("ix_report_types_name"), "report_types", ["name"], unique=True)

    report_types = sa.table(
        "report_types",
        sa.column("name", sa.String),
        sa.column("sort_order", sa.Integer),
        sa.column("is_active", sa.Boolean),
    )
    bind = op.get_bind()
    existing = {
        row[0]
        for row in bind.execute(sa.text("SELECT name FROM report_types")).fetchall()
    }
    rows = [
        {"name": name, "sort_order": index, "is_active": True}
        for index, name in enumerate(DEFAULT_REPORT_TYPES, start=1)
        if name not in existing
    ]
    if rows:
        op.bulk_insert(report_types, rows)


def downgrade() -> None:
    op.drop_index(op.f("ix_report_types_name"), table_name="report_types")
    op.drop_index(op.f("ix_report_types_id"), table_name="report_types")
    op.drop_table("report_types")
