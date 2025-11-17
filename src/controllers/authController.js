// --- src/controllers/authController.js ---
// This is the FULL file, including the complete 'register' logic.

const supabaseAdmin = require("../config/supabase");
const { db } = require("../config/firebase");

/**
 * @description Register a new user
 * @route POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    // 1. Get user data from request body
    const { email, password, role, name, mis, employee_id } = req.body;

    // 2. Validate input based on role
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

    // 3. (Student Only) Check if MIS is unique before creating user
    if (role === "student") {
      const usersRef = db.collection("users");
      const snapshot = await usersRef.where("mis", "==", mis).limit(1).get();
      if (!snapshot.empty) {
        return res
          .status(400)
          .json({ error: "This MIS number is already in use." });
      }
    }

    // 4. Create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm email
      });

    if (authError) {
      // This will catch errors like "User already registered"
      console.error("Supabase Auth Error:", authError);
      return res.status(400).json({ error: authError.message });
    }

    const user = authData.user;

    // 5. Create user profile in Firestore
    const userProfile = {
      email: user.email,
      name: name,
      role: role,
      createdAt: new Date().toISOString(),
    };

    // Add role-specific ID
    if (role === "student") {
      userProfile.mis = mis;
    } else if (role === "teacher") {
      userProfile.employee_id = employee_id;
    }

    // Use the Supabase User ID (UUID) as the Firestore Document ID
    await db.collection("users").doc(user.id).set(userProfile);

    // 6. Return success response
    // We don't send a token. User must log in separately.
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
        ...userProfile, // Spread the profile data
      },
    });
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).json({ error: "Server error", message: err.message });
  }
};

/**
 * @description Get the current logged-in user's profile
 * @route GET /api/auth/me
 * @info This function only runs AFTER 'verifyToken' middleware succeeds
 */
const getMe = (req, res) => {
  console.log(req.user, req.userRole);
  // The 'verifyToken' middleware has already run and
  // attached 'req.user' and 'req.userRole' to the request.

  // We just send that data back to the user.
  res.status(200).json({
    message: "Token is valid. User profile retrieved.",
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.userRole,
    },
  });
};

// --- UPDATE YOUR 'module.exports' AT THE BOTTOM ---
// It should now export BOTH functions
module.exports = {
  register,
  getMe,
};
