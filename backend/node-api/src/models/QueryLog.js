import mongoose from "mongoose";

const queryLogSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true
    },
    query: {
      type: String,
      required: true,
      trim: true
    },
    answer: {
      type: String,
      required: true
    },
    model: {
      type: String,
      default: "python-llm-service"
    }
  },
  { timestamps: true }
);

export const QueryLog = mongoose.model("QueryLog", queryLogSchema);
