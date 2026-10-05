"""Builds prompts, manages the one-question-at-a-time Q&A flow, and scores
mock interviews. Sequences for full and resume modes are calibrated with
company-aware interview styles, deduplication, 4-band ratings, and difficulty levels.
"""
import json
import logging
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.answer import Answer
from app.models.interview_session import InterviewMode, InterviewSession, InterviewSessionStatus
from app.models.question import DifficultyLevel, Question, QuestionType
from app.services import groq_client

logger = logging.getLogger(__name__)

MAX_INTERVIEW_QUESTIONS = 10

# Source of truth for company interview styles
COMPANY_INTERVIEW_STYLES: dict[str, str] = {
    "google": (
        "focuses on problem-solving approach, system design thinking, and explaining reasoning "
        "step by step. Rarely asks definition questions. Always asks 'why' and 'how would you scale this'. "
        "Expects candidates to think aloud and challenge their own assumptions."
    ),
    "tcs": (
        "focuses on basic CS fundamentals, communication skills, and straightforward technical definitions. "
        "Questions are direct and not puzzle-style. HR fit is heavily weighted."
    ),
    "amazon": (
        "leadership-principle-heavy behavioral questions mixed with DSA. Always ties technical questions "
        "back to real-world product impact. Expects candidates to reference past experience using the STAR format."
    ),
    "infosys": (
        "verbal aptitude, basic programming logic, and straightforward HR questions. Not heavy on advanced DSA. "
        "Expects clarity of communication more than technical depth."
    ),
    "microsoft": (
        "deep technical depth, system design, and behavioral questions. Expects candidates to think aloud, "
        "arrive at answers collaboratively, and challenge their own initial approach."
    ),
    "wipro": (
        "communication-heavy, basic technical concepts, and situational HR. Emphasizes teamwork and "
        "adaptability over raw technical skill."
    ),
    "cognizant": (
        "similar to TCS and Infosys — fundamental CS, verbal reasoning, and HR. Expects clear communication "
        "and basic project knowledge."
    ),
    "flipkart": (
        "strong DSA focus, system design for scale, and product thinking. Closer to Google/Amazon style "
        "than service companies."
    ),
    "adobe": (
        "creative problem-solving, strong DSA, and product design thinking. Expects candidates to discuss "
        "trade-offs and user experience considerations."
    ),
    "oracle": (
        "database and backend heavy — SQL, data structures, and system architecture. Behavioral questions "
        "focus on problem-solving in ambiguous situations."
    ),
    "default": (
        "standard placement interview style — balanced technical, behavioral, and problem-solving "
        "questions appropriate for a campus placement drive."
    ),
}

DIFFICULTY_CONFIG: dict[str, dict[str, str]] = {
    "fresher": {
        "label": "Fresher",
        "description": "Final year student, first placement attempt",
        "generation_instruction": (
            "The candidate is a final-year undergraduate student with academic knowledge and project "
            "experience but no industry exposure. Calibrate questions to this level: foundational concepts, "
            "project-based questions, and straightforward situational scenarios. Avoid expecting "
            "production-system experience or advanced architectural knowledge."
        ),
        "evaluation_instruction": (
            "Evaluate at the standard expected of a final-year undergraduate student. For 'interview_ready,' "
            "a clear foundational understanding with at least one practical example from academic projects is "
            "sufficient. Do not penalize for lack of industry experience."
        ),
    },
    "mid_level": {
        "label": "Mid-Level",
        "description": "1-2 years experience or strong academic background",
        "generation_instruction": (
            "The candidate has 1-2 years of experience or is a strong student targeting competitive companies. "
            "Ask questions that require deeper explanation, awareness of trade-offs, and some practical "
            "application beyond textbook knowledge. Mix medium and hard difficulty."
        ),
        "evaluation_instruction": (
            "Evaluate at the standard of a candidate with solid fundamentals and some hands-on experience. "
            "'Interview_ready' requires not just correct answers but demonstration of practical awareness and "
            "trade-off thinking."
        ),
    },
    "senior": {
        "label": "Senior",
        "description": "3+ years or targeting product companies",
        "generation_instruction": (
            "The candidate is targeting top product companies or has significant experience. Ask deep "
            "technical questions requiring system design thinking, architectural trade-offs, scalability "
            "considerations, and real production experience. Hard difficulty throughout."
        ),
        "evaluation_instruction": (
            "Evaluate at a high bar. 'Interview_ready' requires depth, trade-off awareness, real-world "
            "applicability, and the ability to consider edge cases and scale. Surface-level correct answers "
            "should be rated 'good' at best."
        ),
    },
}

