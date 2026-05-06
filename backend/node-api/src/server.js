import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectDB } from "./config/db.js";
import { bookRouter } from "./routes/bookRoutes.js";
import { queryRouter } from "./routes/queryRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*"
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "node-api" });
});

app.use("/books", bookRouter);
app.use("/query", queryRouter);

connectDB(process.env.MONGO_URI)
  .then(() => {
    app.listen(port, () => {
      console.log(`Node API running on http://127.0.0.1:${port}`);
    });
  })
  .catch((error) => {
    console.error("DB connection failed:", error.message);
    process.exit(1);
  });
