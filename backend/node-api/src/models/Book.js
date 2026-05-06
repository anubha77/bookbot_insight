import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    author: {
      type: String,
      trim: true,
      default: ""
    },
    content: {
      type: String,
      required: true
    },
    metadata: {
      type: Object,
      default: {}
    }
  },
  { timestamps: true }
);

export const Book = mongoose.model("Book", bookSchema);
