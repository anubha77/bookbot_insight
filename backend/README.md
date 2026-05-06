# BookBot Backend (Node + Python + MongoDB)

This backend is split into two services:

- `node-api`: API gateway, MongoDB persistence, query logging
- `python-llm`: LLM answering service (OpenAI-compatible API optional)

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

## 4) Frontend integration note

Your current frontend posts to `/query` with only `{ query }`.
Update frontend next to send `{ bookId, query }` after selecting/loading a book.