RATING_BANDS: dict[str, dict[str, str]] = {
    "interview_ready": {
        "color": "purple",
        "label": "Interview Ready",
        "meaning": "A real interviewer would be satisfied and move on positively. Answer is complete, structured, confident, and demonstrates real understanding.",
    },
    "good": {
        "color": "yellow",
        "label": "Good",
        "meaning": "Answer covers the main point but lacks depth, a real example, or a connection to practical application. Interviewer would want a bit more.",
    },
    "somewhat_closer": {
        "color": "green",
        "label": "Somewhat There",
        "meaning": "Answer shows partial understanding but misses key aspects or contains a misconception. Interviewer would probe further or redirect.",
    },
    "not_relevant": {
        "color": "red",
        "label": "Not Relevant",
        "meaning": "Answer does not address the question, is too vague to evaluate, or demonstrates a significant knowledge gap.",
    },
}

RATING_NUMERIC_MAP: dict[str, float] = {
    "interview_ready": 95.0,
    "good": 72.0,
    "somewhat_closer": 45.0,
    "not_relevant": 15.0,
}

# 10 questions for FULL mode: 2 Aptitude, 3 Technical, 3 Coding, 2 HR
FULL_STAGE_DISTRIBUTION: list[QuestionType] = [
    QuestionType.APTITUDE,   # Q1 (index 0)
    QuestionType.APTITUDE,   # Q2 (index 1)
    QuestionType.TECHNICAL,  # Q3 (index 2)
    QuestionType.TECHNICAL,  # Q4 (index 3)
    QuestionType.TECHNICAL,  # Q5 (index 4)
    QuestionType.CODING,     # Q6 (index 5)
    QuestionType.CODING,     # Q7 (index 6)
    QuestionType.CODING,     # Q8 (index 7)
    QuestionType.HR,         # Q9 (index 8)
    QuestionType.HR,         # Q10 (index 9)
]

# 10 questions for RESUME mode: 3 Resume, 3 Technical, 2 Coding, 2 HR
RESUME_STAGE_DISTRIBUTION: list[QuestionType] = [
    QuestionType.RESUME,     # Q1 (index 0)
    QuestionType.RESUME,     # Q2 (index 1)
    QuestionType.RESUME,     # Q3 (index 2)
    QuestionType.TECHNICAL,  # Q4 (index 3)
    QuestionType.TECHNICAL,  # Q5 (index 4)
    QuestionType.TECHNICAL,  # Q6 (index 5)
    QuestionType.CODING,     # Q7 (index 6)
    QuestionType.CODING,     # Q8 (index 7)
    QuestionType.HR,         # Q9 (index 8)
    QuestionType.HR,         # Q10 (index 9)
]

_MODE_TO_QUESTION_TYPE = {
    InterviewMode.APTITUDE: QuestionType.APTITUDE,
    InterviewMode.TECHNICAL: QuestionType.TECHNICAL,
    InterviewMode.CODING: QuestionType.CODING,
    InterviewMode.HR: QuestionType.HR,
}


