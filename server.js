// --- server.js ---
// This is the main entry point for your Node.js backend.

require("dotenv").config(); // Loads environment variables from .env file
const express = require("express");
const cors = require("cors");

// --- Initialization ---
const app = express();
const PORT = process.env.PORT || 3001; // Use 3001 to avoid conflicts

// --- Database Connections ---
// We don't need to import 'db' or 'supabaseAdmin' here
// because they are already imported and used by the
// controllers and middleware that our routes call.
// This keeps the server.js file clean.

// --- Middleware ---
app.use(cors()); // Allows requests from different origins
app.use(express.json()); // This is CRITICAL. It parses incoming JSON payloads (like from Postman)
// Without this, 'req.body' will be 'undefined'.

// --- API Routes ---
// Import your route files
const authRoutes = require("./src/routes/authRoutes");
const quizRoutes = require("./src/routes/quizRoutes");


// Tell Express to use your routes.
// All routes in 'authRoutes' will be prefixed with '/api/auth'
app.use("/api/auth", authRoutes);
app.use("/api/quizzes", quizRoutes);

// All routes in 'quizRoutes' will be prefixed with '/api/quiz'
// app.use("/api/quiz", quizRoutes);

// --- Root Endpoint ---
// A simple health check to make sure the server is running
app.get("/", (req, res) => {
  res.json({ status: "Quiz Backend API is running" });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
