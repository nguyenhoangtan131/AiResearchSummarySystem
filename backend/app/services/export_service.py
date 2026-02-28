from fpdf import FPDF
import re
from io import BytesIO
import os
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.research import ResearchSource

class ExportService:
    def __init__(self, db:Session):
        """
        Docstring for ExportService
        """
        self.db = db
        self.full_content = ""
        self.final_source_list = []
    def make_up_citation(self, article):
        """
        why this logic:
        - Using found_uid_list for fetch out sources in order 1,2,3,...
        instead of using found_uuids and loop  query db for N(source) times which causes high latency and 
        avoid N+1 Query Problem
        """
        found_uid_list = []
        self.full_content = " ".join([section.section_content for section in article.sections])
        found_uuids = re.findall(r"\[Source ID: ([a-f0-9-]{36})\]", self.full_content)
        for uid in found_uuids:
            if uid not in found_uid_list:
                found_uid_list.append(uid)
        source_stmt = (
            select(ResearchSource)
            .where(ResearchSource.search_id == article.search_id,
                   ResearchSource.is_cited == True,
                   ResearchSource.id.in_(found_uid_list)))

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
        
        font_path = os.path.join("assets", "fonts", "DejaVuSans.ttf")
        pdf.add_font("DejaVu", "", font_path)
        pdf.add_font("DejaVu", "B", "assets/fonts/DejaVuSans-Bold.ttf")
        pdf.set_font("DejaVu", "", 22)
        pdf.set_text_color(20, 50, 100)
        
        pdf.multi_cell(0, 12, article_title.upper(), align='C') 
        
        pdf.set_draw_color(20, 50, 100)
        pdf.set_line_width(0.5)
        pdf.line(pdf.get_x() + 40, pdf.get_y() + 5, pdf.get_x() + 130, pdf.get_y() + 5)
        pdf.ln(20)

        display_content = self.full_content
        for index, source in enumerate(self.final_source_list, start=1):
            display_content = display_content.replace(f"[Source ID: {source.id}]", f"[{index}]")

        pdf.set_font("DejaVu", "", 12)
        pdf.set_text_color(30, 30, 30)
        pdf.multi_cell(0, 8, display_content, align='J') 
        
        if self.final_source_list:
            pdf.add_page()
            pdf.ln(10)
            pdf.set_font("DejaVu", "", 16)
            pdf.set_text_color(20, 50, 100)
            pdf.cell(0, 10, "REFERENCES", ln=True, align='L')
            pdf.set_draw_color(20, 50, 100)
            pdf.line(pdf.get_x(), pdf.get_y(), pdf.get_x() + 30, pdf.get_y())
            pdf.ln(10)

            pdf.set_font("DejaVu", "", 10)
            pdf.set_text_color(60, 60, 60)
            for i, source in enumerate(self.final_source_list, start=1):
                title = source.title if hasattr(source, 'title') else 'Unknown Title'
                url = source.url if hasattr(source, 'url') else ''
                
                pdf.set_x(25)
                source_text = f"[{i}] {title}"
                if url: source_text += f"\n    Source: {url}"
                
                pdf.multi_cell(0, 6, source_text)
                pdf.ln(4)

        page_no = f"Trang {pdf.page_no()}"
        pdf.set_y(-15)
        pdf.set_font("DejaVu", "", 8)
        pdf.cell(0, 10, page_no, align='C')

        return BytesIO(pdf.output())