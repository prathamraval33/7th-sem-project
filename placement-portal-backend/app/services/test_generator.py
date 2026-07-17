"""TPO instant-test question generation via Groq, based on the TPO's free-
text prompt describing topics/difficulty/company need.
"""
from app.services import groq_client
from app.utils.exceptions import InstantTestConfigError

_TEST_GENERATION_SYSTEM_PROMPT = """You are creating a placement-readiness test for college students,
based on a TPO's topic/difficulty brief. Respond ONLY with a JSON object of the exact shape:
{"questions": [{"question_text": string, "q_type": one of "aptitude"|"technical"|"coding"|"hr",
"difficulty": one of "easy"|"medium"|"hard", "marks": integer > 0}]}.
Generate a well-rounded set of 8-15 questions matching the brief."""


async def generate_questions(prompt_config: dict) -> list[dict]:
    """`prompt_config` holds whatever the TPO described (topics, difficulty,
    company need — free-form, validated only as a JSON object at the schema
    layer). Returns the list of question dicts to store in
    `instant_tests.questions`.
    """
    user_prompt = f"Brief: {prompt_config}"
    result = await groq_client.generate_json(_TEST_GENERATION_SYSTEM_PROMPT, user_prompt)

    questions = result.get("questions")
    if not isinstance(questions, list) or not questions:
        raise InstantTestConfigError("The AI did not return a usable question set")

    return questions


def total_possible_marks(questions: list[dict]) -> int:
    return sum(int(question.get("marks", 0)) for question in questions)


def validate_min_passing_marks(questions: list[dict], min_passing_marks: int) -> None:
    """The Phase 2 schema can only check `min_passing_marks >= 0` at request
    time (the question set doesn't exist yet then). Once questions are
    generated, this enforces the master prompt's real rule: passing marks
    must be within the test's actual max possible score.
    """
    max_marks = total_possible_marks(questions)
    if min_passing_marks > max_marks:
        raise InstantTestConfigError(
            f"min_passing_marks ({min_passing_marks}) exceeds the test's maximum possible score ({max_marks})"
        )
