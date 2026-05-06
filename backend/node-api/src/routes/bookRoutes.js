import express from "express";
import { Book } from "../models/Book.js";

export const bookRouter = express.Router();

bookRouter.post("/", async (req, res) => {
  try {
    const { title, author = "", content, metadata = {} } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "title and content are required." });
    }

    const book = await Book.create({ title, author, content, metadata });
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
