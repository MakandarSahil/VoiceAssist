const fs = require("fs");
const path = require("path");

exports.moveToProcessedDir = async (file) => {
  const originalPath = path.resolve(file.path);
  const processedDir = path.resolve("processed_audio");
  fs.mkdirSync(processedDir, { recursive: true });

  const newPath = path.join(
    processedDir,
    `${path.parse(file.filename).name}.wav`
  );
  fs.copyFileSync(originalPath, newPath);
  fs.unlinkSync(originalPath);

  await fs.promises.access(newPath, fs.constants.R_OK);
  return newPath;
};

exports.cleanupFile = async (filepath) => {
  try {
    if (fs.existsSync(filepath)) await fs.promises.unlink(filepath);
  } catch (err) {
    console.error("Cleanup failed:", err.message);
  }
};
