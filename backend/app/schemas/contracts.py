from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class ProvenanceRecord(BaseModel):
    source: str
    publisher: str
    url: str
    retrieved_at: str
    last_updated: str
    units: str
    coverage: str
    methodology: Optional[str] = None
    missing_data: bool = False
    verification_status: Literal[
        "verified",
        "single_source",
        "conflicting",
        "interpretation",
        "unverified",
        "ai_hypothesis",
    ] = "verified"


class SimulationRequest(BaseModel):
    scenario_id: str = Field(..., min_length=2, max_length=128)
    category: Literal["economics", "demographics", "energy", "technology", "environment"]
    horizon_years: int = Field(default=15, ge=5, le=50)
    monte_carlo_runs: int = Field(default=500, ge=50, le=2000)
    seed: int = Field(default=42)
    parameters: Dict[str, float] = Field(default_factory=dict)


class TrajectoryPoint(BaseModel):
    year: int
    historical_observed: Optional[float] = None
    baseline: float
    modified_p10: float
    modified_p50: float
    modified_p90: float


class SensitivityItem(BaseModel):
    parameter: str
    label: str
    low_impact: float
    high_impact: float
    elasticity: float


class SimulationResponse(BaseModel):
    scenario_id: str
    category: str
    model_name: str
    model_version: str
    timestamp: str
    units: str
    initial_assumptions: List[str]
    trajectory: List[TrajectoryPoint]
    sensitivity: List[SensitivityItem]
    explanation: str
    limitations: List[str]
    provenance: ProvenanceRecord


class GraphRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=200)
    depth: int = Field(default=2, ge=1, le=3)
    max_nodes: int = Field(default=32, ge=5, le=80)


class ResearchRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=500)
    mode: Literal["quick", "deep", "comparative", "historical", "scientific", "economic"] = "deep"
