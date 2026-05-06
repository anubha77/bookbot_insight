import express from "express";
import { Book } from "../models/Book.js";
import { QueryLog } from "../models/QueryLog.js";
import { askPythonLLM } from "../services/llmClient.js";

export const queryRouter = express.Router();

queryRouter.post("/", async (req, res) => {
  try {
    const { bookId, query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "query is required." });
    }

    const book = bookId
      ? await Book.findById(bookId)
      : await Book.findOne().sort({ createdAt: -1 });

    if (!book) {
      return res.status(404).json({
        error: "Book not found. Create a book first using POST /books."
      });
    }

    const llmResponse = await askPythonLLM({
      pythonLlmUrl: process.env.PYTHON_LLM_URL,
      bookId: book._id,
      query
    });

    const answer = llmResponse?.answer || "No answer generated.";
    await QueryLog.create({
      bookId: book._id,
      query,
      answer,
      model: llmResponse?.model || "python-llm-service"
    });

    return res.json({
      answer,
      model: llmResponse?.model || "python-llm-service"
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to process query.",
      details: error?.message || "Unknown error"
    });
  }
});
