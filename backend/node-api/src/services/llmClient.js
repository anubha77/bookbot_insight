import axios from "axios";

export async function ingestBookToPythonLLM({ pythonLlmUrl, bookId, title, content }) {
  const response = await axios.post(
    `${pythonLlmUrl}/ingest`,
    {
      book_id: String(bookId),
      title,
      content
    },
    { timeout: 30000 }
  );

  return response.data;
}

export async function askPythonLLM({ pythonLlmUrl, bookId, query }) {
  const response = await axios.post(
    `${pythonLlmUrl}/answer`,
    {
      book_id: String(bookId),
      query
    },
    { timeout: 20000 }
  );

  return response.data;
}
