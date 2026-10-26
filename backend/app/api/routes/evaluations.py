
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.evaluation import Evaluation
from app.services.evaluation_service import run_evaluation, run_eval_suite
from app.core.deps import get_current_user
from app.models.user import User


router = APIRouter(prefix="/evaluations", tags=["evaluations"])


BUILT_IN_SCENARIO_NAMES = {
    "basic billing inquiry",
    "password reset flow",
    "refund policy",
    "technical integration",
    "insufficient evidence test",
}


def _evaluation_response(e: Evaluation) -> dict:
    """Convert an evaluation database record to an API response."""
    return {
        "id": str(e.id),
        "name": e.name,
        "query": e.query,
        "expected_answer": e.expected_answer,
        "actual_answer": e.actual_answer,
        "retrieved_chunks": e.retrieved_chunks or [],
        "recall_at_k": e.recall_at_k,
        "groundedness_score": e.groundedness_score,
        "citation_precision": e.citation_precision,
        "latency_ms": e.latency_ms,
        "has_unsupported_claims": e.has_unsupported_claims,
        "passed": e.passed,
        "notes": e.notes,
        "created_at": str(e.created_at) if e.created_at else None,
    }


@router.get("")
def list_evaluations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the latest saved result for each built-in scenario."""
    items = (
        db.query(Evaluation)
        .order_by(Evaluation.created_at.desc(), Evaluation.id.desc())
        .all()
    )

    latest_by_scenario = {}

    for evaluation in items:
        key = (evaluation.name or "").strip().lower()

        if key in BUILT_IN_SCENARIO_NAMES and key not in latest_by_scenario:
            latest_by_scenario[key] = evaluation

    return [
        _evaluation_response(evaluation)
        for evaluation in latest_by_scenario.values()
    ]


@router.post("", status_code=201)
def create_evaluation(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create and execute one custom evaluation."""
    name = str(data.get("name") or "").strip()
    query = str(data.get("query") or "").strip()
    expected_answer = data.get("expected_answer")
    relevant_keywords = data.get("relevant_keywords")
    expected_behavior = data.get("expected_behavior", "answer")
    top_k = data.get("top_k", 5)

    if not name:
        raise HTTPException(
            status_code=400,
            detail="name is required",
        )

    if not query:
        raise HTTPException(
            status_code=400,
            detail="query is required",
        )

    if (
        not isinstance(top_k, int)
        or isinstance(top_k, bool)
        or not 1 <= top_k <= 20
    ):
        raise HTTPException(
            status_code=400,
            detail="top_k must be an integer between 1 and 20",
        )

    if expected_behavior not in ("answer", "refuse"):
        raise HTTPException(
            status_code=400,
            detail="expected_behavior must be 'answer' or 'refuse'",
        )

    if relevant_keywords is not None:
        if (
            not isinstance(relevant_keywords, list)
            or not all(isinstance(word, str) for word in relevant_keywords)
        ):
            raise HTTPException(
                status_code=400,
                detail="relevant_keywords must be a list of strings",
            )

    return run_evaluation(
        db=db,
        name=name,
        query=query,
        expected_answer=expected_answer,
        top_k=top_k,
        relevant_keywords=relevant_keywords,
        expected_behavior=expected_behavior,
    )


@router.get("/{eval_id}")
def get_evaluation(
    eval_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return one evaluation with its answer and retrieved chunks."""
    evaluation = (
        db.query(Evaluation)
        .filter(Evaluation.id == eval_id)
        .first()
    )

    if not evaluation:
        raise HTTPException(
            status_code=404,
            detail="Evaluation not found",
        )

    return _evaluation_response(evaluation)


@router.post("/run-suite")
def run_suite(
    data: dict = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run the built-in benchmark suite or a supplied custom dataset."""
    custom_dataset = None

    if data is not None:
        custom_dataset = data.get("dataset")

        if custom_dataset is not None and not isinstance(custom_dataset, list):
            raise HTTPException(
                status_code=400,
                detail="dataset must be a list",
            )

    results = run_eval_suite(
        db=db,
        custom_dataset=custom_dataset,
    )

    successful_results = [
        result for result in results
        if "error" not in result
    ]

    total = len(results)
    passed = sum(
        1 for result in results
        if result.get("passed")
    )

    avg_recall = (
        sum(
            result.get("recall_at_k") or 0
            for result in successful_results
        ) / len(successful_results)
        if successful_results
        else 0
    )

    avg_groundedness = (
        sum(
            result.get("groundedness_score") or 0
            for result in successful_results
        ) / len(successful_results)
        if successful_results
        else 0
    )

    avg_citation_precision = (
        sum(
            result.get("citation_precision") or 0
            for result in successful_results
        ) / len(successful_results)
        if successful_results
        else 0
    )

    avg_latency = (
        sum(
            result.get("latency_ms") or 0
            for result in successful_results
        ) / len(successful_results)
        if successful_results
        else 0
    )

    return {
        "results": results,
        "total_evaluations": total,
        "passed": passed,
        "failed": total - passed,
        "avg_recall_at_k": round(avg_recall, 3),
        "avg_groundedness": round(avg_groundedness, 3),
        "avg_citation_precision": round(avg_citation_precision, 3),
        "avg_latency_ms": round(avg_latency, 1),
        "errors": [
            result for result in results
            if "error" in result
        ],
    }
