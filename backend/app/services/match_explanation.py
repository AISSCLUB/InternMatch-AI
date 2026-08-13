"""
Grounded Match Explanation Service
Generates grounded LLM explanations ('Why You Match') and skill gap
recommendations using OpenAI Structured Outputs based strictly on persisted
candidate and internship data.
"""

from typing import List, Optional
from uuid import UUID

from openai import OpenAI
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import InternshipListing, StudentProfile
from app.repositories.match import MatchRepository
from app.repositories.matching_data import MatchingDataRepository
from app.schemas.match import (
    MatchExplanationResponse,
    SkillGapAnalysisResponse,
)


class LLMMatchExplanation(BaseModel):
    """Structured LLM response for grounded match explanation."""

    model_config = ConfigDict(extra="forbid")

    why_you_match: str = Field(
        ...,
        min_length=1,
        description=(
            "2-3 sentence grounded narrative explaining why the candidate "
            "matches this internship."
        ),
    )
    skill_gap_summary: str = Field(
        ...,
        description=(
            "1-2 sentence summary explaining any missing required or "
            "preferred skills."
        ),
    )
    recommendations: List[str] = Field(
        default_factory=list,
        description=(
            "List of 1-3 actionable learning recommendations to address "
            "missing skills."
        ),
    )


def _build_system_prompt(content_locale: str = "en") -> str:
    """Build grounded system explanation instructions."""
    return f"""You are a precise, grounded career match explanation assistant for InternMatch AI.
Your role is to explain why a student candidate matches an internship listing
and provide actionable skill gap recommendations.

Target content locale: {content_locale}

STRICT GROUNDING RULES:
1. Ground your explanation ONLY in the factual candidate profile and
   internship listing data provided.
2. NEVER invent experiences, skills, projects, degrees, company details, or
   qualifications not provided in the input.
3. NEVER alter or contradict the matching_skills or missing_skills arrays.
   The matching skills and missing skills lists are authoritative and pre-calculated.
4. Do NOT claim the candidate possesses a skill unless it is explicitly in
   their candidate skills or matching skills.
5. In 'why_you_match', write a concise, professional 2-3 sentence explanation
   connecting the candidate's actual background/skills to the internship's
   responsibilities and requirements.
6. In 'skill_gap_summary', summarize the missing skills clearly. If there are
   no missing skills, state that the candidate meets all stated skill requirements.
7. In 'recommendations', provide 1-3 practical, concrete learning recommendations
   to help the candidate learn the missing skills. If there are no missing skills,
   provide recommendations for excelling in the role or advanced relevant topics.
"""


def generate_grounded_match_explanation(
    profile: StudentProfile,
    internship: InternshipListing,
    overall_score: int,
    matching_skills: List[str],
    missing_skills: List[str],
    candidate_skills: Optional[List[str]] = None,
    education_entries: Optional[List[str]] = None,
    experience_entries: Optional[List[str]] = None,
    project_entries: Optional[List[str]] = None,
    content_locale: str = "en",
) -> LLMMatchExplanation:
    """
    Generate grounded match explanation using OpenAI Structured Outputs.
    Constructs OpenAI client at call-time from settings.
    Enforces strict grounding and Pydantic validation.
    """
    api_key = settings.OPENAI_API_KEY.strip() if settings.OPENAI_API_KEY else ""
    if not api_key or "placeholder" in api_key.lower():
        raise ValueError(
            "OPENAI_API_KEY configuration is missing or placeholder value"
        )

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    system_prompt = _build_system_prompt(content_locale=content_locale or "en")

    cand_skills_str = (
        ", ".join(candidate_skills) if candidate_skills else "None listed"
    )
    req_skills_str = (
        ", ".join(internship.required_skills)
        if internship.required_skills
        else "None"
    )
    pref_skills_str = (
        ", ".join(internship.preferred_skills)
        if internship.preferred_skills
        else "None"
    )
    match_skills_str = (
        ", ".join(matching_skills) if matching_skills else "None"
    )
    miss_skills_str = (
        ", ".join(missing_skills) if missing_skills else "None"
    )

    user_lines = [
        "--- CANDIDATE DATA ---",
        f"Name: {profile.full_name}",
        f"Headline: {profile.headline or 'N/A'}",
        f"Candidate Skills: {cand_skills_str}",
    ]
    if education_entries:
        user_lines.append(f"Education: {'; '.join(education_entries)}")
    if experience_entries:
        user_lines.append(f"Experience: {'; '.join(experience_entries)}")
    if project_entries:
        user_lines.append(f"Projects: {'; '.join(project_entries)}")

    user_lines.extend([
        "",
        "--- INTERNSHIP LISTING ---",
        f"Title: {internship.title}",
        f"Company: {internship.company}",
        f"Location: {internship.location} ({internship.work_type})",
        f"Description: {internship.description}",
        f"Required Skills: {req_skills_str}",
        f"Preferred Skills: {pref_skills_str}",
        "",
        "--- DETERMINISTIC MATCH METRICS ---",
        f"Overall Match Score: {overall_score}/100",
        f"Canonical Matching Skills: {match_skills_str}",
        f"Canonical Missing Skills: {miss_skills_str}",
    ])

    user_content = "\n".join(user_lines)

    chat = getattr(client, "chat", None)
    chat_completions = (
        getattr(chat, "completions", None) if chat is not None else None
    )
    parse_fn = getattr(chat_completions, "parse", None)

    if parse_fn is None:
        beta = getattr(client, "beta", None)
        beta_chat = getattr(beta, "chat", None) if beta is not None else None
        beta_completions = (
            getattr(beta_chat, "completions", None)
            if beta_chat is not None
            else None
        )
        parse_fn = getattr(beta_completions, "parse", None)

    if parse_fn is None:
        raise RuntimeError("OpenAI SDK structured parse method is unavailable")

    response = parse_fn(
        model=settings.LLM_MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        response_format=LLMMatchExplanation,
    )

    if not hasattr(response, "choices") or not response.choices:
        raise ValueError(
            "OpenAI structured output response returned no choices"
        )

    choice = response.choices[0]
    message = getattr(choice, "message", None)
    if not message:
        raise ValueError("OpenAI response choice contains no message")

    refusal = getattr(message, "refusal", None)
    if refusal:
        raise ValueError(f"Model refused match explanation: {refusal}")

    parsed = getattr(message, "parsed", None)
    if parsed is None or not isinstance(parsed, LLMMatchExplanation):
        raise ValueError(
            "Model returned unparseable or empty structured output"
        )

    return parsed


