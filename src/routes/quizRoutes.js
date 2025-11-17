// --- src/routes/quizRoutes.js ---

const express = require("express");
const router = express.Router();

// 1. Import your new controller
const { createQuiz } = require("../controllers/quizController");

// 2. Import your existing auth middleware
const verifyToken = require("../middleware/verifyToken");
const checkRole = require("../middleware/checkRole");

// @route   POST /api/quizzes
// @desc    Create a new quiz
// @access  Private (Teacher only)
router.post(
  "/",
  verifyToken,            // First, check if the user is logged in
  checkRole(["teacher"]),   // Next, check if their role is 'teacher'
  createQuiz              // If both pass, run the controller
);

// You can add more routes here later, e.g.:
// router.get("/", verifyToken, getAllQuizzes);
// router.get("/:id", verifyToken, getQuizById);

module.exports = router;