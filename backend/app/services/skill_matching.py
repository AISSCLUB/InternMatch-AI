"""
Structured Skill Match Classification Core
Provides pure deterministic exact and fuzzy skill classification against internship criteria.
"""

from dataclasses import dataclass
from typing import List, Sequence

from rapidfuzz import fuzz

from app.core.config import settings


@dataclass(frozen=True)
class SkillMatchResult:
    """
    Deterministic classification result for candidate skill matching against target skills.
    Exposes categorized lists of matched and missing required/preferred skills.
    """

    matched_required_skills: List[str]
    missing_required_skills: List[str]
    matched_preferred_skills: List[str]
    missing_preferred_skills: List[str]


def normalize_skill(skill: str) -> str:
    """
    Normalize skill string for deterministic comparison.
    1. Strip leading/trailing whitespace.
    2. Collapse repeated internal whitespace to a single space.
    3. Convert to casefold for case-insensitive comparison.
    Returns empty string if skill is empty or whitespace-only.
    """
    if not skill:
        return ""
    words = skill.strip().split()
    if not words:
        return ""
    return " ".join(words).casefold()


def _deduplicate_targets(skills: Sequence[str]) -> List[str]:
    """
    Remove duplicate target skills based on normalized value.
    Preserves the FIRST original non-empty skill spelling and deterministic order.
    """
    seen_normalized = set()
    deduped = []
    for skill in skills:
        norm = normalize_skill(skill)
        if not norm:
            continue
        if norm not in seen_normalized:
            seen_normalized.add(norm)
            deduped.append(skill.strip())
    return deduped


def _process_candidate_skills(candidate_skills: Sequence[str]) -> List[str]:
    """
    Extract clean normalized candidate skills, discarding duplicates and empty values.
    """
    seen_normalized = set()
    norm_candidates = []
    for skill in candidate_skills:
        norm = normalize_skill(skill)
        if norm and norm not in seen_normalized:
            seen_normalized.add(norm)
            norm_candidates.append(norm)
    return norm_candidates


def _classify_category(
    targets: List[str],
    candidate_norms: List[str],
    candidate_norms_set: set,
    threshold: int,
) -> tuple[List[str], List[str]]:
    """
    Classify target skills into matched and missing lists for a single category.
    Performs exact match first, falling back to fuzz.ratio fuzzy matching.
    """
    matched = []
    missing = []

    for target_spelling in targets:
        target_norm = normalize_skill(target_spelling)
        if not target_norm:
            continue

        # 1. Exact match check
        if target_norm in candidate_norms_set:
            matched.append(target_spelling)
            continue

        # 2. Fuzzy match fallback
        if not candidate_norms:
            missing.append(target_spelling)
            continue

        best_score = max(fuzz.ratio(target_norm, cand_norm) for cand_norm in candidate_norms)
        if best_score >= threshold:
            matched.append(target_spelling)
        else:
            missing.append(target_spelling)

    return matched, missing


def classify_skill_matches(
    candidate_skills: Sequence[str],
    required_skills: Sequence[str],
    preferred_skills: Sequence[str],
) -> SkillMatchResult:
    """
    Classify required and preferred skills as matched or missing based on candidate skills.
    Applies exact normalized matching first, followed by RapidFuzz ratio fuzzy matching
    using configured settings.SKILL_FUZZY_THRESHOLD.
    Pure service function performing no database or network operations.
    """
    threshold = settings.SKILL_FUZZY_THRESHOLD
    candidate_norms = _process_candidate_skills(candidate_skills)
    candidate_norms_set = set(candidate_norms)

    deduped_required = _deduplicate_targets(required_skills)
    deduped_preferred = _deduplicate_targets(preferred_skills)

    matched_req, missing_req = _classify_category(
        deduped_required, candidate_norms, candidate_norms_set, threshold
    )
    matched_pref, missing_pref = _classify_category(
        deduped_preferred, candidate_norms, candidate_norms_set, threshold
    )

    return SkillMatchResult(
        matched_required_skills=matched_req,
        missing_required_skills=missing_req,
        matched_preferred_skills=matched_pref,
        missing_preferred_skills=missing_pref,
    )
