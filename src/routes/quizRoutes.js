// --- src/routes/quizRoutes.js ---

const express = require("express");
const router = express.Router();

// 1. Import your new controller
const {
  createQuiz,
  getAllQuizzes, 
  getQuizById,   
} = require("../controllers/quizController");


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
// @route   GET /api/quizzes
// @desc    Get all available quizzes
// @access  Private (All logged-in users)
router.get("/", verifyToken, getAllQuizzes); // <-- ADD THIS LINE

// @route   GET /api/quizzes/:id
// @desc    Get one quiz by its ID
// @access  Private (All logged-in users)
router.get("/:id", verifyToken, getQuizById); // <-- ADD THIS LINE

module.exports = router;