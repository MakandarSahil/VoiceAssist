require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const uploadRoute = require("./routes/upload.route");
const errorHandler = require("./middlewares/error.middleware");

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

app.use("/upload", uploadRoute);
app.get("/", (_, res) => res.send("Whisper Transcription Backend is running"));

app.use(errorHandler);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Upload directory: ${path.resolve("uploads/")}`);
});
