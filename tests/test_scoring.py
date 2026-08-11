"""
Unit Tests for Pure Deterministic Scoring Service.
Validates skill, vector, attribute, and hybrid scoring logic, boundary clamping,
float precision preservation, and error handling for non-finite vector distances.
"""

import pytest
from app.services.scoring import (
    FINAL_ATTRIBUTE_WEIGHT,
    FINAL_SKILL_WEIGHT,
    FINAL_VECTOR_WEIGHT,
    HybridScore,
    calculate_attribute_score,
    calculate_hybrid_score,
    calculate_skill_score,
    calculate_vector_score,
)
from app.services.skill_matching import SkillMatchResult

# SKILLS TESTS (1 - 6)

def test_1_skill_score_required_and_preferred_70_30():
    """Test 1: Required (100%) + Preferred (0%) applies 70/30 sub-weights -> 70.0."""
    result = SkillMatchResult(
        matched_required_skills=["Python"],
        missing_required_skills=[],
        matched_preferred_skills=[],
        missing_preferred_skills=["Docker"],
    )
    assert calculate_skill_score(result) == pytest.approx(70.0)


def test_2_skill_score_only_required_category():
    """Test 2: Only required category uses required component alone (2/4 = 50.0)."""
    result = SkillMatchResult(
        matched_required_skills=["Python", "FastAPI"],
        missing_required_skills=["SQL", "Docker"],
        matched_preferred_skills=[],
        missing_preferred_skills=[],
    )
    assert calculate_skill_score(result) == pytest.approx(50.0)


def test_3_skill_score_only_preferred_category():
    """Test 3: Only preferred category uses preferred component alone (1/2 = 50.0)."""
    result = SkillMatchResult(
        matched_required_skills=[],
        missing_required_skills=[],
        matched_preferred_skills=["Docker"],
        missing_preferred_skills=["Kubernetes"],
    )
    assert calculate_skill_score(result) == pytest.approx(50.0)


def test_4_skill_score_no_required_or_preferred_returns_100():
    """Test 4: Both required and preferred empty returns 100.0."""
    result = SkillMatchResult([], [], [], [])
    assert calculate_skill_score(result) == pytest.approx(100.0)


def test_5_skill_score_zero_matches_returns_zero():
    """Test 5: Zero matches returns 0.0 when categories exist."""
    result = SkillMatchResult(
        matched_required_skills=[],
        missing_required_skills=["Python"],
        matched_preferred_skills=[],
        missing_preferred_skills=["Docker"],
    )
    assert calculate_skill_score(result) == pytest.approx(0.0)


def test_6_skill_score_partially_matched_float_calculation():
    """Test 6: Partially matched required (1/2=50%) + preferred (1/2=50%) -> 50.0."""
    result = SkillMatchResult(
        matched_required_skills=["Python"],
        missing_required_skills=["SQL"],
        matched_preferred_skills=["Docker"],
        missing_preferred_skills=["AWS"],
    )
    # 0.70 * 50 + 0.30 * 50 = 50.0
    assert calculate_skill_score(result) == pytest.approx(50.0)


# VECTOR TESTS (7 - 14)

def test_7_vector_score_distance_zero_returns_100():
    """Test 7: Distance 0.0 returns vector_score 100.0."""
    assert calculate_vector_score(0.0) == pytest.approx(100.0)


def test_8_vector_score_distance_point_one_returns_90():
    """Test 8: Distance 0.1 returns vector_score approximately 90.0."""
    assert calculate_vector_score(0.1) == pytest.approx(90.0)


def test_9_vector_score_distance_one_returns_zero():
    """Test 9: Distance 1.0 returns vector_score 0.0."""
    assert calculate_vector_score(1.0) == pytest.approx(0.0)


def test_10_vector_score_distance_greater_than_one_clamps_to_zero():
    """Test 10: Distance > 1.0 clamps similarity to 0.0 -> score 0.0."""
    assert calculate_vector_score(1.5) == pytest.approx(0.0)


