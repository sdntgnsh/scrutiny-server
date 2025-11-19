// --- src/controllers/quizController.js ---

const { db } = require("../config/firebase");

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
      return res
        .status(400)
        .json({ error: "A quiz must have at least one question." });
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
    const quizzes = snapshot.docs.map((doc) => ({
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
    const userRole = req.userRole; // Got from verifyToken middleware

    const quizRef = db.collection("quizzes").doc(quizId);
    const doc = await quizRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const quizData = doc.data();

    // --- SECURITY CHECK ---
    // If the user is a student, we must HIDE the correct answers.
    if (userRole === "student") {
      const sanitizedQuestions = quizData.questions.map((q) => {
        // We destructure 'correctAnswer' out, and keep the 'rest'
        const { correctAnswer, ...rest } = q;
        return rest;
      });

      // Return the quiz with the sanitized questions
      return res.status(200).json({
        id: doc.id,
        ...quizData,
        questions: sanitizedQuestions,
      });
    }

    // If it's a Teacher, send the full data (so they can review/edit)
    res.status(200).json({
      id: doc.id,
      ...quizData,
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
    const correctAnswers = doc.data().questions.map((q) => q.correctAnswer);

    // 5. Compare and calculate the score
    let score = 0;
    const totalQuestions = correctAnswers.length;

    // Check if the student provided the right number of answers
    if (studentAnswers.length !== totalQuestions) {
      return res.status(400).json({
        error: `Submission failed: Expected ${totalQuestions} answers, but received ${studentAnswers.length}.`,
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

    // --- 1. Validation: Check Ownership ---
    const quizRef = db.collection("quizzes").doc(quizId);
    const quizDoc = await quizRef.get();

    if (!quizDoc.exists) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    if (quizDoc.data().creatorId !== teacherId) {
      return res.status(403).json({
        error:
          "Forbidden: You do not have permission to view results for this quiz.",
      });
    }

    // --- 2. Get Submissions ---
    const submissionsRef = db.collection("submissions");
    const snapshot = await submissionsRef.where("quizId", "==", quizId).get();

    if (snapshot.empty) {
      return res.status(200).json({
        message: "No submissions found for this quiz yet.",
        results: [],
      });
    }

    // --- 3. Map Results & Fetch Student Details (The Fix) ---
    // We use Promise.all because we are making a DB call inside the map
    const results = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const submissionData = doc.data();

        // Fetch the student's profile from the 'users' collection
        const userRef = db.collection("users").doc(submissionData.studentId);
        const userSnapshot = await userRef.get();

        let studentInfo = { mis: "Unknown", name: "Unknown" };

        if (userSnapshot.exists) {
          const userData = userSnapshot.data();
          studentInfo = {
            mis: userData.mis || "N/A", // Get the MIS
            name: userData.name || userData.fullName || "Student", // Get Name for convenience
          };
        }

        return {
          submissionId: doc.id,
          mis: studentInfo.mis, // <--- Sending MIS instead of studentId
          studentName: studentInfo.name, // <--- Added Name for better UI
          score: submissionData.score,
          totalQuestions: submissionData.totalQuestions,
          submittedAt: submissionData.submittedAt,
        };
      })
    );

    // --- 4. Send the results ---
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

/**
 * @description Get quiz history for the logged-in student
 * @route GET /api/quizzes/history
 * @access Private (Students only)
 */
const getStudentHistory = async (req, res) => {
  try {
    const studentId = req.user.id; // From verifyToken

    // 1. Query submissions for this specific student
    const submissionsRef = db.collection("submissions");
    const snapshot = await submissionsRef
      .where("studentId", "==", studentId)
      .orderBy("submittedAt", "desc") // Show newest first
      .get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    // 2. Map through submissions and fetch the related Quiz Title
    const history = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const subData = doc.data();

        // Fetch the quiz details to get the Title and Subject
        const quizRef = db.collection("quizzes").doc(subData.quizId);
        const quizDoc = await quizRef.get();

        // Handle case where quiz might have been deleted by teacher
        const quizTitle = quizDoc.exists
          ? quizDoc.data().title
          : "Deleted Quiz";
        const quizSubject = quizDoc.exists ? quizDoc.data().subject : "N/A";

        return {
          submissionId: doc.id,
          quizId: subData.quizId,
          title: quizTitle,
          subject: quizSubject,
          score: subData.score,
          totalQuestions: subData.totalQuestions,
          submittedAt: subData.submittedAt,
        };
      })
    );

    res.status(200).json(history);
  } catch (err) {
    console.error("Error getting student history:", err);
    // If 'orderBy' fails initially, it means you need a Firestore index.
    // Check your console for a link to create it automatically.
    res.status(500).json({ error: "Internal server error" });
  }
};

// Don't forget to add it to module.exports!
module.exports = {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  submitQuiz,
  getQuizResults,
  getStudentHistory, // <--- Added here
};

