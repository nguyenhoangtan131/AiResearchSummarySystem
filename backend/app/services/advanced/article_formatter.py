import re
from typing import Callable

from app.models.research import ArticleBlueprint, ArticleChapter


class AdvancedArticleFormatter:
    @staticmethod
    def normalize_section_title(title: str) -> str:
        cleaned = " ".join((title or "").split()).strip()
        cleaned = re.sub(r"^\d+\.\s*", "", cleaned)
        cleaned = re.sub(r"^(chương|chapter)\s+\d+\s*[:.-]?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^#+\s*", "", cleaned)
        return cleaned.strip() or "Nội dung chương"

    @staticmethod
    def normalize_section_content(content: str) -> str:
        normalized_lines: list[str] = []
        lines = (content or "").replace("\r\n", "\n").split("\n")
        index = 0
        while index < len(lines):
            line = lines[index]
            stripped = line.strip()
            if stripped.startswith("|"):
                table_lines: list[str] = []
                while index < len(lines) and lines[index].strip().startswith("|"):
                    table_lines.append(lines[index].strip())
                    index += 1
                normalized_lines.extend(AdvancedArticleFormatter._convert_markdown_table_block(table_lines))
                continue
            if stripped.startswith("#"):
                normalized_lines.append(re.sub(r"^#+\s*", "", stripped))
            else:
                normalized_lines.append(line)
            index += 1

        cleaned = "\n".join(normalized_lines)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
        return cleaned

    @staticmethod
    def build_section_payloads(
        chapters: list[ArticleChapter],
        blueprints: list[ArticleBlueprint],
        generated_cache_lookup: Callable[[int], dict[str, str] | None] | None = None,
    ) -> list[dict[str, str | int]]:
        blueprint_map = {item.chapter_number: item for item in blueprints}
        payloads: list[dict[str, str | int]] = []

        for chapter in sorted(chapters, key=lambda item: item.chapter_number):
            cached = generated_cache_lookup(chapter.chapter_number) if generated_cache_lookup else {}
            cached = cached or {}
            blueprint = blueprint_map.get(chapter.chapter_number)
            section_title = AdvancedArticleFormatter.normalize_section_title(
                str(cached.get("section_title") or "")
                or chapter.chapter_title
                or (blueprint.title if blueprint and blueprint.title else "")
                or f"Phần {chapter.chapter_number}"
            )
            section_content = AdvancedArticleFormatter.normalize_section_content(chapter.generated_content or "")
            if not section_content:
                section_content = AdvancedArticleFormatter.normalize_section_content(
                    str(cached.get("section_content") or "")
                )
            if not section_content:
                continue
            payloads.append(
                {
                    "order": chapter.chapter_number,
                    "section_title": section_title,
                    "section_content": section_content,
                }
            )
        return payloads

    @staticmethod
    def _convert_markdown_table_block(table_lines: list[str]) -> list[str]:
        rows = []
        for raw_line in table_lines:
            stripped = raw_line.strip().strip("|")
            cells = [cell.strip() for cell in stripped.split("|")]
            if cells and all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells):
                continue
            rows.append(cells)

        if len(rows) <= 1:
            return [" ".join(cell for cell in rows[0] if cell).strip()] if rows else []

        headers = rows[0]
        converted = ["Tổng hợp thông tin chính từ các nghiên cứu liên quan:"]
        for row in rows[1:]:
            pairs = []
            for idx, value in enumerate(row):
                if not value:
                    continue
                header = headers[idx] if idx < len(headers) and headers[idx] else f"Cột {idx + 1}"
                pairs.append(f"{header}: {value}")
            if pairs:
                converted.append("- " + "; ".join(pairs))
        return converted