def get_or_create_match_explanation(
    db: Session,
    match_id: UUID,
    user_id: UUID,
    content_locale: str = "en",
) -> Optional[MatchExplanationResponse]:
    """
    Fetch an existing grounded match explanation or generate and persist one.
    Enforces tenant isolation: returns None if match is not found or not owned.
    Derives matching_skills and missing_skills strictly from canonical data.
    """
    record = MatchRepository.get_match_with_details_for_user(
        db=db, match_id=match_id, user_id=user_id
    )
    if not record:
        return None

    match, profile, internship = record

    raw_gap = (
        match.skill_gap_analysis
        if isinstance(match.skill_gap_analysis, dict)
        else {}
    )
    matching_skills = raw_gap.get("matching_skills", [])
    if not isinstance(matching_skills, list):
        matching_skills = []
    missing_skills = raw_gap.get("missing_skills", [])
    if not isinstance(missing_skills, list):
        missing_skills = []

    # Check if explanation is already cached on the Match record
    cached_why = match.why_you_match
    cached_summary = raw_gap.get("summary")
    cached_recs = raw_gap.get("recommendations")

    if (
        isinstance(cached_why, str)
        and cached_why.strip()
        and isinstance(cached_summary, str)
        and cached_summary.strip()
    ):
        recs_list = cached_recs if isinstance(cached_recs, list) else []
        return MatchExplanationResponse(
            match_id=match.id,
            overall_score=match.overall_score,
            why_you_match=cached_why,
            matching_skills=matching_skills,
            missing_skills=missing_skills,
            skill_gap_analysis=SkillGapAnalysisResponse(
                summary=cached_summary,
                recommendations=recs_list,
            ),
        )

    # Gather grounded context for the LLM
    candidate_skills = MatchingDataRepository.get_skill_names_for_student(
        db, profile.id
    )
    edu_list = [
        f"{e.degree} at {e.institution} ({e.start_year or ''}-{e.end_year or ''})"
        for e in MatchingDataRepository.get_education_for_student(
            db, profile.id
        )
    ]
    exp_list = [
        f"{e.role} at {e.company}: {e.description or ''}"
        for e in MatchingDataRepository.get_experience_for_student(
            db, profile.id
        )
    ]
    proj_list = [
        f"{p.title} ({', '.join(p.tech_stack or [])}): {p.description or ''}"
        for p in MatchingDataRepository.get_projects_for_student(
            db, profile.id
        )
    ]

    explanation = generate_grounded_match_explanation(
        profile=profile,
        internship=internship,
        overall_score=match.overall_score,
        matching_skills=matching_skills,
        missing_skills=missing_skills,
        candidate_skills=candidate_skills,
        education_entries=edu_list,
        experience_entries=exp_list,
        project_entries=proj_list,
        content_locale=content_locale,
    )

    # Persist generated narrative fields while preserving scores & skills
    match.why_you_match = explanation.why_you_match

    updated_gap = dict(raw_gap)
    updated_gap["matching_skills"] = matching_skills  # PRESERVED
    updated_gap["missing_skills"] = missing_skills    # PRESERVED
    updated_gap["summary"] = explanation.skill_gap_summary
    updated_gap["recommendations"] = explanation.recommendations
    match.skill_gap_analysis = updated_gap

    db.commit()
    db.refresh(match)

    return MatchExplanationResponse(
        match_id=match.id,
        overall_score=match.overall_score,
        why_you_match=explanation.why_you_match,
        matching_skills=matching_skills,
        missing_skills=missing_skills,
        skill_gap_analysis=SkillGapAnalysisResponse(
            summary=explanation.skill_gap_summary,
            recommendations=explanation.recommendations,
        ),
    )
