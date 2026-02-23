"""
Docstring for backend.app.services.research_service

This module orchestrates the initial phases of the AI Research Summary System (ARSS).
It is designed to bridge the gap between abstract user intent and grounded academic content.

WHY THIS ARCHITECTURE?
1. Blueprinting (PromptService): We treat research as an engineering task. Before 
   writing, we generate a formal 'Architectural Plan' to ensure structural 
   consistency and alignment with academic standards.
2. Data Grounding (ResearchService): To prevent AI hallucinations, we implement 
   a Retrieval-Augmented Generation (RAG) approach, harvesting real-world scholar 
   data via the Serper API before the generation phase begins.
3. Decoupling: By separating Planning (Prompt) from Harvesting (Research), we 
   ensure each service has a Single Responsibility, making the system easier 
   to scale and debug.

"""

import json
import os
from google import genai
import httpx
from sqlalchemy.orm import Session
from app.models.research import ResearchOutline, ResearchSource, SearchRequest
from app.core.prompt import OUTLINE_MASTER_PROMPT

class PromptService:
    """
    Docstring for PromptService
    Orchestrates the 'Architectural' phase of the research project.
    """
    def __init__(self, db: Session):
        self.db = db
        self.client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model_name = 'gemini-3-flash-preview'

    async def architect_research_plan(self, raw_input: str):
        """
        Docstring for architect_research_plan

        Why this logic:
        - Isolates the core research topic from noise data when gernerated by LLM.
        - Verifies alignment between the 5-stage framework and user goals.
        - Generates an academic-grade English search query
        to maximize the response quality from Scholar data.
         
        Returns a strictly structured JSON response based on OUTLINE_MASTER_PROMPT:
        {
            "extracted_topic": "The core research subject identified by the LLM.",
            "audit_summary": "A transparent breakdown of how user intent was mapped across the 5 stages.",
            "optimized_search_query": "A high-precision English query tailored for scholar-grade search engines.",
            "final_outline": [
                {
                    "stage": int, # 1 to 5 sequential stages
                    "title": "Academic-grade chapter title",
                    "user_intent_matched": bool, # Validation flag for structural alignment
                    "writing_guideline": "Detailed instructions for the generation phase."
                }
            ]
        }

        """
        prompt = OUTLINE_MASTER_PROMPT.format(raw_input=raw_input)

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )

            clean_json = response.text.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean_json)
            new_search = SearchRequest(
                prompt=data.get('extracted_topic', raw_input), 
                optimized_query=data.get('optimized_search_query')
            )
            self.db.add(new_search)
            self.db.flush()

            for item in data.get('final_outline', []):
                        chapter = ResearchOutline(
                            search_id=new_search.id,
                            stage=item.get('stage'),
                            title=item.get('title'),
                            writing_guideline=item.get('writing_guideline'),
                            user_intent_matched=item.get('user_intent_matched', False)
                        )
                        self.db.add(chapter)

            self.db.commit()
            self.db.refresh(new_search)

            return {
                "search_id": new_search.id,
                "topic": data.get('extracted_topic'),
                "optimized_query": data.get('optimized_search_query'),
                "outline": data.get('final_outline'),
                "audit_summary": data.get('audit_summary')
            }

        except Exception as e:
            print(f"Lỗi thực thi Gemini: {str(e)}")
            raise Exception(f"AI không thể lập bản vẽ: {str(e)}")
        
class ResearchService:
    def __init__(self, db: Session):
        self.db = db

    async def fetch_and_save_sources(self, search_id: str):
        """
        Executes external data acquisition from Google Scholar via Serper API.
        
        Why this logic:
        1. Retrieval-Augmented Generation (RAG): We gather peer-reviewed snippets 
           to ensure the WritingService cites verifiable sources.
        2. Metadata Persistence: Saves links, years, and citation counts to 
           build a robust bibliography for the final research article.
        """
        
        search_req = self.db.query(SearchRequest).filter(SearchRequest.id == search_id).first()
        if not search_req:
            raise Exception("Can not find search sources, please ensure you have a correct search id first!")

        serper_url = "https://google.serper.dev/scholar"
        headers = {
            'X-API-KEY': os.getenv("SERPER_API_KEY"),
            'Content-Type': 'application/json'
        }
        payload = {
            "q": search_req.optimized_query,
            "num": 10
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(serper_url, headers=headers, json=payload)
            if response.status_code != 200:
                raise Exception(f"Serper Scholar Error: {response.text}")
            search_data = response.json()
        organic_results = search_data.get('organic', [])
        for item in organic_results:
            new_source = ResearchSource(
                search_id=search_req.id,
                title=item.get('title'),
                link=item.get('link'),
                snippet=item.get('snippet'),
                publication=item.get('publicationInfo'),
                year=item.get('year'),
                citation_count=item.get('citedBy')
            )
            self.db.add(new_source)
        self.db.commit()
        return len(organic_results)
    
