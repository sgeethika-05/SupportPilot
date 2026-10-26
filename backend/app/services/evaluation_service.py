
import re
import time
import uuid

from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.rag_service import semantic_search
from app.services.gemini_service import answer_copilot
from app.models.evaluation import Evaluation


EVAL_DATASET = [
    {
    "name": "Basic billing inquiry",
    "query": (
        "A customer wants to update their saved payment method. "
        "What steps should they follow?"
    ),
    "expected_answer": "billing payment credit card",
    "relevant_keywords": ["billing", "payment", "account"],
    "expected_behavior": "answer",
    },
    {
        "name": "Password reset flow",
        "query": "How do I reset my password?",
        "expected_answer": "password reset email link",
        "relevant_keywords": ["password", "reset", "email"],
        "expected_behavior": "answer",
    },
    {
        "name": "Refund policy",
        "query": "What is the refund policy?",
        "expected_answer": "refund policy days",
        "relevant_keywords": ["refund", "return", "policy"],
        "expected_behavior": "answer",
    },
    {
        "name": "Technical integration",
        "query": "How do I connect the API to my application?",
        "expected_answer": "api key authentication endpoint",
        "relevant_keywords": ["api", "integration", "authentication"],
        "expected_behavior": "answer",
    },
    {
        "name": "Insufficient evidence test",
        "query": "What is the capital of Mars?",
        "expected_answer": None,
        "relevant_keywords": [],
        "expected_behavior": "refuse",
    },
]



REFUSAL_PATTERNS = [
    r"could not find relevant information",
    r"couldn't find relevant information",
    r"don't have enough information",
    r"do not have enough information",
    r"insufficient evidence",
    r"cannot answer.{0,40}reliably",
    r"can't answer.{0,40}reliably",
    r"unable to answer.{0,40}reliably",
    r"not enough information",
    r"no relevant information",
    r"no relevant evidence",
    r"^(?:i'm sorry,?\s*)?(?:i cannot|i can't|i am unable|i'm unable) answer",
    r"^(?:i'm sorry,?\s*)?(?:i cannot|i can't|i am unable|i'm unable) provide (?:a reliable|an accurate|a definitive) answer",
]



STOP_WORDS = {
    "about", "after", "again", "also", "because", "been", "being",
    "could", "does", "doing", "from", "have", "into", "more",
    "most", "please", "should", "some", "than", "that", "their",
    "there", "these", "they", "this", "those", "through", "using",
    "very", "what", "when", "where", "which", "while", "with",
    "would", "your", "will", "were", "them", "then", "only",
    "need", "here", "help", "information", "support", "answer",
    "question", "based", "available",
}


def _normalise_words(text: str) -> set:
    """Extract normalized words for text comparisons."""
    return set(re.findall(r"[a-z0-9]+", (text or "").lower()))



def _is_refusal(answer: str) -> bool:
    """Detect answers that decline due to insufficient evidence."""
    if not answer or not answer.strip():
        return False

    text = answer.lower().strip()

    refusal_patterns = [
        r"could not find relevant information",
        r"couldn't find relevant information",
        r"don't have enough information",
        r"do not have enough information",
        r"insufficient evidence",
        r"cannot answer.{0,40}reliably",
        r"can't answer.{0,40}reliably",
        r"unable to answer.{0,40}reliably",
        r"not enough information",
        r"no relevant information",
        r"no relevant evidence",
    ]

    return any(
        re.search(pattern, text)
        for pattern in refusal_patterns
    )


def _compute_recall_at_k(
    retrieved_chunks: list,
    relevant_keywords: list,
    k: int = 5,
) -> float:
    """Estimate keyword recall among the top-k retrieved chunks."""
    keywords = {
        keyword.strip().lower()
        for keyword in (relevant_keywords or [])
        if isinstance(keyword, str) and keyword.strip()
    }

    if not keywords:
        return 1.0

    top_chunks = (retrieved_chunks or [])[:max(0, k)]
    combined_words = _normalise_words(
        " ".join(
            chunk.get("content", "")
            for chunk in top_chunks
        )
    )

    found = sum(
        1 for keyword in keywords
        if keyword in combined_words
    )
    return found / len(keywords)


