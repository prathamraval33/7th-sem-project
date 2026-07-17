"""Live Career Insights pipeline: internal matched drives (plain DB query,
no AI) merged at request time with a cached external+Groq section
(search API -> Groq summarization), auto-refreshed once/day plus a
rate-limited manual refresh.

ASSUMPTION: `dashboard_insights` (fixed in Phase 1) stores a single
`last_manual_refresh_at` timestamp rather than a per-day counter, so the
master prompt's "~2 manual refreshes per day" is approximated here as a
minimum cooldown between manual refreshes rather than a literal daily
counter — a true counter would need a schema change, out of scope now.
"""
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.dashboard_insight import DashboardInsight
from app.models.drive import Drive
from app.models.profile import Profile
from app.models.user import User
from app.services import groq_client
from app.services.eligibility_engine import get_matched_drives
from app.utils.exceptions import RateLimitError, SearchProviderError

MANUAL_REFRESH_COOLDOWN_HOURS = 12
INTERNAL_DRIVES_LIMIT = 4

_INSIGHTS_SYSTEM_PROMPT = """You are curating a "Live Career Insights" panel for a college student.
You will be given raw web-search snippets for (a) job/internship openings and (b) resume/industry
trend content. Filter to genuinely relevant, recent items, then respond ONLY with a JSON object of
the exact shape: {"external_opportunities": [{"title": string, "company": string, "source_url": string,
"snippet": string}], "resume_suggestions": [{"tip": string, "based_on_trend": string}],
"trending_skills": [string, ...]}. Always keep the original source_url so the student can verify it."""


async def _search_tavily(client: httpx.AsyncClient, query: str) -> list[dict]:
    response = await client.post(
        "https://api.tavily.com/search",
        json={"api_key": settings.SEARCH_API_KEY, "query": query, "max_results": 5},
    )
    response.raise_for_status()
    results = response.json().get("results", [])
    return [{"title": r.get("title"), "url": r.get("url"), "snippet": r.get("content")} for r in results]


async def _search_serper(client: httpx.AsyncClient, query: str) -> list[dict]:
    response = await client.post(
        "https://google.serper.dev/search",
        headers={"X-API-KEY": settings.SEARCH_API_KEY, "Content-Type": "application/json"},
        json={"q": query},
    )
    response.raise_for_status()
    results = response.json().get("organic", [])[:5]
    return [{"title": r.get("title"), "url": r.get("link"), "snippet": r.get("snippet")} for r in results]


async def search_web(query: str) -> list[dict]:
    provider = settings.SEARCH_PROVIDER.lower()
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            if provider == "tavily":
                return await _search_tavily(client, query)
            if provider == "serper":
                return await _search_serper(client, query)
            raise SearchProviderError(f"Unsupported SEARCH_PROVIDER '{settings.SEARCH_PROVIDER}'")
    except httpx.HTTPError as error:
        raise SearchProviderError() from error


def get_internal_matched_drives(db: Session, profile: Profile) -> list[Drive]:
    """No AI involved — a direct, cheap DB query, fetched fresh every time."""
    return get_matched_drives(db, profile)[:INTERNAL_DRIVES_LIMIT]


async def generate_external_insights(profile: Profile) -> dict:
    skills = profile.skills or []
    top_skills = " ".join(skills[:3])

    jobs_query = f"{profile.branch} fresher jobs internship openings {top_skills}".strip()
    trend_query = f"{profile.branch} resume tips industry trends {top_skills}".strip()

    job_results = await search_web(jobs_query)
    trend_results = await search_web(trend_query)

    user_prompt = f"Job/internship search results: {job_results}\n\nResume/trend search results: {trend_results}"
    result = await groq_client.generate_json(_INSIGHTS_SYSTEM_PROMPT, user_prompt)

    return {
        "external_opportunities": result.get("external_opportunities", []),
        "resume_suggestions": result.get("resume_suggestions", []),
        "trending_skills": result.get("trending_skills", []),
    }


def _can_manual_refresh(insight: DashboardInsight | None) -> bool:
    if insight is None or insight.last_manual_refresh_at is None:
        return True

    last_refresh = insight.last_manual_refresh_at
    if last_refresh.tzinfo is None:
        last_refresh = last_refresh.replace(tzinfo=timezone.utc)

    return datetime.now(timezone.utc) - last_refresh >= timedelta(hours=MANUAL_REFRESH_COOLDOWN_HOURS)


def _upsert_insight(db: Session, user: User, external_data: dict, *, is_manual_refresh: bool) -> DashboardInsight:
    now = datetime.now(timezone.utc)
    insight = db.scalar(select(DashboardInsight).where(DashboardInsight.user_id == user.id))

    if insight is None:
        insight = DashboardInsight(user_id=user.id)
        db.add(insight)

    insight.external_opportunities = external_data["external_opportunities"]
    insight.resume_suggestions = external_data["resume_suggestions"]
    insight.trending_skills = external_data["trending_skills"]
    insight.generated_at = now
    if is_manual_refresh:
        insight.last_manual_refresh_at = now

    db.commit()
    db.refresh(insight)
    return insight


async def refresh_insights(db: Session, user: User, profile: Profile) -> DashboardInsight:
    """POST /insights/refresh — forces a fresh pipeline run, rate-limited."""
    existing = db.scalar(select(DashboardInsight).where(DashboardInsight.user_id == user.id))
    if not _can_manual_refresh(existing):
        raise RateLimitError("Manual insights refresh is limited — please try again later")

    external_data = await generate_external_insights(profile)
    return _upsert_insight(db, user, external_data, is_manual_refresh=True)


async def get_or_generate_daily_insights(db: Session, user: User, profile: Profile) -> DashboardInsight:
    """Auto-generates once per calendar day; otherwise returns the cache."""
    insight = db.scalar(select(DashboardInsight).where(DashboardInsight.user_id == user.id))
    now = datetime.now(timezone.utc)

    is_stale = insight is None or insight.generated_at.date() != now.date()
    if not is_stale:
        return insight

    external_data = await generate_external_insights(profile)
    return _upsert_insight(db, user, external_data, is_manual_refresh=False)


async def get_dashboard_insights(db: Session, user: User, profile: Profile) -> dict:
    """GET /insights/dashboard — internal drives fetched fresh, external/AI
    section from the (possibly just-refreshed) cache, kept as two clearly
    separate sections in the response.
    """
    internal_drives = get_internal_matched_drives(db, profile)
    insight = await get_or_generate_daily_insights(db, user, profile)

    return {
        "internal_drives": internal_drives,
        "external_opportunities": insight.external_opportunities or [],
        "resume_suggestions": insight.resume_suggestions or [],
        "trending_skills": insight.trending_skills or [],
    }
