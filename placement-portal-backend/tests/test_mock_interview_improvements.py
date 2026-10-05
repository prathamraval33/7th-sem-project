"""Test suite for mock interview improvements per mockinterview_improvement.md spec."""
import pytest
from unittest.mock import AsyncMock, patch

from app.models.interview_session import InterviewMode, InterviewSession, InterviewSessionStatus
from app.models.question import DifficultyLevel, Question, QuestionType
from app.models.answer import Answer
from app.services import interview_engine, scoring


def test_company_interview_styles_lookup():
    # Exact and normalized match
    google_style = interview_engine.get_company_style("Google")
    assert "problem-solving approach" in google_style
    assert "system design thinking" in google_style

    tcs_style = interview_engine.get_company_style("  tcs  ")
    assert "basic CS fundamentals" in tcs_style

    amazon_style = interview_engine.get_company_style("Amazon")
    assert "leadership-principle-heavy" in amazon_style
    assert "STAR format" in amazon_style

    # Graceful default fallback for unknown company
    unknown_style = interview_engine.get_company_style("NonExistentCompany Inc")
    assert unknown_style == interview_engine.COMPANY_INTERVIEW_STYLES["default"]


def test_difficulty_config():
    fresher = interview_engine.get_difficulty_config("fresher")
    assert fresher["label"] == "Fresher"
    assert "undergraduate student" in fresher["generation_instruction"]

    mid = interview_engine.get_difficulty_config("mid_level")
    assert mid["label"] == "Mid-Level"
    assert "1-2 years of experience" in mid["generation_instruction"]

    senior = interview_engine.get_difficulty_config("senior")
    assert senior["label"] == "Senior"
    assert "top product companies" in senior["generation_instruction"]

    # Default fallback
    fallback = interview_engine.get_difficulty_config("invalid_level")
    assert fallback["label"] == "Fresher"


def test_stage_distribution():
    # FULL mode: 2 Aptitude, 3 Technical, 3 Coding, 2 HR
    full_stages = [interview_engine._stage_for_index(InterviewMode.FULL, i) for i in range(10)]
    assert full_stages == [
        QuestionType.APTITUDE,
        QuestionType.APTITUDE,
        QuestionType.TECHNICAL,
        QuestionType.TECHNICAL,
        QuestionType.TECHNICAL,
        QuestionType.CODING,
        QuestionType.CODING,
        QuestionType.CODING,
        QuestionType.HR,
        QuestionType.HR,
    ]
    assert interview_engine._stage_for_index(InterviewMode.FULL, 10) is None

    # RESUME mode: 3 Resume, 3 Technical, 2 Coding, 2 HR
    resume_stages = [interview_engine._stage_for_index(InterviewMode.RESUME, i) for i in range(10)]
    assert resume_stages == [
        QuestionType.RESUME,
        QuestionType.RESUME,
        QuestionType.RESUME,
        QuestionType.TECHNICAL,
        QuestionType.TECHNICAL,
        QuestionType.TECHNICAL,
        QuestionType.CODING,
        QuestionType.CODING,
        QuestionType.HR,
        QuestionType.HR,
    ]


def test_rating_bands_and_scoring_numeric_map():
    assert "interview_ready" in interview_engine.RATING_BANDS
    assert "good" in interview_engine.RATING_BANDS
    assert "somewhat_closer" in interview_engine.RATING_BANDS
    assert "not_relevant" in interview_engine.RATING_BANDS

    assert scoring.RATING_NUMERIC_MAP["interview_ready"] == 95.0
    assert scoring.RATING_NUMERIC_MAP["good"] == 72.0
    assert scoring.RATING_NUMERIC_MAP["somewhat_closer"] == 45.0
    assert scoring.RATING_NUMERIC_MAP["not_relevant"] == 15.0


@pytest.mark.anyio
async def test_evaluate_answer_normalization():
    mock_session = InterviewSession(
        id=1,
        user_id=1,
        company_name="Google",
        mode=InterviewMode.FULL,
        difficulty_level="fresher",
    )
    mock_question = Question(
        id=10,
        session_id=1,
        question_text="How would you design a rate limiter?",
        q_type=QuestionType.TECHNICAL,
        difficulty=DifficultyLevel.MEDIUM,
        order_index=2,
        interviewer_note="Should discuss token bucket or leaky bucket and distributed store.",
    )

    with patch(
        "app.services.groq_client.generate_json",
        new=AsyncMock(return_value={
            "rating": "interview_ready",
            "feedback": "You explained the token bucket algorithm clearly with Redis.",
            "what_was_missing": None,
            "interviewer_note_reveal": "Strong answer discusses token bucket and distributed locks.",
        }),
    ):
        result = await interview_engine._evaluate_answer(
            mock_question,
            "I would use a token bucket algorithm stored in Redis with atomic increments.",
            mock_session,
        )

        assert result["rating"] == "interview_ready"
        assert result["score"] == 95.0
        assert result["what_was_missing"] is None
        assert "token bucket" in result["interviewer_note_reveal"]


@pytest.mark.anyio
async def test_generate_question_deduplication_prompt():
    captured_system_prompt = []

    async def fake_generate_json(system_prompt, user_prompt):
        captured_system_prompt.append(system_prompt)
        return {
            "question_text": "Walk me through how you estimate the number of elevators in a skyscraper.",
            "difficulty": "medium",
            "interviewer_note": "Look for estimation framework and reasonable assumptions.",
        }

    with patch("app.services.groq_client.generate_json", new=fake_generate_json):
        res = await interview_engine._generate_question(
            company_name="Google",
            stage=QuestionType.APTITUDE,
            difficulty_level="fresher",
            n=2,
            total=10,
            previous_questions=["What is your approach to handling incomplete data?"],
        )

        assert "What is your approach to handling incomplete data?" in captured_system_prompt[0]
        assert "Google" in captured_system_prompt[0]
        assert res["question_text"].startswith("Walk me through")


@pytest.mark.anyio
async def test_generate_resume_question_prompt():
    captured_system_prompt = []

    async def fake_generate_json(system_prompt, user_prompt):
        captured_system_prompt.append(system_prompt)
        return {
            "question_text": "I see you built a pharmacy management system in React. How did you manage cart state across page reloads?",
            "q_type": "resume",
            "difficulty": "medium",
            "resume_reference": "Pharmacy management system project",
            "interviewer_note": "Should explain localStorage or IndexedDB persistence with state synchronization.",
        }

    with patch("app.services.groq_client.generate_json", new=fake_generate_json):
        res = await interview_engine._generate_resume_question(
            full_resume_text="Projects: Pharmacy management system built with React, Redux, PostgreSQL.",
            difficulty_level="fresher",
            n=1,
            total=10,
            previous_questions=[],
        )

        assert "Pharmacy management system" in captured_system_prompt[0]
        assert "face-to-face interview" in captured_system_prompt[0]
        assert res["resume_reference"] == "Pharmacy management system project"