def test_11_vector_score_negative_finite_distance_clamps_to_100():
    """Test 11: Negative finite distance clamps similarity to 1.0 -> score 100.0."""
    assert calculate_vector_score(-0.2) == pytest.approx(100.0)


def test_12_vector_score_nan_raises_value_error():
    """Test 12: NaN cosine_distance raises ValueError."""
    with pytest.raises(ValueError, match="Invalid non-finite cosine_distance"):
        calculate_vector_score(float("nan"))


def test_13_vector_score_positive_infinity_raises_value_error():
    """Test 13: Positive infinity cosine_distance raises ValueError."""
    with pytest.raises(ValueError, match="Invalid non-finite cosine_distance"):
        calculate_vector_score(float("inf"))


def test_14_vector_score_negative_infinity_raises_value_error():
    """Test 14: Negative infinity cosine_distance raises ValueError."""
    with pytest.raises(ValueError, match="Invalid non-finite cosine_distance"):
        calculate_vector_score(float("-inf"))


# ATTRIBUTES TESTS (15 - 24)

def test_15_attribute_score_matching_work_type():
    """Test 15: Single active work_type preference matching internship returns 100.0."""
    score = calculate_attribute_score(
        work_types=["remote"],
        desired_locations=None,
        internship_work_type="remote",
        internship_location="Istanbul",
    )
    assert score == pytest.approx(100.0)


def test_16_attribute_score_mismatching_work_type():
    """Test 16: Single active work_type preference mismatching internship returns 0.0."""
    score = calculate_attribute_score(
        work_types=["remote"],
        desired_locations=None,
        internship_work_type="onsite",
        internship_location="Istanbul",
    )
    assert score == pytest.approx(0.0)


def test_17_attribute_score_matching_location():
    """Test 17: Single active location preference matching internship returns 100.0."""
    score = calculate_attribute_score(
        work_types=None,
        desired_locations=["Istanbul"],
        internship_work_type="remote",
        internship_location="Istanbul",
    )
    assert score == pytest.approx(100.0)


def test_18_attribute_score_mismatching_location():
    """Test 18: Single active location preference mismatching internship returns 0.0."""
    score = calculate_attribute_score(
        work_types=None,
        desired_locations=["Ankara"],
        internship_work_type="remote",
        internship_location="Istanbul",
    )
    assert score == pytest.approx(0.0)


def test_19_attribute_score_both_active_one_matches_returns_50():
    """Test 19: Both active (work_type matches 100, location mismatch 0) returns 50.0."""
    score = calculate_attribute_score(
        work_types=["remote"],
        desired_locations=["Ankara"],
        internship_work_type="remote",
        internship_location="Istanbul",
    )
    assert score == pytest.approx(50.0)


def test_20_attribute_score_both_active_both_match_returns_100():
    """Test 20: Both active and both matching returns 100.0."""
    score = calculate_attribute_score(
        work_types=["remote"],
        desired_locations=["Istanbul"],
        internship_work_type="remote",
        internship_location="Istanbul",
    )
    assert score == pytest.approx(100.0)


def test_21_attribute_score_neither_preference_active_returns_100():
    """Test 21: Neither preference active returns 100.0 (unconstrained)."""
    score = calculate_attribute_score(
        work_types=[],
        desired_locations=None,
        internship_work_type="remote",
        internship_location="Istanbul",
    )
    assert score == pytest.approx(100.0)


def test_22_attribute_score_case_and_whitespace_normalization():
    """Test 22: Casefold and whitespace collapse normalization works for preferences."""
    score = calculate_attribute_score(
        work_types=["  ReMoTe  "],
        desired_locations=["  San   Francisco,  CA  "],
        internship_work_type="remote",
        internship_location="San Francisco, CA",
    )
    assert score == pytest.approx(100.0)


