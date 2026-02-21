"""
WritingService: Orchestrates AI-driven research generation.
Focuses on structural integrity, academic tone, and automated citation mapping.
"""

import json
import os
import re
from google.genai import types
from requests import Session
from google import genai
from sqlalchemy import UUID, update
from app.core.writing import (CRITICAL_LAW, ELUCIDATION_LAW, OUTPUT_LAW,PARAPHRASE_LAW, IDENTITY_LAW, STRUCTURAL_LAW
)
from app.models.research import PaperSection, ResearchArticle, ResearchOutline, ResearchSource, SearchRequest
from app.core.logging import logger
from app.core.database import SessionLocal


class WritingService:
    """Write articles based on context from db
    why this logic:
    - Using dictionary to protect data in case of having gemini vendor error,
      easily backup without prompting all over again
    """
    def __init__(self, db: Session, search_id: UUID):
        self.db = db
        self.client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model_name = "gemini-3-flash-preview"
        self.master_prompt = ""
        self.article_data = []
        self.cache_name = ""
        self.search_id = search_id
    def get_research_context(self):
        search_req = self.db.query(SearchRequest).filter(SearchRequest.id == self.search_id).first()
        outlines = self.db.query(ResearchOutline).filter(
            ResearchOutline.search_id == self.search_id
        ).order_by(ResearchOutline.stage).all()
        sources = self.db.query(ResearchSource).filter(
            ResearchSource.search_id == self.search_id
        ).all()

        if not search_req:
            logger.error(f"Database Error: SearchRequest not found for ID {self.search_id}, please make another search reqeust in endpoint /research/prompt")
            raise Exception(f"LỖI: Không tìm thấy SearchRequest với ID {self.search_id}")
        if not outlines or len(outlines) < 5:
            logger.error(f"Validation Error: Research outline has only {len(outlines) if outlines else 0} chapters, minimum 5 required, please make another search reqeust in endpoint /research/prompt")
            raise Exception("LỖI: Dàn ý nghiên cứu không đủ 5 chương chuẩn mực")
        if not sources:
            logger.error("Data Error: No Google Scholar sources found for citation, please go to endpoint /research/search/{search_id} from app.api.research.py to crawl sources")
            raise Exception("LỖI: Không tìm thấy nguồn dữ liệu Scholar để trích dẫn")

        return {
            "search_req": search_req,
            "outlines": outlines,
            "sources": sources
        }

    def _apply_draft_writing_laws(self):
        writing_laws = [
            OUTPUT_LAW,
            PARAPHRASE_LAW,
            IDENTITY_LAW,
            STRUCTURAL_LAW,
            CRITICAL_LAW,
            ELUCIDATION_LAW
        ]
        
        full_laws_block = "\n".join(writing_laws)
        
        return f"""
        --- HỆ THỐNG LUẬT VIẾT (THỰC THI TUYỆT ĐỐI) ---
        {full_laws_block}
        """
    
    def _build_master_prompt(self, context: dict, laws_block: str):
        search_req = context['search_req']
        outlines = context['outlines']
        sources = context['sources']

        source_items = []
        for source in sources:
            source_items.append(
                f"--- NGUỒN ID: {source.id} ---\n"
                f"Tiêu đề: {source.title}\n"
                f"Nội dung tóm lược: {source.snippet}\n"
            )
        sources_text = "\n".join(source_items)

        outline_items = []
        for o in outlines:
            outline_items.append(
                f"GIAI ĐOẠN {o.stage} - {o.title}: {o.writing_guideline}"
            )
        outline_text = "\n".join(outline_items)

        self.master_prompt = f"""
        {laws_block}

        --- NHIỆM VỤ NGHIÊN CỨU ---
        MỤC TIÊU GỐC: {search_req.prompt}

        --- CẤU TRÚC 5 GIAI ĐOẠN (Dàn ý) ---
        {outline_text}

        --- DANH SÁCH DỮ LIỆU NGUỒN (TRÍCH DẪN BẮT BUỘC) ---
        Dưới đây là các nguồn dữ liệu từ Google Scholar. Bạn phải trích dẫn bằng mã [Source ID: <uuid>] chính xác.
        {sources_text}

        --- CHỈ THỊ CUỐI CÙNG ---
        - Ngôn ngữ: TIẾNG VIỆT.
        - Bạn phải thực hiện việc Diễn giải (Paraphrase) và Phản biện (Critique) dựa trên dữ liệu nguồn.
        - Đảm bảo đầu ra chỉ là JSON thô, không chứa văn bản bao quanh.
        """
        return


    async def _init_gemini_cache(self):
        """
        Docstring for _call_gemini_pro_writer
        
        Why this logic:

        """

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=self.master_prompt
            )
            if not response or not response.text:
                logger.error(f"ERROR, Can't not get response from gemini to create cache to save article: {e}")
                raise Exception("Lỗi xảy ra khi đang khởi tạo bài viết, xin vui lòng thử lại sau.")

            clean_json_str = response.text.strip()
            if "```json" in clean_json_str:
                clean_json_str = clean_json_str.split("```json")[1].split("```")[0].strip()

            self.article_data.append(json.loads(clean_json_str))

            cache = self.client.caches.create(
                model = self.model_name,
                config = types.CreateCachedContentConfig(
                    display_name = f"cache_{str(self.search_id).replace("-", "")}",
                    system_instruction = self.master_prompt,
                    contents=[clean_json_str],
                    ttl="3600s",
                ),
            )
            self.cache_name = cache.name
            logger.info(f"Successfully created cache: {cache.name}")
            return

        except json.JSONDecodeError as e:
            logger.error(f"AI Response Parsing Error: Invalid JSON format from Gemini. Error: {e}")
            raise Exception("Hệ thống không thể xử lý định dạng dữ liệu từ AI. Vui lòng thử lại sau.")
        except Exception as e:
            logger.error(f"Gemini API Service Error: {e}")
            raise Exception("Đã xảy ra lỗi trong quá trình kết nối với dịch vụ Gemini 3 Pro.")


    def _writting_other_chapters(self):
        """
        Docstring for _writting_other_chapters
        
        Why this logic:
        - writting each chapter seperately unsure highest quaility for each chapter
        - using gemini context caching lowers token's usage
        """
        for stage in range(2,6):
            try:
                raw_response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=f"Dựa vào lịch sử đã viết ở Stage n-1, hãy sử dụng cấu trúc câu hoàn toàn khác biệt ở Stage n để tránh lặp lại nhịp điệu văn bản (textual rhythm).",
                    config=types.GenerateContentConfig(cached_content=self.cache_name)
                    )

                if not raw_response:
                    logger.error(f"ERROR: Probems when writting chapter: {stage}, error: {e} ")
                    raise Exception(f"Có lỗi xảy ra khi đang viết chapter: {stage}")

                clean_json_str = raw_response.text.strip()
                if "```json" in clean_json_str:
                    clean_json_str = clean_json_str.split("```json")[1].split("```")[0].strip()

                clean_json_data = json.loads(clean_json_str)
                self.article_data.append(clean_json_data)

                new_cache = self.client.caches.create(
                    model = self.model_name,
                    config = types.CreateCachedContentConfig(
                        display_name = f"cache_{str(self.search_id).replace("-", "")}",
                        system_instruction = self.master_prompt,
                        contents=[types.Content(
                                role="model", 
                                parts=[types.Part(text=json.dumps(self.article_data, ensure_ascii=False))]
                            )
                        ],
                        ttl="3600s",
                    ),
                )
                old_cache_name = self.cache_name
                self.cache_name = new_cache.name
                self.client.caches.delete(name=old_cache_name)
            except Exception as e:
                logger.error(f"ERROR: UNEXCEPTED ERROR: {e}")
        return

    def _save_article_with_auto_citation(self):
        """
        Docstring for _save_article_with_auto_citation
        
        why this logic:

        - Handles atomic persistence of the research article and its sections.
        - Mining Text: Mine sources ID from article in phrases to make sure LLM doesn't lie to write articles.
        .Mean while, the service is also updated which sources were used, for referencing.

        Ex:
            Input text: "AI is transforming healthcare [Source ID: 550e8400-e29b-41d4-a716-446655440000]."
            Extracted: "550e8400-e29b-41d4-a716-446655440000"
            UPDATED Source ID is_cited: True

        """

        try:
            new_article = ResearchArticle(
                search_id=self.search_id,
                title=self.article_data[0].get('article_title', 'Research Article')
            )
            self.db.add(new_article)
            self.db.flush()

            all_detected_uuids = set()
            for outline_item in self.article_data:
                order = outline_item.get("stage", 0)
                section_list = outline_item.get("section", [])
                for section in section_list:
                    section_title = section.get("title", f"Tiêu đề chương {order}")
                    section_content = section.get("content", "")

                    found_uuids = re.findall(r'\[Source ID: ([a-f0-9\-]{36})\]', section_content)
                    all_detected_uuids.update(found_uuids)

                    new_paper_section = PaperSection(
                        article_id = new_article.id,
                        section_title = section_title,
                        section_content = section_content,
                        order = order
                    )
                    self.db.add(new_paper_section)
            
            self.db.execute(
                update(ResearchSource)
                .where(ResearchSource.id.in_(list(all_detected_uuids)))
                .values(is_cited=True)
            )

            self.db.commit()
            return new_article.id

        except Exception as e:
            self.db.rollback()
            logger.error(f"ERROR: Fail to save article to database: {e}")
            raise Exception(f"Lỗi khi thực hiện lưu bài viết, vui lòng thử lại sai")

    async def write_full_research_article_pipline(self):
        context = self.get_research_context()
        laws_block = self._apply_draft_writing_laws()
        self._build_master_prompt(context, laws_block)
        await self._init_gemini_cache()
        self._writting_other_chapters()
        article_id = self._save_article_with_auto_citation()
        
        return article_id
    

if __name__ == "__main__":
    import asyncio

    async def quick_test():
        db = SessionLocal()
        test_id = "09384559-659c-473c-83ad-b1a784685120" 
        
        service = WritingService(db, test_id)

        res = await service.write_full_research_article_pipline()
        print(f"Kết quả test: {res}")

    asyncio.run(quick_test())