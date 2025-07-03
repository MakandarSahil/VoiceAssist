const { moveToProcessedDir, cleanupFile } = require("../services/file.service");
const { runPythonScript } = require("../services/python.service");

exports.handleUpload = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  let audioFilePath;
  try {
    audioFilePath = await moveToProcessedDir(req.file);
    const output = await runPythonScript(audioFilePath);
    await cleanupFile(audioFilePath);

    if (output.transcription) {
      return res.json({ transcription: output.transcription });
    } else {
      return res
        .status(500)
        .json({
          error: "Transcription failed",
          details: output.error || "Unknown error",
        });
    }
  } catch (err) {
    if (audioFilePath) await cleanupFile(audioFilePath);
    next(err);
  }
};
