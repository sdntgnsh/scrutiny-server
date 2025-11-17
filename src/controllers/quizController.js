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

module.exports = {
  createQuiz,
};