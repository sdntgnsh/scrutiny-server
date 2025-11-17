// --- src/middleware/verifyToken.js ---
// This is the "bridge" between Supabase Auth and Firestore roles.
//
// UPDATED based on your clarification:
// We now assume that if a user is valid in Supabase,
// they MUST have a profile in Firestore because the
// /api/auth/register route creates both.

const supabaseAdmin = require("../config/supabase");
const { db } = require("../config/firebase");

const verifyToken = async (req, res, next) => {
  console.log(`[verifyToken] Received request for: ${req.originalUrl}`);
  try {
    // --- STEP 1: Get the Token ---
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      console.log("[verifyToken] FAILED: No token provided");
      return res
        .status(401)
        .json({ error: "Access Denied: No token provided" });
    }
    console.log("[verifyToken] Token found.");

    // --- STEP 2: Verify the Token with Supabase ---
    console.log("[verifyToken] Verifying token with Supabase...");
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      console.error("[verifyToken] FAILED: Supabase token is invalid.", error);
      return res.status(401).json({ error: "Access Denied: Invalid token" });
    }
    console.log(`[verifyToken] Supabase user verified: ${user.email}`);

    // --- STEP 3: Get User Role from Firestore ---
    console.log(
      `[verifyToken] Getting Firestore profile for user ID: ${user.id}`
    );
    const userRef = db.collection("users").doc(user.id);
    const doc = await userRef.get();

    // Since registration is handled by our backend, if the
    // doc doesn't exist, something is wrong. We should not proceed.
    if (!doc.exists) {
      console.error(
        `[verifyToken] FAILED: Firestore profile not found for user ID: ${user.id}`
      );
      return res.status(404).json({
        error: "User profile not found in database. Please contact support.",
      });
    }

    const userData = doc.data();
    console.log(
      `[verifyToken] Firestore profile found. Role: ${userData.role}`
    );

    // --- STEP 4: Attach User Info to the Request ---
    req.user = user; // The full Supabase user object
    req.userRole = userData.role; // The 'student' or 'teacher' role from Firestore
    req.firestoreId = user.id; // The document ID (which is the same as Supabase user.id)

    // All checks passed! Call 'next()' to proceed.
    console.log("[verifyToken] Success. Passing to next controller.");
    next();
  } catch (err) {
    // This catches any errors
    console.error("[verifyToken] CRITICAL ERROR:", err);
    res.status(401).json({ error: "Unauthorized", message: err.message });
  }
};

module.exports = verifyToken;
