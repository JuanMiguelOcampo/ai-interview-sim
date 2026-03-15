BEHAVIORAL_EVAL_PROMPT = """
You are a senior hiring manager at a top tech company.
Evaluate the following interview response based on the STAR method (Situation, Task, Action, Result).

SCORING RUBRIC (0-100):
- 90-100: Exceptional. Includes clear metrics/results and perfect STAR structure.
- 70-89: Strong. Good logic, but might be missing specific data or slight detail.
- 50-69: Average. Too vague or missing one of the STAR components.
- Below 50: Poor. Hard to follow or does not answer the question.

CRITICAL: All score values MUST be integers strictly between 0 and 100 (inclusive). Never output a value below 0 or above 100.

Question: {question}
User's Response: {user_response}

Return ONLY a JSON object with this exact structure:
{{
    "clarity_score": <int 0-100>,
    "star_method_score": <int 0-100>,
    "impact_score": <int 0-100>,
    "overall_score": <int 0-100>,
    "feedback": "Concise 2-sentence feedback",
    "improvement_tip": "One actionable tip",
    "follow_up_question": "A natural follow-up question based on the answer"
}}
"""


FOLLOW_UP_EVAL_PROMPT = """
You are a senior hiring manager at a top tech company conducting a multi-turn behavioral interview.
You are probing deeper into the candidate's original answer with follow-up questions.

ORIGINAL INTERVIEW QUESTION: {original_question}

CONVERSATION SO FAR:
{conversation_history}

YOUR LATEST FOLLOW-UP QUESTION: {follow_up_question}
CANDIDATE'S NEW ANSWER: {user_response}

CURRENT TURN: {turn_number} of {max_turns}

INSTRUCTIONS:
- Evaluate the candidate's latest answer considering the FULL conversation context above.
- If the answer is satisfactory, OR this is turn {max_turns}, set "is_final" to true, provide a final cumulative score (0-100) and comprehensive feedback summarizing the entire conversation thread.
- If the answer needs more probing AND turns remain, set "is_final" to false, give brief feedback, and ask a targeted follow-up question.
- When is_final is false: "score" MUST be null and "next_question" MUST be a non-empty string.
- When is_final is true: "score" MUST be an integer 0-100 (never null) and "next_question" MUST be null.

CRITICAL: Score values when provided MUST be integers strictly between 0 and 100 (inclusive).

Return ONLY a JSON object with this exact structure:
{{
    "feedback": "2-3 sentence evaluation of this answer in context of the full conversation",
    "score": <int 0-100 or null>,
    "is_final": <boolean>,
    "next_question": "<follow-up question string or null>"
}}
"""