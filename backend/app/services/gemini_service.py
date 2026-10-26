
import json
import re
from groq import Groq
from google import genai
from google.genai import types
from app.core.config import settings


# Initialize Gemini client.
_api_key = settings.GEMINI_API_KEY or "AIzaSy_dummy_key_supportpilot"
client = genai.Client(api_key=_api_key)


def get_client() -> genai.Client:
    """Return the initialized Gemini client."""
    global client

    current_key = (
        settings.GEMINI_API_KEY
        or "AIzaSy_dummy_key_supportpilot"
    )

    if client is None:
        client = genai.Client(api_key=current_key)

    return client

def generate_text(prompt: str, system_prompt: str = "") -> str:
    """Try Gemini first, then fall back to Groq on provider errors."""

    full_prompt = (
        f"System: {system_prompt}\n\nUser: {prompt}"
        if system_prompt
        else prompt
    )

    try:
        c = get_client()
        response = c.models.generate_content(
            model="gemini-3.8-flash",
            contents=full_prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=2048,
                http_options=types.HttpOptions(timeout=15000),
            ),
        )

        if response.text:
            return response.text

        raise RuntimeError("Gemini returned an empty response.")

    except Exception as gemini_error:
        print(f"[AI FALLBACK] Gemini failed: {gemini_error}")

        if not settings.GROQ_API_KEY:
            raise RuntimeError(
                "Gemini failed and GROQ_API_KEY is not configured."
            ) from gemini_error

        try:
            groq_client = Groq(
                api_key=settings.GROQ_API_KEY,
                timeout=20.0,
                max_retries=0,
            )

            messages = []

            if system_prompt:
                messages.append({
                    "role": "system",
                    "content": system_prompt,
                })

            messages.append({
                "role": "user",
                "content": prompt,
            })

            groq_response = groq_client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=messages,
                temperature=0.3,
                max_tokens=2048,
            )

            answer = groq_response.choices[0].message.content

            if not answer:
                raise RuntimeError("Groq returned an empty response.")

            print("[AI FALLBACK] Groq response succeeded.")
            return answer

        except Exception as groq_error:
            print(f"[AI FALLBACK ERROR] Groq failed: {groq_error}")
            raise RuntimeError(
                "Both Gemini and Groq failed. Check provider status "
                "and API configuration."
            ) from groq_error  

def generate_embedding(text: str) -> list[float]:
    """Generate embeddings using Gemini."""
    c = get_client()

    result = c.models.embed_content(
        model=settings.EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            output_dimensionality=768,
        ),
    )

    return result.embeddings[0].values


def classify_ticket(title: str, description: str) -> dict:
    """Classify a support ticket and validate the returned JSON."""

    prompt = f"""You are a support ticket classifier.
Analyze this ticket and return ONLY valid JSON.

Ticket Title: {title}
Ticket Description: {description}

Return JSON with this exact structure:
{{
    "category": "one of: billing/technical/account/feature_request/bug/general",
    "urgency": "one of: low/medium/high/critical",
    "confidence": 0.0-1.0,
    "escalate": true/false,
    "reasoning": "brief explanation"
}}"""

    raw = generate_text(prompt)
    clean_raw = raw.strip()

    if clean_raw.startswith("```json"):
        clean_raw = clean_raw[7:]
    elif clean_raw.startswith("```"):
        clean_raw = clean_raw[3:]

    if clean_raw.endswith("```"):
        clean_raw = clean_raw[:-3]

    clean_raw = clean_raw.strip()

    match = re.search(r"\{.*\}", clean_raw, re.DOTALL)

    if not match:
        raise ValueError("No JSON in response")

    data = json.loads(match.group())

    required = [
        "category",
        "urgency",
        "confidence",
        "escalate",
        "reasoning",
    ]

    for field in required:
        if field not in data:
            raise ValueError(f"Missing field: {field}")

    valid_categories = {
        "billing",
        "technical",
        "account",
        "feature_request",
        "bug",
        "general",
    }

    valid_urgencies = {"low", "medium", "high", "critical"}

    if data["category"] not in valid_categories:
        data["category"] = "general"

    if data["urgency"] not in valid_urgencies:
        data["urgency"] = "medium"

    data["confidence"] = max(
        0.0,
        min(1.0, float(data["confidence"])),
    )

    data["escalate"] = bool(data["escalate"])

    return data


