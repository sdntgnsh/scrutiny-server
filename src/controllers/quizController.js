// --- src/controllers/quizController.js ---

const db = require("../config/firebase");

/**
 * @description Create a new quiz
 * @route POST /api/quizzes
 * @access Private (Teachers only)
 */
const createQuiz = async (req, res) => {
  try {
    // 1. Get quiz data from the request body
    const { title, subject, questions } = req.body;

    // 2. Get the teacher's ID from the token (attached by verifyToken)
    const teacherId = req.user.id;

    // 3. Basic Validation
    if (!title || !subject || !questions || !Array.isArray(questions)) {
      return res.status(400).json({
        error: "Title, subject, and a 'questions' array are required.",
      });
    }
    if (questions.length === 0) {
      return res.status(400).json({ error: "A quiz must have at least one question." });
    }

    // 4. Build the new quiz object
    const newQuiz = {
      title: title,
      subject: subject,
      creatorId: teacherId, // Link the quiz to the teacher who made it
      createdAt: new Date().toISOString(),
      questions: questions, // This will be an array of question objects
      totalQuestions: questions.length,
    };

    // 5. Save the quiz to the 'quizzes' collection in Firestore
    const quizRef = await db.collection("quizzes").add(newQuiz);

    // 6. Send success response
    res.status(201).json({
      message: "Quiz created successfully",
      quizId: quizRef.id,
      data: newQuiz,
    });
  } catch (err) {
    console.error("Error creating quiz:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
/**
 * @description Get all quizzes (metadata only)
 * @route GET /api/quizzes
 * @access Private (All logged-in users)
 */
const getAllQuizzes = async (req, res) => {
  try {
    const quizzesRef = db.collection("quizzes");
    const snapshot = await quizzesRef.get();

    if (snapshot.empty) {
      return res.status(200).json([]); // Return empty array if no quizzes
    }

    // Map over the documents to create an array of quizzes
    // We only send back basic info, not the full questions array
    const quizzes = snapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title,
      subject: doc.data().subject,
      totalQuestions: doc.data().totalQuestions,
      creatorId: doc.data().creatorId,
    }));

    res.status(200).json(quizzes);
  } catch (err) {
    console.error("Error getting all quizzes:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * @description Get a single quiz by its ID
 * @route GET /api/quizzes/:id
 * @access Private (All logged-in users)
 */
const getQuizById = async (req, res) => {
  try {
    const quizId = req.params.id;
    const quizRef = db.collection("quizzes").doc(quizId);
    const doc = await quizRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Return the full quiz data, including the questions
    res.status(200).json({
      id: doc.id,
      ...doc.data(),
    });
  } catch (err) {
    console.error("Error getting quiz by ID:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
/**
 * @description Submit answers for a quiz
 * @route POST /api/quizzes/:id/submit
 * @access Private (Students only)
 */
const submitQuiz = async (req, res) => {
  try {
    // 1. Get data from the request
    const quizId = req.params.id;
    const studentId = req.user.id; // from verifyToken middleware
    const studentAnswers = req.body.answers; // Expecting an array of answers, e.g., [0, 2, 1]

    // 2. Validation
    if (!studentAnswers || !Array.isArray(studentAnswers)) {
      return res.status(400).json({ error: "An 'answers' array is required." });
    }

    // 3. Fetch the quiz from Firestore to get the correct answers
    const quizRef = db.collection("quizzes").doc(quizId);
    const doc = await quizRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // 4. Extract the correct answers from the quiz questions
    const correctAnswers = doc.data().questions.map(q => q.correctAnswer);

    // 5. Compare and calculate the score
    let score = 0;
    const totalQuestions = correctAnswers.length;

    // Check if the student provided the right number of answers
    if (studentAnswers.length !== totalQuestions) {
      return res.status(400).json({ 
        error: `Submission failed: Expected ${totalQuestions} answers, but received ${studentAnswers.length}.` 
      });
    }

    for (let i = 0; i < totalQuestions; i++) {
      if (studentAnswers[i] === correctAnswers[i]) {
        score++;
      }
    }

    // 6. Build the submission object
    const submissionData = {
      quizId: quizId,
      studentId: studentId,
      submittedAnswers: studentAnswers,
      correctAnswers: correctAnswers,
      score: score,
      totalQuestions: totalQuestions,
      submittedAt: new Date().toISOString(),
    };

    // 7. Save the submission to a new 'submissions' collection
    await db.collection("submissions").add(submissionData);

    // 8. Send the result back to the student
    res.status(200).json({
      message: "Quiz submitted successfully!",
      score: score,
      totalQuestions: totalQuestions,
    });

  } catch (err) {
    console.error("Error submitting quiz:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
/**
 * @description Get all submissions for a specific quiz
 * @route GET /api/quizzes/:id/results
 * @access Private (Teachers only)
 */
const getQuizResults = async (req, res) => {
  try {
    const quizId = req.params.id;
    const teacherId = req.user.id; // from verifyToken

    // --- Optional Validation (Good Practice) ---
    // Check if this teacher actually created this quiz
    const quizRef = db.collection("quizzes").doc(quizId);
    const quizDoc = await quizRef.get();

    if (!quizDoc.exists) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    if (quizDoc.data().creatorId !== teacherId) {
      return res.status(403).json({ 
        error: "Forbidden: You do not have permission to view results for this quiz." 
      });
    }
    // --- End Validation ---

    // 1. Query the 'submissions' collection
    const submissionsRef = db.collection("submissions");
    const snapshot = await submissionsRef.where("quizId", "==", quizId).get();

    if (snapshot.empty) {
      return res.status(200).json({
        message: "No submissions found for this quiz yet.",
        results: [],
      });
    }

    // 2. Map the results
    const results = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        submissionId: doc.id,
        studentId: data.studentId,
        score: data.score,
        totalQuestions: data.totalQuestions,
        submittedAt: data.submittedAt,
        // We don't need to send the full answer list here
      };
    });

    // 3. Send the results
    res.status(200).json({
      quizTitle: quizDoc.data().title,
      totalSubmissions: results.length,
      results: results,
    });

  } catch (err) {
    console.error("Error getting quiz results:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  submitQuiz,
  getQuizResults,
};