_QUESTION_SYSTEM_PROMPT = """You are a senior interviewer at {company_name}. Your company's interview style: {company_style}

This is a MOCK INTERVIEW simulating a real face-to-face or video interview — not a practice test, not a quiz. Ask questions exactly the way a real interviewer would ask them in an actual interview conversation.

Current stage: {stage}
Difficulty: {difficulty_label}
{difficulty_instruction}
Question {n} of {total}

Stage-specific rules you must follow without exception:

APTITUDE stage: Ask verbal reasoning, estimation, or situational judgment questions — the kind a real interviewer asks in conversation. NOT arithmetic puzzles ("a train travels 60km..."). Ask things like "How would you approach a problem where you have incomplete information?" or "Walk me through how you'd estimate the number of ATMs in a city." The question should test logical thinking, not arithmetic speed.

TECHNICAL stage: Ask concept-understanding and application questions, not definition lookups. "Explain how you would design X" or "What trade-offs would you consider when choosing between X and Y?" — not "Define X." Expect the candidate to explain their reasoning, not recite a textbook answer.

CODING stage: Describe a coding problem verbally as a real interviewer would in a conversation — natural language, not a formatted problem statement. "Given a list of numbers, how would you find all pairs that sum to a target?" not a LeetCode-formatted block of text with constraints and examples. The student will type code or pseudocode in response.

HR stage: Ask genuine behavioral questions about past experience, approach to challenges, teamwork, and professional values. Use the STAR format implicitly — questions should naturally invite a structured response without explicitly saying "use STAR."

Deduplication — this is mandatory: do not generate a question that is the same as, similar to, or a rephrasing of any question in this list: {previous_questions_json}. If you find yourself wanting to ask about the same topic, pick a different angle or a different topic entirely.

Vary your question opening — do not start consecutive questions with the same word or phrase.

Respond ONLY with a valid JSON object, no surrounding text, no markdown:
{{"question_text": string, "q_type": string, "difficulty": string, "interviewer_note": string}}

q_type must be one of: "aptitude", "technical", "coding", "hr", "resume"
difficulty must be one of: "easy", "medium", "hard"
interviewer_note is a one-sentence internal note on what a complete answer should cover — this is shown to the student ONLY after they submit their answer, never before."""


_RESUME_QUESTION_SYSTEM_PROMPT = """You are an interviewer who has just finished reading a candidate's resume. You are now conducting a face-to-face interview. Your job is to ask genuine follow-up questions about what they have actually written — their real projects, their actual internship or work experience, the technologies they claim to know, and the achievements they listed.

Every single question you generate must be directly traceable to something specific in their resume. Do not ask generic questions that could be asked of any candidate. If you cannot point to a specific line, project, skill, or experience on their resume that prompted this question, do not ask it.

Examples of the style you should follow:
- "I see you built a restaurant reservation system — how did you handle concurrent bookings?"
- "You listed Redis under skills — have you used it in production? Walk me through how."
- "Your internship was at X company — what was the most technically challenging problem you solved there, and how did you approach it?"
- "You mentioned React in your project — tell me about a specific component you're proud of and what made it difficult to build."
- "I notice you worked with both SQL and MongoDB — how did you decide which to use for your project, and what trade-offs did you consider?"

Difficulty: {difficulty_label}
{difficulty_instruction}
Question {n} of {total}

Previously asked questions — do not repeat or closely overlap with any of these: {previous_questions_json}

Resume content:
{full_resume_text}

Respond ONLY with a valid JSON object, no surrounding text, no markdown:
{{"question_text": string, "q_type": "resume", "difficulty": string, "resume_reference": string, "interviewer_note": string}}

resume_reference is the specific resume item this question is about, e.g. "Redis under Skills section" or "Restaurant reservation system project" — used for internal tracking only, never shown to the student during the question.
interviewer_note is a one-sentence note on what a strong answer should demonstrate — shown to student only after they submit their answer."""


