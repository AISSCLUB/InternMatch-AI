"""
MVP Hybrid Scoring Policy & Pure Scoring Core Service
Provides pure deterministic calculations for skill, vector, attribute, and hybrid match scores.
"""

import math
from dataclasses import dataclass
from typing import List, Optional, Sequence

from app.services.skill_matching import SkillMatchResult

# Authoritative MVP v1 Component Weights
FINAL_SKILL_WEIGHT = 0.50
FINAL_VECTOR_WEIGHT = 0.30
FINAL_ATTRIBUTE_WEIGHT = 0.20

# Authoritative MVP v1 Skill Sub-Weights
REQUIRED_SKILL_WEIGHT = 0.70
PREFERRED_SKILL_WEIGHT = 0.30


@dataclass(frozen=True)
class HybridScore:
    """Internal score representation holding float component and overall scores."""

    skill_score: float
    vector_score: float
    attribute_score: float
    overall_score: float


def calculate_skill_score(skill_match_result: SkillMatchResult) -> float:
    """
    Calculate float skill_score [0.0, 100.0] from SkillMatchResult counts.
    Applies 70/30 sub-weighting when both required and preferred skill categories exist.
    """
    total_required = len(skill_match_result.matched_required_skills) + len(
        skill_match_result.missing_required_skills
    )
    total_preferred = len(skill_match_result.matched_preferred_skills) + len(
        skill_match_result.missing_preferred_skills
    )

    has_required = total_required > 0
    has_preferred = total_preferred > 0

    if not has_required and not has_preferred:
        return 100.0

    req_comp = (
        (len(skill_match_result.matched_required_skills) / total_required * 100.0)
        if has_required
        else 0.0
    )
    pref_comp = (
        (len(skill_match_result.matched_preferred_skills) / total_preferred * 100.0)
        if has_preferred
        else 0.0
    )

    if has_required and has_preferred:
        return (REQUIRED_SKILL_WEIGHT * req_comp) + (PREFERRED_SKILL_WEIGHT * pref_comp)
    elif has_required:
        return req_comp
    else:
        return pref_comp


def calculate_vector_score(cosine_distance: float) -> float:
    """
    Calculate float vector_score [0.0, 100.0] from raw PostgreSQL pgvector cosine_distance.
    Similarity = clamp(1.0 - cosine_distance, 0.0, 1.0) * 100.0.
    Raises ValueError for NaN or infinity.
    """
    if math.isnan(cosine_distance) or math.isinf(cosine_distance):
        raise ValueError(f"Invalid non-finite cosine_distance: {cosine_distance}")

    similarity = 1.0 - cosine_distance
    clamped_similarity = max(0.0, min(similarity, 1.0))
    return clamped_similarity * 100.0


def _normalize_text(text: str) -> str:
    """Normalize text for exact case-insensitive attribute matching."""
    if not text:
        return ""
    words = text.strip().split()
    if not words:
        return ""
    return " ".join(words).casefold()


def calculate_attribute_score(
    work_types: Optional[Sequence[str]],
    desired_locations: Optional[Sequence[str]],
    internship_work_type: Optional[str],
    internship_location: Optional[str],
) -> float:
    """
    Calculate float attribute_score [0.0, 100.0] from candidate work_types/locations.
    Returns 100.0 if no active preferences exist.
    Averages active criteria (work_type match and/or location match).
    """
    clean_work_types = [
        _normalize_text(wt) for wt in (work_types or []) if _normalize_text(wt)
    ]
    clean_locations = [
        _normalize_text(loc) for loc in (desired_locations or []) if _normalize_text(loc)
    ]

    has_wt_pref = len(clean_work_types) > 0
    has_loc_pref = len(clean_locations) > 0

    if not has_wt_pref and not has_loc_pref:
        return 100.0

    active_scores: List[float] = []

    if has_wt_pref:
        norm_int_wt = _normalize_text(internship_work_type or "")
        wt_match = 100.0 if norm_int_wt and norm_int_wt in clean_work_types else 0.0
        active_scores.append(wt_match)

    if has_loc_pref:
        norm_int_loc = _normalize_text(internship_location or "")
        loc_match = 100.0 if norm_int_loc and norm_int_loc in clean_locations else 0.0
        active_scores.append(loc_match)

    return sum(active_scores) / len(active_scores)


def calculate_hybrid_score(
    skill_match_result: SkillMatchResult,
    cosine_distance: float,
    work_types: Optional[Sequence[str]],
    desired_locations: Optional[Sequence[str]],
    internship_work_type: Optional[str],
    internship_location: Optional[str],
) -> HybridScore:
    """
    Calculate pure float HybridScore combining skill, vector, and attribute scores.
    Formula: overall_score = 0.50 * skill + 0.30 * vector + 0.20 * attribute.
    """
    s_score = calculate_skill_score(skill_match_result)
    v_score = calculate_vector_score(cosine_distance)
    a_score = calculate_attribute_score(
        work_types=work_types,
        desired_locations=desired_locations,
        internship_work_type=internship_work_type,
        internship_location=internship_location,
    )

    o_score = (
        (FINAL_SKILL_WEIGHT * s_score)
        + (FINAL_VECTOR_WEIGHT * v_score)
        + (FINAL_ATTRIBUTE_WEIGHT * a_score)
    )

    return HybridScore(
        skill_score=s_score,
        vector_score=v_score,
        attribute_score=a_score,
        overall_score=o_score,
    )
