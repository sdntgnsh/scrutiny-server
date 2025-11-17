// --- src/controllers/authController.js ---
// This controller handles creating a new user.

const supabaseAdmin = require("../config/supabase");
const db = require("../config/firebase");

/**
 * @description Register a new user
 * @route POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    // 1. Get user details from the request body
    const { email, password, name, role, mis, employee_id } = req.body;

    // 2. Validate input
    if (!email || !password || !name || !role) {
      return res
        .status(400)
        .json({ error: "Email, password, name, and role are required" });
    }

    if (role !== "teacher" && role !== "student") {
      return res
        .status(400)
        .json({ error: "Role must be 'teacher' or 'student'" });
    }

    // 3. Role-specific field validation
    if (role === "student" && !mis) {
      return res
        .status(400)
        .json({ error: "Student registration requires an MIS number" });
    }
    if (role === "teacher" && !employee_id) {
      return res
        .status(400)
        .json({ error: "Teacher registration requires an Employee ID" });
    }

    // 4. Check for MIS uniqueness (if student)
    if (role === "student") {
      const usersRef = db.collection("users");
      // Query Firestore to see if any document already has this MIS
      const snapshot = await usersRef.where("mis", "==", mis).limit(1).get();

      if (!snapshot.empty) {
        return res
          .status(400)
          .json({ error: "This MIS number is already in use." });
      }
    }

    // --- STEP 5: Create the user in Supabase Auth ---
    // This only happens if all previous checks pass.
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // You can set this to 'false' to skip email verification
      });

    if (authError) {
      // This will catch errors like "User already registered"
      console.error("Supabase Auth Error:", authError); // <-- ADDED THIS LINE
      return res.status(400).json({ error: authError.message });
    }

    const user = authData.user;
    if (!user) {
      return res
        .status(500)
        .json({ error: "Failed to create user in Supabase" });
    }

    // --- STEP 6: Create the user profile in Firestore ---
    // Now we build the profile object based on the role.

    const userProfile = {
      name: name,
      email: user.email,
      role: role, // This is the role ('teacher' or 'student')
      createdAt: new Date().toISOString(),
      auth_id: user.id,
    };

    // Add the correct role-specific ID
    if (role === "student") {
      userProfile.mis = mis;
    } else {
      // role === 'teacher'
      userProfile.employee_id = employee_id;
    }

    // We set the document in Firestore using the user's ID
    await db.collection("users").doc(user.id).set(userProfile);

    // --- STEP 7: Success ---
    // Send back the newly created user info (password is not included)
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
        role: userProfile.role,
        // Also send back their new ID
        [role === "student" ? "mis" : "employee_id"]:
          role === "student" ? mis : employee_id,
      },
    });
  } catch (err) {
    console.error("Error during registration:", err);
    // Handle potential Firestore errors
    if (err.code === "permission-denied") {
      return res.status(503).json({
        error: "Database permission error. Check backend service account.",
      });
    }
    res
      .status(500)
      .json({ error: "Internal server error", message: err.message });
  }
};

const getMe = (req, res) => {
  // 'verifyToken' already did all the hard work.
  // We just send back the data it found.
  res.status(200).json({
    message: "Token is valid. User profile retrieved.",
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.userRole,
    },
  });
};

module.exports = {
  register,
  getMe,
  // We will not have a 'login' function here. See explanation.
};
