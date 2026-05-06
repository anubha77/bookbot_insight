import express from "express";
import multer from "multer";
import pdf from "pdf-parse";
import { Book } from "../models/Book.js";
import { ingestBookToPythonLLM } from "../services/llmClient.js";

export const bookRouter = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

async function tryIngestBook(book) {
  try {
    await ingestBookToPythonLLM({
      pythonLlmUrl: process.env.PYTHON_LLM_URL,
      bookId: book._id,
      title: book.title,
      content: book.content
    });
  } catch (error) {
    console.warn("Vector ingest skipped:", error?.message || "Unknown error");
  }
}

bookRouter.post("/", async (req, res) => {
  try {
    const { title, author = "", content, metadata = {} } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "title and content are required." });
    }

    const book = await Book.create({ title, author, content, metadata });
    await tryIngestBook(book);
    return res.status(201).json(book);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create book." });
  }
});

bookRouter.get("/", async (_req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    return res.json(books);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch books." });
  }
});

bookRouter.post("/upload", upload.single("bookFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "bookFile is required." });
    }

    const incomingTitle = (req.body?.title || "").trim();
    const author = (req.body?.author || "").trim();
    const originalName = req.file.originalname || "Uploaded Book";
    const fileMime = req.file.mimetype || "";

    let extractedContent = "";
    if (fileMime === "application/pdf" || originalName.toLowerCase().endsWith(".pdf")) {
      const parsed = await pdf(req.file.buffer);
      extractedContent = (parsed?.text || "").trim();
    } else {
      extractedContent = req.file.buffer.toString("utf-8").trim();
    }

    if (!extractedContent) {
      return res.status(400).json({ error: "Could not extract readable content from file." });
    }

    const title = incomingTitle || originalName.replace(/\.[^/.]+$/, "");
    const book = await Book.create({
      title,
      author,
      content: extractedContent,
      metadata: {
        sourceType: "upload",
        originalName,
        mimeType: fileMime,
        size: req.file.size
      }
    });
    await tryIngestBook(book);

    return res.status(201).json(book);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to upload and process file.",
      details: error?.message || "Unknown error"
    });
  }
});
