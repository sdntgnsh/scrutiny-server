// --- src/routes/authRoutes.js ---
// This file defines the API routes for authentication.

const express = require("express");
const router = express.Router();

// Import controllers (merged into one line)
const { register, getMe } = require("../controllers/authController");

// --- FIX IS HERE ---
// Removed the { } because verifyToken is exported directly, not as an object.
const verifyToken = require("../middleware/verifyToken");

// @route   POST /api/auth/register
// @desc    Register a new user
router.post("/register", register);

// @route   GET /api/auth/me
// @desc    Test JWT and get current user's profile
router.get("/me", verifyToken, getMe);

module.exports = router;
