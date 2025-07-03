module.exports = (err, req, res, next) => {
  console.error("Error:", err.message);
  if (err.name === "MulterError") {
    return res
      .status(400)
      .json({ error: "File upload error", details: err.message });
  }
  return res.status(500).json({ error: "Server error", details: err.message });
};