_ANSWER_EVAL_SYSTEM_PROMPT = """You are evaluating one answer from a mock placement interview. Assign exactly one of four rating bands based on how a real interviewer would genuinely react to this answer.

The four bands and when to use them:

"interview_ready" — The candidate answered this well. A real interviewer would be satisfied and move on. The answer is complete, clearly structured, and demonstrates real understanding. Use this only when the answer genuinely earns it — not as encouragement.

"good" — The candidate understood the question and gave a reasonable answer, but something important is missing: a concrete example, a trade-off consideration, a connection to real-world application, or sufficient depth. An interviewer would want a bit more before moving on confidently.

"somewhat_closer" — The candidate is on the right track but has a meaningful gap: a partial misconception, a missing key concept, or an answer that is too surface-level to demonstrate genuine knowledge. An interviewer would probe further or gently redirect.

"not_relevant" — The candidate did not address the question, gave a vague non-answer, confused fundamental concepts, or demonstrated a clear knowledge gap. An interviewer would note this as a concern.

Question type: {q_type}
Stage: {stage}
Difficulty: {difficulty_label}
Question: {question_text}
Candidate's answer: {answer_text}

Apply these type-specific grading criteria:

For q_type "technical": judge on correctness of understanding, depth of explanation, awareness of trade-offs, and real-world applicability. A definition alone without explanation of why or when is at most "good."

For q_type "coding": judge on algorithmic correctness, handling of edge cases, awareness of time/space complexity, and whether the code or pseudocode actually solves the stated problem. Correct brute-force with no complexity awareness = "somewhat_closer". Correct with complexity awareness = "good". Correct with complexity, edge cases, and optimization thinking = "interview_ready."

For q_type "aptitude": judge on clarity of reasoning process, logical structure of the approach, and whether the candidate arrives at a defensible answer through sound thinking — not just whether the final answer is numerically correct.

For q_type "hr": judge on STAR structure (situation, task, action, result), specificity of the example given, self-awareness demonstrated, and relevance to the question asked. Generic answers with no specific example = "somewhat_closer" at best.

For q_type "resume": judge on whether the candidate genuinely knows the detail of what they put on their resume. Vague answers about their own listed projects or skills = "not_relevant." Specific, detailed answers demonstrating real ownership = "interview_ready."

Respond ONLY with a valid JSON object, no surrounding text, no markdown:
{{
  "rating": one of "interview_ready"|"good"|"somewhat_closer"|"not_relevant",
  "feedback": string,
  "what_was_missing": string or null,
  "interviewer_note_reveal": string
}}

feedback: 2-3 sentences of specific, actionable feedback written as an interviewer speaking directly to the candidate in second person ("You explained X well, but you missed Y..."). Never start with "Great answer!" or generic praise. Be direct and constructive.
what_was_missing: one sentence on the single most important thing they should have added to reach the next band up. Set to null if rating is "interview_ready."
interviewer_note_reveal: copy the interviewer_note that was generated with the question — this is now revealed to the student as "what a strong answer would have covered."""


_WEAK_AREA_SYSTEM_PROMPT = """You are summarizing a completed mock interview. Given the full
transcript of questions, answers, per-answer feedback, and scores, respond ONLY with a JSON
object of the exact shape: {"weak_areas": [string, ...]} listing the 2-5 most significant weak
areas the candidate should improve on."""


def get_company_style(company_name: str) -> str:
    key = (company_name or "").strip().lower()
    return COMPANY_INTERVIEW_STYLES.get(key, COMPANY_INTERVIEW_STYLES["default"])


def get_difficulty_config(difficulty_level: str | None) -> dict[str, str]:
    key = (difficulty_level or "fresher").strip().lower()
    return DIFFICULTY_CONFIG.get(key, DIFFICULTY_CONFIG["fresher"])


def _stage_for_index(mode: InterviewMode, order_index: int) -> QuestionType | None:
    if order_index < 0 or order_index >= MAX_INTERVIEW_QUESTIONS:
        return None
    if mode == InterviewMode.FULL:
        return FULL_STAGE_DISTRIBUTION[order_index]
    if mode == InterviewMode.RESUME:
        return RESUME_STAGE_DISTRIBUTION[order_index]
    return _MODE_TO_QUESTION_TYPE.get(mode)


async def _generate_question(
    company_name: str,
    stage: QuestionType,
    difficulty_level: str,
    n: int,
    total: int,
    previous_questions: list[str],
    skills: list[str] | None = None,
) -> dict:
    company_style = get_company_style(company_name)
    diff_cfg = get_difficulty_config(difficulty_level)
    previous_questions_json = json.dumps(previous_questions or [])

    system_prompt = _QUESTION_SYSTEM_PROMPT.format(
        company_name=company_name.title() if company_name else "Target Company",
        company_style=company_style,
        stage=stage.value,
        difficulty_label=diff_cfg["label"],
        difficulty_instruction=diff_cfg["generation_instruction"],
        n=n,
        total=total,
        previous_questions_json=previous_questions_json,
    )

    user_prompt = f'Generate the next interview question for stage "{stage.value}".'
    if skills:
        cleaned_skills = [
            s for s in skills if isinstance(s, str) and not s.startswith("RESUME_TEXT:") and not s.startswith("Resume content:")
        ]
        if cleaned_skills:
            user_prompt += f' Focus skills/stack: {", ".join(cleaned_skills)}.'

    return await groq_client.generate_json(system_prompt, user_prompt)


