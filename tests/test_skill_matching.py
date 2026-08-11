"""
Unit Tests for Structured Skill Match Classification Core Service.
Validates normalization, exact matching, RapidFuzz ratio fallback,
target deduplication, category independence, and configured threshold behavior.
"""

from app.core.config import settings
from app.services.skill_matching import (
    SkillMatchResult,
    classify_skill_matches,
    normalize_skill,
)


def test_1_normalization_strips_outer_whitespace():
    """Test 1: Normalization strips leading and trailing whitespace."""
    assert normalize_skill("  Python  ") == "python"


def test_2_normalization_collapses_repeated_whitespace():
    """Test 2: Normalization collapses repeated internal whitespace to single spaces."""
    assert normalize_skill("React   Native   Framework") == "react native framework"


def test_3_normalization_is_case_insensitive_via_casefold():
    """Test 3: Normalization converts text to casefold representation."""
    assert normalize_skill("FASTAPI") == "fastapi"
    assert normalize_skill("PyThOn") == "python"


def test_4_exact_normalized_match_succeeds():
    """Test 4: Exact normalized match classifies target as matched."""
    result = classify_skill_matches(
        candidate_skills=["fastapi", "python"],
        required_skills=["FastAPI"],
        preferred_skills=[],
    )
    assert result.matched_required_skills == ["FastAPI"]
    assert result.missing_required_skills == []


def test_5_original_internship_spelling_is_preserved_in_output():
    """Test 5: Original internship skill spelling is preserved in matched/missing output."""
    result = classify_skill_matches(
        candidate_skills=["python"],
        required_skills=["   PyThOn  "],
        preferred_skills=["  DocKer  "],
    )
    assert result.matched_required_skills == ["PyThOn"]
    assert result.missing_preferred_skills == ["DocKer"]


def test_6_fuzzy_fallback_above_threshold_classifies_matched(monkeypatch):
    """Test 6: Fuzzy fallback above configured threshold classifies target as matched."""
    monkeypatch.setattr(settings, "SKILL_FUZZY_THRESHOLD", 85)
    result = classify_skill_matches(
        candidate_skills=["Postgresq"],
        required_skills=["PostgreSQL"],
        preferred_skills=[],
    )
    assert result.matched_required_skills == ["PostgreSQL"]
    assert result.missing_required_skills == []


def test_7_fuzzy_result_below_threshold_classifies_missing(monkeypatch):
    """Test 7: Fuzzy similarity below threshold classifies target as missing."""
    monkeypatch.setattr(settings, "SKILL_FUZZY_THRESHOLD", 85)
    result = classify_skill_matches(
        candidate_skills=["Java"],
        required_skills=["Python"],
        preferred_skills=[],
    )
    assert result.matched_required_skills == []
    assert result.missing_required_skills == ["Python"]


def test_8_exact_match_does_not_require_fuzzy_fallback(monkeypatch):
    """Test 8: Exact normalized match classifies target without invoking fuzz.ratio fallback."""

    def _forbid_fuzzy_ratio(*args, **kwargs):
        raise AssertionError("fuzz.ratio should not be called when exact match succeeds")

    monkeypatch.setattr("app.services.skill_matching.fuzz.ratio", _forbid_fuzzy_ratio)
    result = classify_skill_matches(
        candidate_skills=["  PYTHON  "],
        required_skills=["Python"],
        preferred_skills=[],
    )
    assert result.matched_required_skills == ["Python"]
    assert result.missing_required_skills == []


def test_9_candidate_duplicate_normalized_skills_do_not_change_classification():
    """Test 9: Duplicate candidate skills (different casing/spacing) process correctly."""
    result = classify_skill_matches(
        candidate_skills=["Python", " python ", "PYTHON"],
        required_skills=["Python"],
        preferred_skills=[],
    )
    assert result.matched_required_skills == ["Python"]


