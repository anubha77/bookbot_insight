import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import requests

load_dotenv()

app = Flask(__name__)
CORS(app)


def local_fallback_answer(context: str, query: str) -> str:
    context_lines = [line.strip() for line in context.splitlines() if line.strip()]
    if not context_lines:
        return "No context was provided for this book."

    query_terms = {term.lower() for term in query.split() if len(term) > 2}
    scored = []
    for line in context_lines[:400]:
        score = sum(1 for term in query_terms if term in line.lower())
        if score > 0:
            scored.append((score, line))

    if not scored:
        return "I could not find a precise answer in the provided book context."

    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[0][1]


def generate_answer(context: str, query: str):
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    if not api_key:
        return {
            "answer": local_fallback_answer(context, query),
            "model": "local-fallback"
        }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "Answer only from provided book context. If answer is not present, say so clearly."
            },
            {
                "role": "user",
                "content": f"Book Context:\n{context}\n\nQuestion:\n{query}"
            }
        ],
        "temperature": 0.2
    }

    response = requests.post(
        f"{base_url}/chat/completions",
        headers=headers,
        json=payload,
        timeout=30
    )
    response.raise_for_status()
    body = response.json()
    answer = body["choices"][0]["message"]["content"].strip()
    return {"answer": answer, "model": model}


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "python-llm"})


@app.post("/answer")
def answer():
    data = request.get_json(silent=True) or {}
    context = (data.get("context") or "").strip()
    query = (data.get("query") or "").strip()

    if not context or not query:
        return jsonify({"error": "context and query are required."}), 400

    try:
        result = generate_answer(context, query)
        return jsonify(result)
    except Exception as error:
        return jsonify({"error": "LLM generation failed.", "details": str(error)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    app.run(host="0.0.0.0", port=port, debug=True)
