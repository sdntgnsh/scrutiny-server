// --- server.js ---
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

// --- TRUST NGROK PROXY ---
app.set("trust proxy", 1);

// --- CORS CONFIG FOR NGROK + VITE ---
const corsOptions = {
  origin: [
    "http://localhost:5173",       // Vite dev server
    /\.ngrok-free\.app$/,          // Any ngrok-free domain
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: "*",
  credentials: true,
};

// Apply CORS middleware
app.use(cors(corsOptions));

// --- JSON Body Parser ---
app.use(express.json());

// --- API Routes ---
const authRoutes = require("./src/routes/authRoutes");
const quizRoutes = require("./src/routes/quizRoutes");
const sessionRoutes = require("./src/routes/sessionRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/sessions", sessionRoutes);

// --- ROOT ENDPOINT ---
app.get("/", (req, res) => {
  res.json({ status: "Quiz Backend API is running" });
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});
