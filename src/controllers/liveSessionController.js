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
    const teacherId = req.user.id;
    
    // --- 1. GET DURATION FROM REQUEST BODY ---
    const { duration } = req.body; // e.g., 30 (for 30 minutes)

    if (!duration || typeof duration !== 'number' || duration <= 0) {
      return res.status(400).json({ error: "A valid 'duration' (in minutes) is required." });
    }
    // ---

    // 2. Verify the quiz exists and this teacher owns it
    // ... (rest of your existing validation) ...
    const quizRef = db.collection("quizzes").doc(quizId);
    const quizDoc = await quizRef.get();
    if (!quizDoc.exists) {
      return res.status(404).json({ error: "Quiz not found" });
    }
    if (quizDoc.data().creatorId !== teacherId) {
      return res.status(403).json({ error: "Forbidden: You can only start a session for your own quiz." });
    }

    // 3. Generate a unique PIN
    const pin = generatePin();

    // 4. Create the new live session object
    const newSession = {
      quizId: quizId,
      teacherId: teacherId,
      pin: pin,
      status: "lobby",
      participants: [],
      createdAt: new Date().toISOString(),
      
      // --- 2. ADD DURATION TO THE DOCUMENT ---
      durationInMinutes: duration 
    };

    // 5. Save the new session
    const sessionRef = await db.collection("liveSessions").add(newSession);

    // 6. Send back the PIN and new session ID
    res.status(201).json({
      message: "Live session started. Waiting for students to join.",
      sessionId: sessionRef.id,
      pin: pin,
      duration: duration,
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
};/**
 * @description (Teacher) Activates a session, changing status from 'lobby' to 'active'
 * @route POST /api/sessions/:id/start
 * @access Private (Teachers only)
 */
const activateSession = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const teacherId = req.user.id; // from verifyToken

    // 1. Get the session document
    const sessionRef = db.collection("liveSessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: "Session not found." });
    }

    const sessionData = sessionDoc.data();

    // 2. Verify the teacher owns this session
    if (sessionData.teacherId !== teacherId) {
      return res.status(403).json({ error: "Forbidden: You do not own this session." });
    }

    // 3. Check if the session is actually in the lobby
    if (sessionData.status !== "lobby") {
      return res.status(400).json({ error: `Session is already ${sessionData.status}, cannot start.` });
    }

    // --- 4. START: NEW TIMER LOGIC ---
    const duration = sessionData.durationInMinutes;
    if (!duration) {
      return res.status(500).json({ error: "Session is missing duration. Cannot start." });
    }

    // Calculate the end time in milliseconds
    const startTime = Date.now();
    const endTime = startTime + (duration * 60 * 1000); 
    // --- END: NEW TIMER LOGIC ---


    // 5. Update the session status to "active"
    await sessionRef.update({
      status: "active",
      // currentQuestion: 1, // We don't need this for your new logic
      
      // --- ADD THESE TWO FIELDS ---
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString()
    });

    // 6. Send success response
    res.status(200).json({
      message: "Quiz session is now active!",
      sessionId: sessionId,
      status: "active",
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    });

  } catch (err) {
    console.error("Error activating session:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
/**
 * @description (Teacher) Manually ends a session
 * @route POST /api/sessions/:id/end
 * @access Private (Teachers only)
 */
const endSession = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const teacherId = req.user.id; // from verifyToken

    // 1. Get the session document
    const sessionRef = db.collection("liveSessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: "Session not found." });
    }

    const sessionData = sessionDoc.data();

    // 2. Verify the teacher owns this session
    if (sessionData.teacherId !== teacherId) {
      return res.status(403).json({ error: "Forbidden: You do not own this session." });
    }

    // 3. Check if session is already finished
    if (sessionData.status === "finished") {
      return res.status(400).json({ error: "This session is already finished." });
    }

    // 4. Update the session status to "finished"
    await sessionRef.update({
      status: "finished"
    });

    // 5. Send success response
    res.status(200).json({
      message: "Quiz session has been manually ended.",
      sessionId: sessionId,
      status: "finished",
    });

  } catch (err) {
    console.error("Error ending session:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  startSession,
  joinSession,
  activateSession,
  endSession, // <-- Add this
};