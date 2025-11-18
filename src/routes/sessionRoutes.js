// --- src/routes/sessionRoutes.js ---

const express = require("express");
const router = express.Router();
const { 
  joinSession, 
  activateSession,
  endSession,
  submitLiveQuiz,
  getSessionStatus,
  getLiveSessionResults // <-- Add this
} = require("../controllers/liveSessionController");


const verifyToken = require("../middleware/verifyToken");
const checkRole = require("../middleware/checkRole");
// @route   POST /api/sessions/join
// @desc    Join a live session with a PIN
// @access  Private (Student only)
router.post(
  "/join",
  verifyToken,
  checkRole(["student"]), // <-- Only students can join
  joinSession
);


// @route   POST /api/sessions/:id/start
// @desc    (Teacher) Starts the quiz, locks the lobby
// @access  Private (Teacher only)
router.post(
  "/:id/start", // <-- :id is the SESSION ID
  verifyToken,
  checkRole(["teacher"]),
  activateSession
);

// @route   POST /api/sessions/:id/end
// @desc    (Teacher) Manually ends the quiz
// @access  Private (Teacher only)
router.post(
  "/:id/end", // <-- :id is the SESSION ID
  verifyToken,
  checkRole(["teacher"]),
  endSession
);

// @route   POST /api/sessions/:id/submit
// @desc    (Student) Submit answers for a live quiz
// @access  Private (Student only)
router.post(
  "/:id/submit",
  verifyToken,
  checkRole(["student"]),
  submitLiveQuiz
);

// @route   GET /api/sessions/:id/results
// @desc    (Teacher) Get final results for a live quiz
// @access  Private (Teacher only)
router.get(
  "/:id/results",
  verifyToken,
  checkRole(["teacher"]),
  getLiveSessionResults
);


// @route   GET /api/sessions/:id/status
// @desc    (Student) Polls the session to check if it's "active"
// @access  Private (Student only)
router.get(
  "/:id/status",
  verifyToken,
  // We don't need checkRole here, the controller handles the logic
  getSessionStatus
);


module.exports = router;