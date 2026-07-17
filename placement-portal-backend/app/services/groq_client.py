"""Single wrapper around the Groq API — every other service that needs AI
must go through this module (never call the Groq SDK directly, and never
from a router or the frontend). Model name comes from `GROQ_MODEL` so it can
be swapped without touching code.
"""
import json
import logging

from groq import AsyncGroq, GroqError

from app.core.config import settings
from app.utils.exceptions import GroqServiceError

logger = logging.getLogger(__name__)

MAX_RETRIES = 2

_client = AsyncGroq(api_key=settings.GROQ_API_KEY)


async def generate_json(system_prompt: str, user_prompt: str, *, temperature: float = 0.4) -> dict:
    """Sends a chat completion request asking for structured JSON output,
    parses it, and returns a plain dict. Retries up to `MAX_RETRIES` times on
    transient failures or malformed JSON; on final failure raises
    `GroqServiceError` — callers must never let a raw Groq/network exception
    reach the client as an unhandled 500.
    """
    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES + 1):
        try:
            response = await _client.chat.completions.create(
                model=settings.GROQ_MODEL,
                temperature=temperature,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            content = response.choices[0].message.content
            return json.loads(content)

        except (GroqError, json.JSONDecodeError, IndexError, AttributeError) as error:
            last_error = error
            logger.warning("Groq call failed (attempt %s/%s): %s", attempt + 1, MAX_RETRIES + 1, error)

    logger.error("Groq call exhausted all retries: %s", last_error)
    raise GroqServiceError() from last_error