def test_10_duplicate_required_target_skills_collapse_deterministically():
    """Test 10: Duplicate required target skills collapse to first original occurrence."""
    result = classify_skill_matches(
        candidate_skills=["Python"],
        required_skills=["PyThOn", " python ", "PYTHON"],
        preferred_skills=[],
    )
    assert result.matched_required_skills == ["PyThOn"]


def test_11_duplicate_preferred_target_skills_collapse_deterministically():
    """Test 11: Duplicate preferred target skills collapse to first original occurrence."""
    result = classify_skill_matches(
        candidate_skills=[],
        required_skills=[],
        preferred_skills=["Docker", " docker ", "DOCKER"],
    )
    assert result.missing_preferred_skills == ["Docker"]


def test_12_required_and_preferred_categories_remain_independent():
    """Test 12: Same skill present in required and preferred classifies independently."""
    result = classify_skill_matches(
        candidate_skills=["Python"],
        required_skills=["Python"],
        preferred_skills=["Python"],
    )
    assert result.matched_required_skills == ["Python"]
    assert result.matched_preferred_skills == ["Python"]


def test_13_empty_candidate_list_makes_non_empty_targets_missing():
    """Test 13: Empty candidate skill list marks all non-empty target skills as missing."""
    result = classify_skill_matches(
        candidate_skills=[],
        required_skills=["Python"],
        preferred_skills=["Docker"],
    )
    assert result.matched_required_skills == []
    assert result.missing_required_skills == ["Python"]
    assert result.matched_preferred_skills == []
    assert result.missing_preferred_skills == ["Docker"]


def test_14_empty_target_lists_return_empty_classifications():
    """Test 14: Empty required and preferred target lists return empty classifications."""
    result = classify_skill_matches(
        candidate_skills=["Python", "FastAPI"],
        required_skills=[],
        preferred_skills=[],
    )
    assert result == SkillMatchResult([], [], [], [])


def test_15_whitespace_only_skills_are_ignored():
    """Test 15: Whitespace-only skills in candidate or target inputs are ignored."""
    result = classify_skill_matches(
        candidate_skills=["   ", "\t"],
        required_skills=["  ", "Python"],
        preferred_skills=["\n", "Docker"],
    )
    assert result.missing_required_skills == ["Python"]
    assert result.missing_preferred_skills == ["Docker"]


def test_16_output_order_is_deterministic_and_follows_first_target_occurrence():
    """Test 16: Output classification list preserves deterministic target input ordering."""
    result = classify_skill_matches(
        candidate_skills=["FastAPI", "Python", "Docker"],
        required_skills=["Python", "FastAPI"],
        preferred_skills=["Kubernetes", "Docker"],
    )
    assert result.matched_required_skills == ["Python", "FastAPI"]
    assert result.matched_preferred_skills == ["Docker"]
    assert result.missing_preferred_skills == ["Kubernetes"]


def test_17_configured_fuzzy_threshold_boundary_behavior(monkeypatch):
    """Test 17: Classification strictly respects configured settings.SKILL_FUZZY_THRESHOLD."""
    # Deterministically monkeypatch fuzz.ratio to return 89.0
    monkeypatch.setattr("app.services.skill_matching.fuzz.ratio", lambda s1, s2: 89.0)

    # Threshold == 89 -> 89.0 >= 89 -> matched
    monkeypatch.setattr(settings, "SKILL_FUZZY_THRESHOLD", 89)
    res_equal = classify_skill_matches(
        candidate_skills=["CandidateSkill"],
        required_skills=["TargetSkill"],
        preferred_skills=[],
    )
    assert res_equal.matched_required_skills == ["TargetSkill"]
    assert res_equal.missing_required_skills == []

    # Threshold == 90 -> 89.0 < 90 -> missing
    monkeypatch.setattr(settings, "SKILL_FUZZY_THRESHOLD", 90)
    res_below = classify_skill_matches(
        candidate_skills=["CandidateSkill"],
        required_skills=["TargetSkill"],
        preferred_skills=[],
    )
    assert res_below.matched_required_skills == []
    assert res_below.missing_required_skills == ["TargetSkill"]
