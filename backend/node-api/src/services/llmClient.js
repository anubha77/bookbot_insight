import axios from "axios";

export async function askPythonLLM({ pythonLlmUrl, bookContent, query }) {
  const response = await axios.post(
    `${pythonLlmUrl}/answer`,
    {
      context: bookContent,
      query
    },
    { timeout: 20000 }
  );

  return response.data;
}