async def _generate_resume_question(
    full_resume_text: str,
    difficulty_level: str,
    n: int,
    total: int,
    previous_questions: list[str],
) -> dict:
    diff_cfg = get_difficulty_config(difficulty_level)
    previous_questions_json = json.dumps(previous_questions or [])
    # Truncate at 4000 characters if very long per spec
    truncated_resume = full_resume_text[:4000] if full_resume_text else ""

    system_prompt = _RESUME_QUESTION_SYSTEM_PROMPT.format(
        difficulty_label=diff_cfg["label"],
        difficulty_instruction=diff_cfg["generation_instruction"],
        n=n,
        total=total,
        previous_questions_json=previous_questions_json,
        full_resume_text=truncated_resume,
    )
    user_prompt = "Generate the next interview question based on the candidate's resume."
    return await groq_client.generate_json(system_prompt, user_prompt)


async def _evaluate_answer(
    question: Question,
    answer_text: str,
    session: InterviewSession,
) -> dict:
    diff_cfg = get_difficulty_config(session.difficulty_level)
    stage_val = question.q_type.value

    system_prompt = _ANSWER_EVAL_SYSTEM_PROMPT.format(
        q_type=stage_val,
        stage=stage_val,
        difficulty_label=diff_cfg["label"],
        question_text=question.question_text,
        answer_text=answer_text,
    )
    user_prompt = "Evaluate the candidate's answer."
    result = await groq_client.generate_json(system_prompt, user_prompt)

    raw_rating = (result.get("rating") or "").strip().lower()
    if raw_rating not in RATING_BANDS:
        raw_rating = "good"

    # Reveal the interviewer note
    interviewer_note_reveal = result.get("interviewer_note_reveal") or question.interviewer_note or ""

    return {
        "rating": raw_rating,
        "feedback": result.get("feedback", ""),
        "what_was_missing": result.get("what_was_missing") if raw_rating != "interview_ready" else None,
        "interviewer_note_reveal": interviewer_note_reveal,
        "score": RATING_NUMERIC_MAP.get(raw_rating, 72.0),
    }


async def _synthesize_weak_areas(db: Session, session: InterviewSession) -> list[str]:
    answers = db.scalars(
        select(Answer).join(Question, Answer.question_id == Question.id).where(Question.session_id == session.id)
    ).all()
    if not answers:
        return []

    transcript_lines = []
    for answer in answers:
        rating_label = RATING_BANDS.get(answer.rating, {}).get("label", str(answer.score or "N/A"))
        transcript_lines.append(
            f"Q ({answer.question.q_type.value}): {answer.question.question_text}\n"
            f"A: {answer.answer_text}\nFeedback: {answer.ai_feedback}\nRating: {rating_label}"
        )
    transcript = "\n\n".join(transcript_lines)

    result = await groq_client.generate_json(_WEAK_AREA_SYSTEM_PROMPT, transcript)
    return result.get("weak_areas", [])


async def _finalize_session(db: Session, session: InterviewSession) -> None:
    answers = db.scalars(
        select(Answer).join(Question, Answer.question_id == Question.id).where(Question.session_id == session.id)
    ).all()

    scores = []
    for a in answers:
        if a.rating and a.rating in RATING_NUMERIC_MAP:
            scores.append(RATING_NUMERIC_MAP[a.rating])
        elif a.score is not None:
            scores.append(a.score)

    session.overall_score = round(sum(scores) / len(scores), 2) if scores else None
    session.weak_areas = await _synthesize_weak_areas(db, session)
    session.status = InterviewSessionStatus.COMPLETED


