import httpx
import json
import re
from app.core.config import settings
from app.core.prompts import BEHAVIORAL_EVAL_PROMPT, FOLLOW_UP_EVAL_PROMPT
from app.models.schemas import EvaluationResponse, FollowUpResponse

GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1/models/"
    f"{GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
)

# Fix E: Module-level singleton — avoids TCP connection teardown on every call.
# Limits: 10 keepalive + 20 total connections to avoid exhausting FD limits.
_http_client = httpx.AsyncClient(
    limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
    timeout=httpx.Timeout(60.0, connect=10.0),
)


async def _call_gemini(prompt: str) -> dict:
    """Shared helper: sends a prompt to Gemini and returns the parsed JSON dict."""
    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    response = await _http_client.post(GEMINI_URL, json=payload)
    result = response.json()

    if response.status_code != 200:
        print(f"DEBUG: Gemini API Error -> {result}")
        raise ValueError(
            f"Gemini API Error: {result.get('error', {}).get('message', 'Unknown error')}"
        )

    ai_text = result["candidates"][0]["content"]["parts"][0]["text"]

    # Robust regex fallback to strip markdown fences (```json ... ```)
    clean_json_match = re.search(r"\{.*\}", ai_text, re.DOTALL)

    if not clean_json_match:
        print(f"DEBUG AI RAW OUTPUT: {ai_text}")
        raise ValueError("Failed to extract JSON from the AI response.")

    return json.loads(clean_json_match.group(0))


async def evaluate_behavioral_response(
    question: str, user_response: str
) -> EvaluationResponse:
    """Evaluates an initial interview response (single-turn)."""
    try:
        prompt = BEHAVIORAL_EVAL_PROMPT.format(
            question=question, user_response=user_response
        )
        data = await _call_gemini(prompt)
        return EvaluationResponse(**data)
    except Exception as e:
        print(f"CRITICAL BACKEND ERROR: {str(e)}")
        raise


async def evaluate_follow_up_response(
    original_question: str,
    conversation_history: str,
    follow_up_question: str,
    user_response: str,
    turn_number: int,
    max_turns: int = 3,
) -> FollowUpResponse:
    """Evaluates a follow-up answer with full conversation context."""
    try:
        prompt = FOLLOW_UP_EVAL_PROMPT.format(
            original_question=original_question,
            conversation_history=conversation_history,
            follow_up_question=follow_up_question,
            user_response=user_response,
            turn_number=turn_number,
            max_turns=max_turns,
        )
        data = await _call_gemini(prompt)

        # Enforce finality on the last allowed turn regardless of AI decision
        if turn_number >= max_turns:
            data["is_final"] = True
            data["next_question"] = None
            if data.get("score") is None:
                data["score"] = 50  # Safe fallback so model_validator passes

        return FollowUpResponse(**data, turn_number=turn_number)
    except Exception as e:
        print(f"CRITICAL BACKEND ERROR (follow-up): {str(e)}")
        raise