// --- src/routes/quizRoutes.js ---

const express = require("express");
const router = express.Router();

// 1. Import your new controller
const {
  createQuiz,
  getAllQuizzes, 
  getQuizById,  
  submitQuiz, 
  getQuizResults,
} = require("../controllers/quizController");
const { startSession } = require("../controllers/liveSessionController");

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

// @route   POST /api/quizzes/:id/submit
// @desc    Submit answers to a quiz
// @access  Private (Student only)
router.post(
  "/:id/submit",
  verifyToken,
  checkRole(["student"]), // <-- Note: "student" role is required
  submitQuiz
);


// @route   GET /api/quizzes
// @desc    Get all available quizzes
// @access  Private (All logged-in users)
router.get("/", verifyToken, getAllQuizzes); 

// @route   GET /api/quizzes/:id
// @desc    Get one quiz by its ID
// @access  Private (All logged-in users)
router.get(
  "/:id",
  verifyToken,
  checkRole(["teacher"]), 
);

// @route   GET /api/quizzes/:id/results
// @desc    Get all submissions for a quiz
// @access  Private (Teacher only)
router.get(
  "/:id/results",
  verifyToken,
  checkRole(["teacher"]), // <-- Note: "teacher" role is required
  getQuizResults
);

// @route   POST /api/quizzes/:id/start
// @desc    Start a new live session for a quiz
// @access  Private (Teacher only)
router.post(
  "/:id/start",
  verifyToken,
  checkRole(["teacher"]), 
  startSession
);

module.exports = router;