def _compute_groundedness(answer: str, chunks: list) -> float:
    """Estimate answer/context word overlap; not factual verification."""
    if not answer or not answer.strip() or not chunks:
        return 0.0

    source_words = _normalise_words(
        " ".join(
            chunk.get("content", "")
            for chunk in chunks
        )
    )
    if not source_words:
        return 0.0

    sentences = [
        sentence.strip()
        for sentence in re.split(r"[.!?]+", answer)
        if len(sentence.strip()) > 15
    ]
    if not sentences:
        return 0.0

    grounded_count = 0

    for sentence in sentences:
        words = _normalise_words(sentence)
        significant_words = {
            word for word in words
            if len(word) > 3 and word not in STOP_WORDS
        }

        if not significant_words:
            grounded_count += 1
            continue

        overlap = (
            len(significant_words & source_words)
            / len(significant_words)
        )
        if overlap >= 0.30:
            grounded_count += 1

    return grounded_count / len(sentences)


def _compute_citation_precision(
    answer: str,
    num_chunks: int,
) -> float:
    """Check explicit [Source N] citations against retrieved chunk count."""
    
    citations = re.findall(
    r"(?:\[|【)\s*Source\s+(\d+)\s*(?:\]|】)",
    answer or "",
    re.IGNORECASE,
    )


    if not citations or num_chunks <= 0:
        return 0.0

    valid_count = sum(
        1 for citation in citations
        if 1 <= int(citation) <= num_chunks
    )
    return valid_count / len(citations)


def calculate_recall_at_k(
    retrieved_chunks: list,
    expected_text: str,
    k: int = 5,
) -> float:
    """Public helper retained for compatibility with existing tests."""
    if not expected_text:
        return 1.0

    keywords = [
        word
        for word in re.findall(
            r"[a-z0-9]+",
            expected_text.lower(),
        )
        if len(word) > 3
    ]
    return _compute_recall_at_k(
        retrieved_chunks,
        keywords,
        k,
    )


def evaluate_groundedness(
    answer: str,
    context_chunks: list,
):
    """Return groundedness, unsupported-claim flag, and citation precision."""
    groundedness = _compute_groundedness(answer, context_chunks)
    safe_refusal = _is_refusal(answer)

    has_unsupported = (
        bool(answer.strip())
        and not safe_refusal
        and groundedness < 0.4
    )

    citation_precision = _compute_citation_precision(
        answer,
        len(context_chunks or []),
    )
    return groundedness, has_unsupported, citation_precision


