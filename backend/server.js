const express = require("express");
const cors = require("cors");
const path = require("path");
const apiRoutes = require("./routes/api");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// API Routes FIRST
app.use("/api", apiRoutes);

// Static files
app.use(express.static(path.join(__dirname, "public")));

app.get(/(.*)/, (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res
    .status(500)
    .json({ error: "Internal Server Error", details: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
