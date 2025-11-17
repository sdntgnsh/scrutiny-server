// --- src/routes/sessionRoutes.js ---

const express = require("express");
const router = express.Router();

const { 
  joinSession, 
  activateSession,
  endSession
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

module.exports = router;