"""One local control surface. All calculations use the same engine as the CLI."""

from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response

from .contracts import Definitions, Run, Scenario
from .storage import export_run, load_definitions, load_run, record_run

app = FastAPI(title="future", version="0.1.0")


@app.get("/api/definitions", response_model=Definitions)
def definitions():
    return load_definitions()


@app.post("/api/runs", response_model=Run)
def calculate(scenario: Scenario):
    return record_run(scenario)


@app.get("/api/runs/{run_id}/export")
def export(run_id: str, format: Literal["csv", "xlsx"], comparison_run_id: str | None = None):
    try:
        run = load_run(run_id)
        comparison = load_run(comparison_run_id) if comparison_run_id is not None else None
    except (ValueError, FileNotFoundError) as error:
        raise HTTPException(status_code=404, detail="Recorded run not found") from error
    media = "text/csv" if format == "csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return Response(export_run(run, format, comparison), media_type=media,
                    headers={"Content-Disposition": f'attachment; filename="future-{run_id}.{format}"'})