def remove_source_markers(text: str) -> str:
    """Remove source citation labels from generated answer text."""

    text = re.sub(
        r"\[Source\s+\d+(?:\s*,\s*Source\s+\d+)*\]",
        "",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(r"[ \t]+([.,;:!?])", r"\1", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n[ \t]*\n(?:[ \t]*\n)+", "\n\n", text)

    return text.strip()


def generate_draft(
    ticket_title: str,
    ticket_description: str,
    context_chunks: list[dict],
    agent_name: str = "Support Agent",
) -> dict:
    """Generate a professional customer-facing support draft."""

    if not context_chunks:
        return {
            "content": (
                "I was unable to find sufficient information in the "
                "knowledge base to provide a reliable answer. "
                "I recommend escalating this ticket to a support expert."
            ),
            "requires_escalation": True,
            "confidence": "low",
            "sources_used": [],
        }

    context_text = "\n\n".join(
        [
            (
                f"[Source {i + 1}] "
                f"(similarity: {c.get('similarity_score', 0):.2f}):\n"
                f"{c['content']}"
            )
            for i, c in enumerate(context_chunks)
        ]
    )

    system = """You are a helpful support agent assistant.
Generate a professional customer-facing support reply.

Rules:
- Use only information from the provided knowledge base sources.
- Do not include source labels, citations, or internal notes.
- If the context is insufficient, clearly state the limitation and
  recommend escalation.
- Never invent unsupported information.
- Start with a greeting and end professionally.
- Never promise a refund unless the sources support it.
- Never claim an action has happened unless verified.
- Never request passwords, OTPs, recovery codes, full card numbers,
  or CVV."""

    prompt = f"""Ticket: {ticket_title}

Customer Issue: {ticket_description}

Knowledge Base Sources:
{context_text}

Generate a professional support reply using the provided sources.
Do not include source labels or citations."""

    content = generate_text(prompt, system)
    content = remove_source_markers(content)

    avg_sim = (
        sum(c.get("similarity_score", 0) for c in context_chunks)
        / len(context_chunks)
    )

    requires_escalation = avg_sim < 0.75 or len(context_chunks) < 2

    confidence = (
        "high" if avg_sim >= 0.85
        else "medium" if avg_sim >= 0.75
        else "low"
    )

    return {
        "content": content,
        "requires_escalation": requires_escalation,
        "confidence": confidence,
        "sources_used": [c.get("id") for c in context_chunks],
    }


def answer_copilot(
    question: str,
    context_chunks: list[dict],
) -> dict:
    """Answer support questions using retrieved knowledge base context."""

    if not context_chunks:
        return {
            "answer": (
                "I could not find relevant information in the knowledge "
                "base to answer this question reliably. Please consider "
                "escalating to a human expert or checking approved "
                "support documentation."
            ),
            "evaluation_answer": "",
            "requires_escalation": True,
            "confidence": "insufficient_evidence",
        }

    context_text = "\n\n".join(
        [
            f"[Source {i + 1}] {c['content']}"
            for i, c in enumerate(context_chunks)
        ]
    )

    
    system = """You are SupportPilot AI Copilot.
    Answer support questions using ONLY the provided knowledge base sources.

Rules:
- Answer the specific question directly.
- Turn relevant instructions into actionable steps.
- Do not refuse when the sources support a useful answer.
- State limitations instead of inventing missing details.
- Never fabricate API endpoints, credentials, policies, or timelines.
- Distinguish verified facts from suggested next steps.
- Cite factual claims using the exact format [Source 1], [Source 2], etc.
- Use only source numbers that exist in the provided knowledge base.
- Put citations next to the factual claims they support.
- If the knowledge base does not contain the answer, clearly say there is insufficient information.
- Give clear, concise, actionable guidance for the support agent."""


    prompt = (
    f"Question: {question}\n\n"
    f"Knowledge Base:\n{context_text}\n\n"
    "Answer using only the knowledge base. "
    "Include citations for factual claims using the exact format [Source 1], "
    "[Source 2], matching the numbered knowledge-base chunks. "
    "Do not invent source numbers. If the knowledge base does not contain "
    "the answer, clearly say that there is insufficient information."
)

    answer = generate_text(prompt, system)
    evaluation_answer = answer

    answer = remove_source_markers(answer)

    # Remove Markdown bold and italic formatting.
    answer = re.sub(r"\bsvgCopy\b|\bsvg\b", "", answer, flags=re.IGNORECASE)
    answer = re.sub(r"\*\*(.*?)\*\*", r"\1", answer, flags=re.DOTALL)
    answer = re.sub(
        r"(?<!\*)\*(?!\s)(.*?)(?<!\s)\*(?!\*)",
        r"\1",
        answer,
        flags=re.DOTALL,
    )

    best_sim = max(
        c.get("similarity_score", 0)
        for c in context_chunks
    )

    requires_escalation = best_sim < 0.65

    confidence = (
        "high" if best_sim >= 0.85
        else "medium" if best_sim >= 0.75
        else "low"
    )

    return {
        "answer": answer,
        "evaluation_answer": evaluation_answer,
        "requires_escalation": requires_escalation,
        "confidence": confidence,
    }
