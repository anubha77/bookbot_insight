# BookBot Backend (Node + Python + MongoDB)

This backend is split into two services:

- `node-api`: API gateway, MongoDB persistence, query logging
- `python-llm`: LangChain retrieval service (embeddings + vector DB + LLM answering)

## 1) Run MongoDB

Use a local MongoDB instance or MongoDB Atlas.

## 2) Setup Node API

```bash
cd backend/node-api
npm install
copy .env.example .env
npm run dev
```

Node API endpoints:

- `GET /health`
- `POST /books` -> create a book
- `POST /books/upload` -> upload `.pdf/.txt/.md` and create a book
- `GET /books` -> list books
- `POST /query` -> answer question for a book

`POST /query` request body:

```json
{
  "bookId": "PUT_BOOK_ID_HERE",
  "query": "What is the main theme of chapter 1?"
}
```

## 3) Setup Python LLM Service

```bash
cd backend/python-llm
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python app.py
```

If `OPENAI_API_KEY` is empty, service uses a local fallback matcher.

## LangChain Concepts Applied

- **Embedding model**: Converts text chunks and questions to vectors (`all-MiniLM-L6-v2` by default).
- **Vector database**: Chroma stores chunk vectors locally for semantic retrieval.
- **Retrieval flow**:
  1. Node creates/uploads a book.
  2. Node calls Python `/ingest` to chunk + embed + index by `book_id`.
  3. Query calls `/answer` with `book_id` and query.
  4. Python retrieves top relevant chunks and answers from that context.

## 4) Frontend integration note

Your current frontend posts to `/query` with only `{ query }`.
Update frontend next to send `{ bookId, query }` after selecting/loading a book.
