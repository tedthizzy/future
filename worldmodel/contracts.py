"""The authoritative contract for inputs, evidence, and recorded results."""

from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Rate = Annotated[float, Field(ge=-0.5, le=1, allow_inf_nan=False)]
Share = Annotated[float, Field(ge=0, le=100, allow_inf_nan=False)]


class Record(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Scenario(Record):
    schema_version: Literal["1"]
    name: Annotated[str, Field(min_length=1, max_length=200)]
    forecast_origin: date
    horizon_months: Literal[120]
    exploratory: Literal[True]
    transition_onset_month: Annotated[int, Field(ge=0, le=120)]
    transition_duration_months: Annotated[int, Field(ge=1, le=120)]
    real_gdp_growth: Rate
    real_spending_growth: Rate
    other_revenue_growth: Rate
    collection_effectiveness: Annotated[float, Field(ge=0, le=1)]
    annual_inflation: Rate
    bitcoin_real_growth: Rate
    asset_decline: Annotated[float, Field(ge=0.8, le=1)]

    @model_validator(mode="after")
    def monthly_origin(self):
        if self.forecast_origin.day != 1 or self.forecast_origin.year > 9989:
            raise ValueError("Forecast origin must be the first day of a month with a complete ten-year horizon")
        return self


class Source(Record):
    id: str
    title: str
    url: str
    publication_date: str
    retrieval_date: str
    sha256: str
    notes: str


class Baseline(Record):
    year: int
    government_scope: str
    compulsory_revenue_pct_gdp: Share
    other_revenue_pct_gdp: Share
    expenditure_pct_gdp: Share
    source_ids: list[str]
    notes: list[str]


class Country(Record):
    id: str
    name: str
    kind: Literal["country", "bloc"]
    members: list[str]
    membership_date: str | None
    baseline: Baseline | None
    research_gaps: list[str]


class Mechanism(Record):
    id: str
    name: str
    status: Literal["implemented", "assumed", "qualitative"]
    description: str
    equation: str | None
    inputs: list[str]
    outputs: list[str]
    source_ids: list[str]
    research_gaps: list[str]


class Variable(Record):
    id: str
    name: str
    unit: str
    status: Literal["assumed", "generated"]
    mechanism_id: str


class Definitions(Record):
    schema_version: Literal["1"]
    model_version: str
    default_scenario: Scenario
    countries: list[Country]
    sources: list[Source]
    mechanisms: list[Mechanism]
    variables: list[Variable]
    limitations: list[str]

    @model_validator(mode="after")
    def references(self):
        for records in (self.countries, self.sources, self.mechanisms, self.variables):
            ids = [r.id for r in records]
            if len(ids) != len(set(ids)):
                raise ValueError("Record IDs must be unique")
        sources = {s.id for s in self.sources}
        mechanisms = {m.id for m in self.mechanisms}
        variables = {v.id: v for v in self.variables}
        for record in [*self.mechanisms, *(c.baseline for c in self.countries if c.baseline)]:
            if not set(record.source_ids) <= sources:
                raise ValueError("Unknown source reference")
        if any(v.mechanism_id not in mechanisms for v in self.variables):
            raise ValueError("Unknown mechanism reference")
        for mechanism in self.mechanisms:
            if not set(mechanism.inputs) <= mechanisms:
                raise ValueError("Unknown computational dependency")
            if any(output not in variables or variables[output].mechanism_id != mechanism.id
                   for output in mechanism.outputs):
                raise ValueError("Output must reference its declared mechanism")
        return self


class Point(Record):
    month: int
    date: date
    transition: float
    gdp_index: float
    productive_capacity_index: float
    price_index: float
    bitcoin_real_index: float
    bitcoin_dollar_index: float
    bitcoin_bitcoin_index: float
    stock_real_index: float
    property_real_index: float
    stock_dollar_index: float
    property_dollar_index: float
    stock_bitcoin_index: float
    property_bitcoin_index: float
    compulsory_revenue: float | None
    other_revenue: float | None
    sustainable_spending: float | None
    planned_spending: float | None
    financing: float | None
    funded_spending: float | None
    funding_gap: float | None
    funding_gap_pct_gdp: float | None
    refinancing_requirement: float | None


class CountryResult(Record):
    country_id: str
    baseline: Baseline | None
    points: list[Point]
    research_gaps: list[str]


class Provenance(Record):
    code_revision: str
    code_dirty: bool
    code_sha256: str
    registry_sha256: str
    scenario_sha256: str
    python_version: str
    dependencies: dict[str, str]
    solver: Literal["deterministic monthly accounting; annualized flows"]
    created_at: str


class Run(Record):
    schema_version: Literal["1"]
    model_version: str
    run_id: str
    scenario: Scenario
    provenance: Provenance
    countries: list[CountryResult]


class ApiContract(Record):
    definitions: Definitions
    scenario: Scenario
    run: Run
