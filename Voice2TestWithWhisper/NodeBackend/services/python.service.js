const { spawn } = require("child_process");
const path = require("path");

exports.runPythonScript = (audioFilePath) => {
  const pythonExecutable = process.env.PYTHON_EXEC_PATH || "python";
  const scriptPath = path.resolve(
    process.env.PYTHON_SCRIPT_PATH || "transcribe.py"
  );

  return new Promise((resolve, reject) => {
    const process = spawn(pythonExecutable, [scriptPath, audioFilePath], {
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      windowsVerbatimArguments: true,
    });

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => (stdout += data.toString()));
    process.stderr.on("data", (data) => (stderr += data.toString()));

    process.on("close", (code) => {
      if (code !== 0)
        return reject(new Error(stderr || "Python process failed"));

      try {
        const lastBrace = stdout.lastIndexOf("{");
        const result = JSON.parse(stdout.slice(lastBrace));
        resolve(result);
      } catch (e) {
        reject(new Error("Invalid JSON from Python: " + stdout));
      }
    });

    process.on("error", reject);
  });
};
