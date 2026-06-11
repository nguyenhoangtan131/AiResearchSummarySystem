from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.report_type import ReportType

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


def seed_default_report_types(db: Session) -> None:
    has_any = db.query(ReportType.id).first()
    if has_any:
        return

    for index, name in enumerate(DEFAULT_REPORT_TYPES, start=1):
        db.add(ReportType(name=name, sort_order=index, is_active=True))
    db.commit()


def get_active_report_type_names(db: Session) -> list[str]:
    seed_default_report_types(db)
    rows = (
        db.query(ReportType)
        .filter(ReportType.is_active.is_(True))
        .order_by(ReportType.sort_order.asc(), ReportType.name.asc())
        .all()
    )
    return [str(row.name) for row in rows]


def get_active_report_type_names_from_db() -> list[str]:
    db = SessionLocal()
    try:
        return get_active_report_type_names(db)
    finally:
        db.close()
