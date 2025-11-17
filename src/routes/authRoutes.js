// --- src/routes/authRoutes.js ---
// This file defines the API routes for authentication.

const express = require("express");
const router = express.Router();
const { register } = require("../controllers/authController");

// @route   POST /api/auth/register
// @desc    Register a new user (teacher or student)
// @access  Public (or protected by an admin-only key if you prefer)
router.post("/register", register);

// Note: There is no '/login' route.
// Login is handled directly by the client (Electron app).

module.exports = router;