def test_23_attribute_score_whitespace_only_entries_ignored():
    """Test 23: Whitespace-only preference entries are ignored as unconstrained."""
    score = calculate_attribute_score(
        work_types=["   ", "\t"],
        desired_locations=["\n"],
        internship_work_type="onsite",
        internship_location="Istanbul",
    )
    assert score == pytest.approx(100.0)


def test_24_attribute_score_single_active_criterion_controls_full_score():
    """Test 24: Only one active criterion (location) controls full attribute score."""
    score = calculate_attribute_score(
        work_types=["  "],
        desired_locations=["Remote"],
        internship_work_type="onsite",
        internship_location="Remote",
    )
    assert score == pytest.approx(100.0)


# HYBRID TESTS (25 - 28)

def test_25_hybrid_score_formula_50_30_20():
    """Test 25: Hybrid formula (0.50 * skill + 0.30 * vector + 0.20 * attr) computes correctly."""
    match_res = SkillMatchResult(
        matched_required_skills=["Python"],
        missing_required_skills=[],
        matched_preferred_skills=[],
        missing_preferred_skills=[],
    )  # skill_score = 100.0

    # cosine_distance = 0.1 -> vector_score = 90.0
    # work_types=["remote"] matching "remote" -> attribute_score = 100.0
    hybrid = calculate_hybrid_score(
        skill_match_result=match_res,
        cosine_distance=0.1,
        work_types=["remote"],
        desired_locations=None,
        internship_work_type="remote",
        internship_location="Istanbul",
    )

    # overall = 0.50 * 100.0 + 0.30 * 90.0 + 0.20 * 100.0 = 50 + 27 + 20 = 97.0
    expected = (
        (FINAL_SKILL_WEIGHT * 100.0)
        + (FINAL_VECTOR_WEIGHT * 90.0)
        + (FINAL_ATTRIBUTE_WEIGHT * 100.0)
    )
    assert hybrid.overall_score == pytest.approx(expected)
    assert hybrid.overall_score == pytest.approx(97.0)


def test_26_hybrid_score_dataclass_fields():
    """Test 26: HybridScore exposes skill_score, vector_score, attribute_score, overall_score."""
    hybrid = HybridScore(
        skill_score=80.0,
        vector_score=70.0,
        attribute_score=60.0,
        overall_score=73.0,
    )
    assert hybrid.skill_score == 80.0
    assert hybrid.vector_score == 70.0
    assert hybrid.attribute_score == 60.0
    assert hybrid.overall_score == 73.0


def test_27_returned_scores_are_floats():
    """Test 27: All component and overall scores are float instances."""
    match_res = SkillMatchResult(["Python"], [], [], [])
    hybrid = calculate_hybrid_score(
        skill_match_result=match_res,
        cosine_distance=0.2,
        work_types=["remote"],
        desired_locations=None,
        internship_work_type="remote",
        internship_location="Istanbul",
    )
    assert isinstance(hybrid.skill_score, float)
    assert isinstance(hybrid.vector_score, float)
    assert isinstance(hybrid.attribute_score, float)
    assert isinstance(hybrid.overall_score, float)


def test_28_scoring_service_performs_no_rounding():
    """Test 28: Service preserves float precision and does not round to integer."""
    match_res = SkillMatchResult(
        matched_required_skills=["Python"],
        missing_required_skills=["SQL", "Java"],
        matched_preferred_skills=[],
        missing_preferred_skills=[],
    )  # skill_score = 1/3 * 100 = 33.333333333333336

    hybrid = calculate_hybrid_score(
        skill_match_result=match_res,
        cosine_distance=0.15,  # vector_score = 85.0
        work_types=["remote"],
        desired_locations=["Istanbul"],
        internship_work_type="remote",
        internship_location="Ankara",  # attr = 50.0
    )

    assert isinstance(hybrid.overall_score, float)
    assert not float(hybrid.overall_score).is_integer()
