import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_openai import ChatOpenAI

load_dotenv()

app = Flask(__name__)
CORS(app)

VECTOR_DB_DIR = os.getenv("VECTOR_DB_DIR", "./vectorstore")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=900,
    chunk_overlap=150,
    separators=["\n\n", "\n", ". ", " ", ""]
)


def get_vectorstore():
    os.makedirs(VECTOR_DB_DIR, exist_ok=True)
    return Chroma(
        collection_name="bookbot_books",
        embedding_function=embeddings,
        persist_directory=VECTOR_DB_DIR
    )


def local_fallback_answer(chunks, query: str) -> str:
    if not chunks:
        return "No indexed context was found for this book."

    query_terms = {term.lower() for term in query.split() if len(term) > 2}
    scored = []
    for chunk in chunks:
        text = chunk.page_content.strip()
        score = sum(1 for term in query_terms if term in text.lower())
        if score > 0:
            scored.append((score, text))

    if not scored:
        return "I could not find a precise answer in indexed sections for this book."

    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[0][1]


def ingest_book(book_id: str, title: str, content: str):
    chunks = text_splitter.split_text(content)
    if not chunks:
        raise ValueError("No text chunks generated from content.")

    ids = [f"{book_id}:{index}" for index in range(len(chunks))]
    metadatas = [{"book_id": book_id, "title": title} for _ in chunks]

    vectorstore = get_vectorstore()
    existing = vectorstore.get(where={"book_id": book_id})
    existing_ids = existing.get("ids", []) if existing else []
    if existing_ids:
        vectorstore.delete(ids=existing_ids)

    vectorstore.add_texts(chunks, metadatas=metadatas, ids=ids)
    return len(chunks)


def generate_answer(book_id: str, query: str):
    vectorstore = get_vectorstore()
    docs = vectorstore.similarity_search(query, k=4, filter={"book_id": book_id})
    if not docs:
        return {
            "answer": "I could not find indexed content for this book. Try uploading it again.",
            "model": "retrieval-empty"
        }

    context = "\n\n".join([doc.page_content for doc in docs])
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")

    if not api_key:
        return {
            "answer": local_fallback_answer(docs, query),
            "model": "local-retrieval-fallback"
        }

    llm = ChatOpenAI(
        model=OPENAI_MODEL,
        api_key=api_key,
        base_url=base_url,
        temperature=0.2
    )
    prompt = (
        "You are a precise book assistant. "
        "Answer only using the provided retrieved context. "
        "If the answer is not present, say: 'The answer is not present in the indexed book context.'\n\n"
        f"Retrieved Context:\n{context}\n\n"
        f"Question:\n{query}"
    )
    response = llm.invoke(prompt)
    answer = response.content.strip() if hasattr(response, "content") else str(response)
    return {"answer": answer, "model": OPENAI_MODEL}


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "python-llm"})


@app.post("/ingest")
def ingest():
    data = request.get_json(silent=True) or {}
    book_id = (data.get("book_id") or "").strip()
    title = (data.get("title") or "Untitled Book").strip()
    content = (data.get("content") or "").strip()

    if not book_id or not content:
        return jsonify({"error": "book_id and content are required."}), 400

    try:
        chunk_count = ingest_book(book_id, title, content)
        return jsonify({"ok": True, "book_id": book_id, "chunks": chunk_count})
    except Exception as error:
        return jsonify({"error": "Ingest failed.", "details": str(error)}), 500


@app.post("/answer")
def answer():
    data = request.get_json(silent=True) or {}
    book_id = (data.get("book_id") or "").strip()
    query = (data.get("query") or "").strip()

    if not book_id or not query:
        return jsonify({"error": "book_id and query are required."}), 400

    try:
        result = generate_answer(book_id, query)
        return jsonify(result)
    except Exception as error:
        return jsonify({"error": "LLM generation failed.", "details": str(error)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    app.run(host="0.0.0.0", port=port, debug=True)
