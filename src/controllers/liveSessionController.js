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
/**
 * @description (Student) Submit answers for a LIVE session
 * @route POST /api/sessions/:id/submit
 * @access Private (Students only)
 */
const submitLiveQuiz = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const studentId = req.user.id;
    const studentAnswers = req.body.answers; // e.g., [0, 2, 1]

    if (!studentAnswers || !Array.isArray(studentAnswers)) {
      return res.status(400).json({ error: "An 'answers' array is required." });
    }

    // 1. Get the session document
    const sessionRef = db.collection("liveSessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: "Session not found." });
    }
    const sessionData = sessionDoc.data();

    // 2. CHECK 1: Is the session active?
    if (sessionData.status !== "active") {
      return res.status(403).json({ error: "This quiz is not active or has already ended." });
    }

    // 3. CHECK 2: Is the time up?
    const endTime = new Date(sessionData.endTime).getTime();
    if (Date.now() > endTime) {
      // If time is up, set status to finished (self-healing)
      await sessionRef.update({ status: "finished" });
      return res.status(403).json({ error: "Time's up! Your submission was not accepted." });
    }

    // 4. CHECK 3: Is this student part of the session?
    if (!sessionData.participants.includes(studentId)) {
      return res.status(403).json({ error: "You are not a participant in this session." });
    }

    // 5. CHECK 4: Have they already submitted?
    const submissionQuery = await db.collection("submissions")
      .where("sessionId", "==", sessionId)
      .where("studentId", "==", studentId)
      .limit(1).get();

    if (!submissionQuery.empty) {
      return res.status(400).json({ error: "You have already submitted your answers for this quiz." });
    }

    // 6. ALL CHECKS PASSED - Let's grade it.
    const quizRef = db.collection("quizzes").doc(sessionData.quizId);
    const quizDoc = await quizRef.get();
    if (!quizDoc.exists) {
      return res.status(500).json({ error: "Quiz data not found." });
    }
    
    const correctAnswers = quizDoc.data().questions.map(q => q.correctAnswer);
    let score = 0;
    const totalQuestions = correctAnswers.length;

    if (studentAnswers.length !== totalQuestions) {
      return res.status(400).json({ error: `Submission failed: Expected ${totalQuestions} answers, but received ${studentAnswers.length}.` });
    }

    for (let i = 0; i < totalQuestions; i++) {
      if (studentAnswers[i] === correctAnswers[i]) {
        score++;
      }
    }

    // 7. Save the submission
    const submissionData = {
      sessionId: sessionId, // <-- Link to the LIVE session
      quizId: sessionData.quizId,
      studentId: studentId,
      submittedAnswers: studentAnswers,
      score: score,
      totalQuestions: totalQuestions,
      submittedAt: new Date().toISOString(),
    };

    await db.collection("submissions").add(submissionData);

    // 8. Send the result back to the student
    res.status(200).json({
      message: "Quiz submitted successfully!",
      score: score,
      totalQuestions: totalQuestions,
    });

  } catch (err) {
    console.error("Error submitting live quiz:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
/**
 * @description (Teacher) Get results and participant list for a session
 * @route GET /api/sessions/:id/results
 * @access Private (Teachers only)
 */
const getLiveSessionResults = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const teacherId = req.user.id;

    // 1. Get the session and verify teacher ownership
    const sessionDoc = await db.collection("liveSessions").doc(sessionId).get();
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: "Session not found." });
    }
    if (sessionDoc.data().teacherId !== teacherId) {
      return res.status(403).json({ error: "Forbidden: You do not own this session." });
    }

    const sessionData = sessionDoc.data();

    // 2. Get all submissions for this session
    const submissionsSnapshot = await db.collection("submissions")
      .where("sessionId", "==", sessionId).get();
    
    // Store submissions in a Map for fast lookup
    const submissions = new Map();
    submissionsSnapshot.forEach(doc => {
      submissions.set(doc.data().studentId, doc.data());
    });

    // 3. Get participant details (name, etc.)
    const participants = [];
    if (sessionData.participants.length > 0) {
      const usersSnapshot = await db.collection("users")
        .where(admin.firestore.FieldPath.documentId(), "in", sessionData.participants)
        .get();

      // 4. Combine participant data with submission data
      usersSnapshot.forEach(userDoc => {
        const studentId = userDoc.id;
        const studentData = userDoc.data();
        const submission = submissions.get(studentId);

        participants.push({
          studentId: studentId,
          name: studentData.name,
          mis: studentData.mis,
          status: submission ? "Submitted" : "Not Submitted",
          score: submission ? submission.score : 0,
          totalQuestions: submission ? submission.totalQuestions : sessionData.totalQuestions,
          submittedAt: submission ? submission.submittedAt : null,
        });
      });
    }

    res.status(200).json({
      sessionId: sessionId,
      status: sessionData.status,
      pin: sessionData.pin,
      participants: participants,
    });

  } catch (err) {
    console.error("Error getting session results:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
/**
 * @description (Student/Teacher) Polls for the current status of a session
 * @route GET /api/sessions/:id/status
 * @access Private (All participants)
 */
const getSessionStatus = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id; // from verifyToken

    // 1. Get the session
    const sessionDoc = await db.collection("liveSessions").doc(sessionId).get();
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: "Session not found." });
    }

    const sessionData = sessionDoc.data();

    // 2. Security Check: Only the teacher or a joined participant can poll
    if (sessionData.teacherId !== userId && !sessionData.participants.includes(userId)) {
      return res.status(403).json({ error: "You are not part of this session." });
    }

    // 3. Return only the necessary status info
    res.status(200).json({
      status: sessionData.status, // "lobby", "active", or "finished"
      endTime: sessionData.endTime || null, // Will be null during "lobby"
    });

  } catch (err) {
    console.error("Error getting session status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};



/**
 * @description (Student) Get the quiz questions for a live session
 * (This is the secure version that REMOVES answers)
 * @route GET /api/sessions/:id/quiz
 * @access Private (Students only)
 */
const getLiveQuizForStudent = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const studentId = req.user.id;

    // 1. Get the session and verify the student is in it
    const sessionDoc = await db.collection("liveSessions").doc(sessionId).get();
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: "Session not found." });
    }

    const sessionData = sessionDoc.data();

    // 2. CHECK 1: Is the quiz active?
    if (sessionData.status !== "active") {
      return res.status(403).json({ error: "This quiz is not active." });
    }

    // 3. CHECK 2: Is this student a participant?
    if (!sessionData.participants.includes(studentId)) {
      return res.status(403).json({ error: "You are not a participant in this session." });
    }

    // 4. All checks passed: Fetch the quiz
    const quizDoc = await db.collection("quizzes").doc(sessionData.quizId).get();
    if (!quizDoc.exists) {
      return res.status(500).json({ error: "Quiz data not found." });
    }

    const quizData = quizDoc.data();

    // 5. CRITICAL: Sanitize the questions (remove answers)
    const sanitizedQuestions = quizData.questions.map(q => ({
      questionText: q.questionText,
      options: q.options
      // We intentionally leave out 'correctAnswer'
    }));

    // 6. Send the safe, sanitized quiz to the student
    res.status(200).json({
      id: quizDoc.id,
      title: quizData.title,
      subject: quizData.subject,
      totalQuestions: quizData.totalQuestions,
      questions: sanitizedQuestions,
      // Send the session end time so the student's timer is in sync
      endTime: sessionData.endTime 
    });

  } catch (err) {
    console.error("Error getting live quiz for student:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  startSession,
  joinSession,
  activateSession,
  endSession,
  submitLiveQuiz,
  getLiveSessionResults,
  getSessionStatus,
  getLiveQuizForStudent // <-- Add this
};