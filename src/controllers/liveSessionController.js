// --- src/controllers/liveSessionController.js ---

const { db, admin } = require("../config/firebase");
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


/**
 * @description Join a live quiz session using a PIN
 * @route POST /api/sessions/join
 * @access Private (Students only)
 */
const joinSession = async (req, res) => {
  try {
    const { pin } = req.body;
    const studentId = req.user.id; // from verifyToken

    if (!pin) {
      return res.status(400).json({ error: "A 'pin' is required." });
    }

    // 1. Find the live session with this PIN
    const sessionsRef = db.collection("liveSessions");
    const snapshot = await sessionsRef
      .where("pin", "==", pin)
      .where("status", "==", "lobby") // Can only join sessions in the lobby
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "Invalid PIN or session is not active." });
    }

    // 2. Get the session document
    const sessionDoc = snapshot.docs[0];
    const sessionId = sessionDoc.id;
    const sessionData = sessionDoc.data();

    // 3. Check if student is already in the lobby
    if (sessionData.participants.includes(studentId)) {
      return res.status(400).json({ error: "You are already in this lobby." });
    }

    // 4. Add the student to the participants array
    const sessionRef = db.collection("liveSessions").doc(sessionId);
    await sessionRef.update({
      participants: admin.firestore.FieldValue.arrayUnion(studentId)
    });

    // 5. Send success response
    res.status(200).json({
      message: "Successfully joined the lobby!",
      sessionId: sessionId,
      quizId: sessionData.quizId,
      teacherId: sessionData.teacherId,
    });

  } catch (err) {
    console.error("Error joining session:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  startSession,
  joinSession, 
};