import httpx
import json
import re
from app.core.config import settings
from app.core.prompts import BEHAVIORAL_EVAL_PROMPT
from app.models.schemas import EvaluationResponse

def evaluate_behavioral_response(question: str, user_response: str) -> EvaluationResponse:
    prompt = BEHAVIORAL_EVAL_PROMPT.format(question=question, user_response=user_response)
    
    # 1. We use the active 2026 model: gemini-2.5-flash
    # 2. We use the stable v1 API path
    model_name = "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1/models/{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }

    try:
        # Direct REST call to bypass SDK versioning issues
        with httpx.Client() as client:
            response = client.post(url, json=payload, timeout=30.0)
            
        result = response.json()
        
        print(f"DEBUG: AI Response Status -> {response.status_code}")
        
        if response.status_code != 200:
            print(f"DEBUG: Error Details -> {result}")
            raise ValueError(f"Gemini API Error: {result.get('error', {}).get('message', 'Unknown error')}")

        # Drill down into the JSON to extract the text
        ai_text = result['candidates'][0]['content']['parts'][0]['text']
        
        # Clean up the text in case the AI wrapped the JSON in markdown blocks
        clean_json = re.search(r'\{.*\}', ai_text, re.DOTALL)
        data = json.loads(clean_json.group(0)) if clean_json else json.loads(ai_text)
        
        return EvaluationResponse(**data)
        
    except Exception as e:
        print(f"CRITICAL BACKEND ERROR: {str(e)}")
        raise e