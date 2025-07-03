require("dotenv").config();

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const port = process.env.PORT || 3000;

// Enhanced CORS configuration
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Configure multer with better error handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed!"), false);
    }
  },
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res
      .status(400)
      .json({ error: "File upload error", details: err.message });
  } else if (err) {
    return res
      .status(500)
      .json({ error: "Server error", details: err.message });
  }
  next();
});

app.post("/upload", upload.single("audioFile"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  let audioFilePath;
  try {
    // Create a new path with .wav extension in the same directory
    const originalPath = path.resolve(req.file.path);
    const newDir = path.join(__dirname, "processed_audio");
    fs.mkdirSync(newDir, { recursive: true });

    // Create new filename with .wav extension
    const newFilename = `${path.parse(req.file.filename).name}.wav`;
    audioFilePath = path.join(newDir, newFilename);

    // Copy the file to ensure clean state
    fs.copyFileSync(originalPath, audioFilePath);

    // Delete original immediately
    fs.unlinkSync(originalPath);

    // Verify file exists
    await fs.promises.access(audioFilePath, fs.constants.R_OK);

    const pythonExecutable = process.env.PYTHON_EXEC_PATH || "python";
    const pythonScript = path.resolve(
      process.env.PYTHON_SCRIPT_PATH || "transcribe.py"
    );

    console.log(
      `Starting Python process with: ${pythonExecutable} ${pythonScript} "${audioFilePath}"`
    );

    // Use execFile for better Windows compatibility
    const pythonProcess = spawn(
      pythonExecutable,
      [pythonScript, audioFilePath],
      {
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
        windowsVerbatimArguments: true,
      }
    );

    let pythonOutput = "";
    let pythonError = "";

    pythonProcess.stdout.on("data", (data) => {
      pythonOutput += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      pythonError += data.toString();
      console.error(`Python STDERR: ${data.toString().trim()}`);
    });

    const cleanup = async () => {
      try {
        if (audioFilePath && fs.existsSync(audioFilePath)) {
          await fs.promises.unlink(audioFilePath);
          console.log(`Deleted temporary file: ${audioFilePath}`);
        }
      } catch (cleanupErr) {
        console.error("Cleanup error:", cleanupErr);
      }
    };

    pythonProcess.on("close", async (code) => {
      await cleanup();

      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        return res.status(500).json({
          error: "Transcription failed",
          details: pythonError.trim() || "Unknown Python error",
        });
      }

      try {
        // Try to extract last valid JSON block from pythonOutput
        let result;
        try {
          const lastBraceIndex = pythonOutput.lastIndexOf("{");
          const jsonPart = pythonOutput.slice(lastBraceIndex);
          result = JSON.parse(jsonPart);
        } catch (e) {
          console.error("JSON extraction failed:", e);
          return res.status(500).json({
            error: "Failed to extract JSON from Python output.",
            details: pythonOutput.trim(),
          });
        }

        if (result.transcription) {
          console.log("Transcription successful");
          return res.json({ transcription: result.transcription });
        } else {
          console.error("Invalid transcription result:", pythonOutput);
          return res.status(500).json({
            error: "Transcription failed",
            details: result.error || "No transcription returned",
          });
        }
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        return res.status(500).json({
          error: "Result parsing failed",
          details: pythonOutput.trim(),
        });
      }
    });

    pythonProcess.on("error", async (err) => {
      console.error("Python process error:", err);
      await cleanup();
      return res.status(500).json({
        error: "Python process failed to start",
        details: err.message,
      });
    });
  } catch (err) {
    console.error("Processing error:", err);
    try {
      if (audioFilePath && fs.existsSync(audioFilePath)) {
        await fs.promises.unlink(audioFilePath);
      }
    } catch (cleanupErr) {
      console.error("Cleanup error:", cleanupErr);
    }
    return res.status(500).json({
      error: "File processing failed",
      details: err.message,
    });
  }
});

app.get("/", (req, res) => {
  res.send("Whisper Transcription Backend is running");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Upload directory: ${path.resolve("uploads/")}`);
});