def run_evaluation(
    db: Session,
    name: str,
    query: str,
    expected_answer: str = None,
    top_k: int = 5,
    relevant_keywords: list = None,
    expected_behavior: str = "answer",
) -> dict:
    """Run and save one RAG evaluation."""
    start = time.monotonic()

    retrieval_start = time.monotonic()
    rag_result = semantic_search(
        db=db,
        query=query,
        top_k=top_k,
        min_similarity=settings.MIN_SIMILARITY_THRESHOLD,
    )
    retrieval_ms = int(
        (time.monotonic() - retrieval_start) * 1000
    )

    chunks = rag_result.get("results", [])

    generation_start = time.monotonic()
    copilot_result = answer_copilot(
        question=query,
        context_chunks=chunks,
    )
    generation_ms = int(
        (time.monotonic() - generation_start) * 1000
    )

    answer = (
        copilot_result.get("evaluation_answer")
        or copilot_result.get("answer", "")
        or ""
    )
    latency_ms = int(
        (time.monotonic() - start) * 1000
    )

    if relevant_keywords is not None:
        keywords = relevant_keywords
    elif expected_answer:
        keywords = [
            word
            for word in re.findall(
                r"[a-z0-9]+",
                expected_answer.lower(),
            )
            if len(word) > 3
        ]
    else:
        keywords = []

    recall = _compute_recall_at_k(
    chunks,
    keywords,
    top_k,
    )
    safe_refusal = _is_refusal(answer)

    if safe_refusal:
        groundedness = 0.0
        citation_precision = 1.0
        has_unsupported = False
    else:
        groundedness = _compute_groundedness(answer, chunks)
        citation_precision = _compute_citation_precision(
            answer,
            len(chunks),
    )
 
    has_unsupported = (
        bool(answer.strip())
        and not safe_refusal
        and groundedness < 0.4
    )


    # Diagnostic output: inspect these values in the backend terminal.
    print(
        f"[EVAL DEBUG] {name}: "
        f"safe_refusal={safe_refusal}, "
        f"recall={recall:.3f}, "
        f"groundedness={groundedness:.3f}, "
        f"citation_precision={citation_precision:.3f}, "
        f"has_unsupported={has_unsupported}, "
        f"chunks={len(chunks)}"
    )

    if expected_behavior == "refuse":
        passed = safe_refusal and not has_unsupported

        if passed:
            notes = (
                "Passed: the AI declined to answer "
                "without sufficient evidence."
            )
        else:
            notes = (
                "Failed: the AI did not clearly decline "
                "the unsupported question. Review the answer manually."
            )
    else:
        passed = (
        not safe_refusal
        and bool(chunks)
        and recall >= 0.5
        and groundedness >= 0.4
        and citation_precision > 0.0
        and not has_unsupported
    )

        if passed:
            notes = (
                "Passed automated keyword-recall "
                "and context-overlap checks."
            )
        else:
            notes = (
                "Failed one or more automated answer-quality checks. "
                "Inspect retrieved chunks and the generated answer."
            )

    notes += (
        f" Retrieval: {retrieval_ms} ms;"
        f" generation: {generation_ms} ms."
        f" Retrieved {len(chunks)} chunk(s)."
        f" Citation precision: {citation_precision:.0%}."
        " Citation precision checks explicit [Source N] markers only."
        " Groundedness and recall are heuristic metrics, not proof "
        "of factual accuracy. Manual review is recommended."
    )

    retrieved_chunks = [
        {
            "id": str(chunk.get("id", "")),
            "document_name": chunk.get(
                "document_name",
                "Unknown document",
            ),
            "content": chunk.get("content", "")[:200],
            "score": chunk.get("similarity_score", 0),
        }
        for chunk in chunks
    ]

    ev = Evaluation(
        id=uuid.uuid4(),
        name=name,
        query=query,
        expected_answer=expected_answer,
        actual_answer=answer,
        retrieved_chunks=retrieved_chunks,
        recall_at_k=round(recall, 3),
        groundedness_score=round(groundedness, 3),
        citation_precision=round(citation_precision, 3),
        latency_ms=latency_ms,
        has_unsupported_claims=has_unsupported,
        passed=passed,
        notes=notes,
    )

    db.add(ev)
    db.commit()
    db.refresh(ev)

    return {
        "id": str(ev.id),
        "name": ev.name,
        "query": ev.query,
        "recall_at_k": ev.recall_at_k,
        "groundedness_score": ev.groundedness_score,
        "citation_precision": ev.citation_precision,
        "latency_ms": ev.latency_ms,
        "has_unsupported_claims": ev.has_unsupported_claims,
        "passed": ev.passed,
        "notes": ev.notes,
    }


def run_eval_suite(
    db: Session,
    custom_dataset: list = None,
) -> list:
    """Run the built-in benchmark suite or a supplied custom dataset."""
    dataset = (
        custom_dataset
        if custom_dataset is not None
        else EVAL_DATASET
    )
    results = []

    for case in dataset:
        try:
            result = run_evaluation(
                db=db,
                name=case["name"],
                query=case["query"],
                expected_answer=case.get("expected_answer"),
                top_k=5,
                relevant_keywords=case.get("relevant_keywords"),
                expected_behavior=case.get(
                    "expected_behavior",
                    "answer",
                ),
            )
            results.append(result)

        except Exception as exc:
            print(
                f"[EVAL ERROR] "
                f"{case.get('name', 'Unknown scenario')}: {exc}"
            )
            results.append({
                "name": case.get("name", "Unknown scenario"),
                "error": str(exc),
                "passed": False,
            })

    return results
