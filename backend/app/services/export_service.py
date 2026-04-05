from fpdf import FPDF
import re
from io import BytesIO
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.research import ArticleChapter, ChapterSource
from app.services.advanced.article_formatter import AdvancedArticleFormatter

class ExportService:
    def __init__(self, db:Session):
        """
        Docstring for ExportService
        """
        self.db = db
        self.full_content = ""
        self.final_source_list = []
        self.numbered_sections = []
    def make_up_citation(self, article):
        """
        why this logic:
        - Using found_uid_list for fetch out sources in order 1,2,3,...
        instead of using found_uuids and loop  query db for N(source) times which causes high latency and 
        avoid N+1 Query Problem
        """
        found_uid_list = []
        self.final_source_list = []
        self.numbered_sections = []
        content_blocks = []
        ordered_sections = sorted(article.chapters, key=lambda chapter: chapter.chapter_number or 0)
        for index, chapter in enumerate(ordered_sections, start=1):
            section_title = AdvancedArticleFormatter.normalize_section_title(chapter.chapter_title or f"Phần {index}")
            section_content = chapter.generated_content or ""
            if not section_content.strip():
                continue
            self.numbered_sections.append(
                {
                    "number": index,
                    "title": section_title,
                    "content": section_content,
                }
            )
            content_blocks.append(f"{index}. {section_title}\n\n{section_content}")

        self.full_content = "\n\n".join(content_blocks)
        found_uuids = re.findall(r"\[Source ID: ([a-f0-9-]{36})\]", self.full_content)
        for uid in found_uuids:
            if uid not in found_uid_list:
                found_uid_list.append(uid)
        source_stmt = (
            select(ChapterSource)
            .join(ArticleChapter, ChapterSource.chapter_id == ArticleChapter.id)
            .where(
                ArticleChapter.article_id == article.id,
                ChapterSource.id.in_(found_uid_list),
            )
        )

        cited_sources = self.db.execute(source_stmt).scalars().all()

        cited_source_map = {str(cited_source.id): cited_source for cited_source in cited_sources}

        for uid in found_uid_list:
            if uid in cited_source_map:
                self.final_source_list.append(cited_source_map[uid])
        return self.final_source_list


    def generate_article_pdf(self, article_title: str):
        pdf = FPDF(unit='mm', format='A4')
        pdf.set_margins(20, 20, 20)
        pdf.add_page()
        
        backend_root = Path(__file__).resolve().parents[2]
        font_path = backend_root / "assets" / "fonts" / "DejaVuSans.ttf"
        bold_font_path = backend_root / "assets" / "fonts" / "DejaVuSans-Bold.ttf"
        pdf.add_font("DejaVu", "", str(font_path))
        pdf.add_font("DejaVu", "B", str(bold_font_path))
        
        pdf.set_font("DejaVu", "B", 22)
        pdf.set_text_color(20, 50, 100)
        pdf.multi_cell(0, 12, article_title, align='C') 
        
        pdf.set_draw_color(20, 50, 100)
        pdf.set_line_width(0.8)
        pdf.line(60, pdf.get_y() + 5, 150, pdf.get_y() + 5)
        pdf.ln(20)

        pdf.set_font("DejaVu", "", 12)
        pdf.set_text_color(30, 30, 30)
        for section in self.numbered_sections:
            display_title = section["title"]
            display_content = section["content"]
            for index, source in enumerate(self.final_source_list, start=1):
                display_content = display_content.replace(f"[Source ID: {source.id}]", f"[{index}]")

            pdf.set_font("DejaVu", "B", 15)
            pdf.set_text_color(20, 50, 100)
            pdf.multi_cell(0, 9, display_title)
            pdf.ln(1)
            pdf.set_font("DejaVu", "", 12)
            pdf.set_text_color(30, 30, 30)
            pdf.multi_cell(0, 8, display_content, align='J')
            pdf.ln(6)
        
        if self.final_source_list:
            pdf.add_page()
            pdf.ln(10)
            pdf.set_font("DejaVu", "B", 18)
            pdf.set_text_color(20, 50, 100)
            pdf.cell(0, 10, "REFERENCES", ln=True, align='L')
            pdf.ln(5)

            margin_l = 20       
            num_w = 12         
            content_x = margin_l + num_w  
            usable_w = pdf.epw - num_w 

            for i, source in enumerate(self.final_source_list, start=1):
                pub = source.publication or "Scholar Source"
                year = source.year or "N/A"
                title = source.title or "Unknown Title"
                link = source.url or ""
                cite_count = source.citation_count or 0

                pdf.set_x(margin_l)
                pdf.set_font("DejaVu", "B", 11)
                pdf.set_text_color(20, 100, 200)
                pdf.cell(num_w, 7, f"[{i}]") 

                pdf.set_x(content_x)
                pdf.set_font("DejaVu", "", 10)
                pdf.set_text_color(100, 100, 100)
                pdf.multi_cell(usable_w, 5, f"{pub}, {year}")

                pdf.set_x(content_x)
                pdf.set_font("DejaVu", "B", 10)
                pdf.set_text_color(30, 30, 30)
                pdf.multi_cell(usable_w, 6, f"\"{title}\"")


                if link:
                    pdf.set_x(content_x)
                    pdf.set_font("DejaVu", "", 8)
                    pdf.set_text_color(20, 100, 200)

                    pdf.multi_cell(usable_w, 4, link, link=link)

                pdf.set_x(content_x)
                pdf.set_font("DejaVu", "", 8)
                pdf.set_text_color(150, 150, 150)
                pdf.cell(0, 5, f"({cite_count} lượt trích dẫn)")
                
                pdf.ln(10)
        pdf.set_y(-15)
        pdf.set_font("DejaVu", "", 8)
        pdf.set_text_color(120, 120, 120)
        pdf.cell(0, 10, f"Trang {pdf.page_no()}", align='C')

        return BytesIO(pdf.output())
