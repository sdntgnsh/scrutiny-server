// --- server.js ---
require("dotenv").config();
const express = require("express");
const cors = require("cors");

// --- Initialization ---
const app = express();
const PORT = process.env.PORT || 3001;

// --- THIS IS THE FIX ---
// We need to configure CORS to explicitly
// allow the 'Authorization' header.

const corsOptions = {
  origin: "*", // For development. Be more specific in production!
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allow standard methods
  allowedHeaders: "*", // <-- THIS IS THE KEY LINE
};

// 1. REMOVED the 'app.options('*', ...)' line.
// This 'app.use(cors(corsOptions))' is all we need.
// The cors middleware automatically handles preflight OPTIONS requests
// for all routes defined *after* this line.
app.use(cors(corsOptions));
// --- END OF FIX ---

// --- Middleware ---
// 2. Apply JSON body parser *after* CORS
app.use(express.json());

// --- API Routes ---
// Import both route files
const authRoutes = require("./src/routes/authRoutes");
// const quizRoutes = require("./src/routes/quizRoutes");

// Use both route files
app.use("/api/auth", authRoutes);
// app.use("/api/quiz", quizRoutes);

// --- Root Endpoint ---
app.get("/", (req, res) => {
  res.json({ status: "Quiz Backend API is running" });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