async def start_session(
    db: Session,
    user_id: int,
    *,
    company_name: str,
    skills: list[str] | None,
    mode: InterviewMode,
    difficulty_level: str = "fresher",
    drive_id: int | None = None,
    resume_text: str | None = None,
) -> tuple[InterviewSession, Question]:
    normalized_difficulty = difficulty_level if difficulty_level in DIFFICULTY_CONFIG else "fresher"

    session_skills = skills or []
    if mode == InterviewMode.RESUME and resume_text:
        session_skills = [f"RESUME_TEXT:{resume_text}"]

    session = InterviewSession(
        user_id=user_id,
        drive_id=drive_id,
        company_name=company_name,
        skills=session_skills,
        mode=mode,
        difficulty_level=normalized_difficulty,
        status=InterviewSessionStatus.IN_PROGRESS,
    )
    db.add(session)
    db.flush()

    first_stage = _stage_for_index(mode, 0)
    if first_stage == QuestionType.RESUME:
        question_data = await _generate_resume_question(
            full_resume_text=resume_text or "",
            difficulty_level=normalized_difficulty,
            n=1,
            total=MAX_INTERVIEW_QUESTIONS,
            previous_questions=[],
        )
    else:
        question_data = await _generate_question(
            company_name=company_name,
            stage=first_stage,
            difficulty_level=normalized_difficulty,
            n=1,
            total=MAX_INTERVIEW_QUESTIONS,
            previous_questions=[],
            skills=skills or [],
        )

    diff_str = question_data.get("difficulty", "medium").lower()
    if diff_str not in ("easy", "medium", "hard"):
        diff_str = "medium"

    question = Question(
        session_id=session.id,
        question_text=question_data["question_text"],
        q_type=first_stage,
        difficulty=DifficultyLevel(diff_str),
        order_index=0,
        interviewer_note=question_data.get("interviewer_note"),
        resume_reference=question_data.get("resume_reference"),
    )
    db.add(question)

    db.commit()
    db.refresh(session)
    db.refresh(question)

    return session, question


async def submit_answer(
    db: Session, session: InterviewSession, question: Question, answer_text: str
) -> tuple[Answer, Question | None, str | None]:
    """Evaluates the answer, then either generates the next question or
    finalizes the session (computing overall_score + weak_areas) if this
    was the last question (limit: MAX_INTERVIEW_QUESTIONS = 10).
    """
    evaluation = await _evaluate_answer(question, answer_text, session)
    answer = Answer(
        question_id=question.id,
        answer_text=answer_text,
        ai_feedback=evaluation.get("feedback"),
        rating=evaluation.get("rating"),
        what_was_missing=evaluation.get("what_was_missing"),
        score=evaluation.get("score"),
    )
    db.add(answer)

    next_index = question.order_index + 1
    next_stage = _stage_for_index(session.mode, next_index)

    next_question: Question | None = None
    if next_index >= MAX_INTERVIEW_QUESTIONS or next_stage is None:
        db.flush()
        await _finalize_session(db, session)
    else:
        # Collect previously asked questions for deduplication
        existing_questions = db.scalars(
            select(Question).where(Question.session_id == session.id).order_by(Question.order_index)
        ).all()
        previous_questions = [q.question_text for q in existing_questions]

        if next_stage == QuestionType.RESUME:
            resume_content = ""
            if session.skills:
                for s in session.skills:
                    if isinstance(s, str) and s.startswith("RESUME_TEXT:"):
                        resume_content = s.replace("RESUME_TEXT:", "", 1)
                        break
            question_data = await _generate_resume_question(
                full_resume_text=resume_content,
                difficulty_level=session.difficulty_level,
                n=next_index + 1,
                total=MAX_INTERVIEW_QUESTIONS,
                previous_questions=previous_questions,
            )
        else:
            question_data = await _generate_question(
                company_name=session.company_name,
                stage=next_stage,
                difficulty_level=session.difficulty_level,
                n=next_index + 1,
                total=MAX_INTERVIEW_QUESTIONS,
                previous_questions=previous_questions,
                skills=session.skills or [],
            )

        diff_str = question_data.get("difficulty", "medium").lower()
        if diff_str not in ("easy", "medium", "hard"):
            diff_str = "medium"

        next_question = Question(
            session_id=session.id,
            question_text=question_data["question_text"],
            q_type=next_stage,
            difficulty=DifficultyLevel(diff_str),
            order_index=next_index,
            interviewer_note=question_data.get("interviewer_note"),
            resume_reference=question_data.get("resume_reference"),
        )
        db.add(next_question)

    db.commit()
    db.refresh(answer)
    if next_question:
        db.refresh(next_question)

    return answer, next_question, evaluation.get("interviewer_note_reveal")
