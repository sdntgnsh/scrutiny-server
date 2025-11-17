// --- src/controllers/liveSessionController.js ---

const db = require("../config/firebase");
const { generatePin } = require("../utils/generatePin");

/**
 * @description Start a new live quiz session
 * @route POST /api/quizzes/:id/start
 * @access Private (Teachers only)
 */
const startSession = async (req, res) => {
  try {
    const quizId = req.params.id;
    const teacherId = req.user.id; // from verifyToken

    // 1. Verify the quiz exists and this teacher owns it
    const quizRef = db.collection("quizzes").doc(quizId);
    const quizDoc = await quizRef.get();

    if (!quizDoc.exists) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    if (quizDoc.data().creatorId !== teacherId) {
      return res.status(403).json({ 
        error: "Forbidden: You can only start a session for your own quiz." 
      });
    }

    // 2. Generate a unique PIN
    // (In a production app, you'd check for collisions, but this is fine for now)
    const pin = generatePin();

    // 3. Create the new live session object
    const newSession = {
      quizId: quizId,
      teacherId: teacherId,
      pin: pin,
      status: "lobby", // 'lobby', 'active', 'finished'
      currentQuestion: 0,
      participants: [], // We can store student IDs here as they join
      createdAt: new Date().toISOString(),
    };

    // 4. Save the new session to the 'liveSessions' collection
    const sessionRef = await db.collection("liveSessions").add(newSession);

    // 5. Send back the PIN and new session ID
    res.status(201).json({
      message: "Live session started. Waiting for students to join.",
      sessionId: sessionRef.id,
      pin: pin,
    });

  } catch (err) {
    console.error("Error starting live session:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  startSession,
};